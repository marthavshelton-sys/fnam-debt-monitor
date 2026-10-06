// Builds site/gap/data/peers.js (window.GAP_PEERS) from a dated FactSet snapshot in
// tools/gap/raw/factset/<YYYY-MM-DD>.json (the latest file by name unless a path is given).
//
// The snapshot is written by hand from the FactSet AI-Ready Data connector (MCP) in a Claude
// session: GlobalPrices (prices in local and USD, market_value, annualized_dividends,
// returns_range), Fundamentals (LTM income statement, latest balance sheet) and
// EstimatesConsensus (NTM rolling consensus, price targets, ratings; GAP also FY2026-FY2028).
// GitHub Actions has no FactSet credentials, so this file is refreshed on request, not on a
// schedule; every figure carries the snapshot's dates.
//
// Definitions (all in the company's trading currency, millions, except per-share and ratios):
//   mktCapM        FactSet current market value, all share classes.
//   evM            mktCapM + net debt + accumulated minority interest (latest balance sheet).
//   evEbitdaLtm    evM / LTM EBITDA (operating income + D&A, FactSet FF_EBITDA_OPER).
//   evEbitdaNtm    evM / consensus mean EBITDA for the next twelve months (NTMA).
//   peLtm          mktCapM / LTM net income (current price, not FactSet FF_PE at period end).
//   peNtm          price / consensus mean EPS for the next twelve months.
//   evSalesLtm/Ntm evM / sales (LTM reported, NTM consensus mean).
//   divYieldPct    FactSet indicated annual dividend / price.
//   netDebtEbitda  net debt / LTM EBITDA.
//   fxUsd          priceUsd / price, used for the USD market cap and EV.
//   evEbitdaNtmAvg3y/5y, peNtmAvg3y/5y
//                  arithmetic mean of the NTM multiple at the last 36 / 60 month-ends of the snapshot's
//                  history[] (price x shares at that month-end + the latest balance sheet already reported,
//                  over the consensus NTM mean sampled that day; see the snapshot notes). Null when a window
//                  is incomplete. The monthly series are kept in peers.js (`history`) for charts and audits.
//
// Usage: node scripts/gap/build-peers.mjs [tools/gap/raw/factset/2026-10-06.json]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(here, '../../tools/gap/raw/factset');
const OUT = join(here, '../../site/gap/data/peers.js');

const file = process.argv[2] || join(RAW_DIR, readdirSync(RAW_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop());
const raw = JSON.parse(readFileSync(file, 'utf8'));

const r = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const div = (a, b) => (a != null && b != null && b !== 0 ? a / b : null);

const WINDOWS = { '3y': 36, '5y': 60 };
function history(c) {
  const rows = (c.history || []).map((h) => {
    const ev = h.price * h.sharesM + (h.netDebt || 0) + (h.minority || 0);
    return { month: h.month, evEbitdaNtm: r(div(ev, h.ntmEbitda)), peNtm: h.ntmEps > 0 ? r(div(h.price, h.ntmEps)) : null };
  });
  const avg = (key, n) => { const v = rows.slice(-n).map((x) => x[key]); return v.length === n && v.every((x) => x != null) ? r(v.reduce((a, b) => a + b, 0) / n) : null; };
  const out = { from: rows.length ? rows[0].month : null, to: rows.length ? rows[rows.length - 1].month : null, points: rows.length, series: rows.map((x) => [x.month, x.evEbitdaNtm, x.peNtm]) };
  for (const [tag, n] of Object.entries(WINDOWS)) { out['evEbitdaNtmAvg' + tag] = avg('evEbitdaNtm', n); out['peNtmAvg' + tag] = avg('peNtm', n); }
  return out;
}

function row(id, c) {
  const fx = div(c.priceUsd, c.price);
  const h = history(c);
  const ev = c.mktCapM + (c.bs.netDebt || 0) + (c.bs.minorityInterest || 0);
  const ntmEbitda = c.ntm && c.ntm.ebitda ? c.ntm.ebitda.mean : null;
  const ntmEps = c.ntm && c.ntm.eps ? c.ntm.eps.mean : null;
  const ntmSales = c.ntm && c.ntm.sales ? c.ntm.sales.mean : null;
  return {
    ticker: id, name: c.name, short: c.short, exchange: c.exchange, currency: c.currency, fyEnd: c.fyEnd,
    asOf: raw.pricesAsOf, ltmPeriod: c.ltmPeriod, ltmBasis: c.ltmBasis || 'LTM',
    price: c.price, priceUsd: c.priceUsd, fxUsd: r(fx, 4), sharesM: r(c.sharesM, 3),
    mktCapM: r(c.mktCapM, 1), mktCapUsdM: r(c.mktCapM * fx, 1),
    netDebtM: r(c.bs.netDebt, 1), minorityM: r(c.bs.minorityInterest, 1), evM: r(ev, 1), evUsdM: r(ev * fx, 1),
    ltm: { sales: r(c.ltm.sales, 1), ebitda: r(c.ltm.ebitda, 1), netIncome: r(c.ltm.netIncome, 1), ebitdaMarginPct: r(c.ltm.ebitdaMarginPct, 1), ffPe: r(c.ltm.ffPe, 2) },
    ntm: c.ntm ? { estimateDate: raw.estimateDate, sales: c.ntm.sales, ebitda: c.ntm.ebitda, eps: c.ntm.eps } : null,
    evEbitdaLtm: r(div(ev, c.ltm.ebitda)), evEbitdaNtm: r(div(ev, ntmEbitda)),
    peLtm: r(div(c.mktCapM, c.ltm.netIncome)), peNtm: r(div(c.price, ntmEps)),
    evSalesLtm: r(div(ev, c.ltm.sales)), evSalesNtm: r(div(ev, ntmSales)),
    divYieldPct: c.iad ? r(100 * div(c.iad.value, c.price)) : null, iad: c.iad || null,
    netDebtEbitda: r(div(c.bs.netDebt, c.ltm.ebitda)), ebitdaMarginPct: r(c.ltm.ebitdaMarginPct, 1),
    target: c.target ? { ...c.target, mean: r(c.target.mean), median: r(c.target.median), high: r(c.target.high), low: r(c.target.low), upsidePct: r(100 * (c.target.mean / c.price - 1), 1) } : null,
    ratings: c.ratings || null,
    returnsUsdPct: c.returnsUsdPct ? { ytd: r(c.returnsUsdPct.ytd, 1), oneYear: r(c.returnsUsdPct.oneYear, 1) } : null,
    evEbitdaNtmAvg3y: h.evEbitdaNtmAvg3y, evEbitdaNtmAvg5y: h.evEbitdaNtmAvg5y, peNtmAvg3y: h.peNtmAvg3y, peNtmAvg5y: h.peNtmAvg5y,
    history: h.points ? { from: h.from, to: h.to, points: h.points, series: h.series } : null,
    fy: c.fy || null,
  };
}

const ids = Object.keys(raw.companies);
const gapId = ids.find((k) => /^GAPB/.test(k));
const gap = row(gapId, raw.companies[gapId]);
const peers = ids.filter((k) => k !== gapId).map((k) => row(k, raw.companies[k]));

const median = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const keys = ['evEbitdaLtm', 'evEbitdaNtm', 'evEbitdaNtmAvg3y', 'evEbitdaNtmAvg5y', 'peLtm', 'peNtm', 'peNtmAvg3y', 'peNtmAvg5y', 'evSalesLtm', 'evSalesNtm', 'divYieldPct', 'netDebtEbitda', 'ebitdaMarginPct'];
const med = (rows) => Object.fromEntries(keys.map((k) => [k, r(median(rows.map((p) => p[k])))]));
const mx = peers.filter((p) => p.currency === 'MXN');
const medians = { all: med(peers), mexico: med(mx), international: med(peers.filter((p) => p.currency !== 'MXN')) };

const out = {
  updatedAt: raw.pulledAt, pricesAsOf: raw.pricesAsOf, estimateDate: raw.estimateDate,
  source: 'FactSet', sourceDetail: raw.source, rawFile: 'tools/gap/raw/factset/' + file.split('/').pop(),
  history: raw.history ? { pulledAt: raw.history.pulledAt, from: raw.history.from, to: raw.history.to, points: raw.history.points, frequency: raw.history.frequency, source: raw.history.source } : null,
  method: {
    en: 'EV = market cap (all share classes) + net debt + minority interest at the latest balance sheet (30-Jun-2026). LTM = last twelve months reported; NTM = FactSet consensus mean for the next twelve months. P/E on current market cap over LTM net income and on price over NTM EPS. 3- and 5-year averages = arithmetic mean of the NTM multiple at the last 36 / 60 month-ends (month-end price and shares, the latest balance sheet already reported, consensus sampled that day). Dividend yield = FactSet indicated annual dividend / price. USD at the FX rate implied by FactSet\'s USD close.',
    es: 'VE = capitalización (todas las series) + deuda neta + participación no controladora al último balance (30-jun-2026). UDM = últimos doce meses reportados; PDM = consenso medio de FactSet para los próximos doce meses. P/U sobre capitalización actual entre utilidad neta UDM y sobre precio entre UPA PDM. Promedios de 3 y 5 años = media aritmética del múltiplo PDM en los últimos 36 / 60 cierres de mes (precio y acciones de ese cierre, último balance ya publicado, consenso de ese día). Rendimiento por dividendo = dividendo anual indicado por FactSet / precio. Dólares al tipo de cambio implícito en el cierre en USD de FactSet.',
  },
  notes: raw.notes,
  gap, peers, medians,
};

const header = `// AUTO-GENERATED from the FactSet snapshot of ${out.rawFile.split("/").pop()} — do not hand-edit.
// FactSet snapshot pulled ${raw.pulledAt}: prices as of ${raw.pricesAsOf}, consensus as of ${raw.estimateDate}.
// Refreshed on request from the FactSet connector (no credentials in GitHub Actions); see tools/gap/README.md.
`;
const line = (k, v) => `  ${JSON.stringify(k)}: ${Array.isArray(v) ? '[\n' + v.map((x) => '    ' + JSON.stringify(x)).join(',\n') + '\n  ]' : JSON.stringify(v)}`;
writeFileSync(OUT, header + 'window.GAP_PEERS = {\n' + Object.entries(out).map(([k, v]) => line(k, v)).join(',\n') + '\n};\n');
console.log(`Wrote peers.js: GAP + ${peers.length} peers from ${file.split('/').pop()}`);
for (const p of [gap, ...peers]) console.log(`${p.short.padEnd(9)} mcap US$${String(p.mktCapUsdM).padStart(9)} M  EV/EBITDA NTM ${p.evEbitdaNtm}x (avg 3y ${p.evEbitdaNtmAvg3y}x, 5y ${p.evEbitdaNtmAvg5y}x)  P/E NTM ${p.peNtm}x (avg 3y ${p.peNtmAvg3y}x, 5y ${p.peNtmAvg5y}x)  yld ${p.divYieldPct}%  ND/EBITDA ${p.netDebtEbitda}x  tgt ${p.target && p.target.upsidePct}%`);
console.log('medians', JSON.stringify(medians));
