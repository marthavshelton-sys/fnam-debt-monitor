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
// Indicadores API (BIE). The data endpoint carries no series name, so the title check uses the
// CL_INDICATOR catalog entry for the same id. Both need INEGI_TOKEN (free registration).
const INEGI_BASE = 'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml';
function inegiToken() { const t = process.env.INEGI_TOKEN; if (!t) throw new Error('INEGI_TOKEN not set'); return t; }
async function inegiTitle(id) {
  try {
    const body = await (await http(`${INEGI_BASE}/CL_INDICATOR/${id}/es/BIE/2.0/${inegiToken()}?type=json`)).json();
    const row = (body?.CODE || []).find((c) => String(c.value) === String(id)) || body?.CODE?.[0];
    return row ? String(row.Description || '').replace(/\s+/g, ' ').trim() : '';
  } catch (e) { return ''; }
}
async function inegi(cand, spec) {
  const url = `${INEGI_BASE}/INDICATOR/${cand.id}/es/0700/false/BIE/2.0/${inegiToken()}?type=json`;
  const body = await (await http(url)).json();
  const s = body?.Series?.[0];
  if (!s) throw new Error('empty response');
  const points = [];
  for (const o of s.OBSERVATIONS || []) {
    if (o.OBS_VALUE === null || o.OBS_VALUE === undefined || String(o.OBS_VALUE).trim() === '') continue;
    const v = Number(o.OBS_VALUE);
    if (!Number.isFinite(v)) continue;
    const [y, p] = String(o.TIME_PERIOD).split('/');
    let d;
    if (spec.freq === 'Q') d = `${y}-Q${String(p).replace(/^0/, '')}`;
    else if (spec.freq === 'M') d = `${y}-${String(p).padStart(2, '0')}`;
    else d = `${y}-${p}`;
    if (d.slice(0, 4) >= spec.since.slice(0, 4)) points.push([d, r4(v)]);
  }
  points.sort((a, b) => a[0].localeCompare(b[0]));
  const title = await inegiTitle(cand.id);
  return { title: title || null, points, url: `https://www.inegi.org.mx/app/indicadores/?ind=${cand.id}`, meta: { freq: s.FREQ, unit: s.UNIT, lastUpdate: s.LASTUPDATE, note: s.NOTE } };
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
  if (probeIdx >= 0 || catIdx >= 0) {
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
