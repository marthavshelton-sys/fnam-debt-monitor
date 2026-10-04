// Hyperscaler Hub: validation and data-quality reports. Runs after build.mjs and writes
//   site/hiperescaladores/capex/data/quality.js              (window.HYP_CAPEX_QUALITY)
//   site/hiperescaladores/fuera-de-balance/data/quality.js   (window.HYP_OFFBS_QUALITY)
//   and one per curated module (1, 2, 4, 5, 7, 8: HYP_CAP1/CAP2/POWER/SITES/CIRC/PAY_QUALITY)
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
// verification wording (owner's third review): "verified" = automated quote-match plus a second AI read, never an analyst's
// sign-off; the reviewedBy field carries a person's review and is counted apart on every quality page
const VERIF = L('verificado = cotejo automático de la cita más una segunda lectura por IA; sin revisión de analista', 'verified = automated quote-match plus a second AI read; not analyst-reviewed');
const reviewedCard = (Rp, items, es, en) => { Rp.card(items.filter((i) => i.reviewedBy).length + ' / ' + items.length, es, en); };
const VLABEL = 'verified (automated second read)';

// ---------------- module 3: capex and financing ----------------
const Q = createReport({ slug: 'hiperescaladores/capex', key: 'HYP_CAPEX_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia (US$ M)', 'Difference (US$ m)'), tolerances: L('Trimestres vs. año fiscal: US$2 M o 0.2%. Hecho de 3 meses vs. diferencia de acumulados: 0.5%. Deuda XBRL vs. FactSet a la misma fecha: 2%. Operación de deuda vs. 424B: ±7 días y ±3%; si no hay 424B, la presentación (8-K, FWP, 6-K) que el índice de texto completo de EDGAR devuelve para el cupón y vencimiento del tramo en ±12/25 días, y la página del 10-K/10-Q que nombra el instrumento. Huecos XBRL: cada uno con su motivo en not-tagged.json. ' + VERIF.es, 'Quarters vs. fiscal year: US$2m or 0.2%. 3-month fact vs. year-to-date difference: 0.5%. XBRL debt vs. FactSet at the same date: 2%. Debt deal vs. 424B: ±7 days and ±3%; without a 424B, the filing (8-K, FWP, 6-K) EDGAR\'s full-text index returns for the tranche\'s coupon and maturity within −12/+25 days, and the 10-K/10-Q page that names the instrument. XBRL gaps: each with its reason in not-tagged.json. ' + VERIF.en) });
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
Q.record('debt deals', `matched to a 424B fee exhibit: ${matched} of ${drawn.length}`, matched === drawn.length ? 'ok' : 'warn', null, null, L('Las demás se cotejan con la presentación que devuelve el índice de texto completo de EDGAR (8-K, FWP, 6-K) y la página del 10-K/10-Q que nombra el instrumento (deal-matches.json)', 'The rest are matched to the filing EDGAR\'s full-text index returns (8-K, FWP, 6-K) and to the 10-K/10-Q page that names the instrument (deal-matches.json)'));
for (const d of deals.filter((x) => !x.match)) {
  const tag = `${d.ticker} ${d.issued} ${d.klass}`;
  if (!d.fs) { Q.record(tag, 'SEC filing found for the deal', 'warn', null, null, L('Sin registro en deal-matches.json', 'No record in deal-matches.json')); continue; }
  Q.record(tag, 'SEC filing found for the deal (EDGAR full-text index)', d.fs.result === 'filing' ? 'ok' : 'warn', null, null, d.fs.result === 'filing' ? (d.fs.filing ? L(`${d.fs.filing.form} ${d.fs.filing.accn} (${d.fs.filing.filed})`, `${d.fs.filing.form} ${d.fs.filing.accn} (${d.fs.filing.filed})`) : null) : L(d.fs.note_es || d.fs.result, d.fs.note_en || d.fs.result));
  if (d.fs.textSrc) Q.record(tag, 'instrument named on a harvested 10-K/10-Q page (quote matched)', d.fs.textSrc.quoteCheck === 'page' ? 'ok' : 'warn', null, null, d.fs.textSrc.quoteCheck === 'page' ? L(`${d.fs.textSrc.form} p. ${d.fs.textSrc.page || 'seq ' + d.fs.textSrc.pageSeq}`, `${d.fs.textSrc.form} p. ${d.fs.textSrc.page || 'seq ' + d.fs.textSrc.pageSeq}`) : L('la frase no está en la página citada del texto cosechado', 'the sentence is not on the cited page of the harvested text'));
}
// explained XBRL gaps: every record cites its evidence; a text figure's quote must sit on the cited harvested page
for (const i of F.notTagged || []) {
  const tag = `${i.ticker} ${i.metric}`;
  Q.record(tag, `gap explained (${i.result})`, i.result === 'unknown' ? 'warn' : 'ok', null, null, i.result === 'unknown' ? L('sin resolver: ' + (i.note_es || ''), 'unresolved: ' + (i.note_en || '')) : null);
  if (i.src) Q.record(tag, 'reason quoted on a harvested filing page (quote matched)', i.src.quoteCheck === 'page' ? 'ok' : 'warn', null, null, i.src.quoteCheck === 'page' ? null : L('la frase no está en la página citada', 'the sentence is not on the cited page'));
}
Q.curated('tools/hyperscalers/data/not-tagged.json', (F.notTagged || []).length > 0, L(`${(F.notTagged || []).length} huecos explicados; ${(F.notTagged || []).filter((i) => i.result === 'unknown').length} sin resolver; actualizado ${(F.notTaggedMeta || {}).updatedAt || '—'}`, `${(F.notTagged || []).length} gaps explained; ${(F.notTagged || []).filter((i) => i.result === 'unknown').length} unresolved; updated ${(F.notTaggedMeta || {}).updatedAt || '—'}`));
Q.curated('tools/hyperscalers/data/deal-matches.json', deals.filter((d) => !d.match && !d.fs).length === 0, L(`${deals.filter((d) => d.fs).length} operaciones con presentación; ${deals.filter((d) => d.fs && d.fs.result === 'unresolved').length} sin resolver`, `${deals.filter((d) => d.fs).length} deals with a filing; ${deals.filter((d) => d.fs && d.fs.result === 'unresolved').length} unresolved`));
// quarterly outliers read in the filing (tools/hyperscalers/data/outliers.json): a confirmed record clears the flag when its
// value matches the derived quarter; a reclassified one keeps the flag and explains it; every quote must sit on its cited page
const outl = (F.outliers && F.outliers.items) || [];
for (const o of outl) {
  const tag = `${o.ticker} ${o.metric} ${o.quarter}`;
  Q.record(tag, `outlier read in the filing (${o.result})`, o.applied ? 'ok' : 'warn', null, null, o.applied ? L(o.note_es || '', o.note_en || '') : L('el valor del registro no coincide con el trimestre derivado, o el trimestre ya no está marcado: revisar outliers.json', 'the record\'s value does not match the derived quarter, or the quarter is no longer flagged: review outliers.json'));
  if (o.src) Q.record(tag, 'outlier quote on a harvested filing page (quote matched)', o.src.quoteCheck === 'page' ? 'ok' : 'warn', null, null, o.src.quoteCheck === 'page' ? L(`${o.src.form} p. ${o.src.page || 'seq ' + o.src.pageSeq}`, `${o.src.form} p. ${o.src.page || 'seq ' + o.src.pageSeq}`) : L('la frase no está en la página citada', 'the sentence is not on the cited page'));
}
const flaggedAnom = Object.values(F.companies).flatMap((c) => (c.anomalies || []).filter((a) => a.result === 'flagged').map((a) => `${c.ticker} ${a.k} ${a.id}`));
for (const a of flaggedAnom) Q.record(a, 'outlier read in the filing', 'warn', null, null, L('sin registro en outliers.json: sigue «por revisar»', 'no record in outliers.json: still "needs review"'));
Q.curated('tools/hyperscalers/data/outliers.json', outl.length > 0 && flaggedAnom.length === 0, L(`${outl.filter((o) => o.result === 'confirmed' && o.applied).length} atípicos confirmados, ${outl.filter((o) => o.result !== 'confirmed').length} explicados con aviso, ${flaggedAnom.length} sin leer; actualizado ${(F.outliers || {}).updatedAt || '—'}`, `${outl.filter((o) => o.result === 'confirmed' && o.applied).length} outliers confirmed, ${outl.filter((o) => o.result !== 'confirmed').length} explained with the flag kept, ${flaggedAnom.length} unread; updated ${(F.outliers || {}).updatedAt || '—'}`));
Q.card(deals.filter((d) => d.fs && d.fs.result === 'unresolved').length + (F.notTagged || []).filter((i) => i.result === 'unknown').length + flaggedAnom.length, 'huecos sin resolver', 'unresolved gaps');
reviewedCard(Q, [...(F.notTagged || []), ...deals.filter((d) => d.fs).map((d) => d.fs), ...outl], 'revisados por analista (huecos, operaciones y atípicos)', 'analyst-reviewed (gaps, deals and outliers)');
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
await Q.write({ latestQuarter: latestIds.at(-1) || null, expectedQuarter: null, financialsGeneratedAt: F.generated, refreshedET: F.refreshedET, verification: F.verification || null });

// ---------------- module 6: off-balance-sheet ----------------
const O = createReport({ slug: 'hiperescaladores/fuera-de-balance', key: 'HYP_OFFBS_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia', 'Difference'), tolerances: L('Cada partida de texto debe citar presentación (número de acceso), sección y página; ' + VERIF.es + '.', 'Every text item must cite the filing (accession number), section and page; ' + VERIF.en + '.') });
const OB = F.offbs || { items: [], searched: [] };
for (const i of OB.items) {
  O.record(`${i.ticker} ${i.item}`, 'filing accession cited', i.filing && i.filing.accn ? 'ok' : 'fail');
  O.record(`${i.ticker} ${i.item}`, 'page cited', i.filing && i.filing.page ? 'ok' : 'warn', null, null, i.filing && i.filing.page ? null : L('Página por citar', 'Page to cite'));
  O.record(`${i.ticker} ${i.item}`, VLABEL, i.status === 'verified' ? 'ok' : 'warn');
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
reviewedCard(O, OB.items, 'revisadas por analista', 'analyst-reviewed');
O.card(gaps, 'huecos de cobertura', 'coverage gaps');
await O.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: F.generated });

// ---------------- modules 1, 2, 4, 5, 7 (curated text items; built by build-modules.mjs) ----------------
async function loadW(file, name) { const t = await readFile(p(SITE + `data/${file}.js`), 'utf8'); return JSON.parse(t.slice(t.indexOf('=') + 1).trim().replace(/;\s*$/, '')); }
const CAPD = await loadW('capacity', 'HYP_CAP'), SITD = await loadW('sites', 'HYP_SITES'), POWD = await loadW('power', 'HYP_POWER'), CIRD = await loadW('circular', 'HYP_CIRC');
const TOL_TEXT = L('Cada cifra cita la presentación (número de acceso), la sección y la página, y la frase citada debe aparecer en el texto descargado de esa página ("cita cotejada"). ' + VERIF.es + '.', 'Every figure cites the filing (accession number), section and page, and the quoted sentence must appear in the downloaded text of that page ("quote matched"). ' + VERIF.en + '.');
function citeChecks(Rp, tag, src, status) {
  if (!src) { Rp.record(tag, 'source cited', 'fail'); fails.push(`${tag}: no source`); return; }
  if (src.tier === 'T1') {
    Rp.record(tag, 'filing accession cited', src.accn ? 'ok' : 'fail');
    Rp.record(tag, 'quote matched on the cited page', src.quoteCheck === 'page' ? 'ok' : 'warn', null, null, src.quoteCheck === 'other_page' ? L(`la frase está en la página ${src.foundOn} del texto descargado`, `the sentence is on page ${src.foundOn} of the downloaded text`) : src.quoteCheck === 'page' ? null : L('frase no encontrada en el texto descargado', 'sentence not found in the downloaded text'));
    if (status !== undefined) Rp.record(tag, VLABEL, status === 'verified' ? 'ok' : 'warn');
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
reviewedCard(M1, CAPD.current, 'revisadas por analista', 'analyst-reviewed');
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
reviewedCard(M2, CAPD.pipeline.filter((x) => x.tier !== 'T2'), 'revisadas por analista', 'analyst-reviewed');
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

// module 8: payoff and cost of money (segments, backlog timing, useful lives, ratings, new-issue spreads, T4 estimates)
let M8 = null;
try {
  const PAYD = await loadW('payoff', 'HYP_PAY');
  M8 = createReport({ slug: 'hiperescaladores/retorno', key: 'HYP_PAY_QUALITY', generator: 'scripts/hyperscalers/validate.mjs', diffUnit: L('Diferencia (US$ M)', 'Difference (US$ m)'), tolerances: L('Cifras de texto: cita cotejada en la página y segunda lectura. Segmentos UDM = año fiscal − acumulado del año anterior + acumulado actual (cálculo FNAM, componentes T1). Calificaciones: hoja de términos registrada ante la SEC (T1) o nota de prensa de la acción de la agencia (T4). Estimaciones de capacidad de terceros (T4): nunca se suman a cifras de las empresas.', 'Text figures: quote matched on the page and a second reading. Segment TTM = fiscal year − prior year-to-date + current year-to-date (FNAM calculation on T1 components). Ratings: SEC-filed term sheet (T1) or a press report of the agency action (T4). Third-party capacity estimates (T4): never added to company figures.') });
  for (const x of PAYD.segments) {
    const tag = `${x.ticker} ${x.segment_en}`;
    for (const k of ['src', 'src2', 'src3', 'src4']) if (x[k]) citeChecks(M8, `${tag} (${k})`, x[k], k === 'src' ? x.status : undefined);
    if (x.calc && x.quarter && x.calc.ytd.revenue != null) M8.record(tag, 'latest quarter ≤ current year-to-date', x.quarter.revenue <= x.calc.ytd.revenue + 0.5 ? 'ok' : 'fail');
    M8.stale(tag, x.end, 200, L('vigente hasta la siguiente presentación', 'current until the next filing'));
  }
  // segment revenue vs XBRL company revenue: a segment can never exceed the company's TTM revenue at the same date
  for (const x of PAYD.segments) {
    const c = F.companies[x.ticker], q = c && c.quarters.find((z) => z.end === x.end), rev = x.calc ? x.calc.fy.revenue - x.calc.ytdPrev.revenue + x.calc.ytd.revenue : x.revenue;
    if (q && q.ttm && q.ttm.revenue) M8.record(`${x.ticker} ${x.segment_en}`, 'segment TTM revenue ≤ company TTM revenue (XBRL)', rev * 1e6 <= q.ttm.revenue * 1.001 ? 'ok' : 'fail', (rev * 1e6 - q.ttm.revenue) / 1e6);
  }
  for (const x of PAYD.rpoTiming) {
    citeChecks(M8, `${x.ticker} RPO timing`, x.src, x.status);
    const c = F.companies[x.ticker], q = c && c.quarters.find((z) => z.end === x.asOf && z.m.rpo);
    if (q) M8.identity(`${x.ticker} RPO`, 'RPO in the text = RPO tagged in XBRL', x.rpoUSDm, q.m.rpo[0] / 1e6, Math.max(100, x.rpoUSDm * 0.002), { soft: true });
  }
  for (const x of PAYD.usefulLives) citeChecks(M8, `${x.ticker} useful lives`, x.src, x.status);
  for (const x of PAYD.capexPerMW) citeChecks(M8, `${x.ticker} capex per MW`, x.src, x.status);
  const TSid = new Set(PAYD.termSheets.map((t) => t.id));
  for (const r of PAYD.ratings) for (const it of r.items) {
    const tag = `${r.ticker} ${it.agency} ${it.rating}`;
    M8.record(tag, it.tier === 'T1' ? 'rating from an SEC-filed term sheet' : 'rating from a dated press report (T4)', it.tier === 'T1' ? (it.termSheet && TSid.has(it.termSheet) ? 'ok' : 'fail') : (it.src && it.src.url && it.asOf ? 'ok' : 'fail'));
    M8.stale(tag, it.asOf, 365, L('una calificación con más de 12 meses se muestra en gris y fuera de los indicadores', 'a rating over 12 months old is grayed and kept out of indicators'));
  }
  for (const t of PAYD.termSheets) M8.record(`${t.ticker} ${t.form} ${t.date}`, 'term sheet read twice (automated; not analyst-reviewed)', t.status === 'verified' ? 'ok' : 'warn');
  for (const r of PAYD.ratings) for (const it of r.items) if (it.tier === 'T4') M8.record(`${r.ticker} ${it.agency} ${it.rating}`, 'secondary source labeled (agency page and SEC filings checked, not available)', it.secondary ? 'ok' : 'warn', null, null, it.agencyChecked ? L(it.agencyChecked.es || it.agencyChecked.en, it.agencyChecked.en) : null);
  for (const e of PAYD.mwEstimates) M8.record(`${e.publisher} ${e.date}`, 'third-party estimate labeled T4 with a URL and date', e.tier === 'T4' && e.url && e.date ? 'ok' : 'fail');
  const calAge = PAYD.calendar ? ageDays(PAYD.calendar.pulledAt) : null;
  M8.curated('FactSet earnings calendar (raw/factset/<date>-calendar.json)', calAge != null && calAge <= 45, L(`tomado el ${PAYD.calendar && PAYD.calendar.pulledAt} (${calAge} días); renovar en sesión cada mes y tras cada temporada`, `pulled ${PAYD.calendar && PAYD.calendar.pulledAt} (${calAge} days); renew in-session monthly and after each season`));
  M8.curated('tools/hyperscalers/data/payoff.json', ageDays(PAYD.updated) <= 100, L(`actualizado ${PAYD.updated}; repasar tras cada temporada de 10-Q`, `updated ${PAYD.updated}; review after each 10-Q season`));
  originsOf(M8, [...PAYD.segments.map((x) => x.src), ...PAYD.rpoTiming.map((x) => x.src), ...PAYD.usefulLives.map((x) => x.src)]);
  for (const t of PAYD.termSheets) M8.R.origins.push({ id: t.ticker, origin: 'primary', title: `${t.ticker} ${t.form} ${t.date}`, url: t.url, date: t.date, page: null, parts: t.accn });
  M8.card(PAYD.segments.length, 'segmentos de nube', 'cloud segments');
  M8.card(PAYD.rpoTiming.length, 'calendarios de cartera', 'backlog schedules');
  M8.card(PAYD.ratings.reduce((s, r) => s + r.items.length, 0), 'calificaciones', 'ratings');
  M8.card(PAYD.mwEstimates.length, 'estimaciones T4', 'T4 estimates');
  reviewedCard(M8, [].concat(PAYD.segments, PAYD.rpoTiming, PAYD.usefulLives, PAYD.capexPerMW, PAYD.termSheets), 'revisadas por analista', 'analyst-reviewed');
  await M8.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: PAYD.generated });
} catch (e) { if (e.code !== 'ENOENT') throw e; }

console.log(`validate: capex ${Q.R.checks.length} checks (${Q.R.fails.length} fail, ${Q.R.warns.length} warn); off-BS ${O.R.checks.length} checks, ${gaps} coverage gaps; modules 1/2/4/5/7/8: ${[M1, M2, M4, M5, M7, M8].filter(Boolean).map((m) => `${m.R.checks.length} (${m.R.fails.length} fail)`).join(' / ')}`);
if (fails.length || (state.errors || []).length === Object.keys(F.companies).length * 2) { console.error('HARD FAIL:\n  ' + fails.join('\n  ')); process.exit(1); }
void TODAY;
