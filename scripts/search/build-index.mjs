#!/usr/bin/env node
// Builds the site search index: site/assets/search-index.js (window.FNAM_SEARCH_INDEX), read by the search on the
// landing page (site/assets/search.js).
//
//   node scripts/search/build-index.mjs                 build and write the index
//   node scripts/search/build-index.mjs --check         build, compare with the committed index, exit 1 if they differ
//   node scripts/search/build-index.mjs --dump x.json   also write the raw extraction (debugging)
//
// How: serves site/ on a local port, opens every public page in headless Chromium in Spanish and in English (?lang=)
// and reads what a reader sees there (scripts/search/extract-page.js): the page title, every section heading with
// the anchor that reaches it, the macro dashboards' ?view= sections, sub-headings and table row labels as keywords,
// the cards and footer links that describe other pages, and the landing page's PDF links. Headings composed by
// script (the Oracle model, the Hyperscaler Hub) are read after they render; hidden sections are skipped.
//
// Pages are discovered: every site/**/index.html except the landing page's own entry, redirect stubs (meta refresh),
// pages carrying <meta name="fnam-search" content="exclude"> and the paths listed under "exclude" in
// tools/search/aliases.json. The owner-only quality.html pages and 404.html are not index pages, so never indexed.
// Curated identifiers (tickers, company names) come from tools/search/aliases.json; each must appear in the text of
// its page or the build fails. The build also fails when a page renders no title, so a broken page is never indexed
// as empty. Runbook: tools/search/README.md.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = join(ROOT, 'site');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); if (i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]; const e = process.argv.find((a) => a.startsWith(`--${n}=`)); return e ? e.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes('--' + n);
const OUT = arg('out', join(SITE, 'assets', 'search-index.js'));
const DUMP = arg('dump', null);
const CHECK = flag('check');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'tools', 'search', 'aliases.json'), 'utf8'));
const EXTRACT = readFileSync(join(ROOT, 'scripts', 'search', 'extract-page.js'), 'utf8');
const LANGS = ['es', 'en'];

// ---------- discovery ----------
function discover() {
  const found = [];
  (function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) { if (name !== 'assets' && name !== 'status' && !name.startsWith('.')) walk(f); continue; }
      if (name !== 'index.html') continue;
      const rel = relative(SITE, dirname(f)).split(sep).join('/');
      const path = rel ? '/' + rel + '/' : '/';
      const html = readFileSync(f, 'utf8');
      if (/<meta[^>]+http-equiv=["']?refresh/i.test(html)) continue; // redirect stub (e.g. /macro/en/)
      if ((CONFIG.exclude || []).includes(path)) continue;
      found.push(path);
    }
  })(SITE);
  return found;
}

// ---------- crawl ----------
async function crawl(base, paths) {
  const browser = await chromium.launch();
  const results = new Map(); // path -> { es, en }
  const problems = [];
  const jobs = [];
  for (const p of paths) for (const lang of LANGS) jobs.push({ p, lang });
  async function worker() {
    for (let job; (job = jobs.shift());) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      try {
        await page.goto(`${base}${job.p}?lang=${job.lang}`, { waitUntil: 'load', timeout: 90000 });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(job.p.includes('macro') ? 1500 : 700);
        const data = await page.evaluate(`(() => {\n${EXTRACT}\nreturn extractPage(${JSON.stringify({ lang: job.lang })});\n})()`);
        if (!data.lang.toLowerCase().startsWith(job.lang)) problems.push(`${job.p} (${job.lang}): the page opened in "${data.lang}"`);
        if (errors.length) console.warn(`  note: ${job.p} (${job.lang}) script errors: ${errors.slice(0, 2).join(' | ').slice(0, 200)}`);
        const r = results.get(job.p) || {}; r[job.lang] = data; results.set(job.p, r);
      } catch (e) {
        problems.push(`${job.p} (${job.lang}): ${e.message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  await browser.close();
  return { results, problems };
}

// ---------- normalization (the client applies the same rule) ----------
const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const shortTitle = (t) => String(t || '').split(/\s+[·|—–]\s+/)[0].trim();
const both = (es, en) => [es || en || '', en || es || ''];
const uniq = (arr) => { const seen = new Set(); return arr.filter((x) => { const k = norm(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
// Keywords are stored as one bag of distinct normalized words per entry (Spanish and English together, the order in which
// they appear on the page, headings first): matching is word by word, so phrases add nothing but bytes. Words that are
// already in the entry's title, stopwords, and tokens carrying a digit (a period, a percentage, a date: so a data refresh
// that changes a figure inside a heading does not change the index) are left out.
const MAX_WORDS = 600;
const STOP = new Set(('de del la las el los lo y e o u en a al por para con sin un una unos unas que se su sus como mas ' +
  'the of and or in on to for by with an as at from its is are vs per').split(' '));
// Month names and abbreviations (table period columns) say nothing about a section.
const MONTHS = new Set(('ene feb mar abr may jun jul ago sep sept oct nov dic jan apr aug dec enero febrero marzo abril mayo junio julio agosto ' +
  'septiembre setiembre octubre noviembre diciembre january february march april june july august september october november december').split(' '));
const words = (s) => norm(s).split(' ').filter((w) => w && !/\d/.test(w));
const bagOf = (lists, titles) => {
  const skip = new Set(); for (const t of titles || []) for (const w of words(t)) skip.add(w);
  const seen = new Set(); const out = [];
  for (const list of lists) for (const s of list || []) {
    for (const w of words(s)) {
      if (w.length < 2 || STOP.has(w) || MONTHS.has(w) || skip.has(w) || seen.has(w)) continue;
      seen.add(w); out.push(w);
      if (out.length >= MAX_WORDS) return out.join(' ');
    }
  }
  return out.join(' ');
};

async function main() {
  const paths = discover();
  const server = await serveSite(SITE);
  const base = server.base;
  console.log(`search index: rendering ${paths.length} pages in ${LANGS.join(' and ')} …`);
  const t0 = Date.now();
  const { results, problems } = await crawl(base, paths);
  server.close();
  console.log(`  rendered in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (DUMP) writeFileSync(DUMP, JSON.stringify(Object.fromEntries([...results].map(([p, r]) => [p, { es: { ...r.es, text: (r.es && r.es.text || '').length }, en: { ...r.en, text: (r.en && r.en.text || '').length } }])), null, 1));

  const fail = [...problems];
  const pages = paths.filter((p) => { const r = results.get(p); return !(r && ((r.es && r.es.exclude) || (r.en && r.en.exclude))); });
  for (const p of pages) { const r = results.get(p) || {}; for (const l of LANGS) if (!r[l]) fail.push(`${p}: no ${l} render`); }

  // Cards and short links that describe each page. The landing page's cards are the site's own names for its dashboards
  // and hubs; the hubs' cards (airports, Mauricio, other companies, the Hyperscaler Hub) name the pages under them.
  const landing = new Map(); const hubCards = new Map(); const shortNames = new Map(); const parent = new Map();
  const home = results.get('/');
  const hubs = new Set(home && home.es ? home.es.cards.map((c) => c.href.split(/[?#]/)[0]) : []);
  const sources = ['/', ...pages.filter((p) => hubs.has(p)), ...pages.filter((p) => p !== '/' && !hubs.has(p))];
  for (const src of sources) {
    const r = results.get(src); if (!r || !r.es || !r.en) continue;
    for (const l of LANGS) {
      for (const c of r[l].cards) {
        const target = src === '/' ? landing : hubCards;
        const cur = target.get(c.href) || {};
        if (!cur[l]) { cur[l] = c; target.set(c.href, cur); }
        const pathOnly = c.href.split(/[?#]/)[0];
        if (src !== '/' && pathOnly !== src && !parent.has(pathOnly) && !hubs.has(pathOnly)) parent.set(pathOnly, src);
      }
      for (const a of r[l].links) {
        const s = shortNames.get(a.href) || { es: [], en: [] }; s[l].push(a.text); shortNames.set(a.href, s);
      }
    }
  }
  // Output order: the landing page's cards, then each hub's cards (depth first), then any page no card links to.
  const ordered = [];
  const visit = (p) => {
    if (ordered.includes(p) || !pages.includes(p)) return;
    ordered.push(p);
    const r = results.get(p); if (!r || !r.es) return;
    for (const c of r.es.cards) visit(c.href.split(/[?#]/)[0]);
  };
  visit('/');
  for (const p of pages) visit(p);


  // A page's name: the landing page's card, else the page's own <title> (its first part), else a hub card, else its h1.
  // (Model and module h1s are composed from data; the <title> is not.)
  const pageTitle = new Map();
  for (const p of ordered) {
    if (p === '/') continue;
    const r = results.get(p); if (!r || !r.es || !r.en) continue;
    const lc = landing.get(p) || {}; const hc = hubCards.get(p) || {};
    const t = LANGS.map((l) => (lc[l] && lc[l].title) || shortTitle(r[l].title) || (hc[l] && hc[l].title) || r[l].h1);
    if (!t[0] || !t[1]) fail.push(`${p}: no title in ${!t[0] ? 'es' : 'en'}`);
    pageTitle.set(p, both(t[0], t[1]));
  }

  const entries = [];
  for (const p of ordered) {
    const r = results.get(p); if (!r || !r.es || !r.en) continue;
    const isHome = p === '/';
    if (!isHome) {
      const lc = landing.get(p) || {}; const hc = hubCards.get(p) || {};
      const card = (l) => lc[l] || hc[l] || {};
      const e = { k: 'page', u: p, t: pageTitle.get(p) };
      const par = parent.get(p);
      if (par && pageTitle.has(par)) e.c = pageTitle.get(par);
      else if (lc.es) e.c = LANGS.map((l) => [lc[l] && lc[l].group, lc[l] && lc[l].kicker].filter(Boolean).join(' · '));
      const desc = LANGS.map((l) => [card(l).name, card(l).desc].filter(Boolean).join(' · '));
      if (desc[0] || desc[1]) e.d = both(desc[0], desc[1]);
      const sn = shortNames.get(p) || { es: [], en: [] };
      e.w = bagOf(LANGS.map((l) => [r[l].h1, shortTitle(r[l].title), r[l].title, ...sn[l], hc[l] && hc[l].title, card(l).kicker, card(l).name, r[l].desc]), e.t);
      if (!e.w) delete e.w;
      entries.push(e);
    }
    // Sections (anchors), in page order; the landing page keeps only its own panels (its card grids are the pages).
    const enById = new Map(r.en.sections.map((s) => [s.id, s]));
    for (const s of r.es.sections) {
      const en = enById.get(s.id);
      if (isHome && s.hasCards) continue;
      if (!en) console.warn(`  note: ${p}#${s.id} has no English counterpart`);
      const e = { k: 'section', u: p + '#' + s.id, p, t: both(s.title, en && en.title) };
      if (!isHome) e.c = pageTitle.get(p);
      e.w = bagOf([[s.nav, en && en.nav], s.kw, (en && en.kw) || []], e.t);
      if (!e.w) delete e.w;
      entries.push(e);
    }
    for (const s of r.en.sections) if (!r.es.sections.some((x) => x.id === s.id)) console.warn(`  note: ${p}#${s.id} has no Spanish counterpart`);
    // Macro dashboards: one entry per ?view=.
    const enViews = new Map(r.en.views.map((v) => [v.id, v]));
    for (const v of r.es.views) {
      const en = enViews.get(v.id);
      const u = `${p}?view=${v.id}`;
      const vc = landing.get(u) || {};
      const e = { k: 'view', u, p, t: both(v.title, en && en.title), c: [`${pageTitle.get(p)[0]} › ${v.group}`, `${pageTitle.get(p)[1]} › ${(en && en.group) || v.group}`], g: both(v.group, en && en.group) };
      if (vc.es && vc.es.desc) e.d = both(vc.es.desc, vc.en && vc.en.desc);
      e.w = bagOf([[vc.es && vc.es.title, vc.en && vc.en.title, v.group, en && en.group], v.kw, (en && en.kw) || []], e.t);
      entries.push(e);
    }
    // Board presentations (landing page): the model page builds the PDF on arrival.
    if (isHome) {
      r.es.decks.forEach((d, i) => {
        const en = r.en.decks[i] || {};
        const target = pageTitle.get(d.base) || [];
        entries.push({ k: 'deck', u: `${d.base}?present=1`, p: d.base, t: both(d.text, en.text), c: both(d.label, en.label), w: bagOf([['PDF presentación consejo presentation board deck', target[0], target[1]]], [d.text, en.text]) });
      });
    }
  }

  // Curated terms (tools/search/aliases.json → entries): each address must be an entry of the index and each term must
  // appear in the text of its page, in either language.
  const byUrl = new Map(entries.map((e) => [e.u, e]));
  for (const [u, cfg] of Object.entries(CONFIG.entries || {})) {
    const e = byUrl.get(u);
    if (!e) { fail.push(`aliases.json: ${u} is not a page, section or view of the site`); continue; }
    const r = results.get(u.split(/[?#]/)[0]) || {};
    const bag = ' ' + norm(((r.es && r.es.text) || '') + ' ' + ((r.en && r.en.text) || '')) + ' ';
    for (const term of [...(cfg.ids || []), ...(cfg.aliases || [])]) {
      if (!norm(term) || !bag.includes(' ' + norm(term) + ' ')) fail.push(`aliases.json: "${term}" (${u}) does not appear on ${u.split(/[?#]/)[0]}`);
    }
    if (cfg.ids && cfg.ids.length) e.id = cfg.ids.slice();
    if (cfg.aliases && cfg.aliases.length) e.a = cfg.aliases.slice();
  }

  // Sanity: a page with no title, or an index far smaller than the site, is a broken build; keep the last index.
  const nPages = entries.filter((e) => e.k === 'page').length;
  if (nPages < pages.length - 1) fail.push(`only ${nPages} of ${pages.length - 1} pages produced an entry`);
  for (const e of entries) if (!e.t[0] || !e.t[1]) fail.push(`${e.u}: empty title`);
  if (fail.length) {
    console.error('search index NOT written:\n  - ' + [...new Set(fail)].join('\n  - '));
    process.exit(1);
  }

  const head = '// FNAM site search: every page, section and macro view in Spanish and English, read from the pages as they render.\n// Generated; do not edit by hand.\n';
  const body = 'window.FNAM_SEARCH_INDEX = {"v":1,"entries":[\n' + entries.map((e) => JSON.stringify(e)).join(',\n') + '\n]};\n';
  const js = head + body;
  const counts = ['page', 'section', 'view', 'deck'].map((k) => `${entries.filter((e) => e.k === k).length} ${k}s`).join(', ');
  if (CHECK) {
    const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (cur !== js) { console.error(`search index is out of date (${counts}); run node scripts/search/build-index.mjs`); process.exit(1); }
    console.log(`search index up to date: ${counts}`);
    return;
  }
  const changed = !existsSync(OUT) || readFileSync(OUT, 'utf8') !== js;
  if (changed) writeFileSync(OUT, js);
  console.log(`search index ${changed ? 'written' : 'unchanged'}: ${counts}, ${(js.length / 1024).toFixed(0)} KB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
