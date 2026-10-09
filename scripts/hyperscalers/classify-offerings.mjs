// Hyperscaler Hub: security type of each SEC-registered offering (424B prospectus) the hub lists from the filing-fee exhibits.
// The fee exhibit (ffd:TtlOfferingAmt) gives only the total, so the type is read from the prospectus cover: notes (debt), a
// common stock offering, mandatory convertible preferred (depositary shares) or an at-the-market program, whose amount is a
// ceiling for future sales, not proceeds. Runs on the automated job (www.sec.gov answers only clients with the declared
// User-Agent, repository variable EDGAR_USER_AGENT) for every 424B accession in tools/hyperscalers/data/filings.json that
// tools/hyperscalers/data/offerings.json does not carry yet; an accession it cannot classify is written with type null
// ("type pending" on the page) so a person reads the cover. Existing entries are never changed.
// Usage: node scripts/hyperscalers/classify-offerings.mjs [--force] [--accn=…,…]
import { readJson, writeJson, UA, TOOLS, accnPath } from './lib.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = new Set(((args.find((a) => a.startsWith('--accn=')) || '').split('=')[1] || '').split(',').filter(Boolean));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { companies } = await readJson(TOOLS + 'companies.json');
const filings = await readJson(TOOLS + 'data/filings.json', { companies: {} });
const cur = await readJson(TOOLS + 'data/offerings.json', { items: {} });
cur.items = cur.items || {};
const TODAY = new Date().toISOString().slice(0, 10);

function text(html) {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<ix:header[\s\S]*?<\/ix:header>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d|td)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
// the cover: the first printed page (up to the first page break), else the first 9,000 characters
function cover(html) { const first = html.split(/<[^>]+(?:page-break-(?:before|after)\s*:\s*always|break-(?:before|after)\s*:\s*page)[^>]*>/i)[0]; const t = text(first.length > 1500 ? first : html); return t.slice(0, 9000); }
const AMT = /(?:US?\$|€|£|¥|C\$|CHF|A\$)\s?[\d,]{5,}(?:\.\d+)?/;
function classify(cv) {
  const flat = cv.replace(/\s+/g, ' ');
  const line = (re) => { const m = re.exec(flat); if (!m) return null; const a = Math.max(0, m.index - 160), b = Math.min(flat.length, m.index + m[0].length + 160); return flat.slice(a, b).trim(); };
  if (/at-the-market|equity distribution agreement|sales agreement|\bATM program\b/i.test(flat) && /common stock|capital stock|ordinary shares/i.test(flat)) return { type: 'atm_program', quote: line(/at-the-market|equity distribution agreement|\bATM Program\b/i) };
  if (/mandatory convertible preferred|depositary shares?.{0,80}preferred stock/i.test(flat)) return { type: 'preferred', quote: line(/mandatory convertible preferred|depositary shares?/i) };
  if (/\bnotes due\b|\bdebentures\b|senior notes|floating rate notes/i.test(flat)) return { type: 'debt', quote: line(/[\d.]+%\s+(?:senior )?notes due \d{4}|floating rate notes due \d{4}|\bdebentures\b/i) };
  if (/shares of (?:our )?(?:class [a-c] )?(?:common|capital) stock|ordinary shares/i.test(flat)) return { type: 'common', quote: line(/shares of (?:our )?(?:class [a-c] )?(?:common|capital) stock|ordinary shares/i) };
  return { type: null, quote: null };
}
let done = 0, errors = 0;
for (const c of companies) {
  const list = ((filings.companies[c.ticker] || {}).filings || []).filter((f) => /^424B/.test(f.form) && f.doc && f.filed >= '2025-01-01');
  for (const f of list) {
    if (ONLY.size && !ONLY.has(f.accn)) continue;
    if (!FORCE && cur.items[f.accn]) continue;
    const url = `https://www.sec.gov/Archives/edgar/data/${c.cik}/${accnPath(f.accn)}/${f.doc}`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const cv = cover(await r.text());
      const k = classify(cv);
      const titleLine = (cv.split('\n').find((l) => AMT.test(l) && /notes|stock|shares|depositary/i.test(l)) || cv.split('\n').find((l) => AMT.test(l)) || '').trim().slice(0, 240);
      const cur2 = cur.items[f.accn] || {};
      cur.items[f.accn] = { ticker: c.ticker, type: k.type, currency: /€/.test(titleLine) ? 'EUR' : /£/.test(titleLine) ? 'GBP' : /¥/.test(titleLine) ? 'JPY' : /C\$/.test(titleLine) ? 'CAD' : /CHF/.test(titleLine) ? 'CHF' : 'USD', title: titleLine || null, quote: k.quote, classifiedOn: TODAY, method: 'cover-regex', ...(cur2.note_en ? { note_en: cur2.note_en, note_es: cur2.note_es } : {}) };
      done++;
      console.log(`  ${c.ticker} ${f.form} ${f.accn}: ${k.type || 'pending'} — ${titleLine.slice(0, 80)}`);
    } catch (e) { errors++; console.log(`  ERROR ${c.ticker} ${f.form} ${f.accn}: ${e.message}`); }
    await sleep(400);
  }
}
if (done) { cur.updatedAt = new Date().toISOString().slice(0, 19) + 'Z'; await writeJson(TOOLS + 'data/offerings.json', cur); }
console.log(`classify-offerings: ${done} prospectuses classified, ${errors} errors`);
