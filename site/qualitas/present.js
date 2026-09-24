/* Board presentation for fnam.mx/qualitas: one click builds a Letter PDF from the same data the page renders.
   Every figure comes from window.Q_MODEL (app.js), i.e. the calculations already on screen; the prose of sections
   09 (VAT) and 10 (international) is read from the page itself and trimmed to bullets. The generic engine (pages,
   tables, charts, cover, footers) lives in /assets/present-core.js. Language follows the page toggle. */
(function () {
  'use strict';
  const P = window.FNAM_PRESENT;
  const { tx } = P;
  const { INK, MUTED, ACCENT, GRID, HEAD, PALETTE } = P.C;
  const RED = '#c0392b';

  async function build() {
    const M = window.Q_MODEL;
    await P.run(M, [], async () => {
      const doc = new QualitasDoc(M);
      doc.cover(); doc.execSummary(); doc.tearSheet(); doc.opsPage(); doc.incomePage('q'); doc.incomePage('ltm'); doc.incomePage('fy');
      doc.guidancePage(); doc.driversPage(); doc.combinedPage(); doc.capitalPage(); doc.dividendPage(); doc.vatPage(); doc.intlPage(); doc.sourcesPage();
      doc.finish();
    });
  }

  class QualitasDoc extends P.Doc {
    constructor(M) {
      const co = M.REF.company || {};
      super(M, { slug: 'qualitas', short: co.short || 'Quálitas', name: co.name || 'Quálitas Controladora, S.A.B. de C.V.', tickerLine: `BMV: ${co.bmv || 'Q'}`, url: 'fnam.mx/qualitas', fileStem: `Qualitas_${co.bmv || 'Q'}`, publicSources: 'BMV, CNSF, informes y reportes SIFIC de la empresa', publicSourcesEn: 'BMV, CNSF, company reports and SIFIC filings' });
      this.next = this.nextResults();
    }
    // ----- shared pieces -----
    rel(q) { return q && q.sources && q.sources.is && q.sources.is.date; }
    sectionTitle(id, fallback) { const el = document.querySelector(`#${id} .sec-head h2 .${this.es ? 'es' : 'en'}`); return el ? el.textContent.trim() : fallback; }
    sectionProse(id) {
      return [...document.querySelectorAll(`#${id} .prose > p:not(.cap)`)].map((p) => { const span = p.querySelector(`.${this.es ? 'es' : 'en'}`); if (!span) return null; let out = ''; for (const n of span.childNodes) { const t = (n.textContent || '').replace(/\s+/g, ' '); out += n.nodeType === 1 && n.tagName === 'B' ? `**${t.trim()}** ` : t; } return out.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    }
    // Bullets that must fit in a box: shrink the font, then clip the text if it still does not fit.
    fitBullets(items, x, y, w, maxH, opts = {}) {
      for (let size = opts.max || 8.6; size >= (opts.min || 6.6); size -= 0.4) { if (this.measureBullets(items, w, size, { gap: 4 }) <= maxH) return this.bullets(items, x, y, w, size, { gap: 4 }); }
      let its = items.slice();
      while (its.length && this.measureBullets(its, w, opts.min || 6.6, { gap: 4 }) > maxH) { const last = its[its.length - 1]; const cut = last.replace(/\*\*/g, '').length > 160 ? last.slice(0, Math.floor(last.length * 0.8)).replace(/\s\S*$/, '') + '…' : null; if (cut && cut.split('**').length % 2 === 1) its[its.length - 1] = cut; else its.pop(); }
      return this.bullets(its, x, y, w, opts.min || 6.6, { gap: 4 });
    }
    basisLine() {
      const M = this.M, lastQ = M.lastQ;
      return this.T(`Base: informe del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · mercado al cierre del ${this.date(M.lastPx[0])}`, `Basis: ${this.qlab(lastQ)} report (${this.date(this.rel(lastQ))}) · market close ${this.date(M.lastPx[0])}`);
    }
    A(mode) { const M = this.M; if (mode === 'q') return M.quarterObj(M.lastQ); if (mode === 'fy') return M.fyObj(M.Y[M.Y.length - 1]); return M.ltmFor(M.lastQ); }
    B(mode) { const M = this.M; if (mode === 'q') { const b = M.qById[M.yoyQid(M.lastQ)]; return b && M.quarterObj(b); } if (mode === 'fy') return M.fyObj(M.Y[M.Y.length - 2]); const bq = M.qById[M.yoyQid(M.lastQ)]; return bq && M.ltmFor(bq); }
    // Two-axis bar + line chart with the line drawn in front (red, white-filled points).
    barLine(labels, bars, line, opts = {}) {
      const ds = bars.map((b, i) => ({ type: 'bar', label: b.label, data: b.data, backgroundColor: b.color || PALETTE[i], stack: b.stack, maxBarThickness: opts.thick || 34, yAxisID: 'y', order: 2 + i }));
      if (line) ds.unshift({ type: 'line', label: line.label, data: line.data, borderColor: RED, backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: RED, pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true });
      // bar charts default every linear axis to zero; the ratio axis must not, and only the bar datasets carry a stack id
      const scales = { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } };
      if (line) scales.y2 = { position: 'right', grid: { display: false }, beginAtZero: false, suggestedMin: opts.y2min, suggestedMax: opts.y2max, ticks: { callback: (v) => this.n(v, opts.y2dec || 0) + '%' } };
      return this.chart({ type: 'bar', data: { labels, datasets: ds }, options: { plugins: { legend: { display: opts.legend !== false } }, scales } }, Math.round(opts.w * 1.6), Math.round(opts.h * 1.6));
    }

    // ================= 1. COVER =================
    cover() {
      const M = this.M, lastQ = M.lastQ;
      super.cover(this.T(`Datos: informe del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}), mercado al ${this.date(M.lastPx[0])}.`, `Data: ${this.qlab(lastQ)} report (${this.date(this.rel(lastQ))}), market as of ${this.date(M.lastPx[0])}.`));
    }
    // ================= 2. EXECUTIVE SUMMARY =================
    execSummary() {
      const M = this.M, secs = (M.SUM.sections || []).map((s) => ({ title: M.L(s.title), items: (s[M.LANG] || s.en || []).map((x) => this.autoBold(x)) }));
      super.execSummary(secs, this.basisLine() + (M.SUM.updatedAt ? this.T(` · redactado el ${this.date(M.SUM.updatedAt)}`, ` · written ${this.date(M.SUM.updatedAt)}`) : ''));
    }

    // ================= 3. TEAR SHEET =================
    tearSheet() {
      const M = this.M, lastQ = M.lastQ, L = M.lastLTM, px = M.lastPx, home = M.qPx, meta = M.MK.prices[M.TICK] || {};
      const sub = this.T(`Mercado: cierre del ${this.date(px[0])} (datos obtenidos ${this.stamp(meta.fetchedAt || M.MK.generatedAt)}) · Financieros: ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`, `Market: close of ${this.date(px[0])} (data fetched ${this.stamp(meta.fetchedAt || M.MK.generatedAt)}) · Financials: ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`);
      let y = this.page('L', this.T('Ficha técnica', 'Tear Sheet'), sub);
      const colW = this.width() * 0.5 - 10, xr = this.cur.x0 + colW + 20;
      const yAgo = M.pointAtOrBefore(home, M.addDays(px[0], -365)), yStart = M.pointAtOrBefore(home, `${px[0].slice(0, 4)}-01-01`);
      const ipc = M.px('^MXX'), ipcLast = M.lastPoint(ipc), ipcAgo = ipcLast && M.pointAtOrBefore(ipc, M.addDays(ipcLast[0], -365)), ipcStart = ipcLast && M.pointAtOrBefore(ipc, `${ipcLast[0].slice(0, 4)}-01-01`);
      const chg = (a, b) => (a && b ? 100 * (a[1] / b[1] - 1) : null);
      const w52 = home.filter((p) => p[0] >= M.addDays(px[0], -365)); const hi = Math.max(...w52.map((p) => p[1])), lo = Math.min(...w52.map((p) => p[1]));
      const fxP = M.pointAtOrBefore(M.fxPts, px[0]); const fx = fxP ? fxP[1] : null;
      const mc = px[1] * M.sharesOut; const dps12 = M.divs12m(px[0]);
      const prevQ = M.qById[M.yoyQid(lastQ)], prevL = prevQ ? M.ltmFor(prevQ) : null, qo = M.quarterObj(lastQ);
      const g = (a, b) => (a != null && b ? 100 * (a / b - 1) : null);
      const pm = (v) => (v == null ? '' : this.pct(v, 1, true)); const yy = this.T('a/a', 'y/y');
      const eps = M.epsLtm(L), bv = M.bvps(lastQ);
      const oa = M.opsFor(qo, 'q'), ob = prevQ ? M.opsFor(M.quarterObj(prevQ), 'q') : null;
      const rows = [], meta2 = [];
      const H = (s) => { rows.push([s, '']); meta2.push(['head left', 'head']); };
      const R = (l, v, c) => { rows.push([l, v]); meta2.push(['left', c || '']); };
      H(this.T('Mercado', 'Market'));
      R(this.T('Precio Q* (BMV)', 'Q* share price (BMV)'), `Ps. ${this.n(px[1], 2)}  ·  ${this.date(px[0])}`);
      R(this.T('Capitalización de mercado', 'Market capitalisation'), `Ps. ${this.n(mc / 1e9, 1)} ${this.T('mil M', 'bn')}${fx ? `  ·  US$ ${this.n(mc / fx / 1e9, 2)} ${this.T('mil M', 'bn')}` : ''}`);
      if (fx) R(this.T('Tipo de cambio usado (Fed H.10)', 'FX rate used (Fed H.10)'), `${this.n(fx, 4)} MXN/USD  ·  ${this.date(fxP[0])}`, 'muted');
      R(this.T('Acciones en circulación (emitidas − tesorería)', 'Shares outstanding (issued − treasury)'), `${this.n(M.sharesOut)}  ·  ${M.REF.shares ? this.date(M.REF.shares.asOf) : ''}`, 'muted');
      R(this.T('Variación en el año (Q* · IPC)', 'Year-to-date change (Q* · IPC)'), `${pm(chg(px, yStart))}  ·  IPC ${pm(chg(ipcLast, ipcStart))}`, this.cls(chg(px, yStart)));
      R(this.T('Variación 12 meses (Q* · IPC)', '12-month change (Q* · IPC)'), `${pm(chg(px, yAgo))}  ·  IPC ${pm(chg(ipcLast, ipcAgo))}`, this.cls(chg(px, yAgo)));
      R(this.T('Máximo / mínimo 52 semanas', '52-week high / low'), `Ps. ${this.n(hi, 2)}  /  Ps. ${this.n(lo, 2)}`);
      const agm = (M.REF.dividends || []).slice(-1)[0];
      if (agm) R(this.T(`Dividendo aprobado en asamblea ${agm.agmYear} · rendimiento`, `Dividend approved at the ${agm.agmYear} AGM · yield`), `Ps. ${this.n(agm.dps, 2)} ${this.T('por acción', 'per share')}  ·  ${this.pct(100 * agm.dps / px[1])}${agm.payoutPct ? `  ·  ${this.T('pago', 'payout')} ${agm.payoutPct}%` : ''}`);
      if (dps12) R(this.T('Dividendos pagados últimos 12 meses (bolsa)', 'Dividends paid last 12 months (exchange)'), `Ps. ${this.n(dps12, 2)}  ·  ${this.pct(100 * dps12 / px[1])}`, 'muted');
      H(this.T(`Financieros (${this.qlab(lastQ)} · Ps. millones, criterios CNSF)`, `Financials (${this.qlab(lastQ)} · Ps. million, CNSF criteria)`));
      if (L) R(this.T('Prima emitida últimos 12 meses', 'Written premiums last twelve months'), `Ps. ${this.m(L.is.written)} M${prevL ? `  ·  ${pm(g(L.is.written, prevL.is.written))} ${yy}` : ''}`, this.cls(prevL && g(L.is.written, prevL.is.written)));
      R(this.T(`Prima emitida ${this.qlab(lastQ)}`, `Written premiums ${this.qlab(lastQ)}`), `Ps. ${this.m(lastQ.is.written)} M${prevQ ? `  ·  ${pm(g(lastQ.is.written, prevQ.is.written))} ${yy}` : ''}`, this.cls(prevQ && g(lastQ.is.written, prevQ.is.written)));
      if (L) R(this.T('Índice de siniestralidad · combinado (UDM)', 'Loss ratio · combined ratio (LTM)'), `${this.pct(L.kpi.lossRatio)}  ·  ${this.pct(L.kpi.combined)}`);
      R(this.T(`Índice de siniestralidad · combinado (${this.qlab(lastQ)})`, `Loss ratio · combined ratio (${this.qlab(lastQ)})`), `${this.pct(qo.kpi.lossRatio)}  ·  ${this.pct(qo.kpi.combined)}${prevQ ? `  ·  ${M.fmtPp(qo.kpi.combined - M.quarterObj(prevQ).kpi.combined)} ${yy}` : ''}`, 'bold');
      if (L) R(this.T('RIF (resultado integral de financiamiento) UDM', 'RIF (investment result) LTM'), `Ps. ${this.m(L.is.rif)} M${prevL ? `  ·  ${pm(g(L.is.rif, prevL.is.rif))} ${yy}` : ''}`);
      if (L) R(this.T('Utilidad neta últimos 12 meses', 'Net income last twelve months'), `Ps. ${this.m(L.is.netIncome)} M${prevL ? `  ·  ${pm(g(L.is.netIncome, prevL.is.netIncome))} ${yy}` : ''}`, this.cls(prevL && g(L.is.netIncome, prevL.is.netIncome)));
      const exv = L && M.exVat(L); if (exv && exv.exVat) R(this.T('  sin el cargo del IVA del 4T25', '  excluding the 4Q25 VAT charge'), `Ps. ${this.m(exv.is.netIncome)} M`, 'muted');
      R(this.T('UPA UDM · P/U · valor en libros por acción · P/VL', 'EPS LTM · P/E · book value per share · P/BV'), `Ps. ${this.n(eps, 2)}  ·  ${this.x(px[1] / eps)}  ·  Ps. ${this.n(bv, 1)}  ·  ${this.x(px[1] / bv)}`, 'bold');
      R(this.T('ROE 12 meses · ROE del trimestre anualizado', '12-month ROE · annualised quarterly ROE'), `${this.pct(qo.kpi.roe12)}  ·  ${this.pct(qo.kpi.roePeriod)}`);
      R(this.T('Índice de solvencia · margen de solvencia', 'Solvency index · solvency margin'), `${this.pct(qo.kpi.solvIndex, 0)}  ·  Ps. ${this.m(qo.kpi.solvMargin)} M`);
      R(this.T('Activos invertidos (float) · renta fija · duración', 'Invested assets (float) · fixed income · duration'), `Ps. ${this.n(qo.kpi.float)} M  ·  ${this.pct(qo.kpi.fiPct)}  ·  ${this.n(qo.kpi.duration, 1)} ${this.T('años', 'years')}`);
      H(this.T('Operación', 'Operations'));
      if (oa) R(this.T(`Unidades aseguradas (${this.qlab(lastQ)}, miles)`, `Insured units (${this.qlab(lastQ)}, thousand)`), `${this.n(oa.unitsTotal)}${ob ? `  ·  ${pm(g(oa.unitsTotal, ob.unitsTotal))} ${yy}` : ''}  ·  ${this.T('México', 'Mexico')} ${this.n(oa.unitsMx)}`, this.cls(ob && g(oa.unitsTotal, ob.unitsTotal)));
      if (oa) R(this.T('Prima emitida por unidad · siniestros por unidad (Ps., trimestre)', 'Written premium per unit · claims per unit (Ps., quarter)'), `Ps. ${this.n(oa.wpPerUnit)}  ·  Ps. ${this.n(oa.claimsPerUnit)}`);
      const vs = M.vintagesSorted(); const cur = vs[vs.length - 1];
      if (cur) R(this.T(`Expectativas ${cur.fy} vigentes (${this.date(cur.date)})`, `${cur.fy} expectations in force (${this.date(cur.date)})`), M.G_METRICS.filter((m) => cur.items[m] && cur.items[m].lo != null).map((m) => `${M.gLabel(m).replace(/ \(.*\)/, '')} ${M.gRangeTxt(cur.items[m])}`).join(' · '), 'small');
      R(this.T('Próximos resultados', 'Next results'), this.nextText().replace(/^[^:]*:\s*/, ''), this.next && this.next.kind === 'confirmed' ? 'bold' : '');
      const noteStr = this.T(`Fuentes: Yahoo Finance (cierres diarios Q.MX y ^MXX; dividendos), FRED DEXMXUS (Fed H.10), informe trimestral de Quálitas ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) y reportes SIFIC. Sin deuda financiera, por lo que no se muestran deuda neta ni VE. UDM = últimos doce meses (suma de los cuatro trimestres más recientes). P/U y P/VL sobre acciones en circulación; ROE 12M como lo reporta Quálitas.`,
        `Sources: Yahoo Finance (daily closes Q.MX and ^MXX; dividends), FRED DEXMXUS (Fed H.10), Quálitas ${this.qlab(lastQ)} quarterly report (${this.date(this.rel(lastQ))}) and SIFIC filings. No financial debt, so net debt and EV are not shown. LTM = last twelve months (sum of the four most recent quarters). P/E and P/BV on shares outstanding; 12M ROE as Quálitas reports it.`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25), limitY = this.cur.y1 - noteH - 10;
      const fy = this.fitTable({ y, w: colW, head: null, body: rows, meta: meta2, cols: { 0: { cellWidth: colW * 0.48, halign: 'left' }, 1: { cellWidth: colW * 0.52 } }, pad: { top: 2.4, bottom: 2.4, left: 4, right: 4 } }, [8.4, 8, 7.7, 7.4, 7, 6.6], limitY);
      const base = M.addDays(px[0], -365);
      const series = [{ id: M.TICK, label: 'Q*' }, { id: '^MXX', label: 'S&P/BMV IPC' }].map((s) => ({ ...s, pts: M.px(s.id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
      const dates = series[0].pts.map((p) => p[0]);
      const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lv = null; return { label: s.label + ` (${this.T('base 100', 'rebased to 100')})`, data: dates.map((d) => { const v = map.get(d); if (v != null) lv = v; return lv != null ? 100 * lv / b : null; }), borderColor: PALETTE[i], backgroundColor: PALETTE[i], borderWidth: i === 0 ? 2.4 : 1.6 }; });
      this.heading(this.T('Q* vs S&P/BMV IPC · últimos 12 meses (base 100, precio sin dividendos)', 'Q* vs S&P/BMV IPC · last 12 months (rebased to 100, price only)'), xr, y, 10);
      const img = this.chart({ type: 'line', data: { labels: dates, datasets: ds }, options: { scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (dates[i] ? dates[i].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, 760, 470);
      const cw = this.cur.x1 - xr, chH = cw * 470 / 760;
      this.image(img, xr, y + 18, cw, chH);
      let yy2 = y + 18 + chH + 6;
      const perf = ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return [d.label.replace(/ \(.*\)/, ''), this.pct(last - 100, 1, true)]; });
      yy2 = this.table({ y: yy2, x: xr, w: cw, head: [this.T(`Rendimiento ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`, `Return ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`), this.T('Precio', 'Price')], body: perf, meta: perf.map((r) => ['left', this.cls(parseFloat(r[1].replace(',', '')))]), size: 8.5, cols: { 0: { halign: 'left' } } });
      const rem = limitY - yy2 - 30;
      if (rem > 90) {
        const b3 = M.addDays(px[0], -365 * 3); const w3 = home.filter((p) => p[0] >= b3); const step = Math.max(1, Math.ceil(w3.length / 500)); const pts3 = w3.filter((_, i) => i % step === 0 || i === w3.length - 1);
        yy2 = this.heading(this.T('Precio Q* (Ps.) · últimos 3 años', 'Q* share price (Ps.) · last 3 years'), xr, yy2 + 8, 10);
        const h3 = Math.min(rem - 22, 150);
        const img3 = this.chart({ type: 'line', data: { labels: pts3.map((p) => p[0]), datasets: [{ label: 'Q*', data: pts3.map((p) => p[1]), borderColor: PALETTE[0], backgroundColor: PALETTE[0] + '22', fill: true, borderWidth: 1.6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (pts3[i] ? pts3[i][0].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(cw * 1.6), Math.round(h3 * 1.6));
        yy2 = this.image(img3, xr, yy2, cw, h3);
      }
      this.noteAbove(noteStr, Math.max(fy, yy2) + 8);
    }

    // ================= 4. OPERATING METRICS (latest quarter y/y) =================
    opsPage() {
      const M = this.M, A = this.A('q'), B = this.B('q'); if (!B) return;
      const oa = M.opsFor(A, 'q'), ob = M.opsFor(B, 'q'), C = M.commentsFor(A, B, 'q'), ops = C && C.ops;
      const la = this.qlab(A), lb = this.qlab(B);
      let y = this.page('P', this.T(`Métricas operativas de Quálitas · ${la} vs ${lb}`, `Quálitas Operating Metrics · ${la} vs ${lb}`), this.nextText());
      const rows = [], meta = [];
      const head = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      const row = (l, k, o = {}) => { const va = oa && oa[k], vb = ob && ob[k]; if (va == null && vb == null) return; const d = va != null && vb != null ? va - vb : null, p = d != null && vb ? 100 * d / Math.abs(vb) : null; const f = (v) => (v == null ? '—' : o.k ? this.m(v) : this.n(v, o.dec || 0)); rows.push([l, f(va), f(vb), d == null ? '—' : f(d), this.pct(p, 1, true), ops && ops[k] ? M.L(ops[k]) : '']); meta.push([(o.cls || '') + ' left', o.cls || '', o.cls || '', this.cls(d) + ' ' + (o.cls || ''), this.cls(p) + ' ' + (o.cls || ''), 'left small']); };
      head(M.t('unitsHead')); row(M.t('unitsMx'), 'unitsMx', { cls: 'sub' }); row(M.t('unitsIntl'), 'unitsIntl', { cls: 'sub' }); row(M.t('unitsTotal'), 'unitsTotal', { cls: 'bold' });
      head(`${M.t('premHead')} (${M.t('mxnM')})`); row(M.t('premInd'), 'premInd', { cls: 'sub', k: true }); row(M.t('premFleet'), 'premFleet', { cls: 'sub', k: true }); row(M.t('premFin'), 'premFin', { cls: 'sub', k: true }); row(M.t('premIntl'), 'premIntl', { cls: 'sub', k: true }); row(M.t('premTotal'), 'premTotal', { cls: 'bold', k: true });
      head(`${M.t('perUnit')} (Ps.)`); row(M.t('wpPerUnit'), 'wpPerUnit'); row(M.t('earnedPerUnit'), 'earnedPerUnit'); row(M.t('claimsPerUnit'), 'claimsPerUnit');
      const W = this.width(), cw = { 0: { cellWidth: W * 0.23, halign: 'left' }, 1: { cellWidth: W * 0.09 }, 2: { cellWidth: W * 0.09 }, 3: { cellWidth: W * 0.085 }, 4: { cellWidth: W * 0.075 }, 5: { cellWidth: W * 0.43, halign: 'left' } };
      const cap = this.T(`Unidades aseguradas al cierre del periodo y prima emitida por línea según el informe trimestral (las líneas no siempre suman el total por ajustes de consolidación). Métricas por unidad = cifra del estado de resultados del trimestre ÷ unidades al cierre. Comentarios (a/a) elaborados a partir del informe trimestral y la transcripción de la conferencia. Fuentes: informe ${la} (${this.date(this.rel(M.lastQ))})${C && C.call ? ' · ' + M.L(C.call) : ''}.`,
        `Insured units at period-end and written premiums by line from the quarterly report (lines do not always add to the total because of consolidation adjustments). Per-unit metrics = quarterly income-statement figure ÷ period-end units. Comments (y/y) written from the quarterly report and the earnings-call transcript. Sources: ${la} report (${this.date(this.rel(M.lastQ))})${C && C.call ? ' · ' + M.L(C.call) : ''}.`);
      const noteH = this.measureText(cap, W, 7.5, 1.25);
      y = this.fitTable({ y, head: [M.t('metric'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe y conferencia)', 'Comments (report and earnings call)')], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)) }, [8.6, 8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - noteH - 170);
      const qs = M.Q.slice(-8).map((q) => M.quarterObj(q));
      const remaining = this.cur.y1 - noteH - y - 34;
      if (remaining > 110) {
        const h = Math.min(remaining - 26, 210);
        y = this.heading(this.T('Prima emitida por trimestre (Ps. millones, eje izq.) e índice combinado (%, eje der.)', 'Written premiums by quarter (Ps. million, left axis) and combined ratio (%, right axis)'), this.cur.x0, y + 10, 10);
        const img = this.barLine(qs.map((q) => this.qlab(q)), [{ label: this.T('Prima emitida (eje izq.)', 'Written premiums (left axis)'), data: qs.map((q) => q.is.written / 1000), color: PALETTE[0] }], { label: this.T('Índice combinado (eje der.)', 'Combined ratio (right axis)'), data: qs.map((q) => q.kpi.combined) }, { w: W, h, y2min: 85, y2max: 100, y2dec: 0, thick: 40 });
        y = this.image(img, this.cur.x0, y, W, h) + 4;
      }
      this.noteAbove(cap, y + 6);
    }

    // ================= 5–7. INCOME STATEMENT (quarter, LTM, fiscal year) =================
    incomePage(mode) {
      const M = this.M; const A = this.A(mode), B = this.B(mode); if (!A || !B) return;
      let C, la, lb, cmtNote = '';
      if (mode === 'q') { C = M.commentsFor(A, B, 'q'); la = this.qlab(A); lb = this.qlab(B); }
      else if (mode === 'fy') { C = M.commentsFor(A, B, 'fy'); la = 'FY' + A.fy; lb = 'FY' + B.fy; }
      else { const bq = M.qById[M.yoyQid(M.lastQ)]; C = M.commentsFor(this.A('q'), M.quarterObj(bq), 'q'); la = A.id; lb = B.id; cmtNote = this.T(` · Los comentarios corresponden al ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (último trimestre reportado)`, ` · Comments refer to ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (latest reported quarter)`); }
      let y = this.page('P', `${this.T('Estado de resultados de Quálitas', 'Quálitas Income Statement')} · ${la} vs ${lb}`, this.nextText());
      const layout = M.FIN.layout.is; const rows = [], meta = [];
      const get = (o, d) => { const src = d.kpi ? o.kpi : o.is; return src && src[d.k] != null ? src[d.k] : null; };
      const COST = new Set(['acqRatio', 'lossRatio', 'opRatio', 'combined', 'combinedAdj', 'taxRate']);
      const push = (label, def, va, vb, cmt, c) => {
        const d = va != null && vb != null ? va - vb : null, p = d != null && vb ? 100 * d / Math.abs(vb) : null;
        const f = (v) => (v == null ? '—' : def.pct ? this.pct(v) : def.perShare ? this.n(v, 2) : this.m(v));
        const fd = d == null ? '—' : def.pct ? M.fmtPp(d) : def.perShare ? this.n(d, 2) : this.m(d);
        const dc = COST.has(def.k) ? M.clsInv(d) : this.cls(d);
        rows.push([label, f(va), f(vb), fd, def.pct ? '' : this.pct(p, 1, true), cmt || '']); meta.push([c + ' left', c, c, dc + ' ' + c, dc + ' ' + c, 'left small']);
      };
      const exA = M.exVat(A), exB = M.exVat(B);
      for (const def of layout) {
        if (def.level === 2) continue;
        const va = get(A, def), vb = get(B, def);
        if (va == null && vb == null) continue;
        if (def.level === 1 && !def.kpi && Math.abs(va || 0) < 500 && Math.abs(vb || 0) < 500) continue; // lines below Ps. 0.5 M (associates, discontinued) omitted
        const c = def.level === 0 || def.bold ? 'bold' : '';
        push(M.L(def), def, va, vb, C && C.lines && C.lines[def.k] ? M.L(C.lines[def.k]) : '', c);
        if (def.k === 'netIncome' && (exA.exVat || exB.exVat)) push(this.T('  Utilidad neta sin el cargo del IVA del 4T25 (memo)', '  Net income excluding the 4Q25 VAT charge (memo)'), def, exA.is.netIncome, exB.is.netIncome, this.T(`Cargo único de Ps. ${this.n(M.REF.vat.adjust.claimsMxnM)} M en siniestros del 4T25 (Ps. ${this.n(M.REF.vat.adjust.netIncomeMxnM)} M en utilidad neta) eliminado.`, `One-off Ps. ${this.n(M.REF.vat.adjust.claimsMxnM)} M charge to 4Q25 claims (Ps. ${this.n(M.REF.vat.adjust.netIncomeMxnM)} M in net income) removed.`), 'muted');
        if (def.k === 'combined' && (exA.exVat || exB.exVat)) push(this.T('  Índice combinado sin el cargo del IVA (memo)', '  Combined ratio excluding the VAT charge (memo)'), def, exA.kpi.combined, exB.kpi.combined, '', 'muted');
      }
      const W = this.width(), cw = { 0: { cellWidth: W * 0.25, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.08 }, 5: { cellWidth: W * 0.42, halign: 'left' } };
      y = this.fitTable({ y, head: [this.T('Cifras en MXN millones', 'Figures in MXN mn'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe y conferencia)', 'Comments (report and earnings call)')], body: rows, meta, cols: cw }, [8.4, 8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 40);
      if (mode === 'fy') y = this.isFiller(y);
      const srcs = [A, B].map((o) => o.sources && o.sources.is).filter(Boolean);
      const cap = this.T(`Ps. millones, criterios contables de la CNSF, como se reporta (miles convertidos a millones). Índices según las definiciones de Quálitas: adquisición sobre prima retenida, siniestralidad sobre prima devengada, operación sobre prima emitida. Detalle omitido${(A.derived || B.derived) ? '; periodos UDM calculados a partir de trimestres reportados' : ''}. Fuentes: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `informe trimestral de Quálitas (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`,
        `Ps. million, CNSF accounting criteria, as reported (thousands shown in millions). Ratios per Quálitas' definitions: acquisition on retained premiums, loss on earned premiums, operating on written premiums. Detail rows omitted${(A.derived || B.derived) ? '; LTM periods computed from reported quarters' : ''}. Sources: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `Quálitas quarterly report (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`);
      this.note(cap, Math.max(y + 6, this.cur.y1 - 34));
    }
    isFiller(y) {
      const M = this.M, rem = this.cur.y1 - y - 46; if (rem < 92) return y;
      const h = Math.min(rem - 20, 190), W = this.width(), ys = M.Y.slice(-6).map((o) => M.fyObj(o));
      y = this.heading(this.T('Prima emitida y utilidad neta (Ps. millones, eje izq.) e índice combinado (%, eje der.) por año fiscal', 'Written premiums and net income (Ps. million, left axis) and combined ratio (%, right axis) by fiscal year'), this.cur.x0, y + 8, 10);
      const img = this.barLine(ys.map((o) => 'FY' + o.fy), [{ label: this.T('Prima emitida (eje izq.)', 'Written premiums (left axis)'), data: ys.map((o) => o.is.written / 1000), color: '#c9c6bd' }, { label: this.T('Utilidad neta (eje izq.)', 'Net income (left axis)'), data: ys.map((o) => o.is.netIncome / 1000), color: PALETTE[0] }], { label: this.T('Índice combinado (eje der.)', 'Combined ratio (right axis)'), data: ys.map((o) => o.kpi.combined) }, { w: W, h, y2min: 80, y2max: 100 });
      return this.image(img, this.cur.x0, y, W, h) + 4;
    }

    // ================= 8. MANAGEMENT EXPECTATIONS =================
    guidancePage() {
      const M = this.M, vs = M.vintagesSorted(); if (!vs.length) return;
      const cur = vs[vs.length - 1], act = M.gActual(cur.fy);
      let y = this.page('L', this.T(`Expectativas de la administración · ${cur.fy}`, `Management Expectations · ${cur.fy}`), this.T(`Publicadas el ${this.date(cur.date)} (${M.t(cur.kind)}) · ${M.L(cur.source && cur.source.title)} · seguimiento con el ${act ? act.label : '—'} reportado`, `Published ${this.date(cur.date)} (${M.t(cur.kind)}) · ${M.L(cur.source && cur.source.title)} · tracked against the reported ${act ? act.label : '—'}`));
      const gap = 24, wl = this.width() * 0.57, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const fmtA = (m, v) => (v == null ? '—' : m === 'written' || m === 'rif' ? this.pct(v, 1, true) : this.pct(v));
      const rows = M.G_METRICS.filter((m) => cur.items[m]).map((m) => { const it = cur.items[m], v = act ? act[m] : null, s = M.gStatus(m, it, v); return [M.gLabel(m), M.gRangeTxt(it), M.L(it.text), fmtA(m, v), s ? M.t(s) : '']; });
      const rmeta = rows.map((r, i) => { const m = M.G_METRICS.filter((k) => cur.items[k])[i]; const s = M.gStatus(m, cur.items[m], act ? act[m] : null); return ['bold left', 'bold', 'left small', 'bold', s === 'better' || s === 'above' || s === 'within' ? 'pos' : s ? 'neg' : '']; });
      let yl = this.fitTable({ y, w: wl, head: [M.t('metric'), M.t('range'), M.t('words'), `${M.t('actual')} ${act ? act.label : ''}`, M.t('guideStatus')], body: rows, meta: rmeta, cols: { 0: { halign: 'left', cellWidth: wl * 0.2 }, 1: { cellWidth: wl * 0.11 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.11 }, 4: { cellWidth: wl * 0.13 } }, pad: { top: 3, bottom: 3, left: 3.5, right: 3.5 } }, [9.4, 9, 8.6, 8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - 120);
      const notes = ((cur.notes && cur.notes[M.LANG]) || []).map((x) => this.autoBold(x));
      const lt = M.GD.longTerm || {};
      const ltLine = this.T(`Objetivos de largo plazo: siniestralidad ${lt.lossRatio ? `${lt.lossRatio.lo}–${lt.lossRatio.hi}%` : '—'} · combinado ${lt.combined ? `${lt.combined.lo}–${lt.combined.hi}%` : '—'} · ROE ${lt.roe ? `${lt.roe.lo}–${lt.roe.hi}%` : '—'} · pago de dividendos ${lt.payout ? `${lt.payout.lo}–${lt.payout.hi}%` : '—'} de la utilidad neta.`, `Long-term targets: loss ratio ${lt.lossRatio ? `${lt.lossRatio.lo}–${lt.lossRatio.hi}%` : '—'} · combined ${lt.combined ? `${lt.combined.lo}–${lt.combined.hi}%` : '—'} · ROE ${lt.roe ? `${lt.roe.lo}–${lt.roe.hi}%` : '—'} · dividend payout ${lt.payout ? `${lt.payout.lo}–${lt.payout.hi}%` : '—'} of net income.`);
      if (notes.length) { yl = this.heading(this.T('Lo que dijo la administración', 'What management said'), this.cur.x0, yl + 8, 9.5); yl = this.fitBullets(notes.concat([`**${this.T('Largo plazo.', 'Long term.')}** ${ltLine}`]), this.cur.x0, yl, wl, this.cur.y1 - yl - 190, { max: 9.2, min: 6.6 }); }
      // ranges (first and latest expectation of each year) against the actual: one chart per headline metric
      const fys = [...new Set(vs.map((v) => v.fy))]; const room = this.cur.y1 - yl - 40;
      if (room > 110) {
        const h = Math.min(room - 16, 160), cw = (wl - 14) / 2;
        const chartFor = (m, x, yy) => {
          const has = (v) => v.items[m] && v.items[m].lo != null; const first = (fy) => vs.find((v) => v.fy === fy && has(v)), last = (fy) => vs.filter((v) => v.fy === fy && has(v)).pop();
          const rng = (v) => (v ? [v.items[m].lo, v.items[m].hi != null ? v.items[m].hi : v.items[m].lo + 3] : null);
          const acts = fys.map((fy) => { const a = M.gActual(fy); return a ? a[m] : null; });
          const vals = [].concat(...fys.map((fy) => rng(last(fy)) || []), acts.filter((v) => v != null));
          const img = this.chart({ type: 'bar', data: { labels: fys.map((fy) => 'FY' + fy), datasets: [
            { label: M.t('initial'), data: fys.map((fy) => rng(first(fy))), backgroundColor: PALETTE[0] + '55', borderColor: PALETTE[0], borderWidth: 1, borderSkipped: false, borderRadius: 3, maxBarThickness: 28 },
            { label: this.T('Última revisión', 'Latest revision'), data: fys.map((fy) => rng(last(fy))), backgroundColor: PALETTE[2] + '88', borderColor: PALETTE[2], borderWidth: 1, borderSkipped: false, borderRadius: 3, maxBarThickness: 28 },
            { type: 'line', label: `${M.t('actual')} (${this.T('año en curso = acumulado', 'current year = YTD')})`, data: acts, borderColor: RED, backgroundColor: '#ffffff', pointRadius: 5, pointBorderWidth: 2, pointBorderColor: RED, pointBackgroundColor: '#ffffff', showLine: false, order: 0 }] },
            options: { plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false, suggestedMin: Math.floor(Math.min(...vals) - 2), suggestedMax: Math.ceil(Math.max(...vals) + 2), ticks: { callback: (v) => v + '%' } } } } }, Math.round(cw * 1.6), Math.round((h - 14) * 1.6));
          this.heading(M.gLabel(m), x, yy, 9); return this.image(img, x, yy + 14, cw, h - 14);
        };
        yl = Math.max(chartFor('written', this.cur.x0, yl + 6), chartFor('combined', this.cur.x0 + cw + 14, yl + 6)) + 2;
      }
      // right: history of the last vintages and the track record of closed years
      let yr = this.heading(this.T('Historial de expectativas (últimas versiones)', 'History of expectations (latest versions)'), xr, y, 9.5);
      const hist = vs.slice(-7).reverse();
      const hm = ['written', 'lossRatio', 'combined', 'roe'];
      const hrows = hist.map((v) => [`${this.date(v.date)} · ${M.t(v.kind)}`, String(v.fy), ...hm.map((m) => M.gRangeTxt(v.items[m]))]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('date'), M.t('guideFy'), ...hm.map((m) => M.gLabel(m).replace(/ \(.*\)/, ''))], body: hrows, meta: hrows.map(() => ['left small', '', '', '', '', '']), cols: { 0: { halign: 'left', cellWidth: wr * 0.3 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - 150);
      const closed = [...new Set(vs.map((v) => v.fy))].filter((fy) => { const a = M.gActual(fy); return a && a.closed; });
      if (closed.length) {
        yr = this.heading(this.T('Cumplimiento en años cerrados (última expectativa vs real)', 'Track record in closed years (final expectation vs actual)'), xr, yr + 8, 9.5);
        const rr = closed.map((fy) => { const fin = vs.filter((v) => v.fy === fy).pop(), a = M.gActual(fy); const cells = hm.map((m) => { const it = fin.items[m]; if (!it || it.lo == null) return '—'; return `${M.gRangeTxt(it)} → ${fmtA(m, a[m])}`; }); const n = M.G_METRICS.filter((m) => fin.items[m] && fin.items[m].lo != null && a[m] != null).length, hits = M.G_METRICS.filter((m) => ['within', 'better', 'above'].includes(M.gStatus(m, fin.items[m], a[m]))).length; return ['FY' + fy, ...cells, `${hits}/${n}`]; });
        yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('guideFy'), ...hm.map((m) => M.gLabel(m).replace(/ \(.*\)/, '')), M.t('hits')], body: rr, meta: rr.map(() => ['bold left', 'small', 'small', 'small', 'small', 'bold']), cols: { 0: { halign: 'left', cellWidth: wr * 0.12 }, 5: { cellWidth: wr * 0.13 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8.2, 7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - 40);
        yr = this.note(this.T('FY2025 incluye el cargo único del IVA del 4T25 (siniestralidad 62.2% y combinado 90.6% sin él). Crecimiento sobre el año anterior; índices como nivel.', 'FY2025 includes the one-off 4Q25 VAT charge (62.2% loss ratio and 90.6% combined without it). Growth over the prior year; ratios as levels.'), yr + 3, 7, xr, wr);
      }
      this.noteAbove(this.T(`Fuentes: informes trimestrales y conferencias de resultados de Quálitas (${vs.slice(-4).map((v) => this.date(v.date)).join(', ')}). Crecimiento sobre el año fiscal anterior en %, índices como nivel en %; siniestralidad = costo de siniestros ÷ prima devengada; combinado = adquisición (sobre retenida) + siniestralidad (sobre devengada) + operación (sobre emitida), definiciones de Quálitas. Año en curso comparado con el acumulado reportado.`, `Sources: Quálitas quarterly reports and earnings calls (${vs.slice(-4).map((v) => this.date(v.date)).join(', ')}). ${M.GD.basis || ''} Current year compared with the reported year-to-date.`), Math.max(yl, yr) + 6);
    }

    // ================= 9. INSURED UNITS AND PREMIUMS BY LINE =================
    driversPage() {
      const M = this.M, OQ = (M.OPS.quarters || []).slice().sort((a, b) => a.fy - b.fy || a.q - b.q);
      const last = OQ[OQ.length - 1], prev = OQ.find((o) => o.fy === last.fy - 1 && o.q === last.q);
      let y = this.page('P', this.T('Unidades aseguradas y primas por línea de negocio', 'Insured Units and Premiums by Line of Business'), this.T(`Informes trimestrales de Quálitas hasta el ${this.qlab(last)} (${this.date(last.source && last.source.date)}) · unidades en miles al cierre · primas en Ps. millones del trimestre`, `Quálitas quarterly reports to ${this.qlab(last)} (${this.date(last.source && last.source.date)}) · thousand units at period-end · quarterly premiums in Ps. million`));
      const W = this.width(), qs = OQ.slice(-12);
      // units: total, Mexico and international as lines
      y = this.heading(this.T('Unidades aseguradas al cierre de cada trimestre (miles)', 'Insured units at each quarter-end (thousand)'), this.cur.x0, y, 10);
      const h1 = 150;
      const img1 = this.chart({ type: 'line', data: { labels: qs.map((o) => this.qlab(o)), datasets: [
        { label: M.t('unitsTotal'), data: qs.map((o) => o.units && o.units.total), borderColor: PALETTE[0], backgroundColor: PALETTE[0], borderWidth: 2.4, pointRadius: 3, yAxisID: 'y' },
        { label: M.t('mexico'), data: qs.map((o) => o.units && o.units.mx), borderColor: PALETTE[2], backgroundColor: PALETTE[2], borderWidth: 1.8, pointRadius: 2, yAxisID: 'y' },
        { label: this.T('Subsidiarias internacionales (eje der.)', 'International subsidiaries (right axis)'), data: qs.map((o) => (o.units && o.units.total && o.units.mx ? o.units.total - o.units.mx : null)), borderColor: PALETTE[1], backgroundColor: PALETTE[1], borderWidth: 1.8, borderDash: [5, 3], pointRadius: 2, yAxisID: 'y2' }] },
        options: { scales: { x: { grid: { display: false } }, y: { position: 'left', ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img1, this.cur.x0, y, W, h1) + 6;
      const U = [['total', 'unitsTotal'], ['mx', 'mexico'], ['autos', 'cars'], ['trucks', 'trucks'], ['motos', 'motos'], ['cr', 'c_cr'], ['pe', 'c_pe'], ['sv', 'c_sv'], ['us', 'c_us'], ['co', 'c_co']];
      const ur = U.map(([k, lk]) => { const v = last.units[k], pv = prev && prev.units[k]; if (v == null) return null; const g = pv ? 100 * (v / pv - 1) : null; return { r: [M.t(lk), this.n(v), pv != null ? this.n(pv) : '—', this.pct(g, 1, true), k !== 'total' ? this.pct(100 * v / last.units.total, 1) : ''], m: [(k === 'total' || k === 'mx' ? 'bold' : k === 'autos' || k === 'trucks' || k === 'motos' ? 'sub' : '') + ' left', k === 'total' || k === 'mx' ? 'bold' : '', '', this.cls(g), ''] }; }).filter(Boolean);
      const gap = 20, wl = W * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap;
      let yl = this.heading(this.T(`Unidades por segmento y país · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (miles)`, `Units by segment and country · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (thousand)`), this.cur.x0, y, 9.5);
      yl = this.fitTable({ y: yl, w: wl, head: [this.T('Segmento / país', 'Segment / country'), this.qlab(last), prev ? this.qlab(prev) : '—', this.T('a/a', 'y/y'), `% ${M.t('total')}`], body: ur.map((x) => x.r), meta: ur.map((x) => x.m), cols: { 0: { halign: 'left', cellWidth: wl * 0.36 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6], this.cur.y1 - 60);
      // premiums by line: stacked bars, then the latest-quarter table on the right
      const Pk = [['ind', 'premInd'], ['fleet', 'premFleet'], ['fin', 'premFin'], ['intl', 'premIntl']];
      const pq = qs.filter((o) => o.premiums && o.premiums.total);
      let yr = this.heading(this.T(`Prima emitida por línea · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (Ps. M)`, `Written premiums by line · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (Ps. M)`), xr, y, 9.5);
      const pr = Pk.concat([['total', 'premTotal']]).map(([k, lk]) => { const v = last.premiums[k], pv = prev && prev.premiums && prev.premiums[k]; if (v == null) return null; const g = pv ? 100 * (v / pv - 1) : null; return { r: [M.t(lk), this.m(v), pv != null ? this.m(pv) : '—', this.pct(g, 1, true), k !== 'total' ? this.pct(100 * v / last.premiums.total, 1) : ''], m: [(k === 'total' ? 'bold' : '') + ' left', k === 'total' ? 'bold' : '', '', this.cls(g), ''] }; }).filter(Boolean);
      yr = this.fitTable({ y: yr, x: xr, w: wl, head: [this.T('Línea', 'Line'), this.qlab(last), prev ? this.qlab(prev) : '—', this.T('a/a', 'y/y'), `% ${M.t('total')}`], body: pr.map((x) => x.r), meta: pr.map((x) => x.m), cols: { 0: { halign: 'left', cellWidth: wl * 0.36 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6], this.cur.y1 - 60);
      const ytdR = last.premiumsYtd && last.premiumsYtdPrevY ? this.T(`Acumulado ${M.ytdLabel(last.fy, last.q * 3)}: Ps. ${this.m(last.premiumsYtd.total)} M, ${this.pct(100 * (last.premiumsYtd.total / last.premiumsYtdPrevY.total - 1), 1, true)} a/a.`, `Year-to-date ${M.ytdLabel(last.fy, last.q * 3)}: Ps. ${this.m(last.premiumsYtd.total)} M, ${this.pct(100 * (last.premiumsYtd.total / last.premiumsYtdPrevY.total - 1), 1, true)} y/y.`) : '';
      if (ytdR) yr = this.text(ytdR, xr, yr + 3, wl, 7.8, 'bold', ACCENT);
      y = Math.max(yl, yr) + 8;
      const noteStr = this.T('Miles de unidades; México se desglosa en automóviles, camiones y motocicletas (incluye RC extranjero); turistas y fronterizos reclasificados desde 1T25. Tradicional = individual + flotillas; instituciones financieras = pólizas vendidas con crédito automotriz (mayor comisión y proporción multianual). Trimestres sin informe propio: columna comparativa del informe del año siguiente.', 'Thousand units; Mexico is split into cars, trucks and motorcycles (incl. foreign third-party liability); tourist and border units reclassified from 1Q25. Traditional = individual + fleets; financial institutions = policies sold with auto loans (higher commission and multi-year share). Quarters without their own report: comparative column of the following year\'s report.');
      const noteH = this.measureText(noteStr, W, 7.5, 1.25);
      const rem = this.cur.y1 - noteH - y - 30;
      if (pq.length >= 4 && rem > 90) {
        const h2 = Math.min(rem - 12, 170);
        y = this.heading(this.T('Prima emitida por línea de negocio por trimestre (Ps. millones)', 'Written premiums by line of business per quarter (Ps. million)'), this.cur.x0, y, 10);
        const img2 = this.barLine(pq.map((o) => this.qlab(o)), Pk.map(([k, lk], i) => ({ label: M.t(lk), data: pq.map((o) => o.premiums[k] / 1000), color: PALETTE[i], stack: 'p' })), null, { w: W, h: h2, stacked: true, thick: 30 });
        y = this.image(img2, this.cur.x0, y, W, h2) + 4;
      }
      this.noteAbove(noteStr, y + 4);
    }

    // ================= 10. COMBINED RATIO AND PROFITABILITY =================
    combinedPage() {
      const M = this.M, qs = M.Q.slice(-12).map((q) => M.quarterObj(q));
      let y = this.page('P', this.T('Índice combinado y rentabilidad por trimestre', 'Combined Ratio and Profitability by Quarter'), this.T(`Últimos 12 trimestres reportados hasta el ${this.qlab(M.lastQ)} · índices según las definiciones de Quálitas (adquisición sobre retenida, siniestralidad sobre devengada, operación sobre emitida)`, `Last 12 reported quarters to ${this.qlab(M.lastQ)} · ratios per Quálitas' definitions (acquisition on retained, loss on earned, operating on written premiums)`));
      const W = this.width();
      const lt = M.GD.longTerm && M.GD.longTerm.combined;
      y = this.heading(this.T(`Adquisición + siniestralidad + operación (%) · línea = índice combinado${lt ? ` · objetivo ${lt.lo}–${lt.hi}%` : ''}`, `Acquisition + loss + operating (%) · line = combined ratio${lt ? ` · target ${lt.lo}–${lt.hi}%` : ''}`), this.cur.x0, y, 10);
      const h1 = 200;
      const ds = [
        { type: 'line', label: M.t('combined'), data: qs.map((q) => q.kpi.combined), borderColor: RED, backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: RED, pointBackgroundColor: '#ffffff', order: 0 },
        { type: 'bar', label: M.t('lossRatio'), data: qs.map((q) => q.kpi.lossRatio), backgroundColor: PALETTE[1], stack: 'c', order: 2, maxBarThickness: 30 },
        { type: 'bar', label: M.t('acqRatio'), data: qs.map((q) => q.kpi.acqRatio), backgroundColor: PALETTE[0], stack: 'c', order: 2, maxBarThickness: 30 },
        { type: 'bar', label: M.t('opRatio'), data: qs.map((q) => q.kpi.opRatio), backgroundColor: PALETTE[3], stack: 'c', order: 2, maxBarThickness: 30 }];
      if (lt) { ds.push({ type: 'line', label: this.T(`Objetivo ${lt.lo}%`, `Target ${lt.lo}%`), data: qs.map(() => lt.lo), borderColor: '#7f8c8d', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, order: 1 }); ds.push({ type: 'line', label: this.T(`Objetivo ${lt.hi}%`, `Target ${lt.hi}%`), data: qs.map(() => lt.hi), borderColor: '#7f8c8d', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, order: 1 }); }
      const img1 = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: ds }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, suggestedMax: 105, ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img1, this.cur.x0, y, W, h1) + 8;
      const q8 = qs.slice(-8);
      const yoy = (q, f, pp) => { const p = M.qById[M.yoyQid(q)]; if (!p) return null; const a = f(q), b = f(M.quarterObj(p)); if (a == null || b == null) return null; return pp ? a - b : b ? 100 * (a / b - 1) : null; };
      const defs = [
        { l: M.t('written') + ' (Ps. M)', f: (q) => q.is.written / 1000, fmt: (v) => this.n(v) },
        { l: M.t('earned') + ' (Ps. M)', f: (q) => (q.is.earned != null ? q.is.earned / 1000 : null), fmt: (v) => this.n(v) },
        { l: M.t('lossRatio'), f: (q) => q.kpi.lossRatio, fmt: (v) => this.pct(v), pp: true, inv: true },
        { l: M.t('combined'), f: (q) => q.kpi.combined, fmt: (v) => this.pct(v), pp: true, inv: true },
        { l: M.t('rif') + ' (Ps. M)', f: (q) => (q.is.rif != null ? q.is.rif / 1000 : null), fmt: (v) => this.n(v) },
        { l: M.t('netIncome') + ' (Ps. M)', f: (q) => (q.is.netIncome != null ? q.is.netIncome / 1000 : null), fmt: (v) => this.n(v) },
        { l: M.t('rsi'), f: (q) => q.kpi.rsi, fmt: (v) => this.pct(v), pp: true },
        { l: M.t('roe12'), f: (q) => q.kpi.roe12, fmt: (v) => this.pct(v), pp: true },
        { l: M.t('units'), f: (q) => q.kpi.units, fmt: (v) => this.n(v) },
        { l: M.t('solvIndex'), f: (q) => q.kpi.solvIndex, fmt: (v) => this.pct(v, 0), pp: true },
      ];
      const rows = [], meta = [];
      for (const d of defs) { const vals = q8.map((q) => d.f(q)); if (vals.every((v) => v == null)) continue; rows.push([d.l, ...vals.map((v) => (v == null ? '—' : d.fmt(v)))]); meta.push(['bold left', ...q8.map(() => 'bold')]); const ys = q8.map((q) => yoy(q, d.f, d.pp)); rows.push([this.T('  variación a/a', '  y/y change'), ...ys.map((v) => (v == null ? '' : d.pp ? M.fmtPp(v) : this.pct(v, 1, true)))]); meta.push(['muted left small', ...ys.map((v) => (d.inv ? M.clsInv(v) : this.cls(v)) + ' small')]); }
      y = this.heading(this.T('Indicadores por trimestre (últimos 8) con la variación contra el mismo trimestre del año anterior', 'Quarterly indicators (last 8) with the change versus the same quarter a year earlier'), this.cur.x0, y, 10);
      const noteStr = this.T('Índices, RSI, ROE 12M y solvencia como los reporta Quálitas o recalculados del estado de resultados; RSI = RIF anualizado ÷ activos invertidos promedio; variación en puntos porcentuales para los índices. 4T25 incluye el cargo único del IVA (Ps. 2,406 M en siniestros). Fuente: informes trimestrales de Quálitas.', 'Ratios, RSI, 12M ROE and solvency as reported by Quálitas or recomputed from the income statement; RSI = annualised RIF ÷ average invested assets; change in percentage points for the ratios. 4Q25 includes the one-off VAT charge (Ps. 2,406 M in claims). Source: Quálitas quarterly reports.');
      const noteH = this.measureText(noteStr, W, 7.5, 1.25);
      y = this.fitTable({ y, head: [M.t('metric'), ...q8.map((q) => this.qlab(q))], body: rows, meta, cols: { 0: { halign: 'left', cellWidth: W * 0.24 } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - noteH - 10);
      this.noteAbove(noteStr, y + 6);
    }

    // ================= 11. 07 CAPITAL, SOLVENCY AND INVESTMENT PORTFOLIO =================
    capitalPage() {
      const M = this.M, lastQ = M.lastQ, qo = M.quarterObj(lastQ), L = M.lastLTM, title = this.sectionTitle('capital', this.T('Capital, solvencia y portafolio de inversión', 'Capital, solvency and investment portfolio'));
      let y = this.page('L', `07 · ${title}`, this.T(`Ps. millones · balance del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · calificaciones según eventos relevantes, referencia actualizada ${this.date(M.REF.updatedAt)}`, `Ps. million · ${this.qlab(lastQ)} balance sheet (${this.date(this.rel(lastQ))}) · ratings per material-event releases, reference updated ${this.date(M.REF.updatedAt)}`));
      const lev = L && lastQ.bs && lastQ.bs.totalEquity ? L.is.retained / lastQ.bs.totalEquity : null;
      y = this.tiles([
        { v: this.pct(qo.kpi.solvIndex, 0), l: this.T('Índice de solvencia = (margen + RCS) ÷ RCS', 'Solvency index = (margin + RCS) ÷ RCS') },
        { v: `Ps. ${this.m(qo.kpi.rcs)} M`, l: this.T('Requerimiento de capital de solvencia (RCS)', 'Solvency capital requirement (RCS)') },
        { v: `Ps. ${this.m(qo.kpi.solvMargin)} M`, l: this.T('Margen de solvencia (fondos propios − RCS)', 'Solvency margin (own funds − RCS)') },
        { v: `Ps. ${this.n(qo.kpi.float)} M`, l: this.T(`Activos invertidos (float) · ${this.pct(qo.kpi.fiPct)} renta fija · duración ${this.n(qo.kpi.duration, 1)} a`, `Invested assets (float) · ${this.pct(qo.kpi.fiPct)} fixed income · duration ${this.n(qo.kpi.duration, 1)} y`) },
        { v: lev != null ? this.x(lev, 2) : '—', l: this.T('Prima retenida UDM ÷ capital contable (apalancamiento operativo); sin deuda financiera', 'Retained premiums LTM ÷ equity (operating leverage); no financial debt') },
      ], y);
      const gap = 24, wl = this.width() * 0.5, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const qs = M.Q.slice(-10).filter((q) => q.kpi && q.kpi.solvIndex != null);
      let yl = this.heading(this.T('RCS + margen (barras, Ps. M, eje izq.) · índice de solvencia (línea, eje der.)', 'RCS + margin (bars, Ps. M, left axis) · solvency index (line, right axis)'), this.cur.x0, y, 9.5);
      const h1 = 170;
      const img1 = this.barLine(qs.map((q) => this.qlab(q)), [{ label: M.t('rcs'), data: qs.map((q) => q.kpi.rcs / 1000), color: PALETTE[1], stack: 's' }, { label: M.t('solvMargin'), data: qs.map((q) => q.kpi.solvMargin / 1000), color: PALETTE[0], stack: 's' }], { label: `${M.t('solvIndex')} (${this.T('eje der.', 'right axis')})`, data: qs.map((q) => q.kpi.solvIndex) }, { w: wl, h: h1, stacked: true, thick: 30, y2min: 200, y2max: 450 });
      yl = this.image(img1, this.cur.x0, yl, wl, h1) + 6;
      const qb = M.Q.slice(-10).filter((q) => q.bs && q.bs.reserves != null);
      yl = this.heading(this.T('Reservas técnicas, float y capital contable al cierre (Ps. millones)', 'Technical reserves, float and equity at quarter-end (Ps. million)'), this.cur.x0, yl + 4, 9.5);
      const h2 = Math.min(150, this.cur.y1 - yl - 60);
      if (h2 > 70) { const img2 = this.barLine(qb.map((q) => this.qlab(q)), [{ label: M.t('reserves'), data: qb.map((q) => q.bs.reserves / 1000), color: PALETTE[1] }, { label: M.t('float'), data: qb.map((q) => (q.kpi && q.kpi.float != null ? q.kpi.float : q.bs.inv != null ? q.bs.inv / 1000 : null)), color: PALETTE[0] }, { label: M.t('equity'), data: qb.map((q) => q.bs.totalEquity / 1000), color: PALETTE[2] }], null, { w: wl, h: h2, thick: 16 }); yl = this.image(img2, this.cur.x0, yl, wl, h2) + 4; }
      // right: portfolio table, ratings, reading
      const qp = M.Q.slice(-8).map((q) => M.quarterObj(q));
      const rateAt = (q) => { const p = M.pointAtOrBefore(M.mx10, M.qEndDate(q)); return p ? p[1] : null; };
      let yr = this.heading(this.T('Portafolio y rendimiento por trimestre', 'Portfolio and returns by quarter'), xr, y, 10);
      const pr = qp.map((q) => [this.qlab(q), q.kpi.float != null ? this.n(q.kpi.float) : '—', this.pct(q.kpi.fiPct), q.kpi.duration != null ? this.n(q.kpi.duration, 1) : '—', q.is.rif != null ? this.m(q.is.rif) : '—', this.pct(q.kpi.rsi), this.pct(rateAt(q), 2), this.pct(q.kpi.roe12)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('quarter'), `${this.T('Float', 'Float')} (Ps. M)`, this.T('Renta fija', 'Fixed inc.'), this.T('Duración', 'Duration'), 'RIF (Ps. M)', 'RSI', this.T('Bono M 10a', '10-yr M bond'), M.t('roe12')], body: pr, meta: pr.map(() => ['left', '', '', '', '', 'bold', 'muted', 'bold']), cols: { 0: { halign: 'left' } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.6, 7.2, 6.8, 6.4], this.cur.y1 - 150);
      yr = this.heading(this.T('Calificaciones', 'Ratings'), xr, yr + 8, 10);
      const rr = (M.REF.ratings || []).map((r) => [r.agency, r.entity + (r.holding ? ` · ${r.holding}` : ''), r.rating, M.L(r.outlook), this.date(r.date)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('agency'), M.t('entity'), M.t('rating'), M.t('outlook'), M.t('date')], body: rr, meta: rr.map(() => ['bold left', 'left small', 'left small', 'left small', 'small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.14 }, 1: { halign: 'left', cellWidth: wr * 0.3 }, 2: { halign: 'left', cellWidth: wr * 0.24 }, 3: { halign: 'left' }, 4: { cellWidth: wr * 0.11 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.4, 7, 6.6, 6.2], this.cur.y1 - 50);
      const D = M.REF.debt || {};
      const read = this.T(`**Sin deuda financiera.** ${M.L(D.note)} AM Best cambió la perspectiva a negativa en octubre de 2025 por los dividendos elevados frente al crecimiento del capital; Fitch y S&P mantienen AAA en escala nacional con perspectiva estable.`, `**No financial debt.** ${M.L(D.note)} AM Best moved the outlook to negative in October 2025 on high dividends relative to capital growth; Fitch and S&P keep national-scale AAA with stable outlooks.`);
      yr = this.bullets([read], xr, yr + 6, wr, 7.6, { gap: 2, color: MUTED, indent: 0 });
      this.noteAbove(this.T('Fuentes: informes trimestrales (RCS, margen e índice de solvencia; float, renta fija y duración de la sección de inversiones), balances SIFIC; FRED IRLTLT01MXM156N (bono M 10 años, promedio mensual); eventos relevantes (calificaciones). RSI = RIF anualizado ÷ activos invertidos promedio (definición de Quálitas).', 'Sources: quarterly reports (RCS, solvency margin and index; float, fixed income and duration from the investments section), SIFIC balance sheets; FRED IRLTLT01MXM156N (10-year M bond, monthly average); material events (ratings). RSI = annualised RIF ÷ average invested assets (Quálitas\' definition).'), Math.max(yl, yr) + 4, 7);
    }

    // ================= 12. 08 DIVIDENDS AND BUYBACKS =================
    dividendPage() {
      const M = this.M, divs = (M.MK.dividends && M.MK.dividends[M.TICK] && M.MK.dividends[M.TICK].points) || [];
      const byYear = {}; for (const [d, v] of divs) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + v;
      const lastYear = Math.max(new Date().getFullYear(), ...Object.keys(byYear).map(Number)); const years = []; for (let yv = 2016; yv <= lastYear; yv++) { years.push(String(yv)); byYear[yv] ??= 0; }
      const title = this.sectionTitle('dividends', this.T('Dividendos y recompras', 'Dividends and buybacks'));
      let y = this.page('L', `08 · ${title}`, this.T('Dividendo por acción pagado cada año (efectivo por acción registrado en bolsa) y el aprobado por cada asamblea · razón de pago sobre la utilidad por acción del año fiscal · rendimiento sobre el cierre del año', 'Dividend per share paid each year (exchange-recorded cash per share) and the amount approved at each AGM · payout on fiscal-year EPS · yield on the year-end close'));
      const gap = 20, wl = this.width() * 0.44, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const px = M.lastPx, pol = M.REF.dividendPolicy;
      const ag = (M.REF.dividends || []).slice().reverse().slice(0, 3).map((d) => `**${M.t('agm')} ${d.agmYear}${d.agmDate ? ` (${this.date(d.agmDate)})` : ''}:** Ps. ${this.n(d.dps, 2)} ${this.T('por acción', 'per share')}${d.payoutPct ? ` · ${d.payoutPct}% ${this.T('de pago', 'payout')}` : ''}${d.buybackFundMxnM ? ` · ${this.T('fondo de recompra', 'buyback fund')} Ps. ${this.n(d.buybackFundMxnM)} M` : ''}. ${M.LS(d.note)}`);
      const last = (M.REF.dividends || []).slice(-1)[0];
      if (last && px) ag.push(this.T(`**Rendimiento** del DPS aprobado en ${last.agmYear} sobre el precio actual (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * last.dps / px[1])}. Política: ${pol ? pol.lo + '–' + pol.hi + '%' : '—'} de la utilidad neta.`, `**Yield** of the DPS approved in ${last.agmYear} on the current price (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * last.dps / px[1])}. Policy: ${pol ? pol.lo + '–' + pol.hi + '%' : '—'} of net income.`));
      let yl = this.fitBullets(ag, this.cur.x0, y, wl, 150, { max: 8.2, min: 6.6 });
      yl = this.heading(this.T('Dividendo por acción por año de pago (Ps.)', 'Dividend per share by payment year (Ps.)'), this.cur.x0, yl + 4, 10);
      const h = 120;
      const img = this.chart({ type: 'bar', data: { labels: years, datasets: [{ label: M.t('dps'), data: years.map((yv) => byYear[yv]), backgroundColor: PALETTE[0], maxBarThickness: 30 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
      yl = this.image(img, this.cur.x0, yl, wl, h);
      const rows = years.map((yv) => { const fy = M.Y.find((yy) => yy.fy === +yv); const ni = fy && fy.is ? fy.is.netIncome / 1000 : null; const eps = ni && M.sharesIssued ? ni * 1e6 / M.sharesIssued : null; const pEnd = M.pointAtOrBefore(M.qPx, `${yv}-12-31`); const cf = fy && fy.cf; const paid = cf && cf.dividendsPaid != null ? -cf.dividendsPaid / 1000 : null; const buy = cf && cf.buybacks != null ? -cf.buybacks / 1000 : null; const agm = (M.REF.dividends || []).find((d) => d.agmYear === +yv); return [yv, this.n(byYear[yv], 2), agm ? this.n(agm.dps, 2) : '—', paid != null ? this.n(paid) : '—', buy != null ? this.n(buy) : '—', eps ? this.pct(100 * byYear[yv] / eps, 0) : '—', pEnd && byYear[yv] ? this.pct(100 * byYear[yv] / pEnd[1]) : '—']; });
      let yr = this.table({ y, x: xr, w: wr, head: [M.t('year'), this.T('DPS pagado (Ps.)', 'DPS paid (Ps.)'), this.T('DPS aprobado', 'DPS approved'), this.T('Dividendos pagados (Ps. M)', 'Dividends paid (Ps. M)'), this.T('Recompras (Ps. M)', 'Buybacks (Ps. M)'), M.t('payout'), M.t('yield')], body: rows, meta: rows.map(() => ['left', 'bold', '', '', '', '', '']), size: 7.8, cols: { 0: { halign: 'left' } }, pad: { top: 2, bottom: 2, left: 3.5, right: 3.5 } });
      yr = this.note(this.T('DPS = efectivo por acción registrado en bolsa en el año de pago (Yahoo Finance, Q.MX); las exhibiciones pendientes del año en curso aparecen cuando la bolsa las registra. Flujos del estado de flujos anual (SIFIC). Razón de pago = DPS del año ÷ utilidad por acción del mismo año fiscal (la política de Quálitas se mide sobre la utilidad del año anterior); rendimiento sobre el cierre del año.', 'DPS = exchange-recorded cash per share in the payment year (Yahoo Finance, Q.MX); pending instalments of the current year appear once the exchange records them. Flows from the annual cash-flow statement (SIFIC). Payout = DPS of the year ÷ EPS of the same fiscal year (Quálitas\' policy is measured on the prior year\'s income); yield on the year-end close.'), yr + 3, 7, xr, wr);
      const fys = M.Y.filter((fy) => fy.cf && fy.cf.cfo != null).slice(-8);
      const cf = fys.map((fy) => { const c = fy.cf; const ni = fy.is.netIncome / 1000, cfo = c.cfo / 1000, div = -(c.dividendsPaid || 0) / 1000, buy = -(c.buybacks || 0) / 1000, chg = c.netChangeCash != null ? c.netChangeCash / 1000 : null; return { fy: fy.fy, ni, cfo, div, buy, chg, eq: fy.bs && fy.bs.totalEquity != null ? fy.bs.totalEquity / 1000 : null }; });
      const cfRows = cf.map((r) => ['FY' + r.fy, this.n(r.ni), this.n(r.cfo), this.n(r.div), this.n(r.buy), this.n(r.div + r.buy), r.ni ? this.pct(100 * (r.div + r.buy) / r.ni, 0) : '—', r.chg == null ? '—' : this.n(r.chg), r.eq != null ? this.n(r.eq) : '—']);
      const cfMeta = cf.map((r) => ['left', '', '', '', '', 'bold', r.div + r.buy > r.ni ? 'neg' : '', this.cls(r.chg), '']);
      const yb = Math.max(yl, yr) + 12;
      let y2 = this.heading(this.T(`Utilidad, flujo operativo y distribuciones · últimos ${cf.length} años fiscales (Ps. millones)`, `Net income, operating cash flow and distributions · last ${cf.length} fiscal years (Ps. million)`), this.cur.x0, yb, 10);
      const W = this.width();
      const cfNote = this.T('Estado de flujos de efectivo anual (SIFIC): flujo operativo después de impuestos; dividendos pagados y recompras del flujo de financiamiento (signo cambiado para mostrarlos como salidas positivas). Distribuciones = dividendos + recompras; en rojo cuando superan la utilidad neta del año. Capital contable al cierre del año.', 'Annual cash-flow statement (SIFIC): operating cash flow after taxes; dividends paid and buybacks from financing flows (sign flipped to show them as positive outflows). Distributions = dividends + buybacks; red when they exceed the year\'s net income. Equity at year-end.');
      const cfH = this.measureText(cfNote, W, 7.5, 1.25);
      y2 = this.fitTable({ y: y2, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Utilidad neta', 'Net income'), this.T('Flujo operativo', 'Operating cash flow'), this.T('Dividendos pagados', 'Dividends paid'), this.T('Recompras', 'Buybacks'), this.T('Distribuciones', 'Distributions'), this.T('Distribuciones / utilidad', 'Distributions / net income'), this.T('Variación neta de efectivo', 'Net change in cash'), this.T('Capital contable', 'Equity')], body: cfRows, meta: cfMeta, cols: { 0: { halign: 'left', cellWidth: W * 0.1 } }, pad: { top: 2, bottom: 2, left: 4, right: 4 } }, [8.2, 7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - cfH - 6);
      this.noteAbove(cfNote, y2 + 4);
    }

    // ================= 13. 09 VAT ON CLAIMS =================
    vatPage() {
      const M = this.M, V = M.REF.vat || {}, title = this.sectionTitle('vat', this.T('El IVA en los siniestros', 'VAT on claims'));
      let y = this.page('L', `09 · ${title}`, this.T(`Hechos y cronología de los informes y eventos relevantes de Quálitas; referencia actualizada ${this.date(M.REF.updatedAt)}`, `Facts and timeline from Quálitas' reports and material events; reference updated ${this.date(M.REF.updatedAt)}`));
      const fmtFact = (f) => (f.fmt === 'mxnM' ? `Ps. ${this.n(f.v)} M` : f.fmt === 'bp' ? `${this.n(f.v)} ${this.T('pb', 'bp')}` : f.fmt === 'pct' ? this.pct(f.v) : this.n(f.v));
      y = this.tiles((V.facts || []).slice(0, 4).map((f) => ({ v: fmtFact(f), l: this.es ? f.label_es : f.label_en, size: 13 })), y, 56);
      const gap = 24, wl = this.width() * 0.56, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const srcNote = `${M.t('src')}: ${(M.LS(V.sources) || []).join(' · ')}.`;
      const noteH = this.measureText(srcNote, this.width(), 7.5, 1.25);
      const prose = this.sectionProse('vat');
      const chartH = 130;
      let yl = this.fitBullets(prose, this.cur.x0, y, wl, this.cur.y1 - noteH - y - chartH - 34, { max: 8.4, min: 6.6 });
      // loss ratio by quarter with the 62–65% target band
      const qs = M.Q.slice(-10).map((q) => M.quarterObj(q)); const lt = M.GD.longTerm && M.GD.longTerm.lossRatio;
      const room = this.cur.y1 - noteH - yl - 24;
      if (room > 90) {
        const h = Math.min(room - 16, chartH + 20);
        yl = this.heading(this.T(`Índice de siniestralidad por trimestre (%)${lt ? ` · objetivo ${lt.lo}–${lt.hi}%` : ''} · 4T25 incluye el cargo único`, `Loss ratio by quarter (%)${lt ? ` · target ${lt.lo}–${lt.hi}%` : ''} · 4Q25 includes the one-off charge`), this.cur.x0, yl + 4, 9.5);
        const vatQ = V.adjust && V.adjust.quarter;
        const ds = [{ type: 'bar', label: M.t('lossRatio'), data: qs.map((q) => q.kpi.lossRatio), backgroundColor: qs.map((q) => (q.id === vatQ ? RED : PALETTE[0])), maxBarThickness: 34, order: 2 }];
        if (vatQ) ds.push({ type: 'line', label: this.T('Sin el cargo del IVA', 'Excluding the VAT charge'), data: qs.map((q) => (q.id === vatQ ? M.exVat(q).kpi.lossRatio : null)), borderColor: RED, backgroundColor: '#ffffff', pointRadius: 5, pointBorderWidth: 2, pointBorderColor: RED, pointBackgroundColor: '#ffffff', showLine: false, order: 0 });
        if (lt) { ds.push({ type: 'line', label: this.T(`Objetivo ${lt.lo}%`, `Target ${lt.lo}%`), data: qs.map(() => lt.lo), borderColor: '#7f8c8d', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, order: 1 }); ds.push({ type: 'line', label: this.T(`Objetivo ${lt.hi}%`, `Target ${lt.hi}%`), data: qs.map(() => lt.hi), borderColor: '#7f8c8d', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, order: 1 }); }
        const img = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: ds }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: false, suggestedMin: 55, suggestedMax: 80, ticks: { callback: (v) => v + '%' } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
        yl = this.image(img, this.cur.x0, yl, wl, h) + 2;
      }
      let yr = this.heading(this.T('Cronología', 'Timeline'), xr, y, 10);
      const tl = (V.timeline || []).map((e) => [this.date(e.date), M.L(e)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('date'), this.T('Hecho', 'Event')], body: tl, meta: tl.map(() => ['bold left', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.2 }, 1: { halign: 'left' } }, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - noteH - 12);
      this.noteAbove(srcNote, Math.max(yl, yr) + 6);
    }

    // ================= 14. 10 INTERNATIONAL SUBSIDIARIES AND VERTICALS =================
    intlPage() {
      const M = this.M, I = M.REF.international || {}, title = this.sectionTitle('international', this.T('Subsidiarias internacionales y verticales', 'International subsidiaries and verticals'));
      const OQ = (M.OPS.quarters || []).filter((e) => e.subsidiaries && e.subsidiaries.total); const e = OQ[OQ.length - 1];
      let y = this.page('L', `10 · ${title}`, this.T(`Ficha y contexto de los informes y conferencias de Quálitas; primas y unidades del ${e ? this.qlab(e) : '—'}; referencia actualizada ${this.date(M.REF.updatedAt)}`, `Fact sheet and context from Quálitas' reports and calls; premiums and units as of ${e ? this.qlab(e) : '—'}; reference updated ${this.date(M.REF.updatedAt)}`));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const srcNote = `${M.t('src')}: ${(M.LS(I.sources) || []).join(' · ')}${e && e.source ? ` · ${this.T('informe', 'report')} ${this.qlab(e)} (${this.date(e.source.date)})` : ''}.`;
      const noteH = this.measureText(srcNote, this.width(), 7.5, 1.25);
      const prose = this.sectionProse('international');
      let yl = this.fitBullets(prose, this.cur.x0, y, wl, this.cur.y1 - noteH - y - 150, { max: 8.4, min: 6.6 });
      // subsidiaries: written premiums (latest quarter vs a year earlier) and units
      const keys = [['es', 'es_', 'sv'], ['cr', 'cr_', 'cr'], ['ic', 'ic_', 'us'], ['pe', 'pe_', 'pe'], ['co', 'co_', 'co'], ['verticals', 'verticals_', null], ['total', 'total', null]];
      const last = M.opsLast;
      const rows = e ? keys.map(([k, lk, uk]) => { const v = e.subsidiaries[k], pv = e.subsidiariesPrevY && e.subsidiariesPrevY[k], yv = e.subsidiariesYtd && e.subsidiariesYtd[k]; if (v == null) return null; const g = pv ? 100 * (v / pv - 1) : null; return { r: [M.t(lk), this.m(v), pv != null ? this.m(pv) : '—', this.pct(g, 1, true), yv != null ? this.m(yv) : '—', uk && last && last.units[uk] != null ? this.n(last.units[uk]) : '—'], m: [(k === 'total' ? 'bold' : '') + ' left', k === 'total' ? 'bold' : '', '', this.cls(g), '', ''] }; }).filter(Boolean) : [];
      yl = this.heading(this.T(`Prima emitida y ventas por subsidiaria (Ps. millones) · unidades (miles)`, `Written premiums and sales by subsidiary (Ps. million) · units (thousand)`), this.cur.x0, yl + 6, 9.5);
      if (rows.length) yl = this.fitTable({ y: yl, w: wl, head: [M.t('subsidiary'), this.qlab(e), this.qlab({ fy: e.fy - 1, q: e.q }), this.T('a/a', 'y/y'), M.ytdLabel(e.fy, e.q * 3), this.T('Unidades', 'Units')], body: rows.map((x) => x.r), meta: rows.map((x) => x.m), cols: { 0: { halign: 'left', cellWidth: wl * 0.34 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - noteH - 8);
      // right: premiums by subsidiary chart and the timeline
      let yr = this.heading(this.T(`Prima emitida por subsidiaria · ${e ? this.qlab(e) : ''} vs un año antes (Ps. millones)`, `Written premiums by subsidiary · ${e ? this.qlab(e) : ''} vs a year earlier (Ps. million)`), xr, y, 9.5);
      const ck = keys.slice(0, 6);
      const h = 135;
      if (e) { const img = this.chart({ type: 'bar', data: { labels: ck.map(([k, lk]) => M.t(lk).replace('Quálitas ', '')), datasets: [{ label: this.qlab({ fy: e.fy - 1, q: e.q }), data: ck.map(([k]) => (e.subsidiariesPrevY && e.subsidiariesPrevY[k] != null ? e.subsidiariesPrevY[k] / 1000 : null)), backgroundColor: '#c9c6bd', maxBarThickness: 26 }, { label: this.qlab(e), data: ck.map(([k]) => (e.subsidiaries[k] != null ? e.subsidiaries[k] / 1000 : null)), backgroundColor: PALETTE[0], maxBarThickness: 26 }] }, options: { scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h * 1.6)); yr = this.image(img, xr, yr, wr, h) + 6; }
      yr = this.heading(this.T('Cronología', 'Timeline'), xr, yr + 2, 10);
      const tl = (I.timeline || []).map((ev) => [this.date(ev.date), M.L(ev)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('date'), this.T('Hecho', 'Event')], body: tl, meta: tl.map(() => ['bold left', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.2 }, 1: { halign: 'left' } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6, 6.2, 5.8], this.cur.y1 - noteH - 8);
      this.noteAbove(srcNote, Math.max(yl, yr) + 6);
    }

    // ================= 15. SOURCES AND METHODOLOGY =================
    sourcesPage() {
      const M = this.M;
      let y = this.page('L', this.T('Fuentes y metodología', 'Sources and Methodology'), this.T('Todo el contenido proviene de información pública; cada bloque de datos se actualiza automáticamente con la cadencia indicada', 'All content comes from public information; each data block refreshes automatically at the cadence shown'));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const d = (iso) => this.date((iso || '').slice(0, 10));
      const rows = [
        [this.T('Estados financieros trimestrales, acumulados y anuales; unidades y primas por línea', 'Quarterly, YTD and annual statements; units and premiums by line'), this.T('diario 14:50 UTC (informes) y 23:00 UTC (mercado)', 'daily 14:50 UTC (reports) and 23:00 UTC (market)'), this.T('GitHub Actions descarga los informes trimestrales y reportes SIFIC del sitio de RI, los convierte en tablas y valida cuadres antes de publicar', 'GitHub Actions downloads the quarterly reports and SIFIC filings from the IR site, parses the tables and validates tie-outs before publishing'), d(M.FIN.generatedAt)],
        [this.T('Expectativas de la administración', 'Management expectations'), this.T('por trimestre (revisado)', 'per quarter (reviewed)'), this.T('informes y conferencias de resultados', 'reports and earnings calls'), d(M.GD.updatedAt)],
        [this.T('Comentarios de los estados financieros', 'Statement comments'), this.T('por trimestre (revisados)', 'per quarter (reviewed)'), this.T('informes y transcripciones de conferencias', 'reports and earnings-call transcripts'), d(M.CM.updatedAt)],
        [this.T('Resumen ejecutivo', 'Executive summary'), this.T('con cada reporte', 'with each report'), this.T('redactado a partir de los datos y comunicados', 'written from the data files and releases'), d(M.SUM.updatedAt)],
        [this.T('Precios, dividendos, tipo de cambio, tasas', 'Prices, dividends, FX, yields'), this.T('diario, tras el cierre de la BMV', 'daily after the BMV close'), 'Yahoo Finance · FRED (DEXMXUS, DGS10, IRLTLT01MXM156N)', d(M.MK.generatedAt)],
        [this.T('Referencia: acciones, subsidiarias, calificaciones, dividendos, IVA', 'Reference: shares, subsidiaries, ratings, dividends, VAT'), this.T('por evento', 'event-driven'), this.T('comunicados de Quálitas, revisados a mano', 'Quálitas releases, hand-reviewed'), d(M.REF.updatedAt)],
      ];
      let yl = this.heading(this.T('Cómo se actualiza cada bloque', 'How each block is refreshed'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [M.t('block'), M.t('cadence'), M.t('mechanism'), M.t('lastUpdate')], body: rows, meta: rows.map(() => ['left', 'left', 'left small', '']), size: 7.6, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 }, 1: { halign: 'left', cellWidth: wl * 0.2 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.14 } } });
      const meth = [
        this.T('Criterios contables: Quálitas reporta bajo la Circular Única de Seguros y Fianzas de la CNSF (no IFRS); las cifras se muestran en pesos nominales tal como se reportan, miles convertidos a millones. Antes de 2019 sólo las líneas principales (libro histórico).', 'Accounting: Quálitas reports under the CNSF insurance rulebook (not IFRS); figures are nominal pesos as reported, thousands shown in millions. Before 2019 only the main lines (historical workbook).'),
        this.T('Índices: adquisición = costo de adquisición ÷ prima retenida; siniestralidad = costo de siniestros ÷ prima devengada; operación = gastos ÷ prima emitida; combinado = suma de los tres (definiciones de Quálitas). Índice de solvencia = (margen + RCS) ÷ RCS.', 'Ratios: acquisition = acquisition cost ÷ retained premiums; loss = claims cost ÷ earned premiums; operating = opex ÷ written premiums; combined = the sum of the three (Quálitas\' definitions). Solvency index = (margin + RCS) ÷ RCS.'),
        this.T('Acumulado y UDM: el acumulado usa las columnas de seis, nueve o doce meses de cada informe; los últimos doce meses suman los cuatro trimestres más recientes. El balance es siempre al cierre del periodo. El cargo único del IVA del 4T25 se muestra como se reporta, con filas «memo» sin el cargo.', 'YTD and LTM: year-to-date uses the six-, nine- or twelve-month columns of each report; last twelve months adds the four most recent quarters. The balance sheet is always the period-end position. The one-off 4Q25 VAT charge is shown as reported, with "memo" rows excluding it.'),
        this.T('Próximos resultados: cuando Quálitas publica su calendario, la fecha se marca «confirmada»; mientras tanto se supone la mediana del rezago entre el cierre del trimestre y la publicación del mismo trimestre en los tres años anteriores.', 'Next results: once Quálitas publishes its calendar the date is marked "confirmed"; until then it is assumed from the median lag between quarter-end and release for the same quarter in the previous three years.'),
        this.T('Mercado: cierres diarios de Yahoo Finance (precio, sin dividendos reinvertidos); capitalización sobre acciones en circulación (emitidas menos tesorería aproximada); tipo de cambio de la Fed H.10 (FRED DEXMXUS).', 'Market: Yahoo Finance daily closes (price only, dividends not reinvested); market cap on shares outstanding (issued less approximate treasury); Fed H.10 FX rate (FRED DEXMXUS).'),
      ];
      yl = this.heading(this.T('Metodología', 'Methodology'), this.cur.x0, yl + 10, 10);
      yl = this.bullets(meth, this.cur.x0, yl, wl, 7.6, { gap: 3 });
      const srcs = (M.REF.sources || []).map((s) => [M.L(s.t), M.L(s.d), s.u.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].slice(0, 44)]);
      let yr = this.heading(this.T('Fuentes', 'Sources'), xr, y, 10);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [this.T('Fuente', 'Source'), this.T('Qué aporta', 'What it provides'), 'URL'], body: srcs, meta: srcs.map(() => ['bold left', 'left small', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wr * 0.28 } } }, [7.6, 7.2, 6.8, 6.4], this.cur.y1 - 70);
      yr = this.text(this.T(`Este documento se generó automáticamente el ${this.longDate(this.today)} desde fnam.mx/qualitas con los datos vigentes en ese momento; las cifras de mercado son del último cierre disponible y el resto de la información de los últimos informes publicados por Quálitas. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.today)} from fnam.mx/qualitas with the data current at that moment; market figures are from the latest available close and everything else from Quálitas' latest published reports. It is not investment advice.`), xr, yr + 12, wr, 8.2, 'normal', MUTED);
      this.font('bold', 9, ACCENT); this.pdf.text(tx(this.confidential()), xr, yr + 16);
    }
  }

  window.Q_PRESENT = { build, QualitasDoc };
})();
