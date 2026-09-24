// Sanity checks on the compiled airline files before they are committed. Non-zero exit = do not commit.
// Usage: node scripts/aeropuertos/airlines-validate.mjs site/aeropuertos/data/airlines.js site/aeropuertos/data/routes.js [prev-airlines.js]
import fs from 'node:fs'; import vm from 'node:vm';
const load = (f, name) => { const w = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w }); return w[name]; };
const A = load(process.argv[2] || 'site/aeropuertos/data/airlines.js', 'MX_AIRLINES');
const R = load(process.argv[3] || 'site/aeropuertos/data/routes.js', 'MX_ROUTES');
const prev = process.argv[4] && fs.existsSync(process.argv[4]) ? load(process.argv[4], 'MX_AIRLINES') : null;
const fails = [], warns = []; const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const n = A.months.length, last = n - 1;
for (let i = 1; i < n; i++) { const [y, m] = A.months[i - 1].split('-').map(Number); const exp = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; if (A.months[i] !== exp) fail(`months not contiguous at ${A.months[i]}`); }
if (A.lastMonth !== A.months[last]) fail('lastMonth mismatch');
const t = A.totals; const lastAll = t.all[last];
if (!(t.mxDom[last] > 3e6 && t.mxDom[last] < 9e6)) fail(`Mexican domestic passengers in ${A.lastMonth} implausible: ${t.mxDom[last]}`);
if (!(lastAll > 6e6 && lastAll < 16e6)) fail(`total passengers in ${A.lastMonth} implausible: ${lastAll}`);
if (last >= 12) { const r = lastAll / t.all[last - 12]; if (r < 0.7 || r > 1.3) fail(`total ${A.lastMonth} vs a year earlier ratio ${r.toFixed(2)}`); }
// carriers add up to the totals
const mx = A.carriers.filter((c) => c.group === 'mx' && c.pax), fo = A.carriers.filter((c) => c.group === 'foreign' && c.pax);
for (const i of [last, last - 1, last - 12].filter((i) => i >= 0)) {
  const d = mx.reduce((s, c) => s + c.pax.dom[i], 0), it = mx.reduce((s, c) => s + c.pax.intl[i], 0), f = fo.reduce((s, c) => s + c.pax.intl[i], 0);
  if (Math.abs(d - t.mxDom[i]) > 1 || Math.abs(it - t.mxIntl[i]) > 1 || Math.abs(f - t.foreignIntl[i]) > 1) fail(`carriers do not add up to totals in ${A.months[i]}`);
}
for (const id of ['VOI', 'VIV', 'AM']) { const c = mx.find((x) => x.id === id); if (!c) fail(`carrier ${id} missing`); else if (!(c.pax.dom[last] + c.pax.intl[last] > 100000)) fail(`${id} passengers in ${A.lastMonth} implausible: ${c.pax.dom[last] + c.pax.intl[last]}`); }
if (fo.length < 30) fail(`only ${fo.length} foreign carriers`);
// IR series: months contiguous-ish and load factors in range
for (const [id, s] of Object.entries(A.ir || {})) { if (!s.months.length) { warn(`${id}: empty IR series`); continue; } const lf = s.lf.total.filter((v) => v != null); if (lf.some((v) => v < 40 || v > 100)) fail(`${id}: load factor out of range`); if (s.months.at(-1) < A.lastMonth) warn(`${id}: IR series ends ${s.months.at(-1)}, before AFAC ${A.lastMonth}`); }
// networks
const nets = A.networks || {};
for (const id of ['VOI', 'VIV', 'AM']) { const nw = nets[id]; if (!nw) { warn(`network missing for ${id}`); continue; } if (nw.counts.airportsMx < 5) fail(`${id}: only ${nw.counts.airportsMx} Mexican airports in network`); }
// routes
if (R.domestic.length < 150) fail(`only ${R.domestic.length} domestic corridors`);
const okDom = R.domestic.filter((d) => d.ok).length; if (okDom / R.domestic.length < 0.9) fail(`domestic corridors mapped to codes: ${okDom}/${R.domestic.length}`);
if (R.international.length < 150) fail(`only ${R.international.length} international corridors`);
const coords = R.international.filter((d) => d.lat != null).length; if (coords / R.international.length < 0.9) fail(`international corridors with coordinates: ${coords}/${R.international.length}`);
if (R.window.to !== A.lastMonth) warn(`routes window ends ${R.window.to}, airlines ${A.lastMonth}`);
if (R.unmatched.length) warn(`unmatched origin-destination names: ${R.unmatched.join(', ')}`);
// never regress against the previously committed file
if (prev) {
  if (A.lastMonth < prev.lastMonth) fail(`AFAC last month went back: ${prev.lastMonth} -> ${A.lastMonth}`);
  for (const [id, s] of Object.entries(prev.ir || {})) { const cur = A.ir && A.ir[id]; if (s.months.length && (!cur || cur.months.length < s.months.length - 1)) fail(`${id}: IR series shrank`); }
  for (const [id, nw] of Object.entries(prev.networks || {})) { const cur = nets[id]; if (cur && nw.counts.airportsMx && cur.counts.airportsMx < 0.6 * nw.counts.airportsMx) fail(`${id}: network shrank from ${nw.counts.airportsMx} to ${cur.counts.airportsMx} Mexican airports`); }
}
for (const w of warns) console.log('WARN', w); for (const f of fails) console.log('FAIL', f);
console.log(`validate aerolineas: ${fails.length} failures, ${warns.length} warnings; AFAC to ${A.lastMonth}, ${mx.length} Mexican + ${fo.length} foreign carriers, IR: ${Object.keys(A.ir || {}).join('/')}, corridors ${R.domestic.length}+${R.international.length}`);
process.exit(fails.length ? 1 : 0);
