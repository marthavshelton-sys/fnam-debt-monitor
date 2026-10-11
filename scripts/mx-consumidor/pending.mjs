#!/usr/bin/env node
// What on the Mexican Consumer page is waiting for attention: the worklist of the page's daily scheduled task
// (tools/mx-consumidor/ROUTINE-PROMPT.md). Reads only files of the repository; fetches nothing; writes nothing.
//
//   node scripts/mx-consumidor/pending.mjs            JSON to stdout
//   node scripts/mx-consumidor/pending.mjs --summary  one line per item
//
// companies  a results release stored by the refresh that is newer than the one the curated record was read from
//            (filings the task already judged not to be results are listed in tools/mx-consumidor/routine-state.json -> skipped)
// missing    a company of companies.json with no stored release at all (its channel did not answer or lists none)
// sources    a source that failed its last run(s); the page shows its last value, labeled as stored
// build      tie-outs of the last build that did not hold (the page keeps its last data until they do)
// overdue    a source stamped with a period older than its publisher's usual calendar allows, with no recent check of the
//            publisher's page on file (data/publisher-checks.json)
// recheck    a publisher check on file that is 30 days old or more
// editions   the survey editions the page stands on (ENIGH, ENIF, poverty, ENFIH) and when the next one is expected,
//            so a new edition's published check figures (data/enigh-published.json, data/enif-published.json) are added in time
import { RAW, TOOLS, readJson } from './lib/common.mjs';

const SUMMARY = process.argv.includes('--summary');
const cfg = readJson(TOOLS + 'companies.json', { companies: [] });
const kpis = readJson(TOOLS + 'data/companies-kpis.json', { companies: {} });
const index = readJson(RAW + 'releases/index.json', { companies: {} });
const status = readJson(RAW + 'status.json', { sources: {} });
const log = readJson(RAW + 'build-log.json', {});
const state = readJson(TOOLS + 'routine-state.json', {});
const checks = (readJson(TOOLS + 'data/publisher-checks.json', { checks: {} }) || {}).checks || {};
const enigh = (readJson(RAW + 'enigh.json', {}) || {}).data || {};
const enif = (readJson(RAW + 'enif.json', {}) || {}).data || {};
const poverty = (readJson(RAW + 'poverty.json', {}) || {}).data || {};
const pubEnigh = readJson(TOOLS + 'data/enigh-published.json', {}) || {};
const pubEnif = readJson(TOOLS + 'data/enif-published.json', {}) || {};
const today = new Date().toISOString().slice(0, 10);
const days = (d) => (d ? Math.floor((Date.parse(today) - Date.parse(String(d).slice(0, 10))) / 864e5) : null);
const MIN_CHARS = 4000;   // a notice of a page or two announces a date; it is not a results release

const out = { asOf: today, companies: [], missing: [], sources: [], build: { fail: 0, warn: 0, failed: [] }, overdue: [], recheck: [], editions: {} };

for (const c of cfg.companies || []) {
  const k = (kpis.companies || {})[c.ticker], idx = (index.companies || {})[c.ticker];
  const results = idx ? (idx.filings || []).filter((f) => (f.kind || 'results') === 'results' && f.exhibits.reduce((a, e) => a + (e.chars || 0), 0) >= MIN_CHARS) : [];
  if (!results.length) { out.missing.push({ ticker: c.ticker, name: c.name, channel: idx ? idx.channel : null }); continue; }
  const skipped = new Set(Object.keys(((state.skipped || {})[c.ticker]) || {}));
  const newer = results.filter((f) => (!k || !k.filed || f.filed > k.filed) && !skipped.has(f.accn)).sort((a, b) => (a.filed < b.filed ? -1 : 1));
  if (newer.length) out.companies.push({ ticker: c.ticker, name: c.name, group: c.group, channel: idx.channel, curatedFrom: k ? k.filed : null, curatedPeriod: k && k.period ? k.period.en : null,
    newer: newer.map((f) => ({ accn: f.accn, filed: f.filed, title: f.title || null, files: f.exhibits.map((e) => ({ file: e.file, type: e.type, chars: e.chars })) })) });
}

for (const [id, s] of Object.entries(status.sources || {})) if ((s.failures || 0) > 0) out.sources.push({ id, failures: s.failures, since: s.since || null, error: s.error || null });
if (log.counts) { out.build.fail = log.counts.fail || 0; out.build.warn = log.counts.warn || 0; out.build.failed = (log.checks || []).filter((c) => c.status === 'fail').map((c) => `${c.tag}: ${c.check}`); }
if ((log.missing || []).length) out.build.missing = log.missing;
out.overdue = (log.stale || []).map((x) => ({ ...x, lastCheck: checks[x.id] ? checks[x.id].checked : null }));
// a check on file that is about to lapse is due again, so the page never falls back to "no recent update" for want of one
out.recheck = Object.entries(checks).filter(([, c]) => days(c.checked) != null && days(c.checked) >= 30).map(([id, c]) => ({ id, checked: c.checked, latest: c.latest, url: c.url || null }));
// survey editions: the builder needs the publisher's own check figures of an edition before it accepts it
out.editions = {
  enigh: { latest: enigh.latest || null, checkFigures: enigh.latest ? !!(pubEnigh.editions && pubEnigh.editions[String(enigh.latest)]) : null },
  enif: { latest: enif.year || null, checkFigures: enif.year ? String(pubEnif.year) === String(enif.year) : null },
  poverty: { latest: poverty.latest || null },
};
out.needsCheckFigures = ['enigh', 'enif'].filter((k) => out.editions[k].checkFigures === false);
out.curated = { companiesReviewed: kpis.reviewed || null, lastRun: state.lastRun || null, open: state.open || [] };
out.quiet = !out.companies.length && !out.missing.length && !out.sources.length && !out.build.fail && !out.overdue.length && !out.recheck.length && !out.needsCheckFigures.length && !(out.curated.open || []).length;

if (!SUMMARY) console.log(JSON.stringify(out, null, 1));
else {
  for (const c of out.companies) console.log(`company ${c.ticker}: release filed ${c.newer.map((f) => f.filed).join(', ')} (curated from ${c.curatedFrom || 'nothing'})`);
  for (const m of out.missing) console.log(`no stored release: ${m.ticker} (${m.channel || 'never read'})`);
  for (const s of out.sources) console.log(`source ${s.id}: ${s.failures} failed run(s) since ${s.since}: ${s.error}`);
  for (const b of out.build.failed) console.log(`build: ${b}`);
  for (const o of out.overdue) console.log(`overdue ${o.id}: stamped ${o.asOf}, due by ${o.dueBy}${o.lastCheck ? `, publisher last checked ${o.lastCheck}` : ''}`);
  for (const r of out.recheck) console.log(`recheck ${r.id}: publisher last checked ${r.checked}`);
  for (const k of out.needsCheckFigures) console.log(`edition ${k} ${out.editions[k].latest}: the publisher's check figures are not on file`);
  console.log(`editions: ENIGH ${out.editions.enigh.latest}, ENIF ${out.editions.enif.latest}, poverty ${out.editions.poverty.latest}; company figures reviewed ${out.curated.companiesReviewed}`);
  console.log(out.quiet ? 'nothing pending' : 'work pending');
}
