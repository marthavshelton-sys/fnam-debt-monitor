#!/usr/bin/env node
// Headless render check for site/fiscal/index.html: desktop (1280 px) and phone (390 px), English and
// Spanish, light and dark. It renders the committed page against the committed data files and fails on
// what a reader would notice and the data checks cannot see:
//   - console errors and page errors; "undefined", "NaN" or "[object Object]" leaking into the text
//   - a visible [data-bind] element left empty
//   - horizontal overflow of the page, and DOM text below 11 px
//   - the section tab bar: every tab and both language buttons must be hit-testable at their centre
//     (elementFromPoint), the language buttons must not overlap the tab strip
//   - every table wrapper that overflows sideways must scroll (overflow-x) and carry the "can-scroll"
//     class plus the scroll hint the page inserts, so a phone reader knows there are more columns
//   - SVG text (the donut labels) must render at 11 px or more once the viewBox scale is applied
//   - English headings and tab labels in Title Case, Spanish ones in sentence case (Mexican usage)
// Canvas charts (Chart.js) cannot be inspected from the DOM: pass --shots DIR and look at the crops of
// the holders chart, the donuts, the outlay bars and the tables in both languages before merging.
//
//   setsid nohup python3 -m http.server 8123 --directory site >/dev/null 2>&1 &
//   node scripts/fiscal/render-check.mjs [--base http://localhost:8123/fiscal/] [--now YYYY-MM-DD]
//        [--shots DIR] [--chart path/to/chart.umd.js] [--playwright path/to/playwright/index.mjs]
//
// The cloud session cannot reach the CDN, so the Chart.js request is answered from a local copy
// (--chart, $CHART_JS, or ./node_modules/chart.js/dist/chart.umd.js); Google Fonts is stubbed and every
// other off-site request is aborted. --now installs a Date shim that keeps time advancing (Chart.js
// animates on Date.now()) so the FedWatch meeting filter can be exercised for a chosen day.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const BASE = arg('--base', process.env.BASE || 'http://localhost:8123/fiscal/');
const NOW = arg('--now', null);
const SHOTS = arg('--shots', null);
const CHART = [arg('--chart', null), process.env.CHART_JS, resolve('node_modules/chart.js/dist/chart.umd.js')].find((p) => p && existsSync(p)) || null;
const PW = [arg('--playwright', null), process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright/index.mjs'].find((p) => p && existsSync(p)) || 'playwright';
const { chromium } = await import(PW);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
if (!CHART) console.log('note: no local Chart.js copy found, the CDN request is let through');

// Title Case (English headings) and sentence case (Spanish headings): the same connector list as
// site/assets/present-core.js, which is the site's convention for deck titles.
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'vs.', 'with', 'over', 'onto', 'up', 'y/y']);
const words = (s) => String(s).replace(/[()"“”„«»,:;!?¿¡]/g, ' ').split(/[\s–—-]+/).filter(Boolean);
function titleCaseProblem(text) {
  const w = words(text);
  const bad = w.filter((t, i) => { const core = t.replace(/['’]s$/, ''); return /^[a-z]+$/.test(core) && !(i > 0 && SMALL.has(core.toLowerCase())) && (core.length >= 4 || i === 0); });
  return bad.length ? `lower-case word(s) ${bad.join(', ')}` : null;
}
function sentenceCaseProblem(text) {
  const w = words(text).slice(1).filter((t) => /^[A-Za-zÀ-ÿ]{4,}$/.test(t) && !/^[A-ZÀ-Ý]+$/.test(t));
  const caps = w.filter((t) => /^[A-ZÀ-Ý]/.test(t)), lower = w.filter((t) => /^[a-zà-ÿ]/.test(t));
  return caps.length && !lower.length ? `Title Case pattern (${caps.join(', ')}) — Spanish headings use sentence case` : null;
}

const CROPS = [['nav.jump', 'nav'], ['#holders .grid-2 .card:first-child', 'holders'], ['#tblForeign', 'foreign'], ['#pieRevFY', 'pieRev'], ['#pieOutFY', 'pieOut'],
  ['#chartOutYTD', 'outYtd'], ['#tblCboProjection', 'cbo'], ['#gdp .tblwrap', 'cboAssumptions'], ['#fedWatchChartWrap', 'fedWatch']];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] });
let failures = 0;
for (const scheme of ['light', 'dark']) {
  for (const [w, h, tag] of [[1280, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
    if (NOW) {
      await ctx.addInitScript(`{ const fixed = new Date('${NOW}T12:00:00'); const RealDate = Date; const offset = fixed.getTime() - RealDate.now();
        class FakeDate extends RealDate { constructor(...a){ super(...(a.length ? a : [RealDate.now() + offset])); } static now(){ return RealDate.now() + offset; } }
        FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC; window.Date = FakeDate; }`);
    }
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(BASE.replace(/\/fiscal\/?$/, ''))) return route.continue();
      if (u.includes('chart.umd.min.js')) return CHART ? route.fulfill({ path: CHART, contentType: 'application/javascript' }) : route.continue();
      if (u.includes('fonts.googleapis.com')) return route.fulfill({ body: '', contentType: 'text/css' });
      return route.abort();
    });
    for (const lang of ['en', 'es']) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      await page.goto(BASE, { waitUntil: 'load' });
      if (lang === 'es') await page.click('#btnLangEs');
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const vis = (el) => !!(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
        const name = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''));
        const text = document.body.innerText;
        const leaks = (text.match(/\bundefined\b|\bNaN\b|\[object Object\]/g) || []).length;
        const emptyBinds = [...document.querySelectorAll('[data-bind]')].filter((el) => vis(el) && !el.textContent.trim()).map((el) => el.getAttribute('data-bind'));
        const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        const small = [...document.querySelectorAll('body *:not(svg *)')].filter((el) => vis(el) && el.children.length === 0 && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 11)
          .map((el) => `${name(el)} ${getComputedStyle(el).fontSize} "${el.textContent.trim().slice(0, 30)}"`);
        // tab bar: every tab and both language buttons reachable, no overlap
        const strip = document.getElementById('jumpNav'), langBox = document.querySelector('.lang-btn');
        const inter = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        const nav = { overlap: false, misses: [] };
        if (strip && langBox) {
          const prev = strip.style.scrollBehavior; strip.style.scrollBehavior = 'auto'; window.scrollTo(0, 0);
          nav.overlap = inter(strip.parentElement.getBoundingClientRect(), langBox.getBoundingClientRect());
          for (const a of strip.querySelectorAll('a')) {
            strip.scrollLeft = Math.max(0, a.offsetLeft - 12);
            const rc = a.getBoundingClientRect();
            const el = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
            if (!el || el.closest('#jumpNav a') !== a) nav.misses.push(`${a.textContent.trim()} -> ${el ? name(el) : 'nothing'}`);
          }
          for (const b of langBox.querySelectorAll('button')) {
            const rc = b.getBoundingClientRect();
            const el = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
            if (!el || el.closest('button') !== b) nav.misses.push(`${b.textContent.trim()} button -> ${el ? name(el) : 'nothing'}`);
          }
          strip.scrollLeft = 0; strip.style.scrollBehavior = prev;
        } else nav.misses.push('tab bar or language buttons not found');
        // tables that overflow sideways must scroll and say so
        const tables = [...document.querySelectorAll('.tblwrap')].filter(vis).map((t) => {
          const over = t.scrollWidth > t.clientWidth + 1, ox = getComputedStyle(t).overflowX;
          const hint = t.nextElementSibling && t.nextElementSibling.classList.contains('scroll-hint');
          const label = t.id || (t.querySelector('table') || {}).id || ((t.closest('.card') || {}).querySelector ? (t.closest('.card').querySelector('h3') || {}).innerText : '') || 'table';
          return { label: String(label).slice(0, 40), over, ok: !over || (['auto', 'scroll'].includes(ox) && t.classList.contains('can-scroll') && hint) };
        });
        // SVG labels: effective size after the viewBox scale
        const svgSmall = [];
        for (const s of document.querySelectorAll('svg')) {
          if (!vis(s)) continue;
          const vb = s.viewBox && s.viewBox.baseVal, rect = s.getBoundingClientRect();
          const scale = vb && vb.width ? rect.width / vb.width : 1;
          for (const t of s.querySelectorAll('text')) {
            if (!vis(t) || !t.textContent.trim()) continue;
            const px = parseFloat(getComputedStyle(t).fontSize) * scale;
            if (px < 11) svgSmall.push(`${px.toFixed(1)}px "${t.textContent.trim().slice(0, 24)}"`);
          }
        }
        // headings and tab labels in both languages (hidden spans included: both are checked once)
        const heads = [...document.querySelectorAll('h1, h2, h3, h4, nav.jump a')].map((el) => ({
          tag: el.tagName.toLowerCase(), en: (el.querySelector('.en') || {}).textContent || '', es: (el.querySelector('.es') || {}).textContent || '' }));
        return { leaks, emptyBinds, overflow, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, small, nav, tables, svgSmall, heads };
      });
      const problems = [];
      if (errors.length) problems.push(...errors.slice(0, 8));
      if (r.leaks) problems.push(`${r.leaks} undefined/NaN/[object Object] in the text`);
      if (r.emptyBinds.length) problems.push('empty data-bind: ' + r.emptyBinds.join(', '));
      if (r.overflow) problems.push(`horizontal overflow: scrollWidth ${r.scrollW} > viewport ${r.clientW}`);
      if (r.small.length) problems.push(`text below 11 px: ${r.small.slice(0, 6).join('; ')}${r.small.length > 6 ? ` (+${r.small.length - 6})` : ''}`);
      if (r.nav.overlap) problems.push('language buttons overlap the tab strip');
      if (r.nav.misses.length) problems.push('tab bar hit test: ' + r.nav.misses.join('; '));
      for (const t of r.tables) if (!t.ok) problems.push(`table "${t.label}" overflows sideways without scroll + hint`);
      if (r.svgSmall.length) problems.push('SVG text below 11 px: ' + r.svgSmall.slice(0, 6).join(', '));
      if (lang === 'en' && scheme === 'light' && tag === 'desktop') {
        for (const hd of r.heads) {
          const pe = hd.en && titleCaseProblem(hd.en.replace(/\s+/g, ' ').trim());
          if (pe) problems.push(`EN ${hd.tag} "${hd.en.trim()}": ${pe}`);
          const ps = hd.es && hd.tag !== 'h1' && sentenceCaseProblem(hd.es.replace(/\s+/g, ' ').trim());
          if (ps) problems.push(`ES ${hd.tag} "${hd.es.trim()}": ${ps}`);
        }
      }
      const label = `${scheme}/${tag}/${lang}`;
      if (problems.length) failures++;
      console.log(`${problems.length ? 'FAIL' : 'ok  '} ${label}  (tables overflowing with scroll+hint: ${r.tables.filter((t) => t.over && t.ok).length})`);
      for (const p of problems) console.log('     - ' + p);
      if (SHOTS) {
        await page.screenshot({ path: `${SHOTS}/${scheme}-${tag}-${lang}.png`, fullPage: true });
        if (scheme === 'light') for (const [sel, nm] of CROPS) {
          const el = await page.$(sel);
          if (el) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await el.screenshot({ path: `${SHOTS}/${tag}-${lang}-${nm}.png` }).catch(() => {}); }
        }
      }
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} configuration(s) with problems` : '\nall 8 configurations clean');
process.exit(failures ? 1 : 0);
