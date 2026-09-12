// Tie-out checks for the generated GAP data files. Exit code 1 on any failure, so the refresh workflow
// never commits a data set that does not reconcile. Tolerances are one unit of the printed precision.
import { readFile } from 'node:fs/promises';

async function load(rel, key) {
  const txt = await readFile(new URL(rel, import.meta.url), 'utf8');
  const i = txt.indexOf('{');
  const j = txt.lastIndexOf('}');
  return JSON.parse(txt.slice(i, j + 1));
}
const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);

const fin = await load('../../site/gap/data/financials.js');
const traffic = await load('../../site/gap/data/traffic.js');

// ---- financial statements
for (const q of [...fin.quarters, ...fin.years]) {
  const tag = q.id;
  const is = q.is, bs = q.bs, cf = q.cf;
  if (is) {
    if (is.revTotal != null && is.revAero != null && is.revNonAero != null) {
      const sum = is.revAero + is.revNonAero + (is.revConstruction || 0);
      if (!near(sum, is.revTotal, 3)) fail(`${tag} IS: revenue components ${sum} != total ${is.revTotal}`);
    }
    if (is.incomeBeforeTax != null && is.incomeTax != null && is.netIncome != null && !near(is.incomeBeforeTax + is.incomeTax, is.netIncome, 3)) fail(`${tag} IS: EBT ${is.incomeBeforeTax} + tax ${is.incomeTax} != net income ${is.netIncome}`);
    if (is.revTotal != null && is.totalOpCosts != null && is.opIncome != null && !near(is.revTotal - is.totalOpCosts, is.opIncome, 3)) fail(`${tag} IS: revenue − costs != operating income`);
    if (is.ebitda != null && is.opIncome != null && is.da != null && !near(is.opIncome + is.da, is.ebitda, 3)) warn(`${tag} IS: op income + D&A (${is.opIncome + is.da}) vs EBITDA ${is.ebitda} (other items may be added back)`);
    if (is.ebitdaMarginExIfric != null && is.revTotal != null && is.ebitda != null) {
      const m = 100 * is.ebitda / (is.revTotal - (is.revConstruction || 0));
      if (Math.abs(m - is.ebitdaMarginExIfric) > 0.25) fail(`${tag} IS: computed ex-IFRIC margin ${m.toFixed(1)} != reported ${is.ebitdaMarginExIfric}`);
    }
  }
  if (bs) {
    if (bs.totalAssets != null && bs.totalLiabEquity != null && !near(bs.totalAssets, bs.totalLiabEquity, 3)) fail(`${tag} BS: assets ${bs.totalAssets} != liabilities + equity ${bs.totalLiabEquity}`);
    if (bs.totalLiabilities != null && bs.totalEquity != null && bs.totalAssets != null && !near(bs.totalLiabilities + bs.totalEquity, bs.totalAssets, 10)) fail(`${tag} BS: liabilities + equity != assets`);
    if (bs.cash != null && bs.receivables != null && bs.otherCurrentAssets != null && bs.totalCurrentAssets != null && !near(bs.cash + bs.receivables + bs.otherCurrentAssets, bs.totalCurrentAssets, 10)) fail(`${tag} BS: current assets do not add up`);
  }
  if (cf) {
    if (cf.cashBegin != null && cf.netChangeCash != null && cf.cashEnd != null && !near(cf.cashBegin + cf.netChangeCash, cf.cashEnd, 3)) fail(`${tag} CF: begin ${cf.cashBegin} + change ${cf.netChangeCash} != end ${cf.cashEnd}`);
    if (cf.cfo != null && cf.cfi != null && cf.cff != null && cf.netChangeCash != null) {
      const sum = cf.cfo + cf.cfi + cf.cff + (cf.fxEffectCash || 0);
      if (!near(sum, cf.netChangeCash, 3)) fail(`${tag} CF: CFO+CFI+CFF+FX ${sum} != net change ${cf.netChangeCash}`);
    }
    if (bs && cf.cashEnd != null && bs.cash != null && !near(cf.cashEnd, bs.cash, 3)) fail(`${tag}: CF cash end ${cf.cashEnd} != BS cash ${bs.cash}`);
  }
}
// quarter continuity in the recent window
const ids = fin.quarters.map((q) => q.id);
const last = fin.quarters.at(-1);
for (let i = 1; i < 12; i++) {
  let fy = last.fy, q = last.q - i; while (q <= 0) { q += 4; fy--; }
  const id = `${fy}Q${q}`;
  const e = fin.quarters.find((x) => x.id === id);
  if (!e) fail(`missing quarter ${id} in the 12-quarter window`);
  else for (const part of ['is', 'bs', 'cf']) if (!e[part]) fail(`${id}: missing ${part}`);
}
// YTD vs quarters: 6M = 1Q + 2Q, etc. (revenue and net income)
for (const y of fin.ytd) {
  if (y.months === 3 || !y.is) continue;
  const n = y.months / 3;
  const qs = Array.from({ length: n }, (_, i) => fin.quarters.find((q) => q.id === `${y.fy}Q${i + 1}`));
  if (qs.some((q) => !q || !q.is)) continue;
  for (const k of ['revTotal', 'netIncome', 'ebitda']) {
    const sum = qs.reduce((a, q) => a + (q.is[k] ?? 0), 0);
    if (y.is[k] != null && !near(sum, y.is[k], 5)) fail(`${y.id}: sum of quarters ${k} ${sum} != YTD ${y.is[k]}`);
  }
}

// ---- traffic
for (const m of traffic.months) {
  for (const code of Object.keys(m.total)) {
    if (code === 'TOTAL') continue;
    const d = m.dom[code] ?? 0, i = m.intl[code] ?? 0;
    if (!near(d + i, m.total[code], 0.25)) fail(`traffic ${m.ym} ${code}: dom ${d} + intl ${i} != total ${m.total[code]}`);
  }
  const sum = Object.entries(m.total).filter(([c]) => c !== 'TOTAL').reduce((a, [, v]) => a + v, 0);
  if (m.total.TOTAL != null && !near(sum, m.total.TOTAL, 1.5)) fail(`traffic ${m.ym}: airports sum ${sum.toFixed(1)} != total ${m.total.TOTAL}`);
  if (Object.keys(m.total).length < 12) warn(`traffic ${m.ym}: only ${Object.keys(m.total).length} airports`);
}
// month continuity since 2019-01
const months = traffic.months.map((m) => m.ym);
let cur = '2019-01';
while (cur <= months.at(-1)) {
  if (!months.includes(cur)) fail(`traffic: missing month ${cur}`);
  let [y, mo] = cur.split('-').map(Number); mo++; if (mo > 12) { mo = 1; y++; }
  cur = `${y}-${String(mo).padStart(2, '0')}`;
}

for (const w of warns) console.log('WARN ' + w);
for (const f of fails) console.error('FAIL ' + f);
console.log(`validate-data: ${fails.length} failures, ${warns.length} warnings; ${fin.quarters.length} quarters, ${fin.years.length} years, ${traffic.months.length} traffic months`);
if (fails.length) process.exit(1);
