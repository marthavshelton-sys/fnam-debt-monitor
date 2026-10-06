// FactSet daily closes as the share-price authority of the airport models (GAP, ASUR, OMA; owner, 2026-10-06:
// every share price on the pages from FactSet, as of the last completed close).
//
//   node scripts/lib/factset-prices.mjs ingest [--pull DIR] [--out FILE] [--date YYYY-MM-DD] [--replace]
//       Reads every tools/gap/raw/factset/pull/prices-daily-*.json (raw results of FactSet_GlobalPrices prices,
//       frequency D, fields price + volume: the *-local files in the listing currency, the *-ads files in USD) and
//       merges the closes into the committed file tools/gap/raw/factset/prices.json (new dates added, overlapping
//       dates replaced by the newer pull, older history kept; --replace starts the file afresh).
//   node scripts/lib/factset-prices.mjs apply [--prices FILE]
//       Overlays the FactSet closes on site/gap, site/asur and site/oma data/market.js in place (the nightly routine
//       runs it right after the pull, so the header shows FactSet's close without waiting for the next Actions run).
//
// The market fetchers (scripts/gap/fetch-market.mjs, scripts/airports/fetch-market.mjs) import overlayFactSet() and
// apply the same overlay on every run: FactSet's close wins on every date it carries; the runner's Yahoo/Stooq series
// only fills the dates FactSet has not posted yet (a close the 22:40 UTC run has seen before the 23:52 UTC routine)
// and the history before FactSet's file starts. The S&P/BMV IPC (^MXX) stays on Yahoo: the connector rejects index
// ids. Dividends stay on Yahoo's exchange record. Each overlaid series says so in `source` and `provenance`.

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const RAW_DIR = join(ROOT, 'tools/gap/raw/factset');
const PULL_DIR = join(RAW_DIR, 'pull');
export const PRICES_FILE = join(RAW_DIR, 'prices.json');

// FactSet id → the series id the market files use (Yahoo symbols); one listing per line.
export const SERIES = {
  'GAPB-MX': { id: 'GAPB.MX', currency: 'MXN', exchange: 'BMV' },
  'ASURB-MX': { id: 'ASURB.MX', currency: 'MXN', exchange: 'BMV' },
  'OMAB-MX': { id: 'OMAB.MX', currency: 'MXN', exchange: 'BMV' },
  'PAC-US': { id: 'PAC', currency: 'USD', exchange: 'NYSE' },
  'ASR-US': { id: 'ASR', currency: 'USD', exchange: 'NYSE' },
  'OMAB-US': { id: 'OMAB', currency: 'USD', exchange: 'NASDAQ' },
};
const PAGES = [
  { slug: 'gap', prefix: 'GAP', home: 'GAPB.MX' },
  { slug: 'asur', prefix: 'ASUR', home: 'ASURB.MX' },
  { slug: 'oma', prefix: 'OMA', home: 'OMAB.MX' },
];
export const SOURCE_NAME = 'FactSet Global Prices';

const r2 = (x) => Math.round(x * 100) / 100;
const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function args(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const eq = a.indexOf('='); if (eq > 0) { o[a.slice(2, eq)] = a.slice(eq + 1); continue; } const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a); } return o; }

// ---------------------------------------------------------------- ingest
export function ingest({ pull = PULL_DIR, out = PRICES_FILE, date, replace = false } = {}) {
  const runDate = date || todayET();
  const files = existsSync(pull) ? readdirSync(pull).filter((f) => /^prices-daily-.*\.json$/.test(f)).sort() : [];
  if (!files.length) throw new Error(`no prices-daily-*.json in ${pull}`);
  const prev = !replace && existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
  const series = {};
  for (const [fsId, meta] of Object.entries(SERIES)) series[meta.id] = { factsetId: fsId, currency: meta.currency, exchange: meta.exchange, points: new Map((prev && prev.series && prev.series[meta.id] ? prev.series[meta.id].points : []).map((p) => [p[0], p[1]])) };
  let added = 0, replaced = 0;
  const pulled = Object.fromEntries(Object.keys(SERIES).map((k) => [k, 0]));
  const disagree = Object.fromEntries(Object.keys(SERIES).map((k) => [k, { overlap: 0, differ: 0 }]));
  for (const f of files) {
    const txt = readFileSync(join(pull, f), 'utf8');
    const rows = JSON.parse(txt.slice(txt.indexOf('{'))).data;
    if (!Array.isArray(rows)) throw new Error(`${f}: no data array`);
    for (const x of rows) {
      const meta = SERIES[x.requestId]; if (!meta) continue;
      if (x.price == null || !Number.isFinite(x.price) || !x.date || x.date > runDate) continue; // a session not yet closed comes back null
      if (x.currency && x.currency !== meta.currency) throw new Error(`${f}: ${x.requestId} ${x.date} in ${x.currency}, expected ${meta.currency}`);
      const s = series[meta.id]; pulled[x.requestId]++;
      const v = r2(x.price);
      if (s.points.has(x.date)) { replaced++; const d = disagree[x.requestId]; d.overlap++; if (Math.abs(v / s.points.get(x.date) - 1) > 0.005) d.differ++; } else added++;
      s.points.set(x.date, v);
    }
  }
  // every listing must have come back in this pull (a missing or empty prices-daily file must never pass as "nothing new")
  const missing = Object.keys(SERIES).filter((k) => !pulled[k]);
  if (missing.length) throw new Error(`no closes pulled for ${missing.join(', ')} (pull files: ${files.join(', ')}); the routine must retry steps n/o, never ingest a partial pull`);
  // the pull is split-adjusted at pull time while the stored history is not re-adjusted: a level break on most overlapping
  // dates means a split or a restatement, and the whole history has to be re-pulled (steps n/o from 2015-01-01, then --replace)
  for (const [k, d] of Object.entries(disagree)) {
    if (d.overlap >= 5 && d.differ > d.overlap / 2) throw new Error(`${k}: ${d.differ} of ${d.overlap} overlapping closes differ by more than 0.5% from the stored history (split or restatement?); re-pull the full history from 2015-01-01 and run ingest --replace`);
  }
  const seriesOut = Object.fromEntries(Object.entries(series).map(([id, s]) => { const pts = [...s.points.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)); return [id, { factsetId: s.factsetId, currency: s.currency, exchange: s.exchange, from: pts[0] ? pts[0][0] : null, to: pts.length ? pts[pts.length - 1][0] : null, points: pts }]; }));
  const outObj = {
    pulledAt: new Date().toISOString(), runDate,
    // latest close per FactSet id (hyphenated, so the watchdog can read `latestClose.GAPB-MX` as a dotted path)
    latestClose: Object.fromEntries(Object.values(seriesOut).map((s) => [s.factsetId, s.to])),
    source: 'FactSet AI-Ready Data connector (MCP): GlobalPrices prices, frequency D, adjust SPLIT (default), currency LOCAL for the BMV series and USD for the ADS; pulled nightly by the cloud routine "FNAM Airports: FactSet peers refresh"',
    notes: [
      'points = [date, close] in the listing currency, completed sessions only (a session still open comes back null and is skipped); split-adjusted, dividends not reinvested, like the Yahoo series it replaces.',
      'The market fetchers and `apply` overlay these closes on data/market.js: FactSet wins on every date it carries; Yahoo/Stooq only fill dates FactSet has not posted yet and the history before this file starts.',
      'The S&P/BMV IPC (^MXX) is not here: the connector rejects index ids, so the index stays on Yahoo Finance.',
    ],
    series: seriesOut,
  };
  writeFileSync(out, JSON.stringify(outObj));
  return { ...outObj, added, replaced, files };
}

// ---------------------------------------------------------------- overlay
export function loadFactSetPrices(file = PRICES_FILE) {
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

// entry: a data/market.js price entry ({ name, currency, exchange, source, fetchedAt, points: [[date, close]], ... }).
// Returns the entry with FactSet's closes overlaid, or the entry untouched when FactSet has no series for it.
// Rule: inside FactSet's date range only FactSet's closes are shown (a Yahoo bar on a date FactSet does not carry is
// dropped too); the runner's series fills only the history before the range and the sessions after it. `provenance.fill`
// keeps the fill feed, its stamp and the points outside the range (few), so the file does not double in size.
export function overlayFactSet(entry, seriesId, fs) {
  const s = fs && fs.series && fs.series[seriesId];
  if (!entry || !s || !s.points || !s.points.length) return entry;
  if (entry.currency && entry.currency !== s.currency) throw new Error(`${seriesId}: market.js series in ${entry.currency}, FactSet in ${s.currency}`);
  const prevFill = entry.provenance && entry.provenance.fill;
  // the runner's own stamp, whether this entry is fresh or already carries an earlier overlay; the base series is always the
  // entry's own points (an earlier overlay included), so a FactSet file whose range is narrower than before (a rebuilt
  // prices.json) can never discard history the page already shows
  const fill = prevFill ? { source: prevFill.source, fetchedAt: prevFill.fetchedAt, note: prevFill.note } : { source: entry.source || null, fetchedAt: entry.fetchedAt || null, note: entry.note || null };
  const runnerPts = entry.points || [];
  const beforePts = runnerPts.filter((p) => p[0] < s.from), afterPts = runnerPts.filter((p) => p[0] > s.to);
  const points = beforePts.concat(s.points, afterPts);
  const after = afterPts.map((p) => p[0]);
  const latestFrom = after.length ? 'runner' : 'factset';
  const fillName = fill.source || 'Yahoo Finance';
  const source = `${SOURCE_NAME} (${s.from} to ${s.to})` + (beforePts.length ? `; ${fillName} before ${s.from}` : '') + (after.length ? `; ${fillName} for ${after.length === 1 ? after[0] : after.length + ' later sessions'}` : '');
  const out = {
    ...entry,
    source,
    // the stamp of the feed that supplied the latest close (the runner's when it filled a session FactSet has not posted yet)
    fetchedAt: latestFrom === 'factset' ? fs.pulledAt : (fill.fetchedAt || entry.fetchedAt),
    note: undefined,
    sessions: 'completed',
    points,
    provenance: { authority: SOURCE_NAME, latestFrom, factset: { from: s.from, to: s.to, points: s.points.length, pulledAt: fs.pulledAt }, fill: { ...fill, before: beforePts.length, after, points: beforePts.concat(afterPts), error: entry.error || null, staleSince: entry.staleSince || null } },
  };
  // a failed Yahoo fetch is a header warning only while Yahoo supplies the latest close; otherwise it stays in provenance.fill
  if (latestFrom === 'factset') { delete out.error; delete out.staleSince; }
  return out;
}

export function applyAll({ prices = PRICES_FILE } = {}) {
  const fs = loadFactSetPrices(prices);
  if (!fs) throw new Error(`no FactSet prices at ${prices}; run ingest first`);
  const written = [];
  for (const page of PAGES) {
    const file = join(ROOT, `site/${page.slug}/data/market.js`);
    if (!existsSync(file)) continue;
    const txt = readFileSync(file, 'utf8');
    const head = txt.slice(0, txt.indexOf('window.'));
    const i = txt.indexOf('{');
    let mk = JSON.parse(txt.slice(i).replace(/;\s*$/, ''));
    let n = 0;
    for (const id of Object.keys(mk.prices || {})) { if (fs.series[id]) { mk.prices[id] = overlayFactSet(mk.prices[id], id, fs); n++; } }
    mk.generatedAt = new Date().toISOString();
    // the close the page prints, in the first bytes of the file (the watchdog and the page-side status check read it there)
    const homePts = (mk.prices[page.home] || {}).points || [];
    mk = { generatedAt: mk.generatedAt, latestClose: homePts.length ? homePts[homePts.length - 1][0] : null, ...mk };
    delete mk.priceAuthority; // (written by apply until 2026-10-06; nothing reads it, the pages use each series' provenance)
    const head2 = head.replace(/\/\/ Last refreshed: .*\n/, `// Last refreshed: ${mk.generatedAt} (FactSet closes applied by the nightly FactSet routine)\n`);
    writeFileSync(file, head2 + `window.${page.prefix}_MARKET = ` + JSON.stringify(mk) + ';\n');
    written.push({ file: file.replace(ROOT + '/', ''), series: n, last: Object.fromEntries(Object.keys(fs.series).filter((id) => mk.prices[id]).map((id) => [id, mk.prices[id].points[mk.prices[id].points.length - 1]])) });
  }
  return written;
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  if (cmd === 'ingest') {
    const res = ingest({ pull: a.pull ? resolve(a.pull) : PULL_DIR, out: a.out ? resolve(a.out) : PRICES_FILE, date: a.date, replace: !!a.replace });
    console.log(`ingest: ${res.files.join(', ')} → ${res.added} closes added, ${res.replaced} replaced; run ${res.runDate}`);
    for (const [id, s] of Object.entries(res.series)) console.log(`${id.padEnd(9)} ${s.currency} ${s.from} → ${s.to}  ${s.points.length} closes  last ${s.points.length ? s.points[s.points.length - 1][1] : '—'}`);
  } else if (cmd === 'apply') {
    const written = applyAll({ prices: a.prices ? resolve(a.prices) : PRICES_FILE });
    for (const w of written) console.log(`${w.file}: ${w.series} series overlaid; ${Object.entries(w.last).map(([id, p]) => `${id} ${p[0]} ${p[1]}`).join(', ')}`);
  } else {
    console.error('usage: node scripts/lib/factset-prices.mjs ingest [--pull DIR] [--out FILE] [--date YYYY-MM-DD] [--replace] | apply [--prices FILE]');
    process.exit(2);
  }
}
