// USD/MXN series of record for the company models: Banco de México's daily FIX rate from the SIE API
// (series SF43718, "Tipo de cambio Pesos por dólar E.U.A. FIX"). Shared by the GAP, ASUR/OMA and Gentera
// market fetchers; the Quálitas fetcher carries the same logic inline. Needs BANXICO_TOKEN (free token,
// https://www.banxico.org.mx/SieAPIRest/service/v1/token). A wrong series id never reaches a page: the
// title is checked before any point is used. Callers fall back to FRED DEXMXUS (Fed H.10) when this throws.
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
export const BANXICO_FX_SERIES = process.env.BANXICO_SERIES_USDMXN || 'SF43718';
export const isFixRate = (title) => /tipo de cambio/i.test(title) && /(fix|d[oó]lar)/i.test(title) && !/udis?\b/i.test(title);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r4 = (x) => Math.round(x * 10000) / 10000;

async function getJson(url, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.ok) return res.json();
      lastErr = new Error(`${url.replace(/token=[^&]+/, 'token=***')} -> HTTP ${res.status}`);
      if (res.status === 404 || res.status === 401) break;
    } catch (e) { lastErr = e; }
    await sleep(1200 * i);
  }
  throw lastErr;
}

export async function banxicoFx(since) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('BANXICO_TOKEN not set');
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${BANXICO_FX_SERIES}/datos/${since}/${new Date().toISOString().slice(0, 10)}?token=${token}`;
  const body = await getJson(url);
  const s = body?.bmx?.series?.[0];
  if (!s) throw new Error(`Banxico ${BANXICO_FX_SERIES}: no series in response`);
  const title = (s.titulo || '').replace(/\s+/g, ' ');
  if (!isFixRate(title)) throw new Error(`Banxico ${BANXICO_FX_SERIES}: title does not look like the FIX rate (${title.slice(0, 100)})`);
  const points = (s.datos || [])
    .map((d) => { const [dd, mm, yy] = d.fecha.split('/'); return [`${yy}-${mm}-${dd}`, Number(String(d.dato).replace(',', ''))]; })
    .filter((p) => Number.isFinite(p[1]))
    .map((p) => [p[0], r4(p[1])])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!points.length) throw new Error(`Banxico ${BANXICO_FX_SERIES}: no points since ${since}`);
  return { points, source: `Banxico SIE ${BANXICO_FX_SERIES} (${title.slice(0, 90)})` };
}

// Banxico first, FRED DEXMXUS as the fallback; the previous run's points if both fail.
// `fred(id, since)` is the caller's FRED reader; `prev` its previous market.js object.
export async function fetchUsdMxn({ fred, prev, since = '2015-01-01', fetchedAt }) {
  const name = 'USD/MXN (Banxico FIX)';
  try {
    const data = await banxicoFx(since);
    console.log(`USDMXN: ${data.points.length} points via Banxico (last ${data.points.at(-1)})`);
    return { ok: true, entry: { name, source: data.source, fetchedAt, points: data.points } };
  } catch (e1) {
    try {
      const data = await fred('DEXMXUS', since);
      console.log(`USDMXN: ${data.points.length} points via FRED fallback (${e1.message})`);
      return { ok: true, entry: { name: 'USD/MXN (Fed H.10 via FRED, fallback)', source: data.source, note: `Banxico unavailable (${e1.message}); FRED fallback`, fetchedAt, points: data.points } };
    } catch (e2) {
      const err = `${e1.message} | ${e2.message}`;
      const stale = prev?.fx?.USDMXN;
      console.error(`USDMXN: FAILED ${err}${stale ? ' (kept previous points)' : ''}`);
      return { ok: false, entry: stale ? { ...stale, error: err, staleSince: stale.fetchedAt } : { name, error: err, points: [] } };
    }
  }
}
