// Pulls every series in tools/mx-macro/series.json and writes tools/mx-macro/data/series.json,
// the single data file the Mexico macro page is built from.
//
//   banxico  SIE API (https://www.banxico.org.mx/SieAPIRest). Needs BANXICO_TOKEN (free, instant:
//            https://www.banxico.org.mx/SieAPIRest/service/v1/token). Every response carries the
//            series title, which is checked against the manifest before the data is accepted.
//   fred     St. Louis Fed. With FRED_API_KEY the JSON API is used and the title is checked; without
//            it the public CSV export is used (no title metadata, so no check).
//   inegi    Indicadores API. Needs INEGI_TOKEN. Its response has no series name, so the manifest
//            only lists INEGI IDs that were confirmed by hand in the INEGI catalog.
//
// A series that fails on this run keeps the points from the committed data file (marked stale);
// one bad feed never blanks a section. Exit code is non-zero only if nothing could be fetched at
// all. Diagnostics: node scripts/mx-macro/fetch.mjs --probe banxico:SP1,inegi:496150 (prints what an id is)
//                    node scripts/mx-macro/fetch.mjs --catalog "actividad economica" (searches INEGI's catalog)

import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const ROOT = new URL('../../', import.meta.url);
const MANIFEST = new URL('tools/mx-macro/series.json', ROOT);
const OUT = new URL('tools/mx-macro/data/series.json', ROOT);
const UA = 'fnam-debt-monitor/1.0 (+https://github.com/marthavshelton-sys/fnam-debt-monitor)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const r4 = (x) => Math.round(x * 10000) / 10000;

async function http(url, headers = {}, tries = 3) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json, text/csv, */*', ...headers } });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status} ${await res.text().then((t) => t.slice(0, 160)).catch(() => '')}`);
      if ([400, 401, 403, 404].includes(res.status)) break;
    } catch (e) { last = e; }
    await sleep(1500 * i);
  }
  throw last;
}

// ---- date normalisation: every point is [d, v] with d = "YYYY-MM" (monthly), "YYYY-Qn"
// (quarterly) or "YYYY-MM-DD" (daily/weekly) ----
function normDate(iso, freq) {
  if (freq === 'M') return iso.slice(0, 7);
  if (freq === 'Q') return iso.slice(0, 4) + '-Q' + (Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1);
  return iso;
}

// ---------------- Banxico SIE ----------------
const banxicoCache = new Map();
async function banxicoBatch(ids, since) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('BANXICO_TOKEN not set');
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${ids.join(',')}/datos/${since}/${today()}`;
  const res = await http(url, { 'Bmx-Token': token });
  const body = await res.json();
  const series = body?.bmx?.series || [];
  for (const s of series) banxicoCache.set(s.idSerie, s);
}
async function banxico(cand, spec) {
  if (!banxicoCache.has(cand.id)) await banxicoBatch([cand.id], spec.since);
  const s = banxicoCache.get(cand.id);
  if (!s) throw new Error('not in response');
  const points = [];
  for (const o of s.datos || []) {
    if (!o.dato || o.dato === 'N/E') continue;
    const v = Number(String(o.dato).replace(/,/g, ''));
    if (!Number.isFinite(v)) continue;
    const [dd, mm, yyyy] = o.fecha.split('/');
    points.push([normDate(`${yyyy}-${mm}-${dd}`, spec.freq), r4(v)]);
  }
  return { title: s.titulo || '', points, url: `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${cand.id}/datos/oportuno` };
}

// ---------------- FRED ----------------
async function fred(cand, spec) {
  const key = process.env.FRED_API_KEY;
  if (key) {
    const meta = await (await http(`https://api.stlouisfed.org/fred/series?series_id=${cand.id}&api_key=${key}&file_type=json`)).json();
    const title = meta?.seriess?.[0]?.title || '';
    const obs = await (await http(`https://api.stlouisfed.org/fred/series/observations?series_id=${cand.id}&api_key=${key}&file_type=json&observation_start=${spec.since}`)).json();
    const points = (obs.observations || []).filter((o) => o.value !== '.' && Number.isFinite(Number(o.value)))
      .map((o) => [normDate(o.date, spec.freq), r4(Number(o.value))]);
    return { title, points, url: `https://fred.stlouisfed.org/series/${cand.id}` };
  }
  const csv = await (await http(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${cand.id}`)).text();
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(','));
  const points = rows.filter((r) => r[0] >= spec.since && r[1] && r[1] !== '.' && Number.isFinite(Number(r[1])))
    .map((r) => [normDate(r[0], spec.freq), r4(Number(r[1]))]);
  return { title: null, points, url: `https://fred.stlouisfed.org/series/${cand.id}` };
}

// ---------------- INEGI ----------------
// INEGI's public "desarrolladores" API answers "No se encontraron resultados" for every BIE
// (Banco de Información Económica) id, so BIE series come from the service INEGI's own query
// builder (inegi.org.mx/app/indicadores) calls: interna_v1_3/API.svc. There BIE is "tematica" 3
// and takes no geographic area ("null"); dates are whole years. The developer token from
// INEGI_TOKEN is accepted; the token INEGI's own page script carries is the fallback.
const INEGI_BASE = 'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml';
const INEGI_API = 'https://www.inegi.org.mx/app/api/indicadores/interna_v1_3/API.svc';
const INEGI_PUBLIC_TOKEN = 'fb6730a1-d0c7-ebe9-65d1-d3dbb8d93457';
function inegiToken() { return process.env.INEGI_TOKEN || INEGI_PUBLIC_TOKEN; }
const INEGI_FREQ = { Mensual: 'M', Trimestral: 'Q', Anual: 'A', Semanal: 'W', Diaria: 'D' };
// Full-text search of INEGI's Banco de Información Económica: the same request INEGI's own query
// builder sends from its search box. Returns [{INDICADOR, TITULO}] with the full topic path as the
// title; needs no token.
async function bieSearch(q) {
  const base = process.env.INEGI_SEARCH_BASE || 'https://www.inegi.org.mx/';
  const body = { busqueda: q, busquedaCiencia: '', paginaInicio: 0, paginaFin: 40, filtrobusqueda: 'CBUSQUEDA', filtrotema: 'null', orderby: 'RANKING', orderbyAscDesc: 'Desc', metodoBusqueda: 1, herramienta: 32 };
  const res = await fetch(base + 'app/api/buscadorcore/v1/busquedaBIE/', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`busquedaBIE HTTP ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((r) => ({ INDICADOR: String(r.INDICADOR ?? ''), TITULO: String(r.TITULO ?? '').replace(/#null/g, '').replace(/\s+/g, ' ').trim() }));
}
// Indicator metadata from the query-builder service: name, unit, frequency, topic path, last update.
async function inegiMetadata(id, from, to) {
  const base = process.env.INEGI_API_BASE || INEGI_API;
  const body = await (await http(`${base}/MetadatoIndicador/es/${id}/null/${from}/${to}/null/3/json/${inegiToken()}`)).json();
  if (!body || body.ErrorCode || !body.NOMBRE_INDICADOR) throw new Error(`INEGI metadata: ${body?.ErrorInfo || 'empty'}`);
  // TEMAS[0].Ruta_tematica is the full topic path ending in the indicator name, e.g.
  // "Indicadores económicos de coyuntura > Confianza del consumidor > ... > Indicador".
  const name = String(body.NOMBRE_INDICADOR).replace(/\s+/g, ' ').trim();
  const path = String(body.TEMAS?.[0]?.Ruta_tematica || '').replace(/\s+/g, ' ').trim() || name;
  return { name, path, unit: body.NOMBRE_UNIDAD, freq: body.NOMBRE_FRECUENCIA, lastUpdate: body.ULTIMA_FECHA_ACTUALIZACION, periodEnd: body.PERIODO_FINAL, source: body.FUENTES?.[0]?.NOMBRE_FUENTE };
}
// Title for an INEGI id: the BIE search (candidate `search` query) gives the full topic path, which
// is what the manifest regex is written against; the metadata endpoint's topic path is the fallback.
async function inegiTitle(id, cand, from, to) {
  if (cand && cand.search) {
    try { const row = (await bieSearch(cand.search)).find((r) => r.INDICADOR === String(id)); if (row) return row.TITULO; } catch (e) { /* fall through */ }
  }
  try { return (await inegiMetadata(id, from, to)).path; } catch (e) { return ''; }
}
// One or more BIE ids -> the query builder's export table: row 0 is the header (a "Periodos" cell,
// then one cell per id carrying frequency and unit); every other row is a period followed by one
// value per id. Values are strings; blanks, "N/D" and the like are gaps.
async function inegiExport(ids, from, to) {
  const base = process.env.INEGI_API_BASE || INEGI_API;
  const body = { areasGeograficas: 'null', casoExportacion: 'indicadorVertical', fechaInicio: String(from), fechaFin: String(to), formato: 'json', idioma: 'es', indicadores: ids.join(','), mostrarDecimales: 'true', mostrarEstadistico: 'false', ordenaPeriodo: 'ap', orden: 'a', tematica: '3', token: inegiToken() };
  let last;
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(`${base}/ExportacionBancoInformacion`, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data)) return data.map((r) => (r && Array.isArray(r.listaCeldas) ? r.listaCeldas : []));
      // The service answers 202 + {ErrorCode, ErrorInfo} both for unknown ids and for outages.
      last = new Error(`INEGI export: ${data?.ErrorInfo || data?.ErrorDetails || 'HTTP ' + res.status}`);
      if (data?.ErrorCode === '100') break; // "No se encontraron resultados": not transient
    } catch (e) { last = e; }
    await sleep(1500 * i);
  }
  throw last;
}
async function inegi(cand, spec) {
  const from = spec.since.slice(0, 4), to = String(new Date().getUTCFullYear() + 1);
  const rows = await inegiExport([cand.id], from, to);
  const header = rows[0] || [];
  const col = header.findIndex((c, i) => i > 0 && String(c?.valor ?? '').trim() === String(cand.id));
  if (col < 0) throw new Error('id missing from export header');
  const freq = INEGI_FREQ[String(header[col]?.frecuencia ?? '').trim()] || null;
  const points = [];
  for (const cells of rows.slice(1)) {
    const raw = String(cells[col]?.valor ?? '').replace(/,/g, '').trim();
    if (!/^-?\d+(\.\d+)?$/.test(raw)) continue;
    const [y, p] = String(cells[0]?.valor ?? '').replace(/\\/g, '').split('/');
    if (!/^\d{4}$/.test(y || '')) continue;
    let d;
    if (spec.freq === 'Q') d = `${y}-Q${String(p).replace(/^0/, '')}`;
    else if (spec.freq === 'M') d = `${y}-${String(p).padStart(2, '0')}`;
    else if (spec.freq === 'A') d = y;
    else d = p ? `${y}-${p}` : y;
    if (d.slice(0, 4) >= spec.since.slice(0, 4)) points.push([d, r4(Number(raw))]);
  }
  points.sort((a, b) => a[0].localeCompare(b[0]));
  const title = await inegiTitle(cand.id, cand, from, to);
  return { title: title || null, points, url: `https://www.inegi.org.mx/app/indicadores/?ind=${cand.id}#divFV${cand.id}`, meta: { freq, unit: header[col]?.unidad } };
}
// Downloads INEGI's full BIE indicator catalog and prints every entry whose description matches
// the regex (accent-insensitive). Used from the workflow's "catalog" input to find indicator ids.
const fold = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function inegiCatalogSearch(pattern, limit = 80) {
  const body = await (await http(`${INEGI_BASE}/CL_INDICATOR/es/BIE/2.0/${inegiToken()}?type=json`)).json();
  const rows = body?.CODE || [];
  const re = new RegExp(fold(pattern), 'i');
  const hits = rows.filter((r) => re.test(fold(r.Description || ''))).slice(0, limit);
  return { total: rows.length, hits: hits.map((r) => [String(r.value), String(r.Description || '').replace(/\s+/g, ' ').trim()]) };
}

// Minimal .zip reader (stored and deflate entries) so the xlsx diagnostic needs no dependency.
function unzip(buf) {
  const zlib = require('node:zlib');
  let eocd = buf.length - 22; while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const files = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lh = off, lnlen = buf.readUInt16LE(lh + 26), lxlen = buf.readUInt16LE(lh + 28), start = lh + 30 + lnlen + lxlen;
    const data = buf.subarray(start, start + csize);
    if (/\.xml$/.test(name)) files[name] = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

const PROVIDERS = { banxico, fred, inegi };
const PROVIDER_LABEL = { banxico: 'Banxico SIE', fred: 'FRED', inegi: 'INEGI' };

function minPoints(freq) { return freq === 'Q' ? 8 : freq === 'M' ? 24 : 50; }
// A provider that stopped updating a series (FRED's OECD mirrors do this) must not put
// two-year-old data on the page as if it were current: the candidate is skipped instead.
function isDiscontinued(lastDate, freq) {
  const now = new Date();
  if (freq === 'Q') { const y = +lastDate.slice(0, 4), q = +lastDate.slice(6); return (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - q * 3) > 12; }
  if (freq === 'M') { const y = +lastDate.slice(0, 4), m = +lastDate.slice(5, 7); return (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m) > 15; }
  return (now - new Date(lastDate + 'T00:00:00Z')) / 86400000 > 120;
}

async function fetchOne(key, spec, log) {
  const tried = [];
  for (const cand of spec.candidates) {
    const cspec = cand.freq ? { ...spec, freq: cand.freq } : spec;
    try {
      const r = await PROVIDERS[cand.provider](cand, cspec);
      if (cand.title && r.title !== null && !new RegExp(cand.title, 'i').test(r.title)) {
        tried.push(`${cand.provider}:${cand.id} title mismatch ("${r.title}")`);
        log.warn(`${key}: ${cand.provider} ${cand.id} answered but its title "${r.title}" does not match /${cand.title}/ - dropped`);
        continue;
      }
      r.points.sort((a, b) => a[0].localeCompare(b[0]));
      // de-duplicate on date (daily series can repeat a day; keep the last value)
      const byDate = new Map(r.points); r.points = [...byDate.entries()];
      if (r.points.length < minPoints(cspec.freq)) { tried.push(`${cand.provider}:${cand.id} only ${r.points.length} points`); continue; }
      const lastDate = r.points[r.points.length - 1][0];
      if (isDiscontinued(lastDate, cspec.freq)) {
        tried.push(`${cand.provider}:${cand.id} discontinued (last point ${lastDate})`);
        log.warn(`${key}: ${cand.provider} ${cand.id} last observation is ${lastDate}; treated as discontinued and skipped`);
        continue;
      }
      return {
        provider: cand.provider, providerLabel: PROVIDER_LABEL[cand.provider], id: cand.id, title: r.title, url: r.url,
        note: cand.note || null, freq: cspec.freq, unit: spec.unit, fetchedAt: today(), points: r.points, tried,
      };
    } catch (e) {
      tried.push(`${cand.provider}:${cand.id} ${e.message}`);
    }
  }
  throw new Error(tried.join(' | '));
}

async function main() {
  const argv = process.argv.slice(2);
  const probeIdx = argv.indexOf('--probe');
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

  const catIdx = argv.indexOf('--catalog');
  if (probeIdx >= 0 || catIdx >= 0 || argv.includes('--url') || argv.includes('--xlsx') || argv.includes('--search') || argv.includes('--post')) {
    // Diagnostics only: nothing is written. --probe banxico:SP1,inegi:496150 prints what each id is;
    // --catalog "actividad economica" searches INEGI's indicator catalog by description.
    const lines = [];
    const out = (l) => { console.log(l); lines.push(l); };
    if (catIdx >= 0) {
      const pattern = argv[catIdx + 1] || '';
      try {
        const r = await inegiCatalogSearch(pattern);
        out(`INEGI catalog: ${r.total} indicators, ${r.hits.length} shown for /${pattern}/`);
        for (const [id, desc] of r.hits) out(`  ${id}\t${desc}`);
      } catch (e) { out(`INEGI catalog search failed: ${e.message}`); }
    }
    const urlIdx = argv.indexOf('--url');
    if (urlIdx >= 0) {
      // Raw endpoint check: fetch each whitespace-separated URL ({INEGI_TOKEN}/{BANXICO_TOKEN}/{FRED_API_KEY}
      // are substituted from the environment) and print the status plus the start of the body, tokens masked.
      const sub = (u) => u.replace('{INEGI_TOKEN}', process.env.INEGI_TOKEN || '').replace('{BANXICO_TOKEN}', process.env.BANXICO_TOKEN || '').replace('{FRED_API_KEY}', process.env.FRED_API_KEY || '');
      const mask = (t) => [process.env.INEGI_TOKEN, process.env.BANXICO_TOKEN, process.env.FRED_API_KEY].filter(Boolean).reduce((a, k) => a.split(k).join('***'), t);
      // Each item is URL or URL#regex: with a regex, only matching lines are printed (up to 80), else the first 2500 chars.
      for (const item of (argv[urlIdx + 1] || '').split(/\s+/).filter(Boolean)) {
        // URL#regex filters lines; URL##regex forces match-with-context mode even on multi-line bodies.
        const forceCtx = item.includes('##');
        const [raw, pat] = item.split(/#{1,2}/);
        try {
          const res = await fetch(sub(raw), { headers: { 'User-Agent': UA, Accept: 'application/json, */*', ...(raw.includes('banxico') ? { 'Bmx-Token': process.env.BANXICO_TOKEN || '' } : {}) } });
          const body = await res.text();
          out(`${raw}\n  -> HTTP ${res.status} ${res.headers.get('content-type') || ''} ${body.length} bytes`);
          if (pat) {
            // Short lines: print matching lines. Minified/one-line bodies: print each match with context.
            const lines = body.split(/\r?\n/);
            if (lines.length > 20 && !forceCtx) {
              const re = new RegExp(pat, 'i');
              for (const l of lines.filter((l) => re.test(l)).slice(0, 80)) out('  | ' + mask(l.trim().slice(0, 400)));
            } else {
              const re = new RegExp(pat, 'gi'); let m, n = 0;
              while ((m = re.exec(body)) && n++ < 120) out('  @' + m.index + ' ' + mask(body.slice(Math.max(0, m.index - 100), m.index + m[0].length + 160).replace(/\s+/g, ' ')));
            }
          } else out('  ' + mask(body.replace(/\s+/g, ' ').slice(0, 2500)));
        } catch (e) { out(`${raw}\n  -> ERROR ${e.message}`); }
      }
    }
    const searchIdx = argv.indexOf('--search');
    if (searchIdx >= 0) {
      // BIE full-text search, the same request INEGI's own query builder sends from its search box.
      // Prints INDICADOR ids with titles; needs no token.
      for (const q of (argv[searchIdx + 1] || '').split('|').map((x) => x.trim()).filter(Boolean)) {
        try {
          const rows = await bieSearch(q);
          out(`search "${q}" -> ${rows.length} results`);
          for (const r of rows) out(`  ${r.INDICADOR}\t${r.TITULO.slice(0, 300)}`);
        } catch (e) { out(`search "${q}" -> ERROR ${e.message}`); }
      }
    }
    const postIdx = argv.indexOf('--post');
    if (postIdx >= 0) {
      // --post "URL {json} ;; URL {json}" : JSON POST with token placeholders substituted, prints status + body start.
      const sub = (u) => u.replace(/\{INEGI_TOKEN\}/g, process.env.INEGI_TOKEN || '').replace(/\{BANXICO_TOKEN\}/g, process.env.BANXICO_TOKEN || '');
      const mask = (t) => [process.env.INEGI_TOKEN, process.env.BANXICO_TOKEN, process.env.FRED_API_KEY].filter(Boolean).reduce((a, k) => a.split(k).join('***'), t);
      for (const item of (argv[postIdx + 1] || '').split(';;').map((x) => x.trim()).filter(Boolean)) {
        const sp = item.indexOf(' '); const url = item.slice(0, sp), body = item.slice(sp + 1).trim();
        try {
          const res = await fetch(sub(url), { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json, */*' }, body: sub(body) });
          const txt = await res.text();
          out(`POST ${url}\n  body ${body.slice(0, 300)}\n  -> HTTP ${res.status} ${res.headers.get('content-type') || ''} ${txt.length} bytes\n  ${mask(txt.replace(/\s+/g, ' ').slice(0, 2500))}`);
        } catch (e) { out(`POST ${url} -> ERROR ${e.message}`); }
      }
    }
    const xlsxIdx = argv.indexOf('--xlsx');
    if (xlsxIdx >= 0) {
      // --xlsx URL#regex : download a workbook and print the rows whose text matches (first sheet, plus headers).
      const [raw, pat] = (argv[xlsxIdx + 1] || '').split('#');
      try {
        const buf = Buffer.from(await (await fetch(raw, { headers: { 'User-Agent': UA } })).arrayBuffer());
        const files = unzip(buf);
        const sst = [...(files['xl/sharedStrings.xml'] || '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join(''));
        const sheetName = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
        const rows = [...(files[sheetName] || '').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) =>
          [...r[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)].map((c) => { const v = (c[2].match(/<v>([^<]*)<\/v>/) || [])[1]; const inl = (c[2].match(/<t[^>]*>([^<]*)<\/t>/) || [])[1]; return /t="s"/.test(c[1]) ? (sst[Number(v)] || '') : (inl ?? v ?? ''); }).join(' | '));
        out(`${raw}: ${Object.keys(files).length} parts, sheet ${sheetName}, ${rows.length} rows, ${sst.length} shared strings`);
        rows.slice(0, 3).forEach((r) => out('  H ' + r.slice(0, 300)));
        const re = new RegExp(fold(pat || '.'), 'i');
        rows.filter((r) => re.test(fold(r))).slice(0, 200).forEach((r) => out('  | ' + r.slice(0, 400)));
      } catch (e) { out(`${raw} -> ERROR ${e.message}`); }
    }
    if (probeIdx >= 0) {
      for (const item of (argv[probeIdx + 1] || '').split(',').filter(Boolean)) {
        const [provider, id] = item.split(':');
        try {
          const r = await PROVIDERS[provider]({ id }, { freq: 'M', since: '2015-01-01' });
          out(`${provider}:${id}\t${r.title ?? '(no title metadata)'}\t${r.points.length} pts\tfirst ${JSON.stringify(r.points[0])}\tlast ${JSON.stringify(r.points.at(-1))}${r.meta ? '\t' + JSON.stringify(r.meta) : ''}`);
        } catch (e) { out(`${provider}:${id}\tERROR ${e.message}`); }
      }
    }
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Series diagnostics\n\n```\n' + lines.join('\n') + '\n```\n');
    return;
  }

  const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { series: {} };
  const warnings = [];
  const log = { warn: (m) => { warnings.push(m); console.warn('  ! ' + m); } };
  const out = { generatedAt: new Date().toISOString(), series: {} };
  const rows = [];
  let ok = 0, failed = 0;

  // Batch the Banxico candidates that lead each list so the API sees a handful of calls, not one per series.
  const banxicoFirst = Object.entries(manifest.series).filter(([, s]) => s.candidates[0].provider === 'banxico');
  const bySince = new Map();
  for (const [, s] of banxicoFirst) { const arr = bySince.get(s.since) || []; arr.push(s.candidates[0].id); bySince.set(s.since, arr); }
  for (const [since, ids] of bySince) {
    for (let i = 0; i < ids.length; i += 10) {
      try { await banxicoBatch(ids.slice(i, i + 10), since); } catch (e) { console.warn(`  ! Banxico batch failed (${e.message}); series will be retried one by one`); }
      await sleep(400);
    }
  }

  for (const [key, spec] of Object.entries(manifest.series)) {
    try {
      const s = await fetchOne(key, spec, log);
      out.series[key] = s; ok++;
      const last = s.points.at(-1);
      rows.push([key, `${s.providerLabel} ${s.id}`, s.title ?? '(csv, unchecked)', last[0], String(last[1]), s.points.length, 'ok']);
      console.log(`${key.padEnd(20)} ${s.providerLabel} ${s.id}  ${s.points.length} pts  last ${last[0]} = ${last[1]}`);
    } catch (e) {
      failed++;
      let stale = prev.series?.[key];
      // Last-good data is kept only while it is still within the freshness limit; beyond that the
      // section goes to "pending" rather than showing years-old figures as if they were current.
      if (stale && isDiscontinued(stale.points[stale.points.length - 1][0], stale.freq)) {
        log.warn(`${key}: previous data ends ${stale.points[stale.points.length - 1][0]} and is past the freshness limit - dropped`);
        stale = null;
      }
      if (stale) {
        out.series[key] = { ...stale, stale: true, staleSince: stale.fetchedAt, error: e.message };
        rows.push([key, `${stale.providerLabel} ${stale.id}`, stale.title ?? '', stale.points.at(-1)?.[0] ?? '', '', stale.points.length, `STALE since ${stale.fetchedAt}: ${e.message}`]);
      } else {
        rows.push([key, '', '', '', '', 0, `MISSING: ${e.message}`]);
      }
      console.error(`${key.padEnd(20)} FAILED ${e.message}${stale ? ' (kept previous points)' : ''}`);
    }
    await sleep(250);
  }

  await mkdir(new URL('./', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out) + '\n', 'utf8');
  console.log(`\nWrote ${OUT.pathname}: ${ok} series fetched, ${failed} failed/stale.`);

  // GitHub Actions: a table in the run summary so a wrong ID or a dead feed is visible without opening logs.
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['## Mexico macro data refresh', '', '| series | source | title reported by source | last date | last value | points | status |', '|---|---|---|---|---|---|---|',
      ...rows.map((r) => '| ' + r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |'), ''];
    if (warnings.length) md.push('**Warnings**', '', ...warnings.map((w) => '- ' + w), '');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, md.join('\n'));
  }
  for (const w of warnings) console.log(`::warning::${w}`);
  const missing = rows.filter((r) => String(r[6]).startsWith('MISSING')).map((r) => r[0]);
  if (missing.length) console.log(`::warning::series with no data at all (section will show as pending): ${missing.join(', ')}`);
  if (ok === 0) { console.error('Nothing could be fetched.'); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
