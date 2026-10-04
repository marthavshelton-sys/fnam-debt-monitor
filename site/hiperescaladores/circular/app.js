// Hyperscaler Hub · Module 7: circular financing. Reads window.HYP_CIRC (build-modules.mjs): nodes, flows (each with
// its filing citation), concentration and FNAM inferences. Flows between the same two parties are drawn as one arrow
// per direction; arrow width follows the largest single amount on a log scale, never a sum (bases differ: cash invested,
// contract value "up to", maximum exposure). Inference is rendered apart, labeled, and lists the flows it rests on.
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, C = window.HYP_CIRC;
  if (!F || !H || !C) return;
  var t = H.t, esc = H.esc, set = function (id, h) { var e = document.getElementById(id); if (e) e.innerHTML = h; };
  var FILTER = 'all', SELN = null, SELE = null;
  var POS = { OPENAI: [110, 150], ANTHROPIC: [110, 310], DCP: [110, 455], LAVENTURE: [110, 545], MSFT: [370, 60], GOOGL: [370, 170], AMZN: [370, 280], META: [370, 390], ORCL: [370, 500], CRWV: [630, 130], NBIS: [630, 300], IREN: [630, 460], NVDA: [870, 70], APLD: [870, 250], CORZ: [870, 380], AMD: [870, 520] };
  var W = 980, HGT = 600, NW = 150, NH = 36;
  function node(id) { return C.nodes.filter(function (n) { return n.id === id; })[0] || { id: id }; }
  function nname(id) { var n = node(id); if (F.companies[id]) return F.companies[id].name; return n['name_' + H.lang] || n.name || id; }
  function cat(f) { return /equity|credit_facility/.test(f.type) ? 'invest' : /backstop|venture/.test(f.type) ? 'contingent' : 'commercial'; }
  function catL(k) { return { invest: t('Inversión o financiamiento', 'Investment or financing'), commercial: t('Compra o contrato comercial', 'Purchase or commercial contract'), contingent: t('Exposición contingente', 'Contingent exposure') }[k]; }
  function typeL(k) { return { equity: t('capital', 'equity'), equity_right: t('derecho a invertir', 'right to invest'), credit_facility: t('línea de crédito', 'credit facility'), revenue: t('ingresos', 'revenue'), contract: t('contrato de capacidad', 'capacity contract'), lease: t('arrendamiento / licencia', 'lease / license'), purchase: t('compras', 'purchases'), backstop: t('respaldo crediticio', 'credit backstop'), venture: t('coinversión', 'venture') }[k] || k; }
  function basisL(k) { return { commitment: t('comprometido', 'committed'), revenue_fy: t('ingreso del año fiscal', 'fiscal-year revenue'), revenue_h1: t('ingreso del semestre', 'half-year revenue'), tcv: t('valor total del contrato', 'total contract value'), tcv_upto: t('valor del contrato, "hasta"', 'contract value, "up to"'), cash: t('efectivo invertido', 'cash invested'), right_upto: t('derecho, "hasta"', 'right, "up to"'), facility_upto: t('línea, "hasta"', 'facility, "up to"'), commitment_over: t('compromiso, "más de"', 'commitment, "more than"'), max_exposure: t('exposición máxima', 'maximum exposure'), share_of_purchases: t('participación en compras', 'share of purchases'), mw: 'MW', not_disclosed: t('no revelado', 'not disclosed') }[k] || k; }
  function col(k) { return { invest: H.css('--t4'), commercial: H.css('--t3'), contingent: H.css('--warn') }[k]; }
  function amt(f) { return f.amountUSDm != null ? H.moneyM(f.amountUSDm) : f.mw ? H.mw(f.mw) + H.scope(f.scope) : '<span class="nd">' + t('monto no revelado', 'amount not disclosed') + '</span>'; }

  function header() {
    set('asofRow', '<span><b>' + t('Flujos', 'Flows') + '</b> ' + C.flows.length + '</span><span><b>' + t('Inferencias FNAM', 'FNAM inferences') + '</b> ' + C.inferences.length + '</span><span><b>' + t('Archivo curado', 'Curated file') + '</b> ' + H.curatedDate(C) + '</span><span><b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(C.refreshedET) + '</span>');
    set('notices', '<div class="notice"><b>' + t('Hechos y análisis, separados.', 'Facts and analysis, kept apart.') + '</b> ' + t('Secciones 01–03: solo flujos revelados en presentaciones de las empresas cubiertas (T1), cada uno con su página. Sección 04: inferencia de FNAM, marcada como tal y con los flujos en los que se apoya. Los montos tienen bases distintas (efectivo, valor "hasta", exposición máxima) y no se suman.', 'Sections 01–03: only flows disclosed in filings of the covered companies (T1), each with its page. Section 04: FNAM inference, labeled as such and listing the flows it rests on. Amounts have different bases (cash, "up to" value, maximum exposure) and are not added up.') + '</div>');
  }

  function conclusion() {
    var inv = {}, cust = {};
    // a pair counts when the investor is also the investee's customer or supplier (a contract, revenue, lease or purchase flow either way)
    C.flows.forEach(function (f) { if (/equity|credit_facility|venture/.test(f.type)) inv[f.from + '>' + f.to] = 1; if (/contract|revenue|lease|purchase/.test(f.type)) { cust[f.to + '>' + f.from] = 1; cust[f.from + '>' + f.to] = 1; } });
    var both = Object.keys(inv).filter(function (k) { return cust[k]; });
    H.title('Inversionistas que También Son Clientes o Proveedores: Hechos Revelados, Inferencia Aparte', 'Investors Who Are Also Customers or Suppliers: Disclosed Facts, Inference Apart');
    var top = C.concentration.filter(function (x) { return x.pct != null && !/FNAM/.test(x.what_en || ''); }).sort(function (a, b) { return b.pct - a.pct; })[0];
    H.soWhat(t(C.flows.length + ' flujos revelados en presentaciones; en ' + both.length + ' pares, quien invierte también compra o vende al mismo socio (' + both.map(function (k) { var p = k.split('>'); return nname(p[0]) + ' → ' + nname(p[1]); }).join(', ') + ').' + (top ? ' La mayor dependencia revelada: ' + top.pct + '% ' + esc(top.what_es) + ' de ' + F.companies[top.ticker].name + '.' : '') + ' Lo que eso implica es inferencia de FNAM (sección 04), marcada como tal.', C.flows.length + ' flows disclosed in filings; in ' + both.length + ' pairs the investor also buys from or sells to the same partner (' + both.map(function (k) { var p = k.split('>'); return nname(p[0]) + ' → ' + nname(p[1]); }).join(', ') + ').' + (top ? ' The largest disclosed dependence: ' + top.pct + '% of ' + F.companies[top.ticker].name + '\'s ' + esc(top.what_en.replace(/^of /, '')) + '.' : '') + ' What that implies is FNAM inference (section 04), labeled as such.'));
  }
  function edges() {
    var g = {};
    C.flows.forEach(function (f) { if (FILTER !== 'all' && cat(f) !== FILTER) return; var k = f.from + '>' + f.to; (g[k] ||= { from: f.from, to: f.to, flows: [] }).flows.push(f); });
    return Object.values(g);
  }
  function anchor(id, toward) {
    var p = POS[id], q = POS[toward], dx = q[0] - p[0], dy = q[1] - p[1];
    if (Math.abs(dx) * NH > Math.abs(dy) * NW) return [p[0] + Math.sign(dx) * NW / 2, p[1] + dy * (NW / 2) / Math.abs(dx || 1)];
    return [p[0] + dx * (NH / 2) / Math.abs(dy || 1), p[1] + Math.sign(dy) * NH / 2];
  }
  function diagram() {
    set('dgDesc', t('Cada flecha va de quien paga, invierte o garantiza a quien recibe. Toque un nodo para ver solo sus flujos, o una flecha para ver su detalle y fuente. Grosor = el mayor monto individual de esa flecha (escala logarítmica), no la suma.', 'Each arrow goes from whoever pays, invests or guarantees to whoever receives. Tap a node to see only its flows, or an arrow for its detail and source. Width = the largest single amount on that arrow (log scale), not the sum.'));
    set('dgCtl', '<span class="ctl-lbl">' + t('Tipo', 'Type') + '</span><div class="seg" id="segF">' + [['all', t('Todos', 'All')], ['invest', catL('invest')], ['commercial', catL('commercial')], ['contingent', catL('contingent')]].map(function (o) { return '<button type="button" data-f="' + o[0] + '"' + (FILTER === o[0] ? ' class="active"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>');
    document.querySelectorAll('#segF button').forEach(function (b) { b.addEventListener('click', function () { FILTER = b.getAttribute('data-f'); SELE = null; diagram(); }); });
    var E = edges(), pairs = {};
    E.forEach(function (e) { pairs[[e.from, e.to].sort().join('|')] = (pairs[[e.from, e.to].sort().join('|')] || 0) + 1; });
    var defs = '<defs>' + ['invest', 'commercial', 'contingent'].map(function (k) { return '<marker id="ar-' + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="' + col(k) + '"/></marker>'; }).join('') + '</defs>';
    var paths = E.map(function (e, i) {
      var a = anchor(e.from, e.to), b = anchor(e.to, e.from), two = pairs[[e.from, e.to].sort().join('|')] > 1;
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var bend = (two ? 34 : 14) * (e.from < e.to ? 1 : -1);
      var cx = mx - dy / len * bend, cy = my + dx / len * bend;
      var k = cat(e.flows[0]), maxA = Math.max.apply(null, e.flows.map(function (f) { return f.amountUSDm || 0; }));
      var w = maxA ? Math.min(6, 1.4 + Math.log10(maxA / 1000 + 1) * 2.2) : 1.4;
      var dim = (SELN && e.from !== SELN && e.to !== SELN) || (SELE != null && SELE !== i);
      var dash = k === 'contingent' ? ' stroke-dasharray="6 4"' : '';
      return '<g class="eg" data-i="' + i + '" style="cursor:pointer;opacity:' + (dim ? 0.12 : 1) + '"><path d="M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + '" fill="none" stroke="transparent" stroke-width="14"/><path d="M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + '" fill="none" stroke="' + col(k) + '" stroke-width="' + w.toFixed(1) + '"' + dash + ' marker-end="url(#ar-' + k + ')"><title>' + esc(nname(e.from) + ' → ' + nname(e.to) + ': ' + e.flows.map(function (f) { return typeL(f.type); }).join(', ')) + '</title></path></g>';
    }).join('');
    var nodes = Object.keys(POS).map(function (id) {
      var p = POS[id], n = node(id), covered = !!F.companies[id], c = covered ? H.color(id) : H.css('--baseline');
      var dim = SELN && SELN !== id && !E.some(function (e) { return (e.from === SELN && e.to === id) || (e.to === SELN && e.from === id); });
      var label = { DCP: t('Desarrolladores (sin nombre)', 'Developers (unnamed)'), LAVENTURE: t('Coinversión Luisiana', 'Louisiana venture') }[id] || nname(id);
      if (label.length > 24) label = label.slice(0, 23) + '…';
      return '<g class="nd-g" data-n="' + id + '" style="cursor:pointer;opacity:' + (dim ? 0.3 : 1) + '" tabindex="0"><rect x="' + (p[0] - NW / 2) + '" y="' + (p[1] - NH / 2) + '" width="' + NW + '" height="' + NH + '" rx="8" fill="var(--surface)" stroke="' + c + '" stroke-width="' + (SELN === id ? 3 : covered ? 2 : 1.2) + '"' + (covered ? '' : ' stroke-dasharray="3 2"') + '/><text x="' + p[0] + '" y="' + (p[1] + 4.5) + '" text-anchor="middle" font-size="13" font-weight="600" fill="var(--text-primary)">' + esc(label) + '</text><title>' + esc(nname(id)) + '</title></g>';
    }).join('');
    var heads = [[110, t('Laboratorios y vehículos', 'Labs and vehicles')], [370, t('Hiperescaladores', 'Hyperscalers')], [630, t('Neonubes', 'Neoclouds')], [870, t('Chips y desarrolladores', 'Chips and developers')]].map(function (h) { return '<text x="' + h[0] + '" y="18" text-anchor="middle" font-size="11" font-weight="700" letter-spacing=".06em" fill="var(--muted)">' + esc(h[1].toUpperCase()) + '</text>'; }).join('');
    set('dgBox', '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><svg viewBox="0 -8 ' + W + ' ' + (HGT + 8) + '" style="width:100%;min-width:760px;height:auto;display:block" role="img" aria-label="' + t('Mapa de flujos de financiamiento', 'Financing flow map') + '">' + defs + heads + paths + nodes + '</svg></div><p class="small muted only-m">' + t('Deslice el diagrama hacia los lados.', 'Swipe the diagram sideways.') + '</p>');
    document.querySelectorAll('#dgBox .nd-g').forEach(function (el) { var go = function () { var id = el.getAttribute('data-n'); SELN = SELN === id ? null : id; SELE = null; diagram(); }; el.addEventListener('click', go); el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); });
    document.querySelectorAll('#dgBox .eg').forEach(function (el) { el.addEventListener('click', function () { var i = +el.getAttribute('data-i'); SELE = SELE === i ? null : i; SELN = null; diagram(); }); });
    set('dgLeg', ['invest', 'commercial', 'contingent'].map(function (k) { return '<span><i class="line" style="background:' + col(k) + ';height:3px"></i>' + catL(k) + (k === 'contingent' ? ' (' + t('discontinua', 'dashed') + ')' : '') + '</span>'; }).join('') + '<span><i style="border:1.5px dashed var(--baseline);background:transparent"></i>' + t('fuera de la cobertura (contraparte)', 'outside coverage (counterparty)') + '</span>');
    var info = '';
    if (SELE != null && E[SELE]) { var e = E[SELE]; info = '<div class="callout"><b>' + esc(nname(e.from)) + ' → ' + esc(nname(e.to)) + '</b>' + e.flows.map(flowLine).join('') + '</div>'; }
    else if (SELN) { var fl = C.flows.filter(function (f) { return f.from === SELN || f.to === SELN; }); info = '<div class="callout"><b>' + esc(nname(SELN)) + '</b> · ' + fl.length + t(' flujos', ' flows') + fl.map(function (f) { return '<div style="margin-top:6px">' + esc(nname(f.from)) + ' → ' + esc(nname(f.to)) + ': ' + amt(f) + ' <span class="small muted">' + esc(basisL(f.basis)) + ' · ' + esc(typeL(f.type)) + '</span>' + srcBtn(f) + '</div>'; }).join('') + '</div>'; }
    else info = '<p class="small muted" style="margin-top:10px">' + t('Seleccione un nodo o una flecha.', 'Select a node or an arrow.') + '</p>';
    set('dgInfo', info);
    set('dgStamp', H.stamp({ tier: 'T1', asOf: t('varía por flujo', 'varies by flow'), refreshed: C.refreshedET, sources: [{ label: t('10-K, 10-Q y 20-F de las empresas cubiertas', '10-Ks, 10-Qs and 20-F of the covered companies') }], csv: '/hiperescaladores/csv/circular-flows.csv', note: '<a href="/hiperescaladores/circular/quality.html">' + t('Calidad de datos', 'Data quality') + '</a>' }));
  }
  function srcBtn(f) { return f.src ? H.cite(nname(f.from) + ' → ' + nname(f.to), f.src, [[t('Contabilidad', 'Accounting'), f['accounting_' + H.lang]]]) : H.src({ title: nname(f.from) + ' → ' + nname(f.to), rows: [[t('Nivel', 'Tier'), t('T2 · declaración de la empresa, no auditada', 'T2 · company statement, not audited')], [t('Fuente', 'Source'), f.srcT2 ? f.srcT2['title_' + H.lang] : ''], [t('Contabilidad', 'Accounting'), f['accounting_' + H.lang]]], url: f.srcT2 && f.srcT2.url }); }
  function share(f) {
    if (!f.shareOf || f.shareOf.pct == null) return '';
    return H.num(f.shareOf.pct, f.shareOf.pct % 1 ? 1 : 0) + '% ' + t('de los ingresos de ', 'of revenue of ') + esc(nname(f.shareOf.of)) + ' ' + (f.shareOf.disclosed ? '<span class="small muted">(' + t('revelado', 'disclosed') + ')</span>' : H.tier('C') + H.src({ title: t('Cálculo FNAM', 'FNAM calculation'), rows: [[t('Método', 'Method'), f.shareOf.method], [t('Etiqueta XBRL', 'XBRL tag'), f.shareOf.revenueTag]] }));
  }
  function flowLine(f) { return '<div style="margin-top:8px">' + amt(f) + ' <span class="small muted">' + esc(basisL(f.basis)) + ' · ' + esc(typeL(f.type)) + ' · ' + t('al ', 'as of ') + H.date(f.asOf) + '</span>' + srcBtn(f) + '<br><span class="small">' + esc(f['accounting_' + H.lang] || '') + '</span>' + (share(f) ? '<br><span class="small">' + share(f) + '</span>' : '') + (f['pending_' + H.lang] ? '<br><span class="flag">' + esc(f['pending_' + H.lang]) + '</span>' : '') + '</div>'; }

  function flows() {
    set('flDesc', t('Una relación por fila. "Participación" = porcentaje de los ingresos de la contraparte, revelado por la empresa o calculado por FNAM con los ingresos XBRL del mismo periodo.', 'One relationship per row. "Share" = percentage of the counterparty\'s revenue, disclosed by the company or computed by FNAM with XBRL revenue for the same period.'));
    var rows = C.flows.slice();
    var body = rows.map(function (f) { return '<tr id="fl-' + f.id + '"><td class="l" style="white-space:normal;min-width:190px"><b>' + esc(nname(f.from)) + '</b> → <b>' + esc(nname(f.to)) + '</b>' + (f.subsequent ? ' <span class="flag">' + t('posterior', 'subsequent') + '</span>' : '') + '<br><span class="small muted">' + esc(typeL(f.type)) + '</span></td><td>' + amt(f) + '<br><span class="small muted">' + esc(basisL(f.basis)) + '<br>' + t('al ', 'as of ') + H.date(f.asOf) + '</span></td><td class="l" style="white-space:normal;min-width:200px">' + esc(f['accounting_' + H.lang] || '') + (f['pending_' + H.lang] ? '<br><span class="flag">' + esc(f['pending_' + H.lang]) + '</span>' : '') + '</td><td class="l" style="white-space:normal;min-width:120px">' + share(f) + '</td><td class="l">' + H.tier(f.tier) + srcBtn(f) + '</td></tr>'; }).join('');
    var mob = rows.map(function (f) { return '<div class="mrow"><div class="h"><b>' + esc(nname(f.from)) + ' → ' + esc(nname(f.to)) + '</b><span class="v">' + amt(f).replace(/<span class="nd">[^<]*<\/span>/, t('n.d.', 'n.d.')) + '</span></div><div class="c">' + esc(typeL(f.type)) + ' · ' + esc(basisL(f.basis)) + ' · ' + H.date(f.asOf) + (f.shareOf && f.shareOf.pct != null ? ' · ' + H.num(f.shareOf.pct, f.shareOf.pct % 1 ? 1 : 0) + '% ' + t('de ingresos de ', 'of revenue of ') + esc(nname(f.shareOf.of)) : '') + '</div></div>'; }).join('');
    set('flTbl', '<div class="only-d"><table class="compact"><thead><tr><th class="l">' + t('De → a (tipo)', 'From → to (type)') + '</th><th>' + t('Monto (base, fecha)', 'Amount (basis, date)') + '</th><th class="l">' + t('Contabilidad y términos', 'Accounting and terms') + '</th><th class="l">' + t('Participación', 'Share') + '</th><th class="l">' + t('Fuente', 'Source') + '</th></tr></thead><tbody>' + body + '</tbody></table></div><div class="only-m">' + mob + '</div>');
    set('flStamp', H.stamp({ tier: 'T1', refreshed: C.refreshedET, sources: [{ label: t('10-K, 10-Q y 20-F (SEC EDGAR)', '10-Ks, 10-Qs and 20-F (SEC EDGAR)') }], csv: '/hiperescaladores/csv/circular-flows.csv' }));
  }

  function conc() {
    set('ccDesc', t('Cuánto depende cada empresa de una sola contraparte. Revelado = porcentaje que da la propia empresa; cálculo FNAM = monto revelado entre ingresos XBRL o cartera contratada del mismo periodo.', 'How much each company depends on a single counterparty. Disclosed = percentage the company itself gives; FNAM calc. = disclosed amount over XBRL revenue or contracted backlog for the same period.'));
    set('ccTbl', '<table class="collapse"><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Contraparte', 'Counterparty') + '</th><th>' + t('Participación', 'Share') + '</th><th class="l">' + t('De qué', 'Of what') + '</th><th class="l">' + t('Fuente', 'Source') + '</th></tr></thead><tbody>' + C.concentration.map(function (c) {
      var f = c.flow ? C.flows.filter(function (x) { return x.id === c.flow; })[0] : null, src = c.src || (f && f.src), calc = !!(c.calcMethod);
      return '<tr><td class="l">' + H.coName(c.ticker) + '</td><td class="l" data-h="' + t('Contraparte', 'Counterparty') + '">' + esc(c.counterparty || c['counterparty_' + H.lang]) + '</td><td data-h="' + t('Participación', 'Share') + '"><b>' + (c.pct != null ? (calc ? '≈ ' : '') + H.num(c.pct, c.pct % 1 ? 1 : 0) + '%' : H.nd(t('La empresa no da porcentaje', 'The company gives no percentage'))) + '</b></td><td class="l wrap-cell" data-h="' + t('De qué', 'Of what') + '">' + esc(c['what_' + H.lang]) + '</td><td class="l" data-h="' + t('Fuente', 'Source') + '">' + (calc ? H.tier('C') + H.src({ title: t('Cálculo FNAM', 'FNAM calculation'), rows: [[t('Método', 'Method'), c.calcMethod]] }) : H.tier('T1')) + (src ? H.cite(nname(c.ticker), src) : '') + '</td></tr>';
    }).join('') + '</tbody></table>');
    set('ccStamp', H.stamp({ refreshed: C.refreshedET, sources: [{ label: t('notas de concentración de clientes y de partes relacionadas', 'customer-concentration and related-party notes') }] }));
  }

  function breaks() {
    set('bkDesc', t('Lectura analítica de FNAM sobre los flujos de arriba. No son hechos revelados: cada párrafo indica en qué flujos se apoya (toque para ir a la fila).', 'FNAM\'s analytical reading of the flows above. These are not disclosed facts: each paragraph lists the flows it rests on (tap to go to the row).'));
    function chips(ids) { return '<div class="small" style="margin-top:6px">' + t('Se apoya en: ', 'Rests on: ') + ids.map(function (id) { var f = C.flows.filter(function (x) { return x.id === id; })[0]; return f ? '<a href="#fl-' + id + '">' + esc(nname(f.from) + ' → ' + nname(f.to)) + '</a>' : esc(id); }).join(' · ') + '</div>'; }
    set('bkBox', '<div class="grid-2">' + C.inferences.map(function (i) { return '<div class="callout infer" style="margin-top:0"><span class="tier C">' + t('Inferencia FNAM · no es un hecho revelado', 'FNAM inference · not a disclosed fact') + '</span><p style="margin:8px 0 0">' + esc(i[H.lang]) + '</p>' + chips(i.rests_on) + '</div>'; }).join('') + '</div>' +
      '<div class="card"><h3>' + t('Qué rompería el circuito', 'What would break the loop') + ' <span class="tier C">' + t('Inferencia FNAM', 'FNAM inference') + '</span></h3><ol style="margin:10px 0 0;padding-left:20px">' + C.breakers.map(function (b) { return '<li style="margin:8px 0">' + esc(b[H.lang]) + chips(b.rests_on) + '</li>'; }).join('') + '</ol>' + H.stamp({ tier: 'C', refreshed: C.refreshedET, note: t('Análisis de FNAM sobre hechos T1; no es recomendación de inversión', 'FNAM analysis of T1 facts; not investment advice') }) + '</div>');
  }

  function foot() { set('foot', t('Fuentes: 10-K, 10-Q y 20-F de Microsoft, Alphabet, Amazon, Meta, CoreWeave, Nebius, IREN, Applied Digital y Core Scientific (SEC EDGAR); Oracle (T2). Las contrapartes fuera de la cobertura (OpenAI, Anthropic, NVIDIA, AMD) aparecen solo por lo que revelan las empresas cubiertas. ', 'Sources: 10-Ks, 10-Qs and 20-F of Microsoft, Alphabet, Amazon, Meta, CoreWeave, Nebius, IREN, Applied Digital and Core Scientific (SEC EDGAR); Oracle (T2). Counterparties outside coverage (OpenAI, Anthropic, NVIDIA, AMD) appear only through what the covered companies disclose. ') + '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.')); }
  H.onLang(function () { header(); conclusion(); diagram(); flows(); conc(); breaks(); foot(); });
})();
