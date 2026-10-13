#!/usr/bin/env node
// Checks the site search: what it finds, and that every page carries it, shows it well and runs it.
//
//   node scripts/search/check.mjs                    queries, every page, the keyboard and the in-page jumps
//   node scripts/search/check.mjs --queries-only     the queries only (the index workflow runs this before committing)
//   node scripts/search/check.mjs --pages /gap/,/macro/   only those pages (plus the queries and the flows)
//   node scripts/search/check.mjs --shots <dir>      also save screenshots (each page's top and its open dialog)
//   node scripts/search/check.mjs --base <url>       use a running server (default: serves site/ itself)
//
// Queries: each expectation below must be the FIRST result, in Spanish and in English; every suggestion chip must find
// something; every result link must be well formed (?lang= once, before the anchor).
// Every page (every site/**/index.html but the redirect stubs, plus the 404 page), in Spanish at 1280 px light and in
// English at 360 px dark: a search button is visible and inside the screen, no text in it under 11 px, nothing wider than
// the screen, no script error; the button opens the dialog with the cursor in the field, "orcl" answers the Oracle model
// first in the page's language, the dialog fits the screen, Esc closes it and gives the focus back.
// Flows: "/" and Ctrl+K open it, arrows move, Enter opens a result in the reader's language; a landing-page panel, a
// section of the page being read (Oracle, collapsed) and a macro view of the dashboard being read are reached in place,
// without reloading; the 404 page opens it with the words of the missing address; a page's own language toggle renames
// the button and the dialog. Exit 1 on any failure.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = join(ROOT, 'site');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); if (i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]; const e = process.argv.find((a) => a.startsWith(`--${n}=`)); return e ? e.slice(n.length + 3) : d; };
const QUERIES_ONLY = process.argv.includes('--queries-only');
const ONLY = arg('pages', null);
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

// The pages a reader can open: every site/**/index.html but redirect stubs; the 404 page is checked at a missing address.
function sitePages() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) { if (name !== 'assets' && name !== 'status' && !name.startsWith('.')) walk(f); continue; }
      if (name !== 'index.html' || /<meta[^>]+http-equiv=["']?refresh/i.test(readFileSync(f, 'utf8'))) continue;
      const rel = relative(SITE, dirname(f)).split(sep).join('/');
      out.push(rel ? '/' + rel + '/' : '/');
    }
  })(SITE);
  out.push('/no-such-page-oracel/'); // the 404 page
  return out;
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
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|status of 404/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    return { ctx, page, errors };
  };
  const visibleTrigger = (page) => page.evaluateHandle(() => [...document.querySelectorAll('[data-search-open]')].find((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; }) || null);
  const settle = (u) => (u.includes('macro') ? 1400 : 600);

  // ---------- queries (landing page) ----------
  for (const lang of ['es', 'en']) {
    const { ctx, page, errors } = await newPage({});
    await page.goto(`${BASE}/?lang=${lang}`, { waitUntil: 'load' });
    await page.evaluate(() => window.FNAM_SEARCH.ready());
    let ok = 0;
    for (const [q, want] of EXPECT) {
      const r = await page.evaluate((q) => window.FNAM_SEARCH.query(q), q);
      if (!r.length || r[0].url !== want) fail(`[${lang}] "${q}" → ${r.length ? r[0].url : 'no result'} (expected ${want} first)`); else ok++;
    }
    await page.click('[data-search-open]');
    const chips = await page.$$eval('#fsMsg .fs-chip', (b) => b.map((x) => x.getAttribute('data-q')));
    if (chips.length < 4) fail(`[${lang}] only ${chips.length} suggestion chips`);
    for (const q of chips) { const r = await page.evaluate((q) => window.FNAM_SEARCH.query(q), q); if (!r.length) fail(`[${lang}] suggestion "${q}" finds nothing`); }
    for (const q of ['gap', 'inflación', 'pdf', 'estado', 'deuda', 'oracle capex']) {
      await page.fill('#fsInput', q); await page.waitForTimeout(90);
      const hrefs = await page.$$eval('#fsList a.fs-res', (as) => as.map((a) => a.getAttribute('href')));
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

  // ---------- every page ----------
  const pages = ONLY ? ONLY.split(',').filter(Boolean) : sitePages();
  const configs = [{ lang: 'es', w: 1280, h: 900, scheme: 'light' }, { lang: 'en', w: 360, h: 780, scheme: 'dark' }];
  for (const u of pages) {
    for (const c of configs) {
      const id = `${u} [${c.lang} ${c.w} ${c.scheme}]`;
      const { ctx, page, errors } = await newPage({ viewport: { width: c.w, height: c.h }, colorScheme: c.scheme });
      try {
        await page.goto(`${BASE}${u}?lang=${c.lang}`, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(settle(u));
        const n = await page.$$eval('[data-search-open]', (b) => b.length);
        if (!n) { fail(`${id}: no search button`); continue; }
        const trig = await visibleTrigger(page);
        if (!(await trig.evaluate((b) => !!b))) { fail(`${id}: no search button visible`); continue; }
        const geo = await trig.evaluate((b) => {
          const r = b.getBoundingClientRect(); const W = document.documentElement.clientWidth;
          const small = [...b.querySelectorAll('*'), b].filter((el) => el.firstChild || getComputedStyle(el, '::before').content !== 'none').map((el) => parseFloat(getComputedStyle(el).fontSize)).filter((s) => s < 11);
          return { l: r.left, r: r.right, w: r.width, h: r.height, W, sw: document.documentElement.scrollWidth, small };
        });
        if (geo.l < -0.5 || geo.r > geo.W + 0.5) fail(`${id}: search button outside the screen ${JSON.stringify(geo)}`);
        // WCAG 2.2 target size (minimum): 24 × 24 px; in a pill it matches the pill's own buttons
        if (geo.h < 24 || geo.w < 24) fail(`${id}: search button smaller than a 24 px target ${JSON.stringify(geo)}`);
        if (geo.small.length) fail(`${id}: text under 11 px in the search button`);
        if (geo.sw > geo.W + 1) fail(`${id}: the page is wider than the screen (${geo.sw} > ${geo.W})`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/top-${u.replace(/\W+/g, '_')}-${c.lang}-${c.w}.png`, clip: { x: 0, y: 0, width: c.w, height: Math.min(c.h, 300) } });
        await trig.evaluate((b) => b.click());
        const opened = await page.evaluate(() => { const d = document.getElementById('fsDialog'); return !!d && d.open && document.activeElement && document.activeElement.id === 'fsInput'; });
        if (!opened) { fail(`${id}: the button did not open the dialog with the cursor in the field`); continue; }
        await page.evaluate(() => window.FNAM_SEARCH.ready());
        await page.fill('#fsInput', 'orcl'); await page.waitForTimeout(120);
        const first = await page.$eval('#fsList a.fs-res', (a) => ({ href: a.getAttribute('href'), title: a.querySelector('.fs-t').textContent })).catch(() => null);
        if (!first || first.href !== `/oracle/?lang=${c.lang}`) fail(`${id}: "orcl" first result ${JSON.stringify(first)}`);
        const dg = await page.$eval('#fsDialog', (d) => { const r = d.getBoundingClientRect(); const right = Math.max(0, ...[...d.querySelectorAll('.fs-res')].map((a) => a.getBoundingClientRect().right)); return { l: r.left, t: r.top, r: r.right, b: r.bottom, sw: d.scrollWidth, cw: d.clientWidth, right, W: innerWidth, H: innerHeight, ph: document.getElementById('fsInput').placeholder }; });
        if (dg.l < -0.5 || dg.t < -0.5 || dg.r > dg.W + 0.5 || dg.b > dg.H + 0.5) fail(`${id}: dialog outside the screen ${JSON.stringify(dg)}`);
        if (dg.sw > dg.cw + 1 || dg.right > dg.r + 0.5) fail(`${id}: dialog content wider than the dialog`);
        if ((c.lang === 'en') !== /Company/.test(dg.ph)) fail(`${id}: dialog not in the page's language (placeholder "${dg.ph}")`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/dialog-${u.replace(/\W+/g, '_')}-${c.lang}-${c.w}.png` });
        await page.keyboard.press('Escape'); await page.waitForTimeout(60);
        const closed = await page.evaluate(() => !document.getElementById('fsDialog').open && !!document.activeElement && document.activeElement.hasAttribute('data-search-open') && !document.documentElement.classList.contains('fs-open'));
        if (!closed) fail(`${id}: Esc did not close the dialog and give the focus back to the button`);
        if (errors.length) fail(`${id}: script errors: ${errors.join(' | ').slice(0, 300)}`);
      } catch (e) {
        fail(`${id}: ${e.message.split('\n')[0]}`);
      } finally { await ctx.close(); }
    }
  }
  console.log(`pages: ${pages.length} × ${configs.length} configurations`);

  // ---------- flows ----------
  {
    const { ctx, page, errors } = await newPage({});
    // landing: keyboard, a panel of the page, Enter to another page
    await page.goto(`${BASE}/?lang=es`, { waitUntil: 'load' });
    await page.evaluate(() => window.FNAM_SEARCH.ready());
    await page.keyboard.press('/');
    if (!(await page.evaluate(() => document.getElementById('fsDialog').open))) fail('flow: "/" did not open the search');
    await page.keyboard.type('deuda'); await page.waitForTimeout(120);
    const a0 = await page.getAttribute('#fsInput', 'aria-activedescendant');
    await page.keyboard.press('ArrowDown'); const a1 = await page.getAttribute('#fsInput', 'aria-activedescendant');
    await page.keyboard.press('ArrowUp'); const a2 = await page.getAttribute('#fsInput', 'aria-activedescendant');
    if (a0 !== 'fs-0' || a1 !== 'fs-1' || a2 !== 'fs-0') fail(`flow: arrows moved ${a0} → ${a1} → ${a2}`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    if (!(await page.evaluate(() => document.getElementById('fsDialog').open))) fail('flow: Ctrl+K did not open the search');
    await page.fill('#fsInput', 'última actualización'); await page.waitForTimeout(120);
    const h0 = await page.$eval('#fsList a.fs-res', (a) => a.getAttribute('href'));
    if (h0 !== '#estado') fail(`flow: "última actualización" first result ${h0} (expected #estado)`);
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    const st = await page.evaluate(() => ({ open: document.getElementById('fsDialog').open, hash: location.hash, path: location.pathname }));
    if (st.open || st.hash !== '#estado' || st.path !== '/') fail(`flow: Enter on a panel of this page ${JSON.stringify(st)}`);
    await page.click('[data-search-open]');
    await page.fill('#fsInput', 'pemex'); await page.waitForTimeout(120);
    await Promise.all([page.waitForURL(/\/mx\/fiscal\//, { timeout: 30000 }), page.keyboard.press('Enter')]);
    const u1 = new URL(page.url());
    if (u1.pathname !== '/mx/fiscal/' || u1.searchParams.get('lang') !== 'es' || u1.hash !== '#pemex') fail(`flow: Enter on "pemex" opened ${page.url()}`);

    // a section of the page being read, collapsed (Oracle): reached in place, opened
    await page.goto(`${BASE}/oracle/?lang=es`, { waitUntil: 'load' }); await page.waitForTimeout(600);
    await page.evaluate(() => { window.__noReload = 1; });
    await page.click('[data-search-open]'); await page.evaluate(() => window.FNAM_SEARCH.ready());
    await page.fill('#fsInput', 'oracle capex'); await page.waitForTimeout(150);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    const o = await page.evaluate(() => ({ same: window.__noReload === 1, hash: location.hash, open: !document.getElementById('capex').classList.contains('collapsed'), dlg: document.getElementById('fsDialog').open }));
    if (!o.same || o.hash !== '#capex' || !o.open || o.dlg) fail(`flow: Oracle "oracle capex" in place ${JSON.stringify(o)}`);

    // a view of the dashboard being read (US macro): switched by the page's own navigation, no reload
    await page.goto(`${BASE}/macro/?lang=es`, { waitUntil: 'load' }); await page.waitForTimeout(1400);
    await page.evaluate(() => { window.__noReload = 1; });
    await page.keyboard.press('/'); await page.evaluate(() => window.FNAM_SEARCH.ready());
    await page.fill('#fsInput', 'PCE'); await page.waitForTimeout(150);
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({ same: window.__noReload === 1, active: (document.querySelector('.rail-item.active') || {}).getAttribute ? document.querySelector('.rail-item.active').getAttribute('data-view') : null, visible: !!document.getElementById('view-pce') && getComputedStyle(document.getElementById('view-pce')).display !== 'none' }));
    if (!m.same || m.active !== 'pce' || !m.visible) fail(`flow: macro "PCE" in place ${JSON.stringify(m)}`);

    // the 404 page opens the search with the words of the missing address
    await page.goto(`${BASE}/oracel/`, { waitUntil: 'load' }); await page.waitForTimeout(300);
    await page.click('[data-search-open]'); await page.evaluate(() => window.FNAM_SEARCH.ready()); await page.waitForTimeout(150);
    const nf = await page.evaluate(() => ({ v: document.getElementById('fsInput').value, first: (document.querySelector('#fsList a.fs-res') || { getAttribute: () => null }).getAttribute('href') }));
    if (nf.v !== 'oracel' || !/^\/oracle\/\?lang=/.test(nf.first || '')) fail(`flow: 404 prefill ${JSON.stringify(nf)}`);

    // a page's own language toggle renames the button and the dialog (GAP's pill)
    await page.goto(`${BASE}/gap/?lang=es`, { waitUntil: 'load' }); await page.waitForTimeout(600);
    await page.click('#btnLangEn'); await page.waitForTimeout(200);
    const lab = await page.$eval('.lang-btn [data-search-open]', (b) => b.getAttribute('aria-label'));
    await page.click('.lang-btn [data-search-open]');
    const ph = await page.$eval('#fsInput', (i) => i.placeholder);
    if (lab !== 'Search FNAM' || !/Company/.test(ph)) fail(`flow: GAP language toggle → button "${lab}", placeholder "${ph}"`);
    if (errors.length) fail(`flow: script errors: ${errors.join(' | ').slice(0, 300)}`);
    await ctx.close();
    console.log('flows: keyboard, in-place section and view, 404 prefill, language toggle checked');
  }
  await browser.close();
  if (own) own.close();
}

main().then(() => {
  if (failures.length) { console.error(`\nsearch check: ${failures.length} failure(s)`); process.exit(1); }
  console.log('\nsearch check: all passed');
}).catch((e) => { console.error(e); process.exit(1); });
