/* Gentera interactive financial model — page logic.
   Data contracts (window.G_*) are documented in tools/gentera/README.md. Everything here is derived from
   those files at render time; no figures are hard-coded. Structure mirrors the Quálitas model (site/qualitas/app.js). */
(function () {
  'use strict';
  const FIN = window.G_FIN || { quarters: [], ytd: [], years: [], layout: { is: [], bs: [], kpi: [] } };
  const OPS = window.G_OPS || { quarters: [], monthly: {} };
  const MK = window.G_MARKET || { prices: {}, dividends: {}, fx: {}, rates: {} };
  const REF = window.G_REF || {};
  const PEERS = window.G_PEERS || { peers: [] };
  const GD = window.G_GUIDANCE || { vintages: [] };
  const CM = window.G_COMMENTS || { periods: {} };
  const SUM = window.G_SUMMARY || { sections: [] };
  const QL = window.G_QUALITY || {};

  // ---------------- i18n ----------------
  let LANG = 'es';
  let PRINT = false;
  const lastN = () => (PRINT ? 8 : 12);
  const S = {
    quarter: { es: 'Trimestre', en: 'Quarter' }, ytd: { es: 'Acumulado', en: 'Year-to-date' }, ltm: { es: 'Últimos 12 meses', en: 'Last twelve months' }, fy: { es: 'Año fiscal', en: 'Fiscal year' },
    is: { es: 'Estado de resultados', en: 'Income statement' }, bs: { es: 'Balance general', en: 'Balance sheet' },
    line: { es: 'Concepto', en: 'Line item' }, change: 'Δ', changePct: 'Δ %',
    mxnM: { es: 'Ps. millones', en: 'Ps. million' }, usdM: { es: 'US$ millones', en: 'US$ million' },
    reported: { es: 'como se reporta', en: 'as reported' }, exAdj: { es: 'sin la partida del 4T25', en: 'excluding the 4Q25 item' },
    src: { es: 'Fuente', en: 'Source' }, release: { es: 'informe trimestral de Gentera', en: 'Gentera quarterly release' }, seed: { es: 'transcripción del informe (semilla)', en: 'release transcription (seed)' },
    total: { es: 'Total', en: 'Total' }, metric: { es: 'Métrica', en: 'Metric' }, value: { es: 'Valor', en: 'Value' },
    block: { es: 'Bloque', en: 'Block' }, cadence: { es: 'Cadencia', en: 'Cadence' }, mechanism: { es: 'Mecanismo', en: 'Mechanism' }, lastUpdate: { es: 'Última actualización', en: 'Last update' },
    ops: { es: 'Métricas operativas y por subsidiaria', en: 'Operating and segment metrics' }, comments: { es: 'Comentarios', en: 'Comments' }, items: { es: 'conceptos', en: 'items' },
    cmtNote: { es: 'Comentarios (a/a) elaborados a partir de la discusión de la administración en los informes trimestrales. Las citas (💬) provienen de las transcripciones FactSet CallStreet de las conferencias de resultados suministradas a mano (original en inglés; traducción al español propia).', en: 'Comments (y/y) written from the management discussion in the quarterly releases. Quotes (💬) come from the hand-supplied FactSet CallStreet transcripts of the earnings calls (English original; Spanish translation ours).' },
    quoteOpen: { es: 'Cita de la conferencia', en: 'Call quote' }, quoteNone: { es: 'sin transcripción para este periodo', en: 'no transcript for this period' },
    cmtAuto: { es: 'Comentarios generados mecánicamente a partir de los impulsores (cartera, tasa, costo de fondeo, provisiones, gastos) porque este par no es una comparación a/a comentada.', en: 'Comments generated mechanically from the drivers (loans, yield, funding cost, provisions, opex) because this pair is not a commented y/y comparison.' },
    provisional: { es: 'Datos de mercado pendientes: la primera corrida del flujo de actualización llenará precios, tipo de cambio y tasas. Las cifras de los estados financieros están completas.', en: 'Market data pending: the first run of the refresh workflow fills prices, FX and yields. Statement figures are complete.' },
    pending: { es: 'Pendiente (conector FactSet)', en: 'Pending (FactSet connector)' }, pendingMk: { es: 'pendiente (datos de mercado)', en: 'pending (market data)' }, na: { es: 'n/d', en: 'n/a' },
    price: { es: 'Precio', en: 'Price' }, close: { es: 'cierre', en: 'close' }, high52: { es: 'Máx. 52 sem.', en: '52-wk high' }, low52: { es: 'Mín. 52 sem.', en: '52-wk low' }, ytdChg: { es: 'Var. en el año', en: 'YTD change' }, oneY: { es: 'Var. 1 año', en: '1-yr change' }, mktCap: { es: 'Capitalización', en: 'Market cap' },
    period: { es: 'Periodo', en: 'Period' }, ret: { es: 'Rendimiento', en: 'Return' }, year: { es: 'Año', en: 'Year' }, date: { es: 'Fecha', en: 'Date' }, type: { es: 'Tipo', en: 'Type' },
    initial: { es: 'Inicial', en: 'Initial' }, revised: { es: 'Revisada', en: 'Revised' }, reaffirmed: { es: 'Reafirmada', en: 'Reaffirmed' }, unchanged: { es: 'Sin cambios', en: 'Unchanged' },
    actual: { es: 'Real', en: 'Actual' }, tracking: { es: 'Seguimiento', en: 'Tracking' }, within: { es: 'En rango', en: 'In range' }, above: { es: 'Por encima', en: 'Above' }, below: { es: 'Por debajo', en: 'Below' }, better: { es: 'Mejor', en: 'Better' }, worse: { es: 'Peor', en: 'Worse' },
    guideFy: { es: 'Año', en: 'Year' }, guideStatus: { es: 'Estatus', en: 'Status' }, range: { es: 'Rango', en: 'Range' }, words: { es: 'En palabras de la administración', en: "In management's words" }, hits: { es: 'En rango o mejor', en: 'In range or better' },
    eps: { es: 'UPA', en: 'EPS' }, loanGrowth: { es: 'Crecimiento de cartera', en: 'Loan growth' }, opexGrowth: { es: 'Crecimiento de gastos', en: 'Opex growth' }, npl: { es: 'Índice de etapa 3', en: 'Stage-3 ratio' }, roeCtrl: { es: 'ROE controlador', en: 'Controlling ROE' },
    netIncome: { es: 'Utilidad neta', en: 'Net income' }, niCtrl: { es: 'Utilidad controladora', en: 'Controlling net income' }, loans: { es: 'Cartera bruta', en: 'Gross loans' }, clients: { es: 'Clientes de crédito', en: 'Credit clients' }, people: { es: 'Personas atendidas', en: 'People served' },
    roe: 'ROAE', roa: 'ROAA', nim: { es: 'MIN', en: 'NIM' }, cor: { es: 'Costo de riesgo', en: 'Cost of risk' }, coverage: { es: 'Cobertura', en: 'Coverage' }, effic: { es: 'Índice de eficiencia', en: 'Efficiency ratio' }, icap: 'ICAP',
    pe: { es: 'P/U', en: 'P/E' }, pbv: { es: 'P/VL', en: 'P/BV' }, bvps: { es: 'Valor en libros por acción', en: 'Book value per share' }, ltmS: { es: 'UDM', en: 'LTM' },
    perShare: { es: 'Valor por acción (Ps.)', en: 'Value per share (Ps.)' }, upside: { es: 'vs. precio actual', en: 'vs. current price' },
    agency: { es: 'Agencia', en: 'Agency' }, entity: { es: 'Entidad', en: 'Entity' }, rating: { es: 'Calificación', en: 'Rating' }, outlook: { es: 'Perspectiva', en: 'Outlook' },
    subsidiary: { es: 'Subsidiaria', en: 'Subsidiary' }, subMx: { es: 'Banco Compartamos (México)', en: 'Banco Compartamos (Mexico)' }, subPe: { es: 'Compartamos Banco Perú', en: 'Compartamos Banco Perú' }, subCc: 'ConCrédito', other: { es: 'Otros (Yastás)', en: 'Other (Yastás)' }, cons: { es: 'Consolidado', en: 'Consolidated' },
    dps: { es: 'Dividendo por acción (Ps.)', en: 'Dividend per share (Ps.)' }, payout: { es: 'Razón de pago', en: 'Payout ratio' }, yield: { es: 'Rendimiento', en: 'Yield' }, agm: { es: 'Aprobado en asamblea', en: 'Approved at AGM' }, dividends: { es: 'Dividendos', en: 'Dividends' },
    derived: { es: 'Derivado de los renglones reportados', en: 'Derived from the reported lines' }, page: { es: 'p.', en: 'p.' }, asReported: { es: 'cifra reportada', en: 'as reported' },
  };
  const t = (k) => (S[k] ? (typeof S[k] === 'string' ? S[k] : S[k][LANG]) : k);
  const L = (obj) => (obj ? (typeof obj === 'string' ? obj : (LANG === 'es' ? obj.es || obj.en : obj.en || obj.es)) : '');
  const LS = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v : L(v));

  // ---------------- formatting ----------------
  const locale = () => (LANG === 'es' ? 'es-MX' : 'en-US');
  const fmtN = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }));
  const fmtPct = (v, d = 1, sign = false) => (v == null || !isFinite(v) ? '—' : (sign && v > 0 ? '+' : '') + v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + '%');
  const fmtPp = (v, d = 1) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + fmtN(v, d) + ' pp');
  const fmtX = (v, d = 1) => (v == null || !isFinite(v) ? '—' : v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + 'x');
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')); return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  // Stamps for source lines: last reported quarter with its release date; reference-file revision date.
  const asOfQ = () => { const s = lastQ && lastQ.sources && lastQ.sources.is; return `${LANG === 'es' ? 'hasta' : 'through'} ${lastQ ? qLabel(lastQ) : '—'}${s && s.date ? ` (${fmtDate(s.date)})` : ''}`; };
  const refStamp = () => `${LANG === 'es' ? 'referencia actualizada el' : 'reference updated'} ${fmtDate(REF.updatedAt)}`;
  const qLabel = (q) => (LANG === 'es' ? `${q.q}T${String(q.fy).slice(2)}` : `${q.q}Q${String(q.fy).slice(2)}`);
  const ytdLabel = (fy, months) => `${months}M${String(fy).slice(2)}`;
  const cls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const clsInv = (v) => (v == null ? '' : v > 0 ? 'neg' : v < 0 ? 'pos' : '');
  const el = (id) => document.getElementById(id);
  const html = (id, s) => { const e = el(id); if (e) e.innerHTML = s; };
  const bn = () => (LANG === 'es' ? 'mil M' : 'bn');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  // ---------------- theme + chart defaults ----------------
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark' || (document.documentElement.getAttribute('data-theme') !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const SERIES = () => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => cssVar('--series-' + i));
  const hasChart = () => typeof Chart !== 'undefined';
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    if (reducedMotion() || PRINT) Chart.defaults.animation = false;
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
  const Q = FIN.quarters.filter((q) => q.is && q.is.intInc != null);
  const Y = FIN.years;
  const YTD = FIN.ytd;
  const lastQ = Q[Q.length - 1];
  const qById = Object.fromEntries(FIN.quarters.map((q) => [q.id, q]));
  const ytdById = Object.fromEntries(YTD.map((y) => [y.id, y]));
  const opsById = Object.fromEntries((OPS.quarters || []).map((o) => [o.id, o]));
  const prevQid = (q) => (q.q === 1 ? `${q.fy - 1}Q4` : `${q.fy}Q${q.q - 1}`);
  const yoyQid = (q) => `${q.fy - 1}Q${q.q}`;
  const sumParts = (objs) => { const o = {}; for (const x of objs) for (const [k, v] of Object.entries(x || {})) if (typeof v === 'number') o[k] = (o[k] || 0) + v; return o; };
  const POINT_KPI = ['npl', 'coverage', 'coverageRep', 'capAssets', 'bvps', 'nplCalc', 'leverage', 'loansToDeposits', 'eqAssets'];
  const sharesOf = (q) => (q && q.shares && q.shares.current) || (REF.shares && REF.shares.issued / 1e6) || null; // millions
  const quarterObj = (q) => ({ ...q, label: qLabel(q), qid: q.id, covers: [q.id], months: 3 });
  function ytdFor(q) {
    if (q.q === 1) return { ...quarterObj(q), id: ytdLabel(q.fy, 3), label: ytdLabel(q.fy, 3), months: 3 };
    const y = ytdById[ytdLabel(q.fy, q.q * 3)];
    if (!y) return null;
    return { ...y, id: y.id, label: y.id, qid: q.id, ops: q.ops, q: q.q };
  }
  function ltmFor(q) {
    const covers = []; let fy = q.fy, qq = q.q;
    for (let i = 0; i < 4; i++) { covers.unshift(`${fy}Q${qq}`); qq--; if (qq === 0) { qq = 4; fy--; } }
    const qs = covers.map((id) => qById[id]);
    const label = (LANG === 'es' ? 'UDM ' : 'LTM ') + qLabel(q);
    if (!qs.every((x) => x && x.is)) return null;
    const is = sumParts(qs.map((x) => x.is));
    const opening = qById[prevQid(qs[0])];
    const bals = (opening ? [opening] : []).concat(qs);
    const avg = (f) => (bals.every((x) => f(x) != null) ? bals.reduce((s, x) => s + f(x), 0) / bals.length : null);
    const avgL = avg((x) => x.bs.loans) || (FIN.notes && FIN.notes.loans4Q21 && qs[0].id === '2022Q1' ? (FIN.notes.loans4Q21 + qs.reduce((s, x) => s + x.bs.loans, 0)) / 5 : null);
    const avgA = avg((x) => x.bs.totAssets), avgE = avg((x) => x.bs.totEq), avgEc = avg((x) => x.bs.eqCtrl);
    const k = {};
    if (avgL) { k.cor = is.prov / avgL * 100; k.yieldCalc = is.intInc / avgL * 100; k.avgLoans = avgL; }
    if (is.opIncAfterProv) { k.effCalc = is.opex / is.opIncAfterProv * 100; k.effPre = is.opex / is.totOpInc * 100; }
    if (avgA) { k.roa = is.netInc / avgA * 100; k.efficOp = is.opex / avgA * 100; }
    if (avgE) k.roe = is.netInc / avgE * 100;
    if (avgEc) k.roeCtrl = is.niCtrl / avgEc * 100;
    if (is.ibt) k.taxRate = is.tax / is.ibt * 100;
    const nims = qs.map((x) => x.kpi.nim); if (nims.every((v) => v != null)) k.nim = nims.reduce((a, b) => a + b, 0) / 4;
    const nimsA = qs.map((x) => x.kpi.nimAdj); if (nimsA.every((v) => v != null)) k.nimAdj = nimsA.reduce((a, b) => a + b, 0) / 4;
    const sh = sharesOf(q); if (sh) k.eps = is.niCtrl / sh;
    for (const pk of POINT_KPI) if (q.kpi[pk] != null) k[pk] = q.kpi[pk];
    return { id: label, label, is, bs: q.bs, ops: q.ops, fy: q.fy, q: q.q, qid: q.id, covers, months: 12, shares: q.shares, sources: q.sources, derived: true, kpi: k };
  }
  const fyObj = (y) => ({ ...y, label: 'FY' + y.fy, qid: `${y.fy}Q4`, months: 12 });
  // The 4Q25 non-recurring deferred-tax write-down (reference.js → adjust): strip it from any period covering that quarter.
  const ADJ = REF.adjust;
  function exAdj(obj) {
    if (!obj || !ADJ || !obj.covers || !obj.covers.includes(ADJ.quarter) || !obj.is) return obj;
    const a = ADJ.taxMxnM;
    const is = { ...obj.is };
    if (is.tax != null) is.tax -= a;
    for (const k of ['netInc', 'niCtrl', 'compInc', 'niCC']) if (is[k] != null) is[k] += a;
    const kpi = { ...obj.kpi };
    if (is.ibt) kpi.taxRate = is.tax / is.ibt * 100;
    const sh = sharesOf(qById[obj.qid] || obj); if (sh && is.niCtrl != null) kpi.eps = is.niCtrl / sh;
    const f = obj.is.netInc ? is.netInc / obj.is.netInc : 1;
    for (const k of ['roa', 'roe']) if (kpi[k] != null) kpi[k] = kpi[k] * f;
    if (kpi.roeCtrl != null && obj.is.niCtrl) kpi.roeCtrl = kpi.roeCtrl * is.niCtrl / obj.is.niCtrl;
    return { ...obj, is, kpi, exAdj: true };
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
  const TICK = (REF.company && REF.company.yahoo) || 'GENTERA.MX';
  const qPx = px(TICK); const lastPx = lastPoint(qPx);
  const sharesM = lastQ ? sharesOf(lastQ) : null; // millions
  const sharesOut = sharesM ? sharesM * 1e6 : null;
  const qEndDate = (q) => `${q.fy}-${String(q.q * 3).padStart(2, '0')}-${q.q === 1 || q.q === 4 ? '31' : '30'}`;
  const bvps = (q) => (q && q.bs && q.bs.eqCtrl != null && sharesOf(q) ? q.bs.eqCtrl / sharesOf(q) : null);
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const epsLtm = (obj) => (obj && obj.kpi && obj.kpi.eps != null ? obj.kpi.eps : null);
  const divsApproved = (year) => (REF.dividends || []).find((d) => d.agmYear === year);
  const dpsOf = (d) => (d && d.totalMxnM && d.shares ? d.totalMxnM * 1e6 / d.shares : null);

  // ================= HEADER =================
  function renderHeader() {
    const es = LANG === 'es';
    const asof = [];
    if (lastQ) { const s = lastQ.sources && lastQ.sources.is; asof.push(`<span><b>${t('quarter')}:</b> ${qLabel(lastQ)}${s && s.date ? ' · ' + fmtDate(s.date) : ''}</span>`); }
    const today = new Date().toISOString().slice(0, 10);
    const nx = REF.company && REF.company.nextResults;
    if (nx) { const past = nx.date && nx.date < today && (!lastQ || nx.quarter !== lastQ.id); asof.push(`<span><b>${es ? 'Próximo informe' : 'Next release'}:</b> ${nx.quarter ? qLabel({ fy: +nx.quarter.slice(0, 4), q: +nx.quarter.slice(5) }) : ''} · ${past ? (es ? 'fecha por confirmar (la anunciada, ' + fmtDate(nx.date) + ', ya pasó)' : 'date to be confirmed (the announced ' + fmtDate(nx.date) + ' has passed)') : fmtDate(nx.date)}</span>`); }
    asof.push(`<span><b>${t('price')}:</b> ${lastPx ? fmtDate(lastPx[0]) : t('pendingMk')}</span>`);
    asof.push(`<span><b>${es ? 'Datos generados' : 'Data generated'}:</b> ${fmtDate((FIN.generatedAt || '').slice(0, 10))}</span>`);
    html('asofRow', asof.join(''));
    // Freshness guard: the workflow refreshes prices every weekday and rebuilds the statements every weekday;
    // if either stamp is older than a week the page says so instead of showing stale data as current.
    const notice = el('dataNotice');
    const ageDays = (iso) => (iso ? Math.round((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 864e5) : null);
    const mkAge = lastPx ? ageDays(lastPx[0]) : null, finAge = ageDays(FIN.generatedAt);
    const stale = [];
    if (mkAge != null && mkAge > 7) stale.push(es ? `los precios no se han actualizado desde el ${fmtDate(lastPx[0])}` : `prices have not refreshed since ${fmtDate(lastPx[0])}`);
    if (finAge != null && finAge > 10) stale.push(es ? `los estados financieros no se han regenerado desde el ${fmtDate(FIN.generatedAt.slice(0, 10))}` : `the statements have not been regenerated since ${fmtDate(FIN.generatedAt.slice(0, 10))}`);
    if (!qPx.length) { notice.hidden = false; notice.className = 'notice warn'; notice.textContent = t('provisional'); }
    else if (stale.length && !PRINT) { notice.hidden = false; notice.className = 'notice warn'; notice.textContent = (es ? 'Aviso de actualización: ' : 'Refresh notice: ') + stale.join('; ') + (es ? '. Revise el flujo gentera-refresh en GitHub Actions.' : '. Check the gentera-refresh workflow in GitHub Actions.'); }
    else notice.hidden = true;
    const k = [];
    if (lastPx) { const yAgo = pointAtOrBefore(qPx, addDays(lastPx[0], -365)); k.push({ l: 'GENTERA (BMV)', v: 'Ps. ' + fmtN(lastPx[1], 2), d: yAgo ? `<span class="${cls(lastPx[1] - yAgo[1])}">${fmtPct(100 * (lastPx[1] / yAgo[1] - 1), 1, true)}</span> ${t('oneY')}` : '' }); }
    else k.push({ l: 'GENTERA (BMV)', v: '—', d: t('pendingMk') });
    if (lastPx && sharesOut) { const mc = lastPx[1] * sharesOut; k.push({ l: t('mktCap'), v: 'Ps. ' + fmtN(mc / 1e9, 1) + ' ' + bn(), d: fxAt(lastPx[0]) ? 'US$ ' + fmtN(mc / fxAt(lastPx[0]) / 1e9, 2) + ' ' + bn() : '' }); }
    else k.push({ l: t('mktCap'), v: '—', d: t('pendingMk') });
    if (lastLTM) k.push({ l: `${t('netIncome')} ${t('ltmS')}`, v: 'Ps. ' + fmtN(lastLTM.is.netInc) + ' M', d: `${t('roe')} ${t('ltmS')} ${fmtPct(lastLTM.kpi.roe)} · ${lastQ ? qLabel(lastQ) : ''} ${fmtPct(lastQ && lastQ.kpi.roe)}` });
    if (lastLTM) { const e = epsLtm(lastLTM), ex = epsLtm(exAdj(lastLTM)); k.push({ l: `${t('pe')} ${t('ltmS')}`, v: lastPx && e ? fmtX(lastPx[1] / e) : '—', d: lastPx ? `${t('pbv')} ${fmtX(lastPx[1] / bvps(lastQ), 2)}${ex && ex !== e ? ` · ${t('exAdj')}: ${fmtX(lastPx[1] / ex)}` : ''}` : `${t('eps')} ${t('ltmS')} Ps. ${fmtN(e, 2)} · ${t('bvps')} Ps. ${fmtN(bvps(lastQ), 1)}` }); }
    if (lastQ && lastQ.kpi) k.push({ l: `${t('npl')} ${qLabel(lastQ)}`, v: fmtPct(lastQ.kpi.npl, 2), d: `${t('coverage')} ${fmtPct(lastQ.kpi.coverage, 0)} · ${t('cor')} ${fmtPct(lastQ.kpi.cor)}` });
    html('kpiStrip', k.map((x) => `<div class="kpi"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="delta">${x.d || ''}</div></div>`).join(''));
    el('genStamp').textContent = fmtDate((FIN.generatedAt || MK.generatedAt || '').slice(0, 10));
    renderChangedBanner();
  }
  // "What changed since your last visit": compare the newest data stamps with those stored at the previous visit.
  function renderChangedBanner() {
    const b = el('changedBanner'); if (!b) return;
    const now = { quarter: lastQ ? lastQ.id : null, market: lastPx ? lastPx[0] : null, guidance: (GD.vintages || []).map((v) => v.date).sort().pop() || null, comments: CM.updatedAt || null, summary: SUM.updatedAt || null };
    let prev = null; try { prev = JSON.parse(localStorage.getItem('g-seen') || 'null'); } catch (e) { /* ignore */ }
    const es = LANG === 'es';
    const items = [];
    if (prev) {
      if (now.quarter && prev.quarter !== now.quarter) items.push(es ? `nuevo trimestre reportado (${qLabel(lastQ)})` : `new reported quarter (${qLabel(lastQ)})`);
      if (now.guidance && prev.guidance !== now.guidance) items.push(es ? `nueva versión de la guía (${fmtDate(now.guidance)})` : `new guidance vintage (${fmtDate(now.guidance)})`);
      if (now.summary && prev.summary !== now.summary) items.push(es ? 'resumen ejecutivo reescrito' : 'executive summary rewritten');
      if (now.comments && prev.comments !== now.comments) items.push(es ? 'comentarios actualizados' : 'comments updated');
      if (now.market && prev.market !== now.market) items.push(es ? `precios al ${fmtDate(now.market)} (antes ${fmtDate(prev.market)})` : `prices to ${fmtDate(now.market)} (was ${fmtDate(prev.market)})`);
    }
    if (items.length && !PRINT) { b.hidden = false; b.innerHTML = `<button type="button" class="close" aria-label="close">×</button><b>${es ? 'Desde su última visita' : 'Since your last visit'}${prev && prev.at ? ` (${fmtDate(prev.at)})` : ''}:</b> ${items.join(' · ')}.`; b.querySelector('.close').addEventListener('click', () => { b.hidden = true; }); }
    else b.hidden = true;
    try { localStorage.setItem('g-seen', JSON.stringify({ ...now, at: new Date().toISOString().slice(0, 10) })); } catch (e) { /* ignore */ }
  }

  // ================= 00 EXECUTIVE SUMMARY =================
  function renderSummary() {
    const b = SUM.basis || {};
    const qq = b.quarter && (qById[b.quarter] || { fy: +b.quarter.slice(0, 4), q: +b.quarter.slice(5) });
    html('sumMeta', LANG === 'es'
      ? `Con base en los resultados del ${qq ? qLabel(qq) : '—'}${b.resultsDate ? ` (${fmtDate(b.resultsDate)})` : ''} y la guía del ${fmtDate(b.guidanceDate)} · redactado el ${fmtDate(SUM.updatedAt)}; se reescribe con cada informe nuevo. Las cifras de mercado del encabezado son diarias.`
      : `Based on ${qq ? qLabel(qq) : '—'} results${b.resultsDate ? ` (${fmtDate(b.resultsDate)})` : ''} and the guidance of ${fmtDate(b.guidanceDate)} · written ${fmtDate(SUM.updatedAt)}; rewritten with each new release. Market figures in the header are daily.`);
    html('sumGrid', (SUM.sections || []).map((sec) => `<div class="card"><h3>${L(sec.title)}</h3><ul>${(sec[LANG] || sec.en || []).map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join(''));
  }

  // ================= 01 STATEMENTS =================
  const st = { stmt: 'is', mode: 'q', a: null, b: null, exAdj: false, usd: false, open: {} };
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
  const pick = (opts, id) => { const o = (opts.find((x) => x.id === id) || {}).obj; return st.exAdj ? exAdj(o) : o; };
  function avgFx(obj) {
    const end = qEndDate(obj);
    const months = obj.months || 3;
    const start = addDays(end, -30 * months);
    const pts = fxPts.filter((p) => p[0] > start && p[0] <= end);
    return pts.length ? pts.reduce((a, p) => a + p[1], 0) / pts.length : null;
  }
  function convert(v, def, obj) {
    if (v == null) return null;
    if (def.pct || def.perShare || def.x || def.count) return v;
    if (!st.usd) return v;
    const rate = st.stmt === 'bs' || def.ops ? fxAt(qEndDate(obj)) : avgFx(obj);
    return rate ? v / rate : null;
  }
  function commentsFor(A, B) {
    if (!A || !B) return null;
    const yoy = st.mode === 'q' ? (B.fy === A.fy - 1 && B.q === A.q) : st.mode === 'ytd' ? (B.fy === A.fy - 1 && B.months === A.months) : st.mode === 'fy' ? (B.fy === A.fy - 1) : false;
    const P = CM.periods || {};
    const ck = st.mode === 'q' ? A.qid : st.mode === 'ytd' ? `${A.fy}M${A.months}` : st.mode === 'fy' ? A.id : null;
    const c = yoy && ck ? P[ck] || null : null;
    const hasLines = !!(c && c.lines && Object.keys(c.lines).length);
    // Call quotes belong to the period shown in column A whatever the comparison (they describe that period).
    const cq = ck && P[ck] && P[ck].call && P[ck].call.quotes ? P[ck].call : null;
    if (c) return { lines: hasLines ? c.lines : autoComments(A, B), ops: c.ops || {}, bs: c.bs || {}, call: c.call, quotes: cq ? cq.quotes : null, callMeta: cq, any: true, auto: !hasLines };
    return { lines: autoComments(A, B), ops: {}, bs: {}, quotes: cq ? cq.quotes : null, callMeta: cq, any: true, auto: true };
  }
  // Expandable management quote under a comment cell (open in print mode so the PDF carries the words).
  function quoteHtml(C, k) {
    const qd = C && C.quotes && C.quotes[k]; if (!qd) return '';
    return `<details class="quote"${PRINT ? ' open' : ''}><summary>💬 ${esc(qd.who)}${C.callMeta && C.callMeta.date ? ` · ${fmtDate(C.callMeta.date)}` : ''}</summary><blockquote>${esc(L(qd))}</blockquote></details>`;
  }
  // Mechanical comments from the drivers for pairs without a hand-written block.
  function autoComments(A, B) {
    const es = LANG === 'es';
    const g = (o, k) => (o && o.is ? o.is[k] : null), kk = (o, k) => (o && o.kpi ? o.kpi[k] : null), ob = (o, k) => (o && o.bs ? o.bs[k] : null);
    const pct = (a, b) => (a != null && b ? 100 * (a / b - 1) : null);
    const dir = (v, d = 1) => (v == null ? '' : (v > 0 ? (es ? 'subió' : 'up') : v < 0 ? (es ? 'bajó' : 'down') : (es ? 'sin cambio' : 'flat')) + ' ' + fmtPct(Math.abs(v), d));
    const pp = (a, b) => (a != null && b != null ? fmtPp(a - b) : '—');
    const out = {};
    const put = (k, es_, en_) => { out[k] = { es: es_, en: en_ }; };
    const lp = pct(ob(A, 'loans'), ob(B, 'loans')), al = pct(kk(A, 'avgLoans'), kk(B, 'avgLoans'));
    put('loans', `Cartera bruta ${dir(lp)} a Ps. ${fmtN(ob(A, 'loans'))} M.`, `Gross loans ${dir(lp)} to Ps. ${fmtN(ob(A, 'loans'))} M.`);
    put('intInc', `Sigue a la cartera: cartera promedio ${dir(al)}; tasa activa calculada ${pp(kk(A, 'yieldCalc'), kk(B, 'yieldCalc'))} a ${fmtPct(kk(A, 'yieldCalc'))}.`, `Tracks the book: average loans ${dir(al)}; computed yield ${pp(kk(A, 'yieldCalc'), kk(B, 'yieldCalc'))} to ${fmtPct(kk(A, 'yieldCalc'))}.`);
    put('intExp', `Gastos por financiamiento ${dir(pct(g(A, 'fundExp'), g(B, 'fundExp')))}; costo de fondeo del banco ${fmtPct(A.ops && A.ops.cofMX)} vs ${fmtPct(B.ops && B.ops.cofMX)}.`, `Funding cost ${dir(pct(g(A, 'fundExp'), g(B, 'fundExp')))}; bank cost of funds ${fmtPct(A.ops && A.ops.cofMX)} vs ${fmtPct(B.ops && B.ops.cofMX)}.`);
    put('finMargin', `Ingresos por intereses ${dir(pct(g(A, 'intInc'), g(B, 'intInc')))} contra gastos por intereses ${dir(pct(g(A, 'intExp'), g(B, 'intExp')))}; MIN ${pp(kk(A, 'nim'), kk(B, 'nim'))}.`, `Interest income ${dir(pct(g(A, 'intInc'), g(B, 'intInc')))} against interest expense ${dir(pct(g(A, 'intExp'), g(B, 'intExp')))}; NIM ${pp(kk(A, 'nim'), kk(B, 'nim'))}.`);
    put('prov', `Provisiones ${dir(pct(g(A, 'prov'), g(B, 'prov')))}: etapa 3 de ${fmtPct(kk(B, 'npl'), 2)} a ${fmtPct(kk(A, 'npl'), 2)}; costo de riesgo ${pp(kk(A, 'cor'), kk(B, 'cor'))} a ${fmtPct(kk(A, 'cor'))}.`, `Provisions ${dir(pct(g(A, 'prov'), g(B, 'prov')))}: stage 3 from ${fmtPct(kk(B, 'npl'), 2)} to ${fmtPct(kk(A, 'npl'), 2)}; cost of risk ${pp(kk(A, 'cor'), kk(B, 'cor'))} to ${fmtPct(kk(A, 'cor'))}.`);
    put('netFees', `Comisiones cobradas ${dir(pct(g(A, 'feesCh'), g(B, 'feesCh')))} (sobre todo seguros); pagadas ${dir(pct(g(A, 'feesPd'), g(B, 'feesPd')))}.`, `Fees charged ${dir(pct(g(A, 'feesCh'), g(B, 'feesCh')))} (mostly insurance); fees paid ${dir(pct(g(A, 'feesPd'), g(B, 'feesPd')))}.`);
    put('opex', `Gastos ${dir(pct(g(A, 'opex'), g(B, 'opex')))} contra cartera ${dir(lp)}; índice de eficiencia ${pp(kk(A, 'effCalc'), kk(B, 'effCalc'))} a ${fmtPct(kk(A, 'effCalc'))}.`, `Opex ${dir(pct(g(A, 'opex'), g(B, 'opex')))} against loans ${dir(lp)}; efficiency ratio ${pp(kk(A, 'effCalc'), kk(B, 'effCalc'))} to ${fmtPct(kk(A, 'effCalc'))}.`);
    put('tax', `Tasa efectiva ${pp(kk(A, 'taxRate'), kk(B, 'taxRate'))} a ${fmtPct(kk(A, 'taxRate'))}.`, `Effective rate ${pp(kk(A, 'taxRate'), kk(B, 'taxRate'))} to ${fmtPct(kk(A, 'taxRate'))}.`);
    put('netInc', `Resultado antes de impuestos ${dir(pct(g(A, 'ibt'), g(B, 'ibt')))}, impuestos ${dir(pct(g(A, 'tax'), g(B, 'tax')))}; ROAE ${pp(kk(A, 'roe'), kk(B, 'roe'))} a ${fmtPct(kk(A, 'roe'))}.`, `Pre-tax result ${dir(pct(g(A, 'ibt'), g(B, 'ibt')))}, taxes ${dir(pct(g(A, 'tax'), g(B, 'tax')))}; ROAE ${pp(kk(A, 'roe'), kk(B, 'roe'))} to ${fmtPct(kk(A, 'roe'))}.`);
    put('niCtrl', `Utilidad neta ${dir(pct(g(A, 'netInc'), g(B, 'netInc')))}; participación minoritaria ${dir(pct(g(A, 'niMin'), g(B, 'niMin')))} tras las compras de ConCrédito (ago-2022 a 74.9%, jun-2025 a 100%).`, `Net income ${dir(pct(g(A, 'netInc'), g(B, 'netInc')))}; minority share ${dir(pct(g(A, 'niMin'), g(B, 'niMin')))} after the ConCrédito buyouts (Aug-2022 to 74.9%, Jun-2025 to 100%).`);
    put('eps', `Utilidad controladora ${dir(pct(g(A, 'niCtrl'), g(B, 'niCtrl')))} sobre ${fmtN(sharesOf(qById[A.qid]), 1)} M de acciones.`, `Controlling net income ${dir(pct(g(A, 'niCtrl'), g(B, 'niCtrl')))} on ${fmtN(sharesOf(qById[A.qid]), 1)} M shares.`);
    return out;
  }
  // Provenance tooltip: release, page and the figure as printed (before USD conversion / adjustment).
  function provenance(obj, def, raw) {
    if (!obj) return '';
    const s = obj.sources && (def.kpi && def.page === 3 ? obj.sources.is : st.stmt === 'bs' || def.ops ? obj.sources.bs : obj.sources.is);
    const es = LANG === 'es';
    if (def.page == null) return `${t('derived')}${obj.derived ? (es ? ' · periodo calculado a partir de trimestres reportados' : ' · period computed from reported quarters') : ''}`;
    const parts = [];
    if (s) parts.push((s.seed ? t('seed') : t('release')) + (s.title ? ` · ${s.title}` : ''));
    if (def.page) parts.push(`${t('page')} ${def.page}`);
    if (raw != null) parts.push(`${t('asReported')}: ${def.pct ? fmtPct(raw, 2) : def.perShare ? fmtN(raw, 2) : fmtN(raw, Number.isInteger(raw) ? 0 : 1)}`);
    if (obj.derived) parts.push(es ? 'suma / promedio de trimestres reportados' : 'sum / average of reported quarters');
    if (obj.exAdj && ['tax', 'netInc', 'niCtrl', 'niCC', 'compInc', 'taxRate', 'eps', 'roe', 'roa', 'roeCtrl'].includes(def.k)) parts.push(t('exAdj'));
    return parts.join(' · ');
  }
  function renderStatements() {
    const opts = periodOptions();
    const A = pick(opts, st.a), B = pick(opts, st.b);
    const layout = FIN.layout[st.stmt] || [];
    const key = st.stmt;
    const raw = (obj, def) => { if (!obj) return null; const src = def.kpi ? obj.kpi : def.ops ? obj.ops : obj[key]; if (!src) return null; const v = src[def.k]; return v == null ? null : v; };
    const get = (obj, def) => { const v = raw(obj, def); return v == null ? null : convert(v, def, obj); };
    const C = commentsFor(A, B);
    const cmap = C ? (key === 'is' ? C.lines : C.bs) : null;
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
      const isPct = def.pct, isPs = def.perShare, isX = def.x;
      const f = (v) => (v == null ? '—' : isPct ? fmtPct(v, def.k === 'npl' || def.k === 'nplCalc' ? 2 : 1) : isPs ? fmtN(v, 2) : isX ? fmtX(v, 2) : fmtN(v, st.usd ? 1 : 0));
      const fd = d == null ? '—' : isPct ? fmtPp(d) : isPs ? fmtN(d, 2) : isX ? fmtN(d, 2) + 'x' : fmtN(d, st.usd ? 1 : 0);
      const isHead = !!groups[def.k];
      const cmt = `<td class="cmt">${cmap && cmap[def.k] ? L(cmap[def.k]) : ''}${quoteHtml(C, def.k)}</td>`;
      const first = isHead ? `<td data-g="${def.k}"><span class="grp">${st.open[def.k] ? '▾' : '▸'}</span>${L(def)}<span class="cnt">${groups[def.k].length} ${t('items')}</span></td>` : `<td>${L(def)}</td>`;
      const costRatio = def.kpi && ['cor', 'effCalc', 'effPre', 'efficOp', 'taxRate', 'npl', 'nplCalc', 'leverage'].includes(def.k);
      const dcls = costRatio ? clsInv(d) : cls(d);
      rows.push(`<tr class="${isHead ? 'grp-head ' : ''}${def.kpi ? 'kpi ' : ''}${def.level === 0 || def.bold ? 'bold' : def.level === 2 ? 'sub2' : def.level === 1 ? 'sub' : ''}">${first}<td title="${esc(provenance(A, def, raw(A, def)))}">${f(va)}</td><td title="${esc(provenance(B, def, raw(B, def)))}">${f(vb)}</td><td class="${dcls}">${fd}</td><td class="${dcls}">${isPct || isX ? '' : fmtPct(pct, 1, true)}</td>${cmt}</tr>`);
    }
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    if (!rows.length) rows.push(`<tr><td colspan="6" class="muted">${LANG === 'es' ? 'Sin datos para este periodo.' : 'No data for this period.'}</td></tr>`);
    html('stmtTable', `<table class="stmt-table"><thead><tr><th>${t('line')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th><th class="cmt">${t('comments')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('stmtTitle').textContent = `${t(st.stmt)} · ${la} vs ${lb}`;
    const unit = st.usd ? t('usdM') : t('mxnM');
    const es = LANG === 'es';
    el('stmtCap').textContent = `${unit}${st.stmt === 'is' ? ' · ' + (st.exAdj ? t('exAdj') : t('reported')) : ''}${st.usd ? (es ? ' · convertido con el tipo de cambio promedio (flujos) o de cierre (balance) de la Fed H.10' + (fxPts.length ? '' : ' — sin serie de tipo de cambio todavía') : ' · converted at the Fed H.10 average (flows) or period-end (balance sheet) rate' + (fxPts.length ? '' : ' — no FX series yet')) : ''}${(A && A.derived) || (B && B.derived) ? (es ? ' · periodos acumulados/UDM calculados a partir de trimestres reportados' : ' · YTD/LTM periods computed from reported quarters') : ''} · ${C && C.auto ? t('cmtAuto') : t('cmtNote')}`;
    const srcs = [A, B].filter(Boolean).map((o) => o.sources && o.sources[key === 'bs' ? 'bs' : 'is']).filter(Boolean);
    html('stmtSrc', `${t('src')}: ` + [...new Map(srcs.map((s) => [s.url + (s.title || ''), s])).values()].map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.seed ? t('seed') : t('release')}${s.title ? ` — ${s.title}` : ''}${s.date ? ` (${fmtDate(s.date)})` : ''}</a>`).join(' · ') + (C && C.callMeta ? ' · 💬 ' + L(C.callMeta) : C && C.call && !C.auto ? ' · ' + L(C.call) : ''));
    const first = Q[0];
    html('stmtMeta', es
      ? `Cobertura: ${Q.length} trimestres (${qLabel(first)} → ${qLabel(lastQ)}), ${Y.length} años fiscales (${Y[0] ? 'FY' + Y[0].fy : ''} → ${Y.length ? 'FY' + Y[Y.length - 1].fy : ''}). Cifras en pesos nominales tal como las reporta Gentera (criterios CNBV), en millones. Origen de cada trimestre en <a href="quality.html">quality.html</a>.`
      : `Coverage: ${Q.length} quarters (${qLabel(first)} → ${qLabel(lastQ)}), ${Y.length} fiscal years (${Y[0] ? 'FY' + Y[0].fy : ''} → ${Y.length ? 'FY' + Y[Y.length - 1].fy : ''}). Nominal pesos as reported by Gentera (CNBV criteria), in millions. Origin of every quarter at <a href="quality.html">quality.html</a>.`);
    renderOps(A, B, C); renderRevMix(); renderMarginsChart(); renderKpiTable();
  }
  // ---- Operating metrics and segment table (loans, clients, headcount, subsidiary P&L).
  function renderOps(A, B, C) {
    const es = LANG === 'es';
    const oa = A ? { ...opsById[A.qid], ...A.ops } : null, ob = B ? { ...opsById[B.qid], ...B.ops } : null;
    const fxA = st.usd && A ? fxAt(qEndDate(A)) : null, fxB = st.usd && B ? fxAt(qEndDate(B)) : null;
    const fxfA = st.usd && A ? avgFx(A) : null, fxfB = st.usd && B ? avgFx(B) : null;
    const ops = (C && C.ops) || {};
    const rows = [];
    const head = (label) => rows.push(`<tr class="head"><td colspan="6">${label}</td></tr>`);
    const row = (label, k, opt = {}) => {
      let va = opt.flow ? (A && A.is ? A.is[k] : null) : oa ? oa[k] : null, vb = opt.flow ? (B && B.is ? B.is[k] : null) : ob ? ob[k] : null;
      if (opt.money && st.usd) { const ra = opt.flow ? fxfA : fxA, rb = opt.flow ? fxfB : fxB; va = va != null && ra ? va / ra : null; vb = vb != null && rb ? vb / rb : null; }
      if (va == null && vb == null) return;
      const d = va != null && vb != null ? va - vb : null;
      const pct = d != null && vb ? 100 * d / Math.abs(vb) : null;
      const f = (v) => (v == null ? '—' : opt.pct ? fmtPct(v, opt.dec != null ? opt.dec : 1) : opt.money ? fmtN(v, st.usd ? 1 : 0) : fmtN(v, opt.dec || 0));
      const fd = d == null ? '—' : opt.pct ? fmtPp(d) : opt.money ? fmtN(d, st.usd ? 1 : 0) : fmtN(d, opt.dec || 0);
      const dcls = opt.inv ? clsInv(d) : cls(d);
      rows.push(`<tr class="${opt.cls || ''}"><td>${label}</td><td title="${esc(opt.page ? `${t('release')} · ${t('page')} ${opt.page}` : t('derived'))}">${f(va)}</td><td>${f(vb)}</td><td class="${dcls}">${fd}</td><td class="${dcls}">${opt.pct ? '' : fmtPct(pct, 1, true)}</td><td class="cmt">${ops[k] ? L(ops[k]) : ''}${quoteHtml(C, k)}</td></tr>`);
    };
    const mny = st.usd ? t('usdM') : t('mxnM');
    head(`${t('loans')} (${mny})`);
    row(t('subMx'), 'loansMX', { cls: 'sub', money: true, page: 7 }); row(t('subPe'), 'loansPE', { cls: 'sub', money: true, page: 7 }); row(t('subCc'), 'loansCC', { cls: 'sub', money: true, page: 7 }); row(t('other'), 'loansOther', { cls: 'sub', money: true });
    row(t('cons'), 'loans', { cls: 'bold', money: true, page: 8 });
    head(es ? 'Clientes y red' : 'Clients and network');
    row(es ? 'Clientes de crédito (Banco)' : 'Credit clients (Bank)', 'clientsMX', { cls: 'sub', page: 10 }); row(es ? 'Clientes de crédito (Perú)' : 'Credit clients (Perú)', 'clientsPE', { cls: 'sub', page: 14 }); row(es ? 'Usuarios finales ConCrédito' : 'ConCrédito end users', 'usersCC', { cls: 'sub', page: 17 });
    row(t('clients'), 'clientsCred', { cls: 'bold', page: 3 }); row(t('people'), 'clientsTot', { page: 3 });
    row(es ? 'Saldo promedio por cliente (Ps.)' : 'Average balance per client (Ps.)', 'avgBal', { page: 3 }); row(es ? 'Tasa activa (Gentera, cierre)' : 'Lending rate (Gentera, period-end)', 'yieldDisc', { pct: true, page: 3 });
    row(es ? 'Colaboradores' : 'Employees', 'employees', { page: 3 }); row(es ? 'Oficinas de servicio' : 'Service offices', 'offices', { cls: 'sub', page: 3 }); row(es ? 'Sucursales bancarias' : 'Bank branches', 'branches', { cls: 'sub', page: 10 });
    head(`${es ? 'Por subsidiaria: ingresos por intereses' : 'By subsidiary: interest income'} (${mny})`);
    row(t('subMx'), 'iiMX', { cls: 'sub', money: true, flow: true, page: 10 }); row(t('subPe'), 'iiPE', { cls: 'sub', money: true, flow: true, page: 14 }); row(t('subCc'), 'iiCC', { cls: 'sub', money: true, flow: true, page: 17 });
    head(`${es ? 'Por subsidiaria: margen financiero' : 'By subsidiary: financial margin'} (${mny})`);
    row(t('subMx'), 'fmMX', { cls: 'sub', money: true, flow: true, page: 10 }); row(t('subPe'), 'fmPE', { cls: 'sub', money: true, flow: true, page: 14 }); row(t('subCc'), 'fmCC', { cls: 'sub', money: true, flow: true, page: 17 });
    head(`${es ? 'Por subsidiaria: utilidad neta' : 'By subsidiary: net income'} (${mny})`);
    row(t('subMx'), 'niMX', { cls: 'sub', money: true, flow: true, page: 10 }); row(t('subPe'), 'niPE', { cls: 'sub', money: true, flow: true, page: 14 }); row(t('subCc'), 'niCC', { cls: 'sub', money: true, flow: true, page: 17 }); row(t('other'), 'niOther', { cls: 'sub', money: true, flow: true });
    head(es ? 'Por subsidiaria: etapa 3, MIN y costo de fondeo (%)' : 'By subsidiary: stage 3, NIM and cost of funds (%)');
    row(`${t('npl')} · ${t('subMx')}`, 'nplMX', { cls: 'sub', pct: true, dec: 2, inv: true, page: 10 }); row(`${t('npl')} · ${t('subPe')}`, 'nplPE', { cls: 'sub', pct: true, dec: 2, inv: true, page: 14 }); row(`${t('npl')} · ${t('subCc')}`, 'nplCC', { cls: 'sub', pct: true, dec: 2, inv: true, page: 17 });
    row(`${t('nim')} · ${t('subMx')}`, 'nimMX', { cls: 'sub', pct: true, page: 10 }); row(`${t('nim')} · ${t('subPe')}`, 'nimPE', { cls: 'sub', pct: true, page: 14 }); row(`${t('nim')} · ${t('subCc')}`, 'nimCC', { cls: 'sub', pct: true, page: 17 });
    row(`${es ? 'Costo de fondeo' : 'Cost of funds'} · ${t('subMx')}`, 'cofMX', { cls: 'sub', pct: true, inv: true, page: 10 }); row(`${es ? 'Costo de fondeo' : 'Cost of funds'} · ${t('subPe')}`, 'cofPE', { cls: 'sub', pct: true, inv: true, page: 14 });
    row(`${t('icap')} · ${t('subMx')}`, 'icap', { cls: 'sub', pct: true, page: 10 }); row(`${es ? 'Solvencia' : 'Solvency'} · ${t('subPe')}`, 'solvPE', { cls: 'sub', pct: true, page: 14 });
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('opsTable', `<table class="stmt-table"><thead><tr><th>${t('metric')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th><th class="cmt">${t('comments')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('opsTitle').textContent = `${t('ops')} · ${la} vs ${lb}`;
    el('opsCap').textContent = es
      ? `Cartera, clientes y red al cierre del periodo; ingresos, margen y utilidad por subsidiaria sumados en el periodo (las subsidiarias no suman el consolidado por la tenedora, Yastás, Aterna y eliminaciones). Perú en pesos al tipo de cambio de cada cierre. ${C && C.auto ? '' : t('cmtNote')}`
      : `Loans, clients and network at period-end; subsidiary income, margin and net income summed over the period (subsidiaries do not add to the consolidated figure because of the holding company, Yastás, Aterna and eliminations). Perú in pesos at each quarter-end rate. ${C && C.auto ? '' : t('cmtNote')}`;
    const srcs = [A, B].filter((o) => o && o.sources && o.sources.is).map((o) => o.sources.is);
    html('opsSrc', srcs.length ? `${t('src')}: ` + [...new Map(srcs.map((s) => [s.url + (s.title || ''), s])).values()].map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.seed ? t('seed') : t('release')}${s.title ? ` — ${s.title}` : ''}</a>`).join(' · ') : '');
  }
  function renderRevMix() {
    const qs = Q.slice(-lastN());
    const c = SERIES();
    const g = (q, k) => (q.is[k] != null ? q.is[k] : null);
    const ds = [
      { label: es_('Margen financiero', 'Financial margin'), data: qs.map((q) => g(q, 'finMargin')), backgroundColor: c[0], stack: 'p' },
      { label: es_('Comisiones netas', 'Net fees'), data: qs.map((q) => g(q, 'netFees')), backgroundColor: c[2], stack: 'p' },
      { label: es_('Intermediación y otros', 'Trading and other'), data: qs.map((q) => g(q, 'otherTot')), backgroundColor: c[3], stack: 'p' },
      { type: 'line', label: es_('Provisiones', 'Provisions'), data: qs.map((q) => g(q, 'prov')), borderColor: c[1], backgroundColor: c[1], pointRadius: 3, fill: false },
    ];
    mkChart('chartRevMix', { type: 'bar', data: { labels: qs.map(qLabel), datasets: ds }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    const src = qs.length && qs[qs.length - 1].sources && qs[qs.length - 1].sources.is;
    html('revMixSrc', src && src.url ? `${t('src')}: <a href="${src.url}" target="_blank" rel="noopener">${t('release')} ↗</a>` : '');
  }
  const es_ = (a, b) => (LANG === 'es' ? a : b);
  function renderMarginsChart() {
    const qs = Q.slice(-lastN());
    const c = SERIES();
    const kp = (q, k) => (q.kpi[k] != null ? Math.round(q.kpi[k] * 10) / 10 : null);
    mkChart('chartMargins', { type: 'line', data: { labels: qs.map(qLabel), datasets: [
      { label: es_('Tasa activa calculada', 'Computed yield'), data: qs.map((q) => kp(q, 'yieldCalc')), borderColor: c[3], backgroundColor: c[3], pointRadius: 2 },
      { label: es_('MIN (Gentera)', 'NIM (Gentera)'), data: qs.map((q) => kp(q, 'nim')), borderColor: c[0], backgroundColor: c[0], pointRadius: 2 },
      { label: es_('MIN después de provisiones', 'NIM after provisions'), data: qs.map((q) => kp(q, 'nimAdj')), borderColor: c[2], backgroundColor: c[2], pointRadius: 2 },
      { label: t('cor'), data: qs.map((q) => kp(q, 'cor')), borderColor: c[1], backgroundColor: c[1], pointRadius: 2 },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, beginAtZero: true } } } });
  }
  function renderKpiTable() {
    const qs = Q.slice(-lastN());
    const yoy = (q, f, pp) => { const p = qById[yoyQid(q)]; const a = f(q), b = p && f(p); if (a == null || b == null) return null; return pp ? a - b : (b ? 100 * (a / b - 1) : null); };
    const rowsDef = [
      { l: t('loans') + ' (Ps. M)', f: (q) => q.bs.loans, fmt: (v) => fmtN(v) },
      { l: t('clients') + ' (M)', f: (q) => (q.ops.clientsCred != null ? q.ops.clientsCred / 1e6 : null), fmt: (v) => fmtN(v, 2) },
      { l: es_('Margen financiero (Ps. M)', 'Financial margin (Ps. M)'), f: (q) => q.is.finMargin, fmt: (v) => fmtN(v) },
      { l: t('nim'), f: (q) => q.kpi.nim, fmt: (v) => fmtPct(v), pp: true },
      { l: t('cor'), f: (q) => q.kpi.cor, fmt: (v) => fmtPct(v), pp: true, inv: true },
      { l: t('npl'), f: (q) => q.kpi.npl, fmt: (v) => fmtPct(v, 2), pp: true, inv: true },
      { l: t('coverage'), f: (q) => q.kpi.coverage, fmt: (v) => fmtPct(v, 0), pp: true },
      { l: t('effic'), f: (q) => q.kpi.effCalc, fmt: (v) => fmtPct(v), pp: true, inv: true },
      { l: t('netIncome') + ' (Ps. M)', f: (q) => q.is.netInc, fmt: (v) => fmtN(v) },
      { l: t('roe'), f: (q) => q.kpi.roe, fmt: (v) => fmtPct(v), pp: true },
      { l: `${t('eps')} (Ps.)`, f: (q) => q.kpi.eps, fmt: (v) => fmtN(v, 2) },
      { l: `${t('icap')} · ${es_('Banco', 'Bank')}`, f: (q) => q.ops.icap, fmt: (v) => fmtPct(v), pp: true },
    ];
    const head = `<tr><th>${t('metric')}</th>${qs.map((q) => `<th>${qLabel(q)}</th>`).join('')}</tr>`;
    const body = rowsDef.map((r) => `<tr><td>${r.l}</td>${qs.map((q) => { const v = r.f(q); const y = yoy(q, r.f, r.pp); const c = r.inv ? clsInv(y) : cls(y); return `<td>${r.fmt(v)}${y != null ? `<br><span class="small ${c}">${r.pp ? fmtPp(y) : fmtPct(y, 1, true)}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
    html('kpiTable', `<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  }

  // ================= 02 GUIDANCE =================
  const gs = { metric: 'eps' };
  const G_METRICS = GD.metrics || ['eps', 'loanGrowth', 'opexGrowth', 'npl'];
  const gLabel = (m) => t(m === 'roe' ? 'roeCtrl' : m);
  const gIsCost = (m) => m === 'npl' || m === 'opexGrowth' || m === 'cor';
  const gFmt = (m, v, sign) => (m === 'eps' ? 'Ps. ' + fmtN(v, 2) : fmtPct(v, m === 'npl' ? 2 : 1, sign));
  const gRangeTxt = (it) => (it && it.lo != null && it.hi != null ? (it.lo === it.hi ? gFmt(gsMetricOf(it), it.lo) : `${gFmt(gsMetricOf(it), it.lo)}–${gFmt(gsMetricOf(it), it.hi)}`) : it && it.lo != null ? `≥ ${gFmt(gsMetricOf(it), it.lo)}` : it && it.hi != null ? `≤ ${gFmt(gsMetricOf(it), it.hi)}` : '—');
  const gsMetricOf = (it) => it._m || 'x';
  const vintagesSorted = () => (GD.vintages || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map((v) => ({ ...v, items: Object.fromEntries(Object.entries(v.items || {}).map(([m, it]) => [m, { ...it, _m: m }])) }));
  function gActual(fy) {
    const y = Y.find((yy) => yy.fy === fy), yp = Y.find((yy) => yy.fy === fy - 1);
    const roeOf = (o) => (o && o.kpi ? (o.kpi.roeCtrl != null ? o.kpi.roeCtrl : o.kpi.roe) : null);
    if (y && y.is) return { closed: true, label: 'FY' + fy, eps: y.kpi.eps, loanGrowth: yp && yp.bs && yp.bs.loans ? 100 * (y.bs.loans / yp.bs.loans - 1) : null, opexGrowth: yp && yp.is ? 100 * (y.is.opex / yp.is.opex - 1) : null, npl: y.kpi.npl, cor: y.kpi.cor, roe: roeOf(y) };
    const qs = Q.filter((q) => q.fy === fy); if (!qs.length) return null;
    const last = qs[qs.length - 1], cur = ytdFor(last), prev = ytdById[`${last.q * 3}M${String(fy - 1).slice(2)}`] || (last.q === 1 ? qById[`${fy - 1}Q1`] : null), pq = qById[yoyQid(last)];
    if (!cur) return null;
    return { closed: false, label: cur.label, eps: cur.kpi.eps, loanGrowth: pq && pq.bs.loans ? 100 * (last.bs.loans / pq.bs.loans - 1) : null, opexGrowth: prev && prev.is ? 100 * (cur.is.opex / prev.is.opex - 1) : null, npl: last.kpi.npl, cor: cur.kpi.cor, roe: roeOf(cur) };
  }
  function gStatus(m, it, v) {
    if (!it || v == null || (it.lo == null && it.hi == null)) return null;
    const lo = it.lo != null ? it.lo : -Infinity, hi = it.hi != null ? it.hi : Infinity;
    if (m === 'eps' && !it._closed) return v >= lo ? 'within' : null; // YTD EPS: only a completed year can be judged
    if (gIsCost(m)) return v < lo ? 'better' : v <= hi ? 'within' : 'worse';
    return v > hi ? 'above' : v >= lo ? 'within' : 'below';
  }
  const chip = (s) => (s ? `<span class="guide-chip ${s === 'better' || s === 'above' ? 'above' : s === 'worse' || s === 'below' ? 'below' : 'within'}">${t(s)}</span>` : '');
  function renderGuidance() {
    const es = LANG === 'es';
    const vs = vintagesSorted(); if (!vs.length) return;
    const cur = vs[vs.length - 1];
    const act = gActual(cur.fy);
    el('guideCurTitle').textContent = `${es ? 'Guía vigente para' : 'Guidance in force for'} ${cur.fy} · ${L(cur.source && cur.source.title)}`;
    el('guideCurCap').textContent = es ? `Publicada el ${cur.source && cur.source.dateApprox ? '≈' : ''}${fmtDate(cur.date)} (${t(cur.kind)}) · seguimiento con el ${act ? act.label : '—'} reportado` : `Published ${cur.source && cur.source.dateApprox ? '≈' : ''}${fmtDate(cur.date)} (${t(cur.kind)}) · tracked against the reported ${act ? act.label : '—'}`;
    const rows = G_METRICS.filter((m) => cur.items[m]).map((m) => { const it = { ...cur.items[m], _closed: act && act.closed }; const v = act ? act[m] : null; const s = gStatus(m, it, v); const ytdEps = m === 'eps' && act && !act.closed && it.lo != null ? ` <span class="sub">${fmtPct(100 * v / ((it.lo + (it.hi || it.lo)) / 2), 0)} ${es ? 'del punto medio' : 'of midpoint'}</span>` : ''; return `<tr><td>${gLabel(m)}</td><td class="rng">${gRangeTxt(it)}</td><td class="txt">${L(it.text)}</td><td>${v == null ? '—' : gFmt(m, v, m !== 'eps' && m !== 'npl')}${ytdEps}</td><td>${chip(s)}</td></tr>`; });
    html('guideCurrent', `<table class="guide-table"><thead><tr><th>${t('metric')}</th><th>${t('range')}</th><th style="text-align:left">${t('words')}</th><th>${t('actual')} ${act ? act.label : ''}</th><th>${t('guideStatus')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    html('guideText', (cur.notes && cur.notes[LANG] || []).map((x) => `<p class="guide-quote">${x}</p>`).join('') || `<p class="guide-quote muted">—</p>`);
    html('guideCurSrc', `${t('src')}: <a href="${cur.source.url}" target="_blank" rel="noopener">${L(cur.source.title)} ↗</a> · ${GD.basis || ''}`);
    const hist = vs.slice(-8).reverse();
    const hrows = hist.map((v) => { const prev = vs.filter((x) => x.fy === v.fy && x.date < v.date).pop(); const cells = G_METRICS.map((m) => { const it = v.items[m], pit = prev && prev.items[m]; const txt = gRangeTxt(it); const ptxt = gRangeTxt(pit); const changed = prev && txt !== ptxt; return `<td class="rng${changed ? ' chg' : ''}">${txt}${changed ? `<span class="was">${ptxt}</span>` : ''}</td>`; }).join(''); return `<tr><td>${v.source && v.source.dateApprox ? '≈' : ''}${fmtDate(v.date)}<span class="sub">${v.quarter ? qLabel({ fy: +v.quarter.slice(0, 4), q: +v.quarter.slice(5) }) : ''} · ${t(v.kind)}</span></td><td>${v.fy}</td>${cells}</tr>`; });
    html('guideHistory', `<table class="guide-table"><thead><tr><th>${t('date')}</th><th>${t('guideFy')}</th>${G_METRICS.map((m) => `<th>${gLabel(m)}</th>`).join('')}</tr></thead><tbody>${hrows.join('')}</tbody></table>`);
    html('guideHistSrc', `${t('src')}: ${es ? 'informes trimestrales y transcripciones de las conferencias de resultados de Gentera (data/guidance.js); ≈ = fecha aproximada' : 'Gentera quarterly releases and earnings-call transcripts (data/guidance.js); ≈ = approximate date'}`);
    const closed = [...new Set(vs.map((v) => v.fy))].filter((fy) => { const a = gActual(fy); return a && a.closed; });
    const rrows = closed.map((fy) => { const fin = vs.filter((v) => v.fy === fy).pop(); const a = gActual(fy); const cells = G_METRICS.map((m) => { const it = fin.items[m] && { ...fin.items[m], _closed: true }; if (!it || (it.lo == null && it.hi == null)) return '<td>—</td>'; const v = a[m]; return `<td class="rng">${gRangeTxt(it)}<span class="sub">${t('actual')}: ${v == null ? '—' : gFmt(m, v)}</span> ${chip(gStatus(m, it, v))}</td>`; }).join(''); const n = G_METRICS.filter((m) => fin.items[m] && (fin.items[m].lo != null || fin.items[m].hi != null) && a[m] != null).length, hits = G_METRICS.filter((m) => ['within', 'better', 'above'].includes(gStatus(m, fin.items[m] && { ...fin.items[m], _closed: true }, a[m]))).length; return `<tr><td>FY${fy}<span class="sub">${fmtDate(fin.date)}</span></td>${cells}<td>${hits}/${n}</td></tr>`; });
    html('guideRecord', rrows.length ? `<table class="guide-table"><thead><tr><th>${t('guideFy')}</th>${G_METRICS.map((m) => `<th>${gLabel(m)}</th>`).join('')}<th>${t('hits')}</th></tr></thead><tbody>${rrows.join('')}</tbody></table><p class="cap">${es ? 'Última guía vigente de cada año cerrado contra el dato reportado (la guía 2023 es la revisada en octubre de 2023; la inicial no está transcrita).' : 'Last guidance in force for each closed year against the reported figure (the 2023 guidance is the October 2023 revision; the initial one is not transcribed).'}</p>` : `<p class="muted small">${es ? 'Aún no hay años cerrados con guía registrada.' : 'No closed years with recorded guidance yet.'}</p>`);
    html('guideAll', `<table class="guide-table"><thead><tr><th>${t('date')}</th><th>${t('guideFy')}</th><th>${t('type')}</th>${G_METRICS.map((m) => `<th>${gLabel(m)}</th>`).join('')}<th>${t('src')}</th></tr></thead><tbody>${vs.slice().reverse().map((v) => `<tr><td>${fmtDate(v.date)}</td><td>${v.fy}</td><td>${t(v.kind)}</td>${G_METRICS.map((m) => `<td class="txt">${gRangeTxt(v.items[m])}${v.items[m] && v.items[m].text ? `<span class="sub">${L(v.items[m].text)}</span>` : ''}</td>`).join('')}<td><a href="${v.source.url}" target="_blank" rel="noopener">${L(v.source.title)}</a></td></tr>`).join('')}</tbody></table>`);
    // consensus placeholder
    const cs = PEERS.consensus || {};
    const cell = (v, f) => (v == null ? `<span class="muted">${t('pending')}</span>` : f(v));
    const crow = [[`${t('eps')} FY1`, cell(cs.epsFY1, (v) => 'Ps. ' + fmtN(v, 2))], [`${t('eps')} FY2`, cell(cs.epsFY2, (v) => 'Ps. ' + fmtN(v, 2))], [`${t('bvps')} FY1`, cell(cs.bvpsFY1, (v) => 'Ps. ' + fmtN(v, 2))], [`${t('dps')} FY1`, cell(cs.dpsFY1, (v) => 'Ps. ' + fmtN(v, 2))], [`${t('netIncome')} FY1 (Ps. M)`, cell(cs.netIncomeFY1MxnM, (v) => fmtN(v))], [`${t('loanGrowth')} FY1`, cell(cs.loanGrowthFY1Pct, (v) => fmtPct(v))], [es ? 'Precio objetivo' : 'Target price', cell(cs.targetPrice, (v) => 'Ps. ' + fmtN(v, 2) + (lastPx ? ` (${fmtPct(100 * (v / lastPx[1] - 1), 1, true)})` : ''))], [es ? 'Recomendación' : 'Rating', cell(cs.rating, (v) => v + (cs.nAnalysts ? ` (${cs.nAnalysts})` : ''))]];
    html('consTable', `<table><tbody>${crow.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`);
    el('consCap').textContent = `${PEERS.source || ''}${cs.asOf ? ' · ' + fmtDate(cs.asOf) : ''} · ${es ? 'contrato de datos en data/peers.js; se muestra junto a la guía en cuanto el conector esté autorizado' : 'data contract in data/peers.js; shown next to guidance once the connector is authorised'}`;
    renderGuideChart();
  }
  function renderGuideChart() {
    const vs = vintagesSorted(); const m = gs.metric;
    const fys = [...new Set(vs.map((v) => v.fy))];
    const c = SERIES();
    const has = (v) => v.items[m] && (v.items[m].lo != null || v.items[m].hi != null);
    const first = (fy) => vs.find((v) => v.fy === fy && has(v)), last = (fy) => vs.filter((v) => v.fy === fy && has(v)).pop();
    const rng = (v) => { if (!v) return null; const it = v.items[m]; const lo = it.lo != null ? it.lo : it.hi * 0.85, hi = it.hi != null ? it.hi : it.lo * 1.15; return [lo, hi]; };
    const acts = fys.map((fy) => { const a = gActual(fy); return a ? a[m] : null; });
    mkChart('chartGuide', { type: 'bar', data: { labels: fys.map((fy) => 'FY' + fy), datasets: [
      { label: t('initial'), data: fys.map((fy) => rng(first(fy))), backgroundColor: c[0] + '66', borderColor: c[0], borderWidth: 1, borderSkipped: false, borderRadius: 4 },
      { label: LANG === 'es' ? 'Última revisión' : 'Latest revision', data: fys.map((fy) => rng(last(fy))), backgroundColor: c[2] + '99', borderColor: c[2], borderWidth: 1, borderSkipped: false, borderRadius: 4 },
      { type: 'line', label: t('actual'), data: acts, borderColor: c[1], backgroundColor: c[1], pointRadius: 6, pointHoverRadius: 7, showLine: false },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => { const v = x.raw; return Array.isArray(v) ? `${x.dataset.label}: ${gFmt(m, v[0])}–${gFmt(m, v[1])}` : `${x.dataset.label}: ${gFmt(m, v)}`; } } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => (m === 'eps' ? fmtN(v, 1) : v + '%') } } }, datasets: { bar: { maxBarThickness: 40 } } } });
    html('guideChartSrc', `${gLabel(m)} · ${LANG === 'es' ? 'año en curso = acumulado reportado (UPA del semestre, no anualizada)' : 'current year = reported year-to-date (half-year EPS, not annualised)'}`);
  }

  // ================= 03 DRIVERS =================
  const dv = { metric: 'loans', freq: 'q', sel: new Set(['loans']) };
  const L_KEYS = [['loans', 'cons'], ['loansMX', 'subMx'], ['loansPE', 'subPe'], ['loansCC', 'subCc'], ['loansOther', 'other']];
  const C_KEYS = [['clientsCred', 'clients'], ['clientsMX', 'subMx'], ['clientsPE', 'subPe'], ['usersCC', 'subCc'], ['clientsTot', 'people']];
  const N_KEYS = [['npl', 'cons'], ['nplMX', 'subMx'], ['nplPE', 'subPe'], ['nplCC', 'subCc']];
  const dKeys = () => (dv.metric === 'loans' ? L_KEYS : dv.metric === 'clients' ? C_KEYS : N_KEYS);
  function driverSeries() {
    const es = (OPS.quarters || []).slice().sort((a, b) => a.fy - b.fy || a.q - b.q);
    const pts = es.map((e) => ({ id: e.id, fy: e.fy, q: e.q, label: qLabel(e), vals: e, src: e.source }));
    if (dv.freq === 'q') return pts;
    return pts.filter((p) => p.q === 4 || p.id === pts[pts.length - 1].id).map((p) => ({ ...p, id: p.q === 4 ? 'FY' + p.fy : p.label, label: p.q === 4 ? 'FY' + p.fy : p.label }));
  }
  function renderDrivers() {
    const es = LANG === 'es';
    const keys = dKeys();
    el('drvChipsLbl').textContent = t('subsidiary');
    html('drvChips', keys.map(([k, lk]) => `<button type="button" class="chip ${dv.sel.has(k) ? 'active' : ''}" data-k="${k}" aria-pressed="${dv.sel.has(k)}">${t(lk)}</button>`).join(''));
    el('drvChips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k; if (dv.sel.has(k)) { if (dv.sel.size > 1) dv.sel.delete(k); } else dv.sel.add(k); renderDrivers(); }));
    const ser = driverSeries().slice(dv.freq === 'q' ? -16 : -8);
    const c = SERIES();
    const selKeys = keys.filter(([k]) => dv.sel.has(k));
    const isPct = dv.metric === 'npl', isCl = dv.metric === 'clients';
    const div = isCl ? 1e6 : 1;
    const ds = selKeys.map(([k, lk], i) => ({ label: t(lk), data: ser.map((p) => (p.vals[k] != null ? p.vals[k] / div : null)), borderColor: c[i % 8], backgroundColor: c[i % 8], pointRadius: isPct || isCl ? 3 : 0, fill: false, stack: !isPct && !isCl && k !== 'loans' ? 's' : undefined }));
    mkChart('chartDrivers', { type: isPct || isCl ? 'line' : 'bar', data: { labels: ser.map((p) => p.label), datasets: ds }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${isPct ? fmtPct(x.parsed.y, 2) : fmtN(x.parsed.y, isCl ? 2 : 0)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: isPct ? { callback: (v) => v + '%' } : axisM(isCl ? 1 : 0), beginAtZero: !isPct } }, datasets: { bar: { maxBarThickness: 26, borderWidth: 0 } } } });
    el('drvChartTitle').textContent = `${isPct ? t('npl') : isCl ? es_('Clientes (millones)', 'Clients (millions)') : t('loans') + ' (Ps. M)'} · ${dv.freq === 'q' ? es_('al cierre de cada trimestre', 'at each quarter-end') : es_('al cierre de cada año', 'at each year-end')}`;
    el('drvChartCap').textContent = isPct ? es_('Índice de etapa 3 sobre la cartera de cada subsidiaria, como se reporta.', 'Stage-3 ratio on each subsidiary\'s loans, as reported.') : isCl ? es_('Clientes de crédito por subsidiaria; "personas atendidas" incluye ahorro, seguros y usuarios finales de ConCrédito.', 'Credit clients by subsidiary; "people served" includes savings, insurance and ConCrédito end users.') : es_('Cartera bruta en pesos; Perú convertido al tipo de cambio de cada cierre; "Otros" = Yastás.', 'Gross loans in pesos; Perú translated at each quarter-end rate; "Other" = Yastás.');
    const src = ser.length && ser[ser.length - 1].src;
    html('drvSrc', src && src.url ? `${t('src')}: <a href="${src.url}" target="_blank" rel="noopener">${src.seed ? t('seed') : t('release')} ↗</a>` : '');
    html('drvSeriesTable', `<table><thead><tr><th>${t('period')}</th>${selKeys.map(([k, lk]) => `<th>${t(lk)}</th>`).join('')}</tr></thead><tbody>${ser.slice().reverse().map((p) => `<tr><td>${p.label}</td>${selKeys.map(([k]) => `<td>${p.vals[k] != null ? (isPct ? fmtPct(p.vals[k], 2) : fmtN(p.vals[k] / div, isCl ? 2 : 0)) : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    const all = driverSeries(); const last = all[all.length - 1]; const prev = all.find((p) => (dv.freq === 'q' ? p.fy === last.fy - 1 && p.q === last.q : p.fy === last.fy - 1 && p.q === last.q));
    const tot = last.vals[keys[0][0]];
    const rows = keys.map(([k, lk]) => { const v = last.vals[k], pv = prev && prev.vals[k]; if (v == null) return ''; const y = isPct ? (pv != null ? v - pv : null) : pv ? 100 * (v / pv - 1) : null; return `<tr class="${k === keys[0][0] ? 'total' : ''}"><td>${t(lk)}</td><td>${isPct ? fmtPct(v, 2) : fmtN(v / div, isCl ? 2 : 0)}</td><td>${pv != null ? (isPct ? fmtPct(pv, 2) : fmtN(pv / div, isCl ? 2 : 0)) : '—'}</td><td class="${isPct ? clsInv(y) : cls(y)}">${isPct ? fmtPp(y) : fmtPct(y, 1, true)}</td><td>${tot && k !== keys[0][0] && !isPct ? fmtPct(100 * v / tot, 1) : ''}</td></tr>`; }).join('');
    html('drvTable', `<table><thead><tr><th>${t('subsidiary')}</th><th>${last.label}</th><th>${prev ? prev.label : '—'}</th><th>${es ? 'a/a' : 'y/y'}</th><th>% ${t('total')}</th></tr></thead><tbody>${rows}</tbody></table>`);
    el('drvTblTitle').textContent = `${isPct ? t('npl') : isCl ? t('clients') : t('loans') + ' (Ps. M)'} · ${last.label}`;
    el('drvTblCap').textContent = es ? 'Último periodo reportado frente al mismo periodo del año anterior' : 'Latest reported period versus the same period a year earlier';
    html('driversMeta', es ? `Cobertura: ${all.length} periodos (${all[0].label} → ${last.label}) según los informes trimestrales.` : `Coverage: ${all.length} periods (${all[0].label} → ${last.label}) from the quarterly releases.`);
    renderMonthly();
  }
  function renderMonthly() {
    const es = LANG === 'es';
    const mo = OPS.monthly || {};
    const cn = (mo.cnbv && mo.cnbv.series) || [], sb = (mo.sbs && mo.sbs.series) || [];
    if (!cn.length && !sb.length) {
      html('monthlyTable', `<p class="muted small">${es ? 'Pendiente: las tablas mensuales de la CNBV (Boletín Estadístico Banca Múltiple, Banco Compartamos) y de la SBS (Compartamos Banco Perú) se descargan con la primera corrida del flujo de actualización.' : 'Pending: the CNBV monthly tables (Boletín Estadístico Banca Múltiple, Banco Compartamos) and the SBS tables (Compartamos Banco Perú) are downloaded by the first run of the refresh workflow.'}</p>`);
      el('monthlyCap').textContent = es ? 'Cartera, IMOR, captación y resultado mensuales del banco mexicano; balance, morosidad y castigos del peruano.' : 'Monthly loans, IMOR, deposits and result of the Mexican bank; balance sheet, delinquency and write-offs of the Peruvian one.';
      html('monthlySrc', ''); return;
    }
    const fmtMonth = (m) => `${m.slice(0, 4)}-${m.slice(4)}`;
    const c1 = cn.slice(-12).reverse().map((r) => `<tr><td>${fmtMonth(r.month)}</td><td>${fmtN(r.loans)}</td><td>${fmtPct(r.imor, 2)}</td><td>${fmtPct(r.coverage, 0)}</td><td>${fmtN(r.captacion)}</td><td>${fmtN(r.totalAssets)}</td><td>${fmtPct(r.roa)}</td><td>${fmtPct(r.roe)}</td></tr>`).join('');
    const c2 = sb.slice(-12).reverse().map((r) => `<tr><td>${fmtMonth(r.month)}</td><td>${fmtN(r.loans)}</td><td>${fmtPct(r.morosidad, 2)}</td><td>${fmtN(r.loansNet)}</td><td>${fmtN(r.netIncome)}</td><td>${fmtN(r.equity)}</td></tr>`).join('');
    html('monthlyTable', `<div class="stack">${cn.length ? `<div class="tblwrap"><table><caption class="small muted" style="text-align:left">${es ? 'CNBV · Banco Compartamos (Ps. M; cifras del mes)' : 'CNBV · Banco Compartamos (Ps. M; month-end figures)'}</caption><thead><tr><th>${es ? 'Mes' : 'Month'}</th><th>${t('loans')}</th><th>IMOR</th><th>${es ? 'Cobertura' : 'Coverage'}</th><th>${es ? 'Captación total' : 'Total funding'}</th><th>${es ? 'Activo total' : 'Total assets'}</th><th>ROA</th><th>ROE</th></tr></thead><tbody>${c1}</tbody></table></div>` : ''}${sb.length ? `<div class="tblwrap"><table><caption class="small muted" style="text-align:left">${es ? 'SBS · Compartamos Banco Perú (S/ M; resultado acumulado en el año)' : 'SBS · Compartamos Banco Perú (S/ M; year-to-date result)'}</caption><thead><tr><th>${es ? 'Mes' : 'Month'}</th><th>${t('loans')}</th><th>${es ? 'Morosidad' : 'Delinquency'}</th><th>${es ? 'Cartera neta' : 'Net loans'}</th><th>${es ? 'Utilidad acum.' : 'YTD income'}</th><th>${es ? 'Patrimonio' : 'Equity'}</th></tr></thead><tbody>${c2}</tbody></table></div>` : ''}</div>`);
    el('monthlyCap').textContent = es ? 'Últimos 12 meses publicados por cada regulador, en millones de la moneda local. CNBV: cartera total, IMOR y cobertura del Boletín Estadístico (captación total = depósitos + préstamos interbancarios + títulos). SBS: cartera directa (vigente + refinanciada + atrasada), morosidad, cartera neta, utilidad acumulada y patrimonio de los cuadros B-2201 y B-2362; Compartamos Banco figura en Banca Múltiple desde 2025. La morosidad de la SBS (cartera atrasada ÷ créditos directos) no es comparable con la etapa 3 que reporta Gentera.' : 'Last 12 months published by each regulator, in millions of local currency. CNBV: total loans, IMOR and coverage from the statistical bulletin (total funding = deposits + interbank loans + securities). SBS: direct loans (performing + refinanced + overdue), delinquency, net loans, year-to-date income and equity from tables B-2201 and B-2362; Compartamos Banco appears under Banca Múltiple from 2025. The SBS delinquency ratio (overdue ÷ direct loans) is not comparable with the stage-3 ratio Gentera reports.';
    const s1 = cn.length && cn[cn.length - 1].source, s2 = sb.length && sb[sb.length - 1].sources && Object.values(sb[sb.length - 1].sources)[0];
    html('monthlySrc', `${t('src')}: ${s1 ? `<a href="${s1}" target="_blank" rel="noopener">CNBV ↗</a>` : ''} ${s2 ? `· <a href="${s2}" target="_blank" rel="noopener">SBS ↗</a>` : ''}`);
  }

  // ================= 04 SHARE PRICE =================
  const sh = { range: '3y' };
  function rangeStart(pts) { const last = lastPoint(pts); if (!last) return null; const n = { '1y': 365, '3y': 365 * 3, '5y': 365 * 5 }[sh.range]; return n ? addDays(last[0], -n) : pts[0][0]; }
  function decimate(pts, max = 900) { if (pts.length <= max) return pts; const step = Math.ceil(pts.length / max); return pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
  function renderShare() {
    const es = LANG === 'es';
    const pts = qPx;
    html('shareMeta', es ? `Acciones en circulación: ${fmtN(sharesOut)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}). Sin ADR.` : `Shares outstanding: ${fmtN(sharesOut)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}). No ADR.`);
    if (!pts.length) { html('shareStats', `<div class="stat"><div class="v">—</div><div class="l">${t('pendingMk')}</div></div>`); html('priceSrc', `${t('src')}: ${t('pendingMk')}`); html('rebasedSrc', ''); html('rebasedTable', ''); el('priceChartTitle').textContent = 'GENTERA · MXN'; el('priceChartCap').textContent = t('pendingMk'); return; }
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
    const ids = [TICK, '^MXX', 'GFNORTEO.MX', 'RA.MX', 'BBAJIOO.MX', 'BAP'];
    const base = rangeStart(qPx);
    const series = ids.map((id) => ({ id, pts: px(id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
    const dates = series[0].pts.map((p) => p[0]);
    const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lastV = null; return { label: MK.prices[s.id].name, data: dates.map((d) => { const v = map.get(d); if (v != null) lastV = v; return lastV != null ? 100 * lastV / b : null; }), borderColor: c[i], backgroundColor: c[i], borderWidth: i === 0 ? 2.5 : 1.5 }; });
    const idx = decimate(dates.map((_, i) => i), 700);
    mkChart('chartRebased', { type: 'line', data: { labels: idx.map((i) => dates[i]), datasets: ds.map((d) => ({ ...d, data: idx.map((i) => d.data[i]) })) },
      options: { plugins: { legend: legendTop, tooltip: { callbacks: { title: (x) => fmtDate(x[0].label), label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y, 1)}` } } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i) => (idx[i] != null ? dates[idx[i]].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    html('rebasedTable', `<table><thead><tr><th>${t('period')}: ${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}</th><th>${t('ret')}</th></tr></thead><tbody>${ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return `<tr><td>${d.label}</td><td class="${cls(last - 100)}">${fmtPct(last - 100, 1, true)}</td></tr>`; }).join('')}</tbody></table>`);
    html('rebasedSrc', `${t('src')}: Yahoo Finance (${es ? 'cierres diarios, moneda local, sin dividendos reinvertidos' : 'daily closes, local currency, dividends not reinvested'})`);
  }

  // ================= 05 VALUATION (excess return on book equity) =================
  const VD = Object.assign({}, REF.valuation || {});
  const V = { slots: [] };
  function betaFromMarket() {
    const a = qPx, b = px('^MXX'); if (a.length < 300 || b.length < 300) return null;
    const weekly = (pts) => { const m = new Map(); for (const p of pts) { const d = new Date(p[0] + 'T12:00:00Z'); const wk = `${d.getUTCFullYear()}-${Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 6048e5)}`; m.set(wk, p[1]); } return m; };
    const ma = weekly(a), mb = weekly(b); const keys = [...ma.keys()].filter((k) => mb.has(k)).slice(-105);
    const ra = [], rb = []; for (let i = 1; i < keys.length; i++) { ra.push(ma.get(keys[i]) / ma.get(keys[i - 1]) - 1); rb.push(mb.get(keys[i]) / mb.get(keys[i - 1]) - 1); }
    const n = ra.length; if (n < 50) return null;
    const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length; const am = mean(ra), bm = mean(rb);
    let cov = 0, vr = 0; for (let i = 0; i < n; i++) { cov += (ra[i] - am) * (rb[i] - bm); vr += (rb[i] - bm) ** 2; }
    return vr ? cov / vr : null;
  }
  function valDefaults() {
    const rf = mx10.length ? mx10[mx10.length - 1][1] : (VD.rfFallbackPct || 9.0);
    let beta = betaFromMarket(); const raw = beta;
    if (beta == null) beta = 0.9; beta = Math.min(VD.betaCap || 1.4, Math.max(VD.betaFloor || 0.5, beta));
    const l = lastLTM ? exAdj(lastLTM) : null, k = (l && l.kpi) || {}, i = (l && l.is) || {};
    const avgL = k.avgLoans || (lastQ && lastQ.bs.loans);
    const r1 = (x) => Math.round(x * 10) / 10;
    return {
      bv: lastQ && lastQ.bs ? lastQ.bs.eqCtrl : 30000, loans: lastQ ? lastQ.bs.loans : 90000,
      g: VD.loanGrowthPct || 8, margin: avgL && i.finMargin ? r1(100 * i.finMargin / avgL) : 45, cor: k.cor != null ? r1(k.cor) : 13, fees: avgL && i.netFees != null ? r1(100 * (i.netFees + (i.otherTot || 0)) / avgL) : 7,
      eff: k.effPre != null ? r1(k.effPre) : 48, tax: k.taxRate != null ? r1(k.taxRate) : 31, ctrl: i.netInc ? r1(100 * i.niCtrl / i.netInc) : 97,
      payout: VD.payoutPct || 40, rf: Math.round(rf * 100) / 100, beta: Math.round(beta * 100) / 100, betaRaw: raw, erp: VD.erpPct || 6, years: VD.years || 5,
      term: 'gordon', gT: VD.terminalGrowthPct || 5, exitPbv: VD.exitPbv || 2.0,
    };
  }
  function valInputsHtml(s) {
    const inp = (k, name, opt = {}) => `<div class="inp"><div class="name"><label for="vi_${k}">${name}</label>${opt.sub ? `<small>${opt.sub}</small>` : ''}</div><input id="vi_${k}" type="number" data-k="${k}" value="${s[k]}" step="${opt.step || 0.5}"${opt.min != null ? ` min="${opt.min}"` : ''}></div>`;
    const es = LANG === 'es';
    const ltmL = lastLTM ? lastLTM.label : '';
    return `<h4>${es ? 'Punto de partida' : 'Starting point'}</h4>
      ${inp('bv', es ? 'Capital contable controlador (Ps. M)' : 'Controlling book equity (Ps. M)', { sub: es ? `balance al ${lastQ ? qLabel(lastQ) : ''}` : `balance sheet at ${lastQ ? qLabel(lastQ) : ''}`, step: 100 })}
      ${inp('loans', es ? 'Cartera bruta (Ps. M)' : 'Gross loans (Ps. M)', { step: 500 })}
      <h4>${es ? 'Impulsores (años 1–' + s.years + ')' : 'Drivers (years 1–' + s.years + ')'}</h4>
      ${inp('g', es ? 'Crecimiento de cartera (% anual)' : 'Loan growth (% p.a.)', { sub: es ? 'guía 2026: 6–9%' : '2026 guidance: 6–9%' })}
      ${inp('margin', es ? 'Margen financiero ÷ cartera promedio (%)' : 'Financial margin ÷ average loans (%)', { sub: `${ltmL}: ${es ? 'observado' : 'observed'}`, step: 0.5 })}
      ${inp('cor', es ? 'Costo de riesgo (%)' : 'Cost of risk (%)', { sub: `${ltmL}: ${es ? 'observado' : 'observed'}`, step: 0.5 })}
      ${inp('fees', es ? 'Comisiones netas y otros ÷ cartera promedio (%)' : 'Net fees and other ÷ average loans (%)', { step: 0.25 })}
      ${inp('eff', es ? 'Gastos ÷ ingresos antes de provisiones (%)' : 'Opex ÷ pre-provision income (%)', { sub: es ? 'eficiencia; menor es mejor' : 'efficiency; lower is better' })}
      ${inp('tax', es ? 'Tasa de impuestos (%)' : 'Tax rate (%)')}
      ${inp('ctrl', es ? 'Participación controladora (% de la utilidad)' : 'Controlling share (% of net income)', { step: 0.5 })}
      ${inp('payout', es ? 'Pago de dividendos (%)' : 'Dividend payout (%)', { sub: es ? 'política 40%; 45% propuesto' : 'policy 40%; 45% proposed', step: 5 })}
      <h4>${es ? 'Valor terminal' : 'Terminal value'}</h4>
      <div class="inp"><div class="name"><label for="vi_term">${es ? 'Método' : 'Method'}</label></div><select id="vi_term" data-k="term"><option value="gordon"${s.term === 'gordon' ? ' selected' : ''}>Gordon</option><option value="exit"${s.term === 'exit' ? ' selected' : ''}>${es ? 'Múltiplo P/VL de salida' : 'Exit P/BV multiple'}</option></select></div>
      ${inp('gT', es ? 'Crecimiento terminal g (%)' : 'Terminal growth g (%)', { sub: es ? 'nominal, en pesos (Gordon)' : 'nominal, in pesos (Gordon)', step: 0.25 })}
      ${inp('exitPbv', es ? 'P/VL de salida (x)' : 'Exit P/BV (x)', { step: 0.1 })}
      <h4>${es ? 'Costo de capital (CAPM)' : 'Cost of equity (CAPM)'}</h4>
      ${inp('rf', es ? 'Tasa libre de riesgo (%)' : 'Risk-free rate (%)', { sub: mx10.length ? (es ? `bono M 10 años al ${fmtDate(mx10[mx10.length - 1][0])}` : `10-yr M bond at ${fmtDate(mx10[mx10.length - 1][0])}`) : (es ? 'sin serie de mercado; valor de respaldo' : 'no market series; fallback value'), step: 0.1 })}
      ${inp('beta', 'Beta', { sub: s.betaRaw != null ? (es ? `estimada ${fmtN(s.betaRaw, 2)} vs IPC, 2 años semanal; acotada ${VD.betaFloor || 0.5}–${VD.betaCap || 1.4}` : `estimated ${fmtN(s.betaRaw, 2)} vs IPC, 2 yrs weekly; clipped ${VD.betaFloor || 0.5}–${VD.betaCap || 1.4}`) : (es ? 'sin serie de precios; valor de respaldo 0.9' : 'no price series; fallback 0.9'), step: 0.05 })}
      ${inp('erp', es ? 'Prima de riesgo de mercado (%)' : 'Equity risk premium (%)', { step: 0.25 })}
      <div class="inp"><div class="name">${es ? 'Costo de capital Ke' : 'Cost of equity Ke'}</div><div><b id="valKe"></b></div></div>
      <div style="margin-top:14px"><button type="button" class="btn" id="valReset">${es ? 'Restablecer supuestos' : 'Reset assumptions'}</button></div>`;
  }
  function valCompute(s, over = {}) {
    const p = { ...s, ...over };
    const ke = (p.rf + p.beta * p.erp) / 100, g = p.g / 100, m = p.margin / 100, cor = p.cor / 100, fe = p.fees / 100, eff = p.eff / 100, tax = p.tax / 100, ctrl = p.ctrl / 100, pay = p.payout / 100, gT = p.gT / 100;
    let bv = p.bv, loans = p.loans, pv = 0; const rows = [];
    let er = 0;
    for (let tt = 1; tt <= p.years; tt++) {
      const l1 = loans * (1 + g), avgL = (loans + l1) / 2;
      const fm = m * avgL, prov = cor * avgL, fees = fe * avgL, opex = eff * (fm + fees), ibt = fm - prov + fees - opex, ni = ibt * (1 - tax), nic = ni * ctrl, div = pay * nic;
      er = nic - ke * bv; const df = Math.pow(1 + ke, tt); pv += er / df;
      rows.push({ t: tt, loans: l1, bv0: bv, fm, prov, fees, opex, ni: nic, div, er, pver: er / df, bv1: bv + nic - div, roe: 100 * nic / bv });
      bv = bv + nic - div; loans = l1;
    }
    const tv = p.term === 'exit' ? (p.exitPbv - 1) * bv : (ke > gT ? er * (1 + gT) / (ke - gT) : NaN);
    const pvtv = tv / Math.pow(1 + ke, p.years);
    const eq = p.bv + pv + pvtv;
    const perShare = sharesM ? eq / sharesM : null;
    return { ke, eq, pv, pvtv, tv, perShare, rows, bvN: bv, ni1: rows[0] && rows[0].ni, div1: rows[0] && rows[0].div, impliedPbv: eq / p.bv, roe1: rows[0] && rows[0].roe };
  }
  function impliedKe(s, price) {
    if (!price || !sharesM) return null;
    let lo = 0.02, hi = 0.60;
    const f = (ke) => valCompute(s, { rf: 100 * ke - s.beta * s.erp }).perShare - price;
    if (f(lo) < 0 || f(hi) > 0) return null;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  const VAL_KEYS = ['bv', 'loans', 'g', 'margin', 'cor', 'fees', 'eff', 'tax', 'ctrl', 'payout', 'rf', 'beta', 'erp', 'gT', 'exitPbv', 'term'];
  function renderValuation(reset) {
    if (reset || !V.s) V.s = { ...valDefaults(), ...(reset ? {} : (V.fromUrl || {})) };
    html('valInputs', valInputsHtml(V.s));
    el('valInputs').querySelectorAll('input[data-k]').forEach((i) => i.addEventListener('input', () => { const v = parseFloat(i.value); if (isFinite(v)) { V.s[i.dataset.k] = v; renderValOutputs(); } }));
    el('vi_term').addEventListener('change', (e) => { V.s.term = e.target.value; renderValOutputs(); });
    el('valReset').addEventListener('click', () => { V.fromUrl = null; renderValuation(true); });
    renderValOutputs();
    html('valMeta', LANG === 'es' ? `Supuestos por defecto: ${L(VD.notes)}` : `Default assumptions: ${L(VD.notes)}`);
    renderScenarioButtons();
  }
  function renderValOutputs() {
    const s = V.s; const r = valCompute(s);
    const es = LANG === 'es';
    el('valKe').textContent = fmtPct(100 * r.ke, 2);
    el('valHero').textContent = r.perShare ? 'Ps. ' + fmtN(r.perShare, 1) : '—';
    el('valHeroLbl').textContent = `${t('perShare')} · ${lastPx ? `${t('upside')} Ps. ${fmtN(lastPx[1], 2)}: ${fmtPct(100 * (r.perShare / lastPx[1] - 1), 1, true)}` : t('pendingMk')}`;
    const ik = lastPx ? impliedKe(s, lastPx[1]) : null;
    const outs = [
      { v: 'Ps. ' + fmtN(r.eq) + ' M', l: es ? 'Valor del capital (VL₀ + VP retorno en exceso + VP terminal)' : 'Equity value (BV₀ + PV excess returns + PV terminal)' },
      { v: fmtX(r.impliedPbv, 2), l: es ? 'P/VL implícito sobre el capital actual' : 'Implied P/BV on current equity' },
      { v: r.ni1 && sharesM && r.perShare ? fmtX(r.perShare / (r.ni1 / sharesM), 1) : '—', l: es ? 'P/U implícito sobre la utilidad del año 1' : 'Implied P/E on year-1 earnings' },
      { v: fmtPct(100 * r.ke, 2), l: `Ke = ${fmtN(s.rf, 2)}% + ${fmtN(s.beta, 2)} × ${fmtN(s.erp, 2)}%` },
      { v: ik != null ? fmtPct(100 * ik, 2) : '—', l: es ? 'Ke implícito en el precio actual (bisección)' : 'Ke implied by the current price (bisection)' },
      { v: fmtPct(r.roe1, 1), l: es ? 'ROE año 1 sobre el capital inicial' : 'Year-1 ROE on opening equity' },
    ];
    html('valOutputs', outs.map((o) => `<div class="out"><div class="v">${o.v}</div><div class="l">${o.l}</div></div>`).join(''));
    html('valNote', es
      ? `<b>Lectura.</b> Con un ROE del año 1 de ${fmtPct(r.roe1, 1)} frente a un costo de capital de ${fmtPct(100 * r.ke, 1)}, cada peso de capital vale ${fmtN(r.impliedPbv, 2)} pesos. El valor terminal (${s.term === 'exit' ? `P/VL de salida ${fmtN(s.exitPbv, 1)}x` : `Gordon, g = ${fmtN(s.gT, 2)}%`}) aporta ${fmtPct(100 * r.pvtv / r.eq, 0)} del total; el capital actual, ${fmtPct(100 * s.bv / r.eq, 0)}. Acciones: ${fmtN(sharesM, 1)} M. Herramienta de sensibilidad, no recomendación.`
      : `<b>Reading.</b> With a year-1 ROE of ${fmtPct(r.roe1, 1)} against a ${fmtPct(100 * r.ke, 1)} cost of equity, each peso of equity is worth ${fmtN(r.impliedPbv, 2)} pesos. The terminal value (${s.term === 'exit' ? `exit P/BV ${fmtN(s.exitPbv, 1)}x` : `Gordon, g = ${fmtN(s.gT, 2)}%`}) contributes ${fmtPct(100 * r.pvtv / r.eq, 0)} of the total; current equity, ${fmtPct(100 * s.bv / r.eq, 0)}. Shares: ${fmtN(sharesM, 1)} M. A sensitivity tool, not a recommendation.`);
    const yr0 = lastQ ? lastQ.fy : new Date().getFullYear();
    html('valTable', `<table><thead><tr><th>${t('year')}</th><th>${t('loans')}</th><th>${es ? 'Margen fin.' : 'Fin. margin'}</th><th>${es ? 'Provisiones' : 'Provisions'}</th><th>${es ? 'Comis. y otros' : 'Fees & other'}</th><th>${es ? 'Gastos' : 'Opex'}</th><th>${t('niCtrl')}</th><th>${t('dividends')}</th><th>${es ? 'Retorno en exceso' : 'Excess return'}</th><th>${es ? 'VP' : 'PV'}</th><th>${es ? 'Capital final' : 'Closing equity'}</th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${yr0 + x.t}</td><td>${fmtN(x.loans)}</td><td>${fmtN(x.fm)}</td><td>${fmtN(x.prov)}</td><td>${fmtN(x.fees)}</td><td>${fmtN(x.opex)}</td><td>${fmtN(x.ni)}</td><td>${fmtN(x.div)}</td><td class="${cls(x.er)}">${fmtN(x.er)}</td><td>${fmtN(x.pver)}</td><td>${fmtN(x.bv1)}</td></tr>`).join('')}<tr class="total"><td>${es ? 'Terminal' : 'Terminal'}</td><td colspan="7">${s.term === 'exit' ? (es ? `(P/VL ${fmtN(s.exitPbv, 1)}x − 1) × capital final` : `(P/BV ${fmtN(s.exitPbv, 1)}x − 1) × closing equity`) : (es ? `retorno en exceso año ${s.years} × (1 + g) ÷ (Ke − g)` : `year-${s.years} excess return × (1 + g) ÷ (Ke − g)`)}</td><td>${fmtN(r.tv)}</td><td>${fmtN(r.pvtv)}</td><td></td></tr></tbody></table>`);
    const gsArr = [s.g - 4, s.g - 2, s.g, s.g + 2, s.g + 4], kes = [-2, -1, 0, 1, 2].map((d) => 100 * r.ke + d);
    html('valSens', `<table class="sens"><thead><tr><th>${es ? 'Crec. cartera ↓ / Ke →' : 'Loan growth ↓ / Ke →'}</th>${kes.map((k) => `<th>${fmtPct(k, 1)}</th>`).join('')}</tr></thead><tbody>${gsArr.map((gg) => `<tr><td>${fmtPct(gg, 1)}</td>${kes.map((k) => { const rr = valCompute(s, { g: gg, rf: k - s.beta * s.erp }); const now = gg === s.g && Math.abs(k - 100 * r.ke) < 1e-9; return `<td class="center ${lastPx && rr.perShare > lastPx[1] ? 'hi' : ''} ${now ? 'now' : ''}">${fmtN(rr.perShare, 0)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`);
    el('sensCap').textContent = es ? `Ps. por acción; sombreado = por encima del precio actual (${lastPx ? 'Ps. ' + fmtN(lastPx[1], 2) : t('pendingMk')}); demás supuestos fijos` : `Ps. per share; shaded = above the current price (${lastPx ? 'Ps. ' + fmtN(lastPx[1], 2) : t('pendingMk')}); other assumptions held`;
    updateUrl();
  }
  // ---- Scenario links (URL hash) and browser save slots.
  function stateToHash() {
    const p = new URLSearchParams();
    p.set('st', st.stmt); p.set('m', st.mode); if (st.a) p.set('a', st.a); if (st.b) p.set('b', st.b); if (st.exAdj) p.set('adj', '1'); if (st.usd) p.set('usd', '1');
    if (V.s) for (const k of VAL_KEYS) p.set('v_' + k, V.s[k]);
    return p.toString();
  }
  function hashToState() {
    const h = location.hash.replace(/^#/, ''); if (!h.includes('=')) return;
    const p = new URLSearchParams(h);
    if (p.get('st')) st.stmt = p.get('st'); if (p.get('m')) st.mode = p.get('m'); if (p.get('a')) st.a = p.get('a'); if (p.get('b')) st.b = p.get('b'); st.exAdj = p.get('adj') === '1'; st.usd = p.get('usd') === '1';
    const v = {}; let any = false; for (const k of VAL_KEYS) if (p.has('v_' + k)) { any = true; v[k] = k === 'term' ? p.get('v_' + k) : parseFloat(p.get('v_' + k)); }
    if (any) V.fromUrl = v;
    for (const [id, val] of [['segStmt', st.stmt], ['segMode', st.mode]]) el(id).querySelectorAll('button').forEach((b) => { const on = b.dataset.v === val; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    el('chkAdj').checked = st.exAdj; el('chkUsd').checked = st.usd;
  }
  let urlTimer = null;
  function updateUrl() { clearTimeout(urlTimer); urlTimer = setTimeout(() => { try { history.replaceState(null, '', '#' + stateToHash()); } catch (e) { /* ignore */ } }, 200); }
  function renderScenarioButtons() {
    const es = LANG === 'es';
    let slots = []; try { slots = JSON.parse(localStorage.getItem('g-scenarios') || '[]'); } catch (e) { /* ignore */ }
    const btns = [`<button type="button" class="btn" id="btnCopyLink">${es ? 'Copiar enlace del escenario' : 'Copy scenario link'}</button>`];
    for (let i = 0; i < 3; i++) btns.push(`<button type="button" class="btn" data-slot="${i}">${slots[i] ? (es ? `Cargar ${i + 1}: ` : `Load ${i + 1}: `) + slots[i].name : (es ? `Guardar en ${i + 1}` : `Save to ${i + 1}`)}</button>`);
    html('valScenario', btns.join('') + `<span class="muted small" style="align-self:center">${es ? 'Los escenarios guardados viven sólo en este navegador.' : 'Saved scenarios live only in this browser.'}</span>`);
    el('btnCopyLink').addEventListener('click', () => { const url = location.origin + location.pathname + '#' + stateToHash(); try { navigator.clipboard.writeText(url); el('btnCopyLink').textContent = es ? 'Enlace copiado' : 'Link copied'; } catch (e) { prompt(es ? 'Copie el enlace:' : 'Copy the link:', url); } });
    el('valScenario').querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.slot;
      if (slots[i] && !b.dataset.over) { V.s = { ...V.s, ...slots[i].s }; renderValuation(); b.dataset.over = '1'; setTimeout(() => { delete b.dataset.over; }, 3000); return; }
      const name = prompt(es ? 'Nombre del escenario:' : 'Scenario name:', slots[i] ? slots[i].name : `${es ? 'Escenario' : 'Scenario'} ${i + 1}`); if (!name) return;
      slots[i] = { name, s: Object.fromEntries(VAL_KEYS.map((k) => [k, V.s[k]])), at: new Date().toISOString().slice(0, 10) };
      try { localStorage.setItem('g-scenarios', JSON.stringify(slots)); } catch (e) { /* ignore */ }
      renderScenarioButtons();
    }));
  }

  // ================= 06 RELATIVE =================
  function renderRelative() {
    const es = LANG === 'es';
    const e = epsLtm(lastLTM), ex = epsLtm(exAdj(lastLTM)); const bv = bvps(lastQ);
    const dv26 = divsApproved(new Date().getFullYear()) || (REF.dividends || []).slice(-1)[0];
    const dps = dpsOf(dv26);
    const rows = [
      [t('price') + ' GENTERA', lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : t('pendingMk')],
      [t('mktCap'), lastPx && sharesOut ? `Ps. ${fmtN(lastPx[1] * sharesOut / 1e9, 1)} ${bn()} · US$ ${fmtN(lastPx[1] * sharesOut / (fxAt(lastPx[0]) || NaN) / 1e9, 2)} ${bn()}` : t('pendingMk')],
      [`${t('eps')} ${t('ltmS')} (${lastLTM ? lastLTM.label : ''})`, e ? `Ps. ${fmtN(e, 2)}${ex && ex !== e ? ` · ${t('exAdj')}: Ps. ${fmtN(ex, 2)}` : ''}` : '—'],
      [`${t('pe')} ${t('ltmS')}`, lastPx && e ? `${fmtX(lastPx[1] / e)}${ex && ex !== e ? ` · ${t('exAdj')}: ${fmtX(lastPx[1] / ex)}` : ''}` : t('pendingMk')],
      [t('bvps'), bv ? `Ps. ${fmtN(bv, 1)} (${qLabel(lastQ)})` : '—'],
      [t('pbv'), lastPx && bv ? fmtX(lastPx[1] / bv, 2) : t('pendingMk')],
      [`${t('roe')} ${t('ltmS')}`, lastLTM ? fmtPct(lastLTM.kpi.roe) : '—'],
      [es ? `Rendimiento por dividendo (aprobado ${dv26 ? dv26.agmYear : ''})` : `Dividend yield (approved ${dv26 ? dv26.agmYear : ''})`, lastPx && dps ? `${fmtPct(100 * dps / lastPx[1])} (Ps. ${fmtN(dps, 2)})` : dps ? `Ps. ${fmtN(dps, 2)} ${es ? 'por acción; rendimiento' : 'per share; yield'} ${t('pendingMk')}` : '—'],
      [es ? 'Precio / cartera bruta por acción' : 'Price / gross loans per share', lastPx && lastQ.bs.loans && sharesM ? fmtX(lastPx[1] / (lastQ.bs.loans / sharesM), 2) : t('pendingMk')],
    ];
    for (const a of REF.analysts || []) rows.push([`${a.firm} (${fmtDate(a.date)})`, `${a.rating} · PO Ps. ${fmtN(a.target, 0)}${lastPx ? ` (${fmtPct(100 * (a.target / lastPx[1] - 1), 1, true)})` : ''}`]);
    html('multTable', `<table><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`);
    el('multCap').textContent = es ? `Precio de Yahoo Finance; UPA UDM y valor en libros sobre ${fmtN(sharesM, 1)} M de acciones en circulación (utilidad y capital controladores).` : `Yahoo Finance price; LTM EPS and book value on ${fmtN(sharesM, 1)} M shares outstanding (controlling income and equity).`;
    const qs = Q.slice(-lastN() - 4).filter((q) => q.bs);
    const c = SERIES();
    const pts = qs.map((q) => { const p = pointAtOrBefore(qPx, qEndDate(q)); const l = ltmFor(q); const bvq = bvps(q); const eq = epsLtm(l); return { q, pbv: p && bvq ? p[1] / bvq : null, pe: p && eq && eq > 0 ? p[1] / eq : null, peEx: p && l ? (epsLtm(exAdj(l)) > 0 ? p[1] / epsLtm(exAdj(l)) : null) : null }; });
    mkChart('chartMultiples', { type: 'line', data: { labels: pts.map((x) => qLabel(x.q)), datasets: [
      { label: t('pbv'), data: pts.map((x) => x.pbv), borderColor: c[0], backgroundColor: c[0], pointRadius: 3, yAxisID: 'y' },
      { label: `${t('pe')} ${t('ltmS')}`, data: pts.map((x) => x.pe), borderColor: c[1], backgroundColor: c[1], pointRadius: 3, yAxisID: 'y' },
      { label: `${t('pe')} ${t('ltmS')} ${t('exAdj')}`, data: pts.map((x) => x.peEx), borderColor: c[1], borderDash: [4, 4], pointRadius: 0, yAxisID: 'y' },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y, 2)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) + 'x' }, beginAtZero: true } } } });
    html('multSrc', `${t('src')}: Yahoo Finance${qPx.length ? ` (${fmtDate(lastPx[0])})` : ' (' + t('pendingMk') + ')'} · ${es ? 'informes trimestrales (capital y utilidad controladores)' : 'quarterly releases (controlling equity and income)'} · ${asOfQ()}`);
    const P = PEERS.peers || [];
    const cell = (v, f) => (v == null ? `<span class="muted">${t('pending')}</span>` : f(v));
    html('peersTable', `<table><thead><tr><th>${es ? 'Empresa' : 'Company'}</th><th>${t('price')}</th><th>${t('mktCap')} (US$ M)</th><th>${t('pe')} ${t('ltmS')}</th><th>${t('pe')} NTM</th><th>${t('pbv')}</th><th>${t('yield')}</th><th>ROE</th><th>${t('npl')}</th></tr></thead><tbody>${P.map((p) => { const lp = lastPoint(px(p.ticker.replace('-MX', '.MX').replace('-US', ''))); return `<tr><td>${p.name} <span class="muted small">${p.ticker}</span></td><td>${p.price != null ? p.currency + ' ' + fmtN(p.price, 2) : lp ? `<span class="muted">${p.currency} ${fmtN(lp[1], 2)} (Yahoo)</span>` : `<span class="muted">${t('pending')}</span>`}</td><td>${cell(p.mktCapUsdM, (v) => fmtN(v))}</td><td>${cell(p.peLtm, (v) => fmtX(v))}</td><td>${cell(p.peNtm, (v) => fmtX(v))}</td><td>${cell(p.pbv, (v) => fmtX(v, 2))}</td><td>${cell(p.divYieldPct, (v) => fmtPct(v))}</td><td>${cell(p.roePct, (v) => fmtPct(v))}</td><td>${cell(p.nplPct, (v) => fmtPct(v, 2))}</td></tr>`; }).join('')}<tr class="total"><td>Gentera</td><td>${lastPx ? 'MXN ' + fmtN(lastPx[1], 2) : '—'}</td><td>${lastPx && sharesOut && fxAt(lastPx[0]) ? fmtN(lastPx[1] * sharesOut / fxAt(lastPx[0]) / 1e6) : '—'}</td><td>${lastPx && e ? fmtX(lastPx[1] / e) : '—'}</td><td>—</td><td>${lastPx && bv ? fmtX(lastPx[1] / bv, 2) : '—'}</td><td>${lastPx && dps ? fmtPct(100 * dps / lastPx[1]) : '—'}</td><td>${lastLTM ? fmtPct(lastLTM.kpi.roe) : '—'}</td><td>${lastQ ? fmtPct(lastQ.kpi.npl, 2) : '—'}</td></tr></tbody></table>`);
    el('peersCap').textContent = `${PEERS.source || ''}${PEERS.updatedAt ? ' · ' + fmtDate(PEERS.updatedAt) : ''} · ${L(REF.peers && REF.peers.note)}`;
  }

  // ================= 07 ASSET QUALITY, FUNDING, CAPITAL =================
  function renderAssetQuality() {
    const es = LANG === 'es';
    const qs = Q.slice(-lastN() - 4);
    const c = SERIES();
    const o = (q, k) => (q.ops[k] != null ? q.ops[k] : null);
    mkChart('chartNpl', { type: 'line', data: { labels: qs.map(qLabel), datasets: [
      { label: t('cons'), data: qs.map((q) => q.kpi.npl), borderColor: c[6], backgroundColor: c[6], borderWidth: 2.5, pointRadius: 3 },
      { label: t('subMx'), data: qs.map((q) => o(q, 'nplMX')), borderColor: c[0], backgroundColor: c[0], pointRadius: 2 },
      { label: t('subPe'), data: qs.map((q) => o(q, 'nplPE')), borderColor: c[1], backgroundColor: c[1], pointRadius: 2 },
      { label: t('subCc'), data: qs.map((q) => o(q, 'nplCC')), borderColor: c[2], backgroundColor: c[2], pointRadius: 2 },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y, 2)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, beginAtZero: true } } } });
    html('nplSrc', `${t('src')}: ${es ? 'informes trimestrales (indicadores consolidados y secciones por subsidiaria)' : 'quarterly releases (consolidated indicators and subsidiary sections)'} · ${asOfQ()}`);
    mkChart('chartCor', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { label: es ? 'Castigos Banco (derivado)' : 'Bank write-offs (derived)', data: qs.map((q) => q.is.woMX), backgroundColor: c[0], stack: 'w', yAxisID: 'y', order: 3 },
      { label: es ? 'Castigos Perú' : 'Perú write-offs', data: qs.map((q) => q.is.woPE), backgroundColor: c[1], stack: 'w', yAxisID: 'y', order: 3 },
      { label: es ? 'Castigos ConCrédito' : 'ConCrédito write-offs', data: qs.map((q) => q.is.woCC), backgroundColor: c[2], stack: 'w', yAxisID: 'y', order: 3 },
      { type: 'line', label: t('cor') + ' (%)', data: qs.map((q) => q.kpi.cor), borderColor: c[3], backgroundColor: c[3], pointRadius: 3, yAxisID: 'y2', order: 1 },
      { type: 'line', label: t('coverage') + ' (%)', data: qs.map((q) => q.kpi.coverage), borderColor: c[6], backgroundColor: c[6], pointRadius: 3, yAxisID: 'y2', order: 1 },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.dataset.yAxisID === 'y2' ? fmtPct(x.parsed.y) : fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true, position: 'left' }, y2: { position: 'right', ticks: { callback: (v) => v + '%' }, grid: { display: false }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('corSrc', `${t('src')}: ${es ? 'castigos de la tabla de cartera de cada informe (Banco = consolidado − Perú − ConCrédito); costo de riesgo y cobertura recalculados' : 'write-offs from the portfolio table of each release (Bank = consolidated − Perú − ConCrédito); cost of risk and coverage recomputed'} · ${asOfQ()}`);
    mkChart('chartFunding', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { label: es ? 'Captación' : 'Deposits', data: qs.map((q) => q.bs.deposits), backgroundColor: c[0], stack: 'f' },
      { label: es ? 'Certificados bursátiles' : 'Debt securities', data: qs.map((q) => q.bs.debtSec), backgroundColor: c[1], stack: 'f' },
      { label: es ? 'Préstamos bancarios y banca de desarrollo' : 'Bank & development-bank loans', data: qs.map((q) => q.bs.bankLoans), backgroundColor: c[2], stack: 'f' },
      { label: es ? 'Bursatilizaciones' : 'Securitisations', data: qs.map((q) => q.bs.securit), backgroundColor: c[3], stack: 'f' },
      { type: 'line', label: es ? 'Cartera ÷ captación (x)' : 'Loans ÷ deposits (x)', data: qs.map((q) => q.kpi.loansToDeposits), borderColor: c[6], backgroundColor: c[6], pointRadius: 2, yAxisID: 'y2' },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.dataset.yAxisID === 'y2' ? fmtX(x.parsed.y, 2) : fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true }, y2: { position: 'right', ticks: { callback: (v) => fmtN(v, 1) + 'x' }, grid: { display: false }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('fundSrc', `${t('src')}: ${es ? 'balance general de cada informe' : 'balance sheet of each release'} · ${asOfQ()}`);
    mkChart('chartCapital', { type: 'line', data: { labels: qs.map(qLabel), datasets: [
      { label: `${t('icap')} · ${es ? 'Banco' : 'Bank'}`, data: qs.map((q) => o(q, 'icap')), borderColor: c[0], backgroundColor: c[0], pointRadius: 2 },
      { label: es ? 'Solvencia · Perú' : 'Solvency · Perú', data: qs.map((q) => o(q, 'solvPE')), borderColor: c[1], backgroundColor: c[1], pointRadius: 2 },
      { label: es ? 'Capital ÷ activos · consolidado' : 'Equity ÷ assets · consolidated', data: qs.map((q) => q.kpi.eqAssets), borderColor: c[2], backgroundColor: c[2], pointRadius: 2 },
      { label: es ? 'Costo de fondeo · Banco' : 'Cost of funds · Bank', data: qs.map((q) => o(q, 'cofMX')), borderColor: c[3], backgroundColor: c[3], borderDash: [4, 4], pointRadius: 2 },
      { label: es ? 'Costo de fondeo · Perú' : 'Cost of funds · Perú', data: qs.map((q) => o(q, 'cofPE')), borderColor: c[4], backgroundColor: c[4], borderDash: [4, 4], pointRadius: 2 },
    ] }, options: { plugins: { legend: legendTop, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, beginAtZero: true } } } });
    html('capSrc', `${t('src')}: ${es ? 'secciones de Banco Compartamos y Compartamos Banco Perú de cada informe; capital ÷ activos del balance consolidado' : 'Banco Compartamos and Compartamos Banco Perú sections of each release; equity ÷ assets from the consolidated balance sheet'} · ${asOfQ()}`);
    const q8 = Q.slice(-8);
    const rowsDef = [
      [es ? 'Cartera etapa 3 (Ps. M)' : 'Stage-3 loans (Ps. M)', (q) => fmtN(q.bs.loans3)], [t('npl'), (q) => fmtPct(q.kpi.npl, 2)], [es ? 'Estimación preventiva (Ps. M)' : 'Loan-loss allowance (Ps. M)', (q) => fmtN(q.bs.allow)], [t('coverage'), (q) => fmtPct(q.kpi.coverage, 0)], [es ? 'Cobertura impresa en el informe' : 'Coverage as printed', (q) => fmtPct(q.kpi.coverageRep, 0)],
      [es ? 'Provisiones del trimestre (Ps. M)' : 'Quarterly provisions (Ps. M)', (q) => fmtN(q.is.prov)], [t('cor'), (q) => fmtPct(q.kpi.cor)], [es ? 'Castigos consolidados (Ps. M)' : 'Consolidated write-offs (Ps. M)', (q) => fmtN(q.is.writeoffs)], [es ? 'Castigos Banco (derivado)' : 'Bank write-offs (derived)', (q) => fmtN(q.is.woMX)], [es ? 'Castigos Perú' : 'Perú write-offs', (q) => fmtN(q.is.woPE)], [es ? 'Castigos ConCrédito' : 'ConCrédito write-offs', (q) => fmtN(q.is.woCC)],
      [es ? 'Captación (Ps. M)' : 'Deposits (Ps. M)', (q) => fmtN(q.bs.deposits)], [es ? 'Cartera ÷ captación' : 'Loans ÷ deposits', (q) => fmtX(q.kpi.loansToDeposits, 2)], [es ? 'Costo de fondeo Banco' : 'Bank cost of funds', (q) => fmtPct(o(q, 'cofMX'))], [es ? 'Costo de fondeo Perú' : 'Perú cost of funds', (q) => fmtPct(o(q, 'cofPE'))],
      [`${t('icap')} · ${es ? 'Banco' : 'Bank'}`, (q) => fmtPct(o(q, 'icap'))], [es ? 'Solvencia · Perú' : 'Solvency · Perú', (q) => fmtPct(o(q, 'solvPE'))], [es ? 'Capital ÷ activos' : 'Equity ÷ assets', (q) => fmtPct(q.kpi.eqAssets)], [es ? 'Pasivo ÷ capital' : 'Liabilities ÷ equity', (q) => fmtX(q.kpi.leverage, 2)],
    ];
    html('aqTable', `<table><thead><tr><th>${t('metric')}</th>${q8.map((q) => `<th>${qLabel(q)}</th>`).join('')}</tr></thead><tbody>${rowsDef.map((r) => `<tr><td>${r[0]}</td>${q8.map((q) => `<td>${r[1](q)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    el('aqCap').textContent = es ? 'Últimos 8 trimestres. Cobertura = estimación ÷ etapa 3 recalculada; la fila "impresa" muestra la cifra de cada informe (otra definición hasta el 3T25). Castigos del Banco = consolidado − Perú − ConCrédito (incluye Yastás).' : 'Last 8 quarters. Coverage = allowance ÷ stage 3 recomputed; the "as printed" row shows each release\'s figure (a different definition through 3Q25). Bank write-offs = consolidated − Perú − ConCrédito (includes Yastás).';
    const R = REF.ratings || [];
    html('ratingsTable', R.length ? `<table><thead><tr><th>${t('agency')}</th><th>${t('entity')}</th><th>${t('rating')}</th><th>${t('outlook')}</th><th>${t('date')}</th></tr></thead><tbody>${R.map((r) => `<tr><td>${r.agency}</td><td>${r.entity}</td><td style="text-align:left">${r.rating}</td><td style="text-align:left">${L(r.outlook)}</td><td>${fmtDate(r.date)}<span class="sub">${L(r.source)}</span></td></tr>`).join('')}</tbody></table>` : `<p class="muted small">${L(REF.ratingsNote)}</p>`);
    el('ratingsCap').textContent = es ? 'Calificaciones de Banco Compartamos y de Gentera según los eventos relevantes.' : 'Ratings of Banco Compartamos and Gentera per material-event notices.';
    const lq = lastQ, lp = qById[yoyQid(lq)];
    html('capNote', es
      ? `<b>Sin deuda de tenedora relevante.</b> El fondeo es de las subsidiarias: captación de Banco Compartamos (${fmtPct(100 * lq.bs.deposits / lq.bs.totLiab, 0)} del pasivo consolidado en ${qLabel(lq)}), certificados bursátiles y préstamos bancarios. Apalancamiento ${fmtX(lq.kpi.leverage, 1)} pasivo ÷ capital y capital ÷ activos ${fmtPct(lq.kpi.eqAssets)} (${lp ? fmtPct(lp.kpi.eqAssets) + ' un año antes' : ''}). La etapa 3 consolidada de ${fmtPct(lq.kpi.npl, 2)} se compara con el umbral de alerta de ${((QL && QL.thresholds) || {}).stage3RatioPct || 4.5}% de la rutina de revisión.`
      : `<b>No material holding-company debt.</b> Funding sits at the subsidiaries: Banco Compartamos deposits (${fmtPct(100 * lq.bs.deposits / lq.bs.totLiab, 0)} of consolidated liabilities at ${qLabel(lq)}), certificados bursátiles and bank loans. Leverage ${fmtX(lq.kpi.leverage, 1)} liabilities ÷ equity and equity ÷ assets ${fmtPct(lq.kpi.eqAssets)} (${lp ? fmtPct(lp.kpi.eqAssets) + ' a year earlier' : ''}). The consolidated stage-3 ratio of ${fmtPct(lq.kpi.npl, 2)} compares with the reviewing routine's alert threshold of ${((QL && QL.thresholds) || {}).stage3RatioPct || 4.5}%.`);
  }

  // ================= 08 DIVIDENDS =================
  function renderDividends() {
    const es = LANG === 'es';
    const D = (REF.dividends || []).slice().sort((a, b) => a.agmYear - b.agmYear);
    const c = SERIES();
    mkChart('chartDps', { type: 'bar', data: { labels: D.map((d) => String(d.agmYear)), datasets: [{ label: t('dps'), data: D.map(dpsOf), backgroundColor: c[0] }] }, options: { plugins: { tooltip: { callbacks: { label: (x) => 'Ps. ' + fmtN(x.parsed.y, 2) } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 1) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 36, borderWidth: 0 } } } });
    html('dpsSrc', `${t('src')}: ${es ? 'dividendos aprobados en cada asamblea anual (informes trimestrales de Gentera); por acción = monto ÷ acciones en circulación del año' : 'dividends approved at each annual meeting (Gentera quarterly releases); per share = amount ÷ that year\'s shares outstanding'} · ${refStamp()}`);
    const paid = (MK.dividends && MK.dividends[TICK] && MK.dividends[TICK].points) || [];
    const rows = D.map((d) => { const fy = Y.find((yy) => yy.fy === d.agmYear - 1); const nic = fy && fy.is ? fy.is.niCtrl : null; const dps = dpsOf(d); const pEnd = pointAtOrBefore(qPx, `${d.agmYear}-12-31`); const paidY = paid.filter((p) => p[0].slice(0, 4) === String(d.agmYear)).reduce((a, p) => a + p[1], 0);
      return `<tr><td>${d.agmYear}${d.agmDate ? `<span class="sub">${fmtDate(d.agmDate)}</span>` : ''}</td><td>${fmtN(d.totalMxnM, 1)}</td><td>${fmtN(dps, 2)}</td><td>${paidY ? fmtN(paidY, 2) : '—'}</td><td>${nic ? fmtPct(100 * d.totalMxnM / nic, 0) : '—'}</td><td>${pEnd ? fmtPct(100 * dps / pEnd[1]) : (lastPx && d.agmYear === lastPx[0].slice(0, 4) * 1 ? fmtPct(100 * dps / lastPx[1]) : '—')}</td></tr>`; });
    html('dpsTable', `<table><thead><tr><th>${t('year')}</th><th>${es ? 'Aprobado (Ps. M)' : 'Approved (Ps. M)'}</th><th>${t('dps')}</th><th>${es ? 'Pagado según bolsa (Ps.)' : 'Paid per exchange (Ps.)'}</th><th>${t('payout')}</th><th>${t('yield')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('dpsCap').textContent = es ? 'Razón de pago = monto aprobado ÷ utilidad neta controladora del año fiscal anterior (la base de la política de Gentera); rendimiento sobre el cierre del año de pago (o el último cierre para el año en curso). "Pagado según bolsa" se llena con el flujo de mercado.' : 'Payout = approved amount ÷ prior fiscal year\'s controlling net income (the basis of Gentera\'s policy); yield on the payment year\'s closing price (or the latest close for the current year). "Paid per exchange" fills from the market feed.';
    const pol = REF.dividendPolicy || {};
    html('dpsNote', D.slice().reverse().map((d) => `<b>${t('agm')} ${d.agmYear}</b>: Ps. ${fmtN(d.totalMxnM, 1)} M (Ps. ${fmtN(dpsOf(d), 2)} ${es ? 'por acción' : 'per share'})${d.payments ? ` · ${es ? 'pagos' : 'payments'}: ${d.payments.map(fmtDate).join(', ')}` : ''}. ${LS(d.note)} <span class="muted">(${LS(d.source)})</span>`).join('<br>') + `<br><span class="muted">${L(pol.note)}</span>`);
  }

  // ================= 09 CONCRÉDITO / PERÚ · 10 GROUP LENDING =================
  function renderSpecial() {
    const es = LANG === 'es';
    const fmtFact = (f) => (f.fmt === 'mxnM' ? 'Ps. ' + fmtN(f.v, f.v % 1 ? 1 : 0) + ' M' : f.fmt === 'pct' ? fmtPct(f.v, f.v % 1 ? 2 : 0) : f.fmt === 'days' ? fmtN(f.v) + (es ? ' días' : ' days') : fmtN(f.v));
    const facts = (id, arr) => html(id, (arr || []).map((f) => `<div class="fact"><div class="v">${fmtFact(f)}</div><div class="l">${es ? f.label_es : f.label_en}</div></div>`).join(''));
    const tl = (id, arr) => html(id, (arr || []).map((e) => `<li><b>${fmtDate(e.date)}</b>${L(e)}</li>`).join(''));
    const CC = REF.concredito || {}, PE = REF.peru || {}, GL = REF.groupLending || {};
    facts('ccFacts', CC.facts); tl('ccTimeline', CC.timeline); html('ccSrc', `${t('src')}: ${(CC.sources || []).join(' · ')} · ${refStamp()}`);
    facts('peFacts', PE.facts); tl('peTimeline', PE.timeline); html('peSrc', `${t('src')}: ${(PE.sources || []).join(' · ')} · ${refStamp()}`);
    facts('glFacts', GL.facts); html('glSrc', `${t('src')}: ${(GL.sources || []).join(' · ')} · ${refStamp()}`);
  }

  // ================= 11 METHOD / SOURCES =================
  function renderMethod() {
    const es = LANG === 'es';
    const mo = OPS.monthly || {}; const lastCn = ((mo.cnbv || {}).series || []).slice(-1)[0], lastSb = ((mo.sbs || {}).series || []).slice(-1)[0];
    const rows = [
      [es ? 'Estados financieros trimestrales, acumulados y anuales; cartera, clientes y calidad por subsidiaria' : 'Quarterly, YTD and annual statements; loans, clients and asset quality by subsidiary', es ? 'días hábiles 14:35 UTC' : 'weekdays 14:35 UTC', es ? 'GitHub Actions descarga los informes trimestrales del sitio de RI, los convierte en tablas, prueba el parser contra el archivo y valida cuadres antes de publicar' : 'GitHub Actions downloads the quarterly releases from the IR site, parses the tables, regression-tests the parser and validates tie-outs before publishing', fmtDate((FIN.generatedAt || '').slice(0, 10))],
      [es ? 'Series mensuales CNBV (Banco Compartamos) y SBS (Perú)' : 'Monthly CNBV (Banco Compartamos) and SBS (Perú) series', es ? 'días hábiles, mejor esfuerzo' : 'weekdays, best effort', 'fetch-regulators.py → data/operations.js', lastCn || lastSb ? `${lastCn ? 'CNBV ' + lastCn.month : ''} ${lastSb ? 'SBS ' + lastSb.month : ''}` : (es ? 'pendiente' : 'pending')],
      [es ? 'Guía de la administración y consenso' : 'Management guidance and consensus', es ? 'por trimestre (revisado) · FactSet pendiente' : 'per quarter (reviewed) · FactSet pending', 'data/guidance.js · data/peers.js', GD.updatedAt ? fmtDate(GD.updatedAt) : '—'],
      [es ? 'Comentarios de los estados financieros' : 'Statement comments', es ? 'por trimestre (borrador de la rutina, revisado)' : 'per quarter (drafted by the routine, reviewed)', 'data/comments.js', CM.updatedAt ? fmtDate(CM.updatedAt) : '—'],
      [es ? 'Resumen ejecutivo' : 'Executive summary', es ? 'con cada informe (rutina)' : 'with each release (routine)', 'data/summary.js', SUM.updatedAt ? fmtDate(SUM.updatedAt) : '—'],
      [es ? 'Precios, dividendos, tipo de cambio, tasas' : 'Prices, dividends, FX, yields', es ? 'diario, después del cierre de la BMV' : 'daily after the BMV close', 'Yahoo Finance · Banxico SIE · FRED (DEXMXUS, DGS10)', MK.generatedAt ? fmtDate(MK.generatedAt.slice(0, 10)) : (es ? 'pendiente de la primera corrida' : 'pending first run')],
      [es ? 'Referencia: acciones, subsidiarias, dividendos, ConCrédito, Perú, glosario, supuestos de valuación' : 'Reference: shares, subsidiaries, dividends, ConCrédito, Perú, glossary, valuation defaults', es ? 'por evento (commit revisado)' : 'event-driven (reviewed commit)', 'data/reference.js', fmtDate(REF.updatedAt)],
      [es ? 'Múltiplos de pares' : 'Peer multiples', es ? 'pendiente' : 'pending', 'FactSet → data/peers.js', PEERS.updatedAt ? fmtDate(PEERS.updatedAt) : '—'],
      [es ? 'Alertas por correo (rutina de revisión)' : 'Email alerts (reviewing routine)', es ? 'días hábiles 15:35 UTC, sólo días materiales' : 'weekdays 15:35 UTC, material days only', es ? 'umbrales: movimiento diario ≥ 5%, etapa 3 > 4.5%, guía fuera de rango; tools/gentera/notify-state.json' : 'thresholds: daily move ≥ 5%, stage 3 > 4.5%, guidance outside range; tools/gentera/notify-state.json', '—'],
    ];
    html('refreshTable', `<table><thead><tr><th>${t('block')}</th><th>${t('cadence')}</th><th>${t('mechanism')}</th><th>${t('lastUpdate')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    html('srcGrid', (REF.sources || []).map((s) => `<div class="item"><div class="t"><a href="${s.u}" target="_blank" rel="noopener">${L(s.t)} ↗</a></div><div class="d">${L(s.d)}</div></div>`).join(''));
  }
  function applyGlossary() {
    const G = REF.glossary || {};
    document.querySelectorAll('dfn[data-g]').forEach((d) => { const g = G[d.dataset.g]; if (g) { d.setAttribute('title', L(g)); d.setAttribute('tabindex', '0'); } });
  }

  // ================= wiring =================
  function seg(id, onChange) { const box = el(id); if (!box) return; box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on); }); onChange(b.dataset.v); })); }
  function renderAll() {
    chartDefaults();
    renderHeader(); renderSummary(); renderStatements(); renderGuidance(); renderDrivers(); renderShare(); renderValuation(); renderRelative(); renderAssetQuality(); renderDividends(); renderSpecial(); renderMethod(); applyGlossary();
  }
  function setLang(lang) {
    LANG = lang;
    el('btnLangEs').classList.toggle('active', lang === 'es'); el('btnLangEn').classList.toggle('active', lang === 'en');
    el('btnLangEs').setAttribute('aria-pressed', lang === 'es'); el('btnLangEn').setAttribute('aria-pressed', lang === 'en');
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es-MX' : 'en');
    document.querySelectorAll('.es').forEach((e) => { e.hidden = lang !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = lang !== 'en'; });
    try { localStorage.setItem('g-lang', lang); } catch (e) { /* ignore */ }
    fillSelects(); renderAll();
  }
  el('btnLangEs').addEventListener('click', () => setLang('es')); el('btnLangEn').addEventListener('click', () => setLang('en'));

  // ---------------- print as presentation ----------------
  function renderPrintExtras() {
    const conf = LANG === 'es' ? 'Confidencial. Preparado para uso interno; no distribuir.' : 'Confidential. Prepared for internal use; do not distribute.';
    const today = new Date().toISOString().slice(0, 10);
    const gv = vintagesSorted().pop();
    const basis = LANG === 'es'
      ? [`Último trimestre reportado: ${lastQ ? qLabel(lastQ) : '—'}`, `Guía vigente: ${gv ? fmtDate(gv.date) : '—'}`, `Cierre de mercado: ${lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : 'pendiente'}`, `Comparación en pantalla: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`]
      : [`Latest reported quarter: ${lastQ ? qLabel(lastQ) : '—'}`, `Guidance in force: ${gv ? fmtDate(gv.date) : '—'}`, `Market close: ${lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : 'pending'}`, `Comparison on screen: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`];
    html('printCover', `<div>${LANG === 'es' ? 'Modelo financiero interactivo · elaborado únicamente con información pública' : 'Interactive financial model · built only from public information'}</div><div class="basis">${basis.map((x) => `<div>${x}</div>`).join('')}<div>${LANG === 'es' ? 'Impreso el' : 'Printed'} ${fmtDate(today)} · fnam.mx/gentera</div></div><div class="conf">${conf}</div>`);
    const escq = (x) => x.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const left = escq(`Gentera · ${LANG === 'es' ? 'Modelo financiero' : 'Financial model'} · fnam.mx/gentera · ${conf} · ${fmtDate(today)}`);
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
  el('stmtTable').addEventListener('click', (e) => { const g = e.target.closest('[data-g]'); if (g) { st.open[g.dataset.g] = !st.open[g.dataset.g]; renderStatements(); } });
  el('stmtTable').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const g = e.target.closest('[data-g]'); if (g) { e.preventDefault(); st.open[g.dataset.g] = !st.open[g.dataset.g]; renderStatements(); } } });
  seg('segStmt', (v) => { st.stmt = v; renderStatements(); updateUrl(); });
  seg('segMode', (v) => { st.mode = v; fillSelects('yoy'); renderStatements(); updateUrl(); });
  seg('segPreset', (v) => { fillSelects(v); renderStatements(); updateUrl(); });
  el('selA').addEventListener('change', (e) => { st.a = e.target.value; renderStatements(); updateUrl(); });
  el('selB').addEventListener('change', (e) => { st.b = e.target.value; renderStatements(); updateUrl(); });
  el('chkAdj').addEventListener('change', (e) => { st.exAdj = e.target.checked; renderStatements(); updateUrl(); });
  el('chkUsd').addEventListener('change', (e) => { st.usd = e.target.checked; renderStatements(); updateUrl(); });
  seg('segGuideMetric', (v) => { gs.metric = v; renderGuideChart(); });
  seg('segDrvMetric', (v) => { dv.metric = v; dv.sel = new Set([dKeys()[0][0]]); renderDrivers(); });
  seg('segDrvFreq', (v) => { dv.freq = v; renderDrivers(); });
  seg('segRange', (v) => { sh.range = v; renderShare(); });
  const navLinks = [...document.querySelectorAll('nav.jump a')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); }, { rootMargin: '-40% 0px -55% 0px' }); sections.forEach((s) => io.observe(s)); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderAll());

  // ---------------- init ----------------
  let initLang = 'es';
  try { initLang = localStorage.getItem('g-lang') || 'es'; } catch (e) { /* ignore */ }
  hashToState();
  setLang(initLang);
})();
