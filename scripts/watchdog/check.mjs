#!/usr/bin/env node
// Data-refresh watchdog for fnam.mx: has every dashboard's scheduled refresh landed on time?
//
// Each dashboard is refreshed by a scheduled GitHub Actions workflow; tools/watchdog/dashboards.json maps
// dashboards to workflows and to the alert labels their own pipelines use. For each dashboard this script
// finds the last scheduled run whose data refresh landed and judges it against that workflow's own cron
// schedule (rules and tests in lib.mjs / selftest.mjs):
//
//   stale  a price feed of the page (dashboards.json → prices) is behind the exchange's last completed session,
//          judged from the data files in main (the owner's rule, 6-Oct-2026: any price not updated turns the dot red);
//          'unverified' when the exchange calendar in lib.mjs does not cover the date (extend it); or a monthly data
//          feed (dashboards.json → data: the airport pages' traffic file) does not carry the month its publisher's
//          calendar requires (owner, 9-Oct-2026: ASUR showed "ok" on prices while its traffic file was a month behind);
//   late   two scheduled refreshes in a row failed or never ran (3 h grace after each due time), judged for the
//          workflow as a whole and for each of its crons (a market-only run must not cover a failing filings run);
//   alert  on time, but an alert issue of the dashboard's own pipeline is open (SOURCE DOWN, health, live check);
//   ok     on time and no alert open: the only case the site shows a dashboard as up to date ("Al día").
//
// Output: site/status/refresh.json, read by the landing page's "Last successful data refresh" panel and the
// status dot on each company page. Rewritten only when something in it changes or the stored check is
// heartbeatHours old, so the pages can tell a silent watchdog (checkedAt too old) from a quiet night.
//
// Alarm: a late dashboard whose own pipeline has no alert open gets one issue titled
// "SOURCE DOWN: watchdog - <dashboard> refresh late" (label data-watchdog), which the owner's email routine
// sends like every "SOURCE DOWN: " issue; a dashboard with a stale price feed gets "SOURCE DOWN: watchdog -
// <dashboard> prices stale". The first check that finds the dashboard on time (or its prices current) closes it.
//
//   node scripts/watchdog/check.mjs [--dry-run] [--no-issues] [--now <ISO time>]
//
// --dry-run prints the verdicts and writes nothing; --no-issues writes the status file and leaves issues alone.
// In Actions: GITHUB_TOKEN (actions: read, issues: write) and GITHUB_REPOSITORY. Exits 1 only when GitHub
// cannot be read: an unverifiable state is never written as a verdict.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { verdict, perCronLate, cronsInWorkflow, refreshLandedBySteps, attemptRecord, priceVerdict, monthlyVerdict, lastCsvDate, jsonDate, jsonMonth, isoSeconds, cdmx } from './lib.mjs';

const ROOT = new URL('../../', import.meta.url);
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const NO_ISSUES = DRY || argv.includes('--no-issues');
const nowAt = argv.indexOf('--now');
const NOW = nowAt >= 0 ? Date.parse(argv[nowAt + 1]) : Date.now();
if (!Number.isFinite(NOW)) throw new Error('--now needs an ISO date-time');
const REPO = process.env.GITHUB_REPOSITORY || 'marthavshelton-sys/fnam-debt-monitor';
const TOKEN = process.env.GITHUB_TOKEN || '';
const CONFIG = JSON.parse(await readFile(new URL('tools/watchdog/dashboards.json', ROOT), 'utf8'));
const GRACE = (CONFIG.graceHours ?? 3) * 36e5;
const HEARTBEAT = (CONFIG.heartbeatHours ?? 11) * 36e5;
const LOOKBACK = 14 * 864e5;
const OUT = new URL('site/status/refresh.json', ROOT);
const LABEL = 'data-watchdog';
const mark = (id) => `<!-- watchdog:${id} -->`;

async function gh(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fnam-data-watchdog' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (body) headers['Content-Type'] = 'application/json';
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`https://api.github.com${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (r.ok) return r.status === 204 ? null : r.json();
    if (attempt < 3 && (r.status >= 500 || r.status === 429)) { await new Promise((ok) => setTimeout(ok, attempt * 3000)); continue; }
    throw new Error(`GitHub API ${method} ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
}

async function openIssues() {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`/repos/${REPO}/issues?state=open&per_page=100&page=${page}`);
    all.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return all;
}

// The newest completed scheduled run, the newest one whose refresh landed, and every recent run with whether it landed
// (for the per-cron rule: a failed run landed when its commit step succeeded before the failure).
async function runsOf(file) {
  const { workflow_runs: runs } = await gh(`/repos/${REPO}/actions/workflows/${file}/runs?event=schedule&status=completed&per_page=30&exclude_pull_requests=true`);
  let landed = null;
  const recent = [];
  for (const run of runs) {
    let ok = run.conclusion === 'success', after = false;
    if (!ok && run.conclusion === 'failure') {
      const { jobs } = await gh(`/repos/${REPO}/actions/runs/${run.id}/jobs?per_page=30`);
      ok = refreshLandedBySteps(jobs); after = ok;
    }
    recent.push({ createdAt: run.created_at, landed: ok });
    if (ok && !landed) landed = { run, afterCommitFailure: after };
  }
  if (!landed) {
    const { workflow_runs: older } = await gh(`/repos/${REPO}/actions/workflows/${file}/runs?event=schedule&status=success&per_page=1&exclude_pull_requests=true`);
    if (older[0]) landed = { run: older[0], afterCommitFailure: false };
  }
  // the page of runs covers only so many days: the per-cron rule judges nothing older than its oldest run (a full page) or the lookback
  const since = runs.length >= 30 ? Math.min(...runs.map((r) => Date.parse(r.created_at))) : null;
  return { attempt: runs[0] || null, landed, recent, since };
}

// Price feeds (dashboards.json → prices): each series names a file in main and how to read its latest date;
// the verdict compares every date with the exchange's last completed session (lib.mjs priceVerdict); a series with its
// own `exchange` (an ADS beside a BMV listing) is judged on that exchange's calendar. Feed names may be bilingual
// ({ es, en }); the file paths stay out of the published status file (public copy carries no repository paths) and go
// only to the console line and the alarm issue.
async function priceCheck(cfg) {
  const series = [], files = [];
  for (const s of cfg.series) {
    let date = null;
    try {
      const text = await readFile(new URL(s.file, ROOT), 'utf8');
      // kind json: a dotted path in a JSON file; kind js: the same in a `window.X = {...};` data file; csv: the last dated row
      date = s.kind === 'json' ? jsonDate(JSON.parse(text), s.field)
        : s.kind === 'js' ? jsonDate(JSON.parse(text.slice(text.indexOf('{')).replace(/;\s*$/, '')), s.field)
        : lastCsvDate(text);
    } catch (e) { console.warn(`${nameOf(s.name)}: ${s.file} unreadable (${e.message})`); }
    series.push({ name: s.name, date, lagSessions: s.lagSessions || 0, ...(s.exchange ? { exchange: s.exchange } : {}) });
    files.push(s.file);
  }
  const verdict = priceVerdict({ exchange: cfg.exchange || 'NYSE', now: NOW, settleHours: cfg.settleHours || 0, series });
  verdict.series.forEach((r, i) => { if (series[i].lagSessions) r.lagSessions = series[i].lagSessions; });
  return { verdict, files };
}
const nameOf = (n) => (n && typeof n === 'object' ? n.en : String(n));

// Monthly data feeds (dashboards.json → data): each series names a file in main and the dotted path of its latest month
// (kind js: a `window.X = {...};` data file; json: a JSON file), judged against the month the publisher's calendar requires
// (lib.mjs monthlyVerdict: month M−1 once day dueDay of month M has ended in Mexico City). File paths stay out of the status file.
async function dataCheck(cfg) {
  const series = [], files = [];
  for (const s of cfg.series) {
    let month = null;
    try {
      const text = await readFile(new URL(s.file, ROOT), 'utf8');
      month = s.kind === 'json' ? jsonMonth(JSON.parse(text), s.field) : jsonMonth(JSON.parse(text.slice(text.indexOf('{')).replace(/;\s*$/, '')), s.field);
    } catch (e) { console.warn(`${nameOf(s.name)}: ${s.file} unreadable (${e.message})`); }
    series.push({ name: s.name, month, dueDay: s.dueDay, timeZone: s.timeZone });
    files.push(s.file);
  }
  return { verdict: monthlyVerdict({ now: NOW, series, dueDay: cfg.dueDay || 10, timeZone: cfg.timeZone || 'America/Mexico_City' }), files };
}

const issues = await openIssues();
const rows = [], notes = {};
for (const d of CONFIG.dashboards) {
  const crons = [], recent = [];
  let attempt = null, landed = null, since = null;
  for (const file of d.workflows) {
    crons.push(...cronsInWorkflow(await readFile(new URL(`.github/workflows/${file}`, ROOT), 'utf8')));
    const r = await runsOf(file);
    if (r.attempt && (!attempt || r.attempt.created_at > attempt.created_at)) attempt = r.attempt;
    if (r.landed && (!landed || r.landed.run.created_at > landed.run.created_at)) landed = r.landed;
    recent.push(...(r.recent || []));
    if (r.since != null && (since == null || r.since > since)) since = r.since;
  }
  if (!crons.length) throw new Error(`${d.id}: no schedule in ${d.workflows.join(', ')}`);
  const alerts = issues.filter((i) => i.labels.some((l) => (d.alertLabels || []).includes(l.name)));
  const v = verdict({ crons, now: NOW, graceMs: GRACE, lookbackMs: LOOKBACK, lastLandedCreatedAt: landed ? landed.run.created_at : null, openAlerts: alerts.length });
  // a cron of its own whose last two due times both lack a landed run makes the dashboard late even when another cron keeps landing
  const lateCrons = perCronLate({ crons, now: NOW, graceMs: GRACE, lookbackMs: LOOKBACK, runs: recent, since });
  if (lateCrons.length && v.status !== 'late') { v.status = 'late'; v.requiredSince = Math.min(...lateCrons.map((x) => x.missedSince)); }
  const px = d.prices ? await priceCheck(d.prices) : null, prices = px ? px.verdict : null;
  const dx = d.data ? await dataCheck(d.data) : null, data = dx ? dx.verdict : null;
  rows.push({
    id: d.id, section: d.section, name: d.name, url: d.url,
    // stale (a price feed behind the last completed session, or a monthly data file behind its publisher's calendar) outranks
    // the refresh verdict: it is what the reader sees; a price check the calendar cannot judge leaves the dashboard
    // unverified rather than up to date
    status: (prices && prices.status === 'stale') || (data && data.status === 'stale') ? 'stale' : prices && prices.status === 'unverified' ? 'unverified' : v.status,
    refreshStatus: v.status,
    ...(lateCrons.length ? { lateCrons: lateCrons.map((x) => x.cron) } : {}),
    lastSuccess: landed ? isoSeconds(landed.run.updated_at) : null,
    // one run, one outcome (lib.mjs attemptRecord): a run that committed and then failed a later step is the landed refresh,
    // recorded as success + afterCommitFailure, never a failure at the same instant as lastSuccess
    lastAttempt: attemptRecord(attempt, landed),
    requiredSince: v.requiredSince !== null ? isoSeconds(v.requiredSince) : null,
    alerts: alerts.length,
    ...(prices ? { prices } : {}),
    ...(data ? { data } : {}),
  });
  notes[d.id] = { d, landed, attempt, alerts, prices, priceFiles: px ? px.files : [], data, dataFiles: dx ? dx.files : [], lateCrons };
}

// ---- report ----
const behindOf = (p) => (p ? p.series.filter((x) => x.ok === false) : []);
const pxLine = (p) => p ? `  ·  prices ${p.status}${p.expected ? ` (session ${p.expected}${behindOf(p).length ? `; behind: ${behindOf(p).map((x) => `${nameOf(x.name)} ${x.date || 'none'} < ${x.needed}`).join(', ')}` : ''})` : ' (calendar not maintained for this date)'}` : '';
const dataLine = (q) => q ? `  ·  data ${q.status}${behindOf(q).length ? ` (behind: ${behindOf(q).map((x) => `${nameOf(x.name)} ${x.month || 'none'} < ${x.needed}`).join(', ')})` : ` (month ${q.series.map((x) => x.needed).filter((v, i, a) => a.indexOf(v) === i).join('/')})`}` : '';
const line = (r) => `${r.id.padEnd(16)} ${r.status.padEnd(5)}  landed ${r.lastSuccess ? cdmx(r.lastSuccess) : 'never'}  ·  needed since ${r.requiredSince ? cdmx(r.requiredSince) : '—'}  ·  last attempt ${r.lastAttempt ? r.lastAttempt.result : '—'}${r.alerts ? `  ·  ${r.alerts} alert issue(s) open` : ''}${notes[r.id].landed && notes[r.id].landed.afterCommitFailure ? '  ·  (run failed after its commit step)' : ''}${r.lateCrons ? `  ·  schedule(s) not landing: ${r.lateCrons.join(' | ')}` : ''}${pxLine(r.prices)}${dataLine(r.data)}`;
console.log(`Watchdog at ${cdmx(NOW)}\n` + rows.map(line).join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, ['| Dashboard | Status | Last landed refresh | Needed since | Last attempt | Open alerts | Prices | Monthly data |', '|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.name.en} | ${r.status === 'ok' ? 'ok' : `**${r.status}**`} | ${r.lastSuccess ? cdmx(r.lastSuccess) : 'never'} | ${r.requiredSince ? cdmx(r.requiredSince) : '—'} | ${r.lastAttempt ? r.lastAttempt.result : '—'} | ${r.alerts} | ${r.prices ? `${r.prices.status}${r.prices.expected ? ` (session ${r.prices.expected})` : ''}${behindOf(r.prices).length ? `: ${behindOf(r.prices).map((x) => `${nameOf(x.name)} ${x.date || 'none'}`).join(', ')} behind` : ''}` : '—'} | ${r.data ? `${r.data.status}${behindOf(r.data).length ? `: ${behindOf(r.data).map((x) => `${nameOf(x.name)} ${x.month || 'none'} < ${x.needed}`).join(', ')}` : ''}` : '—'} |`), ''].join('\n'));
}

// ---- status file ----
const doc = {
  checkedAt: isoSeconds(NOW),
  rule: 'up to date = the last two scheduled refreshes did not both fail (3 h grace after each due time, judged per schedule too), no alert of the pipeline is open, every price feed of the page carries the exchange\'s last completed session and every monthly data feed carries the month its publisher\'s calendar requires (stale otherwise); checked every 12 hours. lastAttempt = the newest scheduled run with its refresh outcome: success when its data landed (afterCommitFailure when a step after the commit failed), else the run\'s conclusion',
  graceHours: GRACE / 36e5,
  sections: CONFIG.sections,
  dashboards: rows,
};
let prev = null;
try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
const comparable = (x) => JSON.stringify({ ...x, checkedAt: null });
const changed = !prev || comparable(prev) !== comparable(doc);
const due = !prev || !prev.checkedAt || NOW - Date.parse(prev.checkedAt) >= HEARTBEAT;
if (DRY) console.log('\n--dry-run: status file not written\n' + JSON.stringify(doc, null, 2));
else if (!changed && !due) console.log('\nStatus unchanged and heartbeat not due: file left as is.');
else {
  await mkdir(new URL('./', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`\nStatus file written (${changed ? 'changed' : 'heartbeat'}).`);
}

// ---- alarm ----
// Decide first, then act (or only print, with --dry-run / --no-issues).
const own = issues.filter((i) => i.labels.some((l) => l.name === LABEL));
const actions = [];
for (const r of rows) {
  const { d, landed, attempt, prices, priceFiles, data, dataFiles } = notes[r.id];
  const mine = own.find((i) => (i.body || '').includes(mark(r.id)));
  // a monthly data feed behind its publisher's calendar has its own issue (marker <id>:data)
  const mineData = own.find((i) => (i.body || '').includes(mark(`${r.id}:data`)));
  if (data && data.status === 'stale' && !mineData) {
    const behind = behindOf(data);
    actions.push({ kind: 'open', id: `${r.id}:data`, title: `SOURCE DOWN: watchdog - ${d.name.en} data stale`, body: [
      `A monthly data feed of **${d.name.en}** (https://fnam.mx${d.url}) does not carry the month its publisher's calendar requires (${behind.map((x) => `${nameOf(x.name)}: ${x.needed}, required from ${cdmx(x.requiredFrom)}`).join('; ')}). The page shows the dashboard as "Data out of date" (Datos desactualizados) until the file carries that month.`,
      '',
      '| Feed | File in main | Latest month | Needed | |', '|---|---|---|---|---|',
      ...data.series.map((x, i) => `| ${nameOf(x.name)} | \`${dataFiles[i] || '—'}\` | ${x.month || 'none'} | ${x.needed} | ${x.ok ? 'ok' : '**behind**'} |`),
      '',
      `Behind: ${behind.map((x) => nameOf(x.name)).join(', ')}. Look at the last filings run of the refresh workflow (a parse or validation failure leaves the file untouched; the run log names the row the parser did not recognise) and at the publisher's site in case the release is simply late; this issue closes itself at the first check that finds the file current.`,
      'Checked every 12 hours by `scripts/watchdog/check.mjs` (`.github/workflows/data-watchdog.yml`); runbook `tools/watchdog/README.md`.',
      '',
      mark(`${r.id}:data`),
    ].join('\n') });
  } else if (data && data.status === 'ok' && mineData) {
    actions.push({ kind: 'close', id: `${r.id}:data`, number: mineData.number, comment: `Recovered: every monthly data feed carries the month required (${data.series.map((x) => `${nameOf(x.name)} ${x.month}`).join(', ')}) at the ${cdmx(NOW)} check. Closing.` });
  }
  // a stale price feed has its own issue (marker <id>:prices), independent of the refresh-late one
  const minePx = own.find((i) => (i.body || '').includes(mark(`${r.id}:prices`)));
  if (prices && prices.status === 'stale' && !minePx) {
    const behind = behindOf(prices);
    actions.push({ kind: 'open', id: `${r.id}:prices`, title: `SOURCE DOWN: watchdog - ${d.name.en} prices stale`, body: [
      `A price feed of **${d.name.en}** (https://fnam.mx${d.url}) is behind the last completed ${prices.exchange} session (${prices.expected}, required from ${cdmx(prices.requiredFrom)}). The page shows the dashboard as "Prices out of date" (Precios desactualizados) until every feed carries that session.`,
      '',
      '| Feed | File in main | Latest date | Needed | |', '|---|---|---|---|---|',
      ...prices.series.map((x, i) => `| ${nameOf(x.name)} | \`${priceFiles[i] || '—'}\` | ${x.date || 'none'} | ${x.needed}${x.lagSessions ? ` (${x.lagSessions} session${x.lagSessions > 1 ? 's' : ''} of lag allowed)` : ''} | ${x.ok ? 'ok' : '**behind**'} |`),
      '',
      `Behind: ${behind.map((x) => nameOf(x.name)).join(', ')}. Check the feed's own refresh (the nightly FactSet routine for FactSet feeds, the refresh workflow for the runner feeds) and re-run it; this issue closes itself at the first check that finds every feed current.`,
      'Checked every 12 hours by `scripts/watchdog/check.mjs` (`.github/workflows/data-watchdog.yml`); runbook `tools/watchdog/README.md`.',
      '',
      mark(`${r.id}:prices`),
    ].join('\n') });
  } else if (prices && prices.status === 'ok' && minePx) {
    // only a verified recovery closes it: an 'unverified' check (calendar not maintained) leaves the issue open
    actions.push({ kind: 'close', id: `${r.id}:prices`, number: minePx.number, comment: `Recovered: every price feed carries the ${prices.expected} session at the ${cdmx(NOW)} check. Closing.` });
  }
  if (r.refreshStatus === 'late' && !mine && r.alerts === 0) {
    actions.push({ kind: 'open', id: r.id, title: `SOURCE DOWN: watchdog - ${d.name.en} refresh late`, body: [
      `The scheduled refresh of **${d.name.en}** (https://fnam.mx${d.url}) has not landed since ${cdmx(r.requiredSince)}: the last two scheduled runs failed or did not run.`,
      '',
      '| | |', '|---|---|',
      `| Last scheduled refresh that landed | ${landed ? `${cdmx(landed.run.updated_at)} ([run](${landed.run.html_url}))` : 'none in the run history'} |`,
      `| Last scheduled attempt | ${attempt ? `${cdmx(attempt.updated_at)}, ${attempt.conclusion} ([run](${attempt.html_url}))` : 'none'} |`,
      `| Workflow | ${d.workflows.map((f) => `[\`${f}\`](https://github.com/${REPO}/actions/workflows/${f})`).join(', ')} |`,
      '',
      'The landing page shows this dashboard as "Late" (Retrasado) until a scheduled refresh lands; this issue then closes itself.',
      'Checked every 12 hours by `scripts/watchdog/check.mjs` (`.github/workflows/data-watchdog.yml`); runbook `tools/watchdog/README.md`.',
      '',
      mark(r.id),
    ].join('\n') });
  } else if (r.refreshStatus !== 'late' && mine) {
    actions.push({ kind: 'close', id: r.id, number: mine.number, comment: `Recovered: a scheduled refresh landed at ${cdmx(r.lastSuccess)}. Closing.` });
  }
}
if (NO_ISSUES) {
  console.log(actions.length ? '\nIssues (not touched in this mode):\n' + actions.map((a) => a.kind === 'open' ? `  would open "${a.title}"\n${a.body.split('\n').map((x) => '      ' + x).join('\n')}` : `  would close #${a.number} (${a.id})`).join('\n') : '\nNo issue to open or close.');
} else {
  if (actions.some((a) => a.kind === 'open')) {
    try { await gh(`/repos/${REPO}/labels/${LABEL}`); }
    catch (e) { if (!/HTTP 404/.test(e.message)) throw e; await gh(`/repos/${REPO}/labels`, { method: 'POST', body: { name: LABEL, color: 'b60205', description: 'Data-refresh watchdog: a dashboard refresh is late' } }); }
  }
  for (const a of actions) {
    if (a.kind === 'open') {
      const created = await gh(`/repos/${REPO}/issues`, { method: 'POST', body: { title: a.title, labels: [LABEL], body: a.body } });
      console.log(`Opened issue #${created.number} for ${a.id}.`);
    } else {
      await gh(`/repos/${REPO}/issues/${a.number}/comments`, { method: 'POST', body: { body: a.comment } });
      await gh(`/repos/${REPO}/issues/${a.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
      console.log(`Closed issue #${a.number} for ${a.id}.`);
    }
  }
}
