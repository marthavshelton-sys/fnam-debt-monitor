// Hyperscaler Hub: the curated modules Power (2), Circular (4) and Payoff (5), plus the scope notes. Runs after build.mjs.
// Reads the curated files in tools/hyperscalers/data/ (power, circular, payoff, scope) and the harvested filing passages in
// raw/notes/ of the covered companies and of the Circular counterparties. For every filing citation it resolves the key
// "<TICKER> <form> <period end>" to the accession and URL and checks that the quoted sentence appears in the harvested text
// of the cited page ("quote matched"); that check is mechanical and does not replace the second reading that turns
// "needs review" into "verified".
// Writes site/hiperescaladores/data/{power,circular,payoff,scope}.js, the module CSVs and data/modules-log.json.
import { readdir } from 'node:fs/promises';
import { readJson, writeJson, writeText, TOOLS, SITE, nowET, scrubProvenance } from './lib.mjs';

const { companies, counterparties = [] } = await readJson(TOOLS + 'companies.json');
const COVERED = new Set(companies.map((c) => c.ticker));
const power = await readJson(TOOLS + 'data/power.json');
const circ = await readJson(TOOLS + 'data/circular.json');
const pay = await readJson(TOOLS + 'data/payoff.json', null);
const scope = await readJson(TOOLS + 'data/scope.json', { notes: [] });
const finSrc = await import('node:fs/promises').then((m) => m.readFile(SITE + 'data/financials.js', 'utf8'));
const FIN = JSON.parse(finSrc.slice(finSrc.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
// one refresh time per build: the stamp build.mjs wrote into financials.js (owner's third review: the page header and
// the footers used to show two different times because each script took its own clock reading)
const stamp = FIN.generated && FIN.refreshedET ? { iso: FIN.generated, et: FIN.refreshedET } : nowET();

// ---- harvested filings: key -> { form, accn, url, filed, report, pages: { page: [text…] } }, covered companies and counterparties
const FILINGS = {};
for (const c of [...companies, ...counterparties]) {
  let files = [];
  try { files = await readdir(`${TOOLS}raw/notes/${c.ticker}`); } catch { continue; }
  for (const f of files) {
    const j = await readJson(`${TOOLS}raw/notes/${c.ticker}/${f}`);
    const pages = {};
    for (const h of j.hits) (pages[h.page] ||= []).push(h.text);
    FILINGS[`${c.ticker} ${j.form} ${j.report}`] = { ticker: c.ticker, form: j.form, accn: j.accn, url: j.url, filed: j.filed, report: j.report, harvested: j.harvested, pages };
  }
}
const norm = (s) => String(s || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[\s ​]+/g, ' ').replace(/\s+([%,.)])/g, '$1').replace(/([$€£])\s+/g, '$1').trim().toLowerCase();
const problems = [];
function resolve(src, where) {
  if (!src || !src.k) return null;
  const f = FILINGS[src.k];
  if (!f) { problems.push({ where, k: src.k, issue: 'filing not harvested' }); return { ...src, tier: 'T1', quoteCheck: 'no_harvest' }; }
  const q = norm(src.quote);
  let check = 'not_found', foundOn = null;
  if (q && (f.pages[src.page] || []).some((t) => norm(t).includes(q))) check = 'page';
  else if (q) for (const [p, ts] of Object.entries(f.pages)) if (ts.some((t) => norm(t).includes(q))) { check = 'other_page'; foundOn = p; break; }
  if (check !== 'page') problems.push({ where, k: src.k, page: src.page, issue: check === 'other_page' ? `quote found on harvested page ${foundOn}` : 'quote not found in harvested text' });
  const printed = /^seq/.test(String(src.page)) ? null : src.page;
  return { k: src.k, tier: 'T1', form: f.form, accn: f.accn, url: f.url, filed: f.filed, report: f.report, page: printed, pageSeq: printed ? null : String(src.page).replace('seq', ''), section: src.section, quote: src.quote, quoteCheck: check, foundOn };
}
const SRC_KEYS = ['src', 'src2', 'src3', 'src4', 'ownershipSrc', 'gpuSrc', 'valueSrc', 'definitionSrc'];
function resolveAll(obj, where) {
  for (const key of SRC_KEYS) if (obj[key] && obj[key].k) obj[key] = resolve(obj[key], `${where}.${key}`);
  // the item's review state travels with each of its citations, so every source card says how it was verified and when
  // (verifiedHow: automated; the ET instant); reviewedBy (an analyst's sign-off) is a separate field, null until a person
  // signs. Who or what performed the reading stays in the curated file (scrubProvenance strips it before the write).
  if (obj.status) { if (!('reviewedBy' in obj)) obj.reviewedBy = null; for (const key of SRC_KEYS) if (obj[key]) Object.assign(obj[key], { status: obj.status, verifiedHow: obj.status === 'verified' ? 'automated' : null, verifiedOn: obj.verifiedOn || null, reviewedBy: obj.reviewedBy || null, reviewedOn: obj.reviewedOn || null }); }
  return obj;
}
// a curated file edited after this build started would print a later time than the build: say so in the log
for (const [name, obj] of [['power', power], ['circular', circ], ['payoff', pay || {}], ['scope', scope]])
  if (obj.updatedAt && obj.updatedAt > stamp.iso) problems.push({ where: name + '.json', issue: `updatedAt ${obj.updatedAt} is after the build time ${stamp.iso}` });

// ---- Power
for (const [i, d] of power.companyDeals.entries()) if (d.src && d.src.k) d.src = resolve(d.src, `power.companyDeals[${i}]`); else if (d.src) d.src = { ...d.src, tier: d.tier };
for (const [i, s] of power.searched.entries()) if (s.src) s.src = resolve(s.src, `power.searched[${i}]`);
const powerOut = { generated: stamp.iso, refreshedET: stamp.et, updated: power.updated, updatedAt: power.updatedAt || null, companyDeals: power.companyDeals, searched: power.searched, grid: power.grid };

// ---- Circular: revenue shares computed from T1 revenue (fiscal year or trailing four quarters ending at the flow date); only a
// covered company has XBRL revenue in the hub, so a share "of" a counterparty stays as the filing discloses it
function revenueAt(tk, period, asOf) {
  const c = FIN.companies[tk]; if (!c) return null;
  const q = c.quarters.filter((x) => x.ttm && x.ttm.revenue != null && x.end <= asOf).pop();
  return q ? { v: q.ttm.revenue, id: q.id, end: q.end, tag: (c.quarters.find((x) => x.id === q.id).m.revenue || [])[1] } : null;
}
for (const [i, f] of circ.flows.entries()) {
  if (f.src && f.src.k) f.src = resolve(f.src, `circular.flows[${i}]`);
  if (!f.tier) f.tier = f.src ? 'T1' : 'T2';
  if (f.shareOf && f.shareOf.calc && f.amountUSDm != null) {
    const r = revenueAt(f.shareOf.of, f.period, f.asOf);
    if (r) Object.assign(f.shareOf, { pct: Math.round(f.amountUSDm * 1e6 / r.v * 1000) / 10, revenue: r.v, revenuePeriod: r.id, revenueTag: r.tag, method: `${f.amountUSDm} m / ${(r.v / 1e6).toFixed(0)} m revenue (${r.id}, XBRL)` });
  }
}
for (const [i, c] of circ.concentration.entries()) {
  if (c.src) c.src = resolve(c.src, `circular.concentration[${i}]`);
  if (c.calcRevenue) { const f = circ.flows.find((x) => x.id === c.flow); if (f && f.shareOf && f.shareOf.pct != null) { c.pct = f.shareOf.pct; c.calcMethod = f.shareOf.method; } }
  if (c.calc) { c.pct = Math.round(c.calc.num / c.calc.den * 1000) / 10; c.calcMethod = `${c.calc.num} / ${c.calc.den}`; }
}
const circOut = { generated: stamp.iso, refreshedET: stamp.et, updated: circ.updated, updatedAt: circ.updatedAt || null, nodes: circ.nodes, flows: circ.flows, concentration: circ.concentration, inferences: circ.inferences, breakers: circ.breakers };

// ---- Payoff: payoff and cost of money (curated, T1 text items; FWP term sheets read twice by the automated pipeline; T4 kept apart)
let payOut = null;
if (pay) {
  for (const k of ['segments', 'rpoTiming', 'usefulLives']) for (const [i, x] of (pay[k] || []).entries()) resolveAll(x, `payoff.${k}[${i}]`);
  const TS = Object.fromEntries((pay.termSheets || []).map((t) => [t.id, t]));
  for (const r of pay.ratings || []) for (const it of r.items) {
    if (it.termSheet) {
      const t = TS[it.termSheet];
      if (!t) { problems.push({ where: `payoff.ratings.${r.ticker}`, issue: `unknown term sheet ${it.termSheet}` }); continue; }
      it.src = { tier: 'T1', form: t.form, accn: t.accn, url: t.url, filed: t.date, section: 'Pricing term sheet', quote: t.ratingsText, status: t.status, verifiedHow: t.status === 'verified' ? 'automated' : null, verifiedOn: t.verifiedOn, reviewedBy: t.reviewedBy || null };
    }
  }
  for (const t of pay.termSheets || []) if (!('reviewedBy' in t)) t.reviewedBy = null;
  // earnings calendar: newest FactSet calendar snapshot (pulled outside the automated run; FactSet is not available on the
  // runner), covered companies only. pulledAt is a UTC instant; the page prints it in ET.
  const fsDir = 'tools/hyperscalers/raw/factset/';
  const calFiles = (await readdir(fsDir).catch(() => [])).filter((f) => /^\d{4}-\d{2}-\d{2}-calendar\.json$/.test(f)).sort();
  const cal = calFiles.length ? await readJson(fsDir + calFiles.at(-1)) : null;
  payOut = { generated: stamp.iso, refreshedET: stamp.et, updated: pay.updated, updatedAt: pay.updatedAt || null, segments: pay.segments, noCloudSegment: pay.noCloudSegment, aiRevenue: pay.aiRevenue,
    rpoTiming: pay.rpoTiming, rpoSearched: pay.rpoSearched, usefulLives: pay.usefulLives, ratings: pay.ratings,
    termSheets: pay.termSheets, segmentNote_es: pay.segmentNote_es || null, segmentNote_en: pay.segmentNote_en || null,
    calendar: cal ? { pulledAt: cal.pulledAt, source: cal.source, note: cal.note, events: (cal.events || []).filter((e) => COVERED.has(e.ticker)) } : null };
}

// ---- write
async function js(file, name, data, comment) { await writeText(`${SITE}data/${file}.js`, `// ${comment}\n// Generated by scripts/hyperscalers/build-modules.mjs — do not hand-edit.\nwindow.${name} = ${JSON.stringify(scrubProvenance(data))};\n`); }
await js('power', 'HYP_POWER', powerOut, 'Hyperscaler Hub module 2: company power deals (T1/T2) kept apart from grid projections (T3 regulators, T4 estimates).');
if (payOut) await js('payoff', 'HYP_PAY', payOut, 'Hyperscaler Hub module 5: segment results, backlog timing, useful lives, ratings and new-issue spreads (T1 filings and term sheets); third-party rating reports (T4) kept apart; FactSet earnings calendar (dated snapshot).');
await js('scope', 'HYP_SCOPE', { generated: stamp.iso, refreshedET: stamp.et, updated: scope.updated, updatedAt: scope.updatedAt || null, notes: scope.notes }, 'Hyperscaler Hub: figures that look alike across modules but measure different scopes, and why they differ.');
await js('circular', 'HYP_CIRC', circOut, 'Hyperscaler Hub module 4: money flows between the covered clouds, chip makers, AI labs and the counterparty neoclouds and developers (T1: SEC filings of a covered company or of the counterparty itself).');

const csv = (rows) => rows.map((r) => r.map((v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n') + '\n';
const cite = (s) => s ? [s.tier || '', s.form || s.title || '', s.accn || '', s.page || (s.pageSeq ? 'seq ' + s.pageSeq : ''), s.url || '', s.quote || ''] : ['', '', '', '', '', ''];
const CH = ['tier', 'filing_or_source', 'accession', 'page', 'url', 'quote'];
await writeText(`${SITE}csv/power-company-deals.csv`, csv([['ticker', 'counterparty', 'asset', 'source_type', 'mw', 'mw_basis', 'usd_m', 'usd_basis', 'term_years', 'announced', 'is_goal', 'in_filing', ...CH, 'refreshed_et'],
  ...power.companyDeals.map((d) => [d.ticker, d.counterparty || d.counterparty_en, d.asset || d.asset_en, d.source_type, d.mw, d.mwBasis_en || '', d.usdM, d.usdBasis_en || '', d.termYears || '', d.announced, d.isGoal ? 'yes' : 'no', d.inFiling ? 'yes' : 'no', ...cite(d.src), stamp.et])]));
await writeText(`${SITE}csv/power-grid.csv`, csv([['id', 'tier', 'publisher', 'title', 'edition', 'edition_date', 'next_expected', 'label', 'value', 'value_high', 'unit', 'note', 'url', 'page', 'refreshed_et'],
  ...power.grid.flatMap((g) => g.values.map((v) => [g.id, g.tier, g.publisher, g.title_en, g.edition, g.editionDate, g.nextExpected || '', v.label_en, v.v, v.vHigh || '', v.unit, v.note_en || '', g.url, g.page, stamp.et]))]));
await writeText(`${SITE}csv/circular-flows.csv`, csv([['id', 'from', 'to', 'type', 'amount_usd_m', 'basis', 'as_of', 'mw', 'share_of', 'share_pct', 'share_disclosed_or_calc', 'accounting', ...CH, 'refreshed_et'],
  ...circ.flows.map((f) => [f.id, f.from, f.to, f.type, f.amountUSDm, f.basis, f.asOf, f.mw || '', f.shareOf ? f.shareOf.of : '', f.shareOf ? f.shareOf.pct : '', f.shareOf ? (f.shareOf.disclosed ? 'disclosed' : 'FNAM calculation: ' + (f.shareOf.method || '')) : '', f.accounting_en, ...(f.src ? cite(f.src) : ['T2', f.srcT2 ? f.srcT2.title_en : '', '', '', '', '']), stamp.et])]));

if (payOut) {
  await writeText(`${SITE}csv/payoff-segments.csv`, csv([['ticker', 'segment', 'basis', 'period', 'period_end', 'revenue_usd_m', 'operating_income_usd_m', 'method', ...CH, 'status', 'refreshed_et'],
    ...payOut.segments.map((x) => { const c = x.calc; const rev = c ? c.fy.revenue - c.ytdPrev.revenue + c.ytd.revenue : x.revenue; const oi = c ? (c.fy.opIncome != null ? c.fy.opIncome - c.ytdPrev.opIncome + c.ytd.opIncome : '') : x.opIncome;
      return [x.ticker, x.segment_en, x.basis, x.period, x.end, rev, oi, c ? `${c.fy.label} - ${c.ytdPrev.label} + ${c.ytd.label} (FNAM calculation)` : 'as reported', ...cite(x.src), x.status, stamp.et]; })]));
  await writeText(`${SITE}csv/payoff-credit.csv`, csv([['ticker', 'kind', 'agency_or_tranche', 'value', 'outlook', 'as_of', 'tier', 'source', 'url', 'refreshed_et'],
    ...payOut.ratings.flatMap((r) => r.items.map((it) => [r.ticker, 'rating', it.agency, it.rating, it.outlook_en || '', it.asOf, it.tier, it.src ? (it.src.form ? `${it.src.form} ${it.src.accn}` : it.src.title) : '', it.src ? it.src.url : '', stamp.et])),
    ...payOut.termSheets.map((t) => [t.ticker, 'new-issue spread', `${t.tenYear.coupon}% notes due ${t.tenYear.maturity}`, t.tenYear.spreadBps + ' bps', '', t.date, 'T1', `${t.form} ${t.accn}`, t.url, stamp.et])]));
}
await writeJson(TOOLS + 'data/modules-log.json', { problems });
console.log(`build-modules: power ${power.companyDeals.length} deals / ${power.grid.length} grid sources, circular ${circ.flows.length} flows, payoff ${payOut ? payOut.segments.length + payOut.rpoTiming.length + payOut.usefulLives.length + payOut.termSheets.length : 0} text items; ${problems.length} citation issues`);
for (const p of problems) console.log('  ', JSON.stringify(p));
