#!/usr/bin/env node
// Builds site/mx/consumidor/data/data.js (window.MXC_DATA) for the Mexican Consumer page from the stored sources in
// tools/mx-consumidor/raw/ (written by fetch.mjs). Nothing is fetched here, so a session can rebuild the page's data offline.
//
//   node scripts/mx-consumidor/build.mjs [--check]      (--check: run the tie-outs, write nothing)
//
// Every block carries the period its data stands for (`asOf`) and its source. Figures the publisher prints are passed
// through; anything computed here (shares, ratios, real changes, per-household averages) is an FNAM calculation and the
// page badges it so. The tie-outs (the survey tabulations against the figures INEGI prints, accounting identities of
// each source, the curated ENFIH figures against the stored document) go to tools/mx-consumidor/raw/build-log.json; a
// failed hard check stops the build and the page keeps its last data. `generatedAt` changes only when the data did, so a
// quiet run commits nothing.
//
// Units: the ENIGH reports quarterly pesos per household; the page shows pesos a month (quarterly ÷ 3) and keeps the
// published quarterly figure beside the headline ones. Banxico balances are converted to billions of pesos ("miles de
// millones") here.
import { RAW, SITE, TOOLS, readJson, readText, writeText, writeJson, nowIso, STATES } from './lib/common.mjs';

const CHECK = process.argv.includes('--check');
const raw = {}; const meta = {};
for (const id of ['enigh', 'banxico', 'cards', 'states', 'inegi', 'fred', 'enif', 'docs', 'poverty']) { const j = readJson(`${RAW}${id}.json`); raw[id] = j ? j.data : null; meta[id] = j ? { fetchedAt: j.fetchedAt } : null; }
const status = readJson(RAW + 'status.json', { sources: {} });

const checks = [];   // { tag, check, status: ok | warn | fail, diff, tol }
function tie(tag, check, a, b, tol, soft = false) {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) { checks.push({ tag, check, status: 'warn', note: 'missing value' }); return false; }
  const d = Math.abs(a - b);
  checks.push({ tag, check, status: d <= tol ? 'ok' : soft ? 'warn' : 'fail', diff: Math.round(d * 1000) / 1000, tol });
  return d <= tol;
}
const must = (tag, check, cond, soft = false) => { checks.push({ tag, check, status: cond ? 'ok' : soft ? 'warn' : 'fail' }); return !!cond; };
const rd = (v, d = 0) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const r0 = (v) => rd(v, 0), r1 = (v) => rd(v, 1), r2 = (v) => rd(v, 2), r3 = (v) => rd(v, 3);
const pct = (a, b) => (a == null || !b ? null : r1((a / b) * 100));
const sum = (arr) => arr.reduce((a, v) => a + (v || 0), 0);
const last = (a) => (a && a.length ? a[a.length - 1] : null);
const mo = (v) => (v == null ? null : Math.round(v / 3));   // quarterly pesos -> pesos a month

const D = { generatedAt: null, sources: {} };
// How long after the END of the period a source is stamped with its publisher normally brings the next one (days): past
// that, the page marks the block and the build lists the source as overdue (build-log.json -> stale), unless the daily
// task confirmed at the publisher that nothing newer exists (data/publisher-checks.json, valid for CHECK_VALID_DAYS).
// ENIGH: every two years, published about seven months after the year ends. ENIF: every three years. Poverty: with
// each ENIGH. Bank credit: monthly, about 35 days later. Household financing and the ENOE's income table: quarterly.
// Card rates: every two months, with a lag of half a year. BIS debt ratio: quarterly, with a lag of two quarters.
const ALLOW = { enigh: 960, enif: 1340, poverty: 960, bankCredit: 80, financing: 175, rates: 300, cardsInForce: 290, cardPayments: 75, savings: 80, wages: 80, consumption: 115, remittances: 80, statesBanxico: 175,
  inegiMonthly: 115, informality: 80, enoe: 175, accounts: 175, bis: 340, lending: 175 };
const NEVER = new Set(['enfih']);   // the only edition of a survey: dated on the page, never overdue
const CHECK_VALID_DAYS = 45;
const TODAY = nowIso().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const periodEnd = (asOf) => { const t = String(asOf || ''); let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) return t;
  if ((m = /^(\d{4})-Q([1-4])$/.exec(t))) return new Date(Date.UTC(+m[1], +m[2] * 3, 0)).toISOString().slice(0, 10);
  if ((m = /^(\d{4})-(\d{2})$/.exec(t))) return new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10);
  if ((m = /^(\d{4})$/.exec(t))) return `${t}-12-31`;
  return null; };
const pubChecks = (readJson(TOOLS + 'data/publisher-checks.json', { checks: {} }) || {}).checks || {};
const stale = [];
// id: the block of the page; file: the stored source it was built from (its fetch status decides `stored`)
const src = (id, file, extra) => {
  const st = (status.sources || {})[file] || {};
  const o = { ...extra, fetchedAt: meta[file] ? meta[file].fetchedAt : null, ...(st.error ? { stored: true, since: st.since || null } : {}) };
  const end = periodEnd(o.asOf);
  if (end && !NEVER.has(id)) {
    o.allowDays = ALLOW[id] || 400; o.dueBy = addDays(end, o.allowDays);
    if (TODAY > o.dueBy) {
      const c = pubChecks[id];
      if (c && c.checked && String(c.latest) === String(o.asOf) && TODAY <= addDays(c.checked, CHECK_VALID_DAYS)) o.publisherChecked = c.checked;
      else stale.push({ id, name: o.name || id, asOf: String(o.asOf), dueBy: o.dueBy });
    }
  } else if (NEVER.has(id)) o.allowDays = null;
  D.sources[id] = o;
};

// ---------- series helpers ----------
const BX = raw.banxico ? raw.banxico.series : {}, IN = raw.inegi ? raw.inegi.series : {};
const obs = (k) => (BX[k] ? BX[k].obs : null), iobs = (k) => (IN[k] ? IN[k].obs : null);
const mapOf = (o) => new Map(o || []);
const SIE = 'https://www.banxico.org.mx/SieInternet/';
const cuadro = (k) => (BX[k] && BX[k].url) || SIE;
const monthAdd = (m, n) => { const y = Number(m.slice(0, 4)), mm = Number(m.slice(5, 7)) - 1 + n; return `${y + Math.floor(mm / 12)}-${String(((mm % 12) + 12) % 12 + 1).padStart(2, '0')}`; };
const quarterOfMonth = (m) => `${m.slice(0, 4)}-Q${Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1}`;
const quarterEndMonth = (q) => `${q.slice(0, 4)}-${String(Number(q.slice(6)) * 3).padStart(2, '0')}`;
// consumer prices: monthly index and yearly averages (INEGI deflates the ENIGH with the average index of each year)
const inpc = mapOf(obs('inpc'));
const inpcYear = (y) => { const v = []; for (let m = 1; m <= 12; m++) { const x = inpc.get(`${y}-${String(m).padStart(2, '0')}`); if (x != null) v.push(x); } return v.length === 12 ? sum(v) / 12 : null; };
const realGrowth = (series, period, back) => {   // % change over `back` months, deflated with the INPC of the same months
  const M = mapOf(series), a = M.get(period), p0 = monthAdd(period, -back), b = M.get(p0), i1 = inpc.get(period), i0 = inpc.get(p0);
  return a != null && b != null && i1 && i0 ? r1(((a / b) / (i1 / i0) - 1) * 100) : null; };
const yoy = (series, period, back = 12) => { const M = mapOf(series), a = M.get(period), b = M.get(monthAdd(period, -back)); return a != null && b ? r1((a / b - 1) * 100) : null; };
// nominal GDP: INEGI's quarterly series is an annualized level; a ratio to GDP uses the average of the four quarters to the date
const gdpQ = mapOf(iobs('gdpNominal'));
const prevQ = (q, n = 1) => { let y = Number(q.slice(0, 4)), k = Number(q.slice(6)) - n; while (k < 1) { k += 4; y--; } return `${y}-Q${k}`; };
const gdp4 = (q) => { const v = [0, 1, 2, 3].map((n) => gdpQ.get(prevQ(q, n))); return v.every((x) => x != null) ? sum(v) / 4 : null; };   // millions of pesos
const lastGdpQ = iobs('gdpNominal') ? last(iobs('gdpNominal'))[0] : null;
const gdpFor = (q) => { let k = q; for (let i = 0; i < 4; i++) { const g = gdp4(k); if (g) return { v: g, q: k }; k = prevQ(k); } return null; };   // the latest four quarters available at that date

// ------------------------------------------------------------------------------------------------------------------
// ENIGH: who they are, what they earn, what they spend, by decile and by state
// ------------------------------------------------------------------------------------------------------------------
const EN = raw.enigh, PUB = readJson(TOOLS + 'data/enigh-published.json');
let L = null, YEARS = [], ED = {}, DEFL = {};
if (EN && EN.editions && EN.editions[EN.latest] && EN.editions[EN.latest].data.byAge) {
  L = EN.editions[EN.latest].data; YEARS = Object.keys(EN.editions).map(Number).sort((a, b) => a - b); for (const y of YEARS) ED[y] = EN.editions[y].data;
  const latest = EN.latest, base = inpcYear(latest);
  for (const y of YEARS) { const a = inpcYear(y); DEFL[y] = base && a ? base / a : null; }
  must('ENIGH', 'a price deflator exists for every edition (yearly average of the INPC)', YEARS.every((y) => DEFL[y] > 0));

  // --- the tabulations against the figures INEGI prints ---
  const P = PUB && PUB.editions ? PUB.editions : {};
  const pl = P[latest];
  if (!pl) must('ENIGH', `published figures of the ${latest} edition are in data/enigh-published.json (add them from INEGI's presentation)`, false, true);
  else {
    tie('ENIGH', `${latest}: households`, L.households, pl.households, 1);
    tie('ENIGH', `${latest}: mean quarterly current income per household`, L.mean.ing_cor, pl.meanIncome, 1);
    tie('ENIGH', `${latest}: mean quarterly monetary spending per household`, L.mean.gasto_mon, pl.meanSpending, 1);
    tie('ENIGH', `${latest}: persons per household`, L.size, pl.householdSize, 0.011);
    tie('ENIGH', `${latest}: Gini coefficient`, L.gini, pl.gini, 0.0011);
    tie('ENIGH', `${latest}: Gini coefficient without transfers`, L.giniNoTransfers, pl.giniNoTransfers, 0.0011);
    pl.deciles.forEach((v, i) => tie('ENIGH', `${latest}: mean income of decile ${i + 1}`, L.deciles[i].mean.ing_cor, v, 1));
    pl.spendingDeciles.forEach((v, i) => tie('ENIGH', `${latest}: mean monetary spending of decile ${i + 1}`, L.deciles[i].mean.gasto_mon, v, 1));
    for (const k of Object.keys(pl.income)) tie('ENIGH', `${latest}: income line ${k}`, L.mean[k], pl.income[k], 1);
    for (const k of Object.keys(pl.spending)) tie('ENIGH', `${latest}: spending line ${k}`, L.mean[k], pl.spending[k], 1);
    tie('ENIGH', `${latest}: households headed by men, mean income`, L.bySex.men.mean.ing_cor, pl.bySex.men, 1);
    tie('ENIGH', `${latest}: households headed by women, mean income`, L.bySex.women.mean.ing_cor, pl.bySex.women, 1);
    tie('ENIGH', `${latest}: urban mean income`, L.urban.urban.mean.ing_cor, pl.urban.urban, 1);
    tie('ENIGH', `${latest}: rural mean income`, L.urban.rural.mean.ing_cor, pl.urban.rural, 1);
    for (const s of L.states) tie('ENIGH', `${latest}: mean income of state ${s.code}`, s.mean.ing_cor, pl.states[s.code], 1);
  }
  for (const y of YEARS) { if (y === latest || !P[y]) continue; const e = ED[y], p = P[y];
    tie('ENIGH', `${y}: mean income at ${latest} prices`, e.mean.ing_cor * DEFL[y], p.meanIncomeReal, 4);
    tie('ENIGH', `${y}: mean monetary spending at ${latest} prices`, e.mean.gasto_mon * DEFL[y], p.meanSpendingReal, 4);
    tie('ENIGH', `${y}: Gini coefficient`, e.gini, p.gini, 0.0011);
    tie('ENIGH', `${y}: Gini coefficient without transfers`, e.giniNoTransfers, p.giniNoTransfers, 0.0011);
    p.decilesReal.forEach((v, i) => tie('ENIGH', `${y}: mean income of decile ${i + 1} at ${latest} prices`, e.deciles[i].mean.ing_cor * DEFL[y], v, 12));
  }
  // --- identities of the survey itself ---
  const m = L.mean;
  tie('ENIGH', 'current income = labor + property + transfers + imputed rent + other', m.ingtrab + m.rentas + m.transfer + m.estim_alqu + m.otros_ing, m.ing_cor, 1);
  tie('ENIGH', 'labor income = wages + own business + other labor income', m.trabajo + m.negocio + m.otros_trab, m.ingtrab, 1);
  tie('ENIGH', 'transfers = pensions + scholarships + gifts + remittances + government programs + in kind', m.jubilacion + m.becas + m.donativos + m.remesas + m.bene_gob + m.transf_hog + m.trans_inst, m.transfer, 1);
  tie('ENIGH', 'monetary spending = its nine groups', m.alimentos + m.vesti_calz + m.vivienda + m.limpieza + m.salud + m.transporte + m.educa_espa + m.personales + m.transf_gas, m.gasto_mon, 1);
  tie('ENIGH', 'the ten deciles add up to the households', sum(L.deciles.map((d) => d.households)), L.households, 5);
  tie('ENIGH', 'the states add up to the households', sum(L.states.map((s) => s.households)), L.households, 5);
  tie('ENIGH', 'age bands add up to the population', sum(L.people.age.map((a) => a.n)), L.people.pop, 5);
  tie('ENIGH', 'population of the person file = persons of the household file', L.people.pop, L.persons, 5);
  tie('ENIGH', 'income brackets add up to the households', sum(L.brackets.map((b) => b.n)), L.households, 5);
  must('ENIGH', 'every state has at least 1,000 households in the sample', L.states.every((s) => s.sample >= 1000), true);
} else must('ENIGH', 'the latest edition is stored with its full detail', false);

const SRC_ENIGH = EN ? EN.source : null;
const stName = Object.fromEntries(STATES.map((s) => [s.code, s]));
if (L) {
  const y = EN.latest, T = L.mean, ppl = L.people;
  // ---- 02 who the consumer is ----
  const cls = ['nuclear', 'extended', 'alone', 'composite', 'coresident'].map((k) => ({ k, n: L.byClass[k] ? L.byClass[k].households : 0 }));
  tie('ENIGH', 'household types add up to the households', sum(cls.map((c) => c.n)), L.households, 5);
  const loc = ['big', 'mid', 'small', 'rural'].map((k) => ({ k, n: L.byLocality[k].households, persons: L.byLocality[k].persons }));
  const ten = ['owner', 'paying', 'renter', 'lent', 'other'].map((k) => ({ k, n: L.byTenure[k] ? L.byTenure[k].households : 0 }));
  tie('ENIGH', 'tenure groups add up to the households', sum(ten.map((c) => c.n)), L.households, 5);
  D.demo = { asOf: String(y), pop: ppl.pop, households: L.households, hhSize: L.size, medianAge: ppl.medianAge, age: ppl.age, sex: ppl.sex, pop25: ppl.pop25, edu: ppl.edu,
    hhTypes: cls, locality: loc, tenure: ten, headWomen: pct(L.bySex.women.households, L.households), ruralPop: pct(L.byLocality.rural.persons, L.persons),
    equip: L.own, ownerByAge: Object.keys(L.byAge).map((k) => ({ k, owner: L.byAge[k].own.owner, hh: L.byAge[k].households })),
    rent: { share: L.own.renter, median: L.rent.median, burden30: L.rent.burden30, burden50: L.rent.burden50, medianShare: L.rent.medianShare } };
  const inf = iobs('informality');
  if (inf && inf.length) { D.demo.informality = { v: r1(last(inf)[1]), asOf: last(inf)[0], yearAgo: (() => { const M = mapOf(inf); const v = M.get(monthAdd(last(inf)[0], -12)); return v == null ? null : r1(v); })() };
    src('informality', 'inegi', { name: 'INEGI, Encuesta Nacional de Ocupación y Empleo (ENOE), tasa de informalidad laboral', url: IN.informality.url || 'https://www.inegi.org.mx/programas/enoe/15ymas/', asOf: last(inf)[0] }); }

  // ---- 03 income ----
  const dmean = L.deciles.map((d) => d.mean.ing_cor), dtot = sum(dmean);
  const grp = (G, keys) => keys.map((k) => ({ k, mean: mo(G[k].mean.ing_cor), median: G[k].median != null ? mo(G[k].median) : null, hh: G[k].households, size: G[k].size, perCapita: G[k].persons ? mo(G[k].mean.ing_cor * G[k].households / G[k].persons) : null }));
  const hist = YEARS.map((yy) => { const e = ED[yy], f = DEFL[yy]; return { year: yy, mean: mo(e.mean.ing_cor), meanReal: mo(e.mean.ing_cor * f), medianReal: mo(e.median * f), spendReal: mo(e.mean.gasto_mon * f), gini: e.gini, giniNoT: e.giniNoTransfers, hhSize: e.size, households: e.households,
    perCapitaReal: mo(e.perCapita.mean * f) }; });
  const RECV = ['trabajo', 'negocio', 'bene_gob', 'jubilacion', 'donativos', 'rentas', 'remesas', 'becas'];
  D.income = { asOf: String(y), households: L.households, meanQ: r0(T.ing_cor), mean: mo(T.ing_cor), medianQ: r0(L.median), median: mo(L.median), perCapita: { mean: mo(L.perCapita.mean), median: mo(L.perCapita.median) },
    gini: L.gini, giniNoT: L.giniNoTransfers, pctl: Object.fromEntries(Object.keys(L.percentiles).map((k) => [k, mo(L.percentiles[k])])), limits: L.decileLimits.map(mo),
    deciles: { mean: dmean.map(mo), share: dmean.map((v) => r1(v / dtot * 100)), size: L.deciles.map((d) => d.size), perCapita: L.deciles.map((d) => mo(d.mean.ing_cor * d.households / d.persons)) },
    top5: L.topShare.top5, top1: L.topShare.top1, brackets: L.brackets, history: hist, base: y,
    byAge: grp(L.byAge, Object.keys(L.byAge)), bySex: grp(L.bySex, ['men', 'women']), byEdu: grp(L.byEdu, ['none', 'primary', 'secondary', 'highSchool', 'college']), byLocality: grp(L.byLocality, ['big', 'mid', 'small', 'rural']),
    byClass: ['alone', 'nuclear', 'extended', 'composite', 'coresident'].filter((k) => L.byClass[k]).map((k) => ({ k, mean: mo(L.byClass[k].mean.ing_cor), hh: L.byClass[k].households, size: L.byClass[k].size })),
    receive: RECV.map((k) => ({ k, pct: L.receive[k] })) };
  tie('ENIGH', 'decile shares of income add up to 100', sum(D.income.deciles.share), 100, 0.3);

  // ---- 04 sources and uses (pesos a month per household) ----
  const otherTransfers = T.donativos + T.becas + T.transf_hog + T.trans_inst;
  const sources = [['trabajo', T.trabajo], ['negocio', T.negocio], ['otros_trab', T.otros_trab], ['jubilacion', T.jubilacion], ['bene_gob', T.bene_gob], ['remesas', T.remesas], ['otherTransfers', otherTransfers], ['rentas', T.rentas], ['estim_alqu', T.estim_alqu + T.otros_ing]];
  tie('ENIGH', 'the sources of the flow add up to current income', sum(sources.map((s) => s[1])), T.ing_cor, 1);
  const SPEND = ['alimentos', 'transporte', 'educa_espa', 'vivienda', 'personales', 'limpieza', 'vesti_calz', 'salud', 'transf_gas'];
  const rest = T.ing_cor - T.gasto_mon - T.estim_alqu;
  const uses = SPEND.map((k) => [k, T[k]]).concat([['estim_alqu', T.estim_alqu], ['rest', rest]]);
  const DETAIL = [['ali_dentro', 'alimentos'], ['ali_fuera', 'alimentos'], ['tabaco', 'alimentos'], ['publico', 'transporte'], ['foraneo', 'transporte'], ['adqui_vehi', 'transporte'], ['combus', 'transporte'], ['refaccion', 'transporte'], ['comunica', 'transporte'],
    ['educacion', 'educa_espa'], ['esparci', 'educa_espa'], ['paq_turist', 'educa_espa'], ['alquiler', 'vivienda'], ['pred_cons', 'vivienda'], ['agua', 'vivienda'], ['energia', 'vivienda'], ['cuida_pers', 'personales'], ['acces_pers', 'personales'], ['otros_gas', 'personales']];
  tie('ENIGH', 'food = at home + away from home + tobacco', T.ali_dentro + T.ali_fuera + T.tabaco, T.alimentos, 1);
  tie('ENIGH', 'housing = rent + property tax and upkeep + water + energy', T.alquiler + T.pred_cons + T.agua + T.energia, T.vivienda, 1);
  tie('ENIGH', 'education and recreation = education + recreation + package tours', T.educacion + T.esparci + T.paq_turist, T.educa_espa, 1);
  tie('ENIGH', 'personal = personal care + accessories + other', T.cuida_pers + T.acces_pers + T.otros_gas, T.personales, 1);
  // transport: vehicle upkeep (mantenim) is the sum of parts and fuel, which are shown instead of it
  tie('ENIGH', 'vehicle upkeep = parts + fuel', T.refaccion + T.combus, T.mantenim, 1);
  tie('ENIGH', 'transport = public + intercity + vehicle purchases + parts + fuel + communications', T.publico + T.foraneo + T.adqui_vehi + T.refaccion + T.combus + T.comunica, T.transporte, 1.5);
  const FIN_IN = ['retiro_inv', 'prestamos', 'otras_perc'], FIN_OUT = ['deposito', 'pago_tarje', 'cuota_viv', 'deudas', 'mater_serv', 'balance', 'prest_terc', 'otras_erog'];
  // receipts: the summary file's total also holds capital receipts in kind, which it does not itemize; they are shown as one residual line
  must('ENIGH', 'the itemized financial receipts do not exceed their total', sum(FIN_IN.map((k) => T[k])) <= T.percep_tot + 1);
  tie('ENIGH', 'financial and capital outlays add up', sum(FIN_OUT.map((k) => T[k])), T.erogac_tot, 1);
  const mixOf = (e) => { const t = e.mean; return { labor: pct(t.ingtrab, t.ing_cor), wages: pct(t.trabajo, t.ing_cor), business: pct(t.negocio + t.otros_trab, t.ing_cor), property: pct(t.rentas, t.ing_cor), pensions: pct(t.jubilacion, t.ing_cor), programs: pct(t.bene_gob, t.ing_cor), remittances: pct(t.remesas, t.ing_cor),
    otherTransfers: pct(t.donativos + t.becas + t.transf_hog + t.trans_inst, t.ing_cor), imputedRent: pct(t.estim_alqu + t.otros_ing, t.ing_cor), transfers: pct(t.transfer, t.ing_cor) }; };
  const useOf = (e) => { const t = e.mean; return Object.fromEntries(SPEND.map((k) => [k, pct(t[k], t.gasto_mon)])); };
  D.funds = { asOf: String(y), income: mo(T.ing_cor), spending: mo(T.gasto_mon), spendShare: pct(T.gasto_mon, T.ing_cor), monetaryIncome: mo(T.ing_cor - T.estim_alqu - T.transf_hog - T.trans_inst),
    sources: sources.map(([k, v]) => ({ k, v: mo(v), pct: pct(v, T.ing_cor) })), uses: uses.map(([k, v]) => ({ k, v: mo(v), pct: pct(v, T.ing_cor) })),
    spend: SPEND.map((k) => ({ k, v: mo(T[k]), pct: pct(T[k], T.gasto_mon) })), detail: DETAIL.map(([k, g]) => ({ k, g, v: mo(T[k]), pct: pct(T[k], T.gasto_mon), recv: L.receive[k] != null ? L.receive[k] : null })),
    finIn: FIN_IN.map((k) => ({ k, v: mo(T[k]), recv: L.receive[k] != null ? L.receive[k] : null })).concat([{ k: 'inKind', v: mo(T.percep_tot - sum(FIN_IN.map((k) => T[k]))), recv: null }]), finOut: FIN_OUT.map((k) => ({ k, v: mo(T[k]), recv: L.receive[k] != null ? L.receive[k] : null })), finInTotal: mo(T.percep_tot), finOutTotal: mo(T.erogac_tot),
    years: YEARS, mix: YEARS.map((yy) => mixOf(ED[yy])), useMix: YEARS.map((yy) => useOf(ED[yy])) };

  // ---- 05 spending by income decile ----
  const dec = L.deciles, col = (f) => dec.map(f);
  const BASICS = ['ali_dentro', 'vivienda', 'salud', 'publico', 'combus'];
  const dspend = col((d) => d.mean.gasto_mon), dstot = sum(dspend);
  const incMix = (t) => ({ wages: pct(t.trabajo, t.ing_cor), business: pct(t.negocio + t.otros_trab, t.ing_cor), pensions: pct(t.jubilacion, t.ing_cor), programs: pct(t.bene_gob, t.ing_cor), remittances: pct(t.remesas, t.ing_cor),
    otherTransfers: pct(t.donativos + t.becas + t.transf_hog + t.trans_inst, t.ing_cor), property: pct(t.rentas, t.ing_cor), imputedRent: pct(t.estim_alqu + t.otros_ing, t.ing_cor) });
  const HEAT = ['ali_dentro', 'ali_fuera', 'vivienda', 'limpieza', 'salud', 'publico', 'combus', 'adqui_vehi', 'comunica', 'educacion', 'esparci', 'vesti_calz', 'cuida_pers', 'transf_gas'];
  const heat = HEAT.map((k) => ({ k, all: mo(T[k]), allPct: pct(T[k], T.gasto_mon), v: col((d) => mo(d.mean[k])), pct: col((d) => pct(d.mean[k], d.mean.gasto_mon)) }));
  heat.push({ k: 'otherSpend', all: mo(T.gasto_mon - sum(HEAT.map((k) => T[k]))), allPct: pct(T.gasto_mon - sum(HEAT.map((k) => T[k])), T.gasto_mon), v: col((d) => mo(d.mean.gasto_mon - sum(HEAT.map((k) => d.mean[k])))), pct: col((d) => pct(d.mean.gasto_mon - sum(HEAT.map((k) => d.mean[k])), d.mean.gasto_mon)) });
  must('ENIGH', 'the heat-table lines never exceed monetary spending', heat[heat.length - 1].v.every((v) => v >= 0) && heat[heat.length - 1].all >= 0);
  D.deciles = { asOf: String(y), income: dmean.map(mo), spending: dspend.map(mo), spendShare: dspend.map((v) => r1(v / dstot * 100)), ratio: dec.map((d) => pct(d.mean.gasto_mon, d.mean.ing_cor)),
    basics: dec.map((d) => pct(sum(BASICS.map((k) => d.mean[k])), d.mean.gasto_mon)), basicsAll: pct(sum(BASICS.map((k) => T[k])), T.gasto_mon), food: dec.map((d) => pct(d.mean.alimentos, d.mean.gasto_mon)), foodAll: pct(T.alimentos, T.gasto_mon),
    heat, incomeMix: dec.map((d) => incMix(d.mean)), incomeMixAll: incMix(T),
    own: dec.map((d) => d.own), recv: dec.map((d) => ({ bene_gob: d.receive.bene_gob, remesas: d.receive.remesas, jubilacion: d.receive.jubilacion, negocio: d.receive.negocio, trabajo: d.receive.trabajo, pago_tarje: d.receive.pago_tarje, deposito: d.receive.deposito, prestamos: d.receive.prestamos, deudas: d.receive.deudas })),
    cardPay: dec.map((d) => mo(d.mean.pago_tarje)), deposits: dec.map((d) => mo(d.mean.deposito)), overspend: L.overspend, rentBurden: L.rent.byDecile, size: dec.map((d) => d.size),
    byAge: Object.keys(L.byAge).map((k) => ({ k, income: mo(L.byAge[k].mean.ing_cor), spending: mo(L.byAge[k].mean.gasto_mon), hh: L.byAge[k].households })),
    debtService: L.debtService };
  tie('ENIGH', 'decile shares of spending add up to 100', sum(D.deciles.spendShare), 100, 0.3);
  src('enigh', 'enigh', { name: SRC_ENIGH.name, url: SRC_ENIGH.url, asOf: String(y), editions: YEARS });

  // ---- 09 the K: every edition at the latest edition's prices ----
  const realDec = (k) => YEARS.map((yy) => ED[yy].deciles.map((d) => mo(d.mean[k] * DEFL[yy])));
  const shares = YEARS.map((yy) => { const mm = ED[yy].deciles.map((d) => d.mean.ing_cor), t = sum(mm); return mm.map((v) => r1(v / t * 100)); });
  const sshares = YEARS.map((yy) => { const mm = ED[yy].deciles.map((d) => d.mean.gasto_mon), t = sum(mm); return mm.map((v) => r1(v / t * 100)); });
  D.kshape = { asOf: String(y), years: YEARS, base: y, income: realDec('ing_cor'), spending: realDec('gasto_mon'), labor: realDec('ingtrab'), programs: realDec('bene_gob'), pensions: realDec('jubilacion'), remittances: realDec('remesas'),
    share: shares, spendShare: sshares, gini: YEARS.map((yy) => ED[yy].gini), giniNoT: YEARS.map((yy) => ED[yy].giniNoTransfers), top5: YEARS.map((yy) => ED[yy].topShare.top5), top1: YEARS.map((yy) => ED[yy].topShare.top1),
    recvPrograms: YEARS.map((yy) => ED[yy].deciles.map((d) => d.receive.bene_gob)), ratio: YEARS.map((yy) => r1(ED[yy].deciles[9].mean.ing_cor / ED[yy].deciles[0].mean.ing_cor)) };
}

// ------------------------------------------------------------------------------------------------------------------
// Poverty (INEGI, multidimensional measurement), national and by state
// ------------------------------------------------------------------------------------------------------------------
const PV = raw.poverty;
if (PV && PV.national && PV.national.poverty) {
  const ys = PV.years, ly = String(PV.latest), n = PV.national;
  tie('Poverty', 'poverty = extreme + moderate', n.extreme[ly] + n.moderate[ly], n.poverty[ly], 0.06);
  tie('Poverty', 'the four groups of the population add up to 100', n.poverty[ly] + n.vulnerableDeprivation[ly] + n.vulnerableIncome[ly] + n.notPoor[ly], 100, 0.11);
  tie('Poverty', 'below the income line = poor + vulnerable by income', n.poverty[ly] + n.vulnerableIncome[ly], n.belowIncomeLine[ly], 0.06);
  must('Poverty', 'the 32 states are present', Object.keys(PV.states).length === 32);
  D.poverty = { asOf: ly, years: ys, national: Object.fromEntries(Object.keys(n).map((k) => [k, ys.map((yy) => (n[k][yy] == null ? null : r1(n[k][yy])))])), people: PV.countNational ? ys.map((yy) => PV.countNational[yy] || null) : null };
  src('poverty', 'poverty', { name: PV.source.name, url: PV.source.url, asOf: ly });
}

// ------------------------------------------------------------------------------------------------------------------
// States: one row per state, from the ENIGH, the poverty measurement and Banco de México's state tables
// ------------------------------------------------------------------------------------------------------------------
const SB = raw.states;
if (L) {
  const y = EN.latest, first = YEARS.find((yy) => ED[yy].states), back = YEARS.filter((yy) => yy < y && ED[yy].states).pop();
  const earlier = (yy) => (ED[yy] && ED[yy].states ? Object.fromEntries(ED[yy].states.map((s) => [s.code, s])) : {});
  const E0 = earlier(first), E1 = earlier(back);
  let remitAsOf = null, housingAsOf = null;
  const list = L.states.map((s) => {
    const nm = stName[s.code], t = s.mean, o = { code: s.code, name: nm ? nm.name : s.code, ab: nm ? nm.abbr : s.code, households: s.households, persons: s.persons, sample: s.sample };
    o.mean = mo(t.ing_cor); o.median = mo(s.median); o.perCapita = mo(s.perCapita); o.gini = s.gini; o.spend = mo(t.gasto_mon);
    o.growth = E0[s.code] ? r1((t.ing_cor / (E0[s.code].mean.ing_cor * DEFL[first]) - 1) * 100) : null;
    o.growthLast = E1[s.code] ? r1((t.ing_cor / (E1[s.code].mean.ing_cor * DEFL[back]) - 1) * 100) : null;
    o.laborShare = pct(t.ingtrab, t.ing_cor); o.transferShare = pct(t.transfer, t.ing_cor); o.foodShare = pct(t.alimentos, t.gasto_mon);
    o.remitHH = s.receive.remesas; o.programsHH = s.receive.bene_gob; o.card = s.own.creditCard; o.cardPay = s.receive.pago_tarje; o.owner = s.own.owner; o.renter = s.own.renter; o.vehicle = s.own.vehicle; o.internet = s.own.internet;
    o.rentBurden = s.renterSample >= 150 ? s.rentBurden30 : null;
    if (PV && PV.states && PV.states[s.code]) { const p = PV.states[s.code], ly = String(PV.latest), fy = String(PV.years[0]);
      o.poverty = r1(p.poverty[ly]); o.extreme = r1(p.extreme[ly]); o.belowLine = r1(p.belowIncomeLine[ly]); o.noSocSec = r1(p.noSocialSecurity[ly]); o.povertyChg = p.poverty[fy] != null ? r1(p.poverty[ly] - p.poverty[fy]) : null; }
    if (SB) {
      const rm = SB.remittances[s.code];
      if (rm && rm.length >= 4) { const l4 = rm.slice(-4); o.remitUsd = r1(sum(l4.map((x) => x[1]))); o.remitPerHH = r0(o.remitUsd * 1e6 / s.households); remitAsOf = last(rm)[0]; }
      const ht = SB.housingTotal[s.code], hp = SB.housingPastDue[s.code];
      if (ht && ht.length && hp && hp.length && last(ht)[0] === last(hp)[0]) { o.housingCredit = r0(last(ht)[1] * 1e6 / s.households); o.housingPastDue = r2(last(hp)[1] / last(ht)[1] * 100); housingAsOf = last(ht)[0]; }
    }
    return o;
  });
  const nat = { mean: D.income.mean, median: D.income.median, perCapita: D.income.perCapita.mean, gini: L.gini, spend: mo(L.mean.gasto_mon), laborShare: pct(L.mean.ingtrab, L.mean.ing_cor), transferShare: pct(L.mean.transfer, L.mean.ing_cor), foodShare: pct(L.mean.alimentos, L.mean.gasto_mon),
    remitHH: L.receive.remesas, programsHH: L.receive.bene_gob, card: L.own.creditCard, cardPay: L.receive.pago_tarje, owner: L.own.owner, renter: L.own.renter, vehicle: L.own.vehicle, internet: L.own.internet, rentBurden: L.rent.burden30,
    growth: r1((L.mean.ing_cor / (ED[first].mean.ing_cor * DEFL[first]) - 1) * 100), growthLast: back ? r1((L.mean.ing_cor / (ED[back].mean.ing_cor * DEFL[back]) - 1) * 100) : null };
  if (D.poverty) { const i = D.poverty.years.length - 1, n = D.poverty.national; nat.poverty = n.poverty[i]; nat.extreme = n.extreme[i]; nat.belowLine = n.belowIncomeLine[i]; nat.noSocSec = n.noSocialSecurity[i]; nat.povertyChg = r1(n.poverty[i] - n.poverty[0]); }
  if (SB && remitAsOf) {
    const tot = sum(list.map((s) => s.remitUsd || 0)); nat.remitUsd = r1(tot); nat.remitPerHH = r0(tot * 1e6 / L.households);
    // the states against the national series of the same four quarters (Banxico publishes both)
    const rmM = obs('remit'); if (rmM) { const qs = [0, 1, 2, 3].map((n) => prevQ(remitAsOf, n)); const natSum = sum(rmM.filter(([m]) => qs.includes(quarterOfMonth(m))).map((x) => x[1])); tie('Banxico states', 'remittances of the 32 states add up to the national total of the same four quarters (US$ millions)', tot, natSum, natSum * 0.005, true); }
    src('statesBanxico', 'states', { name: SB.source.name, url: SB.source.url, asOf: remitAsOf });
  }
  if (housingAsOf) { const tt = sum(L.states.map((s) => (SB.housingTotal[s.code] ? last(SB.housingTotal[s.code])[1] : 0))), pp = sum(L.states.map((s) => (SB.housingPastDue[s.code] ? last(SB.housingPastDue[s.code])[1] : 0))); nat.housingCredit = r0(tt * 1e6 / L.households); nat.housingPastDue = r2(pp / tt * 100); }
  D.states = { asOf: String(y), first, back, remitAsOf, housingAsOf, povertyAsOf: D.poverty ? D.poverty.asOf : null, povertyFirst: D.poverty ? String(D.poverty.years[0]) : null, mx: nat, list };
}

// ------------------------------------------------------------------------------------------------------------------
// Macro aggregates beside the survey: consumption in the national accounts, the monthly indicator, card payments, remittances
// ------------------------------------------------------------------------------------------------------------------
if (D.funds) {
  // private consumption and GDP at current prices, both quarterly (annualized levels): the last four quarters of each
  const pcq = iobs('privateConsQ'), pca = iobs('privateCons');
  if (pcq && pcq.length > 8) {
    const q = last(pcq)[0] <= lastGdpQ ? last(pcq)[0] : lastGdpQ, C = mapOf(pcq);
    const c4 = (qq) => { const v = [0, 1, 2, 3].map((n) => C.get(prevQ(qq, n))); return v.every((x) => x != null) ? sum(v) / 4 : null; };
    const c = c4(q), g = gdp4(q);
    if (c && g) {
      const qs = pcq.map((x) => x[0]).filter((qq) => qq >= '2006-Q4' && c4(qq) && gdp4(qq));
      D.funds.consGdp = { asOf: q, v: r1(c / g * 100), cons: r1(c / 1e6), gdp: r1(g / 1e6), q: qs, series: qs.map((qq) => r1(c4(qq) / gdp4(qq) * 100)) };   // billones de pesos
      must('Accounts', 'private consumption is between 55% and 80% of GDP', D.funds.consGdp.v > 55 && D.funds.consGdp.v < 80);
      // the yearly accounts give the same share for the last full year both series cover
      if (pca && pca.length) { const yr = pca.map((x) => x[0]).filter((yy) => C.get(`${yy}-Q4`) != null && gdpQ.get(`${yy}-Q4`) != null).pop(); if (yr) { const A = mapOf(pca); tie('Accounts', `consumption share of GDP in ${yr}: quarterly and yearly accounts agree (points)`, c4(`${yr}-Q4`) / gdp4(`${yr}-Q4`) * 100, A.get(yr) / gdp4(`${yr}-Q4`) * 100, 1.5, true); } }
      src('accounts', 'inegi', { name: 'INEGI, Sistema de Cuentas Nacionales de México: oferta y demanda global y PIB trimestral a precios corrientes', url: 'https://www.inegi.org.mx/programas/ofyd/2018/', asOf: q });
    }
  }
  const ct = obs('consTotal');
  if (ct && ct.length > 60) {
    const from = '2018-01', keys = ['consTotal', 'consGoods', 'consServices', 'consImported'], lm = last(ct)[0];
    const months = ct.map((x) => x[0]).filter((m) => m >= from);
    const ser = {}; for (const k of keys) { const M = mapOf(obs(k)); ser[k] = months.map((m) => (M.get(m) == null ? null : r1(M.get(m)))); }
    D.funds.indicator = { asOf: lm, months, total: ser.consTotal, goods: ser.consGoods, services: ser.consServices, imported: ser.consImported, yoy: Object.fromEntries(keys.map((k) => [k, yoy(obs(k), lm)])),
      vs2019: Object.fromEntries(keys.map((k) => { const M = mapOf(obs(k)); const b = []; for (let i = 1; i <= 12; i++) { const v = M.get(`2019-${String(i).padStart(2, '0')}`); if (v != null) b.push(v); } return [k, b.length === 12 ? r1((M.get(lm) / (sum(b) / 12) - 1) * 100) : null]; })) };
    src('consumption', 'banxico', { name: 'INEGI, Indicador Mensual del Consumo Privado en el Mercado Interior (series desestacionalizadas), vía Banco de México', url: cuadro('consTotal'), asOf: lm });
  }
  const rm = obs('remit');
  if (rm && rm.length > 36) {
    const lm = last(rm)[0], M = mapOf(rm), s12 = (m) => { const v = []; for (let i = 0; i < 12; i++) v.push(M.get(monthAdd(m, -i))); return v.every((x) => x != null) ? sum(v) : null; };
    const months = rm.map((x) => x[0]).filter((m) => m >= '2010-12');
    D.funds.remittances = { asOf: lm, months, sum12: months.map((m) => r2(s12(m) / 1000)), latest12: r2(s12(lm) / 1000), yearAgo12: r2(s12(monthAdd(lm, -12)) / 1000), month: r1(M.get(lm)) };   // US$ billions
    src('remittances', 'banxico', { name: 'Banco de México, ingresos por remesas familiares', url: cuadro('remit'), asOf: lm });
  }
}
const CP = raw.cards;
if (CP && CP.months && CP.months.length >= 24 && CP.giros.total) {
  const n = CP.months.length, l12 = (a) => sum(a.slice(n - 12)), p12 = (a) => sum(a.slice(n - 24, n - 12));
  const keys = Object.keys(CP.giros).filter((k) => k !== 'total');
  const totL = l12(CP.giros.total), sumL = sum(keys.map((k) => l12(CP.giros[k])));
  tie('Card payments', 'merchant categories add up to the total of the last twelve months (millions of pesos)', sumL, totL, totL * 0.002);
  const infl = inpc.get(last(CP.months)) && inpc.get(monthAdd(last(CP.months), -12)) ? (() => { let a = 0, b = 0; for (let i = 0; i < 12; i++) { a += inpc.get(monthAdd(last(CP.months), -i)) || 0; b += inpc.get(monthAdd(last(CP.months), -12 - i)) || 0; } return a / b; })() : null;
  D.cardPayments = { asOf: last(CP.months), from: CP.months[n - 12], total: r1(totL / 1000), totalYoy: r1((totL / p12(CP.giros.total) - 1) * 100), totalYoyReal: infl ? r1(((totL / p12(CP.giros.total)) / infl - 1) * 100) : null,   // billions of pesos
    giros: keys.map((k) => ({ k, v: r1(l12(CP.giros[k]) / 1000), pct: r1(l12(CP.giros[k]) / totL * 100), yoy: p12(CP.giros[k]) > 0 ? r1((l12(CP.giros[k]) / p12(CP.giros[k]) - 1) * 100) : null })).sort((a, b) => b.v - a.v),
    months: CP.months, monthly: CP.giros.total.map((v) => r1(v / 1000)) };
  src('cardPayments', 'cards', { name: CP.source.name, url: CP.source.url, asOf: last(CP.months) });
}

// ------------------------------------------------------------------------------------------------------------------
// 06 Credit: Banco de México's household financing, bank portfolios, past-due ratios, rates; the ENIF on who has credit
// ------------------------------------------------------------------------------------------------------------------
const fin = obs('finHH');
if (fin && fin.length > 40) {
  const q = last(fin)[0], v = (k, qq = q) => { const M = mapOf(obs(k)); return M.get(qq); };
  const tot = v('finHH'), cons = v('finCons'), viv = v('finViv'), bCons = v('finBankCons'), bViv = v('finBankViv'), info = v('finInfonavit'), fov = v('finFovissste');
  tie('Banxico financing', 'household financing = consumer + housing (millions of pesos)', cons + viv, tot, 2);
  must('Banxico financing', 'bank consumer credit does not exceed consumer financing', bCons <= cons + 1 && bViv + info + fov <= viv + 1);
  const parts = [['bankCons', bCons], ['otherCons', cons - bCons], ['bankViv', bViv], ['infonavit', info], ['fovissste', fov], ['otherViv', viv - bViv - info - fov]];
  const qs = fin.map((x) => x[0]).filter((qq) => qq >= '2005-Q4');
  const ratio = (k) => qs.map((qq) => { const g = gdpFor(qq), a = v(k, qq); return g && a != null && g.q === qq ? r1(a / g.v * 100) : null; });
  const g = gdpFor(q);
  const realQ = (k, back) => { const m1 = quarterEndMonth(q), m0 = quarterEndMonth(prevQ(q, back)), a = v(k), b = v(k, prevQ(q, back)); return a != null && b && inpc.get(m1) && inpc.get(m0) ? r1(((a / b) / (inpc.get(m1) / inpc.get(m0)) - 1) * 100) : null; };
  D.credit = { asOf: q, total: r1(tot / 1000), consumer: r1(cons / 1000), housing: r1(viv / 1000), parts: parts.map(([k, x]) => ({ k, v: r1(x / 1000), pct: pct(x, tot) })),
    gdpShare: g ? r1(tot / g.v * 100) : null, gdpQ: g ? g.q : null, yoyReal: { total: realQ('finHH', 4), consumer: realQ('finCons', 4), housing: realQ('finViv', 4) },
    hist: { q: qs, total: ratio('finHH'), consumer: ratio('finCons'), housing: ratio('finViv') } };
  src('financing', 'banxico', { name: 'Banco de México, financiamiento total a los hogares (CF297)', url: cuadro('finHH'), asOf: q });
}
// Two tables of Banco de México: CF835 (performing portfolio by product; a continuous series, so balances and growth come
// from it) and CF762 / CF766 (total and past-due portfolio by product; the past-due ratio = past due ÷ total of the same
// table). The coverage of CF762 changed in February 2026 (its card portfolio rises by a third in one month while CF835
// shows no jump), so its balances are used only inside that ratio.
const tc = obs('totCons'), bk = obs('bkCons');
if (tc && bk && tc.length > 60 && bk.length > 60) {
  const m = last(tc)[0], T = (k, mm = m) => mapOf(obs(k)).get(mm);
  const mb = last(bk)[0], B = (k, mm = mb) => mapOf(obs(k)).get(mm);
  const PROD = [['card', 'bkCard', 'totCard', 'pdCard'], ['payroll', 'bkPayroll', 'totPayroll', 'pdPayroll'], ['personal', 'bkPersonal', 'totPersonal', 'pdPersonal'], ['auto', 'bkAuto', 'totAuto', 'pdAuto'], ['goods', 'bkGoods', null, null], ['other', 'bkOther', null, null]];
  tie('Banxico bank credit', 'performing consumer portfolio = its six products (millions of pesos)', sum(PROD.map((p) => B(p[1]))), B('bkCons'), 2);
  must('Banxico bank credit', 'both tables end in the same month', m === mb, true);
  const ratio = (t, p, mm = m) => (T(t, mm) > 0 && T(p, mm) != null ? r2(T(p, mm) / T(t, mm) * 100) : null);
  const products = PROD.map(([k, b, t, p]) => ({ k, v: r1(B(b) / 1000), pct: pct(B(b), B('bkCons')), yoyReal: realGrowth(obs(b), mb, 12), imor: t ? ratio(t, p) : null, imorYearAgo: t ? ratio(t, p, monthAdd(m, -12)) : null }));
  const months = tc.map((x) => x[0]).filter((mm) => mm >= '2011-02');
  const imor = (t, p) => { const A = mapOf(obs(t)), P2 = mapOf(obs(p)); return months.map((mm) => (A.get(mm) > 0 && P2.get(mm) != null ? r2(P2.get(mm) / A.get(mm) * 100) : null)); };
  const gm = bk.map((x) => x[0]).filter((mm) => mm >= '2016-01');
  const bank = { asOf: mb, imorAsOf: m, consumer: r1(B('bkCons') / 1000), housing: r1(B('bkHousing') / 1000), products, consumerYoyReal: realGrowth(bk, mb, 12), housingYoyReal: realGrowth(obs('bkHousing'), mb, 12),
    imor: { consumer: ratio('totCons', 'pdCons'), consumerYearAgo: ratio('totCons', 'pdCons', monthAdd(m, -12)), housing: ratio('totHousing', 'pdHousing'), housingYearAgo: ratio('totHousing', 'pdHousing', monthAdd(m, -12)) },
    hist: { months, consumer: imor('totCons', 'pdCons'), card: imor('totCard', 'pdCard'), payroll: imor('totPayroll', 'pdPayroll'), personal: imor('totPersonal', 'pdPersonal'), auto: imor('totAuto', 'pdAuto'), housing: imor('totHousing', 'pdHousing') },
    growth: { months: gm, consumer: gm.map((mm) => realGrowth(bk, mm, 12)), card: gm.map((mm) => realGrowth(obs('bkCard'), mm, 12)), payroll: gm.map((mm) => realGrowth(obs('bkPayroll'), mm, 12)), personal: gm.map((mm) => realGrowth(obs('bkPersonal'), mm, 12)), auto: gm.map((mm) => realGrowth(obs('bkAuto'), mm, 12)), housing: gm.map((mm) => realGrowth(obs('bkHousing'), mm, 12)) } };
  must('Banxico bank credit', 'past-due ratios are between 0 and 25%', [bank.imor.consumer, bank.imor.housing, ...products.map((p) => p.imor).filter((x) => x != null)].every((x) => x >= 0 && x < 25));
  D.bank = bank;
  src('bankCredit', 'banxico', { name: 'Banco de México, crédito de la banca comercial a los hogares: cartera vigente por producto (CF835), cartera total y vencida (CF762, CF766)', url: cuadro('bkCons'), asOf: mb });
}
const rc = obs('rtCardRev');
if (rc && rc.length > 20) {
  const per = rc.map((x) => x[0]), K = { cardRev: 'rtCardRev', cardAll: 'rtCardAll', personal: 'rtPersonal', payroll: 'rtPayroll', auto: 'rtAuto', mortgage: 'rtMortgage' };
  const ser = {}; for (const k of Object.keys(K)) { const M = mapOf(obs(K[k])); ser[k] = per.map((p) => (M.get(p) == null ? null : r1(M.get(p)))); }
  const lastOf = (k) => { const o = obs(K[k]); return o && o.length ? { v: r1(last(o)[1]), asOf: last(o)[0] } : null; };
  D.rates = { asOf: last(rc)[0], periods: per, series: ser, latest: Object.fromEntries(Object.keys(K).map((k) => [k, lastOf(k)])), mortgageCat: obs('rtMortgageCat') ? { v: r1(last(obs('rtMortgageCat'))[1]), asOf: last(obs('rtMortgageCat'))[0] } : null,
    cardNoPromo: obs('rtCardRevNoPromo') ? r1(last(obs('rtCardRevNoPromo'))[1]) : null };
  must('Banxico rates', 'card rates are between 10% and 90%', D.rates.latest.cardRev.v > 10 && D.rates.latest.cardRev.v < 90);
  src('rates', 'banxico', { name: 'Banco de México, indicadores básicos de tarjetas de crédito y de créditos de nómina, personales y automotrices; costo de créditos hipotecarios', url: cuadro('rtCardRev'), asOf: last(rc)[0] });
}
const cif = obs('cardsInForce');
if (cif && cif.length > 8) {
  const q = last(cif)[0], M = mapOf(cif), ya = M.get(prevQ(q, 4));
  D.cardsInForce = { asOf: q, v: r1(last(cif)[1] / 1e6), yoy: ya ? r1((last(cif)[1] / ya - 1) * 100) : null, q: cif.map((x) => x[0]).filter((qq) => qq >= '2010-Q1'), series: cif.filter((x) => x[0] >= '2010-Q1').map((x) => r1(x[1] / 1e6)) };
  src('cardsInForce', 'banxico', { name: 'Banco de México, sistemas de pago de bajo valor: tarjetas de crédito vigentes', url: cuadro('cardsInForce'), asOf: q });
}
const bis = raw.fred && raw.fred.series && raw.fred.series.hhCreditGdp;
if (bis && bis.obs && bis.obs.length > 20) {
  must('BIS', 'the series is household credit as a percent of GDP for Mexico', /households/i.test(bis.title) && /mexico/i.test(bis.title) && /percent/i.test(bis.units || ''));
  const o = bis.obs.filter((x) => x[0] >= '2000-Q1');
  D.bis = { asOf: last(o)[0], v: r1(last(o)[1]), q: o.map((x) => x[0]), series: o.map((x) => r1(x[1])) };
  src('bis', 'fred', { name: 'Banco de Pagos Internacionales (BIS), crédito total a los hogares, México', url: bis.url, via: true, asOf: last(o)[0] });
}
const sv = obs('svDemand'), ss = obs('svStandards');
if (sv && ss && sv.length > 8) {
  D.lending = { asOf: last(sv)[0], q: sv.map((x) => x[0]), demand: sv.map((x) => r2(x[1])), standards: (() => { const M = mapOf(ss); return sv.map((x) => (M.get(x[0]) == null ? null : r2(M.get(x[0])))); })() };
  src('lending', 'banxico', { name: 'Banco de México, Encuesta sobre Condiciones Generales y Estándares en el Mercado de Crédito Bancario (EnBan)', url: cuadro('svDemand'), asOf: last(sv)[0] });
}

// ------------------------------------------------------------------------------------------------------------------
// ENIF: financial inclusion (people aged 18 to 70)
// ------------------------------------------------------------------------------------------------------------------
const EF = raw.enif, EFP = readJson(TOOLS + 'data/enif-published.json');
if (EF && EF.all) {
  if (EFP && EFP.year === EF.year) {
    for (const k of Object.keys(EFP.all)) tie('ENIF', `${k} of all adults`, EF.all[k], EFP.all[k], 0.11);
    for (const s of Object.keys(EFP.bySex)) for (const k of Object.keys(EFP.bySex[s])) tie('ENIF', `${k} of ${s}`, EF.bySex[s][k], EFP.bySex[s][k], 0.11);
    for (const k of Object.keys(EFP.saving)) tie('ENIF', `saving: ${k}`, EF.all.saving[k], EFP.saving[k], 0.11);
    for (const k of Object.keys(EFP.byRegion)) tie('ENIF', `any product, region ${k}`, EF.byRegion[k].anyProduct, EFP.byRegion[k], 0.11);
  } else must('ENIF', `published shares of the ${EF.year} edition are in data/enif-published.json`, false, true);
  tie('ENIF', 'saving groups add up to 100', sum(Object.values(EF.all.saving)), 100, 0.3);
  tie('ENIF', 'cushion groups add up to 100', sum(Object.values(EF.all.cushion)), 100, 0.3);
  const slim = (t) => ({ people: t.people, sample: t.sample, anyProduct: t.anyProduct, anyAccount: t.anyAccount, anyCredit: t.anyCredit, anyInformalCredit: t.anyInformalCredit, noCredit: t.noCredit, onlyInformalCredit: t.onlyInformalCredit, afore: t.afore, insurance: t.insurance,
    lateAny: t.lateAny, notEnough: t.notEnough, rejected: t.rejected, everApplied: t.everApplied, cushion: t.cushion, saving: t.saving, bankCard: t.credit.bankCard, storeCard: t.credit.storeCard, housing: t.credit.housing, app: t.accounts.app, leftoverNever: t.leftover ? t.leftover.never : null,
    cannotPay: t.debtView ? r1(t.debtView.cannot + t.debtView.some) : null });
  const G = { sex: ['men', 'women'], age: ['18-29', '30-44', '45-59', '60-70'], edu: ['basic', 'highSchool', 'college'], locality: ['urban', 'small'], region: ['northwest', 'northeast', 'west', 'cdmx', 'center', 'south'] };
  const by = { sex: EF.bySex, age: EF.byAge, edu: EF.byEdu, locality: EF.byLocality, region: EF.byRegion };
  D.enif = { asOf: String(EF.year), universe: EF.universe, all: EF.all, groups: Object.fromEntries(Object.keys(G).map((g) => [g, G[g].map((k) => ({ k, ...slim(by[g][k]) }))])) };
  src('enif', 'enif', { name: EF.source.name, url: EF.source.url, asOf: String(EF.year) });
}

// ------------------------------------------------------------------------------------------------------------------
// 08 Wealth: the ENFIH 2019 (curated, checked against the stored presentation), household savings at Banco de México
// ------------------------------------------------------------------------------------------------------------------
const XF = readJson(TOOLS + 'data/enfih.json'), docs = raw.docs && raw.docs.docs ? raw.docs.docs : {};
if (XF && docs[XF.doc]) {
  const text = readText(docs[XF.doc].file) || '';
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const pages = {}; text.split(/^==== page (\d+) ====$/m).forEach((chunk, i, a) => { if (i % 2 === 1) pages[a[i]] = norm(a[i + 1] || ''); });
  // "1 352.7" and "1,352.7" are the number 1352.7; "$3,028.50" is 3028.5
  // (a space is also what separates two figures of a row, so a figure is looked for in the text as printed first and with the spaces of thousands closed second)
  const commas = (s) => String(s).replace(/(\d),(?=\d{3}(\D|$))/g, '$1'), spaces = (s) => commas(s).replace(/(?<![\d.])(\d{1,3}) (?=\d{3}(\D|$))/g, '$1');
  const numIn = (v, find) => { const a = Math.abs(v); return [commas(find), spaces(find)].some((f) => [String(a), a.toFixed(1), a.toFixed(2), String(Math.round(a))].filter((x) => Number(x) === a).some((x) => new RegExp(`(^|[^0-9.])${x.replace('.', '\\.')}($|[^0-9])`).test(f))); };
  let bad = 0;
  const ok = (name, v, find, page) => { const here = pages[String(page)] || ''; const good = here.includes(norm(find)) && [].concat(v).every((x) => numIn(x, find)) && (v >= 0 || [].concat(v).every((x) => x >= 0) || /-/.test(find)); if (!good) { bad++; checks.push({ tag: 'ENFIH', check: `${name}: "${find}" on page ${page}`, status: 'fail' }); } return good; };
  const one = (name, o, page) => (ok(name, o.v, o.find, o.page || page) ? o.v : null);
  const tot = {}; for (const k of Object.keys(XF.totals)) tot[k] = one(`totals.${k}`, XF.totals[k]);
  const grp = (name, g) => ({ mean: g.mean.map((o, i) => one(`${name}.mean[${i}]`, o, g.page)), median: g.median.map((o, i) => one(`${name}.median[${i}]`, o, g.page)) });
  const nw = grp('byNetWorth', XF.byNetWorth), inc = grp('byIncome', XF.byIncome);
  const two = (name, g, keys) => keys.map((k) => ({ k, median: one(`${name}.${k}.median`, g[k].median, g.page), mean: one(`${name}.${k}.mean`, g[k].mean, g.page) }));
  const row = (name, g, f) => (ok(`${name}.${f}`, g[f].v, g[f].find, g.page) ? g[f].v : g.order.map(() => null));
  const tab = (name, g, fields) => { const cols = Object.fromEntries(fields.map((f) => [f, row(name, g, f)])); return g.order.map((k, i) => ({ k, ...Object.fromEntries(fields.map((f) => [f, cols[f][i]])) })); };
  const obj = (name, g, keys) => Object.fromEntries(keys.map((k) => [k, one(`${name}.${k}`, g[k], g.page)]));
  const debt = {}; for (const k of ['any', 'mortgage', 'other']) debt[k] = { own: one(`debt.${k}.own`, XF.debt[k].own, XF.debt.page), mean: one(`debt.${k}.mean`, XF.debt[k].mean, XF.debt.page), median: one(`debt.${k}.median`, XF.debt[k].median, XF.debt.page) };
  const W = { asOf: String(XF.year), reviewed: XF.reviewed, totals: tot, groupKeys: XF.groupKeys, sizes: XF.groupSizes, byNetWorth: nw, byIncome: inc,
    bySex: two('bySex', XF.bySex, ['men', 'women']), byEdu: two('byEdu', XF.byEdu, ['none', 'basic', 'highSchool', 'college', 'graduate']),
    assets: tab('assets', XF.assets, ['own', 'median', 'mean']), assetValue: tab('assetValue', XF.assetValue, ['share']), financial: tab('financial', XF.financial, ['own', 'median', 'mean']), financialValue: tab('financialValue', XF.financialValue, ['share']),
    debt, debtTypes: tab('debtTypes', XF.debtTypes, ['own', 'median', 'mean']), debtValue: { mortgage: one('debtValue.mortgage', XF.debtValue.mortgage, XF.debtValue.page), other: one('debtValue.other', XF.debtValue.other, XF.debtValue.page), split: tab('debtValue', XF.debtValue, ['share']) },
    burden: obj('burden', XF.burden, ['paymentToIncome', 'debtToIncome', 'debtToAssets', 'mortgageToHome', 'mortgageServiceToIncome']), perception: obj('perception', XF.perception, ['canSave', 'justEnough', 'notEnough']),
    emergency: obj('emergency', XF.emergency, ['family', 'sellOrPawn', 'wageAdvance', 'savings', 'bankCredit']), housingFinance: obj('housingFinance', XF.housingFinance, ['mortgage', 'informalLoan', 'subsidy', 'none']) };
  if (!bad) {
    // the document's own arithmetic, which settled the place of every bar in its charts
    const wsum = (a) => sum(a.map((v, i) => v * XF.groupSizes[i] / 100));
    tie('ENFIH', 'net-worth groups, weighted by their size, give the national mean (thousands of pesos)', wsum(nw.mean), tot.mean, 0.6);
    tie('ENFIH', 'income groups, weighted by their size, give the national mean (thousands of pesos)', wsum(inc.mean), tot.mean, 1.5);
    tie('ENFIH', 'the median of the middle net-worth group is the national median', nw.median[2], tot.median, 0.05);
    must('ENFIH', 'means and medians rise with the group', [nw.mean, nw.median, inc.mean, inc.median].every((a) => a.every((v, i) => !i || v > a[i - 1])));
    tie('ENFIH', 'net worth = assets - debts (billones)', tot.assets - tot.debts, tot.netWorth, 0.06);
    tie('ENFIH', 'assets = non-financial + financial (billones)', tot.nonFinancial + tot.financial, tot.assets, 0.06);
    tie('ENFIH', 'debts = mortgage + other (billones)', tot.mortgageDebt + tot.otherDebt, tot.debts, 0.06);
    tie('ENFIH', 'value shares of non-financial assets add up to 100', sum(W.assetValue.map((x) => x.share)), 100, 0.3);
    tie('ENFIH', 'value shares of financial assets add up to 100', sum(W.financialValue.map((x) => x.share)), 100, 0.3);
    tie('ENFIH', 'mortgage and other debt add up to 100', W.debtValue.mortgage + W.debtValue.other, 100, 0.11);
    tie('ENFIH', 'the four kinds of non-mortgage debt add up to its share', sum(W.debtValue.split.map((x) => x.share)), W.debtValue.other, 0.11);
    tie('ENFIH', 'perception groups add up to 100', W.perception.canSave + W.perception.justEnough + W.perception.notEnough, 100, 0.11);
    // FNAM calculation: each group's share of all net worth = its mean x its share of households / the national mean
    const total = wsum(nw.mean);
    W.share = nw.mean.map((v, i) => r1(v * XF.groupSizes[i] / 100 / total * 100));
    W.top10 = r1(W.share[5] + W.share[6]); W.top5 = W.share[6]; W.bottom40 = r1(W.share[0] + W.share[1]); W.bottom60 = r1(W.share[0] + W.share[1] + W.share[2]);
    D.enfih = W;
    src('enfih', 'docs', { name: docs[XF.doc].name, url: docs[XF.doc].page || docs[XF.doc].url, doc: docs[XF.doc].url, asOf: String(XF.year) });
  }
} else must('ENFIH', 'the curated file and the stored presentation are present', false, true);

const m2 = obs('m2HH');
if (m2 && m2.length > 60) {
  const m = last(m2)[0], K = { m2: 'm2HH', liquid: 'm1HH', term: 'termHH', funds: 'svTotal', retirement: 'svRetire', siefores: 'svSiefores', housingFunds: 'svHousing', infonavit: 'svInfonavit' };
  const V = (k, mm = m) => mapOf(obs(K[k])).get(mm);
  tie('Banxico savings', 'household M2 = liquid instruments + term instruments (thousands of pesos)', V('liquid') + V('term'), V('m2'), V('m2') * 0.0005);
  tie('Banxico savings', 'retirement and housing funds add up to their total', V('retirement') + V('housingFunds'), V('funds'), V('funds') * 0.0005);
  const months = m2.map((x) => x[0]).filter((mm) => mm >= '2005-12' && /-(03|06|09|12)$/.test(mm));
  if (!months.includes(m)) months.push(m);
  const gOf = (mm) => { const g = gdpFor(quarterOfMonth(mm)); return g ? g.v : null; };
  const ratio = (k) => months.map((mm) => { const g = gOf(mm), a = V(k, mm); return g && a != null ? r1(a / 1000 / g * 100) : null; });
  const fm = last(obs('svTotal'))[0];
  D.savings = { asOf: m, m2: r1(V('m2') / 1e9), liquid: r1(V('liquid') / 1e9), term: r1(V('term') / 1e9), funds: r1(V('funds', fm) / 1e9), retirement: r1(V('retirement', fm) / 1e9), siefores: r1(V('siefores', fm) / 1e9), housingFunds: r1(V('housingFunds', fm) / 1e9), infonavit: r1(V('infonavit', fm) / 1e9), fundsAsOf: fm,   // billones de pesos
    yoyReal: { m2: realGrowth(m2, m, 12), funds: realGrowth(obs('svTotal'), fm, 12) }, gdpShare: { m2: last(ratio('m2')), funds: last(ratio('funds')) },
    hist: { months, m2: ratio('m2'), retirement: ratio('retirement'), housingFunds: ratio('housingFunds') } };
  src('savings', 'banxico', { name: 'Banco de México, M2 por tenedor (hogares) y fondos de ahorro para la vivienda y el retiro (CF886, CF834)', url: cuadro('m2HH'), asOf: m });
}

// ------------------------------------------------------------------------------------------------------------------
// 09 Wages and work: the minimum wage, average real pay, workers by multiples of the minimum wage, informality
// ------------------------------------------------------------------------------------------------------------------
const mw = obs('minWageReal'), rw = iobs('realWages');
if (mw && rw && mw.length > 100 && rw.length > 100) {
  const from = '2012-01', lm = last(rw)[0] < last(mw)[0] ? last(rw)[0] : last(mw)[0];
  const months = rw.map((x) => x[0]).filter((m) => m >= from && m <= lm);
  const reb = (o) => { const M = mapOf(o), b = []; for (let i = 1; i <= 12; i++) { const v = M.get(`2018-${String(i).padStart(2, '0')}`); if (v != null) b.push(v); } const base = sum(b) / b.length; return months.map((m) => (M.get(m) == null ? null : r1(M.get(m) / base * 100))); };
  const mwP = mapOf(obs('minWage'));
  D.wages = { asOf: lm, months, minWage: reb(mw), avgPay: reb(rw), minWagePesos: mwP.get(last(mw)[0]) || null, minWageAsOf: last(mw)[0], minWagePesos2018: mwP.get('2018-12') || null,
    retail: iobs('retail') ? (() => { const M = mapOf(iobs('retail')), b = []; for (let i = 1; i <= 12; i++) { const v = M.get(`2018-${String(i).padStart(2, '0')}`); if (v != null) b.push(v); } const base = sum(b) / b.length; return months.map((m) => (M.get(m) == null ? null : r1(M.get(m) / base * 100))); })() : null };
  must('Wages', 'both indexes are near 100 in 2018', Math.abs(D.wages.minWage[months.indexOf('2018-06')] - 100) < 8 && Math.abs(D.wages.avgPay[months.indexOf('2018-06')] - 100) < 8);
  src('wages', 'banxico', { name: 'Banco de México (salario mínimo general, índice real) e INEGI (índice global de remuneraciones medias reales, serie desestacionalizada)', url: cuadro('minWageReal'), asOf: lm });
}
const emp = iobs('employed');
if (emp && emp.length > 20) {
  const K = ['empUpTo1', 'emp1to2', 'emp2to3', 'emp3to5', 'empOver5', 'empNoIncome', 'empUnspecified'], q = last(emp)[0];
  const qs = emp.map((x) => x[0]).filter((qq) => qq >= '2012-Q1');
  const M = Object.fromEntries(K.concat(['employed']).map((k) => [k, mapOf(iobs(k))]));
  tie('ENOE', 'workers by income level add up to the employed', sum(K.map((k) => M[k].get(q))), M.employed.get(q), 5);
  const share = (k) => qs.map((qq) => { const a = M[k].get(qq), b = M.employed.get(qq); return a != null && b ? r1(a / b * 100) : null; });
  D.work = { asOf: q, employed: M.employed.get(q), levels: K.map((k) => ({ k: k.replace(/^emp/, ''), n: M[k].get(q), pct: pct(M[k].get(q), M.employed.get(q)) })), q: qs, upTo1: share('empUpTo1'), from1to2: share('emp1to2'), over2: qs.map((qq) => { const a = ['emp2to3', 'emp3to5', 'empOver5'].map((k) => M[k].get(qq)), b = M.employed.get(qq); return a.every((x) => x != null) && b ? r1(sum(a) / b * 100) : null; }) };
  src('enoe', 'inegi', { name: 'INEGI, Encuesta Nacional de Ocupación y Empleo (ENOE), población ocupada por nivel de ingresos', url: IN.employed.url || 'https://www.inegi.org.mx/programas/enoe/15ymas/', asOf: q });
}

// ------------------------------------------------------------------------------------------------------------------
const fails = checks.filter((c) => c.status === 'fail'), warns = checks.filter((c) => c.status === 'warn');
for (const c of fails) console.log(`::error::${c.tag}: ${c.check}${c.diff != null ? ` (diff ${c.diff}, tolerance ${c.tol})` : ''}`);
for (const c of warns.slice(0, 20)) console.log(`::warning::${c.tag}: ${c.check}${c.diff != null ? ` (diff ${c.diff}, tolerance ${c.tol})` : ''}${c.note ? ` (${c.note})` : ''}`);
const missing = ['demo', 'income', 'states', 'funds', 'deciles', 'kshape', 'poverty', 'credit', 'bank', 'rates', 'enif', 'enfih', 'savings', 'wages', 'work', 'cardPayments'].filter((k) => !D[k]);
console.log(`tie-outs: ${checks.length} (${checks.length - fails.length - warns.length} ok, ${warns.length} warn, ${fails.length} fail); blocks missing: ${missing.join(', ') || 'none'}`);
for (const x of stale) console.log(`::warning::overdue: ${x.id} is stamped ${x.asOf}; a newer period was due by ${x.dueBy}`);
if (!CHECK) {
  const log = { checks: checks.filter((c) => c.status !== 'ok'), counts: { ok: checks.length - fails.length - warns.length, warn: warns.length, fail: fails.length }, missing, stale, sourceStatus: status.sources || {} };
  if (JSON.stringify(readJson(RAW + 'build-log.json')) !== JSON.stringify(log)) writeJson(RAW + 'build-log.json', log);
}
if (fails.length) process.exit(1);
if (!CHECK) {
  const HEAD = '// The Mexican Consumer: data of the page, built from official sources (INEGI, Banco de México, CNBV, BIS).\n';
  const prevText = readText(SITE + 'data/data.js');
  let prevGen = null, prevBody = null;
  if (prevText) { const m = /"generatedAt":"([^"]*)"/.exec(prevText.slice(0, 400)); prevGen = m ? m[1] : null; prevBody = prevText.replace(/"generatedAt":"[^"]*"/, '"generatedAt":null'); }
  const body = (gen) => `${HEAD}window.MXC_DATA = ${JSON.stringify({ ...D, generatedAt: gen })};\n`;
  if (prevBody && prevBody === body(null) && prevGen) console.log('data.js unchanged');
  else { writeText(SITE + 'data/data.js', body(nowIso())); console.log('data.js written'); }
}
