// Hyperscaler Hub: harvest the off-balance-sheet notes from each company's latest 10-K and 10-Q (and the 20-F for
// Nebius). Runs on the GitHub runner (www.sec.gov answers only clients with the declared User-Agent the SEC asks for;
// repository variable EDGAR_USER_AGENT). For every filing not yet harvested it downloads the primary document, splits
// it into printed pages, and keeps the passages that matter for module 6, each with its page number:
//   leases not yet commenced · residual value guarantees · variable interest entities / maximum exposure to loss ·
//   equity-method investees · guarantees · purchase / take-or-pay commitments · special-purpose / developer vehicles
// Output: tools/hyperscalers/raw/notes/<TICKER>/<accession>.json (passages and dollar amounts found in them).
// Nothing here reaches the page directly: a person or the automated second read goes through the passages, confirms the figure
// against the cited page and records it in tools/hyperscalers/data/offbs.json ("needs review" until then).
// Usage: node scripts/hyperscalers/harvest-notes.mjs [--force] [--ticker=MSFT] [--accn=0001193125-26-027207,…]
// (--accn harvests named older filings too, e.g. the quarters cited by tools/hyperscalers/data/outliers.json)
import { readJson, writeJson, UA, TOOLS, accnPath } from './lib.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = (args.find((a) => a.startsWith('--ticker=')) || '').split('=')[1] || null;
const EXTRA = new Set(((args.find((a) => a.startsWith('--accn=')) || '').split('=')[1] || '').split(',').filter(Boolean));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KINDS = [
  ['leases_not_commenced', /(not yet commenced|have not commenced|has not commenced|yet to commence|not commenced|additional (?:operating |finance )?lease(?:s| commitments)? .{0,120}(?:commence|not reflected))/i],
  ['rvg', /residual value guarantee/i],
  ['vie', /variable interest entit|maximum exposure to loss|primary beneficiary/i],
  ['equity_method', /equity[- ]method (?:investee|investment)|joint venture/i],
  ['guarantee', /\bguarantee(?:s|d)?\b(?!.{0,40}residual)/i],
  ['purchase_obligation', /purchase obligations?|purchase commitments?|take-or-pay|minimum (?:purchase|payment) commitments?/i],
  ['spv', /special[- ]purpose (?:vehicle|entit)|build-to-suit|construction (?:period|agreement) .{0,80}lessor|sale[- ]leaseback/i],
  // phase 2-3: capacity, sites, power, accelerators, customer concentration and related-party flows
  ['capacity', /\b\d[\d,.]*\s*(?:MW|megawatts?|GW|gigawatts?)\b|(?:active|contracted|critical IT|IT load|power(?:ed)?) capacity/i],
  ['properties', /\b(?:Item|ITEM)\s*2\.?\s*(?:Properties|PROPERTIES)\b|data cent(?:er|re)s? (?:located )?in [A-Z][a-z]+|campus (?:in|located)/],
  ['power', /power purchase agreement|\bPPAs?\b|nuclear|small modular reactor|natural gas|interconnection|electric(?:ity)? (?:supply|service) agreement|utility/i],
  ['gpu', /\bGPUs?\b|accelerators?\b|\bNVIDIA\b|Blackwell|\bGB[23]00\b|\bH[12]00\b/],
  // round 3 (2026-10-04): the payoff side and the cost of money — segment results, RPO timing, useful lives and
  // depreciation, credit ratings
  ['segment', /segment operating income|segment information|segment results|Intelligent Cloud|Microsoft Cloud|Google Cloud|Oracle Cloud Infrastructure|cloud services and license support|\bAWS\b.{0,60}(?:net sales|operating income)/i],
  ['rpo', /remaining performance obligations?|\bRPO\b|commercial remaining performance/i],
  ['useful_life', /useful li(?:fe|ves)|depreciable li(?:fe|ves)|estimated li(?:fe|ves) of (?:our )?servers/i],
  ['depreciation', /depreciation expense|depreciation and amortization expense/i],
  ['estimate_change', /effect of (?:this|the) change in (?:accounting )?estimate|financial impact of this change|change in (?:accounting )?estimate will/i],
  ['credit_rating', /credit ratings?|Moody's|Standard (?:&|and) Poor's|S&P Global Ratings|\bFitch\b|investment[- ]grade/i],
  // round 4 (2026-10-04): cash-flow statement lines and financing events behind the quarterly outlier checks (tools/hyperscalers/data/outliers.json)
  ['cash_flow', /Repayments of (?:long-term )?debt\b|Proceeds from (?:issuances? of )?(?:long-term debt|common stock|convertible notes|medium-term notes)|Net cash (?:provided by|from) (?:\(used in\) )?operating activities|at-the-market|closed a \$\s?[\d.]+ billion offering|Deferred revenue[ ,]|contract prepayments|revolving credit facilit|Notes issuance of|Convertible Senior Notes due|entered into a Credit Agreement|we issued (?:fixed-rate )?senior unsecured notes|Proceeds from issuance of debt|Equity Offering, net of issuance costs|Financing cash flows used for finance leases/i],
  ['concentration', /\d{1,3}(?:\.\d)?%\s+of\s+(?:our\s+)?(?:total\s+)?revenue|significant customer|customer concentration|largest customer|related part(?:y|ies)|\bOpenAI\b|\bAnthropic\b|\bMicrosoft\b|\bNVIDIA\b/]
];

function decode(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&rsquo;|&lsquo;/g, "'").replace(/&rdquo;|&ldquo;/g, '"').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
}
function text(html) { return decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<ix:header[\s\S]*?<\/ix:header>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim(); }
// Pages: the filings mark page breaks with CSS page-break / break-before; the printed page number is the last short
// numeric line of each page (falls back to the sequence number, prefixed "seq").
function pages(html) {
  const parts = html.split(/<[^>]+(?:page-break-(?:before|after)\s*:\s*always|break-(?:before|after)\s*:\s*page)[^>]*>/i);
  return parts.map((h, i) => {
    const t = text(h);
    const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
    let num = null;
    for (let k = lines.length - 1; k >= Math.max(0, lines.length - 4); k--) { if (/^\d{1,3}$/.test(lines[k])) { num = lines[k]; break; } }
    return { page: num || `seq${i + 1}`, text: t };
  });
}
function amounts(s) {
  const out = [];
  const re = /\$\s?([\d,.]+)\s*(billion|million|thousand)?/gi;
  let m;
  while ((m = re.exec(s))) {
    const v = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(v)) continue;
    const mult = /billion/i.test(m[2] || '') ? 1000 : /million/i.test(m[2] || '') ? 1 : /thousand/i.test(m[2] || '') ? 0.001 : null;
    out.push({ raw: m[0], usdM: mult == null ? null : Math.round(v * mult * 1000) / 1000 });
  }
  return out;
}

const SELF = { MSFT: /Microsoft/, NBIS: /Nebius/ };
const { companies } = await readJson(TOOLS + 'companies.json');
const filings = await readJson(TOOLS + 'data/filings.json', { companies: {} });
const state = await readJson(TOOLS + 'data/state.json', {});
state.notes = state.notes || {};
let done = 0, errors = 0;
for (const c of companies) {
  if (ONLY && c.ticker !== ONLY) continue;
  const list = (filings.companies[c.ticker] || {}).filings || [];
  const pick = [list.find((f) => /^10-K$|^20-F$/.test(f.form)), list.find((f) => f.form === '10-Q')].filter(Boolean);
  for (const f of list) if (EXTRA.has(f.accn) && !pick.includes(f)) pick.push(f);
  for (const f of pick) {
    if (!FORCE && state.notes[f.accn]) continue;
    if (!f.doc) continue;
    const url = `https://www.sec.gov/Archives/edgar/data/${c.cik}/${accnPath(f.accn)}/${f.doc}`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const html = await r.text();
      const pg = pages(html);
      const hits = [];
      const perKind = {};
      // passages: a window around each match (tables often precede the sentence that matters, so the window is
      // centred on the match rather than on sentence boundaries); overlapping matches of one kind are merged
      for (const p of pg) {
        const flat = p.text.replace(/\n/g, ' ');
        for (const [kind, re] of KINDS) {
          const g = new RegExp(re.source, 'gi');
          let m, lastEnd = -1;
          while ((m = g.exec(flat))) {
            if (m.index < lastEnd) continue;
            // a company names itself everywhere: skip self-mentions, and cap each kind so a filing stays reviewable
            if (kind === 'concentration' && SELF[c.ticker] && SELF[c.ticker].test(m[0])) continue;
            if ((perKind[kind] = (perKind[kind] || 0) + 1) > 150) break;
            const a = Math.max(0, m.index - 500), b = Math.min(flat.length, m.index + 900);
            lastEnd = b;
            const near = flat.slice(Math.max(0, m.index - 250), Math.min(flat.length, m.index + 400));
            hits.push({ kind, page: p.page, match: m[0], text: (a > 0 ? '…' : '') + flat.slice(a, b) + (b < flat.length ? '…' : ''), amounts: amounts(near) });
          }
        }
      }
      await writeJson(`${TOOLS}raw/notes/${c.ticker}/${f.accn}.json`, { ticker: c.ticker, cik: c.cik, form: f.form, accn: f.accn, filed: f.filed, report: f.report, url, harvested: new Date().toISOString().slice(0, 10), pageCount: pg.length, numberedPages: pg.filter((p) => !String(p.page).startsWith('seq')).length, hits });
      state.notes[f.accn] = { ticker: c.ticker, form: f.form, filed: f.filed, harvested: new Date().toISOString().slice(0, 10), hits: hits.length, status: 'pending_review' };
      done++;
      console.log(`  ${c.ticker} ${f.form} ${f.accn}: ${pg.length} pages, ${hits.length} passages`);
    } catch (e) { errors++; console.log(`  ERROR ${c.ticker} ${f.form} ${f.accn}: ${e.message}`); }
    await sleep(400);
  }
}
await writeJson(TOOLS + 'data/state.json', state);
console.log(`harvest-notes: ${done} filings harvested, ${errors} errors`);
