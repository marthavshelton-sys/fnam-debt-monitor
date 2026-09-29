// Mexican 10-year M bono yield for the company models: Banco de México's primary-auction result from the SIE
// API (series SF44071, "Valores Gubernamentales, resultados de la subasta semanal, tasa de rendimiento, Bono
// tasa fija 10 años"). The 10-year bond is auctioned about every four weeks and the result is published the
// same day, so this is the earliest official print; the OECD monthly series on FRED (IRLTLT01MXM156N) carries
// the same number about a month later and stays as the fallback. Banxico's SIE publishes no daily
// secondary-market 10-year yield (its daily vector, table CF300, has prices and coupons only), verified on
// the runner on 2026-09-28. Needs BANXICO_TOKEN; the title is checked before any point is used.
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
export const BANXICO_MX10Y_SERIES = process.env.BANXICO_SERIES_MX10Y || 'SF44071';
export const isTenYearBond = (title) => /bonos?\b/i.test(title) && /10\s*a[ñn]os|3640\s*d[ií]as/i.test(title) && /rendimiento/i.test(title) && !/udibono|bpa|brems|monto|precio|plazo en/i.test(title);
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

export async function banxicoMx10y(since) {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('BANXICO_TOKEN not set');
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${BANXICO_MX10Y_SERIES}/datos/${since}/${new Date().toISOString().slice(0, 10)}?token=${token}`;
  const body = await getJson(url);
  const s = body?.bmx?.series?.[0];
  if (!s) throw new Error(`Banxico ${BANXICO_MX10Y_SERIES}: no series in response`);
  const title = (s.titulo || '').replace(/\s+/g, ' ');
  if (!isTenYearBond(title)) throw new Error(`Banxico ${BANXICO_MX10Y_SERIES}: title does not look like the 10-year bond yield (${title.slice(0, 100)})`);
  const points = (s.datos || [])
    .map((d) => { const [dd, mm, yy] = d.fecha.split('/'); return [`${yy}-${mm}-${dd}`, Number(String(d.dato).replace(',', ''))]; })
    .filter((p) => Number.isFinite(p[1]))
    .map((p) => [p[0], r4(p[1])])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!points.length) throw new Error(`Banxico ${BANXICO_MX10Y_SERIES}: no points since ${since}`);
  return { points, source: `Banxico SIE ${BANXICO_MX10Y_SERIES} (${title.slice(0, 120)})` };
}

// Banxico first, FRED IRLTLT01MXM156N (OECD monthly) as the fallback; the previous run's points if both fail.
export async function fetchMx10y({ fred, prev, since = '2015-01-01', fetchedAt }) {
  const name = 'México Bono M 10 años, subasta primaria (Banxico, %)';
  try {
    const data = await banxicoMx10y(since);
    console.log(`MX10Y: ${data.points.length} points via Banxico (last ${data.points.at(-1)})`);
    return { ok: true, entry: { name, source: data.source, seriesId: BANXICO_MX10Y_SERIES, fetchedAt, points: data.points } };
  } catch (e1) {
    try {
      const data = await fred('IRLTLT01MXM156N', since);
      console.log(`MX10Y: ${data.points.length} points via FRED fallback (${e1.message})`);
      return { ok: true, entry: { name: 'México bono 10 años (OECD vía FRED, mensual, %)', source: data.source, note: `Banxico unavailable (${e1.message}); FRED monthly fallback`, fetchedAt, points: data.points } };
    } catch (e2) {
      const err = `${e1.message} | ${e2.message}`;
      const stale = prev?.rates?.MX10Y;
      console.error(`MX10Y: FAILED ${err}${stale ? ' (kept previous points)' : ''}`);
      return { ok: false, entry: stale ? { ...stale, error: err, staleSince: stale.fetchedAt } : { name, error: err, points: [] } };
    }
  }
}
