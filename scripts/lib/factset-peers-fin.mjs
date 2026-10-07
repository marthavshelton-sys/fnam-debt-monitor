// FactSet peers for the financial models (Quálitas, Gentera): one joint pull, two snapshots, two peers.js files.
//
//   node scripts/lib/factset-peers-fin.mjs ingest [--pull DIR] [--date YYYY-MM-DD]
//       Reads the raw results of the FactSet AI-Ready Data connector calls saved in DIR (one JSON file per call,
//       names below; default tools/qualitas/raw/factset/pull, gitignored) and writes one snapshot per page:
//       tools/qualitas/raw/factset/latest.json and tools/gentera/raw/factset/latest.json.
//   node scripts/lib/factset-peers-fin.mjs build
//       Writes site/qualitas/data/peers.js, site/qualitas/data/consensus.js and site/gentera/data/peers.js from the snapshots.
//
// An insurer and a bank are compared on NTM P/E and P/BV (EV/EBITDA has no meaning for them), each with 1-, 3- and 5-year
// averages of the weekly series, plus ROE, dividend yield, ADTV and one sector ratio (combined ratio for the insurers, NPL
// ratio for the banks). The connector cannot run FactSet's FQL items, so every figure is assembled from the series it does
// expose; each one is named here and in the runbooks (tools/qualitas/README.md, tools/gentera/README.md). No FactSet
// credentials exist in GitHub Actions: the pull is made from a Claude session (routine prompt in
// tools/qualitas/FACTSET-PEERS-PROMPT.md), then `ingest` and `build` run and the result is pushed.
//
// Pull files (all in DIR; `data` = the connector's rows; IDS = the eleven companies of both pages):
//   prices-recent-local.json   GlobalPrices prices, D, LOCAL, last ~7 days: price, volume → price at the common close date
//   prices-usd-3m.json         GlobalPrices prices, D, USD, last 3 months: price, volume, vwap, turnover → priceUsd, ADTV
//   market-value.json          GlobalPrices market_value (currentMarketValue, millions; a cross-check only: Credicorp's comes in PEN)
//   dividends.json             GlobalPrices annualized_dividends, LOCAL (iadDefTradingAdj)
//   ntm-eps.json               EstimatesConsensus consensus_rolling EPS, NTMA, currency ESTIMATE, no dates (latest consensus)
//   eps-ntm-weekly.json        the same, startDate five years back, endDate today, frequency W (pulled in batches of 2–4 ids)
//   ntm-eps-usd.json, eps-ntm-weekly-usd.json, price-targets-usd.json   the same three for BAP-US with currency USD (its brokers
//                              estimate in soles; the ADR trades in dollars, so the USD-converted consensus prices the multiple)
//   prices-weekly.json         GlobalPrices prices, W, LOCAL, five years: price
//   shares-monthly.json        GlobalPrices shares_outstanding, AM, five years (totalOutstanding, millions)
//   bs-qtr.json, bs-semi.json  Fundamentals FF_BPS, QTR (ADM-GB: SEMI), five years and a half: book value per share with its report date
//   map-semi.json, map-ann.json   MAP-ES: FactSet holds Mapfre's interim statements only from 2024 (SEMI) and its annual ones before
//                              (ANN); FF_BPS, FF_ROE, FF_LOSS_EXP_RATIO, FF_EPS, FF_NET_INC, FF_PE
//   ltm.json                   Fundamentals FF_EPS, FF_PE, FF_LOSS_EXP_RATIO, FF_NET_INC, periodicity LTM (ADM-GB: LTM_SEMI), latest
//   ratios-qtr.json            Fundamentals FF_ROE, FF_NONPERF_LOAN_PCT, FF_LOSS_EXP_RATIO, FF_EPS, FF_NET_INC, QTR (ADM-GB: SEMI),
//                              latest period (FF_ROE and FF_NONPERF_LOAN_PCT answer only under QTR/SEMI, never under LTM)
//   price-targets.json         EstimatesConsensus consensus_rolling PRICE_TGT (0/0), currency ESTIMATE
//   ratings.json               EstimatesConsensus ratings
//   fy-consensus.json          EstimatesConsensus consensus_fixed ANN for Q-MX and GENTERA-MX: EPS, BPS, DPS, NET_INC, FY2026–FY2027
//
// Definitions (trading currency, millions, except per-share and ratios):
//   sharesM        FactSet shares_outstanding (latest monthly observation, one share class for every company here).
//   mktCapM        sharesM × the close at the common date; mktCapUsdM = sharesM × the USD close.
//   peNtm          price / consensus NTM EPS mean (FE_VALUATION(PE, MEAN, NTM4_ROLL) equivalent); peLtm = price / LTM EPS (FF_EPS, LTM).
//   pbv            price / book value per share of the latest balance sheet reported (FF_BPS, by report date).
//   *Avg1y/3y/5y   arithmetic mean of the weekly series over the last 52 / 156 / 260 weeks: each Friday, that week's close over the
//                  consensus sampled that day (P/E) or over the latest FF_BPS reported by then (P/BV).
//   adtvUsdM       average daily traded value, US$ millions: mean of FactSet's daily turnover (volume × VWAP, USD) over the last three months.
//   divYieldPct    FactSet indicated annual dividend / price. roePct = FF_ROE of the latest quarter (LTM income over average equity).
//   combinedRatioPct = FF_LOSS_EXP_RATIO (insurers, latest quarter; LTM in ltm when FactSet carries it); nplPct = FF_NONPERF_LOAN_PCT (banks).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const PULL_DIR = join(ROOT, 'tools/qualitas/raw/factset/pull');
const SNAPSHOT = (slug) => join(ROOT, `tools/${slug}/raw/factset/latest.json`);

export const COMPANIES = {
  'Q-MX': { slug: 'qualitas', prefix: 'Q', name: 'Quálitas Controladora', short: 'Quálitas', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'own', sector: 'insurance', bs: 'QTR', ltm: 'LTM' },
  'PGR-US': { name: 'Progressive', short: 'Progressive', exchange: 'NYSE', currency: 'USD', fyEnd: '12-31', group: 'international', sector: 'insurance', bs: 'QTR', ltm: 'LTM' },
  'ALL-US': { name: 'Allstate', short: 'Allstate', exchange: 'NYSE', currency: 'USD', fyEnd: '12-31', group: 'international', sector: 'insurance', bs: 'QTR', ltm: 'LTM' },
  'PSSA3-BR': { name: 'Porto Seguro', short: 'Porto Seguro', exchange: 'B3', currency: 'BRL', fyEnd: '12-31', group: 'international', sector: 'insurance', bs: 'QTR', ltm: 'LTM' },
  'MAP-ES': { name: 'Mapfre', short: 'Mapfre', exchange: 'BME', currency: 'EUR', fyEnd: '12-31', group: 'international', sector: 'insurance', bs: 'SEMI', ltm: 'LTM_SEMI' },
  'ADM-GB': { name: 'Admiral Group', short: 'Admiral', exchange: 'LSE', currency: 'GBP', fyEnd: '12-31', group: 'international', sector: 'insurance', bs: 'SEMI', ltm: 'LTM_SEMI' },
  'GENTERA-MX': { slug: 'gentera', prefix: 'G', name: 'Gentera', short: 'Gentera', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'own', sector: 'bank', bs: 'QTR', ltm: 'LTM' },
  'GFNORTEO-MX': { name: 'Grupo Financiero Banorte', short: 'Banorte', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'mexico', sector: 'bank', bs: 'QTR', ltm: 'LTM' },
  'RA-MX': { name: 'Regional', short: 'Regional', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'mexico', sector: 'bank', bs: 'QTR', ltm: 'LTM' },
  'BBAJIOO-MX': { name: 'Banco del Bajío', short: 'BanBajío', exchange: 'BMV', currency: 'MXN', fyEnd: '12-31', group: 'mexico', sector: 'bank', bs: 'QTR', ltm: 'LTM' },
  'BAP-US': { name: 'Credicorp', short: 'Credicorp', exchange: 'NYSE', currency: 'USD', fyEnd: '12-31', group: 'international', sector: 'bank', bs: 'QTR', ltm: 'LTM', usdConsensus: true },
};
export const PAGES = {
  qualitas: { own: 'Q-MX', peers: ['PGR-US', 'ALL-US', 'PSSA3-BR', 'MAP-ES', 'ADM-GB'], groups: ['international'] },
  gentera: { own: 'GENTERA-MX', peers: ['GFNORTEO-MX', 'RA-MX', 'BBAJIOO-MX', 'BAP-US'], groups: ['mexico', 'international'] },
};
export const IDS = Object.keys(COMPANIES);
export const WINDOWS = { '1y': 52, '3y': 156, '5y': 260 }; // weeks

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
const sortDate = (k) => (a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0);

export function ingest({ pull = PULL_DIR, date } = {}) {
  const runDate = date || todayET();
  const recent = byId(readPull(pull, 'prices-recent-local.json'));
  const usd = byId(readPull(pull, 'prices-usd-3m.json'));
  const mv = byId(readPull(pull, 'market-value.json'));
  const iad = byId(readPull(pull, 'dividends.json'));
  const ntmLocal = byId(readPull(pull, 'ntm-eps.json')), ntmUsd = byId(readPull(pull, 'ntm-eps-usd.json', false));
  const wkLocal = byId(readPull(pull, 'eps-ntm-weekly.json')), wkUsd = byId(readPull(pull, 'eps-ntm-weekly-usd.json', false));
  const pxW = byId(readPull(pull, 'prices-weekly.json'));
  const shM = byId(readPull(pull, 'shares-monthly.json'));
  const fund = [...readPull(pull, 'bs-qtr.json'), ...readPull(pull, 'bs-semi.json'), ...readPull(pull, 'map-semi.json', false), ...readPull(pull, 'map-ann.json', false), ...readPull(pull, 'ratios-qtr.json')];
  const bps = byId(fund.filter((x) => x.metric === 'FF_BPS'));
  const ratios = byId(readPull(pull, 'ratios-qtr.json'));
  const mapSemi = byId(readPull(pull, 'map-semi.json', false));
  const ltm = byId(readPull(pull, 'ltm.json'));
  const fy = readPull(pull, 'fy-consensus.json', false);
  const tgtLocal = byId(readPull(pull, 'price-targets.json', false)), tgtUsd = byId(readPull(pull, 'price-targets-usd.json', false));
  const rat = byId(readPull(pull, 'ratings.json', false));
  const adtvFrom = addMonths(runDate, -3);
  // one close date for the whole table: the latest date on or before the run date on which every company has a close
  const closesOf = (id) => (recent[id] || []).filter((x) => x.price != null && x.date <= runDate).map((x) => x.date);
  const commonDate = IDS.map(closesOf).reduce((acc, ds) => acc.filter((d) => ds.includes(d)), closesOf(IDS[0])).sort().pop();
  if (!commonDate) throw new Error('no date on which every company has a close');
  const companies = {};
  for (const id of IDS) {
    const meta = COMPANIES[id];
    const need = (m, what) => { if (!m[id] || !m[id].length) throw new Error(`${id}: no ${what}`); return m[id]; };
    const closes = need(recent, 'recent prices').filter((x) => x.price != null && x.date <= commonDate).sort(sortDate('date'));
    const last = closes[closes.length - 1]; // the common date, or the last close before it
    if (last.currency !== meta.currency) throw new Error(`${id}: close in ${last.currency}, expected ${meta.currency}`);
    const usdRows = need(usd, 'USD prices').filter((x) => x.price != null && x.date <= runDate).sort(sortDate('date'));
    const usdLast = usdRows.filter((x) => x.date <= last.date).pop();
    const adtvRows = usdRows.filter((x) => x.date >= adtvFrom && x.turnover != null && x.volume != null && x.vwap != null);
    const m = (mv[id] || [])[0] || null;
    // book value per share by report date (the figure a reader could have known on a given Friday)
    const bvRows = (bps[id] || []).filter((x) => x.value != null && x.fiscalEndDate).map((x) => ({ period: x.fiscalEndDate, reported: x.epsReportDate || x.reportDate || x.fiscalEndDate, value: x.value, basis: x.periodicity }));
    const bvByPeriod = new Map(); for (const b of bvRows.sort((a, b) => (a.period < b.period ? -1 : 1))) if (!bvByPeriod.has(b.period) || b.basis !== 'ANN') bvByPeriod.set(b.period, b); // a semi-annual figure wins over the annual one for the same period
    const bookValues = [...bvByPeriod.values()].sort((a, b) => (a.reported < b.reported ? -1 : 1));
    if (!bookValues.length) throw new Error(`${id}: no book value per share`);
    const bvAt = (d) => bookValues.filter((b) => b.reported <= d).pop() || null;
    const bvNow = bvAt(last.date);
    if (!bvNow) throw new Error(`${id}: no book value reported by ${last.date}`);
    const lt = ltm[id] || []; const lv = (k) => { const x = lt.find((y) => y.metric === k); return x ? x.value : null; };
    // latest-quarter ratios; Mapfre's come from its semi-annual series (its QTR rows are empty in FactSet)
    const ms0 = (mapSemi[id] || []).filter((x) => x.value != null).sort(sortDate('fiscalEndDate'));
    const rq = (ratios[id] || []).filter((y) => y.value != null).length ? ratios[id] : ms0.filter((x) => x.fiscalEndDate === ms0[ms0.length - 1].fiscalEndDate);
    const rv = (k) => { const x = rq.find((y) => y.metric === k); return x ? x.value : null; };
    // Mapfre: FactSet carries no LTM line, so LTM EPS and net income are the sum of the last two half-years
    const ms = mapSemi[id] || []; const semiSum = (k) => { const v = ms.filter((x) => x.metric === k && x.value != null).sort(sortDate('fiscalEndDate')).slice(-2); return v.length === 2 ? v[0].value + v[1].value : null; };
    const ltmEps = lv('FF_EPS') != null ? lv('FF_EPS') : semiSum('FF_EPS');
    const ltmNi = lv('FF_NET_INC') != null ? lv('FF_NET_INC') : semiSum('FF_NET_INC');
    const ltmPeriod = (lt[0] && lt[0].fiscalEndDate) || (ms.length ? ms.map((x) => x.fiscalEndDate).sort().pop() : null);
    const ntm = (meta.usdConsensus ? ntmUsd : ntmLocal)[id] && (meta.usdConsensus ? ntmUsd : ntmLocal)[id][0];
    if (!ntm) throw new Error(`${id}: no NTM consensus`);
    const shRows = need(shM, 'shares').filter((x) => x.totalOutstanding != null).sort(sortDate('date'));
    const sharesNowM = shRows[shRows.length - 1].totalOutstanding;
    const sharesAt = (d) => { let v = shRows[0].totalOutstanding; for (const x of shRows) if (x.date <= d) v = x.totalOutstanding; return v; };
    // weekly history: consensus Fridays joined with that week's close (a holiday Friday carries the previous week's close) and the
    // latest book value reported by then
    const pw = new Map(); let prev = null;
    for (const x of need(pxW, 'weekly prices').sort(sortDate('date'))) { if (x.price != null) { pw.set(weekKey(x.date), x); prev = x; } else if (prev && weekKey(x.date) !== weekKey(prev.date)) pw.set(weekKey(x.date), { ...prev, carried: true }); }
    const wk = (meta.usdConsensus ? wkUsd : wkLocal)[id]; if (!wk || !wk.length) throw new Error(`${id}: no weekly EPS consensus`);
    const history = wk.filter((x) => x.estimateDate <= last.date).sort(sortDate('estimateDate')).map((x) => {
      const p = pw.get(weekKey(x.estimateDate)); const b = bvAt(x.estimateDate);
      if (!p) return null;
      return [x.estimateDate, r(p.price, 4), r(x.mean, 4), b ? b.value : null, r(sharesAt(x.estimateDate), 4)];
    }).filter(Boolean);
    const tgtRow = ((meta.usdConsensus ? tgtUsd : tgtLocal)[id] || [])[0] || null;
    const fyRows = fy.filter((x) => x.requestId === id);
    companies[id] = {
      ...meta, ticker: id, asOf: last.date, priceDate: last.date, price: last.price, volume: last.volume ?? null,
      priceUsd: usdLast ? usdLast.price : null, priceUsdDate: usdLast ? usdLast.date : null,
      sharesM: r(sharesNowM, 4), sharesDate: shRows[shRows.length - 1].date,
      mktCapM: r(sharesNowM * last.price, 3), mktCapUsdM: usdLast ? r(sharesNowM * usdLast.price, 3) : null,
      mktCapFactSet: m ? { value: r(m.currentMarketValue, 3), currency: m.currency, date: m.date } : null,
      adtv: adtvRows.length ? { from: adtvRows[0].date, to: adtvRows[adtvRows.length - 1].date, days: adtvRows.length, usdM: r(mean(adtvRows.map((x) => x.turnover)) / 1000, 3), avgVolume: r(mean(adtvRows.map((x) => x.volume)), 0), avgVwapUsd: r(mean(adtvRows.map((x) => x.vwap)), 4) } : null,
      ltm: { period: ltmPeriod, basis: meta.ltm, eps: ltmEps, netIncome: ltmNi, ffPe: lv('FF_PE'), combinedRatioPct: lv('FF_LOSS_EXP_RATIO') },
      bookValue: { period: bvNow.period, reported: bvNow.reported, value: bvNow.value, basis: bvNow.basis },
      quarter: { period: rq[0] ? rq[0].fiscalEndDate : null, reported: rq[0] ? rq[0].epsReportDate : null, roePct: rv('FF_ROE'), nplPct: rv('FF_NONPERF_LOAN_PCT'), combinedRatioPct: rv('FF_LOSS_EXP_RATIO') },
      ntm: { estimateDate: ntm.estimateDate, currency: ntm.currency && ntm.currency !== 'ESTIMATE' ? ntm.currency : ntm.estimateCurrency, eps: stat(ntm) },
      iad: iad[id] && iad[id][0] && iad[id][0].iadDefTradingAdj != null ? { value: iad[id][0].iadDefTradingAdj, effectiveDate: iad[id][0].effectiveDate } : null,
      target: tgtRow ? { ...stat(tgtRow), up: tgtRow.up ?? null, down: tgtRow.down ?? null, currency: tgtRow.currency && tgtRow.currency !== 'ESTIMATE' ? tgtRow.currency : tgtRow.estimateCurrency } : null,
      ratings: rat[id] && rat[id][0] ? { buy: rat[id][0].buyCount, overweight: rat[id][0].overweightCount, hold: rat[id][0].holdCount, underweight: rat[id][0].underweightCount, sell: rat[id][0].sellCount, total: rat[id][0].ratingsNestTotal, note: rat[id][0].ratingsNote, text: rat[id][0].ratingsNoteText, estimateDate: rat[id][0].estimateDate } : null,
      fy: fyRows.length ? Object.fromEntries([...new Set(fyRows.map((x) => x.fiscalYear))].sort().map((y) => [String(y), Object.fromEntries(fyRows.filter((x) => x.fiscalYear === y).map((x) => [x.metric.toLowerCase(), { ...stat(x), up: x.up ?? null, down: x.down ?? null }]))])) : null,
      historyColumns: ['date', 'price', 'ntmEps', 'bvps', 'sharesM'],
      history, bookValues,
    };
  }
  const written = [];
  for (const [slug, pg] of Object.entries(PAGES)) {
    const ids = [pg.own, ...pg.peers];
    const own = companies[pg.own];
    const snap = {
      page: slug, pulledAt: runDate, runDate, source: 'FactSet AI-Ready Data connector (MCP): GlobalPrices, Fundamentals, EstimatesConsensus',
      pricesAsOf: commonDate, estimateDate: own.ntm.estimateDate,
      history: { frequency: 'weekly', windows: WINDOWS, from: own.history[0] && own.history[0][0], to: own.history.slice(-1)[0] && own.history.slice(-1)[0][0] },
      adtvWindow: { from: adtvFrom, to: runDate },
      notes: [
        'pricesAsOf = the latest date on or before the run date (ET) with a close for every company; price = that close in the trading currency (a company closed that day takes its last close before it, and priceDate says so).',
        'sharesM = FactSet shares_outstanding, latest monthly observation; mktCapM = sharesM x the close at pricesAsOf (mktCapFactSet keeps FactSet currentMarketValue as a cross-check; Credicorp reports it in soles).',
        'history = weekly rows [date, price, ntmEps, bvps, sharesM]: consensus_rolling NTMA EPS sampled on Fridays (frequency W) joined with the close of the same week (prices, frequency W; a holiday Friday carries the previous week\'s close) and the latest FF_BPS reported by that Friday. Credicorp\'s consensus is FactSet\'s USD conversion of estimates made in soles.',
        'adtv = daily turnover (volume x VWAP, USD thousands in FactSet) averaged over the last three months, in US$ millions.',
      ],
      companies: Object.fromEntries(ids.map((id) => [id, companies[id]])),
    };
    const out = SNAPSHOT(slug); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(snap)); written.push(out);
  }
  return { companies, commonDate, written };
}

// ---------------------------------------------------------------- build
function rowOf(c, snap, ownId) {
  const fx = div(c.priceUsd, c.price);
  const series = (c.history || []).map(([date, price, ntmEps, bvps]) => [date, ntmEps > 0 ? r(div(price, ntmEps)) : null, bvps > 0 ? r(div(price, bvps)) : null]);
  // window = the last n weeks by date (ending at the latest point); null unless at least 90% of the weeks carry a value
  const avg = (idx, n) => { if (!series.length) return null; const end = new Date(series[series.length - 1][0] + 'T12:00:00Z'); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7 * n + 1); const s0 = start.toISOString().slice(0, 10); const v = series.filter((p) => p[0] >= s0).map((p) => p[idx]); const ok = v.filter((x) => x != null); return ok.length >= 0.9 * n ? r(mean(ok)) : null; };
  const out = {
    ticker: c.ticker, name: c.name, short: c.short, exchange: c.exchange, currency: c.currency, fyEnd: c.fyEnd, group: c.ticker === ownId ? 'own' : c.group, sector: c.sector,
    asOf: c.priceDate, priceDate: c.priceDate, ltmPeriod: c.ltm.period, ltmBasis: c.ltm.basis,
    price: c.price, priceUsd: c.priceUsd, fxUsd: r(fx, 4), sharesM: r(c.sharesM, 3), sharesDate: c.sharesDate,
    mktCapM: r(c.mktCapM, 1), mktCapUsdM: r(c.mktCapUsdM, 1), mktCapFactSet: c.mktCapFactSet,
    adtvUsdM: c.adtv ? c.adtv.usdM : null, adtv: c.adtv || null,
    ltm: { eps: r(c.ltm.eps, 4), netIncome: r(c.ltm.netIncome, 1), ffPe: r(c.ltm.ffPe, 2), combinedRatioPct: r(c.ltm.combinedRatioPct, 1) },
    bookValue: { ...c.bookValue, value: r(c.bookValue.value, 4) }, bsPeriod: c.bookValue.period,
    quarter: { ...c.quarter, roePct: r(c.quarter.roePct, 1), nplPct: r(c.quarter.nplPct, 2), combinedRatioPct: r(c.quarter.combinedRatioPct, 1) },
    ntm: c.ntm, ntmCurrency: c.ntm.currency,
    peLtm: r(div(c.price, c.ltm.eps)), peNtm: r(div(c.price, c.ntm.eps.mean)), pbv: r(div(c.price, c.bookValue.value)),
    divYieldPct: c.iad ? r(100 * div(c.iad.value, c.price)) : null, iad: c.iad || null,
    roePct: r(c.quarter.roePct, 1), combinedRatioPct: c.sector === 'insurance' ? r(c.quarter.combinedRatioPct, 1) : null, nplPct: c.sector === 'bank' ? r(c.quarter.nplPct, 2) : null,
    target: c.target ? { ...c.target, mean: r(c.target.mean), median: r(c.target.median), high: r(c.target.high), low: r(c.target.low), upsidePct: r(100 * (c.target.mean / c.price - 1), 1) } : null,
    ratings: c.ratings || null, fy: c.fy || null,
  };
  for (const [tag, n] of Object.entries(snap.history.windows)) { out['peNtmAvg' + tag] = avg(1, n); out['pbvAvg' + tag] = avg(2, n); }
  out.history = series.length ? { from: series[0][0], to: series[series.length - 1][0], points: series.length, series } : null;
  return out;
}

const METHOD = {
  en: 'NTM = FactSet consensus mean for the next twelve months; LTM = last twelve months reported. P/E on price over NTM EPS (and over LTM EPS); P/BV on price over the book value per share of the latest balance sheet reported. 1-, 3- and 5-year averages = arithmetic mean of the weekly multiple over the last 52 / 156 / 260 weeks (each Friday: that week\'s close over the consensus sampled that day, or over the latest book value reported by then). ADTV = average daily traded value in US$ millions over the last three months (daily volume × VWAP). Dividend yield = FactSet indicated annual dividend / price. ROE = FactSet return on average equity of the latest quarter (LTM income). Combined ratio = FactSet loss and expense ratios combined; NPL = non-performing loans / gross loans, latest quarter. Market cap = shares outstanding × price; USD at FactSet\'s USD close.',
  es: 'PDM = consenso medio de FactSet para los próximos doce meses; UDM = últimos doce meses reportados. P/U sobre precio entre UPA PDM (y entre UPA UDM); P/VL sobre precio entre el valor en libros por acción del último balance publicado. Promedios de 1, 3 y 5 años = media aritmética del múltiplo semanal en las últimas 52 / 156 / 260 semanas (cada viernes: cierre de la semana entre el consenso de ese día, o entre el último valor en libros publicado a esa fecha). VPD = valor promedio diario operado en US$ millones en los últimos tres meses (volumen diario × precio promedio ponderado). Rendimiento por dividendo = dividendo anual indicado por FactSet / precio. ROE = retorno sobre capital promedio de FactSet del último trimestre (utilidad UDM). Índice combinado = siniestralidad más gastos sobre primas según FactSet; cartera vencida = cartera vencida / cartera bruta, último trimestre. Capitalización = acciones en circulación × precio; dólares al cierre en USD de FactSet.',
};
const KEYS = ['peLtm', 'peNtm', 'peNtmAvg1y', 'peNtmAvg3y', 'peNtmAvg5y', 'pbv', 'pbvAvg1y', 'pbvAvg3y', 'pbvAvg5y', 'divYieldPct', 'roePct', 'combinedRatioPct', 'nplPct', 'adtvUsdM'];
const SECTOR_NOTE = {
  qualitas: { es: 'No hay comparables mexicanos líquidos (GNP y las demás aseguradoras nacionales no tienen bursatilidad): los pares son aseguradoras de autos y multirramo de Estados Unidos, Brasil, España y el Reino Unido. Mapfre: FactSet sólo conserva sus estados intermedios desde 2024 (los promedios largos de P/VL usan el valor en libros anual). Admiral y Mapfre publican balances semestrales. El dividendo indicado de Progressive incluye su dividendo anual variable.', en: 'There are no liquid Mexican comparables (GNP and the other domestic insurers are illiquid): the peers are motor and multi-line insurers from the United States, Brazil, Spain and the United Kingdom. Mapfre: FactSet keeps its interim statements only from 2024 (the long P/BV averages use the annual book value). Admiral and Mapfre publish semi-annual balance sheets. Progressive\'s indicated dividend includes its variable annual dividend.' },
  gentera: { es: 'Pares provisionales: los bancos mexicanos listados y Credicorp (dueño de Mibanco, la mayor microfinanciera de Perú); ninguno es una microfinanciera pura. El consenso de Credicorp se estima en soles y FactSet lo convierte a dólares, la moneda en que cotiza el ADR; FactSet no publica la cartera vencida de BanBajío y su último balance cargado es el de diciembre de 2025.', en: 'Placeholder peers: the listed Mexican banks and Credicorp (owner of Mibanco, Perú\'s largest microlender); none is a pure microlender. Credicorp\'s consensus is estimated in soles and converted by FactSet to dollars, the currency its ADR trades in; FactSet carries no NPL ratio for BanBajío and its latest balance sheet loaded is December 2025\'s.' },
};

export function build() {
  const written = [];
  for (const [slug, pg] of Object.entries(PAGES)) {
    const file = SNAPSHOT(slug);
    if (!existsSync(file)) throw new Error(`${file}: no snapshot; run ingest first`);
    const snap = JSON.parse(readFileSync(file, 'utf8'));
    const ids = [pg.own, ...pg.peers];
    const rows = Object.fromEntries(ids.map((id) => [id, rowOf(snap.companies[id], snap, pg.own)]));
    const own = rows[pg.own], peers = pg.peers.map((id) => rows[id]);
    const med = (list) => Object.fromEntries(KEYS.map((k) => [k, r(median(list.map((p) => p[k])))]));
    const medians = { all: med(peers) }; for (const g of pg.groups) medians[g] = med(peers.filter((p) => p.group === g));
    const meta = COMPANIES[pg.own];
    const fyOf = (y) => (own.fy && own.fy[String(y)]) || {};
    const yr = +snap.runDate.slice(0, 4);
    const out = {
      updatedAt: snap.pulledAt, runDate: snap.runDate, pricesAsOf: snap.pricesAsOf, priceDates: Object.fromEntries(ids.map((id) => [id, rows[id].priceDate])),
      estimateDate: snap.estimateDate, balanceSheetsAt: Object.fromEntries(ids.map((id) => [id, rows[id].bsPeriod])),
      source: 'FactSet', sourceDetail: snap.source, rawFile: `tools/${slug}/raw/factset/latest.json`,
      history: { ...snap.history, from: own.history && own.history.from, to: own.history && own.history.to, points: own.history && own.history.points },
      adtvWindow: snap.adtvWindow, method: METHOD, sectorNote: SECTOR_NOTE[slug], notes: snap.notes,
      multiples: ['peNtm', 'pbv'], sectorMetric: meta.sector === 'insurance' ? 'combinedRatioPct' : 'nplPct',
      own, peers, medians,
      // the sell-side consensus block of the page (Gentera's contract: FY1 = the running fiscal year)
      consensus: { asOf: snap.estimateDate, currency: own.currency, fy1: yr, fy2: yr + 1,
        epsFY1: r(fyOf(yr).eps && fyOf(yr).eps.mean, 2), epsFY2: r(fyOf(yr + 1).eps && fyOf(yr + 1).eps.mean, 2), bvpsFY1: r(fyOf(yr).bps && fyOf(yr).bps.mean, 2), dpsFY1: r(fyOf(yr).dps && fyOf(yr).dps.mean, 2),
        netIncomeFY1MxnM: r(fyOf(yr).net_inc && fyOf(yr).net_inc.mean, 0), loanGrowthFY1Pct: null,
        targetPrice: own.target ? own.target.mean : null, targetHigh: own.target ? own.target.high : null, targetLow: own.target ? own.target.low : null,
        rating: own.ratings ? own.ratings.text : null, nAnalysts: own.target ? own.target.count : null },
    };
    const header = `// AUTO-GENERATED by scripts/lib/factset-peers-fin.mjs from ${out.rawFile} — do not hand-edit.\n// FactSet pull of ${snap.pulledAt}: closes of ${snap.pricesAsOf}, consensus of ${snap.estimateDate}.\n`;
    const line = (k, v) => `  ${JSON.stringify(k)}: ${Array.isArray(v) ? '[\n' + v.map((x) => '    ' + JSON.stringify(x)).join(',\n') + '\n  ]' : JSON.stringify(v)}`;
    const target = join(ROOT, `site/${slug}/data/peers.js`);
    writeFileSync(target, header + `window.${meta.prefix}_PEERS = {\n` + Object.entries(out).map(([k, v]) => line(k, v)).join(',\n') + '\n};\n');
    written.push(target);
    if (slug === 'qualitas') {
      // the page's consensus block (data/consensus.js, section 02): fiscal-year means beside management's expectations
      const years = [yr, yr + 1].map((y) => { const f = fyOf(y); const n = (k) => (f[k] ? f[k].count : null); return { fy: y, writtenMxnM: null, writtenGrowthPct: null, netIncomeMxnM: r(f.net_inc && f.net_inc.mean, 0), eps: r(f.eps && f.eps.mean, 2), lossRatioPct: null, combinedPct: null, roePct: null, dpsMxn: r(f.dps && f.dps.mean, 2), bvps: r(f.bps && f.bps.mean, 2), nAnalysts: n('eps') }; });
      const cons = { updatedAt: snap.pulledAt, source: 'FactSet (EstimatesConsensus, consensus_fixed ANN; mean of the estimates)', currency: own.currency, years,
        targetPrice: own.target ? { mean: own.target.mean, high: own.target.high, low: own.target.low, nAnalysts: own.target.count, asOf: snap.estimateDate } : { mean: null, high: null, low: null, nAnalysts: null, asOf: null },
        ratings: own.ratings ? { buy: own.ratings.buy + (own.ratings.overweight || 0), hold: own.ratings.hold, sell: own.ratings.sell + (own.ratings.underweight || 0), total: own.ratings.total, text: own.ratings.text } : { buy: null, hold: null, sell: null },
        note: { es: 'Consenso del lado vendedor compilado por FactSet (media de las estimaciones); FactSet no recopila consenso de prima emitida, siniestralidad, índice combinado ni ROE para Quálitas, por eso esas filas siguen vacías. Vista pública adicional: la nota de inicio de cobertura de Citi (junio 2026) en reference.js.', en: 'Sell-side consensus compiled by FactSet (mean of the estimates); FactSet collects no written-premium, loss-ratio, combined-ratio or ROE consensus for Quálitas, so those rows stay empty. Additional public view: Citi\'s initiation note (June 2026) in reference.js.' } };
      const ct = join(ROOT, 'site/qualitas/data/consensus.js');
      writeFileSync(ct, `// AUTO-GENERATED by scripts/lib/factset-peers-fin.mjs from ${out.rawFile} — do not hand-edit.\n// Sell-side consensus for Quálitas (Q*), shown next to management's expectations in section 02. FactSet pull of ${snap.pulledAt}.\nwindow.Q_CONSENSUS = {\n` + Object.entries(cons).map(([k, v]) => line(k, v)).join(',\n') + '\n};\n');
      written.push(ct);
    }
  }
  return { written };
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  if (cmd === 'ingest') {
    const { companies, commonDate, written } = ingest({ pull: a.pull ? join(process.cwd(), a.pull) : PULL_DIR, date: a.date });
    console.log(`ingest: prices through ${commonDate} → ${written.map((w) => w.replace(ROOT + '/', '')).join(', ')}`);
    for (const id of IDS) { const c = companies[id]; console.log(`${id.padEnd(12)} close ${c.priceDate} ${c.price} ${c.currency}  shares ${c.sharesM} M  mcap US$${c.mktCapUsdM} M  bvps ${c.bookValue.value} (${c.bookValue.period}, ${c.bookValue.basis})  ntm eps ${r(c.ntm.eps.mean, 3)} ${c.ntm.currency}  weeks ${c.history.length}  adtv US$${c.adtv ? c.adtv.usdM : '—'} M`); }
  } else if (cmd === 'build') {
    const { written } = build();
    console.log(`build → ${written.map((w) => w.replace(ROOT + '/', '')).join(', ')}`);
    for (const slug of Object.keys(PAGES)) { const src = readFileSync(join(ROOT, `site/${slug}/data/peers.js`), 'utf8'); const w = {}; new Function('window', src)(w); const d = Object.values(w)[0]; for (const p of [d.own, ...d.peers]) console.log(`${p.short.padEnd(12)} ${p.priceDate} ${p.currency} ${p.price}  mcap US$${String(p.mktCapUsdM).padStart(8)} M  ADTV US$${p.adtvUsdM} M  P/E NTM ${p.peNtm}x (1y ${p.peNtmAvg1y}, 3y ${p.peNtmAvg3y}, 5y ${p.peNtmAvg5y})  P/BV ${p.pbv}x (1y ${p.pbvAvg1y}, 3y ${p.pbvAvg3y}, 5y ${p.pbvAvg5y})  div ${p.divYieldPct}%  ROE ${p.roePct}%  ${p.sector === 'insurance' ? 'CR ' + p.combinedRatioPct : 'NPL ' + p.nplPct}%`); console.log('  medians', JSON.stringify(d.medians.all)); }
  } else {
    console.error('usage: node scripts/lib/factset-peers-fin.mjs ingest [--pull DIR] [--date YYYY-MM-DD] | build');
    process.exit(2);
  }
}
