#!/usr/bin/env node
// Data of the Mexican Consumer page (site/mx/consumidor), fetched on GitHub's runner from the publishers:
//
//   enigh     INEGI, Encuesta Nacional de Ingresos y Gastos de los Hogares (public microdata of every edition of the new
//             series, 2016 on): income, spending, financial flows, by decile, state and group of households
//   banxico   Banco de México, SIE API: household financing, bank consumer credit by product and its past-due balances,
//             interest rates, the bank lending survey, cards in force, households' money and retirement savings,
//             the minimum wage, the INPC, the monthly indicator of private consumption, remittances
//   cards     Banco de México, card payments by type of merchant (daily series added up by month)
//   states    Banco de México, remittances and bank housing credit by state (ids read from the public table pages)
//   inegi     INEGI, Banco de Información Económica: retail sales, real wages, informality, employed people by level of
//             income, private consumption and GDP at current prices, car sales
//   fred      FRED (St. Louis Fed) mirror of the BIS series of total credit to households as a percent of GDP
//   enif      INEGI and CNBV, Encuesta Nacional de Inclusión Financiera (public microdata): who has credit, savings, cushions
//   docs      Published documents kept as text for the figures curated from them (ENFIH 2019 results)
//   poverty   INEGI, multidimensional poverty by state
//
//   node scripts/mx-consumidor/fetch.mjs [--only=enigh,banxico] [--force]
//
// Each source writes tools/mx-consumidor/raw/<source>.json = { fetchedAt, data }, rewritten only when the data changed,
// so a quiet run commits nothing. A source that fails keeps its stored file; failures are counted in raw/status.json (the
// workflow opens a SOURCE DOWN issue after three in a row). Every series is checked against its published title before
// it is accepted. API tokens come from the environment and are removed from everything written.
import { writeFileSync, mkdtempSync, readdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAW, readJson, writeJson, exists, get, getJson, getBuffer, secret, redact, sleep, nowIso, fold, sieSeries, sieCuadro, bieSeries, bieSearch, bieMeta, stateCode, BOT_UA } from './lib/common.mjs';
import { BANXICO, CARD_GIROS, INEGI } from './lib/series.mjs';
import { aggregate } from './lib/enigh.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const tmp = mkdtempSync(join(tmpdir(), 'mx-consumidor-'));
const SKIP = Symbol('unchanged');   // a source whose publisher shows nothing new: the stored file stands
let NOTES = [];
const note = (msg) => { NOTES.push(redact(String(msg)).slice(0, 400)); console.log(`::warning::${redact(String(msg))}`); };
const INEGI_FILES = 'https://www.inegi.org.mx/contenidos/programas';

// HEAD of a file: { ok, type, lastModified, length }. INEGI answers 200 with an HTML page for a file that does not exist.
async function headOf(url) {
  try { const r = await get(url, { method: 'HEAD', tries: 2, timeoutMs: 40_000 }); return { ok: true, type: r.headers.get('content-type') || '', lastModified: r.headers.get('last-modified') || null, length: Number(r.headers.get('content-length') || 0) }; }
  catch (e) { return { ok: false, error: e.message }; }
}
const isZipHead = (h) => h.ok && /zip|octet-stream/i.test(h.type) && h.length > 100_000;
async function downloadZip(url, name) {
  const buf = await getBuffer(url, { timeoutMs: 300_000 });
  if (!(buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error(`${url} did not return a ZIP file (${buf.length} bytes)`);
  const file = join(tmp, name + '.zip'), dir = join(tmp, name);
  writeFileSync(file, buf);
  execFileSync('unzip', ['-o', '-q', file, '-d', dir], { maxBuffer: 64 * 1024 * 1024 });
  rmSync(file, { force: true });
  return dir;
}
const walk = (d) => readdirSync(d).flatMap((f) => { const q = join(d, f); return statSync(q).isDirectory() ? walk(q) : [q]; });
const findFile = (dir, re) => { const hit = walk(dir).find((f) => re.test(f)); if (!hit) throw new Error(`no file matching ${re} in ${dir}`); return hit; };

// ------------------------------------------------------------------------------------------------------------------
// INEGI · ENIGH microdata
// ------------------------------------------------------------------------------------------------------------------
const ENIGH_V = 3;   // raise when the tabulation changes, so every edition is read again
const enighUrl = (y, table) => `${INEGI_FILES}/enigh/nc/${y}/microdatos/enigh${y}_ns_${table}_csv.zip`;
async function fetchEnigh(prev) {
  const Y = new Date().getUTCFullYear();
  // editions of the new series: every two years from 2016; the newest is the latest even year whose files exist
  const years = [];
  for (let y = 2016; y <= Y; y += 2) years.push(y);
  const heads = {};
  for (const y of years) { heads[y] = await headOf(enighUrl(y, 'concentradohogar')); await sleep(300); }
  const have = years.filter((y) => isZipHead(heads[y]));
  if (have.length < 5) throw new Error(`only ${have.length} ENIGH editions answered (${have.join(', ')})`);
  const latest = have[have.length - 1], before = have[have.length - 2];
  const old = prev && prev.v === ENIGH_V ? prev.editions || {} : {};
  const editions = {}; let changed = false;
  for (const y of have) {
    const lm = heads[y].lastModified;
    const detail = y === latest ? 'full' : 'states';
    const tables = y === latest ? ['viviendas', 'hogares', 'poblacion'] : [];
    const lmExtra = {};
    for (const t of tables) { const h = await headOf(enighUrl(y, t)); if (!isZipHead(h)) throw new Error(`ENIGH ${y}: ${t} file missing`); lmExtra[t] = h.lastModified; }
    const stamp = JSON.stringify([lm, lmExtra, detail]);
    if (old[y] && old[y].stamp === stamp && !FORCE) { editions[y] = old[y]; continue; }
    const files = { concentrado: findFile(await downloadZip(enighUrl(y, 'concentradohogar'), `c${y}`), /concentradohogar\.csv$/i) };
    for (const t of tables) files[t] = findFile(await downloadZip(enighUrl(y, t), `${t}${y}`), new RegExp(`${t}\\.csv$`, 'i'));
    const data = aggregate(y, files, { detail });
    editions[y] = { stamp, lastModified: lm, detail, data };
    changed = true;
    rmSync(join(tmp, `c${y}`), { recursive: true, force: true }); for (const t of tables) rmSync(join(tmp, `${t}${y}`), { recursive: true, force: true });
    console.log(`ENIGH ${y}: ${data.sample} households in the sample, ${data.households} expanded, mean current income ${data.mean.ing_cor}`);
  }
  if (!changed && prev && prev.latest === latest) return SKIP;
  return { v: ENIGH_V, latest, before, editions, source: { name: 'INEGI, Encuesta Nacional de Ingresos y Gastos de los Hogares (ENIGH), microdatos', url: `https://www.inegi.org.mx/programas/enigh/nc/${latest}/` } };
}

// ------------------------------------------------------------------------------------------------------------------
// Banco de México · SIE API
// ------------------------------------------------------------------------------------------------------------------
// a SIE date ('YYYY-MM-DD', first day of the period) in the page's period form
const period = (d, freq) => {
  const y = d.slice(0, 4), m = Number(d.slice(5, 7));
  if (freq === 'Q') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  if (freq === 'B') { const mm = m + 1; return `${y}-${String(mm).padStart(2, '0')}`; }   // two-month periods: stamped with their second month (the cut-off the banks report)
  if (freq === 'M') return d.slice(0, 7);
  return d;
};
async function fetchBanxico() {
  const keys = Object.keys(BANXICO);
  const got = {};
  for (const since of new Set(keys.map((k) => BANXICO[k].since || '2000-01-01'))) {
    const ids = keys.filter((k) => (BANXICO[k].since || '2000-01-01') === since).map((k) => BANXICO[k].id);
    Object.assign(got, await sieSeries(ids, since));
  }
  const series = {}; const missing = [];
  for (const k of keys) {
    const spec = BANXICO[k], s = got[spec.id];
    if (!s || !s.points.length) { missing.push(`${k} (${spec.id}): no data`); continue; }
    if (!spec.title.test(s.title)) { missing.push(`${k} (${spec.id}): title "${s.title.slice(0, 140)}" does not match`); continue; }
    series[k] = { id: spec.id, title: s.title, freq: spec.freq, url: spec.cuadro, obs: s.points.map(([d, v]) => [period(d, spec.freq), v]) };
  }
  for (const m of missing) note(`Banxico: ${m}`);
  if (Object.keys(series).length < keys.length * 0.8) throw new Error(`only ${Object.keys(series).length} of ${keys.length} Banxico series were accepted: ${missing.slice(0, 4).join('; ')}`);
  return { series, missing, source: { name: 'Banco de México, Sistema de Información Económica (SIE)', url: 'https://www.banxico.org.mx/SieInternet/' } };
}

// Card payments by type of merchant: daily amounts added up by month (complete months only)
async function fetchCards() {
  const keys = Object.keys(CARD_GIROS);
  const got = await sieSeries(keys.map((k) => CARD_GIROS[k][0]), '2022-12-01');
  const months = {}; const lastDay = {}; const missing = [];
  for (const k of keys) {
    const [id, re] = CARD_GIROS[k], s = got[id];
    if (!s || !s.points.length) { missing.push(`${k} (${id}): no data`); continue; }
    if (!re.test(s.title)) { missing.push(`${k} (${id}): title "${s.title.slice(0, 120)}" does not match`); continue; }
    const m = {};
    for (const [d, v] of s.points) { const mk = d.slice(0, 7); m[mk] = (m[mk] || 0) + v; if (!lastDay[mk] || d > lastDay[mk]) lastDay[mk] = d; }
    months[k] = m;
  }
  for (const m of missing) note(`Banxico card payments: ${m}`);
  if (!months.total) throw new Error('the total of card payments by merchant type was not accepted');
  // a month is complete when its last observation is its last calendar day
  const all = Object.keys(months.total).sort();
  const complete = all.filter((mk) => { const [y, mo] = mk.split('-').map(Number); return lastDay[mk] === `${mk}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, '0')}`; });
  const out = {};
  for (const k of Object.keys(months)) out[k] = complete.map((mk) => Math.round((months[k][mk] || 0) / 1e6 * 10) / 10);   // millions of pesos
  return { months: complete, giros: out, unit: 'millones de pesos', missing, source: { name: 'Banco de México, operaciones con tarjetas por giro comercial (CF958)', url: 'https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=consultarCuadro&idCuadro=CF958&sector=27&locale=es' } };
}

// Remittances and bank housing credit by state: the ids come from the public table pages, so a renumbered row cannot mislabel a state
async function fetchStates() {
  // CE100: one row per state
  const ce = await sieCuadro('CE100', 1);
  const remitIds = {};
  for (const r of ce.rows) { if (!r.id) continue; const code = stateCode(r.label); if (code) remitIds[code] = { id: r.id, label: r.label }; }
  if (Object.keys(remitIds).length !== 32) throw new Error(`CE100: ${Object.keys(remitIds).length} states found, expected 32`);
  await sleep(2500);
  // CF829: "IV. Vivienda" > "Cartera total" / "Cartera vigente" / "Cartera vencida" > one row per state
  const cf = await sieCuadro('CF829', 19);
  const housing = { total: {}, pastDue: {} };
  let inViv = false, block = null;
  for (const r of cf.rows) {
    if (!r.id) continue;
    if (/^IV\.\s*Vivienda/i.test(r.label)) { inViv = true; block = null; continue; }
    if (/^V\.\s*Consumo/i.test(r.label)) { inViv = false; block = null; continue; }
    if (!inViv) continue;
    if (/^Cartera total/i.test(r.label)) { block = 'total'; continue; }
    if (/^Cartera vigente/i.test(r.label)) { block = 'vigente'; continue; }
    if (/^Cartera vencida/i.test(r.label)) { block = 'pastDue'; continue; }
    const code = stateCode(r.label);
    if (code && (block === 'total' || block === 'pastDue')) housing[block][code] = { id: r.id, label: r.label };
  }
  for (const b of ['total', 'pastDue']) if (Object.keys(housing[b]).length !== 32) throw new Error(`CF829 housing ${b}: ${Object.keys(housing[b]).length} states found, expected 32`);
  const ids = [...Object.values(remitIds).map((x) => x.id), ...Object.values(housing.total).map((x) => x.id), ...Object.values(housing.pastDue).map((x) => x.id)];
  const got = await sieSeries(ids, '2015-01-01');
  // every series must answer under the table's title and end with the state's own label
  const pick = (map, titleRe) => { const o = {}; for (const code of Object.keys(map)) { const { id, label } = map[code], s = got[id]; if (!s || !s.points.length) throw new Error(`state series ${id} returned no data`); if (!titleRe.test(s.title) || !fold(s.title).replace(/\s+/g, ' ').trim().endsWith(fold(label).replace(/\s+/g, ' ').trim())) throw new Error(`state series ${id}: title "${s.title.slice(-120)}" does not match "${label}"`); o[code] = s.points.map(([d, v]) => [period(d, 'Q'), v]); } return o; };
  const idsOf = (map) => Object.fromEntries(Object.keys(map).map((c) => [c, map[c].id]));
  return {
    remittances: pick(remitIds, /Ingresos por Remesas/i), housingTotal: pick(housing.total, /Crédito por entidad federativa/i), housingPastDue: pick(housing.pastDue, /Crédito por entidad federativa/i),
    ids: { remittances: idsOf(remitIds), housingTotal: idsOf(housing.total), housingPastDue: idsOf(housing.pastDue) },
    source: { name: 'Banco de México, remesas por entidad federativa (CE100) y crédito de la banca comercial por entidad federativa (CF829)', url: 'https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=consultarCuadro&idCuadro=CE100&sector=1&locale=es' },
  };
}

// ------------------------------------------------------------------------------------------------------------------
// INEGI · Banco de Información Económica
// ------------------------------------------------------------------------------------------------------------------
async function fetchInegi() {
  const keys = Object.keys(INEGI);
  const ids = keys.map((k) => INEGI[k].id);
  const got = {};
  for (let i = 0; i < ids.length; i += 8) { Object.assign(got, await bieSeries(ids.slice(i, i + 8), 2005)); await sleep(500); }
  // titles: the BIE search gives the full topic path of every hit; one search can verify several ids
  const searches = {}; const series = {}; const missing = [];
  for (const k of keys) {
    const spec = INEGI[k], s = got[spec.id];
    if (!s || !s.points.length) { missing.push(`${k} (${spec.id}): no data`); continue; }
    if (!(spec.search in searches)) { try { searches[spec.search] = await bieSearch(spec.search, { to: 60 }); } catch (e) { searches[spec.search] = []; note(`INEGI search "${spec.search}": ${e.message}`); } await sleep(400); }
    let title = (searches[spec.search].find((r) => r.id === spec.id) || {}).title || '';
    if (!title) { try { title = (await bieMeta(spec.id)).path; } catch { /* no title from either service */ } }
    if (!title || !spec.title.test(title)) { missing.push(`${k} (${spec.id}): title "${title.slice(0, 160)}" does not match`); continue; }
    if (s.freq && spec.freq && s.freq !== spec.freq) { missing.push(`${k} (${spec.id}): frequency ${s.freq}, expected ${spec.freq}`); continue; }
    series[k] = { id: spec.id, title, unit: s.unit, freq: s.freq || spec.freq, url: `https://www.inegi.org.mx/app/indicadores/?ind=${spec.id}#divFV${spec.id}`, obs: s.points };
  }
  for (const m of missing) note(`INEGI: ${m}`);
  if (Object.keys(series).length < keys.length * 0.6) throw new Error(`only ${Object.keys(series).length} of ${keys.length} INEGI series were accepted: ${missing.slice(0, 4).join('; ')}`);
  return { series, missing, source: { name: 'INEGI, Banco de Información Económica (BIE)', url: 'https://www.inegi.org.mx/app/indicadores/' } };
}

// ------------------------------------------------------------------------------------------------------------------
// FRED · BIS total credit to households
// ------------------------------------------------------------------------------------------------------------------
const FRED_SERIES = { hhCreditGdp: { id: 'QMXHAM770A', title: /^Total Credit to Households and NPISHs, Adjusted for Breaks, for Mexico$/i, units: /Percentage of GDP/i } };
async function fetchFred() {
  const key = secret('FRED_API_KEY');
  if (!key) throw new Error('FRED_API_KEY is not set');
  const series = {};
  for (const k of Object.keys(FRED_SERIES)) {
    const spec = FRED_SERIES[k];
    const meta = (await getJson(`https://api.stlouisfed.org/fred/series?series_id=${spec.id}&api_key=${key}&file_type=json`, { ua: BOT_UA })).seriess[0];
    if (!spec.title.test(meta.title) || !spec.units.test(meta.units)) throw new Error(`FRED ${spec.id}: title "${meta.title}" (${meta.units}) does not match`);
    const obs = (await getJson(`https://api.stlouisfed.org/fred/series/observations?series_id=${spec.id}&api_key=${key}&file_type=json&observation_start=2000-01-01`, { ua: BOT_UA })).observations
      .filter((o) => o.value !== '.').map((o) => [period(o.date, 'Q'), Number(o.value)]);
    series[k] = { id: spec.id, title: meta.title, units: meta.units, updated: meta.last_updated, url: `https://fred.stlouisfed.org/series/${spec.id}`, obs };
    await sleep(300);
  }
  return { series, source: { name: 'Bank for International Settlements, total credit to households (through FRED)', url: 'https://data.bis.org/topics/TOTAL_CREDIT' } };
}

// ------------------------------------------------------------------------------------------------------------------
const SOURCES = { enigh: fetchEnigh, banxico: fetchBanxico, cards: fetchCards, states: fetchStates, inegi: fetchInegi, fred: fetchFred };
const status = readJson(RAW + 'status.json', { sources: {} });
status.sources = status.sources || {};
let ran = 0, failed = 0;
for (const id of Object.keys(SOURCES)) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  ran++; NOTES = [];
  const prevFile = readJson(`${RAW}${id}.json`);
  const st = status.sources[id] || {};
  try {
    const data = await SOURCES[id](prevFile ? prevFile.data : null);
    if (data === SKIP) console.log(`${id}: nothing new at the publisher`);
    else if (prevFile && JSON.stringify(prevFile.data) === JSON.stringify(data)) console.log(`${id}: read, unchanged`);
    else { writeJson(`${RAW}${id}.json`, { fetchedAt: nowIso(), data }); console.log(`${id}: updated`); }
    status.sources[id] = { ok: nowIso().slice(0, 10), failures: 0, ...(NOTES.length ? { notes: NOTES } : {}) };
  } catch (e) {
    failed++;
    const msg = redact(String((e && e.message) || e)).slice(0, 500);
    console.log(`::error::${id}: ${msg}`);
    status.sources[id] = { ok: st.ok || null, failures: (st.failures || 0) + 1, since: st.failures ? st.since : nowIso().slice(0, 10), error: msg, ...(NOTES.length ? { notes: NOTES } : {}) };
  }
}
// status.json changes only when a source's state does (a quiet run commits nothing)
const before = JSON.stringify(readJson(RAW + 'status.json', {}));
const strip = (o) => JSON.stringify(o, (k, v) => (k === 'ok' ? undefined : v));
if (strip(JSON.parse(before || '{}')) !== strip(status) || !exists(RAW + 'status.json')) writeJson(RAW + 'status.json', status);
rmSync(tmp, { recursive: true, force: true });
console.log(`sources read: ${ran}; failed: ${failed}`);
process.exit(ran && failed === ran ? 1 : 0);
