// Pulls the daily market series the Gentera model needs and writes site/gentera/data/market.js as
// `window.G_MARKET = {...}` (valid JSON after the prefix, so this script can read it back).
//
//   prices     GENTERA.MX (BMV, MXN), the S&P/BMV IPC (^MXX), and the listed Mexican lenders used as
//              placeholders for the peer comparison until FactSet is authorised: Banorte (GFNORTEO.MX),
//              Regional (RA.MX), BanBajío (BBAJIOO.MX) and Credicorp (BAP, NYSE, USD; owner of Mibanco, the
//              largest Peruvian microlender) — Yahoo Finance chart API, Stooq fallback.
//   dividends  cash dividends per GENTERA share as recorded by Yahoo (cross-checked against the AGM
//              resolutions in reference.js).
//   fx         USD/MXN — FRED DEXMXUS (Federal Reserve H.10, no key required).
//   rates      Mexico 10-year government bond: Banxico SIE weekly auction yield (needs BANXICO_TOKEN; the series
//              id is found by title among candidate ids, or pinned with BANXICO_SERIES_MX10Y) with the FRED/OECD
//              monthly series (IRLTLT01MXM156N) as fallback; US 10-year Treasury (FRED DGS10, daily).
//              These are the risk-free inputs of the valuation section.
//
// A series that fails to download keeps its previous points (stale but present) and records the error.
// Exit code is non-zero only when every source failed.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = new URL('../../site/gentera/data/market.js', import.meta.url);
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';

const PRICE_SERIES = [
  { id: 'GENTERA.MX', name: 'Gentera (BMV: GENTERA)', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: 'gentera.mx', dividends: true },
  { id: '^MXX', name: 'S&P/BMV IPC', currency: 'MXN', exchange: 'BMV', since: '2015-01-01', stooq: '^mxx' },
  { id: 'GFNORTEO.MX', name: 'Banorte (GFNORTEO)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'gfnorteo.mx' },
  { id: 'RA.MX', name: 'Regional (RA)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'ra.mx' },
  { id: 'BBAJIOO.MX', name: 'BanBajío (BBAJIOO)', currency: 'MXN', exchange: 'BMV', since: '2019-01-01', stooq: 'bbajioo.mx' },
  { id: 'BAP', name: 'Credicorp (NYSE: BAP)', currency: 'USD', exchange: 'NYSE', since: '2019-01-01', stooq: 'bap.us' },
];
const FRED_SERIES = [
  { key: 'fx', id: 'USDMXN', fred: 'DEXMXUS', name: 'USD/MXN (Fed H.10, noon buying rate)', since: '2015-01-01' },
  { key: 'rates', id: 'US10Y', fred: 'DGS10', name: 'US Treasury 10 años (%)', since: '2015-01-01' },
];
const BANXICO_MX10Y = process.env.BANXICO_SERIES_MX10Y || null;

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

// Banxico SIE: 10-year Bono M yield. The exact series id is found by scanning candidate ids (the weekly
// auction results live in the SF439xx–SF440xx range, one id per instrument) and keeping the first whose title
// names a 10-year bond; BANXICO_SERIES_MX10Y pins one once known. A wrong id never publishes: the title check
// refuses it, and the titles seen are recorded in the note so the candidate list can be corrected.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => 'SF' + (a + i));
const BANXICO_CANDIDATES = [...range(43880, 44100), ...range(45400, 45500)];  // weekly auction results and secondary-market yields
const isTenYearBond = (title) => /bonos?\b/i.test(title) && /10\s*a[ñn]os|3640\s*d[ií]as/i.test(title) && /rendimiento/i.test(title) && !/udibono|bpa|brems|monto|precio|plazo en/i.test(title);
async function banxicoSeries(ids, since, token) {
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${ids.join(',')}/datos/${since}/${new Date().toISOString().slice(0, 10)}?token=${token}`;
  const body = JSON.parse(await getText(url, { headers: { Accept: 'application/json' } }));
  return body?.bmx?.series || [];
}
async function banxico(series, since) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('BANXICO_TOKEN not set');
  let s = null; const seen = [];
  if (series) {
    s = (await banxicoSeries([series], since, token))[0];
    if (!s) throw new Error(`Banxico ${series}: no series in response`);
    if (!isTenYearBond(s.titulo || '')) { seen.push(`${series}: ${(s.titulo || '').replace(/\s+/g, ' ').slice(0, 90)}`); s = null; }
  }
  if (!s) {
    // one-off scan (the id found is cached in market.js as rates.MX10Y.seriesId and tried first next time)
    for (let i = 0; i < BANXICO_CANDIDATES.length && !s; i += 20) {
      const found = await banxicoSeries(BANXICO_CANDIDATES.slice(i, i + 20), since, token).catch(() => []);
      for (const c of found) { const t = (c.titulo || '').replace(/\s+/g, ' '); if (/bono/i.test(t) && /10\s*a[ñn]os/i.test(t)) seen.push(`${c.idSerie}: ${t.slice(0, 100)}`); if (!s && isTenYearBond(t)) s = c; }
      await sleep(400);
    }
    if (!s) throw new Error(`no 10-year Bono M yield among ${BANXICO_CANDIDATES.length} candidate ids; 10-year bond titles seen: ${seen.join(' | ').slice(0, 1500) || 'none'}`);
  }
  const points = (s.datos || []).map((d) => { const [dd, mm, yy] = d.fecha.split('/'); return [`${yy}-${mm}-${dd}`, Number(String(d.dato).replace(',', ''))]; }).filter((p) => Number.isFinite(p[1])).map((p) => [p[0], r4(p[1])]).sort((a, b) => a[0].localeCompare(b[0]));
  if (!points.length) throw new Error(`Banxico ${s.idSerie}: no points`);
  return { points, seriesId: s.idSerie, source: `Banxico SIE ${s.idSerie} (${(s.titulo || '').replace(/\s+/g, ' ').slice(0, 120)})` };
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
  // MX 10-year: Banxico daily first, FRED/OECD monthly as fallback
  try {
    const data = await banxico(BANXICO_MX10Y || prev?.rates?.MX10Y?.seriesId || null, '2015-01-01');
    out.rates.MX10Y = { name: 'México Bono M 10 años, subasta semanal (%)', source: data.source, seriesId: data.seriesId, fetchedAt: out.generatedAt, points: data.points };
    ok++; console.log(`MX10Y: ${data.points.length} points via Banxico (last ${data.points.at(-1)})`);
  } catch (e1) {
    try {
      const data = await fred('IRLTLT01MXM156N', '2015-01-01');
      out.rates.MX10Y = { name: 'México bono 10 años (OECD vía FRED, mensual, %)', source: data.source, note: `Banxico unavailable (${e1.message}); FRED monthly fallback`, fetchedAt: out.generatedAt, points: data.points };
      ok++; console.log(`MX10Y: ${data.points.length} points via FRED fallback (${e1.message})`);
    } catch (e2) {
      failed++;
      const stale = prev?.rates?.MX10Y;
      out.rates.MX10Y = stale ? { ...stale, error: `${e1.message} | ${e2.message}`, staleSince: stale.fetchedAt } : { name: 'México bono 10 años', error: `${e1.message} | ${e2.message}`, points: [] };
      console.error(`MX10Y: FAILED ${e1.message} | ${e2.message}`);
    }
  }

  await mkdir(new URL('./', OUT), { recursive: true });
  const header = `// AUTO-GENERATED by scripts/gentera/fetch-market.mjs — do not hand-edit.\n// Last refreshed: ${out.generatedAt}\n// Series that failed on the last run keep their previous points and carry an \`error\` field.\n`;
  await writeFile(OUT, header + 'window.G_MARKET = ' + JSON.stringify(out) + ';\n', 'utf8');
  console.log(`Wrote market.js: ${ok} series ok, ${failed} failed.`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
