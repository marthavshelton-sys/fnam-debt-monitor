#!/usr/bin/env node
// What on the American Consumer page is waiting for attention: the worklist of the page's daily scheduled task
// (tools/consumidor/ROUTINE-PROMPT.md). Reads only files of the repository; fetches nothing; writes nothing.
//
//   node scripts/consumidor/pending.mjs            JSON to stdout
//   node scripts/consumidor/pending.mjs --summary  one line per item
//
// companies  a results release stored by the refresh that is newer than the one the curated record was read from
//            (filings the task already judged not to be results are listed in tools/consumidor/routine-state.json -> skipped)
// figures    a curated figure read from a 10-Q or 10-K when the refresh has stored a newer one of the same form
// sources    a source that failed its last run(s); the page shows its last value, labeled as stored
// build      tie-outs of the last build that did not hold (the page keeps its last data until they do)
// overdue    a source stamped with a period older than its publisher's usual calendar allows, with no recent check of the
//            publisher's page on file (data/publisher-checks.json)
// curated    age of the two hand-kept reference files (estimates of the K-shaped section, the Board notes list)
import { RAW, TOOLS, readJson } from './lib/common.mjs';

const SUMMARY = process.argv.includes('--summary');
const cfg = readJson(TOOLS + 'companies.json', { companies: [] });
const kpis = readJson(TOOLS + 'data/companies-kpis.json', { companies: {} });
const index = readJson(RAW + 'releases/index.json', { companies: {} });
const status = readJson(RAW + 'status.json', { sources: {} });
const log = readJson(RAW + 'build-log.json', {});
const state = readJson(TOOLS + 'routine-state.json', {});
const kshape = readJson(TOOLS + 'data/kshape.json', {});
const checks = (readJson(TOOLS + 'data/publisher-checks.json', { checks: {} }) || {}).checks || {};
const today = new Date().toISOString().slice(0, 10);
const days = (d) => (d ? Math.floor((Date.parse(today) - Date.parse(String(d).slice(0, 10))) / 864e5) : null);
const MIN_CHARS = 6000;   // a filing whose exhibits are a page or two announces a date; it is not a results release

const out = { asOf: today, companies: [], figures: [], sources: [], build: { fail: 0, warn: 0, failed: [] }, overdue: [], curated: {} };

for (const c of cfg.companies || []) {
  const k = (kpis.companies || {})[c.ticker], idx = (index.companies || {})[c.ticker];
  if (!idx) continue;
  const skipped = new Set(Object.keys(((state.skipped || {})[c.ticker]) || {}));
  const results = (idx.filings || []).filter((f) => !f.form && f.exhibits.reduce((a, e) => a + (e.chars || 0), 0) >= MIN_CHARS);
  const newer = results.filter((f) => (!k || !k.filed || f.filed > k.filed) && !skipped.has(f.accn)).sort((a, b) => (a.filed < b.filed ? -1 : 1));
  if (newer.length) out.companies.push({ ticker: c.ticker, name: c.name, group: c.group, curatedFrom: k ? k.filed : null, curatedPeriod: k && k.period ? k.period.en : null,
    newer: newer.map((f) => ({ accn: f.accn, filed: f.filed, files: f.exhibits.map((e) => ({ file: e.file, type: e.type, chars: e.chars })) })) });
  // figures read from a quarterly or annual report: a newer report of the same form has been stored
  const latestOf = {};
  for (const f of idx.filings || []) if (f.form === '10-Q' || f.form === '10-K') if (!latestOf[f.form] || f.filed > latestOf[f.form].filed) latestOf[f.form] = f;
  const cited = [];
  const walk = (o, path) => { if (!o || typeof o !== 'object') return; if (o.find && o.filed && o.form && (o.form === '10-Q' || o.form === '10-K')) cited.push({ path, filed: o.filed, form: o.form, label: o.label ? o.label.en : path }); for (const [key, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, path ? `${path}.${key}` : key); };
  walk(k, '');
  for (const x of cited) { const L = latestOf[x.form]; if (L && L.filed > x.filed) out.figures.push({ ticker: c.ticker, name: c.name, figure: x.label, path: x.path, cites: `${x.form} filed ${x.filed}`, newer: { form: L.form, filed: L.filed, file: L.exhibits[0] ? L.exhibits[0].file : null } }); }
}

for (const [id, s] of Object.entries(status.sources || {})) if ((s.failures || 0) > 0) out.sources.push({ id, failures: s.failures, since: s.since || null, error: s.error || null });
if (log.counts) { out.build.fail = log.counts.fail || 0; out.build.warn = log.counts.warn || 0; out.build.failed = (log.checks || []).filter((c) => c.status === 'fail').map((c) => `${c.tag}: ${c.check}`); }
out.overdue = (log.stale || []).map((x) => ({ ...x, lastCheck: checks[x.id] ? checks[x.id].checked : null }));
// a check on file that is about to lapse is due again, so the page never falls back to "no recent update" for want of one
out.recheck = Object.entries(checks).filter(([, c]) => days(c.checked) != null && days(c.checked) >= 30).map(([id, c]) => ({ id, checked: c.checked, latest: c.latest, url: c.url || null }));
out.curated = { kshapeReviewed: kshape.reviewed || null, kshapeAgeDays: days(kshape.reviewed), notesChecked: state.notesChecked || null, notesAgeDays: days(state.notesChecked), lastRun: state.lastRun || null };
out.quiet = !out.companies.length && !out.figures.length && !out.sources.length && !out.build.fail && !out.overdue.length && !out.recheck.length;

if (!SUMMARY) console.log(JSON.stringify(out, null, 1));
else {
  for (const c of out.companies) console.log(`company ${c.ticker}: release filed ${c.newer.map((f) => f.filed).join(', ')} (curated from ${c.curatedFrom || 'nothing'})`);
  for (const f of out.figures) console.log(`figure ${f.ticker}: "${f.figure}" cites ${f.cites}; ${f.newer.form} filed ${f.newer.filed} is stored`);
  for (const s of out.sources) console.log(`source ${s.id}: ${s.failures} failed run(s) since ${s.since}: ${s.error}`);
  for (const b of out.build.failed) console.log(`build: ${b}`);
  for (const o of out.overdue) console.log(`overdue ${o.id}: stamped ${o.asOf}, due by ${o.dueBy}${o.lastCheck ? `, publisher last checked ${o.lastCheck}` : ''}`);
  for (const r of out.recheck) console.log(`recheck ${r.id}: publisher last checked ${r.checked}`);
  console.log(`curated: K-shaped estimates reviewed ${out.curated.kshapeReviewed} (${out.curated.kshapeAgeDays} days); Board notes checked ${out.curated.notesChecked || 'never'}`);
  console.log(out.quiet ? 'nothing pending' : 'work pending');
}
