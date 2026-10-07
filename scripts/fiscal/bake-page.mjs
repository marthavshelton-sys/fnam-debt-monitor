#!/usr/bin/env node
// Writes the figures of the latest data refresh into the static markup of site/fiscal/index.html, so the page
// source (what a reader without JavaScript, a crawler or a plain-text fetch sees) carries the same numbers as
// the rendered page instead of whatever was typed when the page was last edited.
//
// The page renders itself from data.js and monthly-data.js. This script loads it in headless Chromium twice
// (?lang=es and ?lang=en), reads what the page wrote and puts it back into the file:
//   - the text of every [data-bind] element and the href of every [data-bind-href] link
//   - the fiscal-year range spans (.fyn-*, .fyr-short-*, .fyr-long-*) and the FedWatch source links
//   - the inner HTML of the composed notes, the KPI strip, the as-of row, the tables, the Fed T-account and
//     the sources list
//   - <meta name="data-refreshed"> (data.js generatedAt) and the two dates in the <noscript> note
// An element inside a .en span takes the English rendering, everything else the Spanish one (the site
// default; the static markup shows Spanish). Nothing else in the file changes: the file minus the regions
// written here must be byte-identical before and after, every key must appear as often in the file as in the
// rendered page, and the page must render without errors; otherwise the script exits 1 and writes nothing.
//
//   node scripts/fiscal/bake-page.mjs           write site/fiscal/index.html if anything changed
//   node scripts/fiscal/bake-page.mjs --check   exit 1 if the file is not up to date (writes nothing)
//        [--playwright path/to/playwright/index.mjs]   (or $PLAYWRIGHT_MODULE; $CHROMIUM_PATH for the browser)
//
// refresh-data.yml runs it after every fetch and commits index.html together with data.js. After editing the
// page by hand, run it (then render-check.mjs) before committing.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const CHECK = argv.includes('--check');
const SITE = resolve('site');
const FILE = join(SITE, 'fiscal', 'index.html');
const PW = [arg('--playwright', null), process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright/index.mjs'].find((p) => p && existsSync(p)) || 'playwright';

const FILL_CLASSES = ['fyn-en', 'fyn-es', 'fyr-short-en', 'fyr-short-es', 'fyr-long-en', 'fyr-long-es'];
const LINK_IDS = ['fedWatchSrcEn', 'fedWatchSrcEs'];
const HTML_IDS = ['kpiStrip', 'asofRow', 'debtGdpNoteEn', 'debtGdpNoteEs', 'netIntNoteEn', 'netIntNoteEs', 'fyEndNoteEn', 'fyEndNoteEs', 'outNetNoteEn', 'outNetNoteEs',
  'fedWatchCalloutEn', 'fedWatchCalloutEs', 'tblDebtTrend', 'tblHolders', 'tblForeign', 'tblComposition', 'tblRevenues', 'tblOutlays',
  'tblCboProjection', 'tblInterestBridge', 'tacctAssets', 'tacctLiab', 'corridorWrap', 'srcGrid'];

const die = (msg) => { console.error('bake-page: ' + msg); process.exit(1); };
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// ---- Regions of the file this script owns, in file order: {key, start, end, kind} ----
// Only the markup between <body> and the page script is scanned, so code that mentions data-bind never matches.
function scan(html) {
  const from = html.indexOf('<body'), to = html.indexOf('<script>\n(function(){');
  if (from < 0 || to < from) die('cannot find the <body> markup or the page script');
  const part = html.slice(from, to), out = [];
  const add = (key, start, end, kind) => out.push({ key, start: from + start, end: from + end, kind });
  for (const m of part.matchAll(/<(\w+)\b([^>]*?)\sdata-bind="([^"]+)"([^>]*)>([^<]*)<\/\1>/g)) {
    const s = m.index + m[0].length - m[5].length - m[1].length - 3; add('b:' + m[3], s, s + m[5].length, 'text');
  }
  for (const m of part.matchAll(/<a\b[^>]*>/g)) {
    const bh = /\sdata-bind-href="([^"]+)"/.exec(m[0]), h = /\shref="([^"]*)"/.exec(m[0]);
    if (bh && h) { const s = m.index + h.index + 7; add('h:' + bh[1], s, s + h[1].length, 'attr'); }
  }
  for (const m of part.matchAll(/<(\w+)\s+class="([\w-]+)"[^>]*>([^<]*)<\/\1>/g)) {
    if (!FILL_CLASSES.includes(m[2])) continue;
    const s = m.index + m[0].length - m[3].length - m[1].length - 3; add('c:' + m[2], s, s + m[3].length, 'text');
  }
  for (const id of LINK_IDS) {
    const m = new RegExp('<a\\b[^>]*\\sid="' + id + '"[^>]*>([^<]*)</a>').exec(part);
    if (!m) continue;
    const h = /\shref="([^"]*)"/.exec(m[0]);
    if (h) add('a:' + id, m.index + h.index + 7, m.index + h.index + 7 + h[1].length, 'attr');
    const s = m.index + m[0].length - m[1].length - 4; add('t:' + id, s, s + m[1].length, 'text');
  }
  for (const id of HTML_IDS) {
    const open = new RegExp('<(\\w+)\\b[^>]*\\sid="' + id + '"[^>]*>').exec(part);
    if (!open) continue;
    const tag = open[1], re = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'g');
    re.lastIndex = open.index + open[0].length;
    let depth = 1, m, end = -1;
    while ((m = re.exec(part))) { depth += m[1] ? -1 : 1; if (depth === 0) { end = m.index; break; } }
    if (end < 0) die('no closing </' + tag + '> for #' + id);
    add('i:' + id, open.index + open[0].length, end, 'html');
  }
  const meta = /<meta name="data-refreshed" content="([^"]*)">/.exec(html);
  if (meta) { const s = meta.index + meta[0].indexOf('content="') + 9; out.push({ key: 'meta', start: s, end: s + meta[1].length, kind: 'attr' }); }
  for (const lang of ['es', 'en']) {
    const m = new RegExp('<span data-baked="' + lang + '">([^<]*)</span>').exec(html);
    if (m) { const s = m.index + m[0].length - m[1].length - 7; out.push({ key: 'baked:' + lang, start: s, end: s + m[1].length, kind: 'text' }); }
  }
  out.sort((a, b) => a.start - b.start);
  for (let i = 1; i < out.length; i++) if (out[i].start < out[i - 1].end) die('overlapping regions ' + out[i - 1].key + ' / ' + out[i].key);
  return out;
}
const skeleton = (html, regions) => { let s = '', at = 0; for (const r of regions) { s += html.slice(at, r.start) + '\u0000'; at = r.end; } return s + html.slice(at); };

// ---- Render the page (local server, Chromium) and read what it wrote ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(SITE, p);
  if (!f.startsWith(SITE + sep) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/fiscal/';

const { chromium } = await import(PW);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] });
const renders = {};
try {
  for (const lang of ['es', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    // Off-site requests (Google Fonts) are answered empty, so a font fetch never shows up as a page error.
    await page.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1') return route.continue();
      return route.fulfill({ status: 200, contentType: /fonts\.googleapis\.com$/.test(u.hostname) ? 'text/css' : 'application/octet-stream', body: '' });
    });
    await page.goto(base + '?lang=' + lang, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('kpiStrip') && document.getElementById('kpiStrip').children.length > 0, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    const got = await page.evaluate(({ FILL_CLASSES, LINK_IDS, HTML_IDS }) => {
      if (!window.LIVE_DATA || !window.MONTHLY_DATA) return { missing: true };
      const ctx = (el) => (el.closest('.en') ? 'en' : 'es');
      const rows = [];
      const push = (key, el, val) => rows.push({ key, ctx: ctx(el), val });
      document.querySelectorAll('[data-bind]').forEach((el) => push('b:' + el.getAttribute('data-bind'), el, el.textContent));
      document.querySelectorAll('a[data-bind-href]').forEach((el) => push('h:' + el.getAttribute('data-bind-href'), el, el.getAttribute('href')));
      FILL_CLASSES.forEach((c) => document.querySelectorAll('.' + c).forEach((el) => push('c:' + c, el, el.textContent)));
      LINK_IDS.forEach((id) => { const el = document.getElementById(id); if (el) { push('a:' + id, el, el.getAttribute('href')); push('t:' + id, el, el.textContent); } });
      HTML_IDS.forEach((id) => { const el = document.getElementById(id); if (el) push('i:' + id, el, el.innerHTML); });
      return { rows, generatedAt: window.LIVE_DATA.generatedAt };
    }, { FILL_CLASSES, LINK_IDS, HTML_IDS });
    await page.close();
    if (got.missing) die('the page rendered without its data files (?lang=' + lang + ')');
    if (errors.length) die('the page logged errors (?lang=' + lang + '):\n  ' + errors.join('\n  '));
    renders[lang] = got;
  }
} finally {
  await browser.close();
  server.close();
}

// ---- Merge the two renderings into one value per region ----
const group = (rows) => rows.reduce((m, r) => ((m[r.key] = m[r.key] || []).push(r), m), {});
const es = group(renders.es.rows), en = group(renders.en.rows);
const generatedAt = renders.es.generatedAt;
if (!/^\d{4}-\d{2}-\d{2}T/.test(generatedAt || '')) die('data.js has no generatedAt');
const html = readFileSync(FILE, 'utf8');
const regions = scan(html);
const byKey = group(regions);
const problems = [];
for (const key of new Set([...Object.keys(byKey), ...Object.keys(es)])) {
  if (key === 'meta' || key.startsWith('baked:')) continue;
  const n = (byKey[key] || []).length, a = (es[key] || []).length, b = (en[key] || []).length;
  if (n !== a || a !== b) problems.push(key + ' (file ' + n + ', rendered ' + a + '/' + b + ')');
}
if (problems.length) die('the file and the rendered page disagree on:\n  ' + problems.join('\n  '));
for (const key of Object.keys(es)) {
  if (!key.startsWith('i:')) continue;
  const v = es[key][0].val + en[key][0].val;
  if (/data-bind|fy[nr]-|<script/i.test(v)) die(key + ' renders markup this script would scan again (data-bind, fy*- classes or a script)');
}
const seen = {}, footerEn = (en['b:generatedAtEn'] || []).find((r) => r.ctx === 'en'), footerEs = (es['b:generatedAtEs'] || []).find((r) => r.ctx === 'es');
const value = (r) => {
  if (r.key === 'meta') return generatedAt;
  if (r.key === 'baked:en') return escText(footerEn ? footerEn.val : generatedAt);
  if (r.key === 'baked:es') return escText(footerEs ? footerEs.val : generatedAt);
  const j = (seen[r.key] = (seen[r.key] ?? -1) + 1);
  const row = (es[r.key][j].ctx === 'en' ? en : es)[r.key][j];
  return r.kind === 'html' ? row.val : r.kind === 'attr' ? escAttr(row.val) : escText(row.val);
};
let out = '', at = 0;
const changed = new Set();
for (const r of regions) {
  const v = value(r);
  if (v !== html.slice(r.start, r.end)) changed.add(r.key);
  out += html.slice(at, r.start) + v; at = r.end;
}
out += html.slice(at);

// ---- Invariants: same regions, same everything else ----
const after = scan(out);
if (after.map((r) => r.key).join('|') !== regions.map((r) => r.key).join('|')) die('the written file would scan to different regions; nothing written');
if (skeleton(out, after) !== skeleton(html, regions)) die('the written file would differ outside the baked regions; nothing written');

const summary = regions.length + ' regions, ' + changed.size + ' keys changed, data refreshed ' + generatedAt;
if (CHECK) {
  if (changed.size) { console.log('bake-page: index.html is not up to date (' + summary + '): ' + [...changed].slice(0, 30).join(', ')); process.exit(1); }
  console.log('bake-page: up to date (' + summary + ')');
} else if (out !== html) {
  writeFileSync(FILE, out);
  console.log('bake-page: wrote site/fiscal/index.html (' + summary + ')');
} else {
  console.log('bake-page: nothing to change (' + summary + ')');
}
