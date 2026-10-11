#!/usr/bin/env node
// Render check of the Mexican Consumer page. Serve the site first:
//   python3 -m http.server 8123 --directory site
//   node scripts/mx-consumidor/render-check.mjs [--shots <dir>] [--only=es-1280-light] [--base=http://localhost:8123]
//
// Every configuration (ES/EN x 1280/390/360 px x light/dark) loads the page with every request outside the local
// server refused, then fails on: a script error, a "undefined"/"NaN"/"null" in the visible text, an empty chart
// canvas, an empty table twin or source line, a horizontal overflow, text under 11 px, a map without 32 states.
// Two configurations also press every selector (map metric, heat table unit, the group charts),
// switch the language and back, and load the page with one data block removed and with no data at all.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); if (i > -1) return process.argv[i + 1]; const e = process.argv.find((a) => a.startsWith(`--${n}=`)); return e ? e.split('=')[1] : d; };
const BASE = arg('base', 'http://localhost:8123');
const SHOTS = arg('shots', null);
const ONLY = arg('only', null);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const configs = [];
for (const lang of ['es', 'en']) for (const [w, h] of [[1280, 900], [390, 844], [360, 780]]) for (const scheme of ['light', 'dark']) configs.push({ lang, w, h, scheme, id: `${lang}-${w}-${scheme}` });

const browser = await chromium.launch();
let failures = 0;
for (const c of configs) {
  if (ONLY && c.id !== ONLY) continue;
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, colorScheme: c.scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(`${BASE}/mx/consumidor/?lang=${c.lang}`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const audit = () => page.evaluate(() => {
    const out = { problems: [] };
    const P = (s) => out.problems.push(s);
    for (const e of window.__MXC_ERRORS || []) P('render: ' + e);
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    // text problems
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n; (n = walker.nextNode());) {
      const t = n.nodeValue.trim(); if (!t) continue;
      const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
      if (/\b(undefined|NaN|null|Infinity)\b|\[object/.test(t)) { const k = t.slice(0, 90); if (!seen.has(k)) { seen.add(k); P('text: "' + k + '" in ' + (el.closest('[id]') || {}).id); } }
      if (vis(el) && !el.closest('svg') && !el.closest('details:not([open])')) { const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11) { const k = 'small ' + fs + ' ' + t.slice(0, 40); if (!seen.has(k)) { seen.add(k); P(`font ${fs}px: "${t.slice(0, 40)}" in ${(el.closest('[id]') || {}).id}`); } } }
    }
    // svg text sizes (rendered size = font-size x scale)
    for (const t of document.querySelectorAll('svg text')) {
      if (!vis(t)) continue; const svg = t.ownerSVGElement; const vb = svg.viewBox.baseVal; const k = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
      const fs = parseFloat(getComputedStyle(t).fontSize) * k; if (fs < 9.5) { const key = 'svg ' + svg.id + Math.round(fs); if (!seen.has(key)) { seen.add(key); P(`svg text ${fs.toFixed(1)}px in ${svg.id || (svg.closest('[id]') || {}).id}: "${t.textContent.slice(0, 20)}"`); } }
    }
    // canvases
    for (const cv of document.querySelectorAll('canvas')) {
      if (!vis(cv)) { if (!cv.closest('[hidden]')) P('canvas not visible: ' + cv.id); continue; }
      const ch = window.Chart && window.Chart.getChart(cv); if (!ch) { P('no chart on canvas ' + cv.id); continue; }
      const pts = ch.data.datasets.reduce((s, d) => s + d.data.filter((v) => v != null && !(typeof v === 'number' && isNaN(v))).length, 0);
      if (!pts) P('chart without data: ' + cv.id);
    }
    // hooks that must be filled
    for (const el of document.querySelectorAll('[data-tbl],[data-src],[data-legend],[data-meta]')) {
      const kind = ['tbl', 'src', 'legend', 'meta'].find((k) => el.dataset[k] != null);
      if (!el.textContent.trim() && !el.closest('[hidden]')) P(`empty ${kind}: ${el.dataset[kind]}`);
    }
    for (const el of document.querySelectorAll('[id]')) { if (/^(kpi|g|c|s|m)[A-Z]/.test(el.id) && !el.children.length && !el.textContent.trim() && el.tagName !== 'CANVAS' && !el.closest('[hidden]')) P('empty element #' + el.id); }
    // maps
    for (const box of document.querySelectorAll('.map-box')) { const n = box.querySelectorAll('path.st').length; if (n !== 32) P(`map ${box.id} has ${n} states`); }
    // overflow
    const W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W + 1) P(`page overflows: ${document.documentElement.scrollWidth} > ${W}`);
    for (const el of document.querySelectorAll('body *')) {
      if (!vis(el)) continue; const r = el.getBoundingClientRect();
      if (r.right > W + 1.5 && !el.closest('nav.jump,details.tbl')) { const k = 'ovf ' + (el.id || el.className || el.tagName); if (!seen.has(k)) { seen.add(k); P(`overflow: <${el.tagName.toLowerCase()} ${el.id ? '#' + el.id : '.' + String(el.className.baseVal != null ? el.className.baseVal : el.className).split(' ')[0]}> right=${Math.round(r.right)} (viewport ${W})`); } }
    }
    out.title = document.title; out.lang = document.documentElement.lang; out.h = document.documentElement.scrollHeight;
    out.canvases = document.querySelectorAll('canvas').length; out.h1 = (document.querySelector('h1') || {}).textContent;
    return out;
  });
  const res = await audit();
  const extra = [];
  if (c.id === 'es-1280-light' || c.id === 'en-390-dark') {
    // every selector state
    const n = await page.locator('.seg button').count();
    for (let i = 0; i < n; i++) {
      const b = page.locator('.seg button').nth(i); const label = (await b.textContent()).trim();
      await b.click(); await page.waitForTimeout(60);
      const r = await audit(); for (const p of r.problems) extra.push(`after "${label}": ${p}`);
    }
    // language round trip must not duplicate anything
    const count = () => page.evaluate(() => [document.querySelectorAll('.legend-row').length, document.querySelectorAll('canvas').length, document.querySelectorAll('.card').length, document.body.innerText.length]);
    const before = await count();
    await page.click(c.lang === 'es' ? '#btnLangEn' : '#btnLangEs'); await page.waitForTimeout(250);
    const other = await audit(); for (const p of other.problems) extra.push(`after language switch: ${p}`);
    if (other.lang === c.lang) extra.push('language switch did not change <html lang>');
    await page.click(c.lang === 'es' ? '#btnLangEs' : '#btnLangEn'); await page.waitForTimeout(250);
    const after = await count();
    if (before.slice(0, 3).join() !== after.slice(0, 3).join()) extra.push(`language round trip changed the page: ${before} -> ${after}`);
    // one block missing, then no data at all
    for (const drop of ['demo', 'income', 'states', 'funds', 'deciles', 'kshape', 'poverty', 'credit', 'bank', 'rates', 'cardsInForce', 'bis', 'lending', 'enif', 'enfih', 'savings', 'wages', 'work', 'cardPayments']) {
      const p2 = await ctx.newPage(); const errs = [];
      p2.on('pageerror', (e) => errs.push(e.message));
      await p2.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
      await p2.route('**/mx/consumidor/data/data.js', async (r) => { const resp = await r.fetch(); r.fulfill({ response: resp, body: (await resp.text()) + `\ndelete window.MXC_DATA.${drop};` }); });
      await p2.goto(`${BASE}/mx/consumidor/?lang=${c.lang}`, { waitUntil: 'load' }); await p2.waitForTimeout(350);
      const r = await p2.evaluate(() => ({ errs: window.__MXC_ERRORS || [], bad: /\b(undefined|NaN)\b/.test(document.body.innerText) }));
      for (const e of errs.concat(r.errs)) extra.push(`without ${drop}: ${e}`);
      if (r.bad) extra.push(`without ${drop}: undefined/NaN in the text`);
      await p2.close();
    }
    const p3 = await ctx.newPage(); const errs3 = [];
    p3.on('pageerror', (e) => errs3.push(e.message));
    await p3.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await p3.route('**/mx/consumidor/data/*.js', (r) => r.abort());
    await p3.goto(`${BASE}/mx/consumidor/?lang=${c.lang}`, { waitUntil: 'load' }); await p3.waitForTimeout(300);
    const warned = await p3.evaluate(() => { const w = document.getElementById('dataWarn'); return !!w && !w.hidden && w.textContent.trim().length > 10; });
    if (!warned) extra.push('no data: the warning is not shown');
    for (const e of errs3) extra.push('no data: ' + e);
    await p3.close();
  }
  const all = [...errors, ...res.problems, ...extra];
  console.log(`${all.length ? 'FAIL' : 'ok  '} ${c.id}  title="${res.title}" lang=${res.lang} height=${res.h} canvases=${res.canvases}`);
  for (const p of all.slice(0, 40)) console.log('     - ' + p);
  if (all.length > 40) console.log(`     … ${all.length - 40} more`);
  failures += all.length;
  if (SHOTS) {
    await page.addStyleTag({ content: 'nav.jump{position:static !important}.lang-pill{position:static !important}' });
    await page.screenshot({ path: `${SHOTS}/${c.id}-full.png`, fullPage: true });
    const ids = await page.evaluate(() => [...document.querySelectorAll('section.block, header.top, footer')].map((s, i) => s.id || (s.tagName.toLowerCase() + i)));
    for (const id of ids) { const el = await page.$(id.startsWith('header') ? 'header.top' : id.startsWith('footer') ? 'footer' : '#' + id); if (el) await el.screenshot({ path: `${SHOTS}/${c.id}-${id}.png` }).catch(() => {}); }
  }
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} problem(s)` : '\nall configurations clean');
process.exit(failures ? 1 : 0);
