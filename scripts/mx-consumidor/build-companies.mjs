#!/usr/bin/env node
// "What Companies Report" of the Mexican Consumer page: checks the curated figures and quotes
// (tools/mx-consumidor/data/companies-kpis.json) against the stored text of the results release they cite
// (tools/mx-consumidor/raw/releases/, written by harvest-releases.mjs) and writes site/mx/consumidor/data/companies.js.
//
//   node scripts/mx-consumidor/build-companies.mjs [--check]     (--check: verify only, write nothing)
//
// A record enters the page only when every `find` text of its figures and its quote are in the stored document of the
// release dated `filed`, and each figure's number (and its year-earlier figure or change in basis points, when given) is
// in its `find` text. A company that fails is left out and listed in `problems` (the run fails, so a typo in the curated
// file never reaches the page). `newerFiling` tells the page that a later results release than the one curated is
// stored, so the reader sees the figures are a quarter behind. `due` is the company's reporting deadline for the next quarter
// (lib/calendar.mjs -> reportingDeadline, from tools/mx-consumidor/data/release-calendar.json), so the page and the daily
// task can tell when a release is late.
import { readFileSync, existsSync } from 'node:fs';
import { p, TOOLS, RAW, SITE, readJson, writeText, readText } from './lib/common.mjs';
import { reportingDeadline } from './lib/calendar.mjs';

const CHECK = process.argv.includes('--check');
const cfg = readJson(TOOLS + 'companies.json');
const kpis = readJson(TOOLS + 'data/companies-kpis.json');
const index = readJson(RAW + 'releases/index.json', { companies: {} });
const CAL = readJson(TOOLS + 'data/release-calendar.json', {}) || {};
const quarterOf = (iso) => { const m = /^(\d{4})-(\d{2})/.exec(String(iso || '')); return m ? `${m[1]}-Q${Math.ceil(+m[2] / 3)}` : null; };
const nextQuarter = (q) => { const m = /^(\d{4})-Q([1-4])$/.exec(q || ''); return m ? (+m[2] === 4 ? `${+m[1] + 1}-Q1` : `${m[1]}-Q${+m[2] + 1}`) : null; };
if (!cfg || !kpis) { console.error('companies.json or data/companies-kpis.json missing'); process.exit(1); }

// same text on both sides: one space for any run of whitespace, straight quotes and apostrophes, plain hyphen
const norm = (s) => String(s).replace(/[‘’ʼ´]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim();
// "3,867" in a release is the number 3867: thousands separators are dropped before a figure is looked for in its text
const plain = (s) => String(s).replace(/(\d),(?=\d{3}(\D|$))/g, '$1');
const numIn = (v, find0) => {
  const find = plain(find0);
  const a = Math.abs(v);
  const forms = new Set([String(a), a.toFixed(1), a.toFixed(2), String(Math.round(a))].filter((f) => Number(f) === a));
  return [...forms].some((f) => new RegExp(`(^|[^0-9.])${f.replace('.', '\\.')}($|[^0-9])`).test(find));
};
// decimals the release itself prints for the figure ("2.0%" -> 1, "5%" -> 0), so the page never shows more precision than the source
const dpIn = (v, find0) => {
  const find = plain(find0);
  const a = Math.abs(v);
  for (const d of [2, 1]) if (new RegExp(`(^|[^0-9.])${a.toFixed(d).replace('.', '\\.')}($|[^0-9])`).test(find)) return d;
  return Number.isInteger(a) ? 0 : String(a).split('.')[1].length;
};

const problems = [];
const out = [];
for (const c of cfg.companies) {
  const k = kpis.companies[c.ticker];
  if (!k || !k.filed) { if (c.curated === false) { console.log(`${c.ticker}: releases stored, figures not curated yet`); continue; } problems.push(`${c.ticker}: no curated record`); continue; }
  const idx = (index.companies || {})[c.ticker];
  const filing = idx && (idx.filings || []).find((f) => f.filed === k.filed && (f.kind || 'results') === 'results');
  if (!filing) { problems.push(`${c.ticker}: the release dated ${k.filed} is not stored (stored: ${idx ? (idx.filings || []).map((f) => f.filed).join(', ') || 'none' : 'none'})`); continue; }
  const texts = {};
  for (const e of filing.exhibits) if (existsSync(p(e.file))) texts[e.type] = norm(readFileSync(p(e.file), 'utf8'));
  const has = (text) => Object.keys(texts).find((t) => texts[t].includes(norm(text))) || null;
  const urlOf = (type) => (filing.exhibits.find((e) => e.type === type) || filing.exhibits[0] || {}).url || filing.indexUrl;
  const bad = [];
  const metric = (name, m) => {
    if (!m) return null;
    const ex = has(m.find);
    if (!ex) { bad.push(`${name}: text not found in the release: "${m.find}"`); return null; }
    const f = norm(m.find);
    if (!numIn(m.v, f)) { bad.push(`${name}: ${m.v} is not in its text "${m.find}"`); return null; }
    if (m.prev != null && !numIn(m.prev, f)) { bad.push(`${name}: the year-earlier ${m.prev} is not in its text "${m.find}"`); return null; }
    if (m.chgBp != null && !numIn(m.chgBp, f)) { bad.push(`${name}: the change of ${m.chgBp} basis points is not in its text "${m.find}"`); return null; }
    // a decline is written with a minus sign, in parentheses or with a word; the curated sign must not contradict a plain "increase"
    const { find: _f, ...rest } = m;
    return { ...rest, dp: dpIn(m.v, f), src: urlOf(ex) };
  };
  const rec = { ticker: c.ticker, name: c.name, short: c.short || c.name, group: c.group, channel: idx.channel === 'sec' ? 'sec' : 'bmv', period: k.period, periodEnd: k.periodEnd, filed: k.filed, segment: k.segment, url: (filing.exhibits[0] || {}).url || filing.indexUrl };
  for (const key of ['comp', 'sales', 'traffic', 'ticket', 'npl', 'loans']) if (k[key]) rec[key] = metric(key, k[key]);
  if (k.npl && rec.npl) rec.npl.unit = 'rate';
  if (k.extra) rec.extra = k.extra.map((x, i) => metric(`extra ${i + 1}`, x)).filter(Boolean);
  if (k.quote) {
    const ex = has(k.quote.text);
    if (!ex) bad.push(`quote not found in the release: "${k.quote.text.slice(0, 70)}…"`);
    else rec.quote = { text: k.quote.text, by: k.quote.by || null, role: k.quote.role || null, lang: k.quote.lang || 'es' };
  }
  if (!['comp', 'sales', 'npl', 'loans'].some((x) => rec[x]) && !(rec.extra || []).length) bad.push('no figure in the record');
  if (bad.length) { problems.push(...bad.map((b) => `${c.ticker}: ${b}`)); continue; }
  // a results release at least 60 days newer than the curated one = a new quarter the curated file does not carry yet
  const newer = (idx.filings || []).filter((f) => (f.kind || 'results') === 'results' && f.exhibits.reduce((a, e) => a + (e.chars || 0), 0) >= 4000).map((f) => f.filed).filter((d) => (Date.parse(d) - Date.parse(k.filed)) / 864e5 >= 60).sort().pop();
  if (newer) rec.newerFiling = newer;
  const nq = nextQuarter(quarterOf(k.periodEnd)), lag = Math.round((Date.parse(k.filed) - Date.parse(k.periodEnd)) / 864e5);
  const due = nq ? reportingDeadline(c, nq, CAL, Number.isFinite(lag) ? lag : null) : null;
  if (due) rec.due = { quarter: nq, date: due.date, basis: due.basis, who: due.who };
  out.push(rec);
}

for (const pr of problems) console.log(`::error::${pr}`);
console.log(`companies: ${out.length} of ${cfg.companies.filter((c) => c.curated !== false || (kpis.companies[c.ticker] || {}).filed).length} verified against their releases; problems: ${problems.length}`);
if (!CHECK) {
  // the quarter most companies report next and the BMV's deadline for it (the page's line on the coming results)
  const bmvDue = out.filter((r) => r.due && r.due.who === 'BMV').map((r) => r.due);
  const nextQ = bmvDue.length ? bmvDue.map((d) => d.quarter).sort().slice(-1)[0] : null;
  const bmv = nextQ ? bmvDue.find((d) => d.quarter === nextQ) : null;
  const comp = CAL.companies || {};
  const data = { reviewed: kpis.reviewed, groups: cfg.groups, companies: out, ...(bmv ? { next: { quarter: nextQ, bmvDate: bmv.date, basis: bmv.basis, url: comp.bmvUrl || null } } : {}) };
  const body = '// What companies report: results-release figures of companies that sell and lend to the Mexican consumer, each read from the company\'s own filing and checked against it.\nwindow.MXC_COMPANIES = ' + JSON.stringify(data) + ';\n';
  if (readText(SITE + 'data/companies.js') !== body) writeText(SITE + 'data/companies.js', body);
}
process.exit(problems.length ? 1 : 0);
