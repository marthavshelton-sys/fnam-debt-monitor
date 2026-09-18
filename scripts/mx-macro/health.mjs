// Post-refresh health check for the Mexico macro dashboard.
//
// The fetch step is deliberately forgiving - a series whose providers fail keeps its last
// committed points, so one bad feed never takes the page down. The cost is that a dead token
// or a changed API makes the page go stale silently. This script is the alarm: `fetchedAt`
// only advances when a provider actually answers for that series, so any series whose
// `fetchedAt` is older than MAX_AGE_DAYS means every one of its providers has been failing
// for that long, whatever the page happens to show.
//
// Prints a human-readable verdict, and writes the problem list to $GITHUB_OUTPUT (`problems`)
// for the workflow's issue-alert step. Always exits 0: the alarm is the issue, not a red run.
import { readFile, appendFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const MAX_AGE_DAYS = 7;

const manifest = JSON.parse(await readFile(new URL('tools/mx-macro/series.json', ROOT), 'utf8'));
const dataPath = process.env.MX_MACRO_DATA || new URL('tools/mx-macro/data/series.json', ROOT);
let data = { series: {} };
try { data = JSON.parse(await readFile(dataPath, 'utf8')); } catch (e) { /* absent file = every series missing */ }

const now = Date.now();
const problems = [];
for (const key of Object.keys(manifest.series)) {
  const s = data.series[key];
  if (!s) { problems.push(`${key}: no data at all (every candidate failing, nothing kept)`); continue; }
  const age = Math.floor((now - Date.parse(s.fetchedAt + 'T00:00:00Z')) / 86400000);
  if (!(age <= MAX_AGE_DAYS)) {
    problems.push(`${key}: ${s.providerLabel || s.provider} ${s.id} last answered ${s.fetchedAt}` +
      ` (${Number.isFinite(age) ? age + ' days ago' : 'unparseable date'}); the page is showing kept data`);
  }
}

const total = Object.keys(manifest.series).length;
console.log(problems.length
  ? `STALE (${problems.length} of ${total} series):\n` + problems.map((p) => '  ' + p).join('\n')
  : `healthy: all ${total} series answered by a provider within ${MAX_AGE_DAYS} days`);
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT,
    problems.length ? `problems<<MXEOF\n${problems.join('\n')}\nMXEOF\n` : 'problems=\n');
}
