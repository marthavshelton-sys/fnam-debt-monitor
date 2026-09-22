// Daily market series for the airport-group models. Usage: node scripts/airports/fetch-market.mjs --company=asur|oma
// Writes site/<company>/data/market.js as `window.<PREFIX>_MARKET = {...}`:
//   prices     home listing (BMV, MXN), the US ADS, the two Mexican airport peers, the S&P/BMV IPC — Yahoo
//              Finance chart API with a Stooq fallback; dividends = cash dividends per home share (Yahoo).
//   fx         USD/MXN — FRED DEXMXUS (Federal Reserve H.10).
//   rates      Mexico 10-year (FRED IRLTLT01MXM156N, OECD, monthly) and US 10-year (FRED DGS10) — DCF inputs.
// A series that fails keeps its previous points and records the error; exit code non-zero only if all failed.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const COMPANY = (process.argv.find((a) => a.startsWith('--company=')) || '').split('=')[1];
const CONFIG = {
  asur: {
    prefix: 'ASUR', out: '../../site/asur/data/market.js',
    prices: [
      { id: 'ASURB.MX', name: 'ASUR serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: 'asurb.mx', dividends: true },
      { id: 'ASR', name: 'ASUR ADS (NYSE)', currency: 'USD', exchange: 'NYSE', since: '2015-01-01', stooq: 'asr.us', dividends: true },
      { id: 'GAPB.MX', name: 'GAP serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'gapb.mx' },
      { id: 'OMAB.MX', name: 'OMA serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'omab.mx' },
      { id: '^MXX', name: 'S&P/BMV IPC', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: '^mxx' },
    ],
  },
  oma: {
    prefix: 'OMA', out: '../../site/oma/data/market.js',
    prices: [
      { id: 'OMAB.MX', name: 'OMA serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: 'omab.mx', dividends: true },
      { id: 'OMAB', name: 'OMA ADS (Nasdaq)', currency: 'USD', exchange: 'NASDAQ', since: '2015-01-01', stooq: 'omab.us', dividends: true },
      { id: 'GAPB.MX', name: 'GAP serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'gapb.mx' },
      { id: 'ASURB.MX', name: 'ASUR serie B (BMV)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'asurb.mx' },
      { id: '^MXX', name: 'S&P/BMV IPC', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: '^mxx' },
    ],
  },
};
const cfg = CONFIG[COMPANY];
if (!cfg) { console.error('usage: fetch-market.mjs --company=asur|oma'); process.exit(2); }
const OUT = new URL(cfg.out, import.meta.url);
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const FRED_SERIES = [
  { key: 'fx', id: 'USDMXN', fred: 'DEXMXUS', name: 'USD/MXN (Fed H.10, noon buying rate)', since: '2015-01-01' },
  { key: 'rates', id: 'MX10Y', fred: 'IRLTLT01MXM156N', name: 'México bono 10 años (OECD, mensual, %)', since: '2015-01-01' },
  { key: 'rates', id: 'US10Y', fred: 'DGS10', name: 'US Treasury 10 años (%)', since: '2015-01-01' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUnix = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000);
const isoDate = (unix) => new Date(unix * 1000).toISOString().slice(0, 10);
const r2 = (x) => Math.round(x * 100) / 100, r4 = (x) => Math.round(x * 10000) / 10000;

async function getText(url, { tries = 3 } = {}) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try { const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } }); if (res.ok) return res.text(); lastErr = new Error(`${url} -> HTTP ${res.status}`); if (res.status === 404) break; }
    catch (e) { lastErr = e; }
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
  const points = rows.slice(1).filter((r) => r[4] && Number.isFinite(Number(r[4]))).map((r) => [r[0], r2(Number(r[4]))]);
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
  const txt = await readFile(OUT, 'utf8'); const i = txt.indexOf('{');
  try { return JSON.parse(txt.slice(i).replace(/;\s*$/, '')); } catch { return null; }
}
async function main() {
  const prev = await loadPrevious();
  const out = { generatedAt: new Date().toISOString(), prices: {}, dividends: {}, fx: {}, rates: {} };
  let ok = 0, failed = 0;
  for (const s of cfg.prices) {
    let data, err;
    try { data = await yahoo(s.id, s.since); }
    catch (e1) { try { data = await stooq(s.stooq, s.since); data.note = `Yahoo failed (${e1.message}); Stooq fallback`; } catch (e2) { err = `${e1.message} | ${e2.message}`; } }
    if (data && data.points.length > 50) {
      ok++;
      out.prices[s.id] = { name: s.name, currency: s.currency, exchange: s.exchange, source: data.source, note: data.note, fetchedAt: out.generatedAt, points: data.points };
      if (s.dividends) out.dividends[s.id] = { source: data.source, points: data.dividends };
      console.log(`${s.id}: ${data.points.length} points via ${data.source} (last ${data.points.at(-1)})`);
    } else {
      failed++;
      const stale = prev?.prices?.[s.id];
      out.prices[s.id] = stale ? { ...stale, error: err || 'too few points', staleSince: stale.fetchedAt } : { name: s.name, currency: s.currency, exchange: s.exchange, error: err || 'too few points', points: [] };
      if (s.dividends) out.dividends[s.id] = prev?.dividends?.[s.id] || { points: [] };
      console.error(`${s.id}: FAILED ${err || 'too few points'}${stale ? ' (kept previous points)' : ''}`);
    }
    await sleep(700);
  }
  for (const s of FRED_SERIES) {
    try { const data = await fred(s.fred, s.since); out[s.key][s.id] = { name: s.name, source: data.source, fetchedAt: out.generatedAt, points: data.points }; ok++; console.log(`${s.id}: ${data.points.length} points`); }
    catch (e) { failed++; const stale = prev?.[s.key]?.[s.id]; out[s.key][s.id] = stale ? { ...stale, error: e.message, staleSince: stale.fetchedAt } : { name: s.name, error: e.message, points: [] }; console.error(`${s.id}: FAILED ${e.message}`); }
  }
  await mkdir(new URL('./', OUT), { recursive: true });
  const hdr = `// AUTO-GENERATED by scripts/airports/fetch-market.mjs --company=${COMPANY} — do not hand-edit.\n// Last refreshed: ${out.generatedAt}\n// Series that failed on the last run keep their previous points and carry an \`error\` field.\n`;
  await writeFile(OUT, hdr + `window.${cfg.prefix}_MARKET = ` + JSON.stringify(out) + ';\n', 'utf8');
  console.log(`Wrote market.js: ${ok} series ok, ${failed} failed.`);
  if (ok === 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
