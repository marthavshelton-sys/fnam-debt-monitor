// Discovery helper for the Mexico fiscal pipeline. Runs on the GitHub Actions runner (which can
// reach Banxico and SHCP) via the refresh-mx-data workflow's `probe` input; nothing is written.
//
//   node scripts/mx-fiscal/probe.mjs "banxico-dir 9; banxico-cuadro CG2 9; shcp-index; shcp-csv <url>"
//
// Commands (separated by ';'):
//   banxico-dir <sector>              list the cuadros (tables) of an SIE sector with their titles
//   banxico-cuadro <idCuadro> <sector> list every series id found in a cuadro page, with the official
//                                     title, frequency, unit and last date from the SIE API
//   banxico-ids <id,id,...>           metadata for specific series ids
//   shcp-index                        list the CSV/XLSX links on SHCP's Estadísticas Oportunas open-data page
//   shcp-csv <url> [rows]             fetch a CSV and print its shape, header and first/last rows
//   shcp-concepts <url>               list the CLAVE_DE_CONCEPTO rows of an SHCP long-format CSV with names, units and ranges
//   url <url>                         GET any url and print status, content-type and the first 1,500 chars
//   tls <host>                        show the served certificate chain, its SAN, and the AIA chain repair result
//   banxico-range <prefix> <from> <to> official titles of every id in a numeric range (20 per request)

import { get as netGet, getText, peerChain, repairChain, trustedRootCount, sleep as netSleep } from './net.mjs';
const UA = 'fnam-debt-monitor/1.0 (+https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const TOKEN = process.env.BANXICO_TOKEN || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Minimal CSV parser (quotes, embedded delimiters, CRLF) for SHCP's open-data tables.
function parseCSV(text) {
  const delim = (text.split(/\r?\n/)[0] || '').includes(';') ? ';' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

let lastBanxico = 0;
// Banxico's web pages answer 429 to bursts, so page requests are paced ~2 s apart and retried with backoff.
async function http(url, headers = {}, tries = 4) {
  if (url.includes('banxico.org.mx/SieInternet')) {
    const wait = 2000 - (Date.now() - lastBanxico);
    if (wait > 0) await sleep(wait);
  }
  for (let i = 1; ; i++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' });
    } catch (e) {
      const cause = e.cause ? ` (${e.cause.code || ''} ${e.cause.message || ''})` : '';
      if (i >= tries) throw new Error(`${e.message}${cause} for ${url}`);
      await sleep(1500 * i); continue;
    } finally {
      if (url.includes('banxico.org.mx/SieInternet')) lastBanxico = Date.now();
    }
    if (res.status === 429 && i < tries) { await sleep(5000 * i); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  }
}
const clean = (t) => String(t || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function banxicoMeta(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    try {
      const j = await (await http(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${chunk.join(',')}`, { 'Bmx-Token': TOKEN, Accept: 'application/json' })).json();
      for (const s of j?.bmx?.series || []) out.push(s);
    } catch (e) {
      console.log(`  metadata chunk failed (${chunk[0]}…): ${e.message}`);
    }
  }
  return out;
}
function printMeta(series) {
  for (const s of series) {
    console.log(`  ${String(s.idSerie).padEnd(9)} ${String(s.periodicidad || '').padEnd(10)} ${String(s.fechaFin || '').padEnd(11)} ${String(s.unidad || '').slice(0, 28).padEnd(28)} «${clean(s.titulo)}»`);
  }
}

const commands = {
  async 'banxico-dir'(sector) {
    const html = await (await http(`https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=consultarDirectorioCuadros&sector=${sector}&locale=es`)).text();
    const seen = new Set();
    const re = /idCuadro=([A-Z]{2}\d+)[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      console.log(`  ${m[1].padEnd(8)} ${clean(m[2]).slice(0, 140)}`);
    }
    if (!seen.size) console.log('  (no cuadros found; first 600 chars follow)\n' + html.slice(0, 600));
  },
  async 'banxico-cuadro'(idCuadro, sector) {
    const accion = /^CA/.test(idCuadro) ? 'consultarCuadroAnalitico' : 'consultarCuadro';
    const url = `https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=${accion}&idCuadro=${idCuadro}&sector=${sector}&locale=es`;
    const html = await (await http(url)).text();
    const title = clean((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const ids = [...new Set(html.match(/\bS[A-Z]\d{3,7}\b/g) || [])];
    console.log(`  cuadro ${idCuadro} (sector ${sector}) «${title}» — ${ids.length} series ids in page`);
    if (!ids.length) { console.log(html.slice(0, 800)); return; }
    printMeta(await banxicoMeta(ids));
  },
  async 'banxico-ids'(list) { printMeta(await banxicoMeta(list.split(',').map((s) => s.trim()).filter(Boolean))); },
  async tls(host) {
    // What the server sends, then the AIA walk net.mjs performs to complete the chain.
    const info = await peerChain(host);
    console.log(`  served: authorized=${info.authorized} ${info.authorizationError || ''}`);
    for (const c of info.chain) console.log(`    subject=${c.subject} issuer=${c.issuer} validTo=${c.validTo} AIA=${JSON.stringify(c.infoAccess['CA Issuers - URI'] || [])}`);
    if (info.chain[0]) console.log(`    SAN: ${info.chain[0].san.slice(0, 600)}`);
    const rep = await repairChain(host);
    console.log(`  repair: anchor=${rep.anchor || 'NONE'} ${rep.error || ''} (${trustedRootCount()} trusted roots)`);
    for (const d of rep.downloaded) console.log(`    ${d}`);
  },
  async 'banxico-range'(prefix, from, to) {
    // Dump the official title of every id in a numeric range, 20 per request, paced — the SIE
    // has no search endpoint, so this is how a whole table's rows are found.
    const ids = [];
    for (let n = Number(from); n <= Number(to); n++) ids.push(prefix + n);
    let shown = 0;
    for (let i = 0; i < ids.length; i += 20) {
      const chunk = ids.slice(i, i + 20);
      try {
        const j = await (await http(`https://www.banxico.org.mx/SieAPIRest/service/v1/series/${chunk.join(',')}`, { 'Bmx-Token': TOKEN, Accept: 'application/json' })).json();
        for (const s of j?.bmx?.series || []) if (clean(s.titulo)) { shown++; console.log(`  ${String(s.idSerie).padEnd(8)} ${String(s.periodicidad || '').padEnd(9)} ${String(s.fechaFin || '').padEnd(11)} ${String(s.unidad || '').slice(0, 26).padEnd(26)} «${clean(s.titulo)}»`); }
      } catch (e) { console.log(`  chunk ${chunk[0]}: ${e.message}`); }
      await netSleep(700);
    }
    console.log(`  ${shown} titled series in ${prefix}${from}–${prefix}${to}`);
  },
  async 'shcp-index'() {
    const html = await getText('https://www.secciones.hacienda.gob.mx/es/estadisticas_oportunas/base_de_datos');
    const links = [...new Set((html.match(/https?:\/\/[^"'\s>]+\.(?:csv|xlsx?|zip|json)(?:\?[^"'\s>]*)?/gi) || []).concat((html.match(/\/work\/models\/[^"'\s>]+\.(?:csv|xlsx?|zip|json)/gi) || []).map((p) => 'https://www.secciones.hacienda.gob.mx' + p)))];
    console.log(`  ${links.length} data links`);
    for (const l of links) console.log('  ' + l);
    if (!links.length) console.log(html.slice(0, 1500));
  },
  async 'shcp-csv'(url, rows = '6') {
    const buf = (await netGet(url)).body;
    let text = buf.toString('utf8');
    if (text.includes('�')) text = buf.toString('latin1');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const delim = (lines[0] || '').includes(';') ? ';' : ',';
    console.log(`  ${buf.length} bytes, ${lines.length} lines, delimiter '${delim}', ${(lines[0] || '').split(delim).length} columns`);
    const n = Number(rows) || 6;
    lines.slice(0, n).forEach((l) => console.log('  H ' + l.slice(0, 400)));
    lines.slice(-3).forEach((l) => console.log('  T ' + l.slice(0, 400)));
  },
  async 'shcp-concepts'(url) {
    // SHCP's open-data CSVs are long tables: one row per (CICLO, MES, CLAVE_DE_CONCEPTO). List the concepts.
    const rows = parseCSV(await getText(url));
    const h = rows[0].map((x) => x.trim().toUpperCase());
    const ix = (n) => h.indexOf(n);
    const [iCiclo, iMes, iClave, iNombre, iTema, iSub, iUnidad, iFin, iMonto] = ['CICLO', 'MES', 'CLAVE_DE_CONCEPTO', 'NOMBRE', 'TEMA', 'SUBTEMA', 'UNIDAD_DE_MEDIDA', 'PERIODO_FINAL', 'MONTO'].map(ix);
    console.log(`  ${rows.length - 1} rows, columns: ${h.join(' | ')}`);
    const by = new Map();
    for (const r of rows.slice(1)) {
      if (!r[iClave]) continue;
      const c = by.get(r[iClave]) || { clave: r[iClave], nombre: r[iNombre], tema: r[iTema], sub: r[iSub], unidad: r[iUnidad], fin: r[iFin], n: 0, first: `${r[iCiclo]}-${r[iMes]}`, last: '', lastVal: '' };
      c.n++; c.last = `${r[iCiclo]}-${r[iMes]}`; c.lastVal = r[iMonto];
      by.set(r[iClave], c);
    }
    for (const c of [...by.values()].sort((a, b) => a.clave.localeCompare(b.clave))) console.log(`  ${c.clave.padEnd(12)} ${String(c.n).padStart(4)} ${c.first}→${c.last} ${String(c.lastVal).padStart(14)} [${c.unidad}] «${c.nombre}» (${c.tema} / ${c.sub})`);
  },
  async url(u) {
    const res = await netGet(u);
    const text = res.body.toString('utf8');
    console.log(`  ${res.status} ${res.headers['content-type']} ${text.length} chars\n` + text.slice(0, 1500));
  },
};

const spec = process.argv.slice(2).join(' ');
for (const raw of spec.split(';').map((s) => s.trim()).filter(Boolean)) {
  const [name, ...args] = raw.split(/\s+/);
  console.log(`\n== ${raw}`);
  try {
    if (!commands[name]) throw new Error(`unknown command ${name}`);
    await commands[name](...args);
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
