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
    if (!pv.xbrl) { obligationsVerification.push({ ...base, value: typeof val === "number" ? val : null, xbrl: null, verdict: pv.text_only ? "needs_review" : "unverified", reason: pv.text_only ? "text-derived figure or statement; no XBRL concept exists" : "no XBRL concept mapped" }); continue; }
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

// Next expected filing: Oracle's confirmed date, else the end of the derived window (assumed); a filing-driven module
// is stale once today > that date + grace. Daily modules are stale past max_age_days.
if (fr) {
  const grace = fr.grace_days ?? 7;
  const nextExp = nextRes || est?.window_end || null, nextBasis = nextRes ? "confirmed" : est ? "assumed" : null;
  const nwsJ = loadJSON("news.json"), rk = loadJSON("risks.json"), chl = loadJSON("changelog.json"), xbJ = loadJSON("xbrl_facts.json");
  const lastRefreshOf = {
    financials: latest?.release_date, xbrl: xbJ?.fetched, obligations: ob?.updated, guidance: gv?.issued_on, comments: cmQ?.drafted || cm?.updatedAt, summary: cmQ?.drafted || cm?.updatedAt, buildout: bo?.updated, reference: mref?.price_snapshot?.orcl?.accessed,
    market: mref?.price_snapshot?.orcl?.close_date, factset: fsj?.fetched, cds: loadJSON("cds.json")?.updated_at || null, news: nwsJ?.as_of, calendar: cal?.generated, peer_leverage: plv?.fetched, risks: rk?.updated, quality: today.toISOString(), changelog: chl?.generated || null,
  };
  const asOfOf = { financials: latest?.period_end, xbrl: xbJ?.latest_period_end, obligations: ob?.as_of, guidance: gv?.issued_on, comments: latest?.period_end, summary: latest?.period_end, buildout: latest?.period_end, reference: latest?.period_end, market: mref?.price_snapshot?.orcl?.close_date, factset: fsj?.as_of, cds: null, news: nwsJ?.as_of, calendar: cal?.generated, peer_leverage: plv?.fetched, risks: rk?.updated, quality: today.toISOString().slice(0, 10), changelog: chl?.generated };
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
  nextResults: nextRes, nextResultsEstimate: est ? { start: est.window_start, end: est.window_end } : null,
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
