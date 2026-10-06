// Pulls the daily market series the GAP model needs and writes site/gap/data/market.js as
// `window.GAP_MARKET = {...}` (valid JSON after the prefix, so this script can read it back).
//
//   prices     GAPB.MX (BMV, MXN), PAC (NYSE ADS, USD, 10 B shares per ADS), peers ASURB.MX and
//              OMAB.MX, and the S&P/BMV IPC (^MXX) — Yahoo Finance chart API, Stooq fallback.
//              Since 2026-10-06 FactSet's daily closes (tools/gap/raw/factset/prices.json, pulled nightly by the FactSet
//              routine; scripts/lib/factset-prices.mjs) are overlaid on every share series: FactSet wins on every date it
//              carries, Yahoo/Stooq fill only the sessions it has not posted yet. The index stays on Yahoo.
//   dividends  cash dividends per GAPB.MX share as recorded by Yahoo (cross-checked by hand
//              against the shareholder-meeting resolutions in reference.js).
//   fx         USD/MXN — Banxico SIE SF43718 (Tipo de cambio FIX, needs BANXICO_TOKEN), Banco de México's own
//              daily print; FRED DEXMXUS (Fed H.10) is the fallback, since that mirror has been seen to stall for
//              a week or more (September 2026). Shared reader: scripts/lib/banxico-fx.mjs.
//   rates      Mexico 10-year M bono: Banxico SIE SF44071 (primary-auction yield, about every four weeks, published the
//              same day; scripts/lib/banxico-mx10y.mjs) with the OECD monthly series on FRED (IRLTLT01MXM156N) as fallback, and
//              US 10-year Treasury (FRED DGS10, daily) — DCF risk-free inputs.
//
// A series that fails to download keeps its previous points (stale but present) and records the
// error, exactly like scripts/fetch-data.mjs does for the fiscal dashboard. Exit code is non-zero
// only when every source failed.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fetchUsdMxn } from '../lib/banxico-fx.mjs';
import { fetchMx10y } from '../lib/banxico-mx10y.mjs';
import { completedSessions } from '../lib/completed-sessions.mjs';
import { loadFactSetPrices, overlayFactSet } from '../lib/factset-prices.mjs';

const OUT = new URL('../../site/gap/data/market.js', import.meta.url);
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';

const PRICE_SERIES = [
  { id: 'GAPB.MX', name: 'GAP serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: 'gapb.mx', dividends: true },
  { id: 'PAC', name: 'GAP ADS (NYSE)', currency: 'USD', exchange: 'NYSE', since: '2015-01-01', stooq: 'pac.us', dividends: true },
  { id: 'ASURB.MX', name: 'ASUR serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'asurb.mx' },
  { id: 'OMAB.MX', name: 'OMA serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'omab.mx' },
  { id: '^MXX', name: 'S&P/BMV IPC', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: '^mxx' },
];
const FRED_SERIES = [
  { key: 'rates', id: 'US10Y', fred: 'DGS10', name: 'US Treasury 10 años (%)', since: '2015-01-01' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUnix = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000);
const isoDate = (unix) => new Date(unix * 1000).toISOString().slice(0, 10);
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;

async function getText(url, { tries = 3 } = {}) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
      if (res.ok) return res.text();
      lastErr = new Error(`${url} -> HTTP ${res.status}`);
      if (res.status === 404) break;
    } catch (e) { lastErr = e; }
    await sleep(1200 * i);
  }
  throw lastErr;
}

async function yahoo(sym, since) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${toUnix(since)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d&events=div`;
  const body = JSON.parse(await getText(url));
  const r = body.chart?.result?.[0];
  if (!r) throw new Error(`Yahoo returned no result for ${sym}: ${JSON.stringify(body.chart?.error || body).slice(0, 200)}`);
  const closes = r.indicators?.quote?.[0]?.close || [];
  const points = [];
  r.timestamp.forEach((t, i) => { if (closes[i] != null && Number.isFinite(closes[i])) points.push([isoDate(t), r2(closes[i])]); });
  const dividends = Object.values(r.events?.dividends || {}).map((d) => [isoDate(d.date), r4(d.amount)]).sort((a, b) => a[0].localeCompare(b[0]));
  return { points, dividends, source: 'Yahoo Finance chart API' };
}

async function stooq(sym, since) {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&d1=${since.replace(/-/g, '')}&d2=${new Date().toISOString().slice(0, 10).replace(/-/g, '')}&i=d`;
  const csv = await getText(url);
  const rows = csv.trim().split('\n').map((l) => l.split(','));
  if (rows.length < 2 || !/^Date/i.test(rows[0][0])) throw new Error(`Stooq returned no data for ${sym}: ${csv.slice(0, 80)}`);
  const points = rows.slice(1).filter((r) => r[4] && r[4] !== '' && Number.isFinite(Number(r[4]))).map((r) => [r[0], r2(Number(r[4]))]);
  return { points, dividends: [], source: 'Stooq' };
}

async function fred(id, since) {
  const csv = await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(','));
  const points = rows.filter((r) => r[0] >= since && r[1] && r[1] !== '.' && Number.isFinite(Number(r[1]))).map((r) => [r[0], r4(Number(r[1]))]);
  if (!points.length) throw new Error(`FRED ${id}: no points`);
  return { points, source: `FRED ${id}` };
}

async function loadPrevious() {
  if (!existsSync(OUT)) return null;
  const txt = await readFile(OUT, 'utf8');
  const i = txt.indexOf('{');
  try { return JSON.parse(txt.slice(i).replace(/;\s*$/, '')); } catch { return null; }
}

async function main() {
  const prev = await loadPrevious();
  const fsPrices = loadFactSetPrices(); // FactSet daily closes (the share-price authority since 2026-10-06): they win on every date they carry
  if (fsPrices) console.log(`FactSet closes: ${Object.entries(fsPrices.series).map(([id, x]) => `${id} to ${x.to}`).join(', ')} (pulled ${fsPrices.pulledAt})`); else console.warn('FactSet closes: file missing, Yahoo/Stooq only');
  const out = { generatedAt: new Date().toISOString(), prices: {}, dividends: {}, fx: {}, rates: {} };
  let ok = 0, failed = 0;

  for (const s of PRICE_SERIES) {
    let data, err;
    try { data = await yahoo(s.id, s.since); }
    catch (e1) {
      try { data = await stooq(s.stooq, s.since); data.note = `Yahoo failed (${e1.message}); Stooq fallback`; }
      catch (e2) { err = `${e1.message} | ${e2.message}`; }
    }
    if (data && data.points.length > 50) {
      ok++;
      data.points = completedSessions(data.points, { exchange: s.exchange }); // closes only: a bar dated today counts once that exchange has closed
      const entry = overlayFactSet({ name: s.name, currency: s.currency, exchange: s.exchange, source: data.source, note: data.note, fetchedAt: out.generatedAt, sessions: 'completed', points: data.points }, s.id, fsPrices);
      out.prices[s.id] = entry;
      if (s.dividends) out.dividends[s.id] = { source: data.source, points: data.dividends };
      console.log(`${s.id}: ${entry.points.length} points via ${entry.source} (last ${entry.points.at(-1)})`);
    } else {
      failed++;
      const stale = prev?.prices?.[s.id];
      const staleAt = stale && ((stale.provenance && stale.provenance.fill && stale.provenance.fill.fetchedAt) || stale.fetchedAt);
      out.prices[s.id] = overlayFactSet(stale ? { ...stale, error: err || 'too few points', staleSince: staleAt } : { name: s.name, currency: s.currency, exchange: s.exchange, error: err || 'too few points', points: [] }, s.id, fsPrices);
      if (s.dividends) out.dividends[s.id] = prev?.dividends?.[s.id] || { points: [] };
      console.error(`${s.id}: FAILED ${err || 'too few points'}${stale ? ' (kept previous points)' : ''}`);
    }
    await sleep(700);
  }
  for (const s of FRED_SERIES) {
    try {
      const data = await fred(s.fred, s.since);
      out[s.key][s.id] = { name: s.name, source: data.source, fetchedAt: out.generatedAt, points: data.points };
      ok++;
      console.log(`${s.id}: ${data.points.length} points (last ${data.points.at(-1)})`);
    } catch (e) {
      failed++;
      const stale = prev?.[s.key]?.[s.id];
      out[s.key][s.id] = stale ? { ...stale, error: e.message, staleSince: stale.fetchedAt } : { name: s.name, error: e.message, points: [] };
      console.error(`${s.id}: FAILED ${e.message}`);
    }
  }
  // MX 10-year: Banxico auction yield first, FRED/OECD monthly as the fallback (scripts/lib/banxico-mx10y.mjs)
  { const r = await fetchMx10y({ fred, prev, fetchedAt: out.generatedAt }); out.rates.MX10Y = r.entry; if (r.ok) ok++; else failed++; }
  // USD/MXN: Banxico FIX first, FRED DEXMXUS as the fallback (scripts/lib/banxico-fx.mjs)
  { const r = await fetchUsdMxn({ fred, prev, fetchedAt: out.generatedAt }); out.fx.USDMXN = r.entry; if (r.ok) ok++; else failed++; }

  await mkdir(new URL('./', OUT), { recursive: true });
  const header = `// AUTO-GENERATED by scripts/gap/fetch-market.mjs — do not hand-edit.\n// Last refreshed: ${out.generatedAt}\n// Series that failed on the last run keep their previous points and carry an \`error\` field.\n`;
  await writeFile(OUT, header + 'window.GAP_MARKET = ' + JSON.stringify(out) + ';\n', 'utf8');
  console.log(`Wrote market.js: ${ok} series ok, ${failed} failed.`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
