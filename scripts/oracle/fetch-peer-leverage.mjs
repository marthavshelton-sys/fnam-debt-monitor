#!/usr/bin/env node
// Lease-adjusted leverage inputs for Baa-range technology issuers, from the SEC's XBRL company-facts API, for the
// off-balance-sheet section (section 11). Public data only; every value carries its filing accession, period end
// and XBRL tag so it can be traced to the filing. Stocks (debt, lease liabilities, cash) are taken at the company's
// latest balance-sheet date; flows (operating income, D&A, operating lease cost) at its latest fiscal year, and a
// tag is only accepted when its period matches that date, so a stale tag from an old filing is never picked up.
// Ratios are computed on the page and labelled derived. Ratings are not in XBRL and stay with their own sources.
// Oracle's own row is computed live from the model's balance sheet, not from XBRL.
// Run: node scripts/oracle/fetch-peer-leverage.mjs   (the filings workflow runs it every weekday)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA } from "./paths.mjs";

const UA = process.env.EDGAR_USER_AGENT || "fnam.mx oracle-model (peer leverage; contact via repository)";
const today = new Date().toISOString().slice(0, 10);
const PEERS = [
  { name: "Broadcom", ticker: "AVGO", cik: "0001730168" },
  { name: "Dell Technologies", ticker: "DELL", cik: "0001571996" },
  { name: "Intel", ticker: "INTC", cik: "0000050863" },
  { name: "IBM", ticker: "IBM", cik: "0000051143" },
  { name: "Hewlett Packard Enterprise", ticker: "HPE", cik: "0001645590" },
];
const TAGS = {
  anchor_bs: ["CashAndCashEquivalentsAtCarryingValue"],
  anchor_fy: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "OperatingIncomeLoss"],
  debt_lt: ["LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligations"],
  debt_st: ["DebtCurrent", "LongTermDebtCurrent", "ShortTermBorrowings", "LongTermDebtAndCapitalLeaseObligationsCurrent"],
  op_lease: ["OperatingLeaseLiability"], op_lease_parts: ["OperatingLeaseLiabilityCurrent", "OperatingLeaseLiabilityNoncurrent"],
  fin_lease: ["FinanceLeaseLiability"], fin_lease_parts: ["FinanceLeaseLiabilityCurrent", "FinanceLeaseLiabilityNoncurrent"],
  cash: ["CashAndCashEquivalentsAtCarryingValue"],
  st_inv: ["ShortTermInvestments", "MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"],
  op_income: ["OperatingIncomeLoss"],
  pretax: ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"],
  interest: ["InterestExpenseNonoperating", "InterestExpense"],
  da: ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization"],
  da_parts: ["Depreciation", "AmortizationOfIntangibleAssets"],
  op_lease_cost: ["OperatingLeaseCost", "LeaseCost", "OperatingLeasesRentExpenseNet", "LeaseAndRentalExpense"],
  revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax"],
};

async function facts(cik) {
  const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for CIK ${cik}`);
  return r.json();
}
const usd = (f, tag) => f.facts?.["us-gaap"]?.[tag]?.units?.USD || null;
const isFY = (x) => x.form === "10-K" && x.start && x.end && (new Date(x.end) - new Date(x.start)) / 864e5 > 340 && (new Date(x.end) - new Date(x.start)) / 864e5 < 380;
const isBS = (x) => /^10-[KQ]/.test(x.form) && x.end && !x.start;
const latestEnd = (f, tags, pred) => tags.map((t) => (usd(f, t) || []).filter(pred).map((x) => x.end).sort().at(-1)).filter(Boolean).sort().at(-1) || null;
// value of the first tag that has a point at exactly `end` (latest filed value for that period)
function at(f, tags, end, pred) {
  for (const tag of tags) {
    const pts = (usd(f, tag) || []).filter((x) => pred(x) && x.end === end).sort((a, b) => a.filed.localeCompare(b.filed));
    if (pts.length) { const p = pts.at(-1); return { value: p.val, start: p.start || null, end: p.end, form: p.form, accn: p.accn, fy: p.fy, tag }; }
  }
  return null;
}
function sumAt(f, tags, end, pred) {
  const parts = tags.map((t) => at(f, [t], end, pred)).filter(Boolean);
  if (parts.length !== tags.length) return null;
  return { value: parts.reduce((a, p) => a + p.value, 0), start: parts[0].start, end, form: parts[0].form, accn: parts[0].accn, fy: parts[0].fy, tag: parts.map((p) => p.tag).join("+") };
}
const m = (x) => (x ? { usd_m: Math.round(x.value / 1e6), end: x.end, start: x.start, form: x.form, accession: x.accn, tag: x.tag } : null);

async function main() {
  const out = [];
  for (const p of PEERS) {
    try {
      const f = await facts(p.cik);
      const bsEnd = latestEnd(f, TAGS.anchor_bs, isBS), fyEnd = latestEnd(f, TAGS.anchor_fy, isFY);
      if (!bsEnd || !fyEnd) throw new Error("no balance-sheet or fiscal-year anchor found");
      const B = (tags) => at(f, tags, bsEnd, isBS), Fy = (tags) => at(f, tags, fyEnd, isFY);
      const debtLt = B(TAGS.debt_lt), debtSt = B(TAGS.debt_st);
      // lease liabilities are often tagged only in the 10-K: fall back to the fiscal-year-end balance sheet (its own date is recorded)
      const opLease = B(TAGS.op_lease) || sumAt(f, TAGS.op_lease_parts, bsEnd, isBS) || at(f, TAGS.op_lease, fyEnd, isBS) || sumAt(f, TAGS.op_lease_parts, fyEnd, isBS);
      const finLease = B(TAGS.fin_lease) || sumAt(f, TAGS.fin_lease_parts, bsEnd, isBS) || at(f, TAGS.fin_lease, fyEnd, isBS) || sumAt(f, TAGS.fin_lease_parts, fyEnd, isBS);
      const cash = B(TAGS.cash), stInv = B(TAGS.st_inv);
      const opInc = Fy(TAGS.op_income), pretax = Fy(TAGS.pretax), interest = Fy(TAGS.interest);
      const da = Fy(TAGS.da) || sumAt(f, TAGS.da_parts, fyEnd, isFY);
      const olc = Fy(TAGS.op_lease_cost), rev = Fy(TAGS.revenue);
      // EBIT basis: operating income where the company reports it; otherwise pre-tax income + interest expense (IBM).
      const ebit = opInc ? { ...opInc, basis: "operating_income" } : pretax && interest ? { value: pretax.value + interest.value, end: fyEnd, start: pretax.start, form: pretax.form, accn: pretax.accn, fy: pretax.fy, tag: `${pretax.tag}+${interest.tag}`, basis: "pretax_plus_interest" } : null;
      out.push({ name: p.name, ticker: p.ticker, cik: p.cik, entity: f.entityName, fetched: today, balance_sheet_date: bsEnd, fiscal_year_end: fyEnd,
        source: { title: `SEC XBRL company facts, CIK ${p.cik}`, url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${p.cik}.json`, filings: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${p.cik}&type=10-&dateb=&owner=include&count=10` },
        balance_sheet: { debt_noncurrent: m(debtLt), debt_current: m(debtSt), operating_lease_liabilities: m(opLease), finance_lease_liabilities: m(finLease), cash: m(cash), short_term_investments: m(stInv) },
        fiscal_year: { ebit: ebit ? { ...m(ebit), basis: ebit.basis } : null, depreciation_amortization: m(da), operating_lease_cost: m(olc), revenue: m(rev) } });
      console.log(`${p.ticker}: BS ${bsEnd} debt ${debtLt ? Math.round(debtLt.value / 1e6) : "?"}+${debtSt ? Math.round(debtSt.value / 1e6) : "?"} | op lease ${opLease ? Math.round(opLease.value / 1e6) : "?"} | fin lease ${finLease ? Math.round(finLease.value / 1e6) : "—"} | cash ${cash ? Math.round(cash.value / 1e6) : "?"}+${stInv ? Math.round(stInv.value / 1e6) : 0} || FY ${fyEnd} EBIT ${ebit ? Math.round(ebit.value / 1e6) : "?"} (${ebit ? ebit.basis : "-"}) D&A ${da ? Math.round(da.value / 1e6) : "?"} lease cost ${olc ? Math.round(olc.value / 1e6) : "?"}`);
    } catch (e) { console.error(`${p.ticker}: ${e.message}`); out.push({ name: p.name, ticker: p.ticker, cik: p.cik, error: String(e.message), fetched: today }); }
    await new Promise((r) => setTimeout(r, 400));
  }
  writeFileSync(join(DATA, "peer_leverage.json"), JSON.stringify({ _comment: "Lease-adjusted leverage inputs for Baa-range technology issuers from SEC XBRL company facts (scripts/oracle/fetch-peer-leverage.mjs). Stocks at each company's latest balance-sheet date; flows for its latest fiscal year; a tag is accepted only when its period matches that date. Ratios (net debt / EBITDA; lease-adjusted net debt / EBITDAR) are computed on the page and labelled derived. EBIT basis is operating income, or pre-tax income + interest expense where the company does not report operating income. Ratings are not in XBRL.", fetched: today, peers: out }, null, 2) + "\n", "utf8");
  console.log("peer_leverage.json written.");
}
main().catch((e) => { console.error(e); process.exit(1); });
