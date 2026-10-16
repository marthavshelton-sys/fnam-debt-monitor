#!/usr/bin/env node
// Starts by hand the scheduled refreshes GitHub dropped or is holding (rule and reasons in dispatch-lib.mjs). Runs as the last
// step of the watchdog workflow (.github/workflows/data-watchdog.yml, GITHUB_TOKEN with actions: write) and by hand:
//
//   node scripts/watchdog/dispatch-missed.mjs [--dry-run] [--lead <minutes>] [--now <ISO time>] [--include-self]
//
// --dry-run lists the missed schedules and dispatches nothing; --lead (default 40) is how long after a due time a missing run
// counts as missed; --include-self judges data-watchdog.yml too (only useful from outside the watchdog run, e.g. the
// Cloudflare Worker in tools/dispatcher/, which carries the same logic). Prints one line per workflow and a JSON summary;
// exits 1 only when GitHub cannot be read. A dispatched run is a hand run on main, which the watchdog credits to the schedule
// it replaced (lib.mjs creditHandRun), so the dashboard reads up to date as soon as it lands.
import { readFile, appendFile } from 'node:fs/promises';
import { dispatchMissed } from './dispatch-lib.mjs';

const ROOT = new URL('../../', import.meta.url);
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes('--dry-run');
const NOW = arg('--now') ? Date.parse(arg('--now')) : Date.now();
if (!Number.isFinite(NOW)) throw new Error('--now needs an ISO date-time');
const LEAD = (Number(arg('--lead')) || 40) * 6e4;
const REPO = process.env.GITHUB_REPOSITORY || 'marthavshelton-sys/fnam-debt-monitor';
const TOKEN = process.env.GITHUB_TOKEN || '';

async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fnam-dispatch-missed' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`GitHub API ${method} ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}
const readText = (p) => readFile(new URL(p, ROOT), 'utf8');

const report = await dispatchMissed({ readText, api, now: NOW, leadMs: LEAD, includeSelf: argv.includes('--include-self'), dryRun: DRY, log: (l) => console.log(l) });
const missed = report.filter((w) => w.missed.length);
console.log(missed.length ? '' : `No missed schedule at ${new Date(NOW).toISOString()} (lead ${LEAD / 6e4} min).`);
console.log(JSON.stringify({ now: new Date(NOW).toISOString(), leadMinutes: LEAD / 6e4, dryRun: DRY, workflows: report }, null, 1));
if (process.env.GITHUB_STEP_SUMMARY && missed.length) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, ['', '### Missed schedules', '| Workflow | Missed cron(s) | Action |', '|---|---|---|',
    ...missed.map((w) => `| ${w.file} | ${w.missed.map((m) => `\`${m.cron}\` due ${m.due}`).join('<br>')} | ${w.dispatched ? 'dispatched on main' : w.wouldDispatch ? 'would dispatch (dry run)' : w.skipped || w.error || '—'} |`), ''].join('\n'));
}
