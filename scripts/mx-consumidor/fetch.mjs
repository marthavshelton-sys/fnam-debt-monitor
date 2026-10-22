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
//   bis       BIS statistics API: total credit to households as a percent of GDP (the BIS's own series), and the next and
//             last release dates the BIS prints on the statistics' topic page
//   fred      FRED (St. Louis Fed) mirror of the same BIS series, kept as a fallback (it skipped the September 2026 release)
//   enif      INEGI and CNBV, Encuesta Nacional de Inclusión Financiera (public microdata): who has credit, savings, cushions
//   docs      Published documents kept as text for the figures curated from them (ENFIH 2019 results)
//   poverty   INEGI, multidimensional poverty, national and by state (the indicators of INEGI's own poverty page)
//   calendar  INEGI's release calendar PDFs (the dates of the products the page uses; tools/mx-consumidor/data/release-calendar.json
//             names them), read again only when a file changes
//
//   node scripts/mx-consumidor/fetch.mjs [--only=enigh,banxico] [--force]
//
// Each source writes tools/mx-consumidor/raw/<source>.json = { fetchedAt, data }, rewritten only when the data changed,
// so a quiet run commits nothing. A source that fails keeps its stored file; failures are counted in raw/status.json (the
// workflow opens a SOURCE DOWN issue after three in a row). Every series is checked against its published title before
// it is accepted. API tokens come from the environment and are removed from everything written.
import { writeFileSync, readFileSync, mkdtempSync, readdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAW, TOOLS, readJson, writeJson, writeText, exists, get, getJson, getText, getBuffer, secret, redact, sleep, nowIso, fold, sieSeries, sieCuadro, bieSeries, bieSearch, bieMeta, inegiToken, stateCode, BOT_UA } from './lib/common.mjs';
import { csvObjects } from './lib/csv.mjs';
import { BANXICO, CARD_GIROS, INEGI } from './lib/series.mjs';
import { aggregate } from './lib/enigh.mjs';
import { aggregateEnif } from './lib/enif.mjs';
import { fredJson } from '../lib/fred.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const tmp = mkdtempSync(join(tmpdir(), 'mx-consumidor-'));
const SKIP = Symbol('unchanged');   // a source whose publisher shows nothing new: the stored file stands
let NOTES = [];
const note = (msg) => { NOTES.push(redact(String(msg)).slice(0, 400)); console.log(`::warning::${redact(String(msg))}`); };
const INEGI_FILES = 'https://www.inegi.org.mx/contenidos/programas';

// HEAD of a file: { ok, type, lastModified, length }. INEGI answers 200 with an HTML page for a file that does not exist.
// Since 16-Oct-2026 INEGI's servers answer every HEAD with an empty text/html reply (no Last-Modified, no length) while a GET
// of the same address still returns the file with its headers; such a reply is read again from a GET's headers, and the
// body is dropped unread.
const headOfRes = (r) => ({ ok: true, type: r.headers.get('content-type') || '', lastModified: r.headers.get('last-modified') || null, length: Number(r.headers.get('content-length') || 0) });
async function headOf(url) {
  try {
    const h = headOfRes(await get(url, { method: 'HEAD', tries: 2, timeoutMs: 40_000 }));
    if (!(/text\/html/i.test(h.type) && !h.lastModified && !h.length)) return h;
    const r = await get(url, { tries: 2, timeoutMs: 60_000 });
    const g = headOfRes(r);
    try { await r.body?.cancel(); } catch { /* body already closed */ }
    return g;
  } catch (e) { return { ok: false, error: e.message }; }
}
const isZipHead = (h) => h.ok && /zip|octet-stream/i.test(h.type) && h.length > 100_000;
// What identifies a publisher's file between runs: the day of its Last-Modified header and its size. INEGI's servers answer
// with Last-Modified times a few seconds apart for the same file, so the full header would read as a new file on every run.
const mark = (h) => `${String(h.lastModified || '').slice(0, 16).trim()}|${h.length || 0}`;
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
    const lm = mark(heads[y]);
    const detail = y === latest ? 'full' : 'states';
    const tables = y === latest ? ['viviendas', 'hogares', 'poblacion'] : [];
    const lmExtra = {};
    for (const t of tables) { const h = await headOf(enighUrl(y, t)); if (!isZipHead(h)) throw new Error(`ENIGH ${y}: ${t} file missing`); lmExtra[t] = mark(h); }
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
    const meta = (await fredJson(`https://api.stlouisfed.org/fred/series?series_id=${spec.id}&api_key=${key}&file_type=json`)).seriess[0]; // shared reader (scripts/lib/fred.mjs)
    if (!spec.title.test(meta.title) || !spec.units.test(meta.units)) throw new Error(`FRED ${spec.id}: title "${meta.title}" (${meta.units}) does not match`);
    const obs = (await fredJson(`https://api.stlouisfed.org/fred/series/observations?series_id=${spec.id}&api_key=${key}&file_type=json&observation_start=2000-01-01`)).observations
      .filter((o) => o.value !== '.').map((o) => [period(o.date, 'Q'), Number(o.value)]);
    series[k] = { id: spec.id, title: meta.title, units: meta.units, updated: meta.last_updated, url: `https://fred.stlouisfed.org/series/${spec.id}`, obs };
    await sleep(300);
  }
  return { series, source: { name: 'Bank for International Settlements, total credit to households (through FRED)', url: 'https://data.bis.org/topics/TOTAL_CREDIT' } };
}

// ------------------------------------------------------------------------------------------------------------------
// INEGI and CNBV · ENIF microdata
// ------------------------------------------------------------------------------------------------------------------
const ENIF_V = 1;
const enifUrl = (y) => `${INEGI_FILES}/enif/${y}/microdatos/enif_${y}_bd_csv.zip`;
async function fetchEnif(prev) {
  const Y = new Date().getUTCFullYear();
  let year = null, head = null;
  for (let y = Y; y >= 2024; y--) { const h = await headOf(enifUrl(y)); if (isZipHead(h)) { year = y; head = h; break; } await sleep(300); }
  if (!year) throw new Error('no ENIF microdata file answered');
  if (prev && prev.v === ENIF_V && prev.year === year && prev.lastModified === mark(head) && !FORCE) return SKIP;
  const dir = await downloadZip(enifUrl(year), `enif${year}`);
  const data = aggregateEnif(year, { modulo: findFile(dir, /TMODULO\.csv$/i) });
  return { v: ENIF_V, year, lastModified: mark(head), ...data, source: { name: 'INEGI y CNBV, Encuesta Nacional de Inclusión Financiera (ENIF), microdatos', url: `https://www.inegi.org.mx/programas/enif/${year}/` } };
}

// ------------------------------------------------------------------------------------------------------------------
// Published documents kept as text (the figures curated from them are checked against this text by the builder)
// ------------------------------------------------------------------------------------------------------------------
const DOCS = {
  enfih2019: { url: `${INEGI_FILES}/enfih/2019/doc/enfih_2019_presentacion_resultados.pdf`, name: 'INEGI y Banco de México, Encuesta Nacional sobre las Finanzas de los Hogares (ENFIH) 2019, presentación de resultados', page: 'https://www.inegi.org.mx/programas/enfih/2019/', must: /Riqueza neta|RIQUEZA NETA/ },
};
async function fetchDocs(prev) {
  const out = { docs: {} }; let changed = false;
  for (const id of Object.keys(DOCS)) {
    const d = DOCS[id], h = await headOf(d.url), old = prev && prev.docs ? prev.docs[id] : null;
    if (!h.ok || !/pdf/i.test(h.type)) throw new Error(`${id}: ${d.url} did not answer with a PDF (${h.error || h.type})`);
    if (old && old.lastModified === mark(h) && exists(old.file) && !FORCE) { out.docs[id] = old; continue; }
    const buf = await getBuffer(d.url, { timeoutMs: 180_000 });
    if (buf.subarray(0, 4).toString('latin1') !== '%PDF') throw new Error(`${id}: not a PDF`);
    const pdf = join(tmp, `${id}.pdf`), txt = join(tmp, `${id}.txt`);
    writeFileSync(pdf, buf);
    execFileSync('python3', [new URL('./lib/pdf2text.py', import.meta.url).pathname, pdf, txt], { maxBuffer: 64 * 1024 * 1024 });
    const text = readFileSync(txt, 'utf8');
    if (!d.must.test(text) || text.length < 5000) throw new Error(`${id}: the text of the PDF does not look like the document (${text.length} characters)`);
    const file = `${RAW}docs/${id}.txt`;
    writeText(file, `# source: ${d.url}\n# document: ${d.name}\n# last-modified: ${String(h.lastModified || '').slice(0, 16).trim()}\n\n${text}`);
    out.docs[id] = { file, url: d.url, page: d.page, name: d.name, lastModified: mark(h), chars: text.length };
    changed = true;
  }
  if (!changed && prev) return SKIP;
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// INEGI · multidimensional poverty (the measurement INEGI took over from Coneval), national and by state
// ------------------------------------------------------------------------------------------------------------------
// percent of the population; the indicator ids are the ones INEGI's own poverty page charts, each checked against its description and unit
const POVERTY = {
  poverty: ['8999998769', /^Población en situación de pobreza$/i], extreme: ['8999998767', /^Población en situación de pobreza extrema$/i], moderate: ['8999998768', /^Población en situación de pobreza moderada$/i],
  vulnerableDeprivation: ['8999998766', /^Población vulnerable por carencias sociales$/i], vulnerableIncome: ['8999998765', /^Población vulnerable por ingresos$/i], notPoor: ['8999998764', /^Población no pobre y no vulnerable$/i],
  noSocialSecurity: ['8999998759', /^Carencia por acceso a la seguridad social$/i], noHealth: ['8999998760', /^Carencia por acceso a los servicios de salud$/i], food: ['8999998756', /^Carencia por acceso a la alimentación nutritiva y de calidad$/i],
  belowIncomeLine: ['8999998754', /^Población con ingreso inferior a la línea de pobreza por ingresos$/i], belowExtremeLine: ['8999998755', /^Población con ingreso inferior a la línea de pobreza extrema por ingresos$/i],
};
const POVERTY_COUNT = ['8999998751', /^Población en situación de pobreza$/i];   // thousands of people
async function fetchPoverty() {
  const token = inegiToken();
  const base = 'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml';
  const ids = [...Object.values(POVERTY).map((x) => x[0]), POVERTY_COUNT[0]];
  const names = {};
  for (const c of (await getJson(`${base}/CL_INDICATOR/${ids.join(',')}/es/BISE/2.0/${token}?type=json`, { ua: BOT_UA })).CODE || []) names[c.value] = String(c.Description || '').trim();
  for (const k of Object.keys(POVERTY)) if (!POVERTY[k][1].test(names[POVERTY[k][0]] || '')) throw new Error(`poverty indicator ${POVERTY[k][0]} is "${names[POVERTY[k][0]] || 'missing'}", not ${k}`);
  if (!POVERTY_COUNT[1].test(names[POVERTY_COUNT[0]] || '')) throw new Error(`poverty count indicator is "${names[POVERTY_COUNT[0]] || 'missing'}"`);
  const areas = ['00', ...Array.from({ length: 32 }, (_, i) => String(i + 1).padStart(2, '0'))];
  const read = async (area) => (await getJson(`${base}/INDICATOR/${ids.join(',')}/es/${area}/false/BISE/2.0/${token}?type=json`, { ua: BOT_UA })).Series || [];
  const out = { national: {}, states: {}, countNational: {} };
  const put = (series, area) => {
    for (const k of Object.keys(POVERTY)) {
      const s = series.find((x) => x.INDICADOR === POVERTY[k][0]); if (!s) throw new Error(`poverty: ${k} missing for area ${area}`);
      if (String(s.UNIT) !== '3') throw new Error(`poverty: ${k} has unit ${s.UNIT}, expected 3 (percent)`);
      const obs = Object.fromEntries((s.OBSERVATIONS || []).filter((o) => o.OBS_VALUE != null && o.OBS_VALUE !== '').map((o) => [o.TIME_PERIOD, Math.round(Number(o.OBS_VALUE) * 100) / 100]));
      if (area === '00') out.national[k] = obs; else (out.states[area] || (out.states[area] = {}))[k] = obs;
    }
    if (area === '00') { const c = series.find((x) => x.INDICADOR === POVERTY_COUNT[0]); if (c) out.countNational = Object.fromEntries((c.OBSERVATIONS || []).map((o) => [o.TIME_PERIOD, Math.round(Number(o.OBS_VALUE) * 1000)])); }
  };
  for (const a of areas) { put(await read(a), a); await sleep(250); }
  if (Object.keys(out.states).length !== 32) throw new Error(`poverty: ${Object.keys(out.states).length} states answered`);
  const years = Object.keys(out.national.poverty).sort();
  if (!years.length) throw new Error('poverty: no national observations');
  out.latest = years[years.length - 1]; out.years = years;
  out.source = { name: 'INEGI, Pobreza multidimensional', url: 'https://www.inegi.org.mx/desarrollosocial/pm/' };
  return out;
}

// ------------------------------------------------------------------------------------------------------------------
// BIS · total credit to households, from the BIS's own statistics API (SDMX), and the BIS's release dates
// ------------------------------------------------------------------------------------------------------------------
const BIS_SERIES = { hhCreditGdp: { key: 'Q.MX.H.A.M.770.A', title: /^Mexico - Credit to Households and NPISHs from All sectors at Market value - Percentage of GDP - Adjusted for breaks$/i } };
const BIS_TOPIC = 'https://data.bis.org/topics/TOTAL_CREDIT';
const MONTH_EN = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const enDate = (m) => (m && MONTH_EN[m[2].toLowerCase()] ? `${m[3]}-${String(MONTH_EN[m[2].toLowerCase()]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}` : null);
async function fetchBis() {
  const series = {};
  for (const k of Object.keys(BIS_SERIES)) {
    const s = BIS_SERIES[k];
    const rows = csvObjects(await getText(`https://stats.bis.org/api/v1/data/WS_TC/${s.key}?startPeriod=2000-Q1&format=csv`, { ua: BOT_UA, timeoutMs: 60_000 }));
    if (!rows.length) throw new Error(`BIS ${s.key}: no rows`);
    const title = rows[0].TITLE_TS || '';
    if (!s.title.test(title) || rows.some((r) => r.TITLE_TS !== title)) throw new Error(`BIS ${s.key}: title "${title}" does not match`);
    const obs = rows.filter((r) => /^\d{4}-Q[1-4]$/.test(r.TIME_PERIOD) && r.OBS_VALUE !== '' && Number.isFinite(Number(r.OBS_VALUE))).map((r) => [r.TIME_PERIOD, Number(r.OBS_VALUE)]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (obs.length < 40) throw new Error(`BIS ${s.key}: ${obs.length} observations`);
    series[k] = { key: s.key, title, units: 'Percentage of GDP', url: BIS_TOPIC, obs };
  }
  // the BIS prints the next and the last release of these statistics on their topic page; a page that no longer carries them
  // leaves the release dates out (the page then falls back to the usual timing) and says so in the run log
  let release = null;
  try {
    const t = (await getText(BIS_TOPIC, { timeoutMs: 60_000 })).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
    const next = enDate(/Next release date\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(t)), lastR = enDate(/Last release date\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(t));
    if (next || lastR) release = { next, last: lastR, url: BIS_TOPIC }; else note('BIS topic page: no "Next release date" found');
  } catch (e) { note(`BIS topic page: ${e.message}`); }
  return { series, release, source: { name: 'Bank for International Settlements, total credit to households (statistics API)', url: BIS_TOPIC } };
}

// ------------------------------------------------------------------------------------------------------------------
// INEGI · release calendar (the dates of the products the page uses)
// ------------------------------------------------------------------------------------------------------------------
const normProduct = (t) => fold(String(t)).replace(/\s+/g, ' ').replace(/\.$/, '').trim();
const bareProduct = (t) => normProduct(t).replace(/\s*\([^)]*\)$/, '').trim();
async function fetchCalendar(prev) {
  const cfg = (readJson(TOOLS + 'data/release-calendar.json', {}) || {}).inegi;
  if (!cfg || !cfg.sources) throw new Error('data/release-calendar.json has no INEGI section');
  const y = new Date().getUTCFullYear();
  const listed = cfg.files || [];
  const urls = [...new Set([...listed, ...(cfg.fileTemplate ? [y, y + 1].map((n) => cfg.fileTemplate.replace('{year}', n)) : [])])];
  const files = []; let changed = false;
  for (const url of urls) {
    const h = await headOf(url);
    if (!h.ok || !/pdf/i.test(h.type)) {   // INEGI answers a missing file with an HTML page
      if (listed.includes(url)) throw new Error(`${url} did not answer with a PDF (${h.error || h.type})`);
      continue;
    }
    const old = prev && (prev.files || []).find((f) => f.url === url);
    if (old && old.mark === mark(h) && !FORCE) { files.push(old); continue; }
    const buf = await getBuffer(url, { timeoutMs: 120_000 });
    if (buf.subarray(0, 4).toString('latin1') !== '%PDF') throw new Error(`${url}: not a PDF`);
    const pdf = join(tmp, 'calendar.pdf'), out = join(tmp, 'calendar.json');
    writeFileSync(pdf, buf);
    execFileSync('python3', [new URL('./lib/inegi_calendar.py', import.meta.url).pathname, pdf, out], { maxBuffer: 64 * 1024 * 1024, timeout: 240_000 });
    const cal = JSON.parse(readFileSync(out, 'utf8'));
    const sources = {};
    for (const [id, spec] of Object.entries(cfg.sources)) {
      const want = normProduct(spec.product);
      let hits = cal.products.filter((p) => p.periodicity === spec.periodicity && normProduct(p.product).startsWith(want) && p.releases.length);
      if (hits.length > 1) hits = hits.filter((p) => bareProduct(p.product) === bareProduct(spec.product));
      if (hits.length > 1) throw new Error(`${url}: "${spec.product}" (${spec.periodicity}) matches ${hits.length} products`);
      if (hits.length) sources[id] = hits[0].releases.filter((r) => r.period).map((r) => ({ date: r.date, period: r.period }));
    }
    files.push({ url, mark: mark(h), title: cal.title, year: cal.year, time: cal.time, products: cal.products.length, sources });
    changed = true;
  }
  if (!files.length) throw new Error('no INEGI calendar file answered');
  // one list per source; a later file wins for a period two files carry (a calendar of changes, a new half-year)
  const merged = {};
  for (const f of files) for (const [id, list] of Object.entries(f.sources)) for (const r of list) (merged[id] || (merged[id] = new Map())).set(r.period, r);
  const sources = Object.fromEntries(Object.entries(merged).map(([id, m]) => [id, [...m.values()].sort((a, b) => (a.date < b.date ? -1 : 1))]));
  for (const id of Object.keys(cfg.sources)) if (!sources[id]) note(`INEGI calendar: no file lists "${cfg.sources[id].product}" (${cfg.sources[id].periodicity})`);
  const sameFiles = prev && JSON.stringify((prev.files || []).map((f) => f.url)) === JSON.stringify(files.map((f) => f.url));
  if (!changed && sameFiles) return SKIP;
  return { time: files.find((f) => f.time) ? files.find((f) => f.time).time : null, files, sources };
}

// ------------------------------------------------------------------------------------------------------------------
const SOURCES = { enigh: fetchEnigh, banxico: fetchBanxico, cards: fetchCards, states: fetchStates, inegi: fetchInegi, bis: fetchBis, fred: fetchFred, enif: fetchEnif, docs: fetchDocs, poverty: fetchPoverty, calendar: fetchCalendar };
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
