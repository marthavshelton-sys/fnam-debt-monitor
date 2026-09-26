// Pulls the daily market series the Quálitas model needs and writes site/qualitas/data/market.js as
// `window.Q_MARKET = {...}` (valid JSON after the prefix, so this script can read it back).
//
//   prices     Q.MX (Quálitas Controladora, BMV, MXN), the S&P/BMV IPC (^MXX), and listed auto-insurance
//              peers used for the rebased comparison: Progressive (PGR, NYSE, USD), Allstate (ALL, NYSE, USD),
//              Porto Seguro (PSSA3.SA, B3, BRL) and Mapfre (MAP.MC, BME, EUR) — Yahoo Finance chart API, Stooq fallback.
//   dividends  cash dividends per Q.MX share as recorded by Yahoo (cross-checked against the AGM resolutions in reference.js).
//   fx         USD/MXN — FRED DEXMXUS (Federal Reserve H.10, no key required) as the series of record;
//              when its last point is more than 4 days old (the H.10 release itself has stalled — seen for
//              several days running in September 2026), Banxico SIE SF43718 (Tipo de cambio FIX, needs
//              BANXICO_TOKEN) fills only the missing newer dates, flagged with a note.
//   rates      Mexico 10-year government bond yield (FRED IRLTLT01MXM156N, OECD, monthly) and
//              US 10-year Treasury (FRED DGS10, daily) — cost-of-equity inputs for the valuation section.
//
// A series that fails to download keeps its previous points (stale but present) and records the
// error. Exit code is non-zero only when every source failed.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = new URL('../../site/qualitas/data/market.js', import.meta.url);
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';

const PRICE_SERIES = [
  { id: 'Q.MX', name: 'Quálitas Controladora (BMV: Q*)', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: 'q.mx', dividends: true },
  { id: '^MXX', name: 'S&P/BMV IPC', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: '^mxx' },
  { id: 'PGR', name: 'Progressive (NYSE)', currency: 'USD', exchange: 'NYSE', since: '2019-01-01', stooq: 'pgr.us' },
  { id: 'ALL', name: 'Allstate (NYSE)', currency: 'USD', exchange: 'NYSE', since: '2019-01-01', stooq: 'all.us' },
  { id: 'PSSA3.SA', name: 'Porto Seguro (B3)', currency: 'BRL', exchange: 'B3', since: '2019-01-01', stooq: 'pssa3.br' },
  { id: 'MAP.MC', name: 'Mapfre (BME)', currency: 'EUR', exchange: 'BME', since: '2019-01-01', stooq: 'map.es' },
];
const FX_USDMXN = { key: 'fx', id: 'USDMXN', fred: 'DEXMXUS', name: 'USD/MXN (Fed H.10, noon buying rate)', since: '2015-01-01' };
const FRED_SERIES = [
  { key: 'rates', id: 'MX10Y', fred: 'IRLTLT01MXM156N', name: 'México bono 10 años (OECD, mensual, %)', since: '2015-01-01' },
  { key: 'rates', id: 'US10Y', fred: 'DGS10', name: 'US Treasury 10 años (%)', since: '2015-01-01' },
];
// Banxico SIE SF43718: "Tipo de cambio Pesos por dólar E.U.A. FIX", published daily. Fills only the dates
// newer than FRED's last point when the H.10 release has stalled; a wrong id never reaches the page because
// the title is checked before any point is used.
const BANXICO_FX_SERIES = process.env.BANXICO_SERIES_USDMXN || 'SF43718';
const FX_STALE_DAYS = 4;
const isFixRate = (title) => /tipo de cambio/i.test(title) && /(fix|d[oó]lar)/i.test(title) && !/udis?\b/i.test(title);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toUnix = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000);
const isoDate = (unix) => new Date(unix * 1000).toISOString().slice(0, 10);
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 10000) / 10000;

async function getText(url, { tries = 3, headers = {} } = {}) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*', ...headers } });
      if (res.ok) return res.text();
      lastErr = new Error(`${url.replace(/token=[^&]+/, 'token=…')} -> HTTP ${res.status}`);
      if (res.status === 404 || res.status === 401 || res.status === 403) break;
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

// USD/MXN fallback for when FRED's H.10 mirror has stalled: Banxico SIE FIX rate, dates after `since` only.
async function banxicoFx(since) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('BANXICO_TOKEN not set');
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${BANXICO_FX_SERIES}/datos/${since}/${new Date().toISOString().slice(0, 10)}?token=${token}`;
  const body = JSON.parse(await getText(url, { headers: { Accept: 'application/json' } }));
  const s = body?.bmx?.series?.[0];
  if (!s) throw new Error(`Banxico ${BANXICO_FX_SERIES}: no series in response`);
  const title = (s.titulo || '').replace(/\s+/g, ' ');
  if (!isFixRate(title)) throw new Error(`Banxico ${BANXICO_FX_SERIES}: title does not look like the FIX rate (${title.slice(0, 100)})`);
  const points = (s.datos || [])
    .map((d) => { const [dd, mm, yy] = d.fecha.split('/'); return [`${yy}-${mm}-${dd}`, Number(String(d.dato).replace(',', ''))]; })
    .filter((p) => Number.isFinite(p[1]))
    .map((p) => [p[0], r4(p[1])])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!points.length) throw new Error(`Banxico ${BANXICO_FX_SERIES}: no points since ${since}`);
  return { points, source: `Banxico SIE ${BANXICO_FX_SERIES} (${title.slice(0, 90)})` };
}

async function loadPrevious() {
  if (!existsSync(OUT)) return null;
  const txt = await readFile(OUT, 'utf8');
  const i = txt.indexOf('{');
  try { return JSON.parse(txt.slice(i).replace(/;\s*$/, '')); } catch { return null; }
}

async function main() {
  const prev = await loadPrevious();
  const out = { generatedAt: new Date().toISOString(), prices: {}, dividends: {}, fx: {}, rates: {} };
  let ok = 0, failed = 0;

  for (const s of PRICE_SERIES) {
    let data, err;
    try { data = await yahoo(s.id, s.since); }
    catch (e1) {
      try { data = await stooq(s.stooq, s.since); data.note = `Yahoo failed (${e1.message}); Stooq fallback`; }
      catch (e2) { err = `${e1.message} | ${e2.message}`; }
    }
    // Closed sessions only: during trading hours Yahoo's last daily bar is the session in progress, not a close.
    // Every exchange here (BMV, NYSE, B3, BME) has closed by 22:00 UTC, so a run before that drops the current day's bar;
    // the 23:00 UTC run adds the real close.
    if (data && data.points && new Date(out.generatedAt).getUTCHours() < 22) { const today = out.generatedAt.slice(0, 10); data.points = data.points.filter((p) => p[0] !== today); }
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

  // USD/MXN: FRED DEXMXUS is the series of record; when its last point has gone stale (the H.10 release
  // itself has stopped publishing, not a fetch error — seen for several days running in September 2026),
  // Banxico's daily FIX rate fills only the dates FRED is missing so the page isn't left days behind.
  {
    const s = FX_USDMXN;
    try {
      const data = await fred(s.fred, s.since);
      let points = data.points, source = data.source, note;
      const lastDate = points.at(-1)?.[0];
      const ageDays = lastDate ? Math.floor((Date.now() - new Date(lastDate + 'T00:00:00Z').getTime()) / 86400000) : Infinity;
      if (ageDays > FX_STALE_DAYS) {
        try {
          const bx = await banxicoFx(lastDate);
          const gap = bx.points.filter((p) => p[0] > lastDate);
          if (gap.length) {
            points = [...points, ...gap];
            note = `FRED ${s.fred} stalled at ${lastDate} (${ageDays}d); ${gap.length} newer point(s) filled from ${bx.source}`;
            source = `${data.source} + ${bx.source}`;
          }
        } catch (eBx) { note = `FRED ${s.fred} stalled at ${lastDate} (${ageDays}d); Banxico fallback failed: ${eBx.message}`; }
      }
      out[s.key][s.id] = { name: s.name, source, note, fetchedAt: out.generatedAt, points };
      ok++;
      console.log(`${s.id}: ${points.length} points (last ${points.at(-1)})${note ? ` — ${note}` : ''}`);
    } catch (e) {
      failed++;
      const stale = prev?.[s.key]?.[s.id];
      out[s.key][s.id] = stale ? { ...stale, error: e.message, staleSince: stale.fetchedAt } : { name: s.name, error: e.message, points: [] };
      console.error(`${s.id}: FAILED ${e.message}`);
    }
  }

  await mkdir(new URL('./', OUT), { recursive: true });
  const header = `// AUTO-GENERATED by scripts/qualitas/fetch-market.mjs — do not hand-edit.\n// Last refreshed: ${out.generatedAt}\n// Series that failed on the last run keep their previous points and carry an \`error\` field.\n`;
  await writeFile(OUT, header + 'window.Q_MARKET = ' + JSON.stringify(out) + ';\n', 'utf8');
  console.log(`Wrote market.js: ${ok} series ok, ${failed} failed.`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
