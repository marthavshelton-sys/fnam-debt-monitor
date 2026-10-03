// Hyperscaler Hub: validation and data-quality reports. Runs after build.mjs and writes
//   site/hiperescaladores/capex/data/quality.js              (window.HYP_CAPEX_QUALITY)
//   site/hiperescaladores/fuera-de-balance/data/quality.js   (window.HYP_OFFBS_QUALITY)
// rendered by the shared owner pages (site/assets/quality-page.js). Exit code 1 only on hard failures: a company
// with no stored XBRL extract, a non-USD monetary fact, or every EDGAR call failing; identity misses are warnings
// that flag the affected figures "needs review" on the pages.
import { readFile } from 'node:fs/promises';
import { createReport, ageDays, TODAY } from '../lib/quality-report.mjs';
import { readJson, TOOLS, SITE, p } from './lib.mjs';

const src = await readFile(p(SITE + 'data/financials.js'), 'utf8');
const F = JSON.parse(src.slice(src.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
const der = await readJson(TOOLS + 'data/derivations.json', { warnings: [], restated: [] });
const state = await readJson(TOOLS + 'data/state.json', {});
const fails = [];
const L = (es, en) => ({ es, en });

// ---------------- module 3: capex and financing ----------------
const Q = createReport({ slug: 'hiperescaladores/capex', key: 'HYP_CAPEX_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia (US$ M)', 'Difference (US$ m)'), tolerances: L('Trimestres vs. año fiscal: US$2 M o 0.2%. Hecho de 3 meses vs. diferencia de acumulados: 0.5%. Deuda XBRL vs. FactSet a la misma fecha: 2%. Operación de deuda vs. 424B: ±7 días y ±3%.', 'Quarters vs. fiscal year: US$2m or 0.2%. 3-month fact vs. year-to-date difference: 0.5%. XBRL debt vs. FactSet at the same date: 2%. Debt deal vs. 424B: ±7 days and ±3%.') });
for (const w of der.warnings) {
  if (w.identity) Q.record(`${w.ticker} ${w.tag}`, w.check, w.status, w.diff, 2, w.status === 'ok' ? null : L('Trimestres marcados "revisar" en la página: probable reexpresión en una presentación posterior', 'Quarters flagged "needs review" on the page: likely a recast in a later filing'));
  else if (w.status === 'fail') { Q.record(w.ticker, w.check, 'fail'); fails.push(`${w.ticker}: ${w.check}`); }
  else Q.record(w.ticker, w.check, 'warn', null, null, L('El hecho de 3 meses se usa; la diferencia de acumulados no coincide', 'The 3-month fact is used; the year-to-date difference disagrees'));
}
let usdBad = 0;
for (const c of Object.values(F.companies)) {
  const xb = await readJson(`${TOOLS}data/xbrl/${c.ticker}.json`);
  if (!xb) { fails.push(`${c.ticker}: no XBRL extract`); continue; }
  for (const [tag, node] of Object.entries(xb.facts)) if (!tag.startsWith('ffd:') && node.unit !== 'USD') { usdBad++; Q.record(c.ticker, `${tag} unit ${node.unit}`, 'fail'); }
  // debt: XBRL vs FactSet at the same balance-sheet date
  const fs = F.debt && F.debt.totals[c.ticker];
  const qd = [...c.quarters].reverse().find((q) => q.m.debt && fs && q.end === fs.report);
  if (fs && qd) Q.identity(`${c.ticker} ${qd.id}`, 'total debt: XBRL vs FactSet', qd.m.debt[0] / 1e6, fs.total, Math.max(5, Math.abs(fs.total) * 0.02), { soft: true, note: L(`XBRL usa ${qd.m.debt[1]}`, `XBRL uses ${qd.m.debt[1]}`) });
  else if (fs) Q.record(c.ticker, 'total debt: XBRL vs FactSet', 'warn', null, null, L(`Sin balance XBRL a la fecha de FactSet (${fs.report})`, `No XBRL balance at FactSet's date (${fs.report})`));
  // staleness: latest period against the next expected filing + 7 days
  if (c.latest && c.nextFilingDue) {
    const lim = Math.round((Date.parse(c.nextFilingDue) + 7 * 864e5 - Date.parse(c.latest.end)) / 864e5);
    Q.stale(`${c.ticker} ${c.latest.id}`, c.latest.end, lim, L(`siguiente presentación esperada a más tardar el ${c.nextFilingDue} (+7 días)`, `next filing expected by ${c.nextFilingDue} (+7 days)`));
  } else Q.stale(`${c.ticker}`, null, 0, L('sin periodo reciente', 'no recent period'));
  for (const a of c.anomalies || []) Q.R.parse.push({ file: `${c.ticker} ${a.id}`, msg: `${a.k}: ${(a.v / 1e9).toFixed(2)} bn vs median ${(a.median / 1e9).toFixed(2)} bn of the prior four quarters — needs review` });
  const lf = (c.filings || []).find((f) => /^(10-K|10-Q|20-F)/.test(f.form));
  if (lf) Q.R.origins.push({ id: c.ticker, origin: 'primary', title: `${lf.form} ${c.name}`, url: lf.url, date: lf.filed, page: null, parts: lf.accn });
}
if (usdBad) fails.push(`${usdBad} non-USD facts`);
for (const e of state.errors || []) Q.R.parse.push({ file: `EDGAR ${e.ticker}`, msg: `${e.api}: ${e.error}` });
for (const r of (der.restated || []).slice(-40)) Q.R.parse.push({ file: `${r.ticker} ${r.tag}`, msg: `restated ${r.start || ''}→${r.end}: ${r.old} (${r.oldAccn}) → ${r.value} (${r.accn})` });
const deals = (F.debt && F.debt.deals) || [];
const drawn = deals.filter((d) => d.amount > 0);
const matched = drawn.filter((d) => d.match).length;
Q.record('debt deals', `matched to a 424B fee exhibit: ${matched} of ${drawn.length}`, matched === drawn.length ? 'ok' : 'warn', null, null, L('Las no cotejadas llevan "revisar" (colocaciones 144A, préstamos y prospectos sin anexo etiquetado no tienen 424B con XBRL)', 'Unmatched deals carry "needs review" (144A placements, loans and prospectuses without a tagged exhibit have no XBRL 424B)'));
const fsAge = F.debt ? ageDays(F.debt.pulledAt) : null;
Q.curated(`FactSet debt snapshot (${F.debt ? F.debt.file : 'none'})`, fsAge != null && fsAge <= 100, L(`tomada el ${F.debt && F.debt.pulledAt} (${fsAge} días); renovar en sesión tras cada temporada de 10-Q`, `pulled ${F.debt && F.debt.pulledAt} (${fsAge} days); renew in-session after each 10-Q season`));
const gAge = F.guidance ? ageDays(F.guidance.pulledAt) : null;
Q.curated('tools/hyperscalers/data/guidance.json', gAge != null && gAge <= 100, L(`guías T2 al ${F.guidance && F.guidance.pulledAt} (${gAge} días); actualizar tras cada llamada`, `T2 guidance as of ${F.guidance && F.guidance.pulledAt} (${gAge} days); update after each call`));
Q.curated('EDGAR poll (state.json)', !(state.errors || []).length, L(`última corrida ${state.lastRun || '—'}; última exitosa ${state.lastSuccess || '—'}; fallas seguidas ${state.consecutiveFailures || 0}`, `last run ${state.lastRun || '—'}; last success ${state.lastSuccess || '—'}; consecutive failures ${state.consecutiveFailures || 0}`));
Q.card(Object.keys(F.companies).length, 'empresas', 'companies');
Q.card(Object.values(F.companies).reduce((s, c) => s + c.quarters.reduce((a, q) => a + Object.keys(q.m).length, 0), 0), 'valores XBRL', 'XBRL values');
Q.card((der.restated || []).length, 'reexpresiones detectadas', 'restatements detected');
Q.card(Object.values(F.companies).reduce((s, c) => s + (c.anomalies || []).length, 0), 'valores atípicos', 'outliers flagged');
const latestIds = Object.values(F.companies).filter((c) => c.latest).map((c) => c.latest.end).sort();
await Q.write({ latestQuarter: latestIds.at(-1) || null, expectedQuarter: null, financialsGeneratedAt: F.generated, refreshedET: F.refreshedET });

// ---------------- module 6: off-balance-sheet ----------------
const O = createReport({ slug: 'hiperescaladores/fuera-de-balance', key: 'HYP_OFFBS_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: L('Cada partida de texto debe citar presentación (número de acceso), sección y página, y quedar "verificada" tras una segunda lectura.', 'Every text item must cite the filing (accession number), section and page, and be "verified" after a second reading.') });
const OB = F.offbs || { items: [], searched: [] };
for (const i of OB.items) {
  O.record(`${i.ticker} ${i.item}`, 'filing accession cited', i.filing && i.filing.accn ? 'ok' : 'fail');
  O.record(`${i.ticker} ${i.item}`, 'page cited', i.filing && i.filing.page ? 'ok' : 'warn', null, null, i.filing && i.filing.page ? null : L('Página por citar', 'Page to cite'));
  O.record(`${i.ticker} ${i.item}`, 'verified against the filing', i.status === 'verified' ? 'ok' : 'warn');
  const age = ageDays(i.asOf);
  O.stale(`${i.ticker} ${i.item}`, i.asOf, 200, L('vigente mientras no haya un 10-Q/10-K posterior', 'current until a later 10-Q/10-K'));
  void age;
}
const ITEMS = ['leases_not_commenced', 'vie_unconsolidated', 'jv_equity_method_debt', 'spv', 'rvg', 'purchase_obligation', 'guarantee'];
const XK = { vie_unconsolidated: 'vie_max_loss', jv_equity_method_debt: 'equity_method', purchase_obligation: 'purchase_oblig', guarantee: 'guarantees_max' };
let gaps = 0;
for (const c of Object.values(F.companies)) {
  const missing = ITEMS.filter((it) => !OB.items.some((i) => i.ticker === c.ticker && i.item === it) && !(XK[it] && c.quarters.some((q) => q.m[XK[it]])) && !OB.searched.some((s) => s.ticker === c.ticker && s.item === it) && !(it === 'guarantee' && OB.items.some((i) => i.ticker === c.ticker && i.item === 'backstop')));
  gaps += missing.length;
  O.curated(`${c.ticker} coverage`, missing.length === 0, L(missing.length ? `pendientes de lectura: ${missing.join(', ')}` : 'completa', missing.length ? `pending reading: ${missing.join(', ')}` : 'complete'));
}
O.curated('tools/hyperscalers/data/offbs.json', true, L(`actualizado ${OB.updated}`, `updated ${OB.updated}`));
O.card(OB.items.length, 'partidas de texto', 'text items');
O.card(OB.items.filter((i) => i.status !== 'verified').length, 'por revisar', 'to review');
O.card(gaps, 'huecos de cobertura', 'coverage gaps');
await O.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: F.generated });

// ---------------- modules 1, 2, 4, 5, 7 (curated text items; built by build-modules.mjs) ----------------
async function loadW(file, name) { const t = await readFile(p(SITE + `data/${file}.js`), 'utf8'); return JSON.parse(t.slice(t.indexOf('=') + 1).trim().replace(/;\s*$/, '')); }
const CAPD = await loadW('capacity', 'HYP_CAP'), SITD = await loadW('sites', 'HYP_SITES'), POWD = await loadW('power', 'HYP_POWER'), CIRD = await loadW('circular', 'HYP_CIRC');
const TOL_TEXT = L('Cada cifra cita la presentación (número de acceso), la sección y la página, y la frase citada debe aparecer en el texto descargado de esa página ("cita cotejada"). La cifra queda "revisar" hasta una segunda lectura.', 'Every figure cites the filing (accession number), section and page, and the quoted sentence must appear in the downloaded text of that page ("quote matched"). The figure stays "needs review" until a second reading.');
function citeChecks(Rp, tag, src, status) {
  if (!src) { Rp.record(tag, 'source cited', 'fail'); fails.push(`${tag}: no source`); return; }
  if (src.tier === 'T1') {
    Rp.record(tag, 'filing accession cited', src.accn ? 'ok' : 'fail');
    Rp.record(tag, 'quote matched on the cited page', src.quoteCheck === 'page' ? 'ok' : 'warn', null, null, src.quoteCheck === 'other_page' ? L(`la frase está en la página ${src.foundOn} del texto descargado`, `the sentence is on page ${src.foundOn} of the downloaded text`) : src.quoteCheck === 'page' ? null : L('frase no encontrada en el texto descargado', 'sentence not found in the downloaded text'));
    if (status !== undefined) Rp.record(tag, 'verified (second reading)', status === 'verified' ? 'ok' : 'warn');
  } else Rp.record(tag, 'company statement cited (T2)', src.title || src.url ? 'ok' : 'fail');
}
function originsOf(Rp, items) { const seen = new Set(); for (const s of items) if (s && s.accn && !seen.has(s.accn)) { seen.add(s.accn); Rp.R.origins.push({ id: s.k.split(' ')[0], origin: 'primary', title: s.k, url: s.url, date: s.filed, page: null, parts: s.accn }); } }
const defsOK = (m) => !m || !!CAPD.definitions[m] || m === 'planned_campus';

// module 1
const M1 = createReport({ slug: 'hiperescaladores/capacidad', key: 'HYP_CAP1_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: TOL_TEXT });
for (const x of CAPD.current) {
  const tag = `${x.ticker} ${x.metric}`;
  citeChecks(M1, tag, x.src, x.status);
  M1.record(tag, 'MW definition recorded', defsOK(x.metric) ? 'ok' : 'fail');
  if (!defsOK(x.metric)) fails.push(`${tag}: undefined MW metric`);
  M1.stale(tag, x.asOf, 200, L('vigente hasta la siguiente presentación', 'current until the next filing'));
}
for (const x of CAPD.notDisclosed) M1.curated(`${x.ticker} ${x.item}`, true, L(`no revelado; buscado en ${x.searched.join(', ')}`, `not disclosed; searched ${x.searched.join(', ')}`));
if (CAPD.oracle) M1.curated('tools/oracle/data/buildout.json (Oracle, T2)', ageDays(CAPD.oracle.updated) <= 100, L(`almacén del modelo de Oracle al ${CAPD.oracle.updated}`, `Oracle model store as of ${CAPD.oracle.updated}`));
M1.curated('tools/hyperscalers/data/capacity.json', true, L(`actualizado ${CAPD.updated}`, `updated ${CAPD.updated}`));
originsOf(M1, CAPD.current.map((x) => x.src));
const ml = await readJson(TOOLS + 'data/modules-log.json', { problems: [] });
for (const pr of ml.problems) M1.R.parse.push({ file: pr.where, msg: `${pr.k || ''} ${pr.issue}` });
M1.card(CAPD.current.length, 'cifras T1 de capacidad', 'T1 capacity figures');
M1.card(CAPD.notDisclosed.filter((x) => x.item === 'mw').length, 'empresas sin MW en sus presentaciones', 'companies with no MW in filings');
M1.card(CAPD.current.filter((x) => x.status !== 'verified').length, 'por revisar', 'to review');
await M1.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: CAPD.generated });

// module 2
const M2 = createReport({ slug: 'hiperescaladores/comprometida', key: 'HYP_CAP2_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: TOL_TEXT });
for (const x of CAPD.pipeline) {
  const tag = `${x.ticker} ${x.stage} ${x.metric}`;
  citeChecks(M2, tag, x.src, x.tier === 'T2' ? undefined : x.status);
  M2.record(tag, 'MW definition recorded', defsOK(x.metric) ? 'ok' : 'fail');
  M2.record(tag, 'stage is contracted / under construction / announced', ['contracted', 'under_construction', 'announced'].includes(x.stage) ? 'ok' : 'fail');
  if (x.asOf) M2.stale(tag, x.asOf, 200, L('vigente hasta la siguiente presentación', 'current until the next filing'));
}
M2.curated('tools/hyperscalers/data/capacity.json', true, L(`actualizado ${CAPD.updated}`, `updated ${CAPD.updated}`));
originsOf(M2, CAPD.pipeline.map((x) => x.src));
M2.card(CAPD.pipeline.length, 'partidas comprometidas', 'committed items');
M2.card(CAPD.pipeline.filter((x) => x.subsequent).length, 'posteriores al balance', 'after balance-sheet date');
await M2.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: CAPD.generated });

// module 4
const M4 = createReport({ slug: 'hiperescaladores/electricidad', key: 'HYP_POWER_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: L('Contratos de las empresas (T1/T2) y proyecciones de red (T3/T4) nunca se suman ni se mezclan. Vigencia: T1 hasta la siguiente presentación; T3/T4 hasta la siguiente edición del publicador + 30 días.', 'Company contracts (T1/T2) and grid projections (T3/T4) are never added or mixed. Freshness: T1 until the next filing; T3/T4 until the publisher\'s next edition + 30 days.') });
for (const d of POWD.companyDeals) { citeChecks(M4, `${d.ticker} ${d.id}`, d.src, d.tier === 'T1' ? 'needs_review' : undefined); M4.record(`${d.ticker} ${d.id}`, 'tier is T1 or T2', ['T1', 'T2'].includes(d.tier) ? 'ok' : 'fail'); }
for (const g of POWD.grid) {
  M4.record(g.id, 'tier is T3 or T4', ['T3', 'T4'].includes(g.tier) ? 'ok' : 'fail');
  M4.record(g.id, 'source URL and page', g.url && g.page ? 'ok' : 'warn');
  const lim = g.nextExpected ? Math.round((Date.parse(g.nextExpected) + 30 * 864e5 - Date.parse(g.editionDate)) / 864e5) : 400;
  M4.stale(`${g.publisher} · ${g.edition}`, g.editionDate, lim, g.nextExpected ? L(`siguiente edición esperada ${g.nextExpected} (+30 días)`, `next edition expected ${g.nextExpected} (+30 days)`) : L('sin calendario publicado: revisión anual (400 días)', 'no published calendar: yearly review (400 days)'));
}
M4.curated('tools/hyperscalers/data/power.json', true, L(`actualizado ${POWD.updated}; revisión semanal de fuentes T3/T4`, `updated ${POWD.updated}; weekly review of T3/T4 sources`));
originsOf(M4, POWD.companyDeals.map((d) => d.src).filter((s) => s && s.accn));
M4.card(POWD.companyDeals.length, 'contratos de energía', 'power deals');
M4.card(POWD.grid.length, 'fuentes de red (T3/T4)', 'grid sources (T3/T4)');
await M4.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: POWD.generated });

// module 5
const M5 = createReport({ slug: 'hiperescaladores/sitios', key: 'HYP_SITES_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: L('Ubicación del mapa = localidad nombrada en la presentación (localidad, condado, estado o país), nunca coordenadas del campus. Sitio sin ubicación revelada: sin punto en el mapa.', 'Map position = the locality the filing names (locality, county, state or country), never campus coordinates. A site whose location is not disclosed gets no map point.') });
for (const s of SITD.sites) {
  const tag = `${s.ticker} ${s.name || s.name_en}`;
  citeChecks(M5, tag, s.src || (s.sources && s.sources[0]), undefined);
  const hasPt = s.lat != null && s.lon != null;
  M5.record(tag, 'map position has a stated precision', hasPt ? (s.precision ? 'ok' : 'fail') : (s.precision == null ? 'ok' : 'fail'));
  if (hasPt) M5.record(tag, 'coordinates in range', Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180 ? 'ok' : 'fail');
  M5.record(tag, 'MW definition recorded', s.mw == null || defsOK(s.mwMetric) ? 'ok' : 'fail');
}
M5.curated('tools/hyperscalers/data/sites.json', true, L(`actualizado ${SITD.updated}`, `updated ${SITD.updated}`));
originsOf(M5, SITD.sites.map((s) => s.src));
M5.card(SITD.sites.length, 'sitios', 'sites');
M5.card(SITD.sites.filter((s) => s.lat == null).length, 'sin ubicación revelada', 'location not disclosed');
await M5.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: SITD.generated });

// module 7
const M7 = createReport({ slug: 'hiperescaladores/circular', key: 'HYP_CIRC_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: L('Cada flujo cita su presentación; las inferencias de FNAM deben apoyarse solo en flujos registrados y se muestran como inferencia, nunca como hecho.', 'Every flow cites its filing; FNAM inferences must rest only on recorded flows and are shown as inference, never as fact.') });
const flowIds = new Set(CIRD.flows.map((f) => f.id)), nodeIds = new Set(CIRD.nodes.map((n) => n.id));
for (const f of CIRD.flows) {
  citeChecks(M7, f.id, f.src || (f.srcT2 && { tier: 'T2', title: f.srcT2.title_en, url: f.srcT2.url }), f.src ? 'needs_review' : undefined);
  M7.record(f.id, 'both parties are nodes', nodeIds.has(f.from) && nodeIds.has(f.to) ? 'ok' : 'fail');
  if (f.shareOf && f.shareOf.calc) M7.record(f.id, 'revenue share computed from XBRL revenue', f.shareOf.pct != null ? 'ok' : 'warn');
}
for (const i of [...CIRD.inferences, ...CIRD.breakers]) { const bad = (i.rests_on || []).filter((id) => !flowIds.has(id)); M7.record(i.id || i.en.slice(0, 40), 'inference rests on recorded flows', bad.length ? 'fail' : 'ok', null, null, bad.length ? L(`faltan: ${bad.join(', ')}`, `missing: ${bad.join(', ')}`) : null); if (bad.length) fails.push(`circular inference cites unknown flows: ${bad.join(', ')}`); }
M7.curated('tools/hyperscalers/data/circular.json', true, L(`actualizado ${CIRD.updated}`, `updated ${CIRD.updated}`));
originsOf(M7, CIRD.flows.map((f) => f.src));
M7.card(CIRD.flows.length, 'flujos', 'flows');
M7.card(CIRD.inferences.length, 'inferencias FNAM', 'FNAM inferences');
await M7.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: CIRD.generated });

console.log(`validate: capex ${Q.R.checks.length} checks (${Q.R.fails.length} fail, ${Q.R.warns.length} warn); off-BS ${O.R.checks.length} checks, ${gaps} coverage gaps; modules 1/2/4/5/7: ${[M1, M2, M4, M5, M7].map((m) => `${m.R.checks.length} (${m.R.fails.length} fail)`).join(' / ')}`);
if (fails.length || (state.errors || []).length === Object.keys(F.companies).length * 2) { console.error('HARD FAIL:\n  ' + fails.join('\n  ')); process.exit(1); }
void TODAY;
