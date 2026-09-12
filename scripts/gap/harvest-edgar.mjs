// Harvests Grupo Aeroportuario del Pacífico (GAP, SEC CIK 1347557) filings for the GAP model.
//
//  1. Every Form 6-K since SINCE whose document is a quarterly-results release or a monthly
//     passenger-traffic release (plus material-event releases since OTHER_SINCE) is downloaded,
//     converted from HTML to pipe-delimited text (tables keep their cell structure) and saved
//     under tools/gap/raw/6k/. These are the primary sources scripts/gap/build-data.mjs parses.
//  2. The XBRL "company facts" for the 20-F annual filings are saved (reduced to fiscal-year
//     entries) as tools/gap/raw/companyfacts.json — the annual FY2015–FY2025 series.
//
// Incremental by default: filings already listed in tools/gap/raw/manifest.json are skipped.
// Pass --full to re-download everything (e.g. after changing the classifier).
//
// Runs on GitHub Actions (ubuntu-latest, Node 20+ with global fetch). SEC fair-access policy:
// stay under 10 requests/second and send a descriptive User-Agent (override with SEC_USER_AGENT).

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
const UA = process.env.SEC_USER_AGENT
  || 'fnam-debt-monitor/1.0 (gap-refresh@users.noreply.github.com; https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const FULL = process.argv.includes('--full');
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
    lastStatus = `${res.status} ${(await res.text()).replace(/\s+/g, ' ').slice(0, 160)}`;
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
    if (text.length < 2500 && cls !== 'results' && cls !== 'traffic') cls = 'cover';
    if (cls === 'other' && f.filingDate < OTHER_SINCE) cls = 'skip';
    const doc = { name, url, class: cls, chars: text.length };
    if (cls === 'results' || cls === 'traffic' || cls === 'other') {
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

async function main() {
  await mkdir(SIX_K_DIR, { recursive: true });
  const manifest = await loadManifest();
  const known = new Set(manifest.filings.map((f) => f.accession));
  const listing = await listSixKs();
  console.log(`${listing.name}: ${listing.filings.length} Form 6-K filings since ${SINCE}; ${known.size} already harvested`);
  const results = [...manifest.filings];
  let fetched = 0;
  for (const f of listing.filings) {
    if (known.has(f.accession)) continue;
    const r = await harvestFiling(f);
    results.push(r);
    fetched++;
    const kept = r.docs.filter((d) => d.path).map((d) => `${d.class}:${d.name}`).join(', ');
    console.log(`${f.filingDate} ${f.accession} ${kept || '(nothing kept)'}${r.error ? ' ERROR ' + r.error : ''}`);
  }
  results.sort((a, b) => a.filingDate.localeCompare(b.filingDate) || a.accession.localeCompare(b.accession));
  const summary = { results: 0, traffic: 0, other: 0 };
  for (const r of results) for (const d of r.docs) if (d.path) summary[d.class]++;
  const conceptCount = await harvestCompanyFacts();
  await writeFile(MANIFEST, JSON.stringify({
    cik: CIK, entity: listing.name, tickers: listing.tickers, exchanges: listing.exchanges,
    since: SINCE, otherSince: OTHER_SINCE, updatedAt: new Date().toISOString(),
    kept: summary, companyFactsConcepts: conceptCount, filings: results,
  }, null, 1), 'utf8');
  console.log(`Fetched ${fetched} new filings. Kept on disk: ${JSON.stringify(summary)}. Company-facts concepts: ${conceptCount}.`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
