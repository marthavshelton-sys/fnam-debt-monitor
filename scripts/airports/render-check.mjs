#!/usr/bin/env node
// Headless render check of an airport model page (ASUR, OMA) served locally: ES and EN at 1280 and 390 px, light and dark.
// Fails on console or page errors, a blank visible chart, an unresolved token ({{…}}), "undefined" or "NaN" in the text, an
// executive summary without its composed bullets (summary.js → compose: true), horizontal overflow or text under 11 px on
// phones. Run by the upkeep routine before it publishes and by hand before pushing a page change:
//   (setsid nohup python3 -m http.server 8123 --directory site >/dev/null 2>&1 &)
//   node scripts/airports/render-check.mjs --company=asur [--base=http://localhost:8123]
// Playwright's Chromium comes from the global install of the cloud sessions (/opt/node22/lib/node_modules/playwright).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const COMPANY = arg('company', 'asur'), BASE = arg('base', 'http://localhost:8123');
let chromium;
try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }

const browser = await chromium.launch();
let failures = 0;
const fail = (m) => { failures++; console.log('FAIL ' + m); };
const ok = (m) => console.log('ok   ' + m);

async function run(width, lang, dark) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(/^(?!http:\/\/localhost)/, (r) => r.abort()); // fonts and anything off-origin are not needed to render
  await page.route(/^http:\/\/localhost/, (r) => r.continue());
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${BASE}/${COMPANY}/?lang=${lang}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const tag = `${COMPANY} ${width}px ${lang}${dark ? ' dark' : ''}`;
  if (errors.length) fail(`${tag}: console/page errors: ${errors.join(' | ').slice(0, 400)}`); else ok(`${tag}: no console errors`);
  const charts = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((cv) => {
    const vis = !!(cv.offsetWidth && cv.offsetHeight) && !cv.closest('[hidden]');
    let blank = null;
    if (vis) { try { const g = cv.getContext('2d'); const d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) n++; blank = n === 0; } catch { blank = null; } }
    return { id: cv.id, vis, blank, w: cv.width, h: cv.height };
  }));
  const visible = charts.filter((c) => c.vis), blank = visible.filter((c) => c.blank !== false);
  if (blank.length) fail(`${tag}: blank/unreadable charts: ${blank.map((c) => `${c.id}(${c.w}x${c.h})`).join(', ')}`); else ok(`${tag}: ${visible.length} visible charts painted`);
  const text = await page.evaluate(() => document.body.innerText);
  for (const m of ['undefined', 'NaN', '{{']) if (text.includes(m)) fail(`${tag}: text contains "${m}"`);
  // the executive summary: composed bullets present and resolved
  const sum = await page.$eval('#sumGrid', (e) => e.innerText).catch(() => '');
  const compose = await page.evaluate((p) => !!(window[p + '_SUMMARY'] && window[p + '_SUMMARY'].compose), COMPANY.toUpperCase());
  if (!sum.trim()) fail(`${tag}: empty executive summary`);
  if (compose) {
    const must = lang === 'es' ? [/^Tráfico de /m, /informe del/, /Reportado al/, /Próximas fechas:/] : [/ traffic \(report of/, /Reported at/, /Next dates:/];
    for (const re of must) if (!re.test(sum)) fail(`${tag}: composed summary sentence missing: ${re}`);
    if (!/pro[ -]forma/i.test(sum) && await page.evaluate((p) => { const M = window[p + '_MODEL']; return !!(M && M.proFormaOn && M.proFormaOn()); }, COMPANY.toUpperCase())) fail(`${tag}: pro-forma basis on but not in the summary`);
    ok(`${tag}: summary (${sum.split('\n').filter(Boolean).length} lines): ${sum.replace(/\n/g, ' | ').slice(0, 200)}…`);
  }
  const asof = await page.$eval('#asofRow', (e) => e.innerText).catch(() => '');
  ok(`${tag}: header: ${asof.replace(/\n/g, ' · ').slice(0, 160)}`);
  const debt = await page.$eval('#debtSrc', (e) => e.textContent).catch(() => '');
  if (!debt.trim() || /\{\{/.test(debt)) fail(`${tag}: debt note empty or unresolved`); else ok(`${tag}: debt note: ${debt.slice(0, 140)}…`);
  if (width < 500) {
    const over = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    if (over > 0) fail(`${tag}: horizontal overflow ${over}px`); else ok(`${tag}: no horizontal overflow`);
    const small = await page.evaluate(() => { const out = new Set(); for (const e of document.querySelectorAll('body *')) { if (!e.offsetWidth || !e.innerText || !e.innerText.trim()) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11 && e.children.length === 0 && !e.closest('table.peers')) out.add(`${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}@${fs}px`); } return [...out].slice(0, 8); });
    if (small.length) fail(`${tag}: text under 11px: ${small.join(', ')}`); else ok(`${tag}: no text under 11px`);
  }
  await ctx.close();
}
for (const [w, l, d] of [[1280, 'es', false], [1280, 'en', false], [390, 'es', false], [390, 'en', true]]) await run(w, l, d);
await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall configurations clean');
process.exit(failures ? 1 : 0);
