// INEGI · Encuesta Nacional de Ingresos y Gastos de los Hogares (ENIGH, nueva serie): the survey's public microdata
// turned into the tables the Mexican Consumer page draws. INEGI publishes one household summary file per edition
// (concentradohogar: income by source, spending by item, financial receipts and outlays, expansion factor) plus the
// dwelling, household and person files. Everything here is a weighted tabulation of those files with INEGI's own
// expansion factor, the way INEGI's tabulations are built: the national average, the deciles and the state averages
// reproduce the published figures to the peso (the builder checks them against tools/mx-consumidor/data/enigh-published.json).
//
// Deciles: households ranked by quarterly current income (ing_cor) and cut into ten groups with the same number of
// households; a household that straddles a cut is split between the two groups in proportion (INEGI's procedure).
// Gini: INEGI's coefficient, computed on the ten decile means (with transfers, and on income net of transfers).
import { readFileSync } from 'node:fs';

// ---- variables of concentradohogar (quarterly pesos per household) ----
export const INCOME = ['ing_cor', 'ingtrab', 'trabajo', 'negocio', 'otros_trab', 'rentas', 'utilidad', 'arrenda', 'transfer', 'jubilacion', 'becas', 'donativos', 'remesas', 'bene_gob', 'transf_hog', 'trans_inst', 'estim_alqu', 'otros_ing'];
export const SPENDING = ['gasto_mon', 'alimentos', 'ali_dentro', 'ali_fuera', 'tabaco', 'vesti_calz', 'vivienda', 'alquiler', 'pred_cons', 'agua', 'energia', 'limpieza', 'salud', 'transporte', 'publico', 'foraneo', 'adqui_vehi', 'mantenim', 'refaccion', 'combus', 'comunica',
  'educa_espa', 'educacion', 'esparci', 'paq_turist', 'personales', 'cuida_pers', 'acces_pers', 'otros_gas', 'transf_gas'];
export const FINANCIAL = ['percep_tot', 'retiro_inv', 'prestamos', 'otras_perc', 'erogac_tot', 'cuota_viv', 'mater_serv', 'deposito', 'prest_terc', 'pago_tarje', 'deudas', 'balance', 'otras_erog'];
const VARS = [...INCOME, ...SPENDING, ...FINANCIAL];
// share of households with a positive amount (who receives it, who pays it)
export const INCIDENCE = ['ingtrab', 'trabajo', 'negocio', 'rentas', 'jubilacion', 'becas', 'donativos', 'remesas', 'bene_gob', 'alquiler', 'adqui_vehi', 'ali_fuera', 'prestamos', 'retiro_inv', 'deposito', 'pago_tarje', 'deudas', 'cuota_viv', 'prest_terc'];

// a comma-separated file with no quoted fields (INEGI's microdata) -> { head, rows } with trimmed string cells
export function readTable(file) {
  const text = readFileSync(file, 'latin1').replace(/^ï»¿/, '');
  const lines = text.split(/\r?\n/);
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) { if (lines[i]) rows.push(lines[i].split(',')); }
  return { head, rows };
}
const numOf = (s) => { const n = Number(String(s == null ? '' : s).trim()); return Number.isFinite(n) ? n : 0; };

// ---- weighted helpers ----
function quantiles(items, qs) {   // items: [{ v, w }] ; returns the weighted quantiles (lower interpolation: first value whose cumulative weight reaches q)
  const a = items.slice().sort((x, y) => x.v - y.v);
  const tot = a.reduce((s, x) => s + x.w, 0);
  const out = [];
  let cum = 0, i = 0;
  for (const q of qs) {
    const target = q * tot;
    while (i < a.length && cum + a[i].w < target) { cum += a[i].w; i++; }
    out.push(a[Math.min(i, a.length - 1)].v);
  }
  return out;
}
// ten groups of equal weight: every household gets its share(s) [[decile, weight], …]
function assignDeciles(hh, key, n = 10) {
  const order = hh.map((h, i) => i).sort((a, b) => hh[a][key] - hh[b][key]);
  const total = hh.reduce((s, h) => s + h.w, 0), size = total / n;
  let cum = 0;
  const parts = new Array(hh.length);
  for (const i of order) {
    let rem = hh[i].w; const p = [];
    while (rem > 1e-9) {
      const d = Math.min(n - 1, Math.floor(cum / size + 1e-12));
      const room = d < n - 1 ? (d + 1) * size - cum : rem;
      const take = room > 1e-9 ? Math.min(rem, room) : rem;
      p.push([d, take]); cum += take; rem -= take;
    }
    parts[i] = p;
  }
  return parts;
}
// INEGI's Gini on group means of equal-sized groups
export function giniOfMeans(means) {
  const tot = means.reduce((a, b) => a + b, 0), step = 1 / means.length;
  let acc = 0, area = 0;
  for (const m of means) { const prev = acc; acc += m / tot; area += step * (acc + prev); }
  return 1 - area;
}
const round = (v, d = 0) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

// accumulates weighted sums of every variable, persons and incidences for a set of (household, weight) pairs
function makeAcc() { return { w: 0, n: 0, persons: 0, sums: Object.fromEntries(VARS.map((v) => [v, 0])), inc: Object.fromEntries(INCIDENCE.map((v) => [v, 0])), extra: {} }; }
function add(acc, h, w) {
  acc.w += w; acc.n += 1; acc.persons += h.tot_integ * w;
  for (const v of VARS) acc.sums[v] += h[v] * w;
  for (const v of INCIDENCE) if (h[v] > 0) acc.inc[v] += w;
  for (const k of Object.keys(h.flags || {})) { const f = h.flags[k]; if (f == null) continue; const e = acc.extra[k] || (acc.extra[k] = { yes: 0, base: 0 }); e.base += w; if (f) e.yes += w; }
}
function finish(acc, vars = VARS) {
  const o = { households: round(acc.w), sample: acc.n, persons: round(acc.persons), size: round(acc.persons / acc.w, 2), mean: {}, receive: {}, own: {} };
  for (const v of vars) o.mean[v] = round(acc.sums[v] / acc.w, 1);
  for (const v of INCIDENCE) o.receive[v] = round(acc.inc[v] / acc.w * 100, 1);
  for (const k of Object.keys(acc.extra)) o.own[k] = acc.extra[k].base ? round(acc.extra[k].yes / acc.extra[k].base * 100, 1) : null;
  return o;
}

export const AGE_GROUPS = [['<25', 0, 24], ['25-34', 25, 34], ['35-44', 35, 44], ['45-54', 45, 54], ['55-64', 55, 64], ['65+', 65, 200]];
// schooling of the head (educa_jefe 01–11) in five levels
export const EDU_GROUPS = [['none', ['01', '02', '03']], ['primary', ['04', '05']], ['secondary', ['06', '07']], ['highSchool', ['08', '09']], ['college', ['10', '11']]];
export const LOCALITY = { 1: 'big', 2: 'mid', 3: 'small', 4: 'rural' };   // 100,000 and over; 15,000–99,999; 2,500–14,999; under 2,500 inhabitants
export const HH_CLASS = { 1: 'alone', 2: 'nuclear', 3: 'extended', 4: 'composite', 5: 'coresident' };
// monthly current income brackets, pesos a month (the survey reports quarterly amounts; ÷ 3)
export const BRACKETS = [[0, 5000], [5000, 10000], [10000, 15000], [15000, 20000], [20000, 30000], [30000, 50000], [50000, 100000], [100000, null]];

// One edition. files: { concentrado, viviendas?, hogares?, poblacion? } (paths of the CSV files). detail: 'full' (the latest
// edition: states, groups of households, ownership, people), 'states' (earlier editions: national, deciles and the state
// averages) or 'lite' (national and deciles only).
export function aggregate(year, files, { detail = 'full' } = {}) {
  const full = detail === 'full';
  const T = readTable(files.concentrado);
  const ix = Object.fromEntries(T.head.map((h, i) => [h, i]));
  for (const need of ['folioviv', 'foliohog', 'ubica_geo', 'tam_loc', 'factor', 'clase_hog', 'sexo_jefe', 'edad_jefe', 'educa_jefe', 'tot_integ', ...VARS]) if (!(need in ix)) throw new Error(`ENIGH ${year}: column ${need} missing from concentradohogar`);
  const hh = T.rows.map((r) => {
    const h = { id: r[ix.folioviv].trim() + '|' + r[ix.foliohog].trim(), viv: r[ix.folioviv].trim(), w: numOf(r[ix.factor]), state: r[ix.ubica_geo].trim().padStart(5, '0').slice(0, 2), loc: r[ix.tam_loc].trim(), cls: r[ix.clase_hog].trim(), sex: r[ix.sexo_jefe].trim(), age: numOf(r[ix.edad_jefe]), edu: r[ix.educa_jefe].trim().padStart(2, '0'), tot_integ: numOf(r[ix.tot_integ]), flags: {} };
    for (const v of VARS) h[v] = numOf(r[ix[v]]);
    h.p65 = 'p65mas' in ix ? numOf(r[ix.p65mas]) : 0; h.minors = 'menores' in ix ? numOf(r[ix.menores]) : 0; h.earners = 'percep_ing' in ix ? numOf(r[ix.percep_ing]) : 0; h.workers = 'ocupados' in ix ? numOf(r[ix.ocupados]) : 0;
    h.ing_sin = h.ing_cor - h.transfer;   // current income net of transfers
    return h;
  });
  if (hh.length < 50000) throw new Error(`ENIGH ${year}: only ${hh.length} households read`);
  const byId = new Map(hh.map((h) => [h.id, h]));

  // dwelling: tenure (1 rented, 2 lent, 3 own and paying for it, 4 own, 5 intestate or in litigation, 6 other)
  if (files.viviendas) {
    const V = readTable(files.viviendas), vx = Object.fromEntries(V.head.map((h, i) => [h, i]));
    if (!('tenencia' in vx)) throw new Error(`ENIGH ${year}: tenencia missing from viviendas`);
    const ten = new Map(V.rows.map((r) => [r[vx.folioviv].trim(), r[vx.tenencia].trim()]));
    for (const h of hh) { const t = ten.get(h.viv); h.tenure = t || null; if (t) { h.flags.owner = t === '3' || t === '4'; h.flags.ownerPaying = t === '3'; h.flags.renter = t === '1'; h.flags.lent = t === '2'; } }
  }
  // household: vehicles, appliances, connectivity, use of a credit card
  if (files.hogares) {
    const H = readTable(files.hogares), hx = Object.fromEntries(H.head.map((h, i) => [h, i]));
    const has = (r, c) => (c in hx ? numOf(r[hx[c]]) > 0 : null), yes = (r, c) => (c in hx ? r[hx[c]].trim() === '1' : null);
    for (const r of H.rows) {
      const h = byId.get(r[hx.folioviv].trim() + '|' + r[hx.foliohog].trim()); if (!h) continue;
      const car = [has(r, 'num_auto'), has(r, 'num_van'), has(r, 'num_pick')];
      h.flags.vehicle = car.some((x) => x === true) ? true : car.every((x) => x === null) ? null : false;
      h.flags.moto = has(r, 'num_moto'); h.flags.fridge = has(r, 'num_refri'); h.flags.washer = has(r, 'num_lavad');
      const pc = [has(r, 'num_compu'), has(r, 'num_lap')]; h.flags.computer = pc.some((x) => x === true) ? true : pc.every((x) => x === null) ? null : false;
      h.flags.internet = yes(r, 'conex_inte'); h.flags.cell = yes(r, 'celular'); h.flags.payTv = yes(r, 'tv_paga'); h.flags.creditCard = yes(r, 'tarjeta');
    }
  }

  const all = makeAcc(); for (const h of hh) add(all, h, h.w);
  const nat = finish(all);
  const parts = assignDeciles(hh, 'ing_cor');
  const dAcc = Array.from({ length: 10 }, makeAcc);
  hh.forEach((h, i) => { for (const [d, w] of parts[i]) add(dAcc[d], h, w); });
  const deciles = dAcc.map((a) => finish(a));
  // income net of transfers: its own ranking (INEGI's "sin transferencias" coefficient)
  const partsSin = assignDeciles(hh, 'ing_sin'), sinMeans = new Array(10).fill(0), sinW = new Array(10).fill(0);
  hh.forEach((h, i) => { for (const [d, w] of partsSin[i]) { sinMeans[d] += h.ing_sin * w; sinW[d] += w; } });
  const items = hh.map((h) => ({ v: h.ing_cor, w: h.w }));
  const [p10, p25, p50, p75, p90, p95, p99] = quantiles(items, [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]);
  const limits = quantiles(items, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
  const out = {
    year, households: nat.households, sample: nat.sample, persons: nat.persons, size: nat.size,
    mean: nat.mean, receive: nat.receive, own: nat.own,
    median: round(p50, 1), percentiles: { p10: round(p10), p25: round(p25), p50: round(p50), p75: round(p75), p90: round(p90), p95: round(p95), p99: round(p99) }, decileLimits: limits.map((v) => round(v)),
    gini: round(giniOfMeans(deciles.map((d) => d.mean.ing_cor)), 3), giniNoTransfers: round(giniOfMeans(sinMeans.map((s, i) => s / sinW[i])), 3),
    deciles: deciles.map((d) => ({ households: d.households, persons: d.persons, size: d.size, mean: d.mean, receive: d.receive, own: d.own })),
  };
  // top 5% and top 1% of households by current income: their share of all current income
  const tot = all.sums.ing_cor; let s5 = 0, s1 = 0;
  for (const h of hh) { if (h.ing_cor >= p95) s5 += h.ing_cor * h.w; if (h.ing_cor >= p99) s1 += h.ing_cor * h.w; }
  out.topShare = { top5: round(s5 / tot * 100, 1), top1: round(s1 / tot * 100, 1) };
  // per person: households ranked by income per member, people as weights (how the population, not households, is distributed)
  const pc = hh.filter((h) => h.tot_integ > 0).map((h) => ({ v: h.ing_cor / h.tot_integ, w: h.w * h.tot_integ }));
  out.perCapita = { mean: round(all.sums.ing_cor / all.persons, 1), median: round(quantiles(pc, [0.5])[0], 1) };

  if (detail === 'lite') return out;

  const group = (keyOf, keys) => { const A = {}; for (const h of hh) { const k = keyOf(h); if (k == null) continue; (A[k] || (A[k] = makeAcc())); add(A[k], h, h.w); } const o = {}; for (const k of keys || Object.keys(A).sort()) if (A[k]) o[k] = finish(A[k]); return o; };
  const medianOf = (sel) => { const it = hh.filter(sel).map((h) => ({ v: h.ing_cor, w: h.w })); return it.length ? round(quantiles(it, [0.5])[0]) : null; };
  // states
  const st = group((h) => h.state);
  if (!full) {   // an earlier edition: what the comparisons over time need
    out.states = Object.keys(st).sort().map((code) => { const s = st[code]; return { code, households: s.households, sample: s.sample, persons: s.persons, mean: { ing_cor: s.mean.ing_cor, gasto_mon: s.mean.gasto_mon, ingtrab: s.mean.ingtrab, transfer: s.mean.transfer, remesas: s.mean.remesas, bene_gob: s.mean.bene_gob }, receive: { remesas: s.receive.remesas, bene_gob: s.receive.bene_gob, pago_tarje: s.receive.pago_tarje }, median: medianOf((h) => h.state === code) }; });
    return out;
  }
  out.states = Object.keys(st).sort().map((code) => {
    const s = st[code], inS = hh.filter((h) => h.state === code);
    const pS = assignDeciles(inS, 'ing_cor'), m = new Array(10).fill(0), wv = new Array(10).fill(0);
    inS.forEach((h, i) => { for (const [d, w] of pS[i]) { m[d] += h.ing_cor * w; wv[d] += w; } });
    const renters = inS.filter((h) => h.alquiler > 0 && h.ing_cor > 0), rw = renters.reduce((a, h) => a + h.w, 0);
    const b30 = renters.filter((h) => h.alquiler / h.ing_cor >= 0.3).reduce((a, h) => a + h.w, 0);
    return { code, households: s.households, sample: s.sample, persons: s.persons, size: s.size, mean: s.mean, receive: s.receive, own: s.own, median: medianOf((h) => h.state === code),
      perCapita: round(s.mean.ing_cor * s.households / s.persons, 1), gini: round(giniOfMeans(m.map((x, i) => x / wv[i])), 3),
      rentBurden30: rw ? round(b30 / rw * 100, 1) : null, renterSample: renters.length };
  });
  // groups of households
  const ageKey = (h) => { const g = AGE_GROUPS.find((x) => h.age >= x[1] && h.age <= x[2]); return g ? g[0] : null; };
  const eduKey = (h) => { const g = EDU_GROUPS.find((x) => x[1].includes(h.edu)); return g ? g[0] : null; };
  const withMedian = (g, sel) => { for (const k of Object.keys(g)) g[k].median = medianOf((h) => sel(h) === k); return g; };
  out.byAge = withMedian(group(ageKey, AGE_GROUPS.map((x) => x[0])), ageKey);
  out.bySex = withMedian(group((h) => (h.sex === '1' ? 'men' : h.sex === '2' ? 'women' : null), ['men', 'women']), (h) => (h.sex === '1' ? 'men' : h.sex === '2' ? 'women' : null));
  out.byEdu = withMedian(group(eduKey, EDU_GROUPS.map((x) => x[0])), eduKey);
  out.byLocality = withMedian(group((h) => LOCALITY[h.loc] || null, ['big', 'mid', 'small', 'rural']), (h) => LOCALITY[h.loc] || null);
  out.byClass = group((h) => HH_CLASS[h.cls] || null, ['alone', 'nuclear', 'extended', 'composite', 'coresident']);
  out.urban = group((h) => (h.loc === '4' ? 'rural' : 'urban'), ['urban', 'rural']);
  out.byTenure = files.viviendas ? withMedian(group((h) => (h.tenure === '4' ? 'owner' : h.tenure === '3' ? 'paying' : h.tenure === '1' ? 'renter' : h.tenure === '2' ? 'lent' : h.tenure ? 'other' : null), ['owner', 'paying', 'renter', 'lent', 'other']), (h) => (h.tenure === '4' ? 'owner' : h.tenure === '3' ? 'paying' : h.tenure === '1' ? 'renter' : h.tenure === '2' ? 'lent' : h.tenure ? 'other' : null)) : null;
  // households by monthly income bracket
  out.brackets = BRACKETS.map(([lo, hi]) => ({ lo, hi, n: round(hh.filter((h) => h.ing_cor / 3 >= lo && (hi == null || h.ing_cor / 3 < hi)).reduce((a, h) => a + h.w, 0)) }));
  // renters: what the rent takes
  const renters = hh.filter((h) => h.alquiler > 0 && h.ing_cor > 0), rw = renters.reduce((a, h) => a + h.w, 0);
  const share = (t) => round(renters.filter((h) => h.alquiler / h.ing_cor >= t).reduce((a, h) => a + h.w, 0) / rw * 100, 1);
  out.rent = { households: round(rw), share: round(rw / nat.households * 100, 1), median: round(quantiles(renters.map((h) => ({ v: h.alquiler / 3, w: h.w })), [0.5])[0]), burden30: share(0.3), burden50: share(0.5),
    medianShare: round(quantiles(renters.map((h) => ({ v: h.alquiler / h.ing_cor * 100, w: h.w })), [0.5])[0], 1),
    byDecile: dAcc.map((_, d) => { let a = 0, b = 0; hh.forEach((h, i) => { if (!(h.alquiler > 0 && h.ing_cor > 0)) return; for (const [dd, w] of parts[i]) if (dd === d) { b += w; if (h.alquiler / h.ing_cor >= 0.3) a += w; } }); return b ? round(a / b * 100, 1) : null; }) };
  // households whose monetary spending exceeds their monetary current income (current income less the imputed rent and transfers in kind)
  const mon = (h) => h.ing_cor - h.estim_alqu - h.transf_hog - h.trans_inst;
  out.overspend = { all: round(hh.filter((h) => h.gasto_mon > mon(h)).reduce((a, h) => a + h.w, 0) / nat.households * 100, 1),
    byDecile: dAcc.map((acc, d) => { let a = 0; hh.forEach((h, i) => { if (h.gasto_mon > mon(h)) for (const [dd, w] of parts[i]) if (dd === d) a += w; }); return round(a / acc.w * 100, 1); }) };
  // debt payments (cards and other debts) against monetary current income, households that make them
  const debtors = hh.filter((h) => h.pago_tarje + h.deudas > 0 && mon(h) > 0), dw = debtors.reduce((a, h) => a + h.w, 0);
  out.debtService = { households: round(dw), share: round(dw / nat.households * 100, 1), medianShare: round(quantiles(debtors.map((h) => ({ v: (h.pago_tarje + h.deudas) / mon(h) * 100, w: h.w })), [0.5])[0], 1),
    over30: round(debtors.filter((h) => (h.pago_tarje + h.deudas) / mon(h) >= 0.3).reduce((a, h) => a + h.w, 0) / dw * 100, 1) };

  // people: age structure and schooling of those 25 and over (person file)
  if (files.poblacion) {
    const P = readTable(files.poblacion), px = Object.fromEntries(P.head.map((h, i) => [h, i]));
    for (const need of ['folioviv', 'foliohog', 'edad', 'sexo', 'parentesco']) if (!(need in px)) throw new Error(`ENIGH ${year}: column ${need} missing from poblacion`);
    const bands = [['0-14', 0, 14], ['15-24', 15, 24], ['25-34', 25, 34], ['35-44', 35, 44], ['45-54', 45, 54], ['55-64', 55, 64], ['65-74', 65, 74], ['75+', 75, 200]];
    const age = Object.fromEntries(bands.map((b) => [b[0], 0])), sex = { men: 0, women: 0 }, edu = { none: 0, primary: 0, secondary: 0, highSchool: 0, college: 0 }, ages = [];
    let pop = 0, p25 = 0;
    for (const r of P.rows) {
      const h = byId.get(r[px.folioviv].trim() + '|' + r[px.foliohog].trim()); if (!h) continue;
      // members of the household only: domestic workers, their relatives (parentesco 4xx) and lodgers (7xx) are outside INEGI's count
      const par = r[px.parentesco].trim(); if (/^[47]/.test(par)) continue;
      const a = numOf(r[px.edad]), w = h.w; pop += w; ages.push({ v: a, w });
      const b = bands.find((x) => a >= x[1] && a <= x[2]); if (b) age[b[0]] += w;
      if (r[px.sexo].trim() === '1') sex.men += w; else sex.women += w;
      if (a >= 25 && 'nivelaprob' in px) {
        // the same construction INEGI uses for the schooling of the head of household (educa_jefe), applied to every person 25 and over
        p25 += w; const n = numOf(r[px.nivelaprob]), g = 'gradoaprob' in px ? numOf(r[px.gradoaprob]) : 0, ant = 'antec_esc' in px ? numOf(r[px.antec_esc]) : 0;
        const tech = n === 5 || n === 6;
        const code = n === 0 ? '01' : n === 1 ? '02' : n === 2 ? (g < 6 ? '03' : '04') : n === 3 ? (g < 3 ? '05' : '06') : n === 4 ? (g < 3 ? '07' : '08') : n === 7 ? (g < 4 ? '09' : '10') : n >= 8 ? '11'
          : tech ? (ant === 1 ? '04' : ant === 2 ? '06' : ant === 3 ? '08' : ant === 4 ? '10' : ant === 5 ? '11' : '04') : '01';
        const grp = EDU_GROUPS.find((x) => x[1].includes(code)); edu[grp ? grp[0] : 'none'] += w;
      }
    }
    out.people = { pop: round(pop), medianAge: round(quantiles(ages, [0.5])[0]), age: Object.keys(age).map((k) => ({ k, n: round(age[k]) })), sex: { men: round(sex.men), women: round(sex.women) }, pop25: round(p25), edu: Object.keys(edu).map((k) => ({ k, n: round(edu[k]) })) };
  }
  return out;
}
