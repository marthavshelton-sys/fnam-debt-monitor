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
//   url <url>                         GET any url and print status, content-type and the first 1,500 chars

const UA = 'fnam-debt-monitor/1.0 (+https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const TOKEN = process.env.BANXICO_TOKEN || '';

async function http(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
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
    const url = `https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=consultarCuadro&idCuadro=${idCuadro}&sector=${sector}&locale=es`;
    const html = await (await http(url)).text();
    const title = clean((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const ids = [...new Set(html.match(/\bS[A-Z]\d{3,7}\b/g) || [])];
    console.log(`  cuadro ${idCuadro} (sector ${sector}) «${title}» — ${ids.length} series ids in page`);
    if (!ids.length) { console.log(html.slice(0, 800)); return; }
    printMeta(await banxicoMeta(ids));
  },
  async 'banxico-ids'(list) { printMeta(await banxicoMeta(list.split(',').map((s) => s.trim()).filter(Boolean))); },
  async 'shcp-index'() {
    const html = await (await http('https://www.secciones.hacienda.gob.mx/es/estadisticas_oportunas/base_de_datos')).text();
    const links = [...new Set((html.match(/https?:\/\/[^"'\s>]+\.(?:csv|xlsx?|zip|json)(?:\?[^"'\s>]*)?/gi) || []).concat((html.match(/\/work\/models\/[^"'\s>]+\.(?:csv|xlsx?|zip|json)/gi) || []).map((p) => 'https://www.secciones.hacienda.gob.mx' + p)))];
    console.log(`  ${links.length} data links`);
    for (const l of links) console.log('  ' + l);
    if (!links.length) console.log(html.slice(0, 1500));
  },
  async 'shcp-csv'(url, rows = '6') {
    const buf = Buffer.from(await (await http(url)).arrayBuffer());
    let text = buf.toString('utf8');
    if (text.includes('�')) text = buf.toString('latin1');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const delim = (lines[0] || '').includes(';') ? ';' : ',';
    console.log(`  ${buf.length} bytes, ${lines.length} lines, delimiter '${delim}', ${(lines[0] || '').split(delim).length} columns`);
    const n = Number(rows) || 6;
    lines.slice(0, n).forEach((l) => console.log('  H ' + l.slice(0, 400)));
    lines.slice(-3).forEach((l) => console.log('  T ' + l.slice(0, 400)));
  },
  async url(u) {
    const res = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const text = await res.text();
    console.log(`  ${res.status} ${res.headers.get('content-type')} ${text.length} chars\n` + text.slice(0, 1500));
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
