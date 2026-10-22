// Observed publication lags for the Mexico fiscal monitor (22-Oct-2026), so freshness allowances calibrate themselves.
//
// Before, every allowance in tools/mx-fiscal/freshness.json was typed from a guess about the publisher's calendar, and a
// guess that was short opened a false SOURCE DOWN alert (deudaNetaSPEA on 6-Oct-2026 at 66 days, raised by hand to 100;
// vgPlazoPromedio on 16-Oct-2026 at 45 days). Now the fetcher records, for each series, the day each new period first
// appeared in a fetch (tools/mx-fiscal/lags.json → seen[period] = date), and the allowance the page and the health check
// use is the larger of the typed one and what the publisher has actually done:
//
//   effective = max(typed, secondLargest(observed lags of the last 12 periods) + margin)
//
// with the lag measured the way the rule is (Mexican business days for a `bd` rule, calendar days after the period's
// end for a `days` rule) and a margin of 2 business days or 7 calendar days. The second-largest lag, not the largest,
// so one late month does not raise the allowance for a year; with a single observation it is that one. The typed value
// stays a floor and an explanation; it is never lowered automatically. A series with no observed lag yet keeps the typed
// allowance. Nothing here changes a figure: only when the page turns amber and when the workflow alerts.
import fs from 'node:fs/promises';

export const LAGS_PATH = new URL('../../tools/mx-fiscal/lags.json', import.meta.url);
const KEEP = 24;   // periods remembered per series (lags are computed from the newest 12)

export async function loadLags() {
  try { return JSON.parse(await fs.readFile(LAGS_PATH, 'utf8')); } catch { return { _readme: README, series: {} }; }
}

const README = [
  'Observed publication lags, written by scripts/mx-fiscal/fetch.mjs on every refresh (scripts/mx-fiscal/lags.mjs explains the rule).',
  'seen[period] = the first refresh date on which that period was the latest point of the series; baseline = the period the series was first recorded with (never counted). Do not edit by hand;',
  'delete a series entry to make it relearn. The typed allowances in freshness.json remain the floor.',
];

// Record the first-seen date of each series' latest period. `series` is the fetched map (key -> {last, stale, …}).
export function recordLags(lags, series, today) {
  lags.series ||= {};
  lags._readme = README;
  for (const [key, s] of Object.entries(series)) {
    if (!s || s.stale || !s.last) continue;        // a kept series proves nothing about the publisher
    const period = String(s.last[0]);
    // The first period a series is recorded with has usually been there for weeks: it is kept as the baseline and
    // never counted as a lag; learning starts with the next period that appears.
    const entry = (lags.series[key] ||= { seen: {}, baseline: period });
    entry.freq = s.freq;
    if (!entry.seen[period]) entry.seen[period] = today;
    const periods = Object.keys(entry.seen).sort();
    for (const p of periods.slice(0, Math.max(0, periods.length - KEEP))) delete entry.seen[p];
  }
  return lags;
}

export async function saveLags(lags) {
  await fs.writeFile(LAGS_PATH, JSON.stringify(lags, null, 1) + '\n', 'utf8');
}

// Effective rule for one series: the typed rule widened by what was observed. `P` is site/assets/provenance.js.
export function effectiveRule(typed, entry, P) {
  const rule = { ...typed };
  const seen = entry && entry.seen ? Object.entries(entry.seen).filter(([p]) => p !== entry.baseline).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-12) : [];
  const lags = seen.map(([period, date]) => P.freshness(period, typed, 'mx', date).age).filter((a) => Number.isFinite(a));
  if (!lags.length) return rule;
  const sorted = [...lags].sort((a, b) => b - a);
  const observed = sorted.length > 1 ? sorted[1] : sorted[0];
  const unit = typed.bd != null ? 'bd' : 'days';
  const margin = unit === 'bd' ? 2 : 7;
  const learned = observed + margin;
  if (learned > typed[unit]) { rule[unit] = learned; rule.learned = { from: `${sorted.length} observed lag(s), second largest ${observed} ${unit === 'bd' ? 'business days' : 'days'} + ${margin}`, typed: typed[unit] }; }
  return rule;
}

// All rules of freshness.json with the learned widenings applied (what data.js embeds and the health check reads).
export function effectiveRules(typedRules, lags, P) {
  const bySeries = {};
  for (const [key, entry] of Object.entries((lags && lags.series) || {})) {
    const typed = typedRules.bySeries[key] || typedRules.byFreq[entry.freq] || null;
    if (!typed) continue;
    const eff = effectiveRule(typed, entry, P);
    if (eff.learned || typedRules.bySeries[key]) bySeries[key] = eff;   // a byFreq series gets its own entry only once it learned
  }
  return { byFreq: typedRules.byFreq, bySeries: { ...typedRules.bySeries, ...bySeries } };
}
