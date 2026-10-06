// Hyperscaler Hub · Module 3: Capex and financing. Reads window.HYP_FIN (written by the hub's build script) and renders
// every section in the language on screen. No figure is computed here except the labeled FNAM calculations
// (sums of a company's own quarters, ratios); nothing is imputed: a missing input prints "Not disclosed".
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB;
  if (!F || !H) return;
  var t = H.t, esc = H.esc;
  var CO = Object.values(F.companies);
  var CORE = CO.filter(function (c) { return c.group === 'core'; });
  var NEO = CO.filter(function (c) { return c.group !== 'core'; });
  var charts = {};
  var state = { group: 'core', measure: 'capex_cash', co: 'MSFT', iss: 'all' };
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, html) { var e = $(id); if (e) e.innerHTML = html; };

  // ---------- data helpers ----------
  function v(q, k) { return q && q.m[k] ? q.m[k][0] : null; }
  function def(k) { var d = F.defs[k]; return d ? d[H.lang] : k; }
  var DER = {
    capex_incl_fl: { es: 'Capex incl. arrendamientos financieros', en: 'Capex incl. finance leases', how: { es: 'capex en efectivo + activos adquiridos mediante arrendamiento financiero (no monetario), mismo trimestre', en: 'cash capex + assets acquired under finance leases (non-cash), same quarter' } },
    fcf: { es: 'Flujo libre (FEO − capex en efectivo)', en: 'Free cash flow (OCF − cash capex)', how: { es: 'flujo de operación − capex en efectivo', en: 'operating cash flow − cash capex' } },
    fcf_after_fl: { es: 'Flujo libre después de principal de arrendamientos', en: 'FCF after finance-lease principal', how: { es: 'flujo libre − pagos de principal de arrendamientos financieros', en: 'free cash flow − principal payments on finance leases' } },
    capex_ocf: { es: 'Capex / flujo de operación', en: 'Capex / operating cash flow', how: { es: 'capex en efectivo ÷ flujo de operación (n.s. si el flujo es ≤ 0)', en: 'cash capex ÷ operating cash flow (n.m. when the flow is ≤ 0)' } }
  };
  function dname(k) { return DER[k] ? DER[k][H.lang] : def(k); }
  // short column headers for the wide comparison tables (the full name is in each figure's source card)
  var SHORT = {
    capex_cash: ['Capex en efectivo', 'Cash capex'], fl_additions: ['Arrend. financieros nuevos', 'New finance leases'], capex_incl_fl: ['Capex incl. arrend. fin.', 'Capex incl. fin. leases'],
    ocf: ['Flujo de operación', 'Operating cash flow'], capex_ocf: ['Capex / flujo de op.', 'Capex / OCF'], fcf: ['Flujo libre', 'Free cash flow'], fcf_after_fl: ['Flujo libre tras arrend.', 'FCF after leases'],
    debt_proceeds: ['Deuda emitida', 'Debt issued'], debt_repaid: ['Deuda pagada', 'Debt repaid'], cp_net: ['Papel comercial neto', 'Commercial paper, net'], equity_proceeds: ['Acciones emitidas', 'Equity issued'],
    pref_proceeds: ['Preferentes emitidas', 'Preferred issued'], buybacks: ['Recompras', 'Buybacks'], dividends: ['Dividendos', 'Dividends'],
    cash: ['Efectivo e inv. CP', 'Cash & ST inv.'], debt: ['Deuda total', 'Total debt'], ol_liab: ['Arrend. operativos', 'Operating leases'], fl_liab: ['Arrend. financieros', 'Finance leases']
  };
  function sname(k) { return SHORT[k] ? SHORT[k][H.lang === 'es' ? 0 : 1] : dname(k); }
  var METHOD = {
    reported: { es: 'reportado tal cual (hecho de 3 meses o saldo al cierre)', en: 'as reported (3-month fact or period-end balance)' },
    ytd_subtraction: { es: 'derivado: acumulado del año menos el acumulado del trimestre anterior, misma etiqueta', en: 'derived: year-to-date minus the prior quarter\'s year-to-date, same tag' },
    fy_minus_9m: { es: 'derivado: año fiscal (10-K) menos nueve meses (10-Q), misma etiqueta', en: 'derived: fiscal year (10-K) minus nine months (10-Q), same tag' }
  };
  function cell(c, q, k) {
    var x = q && q.m[k];
    if (!x) return H.ntCell(c.ticker, k);
    var acc = x[2];
    var links = acc.map(function (a) { return '<a href="' + H.edgar(c.cik, a) + '" target="_blank" rel="noopener">' + a + '</a>'; }).join(', ');
    // x[6]: the outlier check read in the filing (outliers.json): confirmed clears the flag and
    // prints 'matched'; reclassified keeps the flag and explains it. Both carry the quote, page and verification rows.
    var cf = x[6] || null, cfNote = cf ? (cf['note_' + H.lang] || cf.note_en || '') : '';
    var cfRows = cf ? [[t('Control de atípicos', 'Outlier check'), t('más de 5× la mediana de los cuatro trimestres previos (US$ ' + cf.medianUSDm + ' M); leído en la presentación: ', 'more than 5× the median of the four quarters before (US$ ' + cf.medianUSDm + ' m); read in the filing: ') + (cf.result === 'confirmed' ? t('confirmado. ', 'confirmed. ') : t('explicado, aviso conservado. ', 'explained, flag kept. ')) + cfNote]].concat(H.citeRows(cf.src)) : [];
    return H.money(x[0]) + (x[4] ? H.flag('review', cf ? cfNote : null) : '') + (x[5] ? H.flag('mixed') : '') + (cf && cf.result === 'confirmed' ? H.flag('ok') : '') + H.src({
      title: c.name + ' · ' + def(k) + ' · ' + H.fq(q.id),
      rows: [[t('Fin del periodo', 'Period end'), H.date(q.end)], [t('Etiqueta XBRL', 'XBRL tag'), x[1]], [t('Método', 'Method'), METHOD[x[3]] ? METHOD[x[3]][H.lang] : x[3]], [t('Presentación(es)', 'Filing(s)'), links, true], [t('Nivel', 'Tier'), 'T1 · SEC EDGAR (XBRL companyfacts)'],
        x[4] && !cf ? [t('Aviso', 'Flag'), t('Revisar: valor atípico o trimestres que no suman el año (posible reexpresión); ver la página de calidad', 'Needs review: outlier or quarters that do not sum to the year (possible recast); see the quality page')] : null,
        x[5] ? [t('Aviso', 'Flag'), t('Este trimestre usa otra etiqueta que el resto del año', 'This quarter uses a different tag from the rest of its year')] : null].concat(cfRows),
      url: (cf && cf.src && cf.src.url) || H.edgar(c.cik, acc[0])
    });
  }
  // the input a derived figure lacks, so the gap can carry that input's recorded reason (not-tagged.json)
  var DEP = { capex_incl_fl: 'fl_additions', fcf_after_fl: 'fl_principal', fcf: 'ocf', capex_ocf: 'ocf', net_debt: 'cash', lease_adj_net_debt: 'fl_liab' };
  function calc(val, k, c, q, ttm) {
    if (val == null) return k === 'capex_ocf' ? H.nm() : H.ntCell(c.ticker, DEP[k] || k, { why: t('Falta un insumo sin etiqueta XBRL para este periodo', 'An input is not tagged in XBRL for this period'), ttm: !!ttm });
    var shown = k === 'capex_ocf' ? H.capexOcf(val) : H.money(val);
    var z = q && ((ttm ? q.ttm && q.ttm._zero : q.d && q.d._zero) || []), zr = z.indexOf(DEP[k]) >= 0 ? H.ntReason(c.ticker, DEP[k]) : null;
    return shown + H.src({ title: c.name + ' · ' + dname(k) + (q ? ' · ' + H.fq(q.id) : ''), rows: [[t('Cálculo FNAM', 'FNAM calculation'), DER[k] ? DER[k].how[H.lang] : ''], [t('Base', 'Basis'), ttm ? t('últimos doce meses = suma de los cuatro trimestres fiscales consecutivos más recientes (o el año fiscal si el periodo cierra el año)', 'trailing twelve months = sum of the four most recent consecutive fiscal quarters (or the fiscal year when the period closes the year)') : t('trimestre', 'quarter')], [t('Insumos', 'Inputs'), t('cifras T1 de la tabla; cada una abre su presentación', 'T1 figures in the table; each opens its filing')], zr ? [t('Insumo tomado como cero', 'Input taken as zero'), (F.defs[DEP[k]] ? F.defs[DEP[k]][H.lang] : DEP[k]) + ': ' + (zr['note_' + H.lang] || zr.note_en)] : null] });
  }
  function ttmCell(c, q, k) {
    var val = q && q.ttm ? q.ttm[k] : null;
    if (val == null) return H.ntCell(c.ticker, k, { why: t('No hay cuatro trimestres consecutivos etiquetados', 'Four consecutive tagged quarters are not available'), ttm: true });
    var i = c.quarters.indexOf(q), four = c.quarters.slice(Math.max(0, i - 3), i + 1);
    var rev = four.some(function (x) { return x.m[k] && x.m[k][4]; });
    var fromFY = q.ttm._fromFY && q.ttm._fromFY.indexOf(k) >= 0;
    return H.money(val) + (rev ? H.flag('review') : '') + H.src({ title: c.name + ' · ' + def(k) + ' · ' + t('UDM al', 'TTM to') + ' ' + H.date(q.end), rows: [[t('Cálculo FNAM', 'FNAM calculation'), fromFY ? t('año fiscal completo del 10-K (el periodo cierra el año)', 'full fiscal year from the 10-K (the period closes the year)') : t('suma de ', 'sum of ') + four.map(function (x) { return H.fq(x.id); }).join(' + ')], [t('Presentaciones', 'Filings'), four.map(function (x) { return x.m[k] ? x.m[k][2].map(function (a) { return '<a href="' + H.edgar(c.cik, a) + '" target="_blank" rel="noopener">' + a + '</a>'; }).join(', ') : ''; }).filter(Boolean).join('; '), true]], url: q.m[k] ? H.edgar(c.cik, q.m[k][2][0]) : null });
  }
  function latest(c) { return c.latest ? c.quarters.find(function (q) { return q.id === c.latest.id; }) : null; }
  function lastWith(c, k) { for (var i = c.quarters.length - 1; i >= 0; i--) if (c.quarters[i].m[k]) return c.quarters[i]; return null; }
  function sw(c) { return '<span class="sw" style="background:' + H.color(c.ticker) + '"></span>'; }
  function coName(c) { return sw(c) + '<b>' + esc(c.name) + '</b> <span class="muted small">' + c.ticker + '</span>'; }
  function edgarCo(c) { return 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=' + c.cik + '&type=10-&dateb=&owner=include&count=40'; }
  function killChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
  function legend(items) { return items.map(function (i) { return '<span><i class="' + (i.cls || '') + '" style="' + (i.cls === 'hatch' ? 'color:' : 'background:') + i.color + '"></i>' + esc(i.label) + '</span>'; }).join(''); }
  function seg(id, opts, cur, fn) {
    set(id, opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (o[0] === cur ? 'active' : '') + '" aria-pressed="' + (o[0] === cur) + '">' + o[1] + '</button>'; }).join(''));
    $(id).querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { fn(b.dataset.v); }); });
  }
  var latestEnds = CO.filter(function (c) { return c.latest; }).map(function (c) { return c.latest.end; }).sort();
  var asOfRange = latestEnds.length ? H.date(latestEnds[0]) + ' – ' + H.date(latestEnds[latestEnds.length - 1]) : '';
  var SRC_XBRL = function () { return [{ label: 'SEC EDGAR XBRL companyfacts', url: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces' }]; };

  // ---------- header ----------
  function header() {
    var S = window.HYP_STATUS || {};
    set('asofRow', '<span><b>' + t('Periodos más recientes', 'Latest periods') + '</b> ' + H.date(latestEnds[0]) + ' – ' + H.date(latestEnds[latestEnds.length - 1]) + '</span>' + H.buildRow() +
      (F.debt ? '<span><b>' + t('Instantánea FactSet', 'FactSet snapshot') + '</b> ' + H.date(F.debt.pulledAt) + '</span>' : ''));
    void S;
    var notes = [];
    var st = CO.filter(function (c) { return H.stale(c).stale; });
    if (st.length) notes.push('<div class="notice bad"><b>' + t('Datos desactualizados', 'Stale data') + ':</b> ' + st.map(function (c) { return esc(c.name) + ' (' + t('presentación esperada a más tardar el', 'filing expected by') + ' ' + H.date(c.nextFilingDue) + ')'; }).join('; ') + '. ' + t('Sus cifras se muestran, pero no son las vigentes.', 'Their figures are shown but are not current.') + '</div>');
    if (S.edgarErrors && S.edgarErrors.length) notes.push('<div class="notice warn"><b>' + t('La última consulta a EDGAR falló para', 'The last EDGAR poll failed for') + '</b> ' + S.edgarErrors.map(function (e) { return esc(e.ticker + ' (' + e.api + ')'); }).join(', ') + '. ' + t('Se muestran los valores almacenados de la consulta anterior.', 'Stored values from the previous poll are shown.') + '</div>');
    set('notices', notes.join(''));
    // KPIs
    // calendarized: every company at the same calendar quarter (H.calTTM); OCF from the same fiscal quarters
    var X = H.calTTM(CORE, 'capex_cash'), cap = X ? X.total : null, ocf = 0, missing = X ? X.missing.slice() : CORE.map(function (c) { return c.name; });
    if (X) X.rows.forEach(function (r) { if (r.q.ttm.ocf != null) ocf += r.q.ttm.ocf; else { ocf = null; missing.push(r.c.name); } });
    var win = X ? t('UDM al ', 'TTM to ') + H.cq(X.cal) + t(' calendario', ' (calendar)') : '';
    var leases = 0, lm = [];
    CORE.forEach(function (c) { var qo = lastWith(c, 'ol_liab'), qf = lastWith(c, 'fl_liab'); if (qo) leases += v(qo, 'ol_liab'); if (qf) leases += v(qf, 'fl_liab'); if (!qo || !qf) lm.push(c.name); });
    var iss = F.debt ? F.debt.deals.reduce(function (s, d) { return s + d.amount; }, 0) * 1e6 : null;
    set('kpis', [
      [t('Capex en efectivo, UDM, seis principales', 'Cash capex, TTM, core six'), H.money(cap) + (X ? H.src({ title: t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), rows: [[t('Ventana', 'Window'), win]].concat(H.calRows(X)).concat([[t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL)', 'FNAM calculation on T1 figures (XBRL)')]]) }) : ''), win + '. ' + H.offsetNote(X || { offsets: [] }) + (missing.length ? ' ' + t('Sin dato: ', 'Missing: ') + missing.join(', ') : '')],
      [t('Capex / flujo de operación, seis principales', 'Capex / operating cash flow, core six'), H.capexOcf(ocf ? cap / ocf : null), t('Cálculo FNAM con las mismas sumas UDM calendarizadas', 'FNAM calculation on the same calendarized TTM sums')],
      [t('Deuda emitida desde ene-2025 (vigente)', 'Debt issued since Jan-2025 (outstanding)'), H.money(iss), t('Diez empresas; bonos, préstamos, convertibles; instantánea FactSet del ', 'Ten companies; bonds, loans, converts; FactSet snapshot of ') + H.date(F.debt && F.debt.pulledAt)],
      [t('Pasivos por arrendamiento, seis principales', 'Lease liabilities, core six'), H.money(leases), t('Operativos + financieros, último balance etiquetado; excluye arrendamientos aún no iniciados (módulo 6)', 'Operating + finance, latest tagged balance sheet; excludes leases not yet commenced (module 6)') + (lm.length ? '. ' + t('Balance trimestral incompleto: ', 'Quarterly balance incomplete: ') + lm.join(', ') : '')]
    ].map(function (k) { return '<div class="kpi"><div class="lbl">' + k[0] + '</div><div class="val">' + k[1] + '</div><div class="sub">' + k[2] + '</div></div>'; }).join(''));
  }

  // ---------- 01 trend ----------
  function trend() {
    var grp = state.group === 'core' ? CORE : NEO;
    seg('segGroup', [['core', t('Seis principales', 'Core six')], ['neo', t('Neonubes listadas', 'Listed neoclouds')]], state.group, function (x) { state.group = x; trend(); });
    seg('segMeasure', [['capex_cash', t('Capex en efectivo', 'Cash capex')], ['capex_incl_fl', t('Incl. arrendamientos financieros', 'Incl. finance leases')]], state.measure, function (x) { state.measure = x; trend(); });
    set('trendDesc', t('Compras de propiedades y equipo en efectivo por trimestre, apiladas por empresa y alineadas al trimestre calendario. Microsoft y IREN cierran su año en junio, Oracle y Applied Digital en mayo: sus trimestres que terminan en febrero, mayo, agosto y noviembre se comparan con el trimestre calendario que termina un mes después. La vista "incl. arrendamientos financieros" suma los activos recibidos mediante arrendamiento financiero, que no pasan por el estado de flujos: es la parte de la expansión que llega como deuda y no como efectivo.', 'Cash purchases of property and equipment by quarter, stacked by company and aligned to calendar quarters. Microsoft and IREN close their year in June, Oracle and Applied Digital in May: their quarters ending February, May, August and November are compared with the calendar quarter ending one month later. The "incl. finance leases" view adds assets received under finance leases, which never pass through the cash-flow statement: the part of the buildout that arrives as debt rather than cash.'));
    var cqs = {};
    grp.forEach(function (c) { c.quarters.forEach(function (q) { cqs[q.cal] = 1; }); });
    var allQ = Object.keys(cqs).sort();
    var cnt = function (l) { return grp.filter(function (c) { return c.quarters.some(function (x) { return x.cal === l && x.m.capex_cash; }); }).length; };
    var partial = [];
    while (allQ.length && cnt(allQ[allQ.length - 1]) * 2 < grp.filter(function (c) { return c.quarters.some(function (x) { return x.m.capex_cash; }); }).length) partial.unshift(allQ.pop());
    var labels = allQ.slice(-12);
    var gaps = [];
    var ds = grp.map(function (c) {
      var data = labels.map(function (l) {
        var q = c.quarters.find(function (x) { return x.cal === l; });
        var val = q ? (state.measure === 'capex_cash' ? v(q, 'capex_cash') : (q.d && q.d.capex_incl_fl != null ? q.d.capex_incl_fl : null)) : null;
        if (val == null) gaps.push(c.name + ' ' + H.cq(l));
        return val == null ? null : val / 1e9;
      });
      return { label: c.name, data: data, backgroundColor: H.color(c.ticker), borderColor: H.css('--surface'), borderWidth: 1, borderRadius: 3, borderSkipped: false, stack: 's', _c: c };
    });
    set('trendTitle', (state.measure === 'capex_cash' ? t('Capex en efectivo por trimestre calendario', 'Cash capex by calendar quarter') : t('Capex incl. arrendamientos financieros por trimestre calendario', 'Capex incl. finance leases by calendar quarter')) + ' · US$ ' + t('miles de millones', 'billions'));
    var gapCos = {}; gaps.forEach(function (g) { var n = g.replace(/ [TQ]\d \d{4}$/, ''); gapCos[n] = (gapCos[n] || 0) + 1; });
    set('trendCap', t('Barra apilada = suma de cifras con la misma definición (capex reportado por cada empresa); no se suman megavatios ni definiciones distintas.', 'Stacked bar = sum of figures with the same definition (capex each company reports); no megawatts or different definitions are added.') + (Object.keys(gapCos).length ? ' <b>' + t('Huecos (sin etiqueta XBRL; no se imputa)', 'Gaps (not tagged in XBRL; not imputed)') + ':</b> ' + Object.keys(gapCos).map(function (n) { return esc(n) + ' (' + gapCos[n] + ' ' + t('trim.', 'qtrs') + ')'; }).join(', ') + '.' : '') + (partial.length ? ' ' + t('No se grafica ', 'Not charted: ') + partial.map(H.cq).join(', ') + t(', reportado por menos de la mitad del grupo (por ejemplo, el trimestre de Oracle a agosto); está en la tabla de la sección 03.', ', reported by fewer than half the group (for example Oracle\'s quarter to August); it is in the table in section 03.') : ''));
    killChart('trend');
    // phones: short quarter labels ("Q1'25"), never rotated; the legend sits above the chart (markup)
    var nar = H.narrow(), shortQ = function (l) { var s = H.cq(l); return nar ? s.replace(/^([TQ]\d) \d{2}(\d{2})$/, "$1'$2") : s; };
    charts.trend = new Chart($('chTrend'), { type: 'bar', data: { labels: labels.map(shortQ), datasets: ds }, options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0, autoSkip: nar, maxTicksLimit: nar ? 6 : 12, font: { size: nar ? 10.5 : 12 } } }, y: { stacked: true, ticks: { callback: H.axisMoney }, grid: { color: H.css('--grid') } } },
      plugins: { tooltip: { callbacks: {
        label: function (ctx) { return ctx.raw == null ? null : ctx.dataset.label + ': US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn'); },
        footer: function (items) { var s = items.reduce(function (a, i) { return a + (i.raw || 0); }, 0); return t('Suma: US$ ', 'Sum: US$ ') + H.num(s, 1) + (H.lang === 'es' ? ' mil M' : ' bn'); } } } } } });
    $('chTrend').setAttribute('aria-label', $('trendTitle').textContent);
    set('trendLegend', legend(grp.map(function (c) { return { label: c.name, color: H.color(c.ticker) }; })));
    set('trendStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: SRC_XBRL(), csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Trimestres derivados por resta del acumulado del año; ver ⓘ en la ficha por empresa', 'Quarters derived by subtracting year-to-date figures; see ⓘ in the company detail') }));
  }

  // ---------- 02 company ----------
  function company() {
    var sel = $('selCo');
    sel.innerHTML = CO.map(function (c) { return '<option value="' + c.ticker + '"' + (c.ticker === state.co ? ' selected' : '') + '>' + esc(c.name) + ' (' + c.ticker + ')</option>'; }).join('');
    sel.onchange = function () { state.co = sel.value; company(); };
    var c = F.companies[state.co];
    set('coDesc', t('Capex en efectivo frente a los activos que llegan por arrendamiento financiero, y cuánto del flujo de operación consume la inversión. Cada celda abre su fuente: etiqueta XBRL, método (reportado o derivado del acumulado) y la presentación.', 'Cash capex against the assets that arrive through finance leases, and how much of operating cash flow the investment absorbs. Each cell opens its source: XBRL tag, method (reported or derived from year-to-date) and the filing.'));
    set('coNote', c.note ? '<div class="callout">' + esc(c.note[H.lang]) + '</div>' : '');
    var qs = c.quarters.filter(function (q) { return q.m.capex_cash || q.m.ocf; }).slice(-12);
    var annual = !qs.length;
    var rows = annual ? c.fy.slice(-4).map(function (f) { return { id: f.id, end: f.end, m: f.m, d: {} }; }) : qs;
    var lab = rows.map(function (q) { if (annual) return H.lang === 'es' ? q.id.replace('FY', 'AF') : q.id; var p = H.fq(q.id).split(' '); return [p[1], p[0]]; });
    var val = function (q, k) { return q.m[k] ? q.m[k][0] / 1e9 : null; };
    set('coChart1T', t('Capex en efectivo, arrendamientos financieros y flujo de operación', 'Cash capex, finance leases and operating cash flow') + ' · US$ ' + t('miles de millones', 'billions'));
    set('coChart1C', (annual ? t('Años fiscales (la empresa no presenta trimestres en XBRL). ', 'Fiscal years (the company files no quarters in XBRL). ') : t('Trimestres fiscales. ', 'Fiscal quarters. ')) + t('Barras: capex en efectivo y, encima, activos recibidos por arrendamiento financiero (no monetario). Línea: flujo de operación, mismo eje.', 'Bars: cash capex and, on top, assets received under finance leases (non-cash). Line: operating cash flow, same axis.'));
    killChart('co1');
    charts.co1 = new Chart($('chCo1'), { data: { labels: lab, datasets: [
      { type: 'line', label: t('Flujo de operación', 'Operating cash flow'), data: rows.map(function (q) { return val(q, 'ocf'); }), borderColor: H.css('--text-primary'), backgroundColor: H.css('--surface'), borderWidth: 2, pointRadius: 3, pointBackgroundColor: H.css('--surface'), order: 0, spanGaps: false },
      { type: 'bar', label: t('Capex en efectivo', 'Cash capex'), data: rows.map(function (q) { return val(q, 'capex_cash'); }), backgroundColor: H.color(c.ticker), borderColor: H.css('--surface'), borderWidth: 1, borderRadius: 3, borderSkipped: false, stack: 'c', order: 1 },
      { type: 'bar', label: t('Arrendamientos financieros (no monetario)', 'Finance leases (non-cash)'), data: rows.map(function (q) { return val(q, 'fl_additions'); }), backgroundColor: H.css('--de-emph'), borderColor: H.css('--surface'), borderWidth: 1, borderRadius: 3, borderSkipped: false, stack: 'c', order: 1 }
    ] }, options: { interaction: { mode: 'index', intersect: false }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: H.axisMoney } } },
      plugins: { tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + (ctx.raw == null ? t('no divulgado', 'not disclosed') : 'US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn')); } } } } } });
    set('coLegend1', legend([{ label: t('Capex en efectivo', 'Cash capex'), color: H.color(c.ticker) }, { label: t('Arrendamientos financieros (no monetario)', 'Finance leases (non-cash)'), color: H.css('--de-emph') }, { label: t('Flujo de operación', 'Operating cash flow'), color: H.css('--text-primary'), cls: 'line' }]));
    set('coChart2T', t('Flujo libre antes y después del principal de arrendamientos', 'Free cash flow before and after finance-lease principal') + ' · US$ ' + t('miles de millones', 'billions'));
    set('coChart2C', t('Cálculo FNAM: flujo de operación − capex en efectivo; la segunda barra resta además el principal pagado de arrendamientos financieros. Barras bajo cero en rojo = la inversión supera al flujo.', 'FNAM calculation: operating cash flow − cash capex; the second bar also subtracts finance-lease principal paid. Bars below zero = investment exceeds the flow.'));
    var fcf = rows.map(function (q) { var o = val(q, 'ocf'), k = val(q, 'capex_cash'); return o == null || k == null ? null : o - k; });
    var fcf2 = rows.map(function (q, i) { var p = val(q, 'fl_principal'); return fcf[i] == null || p == null ? null : fcf[i] - p; });
    killChart('co2');
    charts.co2 = new Chart($('chCo2'), { type: 'bar', data: { labels: lab, datasets: [
      { label: t('Flujo libre', 'Free cash flow'), data: fcf, backgroundColor: fcf.map(function (x) { return x != null && x < 0 ? H.css('--bad') : H.color(c.ticker); }), borderRadius: 3, borderSkipped: false },
      { label: t('Después de principal de arrendamientos', 'After finance-lease principal'), data: fcf2, backgroundColor: H.css('--de-emph'), borderRadius: 3, borderSkipped: false }
    ] }, options: { interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: H.axisMoney } } },
      plugins: { tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + (ctx.raw == null ? t('falta un insumo', 'an input is missing') : 'US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn')); } } } } } });
    set('coLegend2', legend([{ label: t('Flujo libre (negativo en rojo)', 'Free cash flow (negative in red)'), color: H.color(c.ticker) }, { label: t('Después de principal de arrendamientos', 'After finance-lease principal'), color: H.css('--de-emph') }]));
    // table: last 8 quarters (or the fiscal years for annual-only filers)
    var cols = rows.slice(-8);
    var lines = [['capex_cash', 'T1'], ['fl_additions', 'T1'], ['capex_incl_fl', 'C'], ['fl_principal', 'T1'], ['ocf', 'T1'], ['fcf', 'C'], ['fcf_after_fl', 'C'], ['capex_ocf', 'C'], ['da', 'T1'], ['ol_additions', 'T1'], ['interest_cap', 'T1']];
    function cellFor(q, k) {
      if (annual) { var x = q.m[k]; return x ? H.money(x[0]) + H.src({ title: c.name + ' · ' + def(k) + ' · ' + q.id, rows: [[t('Etiqueta XBRL', 'XBRL tag'), x[1]], [t('Presentación', 'Filing'), x[2][0]]], url: H.edgar(c.cik, x[2][0]) }) : (DER[k] ? H.nd() : H.nd()); }
      if (DER[k]) { var dv = k === 'capex_ocf' ? (q.d ? q.d.capex_ocf : null) : (q.d ? q.d[k] : null); return calc(dv, k, c, q, false); }
      return cell(c, q, k);
    }
    set('coTblT', t('Partidas trimestrales', 'Quarterly line items') + ' · ' + esc(c.name));
    set('coTblC', t('Las columnas son trimestres fiscales con su cierre; T1 = etiquetado por la empresa en su presentación; Cálculo FNAM = derivado de cifras T1.', 'Columns are fiscal quarters with their period end; T1 = tagged by the company in its filing; FNAM calc. = derived from T1 figures.'));
    var head = '<tr><th class="l">' + t('Partida', 'Line item') + '</th><th class="l">' + t('Nivel', 'Tier') + '</th>' + cols.map(function (q) { return '<th>' + (annual ? q.id : H.fq(q.id)) + '<br><span style="font-weight:400;text-transform:none">' + H.date(q.end) + '</span></th>'; }).join('') + '</tr>';
    var body = lines.map(function (ln) { return '<tr><td class="l">' + esc(dname(ln[0])) + '</td><td class="l">' + H.tier(ln[1]) + '</td>' + cols.map(function (q) { return '<td>' + cellFor(q, ln[0]) + '</td>'; }).join('') + '</tr>'; }).join('');
    // phone: line item · latest period · y/y change, note beneath
    var last = cols[cols.length - 1], yago = annual ? cols[cols.length - 2] : cols[cols.length - 5];
    var mob = lines.map(function (ln) {
      var k = ln[0], gv = function (q) { if (!q) return null; return DER[k] ? (q.d ? q.d[k] : null) : (q.m[k] ? q.m[k][0] : null); };
      var a = gv(last), b = gv(yago);
      var chg = a != null && b != null && b !== 0 && k !== 'capex_ocf' ? (a - b) / Math.abs(b) : null;
      return '<div class="mrow"><div class="h"><b>' + esc(dname(k)) + '</b><span class="v">' + (a == null ? H.nt() : (k === 'capex_ocf' ? H.capexOcf(a) : H.money(a))) + '</span></div><div class="c">' + (annual ? last.id : H.fq(last.id)) + ' · ' + t('a/a', 'y/y') + ' ' + (chg == null ? t('n.s.', 'n.m.') : (chg > 0 ? '+' : '') + H.num(chg * 100, 0) + '%') + ' · ' + (ln[1] === 'C' ? t('cálculo FNAM', 'FNAM calculation') : 'T1 · SEC') + '</div></div>';
    }).join('');
    set('coTbl', '<div class="only-d"><table>' + '<thead>' + head + '</thead><tbody>' + body + '</tbody></table></div><div class="only-m">' + mob + '</div>');
    set('coStamp', H.stamp({ tier: 'T1', asOf: last ? H.date(last.end) : '', sources: [{ label: 'EDGAR · ' + c.name, url: edgarCo(c) }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv' }));
  }

  // ---------- 03 TTM ----------
  function ttm() {
    set('ttmDesc', t('Últimos doce meses al trimestre más reciente de cada empresa. Los cierres difieren (Oracle a agosto, Microsoft a junio): la columna de periodo lo dice. "Capex incl. arrendamientos financieros" solo aparece cuando la empresa etiqueta ambos componentes en los mismos cuatro trimestres.', 'Trailing twelve months to each company\'s latest quarter. Period ends differ (Oracle to August, Microsoft to June): the period column says so. "Capex incl. finance leases" appears only when the company tags both components in the same four quarters.'));
    var ks = ['capex_cash', 'fl_additions', 'capex_incl_fl', 'ocf', 'capex_ocf', 'fcf', 'fcf_after_fl'];
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Periodo (UDM al)', 'Period (TTM to)') + '</th>' + ks.map(function (k) { return '<th>' + esc(sname(k)) + '<br>' + H.tier(DER[k] ? 'C' : 'T1') + '</th>'; }).join('') + '</tr>';
    function row(c) {
      var q = latest(c);
      if (!q) return '<tr><td class="l">' + coName(c) + '</td><td class="l" colspan="' + (ks.length + 1) + '">' + H.nd() + '</td></tr>';
      var s = H.stale(c);
      return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.fq(q.id) + ' · ' + H.date(q.end) + (s.stale ? H.flag('stale') : '') + '</td>' + ks.map(function (k) { return '<td>' + (DER[k] ? calc(q.ttm[k], k, c, q, true) : ttmCell(c, q, k)) + '</td>'; }).join('') + '</tr>';
    }
    var mrow = function (c) { var q = latest(c); if (!q) return ''; var s = H.stale(c); return '<div class="mrow"><div class="h"><b>' + sw(c) + esc(c.name) + '</b><span class="v">' + H.money(q.ttm.capex_cash) + '</span></div><div class="c">' + t('Capex en efectivo UDM al ', 'Cash capex TTM to ') + H.date(q.end) + ' · ' + t('capex/flujo de op. ', 'capex/OCF ') + H.capexOcf(q.ttm.capex_ocf).replace(/<[^>]+>/g, '') + ' · ' + t('flujo libre ', 'FCF ') + H.money(q.ttm.fcf) + (q.ttm.capex_incl_fl != null ? ' · ' + t('incl. arrend. fin. ', 'incl. fin. leases ') + H.money(q.ttm.capex_incl_fl) : '') + (s.stale ? ' ' + H.flag('stale') : '') + '</div></div>'; };
    set('ttmTbl', '<div class="only-d"><table><thead>' + head + '</thead><tbody><tr class="grp"><td colspan="' + (ks.length + 2) + '">' + t('Seis principales', 'Core six') + '</td></tr>' + CORE.map(row).join('') + '<tr class="grp"><td colspan="' + (ks.length + 2) + '">' + t('Neonubes listadas', 'Listed neoclouds') + '</td></tr>' + NEO.map(row).join('') + '</tbody></table></div><div class="only-m">' + CO.map(mrow).join('') + '<p class="small muted">' + t('Tabla completa con fuentes (ⓘ) en pantalla ancha o en el CSV.', 'Full table with sources (ⓘ) on a wide screen or in the CSV.') + '</p></div>');
    set('ttmStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: SRC_XBRL(), csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Nebius: año fiscal 2025 del 20-F (sin trimestres en XBRL)', 'Nebius: fiscal 2025 from the 20-F (no XBRL quarters)') }));
    // guidance (T2)
    var G = F.guidance;
    set('guideT', t('Guía de capex de las empresas', 'Company capex guidance') + ' ' + H.tier('T2'));
    set('guideC', t('Declaración de la empresa, no auditada. Cada empresa define capex a su manera (Meta incluye el principal de arrendamientos financieros; Oracle separa capex bruto de capex neto en efectivo), así que la guía se muestra aparte y nunca se mezcla con las cifras reportadas.', 'Company statement, not audited. Each company defines capex its own way (Meta includes finance-lease principal; Oracle separates gross from net cash capex), so guidance is shown apart and never blended with reported figures.'));
    if (!G) { set('guideTbl', H.nd()); return; }
    var rngTxt = function (lo, hi, approx) { if (lo == null) return null; if (lo === hi) return (approx ? '≈ ' : '') + H.moneyM(lo, 0); return 'US$ ' + H.num(lo / 1000, 0) + '–' + H.num(hi / 1000, 0) + (H.lang === 'es' ? ' mil M' : ' bn'); };
    set('guideTbl', '<table><thead><tr><th scope="col" class="l">' + t('Empresa', 'Company') + '</th><th scope="col" class="l">' + t('Año fiscal', 'Fiscal year') + '</th><th scope="col">' + t('Rango guiado', 'Guided range') + '</th><th scope="col" class="l">' + t('Fecha de la guía', 'Guidance date') + '</th><th scope="col">' + t('Rango previo', 'Prior range') + '</th><th scope="col">' + t('Capex en efectivo UDM (T1)', 'Cash capex TTM (T1)') + '</th></tr></thead><tbody>' +
      G.items.map(function (g) {
        var c = F.companies[g.ticker]; var q = latest(c);
        var rng = g.low == null ? (g.status === 'not_in_dataset' ? '<span class="nd" title="' + t('La empresa no figura con guía de capex en el conjunto de FactSet; puede haberla dado en su llamada', 'The company has no capex guidance in FactSet\'s dataset; it may have given one on its call') + '">' + t('Sin dato en FactSet', 'Not in FactSet') + '</span>' : H.nd(t('La empresa no da un rango anual de capex', 'The company gives no annual capex range'))) : rngTxt(g.low, g.high, g.approx);
        var note = (g['note_' + H.lang] ? esc(g['note_' + H.lang]) + ' ' : '') + '<span class="muted">' + t('Fuente', 'Source') + ': ' + esc(g.source) + '</span>';
        return '<tr><td class="l" style="border-bottom:0">' + coName(c) + '</td><td class="l" style="border-bottom:0">' + esc(H.lang === 'es' ? g.fy.replace('FY', 'AF') : g.fy) + ' · ' + t('cierra', 'ends') + ' ' + H.date(g.fyEnd) + '</td><td style="border-bottom:0">' + rng + (g.netCashMax ? '<br><span class="small muted">' + t('neto en efectivo ≤ ', 'net cash ≤ ') + H.moneyM(g.netCashMax, 0) + '</span>' : '') + '</td><td class="l" style="border-bottom:0">' + (g.date ? H.date(g.date) + guideAge(g.date) : '') + '</td><td style="border-bottom:0">' + (rngTxt(g.prevLow, g.prevHigh) || '') + '</td><td style="border-bottom:0">' + (q && q.ttm.capex_cash != null ? H.money(q.ttm.capex_cash) : H.nd()) + '</td></tr>' +
          '<tr><td colspan="6" class="wrap-cell small" style="max-width:none;padding-top:0;color:var(--text-secondary)">' + note + '</td></tr>';
      }).join('') + '</tbody></table>');
    set('guideStamp', H.stamp({ tier: 'T2', asOf: H.date(G.pulledAt), sources: [{ label: t('Conjunto de guías de FactSet; llamada de Oracle', 'FactSet guidance dataset; Oracle call') }], note: t('Se actualiza después de cada llamada de resultados', 'Updated after each earnings call') }));
  }

  // guidance not updated for more than two quarters gets an amber age note (computed in the reader's browser);
  // more than 12 months, the gray "> 12 months" flag
  function guideAge(d) {
    var days = Math.floor((Date.now() - Date.parse(d + 'T12:00:00Z')) / 864e5);
    if (H.aged(d)) return ' <span class="flag old">' + t('> 12 meses', '> 12 months') + '</span>';
    return days > 183 ? '<br><span class="flag">' + t('sin actualizar hace ', 'not updated for ') + Math.floor(days / 30.44) + t(' meses', ' months') + '</span>' : '';
  }

  // ---------- 04 funding ----------
  function funding() {
    set('fundDesc', t('De dónde salió el efectivo en los últimos doce meses: operación, deuda nueva, acciones; y a dónde fue además del capex: pagos de deuda, recompras y dividendos (las recompras son una compensación: efectivo que regresa a los accionistas en lugar de financiar la expansión). Las etiquetas de emisión de acciones se muestran tal como la empresa las reporta; una cifra atípica lleva el aviso "revisar".', 'Where cash came from in the last twelve months: operations, new debt, equity; and where it went besides capex: debt repayment, buybacks and dividends (buybacks are an offset: cash returned to shareholders instead of funding the buildout). Equity-issuance tags are shown as the company reports them; an outlier carries the "needs review" flag.'));
    var ks = ['ocf', 'capex_cash', 'debt_proceeds', 'debt_repaid', 'cp_net', 'equity_proceeds', 'pref_proceeds', 'buybacks', 'dividends'];
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('UDM al', 'TTM to') + '</th>' + ks.map(function (k) { return '<th>' + esc(sname(k)) + '</th>'; }).join('') + '</tr>';
    function row(c) { var q = latest(c); if (!q) return ''; return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.date(q.end) + '</td>' + ks.map(function (k) { return '<td>' + (q.ttm[k] == null && !q.m[k] ? H.ntCell(c.ticker, k, { why: t('Sin etiqueta en los cuatro trimestres', 'Not tagged in the four quarters'), ttm: true }) : ttmCell(c, q, k)) + '</td>'; }).join('') + '</tr>'; }
    set('fundTbl', '<table><thead>' + head + '</thead><tbody><tr class="grp"><td colspan="11">' + t('Seis principales', 'Core six') + '</td></tr>' + CORE.map(row).join('') + '<tr class="grp"><td colspan="11">' + t('Neonubes listadas', 'Listed neoclouds') + '</td></tr>' + NEO.map(row).join('') + '</tbody></table>');
    set('fundStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: SRC_XBRL(), csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Signos como en el estado de flujos: las salidas (capex, pagos, recompras, dividendos) se reportan en positivo', 'Signs as in the cash-flow statement: outflows (capex, repayments, buybacks, dividends) are reported as positive') }));
  }

  // ---------- 05 leverage ----------
  function leverage() {
    set('levDesc', t('Saldos al último balance trimestral etiquetado. "Deuda neta ajustada por arrendamientos" suma los pasivos por arrendamiento operativo y financiero ya reconocidos (ASC 842); los arrendamientos firmados que aún no inician no están en el balance y se muestran por separado en el módulo 6, nunca sumados aquí. La columna FactSet es un cotejo independiente de la deuda total. Cobertura = utilidad de operación UDM ÷ gasto por intereses UDM (neto de intereses capitalizados, que se muestran aparte).', 'Balances at the latest tagged quarterly balance sheet. "Lease-adjusted net debt" adds operating and finance lease liabilities already recognized (ASC 842); leases signed but not yet commenced are not on the balance sheet and are shown separately in module 6, never added here. The FactSet column is an independent check of total debt. Coverage = TTM operating income ÷ TTM interest expense (net of capitalized interest, shown separately).'));
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Balance al', 'Balance at') + '</th><th>' + sname('cash') + '</th><th>' + sname('debt') + '</th><th>' + t('FactSet (cotejo)', 'FactSet (check)') + '</th><th>' + t('Deuda neta', 'Net debt') + '</th><th>' + sname('ol_liab') + '</th><th>' + sname('fl_liab') + '</th><th>' + t('DN ajust. por arrend.', 'Lease-adj. net debt') + '</th><th>EBITDA ' + t('UDM', 'TTM') + '</th><th>' + t('DN / EBITDA', 'ND / EBITDA') + '</th><th>' + t('DN ajust. / EBITDA', 'Adj. ND / EBITDA') + '</th><th>' + t('Cobertura (EBIT / int.)', 'Coverage (EBIT / int.)') + '</th><th>' + t('Int. capitalizados UDM', 'Cap. interest TTM') + '</th></tr>';
    function row(c) {
      var q = lastWith(c, 'debt') || lastWith(c, 'cash'); if (!q) return '';
      var fs = F.debt && F.debt.totals[c.ticker];
      var dq = v(q, 'debt');
      var fsCell = fs ? H.moneyM(fs.total) + ' ' + H.tier('FS') + (dq != null && fs.report === q.end ? (Math.abs(fs.total * 1e6 - dq) / Math.max(1, Math.abs(dq)) <= 0.02 ? H.flag('ok') : H.flag('review')) : '<br><span class="small muted">' + t('al ', 'at ') + H.date(fs.report) + '</span>') : H.nd();
      var lq = latest(c) || q;
      var d = q.d || {};
      return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.date(q.end) + '</td><td>' + cell(c, q, 'cash') + '</td><td>' + cell(c, q, 'debt') + '</td><td>' + fsCell + '</td><td>' + calcM(d.net_debt, c, q, t('deuda total − efectivo e inversiones de corto plazo', 'total debt − cash and short-term investments'), q.m.debt ? 'cash' : 'debt') + '</td><td>' + cell(c, q, 'ol_liab') + '</td><td>' + cell(c, q, 'fl_liab') + '</td><td>' + calcM(d.lease_adj_net_debt, c, q, t('deuda neta + pasivos por arrendamiento operativo + financiero (sin arrendamientos no iniciados)', 'net debt + operating + finance lease liabilities (excludes leases not yet commenced)'), q.m.ol_liab ? 'fl_liab' : 'ol_liab') + '</td><td>' + calcM(lq.ttm.ebitda, c, lq, t('utilidad de operación UDM + D&A UDM', 'TTM operating income + TTM D&A'), 'da') + '</td><td>' + H.mult(q.ttm.nd_ebitda, 2) + '</td><td>' + H.mult(q.ttm.land_ebitda, 2) + '</td><td>' + H.mult(lq.ttm.int_cov, 1) + '</td><td>' + (lq.ttm.interest_cap != null ? ttmCell(c, lq, 'interest_cap') : H.ntCell(c.ticker, 'interest_cap', { ttm: true })) + '</td></tr>';
    }
    set('levTbl', '<table><thead>' + head + '</thead><tbody><tr class="grp"><td colspan="14">' + t('Seis principales', 'Core six') + '</td></tr>' + CORE.map(row).join('') + '<tr class="grp"><td colspan="14">' + t('Neonubes listadas', 'Listed neoclouds') + '</td></tr>' + NEO.map(row).join('') + '</tbody></table>');
    set('levStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: SRC_XBRL().concat(F.debt ? [{ label: 'FactSet Debt Capital Structure (' + H.date(F.debt.pulledAt) + ')' }] : []), csv: '/hiperescaladores/csv/balance-leverage-quarterly.csv', note: t('Deuda neta negativa = efectivo neto. "cotejado" = FactSet y XBRL difieren ≤ 2% en la misma fecha', 'Negative net debt = net cash. "matched" = FactSet and XBRL differ ≤ 2% at the same date') }));
  }
  function calcM(val, c, q, how, dep) {
    if (val == null) return H.ntCell(c.ticker, dep || 'debt', { why: t('Falta un insumo', 'An input is missing') });
    var zr = q.d && q.d._zero && q.d._zero.indexOf(dep) >= 0 ? H.ntReason(c.ticker, dep) : null;
    return H.money(val) + H.src({ title: c.name + ' · ' + H.fq(q.id), rows: [[t('Cálculo FNAM', 'FNAM calculation'), how], [t('Fin del periodo', 'Period end'), H.date(q.end)], zr ? [t('Insumo tomado como cero', 'Input taken as zero'), (F.defs[dep] ? F.defs[dep][H.lang] : dep) + ': ' + (zr['note_' + H.lang] || zr.note_en)] : null] });
  }

  // the match of a deal no 424B fee exhibit covered: result filing (the index found the terms in an 8-K / FWP / 6-K), partial
  // (a related facility or a different date) or unresolved; a harvested 10-K/10-Q page that names the instrument is quoted
  function fsStatus(c, d) {
    var f = d.fs;
    if (!f) return H.flag('review');
    var rows = [[t('Resultado', 'Result'), f.result === 'filing' ? t('presentación ante la SEC encontrada', 'SEC filing found') : f.result === 'partial' ? t('cotejo parcial', 'partial match') : t('sin resolver', 'unresolved')]];
    if (f.filing) rows.push([t('Presentación', 'Filing'), f.filing.form + ' · ' + f.filing.accn + ' · ' + t('presentada ', 'filed ') + H.date(f.filing.filed) + (f.filing.items ? ' · ' + t('puntos ', 'items ') + f.filing.items : '')], [t('Método', 'Method'), t('índice de texto completo de EDGAR: la frase del cupón y vencimiento (o del tipo de línea) aparece en la presentación; el documento mismo no se leyó', 'EDGAR full-text index: the coupon-and-maturity phrase (or facility type) appears in the filing; the document itself was not read')], [t('Frases', 'Phrases'), (f.filing.phrases || []).join(' · ')], [t('Documentos', 'Documents'), (f.filing.docs || []).join(', ')]);
    if (f.textSrc) rows = rows.concat([[t('Página que lo nombra', 'Page naming it'), '']]).concat(H.citeRows(f.textSrc));
    if (f['note_' + H.lang] || f.note_en) rows.push([t('Nota', 'Note'), f['note_' + H.lang] || f.note_en]);
    rows.push([t('Verificación', 'Verification'), f.status === 'matched' ? t('cotejado ', 'matched ') + (f.verifiedOn ? H.date(f.verifiedOn) + ' · ' : '') + H.VERIF[H.lang] : t('pendiente', 'pending')], [t('Revisión de analista', 'Analyst review'), f.reviewedBy || t('ninguna', 'none')]);
    var card = H.src({ title: c.name + ' · ' + H.date(d.issued), rows: rows, url: (f.filing && f.filing.url) || (f.textSrc && f.textSrc.url) || null });
    if (f.result === 'filing') return H.flag('ok') + ' ' + (f.filing ? '<a href="' + esc(f.filing.url) + '" target="_blank" rel="noopener">' + esc(f.filing.form) + ' ' + f.filing.accn + '</a>' : '<span class="small">' + esc(f.textSrc.form) + ' p. ' + esc(f.textSrc.page || f.textSrc.pageSeq) + '</span>') + card;
    if (f.result === 'partial') return '<span class="flag sec">' + t('parcial', 'partial') + '</span>' + card;
    return H.flag('review', f['note_' + H.lang] || f.note_en) + card;
  }
  // ---------- 06 issued ----------
  function issued() {
    var D = F.debt;
    set('issDesc', t('Bonos, préstamos a plazo, convertibles y colocaciones privadas con fecha de emisión desde enero de 2025, agrupados por operación (misma empresa, fecha y clase). Montos vigentes al último reporte según FactSet, en dólares (FactSet convierte los tramos en euros, francos o libras). Una operación queda "cotejada" cuando la presentación 424B de la misma empresa, a ±7 días, reporta un total dentro de ±3%, o cuando el índice de texto completo de EDGAR encuentra el cupón y vencimiento del tramo (o el tipo de línea) en un 8-K, FWP o 6-K del emisor en −12/+25 días (ⓘ muestra la presentación, las frases y, si está cosechada, la página del 10-K/10-Q que nombra el instrumento). "Parcial" = la presentación describe una línea relacionada o la fecha difiere; "revisar" = sin resolver, con el motivo en ⓘ.', 'Bonds, term loans, convertibles and private placements issued since January 2025, grouped into deals (same company, date and class). Amounts outstanding at the latest report per FactSet, in dollars (FactSet converts euro, franc or sterling tranches). A deal is "matched" when the same company\'s 424B prospectus, within ±7 days, reports a total within ±3%, or when EDGAR\'s full-text index finds the tranche\'s coupon and maturity (or the facility type) in an 8-K, FWP or 6-K of the issuer within −12/+25 days (ⓘ shows the filing, the phrases and, where harvested, the 10-K/10-Q page that names the instrument). "Partial" = the filing describes a related facility or the date differs; "needs review" = unresolved, with the reason in ⓘ.'));
    if (!D) { set('issTbl', H.nd()); return; }
    var deals = D.deals.filter(function (d) { return d.amount > 0; });
    // chart: issuance by calendar quarter, stacked by company
    var qk = function (iso) { return iso.slice(0, 4) + '-Q' + Math.ceil(+iso.slice(5, 7) / 3); };
    var labels = []; for (var y = 2025; y <= 2026; y++) for (var qq = 1; qq <= 4; qq++) labels.push(y + '-Q' + qq);
    var maxQ = deals.map(function (d) { return qk(d.issued); }).sort().pop(); labels = labels.filter(function (l) { return l <= maxQ; });
    set('issChartT', t('Deuda emitida por trimestre calendario (monto vigente)', 'Debt issued by calendar quarter (amount outstanding)') + ' · US$ ' + t('miles de millones', 'billions'));
    set('issChartC', t('Fuente FactSet hasta el último balance de cada empresa (', 'FactSet source through each company\'s latest balance sheet (') + asOfRange + t('); las colocaciones posteriores solo aparecen en la tabla de prospectos 424B de abajo.', '); later offerings appear only in the 424B prospectus table below.'));
    killChart('iss');
    charts.iss = new Chart($('chIss'), { type: 'bar', data: { labels: labels.map(H.cq), datasets: CO.map(function (c) {
      return { label: c.name, data: labels.map(function (l) { var s = deals.filter(function (d) { return d.ticker === c.ticker && qk(d.issued) === l; }).reduce(function (a, d) { return a + d.amount; }, 0); return s ? s / 1000 : null; }), backgroundColor: H.color(c.ticker), borderColor: H.css('--surface'), borderWidth: 1, borderRadius: 3, borderSkipped: false, stack: 's' };
    }).filter(function (ds) { return ds.data.some(function (x) { return x; }); }) }, options: { interaction: { mode: 'index', intersect: false }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: H.axisMoney } } },
      plugins: { tooltip: { callbacks: { label: function (ctx) { return ctx.raw == null ? null : ctx.dataset.label + ': US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn'); } } } } } });
    set('issLegend', legend(CO.filter(function (c) { return deals.some(function (d) { return d.ticker === c.ticker; }); }).map(function (c) { return { label: c.name, color: H.color(c.ticker) }; })));
    var sel = $('selIss');
    sel.innerHTML = '<option value="all">' + t('Todas', 'All') + '</option>' + CO.map(function (c) { return '<option value="' + c.ticker + '"' + (c.ticker === state.iss ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    sel.value = state.iss; sel.onchange = function () { state.iss = sel.value; issued(); };
    var KL = { 'Bonds / notes': t('Bonos / notas', 'Bonds / notes'), 'Convertible notes': t('Notas convertibles', 'Convertible notes'), 'Private placement notes': t('Colocación privada', 'Private placement'), 'Term loan': t('Préstamo a plazo', 'Term loan'), 'Revolving credit': t('Línea revolvente', 'Revolving credit') };
    var rows = D.deals.filter(function (d) { return state.iss === 'all' || d.ticker === state.iss; });
    set('issTblT', t('Operaciones', 'Deals') + ' (' + rows.length + ')');
    set('issTbl', '<table><thead><tr><th scope="col" class="l">' + t('Emisión', 'Issued') + '</th><th scope="col" class="l">' + t('Empresa', 'Company') + '</th><th scope="col" class="l">' + t('Clase', 'Class') + '</th><th scope="col">' + t('Tramos', 'Tranches') + '</th><th scope="col">' + t('Monto vigente', 'Amount outstanding') + '</th><th scope="col" class="l">' + t('Estado', 'Status') + '</th><th scope="col">' + t('Cupón', 'Coupon') + '</th><th scope="col">' + t('Plazo (años)', 'Tenor (years)') + '</th><th scope="col" class="l">' + t('Prelación', 'Seniority') + '</th></tr></thead><tbody>' +
      rows.map(function (d) {
        var c = F.companies[d.ticker];
        var allFloat = D.tranches.filter(function (x) { return x[0] === d.ticker && x[7] === d.issued; }).every(function (x) { return x[6] === 'Variable'; });
        var cpTxt = d.couponMin == null ? '' : (d.couponMin === d.couponMax ? H.num(d.couponMin, 3).replace(/0+$/, '').replace(/[.,]$/, '') + '%' : H.num(d.couponMin, 2) + '–' + H.num(d.couponMax, 2) + '%');
        var cp = allFloat ? t('variable', 'floating') + (cpTxt ? ' (' + cpTxt + t(' al reporte', ' at report') + ')' : '') : (cpTxt || H.nd()) + (d.floating ? ' ' + t('y tramos variables', 'and floating tranches') : '');
        var tn = d.tenorMin == null ? '' : (Math.abs(d.tenorMax - d.tenorMin) < 0.2 ? H.num(d.tenorMin, 1) : H.num(d.tenorMin, 0) + '–' + H.num(d.tenorMax, 0));
        var stx = (d.undrawn ? '<span class="muted small">' + t('sin disponer al reporte', 'undrawn at report') + '</span> ' : '') + (d.match ? H.flag('ok') + ' <a href="' + esc(d.match.url) + '" target="_blank" rel="noopener">424B ' + d.match.accn + '</a>' : fsStatus(c, d));
        return '<tr><td class="l">' + H.date(d.issued) + '</td><td class="l">' + coName(c) + '</td><td class="l">' + esc(KL[d.klass] || d.klass) + (d.nonUSD ? ' <span class="small muted">' + t('(incluye tramos no USD)', '(includes non-USD tranches)') + '</span>' : '') + '</td><td>' + d.tranches + '</td><td>' + (d.undrawn ? '<span class="muted">' + t('línea', 'facility') + '</span>' : H.moneyM(d.amount)) + ' ' + H.tier('FS') + H.src({ title: c.name + ' · ' + H.date(d.issued), rows: [[t('Instrumentos', 'Instruments'), d.ids.join(', ')], [t('Vencimiento más lejano', 'Latest maturity'), d.maturityLast], [t('Monto al reporte del', 'Amount at report of'), H.date(d.reportDate)], [t('Fuente', 'Source'), 'FactSet Debt Capital Structure, ' + t('consulta del ', 'pulled ') + H.date(D.pulledAt)]] }) + '</td><td class="l">' + stx + '</td><td>' + cp + '</td><td>' + tn + '</td><td class="l">' + esc(d.seniority) + '</td></tr>';
      }).join('') + '</tbody></table>');
    set('issStamp', H.stamp({ tier: 'FS', asOf: asOfRange, sources: [{ label: 'FactSet Debt Capital Structure · ' + D.file }], csv: '/hiperescaladores/csv/debt-deals-since-2025.csv', note: '<a class="csv" href="/hiperescaladores/csv/debt-tranches-since-2025.csv" download>' + t('Tramos', 'Tranches') + ' CSV ↓</a>' }));
    // registered offerings (T1)
    var offs = F.offerings.filter(function (o) { return o.date >= '2025-01-01' && (state.iss === 'all' || o.ticker === state.iss); });
    set('offT', t('Colocaciones registradas ante la SEC (prospectos 424B)', 'SEC-registered offerings (424B prospectuses)') + ' ' + H.tier('T1'));
    set('offC', t('Total de cada oferta según el anexo de cuotas de registro (EX-FILING FEES, XBRL) del prospecto 424B. Detecta colocaciones nuevas el mismo día que se presentan, incluso después del último balance. El anexo no distingue deuda de acciones: el tipo de valor está en el prospecto (enlace). Las colocaciones privadas (144A) y los préstamos no pasan por aquí.', 'Total of each offering per the registration-fee exhibit (EX-FILING FEES, XBRL) of the 424B prospectus. It catches new offerings the day they are filed, even after the latest balance sheet. The exhibit does not distinguish debt from equity: the security type is in the prospectus (link). Private placements (144A) and loans do not appear here.'));
    set('offTbl', offs.length ? '<table><thead><tr><th scope="col" class="l">' + t('Fecha', 'Date') + '</th><th scope="col" class="l">' + t('Empresa', 'Company') + '</th><th scope="col">' + t('Total de la oferta', 'Offering total') + '</th><th scope="col" class="l">' + t('Forma', 'Form') + '</th><th scope="col" class="l">' + t('Presentación', 'Filing') + '</th></tr></thead><tbody>' + offs.map(function (o) { var c = F.companies[o.ticker]; return '<tr><td class="l">' + H.date(o.date) + '</td><td class="l">' + coName(c) + '</td><td>' + H.money(o.amount) + '</td><td class="l">' + esc(o.form) + '</td><td class="l"><a href="' + esc(o.url) + '" target="_blank" rel="noopener">' + o.accn + '</a></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted small">' + t('Sin prospectos 424B con anexo de cuotas etiquetado para esta selección.', 'No 424B prospectuses with a tagged fee exhibit for this selection.') + '</p>');
    set('offStamp', H.stamp({ tier: 'T1', asOf: H.etDate(F.generated), sources: [{ label: 'SEC EDGAR XBRL (ffd)', url: 'https://www.sec.gov/structureddata/fee-data' }], csv: '/hiperescaladores/csv/registered-offerings.csv' }));
    var notes = D.notes || {};
    set('issNotes', Object.keys(notes).filter(function (k) { return state.iss === 'all' || k === state.iss; }).map(function (k) { return '<div class="callout' + (/inference|inferencia/i.test(notes[k]) ? ' infer' : '') + '"><b>' + esc(F.companies[k] ? F.companies[k].name : k) + ':</b> ' + esc(notes[k]) + '</div>'; }).join(''));
  }

  // ---------- 07 structure ----------
  function structure() {
    var D = F.debt;
    set('strDesc', t('Deuda vigente por tipo según FactSet al último balance de cada empresa (valor en libros; "otros" recoge descuentos y costos de emisión, por eso puede ser negativo). Garantizada, convertible, sin recurso y de tasa variable son subconjuntos que se traslapan con los tipos: no se suman entre sí.', 'Debt outstanding by type per FactSet at each company\'s latest balance sheet (carrying value; "other" holds discounts and issuance costs, so it can be negative). Secured, convertible, non-recourse and floating-rate are overlapping subsets of the types: they are not added to each other.'));
    if (!D) { set('strTbl', H.nd()); return; }
    var cols = [['total', t('Total', 'Total')], ['st', t('Corto plazo', 'Short-term')], ['bonds', t('Bonos', 'Bonds')], ['termLoans', t('Préstamos a plazo', 'Term loans')], ['revolver', t('Revolvente', 'Revolver')], ['other', t('Otros', 'Other')], ['secured', t('Garantizada', 'Secured')], ['convertible', t('Convertible', 'Convertible')], ['nonRecourse', t('Sin recurso', 'Non-recourse')], ['variable', t('Tasa variable', 'Floating rate')]];
    function row(c) { var x = D.totals[c.ticker]; if (!x) return ''; return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.date(x.report) + '</td>' + cols.map(function (k, i) { return '<td' + (i === 6 ? ' style="border-left:1px solid var(--baseline)"' : '') + '>' + H.moneyM(x[k[0]]) + '</td>'; }).join('') + '</tr>'; }
    set('strTbl', '<table><thead><tr><th scope="col" class="l">' + t('Empresa', 'Company') + '</th><th scope="col" class="l">' + t('Al', 'At') + '</th>' + cols.map(function (k, i) { return '<th scope="col"' + (i === 6 ? ' style="border-left:1px solid var(--baseline)"' : '') + '>' + k[1] + '</th>'; }).join('') + '</tr></thead><tbody><tr class="grp"><td colspan="12">' + t('Seis principales', 'Core six') + '</td></tr>' + CORE.map(row).join('') + '<tr class="grp"><td colspan="12">' + t('Neonubes listadas', 'Listed neoclouds') + '</td></tr>' + NEO.map(row).join('') + '</tbody></table>');
    set('strStamp', H.stamp({ tier: 'FS', asOf: asOfRange, sources: [{ label: 'FactSet Debt Capital Structure · ' + D.file }], note: t('Instantánea fechada; se renueva tras cada 10-Q/10-K (FactSet no forma parte de la reconstrucción diaria)', 'Dated snapshot; renewed after each 10-Q/10-K (FactSet is not part of the daily rebuild)') }));
  }

  function foot() {
    set('foot', t('Fuentes: SEC EDGAR (API de presentaciones y XBRL companyfacts), prospectos 424B, instantánea de FactSet Debt Capital Structure y conjunto de guías de FactSet. Niveles: T1 presentación ante la SEC · T2 declaración de la empresa, no auditada · FactSet = agregación fechada, no T1 hasta cotejarse. ', 'Sources: SEC EDGAR (submissions API and XBRL companyfacts), 424B prospectuses, FactSet Debt Capital Structure snapshot and FactSet guidance dataset. Tiers: T1 SEC filing · T2 company statement, not audited · FactSet = dated aggregation, not T1 until matched. ') + '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a> · <a href="/hiperescaladores/capex/quality.html">' + t('Calidad de datos', 'Data quality') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.'));
  }

  // conclusion title and "so what", composed from the same calendarized window as the KPIs
  var ocfCh = null;
  function conclusion() {
    var X = H.calTTM(CORE, 'capex_cash'), ocf = 0; if (!X) return;
    X.rows.forEach(function (r) { ocf = ocf == null || r.q.ttm.ocf == null ? null : ocf + r.q.ttm.ocf; });
    var over = CO.filter(function (c) { var q = latest(c); return q && !H.aged(q.end) && q.ttm.capex_cash != null && q.ttm.ocf != null && (q.ttm.ocf <= 0 || q.ttm.capex_cash > q.ttm.ocf); });
    if (ocf) H.title('El Capex Absorbe ' + H.num(X.total / ocf * 100, 0) + '% del Flujo de los Seis Principales y Lo Supera en ' + over.length + ' de ' + CO.length + ' Empresas', 'Capex Takes ' + H.num(X.total / ocf * 100, 0) + '% of the Core Six\'s Cash Flow and Exceeds It at ' + over.length + ' of ' + CO.length + ' Companies');
    H.soWhat(t('Donde el capex supera al flujo de operación (' + over.map(function (c) { return c.name; }).join(', ') + '), la diferencia se paga con deuda, arrendamientos, acciones o caja: la sección 04 muestra con qué, empresa por empresa, y la 06 cuánta deuda se emitió desde 2025.', 'Where capex exceeds operating cash flow (' + over.map(function (c) { return c.name; }).join(', ') + '), the gap is paid with debt, leases, equity or cash: section 04 shows which, company by company, and section 06 how much debt was issued since 2025.'));
  }
  function ocfChart() {
    var rows = CO.map(function (c) { var q = latest(c); return q && !H.aged(q.end) && q.ttm.capex_cash != null && q.ttm.ocf != null ? { c: c, q: q, r: q.ttm.ocf > 0 ? q.ttm.capex_cash / q.ttm.ocf : null } : null; }).filter(Boolean);
    var over = rows.filter(function (x) { return x.r == null || x.r > 1; });
    set('ocfT', t('Capex / flujo de operación, UDM: lo superó en ' + over.length + ' de ' + rows.length + ' empresas', 'Capex / operating cash flow, TTM: above 100% at ' + over.length + ' of ' + rows.length + ' companies'));
    set('ocfC', t('Barras: capex en efectivo UDM ÷ flujo de operación UDM al trimestre más reciente de cada empresa. Línea discontinua: 100%. Razones mayores a 500% se marcan n.s. y se cortan en el tope.', 'Bars: TTM cash capex ÷ TTM operating cash flow to each company\'s latest quarter. Dashed line: 100%. Ratios above 500% are marked n.m. and cut at the top.'));
    var CAPV = 500, horiz = H.narrow();   // phones: horizontal bars, company names on the left, never rotated
    var ref = { id: 'ref100', afterDatasetsDraw: function (ch) { var y = ch.scales.y, x = ch.scales.x, g = ch.ctx; g.save(); g.setLineDash([5, 4]); g.strokeStyle = H.css('--text-secondary'); g.lineWidth = 1.5; g.fillStyle = H.css('--text-secondary'); g.font = '11px ' + (H.css('--sans') || 'sans-serif'); g.beginPath(); if (horiz) { var px = x.getPixelForValue(100); g.moveTo(px, y.top); g.lineTo(px, y.bottom); g.stroke(); g.setLineDash([]); g.textAlign = 'left'; g.fillText('100%', px + 3, y.top + 10); } else { var py = y.getPixelForValue(100); g.moveTo(x.left, py); g.lineTo(x.right, py); g.stroke(); g.setLineDash([]); g.textAlign = 'right'; g.fillText('100%', x.right, py - 4); } g.restore(); } };
    var lab = { id: 'lab', afterDatasetsDraw: function (ch) { var g = ch.ctx; g.save(); g.fillStyle = H.css('--text-primary'); g.font = '600 11px ' + (H.css('--sans') || 'sans-serif'); ch.getDatasetMeta(0).data.forEach(function (b, k) { var x = rows[k], s = x.r == null || x.r > H.CO_MAX ? t('n.s.', 'n.m.') : H.num(x.r * 100, 0) + '%'; if (horiz) { g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, Math.min(b.x + 4, ch.chartArea.right - 28), b.y); } else { g.textAlign = 'center'; g.fillText(s, b.x, b.y - 5); } }); g.restore(); } };
    if (ocfCh) ocfCh.destroy();
    var vAxis = { beginAtZero: true, max: CAPV, ticks: { callback: function (v) { return v + '%'; } } }, cAxis = { grid: { display: false }, ticks: { autoSkip: false, maxRotation: horiz ? 0 : 45, font: { size: 11 } } };
    ocfCh = new Chart(document.getElementById('chOCF'), { type: 'bar', data: { labels: rows.map(function (x) { return x.c.name; }), datasets: [{ data: rows.map(function (x) { return x.r == null || x.r > H.CO_MAX ? CAPV : x.r * 100; }), backgroundColor: rows.map(function (x) { return H.color(x.c.ticker); }), borderRadius: 3, maxBarThickness: horiz ? 22 : 46 }] }, options: { indexAxis: horiz ? 'y' : 'x', layout: { padding: horiz ? { right: 30 } : { top: 18 } }, scales: horiz ? { x: vAxis, y: cAxis } : { x: cAxis, y: vAxis }, plugins: { tooltip: { callbacks: { label: function (ctx) { var x = rows[ctx.dataIndex]; return x.c.name + ': ' + (x.r == null ? t('flujo ≤ 0', 'cash flow ≤ 0') : H.num(x.r * 100, 0) + '%') + ' · ' + H.fq(x.q.id) + ' · ' + H.date(x.q.end); } } } } }, plugins: [ref, lab] });
    set('ocfStamp', H.stamp({ tier: 'C', asOf: H.date(latestEnds[0]) + ' – ' + H.date(latestEnds[latestEnds.length - 1]), sources: [{ label: 'SEC EDGAR XBRL companyfacts' }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Razón = capex en efectivo UDM ÷ flujo de operación UDM (cálculo FNAM)', 'Ratio = TTM cash capex ÷ TTM operating cash flow (FNAM calculation)') }));
  }
  function render() { header(); conclusion(); trend(); company(); ocfChart(); ttm(); funding(); leverage(); issued(); structure(); foot(); }
  H.onLang(render);
})();
