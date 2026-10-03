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
  O.record(`${i.ticker} ${i.item}`, 'page cited', i.filing && i.filing.page ? 'ok' : 'warn', null, null, i.filing && i.filing.page ? null : L('Página por citar (la cifra viene del almacén verificado del modelo de Oracle, que cita la nota pero no la página)', 'Page to cite (the figure comes from the Oracle model\'s verified store, which cites the note but not the page)'));
  O.record(`${i.ticker} ${i.item}`, 'verified against the filing', i.status === 'verified' ? 'ok' : 'warn');
  const age = ageDays(i.asOf);
  O.stale(`${i.ticker} ${i.item}`, i.asOf, 200, L('vigente mientras no haya un 10-Q/10-K posterior', 'current until a later 10-Q/10-K'));
  void age;
}
const ITEMS = ['leases_not_commenced', 'vie_unconsolidated', 'jv_equity_method_debt', 'spv', 'rvg', 'purchase_obligation', 'guarantee'];
const XK = { vie_unconsolidated: 'vie_max_loss', jv_equity_method_debt: 'equity_method', purchase_obligation: 'purchase_oblig', guarantee: 'guarantees_max' };
let gaps = 0;
for (const c of Object.values(F.companies)) {
  const missing = ITEMS.filter((it) => !OB.items.some((i) => i.ticker === c.ticker && i.item === it) && !(XK[it] && c.quarters.some((q) => q.m[XK[it]])) && !OB.searched.some((s) => s.ticker === c.ticker && s.item === it));
  gaps += missing.length;
  O.curated(`${c.ticker} coverage`, missing.length === 0, L(missing.length ? `pendientes de lectura: ${missing.join(', ')}` : 'completa', missing.length ? `pending reading: ${missing.join(', ')}` : 'complete'));
}
O.curated('tools/hyperscalers/data/offbs.json', true, L(`actualizado ${OB.updated}`, `updated ${OB.updated}`));
O.card(OB.items.length, 'partidas de texto', 'text items');
O.card(OB.items.filter((i) => i.status !== 'verified').length, 'por revisar', 'to review');
O.card(gaps, 'huecos de cobertura', 'coverage gaps');
await O.write({ latestQuarter: null, expectedQuarter: null, financialsGeneratedAt: F.generated });

console.log(`validate: capex ${Q.R.checks.length} checks (${Q.R.fails.length} fail, ${Q.R.warns.length} warn); off-BS ${O.R.checks.length} checks, ${gaps} coverage gaps`);
if (fails.length || (state.errors || []).length === Object.keys(F.companies).length * 2) { console.error('HARD FAIL:\n  ' + fails.join('\n  ')); process.exit(1); }
void TODAY;
