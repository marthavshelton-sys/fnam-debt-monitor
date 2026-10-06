#!/usr/bin/env node
// Tie-out validator for the Oracle model's /data files.
// Run: node scripts/oracle/validate-data.mjs
// Exits non-zero (and fails CI) on any FAIL. WARN means "not enough data to check yet", not an error.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
import { htmlToText, numAfter } from "./test-parsers.mjs";
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
  // trailing averages of the forward multiples (owner's request 2026-10-06): every peer and Oracle carry y1/y3/y5 for both ratios, positive, dated
  const hm = [fsj.oracle?.hist_multiples, ...(fsj.peers || []).map((p) => p.hist_multiples)];
  check("factset: historical multiple averages (1y/3y/5y NTM EV/EBITDA and P/E) present and positive for Oracle and every peer", hm.length > 1 && hm.every((h) => h && /^\d{4}-\d{2}-\d{2}$/.test(h.as_of) && ["pe_ntm", "ev_ebitda_ntm"].every((k) => h[k] && ["y1", "y3", "y5"].every((w) => h[k][w] > 0) && (h.sampling === "weekly" ? h[k].n1 >= 48 && h[k].n3 >= 140 && h[k].n5 >= 230 : h[k].n1 >= 10 && h[k].n3 >= 30 && h[k].n5 >= 50))));
  const ad = [fsj.oracle?.adtv, ...(fsj.peers || []).map((p) => p.adtv)];
  check("factset: ADTV (3-month average daily traded value, US$ M) present and positive for Oracle and every peer", ad.length > 1 && ad.every((a) => a && a.usd_m > 0 && a.days >= 55 && /^\d{4}-\d{2}-\d{2}$/.test(a.end || "")));
  // ORCL daily prices from FactSet (owner, 2026-10-06): the file is the page's price authority, so its last row must be the snapshot's close
  const fsPx = (() => { const p = join(DATA, "prices_orcl_factset.csv"); if (!existsSync(p)) return []; return readFileSync(p, "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(",")).filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c[0]) && Number.isFinite(parseFloat(c[4]))).map((c) => ({ date: c[0], close: parseFloat(c[4]), high: parseFloat(c[2]), low: parseFloat(c[3]) })); })();
  check("factset: ORCL daily price file (FactSet Global Prices) present, ascending, with intraday highs and lows", fsPx.length > 1000 && fsPx.every((r, i, a) => i === 0 || a[i - 1].date < r.date) && fsPx.slice(-30).every((r) => r.high >= r.close && r.low <= r.close));
  check("factset: the price file's last close is the snapshot's ORCL price on the same date", fsPx.length > 0 && fsPx[fsPx.length - 1].date === fsj.price_date && Math.abs(fsPx[fsPx.length - 1].close - (fsj.oracle?.price ?? NaN)) < 0.006);
  check("factset: prices are dated no earlier than the day before the consensus date (prior close rule)", (() => { const d = (x) => Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10)); return fsj.price_date && fsj.as_of && (d(fsj.as_of) - d(fsj.price_date)) / 864e5 <= 4; })());
  check("factset: historical multiple averages are dated and the note states the method", /^\d{4}-\d{2}-\d{2}$/.test(fsj.hist_multiples_as_of || "") && /(month-end|weekly)/.test(fsj.hist_multiples_note || ""));
}

// ---------- xbrl_facts.json: machine check of the figures transcribed from the leases and commitments notes ----------
// Each obligations.json figure whose provenance names a us-gaap concept is compared with the XBRL value for the same
// period end: "verified" clears its needs-review flag; a mismatch fails the build; a text-only figure (the uncommenced
// lease sentence, guarantees, VIEs) stays "needs review" until a second reading confirms it.
const xb = loadJSON("xbrl_facts.json");
const obligationsVerification = [];
if (ob && xb) {
  const getPath = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const inst = (key, end) => { const c = xb.concepts[key]; if (!c || !c.periods) return null; const p = c.periods.find((x) => x.period_end === end); return p || null; };
  const dur = (key, period) => { const c = xb.concepts[key]; if (!c) return null; if (/^FY\d{4}$/.test(period)) return (c.fiscal_years || []).find((x) => x.fiscal_year === period) || null; return (c.quarters || []).find((x) => x.quarter === period) || null; };
  for (const [path, pv] of Object.entries(ob.provenance || {})) {
    if (path.startsWith("_")) continue;
    const src = ob.sources?.[pv.source] || {};
    const base = { path, source: pv.source, filing: src.title || pv.source, accession: src.accession || null, note: pv.note, page: pv.page ?? null, url: src.url || null };
    const val = getPath(ob, path);
    // a total checked as the sum of its tagged parts (e.g. notes payable = current + non-current)
    if (Array.isArray(pv.xbrl_sum)) {
      const parts = pv.xbrl_sum.map((k) => inst(k, ob.as_of)); const ok = parts.every(Boolean) && typeof val === "number" ? near(val, parts.reduce((a, p) => a + p.value, 0), TOL) : null;
      obligationsVerification.push({ ...base, value: typeof val === "number" ? val : null, xbrl: parts.every(Boolean) ? { concept: pv.xbrl_sum.map((k) => xb.concepts[k]?.concept || k).join(" + "), value: parts.reduce((a, p) => a + p.value, 0), accn: parts[0].accn, form: parts[0].form, filed: parts[0].filed } : null, verdict: ok === null ? "unverified" : ok ? "verified" : "mismatch", method: "xbrl_sum", reason: ok === null ? "XBRL parts for this period not found" : null });
      check(`obligations/XBRL: ${path} = ${pv.xbrl_sum.join(" + ")} (${ob.as_of})`, ok); continue;
    }
    // a figure the earnings release also prints: re-read from the archived 8-K exhibit (independent of the 10-Q transcription)
    if (pv.release_check) {
      const qr = (q?.quarters || []).find((x) => x.id === pv.release_check.quarter); const acc = qr ? (loadJSON("sources.json") || {})[qr.source]?.accession : null;
      const dir = join(RAW, "8k"); const file = acc && existsSync(dir) ? readdirSync(dir).find((f) => f.includes(acc)) : null;
      const parsed = file ? numAfter(htmlToText(readFileSync(join(dir, file), "utf8")), "customer prepayments with significant financing component") : null;
      const ok = parsed != null && typeof val === "number" ? near(val, parsed, TOL) : null;
      obligationsVerification.push({ ...base, value: typeof val === "number" ? val : null, xbrl: null, release: file ? { file, parsed, accession: acc } : null, verdict: ok === null ? "unverified" : ok ? "verified_release" : "mismatch", method: "release", reason: ok === null ? "archived release not found or line not printed" : "custom (non-us-gaap) tag: checked against the archived earnings release instead" });
      check(`obligations/release: ${path} = the archived ${pv.release_check.quarter} release`, ok); continue;
    }
    // prospectus terms recomputed by the tie-outs above (dividend = rate × proceeds ÷ 4; conversion rates = preference ÷ prices)
    if (Array.isArray(pv.tie_checks)) {
      const rs = pv.tie_checks.map((c) => results.find((r) => `${r.tag}: ${r.check}` === c)); const ok = rs.every(Boolean) ? rs.every((r) => r.status === "ok") : null;
      obligationsVerification.push({ ...base, value: typeof val === "number" ? val : null, xbrl: null, ties: pv.tie_checks, verdict: ok === null ? "unverified" : ok ? "verified_tie" : "mismatch", method: "tie_out", reason: "not an XBRL fact (prospectus): recomputed from the document's own terms" });
      continue;
    }
    if (!pv.xbrl) {
      // a text-only figure clears its review flag once a second, dated reading of the same note confirms it (second_reading.matches)
      const sr = pv.text_only && pv.second_reading && pv.second_reading.matches && /^\d{4}-\d{2}-\d{2}$/.test(pv.second_reading.date || "") ? pv.second_reading : null;
      obligationsVerification.push({ ...base, value: typeof val === "number" ? val : null, xbrl: null, verdict: sr ? "verified_text" : pv.text_only ? "needs_review" : "unverified", method: pv.text_only ? "text" : null, secondReading: sr ? sr.date : null, reason: sr ? `text reading confirmed by a second reading on ${sr.date} (no XBRL concept exists for this disclosure)` : pv.text_only ? "text reading: no XBRL concept exists for this disclosure; kept for a second reading" : "no XBRL concept mapped" });
      continue;
    }
    if (Array.isArray(pv.xbrl)) { // the purchase-obligation schedule, element by element
      const sched = Array.isArray(val) ? val : [];
      pv.xbrl.forEach((key, i) => { const p = inst(key, ob.as_of); const v = sched[i]?.usd_m ?? null; const ok = p && v != null ? near(v, p.value, TOL) : null; obligationsVerification.push({ ...base, path: `${path}[${i}]`, value: v, xbrl: p ? { concept: xb.concepts[key].concept, value: p.value, accn: p.accn, form: p.form, filed: p.filed } : null, verdict: ok === null ? "unverified" : ok ? "verified" : "mismatch", reason: ok === null ? "XBRL value for this period not found" : null }); check(`obligations/XBRL: ${path}[${i}] = ${xb.concepts[key]?.concept || key}`, ok); });
      continue;
    }
    const p0 = pv.xbrl_period ? dur(pv.xbrl, pv.xbrl_period) : inst(pv.xbrl, ob.as_of);
    const p = p0 && !p0.accn && Array.isArray(p0.from) ? { ...p0, accn: p0.from[0].accn, form: p0.from[0].form } : p0;
    const xv = p ? p.value : null;
    const ok = typeof val === "number" && xv != null ? near(val, xv, TOL) : null;
    obligationsVerification.push({ ...base, value: typeof val === "number" ? val : null, xbrl: p ? { concept: xb.concepts[pv.xbrl].concept, value: xv, accn: p.accn, form: p.form, filed: p.filed, derived: !!p.derived } : null, verdict: ok === null ? "unverified" : ok ? "verified" : "mismatch", reason: ok === null ? "XBRL value for this period not found" : null });
    check(`obligations/XBRL: ${path} = ${xb.concepts[pv.xbrl]?.concept || pv.xbrl} (${pv.xbrl_period || ob.as_of})`, ok);
  }
  // capex and operating cash flow: the discrete quarters in quarters.json (derived by subtraction from the releases)
  // must equal the quarters derived from the XBRL year-to-date cash-flow lines (10-Q/10-K) — a second, independent path.
  for (const r of q?.quarters || []) {
    const cx = dur("capex_cash", r.id), ox = dur("cfo", r.id);
    if (cx && cx.value != null && r.cash_flow?.capex_quarter != null) check(`${r.id}: capex (release, derived quarter) = XBRL PaymentsToAcquirePropertyPlantAndEquipment (10-Q/10-K, derived quarter)`, near(-r.cash_flow.capex_quarter, cx.value, TOL * 2));
    if (ox && ox.value != null && r.cash_flow?.operating_cash_flow_quarter != null) check(`${r.id}: operating cash flow (release) = XBRL NetCashProvidedByUsedInOperatingActivities (10-Q/10-K)`, near(r.cash_flow.operating_cash_flow_quarter, ox.value, TOL * 2));
  }
  // every 12-month XBRL span equals the sum of its four derived quarters (quarters sum to the year)
  for (const key of ["capex_cash", "cfo", "fin_lease_additions", "interest_expense"]) {
    const c = xb.concepts[key]; if (!c) continue;
    for (const fy of c.fiscal_years || []) { const yr = Number(fy.fiscal_year.slice(2)); const qs = (c.quarters || []).filter((x) => x.quarter.startsWith(`FY${yr}Q`)); if (qs.length === 4 && qs.every((x) => x.value != null)) check(`${fy.fiscal_year}: XBRL ${c.concept} four derived quarters sum to the annual`, near(qs.reduce((a, x) => a + x.value, 0), fy.value, TOL * 2)); }
  }
  check("xbrl: latest period end matches the latest quarter in quarters.json", xb.latest_period_end === (q?.quarters || []).map((x) => x.period_end).sort().pop());
}

// ---------- tax.json: the rate-reconciliation lines behind the DCF tax normalization, checked against XBRL ----------
{
  const tx = loadJSON("tax.json");
  if (tx && xb) {
    const fyRate = (key) => { const c = xb.concepts[key]; const f = c && (c.fiscal_years || []).find((x) => x.fiscal_year === "FY2026"); return f ? f.value : null; };
    check("tax: FY2026 effective and statutory rates match XBRL", near(tx.fy2026.effective_rate_pct, fyRate("tax_rate_effective"), 0.05) && near(tx.fy2026.statutory_rate_pct, fyRate("tax_rate_statutory"), 0.05));
    for (const l of tx.fy2026.lines || []) { const v = fyRate(l.xbrl); check(`tax: FY2026 reconciliation line '${l.k}' (${l.pct} pp) matches XBRL ${l.xbrl}`, v == null ? null : near(Math.abs(l.pct), Math.abs(v), 0.05)); }
    check("tax: reconciliation lines sum from the statutory rate to the effective rate (±0.2 pp)", near(tx.fy2026.statutory_rate_pct + (tx.fy2026.lines || []).reduce((a, l) => a + l.pct, 0), tx.fy2026.effective_rate_pct, 0.2));
    check("tax: FY2026 provision matches XBRL IncomeTaxExpenseBenefit", near(tx.fy2026.provision_usd_m, fyRate("tax_provision"), TOL));
    check("tax: normalized rate = statutory + state line", near(tx.normalized.pct, tx.fy2026.statutory_rate_pct + tx.state.pct, 0.05));
  }
}

// ---------- news.json: dated, themed, sourced (primary first), no rumors ----------
const nws = loadJSON("news.json");
if (nws) {
  const items = nws.items || [], themes = new Set((nws.themes || []).map((t) => t.id)), tiers = ["sec", "company", "agency", "wire", "press", "trade"];
  const rank = (t) => tiers.indexOf(t);
  check("news: every item has an ISO date, theme, bilingual title, summary and why-it-matters", items.length > 0 && items.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.theme && x.title_en && x.title_es && x.summary_en && x.summary_es && x.why_en && x.why_es));
  check("news: every theme used is declared", items.every((x) => themes.has(x.theme)));
  check("news: every item has at least one https source with a known tier", items.every((x) => (x.sources || []).length > 0 && x.sources.every((s) => /^https:\/\//.test(s.url || "") && tiers.includes(s.tier))));
  check("news: sources are listed primary first (SEC → company → agency → wire → press)", items.every((x) => (x.sources || []).every((s, i, a) => i === 0 || rank(a[i - 1].tier) <= rank(s.tier))));
  check("news: an item labeled sec/company/agency leads with a source of that tier", items.every((x) => !["sec", "company", "agency"].includes(x.basis) || (x.sources[0] && rank(x.sources[0].tier) <= rank(x.basis))));
  check("news: SEC-sourced items carry an accession number", items.every((x) => x.basis !== "sec" || (x.sources[0] && /^\d{10}-\d{2}-\d{6}$/.test(x.sources[0].accession || ""))));
  check("news: no item is dated after as_of; ids are unique", items.every((x) => x.date <= nws.as_of) && new Set(items.map((x) => x.id)).size === items.length);
}

// ---------- analysts.json: sell-side opinions by house (reports on file, StreetAccount-reported houses) and the consensus snapshot ----------
const anj = loadJSON("analysts.json");
if (anj) {
  const iso = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
  const winStart = (() => { if (!iso(anj.as_of) || !(anj.window_days > 0)) return null; const d = new Date(anj.as_of + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - anj.window_days); return d.toISOString().slice(0, 10); })();
  const classes = new Set(["buy", "hold", "sell", "credit"]);
  const houses = anj.houses || [], reported = anj.reported || [];
  const inWin = (d) => iso(d) && winStart && d >= winStart && d <= anj.as_of;
  check("analysts: as_of is an ISO date, the window is positive and window_start matches it", iso(anj.as_of) && anj.window_days > 0 && anj.window_start === winStart);
  check("analysts: every house has an id, name, kind, analysts, a date inside the window, title, bilingual thesis, method and basis, and a source of basis 'report'", houses.length > 0 && houses.every((h) => h.id && h.house && ["equity", "credit"].includes(h.kind) && h.analysts && inWin(h.date) && h.title && h.thesis_en && h.thesis_es && h.method_en && h.method_es && h.basis_short_en && h.basis_short_es && h.source && h.source.basis === "report" && h.source.title));
  check("analysts: ratings carry a known class and targets are positive numbers (null only when the report states none)", [...houses, ...reported].every((h) => (h.rating_class == null || classes.has(h.rating_class)) && (h.target_usd == null || h.target_usd > 0) && (h.rating == null) === (h.rating_class == null) && (h.target_prev_usd == null || h.target_prev_usd > 0) && (h.price_at_report == null || h.price_at_report > 0)));
  check("analysts: every StreetAccount-reported house has a name, analysts, a date inside the window, rating, target, bilingual note and a source of basis 'streetaccount'", reported.every((r) => r.id && r.house && r.analysts && inWin(r.date) && r.rating && r.target_usd > 0 && r.note_en && r.note_es && r.basis_short_en && r.basis_short_es && r.source && r.source.basis === "streetaccount" && r.source.title));
  check("analysts: ids are unique across houses and reported", new Set([...houses, ...reported].map((x) => x.id)).size === houses.length + reported.length);
  check("analysts: target histories, estimates and earlier notes are dated, positive and bilingual", houses.every((h) => (h.target_history || []).every((x) => iso(x.date) && x.usd > 0) && Object.values(h.estimates || {}).every((v) => v.revenue_usd_bn > 0 && v.eps > 0) && (h.earlier || []).every((e) => inWin(e.date) && e.title && e.note_en && e.note_es)));
  const pts = (anj.consensus_history || {}).points || [];
  check("analysts: consensus history is dated, ascending, no later than as_of, and its rating counts add up", pts.length > 3 && iso((anj.consensus_history || {}).fetched) && pts.every((p, i) => iso(p.date) && p.date <= anj.as_of && (i === 0 || pts[i - 1].date < p.date) && p.mean > 0 && p.median > 0 && p.high >= p.mean && p.low <= p.mean && p.count > 0 && p.buy + p.overweight + p.hold + p.underweight + p.sell === p.total));
  check("analysts: bilingual library and price notes present", !!(anj.library_note_en && anj.library_note_es && anj.price_note_en && anj.price_note_es));
}

// ---------- executive summary: its date covers every source it cites (a summary "written Sep 23" cannot cite Sep 24) ----------
const MONTHS = { jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, oct: 10, nov: 11, dec: 12, dic: 12 };
const dateInTitle = (t) => { const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/.exec(String(t || "")) || null; if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`; const n = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s+(\d{4})/.exec(String(t || "")); return n && MONTHS[n[1].toLowerCase()] ? `${n[3]}-${String(MONTHS[n[1].toLowerCase()]).padStart(2, "0")}-${n[2].padStart(2, "0")}` : null; };
{
  const cmj = loadJSON("comments.json"); const ids = Object.keys(cmj?.by_quarter || {}).sort(); const lastQid = (q?.quarters || []).map((x) => x.id).sort((a, b) => (a < b ? -1 : 1)).pop();
  const es = cmj?.by_quarter?.[lastQid]?.exec_summary;
  if (es) {
    const upd = es.updated || cmj.by_quarter[lastQid].drafted || null;
    check("summary: carries its own ISO date (exec_summary.updated)", /^\d{4}-\d{2}-\d{2}$/.test(upd || ""));
    const cited = (es.watch_sources || []).map((x) => dateInTitle(x.title)).filter(Boolean);
    check(`summary: dated ${upd} on or after every source it cites (latest ${cited.sort().pop() || "none"}) and its events_through`, !!upd && cited.every((d) => d <= upd) && (!es.events_through || es.events_through <= upd));
    const watch = [...(es.watch?.en || []), ...(es.watch?.es || [])];
    check("summary: what-to-watch items are short lines ({ h, lines[] }, each line ≤ 160 characters)", watch.every((x) => typeof x === "object" && x.h && Array.isArray(x.lines) && x.lines.every((l) => l.length <= 160)));
    check("summary: no hand-typed section number (cross-references use {{sec:id}})", !/sec[ct]i[oó]n\s+\d\d\b/i.test(JSON.stringify(es)));
  }
}

// ---------- buildout.json: the per-site issues column (dated, sourced, typed) ----------
{
  const boj = loadJSON("buildout.json");
  if (boj) {
    const kinds = new Set(["force_majeure", "power", "permit", "financing", "regulatory", "legal", "zoning", "safety", "scope", "schedule"]), bases = new Set(["company", "government", "wire", "press"]);
    const all = (boj.sites || []).flatMap((x) => (x.issues || []).map((i) => ({ ...i, site: x.short || x.name, checked: x.issues_checked })));
    check("sites: every campus has an issues list and the date its sources were checked", (boj.sites || []).every((x) => Array.isArray(x.issues) && /^\d{4}-\d{2}-\d{2}$/.test(x.issues_checked || "") && (x.issues.length || (x.issues_none_en && x.issues_none_es))));
    check("sites: every issue is dated, typed, bilingual and sourced (https), dated no later than the check", all.every((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && kinds.has(i.kind) && bases.has(i.basis) && ["open", "closed"].includes(i.status) && i.en && i.es && /^https:\/\//.test(i.source?.url || "") && i.date <= i.checked && (!i.due || /^\d{4}-\d{2}-\d{2}$/.test(i.due))));
  }
}

// ---------- long-range targets, risk notes, the DCF inputs that come from files ----------
{
  const lrt = loadJSON("long_range_targets.json"), srcs = loadJSON("sources.json") || {};
  if (lrt) check("targets: every long-range target names its call, page and status (superseded ones say when and by what)", (lrt.targets || []).every((t) => srcs[t.source] && t.page && /^\d{4}-\d{2}-\d{2}$/.test(t.stated_on) && (t.status === "in_force" || (t.status === "superseded" && /^\d{4}-\d{2}-\d{2}$/.test(t.superseded_on) && t.superseded_en && t.superseded_es))));
  const rkj = loadJSON("risks.json");
  if (rkj) check("risks: every row note is dated, typed and bilingual", (rkj.items || []).every((r) => (r.notes || []).every((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.date) && n.kind && n.en && n.es)));
  const fsx = loadJSON("factset.json");
  if (fsx) check("factset: consensus D&A (DEP_AMORT_EXP) is present for the fiscal years the DCF projects", (fsx.oracle?.fiscal || []).some((f) => f.da?.mean > 0) ? true : null);
  const mr = loadJSON("market_reference.json");
  check("market: implied equity risk premium (Damodaran) is a dated percentage", mr?.erp ? /^\d{4}-\d{2}-\d{2}$/.test(mr.erp.as_of) && mr.erp.erp_pct > 1 && mr.erp.erp_pct < 12 : null);
}

// ---------- sections.json: every cross-reference on the page resolves to a registered section ----------
const secReg = loadJSON("sections.json");
const crossRefs = { ids: [], unresolved: [] };
if (secReg) {
  const ids = new Set((secReg.sections || []).map((s) => s.id)); crossRefs.ids = [...ids];
  const scan = (text, file) => { const re = /(?:\bref\(\s*'([a-z_]+)'|data-ref="([a-z_]+)"|\{\{sec:([a-z_]+)\}\}|secNum\(\s*'([a-z_]+)'|secTitle\(\s*'([a-z_]+)')/g; let m; while ((m = re.exec(text))) { const id = m[1] || m[2] || m[3] || m[4] || m[5]; if (!ids.has(id)) crossRefs.unresolved.push({ file, id }); } };
  for (const f of ["site/oracle/index.html", "site/oracle/app.js", "site/oracle/present.js"]) { const fp = join(ROOT, f); if (existsSync(fp)) scan(readFileSync(fp, "utf8"), f); }
  for (const f of ["risks.json", "news.json", "obligations.json", "explainers.json", "special_situations.json", "comments.json"]) { const fp = join(DATA, f); if (existsSync(fp)) scan(readFileSync(fp, "utf8"), `tools/oracle/data/${f}`); }
  const html = existsSync(join(ROOT, "site/oracle/index.html")) ? readFileSync(join(ROOT, "site/oracle/index.html"), "utf8") : "";
  const domSecs = [...html.matchAll(/<section[^>]*\bdata-sec="([a-z_]+)"/g)].map((m) => m[1]);
  check("sections: every cross-reference (ref(), data-ref, {{sec:}}) names a registered section", crossRefs.unresolved.length === 0);
  check("sections: every registered section exists once in index.html, in registry order", domSecs.length === (secReg.sections || []).length && domSecs.every((id, i) => id === secReg.sections[i].id));
  check("sections: no hand-typed section number remains in the page, deck or data narrative", !/sec[ct]i[oó]n\s+\d\d\b/i.test([html, ...["site/oracle/app.js", "site/oracle/present.js"].map((f) => (existsSync(join(ROOT, f)) ? readFileSync(join(ROOT, f), "utf8") : ""))].join("\n")));
  // links: the markup carries no empty or literal "undefined"/"null" href (the render check repeats this on the rendered DOM,
  // where a source without a URL must render as text); a fact token names a fact the page composes; the reader-facing markup and
  // the narrative data carry no repository path (the technical detail lives on quality.html)
  const appJs = existsSync(join(ROOT, "site/oracle/app.js")) ? readFileSync(join(ROOT, "site/oracle/app.js"), "utf8") : "";
  check("links: no empty, undefined or null href in index.html", !/href=(""|''|"undefined"|"null"|"#")/.test(html));
  const factIds = new Set([...appJs.matchAll(/^\s*const FACTS = \{([^\n]*)\}/gm)].flatMap((m) => [...m[1].matchAll(/([a-z_]+):/g)].map((x) => x[1])));
  const factTokens = []; for (const f of ["risks.json", "news.json", "obligations.json", "explainers.json", "special_situations.json", "comments.json", "buildout.json"]) { const fp = join(DATA, f); if (!existsSync(fp)) continue; for (const m of readFileSync(fp, "utf8").matchAll(/\{\{fact:([a-z_]+)\}\}/g)) factTokens.push({ f, id: m[1] }); }
  check("facts: every {{fact:id}} token in the narrative names a fact the page composes", factTokens.every((x) => factIds.has(x.id)));
  const visibleHtml = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  const pathRe = /(tools\/oracle|scripts\/oracle|\.github\/|\b[a-z_-]+\.mjs\b|\bdata\/[a-z_]+\.js\b|\b[a-z_]+\.json\b)/;
  check("paths: no repository or tool path in the page's reader-facing markup", !pathRe.test(visibleHtml));
  const narrative = ["news.json", "risks.json", "comments.json", "explainers.json", "special_situations.json", "analysts.json"].map((f) => { const fp = join(DATA, f); if (!existsSync(fp)) return ""; const j = JSON.parse(readFileSync(fp, "utf8")); const strip = (o) => (Array.isArray(o) ? o.map(strip) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => !/^(_comment|_notes?|source|sources|sources_note|url|file|files|key|accession)$/.test(k) && !/\.(json|mjs|js|md)$/.test(k)).map(([k, v]) => [k, strip(v)])) : o); return JSON.stringify(strip(j)); }).join("\n");
  check("paths: no repository or tool path in the narrative data the page prints", !pathRe.test(narrative));
}

// ---------- module staleness (owner's rule: stale past the next expected filing + grace days; never show old data as current) ----------
const fr = existsSync(join(DATA, "..", "freshness.json")) ? JSON.parse(readFileSync(join(DATA, "..", "freshness.json"), "utf8")) : null;
const modules = [];
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
fresh("Share price (ORCL close, FactSet Global Prices)", (() => { const p = join(DATA, "prices_orcl_factset.csv"); if (!existsSync(p)) return null; const l = readFileSync(p, "utf8").trim().split(/\r?\n/); return l.length > 1 ? l[l.length - 1].split(",")[0] : null; })(), 5, "nightly FactSet routine, 7:58 PM New York time; the page's price authority");
fresh("Share price (ORCL close, runner feed)", mref?.price_snapshot?.orcl?.close_date, 5, "market fetch, weekdays 13:30 and 21:45 UTC; fills dates FactSet has not posted yet");
fresh(`10-year Treasury (${mref?.treasury_10y?.source_name || "U.S. Treasury daily par yield curve"})`, mref?.treasury_10y?.as_of_date, 5, "market fetch");
fresh("BBB corporate OAS proxy (FRED BAMLC0A4CBBB)", mref?.credit_spread_proxy?.as_of_date, 7, "market fetch; credit card proxy while no CDS source exists");
fresh("Latest quarter release", latest?.release_date, 100, latest ? `${latest.id}${nextRes ? `; next results confirmed for ${nextRes}` : est ? `; next results estimated ${est.window_start} to ${est.window_end}` : ""}` : null);
fresh("EDGAR submissions snapshot", edg?.fetched, 4, "filings harvest, weekdays 13:30 UTC");
fresh("Oracle IR press-release snapshot", irf?.fetched, 4, "filings harvest");
fresh("Investor calendar", cal?.generated, 10, "calendar fetch");
fresh("Peer leverage (SEC XBRL)", plv?.fetched, 10, "peer-leverage fetch");
fresh("FactSet consensus snapshot", fsj?.fetched, 7, "automated FactSet refresh, weekdays 14:20 UTC");
fresh("Implied equity risk premium (Damodaran, monthly)", mref?.erp?.as_of, 45, "the market fetch reads Damodaran's home page; he posts on the first of each month");
fresh("Market concerns (press sweep)", prs?.as_of, 10, "desktop task, Mondays");
fresh("Sell-side research sweep (analyst opinions)", anj?.as_of, anj?.window_days || 60, "in-session sweep of the owner's research library (Dropbox) and FactSet StreetAccount; refresh with the analysts sweep prompt");
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
cur("market_reference.json", !!(mref?.price_snapshot?.orcl?.shares_outstanding_millions && daysSince(mref?.price_snapshot?.orcl?.close_date) <= 5), mref ? `shares ${mref.price_snapshot?.orcl?.shares_outstanding_millions} M; price ${mref.price_snapshot?.orcl?.close_date}; ${Array.isArray(mref.credit_ratings) ? mref.credit_ratings.length : Object.keys(mref.credit_ratings || {}).length} ratings; ${(mref.debt_instruments || []).length} debt instruments` : "missing");
cur("calendar.json", !!cal, cal ? `${(cal.events || []).length} events; next results ${nextRes || (est ? `estimated ${est.window_start} to ${est.window_end}` : "—")}; ${(cal.manual_events || []).length} manual` : "missing");
cur("press.json", !!(prs && (prs.items || []).length && daysSince(prs.as_of) <= 10), prs ? `${(prs.items || []).length} items, as of ${prs.as_of}` : "missing");
cur("factset.json", !!(fsj && daysSince(fsj.fetched) <= 7), fsj ? `consensus ${fsj.as_of}; prices ${fsj.price_date}; ${(fsj.peers || []).length} peers; fetched ${fsj.fetched}` : "missing");
cur("peer_leverage.json", !!(plv && (plv.peers || []).some((p) => !p.error)), plv ? `${(plv.peers || []).filter((p) => !p.error).length} peers; fetched ${plv.fetched}` : "missing");
cur("analysts.json", !!(anj && daysSince(anj.as_of) <= (anj.window_days || 60)), anj ? `${(anj.houses || []).length} houses from reports, ${(anj.reported || []).length} reported via StreetAccount; swept ${anj.as_of}, ${anj.window_days}-day window` : "missing");

// Next expected filing: Oracle's confirmed date, else the end of the derived window (assumed); a filing-driven module
// is stale once today > that date + grace. Daily modules are stale past max_age_days.
if (fr) {
  const grace = fr.grace_days ?? 7;
  const nextExp = nextRes || est?.window_end || null, nextBasis = nextRes ? "confirmed" : est ? "assumed" : null;
  const nwsJ = loadJSON("news.json"), rk = loadJSON("risks.json"), chl = loadJSON("changelog.json"), xbJ = loadJSON("xbrl_facts.json");
  const lastRefreshOf = {
    financials: latest?.release_date, xbrl: xbJ?.fetched, obligations: ob?.updated, guidance: gv?.issued_on, comments: cmQ?.drafted || cm?.updatedAt, summary: cmQ?.drafted || cm?.updatedAt, buildout: bo?.updated, reference: mref?.price_snapshot?.orcl?.accessed,
    market: mref?.price_snapshot?.orcl?.close_date, factset: fsj?.fetched, analysts: anj?.as_of, cds: loadJSON("cds.json")?.updated_at || null, news: nwsJ?.as_of, calendar: cal?.generated, peer_leverage: plv?.fetched, risks: rk?.updated, quality: today.toISOString(), changelog: chl?.generated || null,
  };
  const asOfOf = { financials: latest?.period_end, xbrl: xbJ?.latest_period_end, obligations: ob?.as_of, guidance: gv?.issued_on, comments: latest?.period_end, summary: latest?.period_end, buildout: latest?.period_end, reference: latest?.period_end, market: mref?.price_snapshot?.orcl?.close_date, factset: fsj?.as_of, analysts: anj?.as_of, cds: null, news: nwsJ?.as_of, calendar: cal?.generated, peer_leverage: plv?.fetched, risks: rk?.updated, quality: today.toISOString().slice(0, 10), changelog: chl?.generated };
  for (const [id, m] of Object.entries(fr.modules || {})) {
    const last = lastRefreshOf[id] ? String(lastRefreshOf[id]).slice(0, 10) : null; const asOf = asOfOf[id] ? String(asOfOf[id]).slice(0, 10) : null;
    let stale = false, reason = null, deadline = null;
    if (m.cadence === "filing") {
      if (nextExp) { const d = new Date(nextExp + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + grace); deadline = d.toISOString().slice(0, 10); const covered = asOf && latest?.period_end && asOf >= latest.period_end; stale = today.toISOString().slice(0, 10) > deadline || (asOf != null && latest?.period_end != null && asOf < latest.period_end && id !== "guidance" && id !== "reference" && id !== "risks"); reason = stale ? (covered ? `next filing expected by ${nextExp} (${nextBasis}) + ${grace} days passed without a new filing` : `data as of ${asOf} while the latest quarter ends ${latest?.period_end}`) : null; }
    } else { const age = daysSince(last); stale = last == null || (age != null && age > (m.max_age_days ?? 7)); reason = stale ? (last ? `last refresh ${last}, ${age} days ago (limit ${m.max_age_days})` : "never refreshed") : null; if (m.optional && last == null) { stale = false; reason = "optional module, no data yet"; } }
    modules.push({ id, label_en: m.label_en, label_es: m.label_es, cadence: m.cadence, asOf, lastRefresh: last, nextExpected: m.cadence === "filing" ? nextExp : null, nextExpectedBasis: m.cadence === "filing" ? nextBasis : null, deadline, maxAgeDays: m.max_age_days ?? null, stale, reason, textDerived: !!m.text_derived });
  }
}
const amendments = (loadJSON("xbrl_facts.json")?.amendments || []);

// ---------- report ----------
const warnOnly = warnings.map((w) => w.replace(/^WARN\s+/, "")).filter((w) => !/ — insufficient data, skipped$/.test(w)).map((w) => { const i = w.indexOf(": "); return { tag: i > 0 ? w.slice(0, i) : "general", check: i > 0 ? w.slice(i + 2) : w, status: "warn", diff: null, tol: null, note: null }; });
writeFileSync(join(DATA, "quality_report.json"), JSON.stringify({
  generated: today.toISOString(),
  summary: { checks, failed: failures.length, warnings: warnings.length, stale: stale.length },
  latestQuarter: latestId, latestPeriodEnd: latest?.period_end || null, latestReleaseDate: latest?.release_date || null,
  nextResults: nextRes, nextResultsEstimate: est ? { start: est.window_start, end: est.window_end, median: est.median || null, history: est.history || null } : null,
  tolerances: { usdM: TOL, eps: EPS_TOL },
  coverage: { quarters: [first?.id || null, latestId], years: [fyKeys[0] || null, lastFy] },
  checks: [...results, ...warnOnly],
  freshness, curated, modules, obligationsVerification, crossRefs, amendments,
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
