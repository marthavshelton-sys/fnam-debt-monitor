#!/usr/bin/env node
// Results releases of the companies in the Mexican Consumer page (tools/mx-consumidor/companies.json).
//
// Two official disclosure channels are read, the one each company files with:
//   · BMV, eventos relevantes of the issuer (bmv.com.mx): the notices whose title is a results release (or matches one
//     of the company's `also` patterns, e.g. Walmex's monthly sales) are downloaded as PDF and stored as text, one block
//     per page;
//   · BMV, quarterly report of the issuer (`xbrl: true`; many issuers file their results release only inside it): the
//     page "información financiera" of the issuer links the latest quarter's XBRL package; the management-commentary
//     text blocks of the package (the results release and its tables) are stored as text;
//   · SEC EDGAR: the latest results 8-K (Item 2.02) or, for a foreign private issuer, the latest 6-Ks whose exhibit
//     opens with text matching the company's `match`; every EX-99 exhibit in HTML is stored as text (tables one row
//     per line, cells separated by " | ").
// Texts live under tools/mx-consumidor/raw/releases/<TICKER>/. Kept per company: its two latest results releases, the
// two latest notices of each `also` pattern and any release the curated figures cite (data/companies-kpis.json →
// filed, pins). The curated figures and quotes of the page are written from, and checked against, these texts.
//
//   node scripts/mx-consumidor/harvest-releases.mjs [--force] [--only=WALMEX,TBBB]
//
// A company that fails is reported in releases/index.json (errors) and never stops the others; exit code 0 unless every
// company failed. Needs python3 with pdfplumber for the BMV notices (lib/pdf2text.py).
import { readdirSync, rmSync, existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { p, RAW, TOOLS, readJson, writeJson, writeText, secGet, getText, getBuffer, htmlToText, nowIso, sleep } from './lib/common.mjs';
import { parseListing } from '../lib/bmv-events.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const DIR = RAW + 'releases/';
const KEEP = 2;                 // results releases kept per company
const MAX_CHARS = 700_000;      // per document
const BMV = 'https://www.bmv.com.mx';

const cfg = readJson(TOOLS + 'companies.json');
const index = readJson(DIR + 'index.json', { companies: {} });
const kpis = readJson(TOOLS + 'data/companies-kpis.json', { companies: {} });
index.companies = index.companies || {};
const errors = [];

// ---------- BMV ----------
// titles that are never a results release (the notice of its date, the invitation to the call) and titles that are
// (an issuer that files the same release in Spanish and in English is read in Spanish)
const SKIP = /fecha de (publicaci|reporte)|conferencia|llamada|invitaci|convocatoria|webcast|calendario|recompra|asamblea|dividendo|periodo de silencio|\b(reports|results|announces|quarter)\b/i;
const RESULTS = /resultados?[^.]{0,80}(trimestre|\b[1-4]\s?[tq]\s?(20)?\d\d\b)|reporte (de resultados|trimestral)|informe trimestral|(primer|segundo|tercer|cuarto|1er\.?|2do\.?|3er\.?|4to\.?) trimestre|\b[1-4]\s?[tq]\s?(20)?\d\d\b/i;
const tmp = join(tmpdir(), 'mxc-releases');
function pdfToText(buf, name) {
  mkdirSync(tmp, { recursive: true });
  const pdf = join(tmp, `${name}.pdf`), txt = join(tmp, `${name}.txt`);
  writeFileSync(pdf, buf);
  execFileSync('python3', [new URL('./lib/pdf2text.py', import.meta.url).pathname, pdf, txt], { maxBuffer: 64 * 1024 * 1024, timeout: 240_000 });
  return readFileSync(txt, 'utf8');
}
async function harvestBmv(c, prev, pins) {
  const url = `${BMV}/es/emisoras/eventosrelevantes/${c.bmv}`;
  const html = await getText(url, { tries: 3, timeoutMs: 60_000 });
  const rows = parseListing(html);
  if (!rows.length) throw new Error('the BMV list of notices parsed to zero rows');
  const re = c.match ? new RegExp(c.match, 'i') : RESULTS, skip = c.skip ? new RegExp(c.skip, 'i') : SKIP;
  const classOf = (t) => { if (skip.test(t)) return null; for (const a of c.also || []) if (new RegExp(a.match, 'i').test(t)) return a.id; return re.test(t) ? 'results' : null; };
  const entry = { ticker: c.ticker, name: c.name, channel: 'bmv', listUrl: url, listing: rows.slice(0, 14).map((r) => ({ date: r.date, title: r.title.slice(0, 160), id: r.id, kind: classOf(r.title) })), filings: [] };
  const count = {};
  for (const r of rows) {
    const kind = classOf(r.title); if (!kind || !r.pdf) continue;
    count[kind] = (count[kind] || 0) + 1;
    if (count[kind] > KEEP && !pins.has(r.date)) continue;
    const known = (prev.filings || []).find((f) => f.accn === `bmv${r.id}`);
    if (known && !force && known.exhibits.every((e) => existsSync(p(e.file)))) { entry.filings.push(known); continue; }
    let text = pdfToText(await getBuffer(r.pdf, { tries: 3, timeoutMs: 120_000 }), `${c.ticker}-${r.id}`);
    const full = text.length;
    if (full < 400) throw new Error(`the notice ${r.id} (${r.date}) has no text layer (${full} characters)`);
    if (full > MAX_CHARS) text = text.slice(0, MAX_CHARS) + `\n… (truncated: ${full - MAX_CHARS} more characters in the document)`;
    const file = `${DIR}${c.ticker}/${r.date}_bmv${r.id}.txt`;
    writeText(file, `# ${c.name} (${c.ticker}) · BMV, evento relevante · ${r.date} · ${r.title}\n# ${r.pdf}\n\n${text}\n`);
    entry.filings.push({ accn: `bmv${r.id}`, filed: r.date, kind, title: r.title, indexUrl: url, exhibits: [{ type: 'PDF', description: r.title, url: r.pdf, file, chars: full }] });
    await sleep(600);
  }
  // a release the curated figures cite that has left the BMV's first page keeps its stored text
  for (const f of prev.filings || []) if (pins.has(f.filed) && !entry.filings.some((x) => x.accn === f.accn) && f.exhibits.every((e) => existsSync(p(e.file)))) entry.filings.push(f);
  if (!entry.filings.some((f) => f.kind === 'results')) throw Object.assign(new Error(`no results release among the ${rows.length} notices on the BMV list (latest: "${rows[0].title.slice(0, 90)}")`), { entry });
  return entry;
}

// ---------- BMV, quarterly report (XBRL package) ----------
const MONTHS = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
// a table cell holds one figure or label: its inner paragraphs are flattened so a row stays on one line
const flatCells = (html) => html.replace(/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi, (m, t, inner) => `<td>${inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}</td>`);
async function harvestXbrl(c, prev, pins) {
  const url = `${BMV}/es/emisoras/informacionfinanciera/${c.bmv}`;
  const html = await getText(url, { tries: 3, timeoutMs: 60_000 });
  // rows of the quarterly table: date, "Información Del Trimestre N Del Año YYYY", link to the package
  const rows = [...html.matchAll(/<span>\s*(\d{1,2})-([A-Za-z]{3})-(\d{4})[^<]*<\/span>[\s\S]{0,400}?Informaci[oó]n Del Trimestre\s+(\d)\s+Del A[nñ]o\s+(\d{4})[\s\S]{0,600}?docins=\.\.\/ifrsxbrl\/(ifrsxbrl_(\d+)_[0-9-]+_\d+\.zip)/gi)]
    .map((m) => ({ filed: `${m[3]}-${String(MONTHS[m[2].toLowerCase()] || 0).padStart(2, '0')}-${m[1].padStart(2, '0')}`, quarter: `${m[5]}-Q${m[4]}`, zip: m[6], id: m[7] }))
    .filter((r) => !/-00-/.test(r.filed));
  if (!rows.length) throw new Error('no quarterly XBRL package is linked on the issuer\'s financial-information page');
  const entry = { ticker: c.ticker, name: c.name, channel: 'xbrl', listUrl: url, filings: [] };
  for (const r of rows.slice(0, KEEP)) {
    const known = (prev.filings || []).find((f) => f.accn === `xbrl${r.id}`);
    if (known && !force && known.exhibits.every((e) => existsSync(p(e.file)))) { entry.filings.push(known); continue; }
    mkdirSync(tmp, { recursive: true });
    const zip = join(tmp, `${c.ticker}-${r.id}.zip`), dir = join(tmp, `${c.ticker}-${r.id}`);
    writeFileSync(zip, await getBuffer(`${BMV}/docs-pub/ifrsxbrl/${r.zip}`, { tries: 3, timeoutMs: 180_000 }));
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir], { maxBuffer: 64 * 1024 * 1024 });
    const jf = readdirSync(dir).find((f) => /\.json$/i.test(f));
    if (!jf) throw new Error(`the package ${r.zip} holds no JSON document (${readdirSync(dir).join(', ').slice(0, 120)})`);
    const doc = JSON.parse(readFileSync(join(dir, jf), 'utf8'));
    const facts = Object.values(doc.HechosPorId || {}).filter((f) => typeof f.Valor === 'string' && f.Valor.length > 200 && /^(ifrs-mc_|mc_mx-cor)/.test(f.IdConcepto || ''));
    // the release itself first, then the results discussion, then the rest of the commentary
    const rank = (f) => (/ManagementCommentaryExplanatory$/.test(f.IdConcepto) ? 0 : /ResultsOfOperations/.test(f.IdConcepto) ? 1 : 2);
    facts.sort((a, b) => rank(a) - rank(b) || b.Valor.length - a.Valor.length);
    let text = facts.map((f) => `==== ${f.IdConcepto} ====\n${htmlToText(flatCells(f.Valor))}`).join('\n\n');
    const full = text.length;
    if (full < 1500) throw new Error(`the quarterly report ${r.quarter} carries no management commentary (${full} characters)`);
    if (full > MAX_CHARS) text = text.slice(0, MAX_CHARS) + `\n… (truncated: ${full - MAX_CHARS} more characters in the document)`;
    const view = `${BMV}/docs-pub/visor/visorXbrl.html?docins=../ifrsxbrl/${r.zip}`;
    const file = `${DIR}${c.ticker}/${r.filed}_xbrl${r.id}.txt`;
    writeText(file, `# ${c.name} (${c.ticker}) · BMV, reporte trimestral ${r.quarter} (XBRL), comentarios de la administración · presentado ${r.filed}\n# ${view}\n\n${text}\n`);
    entry.filings.push({ accn: `xbrl${r.id}`, filed: r.filed, kind: 'results', quarter: r.quarter, title: `Reporte trimestral ${r.quarter}`, indexUrl: url, exhibits: [{ type: 'XBRL', description: `Reporte trimestral ${r.quarter}, comentarios de la administración`, url: view, file, chars: full }] });
    rmSync(dir, { recursive: true, force: true }); rmSync(zip, { force: true });
  }
  // the page lists only the latest quarter: the previous one and any release the curated figures cite keep their stored text
  const older = (prev.filings || []).filter((f) => !entry.filings.some((x) => x.accn === f.accn) && f.exhibits.every((e) => existsSync(p(e.file)))).sort((a, b) => (a.filed < b.filed ? 1 : -1));
  for (const f of older) if (entry.filings.length < KEEP || pins.has(f.filed)) entry.filings.push(f);
  return entry;
}

// ---------- SEC EDGAR ----------
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
async function harvestSec(c, prev, pins) {
  const id = await cikOf(c.sec);
  if (!id) throw new Error(`ticker ${c.sec} not in the SEC ticker file`);
  const sub = await secGet(`https://data.sec.gov/submissions/CIK${cik10(id.cik)}.json`, 'json');
  const r = sub.filings.recent;
  const oldest = pins.size ? [...pins].sort()[0] : null;
  const entry = { ticker: c.ticker, name: c.name, channel: 'sec', cik: id.cik, secName: id.title, filings: [] };
  const fpi = c.form === '6-K';
  const matchRe = fpi ? new RegExp(c.match || 'results|quarter', 'i') : null;
  const skipped = new Set(fpi && !force && prev.match === c.match ? prev.skipped || [] : []);
  // a 6-K's results exhibit: EX-99 in HTML, or the filing's main document when it carries the release itself
  const docsOf = async (h) => {
    const rows = parseIndex(await secGet(`https://www.sec.gov/Archives/edgar/data/${id.cik}/${noDash(h.accn)}/${h.accn}-index.htm`)).filter((d) => /\.(htm|html|txt)$/i.test(d.href));
    const ex = rows.filter((d) => /^EX-99/i.test(d.type));
    return ex.length ? ex : rows.filter((d) => /^6-K$/i.test(d.type));
  };
  const hits = [];
  let opened = 0;
  for (let i = 0; i < r.form.length; i++) {
    const h = { accn: r.accessionNumber[i], filed: r.filingDate[i], report: r.reportDate[i], items: fpi ? '6-K' : r.items[i] };
    if (fpi) {
      if (r.form[i] !== '6-K' || skipped.has(h.accn)) continue;
      const wanted = hits.length < KEEP || pins.has(h.filed);
      if (!wanted && (!oldest || h.filed <= oldest)) break;
      const known = (prev.filings || []).find((f) => f.accn === h.accn);
      if (known) { hits.push(h); continue; }
      if (!wanted || opened >= 18) continue;   // at most 18 unknown 6-Ks are opened in a run
      opened++;
      let ok = false;
      for (const d of (await docsOf(h)).slice(0, 3)) { const t = htmlToText(await secGet(d.href.startsWith('http') ? d.href : 'https://www.sec.gov' + d.href)); if (t.length > 6000 && matchRe.test(t.slice(0, 6000))) { ok = true; break; } }
      if (ok) hits.push(h); else skipped.add(h.accn);
      continue;
    }
    if (r.form[i] !== '8-K' || !/(^|,)\s*2\.02(,|$)/.test(String(r.items[i] || ''))) continue;
    if (hits.length < KEEP || pins.has(h.filed)) hits.push(h);
    if (hits.length >= KEEP && (!oldest || h.filed <= oldest)) break;
  }
  if (!hits.length) throw new Error(fpi ? 'no Form 6-K with results among the recent filings' : 'no results 8-K (Item 2.02) among the recent filings');
  if (fpi) { entry.skipped = [...skipped].slice(-80); entry.match = c.match || null; }
  for (const h of hits) {
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${id.cik}/${noDash(h.accn)}/${h.accn}-index.htm`;
    const known = (prev.filings || []).find((f) => f.accn === h.accn);
    if (known && !force && known.exhibits.every((e) => existsSync(p(e.file)))) { entry.filings.push(known); continue; }
    const docs = fpi ? await docsOf(h) : parseIndex(await secGet(indexUrl)).filter((d) => /^EX-99/i.test(d.type) && /\.(htm|html|txt)$/i.test(d.href));
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
    entry.filings.push({ accn: h.accn, filed: h.filed, report: h.report, kind: 'results', items: h.items, indexUrl, exhibits });
  }
  return entry;
}

let done = 0;
for (const c of cfg.companies) {
  if (only.length && !only.includes(c.ticker)) continue;
  const prev = index.companies[c.ticker] || {};
  const kp = (kpis.companies || {})[c.ticker] || {};
  const pins = new Set([kp.filed, ...(kp.pins || [])].filter(Boolean));
  try {
    const entry = c.xbrl ? await harvestXbrl(c, prev, pins) : c.bmv ? await harvestBmv(c, prev, pins) : await harvestSec(c, prev, pins);
    // drop the texts of releases no longer kept
    const keepFiles = new Set(entry.filings.flatMap((f) => f.exhibits.map((e) => e.file.split('/').pop())));
    const dir = p(`${DIR}${c.ticker}`);
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (!keepFiles.has(f)) rmSync(`${dir}/${f}`);
    index.companies[c.ticker] = entry;
    done++;
    console.log(`${c.ticker}: ${entry.filings.map((f) => `${f.filed} ${f.kind} (${f.exhibits.reduce((a, e) => a + e.chars, 0)} chars)`).join(', ')}`);
  } catch (e) {
    // the list of notices is kept even when no results release was found, so the next pass can see what the issuer files
    if (e && e.entry) index.companies[c.ticker] = { ...prev, listing: e.entry.listing, listUrl: e.entry.listUrl, channel: 'bmv', ticker: c.ticker, name: c.name, filings: e.entry.filings.length ? e.entry.filings : prev.filings || [] };
    errors.push({ ticker: c.ticker, error: String((e && e.message) || e).slice(0, 300) });
    console.log(`::warning::${c.ticker}: ${(e && e.message) || e}`);
  }
  await sleep(c.bmv ? 1200 : 300);
}
const before = JSON.stringify({ ...readJson(DIR + 'index.json', {}), checkedAt: null, errors: null });
index.errors = errors;
const after = JSON.stringify({ ...index, checkedAt: null, errors: null });
// the check time is stamped only when something changed, so a quiet run commits nothing
if (before !== after || !index.checkedAt) index.checkedAt = nowIso();
writeJson(DIR + 'index.json', index);
// the disclosure channels as a source of the refresh: a run in which no company could be read counts as a failure in raw/status.json
if (!only.length) {
  const status = readJson(RAW + 'status.json', { sources: {} });
  const was = JSON.stringify(status);
  const st = (status.sources.releases = status.sources.releases || { failures: 0 });
  if (!done) { st.failures = (st.failures || 0) + 1; st.error = String(errors[0] ? errors[0].error : 'no company could be read').slice(0, 300); st.since = st.since || nowIso().slice(0, 10); }
  else if (st.failures || st.error) { st.failures = 0; delete st.error; delete st.since; }
  if (JSON.stringify(status) !== was) writeJson(RAW + 'status.json', status);
}
if (!done && !only.length) process.exit(1);
