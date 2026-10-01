#!/usr/bin/env node
// Per-data-point freshness and consistency check for the US fiscal monitor (site/fiscal).
//
// Every figure the page shows is either fetched into site/fiscal/data.js by scripts/fetch-data.mjs
// or researched into site/fiscal/monthly-data.js by the Claude routine "FNAM US Fiscal: CBO /
// FedWatch research". Each has a known publication cadence. This script reads both files, works
// out how old every data point is against the allowance for its cadence, and cross-checks the
// figures that must agree with each other (the administered rates against the FOMC target range,
// the FedWatch snapshot against the latest FOMC decision, category sums against Treasury totals, the
// CBO research blocks against each other: column count, deficit = outlays - revenue, the record year).
//
//   node scripts/fiscal/check-freshness.mjs [--now YYYY-MM-DD] [--data path] [--monthly path]
//
// Prints one line per data point, writes the same table to $GITHUB_STEP_SUMMARY when present, and
// hands the problem list to the workflow through $GITHUB_OUTPUT (`problems`), where the next step
// opens or closes the fiscal-health issue. Always exits 0 (the alarm is the issue, not a red run)
// unless a data file cannot be parsed at all, which is a real failure.
import { readFile, appendFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const dataPath = arg('--data', new URL('site/fiscal/data.js', ROOT));
const monthlyPath = arg('--monthly', new URL('site/fiscal/monthly-data.js', ROOT));
const nowIso = arg('--now', new Date().toISOString().slice(0, 10));
const now = Date.parse(nowIso + 'T00:00:00Z');

async function loadAssignment(path, name) {
  const t = await readFile(path, 'utf8');
  const at = t.indexOf(name + ' =');
  if (at < 0) throw new Error(`${path}: "${name} =" not found`);
  const start = t.indexOf('{', at), end = t.lastIndexOf('}');
  return JSON.parse(t.slice(start, end + 1));
}
const LD = await loadAssignment(dataPath, 'window.LIVE_DATA');
const MD = await loadAssignment(monthlyPath, 'window.MONTHLY_DATA');

const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const days = (iso) => Math.floor((now - Date.parse(iso + 'T00:00:00Z')) / 86400000);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "28-Oct-2026" -> "2026-10-28"
const isoFromDMY = (s) => {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const mi = MON.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  return mi < 0 ? null : `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

// ---- cadence table: site/fiscal/freshness-rules.js, shared with the page so its amber flags and this alarm agree ----
// `period` says what the stamped date is ('obs' = the observation day; 'month' / 'quarter' / 'year' = the FIRST day of
// the period, FRED's stamp); age runs from the END of that period. `days` = calendar-day allowance; `bd` = U.S.
// business days (federal holidays excluded, site/assets/provenance.js), used for Debt to the Penny and the policy rates (2 business days).
const RULES = await loadAssignment(new URL('site/fiscal/freshness-rules.js', ROOT), 'window.FISCAL_FRESHNESS');
globalThis.location = { search: '' };
const PROV = (await import(new URL('site/assets/provenance.js', ROOT))).default;
const POINTS = RULES.points.map((p) => [p.label, p.path, p.period, p.bd != null ? { bd: p.bd } : p.days, p.source, p.file === 'monthly' ? MD : undefined]);
// Last day of the period that starts on `iso` ('month', 'quarter' or 'year'), else the date itself.
function periodEnd(iso, period) {
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
  const last = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10); // day 0 of the next month
  if (period === 'month') return last(y, m);
  if (period === 'quarter') return last(y, m + 2);
  if (period === 'year') return `${y}-12-31`;
  return iso;
}

const rows = [], problems = [];
for (const [label, path, period, allowance, source, obj] of POINTS) {
  let d = get(obj || LD, path);
  if (d && /^\d{4}-\d{2}$/.test(d)) d += '-01';
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(String(d))) {
    rows.push([label, 'missing', '—', 'STALE', source]);
    problems.push(`${label}: no value in the data file (${source})`);
    continue;
  }
  const end = periodEnd(d, period);
  const bdRule = typeof allowance === 'object';
  const age = bdRule ? PROV.businessDays(end, nowIso, 'us') : days(end);
  const allow = bdRule ? allowance.bd : allowance;
  const unit = bdRule ? 'business days' : 'd';
  const ok = age <= allow;
  const shown = period === 'obs' ? d : `${d.slice(0, 7)}${period === 'quarter' ? ' (quarter)' : period === 'year' ? ' (year)' : ''}`;
  rows.push([label, shown, `${age} ${unit} after ${period === 'obs' ? 'obs.' : 'period end'} (allowance ${allow})`, ok ? 'ok' : 'STALE', source]);
  if (!ok) problems.push(`${label}: latest ${shown} is ${age} ${bdRule ? 'business days' : 'days'} past its ${period === 'obs' ? 'date' : 'period end'}, allowance ${allow} (${source})`);
}

// ---- consistency: figures that must agree with each other ----
const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
const tr = LD.targetRange, r = LD.rates || {};
if (tr && tr.upper != null && tr.lower != null) {
  const range = `${tr.lower.toFixed(2)}–${tr.upper.toFixed(2)}%`;
  if (!near(tr.upper - tr.lower, 0.25, 1e-6)) problems.push(`Target range ${range} is not 25 bp wide`);
  if (r.onrrp && !near(r.onrrp.value, tr.lower, 1e-6)) problems.push(`ON RRP award rate ${r.onrrp.value}% (${r.onrrp.date}) is not the target-range floor ${tr.lower}%`);
  if (r.discount && !near(r.discount.value, tr.upper, 1e-6)) problems.push(`Discount (primary credit) rate ${r.discount.value}% (${r.discount.date}) is not the target-range ceiling ${tr.upper}%`);
  if (r.iorb && !(r.iorb.value >= tr.lower - 1e-6 && r.iorb.value <= tr.upper + 1e-6)) problems.push(`IORB ${r.iorb.value}% (${r.iorb.date}) lies outside the target range ${range}`);
  if (r.effr && !(r.effr.value >= tr.lower - 1e-6 && r.effr.value <= tr.upper + 1e-6)) problems.push(`Effective funds rate ${r.effr.value}% (${r.effr.date}) lies outside the target range ${range}`);
  const fw = MD.fedWatch || {};
  if (fw.asOf && tr.since) {
    // The range takes effect the day after the decision, so a snapshot dated the decision day is current.
    const decision = new Date(Date.parse(tr.since + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
    if (fw.asOf < decision) problems.push(`FedWatch snapshot ${fw.asOf} predates the FOMC decision of ${decision} that set the ${range} range (in force since ${tr.since})`);
  }
  if (Array.isArray(fw.buckets) && fw.buckets.length && !fw.buckets.includes(range)) problems.push(`FedWatch buckets [${fw.buckets.join(', ')}] do not include the current target range ${range}`);
}
const fw = MD.fedWatch || {};
if (Array.isArray(fw.meetings) && fw.meetings.length) {
  const first = isoFromDMY(fw.meetings[0]);
  if (!first) problems.push(`FedWatch meeting "${fw.meetings[0]}" is not dd-Mon-yyyy`);
  else if (first < nowIso) problems.push(`FedWatch first meeting ${fw.meetings[0]} has already taken place; the snapshot needs the next four meetings`);
  if (Array.isArray(fw.probs) && fw.probs.length) {
    fw.meetings.forEach((m, j) => {
      const col = fw.probs.reduce((s, row) => s + (Number(row[j]) || 0), 0);
      if (col < 95 || col > 105) problems.push(`FedWatch probabilities for ${m} sum to ${col.toFixed(1)}%, not ~100%`);
    });
  }
}
const dc = LD.debtComposition;
if (dc && dc.total != null) {
  const sum = ['notes', 'bills', 'bonds', 'tips', 'frns', 'nonmarketable'].reduce((s, k) => s + (dc[k] || 0), 0);
  const gap = dc.total - sum; // Treasury's own total minus the six classes: any Federal Financing Bank line, normally a few $B
  if (Math.abs(gap) > dc.total * 0.005) problems.push(`MSPD classes sum to $${sum.toFixed(0)}B but Treasury's total is $${dc.total.toFixed(0)}B (${dc.date})`);
}
const m = LD.mts;
// Gross vs. net interest: the page reconciles them (gross − trust-fund interest − other interest income = net).
if (m && m.cashInterestB != null) {
  if (m.netInterestB == null) problems.push(`MTS table 9 net interest is missing for ${m.date} (the page hides the gross-to-net bridge)`);
  if (m.trustFundInterestB == null) problems.push(`MTS table 3 interest credited to trust funds is missing for ${m.date} (the page hides the gross-to-net bridge)`);
  if (m.netInterestB != null && m.trustFundInterestB != null) {
    const other = m.cashInterestB - m.trustFundInterestB - m.netInterestB;
    if (m.netInterestB > m.cashInterestB) problems.push(`Net interest $${m.netInterestB}B exceeds gross interest $${m.cashInterestB}B (${m.date})`);
    if (m.trustFundInterestB < 0) problems.push(`Interest credited to trust funds is negative ($${m.trustFundInterestB}B, ${m.date})`);
    if (Math.abs(other) > 0.1 * m.cashInterestB) problems.push(`Gross $${m.cashInterestB}B − trust funds $${m.trustFundInterestB}B − net $${m.netInterestB}B leaves $${other.toFixed(1)}B of other interest income, more than 10% of gross (${m.date}): check the MTS lines`);
  }
}
if (m && Array.isArray(m.revYTDcur) && m.totalReceiptsB != null) {
  const s = m.revYTDcur.reduce((a, b) => a + b, 0);
  if (!near(s, m.totalReceiptsB, 1)) problems.push(`MTS receipt categories sum to $${s.toFixed(2)}B but total receipts are $${m.totalReceiptsB.toFixed(2)}B (${m.date})`);
  const o = m.outYTDcur.reduce((a, b) => a + b, 0);
  if (!near(o, m.totalOutlaysB, 1)) problems.push(`MTS outlay categories sum to $${o.toFixed(2)}B but total outlays are $${m.totalOutlaysB.toFixed(2)}B (${m.date})`);
}

// ---- CBO research blocks: the page composes Section 06 (the record-year sentence, the table headers, the
// stat cards, the source links) from these keys, so they must agree with each other and with the projection ----
{
  const years = Array.isArray(MD.cboYears) ? MD.cboYears.map(Number) : [];
  const tbl = Array.isArray(MD.cboCategoryTable) ? MD.cboCategoryTable : [];
  const rowOf = (label) => tbl.find((r) => r && r.label === label);
  const vals = (r) => (r && Array.isArray(r.vals) ? r.vals.map((x) => (x && x.v != null ? Number(x.v) : null)) : []);
  if (years.length < 2 || years.some((y, i) => !Number.isInteger(y) || (i > 0 && y <= years[i - 1]))) problems.push(`CBO cboYears [${years.join(', ')}] must be two or more ascending years`);
  for (const r of [...tbl, MD.cboGdpRow].filter(Boolean)) {
    if (!Array.isArray(r.vals) || r.vals.length !== years.length) problems.push(`CBO row "${r.label}" has ${Array.isArray(r.vals) ? r.vals.length : 0} values for ${years.length} years in cboYears`);
  }
  const rev = vals(rowOf('Total revenue')), out = vals(rowOf('Total outlays')), def = vals(rowOf('Deficit (outlays − revenue)'));
  if (!rev.length || !out.length || !def.length) problems.push('CBO category table is missing its "Total revenue", "Total outlays" or "Deficit (outlays − revenue)" row');
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  years.forEach((y, i) => {
    if (rev[i] != null && out[i] != null && def[i] != null && !near(def[i], out[i] - rev[i], 0.15)) problems.push(`CBO ${y}: deficit ${def[i]}% of GDP is not outlays ${out[i]}% minus revenue ${rev[i]}% (${(out[i] - rev[i]).toFixed(1)}%)`);
    const parts = tbl.filter((r) => r && /^—/.test(r.label)).map((r) => vals(r)[i]).filter((v) => v != null);
    if (parts.length && out[i] != null && !near(sum(parts), out[i], 0.15 * parts.length)) problems.push(`CBO ${y}: the outlay components sum to ${sum(parts).toFixed(1)}% of GDP, not total outlays ${out[i]}%`);
    const gdp = MD.cboGdpRow && Array.isArray(MD.cboGdpRow.vals) && MD.cboGdpRow.vals[i] ? Number(MD.cboGdpRow.vals[i].v) : null;
    const outT = MD.cboOutlaysT ? MD.cboOutlaysT[String(y)] : null;
    if (gdp != null && outT != null && out[i] != null && !near(gdp, outT / (out[i] / 100), 0.5)) problems.push(`CBO ${y}: nominal GDP $${gdp}T is not outlays $${outT}T ÷ ${out[i]}% of GDP (= $${(outT / (out[i] / 100)).toFixed(1)}T)`);
  });
  const pj = MD.cboProjection || {};
  const labels = Array.isArray(pj.labels) ? pj.labels.map(String) : [], values = Array.isArray(pj.values) ? pj.values : [];
  if (!labels.length || labels.length !== values.length) problems.push('CBO cboProjection labels and values are empty or differ in length');
  const at = (y) => { const i = labels.indexOf(String(y)); return i >= 0 ? values[i] : null; };
  const rec = Number(MD.cboRecordYear);
  const firstAbove = labels.find((l, i) => values[i] != null && values[i] > 106);
  if (!Number.isInteger(rec)) problems.push('CBO cboRecordYear (the year debt passes the 1946 record) is missing');
  else if (at(rec) == null) problems.push(`CBO cboRecordYear ${rec} has no value in cboProjection`);
  else if (!(at(rec) > 106)) problems.push(`CBO cboRecordYear ${rec} shows ${at(rec)}% of GDP, not above the 1946 record of 106%`);
  else if (firstAbove && Number(firstAbove) !== rec) problems.push(`CBO cboProjection first exceeds 106% of GDP in ${firstAbove}, but cboRecordYear is ${rec}`);
  if (years.length && at(years[years.length - 1]) == null) problems.push(`CBO cboProjection has no value for the baseline's last year ${years[years.length - 1]}`);
  if (years.length && !labels.includes(String(years[0]))) problems.push(`CBO cboProjection does not cover the baseline's first year ${years[0]}`);
  const a = MD.cboAssumptions || {};
  for (const k of ['realGdp', 'cpi', 'tenYear', 'unemployment']) {
    if (!a[k] || typeof a[k].first !== 'number' || typeof a[k].avg !== 'number') problems.push(`CBO cboAssumptions.${k} needs numeric "first" (first projection year) and "avg" (10-year average)`);
  }
  if (MD.cboPublished && years.length && Number(String(MD.cboPublished).slice(0, 4)) !== years[0]) problems.push(`CBO baseline published ${MD.cboPublished} but its first projection year is ${years[0]}`);
  if (!MD.cboUrl || !/^https:\/\/www\.cbo\.gov\/publication\/\d+/.test(String(MD.cboUrl))) problems.push('CBO cboUrl must be a cbo.gov publication link');
  if (!MD.cboTitle) problems.push('CBO cboTitle is missing');
  const src = MD.sources && MD.sources.cbo ? String(MD.sources.cbo) : '';
  if (MD.cboTitle && !src.includes(String(MD.cboTitle))) problems.push('CBO sources.cbo does not name the baseline in cboTitle');
}

// ---- report ----
const pad = (s, n) => String(s).padEnd(n);
console.log(`US fiscal monitor freshness, evaluated ${nowIso} (data.js generated ${LD.generatedAt || '?'})`);
for (const [label, d, age, status, source] of rows) console.log(`  ${pad(status, 6)} ${pad(label, 58)} ${pad(d, 18)} ${pad(age, 40)} ${source}`);
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.map((p) => '  ' + p).join('\n') : '\nhealthy: every data point is within its allowance and the rates are consistent');
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [`### US fiscal monitor freshness (${nowIso})`, '', '| Data point | Latest | Age | Status |', '|---|---|---|---|',
    ...rows.map(([label, d, age, status]) => `| ${label} | ${d} | ${age} | ${status === 'ok' ? 'ok' : '**STALE**'} |`), '',
    problems.length ? '**Problems**\n\n' + problems.map((p) => `- ${p}`).join('\n') : 'No problems.', ''].join('\n');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, problems.length ? `problems<<FISCALEOF\n${problems.join('\n')}\nFISCALEOF\n` : 'problems=\n');
}
