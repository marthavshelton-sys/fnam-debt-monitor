// Pulls the fast-moving Banxico series (policy rate, FIX exchange rate, international reserves,
// TIIE, Cetes, UDI, monetary base) from Banco de México's SIE REST API and writes
// site/mx/fiscal/data.js as `window.LIVE_DATA_MX = {...}`.
//
// The SIE API needs a free token (https://www.banxico.org.mx/SieAPIRest/service/v1/token),
// supplied as the BANXICO_TOKEN environment variable (a GitHub Actions secret in CI).
// Docs: https://www.banxico.org.mx/SieAPIRest/service/v1/doc/consultaDatosSerieOp
//
// This script intentionally does NOT touch the SHCP public-finance figures (SHRFSP, revenue,
// spending, holders) — those come from SHCP's monthly release and are refreshed on a separate,
// monthly cadence via a reviewed PR to site/mx/fiscal/monthly-data.js.
//
// Runs on GitHub Actions' ubuntu-latest runner (Node 20+, global fetch). No npm install needed.

const OUT_PATH = new URL('../site/mx/fiscal/data.js', import.meta.url);
const TOKEN = process.env.BANXICO_TOKEN;

// Series catalogue: https://www.banxico.org.mx/SieAPIRest/service/v1/doc/catalogoSeries
// The response carries each series' official title, which is logged on every run so a wrong
// ID is caught immediately (see `titulo` in the log).
const SERIES = {
  // `ids`: candidate series IDs, tried in order; the first whose official title matches `title`
  // wins. Every candidate's title is logged, so a wrong guess is visible (and correctable) on the
  // next run instead of silently publishing the wrong series. Confirmed IDs are listed first.
  tasaObjetivo: { ids: ['SF61745'], title: /tasa objetivo/i, desc: 'Tasa objetivo, % anual' },
  fix:          { ids: ['SF43718'], title: /FIX/, desc: 'Tipo de cambio FIX, pesos por dólar' },
  reservas:     { ids: ['SF43707'], title: /reserva internacional/i, desc: 'Reservas internacionales, millones de dólares (semanal)' },
  tiie28:       { ids: ['SF43783'], title: /TIIE a 28/i, desc: 'TIIE a 28 días, % anual' },
  cetes28:      { ids: ['SF43936'], title: /cetes a 28/i, desc: 'Cetes a 28 días, tasa de rendimiento en subasta primaria, %' },
  cetes91:      { ids: ['SF43939'], title: /cetes a 91/i, desc: 'Cetes a 91 días, tasa de rendimiento en subasta primaria, %' },
  cetes182:     { ids: ['SF43942'], title: /cetes a 182/i, desc: 'Cetes a 182 días, tasa de rendimiento en subasta primaria, %' },
  cetes364:     { ids: (process.env.BANXICO_SERIES_CETES_364 ? [process.env.BANXICO_SERIES_CETES_364] : []).concat(['SF43945']), title: /cetes a 364/i, desc: 'Cetes a 364 días, tasa de rendimiento en subasta primaria, %' },
  udi:          { ids: ['SP68257'], title: /UDIS?/i, desc: 'Valor de la UDI, pesos' },
  // Monetary base, millions of pesos, weekly. Confirmed 2026-09-13: SF43695 «Base monetaria, circulante y
  // depósitos — Base monetaria». The title pattern is deliberately narrow: SF1 («Fuentes y usos de la base
  // monetaria — Billetes y monedas en circulación», thousands of pesos, monthly) also contains the words
  // "base monetaria" and was published by mistake on the first probe run.
  baseMonetaria:{ ids: (process.env.BANXICO_SERIES_BASE_MONETARIA ? [process.env.BANXICO_SERIES_BASE_MONETARIA] : []).concat(['SF43695']), title: /circulante y dep[oó]sitos\s+Base monetaria$/i, desc: 'Base monetaria, millones de pesos (semanal)' },
};

// Banxico dates arrive as "dd/mm/yyyy"; normalise to ISO so the page's string-only date
// formatting (no Date objects, no timezone shifts) works unchanged.
function toISO(dmy) {
  const [d, m, y] = dmy.split('/');
  return `${y}-${m}-${d}`;
}

async function fetchOportuno(ids) {
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${ids.join(',')}/datos/oportuno?token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'fnam-debt-monitor-bot/1.0' } });
  if (!res.ok) throw new Error(`Banxico SIE -> HTTP ${res.status} ${await res.text().catch(() => '')}`);
  const j = await res.json();
  const out = {};
  for (const s of (j.bmx && j.bmx.series) || []) {
    const d = (s.datos || [])[0];
    const raw = d ? String(d.dato).replace(/,/g, '') : '';
    const val = raw && raw !== 'N/E' ? Number(raw) : NaN;
    out[s.idSerie] = { titulo: s.titulo, date: d ? toISO(d.fecha) : null, value: Number.isFinite(val) ? val : null };
  }
  return out;
}

async function main() {
  if (!TOKEN) {
    console.error('BANXICO_TOKEN is not set — nothing fetched, data.js left unchanged.');
    process.exit(1);
  }
  const keys = Object.keys(SERIES);
  const ids = [...new Set(keys.flatMap((k) => SERIES[k].ids))];
  // The SIE API caps a request at 20 series; probe candidates push us past that, so fetch in chunks.
  // One bad ID can fail a whole multi-series call, so a failed chunk falls back to one request per series.
  const bySeries = {};
  for (let i = 0; i < ids.length; i += 15) {
    const chunk = ids.slice(i, i + 15);
    try {
      Object.assign(bySeries, await fetchOportuno(chunk));
    } catch (e) {
      console.warn('Batch request failed, retrying series one by one:', e.message);
      for (const id of chunk) {
        try { Object.assign(bySeries, await fetchOportuno([id])); }
        catch (e2) { console.warn(`${id}: ${e2.message}`); }
      }
    }
  }

  const payload = { generatedAt: new Date().toISOString() };
  const errors = [];
  const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  for (const k of keys) {
    const def = SERIES[k];
    let chosen = null;
    for (const id of def.ids) {
      const s = bySeries[id];
      const title = clean(s && s.titulo);
      const ok = !!s && def.title.test(title);
      console.log(`${k.padEnd(14)} ${id.padEnd(8)} ${ok ? 'MATCH ' : 'skip  '} ${s ? `${s.date}  ${s.value}` : 'not returned'}  «${title}»`);
      if (ok && !chosen && s.value != null) chosen = { date: s.date, value: s.value, series: id };
    }
    if (chosen) {
      payload[k] = chosen;
    } else {
      payload[k] = null; // page keeps its baked value; a mismatched title is never published
      errors.push(`${k}: no candidate matched /${def.title.source}/ (tried ${def.ids.join(', ')})`);
    }
  }
  if (errors.length) console.warn('Some series failed to fetch (page keeps its previous value for those):\n' + errors.join('\n'));
  if (keys.every((k) => payload[k] === null)) throw new Error('Every series failed — refusing to overwrite data.js');

  const js = `// AUTO-GENERATED by scripts/fetch-mx-data.mjs — do not hand-edit.
// Last refreshed: ${payload.generatedAt}
// Each field is {date, value} from the Banxico SIE API. If a series failed to fetch on the most
// recent run it is null here and site/mx/fiscal/index.html keeps its last baked-in value for it.
window.LIVE_DATA_MX = ${JSON.stringify(payload, null, 2)};
`;
  await import('node:fs/promises').then((fs) => fs.writeFile(OUT_PATH, js, 'utf8'));
  console.log('Wrote', OUT_PATH.pathname);
}

main().catch((e) => { console.error(e); process.exit(1); });
