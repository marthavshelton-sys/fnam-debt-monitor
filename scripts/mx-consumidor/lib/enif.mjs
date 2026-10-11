// INEGI and CNBV · Encuesta Nacional de Inclusión Financiera (ENIF): the survey's public microdata turned into the
// tables the Mexican Consumer page draws (who has credit and of what kind, who pays late, who was turned down, who saves
// and how, how long savings would last, what people do when the money does not reach). One adult per household answers
// the module (TMODULO), weighted with the person factor FAC_PER. INEGI's main results cover people aged 18 to 70, so the
// same universe is used here: the headline shares reproduce the published ones (the builder checks them against
// tools/mx-consumidor/data/enif-published.json).
import { readFileSync } from 'node:fs';

// a comma-separated file whose fields are quoted -> { head, rows } (cells as trimmed strings)
export function readQuoted(file) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
  return { head: split(lines[0]).map((h) => h.toUpperCase()), rows: lines.slice(1).map(split) };
}
const round = (v, d = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

export const CREDIT = { storeCard: 'P6_2_1', bankCard: 'P6_2_2', payroll: 'P6_2_3', personal: 'P6_2_4', auto: 'P6_2_5', housing: 'P6_2_6', group: 'P6_2_7', online: 'P6_2_8', other: 'P6_2_9' };
export const LATE = { storeCard: 'P6_3_1', bankCard: 'P6_3_2', payroll: 'P6_3_3', personal: 'P6_3_4', auto: 'P6_3_5', housing: 'P6_3_6', group: 'P6_3_7', online: 'P6_3_8', other: 'P6_3_9' };
export const INFORMAL_CREDIT = { savingsClub: 'P6_1_1', pawn: 'P6_1_2', friends: 'P6_1_3', family: 'P6_1_4', other: 'P6_1_5' };
export const ACCOUNTS = { payroll: 'P5_4_1', pension: 'P5_4_2', benefits: 'P5_4_3', savings: 'P5_4_4', checking: 'P5_4_5', term: 'P5_4_6', fund: 'P5_4_7', app: 'P5_4_8', other: 'P5_4_9' };
const SAVED_IN = ['P5_6_1', 'P5_6_2', 'P5_6_3', 'P5_6_4', 'P5_6_5', 'P5_6_6', 'P5_6_7', 'P5_6_8', 'P5_6_9'];
export const INFORMAL_SAVING = { lending: 'P5_1_1', goods: 'P5_1_2', savingsClub: 'P5_1_3', family: 'P5_1_4', tanda: 'P5_1_5', home: 'P5_1_6' };
export const COPING = { family: 'P4_4_1', savings: 'P4_4_2', cutSpending: 'P4_4_3', pawn: 'P4_4_4', extraWork: 'P4_4_5', credit: 'P4_4_6', latePayment: 'P4_4_7' };
export const REJECT_WHY = { bureau: 'P6_17_1', income: 'P6_17_2', documents: 'P6_17_3', noHistory: 'P6_17_4', noCollateral: 'P6_17_5', other: 'P6_17_6' };
export const CUSHION = { 1: 'lt1w', 2: 'lt1m', 3: 'lt3m', 4: 'lt6m', 5: 'gte6m' };
export const REGIONS = { 1: 'northwest', 2: 'northeast', 3: 'west', 4: 'cdmx', 5: 'center', 6: 'south' };

export function aggregateEnif(year, files) {
  const T = readQuoted(files.modulo), ix = Object.fromEntries(T.head.map((h, i) => [h, i]));
  for (const need of ['EDAD_V', 'SEXO', 'NIV', 'TLOC', 'REGION', 'FAC_PER', 'P4_3', 'P4_10', 'P6_7', 'P6_16', 'P9_1', ...Object.values(CREDIT), ...Object.values(LATE), ...Object.values(INFORMAL_CREDIT), ...Object.values(ACCOUNTS), ...SAVED_IN, ...Object.values(INFORMAL_SAVING), ...Object.values(COPING)])
    if (!(need in ix)) throw new Error(`ENIF ${year}: column ${need} missing from TMODULO`);
  const people = T.rows.map((r) => {
    const g = (c) => r[ix[c]], yes = (c) => g(c) === '1';
    const age = Number(g('EDAD_V')), niv = g('NIV');
    const credit = Object.fromEntries(Object.keys(CREDIT).map((k) => [k, yes(CREDIT[k])]));
    const late = Object.fromEntries(Object.keys(LATE).map((k) => [k, yes(LATE[k])]));
    const informal = Object.fromEntries(Object.keys(INFORMAL_CREDIT).map((k) => [k, yes(INFORMAL_CREDIT[k])]));
    const accounts = Object.fromEntries(Object.keys(ACCOUNTS).map((k) => [k, yes(ACCOUNTS[k])]));
    const p = { w: Number(g('FAC_PER')) || 0, age, sex: g('SEXO') === '1' ? 'men' : 'women', loc: g('TLOC'), region: REGIONS[g('REGION')] || null,
      edu: ['00', '01', '02', '03', '04'].includes(niv) ? 'basic' : ['05', '06', '07'].includes(niv) ? 'highSchool' : ['08', '09', '10', '11'].includes(niv) ? 'college' : null,
      credit, late, informal, accounts,
      anyCredit: Object.values(credit).some(Boolean), anyInformal: Object.values(informal).some(Boolean), anyLate: Object.keys(credit).some((k) => credit[k] && late[k]),
      anyAccount: Object.values(accounts).some(Boolean), savedFormal: SAVED_IN.some(yes), savedInformal: Object.values(INFORMAL_SAVING).some(yes),
      informalSaving: Object.fromEntries(Object.keys(INFORMAL_SAVING).map((k) => [k, yes(INFORMAL_SAVING[k])])),
      afore: yes('P9_1'), insurance: 'P8_1' in ix ? yes('P8_1') : null,
      enough: g('P4_3'), coping: Object.fromEntries(Object.keys(COPING).map((k) => [k, yes(COPING[k])])), cushion: CUSHION[g('P4_10')] || null,
      debtView: g('P6_7'), applied: g('P6_16'), rejectWhy: Object.fromEntries(Object.keys(REJECT_WHY).map((k) => [k, REJECT_WHY[k] in ix ? yes(REJECT_WHY[k]) : false])),
      leftover: 'P4_6_6' in ix ? g('P4_6_6') : null, ownsHome: 'P13_2_1' in ix ? yes('P13_2_1') : null, ownsVehicle: 'P13_2_2' in ix ? yes('P13_2_2') : null, benefits: 'P3_4' in ix ? yes('P3_4') : null };
    return p;
  }).filter((p) => p.w > 0 && p.age >= 18 && p.age <= 70);
  if (people.length < 8000) throw new Error(`ENIF ${year}: only ${people.length} people aged 18 to 70 read`);

  const sumW = (a) => a.reduce((s, p) => s + p.w, 0);
  const pct = (a, test) => { const t = sumW(a); return t ? round(sumW(a.filter(test)) / t * 100) : null; };
  function table(a) {
    const n = sumW(a);
    const borrowers = a.filter((p) => p.anyCredit), short = a.filter((p) => p.enough === '2'), applied = a.filter((p) => p.applied === '1' || p.applied === '2'), rejected = a.filter((p) => p.applied === '1');
    const withDebtView = a.filter((p) => ['1', '2', '3'].includes(p.debtView)), withCushion = a.filter((p) => p.cushion);
    const product = (p) => p.anyAccount || p.anyCredit || p.afore || p.insurance === true;
    return {
      people: Math.round(n), sample: a.length,
      anyProduct: pct(a, product), insurance: pct(a.filter((p) => p.insurance != null), (p) => p.insurance), anyAccount: pct(a, (p) => p.anyAccount), anyCredit: pct(a, (p) => p.anyCredit), anyInformalCredit: pct(a, (p) => p.anyInformal), afore: pct(a, (p) => p.afore),
      noCredit: pct(a, (p) => !p.anyCredit && !p.anyInformal), onlyInformalCredit: pct(a, (p) => !p.anyCredit && p.anyInformal),
      credit: Object.fromEntries(Object.keys(CREDIT).map((k) => [k, pct(a, (p) => p.credit[k])])),
      informalCredit: Object.fromEntries(Object.keys(INFORMAL_CREDIT).map((k) => [k, pct(a, (p) => p.informal[k])])),
      accounts: Object.fromEntries(Object.keys(ACCOUNTS).map((k) => [k, pct(a, (p) => p.accounts[k])])),
      // of those who have each kind of credit, the share that fell behind on it in the past year
      late: Object.fromEntries(Object.keys(CREDIT).map((k) => { const h = a.filter((p) => p.credit[k]); return [k, h.length >= 30 ? pct(h, (p) => p.late[k]) : null]; })),
      lateAny: borrowers.length >= 30 ? pct(borrowers, (p) => p.anyLate) : null,
      saving: { onlyInformal: pct(a, (p) => p.savedInformal && !p.savedFormal), none: pct(a, (p) => !p.savedInformal && !p.savedFormal), both: pct(a, (p) => p.savedInformal && p.savedFormal), onlyFormal: pct(a, (p) => !p.savedInformal && p.savedFormal) },
      informalSaving: Object.fromEntries(Object.keys(INFORMAL_SAVING).map((k) => [k, pct(a, (p) => p.informalSaving[k])])),
      notEnough: pct(a.filter((p) => p.enough === '1' || p.enough === '2'), (p) => p.enough === '2'),
      coping: short.length >= 30 ? Object.fromEntries(Object.keys(COPING).map((k) => [k, pct(short, (p) => p.coping[k])])) : null,
      cushion: withCushion.length >= 30 ? Object.fromEntries(Object.values(CUSHION).map((k) => [k, pct(withCushion, (p) => p.cushion === k)])) : null,
      // of those with debts: can pay them all on time, only some, or none
      debtView: withDebtView.length >= 30 ? { canPay: pct(withDebtView, (p) => p.debtView === '1'), some: pct(withDebtView, (p) => p.debtView === '3'), cannot: pct(withDebtView, (p) => p.debtView === '2'), withDebts: round(sumW(withDebtView) / n * 100) } : null,
      everApplied: pct(a.filter((p) => ['1', '2', '3'].includes(p.applied)), (p) => p.applied !== '3'), rejected: applied.length >= 30 ? pct(applied, (p) => p.applied === '1') : null,
      rejectWhy: rejected.length >= 30 ? Object.fromEntries(Object.keys(REJECT_WHY).map((k) => [k, pct(rejected, (p) => p.rejectWhy[k])])) : null,
      leftover: a.some((p) => p.leftover) ? { always: pct(a.filter((p) => ['1', '2', '3'].includes(p.leftover)), (p) => p.leftover === '1'), sometimes: pct(a.filter((p) => ['1', '2', '3'].includes(p.leftover)), (p) => p.leftover === '2'), never: pct(a.filter((p) => ['1', '2', '3'].includes(p.leftover)), (p) => p.leftover === '3') } : null,
      ownsHome: pct(a.filter((p) => p.ownsHome != null), (p) => p.ownsHome), ownsVehicle: pct(a.filter((p) => p.ownsVehicle != null), (p) => p.ownsVehicle), benefits: pct(a.filter((p) => p.benefits != null), (p) => p.benefits),
    };
  }
  const by = (keyOf, keys) => Object.fromEntries(keys.map((k) => [k, table(people.filter((p) => keyOf(p) === k))]));
  const ageKey = (p) => (p.age < 30 ? '18-29' : p.age < 45 ? '30-44' : p.age < 60 ? '45-59' : '60-70');
  return {
    universe: '18-70', all: table(people),
    bySex: by((p) => p.sex, ['men', 'women']), byAge: by(ageKey, ['18-29', '30-44', '45-59', '60-70']), byEdu: by((p) => p.edu, ['basic', 'highSchool', 'college']),
    byLocality: by((p) => (p.loc === '1' || p.loc === '2' ? 'urban' : 'small'), ['urban', 'small']), byRegion: by((p) => p.region, Object.values(REGIONS)),
  };
}
