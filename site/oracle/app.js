/* Oracle interactive financial model — page logic.
   A port of the GAP model's app (same structure, controls and rendering); data contracts (window.ORCL_*) are
   documented in tools/oracle/README.md. Everything here is derived from those files at render time; no figures are
   hard-coded. */
(function () {
  'use strict';
  const FIN = window.ORCL_FIN || { quarters: [], ytd: [], years: [], layout: { is: [], bs: [], cf: [], kpi: [] } };
  const MK = window.ORCL_MARKET || { prices: {}, dividends: {}, rates: {} };
  const REF = window.ORCL_REF || {};
  const PEERS = window.ORCL_PEERS || { peers: [] };
  const GD = window.ORCL_GUIDANCE || { vintages: [] };
  const CM = window.ORCL_COMMENTS || { periods: {} };
  const SUM = window.ORCL_SUMMARY || { sections: [] };
  const CDS = window.ORCL_CDS || { tenor: 5, recoveryPct: 40, points: [] };
  const CAL = window.ORCL_CALENDAR || null;

  // ---------------- i18n ----------------
  let LANG = 'es';
  let PRINT = false;
  const lastN = () => (PRINT ? 8 : 12);
  const S = {
    quarter: { es: 'Trimestre', en: 'Quarter' }, ytd: { es: 'Acumulado', en: 'Year-to-date' }, ltm: { es: 'Últimos 12 meses', en: 'Last twelve months' }, fy: { es: 'Año fiscal', en: 'Fiscal year' },
    is: { es: 'Estado de resultados', en: 'Income statement' }, bs: { es: 'Balance (principales rubros)', en: 'Balance sheet (highlights)' }, cf: { es: 'Flujo de efectivo', en: 'Cash flow' },
    line: { es: 'Concepto', en: 'Line item' }, change: { es: 'Δ', en: 'Δ' }, changePct: { es: 'Δ %', en: 'Δ %' },
    usdM: { es: 'US$ millones', en: 'US$ million' }, gaap: { es: 'GAAP', en: 'GAAP' }, ng: { es: 'No-GAAP', en: 'Non-GAAP' },
    src: { es: 'Fuente', en: 'Source' }, release: { es: 'comunicado de resultados de Oracle', en: 'Oracle earnings release' },
    cloud: { es: 'Nube', en: 'Cloud' }, software: { es: 'Software', en: 'Software' }, hardware: { es: 'Hardware', en: 'Hardware' }, services: { es: 'Servicios', en: 'Services' },
    revenue: { es: 'Ingresos', en: 'Revenue' }, ebitda: { es: 'EBITDA', en: 'EBITDA' }, netIncome: { es: 'Utilidad neta', en: 'Net income' }, margin: { es: 'Margen', en: 'Margin' },
    opIncome: { es: 'Utilidad de operación', en: 'Operating income' }, capex: { es: 'Capex', en: 'Capex' }, cfo: { es: 'Flujo operativo', en: 'Operating cash flow' }, fcf: { es: 'Flujo libre', en: 'Free cash flow' },
    total: { es: 'Total', en: 'Total' }, yoy: { es: 'a/a', en: 'y/y' }, qoq: { es: 't/t', en: 'q/q' },
    price: { es: 'Precio', en: 'Price' }, close: { es: 'cierre', en: 'close' }, high52: { es: 'Máx. 52 sem.', en: '52-wk high' }, low52: { es: 'Mín. 52 sem.', en: '52-wk low' }, ytdChg: { es: 'Var. en el año', en: 'YTD change' }, oneY: { es: 'Var. 1 año', en: '1-yr change' }, mktCap: { es: 'Capitalización', en: 'Market cap' }, ev: { es: 'Valor de la empresa (VE)', en: 'Enterprise value (EV)' },
    period: { es: 'Periodo', en: 'Period' }, ret: { es: 'Rendimiento', en: 'Return' },
    perShare: { es: 'Valor por acción (US$)', en: 'Value per share (US$)' }, upside: { es: 'vs. precio actual', en: 'vs. current price' },
    year: { es: 'Año', en: 'Year' }, wacc: { es: 'WACC', en: 'WACC' }, tv: { es: 'Valor terminal', en: 'Terminal value' }, pv: { es: 'Valor presente', en: 'Present value' },
    dps: { es: 'Dividendo por acción (US$)', en: 'Dividend per share (US$)' }, payout: { es: 'Razón de pago', en: 'Payout ratio' }, yield: { es: 'Rendimiento', en: 'Yield' },
    nd: { es: 'Deuda neta', en: 'Net debt' }, lev: { es: 'Deuda neta / EBITDA UDM', en: 'Net debt / LTM EBITDA' }, grossDebt: { es: 'Deuda total', en: 'Total debt' }, cash: { es: 'Efectivo e inversiones', en: 'Cash & investments' },
    instrument: { es: 'Instrumento', en: 'Instrument' }, matures: { es: 'Vence', en: 'Matures' }, principal: { es: 'Principal (US$ M)', en: 'Principal (US$ M)' }, rate: { es: 'Tasa', en: 'Rate' }, rating: { es: 'Calificación', en: 'Rating' },
    pending: { es: 'Pendiente (conector FactSet)', en: 'Pending (FactSet connector)' }, na: { es: 'n/d', en: 'n/a' },
    metric: { es: 'Métrica', en: 'Metric' }, value: { es: 'Valor', en: 'Value' }, basis: { es: 'Base', en: 'Basis' },
    block: { es: 'Bloque', en: 'Block' }, cadence: { es: 'Cadencia', en: 'Cadence' }, mechanism: { es: 'Mecanismo', en: 'Mechanism' }, lastUpdate: { es: 'Última actualización', en: 'Last update' },
    ops: { es: 'Métricas operativas', en: 'Operating metrics' },
    guideFor: { es: 'Trimestre guiado', en: 'Guided quarter' }, guideStatus: { es: 'Estatus', en: 'Status' }, issued: { es: 'Emitida', en: 'Issued' }, revised: { es: 'Revisada', en: 'Revised' }, unchanged: { es: 'Sin cambios', en: 'Unchanged' }, initial: { es: 'Inicial', en: 'Initial' },
    actual: { es: 'Real', en: 'Actual' }, tracking: { es: 'Seguimiento', en: 'Tracking' }, outcome: { es: 'Resultado', en: 'Outcome' }, within: { es: 'En rango', en: 'In range' }, above: { es: 'Por encima', en: 'Above' }, below: { es: 'Por debajo', en: 'Below' },
    date: { es: 'Fecha', en: 'Date' }, type: { es: 'Tipo', en: 'Type' }, hits: { es: 'En rango o mejor', en: 'In range or better' }, fromCall: { es: 'de la llamada', en: 'from the call' }, fromRelease: { es: 'del comunicado', en: 'from the release' },
    comments: { es: 'Comentarios', en: 'Comments' }, prefGroup: { es: 'Entre utilidad neta y utilidad a comunes', en: 'Between net income and income to common' }, items: { es: 'conceptos', en: 'items' },
    cmtNote: { es: 'Comentarios (a/a) elaborados a partir de los comunicados de resultados y las transcripciones de las llamadas de resultados; cubren del 1T24 al trimestre más reciente y los años fiscales AF2024–AF2026.', en: 'Comments (y/y) written from the earnings releases and the earnings-call transcripts; they cover 1Q24 to the latest quarter and fiscal years FY2024–FY2026.' },
    cmtOnlyYoy: { es: 'Los comentarios se muestran al comparar un trimestre con el mismo trimestre del año fiscal anterior, o un año fiscal con el anterior (desde el 1T24 / AF2024).', en: 'Comments appear when a quarter is compared with the same quarter of the prior fiscal year, or a fiscal year with the prior one (from 1Q24 / FY2024).' },
    provisional: { es: 'Datos provisionales: faltan archivos de datos. Ejecute node scripts/oracle/build-data.mjs.', en: 'Provisional: data files missing. Run node scripts/oracle/build-data.mjs.' },
    rpo: { es: 'RPO (US$ M)', en: 'RPO (US$ M)' }, cloudRev: { es: 'Ingresos de nube (US$ M, base AF2026)', en: 'Cloud revenue (US$ M, FY2026 basis)' }, cloudShare: { es: 'Nube como % de los ingresos', en: 'Cloud as % of revenue' },
    basisDiffers: { es: 'base distinta', en: 'basis differs' }, recastNote: { es: 'Los rubros de ingresos de los trimestres anteriores al AF2026 se muestran como Oracle los reexpresó en la base Nube / Software (columna del año anterior del reporte posterior); los totales no cambian.', en: 'Revenue lines for pre-FY2026 quarters are shown as Oracle recast them on the Cloud / Software basis (prior-year column of the later release); totals are unchanged.' },
    legacyNote: { es: 'Antes del AF2026 Oracle presentaba los ingresos como "Servicios de nube y soporte de licencias" (aquí Nube) y "Licencias de nube y en sitio" (aquí Software); no existe reexpresión pública de esos trimestres en la base actual.', en: 'Before FY2026 Oracle presented revenue as "Cloud services and license support" (shown here as Cloud) and "Cloud license and on-premise license" (shown as Software); no public recast of those quarters on the current basis exists.' },
  };
  const t = (k) => (S[k] ? S[k][LANG] : k);
  const L = (obj) => (obj ? (typeof obj === 'string' ? obj : LANG === 'es' ? obj.es || obj.en : obj.en || obj.es) : '');
  const LS = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v : L(v));

  // ---------------- formatting ----------------
  const locale = () => (LANG === 'es' ? 'es-MX' : 'en-US');
  const fmtN = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }));
  const fmtM = (v, d = 0) => fmtN(v, d); // statements are already in US$ millions
  // "US$ 451.1" stays together; a line may break only before "mil M" / "bn" so a narrow tile wraps tidily.
  // Percentage change that respects sign: lines stored as negatives (costs, expenses, capex) grow when they become
  // more negative, so both-negative → change in magnitude; mixed signs or a zero base → not meaningful (null).
  const pctChange = (a, b) => (a == null || b == null || !b || (a > 0 && b < 0) || (a < 0 && b > 0) ? null : 100 * (a - b) / b);
  const fmtBn = (vM, d = 1) => (vM == null || !isFinite(vM) ? '—' : 'US$ ' + fmtN(vM / 1000, d) + (LANG === 'es' ? ' mil M' : ' bn'));
  const fmtPct = (v, d = 1, sign = false) => (v == null || !isFinite(v) ? '—' : (sign && v > 0 ? '+' : '') + v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + '%');
  const fmtX = (v, d = 1) => (v == null || !isFinite(v) ? '—' : v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + 'x');
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')); return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const qLabel = (q) => (LANG === 'es' ? `${q.q}T${String(q.fy).slice(2)}` : `${q.q}Q${String(q.fy).slice(2)}`);
  const qLabelId = (id) => { const m = /^(\d{4})Q(\d)$/.exec(id || ''); return m ? qLabel({ fy: +m[1], q: +m[2] }) : id; };
  const ytdLabel = (fy, months) => `${months}M${String(fy).slice(2)}`;
  const fyLabel = (fy) => `FY${fy}`;
  const cls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const el = (id) => document.getElementById(id);
  const html = (id, s) => { const e = el(id); if (e) e.innerHTML = s; };
  const link = (s, label) => (s && s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${label || (t('release') + ' (' + fmtDate(s.date) + ')')}</a>` : label || '');

  // ---------------- theme + chart defaults ----------------
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (document.documentElement.getAttribute('data-theme') !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const SERIES = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cssVar('--series-' + i));
  const hasChart = () => typeof Chart !== 'undefined';
  function chartDefaults() {
    if (!hasChart()) return;
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif'; Chart.defaults.font.size = 11.5;
    Chart.defaults.color = cssVar('--muted'); Chart.defaults.borderColor = cssVar('--grid');
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.boxHeight = 10; Chart.defaults.plugins.legend.labels.usePointStyle = false;
    Chart.defaults.plugins.tooltip.backgroundColor = isDark() ? '#2a2a27' : '#0b0b0b';
    Chart.defaults.plugins.tooltip.titleFont = { family: 'Inter', weight: '700', size: 12 }; Chart.defaults.plugins.tooltip.bodyFont = { family: 'Inter', size: 12 };
    Chart.defaults.plugins.tooltip.padding = 10; Chart.defaults.plugins.tooltip.cornerRadius = 6; Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.interaction = { mode: 'index', intersect: false };
    Chart.defaults.elements.line.borderWidth = 2; Chart.defaults.elements.line.tension = 0.15; Chart.defaults.elements.point.radius = 0; Chart.defaults.elements.point.hoverRadius = 4;
    Chart.defaults.elements.bar.borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }; Chart.defaults.elements.bar.borderSkipped = 'bottom';
    Chart.defaults.maintainAspectRatio = false;
  }
  const charts = {};
  function mkChart(id, cfg) {
    const cv = el(id); if (!cv || !hasChart()) return null;
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    const ex = Chart.getChart(cv); if (ex) ex.destroy();
    cfg.options = cfg.options || {}; cfg.options.scales = cfg.options.scales || {};
    for (const k of Object.keys(cfg.options.scales)) { const sc = cfg.options.scales[k]; sc.grid = Object.assign({ color: cssVar('--grid'), drawTicks: false, lineWidth: 1 }, sc.grid || {}); sc.border = Object.assign({ color: cssVar('--baseline') }, sc.border || {}); sc.ticks = Object.assign({ padding: 6 }, sc.ticks || {}); }
    // Mixed bar + line charts: lines always draw on top of the bars (lower `order` = drawn later), with a
    // heavier stroke and visible points, so a y/y or net-debt line can never hide behind the columns.
    const ds = (cfg.data && cfg.data.datasets) || [];
    const kind = (d) => d.type || cfg.type;
    if (ds.some((d) => kind(d) === 'line') && ds.some((d) => kind(d) === 'bar')) {
      for (const d of ds) {
        if (kind(d) === 'line') { if (d.order == null) d.order = 0; if (d.borderWidth == null) d.borderWidth = 2.5; if (d.pointRadius == null) d.pointRadius = 3; if (d.pointBorderColor == null) d.pointBorderColor = cssVar('--surface'); if (d.pointBorderWidth == null) d.pointBorderWidth = 1.5; if (d.pointHoverRadius == null) d.pointHoverRadius = 5; }
        else if (d.order == null) d.order = 10;
      }
    }
    charts[id] = new Chart(cv, cfg);
    return charts[id];
  }
  const axisM = (d = 0) => ({ callback: (v) => fmtN(v, d) });
  const alpha = (hex, a) => hex + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '');

  // ---------------- data prep ----------------
  const Q = FIN.quarters.filter((q) => q.is);
  const Y = FIN.years || [];
  const lastQ = Q[Q.length - 1];
  const qById = Object.fromEntries(FIN.quarters.map((q) => [q.id, q]));
  const prevQid = (q) => (q.q === 1 ? `${q.fy - 1}Q4` : `${q.fy}Q${q.q - 1}`);
  const yoyQid = (q) => `${q.fy - 1}Q${q.q}`;
  const REV_LINES = ['revCloud', 'revSoftware', 'revHardware', 'revServices'];
  const revOnNewBasis = (q) => (q.basis === 'fy2026_lines' ? { revCloud: q.is.revCloud, revSoftware: q.is.revSoftware, revHardware: q.is.revHardware, revServices: q.is.revServices } : q.recast ? { revCloud: q.recast.revCloud, revSoftware: q.recast.revSoftware, revHardware: q.recast.revHardware, revServices: q.recast.revServices } : null);
  const sumParts = (objs) => { const o = {}; for (const x of objs) for (const [k, v] of Object.entries(x || {})) if (typeof v === 'number') o[k] = (o[k] || 0) + v; return o; };
  // Percent rows are not additive: recompute after summing; share counts are averaged.
  function fixRatios(is, n) {
    if (!is) return is; const o = { ...is };
    for (const d of FIN.layout.is) if (d.pct) delete o[d.k];
    if (o.revTotal) { if (o.opIncome != null) o.opMargin = 100 * o.opIncome / o.revTotal; if (o.ngOpIncome != null) o.ngOpMargin = 100 * o.ngOpIncome / o.revTotal; if (o.ebitda != null) o.ebitdaMargin = 100 * o.ebitda / o.revTotal; }
    if (o.pretaxIncome) o.taxRate = 100 * (-(o.incomeTax || 0)) / o.pretaxIncome;
    if (n && o.dilutedShares != null) o.dilutedShares = o.dilutedShares / n;
    return o;
  }
  const fixCf = (cf, is) => { if (!cf) return cf; const o = { ...cf }; delete o.capexToRevenue; if (is && is.revTotal && o.capex != null) o.capexToRevenue = 100 * -o.capex / is.revTotal; return o; };
  const combine = (qs, id, extra) => {
    const rec = qs.every((x) => revOnNewBasis(x)) ? sumParts(qs.map(revOnNewBasis)) : null;
    const is = fixRatios(sumParts(qs.map((x) => x.is)), qs.length);
    const last = qs[qs.length - 1];
    return { id, is, cf: fixCf(sumParts(qs.map((x) => x.cf)), is), bs: last.bs, kpi: { ...sumParts(qs.map((x) => ({ dps: x.kpi.dps }))), rpo: last.kpi.rpo, rpoYoyPct: last.kpi.rpoYoyPct, cloudRev: rec ? rec.revCloud : null, cloudShare: rec && is.revTotal ? 100 * rec.revCloud / is.revTotal : null }, recast: rec && qs.some((x) => x.basis !== 'fy2026_lines') ? rec : null, basis: qs.every((x) => x.basis === 'fy2026_lines') ? 'fy2026_lines' : rec ? 'recast' : 'legacy_lines', sources: last.sources, derived: true, fy: last.fy, q: last.q, quarters: qs.map((x) => x.id), ...extra };
  };
  function ytdFor(q) {
    const qs = []; for (let i = 1; i <= q.q; i++) { const x = qById[`${q.fy}Q${i}`]; if (!x || !x.is) return null; qs.push(x); }
    return combine(qs, ytdLabel(q.fy, q.q * 3), { months: q.q * 3 });
  }
  function ltmFor(q) {
    const qs = []; let fy = q.fy, qq = q.q;
    for (let i = 0; i < 4; i++) { const x = qById[`${fy}Q${qq}`]; if (!x || !x.is) { qs.length = 0; break; } qs.unshift(x); qq--; if (qq === 0) { qq = 4; fy--; } }
    if (qs.length === 4) return combine(qs, 'LTM ' + qLabel(q), { months: 12 });
    if (q.q === 4) { const y = Y.find((yy) => yy.fy === q.fy); if (y) return { id: 'LTM ' + qLabel(q), is: y.is, cf: y.cf, kpi: y.kpi, bs: q.bs, sources: y.sources, fy: q.fy, q: 4, basis: 'fy' }; }
    return null;
  }
  const lastLTM = lastQ ? ltmFor(lastQ) : null;

  // Market helpers
  const px = (id) => (MK.prices && MK.prices[id] && MK.prices[id].points) || [];
  const lastPoint = (pts) => (pts.length ? pts[pts.length - 1] : null);
  const pointAtOrBefore = (pts, date) => { let lo = 0, hi = pts.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= date) { ans = pts[mid]; lo = mid + 1; } else hi = mid - 1; } return ans; };
  const us10 = (MK.rates && MK.rates.US10Y && MK.rates.US10Y.points) || [];
  const orclPx = px('ORCL'); const lastPx = lastPoint(orclPx);
  const sharesNow = (MK.sharesOutstanding && MK.sharesOutstanding.shares) || (REF.shares && REF.shares.total) || (lastQ && lastQ.shares && lastQ.shares.current) || null;
  const sharesAt = (date) => { const h = (REF.shares && REF.shares.history) || []; let v = null; for (const e of h) if (e.asOf <= date) v = e.total; return v || sharesNow; };
  // Fiscal year ends 31 May: Q1 ends 31 Aug and Q2 30 Nov of the previous calendar year, Q3 28 Feb, Q4 31 May.
  const qEndDate = (q) => q.periodEnd || (q.q === 1 ? `${q.fy - 1}-08-31` : q.q === 2 ? `${q.fy - 1}-11-30` : q.q === 3 ? `${q.fy}-02-28` : `${q.fy}-05-31`);
  const netDebt = (q) => (q && q.bs && q.bs.totalDebt != null ? { gross: q.bs.totalDebt, cash: q.bs.cashAndInvestments || 0, net: q.bs.totalDebt - (q.bs.cashAndInvestments || 0), basis: 'bs' } : null);
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const GV = (GD.vintages || []).slice().sort((a, b) => a.date.localeCompare(b.date));

  // ---------------- freshness: what the automation has not yet delivered ----------------
  // Client-side checks (price age, quarter age) work even if the pipeline stopped regenerating quality.js;
  // the report adds pending extractions, failed tie-outs and its own age.
  const QR = (window.ORCL_QUALITY && window.ORCL_QUALITY.report) || null;
  const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(String(d).slice(0, 10) + 'T00:00:00Z').getTime()) / 86400000) : null);
  function pendingUpdates() {
    const out = [];
    const es = LANG === 'es';
    if (lastPx && daysSince(lastPx[0]) > 5) out.push(es ? `precio de la acción: último cierre ${fmtDate(lastPx[0])} (la actualización diaria no ha corrido)` : `share price: last close ${fmtDate(lastPx[0])} (the daily refresh has not run)`);
    if (lastQ && lastQ.releaseDate && daysSince(lastQ.releaseDate) > 100) out.push(es ? `último trimestre publicado ${qLabel(lastQ)} (${fmtDate(lastQ.releaseDate)}); el siguiente reporte está por llegar y entra al modelo el día hábil posterior al 8-K` : `latest quarter ${qLabel(lastQ)} (reported ${fmtDate(lastQ.releaseDate)}); the next release is due and enters the model the weekday after the 8-K`);
    if (QR) {
      const gen = QR.generated || QR.generatedAt;
      if (gen && daysSince(gen) > 4) out.push(es ? `el proceso de datos no ha corrido desde el ${fmtDate(String(gen).slice(0, 10))}` : `the data pipeline has not run since ${fmtDate(String(gen).slice(0, 10))}`);
      if (QR.summary && QR.summary.failed > 0) out.push(es ? `${QR.summary.failed} verificación(es) contable(s) fallida(s); cifras en revisión` : `${QR.summary.failed} tie-out check(s) failed; figures under review`);
      for (const s of QR.stale || []) {
        const m = /^(\d+) archived filing/.exec(s);
        const tr = /^10-year Treasury as of (\S+)/.exec(s);
        if (m) out.push(es ? `${m[1]} reporte(s) nuevo(s) archivado(s), pendiente(s) de extracción (siguiente corrida de la rutina)` : `${m[1]} new filing(s) archived, pending extraction (next routine run)`);
        else if (tr) out.push(es ? `Tesoro a 10 años al ${fmtDate(tr[1])}` : `10-year Treasury as of ${fmtDate(tr[1])}`);
        else if (/^Investor calendar last refreshed (\S+)/.test(s)) { const d = /^Investor calendar last refreshed (\S+)/.exec(s)[1]; out.push(es ? `calendario del inversionista sin actualizar desde el ${fmtDate(d)}` : `investor calendar not refreshed since ${fmtDate(d)}`); }
        // "Share price" and "Latest quarter" are already covered by the client-side checks above.
      }
    }
    return out;
  }

  // ================= HEADER =================
  function renderHeader() {
    const asof = [];
    if (lastQ) asof.push(`<span><b>${t('quarter')}:</b> ${qLabel(lastQ)} · ${fmtDate(lastQ.releaseDate || (lastQ.sources && lastQ.sources.is && lastQ.sources.is.date))}</span>`);
    const gv = GV[GV.length - 1]; if (gv) asof.push(`<span><b>${LANG === 'es' ? 'Guía' : 'Guidance'}:</b> ${fmtDate(gv.date)}</span>`);
    if (lastPx) asof.push(`<span><b>${t('price')}:</b> ${fmtDate(lastPx[0])}</span>`);
    if (FIN.generatedAt) asof.push(`<span><b>${LANG === 'es' ? 'Datos generados' : 'Data generated'}:</b> ${fmtDate(FIN.generatedAt.slice(0, 10))}</span>`);
    html('asofRow', asof.join(''));
    const notice = el('dataNotice');
    const pend = pendingUpdates();
    if (!Q.length) { notice.hidden = false; notice.className = 'notice warn'; notice.textContent = t('provisional'); }
    else if (pend.length) { notice.hidden = false; notice.className = 'notice warn'; notice.innerHTML = `<b>${LANG === 'es' ? 'Actualización automática pendiente' : 'Automatic update pending'}:</b> ${pend.join(' · ')} <span class="muted small">(${LANG === 'es' ? 'detalle en' : 'details on'} <a href="quality.html">quality.html</a>)</span>`; }
    else notice.hidden = true;
    const k = [];
    if (lastPx) { const yAgo = pointAtOrBefore(orclPx, addDays(lastPx[0], -365)); k.push({ l: 'ORCL (NYSE)', v: 'US$ ' + fmtN(lastPx[1], 2), d: yAgo ? `${fmtPct(100 * (lastPx[1] / yAgo[1] - 1), 1, true)} ${t('oneY')}` : '' }); }
    if (lastPx && sharesNow) { const mc = lastPx[1] * sharesNow; k.push({ l: t('mktCap'), v: 'US$ ' + fmtN(mc / 1e9, 1) + ' ' + (LANG === 'es' ? 'mil M' : 'bn'), d: `${fmtN(sharesNow / 1e6, 1)} M ${LANG === 'es' ? 'acciones' : 'shares'}` }); }
    if (lastLTM && lastLTM.is && lastLTM.is.ebitda != null) k.push({ l: 'EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: fmtBn(lastLTM.is.ebitda), d: `${t('margin')} ${fmtPct(lastLTM.is.ebitdaMargin)}` });
    const nd = netDebt(lastQ);
    if (nd && lastLTM && lastLTM.is && lastLTM.is.ebitda) k.push({ l: t('lev'), v: fmtX(nd.net / lastLTM.is.ebitda, 2), d: `${t('nd')} ${fmtBn(nd.net)}` });
    if (lastPx && sharesNow && nd && lastLTM && lastLTM.is && lastLTM.is.ebitda) { const ev = lastPx[1] * sharesNow / 1e6 + nd.net; k.push({ l: 'VE / EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: fmtX(ev / lastLTM.is.ebitda), d: lastLTM.is.epsDiluted ? `P/U ${fmtX(lastPx[1] / lastLTM.is.epsDiluted)} GAAP · ${lastLTM.is.ngEpsDiluted ? fmtX(lastPx[1] / lastLTM.is.ngEpsDiluted) + ' ' + t('ng') : ''}` : '' }); }
    html('kpiStrip', k.map((x) => `<div class="kpi"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="delta">${x.d || ''}</div></div>`).join(''));
    el('genStamp').textContent = fmtDate((FIN.generatedAt || MK.generatedAt || '').slice(0, 10));
  }

  // ================= 00 EXECUTIVE SUMMARY =================
  function renderSummary() {
    renderPress();
    const b = SUM.basis || {};
    const qq = b.quarter && (qById[b.quarter] || { fy: +b.quarter.slice(0, 4), q: +b.quarter.slice(5) });
    html('sumMeta', LANG === 'es'
      ? `Con base en los resultados del ${qq ? qLabel(qq) : '—'} (${fmtDate(b.resultsDate)}) y la guía del ${fmtDate(b.guidanceDate)} · redactado el ${fmtDate(SUM.updatedAt)}; se reescribe con cada reporte nuevo. Las cifras de mercado del encabezado son diarias.`
      : `Based on ${qq ? qLabel(qq) : '—'} results (${fmtDate(b.resultsDate)}) and the guidance of ${fmtDate(b.guidanceDate)} · written ${fmtDate(SUM.updatedAt)}; rewritten with each new report. Market figures in the header are daily.`);
    if (!(SUM.sections || []).length) { html('sumGrid', `<div class="notice warn">${LANG === 'es' ? 'El resumen ejecutivo se redacta a partir del comunicado y la transcripción del último trimestre; pendiente de la primera corrida de la rutina de revisión.' : 'The executive summary is drafted from the latest release and call transcript; pending the first run of the reviewing routine.'}</div>`); return; }
    html('sumGrid', (SUM.sections || []).map((sec) => `<div class="card"><h3>${L(sec.title)}</h3><ul>${(sec[LANG] || sec.en || []).map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join(''));
    html('sumSrc', `${t('src')}: ${relLink()} · ${LANG === 'es' ? 'transcripción de la llamada de resultados' : 'earnings-call transcript'} · ${irLink()} · ${asOfQ()}${SUM.updatedAt ? ` · ${LANG === 'es' ? 'redactado el' : 'drafted'} ${fmtDate(SUM.updatedAt)}` : ''}`);
  }

  // ---- market concerns as stated in credible press and analyst publications (tools/oracle/data/press.json; weekly sweep) ----
  const PRESS = window.ORCL_PRESS || null;
  function renderPress() {
    const box = el('sumPress'); if (!box) return;
    if (!PRESS || !(PRESS.items || []).length) { box.hidden = true; return; }
    box.hidden = false; const es = LANG === 'es';
    const themes = (PRESS.themes || []).map((th) => ({ ...th, items: PRESS.items.filter((x) => x.theme === th.id) })).filter((th) => th.items.length);
    const item = (x) => `<li><b>${fmtDate(x.date)} · ${x.outlet}</b> — ${extLink(x.url, x.title)}<br>${es ? x.es : x.en}${(x.also || []).length ? ` <span class="muted small">${es ? 'También' : 'Also'}: ${x.also.map((a) => extLink(a.url, a.outlet) + (a.note_en ? ` (${es ? a.note_es : a.note_en})` : '')).join(' · ')}</span>` : ''}</li>`;
    const outlets = [...new Set(PRESS.items.map((x) => x.outlet))].join(', ');
    html('sumPress', `<h3>${es ? 'Lo que preocupa al mercado' : 'What the market is worried about'} <span class="muted small" style="font-weight:400">(${es ? `prensa y analistas, últimos ${PRESS.windowDays} días, agrupado por tema` : `press and analysts, last ${PRESS.windowDays} days, grouped by theme`})</span></h3><div class="grid-2">${themes.map((th) => `<div><h4 class="press-h">${es ? th.es : th.en}</h4><ul class="press">${th.items.map(item).join('')}</ul></div>`).join('')}</div><p class="chart-src">${t('src')}: ${es ? 'enlaces en cada punto' : 'links on each item'} (${outlets}) · ${es ? 'cada resumen se limita a lo que reporta la pieza, sin inferencias; las declaraciones de Oracle se citan cuando la pieza las incluye' : 'each summary is limited to what the piece reports, no inference; Oracle\'s statements are quoted where the piece includes them'} · ${es ? 'barrido semanal (lunes) por la rutina de escritorio · al' : 'weekly sweep (Mondays) by the desktop routine · as of'} ${fmtDate(PRESS.asOf)}</p>`);
  }

  // ---------------- uniform source / timestamp pieces (every chart and table footer uses these) ----------------
  const IR_EVENTS = 'https://investor.oracle.com/events-and-presentations/default.aspx';
  const NASDAQ_URL = 'https://www.nasdaq.com/market-activity/stocks/orcl/historical';
  const FRED_SPX = 'https://fred.stlouisfed.org/series/SP500', FRED_DGS10 = 'https://fred.stlouisfed.org/series/DGS10';
  const extLink = (url, label) => `<a href="${url}" target="_blank" rel="noopener">${label} ↗</a>`;
  function asOfQ() { return lastQ ? `${LANG === 'es' ? 'al' : 'as of'} ${qLabel(lastQ)}, ${LANG === 'es' ? 'reportado el' : 'reported'} ${fmtDate(lastQ.releaseDate)}` : ''; }
  function relLink() { return lastQ && lastQ.sources && lastQ.sources.is ? link(lastQ.sources.is, t('release') + ' ↗') : ''; }
  function irLink() { return extLink(IR_EVENTS, LANG === 'es' ? 'llamadas de resultados (IR)' : 'earnings calls (IR)'); }
  function closeStamp() { const p = orclPx && orclPx.length ? orclPx[orclPx.length - 1] : null; return p ? `${LANG === 'es' ? 'cierre del' : 'close of'} ${fmtDate(p[0])}` : ''; }
  function tenKLink() { const i = (REF.debt && REF.debt.instruments || []).find((x) => x.url); return i ? extLink(i.url, LANG === 'es' ? '10-K AF2026' : 'FY2026 10-K') : ''; }

  // ================= 01 STATEMENTS =================
  const st = { stmt: 'is', mode: 'q', a: null, b: null, preset: 'yoy', ng: false, open: { cor: false, ng: false, pref: false } };
  function periodOptions() {
    if (st.mode === 'fy') return Y.map((y) => ({ id: y.id, label: fyLabel(y.fy), obj: { ...y, label: fyLabel(y.fy), basis: y.basis || (y.fy >= 2026 ? 'fy2026_lines' : 'legacy_lines') } }));
    if (st.mode === 'q') return Q.map((q) => ({ id: q.id, label: qLabel(q), obj: { ...q, label: qLabel(q) } }));
    if (st.mode === 'ytd') return Q.map((q) => { const y = ytdFor(q); return y ? { id: q.id, label: y.id, obj: { ...y, label: y.id } } : null; }).filter(Boolean);
    return Q.map((q) => { const l = ltmFor(q); return l ? { id: q.id, label: l.id, obj: { ...l, label: l.id } } : null; }).filter(Boolean);
  }
  function defaultPair(opts, preset) {
    const a = opts[opts.length - 1]; if (!a) return [null, null];
    const qa = qById[a.id] || {}; let bid;
    if (st.mode === 'fy') bid = `FY${(Y.find((y) => y.id === a.id) || {}).fy - 1}`;
    else bid = preset === 'qoq' && st.mode === 'q' ? prevQid(qa) : yoyQid(qa);
    const b = opts.find((o) => o.id === bid) || opts[opts.length - 2] || null;
    return [a, b];
  }
  // The comparison period follows the chosen period and the active preset: y/y = same period a year earlier
  // (3Q26 → 3Q25; YTD 2Q26 → YTD 2Q25; FY2026 → FY2025), q/q = the previous quarter (3Q26 → 2Q26). The reader
  // can still pick any B by hand; picking A again re-applies the preset so a wrong pair cannot linger.
  function pairedB(aId, opts) {
    if (!aId) return null;
    let bid;
    if (st.mode === 'fy') bid = `FY${(Y.find((y) => y.id === aId) || {}).fy - 1}`;
    else { const qa = qById[aId] || {}; bid = st.preset === 'qoq' && st.mode === 'q' ? prevQid(qa) : yoyQid(qa); }
    const b = opts.find((o) => o.id === bid);
    return b ? b.id : null;
  }
  function fillSelects(preset) {
    const opts = periodOptions();
    if (preset) st.preset = preset;
    const mk = (sel, chosen) => { sel.innerHTML = opts.map((o) => `<option value="${o.id}"${chosen && o.id === chosen.id ? ' selected' : ''}>${o.label}</option>`).join(''); };
    if (!st.a || !opts.find((o) => o.id === st.a)) st.a = (opts[opts.length - 1] || {}).id;
    const paired = pairedB(st.a, opts);
    if (preset || !st.b || !opts.find((o) => o.id === st.b)) st.b = paired || (opts[opts.length - 2] || {}).id;
    mk(el('selA'), opts.find((o) => o.id === st.a)); mk(el('selB'), opts.find((o) => o.id === st.b));
  }
  function isYoY(A, B, mode = st.mode) {
    if (!A || !B) return false;
    if (mode === 'fy') return B.fy === A.fy - 1;
    if (mode === 'q') return B.fy === A.fy - 1 && B.q === A.q;
    if (mode === 'ytd') return B.fy === A.fy - 1 && B.months === A.months;
    return false;
  }
  // Comments exist for year-over-year quarter pairs (keyed "2027Q1") and consecutive fiscal years (keyed "FY2026").
  function yoyCommentsFor(A, B, mode = st.mode) { if (!isYoY(A, B, mode) || (mode !== 'q' && mode !== 'fy')) return null; return CM.periods && CM.periods[A.id] ? CM.periods[A.id] : null; }
  // Comments-column header: names the period whose release and call the comments come from (comments exist for
  // quarter-vs-same-quarter and fiscal-year comparisons only), so an LTM or YTD toggle cannot be misread.
  function cmtHead(A, C) {
    if (!C) return LANG === 'es' ? 'Comentarios (solo en comparaciones a/a de trimestre o de año fiscal)' : 'Comments (quarter y/y and fiscal-year comparisons only)';
    const per = A && A.label ? A.label : (lastQ ? qLabel(lastQ) : '');
    return LANG === 'es' ? `Comentarios · comunicado y llamada del ${per}` : `Comments · ${per} release and call`;
  }
  // Revenue lines: when one side is on the pre-FY2026 basis and the other on the current one, use Oracle's recast.
  function revValue(obj, other, k) {
    if (!obj || !obj.is) return null;
    if (REV_LINES.includes(k) && obj.basis !== 'fy2026_lines' && other && other.basis === 'fy2026_lines' && obj.recast && obj.recast[k] != null) return obj.recast[k];
    return obj.is[k];
  }
  function renderStatements() {
    const opts = periodOptions();
    const A = (opts.find((o) => o.id === st.a) || {}).obj, B = (opts.find((o) => o.id === st.b) || {}).obj;
    const layout = FIN.layout[st.stmt] || [];
    const key = st.stmt;
    const usedRecast = { a: false, b: false };
    const get = (obj, other, def, side) => {
      if (!obj || !obj[key]) return null;
      let k = def.k;
      if (key === 'is' && st.ng && def.ngAlt) k = def.ngAlt;
      let v = key === 'is' ? revValue(obj, other, k) : obj[key][k];
      if (key === 'is' && REV_LINES.includes(k) && v != null && v !== obj.is[k]) usedRecast[side] = true;
      return v == null ? null : v;
    };
    // Comments on all three statements; balance-sheet rows without their own entry borrow the closest one.
    const C = yoyCommentsFor(A, B);
    const withCmt = true;
    const CMT_ALIAS = { cashAndInvestments: 'cash', marketableSecurities: 'cash', netDebt: 'totalDebt', debtLT: 'totalDebt', debtCurrent: 'totalDebt', depreciation: 'da', amortization: 'da', capexToRevenue: 'capex' };
    const cmtOf = (k) => (C && (C.lines[k] || (CMT_ALIAS[k] && C.lines[CMT_ALIAS[k]]))) || null;
    const yoy = isYoY(A, B);
    // Revenue lines on different presentation bases with no recast available (e.g. FY2026 vs FY2024): the
    // totals compare, the cloud/software split does not — show the figures but blank the variance.
    const onNew = (o) => o && o.basis === 'fy2026_lines';
    const canRecast = (o) => o && (onNew(o) || o.recast);
    const mismatch = key === 'is' && A && B && onNew(A) !== onNew(B) && !(canRecast(A) && canRecast(B));
    // Groups: cost of revenues detail ('cor'), the Non-GAAP reconciliation detail ('ng'), and the lines between
    // net income and net income to common ('pref').
    const PREF = new Set(); if (key === 'is') { let on = false; for (const d of layout) { if (d.k === 'netIncomeCommon') on = false; if (on) PREF.add(d.k); if (d.k === 'netIncome') on = true; } }
    const nCols = withCmt ? 6 : 5;
    const itemsWord = (n) => (n === 1 ? (LANG === 'es' ? 'concepto' : 'item') : t('items'));
    const grpRow = (g, label, count) => `<tr class="grp-head"><td data-g="${g}"><span class="grp">${st.open[g] ? '▾' : '▸'}</span>${label}<span class="cnt">${count} ${itemsWord(count)}</span></td>${'<td></td>'.repeat(nCols - 1)}</tr>`;
    const rows = [];
    let inGroup = null, prefDone = false;
    const altTargets = new Set(layout.filter((d) => d.ngAlt).map((d) => d.ngAlt));
    for (let i = 0; i < layout.length; i++) {
      const def = layout[i];
      if (key === 'is') {
        if (inGroup && def.level !== 2) inGroup = null;
        if (PREF.has(def.k)) {
          if (!prefDone) { prefDone = true; rows.push(grpRow('pref', t('prefGroup'), PREF.size)); }
          if (!st.open.pref) continue;
        }
        if (st.ng && altTargets.has(def.k)) continue; // headline rows already show the Non-GAAP figure
      }
      if (def.group) { // group head: cost of revenues shows its own total; the Non-GAAP recon head is a label only
        const count = layout.slice(i + 1).findIndex((d) => d.level !== 2); const n = count < 0 ? layout.length - i - 1 : count;
        let va = get(A, B, def, 'a'), vb = get(B, A, def, 'b');
        const d = va != null && vb != null ? va - vb : null, pct = pctChange(va, vb);
        const f = (v) => (v == null ? '' : fmtM(v));
        rows.push(`<tr class="grp-head sub"><td data-g="${def.group}"><span class="grp">${st.open[def.group] ? '▾' : '▸'}</span>${L(def)}<span class="cnt">${n} ${itemsWord(n)}</span></td><td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${d == null ? '' : fmtM(d)}</td><td class="${cls(d)}">${pct == null ? '' : fmtPct(pct, 1, true)}</td>${withCmt ? `<td class="cmt">${C && C.lines[def.k] ? L(C.lines[def.k]) : ''}</td>` : ''}</tr>`);
        inGroup = def.group; continue;
      }
      if (inGroup && !st.open[inGroup]) continue;
      const va = get(A, B, def, 'a'), vb = get(B, A, def, 'b');
      if (va == null && vb == null) continue;
      const split = mismatch && (def.k === 'revCloud' || def.k === 'revSoftware');
      const d = !split && va != null && vb != null ? va - vb : null;
      const pct = d == null ? null : pctChange(va, vb);
      const isPct = def.pct, isPs = def.perShare, isCount = def.count;
      const f = (v) => (v == null ? '—' : isPct ? fmtPct(v) : isPs ? fmtN(v, 2) : isCount ? fmtN(v, 0) : fmtM(v));
      const fd = split ? `<span class="muted small">${t('basisDiffers')}</span>` : d == null ? '—' : isPct ? fmtN(d, 1) + ' pp' : isPs ? fmtN(d, 2) : fmtM(d);
      const label = L(def) + (st.ng && def.ngAlt ? ` <span class="muted small">${t('ng')}</span>` : '') + (split ? ' <span class="muted small">†</span>' : '');
      const cmtKey = st.ng && def.ngAlt ? def.ngAlt : def.k;
      const cmtObj = cmtOf(cmtKey) || cmtOf(def.k);
      const cmt = withCmt ? `<td class="cmt">${cmtObj ? L(cmtObj) : ''}</td>` : '';
      rows.push(`<tr class="${def.level === 0 ? 'bold' : def.level === 2 ? 'sub2' : def.level === 1 ? 'sub' : ''}"><td>${label}</td><td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${fd}</td><td class="${cls(d)}">${isPct ? '' : fmtPct(pct, 1, true)}</td>${cmt}</tr>`);
    }
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('stmtTable', `<table class="stmt-table"><thead><tr><th>${t('line')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th>${withCmt ? `<th class="cmt">${cmtHead(A, C)}</th>` : ''}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('stmtTitle').textContent = `${t(st.stmt)} · ${la} vs ${lb}`;
    let cap = `${t('usdM')}${st.stmt === 'is' ? ' · ' + (st.ng ? t('ng') : t('gaap')) : ''}${(A && A.derived) || (B && B.derived) ? (LANG === 'es' ? ' · periodos acumulados/UDM calculados a partir de trimestres reportados' : ' · YTD/LTM periods computed from reported quarters') : ''}`;
    if (withCmt) cap += ' · ' + (C ? t('cmtNote') : t('cmtOnlyYoy'));
    if (key === 'is' && (usedRecast.a || usedRecast.b)) cap += ' · ' + t('recastNote');
    else if (key === 'is' && A && B && (mismatch || (!onNew(A) && !onNew(B)))) cap += ' · † ' + t('legacyNote');
    el('stmtCap').textContent = cap;
    const srcs = [A, B].filter(Boolean).map((o) => o.sources && o.sources[key]).filter(Boolean);
    html('stmtSrc', `${t('src')}: ` + [...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => link(s)).join(' · ') + (C && C.call ? ' · ' + L(C.call) : ''));
    const first = Q[0], last = lastQ;
    html('stmtMeta', LANG === 'es'
      ? `Cobertura: ${Q.length} trimestres (${qLabel(first)} → ${qLabel(last)}), ${Y.length} años fiscales (${Y[0] ? fyLabel(Y[0].fy) : ''} → ${Y.length ? fyLabel(Y[Y.length - 1].fy) : ''}). Cifras en dólares nominales tal como las reporta Oracle, en millones; año fiscal al 31 de mayo.`
      : `Coverage: ${Q.length} quarters (${qLabel(first)} → ${qLabel(last)}), ${Y.length} fiscal years (${Y[0] ? fyLabel(Y[0].fy) : ''} → ${Y.length ? fyLabel(Y[Y.length - 1].fy) : ''}). Nominal US dollars as reported by Oracle, in millions; fiscal year ends 31 May.`);
    renderQuotes(A, B, C);
    renderOps(); renderRevMix(); renderKpiTable();
  }
  function renderQuotes(A, B, C) {
    const box = el('stmtQuotes'); if (!box) return;
    const qs = (C && C.quotes) || [];
    box.innerHTML = qs.length ? `<details class="tbl"><summary>${LANG === 'es' ? 'Citas de la administración' : 'Management quotes'} (${qs.length})</summary>${qs.map((q) => `<p class="quote">“${q.quote}”<span class="who">${q.speaker}${q.role ? ', ' + q.role : ''} · ${LANG === 'es' ? 'p.' : 'p.'} ${q.page}</span></p>`).join('')}</details>` : '';
  }
  // ---- Operating metrics card: Oracle's own drivers next to the statement, same A vs B controls.
  function opsFor(obj) {
    if (!obj || !obj.is) return null;
    const is = obj.is, cf = obj.cf || {}, kpi = obj.kpi || {};
    const rec = obj.basis === 'fy2026_lines' ? { revCloud: is.revCloud } : obj.recast ? { revCloud: obj.recast.revCloud } : (obj.kpi && obj.kpi.cloudRev != null ? { revCloud: obj.kpi.cloudRev } : null);
    return {
      rpo: kpi.rpo, rpoYoy: kpi.rpoYoyPct, cloudRev: rec ? rec.revCloud : null, cloudShare: rec && is.revTotal ? 100 * rec.revCloud / is.revTotal : null,
      ngOpMargin: is.ngOpMargin, ebitdaMargin: is.ebitdaMargin, daPct: is.da != null && is.revTotal ? 100 * is.da / is.revTotal : null,
      cfo: cf.cfo, capex: cf.capex != null ? -cf.capex : null, capexPct: cf.capex != null && is.revTotal ? 100 * -cf.capex / is.revTotal : null, fcf: cf.fcf,
      shares: is.dilutedShares, dps: kpi.dps, epsNg: is.ngEpsDiluted,
    };
  }
  function renderOps() {
    const opts = periodOptions();
    const A = (opts.find((o) => o.id === st.a) || {}).obj, B = (opts.find((o) => o.id === st.b) || {}).obj;
    const oa = opsFor(A), ob = opsFor(B);
    const C = yoyCommentsFor(A, B), ops = C && C.ops;
    const rows = [];
    const head = (label) => rows.push(`<tr class="head"><td colspan="6">${label}</td></tr>`);
    const row = (label, k, opt = {}) => {
      const va = oa ? oa[k] : null, vb = ob ? ob[k] : null;
      if (va == null && vb == null) return;
      const d = va != null && vb != null ? va - vb : null;
      const pct = opt.pct || d == null ? null : pctChange(va, vb);
      const f = (v) => (v == null ? '—' : opt.pct ? fmtPct(v) : opt.d != null ? fmtN(v, opt.d) : fmtM(v));
      const fd = d == null ? '—' : opt.pct ? fmtN(d, 1) + ' pp' : opt.d != null ? fmtN(d, opt.d) : fmtM(d);
      rows.push(`<tr class="${opt.cls || ''}"><td>${label}</td><td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${fd}</td><td class="${cls(d)}">${opt.pct ? '' : fmtPct(pct, 1, true)}</td><td class="cmt">${ops && ops[opt.ck || k] ? L(ops[opt.ck || k]) : ''}</td></tr>`);
    };
    head(LANG === 'es' ? 'Cartera y nube' : 'Backlog and cloud');
    row(t('rpo'), 'rpo', { cls: 'bold' });
    row(LANG === 'es' ? 'RPO, variación a/a declarada' : 'RPO, stated y/y change', 'rpoYoy', { pct: true, cls: 'sub' });
    row(t('cloudRev'), 'cloudRev', { ck: 'cloudRev' });
    row(t('cloudShare'), 'cloudShare', { pct: true, cls: 'sub' });
    head(LANG === 'es' ? 'Rentabilidad e inversión' : 'Profitability and investment');
    row(LANG === 'es' ? 'Margen operativo No-GAAP' : 'Non-GAAP operating margin', 'ngOpMargin', { pct: true });
    row(LANG === 'es' ? 'Margen EBITDA' : 'EBITDA margin', 'ebitdaMargin', { pct: true });
    row(LANG === 'es' ? 'D&A / ingresos' : 'D&A / revenue', 'daPct', { pct: true, cls: 'sub' });
    row(LANG === 'es' ? 'Flujo operativo (US$ M)' : 'Operating cash flow (US$ M)', 'cfo');
    row(LANG === 'es' ? 'Capex (US$ M)' : 'Capex (US$ M)', 'capex');
    row(LANG === 'es' ? 'Capex / ingresos' : 'Capex / revenue', 'capexPct', { pct: true, cls: 'sub' });
    row(LANG === 'es' ? 'Flujo libre (US$ M)' : 'Free cash flow (US$ M)', 'fcf', { cls: 'bold' });
    head(LANG === 'es' ? 'Por acción' : 'Per share');
    row(LANG === 'es' ? 'UPA diluida No-GAAP (US$)' : 'Non-GAAP diluted EPS (US$)', 'epsNg', { d: 2 });
    row(LANG === 'es' ? 'Dividendo declarado por acción (US$)' : 'Dividend declared per share (US$)', 'dps', { d: 2 });
    row(LANG === 'es' ? 'Acciones diluidas (millones)' : 'Diluted shares (millions)', 'shares', { d: 0 });
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('opsTable', `<table class="stmt-table"><thead><tr><th>${t('metric')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th><th class="cmt">${cmtHead(A, C)}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('opsTitle').textContent = `${t('ops')} · ${la} vs ${lb}`;
    el('opsCap').textContent = LANG === 'es'
      ? `RPO como lo publica Oracle en cada comunicado (redondeado a miles de millones). Ingresos de nube en la base de presentación del AF2026 (Nube / Software): nativos desde el 1T26, reexpresados por Oracle para el AF2025 y no disponibles antes. EBITDA = utilidad de operación GAAP + D&A del flujo de efectivo. ${C ? t('cmtNote') : t('cmtOnlyYoy')}`
      : `RPO as Oracle publishes it in each release (rounded to billions). Cloud revenue on the FY2026 presentation basis (Cloud / Software): native from 1Q26, recast by Oracle for FY2025 and unavailable earlier. EBITDA = GAAP operating income + cash-flow D&A. ${C ? t('cmtNote') : t('cmtOnlyYoy')}`;
    const srcs = [A, B].filter(Boolean).map((o) => o.sources && o.sources.is).filter(Boolean);
    html('opsSrc', srcs.length ? `${t('src')}: ` + [...new Map(srcs.map((x) => [x.url, x])).values()].map((x) => link(x)).join(' · ') + (C && C.call ? ' · ' + L(C.call) : '') : '');
    html('opsNote', LANG === 'es' ? 'RPO (obligaciones de desempeño restantes) = ingresos contratados aún no reconocidos; véase la sección 10.' : 'RPO (remaining performance obligations) = contracted revenue not yet recognised; see section 10.');
  }
  const rm = { view: 'q' };
  function renderRevMix() {
    const c = SERIES();
    const qs = Q.slice(-lastN()); // also feeds the margins chart below
    // Two views: the last 12 quarters (FY2026 basis: native from 1Q26, Oracle's recast for FY2025) or the last ten
    // fiscal years plus the trailing twelve months. In the fiscal-year view FY2024 and earlier are on Oracle's
    // pre-FY2026 captions (cloud services & license support / license), FY2025 onwards on Cloud / Software.
    let labels, rec, legacyMask;
    if (rm.view === 'fy') {
      const ys = Y.slice(-10);
      const l = ltmFor(lastQ);
      labels = ys.map((y) => fyLabel(y.fy)).concat(l ? [LANG === 'es' ? 'UDM' : 'LTM'] : []);
      rec = ys.map((y) => (y.recast ? { revCloud: y.recast.revCloud, revSoftware: y.recast.revSoftware, revHardware: y.recast.revHardware, revServices: y.recast.revServices } : { revCloud: y.is.revCloud, revSoftware: y.is.revSoftware, revHardware: y.is.revHardware, revServices: y.is.revServices })).concat(l ? [{ revCloud: l.is.revCloud, revSoftware: l.is.revSoftware, revHardware: l.is.revHardware, revServices: l.is.revServices }] : []);
      legacyMask = ys.map((y) => !(y.basis === 'fy2026_lines' || y.recast)).concat(l ? [false] : []);
      const firstNew = ys.find((y) => y.basis === 'fy2026_lines' || y.recast);
      el('revMixCap').textContent = LANG === 'es'
        ? `US$ millones por año fiscal (${fyLabel(ys[0].fy)} → ${fyLabel(ys[ys.length - 1].fy)}) y últimos doce meses. Hasta el ${firstNew ? fyLabel(firstNew.fy - 1) : '—'} las dos primeras series son las líneas originales de Oracle (servicios de nube y soporte / licencias); desde el ${firstNew ? fyLabel(firstNew.fy) : '—'}, Nube / Software (AF2025 según la reexpresión de Oracle). Los totales son comparables en toda la serie.`
        : `US$ million per fiscal year (${fyLabel(ys[0].fy)} → ${fyLabel(ys[ys.length - 1].fy)}) and last twelve months. Through ${firstNew ? fyLabel(firstNew.fy - 1) : '—'} the first two series are Oracle's original lines (cloud services & license support / license); from ${firstNew ? fyLabel(firstNew.fy) : '—'}, Cloud / Software (FY2025 per Oracle's recast). Totals are comparable across the whole series.`;
    } else {
      const onBasis = qs.filter((q) => revOnNewBasis(q));
      const use = onBasis.length >= 4 ? onBasis : qs;
      labels = use.map(qLabel);
      rec = use.map((q) => revOnNewBasis(q) || { revCloud: q.is.revCloud, revSoftware: q.is.revSoftware, revHardware: q.is.revHardware, revServices: q.is.revServices });
      legacyMask = use.map(() => false);
      el('revMixCap').textContent = LANG === 'es' ? `US$ millones por trimestre en la base Nube / Software del AF2026 (${qLabel(use[0])} → ${qLabel(use[use.length - 1])}; el AF2025 según la reexpresión de Oracle)` : `US$ million per quarter on the FY2026 Cloud / Software basis (${qLabel(use[0])} → ${qLabel(use[use.length - 1])}; FY2025 per Oracle's recast)`;
    }
    const totals = rec.map((r) => ['revCloud', 'revSoftware', 'revHardware', 'revServices'].reduce((a, k) => a + (r[k] || 0), 0));
    const anyLegacy = legacyMask.some(Boolean);
    const lbl = (newL, oldL) => (anyLegacy ? `${oldL} → ${newL}` : newL);
    mkChart('chartRevMix', { type: 'bar', data: { labels, datasets: [
      { label: lbl(t('cloud'), LANG === 'es' ? 'Servicios de nube y soporte' : 'Cloud services & support'), data: rec.map((r) => r.revCloud), backgroundColor: c[0], stack: 'r' },
      { label: lbl(t('software'), LANG === 'es' ? 'Licencias' : 'License'), data: rec.map((r) => r.revSoftware), backgroundColor: c[1], stack: 'r' },
      { label: t('hardware'), data: rec.map((r) => r.revHardware), backgroundColor: c[3], stack: 'r' },
      { label: t('services'), data: rec.map((r) => r.revServices), backgroundColor: c[6], stack: 'r' },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)} (${fmtPct(totals[x.dataIndex] ? 100 * x.parsed.y / totals[x.dataIndex] : null)} ${LANG === 'es' ? 'del total' : 'of total'})`, footer: (items) => `${t('total')}: ${fmtN(totals[items[0].dataIndex])}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    mkChart('chartMargin', { type: 'line', data: { labels: qs.map(qLabel), datasets: [
      { label: LANG === 'es' ? 'Margen operativo GAAP' : 'GAAP operating margin', data: qs.map((q) => q.is.opMargin), borderColor: c[0], backgroundColor: c[0], pointRadius: 3 },
      { label: LANG === 'es' ? 'Margen operativo No-GAAP' : 'Non-GAAP operating margin', data: qs.map((q) => q.is.ngOpMargin), borderColor: c[1], backgroundColor: c[1], pointRadius: 3 },
      { label: LANG === 'es' ? 'Margen EBITDA' : 'EBITDA margin', data: qs.map((q) => q.is.ebitdaMargin), borderColor: c[2], backgroundColor: c[2], pointRadius: 3, borderDash: [4, 3] },
    ] }, options: { plugins: { tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y)}` } }, legend: { display: true, position: 'top', align: 'end' } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, suggestedMin: 20, suggestedMax: 55 } } } });
    const src = qs[qs.length - 1] && qs[qs.length - 1].sources.is;
    html('revMixSrc', `${t('src')}: ${src ? link(src, t('release') + ' ↗') : ''}${rm.view === 'fy' ? ` · ${LANG === 'es' ? 'años anteriores: Formularios 10-K' : 'earlier years: Forms 10-K'}` : ''} · ${asOfQ()}`);
    html('marginSrc', `${t('src')}: ${src ? link(src, t('release') + ' ↗') : ''} (${LANG === 'es' ? '8-K, Anexo 99.1' : '8-K, Exhibit 99.1'}) · ${LANG === 'es' ? 'EBITDA = utilidad de operación GAAP + depreciación y amortización del flujo de efectivo' : 'EBITDA = GAAP operating income + cash-flow depreciation and amortization'} · ${asOfQ()}`);
  }
  function renderKpiTable() {
    const qs = Q.slice(-lastN());
    const yoy = (q, f) => { const p = qById[yoyQid(q)]; const a = f(q), b = p && f(p); return a != null && b ? 100 * (a / b - 1) : null; };
    const cloudOf = (q) => { const r = revOnNewBasis(q); return r ? r.revCloud : null; };
    const rowsDef = [
      { l: t('revenue') + ' (US$ M)', f: (q) => q.is.revTotal, fmt: (v) => fmtN(v) },
      { l: (LANG === 'es' ? 'Nube (US$ M, base AF2026)' : 'Cloud (US$ M, FY2026 basis)'), f: cloudOf, fmt: (v) => fmtN(v) },
      { l: 'RPO (US$ M)', f: (q) => q.kpi.rpo, fmt: (v) => fmtN(v) },
      { l: (LANG === 'es' ? 'Utilidad de operación GAAP (US$ M)' : 'GAAP operating income (US$ M)'), f: (q) => q.is.opIncome, fmt: (v) => fmtN(v) },
      { l: (LANG === 'es' ? 'Margen operativo No-GAAP' : 'Non-GAAP operating margin'), f: (q) => q.is.ngOpMargin, fmt: (v) => fmtPct(v), noYoy: true },
      { l: (LANG === 'es' ? 'UPA diluida GAAP (US$)' : 'GAAP diluted EPS (US$)'), f: (q) => q.is.epsDiluted, fmt: (v) => fmtN(v, 2) },
      { l: (LANG === 'es' ? 'UPA diluida No-GAAP (US$)' : 'Non-GAAP diluted EPS (US$)'), f: (q) => q.is.ngEpsDiluted, fmt: (v) => fmtN(v, 2) },
      { l: t('cfo') + ' (US$ M)', f: (q) => (q.cf ? q.cf.cfo : null), fmt: (v) => fmtN(v) },
      { l: t('capex') + ' (US$ M)', f: (q) => (q.cf && q.cf.capex != null ? -q.cf.capex : null), fmt: (v) => fmtN(v) },
      { l: t('fcf') + ' (US$ M)', f: (q) => (q.cf ? q.cf.fcf : null), fmt: (v) => fmtN(v), noYoy: true },
    ];
    const head = `<tr><th>${t('metric')}</th>${qs.map((q) => `<th>${qLabel(q)}</th>`).join('')}</tr>`;
    const body = rowsDef.map((r) => `<tr><td>${r.l}</td>${qs.map((q) => { const v = r.f(q); const y = r.noYoy ? null : yoy(q, r.f); return `<td>${r.fmt(v)}${y != null ? `<br><span class="small ${cls(y)}">${fmtPct(y, 1, true)}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
    html('kpiTable', `<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
    html('kpiSrc', `${t('src')}: ${LANG === 'es' ? 'comunicados de resultados de Oracle (8-K, Anexo 99.1) de cada trimestre' : "Oracle's earnings releases (8-K, Exhibit 99.1) for each quarter"} · ${relLink()} · ${LANG === 'es' ? 'a/a = mismo trimestre del año fiscal anterior' : 'y/y = same quarter of the prior fiscal year'} · ${asOfQ()}`);
  }

  // ================= 02 GUIDANCE =================
  const gNote = (v) => (LANG === 'es' && v.noteEs ? v.noteEs : v.note);
  const gCapexNote = (v) => (LANG === 'es' && v.items.fyCapexNoteEs ? v.items.fyCapexNoteEs : v.items.fyCapexNote);
  const GM = [
    { k: 'revGrowth', es: 'Crecimiento de ingresos totales (USD)', en: 'Total revenue growth (USD)', s: { es: 'Ingresos', en: 'Revenue' }, kind: 'growth', cc: 'revGrowthCc' },
    { k: 'cloudGrowth', es: 'Crecimiento de ingresos de nube (USD)', en: 'Cloud revenue growth (USD)', s: { es: 'Nube', en: 'Cloud' }, kind: 'growth', cc: 'cloudGrowthCc' },
    { k: 'epsNg', es: 'UPA diluida No-GAAP (US$)', en: 'Non-GAAP diluted EPS (US$)', s: { es: 'UPA', en: 'EPS' }, kind: 'eps', cc: 'epsNgCc' },
  ];
  const gs = { metric: 'revGrowth' };
  const gRange = (m, x) => { if (!x) return '—'; const f = (v) => (m.kind === 'eps' ? 'US$ ' + fmtN(v, 2) : fmtN(v, 0) + '%'); return `${f(x.lo)} ${LANG === 'es' ? 'a' : 'to'} ${f(x.hi)}`; };
  const gMid = (x) => (x ? (x.lo + x.hi) / 2 : null);
  const gActualFmt = (m, v) => (v == null ? '—' : m.kind === 'eps' ? 'US$ ' + fmtN(v, 2) : fmtPct(v, 1, true));
  const gStatus = (x, v) => (x == null || v == null ? null : v > x.hi + 1e-9 ? 'above' : v < x.lo - 1e-9 ? 'below' : 'within');
  const gChip = (c, txt) => `<span class="guide-chip ${c || ''}">${txt}</span>`;
  const gLink = (v, label) => (v.source && v.source.url ? `<a href="${v.source.url}" target="_blank" rel="noopener">${label || fmtDate(v.date)}</a>` : (label || fmtDate(v.date)) + (v.transcript ? ` <span class="muted small">(${t('fromCall')}${v.transcript.page ? ', p. ' + v.transcript.page : ''})</span>` : ''));
  function gActual(qid) { // reported result for a guided quarter, on the same basis as the guidance
    const q = qById[qid]; if (!q || !q.is) return null; const p = qById[yoyQid(q)];
    const rc = revOnNewBasis(q), rp = p ? revOnNewBasis(p) : null;
    return { revGrowth: p && p.is ? 100 * (q.is.revTotal / p.is.revTotal - 1) : null, cloudGrowth: rc && rp ? 100 * (rc.revCloud / rp.revCloud - 1) : null, epsNg: q.is.ngEpsDiluted };
  }
  function renderGuidance() {
    if (!GV.length) { html('guideCurrent', `<p class="muted small">${t('na')}</p>`); return; }
    const last = GV[GV.length - 1];
    const q = last.forQuarter ? (qById[last.forQuarter] || { fy: +last.forQuarter.slice(0, 4), q: +last.forQuarter.slice(5) }) : null;
    const act = last.forQuarter ? gActual(last.forQuarter) : null;
    el('guideCurTitle').textContent = `${LANG === 'es' ? 'Guía vigente' : 'Guidance in force'} · ${q ? qLabel(q) : '—'} · ${LANG === 'es' ? 'emitida el' : 'issued'} ${fmtDate(last.date)} (${LANG === 'es' ? 'con los resultados del' : 'with the'} ${qLabelId(last.issuedIn)}${LANG === 'es' ? '' : ' results'})`;
    el('guideCurCap').textContent = act ? (LANG === 'es' ? `Trimestre ya reportado: resultado frente a la guía.` : `Quarter already reported: result versus guidance.`) : (LANG === 'es' ? 'Rangos para el siguiente trimestre en dólares y a tipo de cambio constante (CC); el resultado se compara al reportarse.' : 'Ranges for the next quarter in USD and constant currency (CC); the result is compared when reported.');
    const rows = GM.map((m) => { const x = last.items[m.k], xc = last.items[m.cc]; const v = act ? act[m.k] : null; const sx = gStatus(x, v); return `<tr><td>${L(m)}</td><td>${gRange(m, x)}</td><td class="muted">${xc ? gRange(m, xc) + ' CC' : '—'}</td><td><b>${gActualFmt(m, v)}</b></td><td>${sx ? gChip(sx, t(sx)) : ''}</td></tr>`; });
    html('guideCurrent', `<table class="guide-table"><thead><tr><th>${t('metric')}</th><th>${LANG === 'es' ? 'Guía (USD)' : 'Guidance (USD)'}</th><th>CC</th><th>${t('actual')}</th><th>${t('tracking')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    // ---- fiscal-year targets: initial vs latest for the most recent guided fiscal year
    const fyV = GV.filter((v) => v.items.fyRevenue || v.items.fyEps);
    const fyCur = fyV.length ? Math.max(...fyV.map((v) => v.fyGuided).filter(Boolean)) : null;
    const cur = fyV.filter((v) => v.fyGuided === fyCur);
    if (cur.length) {
      const first = cur[0], lastV = cur[cur.length - 1];
      const ytdQs = Q.filter((x) => x.fy === fyCur);
      const ytdRev = ytdQs.reduce((a, x) => a + x.is.revTotal, 0), ytdEps = ytdQs.reduce((a, x) => a + (x.is.ngEpsDiluted || 0), 0);
      const fyDone = Y.find((y) => y.fy === fyCur);
      const rowsFy = [
        { l: LANG === 'es' ? `Ingresos totales ${fyLabel(fyCur)} (US$ M)` : `${fyLabel(fyCur)} total revenue (US$ M)`, a: first.items.fyRevenue && first.items.fyRevenue.usdM, b: lastV.items.fyRevenue && lastV.items.fyRevenue.usdM, f: (v) => (v == null ? '—' : '≥ ' + fmtN(v)), act: fyDone ? fyDone.is.revTotal : ytdRev, actL: fyDone ? fyLabel(fyCur) : ytdLabel(fyCur, ytdQs.length * 3) },
        { l: LANG === 'es' ? `UPA No-GAAP ${fyLabel(fyCur)} (US$)` : `${fyLabel(fyCur)} Non-GAAP EPS (US$)`, a: first.items.fyEps && first.items.fyEps.usd, b: lastV.items.fyEps && lastV.items.fyEps.usd, f: (v) => (v == null ? '—' : fmtN(v, 2)), act: fyDone ? fyDone.is.ngEpsDiluted : ytdEps, actL: fyDone ? fyLabel(fyCur) : ytdLabel(fyCur, ytdQs.length * 3), eps: true },
      ];
      const body = rowsFy.map((r) => { const d = r.a != null && r.b != null ? 100 * (r.b / r.a - 1) : null; const pace = r.act != null && r.b ? 100 * r.act / r.b : null; return `<tr><td>${r.l}</td><td>${r.f(r.a)}<span class="sub">${fmtDate(first.date)}</span></td><td>${r.f(r.b)}<span class="sub">${fmtDate(lastV.date)}</span></td><td class="${cls(d)}">${d == null ? '—' : fmtPct(d, 1, true)}</td><td><b>${r.eps ? fmtN(r.act, 2) : fmtN(r.act)}</b><span class="sub">${r.actL}</span></td><td>${pace != null ? gChip('', `${fmtPct(pace, 0)} ${LANG === 'es' ? (fyDone ? 'de la guía' : 'del año guiado') : (fyDone ? 'of guidance' : 'of guided year')}`) : ''}</td></tr>`; }).join('');
      const capexNote = [...cur].reverse().find((v) => v.items.fyCapexNote);
      html('guideFy', `<table class="guide-table" style="margin-top:14px"><thead><tr><th>${LANG === 'es' ? 'Objetivo anual' : 'Full-year target'}</th><th>${t('initial')}</th><th>${cur.length > 1 ? t('revised') : t('initial')}</th><th>${t('change')}</th><th>${t('actual')}</th><th>${LANG === 'es' ? 'Avance' : 'Pace'}</th></tr></thead><tbody>${body}${capexNote ? `<tr><td>${LANG === 'es' ? 'Capex (en palabras de la administración)' : 'Capex (in management\'s words)'}</td><td colspan="5" class="cmt" style="text-align:left;white-space:normal">${gCapexNote(capexNote)}</td></tr>` : ''}</tbody></table>`);
    } else html('guideFy', '');
    const quotes = [];
    for (const v of [last, ...cur.filter((v) => v !== last)]) { if (gNote(v)) quotes.push(`<p class="guide-quote">${gNote(v)} <span class="muted small">— ${gLink(v)}</span></p>`); if (v.multiYear && v.multiYear.note) quotes.push(`<p class="guide-quote">${LANG === 'es' && v.multiYear.note_es ? v.multiYear.note_es : v.multiYear.note} <span class="muted small">— ${gLink(v)}</span></p>`); }
    html('guideText', quotes.join('')); el('guideTextWrap').hidden = !quotes.length;
    html('guideCurSrc', `${t('src')}: ` + [last, ...cur].filter((v, i, a) => a.indexOf(v) === i).map((v) => gLink(v, `${v.source && v.source.url ? t('release') : (LANG === 'es' ? 'transcripción de la llamada' : 'call transcript')} (${fmtDate(v.date)})`)).join(' · '));

    // ---- six-quarter history: what was guided with each report, changes shaded
    const cols = GV.slice(-6);
    const fyOf = (v) => v.items.fyRevenue || v.items.fyEps ? v.fyGuided : null;
    const hHead = `<tr><th>${t('metric')}</th>${cols.map((v) => `<th>${qLabelId(v.issuedIn)}<span class="sub">${fmtDate(v.date)}</span></th>`).join('')}</tr>`;
    const rFor = `<tr class="bold"><td>${t('guideFor')}</td>${cols.map((v) => `<td>${v.forQuarter ? qLabelId(v.forQuarter) : '—'}</td>`).join('')}</tr>`;
    const cell = (m, v, i) => { const now = v.items[m.k]; const prev = cols[i - 1] && cols[i - 1].items[m.k]; return `<td>${gRange(m, now)}${prev && now && (prev.lo !== now.lo || prev.hi !== now.hi) ? `<span class="sub">${LANG === 'es' ? 'antes' : 'was'} ${gRange(m, prev)}</span>` : ''}</td>`; };
    const rM = GM.map((m) => `<tr><td>${L(m)}</td>${cols.map((v, i) => cell(m, v, i)).join('')}</tr>`).join('');
    const fyRow = (label, get, fmt) => `<tr><td>${label}</td>${cols.map((v, i) => { const now = get(v), p = cols[i - 1] ? get(cols[i - 1]) : null; const sameFy = cols[i - 1] && fyOf(cols[i - 1]) === fyOf(v); const changed = now != null && p != null && sameFy && now !== p; return `<td class="${changed ? 'chg' : ''}">${now == null ? '—' : fmt(now)}${fyOf(v) ? `<span class="sub">${fyLabel(fyOf(v))}</span>` : ''}${changed ? `<span class="was">${fmt(p)}</span>` : ''}</td>`; }).join('')}</tr>`;
    const rSt = `<tr><td>${t('guideStatus')}</td>${cols.map((v, i) => { const p = cols[i - 1]; const same = p && fyOf(p) === fyOf(v) && JSON.stringify(p.items.fyRevenue) === JSON.stringify(v.items.fyRevenue) && JSON.stringify(p.items.fyEps) === JSON.stringify(v.items.fyEps); return `<td>${fyOf(v) ? (p && fyOf(p) === fyOf(v) ? (same ? gChip('', t('unchanged')) : gChip('event', t('revised'))) : gChip('event', t('issued'))) : gChip('', LANG === 'es' ? 'solo trimestral' : 'quarter only')}${v.fromTranscript && v.fromTranscript.length ? `<span class="sub">${t('fromCall')}</span>` : ''}</td>`; }).join('')}</tr>`;
    html('guideHistory', `<table class="guide-table"><thead>${hHead}</thead><tbody>${rFor}${rM}${fyRow(LANG === 'es' ? 'Ingresos anuales (US$ M)' : 'Full-year revenue (US$ M)', (v) => (v.items.fyRevenue ? v.items.fyRevenue.usdM : null), (x) => '≥ ' + fmtN(x))}${fyRow(LANG === 'es' ? 'UPA No-GAAP anual (US$)' : 'Full-year Non-GAAP EPS (US$)', (v) => (v.items.fyEps ? v.items.fyEps.usd : null), (x) => fmtN(x, 2))}${rSt}</tbody></table>`);
    html('guideHistSrc', `${t('src')}: ` + cols.map((v) => gLink(v, `${qLabelId(v.issuedIn)}`)).join(' · '));

    // ---- track record by quarter
    const rec = GV.filter((v) => v.forQuarter && qById[v.forQuarter] && qById[v.forQuarter].is).slice(-12).reverse();
    const rHead = `<tr><th>${t('guideFor')}</th>${GM.map((m) => `<th>${L(m.s)}</th>`).join('')}<th>${t('hits')}</th></tr>`;
    const rRows = rec.map((v) => { const a = gActual(v.forQuarter); let hit = 0, n = 0; const cells = GM.map((m) => { const x = v.items[m.k], val = a ? a[m.k] : null; const sx = gStatus(x, val); if (sx) { n++; if (sx !== 'below') hit++; } return `<td class="${sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : ''}"><b>${gActualFmt(m, val)}</b><span class="sub">${LANG === 'es' ? 'guía' : 'guided'} ${gRange(m, x)}</span></td>`; }); return `<tr><td>${qLabelId(v.forQuarter)}<span class="sub">${LANG === 'es' ? 'guía del' : 'guided'} ${fmtDate(v.date)}</span></td>${cells.join('')}<td><b>${hit}/${n}</b></td></tr>`; });
    html('guideRecord', `<table><thead>${rHead}</thead><tbody>${rRows.join('')}</tbody></table>`);
    html('guideRecordSrc', `${t('src')}: ${LANG === 'es' ? 'guía de cada comunicado o transcripción (enlaces en la tabla de vintages); resultado real del comunicado del trimestre guiado' : 'guidance from each release or transcript (links in the vintages table); actuals from the guided quarter\'s release'} · ${relLink()} · ${asOfQ()}`);

    // ---- every vintage
    const aHead = `<tr><th>${t('date')}</th><th>${LANG === 'es' ? 'Con resultados del' : 'With results of'}</th><th>${t('guideFor')}</th>${GM.map((m) => `<th>${L(m.s)}</th>`).join('')}<th>${LANG === 'es' ? 'Año fiscal' : 'Fiscal year'}</th><th>${t('src')}</th></tr>`;
    const aRows = GV.slice().reverse().map((v) => `<tr><td>${fmtDate(v.date)}</td><td>${qLabelId(v.issuedIn)}</td><td>${v.forQuarter ? qLabelId(v.forQuarter) : '—'}</td>${GM.map((m) => `<td>${gRange(m, v.items[m.k])}</td>`).join('')}<td>${v.items.fyRevenue ? `${fyLabel(v.fyGuided)} ≥ ${fmtN(v.items.fyRevenue.usdM)}` : ''}${v.items.fyEps ? ` · EPS ${fmtN(v.items.fyEps.usd, 2)}` : ''}</td><td>${gLink(v, v.source && v.source.url ? '↗' : t('fromCall'))}</td></tr>`);
    html('guideAll', `<table><thead>${aHead}</thead><tbody>${aRows.join('')}</tbody></table>`);
    renderGuideChart();
  }
  function renderGuideChart() {
    const m = GM.find((x) => x.k === gs.metric); if (!m || !GV.length) return;
    const vs = GV.filter((v) => v.forQuarter && v.items[m.k]).slice(-10);
    const c = SERIES();
    const acts = vs.map((v) => gActual(v.forQuarter));
    mkChart('chartGuide', { type: 'bar', data: { labels: vs.map((v) => qLabelId(v.forQuarter)), datasets: [
      { type: 'bar', label: LANG === 'es' ? 'Rango guiado (USD)' : 'Guided range (USD)', data: vs.map((v) => [v.items[m.k].lo, v.items[m.k].hi]), backgroundColor: c[3], borderWidth: 0 },
      { type: 'line', label: t('actual'), data: vs.map((v, i) => (acts[i] ? acts[i][m.k] : null)), showLine: false, pointRadius: 6, pointHoverRadius: 7, borderColor: c[1], backgroundColor: c[1], pointBackgroundColor: c[1], pointBorderColor: c[1] },
    ] }, options: {
      plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => { const raw = x.raw; if (Array.isArray(raw)) return `${x.dataset.label}: ${gRange(m, { lo: raw[0], hi: raw[1] })}`; return `${x.dataset.label}: ${gActualFmt(m, raw)}`; } } } },
      scales: { x: { grid: { display: false } }, y: { ticks: m.kind === 'eps' ? { callback: (v) => fmtN(v, 2) } : { callback: (v) => v + '%' }, beginAtZero: m.kind !== 'eps' } },
      datasets: { bar: { maxBarThickness: 28 } },
    } });
    const lastV = GV[GV.length - 1];
    html('guideChartSrc', `${t('src')}: ${LANG === 'es' ? 'comunicados y transcripciones (guía) e informes trimestrales (real); crecimiento de nube comparado en la base Nube / Software del AF2026' : 'releases and transcripts (guidance) and quarterly reports (actual); cloud growth compared on the FY2026 Cloud / Software basis'} · ${gLink(lastV, `${LANG === 'es' ? 'última guía' : 'latest guidance'} ↗`)} · ${asOfQ()}`);
  }

  // ================= 03 OPERATING (RPO & CLOUD) =================
  const op = { metric: 'rpo' };
  function renderOperating() {
    const qs = Q.slice(-lastN()); const c = SERIES();
    const defs = {
      rpo: { l: 'RPO (US$ M)', f: (q) => q.kpi.rpo, cap: { es: 'Obligaciones de desempeño restantes al cierre de cada trimestre, US$ millones (Oracle las publica redondeadas a miles de millones); línea = variación a/a declarada', en: 'Remaining performance obligations at each quarter-end, US$ million (Oracle publishes them rounded to billions); line = stated y/y change' } },
      cloud: { l: t('cloudRev'), f: (q) => { const r = revOnNewBasis(q); return r ? r.revCloud : null; }, cap: { es: 'Ingresos de nube por trimestre en la base AF2026 (Nube / Software); antes del 1T25 no existe reexpresión pública', en: 'Cloud revenue per quarter on the FY2026 basis (Cloud / Software); no public recast exists before 1Q25' } },
      capex: { l: t('capex') + ' (US$ M)', f: (q) => (q.cf && q.cf.capex != null ? -q.cf.capex : null), cap: { es: 'Gasto de capital por trimestre, US$ millones (trimestres discretos derivados de los estados de flujo acumulados)', en: 'Capital expenditure per quarter, US$ million (discrete quarters derived from the cumulative cash-flow statements)' } },
      fcf: { l: t('fcf') + ' (US$ M)', f: (q) => (q.cf ? q.cf.fcf : null), cap: { es: 'Flujo libre = flujo operativo − capex, US$ millones por trimestre', en: 'Free cash flow = operating cash flow − capex, US$ million per quarter' } },
    };
    const d = defs[op.metric];
    const vals = qs.map(d.f);
    const yoy = qs.map((q) => { const p = qById[yoyQid(q)]; const a = d.f(q), b = p && d.f(p); return op.metric === 'rpo' ? (q.kpi.rpoYoyPct != null ? q.kpi.rpoYoyPct : (a != null && b ? 100 * (a / b - 1) : null)) : (a != null && b && b > 0 ? 100 * (a / b - 1) : null); });
    mkChart('chartOps', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { type: 'bar', label: d.l, data: vals, backgroundColor: vals.map((v) => (v != null && v < 0 ? c[7] : c[0])), yAxisID: 'y' },
      { type: 'line', label: t('yoy') + ' %', data: yoy, borderColor: c[1], backgroundColor: c[1], pointRadius: 3, yAxisID: 'y2', spanGaps: true },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => (x.dataset.yAxisID === 'y2' ? `${x.dataset.label}: ${fmtPct(x.parsed.y, 1, true)}` : `${x.dataset.label}: ${fmtN(x.parsed.y)}`) } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => v + '%' } } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    el('opsChartTitle').textContent = d.l; el('opsChartCap').textContent = L(d.cap);
    html('opsChartSrc', `${t('src')}: ${LANG === 'es' ? 'comunicados de resultados de Oracle de cada trimestre' : "Oracle's earnings releases for each quarter"} · ${relLink()} · ${asOfQ()}`);
    // latest-quarter table across all drivers
    const q = lastQ, p = qById[yoyQid(q)], pq = qById[prevQid(q)];
    const rows = [['rpo', 'RPO (US$ M)', 0], ['cloud', t('cloudRev'), 0], ['capex', t('capex') + ' (US$ M)', 0], ['fcf', t('fcf') + ' (US$ M)', 0]].map(([k, l, dd]) => { const f = defs[k].f; const v = f(q), vp = p && f(p), vq = pq && f(pq); const yy = k === 'rpo' && q.kpi.rpoYoyPct != null ? q.kpi.rpoYoyPct : (v != null && vp && vp > 0 ? 100 * (v / vp - 1) : null); const qq = v != null && vq && vq > 0 ? 100 * (v / vq - 1) : null; return `<tr><td>${l}</td><td>${fmtN(v, dd)}</td><td>${fmtN(vq, dd)}</td><td class="${cls(qq)}">${fmtPct(qq, 1, true)}</td><td>${fmtN(vp, dd)}</td><td class="${cls(yy)}">${fmtPct(yy, 1, true)}</td></tr>`; }).join('');
    const rc = revOnNewBasis(q);
    html('opsQTable', `<table><thead><tr><th>${t('metric')}</th><th>${qLabel(q)}</th><th>${pq ? qLabel(pq) : '—'}</th><th>${t('qoq')}</th><th>${p ? qLabel(p) : '—'}</th><th>${t('yoy')}</th></tr></thead><tbody>${rows}<tr><td>${t('cloudShare')}</td><td>${rc ? fmtPct(100 * rc.revCloud / q.is.revTotal) : '—'}</td><td>${pq && revOnNewBasis(pq) ? fmtPct(100 * revOnNewBasis(pq).revCloud / pq.is.revTotal) : '—'}</td><td></td><td>${p && revOnNewBasis(p) ? fmtPct(100 * revOnNewBasis(p).revCloud / p.is.revTotal) : '—'}</td><td></td></tr><tr><td>${LANG === 'es' ? 'Capex / ingresos' : 'Capex / revenue'}</td><td>${fmtPct(q.cf ? q.cf.capexToRevenue : null)}</td><td>${fmtPct(pq && pq.cf ? pq.cf.capexToRevenue : null)}</td><td></td><td>${fmtPct(p && p.cf ? p.cf.capexToRevenue : null)}</td><td></td></tr></tbody></table>`);
    el('opsTblCap').textContent = LANG === 'es' ? `${qLabel(q)} frente al trimestre anterior y al mismo trimestre del año fiscal previo; RPO a/a como lo declara Oracle` : `${qLabel(q)} versus the prior quarter and the same quarter of the prior fiscal year; RPO y/y as stated by Oracle`;
    html('opsTblSrc', `${t('src')}: ${srcLine([q.sources && q.sources.is && { title: `${qLabel(q)} ${t('release')}`, url: q.sources.is.url }, pq && pq.sources && pq.sources.is && { title: `${qLabel(pq)} ${t('release')}`, url: pq.sources.is.url }, p && p.sources && p.sources.is && { title: `${qLabel(p)} ${t('release')}`, url: p.sources.is.url }])} · ${asOfQ()}`);
    const withRpo = Q.filter((x) => x.kpi.rpo != null);
    html('opsMeta', LANG === 'es' ? `Cobertura: RPO publicado desde ${withRpo.length ? qLabel(withRpo[0]) : '—'} (${withRpo.length} trimestres); nube en base AF2026 desde ${Q.find((x) => revOnNewBasis(x)) ? qLabel(Q.find((x) => revOnNewBasis(x))) : '—'}; capex y flujo libre en los ${Q.length} trimestres.` : `Coverage: RPO published from ${withRpo.length ? qLabel(withRpo[0]) : '—'} (${withRpo.length} quarters); cloud on the FY2026 basis from ${Q.find((x) => revOnNewBasis(x)) ? qLabel(Q.find((x) => revOnNewBasis(x))) : '—'}; capex and free cash flow for all ${Q.length} quarters.`);
  }

  // ================= 03b BUILDOUT: capacity, GPUs, sites =================
  const BO = window.ORCL_BUILDOUT || null;
  const boQ = (id) => qById[String(id).replace(/^FY/, '')];
  const boLabel = (id) => { const q = boQ(id); return q ? qLabel(q) : id; };
  const callRef = (id, page) => `${boLabel(id)} ${LANG === 'es' ? 'llamada' : 'call'} p.${page}`;
  const srcLine = (refs) => [...refs.filter(Boolean).reduce((m, r) => (m.has(r.url || r.title) ? m : m.set(r.url || r.title, r)), new Map()).values()].map((r) => (r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${r.title} ↗</a>` : r.title)).join(' · ');
  function renderBuildout() {
    if (!BO) return; const c = SERIES();
    const cap = BO.capacity || { quarters: [] };
    const cq = cap.quarters || [];
    const approxMark = (x) => (x.derived ? (LANG === 'es' ? ' (derivado)' : ' (derived)') : x.approx ? ' (≈)' : '');
    let cum = 0; const cumul = cq.map((x) => (cum += x.mw));
    mkChart('chartCapacity', { type: 'bar', data: { labels: cq.map((x) => boLabel(x.id)), datasets: [
      { type: 'bar', label: LANG === 'es' ? 'MW entregados en el trimestre' : 'MW delivered in the quarter', data: cq.map((x) => x.mw), backgroundColor: cq.map((x) => (x.derived ? alpha(c[0], 0.45) : c[0])), yAxisID: 'y' },
      { type: 'line', label: LANG === 'es' ? 'Acumulado desde el 2T26' : 'Cumulative since 2Q26', data: cumul, borderColor: c[1], backgroundColor: c[1], yAxisID: 'y' },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)} MW${x.dataset.type === 'bar' ? approxMark(cq[x.dataIndex]) : ''}`, afterBody: (items) => { const x = cq[items[0].dataIndex]; return x.text ? [`“${x.text}” — ${x.speaker}, p.${x.page}`] : []; } } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v) + ' MW' }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 40, borderWidth: 0 } } } });
    const rpo = lastQ ? lastQ.kpi.rpo : null; const sched = BO.rpoSchedule;
    const fy = (cap.fiscal_years || [])[0]; const last = cq[cq.length - 1]; const sec = cap.secured;
    const sinceSecured = sec ? cq.filter((x) => boQ(x.id) && boQ(sec.as_of) && (boQ(x.id).fy * 10 + boQ(x.id).q) >= (boQ(sec.as_of).fy * 10 + boQ(sec.as_of).q)).reduce((a, x) => a + x.mw, 0) : null;
    const pending = sec && sinceSecured != null ? sec.gw * 1000 - sinceSecured : null;
    const sitesMw = (BO.sites || []).reduce((a, s) => a + (s.capacity_mw || 0), 0);
    const rows = [];
    if (rpo != null) rows.push([LANG === 'es' ? 'RPO contratado (US$ mil M)' : 'Contracted RPO (US$ bn)', fmtN(rpo / 1000), sched ? sched.buckets.map((b) => `${L(b)} ${b.pct}% ≈ US$ ${fmtN(rpo / 1000 * b.pct / 100)} bn`).join(' · ') : '', lastQ ? qLabel(lastQ) : '']);
    const quoteOf = (x) => (x.text ? `“${x.text}”${x.speaker ? ` — ${x.speaker.split(' ').slice(-1)[0]}` : ''}${x.page ? `, p.${x.page}` : ''}` : '');
    if (fy) rows.push([LANG === 'es' ? 'Capacidad entregada, AF2026 (MW)' : 'Capacity delivered, FY2026 (MW)', '> ' + fmtN(fy.mw), quoteOf(fy), fyLabel(2026)]);
    if (last) rows.push([LANG === 'es' ? `Capacidad entregada, ${boLabel(last.id)} (MW)` : `Capacity delivered, ${boLabel(last.id)} (MW)`, fmtN(last.mw), quoteOf(last), boLabel(last.id)]);
    if (sec) rows.push([LANG === 'es' ? 'Capacidad asegurada vía socios, próximos 3 años (GW)' : 'Capacity secured through partners, next 3 years (GW)', '> ' + fmtN(sec.gw), quoteOf(sec), boLabel(sec.as_of)]);
    if (pending != null) rows.push([LANG === 'es' ? 'Capacidad pendiente de entrega (GW, derivado)' : 'Capacity pending delivery (GW, derived)', '≈ ' + fmtN(pending / 1000, 1), LANG === 'es' ? `> 10 GW asegurados menos los ${fmtN(sinceSecured)} MW entregados desde el ${boLabel(sec.as_of)}` : `> 10 GW secured less the ${fmtN(sinceSecured)} MW delivered since ${boLabel(sec.as_of)}`, lastQ ? qLabel(lastQ) : '']);
    if (sitesMw) rows.push([LANG === 'es' ? 'Sitios nombrados (capacidad planeada, GW)' : 'Named sites (planned capacity, GW)', '≈ ' + fmtN(sitesMw / 1000, 1), (BO.sites || []).map((s) => s.name.split(' (')[0]).join(', '), LANG === 'es' ? 'ver tabla' : 'see table']);
    html('capacityTable', `<table><thead><tr><th>${t('metric')}</th><th>${LANG === 'es' ? 'Valor' : 'Value'}</th><th>${LANG === 'es' ? 'Cita textual de la llamada (en inglés)' : 'As stated on the call'}</th><th>${LANG === 'es' ? 'Al' : 'As of'}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td class="small muted">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    // Headline tiles: demand (RPO), supply delivered, supply secured / pending.
    const cumAll = cq.reduce((a, x) => a + x.mw, 0);
    html('buildCapStats', [
      rpo != null && { v: `US$ ${fmtN(rpo / 1000)} bn`, l: `${LANG === 'es' ? 'demanda contratada (RPO)' : 'contracted demand (RPO)'} · ${lastQ ? qLabel(lastQ) : ''}${sched ? ` · ${sched.buckets[0].pct}% ${LANG === 'es' ? 'en 12 meses' : 'within 12 months'}` : ''}` },
      last && { v: `${fmtN(last.mw)} MW`, l: `${LANG === 'es' ? 'entregados en el' : 'delivered in'} ${boLabel(last.id)}${fy ? ` · > ${fmtN(fy.mw / 1000, 1)} GW ${LANG === 'es' ? 'en el AF2026' : 'in FY2026'}` : ''}` },
      cumAll && { v: `${fmtN(cumAll / 1000, 2)} GW`, l: LANG === 'es' ? `entregados desde el ${boLabel(cq[0].id)} (acumulado de las llamadas)` : `delivered since ${boLabel(cq[0].id)} (cumulative from the calls)` },
      sec && { v: `> ${fmtN(sec.gw)} GW`, l: `${LANG === 'es' ? 'asegurados vía socios, 3 años' : 'secured through partners, 3 years'} · ${boLabel(sec.as_of)}${pending != null ? ` · ≈ ${fmtN(pending / 1000, 1)} GW ${LANG === 'es' ? 'pendientes (derivado)' : 'pending (derived)'}` : ''}` },
    ].filter(Boolean).map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    // Oracle's stated capacity commitments, newest call first, with a staleness flag against the latest quarter.
    const pr = BO.promises; const prItems = (pr && pr.items) || [];
    const stale = pr && lastQ && boQ(pr.as_of) && (boQ(pr.as_of).fy * 10 + boQ(pr.as_of).q) < (lastQ.fy * 10 + lastQ.q);
    html('capPromises', `<b>${LANG === 'es' ? 'Lo que Oracle ha prometido entregar' : 'What Oracle has committed to deliver'}</b> <span class="muted small">(${LANG === 'es' ? 'según las llamadas hasta el' : 'per the calls through'} ${pr ? boLabel(pr.as_of) : '—'})</span>${stale ? `<div class="notice warn" style="margin:8px 0">${LANG === 'es' ? `Pendiente de actualizar con la llamada del ${qLabel(lastQ)}.` : `Pending update from the ${qLabel(lastQ)} call.`}</div>` : ''}<ul style="margin:8px 0 0;padding-left:18px">${prItems.map((x) => `<li><b>${boLabel(x.id)}</b> · ${L(x)}${x.outcome_en ? ` <span class="pos">→ ${L({ en: x.outcome_en, es: x.outcome_es })}</span>` : ''} <span class="muted small">(${x.speaker ? x.speaker.split(' ').slice(-1)[0] + ', ' : ''}${x.sourceRef && x.sourceRef.url ? `<a href="${x.sourceRef.url}" target="_blank" rel="noopener">p.${x.page}</a>` : `p.${x.page}`})</span></li>`).join('')}</ul>`);
    el('buildCapCap').textContent = (LANG === 'es' ? 'Lo contratado (RPO, en dólares) frente a lo entregado (megavatios) y lo que falta por entregar. ' : 'What is contracted (RPO, in dollars) against what has been delivered (megawatts) and what remains. ') + L({ es: cap.note_es, en: cap.note_en });
    html('buildCapNote', LANG === 'es' ? `<b>Lectura.</b> El RPO es la demanda contratada en dólares; la capacidad entregada en megavatios es la oferta que la convierte en ingreso. Oracle no publica una cifra única de capacidad contratada pendiente: la fila "pendiente" resta lo entregado a los más de 10 GW que dijo tener asegurados en el 3T26, y las barras marcadas como derivadas se calculan con las razones que dio la administración.` : `<b>Reading it.</b> RPO is contracted demand in dollars; capacity delivered in megawatts is the supply that turns it into revenue. Oracle publishes no single figure for contracted capacity still to deliver: the "pending" row subtracts deliveries from the 10+ GW it said it had secured at 3Q26, and bars marked derived are computed from ratios management gave.`);
    html('buildCapSrc', `${t('src')}: ${srcLine([...cq.map((x) => x.sourceRef && { title: callRef(x.id, x.page), url: x.sourceRef.url }), fy && fy.sourceRef && { title: callRef('FY2026Q4', fy.page), url: fy.sourceRef.url }, sec && sec.sourceRef && { title: callRef('FY2026Q3', sec.page), url: sec.sourceRef.url }])} · ${relLink()} (RPO) · ${asOfQ()}`);
    // GPUs delivered
    const gd = (BO.gpu.delivered || []).filter((x) => x.gpus_quarter != null);
    mkChart('chartGpuDelivered', { type: 'bar', data: { labels: gd.map((x) => `${x.site === 'all' ? (LANG === 'es' ? 'Todos los sitios' : 'All sites') : x.site} ${boLabel(x.id)}${x.derived ? '*' : ''}`), datasets: [{ label: LANG === 'es' ? 'GPU entregadas en el trimestre' : 'GPUs delivered in the quarter', data: gd.map((x) => x.gpus_quarter), backgroundColor: gd.map((x) => (x.derived ? alpha(c[0], 0.45) : x.site === 'all' ? c[6] : c[0])) }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `${fmtN(x.parsed.y)} GPUs${gd[x.dataIndex].derived ? (LANG === 'es' ? ' (derivado)' : ' (derived)') : ''}`, afterBody: (items) => { const x = gd[items[0].dataIndex]; return x.text ? [`“${x.text}” — ${x.speaker}, p.${x.page}`] : []; } } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, font: { size: 11 } } }, y: { ticks: { callback: (v) => fmtN(v / 1000) + 'k' }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 44, borderWidth: 0 } } } });
    const cumAb = (BO.gpu.delivered || []).find((x) => x.gpus_cumulative != null);
    el('gpuDelCap').textContent = (LANG === 'es' ? 'GPU entregadas a clientes por trimestre según las llamadas; * = derivado de la razón que dio Oracle (1T27 = 1.9x el 4T26 en Abilene). ' : 'GPUs delivered to customers per quarter as stated on the calls; * = derived from Oracle\'s ratio (1Q27 = 1.9x 4Q26 at Abilene). ') + (cumAb ? (LANG === 'es' ? `Antes: más de ${fmtN(cumAb.gpus_cumulative)} GB200 acumuladas en Abilene al ${boLabel(cumAb.id)}.` : `Earlier: more than ${fmtN(cumAb.gpus_cumulative)} GB200s cumulative at Abilene by ${boLabel(cumAb.id)}.`) : '');
    html('gpuDelSrc', `${t('src')}: ${srcLine((BO.gpu.delivered || []).map((x) => x.sourceRef && { title: callRef(x.id, x.page), url: x.sourceRef.url }))} · ${irLink()} · ${gd.length ? `${LANG === 'es' ? 'al' : 'as of'} ${boLabel(gd[gd.length - 1].id)}` : ''}`);
    // Utilization + renewals
    const gu = BO.gpu.utilization || [];
    mkChart('chartGpuUtil', { type: 'bar', data: { labels: gu.map((x) => boLabel(x.id)), datasets: [{ label: LANG === 'es' ? 'Utilización de GPU' : 'GPU utilization', data: gu.map((x) => x.pct), backgroundColor: c[2] }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `${fmtPct(x.parsed.y)}`, afterBody: (items) => { const x = gu[items[0].dataIndex]; return x.text ? [`“${x.text}” — ${x.speaker}, p.${x.page}`] : []; } } } }, scales: { x: { grid: { display: false } }, y: { min: 90, max: 100, ticks: { callback: (v) => v + '%' } } }, datasets: { bar: { maxBarThickness: 60, borderWidth: 0 } } } });
    const rn = BO.gpu.renewals || [];
    html('gpuStats', rn.map((r) => `<div class="stat"><div class="v">${r.gpus_renewed_pct != null ? fmtPct(r.gpus_renewed_pct, 0) : '—'}${r.price_premium_pct != null ? ` <span class="small muted">+${r.price_premium_pct}% ${LANG === 'es' ? 'precio' : 'price'}</span>` : ''}</div><div class="l">${boLabel(r.id)} · ${LANG === 'es' ? 'GPU renovadas o revendidas' : 'GPUs renewed or resold'}${r.customers_renewed_pct != null ? ` (${r.customers_renewed_pct}% ${LANG === 'es' ? 'de los clientes' : 'of customers'})` : ''}</div></div>`).join(''));
    el('gpuUtilCap').textContent = LANG === 'es' ? 'Utilización global de la flota de GPU al cierre del trimestre (eje desde 90%). Renovaciones: porción de las GPU cuyo contrato venció que fue renovada o revendida en el mismo trimestre.' : 'Global GPU-fleet utilization at quarter-end (axis from 90%). Renewals: share of GPUs coming off contract that were renewed or resold in the same quarter.';
    html('gpuUtilSrc', `${t('src')}: ${srcLine([...gu, ...rn].map((x) => x.sourceRef && { title: callRef(x.id, x.page), url: x.sourceRef.url }))} · ${irLink()} · ${gu.length ? `${LANG === 'es' ? 'al' : 'as of'} ${boLabel(gu[gu.length - 1].id)}` : ''}`);
    // Sites table
    const sites = BO.sites || [];
    const sf = (s, k) => (LANG === 'es' && s[k + '_es'] ? s[k + '_es'] : s[k] || ''); // bilingual site field
    const srcShort = (r) => { let label = r.short || r.title; if (LANG === 'es') label = label.replace(/\b(\d)Q(\d\d)\b/g, '$1T$2').replace(/\bcall\b/g, 'llamada').replace(/\bpress release\b/gi, 'comunicado').replace(/ and /g, ' y '); return r.url ? `<a href="${r.url}" target="_blank" rel="noopener" title="${(r.title || '').replace(/"/g, '&quot;')}">${label}</a>` : `<span title="${(r.title || '').replace(/"/g, '&quot;')}">${label}</span>`; };
    const noIssue = (s) => !s.issues_en || /^None reported/i.test(s.issues_en);
    const mwCell = (s) => `<b>${s.nameplate_mw || s.capacity_mw ? fmtN(s.nameplate_mw || s.capacity_mw) + ' MW' : '—'}</b><span class="sub">${LANG === 'es' ? 'planeados' : 'nameplate'}${s.nameplate_src ? ` (${s.nameplate_src})` : ''}${s.generation_mw ? ` · ${fmtN(s.generation_mw)} MW ${LANG === 'es' ? 'de generación en sitio' : 'on-site generation'}` : ''}</span><span class="sub"><b>${s.energized_mw != null ? fmtN(s.energized_mw) + ' MW' : '—'}</b> ${LANG === 'es' ? 'energizados' : 'energized'}${s.energized_as_of ? ` · ${boLabel(s.energized_as_of)}` : ''}</span>${sf(s, 'nameplate_note') ? `<span class="sub">${sf(s, 'nameplate_note')}</span>` : ''}`;
    html('sitesTable', `<table class="sites"><thead><tr><th>${LANG === 'es' ? 'Sitio' : 'Site'}</th><th>${LANG === 'es' ? 'MW planeados · energizados' : 'MW nameplate · energized'}</th><th>${LANG === 'es' ? 'Energía' : 'Power source'}</th><th>${LANG === 'es' ? 'Desarrollador · inquilino · financiamiento' : 'Developer · tenant · financing'}</th><th>${LANG === 'es' ? 'Primeros ingresos' : 'First revenue'}</th><th>${LANG === 'es' ? 'Estado (con fecha) e incidencias' : 'Status (dated) and issues'}</th><th>${t('src')}</th></tr></thead><tbody>${sites.map((s) => `<tr><td><b>${s.name}</b><span class="sub">${s.location}</span></td><td>${mwCell(s)}</td><td>${sf(s, 'power') || '—'}</td><td><b>${sf(s, 'developer') || '—'}</b><span class="sub">${LANG === 'es' ? 'Inquilino' : 'Tenant'}: ${sf(s, 'tenant') || sf(s, 'customer') || '—'}</span>${sf(s, 'financing') ? `<span class="sub">${sf(s, 'financing')}</span>` : ''}</td><td>${sf(s, 'first_revenue') || sf(s, 'first_delivery') || '—'}</td><td>${s.status_date ? `<b>${fmtDate(s.status_date)}</b>: ` : ''}${sf(s, 'energized_text') || sf(s, 'oracle_status')}<span class="sub ${noIssue(s) ? '' : 'neg'}">${LANG === 'es' ? 'Incidencias' : 'Issues'}: ${sf(s, 'issues') || '—'}</span></td><td class="small">${(s.sources || []).map(srcShort).join(' · ')}</td></tr>`).join('')}</tbody></table>`);
    const energized = sites.reduce((a, s) => a + (s.energized_mw || 0), 0), statusMax = sites.map((s) => s.status_date || '').sort().slice(-1)[0];
    el('sitesCap').textContent = LANG === 'es' ? `Los ${sites.length} campus que Oracle ha nombrado en sus llamadas: capacidad planeada ≈ ${fmtN(sitesMw / 1000, 1)} GW, energizados ${fmtN(energized)} MW según la última llamada. MW, fuente de energía, inquilino y primeros ingresos provienen de Oracle cuando lo divulga; en caso contrario, de los comunicados de los desarrolladores o de la prensa enlazada en cada fila. El estado lleva fecha e incluye avisos de fuerza mayor, interconexiones y gasoductos. "No divulgado" significa que Oracle no lo ha dicho.` : `The ${sites.length} campuses Oracle has named on its calls: nameplate ≈ ${fmtN(sitesMw / 1000, 1)} GW, energized ${fmtN(energized)} MW per the latest call. MW, power source, tenant and first-revenue timing come from Oracle where it disclosed them, otherwise from the developers' releases or the press linked in each row. The status field is dated and carries force-majeure, interconnect and pipeline items. "Not disclosed" means Oracle has not said.`;
    html('sitesSrc', `${t('src')}: ${LANG === 'es' ? 'transcripciones de las llamadas 4T26 y 1T27, comunicados de Oracle, de Crusoe, Vantage/DigitalBridge y Related, Bloomberg, TechCrunch, Financial Times vía Reuters, Albuquerque Journal, DCD, CNBC, Construction Dive (enlaces por fila)' : '4Q26 and 1Q27 call transcripts, Oracle, Crusoe, Vantage/DigitalBridge and Related releases, Bloomberg, TechCrunch, Financial Times via Reuters, Albuquerque Journal, DCD, CNBC, Construction Dive (links per row)'} · ${irLink()} · ${LANG === 'es' ? 'estado al' : 'status as of'} ${statusMax ? fmtDate(statusMax) : (lastQ ? qLabel(lastQ) : '')}${BO.updated ? ` (${LANG === 'es' ? 'revisado el' : 'reviewed'} ${fmtDate(BO.updated)})` : ''}`);
  }
  // ================= 09b BUILDOUT FLOW + TRACKER =================
  function renderBuildoutFlow() {
    if (!BO || !lastQ) return; const c = SERIES();
    const q = lastQ, ql = qLabel(q); const rec = revOnNewBasis(q);
    const fyG = (GD.vintages || []).slice().reverse().find((v) => v.items && v.items.fyRevenue);
    const cap = BO.capacity || {}; const fyMw = (cap.fiscal_years || [])[0]; const lastMw = (cap.quarters || []).slice(-1)[0]; const sec = cap.secured;
    const fund = (BO.funding && BO.funding.items) || [];
    const sched = BO.rpoSchedule;
    const li = (arr) => `<ul>${arr.filter(Boolean).map((x) => `<li>${x}</li>`).join('')}</ul>`;
    const steps = [
      { k: LANG === 'es' ? '1 · Contratos' : '1 · Contracts', big: q.kpi.rpo != null ? `US$ ${fmtN(q.kpi.rpo / 1000)} bn` : '—', sub: `RPO · ${ql}`, items: [sched ? `${sched.buckets[0].pct}% ${L(sched.buckets[0]).toLowerCase()}, ${sched.buckets[1].pct}% ${L(sched.buckets[1]).toLowerCase()}` : null, LANG === 'es' ? 'Contratos plurianuales de infraestructura de IA, en su mayoría prepagados o con hardware del cliente' : 'Multi-year AI-infrastructure contracts, mostly prepaid or bring-your-own-hardware'] },
      { k: LANG === 'es' ? '2 · Capacidad' : '2 · Capacity', big: lastMw ? `${fmtN(lastMw.mw)} MW` : '—', sub: lastMw ? `${LANG === 'es' ? 'entregados en el' : 'delivered in'} ${boLabel(lastMw.id)}` : '', items: [fyMw ? (LANG === 'es' ? `> ${fmtN(fyMw.mw / 1000, 1)} GW entregados en el AF2026` : `> ${fmtN(fyMw.mw / 1000, 1)} GW delivered in FY2026`) : null, sec ? (LANG === 'es' ? `> ${sec.gw} GW asegurados vía socios (3T26)` : `> ${sec.gw} GW secured through partners (3Q26)`) : null, LANG === 'es' ? `${(BO.sites || []).length} campus nombrados (sección 03)` : `${(BO.sites || []).length} named campuses (section 03)`] },
      { k: LANG === 'es' ? '3 · Inversión' : '3 · Spend', big: q.cf && q.cf.capex != null ? fmtBn(-q.cf.capex) : '—', sub: `Capex · ${ql}`, items: [q.cf && q.cf.cfo != null ? (LANG === 'es' ? `Flujo operativo ${fmtBn(q.cf.cfo)} (incluye prepagos)` : `Operating cash flow ${fmtBn(q.cf.cfo)} (includes prepayments)`) : null, fyG && fyG.items.fyCapexNote ? (LANG === 'es' ? 'Guía AF27: ' : 'FY27 guide: ') + gCapexNote(fyG).replace(/\s*\(p\d+\)$/, '') : null] },
      { k: LANG === 'es' ? '4 · Financiamiento' : '4 · Funding', big: fund.length ? `US$ ${fmtN(fund.filter((f) => !/prepay|prepago/i.test(f.en)).reduce((a, f) => a + f.usd_bn, 0))} bn` : '—', sub: LANG === 'es' ? 'deuda y capital levantados AF26–1T27' : 'debt and equity raised FY26–1Q27', items: fund.map((f) => `${L(f)}: US$ ${fmtN(f.usd_bn)} bn`) },
      { k: LANG === 'es' ? '5 · Ingresos' : '5 · Revenue', big: rec ? fmtBn(rec.revCloud) : '—', sub: `${t('cloud')} · ${ql}`, items: [q.is.revTotal != null ? (LANG === 'es' ? `Ingresos totales ${fmtBn(q.is.revTotal)}` : `Total revenue ${fmtBn(q.is.revTotal)}`) : null, fyG && fyG.items.fyRevenue ? (LANG === 'es' ? `Guía AF${String(fyG.fyGuided).slice(2)}: al menos ${fmtBn(fyG.items.fyRevenue.usdM)}` : `FY${String(fyG.fyGuided).slice(2)} guide: at least ${fmtBn(fyG.items.fyRevenue.usdM)}`) : null] },
    ];
    html('buildoutFlow', steps.map((s) => `<div class="step"><div class="k">${s.k}</div><div class="big">${s.big}</div><div class="sub">${s.sub}</div>${li(s.items)}</div>`).join(''));
    el('flowCap').textContent = LANG === 'es' ? 'Cinco pasos con las cifras más recientes de Oracle: los contratos (RPO) definen la demanda; los socios de centros de datos y el capex de Oracle crean la capacidad; la deuda, el capital y los prepagos de clientes la financian; los megavatios entregados se convierten en ingresos de nube. Todas las cifras provienen de los datos del modelo y de las llamadas citadas.' : 'Five steps with Oracle\'s latest figures: contracts (RPO) set demand; data-center partners and Oracle\'s capex create the capacity; debt, equity and customer prepayments fund it; megawatts delivered turn into cloud revenue. Every figure comes from the model\'s data files and the cited calls.';
    html('flowSrc', `${t('src')}: ${srcLine([q.sources && q.sources.is && { title: t('release'), url: q.sources.is.url }, lastMw && lastMw.sourceRef && { title: callRef(lastMw.id, lastMw.page), url: lastMw.sourceRef.url }, sec && sec.sourceRef && { title: callRef('FY2026Q3', sec.page), url: sec.sourceRef.url }, ...fund.map((f) => f.sourceRef && { title: f.sourceRef.title, url: f.sourceRef.url })])} · ${asOfQ()}`);
    // Tracker: capex bars, cloud revenue line, RPO on the right axis, MW delivered where disclosed
    const qs = Q.slice(-8);
    const mwById = Object.fromEntries((cap.quarters || []).map((x) => [String(x.id).replace(/^FY/, ''), x.mw]));
    mkChart('chartBuildout', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { type: 'bar', label: `${t('capex')} (US$ M)`, data: qs.map((x) => (x.cf && x.cf.capex != null ? -x.cf.capex : null)), backgroundColor: alpha(c[0], 0.75), yAxisID: 'y', order: 10 },
      { type: 'line', label: `${t('cloudRev')}`, data: qs.map((x) => { const r = revOnNewBasis(x); return r ? r.revCloud : null; }), borderColor: c[1], backgroundColor: c[1], yAxisID: 'y', spanGaps: true },
      { type: 'line', label: 'RPO (US$ bn)', data: qs.map((x) => (x.kpi.rpo != null ? x.kpi.rpo / 1000 : null)), borderColor: c[7], backgroundColor: c[7], yAxisID: 'y2', spanGaps: true, borderDash: [5, 3] },
      { type: 'line', label: LANG === 'es' ? 'MW entregados' : 'MW delivered', data: qs.map((x) => mwById[x.id] ?? null), borderColor: c[2], backgroundColor: c[2], yAxisID: 'y3', spanGaps: false, pointStyle: 'rectRot', pointRadius: 5 },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.dataset.yAxisID === 'y2' ? 'US$ ' + fmtN(x.parsed.y) + ' bn' : x.dataset.yAxisID === 'y3' ? fmtN(x.parsed.y) + ' MW' : fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => fmtN(v) }, beginAtZero: true }, y3: { display: false, beginAtZero: true, suggestedMax: 1200 } }, datasets: { bar: { maxBarThickness: 28, borderWidth: 0 } } } });
    el('trackerCap').textContent = LANG === 'es' ? 'Últimos ocho trimestres: capex del trimestre (barras) e ingresos de nube en la base AF2026 (línea), en US$ millones, eje izquierdo; RPO en US$ mil millones, eje derecho; megavatios entregados donde Oracle los declaró (rombos, sin eje). Un capex que crece antes que los ingresos de nube es la esencia de la expansión: la capacidad se paga antes de facturarse.' : 'Last eight quarters: capex for the quarter (bars) and cloud revenue on the FY2026 basis (line), US$ million, left axis; RPO in US$ billion, right axis; megawatts delivered where Oracle stated them (diamonds, no axis). Capex rising ahead of cloud revenue is the essence of the buildout: capacity is paid for before it bills.';
    html('trackerSrc', `${t('src')}: ${LANG === 'es' ? 'comunicados de resultados (capex, ingresos, RPO)' : 'earnings releases (capex, revenue, RPO)'} · ${relLink()} · ${LANG === 'es' ? 'llamadas de resultados (MW entregados)' : 'earnings calls (MW delivered)'} · ${irLink()} · ${asOfQ()}`);
  }

  // ================= 04 SHARE PRICE =================
  const sh = { range: '3y' };
  function rangeStart(pts) { const last = lastPoint(pts); if (!last) return null; const n = { '1y': 365, '3y': 365 * 3, '5y': 365 * 5 }[sh.range]; return n ? addDays(last[0], -n) : pts[0][0]; }
  function decimate(pts, max = 900) { if (pts.length <= max) return pts; const step = Math.ceil(pts.length / max); return pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
  function renderShare() {
    const pts = orclPx; if (!pts.length) return;
    const start = rangeStart(pts); const win = pts.filter((p) => p[0] >= start);
    const c = SERIES(); const cur = win[win.length - 1]; const meta = MK.prices.ORCL;
    mkChart('chartPrice', { type: 'line', data: { datasets: [{ label: meta.name, data: decimate(win).map((p) => ({ x: p[0], y: p[1] })), borderColor: c[0], backgroundColor: c[0] + '1a', fill: true }] },
      options: { parsing: true, plugins: { tooltip: { callbacks: { title: (x) => fmtDate(x[0].raw.x), label: (x) => `US$ ${fmtN(x.parsed.y, 2)}` } } }, scales: { x: { type: 'category', ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i, ticks) => { const d = win[Math.round(i * (win.length - 1) / Math.max(1, ticks.length - 1))]; return d ? d[0].slice(0, 7) : ''; } }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    el('priceChartTitle').textContent = `${meta.name} · US$`;
    el('priceChartCap').textContent = `${t('close')} ${fmtDate(win[0][0])} → ${fmtDate(cur[0])}`;
    html('priceSrc', `${t('src')}: ${extLink(NASDAQ_URL, meta.source)} (${LANG === 'es' ? 'cierres diarios' : 'daily closes'}) · ${closeStamp()}${meta.fetchedAt ? ` · ${LANG === 'es' ? 'descargado el' : 'fetched'} ${fmtDate(meta.fetchedAt)}` : ''}`);
    const yAgo = pointAtOrBefore(pts, addDays(cur[0], -365)); const yStart = pointAtOrBefore(pts, `${cur[0].slice(0, 4)}-01-01`);
    const r52 = MK.range52 || null; const w52 = pts.filter((p) => p[0] > addDays(cur[0], -365) && p[0] <= cur[0]); const hi = r52 ? r52.high : Math.max(...w52.map((p) => p[1])), lo = r52 ? r52.low : Math.min(...w52.map((p) => p[1]));
    const stats = [
      { v: `US$ ${fmtN(cur[1], 2)}`, l: `${t('close')} ${fmtDate(cur[0])}` },
      { v: fmtPct(yStart ? 100 * (cur[1] / yStart[1] - 1) : null, 1, true), l: t('ytdChg'), c: cls(yStart ? cur[1] - yStart[1] : null) },
      { v: fmtPct(yAgo ? 100 * (cur[1] / yAgo[1] - 1) : null, 1, true), l: t('oneY'), c: cls(yAgo ? cur[1] - yAgo[1] : null) },
      { v: fmtN(hi, 2), l: `${t('high52')} · ${r52 ? `${LANG === 'es' ? 'intradía' : 'intraday'} ${fmtDate(r52.highDate)}` : t('close')}` }, { v: fmtN(lo, 2), l: `${t('low52')} · ${r52 ? `${LANG === 'es' ? 'intradía' : 'intraday'} ${fmtDate(r52.lowDate)}` : t('close')}` },
    ];
    if (sharesNow) stats.push({ v: 'US$ ' + fmtN(cur[1] * sharesNow / 1e9, 1) + (LANG === 'es' ? ' mil M' : ' bn'), l: t('mktCap') });
    html('shareStats', stats.map((s) => `<div class="stat"><div class="v ${s.c || ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    const ids = ['ORCL', '^GSPC'];
    const base = rangeStart(orclPx);
    const series = ids.map((id) => ({ id, pts: px(id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
    const dates = series[0].pts.map((p) => p[0]);
    const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lastV = null; return { label: MK.prices[s.id].name, data: dates.map((d) => { const v = map.get(d); if (v != null) lastV = v; return lastV != null ? 100 * lastV / b : null; }), borderColor: c[i], backgroundColor: c[i], borderWidth: i === 0 ? 2.5 : 1.5 }; });
    const idx = decimate(dates.map((_, i) => i), 700);
    mkChart('chartRebased', { type: 'line', data: { labels: idx.map((i) => dates[i]), datasets: ds.map((d) => ({ ...d, data: idx.map((i) => d.data[i]) })) },
      options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { title: (x) => fmtDate(x[0].label), label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y, 1)}` } } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i) => (idx[i] != null ? dates[idx[i]].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    html('rebasedTable', `<table><thead><tr><th>${t('period')}: ${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}</th><th>${t('ret')}</th></tr></thead><tbody>${ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return `<tr><td>${d.label}</td><td class="${cls(last - 100)}">${fmtPct(last - 100, 1, true)}</td></tr>`; }).join('')}</tbody></table>`);
    html('rebasedSrc', `${t('src')}: ORCL ${extLink(NASDAQ_URL, MK.prices.ORCL.source)} · S&P 500 ${extLink(FRED_SPX, MK.prices['^GSPC'] ? MK.prices['^GSPC'].source : 'FRED SP500')} · ${LANG === 'es' ? 'precio, sin dividendos reinvertidos' : 'price only, dividends not reinvested'} · ${closeStamp()}`);
    html('shareMeta', LANG === 'es' ? `Acciones en circulación: ${fmtN(sharesNow)} (${MK.sharesOutstanding ? MK.sharesOutstanding.source + ', ' + fmtDate(MK.sharesOutstanding.asOf) : ''}). Historial de precios disponible desde ${fmtDate(pts[0][0])}.` : `Shares outstanding: ${fmtN(sharesNow)} (${MK.sharesOutstanding ? MK.sharesOutstanding.source + ', ' + fmtDate(MK.sharesOutstanding.asOf) : ''}). Price history available from ${fmtDate(pts[0][0])}.`);
  }

  // ================= 05 DCF =================
  const D = Object.assign({}, REF.dcf || {});
  const dcfState = {};
  function betaFromMarket() {
    const g = px('ORCL'), m = px('^GSPC'); if (g.length < 120 || m.length < 120) return null;
    const mm = new Map(m.map((p) => [p[0], p[1]]));
    const start = addDays(g[g.length - 1][0], -730);
    const wk = (d) => { const dt = new Date(d + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); return dt.toISOString().slice(0, 10); };
    const byWeek = new Map(); for (const p of g) if (p[0] >= start && mm.has(p[0])) byWeek.set(wk(p[0]), [p[1], mm.get(p[0])]);
    const pts = [...byWeek.values()]; if (pts.length < 60) return null;
    const rg = [], rm = []; for (let i = 1; i < pts.length; i++) { rg.push(Math.log(pts[i][0] / pts[i - 1][0])); rm.push(Math.log(pts[i][1] / pts[i - 1][1])); }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length; const ag = mean(rg), am = mean(rm);
    let cov = 0, vr = 0; for (let i = 0; i < rg.length; i++) { cov += (rg[i] - ag) * (rm[i] - am); vr += (rm[i] - am) ** 2; }
    return vr ? { beta: Math.round(100 * cov / vr) / 100, weeks: rg.length, from: [...byWeek.keys()][0] } : null;
  }
  function kdFromDebt() { // coupon of the most recent ~10-year fixed-rate note
    const ins = ((REF.debt && REF.debt.instruments) || []).filter((x) => x.issued && x.matures && x.ratePct != null && x.type && (typeof x.type === 'object' ? x.type.en === 'senior notes' : false));
    const tenor = (x) => (new Date(x.matures) - new Date(x.issued)) / (365.25 * 864e5);
    const ten = ins.filter((x) => tenor(x) >= 9 && tenor(x) <= 11).sort((a, b) => a.issued.localeCompare(b.issued));
    const pick = ten[ten.length - 1] || ins.sort((a, b) => a.issued.localeCompare(b.issued))[ins.length - 1];
    return pick ? { name: pick.name, rate: pick.ratePct, issued: pick.issued } : null;
  }
  const BETA = betaFromMarket(), KD = kdFromDebt();
  function dcfDefaults() {
    const ltm = lastLTM && lastLTM.is ? lastLTM.is : {};
    const rev = ltm.revTotal || 0, ebitda = ltm.ebitda || 0, da = ltm.da || 0;
    const nd = netDebt(lastQ); const mc = lastPx && sharesNow ? lastPx[1] * sharesNow / 1e6 : 0;
    return {
      baseRev: rev, baseEbitda: ebitda,
      revG: (D.revenueGrowthPct || [30, 25, 20, 15, 10]).slice(),
      margin: D.ebitdaMarginPct ?? (rev ? Math.round(10 * 100 * ebitda / rev) / 10 : 35), capex: (D.capexUsdM || [70000, 60000, 50000, 40000, 35000]).slice(),
      daPct: D.daPctRevenue ?? (rev ? Math.round(10 * 100 * da / rev) / 10 : 10), tax: D.taxRatePct ?? (ltm.taxRate != null ? Math.round(10 * ltm.taxRate) / 10 : 15), nwc: D.nwcPctDeltaRevenue ?? 0,
      rf: D.riskFreePct ?? (us10.length ? us10[us10.length - 1][1] : 4.5), erp: D.erpPct ?? 4.5, beta: BETA ? BETA.beta : (D.beta ?? 1.0), kd: KD ? KD.rate : (D.costOfDebtPct ?? 5.5), dw: D.targetDebtPct ?? (nd && mc ? Math.round(10 * 100 * nd.net / (nd.net + mc)) / 10 : 15),
      method: D.terminalMethod || 'perpetuity', g: D.terminalGrowthPct ?? 3, mult: D.exitMultiple ?? 12,
      baseYear: lastQ ? lastQ.fy : new Date().getFullYear(),
    };
  }
  function dcfInputsHtml(s) {
    const num = (k, step = 0.1, min, max) => `<input type="number" step="${step}" ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} data-k="${k}" value="${s[k]}">`;
    const row = (name, sub, ctl) => `<div class="inp"><div class="name">${name}${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;
    const years = Array.from({ length: 5 }, (_, i) => 'FY' + String(s.baseYear + 1 + i).slice(2));
    const arr = (k, step, label) => `<div class="inp years"><div class="name">${label}</div><div class="row5">${years.map((y) => `<span>${y}</span>`).join('')}${s[k].map((v, i) => `<input type="number" step="${step}" data-k="${k}" data-i="${i}" value="${v}">`).join('')}</div></div>`;
    const ltmM = lastLTM && lastLTM.is ? lastLTM.is.ebitdaMargin : null;
    return `
      <h4>${LANG === 'es' ? 'Operación' : 'Operations'}</h4>
      ${arr('revG', 0.5, LANG === 'es' ? 'Crecimiento de ingresos (%)' : 'Revenue growth (%)')}
      ${row(LANG === 'es' ? 'Margen EBITDA (%)' : 'EBITDA margin (%)', `${LANG === 'es' ? 'UDM' : 'LTM'}: ${fmtPct(ltmM)}`, num('margin', 0.5, 5, 80))}
      ${arr('capex', 1000, 'Capex (US$ M)')}
      ${row(LANG === 'es' ? 'D&A (% de ingresos)' : 'D&A (% of revenue)', '', num('daPct', 0.5))}
      ${row(LANG === 'es' ? 'Tasa de impuestos (%)' : 'Tax rate (%)', LANG === 'es' ? 'tasa efectiva UDM por defecto' : 'LTM effective rate by default', num('tax', 1, 0, 60))}
      ${row(LANG === 'es' ? 'Δ capital de trabajo (% de Δ ingresos)' : 'Δ working capital (% of Δ revenue)', '', num('nwc', 1))}
      <h4>${LANG === 'es' ? 'Costo de capital' : 'Cost of capital'}</h4>
      ${row(LANG === 'es' ? 'Tasa libre de riesgo (%)' : 'Risk-free rate (%)', us10.length ? `${LANG === 'es' ? 'Tesoro 10 años (FRED DGS10)' : '10-yr Treasury (FRED DGS10)'}: ${fmtPct(us10[us10.length - 1][1], 2)} ${fmtDate(us10[us10.length - 1][0])}` : '', num('rf', 0.05))}
      ${row(LANG === 'es' ? 'Prima de riesgo de mercado (%)' : 'Equity risk premium (%)', LANG === 'es' ? 'supuesto editable' : 'editable assumption', num('erp', 0.25))}
      ${row('Beta', BETA ? (LANG === 'es' ? `calculada: ${BETA.weeks} rendimientos semanales ORCL vs S&P 500 desde ${fmtDate(BETA.from)}` : `computed: ${BETA.weeks} weekly returns ORCL vs S&P 500 since ${fmtDate(BETA.from)}`) : (LANG === 'es' ? 'supuesto de referencia' : 'reference default'), num('beta', 0.05))}
      ${row(LANG === 'es' ? 'Costo de deuda antes de impuestos (%)' : 'Pre-tax cost of debt (%)', KD ? (LANG === 'es' ? `${KD.name}: ${fmtPct(KD.rate, 2)} fija (${fmtDate(KD.issued)})` : `${KD.name}: ${fmtPct(KD.rate, 2)} fixed (${fmtDate(KD.issued)})`) : '', num('kd', 0.05))}
      ${row(LANG === 'es' ? 'Deuda / (deuda + capital) (%)' : 'Debt / (debt + equity) (%)', LANG === 'es' ? 'por defecto: deuda neta / (deuda neta + capitalización)' : 'default: net debt / (net debt + market cap)', num('dw', 1, 0, 90))}
      <h4>${t('tv')}</h4>
      ${row(LANG === 'es' ? 'Método' : 'Method', '', `<select data-k="method"><option value="perpetuity"${s.method === 'perpetuity' ? ' selected' : ''}>${LANG === 'es' ? 'Perpetuidad (Gordon)' : 'Perpetuity (Gordon)'}</option><option value="multiple"${s.method === 'multiple' ? ' selected' : ''}>${LANG === 'es' ? 'Múltiplo de salida' : 'Exit multiple'}</option></select>`)}
      ${row(LANG === 'es' ? 'Crecimiento terminal (%)' : 'Terminal growth (%)', LANG === 'es' ? 'nominal, en dólares' : 'nominal, dollars', num('g', 0.25))}
      ${row(LANG === 'es' ? 'Múltiplo de salida VE/EBITDA' : 'Exit EV/EBITDA multiple', '', num('mult', 0.5))}
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="dcfReset">${LANG === 'es' ? 'Restablecer supuestos' : 'Reset assumptions'}</button><button type="button" class="btn" id="dcfCopy">${LANG === 'es' ? 'Copiar enlace del escenario' : 'Copy scenario link'}</button></div>`;
  }
  function dcfCompute(s, over = {}) {
    const p = { ...s, ...over };
    const wacc = (1 - p.dw / 100) * (p.rf + p.beta * p.erp) / 100 + (p.dw / 100) * (p.kd / 100) * (1 - p.tax / 100);
    const rows = []; let rev = p.baseRev; let pv = 0;
    for (let i = 0; i < 5; i++) {
      const prevRev = rev; rev = rev * (1 + p.revG[i] / 100);
      const ebitda = rev * p.margin / 100, da = rev * p.daPct / 100, ebit = ebitda - da, taxes = Math.max(0, ebit) * p.tax / 100;
      const dnwc = (rev - prevRev) * p.nwc / 100; const capex = p.capex[i];
      const fcf = ebitda - taxes - capex - dnwc; const df = 1 / Math.pow(1 + wacc, i + 1);
      pv += fcf * df; rows.push({ year: p.baseYear + 1 + i, rev, ebitda, da, ebit, taxes, capex, dnwc, fcf, df, pv: fcf * df });
    }
    const last = rows[4]; const g = p.g / 100; let tv;
    if (p.method === 'multiple') tv = last.ebitda * p.mult; else tv = wacc > g ? last.fcf * (1 + g) / (wacc - g) : NaN;
    const pvTv = tv * last.df; const ev = pv + pvTv;
    const nd = netDebt(lastQ); const netDebtM = nd ? nd.net : 0;
    const eq = ev - netDebtM; const perShare = sharesNow ? eq * 1e6 / sharesNow : null;
    return { wacc, rows, tv, pvTv, pvExplicit: pv, ev, netDebtM, eq, perShare, impliedMult: p.baseEbitda ? ev / p.baseEbitda : null };
  }
  const URL_KEYS = ['revG', 'margin', 'capex', 'daPct', 'tax', 'nwc', 'rf', 'erp', 'beta', 'kd', 'dw', 'method', 'g', 'mult'];
  function dcfFromUrl(base) { try { const p = new URLSearchParams(location.search).get('dcf'); if (!p) return base; const o = JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/'))))); for (const k of URL_KEYS) if (o[k] != null) base[k] = o[k]; } catch (e) { /* ignore */ } return base; }
  function dcfToUrl(s) { const o = {}; for (const k of URL_KEYS) o[k] = s[k]; const enc = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); const u = new URL(location.href); u.searchParams.set('dcf', enc); u.searchParams.set('lang', LANG); history.replaceState(null, '', u.toString()); return u.toString(); }
  function renderDcf(reset) {
    if (reset || !dcfState.s) dcfState.s = reset ? dcfDefaults() : dcfFromUrl(dcfDefaults());
    const s = dcfState.s;
    const box = el('dcfInputs'); box.innerHTML = dcfInputsHtml(s);
    box.querySelectorAll('input,select').forEach((inp) => inp.addEventListener('input', () => { const k = inp.dataset.k; const v = inp.tagName === 'SELECT' ? inp.value : Number(inp.value); if (inp.dataset.i != null) s[k][+inp.dataset.i] = v; else s[k] = v; dcfToUrl(s); renderDcfOutputs(); }));
    el('dcfReset').addEventListener('click', () => { const u = new URL(location.href); u.searchParams.delete('dcf'); history.replaceState(null, '', u.toString()); renderDcf(true); });
    el('dcfCopy').addEventListener('click', async () => { const u = dcfToUrl(s); try { await navigator.clipboard.writeText(u); el('dcfCopy').textContent = LANG === 'es' ? 'Enlace copiado' : 'Link copied'; } catch (e) { /* ignore */ } });
    renderDcfOutputs();
    html('dcfMeta', LANG === 'es' ? `Base: ingresos y EBITDA de los últimos doce meses al ${lastQ ? qLabel(lastQ) : '—'} (US$ ${fmtN(s.baseRev)} M / US$ ${fmtN(s.baseEbitda)} M); deuda neta al cierre del mismo trimestre; ${fmtN(sharesNow)} acciones en circulación.` : `Base: last-twelve-month revenue and EBITDA at ${lastQ ? qLabel(lastQ) : '—'} (US$ ${fmtN(s.baseRev)} M / US$ ${fmtN(s.baseEbitda)} M); net debt at the same quarter-end; ${fmtN(sharesNow)} shares outstanding.`);
  }
  function renderDcfOutputs() {
    const s = dcfState.s; const r = dcfCompute(s);
    const price = lastPx ? lastPx[1] : null;
    el('dcfHero').textContent = r.perShare != null && isFinite(r.perShare) ? 'US$ ' + fmtN(r.perShare, 0) : '—';
    el('dcfHeroLbl').textContent = `${t('perShare')}${price && r.perShare ? ` · ${fmtPct(100 * (r.perShare / price - 1), 1, true)} ${t('upside')} (US$ ${fmtN(price, 2)})` : ''}`;
    let implied = null;
    if (price && r.perShare != null) { let lo = -20, hi = 60; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; const v = dcfCompute(s, { rf: mid }).perShare; if (!isFinite(v) || v > price) lo = mid; else hi = mid; } implied = dcfCompute(s, { rf: (lo + hi) / 2 }).wacc; }
    const outs = [
      { v: fmtPct(100 * r.wacc, 2), l: t('wacc') + (implied != null && isFinite(implied) ? ` · ${LANG === 'es' ? 'implícito por el mercado' : 'market-implied'} ${fmtPct(100 * implied, 1)}` : '') },
      { v: fmtBn(r.ev), l: t('ev') },
      { v: fmtBn(r.eq), l: LANG === 'es' ? 'Valor del capital' : 'Equity value' },
      { v: fmtPct(100 * r.pvTv / r.ev, 0), l: LANG === 'es' ? 'VP del valor terminal / VE' : 'PV of terminal value / EV' },
      { v: fmtX(r.impliedMult), l: LANG === 'es' ? 'VE / EBITDA UDM implícito' : 'Implied EV / LTM EBITDA' },
      { v: fmtBn(r.netDebtM), l: t('nd') },
    ];
    html('dcfOutputs', outs.map((o) => `<div class="out"><div class="v">${o.v}</div><div class="l">${o.l}</div></div>`).join(''));
    html('dcfNote', LANG === 'es'
      ? `<b>Lectura.</b> El valor terminal se calcula por ${s.method === 'perpetuity' ? `perpetuidad de Gordon (flujo del año 5 creciendo ${fmtPct(s.g)} a perpetuidad)` : `múltiplo de salida ${fmtX(s.mult)} sobre el EBITDA del año 5`}. Los flujos son a la firma, en dólares nominales por año fiscal; los impuestos se aplican sobre la utilidad operativa (EBITDA − D&amp;A). El capex por defecto sigue la guía de la administración para el AF2027 y desciende después; es el supuesto que más mueve el resultado. ${L(D.notes)}`
      : `<b>Reading it.</b> The terminal value uses ${s.method === 'perpetuity' ? `a Gordon perpetuity (year-5 cash flow growing ${fmtPct(s.g)} forever)` : `a ${fmtX(s.mult)} exit multiple on year-5 EBITDA`}. Flows are to the firm in nominal dollars by fiscal year; taxes are charged on operating profit (EBITDA − D&amp;A). Default capex follows management's FY2027 guidance and tapers afterwards; it is the assumption that moves the result most. ${L(D.notes)}`);
    const hdr = `<tr><th>${t('year')}</th>${r.rows.map((x) => `<th>FY${x.year}E</th>`).join('')}</tr>`;
    const line = (l, f, d = 0) => `<tr><td>${l}</td>${r.rows.map((x) => `<td>${fmtN(f(x), d)}</td>`).join('')}</tr>`;
    html('dcfTable', `<table><thead>${hdr}</thead><tbody>
      ${line(t('revenue'), (x) => x.rev)}
      ${line('EBITDA', (x) => x.ebitda)}
      ${line('− D&A', (x) => -x.da)}
      ${line(LANG === 'es' ? '− Impuestos sobre EBIT' : '− Taxes on EBIT', (x) => -x.taxes)}
      ${line('− Capex', (x) => -x.capex)}
      ${line(LANG === 'es' ? '− Δ capital de trabajo' : '− Δ working capital', (x) => -x.dnwc)}
      <tr class="total"><td>${LANG === 'es' ? 'Flujo libre a la firma' : 'Unlevered free cash flow'}</td>${r.rows.map((x) => `<td>${fmtN(x.fcf)}</td>`).join('')}</tr>
      ${line(LANG === 'es' ? 'Factor de descuento' : 'Discount factor', (x) => x.df, 3)}
      ${line(t('pv'), (x) => x.pv)}
      <tr class="head"><td colspan="6">${t('tv')}: ${fmtN(r.tv)} · ${t('pv')}: ${fmtN(r.pvTv)} · ${LANG === 'es' ? 'VP flujos explícitos' : 'PV explicit flows'}: ${fmtN(r.pvExplicit)} · VE: ${fmtN(r.ev)}</td></tr></tbody></table>`);
    const waccs = [-1, -0.5, 0, 0.5, 1].map((d) => r.wacc * 100 + d);
    const gsx = s.method === 'multiple' ? [-2, -1, 0, 1, 2].map((d) => s.mult + d) : [-1, -0.5, 0, 0.5, 1].map((d) => s.g + d);
    const cell = (w, g) => { const over = s.method === 'multiple' ? { mult: g } : { g }; const deltaW = w / 100 - r.wacc; over.rf = s.rf + 100 * deltaW / (1 - s.dw / 100); return dcfCompute(s, over).perShare; };
    html('dcfSens', `<table class="sens"><thead><tr><th>WACC ↓ / ${s.method === 'multiple' ? (LANG === 'es' ? 'múltiplo →' : 'multiple →') : 'g →'}</th>${gsx.map((g) => `<th>${s.method === 'multiple' ? fmtX(g) : fmtPct(g, 2)}</th>`).join('')}</tr></thead><tbody>${waccs.map((w, i) => `<tr><td>${fmtPct(w, 2)}</td>${gsx.map((g, j) => { const v = cell(w, g); const now = i === 2 && j === 2; const hi = price && v > price; return `<td class="center ${hi ? 'hi' : ''} ${now ? 'now' : ''}">${fmtN(v, 0)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`);
    el('sensCap').textContent = LANG === 'es' ? `US$ por acción; sombreado = por encima del precio actual (US$ ${fmtN(price, 2)}); recuadro = caso base` : `US$ per share; shaded = above the current price (US$ ${fmtN(price, 2)}); outlined = base case`;
    const dcfSrc = `${t('src')}: ${LANG === 'es' ? 'cálculo del modelo sobre' : 'model computation on'} ${relLink()} (${LANG === 'es' ? 'UDM y deuda neta' : 'LTM and net debt'} ${asOfQ()}) · ${extLink(NASDAQ_URL, 'Nasdaq')} ${closeStamp()} · ${extLink(FRED_DGS10, LANG === 'es' ? 'Tesoro 10 años (FRED DGS10)' : '10-yr Treasury (FRED DGS10)')}${us10.length ? ` ${fmtDate(us10[us10.length - 1][0])}` : ''} · ${MK.sharesOutstanding && MK.sharesOutstanding.url ? extLink(MK.sharesOutstanding.url, LANG === 'es' ? 'acciones: portada del 10-Q' : 'shares: 10-Q cover') + ` ${fmtDate(MK.sharesOutstanding.asOf)}` : ''} · ${LANG === 'es' ? 'supuestos por defecto' : 'defaults'}: data/reference.js ${fmtDate(REF.updatedAt)}`;
    html('dcfOutSrc', dcfSrc); html('dcfTableSrc', dcfSrc); html('dcfSensSrc', dcfSrc);
  }

  // ================= 06 RELATIVE =================
  function renderRelative() {
    const nd = netDebt(lastQ); const ltm = lastLTM && lastLTM.is; const price = lastPx ? lastPx[1] : null;
    const rows = [];
    if (price && sharesNow && ltm) {
      const mcM = price * sharesNow / 1e6; const evM = nd ? mcM + nd.net : null;
      const fcf = lastLTM.cf && lastLTM.cf.fcf != null ? lastLTM.cf.fcf : null;
      const dpsLtm = lastLTM.kpi && lastLTM.kpi.dps != null ? lastLTM.kpi.dps : null;
      rows.push([t('mktCap'), fmtBn(mcM), `${fmtN(sharesNow)} × US$ ${fmtN(price, 2)}`]);
      if (evM != null) rows.push([t('ev'), fmtBn(evM), `${t('mktCap')} + ${t('nd')} ${fmtN(nd.net)} M`]);
      if (evM != null && ltm.ebitda) rows.push(['VE / EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), fmtX(evM / ltm.ebitda), `EBITDA ${fmtN(ltm.ebitda)} M`]);
      if (evM != null) rows.push(['VE / ' + (LANG === 'es' ? 'ingresos UDM' : 'LTM revenue'), fmtX(evM / ltm.revTotal), `${fmtN(ltm.revTotal)} M`]);
      if (ltm.epsDiluted) rows.push(['P / U ' + (LANG === 'es' ? 'UDM GAAP' : 'LTM GAAP'), fmtX(price / ltm.epsDiluted), `${LANG === 'es' ? 'UPA UDM' : 'LTM EPS'} US$ ${fmtN(ltm.epsDiluted, 2)}`]);
      if (ltm.ngEpsDiluted) rows.push(['P / U ' + (LANG === 'es' ? 'UDM No-GAAP' : 'LTM Non-GAAP'), fmtX(price / ltm.ngEpsDiluted), `US$ ${fmtN(ltm.ngEpsDiluted, 2)}`]);
      if (fcf != null) rows.push([LANG === 'es' ? 'Rendimiento FCF / cap.' : 'FCF yield / mkt cap', fmtPct(100 * fcf / mcM), `${fmtN(fcf)} M ${LANG === 'es' ? 'UDM' : 'LTM'}`]);
      if (dpsLtm) rows.push([LANG === 'es' ? 'Rendimiento por dividendo' : 'Dividend yield', fmtPct(100 * dpsLtm / price), `US$ ${fmtN(dpsLtm, 2)} ${LANG === 'es' ? 'declarados en 4 trimestres' : 'declared over 4 quarters'}`]);
      if (nd && ltm.ebitda) rows.push([t('lev'), fmtX(nd.net / ltm.ebitda, 2), LANG === 'es' ? 'balance del trimestre' : "quarter's balance sheet"]);
      rows.push([LANG === 'es' ? 'Margen EBITDA UDM' : 'LTM EBITDA margin', fmtPct(ltm.ebitdaMargin), LANG === 'es' ? 'UDM' : 'LTM']);
    }
    html('multTable', `<table><thead><tr><th>${t('metric')}</th><th>${t('value')}</th><th>${t('basis')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td></tr>`).join('')}</tbody></table>`);
    el('multCap').textContent = lastPx ? `${t('price')} ORCL ${fmtDate(lastPx[0])} · ${LANG === 'es' ? 'estados financieros al' : 'financials as of'} ${lastQ ? qLabel(lastQ) : ''}` : '';
    html('multSrc', `${t('src')}: ${relLink()} (${LANG === 'es' ? 'UDM, deuda neta, dividendos' : 'LTM, net debt, dividends'} ${asOfQ()}) · ${extLink(NASDAQ_URL, 'Nasdaq')} ${closeStamp()} · ${MK.sharesOutstanding && MK.sharesOutstanding.url ? extLink(MK.sharesOutstanding.url, LANG === 'es' ? 'acciones: portada del 10-Q' : 'shares: 10-Q cover') + ` ${fmtDate(MK.sharesOutstanding.asOf)}` : ''}`);
    const hist = Q.slice(-lastN()).map((q) => { const l = ltmFor(q); const p = pointAtOrBefore(orclPx, qEndDate(q)); const nd2 = netDebt(q); if (!l || !p || !nd2 || !l.is.ebitda) return null; const sh2 = q.shares ? q.shares.current : sharesNow; const ev = p[1] * sh2 / 1e6 + nd2.net; return { q, v: ev / l.is.ebitda, pe: l.is.epsDiluted ? p[1] / l.is.epsDiluted : null }; }).filter(Boolean);
    const c = SERIES();
    if (hist.length) mkChart('chartEvEbitda', { type: 'bar', data: { labels: hist.map((h) => qLabel(h.q)), datasets: [{ label: 'VE/EBITDA', data: hist.map((h) => h.v), backgroundColor: c[0] }, { label: 'P/U GAAP', type: 'line', data: hist.map((h) => h.pe), borderColor: c[1], backgroundColor: c[1], pointRadius: 3 }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + 'x' }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('evSrc', `${t('src')}: ${LANG === 'es' ? 'comunicados de resultados (balance y acciones diluidas de cada trimestre)' : 'earnings releases (each quarter\'s balance sheet and diluted shares)'} · ${relLink()} · ${extLink(NASDAQ_URL, 'Nasdaq')} (${LANG === 'es' ? 'historial desde' : 'history from'} ${orclPx.length ? fmtDate(orclPx[0][0]) : '—'}) · ${asOfQ()}<br>${LANG === 'es' ? 'Cierre del trimestre fiscal × acciones diluidas del trimestre + deuda neta reportada, sobre EBITDA UDM; P/U sobre UPA GAAP UDM.' : 'Fiscal quarter-end close × diluted shares of the quarter + reported net debt, over LTM EBITDA; P/E on LTM GAAP EPS.'}`);
    const cols = [['name', LANG === 'es' ? 'Empresa' : 'Company'], ['evEbitdaLtm', 'VE/EBITDA LTM'], ['evEbitdaNtm', 'VE/EBITDA NTM'], ['peLtm', 'P/U LTM'], ['peNtm', 'P/U NTM'], ['divYieldPct', LANG === 'es' ? 'Div. %' : 'Div. yield'], ['netDebtEbitda', 'DN/EBITDA'], ['ebitdaMarginPct', LANG === 'es' ? 'Margen EBITDA' : 'EBITDA margin']];
    const fmtCell = (k, v) => (v == null ? `<span class="muted">${t('na')}</span>` : /Pct/.test(k) ? fmtPct(v) : fmtX(v));
    const own = price && sharesNow && ltm && nd ? { name: 'Oracle (' + (LANG === 'es' ? 'calculado' : 'computed') + ')', evEbitdaLtm: ltm.ebitda ? (price * sharesNow / 1e6 + nd.net) / ltm.ebitda : null, peLtm: ltm.epsDiluted ? price / ltm.epsDiluted : null, divYieldPct: lastLTM.kpi && lastLTM.kpi.dps ? 100 * lastLTM.kpi.dps / price : null, netDebtEbitda: ltm.ebitda ? nd.net / ltm.ebitda : null, ebitdaMarginPct: ltm.ebitdaMargin } : null;
    const all = [own, ...PEERS.peers].filter(Boolean);
    html('peersTable', `<table><thead><tr>${cols.map((c2) => `<th>${c2[1]}</th>`).join('')}</tr></thead><tbody>${all.map((p) => `<tr class="${p === own ? 'bold' : ''}">${cols.map((c2) => `<td>${c2[0] === 'name' ? p.name : fmtCell(c2[0], p[c2[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    el('peersCap').textContent = PEERS.updatedAt ? `${LANG === 'es' ? 'Múltiplos de pares al' : 'Peer multiples as of'} ${fmtDate(PEERS.updatedAt)}` : `${t('pending')} · ${LANG === 'es' ? 'estructura lista en data/peers.js; autorice el conector de FactSet para poblarla' : 'schema ready in data/peers.js; authorise the FactSet connector to populate it'}`;
    html('peersSrc', `${t('src')}: ${LANG === 'es' ? 'pares' : 'peers'}: ${PEERS.updatedAt ? `${PEERS.source} · ${fmtDate(PEERS.updatedAt)}` : (LANG === 'es' ? 'FactSet (pendiente de autorización)' : 'FactSet (pending authorisation)')} · ${LANG === 'es' ? 'fila de Oracle calculada con' : 'Oracle row computed from'} ${relLink()} (${asOfQ()}) ${LANG === 'es' ? 'y' : 'and'} ${extLink(NASDAQ_URL, 'Nasdaq')} ${closeStamp()}`);
  }

  // ================= 11 DEBT DETAIL & CREDIT RISK =================
  // Oracle's fiscal year runs June–May: a note maturing in July 2026 falls in FY2027.
  const fyOfDate = (iso) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return m >= 6 ? y + 1 : y; };
  function renderCredit() {
    const D2 = REF.debt || {}; const c = SERIES();
    const all = D2.instruments || [];
    const dated = all.filter((i) => i.matures && i.principalUsdM != null);
    const total = all.reduce((a, i) => a + (i.principalUsdM || 0), 0);
    const fixed = dated.filter((i) => i.type && typeof i.type === 'object' && i.type.en === 'senior notes' && i.ratePct != null);
    const wavg = (arr) => { const p = arr.reduce((a, i) => a + i.principalUsdM, 0); return p ? arr.reduce((a, i) => a + i.ratePct * i.principalUsdM, 0) / p : null; };
    // ---- schedule by calendar-year bucket (same grouping as the section-07 chart)
    const mb = maturityBuckets(dated);
    let cum = 0;
    const rows = mb.map((b) => { cum += b.principal; const nW = b.n === 1 ? (LANG === 'es' ? 'instrumento' : 'instrument') : (LANG === 'es' ? 'instrumentos' : 'instruments'); return `<tr class="${b.matured ? 'sub' : ''}"><td>${b.label}${b.matured ? ` <span class="muted small">${LANG === 'es' ? 'vencido' : 'matured'}</span>` : ''}<span class="sub">${b.n} ${nW}</span></td><td>${fmtN(b.principal)}</td><td>${fmtPct(100 * b.principal / total)}</td><td>${fmtPct(100 * cum / total)}</td><td>${b.coupon != null ? fmtPct(b.coupon, 2) : '—'}</td></tr>`; });
    const cp = all.find((i) => !i.matures);
    html('schedTable', `<table><thead><tr><th>${LANG === 'es' ? 'Año de vencimiento' : 'Maturity year'}</th><th>${t('principal')}</th><th>${LANG === 'es' ? '% del total' : '% of total'}</th><th>${LANG === 'es' ? 'Acumulado' : 'Cumulative'}</th><th>${LANG === 'es' ? 'Cupón prom.' : 'Avg. coupon'}</th></tr></thead><tbody>${rows.join('')}${cp ? `<tr class="sub"><td>${LS(cp.name)}</td><td>${fmtN(cp.principalUsdM)}</td><td>${fmtPct(100 * cp.principalUsdM / total)}</td><td>—</td><td>${cp.ratePct != null ? fmtPct(cp.ratePct, 2) : '—'}</td></tr>` : ''}<tr class="total"><td>${t('total')}</td><td>${fmtN(total)}</td><td>100%</td><td></td><td>${fmtPct(wavg(fixed), 2)}</td></tr></tbody></table>`);
    // Headline rates above the table: principal-weighted coupon of the fixed-rate notes, and of every instrument
    // that carries a stated rate (term loan and commercial paper at their effective rates; floating-rate notes excluded).
    const rated = all.filter((i) => i.ratePct != null && !/floating|FRN/i.test(typeof i.type === 'string' ? i.type : (i.type && i.type.en) || ''));
    const frn = all.filter((i) => /floating|FRN/i.test(typeof i.type === 'string' ? i.type : (i.type && i.type.en) || ''));
    html('schedStats', [
      { v: fmtPct(wavg(fixed), 2), l: LANG === 'es' ? `cupón promedio ponderado, bonos a tasa fija (${fixed.length})` : `weighted-average coupon, fixed-rate notes (${fixed.length})` },
      { v: fmtPct(wavg(rated), 2), l: LANG === 'es' ? 'promedio ponderado incl. crédito a plazo y papel comercial' : 'weighted average incl. term loan and commercial paper' },
      { v: fmtBn(total), l: LANG === 'es' ? `principal total · ${frn.length} nota(s) a tasa flotante fuera del promedio` : `total principal · ${frn.length} floating-rate note(s) outside the average` },
    ].map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    // near-term maturities vs. cash at the latest quarter-end
    const end = lastQ ? qEndDate(lastQ) : null;
    const within = (months) => { if (!end) return null; const d = new Date(end + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + months); const lim = d.toISOString().slice(0, 10); return dated.filter((i) => i.matures > end && i.matures <= lim).reduce((a, i) => a + i.principalUsdM, 0); };
    const m12 = within(12), m24 = within(24); const cash = lastQ && lastQ.bs ? lastQ.bs.cashAndInvestments : null;
    el('schedCap').textContent = LANG === 'es'
      ? `Principal en US$ millones por año calendario de vencimiento (misma agrupación que el perfil de la sección 07). Vencen US$ ${fmtN(m12)} M en los 12 meses posteriores al ${lastQ ? qLabel(lastQ) : '—'} y US$ ${fmtN(m24)} M en 24 meses, frente a US$ ${fmtN(cash)} M de efectivo e inversiones al cierre del trimestre. Cupón promedio ponderado por principal de los bonos a tasa fija de cada grupo.`
      : `Principal in US$ million by calendar year of maturity (same grouping as the section-07 profile). US$ ${fmtN(m12)} M matures in the 12 months after ${lastQ ? qLabel(lastQ) : '—'} and US$ ${fmtN(m24)} M within 24 months, against US$ ${fmtN(cash)} M of cash and investments at quarter-end. Average coupon is principal-weighted across each group's fixed-rate notes.`;
    html('schedSrc', `${t('src')}: ${tenKLink()} (${LANG === 'es' ? 'nota de deuda al 31 de mayo de 2026: 58 instrumentos, principal conciliado con el total bruto revelado' : 'debt footnote as of 31 May 2026: 58 instruments, principal reconciled to the disclosed gross total'}) · ${LANG === 'es' ? 'efectivo del balance del' : 'cash from the'} ${lastQ ? qLabel(lastQ) + (LANG === 'es' ? '' : ' balance sheet') : ''} ${relLink()} · ${asOfQ()}`);
    // ---- instrument book
    const today = new Date().toISOString().slice(0, 10);
    const yrsLeft = (iso) => (new Date(iso) - new Date(today)) / (365.25 * 864e5);
    const book = all.slice().sort((a, b) => (a.matures || '9999').localeCompare(b.matures || '9999')).map((i) => `<tr class="${i.matures && i.matures < today ? 'sub' : ''}"><td>${LS(i.name)}</td><td>${LS(i.type)}</td><td>${fmtDate(i.issued)}</td><td>${i.matures ? fmtDate(i.matures) : '—'}</td><td>${i.matures ? fmtN(yrsLeft(i.matures), 1) : '—'}</td><td>${fmtN(i.principalUsdM)}</td><td>${fmtPct(100 * (i.principalUsdM || 0) / total)}</td><td>${LS(i.rate) || '—'}</td></tr>`).join('');
    html('bookTable', `<table><thead><tr><th>${t('instrument')}</th><th>${LANG === 'es' ? 'Tipo' : 'Type'}</th><th>${LANG === 'es' ? 'Emisión' : 'Issued'}</th><th>${t('matures')}</th><th>${LANG === 'es' ? 'Años restantes' : 'Years left'}</th><th>${t('principal')}</th><th>%</th><th>${t('rate')}</th></tr></thead><tbody>${book}</tbody></table>`);
    el('bookSummary').textContent = LANG === 'es' ? `Ver los ${all.length} instrumentos (US$ ${fmtN(total)} M de principal)` : `View all ${all.length} instruments (US$ ${fmtN(total)} M principal)`;
    const matured = dated.filter((i) => i.matures < today);
    el('bookCap').textContent = LANG === 'es'
      ? `${all.length} instrumentos al 31 de mayo de 2026, US$ ${fmtN(total)} M de principal; cupón promedio ponderado de los bonos a tasa fija ${fmtPct(wavg(fixed), 2)}.${matured.length ? (matured.length === 1 ? ` El vencido desde entonces (US$ ${fmtN(matured[0].principalUsdM)} M) se muestra atenuado hasta que el 10-Q lo confirme como pagado.` : ` Los ${matured.length} vencidos desde entonces (US$ ${fmtN(matured.reduce((a, i) => a + i.principalUsdM, 0))} M) se muestran atenuados hasta que el 10-Q los confirme como pagados.`) : ''}`
      : `${all.length} instruments at 31 May 2026, US$ ${fmtN(total)} M principal; principal-weighted average coupon of the fixed-rate notes ${fmtPct(wavg(fixed), 2)}.${matured.length ? (matured.length === 1 ? ` The one that matured since (US$ ${fmtN(matured[0].principalUsdM)} M) is greyed until the 10-Q confirms repayment.` : ` The ${matured.length} that matured since (US$ ${fmtN(matured.reduce((a, i) => a + i.principalUsdM, 0))} M) are greyed until the 10-Q confirms repayment.`) : ''}`;
    html('bookSrc', `${t('src')}: ${all[0] && all[0].url ? `<a href="${all[0].url}" target="_blank" rel="noopener">${LANG === 'es' ? 'Formulario 10-K AF2026, nota de deuda' : 'Form 10-K FY2026, debt footnote'} ↗</a>` : ''} · ${LS(D2.instrumentsNote)}`);
    html('creditMeta', LANG === 'es' ? `Instrumentos del 10-K del AF2026 (${fmtDate(REF.updatedAt)}); calificaciones y apalancamiento en la sección 07.` : `Instruments from the FY2026 10-K (${fmtDate(REF.updatedAt)}); ratings and leverage in section 07.`);
    // ---- CDS
    const pts = CDS.points || [];
    const R = (CDS.recoveryPct ?? 40) / 100, T = CDS.tenor || 5;
    const pd = (bp) => 100 * (1 - Math.exp(-(bp / 10000) / (1 - R) * T));
    if (pts.length) {
      const last = pts[pts.length - 1]; const yAgo = pointAtOrBefore(pts, addDays(last[0], -365));
      mkChart('chartCds', { type: 'line', data: { labels: pts.map((p) => p[0]), datasets: [{ label: `CDS ${T}Y (bp)`, data: pts.map((p) => p[1]), borderColor: c[7], backgroundColor: c[7] + '1a', fill: true }] }, options: { plugins: { tooltip: { callbacks: { title: (x) => fmtDate(x[0].label), label: (x) => `${fmtN(x.parsed.y)} bp · PD ${fmtPct(pd(x.parsed.y))}` } } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i) => pts[i] ? pts[i][0].slice(0, 7) : '' }, grid: { display: false } }, y: { ticks: { callback: (v) => v + ' bp' }, beginAtZero: true } } } });
      html('cdsStats', [{ v: `${fmtN(last[1])} bp`, l: `${LANG === 'es' ? 'spread' : 'spread'} ${fmtDate(last[0])}` }, { v: fmtPct(pd(last[1])), l: LANG === 'es' ? `PD implícita a ${T} años (recuperación ${fmtPct(100 * R, 0)})` : `implied ${T}-yr PD (${fmtPct(100 * R, 0)} recovery)` }, { v: yAgo ? `${last[1] - yAgo[1] > 0 ? '+' : ''}${fmtN(last[1] - yAgo[1])} bp` : '—', l: t('oneY'), c: yAgo ? cls(yAgo[1] - last[1]) : '' }].map((s) => `<div class="stat"><div class="v ${s.c || ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
      el('cdsCap').textContent = LS(CDS.notes);
      html('cdsSrc', `${t('src')}: ${CDS.source} · ${fmtDate(CDS.updatedAt)}`);
      html('cdsNote', LANG === 'es' ? `<b>Lectura.</b> El spread es lo que cuesta asegurar US$ 10,000 de deuda senior de Oracle por año durante ${T} años, en puntos base; la PD implícita es la probabilidad acumulada de incumplimiento que ese precio implica bajo el supuesto de recuperación estándar. Léalo junto con las calificaciones (sección 07): el CDS reacciona antes que las agencias.` : `<b>Reading it.</b> The spread is the annual cost, in basis points, of insuring US$ 10,000 of Oracle senior debt for ${T} years; the implied PD is the cumulative default probability that price implies under the standard recovery assumption. Read it with the ratings (section 07): the CDS moves before the agencies do.`);
    } else {
      el('cdsCap').textContent = t('pending');
      html('cdsStats', '');
      html('cdsNote', LANG === 'es'
        ? `<b>Pendiente del conector de FactSet.</b> Contrato listo en <code>tools/oracle/data/cds.json</code>: <code>points</code> = [fecha, spread en pb] del CDS senior a ${T} años (cláusula ${CDS.docClause || 'XR14'}), <code>recoveryPct</code> = ${fmtN(100 * R)}. Al llenarse, esta tarjeta muestra la serie, el spread más reciente, su variación a 1 año y la probabilidad de incumplimiento implícita PD = 1 − exp(−spread ÷ (1 − recuperación) × ${T}). Referencia: un spread de 100 pb equivale a ≈ ${fmtPct(pd(100))} de PD acumulada a ${T} años; 200 pb ≈ ${fmtPct(pd(200))}.`
        : `<b>Pending the FactSet connector.</b> Contract ready in <code>tools/oracle/data/cds.json</code>: <code>points</code> = [date, spread in bp] of the ${T}-year senior CDS (${CDS.docClause || 'XR14'} clause), <code>recoveryPct</code> = ${fmtN(100 * R)}. Once filled, this card shows the series, the latest spread, its 1-year change and the implied default probability PD = 1 − exp(−spread ÷ (1 − recovery) × ${T}). For reference, a 100 bp spread equals ≈ ${fmtPct(pd(100))} cumulative ${T}-year PD; 200 bp ≈ ${fmtPct(pd(200))}.`);
      html('cdsSrc', `${t('src')}: ${LANG === 'es' ? 'FactSet (conector pendiente de autorización)' : CDS.source} · ${t('pending')}`);
      if (hasChart() && charts.chartCds) { charts.chartCds.destroy(); delete charts.chartCds; }
    }
  }

  // ================= 07 DEBT =================
  // Maturity buckets shared by the section-07 chart and the section-11 schedule: calendar years 2026 … 2031 one
  // by one, then 2032–2036, then after 2036. Commercial paper (no fixed maturity) is excluded and shown separately.
  const MAT_BUCKETS = [['2026', 2026, 2026], ['2027', 2027, 2027], ['2028', 2028, 2028], ['2029', 2029, 2029], ['2030', 2030, 2030], ['2031', 2031, 2031], ['2032–2036', 2032, 2036], ['> 2036', 2037, 9999]];
  function maturityBuckets(ins) {
    const today = new Date().toISOString().slice(0, 10);
    return MAT_BUCKETS.map(([label, lo, hi]) => {
      const arr = ins.filter((i) => { const y = +i.matures.slice(0, 4); return y >= lo && y <= hi; });
      const principal = arr.reduce((a, i) => a + (i.principalUsdM || 0), 0);
      const fixed = arr.filter((i) => i.ratePct != null && !/floating|FRN/i.test(typeof i.type === 'string' ? i.type : (i.type && i.type.en) || ''));
      const wp = fixed.reduce((a, i) => a + i.principalUsdM, 0);
      return { label, lo, hi, items: arr, n: arr.length, principal, coupon: wp ? fixed.reduce((a, i) => a + i.ratePct * i.principalUsdM, 0) / wp : null, matured: arr.length > 0 && arr.every((i) => i.matures < today) };
    });
  }
  function renderDebt() {
    const qs = Q.slice(-lastN()).filter((q) => q.bs); const c = SERIES();
    const nds = qs.map((q) => ({ q, nd: netDebt(q), l: ltmFor(q) }));
    mkChart('chartNetDebt', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { label: t('grossDebt'), data: nds.map((x) => (x.nd ? x.nd.gross : null)), backgroundColor: c[0], stack: 'a' },
      { label: '− ' + t('cash'), data: nds.map((x) => (x.nd ? -x.nd.cash : null)), backgroundColor: c[2], stack: 'a' },
      { label: t('nd'), type: 'line', data: nds.map((x) => (x.nd ? x.nd.net : null)), borderColor: c[7], backgroundColor: c[7], pointRadius: 3 }] },
      options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM() } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    const levs = nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null));
    // Axis floor at 2.0x (or lower, in 0.5x steps, if the series dips below it) so the line uses the plot area.
    const levMin = Math.min(2, Math.floor(Math.min(...levs.filter((v) => v != null)) * 2) / 2);
    mkChart('chartLeverage', { type: 'line', data: { labels: qs.map(qLabel), datasets: [{ label: t('lev'), data: levs, borderColor: c[1], backgroundColor: c[1], pointRadius: 3, spanGaps: true }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y, 2)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + 'x', stepSize: 0.5 }, min: levMin } } } });
    html('debtSrc', `${t('src')}: ${LANG === 'es' ? 'balance y estado de resultados de cada comunicado de resultados de Oracle' : "balance sheet and income statement of each Oracle earnings release"} · ${relLink()} · ${asOfQ()}<br>${LANG === 'es' ? `Deuda total = notas por pagar y otros préstamos (corto y largo plazo) del balance publicado en cada comunicado; efectivo = efectivo, equivalentes e inversiones negociables del mismo balance. EBITDA UDM = utilidad de operación GAAP + D&A de los cuatro trimestres previos.` : `Total debt = notes payable and other borrowings (current and non-current) from the balance sheet in each release; cash = cash, equivalents and marketable securities from the same balance sheet. LTM EBITDA = GAAP operating income + D&A of the trailing four quarters.`}`);
    const D2 = REF.debt || {};
    const ins = (D2.instruments || []).filter((i) => i.matures);
    const mb = maturityBuckets(ins);
    mkChart('chartMaturity', { type: 'bar', data: { labels: mb.map((b) => b.label), datasets: [{ label: t('principal'), data: mb.map((b) => b.principal), backgroundColor: mb.map((b) => (b.matured ? c[3] : c[0])) }] }, options: { plugins: { tooltip: { callbacks: { label: (x) => `US$ ${fmtN(x.parsed.y)} M · ${mb[x.dataIndex].n} ${mb[x.dataIndex].n === 1 ? (LANG === 'es' ? 'instrumento' : 'instrument') : (LANG === 'es' ? 'instrumentos' : 'instruments')}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 40, borderWidth: 0 } } } });
    const cp = (D2.instruments || []).find((i) => !i.matures);
    html('maturitySrc', `${t('src')}: ${tenKLink()} (${LANG === 'es' ? 'nota de deuda, al 31 de mayo de 2026' : 'debt footnote, as of 31 May 2026'}) · ${LANG === 'es' ? 'años calendario de vencimiento; la barra atenuada (2026) venció en julio y espera la confirmación de pago del 10-Q' : 'calendar years of maturity; the shaded bar (2026) matured in July and awaits the 10-Q confirmation of repayment'}${cp ?` · ${LANG === 'es' ? 'excluye papel comercial' : 'excludes commercial paper'} (US$ ${fmtN(cp.principalUsdM)} M)` : ''}`);
    const ratings = (D2.ratings || []).map((r) => `<tr><td>${r.agency}</td><td>${r.rating}</td><td>${LS(r.outlook)}</td><td>${LS(r.scope)}</td><td>${fmtDate(r.date)}</td><td class="muted small">${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${LS(r.source)}</a>` : LS(r.source)}</td></tr>`).join('');
    html('ratingsTable', `<table><thead><tr><th>${t('rating')}</th><th>${LANG === 'es' ? 'Nivel' : 'Level'}</th><th>${LANG === 'es' ? 'Perspectiva' : 'Outlook'}</th><th>${LANG === 'es' ? 'Alcance' : 'Scope'}</th><th>${t('date')}</th><th>${t('src')}</th></tr></thead><tbody>${ratings}</tbody></table>`);
    const instr = (D2.instruments || []).slice().sort((a, b) => (a.matures || '9999').localeCompare(b.matures || '9999')).map((i) => `<tr><td>${LS(i.name)}</td><td>${LS(i.type)}</td><td>${fmtDate(i.issued)}</td><td>${i.matures ? fmtDate(i.matures) : '—'}</td><td>${fmtN(i.principalUsdM)}</td><td>${LS(i.rate) || '—'}</td></tr>`).join('');
    html('instrTable', `<table><thead><tr><th>${t('instrument')}</th><th>${LANG === 'es' ? 'Tipo' : 'Type'}</th><th>${LANG === 'es' ? 'Emisión' : 'Issued'}</th><th>${t('matures')}</th><th>${t('principal')}</th><th>${t('rate')}</th></tr></thead><tbody>${instr}</tbody></table>`);
    el('instrSummary').textContent = LANG === 'es' ? `Ver los ${(D2.instruments || []).length} instrumentos (US$ ${fmtN((D2.instruments || []).reduce((a, i) => a + (i.principalUsdM || 0), 0))} M de principal)` : `View all ${(D2.instruments || []).length} instruments (US$ ${fmtN((D2.instruments || []).reduce((a, i) => a + (i.principalUsdM || 0), 0))} M principal)`;
    el('instrCap').textContent = LANG === 'es' ? `Calificaciones de las agencias (comunicados de acción de calificación); instrumentos de la nota de deuda del 10-K (data/reference.js, actualizado ${fmtDate(REF.updatedAt)})` : `Agency ratings (rating-action releases); instruments from the 10-K debt footnote (data/reference.js, updated ${fmtDate(REF.updatedAt)})`;
    html('instrNote', LS(D2.instrumentsNote));
    const lastRating = (D2.ratings || []).map((r) => r.date).filter(Boolean).sort().slice(-1)[0];
    html('instrSrc', `${t('src')}: ${LANG === 'es' ? 'calificaciones: comunicados de acción de calificación de cada agencia (enlaces por fila)' : 'ratings: each agency\'s rating-action release (links per row)'}${lastRating ? ` · ${LANG === 'es' ? 'última acción' : 'latest action'} ${fmtDate(lastRating)}` : ''} · ${LANG === 'es' ? 'instrumentos' : 'instruments'}: ${tenKLink()} (${LANG === 'es' ? 'nota de deuda, al 31 de mayo de 2026' : 'debt footnote, as of 31 May 2026'}) · data/reference.js ${fmtDate(REF.updatedAt)}`);
  }

  // ================= 08 DIVIDENDS =================
  function renderDividends() {
    const byFy = {}; for (const q of Q) if (q.kpi.dps != null) byFy[q.fy] = (byFy[q.fy] || 0) + q.kpi.dps;
    const fys = Object.keys(byFy).map(Number).sort();
    const c = SERIES();
    mkChart('chartDps', { type: 'bar', data: { labels: fys.map((y) => fyLabel(y)), datasets: [{ label: t('dps'), data: fys.map((y) => byFy[y]), backgroundColor: c[0] }] }, options: { plugins: { tooltip: { callbacks: { label: (x) => 'US$ ' + fmtN(x.parsed.y, 2) } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 2) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 28, borderWidth: 0 } } } });
    const partial = fys.filter((y) => Q.filter((q) => q.fy === y && q.kpi.dps != null).length < 4);
    html('dpsSrc', `${t('src')}: ${LANG === 'es' ? 'dividendos trimestrales declarados en cada comunicado de resultados, sumados por año fiscal' : 'quarterly dividends declared in each earnings release, summed by fiscal year'} · ${relLink()}${partial.length ? ` · ${LANG === 'es' ? 'años parciales' : 'partial years'}: ${partial.map(fyLabel).join(', ')}` : ''} · ${asOfQ()}`);
    const rows = fys.map((y) => { const fy = Y.find((yy) => yy.fy === y); const eps = fy && fy.is ? fy.is.epsDiluted : null; const q4 = qById[`${y}Q4`]; const pEnd = q4 ? pointAtOrBefore(orclPx, qEndDate(q4)) : null; const n = Q.filter((q) => q.fy === y && q.kpi.dps != null).length; return `<tr><td>${fyLabel(y)}${n < 4 ? `<span class="sub">${n} ${LANG === 'es' ? 'trimestres' : 'quarters'}</span>` : ''}</td><td>${fmtN(byFy[y], 2)}</td><td>${eps ? fmtN(eps, 2) : '—'}</td><td>${eps && n === 4 ? fmtPct(100 * byFy[y] / eps, 0) : '—'}</td><td>${pEnd ? fmtN(pEnd[1], 2) : '—'}</td><td>${pEnd && n === 4 ? fmtPct(100 * byFy[y] / pEnd[1]) : '—'}</td></tr>`; });
    html('dpsTable', `<table><thead><tr><th>${LANG === 'es' ? 'Año fiscal' : 'Fiscal year'}</th><th>${t('dps')}</th><th>${LANG === 'es' ? 'UPA GAAP (US$)' : 'GAAP EPS (US$)'}</th><th>${t('payout')}</th><th>${LANG === 'es' ? 'Precio al cierre del AF' : 'FY-end price'}</th><th>${t('yield')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('dpsCap').textContent = LANG === 'es' ? 'Dividendo declarado por acción sumado por año fiscal (junio–mayo). Razón de pago = dividendo del año / UPA diluida GAAP del año fiscal; rendimiento sobre el cierre del 31 de mayo.' : 'Dividend declared per share summed by fiscal year (June–May). Payout = year\'s dividend / GAAP diluted EPS of the fiscal year; yield on the 31 May close.';
    const decl = (REF.dividends || []).slice(-4).reverse();
    html('dpsNote', decl.map((d) => `<b>${qLabelId(d.quarter)}</b> (${fmtDate(d.declared)}): US$ ${fmtN(d.dps, 2)} ${LANG === 'es' ? 'por acción' : 'per share'} · ${LANG === 'es' ? 'registro' : 'record'} ${fmtDate(d.record)} · ${LANG === 'es' ? 'pago' : 'payment'} ${fmtDate(d.payment)} <span class="muted">(${link(d.source, t('release'))})</span>`).join('<br>') + `<br><span class="muted">${LANG === 'es' ? 'El consejo declara el dividendo con cada reporte trimestral; no requiere aprobación de asamblea.' : 'The board declares the dividend with each quarterly report; no shareholder-meeting approval is required.'}</span>`);
    html('dpsDetailSrc', `${t('src')}: ${LANG === 'es' ? 'declaraciones de dividendos en los comunicados de resultados (enlaces arriba)' : 'dividend declarations in the earnings releases (links above)'} · ${LANG === 'es' ? 'UPA GAAP anual: Formularios 10-K' : 'annual GAAP EPS: Forms 10-K'} · ${LANG === 'es' ? 'precio al cierre del AF' : 'FY-end price'}: ${extLink(NASDAQ_URL, 'Nasdaq')} · ${asOfQ()}`);
  }

  // ================= 09 AI BUILDOUT / 10 RPO =================
  function renderAi() {
    const A = REF.ai || {};
    html('aiProse', `<p><b>${LANG === 'es' ? 'Qué es.' : 'What it is.'}</b> ${L(A.prose)}</p><p><b>${LANG === 'es' ? 'Qué cambia en el modelo.' : 'What changes in the model.'}</b></p><ul>${(LS(A.impact) || []).map((x) => `<li>${x}</li>`).join('')}</ul>`);
    html('aiFacts', (A.facts || []).map((f) => `<div class="fact"><div class="v">${f.v}</div><div class="l">${LANG === 'es' ? f.label_es : f.label_en}${f.source ? ` · <span class="muted">${link(f.source, LANG === 'es' ? 'fuente' : 'source')}</span>` : ''}</div></div>`).join(''));
    html('aiTimeline', (A.timeline || []).map((e) => `<li><b>${fmtDate(e.date)}</b>${L(e)}</li>`).join(''));
    html('aiSrc', `${t('src')}: ${(A.facts || []).some((f) => f.source) ? (LANG === 'es' ? 'enlaces en cada cifra' : 'links on each figure') : (LS(A.sources) || []).join(' · ')} · ${relLink()} · ${irLink()} · ${asOfQ()} · data/reference.js ${fmtDate(REF.updatedAt)}`);
    html('aiPending', LS(A.pending));
    // long-range targets from the calls / analyst meeting, if the guidance file carries them
    const tg = GV.filter((v) => v.multiYear && v.multiYear.oci_revenue_usd_bn);
    const mm = tg.length ? tg[tg.length - 1].multiYear : null;
    html('aiTargets', mm ? `<div class="card" style="margin-top:16px"><h3>${LANG === 'es' ? 'Objetivos de ingresos de OCI comunicados por la administración' : 'OCI revenue targets stated by management'}</h3><div class="tblwrap"><table><thead><tr>${Object.keys(mm.oci_revenue_usd_bn).map((y) => `<th>${y}</th>`).join('')}</tr></thead><tbody><tr>${Object.values(mm.oci_revenue_usd_bn).map((v) => `<td>US$ ${fmtN(v)} ${LANG === 'es' ? 'mil M' : 'bn'}</td>`).join('')}</tr></tbody></table></div><p class="chart-src">${t('src')}: ${gLink(tg[tg.length - 1], `${LANG === 'es' ? 'transcripción / comunicado' : 'transcript / release'} (${fmtDate(tg[tg.length - 1].date)})`)}${mm.rpo_expectation ? ` · ${mm.rpo_expectation}` : ''}</p></div>` : '');
    const R = REF.rpo || {};
    html('rpoProse', `<p><b>${LANG === 'es' ? 'En una frase.' : 'In one sentence.'}</b> ${L(R.plain)}</p><p class="quote">${L(R.quote)}<span class="who">${R.quoteSource ? link(R.quoteSource, LANG === 'es' ? `Formulario 10-Q de Oracle (${fmtDate(R.quoteSource.date)})` : R.quoteSource.title) : ''}</span></p><p>${L(R.caution)}</p>`);
    const sched = (R.schedule || []).map((s) => `<tr><td>${LANG === 'es' ? s.bucket_es : s.bucket_en}</td><td>${fmtPct(s.pct, 0)}</td><td>US$ ${fmtN(s.amount_bn)} ${LANG === 'es' ? 'mil M' : 'bn'}</td></tr>`).join('');
    html('rpoTable', `<table><thead><tr><th>${LANG === 'es' ? 'Horizonte de reconocimiento' : 'Recognition horizon'}</th><th>%</th><th>${LANG === 'es' ? 'Monto' : 'Amount'}</th></tr></thead><tbody>${sched}</tbody></table>`);
    el('rpoCap').textContent = R.latest ? (LANG === 'es' ? `RPO total al ${R.latestQuarter}: US$ ${fmtN(R.latest / 1000, 0)} mil M, según el calendario que Oracle revela en el 10-Q` : `Total RPO at ${R.latestQuarter}: US$ ${fmtN(R.latest / 1000, 0)} bn, per the schedule Oracle discloses in the 10-Q`) : '';
    html('rpoCaution', `<b>${LANG === 'es' ? 'Lectura.' : 'Reading it.'}</b> ${LANG === 'es' ? 'El RPO es un indicador adelantado, no ingreso asegurado: su conversión depende de la capacidad de centros de datos que Oracle logre construir y energizar, por eso se lee junto con el capex de la sección 03.' : 'RPO is a leading indicator, not assured revenue: its conversion depends on the data-center capacity Oracle manages to build and energise, which is why it is read alongside the capex in section 03.'}`);
    html('rpoSrc', `${t('src')}: ${R.quoteSource ? link(R.quoteSource, (LANG === 'es' ? `Formulario 10-Q de Oracle (${fmtDate(R.quoteSource.date)})` : R.quoteSource.title) + ' ↗') : ''} · ${relLink()} (RPO) · ${R.latestQuarter ? `${LANG === 'es' ? 'al' : 'as of'} ${R.latestQuarter}` : asOfQ()}`);
  }

  // ================= 09c UNIT ECONOMICS + RPO RECOGNITION PACE =================
  function renderUnitEconomics() {
    if (!BO || !BO.unitEconomics || !el('aiUnitTable')) return; const U = BO.unitEconomics, es = LANG === 'es';
    const L4 = lastLTM, cq = (BO.capacity && BO.capacity.quarters) || [], ltmIds = L4 ? L4.quarters : [];
    const mwRows = cq.filter((x) => { const q = boQ(x.id); return q && ltmIds.includes(`${q.fy}Q${q.q}`); });
    const mwLtm = mwRows.reduce((a, x) => a + x.mw, 0), mwFull = mwRows.length === ltmIds.length;
    const capexLtm = L4 && L4.cf && L4.cf.capex != null ? Math.abs(L4.cf.capex) : null;
    const capexPerMw = capexLtm && mwLtm ? capexLtm / mwLtm : null;
    const gl = U.gpu_life || {}, fm = U.funding_mix || {}, cn = U.concentration || {}, ct = U.contract_terms || {}, gu = (BO.gpu && BO.gpu.utilization) || [], u = gu[gu.length - 1];
    const rows = [
      [es ? 'Capex UDM (US$ M)' : 'LTM capex (US$ M)', capexLtm != null ? fmtM(capexLtm) : '—', es ? 'estado de flujos, cuatro trimestres sumados' : 'cash-flow statement, four quarters summed', L4 ? L4.id : ''],
      [es ? 'MW entregados en los mismos cuatro trimestres' : 'MW delivered over the same four quarters', mwLtm ? fmtN(mwLtm) + (mwFull ? '' : ' *') : '—', es ? 'llamadas de resultados (sección 03)' : 'earnings calls (section 03)', L4 ? L4.id : ''],
      [es ? 'Capex por MW entregado (US$ M por MW, derivado)' : 'Capex per MW delivered (US$ M per MW, derived)', capexPerMw ? fmtN(capexPerMw, 1) : '—', es ? 'Oracle no separa el capex ni los MW entre sitios propios y arrendados: todo el capex sobre todos los MW entregados' : 'Oracle does not split capex or MW between owned and leased sites: total capex over total MW delivered', L4 ? L4.id : ''],
      [es ? 'Ingresos por MW energizado' : 'Revenue per energized MW', es ? 'no derivable' : 'not derivable', es ? 'Oracle no divulga los MW energizados totales (solo las entregas desde el 2T26) ni ingresos por sitio' : 'Oracle discloses neither total energized MW (only deliveries since 2Q26) nor revenue by site', ''],
      [es ? 'Utilización de la flota de GPU' : 'GPU-fleet utilization', u ? fmtPct(u.pct) : '—', es ? 'según la llamada (sección 03)' : 'per the call (section 03)', u ? boLabel(u.id) : ''],
      [es ? 'Vida útil de servidores y GPU' : 'Servers and GPUs, useful life', `${gl.useful_life_years} ${es ? 'años' : 'years'}`, es ? gl.text_es : gl.text_en, lastQ ? qLabel(lastQ) : ''],
      [es ? 'Prima de precio en renovaciones de GPU' : 'GPU renewal price premium', `+${gl.renewal_premium_pct}%`, es ? gl.renewal_text_es : gl.renewal_text_en, boLabel('FY2027Q1')],
      [es ? 'Prepagos de clientes recibidos (US$ M)' : 'Customer prepayments received (US$ M)', fmtM(fm.prepayments_1q27_usd_m), es ? fm.prepayments_text_es : fm.prepayments_text_en, boLabel('FY2027Q1')],
      [es ? 'Prepagado · BYOH · financiado por Oracle' : 'Prepaid · BYOH · Oracle-funded', es ? 'no divulgado' : 'not disclosed', es ? fm.split_text_es : fm.split_text_en, boLabel('FY2026Q4')],
      [es ? 'Efecto en capital invertido y ROIC' : 'Effect on invested capital and ROIC', es ? 'no cuantificable' : 'not quantifiable', es ? 'Los contratos prepagados y BYOH reducen el capex que financia Oracle; sin la división del RPO por tipo de financiamiento no puede calcularse un ROIC por tipo con datos públicos' : 'Prepaid and BYOH contracts reduce Oracle-funded capex; without the RPO split by funding type, a ROIC by type cannot be computed from public data', ''],
      [es ? 'Exposición a clientes nombrados' : 'Named-customer exposure', es ? 'ningún cliente ≥ 10% de ingresos' : 'no customer ≥ 10% of revenue', `${es ? cn.oracle_text_es : cn.oracle_text_en} ${es ? cn.third_party_text_es : cn.third_party_text_en}`, fyLabel(2026)],
      [es ? 'Términos de cancelación' : 'Cancellation terms', es ? 'no divulgados' : 'not disclosed', es ? ct.cancellation_es : ct.cancellation_en, fyLabel(2026)],
    ];
    html('aiUnitTable', `<table><thead><tr><th>${t('metric')}</th><th>${es ? 'Valor' : 'Value'}</th><th>${es ? 'Base' : 'Basis'}</th><th>${es ? 'Al' : 'As of'}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td class="small muted">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    el('aiUnitCap').textContent = (es ? 'Lo que Oracle divulga sobre la economía unitaria de la expansión y lo que puede derivarse; las filas marcadas "derivado" se calculan a partir de cifras publicadas y las marcadas "no divulgado" o "no derivable" indican lo que la información pública no permite calcular.' : 'What Oracle discloses about the unit economics of the buildout and what can be derived; rows marked "derived" are computed from published figures and rows marked "not disclosed" or "not derivable" flag what public information does not support.') + (mwFull ? '' : (es ? ' * algún trimestre sin cifra de MW.' : ' * a quarter without an MW figure.'));
    html('aiUnitSrc', `${t('src')}: ${relLink()} · ${gl.source ? extLink(gl.source.url, es ? '10-Q 1T27 (nota 3)' : '1Q27 10-Q (Note 3)') : ''} · ${cn.source ? extLink(cn.source.url, 'S&P Global Ratings, 9 Jul 2026') : ''} · ${ct.source ? extLink(ct.source.url, es ? '10-K AF2026 (nota 1)' : 'FY2026 10-K (Note 1)') : ''} · ${irLink()} · ${asOfQ()}`);
    const gp = U.gpu_list_prices || { items: [] };
    html('aiGpuPrices', `<table><thead><tr><th>GPU</th><th>US$ / GPU-${es ? 'hora' : 'hour'}</th></tr></thead><tbody>${(gp.items || []).map((g) => `<tr><td>${g.gpu}</td><td><b>${fmtN(g.usd_per_gpu_hour, 2)}</b></td></tr>`).join('')}</tbody></table>`);
    html('aiGpuSrc', `${t('src')}: ${gp.source ? extLink(gp.source.url, es ? 'lista de precios pública de OCI (API)' : 'public OCI price list (API)') : ''} · ${es ? gp.note_es : gp.note_en} · ${es ? 'consultado el' : 'fetched'} ${fmtDate(gp.as_of)}`);
  }
  function renderRpoRecognition() {
    if (!BO || !BO.rpoRecognition || !el('rpoRecTable')) return; const R = BO.rpoRecognition, es = LANG === 'es', ser = R.series || [];
    html('rpoRecTable', `<table><thead><tr><th>${es ? 'Trimestre' : 'Quarter'}</th><th>RPO (US$ ${es ? 'mil M' : 'bn'})</th><th>${es ? '≤ 12 meses' : '≤ 12 months'}</th><th>${es ? 'Ingreso implícito a 12 meses (US$ mil M, derivado)' : 'Implied 12-month revenue (US$ bn, derived)'}</th><th>${es ? 'Meses 13–36' : 'Months 13–36'}</th><th>${es ? 'Meses 37–60' : 'Months 37–60'}</th><th>${t('src')}</th></tr></thead><tbody>${ser.map((x) => `<tr><td><b>${boLabel(x.quarter)}</b></td><td>${fmtN(x.rpo_bn, 1)}</td><td><b>${x.m12_pct}%</b></td><td>${fmtN(x.rpo_bn * x.m12_pct / 100, 1)}</td><td>${x.m13_36_pct}%</td><td>${x.m37_60_pct}%</td><td class="small">${x.source ? extLink(x.source.url, x.source.title.replace(/^10-(Q|K), (quarter|fiscal year) ended /, '10-$1, ')) : ''}</td></tr>`).join('')}</tbody></table>`);
    el('rpoRecCap').textContent = es ? R.note_es : R.note_en;
    const f = ser[0], l = ser[ser.length - 1];
    html('rpoRecSrc', `${t('src')}: ${es ? 'Formularios 10-Q y 10-K de Oracle, nota de ingresos (enlaces por fila)' : 'Oracle Forms 10-Q and 10-K, revenue note (links per row)'}${f && l ? ` · ${boLabel(f.quarter)} → ${boLabel(l.quarter)}` : ''} · ${asOfQ()}`);
  }

  // ================= 08b PREFERRED STOCK, FUNDING PLAN, PURCHASE OBLIGATIONS =================
  const OB = window.ORCL_OBLIG || null;
  const PL = window.ORCL_PEER_LEV || null;
  const obSrc = (k) => (OB && OB.sources && OB.sources[k]) || null;
  function renderCapital() {
    if (!OB || !el('dpsCapital')) return; const es = LANG === 'es', pf = OB.preferred || {}, fp = OB.funding_plan || {}, po = OB.purchase_obligations || {};
    const items = (fp.items || []).map((x) => { const S = obSrc(x.source); return `<tr class="${x.kind === 'plan' ? 'sub' : ''}"><td>${x.when}</td><td>${es ? x.es : x.en}${x.note_en ? `<span class="sub">${es ? x.note_es : x.note_en}</span>` : ''}</td><td><b>${fmtN(x.usd_bn, 1)}</b></td><td>${x.kind === 'plan' ? (es ? 'plan' : 'plan') : (es ? 'ejecutado' : 'done')}</td><td class="small">${S ? extLink(S.url, S.title.replace(/^Oracle /, '').replace(/ for the quarter ended /, ' ')) : ''}</td></tr>`; }).join('');
    const conv = pf.shares_if_converted_m || {};
    html('dpsCapital', `<div class="grid-2"><div><h4>${es ? 'Acciones preferentes convertibles obligatorias' : 'Mandatory convertible preferred stock'}</h4><p class="small">${es ? pf.text_es : pf.text_en}</p><div class="stat-row">${[
      { v: `US$ ${fmtN(pf.dividend_quarterly_usd_m, 2)} M`, l: es ? `dividendo preferente trimestral (6.50% × US$5 mil M ÷ 4); US$ ${fmtN(pf.dividend_paid_1q27_usd_m)} M en el estado de resultados del 1T27` : `quarterly preferred dividend (6.50% × US$5 bn ÷ 4); US$ ${fmtN(pf.dividend_paid_1q27_usd_m)} M in the 1Q27 income statement` },
      { v: fmtDate(pf.mandatory_conversion_date), l: es ? `conversión obligatoria en ${fmtN(conv.min, 1)}–${fmtN(conv.max, 1)} millones de acciones comunes (a ≥ US$ ${fmtN(pf.threshold_appreciation_price_usd, 2)} / ≤ US$ ${fmtN(pf.initial_price_usd, 2)})` : `mandatory conversion into ${fmtN(conv.min, 1)}–${fmtN(conv.max, 1)} million common shares (at ≥ US$ ${fmtN(pf.threshold_appreciation_price_usd, 2)} / ≤ US$ ${fmtN(pf.initial_price_usd, 2)})` },
    ].map((x) => `<div class="stat"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join('')}</div></div><div><h4>${es ? 'Plan de financiamiento: anunciado y ejecutado (US$ mil M)' : 'Funding plan: announced and executed (US$ bn)'}</h4><div class="tblwrap"><table><thead><tr><th>${es ? 'Cuándo' : 'When'}</th><th>${es ? 'Qué' : 'What'}</th><th>US$ ${es ? 'mil M' : 'bn'}</th><th>${es ? 'Estado' : 'Status'}</th><th>${t('src')}</th></tr></thead><tbody>${items}</tbody></table></div><div class="callout"><b>${es ? 'Conciliación.' : 'Reconciliation.'}</b> ${es ? fp.reconciliation_es : fp.reconciliation_en}</div><p class="small muted">${es ? `Obligaciones de compra de energía, equipo y otros: US$ ${fmtN(po.total / 1000, 1)} mil M no cancelables, calendario por año fiscal en la sección 11.` : `Purchase obligations for power, equipment and other: US$ ${fmtN(po.total / 1000, 1)} bn non-cancelable, schedule by fiscal year in section 11.`}</p></div></div>`);
    const s424 = obSrc(pf.source), s10q = obSrc('10q_1q27');
    html('dpsCapitalSrc', `${t('src')}: ${s424 ? extLink(s424.url, es ? 'prospecto 424B5 de las preferentes (feb 2026)' : 'preferred-stock prospectus 424B5 (Feb 2026)') : ''} · ${s10q ? extLink(s10q.url, es ? '10-Q 1T27 (capital y flujos)' : '1Q27 10-Q (equity and cash flows)') : ''} · ${es ? 'transcripciones de las llamadas 3T26 y 4T26' : '3Q26 and 4Q26 call transcripts'} · ${irLink()} · ${asOfQ()}`);
  }

  // ================= 11 OFF-BALANCE-SHEET FINANCING =================
  // Lease-adjusted leverage from the model's own net debt and LTM EBITDA plus the 10-Q lease note; shared with the deck.
  function obligStats() {
    if (!OB || !lastLTM || !lastQ) return null;
    const nd = netDebt(lastQ); if (!nd || !lastLTM.is.ebitda) return null;
    const Lz = OB.leases || {}, cost = Lz.cost || {};
    const olc = cost.operating_lease_cost_ltm != null ? cost.operating_lease_cost_ltm : (cost.operating_lease_cost_fy2026 || 0) - (cost.operating_lease_cost_1q26 || 0) + (cost.operating_lease_cost_1q27 || 0);
    const eb = lastLTM.is.ebitda, opL = Lz.operating_liabilities_total || 0, finL = Lz.finance_liabilities_total || 0, unc = ((Lz.uncommenced && Lz.uncommenced.usd_bn) || 0) * 1000;
    const ebitdar = eb + olc, adjDebt = nd.net + opL + finL;
    return { net: nd.net, gross: nd.gross, cash: nd.cash, ebitda: eb, olc, ebitdar, opL, finL, unc, adjDebt, ndEbitda: nd.net / eb, leaseAdj: adjDebt / ebitdar, commit: (adjDebt + unc) / ebitdar };
  }
  // Oracle first, then the peers, with the same two ratios derived from each peer's SEC XBRL facts.
  function peerLeverage() {
    const S = obligStats(); const rows = [];
    if (S) rows.push({ name: 'Oracle', ticker: 'ORCL', bs: qEndDate(lastQ), fy: lastLTM.id, net: S.net, opL: S.opL, finL: S.finL, ebitda: S.ebitda, olc: S.olc, ndEbitda: S.ndEbitda, leaseAdj: S.leaseAdj, basis: 'operating_income', self: true });
    for (const p of (PL && PL.peers) || []) {
      if (p.error || !p.balance_sheet) continue; const b = p.balance_sheet, f = p.fiscal_year || {}; const v = (x) => (x ? x.usd_m : null);
      const debt = (v(b.debt_noncurrent) || 0) + (v(b.debt_current) || 0), cash = (v(b.cash) || 0) + (v(b.short_term_investments) || 0), net = debt - cash;
      const opL = v(b.operating_lease_liabilities), finL = v(b.finance_lease_liabilities) || 0, ebitda = f.ebit && f.depreciation_amortization ? f.ebit.usd_m + f.depreciation_amortization.usd_m : null, olc = v(f.operating_lease_cost);
      rows.push({ name: p.name, ticker: p.ticker, bs: p.balance_sheet_date, fy: p.fiscal_year_end, net, opL, finL, ebitda, olc, basis: f.ebit ? f.ebit.basis : null, ndEbitda: ebitda > 0 ? net / ebitda : null, leaseAdj: ebitda > 0 && opL != null && olc != null ? (net + opL + finL) / (ebitda + olc) : null, src: p.source });
    }
    return rows;
  }
  function renderObligations() {
    if (!OB || !el('obTable')) return; const es = LANG === 'es', c = SERIES(), S = obligStats(); const Lz = OB.leases || {}, bs = OB.balance_sheet || {}, un = Lz.uncommenced || {}, po = OB.purchase_obligations || {}, ga = OB.guarantees || {};
    const q10 = obSrc(Lz.source || '10q_1q27'); const tenQ = q10 ? extLink(q10.url, es ? '10-Q 1T27' : '1Q27 10-Q') : '';
    html('obMeta', es ? `Notas de arrendamientos y de compromisos del Formulario 10-Q al ${fmtDate(OB.as_of)}${q10 && q10.filed ? ` (presentado el ${fmtDate(q10.filed)})` : ''}; deuda neta y EBITDA UDM del modelo (${lastLTM ? lastLTM.id : ''}). Las tres razones son derivadas.` : `Leases and commitments notes of the Form 10-Q at ${fmtDate(OB.as_of)}${q10 && q10.filed ? ` (filed ${fmtDate(q10.filed)})` : ''}; net debt and LTM EBITDA from the model (${lastLTM ? lastLTM.id : ''}). All three ratios are derived.`);
    if (S) html('obStats', [
      { v: fmtX(S.ndEbitda, 2), l: es ? `deuda neta / EBITDA UDM, como se reporta (US$ ${fmtN(S.net / 1000, 1)} mil M ÷ US$ ${fmtN(S.ebitda / 1000, 1)} mil M)` : `net debt / LTM EBITDA, as reported (US$ ${fmtN(S.net / 1000, 1)} bn ÷ US$ ${fmtN(S.ebitda / 1000, 1)} bn)` },
      { v: fmtX(S.leaseAdj, 2), l: es ? `ajustado por arrendamientos: (deuda neta + arrend. operativos US$ ${fmtN(S.opL / 1000, 1)} + financieros US$ ${fmtN(S.finL / 1000, 1)} mil M) ÷ EBITDAR US$ ${fmtN(S.ebitdar / 1000, 1)} mil M` : `lease-adjusted: (net debt + operating leases US$ ${fmtN(S.opL / 1000, 1)} bn + finance leases US$ ${fmtN(S.finL / 1000, 1)} bn) ÷ EBITDAR US$ ${fmtN(S.ebitdar / 1000, 1)} bn` },
      { v: fmtX(S.commit, 1), l: es ? `incluyendo compromisos: suma los US$ ${fmtN(S.unc / 1000, 0)} mil M de arrendamientos no iniciados a valor nominal, sin descontar ni proyectar EBITDA; mide exposición, no deuda actual` : `commitment-inclusive: adds the US$ ${fmtN(S.unc / 1000, 0)} bn of uncommenced leases at nominal value, undiscounted and without projecting EBITDA; measures exposure, not current debt` },
    ].map((x) => `<div class="stat"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join(''));
    const items = [
      { l: es ? 'Notas por pagar y otros préstamos' : 'Notes payable and other borrowings', v: bs.notes_payable_total, on: true, n: es ? `corto plazo ${fmtM(bs.notes_payable_current)} · largo plazo ${fmtM(bs.notes_payable_noncurrent)} (US$ M)` : `current ${fmtM(bs.notes_payable_current)} · non-current ${fmtM(bs.notes_payable_noncurrent)} (US$ M)` },
      { l: es ? 'Pasivos por arrendamientos operativos' : 'Operating lease liabilities', v: Lz.operating_liabilities_total, on: true, n: es ? `activo por derecho de uso ${fmtM(Lz.operating_rou_assets)} (US$ M)` : `right-of-use asset ${fmtM(Lz.operating_rou_assets)} (US$ M)` },
      { l: es ? 'Pasivos por arrendamientos financieros' : 'Finance lease liabilities', v: Lz.finance_liabilities_total, on: true, n: es ? `activo por derecho de uso ${fmtM(Lz.finance_rou_assets)} (US$ M)` : `right-of-use asset ${fmtM(Lz.finance_rou_assets)} (US$ M)` },
      { l: es ? 'Arrendamientos firmados, aún no iniciados' : 'Leases signed, not yet commenced', v: (un.usd_bn || 0) * 1000, on: false, n: es ? `casi todos de centros de datos · plazos de ${un.term_years_min}–${un.term_years_max} años · inician entre el 2T27 y el AF2029 · nominal` : `substantially all data centers · ${un.term_years_min}–${un.term_years_max}-year terms · commence between 2Q27 and FY2029 · nominal` },
      { l: es ? 'Obligaciones de compra (energía, equipo y otros)' : 'Purchase obligations (power, equipment and other)', v: po.total, on: false, n: es ? 'no cancelables · calendario por año fiscal abajo' : 'non-cancelable · schedule by fiscal year below' },
      { l: es ? 'Garantías a arrendadores u otras' : 'Lessor or other guarantees', v: null, on: false, n: es ? ga.text_es : ga.text_en },
      { l: es ? 'Efectivo e inversiones negociables' : 'Cash and marketable securities', v: -(bs.cash_and_investments || 0), on: true, n: es ? 'se resta para la deuda neta' : 'netted for net debt' },
    ];
    html('obTable', `<table><thead><tr><th>${es ? 'Partida' : 'Item'}</th><th>US$ ${es ? 'mil M' : 'bn'}</th><th>${es ? 'Balance' : 'Balance sheet'}</th><th>${es ? 'Detalle' : 'Detail'}</th></tr></thead><tbody>${items.map((x) => `<tr><td>${x.l}</td><td><b>${x.v == null ? (es ? 'no divulgadas' : 'not disclosed') : fmtN(x.v / 1000, 1)}</b></td><td>${x.on ? (es ? 'dentro' : 'on') : (es ? 'fuera' : 'off')}</td><td class="small muted">${x.n}</td></tr>`).join('')}</tbody></table>`);
    const bars = items.filter((x) => x.v != null && x.v > 0);
    mkChart('chartOblig', { type: 'bar', data: { labels: bars.map((x) => x.l), datasets: [{ label: 'US$ bn', data: bars.map((x) => x.v / 1000), backgroundColor: bars.map((x) => (x.on ? c[0] : alpha(c[0], 0.45))) }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `US$ ${fmtN(x.parsed.x, 1)} ${es ? 'mil M' : 'bn'} · ${bars[x.dataIndex].on ? (es ? 'en balance' : 'on balance sheet') : (es ? 'fuera de balance' : 'off balance sheet')}` } } }, scales: { x: { ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    el('obCap').textContent = es ? 'US$ mil millones al 31 de agosto de 2026. Barras sólidas: pasivos en el balance; barras claras: compromisos fuera de balance, a valor nominal. Los arrendamientos no iniciados pasarán al balance (pasivo y activo por derecho de uso) conforme cada centro de datos se entregue a Oracle.' : 'US$ billion at August 31, 2026. Solid bars: liabilities on the balance sheet; light bars: off-balance-sheet commitments at nominal value. Uncommenced leases move onto the balance sheet (liability and right-of-use asset) as each data center is handed over to Oracle.';
    html('obSrc', `${t('src')}: ${tenQ} (${es ? 'balance, nota de arrendamientos, nota de compromisos' : 'balance sheet, leases note, commitments note'}) · ${es ? 'deuda neta y EBITDA UDM: modelo (sección 07)' : 'net debt and LTM EBITDA: model (section 07)'} · ${asOfQ()}`);
    const hist = un.history || [];
    mkChart('chartUncommenced', { type: 'bar', data: { labels: hist.map((h) => fmtDate(h.as_of)), datasets: [{ label: 'US$ bn', data: hist.map((h) => h.usd_bn), backgroundColor: c[1] }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `US$ ${fmtN(x.parsed.y, x.parsed.y < 100 ? 1 : 0)} ${es ? 'mil M' : 'bn'}${hist[x.dataIndex].note ? ' · ' + hist[x.dataIndex].note : ''}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 44, borderWidth: 0 } } } });
    el('uncCap').textContent = es ? 'Compromisos de arrendamiento firmados que aún no están en el balance, según la nota de arrendamientos de cada 10-Q y 10-K (US$ mil millones, valor nominal).' : 'Signed lease commitments not yet on the balance sheet, per the leases note of each 10-Q and 10-K (US$ billion, nominal value).';
    html('uncNote', `<b>${es ? 'Texto del 10-Q' : '10-Q wording'}${es ? ' (cita en inglés, tal como aparece en el reporte)' : ''}.</b> <i>${un.text_en || ''}</i>`);
    html('uncSrc', `${t('src')}: ${hist.map((h) => { const S2 = obSrc(h.source); return S2 ? extLink(S2.url, fmtDate(h.as_of)) : fmtDate(h.as_of); }).join(' · ')} · ${asOfQ()}`);
    html('poTable', `<table><thead><tr><th>${es ? 'Periodo' : 'Period'}</th><th>US$ M</th></tr></thead><tbody>${(po.schedule || []).map((x) => `<tr><td>${es ? x.period_es : x.period_en}</td><td>${fmtM(x.usd_m)}</td></tr>`).join('')}<tr class="bold"><td>Total</td><td>${fmtM(po.total)}</td></tr></tbody></table>`);
    el('poCap').textContent = es ? (po.text_es || '') : (po.text_en || '');
    html('poSrc', `${t('src')}: ${tenQ} (${es ? 'nota de compromisos' : 'commitments note'}) · ${asOfQ()}`);
    const pr = peerLeverage();
    html('peerLevTable', `<table><thead><tr><th>${es ? 'Emisor' : 'Issuer'}</th><th>${es ? 'Balance · año fiscal' : 'Balance sheet · fiscal year'}</th><th>${es ? 'Deuda neta' : 'Net debt'}</th><th>${es ? 'Arrend. op. + fin.' : 'Op. + fin. leases'}</th><th>EBITDA</th><th>${es ? 'Deuda neta ÷ EBITDA' : 'Net debt ÷ EBITDA'}</th><th>${es ? 'Ajustado ÷ EBITDAR' : 'Lease-adj. ÷ EBITDAR'}</th><th>${t('src')}</th></tr></thead><tbody>${pr.map((x) => `<tr class="${x.self ? 'bold' : ''}"><td>${x.name}${x.basis === 'pretax_plus_interest' ? ' *' : ''}</td><td class="small">${fmtDate(x.bs)} · ${x.self ? x.fy : fmtDate(x.fy)}</td><td>${fmtN(x.net / 1000, 1)}</td><td>${x.opL != null ? fmtN((x.opL + (x.finL || 0)) / 1000, 1) : '—'}</td><td>${x.ebitda != null ? fmtN(x.ebitda / 1000, 1) : '—'}</td><td>${fmtX(x.ndEbitda, 2)}</td><td>${fmtX(x.leaseAdj, 2)}</td><td class="small">${x.self ? tenQ : (x.src ? extLink(x.src.filings, 'EDGAR') : '')}</td></tr>`).join('')}</tbody></table>`);
    mkChart('chartPeerLev', { type: 'bar', data: { labels: pr.map((x) => x.ticker), datasets: [{ label: es ? 'Deuda neta ÷ EBITDA' : 'Net debt ÷ EBITDA', data: pr.map((x) => x.ndEbitda), backgroundColor: c[0] }, { label: es ? 'Ajustado por arrendamientos ÷ EBITDAR' : 'Lease-adjusted ÷ EBITDAR', data: pr.map((x) => x.leaseAdj), backgroundColor: c[1] }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y, 2)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtX(v, 1) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 28, borderWidth: 0 } } } });
    el('peerLevCap').textContent = es ? 'US$ mil millones. Pares elegidos por el responsable como emisores tecnológicos del rango Baa/BBB; saldos al último balance y flujos del último año fiscal según sus datos XBRL en la SEC; razones derivadas. EBITDA = utilidad de operación + depreciación y amortización (* IBM no reporta utilidad de operación: utilidad antes de impuestos + intereses). "—" = el emisor no etiqueta esa partida en XBRL. Las calificaciones no están en XBRL y se agregarán con el comunicado de cada agencia.' : 'US$ billion. Peer set chosen by the owner as Baa/BBB-range technology issuers; latest balance sheet and latest fiscal-year flows per their SEC XBRL data; ratios derived. EBITDA = operating income + depreciation and amortisation (* IBM reports no operating income: pre-tax income + interest). "—" = the issuer does not tag that item in XBRL. Ratings are not in XBRL and will be added with each agency\'s release.';
    html('peerLevSrc', `${t('src')}: ${extLink('https://www.sec.gov/search-filings/edgar-application-programming-interfaces', es ? 'API de datos XBRL de la SEC (company facts)' : 'SEC XBRL company-facts API')} · ${es ? 'obtenido el' : 'fetched'} ${PL ? fmtDate(PL.fetched) : '—'} · Oracle: ${tenQ} · ${asOfQ()}`);
  }

  // ================= 12 INVESTOR CALENDAR =================
  function renderCalendar() {
    if (!CAL || !el('calUpcoming')) return;
    const es = LANG === 'es';
    const todayIso = new Date().toISOString().slice(0, 10);
    const fmtDT = (iso, tz) => { const d = new Date(iso); if (isNaN(d)) return { date: '—', ct: '', mx: '' }; const z = tz || 'America/Chicago'; return { date: d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: z }), ct: d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: z }), mx: d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }) }; };
    const tzShort = { 'America/Chicago': 'CT', 'America/New_York': 'ET', 'America/Los_Angeles': 'PT', 'America/Denver': 'MT' };
    const typeLabel = { earnings_call: es ? 'Llamada de resultados' : 'Earnings call', analyst_day: es ? 'Día del analista / inversionista' : 'Analyst / investor day', conference: es ? 'Conferencia' : 'Conference', annual_meeting: es ? 'Asamblea anual' : 'Annual meeting', other: es ? 'Evento' : 'Event' };
    const dateCell = (e) => { if (e.all_day || !String(e.start).includes('T')) return `<b>${fmtDate(String(e.start).slice(0, 10))}</b><span class="sub">${es ? 'hora por anunciar' : 'time to be announced'}</span>`; const t = fmtDT(e.start, e.timezone); return `<b>${t.date}</b><span class="sub">${t.ct} ${tzShort[e.timezone] || ''} · ${t.mx} ${es ? 'CDMX' : 'Mexico City'}</span>`; };
    const linkCell = (e) => { const Lk = e.links || {}; const parts = []; if (Lk.webcast) parts.push(extLink(Lk.webcast, 'Webcast')); if (Lk.event) parts.push(extLink(Lk.event, es ? 'evento (RI)' : 'event (IR)')); if (Lk.announcement) parts.push(extLink(Lk.announcement, es ? 'anuncio de la fecha' : 'date announcement')); if (Lk.release) parts.push(extLink(Lk.release, es ? 'comunicado' : 'release')); for (const d of Lk.documents || []) parts.push(extLink(d.url, d.title)); if (Lk.transcript_in_model) parts.push(`<span class="muted">${es ? 'transcripción en el modelo' : 'transcript in the model'}</span>`); if (!Lk.webcast && !Lk.event && !Lk.release && e.source && e.source.title) parts.push(`<span class="muted" title="${String(e.source.note || '').replace(/"/g, '&quot;')}">${e.source.title}</span>`); return parts.join(' · ') || '—'; };
    const row = (e, cls) => `<tr class="${cls || ''}"><td>${dateCell(e)}</td><td><b>${es ? (e.title_es || e.title) : e.title}</b>${e.location ? `<span class="sub">${e.location}</span>` : ''}${e.fiscal_period ? `<span class="sub">${qLabelId(e.fiscal_period.replace(/^FY/, ''))}</span>` : ''}</td><td>${typeLabel[e.type] || typeLabel.other}${e.status === 'announced_on_call' ? `<span class="sub">${es ? 'anunciado en la llamada; aún no publicado en la página de eventos de RI' : 'announced on the call; not yet on the IR events page'}</span>` : ''}</td><td class="small">${linkCell(e)}</td></tr>`;
    const manual = (CAL.manualEvents || []).filter((m) => m.start && !m.superseded_by).map((m) => ({ ...m, status: m.status || 'announced_on_call', all_day: m.all_day || !String(m.start).includes('T') }));
    const upcoming = [...(CAL.events || []).filter((e) => e.status === 'confirmed'), ...manual.filter((m) => String(m.start).slice(0, 10) >= todayIso)].sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const past = [...(CAL.events || []).filter((e) => e.status === 'past'), ...manual.filter((m) => String(m.start).slice(0, 10) < todayIso)].sort((a, b) => String(b.start).localeCompare(String(a.start)));
    const ests = CAL.estimates || [];
    const estRows = ests.map((s) => `<tr class="est"><td><b>${fmtDate(s.window_start)} – ${fmtDate(s.window_end)}</b><span class="sub">${es ? 'ventana estimada' : 'estimated window'}</span></td><td><b>${es ? s.label_es : s.label_en}</b><span class="sub">${es ? s.basis_es : s.basis_en}</span></td><td>${typeLabel.earnings_call}<span class="sub">${es ? 'estimación, no anunciada por Oracle' : 'estimate, not announced by Oracle'}</span></td><td class="small">${extLink(s.source.url, es ? 'comunicados de Oracle (RI)' : 'Oracle press releases (IR)')}</td></tr>`).join('');
    const head = `<thead><tr><th>${es ? 'Fecha' : 'Date'}</th><th>${es ? 'Evento' : 'Event'}</th><th>${es ? 'Tipo' : 'Type'}</th><th>${es ? 'Enlaces' : 'Links'}</th></tr></thead>`;
    html('calUpcoming', upcoming.length || estRows ? `<table class="cal">${head}<tbody>${upcoming.map((e) => row(e)).join('')}${estRows}</tbody></table>` : `<div class="notice">${es ? 'Oracle no ha publicado eventos próximos.' : 'Oracle has not posted upcoming events.'}</div>`);
    html('calPast', past.length ? `<table class="cal">${head}<tbody>${past.map((e) => row(e, 'past')).join('')}</tbody></table>` : `<div class="notice">${es ? 'Sin eventos en los últimos seis meses.' : 'No events in the last six months.'}</div>`);
    const next = upcoming[0]; const nextEarn = upcoming.find((e) => e.type === 'earnings_call'); const est = ests[0];
    const dateOf = (e) => (e.all_day || !String(e.start).includes('T') ? fmtDate(String(e.start).slice(0, 10)) : fmtDT(e.start, e.timezone).date);
    html('calStats', [
      next && { v: dateOf(next), l: `${es ? 'próximo evento' : 'next event'} · ${es ? (next.title_es || next.title) : next.title}` },
      nextEarn ? { v: dateOf(nextEarn), l: `${es ? 'próximos resultados' : 'next results'} · ${qLabelId(String(nextEarn.fiscal_period || '').replace(/^FY/, ''))}` } : est && { v: `${fmtDate(est.window_start)} – ${fmtDate(est.window_end)}`, l: `${es ? 'próximos resultados, ventana estimada' : 'next results, estimated window'} · ${es ? est.label_es : est.label_en}` },
      { v: String(past.length), l: es ? 'eventos en los últimos seis meses' : 'events in the last six months' },
    ].filter(Boolean).map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    el('calCap').textContent = es ? `Horas en la zona del evento (CT = Chicago) y en la Ciudad de México. Fuente: página de eventos de Relación con Inversionistas de Oracle y comunicados de fijación de fecha, consultados el ${fmtDate(CAL.generated)}; se actualiza cada día hábil con la cosecha de EDGAR.` : `Times in the event's zone (CT = Chicago) and in Mexico City. Source: Oracle's Investor Relations events page and date-setting releases, fetched ${fmtDate(CAL.generated)}; refreshed every weekday with the EDGAR harvest.`;
    const srcLabel = { 'ir-events': es ? 'Oracle, Relación con Inversionistas: eventos y presentaciones' : 'Oracle Investor Relations: events and presentations', 'ir-news': es ? 'Oracle, Relación con Inversionistas: comunicados (fijación de fecha y resultados)' : 'Oracle Investor Relations: press releases (date-setting and results)' };
    html('calSrc', `${t('src')}: ${(CAL.sources || []).map((s) => extLink(s.url, srcLabel[s.id] || s.title)).join(' · ')} · ${es ? 'consultado el' : 'fetched'} ${fmtDate(CAL.generated)} · ${es ? 'las ventanas estimadas se derivan de las fechas de publicación de años anteriores (data/quarters.json) y se sustituyen por la fecha confirmada en cuanto Oracle la anuncia' : 'estimated windows derive from prior years\' release dates (data/quarters.json) and are replaced by the confirmed date as soon as Oracle announces it'}`);
  }

  // ================= 13 METHOD / SOURCES =================
  function renderMethod() {
    const rows = [
      [LANG === 'es' ? 'Estados financieros trimestrales, acumulados y anuales' : 'Quarterly, YTD and annual statements', LANG === 'es' ? 'días hábiles, tras cada 8-K' : 'weekdays, after each 8-K', LANG === 'es' ? 'GitHub Actions cosecha los 8-K de SEC EDGAR; las cifras entran a tools/oracle/data/quarters.json y pasan scripts/oracle/validate-data.mjs antes de publicarse' : 'GitHub Actions harvests the 8-Ks from SEC EDGAR; figures enter tools/oracle/data/quarters.json and pass scripts/oracle/validate-data.mjs before publishing', fmtDate((FIN.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Guía de la administración' : 'Management guidance', LANG === 'es' ? 'con cada reporte / transcripción' : 'with each report / transcript', 'data/guidance.js', fmtDate((GD.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Comentarios del estado de resultados' : 'Income-statement comments', LANG === 'es' ? 'por trimestre (borrador de la rutina, revisado)' : 'per quarter (drafted by the routine, reviewed)', 'data/comments.js', CM.updatedAt ? fmtDate(CM.updatedAt) : '—'],
      [LANG === 'es' ? 'Resumen ejecutivo' : 'Executive summary', LANG === 'es' ? 'con cada reporte (rutina)' : 'with each report (routine)', 'data/summary.js', SUM.updatedAt ? fmtDate(SUM.updatedAt) : '—'],
      [LANG === 'es' ? 'Precios, dividendos, tasas' : 'Prices, dividends, yields', LANG === 'es' ? 'diario, después del cierre de la NYSE' : 'daily after the NYSE close', `${MK.prices.ORCL ? MK.prices.ORCL.source : ''} · FRED (SP500, DGS10)`, fmtDate((MK.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Referencia: acciones, deuda, calificaciones, expansión de IA, RPO, supuestos DCF' : 'Reference: shares, debt, ratings, AI buildout, RPO, DCF defaults', LANG === 'es' ? 'por evento (PR revisado)' : 'event-driven (reviewed PR)', 'data/reference.js', fmtDate(REF.updatedAt)],
      [LANG === 'es' ? 'Múltiplos de pares' : 'Peer multiples', LANG === 'es' ? 'pendiente' : 'pending', 'FactSet → data/peers.js', PEERS.updatedAt ? fmtDate(PEERS.updatedAt) : '—'],
      [LANG === 'es' ? 'CDS a 5 años (riesgo de crédito)' : '5-year CDS (credit risk)', LANG === 'es' ? 'pendiente · diario cuando esté conectado' : 'pending · daily once connected', 'FactSet → data/cds.js', CDS.updatedAt ? fmtDate(CDS.updatedAt) : '—'],
      [LANG === 'es' ? 'Preocupaciones del mercado (prensa y analistas)' : 'Market concerns (press and analysts)', LANG === 'es' ? 'semanal (lunes), rutina de escritorio' : 'weekly (Mondays), desktop routine', 'tools/oracle/data/press.json → data/press.js', PRESS && PRESS.asOf ? fmtDate(PRESS.asOf) : '—'],
      [LANG === 'es' ? 'Financiamiento fuera de balance, preferentes, plan de financiamiento' : 'Off-balance-sheet financing, preferred stock, funding plan', LANG === 'es' ? 'con cada 10-Q / 10-K (rutina)' : 'with each 10-Q / 10-K (routine)', 'tools/oracle/data/obligations.json → data/obligations.js', OB && OB.updated ? fmtDate(OB.updated) : '—'],
      [LANG === 'es' ? 'Apalancamiento de pares (XBRL de la SEC)' : 'Peer leverage (SEC XBRL)', LANG === 'es' ? 'días hábiles, con la cosecha de EDGAR' : 'weekdays, with the EDGAR harvest', 'scripts/oracle/fetch-peer-leverage.mjs → data/peer_leverage.js', PL && PL.fetched ? fmtDate(PL.fetched) : '—'],
      [LANG === 'es' ? 'Calendario del inversionista' : 'Investor calendar', LANG === 'es' ? 'días hábiles, con la cosecha de EDGAR' : 'weekdays, with the EDGAR harvest', LANG === 'es' ? 'página de eventos de RI y comunicados de fecha → data/calendar.js' : 'IR events page and date-setting releases → data/calendar.js', CAL && CAL.generated ? fmtDate(CAL.generated) : '—'],
    ];
    html('refreshTable', `<table><thead><tr><th>${t('block')}</th><th>${t('cadence')}</th><th>${t('mechanism')}</th><th>${t('lastUpdate')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    const srcs = [
      { t: LANG === 'es' ? 'SEC EDGAR — Oracle Corporation (CIK 1341439)' : 'SEC EDGAR — Oracle Corporation (CIK 1341439)', d: LANG === 'es' ? 'Comunicados de resultados (Anexo 99.1 del 8-K), Formularios 10-Q y 10-K; base de todos los estados financieros, la deuda y el RPO.' : 'Earnings releases (Exhibit 99.1 to 8-K), Forms 10-Q and 10-K; the basis of every statement, debt and RPO figure.', u: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001341439' },
      { t: LANG === 'es' ? 'Oracle — Relación con inversionistas' : 'Oracle — Investor relations', d: LANG === 'es' ? 'Comunicados, presentaciones y webcasts de resultados.' : 'Releases, presentations and results webcasts.', u: 'https://investor.oracle.com/' },
      { t: LANG === 'es' ? 'Transcripciones de llamadas de resultados' : 'Earnings-call transcripts', d: LANG === 'es' ? 'Aportadas por el responsable (FactSet CallStreet); citas breves con orador y página. No se republican.' : 'Supplied by the owner (FactSet CallStreet); short quotes with speaker and page. Not republished.', u: 'https://investor.oracle.com/' },
      { t: LANG === 'es' ? 'Precios diarios' : 'Daily prices', d: `${MK.prices.ORCL ? MK.prices.ORCL.source : ''}; ${LANG === 'es' ? 'S&P 500 de FRED (SP500)' : 'S&P 500 from FRED (SP500)'}.`, u: MK.prices.ORCL && MK.prices.ORCL.sourceUrl ? MK.prices.ORCL.sourceUrl : 'https://www.nasdaq.com/market-activity/stocks/orcl/historical' },
      { t: 'FRED — Federal Reserve Bank of St. Louis', d: LANG === 'es' ? 'Tesoro a 10 años (DGS10) para la tasa libre de riesgo del DCF.' : '10-year Treasury (DGS10) for the DCF risk-free rate.', u: 'https://fred.stlouisfed.org/series/DGS10' },
      { t: LANG === 'es' ? 'Agencias calificadoras' : 'Rating agencies', d: LANG === 'es' ? "Moody's, S&P Global Ratings y Fitch: comunicados de acción de calificación." : "Moody's, S&P Global Ratings and Fitch: rating-action releases.", u: 'https://www.spglobal.com/ratings/' },
    ];
    html('srcGrid', srcs.map((s) => `<div class="item"><div class="t"><a href="${s.u}" target="_blank" rel="noopener">${s.t} ↗</a></div><div class="d">${s.d}</div></div>`).join(''));
  }

  // ================= wiring =================
  function seg(id, onChange) { const box = el(id); if (!box) return; box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); onChange(b.dataset.v); })); }
  function renderAll() {
    chartDefaults();
    renderHeader(); renderSummary(); renderStatements(); renderGuidance(); renderOperating(); renderBuildout(); renderShare(); renderDcf(); renderRelative(); renderDebt(); renderDividends(); renderCapital(); renderAi(); renderUnitEconomics(); renderRpoRecognition(); renderBuildoutFlow(); renderObligations(); renderCredit(); renderCalendar(); renderMethod();
  }
  function setLang(lang) {
    LANG = lang;
    el('btnLangEs').classList.toggle('active', lang === 'es'); el('btnLangEn').classList.toggle('active', lang === 'en');
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es-MX' : 'en');
    document.querySelectorAll('.es').forEach((e) => { e.hidden = lang !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = lang !== 'en'; });
    try { localStorage.setItem('orcl-lang', lang); } catch (e) { /* ignore */ }
    fillSelects(); renderAll();
  }
  el('btnLangEs').addEventListener('click', () => setLang('es')); el('btnLangEn').addEventListener('click', () => setLang('en'));

  // ---------------- print as presentation ----------------
  function renderPrintExtras() {
    const conf = LANG === 'es' ? 'Confidencial. Preparado para uso interno del consejo; no distribuir.' : 'Confidential. Prepared for internal board use; do not distribute.';
    const today = new Date().toISOString().slice(0, 10);
    const gv = GV[GV.length - 1];
    const basis = LANG === 'es'
      ? [`Último trimestre reportado: ${lastQ ? qLabel(lastQ) : '—'} (${lastQ ? fmtDate(lastQ.releaseDate) : '—'})`, `Guía vigente: ${gv ? fmtDate(gv.date) : '—'}`, `Cierre de mercado: ${lastPx ? `US$ ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'}`, `Comparación en pantalla: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`]
      : [`Latest reported quarter: ${lastQ ? qLabel(lastQ) : '—'} (${lastQ ? fmtDate(lastQ.releaseDate) : '—'})`, `Guidance in force: ${gv ? fmtDate(gv.date) : '—'}`, `Market close: ${lastPx ? `US$ ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'}`, `Comparison on screen: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`];
    html('printCover', `<div>${LANG === 'es' ? 'Modelo financiero interactivo · elaborado únicamente con información pública' : 'Interactive financial model · built only from public information'}</div><div class="basis">${basis.map((x) => `<div>${x}</div>`).join('')}<div>${LANG === 'es' ? 'Impreso el' : 'Printed'} ${fmtDate(today)} · fnam.mx/oracle</div></div><div class="conf">${conf}</div>`);
    const esc = (x) => x.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const left = esc(`Oracle · ${LANG === 'es' ? 'Modelo financiero' : 'Financial model'} · fnam.mx/oracle · ${conf} · ${fmtDate(today)}`);
    let stEl = el('printPageStyle'); if (!stEl) { stEl = document.createElement('style'); stEl.id = 'printPageStyle'; document.head.appendChild(stEl); }
    stEl.textContent = `@page { size: 11in 8.5in; margin: 0.45in 0.55in 0.6in; @bottom-left { content: "${left}"; font-family: Inter, system-ui, sans-serif; font-size: 8.5pt; color: #555; vertical-align: top; padding-top: 6pt; } @bottom-right { content: "${LANG === 'es' ? 'Página' : 'Page'} " counter(page) " ${LANG === 'es' ? 'de' : 'of'} " counter(pages); font-family: Inter, system-ui, sans-serif; font-size: 9.5pt; color: #333; vertical-align: top; padding-top: 6pt; } }`;
    const src = el('srcGrid'), fine = document.querySelector('footer#sources .fine');
    html('printCloseBody', `<div class="src-grid">${src ? src.innerHTML : ''}</div><p class="fine">${fine ? fine.innerHTML : ''}</p><p class="conf">${conf}</p>`);
    document.querySelectorAll('#printCloseBody .es').forEach((e) => { e.hidden = LANG !== 'es'; }); document.querySelectorAll('#printCloseBody .en').forEach((e) => { e.hidden = LANG !== 'en'; });
  }
  let prevTheme = null, prevAnim = null;
  function setPrintMode(on) {
    if (on === PRINT) return;
    PRINT = on;
    const root = document.documentElement;
    if (on) { prevTheme = root.getAttribute('data-theme'); root.setAttribute('data-theme', 'light'); if (hasChart()) { prevAnim = Chart.defaults.animation; Chart.defaults.animation = false; } renderAll(); renderPrintExtras(); if (hasChart()) for (const c of Object.values(Chart.instances)) { c.options.responsive = false; c.resize(930, 240); } }
    else { if (prevTheme) root.setAttribute('data-theme', prevTheme); else root.removeAttribute('data-theme'); if (hasChart()) Chart.defaults.animation = prevAnim; renderAll(); }
  }
  window.addEventListener('beforeprint', () => setPrintMode(true));
  window.addEventListener('afterprint', () => setPrintMode(false));
  // The button builds the board presentation PDF (present.js); the browser print path stays as a fallback.
  el('btnPrint').addEventListener('click', () => { if (window.ORCL_PRESENT && window.ORCL_PRESENT.build) { window.ORCL_PRESENT.build(); return; } setPrintMode(true); setTimeout(() => window.print(), 250); });
  el('stmtTable').addEventListener('click', (e) => { const g = e.target.closest('[data-g]'); if (g) { st.open[g.dataset.g] = !st.open[g.dataset.g]; renderStatements(); } });
  seg('segStmt', (v) => { st.stmt = v; renderStatements(); });
  seg('segMode', (v) => { st.mode = v; fillSelects('yoy'); renderStatements(); });
  seg('segPreset', (v) => { fillSelects(v); renderStatements(); });
  seg('segRevMix', (v) => { rm.view = v; renderRevMix(); });
  el('selA').addEventListener('change', (e) => { st.a = e.target.value; const b = pairedB(st.a, periodOptions()); if (b) { st.b = b; el('selB').value = b; } renderStatements(); });
  el('selB').addEventListener('change', (e) => { st.b = e.target.value; renderStatements(); });
  el('chkNg').addEventListener('change', (e) => { st.ng = e.target.checked; renderStatements(); });
  seg('segGuideMetric', (v) => { gs.metric = v; renderGuideChart(); });
  seg('segOpsMetric', (v) => { op.metric = v; renderOperating(); });
  seg('segRange', (v) => { sh.range = v; renderShare(); });
  const navLinks = [...document.querySelectorAll('nav.jump a')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((entries) => { entries.forEach((en) => { if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); }); }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s2) => io.observe(s2));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderAll());

  // Read-only view of the model for the presentation builder (present.js): the same data, helpers and
  // calculations the page renders, so the PDF and the screen can never disagree.
  window.ORCL_MODEL = {
    get LANG() { return LANG; }, t, L, LS, locale, fmtN, fmtM, fmtBn, fmtPct, fmtX, fmtDate, qLabel, qLabelId, ytdLabel, fyLabel, cls, addDays,
    FIN, MK, REF, PEERS, GD, CM, SUM, CDS, BO,
    Q, Y, lastQ, qById, prevQid, yoyQid, REV_LINES, revOnNewBasis, sumParts, fixRatios, combine, ytdFor, ltmFor, lastLTM,
    px, lastPoint, pointAtOrBefore, us10, orclPx, lastPx, sharesNow, sharesAt, qEndDate, netDebt,
    GV, isYoY, yoyCommentsFor, revValue, opsFor, GM, gRange, gMid, gActualFmt, gStatus, gActual, gNote, gCapexNote,
    boQ, boLabel, maturityBuckets, MAT_BUCKETS, fyOfDate, betaFromMarket, kdFromDebt,
    pctChange, PRESS, OB, PL, obligStats, peerLeverage,
  };
  let initial = 'es'; try { initial = new URLSearchParams(location.search).get('lang') || localStorage.getItem('orcl-lang') || 'es'; } catch (e) { /* ignore */ }
  fillSelects('yoy');
  setLang(initial === 'en' ? 'en' : 'es');
})();
