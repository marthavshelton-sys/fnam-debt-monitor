// Airline traffic for /aeropuertos/aerolineas/: parsers for AFAC's monthly airline workbooks (resumen-*.xlsx) and
// origin-destination workbooks (sase-*.xlsx), the airlines' own route feeds and history files, Wikipedia destination
// tables, and the compiler that turns all of it into site/aeropuertos/data/{airlines,routes}.js.
// Pure functions: no network access here (scripts/aeropuertos/airlines-refresh.mjs fetches, this file parses/compiles).
import XLSX from 'xlsx';

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MON_ABBR = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12 };

export const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
export const norm = (s) => strip(s).toUpperCase();
export const slug = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const ym = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
export const ymAdd = (s, n) => { const [y, m] = s.split('-').map(Number); const t = y * 12 + (m - 1) + n; return ym(Math.floor(t / 12), (t % 12) + 1); };
export const ymRange = (from, to) => { const out = []; for (let s = from; s <= to; s = ymAdd(s, 1)) out.push(s); return out; };

const num = (v) => { if (v == null || v === '') return 0; const n = +String(v).replace(/,/g, '').trim(); return Number.isFinite(n) ? n : 0; };
const sheet = (wb, name) => { const n = wb.SheetNames.find((s) => s.toUpperCase().replace(/\s+/g, '') === name); return n ? XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: false, defval: null }) : null; };

// ---------------------------------------------------------------- file names
// resumen-julio-2026-27082026.xlsx, resumen-diciembre-2025-05022026h.xlsx, resumen-historico-dic-19.xlsx,
// resumen-2016-historico-10032017.xlsx, resumen-diciembre-2018-16042019.xlsx, sase-julio-2026-..., sase-historico-dic-2019.xlsx
export function fileMeta(name) {
  const n = String(name).toLowerCase();
  let year = null, month = null;
  const my = n.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)-(20\d\d)/);
  if (my) { year = +my[2]; month = MESES.indexOf(my[1] === 'setiembre' ? 'septiembre' : my[1]) + 1; }
  if (!year) { const y = n.match(/(20\d\d)/); if (y) year = +y[1]; }
  if (!year) { const d = n.match(/dic-?(\d\d)\b/); if (d) { year = 2000 + +d[1]; month = 12; } }
  if (!month) { const a = n.match(/-(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\b/); if (a) month = MON_ABBR[a[1]]; }
  if (!month && year) month = 12;
  const pub = n.match(/-(\d{2})(\d{2})(\d{4})h?\.xlsx?$/);
  return { year, month, published: pub ? `${pub[3]}-${pub[2]}-${pub[1]}` : null };
}

// ---------------------------------------------------------------- AFAC resumen (carrier x month)
export function parseResumen(buf, fileName) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const meta = fileMeta(fileName || '');
  const out = { file: fileName, year: meta.year, monthInFile: meta.month, lastMonth: 0, carriers: {} };
  for (const [name, measure] of [['PAXREG', 'pax'], ['VLOSREG', 'flights'], ['CARGREG', 'cargo']]) {
    const r = sheet(wb, name); if (!r) { (out.missing ??= []).push(name); continue; }
    let scope = null, section = null, region = null;
    for (const row of r) {
      const cells = row.map((v) => (v == null ? '' : String(v)));
      const label = cells[0].replace(/\s+/g, ' ').trim(), text = cells.join(' ');
      if (!out.year) { const y = cells.find((c) => /^20\d\d$/.test(c.trim())); if (y) out.year = +y; }
      if (/EMPRESAS NACIONALES/i.test(text)) { scope = 'MX'; region = null; continue; }
      if (/EMPRESAS EXTRANJERAS/i.test(text)) { scope = 'FOREIGN'; continue; }
      if (/SERVICIO REGULAR NACIONAL/i.test(text)) { section = 'dom'; continue; }
      if (/SERVICIO REGULAR INTERNACIONAL/i.test(text)) { section = 'intl'; continue; }
      if (/^E\s*m\s*p\s*r\s*e\s*s\s*a/i.test(label) || /^FUENTE/i.test(label) || /^\*/.test(label) || /^Nota/i.test(label)) continue;
      if (/^T\s+o\s+t\s+a\s+l/i.test(label) || /^Total\s*$/i.test(label)) continue;
      if (scope === 'FOREIGN' && /^Total\s+\S/i.test(label)) { region = strip(label.replace(/^Total\s+/i, '').replace(/\s*\/.*$/, '')); continue; }
      if (!label || !section || !scope) continue;
      const vals = row.slice(1, 13).map(num);
      const cname = label.replace(/\s*\*+\s*$/, '');
      const c = (out.carriers[cname] ??= { scope, region: scope === 'FOREIGN' ? region : null });
      (c[measure] ??= {})[section] = vals;
      if (measure === 'pax') vals.forEach((v, i) => { if (v > 0 && i + 1 > out.lastMonth) out.lastMonth = i + 1; });
    }
  }
  if (!out.lastMonth) out.lastMonth = meta.month || 12;
  return out;
}

// ---------------------------------------------------------------- AFAC sase (city pair x month)
export function parseSase(buf, fileName) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const meta = fileMeta(fileName || '');
  const out = { file: fileName, year: meta.year, monthInFile: meta.month, dom: [], intl: [] };
  const start = (arr) => { const i = arr.findIndex((r) => /ORIGEN/i.test(String(r[0] || ''))); return i < 0 ? 4 : i + 1; };
  const nac = sheet(wb, 'REGNAC') || [], int = sheet(wb, 'REGINT') || [];
  for (const r of nac.slice(start(nac))) {
    const a = String(r[0] || '').trim(), b = String(r[1] || '').trim();
    if (!a || !b || /^T\s*O\s*T\s*A\s*L/i.test(a) || /^FUENTE/i.test(a) || /^Nota/i.test(a)) continue;
    out.dom.push({ a, b, flights: r.slice(2, 14).map(num), pax: r.slice(15, 27).map(num), cargo: r.slice(28, 40).map(num) });
  }
  for (const r of int.slice(start(int))) {
    const a = String(r[0] || '').trim(), b = String(r[2] || '').trim();
    if (!a || !b || /^T\s*O\s*T\s*A\s*L/i.test(a) || /^FUENTE/i.test(a) || /^Nota/i.test(a)) continue;
    out.intl.push({ a, ac: String(r[1] || '').trim(), b, bc: String(r[3] || '').trim(), flights: r.slice(4, 16).map(num), pax: r.slice(17, 29).map(num), cargo: r.slice(30, 42).map(num) });
  }
  return out;
}

// ---------------------------------------------------------------- Volaris "Historical Traffic Data" workbook
export function parseVolarisHistory(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false, defval: null });
  const hdr = rows.find((r) => r.some((c) => typeof c === 'string' && /^[A-Z][a-z]{2} \d\d$/.test(c))) || [];
  const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const cols = []; hdr.forEach((h, i) => { const m = typeof h === 'string' && h.match(/^([A-Z][a-z]{2}) (\d\d)$/); if (m && MON[m[1]]) cols.push({ i, ym: ym(2000 + +m[2], MON[m[1]]) }); });
  const out = { months: [], pax: { dom: [], intl: [], total: [] }, rpm: { dom: [], intl: [], total: [] }, asm: { dom: [], intl: [], total: [] }, lf: { dom: [], intl: [], total: [] } };
  let section = null; const series = {};
  for (const r of rows) {
    const a = String(r[0] || ''), b = String(r[1] || '');
    if (/^RPMs/i.test(b)) section = 'rpm'; else if (/^ASMs/i.test(b)) section = 'asm'; else if (/^Load Factor/i.test(b)) section = 'lf'; else if (/Passengers/i.test(b) && /Booked|Schd/i.test(b)) section = 'pax';
    else if (section && /^(Domestic|International|Total)$/i.test(b.trim())) { const key = { domestic: 'dom', international: 'intl', total: 'total' }[b.trim().toLowerCase()]; series[section + '.' + key] = r; }
  }
  const valid = cols.filter((c) => { const r = series['pax.total']; return r && r[c.i] != null && r[c.i] !== '' && num(r[c.i]) > 0; });
  out.months = valid.map((c) => c.ym);
  for (const k of ['pax', 'rpm', 'asm', 'lf']) for (const t of ['dom', 'intl', 'total']) { const r = series[k + '.' + t]; out[k][t] = valid.map((c) => (r ? +(+num(r[c.i]) * (k === 'lf' && num(r[c.i]) <= 1 ? 100 : 1)).toFixed(k === 'lf' ? 1 : 0) : null)); }
  out.units = { pax: 'thousand', rpm: 'million', asm: 'million', lf: 'percent' };
  return out;
}

// ---------------------------------------------------------------- IR monthly reports (parsed by parse_airline_pdfs.py)
// {"2026-08": {pax:{dom,intl,total}, lf:{...}, rpm:{...}, asm:{...}}, ...} -> aligned series
export function irFromMonthly(dict, source) {
  const months = Object.keys(dict || {}).sort();
  const pick = (k, t) => months.map((m) => { const v = dict[m] && dict[m][k] && dict[m][k][t]; return v == null ? null : +v; });
  return { months, pax: { dom: pick('pax', 'dom'), intl: pick('pax', 'intl'), total: pick('pax', 'total') }, rpm: { dom: pick('rpm', 'dom'), intl: pick('rpm', 'intl'), total: pick('rpm', 'total') }, asm: { dom: pick('asm', 'dom'), intl: pick('asm', 'intl'), total: pick('asm', 'total') }, lf: { dom: pick('lf', 'dom'), intl: pick('lf', 'intl'), total: pick('lf', 'total') }, units: { pax: 'thousand', rpm: 'million', asm: 'million', lf: 'percent' }, source };
}

// Merge two IR series (e.g. Volaris' history workbook plus the monthly PDFs it does not yet include); `a` wins on overlap.
export function mergeIrSeries(a, b, source) {
  if (!a) return b; if (!b) return a;
  const months = [...new Set([...a.months, ...b.months])].sort();
  const pick = (k, t) => months.map((m) => { const ia = a.months.indexOf(m); if (ia >= 0 && a[k] && a[k][t] && a[k][t][ia] != null) return a[k][t][ia]; const ib = b.months.indexOf(m); return ib >= 0 && b[k] && b[k][t] ? b[k][t][ib] : null; });
  const out = { months, units: a.units || b.units, source: source || [a.source, b.source].filter(Boolean).join(' + ') };
  for (const k of ['pax', 'rpm', 'asm', 'lf']) out[k] = { dom: pick(k, 'dom'), intl: pick(k, 'intl'), total: pick(k, 'total') };
  return out;
}

// ---------------------------------------------------------------- airline route feeds
export function parseVolarisStations(json) {
  const st = Array.isArray(json) ? json : (json.data || []);
  const airports = {}, routes = new Set(), hubs = [];
  for (const s of st) {
    const code = s.stationCode; if (!code) continue;
    const cc = (s.country && (s.country.countryCode || s.country.code)) || '';
    airports[code] = { cc, name: s.stationName || code };
    if (s.isPrincipal) hubs.push(code);
    for (const c of ((s.route && s.route.connection) || [])) if (c.routeDirect === 1 || c.routeDirect === true) routes.add([code, c.arrivalStation].sort().join('-'));
  }
  return { kind: 'routes', source: 'volaris.com (stations feed)', hubs, airports, routes: [...routes].map((k) => k.split('-')) };
}
export function parseVivaStations(json) {
  const st = (json.data && json.data.stations) || json.stations || [];
  const airports = {}, routes = new Set();
  for (const s of st) {
    if (!s.code) continue; airports[s.code] = { cc: s.countryCode || '', name: s.name || s.code };
    for (const d of (s.destinations || [])) if (d.travelType && !/connect/i.test(d.travelType) && (!d.source || /VB/i.test(d.source))) routes.add([s.code, d.code].sort().join('-'));
  }
  return { kind: 'routes', source: 'vivaaerobus.com (stations feed)', hubs: [], airports, routes: [...routes].map((k) => k.split('-')) };
}

// ---------------------------------------------------------------- Wikipedia destination tables
const decode = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\[\s*\d+\s*\]/g, '').replace(/\s+/g, ' ').trim();
export function wikiTables(html) {
  return [...html.matchAll(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => {
    const trs = [...m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((t) => [...t[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => decode(c[1])));
    const header = trs.find((r) => r.length >= 2) || []; return { header, rows: trs.filter((r) => r !== header && r.length >= 2) };
  });
}
// Returns airports served: Mexican ones as IATA codes, foreign ones as {city, country}.
export function parseWikiDestinations(html, tableIndex, maps) {
  const tables = wikiTables(html); const t = tables[tableIndex] || tables.find((x) => x.header.some((h) => /airport/i.test(h))); if (!t) return null;
  const hi = (re) => t.header.findIndex((h) => re.test(h));
  const iCountry = hi(/country/i), iCity = hi(/^city/i), iAirport = hi(/airport/i), iIata = hi(/iata/i), iNotes = hi(/notes/i), iState = hi(/state/i);
  const mx = new Set(), foreign = [], rows = [];
  let lastCountry = '';
  for (const r of t.rows) {
    // rowspan on the country column leaves shorter rows; shift accordingly
    const off = t.header.length - r.length;
    const cell = (i) => (i < 0 ? '' : (r[i - (i > 0 ? Math.min(off, i) : 0)] || ''));
    let country = iCountry >= 0 ? (off > 0 && iCountry === 0 ? lastCountry : cell(iCountry)) : 'Mexico';
    if (country) lastCountry = country.replace(/\s*\(.*$/, '');
    country = lastCountry;
    const city = cell(iCity).replace(/\s*\(.*$/, ''), airport = cell(iAirport), notes = iNotes >= 0 ? cell(iNotes) : '', iata = iIata >= 0 ? cell(iIata).trim().toUpperCase() : '';
    if (/terminated|suspended|ended|discontinued|cancell?ed|charter|future|begins|resumes|tbd/i.test(notes)) continue;
    const isMx = /m[ée]xico|mexico/i.test(country) || /^MEX\b/.test(country) || (iState >= 0 && /MEX/.test(cell(iState)));
    if (isMx) { const code = iata && /^[A-Z]{3}$/.test(iata) ? iata : maps.mxCode(city, airport); if (code) mx.add(code); rows.push({ city, airport, code }); }
    else if (country) foreign.push({ country: strip(country), city: strip(city), airport: strip(airport) });
  }
  return { kind: 'airports', source: 'Wikipedia', mx: [...mx], foreign, rows: rows.length };
}

// ---------------------------------------------------------------- name -> code helpers
export function makeCodeMaps(airportsMeta, registry) {
  const byName = new Map();
  for (const a of airportsMeta) { for (const n of [a.es, a.en, a.afac].filter(Boolean)) byName.set(norm(n).replace(/\s*\(.*\)$/, ''), a.code); byName.set(norm(a.es).replace(/\s*\(.*\)$/, ''), a.code); }
  const od = new Map(Object.entries(registry.odNames || {}).filter(([k]) => k !== '_comment').map(([k, v]) => [norm(k), v]));
  const wiki = new Map(Object.entries(registry.wikiCities || {}).filter(([k]) => k !== '_comment').map(([k, v]) => [norm(k), v]));
  const mxCode = (city, airport) => {
    const c = norm(city).replace(/\s*\(.*\)$/, ''); if (wiki.has(c)) return wiki.get(c); if (byName.has(c)) return byName.get(c);
    const a = norm(airport); for (const [k, v] of wiki) if (a.includes(k) && k.length > 4) return v; for (const [k, v] of byName) if (k.length > 4 && a.includes(k)) return v; return null;
  };
  const odCode = (city) => { const c = norm(city); if (od.has(c)) return od.get(c); if (byName.has(c)) return byName.get(c); const c2 = c.replace(/^CIUDAD /, 'CD. '); if (byName.has(c2)) return byName.get(c2); return null; };
  return { mxCode, odCode };
}
// Wikipedia / airline city names -> AFAC's origin-destination spelling of foreign cities
const WIKI_TO_AFAC = { 'NEW YORK CITY': 'NUEVA YORK', 'NEW YORK': 'NUEVA YORK', 'DALLAS': 'DALLAS-FORT WORTH', 'FORT WORTH': 'DALLAS-FORT WORTH', 'LONDON': 'LONDRES', 'ROME': 'ROMA', 'ISTANBUL': 'ESTAMBUL (ARNAVUTKOY)', 'SANTIAGO': 'SANTIAGO DE CHILE', 'PANAMA CITY': 'PANAMA', 'GUATEMALA CITY': 'GUATEMALA', 'HAVANA': 'LA HABANA', 'SANTO DOMINGO': 'SANTO DOMINGO,REP DOM', 'CARTAGENA': 'CARTAGENA DE INDIAS', 'QUEBEC CITY': 'QUEBEC', 'WASHINGTON, D.C.': 'WASHINGTON', 'NEW ORLEANS': 'NUEVA ORLEANS', 'BARCELONA': 'BARCELONA, ESPAÑA', 'PORTLAND': 'PORTLAND, OREGON', 'SANTA ANA': 'SANTA ANA, CALIFORNIA', 'ORANGE COUNTY': 'SANTA ANA, CALIFORNIA', 'MINNEAPOLIS-SAINT PAUL': 'MINNEAPOLIS', 'MINNEAPOLIS/ST. PAUL': 'MINNEAPOLIS', 'RALEIGH': 'RALEIGH/DURHAM', 'CINCINNATI': 'COVINGTON', 'COLUMBUS': 'COLUMBUS, OHIO', 'REGINA': 'REGINA, CANADA', 'VICTORIA': 'VICTORIA, COLUMBIA', 'FREDERICTON': 'FREDERICTON, CANADA', 'BELIZE CITY': 'BELICE', 'SAN JOSE': 'SAN JOSE, COSTA RICA', 'BIRMINGHAM': 'BIRMINGHAM, INGLATERRA', 'TOKYO': 'TOKYO', 'SEOUL': 'SEOUL', 'SAO PAULO': 'SAO PAULO', 'HARLINGEN': 'HARLINGEN TEXAS', 'LISBON': 'LISBON', 'MUNICH': 'MUNICH', 'MILAN': 'MILAN' };
export function afacCity(city, country) {
  const c = norm(city).replace(/\s*\(.*\)$/, ''), k = norm(country);
  if (c === 'SAN JOSE' && /UNITED STATES|ESTADOS UNIDOS/.test(k)) return 'SAN JOSE, CALIFORNIA';
  if (c === 'LONDON' && /CANADA/.test(k)) return 'LONDON, ONTARIO';
  return WIKI_TO_AFAC[c] || c;
}
// airline feed IATA codes for foreign airports -> AFAC city names
export const FOREIGN_IATA = { LAX: 'LOS ANGELES', ONT: 'ONTARIO', SNA: 'SANTA ANA, CALIFORNIA', SAN: 'SAN DIEGO', SFO: 'SAN FRANCISCO', OAK: 'OAKLAND', SJC: 'SAN JOSE, CALIFORNIA', SMF: 'SACRAMENTO', FAT: 'FRESNO', LAS: 'LAS VEGAS', PHX: 'PHOENIX', DEN: 'DENVER', SLC: 'SALT LAKE CITY', SEA: 'SEATTLE', PDX: 'PORTLAND, OREGON', ORD: 'CHICAGO', MDW: 'CHICAGO', DFW: 'DALLAS-FORT WORTH', DAL: 'DALLAS-FORT WORTH', IAH: 'HOUSTON', HOU: 'HOUSTON', AUS: 'AUSTIN', SAT: 'SAN ANTONIO', MIA: 'MIAMI', FLL: 'FORT LAUDERDALE', MCO: 'ORLANDO', TPA: 'TAMPA', ATL: 'ATLANTA', CLT: 'CHARLOTTE', JFK: 'NUEVA YORK', LGA: 'NUEVA YORK', EWR: 'NEWARK', BOS: 'BOSTON', PHL: 'PHILADELPHIA', BWI: 'BALTIMORE', IAD: 'WASHINGTON', DCA: 'WASHINGTON', DTW: 'DETROIT', MSP: 'MINNEAPOLIS', STL: 'ST. LOUIS', MCI: 'KANSAS CITY', BNA: 'NASHVILLE', RDU: 'RALEIGH/DURHAM', CVG: 'COVINGTON', CLE: 'CLEVELAND', IND: 'INDIANAPOLIS', MKE: 'MILWAUKEE', CMH: 'COLUMBUS, OHIO', TUL: 'TULSA', MSY: 'NUEVA ORLEANS', RNO: 'RENO', ELP: 'EL PASO', TUS: 'TUCSON', ABQ: 'ALBUQUERQUE', OKC: 'OKLAHOMA CITY', JAX: 'JACKSONVILLE', HRL: 'HARLINGEN TEXAS', ORF: 'NORFOLK', PIT: 'PITTSBURGH', MEM: 'MEMPHIS', YYZ: 'TORONTO', YUL: 'MONTREAL', YVR: 'VANCOUVER', YYC: 'CALGARY', YEG: 'EDMONTON', YWG: 'WINNIPEG', YOW: 'OTTAWA', YQB: 'QUEBEC', YHZ: 'HALIFAX', YLW: 'KELOWNA', YQR: 'REGINA, CANADA', YXE: 'SASKATOON', YYJ: 'VICTORIA, COLUMBIA', YHM: 'HAMILTON', YQM: 'MONCTON', YXU: 'LONDON, ONTARIO', YFC: 'FREDERICTON, CANADA', YQT: 'THUNDER BAY', YQQ: 'COMOX', BOG: 'BOGOTA', MDE: 'MEDELLIN', CLO: 'CALI', CTG: 'CARTAGENA DE INDIAS', LIM: 'LIMA', SJO: 'SAN JOSE, COSTA RICA', GUA: 'GUATEMALA', SAL: 'SAN SALVADOR', PTY: 'PANAMA', HAV: 'LA HABANA', CMW: 'CAMAGUEY', PUJ: 'PUNTA CANA', SDQ: 'SANTO DOMINGO,REP DOM', SAP: 'SAN PEDRO SULA', XPL: 'COMAYAGUA', MGA: 'MANAGUA', UIO: 'QUITO', GYE: 'GUAYAQUIL', CCS: 'CARACAS', SCL: 'SANTIAGO DE CHILE', EZE: 'BUENOS AIRES', GRU: 'SAO PAULO', BSB: 'BRASILIA', GIG: 'RIO DE JANEIRO', MVD: 'MONTEVIDEO', MAD: 'MADRID', BCN: 'BARCELONA, ESPAÑA', CDG: 'PARIS', ORY: 'PARIS', LHR: 'LONDRES', LGW: 'LONDRES', MAN: 'MANCHESTER', BHX: 'BIRMINGHAM, INGLATERRA', GLA: 'GLASGOW', NCL: 'NEWCASTLE', AMS: 'AMSTERDAM', FRA: 'FRANKFURT', MUC: 'MUNICH', DUS: 'DUSSELDORF', ZRH: 'ZURICH', FCO: 'ROMA', MXP: 'MILAN', LIS: 'LISBON', IST: 'ESTAMBUL (ARNAVUTKOY)', DXB: 'DUBAI', DOH: 'DOHA', NRT: 'TOKYO', HND: 'TOKYO', ICN: 'SEOUL', SZX: 'SHENZHEN', PEK: 'BEIJING', PVG: 'SHANGHAI', HEL: 'HELSINKI', BRU: 'BRUSELAS', VIE: 'VIENA', DUB: 'DUBLIN', SJU: 'SAN JUAN', BZE: 'BELICE', FRS: 'FLORES', TGU: 'TEGUCIGALPA', RTB: 'ROATAN', KIN: 'KINGSTON', MBJ: 'MONTEGO BAY', NAS: 'NASSAU', AUA: 'ARUBA' };

// ---------------------------------------------------------------- compiler
export function compile(input) {
  const { registry, airportsMeta, cities, resumenes, sases, ir = {}, networks = {}, sources = {} } = input;
  const carriersReg = registry.carriers;
  const maps = makeCodeMaps(airportsMeta.concat(registry.extraAirports || []), registry);
  const years = resumenes.map((r) => r.year).filter(Boolean);
  const cur = resumenes.reduce((a, b) => (!a || b.year > a.year ? b : a), null);
  const from = ym(Math.min(...years), 1), to = ym(cur.year, cur.lastMonth);
  const months = ymRange(from, to), N = months.length, idx = (y, m) => months.indexOf(ym(y, m));
  const zeros = () => new Array(N).fill(0);
  const regionsReg = registry.regions || {};
  const regionId = (r) => { const k = Object.keys(regionsReg).find((x) => norm(x) === norm(r)); return k ? regionsReg[k].id : (r ? slug(r).toUpperCase() : 'OTHER'); };
  const matchReg = (name) => carriersReg.find((c) => new RegExp(c.match, 'i').test(strip(name)));
  const carriers = new Map(); // id -> record
  const rec = (id, base) => { if (!carriers.has(id)) carriers.set(id, { id, ...base, aliases: [], pax: { dom: zeros(), intl: zeros() }, flights: { dom: zeros(), intl: zeros() }, cargoT: { dom: zeros(), intl: zeros() } }); return carriers.get(id); };
  for (const r of resumenes) {
    for (const [name, c] of Object.entries(r.carriers)) {
      let id, base;
      if (c.scope === 'MX') { const reg = matchReg(name); id = reg ? reg.id : 'MX_' + slug(name).toUpperCase(); base = reg ? { name: reg.name, short: reg.short, group: 'mx', type: reg.type || 'pax', iata: reg.iata || null, active: reg.active !== false, color: reg.color } : { name: strip(name).replace(/\s*\(.*$/, ''), short: strip(name).replace(/\s*\(.*$/, ''), group: 'mx', type: 'pax', active: true }; }
      else { id = 'F_' + slug(name).toUpperCase(); base = { name: strip(name).replace(/\s*\((?!.*\)$).*$/, '').replace(/\s*\(.*\)\s*$/, ''), short: strip(name).replace(/\s*\(.*$/, ''), group: 'foreign', type: 'pax', region: regionId(c.region), active: true }; }
      const k = rec(id, base); if (!k.aliases.includes(name)) k.aliases.push(name);
      for (const [measure, key] of [['pax', 'pax'], ['flights', 'flights'], ['cargo', 'cargoT']]) for (const sec of ['dom', 'intl']) {
        const vals = c[measure] && c[measure][sec]; if (!vals) continue;
        vals.forEach((v, m) => { const i = idx(r.year, m + 1); if (i >= 0 && i < N) k[key][sec][i] += measure === 'cargo' ? v / 1000 : v; });
      }
    }
  }
  // clean-up: round, mark last non-zero, drop empty foreign carriers
  const lastNZ = (a) => { let l = -1; a.forEach((v, i) => { if (v) l = i; }); return l; };
  for (const [id, k] of carriers) {
    for (const key of ['pax', 'flights', 'cargoT']) for (const sec of ['dom', 'intl']) k[key][sec] = k[key][sec].map((v) => (key === 'cargoT' ? +v.toFixed(1) : Math.round(v)));
    const tot = k.pax.dom.map((v, i) => v + k.pax.intl[i]); k.lastActive = lastNZ(tot) >= 0 ? months[lastNZ(tot)] : null;
    k.activeNow = lastNZ(tot) >= N - 3; // flew in one of the last three months
    if (k.group === 'foreign') { delete k.cargoT; delete k.pax.dom; delete k.flights.dom; if (lastNZ(k.pax.intl) < 0) carriers.delete(id); }
    if (k.type === 'cargo') { delete k.pax; }
  }
  // totals & regions
  const totals = { mxDom: zeros(), mxIntl: zeros(), foreignIntl: zeros(), all: zeros(), flightsMx: zeros(), flightsForeign: zeros() };
  const regions = {};
  for (const k of carriers.values()) {
    if (!k.pax) continue;
    if (k.group === 'mx') for (let i = 0; i < N; i++) { totals.mxDom[i] += k.pax.dom[i]; totals.mxIntl[i] += k.pax.intl[i]; totals.flightsMx[i] += k.flights.dom[i] + k.flights.intl[i]; }
    else { const rg = (regions[k.region] ??= { id: k.region, pax: zeros(), flights: zeros(), carriers: 0 }); rg.carriers++; for (let i = 0; i < N; i++) { totals.foreignIntl[i] += k.pax.intl[i]; totals.flightsForeign[i] += k.flights.intl[i] || 0; rg.pax[i] += k.pax.intl[i]; rg.flights[i] += k.flights.intl[i] || 0; } }
  }
  for (let i = 0; i < N; i++) totals.all[i] = totals.mxDom[i] + totals.mxIntl[i] + totals.foreignIntl[i];
  for (const [k, v] of Object.entries(regionsReg)) if (regions[v.id]) Object.assign(regions[v.id], { es: v.es, en: v.en });

  // ---- corridors (routes.js) : trailing 12 months ending at `to`, plus the 12 before for y/y
  const win = ymRange(ymAdd(to, -11), to), prev = ymRange(ymAdd(to, -23), ymAdd(to, -12));
  const byYear = new Map(sases.map((s) => [s.year, s]));
  const monthVal = (rows, keyFn, y, m, field) => { const s = byYear.get(y); if (!s) return null; const r = rows(s).find(keyFn); return r ? r[field][m - 1] : 0; };
  const collect = (kind) => {
    const acc = new Map();
    for (const s of sases) for (const r of s[kind]) {
      const key = kind === 'dom' ? [r.a, r.b].sort().join('~') : (r.ac && /mexico/i.test(r.ac) ? `${r.a}~${r.b}|${r.bc}` : `${r.b}~${r.a}|${r.ac}`);
      const e = acc.get(key) || (acc.set(key, { key, pax: new Map(), flights: new Map(), cargo: new Map() }), acc.get(key));
      for (let m = 1; m <= 12; m++) { const k = ym(s.year, m); e.pax.set(k, (e.pax.get(k) || 0) + r.pax[m - 1]); e.flights.set(k, (e.flights.get(k) || 0) + r.flights[m - 1]); e.cargo.set(k, (e.cargo.get(k) || 0) + r.cargo[m - 1]); }
    }
    return acc;
  };
  const cityIndex = new Map(Object.entries(cities).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [norm(k), v]));
  const countryIndex = new Map(Object.entries(cities._countries || {}).map(([k, v]) => [norm(k), v]));
  const unmatched = new Set();
  const domestic = [], international = [];
  for (const e of collect('dom').values()) {
    const [a, b] = e.key.split('~'); const ca = maps.odCode(a), cb = maps.odCode(b);
    if (!ca) unmatched.add(a); if (!cb) unmatched.add(b);
    const pax = win.map((k) => e.pax.get(k) || 0), flights = win.map((k) => e.flights.get(k) || 0);
    const tot = pax.reduce((x, y) => x + y, 0); if (!tot) continue;
    domestic.push({ a: ca || a, b: cb || b, ok: !!(ca && cb), pax, flights: flights.reduce((x, y) => x + y, 0), cargoT: +(win.reduce((x, k) => x + (e.cargo.get(k) || 0), 0) / 1000).toFixed(1), prev: prev.reduce((x, k) => x + (e.pax.get(k) || 0), 0) });
  }
  for (const e of collect('intl').values()) {
    const [mxCity, rest] = e.key.split('~'); const [city, country] = rest.split('|'); const code = maps.odCode(mxCity); if (!code) unmatched.add(mxCity);
    const pax = win.map((k) => e.pax.get(k) || 0), flights = win.map((k) => e.flights.get(k) || 0);
    const tot = pax.reduce((x, y) => x + y, 0); if (!tot) continue;
    const c = cityIndex.get(norm(city)) || countryIndex.get(norm(country)) || null;
    international.push({ mx: code || mxCity, ok: !!code, city: strip(city), country: strip(country), cc: c ? c.cc : null, lat: c ? c.lat : null, lon: c ? c.lon : null, approx: !cityIndex.has(norm(city)), pax, flights: flights.reduce((x, y) => x + y, 0), prev: prev.reduce((x, k) => x + (e.pax.get(k) || 0), 0) });
  }
  domestic.sort((x, y) => y.pax.reduce((a, b) => a + b, 0) - x.pax.reduce((a, b) => a + b, 0));
  international.sort((x, y) => y.pax.reduce((a, b) => a + b, 0) - x.pax.reduce((a, b) => a + b, 0));

  // ---- networks: exact routes from feeds, or airports served (Wikipedia) with routes estimated from hubs
  const domSet = new Set(domestic.filter((d) => d.ok).map((d) => [d.a, d.b].sort().join('-')));
  const intlSet = new Set(international.filter((d) => d.ok).map((d) => d.mx + '>' + norm(d.city)));
  const nets = {};
  for (const reg of carriersReg) {
    const n = networks[reg.id]; if (!n) continue;
    const out = { kind: n.kind, source: n.source, asOf: n.asOf || null, hubs: n.hubs && n.hubs.length ? n.hubs : (reg.hubs || []), focus: reg.focus || [], estimated: n.kind !== 'routes' };
    if (n.kind === 'routes') {
      const mxSet = new Set(airportsMeta.map((a) => a.code).concat((registry.extraAirports || []).map((a) => a.code)));
      out.airports = [...new Set(n.routes.flat().filter((c) => mxSet.has(c)))].sort();
      out.foreignAirports = [...new Set(n.routes.flat().filter((c) => !mxSet.has(c)))].sort();
      out.domRoutes = n.routes.filter(([a, b]) => mxSet.has(a) && mxSet.has(b)).map(([a, b]) => [a, b].sort());
      out.intlRoutes = n.routes.filter(([a, b]) => mxSet.has(a) !== mxSet.has(b)).map(([a, b]) => { const mx = mxSet.has(a) ? a : b, f = mxSet.has(a) ? b : a; return { mx, iata: f, city: FOREIGN_IATA[f] || null, cc: (n.airports[f] || {}).cc || null }; });
      if (!out.hubs.length) { const deg = {}; out.domRoutes.concat(out.intlRoutes.map((r) => [r.mx, r.iata])).forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }); out.hubs = Object.entries(deg).filter(([c]) => mxSet.has(c)).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([c]) => c); }
    } else {
      out.airports = (n.mx || []).slice().sort();
      out.foreign = n.foreign || [];
      out.foreignCountries = [...new Set(out.foreign.map((f) => f.country))];
      const hubs = new Set([...(out.hubs || []), ...(out.focus || [])]);
      out.domRoutes = []; out.intlRoutes = [];
      for (const h of hubs) { for (const a of out.airports) if (a !== h && domSet.has([h, a].sort().join('-'))) out.domRoutes.push([h, a].sort()); for (const f of out.foreign) { const city = afacCity(f.city, f.country); if (intlSet.has(h + '>' + norm(city))) out.intlRoutes.push({ mx: h, city, cc: null }); } }
      out.domRoutes = [...new Set(out.domRoutes.map((r) => r.join('-')))].map((k) => k.split('-'));
    }
    out.counts = { airportsMx: out.airports.length, foreign: out.kind === 'routes' ? out.foreignAirports.length : out.foreign.length, domRoutes: out.domRoutes.length, intlRoutes: out.intlRoutes.length };
    nets[reg.id] = out;
  }
  // Grupo Aeromexico = mainline + Connect: one network for the map, hubs of both
  if (nets.AM || nets.AMC) {
    const parts = [nets.AM, nets.AMC].filter(Boolean);
    const uniqPairs = (arrs) => [...new Set(arrs.flat().map((r) => r.join('-')))].map((k) => k.split('-'));
    const uniqIntl = (arrs) => { const seen = new Map(); arrs.flat().forEach((r) => seen.set(r.mx + '>' + (r.city || r.iata), r)); return [...seen.values()]; };
    const g = { kind: 'airports', source: parts.map((p) => p.source).filter((v, i, a) => a.indexOf(v) === i).join(' + '), asOf: parts[0].asOf, estimated: true,
      hubs: [...new Set(parts.flatMap((p) => p.hubs))], focus: [...new Set(parts.flatMap((p) => p.focus || []))],
      airports: [...new Set(parts.flatMap((p) => p.airports))].sort(), foreign: uniqIntl(parts.map((p) => (p.foreign || []).map((f) => ({ mx: '', city: f.city, country: f.country })))).map((f) => ({ city: f.city, country: f.country })),
      domRoutes: uniqPairs(parts.map((p) => p.domRoutes)), intlRoutes: uniqIntl(parts.map((p) => p.intlRoutes)) };
    g.foreignCountries = [...new Set(g.foreign.map((f) => f.country))];
    g.counts = { airportsMx: g.airports.length, foreign: g.foreign.length, domRoutes: g.domRoutes.length, intlRoutes: g.intlRoutes.length };
    nets.AMG = g;
  }

  const airlines = {
    generatedAt: new Date().toISOString(), months, lastMonth: to, from,
    carriers: [...carriers.values()].sort((a, b) => (a.group === b.group ? 0 : a.group === 'mx' ? -1 : 1)),
    groups: { AMG: { members: ['AM', 'AMC'], name: 'Grupo Aeroméxico', short: 'Aeroméxico', color: (carriersReg.find((c) => c.id === 'AM') || {}).color } },
    regions: Object.values(regions), totals, ir, networks: nets,
    sources, units: { pax: 'passengers (scheduled service, persons)', flights: 'flights', cargoT: 'metric tons' },
  };
  const airportIndex = {}; for (const a of airportsMeta.concat(registry.extraAirports || [])) airportIndex[a.code] = { es: a.es, en: a.en, st: a.st, lat: a.lat, lon: a.lon, grp: a.grp || null };
  const routes = { generatedAt: airlines.generatedAt, window: { from: win[0], to: win[win.length - 1] }, prevWindow: { from: prev[0], to: prev[prev.length - 1] }, months: win, airports: airportIndex, domestic, international: international.slice(0, 400), unmatched: [...unmatched], sources: { afac: sources.afacOd || null } };
  // slim summary for the hub tile: last 24 months, passengers by Mexican carrier (Aeromexico grouped) and foreign total
  const K = 24, s0 = Math.max(0, N - K);
  const tot2 = (c) => c.pax.dom.map((v, i) => v + c.pax.intl[i]);
  const mxList = [...carriers.values()].filter((c) => c.group === 'mx' && c.pax);
  const grouped = new Map();
  for (const c of mxList) { const gid = ['AM', 'AMC'].includes(c.id) ? 'AMG' : c.id; const g = grouped.get(gid) || { id: gid, name: gid === 'AMG' ? 'Aeroméxico' : c.short, color: gid === 'AMG' ? (carriersReg.find((x) => x.id === 'AM') || {}).color : c.color, pax: zeros() }; tot2(c).forEach((v, i) => (g.pax[i] += v)); grouped.set(gid, g); }
  const summary = { generatedAt: airlines.generatedAt, months: months.slice(s0), lastMonth: to,
    carriers: [...grouped.values()].map((g) => ({ ...g, pax: g.pax.slice(s0) })).filter((g) => g.pax.some((v) => v)).sort((a, b) => b.pax[b.pax.length - 1] - a.pax[a.pax.length - 1]),
    foreign: totals.foreignIntl.slice(s0), all: totals.all.slice(s0) };
  return { airlines, routes, summary };
}
