// Sanity checks on the compiled airports traffic file before it is committed. Non-zero exit = do not commit.
import fs from 'node:fs'; import vm from 'node:vm';
const load = (f) => { const w = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w }); return w.MX_AIRPORTS; };
const D = load(process.argv[2] || 'site/aeropuertos/data/traffic.js');
const prev = process.argv[3] && fs.existsSync(process.argv[3]) ? load(process.argv[3]) : null;
const fails = [], warns = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const ym = (i) => D.months[i];
// months contiguous
for (let i = 1; i < D.months.length; i++) { const [y, m] = D.months[i - 1].split('-').map(Number); const exp = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; if (D.months[i] !== exp) fail(`months not contiguous at ${D.months[i]}`); }
if (D.lastMonth !== D.months[D.months.length - 1]) fail('lastMonth mismatch');
const nat = D.national.pax, n = D.months.length, last = n - 1;
const tot = (s, i) => (s.dom[i] || 0) + (s.intl[i] || 0);
if (!(tot(nat, last) > 5e6)) fail(`national passengers in ${ym(last)} implausible: ${tot(nat, last)}`);
if (last >= 12) { const r = tot(nat, last) / tot(nat, last - 12); if (r < 0.6 || r > 1.4) fail(`national passengers ${ym(last)} vs a year earlier ratio ${r.toFixed(2)}`); }
// groups add up to the national total
for (const i of [last, last - 1, last - 12].filter((i) => i >= 0)) { const g = Object.values(D.byGroup).reduce((a, s) => a + tot(s.pax, i), 0); if (Math.abs(g - tot(nat, i)) > 1) fail(`groups ${g} != national ${tot(nat, i)} in ${ym(i)}`); }
// airports: every airport with data has the national month count
for (const a of D.airports) { if (a.pax && a.pax.dom.length && a.pax.dom.length !== n - D.months.indexOf(D.airportsFrom)) warn(`${a.code}: ${a.pax.dom.length} airport months vs ${n - D.months.indexOf(D.airportsFrom)}`); }
// AICM
const am = D.aicm.months; for (let i = 1; i < am.length; i++) { const [y, m] = am[i - 1].split('-').map(Number); const exp = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; if (am[i] !== exp) fail(`AICM months not contiguous at ${am[i]}`); }
const aLast = am.length - 1; if (aLast >= 0) { const v = (D.aicm.pax.dom[aLast] || 0) + (D.aicm.pax.intl[aLast] || 0); if (!(v > 1.5e6 && v < 6e6)) fail(`AICM passengers in ${am[aLast]} implausible: ${v}`); if (am[aLast] > D.lastMonth) { const [y, m] = D.lastMonth.split('-').map(Number); const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; if (am[aLast] > next) fail(`AICM month ${am[aLast]} more than one month ahead of AFAC ${D.lastMonth}`); } }
// AIFA counters never go down
if (!(D.aifa && D.aifa.pax > 1e6 && D.aifa.ops > 1e4 && /^\d{4}-\d{2}-\d{2}$/.test(D.aifa.asOf))) fail('AIFA counters missing or implausible');
// sources
if (!(D.sources && D.sources.afac && /^\d{4}-\d{2}-\d{2}$/.test(D.sources.afac.published) && D.sources.afac.file)) fail('AFAC source file/date missing');
if (!(D.sources.aicm && /^\d{4}-\d{2}-\d{2}$/.test(D.sources.aicm.updated))) fail('AICM source date missing');
// never regress against the previously committed file
if (prev) {
  if (D.lastMonth < prev.lastMonth) fail(`AFAC last month went back: ${prev.lastMonth} -> ${D.lastMonth}`);
  if (am[aLast] < prev.aicm.months[prev.aicm.months.length - 1]) fail(`AICM last month went back`);
  if (D.aifa.pax < prev.aifa.pax || D.aifa.ops < prev.aifa.ops) fail(`AIFA counters went down: pax ${prev.aifa.pax} -> ${D.aifa.pax}, ops ${prev.aifa.ops} -> ${D.aifa.ops}`);
  const k = Math.min(prev.months.length, n) - 1; for (const i of [k - 1, k - 6, k - 13].filter((i) => i > 0)) { const a = tot(prev.national.pax, i), b = tot(nat, i); if (a && Math.abs(b / a - 1) > 0.02) warn(`national ${ym(i)} revised ${a} -> ${b}`); }
}
for (const w of warns) console.log('WARN', w); for (const f of fails) console.log('FAIL', f);
console.log(`validate aeropuertos: ${fails.length} failures, ${warns.length} warnings; AFAC to ${D.lastMonth}, AICM to ${am[aLast]}, AIFA as of ${D.aifa.asOf}`);
process.exit(fails.length ? 1 : 0);
