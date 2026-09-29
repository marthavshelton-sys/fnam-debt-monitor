#!/usr/bin/env node
// Per-data-point freshness and consistency check for the US fiscal monitor (site/fiscal).
//
// Every figure the page shows is either fetched into site/fiscal/data.js by scripts/fetch-data.mjs
// or researched into site/fiscal/monthly-data.js by the Claude routine "FNAM US Fiscal: CBO /
// FedWatch research". Each has a known publication cadence. This script reads both files, works
// out how old every data point is against the allowance for its cadence, and cross-checks the
// figures that must agree with each other (the administered rates against the FOMC target range,
// the FedWatch snapshot against the latest FOMC decision, category sums against Treasury totals).
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

// ---- cadence table: every data point, what its date stamp means, and its allowance ----
// `period` says what the stamped date is: 'obs' = the observation day itself (daily/weekly series and
// Treasury's month-end tables), 'month' / 'quarter' / 'year' = the FIRST day of the period (how FRED
// stamps monthly, quarterly and annual series; TIC stamps "YYYY-MM"). Age is measured from the END of
// that period, and the allowance is the number of days after which the publisher's NEXT release
// should have replaced the data point (normal lag plus a margin for holidays and late postings): a
// data point older than that means a newer figure exists that the fetch has failed to pick up.
const POINTS = [
  ['Debt to the Penny (total, public, intragovernmental)', 'debt.date', 'obs', 5, 'Treasury Fiscal Data, daily (business days)'],
  ['FOMC target range (DFEDTARU/DFEDTARL)', 'targetRange.date', 'obs', 6, 'Federal Reserve Board via FRED, daily'],
  ['Effective federal funds rate (EFFR)', 'rates.effr.date', 'obs', 6, 'New York Fed via FRED, daily'],
  ['Interest on reserve balances (IORB)', 'rates.iorb.date', 'obs', 6, 'Federal Reserve Board via FRED, daily'],
  ['ON RRP award rate', 'rates.onrrp.date', 'obs', 6, 'New York Fed via FRED, daily'],
  ['Discount rate (primary credit)', 'rates.discount.date', 'obs', 6, 'Federal Reserve Board via FRED, daily'],
  ['ON RRP take-up', 'rrpVolume.date', 'obs', 6, 'New York Fed via FRED, daily'],
  ['10-year Treasury yield', 'macroActuals.tenYear.date', 'obs', 7, 'Treasury via FRED, daily'],
  ['Fed total assets (WALCL)', 'fed.walcl.date', 'obs', 12, 'H.4.1 via FRED, weekly (Wednesday)'],
  ['Fed balance-sheet lines (H.4.1)', 'fedBalanceSheet.date', 'obs', 12, 'H.4.1 via FRED, weekly (Wednesday)'],
  ['Average interest rates on the debt', 'avgRate.date', 'obs', 45, 'Treasury Fiscal Data, monthly, about a week after month-end'],
  ['Debt composition (MSPD table 1)', 'debtComposition.date', 'obs', 45, 'Treasury MSPD, monthly, about a week after month-end'],
  ['Average maturity and schedule (MSPD table 3)', 'avgMaturity.date', 'obs', 45, 'Treasury MSPD, monthly, about a week after month-end'],
  ['Monthly Treasury Statement (receipts, outlays, interest)', 'mts.date', 'obs', 55, 'Treasury MTS, monthly, 8th business day of the next month (later for September)'],
  ['Accrued interest expense', 'accruedInterest.date', 'obs', 55, 'Treasury Fiscal Data, monthly, with the MTS'],
  ['M2 money stock', 'fed.m2.date', 'month', 65, 'Federal Reserve H.6 via FRED, monthly, fourth week of the next month'],
  ['CPI inflation (y/y)', 'macroActuals.cpiYoY.date', 'month', 55, 'BLS via FRED, monthly, around the 12th of the next month'],
  ['Unemployment rate', 'macroActuals.unemployment.date', 'month', 45, 'BLS via FRED, monthly, first Friday of the next month'],
  ['Major foreign holders (TIC table 5)', 'foreignHolders.date', 'month', 80, 'Treasury TIC, monthly, about seven weeks after month-end'],
  ['Nominal GDP (BEA)', 'gdp.date', 'quarter', 135, 'BEA via FRED, quarterly, four weeks after quarter-end'],
  ['Real GDP growth (BEA)', 'macroActuals.realGdpGrowth.date', 'quarter', 135, 'BEA via FRED, quarterly, four weeks after quarter-end'],
  ['Ownership of Treasury securities (OFS-2)', 'holders.asOf', 'obs', 290, 'Treasury Bulletin, quarterly, fully reported about two quarters after quarter-end'],
  ['Gross federal debt, % of GDP (annual)', 'debtGdpAnnual.date', 'year', 470, 'FRED GFDGDPA188S, annual, the next year posts in the first quarter'],
  ['CME FedWatch snapshot', 'fedWatch.asOf', 'obs', 14, 'monthly-data.js (research routine), refreshed Mondays, Wednesdays and Fridays', MD],
];
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
  const age = days(end);
  const ok = age <= allowance;
  const shown = period === 'obs' ? d : `${d.slice(0, 7)}${period === 'quarter' ? ' (quarter)' : period === 'year' ? ' (year)' : ''}`;
  rows.push([label, shown, `${age} d after ${period === 'obs' ? 'obs.' : 'period end'} (allowance ${allowance})`, ok ? 'ok' : 'STALE', source]);
  if (!ok) problems.push(`${label}: latest ${shown} is ${age} days past its ${period === 'obs' ? 'date' : 'period end'}, allowance ${allowance} (${source})`);
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
if (m && Array.isArray(m.revYTDcur) && m.totalReceiptsB != null) {
  const s = m.revYTDcur.reduce((a, b) => a + b, 0);
  if (!near(s, m.totalReceiptsB, 1)) problems.push(`MTS receipt categories sum to $${s.toFixed(2)}B but total receipts are $${m.totalReceiptsB.toFixed(2)}B (${m.date})`);
  const o = m.outYTDcur.reduce((a, b) => a + b, 0);
  if (!near(o, m.totalOutlaysB, 1)) problems.push(`MTS outlay categories sum to $${o.toFixed(2)}B but total outlays are $${m.totalOutlaysB.toFixed(2)}B (${m.date})`);
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
