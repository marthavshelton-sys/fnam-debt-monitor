// Harvests Grupo Aeroportuario del Pacífico's press releases for the GAP model.
//
// Every quarterly-results release and monthly passenger-traffic release since SINCE (plus
// material-event releases since OTHER_SINCE) is downloaded, converted from HTML to
// pipe-delimited text (tables keep their cell structure) and saved under tools/gap/raw/6k/.
// These are the primary sources scripts/gap/build-data.mjs parses.
//
// Sources (--source gnw|sec, default gnw):
//   gnw  GlobeNewswire, the wire GAP distributes every release through (EN and ES). Listing
//        via the keyword search pages, then each release page. Works from GitHub runners.
//   sec  SEC EDGAR Form 6-K filings (CIK 1347557) + XBRL company facts for the 20-F annual
//        series. Identical content, but EDGAR blocks GitHub-hosted runner networks as
//        "undeclared automated tools", so use this from a workstation with SEC_USER_AGENT set
//        to "<name> <contact email>" (SEC fair-access policy: <= 10 requests/second).
//
// Incremental by default: releases already listed in tools/gap/raw/manifest.json are skipped.
// Pass --full to re-download everything (e.g. after changing the classifier).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CIK = '0001347557';
const CIK_INT = String(Number(CIK));
const SINCE = '2016-01-01';        // 4Q15 results (FY2015) were filed in Feb 2016
const OTHER_SINCE = '2024-01-01';  // material events (dividends, CBX, FIBRA GAP, MDP, debt) from here on
const RAW_DIR = new URL('../../tools/gap/raw/', import.meta.url);
const SIX_K_DIR = new URL('6k/', RAW_DIR);
const MANIFEST = new URL('manifest.json', RAW_DIR);
// SEC EDGAR rejects requests whose User-Agent does not identify the requester with a contact
// address. Set the SEC_USER_AGENT repository secret to "<org or site> <contact email>".
const UA = process.env.SEC_USER_AGENT || 'fnam-debt-monitor gap-refresh@users.noreply.github.com';
const FULL = process.argv.includes('--full');
const SOURCE = (process.argv.find((a) => a.startsWith('--source=')) || '--source=gnw').split('=')[1];
const GNW_UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const GNW_DELAY_MS = 450;
const DELAY_MS = 130; // ~7.5 req/s, under the SEC's 10 req/s ceiling

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

async function secFetch(url, { json = false } = {}) {
  let lastStatus = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const wait = lastRequest + DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': json ? 'application/json' : 'text/html,*/*', 'Accept-Encoding': 'gzip, deflate' } });
    if (res.ok) return json ? res.json() : res.text();
    if (res.status === 404) throw new Error(`${url} -> 404`);
    lastStatus = `${res.status} ${htmlToText(await res.text()).replace(/\s+/g, ' ').slice(0, 400)}`;
    // 403/429 = throttled or UA rejected; back off and retry
    await sleep(1500 * attempt);
  }
  throw new Error(`${url} -> gave up after 4 attempts (last: ${lastStatus})`);
}

// ---------- HTML -> structured text ----------
const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bull: '•', eacute: 'é', iacute: 'í', oacute: 'ó', aacute: 'á', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', trade: '™', reg: '®', copy: '©', sect: '§', middot: '·', hellip: '…', deg: '°' };
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}
export function htmlToText(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|table|tbody|thead|section|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = decodeEntities(s).replace(/ /g, ' ');
  const lines = s.split('\n').map((l) => l.replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\|\s*/g, ' | ').replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim());
  const out = [];
  for (const l of lines) {
    if (l === '' && out.length && out[out.length - 1] === '') continue; // collapse blank runs
    out.push(l);
  }
  return out.join('\n').trim() + '\n';
}

// ---------- classification ----------
const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
function classify(text) {
  const head = text.slice(0, 6000).toLowerCase();
  if (/results\s+for\s+the\s+(first|second|third|fourth)\s+quarter/.test(head)
    || /(first|second|third|fourth)[\s-]+quarter\s+(of\s+)?20\d\d\s+results/.test(head)
    || /resultados\s+del\s+(primer|segundo|tercer|cuarto)\s+trimestre/.test(head)
    || /results\s+for\s+the\s+(twelve|nine|six|three)[\s-]+month/.test(head)) return 'results';
  if (/announces\s+(growth\s+)?guidance|guidance\s+for\s+(the\s+)?full\s+year|gu[ií]a\s+de\s+crecimiento/.test(head)) return 'guidance';
  const title = head.split('\n')[0];
  if (/(dividend|cross border|cbx|fibra|master development|programa maestro|maximum tariff|tarifa m[aá]xima|certificados burs|bond|notes|credit facilit|rating|calificaci|concession|concesi[oó]n|shareholders.? meeting|asamblea|buyback|repurchase|tender|share capital|capital stock|acquisition|adquisici|business combination|merger)/.test(title) && !/passenger\s+traffic|tr[aá]fico/.test(title)) return 'other';
  if (/passenger\s+traffic/.test(head) && new RegExp(`\\b(${MONTHS})\\b`).test(head)) return 'traffic';
  if (/tr[aá]fico\s+de\s+pasajeros/.test(head)) return 'traffic';
  if (/(dividend|cross border|cbx|fibra|master development|programa maestro|maximum tariff|tarifa m[aá]xima|certificados burs|bond|notes|credit facility|rating|calificaci|concession|concesi[oó]n|shareholders.? meeting|asamblea|buyback|repurchase|tender|share capital|capital stock|acquisition|adquisici)/.test(head)) return 'other';
  return 'skip';
}

// ---------- main ----------
async function loadManifest() {
  if (FULL || !existsSync(MANIFEST)) return { filings: [] };
  return JSON.parse(await readFile(MANIFEST, 'utf8'));
}

async function listSixKs() {
  const sub = await secFetch(`https://data.sec.gov/submissions/CIK${CIK}.json`, { json: true });
  const pages = [sub.filings.recent];
  for (const f of sub.filings.files || []) {
    pages.push(await secFetch(`https://data.sec.gov/submissions/${f.name}`, { json: true }));
  }
  const out = [];
  for (const p of pages) {
    for (let i = 0; i < p.accessionNumber.length; i++) {
      if (p.form[i] !== '6-K') continue;
      if (p.filingDate[i] < SINCE) continue;
      out.push({
        accession: p.accessionNumber[i],
        filingDate: p.filingDate[i],
        reportDate: p.reportDate?.[i] || null,
        primaryDocument: p.primaryDocument[i],
        description: p.primaryDocDescription?.[i] || '',
      });
    }
  }
  out.sort((a, b) => a.filingDate.localeCompare(b.filingDate) || a.accession.localeCompare(b.accession));
  return { name: sub.name, tickers: sub.tickers, exchanges: sub.exchanges, filings: out };
}

async function harvestFiling(f) {
  const accNoDash = f.accession.replace(/-/g, '');
  const base = `https://www.sec.gov/Archives/edgar/data/${CIK_INT}/${accNoDash}/`;
  let index;
  try {
    index = await secFetch(base + 'index.json', { json: true });
  } catch (e) {
    return { ...f, docs: [], error: String(e.message) };
  }
  const docs = [];
  for (const item of index.directory?.item || []) {
    const name = item.name;
    if (!/\.(htm|html|txt)$/i.test(name)) continue;
    if (/-index\.html?$/i.test(name) || /^R\d+\.htm$/i.test(name) || /FilingSummary/i.test(name)) continue;
    const url = base + name;
    let html;
    try { html = await secFetch(url); } catch (e) { docs.push({ name, url, error: String(e.message) }); continue; }
    const text = htmlToText(html);
    let cls = classify(text);
    if (text.length < 2500 && cls !== 'results' && cls !== 'traffic' && cls !== 'guidance') cls = 'cover';
    if (cls === 'other' && f.filingDate < OTHER_SINCE) cls = 'skip';
    const doc = { name, url, class: cls, chars: text.length };
    if (cls === 'results' || cls === 'traffic' || cls === 'other' || cls === 'guidance') {
      const file = `${f.filingDate}_${accNoDash}_${name.replace(/\.(htm|html|txt)$/i, '')}.txt`;
      const header = `# source: ${url}\n# filed: ${f.filingDate}\n# class: ${cls}\n\n`;
      await writeFile(new URL(file, SIX_K_DIR), header + text, 'utf8');
      doc.path = `tools/gap/raw/6k/${file}`;
    }
    docs.push(doc);
  }
  return { ...f, docs };
}

async function harvestCompanyFacts() {
  const facts = await secFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`, { json: true });
  const reduced = { cik: facts.cik, entityName: facts.entityName, fetchedAt: new Date().toISOString(), facts: {} };
  for (const [taxonomy, concepts] of Object.entries(facts.facts || {})) {
    for (const [concept, body] of Object.entries(concepts)) {
      const units = {};
      for (const [unit, entries] of Object.entries(body.units || {})) {
        const keep = entries
          .filter((e) => e.fy >= 2014 && /^(20-F|20-F\/A|10-K)$/.test(e.form))
          .map(({ end, start, val, fy, fp, form, filed, frame }) => ({ end, start, val, fy, fp, form, filed, frame }));
        if (keep.length) units[unit] = keep;
      }
      if (Object.keys(units).length) reduced.facts[`${taxonomy}:${concept}`] = { label: body.label, description: body.description, units };
    }
  }
  await writeFile(new URL('companyfacts.json', RAW_DIR), JSON.stringify(reduced, null, 1), 'utf8');
  return Object.keys(reduced.facts).length;
}

// ---------- GlobeNewswire ----------
let lastGnw = 0;
async function gnwFetch(url) {
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const wait = lastGnw + GNW_DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastGnw = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': GNW_UA, Accept: 'text/html,*/*', 'Accept-Language': 'en,es;q=0.8' } });
    if (res.ok) return res.text();
    if (res.status === 404) throw new Error(`${url} -> 404`);
    lastErr = `${res.status}`;
    await sleep(2000 * attempt);
  }
  throw new Error(`${url} -> gave up (last ${lastErr})`);
}

const GNW_LISTINGS = [
  'https://www.globenewswire.com/en/search/keyword/Grupo%20Aeroportuario%20del%20Pacifico?page=',
  'https://www.globenewswire.com/search/keyword/Grupo%20Aeroportuario%20del%20Pacifico?page=',
];
const RELEASE_RE = /\/news-release\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)\/(\d+)\/(en|es|[a-z]{2})\/[^"'\s<>]+/g;

async function gnwList() {
  const seen = new Map();
  for (const base of GNW_LISTINGS) {
    let empty = 0;
    for (let page = 1; page <= 120; page++) {
      let html;
      try { html = await gnwFetch(base + page); } catch (e) { console.error(`listing ${base}${page}: ${e.message}`); break; }
      let found = 0, oldest = '9999';
      for (const m of html.matchAll(RELEASE_RE)) {
        const [path, y, mo, d, id, , lang] = m;
        const date = `${y}-${mo}-${d}`;
        const url = 'https://www.globenewswire.com' + path.replace(/&amp;/g, '&');
        if (!seen.has(id + lang)) { seen.set(id + lang, { id, lang, date, url }); found++; }
        if (date < oldest) oldest = date;
      }
      if (page === 1) console.log(`listing ${base}1: ${found} release links${found ? '' : ' — page head: ' + htmlToText(html).slice(0, 300).replace(/\n/g, ' ')}`);
      if (found === 0) { if (++empty >= 2) break; } else empty = 0;
      if (oldest < SINCE) break;
    }
    if (seen.size) break; // first listing variant that works is enough
  }
  const out = [...seen.values()].filter((r) => r.date >= SINCE);
  out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return out;
}

function extractArticle(html) {
  // GlobeNewswire wraps the release body in an article element; fall back to the whole page.
  const m = html.match(/<div[^>]+class="[^"]*\bmain-body-container\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]+class="[^"]*\b(?:article-footer|tag-list|related)\b|<footer)/i)
    || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1];
  return { body: m ? m[1] : html, title: decodeEntities(title).trim() };
}

// ---------- PR Newswire (GAP's wire before Jan-2019; needed for the FY2015–FY2018 4Q releases) ----------
const PRN_LISTING = 'https://www.prnewswire.com/search/news/?keyword=%22Grupo%20Aeroportuario%20del%20Pacifico%22&pagesize=100&page=';
const PRN_RE = /\/news-releases\/[a-z0-9-]*grupo-aeroportuario[a-z0-9-]*-\d{6,}\.html/g;
const MONTH_IDX = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12' };
function dateFromText(text) {
  const m = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),\s+(20\d\d)/);
  return m ? `${m[3]}-${MONTH_IDX[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}` : null;
}
async function prnList() {
  const seen = new Map();
  for (let page = 1; page <= 12; page++) {
    let html;
    try { html = await gnwFetch(PRN_LISTING + page); } catch (e) { console.error(`PRN listing page ${page}: ${e.message}`); break; }
    let found = 0;
    for (const m of html.matchAll(PRN_RE)) {
      const path = m[0];
      const id = (path.match(/-(\d{6,})\.html$/) || [])[1];
      if (!seen.has(id)) { seen.set(id, { id, lang: 'en', url: 'https://www.prnewswire.com' + path }); found++; }
    }
    if (page === 1) console.log(`PRN listing: ${found} links${found ? '' : ' — page head: ' + htmlToText(html).slice(0, 300).replace(/\n/g, ' ')}`);
    if (found === 0) break;
  }
  return [...seen.values()];
}
async function harvestPrn(manifest, results, known) {
  let fetched = 0;
  for (const r of await prnList()) {
    if (known.has(r.url)) continue;
    let html;
    try { html = await gnwFetch(r.url); } catch (e) { results.push({ source: 'prn', ...r, filingDate: '0000-00-00', error: e.message, docs: [] }); continue; }
    const body = (html.match(/<section[^>]+class="[^"]*release-body[^"]*"[^>]*>([\s\S]*?)<\/section>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || [, html])[1];
    const title = decodeEntities((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1]).trim();
    const text = htmlToText(body);
    const date = dateFromText(text.slice(0, 3000)) || dateFromText(html.slice(0, 20000)) || '0000-00-00';
    if (date !== '0000-00-00' && date >= '2019-01-01') { known.add(r.url); continue; } // GlobeNewswire era, already covered
    let cls = classify(title + '\n' + text);
    if (cls === 'other') cls = 'skip';
    const entry = { source: 'prn', id: r.id, lang: 'en', filingDate: date, title, url: r.url, docs: [] };
    if (cls !== 'skip') {
      const file = `${date}_prn${r.id}_en.txt`;
      const header = `# source: ${r.url}\n# title: ${title}\n# date: ${date}\n# lang: en\n# class: ${cls}\n\n`;
      await writeFile(new URL(file, SIX_K_DIR), header + text, 'utf8');
      entry.docs.push({ name: file, url: r.url, class: cls, chars: text.length, path: `tools/gap/raw/6k/${file}` });
    }
    results.push(entry);
    known.add(r.url);
    fetched++;
    console.log(`${date} prn ${cls.padEnd(7)} ${title.slice(0, 90)}`);
  }
  return fetched;
}

async function harvestGnw(manifest) {
  const known = new Set(manifest.filings.filter((f) => f.url).map((f) => f.url));
  const listing = await gnwList();
  console.log(`GlobeNewswire: ${listing.length} releases since ${SINCE}; ${known.size} already harvested`);
  const results = [...manifest.filings];
  let fetched = 0;
  for (const r of listing) {
    if (known.has(r.url)) continue;
    let html;
    try { html = await gnwFetch(r.url); } catch (e) { results.push({ ...r, error: e.message, docs: [] }); continue; }
    const { body, title } = extractArticle(html);
    const text = htmlToText(body);
    let cls = classify(title + '\n' + text);
    if (cls === 'other' && r.date < OTHER_SINCE) cls = 'skip';
    const entry = { source: 'gnw', id: r.id, lang: r.lang, filingDate: r.date, title, url: r.url, docs: [] };
    if (cls !== 'skip') {
      const file = `${r.date}_gnw${r.id}_${r.lang}.txt`;
      const header = `# source: ${r.url}\n# title: ${title}\n# date: ${r.date}\n# lang: ${r.lang}\n# class: ${cls}\n\n`;
      await writeFile(new URL(file, SIX_K_DIR), header + text, 'utf8');
      entry.docs.push({ name: file, url: r.url, class: cls, chars: text.length, path: `tools/gap/raw/6k/${file}` });
    }
    results.push(entry);
    fetched++;
    console.log(`${r.date} ${r.lang} ${cls.padEnd(7)} ${title.slice(0, 90)}`);
  }
  // Pre-2019 releases (PR Newswire) — only needed once; skipped when the manifest already has them.
  if (FULL || !manifest.filings.some((f) => f.source === 'prn')) {
    try { fetched += await harvestPrn(manifest, results, known); } catch (e) { console.error(`PRN harvest failed: ${e.message}`); }
  }
  return { results, fetched, entity: 'Grupo Aeroportuario del Pacífico, S.A.B. de C.V.' };
}

async function harvestSec(manifest) {
  const known = new Set(manifest.filings.map((f) => f.accession).filter(Boolean));
  const listing = await listSixKs();
  console.log(`${listing.name}: ${listing.filings.length} Form 6-K filings since ${SINCE}; ${known.size} already harvested`);
  const results = [...manifest.filings];
  let fetched = 0;
  for (const f of listing.filings) {
    if (known.has(f.accession)) continue;
    const r = await harvestFiling(f);
    results.push({ source: 'sec', ...r });
    fetched++;
    const kept = r.docs.filter((d) => d.path).map((d) => `${d.class}:${d.name}`).join(', ');
    console.log(`${f.filingDate} ${f.accession} ${kept || '(nothing kept)'}${r.error ? ' ERROR ' + r.error : ''}`);
  }
  const conceptCount = await harvestCompanyFacts();
  return { results, fetched, entity: listing.name, conceptCount };
}

async function main() {
  await mkdir(SIX_K_DIR, { recursive: true });
  const manifest = await loadManifest();
  const { results, fetched, entity, conceptCount } = SOURCE === 'sec' ? await harvestSec(manifest) : await harvestGnw(manifest);
  results.sort((a, b) => a.filingDate.localeCompare(b.filingDate) || String(a.id || a.accession).localeCompare(String(b.id || b.accession)));
  const summary = { results: 0, traffic: 0, other: 0 };
  for (const r of results) for (const d of r.docs || []) if (d.path) summary[d.class] = (summary[d.class] || 0) + 1;
  await writeFile(MANIFEST, JSON.stringify({
    entity, source: SOURCE, since: SINCE, otherSince: OTHER_SINCE, updatedAt: new Date().toISOString(),
    kept: summary, companyFactsConcepts: conceptCount ?? manifest.companyFactsConcepts ?? null, filings: results,
  }, null, 1), 'utf8');
  console.log(`Fetched ${fetched} new releases. Kept on disk: ${JSON.stringify(summary)}.`);
  if (fetched === 0 && results.length === 0) { console.error('Nothing harvested — listing returned no releases.'); process.exit(1); }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
