/* Board presentation for fnam.mx/gentera: one click builds a Letter PDF from the same data the page renders.
   Every figure comes from window.G_MODEL (app.js), i.e. the calculations already on screen; the prose of sections
   09 (ConCrédito and Perú) and 10 (group lending) is read from the page itself and trimmed to bullets. The generic
   engine (pages, tables, charts, cover, footers) lives in /assets/present-core.js. Language follows the page toggle. */
(function () {
  'use strict';
  const P = window.FNAM_PRESENT;
  const { tx } = P;
  const { INK, MUTED, ACCENT, GRID, HEAD, PALETTE } = P.C;
  const RED = '#c0392b';

  async function build() {
    const M = window.G_MODEL;
    await P.run(M, [], async () => {
      const doc = new GenteraDoc(M);
      doc.cover(); doc.execSummary(); doc.tearSheet(); doc.opsPage(); doc.incomePage('q'); doc.incomePage('ltm'); doc.incomePage('fy');
      doc.guidancePage(); doc.loanBookPage(); doc.assetQualityPage(); doc.fundingPage(); doc.dividendPage(); doc.concreditoPage(); doc.groupLendingPage(); doc.sourcesPage();
      doc.finish();
    });
  }

  class GenteraDoc extends P.Doc {
    constructor(M) {
      const co = M.REF.company || {};
      super(M, { slug: 'gentera', short: co.short || 'Gentera', name: co.name || 'Gentera, S.A.B. de C.V.', tickerLine: `BMV: ${co.bmv || 'GENTERA'}`, url: 'fnam.mx/gentera', fileStem: `Gentera_${co.bmv || 'GENTERA'}`, publicSources: 'BMV, CNBV, SBS, informes trimestrales de la empresa', publicSourcesEn: 'BMV, CNBV, SBS, company quarterly releases' });
      this.next = this.nextResults();
    }
    // ----- shared pieces -----
    rel(q) { return q && q.sources && q.sources.is && q.sources.is.date; }
    sectionTitle(id, fallback) { const el = document.querySelector(`#${id} .sec-head h2 .${this.es ? 'es' : 'en'}`); return el ? el.textContent.trim() : fallback; }
    sectionProse(id) {
      return [...document.querySelectorAll(`#${id} .prose > p:not(.cap)`)].map((p) => { const span = p.querySelector(`.${this.es ? 'es' : 'en'}`); if (!span) return null; let out = ''; for (const n of span.childNodes) { const t = (n.textContent || '').replace(/\s+/g, ' '); out += n.nodeType === 1 && n.tagName === 'B' ? `**${t.trim()}** ` : t; } return out.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    }
    fitBullets(items, x, y, w, maxH, opts = {}) {
      for (let size = opts.max || 8.6; size >= (opts.min || 6.6); size -= 0.4) { if (this.measureBullets(items, w, size, { gap: 4 }) <= maxH) return this.bullets(items, x, y, w, size, { gap: 4 }); }
      let its = items.slice();
      while (its.length && this.measureBullets(its, w, opts.min || 6.6, { gap: 4 }) > maxH) { const last = its[its.length - 1]; const cut = last.replace(/\*\*/g, '').length > 160 ? last.slice(0, Math.floor(last.length * 0.8)).replace(/\s\S*$/, '') + '…' : null; if (cut && cut.split('**').length % 2 === 1) its[its.length - 1] = cut; else its.pop(); }
      return this.bullets(its, x, y, w, opts.min || 6.6, { gap: 4 });
    }
    basisLine() {
      const M = this.M, lastQ = M.lastQ;
      return this.T(`Base: informe del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · mercado al cierre del ${this.date(M.lastPx[0])}`, `Basis: ${this.qlab(lastQ)} release (${this.date(this.rel(lastQ))}) · market close ${this.date(M.lastPx[0])}`);
    }
    A(mode) { const M = this.M; if (mode === 'q') return M.quarterObj(M.lastQ); if (mode === 'fy') return M.fyObj(M.Y[M.Y.length - 1]); return M.ltmFor(M.lastQ); }
    B(mode) { const M = this.M; if (mode === 'q') { const b = M.qById[M.yoyQid(M.lastQ)]; return b && M.quarterObj(b); } if (mode === 'fy') return M.fyObj(M.Y[M.Y.length - 2]); const bq = M.qById[M.yoyQid(M.lastQ)]; return bq && M.ltmFor(bq); }
    ops(o) { const M = this.M; return o ? { ...(M.opsById[o.qid] || {}), ...(o.ops || {}) } : null; }
    // Two-axis bar + line chart with the line drawn in front (red, white-filled points); bars stack by dataset id only.
    barLine(labels, bars, line, opts = {}) {
      const ds = bars.map((b, i) => ({ type: 'bar', label: b.label, data: b.data, backgroundColor: b.color || PALETTE[i], stack: b.stack, maxBarThickness: opts.thick || 34, yAxisID: 'y', order: 2 + i }));
      if (line) ds.unshift({ type: 'line', label: line.label, data: line.data, borderColor: RED, backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: RED, pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true });
      const scales = { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, ticks: { callback: (v) => this.n(v, opts.ydec || 0) } } };
      if (line) scales.y2 = { position: 'right', grid: { display: false }, beginAtZero: false, suggestedMin: opts.y2min, suggestedMax: opts.y2max, ticks: { callback: (v) => this.n(v, opts.y2dec || 0) + (opts.y2unit == null ? '%' : opts.y2unit) } };
      return this.chart({ type: 'bar', data: { labels, datasets: ds }, options: { plugins: { legend: { display: opts.legend !== false } }, scales } }, Math.round(opts.w * 1.6), Math.round(opts.h * 1.6));
    }
    lines(labels, series, opts = {}) {
      const ds = series.map((s, i) => ({ label: s.label, data: s.data, borderColor: s.color || PALETTE[i], backgroundColor: s.color || PALETTE[i], borderWidth: s.width || 1.8, borderDash: s.dash, pointRadius: s.points == null ? 2.5 : s.points, yAxisID: s.axis || 'y', spanGaps: true }));
      const scales = { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: !!opts.zero, ticks: { callback: (v) => this.n(v, opts.ydec || 0) + (opts.yunit || '') } } };
      if (series.some((s) => s.axis === 'y2')) scales.y2 = { position: 'right', grid: { display: false }, beginAtZero: !!opts.zero2, ticks: { callback: (v) => this.n(v, opts.y2dec || 0) + (opts.y2unit || '') } };
      return this.chart({ type: 'line', data: { labels, datasets: ds }, options: { scales } }, Math.round(opts.w * 1.6), Math.round(opts.h * 1.6));
    }

    // ================= 1. COVER =================
    cover() {
      const M = this.M, lastQ = M.lastQ;
      super.cover(this.T(`Datos: informe del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}), mercado al ${this.date(M.lastPx[0])}.`, `Data: ${this.qlab(lastQ)} release (${this.date(this.rel(lastQ))}), market as of ${this.date(M.lastPx[0])}.`));
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
      const mc = px[1] * M.sharesOut;
      const divPts = ((M.MK.dividends && M.MK.dividends[M.TICK] && M.MK.dividends[M.TICK].points) || []).filter((d) => d[0] > M.addDays(px[0], -365)); const dps12 = divPts.reduce((a, d) => a + d[1], 0);
      const prevQ = M.qById[M.yoyQid(lastQ)], prevL = prevQ ? M.ltmFor(prevQ) : null;
      const g = (a, b) => (a != null && b ? 100 * (a / b - 1) : null);
      const pm = (v) => (v == null ? '' : this.pct(v, 1, true)); const yy = this.T('a/a', 'y/y');
      const eps = M.epsLtm(L), bv = M.bvps(lastQ), oq = this.ops(M.quarterObj(lastQ)), op = prevQ ? this.ops(M.quarterObj(prevQ)) : null;
      const rows = [], meta2 = [];
      const H = (s) => { rows.push([s, '']); meta2.push(['head left', 'head']); };
      const R = (l, v, c) => { rows.push([l, v]); meta2.push(['left', c || '']); };
      H(this.T('Mercado', 'Market'));
      R(this.T('Precio GENTERA (BMV)', 'GENTERA share price (BMV)'), `Ps. ${this.n(px[1], 2)}  ·  ${this.date(px[0])}`);
      R(this.T('Capitalización de mercado', 'Market capitalisation'), `Ps. ${this.n(mc / 1e9, 1)} ${this.T('mil M', 'bn')}${fx ? `  ·  US$ ${this.n(mc / fx / 1e9, 2)} ${this.T('mil M', 'bn')}` : ''}`);
      if (fx) R(this.T('Tipo de cambio usado (Fed H.10)', 'FX rate used (Fed H.10)'), `${this.n(fx, 4)} MXN/USD  ·  ${this.date(fxP[0])}`, 'muted');
      R(this.T('Acciones en circulación', 'Shares outstanding'), `${this.n(M.sharesOut)}  ·  ${M.REF.shares ? this.date(M.REF.shares.asOf) : ''}`, 'muted');
      R(this.T('Variación en el año (GENTERA · IPC)', 'Year-to-date change (GENTERA · IPC)'), `${pm(chg(px, yStart))}  ·  IPC ${pm(chg(ipcLast, ipcStart))}`, this.cls(chg(px, yStart)));
      R(this.T('Variación 12 meses (GENTERA · IPC)', '12-month change (GENTERA · IPC)'), `${pm(chg(px, yAgo))}  ·  IPC ${pm(chg(ipcLast, ipcAgo))}`, this.cls(chg(px, yAgo)));
      R(this.T('Máximo / mínimo 52 semanas', '52-week high / low'), `Ps. ${this.n(hi, 2)}  /  Ps. ${this.n(lo, 2)}`);
      const agm = (M.REF.dividends || []).slice(-1)[0]; const agmDps = M.dpsOf(agm);
      if (agm) R(this.T(`Dividendo aprobado en asamblea ${agm.agmYear} · rendimiento`, `Dividend approved at the ${agm.agmYear} AGM · yield`), `Ps. ${this.n(agm.totalMxnM)} M  ·  Ps. ${this.n(agmDps, 2)} ${this.T('por acción', 'per share')}  ·  ${this.pct(100 * agmDps / px[1])}`);
      if (dps12) R(this.T('Dividendos pagados últimos 12 meses (bolsa)', 'Dividends paid last 12 months (exchange)'), `Ps. ${this.n(dps12, 2)}  ·  ${this.pct(100 * dps12 / px[1])}`, 'muted');
      H(this.T(`Financieros (${this.qlab(lastQ)} · Ps. millones, criterios CNBV)`, `Financials (${this.qlab(lastQ)} · Ps. million, CNBV criteria)`));
      R(this.T(`Cartera bruta (${this.date(M.qEndDate(lastQ))})`, `Gross loans (${this.date(M.qEndDate(lastQ))})`), `Ps. ${this.n(lastQ.bs.loans)} M${prevQ ? `  ·  ${pm(g(lastQ.bs.loans, prevQ.bs.loans))} ${yy}` : ''}`, this.cls(prevQ && g(lastQ.bs.loans, prevQ.bs.loans)));
      if (L) R(this.T('Margen financiero últimos 12 meses · MIN', 'Financial margin last twelve months · NIM'), `Ps. ${this.n(L.is.finMargin)} M${prevL ? `  ·  ${pm(g(L.is.finMargin, prevL.is.finMargin))} ${yy}` : ''}  ·  ${this.pct(L.kpi.nim)}`);
      R(this.T(`Margen financiero ${this.qlab(lastQ)} · MIN`, `Financial margin ${this.qlab(lastQ)} · NIM`), `Ps. ${this.n(lastQ.is.finMargin)} M${prevQ ? `  ·  ${pm(g(lastQ.is.finMargin, prevQ.is.finMargin))} ${yy}` : ''}  ·  ${this.pct(lastQ.kpi.nim)}`);
      R(this.T(`Costo de riesgo · índice de etapa 3 · cobertura (${this.qlab(lastQ)})`, `Cost of risk · stage-3 ratio · coverage (${this.qlab(lastQ)})`), `${this.pct(lastQ.kpi.cor)}  ·  ${this.pct(lastQ.kpi.npl, 2)}  ·  ${this.pct(lastQ.kpi.coverage, 0)}`, 'bold');
      R(this.T(`Índice de eficiencia (${this.qlab(lastQ)} · UDM)`, `Efficiency ratio (${this.qlab(lastQ)} · LTM)`), `${this.pct(lastQ.kpi.effCalc)}  ·  ${L ? this.pct(L.kpi.effCalc) : '—'}`);
      if (L) R(this.T('Utilidad neta controladora últimos 12 meses', 'Controlling net income last twelve months'), `Ps. ${this.n(L.is.niCtrl)} M${prevL ? `  ·  ${pm(g(L.is.niCtrl, prevL.is.niCtrl))} ${yy}` : ''}`, this.cls(prevL && g(L.is.niCtrl, prevL.is.niCtrl)));
      const exa = L && M.exAdj(L); if (exa && exa.exAdj) R(this.T('  sin la cancelación de impuesto diferido del 4T25', '  excluding the 4Q25 deferred-tax write-down'), `Ps. ${this.n(exa.is.niCtrl)} M`, 'muted');
      R(this.T('UPA UDM · P/U · valor en libros por acción · P/VL', 'EPS LTM · P/E · book value per share · P/BV'), `Ps. ${this.n(eps, 2)}  ·  ${this.x(px[1] / eps)}  ·  Ps. ${this.n(bv, 2)}  ·  ${this.x(px[1] / bv)}`, 'bold');
      R(this.T('ROAE · ROE controlador · ROAA (trimestre anualizado)', 'ROAE · controlling ROE · ROAA (annualised quarter)'), `${this.pct(lastQ.kpi.roe)}  ·  ${this.pct(lastQ.kpi.roeCtrl)}  ·  ${this.pct(lastQ.kpi.roa)}`);
      R(this.T('Capital ÷ activos · ICAP Banco Compartamos · solvencia Perú', 'Equity ÷ assets · Banco Compartamos ICAP · Perú solvency'), `${this.pct(lastQ.kpi.eqAssets)}  ·  ${this.pct(oq && oq.icap)}  ·  ${this.pct(oq && oq.solvPE)}`);
      H(this.T('Operación', 'Operations'));
      if (oq) R(this.T('Clientes de crédito · personas atendidas', 'Credit clients · people served'), `${this.n(oq.clientsCred / 1e6, 2)} M${op ? `  ·  ${pm(g(oq.clientsCred, op.clientsCred))} ${yy}` : ''}  ·  ${this.n(oq.clientsTot / 1e6, 2)} M`, this.cls(op && g(oq.clientsCred, op.clientsCred)));
      if (oq) R(this.T('Saldo promedio por cliente · tasa activa (cierre)', 'Average balance per client · lending rate (period-end)'), `Ps. ${this.n(oq.avgBal)}  ·  ${this.pct(oq.yieldDisc)}`);
      const vs = M.vintagesSorted(); const cur = vs[vs.length - 1];
      if (cur) R(this.T(`Guía ${cur.fy} vigente (${this.date(cur.date)})`, `${cur.fy} guidance in force (${this.date(cur.date)})`), M.G_METRICS.filter((m) => cur.items[m] && (cur.items[m].lo != null || cur.items[m].hi != null)).slice(0, 4).map((m) => `${M.gLabel(m)} ${M.gRangeTxt(cur.items[m])}`).join(' · '), 'small');
      R(this.T('Próximos resultados', 'Next results'), this.nextText().replace(/^[^:]*:\s*/, ''), this.next && this.next.kind === 'confirmed' ? 'bold' : '');
      const noteStr = this.T(`Fuentes: Yahoo Finance (cierres diarios GENTERA.MX y ^MXX; dividendos), FRED DEXMXUS (Fed H.10), informe trimestral de Gentera ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}). Sin deuda relevante en la tenedora (el fondeo está en las subsidiarias), por lo que no se muestran deuda neta ni VE. UDM = últimos doce meses (suma de los cuatro trimestres más recientes); costo de riesgo, MIN y eficiencia recalculados sobre saldos promedio. P/U y P/VL sobre la participación controladora.`,
        `Sources: Yahoo Finance (daily closes GENTERA.MX and ^MXX; dividends), FRED DEXMXUS (Fed H.10), Gentera ${this.qlab(lastQ)} quarterly release (${this.date(this.rel(lastQ))}). No material holding-company debt (funding sits at the subsidiaries), so net debt and EV are not shown. LTM = last twelve months (sum of the four most recent quarters); cost of risk, NIM and efficiency recomputed on average balances. P/E and P/BV on the controlling interest.`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25), limitY = this.cur.y1 - noteH - 10;
      const fy = this.fitTable({ y, w: colW, head: null, body: rows, meta: meta2, cols: { 0: { cellWidth: colW * 0.48, halign: 'left' }, 1: { cellWidth: colW * 0.52 } }, pad: { top: 2.4, bottom: 2.4, left: 4, right: 4 } }, [8.4, 8, 7.7, 7.4, 7, 6.6], limitY);
      const base = M.addDays(px[0], -365);
      const series = [{ id: M.TICK, label: 'GENTERA' }, { id: '^MXX', label: 'S&P/BMV IPC' }].map((s) => ({ ...s, pts: M.px(s.id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
      const dates = series[0].pts.map((p) => p[0]);
      const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lv = null; return { label: s.label + ` (${this.T('base 100', 'rebased to 100')})`, data: dates.map((d) => { const v = map.get(d); if (v != null) lv = v; return lv != null ? 100 * lv / b : null; }), borderColor: PALETTE[i], backgroundColor: PALETTE[i], borderWidth: i === 0 ? 2.4 : 1.6 }; });
      this.heading(this.T('GENTERA vs S&P/BMV IPC · últimos 12 meses (base 100, precio sin dividendos)', 'GENTERA vs S&P/BMV IPC · last 12 months (rebased to 100, price only)'), xr, y, 10);
      const img = this.chart({ type: 'line', data: { labels: dates, datasets: ds }, options: { scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (dates[i] ? dates[i].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, 760, 470);
      const cw = this.cur.x1 - xr, chH = cw * 470 / 760;
      this.image(img, xr, y + 18, cw, chH);
      let yy2 = y + 18 + chH + 6;
      const perf = ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return [d.label.replace(/ \(.*\)/, ''), this.pct(last - 100, 1, true)]; });
      yy2 = this.table({ y: yy2, x: xr, w: cw, head: [this.T(`Rendimiento ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`, `Return ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`), this.T('Precio', 'Price')], body: perf, meta: perf.map((r) => ['left', this.cls(parseFloat(r[1].replace(',', '')))]), size: 8.5, cols: { 0: { halign: 'left' } } });
      const rem = limitY - yy2 - 30;
      if (rem > 90) {
        const b3 = M.addDays(px[0], -365 * 3); const w3 = home.filter((p) => p[0] >= b3); const step = Math.max(1, Math.ceil(w3.length / 500)); const pts3 = w3.filter((_, i) => i % step === 0 || i === w3.length - 1);
        yy2 = this.heading(this.T('Precio GENTERA (Ps.) · últimos 3 años', 'GENTERA share price (Ps.) · last 3 years'), xr, yy2 + 8, 10);
        const h3 = Math.min(rem - 22, 150);
        const img3 = this.chart({ type: 'line', data: { labels: pts3.map((p) => p[0]), datasets: [{ label: 'GENTERA', data: pts3.map((p) => p[1]), borderColor: PALETTE[0], backgroundColor: PALETTE[0] + '22', fill: true, borderWidth: 1.6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (pts3[i] ? pts3[i][0].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(cw * 1.6), Math.round(h3 * 1.6));
        yy2 = this.image(img3, xr, yy2, cw, h3);
      }
      this.noteAbove(noteStr, Math.max(fy, yy2) + 8);
    }

    // ================= 4. OPERATING AND SEGMENT METRICS (latest quarter y/y) =================
    opsPage() {
      const M = this.M, A = this.A('q'), B = this.B('q'); if (!B) return;
      const oa = this.ops(A), ob = this.ops(B), C = M.commentsFor(A, B, 'q'), ops = (C && C.ops) || {};
      const la = this.qlab(A), lb = this.qlab(B);
      let y = this.page('P', this.T(`Métricas operativas y por subsidiaria · ${la} vs ${lb}`, `Gentera Operating and Segment Metrics · ${la} vs ${lb}`), this.nextText());
      const rows = [], meta = [];
      const head = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      const row = (l, k, o = {}) => {
        const va = o.flow ? (A.is ? A.is[k] : null) : oa ? oa[k] : null, vb = o.flow ? (B.is ? B.is[k] : null) : ob ? ob[k] : null;
        if (va == null && vb == null) return;
        const d = va != null && vb != null ? va - vb : null, p = d != null && vb ? 100 * d / Math.abs(vb) : null;
        const f = (v) => (v == null ? '—' : o.pct ? this.pct(v, o.dec != null ? o.dec : 1) : this.n(v, o.dec || 0));
        const fd = d == null ? '—' : o.pct ? M.fmtPp(d) : this.n(d, o.dec || 0);
        const dc = o.inv ? M.clsInv(d) : this.cls(d);
        rows.push([l, f(va), f(vb), fd, o.pct ? '' : this.pct(p, 1, true), ops[k] ? M.L(ops[k]) : '']); meta.push([(o.cls || '') + ' left', o.cls || '', o.cls || '', dc + ' ' + (o.cls || ''), dc + ' ' + (o.cls || ''), 'left small']);
      };
      head(`${M.t('loans')} (${M.t('mxnM')})`);
      row(M.t('subMx'), 'loansMX', { cls: 'sub' }); row(M.t('subPe'), 'loansPE', { cls: 'sub' }); row(M.t('subCc'), 'loansCC', { cls: 'sub' }); row(M.t('other'), 'loansOther', { cls: 'sub' }); row(M.t('cons'), 'loans', { cls: 'bold' });
      head(this.T('Clientes y red', 'Clients and network'));
      row(this.T('Clientes de crédito (Banco)', 'Credit clients (Bank)'), 'clientsMX', { cls: 'sub' }); row(this.T('Clientes de crédito (Perú)', 'Credit clients (Perú)'), 'clientsPE', { cls: 'sub' }); row(this.T('Usuarios finales ConCrédito', 'ConCrédito end users'), 'usersCC', { cls: 'sub' });
      row(M.t('clients'), 'clientsCred', { cls: 'bold' }); row(M.t('people'), 'clientsTot');
      row(this.T('Saldo promedio por cliente (Ps.)', 'Average balance per client (Ps.)'), 'avgBal'); row(this.T('Tasa activa (Gentera, cierre)', 'Lending rate (Gentera, period-end)'), 'yieldDisc', { pct: true });
      row(this.T('Colaboradores', 'Employees'), 'employees'); row(this.T('Oficinas de servicio', 'Service offices'), 'offices', { cls: 'sub' }); row(this.T('Sucursales bancarias', 'Bank branches'), 'branches', { cls: 'sub' });
      head(`${this.T('Por subsidiaria: ingresos por intereses', 'By subsidiary: interest income')} (${M.t('mxnM')})`);
      row(M.t('subMx'), 'iiMX', { cls: 'sub', flow: true }); row(M.t('subPe'), 'iiPE', { cls: 'sub', flow: true }); row(M.t('subCc'), 'iiCC', { cls: 'sub', flow: true });
      head(`${this.T('Por subsidiaria: margen financiero', 'By subsidiary: financial margin')} (${M.t('mxnM')})`);
      row(M.t('subMx'), 'fmMX', { cls: 'sub', flow: true }); row(M.t('subPe'), 'fmPE', { cls: 'sub', flow: true }); row(M.t('subCc'), 'fmCC', { cls: 'sub', flow: true });
      head(`${this.T('Por subsidiaria: utilidad neta', 'By subsidiary: net income')} (${M.t('mxnM')})`);
      row(M.t('subMx'), 'niMX', { cls: 'sub', flow: true }); row(M.t('subPe'), 'niPE', { cls: 'sub', flow: true }); row(M.t('subCc'), 'niCC', { cls: 'sub', flow: true }); row(M.t('other'), 'niOther', { cls: 'sub', flow: true });
      head(this.T('Por subsidiaria: etapa 3, MIN, costo de fondeo y capital (%)', 'By subsidiary: stage 3, NIM, cost of funds and capital (%)'));
      row(`${M.t('npl')} · ${M.t('subMx')}`, 'nplMX', { cls: 'sub', pct: true, dec: 2, inv: true }); row(`${M.t('npl')} · ${M.t('subPe')}`, 'nplPE', { cls: 'sub', pct: true, dec: 2, inv: true }); row(`${M.t('npl')} · ${M.t('subCc')}`, 'nplCC', { cls: 'sub', pct: true, dec: 2, inv: true });
      row(`${M.t('nim')} · ${M.t('subMx')}`, 'nimMX', { cls: 'sub', pct: true }); row(`${M.t('nim')} · ${M.t('subPe')}`, 'nimPE', { cls: 'sub', pct: true }); row(`${M.t('nim')} · ${M.t('subCc')}`, 'nimCC', { cls: 'sub', pct: true });
      row(`${this.T('Costo de fondeo', 'Cost of funds')} · ${M.t('subMx')}`, 'cofMX', { cls: 'sub', pct: true, inv: true }); row(`${this.T('Costo de fondeo', 'Cost of funds')} · ${M.t('subPe')}`, 'cofPE', { cls: 'sub', pct: true, inv: true });
      row(`${M.t('icap')} · ${M.t('subMx')}`, 'icap', { cls: 'sub', pct: true }); row(`${this.T('Solvencia', 'Solvency')} · ${M.t('subPe')}`, 'solvPE', { cls: 'sub', pct: true });
      const W = this.width(), cw = { 0: { cellWidth: W * 0.25, halign: 'left' }, 1: { cellWidth: W * 0.09 }, 2: { cellWidth: W * 0.09 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.07 }, 5: { cellWidth: W * 0.42, halign: 'left' } };
      const cap = this.T(`Cartera, clientes y red al cierre del periodo; ingresos, margen y utilidad por subsidiaria sumados en el trimestre (las subsidiarias no suman el consolidado por la tenedora, Yastás, Aterna y eliminaciones). Perú en pesos al tipo de cambio de cada cierre. Comentarios (a/a) elaborados a partir de la discusión de la administración en el informe. Fuente: informe trimestral ${la} (${this.date(this.rel(M.lastQ))}).`,
        `Loans, clients and network at period-end; subsidiary income, margin and net income summed over the quarter (subsidiaries do not add to the consolidated figure because of the holding company, Yastás, Aterna and eliminations). Perú in pesos at each quarter-end rate. Comments (y/y) written from the management discussion in the release. Source: ${la} quarterly release (${this.date(this.rel(M.lastQ))}).`);
      const noteH = this.measureText(cap, W, 7.5, 1.25);
      y = this.fitTable({ y, head: [M.t('metric'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral)', 'Comments (quarterly release)')], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)), pad: { top: 1.9, bottom: 1.9, left: 3.5, right: 3.5 } }, [8.2, 7.8, 7.4, 7, 6.6, 6.2, 5.8], this.cur.y1 - noteH - 8);
      this.noteAbove(cap, y + 6);
    }

    // ================= 5–7. INCOME STATEMENT (quarter, LTM, fiscal year) =================
    incomePage(mode) {
      const M = this.M; const A = this.A(mode), B = this.B(mode); if (!A || !B) return;
      let C, la, lb, cmtNote = '';
      if (mode === 'q') { C = M.commentsFor(A, B, 'q'); la = this.qlab(A); lb = this.qlab(B); }
      else if (mode === 'fy') { C = M.commentsFor(A, B, 'fy'); la = 'FY' + A.fy; lb = 'FY' + B.fy; }
      else { const bq = M.qById[M.yoyQid(M.lastQ)]; C = M.commentsFor(this.A('q'), M.quarterObj(bq), 'q'); la = A.id; lb = B.id; cmtNote = this.T(` · Los comentarios corresponden al ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (último trimestre reportado)`, ` · Comments refer to ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (latest reported quarter)`); }
      let y = this.page('P', `${this.T('Estado de resultados de Gentera', 'Gentera Income Statement')} · ${la} vs ${lb}`, this.nextText());
      const layout = M.FIN.layout.is; const rows = [], meta = [];
      const get = (o, d) => { const src = d.kpi ? o.kpi : d.ops ? o.ops : o.is; return src && src[d.k] != null ? src[d.k] : null; };
      const COST = new Set(['cor', 'effCalc', 'effPre', 'efficOp', 'taxRate']);
      const push = (label, def, va, vb, cmt, c) => {
        const d = va != null && vb != null ? va - vb : null, p = d != null && vb ? 100 * d / Math.abs(vb) : null;
        const f = (v) => (v == null ? '—' : def.pct ? this.pct(v) : def.perShare ? this.n(v, 2) : this.n(v));
        const fd = d == null ? '—' : def.pct ? M.fmtPp(d) : def.perShare ? this.n(d, 2) : this.n(d);
        const dc = COST.has(def.k) ? M.clsInv(d) : this.cls(d);
        rows.push([label, f(va), f(vb), fd, def.pct ? '' : this.pct(p, 1, true), cmt || '']); meta.push([c + ' left', c, c, dc + ' ' + c, dc + ' ' + c, 'left small']);
      };
      const exA = M.exAdj(A), exB = M.exAdj(B);
      for (const def of layout) {
        if (def.level === 2 || def.k === 'effPre' || def.k === 'efficOp') continue;
        const va = get(A, def), vb = get(B, def);
        if (va == null && vb == null) continue;
        if (def.level === 1 && !def.kpi && Math.abs(va || 0) < 0.5 && Math.abs(vb || 0) < 0.5) continue;   // empty lines (associates, discontinued) omitted
        const c = def.level === 0 || def.bold ? 'bold' : '';
        push(M.L(def), def, va, vb, C && C.lines && C.lines[def.k] ? M.L(C.lines[def.k]) : '', c);
        if (def.k === 'niCtrl' && (exA.exAdj || exB.exAdj)) push(this.T('  Utilidad controladora sin la partida del 4T25 (memo)', '  Controlling net income excluding the 4Q25 item (memo)'), def, exA.is.niCtrl, exB.is.niCtrl, this.T(`Cancelación de Ps. ${this.n(M.REF.adjust.taxMxnM)} M de impuesto diferido de ConCrédito en el 4T25 eliminada.`, `Ps. ${this.n(M.REF.adjust.taxMxnM)} M ConCrédito deferred-tax write-down in 4Q25 removed.`), 'muted');
        if (def.k === 'eps' && (exA.exAdj || exB.exAdj)) push(this.T('  UPA sin la partida del 4T25 (memo)', '  EPS excluding the 4Q25 item (memo)'), def, exA.kpi.eps, exB.kpi.eps, '', 'muted');
      }
      const W = this.width(), cw = { 0: { cellWidth: W * 0.25, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.08 }, 5: { cellWidth: W * 0.42, halign: 'left' } };
      y = this.fitTable({ y, head: [this.T('Cifras en MXN millones', 'Figures in MXN mn'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe y conferencia)', 'Comments (release and earnings call)')], body: rows, meta, cols: cw }, [8.4, 8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 40);
      if (mode === 'fy') y = this.isFiller(y);
      const srcs = [A, B].map((o) => o.sources && o.sources.is).filter(Boolean);
      const auto = C && C.auto ? this.T(' Comentarios generados mecánicamente a partir de los impulsores (cartera, tasa, costo de fondeo, provisiones, gastos) porque este par no tiene comentarios redactados.', ' Comments generated mechanically from the drivers (loans, yield, funding cost, provisions, opex) because this pair has no hand-written comments.') : '';
      const cap = this.T(`Ps. millones, criterios contables de la CNBV, como se reporta. MIN, costo de riesgo, eficiencia, ROAA y ROAE recalculados sobre saldos promedio; UPA sobre la utilidad controladora y ${this.n(M.sharesM, 1)} M de acciones. Detalle por subsidiaria omitido${(A.derived || B.derived) ? '; periodos UDM calculados a partir de trimestres reportados' : ''}.${auto} Fuentes: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `informe trimestral de Gentera (${this.date(s.date)})`).join(' · ')}${C && C.callMeta ? ' · ' + M.L(C.callMeta) : ''}${cmtNote}.`,
        `Ps. million, CNBV accounting criteria, as reported. NIM, cost of risk, efficiency, ROAA and ROAE recomputed on average balances; EPS on controlling net income and ${this.n(M.sharesM, 1)} M shares. Subsidiary detail omitted${(A.derived || B.derived) ? '; LTM periods computed from reported quarters' : ''}.${auto} Sources: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `Gentera quarterly release (${this.date(s.date)})`).join(' · ')}${C && C.callMeta ? ' · ' + M.L(C.callMeta) : ''}${cmtNote}.`);
      this.note(cap, Math.max(y + 6, this.cur.y1 - 34));
    }
    isFiller(y) {
      const M = this.M, rem = this.cur.y1 - y - 46; if (rem < 92) return y;
      const h = Math.min(rem - 20, 190), W = this.width(), ys = M.Y.slice(-6).map((o) => M.fyObj(o));
      y = this.heading(this.T('Margen financiero y utilidad controladora (Ps. millones, eje izq.) y ROE controlador (%, eje der.) por año fiscal', 'Financial margin and controlling net income (Ps. million, left axis) and controlling ROE (%, right axis) by fiscal year'), this.cur.x0, y + 8, 10);
      const img = this.barLine(ys.map((o) => 'FY' + o.fy), [{ label: this.T('Margen financiero (eje izq.)', 'Financial margin (left axis)'), data: ys.map((o) => o.is.finMargin), color: '#c9c6bd' }, { label: this.T('Utilidad controladora (eje izq.)', 'Controlling net income (left axis)'), data: ys.map((o) => o.is.niCtrl), color: PALETTE[0] }], { label: this.T('ROE controlador (eje der.)', 'Controlling ROE (right axis)'), data: ys.map((o) => (o.kpi.roeCtrl != null ? o.kpi.roeCtrl : o.kpi.roe)) }, { w: W, h, y2min: 0, y2max: 30 });
      return this.image(img, this.cur.x0, y, W, h) + 4;
    }

    // ================= 8. MANAGEMENT GUIDANCE =================
    guidancePage() {
      const M = this.M, vs = M.vintagesSorted(); if (!vs.length) return;
      const cur = vs[vs.length - 1], act = M.gActual(cur.fy);
      let y = this.page('L', this.T(`Guía de la administración · ${cur.fy}`, `Management Guidance · ${cur.fy}`), this.T(`Publicada el ${this.date(cur.date)} (${M.t(cur.kind)}) · ${M.L(cur.source && cur.source.title)} · seguimiento con el ${act ? act.label : '—'} reportado`, `Published ${this.date(cur.date)} (${M.t(cur.kind)}) · ${M.L(cur.source && cur.source.title)} · tracked against the reported ${act ? act.label : '—'}`));
      const gap = 24, wl = this.width() * 0.57, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const withC = (it, closed) => (it ? { ...it, _closed: closed } : it);
      const ms = M.G_METRICS.filter((m) => cur.items[m]);
      const rows = ms.map((m) => { const it = withC(cur.items[m], act && act.closed), v = act ? act[m] : null, s = M.gStatus(m, it, v); const mid = m === 'eps' && act && !act.closed && it.lo != null ? ` (${this.pct(100 * v / ((it.lo + (it.hi || it.lo)) / 2), 0)} ${this.T('del punto medio', 'of midpoint')})` : ''; return [M.gLabel(m), M.gRangeTxt(it), M.L(it.text), v == null ? '—' : M.gFmt(m, v, m !== 'eps' && m !== 'npl') + mid, s ? M.t(s) : '']; });
      const rmeta = ms.map((m) => { const s = M.gStatus(m, withC(cur.items[m], act && act.closed), act ? act[m] : null); return ['bold left', 'bold', 'left small', 'bold', s === 'better' || s === 'above' || s === 'within' ? 'pos' : s ? 'neg' : '']; });
      let yl = this.fitTable({ y, w: wl, head: [M.t('metric'), M.t('range'), M.t('words'), `${M.t('actual')} ${act ? act.label : ''}`, M.t('guideStatus')], body: rows, meta: rmeta, cols: { 0: { halign: 'left', cellWidth: wl * 0.16 }, 1: { cellWidth: wl * 0.17 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.15 }, 4: { cellWidth: wl * 0.11 } }, pad: { top: 2.8, bottom: 2.8, left: 3.5, right: 3.5 } }, [8.8, 8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - 120);
      const notes = ((cur.notes && cur.notes[M.LANG]) || []).map((x) => this.autoBold(x));
      if (notes.length) { yl = this.heading(this.T('Lo que dijo la administración', 'What management said'), this.cur.x0, yl + 8, 9.5); yl = this.fitBullets(notes, this.cur.x0, yl, wl, this.cur.y1 - yl - 180, { max: 9, min: 6.6 }); }
      // ranges vs actual for EPS and loan growth
      const fys = [...new Set(vs.map((v) => v.fy))]; const room = this.cur.y1 - yl - 40;
      if (room > 110) {
        const h = Math.min(room - 16, 160), cw = (wl - 14) / 2;
        const chartFor = (m, x, yy) => {
          const has = (v) => v.items[m] && (v.items[m].lo != null || v.items[m].hi != null); const first = (fy) => vs.find((v) => v.fy === fy && has(v)), last = (fy) => vs.filter((v) => v.fy === fy && has(v)).pop();
          const rng = (v) => { if (!v) return null; const it = v.items[m]; const lo = it.lo != null ? it.lo : it.hi * 0.85, hi = it.hi != null ? it.hi : it.lo * 1.15; return [lo, hi]; };
          const acts = fys.map((fy) => { const a = M.gActual(fy); return a ? a[m] : null; });
          const vals = [].concat(...fys.map((fy) => rng(last(fy)) || []), acts.filter((v) => v != null));
          const img = this.chart({ type: 'bar', data: { labels: fys.map((fy) => 'FY' + fy), datasets: [
            { label: M.t('initial'), data: fys.map((fy) => rng(first(fy))), backgroundColor: PALETTE[0] + '55', borderColor: PALETTE[0], borderWidth: 1, borderSkipped: false, borderRadius: 3, maxBarThickness: 28 },
            { label: this.T('Última revisión', 'Latest revision'), data: fys.map((fy) => rng(last(fy))), backgroundColor: PALETTE[2] + '88', borderColor: PALETTE[2], borderWidth: 1, borderSkipped: false, borderRadius: 3, maxBarThickness: 28 },
            { type: 'line', label: `${M.t('actual')} (${this.T('año en curso = acumulado', 'current year = YTD')})`, data: acts, borderColor: RED, backgroundColor: '#ffffff', pointRadius: 5, pointBorderWidth: 2, pointBorderColor: RED, pointBackgroundColor: '#ffffff', showLine: false, order: 0 }] },
            options: { plugins: { legend: { labels: { font: { size: 9 } } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: m === 'eps', suggestedMin: m === 'eps' ? 0 : Math.floor(Math.min(...vals) - 2), suggestedMax: Math.ceil(Math.max(...vals) * (m === 'eps' ? 1.1 : 1) + (m === 'eps' ? 0 : 2)), ticks: { callback: (v) => (m === 'eps' ? this.n(v, 1) : v + '%') } } } } }, Math.round(cw * 1.6), Math.round((h - 14) * 1.6));
          this.heading(M.gLabel(m) + (m === 'eps' ? ' (Ps.)' : ''), x, yy, 9); return this.image(img, x, yy + 14, cw, h - 14);
        };
        yl = Math.max(chartFor('eps', this.cur.x0, yl + 6), chartFor('loanGrowth', this.cur.x0 + cw + 14, yl + 6)) + 2;
      }
      // right: history and track record
      let yr = this.heading(this.T('Historial de la guía (últimas versiones)', 'Guidance history (latest versions)'), xr, y, 9.5);
      const hist = vs.slice(-7).reverse(); const hm = ['eps', 'loanGrowth', 'cor', 'npl'];
      const hrows = hist.map((v) => [`${this.date(v.date)} · ${M.t(v.kind)}`, String(v.fy), ...hm.map((m) => M.gRangeTxt(v.items[m]))]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('date'), M.t('guideFy'), ...hm.map((m) => M.gLabel(m))], body: hrows, meta: hrows.map(() => ['left small', '', '', '', '', '']), cols: { 0: { halign: 'left', cellWidth: wr * 0.26 }, 1: { cellWidth: wr * 0.09 }, 2: { cellWidth: wr * 0.18 }, 3: { cellWidth: wr * 0.17 }, 4: { cellWidth: wr * 0.11 }, 5: { cellWidth: wr * 0.19 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - 150);
      const closed = [...new Set(vs.map((v) => v.fy))].filter((fy) => { const a = M.gActual(fy); return a && a.closed; });
      if (closed.length) {
        yr = this.heading(this.T('Cumplimiento en años cerrados (última guía vs real)', 'Track record in closed years (final guidance vs actual)'), xr, yr + 8, 9.5);
        const rr = closed.map((fy) => { const fin = vs.filter((v) => v.fy === fy).pop(), a = M.gActual(fy); const cells = hm.map((m) => { const it = withC(fin.items[m], true); if (!it || (it.lo == null && it.hi == null)) return '—'; return `${M.gRangeTxt(it)} → ${a[m] == null ? '—' : M.gFmt(m, a[m])}`; }); const n = M.G_METRICS.filter((m) => fin.items[m] && (fin.items[m].lo != null || fin.items[m].hi != null) && a[m] != null).length, hits = M.G_METRICS.filter((m) => ['within', 'better', 'above'].includes(M.gStatus(m, withC(fin.items[m], true), a[m]))).length; return ['FY' + fy, ...cells, `${hits}/${n}`]; });
        yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('guideFy'), ...hm.map((m) => M.gLabel(m)), M.t('hits')], body: rr, meta: rr.map(() => ['bold left', 'small', 'small', 'small', 'small', 'bold']), cols: { 0: { halign: 'left', cellWidth: wr * 0.12 }, 5: { cellWidth: wr * 0.13 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 40);
        yr = this.note(this.T('Última guía vigente de cada año cerrado contra el dato reportado (la guía 2023 es la revisada en octubre de 2023). Cumplimiento cuenta todas las métricas guiadas.', 'Last guidance in force for each closed year against the reported figure (the 2023 guidance is the October 2023 revision). The hit count covers every guided metric.'), yr + 3, 7, xr, wr);
      }
      this.noteAbove(this.T(`Fuentes: informes trimestrales y transcripciones de las conferencias de resultados de Gentera (${vs.slice(-4).map((v) => this.date(v.date)).join(', ')}). Cifras de año completo; crecimiento sobre el año fiscal anterior; etapa 3 y costo de riesgo como niveles anuales; UPA sobre la utilidad controladora y 1,579.2 M de acciones; ROE = ROE controlador como lo reporta Gentera. Año en curso comparado con el acumulado reportado (UPA del semestre, no anualizada).`, `Sources: Gentera quarterly releases and earnings-call transcripts (${vs.slice(-4).map((v) => this.date(v.date)).join(', ')}). ${M.GD.basis || ''} Current year compared with the reported year-to-date (half-year EPS, not annualised).`), Math.max(yl, yr) + 6);
    }

    // ================= 9. LOAN BOOK AND CLIENTS =================
    loanBookPage() {
      const M = this.M, qs = M.Q.slice(-12), last = M.lastQ, prev = M.qById[M.yoyQid(last)];
      const o = (q, k) => { const x = this.ops(M.quarterObj(q)); return x && x[k] != null ? x[k] : null; };
      let y = this.page('P', this.T('Cartera y clientes por subsidiaria', 'Loan Book and Clients by Subsidiary'), this.T(`Informes trimestrales de Gentera hasta el ${this.qlab(last)} (${this.date(this.rel(last))}) · cartera bruta en Ps. millones al cierre · Perú al tipo de cambio de cada cierre`, `Gentera quarterly releases to ${this.qlab(last)} (${this.date(this.rel(last))}) · gross loans in Ps. million at period-end · Perú at each quarter-end rate`));
      const W = this.width();
      y = this.heading(this.T('Cartera bruta por subsidiaria (barras apiladas, Ps. M, eje izq.) y variación a/a del consolidado (línea, %, eje der.)', 'Gross loans by subsidiary (stacked bars, Ps. M, left axis) and consolidated y/y change (line, %, right axis)'), this.cur.x0, y, 10);
      const h1 = 165;
      const yoyL = (q) => { const p = M.qById[M.yoyQid(q)]; return p && p.bs && p.bs.loans ? 100 * (q.bs.loans / p.bs.loans - 1) : null; };
      const img1 = this.barLine(qs.map((q) => this.qlab(q)), [{ label: M.t('subMx'), data: qs.map((q) => o(q, 'loansMX')), color: PALETTE[0], stack: 'l' }, { label: M.t('subPe'), data: qs.map((q) => o(q, 'loansPE')), color: PALETTE[1], stack: 'l' }, { label: M.t('subCc'), data: qs.map((q) => o(q, 'loansCC')), color: PALETTE[2], stack: 'l' }], { label: this.T('Consolidado a/a (eje der.)', 'Consolidated y/y (right axis)'), data: qs.map(yoyL) }, { w: W, h: h1, thick: 30, y2min: 0 });
      y = this.image(img1, this.cur.x0, y, W, h1) + 6;
      const gap = 20, wl = W * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap;
      const L_KEYS = [['loans', 'cons', 'bold'], ['loansMX', 'subMx', ''], ['loansPE', 'subPe', ''], ['loansCC', 'subCc', ''], ['loansOther', 'other', 'muted']];
      const lo = this.ops(M.quarterObj(last)), po = prev ? this.ops(M.quarterObj(prev)) : null;
      const lr = L_KEYS.map(([k, lk, c]) => { const v = lo[k], pv = po && po[k]; if (v == null) return null; const g = pv ? 100 * (v / pv - 1) : null; return { r: [M.t(lk), this.n(v), pv != null ? this.n(pv) : '—', this.pct(g, 1, true), k !== 'loans' ? this.pct(100 * v / lo.loans, 1) : ''], m: [c + ' left', c, c, this.cls(g) + ' ' + c, c] }; }).filter(Boolean);
      let yl = this.heading(this.T(`Cartera bruta · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (Ps. M)`, `Gross loans · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (Ps. M)`), this.cur.x0, y, 9.5);
      yl = this.fitTable({ y: yl, w: wl, head: [M.t('subsidiary'), this.qlab(last), prev ? this.qlab(prev) : '—', this.T('a/a', 'y/y'), `% ${M.t('total')}`], body: lr.map((x) => x.r), meta: lr.map((x) => x.m), cols: { 0: { halign: 'left', cellWidth: wl * 0.4 } }, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8], this.cur.y1 - 60);
      const C_KEYS = [['clientsCred', 'clients', 'bold'], ['clientsMX', 'subMx', ''], ['clientsPE', 'subPe', ''], ['usersCC', 'subCc', ''], ['clientsTot', 'people', 'bold']];
      const cr = C_KEYS.map(([k, lk, c]) => { const v = lo[k], pv = po && po[k]; if (v == null) return null; const g = pv ? 100 * (v / pv - 1) : null; return { r: [M.t(lk), this.n(v / 1e6, 2), pv != null ? this.n(pv / 1e6, 2) : '—', this.pct(g, 1, true), k !== 'clientsCred' && k !== 'clientsTot' ? this.pct(100 * v / lo.clientsCred, 1) : ''], m: [c + ' left', c, c, this.cls(g) + ' ' + c, c] }; }).filter(Boolean);
      let yr = this.heading(this.T(`Clientes · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (millones)`, `Clients · ${this.qlab(last)} vs ${prev ? this.qlab(prev) : '—'} (million)`), xr, y, 9.5);
      yr = this.fitTable({ y: yr, x: xr, w: wl, head: [M.t('subsidiary'), this.qlab(last), prev ? this.qlab(prev) : '—', this.T('a/a', 'y/y'), this.T('% clientes', '% of clients')], body: cr.map((x) => x.r), meta: cr.map((x) => x.m), cols: { 0: { halign: 'left', cellWidth: wl * 0.4 } }, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8], this.cur.y1 - 60);
      y = Math.max(yl, yr) + 8;
      // regulators' monthly series (CNBV for the bank, SBS for Perú) when the feed has them
      const mo = M.OPS.monthly || {}; const cn = ((mo.cnbv || {}).series || []).slice(-6), sb = ((mo.sbs || {}).series || []).slice(-6);
      const fm = (m) => `${m.slice(0, 4)}-${m.slice(4)}`;
      const noteStr = this.T('Cartera bruta en pesos; Perú convertido al tipo de cambio de cada cierre; "Otros" = Yastás. Clientes de crédito por subsidiaria; "personas atendidas" incluye ahorro, seguros y usuarios finales de ConCrédito. Series mensuales: CNBV (Boletín Estadístico Banca Múltiple; captación total = depósitos + interbancarios + títulos) y SBS (cuadros B-2201 y B-2362; la morosidad de la SBS no es comparable con la etapa 3).', 'Gross loans in pesos; Perú translated at each quarter-end rate; "Other" = Yastás. Credit clients by subsidiary; "people served" includes savings, insurance and ConCrédito end users. Monthly series: CNBV (commercial-bank statistical bulletin; total funding = deposits + interbank + securities) and SBS (tables B-2201 and B-2362; the SBS delinquency ratio is not comparable with stage 3).');
      const noteH = this.measureText(noteStr, W, 7.5, 1.25);
      if (cn.length || sb.length) {
        const half = (this.cur.y1 - noteH - y - 40) / 2;
        if (cn.length) { y = this.heading(this.T('CNBV · Banco Compartamos, cifras mensuales (Ps. M)', 'CNBV · Banco Compartamos, monthly figures (Ps. M)'), this.cur.x0, y, 9.5); const r1 = cn.slice().reverse().map((r) => [fm(r.month), this.n(r.loans), this.pct(r.imor, 2), this.pct(r.coverage, 0), this.n(r.captacion), this.n(r.totalAssets), this.pct(r.roa), this.pct(r.roe)]); y = this.fitTable({ y, head: [this.T('Mes', 'Month'), M.t('loans'), 'IMOR', M.t('coverage'), this.T('Captación total', 'Total funding'), this.T('Activo total', 'Total assets'), 'ROA', 'ROE'], body: r1, meta: r1.map(() => ['left', '', '', '', '', '', '', '']), cols: { 0: { halign: 'left' } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.6, 7.2, 6.8, 6.4], y + half) + 6; }
        if (sb.length) { y = this.heading(this.T('SBS · Compartamos Banco Perú, cifras mensuales (S/ M; utilidad acumulada en el año)', 'SBS · Compartamos Banco Perú, monthly figures (S/ M; year-to-date income)'), this.cur.x0, y, 9.5); const r2 = sb.slice().reverse().map((r) => [fm(r.month), this.n(r.loans), this.pct(r.morosidad, 2), this.n(r.loansNet), this.n(r.netIncome), this.n(r.equity)]); y = this.fitTable({ y, head: [this.T('Mes', 'Month'), M.t('loans'), this.T('Morosidad', 'Delinquency'), this.T('Cartera neta', 'Net loans'), this.T('Utilidad acum.', 'YTD income'), this.T('Patrimonio', 'Equity')], body: r2, meta: r2.map(() => ['left', '', '', '', '', '']), cols: { 0: { halign: 'left' } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.6, 7.2, 6.8, 6.4], this.cur.y1 - noteH - 10) + 4; }
      }
      this.noteAbove(noteStr, y + 4);
    }

    // ================= 10. ASSET QUALITY BY SUBSIDIARY =================
    assetQualityPage() {
      const M = this.M, qs = M.Q.slice(-12), last = M.lastQ;
      const o = (q, k) => { const x = this.ops(M.quarterObj(q)); return x && x[k] != null ? x[k] : null; };
      let y = this.page('P', this.T('Calidad de activos: etapa 3, provisiones y castigos', 'Asset Quality: Stage 3, Provisions and Write-Offs'), this.T(`Últimos 12 trimestres hasta el ${this.qlab(last)} · cobertura = estimación ÷ etapa 3 recalculada igual para todos los trimestres · castigos del Banco = consolidado − Perú − ConCrédito`, `Last 12 quarters to ${this.qlab(last)} · coverage = allowance ÷ stage 3 recomputed the same way for every quarter · bank write-offs = consolidated − Perú − ConCrédito`));
      const W = this.width();
      y = this.heading(this.T('Índice de etapa 3 por subsidiaria (%)', 'Stage-3 ratio by subsidiary (%)'), this.cur.x0, y, 10);
      const h1 = 150;
      const img1 = this.lines(qs.map((q) => this.qlab(q)), [{ label: M.t('cons'), data: qs.map((q) => q.kpi.npl), color: RED, width: 2.6 }, { label: M.t('subMx'), data: qs.map((q) => o(q, 'nplMX')), color: PALETTE[0] }, { label: M.t('subPe'), data: qs.map((q) => o(q, 'nplPE')), color: PALETTE[1] }, { label: M.t('subCc'), data: qs.map((q) => o(q, 'nplCC')), color: PALETTE[2] }], { w: W, h: h1, zero: true, ydec: 1, yunit: '%' });
      y = this.image(img1, this.cur.x0, y, W, h1) + 8;
      y = this.heading(this.T('Castigos por subsidiaria (barras, Ps. M, eje izq.) · costo de riesgo (línea, %, eje der.)', 'Write-offs by subsidiary (bars, Ps. M, left axis) · cost of risk (line, %, right axis)'), this.cur.x0, y, 10);
      const h2 = 150;
      const img2 = this.barLine(qs.map((q) => this.qlab(q)), [{ label: this.T('Banco (derivado)', 'Bank (derived)'), data: qs.map((q) => q.is.woMX), color: PALETTE[0], stack: 'w' }, { label: 'Perú', data: qs.map((q) => q.is.woPE), color: PALETTE[1], stack: 'w' }, { label: 'ConCrédito', data: qs.map((q) => q.is.woCC), color: PALETTE[2], stack: 'w' }], { label: `${M.t('cor')} (${this.T('eje der.', 'right axis')})`, data: qs.map((q) => q.kpi.cor) }, { w: W, h: h2, thick: 30, y2min: 0, y2dec: 0 });
      y = this.image(img2, this.cur.x0, y, W, h2) + 8;
      const q8 = M.Q.slice(-8);
      const defs = [
        [this.T('Cartera etapa 3 (Ps. M)', 'Stage-3 loans (Ps. M)'), (q) => this.n(q.bs.loans3), ''], [M.t('npl'), (q) => this.pct(q.kpi.npl, 2), 'bold'], [this.T('Estimación preventiva (Ps. M)', 'Loan-loss allowance (Ps. M)'), (q) => this.n(q.bs.allow), ''], [M.t('coverage'), (q) => this.pct(q.kpi.coverage, 0), 'bold'], [this.T('Cobertura impresa en el informe', 'Coverage as printed'), (q) => this.pct(q.kpi.coverageRep, 0), 'muted'],
        [this.T('Provisiones del trimestre (Ps. M)', 'Quarterly provisions (Ps. M)'), (q) => this.n(q.is.prov), ''], [M.t('cor'), (q) => this.pct(q.kpi.cor), 'bold'], [this.T('Castigos consolidados (Ps. M)', 'Consolidated write-offs (Ps. M)'), (q) => this.n(q.is.writeoffs), ''],
        [`${M.t('npl')} · ${M.t('subMx')}`, (q) => this.pct(o(q, 'nplMX'), 2), 'sub'], [`${M.t('npl')} · ${M.t('subPe')}`, (q) => this.pct(o(q, 'nplPE'), 2), 'sub'], [`${M.t('npl')} · ${M.t('subCc')}`, (q) => this.pct(o(q, 'nplCC'), 2), 'sub'],
      ];
      const rows = defs.map(([l, f]) => [l, ...q8.map((q) => f(q))]), meta = defs.map(([, , c]) => [c + ' left', ...q8.map(() => c)]);
      y = this.heading(this.T('Detalle por trimestre (últimos 8)', 'Quarterly detail (last 8)'), this.cur.x0, y, 10);
      const noteStr = this.T(`Fuentes: informes trimestrales de Gentera (indicadores consolidados, tabla de cartera y secciones por subsidiaria). La fila "impresa" muestra la cobertura de cada informe (otra definición hasta el 3T25); la cobertura bajó de ≈480% a ≈220% entre 2T25 y 4T25 por ese cambio de denominador, no por menos reservas. Costo de riesgo = provisiones anualizadas ÷ cartera promedio.`, `Sources: Gentera quarterly releases (consolidated indicators, portfolio table and subsidiary sections). The "as printed" row shows each release's coverage (a different definition through 3Q25); coverage fell from ≈480% to ≈220% between 2Q25 and 4Q25 because of that denominator change, not fewer reserves. Cost of risk = annualised provisions ÷ average loans.`);
      const noteH = this.measureText(noteStr, W, 7.5, 1.25);
      y = this.fitTable({ y, head: [M.t('metric'), ...q8.map((q) => this.qlab(q))], body: rows, meta, cols: { 0: { halign: 'left', cellWidth: W * 0.26 } }, pad: { top: 1.9, bottom: 1.9, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - noteH - 10);
      this.noteAbove(noteStr, y + 6);
    }

    // ================= 11. 07 FUNDING, CAPITAL AND RATINGS =================
    fundingPage() {
      const M = this.M, lastQ = M.lastQ, lp = M.qById[M.yoyQid(lastQ)], oq = this.ops(M.quarterObj(lastQ)), title = this.sectionTitle('assetquality', this.T('Calidad de activos, fondeo y capital', 'Asset quality, funding and capital'));
      let y = this.page('L', `07 · ${title}`, this.T(`Ps. millones · balance del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · calificaciones según la referencia actualizada ${this.date(M.REF.updatedAt)}`, `Ps. million · ${this.qlab(lastQ)} balance sheet (${this.date(this.rel(lastQ))}) · ratings per the reference updated ${this.date(M.REF.updatedAt)}`));
      y = this.tiles([
        { v: this.pct(lastQ.kpi.npl, 2), l: this.T(`Índice de etapa 3 consolidado · ${this.qlab(lastQ)}`, `Consolidated stage-3 ratio · ${this.qlab(lastQ)}`) },
        { v: this.pct(lastQ.kpi.coverage, 0), l: this.T('Cobertura (estimación ÷ etapa 3)', 'Coverage (allowance ÷ stage 3)') },
        { v: this.pct(lastQ.kpi.cor), l: this.T('Costo de riesgo del trimestre (anualizado)', 'Quarterly cost of risk (annualised)') },
        { v: this.pct(oq && oq.icap), l: this.T('ICAP Banco Compartamos · solvencia Perú ' + this.pct(oq && oq.solvPE), 'Banco Compartamos ICAP · Perú solvency ' + this.pct(oq && oq.solvPE)) },
        { v: this.pct(lastQ.kpi.eqAssets), l: this.T(`Capital ÷ activos (consolidado) · pasivo ÷ capital ${this.x(lastQ.kpi.leverage, 1)}`, `Equity ÷ assets (consolidated) · liabilities ÷ equity ${this.x(lastQ.kpi.leverage, 1)}`) },
      ], y);
      const gap = 24, wl = this.width() * 0.5, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const qs = M.Q.slice(-10);
      const o = (q, k) => { const x = this.ops(M.quarterObj(q)); return x && x[k] != null ? x[k] : null; };
      let yl = this.heading(this.T('Fondeo (barras apiladas, Ps. M, eje izq.) · cartera ÷ captación (línea, x, eje der.)', 'Funding (stacked bars, Ps. M, left axis) · loans ÷ deposits (line, x, right axis)'), this.cur.x0, y, 9.5);
      const h1 = 165;
      const img1 = this.barLine(qs.map((q) => this.qlab(q)), [{ label: this.T('Captación', 'Deposits'), data: qs.map((q) => q.bs.deposits), color: PALETTE[0], stack: 'f' }, { label: this.T('Certificados bursátiles', 'Debt securities'), data: qs.map((q) => q.bs.debtSec), color: PALETTE[1], stack: 'f' }, { label: this.T('Préstamos bancarios y banca de desarrollo', 'Bank and development-bank loans'), data: qs.map((q) => q.bs.bankLoans), color: PALETTE[2], stack: 'f' }, { label: this.T('Bursatilizaciones', 'Securitisations'), data: qs.map((q) => q.bs.securit), color: PALETTE[3], stack: 'f' }], { label: this.T('Cartera ÷ captación (eje der.)', 'Loans ÷ deposits (right axis)'), data: qs.map((q) => q.kpi.loansToDeposits) }, { w: wl, h: h1, thick: 30, y2min: 0, y2dec: 1, y2unit: 'x' });
      yl = this.image(img1, this.cur.x0, yl, wl, h1) + 6;
      yl = this.heading(this.T('Capital y costo de fondeo por subsidiaria (%)', 'Capital and cost of funds by subsidiary (%)'), this.cur.x0, yl + 4, 9.5);
      const h2 = Math.min(150, this.cur.y1 - yl - 60);
      if (h2 > 70) { const img2 = this.lines(qs.map((q) => this.qlab(q)), [{ label: `${M.t('icap')} · ${this.T('Banco', 'Bank')}`, data: qs.map((q) => o(q, 'icap')), color: PALETTE[0] }, { label: this.T('Solvencia · Perú', 'Solvency · Perú'), data: qs.map((q) => o(q, 'solvPE')), color: PALETTE[1] }, { label: this.T('Capital ÷ activos · consolidado', 'Equity ÷ assets · consolidated'), data: qs.map((q) => q.kpi.eqAssets), color: PALETTE[2] }, { label: this.T('Costo de fondeo · Banco', 'Cost of funds · Bank'), data: qs.map((q) => o(q, 'cofMX')), color: PALETTE[3], dash: [4, 4] }, { label: this.T('Costo de fondeo · Perú', 'Cost of funds · Perú'), data: qs.map((q) => o(q, 'cofPE')), color: RED, dash: [4, 4] }], { w: wl, h: h2, zero: true, yunit: '%' }); yl = this.image(img2, this.cur.x0, yl, wl, h2) + 4; }
      // right: funding table (last 6 quarters), ratings and the reading
      const q6 = M.Q.slice(-6);
      let yr = this.heading(this.T('Fondeo y capital por trimestre', 'Funding and capital by quarter'), xr, y, 10);
      const fr = [
        [this.T('Captación (Ps. M)', 'Deposits (Ps. M)'), ...q6.map((q) => this.n(q.bs.deposits))], [this.T('Certificados bursátiles', 'Debt securities'), ...q6.map((q) => this.n(q.bs.debtSec))], [this.T('Préstamos bancarios', 'Bank loans'), ...q6.map((q) => this.n(q.bs.bankLoans))], [this.T('Pasivo total', 'Total liabilities'), ...q6.map((q) => this.n(q.bs.totLiab))], [this.T('Capital contable', 'Total equity'), ...q6.map((q) => this.n(q.bs.totEq))],
        [this.T('Cartera ÷ captación', 'Loans ÷ deposits'), ...q6.map((q) => this.x(q.kpi.loansToDeposits, 2))], [this.T('Costo de fondeo Banco', 'Bank cost of funds'), ...q6.map((q) => this.pct(o(q, 'cofMX')))], [this.T('Costo de fondeo Perú', 'Perú cost of funds'), ...q6.map((q) => this.pct(o(q, 'cofPE')))], [`${M.t('icap')} · ${this.T('Banco', 'Bank')}`, ...q6.map((q) => this.pct(o(q, 'icap')))], [this.T('Capital ÷ activos', 'Equity ÷ assets'), ...q6.map((q) => this.pct(q.kpi.eqAssets))],
      ];
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('metric'), ...q6.map((q) => this.qlab(q))], body: fr, meta: fr.map((r, i) => [(i === 3 || i === 4 ? 'bold' : '') + ' left', ...q6.map(() => (i === 3 || i === 4 ? 'bold' : ''))]), cols: { 0: { halign: 'left', cellWidth: wr * 0.3 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.6, 7.2, 6.8, 6.4], this.cur.y1 - 170);
      yr = this.heading(this.T('Calificaciones', 'Ratings'), xr, yr + 8, 10);
      const R = M.REF.ratings || [];
      const rr = R.map((r) => [r.agency, r.entity, r.rating, M.L(r.outlook), this.date(r.date)]);
      if (rr.length) yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('agency'), M.t('entity'), M.t('rating'), M.t('outlook'), M.t('date')], body: rr, meta: rr.map(() => ['bold left', 'left small', 'left small', 'left small', 'small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.18 }, 1: { halign: 'left', cellWidth: wr * 0.26 }, 2: { halign: 'left', cellWidth: wr * 0.3 }, 3: { halign: 'left' }, 4: { cellWidth: wr * 0.11 } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.2, 6.8, 6.4, 6], this.cur.y1 - 60);
      const read = this.T(`**Sin deuda de tenedora relevante.** El fondeo es de las subsidiarias: captación de Banco Compartamos (${this.pct(100 * lastQ.bs.deposits / lastQ.bs.totLiab, 0)} del pasivo consolidado en ${this.qlab(lastQ)}), certificados bursátiles y préstamos bancarios. Capital ÷ activos ${this.pct(lastQ.kpi.eqAssets)}${lp ? ` (${this.pct(lp.kpi.eqAssets)} un año antes)` : ''}. ${M.L(M.REF.ratingsNote)}`, `**No material holding-company debt.** Funding sits at the subsidiaries: Banco Compartamos deposits (${this.pct(100 * lastQ.bs.deposits / lastQ.bs.totLiab, 0)} of consolidated liabilities at ${this.qlab(lastQ)}), certificados bursátiles and bank loans. Equity ÷ assets ${this.pct(lastQ.kpi.eqAssets)}${lp ? ` (${this.pct(lp.kpi.eqAssets)} a year earlier)` : ''}. ${M.L(M.REF.ratingsNote)}`);
      yr = this.bullets([read], xr, yr + 6, wr, 7.4, { gap: 2, color: MUTED, indent: 0 });
      this.noteAbove(this.T('Fuentes: balance general y secciones de Banco Compartamos y Compartamos Banco Perú de cada informe trimestral; calificaciones de la presentación corporativa y eventos relevantes. Cobertura y costo de riesgo recalculados; ICAP y solvencia como los reportan las subsidiarias.', 'Sources: balance sheet and the Banco Compartamos and Compartamos Banco Perú sections of each quarterly release; ratings from the corporate presentation and material-event notices. Coverage and cost of risk recomputed; ICAP and solvency as the subsidiaries report them.'), Math.max(yl, yr) + 4, 7);
    }

    // ================= 12. 08 DIVIDENDS =================
    dividendPage() {
      const M = this.M, D = (M.REF.dividends || []).slice().sort((a, b) => a.agmYear - b.agmYear), px = M.lastPx, pol = M.REF.dividendPolicy || {};
      const paid = (M.MK.dividends && M.MK.dividends[M.TICK] && M.MK.dividends[M.TICK].points) || [];
      let y = this.page('L', `08 · ${this.sectionTitle('dividends', this.T('Dividendos', 'Dividends'))}`, this.T('Dividendo aprobado en cada asamblea anual (monto y por acción) · razón de pago sobre la utilidad neta controladora del año fiscal anterior, la base de la política · rendimiento sobre el cierre del año de pago', 'Dividend approved at each annual meeting (amount and per share) · payout on the prior fiscal year\'s controlling net income, the basis of the policy · yield on the payment year\'s close'));
      const gap = 20, wl = this.width() * 0.44, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const ag = D.slice().reverse().slice(0, 3).map((d) => `**${M.t('agm')} ${d.agmYear}:** Ps. ${this.n(d.totalMxnM, 1)} M (Ps. ${this.n(M.dpsOf(d), 2)} ${this.T('por acción', 'per share')})${d.payments ? ` · ${this.T('pagos', 'payments')}: ${d.payments.map((p) => this.date(p)).join(', ')}` : ''}. ${M.LS(d.note)}`);
      const last = D[D.length - 1];
      if (last && px) ag.push(this.T(`**Rendimiento** del dividendo aprobado en ${last.agmYear} sobre el precio actual (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * M.dpsOf(last) / px[1])}. ${M.L(pol.note)}`, `**Yield** of the dividend approved in ${last.agmYear} on the current price (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * M.dpsOf(last) / px[1])}. ${M.L(pol.note)}`));
      let yl = this.fitBullets(ag, this.cur.x0, y, wl, 160, { max: 8.2, min: 6.6 });
      yl = this.heading(this.T('Dividendo por acción aprobado por asamblea (Ps.)', 'Dividend per share approved by AGM (Ps.)'), this.cur.x0, yl + 4, 10);
      const h = 115;
      const img = this.chart({ type: 'bar', data: { labels: D.map((d) => String(d.agmYear)), datasets: [{ label: M.t('dps'), data: D.map(M.dpsOf), backgroundColor: PALETTE[0], maxBarThickness: 36 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 1) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
      yl = this.image(img, this.cur.x0, yl, wl, h);
      const rows = D.map((d) => { const fy = M.Y.find((yy) => yy.fy === d.agmYear - 1); const nic = fy && fy.is ? fy.is.niCtrl : null; const dps = M.dpsOf(d); const pEnd = M.pointAtOrBefore(M.qPx, `${d.agmYear}-12-31`); const paidY = paid.filter((p) => p[0].slice(0, 4) === String(d.agmYear)).reduce((a, p) => a + p[1], 0); const yld = pEnd ? 100 * dps / pEnd[1] : px && +px[0].slice(0, 4) === d.agmYear ? 100 * dps / px[1] : null; return [String(d.agmYear), this.n(d.totalMxnM, 1), this.n(dps, 2), paidY ? this.n(paidY, 2) : '—', nic ? this.pct(100 * d.totalMxnM / nic, 0) : '—', this.pct(yld)]; });
      let yr = this.table({ y, x: xr, w: wr, head: [M.t('year'), this.T('Aprobado (Ps. M)', 'Approved (Ps. M)'), this.T('DPS aprobado (Ps.)', 'DPS approved (Ps.)'), this.T('Pagado según bolsa (Ps.)', 'Paid per exchange (Ps.)'), M.t('payout'), M.t('yield')], body: rows, meta: rows.map(() => ['left', '', 'bold', '', '', '']), size: 8, cols: { 0: { halign: 'left' } }, pad: { top: 2.2, bottom: 2.2, left: 3.5, right: 3.5 } });
      yr = this.note(this.T('Por acción = monto aprobado ÷ acciones en circulación del año. "Pagado según bolsa" = efectivo por acción registrado por Yahoo Finance en el año de pago (las exhibiciones pendientes aparecen cuando la bolsa las registra). Razón de pago sobre la utilidad neta controladora del año fiscal anterior; rendimiento sobre el cierre del año de pago (último cierre para el año en curso).', 'Per share = approved amount ÷ that year\'s shares outstanding. "Paid per exchange" = cash per share recorded by Yahoo Finance in the payment year (pending instalments appear once the exchange records them). Payout on the prior fiscal year\'s controlling net income; yield on the payment year\'s close (latest close for the current year).'), yr + 3, 7, xr, wr);
      // ten fiscal years: controlling net income, EPS, ROE, dividend approved the following year, payout, BVPS
      const fys = M.Y.slice(-10).map((o) => M.fyObj(o));
      const cf = fys.map((fy) => { const d = D.find((x) => x.agmYear === fy.fy + 1); const q4 = M.qById[`${fy.fy}Q4`]; return { fy: fy.fy, ni: fy.is.netInc, nic: fy.is.niCtrl, eps: fy.kpi && fy.kpi.eps, roe: fy.kpi && (fy.kpi.roeCtrl != null ? fy.kpi.roeCtrl : fy.kpi.roe), div: d ? d.totalMxnM : null, dps: d ? M.dpsOf(d) : null, bv: M.bvps(q4), loans: fy.bs && fy.bs.loans }; });
      const cfRows = cf.map((r) => ['FY' + r.fy, this.n(r.loans), this.n(r.ni), this.n(r.nic), this.n(r.eps, 2), this.pct(r.roe), r.div != null ? this.n(r.div, 1) : '—', r.dps != null ? this.n(r.dps, 2) : '—', r.div != null && r.nic ? this.pct(100 * r.div / r.nic, 0) : '—', r.bv != null ? this.n(r.bv, 2) : '—']);
      const yb = Math.max(yl, yr) + 12;
      let y2 = this.heading(this.T(`Utilidad, retorno y dividendo del año siguiente · últimos ${cf.length} años fiscales (Ps. millones)`, `Earnings, returns and the following year's dividend · last ${cf.length} fiscal years (Ps. million)`), this.cur.x0, yb, 10);
      const W = this.width();
      const cfNote = this.T('Utilidad neta y controladora del año fiscal; UPA sobre la utilidad controladora y las acciones del cierre; ROE controlador sobre capital promedio. Dividendo = monto aprobado en la asamblea del año siguiente (sobre la utilidad de ese año fiscal), razón de pago = dividendo ÷ utilidad controladora. Valor en libros por acción = capital controlador ÷ acciones al cierre. Acciones: 1,587.6 M en 1T22 → 1,579.2 M desde 3T23.', 'Fiscal-year net and controlling income; EPS on controlling net income and period-end shares; controlling ROE on average equity. Dividend = amount approved at the following year\'s AGM (on that fiscal year\'s income), payout = dividend ÷ controlling net income. Book value per share = controlling equity ÷ period-end shares. Shares: 1,587.6 M at 1Q22 → 1,579.2 M since 3Q23.');
      const cfH = this.measureText(cfNote, W, 7.5, 1.25);
      y2 = this.fitTable({ y: y2, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Cartera bruta', 'Gross loans'), this.T('Utilidad neta', 'Net income'), this.T('Utilidad controladora', 'Controlling net income'), this.T('UPA (Ps.)', 'EPS (Ps.)'), this.T('ROE controlador', 'Controlling ROE'), this.T('Dividendo aprobado al año siguiente', 'Dividend approved the following year'), this.T('DPS (Ps.)', 'DPS (Ps.)'), M.t('payout'), this.T('Valor en libros por acción', 'Book value per share')], body: cfRows, meta: cfRows.map(() => ['left', '', '', 'bold', 'bold', '', '', '', '', '']), cols: { 0: { halign: 'left', cellWidth: W * 0.09 } }, pad: { top: 2, bottom: 2, left: 4, right: 4 } }, [8.2, 7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - cfH - 6);
      this.noteAbove(cfNote, y2 + 4);
    }

    // ================= 13. 09 CONCRÉDITO AND THE PERÚ TURNAROUND =================
    concreditoPage() {
      const M = this.M, CC = M.REF.concredito || {}, PE = M.REF.peru || {}, title = this.sectionTitle('concredito', this.T('ConCrédito y la recuperación de Perú', 'ConCrédito and the Perú turnaround'));
      let y = this.page('L', `09 · ${title}`, this.T(`Hechos y cronología de los informes trimestrales y conferencias de Gentera; referencia actualizada ${this.date(M.REF.updatedAt)}`, `Facts and timeline from Gentera's quarterly releases and calls; reference updated ${this.date(M.REF.updatedAt)}`));
      const fmtFact = (f) => (f.fmt === 'mxnM' ? `Ps. ${this.n(f.v, f.v % 1 ? 1 : 0)} M` : f.fmt === 'pct' ? this.pct(f.v, f.v % 1 ? 2 : 0) : f.fmt === 'days' ? `${this.n(f.v)} ${this.T('días', 'days')}` : this.n(f.v));
      const facts = (CC.facts || []).filter((f) => f.v !== 1244.6 && f.v !== 747.1).slice(0, 5);
      y = this.tiles(facts.map((f) => ({ v: fmtFact(f), l: this.es ? f.label_es : f.label_en, size: 12.5 })), y, 54);
      const gap = 24, wl = this.width() * 0.55, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const srcNote = `${M.t('src')}: ${[...(CC.sources || []), ...(PE.sources || [])].join(' · ')}.`;
      const noteH = this.measureText(srcNote, this.width(), 7.5, 1.25);
      const prose = this.sectionProse('concredito');
      const peH = 62;
      let yl = this.fitBullets(prose, this.cur.x0, y, wl, this.cur.y1 - noteH - y - peH - 14, { max: 8.4, min: 6.4 });
      // Perú facts as a compact two-column table under the prose
      const pf = (PE.facts || []).map((f) => [this.es ? f.label_es : f.label_en, fmtFact(f)]);
      if (pf.length) { yl = this.heading(this.T('Perú en cifras', 'Perú in figures'), this.cur.x0, yl + 4, 9.5); yl = this.fitTable({ y: yl, w: wl, head: null, body: pf, meta: pf.map(() => ['left small', 'bold']), cols: { 0: { halign: 'left', cellWidth: wl * 0.72 } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.6, 7.2, 6.8, 6.4], this.cur.y1 - noteH - 6); }
      const half = (this.cur.y1 - noteH - y - 40) / 2;
      let yr = this.heading(this.T('Cronología ConCrédito', 'ConCrédito timeline'), xr, y, 9.5);
      const t1 = (CC.timeline || []).map((e) => [this.date(e.date), M.L(e)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: null, body: t1, meta: t1.map(() => ['bold left', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.18 }, 1: { halign: 'left' } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.4, 7, 6.6, 6.2, 5.8], y + half);
      yr = this.heading(this.T('Cronología Perú', 'Perú timeline'), xr, yr + 8, 9.5);
      const t2 = (PE.timeline || []).map((e) => [this.date(e.date), M.L(e)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: null, body: t2, meta: t2.map(() => ['bold left', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.18 }, 1: { halign: 'left' } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [7.4, 7, 6.6, 6.2, 5.8], this.cur.y1 - noteH - 8);
      this.noteAbove(srcNote, Math.max(yl, yr) + 6);
    }

    // ================= 14. 10 GROUP LENDING AND STAGE-3 PROVISIONING =================
    groupLendingPage() {
      const M = this.M, GL = M.REF.groupLending || {}, title = this.sectionTitle('grouplending', this.T('Crédito grupal y provisiones por etapa 3', 'Group lending and stage-3 provisioning'));
      let y = this.page('L', `10 · ${title}`, this.T(`Explicación del producto y de la contabilidad de la CNBV con las cifras del ${this.qlab(M.lastQ)}; referencia actualizada ${this.date(M.REF.updatedAt)}`, `Explainer of the product and of the CNBV accounting with ${this.qlab(M.lastQ)} figures; reference updated ${this.date(M.REF.updatedAt)}`));
      const fmtFact = (f) => (f.fmt === 'mxnM' ? `Ps. ${this.n(f.v)} M` : f.fmt === 'pct' ? this.pct(f.v, f.v % 1 ? 2 : 0) : f.fmt === 'days' ? `${this.n(f.v)} ${this.T('días', 'days')}` : this.n(f.v));
      y = this.tiles((GL.facts || []).slice(0, 5).map((f) => ({ v: fmtFact(f), l: this.es ? f.label_es : f.label_en, size: 12.5 })), y, 54);
      const gap = 24, wl = this.width() * 0.56, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const srcNote = `${M.t('src')}: ${(GL.sources || []).join(' · ')}.`;
      const noteH = this.measureText(srcNote, this.width(), 7.5, 1.25);
      const prose = this.sectionProse('grouplending');
      const yl = this.fitBullets(prose, this.cur.x0, y, wl, this.cur.y1 - noteH - y - 10, { max: 8.4, min: 6.2 });
      // right: stage-3 loans and allowance with coverage
      const qs = M.Q.slice(-12);
      let yr = this.heading(this.T('Cartera etapa 3 y estimación preventiva (Ps. M, eje izq.) · cobertura (%, eje der.)', 'Stage-3 loans and allowance (Ps. M, left axis) · coverage (%, right axis)'), xr, y, 9);
      const h1 = 200;
      const img1 = this.barLine(qs.map((q) => this.qlab(q)), [{ label: this.T('Cartera etapa 3', 'Stage-3 loans'), data: qs.map((q) => q.bs.loans3), color: PALETTE[1] }, { label: this.T('Estimación preventiva', 'Loan-loss allowance'), data: qs.map((q) => q.bs.allow), color: PALETTE[0] }], { label: this.T('Cobertura recalculada (eje der.)', 'Recomputed coverage (right axis)'), data: qs.map((q) => q.kpi.coverage) }, { w: wr, h: h1, thick: 16, y2min: 0 });
      yr = this.image(img1, xr, yr, wr, h1) + 6;
      const more = (GL.facts || []).slice(5).map((f) => [this.es ? f.label_es : f.label_en, fmtFact(f)]);
      const gl = M.REF.subsidiaries && M.REF.subsidiaries.find((s) => s.k === 'mx');
      if (gl) more.push([this.T('Banco Compartamos', 'Banco Compartamos'), M.L(gl.note)]);
      if (more.length) yr = this.fitTable({ y: yr + 4, x: xr, w: wr, head: null, body: more, meta: more.map(() => ['left small', 'left small bold']), cols: { 0: { halign: 'left', cellWidth: wr * 0.34 }, 1: { halign: 'left' } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.4, 7, 6.6, 6.2], this.cur.y1 - noteH - 8);
      this.noteAbove(srcNote, Math.max(yl, yr) + 6);
    }

    // ================= 15. SOURCES AND METHODOLOGY =================
    sourcesPage() {
      const M = this.M;
      let y = this.page('L', this.T('Fuentes y metodología', 'Sources and Methodology'), this.T('Todo el contenido proviene de información pública; cada bloque de datos se actualiza automáticamente con la cadencia indicada', 'All content comes from public information; each data block refreshes automatically at the cadence shown'));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const d = (iso) => this.date((iso || '').slice(0, 10));
      const mo = M.OPS.monthly || {}; const lastCn = ((mo.cnbv || {}).series || []).slice(-1)[0], lastSb = ((mo.sbs || {}).series || []).slice(-1)[0];
      const rows = [
        [this.T('Estados financieros trimestrales, acumulados y anuales; cartera, clientes y calidad por subsidiaria', 'Quarterly, YTD and annual statements; loans, clients and asset quality by subsidiary'), this.T('días hábiles 14:35 UTC', 'weekdays 14:35 UTC'), this.T('GitHub Actions descarga los informes trimestrales del sitio de RI, los convierte en tablas, prueba el parser contra el archivo y valida cuadres antes de publicar', 'GitHub Actions downloads the quarterly releases from the IR site, parses the tables, regression-tests the parser and validates tie-outs before publishing'), d(M.FIN.generatedAt)],
        [this.T('Series mensuales CNBV (Banco Compartamos) y SBS (Perú)', 'Monthly CNBV (Banco Compartamos) and SBS (Perú) series'), this.T('días hábiles, mejor esfuerzo', 'weekdays, best effort'), this.T('boletines de los reguladores', 'regulators\' bulletins'), lastCn || lastSb ? `${lastCn ? 'CNBV ' + lastCn.month : ''} ${lastSb ? 'SBS ' + lastSb.month : ''}` : '—'],
        [this.T('Guía de la administración', 'Management guidance'), this.T('por trimestre (revisado)', 'per quarter (reviewed)'), this.T('informes y transcripciones de conferencias', 'releases and earnings-call transcripts'), d(M.GD.updatedAt)],
        [this.T('Comentarios de los estados financieros', 'Statement comments'), this.T('por trimestre (revisados)', 'per quarter (reviewed)'), this.T('discusión de la administración en los informes; citas de transcripciones FactSet', 'management discussion in the releases; quotes from FactSet transcripts'), d(M.CM.updatedAt)],
        [this.T('Resumen ejecutivo', 'Executive summary'), this.T('con cada informe', 'with each release'), this.T('redactado a partir de los datos y comunicados', 'written from the data files and releases'), d(M.SUM.updatedAt)],
        [this.T('Precios, dividendos, tipo de cambio, tasas', 'Prices, dividends, FX, yields'), this.T('diario, tras el cierre de la BMV', 'daily after the BMV close'), 'Yahoo Finance · Banxico SIE · FRED (DEXMXUS, DGS10)', d(M.MK.generatedAt)],
        [this.T('Referencia: acciones, subsidiarias, dividendos, ConCrédito, Perú, calificaciones', 'Reference: shares, subsidiaries, dividends, ConCrédito, Perú, ratings'), this.T('por evento', 'event-driven'), this.T('comunicados de Gentera, revisados a mano', 'Gentera releases, hand-reviewed'), d(M.REF.updatedAt)],
      ];
      let yl = this.heading(this.T('Cómo se actualiza cada bloque', 'How each block is refreshed'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [M.t('block'), M.t('cadence'), M.t('mechanism'), M.t('lastUpdate')], body: rows, meta: rows.map(() => ['left', 'left', 'left small', '']), size: 7.4, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 }, 1: { halign: 'left', cellWidth: wl * 0.18 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.15 } } });
      const meth = [
        this.T('Criterios contables: Gentera reporta bajo los criterios de la CNBV para instituciones de crédito (convergentes con IFRS 9 desde 2022); cifras trimestrales no auditadas, en pesos nominales tal como se reportan. Perú se consolida al tipo de cambio de cada cierre.', 'Accounting: Gentera reports under the CNBV criteria for credit institutions (converged with IFRS 9 since 2022); quarterly figures unaudited, nominal pesos as reported. Perú is consolidated at each quarter-end rate.'),
        this.T('Indicadores recalculados: MIN = margen financiero anualizado ÷ cartera promedio; costo de riesgo = provisiones anualizadas ÷ cartera promedio; eficiencia = gastos ÷ ingresos de la operación después de provisiones; ROAA y ROAE sobre activos y capital promedio; cobertura = estimación preventiva ÷ cartera etapa 3 (misma definición para todos los trimestres).', 'Recomputed indicators: NIM = annualised financial margin ÷ average loans; cost of risk = annualised provisions ÷ average loans; efficiency = opex ÷ operating income after provisions; ROAA and ROAE on average assets and equity; coverage = allowance ÷ stage-3 loans (same definition for every quarter).'),
        this.T('Acumulado y UDM: el acumulado usa las columnas de seis, nueve o doce meses de cada informe; los últimos doce meses suman los cuatro trimestres más recientes. La partida no recurrente del 4T25 (cancelación de impuesto diferido de ConCrédito) se muestra como se reporta, con filas «memo» sin ella.', 'YTD and LTM: year-to-date uses the six-, nine- or twelve-month columns of each release; last twelve months adds the four most recent quarters. The non-recurring 4Q25 item (ConCrédito deferred-tax write-down) is shown as reported, with "memo" rows excluding it.'),
        this.T('Próximos resultados: cuando Gentera publica su calendario, la fecha se marca «confirmada»; mientras tanto se supone la mediana del rezago entre el cierre del trimestre y la publicación del mismo trimestre en los tres años anteriores.', 'Next results: once Gentera publishes its calendar the date is marked "confirmed"; until then it is assumed from the median lag between quarter-end and release for the same quarter in the previous three years.'),
        this.T('Mercado: cierres diarios de Yahoo Finance (precio, sin dividendos reinvertidos); capitalización sobre las acciones en circulación; tipo de cambio de la Fed H.10 (FRED DEXMXUS).', 'Market: Yahoo Finance daily closes (price only, dividends not reinvested); market cap on shares outstanding; Fed H.10 FX rate (FRED DEXMXUS).'),
      ];
      yl = this.heading(this.T('Metodología', 'Methodology'), this.cur.x0, yl + 10, 10);
      yl = this.bullets(meth, this.cur.x0, yl, wl, 7.4, { gap: 3 });
      const srcs = (M.REF.sources || []).map((s) => [M.L(s.t), M.L(s.d), s.u.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].slice(0, 44)]);
      let yr = this.heading(this.T('Fuentes', 'Sources'), xr, y, 10);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [this.T('Fuente', 'Source'), this.T('Qué aporta', 'What it provides'), 'URL'], body: srcs, meta: srcs.map(() => ['bold left', 'left small', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wr * 0.28 } } }, [7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 70);
      yr = this.text(this.T(`Este documento se generó automáticamente el ${this.longDate(this.today)} desde fnam.mx/gentera con los datos vigentes en ese momento; las cifras de mercado son del último cierre disponible y el resto de la información de los últimos informes publicados por Gentera. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.today)} from fnam.mx/gentera with the data current at that moment; market figures are from the latest available close and everything else from Gentera's latest published releases. It is not investment advice.`), xr, yr + 12, wr, 8.2, 'normal', MUTED);
      this.font('bold', 9, ACCENT); this.pdf.text(tx(this.confidential()), xr, yr + 16);
    }
  }

  window.G_PRESENT = { build, GenteraDoc };
  P.autoRun(build);
})();
