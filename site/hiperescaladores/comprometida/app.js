// Hyperscaler Hub · Module 2: committed capacity. Reads window.HYP_CAP (pipeline: contracted / under construction /
// announced, each with the company's MW definition, target date and filing citation; Oracle T2) and HYP_FIN (leases
// signed but not commenced from the off-balance-sheet items; RPO from XBRL). Stages are never added together, and a
// ratio of committed to operating MW is computed only where the company uses comparable definitions.
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, C = window.HYP_CAP;
  if (!F || !H || !C) return;
  var t = H.t, esc = H.esc, set = function (id, h) { var e = document.getElementById(id); if (e) e.innerHTML = h; };
  var ORDER = Object.keys(F.companies), charts = {};
  function nm(tk) { return F.companies[tk] ? F.companies[tk].name : tk; }
  function def(m) { var d = C.definitions[m]; return d ? d[H.lang] : ''; }
  function stageL(s) { return { contracted: t('Contratada', 'Contracted'), under_construction: t('En construcción / por entregar', 'Under construction / to be delivered'), announced: t('Anunciada (terreno o red asegurados)', 'Announced (land or grid secured)') }[s] || s; }
  function cp(x) { return x.counterparty || x['counterparty_' + H.lang] || ''; }
  function lastWith(c, k) { for (var i = c.quarters.length - 1; i >= 0; i--) if (c.quarters[i].m[k]) return c.quarters[i]; return null; }

  function header() {
    var P = C.pipeline;
    set('asofRow', '<span><b>' + t('Partidas', 'Items') + '</b> ' + P.length + ' (' + P.filter(function (x) { return x.subsequent; }).length + ' ' + t('posteriores al balance', 'after the balance-sheet date') + ')</span><span><b>' + t('Archivo curado', 'Curated file') + '</b> ' + H.date(C.updated) + '</span><span><b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(C.refreshedET) + '</span>');
    set('notices', '<div class="notice warn"><b>' + t('Tres etapas que no se suman.', 'Three stages that are not added up.') + '</b> ' + t('Contratada = firmada con un cliente o asegurada con terreno y energía; en construcción = por entregar en sitios ya arrendados o en obra; anunciada = potencia de red asegurada sin cliente. Varias cifras "contratadas" de las empresas ya incluyen la capacidad que opera hoy; se indica en cada fila.', 'Contracted = signed with a customer or secured with land and power; under construction = to be delivered at leased sites or in construction; announced = grid power secured without a customer. Several companies\' "contracted" figures already include the capacity operating today; each row says so.') + '</div>');
  }

  function conclusion() {
    var cur = function (tk, m) { return C.current.filter(function (x) { return x.ticker === tk && x.metric === m && !H.aged(x.asOf); })[0]; };
    var pip = function (tk, m) { return C.pipeline.filter(function (x) { return x.ticker === tk && x.metric === m && x.mw != null && !H.aged(x.asOf); })[0]; };
    var pairs = [['CRWV', 'active_power', 'contracted_power'], ['APLD', 'critical_it_operating', 'contracted_it']].map(function (p) { var a = cur(p[0], p[1]), b = pip(p[0], p[2]); return a && b && a.asOf === b.asOf ? { tk: p[0], a: a, b: b, r: b.mw / a.mw } : null; }).filter(Boolean);
    H.title('Lo Comprometido Va Años Adelante de Lo Que Opera', 'What Is Committed Runs Years Ahead of What Is Running');
    if (pairs.length) H.soWhat(t('Con la misma definición y fecha, lo contratado es ' + pairs.map(function (p) { return H.num(p.r, 1) + ' veces lo que opera en ' + nm(p.tk) + ' (' + H.mw(p.b.mw, p.b.qualifier) + ' contra ' + H.mw(p.a.mw, p.a.qualifier) + ', ' + H.itemDate(p.a) + ')'; }).join(' y ') + '. Esa capacidad depende de que lleguen energía, equipo y financiamiento; las fechas objetivo son de la empresa. Las etapas (contratada, en construcción, anunciada) nunca se suman.', 'With one definition and one date, contracted capacity is ' + pairs.map(function (p) { return H.num(p.r, 1) + 'x what is running at ' + nm(p.tk) + ' (' + H.mw(p.b.mw, p.b.qualifier) + ' against ' + H.mw(p.a.mw, p.a.qualifier) + ', ' + H.itemDate(p.a) + ')'; }).join(' and ') + '. That capacity depends on power, equipment and financing arriving; target dates are the company\'s. Stages (contracted, under construction, announced) are never added.'));
  }
  function stages() {
    set('stDesc', t('Una fila por partida, con la definición de MW de la empresa, la contraparte, el valor del contrato cuando se revela y la fecha objetivo tal como la da la empresa. "Posterior al balance" = firmado después de la fecha del último balance (nota de eventos posteriores).', 'One row per item, with the company\'s MW definition, the counterparty, the contract value when disclosed and the target date as the company gives it. "After balance-sheet date" = signed after the latest balance sheet (subsequent-events note).'));
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Medida', 'Measure') + '</th><th>GW</th><th class="l">' + t('Contraparte · valor del contrato', 'Counterparty · contract value') + '</th><th class="l">' + t('Fecha objetivo', 'Target date') + '</th><th class="l">' + t('Fuente', 'Source') + '</th></tr>';
    var body = '', mob = '';
    ['contracted', 'under_construction', 'announced'].forEach(function (st) {
      var rows = C.pipeline.filter(function (x) { return x.stage === st; }).sort(function (a, b) { return ORDER.indexOf(a.ticker) - ORDER.indexOf(b.ticker); });
      if (!rows.length) return;
      body += '<tr class="grp"><td colspan="6">' + stageL(st) + '</td></tr>';
      mob += '<p class="small" style="margin:14px 0 2px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)">' + stageL(st) + '</p>';
      rows.forEach(function (x) {
        var extra = [[t('Definición', 'Definition'), def(x.metric)]];
        if (x.parts) extra.push([t('Campus', 'Campuses'), x.parts.map(function (p) { return p.name + ': ' + p.mw + ' MW, ' + (p.counterparty || p['counterparty_' + H.lang]) + ', US$ ' + H.num(p.valueUSDbn, 1) + t(' mil M, ', ' bn, ') + p.delivery; }).join(' · ')]);
        if (x.includesCurrent) extra.push([t('Nota', 'Note'), t('incluye la capacidad que ya opera', 'includes capacity already operating')]);
        var srcBtn = x.tier === 'T2' ? H.src({ title: nm(x.ticker) + ' · ' + H.metricLabel(x.metric), rows: H.citeRows(x.src).concat(extra) }) : H.cite(nm(x.ticker) + ' · ' + H.metricLabel(x.metric), x.src, extra);
        var val = x.valueUSDbn ? 'US$ ' + H.num(x.valueUSDbn, 1) + t(' mil M', ' bn') + (x.valueSrc ? H.cite(nm(x.ticker) + ' · ' + t('valor', 'value'), x.valueSrc) : '') : '';
        var mwCell = x.mw != null ? H.mw(x.mw, x.qualifier) + srcBtn + H.scope(x.scope) : '<span class="nd">' + t('MW no revelados', 'MW not disclosed') + '</span>' + srcBtn;
        var tags = (x.includesCurrent ? '<br><span class="small muted">' + t('incluye lo que opera', 'includes operating') + '</span>' : '') + (x.subsequent ? '<br><span class="flag">' + t('posterior al balance', 'after balance-sheet date') + '</span>' : '');
        var site = (x['site_' + H.lang] ? '<br><span class="small muted">' + esc(x['site_' + H.lang]) + '</span>' : '') + '<br><span class="small muted">' + t('al ', 'as of ') + (x.asOf ? H.date(x.asOf) : H.fq(x.asOfFq)) + '</span>';
        body += '<tr><td class="l">' + H.coName(x.ticker) + '</td><td class="l">' + esc(H.metricLabel(x.metric)) + site + '</td><td>' + mwCell + tags + '</td><td class="l" style="white-space:normal;min-width:130px">' + esc(cp(x)) + (val ? (cp(x) ? '<br>' : '') + val : '') + '</td><td class="l" style="white-space:normal;min-width:170px">' + esc(x['target_' + H.lang] || '') + '</td><td class="l" style="line-height:1.9">' + H.tier(x.tier || 'T1') + (x.tier === 'T2' ? '' : '<br>' + H.status(x.status)) + '</td></tr>';
        mob += '<div class="mrow"><div class="h"><b><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;background:' + H.color(x.ticker) + '"></span>' + esc(nm(x.ticker)) + '</b><span class="v">' + (x.mw != null ? H.mw(x.mw, x.qualifier) : (val ? val.replace(/<button[\s\S]*?<\/button>/g, '') : t('MW n.d.', 'MW n.d.'))) + '</span></div><div class="c">' + esc(H.metricLabel(x.metric)) + (cp(x) ? ' · ' + esc(cp(x)) : '') + (x.mw != null && val ? ' · ' + val.replace(/<button[\s\S]*?<\/button>/g, '') : '') + ' · ' + esc(x['target_' + H.lang] || '') + (x.subsequent ? ' · ' + t('posterior al balance', 'after balance-sheet date') : '') + '</div></div>';
      });
    });
    set('stTbl', '<div class="only-d"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div><div class="only-m">' + mob + '</div>');
    set('stStamp', H.stamp({ asOf: t('varía por partida', 'varies by item'), refreshed: C.refreshedET, sources: [{ label: t('10-K, 10-Q y 20-F (SEC EDGAR)', '10-K, 10-Q and 20-F (SEC EDGAR)') }, { label: t('llamadas de Oracle (T2)', 'Oracle calls (T2)'), url: '/oracle/' }], csv: '/hiperescaladores/csv/capacity-committed.csv', note: '<a href="/hiperescaladores/comprometida/quality.html">' + t('Calidad de datos', 'Data quality') + '</a>' }));
  }

  function find(tk, m, list) { return (list || C.current).filter(function (x) { return x.ticker === tk && x.metric === m; })[0]; }
  function ratio() {
    set('raDesc', t('Cuántas veces cabe lo que opera en lo comprometido, solo cuando la empresa usa definiciones comparables para ambas cifras (cálculo FNAM). Un múltiplo alto mide cuánto depende el plan de construir, financiar y energizar lo que ya vendió.', 'How many times operating capacity fits into committed capacity, only where the company uses comparable definitions for both figures (FNAM calculation). A high multiple measures how much the plan depends on building, financing and energizing what has already been sold.'));
    var R = [
      ['CRWV', find('CRWV', 'contracted_power', C.pipeline), find('CRWV', 'active_power'), t('potencia contratada (incluye activa) ÷ potencia activa', 'contracted power (incl. active) ÷ active power')],
      ['NBIS', find('NBIS', 'contracted_power', C.pipeline), find('NBIS', 'active_power'), t('potencia contratada (incluye activa) ÷ potencia activa', 'contracted power (incl. active) ÷ active power')],
      ['APLD', find('APLD', 'contracted_it', C.pipeline), find('APLD', 'critical_it_operating'), t('carga de TI contratada (incluye operativa) ÷ carga de TI en operación', 'contracted IT load (incl. operating) ÷ IT load operating')],
      ['CORZ', { mw: 590, src: find('CORZ', 'billable').src }, find('CORZ', 'billable'), t('potencia arrendada a CoreWeave ÷ potencia que ya factura', 'power leased to CoreWeave ÷ power already billing')]
    ];
    set('r1t', t('Comprometido ÷ en operación', 'Committed ÷ operating') + ' ' + H.tier('C')); set('r1c', t('Múltiplo sobre cifras de la misma empresa y definición comparable. Las cifras "más de" / "aprox." hacen del múltiplo una aproximación.', 'Multiple on figures of the same company and comparable definition. "Over" / "approx." figures make the multiple an approximation.'));
    set('r1', '<table class="collapse compact"><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th><th>' + t('Comprometido', 'Committed') + '</th><th>' + t('Operando', 'Operating') + '</th><th>' + t('Múltiplo', 'Multiple') + '</th></tr></thead><tbody>' + R.filter(function (r) { return r[1] && r[2]; }).map(function (r) {
      var m = r[1].mw / r[2].mw;
      return '<tr><td class="l">' + H.coName(r[0]) + H.src({ title: nm(r[0]), rows: [[t('Fórmula', 'Formula'), r[3]]] }) + '</td><td data-h="' + t('Comprometido', 'Committed') + '">' + H.mw(r[1].mw, r[1].qualifier) + '</td><td data-h="' + t('Operando', 'Operating') + '">' + H.mw(r[2].mw, r[2].qualifier) + '</td><td data-h="' + t('Múltiplo', 'Multiple') + '"><b>≈ ' + H.num(m, 1) + 'x</b></td></tr>';
    }).join('') + '<tr><td class="l" colspan="4" style="white-space:normal">' + H.coName('ORCL') + ' <span class="small muted">' + t('n.c.: Oracle da capacidad asegurada (>10 GW, inventario) y MW entregados por trimestre (flujo); no son comparables.', 'n.c.: Oracle gives secured capacity (>10 GW, a stock) and MW delivered per quarter (a flow); they are not comparable.') + '</span></td></tr></tbody></table>');
    set('r1s', H.stamp({ tier: 'C', refreshed: C.refreshedET, sources: [{ label: t('módulo 1 y sección 01', 'module 1 and section 01') }] }));
    var A = find('APLD', 'contracted_it', C.pipeline);
    set('r2t', t('Applied Digital: carga de TI contratada por campus', 'Applied Digital: contracted IT load by campus')); set('r2c', t('GW de carga crítica de TI por campus y ventana de entrega (arrendamientos de ~15 años). Total: ', 'Critical IT GW by campus and delivery window (~15-year leases). Total: ') + (A ? H.mw(A.mw) + ', US$ ' + H.num(A.valueUSDbn, 1) + t(' mil M de ingresos contratados.', ' bn of contracted revenue.') : ''));
    if (A && window.Chart) {
      if (charts.r2) charts.r2.destroy();
      charts.r2 = new Chart(document.getElementById('r2'), { type: 'bar', data: { labels: A.parts.map(function (p) { return [p.name, p.delivery]; }), datasets: [{ data: A.parts.map(function (p) { return p.mw; }), backgroundColor: A.parts.map(function (p) { return p.counterparty === 'CoreWeave' ? H.color('CRWV') : H.color('APLD'); }), borderRadius: 3, maxBarThickness: 26 }] },
        options: { indexAxis: 'y', animation: false, scales: { x: { beginAtZero: true, ticks: { maxRotation: 0, maxTicksLimit: 5, callback: function (v) { return H.num(v / 1000, v % 1000 ? (v % 100 ? 2 : 1) : 0) + ' GW'; } } }, y: { grid: { display: false }, ticks: { autoSkip: false } } }, plugins: { tooltip: { callbacks: { label: function (c) { var p = A.parts[c.dataIndex]; return H.mw(p.mw) + ' · ' + (p.counterparty || p['counterparty_' + H.lang]) + ' · US$ ' + H.num(p.valueUSDbn, 1) + t(' mil M', ' bn'); } } } } } });
    }
    set('r2s', '<div class="legend"><span><i style="background:' + H.color('CRWV') + '"></i>CoreWeave</span><span><i style="background:' + H.color('APLD') + '"></i>' + t('hiperescaladores con grado de inversión (sin nombre)', 'investment-grade hyperscalers (unnamed)') + '</span></div>' + H.stamp({ tier: 'T1', asOf: A ? H.date(A.asOf) : '', refreshed: C.refreshedET, sources: [{ label: 'Applied Digital 10-K p. 7', url: A && A.src.url }] }));
  }

  function dollars() {
    set('dDesc', t('Para quienes no revelan MW, el compromiso aparece en dólares. Arrendamientos firmados aún no iniciados: pagos futuros no descontados por centros de datos que el arrendador todavía no entrega (entrarán al balance al iniciar). RPO: ingresos ya contratados con clientes por reconocer: es demanda, no capacidad ni deuda. Ninguna de las dos se suma a la deuda.', 'For companies that disclose no MW, the commitment shows in dollars. Leases signed not yet commenced: undiscounted future payments for data centers the landlord has not yet delivered (they enter the balance sheet at commencement). RPO: revenue already contracted with customers, to be recognized: demand, not capacity or debt. Neither is added to debt.'));
    var items = ((F.offbs && F.offbs.items) || []).filter(function (i) { return i.item === 'leases_not_commenced'; });
    var rows = ORDER.map(function (tk) {
      var c = F.companies[tk], its = items.filter(function (i) { return i.ticker === tk; }), rq = lastWith(c, 'rpo');
      var main = its.filter(function (i) { return !i.subsequent; })[0], sub = its.filter(function (i) { return i.subsequent; });
      var lc = main ? H.moneyM(main.amountUSDm) + (main.status !== 'verified' ? H.flag('review') : '') + H.src({ title: nm(tk) + ' · ' + t('arrendamientos no iniciados', 'leases not commenced'), rows: [[t('Al', 'At'), H.date(main.asOf)], [t('Presentación', 'Filing'), (main.filing.form || '') + ' ' + (main.filing.accn || '')], [t('Página', 'Page'), main.filing.page], [t('Texto', 'Text'), '“' + main.quote + '”']], url: main.filing.url }) : '<span class="small muted">' + t('no aplica / no revelado', 'n/a / not disclosed') + '</span>';
      var when = main && main.commence ? main.commence.from + '–' + main.commence.to : '';
      var term = main && main.termYears ? (main.termYears[0] == null ? t('hasta ', 'up to ') : '') + main.termYears.filter(function (v) { return v != null; }).join('–') + t(' años', ' years') : '';
      var subs = sub.map(function (i) { return '<br><span class="flag">+ ' + H.moneyM(i.amountUSDm).replace(/<[^>]+>/g, '') + ' ' + t('posterior', 'subsequent') + ' (' + H.date(i.asOf) + ')</span>'; }).join('');
      return '<tr><td class="l">' + H.coName(tk) + '</td><td data-h="' + t('Arrend. no iniciados', 'Leases not commenced') + '">' + lc + subs + (main ? '<br><span class="small muted">' + t('al ', 'at ') + H.date(main.asOf) + '</span>' : '') + '</td><td data-h="' + t('Inicio', 'Commencement') + '">' + esc(when) + '</td><td data-h="' + t('Plazo', 'Term') + '">' + esc(term) + '</td><td data-h="RPO">' + (rq ? H.money(rq.m.rpo[0]) + H.src({ title: nm(tk) + ' · RPO', rows: [[t('Al', 'At'), H.date(rq.end)], [t('Etiqueta XBRL', 'XBRL tag'), rq.m.rpo[1]], [t('Presentación', 'Filing'), rq.m.rpo[2].join(', ')]], url: H.edgar(c.cik, rq.m.rpo[2][0]) }) + '<br><span class="small muted">' + (Date.parse(rq.end) < Date.now() - 400 * 864e5 ? t('último dato etiquetado: ', 'last tagged: ') : t('al ', 'at ')) + H.date(rq.end) + '</span>' : H.nt()) + '</td></tr>';
    });
    set('dTbl', '<table class="collapse"><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th><th>' + t('Arrend. firmados no iniciados (no desc.)', 'Leases signed, not commenced (undisc.)') + '</th><th>' + t('Inicio esperado', 'Expected commencement') + '</th><th>' + t('Plazo', 'Term') + '</th><th>' + t('RPO (demanda contratada)', 'RPO (contracted demand)') + '</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>');
    set('dStamp', H.stamp({ tier: 'T1', refreshed: F.refreshedET, sources: [{ label: t('notas de arrendamientos (texto) y XBRL (RPO)', 'lease notes (text) and XBRL (RPO)') }], csv: '/hiperescaladores/csv/off-balance-sheet-tagged.csv', note: '<a href="/hiperescaladores/fuera-de-balance/">' + t('Detalle y contabilidad en el módulo 6', 'Detail and accounting in module 6') + '</a>' }));
  }

  function foot() { set('foot', t('Fuentes: 10-K, 10-Q y 20-F (SEC EDGAR), con página y frase citadas; XBRL companyfacts (RPO); llamadas de resultados de Oracle (T2). ', 'Sources: 10-Ks, 10-Qs and 20-F (SEC EDGAR), with page and quoted sentence; XBRL companyfacts (RPO); Oracle earnings calls (T2). ') + '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.')); }
  H.onLang(function () { header(); conclusion(); stages(); ratio(); dollars(); foot(); });
})();
