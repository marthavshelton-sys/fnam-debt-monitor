// Freshness test for the Mexico fiscal monitor. Every series in site/mx/fiscal/data.js is aged against
// its allowance in tools/mx-fiscal/freshness.json (Mexican business days for daily series, calendar
// days after the end of the period for the rest), with the same calendar the page uses
// (site/assets/provenance.js). It also fails when the whole file was not refreshed for more than two
// business days, or when a series was kept from an earlier run because its fetch failed (stale: true).
//
//   node scripts/mx-fiscal/check-freshness.mjs [--now YYYY-MM-DD]
//
// Prints one line per series, writes the table to $GITHUB_STEP_SUMMARY and the problem list to
// $GITHUB_OUTPUT (`problems`), where the workflow opens or closes the mx-fiscal-health issue.
// Series not shown on the page are listed but never counted as problems (`hidden` below).
// Exits 1 when a series the page shows is past its allowance, so the run turns red as well.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = new URL('../../', import.meta.url);
globalThis.location = { search: '' };
const P = require(new URL('site/assets/provenance.js', ROOT).pathname);

const argv = process.argv.slice(2);
const nowIso = (() => { const i = argv.indexOf('--now'); return i >= 0 ? argv[i + 1] : new Date().toISOString().slice(0, 10); })();
const txt = await fs.readFile(new URL('site/mx/fiscal/data.js', ROOT), 'utf8');
const MX = JSON.parse(txt.slice(txt.indexOf('{', txt.indexOf('window.MX_DATA =')), txt.lastIndexOf('}') + 1));
const rules = JSON.parse(await fs.readFile(new URL('tools/mx-fiscal/freshness.json', ROOT), 'utf8'));
const html = await fs.readFile(new URL('site/mx/fiscal/index.html', ROOT), 'utf8');

const rows = [], problems = [], notes = [];
const run = MX.generatedAt ? MX.generatedAt.slice(0, 10) : null;
const runAge = run ? P.businessDays(run, nowIso, 'mx') : Infinity;
if (runAge > 2) problems.push(`data.js was last refreshed on ${run}, ${runAge} Mexican business days before ${nowIso} (allowance 2): the daily workflow is not running or not committing`);

for (const [key, s] of Object.entries(MX.series)) {
  const rule = rules.bySeries[key] || rules.byFreq[s.freq] || { days: 90 };
  const f = P.freshness(s.last && s.last[0], rule, 'mx', nowIso);
  const hidden = !new RegExp(`['"]${key}['"]`).test(html); // the page names every series it reads as a string literal
  const status = s.stale ? 'KEPT (fetch failed)' : f.level === 'amber' ? 'STALE' : 'ok';
  rows.push([key, s.freq, s.last ? s.last[0] : '—', `${f.age} ${f.unit}`, rule.bd != null ? `${rule.bd} bd` : `${rule.days} d`, status + (hidden ? ' (not shown)' : '')]);
  if (status === 'ok') continue;
  const line = `${key} (${s.provider} ${s.id}): latest ${s.last ? s.last[0] : 'none'}, ${P.ageText(f, 'en')} old, allowance ${rule.bd != null ? rule.bd + ' business days' : rule.days + ' days after period end'}${s.stale ? `; kept from ${s.fetchedAt} because the fetch failed: ${(s.staleReason || '').slice(0, 160)}` : ''}`;
  (hidden ? notes : problems).push(line);
}

const table = ['| series | freq | latest | age | allowance | status |', '|---|---|---|---|---|---|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n');
console.log(table);
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.map((p) => '  ' + p).join('\n') : `\nhealthy on ${nowIso}: every series the page shows is within its allowance`);
if (notes.length) console.log(`\nNot shown on the page, listed for the record (${notes.length}):\n` + notes.map((p) => '  ' + p).join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Freshness (${nowIso})\n\n${problems.length ? '**' + problems.length + ' problem(s)**\n\n' + problems.map((p) => '- ' + p).join('\n') + '\n\n' : 'Healthy.\n\n'}${table}\n`);
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `problems<<EOF_PROBLEMS\n${problems.join('\n')}\nEOF_PROBLEMS\n`);
process.exit(problems.length ? 1 : 0);
