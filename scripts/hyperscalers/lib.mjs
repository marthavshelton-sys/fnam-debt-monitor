// Shared helpers for the Hyperscaler Hub pipeline (scripts/hyperscalers/*). Paths, the EDGAR fetcher with the
// SEC's required User-Agent, date and fiscal-period helpers, and the ET timestamp the pages print.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const ROOT = new URL('../../', import.meta.url);
export const p = (rel) => new URL(rel, ROOT);
export const TOOLS = 'tools/hyperscalers/';
export const SITE = 'site/hiperescaladores/';

// The SEC asks automated clients for a descriptive User-Agent with a contact. The repository variable
// EDGAR_USER_AGENT (already used by the Oracle pipeline) carries it on the runner; never hard-code an email.
export const UA = process.env.EDGAR_USER_AGENT || 'fnam.mx hyperscaler-hub (contact via repository)';

export async function readJson(rel, fallback = null) {
  try { return JSON.parse(await readFile(p(rel), 'utf8')); } catch { return fallback; }
}
export async function writeJson(rel, obj) {
  await mkdir(dirname(p(rel).pathname), { recursive: true });
  await writeFile(p(rel), JSON.stringify(obj, null, 1) + '\n', 'utf8');
}
export async function writeText(rel, text) {
  await mkdir(dirname(p(rel).pathname), { recursive: true });
  await writeFile(p(rel), text, 'utf8');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// SEC fair access: at most 10 requests per second; we stay far below with a pause between calls and
// retry only on 429/5xx (a 403 is a policy answer and is reported, not retried).
export async function secJson(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (r.ok) { await sleep(250); return r.json(); }
    last = new Error(`HTTP ${r.status} ${url}`);
    if (r.status !== 429 && r.status < 500) break;
    await sleep(2000 * (i + 1));
  }
  throw last;
}

export const cik10 = (cik) => String(cik).padStart(10, '0');
export const accnPath = (accn) => accn.replace(/-/g, '');
export const filingIndexUrl = (cik, accn) => `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accnPath(accn)}/${accn}-index.htm`;

export const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
// Duration class of a flow fact: 1 = quarter, 2 = six months, 3 = nine months, 4 = fiscal year; null otherwise.
export function durQ(start, end) {
  const d = days(start, end);
  if (d >= 80 && d <= 100) return 1;
  if (d >= 170 && d <= 190) return 2;
  if (d >= 260 && d <= 280) return 3;
  if (d >= 350 && d <= 380) return 4;
  return null;
}

// Fiscal quarter of a period end for a company whose fiscal year ends in month fyEnd (1-12). Fiscal year is
// named by the calendar year in which it ends (Microsoft FY2026 ends June 2026; Oracle FY2027 ends May 2027).
// Period ends that fall a few days into the next month (52/53-week calendars) are snapped to the month end before.
export function fiscalOf(end, fyEnd) {
  const d = new Date(end + 'T12:00:00Z');
  let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (d.getUTCDate() <= 7) { m -= 1; if (m === 0) { m = 12; y -= 1; } }
  const off = (m - fyEnd + 12) % 12;            // 0 = fiscal year-end month
  const q = off === 0 ? 4 : Math.ceil(off / 3);
  const fy = off === 0 ? y : (m > fyEnd ? y + 1 : y);
  return { fy, q, id: `FY${fy}Q${q}`, cal: calQuarter(y, m) };
}
// Calendar quarter a fiscal quarter is compared against: the calendar quarter containing the period's last month,
// except Oracle-style quarters ending in Feb/May/Aug/Nov, which are compared with the calendar quarter that ends
// one month later ("nearest calendar quarter", stated on the pages).
export function calQuarter(y, m) {
  const mm = m % 3 === 2 ? m + 1 : m;           // Feb→Mar, May→Jun, Aug→Sep, Nov→Dec
  return `${y}-Q${Math.ceil(mm / 3)}`;
}

// ---- harvested filing passages (tools/hyperscalers/raw/notes/<T>/<accn>.json) keyed "<TICKER> <form> <period end>",
// and the mechanical quote check every curated citation goes through: the quoted sentence must appear in the harvested
// text of the cited page ("page"), else on another page ("other_page") or nowhere ("not_found"). The check is automated
// and does not replace an analyst's review (reviewedBy).
export async function loadHarvest(companies) {
  const FILINGS = {};
  for (const c of companies) {
    let files = [];
    try { files = await readdir(p(`${TOOLS}raw/notes/${c.ticker}`)); } catch { continue; }
    for (const f of files) {
      const j = await readJson(`${TOOLS}raw/notes/${c.ticker}/${f}`);
      if (!j || !j.hits) continue;
      const pages = {};
      for (const h of j.hits) (pages[h.page] ||= []).push(h.text);
      FILINGS[`${c.ticker} ${j.form} ${j.report}`] = { ticker: c.ticker, form: j.form, accn: j.accn, url: j.url, filed: j.filed, report: j.report, harvested: j.harvested, pages };
    }
  }
  return FILINGS;
}
export const normQuote = (s) => String(s || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[\s ​]+/g, ' ').replace(/\s+([%,.)])/g, '$1').replace(/([$€£])\s+/g, '$1').trim().toLowerCase();
export function resolveCite(FILINGS, src) {
  if (!src || !src.k) return null;
  const f = FILINGS[src.k];
  if (!f) return { ...src, tier: 'T1', quoteCheck: 'no_harvest' };
  const q = normQuote(src.quote);
  let check = 'not_found', foundOn = null;
  if (q && (f.pages[src.page] || []).some((t) => normQuote(t).includes(q))) check = 'page';
  else if (q) for (const [pg, ts] of Object.entries(f.pages)) if (ts.some((t) => normQuote(t).includes(q))) { check = 'other_page'; foundOn = pg; break; }
  const printed = /^seq/.test(String(src.page)) ? null : src.page;
  return { k: src.k, tier: 'T1', form: f.form, accn: f.accn, url: f.url, filed: f.filed, report: f.report, page: printed, pageSeq: printed ? null : String(src.page).replace('seq', ''), section: src.section, quote: src.quote, quoteCheck: check, foundOn };
}

// Quote check for records that cite a filing by accession number (off-balance-sheet items, page citations): the quoted
// text, split at "…" / "..." into fragments, must appear in the harvested text of the cited page(s). Page spellings the
// curated files use: "78", "17–18", "121, 124", "not printed (130th page of the document)" → seq130. Bracketed insertions
// ("[million]") are editorial and are dropped before matching. Returns the harvested filing too (main document URL, filed date).
export function pagesOf(page) {
  // "17–18" → ['17','18']; "121, 124" → both; "not printed (130th page)" → ['seq130']; "124; 176th page (no printed number)" → ['124','seq176'].
  const s = String(page || '');
  const out = [];
  for (const m of s.matchAll(/(\d+)(?:st|nd|rd|th) page/g)) out.push('seq' + m[1]);
  const rest = s.replace(/(\d+)(?:st|nd|rd|th) page/g, ' ').replace(/\([^)]*\)/g, ' ');
  for (const x of rest.split(/[,;–\-]/)) { const t = x.trim(); if (/^(seq)?\d+$/.test(t)) out.push(t); }
  return out;
}
export function quoteCheckAccn(FILINGS, accn, page, quote) {
  const f = Object.values(FILINGS).find((x) => x.accn === accn) || null;
  if (!f) return { quoteCheck: 'no_harvest', foundOn: null, filing: null };
  const frags = String(quote || '').split(/\s*(?:\.\.\.|…)\s*/).map((q) => normQuote(q.replace(/\[[^\]]*\]/g, ' '))).filter((q) => q.length >= 12);
  const pages = pagesOf(page);
  // A fragment matches when every character is on the page; the fallback ignores spacing only, so a word the harvest split ("a nd") still counts.
  const hit = (t, q) => { const n = normQuote(t); return n.includes(q) || n.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')); };
  const onPages = (pgs) => frags.length > 0 && frags.every((q) => pgs.some((pg) => (f.pages[pg] || []).some((t) => hit(t, q))));
  let check = 'not_found', foundOn = null;
  if (pages.length && onPages(pages)) check = 'page';
  else { const all = Object.keys(f.pages); for (const pg of all) if (onPages([pg])) { check = 'other_page'; foundOn = pg; break; } if (check === 'not_found' && frags.length > 1 && onPages(all)) { check = 'other_page'; foundOn = all.filter((pg) => frags.some((q) => (f.pages[pg] || []).some((t) => hit(t, q)))).join(', '); } }
  return { quoteCheck: check, foundOn, filing: f };
}

// SEC periodic-report deadlines by filer category (Exchange Act Forms 10-Q and 10-K general instructions): 10-Q 40 days for
// large accelerated and accelerated filers, 45 for non-accelerated; 10-K 60 / 75 / 90 days; 20-F 120 days after the fiscal
// year-end. "Non-accelerated filer" must not match /accelerated/ loosely (CoreWeave is non-accelerated: 45 and 90 days).
export function filerDays(category) {
  const c = String(category || '').trim();
  if (/^large accelerated/i.test(c)) return { q: 40, k: 60, label: 'large accelerated filer' };
  if (/^accelerated/i.test(c)) return { q: 40, k: 75, label: 'accelerated filer' };
  return { q: 45, k: 90, label: c ? 'non-accelerated filer' : 'filer category unknown (non-accelerated deadlines assumed)' };
}
// A due date that falls on a weekend or an SEC holiday rolls to the next business day (Exchange Act Rule 0-3(a)).
// Federal holidays as observed by the SEC, 2026–2027.
const SEC_HOLIDAYS = new Set(['2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-10-11', '2027-11-11', '2027-11-25', '2027-12-24']);
export function rollBusinessDay(iso) {
  let d = new Date(iso + 'T12:00:00Z');
  for (let i = 0; i < 10; i++) {
    const s = d.toISOString().slice(0, 10), wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6 && !SEC_HOLIDAYS.has(s)) return s;
    d = new Date(d.getTime() + 864e5);
  }
  return d.toISOString().slice(0, 10);
}

// Internal provenance (who read or verified a record, and the tooling that did it) stays in the curated files; the site
// gets only verifiedHow ("automated" when the status is verified) and the ET instant. Applied to every object the
// generators write for the browser, so no tool name reaches a reader.
export function scrubProvenance(o) {
  if (Array.isArray(o)) { for (const x of o) scrubProvenance(x); return o; }
  if (!o || typeof o !== 'object') return o;
  if ('verifiedBy' in o || 'readBy' in o) {
    if (o.status && !('verifiedHow' in o)) o.verifiedHow = o.status === 'verified' || o.status === 'matched' ? 'automated' : null;
    delete o.verifiedBy; delete o.readBy;
  }
  for (const v of Object.values(o)) if (v && typeof v === 'object') scrubProvenance(v);
  return o;
}

// An ISO instant in US Eastern time, "YYYY-MM-DD HH:MM ET" (the only clock the hub prints)
export function etOf(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const s = d.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const [md, hm] = s.split(', ');
  const [mo, da, yr] = md.split('/');
  return `${yr}-${mo}-${da} ${hm.replace(/^24/, '00')} ET`;
}
export function nowET() {
  const d = new Date();
  return { iso: d.toISOString().slice(0, 19) + 'Z', et: etOf(d.toISOString()) };
}
