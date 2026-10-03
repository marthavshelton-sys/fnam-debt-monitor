// Hyperscaler Hub: builds the module data from the stored EDGAR extracts.
//   in : tools/hyperscalers/companies.json, data/xbrl/<TICKER>.json, data/filings.json, data/state.json,
//        data/debt-instruments.json (FactSet snapshot, optional), data/metrics.json (previous build, for the diff)
//   out: site/hiperescaladores/data/{financials,companies,changelog}.js, site/hiperescaladores/csv/*.csv,
//        tools/hyperscalers/data/{metrics,changelog,derivations}.json
//
// Accounting rules applied here (methodology page states them):
// * 10-Q cash flows are year-to-date: a quarter is the 3-month fact when the filing tags one; otherwise YTD(n) −
//   YTD(n−1) from the same tag, and Q4 = fiscal year − nine months. The method and both accessions are kept.
// * A fact restated in a later filing (10-K/A, recast comparatives) is replaced by the latest-filed value; the old
//   value and accession are written to the change log as "restated".
// * Trailing twelve-month facts some companies tag (Amazon) are recognised by their start date and never read as
//   fiscal years.
// * Nothing is imputed: a missing input leaves the derived figure null ("Not disclosed").
import { readdir } from 'node:fs/promises';
import { readJson, writeJson, writeText, TOOLS, SITE, ROOT, fiscalOf, durQ, days, nowET, filingIndexUrl } from './lib.mjs';
import { TAGS, FLOW, INSTANT } from './tags.mjs';

const FIRST_FY_END = '2022-06-01';   // history kept from fiscal 2023 quarters onward (≥ 3 years)
const { companies } = await readJson(TOOLS + 'companies.json');
const filings = await readJson(TOOLS + 'data/filings.json', { companies: {} });
const state = await readJson(TOOLS + 'data/state.json', {});
const prevMetrics = await readJson(TOOLS + 'data/metrics.json', null);
const prevLog = await readJson(TOOLS + 'data/changelog.json', { entries: [] });
// latest FactSet debt snapshot (tools/hyperscalers/raw/factset/<date>-debt.json, pulled in a Claude session)
const fsDir = new URL('tools/hyperscalers/raw/factset/', ROOT);
const fsFiles = (await readdir(fsDir).catch(() => [])).filter((f) => /^\d{4}-\d{2}-\d{2}-debt\.json$/.test(f)).sort();
const debtSnap = fsFiles.length ? { file: `tools/hyperscalers/raw/factset/${fsFiles.at(-1)}`, ...(await readJson(`tools/hyperscalers/raw/factset/${fsFiles.at(-1)}`)) } : null;
const guidance = await readJson(TOOLS + 'data/guidance.json', null);
const offbsCur = await readJson(TOOLS + 'data/offbs.json', { items: [], searched: [] });
const orclOblig = await readJson('tools/oracle/data/obligations.json', null);
const stamp = nowET();
const warnings = [];
const restated = [];

const short = (t) => t.replace(/^us-gaap:/, '');

// latest-filed fact per (start,end); earlier different values are recorded as restatements
function dedupe(ticker, tag, facts) {
  const by = new Map();
  for (const f of facts.slice().sort((a, b) => a.d.localeCompare(b.d) || a.a.localeCompare(b.a))) {
    const k = `${f.s || ''}|${f.e}`;
    const old = by.get(k);
    if (old && old.v !== f.v && old.a !== f.a) restated.push({ ticker, tag: short(tag), start: f.s, end: f.e, old: old.v, oldAccn: old.a, value: f.v, accn: f.a, filed: f.d });
    by.set(k, f);
  }
  return [...by.values()];
}

function flowQuarters(ticker, fyEnd, xb, tag) {
  const node = xb.facts[tag];
  if (!node) return {};
  const facts = dedupe(ticker, tag, node.facts).filter((f) => f.s);
  const q1 = {};            // end -> 3-month fact
  const ytd = {};           // fiscal-year id -> {k: fact}
  for (const f of facts) {
    const k = durQ(f.s, f.e);
    if (!k) continue;
    const fi = fiscalOf(f.e, fyEnd);
    if (k === 1) q1[f.e] = f;
    if (fi.q !== k) continue;                    // TTM or other non-YTD spans
    (ytd[fi.fy] ||= {})[k] = f;
  }
  const out = {};
  const put = (end, v, method, accns, f) => {
    const fi = fiscalOf(end, fyEnd);
    out[fi.id] = { v, t: short(tag), a: accns, m: method, end, form: f.f, filed: f.d };
  };
  for (const f of Object.values(q1)) put(f.e, f.v, 'reported', [f.a], f);
  for (const [fy, ks] of Object.entries(ytd)) {
    for (const k of [2, 3, 4]) {
      const cur = ks[k], prev = ks[k - 1];
      if (!cur) continue;
      const id = `FY${fy}Q${k}`;
      if (out[id]) {        // a 3-month fact exists: check it against the YTD difference when both are available
        if (prev && cur.e >= FIRST_FY_END) {
          const d = cur.v - prev.v;
          if (Math.abs(d - out[id].v) > Math.max(1e6, Math.abs(d) * 0.005)) out[id].review = true, warnings.push({ ticker, check: `${short(tag)} ${id}: 3-month fact ${out[id].v} vs YTD difference ${d}`, status: 'warn' });
        }
        continue;
      }
      if (prev) put(cur.e, cur.v - prev.v, k === 4 ? 'fy_minus_9m' : 'ytd_subtraction', [cur.a, prev.a], cur);
    }
  }
  // fiscal-year totals (for the tie-out and the annual view)
  const fyTot = {};
  for (const [fy, ks] of Object.entries(ytd)) if (ks[4]) fyTot[`FY${fy}`] = { v: ks[4].v, t: short(tag), a: [ks[4].a], end: ks[4].e, form: ks[4].f, filed: ks[4].d };
  return { q: out, fy: fyTot };
}

function instantAt(ticker, xb, recipes, ends) {
  const val = {};
  const latest = (tag) => {
    const node = xb.facts[tag];
    if (!node) return {};
    const m = {};
    for (const f of dedupe(ticker, tag, node.facts)) if (!f.s) m[f.e] = f;
    return m;
  };
  const cache = {};
  const get = (tag) => (cache[tag] ||= latest(tag));
  for (const e of ends) {
    for (const r of recipes) {
      const req = r.req.map((t) => get(t)[e]);
      if (req.some((x) => !x)) continue;
      const opt = (r.opt || []).map((t) => get(t)[e]).filter(Boolean);
      const parts = [...req, ...opt];
      val[e] = { v: parts.reduce((s, f) => s + f.v, 0), t: [...r.req, ...(r.opt || []).filter((t) => get(t)[e])].map(short).join(' + '), a: [...new Set(parts.map((f) => f.a))], m: 'reported', end: e, form: parts[0].f, filed: parts.map((f) => f.d).sort().pop() };
      break;
    }
  }
  return val;
}

const out = { generated: stamp.iso, refreshedET: stamp.et, defs: {}, companies: {}, offerings: [] };
for (const [k, m] of Object.entries(TAGS)) out.defs[k] = { kind: m.kind, en: m.en, es: m.es, tags: (m.tags || m.recipes.map((r) => r.req.concat(r.opt || []).join(' + '))).map(short) };
const flat = {};

for (const c of companies) {
  const xb = await readJson(`${TOOLS}data/xbrl/${c.ticker}.json`);
  if (!xb) { warnings.push({ ticker: c.ticker, check: 'no XBRL extract stored', status: 'fail' }); continue; }
  const fl = filings.companies[c.ticker] || {};
  const Q = {};       // FY id -> { end, cal, metrics }
  const FY = {};
  const ensure = (id, end) => (Q[id] ||= { id, end, cal: fiscalOf(end, c.fyEnd).cal, m: {} });
  // One tag per fiscal year: the candidate with the most quarters in that year (priority order breaks ties), so
  // quarters of one year never mix tags and still tie to the 10-K; a quarter that tag lacks falls back to the
  // next candidate and is marked "mixed".
  for (const k of FLOW) {
    const per = TAGS[k].tags.map((tag) => flowQuarters(c.ticker, c.fyEnd, xb, tag));
    const fys = new Set();
    for (const r of per) { for (const id of Object.keys(r.q || {})) fys.add(id.slice(0, 6)); for (const id of Object.keys(r.fy || {})) fys.add(id); }
    for (const fy of fys) {
      const score = per.map((r) => Object.keys(r.q || {}).filter((id) => id.startsWith(fy + 'Q')).length + (r.fy && r.fy[fy] ? 0.5 : 0));
      const best = score.indexOf(Math.max(...score));
      const order = [best, ...per.map((_, i) => i).filter((i) => i !== best)];
      for (let n = 1; n <= 4; n++) {
        const id = `${fy}Q${n}`;
        for (const i of order) {
          const x = per[i].q && per[i].q[id];
          if (!x || x.end < FIRST_FY_END) continue;
          ensure(id, x.end).m[k] = i === best ? x : { ...x, mixed: true };
          break;
        }
      }
      for (const i of order) {
        const x = per[i].fy && per[i].fy[fy];
        if (!x || x.end < FIRST_FY_END) continue;
        (FY[fy] ||= { id: fy, end: x.end, m: {} }).m[k] = x;
        break;
      }
    }
  }
  // balance-sheet dates = the company's quarter ends found above (plus fiscal year ends)
  const ends = [...new Set([...Object.values(Q).map((q) => q.end), ...Object.values(FY).map((f) => f.end)])];
  for (const k of INSTANT) {
    const v = instantAt(c.ticker, xb, TAGS[k].recipes, ends);
    for (const [e, x] of Object.entries(v)) { const fi = fiscalOf(e, c.fyEnd); ensure(fi.id, e).m[k] = x; }
  }
  // tie-out: quarters of a fiscal year sum to the 10-K total (only meaningful where a 3-month fact was used)
  const quarters = Object.values(Q).sort((a, b) => a.end.localeCompare(b.end));
  for (const f of Object.values(FY)) {
    const fy = f.id;
    for (const k of FLOW) {
      const qs = [1, 2, 3, 4].map((n) => Q[`${fy}Q${n}`] && Q[`${fy}Q${n}`].m[k]);
      if (!f.m[k] || qs.some((x) => !x)) continue;
      const s = qs.reduce((a, x) => a + x.v, 0);
      const ok = Math.abs(s - f.m[k].v) <= Math.max(2e6, Math.abs(f.m[k].v) * 0.002);
      // a miss usually means a recast (discontinued operations, restatement) in a later filing: the four quarters
      // are flagged "needs review" on the page and the check is reported, not hidden
      if (!ok) qs.forEach((x) => { x.review = true; });
      warnings.push({ ticker: c.ticker, tag: fy, check: `${k}: Q1+Q2+Q3+Q4 = fiscal year`, diff: (s - f.m[k].v) / 1e6, status: ok ? 'ok' : 'warn', identity: true });
    }
  }
  // derived quarterly figures (FNAM calculation; null when an input is not disclosed)
  for (const q of quarters) {
    const g = (k) => (q.m[k] ? q.m[k].v : null);
    const d = {};
    if (g('capex_cash') != null && g('fl_additions') != null) d.capex_incl_fl = g('capex_cash') + g('fl_additions');
    if (g('ocf') != null && g('capex_cash') != null) { d.fcf = g('ocf') - g('capex_cash'); d.capex_ocf = g('ocf') > 0 ? g('capex_cash') / g('ocf') : null; }
    if (d.fcf != null && g('fl_principal') != null) d.fcf_after_fl = d.fcf - g('fl_principal');
    if (g('debt') != null && g('cash') != null) d.net_debt = g('debt') - g('cash');
    if (d.net_debt != null && g('ol_liab') != null && g('fl_liab') != null) d.lease_adj_net_debt = d.net_debt + g('ol_liab') + g('fl_liab');
    q.d = d;
  }
  // trailing twelve months: the last four consecutive fiscal quarters (no gaps) for each flow metric
  const ttmAt = (idx, k) => {
    const four = quarters.slice(idx - 3, idx + 1);
    if (four.length < 4 || four.some((x) => !x.m[k])) return null;
    for (let i = 1; i < 4; i++) if (days(four[i - 1].end, four[i].end) > 100) return null;
    return four.reduce((s, x) => s + x.m[k].v, 0);
  };
  quarters.forEach((q, i) => {
    const t = {};
    const fyRow = q.id.endsWith('Q4') && FY[q.id.slice(0, 6)];
    for (const k of [...FLOW]) {
      const v = ttmAt(i, k);
      if (v != null) t[k] = v;
      else if (fyRow && fyRow.m[k] && fyRow.end === q.end) { t[k] = fyRow.m[k].v; (t._fromFY ||= []).push(k); }   // 12 months to fiscal year-end = the fiscal year
    }
    if (t.op_income != null && t.da != null) t.ebitda = t.op_income + t.da;
    if (t.capex_cash != null && t.fl_additions != null) t.capex_incl_fl = t.capex_cash + t.fl_additions;
    if (t.ocf != null && t.capex_cash != null) { t.fcf = t.ocf - t.capex_cash; t.capex_ocf = t.ocf > 0 ? t.capex_cash / t.ocf : null; }
    if (t.fcf != null && t.fl_principal != null) t.fcf_after_fl = t.fcf - t.fl_principal;
    if (t.op_income != null && t.interest_exp) t.int_cov = t.op_income / t.interest_exp;
    if (t.ebitda != null && t.interest_exp) t.ebitda_int = t.ebitda / t.interest_exp;
    if (t.ebitda > 0 && q.d.net_debt != null) t.nd_ebitda = q.d.net_debt / t.ebitda;
    if (t.ebitda > 0 && q.d.lease_adj_net_debt != null) t.land_ebitda = q.d.lease_adj_net_debt / t.ebitda;
    q.ttm = t;
  });

  // anomaly flags: a flow value more than 5x the median of the four quarters before it (and above $1bn), or a
  // sign change in an outflow line; these print "needs review" on the page until the filing text is checked
  const anomalies = [];
  for (const k of FLOW) {
    quarters.forEach((q, i) => {
      if (!q.m[k] || i < 4) return;
      const prev = quarters.slice(i - 4, i).map((x) => x.m[k] && Math.abs(x.m[k].v)).filter((x) => x != null).sort((a, b) => a - b);
      if (prev.length < 3) return;
      const med = prev[Math.floor(prev.length / 2)];
      const v = Math.abs(q.m[k].v);
      if (v > 1e9 && med >= 0 && v > 5 * Math.max(med, 1)) { anomalies.push({ id: q.id, k, v: q.m[k].v, median: med }); q.m[k].review = true; }
    });
  }

  // staleness: next expected filing = next period end + the SEC deadline for the filer category (+7 days grace)
  const last = quarters.filter((q) => q.m.capex_cash || q.m.ocf || (q.ttm && q.ttm.capex_cash != null)).pop();
  const cat = fl.category || '';
  const fpi = c.ticker === 'NBIS';
  const qDays = /Large accelerated/i.test(cat) ? 40 : /Accelerated/i.test(cat) ? 40 : 45;
  const kDays = /Large accelerated/i.test(cat) ? 60 : /Accelerated/i.test(cat) ? 75 : 90;
  let nextEnd = null, due = null;
  if (last) {
    const d = new Date(last.end + 'T12:00:00Z');
    const months = fpi ? 12 : 3;
    const ne = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0));
    nextEnd = ne.toISOString().slice(0, 10);
    const isK = fiscalOf(nextEnd, c.fyEnd).q === 4;
    const add = fpi ? 120 : isK ? kDays : qDays;
    due = new Date(ne.getTime() + add * 864e5).toISOString().slice(0, 10);
  }
  const lastFilings = (fl.filings || []).filter((f) => /^(10-K|10-Q|20-F|6-K|8-K)/.test(f.form)).slice(0, 12)
    .map((f) => ({ form: f.form, filed: f.filed, report: f.report, accn: f.accn, items: f.items, url: filingIndexUrl(c.cik, f.accn) }));
  out.companies[c.ticker] = {
    ticker: c.ticker, cik: c.cik, name: c.name, group: c.group, color: c.color, fyEnd: c.fyEnd, category: cat || null,
    note: c.note_en ? { en: c.note_en, es: c.note_es } : null,
    latest: last ? { id: last.id, end: last.end, cal: last.cal } : null, nextPeriodEnd: nextEnd, nextFilingDue: due,
    quarters: quarters.filter((q) => Object.keys(q.m).length).map((q) => ({ id: q.id, end: q.end, cal: q.cal, m: Object.fromEntries(Object.entries(q.m).map(([k, x]) => [k, [x.v, x.t, x.a, x.m, x.review ? 1 : 0, x.mixed ? 1 : 0]])), d: q.d, ttm: q.ttm })),
    fy: Object.values(FY).sort((a, b) => a.end.localeCompare(b.end)).map((f) => ({ id: f.id, end: f.end, m: Object.fromEntries(Object.entries(f.m).map(([k, x]) => [k, [x.v, x.t, x.a]])) })),
    anomalies, filings: lastFilings,
  };
  // registered offerings: the filing-fee exhibit of each 424B prospectus (EX-FILING FEES, tagged ffd) gives the
  // offering's total amount and date; the security type and terms are in the prospectus itself
  const off = (xb.facts['ffd:TtlOfferingAmt'] || { facts: [] }).facts.filter((f) => /^424B/.test(f.f) && f.v > 0);
  for (const f of off) out.offerings.push({ ticker: c.ticker, amount: f.v, date: f.e, filed: f.d, form: f.f, accn: f.a, url: filingIndexUrl(c.cik, f.a) });
  for (const q of out.companies[c.ticker].quarters) for (const [k, x] of Object.entries(q.m)) flat[`${c.ticker}.${k}.${q.id}`] = { v: x[0], a: x[2].join(',') };
}
out.offerings.sort((a, b) => b.date.localeCompare(a.date));

// Debt issued since 2025: FactSet tranches grouped into deals (same company, issue date and instrument class).
// A deal is corroborated when a 424B filing-fee exhibit of the same company lies within 7 days with a total
// within 3% (T1); otherwise it stays "FactSet only — needs review" until matched to a filing.
const deals = [];
if (debtSnap) {
  const cls = (t) => (/Notes|Convertible|Private/.test(t[2]) ? (t[2] === 'Convertible' ? 'Convertible notes' : t[2] === 'Private placement' ? 'Private placement notes' : 'Bonds / notes') : t[2] === 'Term Loans' ? 'Term loan' : 'Revolving credit');
  const g = new Map();
  for (const t of debtSnap.tranches) {
    const k = `${t[0]}|${t[7]}|${cls(t)}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(t);
  }
  const yrs = (a, b) => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(b); if (!m) return null; return (Date.UTC(+m[1], +m[2] - 1, +(m[3] || 15)) - Date.parse(a)) / (365.25 * 864e5); };
  for (const [k, ts] of g) {
    const [ticker, issued, klass] = k.split('|');
    const amount = ts.reduce((s, t) => s + t[4], 0);
    const cps = ts.map((t) => t[5]).filter((x) => x != null);
    const ten = ts.map((t) => yrs(issued, t[8])).filter((x) => x != null);
    // FactSet converts non-USD tranches at a spot rate, which leaves amounts with 2+ decimals (EUR 1,250m → 1,429.125); convertibles are excluded because partial conversions leave odd USD amounts
    const nonUSD = klass !== 'Convertible notes' && ts.some((t) => !Number.isInteger(Math.round(t[4] * 1000) / 100));
    const match = out.offerings.find((o) => o.ticker === ticker && Math.abs(Date.parse(o.date) - Date.parse(issued)) <= 7 * 864e5 && amount > 0 && Math.abs(o.amount / 1e6 - amount) / amount <= 0.03);
    deals.push({ ticker, issued, klass, tranches: ts.length, amount, couponMin: cps.length ? Math.min(...cps) : null, couponMax: cps.length ? Math.max(...cps) : null,
      floating: ts.some((t) => t[6] === 'Variable'), tenorMin: ten.length ? Math.min(...ten) : null, tenorMax: ten.length ? Math.max(...ten) : null, maturityLast: ts.map((t) => t[8]).sort().at(-1),
      seniority: [...new Set(ts.map((t) => t[3]))].join('; '), nonUSD, undrawn: amount === 0, reportDate: ts[0][9], ids: ts.map((t) => t[1]),
      match: match ? { accn: match.accn, url: match.url, date: match.date, amount: match.amount } : null });
  }
  deals.sort((a, b) => b.issued.localeCompare(a.issued) || b.amount - a.amount);
}
out.guidance = guidance;

// Off-balance-sheet text items: the curated file plus Oracle's items read from the Oracle model's verified store
// (one source of truth; the Oracle page and this hub show the same figure).
const offItems = [...(offbsCur.items || [])];
if (orclOblig && orclOblig.leases && orclOblig.leases.uncommenced) {
  const u = orclOblig.leases.uncommenced, src = orclOblig.sources[u.source] || {};
  const accn = (/\/(\d{18})\//.exec(src.url || '') || [])[1];
  offItems.push({ ticker: 'ORCL', item: 'leases_not_commenced', amountUSDm: u.usd_bn * 1000, basis: 'undiscounted', asOf: orclOblig.as_of,
    filing: { form: '10-Q', accn: accn ? accn.replace(/(\d{10})(\d{2})(\d{6})/, '$1-$2-$3') : null, url: src.url || null, section: 'Leases note', page: null },
    quote: u.text_en, commence: { from: u.commence_from, to: u.commence_to }, termYears: [u.term_years_min, u.term_years_max], history: u.history,
    accounting: 'ASC 842', tier: 'T1', status: 'verified', verifiedBy: 'Oracle model routine (tools/oracle/data/obligations.json)', verifiedOn: orclOblig.updated, pagePending: true });
}
if (orclOblig && orclOblig.prepayments && orclOblig.prepayments.deferred_revenue_prepayments_financing_1q27 != null) {
  const src = orclOblig.sources['10q_1q27'] || {};
  offItems.push({ ticker: 'ORCL', item: 'prepayment', amountUSDm: orclOblig.prepayments.deferred_revenue_prepayments_financing_1q27, basis: 'carrying', asOf: orclOblig.as_of,
    filing: { form: '10-Q', accn: '0001193125-26-389274', url: src.url || null, section: 'Cash-flow statement', page: null }, quote: orclOblig.prepayments.text_en,
    accounting: 'ASC 606 (significant financing component)', tier: 'T1', status: 'verified', verifiedBy: 'Oracle model routine (tools/oracle/data/obligations.json)', verifiedOn: orclOblig.updated, pagePending: true });
}
out.offbs = { updated: offbsCur.updated, items: offItems, searched: offbsCur.searched || [] };
out.debt = debtSnap ? { file: debtSnap.file, pulledAt: debtSnap.pulledAt, source: debtSnap.source, totals: debtSnap.totals, notes: debtSnap.notes, tranches: debtSnap.tranches, deals } : null;

// change log: new periods and revised values against the previous build
const entries = [];
if (prevMetrics && prevMetrics.values) {
  for (const [id, x] of Object.entries(flat)) {
    const o = prevMetrics.values[id];
    if (!o) entries.push({ at: stamp.iso, kind: 'new', id, value: x.v, accn: x.a });
    else if (o.v !== x.v) entries.push({ at: stamp.iso, kind: 'revised', id, old: o.v, value: x.v, oldAccn: o.a, accn: x.a });
  }
  for (const id of Object.keys(prevMetrics.values)) if (!flat[id]) entries.push({ at: stamp.iso, kind: 'removed', id, old: prevMetrics.values[id].v });
} else {
  entries.push({ at: stamp.iso, kind: 'initial', id: '*', value: Object.keys(flat).length, note: 'initial load of the XBRL-tagged history' });
}
const changed = entries.length > 0 && !(entries.length === 0);
const log = { entries: [...entries, ...prevLog.entries].slice(0, 600) };
await writeJson(TOOLS + 'data/metrics.json', { generated: stamp.iso, values: flat });
await writeJson(TOOLS + 'data/changelog.json', log);
await writeJson(TOOLS + 'data/derivations.json', { generated: stamp.iso, warnings, restated });

const js = (name, key, obj, note) => writeText(`${SITE}data/${name}.js`, `// ${note}\n// Generated ${stamp.iso} by scripts/hyperscalers/build.mjs — do not hand-edit.\nwindow.${key} = ${JSON.stringify(obj)};\n`);
await js('financials', 'HYP_FIN', out, 'Hyperscaler Hub financials: XBRL-tagged values from SEC companyfacts (T1), quarters derived from year-to-date facts, ratios computed (FNAM calculation).');
await js('changelog', 'HYP_LOG', { generated: stamp.iso, refreshedET: stamp.et, entries: log.entries.slice(0, 200), restated: restated.slice(-200) }, 'Hyperscaler Hub change log: what each refresh added or revised, and restatements found in later filings.');
await js('status', 'HYP_STATUS', { generated: stamp.iso, refreshedET: stamp.et, lastEdgarRun: state.lastRun || null, lastEdgarSuccess: state.lastSuccess || null, edgarErrors: state.errors || [], consecutiveFailures: state.consecutiveFailures || 0 }, 'Hyperscaler Hub refresh status (EDGAR poll).');

// CSV downloads: one per table family (static files, so they work without JavaScript)
const csvEsc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (rows) => rows.map((r) => r.map(csvEsc).join(',')).join('\n') + '\n';
const head = ['ticker', 'company', 'fiscal_quarter', 'period_end', 'calendar_quarter', 'metric', 'value_usd', 'basis', 'method', 'xbrl_tag', 'accessions', 'tier', 'needs_review', 'refreshed_et'];
const rowsCapex = [head], rowsBal = [head], rowsOff = [head];
const capexKeys = ['capex_cash', 'fl_additions', 'fl_principal', 'ol_additions', 'ocf', 'op_income', 'da', 'interest_exp', 'interest_cap', 'debt_proceeds', 'debt_repaid', 'cp_net', 'equity_proceeds', 'pref_proceeds', 'buybacks', 'dividends'];
const balKeys = ['cash', 'debt', 'ol_liab', 'fl_liab', 'ppe_net'];
const offKeys = ['rpo', 'purchase_oblig', 'vie_max_loss', 'guarantees_max', 'equity_method', 'nci_vie'];
for (const c of Object.values(out.companies)) {
  for (const q of c.quarters) {
    for (const [k, x] of Object.entries(q.m)) {
      const row = [c.ticker, c.name, q.id, q.end, q.cal, k, x[0], TAGS[k].kind === 'flow' ? 'quarter' : 'instant', x[3], x[1], x[2].join(' '), 'T1 (XBRL)', x[4] ? 'yes' : 'no', stamp.et];
      (capexKeys.includes(k) ? rowsCapex : balKeys.includes(k) ? rowsBal : rowsOff).push(row);
    }
    for (const [k, v] of Object.entries(q.d || {})) if (v != null) (k.includes('debt') ? rowsBal : rowsCapex).push([c.ticker, c.name, q.id, q.end, q.cal, k, v, k === 'capex_ocf' ? 'ratio' : k.includes('debt') ? 'instant' : 'quarter', 'FNAM calculation', '', '', 'FNAM calculation', 'no', stamp.et]);
    for (const [k, v] of Object.entries(q.ttm || {})) if (v != null) rowsCapex.push([c.ticker, c.name, q.id, q.end, q.cal, `ttm_${k}`, v, 'trailing 12 months', 'FNAM calculation', '', '', 'FNAM calculation', 'no', stamp.et]);
  }
}
await writeText(`${SITE}csv/capex-financing-quarterly.csv`, csv(rowsCapex));
await writeText(`${SITE}csv/balance-leverage-quarterly.csv`, csv(rowsBal));
await writeText(`${SITE}csv/off-balance-sheet-tagged.csv`, csv(rowsOff));
await writeText(`${SITE}csv/registered-offerings.csv`, csv([['ticker', 'offering_total_usd', 'date', 'filed', 'form', 'accession', 'url', 'tier', 'refreshed_et'], ...out.offerings.map((o) => [o.ticker, o.amount, o.date, o.filed, o.form, o.accn, o.url, 'T1 (424B filing-fee exhibit)', stamp.et])]));
if (debtSnap) {
  await writeText(`${SITE}csv/debt-tranches-since-2025.csv`, csv([['ticker', 'instrument_id', 'type', 'seniority', 'amount_outstanding_usd_m', 'coupon_pct', 'coupon_type', 'issue_date', 'maturity', 'report_date', 'source', 'pulled', 'status'], ...debtSnap.tranches.map((t) => [...t, 'FactSet Debt Capital Structure', debtSnap.pulledAt, 'needs review (match to 424B / 8-K)'])]));
  await writeText(`${SITE}csv/debt-deals-since-2025.csv`, csv([['ticker', 'issue_date', 'class', 'tranches', 'amount_outstanding_usd_m', 'coupon_min_pct', 'coupon_max_pct', 'floating_tranche', 'tenor_min_years', 'tenor_max_years', 'seniority', 'non_usd_or_reg_s', 'report_date', 'matched_424b_accession', 'matched_424b_total_usd', 'status', 'pulled'], ...deals.map((d) => [d.ticker, d.issued, d.klass, d.tranches, d.amount, d.couponMin, d.couponMax, d.floating ? 'yes' : 'no', d.tenorMin == null ? '' : d.tenorMin.toFixed(1), d.tenorMax == null ? '' : d.tenorMax.toFixed(1), d.seniority, d.nonUSD ? 'yes' : 'no', d.reportDate, d.match ? d.match.accn : '', d.match ? d.match.amount : '', d.match ? 'corroborated by 424B (T1)' : 'FactSet only, needs review', debtSnap.pulledAt])]));
}
await writeText(`${SITE}csv/changelog.csv`, csv([['at', 'kind', 'id', 'old', 'value', 'old_accession', 'accession'], ...log.entries.map((e) => [e.at, e.kind, e.id, e.old, e.value, e.oldAccn, e.accn])]));

console.log(`build: ${Object.keys(out.companies).length} companies, ${Object.keys(flat).length} values, ${entries.length} change-log entries, ${restated.length} restatements, ${warnings.filter((w) => w.status !== 'ok').length} warnings`);
for (const w of warnings.filter((x) => x.status !== 'ok')) console.log('  ', w.status, w.ticker, w.tag || '', w.check, w.diff ?? '');
