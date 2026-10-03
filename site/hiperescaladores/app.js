// Hyperscaler Hub · summary page. Reads window.HYP_FIN, HYP_STATUS and HYP_LOG (scripts/hyperscalers/build.mjs).
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, LOG = window.HYP_LOG || { entries: [] }, S = window.HYP_STATUS || {};
  if (!F || !H) return;
  var t = H.t, esc = H.esc, $ = function (id) { return document.getElementById(id); }, set = function (id, h) { var e = $(id); if (e) e.innerHTML = h; };
  var CO = Object.values(F.companies), CORE = CO.filter(function (c) { return c.group === 'core'; }), NEO = CO.filter(function (c) { return c.group !== 'core'; });
  var chart = null;
  function latest(c) { return c.latest ? c.quarters.find(function (q) { return q.id === c.latest.id; }) : null; }
  function lastWith(c, k) { for (var i = c.quarters.length - 1; i >= 0; i--) if (c.quarters[i].m[k]) return c.quarters[i]; return null; }
  function sw(c) { return '<span class="sw" style="background:' + H.color(c.ticker) + '"></span>'; }
  function coName(c) { return sw(c) + '<b>' + esc(c.name) + '</b> <span class="muted small">' + c.ticker + '</span>'; }
  var ends = CO.filter(function (c) { return c.latest; }).map(function (c) { return c.latest.end; }).sort();
  var asOfRange = H.date(ends[0]) + ' – ' + H.date(ends[ends.length - 1]);

  function header() {
    set('asofRow', '<span><b>' + t('Periodos más recientes', 'Latest periods') + '</b> ' + asOfRange + '</span><span><b>' + t('Última consulta a EDGAR', 'Last EDGAR poll') + '</b> ' + esc(S.refreshedET || F.refreshedET) + '</span><span><b>' + t('Cobertura', 'Coverage') + '</b> ' + t('10 empresas · fase 1 de 3', '10 companies · phase 1 of 3') + '</span>');
    var st = CO.filter(function (c) { return H.stale(c).stale; });
    set('notices', (st.length ? '<div class="notice bad"><b>' + t('Desactualizado', 'Stale') + ':</b> ' + st.map(function (c) { return esc(c.name); }).join(', ') + ' — ' + t('pasó la fecha esperada de su siguiente presentación + 7 días; sus cifras no son las vigentes.', 'past its next expected filing date + 7 days; its figures are not current.') + '</div>' : '') + (S.edgarErrors && S.edgarErrors.length ? '<div class="notice warn">' + t('La última consulta a EDGAR falló para ', 'The last EDGAR poll failed for ') + S.edgarErrors.map(function (e) { return esc(e.ticker); }).join(', ') + t('; se muestran los valores almacenados.', '; stored values are shown.') + '</div>' : ''));
    var cap = 0, ocf = 0, prev = 0, prevOk = true;
    CORE.forEach(function (c) { var q = latest(c); if (!q) return; cap += q.ttm.capex_cash || 0; ocf += q.ttm.ocf || 0; var i = c.quarters.indexOf(q), p = c.quarters[i - 4]; if (p && p.ttm.capex_cash != null) prev += p.ttm.capex_cash; else prevOk = false; });
    var rpo = 0, rpoCos = [], rpoNo = [];
    CO.forEach(function (c) { var q = lastWith(c, 'rpo'); if (q && q.end >= '2025-06-01') { rpo += q.m.rpo[0]; rpoCos.push(c.name); } else rpoNo.push(c.name); });
    var iss = F.debt ? F.debt.deals.reduce(function (s, d) { return s + d.amount; }, 0) * 1e6 : null;
    set('kpis', [
      [t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), H.money(cap), (prevOk && prev ? t('vs. ', 'vs. ') + H.money(prev) + t(' un año antes (', ' a year earlier (') + (cap / prev - 1 > 0 ? '+' : '') + H.num((cap / prev - 1) * 100, 0) + '%). ' : '') + t('Cierres distintos por empresa.', 'Period ends differ by company.')],
      [t('Capex / flujo de operación', 'Capex / operating cash flow'), H.pct(ocf ? cap / ocf : null), t('Seis principales, UDM. Lo que queda es el flujo libre antes de dividendos y recompras.', 'Core six, TTM. What is left is free cash flow before dividends and buybacks.')],
      [t('Cartera de contratos (RPO) divulgada', 'Disclosed contract backlog (RPO)'), H.money(rpo), t('Demanda contratada, no capacidad; cada empresa a su último balance etiquetado. Suma de ', 'Contracted demand, not capacity; each company at its latest tagged balance sheet. Sum of ') + rpoCos.join(', ') + (rpoNo.length ? '. ' + t('Sin RPO total etiquetado: ', 'No total RPO tagged: ') + rpoNo.join(', ') : '')],
      [t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), H.money(iss), t('Monto vigente, diez empresas, FactSet al ', 'Amount outstanding, ten companies, FactSet as of ') + H.date(F.debt && F.debt.pulledAt)]
    ].map(function (k) { return '<div class="kpi"><div class="lbl">' + k[0] + '</div><div class="val">' + k[1] + '</div><div class="sub">' + k[2] + '</div></div>'; }).join(''));
  }

  function tiles() {
    var M = [
      ['1', t('Capacidad actual', 'Current capacity'), t('MW de TI energizados por empresa, propios y arrendados, sitios, regiones y aceleradores instalados donde se divulgan.', 'Energized critical IT MW by company, owned vs leased, sites, regions and installed accelerators where disclosed.'), null, 2],
      ['2', t('Capacidad comprometida', 'Committed capacity'), t('Contratada, en construcción y anunciada, por separado y con fecha objetivo; arrendamientos firmados aún no iniciados; obligaciones de compra y RPO.', 'Contracted, under construction and announced, kept separate with target dates; leases signed not yet commenced; purchase obligations and RPO.'), null, 2],
      ['3', t('Capex y financiamiento', 'Capex and financing'), t('Capex en efectivo y con arrendamientos financieros, flujo libre, deuda emitida (monto, fecha, plazo, cupón), apalancamiento y cobertura.', 'Cash capex and capex incl. finance leases, free cash flow, debt issued (amount, date, tenor, coupon), leverage and coverage.'), '/hiperescaladores/capex/', 1],
      ['4', t('Electricidad', 'Electricity'), t('MW y PPAs contratados por empresa, separados de las proyecciones nacionales y regionales (EIA, FERC, NERC, colas de interconexión).', 'Company-contracted MW and PPAs, kept apart from national and regional projections (EIA, FERC, NERC, interconnection queues).'), null, 3],
      ['5', t('Sitios', 'Sites'), t('Mapa y tabla de campus: ciudad, estado o país, MW, estado, fecha esperada, fuente de energía y coordenadas públicas.', 'Map and table of campuses: city, state or country, MW, status, expected date, power source and public coordinates.'), null, 2],
      ['6', t('Fuera de balance', 'Off-balance-sheet'), t('Arrendamientos no iniciados, EIV, coinversiones y su deuda, SPV, garantías de valor residual y compromisos firmes; vista reportada y proporcional.', 'Leases not yet commenced, VIEs, JVs and their debt, SPVs, residual value guarantees and take-or-pay commitments; reported and look-through views.'), '/hiperescaladores/fuera-de-balance/', 1],
      ['7', t('Financiamiento circular', 'Circular financing'), t('Los circuitos de dinero entre fabricantes de chips, nubes, laboratorios de IA y neonubes; hechos divulgados separados de la inferencia.', 'The money loops among chip makers, clouds, AI labs and neoclouds; disclosed facts kept apart from inference.'), null, 3],
      ['M', t('Metodología', 'Methodology'), t('Niveles de fuente, reglas contables, derivación de trimestres, vigencia y validaciones.', 'Source tiers, accounting rules, quarter derivation, staleness and validation.'), '/hiperescaladores/metodologia/', 1],
      ['G', t('Glosario', 'Glossary'), t('RPO, ASC 842, ASC 810, EIV, SPV, MW de TI y los demás términos, en lenguaje llano.', 'RPO, ASC 842, ASC 810, VIE, SPV, IT MW and the other terms, in plain language.'), '/hiperescaladores/glosario/', 1]
    ];
    set('tiles', M.map(function (m) {
      var soon = m[4] > 1;
      var k = (/^\d$/.test(m[0]) ? t('Módulo ', 'Module ') + m[0] : m[0] === 'M' ? t('Referencia', 'Reference') : t('Referencia', 'Reference')) + (soon ? ' · ' + t('fase ', 'phase ') + m[4] : '');
      return (m[3] ? '<a class="tile" href="' + m[3] + '">' : '<div class="tile soon">') + '<div class="k">' + k + '</div><h3>' + esc(m[1]) + '</h3><p>' + esc(m[2]) + '</p>' + (soon ? '<p class="small muted">' + t('En preparación: se publica cuando sus fuentes estén verificadas.', 'In preparation: published once its sources are verified.') + '</p>' : '') + (m[3] ? '</a>' : '</div>');
    }).join(''));
  }

  function glance() {
    set('glanceDesc', t('Últimos doce meses al trimestre más reciente de cada empresa (cierres distintos). Crecimiento del capex = UDM actual frente al UDM de un año antes. La deuda neta ajustada incluye los arrendamientos ya reconocidos en balance, no los firmados que aún no inician.', 'Trailing twelve months to each company\'s latest quarter (period ends differ). Capex growth = current TTM against the TTM a year earlier. Lease-adjusted net debt includes leases already on the balance sheet, not those signed but not yet commenced.'));
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Último periodo', 'Latest period') + '</th><th>' + t('Capex en efectivo UDM', 'Cash capex TTM') + '</th><th>' + t('Crec. a/a', 'Growth y/y') + '</th><th>' + t('Capex / flujo de op.', 'Capex / OCF') + '</th><th>' + t('Flujo libre UDM', 'Free cash flow TTM') + '</th><th>' + t('DN ajust. / EBITDA', 'Lease-adj. ND / EBITDA') + '</th><th>RPO</th><th class="l">' + t('Estado', 'Status') + '</th></tr>';
    function row(c) {
      var q = latest(c); if (!q) return '';
      var i = c.quarters.indexOf(q), p = c.quarters[i - 4];
      var g = p && p.ttm.capex_cash ? q.ttm.capex_cash / p.ttm.capex_cash - 1 : null;
      if (c.ticker === 'NBIS') { var fy = c.fy, a = fy[fy.length - 1], b = fy[fy.length - 2]; if (a && b && a.m.capex_cash && b.m.capex_cash) g = a.m.capex_cash[0] / b.m.capex_cash[0] - 1; }
      var bq = lastWith(c, 'debt') || q;
      var rq = lastWith(c, 'rpo');
      var rqOld = rq && Date.parse(rq.end) < Date.parse(q.end) - 370 * 864e5;
      var s = H.stale(c);
      return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.fq(q.id) + ' · ' + H.date(q.end) + '</td><td>' + H.money(q.ttm.capex_cash) + '</td><td>' + (g == null ? H.nm() : (g > 0 ? '+' : '') + H.num(g * 100, 0) + '%') + '</td><td>' + H.pct(q.ttm.capex_ocf) + '</td><td>' + H.money(q.ttm.fcf) + '</td><td>' + H.mult(bq.ttm && bq.ttm.land_ebitda, 1) + '</td><td>' + (rqOld ? H.nd(t('Último RPO total etiquetado: ', 'Last total RPO tagged: ') + rq.end) + '<br><span class="small muted">' + t('último: ', 'last: ') + H.date(rq.end) + '</span>' : rq ? H.money(rq.m.rpo[0]) + (rq.end < q.end ? '<br><span class="small muted">' + t('al ', 'at ') + H.date(rq.end) + '</span>' : '') : H.nd(t('La empresa no etiqueta un RPO total', 'The company does not tag a total RPO'))) + '</td><td class="l">' + (s.stale ? H.flag('stale') : '<span class="flag ok">' + t('vigente', 'current') + '</span><br><span class="small muted">' + t('hasta ', 'until ') + H.date(s.limit) + '</span>') + '</td></tr>';
    }
    var mrow = function (c) { var q = latest(c); if (!q) return ''; var s = H.stale(c); return '<div class="mrow"><div class="h"><b>' + sw(c) + esc(c.name) + '</b><span class="v">' + H.money(q.ttm.capex_cash) + '</span></div><div class="c">' + t('Capex UDM al ', 'Capex TTM to ') + H.date(q.end) + ' · ' + t('capex/flujo de op. ', 'capex/OCF ') + H.pct(q.ttm.capex_ocf) + ' · ' + t('flujo libre ', 'FCF ') + H.money(q.ttm.fcf) + ' · ' + (s.stale ? H.flag('stale') : t('vigente', 'current')) + '</div></div>'; };
    set('glanceTbl', '<div class="only-d"><table><thead>' + head + '</thead><tbody><tr class="grp"><td colspan="9">' + t('Seis principales', 'Core six') + '</td></tr>' + CORE.map(row).join('') + '<tr class="grp"><td colspan="9">' + t('Neonubes listadas', 'Listed neoclouds') + '</td></tr>' + NEO.map(row).join('') + '</tbody></table></div><div class="only-m">' + CO.map(mrow).join('') + '</div>');
    set('glanceStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces' }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Detalle y fuente de cada cifra en el módulo 3', 'Detail and source of every figure in module 3') }));
  }

  function ttmTrend() {
    set('trendDesc', t('Capex en efectivo de los últimos doce meses, trimestre a trimestre, alineado al calendario: la pendiente muestra cuánto se acelera la inversión. Una línea por empresa; sin sumas entre empresas.', 'Trailing-twelve-month cash capex, quarter by quarter, aligned to the calendar: the slope shows how fast investment is accelerating. One line per company; no cross-company sums.'));
    set('trendT', t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six') + ' · US$ ' + t('miles de millones', 'billions'));
    set('trendC', t('Oracle (año a mayo): su trimestre a agosto se grafica en el trimestre calendario a septiembre.', 'Oracle (year to May): its quarter to August is plotted in the calendar quarter to September.'));
    var cqs = {}; CORE.forEach(function (c) { c.quarters.forEach(function (q) { if (q.ttm && q.ttm.capex_cash != null) cqs[q.cal] = 1; }); });
    var labels = Object.keys(cqs).sort().slice(-12);
    if (chart) chart.destroy();
    chart = new Chart($('chTTM'), { type: 'line', data: { labels: labels.map(H.cq), datasets: CORE.map(function (c) {
      return { label: c.name, data: labels.map(function (l) { var q = c.quarters.find(function (x) { return x.cal === l; }); return q && q.ttm.capex_cash != null ? q.ttm.capex_cash / 1e9 : null; }), borderColor: H.color(c.ticker), backgroundColor: H.css('--surface'), borderWidth: 2, pointRadius: 3, pointBackgroundColor: H.css('--surface'), pointBorderColor: H.color(c.ticker), spanGaps: false, tension: 0 };
    }) }, options: { interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: H.axisMoney }, beginAtZero: true } },
      plugins: { tooltip: { itemSort: function (a, b) { return (b.raw || 0) - (a.raw || 0); }, callbacks: { label: function (ctx) { return ctx.raw == null ? null : ctx.dataset.label + ': US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn'); } } } } } });
    set('trendLegend', CORE.map(function (c) { return '<span><i class="line" style="background:' + H.color(c.ticker) + '"></i>' + esc(c.name) + '</span>'; }).join(''));
    set('trendStamp', H.stamp({ tier: 'C', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces' }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('UDM = suma de cuatro trimestres T1 consecutivos (cálculo FNAM)', 'TTM = sum of four consecutive T1 quarters (FNAM calculation)') }));
  }

  function status() {
    set('statusDesc', t('Cada empresa se considera vigente hasta su siguiente presentación esperada (plazo de la SEC para su categoría de emisor, contado desde el cierre del siguiente trimestre) más 7 días. Después, sus cifras se marcan "desactualizado". El cálculo corre en su navegador con la fecha de hoy, aunque ningún proceso se haya ejecutado.', 'Each company counts as current until its next expected filing (the SEC deadline for its filer category, counted from the next quarter-end) plus 7 days. After that its figures are marked "stale". The check runs in your browser against today\'s date, even if no job has run.'));
    set('statusTbl', '<table><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Categoría SEC', 'SEC category') + '</th><th class="l">' + t('Último periodo', 'Latest period') + '</th><th class="l">' + t('Siguiente cierre', 'Next period end') + '</th><th class="l">' + t('Presentación esperada a más tardar', 'Filing expected by') + '</th><th class="l">' + t('Últimas presentaciones', 'Latest filings') + '</th></tr></thead><tbody>' +
      CO.map(function (c) { var s = H.stale(c); return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + esc(c.category || '') + '</td><td class="l">' + (c.latest ? H.date(c.latest.end) : '') + '</td><td class="l">' + H.date(c.nextPeriodEnd) + '</td><td class="l">' + H.date(c.nextFilingDue) + (s.stale ? H.flag('stale') : '') + '</td><td class="l small">' + (c.filings || []).filter(function (f) { return /^(10-K|10-Q|20-F)/.test(f.form); }).slice(0, 2).map(function (f) { return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.form) + ' ' + H.date(f.filed) + '</a>'; }).join(' · ') + '</td></tr>'; }).join('') + '</tbody></table>');
    set('statusStamp', H.stamp({ tier: 'T1', sources: [{ label: 'SEC EDGAR submissions API', url: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces' }], note: t('Nebius presenta 20-F anual y 6-K trimestral sin XBRL', 'Nebius files an annual 20-F and quarterly 6-Ks without XBRL') }));
  }

  function changes() {
    set('logDesc', t('Cada actualización compara los valores nuevos con los anteriores y anota periodos nuevos, cifras revisadas y reexpresiones que la empresa hizo en una presentación posterior (el valor viejo y su presentación quedan registrados).', 'Each refresh diffs new values against the previous ones and records new periods, revised figures and restatements the company made in a later filing (the old value and its filing are kept).'));
    var KIND = { 'new': t('nuevo', 'new'), revised: t('revisado', 'revised'), removed: t('retirado', 'removed'), initial: t('carga inicial', 'initial load'), metric_added: t('métrica agregada', 'metric added') };
    var rows = (LOG.entries || []).slice(0, 40);
    var rs = (LOG.restated || []).slice(-15).reverse();
    set('logTbl', '<table><thead><tr><th class="l">' + t('Fecha (UTC)', 'Date (UTC)') + '</th><th class="l">' + t('Tipo', 'Kind') + '</th><th class="l">' + t('Cifra', 'Figure') + '</th><th>' + t('Antes', 'Before') + '</th><th>' + t('Ahora', 'Now') + '</th></tr></thead><tbody>' +
      rows.map(function (e) { return '<tr><td class="l">' + esc(String(e.at).slice(0, 16).replace('T', ' ')) + '</td><td class="l">' + esc(KIND[e.kind] || e.kind) + '</td><td class="l">' + esc(e.id === '*' ? t(e.value + ' valores XBRL', e.value + ' XBRL values') : e.kind === 'metric_added' ? e.id.slice(2) + ' · ' + t(e.value + ' valores históricos', e.value + ' historical values') : e.id) + '</td><td>' + (e.old != null ? H.money(e.old) : '') + '</td><td>' + (e.kind === 'initial' || e.kind === 'metric_added' ? '' : e.value != null ? H.money(e.value) : '') + '</td></tr>'; }).join('') +
      (rs.length ? '<tr class="grp"><td colspan="5">' + t('Reexpresiones detectadas (presentación posterior con otro valor para el mismo periodo)', 'Restatements detected (later filing with a different value for the same period)') + '</td></tr>' + rs.map(function (r) { return '<tr><td class="l">' + esc(r.filed) + '</td><td class="l">' + t('reexpresado', 'restated') + '</td><td class="l">' + esc(r.ticker + ' · ' + r.tag + ' · ' + (r.start ? r.start + ' → ' : '') + r.end) + '</td><td>' + H.money(r.old) + '</td><td>' + H.money(r.value) + '</td></tr>'; }).join('') : '') + '</tbody></table>');
    set('logStamp', H.stamp({ csv: '/hiperescaladores/csv/changelog.csv' }));
  }

  function foot() {
    set('foot', t('FNAM · Talipot Research & Analysis. Fuentes: SEC EDGAR, materiales de las empresas, FactSet (instantáneas fechadas). Cifras en dólares estadounidenses; marcas de tiempo en hora del Este de EE. UU. (ET). ', 'FNAM · Talipot Research & Analysis. Sources: SEC EDGAR, company materials, FactSet (dated snapshots). Figures in US dollars; timestamps in US Eastern time (ET). ') + '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.'));
  }
  H.onLang(function () { header(); tiles(); glance(); ttmTrend(); status(); changes(); foot(); });
})();
