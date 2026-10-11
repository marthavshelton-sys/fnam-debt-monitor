#!/usr/bin/env node
// Builds site/consumidor/data/data.js (window.CONS_DATA) for the American Consumer page from the stored sources in
// tools/consumidor/raw/ (written by fetch.mjs). Nothing is fetched here, so a session can rebuild the page's data offline.
//
//   node scripts/consumidor/build.mjs [--check]      (--check: run the tie-outs, write nothing)
//
// Every block carries the period its data stands for (`asOf`) and its source. Figures the publisher prints are passed
// through; anything computed here (shares, per-household averages, ratios, residual lines) is listed under `calc` in the
// block's notes so the page can badge it as an FNAM calculation. The tie-outs (accounting identities of each source) are
// written to tools/consumidor/raw/build-log.json; a failed hard identity stops the build and the page keeps its last data.
// `generatedAt` changes only when the data did, so a quiet run commits nothing.
import { RAW, SITE, TOOLS, readJson, readText, writeText, writeJson, nowIso } from './lib/common.mjs';
import { STATES } from './lib/states.mjs';

const CHECK = process.argv.includes('--check');
const raw = {}; const meta = {};
for (const id of ['census', 'cex', 'cexHist', 'beaDist', 'umich', 'nes', 'pceDist', 'jointDist', 'sce', 'shed', 'cfpbBnpl', 'fsa', 'courts', 'dfa', 'scf', 'nyfed', 'nyfedStates', 'fred']) { const j = readJson(`${RAW}${id}.json`); raw[id] = j ? j.data : null; meta[id] = j ? { fetchedAt: j.fetchedAt } : null; }
const status = readJson(RAW + 'status.json', { sources: {} });

const checks = [];   // { tag, check, status: ok | warn | fail, diff, tol }
function tie(tag, check, a, b, tol, soft = false) {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) { checks.push({ tag, check, status: 'warn', note: 'missing value' }); return false; }
  const d = Math.abs(a - b);
  checks.push({ tag, check, status: d <= tol ? 'ok' : soft ? 'warn' : 'fail', diff: Math.round(d * 1000) / 1000, tol });
  return d <= tol;
}
const must = (tag, check, cond, soft = false) => { checks.push({ tag, check, status: cond ? 'ok' : soft ? 'warn' : 'fail' }); return cond; };
const r0 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v));
const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const r3 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000);
const pct = (a, b) => (a == null || !b ? null : r1((a / b) * 100));
const sum = (arr) => arr.reduce((a, v) => a + (v || 0), 0);
const last = (a) => (a && a.length ? a[a.length - 1] : null);
const lastOf = (obs) => (obs && obs.length ? obs[obs.length - 1] : null);
const monthKey = (d) => String(d).slice(0, 7);
const quarterOf = (d) => `${String(d).slice(0, 4)}-Q${Math.floor((Number(String(d).slice(5, 7)) - 1) / 3) + 1}`;
const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const fredMonth = (s) => { const m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(String(s || '')); return m ? `${m[2]}-${MONTHS[m[1]]}` : null; };

const D = { generatedAt: null, sources: {} };
const src = (id, extra) => { const st = (status.sources || {})[id] || {}; D.sources[id] = { ...extra, fetchedAt: meta[id] ? meta[id].fetchedAt : null, ...(st.error ? { stored: true, since: st.since || null } : {}) }; };

// ------------------------------------------------------------------------------------------------------------------
// Census ACS: who they are, what they earn, by state
// ------------------------------------------------------------------------------------------------------------------
const C = raw.census;
if (C) {
  const A = C.us; const v = (id) => A[id]; const S = (g, list) => sum(list.map((n) => A[`${g}_${String(n).padStart(3, '0')}E`]));
  const both = (list) => S('B01001', list) + S('B01001', list.map((n) => n + 24));
  const pop = v('B01003_001E');
  const age = [['0-17', [3, 4, 5, 6]], ['18-24', [7, 8, 9, 10]], ['25-34', [11, 12]], ['35-44', [13, 14]], ['45-54', [15, 16]], ['55-64', [17, 18, 19]], ['65-74', [20, 21, 22]], ['75+', [23, 24, 25]]].map(([k, l]) => ({ k, n: both(l) }));
  tie('ACS', 'age bands add up to the population', sum(age.map((a) => a.n)), pop, 5);
  const race = [['whiteNH', v('B03002_003E')], ['hispanic', v('B03002_012E')], ['blackNH', v('B03002_004E')], ['asianNH', v('B03002_006E')], ['multiNH', v('B03002_009E')], ['otherNH', v('B03002_005E') + v('B03002_007E') + v('B03002_008E')]].map(([k, n]) => ({ k, n }));
  tie('ACS', 'race and Hispanic-origin groups add up to the population', sum(race.map((x) => x.n)), v('B03002_001E'), 5);
  const hh = v('B11001_001E');
  const hhTypes = [['married', v('B11001_003E')], ['otherFamily', v('B11001_002E') - v('B11001_003E')], ['alone', v('B11001_008E')], ['otherNonfamily', v('B11001_007E') - v('B11001_008E')]].map(([k, n]) => ({ k, n }));
  tie('ACS', 'household types add up to households', sum(hhTypes.map((x) => x.n)), hh, 5);
  const ownAge = [['15-24', [3], [13]], ['25-34', [4], [14]], ['35-44', [5], [15]], ['45-54', [6], [16]], ['55-64', [7, 8], [17, 18]], ['65-74', [9], [19]], ['75+', [10, 11], [20, 21]]]
    .map(([k, o, r]) => { const own = S('B25007', o), rent = S('B25007', r); return { k, owner: pct(own, own + rent), hh: own + rent }; });
  const e25 = v('B15003_001E');
  const edu = [['lessHS', e25 - S('B15003', [17, 18, 19, 20, 21, 22, 23, 24, 25])], ['hs', S('B15003', [17, 18])], ['someCollege', S('B15003', [19, 20, 21])], ['ba', v('B15003_022E')], ['grad', S('B15003', [23, 24, 25])]].map(([k, n]) => ({ k, n }));
  const rentBase = v('B25070_001E') - v('B25070_011E');
  D.demo = {
    asOf: String(C.year), pop, households: hh, hhSize: v('B25010_001E'), medianAge: v('B01002_001E'), age, race, hhTypes,
    owner: pct(v('B25003_002E'), v('B25003_001E')), ownerByAge: ownAge, edu, pop25: e25,
    poverty: pct(v('B17001_002E'), v('B17001_001E')), foreignBorn: pct(v('B05002_013E'), v('B05002_001E')),
    rent: { median: v('B25064_001E'), shareOfIncome: v('B25071_001E'), burden30: pct(S('B25070', [7, 8, 9, 10]), rentBase), burden50: pct(v('B25070_010E'), rentBase) }, homeValue: v('B25077_001E'),
  };
  // income
  const mean = C.subject && C.subject.US ? C.subject.US.S1901_C01_013E : null;
  const meanCalc = v('B19025_001E') / hh;
  if (mean != null) tie('ACS', 'published mean household income = aggregate income ÷ households', mean, meanCalc, 60, true);
  if (C.subject && C.subject.US) tie('ACS', 'median household income: subject table = detailed table', C.subject.US.S1901_C01_012E, v('B19013_001E'), 0.5);
  const b = (n) => A[`B19001_${String(n).padStart(3, '0')}E`];
  const brackets = [[0, 15, b(2) + b(3)], [15, 25, b(4) + b(5)], [25, 35, b(6) + b(7)], [35, 50, b(8) + b(9) + b(10)], [50, 75, b(11) + b(12)], [75, 100, b(13)], [100, 125, b(14)], [125, 150, b(15)], [150, 200, b(16)], [200, null, b(17)]].map(([lo, hi, n]) => ({ lo, hi, n }));
  tie('ACS', 'income brackets add up to households', sum(brackets.map((x) => x.n)), b(1), 5);
  const shares = [1, 2, 3, 4, 5].map((n) => v(`B19082_00${n}E`));
  tie('ACS', 'quintile shares of aggregate income add up to 100', sum(shares), 100, 0.15);
  const hhN = (g) => A[`${g}_001E`];
  const receive = [['earnings', 'B19051'], ['wages', 'B19052'], ['selfEmp', 'B19053'], ['assets', 'B19054'], ['socSec', 'B19055'], ['ssi', 'B19056'], ['cashPA', 'B19057'], ['paSnap', 'B19058'], ['retirement', 'B19059'], ['other', 'B19060']].map(([k, g]) => ({ k, pct: pct(A[`${g}_002E`], hhN(g)) }));
  const agg = v('B19025_001E');
  const aggParts = [['wages', 'B19062'], ['selfEmp', 'B19063'], ['assets', 'B19064'], ['socSec', 'B19065'], ['ssi', 'B19066'], ['cashPA', 'B19067'], ['retirement', 'B19069'], ['other', 'B19070']].map(([k, g]) => ({ k, v: A[`${g}_001E`] }));
  tie('ACS', 'aggregate income by type adds up to aggregate household income (within 0.5%)', sum(aggParts.map((x) => x.v)) / agg * 100, 100, 0.5, true);
  D.income = {
    asOf: String(C.year), median: v('B19013_001E'), mean: mean != null ? mean : r0(meanCalc), meanCalc: mean == null, perCapita: v('B19301_001E'), gini: v('B19083_001E'),
    quintiles: { limits: [1, 2, 3, 4].map((n) => v(`B19080_00${n}E`)), top5Limit: v('B19080_005E'), means: [1, 2, 3, 4, 5].map((n) => v(`B19081_00${n}E`)), top5Mean: v('B19081_006E'), shares, top5Share: v('B19082_006E') },
    brackets, households: b(1),
    byAge: [['<25', 2], ['25-44', 3], ['45-64', 4], ['65+', 5]].map(([k, n]) => ({ k, v: v(`B19049_00${n}E`) })),
    byRace: [['asian', 'D'], ['whiteNH', 'H'], ['hispanic', 'I'], ['multi', 'G'], ['aian', 'C'], ['black', 'B']].map(([k, t]) => ({ k, v: v(`B19013${t}_001E`) })),
    byTenure: { owner: v('B25119_002E'), renter: v('B25119_003E') },
    earningsByEdu: [['lessHS', 2], ['hs', 3], ['someCollege', 4], ['ba', 5], ['grad', 6]].map(([k, n]) => ({ k, v: v(`B20004_00${n}E`) })),
    receive, aggregate: aggParts.map((x) => ({ k: x.k, share: pct(x.v, agg) })),
  };
  src('census', { name: C.source.name, url: C.source.url, asOf: String(C.year) });
}

// ------------------------------------------------------------------------------------------------------------------
// FRED: BEA's personal income and its disposition (sources and uses of funds), CPS income history, credit terms
// ------------------------------------------------------------------------------------------------------------------
const F = raw.fred;
const fs = (id) => (F && F.series[id] ? F.series[id].obs : null);
const lastV = (id) => { const o = lastOf(fs(id)); return o ? o[1] : null; };
if (F && F.tables && F.tables.t26) {
  const T = F.tables.t26.lines; const L = (id) => { const l = T.find((x) => x.id === id); return l ? l.value : null; };
  const nameOk = (id, re) => { const l = T.find((x) => x.id === id); return must('BEA', `table 2.6 line ${id} is "${l ? l.name : 'missing'}"`, !!l && re.test(l.name)); };
  const names = { PI: /^Personal income$/i, W209RC1: /^Compensation of employees/i, A576RC1: /^Wages and salaries$/i, A038RC1: /^Supplements to wages and salaries$/i, A041RC1: /^Proprietors' income/i, A048RC1: /^Rental income of persons/i,
    PII: /^Personal interest income$/i, PDI: /^Personal dividend income$/i, PCTR: /^Personal current transfer receipts$/i, A063RC1: /^Government social benefits to persons$/i, W823RC1: /^Social security$/i, W824RC1: /^Medicare$/i, W729RC1: /^Medicaid$/i,
    B931RC1: /^Other current transfer receipts, from business/i, A061RC1: /Contributions for government social insurance/i, W055RC1: /Personal current taxes$/i, DSPI: /Disposable personal income$/i, A068RC1: /Personal outlays$/i,
    PCE: /^Personal consumption expenditures$/i, B069RC1: /^Personal interest payments$/i, W211RC1: /^Personal current transfer payments$/i, PMSAVE: /Personal saving$/i, PSAVERT: /^Personal saving as a percentage of disposable personal income$/i, POPTHM: /^Population/i };
  const allNamed = Object.entries(names).map(([id, re]) => nameOk(id, re)).every(Boolean);
  if (allNamed) {
    const PI = L('PI');
    const otherGov = L('A063RC1') - L('W823RC1') - L('W824RC1') - L('W729RC1');
    const sources = [['wages', L('A576RC1')], ['supplements', L('A038RC1')], ['proprietors', L('A041RC1')], ['rental', L('A048RC1')], ['interest', L('PII')], ['dividends', L('PDI')],
      ['socSec', L('W823RC1')], ['medicare', L('W824RC1')], ['medicaid', L('W729RC1')], ['otherGov', r1(otherGov)], ['otherTransfers', L('B931RC1')], ['contributions', -L('A061RC1')]].map(([k, val]) => ({ k, v: val }));
    tie('BEA', 'income components − contributions for social insurance = personal income', sum(sources.map((x) => x.v)), PI, 1.5);
    tie('BEA', 'personal income − personal current taxes = disposable personal income', PI - L('W055RC1'), L('DSPI'), 0.6);
    tie('BEA', 'disposable income − outlays = personal saving', L('DSPI') - L('A068RC1'), L('PMSAVE'), 0.6);
    tie('BEA', 'consumption + interest payments + transfer payments = personal outlays', L('PCE') + L('B069RC1') + L('W211RC1'), L('A068RC1'), 0.6);
    tie('BEA', 'saving rate = saving ÷ disposable income', L('PMSAVE') / L('DSPI') * 100, L('PSAVERT'), 0.06);
    const T2 = F.tables.t285 ? F.tables.t285.lines : []; const L2 = (id) => { const l = T2.find((x) => x.id === id); return l ? l.value : null; };
    const pceTypes = T2.length ? { durables: L2('PCEDG'), nondurables: L2('PCEND'), services: L2('PCES') } : null;
    if (pceTypes) tie('BEA', 'durable + nondurable goods + services = consumption (table 2.8.5 vs 2.6)', pceTypes.durables + pceTypes.nondurables + pceTypes.services, L('PCE'), 0.6);
    const uses = [['taxes', L('W055RC1')], ...(pceTypes ? [['pceServices', pceTypes.services], ['pceNondurables', pceTypes.nondurables], ['pceDurables', pceTypes.durables]] : [['pce', L('PCE')]]),
      ['interestPaid', L('B069RC1')], ['transfersPaid', L('W211RC1')], ['saving', L('PMSAVE')]].map(([k, val]) => ({ k, v: val }));
    tie('BEA', 'uses of personal income add up to personal income', sum(uses.map((x) => x.v)), PI, 1.5);
    const month = fredMonth(T.find((x) => x.id === 'PI').date);
    // quarterly detail of consumption by product (table 2.3.5), when every line passed its title check
    const PCE_Q = [['vehicles', 'DMOTRC1Q027SBEA'], ['furnishings', 'DFDHRC1Q027SBEA'], ['recGoods', 'DREQRC1Q027SBEA'], ['otherDurables', 'DODGRC1Q027SBEA'], ['foodHome', 'DFXARC1Q027SBEA'], ['clothing', 'DCLORC1Q027SBEA'],
      ['gasoline', 'DGOERC1Q027SBEA'], ['otherNondurables', 'DONGRC1Q027SBEA'], ['housing', 'DHUTRC1Q027SBEA'], ['health', 'DHLCRC1Q027SBEA'], ['transport', 'DTRSRC1Q027SBEA'], ['recreation', 'DRCARC1Q027SBEA'],
      ['foodServices', 'DFSARC1Q027SBEA'], ['financial', 'DIFSRC1Q027SBEA'], ['otherServices', 'DOTSRC1Q027SBEA'], ['npish', 'DNPIRC1Q027SBEA']];
    let pce = null;
    if (PCE_Q.every(([, id]) => fs(id)) && fs('PCEC')) {
      const q = lastOf(fs('PCEC'))[0];
      const at = (id) => { const o = fs(id).find((x) => x[0] === q); return o ? o[1] : null; };
      const cats = PCE_Q.map(([k, id]) => ({ k, v: at(id) }));
      if (cats.every((c) => c.v != null) && tie('BEA', 'consumption by product (table 2.3.5) adds up to total consumption', sum(cats.map((c) => c.v)), at('PCEC'), 1.5, true)) pce = { asOf: quarterOf(q), total: at('PCEC'), cats };
    }
    // long-run composition (annual averages of the monthly annual rates)
    const H = ['PI', 'W209RC1', 'A041RC1', 'A048RC1', 'PIROA', 'PCTR', 'A061RC1', 'W055RC1', 'DSPI', 'PCE', 'B069RC1', 'W211RC1', 'PMSAVE'];
    let history = null;
    if (H.every((id) => fs(id))) {
      const years = fs('PI').map((o) => Number(o[0].slice(0, 4)));
      const col = (id) => { const m = new Map(fs(id).map((o) => [Number(o[0].slice(0, 4)), o[1]])); return years.map((y) => (m.has(y) ? m.get(y) : null)); };
      history = { years, pi: col('PI'), compensation: col('W209RC1'), proprietors: col('A041RC1'), rental: col('A048RC1'), assets: col('PIROA'), transfers: col('PCTR'), contributions: col('A061RC1'),
        taxes: col('W055RC1'), dpi: col('DSPI'), pce: col('PCE'), interestPaid: col('B069RC1'), transfersPaid: col('W211RC1'), saving: col('PMSAVE') };
      const i = years.length - 1;
      tie('BEA', `annual averages ${years[i]}: components = personal income`, history.compensation[i] + history.proprietors[i] + history.rental[i] + history.assets[i] + history.transfers[i] - history.contributions[i], history.pi[i], 2, true);
    }
    D.funds = { asOf: month, unit: 'billions of dollars, seasonally adjusted annual rate', pi: PI, dpi: L('DSPI'), pceTotal: L('PCE'), outlays: L('A068RC1'), saving: L('PMSAVE'), savingRate: L('PSAVERT'), population: L('POPTHM') ? L('POPTHM') * 1000 : null,
      compensation: L('W209RC1'), transfers: L('PCTR'), assets: r1(L('PII') + L('PDI')), sources, uses, pce, history,
      savingRateSeries: fs('PSAVERT') ? fs('PSAVERT').filter((o) => o[0] >= '2000-01-01').map((o) => [monthKey(o[0]), o[1]]) : null,
      pceShareGdp: fs('DPCERE1Q156NBEA') ? { v: lastV('DPCERE1Q156NBEA'), asOf: quarterOf(lastOf(fs('DPCERE1Q156NBEA'))[0]) } : null,
    };
    src('bea', { name: 'U.S. Bureau of Economic Analysis, Personal Income and Outlays (NIPA tables 2.6 and 2.8.5; table 2.3.5 for consumption by product), series read through FRED', url: 'https://www.bea.gov/data/income-saving/personal-income', asOf: month, via: 'FRED' });
    D.sources.bea.fetchedAt = meta.fred.fetchedAt;
  }
}
if (F) {
  const ser = (id, from) => (fs(id) ? fs(id).filter((o) => !from || o[0] >= from).map((o) => [o[0].slice(0, 7), o[1]]) : null);
  if (D.income && fs('MEHOINUSA646N')) {
    const nom = fs('MEHOINUSA646N'), real = fs('MEHOINUSA672N');
    D.income.cps = { asOf: lastOf(nom)[0].slice(0, 4), median: lastOf(nom)[1], nominal: nom.map((o) => [Number(o[0].slice(0, 4)), o[1]]), real: real ? real.map((o) => [Number(o[0].slice(0, 4)), o[1]]) : null, realUnits: F.series.MEHOINUSA672N ? F.series.MEHOINUSA672N.units : null,
      households: fs('TTLHH') ? { v: lastV('TTLHH') * 1000, asOf: lastOf(fs('TTLHH'))[0].slice(0, 4) } : null };
    src('cps', { name: 'U.S. Census Bureau, Current Population Survey, Annual Social and Economic Supplement (Income in the United States), series read through FRED', url: 'https://www.census.gov/topics/income-poverty/income.html', asOf: D.income.cps.asOf, via: 'FRED' });
    D.sources.cps.fetchedAt = meta.fred.fetchedAt;
  }
  D.creditTerms = {
    rates: { card: ser('TERMCBCCINTNS', '2005-01-01'), cardAll: ser('TERMCBCCALLNS', '2005-01-01'), auto60: ser('RIFLPBCIANM60NM', '2006-01-01'), personal24: ser('TERMCBPER24NS', '2005-01-01') },
    dsr: { total: ser('TDSP'), consumer: ser('CDSP'), mortgage: ser('MDSP') },
    g19: fs('TOTALSL') ? { asOf: monthKey(lastOf(fs('TOTALSL'))[0]), total: r1(lastV('TOTALSL') / 1000), revolving: r1(lastV('REVOLSL') / 1000), nonrevolving: r1(lastV('NONREVSL') / 1000),
      yoy: ['TOTALSL', 'REVOLSL', 'NONREVSL'].map((id) => { const o = fs(id); const a = o[o.length - 1], p = o[o.length - 13]; return p ? r1((a[1] / p[1] - 1) * 100) : null; }) } : null,
    bank: { cardDq: ser('DRCCLACBS', '2000-01-01'), cardCo: ser('CORCCACBS', '2000-01-01'), consumerDq: ser('DRCLACBS', '2000-01-01'), mortgageDq: ser('DRSFRMACBS', '2000-01-01') },
  };
  if (D.creditTerms.g19) tie('G.19', 'revolving + nonrevolving = total consumer credit', D.creditTerms.g19.revolving + D.creditTerms.g19.nonrevolving, D.creditTerms.g19.total, 0.3);
  src('board', { name: 'Board of Governors of the Federal Reserve System: Consumer Credit (G.19), Household Debt Service Ratios, Charge-Off and Delinquency Rates at Commercial Banks, series read through FRED', url: 'https://www.federalreserve.gov/releases/g19/current/', asOf: D.creditTerms.g19 ? D.creditTerms.g19.asOf : null, via: 'FRED' });
  D.sources.board.fetchedAt = meta.fred.fetchedAt;
  D.z1 = fs('BOGZ1FL192090005Q') ? { asOf: quarterOf(lastOf(fs('BOGZ1FL192090005Q'))[0]), netWorth: r1(lastV('BOGZ1FL192090005Q') / 1e6), netWorthToDpi: r1(lastV('HNONWPDPI')) } : null;
}

// ------------------------------------------------------------------------------------------------------------------
// States: ACS income and demographics, BEA per-capita income and prices (through FRED), New York Fed debt
// ------------------------------------------------------------------------------------------------------------------
if (C) {
  const fam = (k) => (F && F.states && F.states[k] ? F.states[k] : null);
  const at = (famData, code, year) => { if (!famData) return null; const o = (famData.values[code] || []).find((x) => x[0] === year); return o ? o[1] : null; };
  const pc = fam('pcpi'), rpp = fam('rpp'), pce = fam('pcepc');
  const NS = raw.nyfedStates; const nyYear = NS ? NS.sheets.total.years[NS.sheets.total.years.length - 1] : null;
  const ny = (sheet, code) => { if (!NS) return null; const s = NS.sheets[sheet]; const row = s.data[code]; return row ? row[s.years.indexOf(nyYear)] : null; };
  const list = STATES.map((s) => {
    const a = C.states[s.code]; const sub = C.subject && C.subject[s.code];
    const o = { code: s.code, name: s.name, pop: a.B01003_001E, medAge: a.B01002_001E, households: a.B11001_001E, medHH: a.B19013_001E,
      meanHH: sub && sub.S1901_C01_013E != null ? sub.S1901_C01_013E : r0(a.B19025_001E / a.B11001_001E), pcIncome: a.B19301_001E, gini: a.B19083_001E,
      poverty: pct(a.B17001_002E, a.B17001_001E), owner: pct(a.B25003_002E, a.B25003_001E), ba: pct(a.B15003_022E + a.B15003_023E + a.B15003_024E + a.B15003_025E, a.B15003_001E),
      rent: a.B25064_001E, homeValue: a.B25077_001E, foreignBorn: pct(a.B05002_013E, a.B05002_001E), q5q1: a.B19081_001E ? r1(a.B19081_005E / a.B19081_001E) : null, top20: a.B19082_005E };
    // renters by gross rent as a share of household income: 30% or more ("cost-burdened") and 50% or more, of the renters for whom it is computed
    if (a.B25070_001E != null && a.B25070_010E != null) { const base = a.B25070_001E - (a.B25070_011E || 0); o.rentBurden = { p30: pct(a.B25070_007E + a.B25070_008E + a.B25070_009E + a.B25070_010E, base), p50: pct(a.B25070_010E, base), median: a.B25071_001E, renters: base }; }
    if (pc) o.pcpi = at(pc, s.code, pc.year);
    if (pc && rpp) { const p = at(pc, s.code, rpp.year), x = at(rpp, s.code, rpp.year); o.rpp = x; o.pcpiAdj = p && x ? r0(p / x * 100) : null; }
    if (pce) o.pcepc = at(pce, s.code, pce.year);
    if (NS) o.debt = { total: ny('total', s.code), mortgage: ny('mortgage', s.code), auto: ny('auto', s.code), card: ny('creditcard', s.code), student: ny('studentloan', s.code),
      dqAuto: r2(ny('auto_delinq', s.code)), dqCard: r2(ny('creditcard_delinq', s.code)), dqMortgage: r2(ny('mortgage_delinq', s.code)), dqStudent: r2(ny('studentloan_delinq', s.code)) };
    return o;
  });
  must('States', '51 states with a median household income', list.filter((s) => s.medHH > 0).length === 51);
  tie('States', 'state populations add up to the national population', sum(list.map((s) => s.pop)), C.us.B01003_001E, 5);
  tie('States', 'state households add up to national households', sum(list.map((s) => s.households)), C.us.B11001_001E, 5);
  if (C.subject) for (const s of list) { const a = C.states[s.code]; if (Math.abs(s.meanHH - a.B19025_001E / a.B11001_001E) > 120) checks.push({ tag: 'States', check: `${s.code}: published mean household income vs aggregate ÷ households`, status: 'warn', diff: Math.abs(s.meanHH - a.B19025_001E / a.B11001_001E) }); }
  const us = { medHH: C.us.B19013_001E, meanHH: D.income.mean, pcIncome: C.us.B19301_001E, gini: C.us.B19083_001E, poverty: D.demo.poverty, owner: D.demo.owner, medAge: D.demo.medianAge, rent: D.demo.rent.median, homeValue: D.demo.homeValue, foreignBorn: D.demo.foreignBorn,
    ba: pct(D.demo.edu.find((e) => e.k === 'ba').n + D.demo.edu.find((e) => e.k === 'grad').n, D.demo.pop25), q5q1: r1(C.us.B19081_005E / C.us.B19081_001E), top20: C.us.B19082_005E };
  if (D.funds && D.funds.population && pc) us.pcpiNote = null;
  if (C.us.B25070_001E != null && C.us.B25070_010E != null) { const b = C.us.B25070_001E - (C.us.B25070_011E || 0); us.rentBurden = { p30: pct(C.us.B25070_007E + C.us.B25070_008E + C.us.B25070_009E + C.us.B25070_010E, b), p50: pct(C.us.B25070_010E, b), median: C.us.B25071_001E, renters: b };
    if (list.every((x) => x.rentBurden)) tie('States', 'renters with a computed rent burden add up to the national count', sum(list.map((x) => x.rentBurden.renters)), b, 5); }
  if (NS) us.debt = { total: ny('total', 'allUS'), mortgage: ny('mortgage', 'allUS'), auto: ny('auto', 'allUS'), card: ny('creditcard', 'allUS'), student: ny('studentloan', 'allUS'),
    dqAuto: r2(ny('auto_delinq', 'allUS')), dqCard: r2(ny('creditcard_delinq', 'allUS')), dqMortgage: r2(ny('mortgage_delinq', 'allUS')), dqStudent: r2(ny('studentloan_delinq', 'allUS')) };
  // personal bankruptcies by state: the courts' Table F-2 (nonbusiness cases filed in 12 months), districts added up by
  // state, per 1,000 households of the same ACS year as the rest of the map
  const CT = raw.courts;
  if (CT && CT.latest && CT.yearAgo) {
    const L = CT.latest, P = CT.yearAgo;
    for (const s of list) { const a = L.states[s.code], b = P.states[s.code]; if (a && s.households) s.bankruptcy = { cases: a.nb, per1000: r2(a.nb / s.households * 1000), yoy: b && b.nb ? r1((a.nb / b.nb - 1) * 100) : null, ch13: pct(a.nb13, a.nb) }; }
    must('U.S. Courts', 'every state on the map has a count of nonbusiness bankruptcy cases', list.every((s) => s.bankruptcy));
    const now = sum(list.map((s) => (L.states[s.code] || {}).nb)), then = sum(list.map((s) => (P.states[s.code] || {}).nb));
    us.bankruptcy = { cases: now, per1000: r2(now / C.us.B11001_001E * 1000), yoy: then ? r1((now / then - 1) * 100) : null, ch13: pct(sum(list.map((s) => (L.states[s.code] || {}).nb13)), now) };
    tie('U.S. Courts', 'nonbusiness cases under chapters 7, 11 and 13 add up to all nonbusiness cases', L.total.nb7 + L.total.nb11 + L.total.nb13, L.total.nb, 25);
    tie('U.S. Courts', 'business + nonbusiness = all cases filed', L.total.business + L.total.nb, L.total.all, 2);
    must('U.S. Courts', 'the states on the map hold at least 97% of the national nonbusiness count (the rest: territories)', now / L.total.nb > 0.97 && now <= L.total.nb);
    D.bankruptcy = { asOf: L.end, prevAsOf: P.end, total: L.total, prev: P.total, yoy: r1((L.total.nb / P.total.nb - 1) * 100), districts: L.districts, acsYear: C.year };
    src('courts', { name: CT.source.name, url: L.page || CT.source.url, asOf: L.end });
  }
  D.states = { acsYear: C.year, pcpiYear: pc ? pc.year : null, rppYear: rpp ? rpp.year : null, pcepcYear: pce ? pce.year : null, debtAsOf: nyYear ? `${nyYear}-Q4` : null, us, list };
  if (pc) { src('beaStates', { name: 'U.S. Bureau of Economic Analysis, personal income by state, regional price parities and personal consumption expenditures by state, series read through FRED', url: 'https://www.bea.gov/data/by-place-states-territories', asOf: String(pc.year), via: 'FRED' }); D.sources.beaStates.fetchedAt = meta.fred.fetchedAt; }
  if (NS) src('nyfedStates', { name: NS.source.name, url: NS.source.url, asOf: `${nyYear}-Q4`, basis: NS.source.basis });
}

// ------------------------------------------------------------------------------------------------------------------
// BLS Consumer Expenditure Surveys: spending and income by income decile, age and tenure
// ------------------------------------------------------------------------------------------------------------------
const X = raw.cex;
if (X && X.cuts && X.cuts.deciles) {
  const year = X.year;
  const memo = {};
  const table = (cut, y) => (`${cut}.${y}` in memo ? memo[`${cut}.${y}`] : (memo[`${cut}.${y}`] = buildTable(cut, y)));
  function buildTable(cut, y) {
    const spec = X.cuts[cut]; const t = spec && spec.years[y];
    if (!t) return null;
    const cols = [...spec.columns].sort(); const row = (item) => (t[item] ? cols.map((c) => (t[item][c] == null ? null : t[item][c])) : null);
    const g = (item) => row(item) || cols.map(() => null);
    const add = (...rows) => cols.map((_, i) => (rows.some((r) => r[i] == null) ? null : rows.reduce((a, r) => a + r[i], 0)));
    const sub = (a, ...rows) => cols.map((_, i) => (a[i] == null || rows.some((r) => r[i] == null) ? null : a[i] - rows.reduce((s, r) => s + r[i], 0)));
    const has = (item) => !!row(item);
    const out = { columns: cols, total: g('TOTALEXP'), incomeBefore: g('INCBEFTX'), incomeAfter: has('INCAFTTX') && g('INCAFTTX').some((v) => v != null) ? g('INCAFTTX') : null, cu: g('CONSUNIT'), age: g('980020'), people: g('980010') };
    const full = ['FOODHOME', 'FOODAWAY', 'ALCBEVG', 'SHELTER', 'UTILS', 'HHOPER', 'HKPGSUPP', 'HHFURNSH', 'APPAREL', 'VEHPURCH', 'VEHOTHXP', 'PUBTRANS', 'TRANS', 'HEALTH', 'ENTRTAIN', 'PERSCARE', 'READING', 'EDUCATN', 'TOBACCO', 'MISC', 'CASHCONT', 'INSPENSN'].every(has);
    if (full) {
      out.cats = [['foodHome', g('FOODHOME')], ['foodAway', g('FOODAWAY')], ['alcohol', g('ALCBEVG')], ['shelter', g('SHELTER')], ['utilities', g('UTILS')], ['household', add(g('HHOPER'), g('HKPGSUPP'), g('HHFURNSH'))], ['apparel', g('APPAREL')],
        ['vehicles', g('VEHPURCH')], ['gasoline', sub(g('TRANS'), g('VEHPURCH'), g('VEHOTHXP'), g('PUBTRANS'))], ['vehicleOther', g('VEHOTHXP')], ['publicTransport', g('PUBTRANS')], ['health', g('HEALTH')], ['entertainment', g('ENTRTAIN')],
        ['personalCare', g('PERSCARE')], ['education', g('EDUCATN')], ['tobacco', g('TOBACCO')], ['other', add(g('READING'), g('MISC'))], ['giving', g('CASHCONT')], ['insurancePensions', g('INSPENSN')]].map(([k, v]) => ({ k, v }));
      cols.forEach((c, i) => { if (out.total[i] != null) tie('CE', `${cut} ${y} column ${c}: categories add up to average annual expenditures`, sum(out.cats.map((x) => x.v[i])), out.total[i], 12); });
    } else {   // the demographic cuts carry the main lines only
      const main = [['foodHome', 'FOODHOME'], ['foodAway', 'FOODAWAY'], ['alcohol', 'ALCBEVG'], ['housing', 'HOUSING'], ['apparel', 'APPAREL'], ['transport', 'TRANS'], ['health', 'HEALTH'], ['entertainment', 'ENTRTAIN'], ['education', 'EDUCATN'], ['giving', 'CASHCONT'], ['insurancePensions', 'INSPENSN']];
      if (main.every(([, it]) => has(it))) { out.cats = main.map(([k, it]) => ({ k, v: g(it) })); out.cats.push({ k: 'other', v: sub(out.total, ...out.cats.map((x) => x.v)) }); }
    }
    if (cut === 'deciles') {
      const inc = [['wages', g('900000')], ['selfEmp', g('900160')], ['retirement', add(g('900030'), g('900170'))], ['assets', add(g('900180'), g('900190'), g('900200'))], ['assistance', add(g('900090'), g('900120'), g('900150'))]];
      if (inc.every(([, v]) => v.every((x) => x != null))) {
        out.incomeSources = inc.map(([k, v]) => ({ k, v }));
        out.incomeSources.push({ k: 'other', v: sub(out.incomeBefore, ...inc.map(([, v]) => v)) });
        // the lowest decile's small income makes its unitemized remainder a larger share: 10% there, 3.5% elsewhere
        cols.forEach((c, i) => tie('CE', `${cut} ${y} column ${c}: itemized income sources close to income before taxes`, sum(inc.map(([, v]) => v[i])) / out.incomeBefore[i] * 100, 100, c === '02' ? 10 : 3.5, true));
      }
      out.tenure = has('980230') ? { ownerMortgage: g('980230'), ownerFree: g('980240'), renter: g('980260') } : null;
      out.earners = has('980030') ? g('980030') : null; out.vehicles = has('980040') ? g('980040') : null;
      if (has('PERSTAX') && g('PERSTAX').some((v) => v != null)) out.taxes = g('PERSTAX');
    }
    return out;
  }
  const dec = table('deciles', year);
  const years = Object.keys(X.cuts.deciles.years).map(Number).sort((a, b) => a - b);
  must('CE', 'ten deciles, each with average annual expenditures and income before taxes', !!dec && dec.total.slice(1).every((v) => v > 0) && dec.incomeBefore.slice(1).every((v) => v != null));
  if (dec) {
    must('CE', 'average annual expenditures rise with income decile', dec.total.slice(1).every((v, i, a) => i === 0 || v >= a[i - 1]), true);
    tie('CE', 'mean of the ten deciles = all consumer units (average annual expenditures)', sum(dec.total.slice(1)) / 10, dec.total[0], 150, true);
    // taxes and after-tax income are published with a lag: take the latest year that has them
    let taxYear = null; for (const y of [...years].reverse()) { const t = table('deciles', y); if (t && t.incomeAfter && t.incomeAfter.slice(1).every((v) => v != null)) { taxYear = y; break; } }
    const base = years.includes(2019) ? 2019 : years[0];
    D.cex = { asOf: String(year), deciles: dec, prevYear: years.includes(year - 1) ? table('deciles', year - 1) && { year: year - 1, total: table('deciles', year - 1).total, incomeBefore: table('deciles', year - 1).incomeBefore } : null,
      base: base !== year && table('deciles', base) ? { year: base, total: table('deciles', base).total, incomeBefore: table('deciles', base).incomeBefore, cats: table('deciles', base).cats } : null,
      afterTax: taxYear ? { year: taxYear, incomeAfter: table('deciles', taxYear).incomeAfter, incomeBefore: table('deciles', taxYear).incomeBefore, total: table('deciles', taxYear).total, taxes: table('deciles', taxYear).taxes || null } : null,
      age: X.cuts.age ? table('age', year) : null, tenure: X.cuts.tenure ? table('tenure', year) : null };
    src('cex', { name: X.source.name, url: X.source.url, asOf: String(year) });
  }
}

// ------------------------------------------------------------------------------------------------------------------
// Federal Reserve: Distributional Financial Accounts and Survey of Consumer Finances
// ------------------------------------------------------------------------------------------------------------------
const W = raw.dfa;
if (W) {
  const q = W.latest; const dims = {};
  const rec = (x) => ({ nw: r1(x.nw / 1000), assets: r1(x.assets / 1000), liab: r1(x.liab / 1000), re: r1(x.re / 1000), durables: r1(x.durables / 1000), equities: r1(x.equities / 1000), pensions: r1((x.db + x.dc) / 1000), business: r1(x.business / 1000),
    deposits: r1(((x.deposits || 0) + (x.mmf || 0)) / 1000), otherAssets: r1((x.other - (x.deposits || 0) - (x.mmf || 0)) / 1000), mortgages: r1(x.mortgages / 1000), ccredit: r1(x.ccredit / 1000), otherLiab: r1(x.otherLiab / 1000), households: x.households || null });
  let total = null;
  for (const [d, t] of Object.entries(W.dims)) {
    const cats = t.categories.map((k) => ({ k, ...rec(t.series[k][q]) }));
    const tot = sum(t.categories.map((k) => t.series[k][q].nw));
    if (total == null) total = tot; else tie('DFA', `${d}: groups add up to the same household net worth as the wealth groups`, tot / 1000, total / 1000, 2);
    for (const k of t.categories) { const x = t.series[k][q]; tie('DFA', `${d} ${k}: assets − liabilities = net worth`, x.assets - x.liab, x.nw, 3); tie('DFA', `${d} ${k}: asset classes add up to assets`, x.re + x.durables + x.equities + x.db + x.dc + x.business + x.other, x.assets, 6); }
    dims[d] = cats;
  }
  const NWD = W.dims.networth;
  // history of shares of net worth by wealth group (every quarter) and of the group's net worth in $ trillions (Q4 of each year and the latest)
  const shares = {}; for (const k of NWD.categories) shares[k] = [];
  for (const qq of NWD.quarters) { const t = sum(NWD.categories.map((k) => NWD.series[k][qq].nw)); for (const k of NWD.categories) shares[k].push(r2(NWD.series[k][qq].nw / t * 100)); }
  const histDims = {};
  for (const d of ['generation', 'age', 'income']) { const t = W.dims[d]; histDims[d] = {}; for (const k of t.categories) histDims[d][k] = t.quarters.map((qq) => { const tt = sum(t.categories.map((kk) => (t.series[kk][qq] ? t.series[kk][qq].nw : 0))); return t.series[k][qq] ? r2(t.series[k][qq].nw / tt * 100) : null; }); }
  // the wealth and income cutoffs are published for survey quarters only
  const cut = (d, field) => { const t = W.dims[d]; for (const qq of [...t.quarters].reverse()) { const vals = t.categories.map((k) => t.series[k][qq][field]); if (vals.some((v) => v != null)) return { asOf: qq, values: Object.fromEntries(t.categories.map((k, i) => [k, vals[i] == null ? null : vals[i]])) }; } return null; };
  const hhTotal = sum(NWD.categories.map((k) => NWD.series[k][q].households || 0));
  D.wealth = { asOf: q, total: r1(total / 1000), households: hhTotal || null, dims, history: { quarters: NWD.quarters, shares, dims: histDims }, cutoffs: { networth: cut('networth', 'minCut'), income: cut('income', 'minCut') } };
  // Leverage by group, every quarter (FNAM calculations on the DFA balance sheets): liabilities ÷ assets, consumer credit ÷
  // deposits and money market funds (what a group owes on cards, cars and student loans per dollar of cash it holds), and
  // mortgages ÷ real estate. `all` is the same ratio for all households.
  const levOf = (d) => {
    const t = W.dims[d]; const ratio = (a, b) => (a == null || !b ? null : r1(a / b * 100));
    const o = { quarters: t.quarters, cats: t.categories, d2a: {}, cc2cash: {}, ltv: {}, all: { d2a: [], cc2cash: [], ltv: [] }, latest: {} };
    for (const k of t.categories) { o.d2a[k] = []; o.cc2cash[k] = []; o.ltv[k] = []; }
    for (const qq of t.quarters) {
      const A = { liab: 0, assets: 0, cc: 0, cash: 0, mort: 0, re: 0 };
      for (const k of t.categories) {
        const x = t.series[k][qq] || {}; const cash = (x.deposits || 0) + (x.mmf || 0);
        o.d2a[k].push(ratio(x.liab, x.assets)); o.cc2cash[k].push(ratio(x.ccredit, cash)); o.ltv[k].push(ratio(x.mortgages, x.re));
        A.liab += x.liab || 0; A.assets += x.assets || 0; A.cc += x.ccredit || 0; A.cash += cash; A.mort += x.mortgages || 0; A.re += x.re || 0;
      }
      o.all.d2a.push(ratio(A.liab, A.assets)); o.all.cc2cash.push(ratio(A.cc, A.cash)); o.all.ltv.push(ratio(A.mort, A.re));
    }
    for (const k of t.categories) { const x = t.series[k][q]; o.latest[k] = { debtPerHh: x.households ? r1(x.liab * 1e6 / x.households / 1000) : null, ccPerHh: x.households ? r1(x.ccredit * 1e6 / x.households / 1000) : null, cashPerHh: x.households ? r1(((x.deposits || 0) + (x.mmf || 0)) * 1e6 / x.households / 1000) : null }; }   // $ thousands per household
    return o;
  };
  D.leverage = { asOf: q, networth: levOf('networth'), income: levOf('income'), age: levOf('age'), notes: { calc: ['d2a', 'cc2cash', 'ltv', 'debtPerHh', 'ccPerHh', 'cashPerHh'] } };
  tie('DFA', 'leverage: all-household debt-to-assets is the same by wealth group and by income group', last(D.leverage.networth.all.d2a), last(D.leverage.income.all.d2a), 0.2, true);
  must('DFA', 'leverage: every income group has a debt-to-assets ratio between 0% and 100% in the latest quarter', Object.values(D.leverage.income.d2a).every((a) => last(a) > 0 && last(a) < 100), true);
  if (D.z1) tie('DFA', 'household net worth: DFA total = Financial Accounts (Z.1) households', total / 1e6, D.z1.netWorth, 0.2, true);
  src('dfa', { name: W.source.name, url: W.source.url, asOf: q, published: W.lastModified });
}
const SC = raw.scf;
if (SC) {
  const y = SC.year; const cats = SC.cats;
  const grp = (c) => Object.keys(cats[c].median).map((k) => { const m = cats[c].median[k][y], a = cats[c].mean[k][y], h = cats[c].have[k][y]; if (!m) return null;
    return { k, medNW: r1(m.Net_Worth), meanNW: r1(a.Net_Worth), medIncome: r1(m.Before_Tax_Income), meanIncome: r1(a.Before_Tax_Income),
      have: { debt: r1(h.Debt), card: r1(h.Credit_Card_Balances), vehicle: r1(h.Vehicle_Installment_Loans), edu: r1(h.Education_Installment_Loans), home: r1(h.Home_Secured_Debt), stocks: r1(h.Stock_Holdings), retirement: r1(h.Retirement_Accounts), residence: r1(h.Primary_Residence), business: r1(h.Business_Equity), transaction: r1(h.Transaction_Accounts) },
      med: { debt: r1(m.Debt), card: r1(m.Credit_Card_Balances), vehicle: r1(m.Vehicle_Installment_Loans), edu: r1(m.Education_Installment_Loans), home: r1(m.Home_Secured_Debt), stocks: r1(m.Stock_Holdings), retirement: r1(m.Retirement_Accounts), residence: r1(m.Primary_Residence), transaction: r1(m.Transaction_Accounts) } }; }).filter(Boolean);
  const all = cats.all;
  const hist = SC.years.map((yy) => ({ y: yy, medNW: r1(all.median['All families'][yy].Net_Worth), meanNW: r1(all.mean['All families'][yy].Net_Worth), medIncome: r1(all.median['All families'][yy].Before_Tax_Income) }));
  D.scf = { asOf: String(y), dollars: y, all: grp('all')[0], age: grp('agecl'), edu: grp('edcl'), race: grp('racecl4'), income: grp('inccat'), networth: grp('nwcat'), housing: grp('housecl'), family: grp('famstruct'), history: hist };
  must('SCF', 'median net worth of all families is positive and below the mean', D.scf.all.medNW > 0 && D.scf.all.medNW < D.scf.all.meanNW);
  must('SCF', 'six income groups and six age groups', D.scf.income.length === 6 && D.scf.age.length === 6);
  src('scf', { name: SC.source.name, url: SC.source.url, asOf: String(y), published: SC.lastModified });
  // Bulletin table 18: debt payments against income (aggregate, median for debtors), debtors paying more than 40% of income,
  // debtors 60 days or more late on a payment; and table 12: leverage ratio (debt ÷ assets) of each group
  const TB = SC.tables;
  if (TB && TB.burden) {
    const rows = TB.burden, yi = rows.findIndex((r) => r && r[0] == null && r[1] === 1989);
    const heads = rows.find((r) => r && /Family characteristic/i.test(String(r[0] || '')));
    if (yi >= 0 && heads) {
      const yrs = []; for (let c = 1; c < rows[yi].length && typeof rows[yi][c] === 'number'; c++) { if (yrs.length && rows[yi][c] <= yrs[yrs.length - 1]) break; yrs.push(rows[yi][c]); }
      const n = yrs.length, blockAt = (re) => heads.findIndex((c) => typeof c === 'string' && re.test(c));
      const B = { agg: blockAt(/^Aggregate/i), median: blockAt(/^Median for debtors/i), over40: blockAt(/ratio greater than 40/i), late60: blockAt(/60 days or more/i) };
      const rec = (r) => Object.fromEntries(Object.entries(B).filter(([, c]) => c > 0).map(([k, c]) => [k, r.slice(c, c + n).map((v) => (typeof v === 'number' ? r1(v) : null))]));
      const grab = (headRe, count) => { const hi = rows.findIndex((r) => r && headRe.test(String(r[0] || ''))); return hi < 0 ? [] : rows.slice(hi + 1, hi + 1 + count).filter((r) => r && r[0] && typeof r[1] === 'number').map((r) => ({ k: String(r[0]).replace(/–/g, '-').trim(), ...rec(r) })); };
      const allRow = rows.find((r) => r && /^All families$/i.test(String(r[0] || '')));
      if (allRow && B.over40 > 0 && yrs[n - 1] === y) {
        D.burden = { asOf: String(y), years: yrs, all: rec(allRow), income: grab(/^Percentile of income/i, 6), age: grab(/^Age of reference person/i, 6), networth: grab(/^Percentile of net worth/i, 5), housing: grab(/^Housing status/i, 2) };
        must('SCF', 'debt-burden table: six income groups with the share of debtors above 40%', D.burden.income.length === 6 && D.burden.income.every((g) => g.over40 && g.over40[n - 1] != null), true);
        if (TB.leverage) { const lr = TB.leverage, ly = lr.find((r) => r && /Family characteristic/i.test(String(r[0] || ''))); const la = lr.find((r) => r && /^All families$/i.test(String(r[0] || ''))); if (ly && la) D.burden.leverageAll = { years: ly.slice(1).filter((v) => typeof v === 'number'), values: la.slice(1).filter((v) => typeof v === 'number').map(r1) }; }
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------------------------
// New York Fed: household debt by product and age, delinquency
// ------------------------------------------------------------------------------------------------------------------
const N = raw.nyfed;
if (N) {
  const S = N.sheets; const col = (s, re) => s.columns.findIndex((c) => re.test(c)) + 1;
  const bal = S.balance; const last = bal.rows[bal.rows.length - 1], prev = bal.rows[bal.rows.length - 5];
  const B = (row) => ({ mortgage: row[col(bal, /^Mortgage/i)], heloc: row[col(bal, /^HE Revolving/i)], auto: row[col(bal, /^Auto/i)], card: row[col(bal, /^Credit Card/i)], student: row[col(bal, /^Student/i)], other: row[col(bal, /^Other/i)], total: row[col(bal, /^Total/i)] });
  const cur = B(last), yago = prev ? B(prev) : null;
  tie('NY Fed', 'debt by product adds up to total household debt', cur.mortgage + cur.heloc + cur.auto + cur.card + cur.student + cur.other, cur.total, 0.02);
  const series = (s, from) => (s ? { columns: s.columns, rows: s.rows.filter((r) => !from || r[0] >= from).map((r) => [r[0], ...r.slice(1).map(r2)]) } : null);
  const pa = S.byProductAge;
  if (pa) { const tot = sum(pa.rows.flatMap((r) => r.slice(1))); tie('NY Fed', 'debt by product and age adds up to total household debt (unknown ages aside)', tot, cur.total, 0.25, true); }
  const lim = S.limits; let util = null;
  if (lim) { const r = lim.rows[lim.rows.length - 1]; const b = r[col(lim, /^Credit Card Balance/i)], l = r[col(lim, /^Credit Card Limit/i)]; if (b && l) util = { balance: r3(b), limit: r3(l), pct: pct(b, l) }; }
  D.debt = { asOf: N.report, published: N.published, units: 'trillions of dollars', balance: Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, r3(v)])), yearAgo: yago && Object.fromEntries(Object.entries(yago).map(([k, v]) => [k, r3(v)])),
    totalSeries: bal.rows.map((r) => [r[0], r2(r[col(bal, /^Total/i)])]), byAge: series(S.byAge, '2003-Q1'), byProductAge: pa ? { columns: pa.columns, rows: pa.rows.map((r) => [r[0], ...r.slice(1).map(r3)]) } : null,
    t90: { all: series(S.t90Age, '2003-Q1'), card: series(S.t90AgeCard, '2003-Q1'), auto: series(S.t90AgeAuto, '2003-Q1'), mortgage: series(S.t90AgeMortgage, '2003-Q1'), student: series(S.t90AgeStudent, '2003-Q1') },
    d90: series(S.d90, '2003-Q1'), new90: series(S.new90, '2003-Q1'), cardUtilization: util,
    collections: S.collections ? (() => { const r = S.collections.rows[S.collections.rows.length - 1]; return { pctConsumers: r2(r[1]), average: r0(r[2]) }; })() : null };
  src('nyfed', { name: N.source.name, url: N.source.url, asOf: N.report, basis: N.source.basis, published: N.published });
}

// ------------------------------------------------------------------------------------------------------------------
// Leverage and financial stress: how cards are paid, access to credit and expected trouble, student loans, insolvencies
// ------------------------------------------------------------------------------------------------------------------
const qLabel = (d) => `${d.slice(0, 4)}-Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;
{
  // (1) Philadelphia Fed, large-bank credit card data (FR Y-14M), through FRED
  const ids = { payMin: 'RCCCBSHRMIN', payFull: 'RCCCBSHRFULL', payBetween: 'RCCCBSHRGTMINLTMAX', util50: 'RCCCBACTIVEUTILPCT50', util75: 'RCCCBACTIVEUTILPCT75', util90: 'RCCCBACTIVEUTILPCT90', dq30: 'RCCCBBALDPD30P', dq90: 'RCCCBBALDPD90P', nco: 'RCCCBNCOPCT',
    balances: 'RCCCBBALTOT', revolving: 'RCCCBBALREV', newSub660: 'RCCCOACTPCTSCORELT660', apr: 'RCCCBAPRAVGPCTGP', buyHigh: 'RCCCBPURCHASEASGTE720', buyMid: 'RCCCBPURCHASEAS660T719', buyLow: 'RCCCBPURCHASEASLT660' };
  if (fs(ids.payMin) && fs(ids.payFull)) {
    const quarters = fs(ids.payMin).map((o) => qLabel(o[0]));
    const colOf = (id) => { const m = new Map((fs(id) || []).map((o) => [qLabel(o[0]), o[1]])); return quarters.map((q) => (m.has(q) ? m.get(q) : null)); };
    const X = { asOf: quarters[quarters.length - 1], quarters }; for (const [k, id] of Object.entries(ids)) if (fs(id)) X[k] = colOf(id);
    const n = quarters.length - 1;
    if (X.payBetween) must('Card payments', 'minimum, in-between and full payers are between 55% and 101% of accounts (the three shares are of all accounts and do not add to 100%)', X.payMin[n] + X.payBetween[n] + X.payFull[n] > 55 && X.payMin[n] + X.payBetween[n] + X.payFull[n] <= 101, true);
    must('Card payments', 'shares are percentages', X.payMin.every((v) => v == null || (v > 0 && v < 100)) && X.payFull.every((v) => v == null || (v > 0 && v < 100)));
    D.cards = X;
    src('phillyCards', { name: 'Federal Reserve Bank of Philadelphia, Large Bank Credit Card and Mortgage Data (FR Y-14M), series read through FRED', url: 'https://www.philadelphiafed.org/surveys-and-data/large-bank-credit-card-and-mortgage-data', asOf: X.asOf, via: 'FRED' });
    D.sources.phillyCards.fetchedAt = meta.fred ? meta.fred.fetchedAt : null;
  }
  // (2) New York Fed, Survey of Consumer Expectations and its Credit Access Survey
  const E = raw.sce;
  if (E && E.delinquency && E.access) {
    const dq = E.delinquency; const keep = dq.groups.map((g, i) => [g, i]).filter(([g]) => /^(Age|Education|Income)/i.test(g));
    must('SCE', 'the probability of missing a payment is a percentage in every month', dq.all.every((v) => v > 0 && v < 100));
    const share = (rows, idx) => rows.map((r) => r1(idx.reduce((a, i) => a + (r[i] || 0), 0)));
    const ca = E.creditAvailability, fi = E.finances;
    must('SCE', 'credit-availability answers add up to 100%', Math.abs(sum(ca.yearAgo[ca.yearAgo.length - 1]) - 100) < 1.5, true);
    const all = E.access.filter((o) => o.group === 'all').sort((a, b) => (a.date < b.date ? -1 : 1));
    const lastWave = all[all.length - 1].date;
    const grp = (g) => E.access.filter((o) => o.group === g && o.date === lastWave).map((o) => ({ k: o.category, applied: r1(o.applied), rejected: r1(o.rejected), discouraged: r1(o.discouraged), comeUp: r1(o.chanceComeUp), need: r1(o.chanceNeed), n: o.n }));
    const hist = (g, cat, f) => { const m = new Map(E.access.filter((o) => o.group === g && o.category === cat).map((o) => [o.date, o[f]])); return all.map((o) => (m.has(o.date) && m.get(o.date) != null ? r1(m.get(o.date)) : null)); };
    D.expect = { asOf: dq.months[dq.months.length - 1],
      delinquency: { months: dq.months, all: dq.all.map(r1), groups: keep.map(([g]) => g), byGroup: keep.map(([, i]) => dq.byGroup[i].map(r1)) },
      credit: { months: ca.months, harderNow: share(ca.yearAgo, [0, 1]), harderAhead: share(ca.yearAhead, [0, 1]), easierNow: share(ca.yearAgo, [3, 4]) },
      finances: { months: fi.months, worseNow: share(fi.yearAgo, [0, 1]), betterNow: share(fi.yearAgo, [3, 4]), worseAhead: share(fi.yearAhead, [0, 1]), betterAhead: share(fi.yearAhead, [3, 4]) },
      access: { asOf: lastWave, waves: all.map((o) => o.date), applied: all.map((o) => r1(o.applied)), rejected: all.map((o) => r1(o.rejected)), discouraged: all.map((o) => r1(o.discouraged)), comeUp: all.map((o) => (o.chanceComeUp == null ? null : r1(o.chanceComeUp))),
        cardRejected: all.map((o) => (o.ccRejected == null ? null : r1(o.ccRejected))), autoRejected: all.map((o) => (o.autoRejected == null ? null : r1(o.autoRejected))),
        byScore: grp('credit_score'), byAge: grp('age'), rejectedLowScore: hist('credit_score', 'less_680', 'rejected'), rejectedHighScore: hist('credit_score', 'over_760', 'rejected') } };
    must('SCE Credit Access', 'three credit-score groups in the latest wave', D.expect.access.byScore.length === 3, true);
    src('sce', { name: E.source.name, url: E.source.url, asOf: D.expect.asOf });
  }
  // (3) Federal Student Aid: the federally managed portfolio by loan status, and Direct Loans in repayment by days delinquent
  const FS = raw.fsa;
  if (FS && FS.books) {
    const fq = (y, q) => { const n = Number(String(q).replace(/\D/g, '')); return n === 1 ? `${y - 1}-12-31` : n === 2 ? `${y}-03-31` : n === 3 ? `${y}-06-30` : `${y}-09-30`; };   // federal fiscal quarters
    const read = (book, sheetRe, titleRe, groups) => {
      const sh = (FS.books[book].sheets || []).find((x) => sheetRe.test(x.name)); if (!sh) return null;
      if (!titleRe.test(String((sh.rows[0] || [])[0] || ''))) { must('FSA', `${sh.name}: title is "${(sh.rows[0] || [])[0]}"`, false, true); return null; }
      const gi = sh.rows.findIndex((r) => r && r.some((c) => typeof c === 'string' && groups[0].test(c)));
      if (gi < 0 || !/Dollars Outstanding/i.test(String((sh.rows[gi + 1] || [])[2] || ''))) { must('FSA', `${sh.name}: header rows not found`, false, true); return null; }
      const cols = groups.map((re) => sh.rows[gi].findIndex((c) => typeof c === 'string' && re.test(c)));
      if (cols.some((c) => c < 0)) { must('FSA', `${sh.name}: a status column is missing`, false, true); return null; }
      const out = []; let year = null;
      for (const r of sh.rows.slice(gi + 2)) { if (!r || !/^Q[1-4]$/.test(String(r[1] || '').trim())) continue; if (typeof r[0] === 'number') year = r[0]; if (!year) continue; out.push({ d: fq(year, r[1]), usd: cols.map((c) => r[c]), people: cols.map((c) => r[c + 1]) }); }
      return out;
    };
    const ST = [/^In-School/i, /^Grace/i, /^Repayment/i, /^Deferment/i, /^Forbearance/i, /^Cumulative in Default/i, /^Other/i];
    const DQ = [/^Current Repayment/i, /^31-90 Days/i, /^91-180 Days/i, /^181-270 Days/i, /^271-360 Days/i];
    const st = read('status', /^Federally Managed$/i, /Federally Managed Portfolio by Loan Status/i, ST), dl = read('delinquency', /^DLPortfoliobyDelinquencyStatus$/i, /Direct Loan Portfolio by Delinquency Status/i, DQ);
    if (st && st.length > 8) {
      const keys = ['inSchool', 'grace', 'repayment', 'deferment', 'forbearance', 'default', 'other'];
      const L = { asOf: st[st.length - 1].d, dates: st.map((r) => r.d), usd: {}, people: {} };
      keys.forEach((k, i) => { L.usd[k] = st.map((r) => r1(r.usd[i])); L.people[k] = st.map((r) => r2(r.people[i])); });
      L.total = st.map((r) => r1(sum(r.usd)));
      must('FSA', 'every status has a balance in the latest quarter', st[st.length - 1].usd.every((v) => typeof v === 'number'));
      if (dl && dl.length > 8) { const dk = ['current', 'd31_90', 'd91_180', 'd181_270', 'd271_360']; L.delinquency = { asOf: dl[dl.length - 1].d, dates: dl.map((r) => r.d), usd: {}, people: {} }; dk.forEach((k, i) => { L.delinquency.usd[k] = dl.map((r) => r1(r.usd[i])); L.delinquency.people[k] = dl.map((r) => r2(r.people[i])); });
        L.delinquency.lateShare = dl.map((r) => { const t = sum(r.usd.slice(0, 5)); return t ? r1(sum(r.usd.slice(1, 5)) / t * 100) : null; }); }
      D.studentLoans = { ...L, notes: { calc: ['total', 'lateShare'] } };
      src('fsa', { name: FS.source.name, url: FS.source.url, asOf: L.asOf });
    }
  }
  // (4) New York Fed: consumers with a new bankruptcy or foreclosure on their credit report, and who gets new auto loans and mortgages
  if (N) {
    const S = N.sheets;
    if (S.bankruptcy && S.bankruptcy.rows.length) {
      const b = S.bankruptcy; const ci = (re) => b.columns.findIndex((c) => re.test(c)) + 1;
      const rows = b.rows.filter((r) => r[0] >= '2003-Q1');
      D.insolvency = { asOf: rows[rows.length - 1][0], units: 'thousands of consumers', quarters: rows.map((r) => r[0]), bankruptcy: rows.map((r) => r1(r[ci(/bankruptcy/i)])), foreclosure: rows.map((r) => r1(r[ci(/foreclosure/i)])) };
      if (S.bkAge) { const r = S.bkAge.rows[S.bkAge.rows.length - 1], r4 = S.bkAge.rows.slice(-4); D.insolvency.byAge = { columns: S.bkAge.columns, latest: r.slice(1).map(r1), last4: S.bkAge.columns.map((_, i) => r1(sum(r4.map((x) => x[i + 1])))) }; }
      must('NY Fed', 'new bankruptcies and foreclosures are positive every quarter', D.insolvency.bankruptcy.every((v) => v > 0) && D.insolvency.foreclosure.every((v) => v > 0));
    }
    const orig = (sh) => { if (!sh) return null; const ti = sh.columns.findIndex((c) => /^total$/i.test(c)) + 1, lo = sh.columns.findIndex((c) => /^<\s*620/.test(c)) + 1, hi = sh.columns.findIndex((c) => /^760/.test(c)) + 1; if (!ti || !lo || !hi) return null;
      const rows = sh.rows.filter((r) => r[0] >= '2003-Q1' && r[ti]); return { quarters: rows.map((r) => r[0]), sub620: rows.map((r) => r1(r[lo] / r[ti] * 100)), top760: rows.map((r) => r1(r[hi] / r[ti] * 100)), total: rows.map((r) => r1(r[ti])) }; };
    const ao = orig(S.autoOrigScore), mo = orig(S.mortOrigScore);
    if (ao || mo) D.originations = { asOf: (ao || mo).quarters[(ao || mo).quarters.length - 1], auto: ao, mortgage: mo, units: 'billions of dollars', notes: { calc: ['sub620', 'top760'] } };
  }
  // (5) CFPB study of buy now, pay later loans matched to credit records (2021-2022)
  const CB = raw.cfpbBnpl;
  if (CB && CB.facts) { D.bnplStudy = { dataYear: CB.dataYear, published: CB.published, lenders: CB.lenders, ...CB.facts }; src('cfpbBnpl', { name: CB.source.name, url: CB.source.url, asOf: String(CB.dataYear), published: CB.published }); }
  // (6) Federal Reserve, Economic Well-Being of U.S. Households: the yearly survey's own tables and accessible figures,
  //     found by title (their numbers change from one edition to the next), plus the Board's note on buy now, pay later
  const SH = raw.shed;
  if (SH && SH.pages) {
    const blocks = SH.pages.flatMap((p) => p.blocks || []), find = (re, list = blocks) => list.find((b) => re.test(b.title)) || null;
    const nn = (v) => { const t = String(v == null ? '' : v).replace(/[−–]/g, '-').replace(/[^\d.\-]/g, ''); return t === '' || !Number.isFinite(Number(t)) ? null : Number(t); };
    const yearRows = (b) => (b ? b.rows.filter((r) => /^\d{4}$/.test(String(r[0]).trim())) : []);
    const group = (b, head) => { if (!b) return []; const i = b.rows.findIndex((r) => r.length === 1 && head.test(String(r[0]))); if (i < 0) return []; const out = []; for (const r of b.rows.slice(i + 1)) { if (r.length === 1) break; out.push(r); } return out; };
    const rowOf = (b, re) => (b ? b.rows.find((r) => re.test(String(r[0]))) || null : null);
    const lab = (l) => { const en = String(l).replace(/\s+/g, ' ').replace(/(\d)\s*-\s*(\$?\d)/g, '$1–$2').trim(); return { en, es: en.replace(/^Less than /, 'Menos de ').replace(/ or more$/, ' o más') }; };
    const yr = String(SH.year);
    src('shed', { name: SH.source.name, url: SH.source.url, asOf: yr, published: String(SH.published) });

    // --- cash cushions and getting by
    const okB = find(/Doing okay or living comfortably financially \(by year\)/i), c4B = find(/cover a \$400 emergency expense completely using cash or its equivalent \(by year\)/i);
    const okD = find(/^Table \d+\. Doing okay or living comfortably financially \(by demographic/i), savB = find(/Largest emergency expense individuals could handle right now using only savings\s*$/i);
    const otherB = find(/Other ways individuals would cover a \$400 emergency expense/i), leftB = find(/money left over at the end of the month \(by family income\)/i), rentB = find(/Behind on rent at some point in the past year \(by income and year\)/i);
    if (okB && c4B) {
      const a = yearRows(okB), b = yearRows(c4B), years = a.map((r) => Number(r[0])), cash = years.map((y) => { const r = b.find((x) => Number(x[0]) === y); return r ? nn(r[1]) : null; });
      const BF = { asOf: yr, years, series: [{ k: 'okay', label: { en: 'Doing at least okay financially', es: 'Les va al menos bien económicamente' }, values: a.map((r) => nn(r[1])) }, { k: 'cash400', label: { en: 'Would cover a $400 emergency with cash or its equivalent', es: 'Cubriría un imprevisto de $400 con efectivo o su equivalente' }, values: cash }], okay: nn(last(a)[1]), cash400: last(cash) };
      must('Fed survey', `the yearly series end in the survey year (${yr})`, last(years) === SH.year);
      const inc = group(okD, /^Family income/i);
      if (inc.length) { BF.groups = inc.map((r) => ({ label: lab(r[0]), v: nn(r[1]), chg: nn(r[2]) })); BF.groupMeasure = { en: 'doing at least okay financially, by family income', es: 'les va al menos bien económicamente, por ingreso familiar' }; }
      const ov = rowOf(okD, /^Overall/i); if (ov) tie('Fed survey', 'doing at least okay: the yearly figure equals the "Overall" row of the table by group', nn(ov[1]), BF.okay, 0.5);
      if (savB) { const rows = savB.rows.filter((r) => r.length >= 2 && nn(r[1]) != null); BF.savings = { labels: rows.map((r) => lab(r[0])), values: rows.map((r) => nn(r[1])) }; tie('Fed survey', 'largest emergency expense covered from savings: the brackets add up to 100', sum(BF.savings.values), 100, 2.5, true); }
      const cant = rowOf(otherB, /Would not be able to pay/i); if (cant) BF.cannotPay400 = nn(cant[1]);
      if (leftB) { const h = leftB.rows[0].map((c) => String(c)), iN = h.findIndex((c) => /^Never/i.test(c)), iR = h.findIndex((c) => /^Rarely/i.test(c)); const rows = leftB.rows.slice(1).filter((r) => r.length === h.length);
        if (iN > 0 && iR > 0) { const g = rows.filter((r) => !/^Overall/i.test(r[0])).map((r) => ({ label: lab(r[0]), v: nn(r[iN]) + nn(r[iR]) })), o = rows.find((r) => /^Overall/i.test(r[0])); BF.leftover = { groups: g, all: o ? nn(o[iN]) + nn(o[iR]) : null };
          for (const r of rows) tie('Fed survey', `money left at month end, ${r[0]}: the five answers add up to 100`, sum(r.slice(1).map(nn)), 100, 2.5, true); } }
      if (rentB) { const h = rentB.rows[0].slice(1).map(Number), o = rowOf(rentB, /^Overall/i), g = rentB.rows.slice(1).filter((r) => !/^Overall/i.test(r[0]) && r.length === h.length + 1); if (o && g.length) BF.behindRent = { years: h, all: o.slice(1).map(nn), low: { label: lab(g[0][0]), values: g[0].slice(1).map(nn) }, high: { label: lab(last(g)[0]), values: last(g).slice(1).map(nn) } }; }
      D.buffers = BF;
    }

    // --- buy now, pay later
    const useB = find(/^Figure \d+\. Use of Buy Now, Pay Later/i), demB = find(/^Table \d+\. Buy Now, Pay Later \(BNPL\) use \(by demographic/i), whyB = find(/Main reason for using Buy Now, Pay Later/i);
    const note = (SH.notes || []).find((n) => /bnpl/i.test(n.id)), nb = note ? note.blocks || [] : [];
    const nYear = find(/Used Buy Now, Pay Later in past year, by year and gender/i, nb), nSav = find(/Buy Now, Pay Later use, by largest emergency expense/i, nb), nOd = find(/payment triggered an overdraft or non-sufficient funds fee/i, nb), nFee = find(/charged extra for paying late or incurred an overdraft/i, nb);
    if (useB) {
      const a = yearRows(useB), years = a.map((r) => Number(r[0]));
      const BN = { asOf: yr, years, all: a.map((r) => nn(r[1])), paidLate: a.map((r) => nn(r[2])), late: nn(last(a)[2]) };
      must('Fed survey', `buy now, pay later: the yearly series ends in the survey year (${yr})`, last(years) === SH.year);
      if (nYear) { const g = yearRows(nYear), h = nYear.rows[0].map(String), iM = h.findIndex((c) => /^Men/i.test(c)), iW = h.findIndex((c) => /^Women/i.test(c));
        const same = years.every((y, i) => { const r = g.find((x) => Number(x[0]) === y); return r && nn(r[1]) === BN.all[i]; });
        if (must('Fed survey', 'buy now, pay later: the Board note and the report give the same share of adults every year', same, true) && iM > 0 && iW > 0) { BN.men = years.map((y) => nn(g.find((x) => Number(x[0]) === y)[iM])); BN.women = years.map((y) => nn(g.find((x) => Number(x[0]) === y)[iW])); } }
      if (demB) { const pick = (head) => group(demB, head).map((r) => ({ label: lab(r[0]), used: nn(r[1]), late: nn(r[2]) })); BN.byIncome = pick(/^Family income/i); BN.byAge = pick(/^Age/i);
        const ov = rowOf(demB, /^Overall/i); if (ov) tie('Fed survey', 'buy now, pay later: the yearly figure equals the "Overall" row of the table by group', nn(ov[1]), last(BN.all), 0.5); }
      if (whyB) { const h = whyB.rows[0].map(String), r = rowOf(whyB, /Only way I could afford/i), iO = h.findIndex((c) => /^Overall/i.test(c)); if (r) BN.onlyWay = { all: iO > 0 ? nn(r[iO]) : null, groups: h.slice(1).map((c, i) => ({ label: lab(c), v: nn(r[i + 1]) })).filter((x) => !/^Overall/i.test(x.label.en)) }; }
      if (nSav) { const rows = nSav.rows.slice(1).filter((r) => nn(r[1]) != null); BN.bySavings = { labels: rows.map((r) => lab(r[0]).en), values: rows.map((r) => nn(r[1])) }; }
      if (nOd) { const o = rowOf(nOd, /^Overall/i), lo = nOd.rows[1]; if (o) BN.overdraft = nn(o[1]); if (lo && nn(lo[1]) != null) BN.overdraftLow = { label: lab(lo[0]), v: nn(lo[1]) }; }
      if (nFee) { const o = rowOf(nFee, /^Overall/i), gro = rowOf(nFee, /Groceries/i); if (o) BN.lateAll = nn(o[1]); if (gro) BN.lateGroceries = nn(gro[1]); }
      if (note) { BN.noteUrl = note.url; BN.noteTitle = note.title; }
      D.bnpl = BN;
    }
  }
}

// ------------------------------------------------------------------------------------------------------------------
// The K-shaped economy: who does the spending, who receives the income, who holds the assets, and how each group fares
// ------------------------------------------------------------------------------------------------------------------
{
  const K = {};
  // annual and quarterly averages of the PCE price index (to state dollars of different years in constant terms)
  const pcepi = fs('PCEPI');
  const priceAvg = (prefixes) => { if (!pcepi) return null; const v = pcepi.filter((o) => prefixes.some((p) => o[0].startsWith(p))).map((o) => o[1]); return v.length === prefixes.length ? sum(v) / v.length : null; };
  const priceYear = (y) => priceAvg(Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`));
  const priceQuarter = (q) => { const y = q.slice(0, 4), n = Number(q.slice(6)); return priceAvg([0, 1, 2].map((i) => `${y}-${String((n - 1) * 3 + i + 1).padStart(2, '0')}`)); };

  // (1) BLS Consumer Expenditure Surveys by income quintile since 1984: each fifth's share of all spending and of all income
  const XQ = raw.cexHist;
  if (XQ) {
    const Q5 = ['02', '03', '04', '05', '06'];
    const years = Object.keys(XQ.years).map(Number).sort((a, b) => a - b).filter((y) => ['TOTALEXP', 'INCBEFTX', 'CONSUNIT'].every((it) => XQ.years[y][it] && Q5.every((c) => XQ.years[y][it][c] != null)));
    const agg = (y, item) => Q5.map((c) => XQ.years[y][item][c] * XQ.years[y].CONSUNIT[c]);
    const share = (y, item, cols) => { const a = agg(y, item), t = sum(a); return r1(sum(cols.map((i) => a[i])) / t * 100); };
    const yl = years[years.length - 1];
    {
      const cu = Q5.map((c) => XQ.years[yl].CONSUNIT[c]), avg = sum(agg(yl, 'TOTALEXP')) / sum(cu), all = XQ.years[yl].TOTALEXP['01'];
      tie('CE quintiles', `${yl}: the five quintile averages, weighted by consumer units, give the all-units average`, avg, all, all * 0.01, true);
      must('CE quintiles', `the quintile history ends in the survey year of the decile tables (${X ? X.year : 'n/a'})`, !X || yl === X.year, true);
    }
    K.spend = { asOf: String(yl), years, top20: years.map((y) => share(y, 'TOTALEXP', [4])), mid60: years.map((y) => share(y, 'TOTALEXP', [1, 2, 3])), bottom20: years.map((y) => share(y, 'TOTALEXP', [0])),
      incTop20: years.map((y) => share(y, 'INCBEFTX', [4])), incBottom20: years.map((y) => share(y, 'INCBEFTX', [0])),
      ratio: years.map((y) => r2(XQ.years[y].TOTALEXP['06'] / XQ.years[y].TOTALEXP['02'])) };
    src('cexHist', { name: XQ.source.name, url: XQ.source.url, asOf: String(yl) });
  }
  // the top decile's share of spending, and spending growth by decile since 2019 (nominal and at constant prices)
  if (X && X.cuts && X.cuts.deciles) {
    const DY = X.cuts.deciles.years, ys = Object.keys(DY).map(Number).sort((a, b) => a - b).filter((y) => DY[y].TOTALEXP && DY[y].CONSUNIT);
    const D10 = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
    const aggD = (y) => D10.map((c) => DY[y].TOTALEXP[c] * DY[y].CONSUNIT[c]);
    K.spendDeciles = { years: ys, top10: ys.map((y) => { const a = aggD(y); return r1(a[9] / sum(a) * 100); }), top20: ys.map((y) => { const a = aggD(y); return r1((a[8] + a[9]) / sum(a) * 100); }), bottom50: ys.map((y) => { const a = aggD(y); return r1(sum(a.slice(0, 5)) / sum(a) * 100); }) };
    if (K.spend) { const i = K.spend.years.indexOf(X.year), j = ys.indexOf(X.year); if (i >= 0 && j >= 0) tie('CE', `${X.year}: the top two deciles and the top quintile hold the same share of spending`, K.spendDeciles.top20[j], K.spend.top20[i], 0.6, true); }
    const y0 = ys.includes(2019) ? 2019 : ys[0], y1 = X.year, p0 = priceYear(y0), p1 = priceYear(y1);
    if (y0 < y1) {
      const infl = p0 && p1 ? p1 / p0 : null;
      K.spendGrowth = { from: y0, to: y1, prices: infl ? r1((infl - 1) * 100) : null,
        deciles: D10.map((c, i) => { const g = DY[y1].TOTALEXP[c] / DY[y0].TOTALEXP[c]; return { d: i + 1, nominal: r1((g - 1) * 100), real: infl ? r1((g / infl - 1) * 100) : null, usd0: DY[y0].TOTALEXP[c], usd1: DY[y1].TOTALEXP[c] }; }),
        all: (() => { const g = DY[y1].TOTALEXP['01'] / DY[y0].TOTALEXP['01']; return { nominal: r1((g - 1) * 100), real: infl ? r1((g / infl - 1) * 100) : null }; })() };
    }
  }

  // (2) BEA, Distribution of Personal Income: shares by decile of households ranked by equivalized income
  const BD = raw.beaDist;
  if (BD) {
    const pick = (concept, re) => { const k = Object.keys(BD.rankings).find((r) => re.test(r) && BD.rankings[r][concept] && BD.rankings[r][concept]['90-100%']); return k ? { ranking: k, q: BD.rankings[k][concept] } : null; };
    const DEC = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];
    const mk = (sel) => {
      if (!sel) return null;
      const years = Object.keys(sel.q['90-100%']).map(Number).sort((a, b) => a - b).filter((y) => DEC.every((d) => sel.q[d] && sel.q[d][y] != null));
      const s = (y, list) => r1(sum(list.map((d) => sel.q[d][y])) * 100);
      const opt = (name) => (sel.q[name] ? years.map((y) => (sel.q[name][y] == null ? null : r1(sel.q[name][y] * 100))) : null);
      return { ranking: sel.ranking, years, top10: years.map((y) => s(y, ['90-100%'])), next40: years.map((y) => s(y, DEC.slice(5, 9))), bottom50: years.map((y) => s(y, DEC.slice(0, 5))), top20: years.map((y) => s(y, DEC.slice(8))), top1: opt('Top 1%'), top5: opt('Top 5%') };
    };
    const pi = mk(pick('pi', /^Equivalized Personal Income$/i) || pick('pi', /Personal Income/i)), dpi = mk(pick('dpi', /^Equivalized Disposable Personal Income$/i) || pick('dpi', /Disposable/i));
    if (pi || dpi) {
      const ref = pi || dpi, yl = ref.years[ref.years.length - 1], i = ref.years.length - 1;
      tie('BEA distribution', `${yl}: top 10%, next 40% and bottom 50% add up to all personal income`, ref.top10[i] + ref.next40[i] + ref.bottom50[i], 100, 0.6);
      K.income = { asOf: String(yl), pi, dpi };
      src('beaDist', { name: BD.source.name, url: BD.source.url, asOf: String(yl), published: BD.lastModified });
    }
  }

  // (3) Federal Reserve DFA: what the top 10% by wealth hold, and how each group's net worth changed since the end of 2019
  if (W) {
    const t = W.dims.networth, qs = t.quarters, q = W.latest, G = t.categories;
    const TOP10 = ['TopPt1', 'RemainingTop1', 'Next9'], TOP1 = ['TopPt1', 'RemainingTop1'];
    const shareOf = (qq, field, groups) => { const tot = sum(G.map((k) => t.series[k][qq][field])); return r1(sum(groups.map((k) => t.series[k][qq][field])) / tot * 100); };
    const base = qs.includes('2019-Q4') ? '2019-Q4' : null;
    const p0 = base ? priceQuarter(base) : null, p1 = priceQuarter(q) || (pcepi ? lastOf(pcepi)[1] : null), infl = p0 && p1 ? p1 / p0 : null;
    const sets = [['top1', TOP1], ['next9', ['Next9']], ['next40', ['Next40']], ['bottom50', ['Bottom50']]];
    K.wealth = { asOf: q, quarters: qs, eqTop10: qs.map((qq) => shareOf(qq, 'equities', TOP10)), eqTop1: qs.map((qq) => shareOf(qq, 'equities', TOP1)), eqBottom50: qs.map((qq) => shareOf(qq, 'equities', ['Bottom50'])),
      nwTop10: qs.map((qq) => shareOf(qq, 'nw', TOP10)), nwBottom50: qs.map((qq) => shareOf(qq, 'nw', ['Bottom50'])),
      base, prices: infl ? r1((infl - 1) * 100) : null,
      groups: base ? sets.map(([k, ks]) => {
        const v = (qq, f) => sum(ks.map((x) => t.series[x][qq][f] || 0)); const nw0 = v(base, 'nw'), nw1 = v(q, 'nw'), eq1 = v(q, 'equities'), re1 = v(q, 're'), as1 = v(q, 'assets'), hh0 = v(base, 'households'), hh1 = v(q, 'households');
        return { k, nw0: r1(nw0 / 1000), nw1: r1(nw1 / 1000), gain: r1((nw1 - nw0) / 1000), nominal: r1((nw1 / nw0 - 1) * 100), real: infl ? r1((nw1 / nw0 / infl - 1) * 100) : null,
          perHh0: hh0 ? r0(nw0 * 1e6 / hh0) : null, perHh1: hh1 ? r0(nw1 * 1e6 / hh1) : null, equitiesShareOfAssets: r1(eq1 / as1 * 100), realEstateShareOfAssets: r1(re1 / as1 * 100) };
      }) : null };
    if (K.wealth.groups) tie('DFA', `${q}: the four wealth groups of the K-shaped block add up to household net worth`, sum(K.wealth.groups.map((g) => g.nw1)), D.wealth.total, 1);
    // the same holdings by income: the top fifth of households by income
    const ti = W.dims.income, TI = ti.categories.filter((k) => /^pct(80to99|99to100)$/.test(k));
    if (TI.length === 2) { const sh = (f) => r1(sum(TI.map((k) => ti.series[k][q][f])) / sum(ti.categories.map((k) => ti.series[k][q][f])) * 100); K.wealth.byIncomeTop20 = { nw: sh('nw'), equities: sh('equities'), re: sh('re'), deposits: null }; }
  }

  // (4) Atlanta Fed Wage Growth Tracker by wage quartile (12-month moving average of median wage growth), through FRED
  const WQ = { q1: 'FRBATLWGT12MMUMHWGWD1WP', q2: 'FRBATLWGT12MMUMHWGWD26WP', q3: 'FRBATLWGT12MMUMHWGWD51WP', q4: 'FRBATLWGT12MMUMHWGWD76WP' };
  if (Object.values(WQ).every((id) => fs(id))) {
    const months = fs(WQ.q1).map((o) => o[0].slice(0, 7)); const m = (id) => { const mm = {}; for (const o of fs(id)) mm[o[0].slice(0, 7)] = o[1]; return months.map((x) => (mm[x] == null ? null : mm[x])); };
    K.wages = { asOf: months[months.length - 1], months, q1: m(WQ.q1), q2: m(WQ.q2), q3: m(WQ.q3), q4: m(WQ.q4) };
    src('atlWages', { name: 'Federal Reserve Bank of Atlanta, Wage Growth Tracker (by wage quartile), series read through FRED', url: 'https://www.atlantafed.org/chcs/wage-growth-tracker', asOf: K.wages.asOf, via: 'FRED' });
  }

  // (5) University of Michigan: consumer sentiment within income terciles
  const U = raw.umich;
  if (U && U.rows && U.rows.length) {
    const rows = U.rows.filter((r) => r[0] >= '2000-01');
    must('Michigan', 'sentiment by income tercile: every month has the three terciles', rows.every((r) => r[1] != null && r[2] != null && r[3] != null), true);
    K.sentiment = { asOf: rows[rows.length - 1][0], months: rows.map((r) => r[0]), lower: rows.map((r) => r[1]), middle: rows.map((r) => r[2]), upper: rows.map((r) => r[3]) };
    src('umich', { name: U.source.name, url: U.source.url, asOf: K.sentiment.asOf });
  }

  // (5b) BLS distribution of personal consumption expenditures (experimental): the survey scaled to the consumption of
  // the national accounts, by decile of households ranked by their spending (not by income, as in the survey tables)
  const PD = raw.pceDist;
  if (PD && PD.years && PD.years.length) {
    const ys = PD.years;
    must('BLS PCE distribution', 'the ten deciles add to 100% every year', ys.every((r) => Math.abs(sum(r.deciles) - 1) <= 0.01));
    must('BLS PCE distribution', 'the top decile spends more than any other every year', ys.every((r) => r.deciles[9] === Math.max(...r.deciles)));
    K.pceDist = { asOf: String(ys[ys.length - 1].year), version: PD.version || null, years: ys.map((r) => r.year), top10: ys.map((r) => r1(r.deciles[9] * 100)), top20: ys.map((r) => r1((r.deciles[8] + r.deciles[9]) * 100)), bottom50: ys.map((r) => r1(sum(r.deciles.slice(0, 5)) * 100)) };
    src('pceDist', { name: PD.source.name, url: PD.source.url, asOf: K.pceDist.asOf });
  }

  // (5c) price indexes by decile of spending (same BLS workbook): whose prices rose more
  if (PD && PD.prices && PD.prices.all && PD.prices.deciles.length === 10) {
    const P = PD.prices, i19 = P.years.indexOf(2019), n = P.years.length - 1;
    const since = (arr, i0) => (i0 >= 0 && arr[i0] ? r1((arr[n] / arr[i0] - 1) * 100) : null);
    K.prices = { asOf: String(P.years[n]), years: P.years, all: P.all.map(r1), bottom: P.deciles[0].map(r1), middle: P.deciles[4].map(r1), top: P.deciles[9].map(r1), base: 2019,
      since2019: { all: since(P.all, i19), deciles: P.deciles.map((d) => since(d, i19)) }, since2000: { all: since(P.all, 0), deciles: P.deciles.map((d) => since(d, 0)) }, from: P.years[0] };
    must('BLS PCE distribution', 'decile price indexes equal 100 in the base year 2017', P.deciles.every((d) => Math.abs(d[P.years.indexOf(2017)] - 100) < 0.01));
  }
  // (5d) BEA and BLS joint distribution: households ranked by INCOME; shares of national-accounts consumption and of
  // disposable income by decile, and each decile's saving rate (negative = spends more than its disposable income)
  const JD = raw.jointDist;
  if (JD && JD.years && JD.years.length) {
    const DEC = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];
    const ys = JD.years, yl = ys[ys.length - 1], rates = JD.rates || [], rl = rates[rates.length - 1];
    const p = (v) => (v == null ? null : r1(v * 100));
    K.byIncome = { asOf: String(yl.year), years: ys.map((o) => o.year), pceTop10: ys.map((o) => p(o.pce['90-100%'])), pceTop20: ys.map((o) => p(o.pce['90-100%'] + o.pce['80-90%'])), pceBottom50: ys.map((o) => p(sum(DEC.slice(0, 5).map((d) => o.pce[d])))),
      dpiTop10: ys.map((o) => p(o.dpi['90-100%'])), dpiBottom50: ys.map((o) => p(sum(DEC.slice(0, 5).map((d) => o.dpi[d])))),
      latest: { pce: DEC.map((d) => p(yl.pce[d])), dpi: DEC.map((d) => p(yl.dpi[d])), pceTop1: p(yl.pce['Top 1%']), dpiTop1: p(yl.dpi['Top 1%']) },
      saving: rl ? { year: rl.year, deciles: DEC.map((d) => p(rl[d])), top1: p(rl['Top 1%']), top5: p(rl['Top 5%']), years: rates.map((r) => r.year), bottom20: rates.map((r) => p(r['0-20%'])), middle20: rates.map((r) => p(r['40-60%'])), top20: rates.map((r) => p(r['80-100%'])), top10: rates.map((r) => p(r['90-100%'])) } : null };
    must('BEA-BLS joint distribution', 'the top income decile has a larger share of income than of consumption', last(K.byIncome.dpiTop10) > last(K.byIncome.pceTop10));
    if (K.byIncome.saving) must('BEA-BLS joint distribution', 'the saving rate rises from the bottom decile to the top', K.byIncome.saving.deciles[0] < K.byIncome.saving.deciles[9]);
    src('jointDist', { name: JD.source.name, url: JD.source.url, asOf: K.byIncome.asOf });
  }

  // (6) estimates published by others (curated, dated and linked): never mixed with the official series above
  const KE = readJson(TOOLS + 'data/kshape.json');
  if (KE && KE.estimates && KE.estimates.length) {
    const both = (o) => o && typeof o.en === 'string' && o.en && typeof o.es === 'string' && o.es;
    const dated = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
    const good = KE.estimates.filter((e) => e.id && ['private', 'fed', 'official'].includes(e.kind) && both(e.label) && both(e.period) && Number.isFinite(e.v) && e.publisher && /^https:\/\//.test(e.url || '') && dated(e.published)
      && (!e.headline || both(e.short)) && (!e.measure || both(e.measureLabel)) && (!e.note || both(e.note)) && (!e.via || both(e.via)));
    must('K estimates', 'every curated estimate has its kind, labels in both languages, figure, period, publisher, link and date', good.length === KE.estimates.length);
    must('K estimates', 'one headline estimate at most', good.filter((e) => e.headline).length <= 1);
    const quotes = (KE.quotes || []).filter((q) => q.text && q.by && both(q.role) && q.source && /^https:\/\//.test(q.url || '') && dated(q.date));
    must('K estimates', 'every quote has its author, role, source, link and date', quotes.length === (KE.quotes || []).length);
    if (good.length) K.estimates = { reviewed: KE.reviewed, list: good.map(({ id, ...e }) => e), quotes };
  }
  if (Object.keys(K).length) D.kshape = K;
}

// ------------------------------------------------------------------------------------------------------------------
// Gig work in the United States: Census Nonemployer Statistics (businesses with no paid employees, here almost all of
// them one self-employed person) in taxi and limousine service (ride-hailing drivers are classified there) and couriers
// and messengers (app-based delivery). The only official count that is U.S.-only; the platforms report worldwide.
// ------------------------------------------------------------------------------------------------------------------
const NE = raw.nes;
if (NE && NE.years && NE.years.length) {
  const ys = NE.years.filter((r) => r.taxi && r.courier).sort((a, b) => a.year - b.year);
  const okNum = must('NES', 'every year has a positive count and receipts for both industries', ys.every((r) => r.taxi.estab > 0 && r.courier.estab > 0 && r.taxi.receipts > 0 && r.courier.receipts > 0));
  must('NES', 'the years are consecutive', ys.every((r, i) => !i || r.year === ys[i - 1].year + 1), true);
  must('NES', 'industry titles are taxi and limousine service / couriers and messengers', ys.every((r) => /taxi/i.test(r.taxi.label) && /courier/i.test(r.courier.label)));
  // average receipts of a self-employed driver or courier stay within what one person can bill in a year
  must('NES', 'average receipts per business are between $5,000 and $80,000', ys.every((r) => [r.taxi, r.courier].every((x) => x.receipts * 1000 / x.estab > 5000 && x.receipts * 1000 / x.estab < 80000)), true);
  if (okNum && ys.length >= 5) {
    const col = (f) => ys.map(f);
    D.gigUS = { asOf: String(ys[ys.length - 1].year), years: col((r) => r.year),
      taxi: col((r) => r.taxi.estab), courier: col((r) => r.courier.estab), total: col((r) => r.taxi.estab + r.courier.estab),
      taxiRcp: col((r) => r2(r.taxi.receipts / 1e6)), courierRcp: col((r) => r2(r.courier.receipts / 1e6)), totalRcp: col((r) => r2((r.taxi.receipts + r.courier.receipts) / 1e6)),   // $ billions (the file is in thousands of dollars)
      taxiAvg: col((r) => r0(r.taxi.receipts * 1000 / r.taxi.estab)), courierAvg: col((r) => r0(r.courier.receipts * 1000 / r.courier.estab)), totalAvg: col((r) => r0((r.taxi.receipts + r.courier.receipts) * 1000 / (r.taxi.estab + r.courier.estab))),   // dollars per business
      naics: { taxi: '4853', courier: '492' },
      notes: { calc: ['total', 'totalRcp', 'taxiAvg', 'courierAvg', 'totalAvg'] } };
    src('nes', { name: NE.source.name, url: NE.source.url, asOf: D.gigUS.asOf });
  }
}

// ------------------------------------------------------------------------------------------------------------------
const fails = checks.filter((c) => c.status === 'fail'), warns = checks.filter((c) => c.status === 'warn');
for (const c of fails) console.log(`::error::${c.tag}: ${c.check}${c.diff != null ? ` (diff ${c.diff}, tolerance ${c.tol})` : ''}`);
for (const c of warns.slice(0, 20)) console.log(`::warning::${c.tag}: ${c.check}${c.diff != null ? ` (diff ${c.diff}, tolerance ${c.tol})` : ''}${c.note ? ` (${c.note})` : ''}`);
const missing = ['demo', 'income', 'states', 'funds', 'cex', 'wealth', 'scf', 'debt', 'creditTerms'].filter((k) => !D[k]);
console.log(`tie-outs: ${checks.length} (${checks.length - fails.length - warns.length} ok, ${warns.length} warn, ${fails.length} fail); blocks missing: ${missing.join(', ') || 'none'}`);
if (!CHECK) {
  const log = { checks: checks.filter((c) => c.status !== 'ok'), counts: { ok: checks.length - fails.length - warns.length, warn: warns.length, fail: fails.length }, missing, sourceStatus: status.sources || {} };
  if (JSON.stringify(readJson(RAW + 'build-log.json')) !== JSON.stringify(log)) writeJson(RAW + 'build-log.json', log);
}
if (fails.length) process.exit(1);
if (!CHECK) {
  const HEAD = '// The American Consumer: data of the page, built from official sources (Census Bureau, BLS, BEA, Federal Reserve, New York Fed).\n';
  const prevText = readText(SITE + 'data/data.js');
  let prevGen = null, prevBody = null;
  if (prevText) { const m = /"generatedAt":"([^"]*)"/.exec(prevText.slice(0, 400)); prevGen = m ? m[1] : null; prevBody = prevText.replace(/"generatedAt":"[^"]*"/, '"generatedAt":null'); }
  const body = (gen) => `${HEAD}window.CONS_DATA = ${JSON.stringify({ ...D, generatedAt: gen })};\n`;
  if (prevBody && prevBody === body(null) && prevGen) console.log('data.js unchanged');
  else { writeText(SITE + 'data/data.js', body(nowIso())); console.log('data.js written'); }
}
