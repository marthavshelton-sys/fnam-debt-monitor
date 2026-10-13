#!/usr/bin/env node
// Checks the site search on the landing page: what it finds, and how it looks and behaves.
//
//   node scripts/search/check.mjs                    queries, then the render and keyboard checks
//   node scripts/search/check.mjs --queries-only     the queries only (the index workflow runs this before committing)
//   node scripts/search/check.mjs --shots <dir>      also save a screenshot of every configuration
//   node scripts/search/check.mjs --base <url>       use a running server (default: serves site/ itself)
//
// Queries: each expectation below must be the FIRST result, in Spanish and in English; every suggestion chip must find
// something; every result link must be well formed (?lang= once, before the anchor). Render: Spanish and English x
// 1280 / 390 / 360 px x light and dark: no script error, nothing wider than the screen, no text under 11 px, the search
// button and the dialog inside the viewport, "orcl" answers the Oracle model first. Keyboard (one configuration): "/"
// and Ctrl+K open it, arrows move, Enter opens the result in the reader's language, Esc closes and gives the focus
// back, a landing-page panel (#estado) scrolls in place. Exit 1 on any failure.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = join(ROOT, 'site');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); if (i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]; const e = process.argv.find((a) => a.startsWith(`--${n}=`)); return e ? e.slice(n.length + 3) : d; };
const QUERIES_ONLY = process.argv.includes('--queries-only');
const SHOTS = arg('shots', null);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// The first result each query must give. The owner's example first (oracle / ORCL → the Oracle model), then every
// curated identifier kind (tickers, names, indicator abbreviations), a typo, a prefix, and a company + topic pair.
const EXPECT = [
  ['oracle', '/oracle/'], ['ORCL', '/oracle/'], ['orcl', '/oracle/'], ['Oracle Corporation', '/oracle/'], ['oracel', '/oracle/'], ['orac', '/oracle/'],
  ['GAP', '/gap/'], ['GAPB', '/gap/'], ['PAC', '/gap/'], ['Grupo Aeroportuario del Pacífico', '/gap/'],
  ['OMA', '/oma/'], ['OMAB', '/oma/'], ['ASUR', '/asur/'], ['ASURB', '/asur/'], ['ASR', '/asur/'],
  ['Quálitas', '/qualitas/'], ['qualitas', '/qualitas/'], ['Q*', '/qualitas/'], ['Gentera', '/gentera/'],
  ['Mauricio', '/mauricio/'], ['Microsoft', '/hiperescaladores/'], ['MSFT', '/hiperescaladores/'], ['AMZN', '/hiperescaladores/'],
  ['CPI', '/macro/?view=cpi'], ['PCE', '/macro/?view=pce'], ['INPC', '/mx/macro/?view=inpc'], ['tipo de cambio', '/mx/macro/?view=external'],
  ['Pemex', '/mx/fiscal/#pemex'], ['AICM', '/aeropuertos/trafico/#aicm'], ['AIFA', '/aeropuertos/trafico/#aifa'],
  ['oracle capex', '/oracle/#capex'], ['orcl dcf', '/oracle/#dcf'], ['gap tráfico', '/gap/#traffic'],
];

const failures = [];
const fail = (m) => { failures.push(m); console.log('  FAIL ' + m); };

// Index integrity: titles in both languages, one entry per address, pages that exist.
function checkIndex() {
  const src = readFileSync(join(SITE, 'assets', 'search-index.js'), 'utf8');
  const win = {}; new Function('window', src)(win);
  const E = (win.FNAM_SEARCH_INDEX || {}).entries || [];
  if (E.length < 100) fail(`index has only ${E.length} entries`);
  const seen = new Set();
  for (const e of E) {
    if (seen.has(e.u)) fail(`duplicate entry ${e.u}`); seen.add(e.u);
    if (!e.t || !e.t[0] || !e.t[1]) fail(`entry without a title in both languages: ${e.u}`);
    const path = e.u.split(/[?#]/)[0];
    if (!existsSync(join(SITE, path, 'index.html'))) fail(`entry points to a missing page: ${e.u}`);
  }
  console.log(`index: ${E.length} entries, ${E.filter((e) => e.k === 'page').length} pages`);
}

async function main() {
  checkIndex();
  const own = arg('base', null) ? null : await serveSite(SITE);
  const BASE = arg('base', null) || own.base;
  const browser = await chromium.launch();
  const newPage = async (opts) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, ...opts });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    return { ctx, page, errors };
  };

  // ---------- queries ----------
  for (const lang of ['es', 'en']) {
    const { ctx, page, errors } = await newPage({});
    await page.goto(`${BASE}/?lang=${lang}`, { waitUntil: 'load' });
    await page.evaluate(() => window.FNAM_SEARCH.ready());
    let ok = 0;
    for (const [q, want] of EXPECT) {
      const r = await page.evaluate((q) => window.FNAM_SEARCH.query(q), q);
      if (!r.length || r[0].url !== want) fail(`[${lang}] "${q}" → ${r.length ? r[0].url : 'no result'} (expected ${want} first)`); else ok++;
    }
    // the suggestion chips of the empty dialog must each find something
    await page.click('#searchOpen');
    const chips = await page.$$eval('#searchMsg .sd-chip', (b) => b.map((x) => x.getAttribute('data-q')));
    if (chips.length < 4) fail(`[${lang}] only ${chips.length} suggestion chips`);
    for (const q of chips) { const r = await page.evaluate((q) => window.FNAM_SEARCH.query(q), q); if (!r.length) fail(`[${lang}] suggestion "${q}" finds nothing`); }
    // result links: ?lang= once, before the anchor; landing panels as a bare anchor
    for (const q of ['gap', 'inflación', 'pdf', 'estado', 'deuda', 'oracle capex']) {
      await page.fill('#searchInput', q); await page.waitForTimeout(90);
      const hrefs = await page.$$eval('#searchList a.sr', (as) => as.map((a) => a.getAttribute('href')));
      for (const h of hrefs) {
        const good = h.startsWith('#') || (new RegExp(`^/[^?#]*\\?(?:[^#]*&)?lang=${lang}(?:&[^#]*)?(#[^?#]+)?$`).test(h) && (h.match(/lang=/g) || []).length === 1);
        if (!good) fail(`[${lang}] malformed result link for "${q}": ${h}`);
      }
    }
    if (errors.length) fail(`[${lang}] script errors: ${errors.join(' | ').slice(0, 300)}`);
    console.log(`queries [${lang}]: ${ok}/${EXPECT.length} first as expected, ${chips.length} chips`);
    await ctx.close();
  }
  if (QUERIES_ONLY) { await browser.close(); if (own) own.close(); return; }

  // ---------- render ----------
  const configs = [];
  for (const lang of ['es', 'en']) for (const [w, h] of [[1280, 900], [390, 844], [360, 780]]) for (const scheme of ['light', 'dark']) configs.push({ lang, w, h, scheme, id: `${lang}-${w}-${scheme}` });
  for (const c of configs) {
    const { ctx, page, errors } = await newPage({ viewport: { width: c.w, height: c.h }, colorScheme: c.scheme });
    await page.goto(`${BASE}/?lang=${c.lang}`, { waitUntil: 'load' });
    await page.evaluate(() => window.FNAM_SEARCH.ready());
    const audit = (scope) => page.evaluate((scope) => {
      const out = []; const P = (m) => { if (out.indexOf(m) < 0) out.push(m); };
      const root = document.querySelector(scope) || document.body;
      const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const W = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > W + 1) P(`page overflows: ${document.documentElement.scrollWidth} > ${W}`);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n; (n = walker.nextNode());) {
        const el = n.parentElement; if (!n.nodeValue.trim() || !el || !vis(el) || el.closest('.sr-only')) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11) P(`text ${fs}px: "${n.nodeValue.trim().slice(0, 30)}"`);
        // text cut by an ellipsis stays inside its box; anything else past the screen's edge is a defect
        const box = el.closest('.sr-t, .sr-sub, .sb-label') || el;
        if (box.getBoundingClientRect().right > W + 1) P(`text past the screen: "${n.nodeValue.trim().slice(0, 30)}"`);
      }
      return out;
    }, scope);
    for (const p of await audit('.topbar')) fail(`${c.id} top bar: ${p}`);
    const btn = await page.$eval('#searchOpen', (b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height, vis: !b.hidden }; });
    if (!btn.vis || btn.l < 0 || btn.r > c.w || btn.h < 36) fail(`${c.id}: search button out of place ${JSON.stringify(btn)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${c.id}.png`, clip: { x: 0, y: 0, width: c.w, height: Math.min(c.h, 360) } });
    await page.click('#searchOpen');
    const opened = await page.evaluate(() => document.getElementById('searchDialog').open && document.activeElement && document.activeElement.id === 'searchInput');
    if (!opened) fail(`${c.id}: the button did not open the dialog with the cursor in the field`);
    await page.keyboard.type('orcl'); await page.waitForTimeout(120);
    const first = await page.$eval('#searchList a.sr', (a) => ({ href: a.getAttribute('href'), title: a.querySelector('.sr-t').textContent }));
    if (first.href !== `/oracle/?lang=${c.lang}` || !/Oracle/.test(first.title)) fail(`${c.id}: "orcl" first result ${JSON.stringify(first)}`);
    for (const p of await audit('#searchDialog')) fail(`${c.id} dialog: ${p}`);
    const geo = await page.$eval('#searchDialog', (d) => { const r = d.getBoundingClientRect(); const items = [...d.querySelectorAll('.sr')].map((a) => a.getBoundingClientRect().right); return { l: r.left, t: r.top, r: r.right, b: r.bottom, sw: d.scrollWidth, cw: d.clientWidth, maxItem: Math.max(0, ...items) }; });
    if (geo.l < -0.5 || geo.t < -0.5 || geo.r > c.w + 0.5 || geo.b > c.h + 0.5) fail(`${c.id}: dialog outside the viewport ${JSON.stringify(geo)}`);
    if (geo.sw > geo.cw + 1 || geo.maxItem > geo.r + 0.5) fail(`${c.id}: dialog content wider than the dialog ${JSON.stringify(geo)}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/dialog-${c.id}.png` });
    await page.fill('#searchInput', 'xyzzyq'); await page.waitForTimeout(90);
    const none = await page.$eval('#searchMsg', (m) => !m.hidden && /«|“/.test(m.textContent) && m.querySelectorAll('.sd-chip').length > 0);
    if (!none) fail(`${c.id}: no "no results" message with suggestions`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(50);
    const closed = await page.evaluate(() => !document.getElementById('searchDialog').open && document.activeElement && document.activeElement.id === 'searchOpen' && !document.documentElement.classList.contains('sd-open'));
    if (!closed) fail(`${c.id}: Esc did not close the dialog and give the focus back to the button`);
    if (errors.length) fail(`${c.id}: script errors: ${errors.join(' | ').slice(0, 300)}`);
    await ctx.close();
  }
  console.log(`render: ${configs.length} configurations`);

  // ---------- keyboard and navigation ----------
  {
    const { ctx, page, errors } = await newPage({});
    await page.goto(`${BASE}/?lang=es`, { waitUntil: 'load' });
    await page.evaluate(() => window.FNAM_SEARCH.ready());
    await page.keyboard.press('/');
    if (!(await page.evaluate(() => document.getElementById('searchDialog').open))) fail('keyboard: "/" did not open the search');
    await page.keyboard.type('deuda');
    await page.waitForTimeout(120);
    const a0 = await page.getAttribute('#searchInput', 'aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    const a1 = await page.getAttribute('#searchInput', 'aria-activedescendant');
    await page.keyboard.press('ArrowUp');
    const a2 = await page.getAttribute('#searchInput', 'aria-activedescendant');
    if (a0 !== 'sr-0' || a1 !== 'sr-1' || a2 !== 'sr-0') fail(`keyboard: arrows moved ${a0} → ${a1} → ${a2}`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    if (!(await page.evaluate(() => document.getElementById('searchDialog').open))) fail('keyboard: Ctrl+K did not open the search');
    // a landing-page panel scrolls in place
    await page.fill('#searchInput', 'última actualización'); await page.waitForTimeout(120);
    const h0 = await page.$eval('#searchList a.sr', (a) => a.getAttribute('href'));
    if (h0 !== '#estado') fail(`keyboard: "última actualización" first result ${h0} (expected #estado)`);
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    const st = await page.evaluate(() => ({ open: document.getElementById('searchDialog').open, hash: location.hash, path: location.pathname }));
    if (st.open || st.hash !== '#estado' || st.path !== '/') fail(`keyboard: Enter on a panel of this page ${JSON.stringify(st)}`);
    // Enter opens the top result in the reader's language, at its section
    await page.click('#searchOpen');
    await page.fill('#searchInput', 'pemex'); await page.waitForTimeout(120);
    await Promise.all([page.waitForURL(/\/mx\/fiscal\//, { timeout: 30000 }), page.keyboard.press('Enter')]);
    const u = new URL(page.url());
    if (u.pathname !== '/mx/fiscal/' || u.searchParams.get('lang') !== 'es' || u.hash !== '#pemex') fail(`keyboard: Enter on "pemex" opened ${page.url()}`);
    // the English view: the dialog speaks English and links carry lang=en
    await page.goto(`${BASE}/?lang=es`, { waitUntil: 'load' });
    await page.click('.lang-switch button[data-lang="en"]');
    await page.click('#searchOpen');
    await page.evaluate(() => window.FNAM_SEARCH.ready());
    await page.fill('#searchInput', 'gap'); await page.waitForTimeout(120);
    const en = await page.evaluate(() => ({ ph: document.getElementById('searchInput').placeholder, href: document.querySelector('#searchList a.sr').getAttribute('href'), titles: [...document.querySelectorAll('#searchList .sr-t')].map((t) => t.textContent) }));
    if (!/Company/.test(en.ph) || en.href !== '/gap/?lang=en' || !en.titles.includes('Mexican Airports')) fail(`keyboard: English view ${JSON.stringify(en).slice(0, 300)}`);
    if (errors.length) fail(`keyboard: script errors: ${errors.join(' | ').slice(0, 300)}`);
    await ctx.close();
    console.log('keyboard and navigation: checked');
  }
  await browser.close();
  if (own) own.close();
}

main().then(() => {
  if (failures.length) { console.error(`\nsearch check: ${failures.length} failure(s)`); process.exit(1); }
  console.log('\nsearch check: all passed');
}).catch((e) => { console.error(e); process.exit(1); });
