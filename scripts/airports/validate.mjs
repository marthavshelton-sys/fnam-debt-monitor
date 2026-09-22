// Tie-out checks for the generated airport-model data files. Usage: node scripts/airports/validate.mjs --company=asur|oma
// Exit code 1 on any failure, so the refresh workflow never commits a data set that does not reconcile.
import { readFile } from 'node:fs/promises';

const COMPANY = (process.argv.find((a) => a.startsWith('--company=')) || '').split('=')[1];
if (!['asur', 'oma'].includes(COMPANY)) { console.error('usage: validate.mjs --company=asur|oma'); process.exit(2); }
async function load(rel) { const txt = await readFile(new URL(rel, import.meta.url), 'utf8'); return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); }
const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const MIN_AIRPORTS = { asur: 16, oma: 13 }[COMPANY];
const TRAFFIC_FROM = '2019-01';

const fin = await load(`../../site/${COMPANY}/data/financials.js`);
const traffic = await load(`../../site/${COMPANY}/data/traffic.js`);

for (const q of [...fin.quarters, ...fin.years]) {
  const tag = q.id, is = q.is, bs = q.bs, cf = q.cf;
  if (is) {
    if (is.revTotal != null && is.revAero != null && is.revNonAero != null) {
      const sum = is.revAero + is.revNonAero + (is.revConstruction || 0);
      if (!near(sum, is.revTotal, 3)) fail(`${tag} IS: revenue components ${sum} != total ${is.revTotal}`);
    }
    if (is.incomeBeforeTax != null && is.incomeTax != null && is.netIncome != null && !near(is.incomeBeforeTax - is.incomeTax, is.netIncome, 3)) fail(`${tag} IS: EBT ${is.incomeBeforeTax} − tax ${is.incomeTax} != net income ${is.netIncome}`);
    if (is.revTotal != null && is.totalOpCosts != null && is.opIncome != null && !near(is.revTotal - is.totalOpCosts + (is.otherRevenues || 0), is.opIncome, 3)) fail(`${tag} IS: revenue − costs != operating income (${is.revTotal} − ${is.totalOpCosts} vs ${is.opIncome})`);
    if (is.revConstruction != null && is.costConstruction != null && COMPANY === 'oma' && !near(is.revConstruction, is.costConstruction, 3)) fail(`${tag} IS: IFRIC 12 construction revenue ${is.revConstruction} != cost ${is.costConstruction}`);
    if (is.ebitda != null && is.revTotal && is.ebitdaMarginExIfric != null) {
      const base = COMPANY === 'oma' ? (is.revExConstruction || (is.revAero + is.revNonAero)) : is.revTotal - (is.revConstruction || 0);
      if (Math.abs(100 * is.ebitda / base - is.ebitdaMarginExIfric) > 0.25) fail(`${tag} IS: computed ex-IFRIC margin ${(100 * is.ebitda / base).toFixed(1)} != stored ${is.ebitdaMarginExIfric}`);
    }
    if (is.netIncome != null && is.comprehensiveControlling != null && is.nci != null && !near(is.comprehensiveControlling + is.nci, is.netIncome, 3)) fail(`${tag} IS: controlling ${is.comprehensiveControlling} + NCI ${is.nci} != net income ${is.netIncome}`);
    if (is.netIncome != null && is.netIncomeMajority != null && is.nci != null && !near(is.netIncomeMajority + is.nci, is.netIncome, 3)) fail(`${tag} IS: majority ${is.netIncomeMajority} + NCI ${is.nci} != net income ${is.netIncome}`);
  }
  if (bs) {
    if (bs.totalAssets != null && bs.totalLiabEquity != null && !near(bs.totalAssets, bs.totalLiabEquity, 3)) fail(`${tag} BS: assets ${bs.totalAssets} != liabilities + equity ${bs.totalLiabEquity}`);
    if (bs.totalLiabilities != null && bs.totalEquity != null && bs.totalAssets != null && !near(bs.totalLiabilities + bs.totalEquity, bs.totalAssets, 10)) fail(`${tag} BS: liabilities ${bs.totalLiabilities} + equity ${bs.totalEquity} != assets ${bs.totalAssets}`);
    if (bs.totalCurrentAssets != null && bs.totalAssets != null && bs.totalCurrentAssets > bs.totalAssets) fail(`${tag} BS: current assets exceed total assets`);
  }
  if (cf) {
    if (cf.cashBegin != null && cf.netChangeCash != null && cf.cashEnd != null && !near(cf.cashBegin + cf.netChangeCash + (cf.fxEffectCash || 0), cf.cashEnd, 3)) fail(`${tag} CF: begin ${cf.cashBegin} + change ${cf.netChangeCash} + fx ${cf.fxEffectCash || 0} != end ${cf.cashEnd}`);
    if (cf.cfo != null && cf.cfi != null && cf.cff != null && cf.netChangeCash != null && !near(cf.cfo + cf.cfi + cf.cff, cf.netChangeCash, 3)) fail(`${tag} CF: CFO+CFI+CFF ${cf.cfo + cf.cfi + cf.cff} != net change ${cf.netChangeCash}`);
    if (bs && cf.cashEnd != null && bs.cash != null && !near(cf.cashEnd, bs.cash, 3)) fail(`${tag}: CF cash end ${cf.cashEnd} != BS cash ${bs.cash}`);
  }
}
// quarter continuity + completeness in the 12-quarter window
const last = fin.quarters.at(-1);
if (!last) fail('no quarters');
else for (let i = 0; i < 12; i++) {
  let fy = last.fy, q = last.q - i; while (q <= 0) { q += 4; fy--; }
  const id = `${fy}Q${q}`; const e = fin.quarters.find((x) => x.id === id);
  if (!e) fail(`missing quarter ${id} in the 12-quarter window`);
  else for (const part of ['is', 'bs', 'cf']) if (!e[part] || !Object.keys(e[part]).length) fail(`${id}: missing ${part}`);
}
// YTD vs quarters (revenue, net income, EBITDA)
for (const y of fin.ytd) {
  if (y.months === 3 || !y.is) continue;
  const n = y.months / 3;
  const qs = Array.from({ length: n }, (_, i) => fin.quarters.find((q) => q.id === `${y.fy}Q${i + 1}`));
  if (qs.some((q) => !q || !q.is)) continue;
  for (const k of ['revTotal', 'netIncome', 'ebitda']) {
    if (qs.some((q) => q.is[k] == null) || y.is[k] == null) continue;
    const sum = qs.reduce((a, q) => a + q.is[k], 0);
    if (near(sum, y.is[k], 5)) continue;
    // small differences are restatements of an earlier quarter in a later release (quarters are kept as originally reported)
    if (Math.abs(sum - y.is[k]) / Math.abs(y.is[k] || 1) < 0.01) warn(`${y.id}: sum of quarters ${k} ${sum} != YTD ${y.is[k]} (restated in a later release)`);
    else fail(`${y.id}: sum of quarters ${k} ${sum} != YTD ${y.is[k]}`);
  }
}
// traffic
for (const m of traffic.months) {
  for (const code of Object.keys(m.total)) {
    if (code === 'TOTAL') continue;
    const d = m.dom[code], i = m.intl[code];
    if (d != null && i != null && !near(d + i, m.total[code], 0.002)) fail(`traffic ${m.ym} ${code}: dom ${d} + intl ${i} != total ${m.total[code]}`);
  }
  const sum = Object.entries(m.total).filter(([c]) => c !== 'TOTAL').reduce((a, [, v]) => a + v, 0);
  if (m.total.TOTAL != null && !near(sum, m.total.TOTAL, 0.05)) fail(`traffic ${m.ym}: airports sum ${sum.toFixed(3)} != total ${m.total.TOTAL}`);
  if (m.ym >= TRAFFIC_FROM && Object.keys(m.total).filter((c) => c !== 'TOTAL').length < MIN_AIRPORTS) warn(`traffic ${m.ym}: only ${Object.keys(m.total).length - 1} airports`);
}
const months = traffic.months.map((m) => m.ym);
let cur = TRAFFIC_FROM;
while (months.length && cur <= months.at(-1)) {
  if (!months.includes(cur)) fail(`traffic: missing month ${cur}`);
  let [y, mo] = cur.split('-').map(Number); mo++; if (mo > 12) { mo = 1; y++; }
  cur = `${y}-${String(mo).padStart(2, '0')}`;
}
for (const w of warns) console.log('WARN ' + w);
for (const f of fails) console.error('FAIL ' + f);
console.log(`validate ${COMPANY}: ${fails.length} failures, ${warns.length} warnings; ${fin.quarters.length} quarters, ${fin.years.length} years, ${traffic.months.length} traffic months`);
if (fails.length) process.exit(1);
