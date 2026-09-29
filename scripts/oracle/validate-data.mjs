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

let lastNear = null; // difference and tolerance of the most recent near() call, attached to the next check()
const results = [];   // structured record of every check, rendered by site/oracle/quality.html
function near(a, b, tol) {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  lastNear = { diff: Math.round((a - b) * 1e4) / 1e4, tol };
  return Math.abs(a - b) <= tol;
}

function check(label, cond) {
  checks++;
  const m = lastNear; lastNear = null;
  const i = label.indexOf(": "); const tag = i > 0 ? label.slice(0, i) : "general", name = i > 0 ? label.slice(i + 2) : label;
  const status = cond === null ? "warn" : cond ? "ok" : "fail";
  results.push({ tag, check: name, status, diff: status === "warn" || !m ? null : m.diff, tol: m ? m.tol : null, note: status === "warn" ? "insufficient data, skipped" : null });
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
      check(`${v.issued_in}: guidance ${k} is a well-formed range`, Array.isArray(r) && r.length === 2 && typeof r[0] === "number" && typeof r[1] === "number" && r[0] <= r[1]);
    }
  }
}

// ---------- obligations.json: leases, purchase obligations, preferred stock (section 11 / dividends) ----------
const ob = loadJSON("obligations.json");
if (ob) {
  const bs = ob.balance_sheet || {}, Lz = ob.leases || {}, po = ob.purchase_obligations || {}, pf = ob.preferred || {}, un = Lz.uncommenced || {};
  check("obligations: notes payable current + non-current = total", near(bs.notes_payable_current + bs.notes_payable_noncurrent, bs.notes_payable_total, TOL));
  check("obligations: cash + marketable securities = cash and investments", near(bs.cash_and_equivalents + bs.marketable_securities, bs.cash_and_investments, TOL));
  check("obligations: net debt = notes payable − cash and investments", near(bs.notes_payable_total - bs.cash_and_investments, bs.net_debt_reported, TOL));
  check("obligations: operating lease liabilities current + non-current = total", near(Lz.operating_liabilities_current + Lz.operating_liabilities_noncurrent, Lz.operating_liabilities_total, TOL));
  check("obligations: finance lease liabilities current + non-current = total", near(Lz.finance_liabilities_current + Lz.finance_liabilities_noncurrent, Lz.finance_liabilities_total, TOL));
  check("obligations: purchase-obligation schedule sums to the total", near((po.schedule || []).reduce((a, x) => a + x.usd_m, 0), po.total, TOL));
  check("obligations: preferred quarterly dividend = 6.50% × US$5 bn ÷ 4", near(pf.gross_proceeds_usd_m * pf.dividend_rate_pct / 100 / 4, pf.dividend_quarterly_usd_m, 0.5));
  check("obligations: preferred conversion rates = liquidation preference ÷ threshold and initial prices", near(pf.liquidation_preference_per_share_usd / pf.threshold_appreciation_price_usd, pf.min_conversion_rate, 0.05) && near(pf.liquidation_preference_per_share_usd / pf.initial_price_usd, pf.max_conversion_rate, 0.05));
  check("obligations: uncommenced-lease history ends at the current figure and period", Array.isArray(un.history) && un.history.length > 0 && un.history[un.history.length - 1].usd_bn === un.usd_bn && un.history[un.history.length - 1].as_of === ob.as_of);
  const qq = (q?.quarters || []).find((x) => x.period_end === ob.as_of);
  check("obligations: cash and investments tie to quarters.json for the same period end", qq?.balance_sheet ? near(bs.cash_and_investments, qq.balance_sheet.cash_and_investments_total, TOL) : null);
  check("obligations: notes payable tie to quarters.json total debt for the same period end", qq?.balance_sheet ? near(bs.notes_payable_total, qq.balance_sheet.total_debt, TOL) : null);
}

// ---------- press.json: market concerns (window, links, themes) ----------
const prs = loadJSON("press.json");
if (prs) {
  const items = prs.items || [];
  check("press: every item has a date, outlet, title, https link, theme and both summaries", items.length > 0 && items.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.outlet && x.title && /^https:\/\//.test(x.url) && x.theme && x.en && x.es));
  check("press: every theme used is declared", items.every((x) => (prs.themes || []).some((t) => t.id === x.theme)));
  check("press: no item is dated after as_of", items.every((x) => x.date <= prs.as_of));
}

// ---------- factset.json: consensus snapshot (valuation section, peers, DCF seed) ----------
const fsj = loadJSON("factset.json");
if (fsj) {
  const o = fsj.oracle || {}, n = o.ntm || {}, r = o.ratings;
  check("factset: as_of, price_date and fetched are ISO dates", [fsj.as_of, fsj.price_date, fsj.fetched].every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")));
  check("factset: Oracle NTM EPS, EBITDA and sales are positive", n.eps?.mean > 0 && n.ebitda?.mean > 0 && n.sales?.mean > 0);
  check("factset: every fiscal-year record ends on 31 May and carries Oracle's own label", (o.fiscal || []).length > 0 && (o.fiscal || []).every((f) => /-05-31$/.test(f.fiscal_end) && /^FY\d{4}$/.test(f.fy) && +f.fy.slice(2) === +f.fiscal_end.slice(0, 4)));
  check("factset: NTM history is dated and ascending", Array.isArray(o.ntm_history) && o.ntm_history.length > 4 && o.ntm_history.every((h, i, a) => /^\d{4}-\d{2}-\d{2}$/.test(h.date) && (i === 0 || a[i - 1].date < h.date)));
  check("factset: rating counts add up to the total", !r || r.buy + r.overweight + r.hold + r.underweight + r.sell === r.total);
  check("factset: at least six peers with price, market cap and NTM EPS", (fsj.peers || []).filter((p) => p.price > 0 && p.market_cap_usd_m > 0 && p.ntm?.eps != null).length >= 6);
}

// ---------- freshness of series and snapshots, curated-file coverage ----------
const today = new Date();
const daysSince = (iso) => (iso ? Math.round((today - new Date(String(iso).slice(0, 10) + "T00:00:00Z")) / 864e5) : null);
const mref = loadJSON("market_reference.json"), cal = loadJSON("calendar.json"), plv = loadJSON("peer_leverage.json"), st = loadJSON("state.json");
const cm = loadJSON("comments.json"), tr = loadJSON("transcripts.json"), bo = loadJSON("buildout.json"), fyj = loadJSON("fiscal_years.json"), edg = loadJSON("edgar_recent.json"), irf = loadJSON("ir_feed.json");
const sortedQ = q?.quarters?.length ? q.quarters.slice().sort((a, b) => (a.period_end < b.period_end ? -1 : 1)) : [];
const latest = sortedQ.length ? sortedQ[sortedQ.length - 1] : null, first = sortedQ[0] || null;
const latestId = latest ? latest.id : null;
const nextRes = cal?.nextResults?.date || null, est = (cal?.estimates || [])[0] || null;
const freshness = [];
const fresh = (series, lastDate, limitDays, note) => { const age = daysSince(lastDate); freshness.push({ series, lastDate: lastDate ? String(lastDate).slice(0, 10) : null, ageDays: age, limitDays, status: lastDate == null || age > limitDays ? "warn" : "ok", note: note || null }); };
fresh("Share price (ORCL close)", mref?.price_snapshot?.orcl?.close_date, 5, "fetch-market.mjs, weekdays 13:30 and 21:45 UTC");
fresh("10-year Treasury (FRED DGS10)", mref?.treasury_10y?.as_of_date, 5, "fetch-market.mjs");
fresh("Latest quarter release", latest?.release_date, 100, latest ? `${latest.id}${nextRes ? `; next results confirmed for ${nextRes}` : est ? `; next results estimated ${est.window_start} to ${est.window_end}` : ""}` : null);
fresh("EDGAR submissions snapshot", edg?.fetched, 4, "harvest-filings.mjs, weekdays 13:30 UTC");
fresh("Oracle IR press-release snapshot", irf?.fetched, 4, "harvest-filings.mjs");
fresh("Investor calendar", cal?.generated, 10, "fetch-calendar.mjs");
fresh("Peer leverage (SEC XBRL)", plv?.fetched, 10, "fetch-peer-leverage.mjs");
fresh("FactSet consensus snapshot", fsj?.fetched, 7, "cloud routine FactSet refresh, weekdays 14:20 UTC");
fresh("Market concerns (press sweep)", prs?.as_of, 10, "desktop task, Mondays");
const pendingCount = (st?.pending_extraction || []).filter((p) => p.status === "pending").length;
freshness.push({ series: "Filings pending extraction", lastDate: st?.last_harvest ? String(st.last_harvest).slice(0, 10) : null, ageDays: null, limitDays: null, status: pendingCount ? "warn" : "ok", note: pendingCount ? `${pendingCount} archived filing(s) waiting for the routine (state.json)` : "nothing pending (last harvest date shown)" });
const stale = freshness.filter((f) => f.status === "warn").map((f) => `${f.series}: ${f.lastDate || "—"}${f.ageDays != null ? ` (${f.ageDays} days)` : ""}${f.note ? " — " + f.note : ""}`);

const curated = [];
const cur = (file, ok, detail) => curated.push({ file, status: ok ? "ok" : "warn", detail });
const cmQ = latestId ? cm?.by_quarter?.[latestId] : null; const cmN = cmQ ? Object.keys(cmQ.comments || {}).length : 0;
cur("comments.json", !!(cmQ && cmN && cmQ.exec_summary), cmQ ? `${latestId}: ${cmN} line comments; executive summary ${cmQ.exec_summary ? "present" : "missing"}; drafted ${cmQ.drafted || "—"}` : `${latestId || "latest quarter"} has no comments yet`);
const gv = (gd?.vintages || []).slice().sort((a, b) => String(a.issued_on).localeCompare(String(b.issued_on))).pop();
cur("guidance.json", !!(gv && gv.issued_in === latestId), gv ? `latest vintage issued in ${gv.issued_in} (${gv.issued_on}); ${(gd.vintages || []).length} vintages` : "no vintages");
cur("transcripts.json", !!(latestId && tr?.calls?.[latestId]), latestId && tr?.calls?.[latestId] ? `${latestId} call on file (${tr.calls[latestId].call_date}); ${Object.keys(tr.calls).length} calls` : `${latestId || "latest"} call transcript not merged`);
cur("buildout.json", !!(bo && bo.promises?.as_of === latestId), bo ? `promises through ${bo.promises?.as_of || "—"}; ${(bo.sites || []).length} sites; reviewed ${bo.updated || "—"}` : "missing");
cur("obligations.json", !!(ob && latest && ob.as_of === latest.period_end), ob ? `as of ${ob.as_of} (10-Q notes); updated ${ob.updated}` : "missing");
const fyKeys = Object.keys(fyj?.fiscal_years || {}).sort(); const lastFy = fyKeys[fyKeys.length - 1] || null; const expFy = latest ? `FY${latest.fiscal_quarter === 4 ? latest.fiscal_year : latest.fiscal_year - 1}` : null;
cur("fiscal_years.json", !!(lastFy && lastFy === expFy), `${fyKeys[0] || "—"} to ${lastFy || "—"}; expected through ${expFy || "—"}`);
cur("market_reference.json", !!(mref?.price_snapshot?.orcl?.shares_outstanding_millions && daysSince(mref?.price_snapshot?.orcl?.close_date) <= 5), mref ? `shares ${mref.price_snapshot?.orcl?.shares_outstanding_millions} M; price ${mref.price_snapshot?.orcl?.close_date}; ${(mref.credit_ratings || []).length} ratings; ${(mref.debt_instruments || []).length} debt instruments` : "missing");
cur("calendar.json", !!cal, cal ? `${(cal.events || []).length} events; next results ${nextRes || (est ? `estimated ${est.window_start} to ${est.window_end}` : "—")}; ${(cal.manual_events || []).length} manual` : "missing");
cur("press.json", !!(prs && (prs.items || []).length && daysSince(prs.as_of) <= 10), prs ? `${(prs.items || []).length} items, as of ${prs.as_of}` : "missing");
cur("factset.json", !!(fsj && daysSince(fsj.fetched) <= 7), fsj ? `consensus ${fsj.as_of}; prices ${fsj.price_date}; ${(fsj.peers || []).length} peers; fetched ${fsj.fetched}` : "missing");
cur("peer_leverage.json", !!(plv && (plv.peers || []).some((p) => !p.error)), plv ? `${(plv.peers || []).filter((p) => !p.error).length} peers; fetched ${plv.fetched}` : "missing");

// ---------- report ----------
const warnOnly = warnings.map((w) => w.replace(/^WARN\s+/, "")).filter((w) => !/ — insufficient data, skipped$/.test(w)).map((w) => { const i = w.indexOf(": "); return { tag: i > 0 ? w.slice(0, i) : "general", check: i > 0 ? w.slice(i + 2) : w, status: "warn", diff: null, tol: null, note: null }; });
writeFileSync(join(DATA, "quality_report.json"), JSON.stringify({
  generated: today.toISOString(),
  summary: { checks, failed: failures.length, warnings: warnings.length, stale: stale.length },
  latestQuarter: latestId, latestPeriodEnd: latest?.period_end || null, latestReleaseDate: latest?.release_date || null,
  nextResults: nextRes, nextResultsEstimate: est ? { start: est.window_start, end: est.window_end } : null,
  tolerances: { usdM: TOL, eps: EPS_TOL },
  coverage: { quarters: [first?.id || null, latestId], years: [fyKeys[0] || null, lastFy] },
  checks: [...results, ...warnOnly],
  freshness, curated,
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
