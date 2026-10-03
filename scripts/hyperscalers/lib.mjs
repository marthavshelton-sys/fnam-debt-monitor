// Shared helpers for the Hyperscaler Hub pipeline (scripts/hyperscalers/*). Paths, the EDGAR fetcher with the
// SEC's required User-Agent, date and fiscal-period helpers, and the ET timestamp the pages print.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
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

export function nowET() {
  const d = new Date();
  const s = d.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const [md, hm] = s.split(', ');
  const [mo, da, yr] = md.split('/');
  return { iso: d.toISOString().slice(0, 19) + 'Z', et: `${yr}-${mo}-${da} ${hm.replace(/^24/, '00')} ET` };
}
