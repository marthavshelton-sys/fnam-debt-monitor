// Shared helpers for the Mexican Consumer pipeline (scripts/mx-consumidor/*): paths, JSON files, fetch with a time limit
// and retries, secret redaction, and the readers of the two official APIs the page uses most (INEGI's Banco de
// Información Económica and Banxico's Sistema de Información Económica).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const p = (rel) => join(ROOT, rel);
export const TOOLS = 'tools/mx-consumidor/';
export const RAW = 'tools/mx-consumidor/raw/';
export const SITE = 'site/mx/consumidor/';

export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
export const BOT_UA = 'fnam-debt-monitor-bot/1.0';
// The SEC asks automated clients for a descriptive User-Agent with a contact; the repository variable carries it.
export const SEC_UA = process.env.EDGAR_USER_AGENT || 'fnam.mx mexican-consumer (contact via repository)';

export function readJson(rel, fallback = null) {
  try { return JSON.parse(readFileSync(p(rel), 'utf8')); } catch { return fallback; }
}
export function writeJson(rel, obj) {
  mkdirSync(dirname(p(rel)), { recursive: true });
  writeFileSync(p(rel), JSON.stringify(obj, null, 1) + '\n', 'utf8');
}
export function writeText(rel, text) {
  mkdirSync(dirname(p(rel)), { recursive: true });
  writeFileSync(p(rel), text, 'utf8');
}
export function readText(rel, fallback = null) {
  try { return readFileSync(p(rel), 'utf8'); } catch { return fallback; }
}
export const exists = (rel) => existsSync(p(rel));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// API keys never reach a committed file: every value registered here is removed from whatever is written.
const SECRETS = new Set();
export function secret(name) {
  const v = process.env[name] || '';
  if (v) SECRETS.add(v);
  return v;
}
export function redact(s) {
  let out = String(s);
  for (const v of SECRETS) if (v.length >= 6) out = out.split(v).join('***');
  return out;
}

// fetch with a hard time limit; retries on network errors, 429 and 5xx (a 403/404 is an answer, not retried).
export async function get(url, { ua = BROWSER_UA, headers = {}, method = 'GET', body = null, timeoutMs = 90_000, tries = 3, accept = '*/*' } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, body, headers: { 'User-Agent': ua, Accept: accept, 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.7', ...headers }, signal: ctrl.signal, redirect: 'follow' });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status} ${redact(url)}`);
      last.status = res.status;
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = new Error(`${e && e.name === 'AbortError' ? `timed out after ${timeoutMs / 1000}s` : (e && e.message) || e} ${redact(url)}`);
    } finally { clearTimeout(timer); }
    await sleep(2000 * (i + 1));
  }
  throw last;
}
export async function getJson(url, opts) { return (await get(url, { accept: 'application/json', ...opts })).json(); }
export async function getText(url, opts) { return (await get(url, opts)).text(); }
export async function getBuffer(url, opts) { return Buffer.from(await (await get(url, opts)).arrayBuffer()); }
export async function getLatin1(url, opts) { return new TextDecoder('latin1').decode(await getBuffer(url, opts)); }

// SEC fair access: far below 10 requests a second.
export async function secGet(url, kind = 'text') {
  const res = await get(url, { ua: SEC_UA, accept: kind === 'json' ? 'application/json' : 'text/html,*/*' });
  await sleep(220);
  return kind === 'json' ? res.json() : res.text();
}

export function decodeEntities(s) {
  const named = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü', iquest: '¿', iexcl: '¡', deg: '°', ordm: 'º', ordf: 'ª' };
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([A-Za-z]+);/g, (m, n) => (n in named ? named[n] : m));
}
// HTML to plain text that keeps a table readable: one row per line, cells separated by " | ".
export function htmlToText(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|ix:header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = decodeEntities(s).replace(/[​­]/g, '').replace(/[ \t ]+/g, ' ');
  return s.split('\n')
    .map((l) => l.replace(/(\s*\|\s*)+$/g, '').replace(/^(\s*\|\s*)+/g, '').replace(/\s*\|(\s*\|)+\s*/g, ' | ').trim())
    .filter(Boolean).join('\n');
}

export const nowIso = () => new Date().toISOString();
export const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
export const fold = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const r = (v, d = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

// ---------------------------------------------------------------------------------------------------------------------
// INEGI · Banco de Información Económica (BIE)
// ---------------------------------------------------------------------------------------------------------------------
// The public developer API answers "No se encontraron resultados" for BIE ids; the series come from the service INEGI's
// own query builder (inegi.org.mx/app/indicadores) uses. It accepts the developer token (INEGI_TOKEN); the token INEGI's
// page script carries is the fallback.
const INEGI_API = 'https://www.inegi.org.mx/app/api/indicadores/interna_v1_3/API.svc';
const INEGI_PUBLIC_TOKEN = 'fb6730a1-d0c7-ebe9-65d1-d3dbb8d93457';
export const inegiToken = () => secret('INEGI_TOKEN') || INEGI_PUBLIC_TOKEN;
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

// Full-text search of the BIE (the request of INEGI's own search box): [{ id, title }] with the full topic path as title.
export async function bieSearch(q, { from = 0, to = 40 } = {}) {
  const body = { busqueda: q, busquedaCiencia: '', paginaInicio: from, paginaFin: to, filtrobusqueda: 'CBUSQUEDA', filtrotema: 'null', orderby: 'RANKING', orderbyAscDesc: 'Desc', metodoBusqueda: 1, herramienta: 32 };
  const data = await (await get('https://www.inegi.org.mx/app/api/buscadorcore/v1/busquedaBIE/', { method: 'POST', headers: JSON_HEADERS, accept: 'application/json', body: JSON.stringify(body) })).json();
  return (Array.isArray(data) ? data : []).map((x) => ({ id: String(x.INDICADOR ?? ''), title: String(x.TITULO ?? '').replace(/#null/g, '').replace(/\s+/g, ' ').trim() }));
}
// Name, unit, frequency, topic path and last update of one indicator.
export async function bieMeta(id, from = 2000, to = new Date().getUTCFullYear() + 1) {
  const body = await getJson(`${INEGI_API}/MetadatoIndicador/es/${id}/null/${from}/${to}/null/3/json/${inegiToken()}`);
  if (!body || body.ErrorCode || !body.NOMBRE_INDICADOR) throw new Error(`INEGI metadata ${id}: ${body?.ErrorInfo || 'empty'}`);
  const name = String(body.NOMBRE_INDICADOR).replace(/\s+/g, ' ').trim();
  return { id: String(id), name, path: String(body.TEMAS?.[0]?.Ruta_tematica || '').replace(/\s+/g, ' ').trim() || name, unit: body.NOMBRE_UNIDAD, freq: body.NOMBRE_FRECUENCIA, lastUpdate: body.ULTIMA_FECHA_ACTUALIZACION, periodEnd: body.PERIODO_FINAL, source: body.FUENTES?.[0]?.NOMBRE_FUENTE };
}
// One or more BIE ids -> { id: { freq, unit, points: [[period, value], ...] } }; period = 'YYYY', 'YYYY-MM' or 'YYYY-Qn'.
export async function bieSeries(ids, from = 2000, to = new Date().getUTCFullYear() + 1) {
  const body = { areasGeograficas: 'null', casoExportacion: 'indicadorVertical', fechaInicio: String(from), fechaFin: String(to), formato: 'json', idioma: 'es', indicadores: ids.join(','), mostrarDecimales: 'true', mostrarEstadistico: 'false', ordenaPeriodo: 'ap', orden: 'a', tematica: '3', token: inegiToken() };
  let last;
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(`${INEGI_API}/ExportacionBancoInformacion`, { method: 'POST', headers: { 'User-Agent': BOT_UA, Accept: 'application/json', ...JSON_HEADERS }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data)) {
        const rows = data.map((x) => (x && Array.isArray(x.listaCeldas) ? x.listaCeldas : []));
        const header = rows[0] || [], out = {};
        const FREQ = { Mensual: 'M', Trimestral: 'Q', Anual: 'A', Quincenal: 'F', Semestral: 'S' };
        header.forEach((c, col) => {
          if (col === 0) return;
          const id = String(c?.valor ?? '').trim();
          const freq = FREQ[String(c?.frecuencia ?? '').trim()] || null, points = [];
          for (const cells of rows.slice(1)) {
            const raw = String(cells[col]?.valor ?? '').replace(/,/g, '').trim();
            if (!/^-?\d+(\.\d+)?$/.test(raw)) continue;
            const [y, per] = String(cells[0]?.valor ?? '').replace(/\\/g, '').split('/');
            if (!/^\d{4}$/.test(y || '')) continue;
            const d = freq === 'Q' ? `${y}-Q${String(per).replace(/^0/, '')}` : freq === 'M' ? `${y}-${String(per).padStart(2, '0')}` : freq === 'A' || !per ? y : `${y}-${per}`;
            points.push([d, Number(raw)]);
          }
          points.sort((a, b) => a[0].localeCompare(b[0]));
          out[id] = { freq, unit: c?.unidad || null, points };
        });
        return out;
      }
      last = new Error(`INEGI export: ${data?.ErrorInfo || data?.ErrorDetails || 'HTTP ' + res.status}`);
      if (data?.ErrorCode === '100') break;   // "No se encontraron resultados": not transient
    } catch (e) { last = e; }
    await sleep(1500 * i);
  }
  throw last;
}

// ---------------------------------------------------------------------------------------------------------------------
// Banxico · Sistema de Información Económica (SIE)
// ---------------------------------------------------------------------------------------------------------------------
// API (needs BANXICO_TOKEN): up to 20 series per request -> { id: { title, points: [[YYYY-MM-DD, value], ...] } }
export async function sieSeries(ids, since = '2000-01-01') {
  const token = secret('BANXICO_TOKEN');
  if (!token) throw new Error('BANXICO_TOKEN is not set');
  const out = {}, today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const body = await getJson(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${chunk.join(',')}/datos/${since}/${today}`, { ua: BOT_UA, headers: { 'Bmx-Token': token } });
    for (const s of body?.bmx?.series || []) {
      const points = [];
      for (const o of s.datos || []) {
        if (!o.dato || o.dato === 'N/E') continue;
        const v = Number(String(o.dato).replace(/,/g, ''));
        if (!Number.isFinite(v)) continue;
        const [dd, mm, yyyy] = o.fecha.split('/');
        points.push([`${yyyy}-${mm}-${dd}`, v]);
      }
      out[s.idSerie] = { title: String(s.titulo || '').replace(/\s+/g, ' ').trim(), points };
    }
    await sleep(400);
  }
  return out;
}
// Metadata of series (title, periodicity, unit, first and last date) from the API.
export async function sieMeta(ids) {
  const token = secret('BANXICO_TOKEN');
  if (!token) throw new Error('BANXICO_TOKEN is not set');
  const out = [];
  for (let i = 0; i < ids.length; i += 20) {
    const body = await getJson(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${ids.slice(i, i + 20).join(',')}`, { ua: BOT_UA, headers: { 'Bmx-Token': token } });
    for (const s of body?.bmx?.series || []) out.push({ id: s.idSerie, title: String(s.titulo || '').replace(/\s+/g, ' ').trim(), from: s.fechaInicio, to: s.fechaFin, freq: s.periodicidad, unit: s.unidad, figure: s.cifra });
    await sleep(400);
  }
  return out;
}
// The series of a public SIE table page (no token): [{ id, freq, unit, from, to, label, level }] with headings as { heading }.
export async function sieCuadro(idCuadro, sector) {
  const accion = /^CA/.test(idCuadro) ? 'consultarCuadroAnalitico' : 'consultarCuadro';
  const html = await getLatin1(`https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=${accion}&idCuadro=${idCuadro}&sector=${sector || 1}&locale=es`, { ua: BOT_UA });
  const dec = (t) => decodeEntities(String(t || '')).replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();
  const title = dec((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const out = [];
  for (const m of html.matchAll(/<tr id="(nodo_[\d_]+)"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const body = m[2], level = m[1].split('_').length - 1;
    const id = (body.match(/<div>Serie:<\/div><div>(S[A-Z]\d{3,7})\.<\/div>/) || [])[1];
    const meta = (k) => dec((body.match(new RegExp('<div>' + k + ':<\\/div><div>([^<]*)<\\/div>')) || [])[1]).replace(/\.$/, '');
    if (id) out.push({ id, level, freq: meta('Periodicidad'), figure: meta('Tipo de Cifra'), unit: meta('Tipo de Unidad'), from: meta('Fecha(?:&nbsp;|\\s)inicial'), to: meta('Fecha(?:&nbsp;|\\s)final'), label: dec((body.match(/Mostrar metadatos de la serie ([\s\S]*?)<\/span>/) || [])[1]) });
    else { const t = dec(body.replace(/<!--[\s\S]*?-->/g, '').replace(/data-content="[^"]*"/g, '').replace(/Mostrar elementos de [^<]*/g, '')); if (t && !/^(Fuente|Nota|Notas):/.test(t)) out.push({ heading: t.slice(0, 160), level }); }
  }
  return { title, rows: out };
}
// The tables of a SIE sector directory: [{ id, title }]
export async function sieDirectory(sector) {
  const html = await getLatin1(`https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=consultarDirectorioCuadros&sector=${sector}&locale=es`, { ua: BOT_UA });
  const out = [], seen = new Set();
  for (const m of html.matchAll(/idCuadro=(C[A-Z]\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/g)) {
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/[\s ]+/g, ' ').trim();
    if (!title || seen.has(m[1] + title)) continue;
    seen.add(m[1] + title); out.push({ id: m[1], title });
  }
  return out;
}

// Mexico's 32 federal entities: INEGI code, short code used on the map, name.
export const STATES = [
  ['01', 'AGS', 'Aguascalientes'], ['02', 'BC', 'Baja California'], ['03', 'BCS', 'Baja California Sur'], ['04', 'CAMP', 'Campeche'], ['05', 'COAH', 'Coahuila'], ['06', 'COL', 'Colima'], ['07', 'CHIS', 'Chiapas'], ['08', 'CHIH', 'Chihuahua'],
  ['09', 'CDMX', 'Ciudad de México'], ['10', 'DGO', 'Durango'], ['11', 'GTO', 'Guanajuato'], ['12', 'GRO', 'Guerrero'], ['13', 'HGO', 'Hidalgo'], ['14', 'JAL', 'Jalisco'], ['15', 'MEX', 'Estado de México'], ['16', 'MICH', 'Michoacán'],
  ['17', 'MOR', 'Morelos'], ['18', 'NAY', 'Nayarit'], ['19', 'NL', 'Nuevo León'], ['20', 'OAX', 'Oaxaca'], ['21', 'PUE', 'Puebla'], ['22', 'QRO', 'Querétaro'], ['23', 'QROO', 'Quintana Roo'], ['24', 'SLP', 'San Luis Potosí'],
  ['25', 'SIN', 'Sinaloa'], ['26', 'SON', 'Sonora'], ['27', 'TAB', 'Tabasco'], ['28', 'TAMPS', 'Tamaulipas'], ['29', 'TLAX', 'Tlaxcala'], ['30', 'VER', 'Veracruz'], ['31', 'YUC', 'Yucatán'], ['32', 'ZAC', 'Zacatecas'],
].map(([code, abbr, name]) => ({ code, abbr, name }));
// a publisher's spelling of a state -> INEGI code ("Coahuila de Zaragoza", "Veracruz de Ignacio de la Llave", "Distrito Federal", "México"…)
export function stateCode(name) {
  const f = fold(name).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!f) return null;
  if (/^(ciudad de mexico|distrito federal|cdmx)$/.test(f)) return '09';
  if (/^(mexico|estado de mexico|edo de mexico|edo mex)$/.test(f)) return '15';
  if (/^coahuila/.test(f)) return '05';
  if (/^michoacan/.test(f)) return '16';
  if (/^veracruz/.test(f)) return '30';
  if (/^queretaro/.test(f)) return '22';
  if (/^baja california sur/.test(f)) return '03';
  if (/^baja california/.test(f)) return '02';
  if (/^quintana roo/.test(f)) return '23';
  const hit = STATES.find((s) => fold(s.name) === f);
  return hit ? hit.code : null;
}
