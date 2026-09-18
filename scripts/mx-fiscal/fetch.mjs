// Daily data pipeline for the Mexico fiscal monitor (site/mx/fiscal). Pulls every series listed in
// tools/mx-fiscal/series.json from Banco de México's SIE API and SHCP's Estadísticas Oportunas
// open-data CSVs, validates each one, and writes site/mx/fiscal/data.js as `window.MX_DATA`.
//
// Guarantees (the page relies on them):
//   * a series is published only if the provider's own title matches the manifest's `title`
//     pattern — a mistyped id can never put a wrongly labelled series on the page;
//   * a value that fails the manifest's plausibility guards (min/max, month-on-month jump) is
//     rejected; the series keeps its last good points and is flagged `stale` with the date it
//     was last refreshed, which the page shows as "sin actualizar desde …";
//   * a series that fails to fetch keeps its last good points the same way; one bad feed never
//     takes the page down;
//   * the job exits non-zero (so GitHub emails the owner) only when a series marked `required`
//     has no usable data at all, or when every fetch failed.
//
// Runs on GitHub Actions (Node 20+, global fetch). Needs BANXICO_TOKEN. No npm install.
//   node scripts/mx-fiscal/fetch.mjs            refresh and write data.js
//   node scripts/mx-fiscal/fetch.mjs --dry-run  refresh, print the summary, write nothing

import fs from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const MANIFEST = new URL('tools/mx-fiscal/series.json', ROOT);
const OUT = new URL('site/mx/fiscal/data.js', ROOT);
const UA = 'fnam-debt-monitor/1.0 (+https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const DRY = process.argv.includes('--dry-run');
const today = () => new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r4 = (v) => Math.round(v * 10000) / 10000;
const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();

async function http(url, headers = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' });
      if (res.status === 429 && i < tries) { await sleep(4000 * i); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (i >= tries) throw new Error(`${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''} for ${url}`);
      await sleep(1500 * i);
    }
  }
}

// ---------------- Banxico SIE ----------------
// Range endpoint, up to 20 series per request; the response carries each series' official title.
const banxicoCache = new Map();
async function banxicoLoad(ids, since) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('BANXICO_TOKEN not set');
  const missing = ids.filter((id) => !banxicoCache.has(id));
  for (let i = 0; i < missing.length; i += 20) {
    const chunk = missing.slice(i, i + 20);
    const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${chunk.join(',')}/datos/${since}/${today()}`;
    try {
      const body = await (await http(url, { 'Bmx-Token': token, Accept: 'application/json' })).json();
      for (const s of body?.bmx?.series || []) banxicoCache.set(s.idSerie, s);
    } catch (e) {
      // one unknown id can fail a whole chunk; retry them one by one so the rest still load
      for (const id of chunk) {
        try {
          const body = await (await http(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${id}/datos/${since}/${today()}`, { 'Bmx-Token': token, Accept: 'application/json' })).json();
          for (const s of body?.bmx?.series || []) banxicoCache.set(s.idSerie, s);
        } catch (e2) { banxicoCache.set(id, { error: e2.message }); }
      }
    }
    for (const id of chunk) if (!banxicoCache.has(id)) banxicoCache.set(id, { error: 'not in response' });
  }
}
function banxicoDate(dmy, freq) {
  const [dd, mm, yyyy] = dmy.split('/');
  if (freq === 'M') return `${yyyy}-${mm}`;
  if (freq === 'Q') return `${yyyy}-Q${Math.ceil(Number(mm) / 3)}`;
  if (freq === 'A') return yyyy;
  return `${yyyy}-${mm}-${dd}`;
}
async function banxico(cand, spec) {
  await banxicoLoad([cand.id], spec.since || '2000-01-01');
  const s = banxicoCache.get(cand.id);
  if (!s || s.error) throw new Error(s?.error || 'not in response');
  const points = [];
  for (const o of s.datos || []) {
    if (!o.dato || o.dato === 'N/E') continue;
    const v = Number(String(o.dato).replace(/,/g, ''));
    if (!Number.isFinite(v)) continue;
    points.push([banxicoDate(o.fecha, spec.freq), r4(v * (cand.scale || 1))]);
  }
  return { title: clean(s.titulo), points, url: `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${cand.id}/datos/oportuno` };
}

// ---------------- SHCP Estadísticas Oportunas (open-data CSV) ----------------
// A candidate names the CSV `url`, a `dateCol` and a `valueCol` (header regexes) and optionally a
// `filter` {col, regex} to keep only matching rows. Dates are read as YYYY-MM or "mes año".
const csvCache = new Map();
const MESES = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
function parseCSV(text) {
  const delim = (text.split('\n')[0] || '').includes(';') ? ';' : ',';
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}
function shcpDate(raw) {
  const s = clean(raw).toLowerCase();
  let m = s.match(/^(\d{4})-(\d{2})/); if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/^(\d{4})\/(\d{2})/); if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/^(\d{2})\/(\d{4})/); if (m) return `${m[2]}-${m[1]}`;
  m = s.match(/([a-zñ]+)\D+(\d{4})/); if (m && MESES[m[1]]) return `${m[2]}-${MESES[m[1]]}`;
  m = s.match(/(\d{4})\D+([a-zñ]+)/); if (m && MESES[m[2]]) return `${m[1]}-${MESES[m[2]]}`;
  return null;
}
async function shcp(cand, spec) {
  if (!csvCache.has(cand.url)) {
    const buf = Buffer.from(await (await http(cand.url)).arrayBuffer());
    let text = buf.toString('utf8');
    if (text.includes('�')) text = buf.toString('latin1');
    csvCache.set(cand.url, parseCSV(text));
  }
  const rows = csvCache.get(cand.url);
  const header = rows[0].map((h) => clean(h));
  const col = (re) => header.findIndex((h) => new RegExp(re, 'i').test(h));
  const di = col(cand.dateCol), vi = col(cand.valueCol);
  if (di < 0 || vi < 0) throw new Error(`column not found (date=${di}, value=${vi}) in [${header.slice(0, 12).join(' | ')}]`);
  const fi = cand.filter ? col(cand.filter.col) : -1;
  const points = [];
  for (const r of rows.slice(1)) {
    if (fi >= 0 && !new RegExp(cand.filter.regex, 'i').test(clean(r[fi]))) continue;
    const d = shcpDate(r[di]); const v = Number(String(r[vi]).replace(/[,\s$%]/g, ''));
    if (d && Number.isFinite(v)) points.push([d, r4(v * (cand.scale || 1))]);
  }
  points.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { title: header[vi] + (cand.filter ? ` [${cand.filter.regex}]` : ''), points, url: cand.url };
}

// Daily/weekly series ship as month-end points (last observation of each month) so data.js stays
// small; the true latest observation is always kept separately as `last`.
function thin(points, mode) {
  if (mode !== 'monthly') return points;
  const byMonth = new Map();
  for (const p of points) byMonth.set(p[0].slice(0, 7), p);
  return [...byMonth.values()];
}

const PROVIDERS = { banxico, shcp };
const PROVIDER_LABEL = { banxico: 'Banxico SIE', shcp: 'SHCP Estadísticas Oportunas' };

// ---------------- Guards ----------------
function guard(points, spec) {
  const g = spec.guard || {};
  const last = points[points.length - 1];
  if (!last) return 'no points';
  if (g.min != null && last[1] < g.min) return `last value ${last[1]} below min ${g.min}`;
  if (g.max != null && last[1] > g.max) return `last value ${last[1]} above max ${g.max}`;
  if (g.maxStepPct != null && points.length > 1) {
    const prev = points[points.length - 2][1];
    if (prev && Math.abs(last[1] / prev - 1) * 100 > g.maxStepPct) return `last step ${(Math.abs(last[1] / prev - 1) * 100).toFixed(1)}% exceeds ${g.maxStepPct}%`;
  }
  const minPts = spec.minPoints ?? (spec.freq === 'A' ? 5 : spec.freq === 'Q' ? 8 : 12);
  if (points.length < minPts) return `only ${points.length} points`;
  return null;
}

async function fetchOne(key, spec, prev, log) {
  const errors = [];
  for (const cand of spec.candidates) {
    const fn = PROVIDERS[cand.provider];
    if (!fn) { errors.push(`${cand.provider}: unknown provider`); continue; }
    try {
      const got = await fn(cand, spec);
      if (cand.title && got.title && !new RegExp(cand.title, 'i').test(got.title)) { errors.push(`${cand.provider}:${cand.id || ''} title «${got.title}» does not match /${cand.title}/`); continue; }
      const bad = guard(got.points, spec);
      if (bad) { errors.push(`${cand.provider}:${cand.id || ''} rejected: ${bad}`); continue; }
      const last = got.points[got.points.length - 1];
      log.push([key, PROVIDER_LABEL[cand.provider], cand.id || cand.url.split('/').pop(), 'ok', last[0], String(last[1]), got.title]);
      return { ...spec.meta, key, provider: cand.provider, id: cand.id || null, title: got.title, url: got.url, freq: spec.freq, unit: spec.unit, fetchedAt: today(), stale: false, last, points: thin(got.points, spec.thin) };
    } catch (e) { errors.push(`${cand.provider}:${cand.id || ''} ${e.message}`); }
  }
  if (prev && prev.points?.length) {
    const last = prev.points[prev.points.length - 1];
    log.push([key, PROVIDER_LABEL[prev.provider] || prev.provider, prev.id || '', `STALE (kept ${prev.fetchedAt})`, last[0], String(last[1]), errors.join(' · ')]);
    return { ...prev, stale: true, staleReason: errors.join(' · ') };
  }
  log.push([key, '', '', spec.required ? 'MISSING (required)' : 'missing', '', '', errors.join(' · ')]);
  return null;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  let prev = {};
  try {
    const txt = await fs.readFile(OUT, 'utf8');
    prev = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)).series || {};
  } catch { /* first run */ }

  // Pre-load every Banxico id in one pass of chunked requests, grouped by `since`.
  const bySince = {};
  for (const [key, spec] of Object.entries(manifest.series)) for (const c of spec.candidates) if (c.provider === 'banxico') (bySince[spec.since || '2000-01-01'] ||= []).push(c.id);
  for (const [since, ids] of Object.entries(bySince)) { try { await banxicoLoad([...new Set(ids)], since); } catch (e) { console.warn('Banxico preload failed:', e.message); } }

  const log = [], series = {};
  let ok = 0, hardFail = false;
  for (const [key, spec] of Object.entries(manifest.series)) {
    const got = await fetchOne(key, spec, prev[key], log);
    if (got) { series[key] = got; if (!got.stale) ok++; }
    else if (spec.required) hardFail = true;
  }
  const payload = { generatedAt: new Date().toISOString(), series };

  const table = ['| series | source | id | status | last | value | title / note |', '|---|---|---|---|---|---|---|']
    .concat(log.map((r) => '| ' + r.map((c) => String(c).replace(/\|/g, '\\|').slice(0, 110)).join(' | ') + ' |')).join('\n');
  console.log(table);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Mexico fiscal monitor refresh\n\n${table}\n`);

  if (ok === 0) throw new Error('every series failed — refusing to overwrite data.js');
  if (!DRY) {
    const js = `// AUTO-GENERATED by scripts/mx-fiscal/fetch.mjs — do not hand-edit.
// Last refreshed: ${payload.generatedAt}
// Each series: {title, provider, id, unit, freq, url, fetchedAt, stale, points:[[date, value], ...]}.
// A stale series kept its last good points because the latest fetch failed or was rejected by a
// plausibility guard; the page shows "sin actualizar desde <fetchedAt>" for it.
window.MX_DATA = ${JSON.stringify(payload)};
`;
    await fs.writeFile(OUT, js, 'utf8');
    console.log('Wrote', OUT.pathname);
  }
  if (hardFail) throw new Error('a required series has no usable data (see table above)');
}

main().catch((e) => { console.error('::error::' + e.message); process.exit(1); });
