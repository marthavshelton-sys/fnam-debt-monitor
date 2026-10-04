// Hyperscaler Hub: EDGAR poll. For every covered company it reads the submissions API (new 8-K / 10-Q / 10-K /
// 10-K/A / 20-F / 6-K / 424B filings) and the XBRL companyfacts API, and keeps only the tags the hub uses
// (tools/hyperscalers/data/xbrl/<TICKER>.json) plus the filing list (tools/hyperscalers/data/filings.json).
// New accessions since the last run are listed in tools/hyperscalers/data/state.json → newFilings, which the
// workflow uses to decide whether the build changed anything worth committing.
//
// A company whose call fails keeps its stored file; the error is written to state.json (errors[]) and counted
// toward the SOURCE DOWN rule (three consecutive failed runs). Usage: node scripts/hyperscalers/fetch-edgar.mjs
import { readJson, writeJson, writeText, secJson, cik10, TOOLS } from './lib.mjs';
import { TAGS } from './tags.mjs';

const FORMS = /^(10-K|10-Q|8-K|20-F|6-K|424B\d|10-K\/A|10-Q\/A|20-F\/A|8-K\/A)$/;
const SINCE = '2021-01-01';

const { companies } = await readJson(TOOLS + 'companies.json');
const state = await readJson(TOOLS + 'data/state.json', { seen: {}, errors: [], runs: [] });
const filingsOut = await readJson(TOOLS + 'data/filings.json', { companies: {} });
const wanted = new Set(Object.values(TAGS).flatMap((m) => m.tags || []).concat(Object.values(TAGS).flatMap((m) => (m.recipes || []).flatMap((r) => [...r.req, ...(r.opt || [])]))));
const newFilings = [];
const errors = [];

for (const c of companies) {
  // 1. submissions: filing list and filer category
  try {
    const s = await secJson(`https://data.sec.gov/submissions/CIK${cik10(c.cik)}.json`);
    const r = s.filings.recent;
    const list = [];
    for (let i = 0; i < r.accessionNumber.length; i++) {
      if (!FORMS.test(r.form[i]) || r.filingDate[i] < '2024-01-01') continue;
      list.push({ accn: r.accessionNumber[i], form: r.form[i], filed: r.filingDate[i], report: r.reportDate[i] || null, doc: r.primaryDocument[i] || null, items: r.items[i] || null });
    }
    const seen = new Set(state.seen[c.ticker] || []);
    const first = !seen.size;
    for (const f of list) if (!seen.has(f.accn)) { if (!first) newFilings.push({ ticker: c.ticker, ...f }); seen.add(f.accn); }
    state.seen[c.ticker] = [...seen].sort();
    filingsOut.companies[c.ticker] = { name: s.name, category: s.category || null, fiscalYearEnd: s.fiscalYearEnd || null, filings: list };
  } catch (e) { errors.push({ ticker: c.ticker, api: 'submissions', error: String(e.message || e) }); }

  // 2. companyfacts: keep only the hub's tags (standard taxonomies; company-specific tags are not in this API)
  try {
    const j = await secJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10(c.cik)}.json`);
    const out = { ticker: c.ticker, cik: c.cik, entity: j.entityName, facts: {} };   // no fetch date here: the file changes only when a fact does
    for (const [ns, tags] of Object.entries(j.facts || {})) {
      for (const [tag, v] of Object.entries(tags)) {
        const key = `${ns}:${tag}`;
        if (!(wanted.has(key) || (ns === 'ffd' && /^(TtlOfferingAmt|NrrtvMaxAggtOfferingPric)$/.test(tag)))) continue;
        const units = v.units.USD ? { USD: v.units.USD } : v.units;
        const facts = Object.values(units)[0].filter((f) => f.end >= SINCE && (ns === 'ffd' || /^(10-K|10-Q|20-F|40-F)/.test(f.form)))
          .map((f) => ({ v: f.val, s: f.start || null, e: f.end, a: f.accn, f: f.form, d: f.filed, fp: f.fp || null }));
        // a tag found only in a former reporting currency (Nebius's RUB years, before 2025) is history, not a change of
        // currency: it is dropped; a non-USD fact dated 2025 or later is kept so the validator fails on it
        if (!v.units.USD && ns !== 'ffd' && facts.every((f) => f.e < '2025-01-01')) continue;
        if (facts.length) out.facts[key] = { label: v.label || tag, unit: Object.keys(units)[0], facts };
      }
    }
    await writeText(`${TOOLS}data/xbrl/${c.ticker}.json`, JSON.stringify(out) + '\n');
  } catch (e) { errors.push({ ticker: c.ticker, api: 'companyfacts', error: String(e.message || e) }); }
}

const at = new Date().toISOString().slice(0, 19) + 'Z';
state.runs = [{ at, ok: !errors.length, newFilings: newFilings.length, errors: errors.length }, ...(state.runs || [])].slice(0, 30);
state.errors = errors;
state.consecutiveFailures = errors.length ? (state.consecutiveFailures || 0) + 1 : 0;
state.newFilings = newFilings;
state.lastRun = at;
if (!errors.length) state.lastSuccess = at;
delete filingsOut.updated;   // run times live in state.json, so filings.json changes only with a new filing
await writeJson(TOOLS + 'data/filings.json', filingsOut);
await writeJson(TOOLS + 'data/state.json', state);
console.log(`EDGAR poll: ${companies.length} companies, ${newFilings.length} new filings, ${errors.length} errors`);
for (const f of newFilings) console.log(`  new ${f.ticker} ${f.form} ${f.filed} ${f.accn}`);
for (const e of errors) console.log(`  ERROR ${e.ticker} ${e.api}: ${e.error}`);
if (errors.length === companies.length * 2) process.exit(1);
