#!/usr/bin/env node
// Oracle's own XBRL facts from the SEC company-facts API, for the capex / free-cash-flow section, the
// off-balance-sheet section and the machine check of the figures transcribed from the leases and commitments
// notes (obligations.json). Public data only; every value carries accession, form, filing date and period so
// it traces to the filing on EDGAR.
//
// Rules (owner's, 2026-10-03):
// - Instant concepts (lease liabilities, RPO, purchase-obligation schedule) are kept per period end; when two
//   filings tag the same period (a 10-Q repeats the prior fiscal year-end, a 10-K/A restates), the value filed
//   LAST wins and the earlier accession is recorded as superseded.
// - Duration concepts (capex, finance-lease additions, lease payments) are cumulative within Oracle's fiscal
//   year in the 10-Qs (3, 6, 9 months) and annual in the 10-K. Discrete quarters are derived by subtraction
//   and flagged `derived: true` with the two accessions used, never typed in.
// - Amendments (10-Q/A, 10-K/A) are listed separately so the page can say which accession a figure comes from.
// Run: node scripts/oracle/fetch-xbrl-facts.mjs   (the daily refresh workflow runs it after the harvest)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA } from "./paths.mjs";

const UA = process.env.EDGAR_USER_AGENT || "fnam.mx oracle-model (xbrl facts; contact via repository)";
const CIK = "0001341439";
const today = new Date().toISOString().slice(0, 10);

// concept → { key, kind: instant | duration, label }
const CONCEPTS = [
  ["OperatingLeaseLiability", "op_lease_liability", "instant", "Operating lease liabilities, total"],
  ["OperatingLeaseLiabilityCurrent", "op_lease_liability_current", "instant", "Operating lease liabilities, current"],
  ["OperatingLeaseLiabilityNoncurrent", "op_lease_liability_noncurrent", "instant", "Operating lease liabilities, non-current"],
  ["OperatingLeaseRightOfUseAsset", "op_lease_rou", "instant", "Operating lease right-of-use assets"],
  ["FinanceLeaseLiability", "fin_lease_liability", "instant", "Finance lease liabilities, total"],
  ["FinanceLeaseLiabilityCurrent", "fin_lease_liability_current", "instant", "Finance lease liabilities, current"],
  ["FinanceLeaseLiabilityNoncurrent", "fin_lease_liability_noncurrent", "instant", "Finance lease liabilities, non-current"],
  ["FinanceLeaseRightOfUseAsset", "fin_lease_rou", "instant", "Finance lease right-of-use assets"],
  ["LesseeOperatingLeaseLiabilityUndiscountedExcessAmount", "op_lease_imputed_interest", "instant", "Operating leases: imputed interest (undiscounted payments less liability)"],
  ["FinanceLeaseLiabilityUndiscountedExcessAmount", "fin_lease_imputed_interest", "instant", "Finance leases: imputed interest"],
  ["LesseeOperatingLeaseLiabilityPaymentsDue", "op_lease_payments_undiscounted", "instant", "Operating leases: undiscounted payments"],
  ["FinanceLeaseLiabilityPaymentsDue", "fin_lease_payments_undiscounted", "instant", "Finance leases: undiscounted payments"],
  ["OperatingLeaseWeightedAverageDiscountRatePercent", "op_lease_discount_rate", "instant", "Operating leases: weighted-average discount rate"],
  ["FinanceLeaseWeightedAverageDiscountRatePercent", "fin_lease_discount_rate", "instant", "Finance leases: weighted-average discount rate"],
  ["LesseeOperatingLeaseLiabilityPaymentsRemainderOfFiscalYear", "op_lease_due_remainder", "instant", "Operating lease payments due in the remainder of the fiscal year"],
  ["LesseeOperatingLeaseLiabilityPaymentsDueNextTwelveMonths", "op_lease_due_y1", "instant", "Operating lease payments due in the next fiscal year"],
  ["LesseeOperatingLeaseLiabilityPaymentsDueYearTwo", "op_lease_due_y2", "instant", "Operating lease payments due in fiscal year +2"],
  ["LesseeOperatingLeaseLiabilityPaymentsDueYearThree", "op_lease_due_y3", "instant", "Operating lease payments due in fiscal year +3"],
  ["LesseeOperatingLeaseLiabilityPaymentsDueYearFour", "op_lease_due_y4", "instant", "Operating lease payments due in fiscal year +4"],
  ["LesseeOperatingLeaseLiabilityPaymentsDueYearFive", "op_lease_due_y5", "instant", "Operating lease payments due in fiscal year +5"],
  ["LesseeOperatingLeaseLiabilityPaymentsDueAfterYearFive", "op_lease_due_after", "instant", "Operating lease payments due thereafter"],
  ["FinanceLeaseLiabilityPaymentsRemainderOfFiscalYear", "fin_lease_due_remainder", "instant", "Finance lease payments due in the remainder of the fiscal year"],
  ["FinanceLeaseLiabilityPaymentsDueNextTwelveMonths", "fin_lease_due_y1", "instant", "Finance lease payments due in the next fiscal year"],
  ["FinanceLeaseLiabilityPaymentsDueYearTwo", "fin_lease_due_y2", "instant", "Finance lease payments due in fiscal year +2"],
  ["FinanceLeaseLiabilityPaymentsDueYearThree", "fin_lease_due_y3", "instant", "Finance lease payments due in fiscal year +3"],
  ["FinanceLeaseLiabilityPaymentsDueYearFour", "fin_lease_due_y4", "instant", "Finance lease payments due in fiscal year +4"],
  ["FinanceLeaseLiabilityPaymentsDueYearFive", "fin_lease_due_y5", "instant", "Finance lease payments due in fiscal year +5"],
  ["FinanceLeaseLiabilityPaymentsDueAfterYearFive", "fin_lease_due_after", "instant", "Finance lease payments due thereafter"],
  ["OperatingLeaseCost", "op_lease_cost", "duration", "Operating lease cost"],
  ["FinanceLeaseRightOfUseAssetAmortization", "fin_lease_amortization", "duration", "Finance leases: ROU asset amortization"],
  ["FinanceLeaseInterestExpense", "fin_lease_interest", "duration", "Finance leases: interest expense"],
  ["OperatingLeasePayments", "op_lease_cash_paid", "duration", "Operating leases: cash paid"],
  ["FinanceLeasePrincipalPayments", "fin_lease_principal_paid", "duration", "Finance leases: principal paid"],
  ["RightOfUseAssetObtainedInExchangeForFinanceLeaseLiability", "fin_lease_additions", "duration", "ROU assets obtained in exchange for new finance lease liabilities (finance-lease additions)"],
  ["RightOfUseAssetObtainedInExchangeForOperatingLeaseLiability", "op_lease_additions", "duration", "ROU assets obtained in exchange for new operating lease liabilities"],
  ["PaymentsToAcquirePropertyPlantAndEquipment", "capex_cash", "duration", "Capital expenditures (cash)"],
  ["Depreciation", "depreciation", "duration", "Depreciation"],
  ["UnrecordedUnconditionalPurchaseObligationBalanceSheetAmount", "purchase_obligations_total", "instant", "Unrecorded unconditional purchase obligations, total"],
  ["UnrecordedUnconditionalPurchaseObligationDueInRemainderOfFiscalYear", "po_due_remainder", "instant", "Purchase obligations due in the remainder of the fiscal year"],
  ["UnrecordedUnconditionalPurchaseObligationBalanceOnFirstAnniversary", "po_due_y1", "instant", "Purchase obligations due in year 1"],
  ["UnrecordedUnconditionalPurchaseObligationBalanceOnSecondAnniversary", "po_due_y2", "instant", "Purchase obligations due in year 2"],
  ["UnrecordedUnconditionalPurchaseObligationBalanceOnThirdAnniversary", "po_due_y3", "instant", "Purchase obligations due in year 3"],
  ["UnrecordedUnconditionalPurchaseObligationBalanceOnFourthAnniversary", "po_due_y4", "instant", "Purchase obligations due in year 4"],
  ["UnrecordedUnconditionalPurchaseObligationBalanceOnFifthAnniversary", "po_due_y5", "instant", "Purchase obligations due in year 5"],
  ["UnrecordedUnconditionalPurchaseObligationDueAfterFiveYears", "po_due_after_y5", "instant", "Purchase obligations due after year 5"],
  ["RevenueRemainingPerformanceObligation", "rpo", "instant", "Remaining performance obligations"],
  ["ContractWithCustomerLiability", "deferred_revenue_total", "instant", "Deferred revenues (contract liabilities), total"],
  ["ContractWithCustomerLiabilityNoncurrent", "deferred_revenue_noncurrent", "instant", "Deferred revenues, non-current"],
  ["NetCashProvidedByUsedInOperatingActivities", "cfo", "duration", "Net cash provided by operating activities"],
  ["NotesPayableCurrent", "notes_payable_current", "instant", "Notes payable and other borrowings, current"],
  ["LongTermNotesPayable", "notes_payable_noncurrent", "instant", "Notes payable and other borrowings, non-current"],
  ["DebtLongtermAndShorttermCombinedAmount", "debt_total_carrying", "instant", "Notes payable and other borrowings, total carrying amount"],
  ["DebtInstrumentCarryingAmount", "debt_principal_gross", "instant", "Senior notes and other borrowings, principal (gross of unamortized discount)"],
  ["InterestExpense", "interest_expense", "duration", "Interest expense"],
  ["InterestPaidNet", "interest_paid", "duration", "Interest paid, net"],
  ["RepaymentsOfDebt", "debt_repaid", "duration", "Repayments of borrowings"],
  ["ProceedsFromIssuanceOfSeniorLongTermDebt", "debt_issued", "duration", "Proceeds from issuance of senior notes"],
];
const SINCE = "2023-06-01";

// Oracle's fiscal year ends 31 May: quarter from a period-end date.
const fq = (end) => { const [y, m] = end.split("-").map(Number); const fy = m >= 6 ? y + 1 : y; const q = m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : m <= 2 ? 3 : 4; return { id: `FY${fy}Q${q}`, fy, q }; };
const months = (start, end) => { const [ys, ms] = start.split("-").map(Number), [ye, me] = end.split("-").map(Number); return (ye - ys) * 12 + (me - ms) + 1; };
const accUrl = (accn, doc) => `https://www.sec.gov/Archives/edgar/data/${Number(CIK)}/${accn.replace(/-/g, "")}/${doc || ""}`;

async function main() {
  const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`, { headers: { "User-Agent": UA, Accept: "application/json", "Accept-Encoding": "gzip, deflate" } });
  if (!r.ok) throw new Error(`companyfacts HTTP ${r.status}`);
  const cf = await r.json();
  const facts = cf.facts["us-gaap"] || {};
  // primary document names from the submissions index, so every value links to its filing
  let docs = {};
  try {
    const s = await (await fetch(`https://data.sec.gov/submissions/CIK${CIK}.json`, { headers: { "User-Agent": UA, Accept: "application/json" } })).json();
    const rr = s.filings.recent; for (let i = 0; i < rr.form.length; i++) docs[rr.accessionNumber[i]] = { doc: rr.primaryDocument[i], form: rr.form[i], filed: rr.filingDate[i] };
  } catch (e) { console.error(`submissions index unavailable (${e.message}); filing links point at the accession folder`); }

  const out = { note: "Oracle XBRL facts from the SEC company-facts API (us-gaap taxonomy). US$ millions unless the unit says otherwise. Latest-filed value per period wins; superseded accessions listed. Discrete quarters for duration concepts are derived by subtraction within the fiscal year and flagged. Written by scripts/oracle/fetch-xbrl-facts.mjs.", cik: CIK, fetched: new Date().toISOString(), source: { title: "SEC EDGAR XBRL company facts, Oracle Corporation (CIK 1341439)", url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json` }, concepts: {}, amendments: [], missing: [] };
  const amendSet = new Set();
  for (const [concept, key, kind, label] of CONCEPTS) {
    const f = facts[concept];
    if (!f) { out.missing.push({ concept, key, note: "not tagged by Oracle" }); continue; }
    const unit = Object.keys(f.units)[0];
    const scale = unit === "USD" ? 1e6 : 1;
    const vals = f.units[unit].filter((v) => v.end >= SINCE && /^10-[QK]/.test(v.form));
    for (const v of vals) if (/\/A$/.test(v.form)) amendSet.add(JSON.stringify({ form: v.form, accn: v.accn, filed: v.filed, period_end: v.end }));
    const rec = { concept, label, kind, unit: unit === "USD" ? "USD millions" : unit, periods: [] };
    if (kind === "instant") {
      const byEnd = new Map();
      for (const v of vals.slice().sort((a, b) => a.filed.localeCompare(b.filed) || a.accn.localeCompare(b.accn))) {
        const prev = byEnd.get(v.end);
        const entry = { period_end: v.end, fiscal: fq(v.end).id, value: Math.round((v.val / scale) * 1000) / 1000, form: v.form, accn: v.accn, filed: v.filed, fy: v.fy, fp: v.fp, url: accUrl(v.accn, docs[v.accn]?.doc), superseded: prev ? [...(prev.superseded || []), { accn: prev.accn, form: prev.form, filed: prev.filed, value: prev.value }] : [] };
        byEnd.set(v.end, entry);
      }
      rec.periods = [...byEnd.values()].sort((a, b) => a.period_end.localeCompare(b.period_end));
    } else {
      // keep the latest-filed value per (start, end); then derive quarters within each fiscal year
      const bySpan = new Map();
      for (const v of vals.slice().sort((a, b) => a.filed.localeCompare(b.filed) || a.accn.localeCompare(b.accn))) {
        if (!v.start) continue;
        const k = `${v.start}|${v.end}`; const prev = bySpan.get(k);
        bySpan.set(k, { start: v.start, end: v.end, months: months(v.start, v.end), value: Math.round((v.val / scale) * 1000) / 1000, form: v.form, accn: v.accn, filed: v.filed, url: accUrl(v.accn, docs[v.accn]?.doc), superseded: prev ? [...(prev.superseded || []), { accn: prev.accn, form: prev.form, filed: prev.filed, value: prev.value }] : [] });
      }
      const spans = [...bySpan.values()].filter((s) => [3, 6, 9, 12].includes(s.months)).sort((a, b) => a.end.localeCompare(b.end));
      rec.cumulative = spans.map((s) => ({ ...s, fiscal: fq(s.end).id, ytd_months: s.months }));
      // Oracle tags the discrete 3-month quarter where it prints one (income-statement lines) and only the cumulative
      // year-to-date in the cash-flow statement: a quarter read directly wins; the subtraction is kept as a cross-check.
      const quarters = [];
      const push = (entry) => { const i = quarters.findIndex((x) => x.quarter === entry.quarter); if (i < 0) { quarters.push(entry); return; } const cur = quarters[i]; if (!cur.derived && entry.derived) { cur.cross_check = { value: entry.value, method: entry.method, diff: entry.value == null ? null : Math.round((entry.value - cur.value) * 1000) / 1000 }; return; } if (cur.derived && !entry.derived) { entry.cross_check = { value: cur.value, method: cur.method, diff: cur.value == null ? null : Math.round((cur.value - entry.value) * 1000) / 1000 }; quarters[i] = entry; } };
      for (const s of spans.slice().sort((a, b) => a.end.localeCompare(b.end) || a.months - b.months)) {
        const q = fq(s.end);
        if (s.months === 3) { push({ quarter: q.id, period_end: s.end, value: s.value, derived: false, from: [{ accn: s.accn, form: s.form, span: `${s.start}→${s.end}`, value: s.value }], url: s.url, filed: s.filed }); continue; }
        const prevEnd = spans.find((p) => p.start === s.start && p.months === s.months - 3);
        if (prevEnd) push({ quarter: q.id, period_end: s.end, value: Math.round((s.value - prevEnd.value) * 1000) / 1000, derived: true, method: `${s.months}-month cumulative (${s.form} ${s.accn}) minus ${prevEnd.months}-month cumulative (${prevEnd.form} ${prevEnd.accn})`, from: [{ accn: s.accn, form: s.form, span: `${s.start}→${s.end}`, value: s.value }, { accn: prevEnd.accn, form: prevEnd.form, span: `${prevEnd.start}→${prevEnd.end}`, value: prevEnd.value }], url: s.url, filed: s.filed });
        else push({ quarter: q.id, period_end: s.end, value: null, derived: true, method: `${s.months}-month cumulative available (${s.value}) but the prior cumulative period is not tagged; quarter not derivable`, from: [{ accn: s.accn, form: s.form, span: `${s.start}→${s.end}`, value: s.value }], url: s.url, filed: s.filed });
      }
      // a 12-month span also provides the fiscal year
      rec.fiscal_years = spans.filter((s) => s.months === 12).map((s) => ({ fiscal_year: `FY${fq(s.end).fy}`, period_end: s.end, value: s.value, accn: s.accn, form: s.form, filed: s.filed, url: s.url }));
      rec.quarters = quarters;
    }
    out.concepts[key] = rec;
  }
  out.amendments = [...amendSet].map((s) => JSON.parse(s)).sort((a, b) => b.filed.localeCompare(a.filed));
  const latestEnd = Object.values(out.concepts).flatMap((c) => (c.periods || c.cumulative || []).map((p) => p.period_end || p.end)).sort().pop() || null;
  out.latest_period_end = latestEnd;
  out.latest_filing = latestEnd ? Object.values(out.concepts).flatMap((c) => (c.periods || c.cumulative || [])).filter((p) => (p.period_end || p.end) === latestEnd).map((p) => ({ accn: p.accn, form: p.form, filed: p.filed, url: p.url })).sort((a, b) => b.filed.localeCompare(a.filed))[0] : null;
  writeFileSync(join(DATA, "xbrl_facts.json"), JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`xbrl_facts.json: ${Object.keys(out.concepts).length} concepts, latest period ${latestEnd}, ${out.amendments.length} amended filing(s) seen, ${out.missing.length} concept(s) not tagged.`);
}

main().catch((e) => { console.error(`fetch-xbrl-facts failed: ${e.message}`); process.exit(1); });
