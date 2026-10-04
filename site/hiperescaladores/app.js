// Hyperscaler Hub · summary page. Reads window.HYP_FIN, HYP_STATUS and HYP_LOG (scripts/hyperscalers/build.mjs) and
// HYP_CAP, HYP_CIRC, HYP_PAY (build-modules.mjs). Every sentence with a figure — the thesis, "What to know", the
// heat map, "what changed" and the chart titles — is composed at page load from the same data as the modules: only T1
// figures (verified or quote-matched, under 12 months old) enter them; FNAM inferences are labeled; a line whose inputs
// are missing is dropped; nothing here is hand-written.
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, LOG = window.HYP_LOG || { entries: [] }, S = window.HYP_STATUS || {}, CAP = window.HYP_CAP, CIRC = window.HYP_CIRC, PAY = window.HYP_PAY;
  if (!F || !H) return;
  var t = H.t, esc = H.esc, $ = function (id) { return document.getElementById(id); }, set = function (id, h) { var e = $(id); if (e) e.innerHTML = h; };
  var CO = Object.values(F.companies), CORE = CO.filter(function (c) { return c.group === 'core'; }), NEO = CO.filter(function (c) { return c.group !== 'core'; });
  var charts = {};
  var TODAY = new Date().toISOString().slice(0, 10);
  function latest(c) { return c.latest ? c.quarters.find(function (q) { return q.id === c.latest.id; }) : null; }
  function lastWith(c, k) { for (var i = c.quarters.length - 1; i >= 0; i--) if (c.quarters[i].m[k]) return c.quarters[i]; return null; }
  function sw(c) { return '<span class="sw" style="background:' + H.color(c.ticker) + '"></span>'; }
  function coName(c) { return sw(c) + '<b>' + esc(c.name) + '</b> <span class="muted small">' + c.ticker + '</span>'; }
  function plainMoney(v) { return H.money(v).replace(/<[^>]+>/g, ''); }
  function bn(m) { return H.money(m * 1e6); }
  function pctS(r, d) { return H.num(r * 100, d || 0) + '%'; }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }
  function mod(path, n, html) { return '<a href="/hiperescaladores/' + path + '/" title="' + esc(t('Módulo ', 'Module ') + n) + '">' + html + '</a>'; }
  var ends = CO.filter(function (c) { return c.latest; }).map(function (c) { return c.latest.end; }).sort();
  var asOfRange = H.date(ends[0]) + ' – ' + H.date(ends[ends.length - 1]);
  var XBRL = 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces';

  // ---- source cards
  function ttmSrc(c, q, k, title) {
    var i = c.quarters.indexOf(q), qs = c.quarters.slice(Math.max(0, i - 3), i + 1), x = q.m[k];
    return H.src({ title: c.name + ' · ' + title, rows: [[t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL)', 'FNAM calculation on T1 figures (XBRL)')], [t('Método', 'Method'), t('suma de cuatro trimestres: ', 'sum of four quarters: ') + qs.map(function (z) { return H.fq(z.id); }).join(', ')], [t('Cierre', 'Period end'), H.date(q.end)], x ? [t('Etiqueta XBRL', 'XBRL tag'), x[1]] : null, x ? [t('Última presentación', 'Latest filing'), (x[2] || []).join(', ')] : null], url: x && x[2] ? H.edgar(c.cik, x[2][0]) : XBRL });
  }
  function rpoSrc(c, q) {
    var x = q.m.rpo;
    return H.src({ title: c.name + ' · RPO', rows: [[t('Nivel', 'Tier'), 'T1 · SEC (XBRL)'], [t('Al', 'At'), H.date(q.end)], [t('Etiqueta XBRL', 'XBRL tag'), x[1]], [t('Presentación', 'Filing'), (x[2] || []).join(', ')], c.ticker === 'MSFT' ? [t('Alcance', 'Scope'), t('Incluye contratos comerciales de software y nube, no solo infraestructura', 'Includes commercial software and cloud contracts, not only infrastructure')] : null], url: H.edgar(c.cik, x[2][0]) });
  }
  function itemSrc(c, i) { return H.src({ title: c.name + ' · ' + (i.filing.section || ''), rows: [[t('Nivel', 'Tier'), 'T1 · SEC'], [t('Base', 'Basis'), t('no descontado', 'undiscounted')], [t('Presentación', 'Filing'), i.filing.form + ' · ' + i.filing.accn], [t('Página', 'Page'), i.filing.page], [t('Al', 'At'), H.date(i.asOf)], [t('Texto', 'Text'), '“' + i.quote + '”'], [t('Verificación', 'Verification'), t('verificado ', 'verified ') + H.date(i.verifiedOn)]], url: i.filing.url }); }
  function payDueSrc(c, q) { return H.src({ title: c.name + ' · ' + t('pagos de arrendamientos reconocidos, sin descontar', 'payments on recognized leases, undiscounted'), rows: [[t('Nivel', 'Tier'), 'T1 · SEC (XBRL)'], [t('Al', 'At'), H.date(q.end)], [t('Operativos', 'Operating'), plainMoney(q.m.ol_pay_due[0]) + ' · ' + q.m.ol_pay_due[1]], [t('Financieros', 'Finance'), plainMoney(q.m.fl_pay_due[0]) + ' · ' + q.m.fl_pay_due[1]], [t('Base', 'Basis'), t('total de la tabla de vencimientos antes de restar el interés implícito: misma base que lo firmado no iniciado', 'maturity-table total before subtracting imputed interest: same basis as the signed, not-yet-commenced amount')]], url: H.edgar(c.cik, q.m.ol_pay_due[2][0]) }); }

  // ---- shared computations (one place, used by the thesis, What to know, the heat map and the tables)
  function verified(i) { return i && i.status === 'verified' && !H.aged(i.asOf); }
  var OB = F.offbs || { items: [], searched: [] };
  // the verified item of that kind (the largest when a company reports several of the same kind)
  function obItem(tk, kind, pred) { return OB.items.filter(function (i) { return i.ticker === tk && i.item === kind && verified(i) && (!pred || pred(i)); }).sort(function (a, b) { return (b.amountUSDm || 0) - (a.amountUSDm || 0); })[0]; }
  function pace() {
    var X = H.calTTM(CORE, 'capex_cash'), ocf = 0;
    if (!X) return null;
    X.rows.forEach(function (r) { ocf = ocf == null || r.q.ttm.ocf == null ? null : ocf + r.q.ttm.ocf; });
    return { X: X, ocf: ocf, r: ocf ? X.total / ocf : null, g: X.prev ? X.total / X.prev - 1 : null };
  }
  // capex above operating cash flow, latest TTM of each company (12-month rule applies)
  function overOcf() { return CO.filter(function (c) { var q = latest(c); return q && !H.aged(q.end) && q.ttm.capex_cash != null && q.ttm.ocf != null && (q.ttm.ocf <= 0 || q.ttm.capex_cash > q.ttm.ocf); }); }
  // leases signed, not commenced (undiscounted) against the undiscounted payments of the leases already recognized, at the
  // same date: like for like. A company without both figures at the same date is left out.
  function leaseCompare() {
    return CO.map(function (c) {
      var i = obItem(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; });
      if (!i) return null;
      var q = c.quarters.find(function (z) { return z.end === i.asOf && z.m.ol_pay_due && z.m.fl_pay_due; });
      return q ? { c: c, i: i, q: q, signed: i.amountUSDm * 1e6, rec: q.m.ol_pay_due[0] + q.m.fl_pay_due[0] } : null;
    }).filter(Boolean);
  }
  function leaseMissing() { return CO.filter(function (c) { return obItem(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; }) && !leaseCompare().some(function (x) { return x.c === c; }); }); }
  // operating versus contracted capacity: only pairs stated at the same date under the same company's definitions
  function capPairs() {
    if (!CAP) return { pairs: [], apart: [] };
    var cur = function (tk, m) { return CAP.current.filter(function (x) { return x.ticker === tk && x.metric === m && x.status === 'verified' && !H.aged(x.asOf); })[0]; };
    var pip = function (tk, m) { return CAP.pipeline.filter(function (x) { return x.ticker === tk && x.metric === m && x.status === 'verified' && !H.aged(x.asOf); })[0]; };
    var out = { pairs: [], apart: [] };
    [['CRWV', 'active_power', 'contracted_power'], ['NBIS', 'active_power', 'contracted_power'], ['APLD', 'critical_it_operating', 'contracted_it'], ['CORZ', 'billable', 'leased_customer_total']].forEach(function (p) {
      var a = cur(p[0], p[1]), b = p[2] === 'leased_customer_total' ? null : pip(p[0], p[2]);
      if (p[0] === 'CORZ') { var l = pip('CORZ', 'leased_customer'); if (a && l && l.asOf === a.asOf) b = { mw: a.mw + l.mw, asOf: a.asOf, metric: 'leased_customer', src: l.src, calc: true, parts: [a, l] }; }
      if (!a || !b) return;
      (a.asOf === b.asOf ? out.pairs : out.apart).push({ c: F.companies[p[0]], a: a, b: b, ratio: b.mw / a.mw });
    });
    return out;
  }
  function noMW() { return CAP ? CAP.notDisclosed.filter(function (x) { return x.item === 'mw' && ['MSFT', 'GOOGL', 'AMZN', 'META'].indexOf(x.ticker) >= 0; }).map(function (x) { return F.companies[x.ticker]; }) : []; }
  function biggestSpenders(n) { return CO.filter(function (c) { var q = latest(c); return q && q.ttm.capex_cash != null && !H.aged(q.end); }).sort(function (a, b) { return latest(b).ttm.capex_cash - latest(a).ttm.capex_cash; }).slice(0, n); }
  // a month the filing states as a month ("As of February 2026") is printed as a month, never as a day it does not give
  function capDate(x) { var d = new Date(x.asOf + 'T12:00:00Z'), day = d.getUTCDate(); return x.src && x.src.quote && new RegExp('\\b' + day + ',\\s*' + d.getUTCFullYear()).test(x.src.quote) ? H.date(x.asOf) : H.date(x.asOf.slice(0, 7)); }
  function capSrc(name, x) { return H.cite(name, x.src); }
  function flow(id) { var f = CIRC && CIRC.flows.filter(function (x) { return x.id === id; })[0]; return f && f.src && f.src.tier === 'T1' && f.src.quoteCheck === 'page' && !H.aged(f.asOf) ? f : null; }
  function flowSrc(f) { return H.cite(f.from + ' → ' + f.to, f.src); }
  function concSrcObj(x) { return x.src || (x.flow && CIRC.flows.filter(function (f) { return f.id === x.flow; })[0] || {}).src || null; }
  function concSrc(x) { var s = concSrcObj(x); return s ? H.cite(F.companies[x.ticker].name + ' · ' + t('concentración', 'concentration'), s) : ''; }
  function concAsOf(x) { var f = x.flow && CIRC.flows.filter(function (z) { return z.id === x.flow; })[0]; return (x.src && x.src.report) || (f && f.asOf) || null; }
  // the largest single-customer share each company discloses (T1), at its latest date
  function topCustomer(tk) {
    if (!CIRC) return null;
    var c = CIRC.concentration.filter(function (x) { return x.ticker === tk && (x.pct != null || x.pctParts); });
    var best = null;
    c.forEach(function (x) { var p = x.pctParts ? x.pctParts[0] : x.pct, d = concAsOf(x) || ''; if (!best || d > best.asOf) best = { x: x, pct: p, asOf: d, top3: x.pctParts ? x.pct : null, calc: !!(x.calc || x.calcRevenue || /FNAM/.test(x.what_en || '')) }; });
    if (!best) { var q = CIRC.concentration.filter(function (x) { return x.ticker === tk; })[0]; return q ? { x: q, pct: null, asOf: concAsOf(q), text: true } : null; }
    return best;
  }
  function segTTM(x) { var c = x.calc; if (!c) return { rev: x.revenue, oi: x.opIncome }; return { rev: c.fy.revenue - c.ytdPrev.revenue + c.ytd.revenue, oi: c.fy.opIncome != null ? c.fy.opIncome - c.ytdPrev.opIncome + c.ytd.opIncome : null }; }
  function segOk(x) { return x.status === 'verified' && x.src && x.src.quoteCheck === 'page' && !H.aged(x.end); }

  function header() {
    set('asofRow', '<span><b>' + t('Periodos más recientes', 'Latest periods') + '</b> ' + asOfRange + '</span><span><b>' + t('Última consulta a EDGAR', 'Last EDGAR poll') + '</b> ' + esc(H.etTime(S.lastEdgarSuccess) || S.refreshedET || F.refreshedET) + '</span><span><b>' + t('Datos reconstruidos', 'Data rebuilt') + '</b> ' + esc(S.refreshedET || F.refreshedET) + '</span><span><b>' + t('Cobertura', 'Coverage') + '</b> ' + t('10 empresas · 8 módulos', '10 companies · 8 modules') + '</span>');
    var st = CO.filter(function (c) { return H.stale(c).stale; });
    set('notices', (st.length ? '<div class="notice bad"><b>' + t('Desactualizado', 'Stale') + ':</b> ' + st.map(function (c) { return esc(c.name); }).join(', ') + ' — ' + t('pasó la fecha esperada de su siguiente presentación + 7 días; sus cifras no son las vigentes.', 'past its next expected filing date + 7 days; its figures are not current.') + '</div>' : '') + (S.edgarErrors && S.edgarErrors.length ? '<div class="notice warn">' + t('La última consulta a EDGAR falló para ', 'The last EDGAR poll failed for ') + S.edgarErrors.map(function (e) { return esc(e.ticker); }).join(', ') + t('; se muestran los valores almacenados.', '; stored values are shown.') + '</div>' : ''));
    var P = pace(), X = P && P.X, ocf = P && P.ocf;
    var win = X ? t('UDM al ', 'TTM to ') + H.cq(X.cal) + t(' calendario', ' (calendar)') : '';
    var capCard = X ? H.src({ title: t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), rows: [[t('Ventana', 'Window'), win + ' (' + H.date(X.calEnd) + ')']].concat(H.calRows(X)).concat([[t('Un año antes', 'A year earlier'), X.prev != null ? plainMoney(X.prev) : ''], [t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL 10-Q/10-K)', 'FNAM calculation on T1 figures (XBRL 10-Q/10-K)')]]), url: XBRL }) : '';
    var ocfCard = X && ocf ? H.src({ title: t('Capex / flujo de operación, seis principales', 'Capex / operating cash flow, core six'), rows: [[t('Ventana', 'Window'), win]].concat(X.rows.map(function (r) { return [r.c.name, t('flujo de op. ', 'OCF ') + plainMoney(r.q.ttm.ocf) + ' · ' + H.fq(r.q.id)]; })).concat([[t('Regla', 'Rule'), t('n.s. si el flujo es ≤ 0 o menor que 1/5 del capex', 'n.m. when the flow is ≤ 0 or under 1/5 of capex')]]), url: XBRL }) : '';
    var rpoRows = CO.map(function (c) { var q = lastWith(c, 'rpo'); return q ? { c: c, q: q, v: q.m.rpo[0] } : null; }).filter(function (r) { return r && !H.aged(r.q.end); }).sort(function (a, b) { return b.v - a.v; });
    var rpoNo = CO.filter(function (c) { return !lastWith(c, 'rpo'); });
    var rpoList = '<span class="kpi-list">' + rpoRows.slice(0, 4).map(function (r) { return '<span>' + esc(r.c.name) + ' <b>' + H.money(r.v) + '</b>' + rpoSrc(r.c, r.q) + ' <span class="muted">' + H.date(r.q.end) + '</span></span>'; }).join('') + '</span>';
    var iss = F.debt ? F.debt.deals.reduce(function (s, d) { return s + d.amount; }, 0) * 1e6 : null;
    var issCard = F.debt ? H.src({ title: t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), rows: [[t('Nivel', 'Tier'), t('FactSet (instantánea fechada; no es T1 hasta cotejarse con el 424B/8-K)', 'FactSet (dated snapshot; not T1 until matched to the 424B/8-K)')], [t('Instantánea', 'Snapshot'), H.date(F.debt.pulledAt)], [t('Operaciones', 'Deals'), String(F.debt.deals.length)], [t('Detalle', 'Detail'), t('módulo 3, sección de emisiones, con el cotejo de cada operación', 'module 3, issuance section, with each deal\'s match')]] }) : '';
    H.dqRollup('dqRoll');
    set('kpis', [
      [t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), H.money(X && X.total) + capCard, win + (X && X.prev ? ' · ' + t('vs. ', 'vs. ') + H.money(X.prev) + t(' un año antes (', ' a year earlier (') + (P.g > 0 ? '+' : '') + H.num(P.g * 100, 0) + '%). ' : '. ') + (X ? H.offsetNote(X) : '')],
      [t('Capex / flujo de operación', 'Capex / operating cash flow'), H.capexOcf(P && P.r) + ocfCard, t('Seis principales, misma ventana. Lo que queda es el flujo libre antes de dividendos y recompras.', 'Core six, same window. What is left is free cash flow before dividends and buybacks.')],
      [t('Cartera de contratos (RPO), por empresa', 'Contract backlog (RPO), by company'), rpoList, t('No se suman: un mismo cliente puede estar en la cartera de varias empresas. Demanda contratada, no capacidad. ', 'Not added up: one customer can sit in several companies\' backlog. Contracted demand, not capacity. ') + (rpoNo.length ? t('Sin RPO total etiquetado: ', 'No total RPO tagged: ') + rpoNo.map(function (c) { return c.name; }).join(', ') + '.' : '')],
      [t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), H.money(iss) + issCard, H.tier('FS') + ' ' + t('Monto vigente, diez empresas, instantánea al ', 'Amount outstanding, ten companies, snapshot of ') + H.date(F.debt && F.debt.pulledAt)]
    ].map(function (k) { return '<div class="kpi"><div class="lbl">' + k[0] + '</div><div class="val">' + k[1] + '</div><div class="sub">' + k[2] + '</div></div>'; }).join(''));
  }

  // ---- B. the thesis: two sentences, 35 words each at most (owner's third review). Sentence 1: the core six and how much of
  // their operating cash flow capex takes. Sentence 2: the companies whose capex exceeds cash flow (named, never pooled as
  // "7 of 10"), how the gap is financed (debt and equity, per the funding table) and the signed obligations off the balance
  // sheet (future obligations: they do not fund current capex). Every number carries its own ⓘ card; a clause whose inputs
  // are missing is dropped.
  var NEOC = [F.companies.CRWV].concat(NEO).filter(Boolean);   // the neocloud businesses: CoreWeave and the four listed neoclouds
  function overCard(list) {
    return H.src({ title: t('Capex frente a flujo de operación, UDM', 'Capex against operating cash flow, TTM'), rows: list.map(function (c) { var q = latest(c); return [c.name, (q.ttm.ocf > 0 ? H.num(q.ttm.capex_ocf * 100, 0) + '%' : t('flujo de operación ≤ 0', 'operating cash flow ≤ 0')) + ' · ' + t('capex ', 'capex ') + plainMoney(q.ttm.capex_cash) + t(', flujo ', ', OCF ') + plainMoney(q.ttm.ocf) + ' · ' + H.fq(q.id) + (q.ttm.debt_proceeds != null || q.ttm.equity_proceeds != null ? ' · ' + t('deuda emitida ', 'debt issued ') + (q.ttm.debt_proceeds != null ? plainMoney(q.ttm.debt_proceeds) : t('s.e.', 'n.t.')) + t(', acciones ', ', equity ') + (q.ttm.equity_proceeds != null ? plainMoney(q.ttm.equity_proceeds) : t('s.e.', 'n.t.')) : '')]; }).concat([[t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL 10-Q/10-K/20-F); fuentes de fondeo en el módulo 3', 'FNAM calculation on T1 figures (10-Q/10-K/20-F XBRL); funding sources in module 3')]]), url: XBRL });
  }
  function stackCard(LC) {
    return H.src({ title: t('Arrendamientos firmados, aún no iniciados, frente a los ya reconocidos (sin descontar)', 'Leases signed but not commenced against those already recognized (undiscounted)'), rows: LC.map(function (x) { return [x.c.name, plainMoney(x.signed) + t(' firmados frente a ', ' signed vs. ') + plainMoney(x.rec) + t(' reconocidos (', ' recognized (') + H.num(x.signed / x.rec, 1) + 'x) · ' + H.date(x.i.asOf) + ' · ' + x.i.filing.form + ' p. ' + (x.i.filing.page || '')]; }).concat([[t('Base', 'Basis'), t('pagos futuros sin descontar en ambos lados; lo firmado entra al balance cuando se entrega cada centro de datos y nunca se suma a la deuda. Son obligaciones futuras: no financian el capex de hoy.', 'future payments, undiscounted on both sides; signed leases enter the balance sheet as each data center is delivered and are never added to debt. They are future obligations: they do not fund today\'s capex.')], [t('Nivel', 'Tier'), 'T1 · SEC (' + t('notas de arrendamientos; tabla de vencimientos en XBRL', 'lease notes; maturity tables in XBRL') + ')']]), url: XBRL });
  }
  function thesis() {
    var P = pace(), over = overOcf(), LC = leaseCompare(), parts = [], meta = [];
    if (P && P.r != null && P.X.rows.length === CORE.length) {
      var X = P.X, win = H.date(X.calEnd);
      var ocfCard = H.src({ title: t('Capex / flujo de operación, seis principales', 'Capex / operating cash flow, core six'), rows: [[t('Ventana', 'Window'), t('UDM al ', 'TTM to ') + H.cq(X.cal) + t(' calendario (', ' (calendar, ') + win + ')']].concat(X.rows.map(function (r) { return [r.c.name, t('capex ', 'capex ') + plainMoney(r.q.ttm.capex_cash) + t(' · flujo de op. ', ' · OCF ') + plainMoney(r.q.ttm.ocf) + ' · ' + H.fq(r.q.id)]; })).concat([[t('Suma', 'Sum'), plainMoney(X.total) + ' / ' + plainMoney(P.ocf) + ' = ' + pctS(P.r)], [t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL 10-Q/10-K)', 'FNAM calculation on T1 figures (10-Q/10-K XBRL)')]]), url: XBRL });
      var s1 = P.r <= H.CO_MAX ? (P.r > 1 ? t('Los seis principales gastaron más que su flujo de operación en capex en los doce meses a ' + win, 'The core six spent more than their operating cash flow on capex in the twelve months to ' + win) + ocfCard + t(': ya no se financian solos.', ': they no longer self-fund.') : t('Los seis principales destinaron ' + pctS(P.r) + ' de su flujo de operación a capex en los doce meses a ' + win, 'The core six put ' + pctS(P.r) + ' of operating cash flow into capex in the twelve months to ' + win) + ocfCard + (P.r > 0.6 ? t(': se financian casi solos, con poco margen.', ': they largely self-fund, with little left.') : t(': se financian solos, con margen.', ': they self-fund, with room to spare.'))) : null;
      if (s1) { parts.push(s1 + (/\.$/.test(s1.replace(/<[^>]+>/g, '')) ? '' : '.') + ' ' + mod('capex', 3, t('Módulo 3', 'Module 3'))); meta.push(H.tier('C') + ' ' + t('capex y flujo: XBRL de 10-Q/10-K, UDM al ', 'capex and cash flow: 10-Q/10-K XBRL, TTM to ') + win + (X.offsets.length ? '; ' + H.offsetNote(X).replace(/\.$/, '') : '')); }
    }
    var coreOver = over.filter(function (c) { return NEOC.indexOf(c) < 0; }), neoOver = over.filter(function (c) { return NEOC.indexOf(c) >= 0; });
    if (over.length) {
      var who = coreOver.map(function (c) { return c.name; });
      var neoTxt = neoOver.length === NEOC.length ? t('las cinco neonubes', 'the five neoclouds') : neoOver.length ? t(neoOver.length + ' de las cinco neonubes', neoOver.length + ' of the five neoclouds') : '';
      var subj = who.concat(neoTxt ? [neoTxt] : []);
      var subjTxt = subj.length > 1 ? subj.slice(0, -1).join(', ') + t(' y ', ' and ') + subj[subj.length - 1] : subj[0];
      var s2 = subjTxt + t(' gastaron más que su flujo de operación', ' spent more than their cash flow') + overCard(over) + t('; esa brecha se financia con deuda y capital', '; that gap is financed with debt and equity');
      if (LC.length >= 2) s2 += t(', mientras una pila mayor de obligaciones firmadas queda fuera del balance', ', while a larger stack of signed obligations sits off the balance sheet') + stackCard(LC);
      parts.push(s2.charAt(0).toUpperCase() + s2.slice(1) + '. ' + (LC.length >= 2 ? mod('fuera-de-balance', 6, t('Módulo 6', 'Module 6')) : mod('capex', 3, t('Módulo 3', 'Module 3'))));
      meta.push(H.tier('T1') + ' ' + t('capex, flujo y fondeo: XBRL de 10-Q/10-K/20-F, UDM al cierre de cada empresa', 'capex, cash flow and funding: 10-Q/10-K/20-F XBRL, TTM to each company\'s latest quarter'));
      if (LC.length >= 2) meta.push(H.tier('T1') + ' ' + t('arrendamientos: notas de 10-K/10-Q y tabla de vencimientos (XBRL), al ', 'leases: 10-K/10-Q notes and maturity tables (XBRL), at ') + uniq(LC.map(function (x) { return H.date(x.i.asOf); })).join(', '));
    }
    if (!parts.length) { set('thesis', ''); set('thesisMeta', ''); return; }
    set('thesis', parts.map(function (x) { return '<span class="ts">' + x + '</span>'; }).join(' '));
    set('thesisMeta', meta.join(' · ') + ' · <b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(F.refreshedET));
  }

  // ---- What to know: five headline lines, each opening to its detail; every number T1 except the labeled inference
  function whatToKnow() {
    var L = [];
    function meta(src, asof, mods, tierK) { return '<span class="meta">' + H.tier(tierK || 'T1') + ' ' + esc(src) + ' · ' + t('al ', 'as of ') + asof + ' · ' + mods.map(function (m) { return '<a href="/hiperescaladores/' + m[0] + '/">' + t('Módulo ', 'Module ') + m[1] + ' →</a>'; }).join(' ') + '</span>'; }
    // 1. pace of capex (module 3)
    var P = pace();
    if (P && P.g != null && P.ocf && P.X.rows.length === CORE.length) {
      var X = P.X, r = P.r, g = P.g;
      var capCardW = H.src({ title: t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six'), rows: [[t('Ventana', 'Window'), t('UDM al ', 'TTM to ') + H.cq(X.cal) + ' (' + H.date(X.calEnd) + ')']].concat(H.calRows(X)).concat([[t('Suma', 'Sum'), plainMoney(X.total)], [t('Un año antes', 'A year earlier'), X.prev != null ? plainMoney(X.prev) : ''], [t('Crecimiento', 'Growth'), (g > 0 ? '+' : '') + pctS(g) + t(' (cálculo FNAM)', ' (FNAM calculation)')]]), url: XBRL });
      var ocfCardW = H.src({ title: t('Capex / flujo de operación, seis principales', 'Capex / operating cash flow, core six'), rows: X.rows.map(function (z) { return [z.c.name, t('flujo de op. ', 'OCF ') + plainMoney(z.q.ttm.ocf) + t(' · capex ', ' · capex ') + plainMoney(z.q.ttm.capex_cash) + ' · ' + H.fq(z.q.id)]; }).concat([[t('Razón', 'Ratio'), plainMoney(X.total) + ' / ' + plainMoney(P.ocf) + ' = ' + pctS(r) + t(' (cálculo FNAM)', ' (FNAM calculation)')]]), url: XBRL });
      L.push([(r > 0.75 && g > 0.25 ? t('La inversión crece ' + pctS(g), 'Spending grew ' + pctS(g)) + capCardW + t(' en un año y absorbe ' + pctS(r), ' in a year and absorbs ' + pctS(r)) + ocfCardW + t(' del flujo de operación.', ' of operating cash flow.') : t('La inversión absorbe ' + pctS(r), 'Spending absorbs ' + pctS(r)) + ocfCardW + t(' del flujo de operación.', ' of operating cash flow.')),
        t('Los seis principales gastaron ', 'The core six spent ') + H.money(X.total) + H.src({ title: t('Capex UDM, seis principales', 'Capex TTM, core six'), rows: H.calRows(X), url: XBRL }) + t(' en capex en efectivo en los doce meses al ', ' in cash capex in the twelve months to ') + H.date(X.calEnd) + t(', frente a ', ', against ') + H.money(X.prev) + t(' un año antes. ', ' a year earlier. ') + (r <= H.CO_MAX ? t('Equivale a ' + pctS(r) + ' de su flujo de operación. ', 'That is ' + pctS(r) + ' of their operating cash flow. ') : '') + t('Por empresa, el capex superó al flujo en ', 'Company by company, capex exceeded cash flow at ') + overOcf().map(function (c) { return c.name; }).join(', ') + '. ' + (X.offsets.length ? H.offsetNote(X) : '') +
        meta(t('XBRL de 10-Q/10-K (cálculo FNAM)', '10-Q/10-K XBRL (FNAM calculation)'), H.cq(X.cal), [['capex', 3]], 'C')]);
    }
    // 2. obligations not on the balance sheet, like for like (module 6): leases signed vs undiscounted recognized payments;
    //    risk ceilings (guarantees, backstops, residual value guarantees) listed beside, never added
    var LC = leaseCompare(), miss = leaseMissing();
    if (LC.length >= 2) {
      var above = LC.filter(function (x) { return x.signed > x.rec; });
      var ceil = [['GOOGL', 'backstop', function (i) { return i.basis === 'max_exposure'; }, t('derivados de crédito que respaldan arrendamientos de centros de datos', 'credit derivatives backing data-center leases')], ['GOOGL', 'guarantee', null, t('garantías a contrapartes de energía', 'guarantees to power counterparties')], ['META', 'rvg', null, t('garantías de valor residual', 'residual value guarantees')], ['ORCL', 'guarantee', null, t('garantía de la deuda de un arrendador', 'guarantee of a lessor\'s debt')]].map(function (k) { var i = obItem(k[0], k[1], k[2]); return i ? F.companies[k[0]].name + ' ' + bn(i.amountUSDm) + itemSrc(F.companies[k[0]], i) + ' (' + k[3] + ')' : null; }).filter(Boolean);
      L.push([t('Lo firmado y aún no iniciado supera lo ya reconocido en ' + above.length + ' de ' + LC.length, 'Leases signed but not yet started exceed those already on the balance sheet at ' + above.length + ' of ' + LC.length) + stackCard(LC) + t(' empresas, comparado sin descontar en ambos lados.', ' companies, both sides undiscounted.'),
        t('Arrendamientos firmados aún no iniciados frente a los pagos por vencer de los arrendamientos ya reconocidos (tabla de vencimientos, antes del interés implícito), a la misma fecha: ', 'Leases signed but not yet commenced against the payments due on leases already recognized (maturity table, before imputed interest), at the same date: ') + LC.sort(function (a, b) { return b.signed / b.rec - a.signed / a.rec; }).map(function (x) { return '<b>' + esc(x.c.name) + '</b> ' + H.money(x.signed) + itemSrc(x.c, x.i) + t(' frente a ', ' vs. ') + H.money(x.rec) + payDueSrc(x.c, x.q) + ' (' + H.num(x.signed / x.rec, 1) + 'x, ' + H.date(x.i.asOf) + ')'; }).join('; ') + '. ' + (miss.length ? t('Sin cifra comparable a la misma fecha (fuera de este conteo): ', 'No comparable figure at the same date (left out of the count): ') + miss.map(function (c) { return c.name; }).join(', ') + '. ' : '') + (ceil.length ? t('Además hay topes de riesgo que no son pasivos ni se suman: ', 'There are also risk ceilings that are not liabilities and are not added: ') + ceil.join('; ') + '. ' : '') + t('Lo firmado entra al balance cuando se entrega cada centro de datos; nunca se suma a la deuda.', 'The signed amounts enter the balance sheet as each data center is delivered; they are never added to debt.') +
        meta(t('notas de arrendamientos y garantías de 10-K/10-Q; tabla de vencimientos en XBRL', '10-K/10-Q lease and guarantee notes; maturity tables in XBRL'), uniq(LC.map(function (x) { return H.date(x.i.asOf); })).join(', '), [['fuera-de-balance', 6]])]);
    }
    // 3. operating versus contracted capacity, same date only (modules 1–2)
    var CP = capPairs(), nm = noMW();
    if (CP.pairs.length) {
      var p0 = CP.pairs.filter(function (p) { return p.c.ticker === 'CRWV'; })[0] || CP.pairs[0];
      var pairCard = H.src({ title: p0.c.name + ' · ' + t('contratado frente a en operación', 'contracted against operating'), rows: [[H.metricLabel(p0.a.metric), H.mw(p0.a.mw, p0.a.qualifier) + ' · ' + capDate(p0.a) + (p0.a.src ? ' · ' + p0.a.src.form + ' p. ' + (p0.a.src.page || p0.a.src.pageSeq) : '')], [H.metricLabel(p0.b.metric), H.mw(p0.b.mw, p0.b.qualifier) + ' · ' + capDate(p0.b) + (p0.b.src ? ' · ' + p0.b.src.form + ' p. ' + (p0.b.src.page || p0.b.src.pageSeq) : '')], [t('Razón', 'Ratio'), H.num(p0.ratio, 1) + 'x' + t(' (cálculo FNAM, misma fecha y definición de la empresa)', ' (FNAM calculation, same date and company definition)')], p0.a.src ? [t('Texto', 'Text'), '“' + p0.a.src.quote + '”'] : null], url: p0.a.src ? p0.a.src.url : null });
      var nmCard = H.src({ title: t('Grandes nubes sin MW en sus presentaciones', 'Large clouds with no MW in their filings'), rows: nm.map(function (c) { var x = CAP.notDisclosed.filter(function (z) { return z.ticker === c.ticker && z.item === 'mw'; })[0]; return [c.name, t('buscado en ', 'searched in ') + ((x && x.searched) || []).join(', ')]; }).concat([[t('Nivel', 'Tier'), 'T1 · SEC']]) });
      L.push([t('Lo contratado es ' + H.num(p0.ratio, 1) + ' veces', 'Contracted capacity is ' + H.num(p0.ratio, 1) + 'x') + pairCard + t(' lo que opera en ' + p0.c.name + '; ' + nm.length, ' what is running at ' + p0.c.name + '; ' + nm.length) + nmCard + t(' de los grandes no reportan MW.', ' of the large clouds report no MW.'),
        CP.pairs.map(function (p) { return '<b>' + esc(p.c.name) + '</b>: ' + H.mw(p.a.mw, p.a.qualifier) + capSrc(p.c.name + ' · ' + H.metricLabel(p.a.metric), p.a) + ' ' + H.metricLabel(p.a.metric).toLowerCase() + t(' frente a ', ' against ') + H.mw(p.b.mw, p.b.qualifier) + (p.b.calc ? H.src({ title: p.c.name, rows: [[t('Método', 'Method'), t('facturable + en construcción = potencia arrendada a clientes', 'billable + under construction = customer leased power')]] }) : capSrc(p.c.name + ' · ' + H.metricLabel(p.b.metric), p.b)) + ' ' + H.metricLabel(p.b.metric).toLowerCase() + ', ' + t('ambos al ', 'both at ') + capDate(p.a) + ' (' + H.num(p.ratio, 1) + 'x)'; }).join('; ') + '. ' +
        (CP.apart.length ? t('No se comparan por estar a fechas distintas: ', 'Not compared because the dates differ: ') + CP.apart.map(function (p) { return p.c.name + ' (' + H.mw(p.a.mw, p.a.qualifier) + ' ' + t('al ', 'at ') + capDate(p.a) + '; ' + H.mw(p.b.mw, p.b.qualifier) + ' ' + t('contratados a ', 'contracted as of ') + capDate(p.b) + ')'; }).join('; ') + '. ' : '') +
        (p0.c.ticker === 'CRWV' ? t('El 10-Q de CoreWeave al 30 jun 2026 no actualiza ninguna de las dos cifras (buscado). ', 'CoreWeave\'s 10-Q for 30 Jun 2026 updates neither figure (searched). ') : '') +
        (nm.length ? nm.map(function (c) { return c.name; }).join(', ') + t(' no reportan MW en sus presentaciones: su capacidad no se puede medir con datos T1 (el módulo 1 muestra estimaciones de terceros, T4, aparte).', ' report no MW in their filings: their capacity cannot be measured from T1 data (module 1 shows third-party estimates, T4, apart).') : '') +
        meta(uniq(CP.pairs.map(function (p) { return p.c.name + ' ' + ((p.a.src && p.a.src.form) || ''); })).join(', '), uniq(CP.pairs.map(function (p) { return capDate(p.a); })).join(', '), [['capacidad', 1], ['comprometida', 2]])]);
    }
    // 4. the payoff (module 8): cloud segment margins and how much backlog lands within a year
    if (PAY) {
      var segs = PAY.segments.filter(segOk).map(function (x) { var v = segTTM(x); return v.oi != null ? { x: x, c: F.companies[x.ticker], m: v.oi / v.rev, v: v } : null; }).filter(Boolean);
      var rt = PAY.rpoTiming.filter(function (x) { return x.status === 'verified' && x.months === 12 && x.share != null && !H.aged(x.asOf); });
      if (segs.length >= 2) {
        var ms = segs.map(function (s) { return s.m; }), lo = Math.min.apply(null, ms), hi = Math.max.apply(null, ms);
        var segCardW = H.src({ title: t('Márgenes de operación de las nubes, 12 meses', 'Cloud units\' operating margins, 12 months'), rows: segs.map(function (sg) { return [sg.c.name + ' · ' + sg.x['segment_' + H.lang].replace(/ \(.*$/, ''), pctS(sg.m) + ' · ' + plainMoney(sg.v.rev * 1e6) + t(' de ingresos · ', ' revenue · ') + sg.x.src.form + ' p. ' + (sg.x.src.page || sg.x.src.pageSeq) + ' · ' + H.date(sg.x.end)]; }).concat([[t('Nota', 'Note'), PAY['segmentNote_' + H.lang] || '']]), url: segs[0].x.src.url });
        var rtCardW = rt.length ? H.src({ title: t('Parte de la cartera (RPO) que se reconoce en 12 meses', 'Share of backlog (RPO) recognized within 12 months'), rows: rt.map(function (x) { return [F.companies[x.ticker].name, '≈' + pctS(x.share) + t(' de ', ' of ') + plainMoney(x.rpoUSDm * 1e6) + ' · ' + x.src.form + ' p. ' + (x.src.page || x.src.pageSeq) + ' · ' + H.date(x.asOf)]; }), url: rt[0].src.url }) : '';
        L.push([t('Las nubes ganan márgenes de operación de ' + pctS(lo) + ' a ' + pctS(hi), 'Cloud units earn ' + pctS(lo) + '–' + pctS(hi)) + segCardW + (rt.length ? t(', pero la mayor parte de la cartera se cobra después de 12 meses', ' operating margins, but most backlog lands after the next 12 months') + rtCardW + '.' : t('.', ' operating margins.')),
          segs.map(function (s) { return '<b>' + esc(s.c.name) + '</b> ' + esc(s.x['segment_' + H.lang].replace(/ \(.*$/, '')) + ': ' + H.money(s.v.rev * 1e6) + H.cite(s.c.name + ' · ' + s.x['segment_' + H.lang], s.x.src) + t(' de ingresos y ', ' of revenue and ') + pctS(s.m) + t(' de margen', ' margin') + ' (' + t('12 meses al ', '12 months to ') + H.date(s.x.end) + ')'; }).join('; ') + '. ' +
          (rt.length ? t('Parte de la cartera (RPO) que se espera reconocer en 12 meses: ', 'Share of the backlog (RPO) expected within 12 months: ') + rt.map(function (x) { return esc(F.companies[x.ticker].name) + ' ≈' + pctS(x.share) + H.cite(F.companies[x.ticker].name + ' · RPO', x.src) + t(' de ', ' of ') + bn(x.rpoUSDm) + ' (' + H.date(x.asOf) + ')'; }).join('; ') + '. ' : '') + t('Meta no tiene segmento de nube; Oracle no da margen de su infraestructura.', 'Meta has no cloud segment; Oracle gives no margin for its infrastructure.') +
          meta(t('notas de segmentos e ingresos de 10-K/10-Q (UDM: cálculo FNAM)', '10-K/10-Q segment and revenue notes (TTM: FNAM calculation)'), uniq(segs.map(function (s) { return H.date(s.x.end); })).join(', '), [['retorno', 8]])]);
      }
    }
    // 5. money that goes out and comes back (module 7) — an FNAM inference; its flows are T1 and are not netted
    if (CIRC) {
      var ae = flow('amzn-openai-equity'), oa = flow('openai-amzn'), mr = flow('openai-msft-revenue'), me = flow('msft-openai-equity');
      // the two documented cases: the named largest customer from the 10-K first (the owner's ask), then the latest
      // 10-Q share when the filing no longer names the customer (CoreWeave's Q2 2026 10-Q gives top-three shares only)
      function concCase(tk) {
        var recs = CIRC.concentration.filter(function (x) { return x.ticker === tk && x.pct != null && !(x.calc || x.calcRevenue || /FNAM/.test(x.what_en || '')); });
        if (!recs.length) return null;
        var named = recs.filter(function (x) { return x.counterparty && !x.pctParts; }).sort(function (a, b) { return (concAsOf(b) || '') > (concAsOf(a) || '') ? 1 : -1; });
        var p = named[0] || recs[0], s = recs.filter(function (x) { return x !== p && x.pctParts; })[0] || null;
        var who = function (x) { return x.pctParts ? t('mayor cliente, sin nombre', 'largest customer, unnamed') : (x.counterparty || x['counterparty_' + H.lang] || ''); };
        var pct = function (x) { return x.pctParts ? x.pctParts[0] : x.pct; };
        var what = function (x) { return (x['what_' + H.lang] || x.what_en || '').replace(/\s*\([^)]*\)\s*$/, ''); };
        var when = function (x) { return concAsOf(x) ? ' (' + H.date(concAsOf(x)) + ')' : ''; };
        var one = function (x) { return esc(who(x)) + ', ' + pct(x) + '%' + concSrc(x) + ' ' + esc(what(x)); };
        var det = function (x) { return esc(who(x)) + ' ' + pct(x) + '% ' + esc(what(x)) + concSrc(x) + (x.pctParts ? t(' — tres mayores clientes ', ' — top three customers ') + x.pct + '% (' + x.pctParts.join('% + ') + '%)' : '') + when(x); };
        return { c: F.companies[tk], sum: one(p) + (s ? '; ' + one(s) : ''), det: det(p) + (s ? '; ' + det(s) : '') };
      }
      var cases = [concCase('CRWV'), concCase('CORZ')].filter(Boolean);
      var caseTxt = cases.length ? cases.map(function (k) { return k.c.name + ' (' + k.sum + ')'; }).join(t(' y ', ' and ')) : '';
      if (ae && oa && mr && me) L.push(['<span class="infer-tag">' + t('Inferencia FNAM', 'FNAM inference') + '</span>' + t('Los inversionistas de los laboratorios de IA también son sus proveedores de nube', 'The AI labs\' investors are also their cloud suppliers') + (cases.length ? t('; la dependencia de un solo cliente está documentada en ' + cases.length + ' casos, ' + caseTxt + ', no en todas las neonubes.', '; single-customer dependence is documented in ' + cases.length + ' cases, ' + caseTxt + ', not at every neocloud.') : '.'),
        (cases.length ? t('Concentración documentada (T1): ', 'Documented concentration (T1): ') + cases.map(function (k) { return '<b>' + esc(k.c.name) + '</b>: ' + k.det; }).join('; ') + '. ' + t('IREN reporta una «mayoría sustancial» sin porcentaje; Nebius y Applied Digital no dan un porcentaje por cliente: son dos casos, no una regla para todas las neonubes. ', 'IREN reports a "substantial majority" without a percentage; Nebius and Applied Digital give no per-customer share: these are two cases, not a rule for every neocloud. ') : '') + t('La inferencia es una lectura de FNAM sobre flujos T1 que no son del mismo tipo y por eso no se restan: ', 'The inference is FNAM\'s reading of T1 flows that are not of the same kind and therefore are not netted: ') + '<b>Amazon</b> ' + t('invirtió ', 'invested ') + bn(ae.amountUSDm) + flowSrc(ae) + t(' en efectivo en OpenAI en el primer semestre de 2026 (flujo del periodo); OpenAI se comprometió a comprarle a AWS ', ' of cash in OpenAI in the first half of 2026 (a flow in the period); OpenAI committed to buy ') + bn(oa.amountUSDm) + flowSrc(oa) + t(' (valor de contrato a varios años' + (oa.termYears ? ', ' + oa.termYears + ' años' : '') + ', aún no ingreso). ', ' from AWS (multi-year contract value' + (oa.termYears ? ' over ' + oa.termYears + ' years' : '') + ', not yet revenue). ') + '<b>Microsoft</b> ' + t('registró ', 'recorded ') + bn(mr.amountUSDm) + flowSrc(mr) + t(' de ingresos de OpenAI en su año fiscal 2026 (ingreso de un año, incluye participación de ingresos); su compromiso acumulado de inversión en OpenAI es de ', ' of revenue from OpenAI in fiscal 2026 (one year of revenue, including revenue sharing); its cumulative funding commitment to OpenAI is ') + bn(me.amountUSDm) + flowSrc(me) + ' (' + t('saldo acumulado', 'a cumulative stock') + (me['note_' + H.lang] ? ': ' + esc(me['note_' + H.lang]) : '') + ')' + t('. Comparar un ingreso anual con un compromiso acumulado no mide un rendimiento.', '. Comparing one year of revenue with a cumulative commitment does not measure a return.') +
        meta(t('10-Q de Amazon, 10-K de Microsoft · lectura: FNAM', 'Amazon 10-Q, Microsoft 10-K · reading: FNAM'), H.date(ae.asOf), [['circular', 7]])]);
    }
    set('wtk', L.length ? '<h2>' + t('Lo que hay que saber', 'What to Know') + '</h2>' + L.slice(0, 5).map(function (x, i) { return '<details><summary><span class="num-i">' + (i + 1) + '</span><span>' + x[0] + '</span></summary><div class="det">' + x[1] + '</div></details>'; }).join('') + '<div class="stamp"><span>' + t('Cifras T1 (presentaciones ante la SEC), verificadas o con su cita cotejada, de menos de 12 meses; la línea marcada «Inferencia FNAM» es una lectura de FNAM. ⓘ abre la página citada. Se redacta al cargar la página con los mismos datos de los módulos.', 'T1 figures (SEC filings), verified or quote-matched, under 12 months old; the line marked "FNAM inference" is FNAM\'s reading. ⓘ opens the cited page. Written at page load from the same data as the modules.') + '</span><span><b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(F.refreshedET) + '</span></div>' : '');
  }

  // ---- reading paths: the 3-minute path and the deep dive
  var TILES = function () {
    return [
      ['capacidad', 1, t('Los MW no son comparables: la capacidad solo se mide en las neonubes', 'MW are not comparable, so capacity is measured only for neoclouds')],
      ['comprometida', 2, t('Lo comprometido va años adelante de lo que opera', 'What is committed runs years ahead of what is running')],
      ['capex', 3, t('Cuánto se invierte y cuánto cubre el flujo de operación', 'How much is spent, and how much cash flow covers')],
      ['electricidad', 4, t('La energía contratada consta sobre todo en comunicados, aparte de la red', 'Power deals sit mostly in press releases, apart from the grid')],
      ['sitios', 5, t('Las presentaciones nombran localidades, no campus', 'Filings name towns, not campuses')],
      ['fuera-de-balance', 6, t('Lo firmado que aún no está en el balance, con su base a la vista', 'What is signed but not yet on the balance sheet, basis in view')],
      ['circular', 7, t('Inversionistas que también son clientes: hechos e inferencia, aparte', 'Investors who are also customers: facts and inference, apart')],
      ['retorno', 8, t('Lo que rinde la inversión y cuánto cuesta el dinero', 'What the spending earns, and what the money costs')]
    ];
  };
  function paths() {
    set('pathsBox', '<div class="path fast"><h3>' + t('Ruta de 3 minutos', '3-minute path') + '</h3><ol><li><a href="#thesis">' + t('La tesis', 'The thesis') + '</a> ' + t('y las cinco líneas de «Lo que hay que saber» (arriba)', 'and the five "What to know" lines (above)') + '</li><li><a href="#heat">' + t('El mapa de calor', 'The heat map') + '</a>: ' + t('qué empresa enciende qué alerta', 'which company trips which alert') + '</li><li><a href="#changed">' + t('Qué cambió', 'What changed') + '</a> ' + t('en las últimas presentaciones', 'in the latest filings') + '</li><li><a href="#calendar">' + t('Próximos resultados', 'Upcoming results') + '</a></li></ol></div>' +
      '<div class="path"><h3>' + t('A fondo: los ocho módulos', 'Deep dive: the eight modules') + '</h3><div class="mini-tiles">' + TILES().map(function (m) { return '<a href="/hiperescaladores/' + m[0] + '/"><b>' + m[1] + '</b> ' + esc(m[2]) + '</a>'; }).join('') + '</div><p class="small muted" style="margin:8px 0 0"><a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a></p></div>');
  }

  // ---- B. heat map: company × metric, the value and its as-of date printed in every cell
  function heat() {
    var cols = [
      [t('Crecimiento del capex', 'Capex growth'), t('UDM frente al UDM de un año antes', 'TTM vs. the TTM a year earlier')],
      [t('Capex / flujo de operación', 'Capex / operating cash flow'), t('UDM; n.s. si el flujo ≤ 0 o < 1/5 del capex', 'TTM; n.m. if the flow ≤ 0 or < 1/5 of capex')],
      [t('Comprometido / en operación', 'Committed / operating'), t('MW de la misma empresa y fecha', 'MW of the same company and date')],
      [t('Fuera de balance / reconocido', 'Off balance sheet / recognized'), t('arrend. no iniciados ÷ pagos de arrend. reconocidos, ambos sin descontar', 'leases not commenced ÷ recognized lease payments, both undiscounted')],
      [t('Mayor cliente', 'Largest customer'), t('parte de los ingresos (o de la cartera)', 'share of revenue (or backlog)')]
    ];
    set('heatH', '<span>' + t('Dónde Está la Presión, Empresa por Empresa', 'Where the Strain Is, Company by Company') + '</span>');
    set('heatDesc', t('Cinco señales, una columna cada una. El color va de claro (menor presión) a oscuro (mayor); el valor y su fecha se imprimen en cada celda. Las celdas sin dato dicen por qué (no comparable, fechas distintas, lectura pendiente). Nada se promedia entre columnas ni entre empresas.', 'Five signals, one column each. Colour runs from light (less strain) to dark (more); the value and its date are printed in every cell. Cells without data say why (not comparable, dates differ, reading pending). Nothing is averaged across columns or companies.'));
    var LC = leaseCompare(), CP = capPairs(), nm = noMW();
    function lvl(v, cuts) { var k = 0; while (k < cuts.length && v > cuts[k]) k++; return k / cuts.length; }
    function cell(html, level, asOf, src) { return '<td' + H.heat(level) + '>' + html + (src || '') + (asOf ? '<span class="hd">' + t('al ', 'at ') + asOf + '</span>' : '') + '</td>'; }
    function empty(why) { return '<td><span class="nd">' + why + '</span></td>'; }
    function row(c) {
      var q = latest(c); if (!q) return '';
      var i = c.quarters.indexOf(q), p = c.quarters[i - 4], g = p && p.ttm.capex_cash ? q.ttm.capex_cash / p.ttm.capex_cash - 1 : null;
      var gC = g == null ? empty(t('sin UDM de hace un año', 'no TTM a year earlier')) : cell((g > 0 ? '+' : '') + pctS(g), lvl(g, [0.25, 0.5, 1, 2]), H.date(q.end), ttmSrc(c, q, 'capex_cash', t('capex en efectivo UDM', 'cash capex TTM')));
      var r = q.ttm.capex_ocf, rC = q.ttm.ocf != null && q.ttm.ocf <= 0 ? cell(H.nm(), 1, H.date(q.end)) : r == null ? empty(H.nt()) : cell(H.capexOcf(r), r > H.CO_MAX ? 1 : lvl(r, [0.5, 0.75, 1, 2]), H.date(q.end), ttmSrc(c, q, 'ocf', t('flujo de operación UDM', 'operating cash flow TTM')));
      var cp = CP.pairs.filter(function (x) { return x.c === c; })[0], ca = CP.apart.filter(function (x) { return x.c === c; })[0];
      var cpC = cp ? cell(H.num(cp.ratio, 1) + 'x', lvl(cp.ratio, [1.5, 3, 5, 10]), capDate(cp.a), capSrc(c.name, cp.a)) : ca ? empty(t('fechas distintas', 'dates differ')) : nm.indexOf(c) >= 0 ? empty(t('sin MW en presentaciones', 'no MW in filings')) : c.ticker === 'ORCL' ? empty(t('solo T2 (llamadas)', 'T2 only (calls)')) : empty(t('definiciones no comparables', 'definitions not comparable') + (c.ticker === 'IREN' ? H.scope('iren-childress', t('por qué', 'why')) : ''));
      var lc = LC.filter(function (x) { return x.c === c; })[0];
      var hasLn = obItem(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; });
      var lcC = lc ? cell(H.num(lc.signed / lc.rec, 1) + 'x', lvl(lc.signed / lc.rec, [1, 2, 3, 5]), H.date(lc.i.asOf), itemSrc(c, lc.i)) : hasLn ? empty(t('sin pagos sin descontar a la misma fecha', 'no undiscounted payments at the same date')) : c.ticker === 'CORZ' ? empty(t('es arrendador', 'is a lessor')) : OB.searched.some(function (x) { return x.ticker === c.ticker && x.item === 'leases_not_commenced' && x.result === 'none'; }) ? empty(t('ninguno (buscado)', 'none (searched)')) : empty(t('lectura pendiente', 'reading pending'));
      var tc = topCustomer(c.ticker);
      var tcC = tc && tc.pct != null ? cell(tc.pct + '%' + (tc.top3 ? ' <span class="small">' + t('3 mayores: ', 'top 3: ') + tc.top3 + '%</span>' : '') + (tc.calc ? ' <span class="small">' + t('cálculo FNAM', 'FNAM calc.') + '</span>' : ''), lvl(tc.pct, [10, 25, 50, 75]), tc.asOf ? H.date(tc.asOf) : '', concSrc(tc.x)) : tc ? cell(t('mayoría sustancial (sin %)', 'substantial majority (no %)'), 0.75, tc.asOf ? H.date(tc.asOf) : '', concSrc(tc.x)) : empty(t('sin cifra leída', 'no figure read'));
      return '<tr><td class="l">' + coName(c) + '</td>' + gC + rC + cpC + lcC + tcC + '</tr>';
    }
    set('heatTbl', '<table class="heat"><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th>' + cols.map(function (k) { return '<th data-short="' + esc(k[0]) + '">' + k[0] + '<br><span style="text-transform:none;font-weight:400;letter-spacing:0">' + k[1] + '</span></th>'; }).join('') + '</tr></thead><tbody><tr class="grp"><td colspan="6">' + t('Seis principales', 'Core six') + '</td></tr>' + CORE.map(row).join('') + '<tr class="grp"><td colspan="6">' + t('Neonubes listadas', 'Listed neoclouds') + '</td></tr>' + NEO.map(row).join('') + '</tbody></table>');
    set('heatStamp', '<div class="stamp">' + H.heatLegend() + '</div>' + H.stamp({ tier: 'T1', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }, { label: t('notas de 10-K/10-Q/20-F', '10-K/10-Q/20-F notes') }], note: t('Cortes de color: crecimiento 25/50/100/200%; capex/flujo 50/75/100/200%; comprometido 1.5/3/5/10x; fuera de balance 1/2/3/5x; cliente 10/25/50/75%. Razones y crecimientos: cálculo FNAM sobre cifras T1.', 'Colour cuts: growth 25/50/100/200%; capex/OCF 50/75/100/200%; committed 1.5/3/5/10x; off balance sheet 1/2/3/5x; customer 10/25/50/75%. Ratios and growth: FNAM calculation on T1 figures.') }));
  }

  // ---- C7. what changed in the latest filings, in plain language (the technical diff log sits below it, folded)
  function changed() {
    set('changedDesc', t('Lo que trajo la presentación más reciente de cada empresa (últimos 100 días), en palabras. Debajo, plegado, el registro técnico de cada valor XBRL nuevo, revisado o reexpresado.', 'What each company\'s most recent filing brought (last 100 days), in words. Below, folded, the technical log of every new, revised or restated XBRL value.'));
    var lim = new Date(Date.now() - 100 * 864e5).toISOString().slice(0, 10), items = [];
    CO.forEach(function (c) {
      var f = (c.filings || []).filter(function (x) { return /^(10-K|10-Q|20-F)$/.test(x.form) && x.filed >= lim; })[0]; if (!f) return;
      var q = c.quarters.find(function (z) { return z.end === f.report; }) || latest(c); if (!q) return;
      var i = c.quarters.indexOf(q), pq = c.quarters[i - 1], yq = c.quarters[i - 4], bits = [];
      if (q.ttm.capex_cash != null) bits.push(t('capex UDM ', 'TTM capex ') + H.money(q.ttm.capex_cash) + (yq && yq.ttm.capex_cash ? ' (' + (q.ttm.capex_cash > yq.ttm.capex_cash ? '+' : '') + pctS(q.ttm.capex_cash / yq.ttm.capex_cash - 1) + t(' a/a', ' y/y') + ')' : ''));
      if (q.ttm.capex_ocf != null || (q.ttm.ocf != null && q.ttm.ocf <= 0)) bits.push(t('capex/flujo ', 'capex/OCF ') + H.capexOcf(q.ttm.capex_ocf).replace(/<[^>]+>/g, '') + (pq && pq.ttm.capex_ocf != null && q.ttm.capex_ocf != null ? t(' (antes ', ' (was ') + H.capexOcf(pq.ttm.capex_ocf).replace(/<[^>]+>/g, '') + ')' : ''));
      if (q.m.rpo) { var pr = c.quarters.slice(0, i).filter(function (z) { return z.m.rpo; }).pop(); bits.push('RPO ' + H.money(q.m.rpo[0]) + (pr ? ' (' + (q.m.rpo[0] >= pr.m.rpo[0] ? '+' : '') + pctS(q.m.rpo[0] / pr.m.rpo[0] - 1) + t(' contra ', ' vs. ') + H.date(pr.end) + ')' : '')); }
      var ln = OB.items.filter(function (x) { return x.ticker === c.ticker && x.item === 'leases_not_commenced' && x.asOf === q.end && !x.subsequent && x.amountUSDm != null; })[0];
      if (ln) bits.push(t('arrendamientos firmados no iniciados ', 'leases signed, not commenced ') + bn(ln.amountUSDm));
      items.push({ d: f.filed, html: '<b>' + esc(c.name) + '</b> — ' + esc(f.form) + t(' del periodo al ', ' for the period to ') + H.date(f.report) + t(', presentado el ', ', filed ') + '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + H.date(f.filed) + '</a>: ' + bits.join('; ').replace(/\.$/, '') + '.' });
    });
    var rs = LOG.restated || [], since = rs.filter(function (r) { return r.filed >= lim; });
    var byT = {}; since.forEach(function (r) { byT[r.ticker] = (byT[r.ticker] || 0) + 1; });
    var rsLine = Object.keys(byT).length ? '<li class="muted">' + t('Reexpresiones (cifras de periodos anteriores que una presentación posterior cambió): ', 'Restatements (prior-period figures a later filing changed): ') + Object.keys(byT).map(function (k) { return esc((F.companies[k] || {}).name || k) + ' ' + byT[k]; }).join(', ') + t('. Se usa el valor más reciente; el detalle está en el registro técnico.', '. The latest value is used; the detail is in the technical log.') + '</li>' : '';
    set('changedList', items.sort(function (a, b) { return b.d.localeCompare(a.d); }).map(function (x) { return '<li>' + x.html + '</li>'; }).join('') + rsLine || '<li>' + t('Ninguna presentación periódica en los últimos 100 días.', 'No periodic filing in the last 100 days.') + '</li>');
    set('changedStamp', H.stamp({ tier: 'T1', sources: [{ label: 'SEC EDGAR', url: XBRL }], note: t('Variaciones: cálculo FNAM sobre cifras T1', 'Changes: FNAM calculation on T1 figures') }));
    // technical log
    set('logDesc', t('Cada actualización compara los valores nuevos con los anteriores y anota periodos nuevos, cifras revisadas y reexpresiones que la empresa hizo en una presentación posterior (el valor viejo y su presentación quedan registrados).', 'Each refresh diffs new values against the previous ones and records new periods, revised figures and restatements the company made in a later filing (the old value and its filing are kept).'));
    var KIND = { 'new': t('nuevo', 'new'), revised: t('revisado', 'revised'), removed: t('retirado', 'removed'), initial: t('carga inicial', 'initial load'), metric_added: t('métrica agregada', 'metric added') };
    var rows = (LOG.entries || []).slice(0, 40), rr = rs.slice(-15).reverse();
    set('logTbl', '<table><thead><tr><th class="l">' + t('Fecha (ET)', 'Date (ET)') + '</th><th class="l">' + t('Tipo', 'Kind') + '</th><th class="l">' + t('Cifra', 'Figure') + '</th><th>' + t('Antes', 'Before') + '</th><th>' + t('Ahora', 'Now') + '</th></tr></thead><tbody>' +
      rows.map(function (e) { return '<tr><td class="l">' + esc(H.etTime(e.at)) + '</td><td class="l">' + esc(KIND[e.kind] || e.kind) + '</td><td class="l">' + esc(e.id === '*' ? t(e.value + ' valores XBRL', e.value + ' XBRL values') : e.kind === 'metric_added' ? e.id.slice(2) + ' · ' + t(e.value + ' valores históricos', e.value + ' historical values') : e.id) + '</td><td>' + (e.old != null ? H.money(e.old) : '') + '</td><td>' + (e.kind === 'initial' || e.kind === 'metric_added' ? '' : e.value != null ? H.money(e.value) : '') + '</td></tr>'; }).join('') +
      (rr.length ? '<tr class="grp"><td colspan="5">' + t('Reexpresiones detectadas (presentación posterior con otro valor para el mismo periodo)', 'Restatements detected (later filing with a different value for the same period)') + '</td></tr>' + rr.map(function (r) { return '<tr><td class="l">' + esc(r.filed) + '</td><td class="l">' + t('reexpresado', 'restated') + '</td><td class="l">' + esc(r.ticker + ' · ' + r.tag + ' · ' + (r.start ? r.start + ' → ' : '') + r.end) + '</td><td>' + H.money(r.old) + '</td><td>' + H.money(r.value) + '</td></tr>'; }).join('') : '') + '</tbody></table>');
    set('logStamp', H.stamp({ csv: '/hiperescaladores/csv/changelog.csv' }));
  }

  // ---- C8. upcoming results (FactSet calendar snapshot) next to the expected filing date (SEC deadline)
  function calendar() {
    var CAL = PAY && PAY.calendar;
    var snapOld = CAL && (Date.parse(TODAY) - Date.parse(CAL.pulledAt)) / 864e5 > 45;
    set('calDesc', t('Fecha de resultados: instantánea de FactSet; una fecha «estimada» es la proyección de FactSet (a menudo de enero) y no está confirmada por la empresa: se reemplaza en cuanto la empresa la anuncia. Presentación esperada: plazo de la SEC para la categoría del emisor, contado desde el cierre del siguiente trimestre; después de ese día + 7 las cifras de la empresa se marcan «desactualizado» (cálculo en su navegador).', 'Results date: FactSet snapshot; an "estimated" date is FactSet\'s projection (often from January) and is not confirmed by the company: it is replaced as soon as the company announces it. Filing expected by: the SEC deadline for the filer category, counted from the next quarter-end; after that day + 7 the company\'s figures are marked "stale" (computed in your browser).') + (snapOld ? ' <b class="neg">' + t('La instantánea del calendario tiene más de 45 días.', 'The calendar snapshot is more than 45 days old.') + '</b>' : ''));
    function nextEv(tk) { return CAL ? CAL.events.filter(function (e) { return e.ticker === tk && e.date >= TODAY; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0] : null; }
    function lastEv(tk) { return CAL ? CAL.events.filter(function (e) { return e.ticker === tk && e.date < TODAY; }).sort(function (a, b) { return b.date.localeCompare(a.date); })[0] : null; }
    var rows = CO.slice().sort(function (a, b) { var x = nextEv(a.ticker), y = nextEv(b.ticker); return (x ? x.date : '9') .localeCompare(y ? y.date : '9'); });
    set('calTbl', '<table><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Próximos resultados', 'Next results') + '</th><th class="l">' + t('Periodo', 'Period') + '</th><th class="l">' + t('Presentación esperada a más tardar', 'Filing expected by') + '</th><th class="l">' + t('Último periodo en el centro', 'Latest period in the hub') + '</th><th class="l">' + t('Últimas presentaciones', 'Latest filings') + '</th></tr></thead><tbody>' +
      rows.map(function (c) {
        var e = nextEv(c.ticker), le = lastEv(c.ticker), s = H.stale(c);
        var ev = e ? '<b>' + H.date(e.date) + '</b> <span class="small ' + (e.status === 'confirmed' ? 'muted' : 'est') + '">' + (e.status === 'confirmed' ? t('confirmada por la empresa', 'confirmed by the company') : t('estimada por FactSet, no confirmada por la empresa', 'estimated by FactSet, not confirmed by the company')) + (e.time ? ' · ' + (e.time === 'after market' ? t('tras el cierre', 'after the close') : esc(e.time)) : '') + '</span><br><span class="small muted">' + (e.status === 'confirmed' ? '' : t('estimación modificada el ', 'estimate last modified ') + H.date(e.modified) + ' · ') + t('consulta del ', 'pulled ') + H.date(CAL.pulledAt) + '</span>' + H.src({ title: c.name + ' · ' + t('próximos resultados', 'next results'), rows: [[t('Nivel', 'Tier'), t('FactSet (instantánea fechada)', 'FactSet (dated snapshot)')], [t('Instantánea', 'Snapshot'), H.date(CAL.pulledAt)], [t('Estado', 'Status'), e.status === 'confirmed' ? t('confirmada por la empresa', 'confirmed by the company') : t('proyectada por FactSet', 'projected by FactSet')], [t('Modificado en FactSet', 'Modified in FactSet'), H.date(e.modified)]] }) : le ? '<span class="flag">' + t('pasó el ', 'passed ') + H.date(le.date) + t('; falta nueva instantánea', '; new snapshot needed') + '</span>' : H.nd(t('Sin fecha en la instantánea de FactSet', 'No date in the FactSet snapshot'));
        return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + ev + '</td><td class="l">' + (e ? esc(e.period) : '') + '</td><td class="l">' + H.date(c.nextFilingDue) + (s.stale ? H.flag('stale') : '') + '</td><td class="l">' + (c.latest ? H.fq(c.latest.id) + ' · ' + H.date(c.latest.end) : '') + '</td><td class="l small">' + (c.filings || []).filter(function (f) { return /^(10-K|10-Q|20-F)/.test(f.form); }).slice(0, 2).map(function (f) { return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.form) + ' ' + H.date(f.filed) + '</a>'; }).join(' · ') + '</td></tr>';
      }).join('') + '</tbody></table>');
    set('calStamp', H.stamp({ tier: 'FS', asOf: CAL ? H.date(CAL.pulledAt) : '', sources: [{ label: t('FactSet Calendar Events (resultados)', 'FactSet Calendar Events (results)') }, { label: 'SEC EDGAR submissions API', url: XBRL }], note: t('Nebius presenta 20-F anual y 6-K trimestral sin XBRL', 'Nebius files an annual 20-F and quarterly 6-Ks without XBRL') }));
  }

  // ---- C9. core six and listed neoclouds in separate tables (different risk profiles)
  function groupTable(list, id, isNeo) {
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Último periodo', 'Latest period') + '</th><th>' + t('Capex en efectivo UDM', 'Cash capex TTM') + '</th><th>' + t('Crec. a/a', 'Growth y/y') + '</th><th>' + t('Capex / flujo de op.', 'Capex / OCF') + '</th><th>' + (isNeo ? t('Mayor cliente', 'Largest customer') : t('Flujo libre UDM', 'Free cash flow TTM')) + '</th><th>' + t('DN ajust. / EBITDA', 'Lease-adj. ND / EBITDA') + '</th><th>RPO</th><th class="l">' + t('Estado', 'Status') + '</th></tr>';
    function row(c) {
      var q = latest(c); if (!q) return '';
      var i = c.quarters.indexOf(q), p = c.quarters[i - 4];
      var g = p && p.ttm.capex_cash ? q.ttm.capex_cash / p.ttm.capex_cash - 1 : null;
      if (c.ticker === 'NBIS') { var fy = c.fy, a = fy[fy.length - 1], b = fy[fy.length - 2]; if (a && b && a.m.capex_cash && b.m.capex_cash) g = a.m.capex_cash[0] / b.m.capex_cash[0] - 1; }
      var bq = lastWith(c, 'debt') || q, rq = lastWith(c, 'rpo'), s = H.stale(c), tc = isNeo ? topCustomer(c.ticker) : null;
      var col6 = isNeo ? (tc && tc.pct != null ? tc.pct + '%' + concSrc(tc.x) + '<br><span class="small muted">' + esc(tc.x['counterparty_' + H.lang] || tc.x.counterparty || '') + (tc.asOf ? ' · ' + H.date(tc.asOf) : '') + '</span>' : tc ? t('mayoría sustancial', 'substantial majority') + concSrc(tc.x) : '<span class="nd">' + t('sin cifra leída', 'no figure read') + '</span>') : H.money(q.ttm.fcf) + (q.ttm.fcf != null ? ttmSrc(c, q, 'ocf', t('flujo libre UDM = flujo de operación − capex en efectivo', 'FCF TTM = operating cash flow − cash capex')) : '');
      return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.fq(q.id) + ' · ' + H.date(q.end) + '</td><td>' + H.money(q.ttm.capex_cash) + (q.ttm.capex_cash != null ? ttmSrc(c, q, 'capex_cash', t('capex en efectivo UDM', 'cash capex TTM')) : '') + '</td><td>' + (g == null ? H.nm() : (g > 0 ? '+' : '') + H.num(g * 100, 0) + '%') + '</td><td>' + H.capexOcf(q.ttm.capex_ocf) + '</td><td>' + col6 + '</td><td>' + H.mult(bq.ttm && bq.ttm.land_ebitda, 1) + '</td><td>' + (rq && H.aged(rq.end) ? H.agedCell(H.money(rq.m.rpo[0]) + rpoSrc(c, rq), rq.end) : rq ? H.money(rq.m.rpo[0]) + rpoSrc(c, rq) + (rq.end < q.end ? '<br><span class="small muted">' + t('al ', 'at ') + H.date(rq.end) + '</span>' : '') : H.ntCell(c.ticker, 'rpo', { why: t('la empresa no etiqueta un RPO total', 'the company does not tag a total RPO') })) + '</td><td class="l">' + (s.stale ? H.flag('stale') : '<span class="flag ok">' + t('vigente', 'current') + '</span><br><span class="small muted">' + t('hasta ', 'until ') + H.date(s.limit) + '</span>') + '</td></tr>';
    }
    set(id, '<table><thead>' + head + '</thead><tbody>' + list.map(row).join('') + '</tbody></table>');
  }
  function groups() {
    var P = pace();
    set('coreH', '<span>' + t('Los Seis Principales: Invierten Desde el Flujo, Cada Vez Menos Holgado', 'The Core Six: Spending From Cash Flow, With Less and Less Room') + '</span>');
    if (!(P && P.r > 0.5)) set('coreH', '<span>' + t('Los Seis Principales', 'The Core Six') + '</span>');
    set('coreDesc', t('Microsoft, Alphabet, Amazon, Meta, Oracle y CoreWeave. Últimos doce meses al trimestre más reciente de cada empresa (cierres distintos). La deuda neta ajustada incluye los arrendamientos ya reconocidos, no los firmados que aún no inician.', 'Microsoft, Alphabet, Amazon, Meta, Oracle and CoreWeave. Trailing twelve months to each company\'s latest quarter (period ends differ). Lease-adjusted net debt includes leases already recognized, not those signed but not yet commenced.'));
    groupTable(CORE, 'coreTbl', false);
    set('coreStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Detalle y fuente de cada cifra en el módulo 3', 'Detail and source of every figure in module 3') }));
    set('neoH', '<span>' + t('Las Neonubes Listadas: Invierten Más que su Flujo y Dependen de Pocos Clientes', 'The Listed Neoclouds: Spending Beyond Cash Flow, Reliant on a Few Customers') + '</span>');
    var neoOver = NEO.filter(function (c) { return overOcf().indexOf(c) >= 0; }).length;
    if (neoOver < NEO.length / 2) set('neoH', '<span>' + t('Las Neonubes Listadas', 'The Listed Neoclouds') + '</span>');
    set('neoDesc', t('Nebius, IREN, Applied Digital y Core Scientific: más chicas, con capex varias veces su flujo, financiadas con deuda, convertibles y capital, y con ingresos concentrados. Por eso van en tabla aparte. ', 'Nebius, IREN, Applied Digital and Core Scientific: smaller, with capex several times their cash flow, funded with debt, convertibles and equity, and with concentrated revenue. That is why they have their own table. ') + t('Capex mayor que el flujo en ' + neoOver + ' de ' + NEO.length + '.', 'Capex above cash flow at ' + neoOver + ' of ' + NEO.length + '.'));
    groupTable(NEO, 'neoTbl', true);
    set('neoStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }, { label: t('10-K/10-Q (concentración)', '10-K/10-Q (concentration)') }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv' }));
  }

  // ---- capex / operating cash flow: bars with a 100% reference line
  function ocfChart() {
    var rows = CO.map(function (c) { var q = latest(c); return q && !H.aged(q.end) && q.ttm.capex_cash != null && q.ttm.ocf != null ? { c: c, q: q, r: q.ttm.ocf > 0 ? q.ttm.capex_cash / q.ttm.ocf : null } : null; }).filter(Boolean);
    var over = rows.filter(function (x) { return x.r == null || x.r > 1; });
    set('ocfH', '<span>' + t('El Capex Superó al Flujo de Operación en ' + over.length + ' de ' + rows.length + ' Empresas', 'Capex Exceeded Operating Cash Flow at ' + over.length + ' of ' + rows.length + ' Companies') + '</span>');
    set('ocfDesc', t('Capex en efectivo de los últimos doce meses como porcentaje del flujo de operación del mismo periodo. Arriba de la línea de 100%, la empresa gasta más de lo que genera su operación y financia la diferencia con deuda, arrendamientos, acciones o caja. Las razones mayores a 500% (flujo menor que la quinta parte del capex) se marcan n.s. y se cortan en el tope de la gráfica.', 'Trailing-twelve-month cash capex as a percentage of operating cash flow over the same period. Above the 100% line, the company spends more than its operations generate and funds the difference with debt, leases, equity or cash. Ratios above 500% (cash flow under a fifth of capex) are marked n.m. and cut at the top of the chart.'));
    set('ocfT', t('Capex / flujo de operación, UDM al trimestre más reciente de cada empresa', 'Capex / operating cash flow, TTM to each company\'s latest quarter'));
    set('ocfC', t('Barras: cada empresa. Línea discontinua: 100% (el capex iguala al flujo). Cierres distintos; fecha de cada barra en la ficha emergente.', 'Bars: each company. Dashed line: 100% (capex equals cash flow). Period ends differ; each bar\'s date is in its tooltip.'));
    var CAPV = 500;
    var refLine = { id: 'ref100', afterDatasetsDraw: function (ch) { var y = ch.scales.y, x = ch.scales.x, g = ch.ctx; if (!y) return; var py = y.getPixelForValue(100); g.save(); g.setLineDash([5, 4]); g.strokeStyle = H.css('--text-secondary'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x.left, py); g.lineTo(x.right, py); g.stroke(); g.setLineDash([]); g.fillStyle = H.css('--text-secondary'); g.font = '11px ' + (H.css('--sans') || 'sans-serif'); g.textAlign = 'right'; g.fillText('100%', x.right, py - 4); g.restore(); } };
    var nmLabel = { id: 'nmLabel', afterDatasetsDraw: function (ch) { var meta = ch.getDatasetMeta(0), g = ch.ctx; g.save(); g.fillStyle = H.css('--text-primary'); g.font = '600 11px ' + (H.css('--sans') || 'sans-serif'); g.textAlign = 'center'; meta.data.forEach(function (b, k) { var x = rows[k]; var lab = x.r == null || x.r > H.CO_MAX ? t('n.s.', 'n.m.') : H.num(x.r * 100, 0) + '%'; g.fillText(lab, b.x, b.y - 5); }); g.restore(); } };
    if (charts.ocf) charts.ocf.destroy();
    charts.ocf = new Chart($('chOCF'), { type: 'bar', data: { labels: rows.map(function (x) { return x.c.name; }), datasets: [{ data: rows.map(function (x) { return x.r == null || x.r > H.CO_MAX ? CAPV : x.r * 100; }), backgroundColor: rows.map(function (x) { return H.color(x.c.ticker); }), borderRadius: 3, maxBarThickness: 46 }] },
      options: { layout: { padding: { top: 18 } }, scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } }, y: { beginAtZero: true, max: CAPV, ticks: { callback: function (v) { return v + '%'; } } } },
        plugins: { tooltip: { callbacks: { label: function (ctx) { var x = rows[ctx.dataIndex]; return x.c.name + ': ' + (x.r == null ? t('flujo ≤ 0 (n.s.)', 'cash flow ≤ 0 (n.m.)') : x.r > H.CO_MAX ? H.num(x.r * 100, 0) + '% (' + t('n.s.', 'n.m.') + ')' : H.num(x.r * 100, 0) + '%') + ' · ' + H.fq(x.q.id) + ' · ' + H.date(x.q.end); } } } } }, plugins: [refLine, nmLabel] });
    set('ocfStamp', H.stamp({ tier: 'C', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Razón = capex en efectivo UDM ÷ flujo de operación UDM (cálculo FNAM sobre cifras T1)', 'Ratio = TTM cash capex ÷ TTM operating cash flow (FNAM calculation on T1 figures)') }));
  }

  function ttmTrend() {
    var P = pace();
    set('trendH', '<span>' + (P && P.g != null ? t('La Inversión Sigue Acelerándose: ' + (P.g > 0 ? '+' : '') + pctS(P.g) + ' en un Año', 'Investment Is Still Accelerating: ' + (P.g > 0 ? '+' : '') + pctS(P.g) + ' in a Year') : t('El Ritmo de la Inversión', 'The Pace of Investment')) + '</span>');
    if (P && P.g != null && P.g <= 0) set('trendH', '<span>' + t('La Inversión Se Frena: ' + pctS(P.g) + ' en un Año', 'Investment Is Slowing: ' + pctS(P.g) + ' in a Year') + '</span>');
    set('trendDesc', t('Capex en efectivo de los últimos doce meses, trimestre a trimestre, alineado al calendario: la pendiente muestra cuánto se acelera la inversión. Una línea por empresa; sin sumas entre empresas. El crecimiento del título es el de los seis principales juntos, misma ventana calendario.', 'Trailing-twelve-month cash capex, quarter by quarter, aligned to the calendar: the slope shows how fast investment is accelerating. One line per company; no cross-company sums. The growth in the title is the core six together, same calendar window.'));
    set('trendT', t('Capex en efectivo UDM, seis principales', 'Cash capex TTM, core six') + ' · US$ ' + t('miles de millones', 'billions'));
    set('trendC', t('Oracle (año a mayo): su trimestre a agosto se grafica en el trimestre calendario a septiembre.', 'Oracle (year to May): its quarter to August is plotted in the calendar quarter to September.'));
    var cqs = {}; CORE.forEach(function (c) { c.quarters.forEach(function (q) { if (q.ttm && q.ttm.capex_cash != null) cqs[q.cal] = 1; }); });
    var labels = Object.keys(cqs).sort().slice(-12);
    if (charts.ttm) charts.ttm.destroy();
    charts.ttm = new Chart($('chTTM'), { type: 'line', data: { labels: labels.map(H.cq), datasets: CORE.map(function (c) {
      return { label: c.name, data: labels.map(function (l) { var q = c.quarters.find(function (x) { return x.cal === l; }); return q && q.ttm.capex_cash != null ? q.ttm.capex_cash / 1e9 : null; }), borderColor: H.color(c.ticker), backgroundColor: H.css('--surface'), borderWidth: 2, pointRadius: 3, pointBackgroundColor: H.css('--surface'), pointBorderColor: H.color(c.ticker), spanGaps: false, tension: 0 };
    }) }, options: { interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: H.axisMoney }, beginAtZero: true } },
      plugins: { tooltip: { itemSort: function (a, b) { return (b.raw || 0) - (a.raw || 0); }, callbacks: { label: function (ctx) { return ctx.raw == null ? null : ctx.dataset.label + ': US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn'); } } } } } });
    set('trendLegend', CORE.map(function (c) { return '<span><i class="line" style="background:' + H.color(c.ticker) + '"></i>' + esc(c.name) + '</span>'; }).join(''));
    set('trendStamp', H.stamp({ tier: 'C', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('UDM = suma de cuatro trimestres T1 consecutivos (cálculo FNAM)', 'TTM = sum of four consecutive T1 quarters (FNAM calculation)') }));
  }

  function tiles() {
    var D = {
      capacidad: t('MW en operación con la definición de cada empresa; quién no divulga MW; estimaciones de terceros (T4) aparte.', 'Operating MW under each company\'s own definition; who discloses none; third-party estimates (T4) apart.'),
      comprometida: t('Contratada, en construcción y anunciada, con fecha objetivo; arrendamientos no iniciados como equivalente en dólares.', 'Contracted, under construction and announced, with target dates; leases not yet commenced as the dollar equivalent.'),
      capex: t('Capex, flujo libre, deuda emitida (monto, plazo, cupón), apalancamiento y cobertura; gráfica de capex/flujo.', 'Capex, free cash flow, debt issued (amount, tenor, coupon), leverage and coverage; capex/OCF chart.'),
      electricidad: t('Contratos de energía de las empresas; puente de GW a TWh (cálculo FNAM); proyecciones de la red (T3/T4) aparte.', 'Company power deals; GW-to-TWh bridge (FNAM calculation); grid projections (T3/T4) apart.'),
      sitios: t('Mapa y tabla de los campus que cada empresa nombra: localidad, MW, estado, fecha, cliente y energía.', 'Map and table of the campuses each company names: locality, MW, status, date, customer and power.'),
      'fuera-de-balance': t('Pila de obligaciones por empresa: deuda, arrendamientos (valor presente y sin descontar), no iniciados, garantías y deuda de coinversiones.', 'Obligation stack per company: debt, leases (present value and undiscounted), not commenced, guarantees and JV debt.'),
      circular: t('Los circuitos de dinero entre fabricantes de chips, nubes, laboratorios de IA y neonubes; inferencias de FNAM marcadas.', 'The money loops among chip makers, clouds, AI labs and neoclouds; FNAM inferences labeled.'),
      retorno: t('Ingresos y márgenes de las nubes, conversión de la cartera, depreciación y vidas útiles, calificaciones y diferenciales.', 'Cloud revenue and margins, backlog conversion, depreciation and useful lives, ratings and spreads.')
    };
    set('tiles', TILES().map(function (m) { return '<a class="tile" href="/hiperescaladores/' + m[0] + '/"><div class="k">' + t('Módulo ', 'Module ') + m[1] + '</div><h3>' + esc(m[2]) + '</h3><p>' + esc(D[m[0]]) + '</p></a>'; }).join('') +
      '<a class="tile" href="/hiperescaladores/metodologia/"><div class="k">' + t('Referencia', 'Reference') + '</div><h3>' + t('Metodología', 'Methodology') + '</h3><p>' + t('Niveles de fuente, reglas contables, trimestres, vigencia, validaciones y diferencias de alcance entre módulos.', 'Source tiers, accounting rules, quarters, staleness, validation and scope differences across modules.') + '</p></a>' +
      '<a class="tile" href="/hiperescaladores/glosario/"><div class="k">' + t('Referencia', 'Reference') + '</div><h3>' + t('Glosario', 'Glossary') + '</h3><p>' + t('RPO, ASC 842, ASC 810, EIV, SPV, MW de TI y los demás términos, en lenguaje llano.', 'RPO, ASC 842, ASC 810, VIE, SPV, IT MW and the other terms, in plain language.') + '</p></a>');
  }

  function foot() {
    set('foot', t('FNAM · Talipot Research & Analysis. Fuentes: SEC EDGAR, materiales de las empresas, FactSet (instantáneas fechadas), estimaciones de terceros (T4, siempre aparte). Cifras en dólares estadounidenses (miles de millones) y GW; marcas de tiempo en hora del Este de EE. UU. (ET). ', 'FNAM · Talipot Research & Analysis. Sources: SEC EDGAR, company materials, FactSet (dated snapshots), third-party estimates (T4, always apart). Figures in US dollars (billions) and GW; timestamps in US Eastern time (ET). ') + '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.'));
  }
  H.onLang(function () { header(); thesis(); whatToKnow(); paths(); heat(); changed(); calendar(); groups(); ocfChart(); ttmTrend(); tiles(); foot(); });
})();
