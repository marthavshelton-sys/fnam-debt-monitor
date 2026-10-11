#!/usr/bin/env node
// Results releases of the companies in the American Consumer page (tools/consumidor/companies.json).
// For every company: the SEC's ticker file gives the CIK, the submissions API the latest results 8-K (Item 2.02), the
// filing index its exhibits; every EX-99 exhibit in HTML is stored as text (tables one row per line, cells separated by
// " | ") under tools/consumidor/raw/releases/<TICKER>/. Kept per company: its two latest results filings and the filing the
// curated figures cite (data/companies-kpis.json → filed).
// The curated figures and quotes of the page are written from, and checked against, these texts.
//
//   node scripts/consumidor/harvest-releases.mjs [--force] [--only=WMT,TGT]
//
// A company that fails is reported in releases/index.json (errors) and never stops the others; exit code 0 unless every
// company failed.
import { readdirSync, rmSync, existsSync } from 'node:fs';
import { p, RAW, TOOLS, readJson, readText, writeJson, writeText, secGet, getText, htmlToText, nowIso } from './lib/common.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const DIR = RAW + 'releases/';
const KEEP = 2;                 // results filings kept per company
const MAX_CHARS = 900_000;      // per exhibit (bank supplements are long)

const cfg = readJson(TOOLS + 'companies.json');
const index = readJson(DIR + 'index.json', { companies: {} });
const kpis = readJson(TOOLS + 'data/companies-kpis.json', { companies: {} });
index.companies = index.companies || {};
const errors = [];

const cik10 = (cik) => String(cik).padStart(10, '0');
const noDash = (a) => a.replace(/-/g, '');

let tickers = null;
async function cikOf(ticker) {
  if (!tickers) {
    const j = await secGet('https://www.sec.gov/files/company_tickers.json', 'json');
    tickers = {};
    for (const k of Object.keys(j)) tickers[String(j[k].ticker).toUpperCase()] = { cik: j[k].cik_str, title: j[k].title };
  }
  return tickers[ticker.toUpperCase()] || null;
}

// rows of the filing index's "Document Format Files" table: { seq, description, href, type }
function parseIndex(html) {
  const out = [];
  const tbl = /<table[^>]*class="tableFile"[^>]*summary="Document Format Files"[\s\S]*?<\/table>/i.exec(html);
  if (!tbl) return out;
  for (const tr of tbl[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (tds.length < 4) continue;
    const href = (/href="([^"]+)"/i.exec(tds[2]) || [])[1];
    if (!href) continue;
    const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    out.push({ seq: clean(tds[0]), description: clean(tds[1]), href: href.replace(/^\/ix\?doc=/, ''), type: clean(tds[3]) });
  }
  return out;
}

let done = 0;
for (const c of cfg.companies) {
  if (only.length && !only.includes(c.ticker)) continue;
  try {
    const id = await cikOf(c.ticker);
    if (!id) throw new Error('ticker not in the SEC ticker file');
    const sub = await secGet(`https://data.sec.gov/submissions/CIK${cik10(id.cik)}.json`, 'json');
    const r = sub.filings.recent;
    // the two latest results filings, plus the one the curated figures were read from (so its text stays while it is cited)
    const kp = (kpis.companies || {})[c.ticker] || {};
    const pins = new Set([kp.filed, ...(kp.pins || [])].filter(Boolean));   // `pins`: older releases a figure still cites
    const oldest = pins.size ? [...pins].sort()[0] : null;
    const prev = index.companies[c.ticker] || {};
    const entry = { ticker: c.ticker, name: c.name, cik: id.cik, secName: id.title, fiscalYearEnd: sub.fiscalYearEnd || null, filings: [] };
    // A foreign private issuer (`form: "6-K"` in companies.json) furnishes its results on Form 6-K, which has no item
    // numbers: the latest 6-Ks are opened until KEEP of them carry an exhibit whose opening text matches the company's
    // `match` pattern; the ones that do not are remembered (`skipped`) so they are not opened again.
    const fpi = c.form === '6-K';
    const matchRe = fpi ? new RegExp(c.match || 'results|interim report', 'i') : null;
    const skipped = new Set(fpi && !force && prev.match === c.match ? prev.skipped || [] : []);
    const hits = [];
    let opened = 0;
    for (let i = 0; i < r.form.length; i++) {
      const h = { accn: r.accessionNumber[i], filed: r.filingDate[i], report: r.reportDate[i], items: fpi ? '6-K' : r.items[i], primary: r.primaryDocument[i] };
      if (fpi) {
        if (r.form[i] !== '6-K' || skipped.has(h.accn)) continue;
        const wanted = hits.length < KEEP || pins.has(h.filed);
        if (!wanted && (!oldest || h.filed <= oldest)) break;
        const known = (prev.filings || []).find((f) => f.accn === h.accn && !f.form);
        if (known) { hits.push(h); continue; }
        if (!wanted || opened >= 16) continue;   // at most 16 unknown 6-Ks are opened in a run
        opened++;
        const docs = parseIndex(await secGet(`https://www.sec.gov/Archives/edgar/data/${id.cik}/${noDash(h.accn)}/${h.accn}-index.htm`)).filter((d) => /^EX-99/i.test(d.type) && /\.(htm|html|txt)$/i.test(d.href));
        let ok = false;
        for (const d of docs.slice(0, 3)) { const t = htmlToText(await secGet(d.href.startsWith('http') ? d.href : 'https://www.sec.gov' + d.href)); if (matchRe.test(t.slice(0, 8000))) { ok = true; break; } }
        if (ok) hits.push(h); else skipped.add(h.accn);
        continue;
      }
      if (r.form[i] !== '8-K' || !/(^|,)\s*2\.02(,|$)/.test(String(r.items[i] || ''))) continue;
      if (hits.length < KEEP || pins.has(h.filed)) hits.push(h);
      if (hits.length >= KEEP && (!oldest || h.filed <= oldest)) break;
    }
    if (!hits.length) throw new Error(fpi ? 'no Form 6-K with results among the recent filings' : 'no results 8-K (Item 2.02) among the recent filings');
    if (fpi) { entry.skipped = [...skipped].slice(-60); entry.match = c.match || null; }
    for (const h of hits) {
      const base = `https://www.sec.gov/Archives/edgar/data/${id.cik}/${noDash(h.accn)}/`;
      const indexUrl = `${base}${h.accn}-index.htm`;
      const known = (prev.filings || []).find((f) => f.accn === h.accn);
      if (known && !force && known.exhibits.every((e) => existsSync(p(e.file)))) { entry.filings.push(known); continue; }
      const docs = parseIndex(await secGet(indexUrl)).filter((d) => /^EX-99/i.test(d.type) && /\.(htm|html|txt)$/i.test(d.href));
      const exhibits = [];
      for (const d of docs) {
        const url = d.href.startsWith('http') ? d.href : 'https://www.sec.gov' + d.href;
        let text = htmlToText(await secGet(url));
        const full = text.length;
        if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + `\n… (truncated: ${full - MAX_CHARS} more characters in the filing)`;
        const file = `${DIR}${c.ticker}/${h.filed}_${h.accn}_${d.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
        writeText(file, `# ${c.name} (${c.ticker}) · ${fpi ? 'Form 6-K' : 'Form 8-K, Item ' + h.items} · filed ${h.filed} · ${d.type}${d.description ? ' · ' + d.description : ''}\n# ${url}\n\n${text}\n`);
        exhibits.push({ type: d.type, description: d.description, url, file, chars: full });
      }
      entry.filings.push({ accn: h.accn, filed: h.filed, report: h.report, items: h.items, indexUrl, exhibits });
    }
    // the latest annual and quarterly reports, as the passages that match the company's `annual` / `quarterly` pattern
    // (workers and their earnings are stated once a year, in the 10-K; revenue by country is in the notes of the 10-Q)
    for (const [key, form] of [['annual', '10-K'], ['quarterly', '10-Q']]) {
      if (!c[key]) continue;
      const re = new RegExp(c[key], 'i');
      const i = r.form.findIndex((f) => f === form);
      if (i < 0) continue;
      const h = { accn: r.accessionNumber[i], filed: r.filingDate[i], report: r.reportDate[i], primary: r.primaryDocument[i] };
      const known = (prev.filings || []).find((f) => f.accn === h.accn && f.form === form && f.pattern === c[key]);
      if (known && !force && known.exhibits.every((e) => existsSync(p(e.file)))) { entry.filings.push(known); continue; }
      const url = `https://www.sec.gov/Archives/edgar/data/${id.cik}/${noDash(h.accn)}/${h.primary}`;
      const lines = htmlToText(await secGet(url)).split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 12 && re.test(l)).slice(0, 90).map((l) => (l.length > 1500 ? l.slice(0, 1500) + ' …' : l));
      const file = `${DIR}${c.ticker}/${h.filed}_${h.accn}_${form.toLowerCase()}.txt`;
      writeText(file, `# ${c.name} (${c.ticker}) · Form ${form} · filed ${h.filed} · period ended ${h.report} · passages matching /${c[key]}/i\n# ${url}\n\n${lines.join('\n\n')}\n`);
      entry.filings.push({ accn: h.accn, filed: h.filed, report: h.report, form, pattern: c[key], indexUrl: `https://www.sec.gov/Archives/edgar/data/${id.cik}/${noDash(h.accn)}/${h.accn}-index.htm`, exhibits: [{ type: form, description: `${form === '10-K' ? 'Annual' : 'Quarterly'} report (passages)`, url, file, chars: lines.join(' ').length }] });
    }
    // pages the company publishes outside EDGAR (a report on its U.S. couriers, say), listed under `pages` in
    // companies.json as { id, url, grep, title }: the lines matching `grep` are kept as text, and a curated figure cites
    // them through `filed: "page:<id>"`. A page that does not answer keeps its stored text.
    for (const pg of c.pages || []) {
      const key = `page:${pg.id}`;
      const known = (prev.filings || []).find((f) => f.accn === key);
      const file = `${DIR}${c.ticker}/page_${pg.id}.txt`;
      try {
        const re = new RegExp(pg.grep, 'i');
        const lines = htmlToText(await getText(pg.url, { tries: 2, timeoutMs: 45_000 })).split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 12 && re.test(l)).slice(0, 80).map((l) => (l.length > 1200 ? l.slice(0, 1200) + ' …' : l));
        if (!lines.length) throw new Error('no line of the page matches its pattern');
        const body = lines.join('\n\n');
        const same = known && known.pattern === pg.grep && existsSync(p(file)) && readText(file, '').split('\n').slice(3).join('\n').trim() === body;
        const read = same ? known.read : nowIso().slice(0, 10);   // the date the stored text was read (it changes only when the page did)
        if (!same) writeText(file, `# ${c.name} (${c.ticker}) · ${pg.title || pg.id} · page read ${read} · lines matching /${pg.grep}/i\n# ${pg.url}\n\n${body}\n`);
        entry.filings.push({ accn: key, filed: key, read, form: 'page', pattern: pg.grep, title: pg.title || pg.id, indexUrl: pg.url, exhibits: [{ type: 'page', description: pg.title || pg.id, url: pg.url, file, chars: body.length }] });
      } catch (e) {
        if (known && existsSync(p(file))) entry.filings.push(known);
        console.log(`::warning::${c.ticker}: page ${pg.id}: ${(e && e.message) || e}`);
      }
    }
    // drop the texts of filings no longer kept
    const keepFiles = new Set(entry.filings.flatMap((f) => f.exhibits.map((e) => e.file.split('/').pop())));
    const dir = p(`${DIR}${c.ticker}`);
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (!keepFiles.has(f)) rmSync(`${dir}/${f}`);
    index.companies[c.ticker] = entry;
    done++;
    console.log(`${c.ticker}: ${entry.filings.map((f) => `${f.filed} (${f.exhibits.length} exhibits)`).join(', ')}`);
  } catch (e) {
    errors.push({ ticker: c.ticker, error: String((e && e.message) || e) });
    console.log(`::warning::${c.ticker}: ${(e && e.message) || e}`);
  }
}
const before = JSON.stringify({ ...readJson(DIR + 'index.json', {}), checkedAt: null, errors: null });
index.errors = errors;
const after = JSON.stringify({ ...index, checkedAt: null, errors: null });
// the check time is stamped only when something changed, so a quiet run commits nothing
if (before !== after || !index.checkedAt) index.checkedAt = nowIso();
writeJson(DIR + 'index.json', index);
// EDGAR as a source of the refresh: a run in which no company could be read counts as a failure in raw/status.json
if (!only.length) {
  const status = readJson(RAW + 'status.json', { sources: {} });
  const was = JSON.stringify(status);
  const st = (status.sources.edgar = status.sources.edgar || { failures: 0 });
  if (!done) { st.failures = (st.failures || 0) + 1; st.error = String(errors[0] ? errors[0].error : 'no company could be read').slice(0, 300); st.since = st.since || nowIso().slice(0, 10); }
  else if (st.failures || st.error) { st.failures = 0; delete st.error; delete st.since; }
  if (JSON.stringify(status) !== was) writeJson(RAW + 'status.json', status);
}
if (!done && !only.length) process.exit(1);
