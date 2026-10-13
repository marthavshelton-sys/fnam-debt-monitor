#!/usr/bin/env node
// Did the latest scheduled refresh of the Mexican Consumer page start? GitHub sometimes starts a scheduled run hours late
// or drops it (12-Oct-2026: the 15:20 UTC slot started at 22:30), and the page's releases are timed to the publishers'
// hours, so the page's daily task (tools/mx-consumidor/ROUTINE-PROMPT.md) runs this and, with --dispatch, starts the
// refresh by hand when no run of the workflow on main began after the latest scheduled time that is at least 40 minutes
// past. Reads the schedule from the workflow file itself; asks GitHub's API through `gh` (or curl, the repository is public).
//
//   node scripts/mx-consumidor/schedule-check.mjs [--dispatch]
//
// Prints JSON: { slot, lastRun, lastScheduled, missed, dispatched }. Exits 0 whatever it finds; a failed dispatch is reported
// in `error`.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { p } from './lib/common.mjs';

const REPO = 'marthavshelton-sys/fnam-debt-monitor', FILE = 'mx-consumidor-refresh.yml';
const DISPATCH = process.argv.includes('--dispatch');
const LEAD_MIN = 40;
const crons = [...readFileSync(p(`.github/workflows/${FILE}`), 'utf8').matchAll(/cron:\s*"(\d{1,2}) (\d{1,2}) \* \* \*"/g)].map((m) => ({ min: +m[1], hour: +m[2] }));
const now = Date.now();
// the latest daily slot that is at least LEAD_MIN minutes past
let slot = null;
for (let d = 0; d <= 1 && !slot; d++) {
  const day = new Date(now - d * 864e5);
  const cands = crons.map((c) => Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), c.hour, c.min)).filter((t) => t <= now - LEAD_MIN * 6e4);
  if (cands.length) slot = Math.max(...cands);
}
const api = (path) => {
  try { return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch (e) { return JSON.parse(execFileSync('curl', ['-s', `https://api.github.com${path}`], { encoding: 'utf8' })); }
};
const out = { now: new Date(now).toISOString(), slot: slot ? new Date(slot).toISOString() : null, schedule: crons.map((c) => `${String(c.hour).padStart(2, '0')}:${String(c.min).padStart(2, '0')} UTC`) };
try {
  const runs = (api(`/repos/${REPO}/actions/workflows/${FILE}/runs?branch=main&per_page=15`).workflow_runs || []);
  const pick = (r) => (r ? { createdAt: r.created_at, event: r.event, status: r.status, conclusion: r.conclusion, url: r.html_url } : null);
  out.lastRun = pick(runs[0]);
  out.lastScheduled = pick(runs.find((r) => r.event === 'schedule'));
  out.missed = !!slot && !runs.some((r) => Date.parse(r.created_at) >= slot - 60e3);
  if (out.missed && DISPATCH) {
    try { execFileSync('gh', ['workflow', 'run', FILE, '--repo', REPO, '--ref', 'main'], { stdio: ['ignore', 'pipe', 'pipe'] }); out.dispatched = true; }
    catch (e) { out.dispatched = false; out.error = String((e.stderr && e.stderr.toString()) || e.message).trim().slice(0, 300); }
  }
} catch (e) { out.error = `GitHub API: ${String(e.message || e).slice(0, 200)}`; }
console.log(JSON.stringify(out, null, 1));
