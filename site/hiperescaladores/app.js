// Hyperscaler Hub · summary page. Reads window.HYP_FIN, HYP_STATUS and HYP_LOG (written by the hub's build script) and
// HYP_CIRC, HYP_PAY (build-modules.mjs). Coverage: the five majors (owner, 2026-10-08). Every sentence with a figure — the thesis, "What to know", the
// heat map, "what changed" and the chart titles — is composed at page load from the same data as the modules: only T1
// figures (verified or quote-matched, under 12 months old) enter them; FNAM inferences are labeled; a line whose inputs
// are missing is dropped; nothing here is hand-written.
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, LOG = window.HYP_LOG || { entries: [] }, S = window.HYP_STATUS || {}, CIRC = window.HYP_CIRC, PAY = window.HYP_PAY;
  if (!F || !H) return;
  var t = H.t, esc = H.esc, $ = function (id) { return document.getElementById(id); }, set = function (id, h) { var e = $(id); if (e) e.innerHTML = h; };
  var CO = Object.values(F.companies);
  // tickers beside the hub title (owner, 2026-10-08), from the covered companies so they follow coverage
  (function () { var e = document.getElementById('hubTickers'); if (e && CO.length) e.textContent = '(' + CO.map(function (c) { return c.ticker; }).join(', ') + ')'; })();
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
    // a line tagged only in the 10-K (Oracle's preferred stock) carries the fiscal year as its twelve months when the quarter closes the year
    var fy = q.ttm && q.ttm._fromFY && q.ttm._fromFY.indexOf(k) >= 0;
    return H.src({ title: c.name + ' · ' + title, rows: [[t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL)', 'FNAM calculation on T1 figures (XBRL)')], [t('Método', 'Method'), fy ? t('año fiscal completo del 10-K (el periodo cierra el año)', 'full fiscal year from the 10-K (the period closes the year)') : t('suma de cuatro trimestres: ', 'sum of four quarters: ') + qs.map(function (z) { return H.fq(z.id); }).join(', ')], [t('Cierre', 'Period end'), H.date(q.end)], x ? [t('Etiqueta XBRL', 'XBRL tag'), x[1]] : null, x ? [t('Última presentación', 'Latest filing'), (x[2] || []).join(', ')] : null], url: x && x[2] ? H.edgar(c.cik, x[2][0]) : XBRL });
  }
  function rpoSrc(c, q) {
    var x = q.m.rpo;
    return H.src({ title: c.name + ' · RPO', rows: [[t('Nivel', 'Tier'), 'T1 · SEC (XBRL)'], [t('Al', 'At'), H.date(q.end)], [t('Etiqueta XBRL', 'XBRL tag'), x[1]], [t('Presentación', 'Filing'), (x[2] || []).join(', ')], c.ticker === 'MSFT' ? [t('Alcance', 'Scope'), t('Incluye contratos comerciales de software y nube, no solo infraestructura', 'Includes commercial software and cloud contracts, not only infrastructure')] : null], url: H.edgar(c.cik, x[2][0]) });
  }
  function itemSrc(c, i) { return H.src({ title: c.name + ' · ' + (i.filing.section || ''), rows: [[t('Nivel', 'Tier'), 'T1 · SEC'], [t('Base', 'Basis'), t('no descontado', 'undiscounted')], [t('Presentación', 'Filing'), i.filing.form + ' · ' + i.filing.accn + (i.filing.filed ? ' · ' + t('presentada ', 'filed ') + H.date(i.filing.filed) : '')], [t('Página', 'Page'), i.filing.page], [t('Al', 'At'), H.date(i.asOf)], [t('Texto', 'Text'), '“' + i.quote + '”'], [t('Cotejo', 'Check'), i.quoteCheck === 'page' ? t('cita cotejada contra el texto de la página', 'quote matched against the page text') : t('cita no cotejada', 'quote not matched')], [t('Verificación', 'Verification'), i.status === 'verified' ? t('verificado ', 'verified ') + H.date(i.verifiedOn) + ' · ' + H.VERIF[H.lang] : t('por revisar', 'needs review')]], url: i.filing.url }); }
  function payDueSrc(c, q) { var z = H.ntReason(c.ticker, 'fl_pay_due'); return H.src({ title: c.name + ' · ' + t('pagos de arrendamientos reconocidos, sin descontar', 'payments on recognized leases, undiscounted'), rows: [[t('Nivel', 'Tier'), 'T1 · SEC (XBRL)'], [t('Al', 'At'), H.date(q.end)], [t('Operativos', 'Operating'), plainMoney(q.m.ol_pay_due[0]) + ' · ' + q.m.ol_pay_due[1]], q.m.fl_pay_due ? [t('Financieros', 'Finance'), plainMoney(q.m.fl_pay_due[0]) + ' · ' + q.m.fl_pay_due[1]] : [t('Financieros', 'Finance'), t('ninguno: ', 'none: ') + (z ? (z['note_' + H.lang] || z.note_en) : '')], [t('Base', 'Basis'), t('total de la tabla de vencimientos antes de restar el interés implícito: misma base que lo firmado no iniciado', 'maturity-table total before subtracting imputed interest: same basis as the signed, not-yet-commenced amount')]], url: H.edgar(c.cik, q.m.ol_pay_due[2][0]) }); }

  // ---- shared computations (one place, used by the thesis, What to know, the heat map and the tables)
  function verified(i) { return i && i.status === 'verified' && !H.aged(i.asOf); }
  var OB = F.offbs || { items: [], searched: [] };
  // the verified item of that kind (the largest when a company reports several of the same kind)
  function obItem(tk, kind, pred) { return OB.items.filter(function (i) { return i.ticker === tk && i.item === kind && verified(i) && (!pred || pred(i)); }).sort(function (a, b) { return (b.amountUSDm || 0) - (a.amountUSDm || 0); })[0]; }
  function pace() {
    var X = H.calTTM(CO, 'capex_cash'), ocf = 0;
    if (!X) return null;
    X.rows.forEach(function (r) { ocf = ocf == null || r.q.ttm.ocf == null ? null : ocf + r.q.ttm.ocf; });
    return { X: X, ocf: ocf, r: ocf ? X.total / ocf : null, g: X.prev ? X.total / X.prev - 1 : null };
  }
  // capex above operating cash flow in the thesis window: the same calendarized rows (one calendar quarter for everyone) as
  // the group's capex / OCF, so one sentence states one window (owner, 2026-10-08). The 12-month rule is applied by calTTM.
  function overIn(X) { return X ? X.rows.filter(function (r) { var T = r.q.ttm; return T.capex_cash != null && T.ocf != null && (T.ocf <= 0 || T.capex_cash > T.ocf); }) : []; }
  // how a company that outspent its cash flow paid for it, in the same window: debt issued (gross proceeds) and stock issued
  // (common and preferred), as tagged in its cash-flow statement and summed over the same four quarters. A line the curated
  // gap file explains as "none" (Amazon issues no stock) is left out; a line not tagged in the window is named, never read
  // as zero. Repayments are stated beside the proceeds, not netted: the sentence says what was raised.
  function financing(r) {
    var c = r.c, q = r.q, T = q.ttm, out = { c: c, q: q, items: [], nt: [], repaid: T.debt_repaid != null ? T.debt_repaid : null };
    if (T.debt_proceeds > 0) out.items.push({ k: 'debt', v: T.debt_proceeds });
    var com = T.equity_proceeds > 0 ? T.equity_proceeds : 0, pf = T.pref_proceeds > 0 ? T.pref_proceeds : 0;
    if (com + pf > 0) out.items.push({ k: 'equity', v: com + pf, com: com, pf: pf });
    ['debt_proceeds', 'equity_proceeds', 'pref_proceeds'].forEach(function (k) { if (T[k] != null) return; var z = H.ntReason(c.ticker, k); if (!(z && z.result === 'none')) out.nt.push(k); });
    return out;
  }
  function finLabel(i) { return i.k === 'debt' ? t(' de deuda', ' of debt') : t(' de capital', ' of equity') + (i.com && i.pf ? t(' (acciones comunes y preferentes)', ' (common and preferred stock)') : i.pf ? t(' (acciones preferentes)', ' (preferred stock)') : t(' (acciones comunes)', ' (common stock)')); }
  function finNt(f) { return f.nt.length ? t(' (sin etiqueta en la ventana: ', ' (not tagged in the window: ') + f.nt.map(function (k) { return F.defs[k][H.lang].toLowerCase(); }).join(', ') + ')' : ''; }
  // plain text for the thesis (no ⓘ there; the cards sit in "What to know")
  function finText(f, first) {
    if (!f.items.length) return esc(f.c.name) + t(': sin emisión de deuda ni de capital etiquetada en la ventana', ': no debt or stock issuance tagged in the window') + finNt(f);
    return esc(f.c.name) + (first ? t(' emitió ', ' issued ') : ', ') + f.items.map(function (i) { return plainMoney(i.v) + finLabel(i); }).join(t(' y ', ' and ')) + finNt(f);
  }
  // the same facts with a source card on every figure, for the "What to know" detail
  function finDetail(f) {
    var c = f.c, q = f.q;
    var parts = f.items.map(function (i) {
      if (i.k === 'debt') return H.money(i.v) + ttmSrc(c, q, 'debt_proceeds', t('deuda emitida UDM (recursos brutos)', 'debt issued TTM (gross proceeds)')) + t(' de deuda', ' of debt');
      var sub = [i.com ? t('comunes ', 'common ') + H.money(i.com) + ttmSrc(c, q, 'equity_proceeds', t('acciones comunes emitidas UDM', 'common stock issued TTM')) : null, i.pf ? t('preferentes ', 'preferred ') + H.money(i.pf) + ttmSrc(c, q, 'pref_proceeds', t('acciones preferentes emitidas UDM', 'preferred stock issued TTM')) : null].filter(Boolean);
      return H.money(i.v) + t(' de capital (', ' of equity (') + sub.join(', ') + ')';
    });
    return '<b>' + esc(c.name) + '</b> ' + (parts.length ? t('emitió ', 'issued ') + parts.join(t(' y ', ' and ')) : t('no etiqueta emisión de deuda ni de capital en la ventana', 'tags no debt or stock issuance in the window')) + (f.repaid != null ? t(' y pagó ', ' and repaid ') + H.money(f.repaid) + ttmSrc(c, q, 'debt_repaid', t('deuda pagada UDM', 'debt repaid TTM')) + t(' de deuda', ' of debt') : '') + finNt(f);
  }
  // leases signed, not commenced (undiscounted) against the undiscounted payments of the leases already recognized, at the
  // same date: like for like. A company without both figures at the same date is left out.
  // a company whose curated gap record says it has no finance leases (result "none", assumeZero) compares its signed
  // leases with the operating-lease payments alone; the card says so
  function flZero(c) { var r = H.ntReason(c.ticker, 'fl_pay_due'); return !!(r && r.result === 'none' && r.assumeZero); }
  function leaseCompare() {
    return CO.map(function (c) {
      var i = obItem(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; });
      if (!i) return null;
      var z0 = flZero(c);
      var q = c.quarters.find(function (z) { return z.end === i.asOf && z.m.ol_pay_due && (z.m.fl_pay_due || z0); });
      return q ? { c: c, i: i, q: q, signed: i.amountUSDm * 1e6, rec: q.m.ol_pay_due[0] + (q.m.fl_pay_due ? q.m.fl_pay_due[0] : 0), flZero: z0 && !q.m.fl_pay_due } : null;
    }).filter(Boolean);
  }
  function leaseMissing() { return CO.filter(function (c) { return obItem(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; }) && !leaseCompare().some(function (x) { return x.c === c; }); }); }
  // a company name on the Circular diagram: a covered company by its record, a counterparty (CoreWeave, Nebius, IREN, Applied
  // Digital, Core Scientific: not covered since 2026-10-08) by the name its node carries
  function nodeName(id) { if (F.companies[id]) return F.companies[id].name; var n = CIRC && CIRC.nodes.filter(function (x) { return x.id === id; })[0]; return n ? (n['name_' + H.lang] || n.name || id) : id; }
  function isCounterparty(id) { var n = CIRC && CIRC.nodes.filter(function (x) { return x.id === id; })[0]; return !!(n && n.counterparty); }
  // the majors' capacity contracts at the counterparty neoclouds: T1 (the counterparty's own SEC filing), quote-matched, under 12
  // months, with an amount; the latest contract per pair. Each amount stays on its own basis (total value, "up to"): never summed.
  function counterpartyContracts() {
    if (!CIRC) return [];
    var by = {};
    CIRC.flows.forEach(function (f) { if (!(F.companies[f.from] && isCounterparty(f.to) && f.type === 'contract' && f.amountUSDm != null && f.src && f.src.tier === 'T1' && f.src.quoteCheck === 'page' && !H.aged(f.asOf))) return; var k = f.from + '>' + f.to; if (!by[k] || f.asOf > by[k].asOf) by[k] = f; });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.amountUSDm - a.amountUSDm; });
  }
  function basisText(b) { return b === 'tcv_upto' ? t('valor del contrato, «hasta»', 'contract value, "up to"') : b === 'tcv' ? t('valor total del contrato', 'total contract value') : (b || ''); }
  function flow(id) { var f = CIRC && CIRC.flows.filter(function (x) { return x.id === id; })[0]; return f && f.src && f.src.tier === 'T1' && f.src.quoteCheck === 'page' && !H.aged(f.asOf) ? f : null; }
  function flowSrc(f) { return H.cite(nodeName(f.from) + ' → ' + nodeName(f.to), f.src); }
  function segTTM(x) { var c = x.calc; if (!c) return { rev: x.revenue, oi: x.opIncome }; return { rev: c.fy.revenue - c.ytdPrev.revenue + c.ytd.revenue, oi: c.fy.opIncome != null ? c.fy.opIncome - c.ytdPrev.opIncome + c.ytd.opIncome : null }; }
  function segOk(x) { return x.status === 'verified' && x.src && x.src.quoteCheck === 'page' && !H.aged(x.end); }

  function header() {
    set('asofRow', '<span><b>' + t('Periodos más recientes', 'Latest periods') + '</b> ' + asOfRange + '</span>' + H.buildRow() + '<span><b>' + t('Cobertura', 'Coverage') + '</b> ' + t('5 empresas · 5 módulos', '5 companies · 5 modules') + '</span>');
    var st = CO.filter(function (c) { return H.stale(c).stale; });
    set('notices', (st.length ? '<div class="notice bad"><b>' + t('Desactualizado', 'Stale') + ':</b> ' + st.map(function (c) { return esc(c.name); }).join(', ') + ' — ' + t('pasó la fecha esperada de su siguiente presentación + 7 días; sus cifras no son las vigentes.', 'past its next expected filing date + 7 days; its figures are not current.') + '</div>' : '') + (S.edgarErrors && S.edgarErrors.length ? '<div class="notice warn">' + t('La última consulta a EDGAR falló para ', 'The last EDGAR poll failed for ') + S.edgarErrors.map(function (e) { return esc(e.ticker); }).join(', ') + t('; se muestran los valores almacenados.', '; stored values are shown.') + '</div>' : ''));
    var P = pace(), X = P && P.X, ocf = P && P.ocf;
    var win = X ? t('UDM al ', 'TTM to ') + H.cq(X.cal) + t(' calendario', ' (calendar)') : '';
    var capCard = X ? H.src({ title: t('Capex en efectivo UDM, cinco grandes', 'Cash capex TTM, five majors'), rows: [[t('Ventana', 'Window'), win + ' (' + H.date(X.calEnd) + ')']].concat(H.calRows(X)).concat([[t('Un año antes', 'A year earlier'), X.prev != null ? plainMoney(X.prev) : ''], [t('Nivel', 'Tier'), t('Cálculo FNAM sobre cifras T1 (XBRL 10-Q/10-K)', 'FNAM calculation on T1 figures (XBRL 10-Q/10-K)')]]), url: XBRL }) : '';
    var ocfCard = X && ocf ? H.src({ title: t('Capex / flujo de operación, cinco grandes', 'Capex / operating cash flow, five majors'), rows: [[t('Ventana', 'Window'), win]].concat(X.rows.map(function (r) { return [r.c.name, t('flujo de op. ', 'OCF ') + plainMoney(r.q.ttm.ocf) + ' · ' + H.fq(r.q.id)]; })).concat([[t('Regla', 'Rule'), t('n.s. si el flujo es ≤ 0 o menor que 1/5 del capex', 'n.m. when the flow is ≤ 0 or under 1/5 of capex')]]), url: XBRL }) : '';
    // backlog by company: the XBRL tag where the company uses it, else the figure read from the filing text (not-tagged.json,
    // result "text", quote matched on the cited page), so Amazon's US$496bn of commitments sits beside the tagged RPOs
    var rpoRows = CO.map(function (c) { var q = lastWith(c, 'rpo'); if (q && !H.aged(q.end)) return { c: c, q: q, v: q.m.rpo[0], end: q.end }; var r = H.ntReason(c.ticker, 'rpo'); return r && r.result === 'text' && r.amountUSDm != null && r.check === 'quote' && !H.aged(r.asOf) ? { c: c, r: r, v: r.amountUSDm * 1e6, end: r.asOf } : null; }).filter(Boolean).sort(function (a, b) { return b.v - a.v; });
    var rpoNo = CO.filter(function (c) { return !rpoRows.some(function (r) { return r.c === c; }); });
    var rpoList = '<span class="kpi-list">' + rpoRows.slice(0, 5).map(function (r) { return '<span>' + esc(r.c.name) + ' <b>' + H.money(r.v) + '</b>' + (r.q ? rpoSrc(r.c, r.q) : H.src({ title: r.c.name + ' · ' + t('compromisos no reconocidos (texto)', 'commitments not yet recognized (text)'), rows: [[t('Nivel', 'Tier'), 'T1 · SEC (' + t('texto de la presentación, sin etiqueta XBRL estándar', 'filing text, no standard XBRL tag') + ')'], [t('Al', 'At'), H.date(r.end)], [t('Motivo', 'Reason'), r.r['note_' + H.lang] || r.r.note_en]].concat(H.citeRows(r.r.src)), url: r.r.src && r.r.src.url })) + ' <span class="muted">' + H.date(r.end) + (r.r ? ' · ' + t('texto', 'text') : '') + '</span></span>'; }).join('') + '</span>';
    var iss = F.debt ? F.debt.deals.reduce(function (s, d) { return s + d.amount; }, 0) * 1e6 : null;
    var issCard = F.debt ? H.src({ title: t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), rows: [[t('Nivel', 'Tier'), t('FactSet (instantánea fechada; no es T1 hasta cotejarse con el 424B/8-K)', 'FactSet (dated snapshot; not T1 until matched to the 424B/8-K)')], [t('Instantánea', 'Snapshot'), H.date(F.debt.pulledAt)], [t('Operaciones', 'Deals'), String(F.debt.deals.length)], [t('Detalle', 'Detail'), t('módulo 3, sección de emisiones, con el cotejo de cada operación', 'module 3, issuance section, with each deal\'s match')]] }) : '';
    set('kpis', [
      [t('Capex en efectivo UDM, cinco grandes', 'Cash capex TTM, five majors'), H.money(X && X.total) + capCard, win + (X && X.prev ? ' · ' + t('vs. ', 'vs. ') + H.money(X.prev) + t(' un año antes (', ' a year earlier (') + (P.g > 0 ? '+' : '') + H.num(P.g * 100, 0) + '%). ' : '. ') + (X ? H.offsetNote(X) : '')],
      [t('Capex / flujo de operación', 'Capex / operating cash flow'), H.capexOcf(P && P.r) + ocfCard, t('Las cinco grandes, misma ventana. Lo que queda es el flujo libre antes de dividendos y recompras.', 'The five majors, same window. What is left is free cash flow before dividends and buybacks.')],
      [t('Cartera de contratos (RPO), por empresa', 'Contract backlog (RPO), by company'), rpoList, t('No se suman: un mismo cliente puede estar en la cartera de varias empresas. Demanda contratada, no capacidad. «Texto» = cifra leída de la nota de la presentación, sin etiqueta XBRL. ', 'Not added up: one customer can sit in several companies\' backlog. Contracted demand, not capacity. "Text" = figure read from the filing\'s note, no XBRL tag. ') + (rpoNo.length ? t('Sin cartera total revelada: ', 'No total backlog disclosed: ') + rpoNo.map(function (c) { return c.name; }).join(', ') + '.' : '')],
      [t('Deuda emitida desde ene-2025', 'Debt issued since Jan-2025'), H.money(iss) + issCard, H.tier('FS') + ' ' + t('Monto vigente, cinco empresas, instantánea al ', 'Amount outstanding, five companies, snapshot of ') + H.date(F.debt && F.debt.pulledAt)]
    ].map(function (k) { return '<div class="kpi"><div class="lbl">' + k[0] + '</div><div class="val">' + k[1] + '</div><div class="sub">' + k[2] + '</div></div>'; }).join(''));
  }

  // ---- B. the thesis: short sentences of 35 words or fewer (owner's fourth review) about the five majors (owner, 2026-10-08).
  // Sentence 1: the majors' capex / operating cash flow as the aggregate it is, then the companies that each spent more than
  // their own cash flow. Sentence 2: leases signed but not commenced against recognized lease payments, "about equal" within
  // ±5% of 1.0x. A clause whose inputs are missing is dropped.
  function stackCard(LC) {
    return H.src({ title: t('Arrendamientos firmados, aún no iniciados, frente a los ya reconocidos (sin descontar)', 'Leases signed but not commenced against those already recognized (undiscounted)'), rows: LC.map(function (x) { return [x.c.name, plainMoney(x.signed) + t(' firmados frente a ', ' signed vs. ') + plainMoney(x.rec) + t(' reconocidos (', ' recognized (') + H.num(x.signed / x.rec, 1) + 'x, ' + H.leaseCmpText(x.signed / x.rec) + ') · ' + H.date(x.i.asOf) + ' · ' + x.i.filing.form + ' p. ' + (x.i.filing.page || '') + (x.flZero ? ' · ' + t('sin arrendamientos financieros (pagos reconocidos = solo operativos)', 'no finance leases (recognized payments = operating only)') : '')]; }).concat([[t('Regla', 'Rule'), t('«casi iguales» = razón entre 0.95x y 1.05x; «superan» = más de 1.05x', '"about equal" = ratio between 0.95x and 1.05x; "exceed" = above 1.05x')], [t('Base', 'Basis'), t('pagos futuros sin descontar en ambos lados; lo firmado entra al balance cuando se entrega cada centro de datos y nunca se suma a la deuda. Son obligaciones futuras: no financian el capex de hoy.', 'future payments, undiscounted on both sides; signed leases enter the balance sheet as each data center is delivered and are never added to debt. They are future obligations: they do not fund today\'s capex.')], [t('Nivel', 'Tier'), 'T1 · SEC (' + t('notas de arrendamientos; tabla de vencimientos en XBRL', 'lease notes; maturity tables in XBRL') + ')']]), url: XBRL });
  }
  function names(L) { var n = L.map(function (c) { return c.name; }); return n.length > 1 ? n.slice(0, -1).join(', ') + t(' y ', ' and ') + n[n.length - 1] : (n[0] || ''); }
  // The thesis carries no ⓘ (owner, 2026-10-08): its figures open their source cards in "What to know" and in the KPI row
  // just below, and its source lines print in the page's last section, "Sources and methodology" (#thesisMeta, sources()).
  // Two short sentences, each with its module link.
  // Sentence 1: the ratio, then the companies above their own cash flow. Sentence 2 (owner, 2026-10-08): how those companies
  // financed the gap, from the same window's cash-flow statements (debt and stock issued; repayments in the source line).
  function thesis() {
    var P = pace(), LC = leaseCompare(), parts = [], meta = [], m3 = [];
    if (P && P.r != null && P.r <= H.CO_MAX && P.X.rows.length === CO.length) {
      var X = P.X, win = H.date(X.calEnd), overR = overIn(X), over = overR.map(function (r) { return r.c; }), fin = overR.map(financing);
      m3.push(t('Las cinco grandes destinaron ' + pctS(P.r) + ' de su flujo de operación conjunto a capex en los doce meses al ' + win, 'The five majors put ' + pctS(P.r) + ' of their combined operating cash flow into capex in the twelve months to ' + win) + '; ' + (over.length ? t(names(over) + (over.length > 1 ? ' gastaron' : ' gastó') + ' más que su propio flujo', names(over) + ' spent more than ' + (over.length > 1 ? 'their' : 'its') + ' own') : t('ninguna gastó más que su propio flujo', 'none spent more than its own')) + '.');
      if (fin.length) m3.push(t('Cómo se financió la diferencia, mismos doce meses: ', 'How the gap was financed, same twelve months: ') + fin.map(function (f, i) { return finText(f, i === 0); }).join('; ') + '.');
      meta.push(H.tier('C') + ' ' + t('capex y flujo: XBRL de 10-Q/10-K, UDM al ', 'capex and cash flow: 10-Q/10-K XBRL, TTM to ') + win + (X.offsets.length ? '; ' + H.offsetNote(X).replace(/\.$/, '') : ''));
      if (fin.length) meta.push(H.tier('T1') + ' ' + t('financiamiento: recursos brutos por emisión de deuda y de acciones (comunes y preferentes), líneas del estado de flujos etiquetadas en XBRL, misma ventana; pagos de deuda en esa ventana: ', 'financing: gross proceeds from debt and stock issued (common and preferred), cash-flow statement lines tagged in XBRL, same window; debt repaid in that window: ') + fin.map(function (f) { return f.c.name + ' ' + (f.repaid != null ? plainMoney(f.repaid) : t('sin etiqueta', 'not tagged')); }).join(', ') + t('; el detalle con fuentes está en «Lo que hay que saber», línea 1', '; the detail with sources is in "What to know", line 1'));
    }
    if (m3.length) parts.push(m3.join(' ') + ' ' + mod('capex', 1, t('Módulo 1', 'Module 1')));
    if (LC.length >= 2) {
      var ab = LC.filter(function (x) { return H.leaseCmp(x.signed / x.rec) === 'above'; }), eq = LC.filter(function (x) { return H.leaseCmp(x.signed / x.rec) === 'equal'; }), be = LC.filter(function (x) { return H.leaseCmp(x.signed / x.rec) === 'below'; });
      var tail = (eq.length ? '; ' + t('en ' + names(eq.map(function (x) { return x.c; })) + ' son casi iguales', names(eq.map(function (x) { return x.c; })) + '\'s are about equal') : '') + (be.length ? '; ' + t('en ' + names(be.map(function (x) { return x.c; })) + ' no alcanzan', names(be.map(function (x) { return x.c; })) + '\'s fall short') : '');
      parts.push(t('Los arrendamientos firmados sin iniciar superan los pagos de los ya reconocidos en ' + ab.length + ' de ' + LC.length + ' empresas comparables', 'Leases signed but not commenced exceed payments on recognized leases at ' + ab.length + ' of ' + LC.length + ' comparable companies') + tail + '. ' + mod('fuera-de-balance', 3, t('Módulo 3', 'Module 3')));
      meta.push(H.tier('T1') + ' ' + t('arrendamientos: notas de 10-K/10-Q/20-F y tabla de vencimientos (XBRL), al ', 'leases: 10-K/10-Q/20-F notes and maturity tables (XBRL), at ') + uniq(LC.map(function (x) { return H.date(x.i.asOf); })).join(', '));
    }
    var k = $('thesisMetaK'); if (k) k.hidden = !parts.length;
    if (!parts.length) { set('thesis', ''); set('thesisMeta', ''); return; }
    set('thesis', parts.map(function (x) { return '<span class="ts">' + x + '</span>'; }).join(' '));
    set('thesisMeta', meta.concat(['<b>' + t('Datos reconstruidos', 'Data rebuilt') + '</b> ' + esc(F.refreshedET)]).map(function (x) { return '<li>' + x + '</li>'; }).join(''));
  }

  // ---- What to know: four headline lines, each opening to its detail; every number T1 except the labeled inference
  function whatToKnow() {
    var L = [];
    function meta(src, asof, mods, tierK) { return '<span class="meta">' + H.tier(tierK || 'T1') + ' ' + esc(src) + ' · ' + t('al ', 'as of ') + asof + ' · ' + mods.map(function (m) { return '<a href="/hiperescaladores/' + m[0] + '/">' + t('Módulo ', 'Module ') + m[1] + ' →</a>'; }).join(' ') + '</span>'; }
    // 1. pace of capex (module 1)
    var P = pace();
    if (P && P.g != null && P.ocf && P.X.rows.length === CO.length) {
      var X = P.X, r = P.r, g = P.g, overR = overIn(X), fin = overR.map(financing);
      var capCardW = H.src({ title: t('Capex en efectivo UDM, cinco grandes', 'Cash capex TTM, five majors'), rows: [[t('Ventana', 'Window'), t('UDM al ', 'TTM to ') + H.cq(X.cal) + ' (' + H.date(X.calEnd) + ')']].concat(H.calRows(X)).concat([[t('Suma', 'Sum'), plainMoney(X.total)], [t('Un año antes', 'A year earlier'), X.prev != null ? plainMoney(X.prev) : ''], [t('Crecimiento', 'Growth'), (g > 0 ? '+' : '') + pctS(g) + t(' (cálculo FNAM)', ' (FNAM calculation)')]]), url: XBRL });
      var ocfCardW = H.src({ title: t('Capex / flujo de operación, cinco grandes', 'Capex / operating cash flow, five majors'), rows: X.rows.map(function (z) { return [z.c.name, t('flujo de op. ', 'OCF ') + plainMoney(z.q.ttm.ocf) + t(' · capex ', ' · capex ') + plainMoney(z.q.ttm.capex_cash) + ' · ' + H.fq(z.q.id)]; }).concat([[t('Razón', 'Ratio'), plainMoney(X.total) + ' / ' + plainMoney(P.ocf) + ' = ' + pctS(r) + t(' (cálculo FNAM)', ' (FNAM calculation)')]]), url: XBRL });
      L.push([(r > 0.75 && g > 0.25 ? t('La inversión crece ' + pctS(g), 'Spending grew ' + pctS(g)) + capCardW + t(' en un año y absorbe ' + pctS(r), ' in a year and absorbs ' + pctS(r)) + ocfCardW + t(' del flujo de operación.', ' of operating cash flow.') : t('La inversión absorbe ' + pctS(r), 'Spending absorbs ' + pctS(r)) + ocfCardW + t(' del flujo de operación.', ' of operating cash flow.')),
        t('Las cinco grandes gastaron ', 'The five majors spent ') + H.money(X.total) + H.src({ title: t('Capex UDM, cinco grandes', 'Capex TTM, five majors'), rows: H.calRows(X), url: XBRL }) + t(' en capex en efectivo en los doce meses al ', ' in cash capex in the twelve months to ') + H.date(X.calEnd) + t(', frente a ', ', against ') + H.money(X.prev) + t(' un año antes. ', ' a year earlier. ') + (r <= H.CO_MAX ? t('Equivale a ' + pctS(r) + ' de su flujo de operación. ', 'That is ' + pctS(r) + ' of their operating cash flow. ') : '') + (overR.length ? t('Por empresa, el capex superó al flujo en ', 'Company by company, capex exceeded cash flow at ') + overR.map(function (z) { return z.c.name; }).join(', ') + '. ' + t('Con qué se financió la diferencia, misma ventana (recursos brutos del estado de flujos): ', 'How the gap was financed, same window (gross proceeds in the cash-flow statement): ') + fin.map(finDetail).join('; ') + '. ' : t('Ninguna empresa gastó más que su propio flujo. ', 'No company spent more than its own cash flow. ')) + (X.offsets.length ? H.offsetNote(X) : '') +
        meta(t('XBRL de 10-Q/10-K (cálculo FNAM)', '10-Q/10-K XBRL (FNAM calculation)'), H.cq(X.cal), [['capex', 1]], 'C')]);
    }
    // 2. obligations not on the balance sheet, like for like (module 3): leases signed vs undiscounted recognized payments;
    //    risk ceilings (guarantees, backstops, residual value guarantees) listed beside, never added
    var LC = leaseCompare(), miss = leaseMissing();
    if (LC.length >= 2) {
      var above = LC.filter(function (x) { return H.leaseCmp(x.signed / x.rec) === 'above'; }), equal = LC.filter(function (x) { return H.leaseCmp(x.signed / x.rec) === 'equal'; });
      var ceil = [['GOOGL', 'backstop', function (i) { return i.basis === 'max_exposure'; }, t('derivados de crédito que respaldan arrendamientos de centros de datos', 'credit derivatives backing data-center leases')], ['GOOGL', 'guarantee', null, t('garantías a contrapartes de energía', 'guarantees to power counterparties')], ['META', 'rvg', null, t('garantías de valor residual', 'residual value guarantees')], ['ORCL', 'guarantee', null, t('garantía de la deuda de un arrendador', 'guarantee of a lessor\'s debt')]].map(function (k) { var i = obItem(k[0], k[1], k[2]); return i ? F.companies[k[0]].name + ' ' + bn(i.amountUSDm) + itemSrc(F.companies[k[0]], i) + ' (' + k[3] + ')' : null; }).filter(Boolean);
      L.push([t('Lo firmado y aún no iniciado supera lo ya reconocido en ' + above.length + ' de ' + LC.length, 'Leases signed but not yet started exceed those already on the balance sheet at ' + above.length + ' of ' + LC.length) + stackCard(LC) + t(' empresas, comparado sin descontar en ambos lados', ' companies, both sides undiscounted') + (equal.length ? t('; en ' + names(equal.map(function (x) { return x.c; })) + ' son casi iguales (' + equal.map(function (x) { return H.num(x.signed / x.rec, 1) + 'x'; }).join(', ') + ')', '; ' + names(equal.map(function (x) { return x.c; })) + '\'s are about equal (' + equal.map(function (x) { return H.num(x.signed / x.rec, 1) + 'x'; }).join(', ') + ')') : '') + '.',
        t('Arrendamientos firmados aún no iniciados frente a los pagos por vencer de los arrendamientos ya reconocidos (tabla de vencimientos, antes del interés implícito), a la misma fecha: ', 'Leases signed but not yet commenced against the payments due on leases already recognized (maturity table, before imputed interest), at the same date: ') + LC.sort(function (a, b) { return b.signed / b.rec - a.signed / a.rec; }).map(function (x) { return '<b>' + esc(x.c.name) + '</b> ' + H.money(x.signed) + itemSrc(x.c, x.i) + t(' frente a ', ' vs. ') + H.money(x.rec) + payDueSrc(x.c, x.q) + ' (' + H.num(x.signed / x.rec, 1) + 'x, ' + H.leaseCmpText(x.signed / x.rec) + ', ' + H.date(x.i.asOf) + ')' + H.oldFlag(x.i.asOf); }).join('; ') + '. ' + (miss.length ? t('Sin cifra comparable a la misma fecha (fuera de este conteo): ', 'No comparable figure at the same date (left out of the count): ') + miss.map(function (c) { return c.name; }).join(', ') + '. ' : '') + (ceil.length ? t('Además hay topes de riesgo que no son pasivos ni se suman: ', 'There are also risk ceilings that are not liabilities and are not added: ') + ceil.join('; ') + '. ' : '') + t('Lo firmado entra al balance cuando se entrega cada centro de datos; nunca se suma a la deuda.', 'The signed amounts enter the balance sheet as each data center is delivered; they are never added to debt.') +
        meta(t('notas de arrendamientos y garantías de 10-K/10-Q; tabla de vencimientos en XBRL', '10-K/10-Q lease and guarantee notes; maturity tables in XBRL'), uniq(LC.map(function (x) { return H.date(x.i.asOf); })).join(', '), [['fuera-de-balance', 3]])]);
    }
    // 3. the payoff (module 5): cloud segment margins and how much backlog lands within a year
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
          meta(t('notas de segmentos e ingresos de 10-K/10-Q (UDM: cálculo FNAM)', '10-K/10-Q segment and revenue notes (TTM: FNAM calculation)'), uniq(segs.map(function (s) { return H.date(s.x.end); })).join(', '), [['retorno', 5]])]);
      }
    }
    // 4. money that goes out and comes back (module 4) — an FNAM inference; its flows are T1 and are not netted. Beside it, the
    //    majors' capacity contracts at the counterparty neoclouds (cited from those companies' own filings): the largest two in
    //    the headline, every one in the detail, each on its own basis, never summed (owner, 2026-10-08)
    if (CIRC) {
      var ae = flow('amzn-openai-equity'), oa = flow('openai-amzn'), mr = flow('openai-msft-revenue'), me = flow('msft-openai-equity');
      var cps = counterpartyContracts(), top2 = cps.slice(0, 2);
      var one = function (f) { return esc(nodeName(f.from)) + ' ' + (f.basis === 'tcv_upto' ? t('hasta ', 'up to ') : '') + bn(f.amountUSDm) + flowSrc(f) + t(' en ', ' at ') + esc(nodeName(f.to)); };
      if (ae && oa && mr && me) L.push(['<span class="infer-tag">' + t('Inferencia FNAM', 'FNAM inference') + '</span>' + t('Los inversionistas de los laboratorios de IA también son sus proveedores de nube', 'The AI labs\' investors are also their cloud suppliers') + (top2.length ? t('; las grandes también compran capacidad a neonubes fuera de esta cobertura: ', '; the majors also buy capacity from neoclouds outside this coverage: ') + top2.map(one).join(', ') + '.' : '.'),
        t('La inferencia es una lectura de FNAM sobre flujos T1 que no son del mismo tipo y por eso no se restan: ', 'The inference is FNAM\'s reading of T1 flows that are not of the same kind and therefore are not netted: ') + '<b>Amazon</b> ' + t('invirtió ', 'invested ') + bn(ae.amountUSDm) + flowSrc(ae) + t(' en efectivo en OpenAI en el primer semestre de 2026 (flujo del periodo); OpenAI se comprometió a comprarle a AWS ', ' of cash in OpenAI in the first half of 2026 (a flow in the period); OpenAI committed to buy ') + bn(oa.amountUSDm) + flowSrc(oa) + t(' (valor de contrato a varios años' + (oa.termYears ? ', ' + oa.termYears + ' años' : '') + ', aún no ingreso). ', ' from AWS (multi-year contract value' + (oa.termYears ? ' over ' + oa.termYears + ' years' : '') + ', not yet revenue). ') + '<b>Microsoft</b> ' + t('registró ', 'recorded ') + bn(mr.amountUSDm) + flowSrc(mr) + t(' de ingresos de OpenAI en su año fiscal 2026 (ingreso de un año, incluye participación de ingresos); su compromiso acumulado de inversión en OpenAI es de ', ' of revenue from OpenAI in fiscal 2026 (one year of revenue, including revenue sharing); its cumulative funding commitment to OpenAI is ') + bn(me.amountUSDm) + flowSrc(me) + ' (' + t('saldo acumulado', 'a cumulative stock') + (me['note_' + H.lang] ? ': ' + esc(me['note_' + H.lang]) : '') + ')' + t('. Comparar un ingreso anual con un compromiso acumulado no mide un rendimiento. ', '. Comparing one year of revenue with a cumulative commitment does not measure a return. ') +
        (cps.length ? t('Contratos de capacidad de las grandes en neonubes fuera de la cobertura (CoreWeave, Nebius, IREN, Applied Digital y Core Scientific no son empresas cubiertas: aparecen solo como contrapartes, citadas de sus propias presentaciones ante la SEC; cada monto en su propia base, sin sumar): ', 'The majors\' capacity contracts at neoclouds outside the coverage (CoreWeave, Nebius, IREN, Applied Digital and Core Scientific are not covered companies: they appear only as counterparties, cited from their own SEC filings; each amount on its own basis, never summed): ') + cps.map(function (f) { return '<b>' + esc(nodeName(f.from)) + '</b> → ' + esc(nodeName(f.to)) + ' ' + (f.basis === 'tcv_upto' ? t('hasta ', 'up to ') : '') + bn(f.amountUSDm) + flowSrc(f) + ' (' + basisText(f.basis) + ', ' + H.date(f.asOf) + ')'; }).join('; ') + '.' : '') +
        meta(t('10-Q de Amazon, 10-K de Microsoft; presentaciones de las contrapartes · lectura: FNAM', 'Amazon 10-Q, Microsoft 10-K; the counterparties\' filings · reading: FNAM'), H.date(ae.asOf), [['circular', 4]])]);
    }
    set('wtk', L.length ? '<h2>' + t('Lo que hay que saber', 'What to Know') + '</h2>' + L.slice(0, 4).map(function (x, i) { return '<details><summary><span class="num-i">' + (i + 1) + '</span><span>' + x[0] + '</span></summary><div class="det">' + x[1] + '</div></details>'; }).join('') + '<div class="stamp"><span>' + t('Cifras T1 (presentaciones ante la SEC), verificadas o con su cita cotejada, de menos de 12 meses; la línea marcada «Inferencia FNAM» es una lectura de FNAM. ⓘ abre la página citada. Se redacta al cargar la página con los mismos datos de los módulos.', 'T1 figures (SEC filings), verified or quote-matched, under 12 months old; the line marked "FNAM inference" is FNAM\'s reading. ⓘ opens the cited page. Written at page load from the same data as the modules.') + '</span><span><b>' + t('Datos reconstruidos', 'Data rebuilt') + '</b> ' + esc(F.refreshedET) + '</span></div>' : '');
  }

  // ---- reading paths: the 3-minute path and the deep dive
  var TILES = function () {
    return [
      ['capex', 1, t('Cuánto se invierte y cuánto cubre el flujo de operación', 'How much is spent, and how much cash flow covers')],
      ['electricidad', 2, t('La energía contratada consta sobre todo en comunicados, aparte de la red', 'Power deals sit mostly in press releases, apart from the grid')],
      ['fuera-de-balance', 3, t('Lo firmado que aún no está en el balance, con su base a la vista', 'What is signed but not yet on the balance sheet, basis in view')],
      ['circular', 4, t('Inversionistas que también son clientes: hechos e inferencia, aparte', 'Investors who are also customers: facts and inference, apart')],
      ['retorno', 5, t('Lo que rinde la inversión y cuánto cuesta el dinero', 'What the spending earns, and what the money costs')]
    ];
  };
  // the 3-minute path only (owner, 2026-10-08): the list of modules that sat beside it repeated "The five modules", now the
  // section right after the heat map
  function paths() {
    set('pathsBox', '<div class="path fast"><h3>' + t('Ruta de 3 minutos', '3-minute path') + '</h3><ol><li><a href="#thesis">' + t('La tesis', 'The thesis') + '</a> ' + t('y las cuatro líneas de «Lo que hay que saber» (arriba)', 'and the four "What to know" lines (above)') + '</li><li><a href="#heat">' + t('El mapa de calor', 'The heat map') + '</a>: ' + t('qué empresa enciende qué alerta', 'which company trips which alert') + '</li><li><a href="#changed">' + t('Qué cambió', 'What changed') + '</a> ' + t('en las últimas presentaciones', 'in the latest filings') + '</li><li><a href="#calendar">' + t('Próximos resultados', 'Upcoming results') + '</a></li></ol></div>');
  }

  // ---- B. heat map: company × metric, the value and its as-of date printed in every cell
  function heat() {
    var cols = [
      [t('Crecimiento del capex', 'Capex growth'), t('UDM frente al UDM de un año antes', 'TTM vs. the TTM a year earlier')],
      [t('Capex / flujo de operación', 'Capex / operating cash flow'), t('UDM; n.s. si el flujo ≤ 0 o < 1/5 del capex', 'TTM; n.m. if the flow ≤ 0 or < 1/5 of capex')],
      [t('Fuera de balance / reconocido', 'Off balance sheet / recognized'), t('arrend. no iniciados ÷ pagos de arrend. reconocidos, ambos sin descontar', 'leases not commenced ÷ recognized lease payments, both undiscounted')]
    ];
    set('heatH', '<span>' + t('Dónde Está la Presión, Empresa por Empresa', 'Where the Strain Is, Company by Company') + '</span>');
    set('heatDesc', H.heatLegend() + t('El valor y su fecha se imprimen en cada celda. Las celdas sin dato dicen por qué (sin cifra a la misma fecha, lectura pendiente). Nada se promedia entre columnas ni entre empresas.', 'The value and its date are printed in every cell. Cells without data say why (no figure at the same date, reading pending). Nothing is averaged across columns or companies.'));
    var LC = leaseCompare();
    function lvl(v, cuts) { var k = 0; while (k < cuts.length && v > cuts[k]) k++; return k / cuts.length; }
    function cell(html, level, asOf, src) { return '<td' + H.heat(level) + '>' + html + (src || '') + (asOf ? '<span class="hd">' + t('al ', 'at ') + asOf + '</span>' : '') + '</td>'; }
    function empty(why) { return '<td><span class="nd">' + why + '</span></td>'; }
    function row(c) {
      var q = latest(c); if (!q) return '';
      var i = c.quarters.indexOf(q), p = c.quarters[i - 4], g = p && p.ttm.capex_cash ? q.ttm.capex_cash / p.ttm.capex_cash - 1 : null;
      var gC = g == null ? empty(t('sin UDM de hace un año', 'no TTM a year earlier')) : cell((g > 0 ? '+' : '') + pctS(g), lvl(g, [0.25, 0.5, 1, 2]), H.date(q.end), ttmSrc(c, q, 'capex_cash', t('capex en efectivo UDM', 'cash capex TTM')));
      var r = q.ttm.capex_ocf, rC = q.ttm.ocf != null && q.ttm.ocf <= 0 ? cell(H.nm(), 1, H.date(q.end)) : r == null ? empty(H.nt()) : cell(H.capexOcf(r), r > H.CO_MAX ? 1 : lvl(r, [0.5, 0.75, 1, 2]), H.date(q.end), ttmSrc(c, q, 'ocf', t('flujo de operación UDM', 'operating cash flow TTM')));
      var lc = LC.filter(function (x) { return x.c === c; })[0];
      var hasLn = obItem(c.ticker, 'leases_not_commenced', function (z) { return !z.subsequent && z.amountUSDm != null; });
      var lcC = lc ? cell(H.num(lc.signed / lc.rec, 1) + 'x' + (H.leaseCmp(lc.signed / lc.rec) === 'equal' ? ' <span class="small">' + t('casi iguales', 'about equal') + '</span>' : ''), lvl(lc.signed / lc.rec, [1.05, 2, 3, 5]), H.date(lc.i.asOf) + H.oldFlag(lc.i.asOf), itemSrc(c, lc.i)) : hasLn ? empty(t('sin pagos sin descontar a la misma fecha', 'no undiscounted payments at the same date')) : OB.searched.some(function (x) { return x.ticker === c.ticker && x.item === 'leases_not_commenced' && x.result === 'none'; }) ? empty(t('ninguno (buscado)', 'none (searched)')) : empty(t('lectura pendiente', 'reading pending'));
      return '<tr><td class="l">' + coName(c) + '</td>' + gC + rC + lcC + '</tr>';
    }
    set('heatTbl', '<table class="heat"><thead><tr><th scope="col" class="l">' + t('Empresa', 'Company') + '</th>' + cols.map(function (k) { return '<th scope="col" data-short="' + esc(k[0]) + '">' + k[0] + '<br><span style="text-transform:none;font-weight:400;letter-spacing:0">' + k[1] + '</span></th>'; }).join('') + '</tr></thead><tbody>' + CO.map(row).join('') + '</tbody></table>');
    set('heatStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }, { label: t('notas de 10-K/10-Q', '10-K/10-Q notes') }], note: t('Cortes de color: crecimiento 25/50/100/200%; capex/flujo 50/75/100/200%; fuera de balance 1/2/3/5x. Razones y crecimientos: cálculo FNAM sobre cifras T1.', 'Color cuts: growth 25/50/100/200%; capex/OCF 50/75/100/200%; off balance sheet 1/2/3/5x. Ratios and growth: FNAM calculation on T1 figures.') }));
  }

  // ---- C7. what changed in the latest filings, in plain language (the technical diff log sits below it, folded)
  function changed() {
    set('changedDesc', t('Lo que trajo la presentación más reciente de cada empresa (últimos 100 días), en palabras. Debajo, plegado, el registro técnico de cada valor XBRL nuevo, revisado o reexpresado.', 'What each company\'s most recent filing brought (last 100 days), in words. Below, folded, the technical log of every new, revised or restated XBRL value.'));
    var lim = new Date(Date.now() - 100 * 864e5).toISOString().slice(0, 10), items = [];
    CO.forEach(function (c) {
      var f = (c.filings || []).filter(function (x) { return /^(10-K|10-Q)$/.test(x.form) && x.filed >= lim; })[0]; if (!f) return;
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
    set('logTbl', '<table><thead><tr><th scope="col" class="l">' + t('Fecha (ET)', 'Date (ET)') + '</th><th scope="col" class="l">' + t('Tipo', 'Kind') + '</th><th scope="col" class="l">' + t('Cifra', 'Figure') + '</th><th scope="col">' + t('Antes', 'Before') + '</th><th scope="col">' + t('Ahora', 'Now') + '</th></tr></thead><tbody>' +
      rows.map(function (e) { return '<tr><td class="l">' + esc(H.etTime(e.at)) + '</td><td class="l">' + esc(KIND[e.kind] || e.kind) + '</td><td class="l">' + esc(e.id === '*' ? t(e.value + ' valores XBRL', e.value + ' XBRL values') : e.kind === 'metric_added' ? e.id.slice(2) + ' · ' + t(e.value + ' valores históricos', e.value + ' historical values') : e.id) + '</td><td>' + (e.old != null ? H.money(e.old) : '') + '</td><td>' + (e.kind === 'initial' || e.kind === 'metric_added' ? '' : e.value != null ? H.money(e.value) : '') + '</td></tr>'; }).join('') +
      (rr.length ? '<tr class="grp"><td colspan="5">' + t('Reexpresiones detectadas (presentación posterior con otro valor para el mismo periodo)', 'Restatements detected (later filing with a different value for the same period)') + '</td></tr>' + rr.map(function (r) { return '<tr><td class="l">' + esc(r.filed) + '</td><td class="l">' + t('reexpresado', 'restated') + '</td><td class="l">' + esc(r.ticker + ' · ' + r.tag + ' · ' + (r.start ? r.start + ' → ' : '') + r.end) + '</td><td>' + H.money(r.old) + '</td><td>' + H.money(r.value) + '</td></tr>'; }).join('') : '') + '</tbody></table>');
    set('logStamp', H.stamp({ csv: '/hiperescaladores/csv/changelog.csv' }));
  }

  // ---- C8. upcoming results (FactSet calendar snapshot) next to the expected filing date (SEC deadline)
  function calendar() {
    var CAL = PAY && PAY.calendar;
    var snapOld = CAL && (Date.parse(TODAY) - Date.parse(CAL.pulledAt)) / 864e5 > 45;
    set('calDesc', t('Fecha de resultados: instantánea de FactSet; una fecha «estimada» es la proyección de FactSet y no está confirmada por la empresa (se reemplaza en cuanto la empresa la anuncia); se marca cuando cae después del plazo de la SEC para el mismo periodo o cuando FactSet no la ha tocado en más de seis meses. Plazo de la SEC: 40 días para el 10-Q y 60 para el 10-K de emisores grandes acelerados, 45 y 90 para no acelerados; un plazo en fin de semana o feriado pasa al siguiente día hábil. Después de ese día + 7 las cifras de la empresa se marcan «desactualizado» (cálculo en su navegador).', 'Results date: FactSet snapshot; an "estimated" date is FactSet\'s projection and is not confirmed by the company (it is replaced as soon as the company announces it); it is flagged when it falls after the SEC deadline for the same period or when FactSet has not touched it for more than six months. SEC deadline: 40 days for the 10-Q and 60 for the 10-K of large accelerated filers, 45 and 90 for non-accelerated filers; a deadline on a weekend or holiday rolls to the next business day. After that day + 7 the company\'s figures are marked "stale" (computed in your browser).') + (snapOld ? ' <b class="neg">' + t('La instantánea del calendario tiene más de 45 días.', 'The calendar snapshot is more than 45 days old.') + '</b>' : ''));
    function nextEv(tk) { return CAL ? CAL.events.filter(function (e) { return e.ticker === tk && e.date >= TODAY; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0] : null; }
    function lastEv(tk) { return CAL ? CAL.events.filter(function (e) { return e.ticker === tk && e.date < TODAY; }).sort(function (a, b) { return b.date.localeCompare(a.date); })[0] : null; }
    var rows = CO.slice().sort(function (a, b) { var x = nextEv(a.ticker), y = nextEv(b.ticker); return (x ? x.date : '9') .localeCompare(y ? y.date : '9'); });
    var FORM = { '10-Q': t('informe trimestral (10-Q)', 'quarterly report (10-Q)'), '10-K': t('informe anual (10-K)', 'annual report (10-K)') };
    set('calTbl', '<table><thead><tr><th scope="col" class="l">' + t('Empresa', 'Company') + '</th><th scope="col" class="l">' + t('Próximos resultados (FactSet)', 'Next results (FactSet)') + '</th><th scope="col" class="l">' + t('Periodo', 'Period') + '</th><th scope="col" class="l">' + t('Plazo de la SEC para la siguiente presentación', 'SEC deadline for the next filing') + '</th><th scope="col" class="l">' + t('Último periodo en el centro', 'Latest period in the hub') + '</th><th scope="col" class="l">' + t('Últimas presentaciones', 'Latest filings') + '</th></tr></thead><tbody>' +
      rows.map(function (c) {
        var e = nextEv(c.ticker), le = lastEv(c.ticker), s = H.stale(c);
        var modOld = e && e.status !== 'confirmed' && e.modified && (Date.parse(TODAY) - Date.parse(String(e.modified).slice(0, 10))) / 864e5 > 183;
        var afterDue = e && e.status !== 'confirmed' && c.nextFilingDue && e.date > c.nextFilingDue;
        var flags = (afterDue ? '<br><span class="flag">' + t('cae después del plazo de la SEC para el ' + c.nextFilingForm + ' (' + H.date(c.nextFilingDue) + ')', 'falls after the SEC deadline for the ' + c.nextFilingForm + ' (' + H.date(c.nextFilingDue) + ')') + '</span>' : '') + (modOld ? '<br><span class="flag">' + t('estimación sin tocar desde ', 'estimate untouched since ') + H.date(e.modified) + '</span>' : '');
        var ev = e ? '<b>' + H.date(e.date) + '</b> <span class="small ' + (e.status === 'confirmed' ? 'muted' : 'est') + '">' + (e.status === 'confirmed' ? t('confirmada por la empresa', 'confirmed by the company') : t('estimada por FactSet, no confirmada por la empresa', 'estimated by FactSet, not confirmed by the company')) + (e.time ? ' · ' + (e.time === 'after market' ? t('tras el cierre', 'after the close') : esc(e.time)) : '') + '</span>' + flags + '<br><span class="small muted">' + (e.status === 'confirmed' ? '' : t('estimación modificada el ', 'estimate last modified ') + H.date(e.modified) + ' · ') + t('consulta del ', 'pulled ') + H.date(CAL.pulledAt) + '</span>' + H.src({ title: c.name + ' · ' + t('próximos resultados', 'next results'), rows: [[t('Nivel', 'Tier'), t('FactSet (instantánea fechada)', 'FactSet (dated snapshot)')], [t('Instantánea', 'Snapshot'), H.etTime(CAL.pulledAt) || H.date(CAL.pulledAt)], [t('Estado', 'Status'), e.status === 'confirmed' ? t('confirmada por la empresa', 'confirmed by the company') : t('proyectada por FactSet', 'projected by FactSet')], [t('Modificado en FactSet', 'Modified in FactSet'), H.date(e.modified)], afterDue ? [t('Aviso', 'Flag'), t('la proyección cae después del plazo de la SEC para el ' + c.nextFilingForm + '; la empresa suele reportar antes de presentar', 'the projection falls after the SEC deadline for the ' + c.nextFilingForm + '; companies normally report before they file')] : null] }) : le ? '<span class="flag">' + t('pasó el ', 'passed ') + H.date(le.date) + t('; falta nueva instantánea', '; new snapshot needed') + '</span>' : H.nd(t('Sin fecha en la instantánea de FactSet', 'No date in the FactSet snapshot'));
        var due = c.nextFilingDue ? '<b>' + H.date(c.nextFilingDue) + '</b> <span class="small muted">' + (FORM[c.nextFilingForm] || c.nextFilingForm || '') + ' · ' + esc((c.filer && c.filer.label) || '') + (c.nextFilingDueRaw && c.nextFilingDueRaw !== c.nextFilingDue ? ' · ' + t('pasa de ', 'rolled from ') + H.date(c.nextFilingDueRaw) + t(' (fin de semana o feriado)', ' (weekend or holiday)') : '') + '</span>' + (s.stale ? H.flag('stale') : '') : '';
        return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + ev + '</td><td class="l">' + (e ? esc(e.period) : '') + '</td><td class="l">' + due + '</td><td class="l">' + (c.latest ? H.fq(c.latest.id) + ' · ' + H.date(c.latest.end) : '') + '</td><td class="l small">' + (c.filings || []).filter(function (f) { return /^(10-K|10-Q)/.test(f.form); }).slice(0, 2).map(function (f) { return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.form) + ' ' + H.date(f.filed) + '</a>'; }).join(' · ') + '</td></tr>';
      }).join('') + '</tbody></table>');
    set('calStamp', H.stamp({ tier: 'FS', asOf: CAL ? H.date(CAL.pulledAt) : '', sources: [{ label: t('FactSet Calendar Events (resultados)', 'FactSet Calendar Events (results)') }, { label: 'SEC EDGAR submissions API', url: XBRL }], note: t('Consulta a FactSet del ', 'FactSet pulled ') + (CAL ? H.etTime(CAL.pulledAt) : '') }));
  }

  // ---- C9. the five majors, one table (owner, 2026-10-08: the listed neoclouds left the coverage)
  function companyTable() {
    var head = '<tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Último periodo', 'Latest period') + '</th><th>' + t('Capex en efectivo UDM', 'Cash capex TTM') + '</th><th>' + t('Crec. a/a', 'Growth y/y') + '</th><th>' + t('Capex / flujo de op.', 'Capex / OCF') + '</th><th>' + t('Flujo libre UDM', 'Free cash flow TTM') + '</th><th>' + t('DN ajust. / EBITDA', 'Lease-adj. ND / EBITDA') + '</th><th>RPO</th><th class="l">' + t('Estado', 'Status') + '</th></tr>';
    function row(c) {
      var q = latest(c); if (!q) return '';
      var i = c.quarters.indexOf(q), p = c.quarters[i - 4];
      var g = p && p.ttm.capex_cash ? q.ttm.capex_cash / p.ttm.capex_cash - 1 : null;
      var bq = lastWith(c, 'debt') || q, rq = lastWith(c, 'rpo'), s = H.stale(c);
      var fcf = H.money(q.ttm.fcf) + (q.ttm.fcf != null ? ttmSrc(c, q, 'ocf', t('flujo libre UDM = flujo de operación − capex en efectivo', 'FCF TTM = operating cash flow − cash capex')) : '');
      return '<tr><td class="l">' + coName(c) + '</td><td class="l">' + H.fq(q.id) + ' · ' + H.date(q.end) + '</td><td>' + H.money(q.ttm.capex_cash) + (q.ttm.capex_cash != null ? ttmSrc(c, q, 'capex_cash', t('capex en efectivo UDM', 'cash capex TTM')) : '') + '</td><td>' + (g == null ? H.nm() : (g > 0 ? '+' : '') + H.num(g * 100, 0) + '%') + '</td><td>' + H.capexOcf(q.ttm.capex_ocf) + '</td><td>' + fcf + '</td><td>' + H.mult(bq.ttm && bq.ttm.land_ebitda, 1) + '</td><td>' + (rq && H.aged(rq.end) ? H.agedCell(H.money(rq.m.rpo[0]) + rpoSrc(c, rq), rq.end) : rq ? H.money(rq.m.rpo[0]) + rpoSrc(c, rq) + (rq.end < q.end ? '<br><span class="small muted">' + t('al ', 'at ') + H.date(rq.end) + '</span>' : '') : H.ntCell(c.ticker, 'rpo', { why: t('la empresa no etiqueta un RPO total', 'the company does not tag a total RPO') })) + '</td><td class="l">' + (s.stale ? H.flag('stale') : '<span class="flag ok">' + t('vigente', 'current') + '</span><br><span class="small muted">' + t('hasta ', 'until ') + H.date(s.limit) + '</span>') + '</td></tr>';
    }
    set('cosTbl', '<table><thead>' + head + '</thead><tbody>' + CO.map(row).join('') + '</tbody></table>');
  }
  function groups() {
    var P = pace();
    set('cosH', '<span>' + t('Las Cinco Grandes: Invierten Desde el Flujo, Cada Vez Menos Holgado', 'The Five Majors: Spending From Cash Flow, With Less and Less Room') + '</span>');
    if (!(P && P.r > 0.5)) set('cosH', '<span>' + t('Las Cinco Grandes', 'The Five Majors') + '</span>');
    set('cosDesc', t('Microsoft, Alphabet, Amazon, Meta y Oracle. Últimos doce meses al trimestre más reciente de cada empresa (cierres distintos). La deuda neta ajustada incluye los arrendamientos ya reconocidos, no los firmados que aún no inician.', 'Microsoft, Alphabet, Amazon, Meta and Oracle. Trailing twelve months to each company\'s latest quarter (period ends differ). Lease-adjusted net debt includes leases already recognized, not those signed but not yet commenced.'));
    companyTable();
    set('cosStamp', H.stamp({ tier: 'T1', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Detalle y fuente de cada cifra en el módulo 1', 'Detail and source of every figure in module 1') }));
  }

  // ---- capex / operating cash flow: bars with a 100% reference line
  function ocfChart() {
    var rows = CO.map(function (c) { var q = latest(c); return q && !H.aged(q.end) && q.ttm.capex_cash != null && q.ttm.ocf != null ? { c: c, q: q, r: q.ttm.ocf > 0 ? q.ttm.capex_cash / q.ttm.ocf : null } : null; }).filter(Boolean);
    var over = rows.filter(function (x) { return x.r == null || x.r > 1; });
    set('ocfH', '<span>' + t('El Capex Superó al Flujo de Operación en ' + over.length + ' de ' + rows.length + ' Empresas', 'Capex Exceeded Operating Cash Flow at ' + over.length + ' of ' + rows.length + ' Companies') + '</span>');
    set('ocfDesc', t('Capex en efectivo de los últimos doce meses como porcentaje del flujo de operación del mismo periodo. Arriba de la línea de 100%, la empresa gasta más de lo que genera su operación y financia la diferencia con deuda, arrendamientos, acciones o caja. Las razones mayores a 500% (flujo menor que la quinta parte del capex) se marcan n.s. y se cortan en el tope de la gráfica.', 'Trailing-twelve-month cash capex as a percentage of operating cash flow over the same period. Above the 100% line, the company spends more than its operations generate and funds the difference with debt, leases, equity or cash. Ratios above 500% (cash flow under a fifth of capex) are marked n.m. and cut at the top of the chart.'));
    set('ocfT', t('Capex / flujo de operación, UDM al trimestre más reciente de cada empresa', 'Capex / operating cash flow, TTM to each company\'s latest quarter'));
    set('ocfC', t('Barras: cada empresa. Línea discontinua: 100% (el capex iguala al flujo). Cierres distintos; fecha de cada barra en la ficha emergente.', 'Bars: each company. Dashed line: 100% (capex equals cash flow). Period ends differ; each bar\'s date is in its tooltip.'));
    var CAPV = 500, horiz = H.narrow();   // phones: horizontal bars, company names on the left, never rotated
    var refLine = { id: 'ref100', afterDatasetsDraw: function (ch) { var y = ch.scales.y, x = ch.scales.x, g = ch.ctx; if (!y) return; g.save(); g.setLineDash([5, 4]); g.strokeStyle = H.css('--text-secondary'); g.lineWidth = 1.5; g.fillStyle = H.css('--text-secondary'); g.font = '11px ' + (H.css('--sans') || 'sans-serif'); g.beginPath(); if (horiz) { var px = x.getPixelForValue(100); g.moveTo(px, y.top); g.lineTo(px, y.bottom); g.stroke(); g.setLineDash([]); g.textAlign = 'left'; g.fillText('100%', px + 3, y.top + 10); } else { var py = y.getPixelForValue(100); g.moveTo(x.left, py); g.lineTo(x.right, py); g.stroke(); g.setLineDash([]); g.textAlign = 'right'; g.fillText('100%', x.right, py - 4); } g.restore(); } };
    var nmLabel = { id: 'nmLabel', afterDatasetsDraw: function (ch) { var meta = ch.getDatasetMeta(0), g = ch.ctx; g.save(); g.fillStyle = H.css('--text-primary'); g.font = '600 11px ' + (H.css('--sans') || 'sans-serif'); meta.data.forEach(function (b, k) { var x = rows[k]; var lab = x.r == null || x.r > H.CO_MAX ? t('n.s.', 'n.m.') : H.num(x.r * 100, 0) + '%'; if (horiz) { g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(lab, Math.min(b.x + 4, ch.chartArea.right - 28), b.y); } else { g.textAlign = 'center'; g.fillText(lab, b.x, b.y - 5); } }); g.restore(); } };
    if (charts.ocf) charts.ocf.destroy();
    var vAxis = { beginAtZero: true, max: CAPV, ticks: { callback: function (v) { return v + '%'; } } }, cAxis = { grid: { display: false }, ticks: { autoSkip: false, maxRotation: horiz ? 0 : 45, minRotation: 0, font: { size: 11 } } };
    charts.ocf = new Chart($('chOCF'), { type: 'bar', data: { labels: rows.map(function (x) { return x.c.name; }), datasets: [{ data: rows.map(function (x) { return x.r == null || x.r > H.CO_MAX ? CAPV : x.r * 100; }), backgroundColor: rows.map(function (x) { return H.color(x.c.ticker); }), borderRadius: 3, maxBarThickness: horiz ? 22 : 46 }] },
      options: { indexAxis: horiz ? 'y' : 'x', layout: { padding: horiz ? { right: 30 } : { top: 18 } }, scales: horiz ? { x: vAxis, y: cAxis } : { x: cAxis, y: vAxis },
        plugins: { tooltip: { callbacks: { label: function (ctx) { var x = rows[ctx.dataIndex]; return x.c.name + ': ' + (x.r == null ? t('flujo ≤ 0 (n.s.)', 'cash flow ≤ 0 (n.m.)') : x.r > H.CO_MAX ? H.num(x.r * 100, 0) + '% (' + t('n.s.', 'n.m.') + ')' : H.num(x.r * 100, 0) + '%') + ' · ' + H.fq(x.q.id) + ' · ' + H.date(x.q.end); } } } } }, plugins: [refLine, nmLabel] });
    set('ocfStamp', H.stamp({ tier: 'C', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('Razón = capex en efectivo UDM ÷ flujo de operación UDM (cálculo FNAM sobre cifras T1)', 'Ratio = TTM cash capex ÷ TTM operating cash flow (FNAM calculation on T1 figures)') }));
  }

  function ttmTrend() {
    var P = pace();
    set('trendH', '<span>' + (P && P.g != null ? t('La Inversión Sigue Acelerándose: ' + (P.g > 0 ? '+' : '') + pctS(P.g) + ' en un Año', 'Investment Is Still Accelerating: ' + (P.g > 0 ? '+' : '') + pctS(P.g) + ' in a Year') : t('El Ritmo de la Inversión', 'The Pace of Investment')) + '</span>');
    if (P && P.g != null && P.g <= 0) set('trendH', '<span>' + t('La Inversión Se Frena: ' + pctS(P.g) + ' en un Año', 'Investment Is Slowing: ' + pctS(P.g) + ' in a Year') + '</span>');
    set('trendDesc', t('Capex en efectivo de los últimos doce meses, trimestre a trimestre, alineado al calendario: la pendiente muestra cuánto se acelera la inversión. Una línea por empresa; sin sumas entre empresas. El crecimiento del título es el de las cinco grandes juntas, misma ventana calendario.', 'Trailing-twelve-month cash capex, quarter by quarter, aligned to the calendar: the slope shows how fast investment is accelerating. One line per company; no cross-company sums. The growth in the title is the five majors together, same calendar window.'));
    set('trendT', t('Capex en efectivo UDM, cinco grandes', 'Cash capex TTM, five majors') + ' · US$ ' + t('miles de millones', 'billions'));
    set('trendC', t('Oracle (año a mayo): su trimestre a agosto se grafica en el trimestre calendario a septiembre.', 'Oracle (year to May): its quarter to August is plotted in the calendar quarter to September.'));
    var cqs = {}; CO.forEach(function (c) { c.quarters.forEach(function (q) { if (q.ttm && q.ttm.capex_cash != null) cqs[q.cal] = 1; }); });
    var labels = Object.keys(cqs).sort().slice(-12);
    if (charts.ttm) charts.ttm.destroy();
    charts.ttm = new Chart($('chTTM'), { type: 'line', data: { labels: labels.map(H.cq), datasets: CO.map(function (c) {
      return { label: c.name, data: labels.map(function (l) { var q = c.quarters.find(function (x) { return x.cal === l; }); return q && q.ttm.capex_cash != null ? q.ttm.capex_cash / 1e9 : null; }), borderColor: H.color(c.ticker), backgroundColor: H.css('--surface'), borderWidth: 2, pointRadius: 3, pointBackgroundColor: H.css('--surface'), pointBorderColor: H.color(c.ticker), spanGaps: false, tension: 0 };
    }) }, options: { interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: H.axisMoney }, beginAtZero: true } },
      plugins: { tooltip: { itemSort: function (a, b) { return (b.raw || 0) - (a.raw || 0); }, callbacks: { label: function (ctx) { return ctx.raw == null ? null : ctx.dataset.label + ': US$ ' + H.num(ctx.raw, 1) + (H.lang === 'es' ? ' mil M' : ' bn'); } } } } } });
    set('trendLegend', CO.map(function (c) { return '<span><i class="line" style="background:' + H.color(c.ticker) + '"></i>' + esc(c.name) + '</span>'; }).join(''));
    set('trendStamp', H.stamp({ tier: 'C', asOf: asOfRange, sources: [{ label: 'SEC EDGAR XBRL companyfacts', url: XBRL }], csv: '/hiperescaladores/csv/capex-financing-quarterly.csv', note: t('UDM = suma de cuatro trimestres T1 consecutivos (cálculo FNAM)', 'TTM = sum of four consecutive T1 quarters (FNAM calculation)') }));
  }

  function tiles() {
    var D = {
      capex: t('Capex, flujo libre, deuda emitida (monto, plazo, cupón), apalancamiento y cobertura; gráfica de capex/flujo.', 'Capex, free cash flow, debt issued (amount, tenor, coupon), leverage and coverage; capex/OCF chart.'),
      electricidad: t('Contratos de energía de las empresas, con su presentación o anuncio; proyecciones de la red (T3/T4) aparte.', 'Company power deals, with their filing or announcement; grid projections (T3/T4) apart.'),
      'fuera-de-balance': t('Pila de obligaciones por empresa: deuda, arrendamientos (valor presente y sin descontar), no iniciados, garantías y deuda de coinversiones.', 'Obligation stack per company: debt, leases (present value and undiscounted), not commenced, guarantees and JV debt.'),
      circular: t('Los circuitos de dinero entre las nubes, los fabricantes de chips, los laboratorios de IA y las neonubes contraparte; inferencias de FNAM marcadas.', 'The money loops among the clouds, chip makers, AI labs and the counterparty neoclouds; FNAM inferences labeled.'),
      retorno: t('Ingresos y márgenes de las nubes, conversión de la cartera, depreciación y vidas útiles, calificaciones y diferenciales.', 'Cloud revenue and margins, backlog conversion, depreciation and useful lives, ratings and spreads.')
    };
    set('tiles', TILES().map(function (m) { return '<a class="tile" href="/hiperescaladores/' + m[0] + '/"><div class="k">' + t('Módulo ', 'Module ') + m[1] + '</div><h3>' + esc(m[2]) + '</h3><p>' + esc(D[m[0]]) + '</p></a>'; }).join('') +
      '<a class="tile" href="/hiperescaladores/metodologia/"><div class="k">' + t('Referencia', 'Reference') + '</div><h3>' + t('Metodología', 'Methodology') + '</h3><p>' + t('Niveles de fuente, reglas contables, trimestres, vigencia, validaciones y bases distintas entre módulos.', 'Source tiers, accounting rules, quarters, staleness, validation and the bases that differ across modules.') + '</p></a>' +
      '<a class="tile" href="/hiperescaladores/glosario/"><div class="k">' + t('Referencia', 'Reference') + '</div><h3>' + t('Glosario', 'Glossary') + '</h3><p>' + t('RPO, ASC 842, ASC 810, EIV, SPV, neonube y los demás términos, en lenguaje llano.', 'RPO, ASC 842, ASC 810, VIE, SPV, neocloud and the other terms, in plain language.') + '</p></a>');
  }

  // last section, "Sources and methodology" (owner, 2026-10-08): coverage (static text), the sources line that used to open
  // the footer, the thesis' source lines (written by thesis()) and the hub data-quality roll-up, which left the header
  function sources() {
    var links = '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a>';
    set('srcNote', t('SEC EDGAR, materiales de las empresas, FactSet (instantáneas fechadas), estimaciones de terceros (T4, siempre aparte). Cifras en dólares estadounidenses (miles de millones) y GW; marcas de tiempo en hora del Este de EE. UU. (ET).', 'SEC EDGAR, company materials, FactSet (dated snapshots), third-party estimates (T4, always apart). Figures in US dollars (billions) and GW; timestamps in US Eastern time (ET).'));
    H.dqRollup('dqRoll', { noLabel: true });
    set('srcMore', t('Reglas completas: ', 'Full rules: ') + links);
  }
  function foot() {
    set('foot', 'FNAM. <a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · <a href="/hiperescaladores/glosario/">' + t('Glosario', 'Glossary') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.'));
  }
  H.onLang(function () { header(); thesis(); whatToKnow(); paths(); heat(); changed(); calendar(); groups(); ocfChart(); ttmTrend(); tiles(); sources(); foot(); });
})();
