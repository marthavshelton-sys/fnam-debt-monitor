#!/usr/bin/env node
// Tie-out validator for the Oracle model's /data files.
// Run: node scripts/oracle/validate-data.mjs
// Exits non-zero (and fails CI) on any FAIL. WARN means "not enough data to check yet", not an error.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
const TOL = 1; // $ millions tolerance for rounding in source releases
const EPS_TOL = 0.02; // per-share tolerance (shares outstanding are printed rounded)

let failures = [];
let warnings = [];
let passed = [];
let checks = 0;

function loadJSON(name) {
  const p = join(DATA, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function near(a, b, tol) {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return Math.abs(a - b) <= tol;
}

function check(label, cond) {
  checks++;
  if (cond === null) {
    warnings.push(`WARN  ${label} — insufficient data, skipped`);
    return;
  }
  if (!cond) failures.push(`FAIL  ${label}`);
  else passed.push(label);
}

// ---------- quarters.json ----------
const q = loadJSON("quarters.json");
if (!q) {
  warnings.push("WARN  tools/oracle/data/quarters.json not found — skipped all quarterly checks");
} else {
  for (const rec of q.quarters) {
    const id = rec.id;
    const g = rec.gaap;
    if (!g) { warnings.push(`WARN  ${id}: no gaap block`); continue; }

    const revSum = ["cloud", "software", "hardware", "services"]
      .map((k) => g.revenue?.[k])
      .every((v) => v !== null && v !== undefined)
      ? g.revenue.cloud + g.revenue.software + g.revenue.hardware + g.revenue.services
      : null;
    check(`${id}: revenue components sum to total revenue`, revSum === null ? null : near(revSum, g.revenue.total, TOL));

    const opexKeys = ["cloud_and_software_cost", "hardware_cost", "services_cost", "sales_and_marketing", "research_and_development", "general_and_administrative", "amortization_of_intangibles", "restructuring_and_other"];
    const opexVals = opexKeys.map((k) => g.opex?.[k]);
    const opexSum = opexVals.every((v) => v !== null && v !== undefined) ? opexVals.reduce((a, b) => a + b, 0) : null;
    check(`${id}: opex components sum to total opex`, opexSum === null ? null : near(opexSum, g.opex.total, TOL));

    const opInc = (g.revenue?.total != null && g.opex?.total != null) ? g.revenue.total - g.opex.total : null;
    check(`${id}: operating income = revenue − opex`, opInc === null ? null : near(opInc, g.operating_income, TOL));

    const pretax = [g.operating_income, g.interest_expense, g.nonoperating_income_net].every((v) => v !== null && v !== undefined)
      ? g.operating_income + g.interest_expense + g.nonoperating_income_net
      : null;
    check(`${id}: pretax income = operating income + interest + non-operating`, pretax === null ? null : near(pretax, g.pretax_income, TOL));

    const ni = (g.pretax_income != null && g.tax_provision != null) ? g.pretax_income - g.tax_provision : null;
    check(`${id}: net income = pretax income − tax`, ni === null ? null : near(ni, g.net_income, TOL));

    const niCommon = (g.net_income != null && g.preferred_dividends != null) ? g.net_income - g.preferred_dividends : null;
    check(`${id}: net income to common = net income − preferred dividends`, niCommon === null ? null : near(niCommon, g.net_income_common, TOL));

    const epsCalc = (g.net_income_common != null && g.diluted_shares) ? g.net_income_common / g.diluted_shares : null;
    check(`${id}: diluted EPS ≈ net income to common / diluted shares`, epsCalc === null ? null : near(epsCalc, g.diluted_eps, EPS_TOL));

    const bs = rec.balance_sheet;
    if (bs) {
      const debtSum = (bs.short_term_debt != null && bs.long_term_debt != null) ? bs.short_term_debt + bs.long_term_debt : null;
      check(`${id}: total debt = short-term + long-term debt`, debtSum === null ? null : near(debtSum, bs.total_debt, TOL));
      const cashSum = (bs.cash_and_equivalents != null && bs.marketable_securities != null) ? bs.cash_and_equivalents + bs.marketable_securities : null;
      check(`${id}: cash + investments = cash & equivalents + marketable securities`, cashSum === null ? null : near(cashSum, bs.cash_and_investments_total, TOL));
    }

    const cf = rec.cash_flow;
    if (cf && cf.operating_cash_flow_quarter != null && cf.capex_quarter != null) {
      check(`${id}: free cash flow = operating cash flow + capex`, near(cf.operating_cash_flow_quarter + cf.capex_quarter, cf.free_cash_flow_quarter, TOL));
    }

    const da = rec.da;
    if (da) {
      check(`${id}: total D&A = depreciation + amortization`, near(da.depreciation + da.amortization_of_intangibles, da.total_da, TOL));
      // Cash-flow amortization vs the income-statement line: Oracle's own tables differ by $1M in two quarters.
      check(`${id}: cash-flow amortization ≈ income-statement amortization of intangibles`, near(da.amortization_of_intangibles, g.opex?.amortization_of_intangibles, 2));
    }

    const rc = rec.revenue_recast_fy2026_basis;
    if (rc) {
      check(`${id}: recast revenue lines sum to recast total`, near(rc.cloud + rc.software + rc.hardware + rc.services, rc.total, TOL));
      check(`${id}: recast total = originally reported total`, near(rc.total, g.revenue?.total, TOL));
    }
  }

  // Fiscal-year roll-up: if all 4 quarters of a fiscal year plus an annual figure are present, they must sum.
  const fy = loadJSON("fiscal_years.json");
  if (fy) {
    for (const [label, annual] of Object.entries(fy.fiscal_years ?? {})) {
      const yr = Number(label.replace("FY", ""));
      const qs = q.quarters.filter((r) => r.fiscal_year === yr && r.gaap?.revenue?.total != null);
      if (qs.length === 4 && annual.gaap?.revenue_total != null) {
        const sum = qs.reduce((a, r) => a + r.gaap.revenue.total, 0);
        check(`${label}: sum of 4 quarters' revenue = annual revenue`, near(sum, annual.gaap.revenue_total, TOL * 4));
        if (annual.gaap.operating_cash_flow != null && qs.every((r) => r.cash_flow?.operating_cash_flow_quarter != null)) {
          check(`${label}: sum of 4 quarters' operating cash flow = annual`, near(qs.reduce((a, r) => a + r.cash_flow.operating_cash_flow_quarter, 0), annual.gaap.operating_cash_flow, TOL * 4));
          check(`${label}: sum of 4 quarters' capex = annual`, near(qs.reduce((a, r) => a + r.cash_flow.capex_quarter, 0), annual.gaap.capex, TOL * 4));
        }
        if (annual.da && qs.every((r) => r.da)) {
          check(`${label}: sum of 4 quarters' D&A = annual D&A`, near(qs.reduce((a, r) => a + r.da.total_da, 0), annual.da.total_da, TOL * 4));
        }
      } else {
        warnings.push(`WARN  ${label}: fewer than 4 quarters captured yet — annual roll-up check skipped`);
      }
    }
  } else {
    warnings.push("WARN  tools/oracle/data/fiscal_years.json not found — skipped annual roll-up checks");
  }
}

// ---------- guidance.json: every range is [low, high] with low ≤ high ----------
const gd = loadJSON("guidance.json");
if (gd) {
  for (const v of gd.vintages) {
    for (const k of ["total_revenue_growth_pct", "cloud_revenue_growth_pct_cc", "cloud_revenue_growth_pct_usd", "non_gaap_eps_usd_cc", "non_gaap_eps_usd_reported"]) {
      const r = v[k];
      if (r == null) continue;
      check(`${v.issued_in} guidance ${k}: well-formed range`, Array.isArray(r) && r.length === 2 && typeof r[0] === "number" && typeof r[1] === "number" && r[0] <= r[1]);
    }
  }
}

// ---------- stale-series detection ----------
const today = new Date();
const daysSince = (iso) => (iso ? Math.round((today - new Date(iso + "T00:00:00")) / 864e5) : null);
const stale = [];
const mref = loadJSON("market_reference.json");
if (mref?.price_snapshot?.orcl?.close_date != null && daysSince(mref.price_snapshot.orcl.close_date) > 5) stale.push(`Share price last close ${mref.price_snapshot.orcl.close_date} (${daysSince(mref.price_snapshot.orcl.close_date)} days ago)`);
if (mref?.treasury_10y?.as_of_date != null && daysSince(mref.treasury_10y.as_of_date) > 5) stale.push(`10-year Treasury as of ${mref.treasury_10y.as_of_date}`);
if (q?.quarters?.length) {
  const latest = q.quarters.slice().sort((a, b) => (a.period_end < b.period_end ? 1 : -1))[0];
  if (daysSince(latest.release_date) > 100) stale.push(`Latest quarter ${latest.id} released ${latest.release_date} — a newer release is likely due`);
}
const st = loadJSON("state.json");
const pendingCount = (st?.pending_extraction || []).filter((p) => p.status === "pending").length;
if (pendingCount) stale.push(`${pendingCount} archived filing(s) pending extraction (tools/oracle/data/state.json)`);

// ---------- report ----------
writeFileSync(join(DATA, "quality_report.json"), JSON.stringify({
  generated: today.toISOString(),
  summary: { checks, failed: failures.length, warnings: warnings.length, stale: stale.length },
  passed,
  failures: failures.map((f) => f.replace(/^FAIL\s+/, "")),
  warnings: warnings.map((w) => w.replace(/^WARN\s+/, "")),
  stale,
}, null, 2) + "\n", "utf8");

console.log(`Tie-out: ${checks} checks run, ${failures.length} failed, ${warnings.length} warnings, ${stale.length} stale.\n`);
if (stale.length) { console.log(stale.map((s) => `STALE ${s}`).join("\n")); console.log(""); }
if (warnings.length) { console.log(warnings.join("\n")); console.log(""); }
if (failures.length) {
  console.log(failures.join("\n"));
  console.log("\nBUILD FAILED — fix the source data before publishing.");
  process.exit(1);
} else {
  console.log("All available checks passed.");
  process.exit(0);
}
