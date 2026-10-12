#!/usr/bin/env node
// Deck check for the Mexican Consumer page (Playwright Chromium): builds the PDF presentation in Spanish and in English from
// the page served locally, the way a reader does (the PDF button), and fails when
//   - the build shows an error, a script error is thrown or no PDF comes out (also through the deep link ?present=1);
//   - the page is not left as it was (its theme, the button, the notice);
//   - the engine reports a table that did not fit its page;
//   - (with PyMuPDF: python3 -c "import pymupdf") the saved PDF has fewer pages than expected, prints "undefined", "NaN",
//     "null" or an unresolved token, carries words of the other language, names a repository path, lacks one of the
//     header figures the page shows, has a contents page whose rows are not all links to pages inside the document, or
//     has a word past the right margin or across the footer rule (text spilled out of its box or page).
// With --shots <dir> every page of both decks is rasterised so the output can be looked at (do look: a check cannot see
// a cramped chart or an overlapping label).
// Run with the site served locally:  python3 -m http.server 8123 --directory site   (detached), then
//   node scripts/mx-consumidor/deck-check.mjs [--base http://localhost:8123] [--out <dir>] [--shots <dir>] [--dark]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:8123'), OUT = arg('--out', '/tmp/mx-consumidor-deck'), SHOTS = arg('--shots', null), DARK = process.argv.includes('--dark');
mkdirSync(OUT, { recursive: true }); if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const MIN_PAGES = 17;

const PY = String.raw`
import sys, json, re
import pymupdf
path, lang, shots = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else '')
doc = pymupdf.open(path)
out = {'pages': doc.page_count, 'problems': [], 'titles': [], 'text': ''}
P = out['problems'].append
other = {'en': r'\b(hogares|ingreso|gasto|seg[uú]n|trimestre|pobreza|riqueza|empresas|deuda|fuentes|poblaci[oó]n|cr[eé]dito)\b', 'es': r'\b(households|spending|wealth|poverty|income|sources|through|loans)\b'}[lang]
toc = None
for i, page in enumerate(doc):
    text = page.get_text()
    out['text'] += text + '\n'
    first = text.strip().split('\n')[0] if text.strip() else ''
    out['titles'].append(first)
    if re.search(r'\bundefined\b|\bNaN\b|\bnull\b|\{\{|\[object', text): P('page %d prints a placeholder: %s' % (i + 1, re.search(r'.{0,30}(undefined|NaN|null|\{\{|\[object).{0,30}', text).group(0)))
    m = re.search(other, re.sub(r'“[^”]*”', '', text), re.I)   # quotes from the releases stay in the language of the release
    if m: P('page %d carries the other language: "%s"' % (i + 1, m.group(0)))
    if re.search(r'tools/|scripts/|\.github|\.mjs\b|\.yml\b|data\.js\b', text): P('page %d names a repository path' % (i + 1))
    if first.strip().lower() in ('contenido', 'contents'): toc = i
    w, h = page.rect.width, page.rect.height
    for x0, y0, x1, y1, word, *_ in page.get_text('words'):
        if i == 0: continue
        if x1 > w - 38.5: P('page %d: "%s" runs past the right margin (%.0f > %.0f)' % (i + 1, word, x1, w - 40)); break
        if y1 > h - 31 and y0 < h - 28.5: P('page %d: "%s" crosses the footer rule' % (i + 1, word)); break
    if shots:
        page.get_pixmap(dpi=88).save('%s/%s-%02d.png' % (shots, lang, i + 1))
if toc is None: P('no contents page')
else:
    links = [l for l in doc[toc].get_links() if l.get('kind') == pymupdf.LINK_GOTO]
    out['tocLinks'] = len(links)
    if len(links) < 12: P('contents page has %d internal links' % len(links))
    if any(not (0 <= l['page'] < doc.page_count) or l['page'] == toc for l in links): P('a contents link points outside the document or to the contents page itself')
    out['tocTargets'] = sorted(set(l['page'] + 1 for l in links))
out['bytes'] = len(open(path, 'rb').read())
print(json.dumps(out))
`;

const browser = await chromium.launch();
const failures = [];
for (const lang of ['es', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, colorScheme: DARK ? 'dark' : 'light' });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  const page = await ctx.newPage();
  const errs = [], warns = []; page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); if (m.type() === 'warning' && /presentation:/.test(m.text())) warns.push(m.text()); });
  let alert = null; page.on('dialog', async (d) => { alert = d.message(); await d.dismiss(); });
  await page.goto(`${BASE}/mx/consumidor/?lang=${lang}`, { waitUntil: 'load' }); await page.waitForTimeout(900);
  const facts = await page.evaluate(() => ({ kpis: [...document.querySelectorAll('#kpiStrip .kpi .val .n')].map((e) => e.textContent.trim()), points: document.querySelectorAll('#glance .pt').length, theme: document.documentElement.getAttribute('data-theme') }));
  const t0 = Date.now();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }).catch(() => null), page.click('#btnPrint')]);
  await page.waitForTimeout(600);
  const f = (m) => failures.push(`deck ${lang}: ${m}`);
  if (alert) f(`build failed: ${alert}`);
  if (errs.length) f(`script errors: ${errs.slice(0, 3).join(' | ')}`);
  for (const w of warns) f(w);
  // the page is as it was: same theme attribute, button back, no notice left
  const after = await page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), btn: !document.getElementById('btnPrint').disabled, note: (document.getElementById('presentNote') || {}).hidden !== false, charts: Object.keys(window.MXC_UI.charts).length }));
  if (after.theme !== facts.theme) f(`the page's theme was left changed (${facts.theme} -> ${after.theme})`);
  if (!after.btn || !after.note) f('the button or the notice was not restored');
  if (!download) { f('no PDF was produced'); await ctx.close(); continue; }
  const file = join(OUT, `mx-consumidor-${lang}.pdf`); await download.saveAs(file);
  const name = download.suggestedFilename();
  const r = spawnSync('python3', ['-c', PY, file, lang, SHOTS || ''], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.log(`deck ${lang}: saved ${file} (${name}); PyMuPDF layer skipped: ${(r.stderr || '').trim().split('\n').pop()}`); await ctx.close(); continue; }
  const o = JSON.parse(r.stdout);
  for (const p of o.problems) f(p);
  if (o.pages < MIN_PAGES) f(`${o.pages} pages (expected at least ${MIN_PAGES})`);
  const flat = o.text.replace(/\s+/g, ' ').replace(/−/g, '-');
  for (const k of facts.kpis) if (!flat.includes(k.replace(/−/g, '-'))) f(`the header figure ${k} is not in the deck`);
  console.log(`deck ${lang}: ${o.pages} pages, ${(o.bytes / 1e6).toFixed(1)} MB, ${o.tocLinks} contents links to pages ${o.tocTargets ? o.tocTargets.join(',') : '-'}, built in ${((Date.now() - t0) / 1000).toFixed(1)} s · ${name}`);
  await ctx.close();
}
// the deep link builds the deck on arrival, in the language it names
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  const page = await ctx.newPage();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }).catch(() => null), page.goto(`${BASE}/mx/consumidor/?present=1&lang=en`, { waitUntil: 'load' })]);
  if (!download) failures.push('deep link ?present=1&lang=en: no PDF was produced');
  else if (!/^Mexican_Consumer_presentation_\d{4}-\d{2}-\d{2}\.pdf$/.test(download.suggestedFilename())) failures.push(`deep link: unexpected file name ${download.suggestedFilename()}`);
  else console.log(`deep link: ${download.suggestedFilename()}`);
  await ctx.close();
}
await browser.close();
if (failures.length) { for (const x of failures) console.log('FAIL ' + x); process.exit(1); }
console.log('decks clean');
