// Daily refresh of the airline traffic dashboard (/aeropuertos/aerolineas/): rebuilds site/aeropuertos/data/{airlines,routes}.js.
//
//   AFAC      "Estadistica mensual por aerolinea" (resumen-*.xlsx: passengers, flights, cargo per airline per month; yearly
//             files back to 2016 plus the current year) and "Estadistica operacional por origen-destino" (sase-*.xlsx: city
//             pairs). gob.mx sits behind a proof-of-work bot challenge, so a headless Chromium session lets the challenge run
//             and downloads the files inside that session (same approach as refresh.mjs for the airports hub).
//   Airlines  Aeromexico, Volaris and Viva monthly traffic reports (passengers, ASMs, RPMs, load factor): Volaris publishes a
//             history workbook, Viva monthly PDFs (parsed by tools/aeropuertos/parse_airline_pdfs.py), Aeromexico monthly PDFs
//             on an IR site that only answers real browsers (fetched from inside a Chrome/Chromium page when possible).
//   Networks  each carrier's own route feed (Volaris, Viva stations feeds; Mexicana's AIFA pairs from its reservation system and
//             destinations page). Aeromexico publishes no route list, so its routes
//             to and from the US come from the US DOT's T-100 International Segment data (BTS TranStats, official, carrier-level
//             nonstop segments flown); its domestic and other international routes are not drawn. No other source is used.
// Every raw input is cached in tools/aeropuertos/raw/airlines; a source that cannot be read today keeps yesterday's input, so a
// bad day never blanks the page. Flags: --skip-afac --skip-ir --skip-networks --full (ignore caches) --dump-ir-text.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { parseResumen, parseSase, parseVolarisHistory, parseVolarisStations, parseVivaStations, t100Rows, t100Network, makeCodeMaps, compile, irFromMonthly, mergeIrSeries, fileMeta, MESES } from '../../tools/aeropuertos/airlines-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOOLS = path.join(ROOT, 'tools', 'aeropuertos'), RAW = path.join(TOOLS, 'raw', 'airlines'), TMP = path.join(TOOLS, 'tmp', 'airlines'), OUT = path.join(ROOT, 'site', 'aeropuertos', 'data');
fs.mkdirSync(RAW, { recursive: true }); fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const args = new Set(process.argv.slice(2)); const FULL = args.has('--full');
if (args.has('--dump-ir-text')) process.env.IR_TEXT_DIR = path.join(RAW, 'ir-text');   // keep the extracted text of every airline PDF (layout debugging)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const today = new Date().toISOString().slice(0, 10);
const FIRST_YEAR = 2016;
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const writeJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o));
const registry = readJson(path.join(TOOLS, 'airlines.json')); const airportsMeta = readJson(path.join(TOOLS, 'airports.json')).filter((a) => a.code !== 'TGZ0'); const cities = readJson(path.join(TOOLS, 'cities.json'));
const maps = makeCodeMaps(airportsMeta.concat(registry.extraAirports || []), registry);
const sources = readJson(path.join(RAW, 'sources.json'), {}); const status = readJson(path.join(RAW, 'status.json'), {}); status.lastRun = today; status.steps = {};
const note = (step, s, extra) => { status.steps[step] = { status: s, ...(extra || {}) }; console.log(`[${step}] ${s}${extra ? ' ' + JSON.stringify(extra) : ''}`); };

async function get(url, accept = '*/*', tries = 3) {
  let err; for (let i = 1; i <= tries; i++) { try { const r = await fetch(url, { headers: { 'user-agent': UA, accept, 'accept-language': 'es-MX,es;q=0.9,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return { buf: Buffer.from(await r.arrayBuffer()), headers: r.headers, url: r.url }; } catch (e) { err = e; await new Promise((res) => setTimeout(res, 2000 * i)); } }
  throw err;
}

// ---------------------------------------------------------------- browsers
let pw = null;
async function playwright() { if (!pw) pw = await import('playwright'); return pw; }
// headless Chromium (as shipped by Playwright): fine for gob.mx's proof-of-work challenge
async function gobBrowser() { const { chromium } = await playwright(); return chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] }); }
// airline sites (Akamai-style bot checks) reject the headless shell; prefer the real Chrome the runner ships with
async function siteBrowser() {
  const { chromium } = await playwright();
  // With a display available (HEADED=1 under xvfb-run on the runner) a headed Chrome is tried first: the Akamai-style checks on
  // the airline sites reject headless browsers. Each variant falls back to the next one.
  const variants = [];
  if (process.env.HEADED) variants.push({ channel: 'chrome', headless: false }, { channel: 'chromium', headless: false });
  variants.push({ channel: 'chrome', headless: true }, { channel: 'chromium', headless: true }, { headless: true });
  for (const opts of variants) {
    try { return { browser: await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'], ...opts }), label: (opts.channel || 'headless-shell') + (opts.headless ? '' : ' (headed)') }; } catch (e) { console.log('launch failed', JSON.stringify(opts), e.message.split('\n')[0]); }
  }
  throw new Error('no browser could be launched');
}
async function inPage(page, url, binary = false) {
  const res = await page.evaluate(async ({ u, binary }) => { const r = await fetch(u, { credentials: 'include' }); if (!r.ok) return { status: r.status }; if (binary) { const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let k = 0; k < b.length; k += 0x8000) s += String.fromCharCode.apply(null, b.subarray(k, k + 0x8000)); return { status: r.status, b64: btoa(s) }; } return { status: r.status, text: await r.text() }; }, { u: url, binary });
  if (res.status !== 200) throw new Error(`in-page fetch ${res.status} ${url}`);
  return binary ? Buffer.from(res.b64, 'base64') : res.text;
}

// ---------------------------------------------------------------- 1. AFAC
async function refreshAfac() {
  const browser = await gobBrowser();
  try {
    const ctx = await browser.newContext({ userAgent: UA, locale: 'es-MX', viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
    async function links(url, re) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => document.title && !/Challenge Validation/i.test(document.title), null, { timeout: 150000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);
      return (await page.$$eval('a[href]', (as) => as.map((a) => a.href))).filter((h) => re.test(h));
    }
    const download = async (href) => { const r = await ctx.request.get(href, { timeout: 180000 }); if (!r.ok()) throw new Error(`${r.status()} ${href}`); const buf = Buffer.from(await r.body()); if (!(buf[0] === 0x50 && buf[1] === 0x4b) && !(buf[0] === 0xd0 && buf[1] === 0xcf)) throw new Error(`not a workbook: ${href} (${buf.length} bytes)`); return buf; };
    const cur = await links('https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404', /\.xlsx?$/i);
    const curRes = cur.find((h) => /resumen/i.test(h)), curSase = cur.find((h) => /sase/i.test(h));
    if (!curRes || !curSase) throw new Error('current-year airline/origin-destination workbooks not found on the AFAC page');
    const curName = decodeURIComponent(curRes.split('/').pop()), curYear = fileMeta(curName).year;
    // current year (always re-read)
    const resCur = parseResumen(await download(curRes), curName); writeJson(path.join(RAW, `resumen-${resCur.year}.json`), resCur);
    const saseName = decodeURIComponent(curSase.split('/').pop()); const saseCur = parseSase(await download(curSase), saseName); writeJson(path.join(RAW, `sase-${saseCur.year}.json`), saseCur);
    sources.afac = { title: 'AFAC - Estadistica mensual por aerolinea y por origen-destino', url: 'https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404', files: { resumen: curName, sase: saseName }, published: fileMeta(curName).published, lastMonth: `${resCur.year}-${String(resCur.lastMonth).padStart(2, '0')}`, fetchedAt: today };
    // history: yearly files, downloaded once (a stored year is complete when it has 12 months)
    const yearly = await links('https://www.gob.mx/afac/acciones-y-programas/estadistica-mensual-por-aerolinea-monthly-airline-statistics', /resumen/i);
    const yearlyOd = await links('https://www.gob.mx/afac/acciones-y-programas/estadistica-mensual-operativa-monthly-traffic-statistics', /sase/i);
    let fetched = 0;
    for (const h of yearly) { const name = decodeURIComponent(h.split('/').pop()); const y = fileMeta(name).year; if (!y || y < FIRST_YEAR || y >= curYear) continue; const f = path.join(RAW, `resumen-${y}.json`); const have = readJson(f, null); if (have && have.lastMonth === 12 && !FULL) continue; try { writeJson(f, parseResumen(await download(h), name)); fetched++; } catch (e) { console.warn('yearly resumen failed', name, e.message); } }
    for (const h of yearlyOd) { const name = decodeURIComponent(h.split('/').pop()); const y = fileMeta(name).year; if (!y || y < curYear - 2 || y >= curYear) continue; const f = path.join(RAW, `sase-${y}.json`); if (fs.existsSync(f) && !FULL) continue; try { writeJson(f, parseSase(await download(h), name)); fetched++; } catch (e) { console.warn('yearly sase failed', name, e.message); } }
    note('afac', 'ok', { current: curName, lastMonth: sources.afac.lastMonth, historyFilesFetched: fetched });
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------- 2. airline IR reports
const irCache = readJson(path.join(RAW, 'ir-pdfs.json'), { viv: {}, am: {}, voi: {} }); irCache.voi ??= {};
const monthFromText = (s) => { const m = s.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[-\s]+(20\d\d)/i); if (m) return `${m[2]}-${String(MESES.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}`; const e = s.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d\d)/i); if (e) return `${e[2]}-${String(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(e[1].toLowerCase()) + 1).padStart(2, '0')}`; return null; };
async function parsePdfDir(dir) { const out = path.join(dir, 'out.json'); execFileSync(process.env.PYTHON || 'python3', [path.join(TOOLS, 'parse_airline_pdfs.py'), dir, out], { stdio: 'inherit' }); return readJson(out, { viv: {}, am: {}, voi: {} }); }

async function refreshVolaris() {
  // The IR page is rendered client-side. The history workbook (monthly since 2014) is tried at its last known address first;
  // the page is opened in a browser to re-discover it if it moved and to list the monthly PDFs the workbook does not include yet.
  let url = (sources.volaris && sources.volaris.historyUrl) || 'https://api.mziq.com/mzfilemanager/v2/d/ea52c1bb-e8e2-457e-820a-98ca17753a37/a230f5a7-e725-ee44-69b1-ff1ca8da9ba0?origin=2';
  let buf = null, monthly = [];
  try { buf = (await get(url)).buf; if (!(buf[0] === 0x50 && buf[1] === 0x4b)) buf = null; } catch { buf = null; }
  try {
    const { browser } = await siteBrowser();
    try {
      const page = await (await browser.newContext({ locale: 'en-US' })).newPage();
      await page.goto('https://ir.volaris.com/financial-information/traffic-reports/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(8000);
      const links = await page.$$eval('a[href]', (as) => as.map((a) => ({ text: a.textContent.trim(), href: a.href })));
      if (!buf) { const hist = links.filter((l) => /historical traffic/i.test(l.text)); if (!hist.length) throw new Error('Historical Traffic Data link not found'); url = hist[0].href; buf = (await get(url)).buf; }
      monthly = links.map((l) => ({ ym: /traffic results/i.test(l.text) ? monthFromText(l.text) : null, href: l.href })).filter((l) => l.ym);
    } finally { await browser.close(); }
  } catch (e) { if (!buf) throw e; console.warn('volaris IR page:', e.message.split('\n')[0]); }
  const hist = parseVolarisHistory(buf); if (!hist.months.length) throw new Error('Volaris history workbook parsed to nothing');
  hist.source = 'Volaris IR - Historical Traffic Data (RPMs, ASMs, load factor, booked passengers)'; writeJson(path.join(RAW, 'volaris-hist.json'), hist);
  // monthly PDFs newer than the workbook (same table as Viva's reports; parsed by parse_airline_pdfs.py)
  const dir = path.join(TMP, 'volaris'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  let n = 0; for (const m of monthly) { if (m.ym <= hist.months.at(-1) || (irCache.voi[m.ym] && !FULL)) continue; try { const b = (await get(m.href)).buf; if (b.subarray(0, 4).toString() !== '%PDF') throw new Error('not a PDF'); fs.writeFileSync(path.join(dir, `voi-${m.ym}.pdf`), b); n++; } catch (e) { console.warn('volaris pdf', m.ym, e.message); } }
  if (n) { const parsed = await parsePdfDir(dir); Object.assign(irCache.voi, parsed.voi || {}); }
  const lastMonth = [hist.months.at(-1), ...Object.keys(irCache.voi)].sort().at(-1);
  sources.volaris = { title: 'Volaris - Historical Traffic Data and monthly traffic reports', url: 'https://ir.volaris.com/financial-information/traffic-reports/', historyUrl: url, lastMonth, fetchedAt: today };
  note('volaris', 'ok', { workbookTo: hist.months.at(-1), monthlyListed: monthly.length, newPdfs: n, lastMonth });
}
async function refreshViva() {
  const html = (await get('https://ri.vivaaerobus.com/en/reportes', 'text/html')).buf.toString('utf8');
  // the English listing links English PDFs (...-Trafico-<mes>-<yyyy>-en.pdf); the same numbers appear in the Spanish edition
  const found = [...html.matchAll(/href="([^"]+\/SalaPrensa\/(\d{4}-\d{2}-\d{2})-Trafico-([A-Za-z]+)-(\d{4})[^"]*\.pdf)"/gi)].map((m) => ({ url: m[1].startsWith('http') ? m[1] : 'https:' + m[1], ym: monthFromText(`${m[3]} ${m[4]}`), pub: m[2] })).filter((x) => x.ym && x.ym >= '2021-01');
  const byYm = new Map(); for (const f of found) if (!byYm.has(f.ym) || f.pub > byYm.get(f.ym).pub) byYm.set(f.ym, f);
  const dir = path.join(TMP, 'viva'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  let n = 0; for (const [ym, f] of byYm) { if (irCache.viv[ym] && !FULL) continue; try { const b = (await get(f.url)).buf; if (b.subarray(0, 4).toString() !== '%PDF') throw new Error('not a PDF'); fs.writeFileSync(path.join(dir, `viv-${ym}.pdf`), b); n++; } catch (e) { console.warn('viva pdf', ym, e.message); } }
  if (n) { const parsed = await parsePdfDir(dir); Object.assign(irCache.viv, parsed.viv); }
  const months = Object.keys(irCache.viv).sort(); if (!months.length) throw new Error('no Viva months parsed');
  sources.viva = { title: 'Viva Aerobus - monthly traffic reports', url: 'https://ri.vivaaerobus.com/en/reportes#trafico', lastMonth: months.at(-1), fetchedAt: today };
  note('viva', 'ok', { newPdfs: n, lastMonth: months.at(-1), months: months.length });
}
async function refreshAeromexico() {
  const { browser, label } = await siteBrowser();
  try {
    const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
    const base = 'https://ir.aeromexico.com/news-events/traffic-reports'; const items = new Map();
    for (let p = 0; p < 8; p++) {
      const resp = await page.goto(`${base}?page=${p}`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => null); await page.waitForTimeout(4000);
      if (!resp || resp.status() >= 400) { if (p === 0) throw new Error(`traffic-reports page status ${resp ? resp.status() : 'none'} (${label})`); break; }
      const links = await page.$$eval('a[href]', (as) => as.filter((a) => /traffic results/i.test(a.textContent)).map((a) => ({ text: a.textContent.trim(), href: a.href })));
      if (!links.length) { if (p === 0) throw new Error(`no traffic-report links found (${label}) - probably a bot page`); break; }
      let added = 0; for (const l of links) { const ym = monthFromText(l.text); if (ym && !items.has(ym)) { items.set(ym, l.href); added++; } }
      if (!added) break;
    }
    const dir = path.join(TMP, 'am'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    let n = 0; for (const [ym, href] of items) { if (irCache.am[ym] && !FULL) continue; try { const b = await inPage(page, href, true); if (b.subarray(0, 4).toString() !== '%PDF') throw new Error('not a PDF'); fs.writeFileSync(path.join(dir, `am-${ym}.pdf`), b); n++; } catch (e) { console.warn('aeromexico pdf', ym, e.message); } }
    if (n) { const parsed = await parsePdfDir(dir); Object.assign(irCache.am, parsed.am); }
    const months = Object.keys(irCache.am).sort(); if (!months.length) throw new Error('no Aeromexico months parsed');
    sources.aeromexico = { title: 'Aeromexico - monthly traffic reports', url: base, lastMonth: months.at(-1), fetchedAt: today };
    note('aeromexico', 'ok', { browser: label, listed: items.size, newPdfs: n, lastMonth: months.at(-1) });
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------- 3. networks
// Only route lists the airline itself publishes (Volaris' and Viva's stations feeds) are used. Wikipedia is not a
// credible source, and AFAC's origin-destination file has no airline column, so carriers without an official feed
// have no network on the page. Anything else left in the cache from earlier runs is dropped here.
const nets = Object.fromEntries(Object.entries(readJson(path.join(RAW, 'networks.json'), {})).filter(([, n]) => n && n.kind === 'routes' && (/stations feed/i.test(n.source || '') || n.basis === 't100' || n.basis === 'hub')));
const T100_URL = 'https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FJE&QO_fu146_anzr=Nv4%20Pn44vr45';
const T100_FIELDS = ['YEAR', 'MONTH', 'UNIQUE_CARRIER', 'ORIGIN', 'ORIGIN_COUNTRY', 'DEST', 'DEST_COUNTRY', 'DEPARTURES_PERFORMED', 'PASSENGERS', 'CLASS'];
const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// One BTS download per calendar year covering the 12 months to the latest available month; only Aeromexico (AM) and
// Aeromexico Connect (5D) rows are kept.
async function fetchT100() {
  const browser = await gobBrowser();
  try {
    const page = await (await browser.newContext({ acceptDownloads: true, locale: 'en-US' })).newPage();
    await page.goto(T100_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const m = (await page.textContent('body')).match(/Latest Available Data:\s*([A-Za-z]+)\s+(\d{4})/);
    if (!m || MONTHS_EN.indexOf(m[1].toLowerCase()) < 0) throw new Error('T-100: no "Latest Available Data" on the form');
    const ly = +m[2], lm = MONTHS_EN.indexOf(m[1].toLowerCase()) + 1, latest = `${ly}-${String(lm).padStart(2, '0')}`;
    const years = lm === 12 ? [ly] : [ly - 1, ly];
    const rows = [];
    for (const year of years) {
      await page.goto(T100_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const geo = await page.$$eval('#cboGeography option', (o) => o.map((x) => x.value));
      for (const [sel, val] of [['#cboGeography', geo.includes('Mexico') ? 'Mexico' : 'All'], ['#cboYear', String(year)], ['#cboPeriod', 'All']]) {
        if ((await page.$eval(sel, (e) => e.value)) === val) continue;
        await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null), page.selectOption(sel, val)]); await page.waitForTimeout(1000);
      }
      await page.$$eval('input[type=checkbox]', (els, want) => els.forEach((e) => { if (!/^chk/.test(e.id)) e.checked = want.includes(e.name); }), T100_FIELDS);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 600000 }), page.click('#btnDownload')]);
      const file = path.join(TMP, `t100-${year}.bin`); await dl.saveAs(file);
      const buf = fs.readFileSync(file);
      const csv = buf.subarray(0, 2).toString() === 'PK' ? execFileSync('unzip', ['-p', file], { maxBuffer: 1 << 30 }).toString('utf8') : buf.toString('utf8');
      const got = t100Rows(csv); if (!got.length) throw new Error(`T-100 ${year}: empty file`);
      rows.push(...got.filter((r) => r.car === 'AM' || r.car === '5D'));
    }
    if (!rows.some((r) => r.ym === latest)) throw new Error(`T-100: no Aeromexico rows for ${latest}`);
    return { fetchedAt: today, latest, years, rows };
  } finally { await browser.close(); }
}

// Mexicana publishes its destinations (mexicana.gob.mx/destinos) and sells from AIFA, its only base; its reservation system
// (TTInteractive, loaded by mexicana.gob.mx) lists every bookable city pair, connections included. Its routes are the AIFA
// pairs of that list whose other end is a published destination. The airline does not mark flights as nonstop.
const MXA_SLUGS = { acapulco: 'ACA', bajio: 'BJX', campeche: 'CPE', chetumal: 'CTM', chihuahua: 'CUU', cdVictoria: 'CVM', guadalajara: 'GDL', hermosillo: 'HMO', ixtepec: 'IZT', mazatlan: 'MZT', merida: 'MID', monterrey: 'MTY', palenque: 'PQM', puertoVallarta: 'PVR', santaLucia: 'NLU', tijuana: 'TIJ', tulum: 'TQO', tuxtla: 'TGZ', losCabos: 'SJD', zihuatanejo: 'ZIH', zacatecas: 'ZCL', uruapan: 'UPN', veracruz: 'VER', villahermosa: 'VSA', nuevoLaredo: 'NLD', cancun: 'CUN', oaxaca: 'OAX', queretaro: 'QRO' };
async function fetchMexicana() {
  const { browser, label } = await siteBrowser();
  try {
    const page = await (await browser.newContext({ locale: 'es-MX' })).newPage();
    let pairs = null;
    page.on('response', async (r) => { if (/BookingEngine\/getCitypairs/i.test(r.url()) && r.status() === 200) { try { pairs = await r.json(); } catch { /* not JSON */ } } });
    await page.goto('https://mexicana.gob.mx/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(12000);
    if (!Array.isArray(pairs) || pairs.length < 20) throw new Error(`reservation city pairs not read (${pairs ? pairs.length : 'none'})`);
    await page.goto('https://mexicana.gob.mx/destinos', { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(8000);
    const slugs = [...new Set(await page.$$eval('a[href*="/destino/"]', (a) => a.map((x) => decodeURIComponent(x.getAttribute('href').split('/destino/')[1] || '').replace(/[/?#].*$/, ''))))].filter(Boolean);
    const unknown = slugs.filter((x) => !MXA_SLUGS[x]); const dest = new Set(slugs.map((x) => MXA_SLUGS[x]).filter(Boolean));
    if (dest.size < 10) throw new Error(`destinations page: only ${dest.size} destinations read`);
    const routes = new Set(), sold = new Set();
    for (const p of pairs) { const a = p.DepartureAirportCode, b = p.ArrivalAirportCode; if (!a || !b) continue; sold.add([a, b].sort().join('-')); if ((a === 'NLU' && dest.has(b)) || (b === 'NLU' && dest.has(a))) routes.add([a, b].sort().join('-')); }
    const airports = Object.fromEntries([...dest].map((c) => [c, { cc: 'MX' }]));
    return { net: { kind: 'routes', basis: 'hub', source: 'mexicana.gob.mx (destinations page + reservation system, AIFA pairs)', hubs: ['NLU'], airports, routes: [...routes].map((k) => k.split('-')) }, info: { browser: label, pairs: pairs.length, cityPairs: sold.size, destinations: dest.size, unknownSlugs: unknown, routes: routes.size, destWithoutAifaPair: [...dest].filter((c) => c !== 'NLU' && !routes.has(['NLU', c].sort().join('-'))) } };
  } finally { await browser.close(); }
}

async function refreshNetworks() {
  // Volaris: stations feed (plain fetch works)
  try { const j = JSON.parse((await get('https://webapi.volaris.com/ps/api/v1/stations/culture/es-MX', 'application/json')).buf.toString('utf8')); const n = parseVolarisStations(j); if (n.routes.length < 50) throw new Error(`only ${n.routes.length} routes`); nets.VOI = { ...n, asOf: today }; note('net-volaris', 'ok', { routes: n.routes.length, hubs: n.hubs }); } catch (e) { note('net-volaris', nets.VOI ? 'kept' : 'missing', { error: e.message.slice(0, 120) }); }
  // Viva: stations API from inside its own site (the last good feed is kept if it fails)
  try { const { browser, label } = await siteBrowser(); try { const page = await (await browser.newContext({ locale: 'es-MX' })).newPage(); await page.goto('https://www.vivaaerobus.com/es-mx/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(7000); const txt = await inPage(page, 'https://api.vivaaerobus.com/web/vb/v1/resources/stations?StationTypes=Airport'); const n = parseVivaStations(JSON.parse(txt)); if (n.routes.length < 50) throw new Error(`only ${n.routes.length} routes`); nets.VIV = { ...n, asOf: today }; note('net-viva', 'ok', { browser: label, routes: n.routes.length }); } finally { await browser.close(); } } catch (e) { note('net-viva', nets.VIV ? 'kept' : 'missing', { error: e.message.slice(0, 120) }); }
  // Mexicana: reservation system + destinations page on mexicana.gob.mx (the last good network is kept if it fails)
  try { const { net, info } = await fetchMexicana(); if (net.routes.length < 5) throw new Error(`only ${net.routes.length} routes`); nets.MXA = { ...net, asOf: today }; note('net-mexicana', 'ok', info); } catch (e) { note('net-mexicana', nets.MXA ? 'kept' : 'missing', { error: e.message.split('\n')[0].slice(0, 160) }); }
  // Aeromexico and Aeromexico Connect: US DOT T-100 International Segment (all carriers), filtered to Mexico, downloaded from
  // BTS TranStats' form; the carrier rows are cached in raw/airlines/t100-am.json and a failed day keeps the cached rows.
  const T100 = path.join(RAW, 't100-am.json'); let t100 = readJson(T100, null);
  try {
    const got = await fetchT100(); t100 = got; writeJson(T100, got);
    note('net-t100', 'ok', { latest: got.latest, years: got.years, rows: got.rows.length });
  } catch (e) { note('net-t100', t100 ? 'kept' : 'missing', { error: e.message.split('\n')[0].slice(0, 160) }); }
  if (t100 && t100.rows && t100.rows.length) {
    for (const [id, car] of [['AM', 'AM'], ['AMC', '5D']]) { const n = t100Network(t100.rows, car, { to: t100.latest }); if (n && n.routes.length) nets[id] = { ...n, asOf: t100.fetchedAt }; }
    sources.t100 = { title: 'US DOT, Bureau of Transportation Statistics - T-100 International Segment (All Carriers)', url: T100_URL, lastMonth: t100.latest, fetchedAt: t100.fetchedAt };
  }
  writeJson(path.join(RAW, 'networks.json'), nets);
  note('networks', 'ok', { carriers: Object.keys(nets) });
}

// ---------------------------------------------------------------- run
const failures = [];
const step = async (name, fn) => { try { await fn(); } catch (e) { failures.push(name); note(name, 'failed', { error: e.message.split('\n')[0].slice(0, 200) }); } };
if (!args.has('--skip-afac')) await step('afac', refreshAfac);
if (!args.has('--skip-ir')) { await step('volaris', refreshVolaris); await step('viva', refreshViva); await step('aeromexico', refreshAeromexico); }
if (!args.has('--skip-networks')) await step('networks', refreshNetworks);
writeJson(path.join(RAW, 'ir-pdfs.json'), irCache); writeJson(path.join(RAW, 'sources.json'), sources);

// compile from whatever is cached
const resumenes = fs.readdirSync(RAW).filter((f) => /^resumen-\d{4}\.json$/.test(f)).map((f) => readJson(path.join(RAW, f)));
const sases = fs.readdirSync(RAW).filter((f) => /^sase-\d{4}\.json$/.test(f)).map((f) => readJson(path.join(RAW, f)));
if (!resumenes.length || !sases.length) { console.error('no AFAC data cached; cannot compile'); process.exit(1); }
const volHist = readJson(path.join(RAW, 'volaris-hist.json'), null);
const ir = {};
if (volHist || Object.keys(irCache.voi).length) ir.VOI = mergeIrSeries(volHist, Object.keys(irCache.voi).length ? irFromMonthly(irCache.voi, 'Volaris IR - monthly traffic reports') : null, 'Volaris IR - Historical Traffic Data + monthly traffic reports');
if (Object.keys(irCache.viv).length) ir.VIV = irFromMonthly(irCache.viv, 'Viva Aerobus IR - monthly traffic reports');
if (Object.keys(irCache.am).length) ir.AM = irFromMonthly(irCache.am, 'Aeromexico IR - monthly traffic results');
const out = compile({ registry, airportsMeta, cities, resumenes, sases, ir, networks: nets, sources: { afac: sources.afac, afacOd: sources.afac, volaris: sources.volaris, viva: sources.viva, aeromexico: sources.aeromexico, t100: sources.t100 } });
out.airlines.status = { checkedAt: today, steps: status.steps };
function writeIfChanged(file, name, obj) {
  let prev = null; try { const t = fs.readFileSync(file, 'utf8'); prev = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch { /* first run */ }
  const strip = (o) => JSON.stringify({ ...o, generatedAt: null, status: null });
  const same = prev && strip(prev) === strip(obj);
  const final = same ? { ...obj, generatedAt: prev.generatedAt } : obj;
  fs.writeFileSync(file, `// AUTO-GENERATED by scripts/aeropuertos/airlines-refresh.mjs from AFAC, airline IR reports and route feeds - do not hand-edit.\n// Generated: ${final.generatedAt}\nwindow.${name} = ${JSON.stringify(final)};\n`);
  return !same;
}
const c1 = writeIfChanged(path.join(OUT, 'airlines.js'), 'MX_AIRLINES', out.airlines), c2 = writeIfChanged(path.join(OUT, 'routes.js'), 'MX_ROUTES', out.routes), c3 = writeIfChanged(path.join(OUT, 'airlines-summary.js'), 'MX_AIRLINES_SUMMARY', out.summary);
status.changed = { airlines: c1, routes: c2, summary: c3 }; writeJson(path.join(RAW, 'status.json'), status);
console.log(`compiled: months ${out.airlines.months[0]}..${out.airlines.lastMonth}, carriers ${out.airlines.carriers.length}, corridors ${out.routes.domestic.length}+${out.routes.international.length}; changed airlines=${c1} routes=${c2}; failures: ${failures.join(', ') || 'none'}`);
