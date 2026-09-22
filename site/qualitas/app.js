/* Quálitas interactive financial model — page logic.
   Data contracts (window.Q_*) are documented in tools/qualitas/README.md. Everything here is derived from
   those files at render time; no figures are hard-coded. Structure mirrors the GAP model (site/gap/app.js). */
(function () {
  'use strict';
  const FIN = window.Q_FIN || { quarters: [], ytd: [], years: [], layout: { is: [], bs: [], cf: [], kpi: [] } };
  const OPS = window.Q_OPS || { quarters: [] };
  const MK = window.Q_MARKET || { prices: {}, dividends: {}, fx: {}, rates: {} };
  const REF = window.Q_REF || {};
  const PEERS = window.Q_PEERS || { peers: [] };
  const GD = window.Q_GUIDANCE || { vintages: [] };
  const CM = window.Q_COMMENTS || { periods: {} };
  const SUM = window.Q_SUMMARY || { sections: [] };
  const GL = (window.Q_GLOSSARY && window.Q_GLOSSARY.terms) || {};
  const CONS = window.Q_CONSENSUS || null;
  const AL = (window.Q_ALERTS && window.Q_ALERTS.thresholds) || {};
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Browser-only conveniences (language, scenario slots, alert overrides, last-visit stamps); never data.
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } } };

  // ---------------- i18n ----------------
  let LANG = 'es';
  let PRINT = false;
  const lastN = () => (PRINT ? 8 : 12);
  const S = {
    quarter: { es: 'Trimestre', en: 'Quarter' }, ytd: { es: 'Acumulado', en: 'Year-to-date' }, ltm: { es: 'Últimos 12 meses', en: 'Last twelve months' }, fy: { es: 'Año fiscal', en: 'Fiscal year' },
    is: { es: 'Estado de resultados', en: 'Income statement' }, bs: { es: 'Balance general', en: 'Balance sheet' }, cf: { es: 'Estado de flujos de efectivo', en: 'Cash-flow statement' },
    line: { es: 'Concepto', en: 'Line item' }, change: { es: 'Δ', en: 'Δ' }, changePct: { es: 'Δ %', en: 'Δ %' },
    mxnM: { es: 'Ps. millones', en: 'Ps. million' }, usdM: { es: 'US$ millones', en: 'US$ million' },
    reported: { es: 'como se reporta', en: 'as reported' }, exVat: { es: 'sin el cargo del IVA del 4T25', en: 'excluding the 4Q25 VAT charge' },
    src: { es: 'Fuente', en: 'Source' }, release: { es: 'informe trimestral de Quálitas', en: 'Quálitas quarterly report' }, sific: { es: 'reporte SIFIC (CNSF/BMV)', en: 'SIFIC filing (CNSF/BMV)' }, workbook: { es: 'libro histórico de Quálitas', en: 'Quálitas historical workbook' },
    total: { es: 'Total', en: 'Total' }, metric: { es: 'Métrica', en: 'Metric' }, value: { es: 'Valor', en: 'Value' }, basis: { es: 'Base', en: 'Basis' },
    block: { es: 'Bloque', en: 'Block' }, cadence: { es: 'Cadencia', en: 'Cadence' }, mechanism: { es: 'Mecanismo', en: 'Mechanism' }, lastUpdate: { es: 'Última actualización', en: 'Last update' },
    ops: { es: 'Métricas operativas', en: 'Operating metrics' }, comments: { es: 'Comentarios', en: 'Comments' }, items: { es: 'conceptos', en: 'items' },
    cmtNote: { es: 'Comentarios (a/a) elaborados a partir de los informes trimestrales y las transcripciones de las conferencias de resultados.', en: 'Comments (y/y) written from the quarterly reports and the earnings-call transcripts.' },
    cmtOnlyYoy: { es: 'Los comentarios se muestran al comparar un periodo con el mismo periodo del año anterior.', en: 'Comments appear when a period is compared with the same period a year earlier.' },
    provisional: { es: 'Datos provisionales: faltan archivos de datos. Ejecute el flujo de actualización.', en: 'Provisional: data files missing. Run the refresh workflow.' },
    pending: { es: 'Pendiente (conector FactSet)', en: 'Pending (FactSet connector)' }, na: { es: 'n/d', en: 'n/a' },
    price: { es: 'Precio', en: 'Price' }, close: { es: 'cierre', en: 'close' }, high52: { es: 'Máx. 52 sem.', en: '52-wk high' }, low52: { es: 'Mín. 52 sem.', en: '52-wk low' }, ytdChg: { es: 'Var. en el año', en: 'YTD change' }, oneY: { es: 'Var. 1 año', en: '1-yr change' }, mktCap: { es: 'Capitalización', en: 'Market cap' },
    period: { es: 'Periodo', en: 'Period' }, ret: { es: 'Rendimiento', en: 'Return' }, year: { es: 'Año', en: 'Year' }, date: { es: 'Fecha', en: 'Date' }, type: { es: 'Tipo', en: 'Type' },
    initial: { es: 'Inicial', en: 'Initial' }, revised: { es: 'Revisada', en: 'Revised' }, reaffirmed: { es: 'Reafirmada', en: 'Reaffirmed' }, unchanged: { es: 'Sin cambios', en: 'Unchanged' },
    actual: { es: 'Real', en: 'Actual' }, tracking: { es: 'Seguimiento', en: 'Tracking' }, outcome: { es: 'Resultado', en: 'Outcome' }, within: { es: 'En rango', en: 'In range' }, above: { es: 'Por encima', en: 'Above' }, below: { es: 'Por debajo', en: 'Below' }, better: { es: 'Mejor que el rango', en: 'Better than range' }, worse: { es: 'Peor que el rango', en: 'Worse than range' }, ofYear: { es: 'del año', en: 'of the year' },
    guideFy: { es: 'Año', en: 'Year' }, guideStatus: { es: 'Estatus', en: 'Status' }, range: { es: 'Rango', en: 'Range' }, words: { es: 'En palabras de la administración', en: "In management's words" }, hits: { es: 'En rango o mejor', en: 'In range or better' },
    written: { es: 'Prima emitida', en: 'Written premiums' }, earned: { es: 'Prima devengada', en: 'Earned premiums' }, netIncome: { es: 'Utilidad neta', en: 'Net income' }, rif: { es: 'RIF', en: 'RIF' },
    lossRatio: { es: 'Índice de siniestralidad', en: 'Loss ratio' }, combined: { es: 'Índice combinado', en: 'Combined ratio' }, acqRatio: { es: 'Índice de adquisición', en: 'Acquisition ratio' }, opRatio: { es: 'Índice de operación', en: 'Operating ratio' },
    roe: { es: 'ROE', en: 'ROE' }, roe12: { es: 'ROE 12M', en: '12M ROE' }, roePeriod: { es: 'ROE del periodo (anualizado)', en: 'Period ROE (annualised)' }, rsi: { es: 'RSI (rendimiento sobre inversiones)', en: 'RSI (return on investments)' },
    solvIndex: { es: 'Índice de solvencia', en: 'Solvency index' }, rcs: { es: 'RCS', en: 'RCS' }, solvMargin: { es: 'Margen de solvencia', en: 'Solvency margin' }, reserves: { es: 'Reservas técnicas', en: 'Technical reserves' }, equity: { es: 'Capital contable', en: "Stockholders' equity" }, float: { es: 'Activos invertidos (float)', en: 'Invested assets (float)' },
    fiPct: { es: 'Renta fija, % del portafolio', en: 'Fixed income, % of portfolio' }, duration: { es: 'Duración (años)', en: 'Duration (years)' },
    units: { es: 'Unidades aseguradas (miles)', en: 'Insured units (thousands)' }, unitsTotal: { es: 'Unidades aseguradas totales', en: 'Total insured units' }, unitsMx: { es: 'México', en: 'Mexico' }, unitsIntl: { es: 'Subsidiarias internacionales', en: 'International subsidiaries' },
    premTrad: { es: 'Tradicional (individual + flotillas)', en: 'Traditional (individual + fleets)' }, premInd: { es: 'Individual', en: 'Individual' }, premFleet: { es: 'Flotillas', en: 'Fleets' }, premFin: { es: 'Instituciones financieras', en: 'Financial institutions' }, premIntl: { es: 'Subsidiarias en el extranjero', en: 'Foreign subsidiaries' }, premTotal: { es: 'Prima emitida total', en: 'Total written premiums' },
    perUnit: { es: 'Métricas por unidad asegurada', en: 'Per-insured-unit metrics' }, wpPerUnit: { es: 'Prima emitida por unidad', en: 'Written premium per unit' }, earnedPerUnit: { es: 'Prima devengada por unidad', en: 'Earned premium per unit' }, claimsPerUnit: { es: 'Costo de siniestros por unidad', en: 'Claims cost per unit' },
    unitsHead: { es: 'Unidades aseguradas al cierre (miles)', en: 'Insured units at period-end (thousands)' }, premHead: { es: 'Prima emitida por línea de negocio', en: 'Written premiums by line of business' },
    dps: { es: 'Dividendo por acción (Ps.)', en: 'Dividend per share (Ps.)' }, payout: { es: 'Razón de pago', en: 'Payout ratio' }, yield: { es: 'Rendimiento', en: 'Yield' }, agm: { es: 'Aprobado en asamblea', en: 'Approved at AGM' }, buybacks: { es: 'Recompras', en: 'Buybacks' }, dividends: { es: 'Dividendos', en: 'Dividends' },
    pe: { es: 'P/U', en: 'P/E' }, pbv: { es: 'P/VL', en: 'P/BV' }, bvps: { es: 'Valor en libros por acción', en: 'Book value per share' }, eps: { es: 'UPA', en: 'EPS' }, ltm: { es: 'UDM', en: 'LTM' },
    perShare: { es: 'Valor por acción (Ps.)', en: 'Value per share (Ps.)' }, upside: { es: 'vs. precio actual', en: 'vs. current price' },
    agency: { es: 'Agencia', en: 'Agency' }, entity: { es: 'Entidad', en: 'Entity' }, rating: { es: 'Calificación', en: 'Rating' }, outlook: { es: 'Perspectiva', en: 'Outlook' },
    subsidiary: { es: 'Subsidiaria', en: 'Subsidiary' }, country: { es: 'País', en: 'Country' }, note: { es: 'Nota', en: 'Note' },
    mexico: { es: 'México', en: 'Mexico' }, cars: { es: 'Automóviles (MX)', en: 'Cars (MX)' }, trucks: { es: 'Camiones (MX)', en: 'Trucks (MX)' }, motos: { es: 'Motocicletas (MX)', en: 'Motorcycles (MX)' }, c_sv: 'El Salvador', c_cr: 'Costa Rica', c_us: { es: 'Estados Unidos', en: 'United States' }, c_pe: { es: 'Perú', en: 'Peru' }, c_co: 'Colombia',
    es_: 'Quálitas El Salvador', cr_: 'Quálitas Costa Rica', ic_: 'Quálitas Insurance Co. (US)', pe_: 'Quálitas Perú', co_: 'Quálitas Colombia', verticals_: { es: 'Verticales', en: 'Verticals' },
  };
  const t = (k) => (S[k] ? (typeof S[k] === 'string' ? S[k] : S[k][LANG]) : k);
  const L = (obj) => (obj ? (typeof obj === 'string' ? obj : (LANG === 'es' ? obj.es || obj.en : obj.en || obj.es)) : '');
  const LS = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v : L(v));

  // ---------------- formatting ----------------
  const locale = () => (LANG === 'es' ? 'es-MX' : 'en-US');
  const fmtN = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }));
  const fmtM = (vThousands, d = 0) => fmtN(vThousands / 1000, d);
  const fmtPct = (v, d = 1, sign = false) => (v == null || !isFinite(v) ? '—' : (sign && v > 0 ? '+' : '') + v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + '%');
  const fmtPp = (v, d = 1) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + fmtN(v, d) + ' pp');
  const fmtX = (v, d = 1) => (v == null || !isFinite(v) ? '—' : v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + 'x');
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')); return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const qLabel = (q) => (LANG === 'es' ? `${q.q}T${String(q.fy).slice(2)}` : `${q.q}Q${String(q.fy).slice(2)}`);
  const ytdLabel = (fy, months) => `${months}M${String(fy).slice(2)}`;
  const cls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const clsInv = (v) => (v == null ? '' : v > 0 ? 'neg' : v < 0 ? 'pos' : ''); // lower is better (cost ratios)
  const el = (id) => document.getElementById(id);
  const html = (id, s) => { const e = el(id); if (e) e.innerHTML = s; };
  const bn = () => (LANG === 'es' ? 'mil M' : 'bn');

  // ---------------- theme + chart defaults ----------------
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (document.documentElement.getAttribute('data-theme') !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const SERIES = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cssVar('--series-' + i));
  const hasChart = () => typeof Chart !== 'undefined';
  function chartDefaults() {
    if (!hasChart()) return;
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = cssVar('--muted');
    Chart.defaults.borderColor = cssVar('--grid');
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.boxHeight = 10; Chart.defaults.plugins.legend.labels.usePointStyle = false;
    Chart.defaults.plugins.tooltip.backgroundColor = isDark() ? '#2a2a27' : '#0b0b0b';
    Chart.defaults.plugins.tooltip.titleFont = { family: 'Inter', weight: '700', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { family: 'Inter', size: 12 };
    Chart.defaults.plugins.tooltip.padding = 10; Chart.defaults.plugins.tooltip.cornerRadius = 6; Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.interaction = { mode: 'index', intersect: false };
    Chart.defaults.elements.line.borderWidth = 2; Chart.defaults.elements.line.tension = 0.15; Chart.defaults.elements.point.radius = 0; Chart.defaults.elements.point.hoverRadius = 4;
    Chart.defaults.elements.bar.borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }; Chart.defaults.elements.bar.borderSkipped = 'bottom';
    Chart.defaults.maintainAspectRatio = false;
    if (REDUCED) Chart.defaults.animation = false;
  }
  const charts = {};
  function mkChart(id, cfg) {
    const cv = el(id); if (!cv || !hasChart()) return null;
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    const ex = Chart.getChart(cv); if (ex) ex.destroy();
    cfg.options = cfg.options || {};
    cfg.options.scales = cfg.options.scales || {};
    for (const k of Object.keys(cfg.options.scales)) { const sc = cfg.options.scales[k]; sc.grid = Object.assign({ color: cssVar('--grid'), drawTicks: false, lineWidth: 1 }, sc.grid || {}); sc.border = Object.assign({ color: cssVar('--baseline') }, sc.border || {}); sc.ticks = Object.assign({ padding: 6 }, sc.ticks || {}); }
    charts[id] = new Chart(cv, cfg);
    return charts[id];
  }
  const axisM = (d = 0) => ({ callback: (v) => fmtN(v, d) });
  const legendTop = { display: true, position: 'top', align: 'end' };

  // ---------------- data prep ----------------
  const Q = FIN.quarters.filter((q) => q.is && q.is.written != null);
  const Y = FIN.years;
  const YTD = FIN.ytd;
  const lastQ = Q[Q.length - 1];
  const qById = Object.fromEntries(FIN.quarters.map((q) => [q.id, q]));
  const ytdById = Object.fromEntries(YTD.map((y) => [y.id, y]));
  const opsById = Object.fromEntries((OPS.quarters || []).map((o) => [o.id, o]));
  const prevQid = (q) => (q.q === 1 ? `${q.fy - 1}Q4` : `${q.fy}Q${q.q - 1}`);
  const yoyQid = (q) => `${q.fy - 1}Q${q.q}`;
  const sumParts = (objs) => { const o = {}; for (const x of objs) for (const [k, v] of Object.entries(x || {})) if (typeof v === 'number') o[k] = (o[k] || 0) + v; return o; };
  const POINT_KPI = ['units', 'rcs', 'solvMargin', 'solvIndex', 'fiPct', 'duration', 'float', 'invTotal', 'roe12', 'roePeriod', 'acqRatioRep', 'lossRatioRep', 'opRatioRep', 'combinedRep', 'combinedAdjRep'];
  // Ratios recomputed from an income statement (same formulas as scripts/qualitas/build_data.py).
  function ratiosFrom(is, sharesK) {
    const k = {}; if (!is) return k; const g = (x) => is[x];
    if (g('acqCost') != null && g('retained')) k.acqRatio = 100 * g('acqCost') / g('retained');
    if (g('lossCost') != null && g('earned')) k.lossRatio = 100 * g('lossCost') / g('earned');
    if (g('opex') != null && g('written')) k.opRatio = 100 * g('opex') / g('written');
    if (k.acqRatio != null && k.lossRatio != null && k.opRatio != null) k.combined = k.acqRatio + k.lossRatio + k.opRatio;
    if (g('acqCost') != null && g('lossCost') != null && g('opex') != null && g('earned')) k.combinedAdj = 100 * (g('acqCost') + g('lossCost') + g('opex')) / g('earned');
    if (g('techResult') != null && g('earned')) k.techMargin = 100 * g('techResult') / g('earned');
    if (g('opResult') != null && g('earned')) k.opMargin = 100 * g('opResult') / g('earned');
    if (g('netIncome') != null && g('written')) k.netMargin = 100 * g('netIncome') / g('written');
    if (g('retained') != null && g('written')) k.retention = 100 * g('retained') / g('written');
    if (g('ibt') && g('tax') != null) k.taxRate = 100 * g('tax') / g('ibt');
    if (g('netIncome') != null && sharesK) k.eps = g('netIncome') * 1000 / sharesK;
    return k;
  }
  const pointKpi = (q) => { const o = {}; if (q && q.kpi) for (const k of POINT_KPI) if (q.kpi[k] != null) o[k] = q.kpi[k]; return o; };
  const sharesOf = (q) => (q && q.shares && q.shares.current) || (REF.shares && REF.shares.issued) || null;
  const quarterObj = (q) => ({ ...q, label: qLabel(q), qid: q.id, covers: [q.id], kpi: { ...ratiosFrom(q.is, sharesOf(q)), ...(q.kpi || {}) } });
  // YTD for a quarter: reported YTD record if present; else the sum of the year's quarters to date.
  function ytdFor(q) {
    if (q.q === 1) return { ...quarterObj(q), id: ytdLabel(q.fy, 3), label: ytdLabel(q.fy, 3), months: 3 };
    const covers = []; for (let i = 1; i <= q.q; i++) covers.push(`${q.fy}Q${i}`);
    const y = ytdById[`${q.fy}M${q.q * 3}`];
    if (y && y.is) return { ...y, id: ytdLabel(q.fy, q.q * 3), label: ytdLabel(q.fy, q.q * 3), bs: q.bs, q: q.q, qid: q.id, covers, shares: q.shares, kpi: { ...ratiosFrom(y.is, sharesOf(q)), ...(y.kpi || {}), ...pointKpi(q) } };
    const qs = covers.map((id) => qById[id]); if (qs.some((x) => !x || !x.is)) return null;
    const is = sumParts(qs.map((x) => x.is)), cf = qs.every((x) => x.cf) ? sumParts(qs.map((x) => x.cf)) : null;
    return { id: ytdLabel(q.fy, q.q * 3), label: ytdLabel(q.fy, q.q * 3), fy: q.fy, months: q.q * 3, is, cf, bs: q.bs, q: q.q, qid: q.id, covers, shares: q.shares, sources: q.sources, derived: true, kpi: { ...ratiosFrom(is, sharesOf(q)), ...pointKpi(q) } };
  }
  // LTM for a quarter: sum of the last four quarters (FY record when the quarter is a Q4).
  function ltmFor(q) {
    const covers = []; let fy = q.fy, qq = q.q;
    for (let i = 0; i < 4; i++) { covers.unshift(`${fy}Q${qq}`); qq--; if (qq === 0) { qq = 4; fy--; } }
    const qs = covers.map((id) => qById[id]);
    const label = 'LTM ' + qLabel(q);
    if (qs.every((x) => x && x.is)) {
      const is = sumParts(qs.map((x) => x.is)), cf = qs.every((x) => x.cf) ? sumParts(qs.map((x) => x.cf)) : null;
      return { id: label, label, is, cf, bs: q.bs, fy: q.fy, q: q.q, qid: q.id, covers, shares: q.shares, sources: q.sources, derived: true, kpi: { ...ratiosFrom(is, sharesOf(q)), ...pointKpi(q) } };
    }
    if (q.q === 4) { const y = Y.find((yy) => yy.fy === q.fy); if (y) return { id: label, label, is: y.is, cf: y.cf, bs: q.bs, fy: q.fy, q: 4, qid: q.id, covers, shares: q.shares, sources: y.sources, kpi: { ...ratiosFrom(y.is, sharesOf(q)), ...(y.kpi || {}), ...pointKpi(q) } }; }
    return null;
  }
  const fyObj = (y) => { const q4 = qById[`${y.fy}Q4`]; const covers = [1, 2, 3, 4].map((i) => `${y.fy}Q${i}`); return { ...y, label: 'FY' + y.fy, q: 4, qid: `${y.fy}Q4`, covers, bs: y.bs || (q4 && q4.bs), shares: y.shares && y.shares.current ? y.shares : (q4 && q4.shares), kpi: { ...ratiosFrom(y.is, sharesOf(q4 || y)), ...(y.kpi || {}), ...pointKpi(q4) } }; };
  // The one-off 4Q25 VAT charge (reference.js → vat.adjust): strip it from any period that covers 4Q25.
  const VAT = REF.vat && REF.vat.adjust;
  function exVat(obj) {
    if (!obj || !VAT || !obj.covers || !obj.covers.includes(VAT.quarter) || !obj.is) return obj;
    const c = VAT.claimsMxnM * 1000, n = VAT.netIncomeMxnM * 1000, tax = c - n;
    const is = { ...obj.is };
    for (const k of ['lossCost', 'lossGross']) if (is[k] != null) is[k] -= c;
    for (const k of ['techResult', 'grossProfit', 'opResult', 'ibt']) if (is[k] != null) is[k] += c;
    if (is.tax != null) is.tax += tax;
    for (const k of ['netBeforeDisc', 'netIncome', 'netControlling']) if (is[k] != null) is[k] += n;
    const q = qById[obj.qid];
    return { ...obj, is, kpi: { ...obj.kpi, ...ratiosFrom(is, sharesOf(q || obj)) }, exVat: true };
  }
  const lastLTM = lastQ ? ltmFor(lastQ) : null;
  const lastYTD = lastQ ? ytdFor(lastQ) : null;

  // Market helpers
  const px = (id) => (MK.prices && MK.prices[id] && MK.prices[id].points) || [];
  const lastPoint = (pts) => (pts.length ? pts[pts.length - 1] : null);
  const pointAtOrBefore = (pts, date) => { let lo = 0, hi = pts.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= date) { ans = pts[mid]; lo = mid + 1; } else hi = mid - 1; } return ans; };
  const fxPts = (MK.fx && MK.fx.USDMXN && MK.fx.USDMXN.points) || [];
  const fxAt = (date) => { const p = pointAtOrBefore(fxPts, date); return p ? p[1] : null; };
  const mx10 = (MK.rates && MK.rates.MX10Y && MK.rates.MX10Y.points) || [];
  const TICK = 'Q.MX';
  const qPx = px(TICK); const lastPx = lastPoint(qPx);
  const sharesIssued = (REF.shares && REF.shares.issued) || (lastQ && sharesOf(lastQ)) || null;
  const sharesOut = sharesIssued ? sharesIssued - ((REF.shares && REF.shares.treasuryApprox) || 0) : null; // for market cap and value per share
  const qEndDate = (q) => `${q.fy}-${String(q.q * 3).padStart(2, '0')}-${q.q === 1 || q.q === 4 ? '31' : '30'}`;
  const bvps = (q) => (q && q.bs && q.bs.totalEquity && sharesOut ? q.bs.totalEquity * 1000 / sharesOut : null);
  const divs12m = (date) => { const pts = (MK.dividends && MK.dividends[TICK] && MK.dividends[TICK].points) || []; const from = addDays(date, -365); return pts.filter((p) => p[0] > from && p[0] <= date).reduce((a, p) => a + p[1], 0); };
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const epsLtm = (obj) => (obj && obj.is && obj.is.netIncome != null && sharesIssued ? obj.is.netIncome * 1000 / sharesIssued : null);
  const opsLast = (OPS.quarters || []).filter((e) => e.units && e.units.total).pop() || null;

  // ---------------- glossary + provenance tooltips ----------------
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const glTerm = (k) => (GL[k] && GL[k][LANG]) || null;
  const glLabel = (k, label) => (glTerm(k) ? `<span class="gl" data-gl="${k}" tabindex="0">${label}</span>` : label);
  const srcName = (s) => (!s ? '' : s.workbook ? t('workbook') : /SIFIC/i.test(s.title || '') ? t('sific') : t('release'));
  // data-prov = source document and date + the figure as printed (thousands of pesos) before conversion to millions / USD
  const VAT_KEYS = { lossCost: 1, lossGross: 1, techResult: 1, grossProfit: 1, opResult: 1, ibt: 1, tax: 1, netBeforeDisc: 1, netIncome: 1, netControlling: 1 };
  function prov(obj, key, def, raw) {
    if (!obj || raw == null) return '';
    const s = (obj.sources && obj.sources[key]) || null;
    const parts = [];
    if (s) parts.push(`${srcName(s)}${s.date ? ' · ' + fmtDate(s.date) : ''}${s.comparative ? (LANG === 'es' ? ' (columna comparativa)' : ' (comparative column)') : ''}${s.derived ? ' · ' + (LANG === 'es' ? 'diferencia de dos reportes acumulados' : 'difference of two cumulative filings') : ''}`);
    if (obj.derived && obj.covers && obj.covers.length > 1) parts.push((LANG === 'es' ? 'suma de ' : 'sum of ') + obj.covers.join(', '));
    if (obj.exVat && (VAT_KEYS[def.k] || def.kpi)) parts.push(t('exVat'));
    // statements are stored in thousands; the documents print pesos (the workbook prints millions)
    const wb = s && s.workbook;
    const orig = def.pct ? fmtPct(raw, 2) : def.perShare ? 'Ps. ' + fmtN(raw, 4) : def.units ? fmtN(raw, 0) : wb ? 'Ps. ' + fmtN(raw / 1000, 0) + (LANG === 'es' ? ' millones (como se publica en el libro histórico)' : ' million (as printed in the historical workbook)') : 'Ps. ' + fmtN(raw * 1000, 0) + (LANG === 'es' ? ' pesos (como se imprime)' : ' pesos (as printed)');
    return ` data-prov="${esc(parts.join(' · '))}" data-orig="${esc(orig)}" tabindex="0"`;
  }
  function provOps(o, raw, kind) {
    if (!o || !o.source || raw == null) return '';
    const s = o.source;
    // the report prints premiums by line in millions and units in thousands
    const orig = kind === 'k' ? 'Ps. ' + fmtN(raw / 1000, 0) + (LANG === 'es' ? ' millones (como se imprime)' : ' million (as printed)') : kind === 'u' ? fmtN(raw, 0) + (LANG === 'es' ? ' mil unidades (como se imprime)' : ' thousand units (as printed)') : (LANG === 'es' ? 'cálculo: cifra del estado de resultados ÷ unidades al cierre' : 'computed: income-statement figure ÷ period-end units');
    return ` data-prov="${esc(`${t('release')}${s.date ? ' · ' + fmtDate(s.date) : ''}${s.comparative ? (LANG === 'es' ? ' (columna comparativa del informe del año siguiente)' : " (comparative column of the following year's report)") : ''}`)}" data-orig="${esc(orig)}" tabindex="0"`;
  }
  function showTip(target) {
    const tip = el('tip'); if (!tip) return;
    let body = '';
    if (target.dataset.gl) { const g = glTerm(target.dataset.gl); if (!g) return; body = `<b>${esc(g.t)}</b>${esc(g.d)}`; }
    else if (target.dataset.prov != null) body = `<b>${esc(target.dataset.orig || '')}</b>${esc(target.dataset.prov)}<div class="m">${LANG === 'es' ? 'Fuente y cifra tal como se reporta' : 'Source and figure as reported'}</div>`;
    else return;
    tip.innerHTML = body; tip.hidden = false; tip.dataset.for = (target.dataset.gl || '') + '|' + (target.dataset.prov || '') + '|' + (target.dataset.orig || '');
    const r = target.getBoundingClientRect(); const w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.min(Math.max(8, r.left), window.innerWidth - w - 8); let y = r.top - h - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { const tip = el('tip'); if (tip) { tip.hidden = true; tip.dataset.for = ''; } }
  const tipTarget = (e) => e.target.closest && e.target.closest('[data-gl],[data-prov]');
  document.addEventListener('mouseover', (e) => { const x = tipTarget(e); if (x) showTip(x); });
  document.addEventListener('mouseout', (e) => { if (tipTarget(e)) hideTip(); });
  document.addEventListener('focusin', (e) => { const x = tipTarget(e); if (x) showTip(x); });
  document.addEventListener('focusout', () => hideTip());
  document.addEventListener('click', (e) => { const x = tipTarget(e); if (!x) { hideTip(); return; } const tip = el('tip'); const key = (x.dataset.gl || '') + '|' + (x.dataset.prov || '') + '|' + (x.dataset.orig || ''); if (tip && !tip.hidden && tip.dataset.for === key) hideTip(); else showTip(x); });
  window.addEventListener('scroll', hideTip, { passive: true });

  // ---------------- management quotes (comments.js → quotes) ----------------
  const QALIAS = { lossCost: 'lossRatio', acqCost: 'acqRatio', opex: 'opRatio', netControlling: 'netIncome', roe12: 'roe', roePeriod: 'roe', solvIndex: 'solvency', unitsMx: 'unitsTotal', premFin: 'written', earnedPerUnit: 'earned', claimsPerUnit: 'lossRatio' };
  function quotesFor(C, k) { if (!C || !C.quotes) return null; const q = C.quotes[k] || C.quotes[QALIAS[k]]; return q && q.length ? q : null; }
  function quotesHtml(qs, date) {
    return `<button type="button" class="quotes-btn" aria-expanded="false" data-qt title="${LANG === 'es' ? 'Citas de la administración' : 'Management quotes'}">💬 ${qs.length}</button><div class="quotes" hidden>${qs.map((q) => `<div class="quote"><span class="who">${esc(q.who)} <span>· ${esc(L(q.role))}${date ? ' · ' + fmtDate(date) : ''}</span></span>“${esc(L(q))}”</div>`).join('')}</div>`;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-qt]'); if (!b) return; const box = b.nextElementSibling; const open = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', open ? 'false' : 'true'); if (box) box.hidden = open; });

  // ================= HEADER =================
  function renderHeader() {
    const es = LANG === 'es';
    const asof = [];
    if (lastQ) asof.push(`<span><b>${es ? 'Último trimestre' : 'Latest quarter'}:</b> ${qLabel(lastQ)} · ${es ? 'publicado el' : 'released'} ${fmtDate(lastQ.sources && lastQ.sources.is && lastQ.sources.is.date)}</span>`);
    if (opsLast) asof.push(`<span><b>${es ? 'Último periodo operativo' : 'Latest operating period'}:</b> ${qLabel(opsLast)} (${fmtN(opsLast.units.total)} ${es ? 'mil unidades' : 'k units'})</span>`);
    if (lastPx) asof.push(`<span><b>${es ? 'Cierre de mercado' : 'Market close'}:</b> ${fmtDate(lastPx[0])}</span>`);
    if (FIN.generatedAt) asof.push(`<span><b>${es ? 'Datos construidos' : 'Data build'}:</b> ${fmtDate(FIN.generatedAt.slice(0, 10))}</span>`);
    if (SUM.updatedAt) asof.push(`<span><b>${es ? 'Última revisión' : 'Last review'}:</b> ${fmtDate(SUM.updatedAt)}</span>`);
    html('asofRow', asof.join(''));
    const notice = el('dataNotice');
    if (!Q.length || !qPx.length) { notice.hidden = false; notice.className = 'notice warn'; notice.textContent = t('provisional'); } else notice.hidden = true;
    const k = [];
    if (lastPx) { const yAgo = pointAtOrBefore(qPx, addDays(lastPx[0], -365)); k.push({ l: 'Q* (BMV)', v: 'Ps. ' + fmtN(lastPx[1], 2), d: yAgo ? `<span class="${cls(lastPx[1] - yAgo[1])}">${fmtPct(100 * (lastPx[1] / yAgo[1] - 1), 1, true)}</span> ${t('oneY')}` : '' }); }
    if (lastPx && sharesOut) { const mc = lastPx[1] * sharesOut; k.push({ l: t('mktCap'), v: 'Ps. ' + fmtN(mc / 1e9, 1) + ' ' + bn(), d: fxAt(lastPx[0]) ? 'US$ ' + fmtN(mc / fxAt(lastPx[0]) / 1e9, 2) + ' ' + bn() : '' }); }
    if (lastLTM && lastLTM.is.netIncome != null) { const ex = exVat(lastLTM); k.push({ l: `${t('netIncome')} ${t('ltm')}`, v: 'Ps. ' + fmtM(lastLTM.is.netIncome) + ' M', d: `${t('roe12')} ${fmtPct(lastQ.kpi && lastQ.kpi.roe12)}${ex.is.netIncome !== lastLTM.is.netIncome ? ` · Ps. ${fmtM(ex.is.netIncome)} M ${t('exVat')}` : ''}` }); }
    if (lastLTM && lastLTM.kpi.combined != null) { const ex = exVat(lastLTM); k.push({ l: `${t('combined')} ${t('ltm')}`, v: fmtPct(lastLTM.kpi.combined), d: `${t('lossRatio')} ${fmtPct(lastLTM.kpi.lossRatio)}${ex.kpi.combined !== lastLTM.kpi.combined ? ` · ${fmtPct(ex.kpi.combined)} ${t('exVat')}` : ''} · ${t('solvIndex')} ${fmtPct(lastQ.kpi && lastQ.kpi.solvIndex, 0)}` }); }
    if (lastPx && lastLTM) { const e = epsLtm(lastLTM), ex = epsLtm(exVat(lastLTM)); const bv = bvps(lastQ); k.push({ l: `${t('pe')} ${t('ltm')} · ${t('pbv')}`, v: `${fmtX(e ? lastPx[1] / e : null)} · ${fmtX(bv ? lastPx[1] / bv : null, 2)}`, d: ex && ex !== e ? `${t('pe')} ${fmtX(lastPx[1] / ex)} ${t('exVat')}` : `${t('eps')} ${t('ltm')} Ps. ${fmtN(e, 2)}` }); }
    html('kpiStrip', k.map((x) => `<div class="kpi"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="delta">${x.d || ''}</div></div>`).join(''));
    el('genStamp').textContent = fmtDate((FIN.generatedAt || MK.generatedAt || '').slice(0, 10));
    renderSince(); renderAlerts();
  }
  // "What changed since your last visit": compare the data files' stamps with the ones stored at the previous visit.
  const STAMPS = () => ({ fin: FIN.generatedAt || '', q: lastQ ? lastQ.id : '', ops: opsLast ? opsLast.id : '', mk: MK.generatedAt || '', px: lastPx ? lastPx[0] : '', sum: SUM.updatedAt || '', cm: CM.updatedAt || '', gd: GD.updatedAt || '', ref: REF.updatedAt || '' });
  let sinceDiff = null;
  function computeSince() {
    const now = STAMPS(); const prev = store.get('q-seen', null);
    sinceDiff = { prev, now };
    store.set('q-seen', now);
  }
  function sinceItems() {
    const items = []; if (!sinceDiff || !sinceDiff.prev) return items;
    const { prev, now } = sinceDiff; const es = LANG === 'es';
    if (now.q !== prev.q) items.push({ t: es ? `Nuevo trimestre reportado: ${lastQ ? qLabel(lastQ) : now.q}` : `New reported quarter: ${lastQ ? qLabel(lastQ) : now.q}`, href: '#statements' });
    else if (now.fin !== prev.fin) items.push({ t: es ? `Estados financieros regenerados (${fmtDate(now.fin.slice(0, 10))})` : `Financial statements rebuilt (${fmtDate(now.fin.slice(0, 10))})`, href: '#statements' });
    if (now.ops !== prev.ops) items.push({ t: es ? `Nuevo periodo operativo: ${opsLast ? qLabel(opsLast) : now.ops}` : `New operating period: ${opsLast ? qLabel(opsLast) : now.ops}`, href: '#drivers' });
    if (now.gd !== prev.gd) items.push({ t: es ? 'Expectativas de la administración actualizadas' : "Management's expectations updated", href: '#guidance' });
    if (now.cm !== prev.cm) items.push({ t: es ? 'Comentarios de los estados financieros actualizados' : 'Statement comments updated', href: '#statements' });
    if (now.sum !== prev.sum) items.push({ t: es ? 'Resumen ejecutivo reescrito' : 'Executive summary rewritten', href: '#summary' });
    if (now.ref !== prev.ref) items.push({ t: es ? 'Hechos de referencia actualizados (dividendos, calificaciones, acciones, eventos)' : 'Reference facts updated (dividends, ratings, shares, events)', href: '#capital' });
    if (now.px !== prev.px && lastPx) { const p0 = prev.px ? pointAtOrBefore(qPx, prev.px) : null; const chg = p0 ? ` (Q* ${fmtPct(100 * (lastPx[1] / p0[1] - 1), 1, true)} ${es ? 'desde su última visita' : 'since your last visit'})` : ''; items.push({ t: (es ? 'Precios al ' : 'Prices through ') + fmtDate(now.px) + chg, href: '#share' }); }
    return items;
  }
  function renderSince() {
    const b = el('sinceBanner'); if (!b) return;
    const items = sinceItems();
    if (!items.length || b.dataset.closed) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = `<button type="button" class="close" aria-label="${LANG === 'es' ? 'Cerrar' : 'Close'}">×</button><b>${LANG === 'es' ? 'Novedades desde su última visita' : 'What changed since your last visit'}</b> <span class="small">(${LANG === 'es' ? 'visita anterior' : 'previous visit'}: ${sinceDiff.prev.px ? fmtDate(sinceDiff.prev.px) : '—'})</span><ul>${items.map((x) => `<li><a href="${x.href}">${x.t}</a></li>`).join('')}</ul>`;
    b.querySelector('.close').addEventListener('click', () => { b.hidden = true; b.dataset.closed = '1'; });
  }
  // Alert thresholds: data/alerts.js defaults, overridden per browser in section 11.
  const alertVals = () => { const o = {}; const ov = store.get('q-alerts', {}); for (const k of Object.keys(AL)) o[k] = ov[k] != null ? +ov[k] : AL[k].value; return o; };
  function evalAlerts() {
    const v = alertVals(); const out = [];
    const es = LANG === 'es';
    if (qPx.length > 6) {
      const c = qPx[qPx.length - 1][1], p1 = qPx[qPx.length - 2][1], p5 = qPx[qPx.length - 6][1];
      const m1 = 100 * (c / p1 - 1), m5 = 100 * (c / p5 - 1);
      if (v.shareMovePct1d && Math.abs(m1) >= v.shareMovePct1d) out.push(es ? `Q* ${fmtPct(m1, 1, true)} en un día (${fmtDate(lastPx[0])})` : `Q* ${fmtPct(m1, 1, true)} in one day (${fmtDate(lastPx[0])})`);
      if (v.shareMovePct5d && Math.abs(m5) >= v.shareMovePct5d) out.push(es ? `Q* ${fmtPct(m5, 1, true)} en cinco días hábiles` : `Q* ${fmtPct(m5, 1, true)} in five trading days`);
    }
    if (lastQ) {
      const o = quarterObj(lastQ);
      if (v.combinedRatioMaxPct && o.kpi.combined != null && o.kpi.combined > v.combinedRatioMaxPct) out.push(`${t('combined')} ${qLabel(lastQ)}: ${fmtPct(o.kpi.combined)} > ${fmtPct(v.combinedRatioMaxPct, 0)}`);
      if (v.lossRatioMaxPct && o.kpi.lossRatio != null && o.kpi.lossRatio > v.lossRatioMaxPct) out.push(`${t('lossRatio')} ${qLabel(lastQ)}: ${fmtPct(o.kpi.lossRatio)} > ${fmtPct(v.lossRatioMaxPct, 0)}`);
      if (v.solvencyIndexMinPct && o.kpi.solvIndex != null && o.kpi.solvIndex < v.solvencyIndexMinPct) out.push(`${t('solvIndex')} ${qLabel(lastQ)}: ${fmtPct(o.kpi.solvIndex, 0)} < ${fmtPct(v.solvencyIndexMinPct, 0)}`);
      if (v.roe12MinPct && o.kpi.roe12 != null && o.kpi.roe12 < v.roe12MinPct) out.push(`${t('roe12')} ${qLabel(lastQ)}: ${fmtPct(o.kpi.roe12)} < ${fmtPct(v.roe12MinPct, 0)}`);
    }
    if (v.guidanceTracking) { const vs = vintagesSorted(); const cur = vs[vs.length - 1]; const act = cur && gActual(cur.fy); if (cur && act) for (const m of G_METRICS) { const s = gStatus(m, cur.items[m], act[m]); if (s === 'below' || s === 'worse') out.push(`${gLabel(m)} ${act.label}: ${m === 'written' || m === 'rif' ? fmtPct(act[m], 1, true) : fmtPct(act[m])} ${es ? 'fuera del rango' : 'outside the range'} ${gRangeTxt(cur.items[m])} (${t(s)})`); } }
    if (v.mx10yMoveBp1w && mx10.length > 1) { const d = 100 * (mx10[mx10.length - 1][1] - mx10[mx10.length - 2][1]); if (Math.abs(d) >= v.mx10yMoveBp1w) out.push(es ? `Bono M 10 años ${d > 0 ? '+' : ''}${fmtN(d, 0)} pb vs el dato anterior (${fmtDate(mx10[mx10.length - 1][0])})` : `10-year M bond ${d > 0 ? '+' : ''}${fmtN(d, 0)} bp vs the previous point (${fmtDate(mx10[mx10.length - 1][0])})`); }
    return out;
  }
  function renderAlerts() {
    const b = el('alertBanner'); if (!b) return;
    let items = []; try { items = evalAlerts(); } catch (e) { items = []; }
    if (!items.length || b.dataset.closed) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = `<button type="button" class="close" aria-label="${LANG === 'es' ? 'Cerrar' : 'Close'}">×</button><b>${LANG === 'es' ? 'Umbrales de alerta superados' : 'Alert thresholds crossed'}</b> <span class="small">(<a href="#alertsCard">${LANG === 'es' ? 'ajustar' : 'adjust'}</a>)</span><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    b.querySelector('.close').addEventListener('click', () => { b.hidden = true; b.dataset.closed = '1'; });
  }

  // ================= 00 EXECUTIVE SUMMARY =================
  function renderSummary() {
    const b = SUM.basis || {};
    const qq = b.quarter && (qById[b.quarter] || { fy: +b.quarter.slice(0, 4), q: +b.quarter.slice(5) });
    html('sumMeta', LANG === 'es'
      ? `Con base en los resultados del ${qq ? qLabel(qq) : '—'} (${fmtDate(b.resultsDate)}), la conferencia del ${fmtDate(b.callDate)} y las expectativas del ${fmtDate(b.guidanceDate)} · redactado el ${fmtDate(SUM.updatedAt)}; se reescribe con cada reporte nuevo. Las cifras de mercado del encabezado son diarias.`
      : `Based on ${qq ? qLabel(qq) : '—'} results (${fmtDate(b.resultsDate)}), the ${fmtDate(b.callDate)} call and the expectations of ${fmtDate(b.guidanceDate)} · written ${fmtDate(SUM.updatedAt)}; rewritten with each new report. Market figures in the header are daily.`);
    html('sumGrid', (SUM.sections || []).map((sec) => `<div class="card"><h3>${L(sec.title)}</h3><ul>${(sec[LANG] || sec.en || []).map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join(''));
  }

  // ================= 01 STATEMENTS =================
  const st = { stmt: 'is', mode: 'q', a: null, b: null, exVat: false, usd: false, open: {} };
  function periodOptions() {
    if (st.mode === 'fy') return Y.map((y) => { const o = fyObj(y); return { id: y.id, label: o.label, obj: o }; });
    if (st.mode === 'q') return Q.map((q) => ({ id: q.id, label: qLabel(q), obj: quarterObj(q) }));
    if (st.mode === 'ytd') return Q.map((q) => { const y = ytdFor(q); return y ? { id: q.id, label: y.label, obj: y } : null; }).filter(Boolean);
    return Q.map((q) => { const l = ltmFor(q); return l ? { id: q.id, label: l.label, obj: l } : null; }).filter(Boolean);
  }
  function defaultPair(opts, preset) {
    const a = opts[opts.length - 1]; if (!a) return [null, null];
    const qa = qById[a.id] || {}; let bid;
    if (st.mode === 'fy') bid = `FY${(Y.find((y) => y.id === a.id) || {}).fy - 1}`;
    else bid = preset === 'qoq' && st.mode === 'q' ? prevQid(qa) : yoyQid(qa);
    const b = opts.find((o) => o.id === bid) || opts[opts.length - 2] || null;
    return [a, b];
  }
  function fillSelects(preset) {
    const opts = periodOptions();
    const [a, b] = defaultPair(opts, preset);
    const mk = (sel, chosen) => { sel.innerHTML = opts.map((o) => `<option value="${o.id}"${chosen && o.id === chosen.id ? ' selected' : ''}>${o.label}</option>`).join(''); };
    if (!st.a || !opts.find((o) => o.id === st.a) || preset) st.a = a && a.id;
    if (!st.b || !opts.find((o) => o.id === st.b) || preset) st.b = b && b.id;
    mk(el('selA'), opts.find((o) => o.id === st.a)); mk(el('selB'), opts.find((o) => o.id === st.b));
  }
  const pick = (opts, id) => { const o = (opts.find((x) => x.id === id) || {}).obj; return st.exVat ? exVat(o) : o; };
  function convert(v, def, obj) {
    if (v == null) return null;
    if (def.pct || def.perShare || def.units) return v;
    if (!st.usd) return v;
    const rate = st.stmt === 'bs' ? fxAt(qEndDate(obj)) : avgFx(obj);
    return rate ? v / rate : null;
  }
  function avgFx(obj) {
    const end = qEndDate(obj);
    const months = st.mode === 'q' ? 3 : st.mode === 'ytd' ? (obj.months || obj.q * 3) : 12;
    const start = addDays(end, -30 * months);
    const pts = fxPts.filter((p) => p[0] > start && p[0] <= end);
    return pts.length ? pts.reduce((a, p) => a + p[1], 0) / pts.length : null;
  }
  function commentsFor(A, B) {
    if (!A || !B) return null;
    const yoy = st.mode === 'q' ? (B.fy === A.fy - 1 && B.q === A.q) : st.mode === 'ytd' ? (B.fy === A.fy - 1 && B.months === A.months) : st.mode === 'fy' ? (B.fy === A.fy - 1) : false;
    if (!yoy) return null;
    const ck = st.mode === 'q' ? A.id : st.mode === 'ytd' ? `${A.fy}M${A.months}` : A.id;
    const P = CM.periods || {};
    const c = P[ck] || null;
    // balance-sheet comments are keyed by the period-end quarter
    const cb = P[A.qid] || null;
    const qsrc = (c && c.quotes) ? c : (cb && cb.quotes) ? cb : (P[A.qid] && P[A.qid].quotes) ? P[A.qid] : null;
    return { lines: (c && c.lines) || {}, ops: (c && c.ops) || {}, bs: (cb && cb.bs) || (c && c.bs) || {}, cf: (c && c.cf) || {}, call: c && c.call, any: !!(c || cb), quotes: qsrc && qsrc.quotes, callDate: qsrc && qsrc.call && qsrc.call.date };
  }
  function renderStatements() {
    const opts = periodOptions();
    const A = pick(opts, st.a), B = pick(opts, st.b);
    const layout = FIN.layout[st.stmt] || [];
    const key = st.stmt;
    const rawGet = (obj, def) => { if (!obj) return null; const src = def.kpi ? obj.kpi : obj[key]; if (!src) return null; const v = src[def.k]; return v == null ? null : v; };
    const get = (obj, def) => { const v = rawGet(obj, def); return v == null ? null : convert(v, def, obj); };
    const C = commentsFor(A, B);
    const cmap = C ? (key === 'is' ? C.lines : key === 'bs' ? C.bs : C.cf) : null;
    // collapsible detail: level-2 rows fold under the preceding level-0/1 row
    const groups = {}; let head = null;
    for (const d of layout) { if (d.level === 2 && head) { (groups[head] = groups[head] || []).push(d.k); } else if (d.level !== 2) head = d.k; }
    const rows = [];
    let curHead = null;
    for (const def of layout) {
      if (def.level !== 2) curHead = def.k;
      if (def.level === 2 && !st.open[curHead]) continue;
      const va = get(A, def), vb = get(B, def);
      if (va == null && vb == null) continue;
      const d = va != null && vb != null ? va - vb : null;
      const pct = d != null && vb ? 100 * d / Math.abs(vb) : null;
      const isPct = def.pct, isPs = def.perShare;
      const f = (v) => (v == null ? '—' : isPct ? fmtPct(v) : isPs ? fmtN(v, 2) : fmtM(v, st.usd ? 1 : 0));
      const fd = d == null ? '—' : isPct ? fmtPp(d) : isPs ? fmtN(d, 2) : fmtM(d, st.usd ? 1 : 0);
      const isHead = !!groups[def.k];
      const qs = quotesFor(C, def.k);
      const cmt = `<td class="cmt">${cmap && cmap[def.k] ? L(cmap[def.k]) : ''}${qs ? quotesHtml(qs, C.callDate) : ''}</td>`;
      const first = isHead ? `<td data-g="${def.k}" role="button" tabindex="0" aria-expanded="${st.open[def.k] ? 'true' : 'false'}"><span class="grp">${st.open[def.k] ? '▾' : '▸'}</span>${glLabel(def.k, L(def))}<span class="cnt">${groups[def.k].length} ${t('items')}</span></td>` : `<td>${glLabel(def.k, L(def))}</td>`;
      const costRatio = def.kpi && ['acqRatio', 'lossRatio', 'opRatio', 'combined', 'combinedAdj', 'taxRate'].includes(def.k);
      const dcls = costRatio ? clsInv(d) : cls(d);
      rows.push(`<tr class="${isHead ? 'grp-head ' : ''}${def.kpi ? 'kpi ' : ''}${def.level === 0 || def.bold ? 'bold' : def.level === 2 ? 'sub2' : def.level === 1 ? 'sub' : ''}">${first}<td${prov(A, key, def, rawGet(A, def))}>${f(va)}</td><td${prov(B, key, def, rawGet(B, def))}>${f(vb)}</td><td class="${dcls}">${fd}</td><td class="${dcls}">${isPct ? '' : fmtPct(pct, 1, true)}</td>${cmt}</tr>`);
    }
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    if (!rows.length) rows.push(`<tr><td colspan="6" class="muted">${key === 'cf' ? (LANG === 'es' ? 'Sin estado de flujos de efectivo para este periodo: el reporte SIFIC correspondiente es sólo imagen o no está publicado. Use el modo acumulado (6M/9M/12M) o el año fiscal.' : 'No cash-flow statement for this period: the corresponding SIFIC filing is image-only or not published. Use the year-to-date (6M/9M/12M) or fiscal-year mode.') : (LANG === 'es' ? 'Sin datos para este periodo.' : 'No data for this period.')}</td></tr>`);
    html('stmtTable', `<table class="stmt-table"><thead><tr><th>${t('line')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th><th class="cmt">${t('comments')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('stmtTitle').textContent = `${t(st.stmt)} · ${la} vs ${lb}`;
    const unit = st.usd ? t('usdM') : t('mxnM');
    el('stmtCap').textContent = `${unit}${st.stmt === 'is' ? ' · ' + (st.exVat ? t('exVat') : t('reported')) : ''}${st.usd ? (LANG === 'es' ? ' · convertido con el tipo de cambio promedio (flujos) o de cierre (balance) de la Fed H.10' : ' · converted at the Fed H.10 average (flows) or period-end (balance sheet) rate') : ''}${(A && A.derived) || (B && B.derived) ? (LANG === 'es' ? ' · periodos acumulados/UDM calculados a partir de trimestres reportados' : ' · YTD/LTM periods computed from reported quarters') : ''}${st.stmt === 'cf' ? (LANG === 'es' ? ' · flujo de efectivo según los reportes SIFIC (trimestral = diferencia de acumulados); no disponible para los trimestres cuyo reporte es sólo imagen' : ' · cash flow from the SIFIC filings (quarterly = difference of cumulative statements); unavailable for quarters whose filing is image-only') : ''} · ${C && C.any ? t('cmtNote') : t('cmtOnlyYoy')}`;
    const srcs = [A, B].filter(Boolean).map((o) => o.sources && o.sources[key]).filter(Boolean);
    const srcLabel = (s) => (s.workbook ? t('workbook') : /SIFIC/i.test(s.title || '') ? t('sific') : t('release'));
    html('stmtSrc', `${t('src')}: ` + [...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${srcLabel(s)}${s.date ? ` (${fmtDate(s.date)})` : ''}</a>`).join(' · ') + (C && C.call ? ' · ' + L(C.call) : ''));
    const first = Q[0];
    html('stmtMeta', LANG === 'es'
      ? `Cobertura: ${Q.length} trimestres (${qLabel(first)} → ${qLabel(lastQ)}), ${Y.length} años fiscales (${Y[0] ? 'FY' + Y[0].fy : ''} → ${Y.length ? 'FY' + Y[Y.length - 1].fy : ''}). Cifras en pesos nominales tal como las reporta Quálitas (criterios CNSF); miles convertidos a millones. Antes de 2019 sólo las líneas principales (libro histórico).`
      : `Coverage: ${Q.length} quarters (${qLabel(first)} → ${qLabel(lastQ)}), ${Y.length} fiscal years (${Y[0] ? 'FY' + Y[0].fy : ''} → ${Y.length ? 'FY' + Y[Y.length - 1].fy : ''}). Nominal pesos as reported by Quálitas (CNSF criteria); thousands shown in millions. Before 2019 only the main lines (historical workbook).`);
    renderOps(A, B, C); renderPremMix(); renderCombinedChart(); renderMargins(); renderKpiTable(); updateHash();
  }
  // ---- Operating metrics: insured units (period-end) and written premiums by line from the reports.
  function opsFor(obj) {
    if (!obj) return null;
    const end = opsById[obj.qid]; if (!end && !obj.is) return null;
    const units = (end && end.units) || {};
    let prem = null;
    if (st.mode === 'q') prem = end && end.premiums;
    else if (st.mode === 'ytd') prem = end && (obj.months === 3 ? end.premiums : end.premiumsYtd);
    else if (st.mode === 'fy') prem = end && end.premiumsYtd;
    else { const es = (obj.covers || []).map((id) => opsById[id]); if (es.every((e) => e && e.premiums && e.premiums.total)) prem = sumParts(es.map((e) => e.premiums)); }
    prem = prem || {};
    const u = units.total || (obj.kpi && obj.kpi.units) || null;
    const per = (v) => (v != null && u ? v / u : null); // thousand pesos / thousand units = pesos per unit
    const is = obj.is || {};
    return {
      unitsTotal: u, unitsMx: units.mx || null, unitsIntl: units.total && units.mx ? units.total - units.mx : null,
      premInd: prem.ind || null, premFleet: prem.fleet || null, premFin: prem.fin || null, premIntl: prem.intl || null, premTotal: prem.total || null,
      wpPerUnit: per(is.written), earnedPerUnit: per(is.earned), claimsPerUnit: per(is.lossCost),
      source: end && end.source,
    };
  }
  function renderOps(A, B, C) {
    const oa = opsFor(A), ob = opsFor(B);
    const fxA = st.usd && A ? avgFx(A) : null, fxB = st.usd && B ? avgFx(B) : null;
    const ops = C && C.ops;
    const rows = [];
    const head = (label) => rows.push(`<tr class="head"><td colspan="6">${label}</td></tr>`);
    const row = (label, k, opt = {}) => {
      const ra = oa ? oa[k] : null, rb = ob ? ob[k] : null;
      let va = ra, vb = rb;
      if (opt.money && st.usd) { va = va != null && fxA ? va / fxA : null; vb = vb != null && fxB ? vb / fxB : null; }
      if (va == null && vb == null) return;
      const d = va != null && vb != null ? va - vb : null;
      const pct = d != null && vb ? 100 * d / Math.abs(vb) : null;
      const dec = opt.money ? (st.usd ? 1 : 0) : opt.k ? 0 : 1;
      const f = (v) => (v == null ? '—' : opt.k ? fmtM(v, st.usd ? 1 : 0) : fmtN(v, dec));
      const kind = opt.k ? 'k' : opt.money ? 'c' : 'u';
      const qs = quotesFor(C, k);
      rows.push(`<tr class="${opt.cls || ''}"><td>${glLabel(k, label)}</td><td${provOps(oa, ra, kind)}>${f(va)}</td><td${provOps(ob, rb, kind)}>${f(vb)}</td><td class="${cls(d)}">${d == null ? '—' : opt.k ? fmtM(d, st.usd ? 1 : 0) : fmtN(d, dec)}</td><td class="${cls(pct)}">${fmtPct(pct, 1, true)}</td><td class="cmt">${ops && ops[k] ? L(ops[k]) : ''}${qs ? quotesHtml(qs, C.callDate) : ''}</td></tr>`);
    };
    head(t('unitsHead'));
    row(t('unitsMx'), 'unitsMx', { cls: 'sub', k: false });
    row(t('unitsIntl'), 'unitsIntl', { cls: 'sub' });
    row(t('unitsTotal'), 'unitsTotal', { cls: 'bold' });
    head(`${t('premHead')} (${st.usd ? t('usdM') : t('mxnM')})`);
    row(t('premInd'), 'premInd', { cls: 'sub', k: true, money: true });
    row(t('premFleet'), 'premFleet', { cls: 'sub', k: true, money: true });
    row(t('premFin'), 'premFin', { cls: 'sub', k: true, money: true });
    row(t('premIntl'), 'premIntl', { cls: 'sub', k: true, money: true });
    row(t('premTotal'), 'premTotal', { cls: 'bold', k: true, money: true });
    head(`${t('perUnit')} (${st.usd ? 'US$' : 'Ps.'})`);
    row(t('wpPerUnit'), 'wpPerUnit', { money: true });
    row(t('earnedPerUnit'), 'earnedPerUnit', { money: true });
    row(t('claimsPerUnit'), 'claimsPerUnit', { money: true });
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('opsTable', `<table class="stmt-table"><thead><tr><th>${t('metric')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th><th class="cmt">${t('comments')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('opsTitle').textContent = `${t('ops')} · ${la} vs ${lb}`;
    el('opsCap').textContent = LANG === 'es'
      ? `Unidades aseguradas al cierre del periodo y prima emitida por línea según el informe trimestral (las líneas no siempre suman el total por ajustes de consolidación). Métricas por unidad = cifra del estado de resultados del periodo ÷ unidades al cierre${st.usd ? ', convertidas al tipo de cambio promedio de la Fed H.10' : ''}. ${C && C.any ? t('cmtNote') : t('cmtOnlyYoy')}`
      : `Insured units at period-end and written premiums by line from the quarterly report (lines do not always add to the total because of consolidation adjustments). Per-unit metrics = income-statement figure for the period ÷ period-end units${st.usd ? ', converted at the Fed H.10 average rate' : ''}. ${C && C.any ? t('cmtNote') : t('cmtOnlyYoy')}`;
    const srcs = [oa, ob].filter((o) => o && o.source && o.source.url).map((o) => o.source);
    html('opsSrc', srcs.length ? `${t('src')}: ` + [...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${t('release')} (${fmtDate(s.date)})</a>`).join(' · ') : '');
  }
  function renderPremMix() {
    const qs = Q.slice(-lastN()).filter((q) => opsById[q.id] && opsById[q.id].premiums);
    const c = SERIES();
    const g = (q, k) => { const p = opsById[q.id].premiums; return p && p[k] != null ? p[k] / 1000 : null; };
    const ds = [
      { label: t('premInd'), data: qs.map((q) => g(q, 'ind')), backgroundColor: c[0], stack: 'p' },
      { label: t('premFleet'), data: qs.map((q) => g(q, 'fleet')), backgroundColor: c[1], stack: 'p' },
      { label: t('premFin'), data: qs.map((q) => g(q, 'fin')), backgroundColor: c[2], stack: 'p' },
      { label: t('premIntl'), data: qs.map((q) => g(q, 'intl')), backgroundColor: c[3], stack: 'p' },
    ];
    mkChart('chartPremMix', { type: 'bar', data: { labels: qs.map(qLabel), datasets: ds }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    const src = qs.length && opsById[qs[qs.length - 1].id].source;
    html('premMixSrc', src && src.url ? `${t('src')}: <a href="${src.url}" target="_blank" rel="noopener">${t('release')} ↗</a>` : '');
  }
  function renderCombinedChart() {
    const qs = Q.slice(-lastN());
    const c = SERIES();
    const kp = (q, k) => { const o = quarterObj(q); return o.kpi[k] != null ? Math.round(o.kpi[k] * 10) / 10 : null; };
    const lt = GD.longTerm && GD.longTerm.combined;
    const ds = [
      { type: 'bar', label: t('lossRatio'), data: qs.map((q) => kp(q, 'lossRatio')), backgroundColor: c[1], stack: 'c', order: 2 },
      { type: 'bar', label: t('acqRatio'), data: qs.map((q) => kp(q, 'acqRatio')), backgroundColor: c[0], stack: 'c', order: 2 },
      { type: 'bar', label: t('opRatio'), data: qs.map((q) => kp(q, 'opRatio')), backgroundColor: c[3], stack: 'c', order: 2 },
      { type: 'line', label: t('combined'), data: qs.map((q) => kp(q, 'combined')), borderColor: c[6], backgroundColor: c[6], pointRadius: 3, fill: false, order: 1 },
    ];
    if (lt) { ds.push({ type: 'line', label: `${LANG === 'es' ? 'Objetivo' : 'Target'} ${lt.lo}%`, data: qs.map(() => lt.lo), borderColor: cssVar('--baseline'), borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false, order: 3 }); ds.push({ type: 'line', label: `${LANG === 'es' ? 'Objetivo' : 'Target'} ${lt.hi}%`, data: qs.map(() => lt.hi), borderColor: cssVar('--baseline'), borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false, order: 3 }); }
    mkChart('chartCombined', { type: 'bar', data: { labels: qs.map(qLabel), datasets: ds }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, suggestedMin: 0, suggestedMax: 105 } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
  }
  function renderMargins() {
    const qs = Q.slice(-lastN());
    const c = SERIES();
    const kp = (q, k) => { const o = quarterObj(q); return o.kpi[k] != null ? Math.round(o.kpi[k] * 10) / 10 : null; };
    const ds = [
      { label: t('techMargin'), data: qs.map((q) => kp(q, 'techMargin')), borderColor: c[0], backgroundColor: c[0], pointRadius: 3 },
      { label: t('opMargin'), data: qs.map((q) => kp(q, 'opMargin')), borderColor: c[1], backgroundColor: c[1], pointRadius: 3 },
      { label: t('netMargin'), data: qs.map((q) => kp(q, 'netMargin')), borderColor: c[2], backgroundColor: c[2], pointRadius: 3 },
    ];
    const vals = ds.flatMap((d) => d.data).filter((v) => v != null);
    const lo = vals.length ? Math.floor(Math.min(...vals) / 2) * 2 - 2 : 0;
    mkChart('chartMargins', { type: 'line', data: { labels: qs.map(qLabel), datasets: ds }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { min: lo, ticks: { callback: (v) => v + '%' } } } } });
    html('marginsSrc', `${t('src')}: ${LANG === 'es' ? 'estado de resultados de cada informe trimestral; márgenes calculados por el modelo' : "each quarterly report's income statement; margins computed by the model"}`);
  }
  function renderKpiTable() {
    const qs = Q.slice(-lastN());
    const yoy = (q, f, pp) => { const p = qById[yoyQid(q)]; const a = f(q), b = p && f(p); if (a == null || b == null) return null; return pp ? a - b : (b ? 100 * (a / b - 1) : null); };
    const ko = (q) => quarterObj(q).kpi;
    const rowsDef = [
      { k: 'written', l: t('written') + ' (Ps. M)', f: (q) => q.is.written / 1000, fmt: (v) => fmtN(v) },
      { k: 'earned', l: t('earned') + ' (Ps. M)', f: (q) => q.is.earned != null ? q.is.earned / 1000 : null, fmt: (v) => fmtN(v) },
      { k: 'lossRatio', l: t('lossRatio'), f: (q) => ko(q).lossRatio, fmt: (v) => fmtPct(v), pp: true, inv: true },
      { k: 'combined', l: t('combined'), f: (q) => ko(q).combined, fmt: (v) => fmtPct(v), pp: true, inv: true },
      { k: 'rif', l: t('rif') + ' (Ps. M)', f: (q) => q.is.rif != null ? q.is.rif / 1000 : null, fmt: (v) => fmtN(v) },
      { k: 'netIncome', l: t('netIncome') + ' (Ps. M)', f: (q) => q.is.netIncome != null ? q.is.netIncome / 1000 : null, fmt: (v) => fmtN(v) },
      { k: 'rsi', l: t('rsi'), f: (q) => ko(q).rsi, fmt: (v) => fmtPct(v), pp: true },
      { k: 'roe12', l: t('roe12'), f: (q) => ko(q).roe12, fmt: (v) => fmtPct(v), pp: true },
      { k: 'units', l: t('units'), f: (q) => ko(q).units, fmt: (v) => fmtN(v) },
      { k: 'solvIndex', l: t('solvIndex'), f: (q) => ko(q).solvIndex, fmt: (v) => fmtPct(v, 0), pp: true },
    ];
    const head = `<tr><th>${t('metric')}</th>${qs.map((q) => `<th>${qLabel(q)}</th>`).join('')}</tr>`;
    const body = rowsDef.map((r) => `<tr><td>${glLabel(r.k, r.l)}</td>${qs.map((q) => { const v = r.f(q); const y = yoy(q, r.f, r.pp); const c = r.inv ? clsInv(y) : cls(y); return `<td>${r.fmt(v)}${y != null ? `<br><span class="small ${c}">${r.pp ? fmtPp(y) : fmtPct(y, 1, true)}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
    html('kpiTable', `<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
    const srcs = [...new Map(qs.map((q) => q.sources && q.sources.is).filter((s) => s && s.url).map((s) => [s.url, s])).values()];
    html('kpiSrc', `${t('src')}: ${srcs.slice(-4).map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${srcName(s)}${s.date ? ` (${fmtDate(s.date)})` : ''}</a>`).join(' · ')}${srcs.length > 4 ? ` · ${LANG === 'es' ? 'y los informes anteriores' : 'and earlier reports'}` : ''} · ${LANG === 'es' ? 'índices, RSI, ROE y solvencia como los reporta Quálitas o recalculados del estado de resultados' : 'ratios, RSI, ROE and solvency as reported by Quálitas or recomputed from the income statement'}`);
  }

  // ================= 02 EXPECTATIONS =================
  const gs = { metric: 'written' };
  const G_METRICS = ['written', 'lossRatio', 'combined', 'rif', 'roe'];
  const gLabel = (m) => (m === 'written' ? (LANG === 'es' ? 'Prima emitida (crecimiento)' : 'Written premiums (growth)') : m === 'rif' ? 'RIF' : m === 'roe' ? 'ROE' : t(m));
  const gIsCost = (m) => m === 'lossRatio' || m === 'combined';
  const gRangeTxt = (it) => (it && it.lo != null && it.hi != null ? `${fmtN(it.lo, 0)}–${fmtN(it.hi, 0)}%` : it && it.lo != null ? `≥ ${fmtN(it.lo, 0)}%` : '—');
  const vintagesSorted = () => (GD.vintages || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  // Actual for a guided year: closed year = FY vs FY−1; open year = YTD vs prior YTD (ratios level, ROE = period ROE annualised).
  function gActual(fy) {
    const y = Y.find((yy) => yy.fy === fy), yp = Y.find((yy) => yy.fy === fy - 1);
    if (y && y.is) { const o = fyObj(y); return { closed: true, label: 'FY' + fy, written: yp && yp.is && yp.is.written ? 100 * (y.is.written / yp.is.written - 1) : null, lossRatio: o.kpi.lossRatio, combined: o.kpi.combined, roe: o.kpi.roe12 != null ? o.kpi.roe12 : null, rif: y.is.rif != null && yp && yp.is && yp.is.rif ? 100 * (y.is.rif / yp.is.rif - 1) : null }; }
    const qs = Q.filter((q) => q.fy === fy); if (!qs.length) return null;
    const last = qs[qs.length - 1], cur = ytdFor(last), prev = ytdById[`${fy - 1}M${last.q * 3}`] || (last.q === 1 ? qById[`${fy - 1}Q1`] : null);
    if (!cur) return null;
    return { closed: false, label: cur.label, written: prev && prev.is && prev.is.written ? 100 * (cur.is.written / prev.is.written - 1) : null, lossRatio: cur.kpi.lossRatio, combined: cur.kpi.combined, roe: cur.kpi.roePeriod != null ? cur.kpi.roePeriod : cur.kpi.roe12, rif: prev && prev.is && prev.is.rif && cur.is.rif != null ? 100 * (cur.is.rif / prev.is.rif - 1) : null };
  }
  function gStatus(m, it, v) {
    if (!it || v == null || it.lo == null) return null;
    const hi = it.hi != null ? it.hi : Infinity;
    if (gIsCost(m)) return v < it.lo ? 'better' : v <= hi ? 'within' : 'worse';
    return v > hi ? 'above' : v >= it.lo ? 'within' : 'below';
  }
  const chip = (s) => (s ? `<span class="guide-chip ${s === 'better' || s === 'above' ? 'above' : s === 'worse' || s === 'below' ? 'below' : 'within'}">${t(s)}</span>` : '');
  function renderGuidance() {
    const vs = vintagesSorted(); if (!vs.length) return;
    const cur = vs[vs.length - 1];
    const act = gActual(cur.fy);
    el('guideCurTitle').textContent = `${LANG === 'es' ? 'Expectativas vigentes para' : 'Expectations in force for'} ${cur.fy} · ${L(cur.source && cur.source.title)}`;
    el('guideCurCap').textContent = LANG === 'es' ? `Publicadas el ${fmtDate(cur.date)} (${t(cur.kind)}) · seguimiento con el ${act ? act.label : '—'} reportado` : `Published ${fmtDate(cur.date)} (${t(cur.kind)}) · tracked against the reported ${act ? act.label : '—'}`;
    const curP = (CM.periods || {})[cur.quarter] || null;
    const rows = G_METRICS.filter((m) => cur.items[m]).map((m) => { const it = cur.items[m]; const v = act ? act[m] : null; const s = gStatus(m, it, v); const qs = quotesFor(curP, m); return `<tr><td>${glLabel(m, gLabel(m))}</td><td>${gRangeTxt(it)}</td><td class="txt">${L(it.text)}${qs ? quotesHtml(qs, curP.call && curP.call.date) : ''}</td><td>${v == null ? '—' : m === 'written' || m === 'rif' ? fmtPct(v, 1, true) : fmtPct(v)}</td><td>${chip(s)}</td></tr>`; });
    html('guideCurrent', `<table class="guide-table"><thead><tr><th>${t('metric')}</th><th>${t('range')}</th><th style="text-align:left">${t('words')}</th><th>${t('actual')} ${act ? act.label : ''}</th><th>${t('guideStatus')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    html('guideText', (cur.notes && cur.notes[LANG] || []).map((x) => `<p class="guide-quote">${x}</p>`).join('') || `<p class="guide-quote muted">—</p>`);
    html('guideCurSrc', `${t('src')}: <a href="${cur.source.url}" target="_blank" rel="noopener">${L(cur.source.title)} ↗</a> · ${GD.basis || ''}`);
    // history: one row per vintage (latest first), cells shaded when the range changed vs the previous vintage of the same year
    const hist = vs.slice(-8).reverse();
    const hrows = hist.map((v, i) => { const prev = vs.filter((x) => x.fy === v.fy && x.date < v.date).pop(); const cells = G_METRICS.map((m) => { const it = v.items[m], pit = prev && prev.items[m]; const txt = gRangeTxt(it); const ptxt = gRangeTxt(pit); const changed = prev && txt !== ptxt; return `<td class="${changed ? 'chg' : ''}">${txt}${changed ? `<span class="was">${ptxt}</span>` : ''}</td>`; }).join(''); return `<tr><td>${fmtDate(v.date)}<span class="sub">${v.quarter ? qLabel({ fy: +v.quarter.slice(0, 4), q: +v.quarter.slice(5) }) : ''} · ${t(v.kind)}</span></td><td>${v.fy}</td>${cells}</tr>`; });
    html('guideHistory', `<table class="guide-table"><thead><tr><th>${t('date')}</th><th>${t('guideFy')}</th>${G_METRICS.map((m) => `<th>${gLabel(m)}</th>`).join('')}</tr></thead><tbody>${hrows.join('')}</tbody></table>`);
    html('guideHistSrc', `${t('src')}: ${LANG === 'es' ? 'informes trimestrales y conferencias de resultados de Quálitas (data/guidance.js)' : 'Quálitas quarterly reports and earnings calls (data/guidance.js)'}`);
    // track record: closed years
    const closed = [...new Set(vs.map((v) => v.fy))].filter((fy) => { const a = gActual(fy); return a && a.closed; });
    const rrows = closed.map((fy) => { const fin = vs.filter((v) => v.fy === fy).pop(); const a = gActual(fy); const cells = G_METRICS.map((m) => { const it = fin.items[m]; if (!it || it.lo == null) return '<td>—</td>'; const v = a[m]; return `<td>${gRangeTxt(it)}<span class="sub">${t('actual')}: ${v == null ? '—' : m === 'written' ? fmtPct(v, 1, true) : fmtPct(v)}</span> ${chip(gStatus(m, it, v))}</td>`; }).join(''); const n = G_METRICS.filter((m) => fin.items[m] && fin.items[m].lo != null && a[m] != null).length, hits = G_METRICS.filter((m) => ['within', 'better', 'above'].includes(gStatus(m, fin.items[m], a[m]))).length; return `<tr><td>FY${fy}<span class="sub">${fmtDate(fin.date)}</span></td>${cells}<td>${hits}/${n}</td></tr>`; });
    html('guideRecord', rrows.length ? `<table class="guide-table"><thead><tr><th>${t('guideFy')}</th>${G_METRICS.map((m) => `<th>${gLabel(m)}</th>`).join('')}<th>${t('hits')}</th></tr></thead><tbody>${rrows.join('')}</tbody></table><p class="chart-src">${LANG === 'es' ? 'FY2025 incluye el cargo único del IVA del 4T25 (siniestralidad 62.2% y combinado 90.6% sin él).' : 'FY2025 includes the one-off 4Q25 VAT charge (62.2% loss ratio and 90.6% combined without it).'}</p>` : `<p class="muted small">${LANG === 'es' ? 'Aún no hay años cerrados con expectativas registradas.' : 'No closed years with recorded expectations yet.'}</p>`);
    html('guideRecSrc', `${t('src')}: ${LANG === 'es' ? 'última expectativa de cada año (data/guidance.js) frente a las cifras anuales de los informes del 4T; crecimiento sobre el año anterior, índices como nivel' : "each year's final expectation (data/guidance.js) against the annual figures of the 4Q reports; growth over the prior year, ratios as levels"}`);
    // all vintages
    html('guideAll', `<table class="guide-table"><thead><tr><th>${t('date')}</th><th>${t('guideFy')}</th><th>${t('type')}</th>${G_METRICS.map((m) => `<th>${gLabel(m)}</th>`).join('')}<th>${t('src')}</th></tr></thead><tbody>${vs.slice().reverse().map((v) => `<tr><td>${fmtDate(v.date)}</td><td>${v.fy}</td><td>${t(v.kind)}</td>${G_METRICS.map((m) => `<td class="txt">${gRangeTxt(v.items[m])}${v.items[m] && v.items[m].text ? `<span class="sub">${L(v.items[m].text)}</span>` : ''}</td>`).join('')}<td><a href="${v.source.url}" target="_blank" rel="noopener">${L(v.source.title)}</a></td></tr>`).join('')}</tbody></table>`);
    renderGuideChart(); renderConsensus();
  }
  function renderConsensus() {
    if (!CONS) return;
    const es = LANG === 'es';
    const pend = `<span class="muted">${t('pending')}</span>`;
    const cell = (v, f) => (v == null ? pend : f(v));
    const yrs = CONS.years || [];
    const vs = vintagesSorted();
    const mg = (fy, m) => { const v = vs.filter((x) => x.fy === fy && x.items[m] && x.items[m].lo != null).pop(); return v ? gRangeTxt(v.items[m]) : '—'; };
    const rows = [
      [es ? 'Prima emitida, crecimiento' : 'Written premiums, growth', (y) => cell(y.writtenGrowthPct, (v) => fmtPct(v, 1, true)), 'written'],
      [es ? 'Prima emitida (Ps. M)' : 'Written premiums (Ps. M)', (y) => cell(y.writtenMxnM, (v) => fmtN(v)), null],
      [es ? 'Utilidad neta (Ps. M)' : 'Net income (Ps. M)', (y) => cell(y.netIncomeMxnM, (v) => fmtN(v)), null],
      [t('eps') + ' (Ps.)', (y) => cell(y.eps, (v) => fmtN(v, 2)), null],
      [t('lossRatio'), (y) => cell(y.lossRatioPct, (v) => fmtPct(v)), 'lossRatio'],
      [t('combined'), (y) => cell(y.combinedPct, (v) => fmtPct(v)), 'combined'],
      ['ROE', (y) => cell(y.roePct, (v) => fmtPct(v)), 'roe'],
      [t('dps'), (y) => cell(y.dpsMxn, (v) => fmtN(v, 2)), null],
      [es ? 'Número de estimaciones' : 'Number of estimates', (y) => cell(y.nAnalysts, (v) => fmtN(v, 0)), null],
    ];
    const tp = CONS.targetPrice || {};
    html('consTable', `<table class="guide-table"><thead><tr><th>${t('metric')}</th>${yrs.map((y) => `<th>FY${y.fy}<span class="sub">${es ? 'consenso' : 'consensus'}</span></th>`).join('')}${yrs.map((y) => `<th>FY${y.fy}<span class="sub">${es ? 'administración' : 'management'}</span></th>`).join('')}</tr></thead><tbody>${rows.map(([l, f, m]) => `<tr><td>${l}</td>${yrs.map((y) => `<td>${f(y)}</td>`).join('')}${yrs.map((y) => `<td>${m ? mg(y.fy, m) : '—'}</td>`).join('')}</tr>`).join('')}<tr class="total"><td>${es ? 'Precio objetivo (media · máx · mín)' : 'Target price (mean · high · low)'}</td><td colspan="${yrs.length}">${tp.mean == null ? pend : `Ps. ${fmtN(tp.mean, 0)} · ${fmtN(tp.high, 0)} · ${fmtN(tp.low, 0)}${lastPx ? ` (${fmtPct(100 * (tp.mean / lastPx[1] - 1), 1, true)})` : ''}`}</td><td colspan="${yrs.length}">${(REF.analysts || []).map((a) => `${a.firm}: ${a.rating}, PO Ps. ${fmtN(a.target, 0)} (${fmtDate(a.date)})`).join('; ') || '—'}</td></tr></tbody></table>`);
    el('consCap').textContent = `${CONS.source || ''}${CONS.updatedAt ? ' · ' + fmtDate(CONS.updatedAt) : ''} · ${L(CONS.note)}`;
    html('consSrc', `${t('src')}: ${es ? 'contrato de datos en data/consensus.js (se llena con el conector autorizado); columnas "administración" = última expectativa publicada por Quálitas para ese año; precio objetivo público de reference.js (eventos relevantes)' : 'data contract in data/consensus.js (filled by the authorised connector); "management" columns = the latest expectation Quálitas published for that year; public target price from reference.js (material events)'}`);
  }
  function renderGuideChart() {
    const vs = vintagesSorted(); const m = gs.metric;
    const fys = [...new Set(vs.map((v) => v.fy))];
    const c = SERIES();
    const first = (fy) => vs.find((v) => v.fy === fy && v.items[m] && v.items[m].lo != null), last = (fy) => vs.filter((v) => v.fy === fy && v.items[m] && v.items[m].lo != null).pop();
    const rng = (v) => (v ? [v.items[m].lo, v.items[m].hi != null ? v.items[m].hi : v.items[m].lo + 3] : null);
    const acts = fys.map((fy) => { const a = gActual(fy); return a ? a[m] : null; });
    mkChart('chartGuide', { type: 'bar', data: { labels: fys.map((fy) => 'FY' + fy), datasets: [
      { label: t('initial'), data: fys.map((fy) => rng(first(fy))), backgroundColor: c[0] + '66', borderColor: c[0], borderWidth: 1, borderSkipped: false, borderRadius: 4 },
      { label: LANG === 'es' ? 'Última revisión' : 'Latest revision', data: fys.map((fy) => rng(last(fy))), backgroundColor: c[2] + '99', borderColor: c[2], borderWidth: 1, borderSkipped: false, borderRadius: 4 },
      { type: 'line', label: t('actual'), data: acts, borderColor: c[1], backgroundColor: c[1], pointRadius: 6, pointHoverRadius: 7, showLine: false },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => { const v = x.raw; return Array.isArray(v) ? `${x.dataset.label}: ${fmtN(v[0], 0)}–${fmtN(v[1], 0)}%` : `${x.dataset.label}: ${fmtPct(v, 1)}`; } } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' } } }, datasets: { bar: { maxBarThickness: 40 } } } });
    html('guideChartSrc', `${t('src')}: data/guidance.js · ${gLabel(m)} · ${LANG === 'es' ? 'año en curso = acumulado reportado' : 'current year = reported year-to-date'}`);
    updateHash();
  }

  // ================= 03 DRIVERS =================
  const dv = { metric: 'units', freq: 'q', sel: new Set(['total']) };
  const U_KEYS = [['total', 'unitsTotal'], ['mx', 'mexico'], ['autos', 'cars'], ['trucks', 'trucks'], ['motos', 'motos'], ['cr', 'c_cr'], ['pe', 'c_pe'], ['sv', 'c_sv'], ['us', 'c_us'], ['co', 'c_co']];
  const P_KEYS = [['total', 'premTotal'], ['ind', 'premInd'], ['fleet', 'premFleet'], ['fin', 'premFin'], ['intl', 'premIntl']];
  const dKeys = () => (dv.metric === 'units' ? U_KEYS : P_KEYS);
  function driverSeries() { // [{id, label, fy, q, vals:{k:v}}] in thousands (units) or thousands of pesos (premiums)
    const es = (OPS.quarters || []).slice().sort((a, b) => a.fy - b.fy || a.q - b.q);
    const pts = es.map((e) => ({ id: e.id, fy: e.fy, q: e.q, label: qLabel(e), vals: dv.metric === 'units' ? (e.units || {}) : (e.premiums || {}), ytd: e.premiumsYtd || {}, src: e.source }));
    if (dv.freq === 'q') return pts;
    const byFy = {}; for (const p of pts) (byFy[p.fy] = byFy[p.fy] || []).push(p);
    return Object.keys(byFy).map(Number).sort().map((fy) => { const arr = byFy[fy]; const q4 = arr.find((p) => p.q === 4); if (dv.metric === 'units') return q4 ? { id: 'FY' + fy, fy, label: 'FY' + fy, vals: q4.vals, src: q4.src } : null; if (q4 && q4.ytd && q4.ytd.total) return { id: 'FY' + fy, fy, label: 'FY' + fy, vals: q4.ytd, src: q4.src }; if (arr.length === 4) return { id: 'FY' + fy, fy, label: 'FY' + fy, vals: sumParts(arr.map((p) => p.vals)), src: q4 && q4.src }; return null; }).filter(Boolean);
  }
  function renderDrivers() {
    const keys = dKeys();
    el('drvChipsLbl').textContent = dv.metric === 'units' ? (LANG === 'es' ? 'Segmento / país' : 'Segment / country') : (LANG === 'es' ? 'Línea de negocio' : 'Line of business');
    html('drvChips', keys.map(([k, lk]) => `<button type="button" class="chip ${dv.sel.has(k) ? 'active' : ''}" data-k="${k}" aria-pressed="${dv.sel.has(k) ? 'true' : 'false'}">${t(lk)}</button>`).join(''));
    el('drvChips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k; if (dv.sel.has(k)) { if (dv.sel.size > 1) dv.sel.delete(k); } else dv.sel.add(k); renderDrivers(); updateHash(); }));
    const ser = driverSeries().slice(dv.freq === 'q' ? -16 : -8);
    const c = SERIES();
    const selKeys = keys.filter(([k]) => dv.sel.has(k));
    const div = dv.metric === 'units' ? 1 : 1000;
    const isUnits = dv.metric === 'units';
    const ds = selKeys.map(([k, lk], i) => ({ label: t(lk), data: ser.map((p) => (p.vals[k] != null ? p.vals[k] / div : null)), borderColor: c[i % 8], backgroundColor: isUnits ? c[i % 8] : c[i % 8], pointRadius: isUnits ? 3 : 0, fill: false, stack: isUnits || k === 'total' ? undefined : 's' }));
    mkChart('chartDrivers', { type: isUnits ? 'line' : 'bar', data: { labels: ser.map((p) => p.label), datasets: ds }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y, 0)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: !isUnits } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    el('drvChartTitle').textContent = isUnits ? `${t('units')} · ${dv.freq === 'q' ? (LANG === 'es' ? 'al cierre de cada trimestre' : 'at each quarter-end') : (LANG === 'es' ? 'al cierre de cada año' : 'at each year-end')}` : `${t('premHead')} (Ps. M) · ${dv.freq === 'q' ? (LANG === 'es' ? 'trimestral' : 'quarterly') : (LANG === 'es' ? 'anual' : 'annual')}`;
    el('drvChartCap').textContent = isUnits ? (LANG === 'es' ? 'Miles de unidades; México se desglosa en automóviles, camiones y motocicletas (incluye RC extranjero); turistas y fronterizos reclasificados desde 1T25.' : 'Thousand units; Mexico is split into cars, trucks and motorcycles (incl. foreign third-party liability); tourist and border units reclassified from 1Q25.') : (LANG === 'es' ? 'Tradicional = individual + flotillas; instituciones financieras = pólizas vendidas con crédito automotriz (mayor comisión y proporción multianual).' : 'Traditional = individual + fleets; financial institutions = policies sold with auto loans (higher commission and multi-year share).');
    const src = ser.length && ser[ser.length - 1].src;
    html('drvSrc', src && src.url ? `${t('src')}: <a href="${src.url}" target="_blank" rel="noopener">${t('release')} (${fmtDate(src.date)}) ↗</a>${LANG === 'es' ? ' · trimestres sin informe propio: columna comparativa del informe del año siguiente' : ' · quarters without their own report: comparative column of the following year\'s report'}` : '');
    // series table
    html('drvSeriesTable', `<table><thead><tr><th>${t('period')}</th>${selKeys.map(([k, lk]) => `<th>${t(lk)}</th>`).join('')}</tr></thead><tbody>${ser.slice().reverse().map((p) => `<tr><td>${p.label}</td>${selKeys.map(([k]) => `<td>${p.vals[k] != null ? fmtN(p.vals[k] / div, 0) : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    // latest period breakdown with y/y and share
    const all = driverSeries(); const last = all[all.length - 1]; const prev = all.find((p) => (dv.freq === 'q' ? p.fy === last.fy - 1 && p.q === last.q : p.fy === last.fy - 1));
    const tot = last.vals.total;
    const rows = keys.map(([k, lk]) => { const v = last.vals[k], pv = prev && prev.vals[k]; if (v == null) return ''; const y = pv ? 100 * (v / pv - 1) : null; return `<tr class="${k === 'total' ? 'total' : k === 'mx' ? 'bold' : ''}"><td>${t(lk)}</td><td>${fmtN(v / div, 0)}</td><td>${pv != null ? fmtN(pv / div, 0) : '—'}</td><td class="${cls(y)}">${fmtPct(y, 1, true)}</td><td>${tot && k !== 'total' ? fmtPct(100 * v / tot, 1) : ''}</td></tr>`; }).join('');
    html('drvTable', `<table><thead><tr><th>${isUnits ? (LANG === 'es' ? 'Segmento' : 'Segment') : (LANG === 'es' ? 'Línea' : 'Line')}</th><th>${last.label}</th><th>${prev ? prev.label : '—'}</th><th>${LANG === 'es' ? 'a/a' : 'y/y'}</th><th>% ${t('total')}</th></tr></thead><tbody>${rows}</tbody></table>`);
    el('drvTblTitle').textContent = `${isUnits ? t('units') : t('premHead') + ' (Ps. M)'} · ${last.label}`;
    el('drvTblCap').textContent = LANG === 'es' ? 'Último periodo reportado frente al mismo periodo del año anterior' : 'Latest reported period versus the same period a year earlier';
    html('drvTblSrc', last.src && last.src.url ? `${t('src')}: <a href="${last.src.url}" target="_blank" rel="noopener">${t('release')} (${fmtDate(last.src.date)}) ↗</a>${prev && prev.src && prev.src.url && prev.src.url !== last.src.url ? ` · <a href="${prev.src.url}" target="_blank" rel="noopener">${prev.label}</a>` : ''}` : '');
    html('driversMeta', LANG === 'es' ? `Cobertura: ${all.length} periodos (${all[0].label} → ${last.label}) según los informes trimestrales.` : `Coverage: ${all.length} periods (${all[0].label} → ${last.label}) from the quarterly reports.`);
    renderSubs();
  }
  function renderSubs() {
    const es = (OPS.quarters || []).filter((e) => e.subsidiaries && e.subsidiaries.total); if (!es.length) return;
    const e = es[es.length - 1];
    const keys = [['es', 'es_'], ['cr', 'cr_'], ['ic', 'ic_'], ['pe', 'pe_'], ['co', 'co_'], ['verticals', 'verticals_'], ['total', 'total']];
    const rows = keys.map(([k, lk]) => { const v = e.subsidiaries[k], pv = e.subsidiariesPrevY && e.subsidiariesPrevY[k], y = e.subsidiariesYtd && e.subsidiariesYtd[k]; if (v == null) return ''; const g = pv ? 100 * (v / pv - 1) : null; return `<tr class="${k === 'total' ? 'total' : ''}"><td>${t(lk)}</td><td>${fmtM(v)}</td><td>${pv != null ? fmtM(pv) : '—'}</td><td class="${cls(g)}">${pv ? fmtPct(g, 1, true) : (LANG === 'es' ? 'n/a' : 'n/a')}</td><td>${y != null ? fmtM(y) : '—'}</td></tr>`; }).join('');
    html('subsTable', `<table><thead><tr><th>${t('subsidiary')}</th><th>${qLabel(e)}</th><th>${qLabel({ fy: e.fy - 1, q: e.q })}</th><th>${LANG === 'es' ? 'a/a' : 'y/y'}</th><th>${ytdLabel(e.fy, e.q * 3)}</th></tr></thead><tbody>${rows}</tbody></table>`);
    el('subsCap').textContent = LANG === 'es' ? 'Prima emitida y ventas en Ps. millones según el informe trimestral (excluye operaciones intercompañía; verticales = Quálitas Salud, Autos y Salvamentos, O&T y Activos Jal, DCT y Flekk, Roto Cristales y Partes). Cifras de periodos anteriores pueden variar por tipo de cambio o consolidación.' : 'Written premiums and sales in Ps. million from the quarterly report (excludes intercompany; verticals = Quálitas Salud, Autos y Salvamentos, O&T and Activos Jal, DCT and Flekk, Roto Cristales y Partes). Prior-period figures may vary with FX or consolidation.';
    html('subsSrc', e.source && e.source.url ? `${t('src')}: <a href="${e.source.url}" target="_blank" rel="noopener">${t('release')} (${fmtDate(e.source.date)}) ↗</a>` : '');
  }

  // ================= 04 SHARE PRICE =================
  const sh = { range: '3y' };
  function rangeStart(pts) { const last = lastPoint(pts); if (!last) return null; const n = { '1y': 365, '3y': 365 * 3, '5y': 365 * 5 }[sh.range]; return n ? addDays(last[0], -n) : pts[0][0]; }
  function decimate(pts, max = 900) { if (pts.length <= max) return pts; const step = Math.ceil(pts.length / max); return pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
  function renderShare() {
    const pts = qPx; if (!pts.length) return;
    const start = rangeStart(pts); const win = pts.filter((p) => p[0] >= start);
    const c = SERIES(); const cur = win[win.length - 1];
    const meta = MK.prices[TICK];
    mkChart('chartPrice', { type: 'line', data: { datasets: [{ label: meta.name, data: decimate(win).map((p) => ({ x: p[0], y: p[1] })), borderColor: c[0], backgroundColor: c[0] + '1a', fill: true }] },
      options: { parsing: true, plugins: { tooltip: { callbacks: { title: (x) => fmtDate(x[0].raw.x), label: (x) => `${meta.currency} ${fmtN(x.parsed.y, 2)}` } } }, scales: { x: { type: 'category', ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i, ticks) => { const d = win[Math.round(i * (win.length - 1) / Math.max(1, ticks.length - 1))]; return d ? d[0].slice(0, 7) : ''; } }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    el('priceChartTitle').textContent = `${meta.name} · ${meta.currency}`;
    el('priceChartCap').textContent = `${t('close')} ${fmtDate(win[0][0])} → ${fmtDate(cur[0])}`;
    html('priceSrc', `${t('src')}: ${meta.source}${meta.error ? ' · ⚠ ' + meta.error : ''}`);
    const yAgo = pointAtOrBefore(pts, addDays(cur[0], -365)); const yStart = pointAtOrBefore(pts, `${cur[0].slice(0, 4)}-01-01`);
    const w52 = pts.filter((p) => p[0] >= addDays(cur[0], -365)); const hi = Math.max(...w52.map((p) => p[1])), lo = Math.min(...w52.map((p) => p[1]));
    const stats = [
      { v: `${meta.currency} ${fmtN(cur[1], 2)}`, l: `${t('close')} ${fmtDate(cur[0])}` },
      { v: fmtPct(yStart ? 100 * (cur[1] / yStart[1] - 1) : null, 1, true), l: t('ytdChg'), c: cls(yStart ? cur[1] - yStart[1] : null) },
      { v: fmtPct(yAgo ? 100 * (cur[1] / yAgo[1] - 1) : null, 1, true), l: t('oneY'), c: cls(yAgo ? cur[1] - yAgo[1] : null) },
      { v: fmtN(hi, 2), l: t('high52') }, { v: fmtN(lo, 2), l: t('low52') },
    ];
    if (sharesOut) stats.push({ v: 'Ps. ' + fmtN(cur[1] * sharesOut / 1e9, 1) + ' ' + bn(), l: t('mktCap') });
    html('shareStats', stats.map((s) => `<div class="stat"><div class="v ${s.c || ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    const ids = [TICK, '^MXX', 'PGR', 'ALL', 'PSSA3.SA', 'MAP.MC'];
    const base = rangeStart(qPx);
    const series = ids.map((id) => ({ id, pts: px(id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
    const dates = series[0].pts.map((p) => p[0]);
    const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lastV = null; return { label: MK.prices[s.id].name, data: dates.map((d) => { const v = map.get(d); if (v != null) lastV = v; return lastV != null ? 100 * lastV / b : null; }), borderColor: c[i], backgroundColor: c[i], borderWidth: i === 0 ? 2.5 : 1.5 }; });
    const idx = decimate(dates.map((_, i) => i), 700);
    mkChart('chartRebased', { type: 'line', data: { labels: idx.map((i) => dates[i]), datasets: ds.map((d) => ({ ...d, data: idx.map((i) => d.data[i]) })) },
      options: { plugins: { legend: legendTop, tooltip: { callbacks: { title: (x) => fmtDate(x[0].label), label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y, 1)}` } } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i) => (idx[i] != null ? dates[idx[i]].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    html('rebasedTable', `<table><thead><tr><th>${t('period')}: ${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}</th><th>${t('ret')}</th></tr></thead><tbody>${ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return `<tr><td>${d.label}</td><td class="${cls(last - 100)}">${fmtPct(last - 100, 1, true)}</td></tr>`; }).join('')}</tbody></table>`);
    html('rebasedSrc', `${t('src')}: Yahoo Finance (${LANG === 'es' ? 'cierres diarios, moneda local, sin dividendos reinvertidos' : 'daily closes, local currency, dividends not reinvested'})`);
    html('shareMeta', LANG === 'es' ? `Acciones emitidas: ${fmtN(sharesIssued)}; en circulación (netas de tesorería): ≈${fmtN(sharesOut)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}). Sin ADR.` : `Shares issued: ${fmtN(sharesIssued)}; outstanding (net of treasury): ≈${fmtN(sharesOut)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}). No ADR.`);
  }

  // ================= 05 VALUATION (residual income) =================
  const VD = Object.assign({}, REF.valuation || {});
  const V = {};
  // Beta: two years of weekly returns (last close of each ISO week) of Q* against the S&P/BMV IPC.
  function betaFromMarket() {
    const a = qPx, b = px('^MXX'); if (a.length < 200 || b.length < 200) return null;
    const isoWeek = (iso) => { const d = new Date(iso + 'T12:00:00Z'); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3); const y = d.getUTCFullYear(); const jan4 = new Date(Date.UTC(y, 0, 4)); const w = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7); return `${y}-${String(w).padStart(2, '0')}`; };
    const weekly = (pts) => { const m = new Map(); for (const p of pts) m.set(isoWeek(p[0]), p[1]); return m; };
    const start = lastPx ? addDays(lastPx[0], -365 * 2 - 7) : null;
    const ma = weekly(a.filter((p) => !start || p[0] >= start)), mb = weekly(b.filter((p) => !start || p[0] >= start));
    const keys = [...ma.keys()].filter((k) => mb.has(k)).sort();
    const ra = [], rb = []; for (let i = 1; i < keys.length; i++) { ra.push(ma.get(keys[i]) / ma.get(keys[i - 1]) - 1); rb.push(mb.get(keys[i]) / mb.get(keys[i - 1]) - 1); }
    const n = ra.length; if (n < 60) return null;
    const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length; const am = mean(ra), bm = mean(rb);
    let cov = 0, vr = 0; for (let i = 0; i < n; i++) { cov += (ra[i] - am) * (rb[i] - bm); vr += (rb[i] - bm) ** 2; }
    return vr ? { beta: cov / vr, n } : null;
  }
  function valDefaults() {
    const rf = mx10.length ? mx10[mx10.length - 1][1] : 9.0;
    const est = betaFromMarket(); let beta = est ? est.beta : null; const raw = beta;
    if (beta == null) beta = 0.8; beta = Math.min(VD.betaCap || 1.2, Math.max(VD.betaFloor || 0.5, beta));
    return { bv: lastQ && lastQ.bs ? lastQ.bs.totalEquity / 1000 : 25000, roe: VD.roePct || 20, payout: VD.payoutPct || 70, g: VD.growthPct || 5, termRoe: VD.terminalRoePct || 18, rf: Math.round(rf * 100) / 100, beta: Math.round(beta * 100) / 100, betaRaw: raw, betaN: est ? est.n : 0, erp: VD.erpPct || 6, years: VD.years || 5, term: 'gordon', exitPbv: VD.exitPbv || 2.5 };
  }
  function valInputsHtml(s) {
    const inp = (k, name, opt = {}) => `<div class="inp"><div class="name">${name}${opt.sub ? `<small>${opt.sub}</small>` : ''}</div><input type="number" data-k="${k}" value="${s[k]}" step="${opt.step || 0.5}"${opt.min != null ? ` min="${opt.min}"` : ''}></div>`;
    const es = LANG === 'es';
    return `<h4>${es ? 'Punto de partida' : 'Starting point'}</h4>
      ${inp('bv', es ? 'Capital contable (Ps. M)' : "Stockholders' equity (Ps. M)", { sub: es ? `balance al ${lastQ ? qLabel(lastQ) : ''}` : `balance sheet at ${lastQ ? qLabel(lastQ) : ''}`, step: 100 })}
      <h4>${es ? 'Rentabilidad y pago' : 'Returns and payout'}</h4>
      ${inp('roe', es ? 'ROE años 1–' + s.years + ' (%)' : 'ROE years 1–' + s.years + ' (%)', { sub: es ? 'expectativa ~20%; rango de largo plazo 20–25%' : 'expectation ~20%; long-term range 20–25%' })}
      ${inp('payout', es ? 'Pago de dividendos (%)' : 'Dividend payout (%)', { sub: es ? 'política 40–90%; 2024–26: 84%, 78%, 71%' : 'policy 40–90%; 2024–26: 84%, 78%, 71%', step: 5 })}
      ${inp('termRoe', es ? 'ROE terminal (%)' : 'Terminal ROE (%)', { sub: es ? 'después del año ' + s.years : 'after year ' + s.years })}
      ${inp('g', es ? 'Crecimiento terminal g (%)' : 'Terminal growth g (%)', { sub: es ? 'nominal, en pesos' : 'nominal, in pesos', step: 0.25 })}
      <h4>${es ? 'Valor terminal' : 'Terminal value'}</h4>
      <div class="inp"><div class="name">${es ? 'Método' : 'Method'}<small>${es ? 'después del año ' + s.years : 'after year ' + s.years}</small></div><select data-k="term"><option value="gordon"${s.term === 'gordon' ? ' selected' : ''}>${es ? 'Perpetuidad (Gordon) del ingreso residual' : 'Gordon perpetuity of residual income'}</option><option value="exit"${s.term === 'exit' ? ' selected' : ''}>${es ? 'Múltiplo de salida P/VL' : 'Exit P/BV multiple'}</option></select></div>
      ${inp('exitPbv', es ? 'Múltiplo de salida P/VL (x)' : 'Exit P/BV multiple (x)', { sub: es ? 'sólo con el método de múltiplo' : 'used by the exit-multiple method only', step: 0.1, min: 0 })}
      <h4>${es ? 'Costo de capital (CAPM)' : 'Cost of equity (CAPM)'}</h4>
      ${inp('rf', es ? 'Tasa libre de riesgo (%)' : 'Risk-free rate (%)', { sub: es ? 'bono M 10 años (FRED/OCDE, en vivo)' : '10-yr M bond (FRED/OECD, live)', step: 0.1 })}
      ${inp('beta', 'Beta', { sub: s.betaRaw != null ? (es ? `estimada ${fmtN(s.betaRaw, 2)} vs IPC (${s.betaN} semanas, 2 años); acotada ${VD.betaFloor || 0.5}–${VD.betaCap || 1.2}` : `estimated ${fmtN(s.betaRaw, 2)} vs IPC (${s.betaN} weeks, 2 years); clipped ${VD.betaFloor || 0.5}–${VD.betaCap || 1.2}`) : (es ? 'sin datos suficientes; valor de referencia' : 'insufficient data; fallback value'), step: 0.05 })}
      ${inp('erp', es ? 'Prima de riesgo de mercado (%)' : 'Equity risk premium (%)', { step: 0.25 })}
      <div class="inp"><div class="name">${es ? 'Costo de capital Ke' : 'Cost of equity Ke'}</div><div><b id="valKe"></b></div></div>
      <div style="margin-top:14px"><button type="button" class="btn" id="valReset">${es ? 'Restablecer supuestos' : 'Reset assumptions'}</button></div>`;
  }
  function valCompute(s, over = {}) {
    const p = { ...s, ...over };
    const ke = (p.rf + p.beta * p.erp) / 100, roe = p.roe / 100, pay = p.payout / 100, g = p.g / 100, troe = p.termRoe / 100;
    let bv = p.bv, pv = 0; const rows = [];
    for (let tt = 1; tt <= p.years; tt++) { const ni = roe * bv, div = pay * ni, ri = ni - ke * bv, df = Math.pow(1 + ke, tt); pv += ri / df; rows.push({ t: tt, bv0: bv, ni, div, ri, pvri: ri / df, bv1: bv + ni - div }); bv = bv + ni - div; }
    // terminal: Gordon perpetuity of residual income, or an exit P/BV multiple on closing equity (residual value = (multiple − 1) × equity)
    const riT = (troe - ke) * bv;
    const tv = p.term === 'exit' ? (p.exitPbv - 1) * bv : (ke > g ? riT / (ke - g) : NaN);
    const pvtv = tv / Math.pow(1 + ke, p.years);
    const eq = p.bv + pv + pvtv;
    const perShare = sharesOut ? eq * 1e6 / sharesOut : null;
    return { ke, eq, pv, pvtv, tv, perShare, rows, bvN: bv, ni1: rows[0] && rows[0].ni, div1: rows[0] && rows[0].div, impliedPbv: eq / p.bv, sustainable: roe * (1 - pay) };
  }
  // Market-implied cost of equity: the Ke at which the model's value per share equals the last close (bisection on rf).
  function impliedKe(s) {
    if (!lastPx || !sharesOut) return null;
    const f = (ke) => { const r = valCompute(s, { rf: 100 * ke - s.beta * s.erp }); return r.perShare; };
    let lo = Math.max(s.g / 100 + 0.005, 0.01), hi = 0.6;
    if (!(f(lo) > lastPx[1] && f(hi) < lastPx[1])) return null;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > lastPx[1]) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function renderValuation(reset) {
    if (reset || !V.s) V.s = Object.assign(valDefaults(), reset ? {} : (V.pending || {}));
    V.pending = null;
    html('valInputs', valInputsHtml(V.s));
    el('valInputs').querySelectorAll('input[data-k]').forEach((i) => i.addEventListener('input', () => { const v = parseFloat(i.value); if (isFinite(v)) { V.s[i.dataset.k] = v; renderValOutputs(); } }));
    el('valInputs').querySelectorAll('select[data-k]').forEach((sl) => sl.addEventListener('change', () => { V.s[sl.dataset.k] = sl.value; renderValOutputs(); }));
    el('valReset').addEventListener('click', () => renderValuation(true));
    renderValOutputs();
    html('valMeta', LANG === 'es' ? `Supuestos por defecto: ${L(VD.notes)}` : `Default assumptions: ${L(VD.notes)}`);
  }
  function renderValOutputs() {
    const s = V.s; const r = valCompute(s);
    const es = LANG === 'es';
    const ik = impliedKe(s);
    el('valKe').textContent = fmtPct(100 * r.ke, 2);
    el('valHero').textContent = r.perShare ? 'Ps. ' + fmtN(r.perShare, 1) : '—';
    el('valHeroLbl').textContent = `${t('perShare')} · ${lastPx ? `${t('upside')} Ps. ${fmtN(lastPx[1], 2)}: ${fmtPct(100 * (r.perShare / lastPx[1] - 1), 1, true)}` : ''}`;
    const outs = [
      { v: 'Ps. ' + fmtN(r.eq) + ' M', l: es ? 'Valor del capital (VL₀ + VP ingreso residual + VP terminal)' : 'Equity value (BV₀ + PV residual income + PV terminal)' },
      { v: fmtX(r.impliedPbv, 2), l: es ? 'P/VL implícito sobre el capital actual' : 'Implied P/BV on current equity' },
      { v: r.ni1 && sharesOut && r.perShare ? fmtX(r.perShare / (r.ni1 * 1e6 / sharesOut), 1) : '—', l: es ? 'P/U implícito sobre la utilidad del año 1' : 'Implied P/E on year-1 earnings' },
      { v: fmtPct(100 * r.ke, 2), l: `Ke = ${fmtN(s.rf, 2)}% + ${fmtN(s.beta, 2)} × ${fmtN(s.erp, 2)}%` },
      { v: ik != null ? fmtPct(100 * ik, 2) : '—', l: es ? `Ke implícito en el precio actual (Ps. ${lastPx ? fmtN(lastPx[1], 2) : '—'}) con los demás supuestos` : `Ke implied by the current price (Ps. ${lastPx ? fmtN(lastPx[1], 2) : '—'}) with the other assumptions` },
      { v: fmtPct(100 * r.sustainable, 1), l: es ? 'Crecimiento sostenible del capital = ROE × (1 − pago)' : 'Sustainable equity growth = ROE × (1 − payout)' },
      { v: r.div1 && sharesOut && r.perShare ? fmtPct(100 * (r.div1 * 1e6 / sharesOut) / (lastPx ? lastPx[1] : r.perShare)) : '—', l: es ? 'Rendimiento por dividendo año 1 sobre el precio actual' : 'Year-1 dividend yield on the current price' },
    ];
    html('valOutputs', outs.map((o) => `<div class="out"><div class="v">${o.v}</div><div class="l">${o.l}</div></div>`).join(''));
    html('valHow', es
      ? `<b>Cómo leerlo.</b> El punto de partida es el capital contable del último balance. Cada año la empresa gana ROE × capital, reparte el porcentaje de pago como dividendo y retiene el resto. El "ingreso residual" es lo que gana por encima de lo que exigen los accionistas (Ke × capital): si el ROE supera al Ke, la empresa vale más que su capital (P/VL > 1); si no, menos. El valor terminal captura ese exceso después del año ${s.years} con ${s.term === 'exit' ? 'un múltiplo de salida P/VL' : 'una perpetuidad que crece a g'}. El <b>Ke implícito</b> es la tasa que iguala el modelo al precio de mercado: por encima del Ke calculado, el mercado exige más rendimiento (o espera menos ROE) que el modelo. Mueva un supuesto y compare con la tabla de sensibilidad.`
      : `<b>How to read it.</b> The starting point is equity from the latest balance sheet. Each year the company earns ROE × equity, pays out the payout share as dividends and retains the rest. "Residual income" is what it earns above what shareholders require (Ke × equity): if ROE exceeds Ke the company is worth more than its equity (P/BV > 1); otherwise less. The terminal value captures that excess after year ${s.years} with ${s.term === 'exit' ? 'an exit P/BV multiple' : 'a perpetuity growing at g'}. The <b>implied Ke</b> is the rate that makes the model equal to the market price: above the computed Ke, the market demands more return (or expects less ROE) than the model. Move an assumption and compare with the sensitivity table.`);
    html('valNote', es
      ? `<b>Lectura.</b> Con ROE de ${fmtN(s.roe, 1)}% frente a un costo de capital de ${fmtPct(100 * r.ke, 1)}, cada peso de capital vale ${fmtN(r.impliedPbv, 2)} pesos. El valor terminal aporta ${fmtPct(100 * r.pvtv / r.eq, 0)} del total; el capital actual, ${fmtPct(100 * s.bv / r.eq, 0)}. Acciones en circulación: ≈${fmtN(sharesOut)}. Herramienta de sensibilidad, no recomendación.`
      : `<b>Reading.</b> With a ${fmtN(s.roe, 1)}% ROE against a ${fmtPct(100 * r.ke, 1)} cost of equity, each peso of equity is worth ${fmtN(r.impliedPbv, 2)} pesos. The terminal value contributes ${fmtPct(100 * r.pvtv / r.eq, 0)} of the total; current equity, ${fmtPct(100 * s.bv / r.eq, 0)}. Shares outstanding: ≈${fmtN(sharesOut)}. A sensitivity tool, not a recommendation.`);
    const yr0 = lastQ ? lastQ.fy : new Date().getFullYear();
    html('valTable', `<table><thead><tr><th>${t('year')}</th><th>${es ? 'Capital inicial' : 'Opening equity'}</th><th>${t('netIncome')}</th><th>${t('dividends')}</th><th>${es ? 'Ingreso residual' : 'Residual income'}</th><th>${es ? 'VP' : 'PV'}</th><th>${es ? 'Capital final' : 'Closing equity'}</th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${yr0 + x.t}</td><td>${fmtN(x.bv0)}</td><td>${fmtN(x.ni)}</td><td>${fmtN(x.div)}</td><td class="${cls(x.ri)}">${fmtN(x.ri)}</td><td>${fmtN(x.pvri)}</td><td>${fmtN(x.bv1)}</td></tr>`).join('')}<tr class="total"><td>${es ? 'Terminal' : 'Terminal'}</td><td colspan="3">${es ? `(ROE ${fmtN(s.termRoe, 1)}% − Ke) × capital ÷ (Ke − g)` : `(ROE ${fmtN(s.termRoe, 1)}% − Ke) × equity ÷ (Ke − g)`}</td><td>${fmtN(r.tv)}</td><td>${fmtN(r.pvtv)}</td><td></td></tr></tbody></table>`);
    const roes = [s.roe - 6, s.roe - 3, s.roe, s.roe + 3, s.roe + 6], kes = [-2, -1, 0, 1, 2].map((d) => 100 * r.ke + d);
    html('valSens', `<table class="sens"><thead><tr><th>ROE ↓ / Ke →</th>${kes.map((k) => `<th>${fmtPct(k, 1)}</th>`).join('')}</tr></thead><tbody>${roes.map((ro) => `<tr><td>${fmtPct(ro, 1)}</td>${kes.map((k) => { const rr = valCompute(s, { roe: ro, rf: k - s.beta * s.erp }); const now = ro === s.roe && Math.abs(k - 100 * r.ke) < 1e-9; return `<td class="center ${lastPx && rr.perShare > lastPx[1] ? 'hi' : ''} ${now ? 'now' : ''}">${fmtN(rr.perShare, 0)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`);
    el('sensCap').textContent = es ? `Ps. por acción; sombreado = por encima del precio actual (${lastPx ? 'Ps. ' + fmtN(lastPx[1], 2) : '—'}); ROE terminal y demás supuestos fijos` : `Ps. per share; shaded = above the current price (${lastPx ? 'Ps. ' + fmtN(lastPx[1], 2) : '—'}); terminal ROE and other assumptions held`;
    const vsrc = `${t('src')}: ${es ? `capital contable del balance ${lastQ ? qLabel(lastQ) : ''} (informe trimestral); tasa libre de riesgo FRED/OCDE (${mx10.length ? fmtDate(mx10[mx10.length - 1][0]) : '—'}); beta con precios de Yahoo Finance; acciones en circulación de reference.js; los demás supuestos son los del panel` : `equity from the ${lastQ ? qLabel(lastQ) : ''} balance sheet (quarterly report); risk-free rate FRED/OECD (${mx10.length ? fmtDate(mx10[mx10.length - 1][0]) : '—'}); beta from Yahoo Finance prices; shares outstanding from reference.js; the rest are the panel's assumptions`}`;
    html('valSrc', vsrc); html('sensSrc', vsrc);
    updateHash();
  }

  // ================= 06 RELATIVE =================
  function renderRelative() {
    const es = LANG === 'es';
    const e = epsLtm(lastLTM), ex = epsLtm(exVat(lastLTM)); const bv = bvps(lastQ);
    const d12 = lastPx ? divs12m(lastPx[0]) : 0;
    const rows = [
      [t('price') + ' Q*', lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'],
      [t('mktCap'), lastPx && sharesOut ? `Ps. ${fmtN(lastPx[1] * sharesOut / 1e9, 1)} ${bn()} · US$ ${fmtN(lastPx[1] * sharesOut / (fxAt(lastPx[0]) || 1) / 1e9, 2)} ${bn()}` : '—'],
      [`${t('eps')} ${t('ltm')} (${lastLTM ? lastLTM.label : ''})`, e ? `Ps. ${fmtN(e, 2)}${ex && ex !== e ? ` · ${t('exVat')}: Ps. ${fmtN(ex, 2)}` : ''}` : '—'],
      [`${t('pe')} ${t('ltm')}`, lastPx && e ? `${fmtX(lastPx[1] / e)}${ex && ex !== e ? ` · ${t('exVat')}: ${fmtX(lastPx[1] / ex)}` : ''}` : '—'],
      [t('bvps'), bv ? `Ps. ${fmtN(bv, 1)} (${qLabel(lastQ)})` : '—'],
      [t('pbv'), lastPx && bv ? fmtX(lastPx[1] / bv, 2) : '—'],
      [t('roe12') + (es ? ' (reportado)' : ' (reported)'), lastQ && lastQ.kpi ? fmtPct(lastQ.kpi.roe12) : '—'],
      [es ? 'Rendimiento por dividendo (12 meses pagados)' : 'Dividend yield (trailing 12 months paid)', lastPx && d12 ? `${fmtPct(100 * d12 / lastPx[1])} (Ps. ${fmtN(d12, 2)})` : '—'],
      [es ? 'Precio / activos invertidos por acción' : 'Price / invested assets per share', lastPx && lastQ.kpi && lastQ.kpi.float && sharesOut ? fmtX(lastPx[1] / (lastQ.kpi.float * 1e6 / sharesOut), 2) : '—'],
    ];
    for (const a of REF.analysts || []) rows.push([`${a.firm} (${fmtDate(a.date)})`, `${a.rating} · PO Ps. ${fmtN(a.target, 0)}${lastPx ? ` (${fmtPct(100 * (a.target / lastPx[1] - 1), 1, true)})` : ''}`]);
    html('multTable', `<table><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`);
    html('multTblSrc', `${t('src')}: Yahoo Finance (Q.MX, ${lastPx ? fmtDate(lastPx[0]) : '—'}) · ${lastQ && lastQ.sources && lastQ.sources.is ? `<a href="${lastQ.sources.is.url}" target="_blank" rel="noopener">${t('release')} ${qLabel(lastQ)} ↗</a>` : ''} · FRED DEXMXUS · reference.js (${es ? 'acciones, analistas' : 'shares, analysts'})`);
    el('multCap').textContent = es ? `Precio de Yahoo Finance; UPA UDM sobre ${fmtN(sharesIssued)} acciones emitidas (base de la compañía); valor en libros y capitalización sobre ≈${fmtN(sharesOut)} en circulación.` : `Yahoo Finance price; LTM EPS on ${fmtN(sharesIssued)} issued shares (company basis); book value and market cap on ≈${fmtN(sharesOut)} outstanding.`;
    // historical multiples at quarter-ends
    const qs = Q.slice(-lastN() - 4).filter((q) => q.bs);
    const c = SERIES();
    const pts = qs.map((q) => { const p = pointAtOrBefore(qPx, qEndDate(q)); const l = ltmFor(q); const bvq = bvps(q); const eq = epsLtm(l); return { q, pbv: p && bvq ? p[1] / bvq : null, pe: p && eq && eq > 0 ? p[1] / eq : null, peEx: p && l ? (epsLtm(exVat(l)) > 0 ? p[1] / epsLtm(exVat(l)) : null) : null }; });
    mkChart('chartMultiples', { type: 'line', data: { labels: pts.map((x) => qLabel(x.q)), datasets: [
      { label: t('pbv'), data: pts.map((x) => x.pbv), borderColor: c[0], backgroundColor: c[0], pointRadius: 3, yAxisID: 'y' },
      { label: `${t('pe')} ${t('ltm')}`, data: pts.map((x) => x.pe), borderColor: c[1], backgroundColor: c[1], pointRadius: 3, yAxisID: 'y' },
      { label: `${t('pe')} ${t('ltm')} ${t('exVat')}`, data: pts.map((x) => x.peEx), borderColor: c[1], borderDash: [4, 4], pointRadius: 0, yAxisID: 'y' },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y, 2)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) + 'x' }, beginAtZero: true } } } });
    html('multSrc', `${t('src')}: Yahoo Finance · ${es ? 'informes trimestrales (capital contable, utilidad neta)' : 'quarterly reports (equity, net income)'}`);
    // peers
    const P = PEERS.peers || [];
    const cell = (v, f) => (v == null ? `<span class="muted">${t('pending')}</span>` : f(v));
    html('peersTable', `<table><thead><tr><th>${es ? 'Empresa' : 'Company'}</th><th>${t('price')}</th><th>${t('mktCap')} (US$ M)</th><th>${t('pe')} ${t('ltm')}</th><th>${t('pe')} NTM</th><th>${t('pbv')}</th><th>${t('yield')}</th><th>ROE</th><th>${t('combined')}</th></tr></thead><tbody>${P.map((p) => `<tr><td>${p.name} <span class="muted small">${p.ticker}</span></td><td>${cell(p.price, (v) => p.currency + ' ' + fmtN(v, 2))}</td><td>${cell(p.mktCapUsdM, (v) => fmtN(v))}</td><td>${cell(p.peLtm, (v) => fmtX(v))}</td><td>${cell(p.peNtm, (v) => fmtX(v))}</td><td>${cell(p.pbv, (v) => fmtX(v, 2))}</td><td>${cell(p.divYieldPct, (v) => fmtPct(v))}</td><td>${cell(p.roePct, (v) => fmtPct(v))}</td><td>${cell(p.combinedRatioPct, (v) => fmtPct(v))}</td></tr>`).join('')}<tr class="total"><td>Quálitas (Q*)</td><td>${lastPx ? 'MXN ' + fmtN(lastPx[1], 2) : '—'}</td><td>${lastPx && sharesOut && fxAt(lastPx[0]) ? fmtN(lastPx[1] * sharesOut / fxAt(lastPx[0]) / 1e6) : '—'}</td><td>${lastPx && e ? fmtX(lastPx[1] / e) : '—'}</td><td>—</td><td>${lastPx && bv ? fmtX(lastPx[1] / bv, 2) : '—'}</td><td>${lastPx && d12 ? fmtPct(100 * d12 / lastPx[1]) : '—'}</td><td>${lastQ && lastQ.kpi ? fmtPct(lastQ.kpi.roe12) : '—'}</td><td>${lastLTM ? fmtPct(lastLTM.kpi.combined) : '—'}</td></tr></tbody></table>`);
    el('peersCap').textContent = `${PEERS.source || ''}${PEERS.updatedAt ? ' · ' + fmtDate(PEERS.updatedAt) : ''} · ${L(REF.peers && REF.peers.note)}`;
    html('peersSrc', `${t('src')}: ${es ? 'contrato de datos en data/peers.js; cuando el conector esté autorizado, la misma comparación de estados financieros podrá abrirse para cualquier par con un clic' : 'data contract in data/peers.js; once the connector is authorised, the same statement comparison can be opened for any peer with one click'} · ${es ? 'fila Quálitas calculada en vivo' : 'Quálitas row computed live'}`);
  }

  // ================= 07 CAPITAL & SOLVENCY =================
  function renderCapital() {
    const es = LANG === 'es';
    const qs = Q.slice(-lastN() - 4).filter((q) => q.kpi && q.kpi.solvIndex != null);
    const c = SERIES();
    mkChart('chartSolvency', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { type: 'line', label: t('solvIndex') + ' (%)', data: qs.map((q) => q.kpi.solvIndex), borderColor: c[6], backgroundColor: c[6], pointRadius: 3, yAxisID: 'y2', order: 1 },
      { label: t('rcs') + ' (Ps. M)', data: qs.map((q) => q.kpi.rcs / 1000), backgroundColor: c[1], stack: 's', yAxisID: 'y', order: 2 },
      { label: t('solvMargin') + ' (Ps. M)', data: qs.map((q) => q.kpi.solvMargin / 1000), backgroundColor: c[0], stack: 's', yAxisID: 'y', order: 2 },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.dataset.yAxisID === 'y2' ? fmtPct(x.parsed.y, 0) : fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true, position: 'left' }, y2: { position: 'right', ticks: { callback: (v) => v + '%' }, grid: { display: false }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('solvSrc', `${t('src')}: ${es ? 'informes trimestrales (requerimiento de capital de solvencia y margen; índice = (margen + RCS) ÷ RCS)' : 'quarterly reports (solvency capital requirement and margin; index = (margin + RCS) ÷ RCS)'}`);
    const qb = Q.slice(-lastN() - 4).filter((q) => q.bs && q.bs.reserves != null);
    mkChart('chartCapital', { type: 'bar', data: { labels: qb.map(qLabel), datasets: [
      { label: t('reserves'), data: qb.map((q) => q.bs.reserves / 1000), backgroundColor: c[1] },
      { label: t('float'), data: qb.map((q) => (q.kpi && q.kpi.float != null ? q.kpi.float : q.bs.inv != null ? q.bs.inv / 1000 : null)), backgroundColor: c[0] },
      { label: t('equity'), data: qb.map((q) => q.bs.totalEquity / 1000), backgroundColor: c[2] },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 18, borderWidth: 0 } } } });
    html('capSrc', `${t('src')}: ${es ? 'balance general de cada informe; float = inversiones en valores + deudor por reporto + cartera de crédito (definición de Quálitas)' : 'balance sheet of each report; float = securities + repo receivables + loan portfolio (Quálitas\' definition)'}`);
    // portfolio table
    const qp = Q.slice(-8);
    const rateAt = (q) => { const p = pointAtOrBefore(mx10, qEndDate(q)); return p ? p[1] : null; };
    html('portTable', `<table><thead><tr><th>${t('quarter')}</th><th>${t('float')} (Ps. M)</th><th>${t('fiPct')}</th><th>${t('duration')}</th><th>${t('rif')} (Ps. M)</th><th>${t('rsi')}</th><th>${es ? 'Bono M 10a' : '10-yr M bond'}</th><th>${t('roe12')}</th></tr></thead><tbody>${qp.map((q) => { const o = quarterObj(q); return `<tr><td>${qLabel(q)}</td><td>${o.kpi.float != null ? fmtN(o.kpi.float) : '—'}</td><td>${fmtPct(o.kpi.fiPct)}</td><td>${o.kpi.duration != null ? fmtN(o.kpi.duration, 1) : '—'}</td><td>${q.is.rif != null ? fmtM(q.is.rif) : '—'}</td><td>${fmtPct(o.kpi.rsi)}</td><td>${fmtPct(rateAt(q), 2)}</td><td>${fmtPct(o.kpi.roe12)}</td></tr>`; }).join('')}</tbody></table>`);
    el('portCap').textContent = es ? 'RSI = RIF anualizado ÷ activos invertidos promedio (definición de Quálitas); bono M a 10 años de FRED/OCDE (promedio mensual) como referencia de tasa.' : 'RSI = annualised RIF ÷ average invested assets (Quálitas\' definition); 10-year M bond from FRED/OECD (monthly average) as the rate reference.';
    html('ratingsTable', `<table><thead><tr><th>${t('agency')}</th><th>${t('entity')}</th><th>${t('rating')}</th><th>${t('outlook')}</th><th>${t('date')}</th></tr></thead><tbody>${(REF.ratings || []).map((r) => `<tr><td>${r.agency}</td><td>${r.entity}${r.holding ? `<span class="sub">${r.holding}</span>` : ''}</td><td style="text-align:left">${r.rating}</td><td style="text-align:left">${L(r.outlook)}</td><td>${fmtDate(r.date)}<span class="sub">${L(r.source)}</span></td></tr>`).join('')}</tbody></table>`);
    el('ratingsCap').textContent = es ? 'Calificaciones de Quálitas Compañía de Seguros (subsidiaria mexicana) y de la controladora, según los eventos relevantes.' : 'Ratings of Quálitas Compañía de Seguros (the Mexican subsidiary) and the holding company, per material-event releases.';
    html('capNote', es
      ? `<b>Sin deuda financiera.</b> El balance no tiene financiamientos ni emisión de deuda; el apalancamiento operativo es prima retenida ÷ capital (≈${lastLTM && lastQ.bs ? fmtX(lastLTM.is.retained / lastQ.bs.totalEquity, 1) : '—'} UDM). AM Best cambió la perspectiva a negativa en octubre de 2025 por los dividendos elevados frente al crecimiento del capital; Fitch y S&P mantienen AAA en escala nacional con perspectiva estable.`
      : `<b>No financial debt.</b> The balance sheet carries no borrowings or debt issuance; operating leverage is retained premiums ÷ equity (≈${lastLTM && lastQ.bs ? fmtX(lastLTM.is.retained / lastQ.bs.totalEquity, 1) : '—'} LTM). AM Best moved the outlook to negative in October 2025 on high dividends relative to capital growth; Fitch and S&P keep national-scale AAA with stable outlooks.`);
    const lastC = (CM.periods || {})[lastQ ? lastQ.id : ''];
    const sq = quotesFor(lastC, 'solvency');
    if (sq) el('capNote').insertAdjacentHTML('beforeend', `<div style="margin-top:8px">${quotesHtml(sq, lastC.call && lastC.call.date)}</div>`);
    html('portSrc', `${t('src')}: ${qp.length ? [...new Map(qp.map((q) => q.sources && q.sources.is).filter((s) => s && s.url).map((s) => [s.url, s])).values()].slice(-3).map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${srcName(s)} (${fmtDate(s.date)})</a>`).join(' · ') : ''} · FRED IRLTLT01MXM156N`);
    html('ratingsSrc', `${t('src')}: ${[...new Set((REF.ratings || []).map((r) => r.source && r.source.url).filter(Boolean))].map((u) => `<a href="${u}" target="_blank" rel="noopener">${es ? 'eventos relevantes (IR)' : 'material events (IR)'} ↗</a>`).join(' · ')}`);
    // debt instruments (none): the CNSF balance sheet has explicit lines for borrowings and debt issued
    const D = REF.debt || { instruments: [] };
    const bsq = Q.slice(-8).filter((q) => q.bs);
    const debtLines = bsq.map((q) => ({ q, fin: q.bs.financing, iss: q.bs.debtIssued, sub: q.bs.subDebt }));
    const anyDebt = debtLines.some((x) => (x.fin || 0) + (x.iss || 0) + (x.sub || 0) > 0);
    html('debtTable', D.instruments.length ? `<table><thead><tr><th>${es ? 'Instrumento' : 'Instrument'}</th><th>${t('type')}</th><th>${es ? 'Emisión' : 'Issued'}</th><th>${es ? 'Vencimiento' : 'Maturity'}</th><th>${es ? 'Principal (Ps. M)' : 'Principal (Ps. M)'}</th><th>${es ? 'Tasa' : 'Rate'}</th></tr></thead><tbody>${D.instruments.map((i) => `<tr><td>${L(i.name)}</td><td>${L(i.type)}</td><td>${fmtDate(i.issued)}</td><td>${fmtDate(i.maturity)}</td><td>${fmtN(i.principalMxnM)}</td><td>${i.rate || '—'}</td></tr>`).join('')}</tbody></table>`
      : `<table><thead><tr><th>${t('quarter')}</th><th>${es ? 'Financiamientos obtenidos (Ps. M)' : 'Borrowings (Ps. M)'}</th><th>${es ? 'Emisión de deuda (Ps. M)' : 'Debt issued (Ps. M)'}</th><th>${es ? 'Obligaciones subordinadas (Ps. M)' : 'Subordinated notes (Ps. M)'}</th><th>${es ? 'Reservas técnicas (Ps. M)' : 'Technical reserves (Ps. M)'}</th><th>${es ? 'Prima retenida UDM ÷ capital' : 'Retained premiums LTM ÷ equity'}</th></tr></thead><tbody>${debtLines.map((x) => { const l = ltmFor(x.q); return `<tr><td>${qLabel(x.q)}</td><td>${x.fin != null ? fmtM(x.fin) : '0'}</td><td>${x.iss != null ? fmtM(x.iss) : '0'}</td><td>${x.sub != null ? fmtM(x.sub) : '0'}</td><td>${x.q.bs.reserves != null ? fmtM(x.q.bs.reserves) : '—'}</td><td>${l && x.q.bs.totalEquity ? fmtX(l.is.retained / x.q.bs.totalEquity, 2) : '—'}</td></tr>`; }).join('')}</tbody></table>`);
    el('debtCap').textContent = `${L(D.note)}${anyDebt ? (es ? ' ⚠ El balance más reciente muestra saldos de deuda: actualice reference.js → debt.' : ' ⚠ The latest balance sheet shows debt balances: update reference.js → debt.') : ''}`;
    html('debtSrc', `${t('src')}: ${L(D.source)}${D.asOf ? ` · ${es ? 'al' : 'as of'} ${fmtDate(D.asOf)}` : ''} · ${es ? 'perfil de vencimientos: no aplica (sin instrumentos)' : 'maturity profile: not applicable (no instruments)'}`);
  }

  // ================= 08 DIVIDENDS =================
  function renderDividends() {
    const es = LANG === 'es';
    const divs = (MK.dividends && MK.dividends[TICK] && MK.dividends[TICK].points) || [];
    const byYear = {}; for (const [d, v] of divs) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + v;
    const lastYear = Math.max(new Date().getFullYear(), ...Object.keys(byYear).map(Number));
    const years = []; for (let y = 2016; y <= lastYear; y++) { years.push(String(y)); byYear[y] ??= 0; }
    const c = SERIES();
    mkChart('chartDps', { type: 'bar', data: { labels: years, datasets: [{ label: t('dps'), data: years.map((y) => byYear[y]), backgroundColor: c[0] }] }, options: { plugins: { tooltip: { callbacks: { label: (x) => 'Ps. ' + fmtN(x.parsed.y, 2) } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('dpsSrc', `${t('src')}: ${es ? 'dividendos en efectivo por acción registrados en bolsa (Yahoo Finance, Q.MX), sumados por año de pago' : 'exchange-recorded cash dividends per share (Yahoo Finance, Q.MX), summed by payment year'}`);
    const rows = years.map((y) => { const fy = Y.find((yy) => yy.fy === +y); const ni = fy && fy.is ? fy.is.netIncome / 1000 : null; const eps = ni && sharesIssued ? ni * 1e6 / sharesIssued : null; const pEnd = pointAtOrBefore(qPx, `${y}-12-31`);
      const cf = fy && fy.cf; const paid = cf && cf.dividendsPaid != null ? -cf.dividendsPaid / 1000 : null; const buy = cf && cf.buybacks != null ? -cf.buybacks / 1000 : null; const agm = (REF.dividends || []).find((d) => d.agmYear === +y);
      return `<tr><td>${y}</td><td>${fmtN(byYear[y], 2)}${agm ? `<span class="sub">${t('agm')}: Ps. ${fmtN(agm.dps, 2)}</span>` : ''}</td><td>${paid != null ? fmtN(paid) : '—'}</td><td>${buy != null ? fmtN(buy) : '—'}</td><td>${paid != null ? fmtN(paid + (buy || 0)) : '—'}</td><td>${eps ? fmtPct(100 * byYear[y] / eps, 0) : '—'}</td><td>${pEnd && byYear[y] ? fmtPct(100 * byYear[y] / pEnd[1]) : '—'}</td></tr>`; });
    html('dpsTable', `<table><thead><tr><th>${t('year')}</th><th>${t('dps')}</th><th>${es ? 'Dividendos pagados (Ps. M)' : 'Dividends paid (Ps. M)'}</th><th>${t('buybacks')} (Ps. M)</th><th>${es ? 'Distribuciones' : 'Distributions'}</th><th>${t('payout')}</th><th>${t('yield')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('dpsCap').textContent = es ? 'DPS = efectivo por acción registrado en bolsa en el año de pago. Flujos en Ps. millones del estado de flujos anual (SIFIC). Razón de pago = DPS del año ÷ utilidad por acción del mismo año fiscal (la política de Quálitas se mide sobre la utilidad del año anterior); rendimiento sobre el cierre del año.' : 'DPS = exchange-recorded cash per share in the payment year. Flows in Ps. million from the annual cash-flow statement (SIFIC). Payout = DPS of the year ÷ EPS of the same fiscal year (Quálitas\' policy is measured on the prior year\'s income); yield on the year-end close.';
    const pol = REF.dividendPolicy;
    const ag = (REF.dividends || []).slice().reverse().map((d) => `<b>${t('agm')} ${d.agmYear}</b>${d.agmDate ? ` (${fmtDate(d.agmDate)})` : ''}: Ps. ${fmtN(d.dps, 2)} ${es ? 'por acción' : 'per share'}${d.payoutPct ? ` · ${d.payoutPct}% ${es ? 'de pago' : 'payout'}` : ''}${d.buybackFundMxnM ? ` · ${es ? 'fondo de recompra' : 'buyback fund'} Ps. ${fmtN(d.buybackFundMxnM)} M` : ''}. ${LS(d.note)} <span class="muted">(${LS(d.source)})</span>`).join('<br>') + `<br><span class="muted">${es ? `Política: ${pol ? pol.lo + '–' + pol.hi + '%' : ''} de la utilidad neta. Los pagos del año en curso aparecen en la tabla cuando la bolsa los registra (Yahoo Finance).` : `Policy: ${pol ? pol.lo + '–' + pol.hi + '%' : ''} of net income. Current-year instalments appear in the table once the exchange records them (Yahoo Finance).`}</span>`;
    const lastC = (CM.periods || {})[lastQ ? lastQ.id : ''] || (CM.periods || {})[lastQ ? prevQid(lastQ) : ''];
    const dq = quotesFor(lastC, 'dividends');
    html('dpsNote', ag + (dq ? `<div style="margin-top:8px">${quotesHtml(dq, lastC.call && lastC.call.date)}</div>` : ''));
    html('dpsTblSrc', `${t('src')}: <a href="https://finance.yahoo.com/quote/Q.MX/history/" target="_blank" rel="noopener">Yahoo Finance (${es ? 'dividendos Q.MX' : 'Q.MX dividends'}) ↗</a> · ${es ? 'reportes SIFIC anuales (flujo de financiamiento)' : 'annual SIFIC filings (financing cash flow)'} · reference.js (${es ? 'acuerdos de asamblea' : 'AGM resolutions'})`);
  }

  // ================= 09 VAT / 10 INTERNATIONAL =================
  function renderVatIntl() {
    const es = LANG === 'es';
    const Vt = REF.vat || {};
    const fmtFact = (f) => (f.fmt === 'mxnM' ? 'Ps. ' + fmtN(f.v) + ' M' : f.fmt === 'bp' ? fmtN(f.v) + ' pb' : f.fmt === 'pct' ? fmtPct(f.v) : fmtN(f.v));
    html('vatFacts', (Vt.facts || []).map((f) => `<div class="fact"><div class="v">${fmtFact(f)}</div><div class="l">${es ? f.label_es : f.label_en}</div></div>`).join(''));
    html('vatTimeline', (Vt.timeline || []).map((e) => `<li><b>${fmtDate(e.date)}</b>${L(e)}</li>`).join(''));
    html('vatSrc', `${t('src')}: ${(LS(Vt.sources) || []).join(' · ')}`);
    const I = REF.international || {};
    html('intlTimeline', (I.timeline || []).map((e) => `<li><b>${fmtDate(e.date)}</b>${L(e)}</li>`).join(''));
    html('intlSrc', `${t('src')}: ${(LS(I.sources) || []).join(' · ')}`);
    const last = (OPS.quarters || []).filter((e) => e.units && e.units.total).pop();
    const uKey = { es: 'sv', cr: 'cr', us: 'us', pe: 'pe', co: 'co', mx: 'mx' };
    html('subsRefTable', `<table><thead><tr><th>${t('subsidiary')}</th><th>${t('country')}</th><th>${es ? 'Unidades (miles)' : 'Units (thousands)'}${last ? ` <span class="sub">${qLabel(last)}</span>` : ''}</th><th style="text-align:left">${t('note')}</th></tr></thead><tbody>${(REF.subsidiaries || []).map((s) => `<tr><td>${L(s.name)}</td><td>${s.country || '—'}</td><td>${last && uKey[s.k] && last.units[uKey[s.k]] != null ? fmtN(last.units[uKey[s.k]]) : '—'}</td><td style="text-align:left; white-space:normal">${L(s.note)}</td></tr>`).join('')}</tbody></table>`);
    el('subsRefCap').textContent = es ? 'Ficha de cada subsidiaria y de las verticales; unidades aseguradas al cierre del último trimestre reportado.' : 'Fact sheet of each subsidiary and the verticals; insured units at the latest reported quarter-end.';
    html('subsRefSrc', `${t('src')}: reference.js (${es ? 'informes trimestrales y conferencias' : 'quarterly reports and calls'})${last && last.source && last.source.url ? ` · <a href="${last.source.url}" target="_blank" rel="noopener">${t('release')} ${qLabel(last)} ↗</a>` : ''}`);
  }

  // ================= 11 METHOD / SOURCES =================
  function renderMethod() {
    const es = LANG === 'es';
    const rows = [
      [es ? 'Estados financieros trimestrales, acumulados y anuales; unidades y primas por línea' : 'Quarterly, YTD and annual statements; units and premiums by line', es ? 'días hábiles 14:30 UTC (semana de resultados) y semanal' : 'weekdays 14:30 UTC (results week) and weekly', es ? 'GitHub Actions descarga los informes trimestrales y reportes SIFIC del sitio de RI, los convierte en tablas y valida cuadres antes de publicar' : 'GitHub Actions downloads the quarterly reports and SIFIC filings from the IR site, parses the tables and validates tie-outs before publishing', fmtDate((FIN.generatedAt || '').slice(0, 10))],
      [es ? 'Expectativas de la administración' : 'Management expectations', es ? 'por trimestre (revisado)' : 'per quarter (reviewed)', 'data/guidance.js', GD.updatedAt ? fmtDate(GD.updatedAt) : '—'],
      [es ? 'Comentarios de los estados financieros' : 'Statement comments', es ? 'por trimestre (borrador de la rutina, revisado)' : 'per quarter (drafted by the routine, reviewed)', 'data/comments.js', CM.updatedAt ? fmtDate(CM.updatedAt) : '—'],
      [es ? 'Resumen ejecutivo' : 'Executive summary', es ? 'con cada reporte (rutina)' : 'with each report (routine)', 'data/summary.js', SUM.updatedAt ? fmtDate(SUM.updatedAt) : '—'],
      [es ? 'Precios, dividendos, tipo de cambio, tasas' : 'Prices, dividends, FX, yields', es ? 'diario, después del cierre de la BMV' : 'daily after the BMV close', 'Yahoo Finance · FRED (DEXMXUS, DGS10, IRLTLT01MXM156N)', fmtDate((MK.generatedAt || '').slice(0, 10))],
      [es ? 'Referencia: acciones, subsidiarias, calificaciones, dividendos, IVA, supuestos de valuación' : 'Reference: shares, subsidiaries, ratings, dividends, VAT, valuation defaults', es ? 'por evento (commit revisado)' : 'event-driven (reviewed commit)', 'data/reference.js', fmtDate(REF.updatedAt)],
      [es ? 'Múltiplos de pares' : 'Peer multiples', es ? 'pendiente' : 'pending', 'FactSet → data/peers.js', PEERS.updatedAt ? fmtDate(PEERS.updatedAt) : '—'],
      [es ? 'Consenso de analistas' : 'Sell-side consensus', es ? 'pendiente' : 'pending', es ? 'conector → data/consensus.js' : 'connector → data/consensus.js', CONS && CONS.updatedAt ? fmtDate(CONS.updatedAt) : '—'],
      [es ? 'Glosario y umbrales de alerta' : 'Glossary and alert thresholds', es ? 'por evento (commit revisado)' : 'event-driven (reviewed commit)', 'data/glossary.js · data/alerts.js', window.Q_GLOSSARY && window.Q_GLOSSARY.updatedAt ? fmtDate(window.Q_GLOSSARY.updatedAt) : '—'],
      [es ? 'Cuadres y salud del pipeline' : 'Tie-outs and pipeline health', es ? 'con cada construcción de datos' : 'with every data build', es ? '<a href="quality.html">quality.html</a> ← validate_data.py (pruebas de parseo: test_parsers.py)' : '<a href="quality.html">quality.html</a> ← validate_data.py (parser tests: test_parsers.py)', fmtDate((FIN.generatedAt || '').slice(0, 10))],
      [es ? 'Rutina de revisión (correo)' : 'Reviewing routine (email)', es ? 'días hábiles 09:00 CDMX' : 'weekdays 09:00 CDMX', es ? 'tools/qualitas/ROUTINE.md; estado en notify-state.json; escribe sólo si hubo cambios materiales' : 'tools/qualitas/ROUTINE.md; state in notify-state.json; writes only on material change', '—'],
    ];
    html('refreshTable', `<table><thead><tr><th>${t('block')}</th><th>${t('cadence')}</th><th>${t('mechanism')}</th><th>${t('lastUpdate')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    html('srcGrid', (REF.sources || []).map((s) => `<div class="item"><div class="t"><a href="${s.u}" target="_blank" rel="noopener">${L(s.t)} ↗</a></div><div class="d">${L(s.d)}</div></div>`).join(''));
    // glossary list
    const terms = Object.keys(GL).map((k) => ({ k, g: glTerm(k) })).filter((x) => x.g).sort((a, b) => a.g.t.localeCompare(b.g.t, locale()));
    html('glossary', `<table><tbody>${terms.map((x) => `<tr><td style="white-space:normal; font-weight:600">${esc(x.g.t)}</td><td style="text-align:left; white-space:normal">${esc(x.g.d)}</td></tr>`).join('')}</tbody></table>`);
    html('glossarySrc', `${t('src')}: data/glossary.js · ${es ? 'criterios CNSF, definiciones de los informes trimestrales' : 'CNSF criteria, definitions in the quarterly reports'} (${window.Q_GLOSSARY && window.Q_GLOSSARY.updatedAt ? fmtDate(window.Q_GLOSSARY.updatedAt) : '—'})`);
    // alert thresholds (browser overrides of data/alerts.js)
    const ov = store.get('q-alerts', {});
    html('alertsGrid', Object.keys(AL).map((k) => `<label for="al_${k}">${esc(L(AL[k]))}</label><input type="number" id="al_${k}" data-al="${k}" value="${ov[k] != null ? ov[k] : AL[k].value}" step="${k === 'guidanceTracking' ? 1 : 0.5}" min="0">`).join(''));
    el('alertsGrid').querySelectorAll('input[data-al]').forEach((i) => i.addEventListener('change', () => { const o = store.get('q-alerts', {}); const v = parseFloat(i.value); if (isFinite(v)) o[i.dataset.al] = v; else delete o[i.dataset.al]; store.set('q-alerts', o); const b = el('alertBanner'); if (b) delete b.dataset.closed; renderAlerts(); renderAlertsMeta(); }));
    el('alertsReset').onclick = () => { store.set('q-alerts', {}); const b = el('alertBanner'); if (b) delete b.dataset.closed; renderMethod(); renderAlerts(); };
    renderAlertsMeta();
  }
  function renderAlertsMeta() {
    const ov = store.get('q-alerts', {}); const n = Object.keys(ov).length; const items = evalAlerts();
    el('alertsMeta').textContent = `${LANG === 'es' ? `${n ? n + ' umbral(es) ajustado(s) en este navegador · ' : ''}${items.length ? items.length + ' alerta(s) activa(s)' : 'sin alertas activas'}` : `${n ? n + ' threshold(s) overridden in this browser · ' : ''}${items.length ? items.length + ' active alert(s)' : 'no active alerts'}`} · data/alerts.js ${window.Q_ALERTS && window.Q_ALERTS.updatedAt ? fmtDate(window.Q_ALERTS.updatedAt) : ''}`;
  }

  // ================= scenario links (URL hash) and browser slots =================
  function stateToHash() {
    const p = new URLSearchParams();
    p.set('stmt', st.stmt); p.set('mode', st.mode); if (st.a) p.set('a', st.a); if (st.b) p.set('b', st.b);
    if (st.exVat) p.set('vat', '1'); if (st.usd) p.set('usd', '1');
    p.set('dm', dv.metric); p.set('df', dv.freq); p.set('dc', [...dv.sel].join(','));
    p.set('r', sh.range); p.set('gm', gs.metric);
    if (V.s) { const d = valDefaults(); const diff = ['bv', 'roe', 'payout', 'g', 'termRoe', 'rf', 'beta', 'erp', 'years', 'term', 'exitPbv'].filter((k) => String(V.s[k]) !== String(d[k])).map((k) => `${k}:${V.s[k]}`); if (diff.length) p.set('v', diff.join('|')); }
    p.set('lang', LANG);
    return p.toString();
  }
  function updateHash() { if (!hashReady) return; try { const h = stateToHash(); if (('#' + h) !== location.hash) history.replaceState(null, '', '#' + h); } catch (e) { /* ignore */ } }
  let hashReady = false;
  function applyHash(h) {
    const p = new URLSearchParams((h || location.hash || '').replace(/^#/, ''));
    if (!p.has('stmt') && !p.has('v') && !p.has('lang')) return null;
    if (['is', 'bs', 'cf'].includes(p.get('stmt'))) st.stmt = p.get('stmt');
    if (['q', 'ytd', 'ltm', 'fy'].includes(p.get('mode'))) st.mode = p.get('mode');
    if (p.get('a')) st.a = p.get('a'); if (p.get('b')) st.b = p.get('b');
    st.exVat = p.get('vat') === '1'; st.usd = p.get('usd') === '1';
    if (['units', 'premiums'].includes(p.get('dm'))) dv.metric = p.get('dm');
    if (['q', 'y'].includes(p.get('df'))) dv.freq = p.get('df');
    if (p.get('dc')) dv.sel = new Set(p.get('dc').split(',').filter(Boolean));
    if (['1y', '3y', '5y', 'max'].includes(p.get('r'))) sh.range = p.get('r');
    if (G_METRICS.includes(p.get('gm'))) gs.metric = p.get('gm');
    if (p.get('v')) { const o = {}; for (const kv of p.get('v').split('|')) { const [k, v] = kv.split(':'); if (k === 'term') o.term = v === 'exit' ? 'exit' : 'gordon'; else if (isFinite(parseFloat(v))) o[k] = parseFloat(v); } V.pending = o; V.s = null; }
    return p.get('lang') === 'en' ? 'en' : p.get('lang') === 'es' ? 'es' : null;
  }
  function syncControlsFromState() {
    const setSeg = (id, v) => { const box = el(id); if (box) box.querySelectorAll('button').forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); };
    setSeg('segStmt', st.stmt); setSeg('segMode', st.mode); setSeg('segDrvMetric', dv.metric); setSeg('segDrvFreq', dv.freq); setSeg('segRange', sh.range); setSeg('segGuideMetric', gs.metric);
    const preset = st.a && st.b && qById[st.a] && st.mode === 'q' && st.b === prevQid(qById[st.a]) ? 'qoq' : 'yoy'; setSeg('segPreset', preset);
    if (el('chkVat')) el('chkVat').checked = st.exVat; if (el('chkUsd')) el('chkUsd').checked = st.usd;
  }
  function scenarioUi() {
    const slots = store.get('q-scn', {});
    const sel = el('scnSlot'); if (!sel) return;
    const es = LANG === 'es';
    sel.innerHTML = [1, 2, 3].map((i) => `<option value="${i}">${es ? 'Espacio' : 'Slot'} ${i}${slots[i] ? ' · ' + esc(slots[i].name) : ` (${es ? 'vacío' : 'empty'})`}</option>`).join('');
    const msg = (m) => { el('scnMsg').textContent = m; setTimeout(() => { if (el('scnMsg').textContent === m) el('scnMsg').textContent = ''; }, 4000); };
    el('scnCopy').onclick = async () => { updateHash(); const url = location.href.split('#')[0] + '#' + stateToHash(); try { await navigator.clipboard.writeText(url); msg(es ? 'Enlace copiado' : 'Link copied'); } catch (e) { window.prompt(es ? 'Copie este enlace:' : 'Copy this link:', url); } };
    el('scnSave').onclick = () => { const i = sel.value; const name = window.prompt(es ? 'Nombre del escenario:' : 'Scenario name:', (slots[i] && slots[i].name) || `${el('stmtTitle') ? el('stmtTitle').textContent : ''}`); if (name == null) return; slots[i] = { name: name.slice(0, 60), hash: stateToHash(), date: new Date().toISOString().slice(0, 10) }; store.set('q-scn', slots); scenarioUi(); msg(es ? `Guardado en el espacio ${i}` : `Saved to slot ${i}`); };
    el('scnLoad').onclick = () => { const s = slots[sel.value]; if (!s) { msg(es ? 'Espacio vacío' : 'Empty slot'); return; } const lang = applyHash(s.hash); if (lang && lang !== LANG) setLang(lang); else { syncControlsFromState(); fillSelects(); renderAll(); } msg(es ? `Escenario "${s.name}" cargado` : `Scenario "${s.name}" loaded`); };
    el('scnReset').onclick = () => { st.stmt = 'is'; st.mode = 'q'; st.a = null; st.b = null; st.exVat = false; st.usd = false; st.open = {}; dv.metric = 'units'; dv.freq = 'q'; dv.sel = new Set(['total']); sh.range = '3y'; gs.metric = 'written'; V.s = null; V.pending = null; syncControlsFromState(); fillSelects('yoy'); renderAll(); msg(es ? 'Restablecido' : 'Reset'); };
  }

  // ================= wiring =================
  function seg(id, onChange) { const box = el(id); if (!box) return; box.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false'); b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); onChange(b.dataset.v); updateHash(); }); }); }
  function renderAll() {
    chartDefaults();
    renderHeader(); renderSummary(); renderStatements(); renderGuidance(); renderDrivers(); renderShare(); renderValuation(); renderRelative(); renderCapital(); renderDividends(); renderVatIntl(); renderMethod(); scenarioUi();
  }
  function setLang(lang) {
    LANG = lang;
    el('btnLangEs').classList.toggle('active', lang === 'es'); el('btnLangEn').classList.toggle('active', lang === 'en');
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es-MX' : 'en');
    document.querySelectorAll('.es').forEach((e) => { e.hidden = lang !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = lang !== 'en'; });
    try { localStorage.setItem('q-lang', lang); } catch (e) { /* ignore */ }
    fillSelects(); renderAll();
  }
  el('btnLangEs').addEventListener('click', () => setLang('es')); el('btnLangEn').addEventListener('click', () => setLang('en'));

  // ---------------- print as presentation ----------------
  function renderPrintExtras() {
    const conf = LANG === 'es' ? 'Confidencial. Preparado para uso interno; no distribuir.' : 'Confidential. Prepared for internal use; do not distribute.';
    const today = new Date().toISOString().slice(0, 10);
    const gv = vintagesSorted().pop();
    const basis = LANG === 'es'
      ? [`Último trimestre reportado: ${lastQ ? qLabel(lastQ) : '—'} (${lastQ && lastQ.sources && lastQ.sources.is ? fmtDate(lastQ.sources.is.date) : '—'})`, `Expectativas vigentes: ${gv ? fmtDate(gv.date) : '—'}`, `Cierre de mercado: ${lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'}`, `Comparación en pantalla: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`]
      : [`Latest reported quarter: ${lastQ ? qLabel(lastQ) : '—'} (${lastQ && lastQ.sources && lastQ.sources.is ? fmtDate(lastQ.sources.is.date) : '—'})`, `Expectations in force: ${gv ? fmtDate(gv.date) : '—'}`, `Market close: ${lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'}`, `Comparison on screen: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`];
    html('printCover', `<div>${LANG === 'es' ? 'Modelo financiero interactivo · elaborado únicamente con información pública' : 'Interactive financial model · built only from public information'}</div><div class="basis">${basis.map((x) => `<div>${x}</div>`).join('')}<div>${LANG === 'es' ? 'Impreso el' : 'Printed'} ${fmtDate(today)} · fnam.mx/qualitas</div></div><div class="conf">${conf}</div>`);
    const esc = (x) => x.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const left = esc(`Quálitas · ${LANG === 'es' ? 'Modelo financiero' : 'Financial model'} · fnam.mx/qualitas · ${conf} · ${fmtDate(today)}`);
    let stl = el('printPageStyle'); if (!stl) { stl = document.createElement('style'); stl.id = 'printPageStyle'; document.head.appendChild(stl); }
    stl.textContent = `@page { size: 11in 8.5in; margin: 0.45in 0.55in 0.6in; @bottom-left { content: "${left}"; font-family: Inter, system-ui, sans-serif; font-size: 8.5pt; color: #555; vertical-align: top; padding-top: 6pt; } @bottom-right { content: "${LANG === 'es' ? 'Página' : 'Page'} " counter(page) " ${LANG === 'es' ? 'de' : 'of'} " counter(pages); font-family: Inter, system-ui, sans-serif; font-size: 9.5pt; color: #333; vertical-align: top; padding-top: 6pt; } }`;
    const src = el('srcGrid'), fine = document.querySelector('footer#sources .fine');
    html('printCloseBody', `<div class="src-grid">${src ? src.innerHTML : ''}</div><p class="fine">${fine ? fine.innerHTML : ''}</p><p class="conf">${conf}</p>`);
    document.querySelectorAll('#printCloseBody .es').forEach((e) => { e.hidden = LANG !== 'es'; }); document.querySelectorAll('#printCloseBody .en').forEach((e) => { e.hidden = LANG !== 'en'; });
  }
  let prevTheme = null, prevAnim = null;
  function setPrintMode(on) {
    if (on === PRINT) return;
    PRINT = on;
    const root = document.documentElement;
    if (on) {
      prevTheme = root.getAttribute('data-theme'); root.setAttribute('data-theme', 'light');
      if (hasChart()) { prevAnim = Chart.defaults.animation; Chart.defaults.animation = false; }
      renderAll(); renderPrintExtras();
      if (hasChart()) for (const c of Object.values(Chart.instances)) { c.options.responsive = false; c.resize(930, 240); }
    } else {
      if (prevTheme) root.setAttribute('data-theme', prevTheme); else root.removeAttribute('data-theme');
      if (hasChart()) Chart.defaults.animation = prevAnim;
      renderAll();
    }
  }
  window.addEventListener('beforeprint', () => setPrintMode(true));
  window.addEventListener('afterprint', () => setPrintMode(false));
  el('btnPrint').addEventListener('click', () => { setPrintMode(true); setTimeout(() => window.print(), 250); });
  const toggleGroup = (g) => { st.open[g.dataset.g] = !st.open[g.dataset.g]; renderStatements(); const again = el('stmtTable').querySelector(`[data-g="${g.dataset.g}"]`); if (again) again.focus(); };
  el('stmtTable').addEventListener('click', (e) => { if (e.target.closest('.gl')) return; const g = e.target.closest('[data-g]'); if (g) toggleGroup(g); });
  el('stmtTable').addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest && e.target.closest('[data-g]'); if (g && e.target === g) { e.preventDefault(); toggleGroup(g); } });
  seg('segStmt', (v) => { st.stmt = v; renderStatements(); });
  seg('segMode', (v) => { st.mode = v; fillSelects('yoy'); renderStatements(); });
  seg('segPreset', (v) => { fillSelects(v); renderStatements(); });
  el('selA').addEventListener('change', (e) => { st.a = e.target.value; renderStatements(); });
  el('selB').addEventListener('change', (e) => { st.b = e.target.value; renderStatements(); });
  el('chkVat').addEventListener('change', (e) => { st.exVat = e.target.checked; renderStatements(); renderHeader(); });
  el('chkUsd').addEventListener('change', (e) => { st.usd = e.target.checked; renderStatements(); });
  seg('segGuideMetric', (v) => { gs.metric = v; renderGuideChart(); });
  seg('segDrvMetric', (v) => { dv.metric = v; dv.sel = new Set(['total']); renderDrivers(); });
  seg('segDrvFreq', (v) => { dv.freq = v; renderDrivers(); });
  seg('segRange', (v) => { sh.range = v; renderShare(); });
  // active nav link on scroll
  const navLinks = [...document.querySelectorAll('nav.jump a')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); }, { rootMargin: '-40% 0px -55% 0px' }); sections.forEach((s) => io.observe(s)); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderAll());

  // ---------------- init ----------------
  let initLang = 'es';
  try { initLang = localStorage.getItem('q-lang') || 'es'; } catch (e) { /* ignore */ }
  const hashLang = applyHash();           // a shared scenario link restores periods, toggles and assumptions
  computeSince();
  syncControlsFromState();
  setLang(hashLang || initLang);
  hashReady = true; updateHash();
  window.addEventListener('hashchange', () => { const l = applyHash(); if (l && l !== LANG) setLang(l); else { syncControlsFromState(); fillSelects(); renderAll(); } });
})();
