#!/usr/bin/env node
// Data of the American Consumer page (site/consumidor), fetched on GitHub's runner from the publishers:
//
//   census   U.S. Census Bureau, American Community Survey 1-year (latest vintage on the API): income, demographics, by state
//   cex      BLS Consumer Expenditure Surveys through the BLS public API: spending and income by income decile, age, tenure
//   dfa      Federal Reserve, Distributional Financial Accounts (quarterly CSV package): wealth by group
//   scf      Federal Reserve, Survey of Consumer Finances (triennial chartbook CSV package): medians, means, ownership
//   nyfed    New York Fed, Quarterly Report on Household Debt and Credit (workbook): debt by product and age, delinquency
//   nyfedStates  New York Fed, State Level Household Debt Statistics (workbook): per-capita balances and delinquency
//   cexHist  BLS Consumer Expenditure Surveys by income quintile since 1984 (who does the spending, the long view)
//   beaDist  BEA, Distribution of Personal Income (summary file): shares of personal and disposable income by decile
//   umich    University of Michigan, Surveys of Consumers: index of consumer sentiment within income terciles
//   nes      Census Bureau, Nonemployer Statistics: self-employed establishments in ride-hailing and delivery industries
//   pceDist  BLS, Distribution of Personal Consumption Expenditures (experimental): shares of consumption by decile of spenders
//   jointDist  BEA and BLS, joint distribution of income, consumption and saving (prototype): shares and saving rates by income decile
//   sce      New York Fed, Survey of Consumer Expectations and SCE Credit Access Survey: expected delinquency, credit access
//   shed     Federal Reserve Board, Survey of Household Economics and Decisionmaking: the yearly report's tables and figures
//   cfpbBnpl CFPB, study of buy now, pay later loans matched to credit records (January 2025)
//   fsa      Department of Education, Federal Student Aid: federal student loan portfolio by status and delinquency
//   courts   Administrative Office of the U.S. Courts, Table F-2: bankruptcy filings by chapter and district, 12-month periods
//   fred     FRED (St. Louis Fed) mirror of BEA's personal income and outlays tables and state accounts, the Board's
//            G.19, debt service ratios and bank delinquency series, Census' CPS household income
//
//   node scripts/consumidor/fetch.mjs [--only=census,dfa] [--force]
//
// Each source writes tools/consumidor/raw/<source>.json = { fetchedAt, data }, rewritten only when the data changed, so a
// quiet run commits nothing. A source that fails keeps its stored file; failures are counted in raw/status.json (the
// workflow opens a SOURCE DOWN issue after three in a row). Every series is checked against its published title before
// it is accepted, so a wrong id never reaches the page. API keys come from the environment and are removed from
// everything written.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAW, readJson, writeJson, get, getJson, getText, getBuffer, secret, redact, sleep, nowIso, num, htmlToText, decodeEntities, BOT_UA } from './lib/common.mjs';
import { parseCsv } from './lib/csv.mjs';
import { STATES, BY_FIPS } from './lib/states.mjs';
import { parseDfa, parseScf, parseHhdcSheet } from './lib/parsers.mjs';
import { openXlsx } from './lib/xlsx-read.mjs';
import { openXls } from './lib/xls-read.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const tmp = mkdtempSync(join(tmpdir(), 'consumidor-'));
const unzipText = (zip, name) => execFileSync('unzip', ['-p', zip, name], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const pad3 = (n) => String(n).padStart(3, '0');
const SKIP = Symbol('unchanged');   // a source whose publisher shows nothing new: the stored file stands
// A session cannot read a run's log, so what a source wants to say is kept with its status (raw/status.json).
let NOTES = [];
const note = (msg) => { NOTES.push(redact(String(msg)).slice(0, 400)); console.log(`::warning::${redact(String(msg))}`); };
// Last-Modified of a file, or null when the host does not answer HEAD
async function lastModifiedOf(url, opts = {}) { try { const r = await get(url, { method: 'HEAD', tries: 1, timeoutMs: 30_000, ...opts }); return r.headers.get('last-modified') || null; } catch { return null; } }

// ------------------------------------------------------------------------------------------------------------------
// Census Bureau · ACS 1-year
// ------------------------------------------------------------------------------------------------------------------
// label checks (the API's own variable labels, "Estimate!!" removed); every requested variable must exist in its group
const ACS_LABELS = {
  B01003_001E: /^Total$/, B01002_001E: /^Median age --!!Total:?$/,
  B01001_003E: /Male:!!Under 5 years$/, B01001_025E: /Male:!!85 years and over$/, B01001_027E: /Female:!!Under 5 years$/, B01001_049E: /Female:!!85 years and over$/,
  B01001_011E: /Male:!!25 to 29 years$/, B01001_017E: /Male:!!55 to 59 years$/, B01001_020E: /Male:!!65 and 66 years$/,
  B03002_003E: /Not Hispanic or Latino:!!White alone$/, B03002_004E: /Not Hispanic or Latino:!!Black or African American alone$/, B03002_005E: /American Indian and Alaska Native alone$/,
  B03002_006E: /Not Hispanic or Latino:!!Asian alone$/, B03002_007E: /Native Hawaiian and Other Pacific Islander alone$/, B03002_008E: /Not Hispanic or Latino:!!Some other race alone$/,
  B03002_009E: /Not Hispanic or Latino:!!Two or more races:?$/, B03002_012E: /^Total:!!Hispanic or Latino:?$/,
  B05002_013E: /^Total:!!Foreign[- ]born:?$/,
  B11001_002E: /Family households:?$/, B11001_003E: /Married-couple family$/, B11001_007E: /Nonfamily households:?$/, B11001_008E: /Householder living alone$/,
  B25010_001E: /^Average household size --!!Total:?$/, B25003_002E: /Owner occupied$/, B25003_003E: /Renter occupied$/,
  B25007_002E: /^Total:!!Owner occupied:?$/, B25007_003E: /Owner occupied:!!Householder 15 to 24 years$/, B25007_011E: /Owner occupied:!!Householder 85 years and over$/,
  B25007_012E: /^Total:!!Renter occupied:?$/, B25007_013E: /Renter occupied:!!Householder 15 to 24 years$/, B25007_021E: /Renter occupied:!!Householder 85 years and over$/,
  B15003_017E: /Regular high school diploma$/, B15003_018E: /GED or alternative credential$/, B15003_021E: /Associate's degree$/, B15003_022E: /Bachelor's degree$/, B15003_023E: /Master's degree$/, B15003_024E: /Professional school degree$/, B15003_025E: /Doctorate degree$/,
  B17001_002E: /Income in the past 12 months below poverty level:?$/,
  B19013_001E: /^Median household income in the past 12 months/, B19025_001E: /^Aggregate household income in the past 12 months/, B19301_001E: /^Per capita income in the past 12 months/, B19083_001E: /^Gini Index$/,
  B19080_001E: /Quintile Upper Limits:!!Lowest Quintile$/, B19080_004E: /Quintile Upper Limits:!!Fourth Quintile$/, B19080_005E: /^Lower Limit of Top 5 Percent$/,
  B19081_001E: /Quintile Means:!!Lowest Quintile$/, B19081_005E: /Quintile Means:!!Highest Quintile$/, B19081_006E: /^Top 5 Percent$/,
  B19082_001E: /Quintile Share of Aggregate Income:!!Lowest Quintile$/, B19082_005E: /Quintile Share of Aggregate Income:!!Highest Quintile$/, B19082_006E: /^Top 5 Percent$/,
  B19001_002E: /Less than \$10,000$/, B19001_011E: /\$50,000 to \$59,999$/, B19001_013E: /\$75,000 to \$99,999$/, B19001_017E: /\$200,000 or more$/,
  B19049_002E: /Householder under 25 years$/, B19049_003E: /Householder 25 to 44 years$/, B19049_004E: /Householder 45 to 64 years$/, B19049_005E: /Householder 65 years and over$/,
  B25119_002E: /Owner occupied/, B25119_003E: /Renter occupied/,
  B20004_002E: /^Total:!!Less than high school graduate$/, B20004_003E: /^Total:!!High school graduate/, B20004_004E: /^Total:!!Some college or associate's degree$/, B20004_005E: /^Total:!!Bachelor's degree$/, B20004_006E: /^Total:!!Graduate or professional degree$/,
  B19051_002E: /With earnings$/, B19052_002E: /With wage or salary income$/, B19053_002E: /With self-employment income$/, B19054_002E: /With interest, dividends, or net rental income$/,
  B19055_002E: /With Social Security income$/, B19056_002E: /With Supplemental Security Income/, B19057_002E: /With public assistance income$/, B19058_002E: /With cash public assistance or Food Stamps\/SNAP$/,
  B19059_002E: /With retirement income$/, B19060_002E: /With other types of income$/,
  B19061_001E: /^Aggregate earnings/, B19062_001E: /^Aggregate wage or salary income/, B19063_001E: /^Aggregate self-employment income/, B19064_001E: /^Aggregate interest, dividends, or net rental income/,
  B19065_001E: /^Aggregate Social Security income/, B19066_001E: /^Aggregate Supplemental Security Income/, B19067_001E: /^Aggregate public assistance income/, B19069_001E: /^Aggregate retirement income/, B19070_001E: /^Aggregate other types of income/,
  B25064_001E: /^Median gross rent$/, B25071_001E: /^Median gross rent as a percentage of household income$/, B25077_001E: /^Median value \(dollars\)$/,
  B25070_007E: /30\.0 to 34\.9 percent$/, B25070_008E: /35\.0 to 39\.9 percent$/, B25070_009E: /40\.0 to 49\.9 percent$/, B25070_010E: /50\.0 percent or more$/, B25070_011E: /Not computed$/,
};
// median household income by race and Hispanic origin of the householder: table iterations, checked on the table's concept
const ACS_RACE = { A: /White Alone Householder/i, B: /Black or African American Alone Householder/i, C: /American Indian and Alaska Native Alone Householder/i, D: /Asian Alone Householder/i, E: /Native Hawaiian and Other Pacific Islander Alone Householder/i, F: /Some Other Race Alone Householder/i, G: /Two or More Races Householder/i, H: /White Alone, Not Hispanic or Latino Householder/i, I: /Hispanic or Latino Householder/i };
const ids = (g, list) => list.map((n) => `${g}_${pad3(n)}E`);
const ACS_NAT = [
  'B01003_001E', 'B01002_001E', ...ids('B01001', [...range(3, 25), ...range(27, 49)]),
  ...ids('B03002', [1, 3, 4, 5, 6, 7, 8, 9, 12]), ...ids('B05002', [1, 13]), ...ids('B11001', [1, 2, 3, 7, 8]), 'B25010_001E', ...ids('B25003', [1, 2, 3]),
  ...ids('B25007', range(1, 21)), ...ids('B15003', [1, ...range(17, 25)]), ...ids('B17001', [1, 2]),
  'B19013_001E', ...Object.keys(ACS_RACE).map((k) => `B19013${k}_001E`), 'B19025_001E', 'B19301_001E', 'B19083_001E',
  ...ids('B19080', range(1, 5)), ...ids('B19081', range(1, 6)), ...ids('B19082', range(1, 6)), ...ids('B19001', range(1, 17)), ...ids('B19049', range(1, 5)),
  ...ids('B25119', range(1, 3)), ...ids('B20004', range(1, 6)),
  ...['B19051', 'B19052', 'B19053', 'B19054', 'B19055', 'B19056', 'B19057', 'B19058', 'B19059', 'B19060'].flatMap((g) => ids(g, [1, 2])),
  ...['B19061', 'B19062', 'B19063', 'B19064', 'B19065', 'B19066', 'B19067', 'B19069', 'B19070'].map((g) => `${g}_001E`),
  'B25064_001E', 'B25071_001E', 'B25077_001E', ...ids('B25070', range(1, 11)),
];
const ACS_STATE = ['B01003_001E', 'B01002_001E', 'B11001_001E', 'B19013_001E', 'B19025_001E', 'B19301_001E', 'B19083_001E', 'B17001_001E', 'B17001_002E', 'B25003_001E', 'B25003_002E',
  'B15003_001E', 'B15003_022E', 'B15003_023E', 'B15003_024E', 'B15003_025E', 'B25064_001E', 'B25077_001E', 'B25071_001E', 'B05002_001E', 'B05002_013E', 'B19081_001E', 'B19081_005E', 'B19082_005E',
  'B25070_001E', 'B25070_007E', 'B25070_008E', 'B25070_009E', 'B25070_010E', 'B25070_011E'];   // gross rent as a share of household income: 30% or more, 50% or more, not computed
const censusNum = (v) => { const n = num(v); return n == null || n <= -666666 ? null : n; };   // negative sentinels = not available

async function fetchCensus(prev) {
  const key = secret('CENSUS_API_KEY');
  if (!key) throw new Error('CENSUS_API_KEY is not set');
  const base = (y, ds = '') => `https://api.census.gov/data/${y}/acs/acs1${ds}`;
  const Y = new Date().getUTCFullYear();
  let year = null;
  for (const y of [Y - 1, Y - 2, Y - 3]) {
    try { const r = await getJson(`${base(y)}?get=NAME,B01003_001E&for=us:1&key=${key}`, { tries: 2 }); if (Array.isArray(r) && r.length === 2) { year = y; break; } }
    catch (e) { if (e.status !== 404 && e.status !== 400) throw e; }
  }
  if (!year) throw new Error('no ACS 1-year vintage answered for the last three years');
  if (prev && prev.year === year && prev.stateVars === ACS_STATE.length && prev.natVars === ACS_NAT.length && !FORCE) return SKIP;   // a longer variable list is read once

  // 1. labels of every variable, from the API's group files
  const groups = [...new Set([...ACS_NAT, ...ACS_STATE].map((v) => v.split('_')[0]))];
  const labels = {};
  for (const g of groups) {
    const j = await getJson(`${base(year)}/groups/${g}.json`);
    for (const [id, v] of Object.entries(j.variables || {})) if (/E$/.test(id)) labels[id] = { label: String(v.label || '').replace(/^Estimate!!/, ''), concept: String(v.concept || '') };
    await sleep(120);
  }
  const problems = [];
  for (const id of new Set([...ACS_NAT, ...ACS_STATE])) {
    if (!labels[id]) { problems.push(`${id}: not in the ${year} group file`); continue; }
    if (ACS_LABELS[id] && !ACS_LABELS[id].test(labels[id].label)) problems.push(`${id}: label "${labels[id].label}" does not match ${ACS_LABELS[id]}`);
  }
  for (const [k, re] of Object.entries(ACS_RACE)) { const l = labels[`B19013${k}_001E`]; if (l && !re.test(l.concept)) problems.push(`B19013${k}: concept "${l.concept}" does not match ${re}`); }
  if (problems.length) throw new Error(`ACS ${year} label check failed: ${problems.slice(0, 6).join(' | ')}${problems.length > 6 ? ` (+${problems.length - 6})` : ''}`);

  // 2. the nation and the states
  async function pull(vars, geo, ds = '') {
    const out = {};
    for (let i = 0; i < vars.length; i += 45) {
      const rows = await getJson(`${base(year, ds)}?get=NAME,${vars.slice(i, i + 45).join(',')}&for=${geo}&key=${key}`);
      const head = rows[0];
      for (const r of rows.slice(1)) {
        const geoId = geo.startsWith('us') ? 'US' : (BY_FIPS[r[head.indexOf('state')]] || {}).code;
        if (!geoId) continue;   // Puerto Rico
        out[geoId] = out[geoId] || {};
        head.forEach((h, c) => { if (/_\d+E$/.test(h)) out[geoId][h] = censusNum(r[c]); });
      }
      await sleep(150);
    }
    return out;
  }
  const us = (await pull(ACS_NAT, 'us:1')).US;
  const states = await pull(ACS_STATE, 'state:*');
  if (Object.keys(states).length !== 51) throw new Error(`ACS ${year}: ${Object.keys(states).length} states instead of 51`);
  // 3. the subject table's published median and mean household income (the mean is otherwise aggregate ÷ households)
  let subject = null;
  try {
    const sj = await getJson(`${base(year, '/subject')}/groups/S1901.json`);
    const lab = (id) => String(((sj.variables || {})[id] || {}).label || '');
    if (/Households!!Median income/.test(lab('S1901_C01_012E')) && /Households!!Mean income/.test(lab('S1901_C01_013E'))) {
      const sv = ['S1901_C01_012E', 'S1901_C01_013E'];
      subject = { US: (await pull(sv, 'us:1', '/subject')).US, ...(await pull(sv, 'state:*', '/subject')) };
    }
  } catch (e) { note(`ACS subject table S1901 not used: ${e.message}`); }
  return { year, stateVars: ACS_STATE.length, natVars: ACS_NAT.length, us, states, subject, labelsChecked: Object.keys(ACS_LABELS).length + Object.keys(ACS_RACE).length,
    source: { name: `U.S. Census Bureau, American Community Survey ${year} 1-year estimates`, url: `https://data.census.gov/table?q=B19013&y=${year}`, api: `https://api.census.gov/data/${year}/acs/acs1.html` } };
}

// ------------------------------------------------------------------------------------------------------------------
// BLS · Consumer Expenditure Surveys (public API v2)
// ------------------------------------------------------------------------------------------------------------------
// item code -> the item name the API's catalog must print (start of the series title)
const CEX_ITEMS = {
  TOTALEXP: /^Average annual expenditures/, FOODTOTL: /^Food by/, FOODHOME: /^Food at home/, FOODAWAY: /^Food away from home/, ALCBEVG: /^Alcoholic beverages/,
  HOUSING: /^Housing by/, SHELTER: /^Shelter/, OWNDWELL: /^Owned dwellings/, OTHLODGE: /^Other lodging/, UTILS: /^Utilities, fuels, and public services/, HHOPER: /^Household operations/,
  HKPGSUPP: /^Housekeeping supplies/, HHFURNSH: /^Household furnishings and equipment/, APPAREL: /^Apparel and services/,
  TRANS: /^Transportation by/, VEHPURCH: /^Vehicle purchases/, VEHOTHXP: /^Other vehicle expenses/, PUBTRANS: /^Public and other transportation/,
  HEALTH: /^Healthcare/, HLTHINSR: /^Health insurance/, MEDSERVS: /^Medical services/, DRUGS: /^Drugs/, MEDSUPPL: /^Medical supplies/,
  ENTRTAIN: /^Entertainment/, PERSCARE: /^Personal care products and services/, READING: /^Reading/, EDUCATN: /^Education/, TOBACCO: /^Tobacco products/,
  MISC: /^Miscellaneous/, CASHCONT: /^Cash contributions/, INSPENSN: /^Personal insurance and pensions/, LIFEINSR: /^Life and other personal insurance/, PENSIONS: /^Retirement, pensions, and Social Security/,
  INCBEFTX: /^Income before taxes/, INCAFTTX: /^Income after taxes/, 900000: /^Wages and salaries/, 900160: /^Self-employment income/, 900030: /^Social Security and railroad retirement income/,
  900170: /^Retirement, survivors, and disability income/, 900180: /^Interest and dividends/, 900190: /^Net room\/rental income/, 900200: /^Royalty, estate, and trust income/,
  900210: /^Other regular income/, 900090: /^Supplemental Security Income/, 900120: /^Public assistance/, 900150: /^Supplementa(ry|l) Nutrition Assistance Program/, 900140: /^Other income/,
  PERSTAX: /^Personal taxes/, CONSUNIT: /^Number of consumer units/, 980010: /^Number of People in CU/i, 980020: /^Age of reference person/, 980030: /^Number of Earners/i,
  980040: /^Vehicles \(owned\)/, 980050: /^Number of Children under 18/i, 980230: /^Percent Homeowner with mortgage/i, 980240: /^Percent Homeowner without mortgage/i, 980260: /^Percent Renter/i,
};
const CEX_MAIN = ['TOTALEXP', 'FOODHOME', 'FOODAWAY', 'ALCBEVG', 'HOUSING', 'SHELTER', 'UTILS', 'APPAREL', 'TRANS', 'VEHPURCH', 'HEALTH', 'ENTRTAIN', 'EDUCATN', 'CASHCONT', 'INSPENSN', 'INCBEFTX', 'CONSUNIT', '980020', '980010'];
// demographic tables: column code -> what the title must say after the colon
const CEX_CUTS = {
  deciles: { code: 'LB15', label: /by Income Deciles:/, items: Object.keys(CEX_ITEMS), cols: { '01': /All consumer units/i, '02': /Lowest 10 percent/i, '03': /Second 10 percent/i, '04': /Third 10 percent/i, '05': /Fourth 10 percent/i, '06': /Fifth 10 percent/i, '07': /Sixth 10 percent/i, '08': /Seventh 10 percent/i, '09': /Eighth 10 percent/i, '10': /Ninth 10 percent/i, '11': /Highest 10 percent/i } },
  age: { code: 'LB04', label: /by Age:/, items: CEX_MAIN, cols: { '01': /All consumer units/i, '02': /under (age )?25/i, '03': /25[- ](to )?34/i, '04': /35[- ](to )?44/i, '05': /45[- ](to )?54/i, '06': /55[- ](to )?64/i, '07': /65 (years )?(and|or) (older|over)/i, '08': /65[- ](to )?74/i, '09': /75 (years )?(and|or) (older|over)/i } },
  tenure: { code: 'LB17', label: /by Housing tenure:/, items: CEX_MAIN, cols: { '01': /All consumer units/i, '02': /home ?owner$/i, '03': /homeowner with mortgage/i, '04': /homeowner w\/o mortgage/i, '05': /renter/i } },
};
async function blsCall(seriesid, startyear, endyear, key) {
  const res = await get('https://api.bls.gov/publicAPI/v2/timeseries/data/', { method: 'POST', ua: BOT_UA, headers: { 'Content-Type': 'application/json' }, accept: 'application/json',
    body: JSON.stringify({ seriesid, startyear: String(startyear), endyear: String(endyear), catalog: true, registrationkey: key }) });
  const j = await res.json();
  await sleep(350);
  return j;
}
// One request of up to 50 series. The API rejects a whole request when one id in it is not a series it knows
// ("check your input parameters"), so a rejected request is split in halves until the ids it refuses stand alone;
// those are reported and the rest are kept.
async function blsBatch(seriesid, startyear, endyear, key, refused = []) {
  const j = await blsCall(seriesid, startyear, endyear, key);
  if (j.status === 'REQUEST_SUCCEEDED') return (j.Results && j.Results.series) || [];
  const msg = `${j.status} ${(j.message || []).join('; ').slice(0, 200)}`;
  if (/threshold|limit/i.test(msg)) throw new Error(`BLS API: ${msg}`);
  if (seriesid.length === 1) { refused.push(seriesid[0]); return []; }
  const mid = Math.ceil(seriesid.length / 2);
  return [...await blsBatch(seriesid.slice(0, mid), startyear, endyear, key, refused), ...await blsBatch(seriesid.slice(mid), startyear, endyear, key, refused)];
}
async function fetchCex(prev) {
  const key = secret('BLS_API_KEY');
  if (!key) throw new Error('BLS_API_KEY is not set');
  const Y = new Date().getUTCFullYear();
  // the latest survey year on the API
  const probe = await blsBatch(['CXUTOTALEXPLB1501M'], Y - 4, Y, key);
  const years = ((probe[0] || {}).data || []).map((d) => Number(d.year)).filter(Boolean);
  if (!years.length) throw new Error('BLS API returned no annual data for CXUTOTALEXPLB1501M');
  const year = Math.max(...years);
  if (prev && prev.year === year && !FORCE) return SKIP;
  const out = { year, cuts: {}, titles: {}, source: { name: `BLS, Consumer Expenditure Surveys ${year} (annual calendar-year tables, through the BLS public API)`, url: 'https://www.bls.gov/cex/tables.htm' } };
  for (const [cut, spec] of Object.entries(CEX_CUTS)) {
    const start = cut === 'deciles' ? Math.min(2019, year - 5) : year - 1;
    const want = [];
    for (const item of spec.items) for (const col of Object.keys(spec.cols)) want.push({ id: `CXU${item}${spec.code}${col}M`, item, col });
    const got = {}; const refused = [];
    for (let i = 0; i < want.length; i += 50) for (const s of await blsBatch(want.slice(i, i + 50).map((w) => w.id), start, year, key, refused)) got[s.seriesID] = s;
    if (refused.length) note(`CE ${cut}: the API refused ${refused.length} series id(s): ${refused.slice(0, 12).join(', ')}`);
    const table = {}; const problems = []; const bad = new Set();
    for (const w of want) {
      const s = got[w.id];
      const title = s && s.catalog ? String(s.catalog.series_title || '') : '';
      if (!title) { problems.push(`${w.id}: no catalog entry`); bad.add(w.item); continue; }
      const after = title.split(':').slice(1).join(':');
      if (!CEX_ITEMS[w.item].test(title) || !spec.label.test(title) || !spec.cols[w.col].test(after)) { problems.push(`${w.id}: "${title}"`); bad.add(w.item); continue; }
      if (w.col === '01') out.titles[`${cut}.${w.item}`] = title.replace(/ by [^:]+:.*$/, '');
      for (const d of s.data || []) {
        if (d.period !== 'A01') continue;
        const v = num(d.value);
        ((table[d.year] = table[d.year] || {})[w.item] = table[d.year][w.item] || {})[w.col] = v;
      }
    }
    // The deciles' main lines are the page's core table: a mismatch there stops the source. Any other line that fails is
    // left out (and said), and a demographic cut with a failed main line drops out on its own.
    if (problems.length) {
      const core = problems.filter((x) => CEX_MAIN.some((m) => x.startsWith(`CXU${m}${spec.code}`)));
      const msg = `CE ${cut}: ${problems.length} series failed the title check: ${problems.slice(0, 5).join(' | ')}`;
      if (core.length && cut === 'deciles') throw new Error(msg);
      note(msg);
      if (core.length) continue;
    }
    for (const y of Object.keys(table)) for (const item of bad) delete table[y][item];   // a line with a failed column is left out whole
    out.cuts[cut] = { columns: Object.keys(spec.cols).sort(), years: table };
  }
  if (!out.cuts.deciles || !out.cuts.deciles.years[year]) throw new Error(`CE ${year}: decile table missing`);
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// BLS · Consumer Expenditure Surveys by income quintile since 1984 (the long view of who does the spending)
// ------------------------------------------------------------------------------------------------------------------
const CEXQ_COLS = { '01': /All consumer units/i, '02': /Lowest 20 percent/i, '03': /Second 20 percent/i, '04': /Third 20 percent/i, '05': /Fourth 20 percent/i, '06': /Highest 20 percent/i };
const CEXQ_ITEMS = { TOTALEXP: /^Average annual expenditures/i, INCBEFTX: /^Income before taxes/i, CONSUNIT: /^Number of consumer units/i };
async function fetchCexHist(prev) {
  const key = secret('BLS_API_KEY');
  if (!key) throw new Error('BLS_API_KEY is not set');
  const cex = readJson(`${RAW}cex.json`);
  const year = cex && cex.data ? cex.data.year : null;   // the survey year the decile tables carry (read just before this source)
  if (!year) throw new Error('the decile tables (cex) have not been read yet');
  if (prev && prev.year === year && !FORCE) return SKIP;
  const ids = [];
  for (const item of Object.keys(CEXQ_ITEMS)) for (const col of Object.keys(CEXQ_COLS)) ids.push({ id: `CXU${item}LB01${col}M`, item, col });
  const out = { year, columns: Object.keys(CEXQ_COLS).sort(), years: {}, source: { name: `BLS, Consumer Expenditure Surveys 1984-${year} (annual tables by income quintile, through the BLS public API)`, url: 'https://www.bls.gov/cex/tables.htm' } };
  for (let start = 1984; start <= year; start += 20) {   // the API answers twenty years per request
    const refused = [];
    for (const s of await blsBatch(ids.map((x) => x.id), start, Math.min(year, start + 19), key, refused)) {
      const w = ids.find((x) => x.id === s.seriesID); if (!w) continue;
      const title = s.catalog ? String(s.catalog.series_title || '') : '';
      if (!CEXQ_ITEMS[w.item].test(title) || !/by Income Quintiles:/i.test(title) || !CEXQ_COLS[w.col].test(title.split(':').slice(1).join(':'))) throw new Error(`CE quintiles: ${w.id} is "${title}"`);
      for (const d of s.data || []) { if (d.period !== 'A01') continue; ((out.years[d.year] = out.years[d.year] || {})[w.item] = out.years[d.year][w.item] || {})[w.col] = num(d.value); }
    }
    if (refused.length) throw new Error(`CE quintiles: the API refused ${refused.join(', ')}`);
  }
  if (!out.years[year] || !out.years[year].TOTALEXP || out.years[year].TOTALEXP['06'] == null) throw new Error(`CE quintiles: ${year} is missing`);
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// BEA · Distribution of Personal Income (national summary file: shares by decile of equivalized income)
// ------------------------------------------------------------------------------------------------------------------
const BEA_DIST_CSV = 'https://apps.bea.gov/data/special-topics/distribution-of-personal-income/national/summary-file.csv';
const BEA_DIST_KEEP = { 'Personal income': 'pi', 'Disposable personal income': 'dpi' };
async function fetchBeaDist(prev) {
  const lastModified = await lastModifiedOf(BEA_DIST_CSV);
  if (prev && lastModified && prev.lastModified === lastModified && !FORCE) return SKIP;
  const rows = parseCsv(await getText(BEA_DIST_CSV));
  const head = rows[0].map((h) => h.trim());
  const col = (re) => { const i = head.findIndex((h) => re.test(h)); if (i < 0) throw new Error(`BEA distribution file: no column like ${re} (has ${head.join(' | ')})`); return i; };
  const iY = col(/^Year$/i), iR = col(/^Ranking$/i), iC = col(/^Income Concept$/i), iQ = col(/^Quantile or Summary Metric$/i), iV = col(/^Value$/i);
  const out = { lastModified, rankings: {}, source: { name: 'U.S. Bureau of Economic Analysis, Distribution of Personal Income', url: 'https://www.bea.gov/data/special-topics/distribution-of-personal-income', file: BEA_DIST_CSV } };
  for (const r of rows.slice(1)) {
    const concept = BEA_DIST_KEEP[(r[iC] || '').trim()]; const year = Number(r[iY]); const v = num(r[iV]); const rank = (r[iR] || '').trim(); const q = (r[iQ] || '').trim();
    if (!concept || !year || v == null || !rank || !q) continue;
    (((out.rankings[rank] = out.rankings[rank] || {})[concept] = out.rankings[rank][concept] || {})[q] = out.rankings[rank][concept][q] || {})[year] = v;
  }
  // the ten deciles of the latest year must add up to the whole, for each ranking and concept kept
  let checked = 0;
  for (const [rank, cs] of Object.entries(out.rankings)) for (const [c, qs] of Object.entries(cs)) {
    const dec = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];
    if (!dec.every((d) => qs[d])) continue;
    const y = Math.max(...Object.keys(qs['90-100%']).map(Number)); const sum = dec.reduce((a, d) => a + (qs[d][y] || 0), 0);
    if (Math.abs(sum - 1) > 0.02) throw new Error(`BEA distribution file: deciles of ${c} ranked by ${rank} add to ${sum.toFixed(3)} in ${y}`);
    checked++;
  }
  if (!checked) throw new Error('BEA distribution file: no ranking carries the ten deciles of personal or disposable income');
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// University of Michigan · Surveys of Consumers, Table 2: the Index of Consumer Sentiment within income terciles
// ------------------------------------------------------------------------------------------------------------------
const UMICH_URL = 'https://data.sca.isr.umich.edu/data-archive/mine.php';
async function fetchUmich() {
  const text = await getText(UMICH_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: UMICH_URL }, body: 'table=2&year=1980&qorm=M&order=asc&format=Comma-Separated+%28CSV%29' });
  if (!/Index of Consumer Sentiment Within Income Terciles/i.test(text) || !/Month,\s*Year,\s*Lower Third,\s*Middle Third,\s*Upper Third/i.test(text)) throw new Error(`Michigan survey: table 2 is not the sentiment index by income tercile (starts "${text.slice(0, 120).replace(/\s+/g, ' ')}")`);
  const rows = [];
  for (const l of text.split(/\r?\n/)) {
    const m = /^(\d{1,2}),(\d{4}),([\d.]+),([\d.]+),([\d.]+)/.exec(l.trim());
    if (m) rows.push([`${m[2]}-${('0' + m[1]).slice(-2)}`, num(m[3]), num(m[4]), num(m[5])]);
  }
  if (rows.length < 240) throw new Error(`Michigan survey: only ${rows.length} months in table 2`);
  return { table: 'Table 2: The Index of Consumer Sentiment Within Income Terciles', columns: ['lower', 'middle', 'upper'], rows,
    source: { name: 'University of Michigan, Surveys of Consumers', url: 'https://data.sca.isr.umich.edu/data-archive/mine.php' } };
}

// ------------------------------------------------------------------------------------------------------------------
// BLS · Distribution of Personal Consumption Expenditures (experimental): the Consumer Expenditure Surveys scaled to the
// consumption of the national accounts (it adds what the survey leaves out, such as health care paid by insurers and
// government and the rent imputed to homeowners), by decile of households RANKED BY THEIR SPENDING (equivalized), yearly
// since 2000. The workbook's name carries its years, so its link is read from the product's page. BLS answers this
// client's identified user agent (it refuses the browser one).
// ------------------------------------------------------------------------------------------------------------------
const PCE_DIST_PAGE = 'https://www.bls.gov/cex/pce-ce-distributions.htm';
async function fetchPceDist(prev) {
  const html = await getText(PCE_DIST_PAGE, { ua: BOT_UA, tries: 2 });
  const m = /href="([^"]*distributional-pce-[0-9-]+\.xlsx)"/i.exec(html);
  if (!m) throw new Error('BLS distribution of PCE: the page no longer links a distributional-pce workbook');
  const url = new URL(m[1], PCE_DIST_PAGE).href;
  const lm = await lastModifiedOf(url, { ua: BOT_UA });
  if (prev && prev.url === url && lm && prev.lastModified === lm && prev.parsed === 2 && !FORCE) return SKIP;
  const buf = await getBuffer(url, { ua: BOT_UA, tries: 2 });
  if (!(buf.length > 10000 && buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error('BLS distribution of PCE: the link did not return a workbook');
  const file = join(tmp, 'pce-dist.xlsx');
  writeFileSync(file, buf);
  const wb = openXlsx(file);
  const sheet = wb.sheets.find((n) => /^table1data$/i.test(n));
  if (!sheet) throw new Error(`BLS distribution of PCE: no table1data sheet (sheets: ${wb.sheets.join(', ')})`);
  const rows = wb.rows(sheet), h = rows[0].map((c) => String(c || '').trim().toLowerCase());
  const at = (n) => h.indexOf(n);
  const dcol = Array.from({ length: 10 }, (_, i) => at(`decile${i + 1}`));
  if (at('year') < 0 || at('lineno') < 0 || at('pce_title') < 0 || at('total') < 0 || dcol.some((c) => c < 0)) throw new Error(`BLS distribution of PCE: unexpected columns (${rows[0].join(', ')})`);
  const years = [];
  for (const r of rows.slice(1)) {
    if (num(r[at('lineno')]) !== 1) continue;
    if (!/^\s*personal consumption expenditures\s*$/i.test(String(r[at('pce_title')] || ''))) throw new Error(`BLS distribution of PCE: line 1 of ${r[at('year')]} is titled "${r[at('pce_title')]}"`);
    const dec = dcol.map((c) => num(r[c]));
    const sum = dec.reduce((a, v) => a + (v || 0), 0);
    if (dec.some((v) => v == null) || Math.abs(sum - 1) > 0.01) throw new Error(`BLS distribution of PCE: the deciles of ${r[at('year')]} add to ${sum.toFixed(4)}`);
    years.push({ year: num(r[at('year')]), total: num(r[at('total')]), deciles: dec });
  }
  years.sort((a, b) => a.year - b.year);
  if (years.length < 15) throw new Error(`BLS distribution of PCE: only ${years.length} years in table1data`);
  // Table 3: PCE price index, published and by decile of spending (2017 = 100); lines 1-11 (12-22 are the market-based ones)
  let prices = null;
  const t3 = wb.sheets.find((n) => /^table 3$/i.test(n.trim()));
  if (t3) {
    const r3 = wb.rows(t3), hi = r3.findIndex((r) => r && String(r[0]).trim() === 'Line' && String(r[1]).trim() === 'Series');
    if (hi >= 0 && /Price Indexes by decile/i.test(String((r3[0] || [])[0] || ''))) {
      const yrs = r3[hi].slice(2).map((c) => num(c));
      const line = (n, re) => { const r = r3.find((x) => x && num(x[0]) === n); if (!r || !re.test(String(r[1]).trim())) throw new Error(`BLS distribution of PCE: line ${n} of Table 3 is "${r ? r[1] : 'missing'}"`); return r.slice(2).map((c) => num(c)); };
      prices = { years: yrs, all: line(1, /^Personal consumption expenditures$/i), deciles: ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'].map((lab, i) => line(i + 2, new RegExp('^' + lab.replace('%', '%') + '$'))) };
    }
  }
  const desc = wb.sheets.find((n) => /description/i.test(n));
  const version = desc ? (wb.rows(desc).map((r) => String(r[0] || '')).find((t) => /^Version:/i.test(t)) || '').replace(/^Version:\s*/i, '') || null : null;
  return { url, lastModified: lm, version, parsed: 2, ranking: 'households ranked by equivalized personal consumption expenditures', years, prices,
    source: { name: 'BLS, Distribution of Personal Consumption Expenditures (experimental)', url: PCE_DIST_PAGE } };
}

// ------------------------------------------------------------------------------------------------------------------
// BEA and BLS · joint distribution of disposable personal income, personal consumption expenditures and personal saving
// (prototype): shares of the national-accounts totals by decile of households RANKED BY INCOME (equivalized disposable
// personal income), and the saving rate of each decile, yearly since 2000. The workbook is linked from BEA's page.
// ------------------------------------------------------------------------------------------------------------------
const BEA_DIST_PAGE = 'https://www.bea.gov/data/special-topics/distribution-of-personal-income';
const DECILES = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];
async function fetchJointDist(prev) {
  const html = await getText(BEA_DIST_PAGE, { tries: 2 });
  const m = /href="([^"]*joint_dist_summary[^"]*\.xlsx)"/i.exec(html);
  if (!m) throw new Error('BEA joint distribution: the page no longer links joint_dist_summary.xlsx');
  const url = new URL(m[1], BEA_DIST_PAGE).href;
  const lm = await lastModifiedOf(url);
  if (prev && prev.url === url && lm && prev.lastModified === lm && !FORCE) return SKIP;
  const buf = await getBuffer(url, { tries: 2 });
  if (!(buf.length > 10000 && buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error('BEA joint distribution: the link did not return a workbook');
  const file = join(tmp, 'joint-dist.xlsx');
  writeFileSync(file, buf);
  const wb = openXlsx(file);
  const sh = wb.sheets.find((n) => /shares of NIPA totals/i.test(n)), sr = wb.sheets.find((n) => /savings? rates/i.test(n));
  if (!sh || !sr) throw new Error(`BEA joint distribution: sheets not found (${wb.sheets.join(', ')})`);
  const rows = wb.rows(sh), h = rows[0].map((c) => String(c || '').trim());
  const at = (re) => h.findIndex((x) => re.test(x));
  const cY = at(/^Year$/i), cR = at(/^Ranking$/i), cS = at(/^Series$/i), cQ = at(/^Quantile/i), cV = at(/^Value$/i);
  if ([cY, cR, cS, cQ, cV].some((c) => c < 0)) throw new Error(`BEA joint distribution: unexpected columns (${h.join(', ')})`);
  const KEY = { 'Disposable Personal Income': 'dpi', 'Personal Consumption Expenditures': 'pce', 'Personal Saving': 'saving' };
  const byYear = {};
  for (const r of rows.slice(1)) {
    if (!/Equivalized Disposable Personal Income/i.test(String(r[cR] || ''))) continue;
    const k = KEY[String(r[cS] || '').trim()]; if (!k) continue;
    const y = num(r[cY]), q = String(r[cQ] || '').trim(), v = num(r[cV]);
    const o = (byYear[y] = byYear[y] || { year: y, dpi: {}, pce: {}, saving: {} });
    if (DECILES.includes(q) || /^Top (1|5)%$/.test(q) || /^Total \(\$ Billions\)$/.test(q)) o[k][q] = v;
  }
  const years = Object.values(byYear).sort((a, b) => a.year - b.year);
  if (years.length < 15) throw new Error(`BEA joint distribution: only ${years.length} years ranked by disposable income`);
  for (const o of years) for (const k of ['dpi', 'pce']) { const t = DECILES.reduce((a, d) => a + (o[k][d] || 0), 0); if (Math.abs(t - 1) > 0.02) throw new Error(`BEA joint distribution: ${k} deciles of ${o.year} add to ${t.toFixed(3)}`); }
  const rr = wb.rows(sr), rh = rr[0].map((c) => String(c || '').trim());
  if (rh[0] !== 'Year' || !DECILES.every((d) => rh.includes(d))) throw new Error(`BEA joint distribution: unexpected saving-rate columns (${rh.join(', ')})`);
  const rates = rr.slice(1).filter((r) => num(r[0]) > 1990).map((r) => ({ year: num(r[0]), ...Object.fromEntries(rh.slice(1).map((c, i) => [c, num(r[i + 1])])) }));
  return { url, lastModified: lm, ranking: 'households ranked by equivalized disposable personal income', years, rates,
    source: { name: 'BEA and BLS, joint distribution of disposable personal income, consumption and saving (prototype)', url: BEA_DIST_PAGE } };
}

// ------------------------------------------------------------------------------------------------------------------
// New York Fed · Survey of Consumer Expectations (monthly chart data): the probability households give to missing a
// minimum debt payment in the next three months (all and by age, education and income), how they see access to credit and
// their own finances; and the SCE Credit Access Survey (every four months): applications, rejections, discouraged
// borrowers, by credit score, age and income.
// ------------------------------------------------------------------------------------------------------------------
const SCE_URL = 'https://www.newyorkfed.org/medialibrary/interactives/sce/sce/downloads/data/frbny-sce-data.xlsx';
const SCE_CREDIT_URL = 'https://www.newyorkfed.org/medialibrary/interactives/sce/sce/downloads/data/frbny-sce-credit-access-data.xlsx';
const ym = (v) => { const n = num(v); return n && n > 190000 && n < 210000 ? `${Math.floor(n / 100)}-${String(n % 100).padStart(2, '0')}` : null; };
async function fetchSce(prev) {
  const lm = await lastModifiedOf(SCE_URL), lm2 = await lastModifiedOf(SCE_CREDIT_URL);
  if (prev && lm && lm2 && prev.lastModified === lm && prev.creditLastModified === lm2 && !FORCE) return SKIP;
  const book = async (url, name) => { const buf = await getBuffer(url, { tries: 2 }); if (!(buf.length > 10000 && buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error(`SCE: ${name} is not a workbook`); const f = join(tmp, name); writeFileSync(f, buf); return openXlsx(f); };
  const wb = await book(SCE_URL, 'sce.xlsx');
  const sheet = (n) => { if (!wb.sheets.includes(n)) throw new Error(`SCE: sheet "${n}" missing`); return wb.rows(n); };
  // a sheet = title rows, one header row (the row before the first data row), then [yyyymm, values…]
  const table = (n, titleRe) => {
    const rows = sheet(n); if (!rows.slice(0, 4).some((r) => r && r.some((c) => typeof c === 'string' && titleRe.test(c)))) throw new Error(`SCE: sheet "${n}" is not titled ${titleRe}`);
    const first = rows.findIndex((r) => r && ym(r[0])); if (first < 1) throw new Error(`SCE: no data rows in "${n}"`);
    return { head: rows[first - 1].map((c) => (c == null ? null : String(c).trim())), group: rows[first - 2] ? rows[first - 2].map((c) => (c == null ? null : String(c).trim())) : [], data: rows.slice(first).filter((r) => r && ym(r[0])).map((r) => [ym(r[0]), ...r.slice(1).map((c) => (num(c) == null ? null : Math.round(num(c) * 100) / 100))]) };
  };
  const dq = table('Delinquency expectations', /delinquency expectations/i), dqd = table('Delinquency expectations Demo', /delinquency expectations/i);
  if (!/missing minimum debt payment/i.test(dq.head[1] || '')) throw new Error(`SCE: delinquency series is headed "${dq.head[1]}"`);
  const ca = table('Credit availability', /credit availability/i), fs = table('Household financial situation', /financial situation/i);
  for (const t of [ca, fs]) if (!/year ago/i.test(t.group[1] || '') || !/year ahead/i.test(t.group[6] || '')) throw new Error('SCE: the year-ago / year-ahead blocks moved');
  const out = { lastModified: lm, creditLastModified: lm2,
    delinquency: { months: dq.data.map((r) => r[0]), all: dq.data.map((r) => r[1]), groups: dqd.head.slice(1), byGroup: dqd.head.slice(1).map((_, i) => dqd.data.map((r) => r[i + 1])), groupMonths: dqd.data.map((r) => r[0]) },
    creditAvailability: { months: ca.data.map((r) => r[0]), labels: ca.head.slice(1, 6), yearAgo: ca.data.map((r) => r.slice(1, 6)), yearAhead: ca.data.map((r) => r.slice(6, 11)) },
    finances: { months: fs.data.map((r) => r[0]), labels: fs.head.slice(1, 6), yearAgo: fs.data.map((r) => r.slice(1, 6)), yearAhead: fs.data.map((r) => r.slice(6, 11)) } };
  // Credit Access Survey: one row per wave and group
  const cw = await book(SCE_CREDIT_URL, 'sce-credit.xlsx');
  const COLS = { applied: 'Appliedforoneormoretypesofcredit', rejected: 'Rejectedfromoneormoresourcesofcredit_givenapplied', discouraged: 'Discouraged', accepted: 'Applied_Accepted', appliedRejected: 'Applied_Rejected',
    likelyApply: 'Likelyapplytooneormoresourcesofcredit_Cat_Contin', ccRejected: 'CCRejected', autoRejected: 'AutoLoanRejected', homeRejected: 'HomeLoanRejected', limitRejected: 'CCLimitRejected', refiRejected: 'RefiRejected',
    chanceCcRejected: 'ChanceCCApplicationWillBeRejected', chanceAutoRejected: 'ChanceAutoLoanApplicationWillBeRejected', chanceHomeRejected: 'ChanceMortgageApplicationWillBeRejected', lenderClosed: 'Lenderclosedatleastoneacct', chanceNeed: 'ChanceNeed', chanceComeUp: 'ChanceComeUp' };
  const access = [];
  for (const sn of ['overall', 'demographics']) {
    if (!cw.sheets.includes(sn)) throw new Error(`SCE Credit Access: sheet "${sn}" missing (${cw.sheets.join(', ')})`);
    const rows = cw.rows(sn), hi = rows.findIndex((r) => r && r[0] === 'date' && r[1] === 'group');
    if (hi < 0) throw new Error(`SCE Credit Access: no header row in "${sn}"`);
    const h = rows[hi].map((c) => String(c || '').trim());
    for (const need of ['applied', 'rejected', 'discouraged']) if (!h.includes(COLS[need])) throw new Error(`SCE Credit Access: column ${COLS[need]} missing in "${sn}"`);
    for (const r of rows.slice(hi + 1)) { const d = ym(r[0]); if (!d) continue; const o = { date: d, group: String(r[1] || '').trim(), category: String(r[2] || '').trim(), n: num(r[3]) }; for (const [k, c] of Object.entries(COLS)) { const i = h.indexOf(c); const v = i < 0 ? null : num(r[i]); o[k] = v == null ? null : Math.round(v * 100) / 100; } access.push(o); }
  }
  if (access.filter((o) => o.group === 'all').length < 20) throw new Error('SCE Credit Access: fewer than 20 waves');
  out.access = access;
  out.source = { name: 'Federal Reserve Bank of New York, Survey of Consumer Expectations and SCE Credit Access Survey', url: 'https://www.newyorkfed.org/microeconomics/sce', files: [SCE_URL, SCE_CREDIT_URL] };
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// Federal Reserve Board · Survey of Household Economics and Decisionmaking (SHED): the yearly report "Economic Well-Being
// of U.S. Households" (every table and accessible figure of its chapters, as published) and the Board's Consumer &
// Community Context notes built on it. The report's address changes every year: the newest one is read from the list.
// ------------------------------------------------------------------------------------------------------------------
const SHED_LIST = 'https://www.federalreserve.gov/publications/report-economic-well-being-us-households.htm';
// (the notes are listed in tools/consumidor/data/notes.json, kept by the page's daily scheduled task: a newer note is a line there, not code)
const SHED_NOTES = ((readJson('tools/consumidor/data/notes.json', { shed: [] }) || {}).shed || []).filter((n) => n && n.id && /^https:\/\/www\.federalreserve\.gov\//.test(n.url || ''));
// Every <table> of a Board web publication with the "Table N." / "Figure N." heading that precedes it (the accessible
// version of a figure is a table too). Cells are read from the markup: in these pages each cell sits on its own line.
function fedBlocks(html) {
  const clean = (x) => decodeEntities(String(x).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const out = [];
  for (const m of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const t = m[0];
    const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => clean(c[1]).slice(0, 200))).filter((r) => r.length && r.some((c) => c));
    if (rows.length < 2) continue;
    let title = clean((/<caption[^>]*>([\s\S]*?)<\/caption>/i.exec(t) || [])[1] || '');
    if (!/^(Table|Figure) /.test(title)) {
      const before = clean(html.slice(Math.max(0, m.index - 2500), m.index)); let at = -1;
      for (const h of before.matchAll(/(Table|Figure) [A-Z]?\.?\d+[a-z]?\. /g)) at = h.index;
      if (at >= 0) title = before.slice(at, at + 280);
    }
    if (!/^(Table|Figure) /.test(title)) continue;
    const after = clean(html.slice(m.index + t.length, m.index + t.length + 900));
    const note = (/(Note: .{0,500}?)(?= Source:| Return to text|$)/.exec(after) || [])[1] || null;
    out.push({ title: title.slice(0, 280), rows: rows.slice(0, 80), note: note ? note.slice(0, 500) : null });
  }
  return out;
}
async function fetchShed(prev) {
  const list = await getText(SHED_LIST, { tries: 2 });
  const reports = [...list.matchAll(/href="(\/publications\/(\d{4})-economic-well-being-of-us-households-in-(\d{4})-)executive-summary\.htm"/g)].map((m) => ({ base: m[1], pub: Number(m[2]), year: Number(m[3]) })).sort((a, b) => b.year - a.year);
  if (!reports.length) throw new Error('SHED: no report found in the list of publications');
  const R = reports[0], origin = 'https://www.federalreserve.gov';
  const execUrl = `${origin}${R.base}executive-summary.htm`;
  const lm = await lastModifiedOf(execUrl);
  if (prev && prev.year === R.year && prev.notes && prev.notes.map((n) => n.id).join() === SHED_NOTES.map((n) => n.id).join() && prev.parsed === 2 && !FORCE) return SKIP;
  const exec = await getText(execUrl, { tries: 2 });
  const chapters = [...new Set([...exec.matchAll(new RegExp(`href="(${R.base.replace(/[-/]/g, '\\$&')}[a-z0-9-]+\\.htm)"`, 'g'))].map((m) => m[1]))].filter((u) => !/acknowledgements|description/.test(u));
  if (chapters.length < 5) throw new Error(`SHED ${R.year}: only ${chapters.length} chapter pages linked from the summary`);
  const pages = []; const seen = new Set();
  const take = async (url, kind) => { if (seen.has(url)) return null; seen.add(url); const html = await getText(url, { tries: 2 }); await sleep(250); pages.push({ url, kind, blocks: fedBlocks(html) }); return html; };
  for (const c of chapters) {
    const html = await take(origin + c, 'chapter');
    for (const a of [...new Set([...(html || '').matchAll(/href="([^"]*accessib[^"]*\.htm)(#[^"]*)?"/gi)].map((m) => m[1]))].filter((u) => u.includes(R.base.split('/').pop())).slice(0, 3)) await take(new URL(a, origin + c).href, 'accessible');
  }
  // headline sentences of the executive summary (kept as text: the report states them in words)
  const summary = htmlToText(exec).split('\n').filter((l) => /percent/i.test(l) && l.length > 60 && l.length < 700);
  const notes = [];
  for (const n of SHED_NOTES) {
    try { const html = await getText(n.url, { tries: 2 }); notes.push({ id: n.id, url: n.url, title: n.title, blocks: fedBlocks(html) }); }
    catch (e) { const old = ((prev && prev.notes) || []).find((x) => x.id === n.id); if (old) notes.push(old); note(`Board note ${n.id} not read: ${e.message}`); }
    await sleep(250);
  }
  const nBlocks = pages.reduce((a, p) => a + p.blocks.length, 0);
  if (nBlocks < 5) throw new Error(`SHED ${R.year}: only ${nBlocks} tables and figures could be read from ${pages.length} pages`);
  note(`SHED ${R.year}: ${nBlocks} tables and figures read from ${pages.length} pages (${pages.filter((p) => p.kind === 'accessible').length} accessible-version pages)`);
  return { year: R.year, published: R.pub, parsed: 2, lastModified: lm, summary, pages, notes,
    source: { name: `Board of Governors of the Federal Reserve System, Economic Well-Being of U.S. Households in ${R.year} (Survey of Household Economics and Decisionmaking)`, url: execUrl } };
}

// ------------------------------------------------------------------------------------------------------------------
// CFPB · "Consumer Use of Buy Now, Pay Later and Other Unsecured Debt" (January 2025): loans of six lenders matched to
// credit records, 2021-2022. A one-off study; its headline figures are read from the Bureau's own announcement, each by
// the sentence that states it, so a reworded page fails here instead of printing a wrong number.
// ------------------------------------------------------------------------------------------------------------------
const CFPB_BNPL_URL = 'https://www.consumerfinance.gov/about-us/newsroom/cfpb-research-reveals-heavy-buy-now-pay-later-use-among-borrowers-with-high-credit-balances-and-multiple-pay-in-four-loans/';
async function fetchCfpbBnpl(prev) {
  if (prev && prev.facts && prev.parsed === 1 && !FORCE) return SKIP;   // a 2025 publication about 2021-2022: read once
  const text = htmlToText(await getText(CFPB_BNPL_URL, { tries: 2 })).replace(/\s+/g, ' ');
  const pick = (name, re) => { const m = re.exec(text); if (!m) throw new Error(`CFPB BNPL study: the sentence for "${name}" is not on the page any more`); return m.slice(1).map((x) => num(x)); };
  const [used22, used21] = pick('share of consumers who used BNPL', /(\d+(?:\.\d+)?) percent financed at least one purchase with a BNPL loan, up from (\d+(?:\.\d+)?) percent in 2021/i);
  const [multi, multiLender] = pick('simultaneous loans', /Approximately (\d+(?:\.\d+)?) percent of borrowers originated multiple simultaneous loans at some point during the year, and (\d+(?:\.\d+)?) percent took out loans from multiple BNPL lenders/i);
  const [approvedSub] = pick('approval of subprime applicants', /BNPL lenders approved (\d+(?:\.\d+)?) percent of loans in 2022/i);
  const [young, allAges] = pick('share of unsecured debt', /Among borrowers ages 18-24, BNPL purchases made up (\d+(?:\.\d+)?) percent of total unsecured consumer debt compared to an average of (\d+(?:\.\d+)?) percent/i);
  const [orig21, orig22] = pick('originations per borrower', /average number of originations per borrower increased from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)/i);
  const [heavy22, heavy21] = pick('heavy users', /About (\d+(?:\.\d+)?) percent of borrowers in 2022 were heavy users[^.]*, an increase from (\d+(?:\.\d+)?) percent in 2021/i);
  if (!/lenders do not typically report BNPL loans/i.test(text)) throw new Error('CFPB BNPL study: the sentence on credit reporting is not on the page any more');
  return { parsed: 1, dataYear: 2022, published: '2025-01-13', facts: { used22, used21, multi, multiLender, approvedSub, young, allAges, orig21, orig22, heavy22, heavy21, notReported: true },
    lenders: ['Affirm', 'Afterpay', 'Klarna', 'PayPal', 'Sezzle', 'Zip'], source: { name: 'Consumer Financial Protection Bureau, Consumer Use of Buy Now, Pay Later and Other Unsecured Debt (January 2025)', url: 'https://www.consumerfinance.gov/data-research/research-reports/consumer-use-of-buy-now-pay-later-and-other-unsecured-debt/', announcement: CFPB_BNPL_URL } };
}

// ------------------------------------------------------------------------------------------------------------------
// Department of Education · Federal Student Aid, portfolio tables (legacy .xls workbooks): the federal student loan
// portfolio by loan status and by days delinquent. Kept as the published rows; the builder reads them by their headers.
// ------------------------------------------------------------------------------------------------------------------
const FSA_FILES = { status: 'https://studentaid.gov/sites/default/files/fsawg/datacenter/library/PortfoliobyLoanStatus.xls', delinquency: 'https://studentaid.gov/sites/default/files/fsawg/datacenter/library/DLPortfoliobyDelinquencyStatus.xls', summary: 'https://studentaid.gov/sites/default/files/fsawg/datacenter/library/PortfolioSummary.xls' };
async function fetchFsa(prev) {
  const lms = {}; for (const [k, u] of Object.entries(FSA_FILES)) lms[k] = await lastModifiedOf(u);
  if (prev && prev.parsed === 1 && Object.keys(FSA_FILES).every((k) => lms[k] && prev.lastModified && prev.lastModified[k] === lms[k]) && !FORCE) return SKIP;
  const books = {};
  for (const [k, u] of Object.entries(FSA_FILES)) {
    const wb = openXls(await getBuffer(u, { tries: 2 }));
    books[k] = { url: u, sheets: wb.sheets.map((n) => ({ name: n, rows: wb.rows(n).slice(0, 140).map((r) => r.slice(0, 40).map((c) => (typeof c === 'number' ? Math.round(c * 1000) / 1000 : typeof c === 'string' ? c.trim().slice(0, 300) : c))) })) };
    if (!books[k].sheets.length || !books[k].sheets.some((sh) => sh.rows.length > 5)) throw new Error(`Federal Student Aid: ${k} workbook has no data rows`);
    await sleep(300);
  }
  return { parsed: 1, lastModified: lms, books, source: { name: 'U.S. Department of Education, Federal Student Aid, Federal Student Loan Portfolio', url: 'https://studentaid.gov/data-center/student/portfolio' } };
}

// ------------------------------------------------------------------------------------------------------------------
// Administrative Office of the U.S. Courts · Table F-2: bankruptcy cases filed in the 12 months to the latest quarter
// end, business and nonbusiness, by chapter and by court district (districts are added up to their state). The latest
// table and the one a year earlier; each table's address is read from its own page.
// ------------------------------------------------------------------------------------------------------------------
const COURTS_LIST = 'https://www.uscourts.gov/data-news/reports/statistical-reports/bankruptcy-filings-statistics';
const MONTH_END = { march: '03-31', june: '06-30', september: '09-30', december: '12-31' };
async function courtsTable(end) {   // end = 'YYYY-MM-DD'
  const page = `https://www.uscourts.gov/data-news/data-tables/${end.slice(0, 4)}/${end.slice(5, 7)}/${end.slice(8, 10)}/bankruptcy-filings/f-2`;
  const html = await getText(page, { tries: 2 });
  const m = /href="([^"]*bf_f2_[^"]*\.xlsx)"/i.exec(html);
  if (!m) throw new Error(`U.S. Courts: no Table F-2 workbook linked from ${page}`);
  const url = new URL(m[1], page).href, file = join(tmp, `f2-${end}.xlsx`);
  writeFileSync(file, await getBuffer(url, { tries: 2 }));
  const wb = openXlsx(file), sn = wb.sheets.find((n) => /^Table F-2\.?$/i.test(n.trim())) || wb.sheets[0], rows = wb.rows(sn);
  const title = String((rows[0] || [])[0] || '').replace(/\s+/g, ' ').trim();
  const tm = /During the 12-Month Period Ending ([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(title);
  if (!/Business and Nonbusiness Cases/i.test(title) || !tm) throw new Error(`U.S. Courts: table is titled "${title.slice(0, 160)}"`);
  if (`${tm[3]}-${MONTH_END[tm[1].toLowerCase()] || ''}` !== end) throw new Error(`U.S. Courts: asked for ${end}, the table is for ${tm[1]} ${tm[2]}, ${tm[3]}`);
  const hi = rows.findIndex((r) => r && /Nonbusiness/i.test(String(r[11] || '')));
  if (hi < 0 || !/^Chapter\s*7$/i.test(String((rows[hi + 1] || [])[12] || '').replace(/\s+/g, ' ').trim())) throw new Error('U.S. Courts: the nonbusiness columns of Table F-2 moved');
  const n = (v) => num(v) || 0, rec = (r) => ({ all: n(r[1]), business: n(r[6]), nb: n(r[11]), nb7: n(r[12]), nb11: n(r[13]), nb13: n(r[14]) });
  // district labels: "AL,N", "ME"; the territories are spelled out or abbreviated their own way
  const TERR = { GUAM: 'GU', NMI: 'MP', 'N.MARIANAISLANDS': 'MP', VI: 'VI', PR: 'PR', DC: 'DC' };
  let total = null; const states = {}; let districts = 0, sumNb = 0; const unread = [];
  for (const r of rows.slice(hi + 2)) {
    const raw = String(r[0] || '').trim(), k = raw.replace(/\s+/g, '').replace(/[^A-Za-z]+$/, '').toUpperCase();   // footnote marks ("AR ²") dropped
    if (/^Total/i.test(raw)) { total = rec(r); continue; }
    if (!k || /^\d+(ST|ND|RD|TH)$/.test(k)) continue;   // circuit subtotals ("1st", "2nd"…); "DC" is both a circuit and its one district
    const d = /^([A-Z]{2})(,[A-Z])?$/.exec(k), code = d ? d[1] : TERR[k];
    if (!code) { if (n(r[11]) > 0) unread.push(`${raw.slice(0, 24)} (${n(r[11])})`); continue; }
    districts++; const x = rec(r); sumNb += x.nb;
    const st = (states[code] = states[code] || { all: 0, business: 0, nb: 0, nb7: 0, nb11: 0, nb13: 0 }); for (const f of Object.keys(st)) st[f] += x[f];
  }
  if (!total || districts < 90) throw new Error(`U.S. Courts: ${districts} districts and ${total ? 'a' : 'no'} total row in Table F-2`);
  if (Math.abs(sumNb - total.nb) > 2) throw new Error(`U.S. Courts: districts add to ${sumNb} nonbusiness cases, the total row says ${total.nb}${unread.length ? `; rows not read: ${unread.slice(0, 12).join('; ')}` : ''}`);
  return { end, url, page, title, total, states, districts };
}
async function fetchCourts(prev) {
  const list = await getText(COURTS_LIST, { tries: 2 });
  const ends = [...list.matchAll(/bankruptcy-filing-statistics\/(march|june|september|december)-(\d{4})-quarterly-bankruptcy-filings/g)].map((m) => `${m[2]}-${MONTH_END[m[1]]}`).sort();
  if (!ends.length) throw new Error('U.S. Courts: no quarterly bankruptcy page in the list');
  const end = ends[ends.length - 1];
  if (prev && prev.latest && prev.latest.end === end && prev.yearAgo && !FORCE) return SKIP;
  const latest = await courtsTable(end); await sleep(400);
  const yearAgo = await courtsTable(`${Number(end.slice(0, 4)) - 1}${end.slice(4)}`);
  return { latest, yearAgo, source: { name: 'Administrative Office of the U.S. Courts, Table F-2 (bankruptcy cases filed, 12-month periods)', url: COURTS_LIST } };
}

// ------------------------------------------------------------------------------------------------------------------
// Census Bureau · Nonemployer Statistics: businesses with no paid employees (in these two industries, almost all of
// them one self-employed person) in taxi and limousine service (NAICS 4853, where ride-hailing drivers are classified)
// and couriers and messengers (NAICS 492, where app-based delivery is). United States only, yearly, from tax records.
// The NAICS vintage of the API changes with the year, so each year is asked with the vintages it can carry and the
// industry title that comes back is checked.
// ------------------------------------------------------------------------------------------------------------------
const NES_CODES = { taxi: ['4853', /taxi/i], courier: ['492', /courier/i] };
async function nesCell(year, code, re, key) {
  const vintages = year >= 2022 ? [2022, 2017] : year >= 2017 ? [2017, 2022, 2012] : [2012, 2017, 2007];
  for (const v of vintages) for (const lab of [`NAICS${v}_LABEL`, `NAICS${v}_TTL`]) {
    let rows;
    try { rows = await getJson(`https://api.census.gov/data/${year}/nonemp?get=${lab},NESTAB,NRCPTOT&for=us:*&NAICS${v}=${code}&key=${key}`, { tries: 1, timeoutMs: 30_000 }); }
    catch (e) { await sleep(80); continue; }
    if (!Array.isArray(rows) || rows.length < 2) continue;
    const h = rows[0], at = (n) => h.indexOf(n);
    // a year can carry one row per legal form of organization: keep the total (the largest count)
    const best = rows.slice(1).map((r) => ({ label: String(r[at(lab)] || ''), estab: num(r[at('NESTAB')]), receipts: num(r[at('NRCPTOT')]) })).filter((r) => r.estab > 0).sort((a, b) => b.estab - a.estab)[0];
    if (!best) continue;
    if (!re.test(best.label)) throw new Error(`Nonemployer Statistics ${year}: NAICS ${code} came back titled "${best.label}"`);
    return { estab: best.estab, receipts: best.receipts, naics: v, label: best.label };
  }
  return null;
}
async function fetchNes(prev) {
  const key = secret('CENSUS_API_KEY');
  if (!key) throw new Error('CENSUS_API_KEY is not set');
  const Y = new Date().getUTCFullYear();
  const have = new Map(((prev && prev.years) || []).map((r) => [r.year, r]));
  const lastHave = have.size ? Math.max(...have.keys()) : 0;
  const years = [];
  for (let y = 2012; y <= Y - 1; y++) {
    // a published year does not change: only the years after the last stored one are asked again
    if (have.has(y) && y <= lastHave && !FORCE) { years.push(have.get(y)); continue; }
    const row = { year: y };
    for (const [k, [code, re]] of Object.entries(NES_CODES)) { const c = await nesCell(y, code, re, key); if (c) row[k] = c; await sleep(80); }
    if (row.taxi && row.courier) years.push(row);
    else if (y <= Y - 3) NOTES.push(`Nonemployer Statistics ${y}: not on the API (${['taxi', 'courier'].filter((k) => !row[k]).join(', ')})`);
  }
  if (years.length < 5) throw new Error(`Nonemployer Statistics: only ${years.length} years answered`);
  if (prev && prev.years && JSON.stringify(prev.years) === JSON.stringify(years) && !FORCE) return SKIP;
  return { years, units: { estab: 'nonemployer establishments', receipts: 'thousands of dollars' },
    source: { name: 'U.S. Census Bureau, Nonemployer Statistics', url: 'https://www.census.gov/programs-surveys/nonemployer-statistics.html' } };
}

// ------------------------------------------------------------------------------------------------------------------
// Federal Reserve · Distributional Financial Accounts
// ------------------------------------------------------------------------------------------------------------------
const DFA_ZIP = 'https://www.federalreserve.gov/releases/z1/dataviz/download/zips/dfa.zip';
const DFA_DIMS = ['networth', 'income', 'age', 'generation', 'education', 'race'];
async function fetchDfa(prev) {
  const lastModified = await lastModifiedOf(DFA_ZIP);
  if (prev && lastModified && prev.lastModified === lastModified && !FORCE) return SKIP;
  const zip = join(tmp, 'dfa.zip');
  writeFileSync(zip, await getBuffer(DFA_ZIP));
  const dims = {};
  for (const d of DFA_DIMS) dims[d] = parseDfa(unzipText(zip, `dfa-${d}-levels.csv`), unzipText(zip, `dfa-${d}-levels-detail.csv`));
  const latest = dims.networth.quarters[dims.networth.quarters.length - 1];
  for (const d of DFA_DIMS) if (dims[d].quarters[dims[d].quarters.length - 1] !== latest) throw new Error(`DFA: ${d} ends ${dims[d].quarters.slice(-1)[0]}, net worth file ends ${latest}`);
  return { lastModified, latest, dims, units: 'millions of dollars; households = number; cutoffs = dollars',
    source: { name: 'Board of Governors of the Federal Reserve System, Distributional Financial Accounts', url: 'https://www.federalreserve.gov/releases/z1/dataviz/dfa/index.html', file: DFA_ZIP } };
}

// ------------------------------------------------------------------------------------------------------------------
// Federal Reserve · Survey of Consumer Finances (chartbook package)
// ------------------------------------------------------------------------------------------------------------------
const SCF_ZIP = 'https://www.federalreserve.gov/econres/scf/dataviz/download/zips/scf.zip';
const SCF_CATS = ['all', 'agecl', 'edcl', 'racecl4', 'inccat', 'nwcat', 'housecl', 'famstruct'];
// the Bulletin's historical tables: table 18 (ratio of debt payments to income, share of debtors above 40%, share with a payment
// 60 days late) and table 12 (leverage ratio by group), kept as the published rows; the workbook's name carries the survey year
const SCF_INDEX = 'https://www.federalreserve.gov/econres/scfindex.htm';
async function scfTables() {
  const html = await getText(SCF_INDEX, { tries: 2 });
  const m = /href="([^"]*scf\d{4}_tables_public_real_historical\.xlsx)"/i.exec(html);
  if (!m) throw new Error('SCF: the page no longer links the historical tables workbook');
  const url = new URL(m[1], SCF_INDEX).href;
  const file = join(tmp, 'scf-tables.xlsx');
  writeFileSync(file, await getBuffer(url, { tries: 2 }));
  const wb = openXlsx(file);
  const out = { url, v: 2 };
  for (const [k, re, title] of [['burden', /^Table 18$/i, /Ratio of debt payments to family income/i], ['leverage', /^Table 12$/i, /Leverage ratio/i]]) {
    const sn = wb.sheets.find((n) => re.test(n.trim())); if (!sn) throw new Error(`SCF tables: sheet ${re} missing`);
    const rows = wb.rows(sn).slice(0, 70).filter((r) => r && r.some((c) => c != null && c !== '')).map((r) => r.slice(0, 60).map((c) => (typeof c === 'number' ? Math.round(c * 1000) / 1000 : typeof c === 'string' ? c.replace(/\s+/g, ' ').trim().slice(0, 260) : c)));
    if (!title.test(String((rows[0] || [])[0] || ''))) throw new Error(`SCF tables: ${sn} is titled "${(rows[0] || [])[0]}"`);
    out[k] = rows;
  }
  return out;
}
async function fetchScf(prev) {
  const lastModified = await lastModifiedOf(SCF_ZIP);
  if (prev && lastModified && prev.lastModified === lastModified && prev.tables && prev.tables.v === 2 && !FORCE) return SKIP;
  const zip = join(tmp, 'scf.zip');
  writeFileSync(zip, await getBuffer(SCF_ZIP));
  const cats = {};
  for (const c of SCF_CATS) {
    cats[c] = {};
    for (const stat of ['median', 'mean', 'have']) cats[c][stat] = parseScf(unzipText(zip, `interactive_bulletin_charts_${c}_${stat}.csv`));
  }
  const years = Object.keys(cats.all.median['All families'] || {}).map(Number).sort((a, b) => a - b);
  if (!years.length) throw new Error('SCF: no "All families" rows');
  let tables = null;
  try { tables = await scfTables(); } catch (e) { note(`SCF historical tables not read: ${e.message}`); tables = (prev && prev.tables) || null; }
  return { lastModified, year: years[years.length - 1], years, cats, tables, units: `median and mean: thousands of ${years[years.length - 1]} dollars, conditional on holding the item (income and net worth: all families); have: percent of families`,
    source: { name: `Board of Governors of the Federal Reserve System, ${years[years.length - 1]} Survey of Consumer Finances`, url: 'https://www.federalreserve.gov/econres/scfindex.htm', file: SCF_ZIP } };
}

// ------------------------------------------------------------------------------------------------------------------
// New York Fed · Quarterly Report on Household Debt and Credit, and State Level Household Debt Statistics
// ------------------------------------------------------------------------------------------------------------------
const HHDC_URL = (y, q) => `https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/xls/HHD_C_Report_${y}Q${q}.xlsx`;
// sheet key -> title (first non-empty cell of the sheet)
const HHDC_SHEETS = {
  balance: /^Total Debt Balance and (its|Its) Composition/i, accounts: /^Number of Accounts by Loan Type/i, limits: /^Credit Limit and Balance for Credit Cards and HE Revolving/i,
  status: /^Total Balance by Delinquency Status/i, d90: /^Percent of Balance 90\+ Days Delinquent by Loan Type/i,
  new30: /^New Delinquent\*? Balances by Loan Type/i, new90: /^New Seriously Delinquent\*? Balances by Loan Type/i,
  byAge: /^Total Debt Balance by Age/i, byProductAge: /^Debt Share by Product Type and Age/i,
  t90Age: /^Transition into Serious Delinquency \(90\+\) by Age/i, t90AgeMortgage: /^Transition into Serious Delinquency \(90\+\) for Mortgages by Age/i,
  t90AgeAuto: /^Transition into Serious Delinquency \(90\+\) for Auto Loans by Age/i, t90AgeCard: /^Transition into Serious Delinquency \(90\+\) for Credit Cards by Age/i,
  t90AgeStudent: /^Transition into Serious Delinquency \(90\+\) for Student Loans by Age/i,
  collections: /^Third Party Collections/i, bankruptcy: /^(Number of )?Consumers with New Foreclosures and Bankruptcies/i,
  autoOrigScore: /^Auto Loan Origination Volume by Riskscore/i, mortOrigScore: /^Mortgage Origination Volume by Riskscore/i, bkAge: /^New Bankruptcy By Age/i, fcAge: /^New Foreclosures By Age/i,
};
async function fetchNyfed(prev) {
  // the newest quarterly workbook: walk back from the current quarter
  const now = new Date(); let y = now.getUTCFullYear(), q = Math.floor(now.getUTCMonth() / 3) + 1;
  let found = null, buf = null;
  for (let i = 0; i < 6 && !found; i++) {
    try { buf = await getBuffer(HHDC_URL(y, q), { tries: 2 }); if (buf.length > 10000 && buf[0] === 0x50 && buf[1] === 0x4b) found = { y, q }; else throw Object.assign(new Error('not a workbook'), { status: 404 }); }
    catch (e) { if (e.status !== 404) throw e; q--; if (q < 1) { q = 4; y--; } }
  }
  if (!found) throw new Error('no Household Debt and Credit workbook found for the last six quarters');
  const report = `${found.y}-Q${found.q}`;
  if (prev && prev.report === report && prev.sheetList === Object.keys(HHDC_SHEETS).length && !FORCE) return SKIP;   // a longer sheet list is read once
  const url = HHDC_URL(found.y, found.q);
  const file = join(tmp, 'hhdc.xlsx');
  writeFileSync(file, buf);
  const wb = openXlsx(file);
  const sheets = {}; let published = null;
  for (const name of wb.sheets) {
    if (/table of contents/i.test(name)) { const t = wb.rows(name).flat().find((c) => typeof c === 'string' && /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(c.trim())); if (t) published = t.trim(); continue; }
    if (!/data/i.test(name)) continue;
    const parsed = parseHhdcSheet(wb.rows(name));
    for (const [k, re] of Object.entries(HHDC_SHEETS)) if (re.test(parsed.title) && !sheets[k]) sheets[k] = { sheet: name, ...parsed };
  }
  for (const need of ['balance', 'byAge', 'byProductAge', 't90Age']) if (!sheets[need] || !sheets[need].rows.length) throw new Error(`HHDC ${report}: sheet "${need}" not found or empty`);
  const last = sheets.balance.rows[sheets.balance.rows.length - 1][0];
  if (last !== report) throw new Error(`HHDC: workbook ${report} but its balance table ends ${last}`);
  return { report, published, sheetList: Object.keys(HHDC_SHEETS).length, sheets, source: { name: `Federal Reserve Bank of New York, Quarterly Report on Household Debt and Credit, ${report.replace('-', ' ')}`, url: 'https://www.newyorkfed.org/microeconomics/hhdc', file: url, basis: 'New York Fed Consumer Credit Panel / Equifax' } };
}
const AREA_URL = 'https://www.newyorkfed.org/medialibrary/Interactives/householdcredit/data/xls/area_report_by_year.xlsx';
const AREA_SHEETS = ['population', 'auto', 'creditcard', 'mortgage', 'studentloan', 'total', 'auto_delinq', 'creditcard_delinq', 'mortgage_delinq', 'studentloan_delinq'];
async function fetchNyfedStates() {
  const file = join(tmp, 'area.xlsx');
  writeFileSync(file, await getBuffer(AREA_URL));
  const wb = openXlsx(file);
  const out = { sheets: {}, notes: {}, citation: null };
  for (const s of AREA_SHEETS) {
    if (!wb.sheets.includes(s)) throw new Error(`state workbook: sheet "${s}" missing (has ${wb.sheets.join(', ')})`);
    const rows = wb.rows(s);
    const hi = rows.findIndex((r) => r && r[0] === 'state');
    if (hi < 0) throw new Error(`state workbook: header row missing in "${s}"`);
    const years = rows[hi].slice(1).map((h) => { const m = /^Q4_(\d{4})$/.exec(String(h || '')); return m ? Number(m[1]) : null; });
    const data = {};
    for (const r of rows.slice(hi + 1)) { if (!r || typeof r[0] !== 'string') continue; const code = r[0].trim(); if (!/^[A-Z]{2}$|^allUS$/.test(code)) continue; data[code] = years.map((_, i) => (typeof r[i + 1] === 'number' ? r[i + 1] : null)); }
    const n = Object.keys(data).filter((k) => k !== 'allUS').length;
    if (n < 50) throw new Error(`state workbook: only ${n} states in "${s}"`);
    out.sheets[s] = { years: years.filter(Boolean), data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.slice(0, years.filter(Boolean).length)])) };
    const cite = rows.flat().find((c) => typeof c === 'string' && /^Citation:/.test(c));
    if (cite && !out.citation) out.citation = cite.replace(/^Citation:\s*/, '').trim();
  }
  if (wb.sheets.includes('Info')) for (const r of wb.rows('Info')) if (r && typeof r[0] === 'string' && AREA_SHEETS.includes(r[0])) out.notes[r[0]] = { title: r[1] || '', note: r[2] || '' };
  out.source = { name: out.citation || 'Federal Reserve Bank of New York, State Level Household Debt Statistics', url: 'https://www.newyorkfed.org/microeconomics/databank.html', file: AREA_URL, basis: 'New York Fed Consumer Credit Panel / Equifax' };
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// FRED (St. Louis Fed): BEA's personal income tables and state accounts, the Board's credit series, Census' CPS income
// ------------------------------------------------------------------------------------------------------------------
const FRED = 'https://api.stlouisfed.org/fred';
// id -> [title check, first observation kept, optional frequency aggregation]
const FRED_SERIES = {
  // BEA, NIPA table 2.6 (monthly, annual rates) as annual averages: the long-run composition of personal income and its uses
  PI: [/^Personal Income$/i, '1960-01-01', 'a'], W209RC1: [/^Compensation of employees, received$/i, '1960-01-01', 'a'], A576RC1: [/Wage and Salary Disbursements$/i, '1960-01-01', 'a'],
  A041RC1: [/^Proprietors' income with inventory valuation and capital consumption adjustments$/i, '1960-01-01', 'a'], A048RC1: [/^Rental income of persons/i, '1960-01-01', 'a'],
  PIROA: [/^Personal Income Receipts on Assets$/i, '1960-01-01', 'a'], PCTR: [/^Personal Current Transfer Receipts$/i, '1960-01-01', 'a'], A061RC1: [/^Contributions for government social insurance, domestic$/i, '1960-01-01', 'a'],
  W055RC1: [/^Personal current taxes$/i, '1960-01-01', 'a'], DSPI: [/^Disposable Personal Income$/i, '1960-01-01', 'a'], PCE: [/^Personal Consumption Expenditures$/i, '1960-01-01', 'a'],
  B069RC1: [/^Personal interest payments$/i, '1960-01-01', 'a'], W211RC1: [/^Personal current transfer payments$/i, '1960-01-01', 'a'], PMSAVE: [/^Personal Saving$/i, '1960-01-01', 'a'],
  PSAVERT: [/^Personal Saving Rate$/i, '1990-01-01'],
  DPCERE1Q156NBEA: [/^Shares of gross domestic product: Personal consumption expenditures$/i, '1990-01-01'],
  // Census Bureau, Current Population Survey (ASEC): the national household income series
  MEHOINUSA646N: [/^Median Household Income in the United States$/i, '1984-01-01'], MEHOINUSA672N: [/^Real Median Household Income in the United States$/i, '1984-01-01'], TTLHH: [/^Total Households$/i, '2000-01-01'],
  // Board of Governors: debt service (credit-bureau based), G.19 consumer credit and its terms, bank delinquency and charge-offs, Z.1
  TDSP: [/^Household Debt Service Payments as a Percent of Disposable Personal Income$/i, '2005-01-01'], CDSP: [/^Consumer Debt Service Payments as a Percent of Disposable Personal Income$/i, '2005-01-01'], MDSP: [/^Mortgage Debt Service Payments as a Percent of Disposable Personal Income$/i, '2005-01-01'],
  TOTALSL: [/^Total Consumer Credit Owned and Securitized$/i, '2000-01-01'], REVOLSL: [/^Revolving Consumer Credit Owned and Securitized$/i, '2000-01-01'], NONREVSL: [/^Nonrevolving Consumer Credit Owned and Securitized$/i, '2000-01-01'],
  TERMCBCCALLNS: [/^Commercial Bank Interest Rate on Credit Card Plans, All Accounts$/i, '2000-01-01'], TERMCBCCINTNS: [/^Commercial Bank Interest Rate on Credit Card Plans, Accounts Assessed Interest$/i, '2000-01-01'],
  RIFLPBCIANM60NM: [/^Finance Rate on Consumer Installment Loans at Commercial Banks, New Autos 60 Month Loan$/i, '2006-01-01'], TERMCBPER24NS: [/^Finance Rate on Personal Loans at Commercial Banks, 24 Month Loan$/i, '2000-01-01'],
  DRCCLACBS: [/^Delinquency Rate on Credit Card Loans, All Commercial Banks$/i, '2000-01-01'], CORCCACBS: [/^Charge-Off Rate on Credit Card Loans, All Commercial Banks$/i, '2000-01-01'],
  DRCLACBS: [/^Delinquency Rate on Consumer Loans, All Commercial Banks$/i, '2000-01-01'], DRSFRMACBS: [/^Delinquency Rate on Single-Family Residential Mortgages, Booked in Domestic Offices, All Commercial Banks$/i, '2000-01-01'],
  BOGZ1FL192090005Q: [/^Households; Net Worth, Level$/i, '1990-01-01'], HNONWPDPI: [/^Households and Nonprofit Organizations; Net Worth as a Percentage of Disposable Personal Income/i, '1990-01-01'],
  GDP: [/^Gross Domestic Product$/i, '2015-01-01'],
  // BEA, NIPA table 2.3.5 (quarterly, annual rates): consumption by type of product
  PCEC: [/^Personal Consumption Expenditures$/i, '2019-01-01'],
  DMOTRC1Q027SBEA: [/Motor vehicles and parts$/i, '2019-01-01'], DFDHRC1Q027SBEA: [/Furnishings and durable household equipment$/i, '2019-01-01'], DREQRC1Q027SBEA: [/Recreational goods and vehicles$/i, '2019-01-01'],
  DODGRC1Q027SBEA: [/Other durable goods$/i, '2019-01-01'], DFXARC1Q027SBEA: [/Food and beverages purchased for off-premises consumption$/i, '2019-01-01'], DCLORC1Q027SBEA: [/Clothing and footwear$/i, '2019-01-01'],
  DGOERC1Q027SBEA: [/Gasoline and other energy goods$/i, '2019-01-01'], DONGRC1Q027SBEA: [/Other nondurable goods$/i, '2019-01-01'], DHUTRC1Q027SBEA: [/Housing and utilities$/i, '2019-01-01'],
  DHLCRC1Q027SBEA: [/Health care$/i, '2019-01-01'], DTRSRC1Q027SBEA: [/Transportation services$/i, '2019-01-01'], DRCARC1Q027SBEA: [/Recreation services$/i, '2019-01-01'],
  DFSARC1Q027SBEA: [/Food services and accommodations$/i, '2019-01-01'], DIFSRC1Q027SBEA: [/Financial services and insurance$/i, '2019-01-01'], DOTSRC1Q027SBEA: [/Other services$/i, '2019-01-01'],
  DNPIRC1Q027SBEA: [/nonprofit institutions serving households/i, '2019-01-01'],
  // Federal Reserve Bank of Philadelphia, Large Bank Credit Card and Mortgage Data (FR Y-14M): how card accounts are paid,
  // how much of the line is used, who gets new cards, and what cardholders in each credit-score group spend
  RCCCBSHRMIN: [/Share of Accounts Making the Minimum Payment$/i, '2012-01-01'], RCCCBSHRFULL: [/Share of Accounts Making the Full Balance Payment$/i, '2012-01-01'],
  RCCCBSHRGTMINLTMAX: [/Share of Accounts Making Greater Than the Minimum Payment but Less Than the Full Balance$/i, '2012-01-01'],
  RCCCBACTIVEUTILPCT50: [/Utilization: Active Accounts Only: 50th Percentile$/i, '2012-01-01'], RCCCBACTIVEUTILPCT75: [/Utilization: Active Accounts Only: 75th Percentile$/i, '2012-01-01'], RCCCBACTIVEUTILPCT90: [/Utilization: Active Accounts Only: 90th Percentile$/i, '2012-01-01'],
  RCCCBBALDPD30P: [/30 or More Days Past Due Rates: Balances Based$/i, '2012-01-01'], RCCCBBALDPD90P: [/90 or More Days Past Due Rates: Balances Based$/i, '2012-01-01'], RCCCBNCOPCT: [/Balances: Net Charge-Off Rate$/i, '2012-01-01'],
  RCCCBBALTOT: [/Balances: Total Balances$/i, '2012-01-01'], RCCCBBALREV: [/Balances: Revolving Balances Only$/i, '2012-01-01'],
  RCCCOACTPCTSCORELT660: [/Percentage of New Accounts with <660 Credit Score$/i, '2012-01-01'], RCCCBAPRAVGPCTGP: [/Average Purchase APR: General Purpose$/i, '2012-01-01'],
  RCCCBPURCHASEASGTE720: [/Average Purchase Volume by Credit Score Group: >=720 Credit Score$/i, '2012-01-01'], RCCCBPURCHASEAS660T719: [/Average Purchase Volume by Credit Score Group: 660-719 Credit Score$/i, '2012-01-01'],
  RCCCBPURCHASEASLT660: [/Average Purchase Volume by Credit Score Group: <660 Credit Score$/i, '2012-01-01'],
  // BEA price index of consumption (to state spending and wealth in constant dollars)
  PCEPI: [/^Personal Consumption Expenditures: Chain-type Price Index$/i, '1984-01-01'],
  // Federal Reserve Bank of Atlanta, Wage Growth Tracker by wage quartile (12-month moving average of median wage growth)
  FRBATLWGT12MMUMHWGWD1WP: [/Median Hourly Wage Growth: Wage Distribution: 1st to 25th Wage Percentile/i, '1997-01-01'], FRBATLWGT12MMUMHWGWD26WP: [/Median Hourly Wage Growth: Wage Distribution: 26th to 50th Wage Percentile/i, '1997-01-01'],
  FRBATLWGT12MMUMHWGWD51WP: [/Median Hourly Wage Growth: Wage Distribution: 51st to 75th Wage Percentile/i, '1997-01-01'], FRBATLWGT12MMUMHWGWD76WP: [/Median Hourly Wage Growth: Wage Distribution: 76th to 100th Wage Percentile/i, '1997-01-01'],
};
// BEA's monthly tables as published (line names and values together, in one call each)
const FRED_TABLES = { t26: { release: 54, element: 155443, re: /^Table 2\.6\. Personal Income and Its Disposition, Monthly/i }, t285: { release: 54, element: 3220, re: /^Table 2\.8\.5\. Personal Consumption Expenditures by Major Type of Product/i } };
// one series per state: id pattern and the title it must carry
const FRED_STATE = {
  pcpi: { id: (s) => `${s}PCPI`, re: (n) => new RegExp(`^Per Capita Personal Income in (the )?${n}$`, 'i'), sentinel: 'CAPCPI' },
  rpp: { id: (s) => `${s}RPPALL`, re: (n) => new RegExp(`^Regional Price Parities: All Items for (the )?${n}$`, 'i'), sentinel: 'CARPPALL' },
  pcepc: { id: (s) => `${s}PCEPC`, re: (n) => new RegExp(`^Per Capita Personal Consumption Expenditures: Total for (the )?${n}$`, 'i'), sentinel: 'CAPCEPC' },
};
async function fetchFred(prev) {
  const key = secret('FRED_API_KEY');
  if (!key) throw new Error('FRED_API_KEY is not set');
  const q = `api_key=${key}&file_type=json`;
  const call = async (path) => { const j = await getJson(`${FRED}/${path}${path.includes('?') ? '&' : '?'}${q}`, { ua: BOT_UA }); await sleep(520); return j; };
  const meta = async (id) => { const j = await call(`series?series_id=${id}`); const s = (j.seriess || [])[0]; if (!s) throw new Error(`FRED: series ${id} not found`); return s; };
  const obs = async (id, start, freq) => {
    const j = await call(`series/observations?series_id=${id}&observation_start=${start}${freq ? `&frequency=${freq}&aggregation_method=avg` : ''}`);
    return (j.observations || []).map((o) => [o.date, num(o.value === '.' ? null : o.value)]).filter((o) => o[1] != null);
  };
  const old = prev || { series: {}, tables: {}, states: {} };
  const out = { series: {}, tables: {}, states: {}, source: { name: 'FRED, Federal Reserve Bank of St. Louis (series of BEA, the Board of Governors and the Census Bureau, each checked against its title)', url: 'https://fred.stlouisfed.org/' } };
  const problems = [];
  // 1. single series: metadata first (title check, last update), observations only when the series was updated
  for (const [id, [re, start, freq]] of Object.entries(FRED_SERIES)) {
    try {
      const m = await meta(id);
      if (!re.test(m.title)) throw new Error(`title "${m.title}" does not match ${re}`);
      const o = old.series[id];
      if (o && o.updated === m.last_updated && !FORCE) { out.series[id] = o; continue; }
      out.series[id] = { title: m.title, units: m.units_short, freq: freq ? 'A' : m.frequency_short, sa: m.seasonal_adjustment_short, updated: m.last_updated, obs: await obs(id, start, freq) };
    } catch (e) { problems.push(`${id}: ${e.message}`); if (old.series[id]) out.series[id] = old.series[id]; }
  }
  // 2. BEA's monthly tables, as FRED republishes them
  for (const [k, t] of Object.entries(FRED_TABLES)) {
    try {
      const j = await call(`release/tables?release_id=${t.release}&element_id=${t.element}&include_observation_values=true`);
      const els = Object.values(j.elements || {});
      const name = j.name || (els.find((e) => e.type === 'table') || {}).name || '';
      if (name && !t.re.test(name)) throw new Error(`table name "${name}" does not match ${t.re}`);
      const lines = els.filter((e) => e.series_id).map((e, i) => ({ line: Number(e.line) || i + 1, id: e.series_id, name: e.name, level: Number(e.level), parent: e.parent_id, element: e.element_id, value: num(e.observation_value), date: e.observation_date || null })).sort((a, b) => a.line - b.line);
      if (lines.length < 10) throw new Error(`only ${lines.length} lines`);
      if (lines.some((l) => l.value == null)) {   // the table call did not carry values: read each line's latest observation
        for (const l of lines) { const o = await obs(l.id, '2024-01-01'); const last = o[o.length - 1]; if (last) { l.value = last[1]; l.date = last[0]; } }
      }
      out.tables[k] = { name: name || null, lines };
    } catch (e) { problems.push(`table ${k}: ${e.message}`); if (old.tables[k]) out.tables[k] = old.tables[k]; }
  }
  // 3. state families: refetched only when the family's sentinel series was updated
  for (const [fam, spec] of Object.entries(FRED_STATE)) {
    try {
      const s = await meta(spec.sentinel);
      const o = old.states[fam];
      if (o && o.updated === s.last_updated && Object.keys(o.values || {}).length === 51 && !FORCE) { out.states[fam] = o; continue; }
      const values = {}; let period = null; const bad = [];
      for (const st of STATES) {
        const id = spec.id(st.code);
        const m = await meta(id);
        if (!spec.re(st.name).test(m.title)) { bad.push(`${id}: "${m.title}"`); continue; }
        const o2 = await obs(id, '2015-01-01');
        if (!o2.length) { bad.push(`${id}: no observations`); continue; }
        values[st.code] = o2.map(([d, v]) => [Number(d.slice(0, 4)), v]);
        const lastY = values[st.code][values[st.code].length - 1][0];
        period = period == null ? lastY : Math.min(period, lastY);
      }
      if (bad.length) throw new Error(`${bad.length} state series failed: ${bad.slice(0, 4).join(' | ')}`);
      out.states[fam] = { updated: s.last_updated, units: s.units_short, year: period, values };
    } catch (e) { problems.push(`states ${fam}: ${e.message}`); if (old.states[fam]) out.states[fam] = old.states[fam]; }
  }
  if (problems.length) note(`FRED: ${problems.length} problem(s): ${problems.slice(0, 6).join(' | ')}`);
  if (!Object.keys(out.series).length) throw new Error(`FRED: nothing answered (${problems.slice(0, 3).join(' | ')})`);
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
const SOURCES = { census: fetchCensus, cex: fetchCex, cexHist: fetchCexHist, beaDist: fetchBeaDist, umich: fetchUmich, nes: fetchNes, pceDist: fetchPceDist, jointDist: fetchJointDist, sce: fetchSce, shed: fetchShed, cfpbBnpl: fetchCfpbBnpl, fsa: fetchFsa, courts: fetchCourts, dfa: fetchDfa, scf: fetchScf, nyfed: fetchNyfed, nyfedStates: fetchNyfedStates, fred: fetchFred };
const status = readJson(RAW + 'status.json', { sources: {} });
const before = JSON.stringify(status);
let changed = 0, failed = 0;
for (const [id, fn] of Object.entries(SOURCES)) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const stored = readJson(`${RAW}${id}.json`);
  const st = (status.sources[id] = status.sources[id] || { failures: 0 });
  NOTES = [];
  try {
    const data = await fn(stored ? stored.data : null);
    if (data !== SKIP) { if (NOTES.length) st.notes = NOTES; else delete st.notes; }
    if (data === SKIP) console.log(`${id}: nothing new at the publisher`);
    else if (stored && JSON.stringify(stored.data) === JSON.stringify(data)) console.log(`${id}: fetched, unchanged`);
    else { writeJson(`${RAW}${id}.json`, JSON.parse(redact(JSON.stringify({ fetchedAt: nowIso(), data })))); changed++; console.log(`${id}: updated`); }
    if (st.failures || st.error) { st.failures = 0; delete st.error; delete st.since; }
  } catch (e) {
    failed++;
    st.failures = (st.failures || 0) + 1;
    st.error = redact(String((e && e.message) || e)).slice(0, 500);
    st.since = st.since || nowIso().slice(0, 10);
    console.log(`::warning::${id}: ${st.error}`);
  }
}
if (JSON.stringify(status) !== before) writeJson(RAW + 'status.json', status);
console.log(`sources updated: ${changed}; failed: ${failed}`);
