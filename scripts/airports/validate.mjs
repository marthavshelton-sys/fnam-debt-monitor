// Tie-out checks for the generated airport-model data files, plus the data-health report for the hidden
// owner page site/<company>/quality.html. Usage: node scripts/airports/validate.mjs --company=asur|oma
// Exit code 1 on any failure, so the refresh workflow never commits a data set that does not reconcile.
// Statement tie-outs are failures inside the window the page relies on (last 12 quarters, last 3 fiscal years)
// and warnings for older, comparative-only history. Every identity evaluated, the freshness of each series,
// the curated files, the origin of every quarter and the last build's parse warnings go to
// site/<company>/data/quality.js (window.<ASUR|OMA>_QUALITY) through scripts/lib/quality-report.mjs.
import { readFile } from 'node:fs/promises';
import { createReport, expectedQuarter, expectedMonth, ageDays } from '../lib/quality-report.mjs';
import { bmvHealth } from '../lib/bmv-events.mjs';

const COMPANY = (process.argv.find((a) => a.startsWith('--company=')) || '').split('=')[1];
if (!['asur', 'oma'].includes(COMPANY)) { console.error('usage: validate.mjs --company=asur|oma'); process.exit(2); }
const KEY = COMPANY.toUpperCase();
async function load(rel) { const txt = await readFile(new URL(rel, import.meta.url), 'utf8'); return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); }
async function loadJs(rel, key) { const s = await readFile(new URL(rel, import.meta.url), 'utf8'); const i = s.indexOf('window.' + key); const j = s.indexOf('=', i) + 1; let b = s.slice(j).trim(); if (b.endsWith(';')) b = b.slice(0, -1); return Function('return (' + b + ')')(); }
const MIN_AIRPORTS = { asur: 16, oma: 13 }[COMPANY];
const TRAFFIC_FROM = '2019-01';
const Q = createReport({
  slug: COMPANY, key: `${KEY}_QUALITY`, generator: `scripts/airports/validate.mjs --company=${COMPANY}`,
  diffUnit: { es: 'Diferencia (Ps. miles / miles de pasajeros)', en: 'Difference (Ps. thousand / thousand passengers)' },
  tolerances: { es: 'Tolerancias: Ps. 3 mil en identidades de los estados financieros (redondeo de las cifras impresas), Ps. 10 mil en subtotales del balance, Ps. 5 mil en la suma de trimestres contra el acumulado (diferencias menores al 1% son avisos: reexpresiones de un trimestre en un informe posterior), 0.25 pp en el margen sin IFRIC 12, 2 pasajeros por aeropuerto y 50 en el total mensual. Dentro de la ventana que usa la página (últimos 12 trimestres y 3 años fiscales) una diferencia mayor es una falla y detiene la publicación; en la historia comparativa más antigua es un aviso.', en: 'Tolerances: Ps. 3 thousand on statement identities (rounding of the printed figures), Ps. 10 thousand on balance-sheet subtotals, Ps. 5 thousand on the sum of quarters against the year-to-date column (gaps under 1% are warnings: a quarter restated in a later release), 0.25 pp on the ex-IFRIC 12 margin, 2 passengers per airport and 50 on the monthly total. Inside the window the page relies on (last 12 quarters and 3 fiscal years) a larger gap is a failure and blocks publication; in older comparative history it is a warning.' },
});
const { record, identity } = Q;

const fin = await load(`../../site/${COMPANY}/data/financials.js`);
const traffic = await load(`../../site/${COMPANY}/data/traffic.js`);
const guidance = await load(`../../site/${COMPANY}/data/guidance.js`);
const win = new Set();
{
  const lastQ = fin.quarters.at(-1);
  if (lastQ) for (let i = 0; i < 12; i++) { let fy = lastQ.fy, q = lastQ.q - i; while (q <= 0) { q += 4; fy--; } win.add(`${fy}Q${q}`); }
  const lastY = fin.years.at(-1); if (lastY) for (let i = 0; i < 3; i++) win.add(`FY${lastY.fy - i}`);
}
const HIST = { es: 'historia comparativa, fuera de la ventana de 12 trimestres', en: 'comparative history, outside the 12-quarter window' };
// identity that fails inside the window and warns outside it
const idW = (tag, check, a, b, tol) => identity(tag, check, a, b, tol, win.has(tag) ? {} : { soft: true, note: HIST });

for (const q of [...fin.quarters, ...fin.years]) {
  const tag = q.id, is = q.is, bs = q.bs, cf = q.cf;
  if (is) {
    if (is.revTotal != null && is.revAero != null && is.revNonAero != null) idW(tag, 'IS: aeronautical + non-aeronautical + construction = total revenue', is.revAero + is.revNonAero + (is.revConstruction || 0), is.revTotal, 3);
    if (is.netIncome != null) idW(tag, 'IS: income before tax − tax = net income', is.incomeBeforeTax != null && is.incomeTax != null ? is.incomeBeforeTax - is.incomeTax : null, is.netIncome, Math.max(3, 0.0005 * Math.abs(is.netIncome)));
    idW(tag, 'IS: revenue − operating costs (+ other revenue) = operating income', is.revTotal != null && is.totalOpCosts != null ? is.revTotal - is.totalOpCosts + (is.otherRevenues || 0) : null, is.opIncome, 3);
    if (COMPANY === 'oma') idW(tag, 'IS: IFRIC 12 construction revenue = construction cost', is.revConstruction, is.costConstruction, 3);
    if (is.ebitda != null && is.revTotal && is.ebitdaMarginExIfric != null) {
      const base = COMPANY === 'oma' ? (is.revExConstruction || (is.revAero + is.revNonAero)) : is.revTotal - (is.revConstruction || 0);
      idW(tag, 'IS: computed ex-IFRIC 12 margin = stored margin (pp)', 100 * is.ebitda / base, is.ebitdaMarginExIfric, 0.25);
    }
    if (is.incomeBeforeTax != null) identity(tag, 'IS: operating income + financing result + associates = income before tax', is.opIncome != null && is.financialResult != null ? is.opIncome + is.financialResult + (is.associates || 0) : null, is.incomeBeforeTax, Math.max(3, 0.001 * Math.abs(is.incomeBeforeTax)), { soft: true, note: { es: 'otras partidas entre utilidad de operación y utilidad antes de impuestos', en: 'other items between operating income and income before tax' } });
    idW(tag, 'IS: controlling + non-controlling = net income', is.comprehensiveControlling != null && is.nci != null ? is.comprehensiveControlling + is.nci : null, is.netIncome, 3);
    idW(tag, 'IS: majority + non-controlling = net income', is.netIncomeMajority != null && is.nci != null ? is.netIncomeMajority + is.nci : null, is.netIncome, 3);
  }
  if (bs) {
    idW(tag, 'BS: assets = liabilities + equity (printed total)', bs.totalAssets, bs.totalLiabEquity, 3);
    idW(tag, 'BS: liabilities + equity = assets', bs.totalLiabilities != null && bs.totalEquity != null ? bs.totalLiabilities + bs.totalEquity : null, bs.totalAssets, 10);
    if (bs.totalCurrentAssets != null && bs.totalAssets != null) record(tag, 'BS: current assets ≤ total assets', bs.totalCurrentAssets <= bs.totalAssets ? 'ok' : win.has(tag) ? 'fail' : 'warn', bs.totalCurrentAssets - bs.totalAssets, 0);
  }
  if (cf) {
    idW(tag, 'CF: opening cash + net change + FX = closing cash', cf.cashBegin != null && cf.netChangeCash != null ? cf.cashBegin + cf.netChangeCash + (cf.fxEffectCash || 0) : null, cf.cashEnd, 3);
    idW(tag, 'CF: CFO + CFI + CFF = net change in cash', cf.cfo != null && cf.cfi != null && cf.cff != null ? cf.cfo + cf.cfi + cf.cff : null, cf.netChangeCash, 3);
    if (bs) idW(tag, 'CF closing cash = BS cash', cf.cashEnd, bs.cash, 3);
  }
}
// quarter continuity + completeness in the 12-quarter window
const last = fin.quarters.at(-1);
if (!last) record('financials', 'quarters present', 'fail', 0, 1);
else for (let i = 0; i < 12; i++) {
  let fy = last.fy, q = last.q - i; while (q <= 0) { q += 4; fy--; }
  const id = `${fy}Q${q}`; const e = fin.quarters.find((x) => x.id === id);
  const missing = e ? ['is', 'bs', 'cf'].filter((p) => !e[p] || !Object.keys(e[p]).length) : ['is', 'bs', 'cf'];
  record(id, 'window: quarter present with IS, BS and CF', missing.length ? 'fail' : 'ok', null, null, missing.length ? { es: (e ? 'falta ' : 'trimestre ausente: ') + missing.join(', '), en: (e ? 'missing ' : 'quarter missing: ') + missing.join(', ') } : null);
}
// YTD vs quarters (revenue, net income, EBITDA)
for (const y of fin.ytd) {
  if (y.months === 3 || !y.is) continue;
  const n = y.months / 3;
  const qs = Array.from({ length: n }, (_, i) => fin.quarters.find((q) => q.id === `${y.fy}Q${i + 1}`));
  if (qs.some((q) => !q || !q.is)) continue;
  const tagW = y.months === 12 ? `FY${y.fy}` : `${y.fy}Q${n}`;
  for (const k of ['revTotal', 'netIncome', 'ebitda']) {
    if (qs.some((q) => q.is[k] == null) || y.is[k] == null) continue;
    const sum = qs.reduce((a, q) => a + q.is[k], 0);
    const d = Math.abs(sum - y.is[k]);
    const status = d <= 5 ? 'ok' : d / Math.abs(y.is[k] || 1) < 0.01 ? 'warn' : win.has(tagW) ? 'fail' : 'warn';
    record(y.id, `YTD: sum of quarters = ${k}`, status, d, 5, status === 'ok' ? null : d / Math.abs(y.is[k] || 1) < 0.01 ? { es: 'trimestre reexpresado en un informe posterior', en: 'restated in a later release' } : win.has(tagW) ? null : HIST);
  }
}
// traffic
for (const m of traffic.months) {
  for (const code of Object.keys(m.total)) {
    if (code === 'TOTAL') continue;
    const d = m.dom[code], i = m.intl[code];
    if (d != null && i != null) identity(`traffic ${m.ym}`, `${code}: domestic + international = total`, d + i, m.total[code], 0.002);
  }
  const sum = Object.entries(m.total).filter(([c]) => c !== 'TOTAL').reduce((a, [, v]) => a + v, 0);
  if (m.total.TOTAL != null) identity(`traffic ${m.ym}`, 'airports sum = group total', sum, m.total.TOTAL, 0.05);
  // country subtotals of the summary table: each adds up, and together they make the group total. A country block the
  // parser does not place (ASUR's CPC airports from Sep-2026, in a layout not yet seen) unbalances one of the two and stops
  // the commit, instead of a group total that silently mixes perimeters or a country overwritten by another's rows.
  if (m.countries) {
    const cs = Object.entries(m.countries).filter(([c]) => c !== 'TOTAL'), soft = m.ym < TRAFFIC_FROM ? { soft: true, note: HIST } : {};
    for (const [c, v] of cs) if (v && v.dom != null && v.intl != null && v.total != null) identity(`traffic ${m.ym}`, `country ${c}: domestic + international = total`, v.dom + v.intl, v.total, 0.05, soft);
    if (m.total.TOTAL != null && cs.length && cs.every(([, v]) => v && v.total != null)) identity(`traffic ${m.ym}`, 'countries sum = group total', cs.reduce((a, [, v]) => a + v.total, 0), m.total.TOTAL, 0.05, soft);
  }
  const n = Object.keys(m.total).filter((c) => c !== 'TOTAL').length;
  if (m.ym >= TRAFFIC_FROM && n < MIN_AIRPORTS) record(`traffic ${m.ym}`, `airports parsed ≥ ${MIN_AIRPORTS}`, 'warn', n, MIN_AIRPORTS, { es: `sólo ${n} aeropuertos`, en: `only ${n} airports` });
}
// traffic perimeter change (reference.js -> perimeter; ASUR's CPC airports): reported, awaited or missing from a release
{
  let per = null; try { per = (await loadJs(`../../site/${COMPANY}/data/reference.js`, `${KEY}_REF`)).perimeter || null; } catch { /* optional */ }
  if (per && Array.isArray(per.countries) && per.firstMonth) {
    const codes = per.countries.map((c) => c.code), lastT = traffic.months.at(-1);
    const newAir = (traffic.airports || []).filter((a) => codes.includes(a.country)).map((a) => a.code);
    const has = (m) => codes.some((c) => m.countries && m.countries[c]) || newAir.some((c) => m.total[c] != null);
    const firstP = traffic.months.find((m) => m.ym >= per.firstMonth && has(m));
    const check = `${per.key || 'perimeter'}: new airports in the monthly traffic (from ${per.firstMonth})`;
    if (firstP) record('traffic perimeter', check, 'ok', null, null, { es: `desde ${firstP.ym}: ${codes.filter((c) => lastT.countries && lastT.countries[c]).join(', ') || '—'}; ${newAir.length} de ${per.airports || '—'} aeropuertos desglosados`, en: `since ${firstP.ym}: ${codes.filter((c) => lastT.countries && lastT.countries[c]).join(', ') || '—'}; ${newAir.length} of ${per.airports || '—'} airports itemized` });
    else if (lastT && lastT.ym >= per.firstMonth) record('traffic perimeter', check, 'warn', null, null, { es: `el reporte de ${lastT.ym} no trae los países nuevos (${codes.join(', ')})`, en: `the ${lastT.ym} report carries none of the new countries (${codes.join(', ')})` });
    else record('traffic perimeter', check, 'ok', null, null, { es: `en espera: último mes ${lastT ? lastT.ym : '—'}; primer reporte con ellos: ${per.firstMonth}`, en: `awaiting: latest month ${lastT ? lastT.ym : '—'}; first report with them: ${per.firstMonth}` });
  }
}
const months = traffic.months.map((m) => m.ym);
let cur = TRAFFIC_FROM;
while (months.length && cur <= months.at(-1)) {
  if (!months.includes(cur)) record(`traffic ${cur}`, 'month present', 'fail', null, null, { es: 'mes ausente', en: 'month missing' });
  let [y, mo] = cur.split('-').map(Number); mo++; if (mo > 12) { mo = 1; y++; }
  cur = `${y}-${String(mo).padStart(2, '0')}`;
}

// ---- data health (never fails the build)
const mk = await load(`../../site/${COMPANY}/data/market.js`);
const main = { asur: 'ASURB.MX', oma: 'OMAB.MX' }[COMPANY];
Q.marketStale(mk, { prices: { '*': 5 }, fx: { USDMXN: 7 }, rates: { MX10Y: 45, US10Y: 7 }, dividends: { [main]: 400 } });
// FactSet closes (the share-price authority since 2026-10-06, nightly routine): every share series (the index stays on Yahoo)
// must carry them and they must be recent; the oldest FactSet end date is the row's date, a series without FactSet closes warns
{
  const rows = Object.keys(mk.prices || {}).filter((id) => id !== '^MXX').map((id) => { const pv = (mk.prices[id] || {}).provenance; return { id, f: pv && pv.factset, after: (pv && pv.fill && pv.fill.after) || [] }; });
  const withFs = rows.filter((r) => r.f), without = rows.filter((r) => !r.f);
  const oldest = withFs.reduce((a, r) => (a == null || r.f.to < a ? r.f.to : a), null);
  const list = (es) => withFs.map((r) => `${r.id} ${es ? 'hasta' : 'through'} ${r.f.to}${r.after.length ? ` (+${r.after.length} ${es ? 'sesión(es) de respaldo' : 'fallback session(s)'})` : ''}`).join(', ');
  Q.stale('FactSet closes (market.js)', without.length ? null : oldest, 5, {
    es: `${withFs.length ? `${withFs[0].f && mk.prices[withFs[0].id].provenance.authority}: ${list(true)}` : 'ninguna serie con cierres de FactSet'}${without.length ? `; SIN FactSet (sólo Yahoo): ${without.map((r) => r.id).join(', ')}` : ''}`,
    en: `${withFs.length ? `${withFs[0].f && mk.prices[withFs[0].id].provenance.authority}: ${list(false)}` : 'no series carries FactSet closes'}${without.length ? `; NO FactSet (Yahoo only): ${without.map((r) => r.id).join(', ')}` : ''}`,
  });
}
const expQ = expectedQuarter(35), expM = expectedMonth(12);
if (last) Q.period('latest quarter (financials.js)', last.id, expQ, ageDays(((last.sources || {}).is || {}).date));
const lastM = traffic.months.at(-1);
Q.period('latest traffic month (traffic.js)', lastM && lastM.ym, expM, ageDays(lastM && lastM.source && lastM.source.date));
try { const ns = JSON.parse(await readFile(new URL(`../../tools/${COMPANY}/notify-state.json`, import.meta.url), 'utf8')); Q.stale('alert routine (notify-state.json)', (ns.lastCheckedAt || ns.lastNotifiedAt || '').slice(0, 10) || null, ns.lastCheckedAt ? 3 : null, { es: `último aviso ${ns.lastNotifiedAt || '—'}; trimestre ${ns.lastQuarter || '—'}, tráfico ${ns.lastTrafficMonth || '—'}`, en: `last notification ${ns.lastNotifiedAt || '—'}; quarter ${ns.lastQuarter || '—'}, traffic ${ns.lastTrafficMonth || '—'}` }); } catch { /* optional */ }
// BMV eventos relevantes: the shared watcher's fail-safe for filings that never reach the wire (scripts/lib/bmv-events.mjs)
{ const b = await bmvHealth(COMPANY); if (b) Q.stale(b.series, b.lastDate, b.limit, b.note); }

const cm = await loadJs(`../../site/${COMPANY}/data/comments.js`, `${KEY}_COMMENTS`);
const sm = await loadJs(`../../site/${COMPANY}/data/summary.js`, `${KEY}_SUMMARY`);
const rf = await loadJs(`../../site/${COMPANY}/data/reference.js`, `${KEY}_REF`);
if (last) {
  const ytdId = `${last.fy}M${last.q * 3}`;
  const has = (p) => !!(cm.periods && cm.periods[p]);
  Q.curated('comments.js', has(last.id), { es: `comentarios de ${last.id} ${has(last.id) ? 'presentes' : 'AUSENTES'}`, en: `comments for ${last.id} ${has(last.id) ? 'present' : 'MISSING'}` });
  if (last.q > 1) Q.curated('comments.js', has(ytdId), { es: `comentarios del acumulado ${ytdId} ${has(ytdId) ? 'presentes' : 'AUSENTES'}`, en: `comments for ${ytdId} ${has(ytdId) ? 'present' : 'MISSING'}` });
  const sb = (sm.basis || {}).quarter;
  Q.curated('summary.js', sb === last.id, { es: `resumen ejecutivo con base ${sb || '?'} ${sb === last.id ? '= último trimestre' : 'ATRASADO frente al último trimestre'}`, en: `executive summary basis ${sb || '?'} ${sb === last.id ? '= latest quarter' : 'BEHIND the latest quarter'}` });
}
Q.curated('guidance.js', true, (guidance.vintages || []).length ? { es: `${guidance.vintages.length} vintages`, en: `${guidance.vintages.length} vintages` } : { es: `${KEY} no publica una tabla formal de guía; el archivo lo registra`, en: `${KEY} publishes no formal guidance table; the file records that fact` });
const ra = ageDays(rf.updatedAt);
Q.curated('reference.js', ra != null && ra <= 120, { es: `referencia revisada el ${rf.updatedAt || '?'} (hace ${ra} días)`, en: `reference facts last reviewed ${rf.updatedAt || '?'} (${ra} days ago)` });

Q.card((fin.coverage || {}).releasesParsed, 'informes parseados', 'releases parsed');
Q.card(traffic.months.length, 'meses de tráfico', 'traffic months');
Q.originsFromQuarters(fin.quarters);
await Q.readParseLog(new URL(`../../tools/${COMPANY}/raw/build-log.json`, import.meta.url));

for (const w of Q.R.warns) console.log('WARN ' + w);
for (const f of Q.R.fails) console.error('FAIL ' + f);
console.log(`validate ${COMPANY}: ${Q.R.fails.length} failures, ${Q.R.warns.length} warnings; ${fin.quarters.length} quarters, ${fin.years.length} years, ${traffic.months.length} traffic months; ${Q.R.checks.length} identities checked`);
await Q.write({ latestQuarter: last && last.id, expectedQuarter: expQ, coverage: fin.coverage, financialsGeneratedAt: fin.generatedAt });
if (Q.R.fails.length) process.exit(1);
