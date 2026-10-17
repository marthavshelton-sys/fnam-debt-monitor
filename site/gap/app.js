/* GAP interactive financial model — page logic.
   Data contracts (window.GAP_*) are documented in the model's runbook. Everything here is derived from
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
  const SUM = window.GAP_SUMMARY || { sections: [] };

  // ---------------- i18n ----------------
  let LANG = 'es';
  let PRINT = false; // print-as-presentation mode: light theme, trimmed tables, fixed-size charts
  const lastN = () => (PRINT ? 8 : 12); // quarters shown in the rolling tables and charts
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
    perShareNote: { es: 'Por acción: base de GAP = utilidad integral total (incluye la participación no controladora) ÷ acciones en circulación al cierre del periodo, la línea que GAP imprime; base controladora = utilidad integral de la participación controladora ÷ las mismas acciones. Por ADS (10 acciones) al tipo de cambio de cierre del periodo actual para ambas columnas, la convención de GAP para su columna comparativa.', en: 'Per share: GAP\'s basis = total comprehensive income (non-controlling interest included) ÷ shares outstanding at the period end, the line GAP prints; controlling basis = comprehensive income attributable to the controlling interest ÷ the same shares. Per ADS (10 shares) at the current period\'s closing exchange rate for both columns, GAP\'s own convention for its comparative column.' },
    nmNote: { es: 'n.s. = no significativo (cambio de signo o base cero).', en: 'n.m. = not meaningful (sign change or zero base).' },
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
  // Months print with the year in full ("Sep 2026", "sep 2026"; owner, 15-Oct-2026), never "Sep 26".
  // full month name and year ('September 2026' / 'septiembre de 2026'), capitalized, for the traffic table's group heading
  const ymLabelLong = (ym) => { const [y, m] = ym.split('-'); const d = new Date(Date.UTC(+y, +m - 1, 1)); const s = d.toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }); return s.charAt(0).toUpperCase() + s.slice(1); };
  const ymLabel = (ym) => { const [y, m] = ym.split('-'); const d = new Date(Date.UTC(+y, +m - 1, 1)); return d.toLocaleDateString(locale(), { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', ''); };
  const cls = (v) => (v == null || typeof v !== 'number' ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');
  // Year-over-year change of a line. "n.m." (not meaningful) when the sign flips or the base is zero: a fee that turns
  // into a reversal (−219%) or an expense that replaces an income (+787%) has no meaningful percentage (owner, 15-Oct-2026).
  const chgPct = (va, vb) => (va == null || vb == null ? null : vb === 0 || va * vb < 0 ? 'nm' : 100 * (va - vb) / Math.abs(vb));
  const fmtChgV = (p, d = 1) => (p == null ? '—' : p === 'nm' ? (LANG === 'es' ? 'n.s.' : 'n.m.') : fmtPct(p, d, true));
  const fmtChg = (va, vb, d = 1) => fmtChgV(chgPct(va, vb), d);
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
    if (q.q === 1) return { is: q.is, cf: q.cf, kpi: q.kpi, seg: q.seg, id: ytdLabel(q.fy, 3), sources: q.sources, fy: q.fy, months: 3, shares: q.shares, fxEop: q.fxEop, restated: q.restated && Object.fromEntries(Object.entries(q.restated).map(([k, v]) => [k.replace(/Q1$/, 'M3'), v])) };
    const y = ytdById[id];
    if (y && y.is) {
      let is = y.is;
      if (is.ebitda == null) { // the 6M/9M column of some releases omits EBITDA: take it from the quarters
        const qs = []; for (let i = 1; i <= q.q; i++) { const x = qById[`${q.fy}Q${i}`]; if (!x || !x.is || x.is.ebitda == null) { qs.length = 0; break; } qs.push(x); }
        if (qs.length) { const sm = fixRatios(sumParts(qs.map((x) => x.is))); is = { ...is }; for (const k of ['ebitda', 'ebitdaMargin', 'ebitdaMarginExIfric']) if (is[k] == null && sm[k] != null) is[k] = sm[k]; }
      }
      return { ...y, is, id: ytdLabel(q.fy, q.q * 3), shares: q.shares, fxEop: q.fxEop };
    }
    const qs = []; for (let i = 1; i <= q.q; i++) { const x = qById[`${q.fy}Q${i}`]; if (!x || !x.is) return null; qs.push(x); }
    return { id: ytdLabel(q.fy, q.q * 3), fy: q.fy, months: q.q * 3, is: fixRatios(sumParts(qs.map((x) => x.is))), cf: cashEnds(sumParts(qs.map((x) => x.cf)), qs[0], qs[qs.length - 1]), kpi: sumParts(qs.map((x) => x.kpi)), sources: q.sources, derived: true, shares: q.shares, fxEop: q.fxEop };
  }
  // Opening and closing cash of a cash-flow statement built from several periods are balances, not flows: the sum of the
  // periods' opening balances is meaningless, so a derived statement opens with the first period's opening cash and closes
  // with the last period's closing cash (the rolling-twelve-month cash flows of the deck appendix, 15-Oct-2026).
  function cashEnds(cf, first, last) {
    if (!cf) return cf;
    const o = { ...cf };
    if (first && first.cf && first.cf.cashBegin != null) o.cashBegin = first.cf.cashBegin; else delete o.cashBegin;
    if (last && last.cf && last.cf.cashEnd != null) o.cashEnd = last.cf.cashEnd; else delete o.cashEnd;
    return o;
  }
  // LTM for a quarter: sum of the last four quarters (or FY + YTD − prior YTD). With opts.restated each quarter is taken as
  // restated in the report of the same quarter a year later (cmpBase), so an LTM base compares like for like with the
  // current LTM, as GAP's own comparative columns do; quarters no later report restated stay as reported.
  function ltmFor(q, opts = {}) {
    const qs = []; let fy = q.fy, qq = q.q;
    for (let i = 0; i < 4; i++) { const x = qById[`${fy}Q${qq}`]; if (!x || !x.is) { qs.length = 0; break; } qs.push(x); qq--; if (qq === 0) { qq = 4; fy--; } }
    const ltmLabel = () => (LANG === 'es' ? 'UDM ' : 'LTM ') + qLabel(q);
    if (qs.length === 4) {
      const used = opts.restated ? qs.map((x) => { const nx = qById[`${x.fy + 1}Q${x.q}`]; return nx ? cmpBase(nx, x, 'q') : x; }) : qs;
      const restatedBy = used.filter((x) => x.restatedBy).map((x) => x.restatedBy.id);
      const is = fixRatios(sumParts(used.map((x) => x.is)));
      for (const k of ['netIncomeControlling', 'netIncomeNci']) if (!used.every((x) => x.is[k] != null)) delete is[k]; // a partial sum is no sum
      return { id: ltmLabel(), is, cf: cashEnds(sumParts(used.map((x) => x.cf)), used[3], used[0]), kpi: sumParts(used.map((x) => x.kpi)), bs: q.bs, shares: q.shares, fxEop: q.fxEop, sources: q.sources, derived: true, fy: q.fy, q: q.q, ltm: true, restatedQuarters: restatedBy.length ? restatedBy : null };
    }
    if (q.q === 4) { const y = Y.find((yy) => yy.fy === q.fy); if (y) return { id: ltmLabel(), is: y.is, cf: y.cf, kpi: y.kpi, bs: q.bs, shares: q.shares, fxEop: q.fxEop, sources: y.sources, fy: q.fy, q: 4, ltm: true }; }
    const fyPrev = Y.find((yy) => yy.fy === q.fy - 1), cur = ytdFor(q), prev = ytdById[`${q.fy - 1}M${q.q * 3}`];
    if (fyPrev && cur && prev && cur.is && prev.is) {
      const diff = (a, b, c) => { const o = {}; for (const k of Object.keys(a || {})) if (typeof a[k] === 'number' && b && c && typeof b[k] === 'number' && typeof c[k] === 'number') o[k] = a[k] + b[k] - c[k]; return o; };
      const cf = diff(fyPrev.cf, cur.cf, prev.cf); if (prev.cf && prev.cf.cashEnd != null) cf.cashBegin = prev.cf.cashEnd; else delete cf.cashBegin; if (cur.cf && cur.cf.cashEnd != null) cf.cashEnd = cur.cf.cashEnd; else delete cf.cashEnd;
      return { id: ltmLabel(), is: fixRatios(diff(fyPrev.is, cur.is, prev.is)), cf, kpi: diff(fyPrev.kpi, cur.kpi, prev.kpi), bs: q.bs, shares: q.shares, fxEop: q.fxEop, sources: q.sources, derived: true, fy: q.fy, q: q.q, ltm: true };
    }
    return null;
  }
  const lastLTM = lastQ ? ltmFor(lastQ) : null;

  // ---- The comparison base GAP itself prints. A later report restates its prior-year column when it reclassifies a
  // line (2Q25: Ps. 33.7 M moved from concession taxes to cost of services in the 2Q26 report), breaks a business out
  // (the cargo business in Exhibit A) or re-converts the per-ADS figures at the current period's exchange rate. The
  // builder keeps those restated figures (`restated`, keyed by the restating period); for a year-over-year comparison
  // the base period is read as restated in the current period's own report, so every change printed is GAP's own.
  function restatingId(A, mode) { return mode === 'q' ? A.id : mode === 'ytd' ? `${A.fy}M${A.months}` : mode === 'fy' ? `${A.fy}M12` : null; }
  function isYoy(A, B, mode) { return !!(A && B && (mode === 'q' ? (B.fy === A.fy - 1 && B.q === A.q) : mode === 'ytd' ? (B.fy === A.fy - 1 && B.months === A.months) : mode === 'fy' ? (B.fy === A.fy - 1) : false)); }
  function cmpBase(A, B, mode) {
    if (mode === 'ltm') { const bq = A && B && B.ltm && B.fy === A.fy - 1 && B.q === A.q ? qById[`${B.fy}Q${B.q}`] : null; return bq ? ltmFor(bq, { restated: true }) : B; }
    if (!isYoy(A, B, mode)) return B;
    const byId = restatingId(A, mode), r = B.restated && B.restated[byId]; if (!r) return B;
    const out = { ...B, restatedBy: { id: byId, source: r.source, keys: [] } };
    for (const part of ['is', 'cf', 'kpi', 'seg']) if (r[part]) { out[part] = { ...(B[part] || {}), ...r[part] }; out.restatedBy.keys.push(...Object.keys(r[part]).map((k) => `${part}.${k}`)); }
    return out;
  }
  // The prior-year balance sheet as the current report prints it (deck appendix, 15-Oct-2026): GAP's comparative column
  // (restated.bs, which the builder keeps where it differs from the period's own balance sheet) over the period's own
  // figures, limited to the lines the current balance sheet carries. The 2Q25 report's own balance sheet was condensed
  // (construction in progress inside concession improvements, the period's net income apart from retained earnings); the
  // 2Q26 report's June-2025 column itemizes both, so the comparison reads line for line.
  function bsBase(A, B) {
    if (!A || !A.bs || !B || !B.bs) return null;
    const rs = isYoy(A, B, 'q') && B.restated && B.restated[A.id], r = rs && rs.bs;
    const bs = {}; for (const k of Object.keys(A.bs)) { const v = r && r[k] != null ? r[k] : B.bs[k]; if (v != null) bs[k] = v; }
    return { bs, restatedBy: r ? { id: A.id, source: rs.source } : null };
  }
  // What a restatement changed, for the captions: the income-statement lines of `restatedBy` by label.
  function restatedNote(B) {
    if (B && B.restatedQuarters) return LANG === 'es' ? `${B.id} con cada trimestre reexpresado como en el informe del mismo trimestre un año después` : `${B.id} with each quarter as restated in the report of the same quarter a year later`;
    const rb = B && B.restatedBy; if (!rb) return '';
    const names = rb.keys.filter((k) => k.startsWith('is.')).map((k) => k.slice(3)).filter((k) => !['revCbx', 'costCbx'].includes(k)).map((k) => { const d = FIN.layout.is.find((x) => x.k === k); return d ? L(d).replace(/\s*\(.*\)$/, '') : k; });
    const who = qById[rb.id] ? qLabel(qById[rb.id]) : rb.id.replace(/^(\d{4})M12$/, 'FY$1').replace(/^(\d{4})M(\d+)$/, '$2M' + '$1'.slice(2));
    return LANG === 'es' ? `${B.label || B.id} como se reexpresa en el informe del ${who}${names.length ? ` (${names.join(', ')})` : ''}` : `${B.label || B.id} as restated in the ${who} report${names.length ? ` (${names.join(', ')})` : ''}`;
  }
  // ---- Per-share figures (owner, 15-Oct-2026). Two bases, both computed from the statements so a comparison always
  // converts both columns at the SAME exchange rate (the current period's), which is GAP's own convention for its
  // comparative column (2Q25 per ADS: US$2.1621 in its own report at the Jun-2025 rate, US$2.5349 in the 2Q26 report at
  // the Jun-2026 rate; the deck once printed 2.36 vs 2.16 and a wrong sign).
  //   gap:  GAP's printed basis — total comprehensive income (non-controlling interest included) ÷ shares outstanding at
  //         the period end (ties to the per-share line of every report, e.g. 4.4232 for 2Q25, 19.6980 for FY2024);
  //   ctrl: comprehensive income attributable to the controlling interest ÷ the same shares (FY2025 Ps. 17.09 vs 18.93).
  // Per ADS = per share × 10 ÷ the period-end rate; GAP uses the Fed noon buying rate (fxEop, read from the report's
  // footnote since 2Q25), earlier periods fall back to Banxico's FIX on the period end.
  const ADS = (REF.company && REF.company.adsRatio) || 10;
  // Report dates (owner, 15-Oct-2026: one convention everywhere): the day GAP filed the quarterly report with the BMV
  // (reference.js → filings.results, from the eventos relevantes) and, for a quarter without one on record, the date of
  // GAP's press release (the dateline); the label says which. A fiscal year reports with its fourth quarter.
  function reportDate(obj) {
    if (!obj) return null;
    const qid2 = obj.q && !obj.ltm && !obj.months ? obj.id : obj.fy && !obj.q ? `${obj.fy}Q4` : obj.ltm ? `${obj.fy}Q${obj.q}` : null;
    const f = qid2 && REF.filings && REF.filings.results && REF.filings.results[qid2];
    if (f && f.bmvDate) return { date: f.bmvDate, kind: 'bmv', id: f.bmvId || null };
    const d = obj.sources && obj.sources.is && obj.sources.is.date; return d ? { date: d, kind: 'release' } : null;
  }
  const reportKindLabel = (kind) => (LANG === 'es' ? (kind === 'bmv' ? 'BMV' : 'comunicado') : (kind === 'bmv' ? 'BMV' : 'press release'));
  const fmtReportDate = (obj, bare) => { const r = reportDate(obj); return !r ? '—' : bare ? fmtDate(r.date) : `${fmtDate(r.date)} · ${reportKindLabel(r.kind)}`; };
  // A guidance vintage issued with a quarterly report carries that report's date (same convention); a standalone one its release date.
  const guidanceDate = (v) => { if (!v) return null; const q = v.quarter && qById[v.quarter]; const r = q ? reportDate(q) : null; return r || { date: v.date, kind: 'release' }; };
  const fmtGuidanceDate = (v, bare) => { const r = guidanceDate(v); return !r ? '—' : bare ? fmtDate(r.date) : `${fmtDate(r.date)} · ${reportKindLabel(r.kind)}`; };
  const periodEnd = (obj) => (obj.q ? qEndDate(obj) : `${obj.fy}-12-31`);
  const periodStart = (obj) => (obj.ltm ? addDays(qEndDate({ fy: obj.fy - 1, q: obj.q }), 1) : obj.q && !obj.months ? `${obj.fy}-${String(obj.q * 3 - 2).padStart(2, '0')}-01` : `${obj.fy}-01-01`);
  const periodFx = (obj) => (obj ? obj.fxEop || fxAt(periodEnd(obj)) : null);
  // Time-weighted average of the shares outstanding between two dates (inclusive), from the share-count history in
  // reference.js (505,277,464 until the CBX/AMP merger of 7-May-2026, 595,018,195 from that day). GAP publishes only
  // period-end counts and no rolling-twelve-month figure, so the LTM per-share rows use this average (owner, 15-Oct-2026).
  function wavgShares(start, end) {
    const d0 = new Date(start + 'T12:00:00Z'), d1 = new Date(end + 'T12:00:00Z'); let n = 0, sum = 0;
    for (let d = new Date(d0); d <= d1; d.setUTCDate(d.getUTCDate() + 1)) { sum += sharesAt(d.toISOString().slice(0, 10)); n++; }
    return n ? sum / n : null;
  }
  // The note the LTM per-share rows carry (page caption and deck): the weighted counts of the two periods compared.
  function ltmShareNote(A, B) {
    const one = (o) => { if (!o || !o.ltm) return null; const p = perShare(o); return p ? `${o.id} ${fmtN(p.sh / 1e6, 1)} M` : null; };
    const parts = [one(A), one(B)].filter(Boolean); if (!parts.length) return '';
    const h = (REF.shares && REF.shares.history) || [], chg = h.length > 1 ? h[h.length - 1] : null;
    const hist = chg ? (LANG === 'es' ? ` (${fmtN(h[h.length - 2].total)} hasta el ${fmtDate(addDays(chg.asOf, -1))}, ${fmtN(chg.total)} desde el ${fmtDate(chg.asOf)})` : ` (${fmtN(h[h.length - 2].total)} to ${fmtDate(addDays(chg.asOf, -1))}, ${fmtN(chg.total)} from ${fmtDate(chg.asOf)})`) : '';
    return LANG === 'es' ? `Por acción de los doce meses móviles sobre el promedio ponderado por días de las acciones en circulación del periodo${hist}: ${parts.join(', ')}; GAP publica solo cifras al cierre de cada periodo y ninguna UDM.` : `Rolling-twelve-month per-share rows on the day-weighted average of the shares outstanding over the period${hist}: ${parts.join(', ')}; GAP publishes only period-end counts and no LTM figure.`;
  }
  function perShare(obj, fxRef) {
    if (!obj || !obj.is) return null;
    const shEnd = obj.shares && obj.shares.current; if (!shEnd) return null;
    const weighted = !!obj.ltm, sh = weighted ? wavgShares(periodStart(obj), periodEnd(obj)) : shEnd;
    const fx = fxRef || periodFx(obj), fxSrc = fxRef ? 'ref' : obj.fxEop ? 'fed' : 'fix';
    const per = (v) => (v != null ? v * 1000 / sh : null), ads = (v) => (v != null && fx ? v * ADS / fx : null);
    const gap = per(obj.is.comprehensiveIncome), ctrl = per(obj.is.comprehensiveControlling), eps = per(obj.is.netIncome), epsCtrl = per(obj.is.netIncomeControlling);
    return { gap, gapAds: ads(gap), ctrl, ctrlAds: ads(ctrl), eps, epsAds: ads(eps), epsCtrl, epsCtrlAds: ads(epsCtrl), sh, shEnd, weighted, fx, fxSrc, printed: { ps: obj.is.ciPerShare, ads: obj.is.ciPerAds } };
  }
  // The income-statement layout the page and the deck print: GAP's rows, with the two per-share rows computed on GAP's
  // basis and two more on the controlling-interest basis right after them.
  const PER_SHARE_ROWS = {
    ciPerShare: { es: 'Utilidad integral por acción (Ps.) · base de GAP', en: 'Comprehensive income per share (Ps.) · GAP\'s basis', f: 'gap' },
    ciPerAds: { es: 'Utilidad integral por ADS (US$) · base de GAP', en: 'Comprehensive income per ADS (US$) · GAP\'s basis', f: 'gapAds' },
    ciCtrlPerShare: { es: 'Utilidad integral de la participación controladora por acción (Ps.)', en: 'Comprehensive income attributable to controlling interest per share (Ps.)', f: 'ctrl' },
    ciCtrlPerAds: { es: 'Utilidad integral de la participación controladora por ADS (US$)', en: 'Comprehensive income attributable to controlling interest per ADS (US$)', f: 'ctrlAds' },
  };
  function isLayout() {
    const out = [];
    for (const d of FIN.layout.is) { out.push(d); if (d.k === 'ciPerAds') { out.push({ k: 'ciCtrlPerShare', level: 1, kpi: true, perShare: true, computed: true }); out.push({ k: 'ciCtrlPerAds', level: 1, kpi: true, perShare: true, computed: true }); } }
    return out;
  }
  const lineLabel = (def) => (PER_SHARE_ROWS[def.k] ? L(PER_SHARE_ROWS[def.k]) : L(def));
  // Value of an income-statement row for a period (fxRef: the current period's rate, so both columns of a comparison
  // convert per ADS at the same rate).
  function isValue(obj, def, fxRef) {
    if (!obj || !obj.is) return null;
    const ps = PER_SHARE_ROWS[def.k]; if (ps) { const p = perShare(obj, fxRef); return p ? p[ps.f] : null; }
    const v = obj.is[def.k]; return v == null ? null : v;
  }

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
  //  basis 'bs'  — itemized in the published balance sheet (bank loans + certificados bursátiles); from 2Q26.
  //  basis 'ref' — hand-curated in reference.js (debt.history) from the PDF quarterly report / 20-F.
  //  basis 'est' — rolled back from the nearest reported figure using the quarter's financing cash flows
  //                (bonds and loans issued less repaid); ignores FX revaluation of USD debt and accrued
  //                interest, so it is an estimate and is drawn as such.
  //  basis 'bs-restated' — itemized in the comparative column of a later report's balance sheet (the 2Q26 release prints the
  //                Jun-2025 bank loans and certificados its own release condensed); `restatedBy` names that report.
  //  basis 'ref' — reference.js → debt.history: the audited 20-F balance sheet (kind 'annual') or FactSet's standardized
  //                total debt from GAP's BMV quarterly report (kind 'factset'); `kind` and `source` are printed with the figure.
  const DEBT_ITEMS = ['bankLoansCurrent', 'bondsCurrent', 'bankLoansLT', 'bondsLT'];
  const DEBT = (() => {
    const out = {};
    const qs = FIN.quarters.filter((q) => q.bs);
    for (const q of qs) {
      const b = q.bs;
      const items = DEBT_ITEMS.filter((k) => b[k] != null);
      if (items.length) { const gross = items.reduce((a, k) => a + b[k], 0); out[q.id] = { gross, cash: b.cash, net: gross - b.cash, basis: 'bs' }; continue; }
      const rb = Object.entries(q.restated || {}).map(([byId, r]) => [byId, r.bs]).filter(([, bs]) => bs && DEBT_ITEMS.some((k) => bs[k] != null)).sort((x, y) => x[0].localeCompare(y[0]))[0];
      if (rb) { const gross = DEBT_ITEMS.reduce((a, k) => a + (rb[1][k] || 0), 0); out[q.id] = { gross, cash: b.cash, net: gross - b.cash, basis: 'bs-restated', restatedBy: rb[0] }; continue; }
      const h = ((REF.debt && REF.debt.history) || []).find((e) => e.q === q.id);
      if (h && h.grossDebtMxnM != null) out[q.id] = { gross: h.grossDebtMxnM * 1000, cash: b.cash, net: h.grossDebtMxnM * 1000 - b.cash, basis: 'ref', kind: h.kind || 'ref', source: h.source || null, sourceUrl: h.sourceUrl || null };
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
  // Where the gross debt of a set of quarters comes from: a letter per source (when more than one) and one note naming them.
  function debtSources(quarters) {
    const es = LANG === 'es', nds = quarters.map((q) => ({ q, nd: netDebt(q) }));
    const keyOf = (nd) => (nd.basis === 'bs' || nd.basis === 'bs-restated' ? 'bs' : nd.basis === 'ref' ? nd.kind || 'ref' : nd.basis);
    const restated = nds.filter((x) => x.nd && x.nd.basis === 'bs-restated').map((x) => { const by = qById[x.nd.restatedBy] || { fy: +x.nd.restatedBy.slice(0, 4), q: +x.nd.restatedBy.slice(5) }; return es ? `${qLabel(x.q)} en la columna comparativa del informe del ${qLabel(by)}` : `${qLabel(x.q)} in the comparative column of the ${qLabel(by)} report`; });
    const labels = {
      bs: es ? `balance de GAP en el informe trimestral${restated.length ? ` (${restated.join(', ')})` : ''}` : `GAP's balance sheet in the quarterly report${restated.length ? ` (${restated.join(', ')})` : ''}`,
      annual: es ? 'balance auditado de la Forma 20-F 2025 de GAP (préstamos bancarios, deuda a corto plazo y certificados; sin intereses devengados)' : "GAP's audited Form 20-F 2025 balance sheet (bank loans, current debt and debt securities; accrued interest excluded)",
      factset: es ? 'deuda total estandarizada por FactSet (FF_DEBT) a partir del informe trimestral de GAP en la BMV; incluye arrendamientos (Ps. 20–100 M) y excluye intereses devengados; pendiente de cotejar con el informe' : "FactSet's standardized total debt (FF_DEBT) from GAP's BMV quarterly report; includes lease liabilities (Ps. 20–100 M), excludes accrued interest; to be checked against the report itself",
      ref: es ? 'referencia' : 'reference', est: es ? 'estimación a partir de los flujos de financiamiento del trimestre' : "estimate from the quarter's financing flows",
    };
    const order = ['bs', 'annual', 'factset', 'ref', 'est'], used = order.filter((k) => nds.some((x) => x.nd && keyOf(x.nd) === k)), L = 'abcde';
    const letter = (nd) => { if (!nd || used.length < 2) return ''; const i = used.indexOf(keyOf(nd)); return i >= 0 ? ` ${L[i]}` : ''; };
    const note = used.map((k, i) => `${used.length > 1 ? L[i] + ' = ' : ''}${labels[k]}`).join('; ');
    return { letter, note, used, keyOf };
  }
  const estTag = () => (LANG === 'es' ? 'est.' : 'est.');

  // Title Case for every heading, in both languages (the owner's convention across the site).
  const TC_SMALL = { es: new Set(['a', 'al', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'e', 'el', 'en', 'entre', 'hacia', 'hasta', 'la', 'las', 'lo', 'los', 'mediante', 'ni', 'o', 'para', 'por', 'que', 'según', 'sin', 'sobre', 'tras', 'u', 'un', 'una', 'unas', 'unos', 'y', 'vs', 'vs.', 'a/a']),
    en: new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'vs.', 'with', 'over', 'onto', 'up', 'y/y', 'ex']) };
  function tc(str) {
    const small = TC_SMALL[LANG] || TC_SMALL.en, words = String(str).split(' ');
    return words.map((w, i) => {
      const core = w.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '');
      const hy = (x) => x.replace(/-([a-zà-ÿ])/g, (m, c) => (small.has(c) ? m : '-' + c.toUpperCase()));
      if (!w || !core || /[A-ZÀ-Þ]/.test(core) || /\d/.test(core)) return hy(w);
      if (i > 0 && i < words.length - 1 && small.has(core.toLowerCase()) && !(core.toLowerCase() === 'por' && /^qué/i.test(words[i + 1] || ''))) return w; // "por qué" is a question phrase, not a preposition
      return hy(w.replace(/^([^A-Za-zÀ-ÿ]*)([a-zà-ÿ])/, (m, pre, c) => pre + c.toUpperCase()));
    }).join(' ');
  }

  // English finance abbreviations in the English view (EV, P/E, ND); Spanish keeps VE, P/U, DN.
  const evL = () => (LANG === 'es' ? 'VE' : 'EV'), peL = () => (LANG === 'es' ? 'P/U' : 'P/E'), ndL = () => (LANG === 'es' ? 'DN' : 'ND');
  // Fetch time of the market file in Mexico City time, for the price stamp.
  const fmtTsCdmx = (iso) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleString(LANG === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' }).replace('.', '') + ' CDMX' : ''; };
  // Next results date: confirmed when the company announced it (REF.calendar.nextResults); otherwise assumed from the
  // median lag between quarter-end and release for the same quarter over the last three years. The deck reuses this.
  function nextResults() {
    if (!lastQ) return null;
    const nq = lastQ.q === 4 ? { fy: lastQ.fy + 1, q: 1 } : { fy: lastQ.fy, q: lastQ.q + 1 };
    const cal = REF.calendar && REF.calendar.nextResults, today = new Date().toISOString().slice(0, 10);
    if (cal && cal.date && cal.date >= today) return { q: nq, date: cal.date, kind: 'confirmed', source: cal.source || null };
    const dayOf = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
    // a quarter parsed from a later report's comparative columns carries that report's date, so it is skipped
    const relDate = (q) => q.releaseDate || (q.sources && q.sources.is && q.sources.is.primary !== false && q.sources.is.date);
    const lags = [], yrs = [];
    for (let y = nq.fy - 1; y >= nq.fy - 3; y--) { const q = qById[`${y}Q${nq.q}`]; if (q && relDate(q)) { lags.push(dayOf(relDate(q)) - dayOf(qEndDate(q))); yrs.push(y); } }
    if (!lags.length) return { q: nq, date: null, kind: 'unknown' };
    lags.sort((a, b) => a - b); const med = lags[Math.floor((lags.length - 1) / 2)];
    const d = new Date(qEndDate(nq) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + med);
    return { q: nq, date: d.toISOString().slice(0, 10), kind: 'assumed', years: [Math.min(...yrs), Math.max(...yrs)] };
  }
  // Text for the {{nextResults}} token in the executive summary, so the summary never hand-writes a date the deck disagrees with.
  // While GAP has not announced the date, a projection a data vendor publishes (REF.calendar.projected) is named beside the
  // assumption so the reader sees that the two are estimates and differ.
  function nextResultsText() {
    const n = nextResults(); if (!n || !n.date) return LANG === 'es' ? 'fecha por confirmar' : 'date to be confirmed';
    if (n.kind === 'confirmed') return `${fmtDate(n.date)}${LANG === 'es' ? ', confirmada' : ', confirmed'}`;
    const pj = REF.calendar && REF.calendar.projected;
    const tail = pj && pj.date && pj.date !== n.date ? (LANG === 'es' ? `; ${pj.source || 'FactSet'} proyecta ${fmtDate(pj.date)}` : `; ${pj.source || 'FactSet'} projects ${fmtDate(pj.date)}`) : '';
    return `≈${fmtDate(n.date)}${LANG === 'es' ? ', fecha supuesta, sin anunciar por GAP' : ', assumed, not yet announced by GAP'}${tail}`;
  }
  // Next monthly traffic report: the month after the latest one, on GAP's usual day (median day of the last twelve
  // releases). One rule for the page, the summary token and the deck (owner, 15-Oct-2026: one date everywhere).
  function nextTraffic() {
    const ms = TR.months; if (!ms.length) return null;
    const days = ms.slice(-12).map((m) => (m.source && m.source.date ? +m.source.date.slice(8, 10) : null)).filter(Boolean).sort((a, b) => a - b);
    const day = days.length ? days[Math.floor((days.length - 1) / 2)] : 5;
    const last = ms[ms.length - 1].ym; const y = +last.slice(0, 4), mo = +last.slice(5, 7);
    const dataMonth = new Date(Date.UTC(y, mo, 1)), rel = new Date(Date.UTC(y, mo + 1, day)); // data month = last + 1, released the month after that
    return { day, date: rel.toISOString().slice(0, 10), dataYm: dataMonth.toISOString().slice(0, 7), dataMonth: dataMonth.toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }), month: rel.toLocaleDateString(locale(), { month: 'long', timeZone: 'UTC' }) };
  }
  const nextTrafficText = () => { const n = nextTraffic(); return n ? (LANG === 'es' ? `hacia el ${fmtDate(n.date)}` : `around ${fmtDate(n.date)}`) : (LANG === 'es' ? 'fecha por confirmar' : 'date to be confirmed'); };
  // Market tokens for the curated summary: the latest close, its date and the AGM dividend's yield on it, so the
  // text never carries a stale price (the summary once said "~5.4% on the 29 Sep close" with the price at Ps. 362.60).
  const agmDps = () => ((REF.dividends || []).slice(-1)[0] || null);
  const TOKENS = {
    nextResults: nextResultsText, nextTraffic: nextTrafficText,
    lastPx: () => (lastPx ? `Ps. ${fmtN(lastPx[1], 2)}` : '—'), lastPxDate: () => (lastPx ? fmtDate(lastPx[0]) : '—'),
    divYield: () => (lastPx && agmDps() ? fmtPct(100 * agmDps().dps / lastPx[1], 1) : '—'), dps: () => (agmDps() ? `Ps. ${fmtN(agmDps().dps, 2)}` : '—'),
  };
  const liveTokens = (x) => String(x).replace(/\{\{(\w+)\}\}/g, (m, k) => (TOKENS[k] ? TOKENS[k]() : m));
  const TITLE_TAIL = (document.title.split(' | ')[1] || '').trim();
  // ================= HEADER =================
  function renderHeader() {
    const asof = [];
    if (lastQ) asof.push(`<span><b>${t('quarter')}:</b> ${qLabel(lastQ)} · ${fmtReportDate(lastQ)}</span>`);
    const lastM = TR.months[TR.months.length - 1];
    if (lastM) asof.push(`<span><b>${LANG === 'es' ? 'Tráfico' : 'Traffic'}:</b> ${ymLabel(lastM.ym)} · ${fmtDate(lastM.source && lastM.source.date)}</span>`);
    if (lastPx) { const fa = (MK.prices && MK.prices['GAPB.MX'] && MK.prices['GAPB.MX'].fetchedAt) || MK.generatedAt; asof.push(`<span><b>${t('price')}:</b> ${t('close')} ${fmtDate(lastPx[0])}${fa ? ` · ${LANG === 'es' ? 'obtenido' : 'fetched'} ${fmtTsCdmx(fa)}` : ''}</span>`); }
    const genParts = [];
    if (FIN.generatedAt) genParts.push(`${LANG === 'es' ? 'estados financieros' : 'statements'} ${fmtDate(FIN.generatedAt.slice(0, 10))}`);
    if (MK.generatedAt) genParts.push(`${LANG === 'es' ? 'mercado' : 'market'} ${fmtDate(MK.generatedAt.slice(0, 10))}`);
    if (genParts.length) asof.push(`<span><b>${LANG === 'es' ? 'Datos generados' : 'Data generated'}:</b> ${genParts.join(' · ')}</span>`);
    html('asofRow', asof.join(''));
    const notice = el('dataNotice');
    if (!Q.length || !TR.months.length) { notice.hidden = false; notice.className = 'notice warn'; notice.textContent = t('provisional'); } else notice.hidden = true;

    const k = [];
    if (lastPx) { const yAgo = pointAtOrBefore(gapPx, addDays(lastPx[0], -365)); k.push({ l: 'GAP B (BMV)', v: 'Ps. ' + fmtN(lastPx[1], 2), d: yAgo ? `${fmtPct(100 * (lastPx[1] / yAgo[1] - 1), 1, true)} ${t('oneY')}` : '' }); }
    if (lastPx && sharesNow) { const mc = lastPx[1] * sharesNow; k.push({ l: t('mktCap'), v: 'Ps. ' + fmtN(mc / 1e9, 1) + ' ' + (LANG === 'es' ? 'mil M' : 'bn'), d: fxAt(lastPx[0]) ? 'US$ ' + fmtN(mc / fxAt(lastPx[0]) / 1e9, 1) + ' ' + (LANG === 'es' ? 'mil M' : 'bn') : '' }); }
    if (lastLTM && lastLTM.is) k.push({ l: 'EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: 'Ps. ' + fmtM(lastLTM.is.ebitda) + ' M', d: `${t('margin')} ${fmtPct(lastLTM.is.ebitdaMarginExIfric)} ${t('exIfric')}` });
    const nd = netDebt(lastQ);
    if (nd && lastLTM && lastLTM.is) k.push({ l: t('lev'), v: fmtX(nd.net / lastLTM.is.ebitda, 2), d: `${t('nd')} Ps. ${fmtM(nd.net)} M` });
    // Multiples tile: NTM on FactSet consensus (owner, 17-Oct-2026: P/E and EV/EBITDA are NTM site-wide unless labeled otherwise):
    // P/E NTM = header close / FactSet NTM EPS mean (bold); EV at that close / FactSet NTM EBITDA mean beneath. LTM only if no consensus.
    { const m = ntmMultiples(lastPx, sharesNow, nd, lastQ);
      if (m) k.push({ l: peL() + ' ' + ntmLbl(), v: fmtX(m.pe), d: `${m.evEbitda != null ? `${evL()} / EBITDA ${ntmLbl()} ${fmtX(m.evEbitda)} · ` : ''}${LANG === 'es' ? 'consenso FactSet' : 'FactSet consensus'} ${fmtDate(m.estimateDate)}` });
      else if (lastPx && sharesNow && nd && lastLTM && lastLTM.is) { const ev = lastPx[1] * sharesNow / 1000 + nd.net + (lastQ.bs.nci || 0); k.push({ l: evL() + ' / EBITDA ' + (LANG === 'es' ? 'UDM' : 'LTM'), v: fmtX(ev / lastLTM.is.ebitda), d: lastLTM.is.netIncome ? `${peL()} ${LANG === 'es' ? 'UDM' : 'LTM'} ${fmtX(lastPx[1] * sharesNow / 1000 / lastLTM.is.netIncome)} (${LANG === 'es' ? 'utilidad neta UDM' : 'LTM net income'})` : '' }); } }
    html('kpiStrip', k.map((x) => `<div class="kpi"><div class="lbl">${x.l}</div><div class="val">${x.v}</div><div class="delta">${x.d || ''}</div></div>`).join(''));
    document.querySelectorAll('#genStamp, .genStamp').forEach((e) => { e.textContent = genParts.join(' · '); });
    { const latest = [FIN.generatedAt, MK.generatedAt].filter(Boolean).sort().pop(); if (latest) document.querySelectorAll('[data-status-dot]').forEach((e) => e.setAttribute('data-status-time', latest)); }
  }
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  // ================= 00 EXECUTIVE SUMMARY =================
  function renderSummary() {
    const b = SUM.basis || {};
    const qq = b.quarter && (qById[b.quarter] || { fy: +b.quarter.slice(0, 4), q: +b.quarter.slice(5) });
    html('sumMeta', LANG === 'es'
      ? `Con base en los resultados del ${qq ? qLabel(qq) : '—'} (${qq && qById[b.quarter] ? fmtReportDate(qById[b.quarter]) : fmtDate(b.resultsDate)}), el tráfico de ${b.trafficMonth ? ymLabel(b.trafficMonth) : '—'} y la guía del ${fmtDate(b.guidanceDate)} · redactado el ${fmtDate(SUM.updatedAt)}; se reescribe con cada reporte nuevo. Las cifras de mercado del encabezado son diarias.`
      : `Based on ${qq ? qLabel(qq) : '—'} results (${qq && qById[b.quarter] ? fmtReportDate(qById[b.quarter]) : fmtDate(b.resultsDate)}), ${b.trafficMonth ? ymLabel(b.trafficMonth) : '—'} traffic and the guidance of ${fmtDate(b.guidanceDate)} · written ${fmtDate(SUM.updatedAt)}; rewritten with each new report. Market figures in the header are daily.`);
    // "(≈5th)" / "(≈día 5)" in older curated text becomes the expected date of the next monthly traffic report (the same
    // rule as the {{nextTraffic}} token: nextTraffic() in the model, one date for page, summary and deck)
    const nt = nextTraffic();
    const ord = (d) => d + ([, 'st', 'nd', 'rd'][(d % 100 >> 3 ^ 1 && d % 10) || 0] || 'th');
    const live = (x) => (nt ? String(x).replace(/\((?:~|≈)\s*(?:día\s*)?\d{1,2}(?:st|nd|rd|th)?\)/g, LANG === 'es' ? `(hacia el ${nt.day} de ${nt.month})` : `(around ${nt.month} ${ord(nt.day)})`) : x);
    const bold = (x) => liveTokens(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html('sumGrid', (SUM.sections || []).map((sec) => `<div class="card"><h3>${tc(L(sec.title))}</h3><ul>${(sec[LANG] || sec.en || []).map((x) => `<li>${bold(live(x))}</li>`).join('')}</ul></div>`).join(''));
  }

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
  function avgFx(obj, mode = st.mode) { // average USD/MXN over the period (Banxico FIX in market.js)
    const end = obj.q ? qEndDate(obj) : `${obj.fy}-12-31`;
    const months = obj.months || (obj.q && mode === 'q' ? 3 : mode === 'ltm' ? 12 : mode === 'fy' ? 12 : obj.q * 3);
    const start = addDays(end, -30 * months);
    const pts = fxPts.filter((p) => p[0] > start && p[0] <= end);
    return pts.length ? pts.reduce((a, p) => a + p[1], 0) / pts.length : null;
  }
  function yoyCommentsFor(A, B, mode = st.mode) {
    if (!A || !B) return null;
    // rolling twelve months: their own entry ("LTM" + the quarter id), never the quarter's comments
    if (mode === 'ltm') { const ck = `LTM${A.fy}Q${A.q}`; return B.fy === A.fy - 1 && B.q === A.q && CM.periods && CM.periods[ck] ? CM.periods[ck] : null; }
    const yoy = mode === 'q' ? (B.fy === A.fy - 1 && B.q === A.q) : mode === 'ytd' ? (B.fy === A.fy - 1 && B.months === A.months) : mode === 'fy' ? (B.fy === A.fy - 1) : false;
    const ck = mode === 'q' ? A.id : mode === 'ytd' ? `${A.fy}M${A.months}` : mode === 'fy' ? A.id : null;
    return yoy && ck && CM.periods && CM.periods[ck] ? CM.periods[ck] : null;
  }
  // The two statement periods on screen: A (current) and B (base), B as restated in A's own report when the pair is a
  // year-over-year comparison (see cmpBase). The deck reads the same pair through currentPair().
  function currentPair() {
    const opts = periodOptions();
    const A = (opts.find((o) => o.id === st.a) || {}).obj, B0 = (opts.find((o) => o.id === st.b) || {}).obj;
    return { A, B: cmpBase(A, B0, st.mode), B0 };
  }
  function renderStatements() {
    const { A, B } = currentPair();
    const layout = st.stmt === 'is' ? isLayout() : (FIN.layout[st.stmt] || []);
    const key = st.stmt;
    const fxRef = key === 'is' && A ? periodFx(A) : null; // per-ADS rows: both columns at the current period's rate
    const get = (obj, def) => { if (!obj || !obj[key]) return null; let v = key === 'is' ? isValue(obj, def, fxRef) : obj[key][def.k]; if (v == null) return null; return convert(v, def, obj); };
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
      const pct = chgPct(va, vb);
      const isPct = def.pct, isPs = def.perShare;
      const f = (v) => (v == null ? '—' : isPct ? fmtPct(v) : isPs ? fmtN(v, 2) : fmtM(v, st.usd ? 1 : 0));
      const fd = d == null ? '—' : isPct ? fmtN(d, 1) + ' pp' : isPs ? fmtN(d, 2) : fmtM(d, st.usd ? 1 : 0);
      const isCosHead = key === 'is' && def.k === 'costServices';
      if (isCosHead) inCos = true;
      const cosCount = isCosHead ? layout.filter((d, i) => i > layout.indexOf(def) && d.level === 2 && layout.slice(layout.indexOf(def) + 1, i).every((x) => x.level === 2)).length : 0;
      const cmt = withCmt ? `<td class="cmt">${C && C.lines[def.k] ? L(C.lines[def.k]) : ''}</td>` : '';
      const first = isCosHead ? `<td data-g="cos"><span class="grp">${st.open.cos ? '▾' : '▸'}</span>${lineLabel(def)}<span class="cnt">${cosCount} ${t('items')}</span></td>` : `<td>${lineLabel(def)}${def.ifric ? ' <span class="muted small">IFRIC 12</span>' : ''}</td>`;
      rows.push(`<tr class="${isCosHead ? 'grp-head ' : ''}${def.level === 0 ? 'bold' : def.level === 2 ? 'sub2' : def.level === 1 ? 'sub' : ''}">${first}<td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${fd}</td><td class="${cls(pct)}">${isPct ? '' : fmtChg(va, vb)}</td>${cmt}</tr>`);
    }
    const la = A ? A.label : '—', lb = B ? B.label : '—';
    html('stmtTable', `<table class="stmt-table"><thead><tr><th scope="col">${t('line')}</th><th scope="col">${la}</th><th scope="col">${lb}</th><th scope="col">${t('change')}</th><th scope="col">${t('changePct')}</th>${withCmt ? `<th scope="col" class="cmt">${t('comments')}</th>` : ''}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('stmtTitle').textContent = tc(`${t(st.stmt)} · ${la} vs ${lb}`);
    const unit = st.usd ? t('usdM') : t('mxnM');
    const rn = key === 'is' ? restatedNote(B) : '';
    el('stmtCap').textContent = `${unit}${st.stmt === 'is' ? ' · ' + (st.exIfric ? t('exIfric') : t('reported')) : ''}${st.usd ? (LANG === 'es' ? ' · convertido con el tipo de cambio promedio (flujos) o de cierre (balance) de la Fed H.10' : ' · converted at the Fed H.10 average (flows) or period-end (balance sheet) rate') : ''}${(A && A.derived) || (B && B.derived) ? (LANG === 'es' ? ' · periodos acumulados/UDM calculados a partir de trimestres reportados' : ' · YTD/LTM periods computed from reported quarters') : ''}${rn ? ' · ' + rn : ''}${key === 'is' ? ' · ' + t('perShareNote') : ''}${key === 'is' && st.mode === 'ltm' ? ' · ' + ltmShareNote(A, B) : ''}`;
    if (withCmt) el('stmtCap').textContent += ' · ' + (C ? t('cmtNote') : t('cmtOnlyYoy')) + ' · ' + t('nmNote');
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
  function periodYms(obj, mode = st.mode) { // calendar months covered by a period object in the given mode
    const endM = mode === 'fy' ? 12 : (obj.q || 4) * 3;
    const n = mode === 'q' ? 3 : mode === 'ytd' ? (obj.months || endM) : 12;
    const out = []; for (let i = n - 1; i >= 0; i--) { let m = endM - i, y = obj.fy; while (m <= 0) { m += 12; y--; } out.push(`${y}-${String(m).padStart(2, '0')}`); } return out;
  }
  function opsFor(obj, mode = st.mode) {
    if (!obj) return null;
    const ms = periodYms(obj, mode).map((ym) => trByYm[ym]);
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
    const { A, B } = currentPair();
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
      const pct = chgPct(va, vb);
      const dec = opt.money ? (st.usd ? 2 : 1) : 1;
      const f = (v) => (v == null ? '—' : fmtN(v, dec));
      rows.push(`<tr class="${opt.cls || ''}"><td>${label}</td><td>${f(va)}</td><td>${f(vb)}</td><td class="${cls(d)}">${d == null ? '—' : fmtN(d, dec)}</td><td class="${cls(pct)}">${fmtChg(va, vb)}</td><td class="cmt">${ops && ops[k] ? L(ops[k]) : ''}</td></tr>`);
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
    html('opsTable', `<table class="stmt-table"><thead><tr><th scope="col">${t('metric')}</th><th scope="col">${la}</th><th scope="col">${lb}</th><th scope="col">${t('change')}</th><th scope="col">${t('changePct')}</th><th scope="col" class="cmt">${t('comments')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('opsTitle').textContent = tc(`${t('ops')} · ${la} vs ${lb}`);
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
    const qs = Q.slice(-lastN());
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
    const qs = Q.slice(-lastN());
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
  const gLink = (v, label) => `<a href="${v.source.url}" target="_blank" rel="noopener">${label || fmtGuidanceDate(v)}</a>`;
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
    el('guideCurTitle').textContent = tc(`${LANG === 'es' ? 'Guía' : 'Guidance'} FY${fy} · ${cur.length > 1 ? (LANG === 'es' ? 'revisada el ' : 'revised ') : (LANG === 'es' ? 'emitida el ' : 'issued ')}${fmtGuidanceDate(last)}`);
    el('guideCurCap').textContent = !act ? (LANG === 'es' ? 'Aún no hay resultados reportados del año guiado.' : 'No results reported yet for the guided year.')
      : closed ? (LANG === 'es' ? `Año cerrado: resultado real FY${fy} frente a la última guía.` : `Closed year: actual FY${fy} versus the final guidance.`)
      : (LANG === 'es' ? `Seguimiento con el acumulado reportado (${act.label} vs ${ytdLabel(fy - 1, act.months)}); la guía es para el año completo, así que un acumulado fuera del rango no implica un incumplimiento.` : `Tracked against the reported year-to-date (${act.label} vs ${ytdLabel(fy - 1, act.months)}); guidance is for the full year, so a year-to-date figure outside the range is not a miss in itself.`);
    const head = `<tr><th>${t('metric')}</th>${cur.map((v, i) => `<th>${i === 0 ? t('initial') : t('revised')}<span class="sub">${fmtGuidanceDate(v)}</span></th>`).join('')}${cur.length > 1 ? `<th>${t('change')}</th>` : ''}<th>${t('actual')}${act ? `<span class="sub">${act.label}</span>` : ''}</th><th>${closed ? t('outcome') : t('tracking')}</th></tr>`;
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
    html('guideCurSrc', `${t('src')}: ` + cur.map((v) => gLink(v, `${t('gapRelease')} (${fmtGuidanceDate(v)})`)).join(' · '));

    // ---- six-quarter history: the guidance in force after each quarter's report, with what changed
    const rq = Q.filter((q) => q.sources && q.sources.is && q.sources.is.date);
    const qs = rq.slice(-6), before = rq[rq.length - 7] || null;
    const relDate = (q) => q.sources.is.date;
    const inForce = (date) => { let v = null; for (const x of GV) if (x.date <= date) v = x; return v; };
    const cols = qs.map((q, i) => { const from = i ? relDate(qs[i - 1]) : (before ? relDate(before) : '0000-00-00'); return { q, v: inForce(relDate(q)), events: GV.filter((x) => x.date > from && x.date <= relDate(q)) }; });
    const prevOf = (i) => (i ? cols[i - 1].v : before ? inForce(relDate(before)) : null);
    const hHead = `<tr><th>${t('metric')}</th>${cols.map((c) => `<th>${qLabel(c.q)}<span class="sub">${fmtDate(relDate(c.q))}</span></th>`).join('')}</tr>`;
    const rFy = `<tr class="bold"><td>${t('guideFy')}</td>${cols.map((c, i) => `<td class="${c.v && prevOf(i) && c.v.fy !== prevOf(i).fy ? 'chg' : ''}">${c.v ? 'FY' + c.v.fy : '—'}</td>`).join('')}</tr>`;
    const rSt = `<tr><td>${t('guideStatus')}</td>${cols.map((c) => `<td>${c.events.length ? c.events.map((e) => gChip('event', `${e.kind === 'revised' ? t('revised') : t('issued')} · ${fmtGuidanceDate(e)}`) + (e.quarter ? '' : `<span class="sub">${t('standalone')}</span>`)).join('<br>') : gChip('', t('unchanged')) + (c.v ? `<span class="sub">${LANG === 'es' ? 'desde' : 'since'} ${fmtGuidanceDate(c.v)}</span>` : '')}</td>`).join('')}</tr>`;
    const rM = GM.map((m) => `<tr><td>${L(m)}</td>${cols.map((c, i) => { const now = c.v && c.v.items[m.k], p = prevOf(i), was = p && p.items[m.k]; const sameFy = c.v && p && c.v.fy === p.fy; const changed = c.v && p && (!sameFy || JSON.stringify(now) !== JSON.stringify(was)); return `<td class="${changed ? 'chg' : ''}">${gRange(m, now)}${changed && sameFy && was ? `<span class="was">${gRange(m, was)}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
    html('guideHistory', `<table class="guide-table"><thead>${hHead}</thead><tbody>${rFy}${rSt}${rM}</tbody></table>`);
    const ev = cols.flatMap((c) => c.events);
    html('guideHistSrc', ev.length ? `${t('src')}: ` + ev.map((v) => gLink(v, `${t('gapRelease')} (${fmtGuidanceDate(v)})`)).join(' · ') : '');

    // ---- track record for closed years, against the final guidance of each year
    const fys = [...new Set(GV.map((v) => v.fy))].sort();
    const finalOf = (y) => GV.filter((v) => v.fy === y).pop();
    const closedFys = fys.filter((y) => { const a = gActual(y); return a && a.kind === 'fy'; });
    const rHead = `<tr><th>${t('year')}</th>${GM.map((m) => `<th>${L(m.s)}</th>`).join('')}<th>${t('hits')}</th></tr>`;
    const rRows = closedFys.map((y) => { const v = finalOf(y), a = gActual(y); let hit = 0, n = 0; const cells = GM.map((m) => { const x = v.items[m.k], val = a.v[m.k]; const sx = gStatus(m, x, val); if (sx) { n++; if (sx !== 'below') hit++; } return `<td class="${sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : ''}"><b>${gActualFmt(m, val)}</b><span class="sub">${LANG === 'es' ? 'guía' : 'guided'} ${gRange(m, x)}</span></td>`; }); return `<tr><td>FY${y}<span class="sub">${v.kind === 'revised' ? t('revised') : t('initial')} · ${fmtGuidanceDate(v)}</span></td>${cells.join('')}<td><b>${hit}/${n}</b></td></tr>`; });
    const noG = (REF.noGuidance || []).filter((g) => !fys.includes(g.fy)).map((g) => ({ y: g.fy, h: `<tr><td>FY${g.fy}<span class="sub">${LANG === 'es' ? 'sin guía' : 'no guidance'}</span></td><td colspan="${GM.length + 1}" class="muted">${LS(g.note)}</td></tr>` }));
    const recRows = closedFys.map((y, i) => ({ y, h: rRows[i] })).concat(noG).sort((a, b) => a.y - b.y).map((r) => r.h);
    html('guideRecord', `<table><thead>${rHead}</thead><tbody>${recRows.join('')}</tbody></table>`);

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
  const TRAFFIC_FROM = '2023-01'; // the charts start here (owner, 17-Oct-2026: post-pandemic series only; the table and the archive keep every month)
  function trafficSeries(from = TRAFFIC_FROM) {
    // returns [{key, label, points:[[label, value, bucket, complete]]}] for selected airports at chosen freq/segment
    const months = TR.months.filter((m) => m.ym >= from);
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
  // Year-on-year change (%) of the same series: each bucket against the same bucket a year earlier (month, quarter or year),
  // both sums of the monthly reports. The prior-year buckets come from the whole archive, so the first charted year has a change too.
  function trafficYoySeries(from = TRAFFIC_FROM) {
    const all = trafficSeries('0000-00'), shown = trafficSeries(from);
    const priorKey = (b) => `${+b.slice(0, 4) - 1}${b.slice(4)}`;
    return shown.map((s, i) => { const byKey = Object.fromEntries(all[i].points.map((p) => [p[2], p[1]])); return { ...s, points: s.points.map((p) => { const prev = byKey[priorKey(p[2])]; const v = p[1] != null && prev ? 100 * (p[1] / prev - 1) : null; return [p[0], v, p[2], true]; }) }; });
  }
  // Quarter to date: the months of the latest month's calendar quarter published so far (a quarter-end month closes the quarter),
  // against the same months a year earlier, both sums of the monthly reports (GAP's release carries no quarterly columns).
  function trafficQtd(month) {
    const lastM = month || TR.months[TR.months.length - 1]; if (!lastM) return null;
    const y = +lastM.ym.slice(0, 4), m = +lastM.ym.slice(5), q = Math.ceil(m / 3), m0 = (q - 1) * 3 + 1;
    const ymOf = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}`;
    const win = [], pwin = [];
    for (let mm = m0; mm <= m; mm++) { const a = TR.months.find((x) => x.ym === ymOf(y, mm)), b = TR.months.find((x) => x.ym === ymOf(y - 1, mm)); if (a) win.push(a); if (b) pwin.push(b); }
    const full = win.length === m - m0 + 1, fullPrior = pwin.length === win.length;
    const sum = (arr, seg, code) => (arr.length ? arr.reduce((a, x) => a + ((x[seg] && x[seg][code]) || 0), 0) : null);
    const rows = {};
    for (const code of [...AIR.map((a) => a.code), 'TOTAL']) { const v = full ? sum(win, 'total', code) : null, p = full && fullPrior ? sum(pwin, 'total', code) : null; rows[code] = { v, p, yoy: chgPct(v, p), dom: full ? sum(win, 'dom', code) : null, intl: full ? sum(win, 'intl', code) : null }; }
    const qLabel = LANG === 'es' ? `${q}T${String(y).slice(2)}` : `${q}Q${String(y).slice(2)}`;
    const span = `${ymLabel(ymOf(y, m0)).split(' ')[0]}–${ymLabel(lastM.ym)}`;
    return { month: lastM, fy: y, q, months: win.length, closed: m === q * 3, label: qLabel, span, rows, from: ymOf(y, m0), to: lastM.ym };
  }
  // Latest month by airport with GAP's own comparatives: the same-month prior-year column and the January-to-month
  // columns of that release (`prior`, `ytd`, `ytdPrior` in traffic.js) rather than sums of the preliminary monthly
  // releases, which differ by a few thousand passengers (owner, 15-Oct-2026). Months before the columns were kept
  // fall back to the sums (`basis: 'sum'`).
  function trafficLatest(month) {
    const lastM = month || TR.months[TR.months.length - 1]; if (!lastM) return null;
    const prevYm = `${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`, prev = TR.months.find((m) => m.ym === prevYm);
    const sumYtd = (ym, seg, code) => TR.months.filter((m) => m.ym.slice(0, 4) === ym.slice(0, 4) && m.ym <= ym).reduce((a, m) => a + ((m[seg] && m[seg][code]) || 0), 0);
    const own = !!(lastM.prior && lastM.ytd && lastM.ytdPrior);
    const pick = (o, seg, code, fb) => (o && o[seg] && o[seg][code] != null ? o[seg][code] : fb);
    const rows = {};
    for (const code of [...AIR.map((a) => a.code), 'TOTAL']) {
      rows[code] = {
        v: lastM.total[code], dom: lastM.dom[code], intl: lastM.intl[code],
        p: pick(lastM.prior, 'total', code, prev ? prev.total[code] : null),
        // the percentage changes as GAP prints them (computed on unrounded figures), else recomputed on the thousands
        yoy: pick(lastM.chg, 'total', code, chgPct(lastM.total[code], pick(lastM.prior, 'total', code, prev ? prev.total[code] : null))),
        ytdYoy: pick(lastM.ytdChg, 'total', code, chgPct(pick(lastM.ytd, 'total', code, sumYtd(lastM.ym, 'total', code)), pick(lastM.ytdPrior, 'total', code, prev ? sumYtd(prev.ym, 'total', code) : null))),
        ytd: pick(lastM.ytd, 'total', code, sumYtd(lastM.ym, 'total', code)), ytdPrior: pick(lastM.ytdPrior, 'total', code, prev ? sumYtd(prev.ym, 'total', code) : null),
        ytdDom: pick(lastM.ytd, 'dom', code, sumYtd(lastM.ym, 'dom', code)), ytdIntl: pick(lastM.ytd, 'intl', code, sumYtd(lastM.ym, 'intl', code)),
        ytdDomPrior: pick(lastM.ytdPrior, 'dom', code, prev ? sumYtd(prev.ym, 'dom', code) : null), ytdIntlPrior: pick(lastM.ytdPrior, 'intl', code, prev ? sumYtd(prev.ym, 'intl', code) : null),
      };
    }
    const cbx = { v: lastM.cbx, p: lastM.prior && lastM.prior.cbx != null ? lastM.prior.cbx : (prev ? prev.cbx : null), ytd: lastM.ytd && lastM.ytd.cbx != null ? lastM.ytd.cbx : null, ytdPrior: lastM.ytdPrior && lastM.ytdPrior.cbx != null ? lastM.ytdPrior.cbx : null };
    cbx.yoy = lastM.chg && lastM.chg.cbx != null ? lastM.chg.cbx : chgPct(cbx.v, cbx.p); cbx.ytdYoy = lastM.ytdChg && lastM.ytdChg.cbx != null ? lastM.ytdChg.cbx : chgPct(cbx.ytd, cbx.ytdPrior);
    // the same columns added up by country (the twelve Mexican airports; Montego Bay and Kingston)
    const byCountry = {};
    for (const c of ['MX', 'JM']) { const codes = AIR.filter((a) => a.country === c).map((a) => a.code); const add = (k) => codes.reduce((s, code) => (rows[code][k] == null || s == null ? null : s + rows[code][k]), 0); byCountry[c] = { v: add('v'), p: add('p'), ytd: add('ytd'), ytdPrior: add('ytdPrior') }; }
    return { month: lastM, prev, rows, cbx, byCountry, basis: own ? 'release' : 'sum' };
  }
  // Passengers of one airport in a calendar year, from the monthly reports (the twelve months must all be there).
  function paxYear(code, year) { const ms = TR.months.filter((m) => m.ym.slice(0, 4) === String(year)); return ms.length === 12 ? ms.reduce((a, m) => a + (m.total[code] || 0), 0) : null; }
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
    el('trafficChartTitle').textContent = tc(`${t(tr.seg)} · ${LANG === 'es' ? 'serie' : 'series'} ${t(tr.freq === 'm' ? 'monthly' : tr.freq === 'q' ? 'quarterly' : 'annual')}`);
    el('trafficChartCap').textContent = LANG === 'es' ? 'Miles de pasajeros terminales; periodos incompletos se omiten en la vista trimestral/anual' : 'Thousand terminal passengers; incomplete periods are omitted in the quarterly/annual view';
    // y/y chart of the same selection, side by side: the axis is held to ±YOY_CAP so the 2020–2021 swings do not flatten the
    // rest; a point beyond the band is drawn at the edge (hollow) and the tooltip carries its true value
    const YOY_CAP = 60, yoyS = trafficYoySeries();
    const clamp = (v) => (v == null ? null : Math.max(-YOY_CAP, Math.min(YOY_CAP, v)));
    const clipped = yoyS.some((s) => s.points.some((p) => p[1] != null && Math.abs(p[1]) > YOY_CAP)); // the band applies only when a point exceeds it
    mkChart('chartTrafficYoy', { type: 'line', data: { labels, datasets: yoyS.map((s, i) => ({ label: s.label, data: s.points.map((p) => clamp(p[1])), raw: s.points.map((p) => p[1]), borderColor: c[i % 8], backgroundColor: c[i % 8], fill: false, spanGaps: false, pointRadius: s.points.map((p) => (p[1] != null && Math.abs(p[1]) > YOY_CAP ? 4 : tr.freq === 'm' ? 0 : 3)), pointStyle: s.points.map((p) => (p[1] != null && Math.abs(p[1]) > YOY_CAP ? 'triangle' : 'circle')), pointBackgroundColor: s.points.map((p) => (p[1] != null && Math.abs(p[1]) > YOY_CAP ? '#fff' : c[i % 8])), pointBorderWidth: 1.5 })) },
      options: { plugins: { legend: { display: yoyS.length > 1, position: 'top', align: 'end' }, tooltip: { callbacks: { label: (x) => { const v = x.dataset.raw[x.dataIndex]; return `${x.dataset.label}: ${v == null ? '—' : fmtPct(v, 1, true)}${v != null && Math.abs(v) > YOY_CAP ? (LANG === 'es' ? ' (fuera de la escala)' : ' (beyond the axis)') : ''}`; } } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 14, maxRotation: 0 } }, y: { ...(clipped ? { min: -YOY_CAP, max: YOY_CAP } : {}), ticks: { callback: (v) => (v > 0 ? '+' : '') + v + '%' }, grid: { color: (ctx) => (ctx.tick && ctx.tick.value === 0 ? cssVar('--text-secondary') : cssVar('--grid')), lineWidth: (ctx) => (ctx.tick && ctx.tick.value === 0 ? 1.2 : 1) } } } } });
    el('trafficYoyTitle').textContent = tc(LANG === 'es' ? `${t(tr.seg)} · variación anual ${t(tr.freq === 'm' ? 'monthly' : tr.freq === 'q' ? 'quarterly' : 'annual')}` : `${t(tr.seg)} · ${t(tr.freq === 'm' ? 'monthly' : tr.freq === 'q' ? 'quarterly' : 'annual')} year-on-year change`);
    el('trafficYoyCap').textContent = LANG === 'es' ? `Cambio % frente al mismo ${tr.freq === 'm' ? 'mes' : tr.freq === 'q' ? 'trimestre' : 'año'} del año anterior, ambos sumas de los reportes mensuales; ${clipped ? `eje acotado a ±${YOY_CAP}% (triángulo = valor fuera de la escala, verlo al pasar el cursor)` : 'cálculo propio'}` : `% change vs the same ${tr.freq === 'm' ? 'month' : tr.freq === 'q' ? 'quarter' : 'year'} a year earlier, both sums of the monthly reports; ${clipped ? `axis held to ±${YOY_CAP}% (triangle = value beyond the axis, hover to read it)` : 'own calculation'}`;
    html('trafficYoySrc', `${t('src')}: ${LANG === 'es' ? 'reportes mensuales de tráfico de GAP (cálculo propio)' : 'GAP monthly traffic reports (own calculation)'}`);
    // series table
    html('trafficSeriesTable', `<table><thead><tr><th scope="col">${t('period')}</th>${series.map((s) => `<th scope="col">${s.label}</th>`).join('')}</tr></thead><tbody>${labels.map((l, i) => `<tr><td>${l}</td>${series.map((s) => `<td>${fmtN(s.points[i][1], 1)}</td>`).join('')}</tr>`).reverse().slice(0, 60).join('')}</tbody></table>`);
    const lastM = TR.months[TR.months.length - 1];
    html('trafficSrc', `${t('src')}: <a href="${lastM.source.url}" target="_blank" rel="noopener">${LANG === 'es' ? 'reporte mensual de tráfico de GAP' : 'GAP monthly traffic report'} (${fmtDate(lastM.source.date)}) ↗</a>`);
    // latest-month table by airport
    const TL = trafficLatest(lastM), TQ = trafficQtd(lastM);
    const rows = [...AIR.map((a) => a.code), 'TOTAL'].map((code) => {
      const r = TL.rows[code], q = TQ.rows[code]; const v = r.v, y = r.ytd;
      const name = code === 'TOTAL' ? t('total') : `${code} · ${(AIR.find((a) => a.code === code) || {})[LANG] || code}`;
      const yoy = r.yoy, yoyY = r.ytdYoy; // GAP's printed changes when the release carries them; the quarter is summed from the reports
      return `<tr class="${code === 'TOTAL' ? 'total' : ''}"><td>${name}</td><td class="gs m">${fmtN(v, 1)}</td><td class="m ${cls(yoy)}">${fmtChgV(yoy)}</td><td class="m">${fmtN(lastM.dom[code], 1)}</td><td class="m">${fmtN(lastM.intl[code], 1)}</td><td class="gs q">${fmtN(q.v, 1)}</td><td class="q ${cls(q.yoy)}">${fmtChgV(q.yoy)}</td><td class="gs y">${fmtN(y, 1)}</td><td class="y ${cls(yoyY)}">${fmtChgV(yoyY)}</td><td class="gs">${fmtPct(100 * v / lastM.total.TOTAL, 1)}</td></tr>`;
    });
    const qHead = LANG === 'es' ? `Trimestre${TQ.closed ? '' : ' a la fecha'} · ${TQ.label}` : `Quarter${TQ.closed ? '' : ' to date'} · ${TQ.label}`;
    const yHead = LANG === 'es' ? `Acumulado del año · ${lastM.ym.slice(0, 4)}` : `Year to date · ${lastM.ym.slice(0, 4)}`;
    const mHead = LANG === 'es' ? `Mes · ${ymLabelLong(lastM.ym)}` : `Month · ${ymLabelLong(lastM.ym)}`; // composed from the latest report in traffic.js, so it moves with each new month
    html('trafficTable', `<table><thead>
      <tr><th rowspan="2" scope="col">${t('airport')}</th><th scope="colgroup" colspan="4" class="grp m gs">${mHead}</th><th scope="colgroup" colspan="2" class="grp q gs">${qHead}</th><th scope="colgroup" colspan="2" class="grp y gs">${yHead}</th><th rowspan="2" scope="col" class="gs">${t('share')}<br><span class="small muted">${ymLabel(lastM.ym)}</span></th></tr>
      <tr><th scope="col" class="gs m">${LANG === 'es' ? 'Pasajeros' : 'Passengers'}</th><th scope="col" class="m">${t('yoy')}</th><th scope="col" class="m">${t('dom')}</th><th scope="col" class="m">${t('intl')}</th><th scope="col" class="gs q">${TQ.span}</th><th scope="col" class="q">${t('yoy')}</th><th scope="col" class="gs y">${ymLabel(`${lastM.ym.slice(0, 4)}-01`).split(' ')[0]}–${ymLabel(lastM.ym)}</th><th scope="col" class="y">${t('yoy')}</th></tr>
    </thead><tbody>${rows.join('')}</tbody></table>`);
    el('trafficTblTitle').textContent = tc(`${t('latestMonth')}: ${ymLabel(lastM.ym)} · ${LANG === 'es' ? 'trimestre' : 'quarter'} ${TQ.label} · ${LANG === 'es' ? 'acumulado' : 'year to date'} ${lastM.ym.slice(0, 4)}`);
    const qNote = LANG === 'es' ? ` · trimestre (${TQ.span}${TQ.closed ? ', cerrado' : `, ${TQ.months} de 3 meses`}) = suma de los reportes mensuales preliminares de ambos años, por lo que puede diferir en unos miles de pasajeros de las columnas del reporte` : ` · quarter (${TQ.span}${TQ.closed ? ', closed' : `, ${TQ.months} of 3 months`}) = sum of both years' preliminary monthly reports, so it can differ by a few thousand passengers from the report's own columns`;
    el('trafficTblCap').textContent = (LANG === 'es' ? 'Miles de pasajeros terminales por aeropuerto; CBX en Tijuana se clasifica como internacional' : 'Thousand terminal passengers by airport; CBX users at Tijuana count as international') + (lastM.cbx != null ? ` · CBX: ${fmtN(lastM.cbx, 1)}` : '') + (TL.basis === 'release' ? (LANG === 'es' ? ' · variaciones del mes y acumulado del año según las columnas del propio reporte mensual' : ' · monthly changes and year to date from the monthly report\'s own columns') : (LANG === 'es' ? ' · acumulado = suma de los reportes mensuales' : ' · year to date = sum of the monthly reports')) + qNote;
    html('trafficMeta', LANG === 'es' ? `Cobertura mensual: ${ymLabel(TR.months[0].ym)} → ${ymLabel(lastM.ym)} (${TR.months.length} meses). Cifras preliminares publicadas cada mes; las gráficas empiezan en ${ymLabel(TRAFFIC_FROM)}; la tabla de datos y las variaciones usan todo el archivo.` : `Monthly coverage: ${ymLabel(TR.months[0].ym)} → ${ymLabel(lastM.ym)} (${TR.months.length} months). Preliminary figures released monthly; the charts start in ${ymLabel(TRAFFIC_FROM)}; the data table and the changes use the whole archive.`);
  }

  // ================= 03 SHARE PRICE =================
  const sh = { range: '3y', listing: 'GAPB.MX' };
  function rangeStart(pts) { const last = lastPoint(pts); if (!last) return null; const n = { '1y': 365, '3y': 365 * 3, '5y': 365 * 5 }[sh.range]; return n ? addDays(last[0], -n) : pts[0][0]; }
  function decimate(pts, max = 900) { if (pts.length <= max) return pts; const step = Math.ceil(pts.length / max); return pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
  // Share-price sources. Since 2026-10-06 the closes of GAPB.MX, PAC, ASURB.MX and OMAB.MX come from FactSet Global
  // Prices (nightly routine); Yahoo Finance keeps the S&P/BMV IPC, the dividend record and fills only the sessions
  // FactSet has not posted yet. Every label below is composed from market.js's own provenance, never typed.
  function priceSrcLabel(meta) {
    const pv = meta && meta.provenance; if (!pv || !pv.factset) return String((meta && meta.source) || '').replace(/ chart API$/, '');
    const es = LANG === 'es', f = pv.factset, fill = pv.fill || {}, fillName = String(fill.source || 'Yahoo Finance').replace(/ chart API$/, '');
    let s = `${pv.authority} (${es ? 'cierres diarios' : 'daily closes'} ${fmtDate(f.from)} → ${fmtDate(f.to)})`;
    if (fill.before) s += es ? `; ${fillName} antes del ${fmtDate(f.from)}` : `; ${fillName} before ${fmtDate(f.from)}`;
    const a = fill.after || [];
    if (a.length) s += es ? `; ${fillName} para ${a.length === 1 ? 'la sesión del ' + fmtDate(a[0]) : a.length + ' sesiones posteriores'}` : `; ${fillName} for ${a.length === 1 ? 'the ' + fmtDate(a[0]) + ' session' : a.length + ' later sessions'}`;
    return s;
  }
  function priceSources(ids) {
    const fs = [], other = [];
    for (const id of ids) { const m = MK.prices[id]; if (!m) continue; (m.provenance && m.provenance.factset ? fs : other).push(id === '^MXX' ? 'S&P/BMV IPC' : id); }
    const first = fs.length ? MK.prices[ids.find((id) => MK.prices[id] && MK.prices[id].provenance && MK.prices[id].provenance.factset)].provenance : null;
    const fillName = String((first && first.fill && first.fill.source) || 'Yahoo Finance').replace(/ chart API$/, '');
    return { factset: fs, other, authority: first ? first.authority : null, fillName };
  }
  // one-line market-data note for the page and the deck: "FactSet Global Prices (cierres diarios GAPB.MX, PAC), Yahoo Finance (^MXX; dividendos)"
  function marketSrcNote(ids) {
    const es = LANG === 'es', ps = priceSources(ids), dc = es ? 'cierres diarios' : 'daily closes', fb = es ? 'cierres de respaldo' : 'fallback closes';
    const parts = [];
    if (ps.factset.length) parts.push(`${ps.authority} (${dc} ${ps.factset.join(', ')})`);
    const yahoo = [];
    if (ps.other.length) yahoo.push(`${dc} ${ps.other.join(', ')}`);
    yahoo.push(es ? 'dividendos' : 'dividends');
    if (ps.factset.length && ps.fillName === 'Yahoo Finance') yahoo.push(fb);
    parts.push(`Yahoo Finance (${yahoo.join('; ')})`);
    if (ps.factset.length && ps.fillName !== 'Yahoo Finance') parts.push(`${ps.fillName} (${fb})`);
    return parts.join(', ');
  }
  // the refresh table's cadence for the market row, composed from the same provenance (page and deck)
  function marketCadence(ids) {
    const es = LANG === 'es';
    return priceSources(ids).factset.length
      ? (es ? 'diario, tras el cierre de la BMV; cierres de FactSet a las 20:00, hora de Nueva York' : 'daily after the BMV close; FactSet closes at 8 PM New York time')
      : (es ? 'diario, después del cierre de la BMV' : 'daily after the BMV close');
  }
  function renderShare() {
    const pts = px(sh.listing); if (!pts.length) return;
    const start = rangeStart(pts); const win = pts.filter((p) => p[0] >= start);
    const c = SERIES(); const cur = win[win.length - 1];
    const meta = MK.prices[sh.listing];
    mkChart('chartPrice', { type: 'line', data: { datasets: [{ label: meta.name, data: decimate(win).map((p) => ({ x: p[0], y: p[1] })), borderColor: c[0], backgroundColor: c[0] + '1a', fill: true }] },
      options: { parsing: true, plugins: { tooltip: { callbacks: { title: (x) => fmtDate(x[0].raw.x), label: (x) => `${meta.currency} ${fmtN(x.parsed.y, 2)}` } } }, scales: { x: { type: 'category', ticks: { maxTicksLimit: 8, maxRotation: 0, callback: (v, i, ticks) => { const d = win[Math.round(i * (win.length - 1) / Math.max(1, ticks.length - 1))]; return d ? d[0].slice(0, 7) : ''; } }, grid: { display: false } }, y: { ticks: { callback: (v) => fmtN(v, 0) } } } } });
    el('priceChartTitle').textContent = tc(`${meta.name} · ${meta.currency}`);
    el('priceChartCap').textContent = `${t('close')} ${fmtDate(win[0][0])} → ${fmtDate(cur[0])}`;
    html('priceSrc', `${t('src')}: ${priceSrcLabel(meta)}${meta.error ? ' · ⚠ ' + meta.error : ''}`);
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
    html('rebasedTable', `<table><thead><tr><th scope="col">${t('period')}: ${fmtDate(dates[0])} → ${fmtDate(dates[dates.length - 1])}</th><th scope="col">${t('ret')}</th></tr></thead><tbody>${ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return `<tr><td>${d.label}</td><td class="${cls(last - 100)}">${fmtPct(last - 100, 1, true)}</td></tr>`; }).join('')}</tbody></table>`);
    { const ps = priceSources(ids); html('rebasedSrc', `${t('src')}: ${ps.factset.length ? `${ps.authority} (${LANG === 'es' ? 'cierres diarios' : 'daily closes'} ${ps.factset.join(', ')})` : ''}${ps.factset.length && ps.other.length ? '; ' : ''}${ps.other.length ? `Yahoo Finance (${LANG === 'es' ? 'cierres diarios' : 'daily closes'} ${ps.other.join(', ')})` : ''} · ${LANG === 'es' ? 'precio, sin dividendos reinvertidos' : 'price only, dividends not reinvested'}`); }
    html('shareMeta', LANG === 'es' ? `1 ADS (PAC) = ${REF.company ? REF.company.adsRatio : 10} acciones serie B. Acciones en circulación: ${fmtN(sharesNow)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}).` : `1 ADS (PAC) = ${REF.company ? REF.company.adsRatio : 10} series B shares. Shares outstanding: ${fmtN(sharesNow)} (${REF.shares ? fmtDate(REF.shares.asOf) : ''}).`);
  }

  // ================= 04 DCF =================
  // Structure (9-Oct-2026): the flows start at the latest balance sheet (net debt and minorities at that date), cover the rest of
  // the current fiscal year (stub) and five full fiscal years, and are discounted at mid-period. The first projected year is
  // anchored on GAP's own guidance midpoints (guidance.js), the next two on FactSet's consensus EBITDA (peers.js, switchable),
  // the rest on the drivers in the card. The terminal value is an annuity to the concession's end (nothing after it unless a
  // renewal probability is entered), a Gordon perpetuity or an exit multiple. Every input has a plausible range: a value
  // outside it is refused with a visible warning and the last valid value stays in force.
  // The section's markup is the switch (owner, 12-Oct-2026: the DCF is hidden on the GAP, OMA and ASUR pages and not maintained
  // until she says otherwise): without a #dcf section nothing below renders, no text of the page names the DCF and the model
  // object does not expose it. The removed markup is parked beside the runbook (parked/dcf-section.html).
  const DCF_ON = !!document.getElementById('dcf');
  const D = Object.assign({}, REF.dcf || {});
  const dcfState = { s: null, bad: {} };
  const DCF_LIMITS = { trafficG: [-30, 30], revPaxG: [-20, 30], margin: [30, 90], capex: [0, 60000], daPct: [0, 40], tax: [0, 60], nwc: [-50, 50], rf: [0, 30], erp: [0, 15], beta: [0, 3], kd: [0, 30], dw: [0, 90], g: [-5, 10], renew: [0, 100], mult: [1, 40], endYear: [2030, 2100] };
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
  // Anchors: the latest guidance vintage of a fiscal year (midpoints) and FactSet's consensus EBITDA for it (mean, count).
  const fyActual = (fy) => Y.find((y) => y.fy === fy && y.is && y.is.ebitda != null && y.kpi && y.kpi.pax) || null;
  const exRevM = (o) => (o && o.is && o.is.revTotal != null ? (o.is.revTotal - (o.is.revConstruction || 0)) / 1000 : null); // Ps. M, ex-IFRIC 12
  const guidanceFor = (fy) => { const vs = GV.filter((v) => v.fy === fy); return vs.length ? vs[vs.length - 1] : null; };
  function guidanceMid(v) {
    if (!v) return null; const it = v.items || {}; const m = (k) => gMid(GM.find((x) => x.k === k), it[k]);
    const o = { fy: v.fy, date: v.date, traffic: m('traffic'), revTotal: m('revTotal'), ebitda: m('ebitda'), margin: m('ebitdaMargin'), capex: m('capex') };
    return o.traffic != null && o.revTotal != null && (o.ebitda != null || o.margin != null) ? o : null;
  }
  function consensusFor(fy) {
    const e = PEERS.own && PEERS.own.fy && PEERS.own.fy[String(fy)]; const c = e && e.ebitda;
    if (!c || c.mean == null || (c.count || 0) < (D.minAnalysts || 3)) return null;
    return { fy, mean: c.mean, median: c.median, high: c.high, low: c.low, count: c.count, date: (PEERS.own.ntm && PEERS.own.ntm.estimateDate) || PEERS.estimateDate || PEERS.updatedAt || null };
  }
  // Capex per explicit year: the PMD's annual pace (regulation.mdp: total over its years) unless reference.js fixes a profile.
  function capexDefaults(years) {
    if (Array.isArray(D.capexMxnM) && D.capexMxnM.length === years.length) return D.capexMxnM.slice();
    const mdp = REF.regulation && REF.regulation.mdp; const m = mdp && mdp.period && String(mdp.period).match(/(\d{4})\D+(\d{4})/);
    const pace = mdp && mdp.capexMxnBn && m ? Math.round(1000 * mdp.capexMxnBn / (+m[2] - +m[1] + 1) / 100) * 100 : 10000;
    return years.map(() => pace);
  }
  const mdpPace = () => capexDefaults([0])[0];
  function dcfDefaults() {
    const fy = lastQ ? lastQ.fy : new Date().getFullYear(), q = lastQ ? lastQ.q : 4;
    const years = Array.from({ length: 5 }, (_, i) => fy + 1 + i);
    const ltm = lastLTM && lastLTM.is ? lastLTM.is : {};
    const gCur = guidanceMid(guidanceFor(q < 4 ? fy : fy + 1));
    const revEx = exRevM(lastLTM) || 0;
    return {
      fy, q, years,
      trafficG: (D.trafficGrowthPct || [2, 4, 4, 3.5, 3.5]).slice(0, 5), revPaxG: D.revPerPaxGrowthPct ?? 5,
      margin: D.ebitdaMarginPct ?? (gCur && gCur.margin != null ? gCur.margin : ltm.ebitdaMarginExIfric ? Math.round(10 * ltm.ebitdaMarginExIfric) / 10 : 67),
      capex: capexDefaults(years),
      daPct: D.daPctRevenue ?? (revEx && ltm.da ? Math.round(1000 * (ltm.da / 1000) / revEx) / 10 : 9), tax: D.taxRatePct ?? 30, nwc: D.nwcPctDeltaRevenue ?? 5,
      rf: D.riskFreePct ?? (mx10.length ? mx10[mx10.length - 1][1] : 9.5), erp: D.erpPct ?? 5, beta: BETA ? BETA.beta : (D.beta ?? 0.9), kd: KD ? KD.rate : (D.costOfDebtPct ?? 10), dw: D.targetDebtPct ?? 25,
      method: D.terminalMethod || 'annuity', g: D.terminalGrowthPct ?? 4, renew: D.renewalPct ?? 0, mult: D.exitMultiple ?? 11, endYear: D.concessionEnd || 2048,
      anchor: D.anchorConsensus !== false,
    };
  }
  // Period label of the stub column (the months of the current fiscal year after the latest balance sheet).
  const stubLabel = (year, q) => { const yy = String(year).slice(2); return q === 2 ? (LANG === 'es' ? `2S${yy}E` : `2H${yy}E`) : q === 3 ? (LANG === 'es' ? `4T${yy}E` : `4Q${yy}E`) : (LANG === 'es' ? `T2–T4 ${yy}E` : `Q2–Q4 ${yy}E`); };
  const basisLabel = (x) => (x.basis === 'guidance' ? (LANG === 'es' ? 'guía' : 'guidance') : x.basis === 'consensus' ? (LANG === 'es' ? `consenso (${x.consensus.count})` : `consensus (${x.consensus.count})`) : (LANG === 'es' ? 'modelo' : 'model'));
  function dcfCompute(s, over = {}) {
    const p = { ...s, ...over };
    const wacc = (1 - p.dw / 100) * (p.rf + p.beta * p.erp) / 100 + (p.dw / 100) * (p.kd / 100) * (1 - p.tax / 100);
    // Base: the last complete fiscal year (the current one when the latest quarter is the fourth); the LTM only as a fallback.
    let base = fyActual(p.q === 4 ? p.fy : p.fy - 1); let stub = p.q < 4 ? (4 - p.q) / 4 : 0;
    if (!base) { base = lastLTM; stub = 0; }
    const t0 = p.fy + p.q / 4; // the balance-sheet date as a fraction of the year (2Q26 → 2026.5): time zero of the discounting
    let prev = { pax: base && base.kpi ? base.kpi.pax : 0, rev: exRevM(base) || 0, ebitda: base && base.is && base.is.ebitda ? base.is.ebitda / 1000 : 0 };
    const ytd = stub ? ytdFor(lastQ) : null;
    const yrs = stub ? [p.fy, ...p.years] : p.years.slice();
    const rows = []; let pv = 0;
    for (const y of yrs) {
      const i = Math.max(0, y - (p.fy + 1)); const tg = p.trafficG[i] / 100;
      const gm = rows.length === 0 ? guidanceMid(guidanceFor(y)) : null, cs = consensusFor(y);
      let pax, rev, ebitda, capex, basis;
      if (gm) { // the first projected year on the company's own guidance midpoints (growth on the last complete fiscal year)
        pax = prev.pax * (1 + gm.traffic / 100); rev = prev.rev * (1 + gm.revTotal / 100);
        ebitda = gm.ebitda != null ? prev.ebitda * (1 + gm.ebitda / 100) : rev * gm.margin / 100;
        capex = gm.capex != null ? gm.capex : p.capex[i]; basis = 'guidance';
      } else if (p.anchor && cs) { ebitda = cs.mean; pax = prev.pax * (1 + tg); rev = ebitda / (p.margin / 100); capex = p.capex[i]; basis = 'consensus'; }
      else { pax = prev.pax * (1 + tg); rev = prev.rev * (1 + tg) * (1 + p.revPaxG / 100); ebitda = rev * p.margin / 100; capex = p.capex[i]; basis = 'model'; }
      const da = rev * p.daPct / 100, dnwc = (rev - prev.rev) * p.nwc / 100;
      let f = { pax, rev, ebitda, da, capex, dnwc }, tt;
      if (y === p.fy && stub) { // the rest of the current year: full-year figures less what the year-to-date statements already carry
        const yi = (ytd && ytd.is) || {}, yk = (ytd && ytd.kpi) || {}, yc = (ytd && ytd.cf) || {};
        const yRev = yi.revTotal != null ? (yi.revTotal - (yi.revConstruction || 0)) / 1000 : rev * (1 - stub);
        f = { pax: pax - (yk.pax != null ? yk.pax : pax * (1 - stub)), rev: rev - yRev, ebitda: ebitda - (yi.ebitda != null ? yi.ebitda / 1000 : ebitda * (1 - stub)),
          da: Math.max(0, da - (yi.da != null ? yi.da / 1000 : da * (1 - stub))), capex: Math.max(0, capex - (yc.capex != null ? -yc.capex / 1000 : capex * (1 - stub))), dnwc: dnwc * stub };
        tt = (y + 1 - stub / 2) - t0;
      } else tt = y + 0.5 - t0;
      const ebit = f.ebitda - f.da, taxes = Math.max(0, ebit) * p.tax / 100, fcf = f.ebitda - taxes - f.capex - f.dnwc, df = Math.pow(1 + wacc, -tt);
      pv += fcf * df;
      rows.push({ year: y, stub: y === p.fy && !!stub, basis, ...f, ebit, taxes, fcf, t: tt, df, pv: fcf * df, fy: { pax, rev, ebitda, da, capex }, consensus: cs, guidance: gm });
      prev = { pax, rev, ebitda };
    }
    // Terminal value, measured at the mid-point of the last explicit year (flows after it keep the mid-year timing).
    const last = rows[rows.length - 1]; const g = p.g / 100; const r = (1 + g) / (1 + wacc); const n = Math.max(0, p.endYear - last.year);
    const fcf6 = last.fcf * (1 + g);
    const perp = wacc > g ? fcf6 / (wacc - g) : NaN;                                                          // Gordon
    const annuity = Math.abs(1 - r) < 1e-12 ? fcf6 * n / (1 + wacc) : fcf6 / (1 + wacc) * (1 - Math.pow(r, n)) / (1 - r); // n flows, nothing after
    const renew = Math.min(1, Math.max(0, (p.renew || 0) / 100));
    let tv, tvT;
    if (p.method === 'multiple') { tv = last.fy.ebitda * p.mult; tvT = last.t + 0.5; }   // a sale at the end of the last explicit year
    else if (p.method === 'perpetuity') { tv = perp; tvT = last.t; }
    else { tv = renew > 0 ? annuity + renew * (perp - annuity) : annuity; tvT = last.t; }
    const dfTv = Math.pow(1 + wacc, -tvT); const pvTv = tv * dfTv; const ev = pv + pvTv;
    const nd = netDebt(lastQ); const netDebtM = nd ? nd.net / 1000 : 0; const nciM = lastQ && lastQ.bs && lastQ.bs.nci ? lastQ.bs.nci / 1000 : 0;
    const eq = ev - netDebtM - nciM; const perShare = sharesNow ? eq * 1e6 / sharesNow : null;
    const ltmE = lastLTM && lastLTM.is && lastLTM.is.ebitda ? lastLTM.is.ebitda / 1000 : null; const first = rows.find((x) => !x.stub) || last;
    return { wacc, rows, stub, base, tv, tvT, dfTv, pvTv, pvExplicit: pv, ev, netDebtM, nciM, eq, perShare, annuity, perp, n, last, first, impliedMult: ltmE ? ev / ltmE : null, impliedMultNext: first.fy.ebitda ? ev / first.fy.ebitda : null };
  }
  // Allowed range of an input; the concession end must fall after the last explicit year.
  const dcfLimits = (s, k) => (k === 'endYear' ? [s.years[s.years.length - 1] + 1, DCF_LIMITS.endYear[1]] : DCF_LIMITS[k] || [-Infinity, Infinity]);
  function dcfInputsHtml(s) {
    const lim = (k) => dcfLimits(s, k);
    const num = (k, step = 0.1) => `<input type="number" step="${step}" min="${dcfLimits(s, k)[0]}" max="${dcfLimits(s, k)[1]}" data-k="${k}" value="${s[k]}" inputmode="decimal">`;
    const row = (name, sub, ctl) => `<div class="inp"><div class="name">${name}${sub ? `<small>${sub}</small>` : ''}</div>${ctl}<div class="warn" hidden></div></div>`;
    const arr = (k, step, name, sub) => `<div class="inp years"><div class="name">${name}${sub ? `<small>${sub}</small>` : ''}</div><div class="row5">${s.years.map((y) => `<span>${y}</span>`).join('')}${s[k].map((v, i) => `<input type="number" step="${step}" min="${lim(k)[0]}" max="${lim(k)[1]}" data-k="${k}" data-i="${i}" value="${v}" inputmode="decimal">`).join('')}</div><div class="warn" hidden></div></div>`;
    const es = LANG === 'es';
    // Anchor line: what the first projected year and the consensus years rest on, composed from guidance.js and peers.js.
    const gm = guidanceMid(guidanceFor(s.q < 4 ? s.fy : s.fy + 1)); const cs = s.years.map(consensusFor).filter(Boolean);
    const gTxt = gm ? (es ? `<b>${s.q < 4 ? stubLabel(s.fy, s.q) : s.fy + 1 + 'E'}:</b> punto medio de la guía ${gm.fy} de GAP (${fmtDate(gm.date)}): tráfico ${fmtPct(gm.traffic, 1, true)}, ingresos ${fmtPct(gm.revTotal, 1, true)}, ${gm.ebitda != null ? `EBITDA ${fmtPct(gm.ebitda, 1, true)}` : `margen ${fmtPct(gm.margin, 1)}`}${gm.capex != null ? `, capex Ps. ${fmtN(gm.capex)} M` : ''}` : `<b>${s.q < 4 ? stubLabel(s.fy, s.q) : s.fy + 1 + 'E'}:</b> midpoint of GAP's ${gm.fy} guidance (${fmtDate(gm.date)}): traffic ${fmtPct(gm.traffic, 1, true)}, revenue ${fmtPct(gm.revTotal, 1, true)}, ${gm.ebitda != null ? `EBITDA ${fmtPct(gm.ebitda, 1, true)}` : `margin ${fmtPct(gm.margin, 1)}`}${gm.capex != null ? `, capex Ps. ${fmtN(gm.capex)} M` : ''}`) : (es ? `Sin guía de GAP para ${s.q < 4 ? s.fy : s.fy + 1}: ese año sigue los supuestos de abajo` : `No GAP guidance for ${s.q < 4 ? s.fy : s.fy + 1}: that year follows the drivers below`);
    const cTxt = cs.length ? (es ? `<b>${cs.map((c) => c.fy + 'E').join('–')}:</b> EBITDA del consenso FactSet (media de ${cs.map((c) => c.count).join(' y ')} analistas, ${fmtDate(cs[0].date)}); después, los supuestos de abajo.` : `<b>${cs.map((c) => c.fy + 'E').join('–')}:</b> FactSet consensus EBITDA (mean of ${cs.map((c) => c.count).join(' and ')} analysts, ${fmtDate(cs[0].date)}); the drivers below after that.`) : (es ? 'Sin consenso FactSet por año fiscal: todos los años siguen los supuestos de abajo.' : 'No FactSet consensus by fiscal year: every year follows the drivers below.');
    const anchor = `<div class="anchor">${gTxt}. ${cTxt}${cs.length ? `<label class="switch"><input type="checkbox" data-k="anchor"${s.anchor ? ' checked' : ''}><span>${es ? 'Usar el consenso FactSet' : 'Use the FactSet consensus'}</span></label>` : ''}</div>`;
    // Sub-labels composed from the data: LTM revenue per passenger growth, LTM margin, the PMD's pace, GAP's leverage at market.
    const ltm = lastLTM && lastLTM.is ? lastLTM.is : {}; const prevLtm = lastQ ? ltmFor(qById[yoyQid(lastQ)] || null) : null;
    const rpp = (o) => (o && o.kpi && o.kpi.pax && exRevM(o) ? 1000 * exRevM(o) / o.kpi.pax : null);
    const rppG = rpp(lastLTM) && rpp(prevLtm) ? 100 * (rpp(lastLTM) / rpp(prevLtm) - 1) : null;
    const price = lastPx ? lastPx[1] : null; const nd = netDebt(lastQ); const mcap = price && sharesNow ? price * sharesNow / 1e6 : null;
    const dwNow = nd && mcap ? { gross: 100 * (nd.gross / 1000) / (nd.gross / 1000 + mcap), net: 100 * (nd.net / 1000) / (nd.net / 1000 + mcap) } : null;
    const mdp = REF.regulation && REF.regulation.mdp; const own = PEERS.own || {};
    const capexSub = es ? `${gm && gm.capex != null ? `${gm.fy}: guía Ps. ${fmtN(gm.capex)} M · ` : ''}${mdp && mdp.capexMxnBn ? `PMD ${mdp.period}: más de Ps. ${fmtN(mdp.capexMxnBn)} mil M en cinco años (Ps. ${fmtN(mdpPace())} M al año); el siguiente PMD no está aprobado` : 'perfil de reference.js'}` : `${gm && gm.capex != null ? `${gm.fy}: guidance Ps. ${fmtN(gm.capex)} M · ` : ''}${mdp && mdp.capexMxnBn ? `PMD ${mdp.period}: over Ps. ${fmtN(mdp.capexMxnBn)} bn in five years (Ps. ${fmtN(mdpPace())} M a year); the next PMD is not approved yet` : 'profile from reference.js'}`;
    const note = (k) => (D.notes && D.notes[k] ? L(D.notes[k]) : '');
    return `
      ${anchor}
      <h4>${tc(es ? 'Operación' : 'Operations')}</h4>
      ${arr('trafficG', 0.5, t('trafficG') + ' (%)', es ? `${s.fy + 1}+: después de la guía ${s.fy} (${gm ? fmtPct(gm.traffic, 1, true) : '—'}); 2019–${s.fy - 1}: ${fyActual(s.fy - 1) && fyActual(2019) ? fmtPct(100 * (Math.pow(fyActual(s.fy - 1).kpi.pax / fyActual(2019).kpi.pax, 1 / (s.fy - 1 - 2019)) - 1), 1, true) + ' anual' : '—'}` : `${s.fy + 1}+: after the ${s.fy} guidance (${gm ? fmtPct(gm.traffic, 1, true) : '—'}); 2019–${s.fy - 1}: ${fyActual(s.fy - 1) && fyActual(2019) ? fmtPct(100 * (Math.pow(fyActual(s.fy - 1).kpi.pax / fyActual(2019).kpi.pax, 1 / (s.fy - 1 - 2019)) - 1), 1, true) + ' a year' : '—'}`)}
      ${row(es ? 'Ingreso por pasajero, crecimiento anual (%)' : 'Revenue per passenger, annual growth (%)', es ? `tarifa máxima 2025–29 indexada a inflación + comercial · UDM: ${rppG != null ? fmtPct(rppG, 1, true) : '—'}` : `2025–29 maximum tariff indexed to inflation + commercial · LTM: ${rppG != null ? fmtPct(rppG, 1, true) : '—'}`, num('revPaxG', 0.5))}
      ${row(es ? 'Margen EBITDA sin IFRIC 12 (%)' : 'EBITDA margin ex-IFRIC 12 (%)', es ? `UDM: ${fmtPct(ltm.ebitdaMarginExIfric)}${gm && gm.margin != null ? ` · guía ${gm.fy}: ${fmtPct(gm.margin, 0)}` : ''}` : `LTM: ${fmtPct(ltm.ebitdaMarginExIfric)}${gm && gm.margin != null ? ` · ${gm.fy} guidance: ${fmtPct(gm.margin, 0)}` : ''}`, num('margin', 0.5))}
      ${arr('capex', 500, 'Capex (Ps. M)', capexSub)}
      ${row(es ? 'D&A (% de ingresos)' : 'D&A (% of revenue)', es ? `UDM: ${ltm.da && exRevM(lastLTM) ? fmtPct(100 * (ltm.da / 1000) / exRevM(lastLTM)) : '—'}` : `LTM: ${ltm.da && exRevM(lastLTM) ? fmtPct(100 * (ltm.da / 1000) / exRevM(lastLTM)) : '—'}`, num('daPct', 0.5))}
      ${row(es ? 'Tasa de impuestos (%)' : 'Tax rate (%)', es ? 'sobre EBITDA − D&A; tasa legal 30%' : 'on EBITDA − D&A; statutory rate 30%', num('tax', 1))}
      ${row(es ? 'Δ capital de trabajo (% de Δ ingresos)' : 'Δ working capital (% of Δ revenue)', '', num('nwc', 1))}
      <h4>${tc(es ? 'Costo de capital' : 'Cost of capital')}</h4>
      ${row(es ? 'Tasa libre de riesgo (%)' : 'Risk-free rate (%)', es ? `Bono M 10 años (Banxico, subasta): ${mx10.length ? fmtPct(mx10[mx10.length - 1][1], 2) + ' ' + fmtDate(mx10[mx10.length - 1][0]) : 'n/d'}` : `MX 10-yr bond (Banxico auction): ${mx10.length ? fmtPct(mx10[mx10.length - 1][1], 2) + ' ' + fmtDate(mx10[mx10.length - 1][0]) : 'n/a'}`, num('rf', 0.1))}
      ${row(es ? 'Prima de riesgo de mercado (%)' : 'Equity risk premium (%)', note('erp'), num('erp', 0.25))}
      ${row('Beta', BETA ? (es ? `calculada: ${BETA.weeks} rendimientos semanales GAPB vs IPC desde ${fmtDate(BETA.from)}` : `computed: ${BETA.weeks} weekly returns GAPB vs IPC since ${fmtDate(BETA.from)}`) : (es ? 'supuesto de referencia' : 'reference default'), num('beta', 0.05))}
      ${row(es ? 'Costo de deuda antes de impuestos (%)' : 'Pre-tax cost of debt (%)', KD ? (es ? `${KD.name}: ${fmtPct(KD.rate, 2)} fija, último bono a tasa fija (${fmtDate(KD.issued)})` : `${KD.name}: ${fmtPct(KD.rate, 2)} fixed, latest fixed-rate bond (${fmtDate(KD.issued)})`) : '', num('kd', 0.1))}
      ${row(es ? 'Deuda / (deuda + capital) (%)' : 'Debt / (debt + equity) (%)', dwNow ? (es ? `GAP hoy a valor de mercado: deuda bruta ${fmtPct(dwNow.gross, 0)}, neta ${fmtPct(dwNow.net, 0)}` : `GAP today at market values: gross debt ${fmtPct(dwNow.gross, 0)}, net ${fmtPct(dwNow.net, 0)}`) : '', num('dw', 1))}
      <h4>${tc(t('tv'))}</h4>
      ${row(es ? 'Método' : 'Method', '', `<select data-k="method"><option value="annuity"${s.method === 'annuity' ? ' selected' : ''}>${es ? 'Anualidad hasta ' + s.endYear : 'Annuity to ' + s.endYear}</option><option value="perpetuity"${s.method === 'perpetuity' ? ' selected' : ''}>${es ? 'Perpetuidad (Gordon)' : 'Perpetuity (Gordon)'}</option><option value="multiple"${s.method === 'multiple' ? ' selected' : ''}>${es ? 'Múltiplo de salida' : 'Exit multiple'}</option></select>`)}
      ${row(es ? 'Crecimiento terminal (%)' : 'Terminal growth (%)', note('g'), num('g', 0.25))}
      ${row(es ? 'Probabilidad de renovación de la concesión (%)' : 'Concession renewal probability (%)', note('renew'), num('renew', 5))}
      ${row(es ? 'Múltiplo de salida VE/EBITDA' : 'Exit EV/EBITDA multiple', own.evEbitdaNtm ? (es ? `GAP VE/EBITDA NTM: ${fmtX(own.evEbitdaNtm)} hoy${own.evEbitdaNtmAvg5y ? `, ${fmtX(own.evEbitdaNtmAvg5y)} promedio 5 años` : ''} (FactSet)` : `GAP NTM EV/EBITDA: ${fmtX(own.evEbitdaNtm)} now${own.evEbitdaNtmAvg5y ? `, ${fmtX(own.evEbitdaNtmAvg5y)} 5-year average` : ''} (FactSet)`) : '', num('mult', 0.5))}
      ${row(es ? 'Fin de concesión (año)' : 'Concession end (year)', es ? 'México: 2048' : 'Mexico: 2048', num('endYear', 1))}
      <div style="margin-top:14px"><button type="button" class="btn" id="dcfReset">${es ? 'Restablecer supuestos' : 'Reset assumptions'}</button></div>`;
  }
  // Validation: a value outside its range (or empty) is refused; the field turns red, the row says the allowed range and the
  // last valid value stays in force. Two cross-checks after each computation: g below the WACC when flows continue after the
  // explicit period, and a concession end after the last explicit year.
  function dcfWarnings(box, r) {
    const s = dcfState.s, es = LANG === 'es'; const bad = dcfState.bad; const rows = new Map();
    box.querySelectorAll('input[type=number]').forEach((inp) => { const id = inp.dataset.k + (inp.dataset.i != null ? ':' + inp.dataset.i : ''); inp.classList.toggle('bad', !!bad[id]); });
    for (const [id, b] of Object.entries(bad)) { const [k, i] = id.split(':'); const yr = i != null ? s.years[+i] + ': ' : ''; const fl = (v) => (k === 'endYear' ? String(v) : fmtN(v, v % 1 ? 2 : 0)); const msg = es ? `${yr}capture un valor entre ${fl(b.lim[0])} y ${fl(b.lim[1])}` : `${yr}enter a value between ${fl(b.lim[0])} and ${fl(b.lim[1])}`; rows.set(k, (rows.get(k) ? rows.get(k) + ' · ' : '') + msg); }
    if (r) {
      const flowsOn = s.method === 'perpetuity' || (s.method === 'annuity' && s.renew > 0);
      if (flowsOn && !(r.wacc > s.g / 100)) rows.set('g', (rows.get('g') ? rows.get('g') + ' · ' : '') + (es ? `debe ser menor que el WACC (${fmtPct(100 * r.wacc, 2)}) para que la perpetuidad sea finita` : `must be below the WACC (${fmtPct(100 * r.wacc, 2)}) for the perpetuity to be finite`));
      if (s.method === 'annuity' && s.endYear <= r.last.year) rows.set('endYear', (rows.get('endYear') ? rows.get('endYear') + ' · ' : '') + (es ? `debe ser posterior al último año explícito (${r.last.year})` : `must be after the last explicit year (${r.last.year})`));
    }
    box.querySelectorAll('.inp').forEach((row) => { const inp = row.querySelector('input[type=number], select'); const k = inp && inp.dataset.k; const w = row.querySelector('.warn'); if (!w) return; const msg = k && rows.get(k); w.textContent = msg || ''; w.hidden = !msg; });
    const nBad = Object.keys(bad).length;
    const wl = el('dcfWarn'); if (wl) wl.textContent = nBad ? (es ? `${nBad} ${nBad === 1 ? 'entrada fuera de rango' : 'entradas fuera de rango'}: los resultados usan el último valor válido.` : `${nBad} ${nBad === 1 ? 'input is' : 'inputs are'} out of range: the results use the last valid value.`) : '';
  }
  function renderDcf(reset) {
    if (!DCF_ON) return;
    if (reset || !dcfState.s) dcfState.s = dcfDefaults();
    dcfState.bad = {};
    const s = dcfState.s;
    const box = el('dcfInputs'); box.innerHTML = dcfInputsHtml(s); box.querySelectorAll('.inp').forEach((r, ri) => { const name = ((r.querySelector('.name') || {}).textContent || '').replace(/\s+/g, ' ').trim(); const yrs = [...r.querySelectorAll('.row5 span')].map((x) => x.textContent.trim()); r.querySelectorAll('input').forEach((inp, i) => { inp.id = inp.id || `dcf-${ri}-${i}`; inp.setAttribute('aria-label', yrs.length ? `${name} ${yrs[i] || ''}`.trim() : name); }); });
    box.querySelectorAll('input,select').forEach((inp) => inp.addEventListener('input', () => {
      const k = inp.dataset.k;
      if (inp.type === 'checkbox') { s[k] = inp.checked; renderDcfOutputs(); return; }
      if (inp.tagName === 'SELECT') { s[k] = inp.value; renderDcfOutputs(); return; }
      const lim = dcfLimits(s, k); const v = inp.value.trim() === '' ? NaN : Number(inp.value); const id = k + (inp.dataset.i != null ? ':' + inp.dataset.i : '');
      if (!isFinite(v) || v < lim[0] || v > lim[1]) { dcfState.bad[id] = { lim, v }; renderDcfOutputs(); return; } // refused: the last valid value stays in force
      delete dcfState.bad[id];
      if (inp.dataset.i != null) s[k][+inp.dataset.i] = v; else s[k] = v;
      renderDcfOutputs();
    }));
    el('dcfReset').addEventListener('click', () => renderDcf(true));
    renderDcfOutputs();
    const nd = netDebt(lastQ);
    html('dcfMeta', LANG === 'es'
      ? `Base: balance al ${lastQ ? qLabel(lastQ) : '—'} (deuda neta Ps. ${nd ? fmtM(nd.net) : '—'} M, participación no controladora Ps. ${lastQ && lastQ.bs && lastQ.bs.nci != null ? fmtM(lastQ.bs.nci) : '—'} M); ${fmtN(sharesNow)} acciones; precio Ps. ${lastPx ? fmtN(lastPx[1], 2) : '—'} (${lastPx ? fmtDate(lastPx[0]) : '—'}). Flujos: resto de ${s.fy}${s.q < 4 ? '' : ' no aplica'} y cinco años fiscales completos sobre el año fiscal ${s.q === 4 ? s.fy : s.fy - 1} reportado, descontados a mitad de periodo desde esa fecha de balance; cifras sin IFRIC 12.`
      : `Base: balance sheet at ${lastQ ? qLabel(lastQ) : '—'} (net debt Ps. ${nd ? fmtM(nd.net) : '—'} M, non-controlling interest Ps. ${lastQ && lastQ.bs && lastQ.bs.nci != null ? fmtM(lastQ.bs.nci) : '—'} M); ${fmtN(sharesNow)} shares; price Ps. ${lastPx ? fmtN(lastPx[1], 2) : '—'} (${lastPx ? fmtDate(lastPx[0]) : '—'}). Flows: the rest of ${s.fy} and five full fiscal years built on the reported fiscal year ${s.q === 4 ? s.fy : s.fy - 1}, discounted at mid-period from that balance-sheet date; figures ex-IFRIC 12.`);
  }
  function renderDcfOutputs() {
    const s = dcfState.s; const r = dcfCompute(s); const es = LANG === 'es';
    const price = lastPx ? lastPx[1] : null; const own = PEERS.own || {};
    el('dcfHero').textContent = r.perShare != null && isFinite(r.perShare) ? 'Ps. ' + fmtN(r.perShare, 0) : '—';
    el('dcfHeroLbl').textContent = `${t('perShare')}${price && r.perShare != null && isFinite(r.perShare) ? ` · ${fmtPct(100 * (r.perShare / price - 1), 1, true)} ${t('upside')} (Ps. ${fmtN(price, 2)})` : ''}`;
    // Bridges to the market price, every one a recomputation of the same model: the WACC that returns the price (bisection on
    // the risk-free rate), the value with the concessions renewed, the renewal probability or exit multiple the price implies.
    let implied = null, vPerp = null, pImplied = null, vExit5 = null, multImplied = null, evMkt = null;
    if (price && r.perShare != null && isFinite(r.perShare)) {
      let lo = -20, hi = 40; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; const v = dcfCompute(s, { rf: mid }).perShare; if (!isFinite(v) || v > price) lo = mid; else hi = mid; }
      implied = dcfCompute(s, { rf: (lo + hi) / 2 }).wacc;
      evMkt = price * sharesNow / 1e6 + r.netDebtM + r.nciM;
      vPerp = dcfCompute(s, { method: 'perpetuity' }).perShare;
      if (s.method === 'annuity' && isFinite(r.perp) && r.perp !== r.annuity) pImplied = ((evMkt - r.pvExplicit) / r.dfTv - r.annuity) / (r.perp - r.annuity);
      if (own.evEbitdaNtmAvg5y) vExit5 = dcfCompute(s, { method: 'multiple', mult: own.evEbitdaNtmAvg5y }).perShare;
      if (r.last.fy.ebitda > 0) multImplied = (evMkt - r.pvExplicit) / Math.pow(1 + r.wacc, -(r.last.t + 0.5)) / r.last.fy.ebitda;
    }
    const tgt = own.target && own.target.mean ? own.target : null;
    const outs = [
      { v: fmtPct(100 * r.wacc, 2), l: t('wacc') + (implied != null && isFinite(implied) ? ` · ${es ? 'implícito por el mercado' : 'market-implied'} ${fmtPct(100 * implied, 1)}` : '') },
      { v: 'Ps. ' + fmtN(r.ev / 1000, 1) + (es ? ' mil M' : ' bn'), l: t('ev') },
      { v: 'Ps. ' + fmtN(r.eq / 1000, 1) + (es ? ' mil M' : ' bn'), l: es ? 'Valor del capital' : 'Equity value' },
      { v: fmtPct(100 * r.pvTv / r.ev, 0), l: es ? 'VP del valor terminal / VE' : 'PV of terminal value / EV' },
      { v: fmtX(r.impliedMult), l: (es ? 'VE / EBITDA UDM implícito' : 'Implied EV / LTM EBITDA') + (r.impliedMultNext ? ` · ${r.first.year}E ${fmtX(r.impliedMultNext)}` : '') },
      { v: 'Ps. ' + fmtN(r.netDebtM + r.nciM, 0) + ' M', l: es ? 'Deuda neta + minoritarios' : 'Net debt + minorities' },
      { v: vPerp != null && isFinite(vPerp) ? 'Ps. ' + fmtN(vPerp, 0) : '—', l: es ? `Por acción con la concesión renovada (perpetuidad al ${fmtPct(s.g)}, mismos supuestos)` : `Per share with the concession renewed (perpetuity at ${fmtPct(s.g)}, same inputs)` },
      { v: vExit5 != null && isFinite(vExit5) ? 'Ps. ' + fmtN(vExit5, 0) : '—', l: own.evEbitdaNtmAvg5y ? (es ? `Por acción con salida a ${fmtX(own.evEbitdaNtmAvg5y)} (VE/EBITDA NTM promedio 5 años de GAP, FactSet) sobre el EBITDA ${r.last.year}E` : `Per share with an exit at ${fmtX(own.evEbitdaNtmAvg5y)} (GAP's 5-year average NTM EV/EBITDA, FactSet) on ${r.last.year}E EBITDA`) : (es ? 'Salida al múltiplo promedio: sin dato FactSet' : 'Exit at the average multiple: no FactSet figure') },
      { v: tgt ? 'Ps. ' + fmtN(tgt.mean, 0) : '—', l: tgt ? (es ? `Precio objetivo promedio de ${tgt.count} analistas (Ps. ${fmtN(tgt.low, 0)}–${fmtN(tgt.high, 0)}, FactSet ${fmtDate(own.asOf || PEERS.updatedAt)})` : `Mean sell-side target of ${tgt.count} analysts (Ps. ${fmtN(tgt.low, 0)}–${fmtN(tgt.high, 0)}, FactSet ${fmtDate(own.asOf || PEERS.updatedAt)})`) : (es ? 'Precio objetivo del consenso: sin dato' : 'Consensus target: no figure') },
    ];
    html('dcfOutputs', outs.map((o) => `<div class="out"><div class="v">${o.v}</div><div class="l">${o.l}</div></div>`).join(''));
    const nAnn = Math.max(0, s.endYear - r.last.year);
    const tvTxt = s.method === 'annuity'
      ? (es ? `anualidad de ${nAnn} años (flujo de ${r.last.year}E creciendo ${fmtPct(s.g)} hasta ${s.endYear})${s.renew > 0 ? ` más ${fmtPct(s.renew, 0)} del valor de una perpetuidad después de ${s.endYear} (renovación)` : ', sin valor después del fin de la concesión'}` : `a ${nAnn}-year annuity (${r.last.year}E cash flow growing ${fmtPct(s.g)} until ${s.endYear})${s.renew > 0 ? ` plus ${fmtPct(s.renew, 0)} of a perpetuity's value after ${s.endYear} (renewal)` : ' with no value after the concession ends'}`)
      : s.method === 'perpetuity' ? (es ? 'perpetuidad de Gordon, que supone la renovación de las concesiones' : 'a Gordon perpetuity, which assumes the concessions are renewed') : (es ? `múltiplo de salida ${fmtX(s.mult)} sobre el EBITDA de ${r.last.year}E` : `a ${fmtX(s.mult)} exit multiple on ${r.last.year}E EBITDA`);
    const anchored = r.rows.filter((x) => x.basis !== 'model');
    const lblOf = (x) => (x.stub ? stubLabel(x.year, s.q) : x.year + 'E'); const gY = anchored.filter((x) => x.basis === 'guidance').map(lblOf), cY = anchored.filter((x) => x.basis === 'consensus').map(lblOf);
    const span = (a) => (a.length > 2 ? `${a[0]}–${a[a.length - 1]}` : a.join(es ? ' y ' : ' and '));
    const parts = [gY.length ? (es ? `${span(gY)} sigue la guía de GAP` : `${span(gY)} follows GAP's guidance`) : '', cY.length ? (es ? `${span(cY)} el consenso FactSet` : `${span(cY)} the FactSet consensus`) : ''].filter(Boolean);
    const anchTxt = parts.length ? ` ${parts.join(es ? ' y ' : ' and ')}; ${es ? 'los demás años, los supuestos de la tarjeta.' : 'the other years follow the inputs in the card.'}` : '';
    html('dcfNote', es
      ? `<b>Lectura.</b> El valor terminal se calcula por ${tvTxt}. Los flujos son a la firma, en pesos nominales, descontados a mitad de periodo desde el balance del ${qLabel(lastQ)}; los impuestos se aplican sobre la utilidad operativa (EBITDA − D&amp;A). El capex sigue el ritmo del PMD 2025–2029 y no genera ingreso IFRIC 12 en el modelo.${anchTxt}`
      : `<b>Reading it.</b> The terminal value uses ${tvTxt}. Flows are to the firm in nominal pesos, discounted at mid-period from the ${qLabel(lastQ)} balance sheet; taxes are charged on operating profit (EBITDA − D&amp;A). Capex follows the pace of the PMD 2025–2029 and generates no IFRIC 12 revenue in the model.${anchTxt}`);
    // Gap to market: composed from the bridges above and from peers.js (consensus EBITDA, target prices).
    const gapEl = el('dcfGap');
    if (gapEl) {
      if (!(price && r.perShare != null && isFinite(r.perShare))) gapEl.innerHTML = '';
      else {
        const dPct = 100 * (r.perShare / price - 1); const pct = (v) => fmtPct(100 * (v / price - 1), 0, true);
        const misses = r.rows.filter((x) => x.consensus && x.basis !== 'consensus' && x.fy.ebitda).map((x) => `${x.year}E (${x.basis === 'guidance' ? (es ? 'guía' : 'guidance') : (es ? 'modelo' : 'model')}) ${fmtPct(100 * (x.fy.ebitda / x.consensus.mean - 1), 0, true)}`);
        const p1 = es ? `<b>Brecha frente al mercado.</b> Con estos supuestos el modelo queda ${fmtPct(Math.abs(dPct), 0)} ${dPct < 0 ? 'por debajo' : 'por encima'} del precio (Ps. ${fmtN(price, 2)}, ${fmtDate(lastPx[0])}); el precio implica un WACC de ${implied != null && isFinite(implied) ? fmtPct(100 * implied, 1) : '—'} con los mismos flujos.` : `<b>Gap to market.</b> At these inputs the model sits ${fmtPct(Math.abs(dPct), 0)} ${dPct < 0 ? 'below' : 'above'} the price (Ps. ${fmtN(price, 2)}, ${fmtDate(lastPx[0])}); the price implies a WACC of ${implied != null && isFinite(implied) ? fmtPct(100 * implied, 1) : '—'} on the same flows.`;
        let p2 = '';
        if (s.method === 'annuity' && vPerp != null && isFinite(vPerp)) {
          const pTxt = pImplied == null || !isFinite(pImplied) ? '' : pImplied > 1 ? (es ? ` Ni la renovación plena alcanza el precio: hace falta además un WACC menor o flujos mayores.` : ` Even full renewal does not reach the price: it also needs a lower WACC or larger flows.`) : pImplied < 0 ? (es ? ` El precio está por debajo del valor sin renovación.` : ` The price is below the no-renewal value.`) : (es ? ` El precio implica una probabilidad de renovación de ${fmtPct(100 * pImplied, 0)}.` : ` The price implies a renewal probability of ${fmtPct(100 * pImplied, 0)}.`);
          p2 = es ? ` La mayor parte de la brecha es el fin de la concesión: ${s.renew > 0 ? `el caso base pondera la renovación al ${fmtPct(s.renew, 0)}` : 'el caso base no asigna valor después de ' + s.endYear}; con las concesiones renovadas (perpetuidad al ${fmtPct(s.g)}) el valor es Ps. ${fmtN(vPerp, 0)} (${pct(vPerp)} vs. precio).${pTxt}` : ` Most of the gap is the concession's end: ${s.renew > 0 ? `the base case weights renewal at ${fmtPct(s.renew, 0)}` : 'the base case assigns no value after ' + s.endYear}; with the concessions renewed (perpetuity at ${fmtPct(s.g)}) the value is Ps. ${fmtN(vPerp, 0)} (${pct(vPerp)} vs. price).${pTxt}`;
        }
        const p3 = vExit5 != null && isFinite(vExit5) ? (es ? ` Una salida a ${fmtX(own.evEbitdaNtmAvg5y)} (VE/EBITDA NTM promedio de 5 años de GAP) sobre el EBITDA ${r.last.year}E da Ps. ${fmtN(vExit5, 0)} (${pct(vExit5)})${multImplied != null && isFinite(multImplied) ? `; el precio implica un múltiplo de salida de ${fmtX(multImplied)}` : ''}.` : ` An exit at ${fmtX(own.evEbitdaNtmAvg5y)} (GAP's 5-year average NTM EV/EBITDA) on ${r.last.year}E EBITDA gives Ps. ${fmtN(vExit5, 0)} (${pct(vExit5)})${multImplied != null && isFinite(multImplied) ? `; the price implies an exit multiple of ${fmtX(multImplied)}` : ''}.`) : '';
        const p4 = tgt ? (es ? ` Precio objetivo promedio del consenso: Ps. ${fmtN(tgt.mean, 0)} (${tgt.count} analistas, Ps. ${fmtN(tgt.low, 0)}–${fmtN(tgt.high, 0)}; FactSet, ${fmtDate(own.asOf || PEERS.updatedAt)}).` : ` Mean sell-side target: Ps. ${fmtN(tgt.mean, 0)} (${tgt.count} analysts, Ps. ${fmtN(tgt.low, 0)}–${fmtN(tgt.high, 0)}; FactSet, ${fmtDate(own.asOf || PEERS.updatedAt)}).`) : '';
        const p5 = misses.length ? (es ? ` EBITDA del modelo frente a la media del consenso: ${misses.join(', ')}.` : ` Model EBITDA versus the consensus mean: ${misses.join(', ')}.`) : '';
        gapEl.innerHTML = p1 + p2 + p3 + p4 + p5;
      }
    }
    // Projection table: one column per period (the stub first), a basis row under the headers, mid-period discount times.
    const cols = r.rows; const nCol = cols.length + 1;
    const colLbl = (x) => (x.stub ? stubLabel(x.year, s.q) : x.year + 'E');
    const hdr = `<tr><th>${es ? 'Periodo' : 'Period'}</th>${cols.map((x) => `<th>${colLbl(x)}</th>`).join('')}</tr><tr class="basis"><th>${es ? 'Base' : 'Basis'}</th>${cols.map((x) => `<th>${basisLabel(x)}</th>`).join('')}</tr>`;
    const line = (l, f, d = 0, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><td>${l}</td>${cols.map((x) => `<td>${fmtN(f(x), d)}</td>`).join('')}</tr>`;
    const pctLine = (l, f) => `<tr class="sub"><td>${l}</td>${cols.map((x) => `<td>${fmtPct(f(x), 1)}</td>`).join('')}</tr>`;
    html('dcfTable', `<table><thead>${hdr}</thead><tbody>
      ${line(t('pax'), (x) => x.pax)}
      ${line(t('revenue') + ' ' + t('exIfric'), (x) => x.rev)}
      ${line('EBITDA', (x) => x.ebitda)}
      ${pctLine(es ? 'Margen EBITDA' : 'EBITDA margin', (x) => (x.rev ? 100 * x.ebitda / x.rev : null))}
      ${line('− D&A', (x) => -x.da)}
      ${line(es ? '− Impuestos sobre EBIT' : '− Taxes on EBIT', (x) => -x.taxes)}
      ${line('− Capex', (x) => -x.capex)}
      ${line(es ? '− Δ capital de trabajo' : '− Δ working capital', (x) => -x.dnwc)}
      ${line(es ? 'Flujo libre a la firma' : 'Unlevered free cash flow', (x) => x.fcf, 0, 'total')}
      ${line(es ? 'Años hasta el flujo (mitad de periodo)' : 'Years to the flow (mid-period)', (x) => x.t, 2)}
      ${line(es ? 'Factor de descuento' : 'Discount factor', (x) => x.df, 3)}
      ${line(t('pv'), (x) => x.pv)}
      <tr class="head"><td colspan="${nCol}">${t('tv')} (${es ? 'a' : 'at'} ${fmtN(r.tvT, 2)} ${es ? 'años' : 'years'}): ${fmtN(r.tv)} · ${t('pv')}: ${fmtN(r.pvTv)} · ${es ? 'VP flujos explícitos' : 'PV explicit flows'}: ${fmtN(r.pvExplicit)} · ${es ? 'VE' : 'EV'}: ${fmtN(r.ev)}</td></tr></tbody></table>`);
    // Consensus comparison under the table: full fiscal-year EBITDA of the model beside FactSet's mean for the years it covers.
    const withCs = cols.filter((x) => x.consensus);
    const stubRow = cols.find((x) => x.stub);
    html('dcfTableNote', withCs.length
      ? (es ? `EBITDA por año fiscal completo, modelo vs. consenso FactSet (media; analistas): ${withCs.map((x) => `${x.year}E Ps. ${fmtN(x.fy.ebitda)} M vs. ${fmtN(x.consensus.mean)} M (${x.consensus.count})`).join(' · ')}.${stubRow ? ` La columna ${colLbl(stubRow)} es el año fiscal ${stubRow.year}E menos lo reportado a ${ytdLabel(stubRow.year, lastQ.q * 3)}.` : ''}` : `Full fiscal-year EBITDA, model vs. FactSet consensus (mean; analysts): ${withCs.map((x) => `${x.year}E Ps. ${fmtN(x.fy.ebitda)} M vs. ${fmtN(x.consensus.mean)} M (${x.consensus.count})`).join(' · ')}.${stubRow ? ` The ${colLbl(stubRow)} column is fiscal ${stubRow.year}E less the figures reported through ${ytdLabel(stubRow.year, lastQ.q * 3)}.` : ''}`)
      : (stubRow ? (es ? `La columna ${colLbl(stubRow)} es el año fiscal ${stubRow.year}E menos lo reportado a ${ytdLabel(stubRow.year, lastQ.q * 3)}.` : `The ${colLbl(stubRow)} column is fiscal ${stubRow.year}E less the figures reported through ${ytdLabel(stubRow.year, lastQ.q * 3)}.`) : ''));
    // sensitivity WACC x g (or multiple)
    const waccs = [-1, -0.5, 0, 0.5, 1].map((d) => r.wacc * 100 + d);
    const gs = s.method === 'multiple' ? [-2, -1, 0, 1, 2].map((d) => s.mult + d) : [-1, -0.5, 0, 0.5, 1].map((d) => s.g + d);
    const cell = (w, g) => { const over = s.method === 'multiple' ? { mult: g } : { g }; // solve for the rf that yields this wacc: shift rf by delta/(1-dw)
      const deltaW = w / 100 - r.wacc; over.rf = s.rf + 100 * deltaW / (1 - s.dw / 100); return dcfCompute(s, over).perShare; };
    html('dcfSens', `<table class="sens"><thead><tr><th scope="col">WACC ↓ / ${s.method === 'multiple' ? (es ? 'múltiplo →' : 'multiple →') : 'g →'}</th>${gs.map((g) => `<th scope="col">${s.method === 'multiple' ? fmtX(g) : fmtPct(g, 2)}</th>`).join('')}</tr></thead><tbody>${waccs.map((w, i) => `<tr><td>${fmtPct(w, 2)}</td>${gs.map((g, j) => { const v = cell(w, g); const now = i === 2 && j === 2; const hi = price && v > price; return `<td class="center ${hi ? 'hi' : ''} ${now ? 'now' : ''}">${fmtN(v, 0)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`);
    el('sensCap').textContent = es ? `Ps. por acción; sombreado = por encima del precio actual (Ps. ${fmtN(price, 2)}); recuadro = caso base` : `Ps. per share; shaded = above the current price (Ps. ${fmtN(price, 2)}); outlined = base case`;
    dcfWarnings(el('dcfInputs'), r);
  }

  // ================= 05 RELATIVE =================
  function renderRelative() {
    const nd = netDebt(lastQ); const ltm = lastLTM && lastLTM.is; const price = lastPx ? lastPx[1] : null;
    const rows = [];
    if (price && sharesNow && ltm) {
      const mcM = price * sharesNow / 1e6; const evM = nd ? mcM + nd.net / 1000 + (lastQ.bs.nci || 0) / 1000 : null;
      const revEx = (ltm.revTotal - (ltm.revConstruction || 0)) / 1000; const ni = ltm.netIncome / 1000; // P/E on net income (owner, 15-Oct-2026), not on comprehensive income
      const dpsLatest = (REF.dividends || []).slice(-1)[0];
      const fcf = lastLTM.cf && lastLTM.cf.cfo != null && lastLTM.cf.capex != null ? (lastLTM.cf.cfo + lastLTM.cf.capex) / 1000 : null;
      rows.push([t('mktCap'), 'Ps. ' + fmtN(mcM, 0) + ' M', `${fmtN(sharesNow)} × Ps. ${fmtN(price, 2)}`]);
      if (evM != null) rows.push([t('ev'), 'Ps. ' + fmtN(evM, 0) + ' M', `${t('mktCap')} + ${t('nd')} ${fmtM(nd.net)} + NCI ${fmtM(lastQ.bs.nci || 0)}`]);
      // NTM first (the site's default basis, FactSet consensus); the LTM rows follow, labeled (owner, 17-Oct-2026).
      const nm = ntmMultiples(lastPx, sharesNow, nd, lastQ);
      if (nm) rows.push([peL() + ' ' + ntmLbl(), fmtX(nm.pe), `${LANG === 'es' ? 'consenso FactSet UPA' : 'FactSet consensus EPS'} Ps. ${fmtN(nm.eps, 2)} (${fmtDate(nm.estimateDate)})`]);
      if (nm && nm.evEbitda != null) rows.push([evL() + ' / EBITDA ' + ntmLbl(), fmtX(nm.evEbitda), `${LANG === 'es' ? 'consenso FactSet' : 'FactSet consensus'} EBITDA ${fmtN(nm.ebitda)} M (${fmtDate(nm.estimateDate)})`]);
      rows.push([peL() + ' ' + ltmLbl(), fmtX(mcM / ni), `${LANG === 'es' ? 'utilidad neta UDM' : 'LTM net income'} ${fmtN(ni)} M`]);
      if (evM != null) rows.push([evL() + ' / EBITDA ' + ltmLbl(), fmtX(evM / (ltm.ebitda / 1000)), `EBITDA ${ltmLbl()} ${fmtM(ltm.ebitda)} M`]);
      if (evM != null) rows.push([evL() + ' / ' + (LANG === 'es' ? 'ingresos UDM sin IFRIC 12' : 'LTM revenue ex-IFRIC 12'), fmtX(evM / revEx), `${fmtN(revEx)} M`]);
      if (fcf != null) rows.push([LANG === 'es' ? 'Rendimiento FCF (CFO − capex) / cap.' : 'FCF yield (CFO − capex) / mkt cap', fmtPct(100 * fcf / mcM), `${fmtN(fcf)} M`]);
      if (dpsLatest) rows.push([LANG === 'es' ? 'Rendimiento por dividendo' : 'Dividend yield', fmtPct(100 * dpsLatest.dps / price), `Ps. ${fmtN(dpsLatest.dps, 2)} ${t('agm')} ${dpsLatest.agmYear}`]);
      if (nd && ltm.ebitda) rows.push([t('lev'), fmtX(nd.net / ltm.ebitda, 2), nd.basis === 'bs' ? (LANG === 'es' ? 'balance del trimestre' : "quarter's balance sheet") : (LANG === 'es' ? 'referencia (informe trimestral PDF / 20-F)' : 'reference (PDF quarterly report / 20-F)')]);
      rows.push([t('ebitdaMarginEx'), fmtPct(ltm.ebitdaMarginExIfric), LANG === 'es' ? 'UDM' : 'LTM']);
    }
    // Two columns: the metric with its basis beneath, the value on one line (owner, 17-Oct-2026: values never wrap, everything legible).
    html('multTable', `<table><thead><tr><th scope="col">${t('metric')} · <span class="basis-h">${t('basis')}</span></th><th scope="col">${t('value')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}<div class="basis muted">${r[2]}</div></td><td class="val">${r[1]}</td></tr>`).join('')}</tbody></table>`);
    el('multCap').textContent = lastPx ? `${t('price')} GAP B ${fmtDate(lastPx[0])} · ${LANG === 'es' ? 'estados financieros al' : 'financials as of'} ${lastQ ? qLabel(lastQ) : ''}` : '';
    // Forward multiples history: FactSet's weekly NTM series from the peers snapshot (owner, 17-Oct-2026: NTM, not the quarterly LTM
    // series). peers.js → gap.history.series rows are [Friday, EV/EBITDA NTM, P/E NTM]; the dashed line is the 5-year average of the table.
    renderForwardHistory();
    // peers (FactSet snapshot in data/peers.js; GAP row from this model, NTM denominators from consensus)
    renderPeers(price, sharesNow, ltm, nd);
    renderConsensus(price);
  }
  const ntmLbl = () => (LANG === 'es' ? 'PDM' : 'NTM');
  const ltmLbl = () => (LANG === 'es' ? 'UDM' : 'LTM');
  function renderForwardHistory() {
    const G = PEERS.gap; const hist = G && G.history && G.history.series; const cv = el('chartEvEbitda'); if (!cv) return;
    if (!hist || !hist.length) { html('evSrc', LANG === 'es' ? 'Historial de múltiplos PDM pendiente (instantánea de FactSet).' : 'NTM multiples history pending (FactSet snapshot).'); return; }
    const es = LANG === 'es', c = SERIES(); const labels = hist.map((p) => p[0]); const last = hist[hist.length - 1];
    const H = PEERS.history || {}; const from = H.from || labels[0], to = H.to || last[0];
    const tick = (v, i) => (labels[i] && labels[i].slice(5, 7) === '01' && (!labels[i - 1] || labels[i - 1].slice(0, 4) !== labels[i].slice(0, 4)) ? labels[i].slice(0, 4) : '');
    const avg = (k) => (G[k] != null ? labels.map(() => G[k]) : null);
    const sets = [
      { label: `${evL()}/EBITDA ${ntmLbl()}`, data: hist.map((p) => p[1]), borderColor: c[0], backgroundColor: c[0], borderWidth: 2, pointRadius: 0, yAxisID: 'y' },
      { label: `${peL()} ${ntmLbl()}`, data: hist.map((p) => p[2]), borderColor: c[1], backgroundColor: c[1], borderWidth: 2, pointRadius: 0, yAxisID: 'y1' },
    ];
    if (avg('evEbitdaNtmAvg5y')) sets.push({ label: `${evL()}/EBITDA ${es ? 'promedio 5 años' : '5-year average'} (${fmtX(G.evEbitdaNtmAvg5y)})`, data: avg('evEbitdaNtmAvg5y'), borderColor: c[0], borderDash: [5, 4], borderWidth: 1.2, pointRadius: 0, yAxisID: 'y' });
    if (avg('peNtmAvg5y')) sets.push({ label: `${peL()} ${es ? 'promedio 5 años' : '5-year average'} (${fmtX(G.peNtmAvg5y)})`, data: avg('peNtmAvg5y'), borderColor: c[1], borderDash: [5, 4], borderWidth: 1.2, pointRadius: 0, yAxisID: 'y1' });
    cv.setAttribute('aria-label', es ? `VE/EBITDA y P/U PDM de GAP, observaciones semanales de FactSet de ${fmtDate(from)} a ${fmtDate(to)}` : `GAP NTM EV/EBITDA and P/E, FactSet weekly observations from ${fmtDate(from)} to ${fmtDate(to)}`);
    mkChart('chartEvEbitda', { type: 'line', data: { labels, datasets: sets }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 18, boxHeight: 3 } }, tooltip: { callbacks: { title: (x) => fmtDate(labels[x[0].dataIndex]), label: (x) => `${x.dataset.label}: ${fmtX(x.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { position: 'left', title: { display: true, text: `${evL()}/EBITDA ${ntmLbl()} (${es ? 'izq.' : 'left'})` }, ticks: { callback: (v) => v + 'x' }, min: 6 }, y1: { position: 'right', title: { display: true, text: `${peL()} ${ntmLbl()} (${es ? 'der.' : 'right'})` }, ticks: { callback: (v) => v + 'x', stepSize: 3 }, min: 9, grid: { drawOnChartArea: false } } } } });
    html('evSrc', es
      ? `FactSet · observaciones semanales (cada viernes) de ${fmtDate(from)} a ${fmtDate(to)}; última semana: ${evL()}/EBITDA ${fmtX(last[1])}, ${peL()} ${fmtX(last[2])} (${fmtDate(last[0])}). Múltiplo = cierre de la semana × acciones vigentes + último balance publicado, sobre el consenso de FactSet de ese día (PDM = próximos doce meses, media). Líneas punteadas: promedios de 5 años de la tabla de pares. Cálculo de fnam.mx.`
      : `FactSet · weekly observations (each Friday) from ${fmtDate(from)} to ${fmtDate(to)}; latest week: ${evL()}/EBITDA ${fmtX(last[1])}, ${peL()} ${fmtX(last[2])} (${fmtDate(last[0])}). Multiple = that week's close × shares then outstanding + the latest balance sheet published, over FactSet's consensus sampled that day (NTM = next twelve months, mean). Dashed lines: the 5-year averages of the peers table. fnam.mx calculation.`);
  }
  // Forward multiples at the page's close on FactSet's consensus (peers.js → gap.ntm): P/E = close / NTM EPS mean; EV/EBITDA =
  // (close × shares + net debt + minorities) / NTM EBITDA mean. Null without a consensus or a positive EPS. Used by the header
  // tile, the multiples table and the deck's tear sheet (owner, 17-Oct-2026: NTM is the site's default basis).
  function ntmMultiples(px, sh, nd, q) {
    const cg = PEERS.gap && PEERS.gap.ntm; if (!px || !cg || !cg.eps || !(cg.eps.mean > 0)) return null;
    const evM = sh && nd ? px[1] * sh / 1e6 + nd.net / 1000 + ((q && q.bs && q.bs.nci) || 0) / 1000 : null;
    return { pe: px[1] / cg.eps.mean, evEbitda: evM != null && cg.ebitda && cg.ebitda.mean > 0 ? evM / cg.ebitda.mean : null, eps: cg.eps.mean, ebitda: cg.ebitda ? cg.ebitda.mean : null, estimateDate: cg.estimateDate || PEERS.estimateDate, evM };
  }
  // GAP's row of the peers table: FactSet's own row, computed exactly like the peers; only the dividend yield uses the latest
  // AGM amount over FactSet's close. The deck prints the same row (read through the model API).
  function peersOwnRow() { const G = PEERS.gap; return G ? { ...G, cls: 'bold', divYieldPct: (REF.dividends || []).length ? 100 * REF.dividends.slice(-1)[0].dps / G.price : G.divYieldPct } : null; }
  function renderPeers(price, shares, ltm, nd) {
    const G = PEERS.gap, ps = PEERS.peers || [], M = PEERS.medians || {};
    if (!PEERS.updatedAt || !ps.length) { html('peersTable', ''); el('peersCap').textContent = t('pending'); return; }
    const es = LANG === 'es';
    const cur = es ? 'Actual' : 'Current', a1 = es ? 'Prom. 1 a' : '1-yr avg', a3 = es ? 'Prom. 3 a' : '3-yr avg', a5 = es ? 'Prom. 5 a' : '5-yr avg'; // the group header names the multiple
    // two header rows, the Oracle page's design (owner, 2026-10-07): the single columns span both rows, each NTM multiple heads a group of
    // four (current in bold, then its 1-, 3- and 5-year averages) closed by a dividing line, and the pricing date sits under the market cap
    const priced = PEERS.pricesAsOf ? `<span class="sub">${es ? 'al' : 'as of'} ${fmtDate(PEERS.pricesAsOf)}</span>` : '';
    // each column: [key, label, classes]; the classes tint a column with its group (g1 EV/EBITDA, g2 P/E, g3 margin), open a group
    // with a vertical rule (gs), embolden the current multiple (now) and name the two columns the phone view hides (price, cap)
    const head = [['name', es ? 'Empresa' : 'Company'], ['price', es ? 'Precio' : 'Price', 'price'], ['mktCapUsdM', (es ? 'Cap. US$ M' : 'Mkt cap US$ M') + priced, 'cap'], ['adtvUsdM', 'ADTV US$ M']];
    const grp = (pre, g) => [[pre + 'Ntm', cur, `now ${g} gs`], [pre + 'NtmAvg1y', a1, g], [pre + 'NtmAvg3y', a3, g], [pre + 'NtmAvg5y', a5, g]];
    const evCols = grp('evEbitda', 'g1'), peCols = grp('pe', 'g2');
    const tail = [['divYieldPct', es ? 'Div.' : 'Div. yield', 'gs'], ['netDebtEbitda', ndL() + '/EBITDA']];
    // EBITDA margin as a group of two: FactSet's reported basis and the ex-IFRIC 12 basis (owner, 17-Oct-2026)
    const mgCols = [['ebitdaMarginPct', es ? 'Reportado' : 'Reported', 'g3 gs'], ['ebitdaMarginExIfricPct', es ? 'Sin IFRIC 12' : 'ex-IFRIC 12', 'g3']];
    const cols = [...head, ...evCols, ...peCols, ...tail, ...mgCols];
    const cl = (c) => (c[2] ? ` class="${c[2]}"` : '');
    const th1 = (c) => `<th scope="col" rowspan="2"${cl(c)}>${c[1]}</th>`;
    const th2 = (c) => `<th scope="col"${cl(c)}>${c[1]}</th>`;
    const thead = `<tr>${head.map(th1).join('')}<th scope="colgroup" colspan="4" class="grp g1 gs">${evL() + '/EBITDA ' + ntmLbl()}</th><th scope="colgroup" colspan="4" class="grp g2 gs">${peL() + ' ' + ntmLbl()}</th>${tail.map(th1).join('')}<th scope="colgroup" colspan="2" class="grp g3 gs">${es ? 'Margen EBITDA' : 'EBITDA margin'}</th></tr><tr>${[...evCols, ...peCols, ...mgCols].map(th2).join('')}</tr>`;
    const cell = (k, p) => {
      const v = p[k];
      if (k === 'name') return p.ticker ? `${p.short} <span class="muted small">${p.ticker}</span>` : p.name;
      if (k === 'price') return v == null ? '' : `<span class="muted small">${p.currency}</span> <span title="${fmtDate(p.priceDate)}">${fmtN(v, 2)}</span>`;
      if (k === 'ebitdaMarginExIfricPct' && v == null) return p.cls === 'total' ? '' : `<span class="muted small">${es ? 'pendiente' : 'pending'}</span>`;
      if (v == null) return p.cls === 'total' ? '' : `<span class="muted">${t('na')}</span>`;
      if (k === 'mktCapUsdM') return fmtN(v, 0);
      if (k === 'ebitdaMarginExIfricPct') return `${fmtPct(v)}${p.ifric12 && p.ifric12.approx ? '<sup title="' + (es ? 'cifras semestrales declaradas por la empresa, redondeadas' : 'half-year figures as stated by the company, rounded') + '">~</sup>' : ''}`;
      if (k === 'adtvUsdM') return fmtN(v, 1);
      return /Pct/.test(k) ? fmtPct(v) : fmtX(v);
    };
    // GAP row: FactSet's own row, computed exactly like the peers (owner, 2026-10-06: every price from FactSet, one close date);
    // only the dividend yield uses the AGM amount in this model over that close
    const gapRow = peersOwnRow();
    const medRow = (name, m) => (m ? { name, ...m, cls: 'total' } : null);
    const mx = ps.filter((p) => p.currency === 'MXN'), intl = ps.filter((p) => p.currency !== 'MXN');
    const rows = [
      gapRow && { ...gapRow, cls: 'bold' },
      { name: es ? 'México' : 'Mexico', cls: 'head' }, ...mx,
      { name: es ? 'Internacionales' : 'International', cls: 'head' }, ...intl,
      medRow(es ? 'Mediana México' : 'Median, Mexico', M.mexico), medRow(es ? 'Mediana internacional' : 'Median, international', M.international), medRow(es ? 'Mediana de pares' : 'Peer median', M.all),
    ].filter(Boolean);
    // rows alternate their background (`alt`), restarting under each group label; the label cell stays its own column so it is pinned
    // with the company names when the table scrolls sideways
    let alt = false;
    html('peersTable', `<table class="peers"><thead>${thead}</thead><tbody>${rows.map((p) => {
      if (p.cls === 'head') { alt = false; return `<tr class="head"><td>${p.name}</td><td colspan="${cols.length - 1}"></td></tr>`; }
      const tr = `<tr class="${p.cls || ''}${alt ? ' alt' : ''}">${cols.map((c) => `<td${cl(c)}>${cell(c[0], p)}</td>`).join('')}</tr>`; alt = !alt; return tr;
    }).join('')}</tbody></table>`);
    const prem = (v, m) => (v != null && m ? fmtPct(100 * (v / m - 1), 0, true) : '—');
    // own history: "in line with" inside ±0.5%, otherwise the signed premium/discount
    const vsOwn = (v, m) => (Math.abs(100 * (v / m - 1)) < 0.5 ? (es ? 'en línea con' : 'in line with') : prem(v, m) + (es ? ' frente a' : ' versus'));
    const own = gapRow && gapRow.evEbitdaNtmAvg3y != null && gapRow.evEbitdaNtmAvg5y != null
      ? (es
        ? ` (${vsOwn(gapRow.evEbitdaNtm, gapRow.evEbitdaNtmAvg3y)} su promedio de 3 años (${fmtX(gapRow.evEbitdaNtmAvg3y)}) y ${vsOwn(gapRow.evEbitdaNtm, gapRow.evEbitdaNtmAvg5y)} su promedio de 5 años (${fmtX(gapRow.evEbitdaNtmAvg5y)}))`
        : ` (${vsOwn(gapRow.evEbitdaNtm, gapRow.evEbitdaNtmAvg3y)} its own 3-year average (${fmtX(gapRow.evEbitdaNtmAvg3y)}) and ${vsOwn(gapRow.evEbitdaNtm, gapRow.evEbitdaNtmAvg5y)} its 5-year average (${fmtX(gapRow.evEbitdaNtmAvg5y)}))`)
      : '';
    const lead = gapRow && gapRow.evEbitdaNtm != null && M.mexico && M.international
      ? (es
        ? `GAP cotiza a <b>${fmtX(gapRow.evEbitdaNtm)} VE/EBITDA PDM</b>${own}: ${prem(gapRow.evEbitdaNtm, M.mexico.evEbitdaNtm)} frente a la mediana de ASUR y OMA (${fmtX(M.mexico.evEbitdaNtm)}) y ${prem(gapRow.evEbitdaNtm, M.international.evEbitdaNtm)} frente a la mediana internacional (${fmtX(M.international.evEbitdaNtm)}); P/U PDM ${fmtX(gapRow.peNtm)} contra ${fmtX(M.mexico.peNtm)} y ${fmtX(M.international.peNtm)}.`
        : `GAP trades at <b>${fmtX(gapRow.evEbitdaNtm)} NTM EV/EBITDA</b>${own}: ${prem(gapRow.evEbitdaNtm, M.mexico.evEbitdaNtm)} versus the ASUR/OMA median (${fmtX(M.mexico.evEbitdaNtm)}) and ${prem(gapRow.evEbitdaNtm, M.international.evEbitdaNtm)} versus the international median (${fmtX(M.international.evEbitdaNtm)}); NTM P/E ${fmtX(gapRow.peNtm)} against ${fmtX(M.mexico.peNtm)} and ${fmtX(M.international.peNtm)}.`)
      : '';
    html('peersLead', lead);
    // caption: the closes behind the table (one date; any company closed on another date is named), consensus date, balance sheets, windows
    const pd = PEERS.priceDates || {}; const main = PEERS.pricesAsOf;
    const shortOf = (id) => ((ps.find((p) => p.ticker === id) || (G && G.ticker === id ? G : null) || {}).short || id);
    const otherDates = Object.entries(pd).filter(([, d]) => d && d !== main).map(([id, d]) => `${shortOf(id)} ${fmtDate(d)}`);
    const bsDates = [...new Set(Object.values(PEERS.balanceSheetsAt || {}))].map((d) => fmtDate(d)).join(' / ');
    const H = PEERS.history || {}, A = PEERS.adtvWindow || {};
    el('peersCap').textContent = `${t('src')}: FactSet · ${es ? 'cierres al' : 'closes of'} ${fmtDate(main)}${otherDates.length ? ` (${otherDates.join(', ')})` : ''} · ${es ? 'consenso al' : 'consensus as of'} ${fmtDate(PEERS.estimateDate)} · ${es ? 'balances al' : 'balance sheets at'} ${bsDates}${H.from ? ` · ${es ? 'promedios semanales de' : 'weekly averages from'} ${fmtDate(H.from)} ${es ? 'a' : 'to'} ${fmtDate(H.to)}` : ''}${A.from ? ` · ADTV ${fmtDate(A.from)} – ${fmtDate(A.to)}` : ''} · ${es ? 'se actualiza cada noche' : 'refreshed nightly'}`;
    html('peersNote', es
      ? `VE = capitalización (todas las series) + deuda neta + minoritarios al último balance publicado. PDM = próximos doce meses, media del consenso de FactSet. Promedios de 1, 3 y 5 años: media aritmética del múltiplo PDM semanal (cada viernes con su cierre, las acciones vigentes, el último balance publicado y el consenso de ese día) en las últimas 52, 156 y 260 semanas; en Auckland las semanas de 2021–22, con UPA de consenso cercana a cero por la pandemia, elevan el promedio de 5 años del P/U. ADTV: valor promedio diario operado en los últimos tres meses (volumen diario × precio promedio ponderado, en dólares). Rendimiento por dividendo: dividendo anual indicado por FactSet entre el precio (GAP: Ps. ${fmtN(REF.dividends.slice(-1)[0].dps, 2)} de la asamblea 2026). Deuda neta / EBITDA sobre EBITDA de los últimos doce meses. Margen EBITDA en base FactSet (ingresos totales; en los grupos mexicanos incluye los ingresos por construcción IFRIC 12, por eso el margen de GAP aquí es menor que el margen sin IFRIC 12 de la tabla izquierda). Margen EBITDA sin IFRIC 12: EBITDA UDM entre ingresos UDM menos los ingresos por construcción IFRIC 12 de los mismos doce meses (GAP, ASUR y OMA de sus informes trimestrales; Fraport, Zúrich y Aena de sus estados financieros, ~ Aena: cifras semestrales declaradas por la empresa, redondeadas; Auckland es dueña de sus activos y no registra ninguno); el EBITDA no cambia con IFRIC 12, así que el VE/EBITDA no requiere ajuste; es la base comparable entre concesionarios y propietarios. Renglón de GAP: calculado igual que los pares, con el precio, la capitalización y el balance de FactSet (solo el rendimiento por dividendo usa el monto de la asamblea). Zúrich: balances semestrales; Auckland: año fiscal a junio de 2026, balances semestrales.`
      : `EV = market cap (all share classes) + net debt + minorities at the latest balance sheet published. NTM = next twelve months, FactSet consensus mean. 1-, 3- and 5-year averages: arithmetic mean of the weekly NTM multiple (each Friday with that week's close, the shares then outstanding, the latest balance sheet published and the consensus sampled that day) over the last 52, 156 and 260 weeks; Auckland's 2021–22 weeks, with consensus EPS near zero in the pandemic, lift its 5-year P/E average. ADTV: average daily traded value over the last three months (daily volume × volume-weighted average price, in US dollars). Dividend yield: FactSet indicated annual dividend over price (GAP: Ps. ${fmtN(REF.dividends.slice(-1)[0].dps, 2)} from the 2026 AGM). Net debt / EBITDA on last-twelve-month EBITDA. EBITDA margin on FactSet's basis (total revenue; for the Mexican groups this includes IFRIC 12 construction revenue, which is why GAP's margin here is below the ex-IFRIC 12 margin in the left-hand table). EBITDA margin ex-IFRIC 12: LTM EBITDA over LTM revenue less the IFRIC 12 construction revenue of the same twelve months (GAP, ASUR and OMA from their quarterly reports; Fraport, Zurich and Aena from their financial statements, ~ Aena: half-year figures as stated by the company, rounded; Auckland owns its assets and books none); EBITDA is unchanged by IFRIC 12, so EV/EBITDA needs no adjustment; it is the comparable basis across concession operators and owner-operators. GAP row: computed like the peers, with FactSet's price, market cap and balance sheet (only the dividend yield uses the AGM amount). Zurich: semi-annual balance sheets; Auckland: fiscal year to June 2026, semi-annual balance sheets.`);
  }
  function renderConsensus(price) {
    const G = PEERS.gap;
    if (!G || !G.target) { html('consTiles', ''); html('consTable', ''); return; }
    const px0 = price || G.price;
    const tg = G.target, ra = G.ratings || {};
    const tiles = [
      { v: 'Ps. ' + fmtN(tg.mean, 0), l: (LANG === 'es' ? 'Precio objetivo medio · ' : 'Mean price target · ') + fmtPct(100 * (tg.mean / px0 - 1), 0, true) + (LANG === 'es' ? ' vs. cierre' : ' vs. close') },
      { v: 'Ps. ' + fmtN(tg.low, 0) + ' – ' + fmtN(tg.high, 0), l: (LANG === 'es' ? 'Rango de objetivos · ' : 'Target range · ') + tg.count + (LANG === 'es' ? ' analistas' : ' analysts') },
      { v: `${ra.buy + (ra.overweight || 0)} / ${ra.hold} / ${ra.sell + (ra.underweight || 0)}`, l: LANG === 'es' ? `Compra / mantener / venta (${ra.total})` : `Buy / hold / sell (${ra.total})` },
      G.ntm && G.ntm.ebitda ? { v: 'Ps. ' + fmtN(G.ntm.ebitda.mean, 0) + ' M', l: 'EBITDA ' + ntmLbl() + (LANG === 'es' ? ' · consenso' : ' · consensus') } : null,
      G.ntm && G.ntm.eps ? { v: 'Ps. ' + fmtN(G.ntm.eps.mean, 2), l: (LANG === 'es' ? 'UPA ' : 'EPS ') + ntmLbl() + (LANG === 'es' ? ' · consenso' : ' · consensus') } : null,
    ].filter(Boolean);
    html('consTiles', tiles.map((x) => `<div class="stat"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join(''));
    // fiscal-year consensus vs the guidance in force: revenue, EBITDA and EPS, each with its year-over-year change (owner, 17-Oct-2026);
    // the first estimate year grows over the reported 2025 figures, each later year over the prior year's consensus mean
    const es = LANG === 'es';
    const fys = Object.keys(G.fy || {}).sort();
    const y25 = Y.find((y) => y.fy === 2025), y24 = Y.find((y) => y.fy === 2024);
    const gv = GV && GV.length ? GV[GV.length - 1] : null;
    const gE = gv && gv.items && gv.items.ebitda, gR = gv && gv.items && gv.items.revTotal;
    // reported EPS on the basis closest to FactSet's: net income attributable to the controlling interest over the year-end shares
    const epsOf = (y) => { const p = y ? perShare(y) : null; return p && p.epsCtrl != null ? p.epsCtrl : null; };
    const head = es ? ['Año', 'Ingresos', 'Δ Ingresos a/a', 'EBITDA', 'Δ EBITDA a/a', 'UPA (Ps.)', 'Δ UPA a/a', 'Analistas'] : ['Year', 'Revenue', 'Revenue y/y', 'EBITDA', 'EBITDA y/y', 'EPS (Ps.)', 'EPS y/y', 'Analysts'];
    const chg = (v, p) => (v != null && p ? fmtPct(100 * (v / p - 1), 1, true) : '—');
    const dash = '<span class="muted">—</span>';
    let prevR = y25 && y25.is ? y25.is.revTotal / 1000 : null, prevE = y25 && y25.is ? y25.is.ebitda / 1000 : null, prevP = epsOf(y25);
    const body = [];
    if (y25 && y25.is) body.push(`<tr><td>2025 (${es ? 'real' : 'actual'})</td><td>${fmtM(y25.is.revTotal)}</td><td>${chg(y25.is.revTotal, y24 && y24.is && y24.is.revTotal)}</td><td>${fmtM(y25.is.ebitda)}</td><td>${chg(y25.is.ebitda, y24 && y24.is && y24.is.ebitda)}</td><td>${prevP != null ? fmtN(prevP, 2) : dash}</td><td>${chg(prevP, epsOf(y24))}</td><td>${dash}</td></tr>`);
    for (const fy of fys) {
      const e = G.fy[fy]; const r = e.sales && e.sales.mean, eb = e.ebitda && e.ebitda.mean, ep = e.eps && e.eps.mean;
      body.push(`<tr><td>${fy}E</td><td>${r != null ? fmtN(r, 0) : dash}</td><td>${chg(r, prevR)}</td><td>${eb != null ? fmtN(eb, 0) : dash}</td><td>${chg(eb, prevE)}</td><td>${ep != null ? fmtN(ep, 2) : dash}</td><td>${chg(ep, prevP)}</td><td class="muted">${(e.ebitda && e.ebitda.count) || ''}</td></tr>`);
      if (r != null) prevR = r; if (eb != null) prevE = eb; if (ep != null) prevP = ep;
    }
    const rng = (g, f) => `${f(g.lo)} – ${f(g.hi)}`;
    if ((gE || gR) && y25 && y25.is) body.push(`<tr class="total"><td>${es ? 'Guía 2026' : '2026 guidance'} (${fmtDate(gv.date)})</td><td>${gR ? rng(gR, (x) => fmtM(y25.is.revTotal * (1 + x / 100))) : dash}</td><td>${gR ? rng(gR, (x) => fmtPct(x, 0, true)) : dash}</td><td>${gE ? rng(gE, (x) => fmtM(y25.is.ebitda * (1 + x / 100))) : dash}</td><td>${gE ? rng(gE, (x) => fmtPct(x, 0, true)) : dash}</td><td>${dash}</td><td>${dash}</td><td>${dash}</td></tr>`);
    html('consTable', `<table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table>`);
    const f26 = G.fy && G.fy['2026'];
    const c26 = f26 && f26.ebitda ? f26.ebitda.mean : null, r26 = f26 && f26.sales ? f26.sales.mean : null;
    const vsG = c26 != null && gE && y25 && y25.is ? 100 * (c26 / (y25.is.ebitda / 1000) - 1) : null;
    const vsR = r26 != null && gR && y25 && y25.is ? 100 * (r26 / (y25.is.revTotal / 1000) - 1) : null;
    const eps25 = epsOf(y25), sh25 = y25 && y25.shares ? y25.shares.current : null;
    html('consNote', es
      ? `Consenso de FactSet al ${fmtDate(PEERS.estimateDate)}, en Ps. millones (media). EBITDA de FactSet = utilidad de operación + depreciación y amortización; los ingresos siguen la definición de FactSet (pueden incluir ingresos por construcción IFRIC 12, como los ingresos totales que GAP reporta), por lo que la comparación con la guía descansa en el EBITDA. ${vsG != null ? `El consenso 2026 implica ${fmtPct(vsG, 1, true)} sobre el EBITDA 2025 reportado, contra la guía vigente de ${fmtPct(gE.lo, 0, true)} a ${fmtPct(gE.hi, 0, true)}` : ''}${vsR != null ? `${vsG != null ? ', y' : 'El consenso 2026 implica'} ${fmtPct(vsR, 1, true)} en ingresos, contra ${fmtPct(gR.lo, 0, true)} a ${fmtPct(gR.hi, 0, true)}` : ''}${vsG != null || vsR != null ? '. ' : ''}Crecimiento: el primer año estimado sobre las cifras reportadas de 2025, cada año siguiente sobre la media del consenso del año anterior; 2025 sobre 2024 reportado. UPA 2025 real = utilidad neta de la participación controladora entre las acciones al cierre (${sh25 ? fmtN(sh25 / 1e6, 1) + ' M' : '—'}), la base más cercana a la UPA de FactSet${eps25 != null && y25.is.ciPerShare != null ? ` (GAP reporta utilidad integral por acción de Ps. ${fmtN(y25.is.ciPerShare, 2)})` : ''}. Analistas: número de estimaciones de EBITDA. Cierre de referencia: Ps. ${fmtN(px0, 2)} (${fmtDate(lastPx ? lastPx[0] : PEERS.pricesAsOf)}).`
      : `FactSet consensus as of ${fmtDate(PEERS.estimateDate)}, Ps. million (mean). FactSet EBITDA = operating income + depreciation and amortization; revenue follows FactSet's definition (it may include IFRIC 12 construction revenue, as GAP's reported total revenue does), so the guidance comparison rests on EBITDA. ${vsG != null ? `The 2026 consensus implies ${fmtPct(vsG, 1, true)} on reported 2025 EBITDA, against guidance of ${fmtPct(gE.lo, 0, true)} to ${fmtPct(gE.hi, 0, true)}` : ''}${vsR != null ? `${vsG != null ? ', and' : 'The 2026 consensus implies'} ${fmtPct(vsR, 1, true)} in revenue, against ${fmtPct(gR.lo, 0, true)} to ${fmtPct(gR.hi, 0, true)}` : ''}${vsG != null || vsR != null ? '. ' : ''}Growth: the first estimate year over the reported 2025 figures, each later year over the prior year's consensus mean; 2025 over reported 2024. 2025 actual EPS = net income attributable to the controlling interest over year-end shares (${sh25 ? fmtN(sh25 / 1e6, 1) + ' M' : '—'}), the basis closest to FactSet's EPS${eps25 != null && y25.is.ciPerShare != null ? ` (GAP reports comprehensive income per share of Ps. ${fmtN(y25.is.ciPerShare, 2)})` : ''}. Analysts: number of EBITDA estimates. Reference close: Ps. ${fmtN(px0, 2)} (${fmtDate(lastPx ? lastPx[0] : PEERS.pricesAsOf)}).`);
  }

  // ================= 06 DEBT =================
  function renderDebt() {
    const qs = Q.slice(-lastN()); const c = SERIES();
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
    const DS = debtSources(qs), anyEst = est.some(Boolean);
    html('debtSrc', LANG === 'es'
      ? `Deuda bruta = préstamos bancarios + certificados bursátiles (corto y largo plazo); efectivo del balance de cada informe trimestral. Fuente de la deuda bruta por trimestre: ${DS.note}.${anyEst ? ' <b>Translúcido / punteado = estimación</b> obtenida restando a la deuda reportada los flujos de financiamiento de cada trimestre.' : ''}`
      : `Gross debt = bank loans + certificados bursátiles (current and long-term); cash from each quarterly report's balance sheet. Gross-debt source by quarter: ${DS.note}.${anyEst ? ' <b>Translucent / dashed = estimate</b> obtained by rolling reported debt back through each quarter\'s financing flows.' : ''}`);
    const D2 = REF.debt || {};
    const isCb = (i) => i.type === 'CB';
    const instRow = (i) => `<tr><td>${LS(i.name)}${i.inferred ? '*' : ''}${i.note ? `<br><span class="muted small">${LS(i.note)}</span>` : ''}</td><td class="col-type">${isCb(i) ? 'CB' : LS(i.type)}</td><td>${i.issued ? fmtDate(i.issued) : '—'}</td><td>${i.matures ? fmtDate(i.matures) : '—'}</td><td>${fmtN(i.principalMxn, i.principalMxn % 1 ? 1 : 0)}</td><td>${LS(i.rate) || '—'}${i.source ? `<br><span class="muted small">${i.source}</span>` : ''}</td></tr>`;
    const cbs = (D2.instruments || []).filter(isCb), loans = (D2.instruments || []).filter((i) => !isCb(i));
    const sum = (a) => a.reduce((x, i) => x + (i.principalMxn || 0), 0);
    const sub = (label, v) => `<tr class="total"><td colspan="4">${label}</td><td>${fmtN(v)}</td><td></td></tr>`;
    const grp = (label) => `<tr class="head"><td colspan="6">${label}</td></tr>`;
    const asOfI = D2.instrumentsAsOf ? fmtDate(D2.instrumentsAsOf) : '—', ndLast = netDebt(lastQ);
    const instr = grp(LANG === 'es' ? `Certificados bursátiles (CB) vigentes al ${asOfI}` : `Certificados bursátiles (CB) outstanding at ${asOfI}`) + cbs.map(instRow).join('') + sub(LANG === 'es' ? 'Subtotal certificados' : 'Subtotal certificados', sum(cbs))
      + grp(LANG === 'es' ? `Préstamos bancarios al ${asOfI}` : `Bank loans at ${asOfI}`) + loans.map(instRow).join('') + sub(LANG === 'es' ? 'Subtotal préstamos' : 'Subtotal loans', sum(loans))
      + sub(LANG === 'es' ? 'Total instrumentos (principal)' : 'Total instruments (principal)', sum(cbs) + sum(loans))
      + (ndLast ? sub(LANG === 'es' ? `Deuda bruta en balance, ${qLabel(lastQ)} (con intereses devengados)` : `Gross debt on the balance sheet, ${qLabel(lastQ)} (incl. accrued interest)`, ndLast.gross / 1000) : '');
    const ratings = (D2.ratings || []).map((r) => `<tr><td>${r.agency}</td><td colspan="4">${r.rating} (${LS(r.outlook)}) · ${LS(r.scope)}</td><td class="muted small">${LS(r.source)}</td></tr>`).join('');
    html('instrTable', `<table><thead><tr><th scope="col">${t('instrument')}</th><th scope="col" class="col-type">${LANG === 'es' ? 'Tipo' : 'Type'}</th><th scope="col">${LANG === 'es' ? 'Emisión' : 'Issued'}</th><th scope="col">${t('matures')}</th><th scope="col">${t('principal')}</th><th scope="col">${t('rate')} · ${LANG === 'es' ? 'fuente' : 'source'}</th></tr></thead><tbody>${instr}<tr class="head"><td colspan="6">${t('rating')}</td></tr>${ratings}</tbody></table>`);
    el('instrCap').textContent = LANG === 'es'
      ? `Fuente: FactSet Debt Capital Structure (GAPB-MX) al ${asOfI}; nombres de serie, cupones y vencimientos cotejados con los comunicados de GAP (6-K). * = nombre de serie inferido del patrón de emisión. Referencia actualizada el ${fmtDate(REF.updatedAt)}.`
      : `Source: FactSet Debt Capital Structure (GAPB-MX) at ${asOfI}; series names, coupons and maturities checked against GAP's releases (6-K). * = series name inferred from the issuance pattern. Reference updated ${fmtDate(REF.updatedAt)}.`;
    const events = (D2.events || []).map((e) => `<b>${fmtDate(e.date)}</b> ${L(e)} <span class="muted">(${e.url ? `<a href="${e.url}" target="_blank" rel="noopener">${LS(e.source)}</a>` : LS(e.source)})</span>`).join('<br>');
    html('instrNote', (events ? `<b>${LANG === 'es' ? 'Después del cierre del trimestre.' : 'After the quarter-end.'}</b> ${events}<br>` : '') + LS(D2.instrumentsNote));
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
    html('dpsTable', `<table><thead><tr><th scope="col">${LANG === 'es' ? 'Año' : 'Year'}</th><th scope="col">${t('dps')}</th><th scope="col">${LANG === 'es' ? 'Dividendos (Ps. M)' : 'Dividends (Ps. M)'}</th><th scope="col">${LANG === 'es' ? 'Reembolsos de capital' : 'Capital reductions'}</th><th scope="col">${LANG === 'es' ? 'Recompras' : 'Buybacks'}</th><th scope="col">${LANG === 'es' ? 'Distribuciones' : 'Distributions'}</th><th scope="col">${t('payout')}</th><th scope="col">${t('yield')}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`);
    el('dpsCap').textContent = LANG === 'es' ? 'DPS = efectivo por acción registrado en bolsa (incluye reembolsos de capital, que GAP ha usado en lugar de dividendos en 2021 y 2024). Flujos en Ps. millones del estado de flujos anual. Razón de pago = DPS / utilidad por acción del año fiscal; rendimiento sobre el cierre del año.' : 'DPS = exchange-recorded cash per share (includes capital reductions, which GAP used instead of dividends in 2021 and 2024). Flows in Ps. million from the annual cash-flow statement. Payout = DPS / EPS of the fiscal year; yield on the year-end close.';
    const ag = (REF.dividends || []).map((d) => `<b>${t('agm')} ${d.agmYear}</b> (${fmtDate(d.agmDate)}): Ps. ${fmtN(d.dps, 2)} ${LANG === 'es' ? 'por acción' : 'per share'}. ${LS(d.note)} <span class="muted">(${LS(d.source)})</span>`).join('<br>') + `<br><span class="muted">${LANG === 'es' ? 'Las exhibiciones aparecen en la tabla cuando la bolsa las registra (Yahoo Finance, cotejado con FactSet); el saldo pendiente de la última asamblea se indica arriba.' : 'Installments appear in the table once the exchange records them (Yahoo Finance, cross-checked with FactSet); the balance outstanding from the latest AGM is stated above.'}</span>`;
    const agmLast = (REF.dividends || []).slice(-1)[0];
    if (agmLast) {
      const since = divs.filter((d) => d[0] >= agmLast.agmDate); const paid = since.reduce((a, d) => a + d[1], 0); const lastRec = lastPx ? lastPx[0] : (MK.generatedAt || '').slice(0, 10);
      html('dpsPaid', LANG === 'es'
        ? `<b>Asamblea ${agmLast.agmYear}:</b> pagados Ps. ${fmtN(paid, 2)} de Ps. ${fmtN(agmLast.dps, 2)} por acción${since.length ? ` (${since.map((d) => `Ps. ${fmtN(d[1], 2)} ex ${fmtDate(d[0])}`).join(', ')})` : ''}; saldo Ps. ${fmtN(Math.max(0, agmLast.dps - paid), 2)} pagadero hasta el ${fmtDate(agmLast.payableUntil)}. Registro de bolsa al ${fmtDate(lastRec)}.`
        : `<b>${agmLast.agmYear} AGM:</b> Ps. ${fmtN(paid, 2)} of Ps. ${fmtN(agmLast.dps, 2)} per share paid${since.length ? ` (${since.map((d) => `Ps. ${fmtN(d[1], 2)} ex ${fmtDate(d[0])}`).join(', ')})` : ''}; balance of Ps. ${fmtN(Math.max(0, agmLast.dps - paid), 2)} payable until ${fmtDate(agmLast.payableUntil)}. Exchange record to ${fmtDate(lastRec)}.`);
    }
    const bb = (REF.buyback || []).map((b) => `<b>${LANG === 'es' ? 'Recompra de acciones' : 'Share buyback'}</b> (${LANG === 'es' ? 'asamblea' : 'AGM'} ${fmtDate(b.agmDate)}): ${LANG === 'es' ? 'hasta' : 'up to'} Ps. ${fmtN(b.maxMxnM)} M. ${LS(b.note)} <span class="muted">(${LS(b.source)})</span>`).join('<br>');
    html('dpsNote', ag + (bb ? `<br>${bb}` : ''));
  }

  // ================= 08 CBX / 09 FIBRA =================
  function renderCbx() {
    const C = REF.cbx || {};
    html('cbxTimeline', (C.timeline || []).map((e) => `<li><b>${fmtDate(e.date)}</b>${L(e)}</li>`).join(''));
    html('cbxFacts', (C.facts || []).map((f) => `<div class="fact"><div class="v">${fmtFact(f)}</div><div class="l">${LANG === 'es' ? f.label_es : f.label_en}${f.source ? ` · <span class="muted">${LS(f.source)}</span>` : ''}</div></div>`).join(''));
    html('cbxSrc', `${t('src')}: ${(LS(C.sources) || []).join(' · ')}`);
    const F2 = REF.fibra || {};
    const rows = [[LANG === 'es' ? 'Vehículo' : 'Vehicle', F2.name], [LANG === 'es' ? 'Clave' : 'Ticker', F2.ticker], [LANG === 'es' ? 'Bolsa' : 'Exchange', F2.exchange], [LANG === 'es' ? 'Monto objetivo' : 'Target size', 'Ps. ' + fmtN(F2.targetMxnM) + ' M'], ['CBFEs', fmtN(F2.certificates) + ' × Ps. ' + fmtN(F2.priceMxn)], [LANG === 'es' ? 'Participación en cada concesionaria' : 'Stake in each concessionaire', fmtPct(F2.stakePct)], [LANG === 'es' ? 'Uso de recursos' : 'Use of proceeds', mdpUseText()]];
    html('fibraTable', `<table><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1] || '—'}</td></tr>`).join('')}</tbody></table>`);
    // Status: one headline composed from placed/statusAsOf, then the timeline newest first (owner, 2026-10-06). Tags tell filings from press.
    const kindL = { filing: LANG === 'es' ? 'comunicado' : 'filing', press: LANG === 'es' ? 'prensa' : 'press', check: LANG === 'es' ? 'revisión FNAM' : 'FNAM check' };
    const headline = F2.placed
      ? (LANG === 'es' ? `Colocada el ${fmtDate(F2.placedDate)}.` : `Placed on ${fmtDate(F2.placedDate)}.`)
      : (LANG === 'es' ? `Aún no colocada al ${fmtDate(F2.statusAsOf)}.` : `Not yet placed as of ${fmtDate(F2.statusAsOf)}.`);
    const tl = (F2.timeline || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    html('fibraStatus', `<b>${LANG === 'es' ? 'Estatus' : 'Status'}.</b> ${headline}<ul class="status-tl">${tl.map((e) => `<li><b>${fmtDate(e.date)}</b> · ${L(e)}${kindL[e.kind] ? ` <span class="muted small">(${kindL[e.kind]})</span>` : ''}</li>`).join('')}</ul>`);
    html('fibraSrc', `${t('src')}: ${(LS(F2.sources) || []).join(' · ')}`);
  }

  // ================= 10 METHOD / SOURCES =================
  function renderMethod() {
    const rows = [
      [LANG === 'es' ? 'Estados financieros trimestrales, acumulados y anuales' : 'Quarterly, YTD and annual statements', LANG === 'es' ? 'días 6, 12, 18 y 24 de cada mes' : '6th, 12th, 18th, 24th monthly', LANG === 'es' ? 'Un proceso automático descarga los informes de GAP (GlobeNewswire), los convierte en tablas y valida cuadres antes de publicar' : 'An automated job downloads GAP\'s reports (GlobeNewswire), parses the tables and validates tie-outs before publishing', fmtDate((FIN.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Tráfico mensual por aeropuerto' : 'Monthly traffic by airport', LANG === 'es' ? 'misma corrida' : 'same run', LANG === 'es' ? 'reporte mensual de tráfico (≈ día 5 de cada mes)' : 'monthly traffic report (≈ 5th of each month)', fmtDate((TR.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Guía de la administración' : 'Management guidance', LANG === 'es' ? 'misma corrida' : 'same run', LANG === 'es' ? 'tabla de guía en los comunicados (enero, 4T, revisiones)' : 'guidance table in the releases (January, 4Q, revisions)', fmtDate((GD.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? 'Comentarios del estado de resultados' : 'Income-statement comments', LANG === 'es' ? 'por trimestre (borrador de la rutina, revisado)' : 'per quarter (drafted by the routine, reviewed)', 'data/comments.js', CM.updatedAt ? fmtDate(CM.updatedAt) : '—'],
      [LANG === 'es' ? 'Resumen ejecutivo' : 'Executive summary', LANG === 'es' ? 'con cada reporte (rutina)' : 'with each report (routine)', 'data/summary.js', SUM.updatedAt ? fmtDate(SUM.updatedAt) : '—'],
      [LANG === 'es' ? 'Precios, dividendos, tipo de cambio, tasas' : 'Prices, dividends, FX, yields', marketCadence(Object.keys(MK.prices || {})), `${marketSrcNote(['GAPB.MX', 'PAC', 'ASURB.MX', 'OMAB.MX', '^MXX'])} · Banxico SIE (SF43718, SF44071) · FRED (DGS10)`, fmtDate((MK.generatedAt || '').slice(0, 10))],
      [LANG === 'es' ? `Referencia: acciones, concesiones, deuda, CBX, FIBRA${DCF_ON ? ', supuestos DCF' : ''}` : `Reference: shares, concessions, debt, CBX, FIBRA${DCF_ON ? ', DCF defaults' : ''}`, LANG === 'es' ? 'por evento (PR revisado)' : 'event-driven (reviewed PR)', 'data/reference.js', fmtDate(REF.updatedAt)],
      [LANG === 'es' ? 'Pares y consenso FactSet' : 'FactSet peers and consensus', LANG === 'es' ? 'cada noche, 20:00 hora de Nueva York (rutina en la nube)' : 'nightly, 8 PM New York time (cloud routine)', 'FactSet → data/peers.js', PEERS.updatedAt ? fmtDate(PEERS.updatedAt) : '—'],
    ];
    html('refreshTable', `<table><thead><tr><th scope="col">${t('block')}</th><th scope="col">${t('cadence')}</th><th scope="col">${t('mechanism')}</th><th scope="col">${t('lastUpdate')}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`);
    const srcs = [
      { t: LANG === 'es' ? 'GAP — informes trimestrales y comunicados' : 'GAP — quarterly reports and releases', d: LANG === 'es' ? 'Distribuidos por GlobeNewswire y presentados como Form 6-K ante la SEC; base de todos los estados financieros y del tráfico.' : 'Distributed via GlobeNewswire and furnished as Form 6-K to the SEC; the basis of every statement and traffic figure.', u: 'https://www.globenewswire.com/search/keyword/Grupo%20Aeroportuario%20del%20Pacifico' },
      { t: 'SEC EDGAR — Grupo Aeroportuario del Pacífico (CIK 1347557)', d: LANG === 'es' ? 'Formas 20-F (anuales auditadas) y 6-K.' : 'Forms 20-F (audited annual) and 6-K.', u: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001347557' },
      { t: LANG === 'es' ? 'GAP — Relación con inversionistas' : 'GAP — Investor relations', d: LANG === 'es' ? 'Reportes trimestrales en PDF, eventos relevantes, asambleas, PMD y tarifas máximas.' : 'PDF quarterly reports, material events, shareholder meetings, PMD and maximum tariffs.', u: 'https://www.aeropuertosgap.com.mx/en/investors' },
      { t: 'FactSet', d: LANG === 'es' ? 'Cierres diarios GAPB.MX, PAC, ASURB.MX y OMAB.MX (Global Prices, cada noche a las 20:00 hora de Nueva York); precios y capitalización de los pares, fundamentales UDM, deuda neta, consenso de estimaciones (PDM y por año fiscal), precios objetivo y recomendaciones; conector FactSet AI-Ready Data.' : 'Daily closes for GAPB.MX, PAC, ASURB.MX and OMAB.MX (Global Prices, nightly at 8 PM New York time); peer prices and market caps, LTM fundamentals, net debt, consensus estimates (NTM and by fiscal year), price targets and ratings; FactSet AI-Ready Data connector.', u: 'https://www.factset.com/' },
      { t: 'Yahoo Finance', d: LANG === 'es' ? 'Índice S&P/BMV IPC (^MXX) y dividendos en efectivo registrados en bolsa; cierres de respaldo sólo para las sesiones que FactSet aún no publica.' : 'S&P/BMV IPC index (^MXX) and exchange-recorded cash dividends; fallback closes only for the sessions FactSet has not posted yet.', u: 'https://finance.yahoo.com/quote/GAPB.MX/' },
      { t: LANG === 'es' ? 'Banxico — tipo de cambio FIX y bono M' : 'Banxico — FIX exchange rate and M bond', d: LANG === 'es' ? 'USD/MXN diario (SIE SF43718) y bono M a 10 años, rendimiento de la subasta primaria (SIE SF44071); FRED como respaldo.' : 'Daily USD/MXN (SIE SF43718) and the 10-year M bond primary-auction yield (SIE SF44071); FRED as the fallback.', u: 'https://www.banxico.org.mx/SieAPIRest/service/v1/' },
      { t: 'FRED — Federal Reserve Bank of St. Louis', d: 'US 10-yr (DGS10); USD/MXN (DEXMXUS) and México 10-yr (IRLTLT01MXM156N, OECD) only as fallbacks.', u: 'https://fred.stlouisfed.org/series/DGS10' },
      { t: LANG === 'es' ? 'BMV / BIVA — eventos relevantes' : 'BMV / BIVA — material events', d: LANG === 'es' ? 'Constitución de FIBRA GAP, emisiones de certificados bursátiles, asambleas.' : 'FIBRA GAP constitution, certificados bursátiles issuances, shareholder meetings.', u: 'https://www.bmv.com.mx/' },
    ];
    html('srcGrid', srcs.map((s) => `<div class="item"><div class="t"><a href="${s.u}" target="_blank" rel="noopener">${s.t} ↗</a></div><div class="d">${s.d}</div></div>`).join(''));
  }

  // ================= wiring =================
  function seg(id, onChange) { const box = el(id); if (!box) return; box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); onChange(b.dataset.v); })); }
  function renderAll() {
    chartDefaults();
    renderHeader(); renderSummary(); renderStatements(); renderGuidance(); renderTraffic(); renderShare(); renderDcf(); renderRelative(); renderDebt(); renderDividends(); renderCbx(); renderMethod();
  }
  function setLang(lang) {
    LANG = lang;
    el('btnLangEs').classList.toggle('active', lang === 'es'); el('btnLangEn').classList.toggle('active', lang === 'en');
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es-MX' : 'en');
    document.title = `${'GAP'} · ${lang === 'es' ? 'Modelo Financiero Interactivo' : 'Interactive Financial Model'} | ${TITLE_TAIL}`;
    document.querySelectorAll('.es').forEach((e) => { e.hidden = lang !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = lang !== 'en'; });
    try { localStorage.setItem('fnam-lang', lang); } catch (e) { /* ignore */ }
    fillSelects(); renderAll();
  }
  el('btnLangEs').addEventListener('click', () => setLang('es')); el('btnLangEn').addEventListener('click', () => setLang('en'));

  // ---------------- print as presentation ----------------
  function renderPrintExtras() {
    const conf = LANG === 'es' ? 'Confidencial. Preparado para uso interno del consejo; no distribuir.' : 'Confidential. Prepared for internal board use; do not distribute.';
    const today = new Date().toISOString().slice(0, 10);
    const lastM = TR.months.length ? TR.months[TR.months.length - 1] : null;
    const gv = (GD.vintages || []).slice().sort((a, b) => a.date.localeCompare(b.date)).pop();
    const basis = LANG === 'es'
      ? [`Último trimestre reportado: ${lastQ ? qLabel(lastQ) : '—'} (${fmtReportDate(lastQ)})`, `Tráfico: ${lastM ? ymLabel(lastM.ym) : '—'}`, `Guía vigente: ${gv ? fmtDate(gv.date) : '—'}`, `Cierre de mercado: ${lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'}`, `Comparación en pantalla: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`]
      : [`Latest reported quarter: ${lastQ ? qLabel(lastQ) : '—'} (${fmtReportDate(lastQ)})`, `Traffic: ${lastM ? ymLabel(lastM.ym) : '—'}`, `Guidance in force: ${gv ? fmtDate(gv.date) : '—'}`, `Market close: ${lastPx ? `Ps. ${fmtN(lastPx[1], 2)} (${fmtDate(lastPx[0])})` : '—'}`, `Comparison on screen: ${el('stmtTitle') ? el('stmtTitle').textContent : ''}`];
    html('printCover', `<div>${LANG === 'es' ? 'Modelo financiero interactivo · elaborado únicamente con información pública' : 'Interactive financial model · built only from public information'}</div><div class="basis">${basis.map((x) => `<div>${x}</div>`).join('')}<div>${LANG === 'es' ? 'Impreso el' : 'Printed'} ${fmtDate(today)} · fnam.mx/gap</div></div><div class="conf">${conf}</div>`);
    // Page footer and numbers via CSS page-margin boxes (Chrome / Edge 131+); language-specific, so injected here.
    const esc = (x) => x.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const left = esc(`GAP · ${LANG === 'es' ? 'Modelo financiero' : 'Financial model'} · fnam.mx/gap · ${conf} · ${fmtDate(today)}`);
    let st = el('printPageStyle'); if (!st) { st = document.createElement('style'); st.id = 'printPageStyle'; document.head.appendChild(st); }
    st.textContent = `@page { size: 11in 8.5in; margin: 0.45in 0.55in 0.6in; @bottom-left { content: "${left}"; font-family: Inter, system-ui, sans-serif; font-size: 8.5pt; color: #555; vertical-align: top; padding-top: 6pt; } @bottom-right { content: "${LANG === 'es' ? 'Página' : 'Page'} " counter(page) " ${LANG === 'es' ? 'de' : 'of'} " counter(pages); font-family: Inter, system-ui, sans-serif; font-size: 9.5pt; color: #333; vertical-align: top; padding-top: 6pt; } }`;
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
  el('btnPrint').addEventListener('click', () => { if (window.GAP_PRESENT && window.GAP_PRESENT.build) { window.GAP_PRESENT.build(); return; } setPrintMode(true); setTimeout(() => window.print(), 250); });
  el('stmtTable').addEventListener('click', (e) => { const g = e.target.closest('[data-g]'); if (g) { st.open[g.dataset.g] = !st.open[g.dataset.g]; renderStatements(); } });
  seg('segStmt', (v) => { st.stmt = v; renderStatements(); });
  seg('segMode', (v) => { st.mode = v; fillSelects('yoy'); renderStatements(); });
  seg('segPreset', (v) => { fillSelects(v); renderStatements(); });
  // The two periods can never be the same: when one selector lands on the other's value, the other steps to its neighbor.
  const avoidSame = (changed) => { if (st.a !== st.b) return; const opts = periodOptions(); const i = opts.findIndex((o) => o.id === st[changed]); const n = (opts[i - 1] || opts[i + 1] || {}).id; if (changed === 'a') st.b = n; else st.a = n; fillSelects(); };
  el('selA').addEventListener('change', (e) => { st.a = e.target.value; avoidSame('a'); renderStatements(); });
  el('selB').addEventListener('change', (e) => { st.b = e.target.value; avoidSame('b'); renderStatements(); });
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

  // The MDP figure the deck and the page print: the remainder GAP states in its own filing (≈ Ps. 40.0 bn for 2026–2029, 6-K of
  // 9-May-2026), with the announced five-year total (> Ps. 52 bn, 11-Feb-2025, press coverage) only as a labeled aside.
  function mdpUseText() {
    const m = (REF.regulation && REF.regulation.mdp) || {}, r = m.remaining;
    if (!r) return LANG === 'es' ? `PMD ${m.period || ''}` : `MDP ${m.period || ''}`;
    return LANG === 'es' ? `PMD ${r.period}: ≈ Ps. ${fmtN(r.capexMxnBn * 1000)} M (comunicado de GAP, 6-K del ${fmtDate(r.sourceDate)}), principalmente Guadalajara` : `${r.period} MDP: ≈ Ps. ${fmtN(r.capexMxnBn * 1000)} M (GAP release, 6-K of ${fmtDate(r.sourceDate)}), mainly Guadalajara`;
  }
  // CBX fact tiles: a fact may be computed from the data instead of typed (Tijuana's 2025 passengers = the twelve monthly reports).
  const factValue = (f) => (f.computed ? (f.computed.fn === 'paxYear' ? (paxYear(f.computed.code, f.computed.year) != null ? paxYear(f.computed.code, f.computed.year) / 1000 : null) : null) : f.v);
  const fmtFact = (f) => { const v = factValue(f); return v == null ? '—' : f.fmt === 'int' ? fmtN(v) : f.fmt === 'usdM' ? 'US$ ' + fmtN(v, 1) + ' M' : f.fmt === 'pct' ? fmtPct(100 * v) : f.fmt === 'M' ? fmtN(v, 2) + ' M' : fmtN(v); };

  // ---------------- analytics the deck draws (owner, 15-Oct-2026) ----------------
  // EBITDA bridge between a period and its base (B as restated in A's report): revenue lines add, the cash operating
  // cost lines subtract; IFRIC 12 construction revenue and cost cancel and D&A sits below EBITDA, so the steps tie to
  // the reported EBITDA within rounding. CBX (Exhibit A: revenue and EBITDA of the consolidated months) is one step of
  // its own; its cost of services is inside the consolidated line, so the "cost of services" step is ex-CBX.
  function ebitdaBridge(A, B) {
    if (!A || !B || !A.is || !B.is || A.is.ebitda == null || B.is.ebitda == null) return null;
    const d = (k) => ((A.is[k] || 0) - (B.is[k] || 0));
    const cbx = (o) => (o.seg && o.seg.CBX ? { rev: o.seg.CBX.revTotal || 0, ebitda: o.seg.CBX.ebitda || 0 } : { rev: 0, ebitda: 0 });
    const ca = cbx(A), cb = cbx(B); const cbxRev = ca.rev - cb.rev, cbxEbitda = ca.ebitda - cb.ebitda, cbxCost = cbxRev - cbxEbitda;
    const steps = [
      { k: 'revAero', v: d('revAero') },
      { k: 'revNonAeroEx', v: d('revNonAero') - cbxRev },
      { k: 'cbx', v: cbxEbitda },
      { k: 'costServicesEx', v: -(d('costServices') - cbxCost) },
      { k: 'techAssistance', v: -d('techAssistance') },
      { k: 'concessionTaxes', v: -d('concessionTaxes') },
      { k: 'otherIncome', v: -d('otherIncome') },
    ];
    const sum = steps.reduce((a, s) => a + s.v, 0);
    return { start: B.is.ebitda, end: A.is.ebitda, steps, residual: A.is.ebitda - B.is.ebitda - sum, cbx: { rev: ca.rev, ebitda: ca.ebitda, cost: ca.rev - ca.ebitda } };
  }
  // Growth excluding CBX: revenue ex-IFRIC 12 and EBITDA without the consolidated CBX months (Exhibit A), against the base
  // period (which has no CBX). The non-recurring items GAP itself names in 2Q26 (the technical-assistance provision
  // reversal and the merger expenses) are read from the curated `oneOffs` of the comments file when present.
  function exCbx(A, B) {
    if (!A || !B || !A.is || !B.is) return null;
    const revEx = (o) => o.is.revTotal - (o.is.revConstruction || 0);
    const c = (o) => (o.seg && o.seg.CBX) || { revTotal: 0, ebitda: 0 };
    return { revA: revEx(A) - (c(A).revTotal || 0), revB: revEx(B) - (c(B).revTotal || 0), ebitdaA: A.is.ebitda - (c(A).ebitda || 0), ebitdaB: B.is.ebitda - (c(B).ebitda || 0), revReported: [revEx(A), revEx(B)], ebitdaReported: [A.is.ebitda, B.is.ebitda] };
  }
  // Traffic by country over a quarter / year-to-date (thousands), from the monthly reports; MX = the twelve Mexican airports.
  function paxByCountry(yms) {
    const ms = yms.map((ym) => trByYm[ym]); if (!ms.length || !ms.every(Boolean)) return null;
    const jm = AIR.filter((a) => a.country === 'JM').map((a) => a.code);
    const sum = (codes) => ms.reduce((a, m) => a + codes.reduce((b, c) => b + (m.total[c] || 0), 0), 0);
    return { JM: sum(jm), MX: sum(AIR.filter((a) => a.country === 'MX').map((a) => a.code)), TOTAL: sum(['TOTAL']) };
  }
  // Capex: the guided year's capex against the year-to-date cash-flow line, plus the prior year's outcome (guidance vs actual).
  function capexProgress() {
    const fy = GV.length ? Math.max(...GV.map((v) => v.fy)) : null; if (!fy) return null;
    const g = GV.filter((v) => v.fy === fy).pop(), gx = g && g.items.capex ? g.items.capex.mxnM : null;
    const act = gActual(fy); const ytdCapex = act && act.v.capex != null ? act.v.capex : null;
    const prev = Y.find((y) => y.fy === fy - 1), gp = GV.filter((v) => v.fy === fy - 1).pop();
    const years = Y.filter((y) => y.cf && y.cf.capex != null).slice(-6).map((y) => ({ fy: y.fy, capex: -y.cf.capex / 1000, guided: (GV.filter((v) => v.fy === y.fy).pop() || { items: {} }).items.capex?.mxnM ?? null }));
    return { fy, guided: gx, guidedDate: g && g.date, guidedVintage: g || null, ytd: ytdCapex, ytdLabel: act && act.label, prevFy: prev ? prev.fy : null, prevActual: prev && prev.cf ? -prev.cf.capex / 1000 : null, prevGuided: gp && gp.items.capex ? gp.items.capex.mxnM : null, years, mdp: REF.regulation && REF.regulation.mdp };
  }
  // Liquidity at the latest balance sheet (Ps. M): cash, the instruments maturing within twelve months of that date, the
  // committed bank facilities signed after it (reference.js → debt.facilities) and the dividend declared and not yet paid.
  function liquidity() {
    const q = lastQ; if (!q || !q.bs) return null;
    const D2 = REF.debt || {}, asOf = qEndDate(q), to12 = addDays(asOf, 365);
    const inst = (D2.instruments || []).filter((i) => i.matures && i.matures > asOf && i.matures <= to12);
    const due12 = inst.reduce((a, i) => a + (i.principalMxn || 0), 0);
    const fac = D2.facilities || [];
    const L2 = lastLTM; const nd = netDebt(q);
    return { asOf, cash: q.bs.cash / 1000, due12, due12Items: inst, facilities: fac, dividendsPayable: q.bs.dividendsPayable != null ? q.bs.dividendsPayable / 1000 : null, cfoLtm: L2 && L2.cf && L2.cf.cfo != null ? L2.cf.cfo / 1000 : null, capexLtm: L2 && L2.cf && L2.cf.capex != null ? -L2.cf.capex / 1000 : null, interestLtm: L2 && L2.cf && L2.cf.interestPaid != null ? -L2.cf.interestPaid / 1000 : null, taxesLtm: L2 && L2.cf && L2.cf.taxesPaid != null ? -L2.cf.taxesPaid / 1000 : null, gross: nd ? nd.gross / 1000 : null, net: nd ? nd.net / 1000 : null };
  }
  // Like-for-like per-share figures: the base period's income on the current period's share count, so the dilution of
  // the CBX merger (89.7 M new shares, May 2026) is separated from the change in income.
  function likeForLike(A, B) {
    const pa = perShare(A, periodFx(A)), pb = perShare(B, periodFx(A)); if (!pa || !pb || !pa.sh || !pb.sh) return null;
    const ciB = B.is.comprehensiveControlling, niB = B.is.netIncome, tcB = B.is.comprehensiveIncome, ncB = B.is.netIncomeControlling;
    return { A: pa, B: pb, shares: [pa.sh, pb.sh], sharesChg: 100 * (pa.sh / pb.sh - 1), dilution: 100 * (1 - pb.sh / pa.sh), onA: { gap: tcB != null ? tcB * 1000 / pa.sh : null, ctrl: ciB != null ? ciB * 1000 / pa.sh : null, eps: niB != null ? niB * 1000 / pa.sh : null, epsCtrl: ncB != null ? ncB * 1000 / pa.sh : null } };
  }

  // ---------------- model API for the presentation builder (present.js) ----------------
  // Read-only view of the same calculations the page renders, so the PDF and the screen never disagree.
  window.GAP_MODEL = {
    get LANG() { return LANG; }, nextResults, nextResultsText, nextTraffic, nextTrafficText, liveTokens, t, L, LS, locale, fmtN, fmtM, fmtPct, fmtX, fmtDate, fmtChg, fmtChgV, chgPct, qLabel, ytdLabel, ymLabel, ymLabelLong, addDays,
    FIN, TR, MK, REF, GD, CM, SUM, Q, Y, YTD, lastQ, qById, ytdById, prevQid, yoyQid, ytdFor, ltmFor, lastLTM, fixRatios, sumParts,
    cmpBase, bsBase, isYoy, restatedNote, perShare, wavgShares, ltmShareNote, debtSources, guidanceDate, fmtGuidanceDate, periodFx, periodStart, periodEnd, reportDate, fmtReportDate, reportKindLabel, isValue, isLayout, lineLabel, PER_SHARE_ROWS, ADS, currentPair, likeForLike,
    ebitdaBridge, exCbx, paxByCountry, capexProgress, liquidity, trafficLatest, trafficQtd, trafficYoySeries, trafficSeries, paxYear, factValue, fmtFact, mdpUseText,
    px, lastPoint, pointAtOrBefore, fxAt, fxPts, mx10, gapPx, lastPx, sharesNow, sharesAt, qEndDate, DEBT, netDebt,
    avgFx, yoyCommentsFor, periodYms, opsFor, trByYm, AIR,
    GM, GV, gRange, gMid, gActualFmt, gStatus, gGrowthSet, gActual,
    betaFromMarket, kdFromDebt, ...(DCF_ON ? { dcfDefaults, dcfCompute, DCF_LIMITS } : {}), PEERS, peersOwnRow, ntmMultiples, ntmLbl, ltmLbl, priceSrcLabel, priceSources, marketSrcNote, marketCadence,
  };

    let initial = 'es'; try { initial = localStorage.getItem('fnam-lang') || localStorage.getItem('gap-lang') || 'es'; } catch (e) { /* ignore */ }
  { const qp = new URLSearchParams(location.search).get('lang'); if (qp === 'en' || qp === 'es') initial = qp; } // ?lang=en|es wins over the stored choice
  { const qp = new URLSearchParams(location.search).get('lang'); if (qp === 'en' || qp === 'es') initial = qp; } // ?lang=en|es wins over the stored choice
  fillSelects('yoy');
  setLang(initial);
})();
