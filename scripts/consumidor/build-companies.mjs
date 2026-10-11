#!/usr/bin/env node
// "What Companies Report" of the American Consumer page: checks the curated figures and quotes
// (tools/consumidor/data/companies-kpis.json) against the stored text of the results release they cite
// (tools/consumidor/raw/releases/, written by harvest-releases.mjs) and writes site/consumidor/data/companies.js.
//
//   node scripts/consumidor/build-companies.mjs [--check]     (--check: verify only, write nothing)
//
// A record enters the page only when every `find` text of its figures and its quote are in the exhibit of the filing
// dated `filed`, and each figure's number is in its `find` text. A company that fails is left out and listed in
// `problems` (the run fails, so a typo in the curated file never reaches the page). `newerFiling` tells the page that
// the SEC has a later results filing than the one curated, so the reader sees the figures are a quarter behind.
import { readFileSync, existsSync } from 'node:fs';
import { p, TOOLS, RAW, SITE, readJson, writeText, readText } from './lib/common.mjs';

const CHECK = process.argv.includes('--check');
const cfg = readJson(TOOLS + 'companies.json');
const kpis = readJson(TOOLS + 'data/companies-kpis.json');
const index = readJson(RAW + 'releases/index.json', { companies: {} });
if (!cfg || !kpis) { console.error('companies.json or data/companies-kpis.json missing'); process.exit(1); }

// same text on both sides: one space for any run of whitespace, straight quotes and apostrophes, plain hyphen
const norm = (s) => String(s).replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim();
// "3,867" in a release is the number 3867: thousands separators are dropped before a figure is looked for in its text
const plain = (s) => String(s).replace(/(\d),(?=\d{3}(\D|$))/g, '$1');
const numIn = (v, find0) => {
  const find = plain(find0);
  const a = Math.abs(v);
  const forms = new Set([String(a), a.toFixed(1), a.toFixed(2), String(Math.round(a))].filter((f) => Number(f) === a));
  return [...forms].some((f) => new RegExp(`(^|[^0-9.])${f.replace('.', '\\.')}($|[^0-9])`).test(find));
};

// decimals the release itself prints for the figure ("2.0 percent" -> 1, "10%" -> 0), so the page never shows more precision than the source
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
  const filing = idx && (idx.filings || []).find((f) => f.filed === k.filed);
  if (!filing) { problems.push(`${c.ticker}: the release filed ${k.filed} is not stored (stored: ${idx ? idx.filings.map((f) => f.filed).join(', ') : 'none'})`); continue; }
  // texts of a stored filing by exhibit type; a figure may cite another stored filing through its own `filed`
  // (an older release that was the last to state it, or the annual report)
  const cache = {};
  // (a results release and the quarterly report are often filed the same day: `form` says which one, "10-Q", "10-K" or "page")
  const filingOf = (filed, form) => {
    const ck = `${filed}|${form || ''}`;
    if (ck in cache) return cache[ck];
    const fl = (idx.filings || []).find((f) => f.filed === filed && (form ? f.form === form : !f.form)) || (form ? null : (idx.filings || []).find((f) => f.filed === filed));
    if (!fl) return (cache[ck] = null);
    const texts = {};
    for (const e of fl.exhibits) if (existsSync(p(e.file))) texts[e.type] = norm(readFileSync(p(e.file), 'utf8'));
    return (cache[ck] = { texts, urlOf: (type) => (fl.exhibits.find((e) => e.type === type) || fl.exhibits[0] || {}).url || fl.indexUrl, form: fl.form || '8-K', title: fl.title || null, read: fl.read || null });
  };
  const main = filingOf(k.filed);
  const texts = main.texts;
  const first = filing.exhibits[0];
  const bad = [];
  const GIG = { tasks: 1, bookings: 1, users: 1 };   // level, year-earlier level and reported growth, all read from the release
  const metric = (name, m) => {
    if (!m) return null;
    const F = m.filed ? filingOf(m.filed, m.form) : main;
    if (!F) { bad.push(`${name}: the ${m.form || 'filing'} dated ${m.filed} is not stored`); return null; }
    const has = (text) => (m.ex && F.texts[m.ex] != null ? (F.texts[m.ex].includes(norm(text)) ? m.ex : null) : Object.keys(F.texts).find((t) => F.texts[t].includes(norm(text))) || null);
    const ex = has(m.find);
    if (!ex) { bad.push(`${name}: text not found in ${m.ex || 'any exhibit'}${m.filed ? ' of the filing dated ' + m.filed : ''}: "${m.find}"`); return null; }
    if (!numIn(m.v, norm(m.find))) { bad.push(`${name}: ${m.v} is not in its text "${m.find}"`); return null; }
    if ((GIG[name.split(' ')[0]] || /^(us|world) /.test(name)) && m.prev != null && !numIn(m.prev, norm(m.find))) { bad.push(`${name}: the year-earlier ${m.prev} is not in its text "${m.find}"`); return null; }
    if (m.yoy != null) {
      const yt = m.yoyFind || m.find;
      if (m.yoyFind && !has(m.yoyFind)) { bad.push(`${name}: growth text not found: "${m.yoyFind}"`); return null; }
      if (!numIn(m.yoy, norm(yt))) { bad.push(`${name}: the growth ${m.yoy} is not in its text "${yt}"`); return null; }
    }
    if (m.of != null) {   // the company total of the same line, read from its own row
      if (!m.ofFind || !has(m.ofFind)) { bad.push(`${name}: text of the total not found: "${m.ofFind}"`); return null; }
      if (!numIn(m.of, norm(m.ofFind))) { bad.push(`${name}: the total ${m.of} is not in its text "${m.ofFind}"`); return null; }
    }
    const { find, ex: _e, yoyFind: _y, ofFind: _o, ...rest } = m;
    return { ...rest, dp: dpIn(m.v, norm(m.find)), src: F.urlOf(ex), ...(m.filed ? { form: F.form, ...(F.title ? { doc: F.title, read: F.read } : {}) } : {}) };
  };
  const rec = { ticker: c.ticker, name: c.name, group: c.group, period: k.period, periodEnd: k.periodEnd, filed: k.filed, segment: k.segment, url: (first || {}).url || filing.indexUrl };
  for (const key of ['comp', 'traffic', 'ticket', 'sales', 'nco', 'dq30', 'spend', 'tasks', 'bookings', 'users', 'workers', 'workerPay']) if (k[key]) rec[key] = metric(key, k[key]);
  if (k.trafficSign) rec.trafficSign = k.trafficSign;
  if (k.ticketSign) rec.ticketSign = k.ticketSign;
  // gig platforms: what the company reports for the United States (or the narrowest geography that contains it), each
  // figure read from the report it cites; the change from a year earlier is computed here when the text carries both levels
  // (a rate compared with a year earlier is a difference in percentage points, never a percent change; `chgBps` is a change the
  // text itself states in basis points; `world` holds the same kind of list for whole-company figures)
  const figures = (list, tag) => list.map((x, i) => {
    const r = metric(`${tag} ${i + 1}`, x); if (!r) return null;
    if (x.chgBps != null && !numIn(x.chgBps, norm(x.find))) { bad.push(`${tag} ${i + 1}: the change of ${x.chgBps} bps is not in its text "${x.find}"`); return null; }
    if (r.prev != null && r.unit === 'pct') r.chgPp = Math.round((r.v - r.prev) * 100) / 100;
    else if (r.prev != null && r.yoy == null && r.unit !== 'x') { r.yoy = Math.round((r.v / r.prev - 1) * 1000) / 10; r.yoyCalc = true; }
    return r;
  }).filter(Boolean);
  if (k.us) rec.us = figures(k.us, 'us');
  if (k.world) rec.world = figures(k.world, 'world');
  if (k.usNote) rec.usNote = k.usNote;
  if (k.scope && k.scope.find) {   // the sentence that states the geography the company's figures cover
    const F = k.scope.filed ? filingOf(k.scope.filed, k.scope.form) : main;
    if (!F || !Object.keys(F.texts).some((t) => F.texts[t].includes(norm(k.scope.find)))) bad.push(`scope: text not found${k.scope.filed ? ' in the ' + (k.scope.form || 'filing') + ' dated ' + k.scope.filed : ''}: "${k.scope.find}"`);
  }
  if (k.extra) rec.extra = k.extra.map((x, i) => { const r = metric(`extra ${i + 1}`, x); return r && { label: x.label, v: r.v, dp: r.dp, src: r.src }; }).filter(Boolean);
  if (k.quote) {
    const ex = Object.keys(texts).find((t) => texts[t].includes(norm(k.quote.text)));
    if (!ex) bad.push(`quote not found in the release: "${k.quote.text.slice(0, 70)}…"`);
    else rec.quote = { text: k.quote.text, by: k.quote.by || null, role: k.quote.role, src: main.urlOf(ex) };
  }
  if (bad.length) { problems.push(...bad.map((b) => `${c.ticker}: ${b}`)); continue; }
  // a results filing at least 60 days newer than the curated one = a new quarter the curated file does not carry yet
  // (a filing whose exhibits are a page or two is an announcement of a date, not a results release)
  const newer = (idx.filings || []).filter((f) => !f.form && f.exhibits.reduce((a, e) => a + (e.chars || 0), 0) >= 6000).map((f) => f.filed).filter((d) => (Date.parse(d) - Date.parse(k.filed)) / 864e5 >= 60).sort().pop();
  if (newer) rec.newerFiling = newer;
  out.push(rec);
}

for (const pr of problems) console.log(`::error::${pr}`);
console.log(`companies: ${out.length} of ${cfg.companies.filter((c) => c.curated !== false || (kpis.companies[c.ticker] || {}).filed).length} verified against their releases; problems: ${problems.length}`);
if (!CHECK) {
  const data = { reviewed: kpis.reviewed, groups: cfg.groups, companies: out };
  const body = '// What companies report: results-release figures of U.S. consumer companies, each read from the company\'s own Form 8-K exhibit on SEC EDGAR and checked against it.\nwindow.CONS_COMPANIES = ' + JSON.stringify(data) + ';\n';
  if (readText(SITE + 'data/companies.js') !== body) writeText(SITE + 'data/companies.js', body);
}
process.exit(problems.length ? 1 : 0);
