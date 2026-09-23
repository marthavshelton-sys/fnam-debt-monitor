#!/usr/bin/env node
// Emit the page's data files (site/oracle/data/*.js, window.ORCL_* globals — the same contract family the GAP model
// uses) from the curated, tie-out-validated JSON in /data. The page never reads /data directly.
// Run: node scripts/oracle/build-data.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, OUT } from "./paths.mjs";
mkdirSync(OUT, { recursive: true });
const load = (n, fb = null) => (existsSync(join(DATA, n)) ? JSON.parse(readFileSync(join(DATA, n), "utf8").replace(/^﻿/, "")) : fb);
const now = new Date().toISOString();
const emit = (file, global, obj, header) => writeFileSync(join(OUT, file), `// ${header}\n// Generated ${now} by scripts/oracle/build-data.mjs — do not hand-edit; edit /data and rebuild.\nwindow.${global} = ${JSON.stringify(obj)};\n`, "utf8");

const quarters = load("quarters.json").quarters.slice().sort((a, b) => (a.period_end < b.period_end ? -1 : 1));
const fiscalYears = load("fiscal_years.json", { fiscal_years: {} }).fiscal_years;
const sources = load("sources.json", {});
const src = (key) => { const s = typeof key === "string" ? sources[key] : key; return s ? { url: s.url, date: s.filing_date || s.period_end || null, title: s.title, accession: s.accession || null } : null; };
const gid = (q) => `${q.fiscal_year}Q${q.fiscal_quarter}`;
const label = (q) => `${q.fiscal_quarter}Q${String(q.fiscal_year).slice(2)}`;

// ---------- financials.js ----------
const layout = {
  is: [
    { k: "revCloud", en: "Cloud", es: "Nube", level: 1 },
    { k: "revSoftware", en: "Software (license + support)", es: "Software (licencias + soporte)", level: 1 },
    { k: "revHardware", en: "Hardware", es: "Hardware", level: 1 },
    { k: "revServices", en: "Services", es: "Servicios", level: 1 },
    { k: "revTotal", en: "Total revenues", es: "Ingresos totales", level: 0, bold: true },
    { k: "costRevenue", en: "Cost of revenues", es: "Costo de ingresos", level: 1, group: "cor" },
    { k: "costCloudSoftware", en: "Cloud and software", es: "Nube y software", level: 2 },
    { k: "costHardware", en: "Hardware", es: "Hardware", level: 2 },
    { k: "costServices", en: "Services", es: "Servicios", level: 2 },
    { k: "sm", en: "Sales and marketing", es: "Ventas y mercadotecnia", level: 1 },
    { k: "rd", en: "Research and development", es: "Investigación y desarrollo", level: 1 },
    { k: "ga", en: "General and administrative", es: "Gastos generales y administrativos", level: 1 },
    { k: "amortIntangibles", en: "Amortization of intangible assets", es: "Amortización de intangibles", level: 1 },
    { k: "restructuringOther", en: "Restructuring and acquisition-related", es: "Reestructura y costos de adquisición", level: 1 },
    { k: "totalOpex", en: "Total operating expenses", es: "Gastos de operación totales", level: 0, bold: true },
    { k: "opIncome", en: "Operating income", es: "Utilidad de operación", level: 0, bold: true, ngAlt: "ngOpIncome" },
    { k: "opMargin", en: "Operating margin", es: "Margen operativo", level: 1, kpi: true, pct: true, ngAlt: "ngOpMargin" },
    { k: "interestExpense", en: "Interest expense", es: "Gasto por intereses", level: 1 },
    { k: "nonOpIncome", en: "Non-operating income (expense), net", es: "Otros ingresos (gastos) no operativos, netos", level: 1 },
    { k: "pretaxIncome", en: "Income before income taxes", es: "Utilidad antes de impuestos", level: 0, bold: true },
    { k: "incomeTax", en: "Provision for income taxes", es: "Impuestos a la utilidad", level: 1 },
    { k: "taxRate", en: "Effective tax rate", es: "Tasa efectiva de impuestos", level: 1, kpi: true, pct: true },
    { k: "netIncome", en: "Net income", es: "Utilidad neta", level: 0, bold: true },
    { k: "preferredDividends", en: "Preferred stock dividends", es: "Dividendos de acciones preferentes", level: 1 },
    { k: "netIncomeCommon", en: "Net income available to common shareholders", es: "Utilidad neta atribuible a accionistas comunes", level: 0, bold: true, ngAlt: "ngNetIncomeCommon" },
    { k: "epsDiluted", en: "Diluted EPS (US$)", es: "UPA diluida (US$)", level: 1, kpi: true, perShare: true, ngAlt: "ngEpsDiluted" },
    { k: "dilutedShares", en: "Diluted shares (millions)", es: "Acciones diluidas (millones)", level: 1, kpi: true, count: true },
    { k: "ngRecon", en: "Non-GAAP reconciliation (added back)", es: "Conciliación No-GAAP (partidas que se suman)", level: 1, group: "ng" },
    { k: "ngSbc", en: "Stock-based compensation", es: "Compensación basada en acciones", level: 2 },
    { k: "ngAmort", en: "Amortization of intangible assets", es: "Amortización de intangibles", level: 2 },
    { k: "ngRestructuring", en: "Restructuring and acquisition-related", es: "Reestructura y costos de adquisición", level: 2 },
    { k: "ngTaxEffect", en: "Income-tax effect of adjustments", es: "Efecto fiscal de los ajustes", level: 2 },
    { k: "ngOpIncome", en: "Non-GAAP operating income", es: "Utilidad de operación No-GAAP", level: 0, bold: true, kpi: true },
    { k: "ngOpMargin", en: "Non-GAAP operating margin", es: "Margen operativo No-GAAP", level: 1, kpi: true, pct: true },
    { k: "ngNetIncomeCommon", en: "Non-GAAP net income to common", es: "Utilidad neta No-GAAP a comunes", level: 0, bold: true, kpi: true },
    { k: "ngEpsDiluted", en: "Non-GAAP diluted EPS (US$)", es: "UPA diluida No-GAAP (US$)", level: 1, kpi: true, perShare: true },
    { k: "da", en: "Depreciation and amortization (cash-flow statement)", es: "Depreciación y amortización (flujo de efectivo)", level: 1, kpi: true },
    { k: "ebitda", en: "EBITDA (GAAP operating income + D&A)", es: "EBITDA (utilidad de operación GAAP + D&A)", level: 0, bold: true, kpi: true },
    { k: "ebitdaMargin", en: "EBITDA margin", es: "Margen EBITDA", level: 1, kpi: true, pct: true },
  ],
  bs: [
    { k: "cash", en: "Cash and cash equivalents", es: "Efectivo y equivalentes", level: 1 },
    { k: "marketableSecurities", en: "Marketable securities", es: "Inversiones negociables", level: 1 },
    { k: "cashAndInvestments", en: "Cash, equivalents and marketable securities", es: "Efectivo, equivalentes e inversiones", level: 0, bold: true },
    { k: "totalAssets", en: "Total assets", es: "Activo total", level: 0, bold: true },
    { k: "deferredRevenueCurrent", en: "Deferred revenues (current)", es: "Ingresos diferidos (corto plazo)", level: 1 },
    { k: "debtCurrent", en: "Notes payable and other borrowings (current)", es: "Deuda (corto plazo)", level: 1 },
    { k: "debtLT", en: "Notes payable and other borrowings (non-current)", es: "Deuda (largo plazo)", level: 1 },
    { k: "totalDebt", en: "Total debt", es: "Deuda total", level: 0, bold: true },
    { k: "netDebt", en: "Net debt (total debt − cash and investments)", es: "Deuda neta (deuda total − efectivo e inversiones)", level: 0, bold: true, kpi: true },
    { k: "equity", en: "Total stockholders' equity", es: "Capital contable total", level: 0, bold: true },
  ],
  cf: [
    { k: "cfo", en: "Net cash provided by operating activities", es: "Flujo neto de actividades de operación", level: 0, bold: true },
    { k: "capex", en: "Capital expenditures", es: "Gasto de capital (capex)", level: 1 },
    { k: "fcf", en: "Free cash flow (operating cash flow − capex)", es: "Flujo libre de efectivo (operación − capex)", level: 0, bold: true },
    { k: "depreciation", en: "Depreciation", es: "Depreciación", level: 1 },
    { k: "amortization", en: "Amortization of intangible assets", es: "Amortización de intangibles", level: 1 },
    { k: "da", en: "Depreciation and amortization", es: "Depreciación y amortización", level: 0, bold: true },
    { k: "capexToRevenue", en: "Capex / revenue", es: "Capex / ingresos", level: 1, kpi: true, pct: true },
  ],
  kpi: [
    { k: "rpo", en: "Remaining performance obligations (US$ M)", es: "Obligaciones de desempeño restantes (US$ M)" },
    { k: "cloudRev", en: "Cloud revenue, FY2026 basis (US$ M)", es: "Ingresos de nube, base AF2026 (US$ M)" },
    { k: "cloudShare", en: "Cloud as % of revenue", es: "Nube como % de los ingresos" },
    { k: "dps", en: "Dividend declared per share (US$)", es: "Dividendo declarado por acción (US$)" },
  ],
};

const pct = (n, d) => (n != null && d ? Math.round((1000 * n) / d) / 10 : null);
function isBlock(q) {
  const g = q.gaap, ng = q.non_gaap || {}, r = ng.reconciling_items || {}, da = q.da || {};
  const costRevenue = [g.opex.cloud_and_software_cost, g.opex.hardware_cost, g.opex.services_cost].every((v) => v != null) ? g.opex.cloud_and_software_cost + g.opex.hardware_cost + g.opex.services_cost : null;
  const ebitda = g.operating_income != null && da.total_da != null ? g.operating_income + da.total_da : null;
  return {
    revCloud: g.revenue.cloud, revSoftware: g.revenue.software, revHardware: g.revenue.hardware, revServices: g.revenue.services, revTotal: g.revenue.total,
    costRevenue, costCloudSoftware: g.opex.cloud_and_software_cost, costHardware: g.opex.hardware_cost, costServices: g.opex.services_cost,
    sm: g.opex.sales_and_marketing, rd: g.opex.research_and_development, ga: g.opex.general_and_administrative, amortIntangibles: g.opex.amortization_of_intangibles, restructuringOther: g.opex.restructuring_and_other, totalOpex: g.opex.total,
    opIncome: g.operating_income, opMargin: pct(g.operating_income, g.revenue.total),
    interestExpense: g.interest_expense, nonOpIncome: g.nonoperating_income_net, pretaxIncome: g.pretax_income, incomeTax: -g.tax_provision, taxRate: pct(g.tax_provision, g.pretax_income),
    netIncome: g.net_income, preferredDividends: g.preferred_dividends ? -g.preferred_dividends : 0, netIncomeCommon: g.net_income_common, epsDiluted: g.diluted_eps, dilutedShares: g.diluted_shares,
    ngSbc: r.stock_based_compensation ?? null, ngAmort: r.amortization_of_intangibles ?? null, ngRestructuring: r.restructuring_and_other ?? null, ngTaxEffect: r.tax_effect_of_adjustments ?? null,
    ngOpIncome: ng.operating_income ?? null, ngOpMargin: pct(ng.operating_income, g.revenue.total), ngNetIncomeCommon: ng.net_income_common ?? null, ngEpsDiluted: ng.diluted_eps ?? null,
    da: da.total_da ?? null, ebitda, ebitdaMargin: pct(ebitda, g.revenue.total),
  };
}
function bsBlock(q) { const b = q.balance_sheet || {}; if (b.total_debt == null && b.total_assets == null) return null; return { cash: b.cash_and_equivalents, marketableSecurities: b.marketable_securities, cashAndInvestments: b.cash_and_investments_total, totalAssets: b.total_assets, deferredRevenueCurrent: b.current_deferred_revenue, debtCurrent: b.short_term_debt, debtLT: b.long_term_debt, totalDebt: b.total_debt, netDebt: b.total_debt != null ? b.total_debt - (b.cash_and_investments_total || 0) : null, equity: b.stockholders_equity }; }
function cfBlock(q) { const c = q.cash_flow || {}, da = q.da || {}; if (c.operating_cash_flow_quarter == null) return null; return { cfo: c.operating_cash_flow_quarter, capex: c.capex_quarter, fcf: c.free_cash_flow_quarter, depreciation: da.depreciation ?? null, amortization: da.amortization_of_intangibles ?? null, da: da.total_da ?? null, capexToRevenue: pct(-c.capex_quarter, q.gaap.revenue.total) }; }
function kpiBlock(q) { const rc = q.revenue_basis === "fy2026_lines" ? q.gaap.revenue : q.revenue_recast_fy2026_basis || null; return { rpo: q.rpo?.total ?? null, rpoYoyPct: q.rpo?.yoy_pct ?? null, cloudRev: rc ? rc.cloud : null, cloudShare: rc ? pct(rc.cloud, q.gaap.revenue.total) : null, dps: q.dividend_declared_per_share ?? null }; }

const finQuarters = quarters.map((q) => {
  const s = src(q.source);
  return { id: gid(q), fy: q.fiscal_year, q: q.fiscal_quarter, label: label(q), periodEnd: q.period_end, releaseDate: q.release_date, basis: q.revenue_basis,
    recast: q.revenue_recast_fy2026_basis ? { revCloud: q.revenue_recast_fy2026_basis.cloud, revSoftware: q.revenue_recast_fy2026_basis.software, revHardware: q.revenue_recast_fy2026_basis.hardware, revServices: q.revenue_recast_fy2026_basis.services, source: q.revenue_recast_fy2026_basis.source_url } : null,
    is: isBlock(q), bs: bsBlock(q), cf: cfBlock(q), kpi: kpiBlock(q),
    shares: q.gaap.diluted_shares ? { current: Math.round(q.gaap.diluted_shares * 1e6), currentAsOf: q.period_end, basis: "diluted weighted average" } : null,
    notes: { en: q.cash_flow?.note_en || null, es: q.cash_flow?.note_es || null, basis_en: q.basis_note_en || null, basis_es: q.basis_note_es || null },
    sources: { is: s, bs: s, cf: s, kpi: s } };
});
const years = Object.entries(fiscalYears).map(([id, y]) => {
  const fy = Number(id.replace("FY", "")); const g = y.gaap, ng = y.non_gaap || {}, da = y.da || {};
  const ebitda = g.operating_income != null && da.total_da != null ? g.operating_income + da.total_da : null;
  const qs = finQuarters.filter((q) => q.fy === fy);
  const sum = (k) => (qs.length === 4 && qs.every((q) => q.is[k] != null) ? qs.reduce((a, q) => a + q.is[k], 0) : null);
  const is = { revTotal: g.revenue_total, revCloud: sum("revCloud"), revSoftware: sum("revSoftware"), revHardware: sum("revHardware"), revServices: sum("revServices"), totalOpex: sum("totalOpex"), opIncome: g.operating_income, opMargin: pct(g.operating_income, g.revenue_total), netIncomeCommon: g.net_income, epsDiluted: g.diluted_eps, ngOpIncome: ng.operating_income ?? null, ngOpMargin: pct(ng.operating_income, g.revenue_total), ngNetIncomeCommon: ng.net_income ?? null, ngEpsDiluted: ng.diluted_eps ?? null, da: da.total_da ?? null, ebitda, ebitdaMargin: pct(ebitda, g.revenue_total), interestExpense: sum("interestExpense"), incomeTax: sum("incomeTax"), pretaxIncome: sum("pretaxIncome"), netIncome: sum("netIncome") };
  const cf = { cfo: g.operating_cash_flow, capex: g.capex, fcf: g.operating_cash_flow != null && g.capex != null ? g.operating_cash_flow + g.capex : null, depreciation: da.depreciation ?? null, amortization: da.amortization_of_intangibles ?? null, da: da.total_da ?? null, capexToRevenue: pct(-g.capex, g.revenue_total) };
  const q4 = qs.find((q) => q.q === 4);
  const rc = y.revenue_recast_fy2026_basis;
  const recast = rc ? { revCloud: rc.cloud, revSoftware: rc.software, revHardware: rc.hardware, revServices: rc.services, source: rc.source_url } : null;
  const basis = fy >= 2026 ? "fy2026_lines" : "legacy_lines";
  const cloudNew = basis === "fy2026_lines" ? is.revCloud : recast ? recast.revCloud : null;
  return { id, fy, basis, recast, is, cf, bs: q4 ? q4.bs : null, kpi: { rpo: q4 ? q4.kpi.rpo : null, rpoYoyPct: q4 ? q4.kpi.rpoYoyPct : null, cloudRev: cloudNew, cloudShare: cloudNew != null ? pct(cloudNew, g.revenue_total) : null, dps: qs.reduce((a, q) => a + (q.kpi.dps || 0), 0) }, sources: { is: src(y.source), cf: src(y.source), bs: q4 ? q4.sources.bs : null, kpi: src(y.source) } };
}).sort((a, b) => a.fy - b.fy);

emit("financials.js", "ORCL_FIN", {
  generatedAt: now, currency: "USD", units: "millions", unitsNote: "Statements in US$ millions as printed in Oracle's 8-K earnings releases; per-share in US$; shares in millions; margins in %.",
  fiscalYearEnd: "05-31", layout, quarters: finQuarters, ytd: [], years,
  coverage: { quarters: [finQuarters[0]?.id, finQuarters.at(-1)?.id], years: [years[0]?.id, years.at(-1)?.id], releasesParsed: finQuarters.length },
  basisNotes: load("quarters.json").meta,
}, "Oracle quarterly and annual statements — built from tools/oracle/data/quarters.json + tools/oracle/data/fiscal_years.json (tie-out validated).");

// ---------- market.js ----------
const mref = load("market_reference.json", {});
const csv = (name) => { const p = join(DATA, name); if (!existsSync(p)) return []; const lines = readFileSync(p, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/); const h = lines[0].split(","); const di = h.findIndex((x) => /^(date|observation_date)$/i.test(x.trim())); let ci = h.findIndex((x) => /^close$/i.test(x.trim())); if (ci < 0) ci = 1; return lines.slice(1).map((l) => { const c = l.split(","); const v = parseFloat(c[ci]); return Number.isNaN(v) ? null : [c[di], v]; }).filter(Boolean).sort((a, b) => (a[0] < b[0] ? -1 : 1)); };
const orclPts = csv("prices_orcl_daily.csv"), spxPts = csv("prices_spx_daily.csv"), tsyPts = csv("treasury_10y.csv");
const divs = (load("dividends.json", { dividends: [] }).dividends || []).filter((d) => d.payment_date && d.amount_per_share != null).map((d) => [d.payment_date, d.amount_per_share]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
emit("market.js", "ORCL_MARKET", {
  generatedAt: mref.as_of ? mref.as_of + "T00:00:00Z" : now,
  prices: {
    ORCL: { name: "Oracle (NYSE: ORCL)", currency: "USD", exchange: "NYSE", source: mref.price_snapshot?.orcl?.source_name || "Public daily closes (Yahoo Finance chart API; Nasdaq/Stooq fallbacks)", sourceUrl: mref.price_snapshot?.orcl?.source_url || null, fetchedAt: mref.price_snapshot?.orcl?.accessed || null, points: orclPts },
    "^GSPC": { name: "S&P 500", currency: "USD", exchange: "index", source: mref.price_snapshot?.sp500?.source_name || "FRED SP500 / Yahoo Finance", sourceUrl: mref.price_snapshot?.sp500?.source_url || null, fetchedAt: mref.price_snapshot?.sp500?.accessed || null, points: spxPts },
  },
  dividends: { ORCL: { source: "Quarterly dividends declared in each 8-K earnings release (tools/oracle/data/dividends.json); dated by payment date", points: divs } },
  rates: { US10Y: { name: "US Treasury 10-year (%)", source: mref.treasury_10y?.source_name || "FRED DGS10 / U.S. Treasury daily par yield curve", points: tsyPts.length ? tsyPts : (mref.treasury_10y?.yield_pct != null ? [[mref.treasury_10y.as_of_date, mref.treasury_10y.yield_pct]] : []) } },
  sharesOutstanding: mref.price_snapshot?.orcl?.shares_outstanding_millions ? { shares: Math.round(mref.price_snapshot.orcl.shares_outstanding_millions * 1e6), asOf: "2026-09-07", source: "Form 10-Q cover page (quarter ended 2026-08-31)", url: "https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm" } : null,
}, "Oracle market data — daily closes, dividends by payment date, 10-year Treasury.");

// ---------- reference.js ----------
const ss = load("special_situations.json", {}).ai_cloud_buildout || {};
const ex = load("explainers.json", {}).rpo || {};
const gl = load("glossary.json", { terms: {} }).terms;
const latest = quarters.at(-1);
const rpoTimeline = quarters.filter((q) => q.rpo?.total).map((q) => ({ date: q.release_date, en: `${label(q)} results: RPO $${(q.rpo.total / 1000).toFixed(0)}bn${q.rpo.yoy_pct != null ? ` (+${q.rpo.yoy_pct}% y/y)` : ""}; capex $${(-(q.cash_flow?.capex_quarter || 0) / 1000).toFixed(1)}bn in the quarter.`, es: `Resultados ${q.fiscal_quarter}T${String(q.fiscal_year).slice(2)}: RPO US$${(q.rpo.total / 1000).toFixed(0)} mil M${q.rpo.yoy_pct != null ? ` (+${q.rpo.yoy_pct}% a/a)` : ""}; capex US$${(-(q.cash_flow?.capex_quarter || 0) / 1000).toFixed(1)} mil M en el trimestre.` }));
const capitalRaise = { date: "2026-02-04", en: "Oracle prices a US$30bn capital raise: senior notes across maturities to 2066 plus mandatory convertible preferred stock (part of an up-to-US$50bn program); preferred dividends appear from 3Q26.", es: "Oracle coloca US$30 mil M: bonos senior con vencimientos hasta 2066 más acciones preferentes convertibles obligatorias (parte de un programa de hasta US$50 mil M); los dividendos preferentes aparecen desde el 3T26." };
emit("reference.js", "ORCL_REF", {
  updatedAt: now.slice(0, 10),
  company: { name: "Oracle Corporation", short: "Oracle", tickers: { nyse: "ORCL" }, fiscalYearEnd: "05-31", reportingCurrency: "USD", accounting: { en: "US GAAP; Non-GAAP as Oracle defines it (excludes stock-based compensation, amortization of acquired intangibles, restructuring and acquisition-related items) and reconciles in every release", es: "US GAAP; No-GAAP tal como Oracle lo define (excluye compensación en acciones, amortización de intangibles adquiridos, reestructura y costos de adquisición) y concilia en cada reporte" }, ir: "https://investor.oracle.com/", edgar: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001341439" },
  shares: mref.price_snapshot?.orcl?.shares_outstanding_millions ? { total: Math.round(mref.price_snapshot.orcl.shares_outstanding_millions * 1e6), asOf: "2026-09-07", source: { en: "Form 10-Q cover page, quarter ended 31-Aug-2026", es: "Portada del Formulario 10-Q, trimestre terminado el 31-ago-2026" }, history: quarters.filter((q) => q.gaap.diluted_shares).map((q) => ({ asOf: q.period_end, total: Math.round(q.gaap.diluted_shares * 1e6), note: { en: "diluted weighted-average shares of the quarter", es: "acciones diluidas promedio del trimestre" } })) } : null,
  debt: {
    ratings: [
      mref.credit_ratings?.moodys && { agency: "Moody's", rating: mref.credit_ratings.moodys.rating, outlook: { en: (mref.credit_ratings.moodys.outlook || "").toLowerCase(), es: /neg/i.test(mref.credit_ratings.moodys.outlook || "") ? "negativa" : "estable" }, scope: { en: "senior unsecured", es: "deuda senior no garantizada" }, date: mref.credit_ratings.moodys.action_date, source: { en: `Rating action ${mref.credit_ratings.moodys.action_date}`, es: `Acción de calificación ${mref.credit_ratings.moodys.action_date}` }, url: mref.credit_ratings.moodys.source_url },
      mref.credit_ratings?.sp && { agency: "S&P Global Ratings", rating: mref.credit_ratings.sp.rating, outlook: { en: (mref.credit_ratings.sp.outlook || "").toLowerCase(), es: /neg/i.test(mref.credit_ratings.sp.outlook || "") ? "negativa" : "estable" }, scope: { en: "long-term issuer credit rating", es: "calificación de emisor de largo plazo" }, date: mref.credit_ratings.sp.action_date, source: { en: `Rating action ${mref.credit_ratings.sp.action_date}`, es: `Acción de calificación ${mref.credit_ratings.sp.action_date}` }, url: mref.credit_ratings.sp.source_url },
      mref.credit_ratings?.fitch && { agency: "Fitch", rating: mref.credit_ratings.fitch.rating, outlook: { en: (mref.credit_ratings.fitch.outlook || "").toLowerCase(), es: /neg/i.test(mref.credit_ratings.fitch.outlook || "") ? "negativa" : "estable" }, scope: { en: "long-term IDR", es: "IDR de largo plazo" }, date: mref.credit_ratings.fitch.action_date, source: { en: `Rating action ${mref.credit_ratings.fitch.action_date}`, es: `Acción de calificación ${mref.credit_ratings.fitch.action_date}` }, url: mref.credit_ratings.fitch.source_url },
    ].filter(Boolean),
    instruments: (mref.debt_instruments || []).map((d) => ({ name: d.series_name, type: /floating/i.test(d.series_name) ? "FRN" : /term loan/i.test(d.series_name) ? { en: "term loan", es: "crédito a plazo" } : /commercial paper/i.test(d.series_name) ? { en: "commercial paper", es: "papel comercial" } : { en: "senior notes", es: "bonos senior" }, issued: d.issued_date, matures: d.maturity_date, principalUsdM: d.principal_millions, ratePct: d.coupon_pct, rate: { en: /floating/i.test(d.series_name) ? `SOFR + ${d.coupon_pct}%` : `${d.coupon_pct}% ${/term loan|commercial/i.test(d.series_name) ? "effective" : "fixed"}`, es: /floating/i.test(d.series_name) ? `SOFR + ${d.coupon_pct}%` : `${d.coupon_pct}% ${/term loan|commercial/i.test(d.series_name) ? "efectiva" : "fija"}` }, source: "FY2026 Form 10-K, notes payable and other borrowings footnote", url: d.source_url })),
    instrumentsNote: { en: `${(mref.debt_instruments || []).length} instruments from the FY2026 Form 10-K debt footnote; principal reconciles to the disclosed US$130,105 M gross total (US$129,541 M net of unamortized discount, the balance-sheet figure). Issuances after 31-May-2026 are added from each 8-K.`, es: `${(mref.debt_instruments || []).length} instrumentos de la nota de deuda del Formulario 10-K del AF2026; el principal concilia con el total bruto revelado de US$130,105 M (US$129,541 M neto de descuento no amortizado, la cifra del balance). Las emisiones posteriores al 31-may-2026 se agregan de cada 8-K.` },
  },
  dividends: quarters.filter((q) => q.dividend_declared_per_share != null).map((q) => ({ declared: q.release_date, dps: q.dividend_declared_per_share, record: q.dividend_record_date, payment: q.dividend_payment_date, quarter: gid(q), source: src(q.source) })),
  ai: {
    title: { en: ss.title_en, es: ss.title_es },
    prose: { en: ss.what_it_is_en, es: ss.what_it_is_es },
    impact: { en: ss.model_impact_en || [], es: ss.model_impact_es || [] },
    pending: { en: ss.pending_enrichment_en, es: ss.pending_enrichment_es },
    facts: (ss.fact_grid || []).map((f) => ({ label_en: f.k_en, label_es: f.k_es, v: f.v, source: src(f.source) })),
    timeline: [...rpoTimeline, capitalRaise].sort((a, b) => a.date.localeCompare(b.date)),
    sources: { en: [...new Set(quarters.map((q) => src(q.source)?.title).filter(Boolean))], es: [...new Set(quarters.map((q) => src(q.source)?.title).filter(Boolean))] },
  },
  rpo: { title: { en: ex.title_en, es: ex.title_es }, plain: { en: ex.plain_en, es: ex.plain_es }, quote: { en: ex.quote_en, es: ex.quote_es }, quoteSource: src(ex.quote_source), schedule: ex.recognition_schedule || [], caution: { en: ex.caution_en, es: ex.caution_es }, latest: latest?.rpo?.total ?? null, latestQuarter: latest ? label(latest) : null },
  glossary: Object.values(gl),
  dcf: { horizonYears: 5, terminalMethod: "perpetuity", revenueGrowthPct: [30, 25, 20, 15, 10], ebitdaMarginPct: null, capexUsdM: [70000, 60000, 50000, 40000, 35000], daPctRevenue: null, taxRatePct: null, nwcPctDeltaRevenue: 0, riskFreePct: null, erpPct: 4.5, beta: 1.0, costOfDebtPct: null, targetDebtPct: null, terminalGrowthPct: 3.0, exitMultiple: 12.0, notes: { en: "Defaults: year-1 growth consistent with the FY2027 guidance of at least US$90bn (+34%); capex tapering from the FY2027 guided US$70bn net cash outlay; margin, D&A, tax, beta, cost of debt and leverage computed from the data. Every input is editable and encoded in the URL.", es: "Supuestos por defecto: crecimiento del año 1 consistente con la guía AF2027 de al menos US$90 mil M (+34%); capex descendiendo desde el desembolso neto guiado de US$70 mil M para AF2027; margen, D&A, impuestos, beta, costo de deuda y apalancamiento calculados con los datos. Cada supuesto es editable y queda codificado en la URL." } },
  peers: ["Microsoft", "SAP", "Salesforce", "ServiceNow", "IBM", "Workday"],
}, "Hand-curated, slow-moving facts for the Oracle model (ratings, instruments, AI buildout, RPO explainer, DCF defaults). Every block carries its source.");

// ---------- guidance.js ----------
const gd = load("guidance.json", { vintages: [] });
const vint = (gd.vintages || []).map((v) => {
  const m = /Q(\d)\s*FY(\d{4})/.exec(v.for_period || "");
  const forQ = m ? `${m[2]}Q${m[1]}` : null;
  const issued = /^FY(\d{4})Q(\d)$/.exec(v.issued_in || "");
  const s = src(v.source); const ts = v.transcript_source ? src(v.transcript_source) : null;
  return { id: v.issued_in, issuedIn: issued ? `${issued[1]}Q${issued[2]}` : null, date: v.issued_on, forQuarter: forQ, fyGuided: v.fy_total_revenue_at_least != null || v.fy_non_gaap_eps != null ? (forQ ? Number(forQ.slice(0, 4)) : null) : null,
    items: { revGrowth: v.total_revenue_growth_pct ? { lo: v.total_revenue_growth_pct[0], hi: v.total_revenue_growth_pct[1], basis: v.total_revenue_growth_basis || "usd" } : null, revGrowthCc: v.total_revenue_growth_pct_cc ? { lo: v.total_revenue_growth_pct_cc[0], hi: v.total_revenue_growth_pct_cc[1] } : null, cloudGrowth: v.cloud_revenue_growth_pct_usd ? { lo: v.cloud_revenue_growth_pct_usd[0], hi: v.cloud_revenue_growth_pct_usd[1] } : null, cloudGrowthCc: v.cloud_revenue_growth_pct_cc ? { lo: v.cloud_revenue_growth_pct_cc[0], hi: v.cloud_revenue_growth_pct_cc[1] } : null, epsNg: v.non_gaap_eps_usd_reported ? { lo: v.non_gaap_eps_usd_reported[0], hi: v.non_gaap_eps_usd_reported[1] } : null, epsNgCc: v.non_gaap_eps_usd_cc ? { lo: v.non_gaap_eps_usd_cc[0], hi: v.non_gaap_eps_usd_cc[1] } : null, fyRevenue: v.fy_total_revenue_at_least != null ? { usdM: v.fy_total_revenue_at_least, atLeast: true } : null, fyEps: v.fy_non_gaap_eps != null ? { usd: v.fy_non_gaap_eps } : null, fyCapex: v.fy_capex != null ? { usdM: v.fy_capex } : null, fyCapexNote: v.fy_capex_note || null },
    multiYear: v.multi_year_targets || null, note: v._note || null, fromTranscript: v.fields_from_transcript || [], source: s, transcript: ts ? { title: ts.title, page: v.transcript_page || null } : null };
}).sort((a, b) => a.date.localeCompare(b.date));
emit("guidance.js", "ORCL_GUIDANCE", { generatedAt: now, basis: { en: gd.meta?.basis_en, es: gd.meta?.basis_es }, transcriptsNote: { en: gd.meta?.transcripts_note_en, es: gd.meta?.transcripts_note_es }, metrics: ["revGrowth", "cloudGrowth", "epsNg", "fyRevenue", "fyEps"], vintages: vint }, "Oracle management guidance vintages — next-quarter ranges (USD and constant currency) and full-year targets, from each release and the owner-supplied call transcripts.");

// ---------- comments.js / summary.js ----------
const cm = load("comments.json", { by_quarter: {} });
const KEYMAP = { total_revenue: "revTotal", cloud: "revCloud", software: "revSoftware", hardware: "revHardware", services: "revServices", cloud_and_software_cost: "costCloudSoftware", hardware_cost: "costHardware", services_cost: "costServices", sales_and_marketing: "sm", research_and_development: "rd", general_and_administrative: "ga", amortization_of_intangibles: "amortIntangibles", restructuring_and_other: "restructuringOther", operating_income: "opIncome", interest_expense: "interestExpense", nonoperating_income_net: "nonOpIncome", tax_provision: "incomeTax", pretax_income: "pretaxIncome", net_income_common: "netIncomeCommon", diluted_eps: "epsDiluted", total_opex: "totalOpex", net_income: "netIncome" };
const OPSMAP = { rpo: "rpo", operating_cash_flow: "cfo", capex: "capex", cloud: "cloudRev" };
const periods = {};
for (const [qid, entry] of Object.entries(cm.by_quarter || {})) {
  const m = /^FY(\d{4})Q(\d)$/.exec(qid); if (!m) continue;
  const id = `${m[1]}Q${m[2]}`; const lines = {}, ops = {};
  for (const [k, c] of Object.entries(entry.comments || {})) { if (KEYMAP[k]) lines[KEYMAP[k]] = { es: c.es, en: c.en, src: c.src || null }; if (OPSMAP[k]) ops[OPSMAP[k]] = { es: c.es, en: c.en, src: c.src || null }; }
  const q = quarters.find((x) => gid(x) === id); const tr = load("transcripts.json", { calls: {} }).calls[qid];
  periods[id] = { lines, ops, call: tr ? { date: tr.call_date, es: `conferencia de resultados del ${m[2]}T${m[1].slice(2)} (${tr.call_date}, transcripción)`, en: `${m[2]}Q${m[1].slice(2)} earnings call (${tr.call_date}, transcript)` } : null, release: q ? src(q.source) : null, drafted: entry.drafted || null };
}
// Fiscal-year comments (keyed "FY2026"), written from the 4Q release and call; shown in FY mode for consecutive years.
for (const [yid, entry] of Object.entries(cm.by_year || {})) {
  const m = /^FY(\d{4})$/.exec(yid); if (!m || !fiscalYears[yid]) continue;
  const lines = {}, ops = {};
  for (const [k, c] of Object.entries(entry.comments || {})) { if (KEYMAP[k]) lines[KEYMAP[k]] = { es: c.es, en: c.en, src: c.src || null }; if (OPSMAP[k]) ops[OPSMAP[k]] = { es: c.es, en: c.en, src: c.src || null }; }
  const tr = load("transcripts.json", { calls: {} }).calls[`${yid}Q4`];
  periods[yid] = { lines, ops, call: tr ? { date: tr.call_date, es: `conferencia de resultados del 4T${m[1].slice(2)} (${tr.call_date}, transcripción)`, en: `4Q${m[1].slice(2)} earnings call (${tr.call_date}, transcript)` } : null, release: src(fiscalYears[yid].source), drafted: entry.drafted || null };
}
emit("comments.js", "ORCL_COMMENTS", { updatedAt: cm.updatedAt || now.slice(0, 10), periods }, "One-line explanations for the income-statement comparison (year-over-year), drafted from Oracle's releases and the owner-supplied call transcripts; reviewed before publishing.");

const latestCm = latest ? cm.by_quarter?.[latest.id] : null;
const sum = latestCm?.exec_summary || null;
emit("summary.js", "ORCL_SUMMARY", {
  updatedAt: latestCm?.drafted || cm.updatedAt || now.slice(0, 10),
  basis: { quarter: latest ? gid(latest) : null, resultsDate: latest?.release_date || null, guidanceDate: vint.at(-1)?.date || null, marketDate: mref.price_snapshot?.orcl?.close_date || null },
  headline: latestCm ? { en: latestCm.headline_en, es: latestCm.headline_es } : null,
  sections: sum ? [
    { k: "ops", title: { es: "Operación", en: "Operations" }, es: sum.operations?.es || [], en: sum.operations?.en || [] },
    { k: "guidance", title: { es: "Guía y por qué cambió", en: "Guidance and why it changed" }, es: sum.guidance?.es || [], en: sum.guidance?.en || [] },
    { k: "debt", title: { es: "Deuda y razones", en: "Debt and ratios" }, es: sum.debt?.es || [], en: sum.debt?.en || [] },
    { k: "watch", title: { es: "Qué observar en los próximos reportes", en: "What to watch in the next releases" }, es: sum.watch?.es || [], en: sum.watch?.en || [] },
  ] : [],
}, "Executive summary — rewritten by the reviewing routine when new results, guidance or events land.");

// ---------- cds.js ----------
const cds = load("cds.json", { tenor: 5, recoveryPct: 40, points: [], source: "FactSet (pending authorisation)", updatedAt: null });
emit("cds.js", "ORCL_CDS", cds, "Oracle 5-year CDS spread — FactSet connector contract; placeholder until authorised.");

// ---------- peers.js ----------
emit("peers.js", "ORCL_PEERS", { updatedAt: null, source: "FactSet connector (pending authorisation)", peers: [
  ["MSFT-US", "Microsoft", "NASDAQ"], ["SAP-DE", "SAP", "XETRA"], ["CRM-US", "Salesforce", "NYSE"], ["NOW-US", "ServiceNow", "NYSE"], ["IBM-US", "IBM", "NYSE"], ["WDAY-US", "Workday", "NASDAQ"],
].map(([ticker, name, exchange]) => ({ ticker, name, exchange, currency: "USD", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null })) }, "Peer multiples — placeholder until the FactSet connector is authorised; Oracle's own row is computed live in the page.");

// ---------- quality (for the hidden data-quality page) ----------
const qr = load("quality_report.json", null), st = load("state.json", null);
emit("quality.js", "ORCL_QUALITY", { report: qr, state: st ? { last_harvest: st.last_harvest, last_review: st.last_review, seen: (st.seen_accessions || []).length, pending: (st.pending_extraction || []).filter((p) => p.status === "pending"), log: (st.log || []).slice(-20) } : null }, "Tie-out report and automation state for the hidden data-quality page.");

console.log(`site/data: financials (${finQuarters.length} quarters, ${years.length} years), market (${orclPts.length} ORCL closes, ${spxPts.length} S&P closes, ${tsyPts.length} yield points), guidance (${vint.length} vintages), comments (${Object.keys(periods).length} periods), instruments ${(mref.debt_instruments || []).length}.`);
