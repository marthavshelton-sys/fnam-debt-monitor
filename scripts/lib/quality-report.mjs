// Data-health report shared by the JS validators (GAP, and ASUR/OMA through scripts/airports/validate.mjs).
// Collects every identity evaluated, the freshness of each series, the state of the curated files, the
// origin of every quarter and the last build's parse warnings, then writes site/<slug>/data/quality.js
// (window.<KEY>) for the hidden owner page site/<slug>/quality.html (renderer: site/assets/quality-page.js).
// The report never changes the exit code: failures still come from the identities the validator marks 'fail'.
import { readFile, writeFile } from 'node:fs/promises';

export const TODAY = new Date().toISOString().slice(0, 10);
export const ageDays = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso || '')) ? Math.round((Date.parse(TODAY + 'T12:00:00Z') - Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z')) / 864e5) : null);
const qEnd = (fy, q) => `${fy}-${String(q * 3).padStart(2, '0')}-${q === 1 || q === 4 ? 31 : 30}`;

// Latest quarter the model should already carry: quarter-ends at least `lag` days ago (companies report 2–5
// weeks after quarter-end; 35 days covers all of them).
export function expectedQuarter(lag = 35) {
  const y = +TODAY.slice(0, 4);
  const cands = [];
  for (const fy of [y, y - 1]) for (const q of [4, 3, 2, 1]) cands.push([fy, q]);
  for (const [fy, q] of cands) if (ageDays(qEnd(fy, q)) >= lag) return `${fy}Q${q}`;
  return null;
}
// Latest traffic month the model should already carry: month-ends at least `lag` days ago.
export function expectedMonth(lag = 12) {
  const d = new Date(TODAY + 'T12:00:00Z');
  for (let i = 0; i < 4; i++) {
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 0));
    if (ageDays(end.toISOString().slice(0, 10)) >= lag) return end.toISOString().slice(0, 7);
  }
  return null;
}

export function createReport({ slug, key, generator, diffUnit, tolerances }) {
  const R = { checks: [], stale: [], curated: [], cards: [], origins: [], parse: [], fails: [], warns: [] };
  const record = (tag, check, status, diff = null, tol = null, note = null) => {
    R.checks.push({ tag, check, status, diff: diff == null ? null : Math.round(diff * 1000) / 1000, tol, note });
    const line = `${tag} ${check}${diff != null ? ` (diff ${Math.round(diff * 100) / 100})` : ''}`;
    if (status === 'fail') R.fails.push(line); else if (status === 'warn') R.warns.push(line);
  };
  // identity: |a − b| ≤ tol is ok; otherwise fail, or warn when soft (or when hist marks comparative-only history)
  const identity = (tag, check, a, b, tol, { soft = false, note = null } = {}) => {
    if (a == null || b == null) return true;
    const d = Math.abs(a - b);
    record(tag, check, d <= tol ? 'ok' : soft ? 'warn' : 'fail', d, tol, d <= tol ? null : note);
    return d <= tol;
  };
  const stale = (series, lastDate, limitDays, note = null) => {
    const a = ageDays(lastDate);
    R.stale.push({ series, lastDate: lastDate || null, ageDays: a, limitDays, status: limitDays == null ? 'ok' : (a == null || a > limitDays) ? 'warn' : 'ok', note });
  };
  const period = (series, have, expected, ageOf = null, note = null) => {
    R.stale.push({ series, lastDate: have || null, ageDays: ageOf, limitDays: null, status: have && expected && have >= expected ? 'ok' : 'warn', note: note || { es: `esperado al menos ${expected} por el calendario`, en: `expected at least ${expected} given the calendar` } });
  };
  const curated = (file, ok, detail) => R.curated.push({ file, status: ok ? 'ok' : 'warn', detail });
  const card = (v, es, en) => R.cards.push({ v, l: { es, en } });
  async function readParseLog(url) {
    try { const j = JSON.parse(await readFile(url, 'utf8')); R.parse = (j.warnings || []).map((w) => (typeof w === 'string' ? { file: '', msg: w } : w)); R.parseGeneratedAt = j.generatedAt || null; }
    catch { R.parse = []; }
  }
  // market.js freshness: every price, fx, rate and dividend series with a limit in days
  function marketStale(mk, limits) {
    for (const grp of ['prices', 'fx', 'rates', 'dividends']) {
      for (const [id, s] of Object.entries(mk[grp] || {})) {
        const pts = s.points || []; const lim = (limits[grp] && (limits[grp][id] ?? limits[grp]['*'])) ?? null;
        if (lim == null) continue;
        stale(`${grp === 'prices' ? 'price' : grp === 'dividends' ? 'dividends' : grp} ${id}`, pts.length ? pts[pts.length - 1][0] : null, lim, s.error ? { es: `error en la última corrida: ${s.error}`, en: `error on the last run: ${s.error}` } : (grp === 'dividends' ? { es: 'último dividendo en efectivo registrado', en: 'last recorded cash dividend' } : null));
      }
    }
  }
  // origin of every statement quarter from its sources block
  function originsFromQuarters(quarters) {
    R.origins = quarters.map((q) => {
      const s = (q.sources && (q.sources.is || q.sources.bs || q.sources.cf)) || {};
      const parts = ['is', 'bs', 'cf', 'kpi'].filter((p) => q[p] && Object.keys(q[p]).length).map((p) => ({ is: 'IS', bs: 'BS', cf: 'CF', kpi: 'KPI' }[p])).join(' · ');
      const prim = q.sources && q.sources.is ? q.sources.is.primary : true;
      return { id: q.id, origin: prim === false ? 'comparative' : 'primary', title: s.title || null, url: s.url || null, date: s.date || null, page: s.page || null, parts };
    });
  }
  async function write(extra) {
    const counts = { checks: R.checks.length, ok: R.checks.filter((c) => c.status === 'ok').length, warn: R.checks.filter((c) => c.status === 'warn').length, fail: R.checks.filter((c) => c.status === 'fail').length };
    const out = { generatedAt: new Date().toISOString().slice(0, 19) + 'Z', ok: !R.fails.length, counts, diffUnit, tolerances, cards: R.cards, checks: R.checks, stale: R.stale, curated: R.curated, origins: R.origins, parse: R.parse, parseGeneratedAt: R.parseGeneratedAt || null, ...extra };
    const url = new URL(`../../site/${slug}/data/quality.js`, import.meta.url);
    await writeFile(url, `// AUTO-GENERATED by ${generator} — data-health report for site/${slug}/quality.html. Do not hand-edit.\nwindow.${key} = ${JSON.stringify(out)};\n`, 'utf8');
    return out;
  }
  return { R, record, identity, stale, period, curated, card, readParseLog, marketStale, originsFromQuarters, write };
}
