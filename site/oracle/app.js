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
  const FS = window.ORCL_FACTSET || null; // FactSet consensus snapshot (tools/oracle/data/factset.json)
  const fsNtm = () => (FS && FS.oracle && FS.oracle.ntm) || {};
  const fsFiscal = () => (FS && FS.oracle && FS.oracle.fiscal) || [];
  const GD = window.ORCL_GUIDANCE || { vintages: [] };
  const CM = window.ORCL_COMMENTS || { periods: {} };
  const SUM = window.ORCL_SUMMARY || { sections: [] };
  const CDS = window.ORCL_CDS || { tenor: 5, recoveryPct: 40, points: [] };
  const CAL = window.ORCL_CALENDAR || null;
  const SEC = window.ORCL_SECTIONS || { sections: [], freshness: null };
  const NEWS = window.ORCL_NEWS || null; const XB = window.ORCL_XBRL || null; const RK = window.ORCL_RISKS || null; const CL = window.ORCL_CHANGELOG || null;

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
    provisional: { es: 'Datos provisionales: los archivos de datos aún no están disponibles.', en: 'Provisional: the data files are not yet available.' },
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
  const fmtMonth = (ym) => { const m = /^(\d{4})-(\d{2})/.exec(String(ym || '')); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, 15)).toLocaleDateString(locale(), { month: 'short', year: 'numeric', timeZone: 'UTC' }) : (ym || '—'); };
  // A date-only string is a calendar date; a timestamp is shown as its Eastern-Time date (the page's only time zone), so a
  // file generated at 01:09 UTC on the 4th reads as the 3rd, like the ET refresh stamps beside it.
  const fmtDate = (iso) => { if (!iso) return '—'; const s0 = String(iso); if (s0.length > 10) { const d = new Date(s0); return isNaN(d) ? '—' : d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York' }); } const d = new Date(s0 + 'T12:00:00Z'); return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  // "today" for countdowns, maturities and staleness is the Eastern-Time calendar date, never the UTC one
  const todayET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const qLabel = (q) => (LANG === 'es' ? `${q.q}T${String(q.fy).slice(2)}` : `${q.q}Q${String(q.fy).slice(2)}`);
  const qLabelId = (id) => { const m = /^(\d{4})Q(\d)$/.exec(id || ''); return m ? qLabel({ fy: +m[1], q: +m[2] }) : id; };
  const ytdLabel = (fy, months) => `${months}M${String(fy).slice(2)}`;
  const fyLabel = (fy) => `FY${fy}`;
  const cls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const el = (id) => document.getElementById(id);
  const html = (id, s) => { const e = el(id); if (e) e.innerHTML = typeof s === 'string' && s.includes('{{sec:') ? resolveRefs(s) : s; };
  const link = (s, label) => (s && s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${label || (t('release') + ' (' + fmtDate(s.date) + ')')}</a>` : label || '');

  // ---------------- theme + chart defaults ----------------
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (document.documentElement.getAttribute('data-theme') !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const SERIES = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cssVar('--series-' + i));
  const hasChart = () => typeof Chart !== 'undefined';
  // touch devices and phones: tooltips render in a box under the chart (never over the plot), x axes keep at most six labels
  const TOUCH = () => (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 760;
  function externalTip(ctx) {
    const { chart, tooltip } = ctx; const wrap = chart.canvas.closest('.chart-wrap') || chart.canvas.parentElement; if (!wrap) return;
    let box = wrap.nextElementSibling && wrap.nextElementSibling.classList && wrap.nextElementSibling.classList.contains('chart-tip') ? wrap.nextElementSibling : null;
    if (!box) { box = document.createElement('div'); box.className = 'chart-tip'; box.hidden = true; wrap.insertAdjacentElement('afterend', box); }
    if (!tooltip || tooltip.opacity === 0) { box.hidden = true; box.innerHTML = ''; return; }
    const esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const title = (tooltip.title || []).join(' '), lines = (tooltip.body || []).flatMap((b) => b.lines || []), after = tooltip.afterBody || [], cols = tooltip.labelColors || [];
    box.hidden = false; box.innerHTML = `<b>${esc(title)}</b>${lines.map((l, i) => `<span><i style="background:${(cols[i] || {}).backgroundColor || 'transparent'}"></i>${esc(l)}</span>`).join('')}${after.length ? `<em>${esc(after.join(' '))}</em>` : ''}`;
  }
  function chartDefaults() {
    if (!hasChart()) return;
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif'; Chart.defaults.font.size = TOUCH() ? 12 : 11.5;
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
    if (TOUCH()) { cfg.options.plugins = cfg.options.plugins || {}; cfg.options.plugins.tooltip = Object.assign({}, cfg.options.plugins.tooltip || {}, { enabled: false, external: externalTip }); for (const k of Object.keys(cfg.options.scales)) if (/^x/.test(k)) { const sc = cfg.options.scales[k]; sc.ticks = Object.assign({ maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, sc.ticks || {}); } }
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
  // The one refresh time every stamp on the page prints (ET): the build that wrote the data files. Per-module fetch times
  // stay on the data-quality page and in the methodology modules table, labelled as such (owner's rule, round 4, 2026-10-04).
  const REFRESHED_AT = FIN.generatedAt || MK.generatedAt || null;
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
  const ltmPrefix = () => (LANG === 'es' ? 'UDM ' : 'LTM ');
  const ltmLabel = () => (lastQ ? ltmPrefix() + qLabel(lastQ) : '');
  function ltmFor(q) {
    const qs = []; let fy = q.fy, qq = q.q;
    for (let i = 0; i < 4; i++) { const x = qById[`${fy}Q${qq}`]; if (!x || !x.is) { qs.length = 0; break; } qs.unshift(x); qq--; if (qq === 0) { qq = 4; fy--; } }
    if (qs.length === 4) return combine(qs, ltmPrefix() + qLabel(q), { months: 12 });
    if (q.q === 4) { const y = Y.find((yy) => yy.fy === q.fy); if (y) return { id: ltmPrefix() + qLabel(q), is: y.is, cf: y.cf, kpi: y.kpi, bs: q.bs, sources: y.sources, fy: q.fy, q: 4, basis: 'fy' }; }
    return null;
  }
  const lastLTM = lastQ ? ltmFor(lastQ) : null;

  // Market helpers
  const px = (id) => (MK.prices && MK.prices[id] && MK.prices[id].points) || [];
  const lastPoint = (pts) => (pts.length ? pts[pts.length - 1] : null);
  const pointAtOrBefore = (pts, date) => { let lo = 0, hi = pts.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= date) { ans = pts[mid]; lo = mid + 1; } else hi = mid - 1; } return ans; };
  const us10 = (MK.rates && MK.rates.US10Y && MK.rates.US10Y.points) || [];
  // Which 10-year value the DCF uses (owner's rule, 2026-10-05): the source, series and date travel with the figure wherever it
  // is printed (DCF inputs, DCF sources, the methodology tables, the deck). The fetcher records the source that answered
  // (U.S. Treasury daily par yield curve first; FRED DGS10, which republishes the same series, as the fallback).
  const US10 = (MK.rates && MK.rates.US10Y) || {};
  const us10Last = us10.length ? us10[us10.length - 1] : null;
  const us10SrcName = () => { const n = US10.source || ''; return LANG === 'es' ? (/^U\.S\. Treasury/i.test(n) ? 'Tesoro de EE. UU., curva par diaria' : n || 'fuente no registrada') : n || 'source not recorded'; };
  const us10Label = (withValue = true) => (us10Last ? `${LANG === 'es' ? 'Tesoro a 10 años' : '10-year Treasury'}${withValue ? ` ${fmtPct(us10Last[1], 2)}` : ''} (${us10SrcName()}, ${fmtDate(us10Last[0])})` : '');
  const us10Link = (label) => (US10.sourceUrl ? extLink(US10.sourceUrl, label || us10SrcName()) : label || us10SrcName());
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
  const daysSince = (d) => (d ? Math.round((new Date(todayET() + 'T00:00:00Z').getTime() - new Date(String(d).slice(0, 10) + 'T00:00:00Z').getTime()) / 86400000) : null);
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
        const tr = /^10-year Treasury[^:]*: (\d{4}-\d{2}-\d{2})/.exec(s);
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
    if (REFRESHED_AT) asof.push(`<span><b>${LANG === 'es' ? 'Actualizado (ET)' : 'Refreshed (ET)'}:</b> ${fmtET(REFRESHED_AT)}</span>`);
    html('asofRow', asof.join(''));
    // phones: title, price and one status line; the as-of row and the KPI strip sit behind a "More" toggle (round 4)
    { const es = LANG === 'es'; const chg1 = orclPx && orclPx.length > 1 ? 100 * (orclPx[orclPx.length - 1][1] / orclPx[orclPx.length - 2][1] - 1) : null; const relD = lastQ ? fmtDate(lastQ.releaseDate || (lastQ.sources && lastQ.sources.is && lastQ.sources.is.date)) : '';
      html('hdrCompact', lastPx ? `<span class="px">US$ ${fmtN(lastPx[1], 2)}</span>${chg1 != null ? ` <span class="${cls(chg1)}">${fmtPct(chg1, 1, true)}</span>` : ''} <span class="muted">· ${es ? 'cierre' : 'close'} ${fmtDate(lastPx[0])}</span><span class="st">${lastQ ? `${qLabel(lastQ)} · ${relD}` : ''}${gv ? ` · ${es ? 'guía' : 'guidance'} ${fmtDate(gv.date)}` : ''}${REFRESHED_AT ? ` · ${es ? 'actualizado' : 'refreshed'} ${fmtET(REFRESHED_AT)}` : ''}</span>` : '');
      const more = el('hdrMore'), hd = document.querySelector('header.top'); if (more && hd) { more.textContent = hd.classList.contains('more') ? (es ? '− Menos cifras' : '− Fewer figures') : (es ? '+ Más cifras' : '+ More figures'); more.setAttribute('aria-expanded', String(hd.classList.contains('more'))); if (!more.dataset.wired) { more.dataset.wired = '1'; more.addEventListener('click', () => { hd.classList.toggle('more'); renderHeader(); }); } } }
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
    if (lastPx && sharesNow && nd && lastLTM && lastLTM.is && lastLTM.is.ebitda) { const ev = lastPx[1] * sharesNow / 1e6 + nd.net; const fn = fsNtm(); const Lz = (window.ORCL_OBLIG && window.ORCL_OBLIG.leases) || {}; const leases = (Lz.operating_liabilities_total || 0) + (Lz.finance_liabilities_total || 0);
      if (fn.ebitda && fn.ebitda.mean > 0) k.push({ l: (LANG === 'es' ? 'VE' : 'EV') + ' / EBITDA NTM', v: fmtX(ev / fn.ebitda.mean) + (leases ? '<sup>1</sup>' : ''), d: `${fn.eps && fn.eps.mean > 0 ? `${LANG === 'es' ? 'P/U' : 'P/E'} NTM ${fmtX(lastPx[1] / fn.eps.mean)} · ` : ''}${LANG === 'es' ? 'consenso FactSet' : 'FactSet consensus'} ${fmtDate(FS.asOf)}`,
        n: leases ? (LANG === 'es' ? `¹ ${fmtX(ev / fn.ebitda.mean)} con la deuda neta reportada; ${fmtX((ev + leases) / fn.ebitda.mean)} al sumar US$ ${fmtN(leases / 1000, 1)} mil M de pasivos por arrendamiento, la base de la tabla de pares de FactSet (${ref('valuation')})` : `¹ ${fmtX(ev / fn.ebitda.mean)} on reported net debt; ${fmtX((ev + leases) / fn.ebitda.mean)} adding US$ ${fmtN(leases / 1000, 1)} bn of lease liabilities, the basis of the FactSet peers table (${ref('valuation')})`) : '' }); else k.push({ l: 'VE / EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: fmtX(ev / lastLTM.is.ebitda), d: lastLTM.is.epsDiluted ? `P/U ${fmtX(lastPx[1] / lastLTM.is.epsDiluted)} GAAP` : '' }); }
    html('kpiStrip', k.map((x) => `<div class="kpi"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="delta">${x.d || ''}</div>${x.n ? `<div class="knote">${resolveRefs(x.n)}</div>` : ''}</div>`).join(''));
    document.querySelectorAll('#genStamp, #genStamp2').forEach((e) => { e.textContent = fmtET(FIN.generatedAt || MK.generatedAt); });
  }

  // ================= 00 EXECUTIVE SUMMARY =================
  function renderSummary() {
    renderVerdict(); renderChain(); renderPaths(); renderKeyNumbers();
    const b = SUM.basis || {}; const es = LANG === 'es';
    const qq = b.quarter && (qById[b.quarter] || { fy: +b.quarter.slice(0, 4), q: +b.quarter.slice(5) });
    // the summary's own date (rewritten with each report or event), the date its events run through, and the
    // news items that arrived after it, so the reader knows what it does not cover yet
    const newer = NEWS && SUM.updatedAt ? (NEWS.items || []).filter((x) => x.date > SUM.updatedAt) : [];
    const thru = SUM.eventsThrough ? `${fmtDate(SUM.eventsThrough)}${SUM.eventsThroughBasis === 'news' ? (es ? ' (la noticia más reciente)' : ' (the latest news item)') : ''}` : '';
    html('sumMeta', (es
      ? `Con base en los resultados del ${qq ? qLabel(qq) : '—'} (${fmtDate(b.resultsDate)}) y la guía del ${fmtDate(b.guidanceDate)} · actualizado el ${fmtDate(SUM.updatedAt)}${thru ? `, con eventos hasta el ${thru}` : ''}. Las cifras del panel y de la tabla se calculan con los datos vigentes.`
      : `Based on ${qq ? qLabel(qq) : '—'} results (${fmtDate(b.resultsDate)}) and the guidance of ${fmtDate(b.guidanceDate)} · updated ${fmtDate(SUM.updatedAt)}${thru ? `, events through ${thru}` : ''}. The panel and table figures are computed from the current data.`)
      + (newer.length ? ` <span class="badge rev">${es ? `${newer.length} noticia(s) posteriores a la fecha del resumen` : `${newer.length} news item(s) dated after the summary`}</span> ${es ? 'en' : 'in'} ${ref('news')}` : ''));
    const secs = SUM.sections || [];
    if (!secs.length) { html('sumGrid', `<div class="notice warn">${es ? 'El resumen ejecutivo se redacta a partir del comunicado y la transcripción del último trimestre; pendiente de la primera corrida de la rutina de revisión.' : 'The executive summary is drafted from the latest release and call transcript; pending the first run of the reviewing routine.'}</div>`); html('sumWatch', ''); return; }
    html('sumGrid', secs.filter((x) => x.k !== 'watch').map((sec) => `<div class="card"><h3>${L(sec.title)}</h3><ul>${(sec[LANG] || sec.en || []).map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join(''));
    const w = secs.find((x) => x.k === 'watch'); const items = w ? (w['items_' + LANG] || w.items_en || []) : [];
    html('sumWatch', w ? `<h3>${L(w.title)}</h3><div class="watch-grid">${items.map((it) => `<div class="watch-item">${it.h ? `<h4>${it.h}</h4>` : ''}<ul>${(it.lines || []).map((x) => `<li>${resolveRefs(x)}</li>`).join('')}</ul></div>`).join('')}</div>` : '');
    const ws = (SUM.watchSources || []).map((x) => (x.url ? extLink(x.url, x.title) : x.title)).join(' · ');
    html('sumSrc', `${t('src')}: ${relLink()} · ${es ? 'transcripción de la llamada de resultados' : 'earnings-call transcript'}${ws ? ` · ${ws}` : ''}`);
  }
  // ---------------- uniform source / timestamp pieces (every chart and table footer uses these) ----------------
  const IR_EVENTS = 'https://investor.oracle.com/events-and-presentations/default.aspx';
  const NASDAQ_URL = 'https://www.nasdaq.com/market-activity/stocks/orcl/historical';
  const FRED_SPX = 'https://fred.stlouisfed.org/series/SP500', FRED_DGS10 = 'https://fred.stlouisfed.org/series/DGS10';
  // A source without a URL (an owner-supplied call transcript, a document behind a login) renders as text, like every other
  // call-page citation; the page never writes href="undefined". The render check fails on any such anchor.
  const extLink = (url, label) => (url ? `<a href="${url}" target="_blank" rel="noopener">${label} ↗</a>` : `${label}`);
  // one wording for every "as of" in a source line (owner's request 2026-10-04): "as of 1 Oct 2026" / "al 1 oct 2026"
  const asOf = (d) => (d ? `${LANG === 'es' ? 'al' : 'as of'} ${fmtDate(String(d).slice(0, 10))}` : '');
  // The latest quarter and its release date sit in each section head's stamp; footers no longer repeat them (empty on purpose).
  function asOfQ() { return ''; }
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
    html('opsNote', LANG === 'es' ? `RPO (obligaciones de desempeño restantes) = ingresos contratados aún no reconocidos; detalle en ${ref('rpo')}.` : `RPO (remaining performance obligations) = contracted revenue not yet recognised; detail in ${ref('rpo')}.`);
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
    const rows = [['rpo', 'RPO (US$ M)', 0], ['cloud', t('cloudRev'), 0]].map(([k, l, dd]) => { const f = defs[k].f; const v = f(q), vp = p && f(p), vq = pq && f(pq); const yy = k === 'rpo' && q.kpi.rpoYoyPct != null ? q.kpi.rpoYoyPct : (v != null && vp && vp > 0 ? 100 * (v / vp - 1) : null); const qq = v != null && vq && vq > 0 ? 100 * (v / vq - 1) : null; return `<tr><td>${l}</td><td>${fmtN(v, dd)}</td><td>${fmtN(vq, dd)}</td><td class="${cls(qq)}">${fmtPct(qq, 1, true)}</td><td>${fmtN(vp, dd)}</td><td class="${cls(yy)}">${fmtPct(yy, 1, true)}</td></tr>`; }).join('');
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
    const sf = (s, k) => (LANG === 'es' ? s[k + '_es'] : s[k + '_en']) || s[k] || ''; // bilingual site field: k_es / k_en, else the untagged (English) field
    const srcShort = (r) => { let label = r.short || r.title; if (LANG === 'es') label = label.replace(/\b(\d)Q(\d\d)\b/g, '$1T$2').replace(/\bcall\b/g, 'llamada').replace(/\bpress release\b/gi, 'comunicado').replace(/ and /g, ' y '); return r.url ? `<a href="${r.url}" target="_blank" rel="noopener" title="${(r.title || '').replace(/"/g, '&quot;')}">${label}</a>` : `<span title="${(r.title || '').replace(/"/g, '&quot;')}">${label}</span>`; };
    // Issues column: dated adverse events per campus (buildout.json → sites[].issues), newest first; a decision or delivery
    // date (`due`) is counted down and flagged once it has passed without an update; closed items are muted.
    const basisBadge = (b) => `<span class="badge ${b === 'company' || b === 'government' ? '' : 'est'}">${{ company: LANG === 'es' ? 'empresa' : 'company', government: LANG === 'es' ? 'gobierno' : 'government', wire: LANG === 'es' ? 'agencia de noticias' : 'wire', press: LANG === 'es' ? 'prensa' : 'press' }[b] || b}</span>`;
    const dueTxt = (d) => { const n = -daysSince(d); return n >= 0 ? `<span class="badge rev">${LANG === 'es' ? `fecha ${fmtDate(d)} · en ${n} días` : `due ${fmtDate(d)} · in ${n} days`}</span>` : `<span class="stale">${LANG === 'es' ? `la fecha ${fmtDate(d)} ya pasó: resultado sin registrar` : `${fmtDate(d)} has passed: outcome not yet recorded`}</span>`; };
    const issuesCell = (s) => { const its = s.issues || []; if (!its.length) return `<span class="muted">${LANG === 'es' ? s.issues_none_es || 'Sin incidencias reportadas' : s.issues_none_en || 'None reported'}</span>`; return its.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).map((it) => `<div class="issue ${it.status === 'closed' ? 'closed' : ''}"><b>${fmtDate(it.date)}</b> ${L(it)} ${basisBadge(it.basis)}${it.due ? ` ${dueTxt(it.due)}` : ''}${it.status === 'closed' ? ` <span class="badge">${LANG === 'es' ? 'cerrado' : 'closed'}</span>` : ''} ${it.source && it.source.url ? `<a href="${it.source.url}" target="_blank" rel="noopener" title="${(it.source.title || '').replace(/"/g, '&quot;')}">↗</a>` : ''}</div>`).join('') ; };
    const mwCell = (s) => `<b>${s.nameplate_mw || s.capacity_mw ? fmtN(s.nameplate_mw || s.capacity_mw) + ' MW' : '—'}</b><span class="sub">${LANG === 'es' ? 'planeados' : 'nameplate'}${s.nameplate_src ? ` (${s.nameplate_src})` : ''}${s.generation_mw ? ` · ${fmtN(s.generation_mw)} MW ${LANG === 'es' ? 'de generación en sitio' : 'on-site generation'}` : ''}</span><span class="sub"><b>${s.energized_mw != null ? fmtN(s.energized_mw) + ' MW' : '—'}</b> ${LANG === 'es' ? 'energizados' : 'energized'}${s.energized_as_of ? ` · ${boLabel(s.energized_as_of)}` : ''}</span>${sf(s, 'nameplate_note') ? `<span class="sub">${sf(s, 'nameplate_note')}</span>` : ''}`;
    html('sitesTable', `<table class="sites"><thead><tr><th>${LANG === 'es' ? 'Sitio' : 'Site'}</th><th>${LANG === 'es' ? 'MW planeados · energizados' : 'MW nameplate · energized'}</th><th>${LANG === 'es' ? 'Estado (con fecha) y primeros ingresos' : 'Status (dated) and first revenue'}</th><th>${LANG === 'es' ? 'Incidencias' : 'Issues'}</th><th>${LANG === 'es' ? 'Energía' : 'Power source'}</th><th>${LANG === 'es' ? 'Desarrollador · inquilino · financiamiento' : 'Developer · tenant · financing'}</th><th>${t('src')}</th></tr></thead><tbody>${sites.map((s) => `<tr><td><b>${s.name}</b><span class="sub">${s.location}</span></td><td>${mwCell(s)}</td><td>${s.status_date ? `<b>${fmtDate(s.status_date)}</b>: ` : ''}${sf(s, 'energized_text') || sf(s, 'oracle_status')}<span class="sub">${LANG === 'es' ? 'Primeros ingresos' : 'First revenue'}: ${sf(s, 'first_revenue') || sf(s, 'first_delivery') || '—'}</span></td><td class="issues">${issuesCell(s)}</td><td>${sf(s, 'power') || '—'}</td><td><b>${sf(s, 'developer') || '—'}</b><span class="sub">${LANG === 'es' ? 'Inquilino' : 'Tenant'}: ${sf(s, 'tenant') || sf(s, 'customer') || '—'}</span>${sf(s, 'financing') ? `<span class="sub">${sf(s, 'financing')}</span>` : ''}</td><td class="small">${(s.sources || []).map(srcShort).join(' · ')}</td></tr>`).join('')}</tbody></table>`);
    const energized = sites.reduce((a, s) => a + (s.energized_mw || 0), 0), statusMax = sites.map((s) => s.status_date || '').sort().slice(-1)[0], checked = sites.map((s) => s.issues_checked || '').sort()[0];
    el('sitesCap').textContent = LANG === 'es' ? `Los ${sites.length} campus que Oracle ha nombrado en sus llamadas: capacidad planeada ≈ ${fmtN(sitesMw / 1000, 1)} GW, energizados ${fmtN(energized)} MW según la última llamada. MW, fuente de energía, inquilino y primeros ingresos provienen de Oracle cuando lo divulga; en caso contrario, de los comunicados de los desarrolladores o de la prensa enlazada en cada fila. La columna de incidencias lista, con fecha, base y fuente, avisos de fuerza mayor, permisos, gasoductos, litigios y financiamiento; una fecha de decisión pendiente se cuenta hacia atrás y se marca si pasa sin registro${checked ? ` (fuentes revisadas el ${fmtDate(checked)})` : ''}. "No divulgado" significa que Oracle no lo ha dicho.` : `The ${sites.length} campuses Oracle has named on its calls: nameplate ≈ ${fmtN(sitesMw / 1000, 1)} GW, energized ${fmtN(energized)} MW per the latest call. MW, power source, tenant and first-revenue timing come from Oracle where it disclosed them, otherwise from the developers' releases or the press linked in each row. The Issues column lists, dated and sourced with their basis, force-majeure notices, permits, pipelines, litigation and financing; a pending decision date is counted down and flagged if it passes unrecorded${checked ? ` (sources checked ${fmtDate(checked)})` : ''}. "Not disclosed" means Oracle has not said.`;
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
      { k: LANG === 'es' ? '2 · Capacidad' : '2 · Capacity', big: lastMw ? `${fmtN(lastMw.mw)} MW` : '—', sub: lastMw ? `${LANG === 'es' ? 'entregados en el' : 'delivered in'} ${boLabel(lastMw.id)}` : '', items: [fyMw ? (LANG === 'es' ? `> ${fmtN(fyMw.mw / 1000, 1)} GW entregados en el AF2026` : `> ${fmtN(fyMw.mw / 1000, 1)} GW delivered in FY2026`) : null, sec ? (LANG === 'es' ? `> ${sec.gw} GW asegurados vía socios (3T26)` : `> ${sec.gw} GW secured through partners (3Q26)`) : null, LANG === 'es' ? `${(BO.sites || []).length} campus nombrados (tabla arriba)` : `${(BO.sites || []).length} named campuses (table above)`] },
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

  // ================= DCF (its own section; rebuilt 2026-10-03) =================
  // Unlevered free cash flow by Oracle fiscal year, discounted at mid-period to the latest close. The current fiscal year is
  // a stub: the quarters already reported are subtracted, because their cash is already in the balance-sheet net debt. Every
  // default comes from the data files (FactSet consensus, the capex guidance, the 10-Q, the price series, the Treasury
  // curve, Damodaran's implied ERP); nothing is typed here. Method and sources: tools/oracle/METHODOLOGY.md §DCF.
  const D = Object.assign({}, REF.dcf || {});
  const dcfState = {};
  const DCF_EDIT_YEARS = 5;
  // ---- beta: OLS slope of ORCL log returns on the S&P 500, last close of each week (or month) over the window
  function betaFrom(days, freq) {
    const g = px('ORCL'), m = px('^GSPC'); if (g.length < 120 || m.length < 120) return null;
    const mm = new Map(m.map((p) => [p[0], p[1]]));
    const end = g[g.length - 1][0], start = addDays(end, -days);
    const key = (d) => { if (freq === 'm') return d.slice(0, 7); const dt = new Date(d + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); return dt.toISOString().slice(0, 10); };
    const by = new Map(); for (const p of g) if (p[0] >= start && mm.has(p[0])) by.set(key(p[0]), [p[1], mm.get(p[0]), p[0]]);
    const pts = [...by.values()]; if (pts.length < (freq === 'm' ? 36 : 60)) return null;
    const rg = [], rm = []; for (let i = 1; i < pts.length; i++) { rg.push(Math.log(pts[i][0] / pts[i - 1][0])); rm.push(Math.log(pts[i][1] / pts[i - 1][1])); }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length; const ag = mean(rg), am = mean(rm);
    let cov = 0, vr = 0; for (let i = 0; i < rg.length; i++) { cov += (rg[i] - ag) * (rm[i] - am); vr += (rm[i] - am) ** 2; }
    return vr ? { beta: Math.round(100 * cov / vr) / 100, n: rg.length, from: pts[0][2], to: pts[pts.length - 1][2], freq, years: Math.round(days / 365) } : null;
  }
  // Blume adjustment (0.67 × raw + 0.33 × 1): raw betas drift toward 1 over time; the adjusted figure is the forward-looking estimate most data services quote.
  const blume = (b) => (b ? { ...b, raw: b.beta, beta: Math.round(100 * (0.67 * b.beta + 0.33)) / 100, blume: true } : null);
  const BETAS = (() => { const w2 = betaFrom(730, 'w'), m5 = betaFrom(1826, 'm'); return { w2, w2b: blume(w2), m5, m5b: blume(m5) }; })();
  const betaLabel = (k, short) => { const b = BETAS[k]; if (!b) return k; const es = LANG === 'es'; const win = short ? (b.freq === 'm' ? (es ? `${b.years} años, mens.` : `${b.years}y monthly`) : (es ? `${b.years} años, sem.` : `${b.years}y weekly`)) : b.freq === 'm' ? (es ? `${b.years} años, mensual` : `${b.years}-year monthly`) : (es ? `${b.years} años, semanal` : `${b.years}-year weekly`); return `${win}${b.blume ? (short ? ', Blume' : es ? ', ajustada (Blume)' : ', Blume-adjusted') : ''}`; };
  function betaFromMarket() { return BETAS.w2; }
  // ---- pre-tax cost of debt: the most recent ~10-year fixed-rate senior note's spread over the 10-year Treasury on its issue
  // date, applied to today's Treasury (a coupon set months ago understates today's cost when rates or spreads have moved)
  function kdFromDebt() {
    const ins = ((REF.debt && REF.debt.instruments) || []).filter((x) => x.issued && x.matures && x.ratePct != null && x.type && (typeof x.type === 'object' ? x.type.en === 'senior notes' : false));
    const tenor = (x) => (new Date(x.matures) - new Date(x.issued)) / (365.25 * 864e5);
    const ten = ins.filter((x) => tenor(x) >= 9 && tenor(x) <= 11).sort((a, b) => a.issued.localeCompare(b.issued));
    const pick = ten[ten.length - 1] || ins.sort((a, b) => a.issued.localeCompare(b.issued))[ins.length - 1]; if (!pick) return null;
    const atIssue = pointAtOrBefore(us10, pick.issued), now = us10.length ? us10[us10.length - 1] : null;
    const spread = atIssue ? pick.ratePct - atIssue[1] : null;
    return { name: pick.name, coupon: pick.ratePct, issued: pick.issued, tsyAtIssue: atIssue, spread, tsyNow: now, rate: spread != null && now ? Math.round(100 * (now[1] + spread)) / 100 : pick.ratePct };
  }
  const KD = kdFromDebt();
  const ERP = REF.erp || null;
  const XBq = (key) => (XB && XB.concepts[key] && (XB.concepts[key].quarters || [])) || [];
  const XBp = (key) => (XB && XB.concepts[key] && (XB.concepts[key].periods || [])) || [];
  // ---- the fiscal-year frame: the current fiscal year (stub when quarters are already reported) and the year before it
  function dcfFrame() {
    if (!lastQ) return null;
    const curFy = lastQ.q === 4 ? lastQ.fy + 1 : lastQ.fy;
    const ytdQs = lastQ.q === 4 ? [] : Q.filter((q) => q.fy === curFy);
    const sumQ = (f) => ytdQs.reduce((a, q) => a + (f(q) || 0), 0);
    const ytd = { months: ytdQs.length * 3, quarters: ytdQs.map((q) => q.id), rev: sumQ((q) => q.is.revTotal), ebitda: sumQ((q) => q.is.ebitda), da: sumQ((q) => q.is.da), sbc: sumQ((q) => q.is.ngSbc), capex: sumQ((q) => (q.cf && q.cf.capex != null ? -q.cf.capex : 0)), prepay: sumQ((q) => (q.cf ? q.cf.prepay : 0)) };
    const prevY = Y.find((y) => y.fy === curFy - 1) || null;
    const priorPrepay = []; for (const y of Y) if (y.fy < curFy && y.cf && y.cf.prepay) priorPrepay.push({ fy: y.fy, amount: y.cf.prepay });
    return { curFy, ytd, prevY, priorPrepay, bsDate: qEndDate(lastQ), valDate: lastPx ? lastPx[0] : qEndDate(lastQ) };
  }
  // ---- income tax: the LTM effective rate (computed from the four reported quarters), the normalized rate (US statutory +
  // state, tools/oracle/data/tax.json, cross-checked against XBRL) and the mode that joins them (hold LTM / ramp / normalized)
  const TAX = REF.tax || null;
  // ---- the claims the equity bridge deducts after EV: reported net debt, finance-lease liabilities (debt in substance), the
  // mandatory convertible preferred at its liquidation preference, and (optional, labeled estimate) the present value of the
  // leases signed but not yet commenced. The WACC weights use exactly the same claims (owner's rule, 2026-10-04).
  function bridgeClaims() {
    const F = dcfFrame(); const bsDate = F ? F.bsDate : (lastQ ? qEndDate(lastQ) : null), valDate = F ? F.valDate : bsDate;
    const nd = netDebt(lastQ), netDebtM = nd ? nd.net : 0;
    const flx = XBp('fin_lease_liability').filter((p) => p.period_end <= bsDate).pop();
    const finLease = flx ? flx.value : OB && OB.leases && OB.leases.finance_liabilities_total != null ? OB.leases.finance_liabilities_total : 0;
    const pf = (OB && OB.preferred) || {};
    // after the mandatory conversion date the preferred is common stock already counted on the cover page
    const pref = pf.mandatory_conversion_date && valDate >= pf.mandatory_conversion_date ? 0 : (pf.gross_proceeds_usd_m ?? pf.carrying_value_usd_m ?? 0);
    const Lz = (OB && OB.leases) || {}, un = Lz.uncommenced || {}, pv = OB && OB.lookthrough ? OB.lookthrough.pv_estimate : null;
    let uncPv = null; if (pv && un.usd_bn) { const r = pv.discount_rate_pct / 100, n = pv.term_years, pay = un.usd_bn * 1000 / n; uncPv = pay * (1 - Math.pow(1 + r, -n)) / r / Math.pow(1 + r, pv.start_offset_years); }
    // the disclosed mix of Oracle's recognized leases (finance ÷ (operating + finance) liabilities at the 10-Q date): the basis of the "mixed" treatment
    const finShare = Lz.finance_liabilities_total != null && Lz.operating_liabilities_total != null && (Lz.finance_liabilities_total + Lz.operating_liabilities_total) > 0 ? Lz.finance_liabilities_total / (Lz.finance_liabilities_total + Lz.operating_liabilities_total) : 0;
    return { netDebtM, finLease, finLeaseAsOf: flx ? flx.period_end : (OB && OB.as_of) || null, pref, prefRate: pf.dividend_rate_pct || null, uncNominal: un.usd_bn ? un.usd_bn * 1000 : null, uncPv, uncPvMethod: pv, finShare, total: netDebtM + finLease + pref };
  }
  const fyEnd = (fy) => `${fy}-05-31`, fyStart = (fy) => `${fy - 1}-06-01`;
  const yrsBetween = (a, b) => (new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / (365.25 * 864e5);
  const midDate = (a, b) => { const t = (new Date(a + 'T12:00:00Z').getTime() + new Date(b + 'T12:00:00Z').getTime()) / 2; return new Date(t).toISOString().slice(0, 10); };
  // ---- defaults for each basis: consensus (FactSet) or management targets (fiscal-year guide and the FY2030 revenue target)
  function capexGuideFor(fy) { const gv = GV.slice().reverse().find((v) => v.items && v.items.fyCapexNote && v.fyGuided === fy); const g = gv ? parseCapexGuide(gv.items.fyCapexNote) : null; return g && g.lo != null ? { ...g, mid: (g.lo + g.hi) / 2, v: gv } : null; }
  function dcfDefaults(basis, N) {
    const F = dcfFrame(); if (!F || !F.prevY) return null;
    N = N || D.horizonYears || 10;
    const g = D.terminalGrowthPct ?? 3;
    const fs = {}; for (const f of fsFiscal()) fs[+f.fy.slice(2)] = f;
    const useCons = basis !== 'guidance' && fs[F.curFy] && fs[F.curFy].sales;
    const years = Array.from({ length: N }, (_, i) => F.curFy + i);
    const ltm = lastLTM && lastLTM.is ? lastLTM.is : {};
    const sbcPct = ltm.revTotal && ltm.ngSbc ? Math.round(10 * 100 * ltm.ngSbc / ltm.revTotal) / 10 : 0;
    const qDaPct = lastQ.is.da != null && lastQ.is.revTotal ? 100 * lastQ.is.da / lastQ.is.revTotal : 15;
    const life = (BO && BO.unitEconomics && BO.unitEconomics.gpu_life && BO.unitEconomics.gpu_life.useful_life_years) || 6;
    const k = D.terminalCapexToDa ?? Math.round(100 * (1 + g / 100 * life / 2)) / 100;
    // revenue path
    const rev = [], marginAdj = [], daPct = [], capexPct = []; let prev = F.prevY.is.revTotal; let lastCons = -1;
    const lr = (REF.longRange || []).find((t) => t.id === 'fy2030_revenue' && t.status === 'in_force');
    const fyRevGuide = (() => { const v = GV.slice().reverse().find((x) => x.items && x.items.fyRevenue && x.fyGuided === F.curFy); return v ? v.items.fyRevenue.usdM : null; })();
    for (let i = 0; i < N; i++) {
      const fy = years[i], c = fs[fy];
      let r = null;
      if (useCons && c && c.sales && c.sales.mean > 0) { r = c.sales.mean; lastCons = i; }
      else if (!useCons && i === 0 && fyRevGuide) { r = fyRevGuide; lastCons = i; }
      else if (!useCons && lr && fy <= +lr.fy.slice(2) && fyRevGuide) { const n = +lr.fy.slice(2) - F.curFy; const gg = Math.pow(lr.usd_bn * 1000 / fyRevGuide, 1 / n); r = rev[i - 1] * gg; lastCons = i; }
      if (r == null) { const pg = i > 0 ? (rev[i - 1] / (i > 1 ? rev[i - 2] : prev) - 1) * 100 : 10; r = (i > 0 ? rev[i - 1] : prev) * (1 + Math.max(g, pg / 2) / 100); }
      rev.push(r);
      // margins, D&A and capex intensity: consensus ratios where FactSet covers the year (also on the guidance basis)
      marginAdj.push(c && c.ebitda && c.sales ? 100 * c.ebitda.mean / c.sales.mean : null);
      daPct.push(c && c.da && c.sales ? 100 * c.da.mean / c.sales.mean : null);
      capexPct.push(c && c.capex && c.sales ? 100 * c.capex.mean / c.sales.mean : null);
    }
    // fill gaps: hold the last known margin / D&A ratio; capex intensity fades linearly to the terminal ratio (k × D&A)
    const hold = (a, fb) => { let last = a.find((x) => x != null); if (last == null) last = fb; return a.map((x) => (x == null ? last : (last = x))); };
    const dap = hold(daPct, qDaPct);
    const margin = basis === 'guidance' ? years.map(() => (ltm.ebitdaMargin != null ? Math.round(10 * ltm.ebitdaMargin) / 10 : 45)) : hold(marginAdj, ltm.ebitdaMargin != null ? ltm.ebitdaMargin + sbcPct : 50).map((x) => Math.round(10 * x) / 10);
    const lastCx = capexPct.reduce((a, x, i) => (x != null ? i : a), -1);
    const termCx = k * dap[N - 1];
    const cxp = capexPct.map((x, i) => { if (x != null && i <= lastCx) return x; const from = lastCx >= 0 ? capexPct[lastCx] : (ltm.revTotal ? 100 * (lastLTM.cf ? -lastLTM.cf.capex : 0) / ltm.revTotal : 30); const steps = Math.max(1, N - 1 - lastCx); return from + (termCx - from) * (i - lastCx) / steps; });
    // the current fiscal year's gross capex: the guided range's midpoint on the guidance basis, consensus otherwise
    const cg = capexGuideFor(F.curFy);
    const capex = rev.map((r, i) => Math.round(r * cxp[i] / 100));
    if (basis === 'guidance' && cg) capex[0] = Math.round(cg.mid * 1000);
    // customer-funded share of gross capex: the guide's gross-minus-net gap for the guided year, held through the consensus
    // years, then fading linearly to zero by the last explicit year
    const s0 = cg && cg.netMax ? Math.max(0, Math.round(10 * 100 * (1 - cg.netMax / cg.mid)) / 10) : 0;
    const lastHold = Math.max(0, lastCx);
    const cf = years.map((_, i) => (i <= lastHold ? s0 : Math.max(0, Math.round(10 * s0 * (1 - (i - lastHold) / Math.max(1, N - 1 - lastHold))) / 10)));
    const revG = rev.map((r, i) => Math.round(10 * 100 * (r / (i ? rev[i - 1] : prev) - 1)) / 10);
    // capital-structure weights on the same claims the bridge deducts: net debt + finance leases + preferred (owner's rule)
    const cl = bridgeClaims(); const mc = lastPx && sharesNow ? lastPx[1] * sharesNow / 1e6 : 0;
    const taxLtm = ltm.taxRate != null ? Math.round(10 * ltm.taxRate) / 10 : (TAX ? TAX.fy2026.effective_rate_pct : 15);
    return {
      v: 3, basis: useCons ? 'consensus' : 'guidance', preset: useCons ? 'base' : 'custom', N, years, baseRev: prev, baseFy: F.prevY.fy, consYears: lastCons + 1,
      revG, margin, sbc: basis === 'guidance' ? 0 : sbcPct, daPct: dap.map((x) => Math.round(10 * x) / 10), capex, cf, unwind: D.prepayUnwindYears ?? 6,
      tax: taxLtm, taxMode: D.taxMode || 'ramp', taxNorm: TAX && TAX.normalized ? TAX.normalized.pct : 21.9,
      leases: D.leases || 'operating',
      rf: us10.length ? us10[us10.length - 1][1] : 4.5, erp: ERP ? ERP.pct : D.erpFallbackPct ?? 4.5, betaKey: D.betaMethod || 'w2', beta: (BETAS[D.betaMethod || 'w2'] || BETAS.w2 || { beta: 1 }).beta,
      kd: KD ? KD.rate : 5.5, kp: cl.prefRate || 6.5, pw: cl.total ? Math.round(10 * 100 * cl.pref / cl.total) / 10 : 0,
      dw: cl.total && mc ? Math.round(10 * 100 * cl.total / (cl.total + mc)) / 10 : 15,
      method: D.terminalMethod || 'perpetuity', g, mult: D.exitMultiple ?? 12, k, life, s0, capexGuide: cg,
      ntmEbitda: fsNtm().ebitda && fsNtm().ebitda.mean > 0 ? fsNtm().ebitda.mean : null,
    };
  }
  // ---- presets (owner's, 2026-10-04; Bull rebuilt 2026-10-04 round 3): Base = FactSet consensus as it stands. Bear = three
  // documented adjustments to the consensus revenue path (RPO conversion slips one year; Project Jupiter two quarters late;
  // OpenAI volume −25% on S&P's "about half of RPO"). Bull = the same three levers set to the plan: RPO conversion one year
  // ahead of the 10-Q schedule (the mirror of the Bear's slip), Project Jupiter on time (the consensus timing, no slip) and
  // OpenAI volume at plan (the contracted volume in full, no haircut; RPO is the ceiling of contracted revenue, so no volume
  // above plan is assumed). Management target = the FY2030 revenue target on the consensus cost structure, kept as its own
  // variant. Every step is arithmetic on figures already on the page; nothing is typed in.
  const PRESET_BEAR = { openaiShare: 0.5, haircut: 0.25, jupiterQuarters: 2 };
  // One capex rule for the Bear and the Bull (round 4, 2026-10-04): the contracted build plan (each year's consensus capex)
  // stands, and capex moves with the scenario's revenue difference against consensus at the model's terminal capex intensity
  // (k × D&A / revenue, the intensity once the buildout is complete), so capex rises with revenue in every scenario. Holding
  // each year's consensus capex / revenue ratio instead would charge the front-loaded buildout intensity (about 70% of revenue
  // in the second explicit year) on revenue the plan's capacity already produces and would value the Bull below the Base.
  const terminalIntensity = (s) => (s.k || 1) * (s.daPct[s.N - 1] || s.daPct[s.daPct.length - 1] || 15) / 100;
  const scenarioCapex = (s, path, cons, E) => { const ti = terminalIntensity(s); return path.map((v, i) => (i === 0 ? s.capex[0] : Math.max(0, Math.round(s.capex[i] + (v - cons[i]) * ti)))).concat(s.capex.slice(E)); };
  const PRESET_LIST = ['bear', 'base', 'bull', 'mgmt'];
  function dcfPreset(name, base) {
    const d = base || dcfDefaults(); if (!d) return null; const s = JSON.parse(JSON.stringify(d)); s.preset = name;
    const E = Math.min(DCF_EDIT_YEARS, s.N);
    const cons = []; let r0 = s.baseRev; for (let i = 0; i < E; i++) { r0 = r0 * (1 + s.revG[i] / 100); cons.push(r0); }
    const growthOf = (path) => path.map((v, i) => Math.round(10 * 100 * (v / (i ? path[i - 1] : s.baseRev) - 1)) / 10);
    if (name === 'bull') {
      // Bull (round 4, 2026-10-04): the Bear's three levers set to the plan, on a revenue path that never exceeds management's
      // in-force FY2030 target and that rejoins the consensus level once the contracted volume has converted.
      // (1) RPO conversion one year ahead of the 10-Q schedule: from the second explicit year revenue takes the following year's
      //     consensus level (the same contracted volume arrives sooner, not more of it: RPO is the ceiling), capped at the FY2030
      //     target in the target year; from the year after the last consensus year the path returns to the consensus level.
      // (2) Project Jupiter on time and (3) OpenAI volume at plan: the consensus timing and the contracted volume in full, i.e.
      //     the Bear's slip and haircut are not applied; nothing above plan is assumed.
      // Costs and capital intensity: each year's consensus EBITDA margin, D&A ratio and capex/revenue ratio are held, so capex
      // rises with the pulled-forward revenue; the current year's capex stands because it is contracted.
      const lr = (REF.longRange || []).find((t) => t.id === 'fy2030_revenue' && t.status === 'in_force');
      const tgt = lr ? lr.usd_bn * 1000 : null, tgtIdx = lr ? s.years.indexOf(+lr.fy.slice(2)) : -1;
      const leadArr = (a) => a.map((v, i) => (i === 0 ? v : (a[i + 1] != null ? a[i + 1] : v)));
      const nCons = Math.max(1, Math.min(s.consYears, E));
      const cons1 = cons.concat([cons[E - 1] * (1 + (s.revG[E] != null ? s.revG[E] : Math.max(s.g, s.revG[E - 1] / 2)) / 100)]);
      const capped = [];
      const path = cons.map((v, i) => {
        if (i === 0 || i >= nCons) return v;
        let p = cons1[i + 1];
        if (tgt != null && tgtIdx >= 0 && i >= tgtIdx && p > Math.max(tgt, v)) { p = Math.max(tgt, v); capped.push(i); }
        return Math.max(p, v);
      });
      // margin and D&A lead with the revenue level (the mirror of the Bear's lag): the scale consensus reaches a year later
      s.margin = leadArr(s.margin); s.daPct = leadArr(s.daPct);
      s.revG = growthOf(path).concat(s.revG.slice(E));
      s.capex = scenarioCapex(s, path, cons, E);
      s.bullRecipe = { path, cons, cons1, tgt, tgtIdx, capped, nCons, termInt: terminalIntensity(s), jupiter: 'on_time', openai: 'at_plan', quarters: PRESET_BEAR.jupiterQuarters, haircut: PRESET_BEAR.haircut };
      return s;
    }
    if (name === 'mgmt') {
      const lr = (REF.longRange || []).find((t) => t.id === 'fy2030_revenue' && t.status === 'in_force');
      if (lr) { const j = s.years.indexOf(+lr.fy.slice(2)); if (j > 0 && j < E) { const tgt = lr.usd_bn * 1000; const path = cons.slice(); path[j] = Math.max(tgt, cons[j]); for (let i = j + 1; i < E; i++) path[i] = path[i - 1] * (cons[i] / cons[i - 1]); s.revG = growthOf(path); s.capex = path.map((v, i) => Math.round(v * (s.capex[i] / cons[i]))); s.bullTarget = { fy: lr.fy, usd_bn: lr.usd_bn, consensus: cons[j], stated_on: lr.stated_on, page: lr.page, speaker: lr.speaker }; } }
      return s;
    }
    if (name === 'bear') {
      const lagArr = (a) => a.map((v, i) => (i === 0 ? v : a[i - 1]));
      // 1) RPO conversion slips one year: from the second explicit year the path takes the prior year's consensus level; margin, D&A and capex intensity lag with it
      const lag = lagArr(cons); s.margin = lagArr(s.margin); s.daPct = lagArr(s.daPct);
      // 2) Project Jupiter two quarters late: its share of the named nameplate capacity × half of the first incremental year moves to the following year
      const sites = (BO && BO.sites) || []; const jup = sites.find((x) => /Jupiter/i.test(x.name)); const plan = sites.reduce((a, x) => a + (x.nameplate_mw || x.capacity_mw || 0), 0);
      const jShare = jup && plan ? (jup.nameplate_mw || jup.capacity_mw) / plan : 0;
      const path = lag.slice(); let moved = 0, jFrom = null;
      for (let i = 1; i < E - 1; i++) { const inc = lag[i] - lag[i - 1]; if (inc > 0) { moved = (PRESET_BEAR.jupiterQuarters / 4) * jShare * inc; path[i] -= moved; path[i + 1] += moved; jFrom = i; break; } }
      // 3) OpenAI volume −25%: S&P estimates about half of RPO is OpenAI, so 12.5% of the incremental revenue above the last reported year is removed every year
      const cut = PRESET_BEAR.openaiShare * PRESET_BEAR.haircut;
      for (let i = 0; i < E; i++) path[i] = s.baseRev + (path[i] - s.baseRev) * (1 - cut);
      s.revG = growthOf(path);
      // capex (round 4): the contracted build plan (consensus) stands and capex falls with the revenue shortfall at the terminal intensity (same rule as the Bull)
      s.capex = scenarioCapex(s, path, cons, E);
      s.bearRecipe = { termInt: terminalIntensity(s), jShare, jupiterMw: jup ? (jup.nameplate_mw || jup.capacity_mw) : null, planMw: plan, moved, jFrom, cut, openaiShare: PRESET_BEAR.openaiShare, haircut: PRESET_BEAR.haircut, quarters: PRESET_BEAR.jupiterQuarters, path, cons };
      return s;
    }
    return s;
  }
  // ---- the engine
  function dcfCompute(s0, over = {}) {
    const s = { ...s0, ...over }, F = dcfFrame(); if (!F) return null;
    const N = s.N, g = s.g / 100, ke = s.rf + s.beta * s.erp;
    // tax: LTM effective held, a linear ramp from the LTM rate to the normalized rate by the last explicit year, or the normalized rate throughout
    const taxAt = (i) => (s.taxMode === 'normalized' ? s.taxNorm : s.taxMode === 'ramp' ? s.tax + (s.taxNorm - s.tax) * (N > 1 ? i / (N - 1) : 1) : s.tax);
    const taxT = s.taxMode === 'ltm' ? s.tax : s.taxNorm;
    // cost of the non-equity claims: net debt and finance leases at Kd after the (terminal) tax shield; the preferred at its
    // 6.50% dividend rate, which carries no tax shield (dividends are not deductible)
    const pw = (s.pw || 0) / 100, costD = (1 - pw) * s.kd * (1 - taxT / 100) + pw * s.kp;
    const wacc = ((1 - s.dw / 100) * ke + (s.dw / 100) * costD) / 100;
    // years beyond the editable columns follow the rules from the last editable column (growth halves to g; margin and
    // D&A hold; capex intensity fades to k × D&A; the customer-funded share fades to zero)
    const E = Math.min(DCF_EDIT_YEARS, N);
    const revG = [], margin = [], daPct = [], capexPct = [], cfs = [];
    let rev = s.baseRev; const revs = [];
    for (let i = 0; i < N; i++) {
      let gi, mi, di, ci, fi;
      if (i < E) { gi = s.revG[i]; mi = s.margin[i]; di = s.daPct[i]; fi = s.cf[i]; }
      else { gi = Math.max(s.g, revG[i - 1] / 2); mi = margin[E - 1]; di = daPct[E - 1]; const steps = Math.max(1, N - E); fi = cfs[E - 1] * (1 - (i - E + 1) / steps); }
      rev = rev * (1 + gi / 100); revs.push(rev);
      if (i < E) ci = 100 * s.capex[i] / rev; else { const from = capexPct[E - 1], to = s.k * daPct[E - 1]; ci = from + (to - from) * (i - E + 1) / Math.max(1, N - E); }
      revG.push(gi); margin.push(mi); daPct.push(di); capexPct.push(ci); cfs.push(Math.max(0, fi));
    }
    // customer prepayments: received with the capex they fund, recognised as revenue (without new cash) over `unwind` years
    const L = Math.max(0, Math.round(s.unwind || 0));
    const inflowByFy = {}; for (const p of F.priorPrepay) inflowByFy[p.fy] = (inflowByFy[p.fy] || 0) + p.amount;
    const rows = []; let pvExplicit = 0;
    for (let i = 0; i < N; i++) {
      const fy = s.years ? s.years[i] : F.curFy + i;
      const r = revs[i], ebitdaAdj = r * margin[i] / 100, sbc = r * s.sbc / 100, ebitda = ebitdaAdj - sbc, da = r * daPct[i] / 100, capex = r * capexPct[i] / 100, inflowFy = capex * cfs[i] / 100;
      inflowByFy[fy] = (inflowByFy[fy] || 0) + inflowFy;
      const stub = i === 0 && F.ytd.months > 0;
      const months = stub ? 12 - F.ytd.months : 12;
      // stub: the fiscal year less the quarters already reported (their cash is in the balance-sheet net debt)
      const R = stub ? r - F.ytd.rev : r, EB = stub ? ebitda - F.ytd.ebitda : ebitda, DA = stub ? da - F.ytd.da : da, CX = stub ? capex - F.ytd.capex : capex, IN = stub ? Math.max(0, inflowFy - F.ytd.prepay) : inflowFy;
      const unwind = L ? Object.entries(inflowByFy).reduce((a, [y, amt]) => { const age = fy - +y; return age >= 1 && age <= L ? a + amt / L : a; }, 0) * (months / 12) : 0;
      const taxRate = taxAt(i);
      const ebit = EB - DA, taxes = Math.max(0, ebit) * taxRate / 100;
      const fcf = EB - taxes - CX + IN - unwind;
      const start = stub ? F.bsDate : fyStart(fy), end = fyEnd(fy), t = yrsBetween(F.valDate, midDate(start, end));
      const df = Math.pow(1 + wacc, -t); pvExplicit += fcf * df;
      rows.push({ fy, stub, months, rev: R, revFull: r, growth: revG[i], marginAdj: margin[i], ebitdaAdj: stub ? ebitdaAdj - (F.ytd.ebitda + F.ytd.sbc) : ebitdaAdj, sbc: stub ? sbc - F.ytd.sbc : sbc, ebitda: EB, ebitdaFull: ebitda, da: DA, daPct: daPct[i], ebit, taxRate, taxes, capex: CX, capexPct: capexPct[i], cfPct: cfs[i], inflow: IN, unwind, fcf, t, df, pv: fcf * df });
    }
    const last = rows[N - 1], endN = fyEnd(last.fy), tEnd = yrsBetween(F.valDate, endN);
    // unwinds of prepayments received inside the horizon that fall after it: explicit, finite, discounted at mid-year
    let pvPost = 0; if (L) for (let y = last.fy + 1; y <= last.fy + L; y++) { const u = Object.entries(inflowByFy).reduce((a, [fy0, amt]) => { const age = y - +fy0; return age >= 1 && age <= L ? a + amt / L : a; }, 0); pvPost -= u * Math.pow(1 + wacc, -(yrsBetween(F.valDate, fyEnd(y)) - 0.5)); }
    // terminal year: one more year at g, capex normalised to k × D&A, no customer funding (steady state), the terminal tax rate
    const rT = last.revFull * (1 + g), ebT = rT * (margin[N - 1] - s.sbc) / 100, daT = rT * daPct[N - 1] / 100, cxT = s.k * daT, txT = Math.max(0, ebT - daT) * taxT / 100, fcfT = ebT - txT - cxT;
    let tv, pvTv;
    if (s.method === 'multiple') { tv = last.revFull * (margin[N - 1] - s.sbc) / 100 * s.mult; pvTv = tv * Math.pow(1 + wacc, -tEnd); }
    else { tv = wacc > g ? fcfT / (wacc - g) : NaN; pvTv = tv * Math.pow(1 + wacc, -(tEnd - 0.5)); }
    const ev = pvExplicit + pvTv + pvPost;
    // cross-checks between the two terminal methods (owner's request): the EV/EBITDA the perpetuity implies, and the
    // perpetual growth the exit multiple implies (TV = FCF(N+1) ÷ (WACC − g*), holding the normalized terminal-year FCF)
    const ebFullN = last.ebitdaFull;
    const impliedTermMult = s.method === 'perpetuity' && isFinite(tv) ? { onNext: tv / ebT, onLast: tv / ebFullN } : null;
    const impliedTermG = s.method === 'multiple' && tv > 0 ? 100 * (wacc - fcfT / tv) : null;
    // equity bridge: the claims in bridgeClaims(); the uncommenced leases' PV only when the reader chooses the finance-lease treatment
    const cl = bridgeClaims();
    const uncDeduct = cl.uncPv ? (s.leases === 'finance_pv' ? cl.uncPv : s.leases === 'mixed' ? cl.uncPv * (cl.finShare || 0) : 0) : 0;
    const eq = ev - cl.netDebtM - cl.finLease - cl.pref - uncDeduct;
    const sh = dilutedShares();
    const perShare = sh && sh.total ? eq / sh.total : null;
    return { wacc, ke, costD, taxT, rows, finLeaseAsOf: cl.finLeaseAsOf, terminal: { rev: rT, ebitda: ebT, da: daT, capex: cxT, taxes: txT, taxRate: taxT, fcf: fcfT, capexToDa: s.k, capexPct: 100 * cxT / rT }, tv, pvTv, pvExplicit, pvPost, ev, netDebtM: cl.netDebtM, finLease: cl.finLease, pref: cl.pref, uncDeduct, uncPv: cl.uncPv, uncNominal: cl.uncNominal, eq, shares: sh, perShare,
      impliedMult: s.ntmEbitda ? ev / s.ntmEbitda : null, impliedTermMult, impliedTermG, ebitdaN: ebFullN, tvShare: ev ? pvTv / ev : null, frame: F };
  }
  // Diluted shares: the 10-Q cover count plus the dilutive securities of the latest quarter (diluted − basic weighted average, XBRL)
  function dilutedShares() {
    const cov = XBp('shares_cover'); const c = cov.length ? cov[cov.length - 1] : null;
    const base = c ? { m: c.value, asOf: c.period_end, accn: c.accn, url: c.url } : sharesNow ? { m: sharesNow / 1e6, asOf: MK.sharesOutstanding ? MK.sharesOutstanding.asOf : null } : null;
    if (!base) return null;
    const bq = XBq('shares_basic').filter((x) => x.value != null), dq = XBq('shares_diluted').filter((x) => x.value != null);
    const lb = bq[bq.length - 1], ld = lb ? dq.find((x) => x.quarter === lb.quarter) : null;
    const dil = lb && ld ? Math.max(0, ld.value - lb.value) : 0;
    return { cover: base.m, coverAsOf: base.asOf, coverUrl: base.url || null, dilutive: dil, dilutiveQuarter: lb ? lb.quarter : null, total: base.m + dil };
  }
  const dcfPrice = () => (lastPx ? lastPx[1] : null);
  // what the price implies: solve for the WACC (moving the cost of equity), the terminal growth, a uniform margin shift or a
  // growth multiplier that returns the price (bisection)
  function solve(fn, lo, hi, target) { let a = lo, b = hi, fa = fn(a) - target, fb = fn(b) - target; if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return null; for (let i = 0; i < 60; i++) { const m = (a + b) / 2, fm = fn(m) - target; if (!isFinite(fm)) return null; if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } } return (a + b) / 2; }
  const rfForWacc = (s, waccPct) => s.rf + (waccPct - 100 * dcfCompute(s).wacc) / (1 - s.dw / 100); // the WACC moves through the cost of equity only
  function impliedWacc(s, price) { const r = dcfCompute(s); const lo = s.rf + ((s.g + 0.6) - 100 * r.wacc) / (1 - s.dw / 100); const x = solve((rf) => dcfCompute(s, { rf }).perShare, lo, s.rf + 25, price); return x == null ? null : dcfCompute(s, { rf: x }); }
  function impliedG(s, price, waccPct) { const over = waccPct != null ? { rf: rfForWacc(s, waccPct) } : {}; const r = dcfCompute(s, over); const hiG = 100 * r.wacc - 0.25; return s.method === 'multiple' ? null : solve((g) => dcfCompute(s, { ...over, g }).perShare, -3, hiG, price); }
  function impliedMarginShift(s, price, waccPct) { const over = waccPct != null ? { rf: rfForWacc(s, waccPct) } : {}; return solve((d) => dcfCompute(s, { ...over, margin: s.margin.map((x) => x + d) }).perShare, -40, 40, price); }
  function impliedGrowthMult(s, price, waccPct) { const over = waccPct != null ? { rf: rfForWacc(s, waccPct) } : {}; return solve((m) => dcfCompute(s, { ...over, revG: s.revG.map((x, i) => (i === 0 ? x : x * m)) }).perShare, 0, 3, price); }
  // what the price needs, computed once for the Summary verdict and the DCF acceptance box: the WACC and beta the price
  // implies on the scenario's flows, and the beta estimates on file whose value reaches about the price (within 3%)
  function priceNeeds(s, price) { if (!s || !price) return null; const iwr = impliedWacc(s, price); const rows = Object.keys(BETAS).filter((k) => BETAS[k]).map((k) => ({ k, b: BETAS[k], v: dcfCompute(s, { beta: BETAS[k].beta }).perShare })); const reach = rows.filter((x) => x.v != null && x.v >= 0.97 * price); return { iw: iwr ? iwr.wacc : null, ib: iwr ? (iwr.ke - s.rf) / s.erp : null, rows, reach, bMin: Math.min(...rows.map((x) => x.b.beta)), bMax: Math.max(...rows.map((x) => x.b.beta)) }; }
  // the acceptance sentence ("what has to be true") and the three-WACC rows, computed once for the page and the deck (round 4)
  function dcfCheckSentence(s, r, price) {
    if (!s || !r || r.perShare == null || !price) return ''; const es = LANG === 'es';
    const pn = priceNeeds(s, price), iw = pn ? pn.iw : null, ib = pn ? pn.ib : null, reachTxt = pn && pn.reach.length ? `; ${reachClause(pn)}` : '';
    const waccNow = 100 * r.wacc;
    const scen = s.preset === 'base' ? (es ? 'los flujos del consenso' : 'consensus flows') : (es ? `los flujos del escenario ${presetLabel(s.preset)}` : `the ${presetLabel(s.preset)} scenario's flows`);
    return r.perShare >= price
      ? (es ? `A la WACC del modelo (${fmtPct(waccNow, 1)}), ${scen} devuelven US$ ${fmtN(r.perShare, 0)}, por encima del precio de US$ ${fmtN(price, 2)}: el precio queda justificado con margen; el mercado exige al menos una WACC de ${iw != null ? fmtPct(100 * iw, 1) : 'n/d'} (beta ${ib != null ? fmtN(ib, 2) : 'n/d'}) para no pagar más.` : `At the model's ${fmtPct(waccNow, 1)} WACC, ${scen} return US$ ${fmtN(r.perShare, 0)}, above the US$ ${fmtN(price, 2)} price: the price is justified with room to spare; the market would need a WACC of at least ${iw != null ? fmtPct(100 * iw, 1) : 'n/a'} (beta ${ib != null ? fmtN(ib, 2) : 'n/a'}) to pay no more.`)
      : (es ? `A la WACC del modelo (${fmtPct(waccNow, 1)}), ${scen} devuelven US$ ${fmtN(r.perShare, 0)}, ${fmtPct(100 * (1 - r.perShare / price), 0)} por debajo de US$ ${fmtN(price, 2)}. Para justificar el precio tiene que ser cierto uno de estos: una WACC de ${iw != null ? fmtPct(100 * iw, 1) : 'n/d'} (beta ${ib != null ? fmtN(ib, 2) : 'n/d'}, con las estimaciones en archivo entre ${pn ? fmtN(pn.bMin, 2) : '—'} y ${pn ? fmtN(pn.bMax, 2) : '—'}${reachTxt}), o, a cada WACC de la tabla, el margen terminal o el ritmo de crecimiento que se indica.` : `At the model's ${fmtPct(waccNow, 1)} WACC, ${scen} return US$ ${fmtN(r.perShare, 0)}, ${fmtPct(100 * (1 - r.perShare / price), 0)} below US$ ${fmtN(price, 2)}. To justify the price one of these has to be true: a WACC of ${iw != null ? fmtPct(100 * iw, 1) : 'n/a'} (beta ${ib != null ? fmtN(ib, 2) : 'n/a'}, against estimates on file of ${pn ? fmtN(pn.bMin, 2) : '—'} to ${pn ? fmtN(pn.bMax, 2) : '—'}${reachTxt}), or, at each WACC in the table, the terminal margin or the growth pace shown.`);
  }
  function dcfTruthRows(s, r, price) { const waccNow = 100 * r.wacc; return [waccNow, 9, 8].map((w) => { const over = w === waccNow ? {} : { rf: rfForWacc(s, w) }; const v = dcfCompute(s, over).perShare; return { w, v, model: w === waccNow, dm: impliedMarginShift(s, price, w === waccNow ? null : w), gm: impliedGrowthMult(s, price, w === waccNow ? null : w), ig: impliedG(s, price, w === waccNow ? null : w) }; }); }
  // the scenario range (Bear / Base / Bull, the management-target variant) and the three lease treatments of the Base, all on
  // the cost of capital, taxes and horizon on screen; the Summary's range sentence and the lease note read this
  function scenarioRange(s) { const base0 = dcfDefaults('consensus', s.N); if (!base0) return null; const carry = (p) => { for (const kk of ['taxMode', 'taxNorm', 'leases', 'rf', 'erp', 'betaKey', 'beta', 'kd', 'kp', 'dw', 'method', 'g', 'mult', 'k', 'unwind']) p[kk] = s[kk]; return p; }; const v = {}; for (const p of PRESET_LIST) v[p] = dcfCompute(carry(dcfPreset(p, base0))).perShare; const bs = carry(dcfPreset('base', base0)); v.leaseOp = dcfCompute(bs, { leases: 'operating' }).perShare; v.leaseMix = dcfCompute(bs, { leases: 'mixed' }).perShare; v.leaseFin = dcfCompute(bs, { leases: 'finance_pv' }).perShare; const r0 = dcfCompute(bs); v.wacc1 = dcfCompute(bs, { rf: rfForWacc(bs, 100 * r0.wacc + 1) }).perShare; const tx = ['ltm', 'ramp', 'normalized'].map((m) => dcfCompute(bs, { taxMode: m }).perShare); v.taxSwing = Math.max(...tx) - Math.min(...tx); v.leaseSwing = v.leaseOp - v.leaseFin; v.bearSwing = v.base - v.bear; v.waccSwing = v.base - v.wacc1; return v; }
  // "the Blume-adjusted betas on file (1.53, 1.49) return US$ 137 and US$ 141, about the price" (or the estimates by name when they are not all Blume)
  const reachClause = (pn) => { const es = LANG === 'es'; const allBlume = pn.reach.every((x) => x.b.blume); const one = pn.reach.length === 1; const names = allBlume ? (es ? `${one ? 'la beta ajustada (Blume) en archivo' : 'las betas ajustadas (Blume) en archivo'} (${pn.reach.map((x) => `${fmtN(x.b.beta, 2)}${one ? `, ${betaLabel(x.k, true).replace(/,?\s*Blume.*$/, '')}` : ''}`).join(', ')})` : `${one ? 'the Blume-adjusted beta on file' : 'the Blume-adjusted betas on file'} (${pn.reach.map((x) => `${fmtN(x.b.beta, 2)}${one ? `, ${betaLabel(x.k, true).replace(/,?\s*Blume.*$/, '')}` : ''}`).join(', ')})`) : (es ? `${one ? 'la estimación' : 'las estimaciones'} ${pn.reach.map((x) => `${fmtN(x.b.beta, 2)} (${betaLabel(x.k, true)})`).join(' y ')}` : `the ${pn.reach.map((x) => `${fmtN(x.b.beta, 2)} (${betaLabel(x.k, true)})`).join(' and ')} ${one ? 'estimate' : 'estimates'}`); const vals = pn.reach.map((x) => `US$ ${fmtN(x.v, 0)}`).join(es ? ' y ' : ' and '); return es ? `${names} ${one ? 'devuelve' : 'devuelven'} ${vals}, cerca del precio` : `${names} ${one ? 'returns' : 'return'} ${vals}, about the price`; };
  const leaseLabel = (k) => ({ operating: LANG === 'es' ? 'operativo' : 'operating', mixed: LANG === 'es' ? 'mixto' : 'mixed', finance_pv: LANG === 'es' ? 'financiero' : 'finance' })[k] || k;
  const URL_KEYS = ['v', 'basis', 'preset', 'N', 'revG', 'margin', 'sbc', 'daPct', 'capex', 'cf', 'unwind', 'tax', 'taxMode', 'taxNorm', 'leases', 'rf', 'erp', 'betaKey', 'beta', 'kd', 'kp', 'pw', 'dw', 'method', 'g', 'mult', 'k'];
  function dcfFromUrl(base) {
    try {
      const p = new URLSearchParams(location.search).get('dcf'); if (!p) return base;
      const o = JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/')))));
      // scenario links from older models carry a different frame or no tax/lease switches: keep only what still applies
      const keys = o.v >= 2 ? URL_KEYS : ['rf', 'erp', 'beta', 'kd', 'dw', 'method', 'g', 'mult'];
      if (o.v >= 2 && (o.N !== base.N || o.basis !== base.basis)) { const d = dcfDefaults(o.basis, o.N); if (d) Object.assign(base, d); }
      for (const k of keys) if (o[k] != null && (!Array.isArray(base[k]) || (Array.isArray(o[k]) && o[k].length === base[k].length))) base[k] = o[k];
      if (o.v === 2) base.preset = 'custom';
    } catch (e) { /* ignore */ }
    return base;
  }
  function dcfToUrl(s) { const o = {}; for (const k of URL_KEYS) o[k] = s[k]; const enc = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); const u = new URL(location.href); u.searchParams.set('dcf', enc); u.searchParams.set('lang', LANG); history.replaceState(null, '', u.toString()); return u.toString(); }
  const presetLabel = (p) => ({ bear: LANG === 'es' ? 'Pesimista' : 'Bear', base: LANG === 'es' ? 'Base (consenso)' : 'Base (consensus)', bull: LANG === 'es' ? 'Optimista' : 'Bull', mgmt: LANG === 'es' ? 'Objetivo de la administración' : 'Management target', custom: LANG === 'es' ? 'Personalizado' : 'Custom' })[p] || p;
  // the scenario buttons; re-rendered after any manual edit of the operating inputs so Base is no longer highlighted and the Custom badge shows (round 4)
  const presetBar = (s) => PRESET_LIST.map((p) => `<button type="button" class="btn preset ${s.preset === p ? 'primary' : ''}" data-preset="${p}" aria-pressed="${s.preset === p}">${presetLabel(p)}</button>`).join('') + (s.preset === 'custom' ? `<span class="badge">${presetLabel('custom')}</span>` : '');
  function dcfInputsHtml(s) {
    const es = LANG === 'es';
    const num = (k, step = 0.1, min, max) => `<input type="number" step="${step}" ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} data-k="${k}" value="${s[k]}" aria-label="${k}">`;
    const row = (name, sub, ctl) => `<div class="inp"><div class="name">${name}${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;
    const E = Math.min(DCF_EDIT_YEARS, s.N);
    const yrs = s.years.slice(0, E).map((y, i) => `${es ? 'AF' : 'FY'}${String(y).slice(2)}${i === 0 && dcfFrame().ytd.months ? '*' : ''}`);
    const arr = (k, step, label, sub, fmt = (v) => v) => `<div class="inp years"><div class="name">${label}${sub ? `<small>${sub}</small>` : ''}</div><div class="row5">${yrs.map((y) => `<span>${y}</span>`).join('')}${s[k].slice(0, E).map((v, i) => `<input type="number" step="${step}" data-k="${k}" data-i="${i}" value="${fmt(v)}" aria-label="${k} ${yrs[i]}">`).join('')}</div></div>`;
    const cons = s.basis === 'consensus';
    const bsel = Object.keys(BETAS).filter((k) => BETAS[k]).map((k) => `<option value="${k}"${s.betaKey === k ? ' selected' : ''}>${fmtN(BETAS[k].beta, 2)} · ${betaLabel(k, true)}</option>`).join('') + `<option value="custom"${s.betaKey === 'custom' ? ' selected' : ''}>${es ? 'personalizada' : 'custom'}</option>`;
    const cl = bridgeClaims();
    return `
      <h4>${es ? 'Escenario' : 'Scenario'}</h4>
      <div class="presets">${presetBar(s)}</div>
      <p class="small muted" style="margin:6px 0 0">${es ? 'Base = consenso de FactSet tal cual; el pesimista mueve tres palancas contra el consenso y el optimista las pone en el plan, con tope en el objetivo AF2030 (tabla de escenarios); el objetivo de la administración es una cuarta fila aparte. Un cambio manual convierte el escenario en Personalizado.' : 'Base = FactSet consensus as it stands; Bear moves three levers against consensus and Bull sets them to the plan, capped at the FY2030 target (scenarios table); the management target is a separate fourth row. A manual change turns the scenario into Custom.'}</p>
      <h4>${es ? 'Operación' : 'Operations'}</h4>
      ${row(es ? 'Base de la proyección' : 'Projection basis', cons ? (es ? `consenso de FactSet (${fmtDate(FS.asOf)}) para ${s.consYears} años fiscales, después reglas de desvanecimiento` : `FactSet consensus (${fmtDate(FS.asOf)}) for ${s.consYears} fiscal years, then fade rules`) : (es ? 'guía del AF y objetivo de ingresos AF2030 de la administración; razones de costo del consenso' : "management's FY guide and FY2030 revenue target; cost ratios from consensus"), `<select data-k="basis"><option value="consensus"${cons ? ' selected' : ''}>${es ? 'Consenso FactSet' : 'FactSet consensus'}</option><option value="guidance"${!cons ? ' selected' : ''}>${es ? 'Guía de la administración' : 'Management targets'}</option></select>`)}
      ${row(es ? 'Años explícitos' : 'Explicit years', es ? 'incluye el año fiscal en curso como periodo parcial' : 'includes the current fiscal year as a stub', `<select data-k="N">${[5, 7, 10].map((n) => `<option value="${n}"${s.N === n ? ' selected' : ''}>${n}</option>`).join('')}</select>`)}
      ${arr('revG', 0.5, es ? 'Crecimiento de ingresos (%)' : 'Revenue growth (%)', es ? `sobre el AF${String(s.baseFy).slice(2)} reportado (US$ ${fmtN(s.baseRev)} M)` : `on reported FY${String(s.baseFy).slice(2)} (US$ ${fmtN(s.baseRev)} M)`)}
      ${arr('margin', 0.5, cons ? (es ? 'Margen EBITDA ajustado, antes de compensación en acciones (%)' : 'Adjusted EBITDA margin, before stock-based comp. (%)') : (es ? 'Margen EBITDA GAAP (%)' : 'GAAP EBITDA margin (%)'), cons ? (es ? 'base de los brokers (consenso de FactSet)' : 'brokers\' basis (FactSet consensus)') : (es ? 'UDM, ya neto de compensación en acciones' : 'LTM, already net of stock-based compensation'))}
      ${row(es ? 'Compensación en acciones (% de ingresos)' : 'Stock-based compensation (% of revenue)', cons ? (es ? 'se resta del EBITDA ajustado; UDM por defecto' : 'deducted from adjusted EBITDA; LTM by default') : (es ? '0: ya está en el margen GAAP' : '0: already in the GAAP margin'), num('sbc', 0.1, 0, 20))}
      ${arr('daPct', 0.5, es ? 'D&A (% de ingresos)' : 'D&A (% of revenue)', es ? 'consenso de FactSet donde existe' : 'FactSet consensus where available')}
      ${arr('capex', 1000, es ? 'Capex bruto (US$ M)' : 'Gross capex (US$ M)', es ? 'antes de prepagos de clientes' : 'before customer prepayments')}
      ${arr('cf', 1, es ? 'Financiado por clientes (% del capex)' : 'Customer-funded (% of capex)', s.capexGuide && s.capexGuide.netMax ? (es ? `guía AF${String(s.capexGuide.v.fyGuided).slice(2)}: US$ ${fmtN(s.capexGuide.lo)}–${fmtN(s.capexGuide.hi)} mil M bruto, neto ≤ US$ ${fmtN(s.capexGuide.netMax)} mil M` : `FY${String(s.capexGuide.v.fyGuided).slice(2)} guide: US$ ${fmtN(s.capexGuide.lo)}–${fmtN(s.capexGuide.hi)} bn gross, net ≤ US$ ${fmtN(s.capexGuide.netMax)} bn`) : '')}
      ${row(es ? 'Reversión de prepagos (años)' : 'Prepayment unwind (years)', L(D.prepayUnwindSource), num('unwind', 1, 0, 15))}
      ${row(es ? 'Arrendamientos no iniciados' : 'Uncommenced leases', es ? `US$ ${fmtN((cl.uncNominal || 0) / 1000, 0)} mil M nominales (${ref('obligations')}); ver la nota "Arrendamientos en el DCF"` : `US$ ${fmtN((cl.uncNominal || 0) / 1000, 0)} bn nominal (${ref('obligations')}); see the "Leases in the DCF" note`, `<select data-k="leases"><option value="operating"${s.leases === 'operating' ? ' selected' : ''}>${es ? 'Operativos: renta en el EBITDA' : 'Operating: rent in EBITDA'}</option><option value="mixed"${s.leases === 'mixed' ? ' selected' : ''}>${es ? `Mixto: restar ${fmtPct(100 * (cl.finShare || 0), 0)} del VP (mezcla divulgada)` : `Mixed: deduct ${fmtPct(100 * (cl.finShare || 0), 0)} of the PV (disclosed mix)`}</option><option value="finance_pv"${s.leases === 'finance_pv' ? ' selected' : ''}>${es ? 'Financieros: restar su VP' : 'Finance: deduct their PV'}</option></select>`)}
      <h4>${es ? 'Impuestos' : 'Taxes'}</h4>
      ${row(es ? 'Normalización de la tasa' : 'Tax normalization', es ? 'ver la nota "Tasa de impuestos" abajo' : 'see the "Tax rate" note below', `<select data-k="taxMode"><option value="ltm"${s.taxMode === 'ltm' ? ' selected' : ''}>${es ? 'Efectiva UDM, constante' : 'LTM effective, held'}</option><option value="ramp"${s.taxMode === 'ramp' ? ' selected' : ''}>${es ? 'Rampa UDM → normalizada' : 'Ramp LTM → normalized'}</option><option value="normalized"${s.taxMode === 'normalized' ? ' selected' : ''}>${es ? 'Normalizada desde el año 1' : 'Normalized from year 1'}</option></select>`)}
      ${row(es ? 'Tasa efectiva UDM (%)' : 'LTM effective rate (%)', es ? 'provisión ÷ utilidad antes de impuestos, cuatro trimestres' : 'provision ÷ pretax income, four quarters', num('tax', 0.5, 0, 60))}
      ${row(es ? 'Tasa normalizada (%)' : 'Normalized rate (%)', TAX ? (es ? `federal ${fmtPct(TAX.fy2026.statutory_rate_pct, 1)} + estatal ${fmtPct(TAX.state.pct, 1)} (10-K)` : `federal ${fmtPct(TAX.fy2026.statutory_rate_pct, 1)} + state ${fmtPct(TAX.state.pct, 1)} (10-K)`) : '', num('taxNorm', 0.5, 0, 60))}
      ${s.N > DCF_EDIT_YEARS ? `<p class="small muted" style="margin:6px 0 0">${es ? `Años ${DCF_EDIT_YEARS + 1}–${s.N}: el crecimiento se reduce a la mitad cada año hasta g; margen y D&A se mantienen; el capex/ingresos converge a k × D&A; la porción financiada por clientes baja a cero.` : `Years ${DCF_EDIT_YEARS + 1}–${s.N}: growth halves each year down to g; margin and D&A hold; capex/revenue converges to k × D&A; the customer-funded share fades to zero.`}</p>` : ''}
      <h4>${es ? 'Costo de capital' : 'Cost of capital'}</h4>
      ${row(es ? 'Tasa libre de riesgo (%)' : 'Risk-free rate (%)', us10Last ? `${es ? 'Tesoro a 10 años' : '10-year Treasury'} ${fmtPct(us10Last[1], 2)} · ${us10Link()}, ${fmtDate(us10Last[0])}` : '', num('rf', 0.05))}
      ${row(es ? 'Prima de riesgo de mercado (%)' : 'Equity risk premium (%)', ERP ? `${es ? 'implícita S&P 500, Damodaran' : 'implied S&P 500, Damodaran'} ${fmtDate(ERP.asOf)}${daysSince(ERP.asOf) > 45 ? ` <span class="stale">${es ? 'antigua' : 'old'}</span>` : ''}` : (es ? 'supuesto (sin dato de Damodaran)' : 'assumption (no Damodaran reading)'), num('erp', 0.05))}
      ${row('Beta', es ? 'ORCL contra S&P 500' : 'ORCL against the S&P 500', `<select data-k="betaKey">${bsel}</select>`)}
      ${s.betaKey === 'custom' ? row(es ? 'Beta personalizada' : 'Custom beta', '', num('beta', 0.05)) : ''}
      ${row(es ? 'Costo de deuda antes de impuestos (%)' : 'Pre-tax cost of debt (%)', KD && KD.spread != null ? (es ? `Tesoro a 10 años ${KD.tsyNow ? `${fmtPct(KD.tsyNow[1], 2)} (${fmtDate(KD.tsyNow[0])})` : 'hoy'} + ${fmtN(KD.spread, 2)} pp de diferencial de emisión (${KD.name}, ${fmtPct(KD.coupon, 2)}, ${fmtDate(KD.issued)}); también para los arrendamientos financieros` : `10-year Treasury ${KD.tsyNow ? `${fmtPct(KD.tsyNow[1], 2)} (${fmtDate(KD.tsyNow[0])})` : 'today'} + ${fmtN(KD.spread, 2)} pp issue spread (${KD.name}, ${fmtPct(KD.coupon, 2)}, ${fmtDate(KD.issued)}); also applied to the finance leases`) : '', num('kd', 0.05))}
      ${row(es ? 'Costo de las preferentes (%)' : 'Cost of the preferred (%)', es ? `dividendo ${fmtPct(cl.prefRate, 2)} del prospecto, sin escudo fiscal; ${fmtPct(s.pw, 1)} de los pasivos ponderados` : `${fmtPct(cl.prefRate, 2)} dividend per the prospectus, no tax shield; ${fmtPct(s.pw, 1)} of the weighted claims`, num('kp', 0.05))}
      ${row(es ? 'Pasivos / (pasivos + capital) (%)' : 'Claims / (claims + equity) (%)', es ? `deuda neta US$ ${fmtN(cl.netDebtM / 1000, 1)} + arrend. financieros US$ ${fmtN(cl.finLease / 1000, 1)} + preferentes US$ ${fmtN(cl.pref / 1000, 1)} mil M = US$ ${fmtN(cl.total / 1000, 1)} mil M: los mismos pasivos que resta el puente` : `net debt US$ ${fmtN(cl.netDebtM / 1000, 1)} + finance leases US$ ${fmtN(cl.finLease / 1000, 1)} + preferred US$ ${fmtN(cl.pref / 1000, 1)} bn = US$ ${fmtN(cl.total / 1000, 1)} bn: the same claims the bridge deducts`, num('dw', 1, 0, 90))}
      <h4>${t('tv')}</h4>
      ${row(es ? 'Método' : 'Method', '', `<select data-k="method"><option value="perpetuity"${s.method === 'perpetuity' ? ' selected' : ''}>${es ? 'Perpetuidad (Gordon)' : 'Perpetuity (Gordon)'}</option><option value="multiple"${s.method === 'multiple' ? ' selected' : ''}>${es ? 'Múltiplo de salida' : 'Exit multiple'}</option></select>`)}
      ${row(es ? 'Crecimiento terminal (%)' : 'Terminal growth (%)', es ? 'nominal, en dólares' : 'nominal, dollars', num('g', 0.25))}
      ${row(es ? 'Capex terminal / D&A (k)' : 'Terminal capex / D&A (k)', es ? `1 + g × vida útil / 2 (servidores: ${s.life} años, 10-Q)` : `1 + g × useful life / 2 (servers: ${s.life} years, 10-Q)`, num('k', 0.05, 0.8, 2))}
      ${row(es ? 'Múltiplo de salida VE/EBITDA' : 'Exit EV/EBITDA multiple', '', num('mult', 0.5))}
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="dcfReset">${es ? 'Restablecer supuestos' : 'Reset assumptions'}</button><button type="button" class="btn" id="dcfCopy">${es ? 'Copiar enlace del escenario' : 'Copy scenario link'}</button></div>`;
  }
  function renderDcf(reset) {
    if (!el('dcfInputs')) return;
    if (reset || !dcfState.s) dcfState.s = reset ? dcfDefaults() : dcfFromUrl(dcfDefaults());
    const s = dcfState.s; if (!s) { html('dcfInputs', `<p class="muted small">${t('na')}</p>`); return; }
    const box = el('dcfInputs'); box.innerHTML = dcfInputsHtml(s);
    box.querySelectorAll('input,select').forEach((inp) => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
      const k = inp.dataset.k; const v = inp.tagName === 'SELECT' && !['N'].includes(k) ? inp.value : Number(inp.value);
      if (k === 'basis' || k === 'N') { const d = dcfDefaults(k === 'basis' ? v : s.basis, k === 'N' ? v : s.N); for (const kk of ['basis', 'N', 'years', 'revG', 'margin', 'sbc', 'daPct', 'capex', 'cf', 'consYears', 'baseRev', 'baseFy', 'k', 'capexGuide']) s[kk] = d[kk]; s.preset = d.basis === 'consensus' ? 'base' : 'custom'; dcfToUrl(s); renderDcf(); return; }
      if (k === 'betaKey') { s.betaKey = v; if (BETAS[v]) s.beta = BETAS[v].beta; dcfToUrl(s); renderDcf(); return; }
      if (inp.dataset.i != null) s[k][+inp.dataset.i] = v; else s[k] = v;
      if (['revG', 'margin', 'daPct', 'capex', 'cf', 'sbc'].includes(k) && s.preset !== 'custom') { s.preset = 'custom'; syncPresets(); }
      if (k === 'g' && D.terminalCapexToDa == null) { s.k = Math.round(100 * (1 + v / 100 * s.life / 2)) / 100; const kin = box.querySelector('input[data-k="k"]'); if (kin) kin.value = s.k; }
      if (['taxMode', 'leases', 'method'].includes(k)) { dcfToUrl(s); renderDcf(); return; }
      dcfToUrl(s); renderDcfOutputs();
    }));
    const wirePresets = () => box.querySelectorAll('button.preset').forEach((b) => b.addEventListener('click', () => { const p = dcfPreset(b.dataset.preset, dcfDefaults(s.basis, s.N)); if (!p) return; for (const kk of ['taxMode', 'taxNorm', 'leases', 'rf', 'erp', 'betaKey', 'beta', 'kd', 'kp', 'dw', 'method', 'g', 'mult', 'k', 'unwind']) p[kk] = s[kk]; dcfState.s = p; dcfToUrl(p); renderDcf(); }));
    const syncPresets = () => { const pb = box.querySelector('.presets'); if (!pb) return; pb.innerHTML = presetBar(s); wirePresets(); };
    wirePresets();
    el('dcfReset').addEventListener('click', () => { const u = new URL(location.href); u.searchParams.delete('dcf'); history.replaceState(null, '', u.toString()); renderDcf(true); });
    el('dcfCopy').addEventListener('click', async () => { const u = dcfToUrl(s); try { await navigator.clipboard.writeText(u); el('dcfCopy').textContent = LANG === 'es' ? 'Enlace copiado' : 'Link copied'; } catch (e) { /* ignore */ } });
    renderDcfOutputs();
  }
  function renderDcfOutputs() {
    const s = dcfState.s; const r = dcfCompute(s); if (!r) return; const es = LANG === 'es';
    const price = dcfPrice(), F = r.frame;
    el('dcfHero').textContent = r.perShare != null && isFinite(r.perShare) ? 'US$ ' + fmtN(r.perShare, 0) : '—';
    el('dcfHeroLbl').textContent = `${t('perShare')} · ${es ? 'escenario' : 'scenario'} ${presetLabel(s.preset)}${price && r.perShare ? ` · ${fmtPct(100 * (r.perShare / price - 1), 0, true)} ${t('upside')} (US$ ${fmtN(price, 2)}, ${fmtDate(lastPx[0])})` : ''}`;
    const pn = price ? priceNeeds(s, price) : null, iw = pn ? pn.iw : null, ig = price ? impliedG(s, price) : null;
    const ib = pn ? pn.ib : null; // the beta that would make the model return the price
    const reachTxt = pn && pn.reach.length ? `; ${reachClause(pn)}` : '';
    html('dcfOutputs', [
      { v: fmtPct(100 * r.wacc, 2), l: `WACC · Ke ${fmtPct(r.ke, 1)} · ${es ? 'costo de los pasivos' : 'cost of the claims'} ${fmtPct(r.costD, 1)}${iw != null ? ` · ${es ? 'implícita por el precio' : 'implied by the price'} ${fmtPct(100 * iw, 1)}` : ''}` },
      { v: fmtBn(r.ev), l: t('ev') },
      { v: fmtBn(r.eq), l: es ? 'Valor del capital común' : 'Common equity value' },
      { v: fmtPct(100 * r.tvShare, 0), l: es ? `VP del valor terminal / VE (${s.N} años explícitos)` : `PV of terminal value / EV (${s.N} explicit years)` },
      s.method === 'perpetuity'
        ? { v: r.impliedTermMult ? `${fmtX(r.impliedTermMult.onNext)} · ${fmtX(r.impliedTermMult.onLast)}` : '—', l: es ? `VE/EBITDA terminal implícito por la perpetuidad (sobre el EBITDA del año terminal · del AF${String(r.rows[r.rows.length - 1].fy).slice(2)})` : `terminal EV/EBITDA implied by the perpetuity (on terminal-year EBITDA · on FY${String(r.rows[r.rows.length - 1].fy).slice(2)} EBITDA)` }
        : { v: r.impliedTermG != null ? fmtPct(r.impliedTermG, 2) : '—', l: es ? `crecimiento perpetuo implícito por el múltiplo de salida de ${fmtX(s.mult)}` : `perpetual growth implied by the ${fmtX(s.mult)} exit multiple` },
      { v: `${fmtX(r.terminal.capexToDa, 2)} · ${fmtPct(r.terminal.capexPct, 0)}`, l: es ? 'capex terminal: × D&A · % de ingresos' : 'terminal capex: × D&A · % of revenue' },
      { v: fmtX(r.impliedMult), l: es ? 'VE / EBITDA NTM implícito (consenso)' : 'implied EV / NTM EBITDA (consensus)' },
      { v: `${fmtPct(r.rows[0].taxRate, 1)} → ${fmtPct(r.taxT, 1)}`, l: es ? `tasa de impuestos: año 1 → terminal (${({ ltm: 'efectiva UDM constante', ramp: 'rampa', normalized: 'normalizada' })[s.taxMode]})` : `tax rate: year 1 → terminal (${({ ltm: 'LTM held', ramp: 'ramp', normalized: 'normalized' })[s.taxMode]})` },
    ].map((o) => `<div class="out"><div class="v">${o.v}</div><div class="l">${o.l}</div></div>`).join(''));
    // projection table: the stub year first (marked), the terminal year last
    const cols = r.rows; const lastRow = cols[cols.length - 1];
    const hdr = `<tr><th>${es ? 'Año fiscal' : 'Fiscal year'}</th>${cols.map((x) => `<th>${es ? 'AF' : 'FY'}${String(x.fy).slice(2)}E${x.stub ? `<span class="sub">${x.months} ${es ? 'meses' : 'months'}*</span>` : ''}</th>`).join('')}<th>${es ? 'Terminal' : 'Terminal'}<span class="sub">${es ? 'AF' : 'FY'}${String(lastRow.fy + 1).slice(2)}</span></th></tr>`;
    const line = (l, f, d = 0, cls = '', tf) => `<tr class="${cls}"><td>${l}</td>${cols.map((x) => `<td>${fmtN(f(x), d)}</td>`).join('')}<td>${tf ? tf() : ''}</td></tr>`;
    const T = r.terminal;
    html('dcfTable', `<table><thead>${hdr}</thead><tbody>
      ${line(t('revenue'), (x) => x.rev, 0, 'bold', () => fmtN(T.rev))}
      ${line(es ? 'Crecimiento (%, año completo)' : 'Growth (%, full year)', (x) => x.growth, 1, 'sub', () => fmtN(s.g, 1))}
      ${s.sbc ? line(es ? 'EBITDA ajustado' : 'Adjusted EBITDA', (x) => x.ebitdaAdj, 0, 'sub') + line(es ? '− Compensación en acciones' : '− Stock-based compensation', (x) => -x.sbc, 0, 'sub') : ''}
      ${line(s.sbc ? (es ? 'EBITDA después de compensación en acciones' : 'EBITDA after stock-based compensation') : 'EBITDA', (x) => x.ebitda, 0, '', () => fmtN(T.ebitda))}
      ${line('− D&A', (x) => -x.da, 0, 'sub', () => fmtN(-T.da))}
      ${line(es ? 'Tasa de impuestos (%)' : 'Tax rate (%)', (x) => x.taxRate, 1, 'sub', () => fmtN(T.taxRate, 1))}
      ${line(es ? '− Impuestos sobre EBIT' : '− Taxes on EBIT', (x) => -x.taxes, 0, 'sub', () => fmtN(-T.taxes))}
      ${line(es ? '− Capex bruto' : '− Gross capex', (x) => -x.capex, 0, '', () => fmtN(-T.capex))}
      ${line(es ? '+ Prepagos de clientes recibidos' : '+ Customer prepayments received', (x) => x.inflow, 0, 'sub', () => '0')}
      ${line(es ? '− Prepagos reconocidos como ingreso (sin efectivo)' : '− Prepayments recognised as revenue (no cash)', (x) => -x.unwind, 0, 'sub', () => '—')}
      <tr class="total"><td>${es ? 'Flujo libre a la firma' : 'Unlevered free cash flow'}</td>${cols.map((x) => `<td class="${cls(x.fcf)}">${fmtN(x.fcf)}</td>`).join('')}<td>${fmtN(T.fcf)}</td></tr>
      ${line(es ? 'Años al punto medio' : 'Years to mid-period', (x) => x.t, 2, 'sub', () => '')}
      ${line(es ? 'Factor de descuento' : 'Discount factor', (x) => x.df, 3, 'sub', () => '')}
      ${line(t('pv'), (x) => x.pv, 0, '', () => fmtN(r.pvTv))}
      <tr class="head"><td colspan="${cols.length + 2}">${es ? 'VP flujos explícitos' : 'PV explicit flows'} ${fmtN(r.pvExplicit)} · ${es ? 'VP valor terminal' : 'PV terminal value'} ${fmtN(r.pvTv)} (${s.method === 'multiple' ? `${fmtX(s.mult)} EBITDA` : `${es ? 'perpetuidad' : 'perpetuity'} g ${fmtPct(s.g, 2)}`})${r.pvPost ? ` · ${es ? 'reversión de prepagos después del horizonte' : 'prepayment unwind after the horizon'} ${fmtN(r.pvPost)}` : ''} · ${es ? 'VE' : 'EV'} ${fmtN(r.ev)}</td></tr></tbody></table>`);
    el('dcfTableCap').textContent = es
      ? `US$ millones por año fiscal (junio–mayo). *${F.ytd.months ? `AF${String(F.curFy).slice(2)}: solo los ${12 - F.ytd.months} meses posteriores al ${qLabel(lastQ)} (el año completo menos lo ya reportado, que está en la deuda neta al ${fmtDate(F.bsDate)}). ` : ''}Flujos descontados a mitad de periodo a la fecha del último cierre (${fmtDate(F.valDate)}); el valor terminal, a mitad del año siguiente al horizonte.`
      : `US$ million by fiscal year (June–May). *${F.ytd.months ? `FY${String(F.curFy).slice(2)}: only the ${12 - F.ytd.months} months after ${qLabel(lastQ)} (the full year less what is already reported, which is in net debt at ${fmtDate(F.bsDate)}). ` : ''}Flows discounted at mid-period to the latest close (${fmtDate(F.valDate)}); the terminal value at the middle of the year after the horizon.`;
    // equity bridge
    const sh = r.shares, pf = (OB && OB.preferred) || {};
    const br = [
      [es ? 'Valor de la empresa (VE)' : 'Enterprise value (EV)', r.ev, es ? 'flujos explícitos + valor terminal + reversión de prepagos posterior' : 'explicit flows + terminal value + later prepayment unwind', 'bold'],
      [es ? '− Deuda neta reportada' : '− Reported net debt', -r.netDebtM, `${es ? 'notas por pagar − efectivo e inversiones' : 'notes payable − cash and investments'}, ${fmtDate(F.bsDate)}`],
      [`${es ? '− Pasivos por arrendamiento financiero' : '− Finance-lease liabilities'}${r.finLeaseAsOf && r.finLeaseAsOf !== F.bsDate ? ` (${fmtDate(r.finLeaseAsOf)})` : ''}`, -r.finLease, es ? 'deuda en sustancia: su costo (amortización e intereses) queda fuera del EBITDA; los operativos no se restan porque su renta ya está en el EBITDA' : 'debt in substance: their cost (amortization and interest) sits below EBITDA; operating leases are not deducted because their rent is already in EBITDA'],
      [es ? '− Preferentes convertibles obligatorias' : '− Mandatory convertible preferred', r.pref ? -r.pref : 0, es ? `preferencia de liquidación (valor en libros US$ ${fmtN(pf.carrying_value_usd_m)} M); se convierten en ${fmtN((pf.shares_if_converted_m || {}).min, 1)}–${fmtN((pf.shares_if_converted_m || {}).max, 1)} M de acciones el ${fmtDate(pf.mandatory_conversion_date)}` : `liquidation preference (carrying value US$ ${fmtN(pf.carrying_value_usd_m)} M); converts into ${fmtN((pf.shares_if_converted_m || {}).min, 1)}–${fmtN((pf.shares_if_converted_m || {}).max, 1)} M shares on ${fmtDate(pf.mandatory_conversion_date)}`],
      s.leases === 'finance_pv' || s.leases === 'mixed' ? [es ? `− VP de los arrendamientos no iniciados (estimación${s.leases === 'mixed' ? `, ${fmtPct(100 * (bridgeClaims().finShare || 0), 0)}` : ''})` : `− PV of the uncommenced leases (estimate${s.leases === 'mixed' ? `, ${fmtPct(100 * (bridgeClaims().finShare || 0), 0)}` : ''})`, -r.uncDeduct, es ? `${s.leases === 'mixed' ? 'tratamiento mixto elegido en los supuestos: la porción de arrendamientos financieros en los pasivos por arrendamiento reconocidos del 10-Q, aplicada al VP de' : 'tratamiento como arrendamientos financieros elegido en los supuestos:'} US$ ${fmtN(r.uncNominal / 1000, 0)} mil M nominales descontados con el método ilustrativo de ${ref('obligations')}; estimación FNAM, no una cifra de Oracle` : `${s.leases === 'mixed' ? 'mixed treatment chosen in the inputs: the finance share of the lease liabilities recognized in the 10-Q, applied to the PV of' : 'finance-lease treatment chosen in the inputs:'} US$ ${fmtN(r.uncNominal / 1000, 0)} bn nominal discounted with the illustrative method of ${ref('obligations')}; FNAM estimate, not an Oracle figure`] : null,
      [es ? '= Valor del capital común' : '= Common equity value', r.eq, '', 'total'],
      [es ? 'Acciones diluidas (millones)' : 'Diluted shares (millions)', sh ? sh.total : null, sh ? (es ? `${fmtN(sh.cover, 1)} M en la portada del 10-Q (${fmtDate(sh.coverAsOf)}) + ${fmtN(sh.dilutive, 0)} M de valores dilutivos (diluidas − básicas, ${boLabel(sh.dilutiveQuarter)}, XBRL)` : `${fmtN(sh.cover, 1)} M on the 10-Q cover (${fmtDate(sh.coverAsOf)}) + ${fmtN(sh.dilutive, 0)} M dilutive securities (diluted − basic, ${boLabel(sh.dilutiveQuarter)}, XBRL)`) : '', 'sub', 'shares'],
      [es ? '= Valor por acción (US$)' : '= Value per share (US$)', r.perShare, price ? `${fmtPct(100 * (r.perShare / price - 1), 1, true)} ${es ? 'frente a' : 'vs'} US$ ${fmtN(price, 2)}` : '', 'total', 'ps'],
    ].filter(Boolean);
    html('dcfBridge', `<table><tbody>${br.map((x) => `<tr class="${x[3] || ''}"><td>${x[0]}</td><td>${x[1] == null ? '—' : x[4] === 'shares' ? fmtN(x[1], 1) : x[4] === 'ps' ? fmtN(x[1], 2) : fmtN(x[1])}</td><td class="small muted" style="text-align:left;white-space:normal">${resolveRefs(x[2])}</td></tr>`).join('')}</tbody></table>`);
    // beta cross-check: the same model at each beta estimate
    const bRows = Object.keys(BETAS).filter((k) => BETAS[k]).map((k) => { const b = BETAS[k]; const x = dcfCompute(s, { beta: b.beta }); return { k, b, x }; });
    html('dcfBeta', `<table><thead><tr><th>${es ? 'Estimación de beta' : 'Beta estimate'}</th><th>Beta</th><th>${es ? 'Costo de capital' : 'Cost of equity'}</th><th>WACC</th><th>${es ? 'Valor por acción' : 'Value per share'}</th><th>${es ? 'vs precio' : 'vs price'}</th></tr></thead><tbody>${bRows.map(({ k, b, x }) => `<tr class="${k === s.betaKey ? 'bold' : ''}"><td>${betaLabel(k)}${k === (D.betaMethod || 'w2') ? ` <span class="badge">${es ? 'por defecto' : 'default'}</span>` : ''}<span class="sub">${b.n} ${b.freq === 'm' ? (es ? 'meses' : 'months') : (es ? 'semanas' : 'weeks')} · ${fmtDate(b.from)} → ${fmtDate(b.to)}</span></td><td>${fmtN(b.beta, 2)}</td><td>${fmtPct(x.ke, 1)}</td><td>${fmtPct(100 * x.wacc, 2)}</td><td><b>${fmtN(x.perShare, 0)}</b></td><td class="${cls(price ? x.perShare - price : null)}">${price ? fmtPct(100 * (x.perShare / price - 1), 0, true) : '—'}</td></tr>`).join('')}</tbody></table>`);
    // sensitivity: WACC (moved through the cost of equity) × terminal growth or exit multiple
    const waccs = [-1, -0.5, 0, 0.5, 1].map((d) => r.wacc * 100 + d);
    const gsx = s.method === 'multiple' ? [-2, -1, 0, 1, 2].map((d) => s.mult + d) : [-1, -0.5, 0, 0.5, 1].map((d) => s.g + d);
    const cell = (w, gv) => { const over = s.method === 'multiple' ? { mult: gv } : { g: gv }; over.rf = s.rf + (w - r.wacc * 100) / (1 - s.dw / 100); return dcfCompute(s, over).perShare; };
    const grid = waccs.map((w) => gsx.map((gv) => cell(w, gv)));
    html('dcfSens', `<table class="sens"><thead><tr><th>WACC ↓ / ${s.method === 'multiple' ? (es ? 'múltiplo →' : 'multiple →') : 'g →'}</th>${gsx.map((gv) => `<th>${s.method === 'multiple' ? fmtX(gv) : fmtPct(gv, 2)}</th>`).join('')}</tr></thead><tbody>${waccs.map((w, i) => `<tr><td>${fmtPct(w, 2)}</td>${gsx.map((gv, j) => { const v = grid[i][j]; const now = i === 2 && j === 2; const hi = price && v > price; return `<td class="center ${hi ? 'hi' : ''} ${now ? 'now' : ''}">${fmtN(v, 0)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`);
    el('sensCap').textContent = es ? `US$ por acción; sombreado = por encima del precio (US$ ${fmtN(price, 2)}); recuadro = caso en pantalla. La WACC se mueve a través del costo de capital. Una cuadrícula amplia siempre abarca el precio: la prueba está en el recuadro "Qué tiene que ser cierto".` : `US$ per share; shaded = above the price (US$ ${fmtN(price, 2)}); outlined = the case on screen. WACC moves through the cost of equity. A wide grid always brackets the price: the test is the "What has to be true" box.`;
    // what has to be true to justify the price (replaces the bracketing test, owner's request 2026-10-04): at the model's
    // WACC and at 8% and 9%, the uniform margin shift and the growth multiplier that return the price, plus the implied g
    const waccNow = 100 * r.wacc;
    const rowsW = dcfTruthRows(s, r, price);
    const mN = s.margin[Math.min(DCF_EDIT_YEARS, s.N) - 1] - s.sbc;
    const g2 = s.revG[1];
    const fmtDm = (dm) => (dm == null ? (es ? 'fuera de ±40 pp' : 'outside ±40 pp') : `${fmtPct(mN + dm, 1)} (${dm >= 0 ? '+' : ''}${fmtN(dm, 1)} pp)`);
    const fmtGm = (gm) => (gm == null ? (es ? 'fuera de 0–3×' : 'outside 0–3×') : `${fmtX(gm, 2)} ${es ? 'del ritmo del consenso' : 'of the consensus pace'} (${es ? 'AF' : 'FY'}${String(s.years[1]).slice(2)} ${fmtPct(g2 * gm, 0, true)})`);
    const need = rowsW.map((x) => `<tr class="${x.w === waccNow ? 'bold' : ''}"><td>${fmtPct(x.w, 1)}${x.w === waccNow ? ` <span class="badge">${es ? 'modelo' : 'model'}</span>` : ''}</td><td>US$ ${fmtN(x.v, 0)}</td><td>${fmtDm(x.dm)}</td><td>${fmtGm(x.gm)}</td><td>${x.ig == null ? '—' : fmtPct(x.ig, 1)}</td></tr>`).join('');
    const verdict = dcfCheckSentence(s, r, price);
    html('dcfCheck', `<b>${es ? `Qué tiene que ser cierto para justificar US$ ${fmtN(price, 2)}.` : `What has to be true to justify US$ ${fmtN(price, 2)}.`}</b> ${verdict}`);
    html('dcfTruth', `<table><thead><tr><th>WACC</th><th>${es ? 'Valor con los flujos actuales' : 'Value on the current flows'}</th><th>${es ? `Margen EBITDA terminal necesario (hoy ${fmtPct(mN, 1)} tras comp. en acciones)` : `Terminal EBITDA margin needed (now ${fmtPct(mN, 1)} after stock-based comp.)`}</th><th>${es ? 'o ritmo de crecimiento necesario' : 'or growth pace needed'}</th><th>${es ? 'o g terminal necesaria' : 'or terminal g needed'}</th></tr></thead><tbody>${need}</tbody></table>`);
    el('dcfTruthCap').textContent = es ? `Precio de US$ ${fmtN(price, 2)} (${fmtDate(lastPx[0])}) frente a los flujos del escenario ${presetLabel(s.preset)}. Cada columna mueve un solo supuesto y deja el resto como está: el margen suma el mismo número de puntos a todos los años; el ritmo multiplica cada tasa de crecimiento explícita después del año en curso; la g terminal mueve solo la perpetuidad. La WACC se mueve a través del costo de capital.` : `US$ ${fmtN(price, 2)} price (${fmtDate(lastPx[0])}) against the ${presetLabel(s.preset)} scenario's flows. Each column moves one assumption and holds the rest: the margin adds the same number of points to every year; the pace multiplies every explicit growth rate after the current year; terminal g moves the perpetuity only. WACC moves through the cost of equity.`;
    el('dcfCheck').className = `callout ${r.perShare != null && price && r.perShare < price ? 'warn' : ''}`;
    renderDcfPresets(s, price);
    renderDcfTaxNote(s, price);
    renderDcfLeaseNote(s, price);
    // one source line for the whole section (the section head carries the as-of / refreshed stamp)
    const dcfSrc = `${t('src')}: ${FS && FS.source && FS.source.url ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet'} (${es ? 'consenso por año fiscal' : 'fiscal-year consensus'} ${FS ? asOf(FS.asOf) : ''}) · ${relLink()} (${es ? 'trimestres reportados y deuda neta' : 'reported quarters and net debt'}) · ${OB ? extLink((obSrc('10q_1q27') || {}).url, es ? '10-Q (arrendamientos financieros, preferentes)' : '10-Q (finance leases, preferred)') : ''} · ${TAX ? extLink(TAX.source.url, es ? '10-K (conciliación de la tasa de impuestos)' : '10-K (tax-rate reconciliation)') : ''} · ${XB ? extLink(XB.source.url, es ? 'SEC XBRL (acciones, tasas)' : 'SEC XBRL (shares, rates)') : ''} · ${extLink(NASDAQ_URL, 'Nasdaq')} ${closeStamp()} · ${us10Link(es ? 'Tesoro a 10 años' : '10-year Treasury')}${us10Last ? ` ${fmtPct(us10Last[1], 2)} (${us10SrcName()}) ${asOf(us10Last[0])}` : ''}${ERP ? ` · ${extLink(ERP.url, es ? 'ERP implícita (Damodaran)' : 'implied ERP (Damodaran)')} ${asOf(ERP.asOf)}` : ''}`;
    html('dcfOutSrc', dcfSrc);
  }
  // ---- scenarios table: Bear / Base / Bull on the same cost of capital, with what each one assumes, spelled out from the data
  function renderDcfPresets(s, price) {
    if (!el('dcfPresets')) return; const es = LANG === 'es';
    const base0 = dcfDefaults(s.basis === 'guidance' ? 'consensus' : s.basis, s.N); if (!base0) return;
    const carry = (p) => { for (const kk of ['taxMode', 'taxNorm', 'leases', 'rf', 'erp', 'betaKey', 'beta', 'kd', 'kp', 'dw', 'method', 'g', 'mult', 'k', 'unwind']) p[kk] = s[kk]; return p; };
    const rows = PRESET_LIST.map((p) => { const sp = carry(dcfPreset(p, base0)); const r = dcfCompute(sp); const iw = price ? impliedWacc(sp, price) : null; return { p, s: sp, r, iw: iw ? iw.wacc : null, ig: price ? impliedG(sp, price) : null }; });
    const E = Math.min(DCF_EDIT_YEARS, s.N);
    const basePath = (sp) => { const out = []; let v = sp.baseRev; for (let i = 0; i < E; i++) { v *= 1 + sp.revG[i] / 100; out.push(v); } return out; };
    const yr = (i) => `${es ? 'AF' : 'FY'}${String(base0.years[i]).slice(2)}`;
    const mT = base0.margin[E - 1] - base0.sbc, mAdj = base0.margin[E - 1];
    const desc = {
      base: es ? `<b>Base = consenso de FactSet (${fmtDate(FS.asOf)}), sin ajustes.</b> Crecimiento de ingresos ${yr(1)} ${fmtPct(base0.revG[1], 1, true)} (${yr(2)} ${fmtPct(base0.revG[2], 1, true)}, ${yr(3)} ${fmtPct(base0.revG[3], 1, true)}); margen EBITDA ajustado ${fmtPct(mAdj, 1)} menos ${fmtPct(base0.sbc, 1)} de compensación en acciones = <b>${fmtPct(mT, 1)} después de compensación, mantenido para siempre</b> (desde ${yr(base0.consYears - 1)} hasta el año terminal). Es el ancla contra la que se miden las otras filas: el optimista solo adelanta la conversión contratada y queda topado en el objetivo AF2030 de la administración; el pesimista la retrasa.` : `<b>Base = FactSet consensus (${fmtDate(FS.asOf)}), unadjusted.</b> Revenue growth ${yr(1)} ${fmtPct(base0.revG[1], 1, true)} (${yr(2)} ${fmtPct(base0.revG[2], 1, true)}, ${yr(3)} ${fmtPct(base0.revG[3], 1, true)}); adjusted EBITDA margin ${fmtPct(mAdj, 1)} less ${fmtPct(base0.sbc, 1)} of stock-based compensation = <b>${fmtPct(mT, 1)} after stock-based comp., held forever</b> (from ${yr(base0.consYears - 1)} through the terminal year). It is the anchor the other rows are measured against: the Bull only brings the contracted conversion forward and is capped at management's FY2030 target; the Bear slows it.`,
    };
    const bull = rows.find((x) => x.p === 'bull').s, bear = rows.find((x) => x.p === 'bear').s, mgmt = rows.find((x) => x.p === 'mgmt').s;
    const bu = bull.bullRecipe || {}; const uPath = basePath(bull), cPath0 = basePath(base0); const bnB = (v) => fmtN(v / 1000, 0);
    const tIdx = bu.tgtIdx != null && bu.tgtIdx >= 0 ? bu.tgtIdx : null, nC = bu.nCons || E;
    const capTxt = tIdx != null && bu.tgt ? (es ? `; en ${yr(tIdx)} el nivel adelantado (US$ ${bnB(bu.cons1[tIdx + 1])} mil M) se topa en el objetivo de la administración de US$ ${bnB(bu.tgt)} mil M${(bu.capped || []).includes(tIdx) ? '' : ' (no activo este año)'}` : `; in ${yr(tIdx)} the one-year-ahead level (US$ ${bnB(bu.cons1[tIdx + 1])} bn) is capped at management's US$ ${bnB(bu.tgt)} bn target${(bu.capped || []).includes(tIdx) ? '' : ' (not binding this year)'}`) : '';
    const rejoin = nC < E ? (es ? `; desde ${yr(nC)} la trayectoria vuelve al nivel del consenso (US$ ${bnB(uPath[nC])} mil M)` : `; from ${yr(nC)} the path rejoins the consensus level (US$ ${bnB(uPath[nC])} bn)`) : '';
    const leadYrs = Array.from({ length: Math.max(0, Math.min(nC, E) - 1) }, (_, i) => i + 1).map((i) => `${yr(i)} US$ ${bnB(uPath[i])} ${es ? 'frente a' : 'vs'} US$ ${bnB(cPath0[i])}`).join(', ');
    desc.bull = es ? `<b>Optimista = las mismas tres palancas del pesimista, puestas en el plan, en el mismo orden, sobre una trayectoria que nunca supera el objetivo de la administración.</b> (1) La conversión del RPO va un año adelante del calendario del 10-Q: desde ${yr(1)} los ingresos toman el nivel del consenso del año siguiente (${leadYrs} mil M); es el mismo volumen contratado llegando antes, no más volumen (el RPO es el techo)${capTxt}${rejoin}. (2) Project Jupiter a tiempo: el calendario del consenso (no se aplica el retraso de ${bu.quarters} trimestres del pesimista). (3) Volumen de OpenAI según el plan: el volumen contratado completo (no se aplica el recorte de ${fmtPct(100 * (bu.haircut || 0), 0)}); no se supone nada por encima del plan. Margen y D&A se adelantan con el nivel de ingresos (espejo del retraso del pesimista); capex = plan contratado (consenso) + ingresos adicionales × la intensidad terminal ${fmtPct(100 * (bu.termInt || 0), 0)} (k × D&A/ingresos), así que sube con los ingresos adelantados (${yr(1)}: US$ ${bnB(bull.capex[1])} frente a US$ ${bnB(base0.capex[1])} mil M); mantener la razón capex/ingresos de cada año (${fmtPct(100 * base0.capex[1] / cPath0[1], 0)} en ${yr(1)}) cobraría la intensidad inicial de la expansión sobre ingresos que la capacidad del plan ya produce y dejaría el optimista por debajo del base.` : `<b>Bull = the Bear's three levers set to the plan, in the same order, on a path that never exceeds management's target.</b> (1) RPO conversion runs one year ahead of the 10-Q schedule: from ${yr(1)} revenue takes the following year's consensus level (${leadYrs} bn); the same contracted volume arrives sooner, not more of it (RPO is the ceiling)${capTxt}${rejoin}. (2) Project Jupiter on time: the consensus timing (the Bear's ${bu.quarters}-quarter slip is not applied). (3) OpenAI volume at plan: the contracted volume in full (the Bear's ${fmtPct(100 * (bu.haircut || 0), 0)} haircut is not applied); nothing above plan is assumed. Margin and D&A lead with the revenue level (the mirror of the Bear's lag); capex = the contracted plan (consensus) + the extra revenue × the ${fmtPct(100 * (bu.termInt || 0), 0)} terminal intensity (k × D&A/revenue), so it rises with the pulled-forward revenue (${yr(1)}: US$ ${bnB(bull.capex[1])} vs US$ ${bnB(base0.capex[1])} bn); holding each year's consensus capex/revenue ratio (${fmtPct(100 * base0.capex[1] / cPath0[1], 0)} in ${yr(1)}) would charge the early buildout intensity on revenue the plan's capacity already produces and would leave the Bull below the Base.`;
    desc.mgmt = mgmt.bullTarget ? (es ? `<b>Objetivo de la administración (variante aparte) = objetivo de ingresos de la administración</b> (US$ ${fmtN(mgmt.bullTarget.usd_bn)} mil M en el ${mgmt.bullTarget.fy}, ${mgmt.bullTarget.speaker}, ${fmtDate(mgmt.bullTarget.stated_on)}, p.${mgmt.bullTarget.page}) sobre la estructura de costos del consenso: el consenso del ${mgmt.bullTarget.fy} es US$ ${fmtN(mgmt.bullTarget.consensus / 1000, 1)} mil M, así que el objetivo añade ${fmtPct(100 * (Math.max(mgmt.bullTarget.usd_bn * 1000, mgmt.bullTarget.consensus) / mgmt.bullTarget.consensus - 1), 1, true)} ese año; márgenes, D&A y capex/ingresos iguales al consenso.` : `<b>Management target (separate variant) = management's revenue target</b> (US$ ${fmtN(mgmt.bullTarget.usd_bn)} bn in ${mgmt.bullTarget.fy}, ${mgmt.bullTarget.speaker}, ${fmtDate(mgmt.bullTarget.stated_on)}, p.${mgmt.bullTarget.page}) on the consensus cost structure: consensus for ${mgmt.bullTarget.fy} is US$ ${fmtN(mgmt.bullTarget.consensus / 1000, 1)} bn, so the target adds ${fmtPct(100 * (Math.max(mgmt.bullTarget.usd_bn * 1000, mgmt.bullTarget.consensus) / mgmt.bullTarget.consensus - 1), 1, true)} that year; margins, D&A and capex/revenue as consensus.`) : (es ? 'Objetivo de la administración: sin objetivo de largo plazo vigente; igual al consenso.' : 'Management target: no long-range target in force; equals consensus.');
    const bp = bear.bearRecipe || {}; const bPath = basePath(bear), cPath = basePath(base0);
    desc.bear = es ? `<b>Pesimista = tres ajustes al consenso, en este orden.</b> (1) La conversión del RPO se retrasa un año: desde ${yr(1)} los ingresos toman el nivel del consenso del año anterior (margen y D&A se retrasan con ellos; el capex es el plan contratado menos el faltante de ingresos × la intensidad terminal ${fmtPct(100 * (bp.termInt || 0), 0)}, la misma regla del optimista; el capex ${yr(0)} se mantiene porque ya está contratado). (2) Project Jupiter llega ${bp.quarters} trimestres tarde: ${fmtPct(100 * (bp.jShare || 0), 0)} de la capacidad nominal nombrada (${fmtN(bp.jupiterMw)} de ${fmtN(bp.planMw)} MW) × medio año del primer incremento tras el retraso = US$ ${fmtN((bp.moved || 0) / 1000, 1)} mil M pasan de ${bp.jFrom != null ? yr(bp.jFrom) : '—'} a ${bp.jFrom != null ? yr(bp.jFrom + 1) : '—'}. (3) Volumen de OpenAI −${fmtPct(100 * (bp.haircut || 0), 0)}: S&P estima que cerca de la mitad del RPO es OpenAI, así que ${fmtPct(100 * (bp.cut || 0), 1)} del incremento de ingresos sobre el AF${String(base0.baseFy).slice(2)} se elimina cada año. Resultado: ingresos ${yr(E - 1)} de US$ ${fmtN(bPath[E - 1] / 1000, 0)} mil M frente a US$ ${fmtN(cPath[E - 1] / 1000, 0)} mil M del consenso.` : `<b>Bear = three adjustments to consensus, in this order.</b> (1) RPO conversion slips one year: from ${yr(1)} revenue takes the prior year's consensus level (margin and D&A lag with it; capex is the contracted plan less the revenue shortfall × the ${fmtPct(100 * (bp.termInt || 0), 0)} terminal intensity, the same rule as the Bull; ${yr(0)} capex stands because it is already contracted). (2) Project Jupiter is ${bp.quarters} quarters late: ${fmtPct(100 * (bp.jShare || 0), 0)} of the named nameplate capacity (${fmtN(bp.jupiterMw)} of ${fmtN(bp.planMw)} MW) × half a year of the first incremental year after the slip = US$ ${fmtN((bp.moved || 0) / 1000, 1)} bn moves from ${bp.jFrom != null ? yr(bp.jFrom) : '—'} to ${bp.jFrom != null ? yr(bp.jFrom + 1) : '—'}. (3) OpenAI volume −${fmtPct(100 * (bp.haircut || 0), 0)}: S&P estimates about half of RPO is OpenAI, so ${fmtPct(100 * (bp.cut || 0), 1)} of the incremental revenue above FY${String(base0.baseFy).slice(2)} is removed every year. Result: ${yr(E - 1)} revenue of US$ ${fmtN(bPath[E - 1] / 1000, 0)} bn against US$ ${fmtN(cPath[E - 1] / 1000, 0)} bn for consensus.`;
    html('dcfPresets', `<table><thead><tr><th>${es ? 'Escenario' : 'Scenario'}</th><th>${es ? 'Ingresos' : 'Revenue'} ${yr(E - 1)}</th><th>${es ? 'Margen terminal' : 'Terminal margin'}</th><th>${es ? 'Valor por acción' : 'Value per share'}</th><th>${es ? 'vs precio' : 'vs price'}</th><th>${es ? 'VP terminal / VE' : 'PV of TV / EV'}</th><th>${es ? 'WACC implícita por el precio' : 'WACC implied by the price'}</th><th>${es ? 'g implícita' : 'implied g'}</th></tr></thead><tbody>${rows.map(({ p, s: sp, r, iw, ig }) => `<tr class="${sp.preset === s.preset ? 'bold' : ''}"><td>${presetLabel(p)}${p === s.preset ? ` <span class="badge ok">${es ? 'en pantalla' : 'on screen'}</span>` : ''}</td><td>${fmtBn(basePath(sp)[E - 1], 0)}</td><td>${fmtPct(sp.margin[E - 1] - sp.sbc, 1)}</td><td><b>US$ ${fmtN(r.perShare, 0)}</b></td><td class="${cls(price ? r.perShare - price : null)}">${price ? fmtPct(100 * (r.perShare / price - 1), 0, true) : '—'}</td><td>${fmtPct(100 * r.tvShare, 0)}</td><td>${iw != null ? fmtPct(100 * iw, 1) : '—'}</td><td>${ig != null ? fmtPct(ig, 1) : '—'}</td></tr>`).join('')}</tbody></table><details class="tbl" id="dcfRecipes"><summary>${es ? 'Cómo se construye cada escenario: palancas y trayectoria de ingresos' : 'How each scenario is built: levers and revenue paths'}</summary><div class="callout" style="margin-top:10px"><p style="margin:0 0 6px">${desc.base}</p><p style="margin:0 0 6px">${desc.bear}</p><p style="margin:0 0 6px">${desc.bull}</p><p style="margin:0">${desc.mgmt}</p></div></details>`);
    el('dcfPresetsCap').textContent = es ? `Los escenarios comparten el costo de capital, los impuestos y el tratamiento de arrendamientos en pantalla (WACC ${fmtPct(100 * rows[1].r.wacc, 2)}); solo cambian ingresos, márgenes y capex. La WACC implícita es la que devolvería el precio con los flujos de cada escenario; la g implícita, el crecimiento terminal que lo haría a la WACC en pantalla.` : `The scenarios share the cost of capital, taxes and lease treatment on screen (WACC ${fmtPct(100 * rows[1].r.wacc, 2)}); only revenue, margins and capex change. The implied WACC is the one that would return the price with each scenario's flows; the implied g, the terminal growth that would at the WACC on screen.`;
    html('dcfPresetsSrc', `${t('src')}: ${FS && FS.source && FS.source.url ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet'} ${FS ? asOf(FS.asOf) : ''} · ${es ? 'objetivo AF2030' : 'FY2030 target'}: ${irLink()} · ${es ? 'capacidad nominal por campus' : 'nameplate capacity per campus'}: ${ref('sites')} · ${es ? 'OpenAI ≈ la mitad del RPO' : 'OpenAI ≈ half of RPO'}: ${(BO && BO.unitEconomics && BO.unitEconomics.concentration && BO.unitEconomics.concentration.source) ? extLink(BO.unitEconomics.concentration.source.url, 'S&P Global Ratings, 9 Jul 2026') : 'S&P'} (${es ? 'estimación de un tercero' : 'third-party estimate'})`);
  }
  // ---- tax note: the LTM rate is not a steady-state rate; what the 10-K reconciliation says and what each mode is worth
  function renderDcfTaxNote(s, price) {
    if (!el('dcfTaxNote')) return; const es = LANG === 'es';
    const vals = ['ltm', 'ramp', 'normalized'].map((m) => ({ m, r: dcfCompute(s, { taxMode: m }) }));
    const lbl = { ltm: es ? `efectiva UDM (${fmtPct(s.tax, 1)}) constante` : `LTM effective (${fmtPct(s.tax, 1)}) held`, ramp: es ? `rampa de ${fmtPct(s.tax, 1)} a ${fmtPct(s.taxNorm, 1)} en el último año explícito` : `ramp from ${fmtPct(s.tax, 1)} to ${fmtPct(s.taxNorm, 1)} by the last explicit year`, normalized: es ? `${fmtPct(s.taxNorm, 1)} desde el año 1` : `${fmtPct(s.taxNorm, 1)} from year 1` };
    const tbl = `<table><thead><tr><th>${es ? 'Modo' : 'Mode'}</th><th>${es ? 'Tasa año 1 → terminal' : 'Rate year 1 → terminal'}</th><th>${es ? 'Valor por acción' : 'Value per share'}</th><th>${es ? 'vs precio' : 'vs price'}</th></tr></thead><tbody>${vals.map(({ m, r }) => `<tr class="${m === s.taxMode ? 'bold' : ''}"><td>${lbl[m]}${m === s.taxMode ? ` <span class="badge ok">${es ? 'en pantalla' : 'on screen'}</span>` : ''}${m === (D.taxMode || 'ramp') ? ` <span class="badge">${es ? 'por defecto' : 'default'}</span>` : ''}</td><td>${fmtPct(r.rows[0].taxRate, 1)} → ${fmtPct(r.taxT, 1)}</td><td><b>US$ ${fmtN(r.perShare, 0)}</b></td><td class="${cls(price ? r.perShare - price : null)}">${price ? fmtPct(100 * (r.perShare / price - 1), 0, true) : '—'}</td></tr>`).join('')}</tbody></table>`;
    let rec = '';
    if (TAX) {
      const q = XB && XB.concepts.tax_rate_effective ? (XB.concepts.tax_rate_effective.fiscal_years || []).find((x) => x.fiscal_year === 'FY2026') : null;
      const ok = (l) => { const c = XB && XB.concepts[l.xbrl]; const f = c && (c.fiscal_years || []).find((x) => x.fiscal_year === 'FY2026'); return f && Math.abs(Math.abs(f.value) - Math.abs(l.pct)) < 0.051 ? `<span class="badge ok" title="SEC XBRL ${c.concept}">XBRL ✓</span>` : `<span class="badge">${es ? 'texto' : 'text'}</span>`; };
      rec = `<table style="margin-top:10px"><thead><tr><th>${es ? 'Conciliación de la tasa, AF2026 (10-K)' : 'Rate reconciliation, FY2026 (10-K)'}</th><th>US$ M</th><th>pp</th><th></th></tr></thead><tbody><tr class="bold"><td>${es ? 'Tasa federal estatutaria' : 'US federal statutory rate'}</td><td>${fmtN(TAX.fy2026.pretax_income_usd_m * TAX.fy2026.statutory_rate_pct / 100)}</td><td>${fmtN(TAX.fy2026.statutory_rate_pct, 1)}</td><td>${q ? `<span class="badge ok">XBRL ✓</span>` : ''}</td></tr>${TAX.fy2026.lines.map((l) => `<tr class="sub"><td>${L(l)}</td><td>${fmtN(l.usd_m)}</td><td>${l.pct > 0 ? '+' : ''}${fmtN(l.pct, 1)}</td><td>${ok(l)}</td></tr>`).join('')}<tr class="total"><td>${es ? 'Tasa efectiva AF2026' : 'FY2026 effective rate'}</td><td>${fmtN(TAX.fy2026.provision_usd_m)}</td><td>${fmtN(TAX.fy2026.effective_rate_pct, 1)}</td><td>${q ? `<span class="badge ok">XBRL ✓</span>` : ''}</td></tr></tbody></table>`;
    }
    const why = TAX ? (es ? `<b>Por qué no se mantiene la tasa UDM.</b> La tasa efectiva del AF2026 (${fmtPct(TAX.fy2026.effective_rate_pct, 1)}) está ${fmtN(TAX.fy2026.statutory_rate_pct - TAX.fy2026.effective_rate_pct, 1)} pp por debajo de la estatutaria por partidas que no son de estado estable: las partidas no gravables o no deducibles (${fmtN(TAX.fy2026.lines.find((l) => l.k === 'sbc').pct, 1)} pp, de las cuales el beneficio fiscal excedente de la compensación en acciones ${fmtN(TAX.fy2026.lines.find((l) => l.k === 'sbc').sbc_pct, 1)} pp, que depende del precio de la acción) y los créditos (${fmtN(TAX.fy2026.lines.find((l) => l.k === 'credits').pct, 1)} pp), parcialmente compensados por partidas únicas (ley promulgada +${fmtN(TAX.fy2026.lines.find((l) => l.k === 'enacted').pct, 1)} pp, beneficios no reconocidos +${fmtN(TAX.fy2026.lines.find((l) => l.k === 'utb').pct, 1)} pp). La tasa normalizada por defecto es la estatutaria (${fmtPct(TAX.fy2026.statutory_rate_pct, 1)}) más los impuestos estatales netos del beneficio federal (${fmtN(TAX.state.pct, 1)} pp, línea del ${TAX.state.fy}, el último año en que el 10-K la muestra por separado) = <b>${fmtPct(TAX.normalized.pct, 1)}</b>; la rampa (por defecto) deja que los créditos y el beneficio por acciones se agoten durante el horizonte en vez de desaparecer el primer año.` : `<b>Why the LTM rate is not held.</b> The FY2026 effective rate (${fmtPct(TAX.fy2026.effective_rate_pct, 1)}) sits ${fmtN(TAX.fy2026.statutory_rate_pct - TAX.fy2026.effective_rate_pct, 1)} pp below the statutory rate because of items that are not steady state: nontaxable or nondeductible items (${fmtN(TAX.fy2026.lines.find((l) => l.k === 'sbc').pct, 1)} pp, of which the excess tax benefit on stock-based compensation ${fmtN(TAX.fy2026.lines.find((l) => l.k === 'sbc').sbc_pct, 1)} pp, which depends on the share price) and credits (${fmtN(TAX.fy2026.lines.find((l) => l.k === 'credits').pct, 1)} pp), partly offset by one-time items (enacted law +${fmtN(TAX.fy2026.lines.find((l) => l.k === 'enacted').pct, 1)} pp, unrecognized benefits +${fmtN(TAX.fy2026.lines.find((l) => l.k === 'utb').pct, 1)} pp). The default normalized rate is the statutory rate (${fmtPct(TAX.fy2026.statutory_rate_pct, 1)}) plus state taxes net of federal benefit (${fmtN(TAX.state.pct, 1)} pp, the ${TAX.state.fy} line, the latest year the 10-K shows it separately) = <b>${fmtPct(TAX.normalized.pct, 1)}</b>; the ramp (default) lets the credits and the stock-based benefit run off over the horizon instead of vanishing in year one.`) : '';
    html('dcfTaxNote', `<p class="small" style="margin:0 0 8px">${why}</p><div class="tblwrap">${tbl}</div><div class="tblwrap">${rec}</div>`);
    html('dcfTaxSrc', `${t('src')}: ${TAX ? extLink(TAX.source.url, es ? `10-K AF2026, nota de impuestos, p. ${TAX.source.page}` : `FY2026 10-K, income taxes note, p. ${TAX.source.page}`) + ` · <span class="mono">${TAX.source.accession}</span>` : ''} · ${XB ? extLink(XB.source.url, 'SEC XBRL') : ''} · ${es ? 'tasa UDM: comunicados de resultados (provisión ÷ utilidad antes de impuestos de los cuatro trimestres)' : 'LTM rate: earnings releases (provision ÷ pretax income of the four quarters)'} ${relLink()}`);
  }
  // ---- leases note: ties the off-balance-sheet section to the DCF (what the bridge deducts, what consensus includes, what the
  // US$288 bn of uncommenced leases would do under each treatment)
  function renderDcfLeaseNote(s, price) {
    if (!el('dcfLeaseNote')) return; const es = LANG === 'es';
    const cl = bridgeClaims(); const Lz = (OB && OB.leases) || {}, cost = Lz.cost || {}, un = Lz.uncommenced || {}, pv = cl.uncPvMethod;
    const a = dcfCompute(s, { leases: 'operating' }), m = dcfCompute(s, { leases: 'mixed' }), b = dcfCompute(s, { leases: 'finance_pv' });
    const sr = scenarioRange(s); const Lz2 = (OB && OB.leases) || {};
    const fla = XB && XB.concepts.fin_lease_additions ? (XB.concepts.fin_lease_additions.fiscal_years || []).slice(-1)[0] : null;
    const rows = [
      [es ? 'Pasivos por arrendamientos financieros (en balance)' : 'Finance-lease liabilities (on the balance sheet)', fmtBn(cl.finLease), es ? 'restados en el puente: su costo (amortización del activo e intereses) queda por debajo del EBITDA' : 'deducted in the bridge: their cost (asset amortization and interest) sits below EBITDA'],
      [es ? 'Pasivos por arrendamientos operativos (en balance)' : 'Operating-lease liabilities (on the balance sheet)', fmtBn(Lz.operating_liabilities_total), es ? `no se restan: la renta (US$ ${fmtN((cost.operating_lease_cost_ltm || 0) / 1000, 1)} mil M UDM) está en los gastos de operación y, por tanto, dentro del EBITDA` : `not deducted: the rent (US$ ${fmtN((cost.operating_lease_cost_ltm || 0) / 1000, 1)} bn LTM) is in operating expenses and therefore inside EBITDA`],
      [es ? 'Arrendamientos firmados, no iniciados (nominal)' : 'Leases signed, not yet commenced (nominal)', `US$ ${fmtN(un.usd_bn, 0)} ${es ? 'mil M' : 'bn'}`, es ? `inician entre ${boLabel(un.commence_from)} y ${un.commence_to}, plazos ${un.term_years_min}–${un.term_years_max} años; Oracle no dice si serán operativos o financieros` : `commence between ${boLabel(un.commence_from)} and ${un.commence_to}, ${un.term_years_min}–${un.term_years_max}-year terms; Oracle does not say whether they will be operating or finance leases`],
      [es ? 'Su valor presente (estimación ilustrativa)' : 'Their present value (illustrative estimate)', cl.uncPv ? `≈ ${fmtBn(cl.uncPv)}` : '—', pv ? L({ es: pv.method_es, en: pv.method_en }) : ''],
      [es ? 'Adiciones por arrendamiento financiero, último año fiscal (XBRL)' : 'Finance-lease additions, latest fiscal year (XBRL)', fla ? fmtBn(fla.value) : (es ? 'no etiquetado' : 'not tagged'), es ? 'capacidad que entra sin pasar por el capex en efectivo; el consenso de capex no la incluye' : 'capacity that arrives without passing through cash capex; consensus capex does not include it'],
    ];
    const treat = es
      ? `<b>Cómo trata el consenso los arrendamientos.</b> FactSet publica el EBITDA y el capex que envían los brokers sobre los estados reportados de Oracle: el costo de los arrendamientos operativos está en los gastos (dentro del EBITDA) y el de los financieros por debajo; el capex del consenso (US$ ${fmtN((fsFiscal()[0] && fsFiscal()[0].capex ? fsFiscal()[0].capex.mean : 0) / 1000, 1)} mil M ${fsFiscal()[0] ? fsFiscal()[0].fy : ''}, ≈ la guía bruta) es capex en efectivo y excluye los pagos de arrendamiento y las adiciones por arrendamiento financiero. FactSet no indica si la trayectoria de margen de cada broker incluye la renta de los US$ ${fmtN(un.usd_bn, 0)} mil M que aún no empiezan. Por eso el DCF ofrece tres tratamientos: <b>operativos</b> (por defecto: la renta se supone dentro del margen del consenso, sin deducción), <b>mixto</b> (se resta ${fmtPct(100 * (cl.finShare || 0), 0)} del valor presente: la porción de arrendamientos financieros en los pasivos por arrendamiento reconocidos en el 10-Q, US$ ${fmtN((Lz2.finance_liabilities_total || 0) / 1000, 1)} de US$ ${fmtN(((Lz2.finance_liabilities_total || 0) + (Lz2.operating_liabilities_total || 0)) / 1000, 1)} mil M, la única mezcla que Oracle divulga) y <b>financieros</b> (se resta todo su valor presente estimado en el puente; si el margen del consenso ya carga esa renta, esto cuenta el costo dos veces y es un piso, no un valor).`
      : `<b>How consensus treats the leases.</b> FactSet publishes the EBITDA and capex the brokers submit on Oracle's reported statements: operating-lease cost sits in opex (inside EBITDA) and finance-lease cost below it; consensus capex (US$ ${fmtN((fsFiscal()[0] && fsFiscal()[0].capex ? fsFiscal()[0].capex.mean : 0) / 1000, 1)} bn ${fsFiscal()[0] ? fsFiscal()[0].fy : ''}, ≈ the gross guide) is cash capex and excludes lease payments and finance-lease additions. FactSet does not state whether each broker's margin path carries the rent of the US$ ${fmtN(un.usd_bn, 0)} bn not yet commenced. The DCF therefore offers three treatments: <b>operating</b> (default: the rent is assumed inside the consensus margin, nothing deducted), <b>mixed</b> (${fmtPct(100 * (cl.finShare || 0), 0)} of the present value is deducted: the finance share of the lease liabilities recognized in the 10-Q, US$ ${fmtN((Lz2.finance_liabilities_total || 0) / 1000, 1)} of US$ ${fmtN(((Lz2.finance_liabilities_total || 0) + (Lz2.operating_liabilities_total || 0)) / 1000, 1)} bn, the only mix Oracle discloses) and <b>finance</b> (their full estimated present value is deducted in the bridge; if the consensus margin already carries that rent this counts the cost twice, so it is a floor, not a value).`;
    html('dcfLeaseNote', `<p class="small" style="margin:0 0 8px">${treat}</p><div class="tblwrap"><table><tbody>${rows.map((x) => `<tr><td>${x[0]}</td><td><b>${x[1]}</b></td><td class="small muted" style="white-space:normal">${x[2]}</td></tr>`).join('')}</tbody></table></div><div class="stat-row" style="margin-top:10px"><div class="stat"><div class="v">US$ ${fmtN(a.perShare, 0)}</div><div class="l">${es ? 'por acción, tratamiento operativo (por defecto)' : 'per share, operating treatment (default)'}${s.leases === 'operating' ? ` · <span class="badge ok">${es ? 'en pantalla' : 'on screen'}</span>` : ''}</div></div><div class="stat"><div class="v">US$ ${fmtN(m.perShare, 0)}</div><div class="l">${es ? `mixto: ${fmtPct(100 * (cl.finShare || 0), 0)} del VP restado (mezcla divulgada)` : `mixed: ${fmtPct(100 * (cl.finShare || 0), 0)} of the PV deducted (disclosed mix)`}${s.leases === 'mixed' ? ` · <span class="badge ok">${es ? 'en pantalla' : 'on screen'}</span>` : ''}</div></div><div class="stat"><div class="v">US$ ${fmtN(b.perShare, 0)}</div><div class="l">${es ? 'financiero: todo el VP de los no iniciados restado' : 'finance: full PV of the uncommenced leases deducted'}${s.leases === 'finance_pv' ? ` · <span class="badge ok">${es ? 'en pantalla' : 'on screen'}</span>` : ''}</div></div><div class="stat"><div class="v">${fmtPct(100 * (b.perShare / a.perShare - 1), 0, true)}</div><div class="l">${es ? 'operativo → financiero' : 'operating → finance'}</div></div></div><p class="small" style="margin:8px 0 0"><b>${es ? 'El supuesto que más mueve el valor.' : 'The assumption that moves the value most.'}</b> ${(() => { if (!sr) return ''; const sw = [{ k: es ? 'el tratamiento de los arrendamientos no iniciados' : 'the uncommenced-lease treatment', v: sr.leaseSwing }, { k: es ? 'el escenario pesimista frente al base' : 'the Bear scenario against the Base', v: sr.bearSwing }, { k: es ? 'un punto más de WACC' : 'one point more of WACC', v: sr.waccSwing }, { k: es ? 'el modo de impuestos' : 'the tax mode', v: sr.taxSwing }].filter((x) => x.v != null && isFinite(x.v)).sort((x, y) => y.v - x.v); const lead = sw[0]; const isLease = lead && /arrendamiento|lease/.test(lead.k); return es ? `De operativo a financiero el valor pasa de US$ ${fmtN(a.perShare, 0)} a US$ ${fmtN(b.perShare, 0)} (US$ ${fmtN(sr.leaseSwing, 0)} por acción), ${isLease ? 'más que cualquier otro supuesto individual de esta página' : `solo por detrás de ${lead.k} (US$ ${fmtN(lead.v, 0)})`}: ${sw.filter((x) => !/arrendamiento/.test(x.k)).map((x) => `${x.k} US$ ${fmtN(x.v, 0)}`).join(', ')}. El veredicto del resumen usa el tratamiento ${leaseLabel(s.leases)}${s.leases === 'operating' ? ' (por defecto)' : ''}.` : `From operating to finance the value goes from US$ ${fmtN(a.perShare, 0)} to US$ ${fmtN(b.perShare, 0)} (US$ ${fmtN(sr.leaseSwing, 0)} per share), ${isLease ? 'more than any other single assumption on this page' : `second only to ${lead.k} (US$ ${fmtN(lead.v, 0)})`}: ${sw.filter((x) => !/lease/.test(x.k)).map((x) => `${x.k} US$ ${fmtN(x.v, 0)}`).join(', ')}. The Summary verdict uses the ${leaseLabel(s.leases)} treatment${s.leases === 'operating' ? ' (default)' : ''}.`; })()}</p><p class="small muted" style="margin:8px 0 0">${es ? `Las cifras y su procedencia están en ${ref('obligations')}; la lectura de los arrendamientos no iniciados: ${uncNote()}.` : `Figures and their provenance are in ${ref('obligations')}; the uncommenced-lease reading: ${uncNote()}.`}</p>`);
    const q10 = obSrc(Lz.source);
    html('dcfLeaseSrc', `${t('src')}: ${q10 ? extLink(q10.url, es ? '10-Q 1T27, nota de arrendamientos' : '1Q27 10-Q, leases note') : ''} · ${XB ? extLink(XB.source.url, 'SEC XBRL') : ''} · ${FS && FS.source ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet'} ${FS ? asOf(FS.asOf) : ''} · ${es ? 'VP ilustrativo' : 'illustrative PV'}: ${ref('obligations')}`);
  }

  // ================= 06 RELATIVE =================
  function renderRelative() {
    const es = LANG === 'es'; const nd = netDebt(lastQ); const ltm = lastLTM && lastLTM.is; const price = lastPx ? lastPx[1] : null;
    const fo = FS && FS.oracle ? FS.oracle : null, fn = fsNtm(); const fsStamp = FS ? `${es ? 'consenso FactSet al' : 'FactSet consensus as of'} ${fmtDate(FS.asOf)}` : '';
    const fsLink = FS && FS.source && FS.source.url ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet Estimates';
    const rows = [];
    if (price && sharesNow && ltm) {
      const mcM = price * sharesNow / 1e6; const evM = nd ? mcM + nd.net : null;
      rows.push([t('mktCap'), fmtBn(mcM), `${fmtN(sharesNow)} × US$ ${fmtN(price, 2)}`]);
      if (evM != null) rows.push([t('ev'), fmtBn(evM), `${t('mktCap')} + ${t('nd')} ${fmtN(nd.net)} M`]);
      if (fn.eps && fn.eps.mean > 0) rows.push([`<b>${es ? 'P / U' : 'P / E'} NTM</b>`, `<b>${fmtX(price / fn.eps.mean)}</b>`, `${es ? 'UPA NTM' : 'NTM EPS'} US$ ${fmtN(fn.eps.mean, 2)} (${es ? 'No-GAAP, base del consenso' : 'non-GAAP, consensus basis'}) · ${fsStamp}`]);
      for (const f of fsFiscal()) if (f.eps && f.eps.mean > 0) rows.push([`${es ? 'P / U' : 'P / E'} ${f.fy}E`, fmtX(price / f.eps.mean), `${es ? 'UPA' : 'EPS'} US$ ${fmtN(f.eps.mean, 2)} · ${f.eps.count} ${es ? 'analistas' : 'analysts'} · ${es ? 'año fiscal al' : 'fiscal year to'} ${fmtDate(f.fiscal_end)}`]);
      if (evM != null && fn.ebitda && fn.ebitda.mean > 0) rows.push([`<b>${es ? 'VE' : 'EV'} / EBITDA NTM</b>`, `<b>${fmtX(evM / fn.ebitda.mean)}</b>`, `EBITDA NTM ${fmtN(fn.ebitda.mean)} M (${es ? 'EBITDA ajustado según los brokers' : 'broker-adjusted EBITDA'}) · ${fsStamp}`]);
      if (evM != null && fn.sales && fn.sales.mean > 0) rows.push([(es ? 'VE / ingresos NTM' : 'EV / NTM revenue'), fmtX(evM / fn.sales.mean), `${fmtN(fn.sales.mean)} M · ${fsStamp}`]);
      if (fn.fcf && fn.fcf.mean != null) rows.push([es ? 'Rendimiento FCF NTM / capitalización' : 'NTM FCF yield / market cap', fmtPct(100 * fn.fcf.mean / mcM), `${fmtN(fn.fcf.mean)} M ${es ? 'consenso NTM (negativo: capex de la expansión)' : 'NTM consensus (negative: buildout capex)'}`]);
      const declLast = (REF.dividends || []).slice(-1)[0];
      if (declLast) rows.push([es ? 'Rendimiento por dividendo (anualizado)' : 'Dividend yield (annualised)', fmtPct(100 * declLast.dps * 4 / price), `US$ ${fmtN(declLast.dps, 2)} × 4 (${es ? 'último declarado' : 'latest declared'})`]);
      const refLbl = es ? 'referencia UDM' : 'LTM reference';
      if (evM != null && ltm.ebitda) rows.push([`<span class="muted">${es ? 'VE / EBITDA UDM' : 'EV / EBITDA LTM'}</span>`, `<span class="muted">${fmtX(evM / ltm.ebitda)}</span>`, `${refLbl} · EBITDA ${fmtN(ltm.ebitda)} M (GAAP + D&A)`]);
      if (ltm.epsDiluted) rows.push([`<span class="muted">${es ? 'P / U UDM GAAP' : 'P / E LTM GAAP'}</span>`, `<span class="muted">${fmtX(price / ltm.epsDiluted)}</span>`, `${refLbl} · ${es ? 'UPA' : 'EPS'} US$ ${fmtN(ltm.epsDiluted, 2)}`]);
      if (nd && ltm.ebitda) rows.push([t('lev'), fmtX(nd.net / ltm.ebitda, 2), es ? `UDM reportado (convención de crédito; ${ref('financing')} y ${ref('obligations')})` : `reported LTM (credit convention; ${ref('financing')} and ${ref('obligations')})`]);
    }
    html('multTable', `<table><thead><tr><th>${t('metric')}</th><th>${t('value')}</th><th>${t('basis')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td></tr>`).join('')}</tbody></table>`);
    el('multCap').textContent = lastPx ? `${t('price')} ORCL ${fmtDate(lastPx[0])} · ${es ? 'múltiplos a doce meses sobre el consenso de FactSet' : 'forward multiples on FactSet consensus'}${FS ? ` (${fmtDate(FS.asOf)})` : ''} · ${es ? 'estados financieros al' : 'financials as of'} ${lastQ ? qLabel(lastQ) : ''}` : '';
    html('multSrc', `${t('src')}: ${fsLink} (${es ? 'consenso NTM y por año fiscal' : 'NTM and fiscal-year consensus'}${FS ? ', ' + fmtDate(FS.asOf) : ''}) · ${relLink()} (${es ? 'deuda neta, UDM' : 'net debt, LTM'} ${asOfQ()}) · ${extLink(NASDAQ_URL, 'Nasdaq')} ${closeStamp()} · ${MK.sharesOutstanding && MK.sharesOutstanding.url ? extLink(MK.sharesOutstanding.url, es ? 'acciones: portada del 10-Q' : 'shares: 10-Q cover') + ` ${fmtDate(MK.sharesOutstanding.asOf)}` : ''}`);
    // history: forward multiples at each fiscal quarter-end, on the NTM consensus in force that day (point in time)
    const hh = (fo && fo.ntm_history) || [];
    const histAt = (iso) => { let best = null; for (const h of hh) if (h.date <= iso && (!best || h.date > best.date)) best = h; return best && (new Date(iso) - new Date(best.date)) / 864e5 <= 45 ? best : null; };
    const hist = Q.slice(-lastN()).map((q) => { const end = qEndDate(q); const pt = pointAtOrBefore(orclPx, end); const nd2 = netDebt(q); const h = histAt(end); if (!pt || !nd2 || !h) return null; const sh2 = q.shares ? q.shares.current : sharesNow; const ev = pt[1] * sh2 / 1e6 + nd2.net; return { q, v: h.ebitda ? ev / h.ebitda : null, pe: h.eps ? pt[1] / h.eps : null }; }).filter(Boolean);
    const c = SERIES();
    if (hist.length) mkChart('chartEvEbitda', { type: 'bar', data: { labels: hist.map((h) => qLabel(h.q)), datasets: [{ label: (es ? 'VE' : 'EV') + '/EBITDA NTM', data: hist.map((h) => h.v), backgroundColor: c[0] }, { label: es ? 'P/U NTM' : 'P/E NTM', type: 'line', data: hist.map((h) => h.pe), borderColor: c[1], backgroundColor: c[1], pointRadius: 3 }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + 'x' }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    else html('chartEvEbitda', '');
    html('evSrc', `${t('src')}: ${es ? 'comunicados de resultados (balance y acciones diluidas de cada trimestre)' : 'earnings releases (each quarter\'s balance sheet and diluted shares)'} · ${fsLink} (${es ? 'consenso NTM punto en el tiempo, muestreado al cierre de cada trimestre fiscal' : 'point-in-time NTM consensus sampled at each fiscal quarter-end'}) · ${extLink(NASDAQ_URL, 'Nasdaq')} · ${asOfQ()}<br>${es ? 'Cierre del trimestre fiscal × acciones diluidas del trimestre + deuda neta reportada, sobre el EBITDA NTM del consenso en esa fecha; P/U sobre la UPA NTM del consenso.' : 'Fiscal quarter-end close × diluted shares of the quarter + reported net debt, over consensus NTM EBITDA on that date; P/E on consensus NTM EPS.'}`);
    // peers
    const cols = [['name', es ? 'Empresa' : 'Company'], ['group', es ? 'Grupo' : 'Group'], ['marketCapUsdM', es ? 'Cap. US$ mil M' : 'Mkt cap US$ bn'], ['evUsdM', es ? 'VE US$ mil M' : 'EV US$ bn'], ['evSalesNtm', es ? 'VE/Ventas NTM' : 'EV/Sales NTM'], ['evEbitdaNtm', 'VE/EBITDA NTM'.replace('VE', es ? 'VE' : 'EV')], ['peNtm', es ? 'P/U NTM' : 'P/E NTM'], ['divYieldPct', es ? 'Div. %' : 'Div. yield']];
    const grpLabel = (g) => (g === 'hyperscaler' ? (es ? 'Hiperescala' : 'Hyperscaler') : g === 'software' ? 'Software' : g === 'oracle' ? 'Oracle' : g || '');
    const fmtCell = (k, v) => (v == null ? `<span class="muted">${t('na')}</span>` : /Pct$/.test(k) ? fmtPct(v) : /UsdM$/.test(k) ? fmtN(v / 1000, 0) : fmtX(v));
    const own = peersOwnRow();
    const all = [own, ...(PEERS.peers || [])].filter(Boolean);
    html('peersTable', `<table><thead><tr>${cols.map((c2) => `<th>${c2[1]}</th>`).join('')}</tr></thead><tbody>${all.map((pr) => `<tr class="${pr.own ? 'bold' : ''}">${cols.map((c2) => `<td>${c2[0] === 'name' ? pr.name : c2[0] === 'group' ? grpLabel(pr.group) : fmtCell(c2[0], pr[c2[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    el('peersCap').textContent = PEERS.updatedAt ? (es ? `Múltiplos a doce meses sobre el consenso de FactSet al ${fmtDate(PEERS.updatedAt)}; precios y valor de mercado de FactSet al ${fmtDate(PEERS.priceDate)}; VE = valor de mercado + deuda neta del último trimestre reportado. La fila de Oracle usa la misma base de FactSet (incluida la deuda neta con arrendamientos, US$ ${FS && FS.oracle && FS.oracle.net_debt_usd_m ? fmtN(FS.oracle.net_debt_usd_m / 1000, 1) : '—'} mil M) para que las columnas sean comparables; los múltiplos de Oracle con la deuda neta reportada están en la tabla superior.` : `Forward multiples on FactSet consensus as of ${fmtDate(PEERS.updatedAt)}; FactSet prices and market values as of ${fmtDate(PEERS.priceDate)}; EV = market value + net debt of the latest reported quarter. Oracle's row uses the same FactSet basis (including lease-inclusive net debt of US$ ${FS && FS.oracle && FS.oracle.net_debt_usd_m ? fmtN(FS.oracle.net_debt_usd_m / 1000, 1) : '—'} bn) so the columns compare like for like; Oracle's multiples on reported net debt are in the table above.`) : (es ? 'Pendiente: el consenso de FactSet aún no está disponible.' : 'Pending: FactSet consensus not yet available.');
    html('peersSrc', `${t('src')}: ${fsLink}, FactSet Global Prices, FactSet Fundamentals (${es ? 'deuda neta' : 'net debt'}) · ${es ? 'precios y valores de mercado de FactSet al' : 'FactSet prices and market values as of'} ${PEERS.priceDate ? fmtDate(PEERS.priceDate) : '—'} · ${es ? 'consenso al' : 'consensus as of'} ${PEERS.updatedAt ? fmtDate(PEERS.updatedAt) : '—'}`);
    renderStreet();
  }
  // Oracle's own row of the peer table: model price, shares and net debt over FactSet's NTM consensus.
  function peersOwnRow() {
    const fo = FS && FS.oracle; const ndM = netDebt(lastQ), fn = fsNtm();
    // same basis as the peers: FactSet price and market value, FactSet net debt (includes lease liabilities); model values only as a fallback
    const price = fo && fo.price ? fo.price : (lastPx ? lastPx[1] : null); if (!price) return null;
    const mc = fo && fo.market_cap_usd_m ? fo.market_cap_usd_m : (sharesNow ? price * sharesNow / 1e6 : null); const ndv = fo && fo.net_debt_usd_m != null ? fo.net_debt_usd_m : (ndM ? ndM.net : null); if (mc == null || ndv == null) return null;
    const ev = mc + ndv; const fy = fsFiscal(); const f1 = fy[0], f2 = fy[1]; const decl = (REF.dividends || []).slice(-1)[0];
    return { own: true, name: 'Oracle', ticker: 'ORCL-US', group: 'oracle', price, marketCapUsdM: mc, netDebtUsdM: ndv, evUsdM: ev, ntmEps: fn.eps ? fn.eps.mean : null, ntmEbitda: fn.ebitda ? fn.ebitda.mean : null, ntmSales: fn.sales ? fn.sales.mean : null,
      peNtm: fn.eps && fn.eps.mean > 0 ? price / fn.eps.mean : null, evEbitdaNtm: fn.ebitda && fn.ebitda.mean > 0 ? ev / fn.ebitda.mean : null, evSalesNtm: fn.sales && fn.sales.mean > 0 ? ev / fn.sales.mean : null,
      epsGrowthFy2Pct: f1 && f2 && f1.eps && f2.eps && f1.eps.mean > 0 ? 100 * (f2.eps.mean / f1.eps.mean - 1) : null, divYieldPct: decl ? 100 * decl.dps * 4 / price : null };
  }
  // Street view: consensus price target and rating counts (FactSet); informational, not a recommendation.
  function renderStreet() {
    if (!el('streetStats')) return; const es = LANG === 'es'; const fo = FS && FS.oracle; const pt = fo && fo.price_target, rt = fo && fo.ratings; const price = lastPx ? lastPx[1] : null;
    if (!pt && !rt) { html('streetStats', ''); html('streetTable', ''); html('streetNote', es ? 'Pendiente de la instantánea de FactSet.' : 'Pending the FactSet snapshot.'); html('streetSrc', ''); return; }
    html('streetStats', [
      pt && { v: `US$ ${fmtN(pt.mean, 0)}`, l: `${es ? 'precio objetivo, media de' : 'price target, mean of'} ${pt.count} ${es ? 'analistas' : 'analysts'}${price ? ` · ${fmtPct(100 * (pt.mean / price - 1), 0, true)} ${es ? 'frente al precio' : 'vs price'}` : ''}` },
      pt && { v: `US$ ${fmtN(pt.median, 0)}`, l: `${es ? 'mediana · rango' : 'median · range'} US$ ${fmtN(pt.low, 0)}–${fmtN(pt.high, 0)}` },
      pt && { v: `${pt.up} ↑ · ${pt.down} ↓`, l: es ? 'objetivos revisados al alza y a la baja en el último mes' : 'targets raised and lowered in the last month' },
      rt && { v: rt.noteText ? (es ? ({ BUY: 'Compra', OVERWEIGHT: 'Sobreponderar', HOLD: 'Mantener', UNDERWEIGHT: 'Subponderar', SELL: 'Venta' })[rt.noteText] || rt.noteText : rt.noteText.charAt(0) + rt.noteText.slice(1).toLowerCase()) : '—', l: `${es ? 'recomendación media de' : 'average rating of'} ${rt.total} ${es ? 'analistas' : 'analysts'}` },
    ].filter(Boolean).map((x) => `<div class="stat"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join(''));
    if (rt) { const items = [[es ? 'Compra' : 'Buy', rt.buy], [es ? 'Sobreponderar' : 'Overweight', rt.overweight], [es ? 'Mantener' : 'Hold', rt.hold], [es ? 'Subponderar' : 'Underweight', rt.underweight], [es ? 'Venta' : 'Sell', rt.sell]]; const mx = Math.max(1, ...items.map((x) => x[1]));
      html('streetTable', `<table><thead><tr><th>${es ? 'Recomendación' : 'Rating'}</th><th>${es ? 'Analistas' : 'Analysts'}</th><th>${es ? 'Participación' : 'Share'}</th></tr></thead><tbody>${items.map((x) => `<tr><td>${x[0]}</td><td>${x[1]}</td><td><div style="display:flex;align-items:center;gap:8px"><div style="height:10px;width:${Math.round(160 * x[1] / mx)}px;background:var(--series-1);border-radius:3px"></div><span class="small muted">${fmtPct(100 * x[1] / rt.total, 0)}</span></div></td></tr>`).join('')}</tbody></table>`); } else html('streetTable', '');
    html('streetNote', `<b>${es ? 'Lectura.' : 'Reading it.'}</b> ${es ? 'Consenso de analistas del lado vendedor compilado por FactSet; describe lo que el mercado espera, no lo que la página recomienda. Esta página no emite recomendaciones de inversión.' : 'Sell-side analyst consensus compiled by FactSet; it describes what the market expects, not what this page recommends. This page does not issue investment advice.'}`);
    html('streetSrc', `${t('src')}: ${FS && FS.source && FS.source.url ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet Estimates'} (${es ? 'precio objetivo y recomendaciones al' : 'price target and ratings as of'} ${fmtDate(FS.asOf)}) · ${es ? 'precio' : 'price'}: ${extLink(NASDAQ_URL, 'Nasdaq')} ${closeStamp()}`);
  }

  // ================= 11 DEBT DETAIL & CREDIT RISK =================  // ================= 11 DEBT DETAIL & CREDIT RISK =================
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
      ? `Principal en US$ millones por año calendario de vencimiento. Vencen US$ ${fmtN(m12)} M en los 12 meses posteriores al ${lastQ ? qLabel(lastQ) : '—'} y US$ ${fmtN(m24)} M en 24 meses, frente a US$ ${fmtN(cash)} M de efectivo e inversiones al cierre del trimestre. Cupón promedio ponderado por principal de los bonos a tasa fija de cada grupo.`
      : `Principal in US$ million by calendar year of maturity. US$ ${fmtN(m12)} M matures in the 12 months after ${lastQ ? qLabel(lastQ) : '—'} and US$ ${fmtN(m24)} M within 24 months, against US$ ${fmtN(cash)} M of cash and investments at quarter-end. Average coupon is principal-weighted across each group's fixed-rate notes.`;
    html('schedSrc', `${t('src')}: ${tenKLink()} (${LANG === 'es' ? 'nota de deuda al 31 de mayo de 2026: 58 instrumentos, principal conciliado con el total bruto revelado' : 'debt footnote as of 31 May 2026: 58 instruments, principal reconciled to the disclosed gross total'}) · ${LANG === 'es' ? 'efectivo del balance del' : 'cash from the'} ${lastQ ? qLabel(lastQ) + (LANG === 'es' ? '' : ' balance sheet') : ''} ${relLink()} · ${asOfQ()}`);
    // ---- instrument book
    const today = todayET();
    const yrsLeft = (iso) => (new Date(iso) - new Date(today)) / (365.25 * 864e5);
    const book = all.slice().sort((a, b) => (a.matures || '9999').localeCompare(b.matures || '9999')).map((i) => `<tr class="${i.matures && i.matures < today ? 'sub' : ''}"><td>${LS(i.name)}${i.repaid ? ` <span class="badge ok" title="${((i.repaid.evidence || {})[LANG === 'es' ? 'note_es' : 'note_en'] || '').replace(/"/g, '&quot;')}">${LANG === 'es' ? 'pagado' : 'repaid'}</span>` : ''}</td><td>${LS(i.type)}</td><td>${fmtDate(i.issued)}</td><td>${i.matures ? fmtDate(i.matures) : '—'}</td><td>${i.matures ? fmtN(yrsLeft(i.matures), 1) : '—'}</td><td>${fmtN(i.principalUsdM)}</td><td>${fmtPct(100 * (i.principalUsdM || 0) / total)}</td><td>${LS(i.rate) || '—'}</td></tr>`).join('');
    html('bookTable', `<table><thead><tr><th>${t('instrument')}</th><th>${LANG === 'es' ? 'Tipo' : 'Type'}</th><th>${LANG === 'es' ? 'Emisión' : 'Issued'}</th><th>${t('matures')}</th><th>${LANG === 'es' ? 'Años restantes' : 'Years left'}</th><th>${t('principal')}</th><th>%</th><th>${t('rate')}</th></tr></thead><tbody>${book}</tbody></table>`);
    el('bookSummary').textContent = LANG === 'es' ? `Ver los ${all.length} instrumentos (US$ ${fmtN(total)} M de principal)` : `View all ${all.length} instruments (US$ ${fmtN(total)} M principal)`;
    const matured = dated.filter((i) => i.matures < today);
    html('bookCap', LANG === 'es'
      ? `${all.length} instrumentos al 31 de mayo de 2026, US$ ${fmtN(total)} M de principal; cupón promedio ponderado de los bonos a tasa fija ${fmtPct(wavg(fixed), 2)}.${matured.length ? ` Atenuados: ${maturedNote()}.` : ''}`
      : `${all.length} instruments at 31 May 2026, US$ ${fmtN(total)} M principal; principal-weighted average coupon of the fixed-rate notes ${fmtPct(wavg(fixed), 2)}.${matured.length ? ` Greyed: ${maturedNote()}.` : ''}`);
    html('bookSrc', `${t('src')}: ${all[0] && all[0].url ? `<a href="${all[0].url}" target="_blank" rel="noopener">${LANG === 'es' ? 'Formulario 10-K AF2026, nota de deuda' : 'Form 10-K FY2026, debt footnote'} ↗</a>` : ''} · ${LS(D2.instrumentsNote)}`);
    html('creditMeta', LANG === 'es' ? `Instrumentos de la nota de deuda del 10-K del AF2026 (referencia actualizada ${fmtDate(REF.updatedAt)}); balance del ${lastQ ? qLabel(lastQ) : '—'}. Los arrendamientos y los compromisos fuera de balance están en ${ref('obligations')}.` : `Instruments from the FY2026 10-K debt footnote (reference updated ${fmtDate(REF.updatedAt)}); ${lastQ ? qLabel(lastQ) : '—'} balance sheet. Leases and off-balance-sheet commitments are in ${ref('obligations')}.`);
    // ---- CDS
    const pts = CDS.points || [];
    const R = (CDS.recoveryPct ?? 40) / 100, T = CDS.tenor || 5;
    const pd = (bp) => 100 * (1 - Math.exp(-(bp / 10000) / (1 - R) * T));
    const cdsWrap = el('cdsChartWrap'); if (cdsWrap) cdsWrap.hidden = !pts.length;
    if (pts.length) {
      const last = pts[pts.length - 1]; const yAgo = pointAtOrBefore(pts, addDays(last[0], -365));
      mkChart('chartCds', { type: 'line', data: { labels: pts.map((p) => p[0]), datasets: [{ label: `CDS ${T}Y (bp)`, data: pts.map((p) => p[1]), borderColor: c[7], backgroundColor: c[7] + '1a', fill: true }] }, options: { plugins: { tooltip: { callbacks: { title: (x) => fmtDate(x[0].label), label: (x) => `${fmtN(x.parsed.y)} bp · PD ${fmtPct(pd(x.parsed.y))}` } } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i) => pts[i] ? pts[i][0].slice(0, 7) : '' }, grid: { display: false } }, y: { ticks: { callback: (v) => v + ' bp' }, beginAtZero: true } } } });
      html('cdsStats', [{ v: `${fmtN(last[1])} bp`, l: `${LANG === 'es' ? 'spread' : 'spread'} ${fmtDate(last[0])}` }, { v: fmtPct(pd(last[1])), l: LANG === 'es' ? `PD implícita a ${T} años (recuperación ${fmtPct(100 * R, 0)})` : `implied ${T}-yr PD (${fmtPct(100 * R, 0)} recovery)` }, { v: yAgo ? `${last[1] - yAgo[1] > 0 ? '+' : ''}${fmtN(last[1] - yAgo[1])} bp` : '—', l: t('oneY'), c: yAgo ? cls(yAgo[1] - last[1]) : '' }].map((s) => `<div class="stat"><div class="v ${s.c || ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
      el('cdsCap').textContent = LS(CDS.notes);
      html('cdsSrc', `${t('src')}: ${CDS.source} · ${fmtDate(CDS.updatedAt)}`);
      html('cdsNote', LANG === 'es' ? `<b>Lectura.</b> El spread es lo que cuesta asegurar US$ 10,000 de deuda senior de Oracle por año durante ${T} años, en puntos base; la PD implícita es la probabilidad acumulada de incumplimiento que ese precio implica bajo el supuesto de recuperación estándar. Léalo junto con las calificaciones (tabla a la izquierda): el CDS reacciona antes que las agencias.` : `<b>Reading it.</b> The spread is the annual cost, in basis points, of insuring US$ 10,000 of Oracle senior debt for ${T} years; the implied PD is the cumulative default probability that price implies under the standard recovery assumption. Read it with the ratings (table at left): the CDS moves before the agencies do.`);
    } else {
      // no series yet: one line that says so, with the latest press reading linked from the news file (never an internal path)
      const nw2 = NEWS ? (NEWS.items || []).filter((x) => /credit default swap|CDS/i.test(x.summary_en || '')).sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null;
      el('cdsCap').textContent = '';
      html('cdsStats', '');
      html('cdsNote', `<b>${LANG === 'es' ? 'CDS: no hay serie disponible.' : 'CDS: no series available.'}</b> ${LANG === 'es' ? `El conector de FactSet no expone precios de CDS ni de bonos (verificado ${fmtDate(QR && QR.generated ? QR.generated : todayET())}); la tarjeta se llenará con la serie a ${T} años y la probabilidad de incumplimiento implícita (recuperación ${fmtPct(100 * R, 0)}) cuando exista.` : `The FactSet connector exposes no CDS or bond-price content set (checked ${fmtDate(QR && QR.generated ? QR.generated : todayET())}); this card fills with the ${T}-year series and the implied default probability (${fmtPct(100 * R, 0)} recovery) once one exists.`}${nw2 ? ` ${LANG === 'es' ? 'Última lectura de prensa' : 'Latest press reading'}: ${extLink(nw2.sources[0].url, `${nw2.sources[0].title.replace(/:.*$/, '')}`)} (${fmtDate(nw2.date)}, ${LANG === 'es' ? 'prensa, no entra a ninguna cifra' : 'press, enters no figure'}).` : ''}`);
      html('cdsSrc', `${t('src')}: FactSet (${LANG === 'es' ? 'sin conjunto de datos de CDS en el conector' : 'no CDS content set in the connector'})${nw2 ? ` · ${LANG === 'es' ? 'prensa enlazada en' : 'press linked in'} ${ref('news')}` : ''}`);
      if (hasChart() && charts.chartCds) { charts.chartCds.destroy(); delete charts.chartCds; }
    }
  }

  // ================= 07 DEBT =================
  // Maturity buckets shared by the section-07 chart and the section-11 schedule: calendar years 2026 … 2031 one
  // by one, then 2032–2036, then after 2036. Commercial paper (no fixed maturity) is excluded and shown separately.
  const MAT_BUCKETS = [['2026', 2026, 2026], ['2027', 2027, 2027], ['2028', 2028, 2028], ['2029', 2029, 2029], ['2030', 2030, 2030], ['2031', 2031, 2031], ['2032–2036', 2032, 2036], ['> 2036', 2037, 9999]];
  function maturityBuckets(ins) {
    const today = todayET();
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
    // the chart's note joins the schedule card's single source line (renderCredit writes it; this adds the maturity chart's reading)
    const mn = maturedNote();
    const sEl = el('schedSrc'); if (sEl) sEl.insertAdjacentHTML('beforeend', ` · ${LANG === 'es' ? 'gráfica: años calendario de vencimiento' : 'chart: calendar years of maturity'}${mn ? `; ${LANG === 'es' ? 'barra atenuada' : 'shaded bar'}: ${mn}` : ''}${cp ? ` · ${LANG === 'es' ? 'excluye papel comercial' : 'excludes commercial paper'} (US$ ${fmtN(cp.principalUsdM)} M)` : ''}`);
    // a rating action older than the rule (freshness.json, 12 months by default) is flagged as aging: the agency may have
    // moved without a release this page can reach, so the row says how old it is instead of presenting it as current
    const maxAge = (SEC.freshness && SEC.freshness.rating_action_max_age_days) || 365;
    const ageMo = (d) => Math.floor(daysSince(d) / 30.44);
    const aging = (D2.ratings || []).filter((r) => r.date && daysSince(r.date) > maxAge);
    const ratings = (D2.ratings || []).map((r) => `<tr><td>${r.agency}</td><td>${r.rating}</td><td>${LS(r.outlook)}</td><td>${LS(r.scope)}</td><td>${fmtDate(r.date)}${r.date && daysSince(r.date) > maxAge ? ` <span class="stale" title="${LANG === 'es' ? 'acción de calificación de hace más de 12 meses' : 'rating action more than 12 months old'}">${LANG === 'es' ? `antigua · ${ageMo(r.date)} meses` : `aging · ${ageMo(r.date)} months`}</span>` : ''}</td><td class="muted small">${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${LS(r.source)}</a>` : LS(r.source)}</td></tr>`).join('');
    html('ratingsTable', `<table><thead><tr><th>${t('rating')}</th><th>${LANG === 'es' ? 'Nivel' : 'Level'}</th><th>${LANG === 'es' ? 'Perspectiva' : 'Outlook'}</th><th>${LANG === 'es' ? 'Alcance' : 'Scope'}</th><th>${t('date')}</th><th>${t('src')}</th></tr></thead><tbody>${ratings}</tbody></table>`);
    el('instrCap').textContent = LANG === 'es' ? `Calificaciones de las agencias (comunicados de acción de calificación); instrumentos de la nota de deuda del 10-K (hechos de referencia actualizados el ${fmtDate(REF.updatedAt)})` : `Agency ratings (rating-action releases); instruments from the 10-K debt footnote (reference facts updated ${fmtDate(REF.updatedAt)})`;
    html('instrNote', (aging.length ? `<b>${LANG === 'es' ? 'Calificaciones antiguas.' : 'Aging ratings.'}</b> ${aging.map((r) => `${r.agency} ${r.rating} (${LS(r.outlook)})`).join(', ')}: ${LANG === 'es' ? `la última acción localizada tiene más de ${Math.round(maxAge / 30.44)} meses; los prospectos posteriores de Oracle siguen citando ese nivel, pero no hay un comunicado reciente de la agencia en archivo.` : `the latest action located is more than ${Math.round(maxAge / 30.44)} months old; Oracle's later prospectuses still cite that level, but no recent agency release is on file.`}<br>` : '') + LS(D2.instrumentsNote));
    const lastRating = (D2.ratings || []).map((r) => r.date).filter(Boolean).sort().slice(-1)[0];
    html('instrSrc', `${t('src')}: ${LANG === 'es' ? 'calificaciones: comunicados de acción de calificación de cada agencia (enlaces por fila)' : 'ratings: each agency\'s rating-action release (links per row)'}${lastRating ? ` · ${LANG === 'es' ? 'última acción' : 'latest action'} ${fmtDate(lastRating)}` : ''}${D2.ratingsChecked && D2.ratingsChecked.date ? ` · <span title="${String(L({ es: D2.ratingsChecked.note_es, en: D2.ratingsChecked.note_en }) || '').replace(/"/g, '&quot;')}">${LANG === 'es' ? 'sin nueva acción al' : 'no new action as of'} ${fmtDate(D2.ratingsChecked.date)}</span>` : ''} · ${LANG === 'es' ? 'instrumentos' : 'instruments'}: ${tenKLink()} (${LANG === 'es' ? 'nota de deuda, al 31 de mayo de 2026' : 'debt footnote, as of 31 May 2026'}) · ${LANG === 'es' ? 'referencia actualizada el' : 'reference updated'} ${fmtDate(REF.updatedAt)}`);
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
    if (el('mwSeries') && BO) {
      const es = LANG === 'es';
      const whenLbl = (w) => (/^FY\d{4}Q\d$/.test(w) ? boLabel(w) : /^\d{4}-H[12]$/.test(w) ? (es ? `${w.endsWith('H1') ? '1S' : '2S'} ${w.slice(0, 4)}` : `${w.endsWith('H1') ? 'H1' : 'H2'} ${w.slice(0, 4)}`) : /^\d{4}-\d{2}$/.test(w) ? fmtMonth(w) : w);
      const kindLbl = { contracted: es ? 'contratado' : 'contracted', energized: es ? 'energizados' : 'energized', delivered: es ? 'entregado' : 'delivered', expected: es ? 'esperado' : 'expected' };
      const esc = (x) => String(x || '').replace(/"/g, '&quot;');
      html('mwSeries', `<ul class="timeline mwtl">${(BO.sites || []).map((x) => { const srcOf = (sh) => (x.sources || []).find((r) => r.short === sh); return `<li><b>${x.short || x.name}</b>${(x.mw_series || []).map((pt) => { const r = srcOf(pt.src); const lab = `${whenLbl(pt.when)} · ${kindLbl[pt.kind] || pt.kind}${pt.mw != null ? ` ${fmtN(pt.mw)} MW${pt.derived ? (es ? ' (derivado)' : ' (derived)') : ''}` : ` <span class="muted">(MW ${es ? 'no divulgados' : 'not disclosed'})</span>`}`; const src = r ? (r.url ? `<a href="${r.url}" target="_blank" rel="noopener" title="${esc(r.title)}">↗</a>` : `<span class="muted" title="${esc(r.title)}">(${r.short})</span>`) : ''; const r2 = pt.risk_src ? srcOf(pt.risk_src) : null; const risk = pt.at_risk ? ` <span class="badge rev">${es ? 'en riesgo' : 'at risk'}</span>${r2 && r2.url ? ` <a href="${r2.url}" target="_blank" rel="noopener" title="${esc(r2.title)}">↗</a>` : ''}` : ''; return `<div class="pt"><span class="k">${lab}</span>${risk} · ${es ? pt.es : pt.en} ${src}</div>`; }).join('')}</li>`; }).join('')}</ul>`);
    }
    html('aiSrc', `${t('src')}: ${(A.facts || []).some((f) => f.source) ? (LANG === 'es' ? 'enlaces en cada cifra' : 'links on each figure') : (LS(A.sources) || []).join(' · ')} · ${relLink()} · ${irLink()} · ${asOfQ()} · ${LANG === 'es' ? 'hechos de referencia actualizados el' : 'reference facts updated'} ${fmtDate(REF.updatedAt)}`);
    html('aiPending', LS(A.pending));
    // Long-range targets (long_range_targets.json): each vintage beside the reported actuals, superseded vintages marked
    renderTargets();
    const R = REF.rpo || {};
    html('rpoProse', `<p><b>${LANG === 'es' ? 'En una frase.' : 'In one sentence.'}</b> ${L(R.plain)}</p><p class="quote">${L(R.quote)}<span class="who">${R.quoteSource ? link(R.quoteSource, LANG === 'es' ? `Formulario 10-Q de Oracle (${fmtDate(R.quoteSource.date)})` : R.quoteSource.title) : ''}</span></p><p>${L(R.caution)}</p>`);
    const sched = (R.schedule || []).map((s) => `<tr><td>${LANG === 'es' ? s.bucket_es : s.bucket_en}</td><td>${fmtPct(s.pct, 0)}</td><td>US$ ${fmtN(s.amount_bn)} ${LANG === 'es' ? 'mil M' : 'bn'}</td></tr>`).join('');
    html('rpoTable', `<table><thead><tr><th>${LANG === 'es' ? 'Horizonte de reconocimiento' : 'Recognition horizon'}</th><th>%</th><th>${LANG === 'es' ? 'Monto' : 'Amount'}</th></tr></thead><tbody>${sched}</tbody></table>`);
    el('rpoCap').textContent = R.latest ? (LANG === 'es' ? `RPO total al ${R.latestQuarter}: US$ ${fmtN(R.latest / 1000, 0)} mil M, según el calendario que Oracle revela en el 10-Q` : `Total RPO at ${R.latestQuarter}: US$ ${fmtN(R.latest / 1000, 0)} bn, per the schedule Oracle discloses in the 10-Q`) : '';
    html('rpoCaution', `<b>${LANG === 'es' ? 'Lectura.' : 'Reading it.'}</b> ${LANG === 'es' ? `El RPO es un indicador adelantado, no ingreso asegurado: su conversión depende de la capacidad de centros de datos que Oracle logre construir y energizar, por eso se lee junto con el capex de ${ref('capex')} y los sitios de ${ref('sites')}.` : `RPO is a leading indicator, not assured revenue: its conversion depends on the data-center capacity Oracle manages to build and energise, which is why it is read alongside the capex in ${ref('capex')} and the sites in ${ref('sites')}.`}`);
    html('rpoSrc', `${t('src')}: ${R.quoteSource ? link(R.quoteSource, (LANG === 'es' ? `Formulario 10-Q de Oracle (${fmtDate(R.quoteSource.date)})` : R.quoteSource.title) + ' ↗') : ''} · ${relLink()} (RPO) · ${R.latestQuarter ? `${LANG === 'es' ? 'al' : 'as of'} ${R.latestQuarter}` : asOfQ()}`);
  }

  // OCI (IaaS) revenue targets against the actuals printed in each release headline (quarters.json iaas_revenue_bn):
  // full years summed from four quarters, the current year as year-to-date with its share of the target and the run-rate.
  function renderTargets() {
    const box = el('aiTargets'); if (!box) return; const es = LANG === 'es';
    const T = REF.longRange || []; if (!T.length) { box.innerHTML = ''; return; }
    const iaasFy = (fy) => { const qs = Q.filter((q) => q.fy === fy && q.kpi.iaasRevBn != null); return qs.length ? { sum: qs.reduce((a, q) => a + q.kpi.iaasRevBn, 0), n: qs.length, last: qs[qs.length - 1] } : null; };
    const oci = T.filter((t) => t.metric === 'oci_revenue');
    const tbl = oci.map((t) => {
      const fys = Object.keys(t.by_fy);
      const head = `<tr><th>${es ? 'Ingresos de OCI (IaaS), US$ mil M' : 'OCI (IaaS) revenue, US$ bn'}</th>${fys.map((f) => `<th>${f}</th>`).join('')}</tr>`;
      const tgt = `<tr><td>${es ? 'Objetivo' : 'Target'} · ${fmtDate(t.stated_on)}${t.status === 'superseded' ? ` <span class="stale">${es ? 'sustituido' : 'superseded'} ${fmtDate(t.superseded_on)}</span>` : ''}</td>${fys.map((f) => `<td>${fmtN(t.by_fy[f], 0)}</td>`).join('')}</tr>`;
      const act = `<tr class="bold"><td>${es ? 'Real (encabezado de cada comunicado)' : 'Actual (each release headline)'}</td>${fys.map((f) => { const a = iaasFy(+f.slice(2)); return `<td>${a ? `${fmtN(a.sum, 1)}${a.n < 4 ? `<span class="sub">${a.n === 1 ? (es ? '1 trimestre' : '1 quarter') : `${a.n} ${es ? 'trimestres' : 'quarters'}`}</span>` : ''}` : '—'}</td>`; }).join('')}</tr>`;
      const pace = `<tr class="sub"><td>${es ? 'Avance frente al objetivo' : 'Progress against target'}</td>${fys.map((f) => { const a = iaasFy(+f.slice(2)); if (!a) return '<td></td>'; const pct = 100 * a.sum / t.by_fy[f]; const rr = a.n < 4 ? 4 * a.last.kpi.iaasRevBn : null; return `<td class="${a.n === 4 ? cls(a.sum - t.by_fy[f]) : rr != null ? cls(rr - t.by_fy[f]) : ''}">${fmtPct(pct, 0)}${rr != null ? `<span class="sub">${es ? 'ritmo anualizado' : 'annualised run-rate'} ${fmtN(rr, 1)}</span>` : ''}</td>`; }).join('')}</tr>`;
      const sup = t.status === 'superseded' ? `<p class="small" style="margin:8px 0 0"><span class="badge rev">${es ? 'sustituido' : 'superseded'}</span> ${L({ es: t.superseded_es, en: t.superseded_en })}${t.supersededRef ? ` <span class="muted">(${t.supersededRef.title.replace(/ — .*$/, '')}, p.${t.superseded_page})</span>` : ''}</p>` : '';
      return `<div class="tblwrap"><table>${head}${tgt}${act}${pace}</table></div><p class="small muted" style="margin:6px 0 0">“${L({ es: t.text_es, en: t.text_en })}” — ${t.speaker}, ${t.sourceRef ? t.sourceRef.title.replace(/ — .*$/, '') : ''}, p.${t.page}</p>${sup}`;
    }).join('');
    const inForce = T.filter((t) => t.metric !== 'oci_revenue' && t.status === 'in_force');
    const fyLast = Y[Y.length - 1];
    const lr = inForce.length ? `<ul class="small" style="margin:10px 0 0;padding-left:18px">${inForce.map((t) => `<li><b>${t.fy}</b>: ${L({ es: t.text_es, en: t.text_en })} <span class="badge ok">${es ? 'vigente' : 'in force'}</span> <span class="muted">(${fmtDate(t.stated_on)}${(t.reconfirmed || []).length ? `; ${es ? 'reconfirmado el' : 'reconfirmed'} ${t.reconfirmed.map((x) => fmtDate(x.date)).join(', ')}` : ''})</span>${t.metric === 'total_revenue' && fyLast ? ` · ${es ? 'real' : 'actual'} ${fyLabel(fyLast.fy)}: ${fmtBn(fyLast.is.revTotal)} (${fmtPct(100 * fyLast.is.revTotal / (t.usd_bn * 1000), 0)} ${es ? 'del objetivo' : 'of the target'})` : ''}</li>`).join('')}</ul>` : '';
    const lastI = Q.filter((q) => q.kpi.iaasRevBn != null).slice(-1)[0];
    box.innerHTML = `<div class="card" style="margin-top:16px"><h3>${es ? 'Objetivos de largo plazo de la administración frente a lo reportado' : "Management's long-range targets against what has been reported"}</h3>${tbl}${lr}<p class="chart-src">${t('src')}: ${es ? 'transcripciones de las llamadas (orador y página arriba)' : 'call transcripts (speaker and page above)'} · ${es ? 'real: encabezado "Cloud Infrastructure (IaaS) Revenue" de cada comunicado (8-K, Anexo 99.1), releído por las pruebas del analizador' : 'actuals: the "Cloud Infrastructure (IaaS) Revenue" headline of each release (8-K, Exhibit 99.1), re-read by the parser tests'} · ${relLink()}${lastI ? ` · ${es ? 'al' : 'as of'} ${qLabel(lastI)}` : ''}</p></div>`;
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
      [es ? 'Capex UDM (US$ M)' : 'LTM capex (US$ M)', capexLtm != null ? fmtM(capexLtm) : '—', es ? 'estado de flujos, cuatro trimestres sumados' : 'cash-flow statement, four quarters summed', L4 ? ltmLabel() : ''],
      [es ? 'MW entregados en los mismos cuatro trimestres' : 'MW delivered over the same four quarters', mwLtm ? fmtN(mwLtm) + (mwFull ? '' : ' *') : '—', es ? 'llamadas de resultados (gráfica de capacidad arriba)' : 'earnings calls (capacity chart above)', L4 ? ltmLabel() : ''],
      [es ? 'Capex por MW entregado (US$ M por MW, derivado)' : 'Capex per MW delivered (US$ M per MW, derived)', capexPerMw ? fmtN(capexPerMw, 1) : '—', es ? 'Oracle no separa el capex ni los MW entre sitios propios y arrendados: todo el capex sobre todos los MW entregados' : 'Oracle does not split capex or MW between owned and leased sites: total capex over total MW delivered', L4 ? ltmLabel() : ''],
      [es ? 'Ingresos por MW energizado' : 'Revenue per energized MW', es ? 'no derivable' : 'not derivable', es ? 'Oracle no divulga los MW energizados totales (solo las entregas desde el 2T26) ni ingresos por sitio' : 'Oracle discloses neither total energized MW (only deliveries since 2Q26) nor revenue by site', ''],
      [es ? 'Utilización de la flota de GPU' : 'GPU-fleet utilization', u ? fmtPct(u.pct) : '—', es ? 'según la llamada (gráfica de GPU arriba)' : 'per the call (GPU chart above)', u ? boLabel(u.id) : ''],
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
    html('rpoRecSrc', `${t('src')}: ${extLink('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001341439&type=10-Q&dateb=&owner=include&count=40', es ? 'Formularios 10-Q y 10-K de Oracle en EDGAR' : 'Oracle Forms 10-Q and 10-K on EDGAR')}, ${es ? 'nota de ingresos (cada fila enlaza su reporte)' : 'revenue note (each row links its filing)'}${f && l ? ` · ${boLabel(f.quarter)} → ${boLabel(l.quarter)}` : ''} · ${asOfQ()}`);
  }

  // ================= 08b PREFERRED STOCK, FUNDING PLAN, PURCHASE OBLIGATIONS =================
  const OB = window.ORCL_OBLIG || null;
  const PL = window.ORCL_PEER_LEV || null;
  const obSrc = (k) => (OB && OB.sources && OB.sources[k]) || null;
  function renderCapital() {
    if (!OB || !el('dpsCapital')) return; const es = LANG === 'es', pf = OB.preferred || {}, fp = OB.funding_plan || {}, po = OB.purchase_obligations || {};
    const items = (fp.items || []).map((x) => { const S = obSrc(x.source); return `<tr class="${x.kind === 'plan' ? 'sub' : ''}"><td>${x.when}</td><td>${es ? x.es : x.en}${x.note_en ? `<span class="sub">${es ? x.note_es : x.note_en}</span>` : ''}</td><td><b>${fmtN(x.usd_bn, 1)}</b></td><td>${x.kind === 'plan' ? (es ? 'plan' : 'plan') : (es ? 'ejecutado' : 'done')}</td><td class="small">${S ? (S.url ? extLink(S.url, S.title.replace(/^Oracle /, '').replace(/ for the quarter ended /, ' ')) : `${S.title} <span class="muted">(${es ? 'transcripción de la responsable, no republicada' : 'owner\'s transcript, not republished'}; ${irLink()})</span>`) : ''}</td></tr>`; }).join('');
    const conv = pf.shares_if_converted_m || {};
    html('dpsCapital', `<div class="grid-2"><div><h4>${es ? 'Acciones preferentes convertibles obligatorias' : 'Mandatory convertible preferred stock'}</h4><p class="small">${es ? pf.text_es : pf.text_en}</p><div class="stat-row">${[
      { v: `US$ ${fmtN(pf.dividend_quarterly_usd_m, 2)} M`, l: es ? `dividendo preferente trimestral (6.50% × US$5 mil M ÷ 4); US$ ${fmtN(pf.dividend_paid_1q27_usd_m)} M en el estado de resultados del 1T27` : `quarterly preferred dividend (6.50% × US$5 bn ÷ 4); US$ ${fmtN(pf.dividend_paid_1q27_usd_m)} M in the 1Q27 income statement` },
      { v: fmtDate(pf.mandatory_conversion_date), l: es ? `conversión obligatoria en ${fmtN(conv.min, 1)}–${fmtN(conv.max, 1)} millones de acciones comunes (a ≥ US$ ${fmtN(pf.threshold_appreciation_price_usd, 2)} / ≤ US$ ${fmtN(pf.initial_price_usd, 2)})` : `mandatory conversion into ${fmtN(conv.min, 1)}–${fmtN(conv.max, 1)} million common shares (at ≥ US$ ${fmtN(pf.threshold_appreciation_price_usd, 2)} / ≤ US$ ${fmtN(pf.initial_price_usd, 2)})` },
    ].map((x) => `<div class="stat"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join('')}</div></div><div><h4>${es ? 'Plan de financiamiento: anunciado y ejecutado (US$ mil M)' : 'Funding plan: announced and executed (US$ bn)'}</h4><div class="tblwrap"><table><thead><tr><th>${es ? 'Cuándo' : 'When'}</th><th>${es ? 'Qué' : 'What'}</th><th>US$ ${es ? 'mil M' : 'bn'}</th><th>${es ? 'Estado' : 'Status'}</th><th>${t('src')}</th></tr></thead><tbody>${items}</tbody></table></div><div class="callout"><b>${es ? 'Conciliación.' : 'Reconciliation.'}</b> ${es ? fp.reconciliation_es : fp.reconciliation_en}</div><p class="small muted">${es ? `Obligaciones de compra de energía, equipo y otros: US$ ${fmtN(po.total / 1000, 1)} mil M no cancelables, calendario por año fiscal en ${ref('obligations')}.` : `Purchase obligations for power, equipment and other: US$ ${fmtN(po.total / 1000, 1)} bn non-cancelable, schedule by fiscal year in ${ref('obligations')}.`}</p></div></div>`);
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
    if (S) rows.push({ name: 'Oracle', ticker: 'ORCL', bs: qEndDate(lastQ), fy: ltmLabel(), net: S.net, opL: S.opL, finL: S.finL, ebitda: S.ebitda, olc: S.olc, ndEbitda: S.ndEbitda, leaseAdj: S.leaseAdj, basis: 'operating_income', self: true });
    for (const p of (PL && PL.peers) || []) {
      if (p.error || !p.balance_sheet) continue; const b = p.balance_sheet, f = p.fiscal_year || {}; const v = (x) => (x ? x.usd_m : null);
      const debt = (v(b.debt_noncurrent) || 0) + (v(b.debt_current) || 0), cash = (v(b.cash) || 0) + (v(b.short_term_investments) || 0), net = debt - cash;
      const opL = v(b.operating_lease_liabilities), finL = v(b.finance_lease_liabilities) || 0, ebitda = f.ebit && f.depreciation_amortization ? f.ebit.usd_m + f.depreciation_amortization.usd_m : null, olc = v(f.operating_lease_cost);
      rows.push({ name: p.name, ticker: p.ticker, bs: p.balance_sheet_date, fy: p.fiscal_year_end, net, opL, finL, ebitda, olc, basis: f.ebit ? f.ebit.basis : null, ndEbitda: ebitda > 0 ? net / ebitda : null, leaseAdj: ebitda > 0 && opL != null && olc != null ? (net + opL + finL) / (ebitda + olc) : null, src: p.source });
    }
    return rows;
  }
  // What the filings say about VIEs and guarantees, composed from obligations.json so the page never contradicts the data:
  // a disclosed guarantee is named with its amount, page and maturity (exposure, never a liability); the VIE reading keeps
  // its review flag; a guarantee whose scheduled maturity has passed says so until a filing reports its release.
  function obsDisclosure(es) {
    if (!OB) return ''; const vie = OB.vie || {}, ga = OB.guarantees || {}; const sV = obSrc(vie.source), sG = obSrc(ga.source);
    const vieTxt = vie.disclosed ? (es ? 'Oracle revela entidades de interés variable (ver nota)' : 'Oracle discloses variable-interest entities (see note)') : (es ? `No se ha identificado ninguna entidad de interés variable consolidada en ${sV ? sV.title.replace(/^Oracle /, '') : 'los reportes'} ni en el 10-Q más reciente (lectura de texto, revisión pendiente)` : `No consolidated variable-interest entity has been identified in the ${sV ? sV.title.replace(/^Oracle /, '') : 'filings'} or the latest 10-Q (text reading, needs review)`);
    let gaTxt = es ? 'Oracle no revela garantías' : 'Oracle discloses no guarantees';
    if (ga.disclosed && ga.usd_m != null) {
      const [my, mm] = String(ga.matures || '').split('-').map(Number); const matEnd = my && mm ? new Date(Date.UTC(my, mm, 0)).toISOString().slice(0, 10) : null;
      const mat = matEnd ? new Date(matEnd + 'T12:00:00Z').toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }) : ga.matures;
      gaTxt = es ? `${sG ? sG.title.replace(/^Oracle /, '') : 'El 10-K'} (p. ${ga.page}) revela una garantía de hasta US$ ${fmtN(ga.usd_m / 1000, 1)} mil M del préstamo de un arrendador, con vencimiento en ${mat}; se muestra como exposición, nunca como pasivo` : `The ${sG ? sG.title.replace(/^Oracle /, '') : '10-K'} (p. ${ga.page}) discloses a guarantee of up to US$ ${fmtN(ga.usd_m / 1000, 1)} bn of a lessor's borrowing, maturing ${mat}; it is shown as exposure, never as a liability`;
      if (matEnd && todayIso() > matEnd) gaTxt += es ? `. Su vencimiento programado ya pasó; el 10-Q al ${fmtDate(OB.as_of)} no la repite y el siguiente 10-Q dirá si se liberó` : `. Its scheduled maturity has passed; the 10-Q at ${fmtDate(OB.as_of)} does not repeat it and the next 10-Q will show whether it was released`;
    }
    return `${vieTxt}. ${gaTxt}.`;
  }
  function renderObligations() {
    if (!OB || !el('obTable')) return; const es = LANG === 'es', c = SERIES(), S = obligStats(); const Lz = OB.leases || {}, bs = OB.balance_sheet || {}, un = Lz.uncommenced || {}, po = OB.purchase_obligations || {}, ga = OB.guarantees || {};
    const q10 = obSrc(Lz.source || '10q_1q27'); const tenQ = q10 ? extLink(q10.url, es ? '10-Q 1T27' : '1Q27 10-Q') : '';
    html('obMeta', es ? `Notas de arrendamientos y de compromisos del Formulario 10-Q al ${fmtDate(OB.as_of)}${q10 && q10.filed ? ` (presentado el ${fmtDate(q10.filed)})` : ''}; deuda neta y EBITDA UDM del modelo (${ltmLabel()}). Las tres razones son derivadas.` : `Leases and commitments notes of the Form 10-Q at ${fmtDate(OB.as_of)}${q10 && q10.filed ? ` (filed ${fmtDate(q10.filed)})` : ''}; net debt and LTM EBITDA from the model (${ltmLabel()}). All three ratios are derived.`);
    if (S) html('obStats', [
      { v: fmtX(S.ndEbitda, 2), l: es ? `deuda neta / EBITDA UDM, como se reporta (US$ ${fmtN(S.net / 1000, 1)} mil M ÷ US$ ${fmtN(S.ebitda / 1000, 1)} mil M)` : `net debt / LTM EBITDA, as reported (US$ ${fmtN(S.net / 1000, 1)} bn ÷ US$ ${fmtN(S.ebitda / 1000, 1)} bn)` },
      { v: fmtX(S.leaseAdj, 2), l: es ? `ajustado por arrendamientos: (deuda neta + arrend. operativos US$ ${fmtN(S.opL / 1000, 1)} + financieros US$ ${fmtN(S.finL / 1000, 1)} mil M) ÷ EBITDAR US$ ${fmtN(S.ebitdar / 1000, 1)} mil M` : `lease-adjusted: (net debt + operating leases US$ ${fmtN(S.opL / 1000, 1)} bn + finance leases US$ ${fmtN(S.finL / 1000, 1)} bn) ÷ EBITDAR US$ ${fmtN(S.ebitdar / 1000, 1)} bn` },
      { v: fmtX(S.commit, 1), l: es ? `incluyendo compromisos: suma los US$ ${fmtN(S.unc / 1000, 0)} mil M de arrendamientos no iniciados a valor nominal, sin descontar ni proyectar EBITDA; mide exposición, no deuda actual` : `commitment-inclusive: adds the US$ ${fmtN(S.unc / 1000, 0)} bn of uncommenced leases at nominal value, undiscounted and without projecting EBITDA; measures exposure, not current debt` },
    ].map((x) => `<div class="stat"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join(''));
    // Two groups, kept apart: liabilities already recognized on the balance sheet, and future contractual commitments that are not.
    const bnf = (v) => fmtN(v / 1000, 1);
    const grpRecog = es ? 'Pasivos reconocidos (en el balance)' : 'Recognized liabilities (on the balance sheet)';
    const grpCommit = es ? 'Compromisos contractuales futuros (fuera del balance)' : 'Future contractual commitments (not on the balance sheet)';
    const recog = [
      { l: es ? 'Bonos y otros préstamos' : 'Bonds and other borrowings', v: bs.notes_payable_total, n: es ? `corto plazo ${fmtM(bs.notes_payable_current)} · largo plazo ${fmtM(bs.notes_payable_noncurrent)} (US$ M)` : `current ${fmtM(bs.notes_payable_current)} · non-current ${fmtM(bs.notes_payable_noncurrent)} (US$ M)` },
      { l: es ? 'Arrendamientos operativos' : 'Operating leases', v: Lz.operating_liabilities_total, n: es ? `activo por derecho de uso ${fmtM(Lz.operating_rou_assets)} (US$ M)` : `right-of-use asset ${fmtM(Lz.operating_rou_assets)} (US$ M)` },
      { l: es ? 'Arrendamientos financieros' : 'Finance leases', v: Lz.finance_liabilities_total, n: es ? `activo por derecho de uso ${fmtM(Lz.finance_rou_assets)} (US$ M)` : `right-of-use asset ${fmtM(Lz.finance_rou_assets)} (US$ M)` },
    ];
    const recogTotal = recog.reduce((a, x) => a + (x.v || 0), 0);
    const commit = [
      { l: es ? 'Arrendamientos firmados, aún no iniciados' : 'Leases signed, not yet commenced', v: (un.usd_bn || 0) * 1000, n: es ? `nota de arrendamientos del 10-Q · casi todos de centros de datos · plazos de ${un.term_years_min}–${un.term_years_max} años · inician entre el 2T27 y el AF2029` : `10-Q leases note · substantially all data centers · ${un.term_years_min}–${un.term_years_max}-year terms · commence between 2Q27 and FY2029` },
      { l: es ? 'Obligaciones de compra (energía, equipo y otros)' : 'Purchase obligations (power, equipment and other)', v: po.total, n: es ? 'Oracle las reporta por separado en el 10-Q (nota de compromisos, no la de arrendamientos) · no cancelables · calendario por año fiscal abajo' : 'Oracle reports them separately in the 10-Q (commitments note, not the leases note) · non-cancelable · schedule by fiscal year below' },
      { l: es ? 'Garantía del préstamo de un arrendador (exposición máxima)' : "Guarantee of a lessor's borrowing (maximum exposure)", v: ga.disclosed ? ga.usd_m : null, exposure: true, n: ga.disclosed ? (es ? `${obSrc(ga.source) ? '10-K, p. ' + ga.page : ''} · ${(guaranteeStatus() || {}).short || ''} · exposición, no se suma a ninguna razón` : `${obSrc(ga.source) ? '10-K, p. ' + ga.page : ''} · ${(guaranteeStatus() || {}).short || ''} · exposure, not added to any ratio`) : (es ? 'no divulgada' : 'not disclosed') },
    ];
    const obRow = (x) => `<tr><td>${x.l}</td><td><b>${x.v == null ? (es ? 'no divulgadas' : 'not disclosed') : bnf(x.v)}</b></td><td class="small muted">${x.n}</td></tr>`;
    const obHead = `<thead><tr><th>${es ? 'Partida' : 'Item'}</th><th>US$ ${es ? 'mil M' : 'bn'}</th><th>${es ? 'Detalle' : 'Detail'}</th></tr></thead>`;
    const obTotal = `<tr class="bold"><td>${es ? 'Total de pasivos reconocidos' : 'Total recognized liabilities'}</td><td><b>${bnf(recogTotal)}</b></td><td class="small muted">${es ? 'deuda y arrendamientos en el balance' : 'debt and leases on the balance sheet'}</td></tr>`;
    const obCash = `<tr class="muted"><td>${es ? 'Nota: efectivo e inversiones negociables' : 'Memo: cash and marketable securities'}</td><td>(${bnf(bs.cash_and_investments || 0)})</td><td class="small">${es ? 'se resta de los préstamos para obtener la deuda neta' : 'netted against borrowings for net debt'}</td></tr>`;
    const obNote = `<tr><td colspan="3" class="small muted">${es ? 'Montos nominales, sin descontar; no incluidos en los pasivos reconocidos de arriba.' : 'Nominal amounts, undiscounted; not included in the recognized liabilities above.'}</td></tr>`;
    html('obTable', `<div class="obgrp recog"><h4>${grpRecog}</h4><div class="tblwrap"><table>${obHead}<tbody>${recog.map(obRow).join('')}${obTotal}${obCash}</tbody></table></div></div><div class="obgrp commit"><h4>${grpCommit}</h4><div class="tblwrap"><table>${obHead}<tbody>${commit.map(obRow).join('')}${obNote}</tbody></table></div></div>`);
    const bars = [...recog.map((x) => ({ ...x, g: 0 })), ...commit.filter((x) => x.v != null && x.v > 0 && !x.exposure).map((x) => ({ ...x, g: 1 }))];
    mkChart('chartOblig', { type: 'bar', data: { labels: bars.map((x) => x.l), datasets: [
      { label: es ? 'Pasivos reconocidos' : 'Recognized liabilities', data: bars.map((x) => (x.g === 0 ? x.v / 1000 : null)), backgroundColor: c[0] },
      { label: es ? 'Compromisos contractuales futuros' : 'Future contractual commitments', data: bars.map((x) => (x.g === 1 ? x.v / 1000 : null)), backgroundColor: c[1] },
    ] }, options: { indexAxis: 'y', plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: US$ ${fmtN(x.parsed.x, 1)} ${es ? 'mil M' : 'bn'}` } } }, scales: { x: { stacked: true, ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true }, y: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    el('obCap').textContent = es ? 'US$ mil millones al 31 de agosto de 2026. Los pasivos reconocidos ya están en el balance; los compromisos contractuales futuros no, y se muestran a valor nominal. Oracle reporta las obligaciones de compra por separado de sus arrendamientos, en la nota de compromisos del 10-Q. Los arrendamientos no iniciados pasarán al balance (pasivo y activo por derecho de uso) conforme cada centro de datos se entregue a Oracle.' : 'US$ billion at August 31, 2026. Recognized liabilities are already on the balance sheet; future contractual commitments are not, and are shown at nominal value. Oracle reports purchase obligations separately from its leases, in the commitments note of the 10-Q. Uncommenced leases move onto the balance sheet (liability and right-of-use asset) as each data center is handed over to Oracle.';
    html('obSrc', `${t('src')}: ${tenQ} (${es ? 'balance, nota de arrendamientos, nota de compromisos' : 'balance sheet, leases note, commitments note'}) · ${es ? 'deuda neta y EBITDA UDM: modelo' : 'net debt and LTM EBITDA: model'} (${ref('financing')}) · ${asOfQ()}`);
    const hist = un.history || [];
    mkChart('chartUncommenced', { type: 'bar', data: { labels: hist.map((h) => fmtDate(h.as_of)), datasets: [{ label: 'US$ bn', data: hist.map((h) => h.usd_bn), backgroundColor: c[1] }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `US$ ${fmtN(x.parsed.y, x.parsed.y < 100 ? 1 : 0)} ${es ? 'mil M' : 'bn'}${hist[x.dataIndex].note ? ' · ' + hist[x.dataIndex].note : ''}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 44, borderWidth: 0 } } } });
    el('uncCap').textContent = es ? 'Compromisos de arrendamiento firmados que aún no están en el balance, según la nota de arrendamientos de cada 10-Q y 10-K (US$ mil millones, valor nominal).' : 'Signed lease commitments not yet on the balance sheet, per the leases note of each 10-Q and 10-K (US$ billion, nominal value).';
    html('uncNote', `<b>${es ? 'Texto del 10-Q' : '10-Q wording'}${es ? ' (cita en inglés, tal como aparece en el reporte)' : ''}.</b> <i>${un.text_en || ''}</i>`);
    html('uncSrc', `${t('src')}: ${hist.map((h) => { const S2 = obSrc(h.source); return S2 ? extLink(S2.url, fmtDate(h.as_of)) : fmtDate(h.as_of); }).join(' · ')} · ${asOfQ()}`);
    html('poTable', `<table><thead><tr><th>${es ? 'Periodo' : 'Period'}</th><th>US$ M</th></tr></thead><tbody>${(po.schedule || []).map((x) => `<tr><td>${es ? x.period_es : x.period_en}</td><td>${fmtM(x.usd_m)}</td></tr>`).join('')}<tr class="bold"><td>Total</td><td>${fmtM(po.total)}</td></tr></tbody></table>`);
    el('poCap').textContent = (es ? (po.text_es || '') : (po.text_en || '')) + (es ? ' Oracle las reporta por separado de sus arrendamientos, en la nota de compromisos del 10-Q.' : ' Oracle reports them separately from its leases, in the commitments note of the 10-Q.');
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
    const todayIso = todayET();
    const fmtDT = (iso) => { const d = new Date(iso); if (isNaN(d)) return { date: '—', et: '' }; const z = 'America/New_York'; return { date: d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: z }), et: d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit', timeZone: z }) }; }; // ET only: the page's one time zone
    const typeLabel = { earnings_call: es ? 'Llamada de resultados' : 'Earnings call', analyst_day: es ? 'Día del analista / inversionista' : 'Analyst / investor day', conference: es ? 'Conferencia' : 'Conference', annual_meeting: es ? 'Asamblea anual' : 'Annual meeting', other: es ? 'Evento' : 'Event' };
    const dateCell = (e) => { if (e.all_day || !String(e.start).includes('T')) return `<b>${fmtDate(String(e.start).slice(0, 10))}</b><span class="sub">${es ? 'hora por anunciar' : 'time to be announced'}</span>`; const t = fmtDT(e.start); return `<b>${t.date}</b><span class="sub">${t.et} ET</span>`; };
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
    const dateOf = (e) => (e.all_day || !String(e.start).includes('T') ? fmtDate(String(e.start).slice(0, 10)) : fmtDT(e.start).date);
    html('calStats', [
      next && { v: dateOf(next), l: `${es ? 'próximo evento' : 'next event'} · ${es ? (next.title_es || next.title) : next.title}` },
      nextEarn ? { v: dateOf(nextEarn), l: `${es ? 'próximos resultados' : 'next results'} · ${qLabelId(String(nextEarn.fiscal_period || '').replace(/^FY/, ''))}` } : est && { v: `${fmtDate(est.window_start)} – ${fmtDate(est.window_end)}`, l: `${es ? 'próximos resultados, ventana estimada' : 'next results, estimated window'} · ${es ? est.label_es : est.label_en}` },
      { v: String(past.length), l: es ? 'eventos en los últimos seis meses' : 'events in the last six months' },
    ].filter(Boolean).map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    el('calCap').textContent = es ? `Horas en tiempo del Este (ET), la única zona horaria de esta página; Oracle anuncia sus eventos en la hora del lugar. Fuente: página de eventos de Relación con Inversionistas de Oracle y comunicados de fijación de fecha, consultados el ${fmtDate(CAL.generated)}; se actualiza cada día hábil con la cosecha de EDGAR.` : `Times in Eastern Time (ET), this page's only time zone; Oracle announces its events in the venue's local time. Source: Oracle's Investor Relations events page and date-setting releases, fetched ${fmtDate(CAL.generated)}; refreshed every weekday with the EDGAR harvest.`;
    const srcLabel = { 'ir-events': es ? 'Oracle, Relación con Inversionistas: eventos y presentaciones' : 'Oracle Investor Relations: events and presentations', 'ir-news': es ? 'Oracle, Relación con Inversionistas: comunicados (fijación de fecha y resultados)' : 'Oracle Investor Relations: press releases (date-setting and results)' };
    html('calSrc', `${t('src')}: ${(CAL.sources || []).map((s) => extLink(s.url, srcLabel[s.id] || s.title)).join(' · ')} · ${es ? 'consultado el' : 'fetched'} ${fmtDate(CAL.generated)} · ${es ? 'las fechas estimadas se derivan de las fechas de publicación de Oracle de años anteriores (mediana; la ventana marca el límite de vigencia) y se sustituyen por la fecha confirmada en cuanto Oracle la anuncia' : 'estimated dates derive from Oracle\'s release dates of prior years (the median; the window sets the staleness deadline) and are replaced by the confirmed date as soon as Oracle announces it'}`);
  }

  // ================= 13 METHOD / SOURCES =================
  function renderMethod() {
    // static cross-references in the page markup: numbered from the registry in the language of the span they sit in
    document.querySelectorAll('a.xref[data-ref]').forEach((a) => { const e = secIndex()[a.dataset.ref]; if (!e) return; const es = !!a.closest('.es'); a.textContent = `${e.n != null ? '§' + secNum(a.dataset.ref) + ' ' : ''}${es ? e.s.nav_es : e.s.nav_en}`; });
    const rows = [
      [LANG === 'es' ? 'Estados financieros trimestrales, acumulados y anuales' : 'Quarterly, YTD and annual statements', LANG === 'es' ? 'diario, tras cada 8-K' : 'daily, after each 8-K', LANG === 'es' ? 'cosecha automática de los 8-K en SEC EDGAR; cada cifra pasa los cuadres y las pruebas del analizador antes de publicarse' : 'automatic harvest of the 8-Ks from SEC EDGAR; every figure passes the tie-outs and parser tests before publishing', fmtDate(FIN.generatedAt || '')],
      [LANG === 'es' ? 'Guía de la administración' : 'Management guidance', LANG === 'es' ? 'con cada reporte / transcripción' : 'with each report / transcript', LANG === 'es' ? 'comunicado de resultados y transcripción de la llamada' : 'earnings release and call transcript', fmtDate(GD.generatedAt || '')],
      [LANG === 'es' ? 'Comentarios del estado de resultados' : 'Income-statement comments', LANG === 'es' ? 'por trimestre (borrador de la rutina, revisado)' : 'per quarter (drafted by the routine, reviewed)', LANG === 'es' ? 'comunicado y transcripción, una cláusula por renglón' : 'release and transcript, one clause per line', CM.updatedAt ? fmtDate(CM.updatedAt) : '—'],
      [LANG === 'es' ? 'Resumen ejecutivo' : 'Executive summary', LANG === 'es' ? 'con cada reporte (rutina)' : 'with each report (routine)', LANG === 'es' ? 'redactado del comunicado y la llamada; fechas de los eventos derivadas de las noticias' : 'drafted from the release and the call; event dates derived from the news', SUM.updatedAt ? fmtDate(SUM.updatedAt) : '—'],
      [LANG === 'es' ? 'Precios, dividendos, tasas' : 'Prices, dividends, yields', LANG === 'es' ? 'diario, después del cierre de la NYSE' : 'daily after the NYSE close', `${MK.prices.ORCL ? MK.prices.ORCL.source : ''} (ORCL) · ${MK.prices['^GSPC'] ? MK.prices['^GSPC'].source : ''} (S&P 500) · ${US10.source || ''} (${LANG === 'es' ? 'Tesoro a 10 años' : '10-year Treasury'})`, fmtDate(MK.generatedAt || '')],
      [LANG === 'es' ? 'Referencia: acciones, deuda, calificaciones, expansión de IA, RPO, supuestos DCF' : 'Reference: shares, debt, ratings, AI buildout, RPO, DCF defaults', LANG === 'es' ? 'por evento (revisado)' : 'event-driven (reviewed)', LANG === 'es' ? '10-K, 8-K, prospectos y comunicados de las agencias' : '10-K, 8-K, prospectuses and the agencies\' releases', fmtDate(REF.updatedAt)],
      [LANG === 'es' ? 'Consenso FactSet: múltiplos a doce meses, pares, precio objetivo, semilla del DCF' : 'FactSet consensus: forward multiples, peers, price target, DCF seed', LANG === 'es' ? 'días hábiles (rutina con el conector de FactSet)' : 'weekdays (routine with the FactSet connector)', LANG === 'es' ? 'conector de FactSet AI-Ready Data' : 'FactSet AI-Ready Data connector', FS && FS.fetched ? fmtDate(FS.fetched) : '—'],
      [LANG === 'es' ? 'CDS a 5 años (riesgo de crédito)' : '5-year CDS (credit risk)', LANG === 'es' ? 'pendiente · diario cuando esté conectado' : 'pending · daily once connected', LANG === 'es' ? 'FactSet (sin conjunto de datos de CDS en el conector todavía)' : 'FactSet (no CDS content set in the connector yet)', CDS.updatedAt ? fmtDate(CDS.updatedAt) : '—'],
      [LANG === 'es' ? 'Noticias y eventos recientes' : 'News and recent events', LANG === 'es' ? 'diario (rutina en la nube)' : 'daily (cloud routine)', LANG === 'es' ? 'SEC EDGAR, sala de prensa de Oracle, agencias y cables; fuentes primarias primero' : 'SEC EDGAR, Oracle newsroom, agencies and wires; primary sources first', NEWS && NEWS.asOf ? fmtDate(NEWS.asOf) : '—'],
      [LANG === 'es' ? 'Datos XBRL de Oracle (arrendamientos, capex, compromisos)' : 'Oracle XBRL facts (leases, capex, commitments)', LANG === 'es' ? 'diario, con la cosecha de EDGAR' : 'daily, with the EDGAR harvest', LANG === 'es' ? 'API de datos XBRL de la SEC (company facts)' : 'SEC XBRL company-facts API', XB && XB.fetched ? fmtDate(XB.fetched) : '—'],
      [LANG === 'es' ? 'Registro de riesgos' : 'Risk register', LANG === 'es' ? 'con cada 10-Q / 10-K y acción de calificación' : 'with each 10-Q / 10-K and rating action', LANG === 'es' ? 'revisado con cada reporte; cada riesgo cita su evidencia' : 'reviewed with each filing; each risk cites its evidence', RK && RK.updated ? fmtDate(RK.updated) : '—'],
      [LANG === 'es' ? 'Financiamiento fuera de balance, preferentes, plan de financiamiento' : 'Off-balance-sheet financing, preferred stock, funding plan', LANG === 'es' ? 'con cada 10-Q / 10-K (rutina)' : 'with each 10-Q / 10-K (routine)', LANG === 'es' ? 'transcrito de las notas del 10-Q / 10-K y cuadrado contra XBRL' : 'transcribed from the 10-Q / 10-K notes and tied out against XBRL', OB && OB.updated ? fmtDate(OB.updated) : '—'],
      [LANG === 'es' ? 'Apalancamiento de pares (XBRL de la SEC)' : 'Peer leverage (SEC XBRL)', LANG === 'es' ? 'diario, con la cosecha de EDGAR' : 'daily, with the EDGAR harvest', LANG === 'es' ? 'API de datos XBRL de la SEC, un emisor por fila' : 'SEC XBRL company-facts API, one issuer per row', PL && PL.fetched ? fmtDate(PL.fetched) : '—'],
      [LANG === 'es' ? 'Calendario del inversionista' : 'Investor calendar', LANG === 'es' ? 'diario, con la cosecha de EDGAR' : 'daily, with the EDGAR harvest', LANG === 'es' ? 'página de eventos de RI de Oracle y comunicados de fecha' : 'Oracle IR events page and date-setting releases', CAL && CAL.generated ? fmtDate(CAL.generated) : '—'],
    ];
    html('refreshTable', `<table><thead><tr><th>${t('block')}</th><th>${t('cadence')}</th><th>${t('mechanism')}</th><th>${t('lastUpdate')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    const srcs = [
      { t: LANG === 'es' ? 'SEC EDGAR — Oracle Corporation (CIK 1341439)' : 'SEC EDGAR — Oracle Corporation (CIK 1341439)', d: LANG === 'es' ? 'Comunicados de resultados (Anexo 99.1 del 8-K), Formularios 10-Q y 10-K; base de todos los estados financieros, la deuda y el RPO.' : 'Earnings releases (Exhibit 99.1 to 8-K), Forms 10-Q and 10-K; the basis of every statement, debt and RPO figure.', u: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001341439' },
      { t: LANG === 'es' ? 'Oracle — Relación con inversionistas' : 'Oracle — Investor relations', d: LANG === 'es' ? 'Comunicados, presentaciones y webcasts de resultados.' : 'Releases, presentations and results webcasts.', u: 'https://investor.oracle.com/' },
      { t: LANG === 'es' ? 'Transcripciones de llamadas de resultados' : 'Earnings-call transcripts', d: LANG === 'es' ? 'Aportadas por el responsable (FactSet CallStreet); citas breves con orador y página. No se republican.' : 'Supplied by the owner (FactSet CallStreet); short quotes with speaker and page. Not republished.', u: 'https://investor.oracle.com/' },
      { t: LANG === 'es' ? 'Precios diarios' : 'Daily prices', d: `${MK.prices.ORCL ? MK.prices.ORCL.source : ''}; ${LANG === 'es' ? 'S&P 500 de FRED (SP500)' : 'S&P 500 from FRED (SP500)'}.`, u: MK.prices.ORCL && MK.prices.ORCL.sourceUrl ? MK.prices.ORCL.sourceUrl : 'https://www.nasdaq.com/market-activity/stocks/orcl/historical' },
      { t: US10.source || 'U.S. Treasury daily par yield curve', d: `${LANG === 'es' ? 'Rendimiento par a 10 años, diario, para la tasa libre de riesgo del DCF; valor usado' : '10-year par yield, daily, for the DCF risk-free rate; value used'}: ${us10Last ? `${fmtPct(us10Last[1], 2)} (${fmtDate(us10Last[0])})` : '—'}. ${LANG === 'es' ? 'FRED DGS10 republica la misma serie y es el respaldo cuando el CSV del Tesoro no responde.' : 'FRED DGS10 republishes the same series and is the fallback when the Treasury CSV does not answer.'}`, u: US10.sourceUrl || FRED_DGS10 },
      { t: 'FactSet', d: LANG === 'es' ? 'Estimaciones de consenso (UPA, ventas, EBITDA, flujo libre, precio objetivo, recomendaciones), precios, valores de mercado y deuda neta de los pares, a través del conector FactSet AI-Ready Data. Base de la UPA: mayoritaria de los brokers.' : 'Consensus estimates (EPS, sales, EBITDA, free cash flow, price target, ratings), prices, market values and peers\' net debt, through the FactSet AI-Ready Data connector. EPS basis: brokers\' majority.', u: 'https://www.factset.com/' },
      { t: LANG === 'es' ? 'Agencias calificadoras' : 'Rating agencies', d: LANG === 'es' ? "Moody's, S&P Global Ratings y Fitch: comunicados de acción de calificación." : "Moody's, S&P Global Ratings and Fitch: rating-action releases.", u: 'https://www.spglobal.com/ratings/' },
    ];
    html('srcGrid', srcs.map((s) => `<div class="item"><div class="t"><a href="${s.u}" target="_blank" rel="noopener">${s.t} ↗</a></div><div class="d">${s.d}</div></div>`).join(''));
  }

  // ================= SECTION REGISTRY: generated numbering, cross-references, stamps and staleness =================
  // data/sections.js (tools/oracle/data/sections.json) is the only source of section order, titles and numbers.
  // Nothing on the page types a section, figure or table number; ref(sectionId) resolves to "§NN Title" at render time.
  const secList = () => SEC.sections || [];
  // main sections are numbered 01, 02…; the Reference appendix (group: reference) R1, R2…; an unnumbered section may carry a label ("Start here")
  const secIndex = () => { let n = 0, r = 0; const m = {}; for (const s of secList()) { const label = L({ es: s.label_es, en: s.label_en }) || null; if (s.numbered === false) { m[s.id] = { n: null, label, s }; continue; } if (s.group === 'reference') { r++; m[s.id] = { n: r, num: 'R' + r, group: 'reference', s }; continue; } n++; m[s.id] = { n, num: String(n).padStart(2, '0'), s }; } return m; };
  const secNum = (id) => { const e = secIndex()[id]; return e ? (e.num || e.label || '') : ''; };
  const deckList = () => secList().filter((s) => s.deck).slice().sort((a, b) => (a.deck_order || 99) - (b.deck_order || 99));
  const secTitle = (id) => { const e = secIndex()[id]; return e ? L({ es: e.s.es, en: e.s.en }) : id; };
  const secNav = (id) => { const e = secIndex()[id]; return e ? L({ es: e.s.nav_es, en: e.s.nav_en }) : id; };
  const ref = (id) => { const e = secIndex()[id]; if (!e) return `<a class="xref" href="#${id}">${id}</a>`; return `<a class="xref" href="#${id}">${e.n != null ? '§' + secNum(id) + ' ' : ''}${secNav(id)}</a>`; };
  const resolveRefs = (s) => String(s).replace(/\{\{sec:([a-z_]+)\}\}/g, (m, id) => ref(id)).replace(/\{\{fact:([a-z_]+)\}\}/g, (m, id) => (FACTS[id] ? FACTS[id]() : m));
  function numberSections() {
    const idx = secIndex(); const es = LANG === 'es';
    const secs = [...document.querySelectorAll('section.block[data-sec]')];
    for (const sec of secs) {
      const e = idx[sec.dataset.sec]; if (!e) continue;
      const num = sec.querySelector('.sec-head .sec-num'), h2 = sec.querySelector('.sec-head h2');
      if (num) { num.textContent = e.num || e.label || ''; num.hidden = !(e.num || e.label); num.classList.toggle('label', !e.num && !!e.label); }
      if (h2) h2.textContent = L({ es: e.s.es, en: e.s.en });
      // figures (cards with a chart) and tables (cards with a table) numbered in reading order, once per card
      for (const card of sec.querySelectorAll('.card')) {
        if (card.closest('.sum-grid') || card.classList.contains('inputs')) continue;
        const h3 = [...card.children].find((c) => c.tagName === 'H3'); if (!h3) continue;
        const kind = card.querySelector('canvas') ? 'fig' : card.querySelector('.tblwrap, table') ? 'tbl' : null; if (!kind) continue;
        if (!card.dataset.num) { card.dataset.kind = kind; card.dataset.num = String(kind === 'fig' ? ++numberSections.fig : ++numberSections.tbl); }
        let tag = card.querySelector(':scope > .fignum'); if (!tag) { tag = document.createElement('span'); tag.className = 'fignum'; card.insertBefore(tag, h3); }
        tag.textContent = `${card.dataset.kind === 'fig' ? (es ? 'Figura' : 'Figure') : (es ? 'Tabla' : 'Table')} ${card.dataset.num}`;
      }
    }
    // navigation from the registry
    const nav = el('jumpNav');
    const navLink = (s) => `<a href="#${s.id}">${idx[s.id].num ? `<span class="muted">${idx[s.id].num}</span> ` : ''}${L({ es: s.nav_es, en: s.nav_en })}</a>`;
    if (nav) nav.innerHTML = secList().filter((s) => s.group !== 'reference').map(navLink).join('') + `<span class="navsep">${es ? 'Referencia' : 'Reference'}</span>` + secList().filter((s) => s.group === 'reference').map(navLink).join('') + `<a href="#sources">${es ? 'Fuentes' : 'Sources'}</a><button type="button" class="navbtn" id="btnCollapseAll"></button>`;
    renderMobileMenu();
    const ca = el('btnCollapseAll'); if (ca) ca.addEventListener('click', () => { const ids = secList().map((x) => x.id).filter((x) => x !== 'summary'); if (ca.dataset.mode === 'collapse') ids.forEach((x) => collapsed.add(x)); else collapsed.clear(); saveCollapsed(); applyCollapse(); });
  }
  numberSections.fig = 0; numberSections.tbl = 0;

  // ---- freshness: as-of (period end) and last refresh (ET) per data module; stale past the next expected filing + grace ----
  const fmtET = (iso) => { if (!iso) return '—'; if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return fmtDate(iso); const d = new Date(iso); if (isNaN(d)) return '—'; return d.toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET'; };
  const todayIso = () => todayET();
  const MOD_REFRESH = {
    financials: () => FIN.generatedAt, xbrl: () => XB && XB.fetched, obligations: () => OB && (OB.generatedAt || OB.updated), guidance: () => GD.generatedAt, comments: () => CM.updatedAt, summary: () => SUM.updatedAt,
    buildout: () => BO && (BO.updatedAt || BO.updated), reference: () => REF.updatedAt, market: () => MK.generatedAt, factset: () => FS && FS.fetched, cds: () => CDS.updatedAt, news: () => NEWS && NEWS.generatedAt,
    calendar: () => CAL && CAL.generated, peer_leverage: () => PL && PL.fetched, risks: () => RK && RK.generatedAt, quality: () => QR && (QR.generated || QR.generatedAt), changelog: () => CL && CL.generatedAt,
  };
  const MOD_ASOF = {
    financials: () => lastQ && qEndDate(lastQ), xbrl: () => XB && XB.latestPeriodEnd, obligations: () => OB && OB.as_of, guidance: () => GV.length && GV[GV.length - 1].date, comments: () => lastQ && qEndDate(lastQ), summary: () => lastQ && qEndDate(lastQ),
    buildout: () => lastQ && qEndDate(lastQ), reference: () => REF.updatedAt, market: () => lastPx && lastPx[0], factset: () => FS && FS.asOf, cds: () => { const p = CDS.points || []; return p.length ? p[p.length - 1][0] : null; }, news: () => NEWS && NEWS.asOf,
    calendar: () => CAL && CAL.generated, peer_leverage: () => PL && PL.fetched, risks: () => RK && RK.updated, quality: () => QR && QR.generated, changelog: () => CL && CL.generatedAt,
  };
  const nextExpectedFiling = () => { const c = REF.calendar && REF.calendar.nextResults; if (c && c.date) return { date: c.date, deadline: c.date, basis: 'confirmed' }; const e = QR && QR.nextResultsEstimate; if (e && e.end) return { date: e.median || e.end, deadline: e.end, basis: 'assumed', history: e.history || null }; return null; };
  function moduleStatus(id) {
    const rules = (SEC.freshness && SEC.freshness.modules) || {}; const r = rules[id] || {}; const grace = (SEC.freshness && SEC.freshness.grace_days) || 7;
    const srv = QR && (QR.modules || []).find((m) => m.id === id);
    const refreshed = (MOD_REFRESH[id] && MOD_REFRESH[id]()) || null, asOf = (MOD_ASOF[id] && MOD_ASOF[id]()) || null;
    let stale = false, reason = null;
    if (r.cadence === 'filing') { const nx = nextExpectedFiling(); if (nx) { const d = new Date((nx.deadline || nx.date) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + grace); const deadline = d.toISOString().slice(0, 10); if (todayIso() > deadline) { stale = true; reason = LANG === 'es' ? `pasó la siguiente fecha esperada de reporte (${fmtDate(nx.date)}, ${nx.basis === 'confirmed' ? 'confirmada' : 'supuesta'}) + ${grace} días` : `past the next expected filing (${fmtDate(nx.date)}, ${nx.basis}) + ${grace} days`; } } if (asOf && lastQ && asOf < qEndDate(lastQ) && !['guidance', 'reference', 'risks'].includes(id)) { stale = true; reason = LANG === 'es' ? `datos al ${fmtDate(asOf)}; el último trimestre cierra el ${fmtDate(qEndDate(lastQ))}` : `data as of ${fmtDate(asOf)} while the latest quarter ends ${fmtDate(qEndDate(lastQ))}`; } }
    else { const age = daysSince(refreshed ? String(refreshed).slice(0, 10) : null); const lim = r.max_age_days || 7; if (refreshed == null) { if (!r.optional) { stale = true; reason = LANG === 'es' ? 'sin datos' : 'no data'; } } else if (age > lim) { stale = true; reason = LANG === 'es' ? `última actualización hace ${age} días (límite ${lim})` : `last refresh ${age} days ago (limit ${lim})`; } }
    if (srv && srv.stale && !stale) { stale = true; reason = srv.reason; }
    const pending = !!r.optional && refreshed == null && !(MOD_ASOF[id] && MOD_ASOF[id]());
    return { id, label: L({ es: r.label_es, en: r.label_en }) || id, cadence: r.cadence, asOf, refreshed, stale, pending, reason, textDerived: !!r.text_derived, nextExpected: r.cadence === 'filing' ? nextExpectedFiling() : null, maxAgeDays: r.max_age_days || null };
  }
  const stampHtml = (asOf, refreshed, stale) => `<span class="stamp">${LANG === 'es' ? 'Corte' : 'As of'}: <b>${asOf ? fmtDate(asOf) : '—'}</b> · ${LANG === 'es' ? 'actualizado' : 'refreshed'} <span class="et">${fmtET(REFRESHED_AT || refreshed)}</span>${stale ? ` <span class="stale">${LANG === 'es' ? 'DESACTUALIZADO' : 'STALE'}</span>` : ''}</span>`;
  // Every chart, table and metric footer in a section gets the as-of date, the ET refresh time and the stale flag of
  // the modules that feed the section (from the registry); the section head carries the same stamp.
  function applyStamps() {
    for (const sec of document.querySelectorAll('section.block[data-sec]')) {
      const reg = secList().find((s) => s.id === sec.dataset.sec); if (!reg) continue;
      const sts = (reg.modules || []).map(moduleStatus);
      const live = sts.filter((s) => !s.pending); const asOf = live.length ? live[0].asOf : null; const refreshed = live.map((s) => s.refreshed).filter(Boolean).sort().pop() || null; const stale = live.some((s) => s.stale);
      sec.querySelectorAll('.stamp, .sec-stamp').forEach((e) => e.remove());
      // The as-of / refreshed stamp is written once, in the section head (owner's request 2026-10-03: no repeated captions);
      // a footer repeats it only when the section is stale, so the STALE flag still sits under every figure it affects.
      for (const p of sec.querySelectorAll('p.chart-src')) { p.innerHTML = p.innerHTML.replace(/(\s*·\s*)+$/, '').replace(/·(\s*·)+/g, '·'); if (stale) p.insertAdjacentHTML('beforeend', stampHtml(asOf, refreshed, stale)); }
      const head = sec.querySelector('.sec-head'); if (head) head.insertAdjacentHTML('beforeend', `<span class="sec-stamp">${stampHtml(asOf, refreshed, stale)}</span>`);
    }
  }

  // ================= SUMMARY: key numbers with their dates =================
  function renderKeyNumbers() {
    if (!el('keyNumbers') || !lastQ) return; const es = LANG === 'es';
    const nd = netDebt(lastQ), eb = lastLTM && lastLTM.is ? lastLTM.is.ebitda : null; const Lz = (OB && OB.leases) || {}; const un = Lz.uncommenced || {};
    const fla = XB && XB.concepts.fin_lease_additions ? (XB.concepts.fin_lease_additions.quarters || []).filter((x) => x.value != null).slice(-1)[0] : null;
    const nx = nextExpectedFiling();
    const B = { rep: `<span class="badge ok">${es ? 'reportado' : 'reported'}</span>`, der: `<span class="badge">${es ? 'derivado' : 'derived'}</span>`, txt: `<span class="badge rev">${es ? 'texto · revisión pendiente' : 'text · needs review'}</span>`, mkt: `<span class="badge ok">${es ? 'mercado' : 'market'}</span>`, est: `<span class="badge est">${es ? 'supuesto' : 'assumed'}</span>`, co: `<span class="badge">${es ? 'declaración de la empresa' : 'company statement'}</span>` };
    const ql = qLabel(lastQ), qe = fmtDate(qEndDate(lastQ));
    const rows = [
      [es ? 'Ingresos del trimestre' : 'Quarterly revenue', fmtBn(lastQ.is.revTotal), `${ql} · ${qe}`, B.rep, 'statements'],
      [es ? 'Margen operativo No-GAAP' : 'Non-GAAP operating margin', fmtPct(lastQ.is.ngOpMargin), `${ql}`, B.rep, 'statements'],
      [es ? 'RPO (demanda contratada)' : 'RPO (contracted demand)', lastQ.kpi.rpo != null ? fmtBn(lastQ.kpi.rpo, 0) : '—', `${ql} · ${qe}`, B.rep, 'rpo'],
      [es ? 'Capex en efectivo del trimestre' : 'Quarterly cash capex', lastQ.cf && lastQ.cf.capex != null ? fmtBn(-lastQ.cf.capex) : '—', `${ql}`, lastQ.q === 1 ? B.rep : B.der, 'capex'],
      [es ? 'Adiciones por arrendamiento financiero' : 'Finance-lease additions', fla ? fmtBn(fla.value) : (es ? 'no etiquetado' : 'not tagged'), fla ? boLabel(fla.quarter) : '', fla && fla.derived ? B.der : B.rep, 'capex'],
      [es ? 'Flujo de efectivo libre del trimestre' : 'Quarterly free cash flow', lastQ.cf && lastQ.cf.fcf != null ? fmtBn(lastQ.cf.fcf) : '—', `${ql}`, B.der, 'capex'],
      [es ? 'Deuda neta · deuda neta / EBITDA UDM' : 'Net debt · net debt / LTM EBITDA', nd ? `${fmtBn(nd.net)} · ${eb ? fmtX(nd.net / eb, 2) : '—'}` : '—', `${qe}`, B.der, 'financing'],
      [es ? 'Pasivos por arrendamiento (operativos + financieros)' : 'Lease liabilities (operating + finance)', Lz.operating_liabilities_total != null ? fmtBn((Lz.operating_liabilities_total || 0) + (Lz.finance_liabilities_total || 0)) : '—', OB ? fmtDate(OB.as_of) : '', B.rep, 'obligations'],
      [es ? 'Arrendamientos firmados, no iniciados (nominal)' : 'Leases signed, not yet commenced (nominal)', un.usd_bn != null ? `US$ ${fmtN(un.usd_bn, 0)} ${es ? 'mil M' : 'bn'}` : '—', OB ? fmtDate(OB.as_of) : '', `${uncBadge()}<span class="sub">${uncNote()}</span>`, 'obligations'],
      [es ? 'Obligaciones de compra (nominal)' : 'Purchase obligations (nominal)', OB && OB.purchase_obligations ? fmtBn(OB.purchase_obligations.total) : '—', OB ? fmtDate(OB.as_of) : '', B.rep, 'obligations'],
      [es ? 'Precio ORCL · capitalización' : 'ORCL price · market cap', lastPx ? `US$ ${fmtN(lastPx[1], 2)}${sharesNow ? ` · ${fmtBn(lastPx[1] * sharesNow / 1e6, 0)}` : ''}` : '—', lastPx ? `${es ? 'cierre' : 'close'} ${fmtDate(lastPx[0])}` : '', B.mkt, 'valuation'],
      [es ? 'Próximos resultados' : 'Next results', nx ? fmtDate(nx.date) : '—', nx ? (nx.basis === 'confirmed' ? (es ? 'confirmado por Oracle' : 'confirmed by Oracle') : (es ? `mediana de las fechas de publicación de los tres años anteriores${nx.history ? ` (${nx.history.map((d) => fmtDate(d)).join(', ')})` : ''}` : `median of the prior three years' release dates${nx.history ? ` (${nx.history.map((d) => fmtDate(d)).join(', ')})` : ''}`)) : '', nx && nx.basis === 'confirmed' ? B.co : B.est, 'calendar'],
    ];
    html('keyNumbers', `<table class="keynums"><thead><tr><th>${es ? 'Cifra' : 'Figure'}</th><th>${es ? 'Valor' : 'Value'}</th><th>${es ? 'Periodo / fecha' : 'Period / date'}</th><th>${es ? 'Base' : 'Basis'}</th><th>${es ? 'Detalle' : 'Detail'}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td class="v">${r[1]}</td><td class="small muted">${r[2]}</td><td>${r[3]}</td><td class="small">${ref(r[4])}</td></tr>`).join('')}</tbody></table>`);
    html('keyNumbersSrc', `${t('src')}: ${relLink()} · ${OB && obSrc(OB.leases && OB.leases.source) ? extLink(obSrc(OB.leases.source).url, es ? '10-Q' : '10-Q') : ''} · ${XB ? extLink(XB.source.url, 'SEC XBRL') : ''} · ${lastPx ? extLink(NASDAQ_URL, 'Nasdaq') : ''} · ${asOfQ()}`);
  }

  // ================= CAPEX AND FREE CASH FLOW =================
  const xbQuarters = (key) => (XB && XB.concepts[key] && XB.concepts[key].quarters) || [];
  const xbQ = (key, q) => xbQuarters(key).find((x) => x.quarter === `FY${q.fy}Q${q.q}`) || null;
  const xbInstant = (key, end) => { const c = XB && XB.concepts[key]; if (!c || !c.periods) return null; return c.periods.find((p) => p.period_end === end) || null; };
  const parseCapexGuide = (note) => { if (!note) return null; const s = String(note).replace(/,/g, ''); const rng = /\$(\d+(?:\.\d+)?)\s*(?:billion|bn)?\s*(?:to|-|–)\s*\$?(\d+(?:\.\d+)?)\s*(?:billion|bn)/i.exec(s); const single = !rng && /(?:around|about|approximately|roughly)?\s*\$(\d+(?:\.\d+)?)\s*(?:billion|bn)/i.exec(s); const net = /(?:not more than|no more than|at most|around|about|approximately)\s*\$(\d+(?:\.\d+)?)\s*(?:billion|bn)\s*(?:in|of)?\s*net cash/i.exec(s); return { lo: rng ? +rng[1] : single ? +single[1] : null, hi: rng ? +rng[2] : single ? +single[1] : null, netMax: net ? +net[1] : null }; };
  function renderCapex() {
    if (!el('chartCapex')) return; const es = LANG === 'es', c = SERIES();
    const qs = Q.slice(-lastN());
    const capex = qs.map((q) => (q.cf && q.cf.capex != null ? -q.cf.capex : null));
    const fcf = qs.map((q) => (q.cf ? q.cf.fcf : null));
    const fla = qs.map((q) => { const x = xbQ('fin_lease_additions', q); return x && x.value != null ? x.value : null; });
    mkChart('chartCapex', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { type: 'bar', label: es ? 'Capex en efectivo (US$ M)' : 'Cash capex (US$ M)', data: capex, backgroundColor: c[0], stack: 'cap' },
      { type: 'bar', label: es ? 'Adiciones por arrendamiento financiero (US$ M, XBRL)' : 'Finance-lease additions (US$ M, XBRL)', data: fla, backgroundColor: c[3], stack: 'cap' },
      { type: 'line', label: es ? 'Flujo libre (US$ M)' : 'Free cash flow (US$ M)', data: fcf, borderColor: c[7], backgroundColor: c[7], pointRadius: 3, spanGaps: true },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.parsed.y == null ? (es ? 'no etiquetado' : 'not tagged') : fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM() } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    const gaps = qs.filter((q, i) => fla[i] == null).map(qLabel);
    el('capexChartCap').textContent = es ? `US$ millones por trimestre. Barras apiladas: capex en efectivo (estado de flujos, trimestres discretos por diferencia) y adiciones por arrendamiento financiero (activos por derecho de uso obtenidos a cambio de nuevos pasivos, dato XBRL del 10-Q/10-K; Oracle no lo etiqueta en cada trimestre${gaps.length ? `: sin dato en ${gaps.join(', ')}` : ''}). Línea: flujo libre = flujo operativo − capex; el flujo operativo incluye prepagos de clientes.` : `US$ million per quarter. Stacked bars: cash capex (cash-flow statement, discrete quarters by subtraction) and finance-lease additions (right-of-use assets obtained in exchange for new lease liabilities, XBRL fact of the 10-Q/10-K; Oracle does not tag it every quarter${gaps.length ? `: no value for ${gaps.join(', ')}` : ''}). Line: free cash flow = operating cash flow − capex; operating cash flow includes customer prepayments.`;
    html('capexChartSrc', `${t('src')}: ${relLink()} (${es ? 'capex, flujo operativo' : 'capex, operating cash flow'}) · ${XB ? extLink(XB.source.url, es ? 'SEC XBRL (RightOfUseAssetObtainedInExchangeForFinanceLeaseLiability)' : 'SEC XBRL (RightOfUseAssetObtainedInExchangeForFinanceLeaseLiability)') : ''} · ${asOfQ()}`);
    // table: capital deployed by quarter, cash and leased, with the cumulative year-to-date and the method
    const last8 = Q.slice(-8);
    const row = (q) => { const x = xbQ('fin_lease_additions', q), o = xbQ('op_lease_additions', q), cx = xbQ('capex_cash', q); const cap = q.cf && q.cf.capex != null ? -q.cf.capex : null; const tot = cap != null && x && x.value != null ? cap + x.value : null; return `<tr><td><b>${qLabel(q)}</b><span class="sub">${fmtDate(qEndDate(q))}</span></td><td>${fmtM(cap)}${cx && cx.value != null && Math.abs(cx.value - cap) <= 2 ? ` <span class="badge ok" title="XBRL">✓</span>` : ''}</td><td>${x && x.value != null ? fmtM(x.value) + (x.derived ? '<span class="sub">' + (es ? 'derivado' : 'derived') + '</span>' : '') : `<span class="muted">${es ? 'no etiquetado' : 'not tagged'}</span>`}</td><td>${o && o.value != null ? fmtM(o.value) : `<span class="muted">${es ? 'no etiquetado' : 'not tagged'}</span>`}</td><td><b>${tot != null ? fmtM(tot) : '—'}</b></td><td>${q.cf ? fmtM(q.cf.cfo) : '—'}</td><td class="${q.cf ? cls(q.cf.fcf) : ''}">${q.cf ? fmtM(q.cf.fcf) : '—'}</td><td>${q.cf && q.cf.capexToRevenue != null ? fmtPct(q.cf.capexToRevenue, 0) : '—'}</td></tr>`; };
    html('capexTable', `<table><thead><tr><th>${t('quarter')}</th><th>${es ? 'Capex en efectivo' : 'Cash capex'}</th><th>${es ? 'Adiciones arr. financiero' : 'Finance-lease additions'}</th><th>${es ? 'Adiciones arr. operativo' : 'Operating-lease additions'}</th><th>${es ? 'Capital desplegado (efectivo + arr. fin., derivado)' : 'Capital deployed (cash + finance lease, derived)'}</th><th>${t('cfo')}</th><th>${t('fcf')}</th><th>${es ? 'Capex / ingresos' : 'Capex / revenue'}</th></tr></thead><tbody>${last8.map(row).join('')}</tbody></table>`);
    el('capexTableCap').textContent = es ? 'US$ millones. El capex en efectivo del 2T–4T se deriva restando el acumulado del reporte anterior (✓ = coincide con el dato XBRL del 10-Q/10-K derivado por el mismo método). Las adiciones por arrendamiento financiero y operativo son el dato XBRL del estado de flujos complementario; "no etiquetado" = Oracle no reportó la cifra de ese trimestre por separado y no se interpola. El capital desplegado suma efectivo y arrendamiento financiero y se marca derivado; las adiciones operativas no se suman porque no son capex.' : 'US$ million. Cash capex for 2Q–4Q is derived by subtracting the prior report\'s cumulative figure (✓ = matches the 10-Q/10-K XBRL value derived the same way). Finance- and operating-lease additions are the XBRL supplemental cash-flow fact; "not tagged" = Oracle did not report that quarter\'s figure separately and nothing is interpolated. Capital deployed adds cash and finance leases and is marked derived; operating-lease additions are not added because they are not capex.';
    html('capexTableSrc', `${t('src')}: ${relLink()} · ${XB ? extLink(XB.source.url, 'SEC XBRL') : ''} · ${asOfQ()}`);
    // guidance for the current fiscal year versus spend to date
    const fyNow = lastQ.fy; const fyQs = Q.filter((q) => q.fy === fyNow); const spent = fyQs.reduce((a, q) => a + (q.cf && q.cf.capex != null ? -q.cf.capex : 0), 0);
    const flaFy = fyQs.map((q) => xbQ('fin_lease_additions', q)).filter((x) => x && x.value != null).reduce((a, x) => a + x.value, 0);
    const gv = GV.slice().reverse().find((v) => v.items && v.items.fyCapexNote && v.fyGuided === fyNow) || GV.slice().reverse().find((v) => v.items && v.items.fyCapexNote);
    const g = gv ? parseCapexGuide(gv.items.fyCapexNote) : null;
    const prevFy = Y.find((y) => y.fy === fyNow - 1);
    const rows = [
      [es ? `Guía de capex ${fyLabel(gv ? gv.fyGuided : fyNow)} (texto de la administración)` : `${fyLabel(gv ? gv.fyGuided : fyNow)} capex guidance (management's words)`, gv ? gCapexNote(gv) : '—', gv ? `${fmtDate(gv.date)} · ${gLink(gv, es ? 'fuente' : 'source')}` : ''],
      [es ? 'Rango interpretado del texto (US$ mil M)' : 'Range parsed from the text (US$ bn)', g && g.lo != null ? `${fmtN(g.lo)}${g.hi !== g.lo ? '–' + fmtN(g.hi) : ''}${g.netMax ? ` · ${es ? 'neto en efectivo ≤' : 'net cash ≤'} ${fmtN(g.netMax)}` : ''}` : (es ? 'no cuantificable' : 'not quantifiable'), es ? 'lectura automática del texto de la guía; sin interpolación' : 'automatic reading of the guidance text; no interpolation'],
      [es ? `Capex en efectivo ejecutado, ${fyLabel(fyNow)} a la fecha` : `Cash capex spent, ${fyLabel(fyNow)} to date`, `${fmtBn(spent)} (${fyQs.map(qLabel).join(' + ')})`, g && g.lo ? (es ? `${fmtPct(100 * spent / 1000 / g.lo, 0)}–${fmtPct(100 * spent / 1000 / g.hi, 0)} del rango` : `${fmtPct(100 * spent / 1000 / g.hi, 0)}–${fmtPct(100 * spent / 1000 / g.lo, 0)} of the range`) : ''],
      [es ? `Adiciones por arrendamiento financiero, ${fyLabel(fyNow)} a la fecha (XBRL)` : `Finance-lease additions, ${fyLabel(fyNow)} to date (XBRL)`, flaFy ? fmtBn(flaFy) : (es ? 'no etiquetado' : 'not tagged'), es ? 'fuera de la guía de capex: capacidad arrendada, no comprada' : 'outside the capex guide: leased, not purchased, capacity'],
      [es ? `Capex en efectivo ${fyLabel(fyNow - 1)} (año completo)` : `${fyLabel(fyNow - 1)} cash capex (full year)`, prevFy && prevFy.cf ? fmtBn(-prevFy.cf.capex) : '—', es ? 'estado de flujos anual' : 'annual cash-flow statement'],
    ];
    html('capexGuide', `<table><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td class="small muted">${r[2]}</td></tr>`).join('')}</tbody></table>`);
    el('capexGuideCap').textContent = es ? 'La guía es una declaración de la empresa, no auditada; el capex "neto en efectivo" que Oracle guía descuenta los prepagos de clientes del capex reportado.' : 'Guidance is a company statement, not audited; the "net cash" capex Oracle guides nets customer prepayments against reported capex.';
    html('capexGuideNote', `<b>${es ? 'Lectura.' : 'Reading it.'}</b> ${es ? `El capex se paga antes de facturarse: ${ref('rpo')} muestra la demanda contratada y ${ref('sites')} los megavatios que ese capital energiza. Los prepagos de clientes (${ref('circular')}) reducen el capex que Oracle financia con deuda y capital (${ref('financing')}).` : `Capex is paid before it is billed: ${ref('rpo')} shows the contracted demand and ${ref('sites')} the megawatts that capital energises. Customer prepayments (${ref('circular')}) reduce the capex Oracle funds with debt and equity (${ref('financing')}).`}`);
    html('capexGuideSrc', `${t('src')}: ${gv ? gLink(gv, es ? 'transcripción / comunicado' : 'transcript / release') : ''} · ${relLink()} · ${asOfQ()}`);
    const ltmCap = lastLTM && lastLTM.cf ? -lastLTM.cf.capex : null, ltmFcf = lastLTM && lastLTM.cf ? lastLTM.cf.fcf : null;
    const ltmFla = lastLTM && lastLTM.quarters ? lastLTM.quarters.map((id) => xbQuarters('fin_lease_additions').find((x) => x.quarter === `FY${id}`)).filter((x) => x && x.value != null) : [];
    html('capexStats', [
      ltmCap != null && { v: fmtBn(ltmCap), l: es ? `capex en efectivo UDM (${ltmLabel()})` : `LTM cash capex (${ltmLabel()})` },
      { v: ltmFla.length === 4 ? fmtBn(ltmFla.reduce((a, x) => a + x.value, 0)) : (es ? 'incompleto' : 'incomplete'), l: es ? `adiciones por arrendamiento financiero UDM (XBRL, ${ltmFla.length}/4 trimestres etiquetados)` : `LTM finance-lease additions (XBRL, ${ltmFla.length}/4 quarters tagged)` },
      ltmFcf != null && { v: fmtBn(ltmFcf), l: es ? 'flujo libre UDM' : 'LTM free cash flow', c: cls(ltmFcf) },
      lastQ.cf && lastQ.cf.capexToRevenue != null && { v: fmtPct(lastQ.cf.capexToRevenue, 0), l: es ? `capex / ingresos, ${qLabel(lastQ)}` : `capex / revenue, ${qLabel(lastQ)}` },
    ].filter(Boolean).map((s) => `<div class="stat"><div class="v ${s.c || ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    html('capexMeta', es ? `Trimestres discretos derivados de los estados de flujo acumulados (6, 9 y 12 meses) y verificados contra el total anual y los datos XBRL. Año fiscal de Oracle: termina el 31 de mayo.` : `Discrete quarters derived from the cumulative cash-flow statements (6, 9 and 12 months) and checked against the annual total and the XBRL data. Oracle's fiscal year ends 31 May.`);
  }

  // ================= OFF-BALANCE-SHEET: three views, lease maturities, VIE / guarantees / developer financings, provenance =================
  function renderObViews() {
    if (!OB || !el('obViews')) return; const es = LANG === 'es', S = obligStats(); if (!S) return;
    const Lz = OB.leases || {}, un = Lz.uncommenced || {}, po = OB.purchase_obligations || {}, lt = OB.lookthrough || {}, pv = lt.pv_estimate || null, vie = OB.vie || {}, ga = OB.guarantees || {};
    const bn = (v) => (v == null ? '—' : `${fmtN(v / 1000, 1)}`);
    // illustrative present value of the uncommenced leases, labelled estimate and never added anywhere
    let pvVal = null; if (pv && un.usd_bn) { const r = pv.discount_rate_pct / 100, n = pv.term_years, pay = un.usd_bn * 1000 / n; const annuity = pay * (1 - Math.pow(1 + r, -n)) / r; pvVal = annuity / Math.pow(1 + r, pv.start_offset_years); }
    const dash = '<span class="muted">—</span>';
    const nd = (es ? 'no divulgado' : 'not disclosed');
    const rows = [
      { l: es ? 'Deuda neta (notas por pagar − efectivo e inversiones)' : 'Net debt (notes payable − cash and investments)', a: bn(S.net), b: bn(S.net), c: bn(S.net), d: es ? 'balance del 10-Q' : '10-Q balance sheet' },
      { l: es ? '+ pasivos por arrendamientos operativos (valor presente, ASC 842)' : '+ operating lease liabilities (present value, ASC 842)', a: dash, b: bn(S.opL), c: bn(S.opL), d: es ? 'ya en el balance; se suman porque su costo no está en el EBITDA' : 'already on the balance sheet; added because their cost is outside EBITDA' },
      { l: es ? '+ pasivos por arrendamientos financieros (valor presente)' : '+ finance lease liabilities (present value)', a: dash, b: bn(S.finL), c: bn(S.finL), d: es ? 'ya en el balance, fuera de "notas por pagar"' : 'already on the balance sheet, outside "notes payable"' },
      { l: es ? '= Deuda neta ajustada' : '= Adjusted net debt', a: `<b>${bn(S.net)}</b>`, b: `<b>${bn(S.adjDebt)}</b>`, c: `<b>${bn(S.adjDebt)}</b>`, d: '' , cls: 'total' },
      { l: es ? 'EBITDA UDM · EBITDAR UDM (+ costo de arrendamientos operativos)' : 'LTM EBITDA · LTM EBITDAR (+ operating lease cost)', a: bn(S.ebitda), b: bn(S.ebitdar), c: bn(S.ebitdar), d: es ? `costo de arrendamientos operativos UDM US$ ${fmtN(S.olc)} M` : `LTM operating lease cost US$ ${fmtN(S.olc)} M` },
      { l: es ? 'Apalancamiento' : 'Leverage', a: `<b>${fmtX(S.ndEbitda, 2)}</b>`, b: `<b>${fmtX(S.leaseAdj, 2)}</b>`, c: `<b>${fmtX(S.leaseAdj, 2)}</b>`, d: es ? 'la vista transparente no cambia la razón: nada de abajo es pasivo' : 'the look-through view leaves the ratio unchanged: nothing below is a liability', cls: 'total' },
      { l: es ? 'Memo: arrendamientos firmados, no iniciados (nominal, sin descontar)' : 'Memo: leases signed, not yet commenced (nominal, undiscounted)', a: dash, b: dash, c: `${fmtN(un.usd_bn, 0)} ${uncBadge()}`, d: es ? `fuera del balance hasta que cada sitio se entregue; plazos ${un.term_years_min}–${un.term_years_max} años; nunca se suman a la deuda; ${uncNote()}` : `off the balance sheet until each site is handed over; ${un.term_years_min}–${un.term_years_max}-year terms; never added to debt; ${uncNote()}`, cls: 'sub' },
      { l: es ? 'Memo: valor presente de esos arrendamientos' : 'Memo: present value of those leases', a: dash, b: dash, c: pvVal != null ? `≈ ${bn(pvVal)} <span class="badge est">${L({ es: pv.label_es, en: pv.label_en })}</span>` : nd, d: pv ? L({ es: pv.method_es, en: pv.method_en }) : '', cls: 'sub' },
      { l: es ? 'Memo: razón incluyendo compromisos (nominal)' : 'Memo: commitment-inclusive ratio (nominal)', a: dash, b: dash, c: `${fmtX(S.commit, 1)} <span class="badge est">${es ? 'exposición, no deuda' : 'exposure, not debt'}</span>`, d: es ? '(deuda neta ajustada + arrendamientos no iniciados a valor nominal) ÷ EBITDAR, sin proyectar EBITDA' : '(adjusted net debt + uncommenced leases at nominal) ÷ EBITDAR, without projecting EBITDA', cls: 'sub' },
      { l: es ? 'Memo: obligaciones de compra (nominal)' : 'Memo: purchase obligations (nominal)', a: dash, b: dash, c: bn(po.total), d: es ? 'energía, componentes y otros; nota de compromisos del 10-Q' : 'power, components and other; 10-Q commitments note', cls: 'sub' },
      { l: es ? 'Memo: entidades de interés variable consolidadas o no (ASC 810)' : 'Memo: variable-interest entities, consolidated or not (ASC 810)', a: dash, b: dash, c: `${vie.disclosed ? '' : nd} <span class="badge rev">${es ? 'revisión pendiente' : 'needs review'}</span>`, d: es ? 'exposición máxima a pérdidas: no divulgada' : 'maximum exposure to loss: not disclosed', cls: 'sub' },
      { l: es ? 'Memo: garantías a arrendadores o de valor residual' : 'Memo: lessor or residual-value guarantees', a: dash, b: dash, c: ga.disclosed && ga.usd_m != null ? `${es ? 'hasta' : 'up to'} ${bn(ga.usd_m)} <span class="badge rev">${es ? 'texto · revisión' : 'text · review'}</span>` : nd, d: ga.disclosed ? (es ? `garantía de la deuda de un arrendador, 10-K p. ${ga.page}; ${(guaranteeStatus() || {}).short || ''}; exposición, nunca pasivo` : `guarantee of a lessor's borrowing, 10-K p. ${ga.page}; ${(guaranteeStatus() || {}).short || ''}; exposure, never a liability`) : (es ? 'si se divulgara, se mostraría como exposición, nunca como pasivo' : 'if disclosed, shown as exposure, never as a liability'), cls: 'sub' },
      { l: es ? 'Memo: deuda de proyecto de los desarrolladores (prensa)' : 'Memo: developers\' project debt (press)', a: dash, b: dash, c: `${es ? 'de los desarrolladores, no de Oracle' : 'the developers\', not Oracle\'s'}`, d: es ? 'listada por sitio abajo solo como referencia' : 'listed per site below for reference only', cls: 'sub' },
    ];
    html('obViews', `<table class="views"><thead><tr><th>US$ ${es ? 'mil M' : 'bn'}</th><th>${es ? 'Reportado' : 'Reported'}</th><th>${es ? 'Ajustado por arrendamientos (ASC 842)' : 'Lease-adjusted (ASC 842)'}</th><th>${es ? 'Transparente (ASC 810 + compromisos)' : 'Look-through (ASC 810 + commitments)'}</th><th>${es ? 'Qué es' : 'What it is'}</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.cls || ''}"><td>${r.l}</td><td>${r.a}</td><td>${r.b}</td><td>${r.c}</td><td class="desc">${r.d}</td></tr>`).join('')}</tbody></table>`);
    el('obViewsCap').textContent = es ? `Al ${fmtDate(OB.as_of)} (10-Q) con el EBITDA UDM del modelo (${ltmLabel()}). Las razones son derivadas. Las filas "memo" de la vista transparente son exposición, no deuda, y nunca entran en una razón salvo la marcada como tal.` : `At ${fmtDate(OB.as_of)} (10-Q) with the model's LTM EBITDA (${ltmLabel()}). Ratios are derived. The "memo" rows of the look-through view are exposure, not debt, and never enter a ratio except the one marked as such.`;
    html('obViewsMethod', `<div class="callout"><b>${es ? 'Cómo leer las tres vistas.' : 'How to read the three views.'}</b><br><b>${es ? 'Reportado.' : 'Reported.'}</b> ${L({ es: lt.reported_es, en: lt.reported_en })}<br><b>${es ? 'Ajustado por arrendamientos.' : 'Lease-adjusted.'}</b> ${L({ es: lt.lease_adjusted_es, en: lt.lease_adjusted_en })}<br><b>${es ? 'Transparente.' : 'Look-through.'}</b> ${L({ es: lt.lookthrough_es, en: lt.lookthrough_en })}<br><b>${es ? 'Qué dicen los reportes.' : 'What the filings say.'}</b> ${obsDisclosure(es)}</div>`);
    const q10 = obSrc(Lz.source);
    html('obViewsSrc', `${t('src')}: ${q10 ? extLink(q10.url, q10.title) : ''}${q10 && q10.accession ? ` · ${es ? 'acceso' : 'accession'} <span class="mono">${q10.accession}</span>` : ''} · ${es ? 'deuda neta y EBITDA UDM del modelo' : 'model net debt and LTM EBITDA'} (${ref('financing')}) · ${asOfQ()}`);
    // uncommenced leases: what is and is not disclosed
    const wa = un.weighted_average_start || {}, ls = un.lessors || {};
    html('uncFacts', `<table><tbody>
      <tr><td>${es ? 'Monto (nominal, sin descontar)' : 'Amount (nominal, undiscounted)'}</td><td><b>US$ ${fmtN(un.usd_bn, 0)} ${es ? 'mil M' : 'bn'}</b></td></tr>
      <tr><td>${es ? 'Inicio esperado' : 'Expected commencement'}</td><td>${boLabel(un.commence_from)} – ${un.commence_to}</td></tr>
      <tr><td>${es ? 'Plazos' : 'Terms'}</td><td>${un.term_years_min}–${un.term_years_max} ${es ? 'años' : 'years'}</td></tr>
      <tr><td>${es ? 'Inicio y plazo promedio ponderados' : 'Weighted-average start and term'}</td><td class="small">${L({ es: wa.text_es, en: wa.text_en }) || nd}</td></tr>
      <tr><td>${es ? 'Arrendadores / desarrolladores' : 'Lessors / developers'}</td><td class="small">${L({ es: ls.text_es, en: ls.text_en }) || nd}</td></tr>
      <tr><td>${es ? 'Tasa de descuento (arrendamientos vigentes)' : 'Discount rate (existing leases)'}</td><td>${Lz.discount_rate_pct ? `${fmtPct(Lz.discount_rate_pct.operating, 1)} <span class="small muted">${L({ es: Lz.discount_rate_pct.note_es, en: Lz.discount_rate_pct.note_en })}</span>` : nd}</td></tr>
    </tbody></table>`);
  }
  function renderLeaseMaturity() {
    if (!XB || !el('chartLeaseMaturity') || !OB) return; const es = LANG === 'es', c = SERIES(); const end = OB.as_of;
    const fyOf = (d) => { const [y, m] = d.split('-').map(Number); return m >= 6 ? y + 1 : y; };
    const fy = fyOf(end);
    const keys = ['remainder', 'y1', 'y2', 'y3', 'y4', 'y5', 'after'];
    const labels = keys.map((k, i) => (k === 'remainder' ? (es ? `Resto AF${fy}` : `Rest of FY${fy}`) : k === 'after' ? (es ? 'Después' : 'Thereafter') : `FY${fy + i}`));
    const op = keys.map((k) => { const p = xbInstant(`op_lease_due_${k}`, end); return p ? p.value : null; }), fin = keys.map((k) => { const p = xbInstant(`fin_lease_due_${k}`, end); return p ? p.value : null; });
    const opT = xbInstant('op_lease_payments_undiscounted', end), finT = xbInstant('fin_lease_payments_undiscounted', end), opI = xbInstant('op_lease_imputed_interest', end), finI = xbInstant('fin_lease_imputed_interest', end), opL = xbInstant('op_lease_liability', end), finL = xbInstant('fin_lease_liability', end);
    if (op.every((v) => v == null)) { html('leaseMatTable', `<p class="small muted">${es ? 'Calendario no etiquetado en XBRL para este periodo.' : 'Schedule not tagged in XBRL for this period.'}</p>`); return; }
    mkChart('chartLeaseMaturity', { type: 'bar', data: { labels, datasets: [{ label: es ? 'Operativos' : 'Operating', data: op, backgroundColor: c[0], stack: 'a' }, { label: es ? 'Financieros' : 'Finance', data: fin, backgroundColor: c[3], stack: 'a' }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: US$ ${fmtN(x.parsed.y)} M` } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 34, borderWidth: 0 } } } });
    const sum = (a) => a.reduce((x, v) => x + (v || 0), 0);
    const tie = (s, tot) => (tot && Math.abs(s - tot.value) <= 1 ? `<span class="badge ok">${es ? 'cuadra' : 'ties'}</span>` : `<span class="badge bad">${es ? 'no cuadra' : 'does not tie'}</span>`);
    html('leaseMatTable', `<table><thead><tr><th>${es ? 'Periodo' : 'Period'}</th><th>${es ? 'Operativos' : 'Operating'}</th><th>${es ? 'Financieros' : 'Finance'}</th></tr></thead><tbody>${labels.map((l, i) => `<tr><td>${l}</td><td>${fmtM(op[i])}</td><td>${fmtM(fin[i])}</td></tr>`).join('')}<tr class="total"><td>${es ? 'Total de pagos sin descontar' : 'Total undiscounted payments'}</td><td>${fmtM(sum(op))} ${tie(sum(op), opT)}</td><td>${fmtM(sum(fin))} ${tie(sum(fin), finT)}</td></tr><tr class="sub"><td>${es ? '− interés implícito' : '− imputed interest'}</td><td>${opI ? fmtM(-opI.value) : '—'}</td><td>${finI ? fmtM(-finI.value) : '—'}</td></tr><tr class="total"><td>${es ? '= Pasivo en el balance (valor presente)' : '= Liability on the balance sheet (present value)'}</td><td>${opL ? fmtM(opL.value) : '—'}</td><td>${finL ? fmtM(finL.value) : '—'}</td></tr></tbody></table>`);
    el('leaseMatCap').textContent = es ? `US$ millones al ${fmtDate(end)}: pagos de los arrendamientos ya reconocidos, por año fiscal, sin descontar; la suma menos el interés implícito es el pasivo del balance (ASC 842). No incluye los arrendamientos firmados que aún no empiezan. Dato XBRL del 10-Q; "cuadra" = la suma de los años coincide con el total etiquetado.` : `US$ million at ${fmtDate(end)}: payments on the leases already recognised, by fiscal year, undiscounted; the sum less imputed interest is the balance-sheet liability (ASC 842). Excludes the leases signed but not yet commenced. XBRL fact of the 10-Q; "ties" = the sum of the years equals the tagged total.`;
    html('leaseMatSrc', `${t('src')}: ${extLink(XB.source.url, 'SEC XBRL')} · ${opL ? extLink(opL.url, `10-Q ${es ? 'acceso' : 'accession'} ${opL.accn}`) : ''} · ${asOfQ()}`);
  }
  function renderObVie() {
    if (!OB || !el('obVie')) return; const es = LANG === 'es'; const vie = OB.vie || {}, ga = OB.guarantees || {};
    const sV = obSrc(vie.source), sG = obSrc(ga.source);
    html('obVie', `<div class="grid-2 eq" style="margin-top:0"><div class="callout" style="margin-top:12px"><b>${es ? 'Entidades de interés variable y vehículos de propósito especial (ASC 810).' : 'Variable-interest entities and special-purpose vehicles (ASC 810).'}</b> <span class="badge rev">${es ? 'revisión pendiente' : 'needs review'}</span><br>${L({ es: vie.text_es, en: vie.text_en })}${sV ? `<br><span class="small muted">${t('src')}: ${extLink(sV.url, sV.title)}${sV.accession ? ` · <span class="mono">${sV.accession}</span>` : ''}</span>` : ''}</div><div class="callout" style="margin-top:12px"><b>${es ? 'Garantías a arrendadores y de valor residual.' : 'Lessor and residual-value guarantees.'}</b> <span class="badge rev">${es ? 'texto · revisión' : 'text · review'}</span><br>${L({ es: ga.text_es, en: ga.text_en })}${sG ? `<br><span class="small muted">${t('src')}: ${extLink(sG.url, sG.title)}${sG.accession ? ` · <span class="mono">${sG.accession}</span>` : ''}</span>` : ''}</div></div>`);
    const sites = (BO && BO.sites) || [];
    const sf = (s, k) => (es ? s[k + '_es'] : s[k + '_en']) || s[k] || '';
    const srcShort = (r) => (r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${r.short || r.title}</a>` : `<span>${r.short || r.title}</span>`);
    html('obDevFin', `<table class="sites"><thead><tr><th>${es ? 'Sitio' : 'Site'}</th><th>${es ? 'Desarrollador' : 'Developer'}</th><th>${es ? 'Financiamiento del desarrollador (según su comunicado o la prensa)' : 'Developer financing (per its release or the press)'}</th><th>${es ? 'Exposición de Oracle' : 'Oracle\'s exposure'}</th><th>${t('src')}</th></tr></thead><tbody>${sites.map((s) => `<tr><td><b>${s.short || s.name}</b></td><td>${sf(s, 'developer')}</td><td>${sf(s, 'financing')} <span class="badge">${es ? 'no es de Oracle' : 'not Oracle\'s'}</span></td><td class="small">${es ? 'Oracle no divulga su compromiso por sitio; el arrendamiento entra al balance al iniciar' : 'Oracle discloses no per-site commitment; the lease comes onto the balance sheet at commencement'}</td><td class="small">${(s.sources || []).map(srcShort).join(' · ')}</td></tr>`).join('')}</tbody></table>`);
    el('obVieCap').textContent = es ? 'Lo que los reportes de Oracle dicen (y no dicen) sobre entidades consolidadas y garantías, y los financiamientos de proyecto de los desarrolladores detrás de los campus arrendados. La deuda de los desarrolladores es de ellos: aquí se lista como referencia y nunca se trata como pasivo de Oracle.' : 'What Oracle\'s filings say (and do not say) about consolidated entities and guarantees, and the developers\' project financings behind the leased campuses. The developers\' debt is theirs: it is listed for reference and never treated as an Oracle liability.';
    html('obVieSrc', `${t('src')}: ${sV ? extLink(sV.url, es ? '10-K AF2026' : 'FY2026 10-K') : ''} · ${sG ? extLink(sG.url, es ? '10-Q 1T27' : '1Q27 10-Q') : ''} · ${es ? 'comunicados de los desarrolladores y prensa enlazados por fila' : 'developer releases and press linked per row'} (${ref('sites')}) · ${asOfQ()}`);
  }
  function renderObProvenance() {
    if (!OB || !el('obProvenance')) return; const es = LANG === 'es';
    const ver = (QR && QR.obligationsVerification) || [];
    const prov = OB.provenance || {};
    const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
    const NAMED = { 'guarantees.usd_m': [`Garantía del préstamo de un arrendador (exposición máxima)`, `Guarantee of a lessor's borrowing (maximum exposure)`], 'vie.disclosed': ['Entidades de interés variable consolidadas', 'Consolidated variable-interest entities'], 'preferred.carrying_value_usd_m': ['Preferentes: valor en libros', 'Preferred stock: carrying value'], 'preferred.dividend_quarterly_usd_m': ['Preferentes: dividendo trimestral', 'Preferred stock: quarterly dividend'], 'preferred.max_conversion_rate': ['Preferentes: tasa máxima de conversión (acciones por preferente)', 'Preferred stock: maximum conversion rate (shares per preferred share)'], 'prepayments.deferred_revenue_prepayments_financing_1q27': ['Prepagos de clientes con componente de financiamiento, 1T27', 'Customer prepayments with a financing component, 1Q27'] };
    const label = (path) => NAMED[path] ? NAMED[path][es ? 0 : 1] : path.replace(/^balance_sheet\./, es ? 'Balance: ' : 'Balance sheet: ').replace(/^leases\.cost\./, es ? 'Arrendamientos, costo: ' : 'Leases, cost: ').replace(/^leases\.uncommenced\./, es ? 'Arrendamientos no iniciados: ' : 'Uncommenced leases: ').replace(/^leases\./, es ? 'Arrendamientos: ' : 'Leases: ').replace(/^purchase_obligations\./, es ? 'Obligaciones de compra: ' : 'Purchase obligations: ').replace(/^prepayments\./, es ? 'Prepagos: ' : 'Prepayments: ').replace(/_/g, ' ');
    const badge = (v) => v === 'verified' ? `<span class="badge ok">${es ? 'verificado (XBRL)' : 'verified (XBRL)'}</span>` : v === 'verified_text' ? `<span class="badge ok">${es ? 'texto · segunda lectura' : 'text · second reading'}</span>` : v === 'verified_release' ? `<span class="badge ok">${es ? 'verificado (comunicado)' : 'verified (release)'}</span>` : v === 'verified_tie' ? `<span class="badge ok">${es ? 'verificado (cuadre)' : 'verified (tie-out)'}</span>` : v === 'mismatch' ? `<span class="badge bad">${es ? 'no coincide' : 'mismatch'}</span>` : v === 'needs_review' ? `<span class="badge rev">${es ? 'lectura de texto · revisión' : 'text reading · review'}</span>` : `<span class="badge">${es ? 'sin verificar' : 'unverified'}</span>`;
    const rows = Object.entries(prov).filter(([k]) => !k.startsWith('_')).map(([path, p]) => {
      const s = (OB.sources || {})[p.source] || {}; const noteName = s.notes && s.notes[p.note] ? s.notes[p.note] : p.note;
      const vs = ver.filter((v) => v.path === path || v.path.startsWith(path + '['));
      const val = getPath(OB, path); const vTxt = typeof val === 'boolean' ? (val ? (es ? 'sí' : 'yes') : (es ? 'ninguna identificada' : 'none identified')) : typeof val === 'number' ? (path.endsWith('conversion_rate') ? fmtN(val, 4) : fmtM(val)) : Array.isArray(val) ? `${val.length} ${es ? 'renglones' : 'rows'}` : val && typeof val === 'object' ? (es ? 'bloque de texto' : 'text block') : String(val ?? '—');
      const verdict = vs.length ? (vs.every((v) => v.verdict === 'verified') ? 'verified' : vs.some((v) => v.verdict === 'mismatch') ? 'mismatch' : vs[0].verdict) : (p.text_only ? (p.second_reading && p.second_reading.matches ? 'verified_text' : 'needs_review') : 'unverified');
      const xb = vs.find((v) => v.xbrl) ? vs.find((v) => v.xbrl).xbrl : null; const v0 = vs[0] || {};
      // how the figure is checked when there is no single XBRL fact: an archived-release re-read, a tie-out, or nothing (text)
      const how = v0.method === 'text' && v0.secondReading ? `${es ? 'segunda lectura del texto' : 'second reading of the text'}<span class="sub">${fmtDate(v0.secondReading)}</span>` : v0.method === 'release' && v0.release ? `${es ? 'releído del comunicado 8-K' : 're-read from the 8-K release'}<span class="sub">${fmtM(v0.release.parsed)} · ${v0.release.accession}</span>` : v0.method === 'tie_out' ? `${es ? 'cuadre con los términos del prospecto' : 'tie-out to the prospectus terms'}<span class="sub">${es ? 'no es un dato XBRL' : 'not an XBRL fact'}</span>` : v0.method === 'text' ? `${es ? 'sin concepto XBRL para esta revelación' : 'no XBRL concept exists for this disclosure'}<span class="sub">${es ? 'se mantiene para una segunda lectura' : 'kept for a second reading'}</span>` : null;
      return `<tr><td>${label(path)}</td><td>${vTxt}</td><td class="small">${s.url ? extLink(s.url, (s.title || p.source).replace(/^Oracle /, '')) : p.source}${s.filed ? `<span class="sub">${es ? 'presentado' : 'filed'} ${fmtDate(s.filed)}</span>` : ''}</td><td class="small">${noteName || '—'}</td><td class="small">${p.page != null ? p.page : `<span class="muted" title="${es ? 'reporte en XBRL en línea sin paginación fija; la nota es el ancla' : 'inline-XBRL filing without fixed pagination; the note is the anchor'}">n/p</span>`}</td><td class="mono small">${s.accession || '—'}</td><td class="small">${xb ? `${xb.concept}<span class="sub">${fmtM(xb.value)} · ${xb.form} ${xb.accn}</span>` : how || (p.xbrl ? (Array.isArray(p.xbrl) ? p.xbrl.length + ' ' + (es ? 'conceptos' : 'concepts') : '—') : '—')}</td><td>${badge(verdict)}</td></tr>`;
    });
    html('obProvenance', `<table class="prov"><thead><tr><th>${es ? 'Cifra' : 'Figure'}</th><th>${es ? 'Valor (US$ M)' : 'Value (US$ M)'}</th><th>${es ? 'Reporte' : 'Filing'}</th><th>${es ? 'Nota / sección' : 'Note / section'}</th><th>${es ? 'Pág.' : 'Page'}</th><th>${es ? 'No. de acceso' : 'Accession no.'}</th><th>${es ? 'Verificación XBRL' : 'XBRL check'}</th><th>${es ? 'Estado' : 'Status'}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    const n = { v: ver.filter((v) => /^verified/.test(v.verdict)).length, r: ver.filter((v) => v.verdict === 'needs_review').length, m: ver.filter((v) => v.verdict === 'mismatch').length, u: ver.filter((v) => v.verdict === 'unverified').length };
    el('obProvCap').textContent = es ? `${n.v} cifras verificadas (dato XBRL de la SEC del mismo periodo, comunicado archivado o cuadre con el prospecto), ${n.r} lecturas de texto sin concepto XBRL posible, ${n.m} discrepancias${n.u ? `, ${n.u} sin verificar` : ''}. "n/p" = Oracle presenta XBRL en línea sin paginación fija; el nombre de la nota es el ancla. Los números de nota siguen el orden del 10-K del AF2026 y se releen con cada 10-Q.` : `${n.v} figures verified (the SEC's XBRL value for the same period, the archived release or a tie-out to the prospectus), ${n.r} text readings with no XBRL concept possible, ${n.m} mismatches${n.u ? `, ${n.u} unverified` : ''}. "n/p" = Oracle files inline XBRL without fixed pagination; the note name is the anchor. Note numbers follow the FY2026 10-K order and are re-read with each 10-Q.`;
    html('obProvSrc', `${t('src')}: ${es ? 'reportes enlazados por fila' : 'filings linked per row'} · ${XB ? extLink(XB.source.url, 'SEC XBRL company facts') : ''} · ${es ? 'verificación: cuadre del modelo' : 'verification: the model\'s tie-out run'}${QR && QR.generated ? ` (${fmtET(QR.generated)})` : ''} · ${asOfQ()}`);
  }

  // ================= CIRCULAR FINANCING AND CUSTOMER CONCENTRATION =================
  function renderCircular() {
    if (!el('circTable')) return; const es = LANG === 'es', c = SERIES();
    const U = (BO && BO.unitEconomics) || {}, fm = U.funding_mix || {}, cn = U.concentration || {}, pp = (OB && OB.prepayments) || {};
    const fund = (BO && BO.funding && BO.funding.items) || [];
    const prepayCum = fund.find((f) => /prepay|prepago/i.test(f.en));
    const sites = (BO && BO.sites) || [], oa = openaiTenants(), s10k = obSrc('10k_fy26');
    const def = XB && XB.concepts.deferred_revenue_total ? XB.concepts.deferred_revenue_total.periods.slice(-12) : [];
    const defNC = XB && XB.concepts.deferred_revenue_noncurrent ? XB.concepts.deferred_revenue_noncurrent.periods : [];
    if (def.length) mkChart('chartDeferred', { type: 'bar', data: { labels: def.map((p) => boLabel(p.fiscal)), datasets: [
      { label: es ? 'Ingresos diferidos, corto plazo' : 'Deferred revenue, current', data: def.map((p) => { const nc = defNC.find((x) => x.period_end === p.period_end); return nc ? p.value - nc.value : p.value; }), backgroundColor: c[0], stack: 'a' },
      { label: es ? 'Ingresos diferidos, largo plazo' : 'Deferred revenue, non-current', data: def.map((p) => { const nc = defNC.find((x) => x.period_end === p.period_end); return nc ? nc.value : null; }), backgroundColor: c[3], stack: 'a' },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: US$ ${fmtN(x.parsed.y)} M` } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 30, borderWidth: 0 } } } });
    const last = def[def.length - 1];
    el('circChartCap').textContent = es ? 'US$ millones al cierre de cada trimestre: pasivos por contratos con clientes (ingresos diferidos) del balance, dato XBRL del 10-Q/10-K. Es el efectivo cobrado por adelantado que aún no es ingreso; sube cuando los clientes prepagan capacidad. Es distinto del RPO: el RPO incluye lo contratado y no cobrado.' : 'US$ million at each quarter-end: contract liabilities (deferred revenue) from the balance sheet, XBRL fact of the 10-Q/10-K. It is cash collected in advance that is not yet revenue; it rises when customers prepay capacity. It differs from RPO: RPO includes what is contracted but not yet billed.';
    html('circChartSrc', `${t('src')}: ${XB ? extLink(XB.source.url, 'SEC XBRL (ContractWithCustomerLiability)') : ''} · ${last ? `${es ? 'último' : 'latest'} ${fmtDate(last.period_end)}, ${last.form} ${extLink(last.url, last.accn)}` : ''} · ${asOfQ()}`);
    const sp = obSrc(pp.source);
    const B = { rep: `<span class="badge ok">${es ? 'reportado' : 'reported'}</span>`, co: `<span class="badge">${es ? 'declaración de la empresa, no auditada' : 'company statement, not audited'}</span>`, third: `<span class="badge est">${es ? 'estimación de un tercero' : 'third-party estimate'}</span>`, nd: `<span class="badge rev">${es ? 'no divulgado' : 'not disclosed'}</span>` };
    const rows = [
      [es ? 'Prepagos de clientes con componente de financiamiento, 1T27' : 'Customer prepayments with a significant financing component, 1Q27', pp.deferred_revenue_prepayments_financing_1q27 != null ? fmtBn(pp.deferred_revenue_prepayments_financing_1q27) : '—', B.rep, `${L({ es: pp.text_es, en: pp.text_en }) || ''}`, sp ? extLink(sp.url, es ? '10-Q 1T27, estado de flujos' : '1Q27 10-Q, cash-flow statement') : ''],
      [es ? 'Ingresos diferidos totales (balance)' : 'Total deferred revenue (balance sheet)', last ? fmtBn(last.value) : '—', B.rep, last ? `${fmtDate(last.period_end)} · XBRL` : '', last ? extLink(last.url, `${last.form} ${last.accn}`) : ''],
      [es ? 'Prepagos y contratos con hardware del cliente, acumulado' : 'Prepayments and bring-your-own-hardware contracts, cumulative', prepayCum ? `≈ US$ ${fmtN(prepayCum.usd_bn)} ${es ? 'mil M' : 'bn'}` : '—', B.co, L({ es: fm.split_text_es, en: fm.split_text_en }) || '', prepayCum && prepayCum.sourceRef ? (prepayCum.sourceRef.url ? extLink(prepayCum.sourceRef.url, prepayCum.sourceRef.title) : `${prepayCum.sourceRef.title} <span class="muted">(${es ? 'transcripción de la responsable, no republicada' : 'owner\'s transcript, not republished'}; ${irLink()})</span>`) : irLink()],
      [es ? 'División del RPO: prepagado · hardware del cliente · financiado por Oracle' : 'RPO split: prepaid · bring-your-own-hardware · Oracle-funded', es ? 'no divulgado' : 'not disclosed', B.nd, es ? 'Oracle no divulga la división; sin ella no puede calcularse cuánto capex financia el cliente' : 'Oracle does not disclose the split; without it the customer-funded share of capex cannot be computed', `${s10k ? extLink(s10k.url, es ? '10-K AF2026' : 'FY2026 10-K') : ''} · ${sp ? extLink(sp.url, es ? '10-Q 1T27' : '1Q27 10-Q') : ''} (${es ? 'revisados: sin revelación' : 'searched: no disclosure'})`],
      [es ? 'Clientes con ≥ 10% de los ingresos' : 'Customers at ≥ 10% of revenue', es ? 'ninguno (AF2026)' : 'none (FY2026)', B.rep, L({ es: cn.oracle_text_es, en: cn.oracle_text_en }) || '', cn.source ? extLink(cn.source.url, es ? 'fuente' : 'source') : ''],
      [es ? 'Porción del RPO ligada a OpenAI' : 'Share of RPO tied to OpenAI', es ? '≈ la mitad (S&P)' : '≈ half (S&P)', B.third, L({ es: cn.third_party_text_es, en: cn.third_party_text_en }) || '', cn.source ? extLink(cn.source.url, 'S&P Global Ratings, 9 Jul 2026') : ''],
      [es ? 'Campus nombrados con OpenAI como inquilino' : 'Named campuses with OpenAI as tenant', openaiTenantsText(false), B.co, openaiTenantsText(true), ref('sites')],
      [es ? 'Deuda de proyecto de los desarrolladores' : 'Developers\' project debt', es ? 'de los desarrolladores' : 'the developers\'', `<span class="badge">${es ? 'prensa' : 'press'}</span>`, es ? 'no está en el balance de Oracle; listada por sitio en la sección fuera de balance' : 'not on Oracle\'s balance sheet; listed per site in the off-balance-sheet section', ref('obligations')],
      [es ? 'Inversiones de Oracle en sus clientes o proveedores de IA' : 'Oracle investments in its AI customers or suppliers', es ? 'no divulgadas' : 'not disclosed', B.nd, es ? 'ninguna revelación identificada en el 10-K del AF2026 ni en el 10-Q del 1T27; lectura de texto, revisión pendiente' : 'no disclosure identified in the FY2026 10-K or the 1Q27 10-Q; text reading, review pending', `${s10k ? extLink(s10k.url, es ? '10-K AF2026' : 'FY2026 10-K') : ''} · ${sp ? extLink(sp.url, es ? '10-Q 1T27' : '1Q27 10-Q') : ''} (${es ? 'revisados: sin revelación' : 'searched: no disclosure'})`],
    ];
    html('circTable', `<table class="prov"><thead><tr><th>${es ? 'Concepto' : 'Item'}</th><th>${es ? 'Valor' : 'Value'}</th><th>${es ? 'Base' : 'Basis'}</th><th>${es ? 'Detalle' : 'Detail'}</th><th>${t('src')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td><td>${r[2]}</td><td class="small muted">${r[3]}</td><td class="small">${r[4]}</td></tr>`).join('')}</tbody></table>`);
    el('circTableCap').textContent = es ? 'Cada fila dice si la cifra la reporta Oracle, la declara la administración (no auditada), la estima un tercero o no se divulga. Nada se interpola.' : 'Each row says whether the figure is reported by Oracle, stated by management (not audited), estimated by a third party or not disclosed. Nothing is interpolated.';
    html('circTableSrc', `${t('src')}: ${sp ? extLink(sp.url, '10-Q') : ''} · ${cn.source ? extLink(cn.source.url, 'S&P Global Ratings') : ''} · ${irLink()} · ${asOfQ()}`);
    html('circStats', [
      pp.deferred_revenue_prepayments_financing_1q27 != null && { v: fmtBn(pp.deferred_revenue_prepayments_financing_1q27), l: es ? 'prepagos de clientes cobrados en el 1T27 (10-Q)' : 'customer prepayments collected in 1Q27 (10-Q)' },
      last && { v: fmtBn(last.value), l: `${es ? 'ingresos diferidos al' : 'deferred revenue at'} ${fmtDate(last.period_end)} (XBRL)` },
      prepayCum && { v: `≈ US$ ${fmtN(prepayCum.usd_bn)} ${es ? 'mil M' : 'bn'}`, l: es ? 'prepagos y hardware del cliente, acumulado (llamada 4T26, no auditado)' : 'prepayments and BYOH, cumulative (4Q26 call, not audited)' },
      { v: `${oa.company}/${oa.n}`, l: es ? `campus nombrados con OpenAI como inquilino según la empresa o el desarrollador${oa.press ? `; ${oa.press} más solo por prensa` : ''}` : `named campuses with OpenAI as tenant per the company or the developer${oa.press ? `; ${oa.press} more per press only` : ''}` },
    ].filter(Boolean).map((s) => `<div class="stat"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    const ncn = (U.concentration && U.concentration.named_customers) || null;
    html('circMeta', es ? `El 10-K y el 10-Q de Oracle no nombran a ningún cliente${ncn ? `; el prospecto (FWP) del ${fmtDate(ncn.source.date)} nombra ${ncn.names.length} sin montos` : ''}; la concentración por cliente solo existe como estimación de terceros y se marca así.` : `Oracle's 10-K and 10-Q name no customer${ncn ? `; the ${fmtDate(ncn.source.date)} prospectus (FWP) names ${ncn.names.length} with no amounts` : ''}; customer concentration exists only as third-party estimates and is labeled as such.`);
  }

  // ================= NEWS AND RECENT EVENTS =================
  const nw = { theme: 'all' };
  function renderNews() {
    if (!NEWS || !el('newsList')) return; const es = LANG === 'es';
    const items = (NEWS.items || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const themes = NEWS.themes || [];
    const count = (id) => (id === 'all' ? items.length : items.filter((x) => x.theme === id).length);
    html('newsFilters', [{ id: 'all', es: 'Todos', en: 'All' }, ...themes].map((th) => `<button type="button" class="chip ${nw.theme === th.id ? 'active' : ''}" data-theme="${th.id}">${L(th)} <span class="muted">${count(th.id)}</span></button>`).join(''));
    el('newsFilters').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { nw.theme = b.dataset.theme; renderNews(); }));
    const tierLabel = { sec: es ? 'SEC' : 'SEC', company: es ? 'Oracle' : 'Oracle', agency: es ? 'agencia' : 'agency', wire: es ? 'cable' : 'wire', press: es ? 'prensa' : 'press', trade: es ? 'prensa especializada' : 'trade press' };
    const basis = (x) => x.basis === 'sec' ? `<span class="badge ok">${es ? 'reporte a la SEC' : 'SEC filing'}</span>` : x.basis === 'company' ? `<span class="badge">${es ? 'declaración de la empresa, no auditada' : 'company statement, not audited'}</span>` : x.basis === 'agency' ? `<span class="badge">${es ? 'agencia calificadora' : 'rating agency'}</span>` : `<span class="badge est">${es ? 'prensa' : 'press'}</span>`;
    const themeOf = (id) => { const th = themes.find((x) => x.id === id); return th ? L(th) : id; };
    const vis = items.filter((x) => nw.theme === 'all' || x.theme === nw.theme);
    html('newsList', vis.length ? vis.map((x) => `<article class="news-item"><div class="when"><b>${fmtDate(x.date)}</b><span class="theme"><span class="badge">${themeOf(x.theme)}</span></span><span class="theme">${basis(x)}</span></div><div><h4>${L({ es: x.title_es, en: x.title_en })}</h4><p>${L({ es: x.summary_es, en: x.summary_en })}</p><p><b>${es ? 'Por qué importa.' : 'Why it matters.'}</b> ${resolveRefs(L({ es: x.why_es, en: x.why_en }))}</p><div class="srcs">${t('src')}: ${(x.sources || []).map((s) => `<span class="badge">${tierLabel[s.tier] || s.tier}</span> ${extLink(s.url, s.title)}${s.accession ? ` <span class="mono">${s.accession}</span>` : ''}`).join('<br>')}</div></div></article>`).join('') : `<p class="muted">${es ? 'Sin eventos en este tema.' : 'No events under this theme.'}</p>`);
    const latest = items.length ? items[0].date : null; const oneDay = latest && addDays(latest, 1) === NEWS.asOf; const gapTxt = latest && NEWS.asOf > latest ? (es ? ` El barrido del ${fmtDate(NEWS.asOf)} no encontró ningún evento ${oneDay ? `el ${fmtDate(NEWS.asOf)}` : `entre el ${fmtDate(addDays(latest, 1))} y el ${fmtDate(NEWS.asOf)}`} que cumpla las reglas (reporte a la SEC, comunicado de Oracle, agencia o cable).` : ` The ${fmtDate(NEWS.asOf)} sweep found no event ${oneDay ? `on ${fmtDate(NEWS.asOf)}` : `between ${fmtDate(addDays(latest, 1))} and ${fmtDate(NEWS.asOf)}`} that met the rules (SEC filing, Oracle release, agency or wire).`) : '';
    html('newsMeta', (es ? `${items.length} eventos de los últimos ${NEWS.windowDays} días · barrido al ${fmtDate(NEWS.asOf)} · fuentes primarias primero (SEC, Oracle, agencias), luego cables y prensa.` : `${items.length} events from the last ${NEWS.windowDays} days · swept ${fmtDate(NEWS.asOf)} · primary sources first (SEC, Oracle, agencies), then wires and press.`) + gapTxt + (NEWS.sweepNote && (!NEWS.sweepNote.date || NEWS.sweepNote.date === NEWS.asOf) ? ` ${L(NEWS.sweepNote)}` : ''));
    html('newsSrc', `${t('src')}: ${es ? 'enlaces en cada evento' : 'links on each event'} · ${extLink('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001341439', 'SEC EDGAR')} · ${irLink()} · ${es ? 'barrido diario (rutina en la nube) al' : 'daily sweep (cloud routine) as of'} ${fmtDate(NEWS.asOf)}`);
  }

  // ================= RISKS =================
  function renderRisks() {
    if (!RK || !el('risksTable')) return; const es = LANG === 'es';
    html('risksTable', `<table class="risks"><thead><tr><th>${es ? 'Riesgo' : 'Risk'}</th><th>${es ? 'Evidencia pública' : 'Public evidence'}</th><th>${es ? 'Dónde' : 'Where'}</th><th>${es ? 'Qué observar' : 'What to watch'}</th><th>${t('src')}</th></tr></thead><tbody>${(RK.items || []).map((r) => `<tr><td><b>${L(r)}</b></td><td class="small">${resolveRefs(L({ es: r.evidence_es, en: r.evidence_en }))}${(r.notes || []).map((n) => `<span class="rnote"><span class="badge ${n.kind === 'press' ? 'est' : 'rev'}">${n.kind === 'press' ? (es ? 'prensa' : 'press') : n.kind} · ${fmtDate(n.date)}${daysSince(n.date) > 30 ? ` · ${es ? `hace ${daysSince(n.date)} días` : `${daysSince(n.date)} days old`}` : ''}</span> ${L(n)}</span>`).join('')}</td><td class="small">${(r.where || []).map(ref).join('<br>')}</td><td class="small">${L({ es: r.watch_es, en: r.watch_en })}</td><td class="small">${r.source ? extLink(r.source.url, r.source.title) : ''}</td></tr>`).join('')}</tbody></table>`);
    html('risksMeta', es ? `Registro revisado el ${fmtDate(RK.updated)}; cada riesgo cita la cifra o el reporte que lo sustenta.` : `Register reviewed ${fmtDate(RK.updated)}; each risk cites the figure or filing behind it.`);
    html('risksSrc', `${t('src')}: ${es ? 'enlaces por fila' : 'links per row'} · ${relLink()} · ${asOfQ()}`);
  }

  // ================= METHODOLOGY: module status and change log =================
  function renderModules() {
    if (!el('modulesTable')) return; const es = LANG === 'es';
    const mods = Object.keys((SEC.freshness && SEC.freshness.modules) || {}).map(moduleStatus);
    html('modulesTable', `<table><thead><tr><th>${es ? 'Módulo' : 'Module'}</th><th>${es ? 'Corte' : 'As of'}</th><th>${es ? 'Datos obtenidos (ET)' : 'Data fetched (ET)'}</th><th>${es ? 'Regla' : 'Rule'}</th><th>${es ? 'Estado' : 'Status'}</th></tr></thead><tbody>${mods.map((m) => `<tr><td>${m.label}${m.textDerived ? ` <span class="badge rev" title="${es ? 'cifras tomadas de texto: revisión pendiente hasta confirmarlas' : 'text-derived figures: needs review until confirmed'}">${es ? 'texto' : 'text'}</span>` : ''}</td><td>${m.asOf ? fmtDate(m.asOf) : '—'}</td><td class="small">${fmtET(m.refreshed)}</td><td class="small muted">${m.cadence === 'filing' ? (m.nextExpected ? `${es ? 'siguiente reporte' : 'next filing'} ${fmtDate(m.nextExpected.date)} (${m.nextExpected.basis === 'confirmed' ? (es ? 'confirmado' : 'confirmed') : (es ? 'supuesto' : 'assumed')}) + ${(SEC.freshness && SEC.freshness.grace_days) || 7} ${es ? 'días' : 'days'}` : (es ? 'por reporte' : 'per filing')) : `${es ? 'diario · máx.' : 'daily · max'} ${m.maxAgeDays} ${es ? 'días' : 'days'}`}</td><td>${m.pending ? `<span class="badge rev">${es ? 'pendiente' : 'pending'}</span> <span class="small muted">${es ? 'sin datos todavía' : 'no data yet'}</span>` : m.stale ? `<span class="stale">${es ? 'DESACTUALIZADO' : 'STALE'}</span> <span class="small muted">${m.reason || ''}</span>` : `<span class="badge ok">${es ? 'vigente' : 'current'}</span>`}</td></tr>`).join('')}</tbody></table>`);
    html('modulesSrc', `${es ? 'Página actualizada' : 'Page refreshed'} ${fmtET(REFRESHED_AT)} · ${es ? 'reglas de vigencia por módulo, evaluadas en el servidor y de nuevo en su navegador' : 'freshness rules per module, evaluated on the server and again in your browser'} · ${QR && QR.generated ? `${es ? 'última validación' : 'last validation'} ${fmtET(QR.generated)}` : ''} · ${es ? 'detalle técnico en la' : 'technical detail on the'} <a href="quality.html">${es ? 'página de calidad de datos' : 'data-quality page'}</a>`);
  }
  function renderChangelog() {
    if (!CL || !el('changelogTable')) return; const es = LANG === 'es';
    const all = CL.entries || [];
    // meaningful = a data value a reader would act on: statements, guidance, buildout, obligations, consensus, reference facts, news,
    // risks and the summary; not XBRL re-tags, registry edits, stamps, URLs, accession strings or "(more)" markers
    const FILES = { 'financials.js': 1, 'guidance.js': 1, 'buildout.js': 1, 'obligations.js': 1, 'factset.js': 1, 'reference.js': 1, 'news.js': 1, 'risks.js': 1, 'summary.js': 1, 'market.js': 1, 'peers.js': 1, 'calendar.js': 1 };
    const noise = /(^|\.)(generatedAt|generated|fetched|updated|updatedAt|asOf|as_of|priceDate|price_date|accessed|issues_checked|_comment|url|accn|accession|form|filed|superseded|sourceRef|short|title|text|note|notes|key|id)(\[|\.|$)|\(more\)|\(file\)|\.length$|_en$|_es$|\.(en|es)$/;
    const meaningful = all.filter((e) => FILES[e.file] && !noise.test(e.path) && !(typeof e.new === 'string' && /^\(text/.test(e.new)));
    const byBuild = new Map(); for (const e of meaningful) { const k = e.at; if (!byBuild.has(k)) byBuild.set(k, []); byBuild.get(k).push(e); }
    const builds = [...byBuild.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 25);
    const fmtV = (v) => (v == null ? '—' : typeof v === 'number' ? fmtN(v, Math.abs(v) < 10 ? 2 : 0) : String(v).length > 48 ? String(v).slice(0, 45) + '…' : String(v));
    const fileLabel = (f) => ({ 'financials.js': es ? 'estados financieros' : 'statements', 'guidance.js': es ? 'guía' : 'guidance', 'buildout.js': es ? 'expansión y sitios' : 'buildout and sites', 'obligations.js': es ? 'fuera de balance' : 'off-balance-sheet', 'factset.js': es ? 'consenso FactSet' : 'FactSet consensus', 'reference.js': es ? 'hechos de referencia' : 'reference facts', 'news.js': es ? 'noticias' : 'news', 'risks.js': es ? 'riesgos' : 'risks', 'summary.js': es ? 'resumen' : 'summary', 'market.js': es ? 'mercado' : 'market', 'peers.js': es ? 'pares' : 'peers', 'calendar.js': es ? 'calendario' : 'calendar' })[f] || f;
    html('changelogTable', builds.length ? `<table class="chg"><thead><tr><th>${es ? 'Cuándo (ET)' : 'When (ET)'}</th><th>${es ? 'Qué cambió' : 'What changed'}</th><th>${es ? 'Ejemplos (dato: antes → después)' : 'Examples (leaf: before → after)'}</th></tr></thead><tbody>${builds.map(([at, ents]) => { const files = [...new Set(ents.map((e) => e.file))]; return `<tr><td class="small">${fmtET(at)}</td><td class="small">${files.map((f) => `<b>${fileLabel(f)}</b> (${ents.filter((e) => e.file === f).length})`).join(' · ')}</td><td class="small">${ents.slice(0, 4).map((e) => `<span class="mono">${e.path.replace(/^concepts\./, '')}</span>: ${fmtV(e.old)} → <b>${fmtV(e.new)}</b>`).join('<br>')}${ents.length > 4 ? `<br><span class="muted">+${ents.length - 4}</span>` : ''}</td></tr>`; }).join('')}</tbody></table>` : `<p class="muted small">${es ? 'Sin cambios de datos registrados todavía.' : 'No data changes recorded yet.'}</p>`);
    el('changelogCap').textContent = es ? `${meaningful.length} cambios de datos en ${builds.length} ${builds.length === 1 ? 'actualización' : 'actualizaciones'} entre las ${all.length} hojas cambiadas que guarda la bitácora (las últimas 600); se omiten las re-etiquetas XBRL, las marcas de tiempo, los enlaces y los textos. La tabla en bruto de abajo muestra las ${Math.min(all.length, 250)} más recientes de esas ${all.length}; la bitácora completa está en la página de calidad de datos.` : `${meaningful.length} data changes across ${builds.length} ${builds.length === 1 ? 'refresh' : 'refreshes'}, out of the ${all.length} changed leaves the log keeps (the last 600); XBRL re-tags, timestamps, links and text blocks are left out. The raw table below shows the latest ${Math.min(all.length, 250)} of those ${all.length}; the full log is on the data-quality page.`;
    const raw = el('changelogRaw'), wrap = el('changelogRawWrap');
    if (raw && wrap) {
      const n = Math.min(all.length, 250);
      const sum = wrap.querySelector('summary'); if (sum) sum.innerHTML = es ? `Diferencias en bruto: las ${n} hojas cambiadas más recientes de ${all.length} (se cargan al abrir)` : `Raw differences: the latest ${n} of ${all.length} changed leaves (rendered when opened)`;
      const draw = () => { raw.innerHTML = `<table class="chg"><thead><tr><th>${es ? 'Cuándo (ET)' : 'When (ET)'}</th><th>${es ? 'Archivo' : 'File'}</th><th>${es ? 'Dato' : 'Leaf'}</th><th>${es ? 'Antes' : 'Before'}</th><th>${es ? 'Después' : 'After'}</th></tr></thead><tbody>${all.slice(0, 250).map((e) => `<tr><td class="small">${fmtET(e.at)}</td><td class="mono">${e.file}</td><td class="mono small">${e.path}</td><td class="small">${fmtV(e.old)}</td><td class="small"><b>${fmtV(e.new)}</b></td></tr>`).join('')}</tbody></table>`; };
      raw.innerHTML = ''; wrap.open = false;
      if (!wrap.dataset.wired) { wrap.dataset.wired = '1'; wrap.addEventListener('toggle', () => { if (wrap.open && !raw.firstChild) renderChangelog.draw(); }); }
      renderChangelog.draw = draw;
    }
    html('changelogSrc', `${es ? 'Bitácora escrita por el generador de datos en cada actualización' : 'Log written by the data builder on every refresh'} · <a href="quality.html">quality.html</a>`);
  }
  // ---- collapse / expand per section (remembered in this browser only) and a back-to-top control ----
  // Sections are collapsed by default except the Summary (owner's rule, 2026-10-04: a phone reader faced a 97,000 px page);
  // the set of OPEN sections is remembered in this browser; reading paths and deep links add to it.
  const OPEN_KEY = 'orcl-open-v2';
  let openSet = (() => { try { const v = localStorage.getItem(OPEN_KEY); return v ? new Set(JSON.parse(v)) : null; } catch (e) { return null; } })();
  if (!openSet) { openSet = new Set(secList().filter((s) => (s.path || []).includes(5)).map((s) => s.id)); openSet.add('summary'); }
  { const h0 = location.hash.replace('#', ''); if (h0 && secList().some((s) => s.id === h0)) openSet.add(h0); }
  const collapsed = { has: (id) => !openSet.has(id), add: (id) => openSet.delete(id), delete: (id) => openSet.add(id), clear: () => secList().forEach((s) => openSet.add(s.id)) };
  const saveCollapsed = () => { try { localStorage.setItem(OPEN_KEY, JSON.stringify([...openSet])); } catch (e) { /* ignore */ } };
  function applyCollapse() {
    const es = LANG === 'es';
    for (const sec of document.querySelectorAll('section.block[data-sec]')) {
      const id = sec.dataset.sec; if (id === 'summary') continue;
      const head = sec.querySelector('.sec-head'); if (!head) continue;
      let b = head.querySelector('.sec-toggle');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'sec-toggle'; const h2 = head.querySelector('h2'); (h2 || head.lastChild).insertAdjacentElement('afterend', b); b.addEventListener('click', () => { if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id); saveCollapsed(); applyCollapse(); }); }
      const c = collapsed.has(id) && !PRINT; sec.classList.toggle('collapsed', c);
      b.textContent = c ? (es ? '▸ Mostrar' : '▸ Show') : (es ? '▾ Ocultar' : '▾ Hide'); b.setAttribute('aria-expanded', String(!c));
      b.title = c ? (es ? 'Mostrar esta sección' : 'Show this section') : (es ? 'Ocultar esta sección' : 'Hide this section');
    }
    const all = el('btnCollapseAll'); if (all) { const anyOpen = [...document.querySelectorAll('section.block[data-sec]')].some((x) => x.dataset.sec !== 'summary' && !x.classList.contains('collapsed')); all.textContent = anyOpen ? (es ? 'Ocultar todo' : 'Collapse all') : (es ? 'Mostrar todo' : 'Expand all'); all.dataset.mode = anyOpen ? 'collapse' : 'expand'; }
    renderPaths(); markWideTables();
  }
  function wireNav() {
    const navLinks = [...document.querySelectorAll('nav.jump a')];
    const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (wireNav.io) wireNav.io.disconnect();
    wireNav.io = new IntersectionObserver((entries) => { entries.forEach((en) => { if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); }); }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((s2) => wireNav.io.observe(s2));
    // a jump to a collapsed section opens it
    navLinks.forEach((a) => { if (a.dataset.wired) return; a.dataset.wired = '1'; a.addEventListener('click', () => { const id = a.getAttribute('href').slice(1); if (collapsed.has(id)) { collapsed.delete(id); saveCollapsed(); applyCollapse(); } }); });
  }

  // ================= ROUND 2 (2026-10-04): verdict, chain, section leads, reading paths, new analyses, glossary =================
  const HYP = window.HYP_FIN || null;
  const spRating = () => ((REF.debt && REF.debt.ratings) || []).find((r) => /S&P/.test(r.agency)) || null;
  const dcfNow = () => { try { const s = dcfState.s || dcfFromUrl(dcfDefaults()); return s ? { s, r: dcfCompute(s) } : null; } catch (e) { return null; } };
  const uncVerdict = () => { const v = QR && (QR.obligationsVerification || []).find((x) => x.path === 'leases.uncommenced.usd_bn'); return v ? v.verdict : 'needs_review'; };
  const uncBadge = () => { const es = LANG === 'es'; const v = uncVerdict(); return v === 'verified_text' ? `<span class="badge ok" title="${uncNote().replace(/"/g, '&quot;')}">${es ? 'texto · segunda lectura' : 'text · second reading'}</span>` : `<span class="badge rev">${es ? 'texto · revisión pendiente' : 'text · needs review'}</span>`; };
  // the one-line explanation behind the "text · second reading" badge: what was read, when, and why no XBRL check exists
  const uncNote = () => { const es = LANG === 'es'; const sr = (OB && OB.leases && OB.leases.uncommenced && OB.leases.uncommenced.second_reading) || null; if (!sr) return ''; const xs = sr.xbrl_search; return `${es ? `segunda lectura de la nota de arrendamientos del 10-Q (${fmtDate(sr.date)})` : `second reading of the 10-Q leases note (${fmtDate(sr.date)})`}${xs ? `; ${es ? `ningún concepto XBRL la lleva (API de datos de la SEC, ${fmtDate(xs.date)})` : `no XBRL concept carries it (SEC company-facts API, ${fmtDate(xs.date)})`}` : ''}`; };
  // ---- one source of truth for facts quoted in more than one place (summary, circularity, risks, deck). {{fact:id}} in the
  // JSON narrative resolves here, so a count can never be typed twice. tenant_openai / tenant_basis come from buildout.json.
  const openaiTenants = () => { const sites = (BO && BO.sites) || []; const co = sites.filter((x) => x.tenant_openai && x.tenant_basis === 'company'), pr = sites.filter((x) => x.tenant_openai && x.tenant_basis === 'press'); return { n: sites.length, company: co.length, press: pr.length, pressNames: pr.map((x) => x.short || x.name) }; };
  const openaiTenantsText = (long) => { const o = openaiTenants(); const es = LANG === 'es'; if (!o.n) return ''; if (!long) return `${o.company} ${es ? 'de' : 'of'} ${o.n}`; const pressPart = o.press ? (es ? `; ${o.press === 1 ? 'el otro' : `otros ${o.press}`} (${o.pressNames.join(', ')}) solo según la prensa: Oracle no ha nombrado al cliente` : `; the other ${o.press === 1 ? 'one' : o.press} (${o.pressNames.join(', ')}) only per the press: Oracle has not named the customer`) : ''; return es ? `${o.company} de los ${o.n} campus nombrados tienen a OpenAI como inquilino según Oracle o el comunicado del desarrollador${pressPart}.` : `${o.company} of the ${o.n} named campuses list OpenAI as tenant per Oracle's or the developer's own release${pressPart}.`; };
  const FACTS = { openai_campuses: () => openaiTenantsText(true) };
  const factText = (id) => (FACTS[id] ? FACTS[id]() : '');
  // the lessor guarantee's status, composed once for the commitments table, the three views, the disclosure sentence and the deck
  function guaranteeStatus() { const ga = (OB && OB.guarantees) || {}; if (!ga.disclosed || ga.usd_m == null) return null; const [my, mm] = String(ga.matures || '').split('-').map(Number); const matEnd = my && mm ? new Date(Date.UTC(my, mm, 0)).toISOString().slice(0, 10) : null; const passed = !!(matEnd && todayET() > matEnd); const es = LANG === 'es'; const mon = fmtMonth(ga.matures); return { ga, matEnd, passed, mon, short: passed ? (es ? `vencimiento programado ${mon}, ya pasado; liberación aún no reportada` : `scheduled maturity ${mon} has passed; release not yet reported`) : (es ? `vence en ${mon}` : `matures ${mon}`) }; }
  // matured instruments: repaid (with the 10-Q evidence from the reference file) or still awaiting the next 10-Q
  function maturedNote() { const es = LANG === 'es'; const today = todayET(); const ins = ((REF.debt && REF.debt.instruments) || []).filter((i) => i.matures && i.matures < today); if (!ins.length) return ''; const paid = ins.filter((i) => i.repaid), open = ins.filter((i) => !i.repaid); const sum = (a) => a.reduce((x, i) => x + (i.principalUsdM || 0), 0); const parts = []; if (paid.length) { const rp = paid[0].repaid, ev = rp.evidence || {}; const xq = ev.xbrl && XB && XB.concepts[ev.xbrl] ? (XB.concepts[ev.xbrl].quarters || []).find((x) => x.quarter === rp.quarter) : null; const amt = xq ? xq.value : ev.xbrl_value_usd_m; parts.push(es ? `${paid.length === 1 ? 'el bono vencido' : `los ${paid.length} bonos vencidos`} desde el 31 de mayo de 2026 (US$ ${fmtN(sum(paid))} M, ${paid.map((i) => fmtDate(i.matures)).join(', ')}) ${paid.length === 1 ? 'fue pagado' : 'fueron pagados'}: el 10-Q del ${boLabel(rp.quarter)} reporta US$ ${fmtN(amt)} M de pagos de préstamos en el trimestre${ev.xbrl_concept ? ` (XBRL ${ev.xbrl_concept})` : ''}; el 10-Q no desglosa este bono: su pago se infiere de esa línea y de la caída de las notas por pagar (${ev.url ? extLink(ev.url, '10-Q 1T27') : '10-Q'})` : `the ${paid.length === 1 ? 'note' : `${paid.length} notes`} matured since 31 May 2026 (US$ ${fmtN(sum(paid))} M, ${paid.map((i) => fmtDate(i.matures)).join(', ')}) ${paid.length === 1 ? 'was' : 'were'} repaid: the ${boLabel(rp.quarter)} 10-Q reports US$ ${fmtN(amt)} M of debt repayments in the quarter${ev.xbrl_concept ? ` (XBRL ${ev.xbrl_concept})` : ''}; the 10-Q does not itemize this note: its repayment is inferred from that line and the fall in notes payable (${ev.url ? extLink(ev.url, es ? '10-Q 1T27' : '1Q27 10-Q') : '10-Q'})`); } if (open.length) parts.push(es ? `${open.length} vencido(s) (US$ ${fmtN(sum(open))} M) esperan la confirmación de pago del siguiente 10-Q` : `${open.length} matured (US$ ${fmtN(sum(open))} M) await the next 10-Q's confirmation of repayment`); return parts.join('; '); }
  const capexGuideNow = () => { const fyNow = lastQ ? lastQ.fy : null; const gv = GV.slice().reverse().find((v) => v.items && v.items.fyCapexNote && v.fyGuided === fyNow); const g = gv ? parseCapexGuide(gv.items.fyCapexNote) : null; return g && g.lo != null ? { ...g, fy: fyNow, v: gv } : null; };
  const sitesMw = () => { const sites = (BO && BO.sites) || []; return { n: sites.length, live: sites.reduce((a, x) => a + (x.energized_mw || 0), 0), plan: sites.reduce((a, x) => a + (x.nameplate_mw || x.capacity_mw || 0), 0) }; };
  // ---- the chain: six numbers from contracts to valuation, each linking to its section (replaces the five-tile panel)
  function chainBoxes() {
    if (!lastQ) return []; const es = LANG === 'es';
    const rr = BO && BO.rpoRecognition && BO.rpoRecognition.series ? BO.rpoRecognition.series.slice(-1)[0] : null;
    const mw = sitesMw(); const cg = capexGuideNow(); const OBj = OB || {}; const un = (OBj.leases && OBj.leases.uncommenced) || {}; const fp = OBj.funding_plan || {};
    const S = obligStats(); const sp = spRating(); const d = dcfNow(); const price = dcfPrice();
    const boxes = [
      { k: es ? 'Contratos' : 'Contracts', v: lastQ.kpi.rpo != null ? fmtBn(lastQ.kpi.rpo, 0) : '—', d: `RPO ${qLabel(lastQ)}${rr ? ` · ${rr.m12_pct}% ${es ? 'en 12 meses' : 'within 12 months'}` : ''}`, r: 'rpo' },
      { k: es ? 'Capacidad' : 'Capacity', v: `${fmtN(mw.live)} MW ${es ? 'de' : 'of'} ${fmtN(mw.plan / 1000, 1)} GW`, d: es ? `energizados en los ${mw.n} campus nombrados` : `energized at the ${mw.n} named campuses`, r: 'sites' },
      { k: 'Capex', v: cg ? `US$ ${fmtN(cg.lo)}–${fmtN(cg.hi)} ${es ? 'mil M' : 'bn'}` : '—', d: cg ? (es ? `bruto ${fyLabel(cg.fy)} · neto ≤ US$ ${fmtN(cg.netMax)} mil M (guía)` : `gross ${fyLabel(cg.fy)} · net ≤ US$ ${fmtN(cg.netMax)} bn (guide)`) : '', r: 'capex' },
      { k: es ? 'Financiamiento' : 'Funding', v: fp.remaining_fy27_usd_bn != null ? `US$ ${fmtN(fp.remaining_fy27_usd_bn, 1)} ${es ? 'mil M' : 'bn'}` : '—', d: `${es ? 'brecha por levantar (empresa)' : 'gap still to raise (company)'}${un.usd_bn != null ? ` · US$ ${fmtN(un.usd_bn, 0)} ${es ? 'mil M de arrendamientos no iniciados' : 'bn of uncommenced leases'} ${uncBadge()}` : ''}`, r: 'financing' },
      { k: es ? 'Crédito' : 'Credit', v: sp ? sp.rating : '—', d: `${sp ? `S&P · ${fmtDate(sp.date)}` : ''}${S ? ` · ${fmtX(S.leaseAdj, 1)} ${es ? 'ajustado por arrendamientos' : 'lease-adjusted'}` : ''}`, r: 'credit' },
      { k: es ? 'Valuación' : 'Valuation', v: d && d.r && d.r.perShare != null ? `US$ ${fmtN(d.r.perShare, 0)} ${es ? 'vs' : 'vs'} US$ ${fmtN(price, 2)}` : '—', d: d ? `DCF ${presetLabel(d.s.preset)} · ${d.r && d.r.perShare != null && price ? `${fmtPct(100 * (d.r.perShare / price - 1), 0, true)} ` : ''}${es ? 'vs cierre' : 'vs close'} ${fmtDate(lastPx[0])}` : '', r: 'dcf' },
    ];
    return boxes;
  }
  function renderChain() { if (!el('sumChain')) return; html('sumChain', chainBoxes().map((x) => `<a class="box" href="#${x.r}"><div class="k">${x.k}</div><div class="v">${x.v}</div><div class="d">${x.d}</div></a>`).join('')); }
  // ---- the verdict: one paragraph composed from the same figures as the chain
  function verdictHtml() {
    if (!lastQ) return ''; const es = LANG === 'es';
    const rr = BO && BO.rpoRecognition && BO.rpoRecognition.series ? BO.rpoRecognition.series.slice(-1)[0] : null;
    const mw = sitesMw(); const cg = capexGuideNow(); const OBj = OB || {}; const un = (OBj.leases && OBj.leases.uncommenced) || {}; const fp = OBj.funding_plan || {};
    const S = obligStats(); const sp = spRating(); const d = dcfNow(); const price = dcfPrice();
    const atm = ((fp.items || []).filter((x) => x.kind === 'done' && /ATM|at-the-market/i.test(x.en)).slice(-1)[0] || {}).usd_bn;
    const base = d ? dcfDefaults() : null; const E = base ? Math.min(DCF_EDIT_YEARS, base.N) : 0;
    const g2 = base ? base.revG[1] : null, mT = base ? base.margin[E - 1] - base.sbc : null;
    const pn = d && price ? priceNeeds(d.s, price) : null, sr = d ? scenarioRange(d.s) : null, cl = bridgeClaims();
    const reachEs = pn && pn.reach.length ? `; ${reachClause(pn)}` : '', reachEn = reachEs;
    const swings = sr ? [['lease', sr.leaseSwing], ['bear', sr.bearSwing], ['wacc', sr.waccSwing], ['tax', sr.taxSwing]].filter((x) => x[1] != null && isFinite(x[1])).sort((x, y) => y[1] - x[1]) : [];
    const leaseTop = swings.length && swings[0][0] === 'lease';
    const rangeEs = sr ? ` <span class="vh">Rango.</span>Pesimista <b>US$ ${fmtN(sr.bear, 0)}</b> · Base <b>US$ ${fmtN(sr.base, 0)}</b> · Optimista <b>US$ ${fmtN(sr.bull, 0)}</b> (objetivo de la administración US$ ${fmtN(sr.mgmt, 0)}); tratar los US$ ${fmtN(un.usd_bn, 0)} mil M de arrendamientos no iniciados como financieros lleva el base a <b>US$ ${fmtN(sr.leaseFin, 0)}</b> (US$ ${fmtN(sr.leaseMix, 0)} con la mezcla operativo/financiero divulgada, ${fmtPct(100 * (cl.finShare || 0), 0)} financieros), ${leaseTop ? 'el supuesto individual que más mueve el valor' : 'el segundo supuesto que más mueve el valor'}; la cifra de arriba usa el tratamiento ${leaseLabel(d.s.leases)} (${ref('dcf')}).` : '';
    const rangeEn = sr ? ` <span class="vh">Range.</span>Bear <b>US$ ${fmtN(sr.bear, 0)}</b> · Base <b>US$ ${fmtN(sr.base, 0)}</b> · Bull <b>US$ ${fmtN(sr.bull, 0)}</b> (management target US$ ${fmtN(sr.mgmt, 0)}); treating the US$ ${fmtN(un.usd_bn, 0)} bn of uncommenced leases as finance leases takes the Base to <b>US$ ${fmtN(sr.leaseFin, 0)}</b> (US$ ${fmtN(sr.leaseMix, 0)} on the disclosed operating/finance mix, ${fmtPct(100 * (cl.finShare || 0), 0)} finance), ${leaseTop ? 'the single assumption that moves the value most' : 'the second-largest single assumption'}; the figure above uses the ${leaseLabel(d.s.leases)} treatment (${ref('dcf')}).` : '';
    const rpoBn = lastQ.kpi.rpo != null ? fmtN(lastQ.kpi.rpo / 1000, 0) : '—';
    const txt = es
      ? `<span class="vh">Qué suman los números.</span>Oracle tiene contratados <b>US$ ${rpoBn} mil M</b> de ingresos futuros (RPO, ${qLabel(lastQ)})${rr ? `, de los que <b>${rr.m12_pct}%</b> se reconocen en doce meses` : ''}, frente a <b>${fmtN(mw.live)} MW energizados de los ${fmtN(mw.plan / 1000, 1)} GW</b> que ha nombrado. Convertir el resto exige el capex del ${cg ? fyLabel(cg.fy) : '—'}${cg ? ` de <b>US$ ${fmtN(cg.lo)}–${fmtN(cg.hi)} mil M brutos</b> (≤ US$ ${fmtN(cg.netMax)} mil M netos de prepagos)` : ''}, financiado con ${atm != null ? `US$ ${fmtN(atm, 1)} mil M de capital ya levantados, ` : ''}${fp.remaining_fy27_usd_bn != null ? `<b>US$ ${fmtN(fp.remaining_fy27_usd_bn, 1)} mil M por levantar</b> (cifra de la empresa) ` : ''}y <b>US$ ${fmtN(un.usd_bn, 0)} mil M de arrendamientos</b> que aún no están en el balance. Los acreedores ven <b>${sp ? sp.rating : '—'}</b> (S&P, ${sp ? fmtDate(sp.date) : '—'})${S ? ` y <b>${fmtX(S.leaseAdj, 1)}</b> de deuda neta ajustada por arrendamientos sobre EBITDAR` : ''}. Sobre el consenso de FactSet, que ya supone un crecimiento de ingresos de ${g2 != null ? fmtPct(g2, 0, true) : '—'} en el ${base ? fyLabel(base.years[1]) : '—'} y un margen EBITDA de ${mT != null ? fmtPct(mT, 0) : '—'} después de compensación en acciones mantenido para siempre, el DCF devuelve <b>US$ ${d && d.r ? fmtN(d.r.perShare, 0) : '—'} por acción frente a US$ ${fmtN(price, 2)}${d && d.r && d.r.perShare != null ? ` (${fmtPct(100 * (d.r.perShare / price - 1), 0, true)})` : ''}</b>${pn && pn.iw != null ? `: el precio necesita una WACC de cerca de ${fmtPct(100 * pn.iw, 1)} (beta ${fmtN(pn.ib, 2)}${reachEs}) o más margen o más crecimiento que el consenso` : ''}.${rangeEs}`
      : `<span class="vh">What the numbers add up to.</span>Oracle has contracted <b>US$ ${rpoBn} bn</b> of future revenue (RPO, ${qLabel(lastQ)})${rr ? `, of which <b>${rr.m12_pct}%</b> is recognised within twelve months` : ''}, against <b>${fmtN(mw.live)} MW energized of the ${fmtN(mw.plan / 1000, 1)} GW</b> it has named. Converting the rest needs the ${cg ? fyLabel(cg.fy) : '—'} capex${cg ? ` of <b>US$ ${fmtN(cg.lo)}–${fmtN(cg.hi)} bn gross</b> (≤ US$ ${fmtN(cg.netMax)} bn net of prepayments)` : ''}, funded by ${atm != null ? `US$ ${fmtN(atm, 1)} bn of equity already raised, ` : ''}${fp.remaining_fy27_usd_bn != null ? `<b>US$ ${fmtN(fp.remaining_fy27_usd_bn, 1)} bn still to raise</b> (the company's figure) ` : ''}and <b>US$ ${fmtN(un.usd_bn, 0)} bn of leases</b> not yet on the balance sheet. Creditors see <b>${sp ? sp.rating : '—'}</b> (S&P, ${sp ? fmtDate(sp.date) : '—'})${S ? ` and <b>${fmtX(S.leaseAdj, 1)}</b> lease-adjusted net debt to EBITDAR` : ''}. On FactSet consensus, which already assumes ${g2 != null ? fmtPct(g2, 0, true) : '—'} revenue growth in ${base ? fyLabel(base.years[1]) : '—'} and a ${mT != null ? fmtPct(mT, 0) : '—'} EBITDA margin after stock-based compensation held forever, the DCF returns <b>US$ ${d && d.r ? fmtN(d.r.perShare, 0) : '—'} per share against US$ ${fmtN(price, 2)}${d && d.r && d.r.perShare != null ? ` (${fmtPct(100 * (d.r.perShare / price - 1), 0, true)})` : ''}</b>${pn && pn.iw != null ? `: the price needs a WACC of about ${fmtPct(100 * pn.iw, 1)} (beta ${fmtN(pn.ib, 2)}${reachEn}) or more margin or growth than consensus` : ''}.${rangeEn}`;
    return txt;
  }
  // phones clamp the verdict to its first lines (CSS) and this control opens it; desktop shows it whole
  function renderVerdict() { const box = el('sumVerdict'); if (!box) return; const es = LANG === 'es'; const txt = verdictHtml(); if (!txt) { box.innerHTML = ''; return; } const open = box.classList.contains('open'); box.innerHTML = `<div class="vt">${txt}</div><button type="button" class="vmore" aria-expanded="${open}">${open ? (es ? '− Menos' : '− Less') : (es ? 'Leer el veredicto completo ▾' : 'Read the full verdict ▾')}</button>`; box.querySelector('.vmore').addEventListener('click', () => { box.classList.toggle('open'); renderVerdict(); }); }
  // ---- reading paths: which sections open; everything else stays collapsed until the reader asks
  const PATHS = [{ id: '5', es: '5 minutos', en: '5 minutes', has: (s) => (s.path || []).includes(5) }, { id: '20', es: '20 minutos', en: '20 minutes', has: (s) => (s.path || []).some((p) => p === 5 || p === 20) }, { id: 'full', es: 'referencia completa', en: 'full reference', has: () => true }];
  function applyPath(id) { const P = PATHS.find((p) => p.id === id); if (!P) return; openSet.clear(); for (const s of secList()) if (P.has(s)) openSet.add(s.id); openSet.add('summary'); saveCollapsed(); applyCollapse(); renderPaths(); }
  function currentPath() { const ids = new Set(secList().map((s) => s.id)); for (const P of PATHS) { const want = new Set(secList().filter(P.has).map((s) => s.id)); want.add('summary'); if ([...ids].every((id) => openSet.has(id) === want.has(id))) return P.id; } return null; }
  function renderPaths() {
    const box = el('readingPaths'); if (!box) return; const es = LANG === 'es'; const cur = currentPath();
    box.innerHTML = `<span>${es ? 'Rutas de lectura:' : 'Reading paths:'}</span>` + PATHS.map((P) => `<button type="button" class="chip ${cur === P.id ? 'active' : ''}" data-path="${P.id}">${es ? P.es : P.en}</button>`).join('') + `<span class="muted small">${es ? 'Las secciones cerradas muestran su titular; ábralas con ▸ o desde el menú.' : 'Closed sections show their headline; open them with ▸ or from the menu.'}</span>`;
    box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => applyPath(b.dataset.path)));
  }
  // ---- section leads: a headline that states the takeaway and one line on what it means for valuation, composed at render time
  function sectionLeads() {
    const es = LANG === 'es'; const out = {}; if (!lastQ) return out;
    const rr = BO && BO.rpoRecognition && BO.rpoRecognition.series ? BO.rpoRecognition.series.slice(-1)[0] : null; const mw = sitesMw(); const cg = capexGuideNow(); const S = obligStats(); const sp = spRating(); const d = dcfNow(); const price = dcfPrice();
    const un = (OB && OB.leases && OB.leases.uncommenced) || {}; const fp = (OB && OB.funding_plan) || {}; const fn = fsNtm(); const fsy = fsFiscal().find((f) => +f.fy.slice(2) === lastQ.fy);
    const nd = netDebt(lastQ); const mc = lastPx && sharesNow ? lastPx[1] * sharesNow / 1e6 : null; const evM = nd && mc ? mc + nd.net : null;
    const rpoBn = lastQ.kpi.rpo != null ? fmtN(lastQ.kpi.rpo / 1000, 0) : '—'; const yoy = lastQ.kpi.rpoYoyPct;
    const cn = (BO && BO.unitEconomics && BO.unitEconomics.concentration) || {}; const named = cn.named_customers ? cn.named_customers.names.length : 0;
    const prevQ = qById[yoyQid(lastQ)]; const revG = prevQ && prevQ.is ? 100 * (lastQ.is.revTotal / prevQ.is.revTotal - 1) : null;
    const gv = GV[GV.length - 1]; const nx = nextExpectedFiling(); const openIssues = ((BO && BO.sites) || []).reduce((a, x) => a + (x.issues || []).filter((i) => i.status !== 'closed').length, 0);
    const latestNews = NEWS ? (NEWS.items || []).map((x) => x.date).sort().pop() : null; const nRisks = RK ? (RK.items || []).length : 0;
    const vps = d && d.r ? d.r.perShare : null; const up = vps != null && price ? 100 * (vps / price - 1) : null;
    const fyGuide = GV.slice().reverse().find((v) => v.items && v.items.fyRevenue && v.fyGuided === lastQ.fy);
    out.rpo = es ? { h: `US$ ${rpoBn} mil M contratados${yoy != null ? ` (${fmtPct(yoy, 0, true)} a/a)` : ''}; solo ${rr ? rr.m12_pct : '—'}% se cobra en doce meses.`, sw: `La valuación depende de cuándo se convierte el RPO, no de su tamaño: cada año de retraso mueve el DCF (escenario pesimista en ${ref('dcf')}).` } : { h: `US$ ${rpoBn} bn contracted${yoy != null ? ` (${fmtPct(yoy, 0, true)} y/y)` : ''}; only ${rr ? rr.m12_pct : '—'}% turns into revenue within twelve months.`, sw: `Valuation hinges on when RPO converts, not on its size: each year of slippage moves the DCF (bear case in ${ref('dcf')}).` };
    out.sites = es ? { h: `${fmtN(mw.live)} MW energizados de ${fmtN(mw.plan / 1000, 1)} GW nombrados; ${openIssues} incidencias abiertas en los ${mw.n} campus.`, sw: `Sin megavatios no hay conversión: el consenso supone que los campus llegan a tiempo; Jupiter (≈ 1 GW) es el que más incidencias acumula.` } : { h: `${fmtN(mw.live)} MW energized of ${fmtN(mw.plan / 1000, 1)} GW named; ${openIssues} open issues across the ${mw.n} campuses.`, sw: `No megawatts, no conversion: consensus assumes the campuses arrive on time; Jupiter (≈ 1 GW) carries the most open issues.` };
    out.capex = es ? { h: cg ? `Capex ${fyLabel(cg.fy)} de US$ ${fmtN(cg.lo)}–${fmtN(cg.hi)} mil M brutos, ≤ US$ ${fmtN(cg.netMax)} mil M netos; flujo libre del ${qLabel(lastQ)}: ${fmtBn(lastQ.cf ? lastQ.cf.fcf : null)}.` : 'Sin guía de capex.', sw: `El DCF descuenta el capex bruto y suma los prepagos al recibirse; el flujo libre de consenso sigue negativo hasta ${(() => { const f = fsFiscal().find((x) => x.fcf && x.fcf.mean > 0); return f ? f.fy : '—'; })()}.` } : { h: cg ? `${fyLabel(cg.fy)} capex of US$ ${fmtN(cg.lo)}–${fmtN(cg.hi)} bn gross, ≤ US$ ${fmtN(cg.netMax)} bn net; ${qLabel(lastQ)} free cash flow ${fmtBn(lastQ.cf ? lastQ.cf.fcf : null)}.` : 'No capex guidance.', sw: `The DCF deducts gross capex and counts prepayments when received; consensus free cash flow stays negative until ${(() => { const f = fsFiscal().find((x) => x.fcf && x.fcf.mean > 0); return f ? f.fy : '—'; })()}.` };
    out.financing = es ? { h: `Deuda neta ${nd ? fmtBn(nd.net) : '—'}; faltan ≈ US$ ${fmtN(fp.remaining_fy27_usd_bn, 1)} mil M del plan AF2027${fsy && fsy.fcf ? ` frente a un flujo libre de consenso de ${fmtBn(fsy.fcf.mean)}` : ''}.`, sw: `Cada dólar que no cubren los prepagos o el flujo operativo entra como deuda, preferentes o acciones nuevas: diluye o encarece el capital que descuenta el DCF.` } : { h: `Net debt ${nd ? fmtBn(nd.net) : '—'}; about US$ ${fmtN(fp.remaining_fy27_usd_bn, 1)} bn of the FY2027 plan still to raise${fsy && fsy.fcf ? ` against consensus free cash flow of ${fmtBn(fsy.fcf.mean)}` : ''}.`, sw: `Every dollar prepayments or operating cash do not cover comes in as debt, preferred or new shares: it dilutes or raises the cost of capital the DCF discounts.` };
    out.obligations = es ? { h: `US$ ${fmtN(un.usd_bn, 0)} mil M de arrendamientos firmados fuera del balance${S ? `; ${fmtX(S.ndEbitda, 1)} reportado → ${fmtX(S.leaseAdj, 1)} ajustado` : ''}.`, sw: `Son deuda en sustancia cuando empiezan: el DCF resta los financieros ya reconocidos y ofrece restar el VP de los no iniciados (nota "Arrendamientos en el DCF").` } : { h: `US$ ${fmtN(un.usd_bn, 0)} bn of signed leases off the balance sheet${S ? `; ${fmtX(S.ndEbitda, 1)} reported → ${fmtX(S.leaseAdj, 1)} lease-adjusted` : ''}.`, sw: `They are debt in substance once they commence: the DCF deducts the finance leases already recognised and offers to deduct the PV of the uncommenced ones ("Leases in the DCF" note).` };
    out.credit = es ? { h: `${sp ? `${sp.rating} (S&P, ${fmtDate(sp.date)})` : 'Sin acción reciente de S&P'}${S ? `, ${fmtX(S.leaseAdj, 1)} ajustado por arrendamientos` : ''}: un escalón sobre el grado especulativo.`, sw: `Una rebaja encarecería la deuda nueva (Kd del DCF) y activaría requisitos de garantías para la energía; la WACC del modelo usa el diferencial de la última emisión a 10 años.` } : { h: `${sp ? `${sp.rating} (S&P, ${fmtDate(sp.date)})` : 'No recent S&P action'}${S ? `, ${fmtX(S.leaseAdj, 1)} lease-adjusted` : ''}: one notch above speculative grade.`, sw: `A downgrade would raise the cost of new debt (the DCF's Kd) and trigger power-collateral rules; the model's WACC uses the spread of the latest 10-year issue.` };
    out.circular = es ? { h: `Oracle nombra ${named} clientes de OCI en un prospecto pero ningún monto; S&P estima que cerca de la mitad del RPO es OpenAI.`, sw: `La mitad del flujo contratado depende de una contraparte que se financia con capital de riesgo: el escenario pesimista le aplica un recorte de 25%.` } : { h: `Oracle names ${named} OCI customers in a prospectus but no amounts; S&P estimates about half of RPO is OpenAI.`, sw: `Half the contracted flow depends on one counterparty funded by private capital: the bear case haircuts its volume by 25%.` };
    out.valuation = es ? { h: evM && fn.ebitda ? `${fmtX(evM / fn.ebitda.mean)} VE/EBITDA NTM y ${fn.eps ? fmtX(lastPx[1] / fn.eps.mean) : '—'} P/U NTM al cierre del ${fmtDate(lastPx[0])}.` : 'Múltiplos pendientes.', sw: `Los múltiplos ya descuentan el consenso; el DCF dice qué parte de ese consenso tiene que cumplirse.` } : { h: evM && fn.ebitda ? `${fmtX(evM / fn.ebitda.mean)} EV/EBITDA NTM and ${fn.eps ? fmtX(lastPx[1] / fn.eps.mean) : '—'} P/E NTM at the ${fmtDate(lastPx[0])} close.` : 'Multiples pending.', sw: `The multiples already price consensus; the DCF says how much of that consensus has to come true.` };
    out.dcf = es ? { h: vps != null ? `US$ ${fmtN(vps, 0)} por acción en el escenario ${presetLabel(d.s.preset)} frente a US$ ${fmtN(price, 2)} (${fmtPct(up, 0, true)}).` : 'DCF pendiente.', sw: `La prueba no es si una cuadrícula abarca el precio, sino qué margen, crecimiento o WACC lo justifican: recuadro "Qué tiene que ser cierto".` } : { h: vps != null ? `US$ ${fmtN(vps, 0)} per share in the ${presetLabel(d.s.preset)} scenario against US$ ${fmtN(price, 2)} (${fmtPct(up, 0, true)}).` : 'DCF pending.', sw: `The test is not whether a grid brackets the price but which margin, growth or WACC justifies it: the "What has to be true" box.` };
    out.risks = es ? { h: `${nRisks} riesgos documentados, cada uno con su evidencia y la sección donde vive la cifra.`, sw: `Ejecución, concentración y financiamiento son los tres que mueven el DCF; los demás mueven el costo de capital.` } : { h: `${nRisks} documented risks, each with its evidence and the section where the figure lives.`, sw: `Execution, concentration and funding are the three that move the DCF; the rest move the cost of capital.` };
    out.news = es ? { h: NEWS ? `${(NEWS.items || []).length} eventos en ${NEWS.windowDays} días; el más reciente del ${fmtDate(latestNews)}, barrido al ${fmtDate(NEWS.asOf)}.` : '', sw: `Lo que cambia un supuesto del modelo entra a la sección correspondiente; lo que descansa solo en prensa se marca y no entra a ninguna cifra.` } : { h: NEWS ? `${(NEWS.items || []).length} events in ${NEWS.windowDays} days; the latest dated ${fmtDate(latestNews)}, swept ${fmtDate(NEWS.asOf)}.` : '', sw: `What changes a model assumption goes into its section; what rests on press alone is labeled and enters no figure.` };
    out.calendar = es ? { h: nx ? `Próximos resultados: ${fmtDate(nx.date)} (${nx.basis === 'confirmed' ? 'confirmado' : 'supuesto'}).` : 'Sin fecha.', sw: `El 2T27 trae el siguiente RPO, los MW entregados y la guía: las tres cifras que recalibran el DCF.` } : { h: nx ? `Next results: ${fmtDate(nx.date)} (${nx.basis}).` : 'No date.', sw: `2Q27 brings the next RPO, MW delivered and guidance: the three figures that recalibrate the DCF.` };
    out.statements = es ? { h: `${qLabel(lastQ)}: ingresos ${fmtBn(lastQ.is.revTotal)}${revG != null ? ` (${fmtPct(revG, 0, true)} a/a)` : ''}, margen operativo No-GAAP ${fmtPct(lastQ.is.ngOpMargin, 0)}.`, sw: `Los estados reportados son la base del año fiscal en curso del DCF; el resto es consenso.` } : { h: `${qLabel(lastQ)}: revenue ${fmtBn(lastQ.is.revTotal)}${revG != null ? ` (${fmtPct(revG, 0, true)} y/y)` : ''}, Non-GAAP operating margin ${fmtPct(lastQ.is.ngOpMargin, 0)}.`, sw: `The reported statements anchor the DCF's current fiscal year; everything after it is consensus.` };
    out.guidance = es ? { h: fyGuide ? `Guía ${fyLabel(fyGuide.fyGuided)}: ingresos de al menos ${fmtBn(fyGuide.items.fyRevenue.usdM, 0)}${gv ? `, emitida el ${fmtDate(gv.date)}` : ''}.` : 'Sin guía anual.', sw: `El consenso del primer año del DCF se compara con esta guía; el escenario optimista usa el objetivo AF2030.` } : { h: fyGuide ? `${fyLabel(fyGuide.fyGuided)} guidance: revenue of at least ${fmtBn(fyGuide.items.fyRevenue.usdM, 0)}${gv ? `, issued ${fmtDate(gv.date)}` : ''}.` : 'No annual guidance.', sw: `The DCF's first consensus year is checked against this guide; the bull case uses the FY2030 target.` };
    out.method = es ? { h: `Cada cifra lleva reporte, nota, número de acceso y una verificación XBRL, de comunicado o de segunda lectura.`, sw: `Nada estimado entra a una razón sin etiqueta; el glosario define cada término al pasar el cursor.` } : { h: `Every figure carries its filing, note, accession number and an XBRL, release or second-reading verification.`, sw: `Nothing estimated enters a ratio unlabeled; the glossary defines each term on hover.` };
    return out;
  }
  function renderLeads() {
    const leads = sectionLeads(); const es = LANG === 'es';
    for (const sec of document.querySelectorAll('section.block[data-sec]')) {
      const id = sec.dataset.sec; sec.querySelectorAll(':scope > .sec-lead').forEach((e) => e.remove());
      const L2 = leads[id]; if (!L2 || !L2.h) continue;
      const head = sec.querySelector(':scope > .sec-head'); if (!head) continue;
      head.insertAdjacentHTML('afterend', `<p class="sec-lead"><b>${L2.h}</b><span class="sw"><i>${es ? 'Para la valuación:' : 'So what for valuation:'}</i> ${resolveRefs(L2.sw)}</span></p>`);
    }
  }
  // ---- sources and uses, FY2027–FY2030: consensus flows, known commitments and the company's own funding figures, reconciled
  function fyOfIso(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return m >= 6 ? y + 1 : y; }
  function renderSourcesUses() {
    if (!el('suTable') || !lastQ) return; const es = LANG === 'es';
    const fys = fsFiscal().filter((f) => f.fcf && f.capex && f.sales).slice(0, 4); if (!fys.length) { html('suTable', `<p class="muted small">${t('na')}</p>`); return; }
    const yrs = fys.map((f) => +f.fy.slice(2));
    const d0 = dcfDefaults(); const cl = bridgeClaims(); const pf = (OB && OB.preferred) || {}; const fp = (OB && OB.funding_plan) || {};
    const ins = (REF.debt && REF.debt.instruments) || []; const matIn = (fy) => ins.filter((i) => i.matures && fyOfIso(i.matures) === fy).reduce((a, i) => a + (i.principalUsdM || 0), 0);
    const decl = (REF.dividends || []).slice(-1)[0]; const sh = dilutedShares(); const commonDiv = decl && sh ? decl.dps * 4 * sh.cover : null; const prefDiv = pf.dividend_quarterly_usd_m ? pf.dividend_quarterly_usd_m * 4 : 0;
    const flaFy = XB && XB.concepts.fin_lease_additions ? (XB.concepts.fin_lease_additions.fiscal_years || []).slice(-1)[0] : null;
    const rows = fys.map((f, i) => { const capex = f.capex.mean, fcf = f.fcf.mean, ocf = fcf + capex; const prepay = d0 ? capex * (d0.cf[i] ?? 0) / 100 : null; const rep = matIn(yrs[i]); const div = (commonDiv || 0) + prefDiv; const need = -fcf + div + rep; return { fy: f.fy, ocf, capex, fcf, prepay, rep, div, need }; });
    const atm = ((fp.items || []).filter((x) => x.kind === 'done' && /ATM|at-the-market/i.test(x.en)).slice(-1)[0] || {}).usd_bn; const rem = fp.remaining_fy27_usd_bn;
    const cash = lastQ.bs ? lastQ.bs.cashAndInvestments : null;
    const fmtB = (v) => (v == null ? '—' : fmtN(v / 1000, 1));
    const C = `<span class="badge">${es ? 'consenso' : 'consensus'}</span>`, K = `<span class="badge">${es ? 'cálculo FNAM' : 'FNAM calc.'}</span>`, R = `<span class="badge ok">${es ? 'reportado' : 'reported'}</span>`, CO = `<span class="badge">${es ? 'empresa' : 'company'}</span>`, E = `<span class="badge est">${es ? 'estimación' : 'estimate'}</span>`;
    const tr = (label, f, badge, cls2 = '') => `<tr class="${cls2}"><td>${label} ${badge}</td>${rows.map((r) => `<td>${f(r)}</td>`).join('')}</tr>`;
    const grp = (label) => `<tr class="grp"><td colspan="${rows.length + 1}">${label}</td></tr>`;
    html('suTable', `<table class="su"><thead><tr><th>US$ ${es ? 'mil M' : 'bn'}</th>${rows.map((r) => `<th>${r.fy}E</th>`).join('')}</tr></thead><tbody>
      ${grp(es ? 'Fuentes' : 'Sources')}
      ${tr(es ? 'Flujo de efectivo de operación (flujo libre + capex del consenso)' : 'Operating cash flow (consensus free cash flow + capex)', (r) => fmtB(r.ocf), C)}
      ${tr(es ? 'de los cuales prepagos de clientes (porción financiada por clientes × capex bruto; memo)' : 'of which customer prepayments (customer-funded share × gross capex; memo)', (r) => (r.prepay != null ? fmtB(r.prepay) : '—'), E, 'sub')}
      ${tr(es ? 'Capital: emisión ATM completada en el 1T27' : 'Equity: at-the-market issuance completed in 1Q27', (r, i) => (r.fy === fys[0].fy && atm != null ? fmtN(atm, 1) : '—'), R)}
      ${tr(es ? 'Deuda o capital por levantar del plan AF2027 (instrumento no anunciado)' : 'Debt or equity still to raise under the FY2027 plan (instrument not announced)', (r) => (r.fy === fys[0].fy && rem != null ? fmtN(rem, 1) : '—'), CO)}
      ${tr(es ? 'Arrendamientos financieros: capacidad que entra sin efectivo (último AF, XBRL; memo)' : 'Finance leases: capacity that arrives without cash (latest FY, XBRL; memo)', (r) => (r.fy === fys[0].fy && flaFy ? fmtB(flaFy.value) : '—'), R, 'sub')}
      ${grp(es ? 'Usos' : 'Uses')}
      ${tr(es ? 'Capex bruto' : 'Gross capex', (r) => fmtB(r.capex), C)}
      ${tr(es ? 'Dividendos comunes (último declarado × 4 × acciones en portada) y preferentes' : 'Common dividends (latest declared × 4 × cover shares) and preferred', (r) => fmtB(r.div), K)}
      ${tr(es ? 'Vencimientos de deuda en el año fiscal (nota de deuda del 10-K)' : 'Debt maturing in the fiscal year (10-K debt footnote)', (r) => fmtB(r.rep), R)}
      ${tr(es ? 'Intereses' : 'Interest', (r, i) => (r.fy === fys[0].fy ? (es ? 'dentro del flujo de operación, todos los años' : 'inside operating cash flow, every year') : ''), C, 'sub')}
      ${grp(es ? 'Saldo' : 'Balance')}
      ${tr(es ? 'Flujo libre (consenso)' : 'Free cash flow (consensus)', (r) => `<span class="${cls(r.fcf)}">${fmtB(r.fcf)}</span>`, C, 'bold')}
      ${tr(es ? 'Necesidad de financiamiento = −flujo libre + dividendos + vencimientos' : 'Funding need = −free cash flow + dividends + maturities', (r) => `<b>${fmtB(r.need)}</b>`, K, 'total')}
      ${tr(es ? 'Fuentes identificadas (ATM + plan por levantar)' : 'Identified sources (ATM + plan still to raise)', (r) => (r.fy === fys[0].fy && atm != null && rem != null ? fmtN(atm + rem, 1) : '—'), CO)}
      ${tr(es ? 'Diferencia = uso de efectivo en caja o financiamiento adicional' : 'Difference = cash drawdown or additional funding', (r) => (r.fy === fys[0].fy && atm != null && rem != null ? `<b>${fmtB(r.need - 1000 * (atm + rem))}</b>` : `<span class="muted">${es ? 'sin plan anunciado' : 'no plan announced'}</span>`), K)}
      ${tr(es ? `Memo: efectivo e inversiones al ${fmtDate(qEndDate(lastQ))}` : `Memo: cash and investments at ${fmtDate(qEndDate(lastQ))}`, (r) => (r.fy === fys[0].fy ? fmtB(cash) : ''), R, 'sub')}
    </tbody></table>`);
    const r0 = rows[0]; const gapCo = rem != null ? 1000 * rem : null; const diff = gapCo != null ? r0.need - 1000 * ((atm || 0) + rem) : null;
    el('suCap').textContent = es ? `US$ mil millones por año fiscal de Oracle (junio–mayo). Flujos del consenso de FactSet (${fmtDate(FS.asOf)}); dividendos y vencimientos calculados por FNAM a partir de la última declaración y de la nota de deuda; la porción financiada por clientes es el supuesto del DCF (${fmtPct(d0 ? d0.cf[0] : null, 0)} en ${fys[0].fy}, de la guía bruta frente a neta). Las filas "memo" no se suman.` : `US$ billion by Oracle fiscal year (June–May). FactSet consensus flows (${fmtDate(FS.asOf)}); dividends and maturities computed by FNAM from the latest declaration and the debt footnote; the customer-funded share is the DCF's assumption (${fmtPct(d0 ? d0.cf[0] : null, 0)} in ${fys[0].fy}, from the gross-versus-net guide). "Memo" rows are not added.`;
    html('suNote', `<b>${es ? 'Conciliación con la brecha de la empresa.' : 'Reconciliation with the company\'s gap.'}</b> ${es
      ? `Oracle dijo que levantará unos US$ 40 mil M en el AF2027: US$ ${fmtN(atm, 1)} mil M ya emitidos (ATM) + ≈ US$ ${fmtN(rem, 1)} mil M por levantar. El flujo libre de consenso del ${fys[0].fy} es ${fmtB(r0.fcf)} mil M; sumando dividendos (${fmtB(r0.div)}) y vencimientos (${fmtB(r0.rep)}), la necesidad es US$ ${fmtB(r0.need)} mil M, ${fmtB(r0.need - 1000 * (atm + rem))} mil M más que las fuentes identificadas. Tres supuestos explican la diferencia: (1) el efectivo en caja (US$ ${fmtB(cash)} mil M al ${fmtDate(qEndDate(lastQ))}) puede cubrirla sin nueva emisión; (2) el consenso trata el capex como bruto (US$ ${fmtB(r0.capex)} mil M ≈ la guía) y su flujo de operación ya incluye los prepagos (≈ US$ ${fmtB(r0.prepay)} mil M al ${fmtPct(d0 ? d0.cf[0] : null, 0)}): si los brokers modelaron menos prepagos, la brecha de la empresa es menor que la del consenso; (3) la cifra de Oracle es deuda y capital, no efectivo: no incluye los vencimientos ni los dividendos que esta tabla sí resta. Nada aquí es una proyección propia: las filas del consenso son de FactSet y las demás, aritmética sobre cifras reportadas.`
      : `Oracle said it would raise about US$ 40 bn in FY2027: US$ ${fmtN(atm, 1)} bn already issued (ATM) + about US$ ${fmtN(rem, 1)} bn still to raise. Consensus free cash flow for ${fys[0].fy} is ${fmtB(r0.fcf)} bn; adding dividends (${fmtB(r0.div)}) and maturities (${fmtB(r0.rep)}), the need is US$ ${fmtB(r0.need)} bn, ${fmtB(r0.need - 1000 * (atm + rem))} bn more than the identified sources. Three assumptions explain the difference: (1) cash on hand (US$ ${fmtB(cash)} bn at ${fmtDate(qEndDate(lastQ))}) can cover it without a new issue; (2) consensus treats capex as gross (US$ ${fmtB(r0.capex)} bn ≈ the guide) and its operating cash flow already includes the prepayments (≈ US$ ${fmtB(r0.prepay)} bn at ${fmtPct(d0 ? d0.cf[0] : null, 0)}): if the brokers modeled fewer prepayments, the company's gap is smaller than the consensus one; (3) Oracle's figure is debt and equity, not cash: it excludes the maturities and dividends this table does subtract. Nothing here is an in-house projection: the consensus rows are FactSet's and the rest is arithmetic on reported figures.`}`);
    html('suSrc', `${t('src')}: ${FS && FS.source ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet'} (${es ? 'flujo libre, capex, ventas por año fiscal' : 'free cash flow, capex, sales by fiscal year'} ${asOf(FS.asOf)}) · ${relLink()} (${es ? 'dividendo declarado, efectivo' : 'dividend declared, cash'}) · ${tenKLink()} (${es ? 'vencimientos' : 'maturities'}) · ${XB ? extLink(XB.source.url, es ? 'SEC XBRL (acciones, arrendamientos financieros)' : 'SEC XBRL (shares, finance leases)') : ''} · ${es ? 'plan de financiamiento' : 'funding plan'}: ${irLink()} (${es ? 'llamada 4T26 y 10-Q 1T27' : '4Q26 call and 1Q27 10-Q'})`);
    html('fundingMeta', es ? `Balance del ${qLabel(lastQ)}; plan de financiamiento según la llamada del 4T26 y el 10-Q del 1T27; consenso de FactSet al ${fmtDate(FS.asOf)}.` : `${qLabel(lastQ)} balance sheet; funding plan per the 4Q26 call and the 1Q27 10-Q; FactSet consensus as of ${fmtDate(FS.asOf)}.`);
  }
  // ---- counterparties: whom Oracle names (SEC prospectus), what S&P estimates, what the press reports, and the counterparty's capacity (press, labeled)
  function renderCounterparties() {
    if (!el('cpTable') || !BO) return; const es = LANG === 'es', c = SERIES();
    const cn = (BO.unitEconomics && BO.unitEconomics.concentration) || {}; const nc = cn.named_customers || null; const pc = cn.press_contracts || []; const cap = cn.counterparty_capacity || null;
    const rpo = lastQ && lastQ.kpi.rpo != null ? lastQ.kpi.rpo : null;
    const B = { sec: `<span class="badge ok">${es ? 'reporte a la SEC' : 'SEC filing'}</span>`, third: `<span class="badge est">${es ? 'estimación de un tercero' : 'third-party estimate'}</span>`, press: `<span class="badge est">${es ? 'prensa' : 'press'}</span>`, nd: `<span class="badge rev">${es ? 'no divulgado' : 'not disclosed'}</span>`, fnam: `<span class="badge est">${es ? 'estimación FNAM' : 'FNAM estimate'}</span>` };
    const names = nc ? nc.names : [];
    const rows = names.map((n) => { const p = pc.find((x) => x.counterparty === n); const isOpenAI = /OpenAI/i.test(n); return `<tr><td><b>${n}</b></td><td>${nc ? `${B.sec} <span class="small muted">${es ? 'nombrado en el prospecto (FWP) del 1 feb 2026' : 'named in the FWP prospectus of 1 Feb 2026'}</span>` : ''}</td><td>${isOpenAI && rpo ? `≈ ${fmtPct(50, 0)} ${B.third}<span class="sub">S&P: ${es ? 'cerca de la mitad del RPO' : 'about half of RPO'} (US$ ${fmtN(rpo / 2000, 0)} ${es ? 'mil M' : 'bn'} ${es ? 'sobre' : 'on'} US$ ${fmtN(rpo / 1000, 0)} ${es ? 'mil M' : 'bn'})</span>` : B.nd}</td><td>${p ? `US$ ${fmtN(p.usd_bn)} ${es ? 'mil M' : 'bn'} ${B.press}<span class="sub">${L({ es: p.term_text_es, en: p.term_text_en })} · ${fmtDate(p.date)}</span>` : B.nd}</td><td class="small">${p && p.source ? extLink(p.source.url, p.source.title.replace(/:.*$/, '')) : nc ? extLink(nc.source.url, 'FWP') : ''}</td></tr>`; });
    html('cpTable', `<table class="cp"><thead><tr><th>${es ? 'Contraparte' : 'Counterparty'}</th><th>${es ? 'Nombrada por Oracle' : 'Named by Oracle'}</th><th>${es ? 'Porción del RPO' : 'Share of RPO'}</th><th>${es ? 'Tamaño del contrato' : 'Contract size'}</th><th>${t('src')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('cpCap').textContent = nc ? L({ es: nc.amounts_note_es, en: nc.amounts_note_en }) : '';
    // counterparty capacity (OpenAI): press figures on funding and revenue against the annual payments the press-reported contract implies
    let capTxt = '';
    if (cap && cap.openai) { const o = cap.openai; const p = pc.find((x) => /OpenAI/i.test(x.counterparty)); const annual = p ? p.usd_bn / 5 : null;
      capTxt = `<b>${es ? 'Capacidad de la contraparte (OpenAI).' : 'Counterparty capacity (OpenAI).'}</b> ${B.fnam} ${es
        ? `Según la prensa, OpenAI ${o.arr_text_es}; ${o.raised_text_es}; ${o.seeking_text_es}. El contrato reportado por el WSJ (US$ ${p ? fmtN(p.usd_bn) : '—'} mil M en unos cinco años desde 2027) implica pagos del orden de US$ ${annual ? fmtN(annual) : '—'} mil M al año, ${o.arr_usd_bn && annual ? `${fmtX(annual / o.arr_usd_bn, 1)} de sus ingresos anualizados reportados` : ''}: la capacidad de pago depende de que siga levantando capital. ${L({ es: cap.label_es, en: cap.label_en })}.`
        : `Per the press, OpenAI ${o.arr_text_en}; ${o.raised_text_en}; ${o.seeking_text_en}. The contract the WSJ reported (US$ ${p ? fmtN(p.usd_bn) : '—'} bn over about five years from 2027) implies payments on the order of US$ ${annual ? fmtN(annual) : '—'} bn a year, ${o.arr_usd_bn && annual ? `${fmtX(annual / o.arr_usd_bn, 1)} its reported annualized revenue` : ''}: its ability to pay depends on continuing to raise capital. ${L({ es: cap.label_es, en: cap.label_en })}.`}`; }
    html('cpNote', capTxt || (es ? 'Sin datos de capacidad de contraparte.' : 'No counterparty-capacity data.'));
    html('cpSrc', `${t('src')}: ${nc ? extLink(nc.source.url, es ? 'Oracle FWP, 1 feb 2026' : 'Oracle FWP, 1 Feb 2026') + ` <span class="mono">${nc.source.accession}</span>` : ''} · ${cn.source ? extLink(cn.source.url, 'S&P Global Ratings, 9 Jul 2026') : ''} · ${pc.map((p) => (p.source ? extLink(p.source.url, p.counterparty + ' (' + (es ? 'prensa' : 'press') + ')') : '')).join(' · ')}${cap && cap.openai ? ' · ' + cap.openai.sources.map((s) => extLink(s.url, s.title.replace(/:.*$/, ''))).join(' · ') : ''}`);
    // concentration chart: S&P's estimate against the rest; nothing else is split because nothing else is disclosed
    if (rpo) { const half = rpo / 2;
      mkChart('chartConc', { type: 'doughnut', data: { labels: [es ? 'OpenAI (≈ la mitad, estimación de S&P)' : 'OpenAI (≈ half, S&P estimate)', es ? `Otros: ${names.filter((n) => !/OpenAI/i.test(n)).join(', ')} y no divulgados` : `Others: ${names.filter((n) => !/OpenAI/i.test(n)).join(', ')} and undisclosed`], datasets: [{ data: [half / 1000, (rpo - half) / 1000], backgroundColor: [c[1], c[0]], borderWidth: 0 }] }, options: { cutout: '55%', plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (x) => `${x.label}: US$ ${fmtN(x.parsed, 0)} ${es ? 'mil M' : 'bn'}` } } } } });
      el('concCap').textContent = es ? `RPO de US$ ${fmtN(rpo / 1000, 0)} mil M al ${qLabel(lastQ)}. Oracle no divulga la concentración dentro del RPO; la única división pública es la estimación de S&P (≈ la mitad OpenAI). El resto no se reparte porque no hay cifra que lo sustente.` : `RPO of US$ ${fmtN(rpo / 1000, 0)} bn at ${qLabel(lastQ)}. Oracle does not disclose concentration within RPO; the only public split is S&P's estimate (≈ half OpenAI). The rest is not divided because no figure supports it.`;
      html('concSrc', `${t('src')}: ${relLink()} (RPO) · ${cn.source ? extLink(cn.source.url, 'S&P Global Ratings, 9 Jul 2026') : ''} (${es ? 'estimación de un tercero' : 'third-party estimate'}) · ${nc ? extLink(nc.source.url, 'Oracle FWP') : ''}`);
    }
  }
  // ---- RPO to revenue: the contracted conversion schedule laid onto fiscal years against consensus revenue
  function renderRpoBridge() {
    if (!el('rpoBridgeTable') || !BO || !BO.rpoRecognition) return; const es = LANG === 'es', c = SERIES();
    const ser = BO.rpoRecognition.series || []; const last = ser[ser.length - 1]; if (!last) return;
    const rpo = last.rpo_bn * 1000; const asOfD = last.as_of; const m0 = +asOfD.slice(0, 4) * 12 + (+asOfD.slice(5, 7)); // month index of the as-of date
    const buckets = [{ from: 1, to: 12, pct: last.m12_pct }, { from: 13, to: 36, pct: last.m13_36_pct }, { from: 37, to: 60, pct: last.m37_60_pct }];
    const fyOfMonth = (mi) => { const y = Math.floor((mi - 1) / 12), m = ((mi - 1) % 12) + 1; return m >= 6 ? y + 1 : y; };
    const fys = fsFiscal().filter((f) => f.sales).slice(0, 4); const byFy = {};
    for (const b of buckets) { const perMonth = rpo * b.pct / 100 / (b.to - b.from + 1); for (let k = b.from; k <= b.to; k++) { const fy = fyOfMonth(m0 + k); byFy[fy] = (byFy[fy] || 0) + perMonth; } }
    const reported = {}; for (const q of Q) if (q.fy === lastQ.fy) reported[q.fy] = (reported[q.fy] || 0) + q.is.revTotal;
    const rows = fys.map((f) => { const fy = +f.fy.slice(2); const con = byFy[fy] || 0, rep = reported[fy] || 0, cons = f.sales.mean; return { fy: f.fy, con, rep, cons, rest: cons - con - rep, share: 100 * (con + rep) / cons }; });
    mkChart('chartRpoBridge', { type: 'bar', data: { labels: rows.map((r) => r.fy), datasets: [
      { label: es ? 'Ya reportado' : 'Already reported', data: rows.map((r) => r.rep / 1000), backgroundColor: c[2], stack: 'a' },
      { label: es ? 'Conversión contratada del RPO (calendario del 10-Q)' : 'Contracted RPO conversion (10-Q schedule)', data: rows.map((r) => r.con / 1000), backgroundColor: c[0], stack: 'a' },
      { label: es ? 'Resto: aún no contratado al cierre' : 'Remainder: not yet contracted at quarter-end', data: rows.map((r) => Math.max(0, r.rest) / 1000), backgroundColor: alpha(c[3], 0.6), stack: 'a' },
      { label: es ? 'Ingresos de consenso' : 'Consensus revenue', type: 'line', data: rows.map((r) => r.cons / 1000), borderColor: c[7], backgroundColor: c[7], pointRadius: 3 },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: US$ ${fmtN(x.parsed.y, 1)} ${es ? 'mil M' : 'bn'}` } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 44, borderWidth: 0 } } } });
    html('rpoBridgeTable', `<table><thead><tr><th>${es ? 'Año fiscal' : 'Fiscal year'}</th><th>${es ? 'Ya reportado' : 'Already reported'}</th><th>${es ? 'Conversión contratada' : 'Contracted conversion'}</th><th>${es ? 'Consenso' : 'Consensus'}</th><th>${es ? 'Cubierto por contratos + reportado' : 'Covered by contracts + reported'}</th><th>${es ? 'Resto por contratar' : 'Remainder to be contracted'}</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r.fy}</b></td><td>${r.rep ? fmtBn(r.rep) : '—'}</td><td>${fmtBn(r.con)}</td><td>${fmtBn(r.cons)}</td><td><b>${fmtPct(r.share, 0)}</b></td><td class="${r.rest < 0 ? 'neg' : ''}">${fmtBn(r.rest)}</td></tr>`).join('')}</tbody></table>`);
    el('rpoBridgeCap').textContent = es ? `US$ mil millones. Calendario de reconocimiento del 10-Q al ${fmtDate(asOfD)} (${last.m12_pct}% en 12 meses, ${last.m13_36_pct}% en los meses 13–36, ${last.m37_60_pct}% en los meses 37–60) repartido por meses sobre los años fiscales de Oracle, con reconocimiento uniforme dentro de cada tramo (supuesto FNAM: Oracle no da el perfil mensual). Consenso de FactSet por año fiscal (${fmtDate(FS.asOf)}).` : `US$ billion. 10-Q recognition schedule at ${fmtDate(asOfD)} (${last.m12_pct}% within 12 months, ${last.m13_36_pct}% in months 13–36, ${last.m37_60_pct}% in months 37–60) laid month by month onto Oracle's fiscal years, with even recognition inside each bucket (FNAM assumption: Oracle gives no monthly profile). FactSet consensus by fiscal year (${fmtDate(FS.asOf)}).`;
    const r1 = rows[1] || rows[0];
    html('rpoBridgeNote', `<b>${es ? 'Lectura.' : 'Reading it.'}</b> ${es ? `Lo contratado al ${fmtDate(asOfD)} cubre ${fmtPct(rows[0].share, 0)} del consenso ${rows[0].fy} y ${fmtPct(r1.share, 0)} del ${r1.fy}; el resto tiene que firmarse, renovarse o facturarse por uso. El RPO incluye todo lo contratado (soporte de software y nube), así que la cobertura no es solo IA. Una conversión más lenta que el calendario del 10-Q mueve el DCF (${ref('dcf')}, escenario pesimista).` : `What was contracted at ${fmtDate(asOfD)} covers ${fmtPct(rows[0].share, 0)} of ${rows[0].fy} consensus and ${fmtPct(r1.share, 0)} of ${r1.fy}; the rest has to be signed, renewed or billed by usage. RPO includes everything contracted (software support and cloud), so the coverage is not AI alone. A slower conversion than the 10-Q schedule moves the DCF (${ref('dcf')}, bear case).`}`);
    html('rpoBridgeSrc', `${t('src')}: ${last.source ? extLink(last.source.url, last.source.title) : ''} (${es ? 'calendario de reconocimiento' : 'recognition schedule'}) · ${relLink()} (RPO, ${es ? 'ingresos reportados' : 'reported revenue'}) · ${FS && FS.source ? extLink(FS.source.url, 'FactSet Estimates') : 'FactSet'} ${asOf(FS.asOf)}`);
  }
  // ---- megawatts by campus: contracted, energized and the expected date, every cell with its source
  function renderMwTimeline() {
    if (!el('mwTable') || !BO) return; const es = LANG === 'es', c = SERIES();
    const sites = BO.sites || []; const sf = (s, k) => (es ? s[k + '_es'] : s[k + '_en']) || s[k] || '';
    const srcShort = (r) => (r.url ? `<a href="${r.url}" target="_blank" rel="noopener" title="${(r.title || '').replace(/"/g, '&quot;')}">${r.short || r.title}</a>` : `<span title="${(r.title || '').replace(/"/g, '&quot;')}">${r.short || r.title}</span>`);
    mkChart('chartMw', { type: 'bar', data: { labels: sites.map((s) => s.short || s.name), datasets: [
      { label: es ? 'Energizados (MW)' : 'Energized (MW)', data: sites.map((s) => s.energized_mw || 0), backgroundColor: c[2], stack: 'a' },
      { label: es ? 'Pendiente hasta la capacidad nominal (MW)' : 'Remaining to nameplate (MW)', data: sites.map((s) => Math.max(0, (s.nameplate_mw || s.capacity_mw || 0) - (s.energized_mw || 0))), backgroundColor: alpha(c[0], 0.45), stack: 'a' },
    ] }, options: { indexAxis: 'y', plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.x)} MW` } } }, scales: { x: { stacked: true, ticks: { callback: (v) => fmtN(v) + ' MW' }, beginAtZero: true }, y: { stacked: true, grid: { display: false } } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    html('mwTable', `<table class="mw"><thead><tr><th>${es ? 'Campus' : 'Campus'}</th><th>${es ? 'Contratado' : 'Contracted'}</th><th>${es ? 'Nominal (MW)' : 'Nameplate (MW)'}</th><th>${es ? 'Energizados (MW) · al' : 'Energized (MW) · as of'}</th><th>${es ? 'Fecha esperada (primeras entregas / ingresos)' : 'Expected date (first deliveries / revenue)'}</th><th>${t('src')}</th></tr></thead><tbody>${sites.map((s) => `<tr><td><b>${s.short || s.name}</b><span class="sub">${sf(s, 'tenant') || sf(s, 'customer') || ''}</span></td><td>${sf(s, 'contracted') || '—'}</td><td>${fmtN(s.nameplate_mw || s.capacity_mw)}${s.nameplate_src ? `<span class="sub">${s.nameplate_src}</span>` : ''}</td><td>${fmtN(s.energized_mw || 0)}${s.energized_as_of ? `<span class="sub">${boLabel(s.energized_as_of)}</span>` : ''}</td><td>${sf(s, 'first_revenue') || sf(s, 'first_delivery') || '—'}</td><td class="small">${(s.sources || []).slice(0, 3).map(srcShort).join(' · ')}</td></tr>`).join('')}<tr class="total"><td>${t('total')}</td><td></td><td>${fmtN(sites.reduce((a, s) => a + (s.nameplate_mw || s.capacity_mw || 0), 0))}</td><td>${fmtN(sites.reduce((a, s) => a + (s.energized_mw || 0), 0))}</td><td></td><td class="small muted">${es ? 'cálculo FNAM: suma de las filas de arriba; sin fuente externa que enlazar' : 'FNAM calculation: sum of the rows above; no external source to link'}</td></tr></tbody></table>`);
    el('mwCap').textContent = es ? 'Capacidad nominal y megavatios energizados según Oracle (llamadas) o el desarrollador; "contratado" es la fecha en que Oracle anunció el campus; la fecha esperada es la que Oracle dio en la llamada citada, con la del desarrollador cuando difiere. Las fechas son declaraciones de la empresa, no auditadas.' : 'Nameplate and energized megawatts per Oracle (calls) or the developer; "contracted" is when Oracle announced the campus; the expected date is the one Oracle gave on the cited call, with the developer\'s when it differs. Dates are company statements, not audited.';
    html('mwSrc', `${t('src')}: ${es ? 'transcripciones de las llamadas y comunicados enlazados por fila' : 'call transcripts and releases linked per row'} · ${irLink()} · ${BO.updated ? `${es ? 'revisado el' : 'reviewed'} ${fmtDate(BO.updated)}` : ''}`);
  }
  // ---- Oracle against the hyperscalers: the hub's own figures and definitions (TTM capex / revenue, RPO / TTM revenue, lease-adjusted net debt / TTM EBITDA)
  function renderHyperscalers() {
    if (!el('hypTable')) return; const es = LANG === 'es', c = SERIES();
    if (!HYP || !HYP.companies) { html('hypTable', `<p class="muted small">${es ? 'Datos del hub de hiperescaladores no disponibles.' : 'Hyperscaler Hub data not available.'}</p>`); return; }
    const tier = (k, tip) => `<span class="tier ${k}" title="${tip}">${k === 'T1' ? 'T1 · SEC' : k === 'C' ? (es ? 'Cálculo FNAM' : 'FNAM calc.') : k}</span>`;
    const rows = Object.values(HYP.companies).map((co) => { const qs = co.quarters || []; const q = qs[qs.length - 1]; if (!q || !q.ttm) return null; const tt = q.ttm; const rq = qs.slice().reverse().find((x) => x.m && x.m.rpo); return { t: co.ticker, name: co.name, group: co.group, end: q.end, rev: tt.revenue, capex: tt.capex_cash, fl: tt.fl_additions ?? null, rpo: rq ? rq.m.rpo[0] : null, rpoEnd: rq ? rq.end : null, nd: tt.nd_ebitda, land: tt.land_ebitda, cxOcf: tt.capex_ocf, da: tt.da ?? null, ebitda: tt.ebitda ?? null }; }).filter(Boolean).sort((a, b) => (a.t === 'ORCL' ? -1 : b.t === 'ORCL' ? 1 : (b.capex / b.rev) - (a.capex / a.rev)));
    const S = obligStats();
    const fmtY = (v) => (v == null ? '—' : fmtN(v, 1) + (es ? ' años' : ' yrs'));
    html('hypTable', `<table><thead><tr><th>${es ? 'Empresa' : 'Company'}</th><th>${es ? 'UDM al' : 'TTM to'}</th><th>${es ? 'Capex / ingresos' : 'Capex / revenue'}</th><th>${es ? 'Capex / flujo de operación' : 'Capex / operating cash flow'}</th><th>RPO</th><th>${es ? 'RPO / ingresos UDM' : 'RPO / TTM revenue'}</th><th>${es ? 'DN / EBITDA' : 'ND / EBITDA'}</th><th>${es ? 'DN ajustada por arrend. / EBITDA' : 'Lease-adj. ND / EBITDA'}</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.t === 'ORCL' ? 'bold' : ''}"><td>${r.name}${r.group === 'neocloud' ? ` <span class="badge est">neocloud</span>` : ''}</td><td class="small">${fmtDate(r.end)}</td><td>${fmtPct(100 * r.capex / r.rev, 0)}</td><td>${r.cxOcf != null && r.cxOcf > 0 && r.cxOcf < 5 ? fmtPct(100 * r.cxOcf, 0) : 'n.s.'}</td><td>${r.rpo != null ? fmtBn(r.rpo / 1e6, r.rpo < 10e9 ? 1 : 0) : `<span class="muted">${es ? 'no etiquetado' : 'not tagged'}</span>`}</td><td>${r.rpo != null ? fmtY(r.rpo / r.rev) : '—'}</td><td>${r.nd != null ? fmtX(r.nd, 1) : '—'}${r.t === 'ORCL' && S ? `<span class="sub">${fmtX(S.ndEbitda, 2)} ${es ? 'en el modelo' : 'in the model'}</span>` : ''}</td><td>${r.land != null ? fmtX(r.land, 1) : '—'}${r.t === 'ORCL' && S ? `<span class="sub">${fmtX(S.leaseAdj, 2)} ${es ? 'sobre EBITDAR en el modelo' : 'on EBITDAR in the model'}</span>` : ''}</td></tr>`).join('')}</tbody></table>`);
    const top = rows.filter((r) => r.group !== 'neocloud').slice(0, 8);
    mkChart('chartHyp', { type: 'bar', data: { labels: top.map((r) => r.t), datasets: [
      { label: es ? 'Capex / ingresos UDM (%)' : 'TTM capex / revenue (%)', data: top.map((r) => 100 * r.capex / r.rev), backgroundColor: top.map((r) => (r.t === 'ORCL' ? c[1] : c[0])), yAxisID: 'y' },
      { label: es ? 'DN ajustada por arrendamientos / EBITDA (x)' : 'Lease-adjusted ND / EBITDA (x)', type: 'line', data: top.map((r) => r.land), borderColor: c[7], backgroundColor: c[7], pointRadius: 4, yAxisID: 'y2', showLine: false },
    ] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.dataset.yAxisID === 'y2' ? fmtX(x.parsed.y, 1) : fmtPct(x.parsed.y, 0)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, beginAtZero: true, title: { display: true, text: es ? 'capex / ingresos (barras)' : 'capex / revenue (bars)' } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => v + 'x' }, title: { display: true, text: es ? 'apalancamiento (puntos)' : 'leverage (points)' } } }, datasets: { bar: { maxBarThickness: 36, borderWidth: 0 } } } });
    el('hypCap').innerHTML = `${tier('T1', es ? 'SEC XBRL, datos de cada empresa' : 'SEC XBRL, each company\'s own facts')} ${tier('C', es ? 'razones calculadas por FNAM sobre cifras T1' : 'ratios computed by FNAM on T1 figures')} ${es ? 'Mismas definiciones y niveles de fuente que el <a href="/hiperescaladores/capex/">Hyperscaler Hub (módulo 3)</a>: UDM = cuatro trimestres XBRL consecutivos al último trimestre de cada empresa (cierres distintos); capex = compras de propiedades y equipo en efectivo; RPO como lo etiqueta cada empresa (Microsoft incluye contratos comerciales de software, no solo infraestructura); deuda neta ajustada = deuda − efectivo + pasivos por arrendamiento operativo y financiero ya reconocidos (nunca los no iniciados); EBITDA = utilidad de operación + D&A. El apalancamiento de Oracle en esta tabla usa EBITDA, no EBITDAR, para comparar con el hub. La gráfica muestra las seis grandes; los neoclouds solo en la tabla.' : 'Same definitions and source tiers as the <a href="/hiperescaladores/capex/">Hyperscaler Hub (module 3)</a>: TTM = four consecutive XBRL quarters to each company\'s latest quarter (period ends differ); capex = cash purchases of property and equipment; RPO as each company tags it (Microsoft includes commercial software contracts, not only infrastructure); lease-adjusted net debt = debt − cash + operating and finance lease liabilities already recognised (never the uncommenced ones); EBITDA = operating income + D&A. Oracle\'s leverage in this table uses EBITDA, not EBITDAR, to compare with the hub. The chart shows the core six; the neoclouds appear in the table only.'}${(() => { const o = rows.find((x) => x.t === 'ORCL'); if (!o || !S || !lastLTM || !lastLTM.is) return ''; return es ? ` <b>Por qué Oracle muestra ${fmtX(o.nd, 1)} y ${fmtX(o.land, 1)} aquí y ${fmtX(S.ndEbitda, 2)} y ${fmtX(S.leaseAdj, 2)} en el resto de la página.</b> Misma deuda neta y misma fecha (${fmtDate(o.end)}); el hub divide entre un EBITDA con la D&A etiquetada en XBRL (US$ ${fmtN((o.da || 0) / 1e9, 1)} mil M UDM), el modelo entre uno con la D&A del estado de flujos del comunicado (US$ ${fmtN(lastLTM.is.da / 1000, 1)} mil M) y, para la cifra ajustada, entre el EBITDAR (${ref('obligations')}).` : ` <b>Why Oracle shows ${fmtX(o.nd, 1)} and ${fmtX(o.land, 1)} here and ${fmtX(S.ndEbitda, 2)} and ${fmtX(S.leaseAdj, 2)} elsewhere on this page.</b> Same net debt and same date (${fmtDate(o.end)}); the hub divides by an EBITDA built with the XBRL-tagged D&A (US$ ${fmtN((o.da || 0) / 1e9, 1)} bn TTM), the model by one with the release cash-flow D&A (US$ ${fmtN(lastLTM.is.da / 1000, 1)} bn) and, for the adjusted figure, by EBITDAR (${ref('obligations')}).`; })()}${(() => { const o = rows.find((x) => x.t === 'ORCL'); if (!o || !S || !lastLTM || !lastLTM.is) return ''; return ` ${es ? 'Las dos D&A' : 'The two D&A figures'}: ${XB ? extLink(XB.source.url, es ? `SEC XBRL (DepreciationDepletionAndAmortization, cuatro trimestres al ${fmtDate(o.end)})` : `SEC XBRL (DepreciationDepletionAndAmortization, four quarters to ${fmtDate(o.end)})`) : 'SEC XBRL'} US$ ${fmtN((o.da || 0) / 1e9, 1)} ${es ? 'mil M' : 'bn'} · ${relLink()} (${es ? 'D&A del flujo de efectivo' : 'cash-flow D&A'}) US$ ${fmtN(lastLTM.is.da / 1000, 1)} ${es ? 'mil M' : 'bn'} · <a href="/hiperescaladores/capex/">Hyperscaler Hub</a>.`; })()}`;
    html('hypSrc', `${t('src')}: ${extLink('https://www.sec.gov/search-filings/edgar-application-programming-interfaces', 'SEC EDGAR XBRL company facts')} ${es ? 'vía' : 'via'} <a href="/hiperescaladores/">Hyperscaler Hub</a> (${es ? 'datos al' : 'data to'} ${fmtDate(rows.map((r) => r.end).sort().pop())}) · ${es ? 'Oracle: mismos datos XBRL; su cifra sobre EBITDAR está en' : 'Oracle: the same XBRL facts; its EBITDAR-based figure is in'} ${ref('obligations')}`);
  }
  // ---- glossary: the table in the Reference appendix and the first-use hover definitions
  const GLOSS = (REF.glossary || []).filter((g) => g && g.id);
  function renderGlossary() {
    if (!el('glossaryTable')) return; const es = LANG === 'es';
    const items = GLOSS.slice().sort((a, b) => (es ? a.term_es : a.term_en).localeCompare(es ? b.term_es : b.term_en, locale()));
    html('glossaryTable', `<table><tbody>${items.map((g) => `<tr id="gl-${g.id}"><td style="white-space:normal;min-width:160px"><b>${es ? g.term_es : g.term_en}</b></td><td class="small" style="white-space:normal;text-align:left">${es ? g.es : g.en}</td></tr>`).join('')}</tbody></table>`);
  }
  function glossify() {
    const main = document.querySelector('main'); if (!main || !GLOSS.length) return; const es = LANG === 'es';
    main.querySelectorAll('abbr.gl').forEach((a) => { a.replaceWith(document.createTextNode(a.textContent)); });
    const pending = GLOSS.map((g) => { const src = es ? g.match_es : g.match_en; if (!src) return null; try { return { g, re: new RegExp(src) }; } catch (e) { return null; } }).filter(Boolean);
    const skip = 'script,style,canvas,select,input,button,textarea,code,abbr,a,h2,.sec-num,.fignum,.stamp,.sec-stamp,#glossaryTable,#dcfInputs,.mono,.quote,.guide-quote,i,nav';
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !n.parentElement.closest(skip) && n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (let node of nodes) {
      if (!pending.length) break;
      let guard = 0;
      while (node && guard++ < 6) {
        const text = node.textContent; let best = null;
        for (const p of pending) { const m = p.re.exec(text); if (m && (!best || m.index < best.m.index)) best = { p, m }; }
        if (!best) break;
        const { p, m } = best; const abbr = document.createElement('abbr'); abbr.className = 'gl'; abbr.dataset.gl = p.g.id; abbr.title = `${es ? p.g.term_es : p.g.term_en}: ${es ? p.g.es : p.g.en}`; abbr.textContent = m[0];
        const after = node.splitText(m.index); after.textContent = after.textContent.slice(m[0].length); node.parentNode.insertBefore(abbr, after);
        pending.splice(pending.indexOf(p), 1); node = after;
      }
    }
  }
  // tap-friendly definition popover (the title attribute covers hover on a desktop)
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('abbr.gl'); const old = document.querySelector('.gl-pop'); if (old) old.remove();
    if (!a) return; e.preventDefault(); const g = GLOSS.find((x) => x.id === a.dataset.gl); if (!g) return; const es = LANG === 'es';
    const pop = document.createElement('div'); pop.className = 'gl-pop'; pop.innerHTML = `<b>${es ? g.term_es : g.term_en}</b>${es ? g.es : g.en} <a href="#gl-${g.id}">${es ? 'Glosario →' : 'Glossary →'}</a>`;
    document.body.appendChild(pop); const r = a.getBoundingClientRect(); const w = pop.offsetWidth; pop.style.top = `${window.scrollY + r.bottom + 6}px`; pop.style.left = `${Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - w - 8))}px`;
    pop.querySelector('a').addEventListener('click', () => { openSection('method'); pop.remove(); });
  });
  // ---- sticky section menu (phones): the same list as the top navigation, reachable from the thumb
  function renderMobileMenu() {
    let btn = el('secMenuBtn'), menu = el('secMenu'); const es = LANG === 'es';
    if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.id = 'secMenuBtn'; const bar = document.createElement('div'); bar.id = 'mobar'; document.body.appendChild(bar); bar.appendChild(btn); const tt = el('toTop'); if (tt) bar.appendChild(tt); menu = document.createElement('div'); menu.id = 'secMenu'; document.body.appendChild(menu); btn.addEventListener('click', () => menu.classList.toggle('open')); document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.classList.remove('open'); }); }
    btn.innerHTML = `☰ ${es ? 'Secciones' : 'Sections'}`;
    const idx = secIndex();
    menu.innerHTML = secList().map((s) => `<a href="#${s.id}" data-sec="${s.id}">${idx[s.id].n != null || idx[s.id].label ? `<span class="muted">${secNum(s.id)}</span>` : ''}${L({ es: s.nav_es, en: s.nav_en })}</a>`).join('');
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { openSection(a.dataset.sec); menu.classList.remove('open'); }));
  }
  function openSection(id) { if (!id || !secList().some((s) => s.id === id)) return; if (!openSet.has(id)) { openSet.add(id); saveCollapsed(); applyCollapse(); renderPaths(); } }
  window.addEventListener('hashchange', () => openSection(location.hash.replace('#', '')));
  document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1); if (secList().some((s) => s.id === id)) openSection(id); });

  // ================= wiring =================
  function seg(id, onChange) { const box = el(id); if (!box) return; box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); onChange(b.dataset.v); })); }
  function renderAll() {
    chartDefaults();
    renderHeader(); renderStatements(); renderGuidance(); renderOperating(); renderCapex(); renderBuildout(); renderShare(); renderDcf(); renderSummary(); renderRelative(); renderDebt(); renderDividends(); renderCapital(); renderAi(); renderUnitEconomics(); renderRpoRecognition(); renderBuildoutFlow(); renderObligations(); renderObViews(); renderLeaseMaturity(); renderObVie(); renderObProvenance(); renderCircular(); renderCredit(); renderNews(); renderRisks(); renderCalendar(); renderMethod(); renderModules(); renderChangelog();
    renderSourcesUses(); renderCounterparties(); renderRpoBridge(); renderMwTimeline(); renderHyperscalers(); renderGlossary();
    numberSections(); renderLeads(); applyStamps(); applyCollapse(); wireNav(); glossify(); renderMobileExtras();
  }
  // ---- phones (round 4): the first column of any table wider than the screen is pinned; the five longest tables open on
  // their key rows (the first eight plus totals and group heads) with a control that shows every row
  const KEY_ROW_TABLES = ['bookTable', 'obProvenance', 'glossaryTable', 'guideAll', 'aiUnitTable'], KEY_ROWS_KEEP = 8, keyRowsOpen = new Set();
  function markWideTables() { const narrow = window.innerWidth <= 760; document.querySelectorAll('main .tblwrap').forEach((w) => { const tb = w.querySelector('table'); w.classList.toggle('sticky1', !!tb && narrow && tb.scrollWidth > w.clientWidth + 8); }); }
  function limitRows() {
    const es = LANG === 'es';
    for (const id of KEY_ROW_TABLES) {
      const e = el(id); if (!e) continue; const tb = e.tagName === 'TABLE' ? e : e.querySelector('table'); if (!tb) continue; const wrap = tb.closest('.tblwrap') || tb.parentElement;
      const rows = [...tb.querySelectorAll('tbody tr')]; let btn = wrap.parentElement.querySelector(`.kr-btn[data-for="${id}"]`);
      if (rows.length <= KEY_ROWS_KEEP + 2) { if (btn) btn.remove(); wrap.classList.remove('kr-only'); continue; }
      const isKey = (tr, i) => i < KEY_ROWS_KEEP || /\b(total|bold|head|grp|grp-head)\b/.test(tr.className);
      rows.forEach((tr, i) => tr.classList.toggle('kr-hide', !isKey(tr, i)));
      const open = keyRowsOpen.has(id); wrap.classList.toggle('kr-only', !open);
      if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'kr-btn'; btn.dataset.for = id; wrap.insertAdjacentElement('afterend', btn); btn.addEventListener('click', () => { if (keyRowsOpen.has(id)) keyRowsOpen.delete(id); else keyRowsOpen.add(id); limitRows(); }); }
      const shown = rows.length - rows.filter((tr) => tr.classList.contains('kr-hide')).length;
      btn.textContent = open ? (es ? `Mostrar solo las filas clave (${shown} de ${rows.length})` : `Show key rows only (${shown} of ${rows.length})`) : (es ? `Mostrar las ${rows.length} filas` : `Show all ${rows.length} rows`);
      btn.setAttribute('aria-expanded', String(open));
    }
  }
  function renderMobileExtras() { markWideTables(); limitRows(); }
  window.addEventListener('resize', () => { clearTimeout(renderMobileExtras.t); renderMobileExtras.t = setTimeout(markWideTables, 150); });
  function setLang(lang) {
    LANG = lang;
    el('btnLangEs').classList.toggle('active', lang === 'es'); el('btnLangEn').classList.toggle('active', lang === 'en');
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es-MX' : 'en');
    document.title = lang === 'es' ? 'Oracle · Modelo financiero interactivo | Oracle Corporation (ORCL)' : 'Oracle · Interactive financial model | Oracle Corporation (ORCL)';
    const pc = document.querySelector('#printClose h2'); if (pc) pc.textContent = lang === 'es' ? 'Fuentes y metodología' : 'Sources and Methodology';
    document.querySelectorAll('.es').forEach((e) => { e.hidden = lang !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = lang !== 'en'; });
    try { localStorage.setItem('orcl-lang', lang); } catch (e) { /* ignore */ }
    fillSelects(); renderAll();
  }
  el('btnLangEs').addEventListener('click', () => setLang('es')); el('btnLangEn').addEventListener('click', () => setLang('en'));

  // ---------------- print as presentation ----------------
  function renderPrintExtras() {
    const conf = LANG === 'es' ? 'Confidencial. Preparado para uso interno del consejo; no distribuir.' : 'Confidential. Prepared for internal board use; do not distribute.';
    const today = todayET();
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
    if (on) { const kn = el('keyNumbersWrap'); if (kn) kn.open = true; prevTheme = root.getAttribute('data-theme'); root.setAttribute('data-theme', 'light'); if (hasChart()) { prevAnim = Chart.defaults.animation; Chart.defaults.animation = false; } renderAll(); renderPrintExtras(); if (hasChart()) for (const c of Object.values(Chart.instances)) { c.options.responsive = false; c.resize(930, 240); } }
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
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderAll());
  const toTop = el('toTop'); if (toTop) { const upd = () => toTop.classList.toggle('show', window.scrollY > 900); window.addEventListener('scroll', upd, { passive: true }); upd(); toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); }

  // Read-only view of the model for the presentation builder (present.js): the same data, helpers and
  // calculations the page renders, so the PDF and the screen can never disagree.
  window.ORCL_MODEL = {
    get LANG() { return LANG; }, t, L, LS, locale, fmtN, fmtM, fmtBn, fmtPct, fmtX, fmtDate, qLabel, qLabelId, ytdLabel, fyLabel, cls, addDays,
    FIN, MK, REF, PEERS, GD, CM, SUM, CDS, BO,
    Q, Y, lastQ, qById, prevQid, yoyQid, REV_LINES, revOnNewBasis, sumParts, fixRatios, combine, ytdFor, ltmFor, lastLTM,
    px, lastPoint, pointAtOrBefore, us10, US10, us10Last, us10Label, us10SrcName, orclPx, lastPx, sharesNow, sharesAt, qEndDate, netDebt,
    GV, isYoY, yoyCommentsFor, revValue, opsFor, GM, gRange, gMid, gActualFmt, gStatus, gActual, gNote, gCapexNote,
    boQ, boLabel, maturityBuckets, MAT_BUCKETS, fyOfDate, betaFromMarket, kdFromDebt,
    pctChange, OB, PL, obligStats, peerLeverage, SEC, NEWS, XB, RK, CL, secNum, secTitle, secNav, secList, moduleStatus, fmtET, nextExpectedFiling, xbQ, xbQuarters, xbInstant, parseCapexGuide, gCapexNote,
    FS, fsNtm, fsFiscal, peersOwnRow, dcfDefaults, dcfCompute, dcfPreset, bridgeClaims, dilutedShares, BETAS, deckList, sectionLeads, TAX, HYP,
    PRESET_LIST, priceNeeds, scenarioRange, leaseLabel, openaiTenants, openaiTenantsText, guaranteeStatus, maturedNote, uncNote, todayET, ltmLabel,
    REFRESHED_AT, chainBoxes, verdictHtml, dcfNow, dcfCheckSentence, dcfTruthRows, impliedWacc, impliedG, dcfPrice, presetLabel, DCF_EDIT_YEARS, ERP, KD, factText,
  };
  let initial = 'es'; try { initial = new URLSearchParams(location.search).get('lang') || localStorage.getItem('orcl-lang') || 'es'; } catch (e) { /* ignore */ }
  fillSelects('yoy');
  setLang(initial === 'en' ? 'en' : 'es');
})();
