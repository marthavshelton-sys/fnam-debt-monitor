// Tie-out checks for the generated GAP data files, plus the data-health report for site/gap/quality.html.
// Exit code 1 on any failure, so the refresh workflow never commits a data set that does not reconcile.
// Tolerances are one unit of the printed precision (thousands of pesos; thousands of passengers).
// Every identity evaluated (ok / warn / fail), the freshness of each series, the state of the curated files,
// the origin of every quarter and the last build's parse warnings are written to site/gap/data/quality.js
// (window.GAP_QUALITY) by scripts/lib/quality-report.mjs.
import { readFile } from 'node:fs/promises';
import { createReport, expectedQuarter, expectedMonth, ageDays } from '../lib/quality-report.mjs';

async function load(rel) {
  const txt = await readFile(new URL(rel, import.meta.url), 'utf8');
  return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
}
async function loadJs(rel, key) {
  const s = await readFile(new URL(rel, import.meta.url), 'utf8');
  const i = s.indexOf('window.' + key); const j = s.indexOf('=', i) + 1;
  let b = s.slice(j).trim(); if (b.endsWith(';')) b = b.slice(0, -1);
  return Function('return (' + b + ')')();
}
const Q = createReport({
  slug: 'gap', key: 'GAP_QUALITY', generator: 'scripts/gap/validate-data.mjs',
  diffUnit: { es: 'Diferencia (Ps. miles / miles de pasajeros)', en: 'Difference (Ps. thousand / thousand passengers)' },
  tolerances: { es: 'Tolerancias: Ps. 3 mil en identidades de los estados financieros (redondeo de las cifras impresas), Ps. 10 mil en subtotales del balance, Ps. 5 mil en la suma de trimestres contra el acumulado, 0.25 pp en el margen sin IFRIC 12, 250 pasajeros por aeropuerto y 1,500 en el total mensual de tráfico. Toda diferencia mayor es una falla y detiene la publicación; los avisos no la detienen.', en: 'Tolerances: Ps. 3 thousand on statement identities (rounding of the printed figures), Ps. 10 thousand on balance-sheet subtotals, Ps. 5 thousand on the sum of quarters against the year-to-date column, 0.25 pp on the ex-IFRIC 12 margin, 250 passengers per airport and 1,500 on the monthly traffic total. Any larger gap is a failure and blocks publication; warnings do not.' },
});
const { record, identity } = Q;

const fin = await load('../../site/gap/data/financials.js');
const traffic = await load('../../site/gap/data/traffic.js');
const guidance = await load('../../site/gap/data/guidance.js');

// ---- financial statements
for (const q of [...fin.quarters, ...fin.years]) {
  const tag = q.id;
  const is = q.is, bs = q.bs, cf = q.cf;
  if (is) {
    if (is.revTotal != null && is.revAero != null && is.revNonAero != null) identity(tag, 'IS: aeronautical + non-aeronautical + construction = total revenue', is.revAero + is.revNonAero + (is.revConstruction || 0), is.revTotal, 3);
    identity(tag, 'IS: income before tax + tax = net income', is.incomeBeforeTax != null && is.incomeTax != null ? is.incomeBeforeTax + is.incomeTax : null, is.netIncome, 3);
    identity(tag, 'IS: revenue − operating costs = operating income', is.revTotal != null && is.totalOpCosts != null ? is.revTotal - is.totalOpCosts : null, is.opIncome, 3);
    identity(tag, 'IS: operating income + D&A = EBITDA', is.opIncome != null && is.da != null ? is.opIncome + is.da : null, is.ebitda, 3, { soft: true, note: { es: 'GAP puede sumar otras partidas al EBITDA', en: 'GAP may add other items back to EBITDA' } });
    if (is.ebitdaMarginExIfric != null && is.revTotal != null && is.ebitda != null) identity(tag, 'IS: computed ex-IFRIC 12 margin = reported margin (pp)', 100 * is.ebitda / (is.revTotal - (is.revConstruction || 0)), is.ebitdaMarginExIfric, 0.25);
  }
  if (bs) {
    identity(tag, 'BS: assets = liabilities + equity (printed total)', bs.totalAssets, bs.totalLiabEquity, 3);
    identity(tag, 'BS: liabilities + equity = assets', bs.totalLiabilities != null && bs.totalEquity != null ? bs.totalLiabilities + bs.totalEquity : null, bs.totalAssets, 10);
    identity(tag, 'BS: cash + receivables + other = current assets', bs.cash != null && bs.receivables != null && bs.otherCurrentAssets != null ? bs.cash + bs.receivables + bs.otherCurrentAssets : null, bs.totalCurrentAssets, 10);
  }
  if (cf) {
    identity(tag, 'CF: opening cash + net change = closing cash', cf.cashBegin != null && cf.netChangeCash != null ? cf.cashBegin + cf.netChangeCash : null, cf.cashEnd, 3);
    identity(tag, 'CF: CFO + CFI + CFF + FX = net change in cash', cf.cfo != null && cf.cfi != null && cf.cff != null ? cf.cfo + cf.cfi + cf.cff + (cf.fxEffectCash || 0) : null, cf.netChangeCash, 3);
    if (bs) identity(tag, 'CF closing cash = BS cash', cf.cashEnd, bs.cash, 3);
  }
}
// quarter continuity in the recent window
const last = fin.quarters.at(-1);
for (let i = 1; i < 12; i++) {
  let fy = last.fy, q = last.q - i; while (q <= 0) { q += 4; fy--; }
  const id = `${fy}Q${q}`;
  const e = fin.quarters.find((x) => x.id === id);
  if (!e) record(id, 'window: quarter present with IS, BS and CF', 'fail', null, null, { es: 'trimestre ausente en la ventana de 12', en: 'quarter missing from the 12-quarter window' });
  else { const missing = ['is', 'bs', 'cf'].filter((p) => !e[p]); record(id, 'window: quarter present with IS, BS and CF', missing.length ? 'fail' : 'ok', null, null, missing.length ? { es: 'falta ' + missing.join(', '), en: 'missing ' + missing.join(', ') } : null); }
}
// YTD vs quarters: 6M = 1Q + 2Q, etc. (revenue, net income, EBITDA)
for (const y of fin.ytd) {
  if (y.months === 3 || !y.is) continue;
  const n = y.months / 3;
  const qs = Array.from({ length: n }, (_, i) => fin.quarters.find((q) => q.id === `${y.fy}Q${i + 1}`));
  if (qs.some((q) => !q || !q.is)) continue;
  for (const k of ['revTotal', 'netIncome', 'ebitda']) {
    const sum = qs.reduce((a, q) => a + (q.is[k] ?? 0), 0);
    if (y.is[k] != null) identity(y.id, `YTD: sum of quarters = ${k}`, sum, y.is[k], 5);
  }
}

// ---- traffic
for (const m of traffic.months) {
  for (const code of Object.keys(m.total)) {
    if (code === 'TOTAL') continue;
    identity(`traffic ${m.ym}`, `${code}: domestic + international = total`, (m.dom[code] ?? 0) + (m.intl[code] ?? 0), m.total[code], 0.25);
  }
  const sum = Object.entries(m.total).filter(([c]) => c !== 'TOTAL').reduce((a, [, v]) => a + v, 0);
  if (m.total.TOTAL != null) identity(`traffic ${m.ym}`, 'airports sum = group total', sum, m.total.TOTAL, 1.5);
  const n = Object.keys(m.total).length;
  if (n < 12) record(`traffic ${m.ym}`, 'airports parsed ≥ 12', 'warn', n, 12, { es: `sólo ${n} aeropuertos`, en: `only ${n} airports` });
}
// month continuity since 2019-01
const months = traffic.months.map((m) => m.ym);
let cur = '2019-01';
while (cur <= months.at(-1)) {
  if (!months.includes(cur)) record(`traffic ${cur}`, 'month present', 'fail', null, null, { es: 'mes ausente', en: 'month missing' });
  let [y, mo] = cur.split('-').map(Number); mo++; if (mo > 12) { mo = 1; y++; }
  cur = `${y}-${String(mo).padStart(2, '0')}`;
}

// ---- management guidance
{
  const vs = guidance.vintages || [];
  if (!vs.length) record('guidance', 'vintages parsed', 'fail', 0, 1);
  const today = new Date().toISOString().slice(0, 10);
  let prev = null;
  for (const v of vs) {
    const tag = `guidance ${v.fy} ${v.kind} (${v.date})`;
    const bad = [];
    if (!(v.fy >= 2015 && v.fy <= 2040)) bad.push('fiscal year out of range');
    if (!v.date || v.date > today) bad.push('bad date');
    if (v.date && v.fy < +v.date.slice(0, 4) - 1) bad.push('issued after the year it covers');
    for (const [k, x] of Object.entries(v.items || {})) {
      if (k === 'capex') { if (!(x.mxnM > 500 && x.mxnM < 100000)) bad.push(`capex ${x.mxnM} Ps. M implausible`); continue; }
      if (x.lo == null || x.hi == null || x.lo > x.hi) bad.push(`${k} range ${JSON.stringify(x)}`);
      if (k === 'ebitdaMargin' && !(x.lo > 40 && x.hi < 90)) bad.push(`margin ${x.lo}-${x.hi} implausible`);
      if (k !== 'ebitdaMargin' && (x.lo < -80 || x.hi > 150)) bad.push(`${k} growth ${x.lo}-${x.hi} implausible`);
    }
    if (prev && v.date < prev.date) bad.push('vintages not in date order');
    record(tag, 'guidance: dates, ranges and plausibility', bad.length ? 'fail' : 'ok', null, null, bad.length ? bad.join('; ') : null);
    const miss = ['traffic', 'revTotal', 'ebitda'].filter((k) => !v.items || !v.items[k]);
    if (miss.length) record(tag, 'guidance: traffic, revenue and EBITDA present', 'warn', null, null, { es: 'faltan ' + miss.join(', '), en: 'missing ' + miss.join(', ') });
    if (prev && prev.fy === v.fy && JSON.stringify(prev.items) === JSON.stringify(v.items)) record(tag, 'guidance: differs from the previous vintage', 'warn', null, null, { es: 'idéntica a la anterior', en: 'identical to the previous vintage' });
    prev = v;
  }
}

// ---- data health (never fails the build)
const mk = await load('../../site/gap/data/market.js');
const rf = await loadJs('../../site/gap/data/reference.js', 'GAP_REF');
const TODAY_ISO = new Date().toISOString().slice(0, 10);
Q.marketStale(mk, { prices: { '*': 5 }, fx: { USDMXN: 7 }, rates: { MX10Y: 45, US10Y: 7 }, dividends: {} });
// Dividends: the exchange record is compared with the latest AGM resolution, so an instalment not yet paid
// inside its 12-month window reads as an outstanding balance, not as a stalled feed.
{
  const pts = (((mk.dividends || {})['GAPB.MX'] || {}).points) || [];
  const agm = (rf.dividends || []).slice(-1)[0];
  const since = agm ? pts.filter((p) => p[0] >= agm.agmDate) : [];
  const paid = since.reduce((a, p) => a + p[1], 0);
  const lastPt = pts.length ? pts[pts.length - 1][0] : null;
  const open = agm ? Math.max(0, agm.dps - paid) : 0;
  const inWindow = agm && agm.payableUntil && TODAY_ISO <= agm.payableUntil;
  Q.R.stale.push({ series: 'dividends GAPB.MX (vs AGM resolution)', lastDate: lastPt, ageDays: ageDays(lastPt), limitDays: null, status: !agm || open < 0.01 || inWindow ? 'ok' : 'warn',
    note: agm ? { es: `asamblea ${agm.agmYear}: pagados Ps. ${paid.toFixed(2)} de Ps. ${agm.dps.toFixed(2)}${open >= 0.01 ? `; saldo Ps. ${open.toFixed(2)} pagadero hasta ${agm.payableUntil}${inWindow ? '' : ' (plazo vencido)'}` : ''}`, en: `${agm.agmYear} AGM: Ps. ${paid.toFixed(2)} of Ps. ${agm.dps.toFixed(2)} paid${open >= 0.01 ? `; balance Ps. ${open.toFixed(2)} payable until ${agm.payableUntil}${inWindow ? '' : ' (window expired)'}` : ''}` } : null });
}
const expQ = expectedQuarter(35), expM = expectedMonth(12);
Q.period('latest quarter (financials.js)', last.id, expQ, ageDays(((last.sources || {}).is || {}).date));
const lastM = traffic.months.at(-1);
Q.period('latest traffic month (traffic.js)', lastM && lastM.ym, expM, ageDays(lastM && lastM.source && lastM.source.date));
Q.stale('guidance (latest vintage)', guidance.vintages.at(-1) && guidance.vintages.at(-1).date, 200, { es: `${guidance.vintages.at(-1).fy} ${guidance.vintages.at(-1).kind}; GAP publica la guía en febrero y la revisa con el 2T`, en: `${guidance.vintages.at(-1).fy} ${guidance.vintages.at(-1).kind}; GAP issues guidance in February and revises it with 2Q` });
try { const ns = JSON.parse(await readFile(new URL('../../tools/gap/notify-state.json', import.meta.url), 'utf8')); Q.stale('alert routine (notify-state.json)', (ns.lastCheckedAt || ns.lastNotifiedAt || '').slice(0, 10) || null, ns.lastCheckedAt ? 3 : null, { es: `último aviso ${ns.lastNotifiedAt || '—'}; trimestre ${ns.lastQuarter}, tráfico ${ns.lastTrafficMonth}`, en: `last notification ${ns.lastNotifiedAt || '—'}; quarter ${ns.lastQuarter}, traffic ${ns.lastTrafficMonth}` }); } catch { /* optional */ }

const cm = await loadJs('../../site/gap/data/comments.js', 'GAP_COMMENTS');
const sm = await loadJs('../../site/gap/data/summary.js', 'GAP_SUMMARY');
const ytdId = `${last.fy}M${last.q * 3}`;
const has = (p) => !!(cm.periods && cm.periods[p]);
Q.curated('comments.js', has(last.id), { es: `comentarios de ${last.id} ${has(last.id) ? 'presentes' : 'AUSENTES'}`, en: `comments for ${last.id} ${has(last.id) ? 'present' : 'MISSING'}` });
if (last.q > 1) Q.curated('comments.js', has(ytdId), { es: `comentarios del acumulado ${ytdId} ${has(ytdId) ? 'presentes' : 'AUSENTES'}`, en: `comments for ${ytdId} ${has(ytdId) ? 'present' : 'MISSING'}` });
const gv = guidance.vintages.at(-1);
Q.curated('guidance.js', gv && gv.fy >= last.fy, { es: `guía vigente ${gv ? `${gv.fy} ${gv.kind} (${gv.date})` : 'AUSENTE'}`, en: `guidance in force ${gv ? `${gv.fy} ${gv.kind} (${gv.date})` : 'MISSING'}` });
const sb = (sm.basis || {}).quarter;
Q.curated('summary.js', sb === last.id, { es: `resumen ejecutivo con base ${sb || '?'} ${sb === last.id ? '= último trimestre' : 'ATRASADO frente al último trimestre'}`, en: `executive summary basis ${sb || '?'} ${sb === last.id ? '= latest quarter' : 'BEHIND the latest quarter'}` });
const ra = ageDays(rf.updatedAt);
Q.curated('reference.js', ra != null && ra <= 120, { es: `referencia revisada el ${rf.updatedAt || '?'} (hace ${ra} días)`, en: `reference facts last reviewed ${rf.updatedAt || '?'} (${ra} days ago)` });
const pr = await loadJs('../../site/gap/data/peers.js', 'GAP_PEERS');
const pa = ageDays(pr.pricesAsOf);
Q.curated('peers.js', pa != null && pa <= 45, { es: `pares y consenso FactSet con precios al ${pr.pricesAsOf || '?'} (hace ${pa} días); se refresca a solicitud`, en: `FactSet peers and consensus with prices as of ${pr.pricesAsOf || '?'} (${pa} days ago); refreshed on request` });

Q.card((fin.coverage || {}).releasesParsed, 'informes parseados', 'releases parsed');
Q.card(traffic.months.length, 'meses de tráfico', 'traffic months');
Q.originsFromQuarters(fin.quarters);
await Q.readParseLog(new URL('../../tools/gap/raw/build-log.json', import.meta.url));

for (const w of Q.R.warns) console.log('WARN ' + w);
for (const f of Q.R.fails) console.error('FAIL ' + f);
console.log(`validate-data: ${Q.R.fails.length} failures, ${Q.R.warns.length} warnings; ${fin.quarters.length} quarters, ${fin.years.length} years, ${traffic.months.length} traffic months, ${(guidance.vintages || []).length} guidance vintages; ${Q.R.checks.length} identities checked`);
await Q.write({ latestQuarter: last.id, expectedQuarter: expQ, coverage: fin.coverage, financialsGeneratedAt: fin.generatedAt });
if (Q.R.fails.length) process.exit(1);
