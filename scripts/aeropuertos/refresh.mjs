// Daily refresh of the airports traffic hub (site/aeropuertos/data) from public statistics:
//   AFAC  - "Estadistica operativa de aeropuertos" workbook on gob.mx (behind a proof-of-work bot challenge:
//           fetched with headless Chromium, which lets the challenge run, then downloads the file in that session);
//   AICM  - "AICM en Cifras" monthly PDF (latest month) and the year-end PDFs, parsed by tools/aeropuertos/parse_aicm.py;
//   AIFA  - the numeralia counters on aifa.aero (passengers, movements, tons since opening, with their date range).
// Raw inputs live in tools/aeropuertos/raw (afac-agg.json, aicm.json, aifa.json, sources.json); when a source cannot be
// read the stored input is kept, so a bad day never blanks the page. tools/aeropuertos/compile.mjs then builds the site files.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const RAW = path.join(ROOT, 'tools', 'aeropuertos', 'raw'), TMP = path.join(ROOT, 'tools', 'aeropuertos', 'tmp');
fs.mkdirSync(RAW, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const args = new Set(process.argv.slice(2));
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const sources = readJson(path.join(RAW, 'sources.json'), {});
const today = new Date().toISOString().slice(0, 10);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MON3 = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, dici: 12, diciembre: 12 };
const status = { afac: 'kept', aicm: 'kept', aifa: 'kept' };

async function get(url, accept = '*/*') { const r = await fetch(url, { headers: { 'user-agent': UA, accept, 'accept-language': 'es-MX,es;q=0.9' }, redirect: 'follow' }); if (!r.ok) throw new Error(`${r.status} ${url}`); return { buf: Buffer.from(await r.arrayBuffer()), headers: r.headers }; }
const lastMod = (h) => { const lm = h && h.get('last-modified'); const d = lm ? new Date(lm) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : null; };

// ---------------------------------------------------------------- AFAC (workbook pivot cache -> aggregates)
function parseAfacWorkbook(buf, fileName, XLSX) {
  const wb = XLSX.read(buf, { type: 'buffer', bookFiles: true });
  const dec = new TextDecoder('utf-8');
  const getf = (k) => { const c = wb.files[k].content; return dec.decode(c instanceof Uint8Array ? c : new Uint8Array(c)); };
  const keys = Object.keys(wb.files);
  const def = getf(keys.find((k) => /pivotCacheDefinition1\.xml$/.test(k))), rec = getf(keys.find((k) => /pivotCacheRecords1\.xml$/.test(k)));
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const fields = []; const fre = /<cacheField name="([^"]*)"[^>]*>([\s\S]*?)<\/cacheField>/g; let m;
  while ((m = fre.exec(def))) { const shared = []; const sre = /<([sn]) v="([^"]*)"/g; let s; while ((s = sre.exec(m[2]))) shared.push(unesc(s[2])); fields.push({ name: unesc(m[1]), shared }); }
  const rows = []; const rre = /<r>([\s\S]*?)<\/r>/g; const cre = /<([xnsmbde])(?: v="([^"]*)")?\/>/g;
  while ((m = rre.exec(rec))) { const cells = []; let c, i = 0; cre.lastIndex = 0; while ((c = cre.exec(m[1]))) { const t = c[1], v = c[2]; if (t === 'x') cells.push(fields[i].shared[+v]); else if (t === 'm') cells.push(''); else cells.push(unesc(v || '')); i++; } rows.push(cells); }
  const meta = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'aeropuertos', 'airports.json'), 'utf8')).map((a) => [a.afac, { code: a.code, grp: a.grp }]));
  const OPT = { 'OPERACIONES/ FLIGHTS': 'ops', 'PASAJEROS/PASSENGERS': 'pax', 'CARGA/ CARGO': 'cargo' }, TYPE = { 'NACIONAL/DOMESTIC': 'dom', 'INTERNACIONAL/ INTERNATIONAL': 'intl' };
  const Y0 = 2006; let Y1 = Y0; rows.forEach((r) => { Y1 = Math.max(Y1, +r[2] || Y0); });
  const N = (Y1 - Y0 + 1) * 12, idx = (y, mo) => (y - Y0) * 12 + mo - 1;
  const zeros = () => new Array(N).fill(0), mk = () => ({ pax: { dom: zeros(), intl: zeros() }, ops: { dom: zeros(), intl: zeros() }, cargo: { dom: zeros(), intl: zeros() } });
  const data = {}, opBy = {}, unknown = new Set(); let used = 0;
  for (const r of rows) { if (r.length < 17) continue; const mm = meta.get(r[4]); if (!mm) { unknown.add(r[4]); continue; } const k = OPT[r[0]], t = TYPE[r[1]], y = +r[2]; if (!k || !t) continue; const c = mm.code; data[c] ??= mk(); opBy[c] ??= {}; opBy[c][y] = r[3]; for (let mo = 1; mo <= 12; mo++) data[c][k][t][idx(y, mo)] += parseFloat(r[4 + mo]) || 0; used++; }
  const natPax = zeros(); for (const c in data) for (let i = 0; i < N; i++) natPax[i] += data[c].pax.dom[i] + data[c].pax.intl[i];
  let last = N - 1; while (last > 0 && natPax[last] === 0) last--;
  const cut = (a) => a.slice(0, last + 1), rnd = (a, d) => a.map((v) => (d ? +v.toFixed(d) : Math.round(v)));
  const series = (o, d) => ({ dom: rnd(cut(o.dom), d), intl: rnd(cut(o.intl), d) }), measures = (o) => ({ pax: series(o.pax, 0), ops: series(o.ops, 0), cargo: series(o.cargo, 1) });
  const GROUPS = ['GAP', 'OMA', 'ASUR', 'AICM', 'AIFA', 'OTROS'], gAgg = {}; GROUPS.forEach((g) => (gAgg[g] = mk())); const national = mk();
  const grpOf = {}; meta.forEach((v) => (grpOf[v.code] = v.grp));
  for (const c in data) { const g = grpOf[c]; for (const k of ['pax', 'ops', 'cargo']) for (const t of ['dom', 'intl']) for (let i = 0; i < N; i++) { gAgg[g][k][t][i] += data[c][k][t][i]; national[k][t][i] += data[c][k][t][i]; } }
  const A0 = idx(2010, 1);
  const annual = (arr) => { const o = {}; for (let y = Y0; y <= Y1; y++) { let s = 0, any = false; for (let mo = 1; mo <= 12; mo++) { const i = idx(y, mo); if (i <= last) { s += arr[i]; any = true; } } if (any) o[y] = Math.round(s); } return o; };
  const airports = {};
  for (const c in data) { const d = data[c]; const yrs = Object.keys(opBy[c]).map(Number).sort((a, b) => a - b); const seg = []; for (const y of yrs) { const lab = opBy[c][y]; if (!seg.length || seg[seg.length - 1].label !== lab) seg.push({ from: y, label: lab }); } const tot = (k) => cut(d[k].dom).map((v, i) => v + d[k].intl[i]); airports[c] = { pax: { dom: rnd(cut(d.pax.dom).slice(A0), 0), intl: rnd(cut(d.pax.intl).slice(A0), 0) }, annual: { pax: annual(tot('pax')), ops: annual(tot('ops')), cargo: annual(tot('cargo')) }, opHistory: seg }; }
  return { Y0, lastIndex: last, airportsFrom: '2010-01', national: measures(national), byGroup: Object.fromEntries(GROUPS.map((g) => [g, measures(gAgg[g])])), airports, rowsUsed: used, unknown: [...unknown], sourceFile: fileName };
}
async function refreshAfac() {
  const { chromium } = await import('playwright'); const XLSX = (await import('xlsx')).default || (await import('xlsx'));
  const URL0 = 'https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404';
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  try {
    const ctx = await browser.newContext({ userAgent: UA, locale: 'es-MX', viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
    await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.title && !/Challenge Validation/i.test(document.title), null, { timeout: 150000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href).filter((h) => /producto-aeropuerto/i.test(h)));
    if (!links.length) throw new Error('workbook link not found on the AFAC page');
    const link = links[0], fileName = decodeURIComponent(link.split('/').pop());
    const r = await ctx.request.get(link, { timeout: 180000 }); if (!r.ok()) throw new Error(`workbook ${r.status()}`);
    const buf = Buffer.from(await r.body()); if (buf.length < 100000 || buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error(`workbook is not a zip/xlsx (${buf.length} bytes)`);
    const agg = parseAfacWorkbook(buf, fileName, XLSX);
    if (agg.unknown.length) console.warn('AFAC: airports missing from airports.json:', agg.unknown.join(', '));
    const prevAgg = readJson(path.join(RAW, 'afac-agg.json'), null);
    if (prevAgg && agg.lastIndex < prevAgg.lastIndex) throw new Error(`workbook ends earlier (${agg.lastIndex}) than the stored one (${prevAgg.lastIndex})`);
    fs.writeFileSync(path.join(RAW, 'afac-agg.json'), JSON.stringify(agg));
    // file names look like producto-aeropuerto-2006-2026-jul-27082026.xlsx: month covered + publication date (ddmmyyyy)
    const m = fileName.match(/(\d{4})-(\d{4})-([a-z]{3,4})-(\d{2})(\d{2})(\d{4})/i);
    const lastYm = `${agg.Y0 + Math.floor(agg.lastIndex / 12)}-${String((agg.lastIndex % 12) + 1).padStart(2, '0')}`;
    const monthName = MESES[+lastYm.slice(5) - 1] + ' ' + lastYm.slice(0, 4);
    sources.afac = { title: `AFAC - Estadistica operativa de aeropuertos ${m ? `${m[1]}-${m[2]}` : ''} (${monthName})`, url: URL0, file: fileName, published: m ? `${m[6]}-${m[5]}-${m[4]}` : (lastMod(r.headers()) || today), lastModified: r.headers()['last-modified'] || null, fetchedAt: today };
    status.afac = fileName === (prevAgg && prevAgg.sourceFile) ? 'unchanged' : 'updated';
    console.log(`AFAC: ${fileName} -> ${agg.rowsUsed} rows, months to ${lastYm} (${status.afac})`);
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------- AICM (latest monthly PDF + year-end PDFs)
async function refreshAicm() {
  const LIST = 'https://www.aicm.com.mx/categoria/estadisticas';
  const html = (await get(LIST, 'text/html')).buf.toString('utf8');
  const links = [...html.matchAll(/href="([^"]*Estadisticas[^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: new URL(m[1], LIST).href, text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
  const dated = links.map((l) => { const mm = l.text.match(/a\s+([A-Za-zÀ-ÿ]+)\s+de\s+(\d{4})/i); if (!mm) return null; const mon = MESES.indexOf(mm[1].toLowerCase()) + 1; return mon ? { ...l, y: +mm[2], m: mon } : null; }).filter(Boolean);
  if (!dated.length) throw new Error('no dated AICM PDFs found on the listing');
  dated.sort((a, b) => b.y - a.y || b.m - a.m);
  const newest = dated[0];
  const aicm = readJson(path.join(RAW, 'aicm.json'), { pax: {}, ops: {}, cargo: {} });
  const have = new Set(Object.keys(aicm.pax));
  // download the newest file, plus any December file whose year is not complete in the stored data
  const wanted = [newest, ...dated.filter((d) => d.m === 12 && d.y >= 2019 && d !== newest && ![...Array(12)].every((_, i) => have.has(`${d.y}-${String(i + 1).padStart(2, '0')}`)))];
  const work = path.join(TMP, 'aicm'); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
  let updated = null;
  for (const d of wanted) { const r = await get(d.href); if (r.buf.subarray(0, 4).toString() !== '%PDF') throw new Error(`not a PDF: ${d.href}`); fs.writeFileSync(path.join(work, `aicm-${d.y}-${String(d.m).padStart(2, '0')}.pdf`), r.buf); if (d === newest) updated = lastMod(r.headers); }
  execFileSync('python3', [path.join(ROOT, 'tools', 'aeropuertos', 'parse_aicm.py'), work], { stdio: 'inherit' });
  const parsed = readJson(path.join(work, 'aicm.json'), null); if (!parsed) throw new Error('parse_aicm.py produced nothing');
  let added = 0; for (const k of ['pax', 'ops', 'cargo']) for (const [ym, v] of Object.entries(parsed[k] || {})) { if (!aicm[k][ym] || JSON.stringify(aicm[k][ym]) !== JSON.stringify(v)) added++; aicm[k][ym] = v; }
  const newestYm = `${newest.y}-${String(newest.m).padStart(2, '0')}`;
  if (!aicm.pax[newestYm]) throw new Error(`the newest AICM PDF (${newest.text}) did not yield ${newestYm}`);
  fs.writeFileSync(path.join(RAW, 'aicm.json'), JSON.stringify(aicm));
  const prev = sources.aicm || {}, newestFile = newest.href.split('/').pop();
  // the server re-stamps Last-Modified on every request, so a file is dated by the day this pipeline first saw it
  const years = [...new Set(Object.keys(aicm.pax).map((k) => k.slice(0, 4)))].sort();
  sources.aicm = { title: `AICM en Cifras - ${MESES[newest.m - 1]} ${newest.y} y cierres anuales ${years[0]}-${newest.y - 1}`, url: LIST, file: newestFile, lastMonth: newestYm, updated: prev.file === newestFile && prev.updated ? prev.updated : today, fetchedAt: today };
  status.aicm = added ? 'updated' : 'unchanged';
  console.log(`AICM: ${newest.text} (${sources.aicm.file}, first seen ${sources.aicm.updated}, server last-modified ${updated}); ${added} month-values changed`);
}

// ---------------------------------------------------------------- AIFA (portal counters)
async function refreshAifa() {
  const html = (await get('https://www.aifa.aero/', 'text/html')).buf.toString('utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ');
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const dm = text.match(/Fecha de los datos:\s*(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})\s*-\s*(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/i);
  const toIso = (d, mon, y) => { const m = MON3[mon.toLowerCase().slice(0, 4)] || MON3[mon.toLowerCase().slice(0, 3)]; return m ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null; };
  const num = (label) => { const i = lines.findIndex((l) => l.toLowerCase().startsWith(label)); const v = i > 0 ? lines[i - 1].replace(/,/g, '') : ''; return /^\d+(\.\d+)?$/.test(v) ? +v : null; };
  const out = { since: dm ? toIso(dm[1], dm[2], dm[3]) : null, asOf: dm ? toIso(dm[4], dm[5], dm[6]) : null, ops: num('operaciones a'), pax: num('pasajeros transportados'), cargoTons: num('toneladas transportadas'), source: 'https://www.aifa.aero/', fetchedAt: today };
  const prev = readJson(path.join(RAW, 'aifa.json'), {});
  if (!(out.asOf && out.pax > 1e6 && out.ops > 1e4 && out.cargoTons > 0)) throw new Error('AIFA counters not found: ' + JSON.stringify(out));
  if (prev.pax && (out.pax < prev.pax || out.ops < prev.ops)) throw new Error(`AIFA counters went down: ${JSON.stringify(prev)} -> ${JSON.stringify(out)}`);
  fs.writeFileSync(path.join(RAW, 'aifa.json'), JSON.stringify(out, null, 1));
  sources.aifa = { title: 'AIFA - numeralia del portal', url: 'https://www.aifa.aero/', updated: out.asOf, fetchedAt: today };
  status.aifa = prev.asOf === out.asOf && prev.pax === out.pax ? 'unchanged' : 'updated';
  console.log(`AIFA: ${out.since} - ${out.asOf}: ${out.pax} passengers, ${out.ops} movements, ${out.cargoTons} t (${status.aifa})`);
}

const failures = [];
for (const [name, fn, skip] of [['afac', refreshAfac, args.has('--skip-afac')], ['aicm', refreshAicm, args.has('--skip-aicm')], ['aifa', refreshAifa, args.has('--skip-aifa')]]) {
  if (skip) { status[name] = 'skipped'; continue; }
  try { await fn(); } catch (e) { failures.push(name); status[name] = 'failed: ' + String(e.message || e).slice(0, 200); console.error(`${name.toUpperCase()} refresh failed, stored input kept:`, e.message || e); }
}
fs.writeFileSync(path.join(RAW, 'sources.json'), JSON.stringify(sources, null, 1));
fs.writeFileSync(path.join(RAW, 'status.json'), JSON.stringify({ at: new Date().toISOString(), ...status }, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });
for (const f of ['afac-agg.json', 'aicm.json', 'aifa.json', 'sources.json']) if (!fs.existsSync(path.join(RAW, f))) { console.error(`missing ${f}: cannot compile`); process.exit(2); }
execFileSync('node', [path.join(ROOT, 'tools', 'aeropuertos', 'compile.mjs'), RAW, path.join(ROOT, 'site', 'aeropuertos', 'data')], { stdio: 'inherit' });
console.log('status', JSON.stringify(status));
if (failures.length === 3) process.exit(3);
