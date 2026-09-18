/* GAP interactive financial model — page logic.
   Data contracts (window.GAP_*) are documented in tools/gap/README.md. Everything here is derived from
   those files at render time; no figures are hard-coded. */
(function () {
  'use strict';
  const FIN = window.GAP_FIN || { quarters: [], ytd: [], years: [], layout: { is: [], bs: [], cf: [], kpi: [] } };
  const TR = window.GAP_TRAFFIC || { months: [], airports: [] };
  const MK = window.GAP_MARKET || { prices: {}, dividends: {}, fx: {}, rates: {} };
  const REF = window.GAP_REF || {};
  const PEERS = window.GAP_PEERS || { peers: [] };
  const GD = window.GAP_GUIDANCE || { vintages: [] };
  const CM = window.GAP_COMMENTS || { periods: {} };

  // ---------------- i18n ----------------
  let LANG = 'es';
  const S = {
    quarter: { es: 'Trimestre', en: 'Quarter' }, ytd: { es: 'Acumulado', en: 'Year-to-date' }, ltm: { es: 'Últimos 12 meses', en: 'Last twelve months' }, fy: { es: 'Año fiscal', en: 'Fiscal year' },
    is: { es: 'Estado de resultados', en: 'Income statement' }, bs: { es: 'Estado de situación financiera', en: 'Statement of financial position' }, cf: { es: 'Estado de flujos de efectivo', en: 'Cash-flow statement' },
    line: { es: 'Concepto', en: 'Line item' }, change: { es: 'Δ', en: 'Δ' }, changePct: { es: 'Δ %', en: 'Δ %' },
    mxnM: { es: 'Ps. millones', en: 'Ps. million' }, usdM: { es: 'US$ millones', en: 'US$ million' },
    exIfric: { es: 'sin IFRIC 12', en: 'ex-IFRIC 12' }, reported: { es: 'como se reporta', en: 'as reported' },
    src: { es: 'Fuente', en: 'Source' }, release: { es: 'informe trimestral de GAP', en: 'GAP quarterly report' },
    aero: { es: 'Aeronáuticos', en: 'Aeronautical' }, nonAero: { es: 'No aeronáuticos', en: 'Non-aeronautical' }, ifric: { es: 'Construcción (IFRIC 12)', en: 'Construction (IFRIC 12)' },
    ebitdaMarginEx: { es: 'Margen EBITDA sin IFRIC 12 (%)', en: 'EBITDA margin ex-IFRIC 12 (%)' },
    revenue: { es: 'Ingresos', en: 'Revenue' }, ebitda: { es: 'EBITDA', en: 'EBITDA' }, netIncome: { es: 'Utilidad neta', en: 'Net income' }, margin: { es: 'Margen', en: 'Margin' },
    pax: { es: 'Pasajeros (miles)', en: 'Passengers (thousands)' }, revPerPax: { es: 'Ingreso por pasajero (Ps.)', en: 'Revenue per passenger (Ps.)' }, capex: { es: 'Capex', en: 'Capex' }, cfo: { es: 'Flujo operativo', en: 'Operating cash flow' },
    total: { es: 'Total', en: 'Total' }, dom: { es: 'Nacional', en: 'Domestic' }, intl: { es: 'Internacional', en: 'International' },
    monthly: { es: 'mensual', en: 'monthly' }, quarterly: { es: 'trimestral', en: 'quarterly' }, annual: { es: 'anual', en: 'annual' },
    airport: { es: 'Aeropuerto', en: 'Airport' }, yoy: { es: 'a/a', en: 'y/y' }, ytdShort: { es: 'Acum.', en: 'YTD' }, group: { es: 'Grupo (14 aeropuertos)', en: 'Group (14 airports)' },
    latestMonth: { es: 'Último mes', en: 'Latest month' }, share: { es: '% del total', en: '% of total' },
    price: { es: 'Precio', en: 'Price' }, close: { es: 'cierre', en: 'close' }, high52: { es: 'Máx. 52 sem.', en: '52-wk high' }, low52: { es: 'Mín. 52 sem.', en: '52-wk low' }, ytdChg: { es: 'Var. en el año', en: 'YTD change' }, oneY: { es: 'Var. 1 año', en: '1-yr change' }, mktCap: { es: 'Capitalización', en: 'Market cap' }, ev: { es: 'Valor de la empresa (VE)', en: 'Enterprise value (EV)' },
    period: { es: 'Periodo', en: 'Period' }, ret: { es: 'Rendimiento', en: 'Return' },
    perShare: { es: 'Valor por acción (Ps.)', en: 'Value per share (Ps.)' }, upside: { es: 'vs. precio actual', en: 'vs. current price' },
    year: { es: 'Año', en: 'Year' }, trafficG: { es: 'Crecimiento de pasajeros', en: 'Passenger growth' }, wacc: { es: 'WACC', en: 'WACC' }, tv: { es: 'Valor terminal', en: 'Terminal value' }, pv: { es: 'Valor presente', en: 'Present value' },
    dps: { es: 'Dividendo por acción (Ps.)', en: 'Dividend per share (Ps.)' }, payout: { es: 'Razón de pago', en: 'Payout ratio' }, yield: { es: 'Rendimiento', en: 'Yield' }, agm: { es: 'Aprobado en asamblea', en: 'Approved at AGM' },
    nd: { es: 'Deuda neta', en: 'Net debt' }, lev: { es: 'Deuda neta / EBITDA UDM', en: 'Net debt / LTM EBITDA' }, grossDebt: { es: 'Deuda bruta', en: 'Gross debt' }, cash: { es: 'Efectivo', en: 'Cash' },
    instrument: { es: 'Instrumento', en: 'Instrument' }, matures: { es: 'Vence', en: 'Matures' }, principal: { es: 'Principal (Ps. M)', en: 'Principal (Ps. M)' }, rate: { es: 'Tasa', en: 'Rate' }, rating: { es: 'Calificación', en: 'Rating' },
    pending: { es: 'Pendiente (conector FactSet)', en: 'Pending (FactSet connector)' }, na: { es: 'n/d', en: 'n/a' },
    metric: { es: 'Métrica', en: 'Metric' }, value: { es: 'Valor', en: 'Value' }, basis: { es: 'Base', en: 'Basis' },
    block: { es: 'Bloque', en: 'Block' }, cadence: { es: 'Cadencia', en: 'Cadence' }, mechanism: { es: 'Mecanismo', en: 'Mechanism' }, lastUpdate: { es: 'Última actualización', en: 'Last update' },
    ops: { es: 'Métricas operativas', en: 'Operating metrics' }, termPax: { es: 'Pasajeros terminales (miles)', en: 'Terminal passengers (thousands)' },
    domPax: { es: 'Pasajeros nacionales', en: 'Domestic passengers' }, intlPax: { es: 'Pasajeros internacionales', en: 'International passengers' }, totalPax: { es: 'Pasajeros totales', en: 'Total passengers' },
    wluNote: { es: 'WLU (unidad de carga de trabajo) = pasajeros terminales + unidades de carga; 1 unidad de carga = 100 kg de carga. Es la medida de GAP para expresar tráfico y carga en una sola unidad.', en: 'WLU (workload unit) = terminal passengers + cargo units; 1 cargo unit = 100 kg of cargo. It is GAP\'s measure for expressing traffic and cargo in a single unit.' },
    cbxUsers: { es: 'Usuarios de CBX (miles, ambas direcciones)', en: 'CBX users (thousands, both directions)' },
    trafCargo: { es: 'Tráfico y carga (miles)', en: 'Traffic and cargo (thousands)' }, cargoWlu: { es: 'Volumen de carga (miles de WLU)', en: 'Total cargo volume (thousand WLUs)' }, wluTotal: { es: 'WLU totales (miles)', en: 'Total WLUs (thousands)' },
    revPerPaxGap: { es: 'Ingreso aero + no aero por pasajero', en: 'Aero + non-aero revenue per passenger' }, aeroPerWlu: { es: 'Ingreso aeronáutico por WLU', en: 'Aeronautical revenue per WLU' }, costPerWlu: { es: 'Costo de servicios por WLU', en: 'Cost of services per WLU' },
    unitRev: { es: 'Ingresos y costos unitarios', en: 'Unit revenues and costs' }, aeroPerPax: { es: 'Ingreso aeronáutico por pasajero', en: 'Aeronautical revenue per passenger' },
    nonAeroPerPax: { es: 'Ingreso no aeronáutico por pasajero', en: 'Non-aeronautical revenue per passenger' }, nonAeroExCbx: { es: 'sin ingresos de CBX', en: 'excluding CBX revenue' },
    cbxPerUser: { es: 'Ingreso de CBX por usuario de CBX', en: 'CBX revenue per CBX user' },
    guideFy: { es: 'Año guiado', en: 'Guided year' }, guideStatus: { es: 'Estatus', en: 'Status' }, issued: { es: 'Emitida', en: 'Issued' }, revised: { es: 'Revisada', en: 'Revised' }, unchanged: { es: 'Sin cambios', en: 'Unchanged' }, initial: { es: 'Inicial', en: 'Initial' },
    actual: { es: 'Real', en: 'Actual' }, tracking: { es: 'Seguimiento', en: 'Tracking' }, outcome: { es: 'Resultado', en: 'Outcome' }, within: { es: 'En rango', en: 'In range' }, above: { es: 'Por encima', en: 'Above' }, below: { es: 'Por debajo', en: 'Below' }, ofYear: { es: 'del año', en: 'of the year' },
    date: { es: 'Fecha', en: 'Date' }, type: { es: 'Tipo', en: 'Type' }, hits: { es: 'En rango o mejor', en: 'In range or better' }, gapRelease: { es: 'comunicado de GAP', en: 'GAP release' }, standalone: { es: 'comunicado aparte', en: 'standalone release' }, withResults: { es: 'con resultados', en: 'with results' },
    comments: { es: 'Comentarios', en: 'Comments' }, ociGroup: { es: 'Otros resultados integrales y participación no controladora', en: 'Other comprehensive income and non-controlling interest' }, items: { es: 'conceptos', en: 'items' },
    cmtNote: { es: 'Comentarios (a/a) elaborados a partir de los informes trimestrales y las transcripciones de las conferencias de resultados; disponibles para los últimos cuatro trimestres reportados y sus acumulados.', en: 'Comments (y/y) written from the quarterly reports and the earnings-call transcripts; available for the last four reported quarters and their year-to-date periods.' },
    cmtOnlyYoy: { es: 'Los comentarios se muestran al comparar un periodo con el mismo periodo del año anterior.', en: 'Comments appear when a period is compared with the same period a year earlier.' },
    provisional: { es: 'Datos provisionales: faltan archivos de datos. Ejecute el flujo de actualización.', en: 'Provisional: data files missing. Run the refresh workflow.' },
  };
  const t = (k) => (S[k] ? S[k][LANG] : k);
  const L = (obj) => (obj ? (LANG === 'es' ? obj.es || obj.en : obj.en || obj.es) : '');
  const LS = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v : L(v)); // string, {es,en} or array

  // ---------------- formatting ----------------
  const locale = () => (LANG === 'es' ? 'es-MX' : 'en-US');
  const fmtN = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }));
  const fmtM = (vThousands, d = 0) => fmtN(vThousands / 1000, d);         // thousands -> millions
  const fmtPct = (v, d = 1, sign = false) => (v == null || !isFinite(v) ? '—' : (sign && v > 0 ? '+' : '') + v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + '%');
  const fmtX = (v, d = 1) => (v == null || !isFinite(v) ? '—' : v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }) + 'x');
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')); return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const qLabel = (q) => (LANG === 'es' ? `${q.q}T${String(q.fy).slice(2)}` : `${q.q}Q${String(q.fy).slice(2)}`);
  const ytdLabel = (fy, months) => `${months}M${String(fy).slice(2)}`;
  const ymLabel = (ym) => { const [y, m] = ym.split('-'); const d = new Date(Date.UTC(+y, +m - 1, 1)); return d.toLocaleDateString(locale(), { month: 'short', year: '2-digit', timeZone: 'UTC' }); };
  const cls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  const el = (id) => document.getElementById(id);
  const html = (id, s) => { const e = el(id); if (e) e.innerHTML = s; };

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

  // ---------------- data prep ----------------
  const Q = FIN.quarters.filter((q) => q.is);                     // quarters with an income statement
  const Y = FIN.years;
  const YTD = FIN.ytd;
  const lastQ = Q[Q.length - 1];
  const qById = Object.fromEntries(FIN.quarters.map((q) => [q.id, q]));
  const ytdById = Object.fromEntries(YTD.map((y) => [y.id, y]));
  const prevQid = (q) => (q.q === 1 ? `${q.fy - 1}Q4` : `${q.fy}Q${q.q - 1}`);
  const yoyQid = (q) => `${q.fy - 1}Q${q.q}`;
  const sumParts = (objs) => { const o = {}; for (const x of objs) for (const [k, v] of Object.entries(x || {})) if (typeof v === 'number') o[k] = (o[k] || 0) + v; return o; };
  // Percent / per-share rows are not additive: recompute margins after summing.
  const fixRatios = (is) => { if (!is) return is; const o = { ...is }; for (const d of FIN.layout.is) if (d.pct || d.perShare) delete o[d.k]; if (o.revTotal) { const ex = o.revTotal - (o.revConstruction || 0); if (o.ebitda != null) { o.ebitdaMargin = 100 * o.ebitda / o.revTotal; o.ebitdaMarginExIfric = 100 * o.ebitda / ex; } if (o.opIncome != null) { o.opMargin = 100 * o.opIncome / o.revTotal; o.opMarginExIfric = 100 * o.opIncome / ex; } } return o; };
  // YTD for a quarter: reported YTD column if present; else the sum of the year's quarters to date.
  function ytdFor(q) {
    const id = `${q.fy}M${q.q * 3}`;
    if (q.q === 1) return { is: q.is, cf: q.cf, kpi: q.kpi, id: ytdLabel(q.fy, 3), sources: q.sources, fy: q.fy, months: 3 };
    const y = ytdById[id];
    if (y && y.is) {
      let is = y.is;
      if (is.ebitda == null) { // the 6M/9M column of some releases omits EBITDA: take it from the quarters
        const qs = []; for (let i = 1; i <= q.q; i++) { const x = qById[`${q.fy}Q${i}`]; if (!x || !x.is || x.is.ebitda == null) { qs.length = 0; break; } qs.push(x); }
        if (qs.length) { const sm = fixRatios(sumParts(qs.map((x) => x.is))); is = { ...is }; for (const k of ['ebitda', 'ebitdaMargin', 'ebitdaMarginExIfric']) if (is[k] == null && sm[k] != null) is[k] = sm[k]; }
      }
      return { ...y, is, id: ytdLabel(q.fy, q.q * 3) };
    }
    const qs = []; for (let i = 1; i <= q.q; i++) { const x = qById[`${q.fy}Q${i}`]; if (!x || !x.is) return null; qs.push(x); }
    return { id: ytdLabel(q.fy, q.q * 3), fy: q.fy, months: q.q * 3, is: fixRatios(sumParts(qs.map((x) => x.is))), cf: sumParts(qs.map((x) => x.cf)), kpi: sumParts(qs.map((x) => x.kpi)), sources: q.sources, derived: true };
  }
  // LTM for a quarter: sum of the last four quarters (or FY + YTD − prior YTD).
  function ltmFor(q) {
    const qs = []; let fy = q.fy, qq = q.q;
    for (let i = 0; i < 4; i++) { const x = qById[`${fy}Q${qq}`]; if (!x || !x.is) { qs.length = 0; break; } qs.push(x); qq--; if (qq === 0) { qq = 4; fy--; } }
    if (qs.length === 4) return { id: 'LTM ' + qLabel(q), is: fixRatios(sumParts(qs.map((x) => x.is))), cf: sumParts(qs.map((x) => x.cf)), kpi: sumParts(qs.map((x) => x.kpi)), bs: q.bs, sources: q.sources, derived: true, fy: q.fy, q: q.q };
    if (q.q === 4) { const y = Y.find((yy) => yy.fy === q.fy); if (y) return { id: 'LTM ' + qLabel(q), is: y.is, cf: y.cf, kpi: y.kpi, bs: q.bs, sources: y.sources, fy: q.fy, q: 4 }; }
    const fyPrev = Y.find((yy) => yy.fy === q.fy - 1), cur = ytdFor(q), prev = ytdById[`${q.fy - 1}M${q.q * 3}`];
    if (fyPrev && cur && prev && cur.is && prev.is) {
      const diff = (a, b, c) => { const o = {}; for (const k of Object.keys(a || {})) if (typeof a[k] === 'number' && b && c && typeof b[k] === 'number' && typeof c[k] === 'number') o[k] = a[k] + b[k] - c[k]; return o; };
      return { id: 'LTM ' + qLabel(q), is: fixRatios(diff(fyPrev.is, cur.is, prev.is)), cf: diff(fyPrev.cf, cur.cf, prev.cf), kpi: diff(fyPrev.kpi, cur.kpi, prev.kpi), bs: q.bs, sources: q.sources, derived: true, fy: q.fy, q: q.q };
    }
    return null;
  }
  const lastLTM = lastQ ? ltmFor(lastQ) : null;

  // Market helpers
  const px = (id) => (MK.prices && MK.prices[id] && MK.prices[id].points) || [];
  const lastPoint = (pts) => (pts.length ? pts[pts.length - 1] : null);
  const pointAtOrBefore = (pts, date) => { let lo = 0, hi = pts.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= date) { ans = pts[mid]; lo = mid + 1; } else hi = mid - 1; } return ans; };
  const fxPts = (MK.fx && MK.fx.USDMXN && MK.fx.USDMXN.points) || [];
  const fxAt = (date) => { const p = pointAtOrBefore(fxPts, date); return p ? p[1] : null; };
  const mx10 = (MK.rates && MK.rates.MX10Y && MK.rates.MX10Y.points) || [];
  const gapPx = px('GAPB.MX'); const lastPx = lastPoint(gapPx);
  // Shares outstanding: the latest results release once it is dated after the hand-curated figure in reference.js.
  const lastQEnd = lastQ ? `${lastQ.fy}-${String(lastQ.q * 3).padStart(2, '0')}-28` : null;
  const sharesNow = (lastQ && lastQ.shares && lastQ.shares.current && (!(REF.shares && REF.shares.asOf) || lastQEnd >= REF.shares.asOf)) ? lastQ.shares.current : (REF.shares && REF.shares.total) || (lastQ && lastQ.shares && lastQ.shares.current) || null;
  const sharesAt = (date) => { const h = (REF.shares && REF.shares.history) || []; let v = sharesNow; for (const e of h) if (e.asOf <= date) v = e.total; if (h.length && date < h[0].asOf) v = h[0].total; return v; };
  const qEndDate = (q) => `${q.fy}-${String(q.q * 3).padStart(2, '0')}-${q.q === 1 || q.q === 4 ? '31' : '30'}`;

  // Gross / net debt at each quarter-end (thousands of pesos).
  //  basis 'bs'  — itemised in the published balance sheet (bank loans + certificados bursátiles); from 2Q26.
  //  basis 'ref' — hand-curated in reference.js (debt.history) from the PDF quarterly report / 20-F.
  //  basis 'est' — rolled back from the nearest reported figure using the quarter's financing cash flows
  //                (bonds and loans issued less repaid); ignores FX revaluation of USD debt and accrued
  //                interest, so it is an estimate and is drawn as such.
  const DEBT = (() => {
    const out = {};
    const qs = FIN.quarters.filter((q) => q.bs);
    for (const q of qs) {
      const b = q.bs;
      const items = ['bankLoansCurrent', 'bondsCurrent', 'bankLoansLT', 'bondsLT'].filter((k) => b[k] != null);
      if (items.length) { const gross = items.reduce((a, k) => a + b[k], 0); out[q.id] = { gross, cash: b.cash, net: gross - b.cash, basis: 'bs' }; continue; }
      const h = ((REF.debt && REF.debt.history) || []).find((e) => e.q === q.id);
      if (h && h.grossDebtMxnM != null) out[q.id] = { gross: h.grossDebtMxnM * 1000, cash: b.cash, net: h.grossDebtMxnM * 1000 - b.cash, basis: 'ref' };
    }
    const flows = (q) => (q.cf ? ['bondsIssued', 'bondsPaid', 'loansReceived', 'loansPaid'].reduce((a, k) => a + (q.cf[k] || 0), 0) : null);
    for (let i = qs.length - 1; i >= 0; i--) {
      const q = qs[i], next = qs[i + 1];
      if (out[q.id] || !next || !out[next.id]) continue;
      const f = flows(next); if (f == null || next.id !== `${q.q === 4 ? q.fy + 1 : q.fy}Q${q.q === 4 ? 1 : q.q + 1}`) continue;
      const gross = out[next.id].gross - f;
      if (gross > 0 && q.bs.cash != null) out[q.id] = { gross, cash: q.bs.cash, net: gross - q.bs.cash, basis: 'est' };
    }
    return out;
  })();
  const netDebt = (q) => (q && DEBT[q.id]) || null;
  const estTag = () => (LANG === 'es' ? 'est.' : 'est.');

  // ================= HEADER =================
  function renderHeader() {
    const asof = [];
    if (lastQ) asof.push(`<span><b>${t('quarter')}:</b> ${qLabel(lastQ)} · ${fmtDate(lastQ.sources && lastQ.sources.is && lastQ.sources.is.date)}</span>`);
    const lastM = TR.months[TR.months.length - 1];
    if (lastM) asof.push(`<span><b>${LANG === 'es' ? 'Tráfico' : 'Traffic'}:</b> ${ymLabel(lastM.ym)} · ${fmtDate(lastM.source && lastM.source.date)}</span>`);
    if (lastPx) asof.push(`<span><b>${t('price')}:</b> ${fmtDate(lastPx[0])}</span>`);
    if (MK.generatedAt) asof.push(`<span><b>${LANG === 'es' ? 'Datos generados' : 'Data generated'}:</b> ${fmtDate(MK.generatedAt.slice(0, 10))}</span>`);
    html('asofRow', asof.join(''));
    const notice = el('dataNotice');
    if (!Q.length || !TR.months.length) { notice.hidden = false; notice.className = 'notice warn'; notice.textContent = t('provisional'); } else notice.hidden = true;

    const k = [];
    if (lastPx) { const yAgo = pointAtOrBefore(gapPx, addDays(lastPx[0], -365)); k.push({ l: 'GAP B (BMV)', v: 'Ps. ' + fmtN(lastPx[1], 2), d: yAgo ? `${fmtPct(100 * (lastPx[1] / yAgo[1] - 1), 1, true)} ${t('oneY')}` : '' }); }
    if (lastPx && sharesNow) { const mc = lastPx[1] * sharesNow; k.push({ l: t('mktCap'), v: 'Ps. ' + fmtN(mc / 1e9, 1) + ' ' + (LANG === 'es' ? 'mil M' : 'bn'), d: fxAt(lastPx[0]) ? 'US$ ' + fmtN(mc / fxAt(lastPx[0]) / 1e9, 1) + ' ' + (LANG === 'es' ? 'mil M' : 'bn') : '' }); }
    if (lastLTM && lastLTM.is) k.push({ l: 'EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: 'Ps. ' + fmtM(lastLTM.is.ebitda) + ' M', d: `${t('margin')} ${fmtPct(lastLTM.is.ebitdaMarginExIfric)} ${t('exIfric')}` });
    const nd = netDebt(lastQ);
    if (nd && lastLTM && lastLTM.is) k.push({ l: t('lev'), v: fmtX(nd.net / lastLTM.is.ebitda, 2), d: `${t('nd')} Ps. ${fmtM(nd.net)} M` });
    if (lastPx && sharesNow && nd && lastLTM && lastLTM.is) { const ev = lastPx[1] * sharesNow / 1000 + nd.net + (lastQ.bs.nci || 0); k.push({ l: 'VE / EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: fmtX(ev / lastLTM.is.ebitda), d: lastLTM.is.comprehensiveControlling ? `P/U ${fmtX(lastPx[1] * sharesNow / 1000 / lastLTM.is.comprehensiveControlling)}` : '' }); }
    html('kpiStrip', k.map((x) => `<div class="kpi"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="delta">${x.d || ''}</div></div>`).join(''));
    el('genStamp').textContent = fmtDate((FIN.generatedAt || MK.generatedAt || '').slice(0, 10));
  }
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  // ================= 01 STATEMENTS =================
  const st = { stmt: 'is', mode: 'q', a: null, b: null, exIfric: true, usd: false, open: { cos: false, oci: false } };
  function periodOptions() {
    if (st.mode === 'fy') return Y.map((y) => ({ id: y.id, label: 'FY' + y.fy, obj: { ...y, label: 'FY' + y.fy } }));
    if (st.mode === 'q') return Q.map((q) => ({ id: q.id, label: qLabel(q), obj: { ...q, label: qLabel(q) } }));
    if (st.mode === 'ytd') return Q.map((q) => { const y = ytdFor(q); return y ? { id: q.id, label: y.id, obj: { ...y, label: y.id, bs: q.bs, q: q.q } } : null; }).filter(Boolean);
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
  function fillSelects(preset) {
    const opts = periodOptions();
    const [a, b] = defaultPair(opts, preset);
    const mk = (sel, chosen) => { sel.innerHTML = opts.map((o) => `<option value="${o.id}"${chosen && o.id === chosen.id ? ' selected' : ''}>${o.label}</option>`).join(''); };
    if (!st.a || !opts.find((o) => o.id === st.a) || preset) st.a = a && a.id;
    if (!st.b || !opts.find((o) => o.id === st.b) || preset) st.b = b && b.id;
    mk(el('selA'), opts.find((o) => o.id === st.a)); mk(el('selB'), opts.find((o) => o.id === st.b));
  }
  function convert(v, def, obj) {
    if (v == null) return null;
    if (def.pct || def.perShare) return v;
    if (!st.usd) return v;
    const rate = st.stmt === 'bs' ? (obj.fxEop || fxAt(obj.bs && obj.bsDate || qEndDate(obj)) ) : ((obj.fxAvg && obj.fxAvg.rate) || avgFx(obj));
    return rate ? v / rate : null;
  }
  function avgFx(obj) { // average USD/MXN over the period from FRED
    const end = obj.q ? qEndDate(obj) : `${obj.fy}-12-31`;
    const months = obj.months || (obj.q && st.mode === 'q' ? 3 : st.mode === 'ltm' ? 12 : st.mode === 'fy' ? 12 : obj.q * 3);
    const start = addDays(end, -30 * months);
    const pts = fxPts.filter((p) => p[0] > start && p[0] <= end);
    return pts.length ? pts.reduce((a, p) => a + p[1], 0) / pts.length : null;
  }
  function yoyCommentsFor(A, B) {
    if (!A || !B) return null;
    const yoy = st.mode === 'q' ? (B.fy === A.fy - 1 && B.q === A.q) : st.mode === 'ytd' ? (B.fy === A.fy - 1 && B.months === A.months) : st.mode === 'fy' ? (B.fy === A.fy - 1) : false;
    const ck = st.mode === 'q' ? A.id : st.mode === 'ytd' ? `${A.fy}M${A.months}` : st.mode === 'fy' ? A.id : null;
    return yoy && ck && CM.periods && CM.periods[ck] ? CM.periods[ck] : null;
  }
  function renderStatements() {
    const opts = periodOptions();
    const A = (opts.find((o) => o.id === st.a) || {}).obj, B = (opts.find((o) => o.id === st.b) || {}).obj;
    const layout = FIN.layout[st.stmt] || [];
    const key = st.stmt;
    const get = (obj, def) => { if (!obj || !obj[key]) return null; let v = obj[key][def.k]; if (v == null) return null; return convert(v, def, obj); };
    // Comments apply to year-over-year comparisons only (quarter vs same quarter, YTD vs prior YTD, FY vs FY).
    const C = key === 'is' ? yoyCommentsFor(A, B) : null;
    const withCmt = key === 'is';
    // Collapsible groups on the income statement: the cost-of-services detail, and the lines between net
    // income and comprehensive income attributable to the controlling interest.
    const OCI = new Set(); if (key === 'is') { let on = false; for (const d of layout) { if (d.k === 'comprehensiveControlling') on = false; if (on) OCI.add(d.k); if (d.k === 'netIncome') on = true; } }
    const grpRow = (g, label, count) => `<tr class="grp-head"><td data-g="${g}"><span class="grp">${st.open[g] ? '▾' : '▸'}</span>${label}<span class="cnt">${count} ${t('items')}</span></td><td></td><td></td><td></td><td></td>${withCmt ? '<td class="cmt"></td>' : ''}</tr>`;
    const rows = [];
    let inCos = false, ociDone = false;
    for (const def of layout) {
      if (st.exIfric && def.ifric) continue;
      if (key === 'is') {
        if (inCos && def.level !== 2) inCos = false;
        if (OCI.has(def.k)) {
          if (!ociDone) { ociDone = true; rows.push(grpRow('oci', t('ociGroup'), [...OCI].filter((k) => layout.find((d) => d.k === k && !(st.exIfric && d.ifric))).length)); }
          if (!st.open.oci) continue;
        }
        if (inCos && !st.open.cos) continue;
      }
      let va = get(A, def), vb = get(B, def);
      if (st.exIfric && st.stmt === 'is' && (def.k === 'revTotal' || def.k === 'totalOpCosts')) {
        const adj = (obj, v) => (v == null || !obj || !obj.is ? v : v - convert(obj.is.revConstruction || 0, def, obj));
        va = adj(A, va); vb = adj(B, vb);
      }
      if (va == null && vb == null) continue;
      const d = va != null && vb != null ? va - vb : null;
      const pct = d != null && vb ? 100 * d / Math.abs(vb) : null;
      const isPct = def.pct, isPs = def.perShare;
      const f = (v) => (v == null ? '—' : isPct ? fmtPct(v) : isPs ? fmtN(v, 2) : fmtM(v, st.usd ? 1 : 0));
      const fd = d == null ? '—' : isPct ? fmtN(d, 1) + ' pp' : isPs ? fmtN(d, 2) : fmtM(d, st.usd ? 1 : 0);
      const isCosHead = key === 'is' && def.k === 'costServices';
      if (isCosHead) inCos = true;
      const cosCount = isCosHead ? layout.filter((d, i) => i > layout.indexOf(def) && d.level === 2 && layout.slice(layout.indexOf(def) + 1, i).every((x) => x.level === 2)).length : 0;
      const cmt = withCmt ? `<td class="cmt">${C && C.lines[def.k] ? L(C.lines[def.k]) : ''}</td>` : '';
      const first = isCosHead ? `<td data-g="cos"><span class="grp">${st.open.cos ? '▾' : '▸'}</span>${L(def)}<span class="cnt">${cosCount} ${t('items')}</span></td>` : `<td>${L(def)}${def.ifric ? ' <span class="muted small">IFRIC 12</span>' : ''}</td>`;
      rows.push(`<tr class="${isCosHead ? 'grp-head ' : ''}${def.level === 0 ? 'bold' : def.level === 2 ? 'sub2' : def.level === 1 ? 'sub' : ''}">${first}<td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${fd}</td><td class="${cls(pct)}">${isPct ? '' : fmtPct(pct, 1, true)}</td>${cmt}</tr>`);
    }
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('stmtTable', `<table class="stmt-table"><thead><tr><th>${t('line')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th>${withCmt ? `<th class="cmt">${t('comments')}</th>` : ''}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('stmtTitle').textContent = `${t(st.stmt)} · ${la} vs ${lb}`;
    const unit = st.usd ? t('usdM') : t('mxnM');
    el('stmtCap').textContent = `${unit}${st.stmt === 'is' ? ' · ' + (st.exIfric ? t('exIfric') : t('reported')) : ''}${st.usd ? (LANG === 'es' ? ' · convertido con el tipo de cambio promedio (flujos) o de cierre (balance) de la Fed H.10' : ' · converted at the Fed H.10 average (flows) or period-end (balance sheet) rate') : ''}${(A && A.derived) || (B && B.derived) ? (LANG === 'es' ? ' · periodos acumulados/UDM calculados a partir de trimestres reportados' : ' · YTD/LTM periods computed from reported quarters') : ''}`;
    if (withCmt) el('stmtCap').textContent += ' · ' + (C ? t('cmtNote') : t('cmtOnlyYoy'));
    const srcs = [A, B].filter(Boolean).map((o) => o.sources && o.sources[key === 'kpi' ? 'is' : key]).filter(Boolean);
    html('stmtSrc', `${t('src')}: ` + [...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${t('release')} (${fmtDate(s.date)})</a>`).join(' · ') + (C && C.call ? ' · ' + L(C.call) : ''));
    // meta line
    const first = Q[0], last = lastQ;
    html('stmtMeta', LANG === 'es'
      ? `Cobertura: ${Q.length} trimestres (${qLabel(first)} → ${qLabel(last)}), ${Y.length} años fiscales (${Y[0] ? 'FY' + Y[0].fy : ''} → ${Y.length ? 'FY' + Y[Y.length - 1].fy : ''}). Cifras en pesos nominales tal como las reporta GAP; miles convertidos a millones.`
      : `Coverage: ${Q.length} quarters (${qLabel(first)} → ${qLabel(last)}), ${Y.length} fiscal years (${Y[0] ? 'FY' + Y[0].fy : ''} → ${Y.length ? 'FY' + Y[Y.length - 1].fy : ''}). Nominal pesos as reported by GAP; thousands shown in millions.`);
    renderOps(); renderRevMix(); renderKpiTable();
  }
  // ---- Operating metrics: passengers from the monthly traffic reports (which tie to the quarterly
  // report's passenger total within rounding), unit revenues = income-statement revenue / passengers.
  const trByYm = Object.fromEntries(TR.months.map((m) => [m.ym, m]));
  function periodYms(obj) { // calendar months covered by a period object in the current mode
    const endM = st.mode === 'fy' ? 12 : (obj.q || 4) * 3;
    const n = st.mode === 'q' ? 3 : st.mode === 'ytd' ? (obj.months || endM) : 12;
    const out = []; for (let i = n - 1; i >= 0; i--) { let m = endM - i, y = obj.fy; while (m <= 0) { m += 12; y--; } out.push(`${y}-${String(m).padStart(2, '0')}`); } return out;
  }
  function opsFor(obj) {
    if (!obj) return null;
    const ms = periodYms(obj).map((ym) => trByYm[ym]);
    const full = ms.length > 0 && ms.every(Boolean);
    const sum = (f) => (full ? ms.reduce((a, m) => a + (f(m) || 0), 0) : null);
    const dom = sum((m) => m.dom && m.dom.TOTAL), intl = sum((m) => m.intl && m.intl.TOTAL);
    let total = sum((m) => m.total && m.total.TOTAL);
    let totalSrc = 'traffic';
    if (total == null && obj.kpi && obj.kpi.pax != null) { total = obj.kpi.pax; totalSrc = 'report'; } // pre-2018: only the reported total
    const cbx = full && ms.every((m) => m.cbx != null) ? ms.reduce((a, m) => a + m.cbx, 0) : null;
    const from = (REF.cbx && REF.cbx.consolidatedFrom) || null;
    const cons = from ? ms.filter((m) => m && m.ym >= from) : [];
    const cbxCons = cons.length && cons.every((m) => m.cbx != null) ? cons.reduce((a, m) => a + m.cbx, 0) : null;
    const is = obj.is || {};
    const per = (v, d) => (v != null && d ? v / d : null); // thousands of pesos / thousands of pax = pesos
    const kpi = obj.kpi || {};
    const cargo = kpi.cargoWlu != null ? kpi.cargoWlu : null;
    const wlu = kpi.wlu != null ? kpi.wlu : (kpi.pax != null && cargo != null ? kpi.pax + cargo : null);
    return {
      dom, intl, total, cbx, totalSrc, cargo, wlu,
      // GAP's Exhibit F definitions: reported passengers and WLUs (passengers + cargo units of 100 kg)
      revPerPaxGap: is.revAero != null && is.revNonAero != null ? per(is.revAero + is.revNonAero, kpi.pax) : null,
      aeroPerWlu: per(is.revAero, wlu), costPerWlu: per(is.costServices, wlu),
      aeroPerPax: per(is.revAero, total), nonAeroPerPax: per(is.revNonAero, total),
      // before consolidation, non-aero revenue already excludes CBX, so the ex-CBX figure is the same series
      nonAeroExCbxPerPax: is.revCbx != null ? per(is.revNonAero - is.revCbx, total) : (from && full && ms.every((m) => m.ym < from) ? per(is.revNonAero, total) : null),
      cbxPerUser: is.revCbx != null ? per(is.revCbx, cbxCons) : null,
      cbxConsMonths: cons.length,
    };
  }
  function renderOps() {
    const opts = periodOptions();
    const A = (opts.find((o) => o.id === st.a) || {}).obj, B = (opts.find((o) => o.id === st.b) || {}).obj;
    const oa = opsFor(A), ob = opsFor(B);
    const fxOf = (obj) => (obj ? (obj.fxAvg && obj.fxAvg.rate) || avgFx(obj) : null);
    const fxA = st.usd ? fxOf(A) : null, fxB = st.usd ? fxOf(B) : null;
    const C = yoyCommentsFor(A, B), ops = C && C.ops;
    const rows = [];
    const head = (label) => rows.push(`<tr class="head"><td colspan="6">${label}</td></tr>`);
    const row = (label, k, opt = {}) => {
      let va = oa ? oa[k] : null, vb = ob ? ob[k] : null;
      if (opt.money && st.usd) { va = va != null && fxA ? va / fxA : null; vb = vb != null && fxB ? vb / fxB : null; }
      if (va == null && vb == null) return;
      const d = va != null && vb != null ? va - vb : null;
      const pct = d != null && vb ? 100 * d / Math.abs(vb) : null;
      const dec = opt.money ? (st.usd ? 2 : 1) : 1;
      const f = (v) => (v == null ? '—' : fmtN(v, dec));
      rows.push(`<tr class="${opt.cls || ''}"><td>${label}</td><td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${d == null ? '—' : fmtN(d, dec)}</td><td class="${cls(pct)}">${fmtPct(pct, 1, true)}</td><td class="cmt">${ops && ops[k] ? L(ops[k]) : ''}</td></tr>`);
    };
    head(t('trafCargo'));
    row(t('domPax'), 'dom', { cls: 'sub' });
    row(t('intlPax'), 'intl', { cls: 'sub' });
    row(t('totalPax'), 'total', { cls: 'bold' });
    row(t('cbxUsers'), 'cbx');
    row(t('cargoWlu'), 'cargo');
    row(t('wluTotal'), 'wlu', { cls: 'bold' });
    head(`${t('unitRev')} (${st.usd ? 'US$' : 'Ps.'})`);
    row(t('aeroPerPax'), 'aeroPerPax', { money: true });
    row(t('nonAeroPerPax'), 'nonAeroPerPax', { money: true });
    if ([A, B].some((o) => o && o.is && o.is.revCbx != null)) row(t('nonAeroExCbx'), 'nonAeroExCbxPerPax', { money: true, cls: 'sub' }); // only once CBX is inside the reported figure
    row(t('cbxPerUser'), 'cbxPerUser', { money: true });
    row(t('revPerPaxGap'), 'revPerPaxGap', { money: true });
    row(t('aeroPerWlu'), 'aeroPerWlu', { money: true });
    row(t('costPerWlu'), 'costPerWlu', { money: true });
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('opsTable', `<table class="stmt-table"><thead><tr><th>${t('metric')}</th><th>${la}</th><th>${lb}</th><th>${t('change')}</th><th>${t('changePct')}</th><th class="cmt">${t('comments')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('opsTitle').textContent = `${t('ops')} · ${la} vs ${lb}`;
    const from = REF.cbx && REF.cbx.consolidatedFrom;
    const fromLabel = from ? new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1)).toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
    const partial = [oa, ob].some((o) => o && o.cbxPerUser != null && o.cbxConsMonths && o.cbxConsMonths < periodYms(o === oa ? A : B).length);
    const reportOnly = [oa, ob].some((o) => o && o.totalSrc === 'report');
    el('opsCap').textContent = LANG === 'es'
      ? `Pasajeros de los reportes mensuales de tráfico (los de Tijuana que usan CBX se clasifican como internacionales). Ingresos unitarios = ingresos del estado de resultados ÷ pasajeros del periodo${st.usd ? ', convertidos al tipo de cambio promedio de la Fed H.10' : ''}.${from ? ` Los ingresos de CBX se consolidan desde ${fromLabel} dentro de los no aeronáuticos; el ingreso por usuario de CBX divide entre los usuarios de los meses consolidados${partial ? ' (periodo parcial)' : ''}.` : ''}${reportOnly ? ' Antes de 2018 solo se dispone del total de pasajeros del informe trimestral.' : ''} Carga, WLU y los tres últimos renglones siguen el Exhibit F del informe trimestral (pasajeros y WLU reportados). ${C ? t('cmtNote') : t('cmtOnlyYoy')}`
      : `Passengers from the monthly traffic reports (Tijuana passengers using CBX are classified as international). Unit revenues = income-statement revenue ÷ passengers in the period${st.usd ? ', converted at the Fed H.10 average rate' : ''}.${from ? ` CBX revenue is consolidated from ${fromLabel} within non-aeronautical revenue; CBX revenue per user divides by users in the consolidated months only${partial ? ' (partial period)' : ''}.` : ''}${reportOnly ? ' Before 2018 only the quarterly report\'s passenger total is available.' : ''} Cargo, WLUs and the last three rows follow Exhibit F of the quarterly report (reported passengers and WLUs). ${C ? t('cmtNote') : t('cmtOnlyYoy')}`;
    const srcs = [];
    for (const obj of [A, B]) { if (!obj) continue; const last = periodYms(obj).map((ym) => trByYm[ym]).filter(Boolean).pop(); if (last && last.source) srcs.push({ url: last.source.url, label: LANG === 'es' ? 'reporte de tráfico' : 'traffic report', date: last.source.date }); if (obj.sources && obj.sources.is) srcs.push({ url: obj.sources.is.url, label: t('release'), date: obj.sources.is.date }); }
    html('opsNote', t('wluNote'));
    html('opsSrc', srcs.length ? `${t('src')}: ` + [...new Map(srcs.map((x) => [x.url, x])).values()].map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.label} (${fmtDate(x.date)})</a>`).join(' · ') + (C && C.call ? ' · ' + L(C.call) : '') : '');
  }
  function renderRevMix() {
    const qs = Q.slice(-12);
    const c = SERIES();
    const ds = [
      { label: t('aero'), data: qs.map((q) => q.is.revAero / 1000), backgroundColor: c[0], stack: 'r' },
      { label: t('nonAero'), data: qs.map((q) => q.is.revNonAero / 1000), backgroundColor: c[1], stack: 'r' },
    ];
    if (!st.exIfric) ds.push({ label: t('ifric'), data: qs.map((q) => (q.is.revConstruction || 0) / 1000), backgroundColor: c[3], stack: 'r' });
    mkChart('chartRevMix', { type: 'bar', data: { labels: qs.map(qLabel), datasets: ds }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    mkChart('chartMargin', { type: 'line', data: { labels: qs.map(qLabel), datasets: [{ label: t('ebitdaMarginEx'), data: qs.map((q) => q.is.ebitdaMarginExIfric), borderColor: c[2], backgroundColor: c[2], pointRadius: 3, fill: false }] }, options: { plugins: { tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtPct(x.parsed.y)}` } }, legend: { display: true, position: 'top', align: 'end' } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' }, suggestedMin: 60, suggestedMax: 75 } } } });
    const src = qs[qs.length - 1] && qs[qs.length - 1].sources.is;
    html('revMixSrc', src ? `${t('src')}: <a href="${src.url}" target="_blank" rel="noopener">${t('release')} ↗</a>` : '');
  }
  function renderKpiTable() {
    const qs = Q.slice(-12);
    const yoy = (q, f) => { const p = qById[yoyQid(q)]; const a = f(q), b = p && f(p); return a != null && b ? 100 * (a / b - 1) : null; };
    const rowsDef = [
      { l: t('revenue') + ' ' + t('exIfric') + ' (Ps. M)', f: (q) => (q.is.revTotal - (q.is.revConstruction || 0)) / 1000, fmt: (v) => fmtN(v) },
      { l: 'EBITDA (Ps. M)', f: (q) => q.is.ebitda / 1000, fmt: (v) => fmtN(v) },
      { l: t('ebitdaMarginEx'), f: (q) => q.is.ebitdaMarginExIfric, fmt: (v) => fmtPct(v), noYoy: true },
      { l: t('netIncome') + ' (Ps. M)', f: (q) => q.is.netIncome / 1000, fmt: (v) => fmtN(v) },
      { l: t('pax'), f: (q) => q.kpi && q.kpi.pax, fmt: (v) => fmtN(v, 1) },
      { l: t('revPerPax'), f: (q) => q.kpi && q.kpi.revPerPax, fmt: (v) => fmtN(v, 1) },
      { l: t('cfo') + ' (Ps. M)', f: (q) => q.cf && q.cf.cfo != null ? q.cf.cfo / 1000 : null, fmt: (v) => fmtN(v) },
      { l: t('capex') + ' (Ps. M)', f: (q) => q.cf && q.cf.capex != null ? -q.cf.capex / 1000 : null, fmt: (v) => fmtN(v) },
    ];
    const head = `<tr><th>${t('metric')}</th>${qs.map((q) => `<th>${qLabel(q)}</th>`).join('')}</tr>`;
    const body = rowsDef.map((r) => `<tr><td>${r.l}</td>${qs.map((q) => { const v = r.f(q); const y = r.noYoy ? null : yoy(q, r.f); return `<td>${r.fmt(v)}${y != null ? `<br><span class="small ${cls(y)}">${fmtPct(y, 1, true)}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
    html('kpiTable', `<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  }

  // ================= 02 GUIDANCE =================
  // Management guidance vintages (data/guidance.js, parsed from the releases) against actual results.
  const GM = [
    { k: 'traffic', es: 'Tráfico de pasajeros', en: 'Passenger traffic', s: { es: 'Tráfico', en: 'Traffic' }, kind: 'growth' },
    { k: 'revAero', es: 'Ingresos aeronáuticos', en: 'Aeronautical revenue', s: { es: 'Aero', en: 'Aero' }, kind: 'growth' },
    { k: 'revNonAero', es: 'Ingresos no aeronáuticos', en: 'Non-aeronautical revenue', s: { es: 'No aero', en: 'Non-aero' }, kind: 'growth' },
    { k: 'revTotal', es: 'Ingresos totales (sin IFRIC 12)', en: 'Total revenue (ex-IFRIC 12)', s: { es: 'Ingresos', en: 'Revenue' }, kind: 'growth' },
    { k: 'ebitda', es: 'EBITDA', en: 'EBITDA', s: { es: 'EBITDA', en: 'EBITDA' }, kind: 'growth' },
    { k: 'ebitdaMargin', es: 'Margen EBITDA (sin IFRIC 12)', en: 'EBITDA margin (ex-IFRIC 12)', s: { es: 'Margen', en: 'Margin' }, kind: 'level' },
    { k: 'capex', es: 'Capex (Ps. millones)', en: 'Capex (Ps. million)', s: { es: 'Capex', en: 'Capex' }, kind: 'amount' },
  ];
  const GV = (GD.vintages || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const gs = { metric: 'traffic' };
  const gRange = (m, x) => { if (!x) return '—'; if (m.kind === 'amount') return fmtN(x.mxnM); const f = (v) => fmtN(v, Number.isInteger(v) ? 0 : 1) + '%'; if (x.mid != null) return `${f(x.mid)} ± ${fmtN(x.band, 0)}`; return `${f(x.lo)} ${LANG === 'es' ? 'a' : 'to'} ${f(x.hi)}`; };
  const gMid = (m, x) => (!x ? null : m.kind === 'amount' ? x.mxnM : (x.lo + x.hi) / 2);
  const gActualFmt = (m, v) => (v == null ? '—' : m.kind === 'amount' ? fmtN(v) : fmtPct(v, 1, m.kind === 'growth'));
  const gStatus = (m, x, v) => (x == null || v == null || m.kind === 'amount' ? null : v > x.hi + 1e-9 ? 'above' : v < x.lo - 1e-9 ? 'below' : 'within');
  const gChip = (c, txt) => `<span class="guide-chip ${c || ''}">${txt}</span>`;
  const gLink = (v, label) => `<a href="${v.source.url}" target="_blank" rel="noopener">${label || fmtDate(v.date)}</a>`;
  function gGrowthSet(a, b) { // guidance basis: growth vs prior year; revenue and margin ex-IFRIC 12; capex in Ps. M
    const g = (x, y) => (x != null && y ? 100 * (x / y - 1) : null);
    const ex = (o) => (o.is && o.is.revTotal != null ? o.is.revTotal - (o.is.revConstruction || 0) : null);
    return { traffic: g(a.kpi && a.kpi.pax, b.kpi && b.kpi.pax), revAero: g(a.is.revAero, b.is.revAero), revNonAero: g(a.is.revNonAero, b.is.revNonAero), revTotal: g(ex(a), ex(b)), ebitda: g(a.is.ebitda, b.is.ebitda), ebitdaMargin: a.is.ebitda != null && ex(a) ? 100 * a.is.ebitda / ex(a) : null, capex: a.cf && a.cf.capex != null ? -a.cf.capex / 1000 : null };
  }
  function gActual(fy) { // closed year: FY vs FY−1; open year: quarters reported so far vs the same quarters a year earlier
    const y = Y.find((x) => x.fy === fy), p = Y.find((x) => x.fy === fy - 1);
    if (y && p && y.is && p.is) return { kind: 'fy', label: 'FY' + fy, v: gGrowthSet(y, p) };
    const qs = Q.filter((q) => q.fy === fy && q.is), pq = qs.map((q) => qById[`${fy - 1}Q${q.q}`]);
    if (!qs.length || pq.some((x) => !x || !x.is)) return null;
    const agg = (arr) => ({ is: sumParts(arr.map((q) => q.is)), cf: sumParts(arr.map((q) => q.cf)), kpi: sumParts(arr.map((q) => q.kpi)) });
    return { kind: 'ytd', months: qs.length * 3, label: ytdLabel(fy, qs.length * 3), v: gGrowthSet(agg(qs), agg(pq)) };
  }
  function renderGuidance() {
    if (!GV.length) { html('guideCurrent', `<p class="muted small">${t('na')}</p>`); return; }
    // ---- guidance in force for the latest guided year, every vintage of that year side by side, vs actuals
    const fy = Math.max(...GV.map((v) => v.fy));
    const cur = GV.filter((v) => v.fy === fy), last = cur[cur.length - 1];
    const act = gActual(fy), closed = !!(act && act.kind === 'fy');
    el('guideCurTitle').textContent = `${LANG === 'es' ? 'Guía' : 'Guidance'} FY${fy} · ${cur.length > 1 ? (LANG === 'es' ? 'revisada el ' : 'revised ') : (LANG === 'es' ? 'emitida el ' : 'issued ')}${fmtDate(last.date)}`;
    el('guideCurCap').textContent = !act ? (LANG === 'es' ? 'Aún no hay resultados reportados del año guiado.' : 'No results reported yet for the guided year.')
      : closed ? (LANG === 'es' ? `Año cerrado: resultado real FY${fy} frente a la última guía.` : `Closed year: actual FY${fy} versus the final guidance.`)
      : (LANG === 'es' ? `Seguimiento con el acumulado reportado (${act.label} vs ${ytdLabel(fy - 1, act.months)}); la guía es para el año completo, así que un acumulado fuera del rango no implica un incumplimiento.` : `Tracked against the reported year-to-date (${act.label} vs ${ytdLabel(fy - 1, act.months)}); guidance is for the full year, so a year-to-date figure outside the range is not a miss in itself.`);
    const head = `<tr><th>${t('metric')}</th>${cur.map((v, i) => `<th>${i === 0 ? t('initial') : t('revised')}<span class="sub">${fmtDate(v.date)}</span></th>`).join('')}${cur.length > 1 ? `<th>${t('change')}</th>` : ''}<th>${t('actual')}${act ? `<span class="sub">${act.label}</span>` : ''}</th><th>${closed ? t('outcome') : t('tracking')}</th></tr>`;
    const rows = GM.map((m) => {
      const cells = cur.map((v) => `<td>${gRange(m, v.items[m.k])}</td>`).join('');
      let chg = '';
      if (cur.length > 1) { const a = gMid(m, cur[0].items[m.k]), b = gMid(m, last.items[m.k]); const d = a != null && b != null ? b - a : null; chg = `<td class="${cls(d)}">${d == null ? '—' : m.kind === 'amount' ? fmtN(d) : fmtN(d, 1) + ' pp'}</td>`; }
      const v = act ? act.v[m.k] : null, x = last.items[m.k];
      let stc = '';
      if (v != null && x) { if (m.kind === 'amount') stc = gChip('', `${fmtPct(100 * v / x.mxnM, 0)} ${closed ? (LANG === 'es' ? 'de la guía' : 'of guidance') : t('ofYear')}`); else { const sx = gStatus(m, x, v); stc = gChip(sx, t(sx)); } }
      return `<tr><td>${L(m)}</td>${cells}${chg}<td><b>${gActualFmt(m, v)}</b></td><td>${stc}</td></tr>`;
    });
    html('guideCurrent', `<table class="guide-table"><thead>${head}</thead><tbody>${rows.join('')}</tbody></table>`);
    const quotes = cur.flatMap((v) => [...(v.intro || []), ...(v.notes || [])].map((q) => `<p class="guide-quote">“${q}” <span class="muted small">— ${gLink(v)}</span></p>`));
    html('guideText', quotes.join('')); el('guideTextWrap').hidden = !quotes.length;
    html('guideCurSrc', `${t('src')}: ` + cur.map((v) => gLink(v, `${t('gapRelease')} (${fmtDate(v.date)})`)).join(' · '));

    // ---- six-quarter history: the guidance in force after each quarter's report, with what changed
    const rq = Q.filter((q) => q.sources && q.sources.is && q.sources.is.date);
    const qs = rq.slice(-6), before = rq[rq.length - 7] || null;
    const relDate = (q) => q.sources.is.date;
    const inForce = (date) => { let v = null; for (const x of GV) if (x.date <= date) v = x; return v; };
    const cols = qs.map((q, i) => { const from = i ? relDate(qs[i - 1]) : (before ? relDate(before) : '0000-00-00'); return { q, v: inForce(relDate(q)), events: GV.filter((x) => x.date > from && x.date <= relDate(q)) }; });
    const prevOf = (i) => (i ? cols[i - 1].v : before ? inForce(relDate(before)) : null);
    const hHead = `<tr><th>${t('metric')}</th>${cols.map((c) => `<th>${qLabel(c.q)}<span class="sub">${fmtDate(relDate(c.q))}</span></th>`).join('')}</tr>`;
    const rFy = `<tr class="bold"><td>${t('guideFy')}</td>${cols.map((c, i) => `<td class="${c.v && prevOf(i) && c.v.fy !== prevOf(i).fy ? 'chg' : ''}">${c.v ? 'FY' + c.v.fy : '—'}</td>`).join('')}</tr>`;
    const rSt = `<tr><td>${t('guideStatus')}</td>${cols.map((c) => `<td>${c.events.length ? c.events.map((e) => gChip('event', `${e.kind === 'revised' ? t('revised') : t('issued')} · ${fmtDate(e.date)}`) + (e.quarter ? '' : `<span class="sub">${t('standalone')}</span>`)).join('<br>') : gChip('', t('unchanged')) + (c.v ? `<span class="sub">${LANG === 'es' ? 'desde' : 'since'} ${fmtDate(c.v.date)}</span>` : '')}</td>`).join('')}</tr>`;
    const rM = GM.map((m) => `<tr><td>${L(m)}</td>${cols.map((c, i) => { const now = c.v && c.v.items[m.k], p = prevOf(i), was = p && p.items[m.k]; const sameFy = c.v && p && c.v.fy === p.fy; const changed = c.v && p && (!sameFy || JSON.stringify(now) !== JSON.stringify(was)); return `<td class="${changed ? 'chg' : ''}">${gRange(m, now)}${changed && sameFy && was ? `<span class="was">${gRange(m, was)}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
    html('guideHistory', `<table class="guide-table"><thead>${hHead}</thead><tbody>${rFy}${rSt}${rM}</tbody></table>`);
    const ev = cols.flatMap((c) => c.events);
    html('guideHistSrc', ev.length ? `${t('src')}: ` + ev.map((v) => gLink(v, `${t('gapRelease')} (${fmtDate(v.date)})`)).join(' · ') : '');

    // ---- track record for closed years, against the final guidance of each year
    const fys = [...new Set(GV.map((v) => v.fy))].sort();
    const finalOf = (y) => GV.filter((v) => v.fy === y).pop();
    const closedFys = fys.filter((y) => { const a = gActual(y); return a && a.kind === 'fy'; });
    const rHead = `<tr><th>${t('year')}</th>${GM.map((m) => `<th>${L(m.s)}</th>`).join('')}<th>${t('hits')}</th></tr>`;
    const rRows = closedFys.map((y) => { const v = finalOf(y), a = gActual(y); let hit = 0, n = 0; const cells = GM.map((m) => { const x = v.items[m.k], val = a.v[m.k]; const sx = gStatus(m, x, val); if (sx) { n++; if (sx !== 'below') hit++; } return `<td class="${sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : ''}"><b>${gActualFmt(m, val)}</b><span class="sub">${LANG === 'es' ? 'guía' : 'guided'} ${gRange(m, x)}</span></td>`; }); return `<tr><td>FY${y}<span class="sub">${v.kind === 'revised' ? t('revised') : t('initial')} · ${fmtDate(v.date)}</span></td>${cells.join('')}<td><b>${hit}/${n}</b></td></tr>`; });
    html('guideRecord', `<table><thead>${rHead}</thead><tbody>${rRows.join('')}</tbody></table>`);

    // ---- every vintage
    const aHead = `<tr><th>${t('date')}</th><th>${t('year')}</th><th>${t('type')}</th>${GM.map((m) => `<th>${L(m.s)}</th>`).join('')}<th>${t('src')}</th></tr>`;
    const aRows = GV.slice().reverse().map((v) => { const qq = v.quarter ? (qById[v.quarter] || { fy: +v.quarter.slice(0, 4), q: +v.quarter.slice(5) }) : null; return `<tr><td>${fmtDate(v.date)}<span class="sub">${qq ? `${t('withResults')} ${qLabel(qq)}` : t('standalone')}</span></td><td>FY${v.fy}</td><td>${v.kind === 'revised' ? t('revised') : t('initial')}</td>${GM.map((m) => `<td>${gRange(m, v.items[m.k])}</td>`).join('')}<td>${gLink(v, '↗')}</td></tr>`; });
    html('guideAll', `<table><thead>${aHead}</thead><tbody>${aRows.join('')}</tbody></table>`);
    renderGuideChart();
  }
  function renderGuideChart() {
    const m = GM.find((x) => x.k === gs.metric); if (!m || !GV.length) return;
    const fys = [...new Set(GV.map((v) => v.fy))].sort();
    const firstOf = (y) => GV.find((v) => v.fy === y), finalOf = (y) => GV.filter((v) => v.fy === y).pop();
    const acts = fys.map((y) => gActual(y));
    const c = SERIES();
    const range = (x) => (!x ? null : m.kind === 'amount' ? x.mxnM : [x.lo, x.hi]);
    const ds = [
      { type: 'bar', label: LANG === 'es' ? 'Guía inicial' : 'Initial guidance', data: fys.map((y) => range(firstOf(y).items[m.k])), backgroundColor: c[3], borderWidth: 0, skipNull: true },
      { type: 'bar', label: LANG === 'es' ? 'Última revisión' : 'Latest revision', data: fys.map((y) => (finalOf(y) !== firstOf(y) ? range(finalOf(y).items[m.k]) : null)), backgroundColor: c[0], borderWidth: 0, skipNull: true },
      { type: 'line', label: t('actual'), data: fys.map((y, i) => (acts[i] ? acts[i].v[m.k] : null)), showLine: false, pointRadius: 6, pointHoverRadius: 7, pointStyle: fys.map((y, i) => (acts[i] && acts[i].kind === 'ytd' ? 'triangle' : 'circle')), borderColor: c[1], backgroundColor: c[1], pointBackgroundColor: c[1], pointBorderColor: c[1] },
    ];
    mkChart('chartGuide', { type: 'bar', data: { labels: fys.map((y) => 'FY' + y), datasets: ds }, options: {
      plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => { const raw = x.raw; if (Array.isArray(raw)) return `${x.dataset.label}: ${gRange(m, { lo: raw[0], hi: raw[1] })}`; const a = acts[x.dataIndex]; return `${x.dataset.label}${x.dataset.type === 'line' && a && a.kind === 'ytd' ? ` (${a.label})` : ''}: ${gActualFmt(m, raw)}`; } } } },
      scales: { x: { grid: { display: false } }, y: { ticks: m.kind === 'amount' ? { callback: (v) => fmtN(v) } : { callback: (v) => v + '%' }, beginAtZero: m.kind !== 'level' } },
      datasets: { bar: { maxBarThickness: 28 } },
    } });
    const lastV = GV[GV.length - 1];
    html('guideChartSrc', `${t('src')}: ${LANG === 'es' ? 'comunicados de GAP (guía) e informes trimestrales (real)' : 'GAP releases (guidance) and quarterly reports (actual)'} · ${gLink(lastV, `${LANG === 'es' ? 'última guía' : 'latest guidance'} ↗`)}`);
  }

  // ================= 02 TRAFFIC =================
  const tr = { freq: 'm', seg: 'total', airports: ['TOTAL'] };
  const AIR = (TR.airports && TR.airports.length ? TR.airports : (REF.airports || []));
  function trafficSeries() {
    // returns [{key, label, points:[[label, value, ym]]}] for selected airports at chosen freq/segment
    const months = TR.months.filter((m) => m.ym >= '2019-01');
    const bucket = (ym) => (tr.freq === 'm' ? ym : tr.freq === 'q' ? `${ym.slice(0, 4)}Q${Math.ceil(+ym.slice(5) / 3)}` : ym.slice(0, 4));
    const byB = {};
    for (const m of months) { const b = bucket(m.ym); (byB[b] ??= { keys: [], n: 0, months: [] }); byB[b].months.push(m); }
    const buckets = Object.keys(byB).sort();
    const complete = (b) => (tr.freq === 'm' ? true : tr.freq === 'q' ? byB[b].months.length === 3 : byB[b].months.length === 12);
    const label = (b) => (tr.freq === 'm' ? ymLabel(b) : tr.freq === 'q' ? (LANG === 'es' ? b.replace('Q', 'T').replace(/^(\d{4})T(\d)$/, '$2T' + b.slice(2, 4)) : `${b.slice(5)}Q${b.slice(2, 4)}`) : b);
    return tr.airports.map((code) => ({
      key: code, label: code === 'TOTAL' ? t('group') : (AIR.find((a) => a.code === code) || {})[LANG] || code,
      points: buckets.filter(complete).map((b) => { const vals = byB[b].months.map((m) => m[tr.seg][code]).filter((v) => v != null); return [label(b), vals.length ? vals.reduce((a, v) => a + v, 0) : null, b, true]; }),
    }));
  }
  function renderTraffic() {
    if (!TR.months.length) return;
    const chips = [{ code: 'TOTAL', label: t('group') }, ...AIR.map((a) => ({ code: a.code, label: `${a.code} · ${a[LANG] || a.en}` }))];
    const c = SERIES();
    html('airportChips', chips.map((ch) => { const i = tr.airports.indexOf(ch.code); return `<button type="button" class="chip${i >= 0 ? ' active' : ''}" data-code="${ch.code}">${i >= 0 ? `<span class="sw" style="background:${c[i % 8]}"></span>` : ''}${ch.label}</button>`; }).join(''));
    el('airportChips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { const code = b.dataset.code; const i = tr.airports.indexOf(code); if (i >= 0) { if (tr.airports.length > 1) tr.airports.splice(i, 1); } else if (tr.airports.length < 6) tr.airports.push(code); renderTraffic(); }));
    const series = trafficSeries();
    const labels = series[0] ? series[0].points.map((p) => p[0]) : [];
    const type = tr.freq === 'y' ? 'bar' : 'line';
    mkChart('chartTraffic', { type, data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.points.map((p) => p[1]), borderColor: c[i % 8], backgroundColor: type === 'bar' ? c[i % 8] : c[i % 8], fill: false, spanGaps: false })) },
      options: { plugins: { legend: { display: series.length > 1, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y, 1)} (${LANG === 'es' ? 'miles' : 'thousands'})` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 14, maxRotation: 0 } }, y: { ticks: axisM(), beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    el('trafficChartTitle').textContent = `${t(tr.seg)} · ${LANG === 'es' ? 'serie' : 'series'} ${t(tr.freq === 'm' ? 'monthly' : tr.freq === 'q' ? 'quarterly' : 'annual')}`;
    el('trafficChartCap').textContent = LANG === 'es' ? 'Miles de pasajeros terminales; periodos incompletos se omiten en la vista trimestral/anual' : 'Thousand terminal passengers; incomplete periods are omitted in the quarterly/annual view';
    // series table
    html('trafficSeriesTable', `<table><thead><tr><th>${t('period')}</th>${series.map((s) => `<th>${s.label}</th>`).join('')}</tr></thead><tbody>${labels.map((l, i) => `<tr><td>${l}</td>${series.map((s) => `<td>${fmtN(s.points[i][1], 1)}</td>`).join('')}</tr>`).reverse().slice(0, 60).join('')}</tbody></table>`);
    const lastM = TR.months[TR.months.length - 1];
    html('trafficSrc', `${t('src')}: <a href="${lastM.source.url}" target="_blank" rel="noopener">${LANG === 'es' ? 'reporte mensual de tráfico de GAP' : 'GAP monthly traffic report'} (${fmtDate(lastM.source.date)}) ↗</a>`);
    // latest-month table by airport
    const prev = TR.months.find((m) => m.ym === `${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
    const ytdOf = (ym, code) => TR.months.filter((m) => m.ym.slice(0, 4) === ym.slice(0, 4) && m.ym <= ym).reduce((a, m) => a + (m.total[code] || 0), 0);
    const rows = [...AIR.map((a) => a.code), 'TOTAL'].map((code) => {
      const v = lastM.total[code], p = prev && prev.total[code]; const y = ytdOf(lastM.ym, code), yp = prev ? ytdOf(prev.ym, code) : null;
      const name = code === 'TOTAL' ? t('total') : `${code} · ${(AIR.find((a) => a.code === code) || {})[LANG] || code}`;
      const yoy = p ? 100 * (v / p - 1) : null, yoyY = yp ? 100 * (y / yp - 1) : null;
      return `<tr class="${code === 'TOTAL' ? 'total' : ''}"><td>${name}</td><td>${fmtN(v, 1)}</td><td class="${cls(yoy)}">${fmtPct(yoy, 1, true)}</td><td>${fmtN(lastM.dom[code], 1)}</td><td>${fmtN(lastM.intl[code], 1)}</td><td>${fmtN(y, 1)}</td><td class="${cls(yoyY)}">${fmtPct(yoyY, 1, true)}</td><td>${fmtPct(100 * v / lastM.total.TOTAL, 1)}</td></tr>`;
    });
    html('trafficTable', `<table><thead><tr><th>${t('airport')}</th><th>${ymLabel(lastM.ym)}</th><th>${t('yoy')}</th><th>${t('dom')}</th><th>${t('intl')}</th><th>${t('ytdShort')} ${lastM.ym.slice(0, 4)}</th><th>${t('yoy')}</th><th>${t('share')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('trafficTblTitle').textContent = `${t('latestMonth')}: ${ymLabel(lastM.ym)}`;
    el('trafficTblCap').textContent = (LANG === 'es' ? 'Miles de pasajeros terminales por aeropuerto; CBX en Tijuana se clasifica como internacional' : 'Thousand terminal passengers by airport; CBX users at Tijuana count as international') + (lastM.cbx != null ? ` · CBX: ${fmtN(lastM.cbx, 1)}` : '');
    html('trafficMeta', LANG === 'es' ? `Cobertura mensual: ${ymLabel(TR.months[0].ym)} → ${ymLabel(lastM.ym)} (${TR.months.length} meses). Cifras preliminares publicadas cada mes; la vista por defecto empieza en 2019 para incluir la base prepandemia.` : `Monthly coverage: ${ymLabel(TR.months[0].ym)} → ${ymLabel(lastM.ym)} (${TR.months.length} months). Preliminary figures released monthly; the default view starts in 2019 to include the pre-pandemic base.`);
  }

  // ================= 03 SHARE PRICE =================
  const sh = { range: '3y', listing: 'GAPB.MX' };
  function rangeStart(pts) { const last = lastPoint(pts); if (!last) return null; const n = { '1y': 365, '3y': 365 * 3, '5y': 365 * 5 }[sh.range]; return n ? addDays(last[0], -n) : pts[0][0]; }
  function decimate(pts, max = 900) { if (pts.length <= max) return pts; const step = Math.ceil(pts.length / max); return pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
  function renderShare() {
    const pts = px(sh.listing); if (!pts.length) return;
    const start = rangeStart(pts); const win = pts.filter((p) => p[0] >= start);
    const c = SERIES(); const cur = win[win.length - 1];
    const meta = MK.prices[sh.listing];
    mkChart('chartPrice', { type: 'line', data: { datasets: [{ label: meta.name, data: decimate(win).map((p) => ({ x: p[0], y: p[1] })), borderColor: c[0], backgroundColor: c[0] + '1a', fill: true }] },
      options: { parsing: true, plugins: { tooltip: { callbacks: { title: (x) => fmtDate(x[0].raw.x), label: (x) => `${meta.currency} ${fmtN(x.parsed.y, 2)}` } } }, scales: { x: { type: 'category', ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i, ticks) => { const d = win[Math.round(i * (win.length - 1) / Math.max(1, ticks.length - 1))]; return d ? d[0].slice(0, 7) : ''; } }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    el('priceChartTitle').textContent = `${meta.name} · ${meta.currency}`;
    el('priceChartCap').textContent = `${t('close')} ${fmtDate(win[0][0])} → ${fmtDate(cur[0])}`;
    html('priceSrc', `${t('src')}: ${meta.source}${meta.error ? ' · ⚠ ' + meta.error : ''}`);
    // stats
    const yAgo = pointAtOrBefore(pts, addDays(cur[0], -365)); const yStart = pointAtOrBefore(pts, `${cur[0].slice(0, 4)}-01-01`);
    const w52 = pts.filter((p) => p[0] >= addDays(cur[0], -365)); const hi = Math.max(...w52.map((p) => p[1])), lo = Math.min(...w52.map((p) => p[1]));
    const stats = [
      { v: `${meta.currency} ${fmtN(cur[1], 2)}`, l: `${t('close')} ${fmtDate(cur[0])}` },
      { v: fmtPct(yStart ? 100 * (cur[1] / yStart[1] - 1) : null, 1, true), l: t('ytdChg'), c: cls(yStart ? cur[1] - yStart[1] : null) },
      { v: fmtPct(yAgo ? 100 * (cur[1] / yAgo[1] - 1) : null, 1, true), l: t('oneY'), c: cls(yAgo ? cur[1] - yAgo[1] : null) },
      { v: fmtN(hi, 2), l: t('high52') }, { v: fmtN(lo, 2), l: t('low52') },
    ];
    if (sh.listing === 'GAPB.MX' && sharesNow) { stats.push({ v: 'Ps. ' + fmtN(cur[1] * sharesNow / 1e9, 1) + (LANG === 'es' ? ' mil M' : ' bn'), l: t('mktCap') }); }
    html('shareStats', stats.map((s) => `<div class="stat"><div class="v ${s.c || ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join(''));
    // rebased
    const ids = ['GAPB.MX', '^MXX', 'ASURB.MX', 'OMAB.MX'];
    const base = rangeStart(gapPx);
    const series = ids.map((id) => ({ id, pts: px(id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
    const dates = series[0].pts.map((p) => p[0]);
    const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lastV = null; return { label: MK.prices[s.id].name, data: dates.map((d) => { const v = map.get(d); if (v != null) lastV = v; return lastV != null ? 100 * lastV / b : null; }), borderColor: c[i], backgroundColor: c[i], borderWidth: i === 0 ? 2.5 : 1.5 }; });
    const dec = (arr) => decimate(arr, 700);
    const idx = dec(dates.map((_, i) => i));
    mkChart('chartRebased', { type: 'line', data: { labels: idx.map((i) => dates[i]), datasets: ds.map((d) => ({ ...d, data: idx.map((i) => d.data[i]) })) },
      options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { title: (x) => fmtDate(x[0].label), label: (x) => `${x.dataset.label}: ${fmtN(x.parsed.y, 1)}` } } }, scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i) => (idx[i] != null ? dates[idx[i]].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    html('rebasedTable', `<table><thead><tr><th>${t('period')}: ${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}</th><th>${t('ret')}</th></tr></thead><tbody>${ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return `<tr><td>${d.label}</td><td class="${cls(last - 100)}">${fmtPct(last - 100, 1, true)}</td></tr>`; }).join('')}</tbody></table>`);
    html('rebasedSrc', `${t('src')}: Yahoo Finance (${LANG === 'es' ? 'cierres diarios' : 'daily closes'}) · ${LANG === 'es' ? 'precio, sin dividendos reinvertidos' : 'price only, dividends not reinvested'}`);
    html('shareMeta', LANG === 'es' ? `1 ADS (PAC) = ${REF.company ? REF.company.adsRatio : 10} acciones serie B. Acciones en circulación: ${fmtN(sharesNow)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}).` : `1 ADS (PAC) = ${REF.company ? REF.company.adsRatio : 10} series B shares. Shares outstanding: ${fmtN(sharesNow)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}).`);
  }

  // ================= 04 DCF =================
  const D = Object.assign({}, REF.dcf || {});
  const dcfState = {};
  // Beta: OLS slope of two years of weekly log returns, GAPB.MX on the IPC (^MXX), from market.js.
  function betaFromMarket() {
    const g = px('GAPB.MX'), m = px('^MXX'); if (g.length < 120 || m.length < 120) return null;
    const mm = new Map(m.map((p) => [p[0], p[1]]));
    const start = addDays(g[g.length - 1][0], -730);
    const wk = (d) => { const dt = new Date(d + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); return dt.toISOString().slice(0, 10); };
    const byWeek = new Map(); for (const p of g) if (p[0] >= start && mm.has(p[0])) byWeek.set(wk(p[0]), [p[1], mm.get(p[0])]);
    const pts = [...byWeek.values()]; if (pts.length < 60) return null;
    const rg = [], rm = []; for (let i = 1; i < pts.length; i++) { rg.push(Math.log(pts[i][0] / pts[i - 1][0])); rm.push(Math.log(pts[i][1] / pts[i - 1][1])); }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length; const ag = mean(rg), am = mean(rm);
    let cov = 0, vr = 0; for (let i = 0; i < rg.length; i++) { cov += (rg[i] - ag) * (rm[i] - am); vr += (rm[i] - am) ** 2; }
    return vr ? { beta: Math.round(100 * cov / vr) / 100, weeks: rg.length, from: pts.length ? [...byWeek.keys()][0] : null } : null;
  }
  // Pre-tax cost of debt: coupon of GAP's most recent fixed-rate bond in reference.js (kept current by the routine).
  function kdFromDebt() {
    const ins = (REF.debt && REF.debt.instruments) || [];
    const fixed = ins.map((x) => { const r = x.rate && (typeof x.rate === 'string' ? x.rate : x.rate.en); const m = typeof r === 'string' && r.match(/([\d.]+)\s*%\s*(fixed|fija)/i); return m ? { issued: x.issued || '', rate: +m[1], name: typeof x.name === 'string' ? x.name : L(x.name) } : null; }).filter(Boolean).sort((a, b) => a.issued.localeCompare(b.issued));
    return fixed.length ? fixed[fixed.length - 1] : null;
  }
  const BETA = betaFromMarket(), KD = kdFromDebt();
  function dcfDefaults() {
    const ltm = lastLTM && lastLTM.is ? lastLTM.is : {};
    const revEx = ltm.revTotal ? (ltm.revTotal - (ltm.revConstruction || 0)) / 1000 : 0; // Ps. M
    const paxLtm = lastLTM && lastLTM.kpi && lastLTM.kpi.pax ? lastLTM.kpi.pax : 0; // thousands
    const s = {
      baseRev: revEx, basePax: paxLtm, baseEbitda: ltm.ebitda ? ltm.ebitda / 1000 : 0, baseDa: ltm.da ? ltm.da / 1000 : 0,
      trafficG: (D.trafficGrowthPct || [2, 4, 4, 3.5, 3.5]).slice(), revPaxG: D.revPerPaxGrowthPct ?? 5,
      margin: D.ebitdaMarginPct ?? (ltm.ebitdaMarginExIfric ? Math.round(10 * ltm.ebitdaMarginExIfric) / 10 : 67), capex: (D.capexMxnM || [13000, 11000, 10000, 9000, 9000]).slice(),
      daPct: D.daPctRevenue ?? (revEx ? Math.round(1000 * (ltm.da / 1000) / revEx) / 10 : 9), tax: D.taxRatePct ?? 30, nwc: D.nwcPctDeltaRevenue ?? 5,
      rf: D.riskFreePct ?? (mx10.length ? mx10[mx10.length - 1][1] : 9.5), erp: D.erpPct ?? 5.5, beta: BETA ? BETA.beta : (D.beta ?? 0.9), kd: KD ? KD.rate : (D.costOfDebtPct ?? 10), dw: D.targetDebtPct ?? 20,
      method: D.terminalMethod || 'annuity', g: D.terminalGrowthPct ?? 3.5, mult: D.exitMultiple ?? 11, endYear: D.concessionEnd || 2048,
      baseYear: lastQ ? lastQ.fy : new Date().getFullYear(), stubFrac: lastQ ? (4 - lastQ.q) / 4 : 0.5,
    };
    return s;
  }
  function dcfInputsHtml(s) {
    const num = (k, step = 0.1, min, max) => `<input type="number" step="${step}" ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} data-k="${k}" value="${s[k]}">`;
    const row = (name, sub, ctl) => `<div class="inp"><div class="name">${name}${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;
    const years = Array.from({ length: 5 }, (_, i) => s.baseYear + 1 + i);
    const arr = (k, step) => `<div class="inp years"><div class="name">${k === 'trafficG' ? t('trafficG') + ' (%)' : 'Capex (Ps. M)'}</div><div class="row5">${years.map((y) => `<span>${y}</span>`).join('')}${s[k].map((v, i) => `<input type="number" step="${step}" data-k="${k}" data-i="${i}" value="${v}">`).join('')}</div></div>`;
    return `
      <h4>${LANG === 'es' ? 'Operación' : 'Operations'}</h4>
      ${arr('trafficG', 0.5)}
      ${row(LANG === 'es' ? 'Ingreso por pasajero, crecimiento anual (%)' : 'Revenue per passenger, annual growth (%)', LANG === 'es' ? 'tarifa máxima + inflación + comercial' : 'tariff + inflation + commercial', num('revPaxG', 0.5))}
      ${row(LANG === 'es' ? 'Margen EBITDA sin IFRIC 12 (%)' : 'EBITDA margin ex-IFRIC 12 (%)', LANG === 'es' ? `UDM: ${fmtPct(lastLTM && lastLTM.is ? lastLTM.is.ebitdaMarginExIfric : null)}` : `LTM: ${fmtPct(lastLTM && lastLTM.is ? lastLTM.is.ebitdaMarginExIfric : null)}`, num('margin', 0.5, 30, 90))}
      ${arr('capex', 500)}
      ${row(LANG === 'es' ? 'D&A (% de ingresos)' : 'D&A (% of revenue)', '', num('daPct', 0.5))}
      ${row(LANG === 'es' ? 'Tasa de impuestos (%)' : 'Tax rate (%)', '', num('tax', 1, 0, 60))}
      ${row(LANG === 'es' ? 'Δ capital de trabajo (% de Δ ingresos)' : 'Δ working capital (% of Δ revenue)', '', num('nwc', 1))}
      <h4>${LANG === 'es' ? 'Costo de capital' : 'Cost of capital'}</h4>
      ${row(LANG === 'es' ? 'Tasa libre de riesgo (%)' : 'Risk-free rate (%)', LANG === 'es' ? `Bono M 10 años (FRED/OCDE): ${mx10.length ? fmtPct(mx10[mx10.length - 1][1], 2) + ' ' + fmtDate(mx10[mx10.length - 1][0]) : 'n/d'}` : `MX 10-yr bond (FRED/OECD): ${mx10.length ? fmtPct(mx10[mx10.length - 1][1], 2) + ' ' + fmtDate(mx10[mx10.length - 1][0]) : 'n/a'}`, num('rf', 0.1))}
      ${row(LANG === 'es' ? 'Prima de riesgo de mercado (%)' : 'Equity risk premium (%)', '', num('erp', 0.25))}
      ${row('Beta', BETA ? (LANG === 'es' ? `calculada: ${BETA.weeks} rendimientos semanales GAPB vs IPC desde ${fmtDate(BETA.from)}` : `computed: ${BETA.weeks} weekly returns GAPB vs IPC since ${fmtDate(BETA.from)}`) : (LANG === 'es' ? 'supuesto de referencia' : 'reference default'), num('beta', 0.05))}
      ${row(LANG === 'es' ? 'Costo de deuda antes de impuestos (%)' : 'Pre-tax cost of debt (%)', KD ? (LANG === 'es' ? `${KD.name}: ${fmtPct(KD.rate, 2)} fija, último bono a tasa fija (${fmtDate(KD.issued)})` : `${KD.name}: ${fmtPct(KD.rate, 2)} fixed, latest fixed-rate bond (${fmtDate(KD.issued)})`) : '', num('kd', 0.1))}
      ${row(LANG === 'es' ? 'Deuda / (deuda + capital) (%)' : 'Debt / (debt + equity) (%)', '', num('dw', 1, 0, 90))}
      <h4>${t('tv')}</h4>
      ${row(LANG === 'es' ? 'Método' : 'Method', '', `<select data-k="method"><option value="annuity"${s.method === 'annuity' ? ' selected' : ''}>${LANG === 'es' ? 'Anualidad hasta ' + s.endYear : 'Annuity to ' + s.endYear}</option><option value="perpetuity"${s.method === 'perpetuity' ? ' selected' : ''}>${LANG === 'es' ? 'Perpetuidad (Gordon)' : 'Perpetuity (Gordon)'}</option><option value="multiple"${s.method === 'multiple' ? ' selected' : ''}>${LANG === 'es' ? 'Múltiplo de salida' : 'Exit multiple'}</option></select>`)}
      ${row(LANG === 'es' ? 'Crecimiento terminal (%)' : 'Terminal growth (%)', LANG === 'es' ? 'nominal, en pesos' : 'nominal, pesos', num('g', 0.25))}
      ${row(LANG === 'es' ? 'Múltiplo de salida VE/EBITDA' : 'Exit EV/EBITDA multiple', '', num('mult', 0.5))}
      ${row(LANG === 'es' ? 'Fin de concesión (año)' : 'Concession end (year)', LANG === 'es' ? 'México: 2048' : 'Mexico: 2048', num('endYear', 1, 2030, 2100))}
      <div style="margin-top:14px"><button type="button" class="btn" id="dcfReset">${LANG === 'es' ? 'Restablecer supuestos' : 'Reset assumptions'}</button></div>`;
  }
  function dcfCompute(s, over = {}) {
    const p = { ...s, ...over };
    const wacc = (1 - p.dw / 100) * (p.rf + p.beta * p.erp) / 100 + (p.dw / 100) * (p.kd / 100) * (1 - p.tax / 100);
    const rows = []; let rev = p.baseRev, pax = p.basePax; let pv = 0;
    for (let i = 0; i < 5; i++) {
      pax = pax * (1 + p.trafficG[i] / 100); rev = rev * (1 + p.trafficG[i] / 100) * (1 + p.revPaxG / 100);
      const ebitda = rev * p.margin / 100, da = rev * p.daPct / 100, ebit = ebitda - da, taxes = Math.max(0, ebit) * p.tax / 100;
      const prevRev = i === 0 ? p.baseRev : rows[i - 1].rev; const dnwc = (rev - prevRev) * p.nwc / 100; const capex = p.capex[i];
      const fcf = ebitda - taxes - capex - dnwc; const tt = i + 1; const df = 1 / Math.pow(1 + wacc, tt);
      pv += fcf * df; rows.push({ year: p.baseYear + 1 + i, pax, rev, ebitda, da, ebit, taxes, capex, dnwc, fcf, df, pv: fcf * df });
    }
    const last = rows[4]; const g = p.g / 100; let tv;
    if (p.method === 'multiple') tv = last.ebitda * p.mult;
    else if (p.method === 'perpetuity') tv = wacc > g ? last.fcf * (1 + g) / (wacc - g) : NaN;
    else { const n = Math.max(0, p.endYear - last.year); tv = wacc === g ? last.fcf * n : last.fcf * (1 + g) / (wacc - g) * (1 - Math.pow((1 + g) / (1 + wacc), n)); }
    const pvTv = tv * last.df; const ev = pv + pvTv;
    const nd = netDebt(lastQ); const netDebtM = nd ? nd.net / 1000 : 0; const nciM = lastQ && lastQ.bs && lastQ.bs.nci ? lastQ.bs.nci / 1000 : 0;
    const eq = ev - netDebtM - nciM; const perShare = sharesNow ? eq * 1e6 / sharesNow : null;
    return { wacc, rows, tv, pvTv, pvExplicit: pv, ev, netDebtM, nciM, eq, perShare, impliedMult: last.ebitda ? ev / (p.baseEbitda || last.ebitda) : null };
  }
  function renderDcf(reset) {
    if (reset || !dcfState.s) dcfState.s = dcfDefaults();
    const s = dcfState.s;
    const box = el('dcfInputs'); box.innerHTML = dcfInputsHtml(s);
    box.querySelectorAll('input,select').forEach((inp) => inp.addEventListener('input', () => { const k = inp.dataset.k; const v = inp.tagName === 'SELECT' ? inp.value : Number(inp.value); if (inp.dataset.i != null) s[k][+inp.dataset.i] = v; else s[k] = v; renderDcfOutputs(); }));
    el('dcfReset').addEventListener('click', () => renderDcf(true));
    renderDcfOutputs();
    html('dcfMeta', LANG === 'es' ? `Base: ingresos y EBITDA de los últimos doce meses al ${lastQ ? qLabel(lastQ) : '—'} (sin IFRIC 12); deuda neta y participación no controladora al cierre del mismo trimestre; ${fmtN(sharesNow)} acciones.` : `Base: last-twelve-month revenue and EBITDA at ${lastQ ? qLabel(lastQ) : '—'} (ex-IFRIC 12); net debt and non-controlling interest at the same quarter-end; ${fmtN(sharesNow)} shares.`);
  }
  function renderDcfOutputs() {
    const s = dcfState.s; const r = dcfCompute(s);
    const price = lastPx ? lastPx[1] : null;
    el('dcfHero').textContent = r.perShare != null && isFinite(r.perShare) ? 'Ps. ' + fmtN(r.perShare, 0) : '—';
    el('dcfHeroLbl').textContent = `${t('perShare')}${price && r.perShare ? ` · ${fmtPct(100 * (r.perShare / price - 1), 1, true)} ${t('upside')} (Ps. ${fmtN(price, 2)})` : ''}`;
    let implied = null;
    if (price && r.perShare != null) { // WACC at which the model returns the market price (bisection on the risk-free rate)
      let lo = -20, hi = 40; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; const v = dcfCompute(s, { rf: mid }).perShare; if (!isFinite(v) || v > price) lo = mid; else hi = mid; }
      implied = dcfCompute(s, { rf: (lo + hi) / 2 }).wacc;
    }
    const outs = [
      { v: fmtPct(100 * r.wacc, 2), l: t('wacc') + (implied != null && isFinite(implied) ? ` · ${LANG === 'es' ? 'implícito por el mercado' : 'market-implied'} ${fmtPct(100 * implied, 1)}` : '') },
      { v: 'Ps. ' + fmtN(r.ev / 1000, 1) + (LANG === 'es' ? ' mil M' : ' bn'), l: t('ev') },
      { v: 'Ps. ' + fmtN(r.eq / 1000, 1) + (LANG === 'es' ? ' mil M' : ' bn'), l: LANG === 'es' ? 'Valor del capital' : 'Equity value' },
      { v: fmtPct(100 * r.pvTv / r.ev, 0), l: LANG === 'es' ? 'VP del valor terminal / VE' : 'PV of terminal value / EV' },
      { v: fmtX(r.impliedMult), l: LANG === 'es' ? 'VE / EBITDA UDM implícito' : 'Implied EV / LTM EBITDA' },
      { v: 'Ps. ' + fmtN(r.netDebtM + r.nciM, 0) + ' M', l: LANG === 'es' ? 'Deuda neta + minoritarios' : 'Net debt + minorities' },
    ];
    html('dcfOutputs', outs.map((o) => `<div class="out"><div class="v">${o.v}</div><div class="l">${o.l}</div></div>`).join(''));
    html('dcfNote', LANG === 'es'
      ? `<b>Lectura.</b> El valor terminal se calcula por ${s.method === 'annuity' ? `anualidad de ${Math.max(0, s.endYear - r.rows[4].year)} años (flujo del año 5 creciendo ${fmtPct(s.g)} hasta ${s.endYear}), sin valor residual después del fin de la concesión` : s.method === 'perpetuity' ? 'perpetuidad de Gordon; sobreestima el valor de un activo con concesión finita' : `múltiplo de salida ${fmtX(s.mult)} sobre el EBITDA del año 5`}. Los flujos son a la firma, en pesos nominales; los impuestos se aplican sobre la utilidad operativa (EBITDA − D&amp;A). El capex sigue el perfil del PMD 2025–2029 y no genera ingreso IFRIC 12 en el modelo.`
      : `<b>Reading it.</b> The terminal value uses ${s.method === 'annuity' ? `a ${Math.max(0, s.endYear - r.rows[4].year)}-year annuity (year-5 cash flow growing ${fmtPct(s.g)} until ${s.endYear}) with no residual value after the concession ends` : s.method === 'perpetuity' ? 'a Gordon perpetuity, which overstates a finite-concession asset' : `a ${fmtX(s.mult)} exit multiple on year-5 EBITDA`}. Flows are to the firm in nominal pesos; taxes are charged on operating profit (EBITDA − D&amp;A). Capex follows the PMD 2025–2029 profile and generates no IFRIC 12 revenue in the model.`);
    const hdr = `<tr><th>${t('year')}</th>${r.rows.map((x) => `<th>${x.year}E</th>`).join('')}</tr>`;
    const line = (l, f, d = 0) => `<tr><td>${l}</td>${r.rows.map((x) => `<td>${fmtN(f(x), d)}</td>`).join('')}</tr>`;
    html('dcfTable', `<table><thead>${hdr}</thead><tbody>
      ${line(t('pax'), (x) => x.pax)}
      ${line(t('revenue') + ' ' + t('exIfric'), (x) => x.rev)}
      ${line('EBITDA', (x) => x.ebitda)}
      ${line('− D&A', (x) => -x.da)}
      ${line(LANG === 'es' ? '− Impuestos sobre EBIT' : '− Taxes on EBIT', (x) => -x.taxes)}
      ${line('− Capex', (x) => -x.capex)}
      ${line(LANG === 'es' ? '− Δ capital de trabajo' : '− Δ working capital', (x) => -x.dnwc)}
      <tr class="total"><td>${LANG === 'es' ? 'Flujo libre a la firma' : 'Unlevered free cash flow'}</td>${r.rows.map((x) => `<td>${fmtN(x.fcf)}</td>`).join('')}</tr>
      ${line(LANG === 'es' ? 'Factor de descuento' : 'Discount factor', (x) => x.df, 3)}
      ${line(t('pv'), (x) => x.pv)}
      <tr class="head"><td colspan="6">${t('tv')}: ${fmtN(r.tv)} · ${t('pv')}: ${fmtN(r.pvTv)} · ${LANG === 'es' ? 'VP flujos explícitos' : 'PV explicit flows'}: ${fmtN(r.pvExplicit)} · VE: ${fmtN(r.ev)}</td></tr></tbody></table>`);
    // sensitivity WACC x g (or multiple)
    const waccs = [-1, -0.5, 0, 0.5, 1].map((d) => r.wacc * 100 + d);
    const gs = s.method === 'multiple' ? [-2, -1, 0, 1, 2].map((d) => s.mult + d) : [-1, -0.5, 0, 0.5, 1].map((d) => s.g + d);
    const cell = (w, g) => { const over = s.method === 'multiple' ? { mult: g } : { g }; // solve for the rf that yields this wacc: shift rf by delta/(1-dw)
      const deltaW = w / 100 - r.wacc; over.rf = s.rf + 100 * deltaW / (1 - s.dw / 100); return dcfCompute(s, over).perShare; };
    html('dcfSens', `<table class="sens"><thead><tr><th>WACC ↓ / ${s.method === 'multiple' ? (LANG === 'es' ? 'múltiplo →' : 'multiple →') : 'g →'}</th>${gs.map((g) => `<th>${s.method === 'multiple' ? fmtX(g) : fmtPct(g, 2)}</th>`).join('')}</tr></thead><tbody>${waccs.map((w, i) => `<tr><td>${fmtPct(w, 2)}</td>${gs.map((g, j) => { const v = cell(w, g); const now = i === 2 && j === 2; const hi = price && v > price; return `<td class="center ${hi ? 'hi' : ''} ${now ? 'now' : ''}">${fmtN(v, 0)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`);
    el('sensCap').textContent = LANG === 'es' ? `Ps. por acción; sombreado = por encima del precio actual (Ps. ${fmtN(price, 2)}); recuadro = caso base` : `Ps. per share; shaded = above the current price (Ps. ${fmtN(price, 2)}); outlined = base case`;
  }

  // ================= 05 RELATIVE =================
  function renderRelative() {
    const nd = netDebt(lastQ); const ltm = lastLTM && lastLTM.is; const price = lastPx ? lastPx[1] : null;
    const rows = [];
    if (price && sharesNow && ltm) {
      const mcM = price * sharesNow / 1e6; const evM = nd ? mcM + nd.net / 1000 + (lastQ.bs.nci || 0) / 1000 : null;
      const revEx = (ltm.revTotal - (ltm.revConstruction || 0)) / 1000; const ni = (ltm.comprehensiveControlling || ltm.netIncome) / 1000;
      const dpsLatest = (REF.dividends || []).slice(-1)[0];
      const fcf = lastLTM.cf && lastLTM.cf.cfo != null && lastLTM.cf.capex != null ? (lastLTM.cf.cfo + lastLTM.cf.capex) / 1000 : null;
      rows.push([t('mktCap'), 'Ps. ' + fmtN(mcM, 0) + ' M', `${fmtN(sharesNow)} × Ps. ${fmtN(price, 2)}`]);
      if (evM != null) rows.push([t('ev'), 'Ps. ' + fmtN(evM, 0) + ' M', `${t('mktCap')} + ${t('nd')} ${fmtM(nd.net)} + NCI ${fmtM(lastQ.bs.nci || 0)}`]);
      if (evM != null) rows.push(['VE / EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), fmtX(evM / (ltm.ebitda / 1000)), `EBITDA ${fmtM(ltm.ebitda)} M`]);
      if (evM != null) rows.push(['VE / ' + (LANG === 'es' ? 'ingresos UDM sin IFRIC 12' : 'LTM revenue ex-IFRIC 12'), fmtX(evM / revEx), `${fmtN(revEx)} M`]);
      rows.push(['P / U ' + (LANG === 'es' ? 'UDM' : 'LTM'), fmtX(mcM / ni), `${LANG === 'es' ? 'utilidad integral controladora' : 'comprehensive income, controlling'} ${fmtN(ni)} M`]);
      if (fcf != null) rows.push([LANG === 'es' ? 'Rendimiento FCF (CFO − capex) / cap.' : 'FCF yield (CFO − capex) / mkt cap', fmtPct(100 * fcf / mcM), `${fmtN(fcf)} M`]);
      if (dpsLatest) rows.push([LANG === 'es' ? 'Rendimiento por dividendo' : 'Dividend yield', fmtPct(100 * dpsLatest.dps / price), `Ps. ${fmtN(dpsLatest.dps, 2)} ${t('agm')} ${dpsLatest.agmYear}`]);
      if (nd && ltm.ebitda) rows.push([t('lev'), fmtX(nd.net / ltm.ebitda, 2), nd.basis === 'bs' ? (LANG === 'es' ? 'balance del trimestre' : "quarter's balance sheet") : 'reference.js']);
      rows.push([t('ebitdaMarginEx'), fmtPct(ltm.ebitdaMarginExIfric), LANG === 'es' ? 'UDM' : 'LTM']);
    }
    html('multTable', `<table><thead><tr><th>${t('metric')}</th><th>${t('value')}</th><th>${t('basis')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td></tr>`).join('')}</tbody></table>`);
    el('multCap').textContent = lastPx ? `${t('price')} GAP B ${fmtDate(lastPx[0])} · ${LANG === 'es' ? 'estados financieros al' : 'financials as of'} ${lastQ ? qLabel(lastQ) : ''}` : '';
    // historical EV/EBITDA
    const hist = Q.slice(-12).map((q) => { const l = ltmFor(q); const p = pointAtOrBefore(gapPx, qEndDate(q)); const nd2 = netDebt(q); if (!l || !p || !nd2 || !l.is.ebitda) return null; const sh2 = (q.shares && q.shares.current) || sharesAt(qEndDate(q)); const ev = p[1] * sh2 / 1000 + nd2.net + (q.bs.nci || 0); return { q, v: ev / l.is.ebitda, est: nd2.basis === 'est', pe: l.is.comprehensiveControlling ? p[1] * sh2 / 1000 / l.is.comprehensiveControlling : null }; }).filter(Boolean);
    const c = SERIES();
    const alpha = (hex, a) => hex + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '');
    if (hist.length) mkChart('chartEvEbitda', { type: 'bar', data: { labels: hist.map((h) => qLabel(h.q)), datasets: [{ label: 'VE/EBITDA', data: hist.map((h) => h.v), backgroundColor: hist.map((h) => alpha(c[0], h.est ? 0.45 : 1)) }, { label: 'P/U', type: 'line', data: hist.map((h) => h.pe), borderColor: c[1], backgroundColor: c[1], pointRadius: 3 }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y)}${hist[x.dataIndex].est && x.dataset.label !== 'P/U' ? ' (' + estTag() + ')' : ''}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + 'x' }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('evSrc', LANG === 'es' ? `Cierre del trimestre × acciones vigentes + deuda neta + minoritarios, sobre EBITDA UDM; P/U sobre utilidad integral controladora UDM. Barras translúcidas: deuda neta estimada (véase la sección Deuda).` : `Quarter-end close × shares then outstanding + net debt + minorities, over LTM EBITDA; P/E on LTM comprehensive income to controlling interest. Translucent bars: estimated net debt (see the Debt section).`);
    // peers
    const cols = [['name', LANG === 'es' ? 'Empresa' : 'Company'], ['evEbitdaLtm', 'VE/EBITDA LTM'], ['evEbitdaNtm', 'VE/EBITDA NTM'], ['peLtm', 'P/U LTM'], ['peNtm', 'P/U NTM'], ['divYieldPct', LANG === 'es' ? 'Div. %' : 'Div. yield'], ['netDebtEbitda', 'DN/EBITDA'], ['ebitdaMarginPct', LANG === 'es' ? 'Margen EBITDA' : 'EBITDA margin']];
    const fmtCell = (k, v) => (v == null ? `<span class="muted">${t('na')}</span>` : /Pct/.test(k) ? fmtPct(v) : fmtX(v));
    const gapRow = price && sharesNow && ltm && nd ? { name: 'GAP (' + (LANG === 'es' ? 'calculado' : 'computed') + ')', evEbitdaLtm: (price * sharesNow / 1e6 + nd.net / 1000 + (lastQ.bs.nci || 0) / 1000) / (ltm.ebitda / 1000), peLtm: price * sharesNow / 1e6 / ((ltm.comprehensiveControlling || ltm.netIncome) / 1000), divYieldPct: (REF.dividends || []).length ? 100 * REF.dividends.slice(-1)[0].dps / price : null, netDebtEbitda: nd.net / ltm.ebitda, ebitdaMarginPct: ltm.ebitdaMarginExIfric } : null;
    const all = [gapRow, ...PEERS.peers].filter(Boolean);
    html('peersTable', `<table><thead><tr>${cols.map((c2) => `<th>${c2[1]}</th>`).join('')}</tr></thead><tbody>${all.map((p) => `<tr class="${p === gapRow ? 'bold' : ''}">${cols.map((c2) => `<td>${c2[0] === 'name' ? p.name : fmtCell(c2[0], p[c2[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    el('peersCap').textContent = PEERS.updatedAt ? `${t('src')}: ${PEERS.source} · ${fmtDate(PEERS.updatedAt)}` : `${t('pending')} · ${LANG === 'es' ? 'estructura lista en data/peers.js; autorice el conector FactSet para poblarla' : 'schema ready in data/peers.js; authorise the FactSet connector to populate it'}`;
  }

  // ================= 06 DEBT =================
  function renderDebt() {
    const qs = Q.slice(-12); const c = SERIES();
    const nds = qs.map((q) => ({ q, nd: netDebt(q), l: ltmFor(q) }));
    const est = nds.map((x) => x.nd && x.nd.basis === 'est');
    const tip = (x, v, d = 0) => `${x.dataset.label}: ${fmtN(v, d)}${est[x.dataIndex] ? ' (' + estTag() + ')' : ''}`;
    const alpha = (hex, a) => hex + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '');
    mkChart('chartNetDebt', { type: 'bar', data: { labels: qs.map(qLabel), datasets: [
      { label: t('grossDebt'), data: nds.map((x) => (x.nd ? x.nd.gross / 1000 : null)), backgroundColor: nds.map((_, i) => alpha(c[0], est[i] ? 0.45 : 1)), stack: 'a' },
      { label: '− ' + t('cash'), data: nds.map((x) => (x.q.bs && x.q.bs.cash != null ? -x.q.bs.cash / 1000 : null)), backgroundColor: c[2], stack: 'a' },
      { label: t('nd'), type: 'line', data: nds.map((x) => (x.nd ? x.nd.net / 1000 : null)), borderColor: c[7], backgroundColor: c[7], pointRadius: 3, spanGaps: true, segment: { borderDash: (ctx) => (est[ctx.p1DataIndex] ? [4, 4] : undefined) } }] },
      options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => tip(x, x.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { ticks: axisM() } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    mkChart('chartLeverage', { type: 'line', data: { labels: qs.map(qLabel), datasets: [{ label: t('lev'), data: nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null)), borderColor: c[1], backgroundColor: c[1], pointRadius: 3, spanGaps: true, segment: { borderDash: (ctx) => (est[ctx.p1DataIndex] ? [4, 4] : undefined) } }] }, options: { plugins: { legend: { display: true, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => tip(x, x.parsed.y, 2).replace(fmtN(x.parsed.y, 2), fmtX(x.parsed.y, 2)) } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + 'x' }, beginAtZero: true } } } });
    const firstBs = nds.find((x) => x.nd && x.nd.basis === 'bs');
    html('debtSrc', LANG === 'es'
      ? `Deuda bruta = préstamos bancarios + certificados bursátiles (corto y largo plazo) del balance publicado; efectivo del mismo balance. Sólido = balance detallado (desde ${firstBs ? qLabel(firstBs.q) : '—'}); <b>translúcido / punteado = estimación</b> obtenida restando a la deuda reportada los flujos de financiamiento de cada trimestre (emisiones y pagos de certificados y préstamos), sin revaluación cambiaria de la deuda en dólares ni intereses devengados. Sustituya las estimaciones con las cifras del reporte trimestral en PDF vía reference.js (debt.history).`
      : `Gross debt = bank loans + certificados bursátiles (current and long-term) from the published balance sheet; cash from the same balance sheet. Solid = itemised balance sheet (from ${firstBs ? qLabel(firstBs.q) : '—'}); <b>translucent / dashed = estimate</b> obtained by rolling reported debt back through each quarter's financing flows (bond and loan issues less repayments), ignoring FX revaluation of USD debt and accrued interest. Replace estimates with the PDF quarterly report figures via reference.js (debt.history).`);
    const D2 = REF.debt || {};
    const instr = (D2.instruments || []).map((i) => `<tr><td>${LS(i.name)}${i.note ? `<br><span class="muted small">${LS(i.note)}</span>` : ''}</td><td>${LS(i.type)}</td><td>${fmtDate(i.issued)}</td><td>${i.matures ? fmtDate(i.matures) : '—'}</td><td>${fmtN(i.principalMxn)}</td><td>${LS(i.rate) || '—'}</td></tr>`).join('');
    const ratings = (D2.ratings || []).map((r) => `<tr><td>${r.agency}</td><td colspan="4">${r.rating} (${LS(r.outlook)}) · ${LS(r.scope)}</td><td class="muted small">${LS(r.source)}</td></tr>`).join('');
    html('instrTable', `<table><thead><tr><th>${t('instrument')}</th><th>${LANG === 'es' ? 'Tipo' : 'Type'}</th><th>${LANG === 'es' ? 'Emisión' : 'Issued'}</th><th>${t('matures')}</th><th>${t('principal')}</th><th>${t('rate')}</th></tr></thead><tbody>${instr}<tr class="head"><td colspan="6">${t('rating')}</td></tr>${ratings}</tbody></table>`);
    el('instrCap').textContent = LANG === 'es' ? `Fuente: comunicados de GAP (reference.js, actualizado ${fmtDate(REF.updatedAt)})` : `Source: GAP releases (reference.js, updated ${fmtDate(REF.updatedAt)})`;
    html('instrNote', LS(D2.instrumentsNote));
  }

  // ================= 07 DIVIDENDS =================
  function renderDividends() {
    const divs = (MK.dividends && MK.dividends['GAPB.MX'] && MK.dividends['GAPB.MX'].points) || [];
    const byYear = {}; for (const [d, v] of divs) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + v;
    const lastYear = Math.max(...Object.keys(byYear).map(Number));
    const years = []; for (let y = 2015; y <= lastYear; y++) { years.push(String(y)); byYear[y] ??= 0; }
    const c = SERIES();
    mkChart('chartDps', { type: 'bar', data: { labels: years, datasets: [{ label: t('dps'), data: years.map((y) => byYear[y]), backgroundColor: c[0] }] }, options: { plugins: { tooltip: { callbacks: { label: (x) => 'Ps. ' + fmtN(x.parsed.y, 2) } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) }, beginAtZero: true } }, datasets: { bar: { maxBarThickness: 24, borderWidth: 0 } } } });
    html('dpsSrc', `${t('src')}: ${LANG === 'es' ? 'dividendos en efectivo por acción registrados en bolsa (Yahoo Finance, GAPB.MX), sumados por año de pago' : 'exchange-recorded cash dividends per share (Yahoo Finance, GAPB.MX), summed by payment year'}`);
    const rows = years.map((y) => { const fy = Y.find((yy) => yy.fy === +y); const ni = fy && fy.is ? (fy.is.comprehensiveControlling || fy.is.netIncome) / 1000 : null; const sh2 = sharesAt(`${y}-12-31`); const eps = ni && sh2 ? ni * 1e6 / sh2 : null; const pEnd = pointAtOrBefore(gapPx, `${y}-12-31`);
      const cf = fy && fy.cf; const paid = cf ? -(cf.dividendsPaid || 0) / 1000 : null; const capred = cf && cf.capitalReduction != null ? -cf.capitalReduction / 1000 : 0; const buy = cf && cf.buybacks != null ? -cf.buybacks / 1000 : 0;
      const dist = paid != null ? paid + capred + buy : null;
      return `<tr><td>${y}</td><td>${fmtN(byYear[y], 2)}</td><td>${paid != null ? fmtN(paid) : '—'}</td><td>${paid != null ? fmtN(capred) : '—'}</td><td>${paid != null ? fmtN(buy) : '—'}</td><td>${dist != null ? fmtN(dist) : '—'}</td><td>${eps ? fmtPct(100 * byYear[y] / eps, 0) : '—'}</td><td>${pEnd && byYear[y] ? fmtPct(100 * byYear[y] / pEnd[1]) : '—'}</td></tr>`; });
    html('dpsTable', `<table><thead><tr><th>${LANG === 'es' ? 'Año' : 'Year'}</th><th>${t('dps')}</th><th>${LANG === 'es' ? 'Dividendos (Ps. M)' : 'Dividends (Ps. M)'}</th><th>${LANG === 'es' ? 'Reembolsos de capital' : 'Capital reductions'}</th><th>${LANG === 'es' ? 'Recompras' : 'Buybacks'}</th><th>${LANG === 'es' ? 'Distribuciones' : 'Distributions'}</th><th>${t('payout')}</th><th>${t('yield')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('dpsCap').textContent = LANG === 'es' ? 'DPS = efectivo por acción registrado en bolsa (incluye reembolsos de capital, que GAP ha usado en lugar de dividendos en 2021 y 2024). Flujos en Ps. millones del estado de flujos anual. Razón de pago = DPS / utilidad por acción del año fiscal; rendimiento sobre el cierre del año.' : 'DPS = exchange-recorded cash per share (includes capital reductions, which GAP used instead of dividends in 2021 and 2024). Flows in Ps. million from the annual cash-flow statement. Payout = DPS / EPS of the fiscal year; yield on the year-end close.';
    const ag = (REF.dividends || []).map((d) => `<b>${t('agm')} ${d.agmYear}</b> (${fmtDate(d.agmDate)}): Ps. ${fmtN(d.dps, 2)} ${LANG === 'es' ? 'por acción' : 'per share'}. ${LS(d.note)} <span class="muted">(${LS(d.source)})</span>`).join('<br>') + `<br><span class="muted">${LANG === 'es' ? 'Los pagos del año en curso aparecen en la tabla cuando la bolsa los registra (Yahoo Finance); hasta entonces vea el importe aprobado arriba.' : 'Current-year instalments appear in the table once the exchange records them (Yahoo Finance); until then see the approved amount above.'}</span>`;
    html('dpsNote', ag);
  }

  // ================= 08 CBX / 09 FIBRA =================
  function renderCbx() {
    const C = REF.cbx || {};
    html('cbxTimeline', (C.timeline || []).map((e) => `<li><b>${fmtDate(e.date)}</b>${L(e)}</li>`).join(''));
    const fmtFact = (f) => (f.fmt === 'int' ? fmtN(f.v) : f.fmt === 'usdM' ? 'US$ ' + fmtN(f.v, 1) + ' M' : f.fmt === 'pct' ? fmtPct(100 * f.v) : f.fmt === 'M' ? fmtN(f.v, 1) + ' M' : fmtN(f.v));
    html('cbxFacts', (C.facts || []).map((f) => `<div class="fact"><div class="v">${fmtFact(f)}</div><div class="l">${LANG === 'es' ? f.label_es : f.label_en}${f.source ? ` · <span class="muted">${LS(f.source)}</span>` : ''}</div></div>`).join(''));
    html('cbxSrc', `${t('src')}: ${(LS(C.sources) || []).join(' · ')}`);
    const F2 = REF.fibra || {};
    const rows = [[LANG === 'es' ? 'Vehículo' : 'Vehicle', F2.name], [LANG === 'es' ? 'Clave' : 'Ticker', F2.ticker], [LANG === 'es' ? 'Bolsa' : 'Exchange', F2.exchange], [LANG === 'es' ? 'Monto objetivo' : 'Target size', 'Ps. ' + fmtN(F2.targetMxnM) + ' M'], ['CBFEs', fmtN(F2.certificates) + ' × Ps. ' + fmtN(F2.priceMxn)], [LANG === 'es' ? 'Participación en cada concesionaria' : 'Stake in each concessionaire', fmtPct(F2.stakePct)], [LANG === 'es' ? 'Uso de recursos' : 'Use of proceeds', LANG === 'es' ? 'Programa Maestro de Desarrollo 2025–2029 (> Ps. 52,000 M), principalmente Guadalajara' : 'Master Development Program 2025–2029 (> Ps. 52,000 M), mainly Guadalajara']];
    html('fibraTable', `<table><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1] || '—'}</td></tr>`).join('')}</tbody></table>`);
    html('fibraStatus', `<b>${LANG === 'es' ? 'Estatus' : 'Status'}.</b> ${LANG === 'es' ? F2.status_es : F2.status_en}`);
    html('fibraSrc', `${t('src')}: ${(LS(F2.sources) || []).join(' · ')}`);
  }

  // ================= 10 METHOD / SOURCES =================
  function renderMethod() {
    const rows = [
      [LANG === 'es' ? 'Estados financieros trimestrales, acumulados y anuales' : 'Quarterly, YTD and annual statements', LANG === 'es' ? 'días 6, 12, 18 y 24 de cada mes' : '6th, 12th, 18th, 24th monthly', LANG === 'es' ? 'GitHub Actions descarga los informes de GAP (GlobeNewswire), los convierte en tablas y valida cuadres antes de publicar' : 'GitHub Actions downloads GAP\'s reports (GlobeNewswire), parses the tables and validates tie-outs before publishing', fmtDate((FIN.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Tráfico mensual por aeropuerto' : 'Monthly traffic by airport', LANG === 'es' ? 'misma corrida' : 'same run', LANG === 'es' ? 'reporte mensual de tráfico (≈ día 5 de cada mes)' : 'monthly traffic report (≈ 5th of each month)', fmtDate((TR.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Guía de la administración' : 'Management guidance', LANG === 'es' ? 'misma corrida' : 'same run', LANG === 'es' ? 'tabla de guía en los comunicados (enero, 4T, revisiones)' : 'guidance table in the releases (January, 4Q, revisions)', fmtDate((GD.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Comentarios del estado de resultados' : 'Income-statement comments', LANG === 'es' ? 'por trimestre (borrador de la rutina, revisado)' : 'per quarter (drafted by the routine, reviewed)', 'data/comments.js', CM.updatedAt ? fmtDate(CM.updatedAt) : '—'],
      [LANG === 'es' ? 'Precios, dividendos, tipo de cambio, tasas' : 'Prices, dividends, FX, yields', LANG === 'es' ? 'diario, después del cierre de la BMV' : 'daily after the BMV close', 'Yahoo Finance · FRED (DEXMXUS, DGS10, IRLTLT01MXM156N)', fmtDate((MK.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Referencia: acciones, concesiones, deuda, CBX, FIBRA, supuestos DCF' : 'Reference: shares, concessions, debt, CBX, FIBRA, DCF defaults', LANG === 'es' ? 'por evento (PR revisado)' : 'event-driven (reviewed PR)', 'data/reference.js', fmtDate(REF.updatedAt)],
      [LANG === 'es' ? 'Múltiplos de pares' : 'Peer multiples', LANG === 'es' ? 'pendiente' : 'pending', 'FactSet → data/peers.js', PEERS.updatedAt ? fmtDate(PEERS.updatedAt) : '—'],
    ];
    html('refreshTable', `<table><thead><tr><th>${t('block')}</th><th>${t('cadence')}</th><th>${t('mechanism')}</th><th>${t('lastUpdate')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    const srcs = [
      { t: LANG === 'es' ? 'GAP — informes trimestrales y comunicados' : 'GAP — quarterly reports and releases', d: LANG === 'es' ? 'Distribuidos por GlobeNewswire y presentados como Form 6-K ante la SEC; base de todos los estados financieros y del tráfico.' : 'Distributed via GlobeNewswire and furnished as Form 6-K to the SEC; the basis of every statement and traffic figure.', u: 'https://www.globenewswire.com/search/keyword/Grupo%20Aeroportuario%20del%20Pacifico' },
      { t: 'SEC EDGAR — Grupo Aeroportuario del Pacífico (CIK 1347557)', d: LANG === 'es' ? 'Formas 20-F (anuales auditadas) y 6-K.' : 'Forms 20-F (audited annual) and 6-K.', u: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001347557' },
      { t: LANG === 'es' ? 'GAP — Relación con inversionistas' : 'GAP — Investor relations', d: LANG === 'es' ? 'Reportes trimestrales en PDF, eventos relevantes, asambleas, PMD y tarifas máximas.' : 'PDF quarterly reports, material events, shareholder meetings, PMD and maximum tariffs.', u: 'https://www.aeropuertosgap.com.mx/en/investors' },
      { t: 'Yahoo Finance', d: LANG === 'es' ? 'Cierres diarios GAPB.MX, PAC, ASURB.MX, OMAB.MX, ^MXX y dividendos en efectivo.' : 'Daily closes for GAPB.MX, PAC, ASURB.MX, OMAB.MX, ^MXX and cash dividends.', u: 'https://finance.yahoo.com/quote/GAPB.MX/' },
      { t: 'FRED — Federal Reserve Bank of St. Louis', d: 'USD/MXN (DEXMXUS), US 10-yr (DGS10), México 10-yr (IRLTLT01MXM156N, OECD).', u: 'https://fred.stlouisfed.org/series/DEXMXUS' },
      { t: LANG === 'es' ? 'BMV / BIVA — eventos relevantes' : 'BMV / BIVA — material events', d: LANG === 'es' ? 'Constitución de FIBRA GAP, emisiones de certificados bursátiles, asambleas.' : 'FIBRA GAP constitution, certificados bursátiles issuances, shareholder meetings.', u: 'https://www.bmv.com.mx/' },
    ];
    html('srcGrid', srcs.map((s) => `<div class="item"><div class="t"><a href="${s.u}" target="_blank" rel="noopener">${s.t} ↗</a></div><div class="d">${s.d}</div></div>`).join(''));
  }

  // ================= wiring =================
  function seg(id, onChange) { const box = el(id); if (!box) return; box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); onChange(b.dataset.v); })); }
  function renderAll() {
    chartDefaults();
    renderHeader(); renderStatements(); renderGuidance(); renderTraffic(); renderShare(); renderDcf(); renderRelative(); renderDebt(); renderDividends(); renderCbx(); renderMethod();
  }
  function setLang(lang) {
    LANG = lang;
    el('btnLangEs').classList.toggle('active', lang === 'es'); el('btnLangEn').classList.toggle('active', lang === 'en');
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es-MX' : 'en');
    document.querySelectorAll('.es').forEach((e) => { e.hidden = lang !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = lang !== 'en'; });
    try { localStorage.setItem('gap-lang', lang); } catch (e) { /* ignore */ }
    fillSelects(); renderAll();
  }
  el('btnLangEs').addEventListener('click', () => setLang('es')); el('btnLangEn').addEventListener('click', () => setLang('en'));
  el('stmtTable').addEventListener('click', (e) => { const g = e.target.closest('[data-g]'); if (g) { st.open[g.dataset.g] = !st.open[g.dataset.g]; renderStatements(); } });
  seg('segStmt', (v) => { st.stmt = v; renderStatements(); });
  seg('segMode', (v) => { st.mode = v; fillSelects('yoy'); renderStatements(); });
  seg('segPreset', (v) => { fillSelects(v); renderStatements(); });
  el('selA').addEventListener('change', (e) => { st.a = e.target.value; renderStatements(); });
  el('selB').addEventListener('change', (e) => { st.b = e.target.value; renderStatements(); });
  el('chkIfric').addEventListener('change', (e) => { st.exIfric = e.target.checked; renderStatements(); });
  el('chkUsd').addEventListener('change', (e) => { st.usd = e.target.checked; renderStatements(); });
  seg('segGuideMetric', (v) => { gs.metric = v; renderGuideChart(); });
  seg('segTrafFreq', (v) => { tr.freq = v; renderTraffic(); });
  seg('segTrafSeg', (v) => { tr.seg = v; renderTraffic(); });
  seg('segRange', (v) => { sh.range = v; renderShare(); });
  seg('segListing', (v) => { sh.listing = v; renderShare(); });
  // nav highlight
  const navLinks = [...document.querySelectorAll('nav.jump a')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((entries) => { entries.forEach((en) => { if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id)); }); }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s2) => io.observe(s2));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderAll());

  let initial = 'es'; try { initial = localStorage.getItem('gap-lang') || 'es'; } catch (e) { /* ignore */ }
  fillSelects('yoy');
  setLang(initial);
})();
