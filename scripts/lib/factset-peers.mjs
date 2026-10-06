// FactSet peers for the airport models (GAP, ASUR, OMA): one snapshot, three peers.js files.
//
//   node scripts/lib/factset-peers.mjs ingest [--pull DIR] [--out FILE] [--date YYYY-MM-DD]
//       Reads the raw results of the FactSet AI-Ready Data connector calls saved in DIR (one JSON file per
//       call, names below) and writes the snapshot FILE (default tools/gap/raw/factset/latest.json).
//   node scripts/lib/factset-peers.mjs build [--snapshot FILE]
//       Writes site/gap/data/peers.js, site/asur/data/peers.js and site/oma/data/peers.js from the snapshot.
//
// The connector cannot run FactSet's FQL items (FE_VALUATION(PE,MEAN,NTM4_ROLL,...), P_VOLUME_AVG, XP_PRICE_VWAP),
// so every figure is assembled from the series the connector does expose; each one is named here and in the
// runbook (tools/gap/README.md). No FactSet credentials exist in GitHub Actions: the nightly cloud routine
// "FNAM Airports: FactSet peers refresh" (prompt in tools/gap/FACTSET-PEERS-PROMPT.md) makes the calls, runs
// `ingest` and `build`, and pushes the result.
//
// Pull files (all in DIR; `data` = the connector's rows):
//   prices-recent-local.json   GlobalPrices prices, D, LOCAL, last ~7 days: price, volume   → price, priceDate (last close on or before the run date)
//   prices-usd-3m.json         GlobalPrices prices, D, USD, last 3 months: price, volume, vwap, turnover → priceUsd, ADTV
//   market-value.json          GlobalPrices market_value (currentMarketValue, local millions, all share classes)
//   dividends.json             GlobalPrices annualized_dividends, LOCAL (iadDefTradingAdj)
//   ntm-ebitda.json, ntm-eps.json, ntm-sales.json   EstimatesConsensus consensus_rolling NTMA, no dates (latest consensus)
//   ebitda-ntm-weekly.json, eps-ntm-weekly.json     the same, startDate five years back, endDate today, frequency W
//   prices-weekly.json         GlobalPrices prices, W, LOCAL, five years: price
//   shares-monthly.json        GlobalPrices shares_outstanding, AM, five years (totalOutstanding, millions, one class)
//   bs-qtr.json, bs-semi.json  Fundamentals FF_NET_DEBT + FF_MIN_INT_ACCUM, QTR (semi-annual reporters: SEMI), five years
//   ltm-qtr.json, ltm-semi.json, ltm-ann.json   Fundamentals FF_SALES, FF_EBITDA_OPER, FF_NET_INC, FF_EBITDA_OPER_MGN, FF_PE, latest LTM / LTM_SEMI / ANN
//   gap-fy-ebitda.json, gap-fy-sales.json, gap-fy-eps.json   EstimatesConsensus consensus_fixed ANN, GAP, FY2026–FY2028
//   price-targets.json         EstimatesConsensus consensus_rolling PRICE_TGT (0/0)
//   ratings.json               EstimatesConsensus ratings
//
// Definitions (company currency, millions, except per-share and ratios):
//   mktCapM        FactSet currentMarketValue (all share classes) at the price date.
//   evM            mktCapM + FF_NET_DEBT + FF_MIN_INT_ACCUM of the latest balance sheet already reported.
//   evEbitdaNtm    evM / consensus NTM EBITDA mean;  peNtm = price / consensus NTM EPS mean.   (FactSet's FE_VALUATION(FFEV_EBITDA|PE, MEAN, NTM4_ROLL) equivalents)
//   *Avg1y/3y/5y   arithmetic mean of the weekly series of that multiple over the last 52 / 156 / 260 weeks: for each
//                  Friday, the close that week x shares then outstanding (FactSet shares_outstanding scaled to the
//                  all-class count behind currentMarketValue; GAP: B + BB from reference.js) + the latest balance sheet
//                  reported by then, over the consensus mean sampled that Friday (AVERAGE(FE_VALUATION(...,-1AY|-3AY|-5AY,NOW)) equivalents).
//   adtvUsdM       average daily traded value, US$ millions: mean of FactSet's daily turnover (volume x VWAP, USD) over the
//                  last three months. avgVolume x avgVwapUsd (the product of the two averages, P_VOLUME_AVG(-3AM,0) x
//                  AVERAGE(XP_PRICE_VWAP(0,-3AM,...,USD))) is kept beside it as adtvProductUsdM.
//   divYieldPct    FactSet indicated annual dividend / price.   netDebtEbitda = FF_NET_DEBT / LTM FF_EBITDA_OPER.

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const RAW_DIR = join(ROOT, 'tools/gap/raw/factset');
const PULL_DIR = join(RAW_DIR, 'pull');
const SNAPSHOT = join(RAW_DIR, 'latest.json');

export const COMPANIES = {
  'GAPB-MX': { slug: 'gap', prefix: 'GAP', name: 'Grupo Aeroportuario del Pacífico (GAP)', short: 'GAP', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'mexico', bs: 'QTR', ltm: 'LTM' },
  'ASURB-MX': { slug: 'asur', prefix: 'ASUR', name: 'Grupo Aeroportuario del Sureste (ASUR)', short: 'ASUR', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'mexico', bs: 'QTR', ltm: 'LTM' },
  'OMAB-MX': { slug: 'oma', prefix: 'OMA', name: 'Grupo Aeroportuario del Centro Norte (OMA)', short: 'OMA', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'mexico', bs: 'QTR', ltm: 'LTM' },
  'AENA-ES': { name: 'Aena', short: 'Aena', exchange: 'BME', currency: 'EUR', fyEnd: '12-31', group: 'international', bs: 'QTR', ltm: 'LTM' },
  'FRA-DE': { name: 'Fraport', short: 'Fraport', exchange: 'XETRA', currency: 'EUR', fyEnd: '12-31', group: 'international', bs: 'QTR', ltm: 'LTM' },
  'FHZN-CH': { name: 'Flughafen Zürich', short: 'Zürich', exchange: 'SIX', currency: 'CHF', fyEnd: '12-31', group: 'international', bs: 'SEMI', ltm: 'LTM_SEMI' },
  'AIA-NZ': { name: 'Auckland International Airport', short: 'Auckland', exchange: 'NZX', currency: 'NZD', fyEnd: '06-30', group: 'international', bs: 'SEMI', ltm: 'ANN' },
};
export const IDS = Object.keys(COMPANIES);
export const WINDOWS = { '1y': 52, '3y': 156, '5y': 260 }; // weeks
const PAGES = ['gap', 'asur', 'oma'];

const r = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const div = (a, b) => (a != null && b != null && Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addMonths = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const weekKey = (iso) => { const d = new Date(iso + 'T12:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); }; // Monday of that week

function args(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a); } return o; }

// ---------------------------------------------------------------- ingest
function readPull(dir, name, required = true) {
  const p = join(dir, name);
  if (!existsSync(p)) { if (required) throw new Error(`missing pull file ${name}`); return []; }
  const txt = readFileSync(p, 'utf8');
  const j = JSON.parse(txt.slice(txt.indexOf('{')));
  if (!Array.isArray(j.data)) throw new Error(`${name}: no data array`);
  return j.data;
}
const byId = (rows) => { const m = {}; for (const x of rows) (m[x.requestId] ||= []).push(x); return m; };
const stat = (x) => ({ mean: x.mean, median: x.median, high: x.high, low: x.low, count: x.estimateCount ?? null });

// GAP's all-class share count (B + BB) by date, from the model's reference file (FactSet lists the series B only).
function gapSharesHistory() {
  const s = readFileSync(join(ROOT, 'site/gap/data/reference.js'), 'utf8');
  const i = s.indexOf('window.GAP_REF'); const j = s.indexOf('=', i) + 1; let b = s.slice(j).trim(); if (b.endsWith(';')) b = b.slice(0, -1);
  const ref = Function('return (' + b + ')')();
  const h = (ref.shares && ref.shares.history) || [];
  return { history: h.map((e) => ({ asOf: e.asOf, totalM: e.total / 1e6 })), totalM: ref.shares.total / 1e6 };
}

export function ingest({ pull = PULL_DIR, out = SNAPSHOT, date } = {}) {
  const runDate = date || todayET();
  const recent = byId(readPull(pull, 'prices-recent-local.json'));
  const usd = byId(readPull(pull, 'prices-usd-3m.json'));
  const mv = byId(readPull(pull, 'market-value.json'));
  const iad = byId(readPull(pull, 'dividends.json'));
  const ntm = { ebitda: byId(readPull(pull, 'ntm-ebitda.json')), eps: byId(readPull(pull, 'ntm-eps.json')), sales: byId(readPull(pull, 'ntm-sales.json')) };
  const wk = { ebitda: byId(readPull(pull, 'ebitda-ntm-weekly.json')), eps: byId(readPull(pull, 'eps-ntm-weekly.json')) };
  const pxW = byId(readPull(pull, 'prices-weekly.json'));
  const shM = byId(readPull(pull, 'shares-monthly.json'));
  const bs = byId([...readPull(pull, 'bs-qtr.json'), ...readPull(pull, 'bs-semi.json')]);
  const ltm = byId([...readPull(pull, 'ltm-qtr.json'), ...readPull(pull, 'ltm-semi.json'), ...readPull(pull, 'ltm-ann.json')]);
  const fy = { ebitda: readPull(pull, 'gap-fy-ebitda.json', false), sales: readPull(pull, 'gap-fy-sales.json', false), eps: readPull(pull, 'gap-fy-eps.json', false) };
  const tgt = byId(readPull(pull, 'price-targets.json', false));
  const rat = byId(readPull(pull, 'ratings.json', false));
  const gapShares = gapSharesHistory();
  const adtvFrom = addMonths(runDate, -3);
  const companies = {};
  for (const id of IDS) {
    const meta = COMPANIES[id];
    const need = (m, what) => { if (!m[id] || !m[id].length) throw new Error(`${id}: no ${what}`); return m[id]; };
    // latest completed close on or before the run date (ET); a row dated later or with a null price is skipped
    const closes = need(recent, 'recent prices').filter((x) => x.price != null && x.date <= runDate).sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = closes[closes.length - 1];
    const usdRows = need(usd, 'USD prices').filter((x) => x.price != null && x.date <= runDate).sort((a, b) => (a.date < b.date ? -1 : 1));
    const usdLast = usdRows.filter((x) => x.date <= last.date).pop();
    const adtvRows = usdRows.filter((x) => x.date >= adtvFrom && x.turnover != null && x.volume != null && x.vwap != null);
    const m = need(mv, 'market value')[0];
    if (m.currency !== meta.currency) throw new Error(`${id}: market value in ${m.currency}, expected ${meta.currency}`);
    const bsRows = need(bs, 'balance sheets').filter((x) => x.fiscalEndDate && x.value != null);
    const periods = [...new Set(bsRows.map((x) => x.fiscalEndDate))].sort();
    const balanceSheets = periods.map((p) => { const nd = bsRows.find((x) => x.fiscalEndDate === p && x.metric === 'FF_NET_DEBT'); const mi = bsRows.find((x) => x.fiscalEndDate === p && x.metric === 'FF_MIN_INT_ACCUM'); return nd ? { period: p, reported: nd.epsReportDate || p, netDebt: r(nd.value, 3), minority: mi ? r(mi.value, 3) : 0 } : null; }).filter(Boolean);
    const bsAt = (d) => balanceSheets.filter((b) => b.reported <= d).pop() || null;
    const bsNow = bsAt(last.date);
    if (!bsNow) throw new Error(`${id}: no balance sheet reported by ${last.date}`);
    const lt = need(ltm, 'LTM fundamentals'); const lv = (k) => { const x = lt.find((y) => y.metric === k); return x ? x.value : null; };
    const ntmOf = (k) => { const x = ntm[k][id] && ntm[k][id][0]; return x ? stat(x) : null; };
    // shares behind the market value (all classes), and the monthly single-class series scaled to it
    const sharesNowM = m.currentMarketValue / last.price;
    const shRows = need(shM, 'shares').filter((x) => x.totalOutstanding != null).sort((a, b) => (a.date < b.date ? -1 : 1));
    const shLatest = shRows[shRows.length - 1].totalOutstanding;
    const scale = sharesNowM / shLatest;
    const sharesAt = (d) => {
      if (id === 'GAPB-MX') { let v = gapShares.history[0] ? gapShares.history[0].totalM : gapShares.totalM; for (const e of gapShares.history) if (e.asOf <= d) v = e.totalM; return v; }
      let v = shRows[0].totalOutstanding; for (const x of shRows) if (x.date <= d) v = x.totalOutstanding; return v * scale;
    };
    // weekly history: consensus Fridays joined with that week's close, the shares then outstanding and the latest balance sheet reported
    // weekly closes; a week whose Friday was a holiday comes back null and takes the previous week's close (carried, at most one week)
    const pw = new Map(); let prev = null;
    for (const x of need(pxW, 'weekly prices').sort((a, b) => (a.date < b.date ? -1 : 1))) { if (x.price != null) { pw.set(weekKey(x.date), x); prev = x; } else if (prev && weekKey(x.date) !== weekKey(prev.date)) pw.set(weekKey(x.date), { ...prev, carried: true }); }
    const eW = new Map(need(wk.ebitda, 'weekly EBITDA').map((x) => [weekKey(x.estimateDate), x]));
    const history = need(wk.eps, 'weekly EPS').filter((x) => x.estimateDate <= last.date).sort((a, b) => (a.estimateDate < b.estimateDate ? -1 : 1)).map((x) => {
      const k = weekKey(x.estimateDate); const p = pw.get(k); const e = eW.get(k); const b = bsAt(x.estimateDate);
      if (!p || !e || !b) return null;
      return [x.estimateDate, r(p.price, 4), r(sharesAt(x.estimateDate), 4), r(e.mean, 3), r(x.mean, 4), b.netDebt, b.minority];
    }).filter(Boolean);
    companies[id] = {
      ...meta, ticker: id, asOf: last.date, priceDate: last.date, price: last.price, volume: last.volume ?? null,
      priceUsd: usdLast ? usdLast.price : null, priceUsdDate: usdLast ? usdLast.date : null,
      mktCapM: r(m.currentMarketValue, 3), mktCapDate: m.date, sharesM: r(sharesNowM, 4),
      sharesNote: id === 'GAPB-MX' ? 'B + BB from site/gap/data/reference.js (FactSet shares_outstanding lists the series B only)' : `shares_outstanding ${r(shLatest, 3)} M scaled x${r(scale, 4)} to the all-class count behind currentMarketValue`,
      adtv: adtvRows.length ? { from: adtvRows[0].date, to: adtvRows[adtvRows.length - 1].date, days: adtvRows.length, usdM: r(mean(adtvRows.map((x) => x.turnover)) / 1000, 3), avgVolume: r(mean(adtvRows.map((x) => x.volume)), 0), avgVwapUsd: r(mean(adtvRows.map((x) => x.vwap)), 4) } : null,
      ltm: { period: lt[0].fiscalEndDate, basis: meta.ltm, sales: lv('FF_SALES'), ebitda: lv('FF_EBITDA_OPER'), netIncome: lv('FF_NET_INC'), ebitdaMarginPct: lv('FF_EBITDA_OPER_MGN'), ffPe: lv('FF_PE') },
      bs: { period: bsNow.period, reported: bsNow.reported, netDebt: bsNow.netDebt, minorityInterest: bsNow.minority },
      ntm: { estimateDate: (ntm.ebitda[id] && ntm.ebitda[id][0].estimateDate) || null, sales: ntmOf('sales'), ebitda: ntmOf('ebitda'), eps: ntmOf('eps') },
      iad: iad[id] && iad[id][0] && iad[id][0].iadDefTradingAdj != null ? { value: iad[id][0].iadDefTradingAdj, effectiveDate: iad[id][0].effectiveDate } : null,
      target: tgt[id] && tgt[id][0] ? { ...stat(tgt[id][0]), up: tgt[id][0].up ?? null, down: tgt[id][0].down ?? null } : null,
      ratings: rat[id] && rat[id][0] ? { buy: rat[id][0].buyCount, overweight: rat[id][0].overweightCount, hold: rat[id][0].holdCount, underweight: rat[id][0].underweightCount, sell: rat[id][0].sellCount, total: rat[id][0].ratingsNestTotal, note: rat[id][0].ratingsNote ?? null, text: rat[id][0].ratingsNoteText ?? null } : null,
      fy: id === 'GAPB-MX' && fy.ebitda.length ? Object.fromEntries([...new Set(fy.ebitda.map((x) => x.fiscalYear))].sort().map((y) => [String(y), Object.fromEntries(['sales', 'ebitda', 'eps'].map((k) => { const x = fy[k].find((z) => z.fiscalYear === y); return [k, x ? { ...stat(x), up: x.up ?? null, down: x.down ?? null } : null]; }))])) : null,
      historyColumns: ['date', 'price', 'sharesM', 'ntmEbitda', 'ntmEps', 'netDebt', 'minority'],
      history, balanceSheets,
    };
  }
  const snap = {
    pulledAt: runDate, runDate, source: 'FactSet AI-Ready Data connector (MCP): GlobalPrices, Fundamentals, EstimatesConsensus',
    pricesAsOf: companies['GAPB-MX'].priceDate, estimateDate: companies['GAPB-MX'].ntm.estimateDate,
    history: { frequency: 'weekly', windows: WINDOWS, from: companies['GAPB-MX'].history[0] && companies['GAPB-MX'].history[0][0], to: companies['GAPB-MX'].history.slice(-1)[0] && companies['GAPB-MX'].history.slice(-1)[0][0] },
    adtvWindow: { from: adtvFrom, to: runDate },
    notes: [
      'price = last completed close on or before the run date (ET), local currency; priceDate per company (Auckland trades a day ahead).',
      'mktCapM = FactSet currentMarketValue (all share classes); sharesM = mktCapM / price.',
      'history = weekly rows [date, price, sharesM, ntmEbitda, ntmEps, netDebt, minority]: consensus_rolling NTMA sampled on Fridays (frequency W) joined with the close of the same week (prices, frequency W; a holiday Friday carries the previous week\'s close), the shares then outstanding (shares_outstanding AM scaled to the all-class count; GAP from reference.js) and the latest balance sheet already reported (epsReportDate on or before the Friday).',
      'adtv = daily turnover (volume x VWAP, USD thousands in FactSet) averaged over the last three months, in US$ millions; avgVolume and avgVwapUsd kept for the product-of-averages variant.',
    ],
    companies,
  };
  writeFileSync(out, JSON.stringify(snap));
  return snap;
}

// ---------------------------------------------------------------- build
function rowOf(c, snap) {
  const fx = div(c.priceUsd, c.price);
  const ev = c.mktCapM + (c.bs.netDebt || 0) + (c.bs.minorityInterest || 0);
  const nm = (k) => (c.ntm && c.ntm[k] ? c.ntm[k].mean : null);
  const series = (c.history || []).map(([date, price, sharesM, ntmEbitda, ntmEps, netDebt, minority]) => {
    const evH = price * sharesM + (netDebt || 0) + (minority || 0);
    return [date, r(div(evH, ntmEbitda)), ntmEps > 0 ? r(div(price, ntmEps)) : null];
  });
  // window = the last n weeks by date (ending at the latest point); null unless at least 90% of the weeks carry a value
  const avg = (idx, n) => { if (!series.length) return null; const end = new Date(series[series.length - 1][0] + 'T12:00:00Z'); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7 * n + 1); const s0 = start.toISOString().slice(0, 10); const v = series.filter((x) => x[0] >= s0).map((x) => x[idx]).filter((x) => x != null); return v.length >= 0.9 * n ? r(mean(v)) : null; };
  const out = {
    ticker: c.ticker, name: c.name, short: c.short, exchange: c.exchange, currency: c.currency, fyEnd: c.fyEnd, group: c.group,
    asOf: c.priceDate, priceDate: c.priceDate, ltmPeriod: c.ltm.period, ltmBasis: c.ltm.basis,
    price: c.price, priceUsd: c.priceUsd, fxUsd: r(fx, 4), sharesM: r(c.sharesM, 3),
    mktCapM: r(c.mktCapM, 1), mktCapUsdM: r(c.mktCapM * fx, 1),
    netDebtM: r(c.bs.netDebt, 1), minorityM: r(c.bs.minorityInterest, 1), bsPeriod: c.bs.period, evM: r(ev, 1), evUsdM: r(ev * fx, 1),
    adtvUsdM: c.adtv ? c.adtv.usdM : null, adtv: c.adtv ? { ...c.adtv, productUsdM: r(c.adtv.avgVolume * c.adtv.avgVwapUsd / 1e6, 3) } : null,
    ltm: { sales: r(c.ltm.sales, 1), ebitda: r(c.ltm.ebitda, 1), netIncome: r(c.ltm.netIncome, 1), ebitdaMarginPct: r(c.ltm.ebitdaMarginPct, 1), ffPe: r(c.ltm.ffPe, 2) },
    ntm: c.ntm ? { estimateDate: c.ntm.estimateDate, sales: c.ntm.sales, ebitda: c.ntm.ebitda, eps: c.ntm.eps } : null,
    evEbitdaLtm: r(div(ev, c.ltm.ebitda)), evEbitdaNtm: r(div(ev, nm('ebitda'))),
    peLtm: r(div(c.mktCapM, c.ltm.netIncome)), peNtm: r(div(c.price, nm('eps'))),
    evSalesLtm: r(div(ev, c.ltm.sales)), evSalesNtm: r(div(ev, nm('sales'))),
    divYieldPct: c.iad ? r(100 * div(c.iad.value, c.price)) : null, iad: c.iad || null,
    netDebtEbitda: r(div(c.bs.netDebt, c.ltm.ebitda)), ebitdaMarginPct: r(c.ltm.ebitdaMarginPct, 1),
    target: c.target ? { ...c.target, mean: r(c.target.mean), median: r(c.target.median), high: r(c.target.high), low: r(c.target.low), upsidePct: r(100 * (c.target.mean / c.price - 1), 1) } : null,
    ratings: c.ratings || null, fy: c.fy || null,
  };
  for (const [tag, n] of Object.entries(snap.history.windows)) { out['evEbitdaNtmAvg' + tag] = avg(1, n); out['peNtmAvg' + tag] = avg(2, n); }
  out.history = series.length ? { from: series[0][0], to: series[series.length - 1][0], points: series.length, series } : null;
  return out;
}

const METHOD = {
  en: 'EV = market cap (all share classes) + net debt + minority interest at the latest balance sheet reported. NTM = FactSet consensus mean for the next twelve months; LTM = last twelve months reported. P/E on price over NTM EPS (and on market cap over LTM net income). 1-, 3- and 5-year averages = arithmetic mean of the weekly NTM multiple over the last 52 / 156 / 260 weeks (each Friday: that week\'s close x shares then outstanding + the latest balance sheet reported by then, over the consensus sampled that day). ADTV = average daily traded value in US$ millions over the last three months (daily volume x VWAP). Dividend yield = FactSet indicated annual dividend / price. USD at the FX rate implied by FactSet\'s USD close.',
  es: 'VE = capitalización (todas las series) + deuda neta + participación no controladora al último balance publicado. PDM = consenso medio de FactSet para los próximos doce meses; UDM = últimos doce meses reportados. P/U sobre precio entre UPA PDM (y sobre capitalización entre utilidad neta UDM). Promedios de 1, 3 y 5 años = media aritmética del múltiplo PDM semanal en las últimas 52 / 156 / 260 semanas (cada viernes: cierre de la semana × acciones vigentes + último balance publicado a esa fecha, entre el consenso de ese día). VPD = valor promedio diario operado en US$ millones en los últimos tres meses (volumen diario × precio promedio ponderado). Rendimiento por dividendo = dividendo anual indicado por FactSet / precio. Dólares al tipo de cambio implícito en el cierre en USD de FactSet.',
};
const KEYS = ['evEbitdaLtm', 'evEbitdaNtm', 'evEbitdaNtmAvg1y', 'evEbitdaNtmAvg3y', 'evEbitdaNtmAvg5y', 'peLtm', 'peNtm', 'peNtmAvg1y', 'peNtmAvg3y', 'peNtmAvg5y', 'evSalesLtm', 'evSalesNtm', 'divYieldPct', 'netDebtEbitda', 'ebitdaMarginPct', 'adtvUsdM'];

export function build({ snapshot = SNAPSHOT } = {}) {
  const file = existsSync(snapshot) ? snapshot : join(RAW_DIR, readdirSync(RAW_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop());
  const snap = JSON.parse(readFileSync(file, 'utf8'));
  if (!snap.history || !snap.history.windows) throw new Error(`${file}: not a routine snapshot (no history.windows); run ingest first`);
  const rows = Object.fromEntries(IDS.map((id) => [id, rowOf(snap.companies[id], snap)]));
  const med = (list) => Object.fromEntries(KEYS.map((k) => [k, r(median(list.map((p) => p[k])))]));
  const written = [];
  for (const slug of PAGES) {
    const ownId = IDS.find((id) => COMPANIES[id].slug === slug);
    const own = rows[ownId];
    const peers = IDS.filter((id) => id !== ownId).map((id) => rows[id]);
    const medians = { all: med(peers), mexico: med(peers.filter((p) => p.group === 'mexico')), international: med(peers.filter((p) => p.group === 'international')) };
    const out = {
      updatedAt: snap.pulledAt, runDate: snap.runDate, pricesAsOf: own.priceDate, priceDates: Object.fromEntries(IDS.map((id) => [id, rows[id].priceDate])),
      estimateDate: snap.estimateDate, balanceSheetsAt: Object.fromEntries(IDS.map((id) => [id, rows[id].bsPeriod])),
      source: 'FactSet', sourceDetail: snap.source, rawFile: 'tools/gap/raw/factset/' + file.split('/').pop(),
      history: { ...snap.history, from: own.history && own.history.from, to: own.history && own.history.to, points: own.history && own.history.points },
      adtvWindow: snap.adtvWindow, method: METHOD, notes: snap.notes,
      own, ...(slug === 'gap' ? { gap: own } : {}), peers, medians,
    };
    const prefix = COMPANIES[ownId].prefix;
    const header = `// AUTO-GENERATED by scripts/lib/factset-peers.mjs from ${out.rawFile} — do not hand-edit.\n// FactSet pull of ${snap.pulledAt}: closes through ${own.priceDate}, consensus of ${snap.estimateDate}; refreshed nightly by the cloud routine.\n`;
    const line = (k, v) => `  ${JSON.stringify(k)}: ${Array.isArray(v) ? '[\n' + v.map((x) => '    ' + JSON.stringify(x)).join(',\n') + '\n  ]' : JSON.stringify(v)}`;
    const target = join(ROOT, `site/${slug}/data/peers.js`);
    writeFileSync(target, header + `window.${prefix}_PEERS = {\n` + Object.entries(out).map(([k, v]) => line(k, v)).join(',\n') + '\n};\n');
    written.push(target);
  }
  return { file, rows, written };
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  if (cmd === 'ingest') {
    const snap = ingest({ pull: a.pull ? join(process.cwd(), a.pull) : PULL_DIR, out: a.out ? join(process.cwd(), a.out) : SNAPSHOT, date: a.date });
    console.log(`ingest: ${snap.runDate}; prices through ${snap.pricesAsOf}; consensus ${snap.estimateDate}; history ${snap.history.from} → ${snap.history.to}`);
    for (const id of IDS) { const c = snap.companies[id]; console.log(`${id.padEnd(9)} close ${c.priceDate} ${c.price} ${c.currency}  mcap ${c.mktCapM} M  shares ${c.sharesM} M  bs ${c.bs.period}  ntm ${c.ntm.estimateDate}  weeks ${c.history.length}  adtv US$${c.adtv && c.adtv.usdM} M (${c.adtv && c.adtv.days} d)`); }
  } else if (cmd === 'build') {
    const { file, rows, written } = build({ snapshot: a.snapshot ? join(process.cwd(), a.snapshot) : SNAPSHOT });
    console.log(`build: ${file.split('/').pop()} → ${written.map((w) => w.replace(ROOT + '/', '')).join(', ')}`);
    for (const p of Object.values(rows)) console.log(`${p.short.padEnd(9)} ${p.priceDate} ${p.currency} ${p.price}  mcap US$${String(p.mktCapUsdM).padStart(8)} M  ADTV US$${p.adtvUsdM} M  EV/EBITDA NTM ${p.evEbitdaNtm}x (1y ${p.evEbitdaNtmAvg1y}, 3y ${p.evEbitdaNtmAvg3y}, 5y ${p.evEbitdaNtmAvg5y})  P/E NTM ${p.peNtm}x (1y ${p.peNtmAvg1y}, 3y ${p.peNtmAvg3y}, 5y ${p.peNtmAvg5y})  yld ${p.divYieldPct}%  ND/EBITDA ${p.netDebtEbitda}x`);
  } else {
    console.error('usage: node scripts/lib/factset-peers.mjs ingest [--pull DIR] [--out FILE] [--date YYYY-MM-DD] | build [--snapshot FILE]');
    process.exit(2);
  }
}
