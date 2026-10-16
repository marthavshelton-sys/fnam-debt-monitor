// Starts by hand the scheduled refreshes GitHub dropped or is holding: pure logic shared by scripts/watchdog/dispatch-missed.mjs
// (Node, run after each watchdog check) and tools/dispatcher/worker.mjs (a Cloudflare Worker cron, every 10 minutes). No I/O
// here beyond the two functions the caller passes: `readText(path)` returns a repository file of main (the dashboards config
// and each workflow file) and `api(path, init)` performs a GitHub REST call.
//
// Why: GitHub Actions schedules are best effort. In the week of 13-Oct-2026 this repository's schedules started three to seven
// hours late (the watchdog's own 03:50 UTC run at 08:31, the search index's 09:37 at 14:39, the airports hub's 17:30 at 21:54)
// and some never started (the U.S. macro 12:50 and 13:50 slots, the Mexican Consumer 12:20 slot), so the pages carried the
// previous run's data for hours and the landing page read "late" everywhere. A workflow_dispatch run starts within a minute.
//
// Rule: for each refresh workflow of tools/watchdog/dashboards.json, every cron whose latest due time is at least `leadMs` old
// and has no run on main booked to it (a scheduled run naming the cron in its title, a scheduled run attributed by start time,
// or a hand run started after the due time: lib.mjs perCronLate, the watchdog's own rule) makes the workflow missed, and a
// missed workflow is dispatched once on main. A run still queued or in progress counts as started, and a workflow with such a
// run is never dispatched again (its concurrency group would only queue the second one). One dispatch covers every missed cron
// of the workflow: each workflow's hand run does the whole job (the market-only crons do a subset of it).
import { cronsInWorkflow, cronFromTitle, perCronLate } from './lib.mjs';

export async function missedSchedules({ readText, api, now = Date.now(), leadMs = 40 * 6e4, lookbackMs = 2 * 864e5, includeSelf = false }) {
  const config = JSON.parse(await readText('tools/watchdog/dashboards.json'));
  const files = [...new Set(config.dashboards.flatMap((d) => d.workflows))];
  if (includeSelf) files.push('data-watchdog.yml');
  const out = [];
  for (const file of files) {
    const crons = cronsInWorkflow(await readText(`.github/workflows/${file}`));
    if (!crons.length) continue;
    const { workflow_runs: runs = [] } = await api(`/actions/workflows/${file}/runs?branch=main&per_page=40&exclude_pull_requests=true`);
    const recent = runs
      .filter((r) => r.event === 'schedule' || r.event === 'workflow_dispatch')
      .map((r) => ({ createdAt: r.created_at, landed: true, manual: r.event === 'workflow_dispatch', crons, cron: r.event === 'schedule' ? cronFromTitle(r.display_title || r.name) : null }));
    const since = runs.length >= 40 ? Math.min(...runs.map((r) => Date.parse(r.created_at))) : null;
    const missed = perCronLate({ crons, now, graceMs: leadMs, lookbackMs, runs: recent, since });
    const active = runs.some((r) => r.status === 'queued' || r.status === 'in_progress' || r.status === 'waiting' || r.status === 'requested' || r.status === 'pending');
    out.push({ file, crons, missed: missed.map((m) => ({ cron: m.cron, due: new Date(m.missedSince).toISOString() })), active, lastRun: runs[0] ? { createdAt: runs[0].created_at, event: runs[0].event, status: runs[0].status, conclusion: runs[0].conclusion, title: runs[0].display_title || runs[0].name } : null });
  }
  return out;
}

export async function dispatchMissed({ readText, api, now, leadMs, lookbackMs, includeSelf, dryRun = false, log = () => {} }) {
  const report = await missedSchedules({ readText, api, now, leadMs, lookbackMs, includeSelf });
  for (const w of report) {
    if (!w.missed.length) continue;
    if (w.active) { w.skipped = 'a run is queued or in progress'; log(`${w.file}: missed ${w.missed.map((m) => `${m.cron} (due ${m.due})`).join(', ')}; a run is queued or in progress, not dispatched`); continue; }
    if (dryRun) { w.wouldDispatch = true; log(`${w.file}: would dispatch (missed ${w.missed.map((m) => `${m.cron} due ${m.due}`).join(', ')})`); continue; }
    try {
      await api(`/actions/workflows/${w.file}/dispatches`, { method: 'POST', body: { ref: 'main' } });
      w.dispatched = true;
      log(`${w.file}: dispatched on main (missed ${w.missed.map((m) => `${m.cron} due ${m.due}`).join(', ')})`);
    } catch (e) { w.error = String(e.message || e).slice(0, 300); log(`${w.file}: dispatch failed: ${w.error}`); }
  }
  return report;
}
