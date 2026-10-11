#!/usr/bin/env node
// Diagnostics for the American Consumer page (site/consumidor). A Claude session cannot reach BLS, BEA, Census, the
// Federal Reserve, the New York Fed, FRED or the SEC (egress policy), and cannot download a run's log either, so a
// question about a live endpoint is answered from GitHub's runner and the answers are written to files.
//
//   node scripts/consumidor/probe.mjs [requests.json] [output dir]
//
// requests.json (default tools/consumidor/probe.json) is a list of
//   { "name": "bls-demographics",            file name of the answer (letters, digits, dash)
//     "url": "https://…{{BLS_API_KEY}}…",    {{NAME}} is replaced by the environment variable NAME
//     "method": "POST", "body": {...},       optional (a JSON body gets the same replacement)
//     "ua": "browser" | "bot" | "sec",       user agent (default browser)
//     "keep": 4000,                          characters of the answer to keep (default 4000; 0 = all)
//     "grep": "regex",                       keep only the lines that match (case-insensitive)
//     "html": "strip" | "raw",               HTML answers: strip the tags (default) or keep them
//     "zip": "list" | "regex",               a ZIP answer: list its entries, or also save the entries matching the regex
//     "xlsx": true | "sheet regex",          an Excel answer: sheet names and the first `rows` rows of each (matching) sheet
//     "rows": 12 }
// Every answer is written to <output dir>/<name>.txt with the request line (secrets removed) and the HTTP status, and
// index.json lists them. The value of every environment variable named in a request is removed from everything written.
// The script exits 0 whatever the answers were.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openXlsx } from './lib/xlsx-read.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const reqFile = resolve(process.argv[2] || join(ROOT, 'tools/consumidor/probe.json'));
const outDir = resolve(process.argv[3] || join(ROOT, 'tools/consumidor/raw/probe'));
const UAS = {
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  bot: 'fnam-debt-monitor-bot/1.0',
  sec: process.env.EDGAR_USER_AGENT || 'fnam.mx american-consumer (contact via repository)',
};
const TIMEOUT_MS = 60_000;

if (!existsSync(reqFile)) { console.log(`no request file at ${reqFile}; nothing to probe`); process.exit(0); }
const requests = JSON.parse(readFileSync(reqFile, 'utf8'));
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const secrets = new Set();
function fill(s) {
  return String(s).replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, n) => {
    const v = process.env[n] || '';
    if (v) secrets.add(v);
    return v;
  });
}
function redact(s) {
  let out = String(s);
  for (const v of secrets) if (v.length >= 6) out = out.split(v).join('***');
  return out;
}
function stripHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|td|th|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
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

const index = [];
for (const r of requests) {
  const name = String(r.name || 'request').replace(/[^A-Za-z0-9._-]/g, '_');
  const url = fill(r.url);
  const init = { method: r.method || 'GET', headers: { 'User-Agent': UAS[r.ua || 'browser'] || UAS.browser, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9', ...(r.headers || {}) }, redirect: 'follow' };
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
    const buf = Buffer.from(await res.arrayBuffer());
    entry.bytes = buf.length;
    const isZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
    if (isZip && (r.zip || r.xlsx)) {
      const dir = mkdtempSync(join(tmpdir(), 'probe-'));
      const file = join(dir, r.xlsx ? 'book.xlsx' : 'file.zip');
      writeFileSync(file, buf);
      if (r.xlsx) {
        const wb = openXlsx(file);
        const re = typeof r.xlsx === 'string' ? new RegExp(r.xlsx, 'i') : null;
        const n = r.rows || 12;
        text = `sheets: ${wb.sheets.join(' | ')}\n`;
        for (const s of wb.sheets) {
          if (re && !re.test(s)) continue;
          const rows = wb.rows(s);
          text += `\n## ${s} (${rows.length} rows)\n` + rows.slice(0, n).map((row) => JSON.stringify(row)).join('\n') + '\n';
          if (r.tail) text += '…\n' + rows.slice(-r.tail).map((row) => JSON.stringify(row)).join('\n') + '\n';
        }
      } else {
        text = execFileSync('unzip', ['-l', file], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
        if (r.zip !== 'list') {
          const ex = join(dir, 'x');
          execFileSync('unzip', ['-o', '-q', file, '-d', ex], { maxBuffer: 64 * 1024 * 1024 });
          const re = new RegExp(r.zip, 'i');
          const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
          for (const p of walk(ex)) {
            const rel = p.slice(ex.length + 1);
            if (!re.test(rel)) continue;
            const body = readFileSync(p, 'utf8');
            const head = r.keep === 0 ? body : body.split(/\r?\n/).slice(0, r.rows || 8).join('\n');
            writeFileSync(join(outDir, `${name}__${rel.replace(/[^A-Za-z0-9._-]/g, '_')}`), redact(head));
          }
        }
      }
    } else {
      let body = buf.toString('utf8');
      if (r.html !== 'raw' && (/text\/html/i.test(type) || /^\s*<!doctype html|^\s*<html/i.test(body))) body = stripHtml(body);
      text = clip(body, r);
    }
  } catch (e) {
    entry.error = e && e.name === 'AbortError' ? `timed out after ${TIMEOUT_MS / 1000}s` : String((e && e.message) || e);
  } finally { clearTimeout(timer); }
  const head = `${entry.method} ${entry.url}\n-> ${entry.error ? 'ERROR ' + entry.error : `HTTP ${entry.status} ${entry.type} ${entry.bytes} bytes`}${entry.lastModified ? ` · Last-Modified ${entry.lastModified}` : ''}\n\n`;
  writeFileSync(join(outDir, `${name}.txt`), redact(head + text) + '\n');
  index.push(entry);
  console.log(`${name}: ${entry.error ? 'ERROR ' + entry.error : 'HTTP ' + entry.status + ' ' + entry.bytes + ' bytes'}`);
}
writeFileSync(join(outDir, 'index.json'), redact(JSON.stringify({ ranAt: new Date().toISOString(), requests: index }, null, 1)) + '\n');
