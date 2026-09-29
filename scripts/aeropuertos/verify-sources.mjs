// Diagnostics for the three airport pages (/aeropuertos/, /aeropuertos/trafico/, /aeropuertos/aerolineas/): opens every
// external source link the way a reader's browser does and prints what it returns. gob.mx sits behind a proof-of-work bot
// challenge, and GlobeNewswire, the airlines' IR sites and others refuse plain scripts, so scripts/check-links.mjs can only
// list them as "unverifiable". This script opens them in Chromium (headless first; a headed Chrome under xvfb when HEADED=1
// and the first attempt was refused) and reports, per link: HTTP status, final URL, page title or PDF check (%PDF header,
// page count, first line). For the tariffs table (data/regulation.js) it also checks that every figure a cell quotes appears
// in at least one of the documents the cell cites; figures a cell marks as computed (`calc`) are listed, not searched.
// Nothing is written to the repository. On the runner: workflow_dispatch input `verify_links` of aeropuertos-refresh.yml.
//
//   node scripts/aeropuertos/verify-sources.mjs [--dump] [--grep=[url-part::]regex ...] [extra-url ...]
//     --dump      also print the lines of each document that mention maximum tariffs / workload units (reading aid)
//     --grep      print the lines matching regex (case-insensitive) of every document, or only of those whose URL contains
//                 url-part; avoid spaces and [ ] in the workflow input (it is word-split by the shell)
//     extra-url   any other document to open; its full text is printed (e.g. a filing considered for the table)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import os from 'node:os';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = path.join(ROOT, 'site', 'aeropuertos');
const argv = process.argv.slice(2), DUMP = argv.includes('--dump'), EXTRA = argv.filter((a) => /^https?:\/\//i.test(a));
const GREPS = argv.filter((a) => a.startsWith('--grep=')).map((a) => { const v = a.slice(7), i = v.indexOf('::'); return i < 0 ? { url: '', re: new RegExp(v, 'i') } : { url: v.slice(0, i), re: new RegExp(v.slice(i + 2), 'i') }; });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const load = (file, name) => { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(SITE, 'data', file), 'utf8'), { window: w }); return w[name]; };

// ---------------------------------------------------------------- the links and where they appear
const links = new Map();
const add = (url, where, label) => { if (!url) return; const k = String(url).trim(); const e = links.get(k) || { where: new Set(), label: '' }; e.where.add(where); if (label && !e.label) e.label = label; links.set(k, e); };
const REG = load('regulation.js', 'MX_AIRPORTS_REG');
for (const [id, s] of Object.entries(REG.sources || {})) add(s.url, `hub, tariffs table [${id}]`, s.label && s.label.en);
const TR = load('traffic.js', 'MX_AIRPORTS');
for (const [k, s] of Object.entries(TR.sources || {})) add(s.url, `trafico, sources (${k})`, s.title);
const AL = load('airlines.js', 'MX_AIRLINES');
for (const k of ['aeromexico', 'volaris', 'viva']) if (AL.sources && AL.sources[k]) add(AL.sources[k].url, `aerolineas, sources (${k})`, AL.sources[k].title);
for (const c of AL.carriers || []) if (c.ceased && c.ceased.url) add(c.ceased.url, `aerolineas, ${c.name} status note`, typeof c.ceased.source === 'object' ? c.ceased.source.en : c.ceased.source);
const SKIP = /(^|\.)(fnam\.mx|googleapis\.com|gstatic\.com|cdnjs\.cloudflare\.com|jsdelivr\.net|unpkg\.com|w3\.org)$/i;
for (const page of ['index.html', 'trafico/index.html', 'aerolineas/index.html']) {
  const html = fs.readFileSync(path.join(SITE, page), 'utf8');
  for (const m of html.matchAll(/["'](https?:\/\/[^"'<>\s]+)["']/g)) { let host; try { host = new URL(m[1]).hostname; } catch { continue; } if (!SKIP.test(host)) add(m[1], page); }
}
for (const u of EXTRA) add(u, 'extra (command line)');

// ---------------------------------------------------------------- figures quoted in the tariffs table
const NUM = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+/g;
const cells = [];
for (const r of REG.rows || []) for (const [co, c] of Object.entries(r.cells || {})) {
  const text = [...(c.es || []), ...(c.en || [])].join(' '), calc = (c.calc || []).map(String);
  const nums = [...new Set((text.match(NUM) || []).filter((n) => n.replace(/\D/g, '').length >= 3 && !calc.includes(n)))];
  cells.push({ row: r.id, co, nums, calc, src: c.src || [] });
}

// ---------------------------------------------------------------- browser
const { chromium } = await import('playwright');
const launchers = [{ label: 'chromium headless', opts: { headless: true, args: ['--disable-blink-features=AutomationControlled'] } }];
if (process.env.HEADED) launchers.push({ label: 'chrome headed', opts: { channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] } });
const ctxs = [];
async function ctxFor(i) {
  if (ctxs[i] !== undefined) return ctxs[i];
  try { const b = await chromium.launch(launchers[i].opts); ctxs[i] = await b.newContext({ userAgent: i === 0 ? UA : undefined, locale: 'es-MX', viewport: { width: 1366, height: 900 }, acceptDownloads: true }); ctxs[i].__browser = b; }
  catch (e) { console.log(`(could not launch ${launchers[i].label}: ${e.message.split('\n')[0]})`); ctxs[i] = null; }
  return ctxs[i];
}
const PY = "import sys,json,pypdf\nr=pypdf.PdfReader(sys.argv[1])\nprint(json.dumps([(p.extract_text() or '') for p in r.pages]))";
function pdfText(buf) {
  const f = path.join(os.tmpdir(), `verify-${process.pid}-${Math.random().toString(36).slice(2)}.pdf`); fs.writeFileSync(f, buf);
  try { return JSON.parse(execFileSync(process.env.PYTHON || 'python3', ['-c', PY, f], { maxBuffer: 256e6 }).toString()); } finally { fs.rmSync(f, { force: true }); }
}
// every wait is bounded: a slow server gets reported as a failure instead of stalling the run
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
// A server that sends an incomplete certificate chain (cuentapublica.hacienda.gob.mx) fails Node's TLS check but opens in a
// browser, which fetches the missing intermediate itself. TLS verification stays on: the file is fetched by the browser's own
// network stack as a download, the way a reader's browser gets it.
async function viaDownload(ctx, url) {
  const page = await ctx.newPage();
  try {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.goto(url, { timeout: 90000 }).catch(() => null)]);
    const f = await withTimeout(dl.path(), 120000, 'download did not finish in 120 s'); return { status: 200, url: dl.url(), type: 'download', buf: fs.readFileSync(f) };
  } finally { await page.close().catch(() => null); }
}
async function openPdf(ctx, url) {
  let r, buf;
  try { r = await ctx.request.get(url, { timeout: 120000 }); buf = Buffer.from(await r.body()); }
  catch (e) {
    if (!/certificate|SSL|TLS/i.test(e.message)) throw e;
    const d = await viaDownload(ctx, url); buf = d.buf;
    r = { status: () => d.status, url: () => d.url, headers: () => ({ 'content-type': 'application/pdf (browser download; Node rejected the server certificate chain)' }), body: async () => buf };
  }
  // Some hosts (ir.oma.aero: SiteGround) answer repeat visitors with a JavaScript challenge page instead of the file. Let the
  // challenge run in a real page (it sets a cookie in this context), then ask for the file again.
  if (buf.subarray(0, 4).toString() !== '%PDF' && /sgcaptcha|http-equiv="refresh"|challenge/i.test(buf.subarray(0, 2000).toString())) {
    const page = await ctx.newPage();
    try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => null); await page.waitForTimeout(8000); } finally { await page.close().catch(() => null); }
    r = await ctx.request.get(url, { timeout: 120000 }); buf = Buffer.from(await r.body());
  }
  const out = { kind: 'pdf', status: r.status(), finalUrl: r.url(), type: r.headers()['content-type'] || '', bytes: buf.length, isPdf: buf.subarray(0, 4).toString() === '%PDF' };
  if (out.isPdf) { try { out.pages = pdfText(buf); } catch (e) { out.pdfError = e.message.split('\n')[0]; out.pages = []; } out.text = out.pages.join('\n'); out.title = (out.pages[0] || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2).join(' | '); }
  else out.title = buf.subarray(0, 200).toString().replace(/\s+/g, ' ');
  return out;
}
async function openHtml(ctx, url) {
  const page = await ctx.newPage(); let last = null;
  page.on('response', (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) last = r; } catch { /* detached */ } });
  try {
    const first = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.title && !/Challenge Validation|Just a moment|Attention Required|Un momento/i.test(document.title), null, { timeout: 150000 }).catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => null);
    const info = await page.evaluate(() => { const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.href); return { title: document.title, h1: ((document.querySelector('h1') || {}).innerText || '').trim().slice(0, 200), text: document.body ? document.body.innerText : '', xlsx: hrefs.filter((h) => /\.xlsx?(\?|$)/i.test(h)).length, pdfs: hrefs.filter((h) => /\.pdf(\?|$)/i.test(h)).length }; });
    const r = last || first;
    return { kind: 'html', status: r ? r.status() : null, finalUrl: page.url(), ...info };
  } finally { await page.close().catch(() => null); }
}
const BLOCKED = /challenge|access denied|forbidden|attention required|not found|p[aá]gina no encontrada|error 40\d|captcha|robot/i;
const good = (x) => x && !x.error && x.status && x.status < 400 && (x.kind === 'pdf' ? x.isPdf : !BLOCKED.test(`${x.title} ${x.h1}`));
async function visit(url) {
  let best = null;
  for (let i = 0; i < launchers.length; i++) {
    const ctx = await ctxFor(i); if (!ctx) continue;
    let res; try { res = await withTimeout(/\.pdf(\?|#|$)/i.test(url) ? openPdf(ctx, url) : openHtml(ctx, url), 240000, 'no answer within 240 s'); } catch (e) { res = { error: e.message.split('\n')[0] }; }
    res.browser = launchers[i].label; best = best && good(best) ? best : res;
    if (good(res)) { best = res; break; }
  }
  return best;
}

// ---------------------------------------------------------------- run
const results = new Map();
// PDF text often splits a number around its comma ("16 ,005"); rejoin before searching
const clean = (text) => String(text || '').replace(/(\d) +,(\d)/g, '$1,$2').replace(/(\d), +(\d{3})\b/g, '$1,$2');
const has = (text, n) => { const t = clean(text); return t.includes(n) || t.replace(/(\d),(\d{3})/g, '$1$2').includes(n.replace(/,/g, '')) || fromThousands(t, n); };
// GAP's and OMA's investment tables are in thousands of pesos; the table quotes millions (43,184,959 -> 43,185)
const fromThousands = (t, n) => { if (/\./.test(n)) return false; const v = +n.replace(/,/g, ''); for (const m of t.matchAll(/\d{1,3}(?:,\d{3}){2,}/g)) if (Math.round(+m[0].replace(/,/g, '') / 1000) === v) return true; return false; };
// a figure not found as written: numbers in the document within 0.1% of it (as written, or in thousands), with context
const near = (text, n) => {
  const t = clean(text), v = +n.replace(/,/g, ''), out = [];
  for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) {
    const d = +m[0].replace(/,/g, ''); if (!d) continue;
    if (Math.abs(d - v) / v <= 0.001 || Math.abs(d / 1000 - v) / v <= 0.001) out.push(`${m[0]} … "${t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20).replace(/\s+/g, ' ')}"`);
    if (out.length >= 2) break;
  }
  return out;
};
const KEY = /(maximum|m[aá]xim[ao]s?)\s+(rate|tariff|tarifa)|workload|unidad(es)? de (carga|tr[aá]fico)|efficiency|eficiencia|master development|programa maestro/i;
console.log(`Verifying ${links.size} external source links of the airport pages (${launchers.map((l) => l.label).join(', then ')})\n`);
for (const [url, meta] of links) {
  const r = await visit(url); results.set(url, r);
  const ok = good(r);
  console.log(`[${ok ? ' OK ' : 'FAIL'}] ${r && r.status ? r.status : '---'}  ${meta.label || url}`);
  console.log(`       ${url}`);
  if (r && r.finalUrl && r.finalUrl !== url) console.log(`       final: ${r.finalUrl}`);
  if (r && r.error) console.log(`       error: ${r.error}`);
  if (r && r.kind === 'pdf') console.log(`       pdf: ${r.isPdf ? 'yes' : 'NO'} · ${r.bytes} bytes · ${(r.pages || []).length} pages · ${r.type}${r.pdfError ? ' · text: ' + r.pdfError : ''}`);
  if (r && r.title) console.log(`       title: ${String(r.title).slice(0, 180)}`);
  if (r && r.h1 && r.h1 !== r.title) console.log(`       h1: ${r.h1.slice(0, 180)}`);
  if (r && r.kind === 'html' && (r.xlsx || r.pdfs)) console.log(`       links on the page: ${r.xlsx} workbooks, ${r.pdfs} PDFs`);
  console.log(`       used by: ${[...meta.where].join('; ')} · via ${r ? r.browser : '-'}`);
  const full = meta.where.has('extra (command line)');
  if (r && r.text && (DUMP || full)) {
    const lines = []; const pages = r.pages || [r.text];
    pages.forEach((p, i) => p.split('\n').forEach((l) => { const s = l.replace(/\s+/g, ' ').trim(); if (s && (full || KEY.test(s) || /\b\d{3}\.\d{2}\b/.test(s) && KEY.test(p))) lines.push(`p.${i + 1}: ${s}`); }));
    const cap = full ? 600 : 80;
    console.log(`       ---- ${full ? 'full text' : 'tariff lines'} (${Math.min(lines.length, cap)} of ${lines.length}) ----`);
    lines.slice(0, cap).forEach((l) => console.log(`       ${l}`));
  }
  for (const g of GREPS) {
    if (!r || !r.text || (g.url && !url.includes(g.url))) continue;
    const hits = []; (r.pages || [r.text]).forEach((p, i) => clean(p).split('\n').forEach((l) => { const s = l.replace(/\s+/g, ' ').trim(); if (s && g.re.test(s)) hits.push(`p.${i + 1}: ${s.slice(0, 300)}`); }));
    console.log(`       ---- lines matching /${g.re.source}/i (${Math.min(hits.length, 60)} of ${hits.length}) ----`);
    hits.slice(0, 60).forEach((l) => console.log(`       ${l}`));
  }
  console.log('');
}

console.log('Tariffs table: figures each cell quotes, searched in the documents the cell cites');
let missingAll = 0;
for (const c of cells) {
  const docs = c.src.map((id) => results.get((REG.sources[id] || {}).url)).filter(Boolean);
  const texts = docs.map((d) => d.text || '');
  const missing = c.nums.filter((n) => !texts.some((t) => has(t, n)));
  missingAll += missing.length;
  console.log(`  ${missing.length ? 'MISSING' : 'ok     '} ${c.row}/${c.co} [${c.src.join(', ')}]: ${c.nums.length - missing.length}/${c.nums.length} found${missing.length ? ' · not found: ' + missing.join(', ') : ''}${c.calc.length ? ' · computed, not searched: ' + c.calc.join(', ') : ''}`);
  for (const n of missing) { const cand = texts.flatMap((t) => near(t, n)); console.log(`            ${n}: ${cand.length ? 'closest in the filing: ' + cand.join(' | ') : 'nothing within 0.1% in the cited filing(s)'}`); }
}
const failed = [...results.entries()].filter(([, r]) => !good(r));
console.log(`\n${links.size - failed.length}/${links.size} links answered with the expected document; ${failed.length} did not${failed.length ? ': ' + failed.map(([u]) => u).join(' ; ') : ''}. Tariff-table figures not found: ${missingAll}.`);
for (const c of ctxs) if (c) await c.__browser.close().catch(() => null);
