#!/usr/bin/env node
// Results watch: from each company's results date, checks that its model has the new quarter and starts the refresh that
// harvests the release; keeps checking for three days after it lands; alerts Maintenance when nothing has landed 48 hours
// after the expected date. Runs every three hours on weekdays (.github/workflows/results-watch.yml) and by hand:
//
//   node scripts/lib/results-watch.mjs [--dry-run] [--now <ISO date-time>]
//
// The results calendar lives in each model's data files (the same fields the pages and decks read):
//   GAP, OMA, ASUR, Quálitas  site/<slug>/data/reference.js → calendar.nextResults { q, date, confirmed, source }
//   Gentera                   site/gentera/data/reference.js → company.nextResults { quarter, date, assumed, note }
// A confirmed date (the company's own announcement) is used as given; without one, the date is assumed from the median lag
// between the quarter-end and the release of the same quarter over the last three years (the rule the pages print with "≈").
// Oracle is not in this list: its model has a daily pipeline of its own and tools/oracle/data/calendar.json.
//
// Rule per company (today in Mexico City):
//   due     today ≥ date and financials.js has not got the quarter → dispatch <slug>-refresh.yml (mode filings) unless a run
//           is queued, in progress or started in the last 150 minutes; from the third day without the quarter, open (once)
//           a "MAINTENANCE: <company> <quarter> results not found" issue (label fnam-maintenance) and keep dispatching.
//   landed  the quarter is in financials.js and its release date is at most 3 days old → dispatch once a day (no run in the
//           last 20 hours) so a corrected or restated release is re-read; close the maintenance issue of that quarter if open.
//   waiting anything else → nothing to do; the next date is printed.
// Limitation (documented in tools/results-watch/README.md): the harvesters are incremental by URL, so a release that the
// company replaces at the same URL is not re-read; a release re-issued under a new URL or a new BMV notice is.
import { readFile, appendFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes('--dry-run');
const NOW = arg('--now') ? Date.parse(arg('--now')) : Date.now();
if (!Number.isFinite(NOW)) throw new Error('--now needs an ISO date-time');
const REPO = process.env.GITHUB_REPOSITORY || 'marthavshelton-sys/fnam-debt-monitor';
const TOKEN = process.env.GITHUB_TOKEN || '';
const LABEL = 'fnam-maintenance';

export const COMPANIES = [
  { slug: 'gap', name: 'GAP', fin: 'GAP_FIN', ref: 'GAP_REF', workflow: 'gap-refresh.yml', calendar: (R) => R.calendar && R.calendar.nextResults },
  { slug: 'oma', name: 'OMA', fin: 'OMA_FIN', ref: 'OMA_REF', workflow: 'oma-refresh.yml', calendar: (R) => R.calendar && R.calendar.nextResults },
  { slug: 'asur', name: 'ASUR', fin: 'ASUR_FIN', ref: 'ASUR_REF', workflow: 'asur-refresh.yml', calendar: (R) => R.calendar && R.calendar.nextResults },
  { slug: 'qualitas', name: 'Quálitas', fin: 'Q_FIN', ref: 'Q_REF', workflow: 'qualitas-refresh.yml', calendar: (R) => R.calendar && R.calendar.nextResults },
  { slug: 'gentera', name: 'Gentera', fin: 'G_FIN', ref: 'G_REF', workflow: 'gentera-refresh.yml', calendar: (R) => R.company && R.company.nextResults },
];

// ---- reading the data files (browser globals) ----
async function loadGlobal(path, name) {
  const src = await readFile(new URL(path, ROOT), 'utf8');
  const win = {}; new Function('window', 'document', src)(win, undefined);
  if (!win[name]) throw new Error(`${path} did not define window.${name}`);
  return win[name];
}
const QID = /^(20\d\d)Q([1-4])$/;
const qEnd = (fy, q) => `${fy}-${String(q * 3).padStart(2, '0')}-${q === 1 || q === 4 ? '31' : '30'}`;
const dayNum = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const addDays = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const qLabel = (id) => { const m = QID.exec(id); return `${m[2]}Q${m[1].slice(2)}`; };
const relDate = (q) => q.releaseDate || (q.sources && q.sources.is && q.sources.is.primary !== false && q.sources.is.date) || (q.source && q.source.date) || null;
// today on the Mexico City calendar (results land in the Mexico City trading day)
export const todayCdmx = (ms = NOW) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

export function expected(fin, ref, co, today) {
  const quarters = (fin.quarters || []).filter((q) => QID.test(q.id)).sort((a, b) => a.id.localeCompare(b.id));
  const last = quarters[quarters.length - 1];
  if (!last) return null;
  const [, fy, q] = QID.exec(last.id).map(Number);
  const nq = q === 4 ? { fy: fy + 1, q: 1 } : { fy, q: q + 1 };
  const nqId = `${nq.fy}Q${nq.q}`;
  const cal = co.calendar(ref) || null;
  const calQ = cal && (cal.q || cal.quarter);
  let date = null, kind = 'unknown', source = null;
  if (cal && cal.date && (!calQ || calQ === nqId) && cal.assumed !== true && cal.confirmed !== false) { date = cal.date; kind = 'confirmed'; source = cal.source || null; }
  else if (cal && cal.date && (!calQ || calQ === nqId) && cal.assumed === true) { date = cal.date; kind = 'assumed'; }
  if (!date) {
    const lags = [];
    for (let y = nq.fy - 1; y >= nq.fy - 3; y--) { const qq = quarters.find((x) => x.id === `${y}Q${nq.q}`); const d = qq && relDate(qq); if (d) lags.push(dayNum(d) - dayNum(qEnd(y, nq.q))); }
    if (lags.length) { lags.sort((a, b) => a - b); date = addDays(qEnd(nq.fy, nq.q), lags[Math.floor((lags.length - 1) / 2)]); kind = 'assumed'; }
  }
  const lastRel = relDate(last);
  return { lastQ: last.id, lastRelease: lastRel, nextQ: nqId, date, kind, source, today };
}

export function decide(e, today) {
  if (!e) return { action: 'none', why: 'no quarters in financials.js' };
  const daysSinceLanded = e.lastRelease ? dayNum(today) - dayNum(e.lastRelease) : null;
  if (daysSinceLanded != null && daysSinceLanded >= 0 && daysSinceLanded <= 3) return { action: 'landed', daysSinceLanded, why: `${qLabel(e.lastQ)} landed ${e.lastRelease}; re-reading for corrections` };
  if (!e.date) return { action: 'none', why: `no date for ${qLabel(e.nextQ)} (no calendar entry, no release history)` };
  const daysDue = dayNum(today) - dayNum(e.date);
  if (daysDue < 0) return { action: 'waiting', why: `${qLabel(e.nextQ)} expected ${e.date} (${e.kind})` };
  return { action: 'due', daysDue, alert: daysDue >= 2, why: `${qLabel(e.nextQ)} expected ${e.date} (${e.kind}), ${daysDue} day(s) ago, not in financials.js` };
}

// ---- GitHub ----
async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fnam-results-watch' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`GitHub API ${method} ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}
async function recentRun(workflow, withinMs) {
  if (DRY) return null; // a dry run reads nothing from GitHub and reports what it would do
  const { workflow_runs: runs = [] } = await api(`/actions/workflows/${workflow}/runs?branch=main&per_page=10&exclude_pull_requests=true`);
  const active = runs.find((r) => ['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(r.status));
  if (active) return { reason: `run ${active.id} ${active.status}` };
  const recent = runs.find((r) => NOW - Date.parse(r.created_at) < withinMs);
  return recent ? { reason: `run ${recent.id} started ${recent.created_at}` } : null;
}
async function dispatch(co, why) {
  if (DRY) return `would dispatch ${co.workflow} (mode filings): ${why}`;
  await api(`/actions/workflows/${co.workflow}/dispatches`, { method: 'POST', body: { ref: 'main', inputs: { mode: 'filings' } } });
  return `dispatched ${co.workflow} (mode filings): ${why}`;
}
async function ensureLabel() {
  if (DRY) return;
  try { await api(`/labels/${LABEL}`); } catch (e) { if (!/HTTP 404/.test(e.message)) throw e; if (!DRY) await api('/labels', { method: 'POST', body: { name: LABEL, color: 'b60205', description: 'Maintenance alerts for the company dashboards (results watch)' } }); }
}
async function openIssues() {
  if (DRY) return [];
  return api(`/issues?state=open&labels=${LABEL}&per_page=50`);
}
async function alertMissing(co, e, issues) {
  const title = `MAINTENANCE: ${co.name} ${qLabel(e.nextQ)} results not found (expected ${e.date})`;
  if (issues.some((i) => i.title === title)) return `maintenance issue already open: ${title}`;
  const body = [
    `The ${co.name} model (site/${co.slug}) still shows ${qLabel(e.lastQ)} as its latest quarter. ${qLabel(e.nextQ)} results were expected on ${e.date} (${e.kind}${e.source && e.source.title ? `: ${e.source.title}` : ''}) and nothing has been harvested two days later.`,
    '',
    'What the watch did: dispatched the refresh workflow in filings mode on every check since the expected date.',
    'What to check: the company\'s investor-relations page and the BMV material events (and the SEC 6-K for the NYSE-listed groups); if the release is out, the harvester or the parser needs a repair; if it is not, the calendar entry in reference.js needs the company\'s announced date.',
    '',
    `Opened by the results watch (scripts/lib/results-watch.mjs) on ${new Date(NOW).toISOString()}.`,
  ].join('\n');
  if (DRY) return `would open: ${title}`;
  await api('/issues', { method: 'POST', body: { title, labels: [LABEL], body } });
  return `opened: ${title}`;
}
async function closeLanded(co, e, issues) {
  const prefix = `MAINTENANCE: ${co.name} ${qLabel(e.lastQ)} results not found`;
  const out = [];
  for (const i of issues.filter((i) => i.title.startsWith(prefix))) {
    if (!DRY) {
      await api(`/issues/${i.number}/comments`, { method: 'POST', body: { body: `${qLabel(e.lastQ)} landed on ${e.lastRelease} (financials.js); closed by the results watch.` } });
      await api(`/issues/${i.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
    }
    out.push(`${DRY ? 'would close' : 'closed'} #${i.number}`);
  }
  return out.join('; ');
}

export async function watch({ log = console.log } = {}) {
  const today = todayCdmx();
  const report = [];
  let issues = null;
  const needIssues = async () => { if (!issues) { await ensureLabel(); issues = await openIssues(); } return issues; };
  for (const co of COMPANIES) {
    const row = { company: co.name, slug: co.slug, workflow: co.workflow };
    try {
      const fin = await loadGlobal(`site/${co.slug}/data/financials.js`, co.fin);
      const ref = await loadGlobal(`site/${co.slug}/data/reference.js`, co.ref);
      const e = expected(fin, ref, co, today);
      const d = decide(e, today);
      Object.assign(row, { lastQ: e && e.lastQ, lastRelease: e && e.lastRelease, nextQ: e && e.nextQ, date: e && e.date, kind: e && e.kind, action: d.action, why: d.why, done: [] });
      if (d.action === 'due') {
        const busy = await recentRun(co.workflow, 150 * 6e4);
        row.done.push(busy ? `not dispatched: ${busy.reason}` : await dispatch(co, d.why));
        if (d.alert) row.done.push(await alertMissing(co, e, await needIssues()));
      } else if (d.action === 'landed') {
        const busy = await recentRun(co.workflow, 20 * 36e5);
        row.done.push(busy ? `not dispatched: ${busy.reason}` : await dispatch(co, d.why));
        const closed = await closeLanded(co, e, await needIssues());
        if (closed) row.done.push(closed);
      }
    } catch (err) {
      row.action = 'error'; row.why = String(err.message || err);
    }
    report.push(row);
    log(`${co.name.padEnd(9)} ${String(row.lastQ || '-').padEnd(7)} → ${String(row.nextQ || '-').padEnd(7)} ${String(row.action).padEnd(8)} ${row.why}${row.done && row.done.length ? ' | ' + row.done.join(' | ') : ''}`);
  }
  return { today, now: new Date(NOW).toISOString(), dryRun: DRY, companies: report };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const out = await watch();
  console.log(JSON.stringify(out, null, 1));
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, ['', `### Results watch (${out.today}, Mexico City)`, '| Company | Latest quarter | Next | Expected | Action | Detail |', '|---|---|---|---|---|---|',
      ...out.companies.map((c) => `| ${c.company} | ${c.lastQ || '-'} (${c.lastRelease || '-'}) | ${c.nextQ || '-'} | ${c.date || '-'} (${c.kind || '-'}) | ${c.action} | ${(c.done || []).join('<br>') || c.why} |`), ''].join('\n'));
  }
  if (out.companies.some((c) => c.action === 'error')) process.exit(1);
}
