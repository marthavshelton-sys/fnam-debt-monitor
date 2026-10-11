#!/usr/bin/env node
// Diagnostics for the Mexican Consumer page (site/mx/consumidor). A Claude session cannot reach INEGI, Banxico, the CNBV,
// the BMV or the SEC (egress policy) and cannot download a run's log, so a question about a live endpoint is answered
// from GitHub's runner and the answers are written to files on a feature branch (never on main).
//
//   node scripts/mx-consumidor/probe.mjs [requests.json] [output dir] [scratch dir]
//
// requests.json (default tools/mx-consumidor/probe.json) is a list of
//   { "name": "enigh-zip",                   file name of the answer (letters, digits, dash)
//     "url": "https://…{{INEGI_TOKEN}}…",    {{NAME}} is replaced by the environment variable NAME
//     "method": "POST", "body": {...},       optional (a JSON body gets the same replacement)
//     "ua": "browser" | "bot" | "sec",       user agent (default browser)
//     "enc": "latin1",                       decode the answer as ISO-8859-1 (Banxico's SIE pages)
//     "keep": 4000,                          characters of the answer to keep (default 4000; 0 = all)
//     "grep": "regex",                       keep only the lines that match (case-insensitive)
//     "links": "regex",                      an HTML answer: list the href/src values that match
//     "html": "strip" | "raw",               HTML answers: strip the tags (default) or keep them
//     "zip": "list" | "regex",               a ZIP answer: list its entries, or also save the head of the entries matching
//     "xlsx": true | "sheet regex",          an Excel answer: sheet names and the first `rows` rows of each (matching) sheet
//     "xls": true | "sheet regex",           the same for a legacy .xls workbook
//     "pdf": true,                           a PDF answer: its text (needs python3 with pdfplumber on the runner)
//     "rows": 12, "tail": 3,
//     "save": "file.zip" }                   also keep the answer's bytes in the scratch dir (pushed to a scratch branch)
// Special kinds (no url):
//   { "kind": "bie", "q": "consumo privado" }                 INEGI BIE full-text search: ids and topic paths
//   { "kind": "biemeta", "ids": ["737219"] }                  INEGI BIE indicator metadata
//   { "kind": "bieseries", "ids": ["737219"], "from": 2015 }  INEGI BIE series: first and last points
//   { "kind": "siedir", "sector": 19 }                        Banxico SIE: the tables of a sector directory
//   { "kind": "cuadro", "id": "CF303", "sector": 19 }         Banxico SIE: the series of a table page
//   { "kind": "siemeta", "ids": ["SF43718"] }                 Banxico SIE API: titles, units and date ranges (BANXICO_TOKEN)
//   { "kind": "sieseries", "ids": ["SF43718"], "since": "2024-01-01" }   Banxico SIE API: first and last points
// Every answer is written to <output dir>/<name>.txt with the request line (secrets removed) and the HTTP status, and
// index.json lists them. The script exits 0 whatever the answers were.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openXlsx } from './lib/xlsx-read.mjs';
import { openXls } from './lib/xls-read.mjs';
import { bieSearch, bieMeta, bieSeries, sieDirectory, sieCuadro, sieMeta, sieSeries, secret, redact as redactLib } from './lib/common.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const reqFile = resolve(process.argv[2] || join(ROOT, 'tools/mx-consumidor/probe.json'));
const outDir = resolve(process.argv[3] || join(ROOT, 'tools/mx-consumidor/raw/probe'));
const scratch = resolve(process.argv[4] || join(tmpdir(), 'mx-consumidor-scratch'));
const UAS = {
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  bot: 'fnam-debt-monitor-bot/1.0',
  sec: process.env.EDGAR_USER_AGENT || 'fnam.mx mexican-consumer (contact via repository)',
};
const TIMEOUT_MS = 180_000;

if (!existsSync(reqFile)) { console.log(`no request file at ${reqFile}; nothing to probe`); process.exit(0); }
const requests = JSON.parse(readFileSync(reqFile, 'utf8'));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(scratch, { recursive: true });
['BANXICO_TOKEN', 'INEGI_TOKEN', 'FRED_API_KEY'].forEach(secret);

const secrets = new Set();
function fill(s) {
  return String(s).replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, n) => {
    const v = process.env[n] || '';
    if (v) secrets.add(v);
    return v;
  });
}
function redact(s) {
  let out = redactLib(String(s));
  for (const v of secrets) if (v.length >= 6) out = out.split(v).join('***');
  return out;
}
function stripHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&([aeiounAEIOUN])(acute|tilde);/g, (_, c, k) => (k === 'tilde' ? { n: 'ñ', N: 'Ñ' }[c] || c : { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' }[c] || c))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
}
function clip(text, r) {
  let t = text;
  if (r.grep) {
    const re = new RegExp(r.grep, 'i');
    const lines = t.split(/\r?\n/).filter((l) => re.test(l));
    t = `(${lines.length} matching lines)\n` + lines.join('\n');
  }
  const keep = r.keep == null ? 4000 : r.keep;
  if (keep > 0 && t.length > keep) t = t.slice(0, keep) + `\n… (${t.length - keep} more characters)`;
  return t;
}
const showRows = (rows, r) => { const n = r.rows || 12; let t = rows.slice(0, n).map((row) => JSON.stringify(row)).join('\n') + '\n'; if (r.tail) t += '…\n' + rows.slice(-r.tail).map((row) => JSON.stringify(row)).join('\n') + '\n'; return t; };

async function special(r) {
  if (r.kind === 'bie') { const rows = await bieSearch(r.q, { to: r.n || 40 }); return rows.map((x) => `${x.id}\t${x.title}`).join('\n'); }
  if (r.kind === 'biemeta') { const out = []; for (const id of r.ids) { try { out.push(JSON.stringify(await bieMeta(id))); } catch (e) { out.push(`${id}: ${e.message}`); } } return out.join('\n'); }
  if (r.kind === 'bieseries') { const s = await bieSeries(r.ids, r.from || 2000); return Object.keys(s).map((id) => `${id}\t${s[id].freq}\t${s[id].unit}\t${s[id].points.length} points\t${JSON.stringify(s[id].points.slice(0, 2))} … ${JSON.stringify(s[id].points.slice(-(r.last || 3)))}`).join('\n'); }
  if (r.kind === 'siedir') { const rows = await sieDirectory(r.sector); return rows.map((x) => `${x.id}\t${x.title}`).join('\n'); }
  if (r.kind === 'cuadro') { const c = await sieCuadro(r.id, r.sector); return `# ${c.title}\n` + c.rows.map((x) => (x.heading ? `${' '.repeat(60)}${'  '.repeat(Math.max(0, x.level - 1))}# ${x.heading}` : `${x.id.padEnd(9)} ${String(x.freq).slice(0, 10).padEnd(10)} ${String(x.unit).slice(0, 22).padEnd(22)} ${String(x.from).padEnd(11)} ${String(x.to).padEnd(11)} ${'  '.repeat(Math.max(0, x.level - 1))}${x.label}`)).join('\n'); }
  if (r.kind === 'siemeta') { const rows = await sieMeta(r.ids); return rows.map((x) => JSON.stringify(x)).join('\n'); }
  if (r.kind === 'sieseries') { const s = await sieSeries(r.ids, r.since || '2015-01-01'); return Object.keys(s).map((id) => `${id}\t${s[id].title}\t${s[id].points.length} points\t${JSON.stringify(s[id].points.slice(0, 2))} … ${JSON.stringify(s[id].points.slice(-(r.last || 3)))}`).join('\n'); }
  throw new Error(`unknown kind ${r.kind}`);
}

const index = [];
for (const r of requests) {
  const name = String(r.name || r.kind || 'request').replace(/[^A-Za-z0-9._-]/g, '_');
  if (r.kind) {
    const entry = { name, kind: r.kind };
    let text = '';
    try { text = await special(r); entry.ok = true; } catch (e) { entry.error = String((e && e.message) || e); }
    writeFileSync(join(outDir, `${name}.txt`), redact(`${r.kind} ${JSON.stringify({ ...r, name: undefined, kind: undefined })}\n-> ${entry.error ? 'ERROR ' + entry.error : 'ok'}\n\n` + clip(text, { keep: 0, ...r })) + '\n');
    index.push(entry);
    console.log(`${name}: ${entry.error ? 'ERROR ' + redact(entry.error) : 'ok'}`);
    continue;
  }
  const url = fill(r.url);
  const init = { method: r.method || 'GET', headers: { 'User-Agent': UAS[r.ua || 'browser'] || UAS.browser, Accept: '*/*', 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.7', ...(r.headers || {}) }, redirect: 'follow' };
  if (r.body != null) {
    init.body = fill(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
    if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  init.signal = ctrl.signal;
  const entry = { name, url: redact(url), method: init.method };
  let text = '';
  try {
    const res = await fetch(url, init);
    const type = res.headers.get('content-type') || '';
    entry.status = res.status; entry.type = type; entry.finalUrl = redact(res.url || '');
    entry.lastModified = res.headers.get('last-modified') || null;
    if (r.head) { entry.bytes = Number(res.headers.get('content-length') || 0); try { ctrl.abort(); } catch { /* done */ } }
    else {
      const buf = Buffer.from(await res.arrayBuffer());
      entry.bytes = buf.length;
      if (r.save && res.ok) { writeFileSync(join(scratch, String(r.save).replace(/[^A-Za-z0-9._-]/g, '_')), buf); entry.saved = r.save; }
      const isZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
      const isPdf = buf.length > 4 && buf.subarray(0, 4).toString('latin1') === '%PDF';
      const isOle = buf.length > 8 && buf[0] === 0xd0 && buf[1] === 0xcf;
      if (isZip && (r.zip || r.xlsx)) {
        const dir = mkdtempSync(join(tmpdir(), 'probe-'));
        const file = join(dir, r.xlsx ? 'book.xlsx' : 'file.zip');
        writeFileSync(file, buf);
        if (r.xlsx) {
          const wb = openXlsx(file);
          const re = typeof r.xlsx === 'string' ? new RegExp(r.xlsx, 'i') : null;
          text = `sheets: ${wb.sheets.join(' | ')}\n`;
          for (const s of wb.sheets) {
            if (re && !re.test(s)) continue;
            const rows = wb.rows(s);
            text += `\n## ${s} (${rows.length} rows)\n` + showRows(rows, r);
          }
        } else {
          text = execFileSync('unzip', ['-l', file], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
          if (r.zip !== 'list') {
            const ex = join(dir, 'x');
            execFileSync('unzip', ['-o', '-q', file, '-d', ex], { maxBuffer: 64 * 1024 * 1024 });
            const re = new RegExp(r.zip, 'i');
            const walk = (d) => readdirSync(d).flatMap((f) => { const q = join(d, f); return statSync(q).isDirectory() ? walk(q) : [q]; });
            for (const q of walk(ex)) {
              const rel = q.slice(ex.length + 1);
              if (!re.test(rel)) continue;
              const body = readFileSync(q, r.enc === 'latin1' ? 'latin1' : 'utf8');
              const head = r.keep === 0 ? body : body.split(/\r?\n/).slice(0, r.rows || 8).join('\n');
              writeFileSync(join(outDir, `${name}__${rel.replace(/[^A-Za-z0-9._-]/g, '_')}`), redact(head));
            }
          }
        }
      } else if (isOle && r.xls) {
        const wb = openXls(buf);
        const re = typeof r.xls === 'string' ? new RegExp(r.xls, 'i') : null;
        text = `sheets: ${wb.sheets.join(' | ')}\n`;
        for (const s of wb.sheets) { if (re && !re.test(s)) continue; const rows = wb.rows(s); text += `\n## ${s} (${rows.length} rows)\n` + showRows(rows, r); }
      } else if (isPdf && r.pdf) {
        const dir = mkdtempSync(join(tmpdir(), 'probe-'));
        writeFileSync(join(dir, 'in.pdf'), buf);
        try {
          text = execFileSync('python3', ['-c', 'import sys,pdfplumber\nwith pdfplumber.open(sys.argv[1]) as pdf:\n    n=len(pdf.pages)\n    print("pages:",n)\n    a=int(sys.argv[2]); b=int(sys.argv[3])\n    for i,pg in enumerate(pdf.pages[a:b]):\n        print("\\n==== page",a+i+1,"====")\n        print(pg.extract_text() or "")', join(dir, 'in.pdf'), String(r.from || 0), String(r.to || 6)], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
        } catch (e) { text = `pdf to text failed: ${String(e.message).slice(0, 300)}`; }
        text = clip(text, r);
      } else {
        let body = r.enc === 'latin1' ? new TextDecoder('latin1').decode(buf) : buf.toString('utf8');
        if (r.links) {
          const re = new RegExp(r.links, 'i'), seen = new Set();
          for (const m of body.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) if (re.test(m[1])) seen.add(m[1]);
          text = `(${seen.size} links)\n` + [...seen].join('\n');
          text = clip(text, { ...r, grep: null });
        } else {
          if (r.html !== 'raw' && (/text\/html/i.test(type) || /^\s*<!doctype html|^\s*<html/i.test(body))) body = stripHtml(body);
          text = clip(body, r);
        }
      }
    }
  } catch (e) {
    entry.error = e && e.name === 'AbortError' ? (r.head ? null : `timed out after ${TIMEOUT_MS / 1000}s`) : String((e && e.message) || e);
    if (entry.error == null) delete entry.error;
  } finally { clearTimeout(timer); }
  const head = `${entry.method} ${entry.url}\n-> ${entry.error ? 'ERROR ' + entry.error : `HTTP ${entry.status} ${entry.type} ${entry.bytes} bytes`}${entry.lastModified ? ` · Last-Modified ${entry.lastModified}` : ''}${entry.finalUrl && entry.finalUrl !== entry.url ? ` · final ${entry.finalUrl}` : ''}\n\n`;
  writeFileSync(join(outDir, `${name}.txt`), redact(head + text) + '\n');
  index.push(entry);
  console.log(`${name}: ${entry.error ? 'ERROR ' + entry.error : 'HTTP ' + entry.status + ' ' + entry.bytes + ' bytes'}`);
}
writeFileSync(join(outDir, 'index.json'), redact(JSON.stringify({ ranAt: new Date().toISOString(), requests: index }, null, 1)) + '\n');
