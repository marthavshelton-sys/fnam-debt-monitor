// Hyperscaler Hub · summary page. Reads window.HYP_FIN, HYP_STATUS and HYP_LOG (scripts/hyperscalers/build.mjs) and
// HYP_CAP, HYP_CIRC (build-modules.mjs). The "What to know" box is composed at render time from the same data as the
// modules: only T1 figures, verified or quote-matched, under 12 months old; a takeaway whose inputs are missing is dropped.
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, LOG = window.HYP_LOG || { entries: [] }, S = window.HYP_STATUS || {}, CAP = window.HYP_CAP, CIRC = window.HYP_CIRC;
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

  var XBRL = 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces';
  // ⓘ card of a TTM figure: the four quarters it sums, the tag and the latest filing
  function ttmSrc(c, q, k, title) {
    var i = c.quarters.indexOf(q), qs = c.quarters.slice(Math.max(0, i - 3), i + 1), x = q.m[k];
    return H.src({ title: c.name + ' · ' + title, rows: [[t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL)', 'FNAM calculation on T1 figures (XBRL)')], [t('Método', 'Method'), t('suma de cuatro trimestres: ', 'sum of four quarters: ') + qs.map(function (z) { return H.fq(z.id); }).join(', ')], [t('Cierre', 'Period end'), H.date(q.end)], x ? [t('Etiqueta XBRL', 'XBRL tag'), x[1]] : null, x ? [t('Última presentación', 'Latest filing'), (x[2] || []).join(', ')] : null], url: x && x[2] ? H.edgar(c.cik, x[2][0]) : XBRL });
  }
  function rpoSrc(c, q) {
    var x = q.m.rpo;
    return H.src({ title: c.name + ' · RPO', rows: [[t('Nivel', 'Tier'), 'T1 · SEC (XBRL)'], [t('Al', 'At'), H.date(q.end)], [t('Etiqueta XBRL', 'XBRL tag'), x[1]], [t('Presentación', 'Filing'), (x[2] || []).join(', ')], c.ticker === 'MSFT' ? [t('Alcance', 'Scope'), t('Incluye contratos comerciales de software y nube, no solo infraestructura', 'Includes commercial software and cloud contracts, not only infrastructure')] : null], url: H.edgar(c.cik, x[2][0]) });
  }

  function header() {
    set('asofRow', '<span><b>' + t('Periodos más recientes', 'Latest periods') + '</b> ' + asOfRange + '</span><span><b>' + t('Última consulta a EDGAR', 'Last EDGAR poll') + '</b> ' + esc(H.etTime(S.lastEdgarSuccess) || S.refreshedET || F.refreshedET) + '</span><span><b>' + t('Datos reconstruidos', 'Data rebuilt') + '</b> ' + esc(S.refreshedET || F.refreshedET) + '</span><span><b>' + t('Cobertura', 'Coverage') + '</b> ' + t('10 empresas · 7 módulos', '10 companies · 7 modules') + '</span>');
    var st = CO.filter(function (c) { return H.stale(c).stale; });
    set('notices', (st.length ? '<div class="notice bad"><b>' + t('Desactualizado', 'Stale') + ':</b> ' + st.map(function (c) { return esc(c.name); }).join(', ') + ' — ' + t('pasó la fecha esperada de su siguiente presentación + 7 días; sus cifras no son las vigentes.', 'past its next expected filing date + 7 days; its figures are not current.') + '</div>' : '') + (S.edgarErrors && S.edgarErrors.length ? '<div class="notice warn">' + t('La última consulta a EDGAR falló para ', 'The last EDGAR poll failed for ') + S.edgarErrors.map(function (e) { return esc(e.ticker); }).join(', ') + t('; se muestran los valores almacenados.', '; stored values are shown.') + '</div>' : ''));
    var X = H.calTTM(CORE, 'capex_cash'), ocf = 0;
    if (X) X.rows.forEach(function (r) { ocf = ocf == null || r.q.ttm.ocf == null ? null : ocf + r.q.ttm.ocf; });
    var win = X ? t('UDM al ', 'TTM to ') + H.cq(X.cal) + t(' calendario', ' (calendar)') : '';
    var capCard = X ? H.src({ title: t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), rows: [[t('Ventana', 'Window'), win + ' (' + H.date(X.calEnd) + ')']].concat(H.calRows(X)).concat([[t('Un año antes', 'A year earlier'), X.prev != null ? H.money(X.prev).replace(/<[^>]+>/g, '') : ''], [t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL 10-Q/10-K)', 'FNAM calculation on T1 figures (XBRL 10-Q/10-K)')]]), url: XBRL }) : '';
    var ocfCard = X && ocf ? H.src({ title: t('Capex / flujo de operación, seis principales', 'Capex / operating cash flow, core six'), rows: [[t('Ventana', 'Window'), win]].concat(X.rows.map(function (r) { return [r.c.name, t('flujo de op. ', 'OCF ') + H.money(r.q.ttm.ocf).replace(/<[^>]+>/g, '') + ' · ' + H.fq(r.q.id)]; })).concat([[t('Regla', 'Rule'), t('n.s. si el flujo es ≤ 0 o menor que 1/5 del capex', 'n.m. when the flow is ≤ 0 or under 1/5 of capex')]]), url: XBRL }) : '';
    // RPO: one line per company, never added (definitions differ; the same customer can sit in several companies' RPO)
    var rpoRows = CO.map(function (c) { var q = lastWith(c, 'rpo'); return q ? { c: c, q: q, v: q.m.rpo[0] } : null; }).filter(function (r) { return r && !H.aged(r.q.end); }).sort(function (a, b) { return b.v - a.v; });
    var rpoOld = CO.filter(function (c) { var q = lastWith(c, 'rpo'); return q && H.aged(q.q ? q.q.end : q.end); });
    var rpoNo = CO.filter(function (c) { return !lastWith(c, 'rpo'); });
    var rpoList = '<span class="kpi-list">' + rpoRows.slice(0, 4).map(function (r) { return '<span>' + esc(r.c.name) + ' <b>' + H.money(r.v) + '</b>' + rpoSrc(r.c, r.q) + ' <span class="muted">' + H.date(r.q.end) + '</span></span>'; }).join('') + '</span>';
    var iss = F.debt ? F.debt.deals.reduce(function (s, d) { return s + d.amount; }, 0) * 1e6 : null;
    var issCard = F.debt ? H.src({ title: t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), rows: [[t('Nivel', 'Tier'), t('FactSet (instantánea fechada; no es T1 hasta cotejarse con el 424B/8-K)', 'FactSet (dated snapshot; not T1 until matched to the 424B/8-K)')], [t('Instantánea', 'Snapshot'), H.date(F.debt.pulledAt)], [t('Operaciones', 'Deals'), String(F.debt.deals.length)], [t('Detalle', 'Detail'), t('módulo 3, sección de emisiones, con el cotejo de cada operación', 'module 3, issuance section, with each deal\'s match')]] }) : '';
    set('kpis', [
      [t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), H.money(X && X.total) + capCard, win + (X && X.prev ? ' · ' + t('vs. ', 'vs. ') + H.money(X.prev) + t(' un año antes (', ' a year earlier (') + (X.total / X.prev - 1 > 0 ? '+' : '') + H.num((X.total / X.prev - 1) * 100, 0) + '%). ' : '. ') + (X ? H.offsetNote(X) : '')],
      [t('Capex / flujo de operación', 'Capex / operating cash flow'), H.capexOcf(X && ocf ? X.total / ocf : null) + ocfCard, t('Seis principales, misma ventana. Lo que queda es el flujo libre antes de dividendos y recompras.', 'Core six, same window. What is left is free cash flow before dividends and buybacks.')],
      [t('Cartera de contratos (RPO), por empresa', 'Contract backlog (RPO), by company'), rpoList, t('No se suman: Microsoft incluye contratos de software; un mismo cliente (p. ej., OpenAI) puede estar en la cartera de varias empresas. Demanda contratada, no capacidad. ', 'Not added up: Microsoft\'s includes software contracts, and one customer (e.g., OpenAI) can sit in several companies\' backlog. Contracted demand, not capacity. ') + (rpoRows.length > 4 ? t('Resto en la tabla de abajo. ', 'The rest in the table below. ') : '') + (rpoNo.length ? t('Sin RPO total etiquetado: ', 'No total RPO tagged: ') + rpoNo.map(function (c) { return c.name; }).join(', ') + '. ' : '') + (rpoOld.length ? t('Último dato con más de 12 meses (excluido): ', 'Last figure over 12 months old (excluded): ') + rpoOld.map(function (c) { return c.name; }).join(', ') + '.' : '')],
      [t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), H.money(iss) + issCard, H.tier('FS') + ' ' + t('Monto vigente, diez empresas, instantánea al ', 'Amount outstanding, ten companies, snapshot of ') + H.date(F.debt && F.debt.pulledAt)]
    ].map(function (k) { return '<div class="kpi"><div class="lbl">' + k[0] + '</div><div class="val">' + k[1] + '</div><div class="sub">' + k[2] + '</div></div>'; }).join(''));
  }

  // ---- What to know: four to five takeaways, every number T1 with its as-of date and source card, each linked to its module
  function verified(i) { return i && i.status === 'verified' && !H.aged(i.asOf); }
  function itemSrc(c, i) { return H.src({ title: c.name + ' · ' + (i.filing.section || ''), rows: [[t('Nivel', 'Tier'), 'T1 · SEC'], [t('Presentación', 'Filing'), i.filing.form + ' · ' + i.filing.accn], [t('Página', 'Page'), i.filing.page], [t('Al', 'At'), H.date(i.asOf)], [t('Texto', 'Text'), '“' + i.quote + '”'], [t('Verificación', 'Verification'), t('verificado ', 'verified ') + H.date(i.verifiedOn)]], url: i.filing.url }); }
  function capSrc(name, x) { return H.cite(name, x.src); }
  function flowSrc(f) { return H.cite(f.from + ' → ' + f.to, f.src); }
  function bn(m) { return H.money(m * 1e6); }
  function whatToKnow() {
    var L = [], OB = F.offbs || { items: [] };
    function item(tk, kind, pred) { return OB.items.filter(function (i) { return i.ticker === tk && i.item === kind && verified(i) && (!pred || pred(i)); })[0]; }
    function meta(src, asof, mods) { return '<span class="meta">' + H.tier('T1') + ' ' + esc(src) + ' · ' + t('al ', 'as of ') + asof + ' · ' + mods.map(function (m) { return '<a href="/hiperescaladores/' + m[0] + '/">' + t('Módulo ', 'Module ') + m[1] + ' →</a>'; }).join(' ') + '</span>'; }

    // 1. pace of capex (module 3)
    var X = H.calTTM(CORE, 'capex_cash'), ocf = 0;
    if (X) X.rows.forEach(function (r) { ocf = ocf == null || r.q.ttm.ocf == null ? null : ocf + r.q.ttm.ocf; });
    if (X && X.prev && ocf && X.rows.length === CORE.length) {
      var g = X.total / X.prev - 1, r = X.total / ocf;
      L.push('<b>' + (r > 0.75 && g > 0.25 ? t('La inversión crece rápido y absorbe la mayor parte del flujo.', 'Spending is growing fast and absorbs most of the cash flow.') : r > 0.5 ? t('La inversión absorbe más de la mitad del flujo.', 'Spending absorbs more than half of the cash flow.') : t('El ritmo de la inversión.', 'The pace of spending.')) + '</b> ' + t('Los seis principales gastaron ', 'The core six spent ') + H.money(X.total) + H.src({ title: t('Capex UDM, seis principales', 'Capex TTM, core six'), rows: H.calRows(X), url: XBRL }) + t(' en capex en efectivo en los doce meses al ', ' in cash capex in the twelve months to ') + H.date(X.calEnd) + ', ' + (g > 0 ? '+' : '') + H.num(g * 100, 0) + t('% frente al año anterior: ', '% on the year before: ') + (r <= H.CO_MAX ? H.num(r * 100, 0) + t('% de su flujo de operación.', '% of their operating cash flow.') : '') + (X.offsets.length ? ' ' + H.offsetNote(X) : '') +
        meta(t('XBRL de 10-Q/10-K (cálculo FNAM)', '10-Q/10-K XBRL (FNAM calculation)'), H.cq(X.cal), [['capex', 3]]));
    }
    // 2. signed, not yet on the balance sheet (module 6)
    var ln = CORE.map(function (c) { var i = item(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; }); if (!i) return null; var q = c.quarters.find(function (z) { return z.end === i.asOf; }); var rec = q && q.m.ol_liab && q.m.fl_liab ? q.m.ol_liab[0] + q.m.fl_liab[0] : null; return { c: c, i: i, rec: rec, q: q }; }).filter(Boolean).sort(function (a, b) { return b.i.amountUSDm - a.i.amountUSDm; }).slice(0, 3);
    if (ln.length >= 2 && ln.filter(function (x) { return x.rec != null; }).length >= 2) {
      L.push('<b>' + (ln.every(function (x) { return x.rec == null || x.i.amountUSDm * 1e6 > x.rec; }) ? t('Lo firmado supera lo que ya está en el balance.', 'What is signed exceeds what is already on the balance sheet.') : t('Arrendamientos firmados frente a los reconocidos.', 'Leases signed versus leases recognized.')) + '</b> ' + t('Arrendamientos firmados que aún no inician (sin descontar): ', 'Leases signed but not yet commenced (undiscounted): ') + ln.map(function (x) { return x.c.name + ' ' + bn(x.i.amountUSDm) + itemSrc(x.c, x.i); }).join(', ') + t('. Sus pasivos por arrendamiento ya reconocidos (valor presente) suman ', '. Their lease liabilities already recognized (present value) are ') + ln.map(function (x) { return x.rec != null ? H.money(x.rec) + ttmSrcBal(x.c, x.q) : H.nt(t('La empresa no etiqueta en XBRL uno de los dos pasivos por arrendamiento a esta fecha', 'The company does not tag one of the two lease liabilities in XBRL at this date')); }).join(', ') + t(', respectivamente. Lo firmado entra al balance cuando se entrega cada centro de datos; aquí nunca se suma a la deuda.', ', respectively. The signed amounts enter the balance sheet as each data center is delivered; they are never added to debt here.') +
        meta(t('notas de arrendamientos de 10-K/10-Q', '10-K/10-Q lease notes'), ln.map(function (x) { return H.date(x.i.asOf); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', '), [['fuera-de-balance', 6]]));
    }
    // 3. operating versus contracted MW, and who reports none (modules 1–2)
    if (CAP) {
      var cur = function (tk, m) { return CAP.current.filter(function (x) { return x.ticker === tk && x.metric === m && x.status === 'verified' && !H.aged(x.asOf); })[0]; };
      var pip = function (tk, m) { return CAP.pipeline.filter(function (x) { return x.ticker === tk && x.metric === m && x.status === 'verified' && !H.aged(x.asOf); })[0]; };
      // a date the filing gives as a month ("As of February 2026") is printed as a month, never as a day it does not state
      var dt = function (x) { var d = new Date(x.asOf + 'T12:00:00Z'), day = d.getUTCDate(); return x.src && x.src.quote && new RegExp('\\b' + day + ',\\s*' + d.getUTCFullYear()).test(x.src.quote) ? H.date(x.asOf) : H.date(x.asOf.slice(0, 7)); };
      var pairs = [['CRWV', 'active_power', 'contracted_power'], ['NBIS', 'active_power', 'contracted_power']].map(function (p) { var a = cur(p[0], p[1]), b = pip(p[0], p[2]); return a && b ? { c: F.companies[p[0]], a: a, b: b } : null; }).filter(Boolean);
      var none = CAP.notDisclosed.filter(function (x) { return x.item === 'mw' && ['MSFT', 'GOOGL', 'AMZN', 'META'].indexOf(x.ticker) >= 0; }).map(function (x) { return F.companies[x.ticker].name; });
      if (pairs.length) L.push('<b>' + (pairs.every(function (p) { return p.b.mw >= 2 * p.a.mw; }) ? t('La capacidad contratada es varias veces la que opera.', 'Contracted capacity is several times what is running.') : t('Capacidad en operación frente a contratada.', 'Operating versus contracted capacity.')) + '</b> ' + pairs.map(function (p) { return p.c.name + ': ' + H.mw(p.a.mw, p.a.qualifier) + capSrc(p.c.name + ' · ' + H.metricLabel(p.a.metric), p.a) + ' ' + t('de potencia activa al ', 'of active power at ') + dt(p.a) + t(' frente a ', ' against ') + H.mw(p.b.mw, p.b.qualifier) + capSrc(p.c.name + ' · ' + H.metricLabel(p.b.metric), p.b) + t(' contratados', ' contracted') + (p.b.asOf !== p.a.asOf ? ' (' + dt(p.b) + ')' : ''); }).join('; ') + '. ' + (none.length ? none.join(', ') + t(' no reportan MW en sus presentaciones: su capacidad no se puede medir con datos T1.', ' report no MW in their filings: their capacity cannot be measured from T1 data.') : '') +
        meta(t('10-K de CoreWeave, 20-F de Nebius', 'CoreWeave 10-K, Nebius 20-F'), pairs.map(function (p) { return H.date(p.a.asOf); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', '), [['capacidad', 1], ['comprometida', 2]]));
    }
    // 4. power and credit support given to third parties (modules 4 and 6)
    var gg = F.companies.GOOGL, gu = item('GOOGL', 'guarantee'), bk = item('GOOGL', 'backstop', function (i) { return i.basis === 'max_exposure'; });
    if (gg && gu && bk) L.push('<b>' + t('El riesgo también viaja en garantías.', 'Risk also travels through guarantees.') + '</b> ' + t('Alphabet respalda a terceros con ', 'Alphabet backs third parties with ') + bn(gu.amountUSDm) + itemSrc(gg, gu) + t(' en garantías para que sus contrapartes compren equipo de generación de futuros contratos de energía y ', ' in guarantees so its counterparties can buy generation equipment for future power contracts, and ') + bn(bk.amountUSDm) + itemSrc(gg, bk) + t(' en derivados de crédito que respaldan arrendamientos de centros de datos (pago máximo, no pasivos). Los MW de los grandes contratos nucleares solo constan en comunicados (T2) y se muestran aparte.', ' in credit derivatives backing data-center leases (maximum payment, not liabilities). The MW of the large nuclear deals appear only in press releases (T2) and are shown apart.') +
      meta(t('10-Q de Alphabet', 'Alphabet 10-Q'), H.date(gu.asOf), [['electricidad', 4], ['fuera-de-balance', 6]]));
    // 5. money that goes out and comes back (module 7)
    if (CIRC) {
      var fl = function (id) { var f = CIRC.flows.filter(function (x) { return x.id === id; })[0]; return f && f.src && f.src.tier === 'T1' && f.src.quoteCheck === 'page' && f.amountUSDm != null && !H.aged(f.asOf) ? f : null; };
      var ae = fl('amzn-openai-equity'), oa = fl('openai-amzn'), mr = fl('openai-msft-revenue'), me = fl('msft-openai-equity');
      if (ae && oa && mr && me) L.push('<b>' + t('El dinero sale y regresa.', 'Money goes out and comes back.') + '</b> ' + t('Amazon invirtió ', 'Amazon invested ') + bn(ae.amountUSDm) + flowSrc(ae) + t(' en OpenAI en el primer semestre de 2026, mientras el compromiso de OpenAI con AWS llegó a ', ' in OpenAI in the first half of 2026, while OpenAI\'s commitment to AWS reached ') + bn(oa.amountUSDm) + flowSrc(oa) + t(' (US$38.0 mil M más una ampliación de US$100.0 mil M). Microsoft registró ', ' (US$38.0 bn plus a US$100.0 bn expansion). Microsoft recorded ') + bn(mr.amountUSDm) + flowSrc(mr) + t(' de ingresos de OpenAI en su año fiscal 2026, con compromisos de inversión en OpenAI por ', ' of revenue from OpenAI in fiscal 2026, against funding commitments to OpenAI of ') + bn(me.amountUSDm) + flowSrc(me) + '.' +
        meta(t('10-Q de Amazon, 10-K de Microsoft', 'Amazon 10-Q, Microsoft 10-K'), H.date(ae.asOf), [['circular', 7]]));
    }
    set('wtk', L.length ? '<h2>' + t('Lo que hay que saber', 'What to Know') + '</h2><ol>' + L.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol><div class="stamp"><span>' + t('Cada cifra es T1 (presentación ante la SEC), verificada o con su cita cotejada, con menos de 12 meses de antigüedad; ⓘ abre la página citada. Se redacta al cargar la página con los mismos datos de los módulos.', 'Every figure is T1 (SEC filing), verified or quote-matched, less than 12 months old; ⓘ opens the cited page. Written at page load from the same data as the modules.') + '</span><span><b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(F.refreshedET) + '</span></div>' : '');
  }
  function ttmSrcBal(c, q) { return H.src({ title: c.name + ' · ' + t('pasivos por arrendamiento', 'lease liabilities'), rows: [[t('Nivel', 'Tier'), 'T1 · SEC (XBRL)'], [t('Al', 'At'), H.date(q.end)], [t('Operativos', 'Operating'), H.money(q.m.ol_liab[0]).replace(/<[^>]+>/g, '') + ' · ' + q.m.ol_liab[1]], [t('Financieros', 'Finance'), H.money(q.m.fl_liab[0]).replace(/<[^>]+>/g, '') + ' · ' + q.m.fl_liab[1]]], url: H.edgar(c.cik, q.m.ol_liab[2][0]) }); }

  function tiles() {
    var M = [
      ['1', t('Capacidad actual', 'Current capacity'), t('MW en operación con la definición de cada empresa, propios o arrendados, centros de datos y GPU donde se divulgan; quién no divulga MW.', 'Operating MW under each company\'s own definition, owned or leased, data centers and GPUs where disclosed; who discloses no MW.'), '/hiperescaladores/capacidad/', 1],
      ['2', t('Capacidad comprometida', 'Committed capacity'), t('Contratada, en construcción y anunciada, por separado y con fecha objetivo; arrendamientos firmados aún no iniciados como equivalente en dólares.', 'Contracted, under construction and announced, kept separate with target dates; leases signed not yet commenced as the dollar equivalent.'), '/hiperescaladores/comprometida/', 1],
      ['3', t('Capex y financiamiento', 'Capex and financing'), t('Capex en efectivo y con arrendamientos financieros, flujo libre, deuda emitida (monto, fecha, plazo, cupón), apalancamiento y cobertura.', 'Cash capex and capex incl. finance leases, free cash flow, debt issued (amount, date, tenor, coupon), leverage and coverage.'), '/hiperescaladores/capex/', 1],
      ['4', t('Electricidad', 'Electricity'), t('Contratos de energía de cada empresa, separados de las proyecciones nacionales y regionales (EIA, NERC, ERCOT, PJM, LBNL, IEA).', 'Each company\'s power contracts, kept apart from national and regional projections (EIA, NERC, ERCOT, PJM, LBNL, IEA).'), '/hiperescaladores/electricidad/', 1],
      ['5', t('Sitios', 'Sites'), t('Mapa y tabla de los campus que cada empresa nombra: localidad, MW, estado, fecha esperada, cliente y energía.', 'Map and table of the campuses each company names: locality, MW, status, expected date, customer and power.'), '/hiperescaladores/sitios/', 1],
      ['6', t('Fuera de balance', 'Off-balance-sheet'), t('Arrendamientos no iniciados, EIV, coinversiones y su deuda, SPV, garantías de valor residual y compromisos firmes; vista reportada y proporcional.', 'Leases not yet commenced, VIEs, JVs and their debt, SPVs, residual value guarantees and take-or-pay commitments; reported and look-through views.'), '/hiperescaladores/fuera-de-balance/', 1],
      ['7', t('Financiamiento circular', 'Circular financing'), t('Los circuitos de dinero entre fabricantes de chips, nubes, laboratorios de IA y neonubes; hechos divulgados separados de la inferencia.', 'The money loops among chip makers, clouds, AI labs and neoclouds; disclosed facts kept apart from inference.'), '/hiperescaladores/circular/', 1],
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
      var s = H.stale(c);
      return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.fq(q.id) + ' · ' + H.date(q.end) + '</td><td>' + H.money(q.ttm.capex_cash) + (q.ttm.capex_cash != null ? ttmSrc(c, q, 'capex_cash', t('capex en efectivo UDM', 'cash capex TTM')) : '') + '</td><td>' + (g == null ? H.nm() : (g > 0 ? '+' : '') + H.num(g * 100, 0) + '%') + '</td><td>' + H.capexOcf(q.ttm.capex_ocf) + '</td><td>' + H.money(q.ttm.fcf) + (q.ttm.fcf != null ? ttmSrc(c, q, 'ocf', t('flujo libre UDM = flujo de operación − capex en efectivo', 'FCF TTM = operating cash flow − cash capex')) : '') + '</td><td>' + H.mult(bq.ttm && bq.ttm.land_ebitda, 1) + '</td><td>' + (rq && H.aged(rq.end) ? H.agedCell(H.money(rq.m.rpo[0]) + rpoSrc(c, rq), rq.end) : rq ? H.money(rq.m.rpo[0]) + rpoSrc(c, rq) + (rq.end < q.end ? '<br><span class="small muted">' + t('al ', 'at ') + H.date(rq.end) + '</span>' : '') : H.nd(t('La empresa no etiqueta un RPO total', 'The company does not tag a total RPO'))) + '</td><td class="l">' + (s.stale ? H.flag('stale') : '<span class="flag ok">' + t('vigente', 'current') + '</span><br><span class="small muted">' + t('hasta ', 'until ') + H.date(s.limit) + '</span>') + '</td></tr>';
    }
    var mrow = function (c) { var q = latest(c); if (!q) return ''; var s = H.stale(c); return '<div class="mrow"><div class="h"><b>' + sw(c) + esc(c.name) + '</b><span class="v">' + H.money(q.ttm.capex_cash) + '</span></div><div class="c">' + t('Capex UDM al ', 'Capex TTM to ') + H.date(q.end) + ' · ' + t('capex/flujo de op. ', 'capex/OCF ') + H.capexOcf(q.ttm.capex_ocf).replace(/<[^>]+>/g, '') + ' · ' + t('flujo libre ', 'FCF ') + H.money(q.ttm.fcf) + ' · ' + (s.stale ? H.flag('stale') : t('vigente', 'current')) + '</div></div>'; };
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
  H.onLang(function () { header(); whatToKnow(); tiles(); glance(); ttmTrend(); status(); changes(); foot(); });
})();
