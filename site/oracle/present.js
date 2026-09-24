/* Oracle board presentation — one click builds a Letter PDF from the same data the page renders.
   Every figure comes from window.ORCL_MODEL (app.js), i.e. the calculations already on screen; nothing is
   typed in here except section prose, which is trimmed to bullets and quotes the reference data.
   The generic engine (pages, tables, charts, cover, footers) lives in /assets/present-core.js; this file
   only adds Oracle's pages. Language follows the page toggle. Figures in US$ million unless stated. */
(function () {
  'use strict';
  const P = window.FNAM_PRESENT;
  const { tx } = P;
  const { INK, MUTED, ACCENT, GRID, HEAD, PALETTE } = P.C;
  const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

  const CFG = { slug: 'oracle', short: 'Oracle', name: 'Oracle Corporation', tickerLine: 'NYSE: ORCL', url: 'fnam.mx/oracle', fileStem: 'Oracle_ORCL', publicSources: 'SEC EDGAR, comunicados y llamadas de resultados de la empresa', publicSourcesEn: 'SEC EDGAR, company releases and earnings calls' };

  // ---------- builder ----------
  async function build() {
    const M = window.ORCL_MODEL;
    await P.run(M, ['/assets/us-map.js'], async () => {
      const doc = new OracleDoc(M);
      doc.cover(); doc.execSummary(); doc.pressPage(); doc.tearSheet(); doc.opsPage(); doc.incomePage('q'); doc.incomePage('ltm'); doc.incomePage('fy');
      doc.guidancePage(); doc.rpoCloudPage(); doc.sitesPage(); doc.debtPage(); doc.obligationsPage(); doc.dividendPage(); doc.buildoutPage(); doc.rpoPage(); doc.creditPage(); doc.sourcesPage();
      doc.finish();
    });
  }

  class OracleDoc extends P.Doc {
    constructor(M) {
      super(M, { ...CFG, name: (M.REF.company && M.REF.company.name) || CFG.name });
      this.next = this.nextResults();
    }
    // ----- shared pieces -----
    bn(vM, d = 1) { return this.M.fmtBn(vM, d); }               // "US$ 19.3 bn" / "US$ 19.3 mil M" from millions
    usdM(v) { return v == null ? '—' : `US$ ${this.m(v)} M`; }
    rel(q) { return q && (q.releaseDate || (q.sources && q.sources.is && q.sources.is.date)); }
    gv() { const M = this.M; return M.GV[M.GV.length - 1]; }
    basisLine() {
      const M = this.M, lastQ = M.lastQ, gv = this.gv();
      return this.T(`Base: resultados del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · guía del ${gv ? this.date(gv.date) : '—'} · mercado al cierre del ${this.date(M.lastPx[0])}`,
        `Basis: ${this.qlab(lastQ)} results (${this.date(this.rel(lastQ))}) · guidance of ${gv ? this.date(gv.date) : '—'} · market close ${this.date(M.lastPx[0])}`);
    }
    // Emphasis for management wording that carries no **markers**: amounts with their qualifier ("at least $90 billion",
    // "$90 billion to $95 billion"), percentages, and the decisive words (raised, lowered, Investor Day…).
    boldKeys(text) {
      const s = String(text); if (s.includes('**')) return s;
      const amt = '(?:US\\$|\\$)\\s?\\d[\\d,.]*(?:\\s?(?:billion|million|bn|mil millones|mil M|millones))?';
      const pct = '[+-]?\\d+(?:[.,]\\d+)?%';
      const qual = '(?:(?:at least|not more than|no more than|more than|al menos|no más de|más de|between|entre)\\s+)?';
      const re = new RegExp(`\\(?${qual}(?:${amt}|${pct})(?:\\s?(?:to|and|a|y|-|–)\\s?(?:${amt}|${pct}))?\\)?|\\b(?:raised|lowered|cut|reaffirmed|reconfirmed|Investor Day|Analyst Day|CAGR|elevada|elevó|reducida|recortada|reafirmada|Día del Inversionista|Día del Analista|TCAC)\\b`, 'gi');
      return s.replace(re, (m) => `**${m}**`);
    }
    // Revenue lines compare on Oracle's FY2026 basis (Cloud / Software) using the company's own recast; when neither
    // side can be recast the totals compare and the split is blanked, exactly as on screen.
    mismatch(A, B) { const onNew = (o) => o && o.basis === 'fy2026_lines'; const can = (o) => o && (onNew(o) || o.recast); return A && B && onNew(A) !== onNew(B) && !(can(A) && can(B)); }

    // ================= 1. COVER =================
    cover() {
      const M = this.M, lastQ = M.lastQ, gv = this.gv();
      super.cover(this.T(`Datos: resultados del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}), guía del ${gv ? this.date(gv.date) : '—'}, mercado al ${this.date(M.lastPx[0])}.`, `Data: ${this.qlab(lastQ)} results (${this.date(this.rel(lastQ))}), guidance of ${gv ? this.date(gv.date) : '—'}, market as of ${this.date(M.lastPx[0])}.`));
    }

    // ================= 2. EXECUTIVE SUMMARY =================
    execSummary() {
      const M = this.M, secs = (M.SUM.sections || []).map((s) => ({ title: M.L(s.title), items: (s[M.LANG] || s.en || []).map((x) => this.autoBold(x)) }));
      super.execSummary(secs, this.basisLine() + (M.SUM.updatedAt ? this.T(` · redactado el ${this.date(M.SUM.updatedAt)}`, ` · written ${this.date(M.SUM.updatedAt)}`) : ''));
    }

    // ================= 2b. MARKET CONCERNS (credible press and analysts) =================
    pressPage() {
      const M = this.M, PR = M.PRESS; if (!PR || !(PR.items || []).length) return;
      let y = this.page('L', this.T('Lo que preocupa al mercado', 'What the Market Is Worried About'), this.T(`Prensa y analistas, últimos ${PR.windowDays} días · al ${this.date(PR.asOf)} · cada resumen se limita a lo que reporta la pieza; enlaces en fnam.mx/oracle (sección 00)`, `Press and analysts, last ${PR.windowDays} days · as of ${this.date(PR.asOf)} · each summary is limited to what the piece reports; links at fnam.mx/oracle (section 00)`));
      const themes = (PR.themes || []).map((th) => ({ th, items: PR.items.filter((x) => x.theme === th.id) })).filter((x) => x.items.length);
      const rows = [], meta = [];
      for (const { th, items } of themes) { rows.push([this.T(th.es, th.en), '', '', '']); meta.push(['head left', 'head', 'head', 'head']); for (const x of items) { rows.push([this.date(x.date), x.outlet, x.title, this.es ? x.es : x.en]); meta.push(['left', 'left', 'left bold', 'left small']); } }
      const W = this.width();
      y = this.fitTable({ y, head: [M.t('date'), this.T('Medio', 'Outlet'), this.T('Titular', 'Headline'), this.T('Qué reporta', 'What it reports')], body: rows, meta, cols: { 0: { cellWidth: W * 0.09, halign: 'left' }, 1: { cellWidth: W * 0.13, halign: 'left' }, 2: { cellWidth: W * 0.26, halign: 'left' }, 3: { cellWidth: W * 0.52, halign: 'left' } }, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 4 : 0)) }, [8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - 30);
      const outlets = [...new Set(PR.items.map((x) => x.outlet))].join(', ');
      this.noteAbove(this.T(`Fuentes: ${outlets}; los enlaces a cada artículo están en la página. Las declaraciones de Oracle se citan cuando la pieza las incluye. Barrido semanal (lunes).`, `Sources: ${outlets}; links to each article are on the page. Oracle's statements are quoted where the piece includes them. Weekly sweep (Mondays).`), y + 6);
    }

    // ================= 3. TEAR SHEET =================
    tearSheet() {
      const M = this.M, lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ), px = M.lastPx, orcl = M.orclPx, meta = M.MK.prices.ORCL || {};
      const sub = this.T(`Mercado: cierre del ${this.date(px[0])} (datos obtenidos ${this.stamp(meta.fetchedAt || M.MK.generatedAt)}) · Financieros: ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`, `Market: close of ${this.date(px[0])} (data fetched ${this.stamp(meta.fetchedAt || M.MK.generatedAt)}) · Financials: ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`);
      let y = this.page('L', this.T('Ficha técnica', 'Tear Sheet'), sub);
      const colW = this.width() * 0.5 - 10, xr = this.cur.x0 + colW + 20;
      const yAgo = M.pointAtOrBefore(orcl, M.addDays(px[0], -365)), yStart = M.pointAtOrBefore(orcl, `${px[0].slice(0, 4)}-01-01`);
      const spx = M.px('^GSPC'), spxLast = M.lastPoint(spx), spxAgo = spxLast && M.pointAtOrBefore(spx, M.addDays(spxLast[0], -365)), spxStart = spxLast && M.pointAtOrBefore(spx, `${spxLast[0].slice(0, 4)}-01-01`);
      const chg = (a, b) => (a && b ? 100 * (a[1] / b[1] - 1) : null);
      const r52 = M.MK.range52 || null; const w52 = orcl.filter((p) => p[0] > M.addDays(px[0], -365) && p[0] <= px[0]); const hi = r52 ? r52.high : Math.max(...w52.map((p) => p[1])), lo = r52 ? r52.low : Math.min(...w52.map((p) => p[1]));
      const mc = px[1] * M.sharesNow; const ev = mc / 1e6 + (nd ? nd.net : 0);
      const prevQ = M.qById[M.yoyQid(lastQ)], prevL = prevQ ? M.ltmFor(prevQ) : null;
      const g = (a, b) => (a != null && b ? 100 * (a / b - 1) : null);
      const pm = (v) => (v == null ? '' : this.pct(v, 1, true));
      const yy = this.T('a/a', 'y/y');
      const decl = (M.REF.dividends || []).slice(-1)[0];
      const rows = [], meta2 = [];
      const H = (s) => { rows.push([s, '']); meta2.push(['head left', 'head']); };
      const R = (l, v, c) => { rows.push([l, v]); meta2.push(['left', c || '']); };
      H(this.T('Mercado', 'Market'));
      R(this.T('Precio ORCL (NYSE)', 'ORCL share price (NYSE)'), `US$ ${this.n(px[1], 2)}  ·  ${this.date(px[0])}`);
      R(this.T('Capitalización de mercado', 'Market capitalisation'), `US$ ${this.n(mc / 1e9, 1)} ${this.T('mil M', 'bn')}`);
      R(this.T('Acciones en circulación (portada del 10-Q)', 'Shares outstanding (10-Q cover page)'), `${this.n(M.sharesNow)}  ·  ${M.MK.sharesOutstanding ? this.date(M.MK.sharesOutstanding.asOf) : ''}`, 'muted');
      R(this.T('Variación en el año (ORCL · S&P 500)', 'Year-to-date change (ORCL · S&P 500)'), `${pm(chg(px, yStart))}  ·  S&P ${pm(chg(spxLast, spxStart))}`, this.cls(chg(px, yStart)));
      R(this.T('Variación 12 meses (ORCL · S&P 500)', '12-month change (ORCL · S&P 500)'), `${pm(chg(px, yAgo))}  ·  S&P ${pm(chg(spxLast, spxAgo))}`, this.cls(chg(px, yAgo)));
      R(this.T(r52 ? 'Máximo / mínimo 52 semanas (intradía)' : 'Máximo / mínimo 52 semanas (cierres)', r52 ? '52-week high / low (intraday)' : '52-week high / low (closes)'), `US$ ${this.n(hi, 2)}${r52 ? ` (${this.date(r52.highDate)})` : ''}  /  US$ ${this.n(lo, 2)}${r52 ? ` (${this.date(r52.lowDate)})` : ''}`);
      if (decl) R(this.T(`Dividendo trimestral declarado (${this.date(decl.declared)}) · anualizado · rendimiento`, `Quarterly dividend declared (${this.date(decl.declared)}) · annualised · yield`), `US$ ${this.n(decl.dps, 2)}  ·  US$ ${this.n(decl.dps * 4, 2)}  ·  ${this.pct(100 * decl.dps * 4 / px[1])}`);
      H(this.T(`Financieros (${this.qlab(lastQ)} · US$ millones)`, `Financials (${this.qlab(lastQ)} · US$ million)`));
      if (L) R(this.T('EBITDA últimos 12 meses · margen', 'EBITDA last twelve months · margin'), `${this.usdM(L.is.ebitda)}  ·  ${this.pct(L.is.ebitdaMargin)}${prevL ? `  ·  ${pm(g(L.is.ebitda, prevL.is.ebitda))} ${yy}` : ''}`);
      R(this.T(`EBITDA ${this.qlab(lastQ)} · margen`, `EBITDA ${this.qlab(lastQ)} · margin`), `${this.usdM(lastQ.is.ebitda)}  ·  ${this.pct(lastQ.is.ebitdaMargin)}${prevQ ? `  ·  ${pm(g(lastQ.is.ebitda, prevQ.is.ebitda))} ${yy}` : ''}`);
      if (L) R(this.T('Ingresos últimos 12 meses', 'Revenue last twelve months'), `${this.usdM(L.is.revTotal)}${prevL ? `  ·  ${pm(g(L.is.revTotal, prevL.is.revTotal))} ${yy}` : ''}`);
      R(this.T(`Margen operativo ${this.qlab(lastQ)} · GAAP · No-GAAP`, `Operating margin ${this.qlab(lastQ)} · GAAP · Non-GAAP`), `${this.pct(lastQ.is.opMargin)}  ·  ${this.pct(lastQ.is.ngOpMargin)}${prevQ && prevQ.is.ngOpMargin != null ? `  (${this.n(lastQ.is.ngOpMargin - prevQ.is.ngOpMargin, 1)} pp ${yy})` : ''}`);
      if (L) R(this.T('Utilidad neta a comunes últimos 12 meses (GAAP)', 'Net income to common last twelve months (GAAP)'), `${this.usdM(L.is.netIncomeCommon)}${prevL ? `  ·  ${pm(g(L.is.netIncomeCommon, prevL.is.netIncomeCommon))} ${yy}` : ''}`);
      if (nd) R(this.T(`Deuda neta (${this.date(M.qEndDate(lastQ))})`, `Net debt (${this.date(M.qEndDate(lastQ))})`), `${this.usdM(nd.net)}  ·  ${this.T('bruta', 'gross')} ${this.usdM(nd.gross)}  ·  ${this.T('efectivo e inv.', 'cash & inv.')} ${this.usdM(nd.cash)}`);
      if (nd && L) R(this.T('Deuda neta / EBITDA UDM', 'Net debt / LTM EBITDA'), this.x(nd.net / L.is.ebitda, 2), 'bold');
      const OS = M.obligStats ? M.obligStats() : null;
      if (OS) R(this.T('Ajustado por arrendamientos / EBITDAR UDM  ·  incl. arrendamientos no iniciados', 'Lease-adjusted / LTM EBITDAR  ·  incl. uncommenced leases'), `${this.x(OS.leaseAdj, 2)}  ·  ${this.x(OS.commit, 1)} (US$ ${this.n(OS.unc / 1000, 0)} ${this.T('mil M nominal', 'bn nominal')})`);
      if (L) R(this.T('VE / EBITDA UDM  ·  P/U UDM GAAP · No-GAAP', 'EV / LTM EBITDA  ·  LTM P/E GAAP · Non-GAAP'), `${this.x(ev / L.is.ebitda)}  ·  ${L.is.epsDiluted ? this.x(px[1] / L.is.epsDiluted) : '—'} · ${L.is.ngEpsDiluted ? this.x(px[1] / L.is.ngEpsDiluted) : '—'}`);
      if (L && L.cf) R(this.T('Flujo operativo · capex · flujo libre, últimos 12 meses', 'Operating cash flow · capex · free cash flow, last twelve months'), `${this.usdM(L.cf.cfo)}  ·  ${this.usdM(-L.cf.capex)}  ·  ${this.usdM(L.cf.fcf)}`, this.cls(L.cf.fcf));
      H(this.T('Operación', 'Operations'));
      R(this.T(`RPO (cartera contratada) · ${this.qlab(lastQ)}`, `RPO (contracted backlog) · ${this.qlab(lastQ)}`), `${this.bn(lastQ.kpi.rpo, 0)}${lastQ.kpi.rpoYoyPct != null ? `  ·  ${pm(lastQ.kpi.rpoYoyPct)} ${yy}` : ''}`, 'bold');
      const oa = M.opsFor(lastQ), ob = M.opsFor(prevQ);
      if (oa && oa.cloudRev != null) R(this.T(`Ingresos de nube ${this.qlab(lastQ)} · % de ingresos`, `Cloud revenue ${this.qlab(lastQ)} · share of revenue`), `${this.usdM(oa.cloudRev)}  ·  ${this.pct(oa.cloudShare)}${ob && ob.cloudRev ? `  ·  ${pm(g(oa.cloudRev, ob.cloudRev))} ${yy}` : ''}`);
      const gv = this.gv(); if (gv) { const fq = gv.forQuarter ? M.qLabelId(gv.forQuarter) : '—'; R(this.T(`Guía vigente (${this.date(gv.date)}) · ${fq}`, `Guidance in force (${this.date(gv.date)}) · ${fq}`), `${this.T('ingresos', 'revenue')} ${M.gRange(M.GM[0], gv.items.revGrowth)}  ·  ${this.T('nube', 'cloud')} ${M.gRange(M.GM[1], gv.items.cloudGrowth)}  ·  ${this.T('UPA', 'EPS')} ${M.gRange(M.GM[2], gv.items.epsNg)}${gv.items.fyRevenue ? `  ·  FY${gv.fyGuided} ≥ ${this.bn(gv.items.fyRevenue.usdM, 0)}` : ''}`); }
      R(this.T('Próximos resultados', 'Next results'), this.nextText().replace(/^[^:]*:\s*/, ''), this.next && this.next.kind === 'confirmed' ? 'bold' : '');
      const noteStr = this.T(`Fuentes: ${meta.source || 'Nasdaq'} (cierres diarios de ORCL), FRED SP500 (S&P 500), comunicado de resultados de Oracle ${this.qlab(lastQ)} (Anexo 99.1 del 8-K, ${this.date(this.rel(lastQ))}), portada del 10-Q (acciones). VE = capitalización + deuda neta. Deuda neta = notas por pagar y otros préstamos − efectivo, equivalentes e inversiones negociables del balance publicado. EBITDA = utilidad de operación GAAP + D&A del flujo de efectivo. UDM = últimos doce meses (suma de los cuatro trimestres más recientes). Rendimiento del dividendo = dividendo trimestral × 4 ÷ precio.`,
        `Sources: ${meta.source || 'Nasdaq'} (ORCL daily closes), FRED SP500 (S&P 500), Oracle ${this.qlab(lastQ)} earnings release (Exhibit 99.1 to Form 8-K, ${this.date(this.rel(lastQ))}), 10-Q cover page (shares). EV = market cap + net debt. Net debt = notes payable and other borrowings − cash, equivalents and marketable securities from the published balance sheet. EBITDA = GAAP operating income + cash-flow D&A. LTM = last twelve months (sum of the four most recent quarters). Dividend yield = quarterly dividend × 4 ÷ price.`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25), limitY = this.cur.y1 - noteH - 10;
      const fy = this.fitTable({ y, w: colW, head: null, body: rows, meta: meta2, cols: { 0: { cellWidth: colW * 0.46, halign: 'left' }, 1: { cellWidth: colW * 0.54 } }, pad: { top: 2.6, bottom: 2.6, left: 4, right: 4 } }, [8.6, 8.3, 8, 7.7, 7.4, 7], limitY);
      // right: ORCL vs S&P 500 rebased, last 12 months
      const base = M.addDays(px[0], -365);
      const series = [{ id: 'ORCL', label: 'ORCL (NYSE)' }, { id: '^GSPC', label: 'S&P 500' }].map((s) => ({ ...s, pts: M.px(s.id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
      const dates = series[0].pts.map((p) => p[0]);
      const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lv = null; return { label: s.label + ` (${this.T('base 100', 'rebased to 100')})`, data: dates.map((d) => { const v = map.get(d); if (v != null) lv = v; return lv != null ? 100 * lv / b : null; }), borderColor: PALETTE[i], backgroundColor: PALETTE[i], borderWidth: i === 0 ? 2.4 : 1.6 }; });
      this.heading(this.T('ORCL vs S&P 500 · últimos 12 meses (base 100, precio sin dividendos)', 'ORCL vs S&P 500 · last 12 months (rebased to 100, price only)'), xr, y, 10);
      const img = this.chart({ type: 'line', data: { labels: dates, datasets: ds }, options: { scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (dates[i] ? dates[i].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, 760, 470);
      const cw = this.cur.x1 - xr, chH = cw * 470 / 760;
      this.image(img, xr, y + 18, cw, chH);
      let yy2 = y + 18 + chH + 6;
      const perf = ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return [d.label.replace(/ \(.*\)/, ''), this.pct(last - 100, 1, true)]; });
      yy2 = this.table({ y: yy2, x: xr, w: cw, head: [this.T(`Rendimiento ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`, `Return ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`), this.T('Precio', 'Price')], body: perf, meta: perf.map((r) => ['left', this.cls(parseFloat(r[1].replace(',', '')))]), size: 8.5, cols: { 0: { halign: 'left' } } });
      const rem = limitY - yy2 - 30;
      if (rem > 90) {
        const b3 = M.addDays(px[0], -365 * 3); const w3 = orcl.filter((p) => p[0] >= b3); const step = Math.max(1, Math.ceil(w3.length / 500)); const pts3 = w3.filter((_, i) => i % step === 0 || i === w3.length - 1);
        yy2 = this.heading(this.T('Precio ORCL (NYSE, US$) · últimos 3 años', 'ORCL share price (NYSE, US$) · last 3 years'), xr, yy2 + 8, 10);
        const h3 = Math.min(rem - 22, 150);
        const img3 = this.chart({ type: 'line', data: { labels: pts3.map((p) => p[0]), datasets: [{ label: 'ORCL', data: pts3.map((p) => p[1]), borderColor: PALETTE[0], backgroundColor: PALETTE[0] + '22', fill: true, borderWidth: 1.6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (pts3[i] ? pts3[i][0].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(cw * 1.6), Math.round(h3 * 1.6));
        yy2 = this.image(img3, xr, yy2, cw, h3);
      }
      this.noteAbove(noteStr, Math.max(fy, yy2) + 8);
    }

    // ================= 4. OPERATING METRICS (latest quarter y/y) =================
    opsPage() {
      const M = this.M, A = M.lastQ, B = M.qById[M.yoyQid(A)];
      const oa = M.opsFor(A), ob = M.opsFor(B), C = M.yoyCommentsFor(A, B, 'q'), ops = C && C.ops;
      const la = this.qlab(A), lb = this.qlab(B);
      let y = this.page('P', this.T(`Métricas operativas de Oracle · ${la} vs ${lb}`, `Oracle Operating Metrics · ${la} vs ${lb}`), this.nextText());
      const rows = [], meta = [];
      const head = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      const row = (l, k, o = {}) => {
        const va = oa && oa[k], vb = ob && ob[k]; if (va == null && vb == null) return;
        const d = va != null && vb != null ? va - vb : null, p = o.pct || d == null ? null : M.pctChange(va, vb);
        const f = (v) => (v == null ? '—' : o.pct ? this.pct(v) : o.d != null ? this.n(v, o.d) : this.m(v));
        const fd = d == null ? '—' : o.pct ? this.n(d, 1) + ' pp' : o.d != null ? this.n(d, o.d) : this.m(d);
        rows.push([l, f(va), f(vb), fd, o.pct ? '' : this.pct(p, 1, true), ops && ops[o.ck || k] ? M.L(ops[o.ck || k]) : '']);
        meta.push([(o.cls || '') + ' left', o.cls || '', o.cls || '', this.cls(d) + ' ' + (o.cls || ''), this.cls(d) + ' ' + (o.cls || ''), 'left small']);
      };
      head(this.T('Cartera y nube (US$ millones)', 'Backlog and cloud (US$ million)'));
      row(this.T('RPO (obligaciones de desempeño restantes)', 'RPO (remaining performance obligations)'), 'rpo', { cls: 'bold' });
      row(this.T('RPO, variación a/a declarada', 'RPO, stated y/y change'), 'rpoYoy', { pct: true, cls: 'sub' });
      row(this.T('Ingresos de nube (base AF2026)', 'Cloud revenue (FY2026 basis)'), 'cloudRev');
      row(this.T('Nube como % de los ingresos', 'Cloud as % of revenue'), 'cloudShare', { pct: true, cls: 'sub' });
      head(this.T('Rentabilidad e inversión', 'Profitability and investment'));
      row(this.T('Margen operativo No-GAAP', 'Non-GAAP operating margin'), 'ngOpMargin', { pct: true });
      row(this.T('Margen EBITDA', 'EBITDA margin'), 'ebitdaMargin', { pct: true });
      row(this.T('D&A / ingresos', 'D&A / revenue'), 'daPct', { pct: true, cls: 'sub' });
      row(this.T('Flujo operativo (US$ M)', 'Operating cash flow (US$ M)'), 'cfo');
      row(this.T('Capex (US$ M)', 'Capex (US$ M)'), 'capex');
      row(this.T('Capex / ingresos', 'Capex / revenue'), 'capexPct', { pct: true, cls: 'sub' });
      row(this.T('Flujo libre (US$ M)', 'Free cash flow (US$ M)'), 'fcf', { cls: 'bold' });
      head(this.T('Por acción', 'Per share'));
      row(this.T('UPA diluida No-GAAP (US$)', 'Non-GAAP diluted EPS (US$)'), 'epsNg', { d: 2 });
      row(this.T('Dividendo declarado por acción (US$)', 'Dividend declared per share (US$)'), 'dps', { d: 2 });
      row(this.T('Acciones diluidas (millones)', 'Diluted shares (millions)'), 'shares', { d: 0 });
      const W = this.width(), cw = { 0: { cellWidth: W * 0.24, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.085 }, 4: { cellWidth: W * 0.085 }, 5: { cellWidth: W * 0.42, halign: 'left' } };
      y = this.fitTable({ y, head: [M.t('metric'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T(`Comentarios · comunicado y llamada del ${la}`, `Comments · ${la} release and call`)], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)) }, [8.6, 8.2, 7.8, 7.4, 7], this.cur.y1 - 150);
      // cloud revenue by quarter on the FY2026 basis in the remaining space
      const qs = M.Q.filter((q) => M.revOnNewBasis(q)).slice(-10);
      const remaining = this.cur.y1 - y - 30;
      if (remaining > 110 && qs.length > 2) {
        const h = Math.min(remaining - 26, 200);
        y = this.heading(this.T('Ingresos de nube por trimestre (US$ millones, base AF2026) y variación a/a', 'Cloud revenue by quarter (US$ million, FY2026 basis) and YoY change'), this.cur.x0, y + 10, 10);
        const cloud = (q) => { const r = M.revOnNewBasis(q); return r ? r.revCloud : null; };
        const yoy = (q) => { const p = M.qById[M.yoyQid(q)]; const a = cloud(q), b = p && cloud(p); return a != null && b ? 100 * (a / b - 1) : null; };
        const img = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [{ type: 'line', label: this.T('Variación a/a, % (eje der.)', 'YoY change, % (right axis)'), data: qs.map(yoy), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true }, { type: 'bar', label: this.T('Ingresos de nube (US$ M, eje izq.)', 'Cloud revenue (US$ M, left axis)'), data: qs.map(cloud), backgroundColor: PALETTE[0], yAxisID: 'y', maxBarThickness: 40, order: 1 }] }, options: { scales: { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => this.n(v, 0) + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
        y = this.image(img, this.cur.x0, y, W, h) + 4;
      }
      const cap = this.T(`RPO como lo publica Oracle en cada comunicado (redondeado a miles de millones). Ingresos de nube en la base de presentación del AF2026 (Nube / Software): nativos desde el 1T26, reexpresados por Oracle para el AF2025 y no disponibles antes. EBITDA = utilidad de operación GAAP + D&A del flujo de efectivo; capex y flujo libre del trimestre discreto. Fuentes: comunicado de resultados ${la} (Anexo 99.1 del 8-K, ${this.date(this.rel(A))})${C && C.call ? ' · ' + M.L(C.call) : ''}.`,
        `RPO as Oracle publishes it in each release (rounded to billions). Cloud revenue on the FY2026 presentation basis (Cloud / Software): native from 1Q26, recast by Oracle for FY2025 and unavailable earlier. EBITDA = GAAP operating income + cash-flow D&A; capex and free cash flow for the discrete quarter. Sources: ${la} earnings release (Exhibit 99.1 to Form 8-K, ${this.date(this.rel(A))})${C && C.call ? ' · ' + M.L(C.call) : ''}.`);
      this.note(cap, Math.max(y, this.cur.y1 - 34));
    }

    // ================= 5–7. INCOME STATEMENT (quarter, LTM, fiscal year) =================
    incomePage(mode) {
      const M = this.M; let A, B, C, la, lb, cmtNote = '';
      if (mode === 'q') { A = M.lastQ; B = M.qById[M.yoyQid(A)]; C = M.yoyCommentsFor(A, B, 'q'); la = this.qlab(A); lb = this.qlab(B); }
      else if (mode === 'fy') { A = M.Y[M.Y.length - 1]; B = M.Y[M.Y.length - 2]; C = M.yoyCommentsFor(A, B, 'fy'); la = M.fyLabel(A.fy); lb = M.fyLabel(B.fy); }
      else { A = M.ltmFor(M.lastQ); const bq = M.qById[M.yoyQid(M.lastQ)]; B = bq && M.ltmFor(bq); C = M.yoyCommentsFor(M.lastQ, bq, 'q'); la = A.id; lb = B ? B.id : '—'; cmtNote = this.T(` · Los comentarios corresponden al ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (último trimestre reportado)`, ` · Comments refer to ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (latest reported quarter)`); }
      if (!A || !B) return;
      let y = this.page('P', `${this.T('Estado de resultados de Oracle', 'Oracle Income Statement')} · ${la} vs ${lb}`, this.nextText());
      const layout = M.FIN.layout.is; const rows = [], meta = [], mis = this.mismatch(A, B); let usedRecast = false, split = false;
      const H = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      for (const def of layout) {
        if (def.level === 2 || def.group === 'ng') continue;                       // cost and Non-GAAP reconciliation detail collapsed, as on screen
        if (def.k === 'ngOpIncome') H(this.T('No-GAAP (según la definición de Oracle)', 'Non-GAAP (as Oracle defines it)'));
        if (def.k === 'da') H('EBITDA');
        const va = M.revValue(A, B, def.k), vb = M.revValue(B, A, def.k);
        if (M.REV_LINES.includes(def.k) && ((va != null && va !== A.is[def.k]) || (vb != null && vb !== B.is[def.k]))) usedRecast = true;
        if (va == null && vb == null) continue;
        const sp = mis && (def.k === 'revCloud' || def.k === 'revSoftware'); if (sp) split = true;
        const d = !sp && va != null && vb != null ? va - vb : null, p = d == null ? null : M.pctChange(va, vb);
        const f = (v) => (v == null ? '—' : def.pct ? this.pct(v) : def.perShare ? this.n(v, 2) : def.count ? this.n(v, 0) : this.m(v));
        const fd = sp ? '†' : d == null ? '—' : def.pct ? this.n(d, 1) + ' pp' : def.perShare ? this.n(d, 2) : def.count ? this.n(d, 0) : this.m(d);
        const c = def.level === 0 ? 'bold' : '';
        rows.push([M.L(def) + (sp ? ' †' : ''), f(va), f(vb), fd, def.pct || sp ? '' : this.pct(p, 1, true), C && C.lines && C.lines[def.k] ? M.L(C.lines[def.k]) : '']);
        meta.push([c + ' left', c, c, this.cls(d) + ' ' + c, this.cls(d) + ' ' + c, 'left small']);
      }
      const cq = mode === 'fy' ? la : this.qlab(mode === 'ltm' ? M.lastQ : A);
      const W = this.width(), cw = { 0: { cellWidth: W * 0.25, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.075 }, 5: { cellWidth: W * 0.425, halign: 'left' } };
      y = this.fitTable({ y, head: [this.T('Cifras en US$ millones', 'Figures in US$ mn'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T(`Comentarios · comunicado y llamada del ${cq}${mode === 'ltm' ? ' (último trimestre reportado)' : ''}`, `Comments · ${cq} release and call${mode === 'ltm' ? ' (latest reported quarter)' : ''}`)], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)) }, [8.4, 8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 40);
      if (mode === 'fy') y = this.isFiller(y);
      const srcs = [A, B].map((o) => o.sources && o.sources.is).filter(Boolean);
      const cap = this.T(`US$ millones, GAAP salvo el bloque No-GAAP; detalle del costo de ingresos y de la conciliación No-GAAP omitido${(A.derived || B.derived) ? '; periodos UDM calculados a partir de trimestres reportados' : ''}${usedRecast ? '; líneas de ingresos en la base AF2026 (Nube / Software) usando la reexpresión de Oracle' : ''}${split ? '; † bases de presentación distintas sin reexpresión: se muestran las cifras, no la variación' : ''}. Fuentes: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `comunicado de resultados de Oracle (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`,
        `US$ million, GAAP except the Non-GAAP block; cost-of-revenues and Non-GAAP reconciliation detail omitted${(A.derived || B.derived) ? '; LTM periods computed from reported quarters' : ''}${usedRecast ? '; revenue lines on the FY2026 basis (Cloud / Software) using Oracle\'s recast' : ''}${split ? '; † different presentation bases with no recast: figures shown, variance blanked' : ''}. Sources: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `Oracle earnings release (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`);
      this.note(cap, Math.max(y + 6, this.cur.y1 - 34));
    }
    // Revenue, EBITDA and margin by fiscal year when the FY page has room left.
    isFiller(y) {
      const M = this.M, rem = this.cur.y1 - y - 46; if (rem < 92) return y;
      const h = Math.min(rem - 20, 190), W = this.width(), ys = M.Y.slice(-6);
      y = this.heading(this.T('Ingresos, EBITDA (US$ mil millones) y margen EBITDA por año fiscal', 'Revenue, EBITDA (US$ billion) and EBITDA margin by fiscal year'), this.cur.x0, y + 8, 10);
      const img = this.chart({ type: 'bar', data: { labels: ys.map((o) => M.fyLabel(o.fy)), datasets: [{ type: 'bar', label: this.T('Ingresos (eje izq.)', 'Revenue (left axis)'), data: ys.map((o) => o.is.revTotal / 1000), backgroundColor: '#c9c6bd', maxBarThickness: 34, order: 2 }, { type: 'bar', label: 'EBITDA (' + this.T('eje izq.', 'left axis') + ')', data: ys.map((o) => o.is.ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 34, order: 1 }, { type: 'line', label: this.T('Margen EBITDA, % (eje der.)', 'EBITDA margin, % (right axis)'), data: ys.map((o) => o.is.ebitdaMargin), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, suggestedMin: 30, suggestedMax: 55, ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
      return this.image(img, this.cur.x0, y, W, h) + 4;
    }

    // ================= 8. GUIDANCE =================
    guidancePage() {
      const M = this.M, GV = M.GV; if (!GV.length) return;
      const last = GV[GV.length - 1], fq = last.forQuarter ? M.qLabelId(last.forQuarter) : '—', act = last.forQuarter ? M.gActual(last.forQuarter) : null;
      const fyV = GV.filter((v) => v.items.fyRevenue || v.items.fyEps), fyCur = fyV.length ? Math.max(...fyV.map((v) => v.fyGuided).filter(Boolean)) : null, cur = fyV.filter((v) => v.fyGuided === fyCur);
      let y = this.page('L', this.T(`Guía de la administración · ${fq} y AF${String(fyCur).slice(2)}, con su historial`, `Management Guidance · ${fq} and FY${String(fyCur).slice(2)}, with Its History`), this.nextText());
      const gap = 20, wl = this.width() * 0.47 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      // ---- left: guidance in force for the next quarter
      let yl = this.heading(this.T(`Guía vigente · ${fq} · emitida el ${this.date(last.date)} con los resultados del ${M.qLabelId(last.issuedIn)}`, `Guidance in force · ${fq} · issued ${this.date(last.date)} with the ${M.qLabelId(last.issuedIn)} results`), this.cur.x0, y, 10);
      const rows = M.GM.map((m) => { const x = last.items[m.k], xc = last.items[m.cc]; const v = act ? act[m.k] : null; const sx = M.gStatus(x, v); return [M.L(m), M.gRange(m, x), xc ? M.gRange(m, xc) : '—', M.gActualFmt(m, v), sx ? M.t(sx) : this.T('por reportar', 'to be reported')]; });
      yl = this.table({ y: yl, w: wl, head: [M.t('metric'), this.T('Guía (USD)', 'Guidance (USD)'), this.T('A tipo de cambio constante', 'Constant currency'), M.t('actual'), M.t('tracking')], body: rows, meta: rows.map((r) => ['left', 'bold', 'muted', 'bold', r[4] === M.t('above') ? 'pos' : r[4] === M.t('below') ? 'neg' : 'muted']), size: 8, cols: { 0: { halign: 'left', cellWidth: wl * 0.36 } } });
      // ---- left: fiscal-year targets, initial vs latest
      if (cur.length) {
        const first = cur[0], lastV = cur[cur.length - 1];
        const ytdQs = M.Q.filter((x) => x.fy === fyCur), ytdRev = ytdQs.reduce((a, x) => a + x.is.revTotal, 0), ytdEps = ytdQs.reduce((a, x) => a + (x.is.ngEpsDiluted || 0), 0), fyDone = M.Y.find((yy) => yy.fy === fyCur);
        const actL = fyDone ? M.fyLabel(fyCur) : M.ytdLabel(fyCur, ytdQs.length * 3);
        const r1 = { a: first.items.fyRevenue && first.items.fyRevenue.usdM, b: lastV.items.fyRevenue && lastV.items.fyRevenue.usdM, act: fyDone ? fyDone.is.revTotal : ytdRev };
        const r2 = { a: first.items.fyEps && first.items.fyEps.usd, b: lastV.items.fyEps && lastV.items.fyEps.usd, act: fyDone ? fyDone.is.ngEpsDiluted : ytdEps };
        const chg = (r) => (r.a != null && r.b != null ? this.pct(100 * (r.b / r.a - 1), 1, true) : '—'), pace = (r) => (r.act != null && r.b ? `${this.pct(100 * r.act / r.b, 0)} ${this.T(fyDone ? 'de la guía' : 'del año guiado', fyDone ? 'of guidance' : 'of guided year')}` : '');
        const body = [
          [this.T(`Ingresos totales AF${String(fyCur).slice(2)} (US$ mil M)`, `FY${String(fyCur).slice(2)} total revenue (US$ bn)`), r1.a == null ? '—' : '≥ ' + this.n(r1.a / 1000, 1), r1.b == null ? '—' : '≥ ' + this.n(r1.b / 1000, 1), chg(r1), `${this.n(r1.act / 1000, 1)} (${actL})`, pace(r1)],
          [this.T(`UPA No-GAAP AF${String(fyCur).slice(2)} (US$)`, `FY${String(fyCur).slice(2)} Non-GAAP EPS (US$)`), r2.a == null ? '—' : this.n(r2.a, 2), r2.b == null ? '—' : this.n(r2.b, 2), chg(r2), `${this.n(r2.act, 2)} (${actL})`, pace(r2)],
        ];
        yl = this.heading(this.T(`Objetivos anuales AF${String(fyCur).slice(2)} · inicial (${this.date(first.date)}) vs ${cur.length > 1 ? 'revisado' : 'vigente'} (${this.date(lastV.date)})`, `FY${String(fyCur).slice(2)} full-year targets · initial (${this.date(first.date)}) vs ${cur.length > 1 ? 'revised' : 'in force'} (${this.date(lastV.date)})`), this.cur.x0, yl + 10, 10);
        yl = this.table({ y: yl, w: wl, head: [this.T('Objetivo anual', 'Full-year target'), M.t('initial'), cur.length > 1 ? M.t('revised') : M.t('initial'), this.T('Cambio', 'Change'), M.t('actual'), this.T('Avance', 'Pace')], body, meta: body.map((r) => ['left', '', 'bold', this.cls(parseFloat(r[3].replace(/[^\d.-]/g, ''))), 'bold', 'muted small']), size: 7.8, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 } } });
        const capex = [...cur].reverse().find((v) => v.items.fyCapexNote);
        const quotes = [];
        if (capex) quotes.push(`**${this.T('Capex (palabras de la administración): ', 'Capex (management\'s words): ')}**${this.boldKeys(M.gCapexNote(capex))}`);
        for (const v of [last, ...cur.filter((v) => v !== last)]) { if (M.gNote(v)) quotes.push(this.boldKeys(M.gNote(v))); if (v.multiYear && v.multiYear.note) quotes.push(this.boldKeys(this.T(v.multiYear.note_es || v.multiYear.note, v.multiYear.note))); }
        const clip = (q) => { if (q.length <= 460) return q; let c = q.slice(0, q.lastIndexOf(' ', 460)); if ((c.split('**').length - 1) % 2) c += '**'; return c + '…'; };
        if (quotes.length) { yl = this.heading(this.T('En palabras de la administración', 'In management\'s words'), this.cur.x0, yl + 8, 10); yl = this.bullets(quotes.slice(0, 3).map(clip), this.cur.x0, yl, wl, 7.6, { gap: 3, color: MUTED }); }
      }
      // ---- right: track record by quarter
      const rec = GV.filter((v) => v.forQuarter && M.qById[v.forQuarter] && M.qById[v.forQuarter].is).slice(-10).reverse();
      let yr = this.heading(this.T('Historial: resultado frente a la guía del trimestre', 'Track record: result versus the quarter\'s guidance'), xr, y, 10);
      const rr = rec.map((v) => { const a = M.gActual(v.forQuarter); let hit = 0, n = 0; const cells = M.GM.map((m) => { const x = v.items[m.k], val = a ? a[m.k] : null; const sx = M.gStatus(x, val); if (sx) { n++; if (sx !== 'below') hit++; } return { t: `${M.gActualFmt(m, val)} (${M.gRange(m, x)})`, c: sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : '' }; }); return { r: [M.qLabelId(v.forQuarter), ...cells.map((c) => c.t), `${hit}/${n}`], m: ['left', ...cells.map((c) => c.c), 'bold'] }; });
      yr = this.table({ y: yr, x: xr, w: wr, head: [M.t('guideFor'), ...M.GM.map((m) => `${M.L(m.s)} (${this.T('guía', 'guided')})`), M.t('hits')], body: rr.map((x) => x.r), meta: rr.map((x) => x.m), size: 7.6, cols: { 0: { halign: 'left', cellWidth: wr * 0.12 }, 4: { cellWidth: wr * 0.1 } } });
      // ---- right: every vintage (latest first)
      const vs = GV.slice().reverse().slice(0, 8);
      yr = this.heading(this.T('Vintages: lo guiado con cada reporte (más reciente primero)', 'Vintages: what was guided with each report (latest first)'), xr, yr + 8, 10);
      const vr = vs.map((v) => [this.date(v.date), M.qLabelId(v.issuedIn), v.forQuarter ? M.qLabelId(v.forQuarter) : '—', ...M.GM.map((m) => M.gRange(m, v.items[m.k])), v.items.fyRevenue ? `FY${String(v.fyGuided).slice(2)} ≥ ${this.n(v.items.fyRevenue.usdM / 1000, 0)} bn${v.items.fyEps ? ` · EPS ${this.n(v.items.fyEps.usd, 2)}` : ''}` : (v.items.fyEps ? `FY${String(v.fyGuided).slice(2)} EPS ${this.n(v.items.fyEps.usd, 2)}` : '—')]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('date'), this.T('Con resultados', 'With results'), M.t('guideFor'), ...M.GM.map((m) => M.L(m.s)), this.T('Año fiscal', 'Fiscal year')], body: vr, meta: vr.map(() => ['left', '', '', '', '', '', 'small']), cols: { 0: { halign: 'left' } } }, [7.6, 7.2, 6.8], this.cur.y1 - 40);
      this.noteAbove(this.T(`Crecimientos en dólares (USD) y a tipo de cambio constante; UPA diluida No-GAAP. Resultado real del comunicado del trimestre guiado; crecimiento de nube comparado en la base Nube / Software del AF2026. Aciertos = métricas dentro o por encima del rango. Fuentes: comunicados de resultados y transcripciones de las llamadas (última guía ${this.date(last.date)}).`, `Growth in US dollars and constant currency; Non-GAAP diluted EPS. Actuals from the guided quarter's release; cloud growth compared on the FY2026 Cloud / Software basis. Hits = metrics within or above the range. Sources: earnings releases and call transcripts (latest guidance ${this.date(last.date)}).`), Math.max(yl, yr) + 6);
    }

    // ================= 9. RPO, CLOUD AND CASH FLOW (portrait) =================
    rpoCloudPage() {
      const M = this.M, lastQ = M.lastQ, R = M.REF.rpo || {};
      let y = this.page('P', this.T('RPO, capex y flujo de efectivo por trimestre', 'RPO, Capex and Cash Flow by Quarter'), this.T(`US$ · comunicados de resultados de Oracle hasta el ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`, `US$ · Oracle earnings releases through ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`));
      const W = this.width(), q12 = M.Q.slice(-12);
      y = this.heading(this.T('RPO al cierre de cada trimestre (US$ mil millones, barras) y variación a/a declarada (%, línea, eje derecho)', 'RPO at each quarter-end (US$ billion, bars) and stated YoY change (%, line, right axis)'), this.cur.x0, y, 10);
      const h1 = 190;
      const img1 = this.chart({ type: 'bar', data: { labels: q12.map((q) => this.qlab(q)), datasets: [{ type: 'line', label: this.T('Variación a/a declarada, % (eje der.)', 'Stated YoY change, % (right axis)'), data: q12.map((q) => q.kpi.rpoYoyPct), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true }, { type: 'bar', label: this.T('RPO (US$ mil M, eje izq.)', 'RPO (US$ bn, left axis)'), data: q12.map((q) => (q.kpi.rpo != null ? q.kpi.rpo / 1000 : null)), backgroundColor: PALETTE[0], yAxisID: 'y', maxBarThickness: 34, order: 1 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => this.n(v, 0) + '%' } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img1, this.cur.x0, y, W, h1) + 10;
      const q8 = M.Q.slice(-8);
      y = this.heading(this.T('Flujo operativo, capex y flujo libre por trimestre (US$ millones)', 'Operating cash flow, capex and free cash flow by quarter (US$ million)'), this.cur.x0, y, 10);
      const img2 = this.chart({ type: 'bar', data: { labels: q8.map((q) => this.qlab(q)), datasets: [{ label: this.T('Flujo operativo', 'Operating cash flow'), data: q8.map((q) => (q.cf ? q.cf.cfo : null)), backgroundColor: PALETTE[2], maxBarThickness: 26 }, { label: 'Capex', data: q8.map((q) => (q.cf && q.cf.capex != null ? -q.cf.capex : null)), backgroundColor: PALETTE[0], maxBarThickness: 26 }, { label: this.T('Flujo libre', 'Free cash flow'), data: q8.map((q) => (q.cf ? q.cf.fcf : null)), backgroundColor: q8.map((q) => (q.cf && q.cf.fcf < 0 ? '#c0392b' : PALETTE[1])), maxBarThickness: 26 }] }, options: { scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img2, this.cur.x0, y, W, h1) + 10;
      // recognition schedule
      const rpo = lastQ.kpi.rpo;
      y = this.heading(this.T(`Calendario de reconocimiento del RPO · ${R.latestQuarter || this.qlab(lastQ)} · US$ ${this.n(rpo / 1000, 0)} mil M`, `RPO recognition schedule · ${R.latestQuarter || this.qlab(lastQ)} · US$ ${this.n(rpo / 1000, 0)} bn`), this.cur.x0, y, 10);
      const sched = (R.schedule || []).map((s) => [this.T(s.bucket_es, s.bucket_en), this.pct(s.pct, 0), `US$ ${this.n(s.amount_bn)} ${this.T('mil M', 'bn')}`]);
      const cw = W * 0.6;
      if (sched.length) y = this.table({ y, w: cw, head: [this.T('Horizonte', 'Horizon'), '%', this.T('Monto', 'Amount')], body: sched, meta: sched.map(() => ['left', '', 'bold']), size: 8, cols: { 0: { halign: 'left', cellWidth: cw * 0.5 } } });
      this.noteAbove(this.T(`RPO = ingresos contratados aún no reconocidos (sección 10). Flujo libre = flujo operativo − capex; trimestres discretos derivados de los estados de flujo acumulados. El flujo operativo incluye prepagos de clientes cuando los hay. Fuentes: comunicados de resultados (RPO, flujos)${R.quoteSource ? ` · ${this.T('Formulario 10-Q', 'Form 10-Q')} (${this.date(R.quoteSource.date)}) ${this.T('para el calendario', 'for the schedule')}` : ''}.`, `RPO = contracted revenue not yet recognised (section 10). Free cash flow = operating cash flow − capex; discrete quarters derived from the cumulative cash-flow statements. Operating cash flow includes customer prepayments where present. Sources: earnings releases (RPO, cash flows)${R.quoteSource ? ` · Form 10-Q (${this.date(R.quoteSource.date)}) for the schedule` : ''}.`), y + 8);
    }

    // ================= 10. AI BUILDOUT: SITES AND CAPACITY (portrait) =================
    // Locator map of the contiguous United States. Geometry comes from /assets/us-map.js (U.S. Census Bureau boundaries via
    // us-atlas, pre-projected with the US Albers equal-area conic); the site markers use the same projection here.
    static albers(lon, lat) {
      const D = Math.PI / 180, p1 = 29.5 * D, p2 = 45.5 * D, l0 = -96 * D, f0 = 23 * D;
      const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1), r0 = Math.sqrt(C - 2 * n * Math.sin(f0)) / n;
      const r = Math.sqrt(C - 2 * n * Math.sin(lat * D)) / n, th = n * (lon * D - l0);
      return [r * Math.sin(th) * 1000, (r * Math.cos(th) - r0) * 1000];
    }
    // Draws the map in the box (x, y, w, h) with numbered site markers and a legend at legendX; returns the y below the box.
    siteMap(x, y, w, h, sites, legendX) {
      const map = window.FNAM_US_MAP; if (!map) { this.note(this.T('Mapa no disponible (assets/us-map.js).', 'Map not available (assets/us-map.js).'), y); return y + 14; }
      const all = map.outline.flat(); const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
      const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
      const sc = Math.min(w / (bx1 - bx0), h / (by1 - by0)), mw2 = (bx1 - bx0) * sc, mh = (by1 - by0) * sc, ox = x + (w - mw2) / 2, oy = y + (h - mh) / 2;
      const P = ([px, py]) => [ox + (px - bx0) * sc, oy + (py - by0) * sc];
      const path = (pts, style) => { const p = pts.map(P); this.pdf.lines(p.slice(1).map((q, i) => [q[0] - p[i][0], q[1] - p[i][1]]), p[0][0], p[0][1], [1, 1], style, style !== 'S'); };
      this.pdf.setFillColor(238, 238, 233); this.pdf.setDrawColor(150, 148, 140); this.pdf.setLineWidth(0.7);
      for (const ring of map.outline) path(ring, 'FD');
      this.pdf.setDrawColor(255, 255, 255); this.pdf.setLineWidth(0.6);
      for (const line of map.borders) path(line, 'S');
      const placed = [];
      sites.forEach((s, i) => {
        if (s.lat == null || s.lon == null) return;
        const [px0, py0] = P(OracleDoc.albers(s.lon, s.lat)); let px = px0, py = py0; const r = 6 + 2.6 * Math.sqrt((s.capacity_mw || 1000) / 1000);
        for (const q of placed) { if (Math.hypot(px - q[0], py - q[1]) < r + q[2] + 3) { px = px0 + 18; py = py0 - 18; } }
        if (px !== px0) { this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(0.8); this.pdf.line(px0, py0, px, py); this.pdf.setFillColor(...ACCENT); this.pdf.circle(px0, py0, 1.6, 'F'); }
        this.pdf.setFillColor(...ACCENT); this.pdf.setDrawColor(255, 255, 255); this.pdf.setLineWidth(1.2); this.pdf.circle(px, py, r, 'FD');
        this.font('bold', 9.5, [255, 255, 255]); this.pdf.text(String(i + 1), px, py + 3.4, { align: 'center' });
        placed.push([px, py, r]);
      });
      // legend beside the map: numbered badge, campus, planned capacity
      const lx = legendX != null ? legendX : ox; let ly = legendX != null ? y + 16 : oy + mh * 0.6;
      sites.forEach((s, i) => { this.pdf.setFillColor(...ACCENT); this.pdf.circle(lx + 7, ly - 3.2, 6.2, 'F'); this.font('bold', 8.6, [255, 255, 255]); this.pdf.text(String(i + 1), lx + 7, ly - 0.2, { align: 'center' }); this.font('bold', 9, INK); this.pdf.text(tx(s.short || s.name.split(' (')[0]), lx + 18, ly); this.font('normal', 8, MUTED); this.pdf.text(tx(`${this.n(s.capacity_mw)} MW ${this.T('planeados', 'planned')}`), lx + 18, ly + 10); ly += 26; });
      this.font('normal', 6.8, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(this.T('Ubicaciones aproximadas (condado o municipio); tamaño del marcador = capacidad planeada. Límites: U.S. Census Bureau (us-atlas), proyección Albers.', 'Approximate locations (county or township); marker size = planned capacity. Boundaries: U.S. Census Bureau (us-atlas), Albers projection.')), legendX != null ? this.cur.x1 - legendX : w), lx, ly + 2);
      return y + h;
    }
    sitesPage() {
      const M = this.M, BO = M.BO; if (!BO) return;
      const cap = BO.capacity || {}, cq = cap.quarters || [], last = cq[cq.length - 1], fy = (cap.fiscal_years || [])[0], sec = cap.secured, sites = BO.sites || [];
      const gu = (BO.gpu && BO.gpu.utilization) || [], rn = (BO.gpu && BO.gpu.renewals) || [], u = gu[gu.length - 1], r = rn[rn.length - 1];
      const sitesMw = sites.reduce((a, s) => a + (s.capacity_mw || 0), 0);
      let y = this.page('P', this.T('Expansión de IA: sitios nombrados y capacidad entregada', 'AI Buildout: Named Sites and Capacity Delivered'), this.T(`Según las llamadas de resultados hasta el ${BO.promises ? M.boLabel(BO.promises.as_of) : this.qlab(M.lastQ)}${BO.updated ? ` · revisado el ${this.date(BO.updated)}` : ''}`, `Per the earnings calls through ${BO.promises ? M.boLabel(BO.promises.as_of) : this.qlab(M.lastQ)}${BO.updated ? ` · reviewed ${this.date(BO.updated)}` : ''}`));
      const W = this.width();
      y = this.tiles([
        { v: last ? `${this.n(last.mw)} MW` : '—', l: this.T(`entregados en el ${last ? M.boLabel(last.id) : '—'}${fy ? ` · > ${this.n(fy.mw / 1000, 1)} GW en el AF2026` : ''}`, `delivered in ${last ? M.boLabel(last.id) : '—'}${fy ? ` · > ${this.n(fy.mw / 1000, 1)} GW in FY2026` : ''}`) },
        { v: sec ? `> ${this.n(sec.gw)} GW` : '—', l: this.T(`asegurados vía socios, 3 años (${sec ? M.boLabel(sec.as_of) : '—'})`, `secured through partners, 3 years (${sec ? M.boLabel(sec.as_of) : '—'})`) },
        { v: u ? this.pct(u.pct) : '—', l: this.T(`utilización de GPU (${u ? M.boLabel(u.id) : '—'})`, `GPU utilization (${u ? M.boLabel(u.id) : '—'})`) },
        { v: r && r.gpus_renewed_pct != null ? this.pct(r.gpus_renewed_pct, 0) : '—', l: this.T(`GPU renovadas o revendidas al vencer (${r ? M.boLabel(r.id) : '—'})${r && r.price_premium_pct != null ? ` · +${r.price_premium_pct}% precio` : ''}`, `GPUs renewed or resold at expiry (${r ? M.boLabel(r.id) : '—'})${r && r.price_premium_pct != null ? ` · +${r.price_premium_pct}% price` : ''}`) },
      ], y, 46);
      y = this.heading(this.T(`Los ${sites.length} campus nombrados por Oracle · capacidad planeada ≈ ${this.n(sitesMw / 1000, 1)} GW`, `The ${sites.length} campuses Oracle has named · planned capacity ≈ ${this.n(sitesMw / 1000, 1)} GW`), this.cur.x0, y, 10);
      const mapW = Math.round(W * 0.68), mapH = Math.round(mapW * 0.62);
      y = this.siteMap(this.cur.x0, y + 2, mapW, mapH, sites, this.cur.x0 + mapW + 14) + 10;
      // concise table: one line per campus, first clause of each disclosure
      const sf = (s, k) => (this.es && s[k + '_es'] ? s[k + '_es'] : s[k] || '');
      const first = (t, n = 60) => { let c = String(t).split(/;|\.\s/).map((x) => x.trim()).filter((x) => x && !/^(Contracted|Contratad[oa])/i.test(x))[0] || String(t).split(';')[0]; c = c.replace(/\s*\([^)]*\)\s*$/, '').trim(); if (c.length > n) c = c.slice(0, c.lastIndexOf(' ', n)) + '…'; return c; };
      const short = (t) => String(t).replace(/\s+(via|vía|a través de)\s+.*$/i, '').replace(/\s*\([^)]*\)/g, '').split(';')[0].trim();
      const rows = sites.map((s, i) => [String(i + 1), s.short || s.name.split(' (')[0], `${this.n(s.nameplate_mw || s.capacity_mw)} / ${s.energized_mw != null ? this.n(s.energized_mw) : '—'}`, short(sf(s, 'customer')).replace(/^Not disclosed.*$/i, this.T('No divulgado', 'Not disclosed')).replace(/^No divulgad.*$/i, this.T('No divulgado', 'Not disclosed')), short(sf(s, 'developer')), short(sf(s, 'contracted')), first(sf(s, 'first_delivery'), 34), (s.issues_en && !/^None reported/i.test(s.issues_en) ? `${this.date(s.status_date)}: ${first(sf(s, 'issues'), 70)}` : first(sf(s, 'oracle_status'), 62))]);
      const promises = ((BO.promises && BO.promises.items) || []).slice(0, 4).map((x) => `**${M.boLabel(x.id)}** · ${M.L(x)}`);
      const noteStr = this.T('Ubicaciones aproximadas en el mapa (condado o municipio). Capacidad, cliente y desarrollador provienen de Oracle cuando lo divulga; en caso contrario, de los comunicados de los desarrolladores o de la prensa citada en la página (detalle y enlaces por sitio en fnam.mx/oracle, sección 09). Utilización y renovaciones según las llamadas de resultados. Fuentes: transcripciones de las llamadas, comunicados de Oracle y de los desarrolladores.', 'Map locations are approximate (county or township). Capacity, customer and developer come from Oracle where it disclosed them, otherwise from the developers\' releases or the press cited on the page (detail and links per site at fnam.mx/oracle, section 09). Utilization and renewals as stated on the earnings calls. Sources: call transcripts, Oracle and developer releases.');
      const noteH = this.measureText(noteStr, W, 7.5, 1.25);
      const promH = promises.length ? 16 + this.measureBullets(promises, W, 7.8, { gap: 3 }) : 0;
      y = this.fitTable({ y, head: ['#', this.T('Campus', 'Campus'), this.T('MW plan / en línea', 'MW plan / live'), this.T('Cliente', 'Customer'), this.T('Desarrollador', 'Developer'), this.T('Contratado', 'Contracted'), this.T('Primera entrega', 'First delivery'), this.T('Estado según Oracle', 'Oracle\'s status')], body: rows, meta: rows.map(() => ['bold', 'bold left', 'bold', 'left', 'left', 'left', 'left', 'left small']), cols: { 0: { cellWidth: W * 0.035 }, 1: { halign: 'left', cellWidth: W * 0.15 }, 2: { cellWidth: W * 0.06 }, 3: { halign: 'left', cellWidth: W * 0.12 }, 4: { halign: 'left', cellWidth: W * 0.14 }, 5: { halign: 'left', cellWidth: W * 0.1 }, 6: { halign: 'left', cellWidth: W * 0.13 }, 7: { halign: 'left' } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6], this.cur.y1 - noteH - promH - 16);
      if (promises.length && y + promH + noteH + 12 < this.cur.y1) { y = this.heading(this.T('Lo que Oracle ha prometido entregar (llamada más reciente primero)', 'What Oracle has committed to deliver (latest call first)'), this.cur.x0, y + 8, 10); y = this.bullets(promises, this.cur.x0, y, W, 7.8, { gap: 3 }); }
      this.noteAbove(noteStr, y + 6);
    }

    // ================= 11. 07 LEVERAGE AND DEBT =================
    debtPage() {
      const M = this.M, qs = M.Q.slice(-8).filter((q) => q.bs), lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ);
      const nds = qs.map((q) => ({ q, nd: M.netDebt(q), l: M.ltmFor(q) }));
      const D2 = M.REF.debt || {}; const rat = (D2.ratings || []).map((r) => r.rating).join(' · '), agencies = (D2.ratings || []).map((r) => r.agency.replace('S&P Global Ratings', 'S&P')).join(' · ');
      let y = this.page('L', this.T('07 · Apalancamiento y perfil de deuda', '07 · Leverage and Debt Profile'), this.T(`US$ millones · balance del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · instrumentos de la nota de deuda del 10-K del AF2026, referencia actualizada ${this.date(M.REF.updatedAt)}`, `US$ million · ${this.qlab(lastQ)} balance sheet (${this.date(this.rel(lastQ))}) · instruments from the FY2026 10-K debt footnote, reference updated ${this.date(M.REF.updatedAt)}`));
      const asOf = this.date(M.qEndDate(lastQ));
      y = this.tiles([
        { v: nd ? this.usdM(nd.net) : '—', l: this.T(`Deuda neta · ${asOf}`, `Net debt · ${asOf}`) },
        { v: nd ? this.usdM(nd.gross) : '—', l: this.T('Deuda total (notas por pagar y otros préstamos)', 'Total debt (notes payable and other borrowings)') },
        { v: nd ? this.usdM(nd.cash) : '—', l: this.T('Efectivo, equivalentes e inversiones negociables', 'Cash, equivalents and marketable securities') },
        { v: nd && L ? this.x(nd.net / L.is.ebitda, 2) : '—', l: this.T('Deuda neta / EBITDA UDM', 'Net debt / LTM EBITDA') },
        { v: rat || '—', l: `${agencies} · ${this.T('senior no garantizada', 'senior unsecured')}`, size: 12 },
      ], y);
      const gap = 24, wl = this.width() * 0.54, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T('Deuda neta (barras, US$ mil millones) y deuda neta / EBITDA UDM (línea, eje derecho)', 'Net debt (bars, US$ billion) and net debt / LTM EBITDA (line, right axis)'), this.cur.x0, y, 10);
      const levs = nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null));
      const levMin = Math.max(0, Math.floor(Math.min(...levs.filter((v) => v != null)) * 2) / 2 - 0.5);
      const h1 = 225;
      const img1 = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [
        { type: 'line', label: this.T('Deuda neta / EBITDA UDM (eje der.)', 'Net debt / LTM EBITDA (right axis)'), data: levs, borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true },
        { type: 'bar', label: this.T('Deuda neta (eje izq.)', 'Net debt (left axis)'), data: nds.map((x) => (x.nd ? x.nd.net / 1000 : null)), backgroundColor: PALETTE[0], maxBarThickness: 38, order: 1 }] },
        options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, min: levMin, ticks: { stepSize: 0.5, callback: (v) => this.n(v, 1) + 'x' } } } } }, Math.round(wl * 1.6), Math.round(h1 * 1.6));
      yl = this.image(img1, this.cur.x0, yl, wl, h1) + 6;
      const fund = (M.BO && M.BO.funding && M.BO.funding.items) || [];
      const bl = [
        this.T('Deuda total = notas por pagar y otros préstamos (corto y largo plazo) del balance de cada comunicado; efectivo = efectivo, equivalentes e inversiones negociables del mismo balance. EBITDA UDM = utilidad de operación GAAP + D&A de los cuatro trimestres previos.', 'Total debt = notes payable and other borrowings (current and non-current) from the balance sheet in each release; cash = cash, equivalents and marketable securities from the same balance sheet. LTM EBITDA = GAAP operating income + D&A of the trailing four quarters.'),
      ];
      if (fund.length) bl.push(this.T(`Financiamiento de la expansión (${M.BO.funding.as_of ? M.boLabel(M.BO.funding.as_of) : ''}): ${fund.map((f) => `${M.L(f)} US$ ${this.n(f.usd_bn)} mil M`).join('; ')}.`, `Funding of the buildout (${M.BO.funding.as_of ? M.boLabel(M.BO.funding.as_of) : ''}): ${fund.map((f) => `${M.L(f)} US$ ${this.n(f.usd_bn)} bn`).join('; ')}.`));
      yl = this.bullets(bl, this.cur.x0, yl, wl, 7.8, { gap: 3, color: MUTED });
      // right: maturity profile + quarterly table
      const ins = (D2.instruments || []).filter((i) => i.matures), mb = M.maturityBuckets(ins), cp = (D2.instruments || []).find((i) => !i.matures);
      let yr = this.heading(this.T('Vencimientos por año calendario (principal, US$ mil millones)', 'Maturities by calendar year (principal, US$ billion)'), xr, y, 10);
      const h2 = 120;
      const img2 = this.chart({ type: 'bar', data: { labels: mb.map((b) => b.label), datasets: [{ label: this.T('Principal', 'Principal'), data: mb.map((b) => b.principal / 1000), backgroundColor: mb.map((b) => (b.matured ? alpha(PALETTE[0], 0.4) : PALETTE[0])), maxBarThickness: 30 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 9 } } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h2 * 1.6));
      yr = this.image(img2, xr, yr, wr, h2) + 2;
      yr = this.note(this.T(`Barra atenuada: vencida desde el 31 de mayo de 2026, pendiente de confirmación de pago en el 10-Q${cp ? `; excluye papel comercial (US$ ${this.n(cp.principalUsdM)} M)` : ''}. Detalle en la sección 11.`, `Shaded bar: matured since 31 May 2026, awaiting the 10-Q confirmation of repayment${cp ? `; excludes commercial paper (US$ ${this.n(cp.principalUsdM)} M)` : ''}. Detail in section 11.`), yr, 7, xr, wr);
      const qr = nds.map((x) => [this.qlab(x.q), x.nd ? this.m(x.nd.gross) : '—', x.nd ? this.m(x.nd.cash) : '—', x.nd ? this.m(x.nd.net) : '—', x.l ? this.m(x.l.is.ebitda) : '—', x.nd && x.l && x.l.is.ebitda ? this.x(x.nd.net / x.l.is.ebitda, 2) : '—']);
      yr = this.heading(this.T('Por trimestre (US$ millones)', 'By quarter (US$ million)'), xr, yr + 6, 10);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [this.T('Trimestre', 'Quarter'), this.T('Deuda total', 'Total debt'), this.T('Efectivo e inv.', 'Cash & inv.'), this.T('Deuda neta', 'Net debt'), 'EBITDA UDM', this.T('DN / EBITDA', 'ND / EBITDA')], body: qr, meta: qr.map(() => ['left', '', '', 'bold', '', 'bold']), cols: { 0: { halign: 'left' } } }, [8, 7.6, 7.2, 6.8], this.cur.y1 - 26);
      this.noteAbove((D2.ratings || []).map((r) => `${r.agency}: ${r.rating} (${M.LS(r.outlook)}, ${this.date(r.date)})`).join(' · ') + this.T('. Fuentes: comunicados de resultados (balance); 10-K AF2026 (instrumentos); comunicados de acción de calificación de cada agencia.', '. Sources: earnings releases (balance sheet); FY2026 10-K (instruments); each agency\'s rating-action release.'), Math.max(yl, yr) + 4, 7);
    }

    // ================= 12. 08 DIVIDENDS AND CASH RETURNS =================
    dividendPage() {
      const M = this.M, lastQ = M.lastQ;
      const byFy = {}; for (const q of M.Q) if (q.kpi.dps != null) byFy[q.fy] = (byFy[q.fy] || 0) + q.kpi.dps;
      const fys = Object.keys(byFy).map(Number).sort();
      let y = this.page('L', this.T('08 · Dividendos y generación de efectivo', '08 · Dividends and Cash Generation'), this.T(`US$ · dividendos declarados en cada comunicado de resultados hasta el ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · flujos de los Formularios 10-K`, `US$ · dividends declared in each earnings release through ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · cash flows from the Forms 10-K`));
      const gap = 24, wl = this.width() * 0.42, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T('Dividendo declarado por acción, por año fiscal (US$)', 'Dividend declared per share, by fiscal year (US$)'), this.cur.x0, y, 10);
      const partial = fys.filter((fy) => M.Q.filter((q) => q.fy === fy && q.kpi.dps != null).length < 4);
      const h1 = 150;
      const img = this.chart({ type: 'bar', data: { labels: fys.map((fy) => M.fyLabel(fy) + (partial.includes(fy) ? '*' : '')), datasets: [{ label: this.T('Dividendo por acción (US$)', 'Dividend per share (US$)'), data: fys.map((fy) => byFy[fy]), backgroundColor: fys.map((fy) => (partial.includes(fy) ? alpha(PALETTE[0], 0.45) : PALETTE[0])), maxBarThickness: 34 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 2) } } } } }, Math.round(wl * 1.6), Math.round(h1 * 1.6));
      yl = this.image(img, this.cur.x0, yl, wl, h1) + 6;
      const rows = fys.map((fy) => { const Yr = M.Y.find((yy) => yy.fy === fy); const eps = Yr && Yr.is ? Yr.is.epsDiluted : null; const q4 = M.qById[`${fy}Q4`]; const pEnd = q4 ? M.pointAtOrBefore(M.orclPx, M.qEndDate(q4)) : null; const n = M.Q.filter((q) => q.fy === fy && q.kpi.dps != null).length; return [M.fyLabel(fy) + (n < 4 ? '*' : ''), this.n(byFy[fy], 2), eps ? this.n(eps, 2) : '—', eps && n === 4 ? this.pct(100 * byFy[fy] / eps, 0) : '—', pEnd ? this.n(pEnd[1], 2) : '—', pEnd && n === 4 ? this.pct(100 * byFy[fy] / pEnd[1]) : '—']; });
      yl = this.table({ y: yl, w: wl, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Div./acción', 'DPS'), this.T('UPA GAAP', 'GAAP EPS'), M.t('payout'), this.T('Precio fin AF', 'FY-end price'), M.t('yield')], body: rows, meta: rows.map(() => ['left', 'bold', '', '', '', '']), size: 7.8, cols: { 0: { halign: 'left' } } });
      const decl = (M.REF.dividends || []).slice(-3).reverse();
      yl = this.bullets(decl.map((d) => `**${M.qLabelId(d.quarter)}** (${this.date(d.declared)}): US$ ${this.n(d.dps, 2)} ${this.T('por acción', 'per share')} · ${this.T('registro', 'record')} ${this.date(d.record)} · ${this.T('pago', 'payment')} ${this.date(d.payment)}`), this.cur.x0, yl + 8, wl, 7.8, { gap: 2.5 });
      // right: ten fiscal years of cash generation
      const ys = M.Y.slice(-10);
      let yr = this.heading(this.T('Diez años fiscales: flujo operativo, capex y flujo libre (US$ millones)', 'Ten fiscal years: operating cash flow, capex and free cash flow (US$ million)'), xr, y, 10);
      const rr = ys.map((o) => { const cf = o.cf || {}; return [M.fyLabel(o.fy), this.m(o.is.revTotal), cf.cfo != null ? this.m(cf.cfo) : '—', cf.capex != null ? this.m(-cf.capex) : '—', cf.capexToRevenue != null ? this.pct(cf.capexToRevenue, 0) : '—', cf.fcf != null ? this.m(cf.fcf) : '—', cf.da != null ? this.m(cf.da) : '—', byFy[o.fy] != null && M.Q.filter((q) => q.fy === o.fy && q.kpi.dps != null).length === 4 ? this.n(byFy[o.fy], 2) : (o.kpi && o.kpi.dps ? this.n(o.kpi.dps, 2) : '—')]; });
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Ingresos', 'Revenue'), this.T('Flujo operativo', 'Operating cash flow'), 'Capex', this.T('Capex / ingresos', 'Capex / revenue'), this.T('Flujo libre', 'Free cash flow'), 'D&A', this.T('Div./acción (US$)', 'DPS (US$)')], body: rr, meta: rr.map((r) => ['left', '', '', '', '', parseFloat(r[5].replace(/,/g, '')) < 0 ? 'neg bold' : 'bold', '', '']), cols: { 0: { halign: 'left' } } }, [8.2, 7.8, 7.4, 7], this.cur.y1 - 70);
      const rem = this.cur.y1 - yr - 120;
      if (rem > 100) {
        const h2 = Math.min(rem - 24, 170);
        yr = this.heading(this.T('Flujo operativo, capex y flujo libre por año fiscal (US$ mil millones)', 'Operating cash flow, capex and free cash flow by fiscal year (US$ billion)'), xr, yr + 8, 10);
        const img2 = this.chart({ type: 'bar', data: { labels: ys.map((o) => M.fyLabel(o.fy)), datasets: [{ label: this.T('Flujo operativo', 'Operating cash flow'), data: ys.map((o) => (o.cf && o.cf.cfo != null ? o.cf.cfo / 1000 : null)), backgroundColor: PALETTE[2], maxBarThickness: 22 }, { label: 'Capex', data: ys.map((o) => (o.cf && o.cf.capex != null ? -o.cf.capex / 1000 : null)), backgroundColor: PALETTE[0], maxBarThickness: 22 }, { label: this.T('Flujo libre', 'Free cash flow'), data: ys.map((o) => (o.cf ? o.cf.fcf / 1000 : null)), backgroundColor: ys.map((o) => (o.cf && o.cf.fcf < 0 ? '#c0392b' : PALETTE[1])), maxBarThickness: 22 }] }, options: { scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h2 * 1.6));
        yr = this.image(img2, xr, yr, wr, h2);
      }
      yr = this.bullets([
        this.T('Flujo libre = flujo operativo − capex; el flujo operativo de los últimos trimestres incluye prepagos de clientes por contratos de nube (sección 03). Los dividendos pagados y las recompras en efectivo no forman parte del modelo (las líneas del estado de flujos anual no se cosechan del 10-K); el dividendo por acción es el declarado, sumado por año fiscal.', 'Free cash flow = operating cash flow − capex; recent quarters\' operating cash flow includes customer prepayments on cloud contracts (section 03). Cash dividends paid and buybacks are not part of the model (the annual cash-flow lines are not harvested from the 10-K); dividend per share is the declared amount summed by fiscal year.'),
      ], xr, yr + 6, wr, 7.6, { gap: 2, color: MUTED });
      this.noteAbove(this.T(`* años parciales (menos de cuatro trimestres declarados). Razón de pago = dividendo del año ÷ UPA diluida GAAP del año fiscal; rendimiento sobre el cierre del 31 de mayo. El consejo declara el dividendo con cada reporte trimestral. Fuentes: comunicados de resultados (dividendos); Formularios 10-K (UPA, flujos); ${M.MK.prices.ORCL ? M.MK.prices.ORCL.source : 'Nasdaq'} (precios).`, `* partial years (fewer than four quarters declared). Payout = year's dividend ÷ GAAP diluted EPS of the fiscal year; yield on the 31 May close. The board declares the dividend with each quarterly report. Sources: earnings releases (dividends); Forms 10-K (EPS, cash flows); ${M.MK.prices.ORCL ? M.MK.prices.ORCL.source : 'Nasdaq'} (prices).`), Math.max(yl, yr) + 6);
    }

    // ================= 11b. OFF-BALANCE-SHEET FINANCING =================
    obligationsPage() {
      const M = this.M, OB = M.OB, S = M.obligStats ? M.obligStats() : null; if (!OB || !S) return;
      const Lz = OB.leases || {}, bs = OB.balance_sheet || {}, po = OB.purchase_obligations || {}, un = Lz.uncommenced || {}, ga = OB.guarantees || {};
      let y = this.page('L', this.T('11 · Financiamiento fuera de balance', '11 · Off-Balance-Sheet Financing'), this.T(`Formulario 10-Q al ${this.date(OB.as_of)} (notas de arrendamientos y compromisos) · deuda neta y EBITDA UDM del modelo (${M.lastLTM ? M.lastLTM.id : ''}) · razones derivadas`, `Form 10-Q at ${this.date(OB.as_of)} (leases and commitments notes) · model net debt and LTM EBITDA (${M.lastLTM ? M.lastLTM.id : ''}) · derived ratios`));
      const bn = (m) => this.n(m / 1000, 1);
      y = this.tiles([
        { v: M.fmtX(S.ndEbitda, 2), l: this.T('deuda neta / EBITDA UDM, como se reporta', 'net debt / LTM EBITDA, as reported') },
        { v: M.fmtX(S.leaseAdj, 2), l: this.T(`ajustado: (deuda neta + arrendamientos operativos ${bn(S.opL)} + financieros ${bn(S.finL)} mil M) / EBITDAR ${bn(S.ebitdar)} mil M`, `lease-adjusted: (net debt + operating leases ${bn(S.opL)} + finance leases ${bn(S.finL)} bn) / EBITDAR ${bn(S.ebitdar)} bn`) },
        { v: M.fmtX(S.commit, 1), l: this.T(`incluyendo compromisos: + US$ ${this.n(S.unc / 1000, 0)} mil M de arrendamientos no iniciados, nominal, sin descontar`, `commitment-inclusive: + US$ ${this.n(S.unc / 1000, 0)} bn of uncommenced leases, nominal, undiscounted`) },
        { v: `US$ ${bn(po.total)} ${this.T('mil M', 'bn')}`, l: this.T('obligaciones de compra (energía, equipo y otros), no canceladas', 'purchase obligations (power, equipment and other), non-cancelable') },
      ], y, 48);
      const gap = 24, wl = this.width() * 0.56, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const rows = [
        [this.T('Notas por pagar y otros préstamos', 'Notes payable and other borrowings'), bn(bs.notes_payable_total), this.T('en balance', 'on balance sheet')],
        [this.T('Pasivos por arrendamientos operativos', 'Operating lease liabilities'), bn(S.opL), this.T(`en balance · activo por derecho de uso ${bn(Lz.operating_rou_assets)}`, `on balance sheet · right-of-use asset ${bn(Lz.operating_rou_assets)}`)],
        [this.T('Pasivos por arrendamientos financieros', 'Finance lease liabilities'), bn(S.finL), this.T(`en balance · activo por derecho de uso ${bn(Lz.finance_rou_assets)}`, `on balance sheet · right-of-use asset ${bn(Lz.finance_rou_assets)}`)],
        [this.T('Arrendamientos firmados, aún no iniciados', 'Leases signed, not yet commenced'), this.n(un.usd_bn, 0), this.T(`fuera de balance · ${un.term_years_min}–${un.term_years_max} años · inician 2T27–AF2029`, `off balance sheet · ${un.term_years_min}–${un.term_years_max} years · commence 2Q27–FY2029`)],
        [this.T('Obligaciones de compra', 'Purchase obligations'), bn(po.total), this.T('fuera de balance · calendario a la derecha', 'off balance sheet · schedule at right')],
        [this.T('Garantías a arrendadores u otras', 'Lessor or other guarantees'), this.T('no divulgadas', 'not disclosed'), this.T('ni el 10-Q ni el 10-K revelan garantías fuera de balance', 'neither the 10-Q nor the 10-K discloses off-balance-sheet guarantees')],
        [this.T('Efectivo e inversiones negociables', 'Cash and marketable securities'), '(' + bn(bs.cash_and_investments) + ')', this.T('en balance · se resta para la deuda neta', 'on balance sheet · netted for net debt')],
      ];
      let yl = this.heading(this.T('Lo que Oracle debe, dentro y fuera del balance (US$ mil millones)', 'What Oracle owes, on and off the balance sheet (US$ billion)'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [this.T('Partida', 'Item'), this.T('US$ mil M', 'US$ bn'), this.T('Dónde está', 'Where it sits')], body: rows, meta: rows.map(() => ['left', 'bold', 'left small']), size: 8, cols: { 0: { halign: 'left', cellWidth: wl * 0.38 }, 1: { cellWidth: wl * 0.14 }, 2: { halign: 'left' } } });
      const hist = un.history || [];
      const rr = hist.map((h) => [this.date(h.as_of), this.n(h.usd_bn, h.usd_bn < 100 ? 1 : 0), h.note || '']);
      yl = this.heading(this.T('Arrendamientos no iniciados en cada reporte (US$ mil millones, nominal)', 'Uncommenced leases at each report (US$ billion, nominal)'), this.cur.x0, yl + 10, 10);
      yl = this.table({ y: yl, w: wl, head: [this.T('Al', 'As of'), this.T('US$ mil M', 'US$ bn'), this.T('Según la nota de arrendamientos', 'Per the leases note')], body: rr, meta: rr.map(() => ['left', 'bold', 'left small muted']), size: 8, cols: { 0: { halign: 'left', cellWidth: wl * 0.22 }, 1: { cellWidth: wl * 0.14 }, 2: { halign: 'left' } } });
      let yr = this.heading(this.T('Obligaciones de compra por año fiscal (US$ millones)', 'Purchase obligations by fiscal year (US$ million)'), xr, y, 10);
      const pr = (po.schedule || []).map((x) => [this.es ? x.period_es : x.period_en, this.m(x.usd_m)]); pr.push(['Total', this.m(po.total)]);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Periodo', 'Period'), 'US$ M'], body: pr, meta: pr.map((r, i) => [i === pr.length - 1 ? 'left bold' : 'left', i === pr.length - 1 ? 'bold' : '']), size: 8, cols: { 0: { halign: 'left' } } });
      const peers = M.peerLeverage ? M.peerLeverage() : [];
      if (peers.length) {
        yr = this.heading(this.T('Frente a pares (derivado de sus reportes en la SEC)', 'Versus peers (derived from their SEC filings)'), xr, yr + 10, 10);
        const prw = peers.map((p) => [p.name + (p.basis === 'pretax_plus_interest' ? ' *' : ''), p.ndEbitda != null ? M.fmtX(p.ndEbitda, 2) : '—', p.leaseAdj != null ? M.fmtX(p.leaseAdj, 2) : '—', p.opL != null ? bn(p.opL + (p.finL || 0)) : '—']);
        yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Emisor', 'Issuer'), this.T('Deuda neta / EBITDA', 'Net debt / EBITDA'), this.T('Ajustado / EBITDAR', 'Lease-adj. / EBITDAR'), this.T('Arrend. US$ mil M', 'Leases US$ bn')], body: prw, meta: prw.map((r, i) => [i === 0 ? 'left bold' : 'left', i === 0 ? 'bold' : '', i === 0 ? 'bold' : '', '']), size: 7.8, cols: { 0: { halign: 'left' } } });
      }
      this.noteAbove(this.T(`EBITDAR = EBITDA UDM (US$ ${this.m(S.ebitda)} M) + costo de arrendamientos operativos UDM (US$ ${this.m(S.olc)} M). La razón "incluyendo compromisos" suma el valor nominal de los arrendamientos no iniciados sin descontar ni proyectar EBITDA futuro: mide exposición, no deuda actual. Pares elegidos por el responsable; saldos al último balance y flujos del último año fiscal según sus datos XBRL en la SEC (* IBM no reporta utilidad de operación: EBIT = utilidad antes de impuestos + intereses). Garantías: ${ga.text_es || ''} Fuentes: Formulario 10-Q 1T27, 10-K AF2026, SEC XBRL.`, `EBITDAR = LTM EBITDA (US$ ${this.m(S.ebitda)} M) + LTM operating lease cost (US$ ${this.m(S.olc)} M). The commitment-inclusive ratio adds the nominal value of uncommenced leases without discounting or projecting future EBITDA: it measures exposure, not current debt. Peer set chosen by the owner; latest balance sheet and latest fiscal-year flows per their SEC XBRL data (* IBM reports no operating income: EBIT = pre-tax income + interest). Guarantees: ${ga.text_en || ''} Sources: 1Q27 Form 10-Q, FY2026 10-K, SEC XBRL.`), Math.max(yl, yr) + 8);
    }

    // ================= 13. 09 AI CLOUD INFRASTRUCTURE BUILDOUT =================
    buildoutPage() {
      const M = this.M, BO = M.BO, q = M.lastQ, ql = this.qlab(q), rec = M.revOnNewBasis(q);
      let y = this.page('L', this.T('09 · La expansión de infraestructura de nube de IA', '09 · The AI Cloud Infrastructure Buildout'), this.T(`Cifras del ${ql} (${this.date(this.rel(q))}) y de las llamadas de resultados · US$`, `${ql} figures (${this.date(this.rel(q))}) and the earnings calls · US$`));
      const fyG = M.GV.slice().reverse().find((v) => v.items && v.items.fyRevenue);
      const cap = (BO && BO.capacity) || {}, cq = cap.quarters || [], fyMw = (cap.fiscal_years || [])[0], lastMw = cq[cq.length - 1], sec = cap.secured, fund = (BO && BO.funding && BO.funding.items) || [], sched = BO && BO.rpoSchedule;
      // five-step flow: contracts -> capacity -> spend -> funding -> revenue
      const steps = [
        { t: this.T('1 · Contratos', '1 · Contracts'), big: q.kpi.rpo != null ? `US$ ${this.n(q.kpi.rpo / 1000)} ${this.T('mil M', 'bn')}` : '—', sub: `RPO · ${ql}${sched ? ` · ${sched.buckets[0].pct}% ${this.T('en 12 meses', 'within 12 months')}` : ''}` },
        { t: this.T('2 · Capacidad', '2 · Capacity'), big: lastMw ? `${this.n(lastMw.mw)} MW` : '—', sub: lastMw ? `${this.T('entregados en el', 'delivered in')} ${M.boLabel(lastMw.id)}${sec ? ` · > ${sec.gw} GW ${this.T('asegurados', 'secured')}` : ''}` : '' },
        { t: this.T('3 · Inversión', '3 · Spend'), big: q.cf && q.cf.capex != null ? this.bn(-q.cf.capex) : '—', sub: `Capex · ${ql}${fyG && fyG.items.fyCapexNote ? ` · ${this.T('guía AF27 US$ 90–95 mil M', 'FY27 guide US$ 90–95 bn')}` : ''}` },
        { t: this.T('4 · Financiamiento', '4 · Funding'), big: fund.length ? `US$ ${this.n(fund.filter((f) => !/prepay|prepago/i.test(f.en)).reduce((a, f) => a + f.usd_bn, 0))} ${this.T('mil M', 'bn')}` : '—', sub: this.T('deuda y capital levantados AF26–1T27', 'debt and equity raised FY26–1Q27') },
        { t: this.T('5 · Ingresos', '5 · Revenue'), big: rec ? this.bn(rec.revCloud) : '—', sub: `${this.T('nube', 'cloud')} · ${ql}${fyG && fyG.items.fyRevenue ? ` · FY${String(fyG.fyGuided).slice(2)} ≥ ${this.bn(fyG.items.fyRevenue.usdM, 0)}` : ''}` },
      ];
      const n = steps.length, g = 18, bw = (this.width() - (n - 1) * g) / n, bh = 62;
      steps.forEach((s, i) => { const x = this.cur.x0 + i * (bw + g); this.pdf.setFillColor(...HEAD); this.pdf.setDrawColor(...GRID); this.pdf.roundedRect(x, y, bw, bh, 4, 4, 'FD'); this.font('bold', 8.6, ACCENT); this.pdf.text(tx(s.t), x + 7, y + 13); this.font('bold', 15, INK); this.pdf.text(tx(s.big), x + 7, y + 33); this.font('normal', 7.2, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(s.sub), bw - 14), x + 7, y + 45); if (i < n - 1) this.arrow(x + bw + 2, x + bw + g - 2, y + bh / 2, '', false); });
      y += bh + 8;
      y = this.note(this.T('Los contratos (RPO) fijan la demanda; los socios de centros de datos y el capex de Oracle crean la capacidad; deuda, capital y prepagos de clientes la financian; los megavatios entregados se convierten en ingresos de nube. Un capex que crece antes que los ingresos es la esencia de la expansión: la capacidad se paga antes de facturarse.', 'Contracts (RPO) set demand; data-center partners and Oracle\'s capex create the capacity; debt, equity and customer prepayments fund it; megawatts delivered turn into cloud revenue. Capex growing ahead of revenue is the essence of the buildout: capacity is paid for before it is billed.'), y, 8) + 4;
      const gap = 24, wl = this.width() * 0.55, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const qs = M.Q.slice(-8), mwById = Object.fromEntries(cq.map((x) => [String(x.id).replace(/^FY/, ''), x.mw]));
      let yl = this.heading(this.T('Capex (barras) e ingresos de nube (línea), US$ millones, eje izq. · RPO, US$ mil M, eje der.', 'Capex (bars) and cloud revenue (line), US$ million, left axis · RPO, US$ bn, right axis'), this.cur.x0, y, 9.5);
      const h = Math.min(this.cur.y1 - yl - 40, 265);
      const img1 = this.chart({ type: 'bar', data: { labels: qs.map((x) => this.qlab(x)), datasets: [
        { type: 'bar', label: 'Capex (US$ M)', data: qs.map((x) => (x.cf && x.cf.capex != null ? -x.cf.capex : null)), backgroundColor: alpha(PALETTE[0], 0.8), yAxisID: 'y', order: 10, maxBarThickness: 30 },
        { type: 'line', label: this.T('Ingresos de nube (US$ M)', 'Cloud revenue (US$ M)'), data: qs.map((x) => { const r = M.revOnNewBasis(x); return r ? r.revCloud : null; }), borderColor: PALETTE[1], backgroundColor: PALETTE[1], yAxisID: 'y', spanGaps: true, pointRadius: 3 },
        { type: 'line', label: this.T('RPO (US$ mil M, eje der.)', 'RPO (US$ bn, right axis)'), data: qs.map((x) => (x.kpi.rpo != null ? x.kpi.rpo / 1000 : null)), borderColor: '#c0392b', backgroundColor: '#ffffff', yAxisID: 'y2', spanGaps: true, borderDash: [5, 3], pointRadius: 3, pointBorderColor: '#c0392b', pointBorderWidth: 2 },
      ] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
      yl = this.image(img1, this.cur.x0, yl, wl, h);
      let yr = this.heading(this.T('Capacidad entregada por trimestre (MW) y acumulado', 'Capacity delivered per quarter (MW) and cumulative'), xr, y, 9.5);
      let cum = 0; const cumul = cq.map((x) => (cum += x.mw));
      const img2 = this.chart({ type: 'bar', data: { labels: cq.map((x) => M.boLabel(x.id)), datasets: [{ type: 'bar', label: this.T('MW entregados', 'MW delivered'), data: cq.map((x) => x.mw), backgroundColor: cq.map((x) => (x.derived ? alpha(PALETTE[0], 0.45) : PALETTE[0])), maxBarThickness: 34 }, { type: 'line', label: this.T('Acumulado', 'Cumulative'), data: cumul, borderColor: PALETTE[1], backgroundColor: PALETTE[1], pointRadius: 3 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h * 1.6));
      yr = this.image(img2, xr, yr, wr, h);
      void mwById; void fyMw;
      this.noteAbove(this.T(`Barras translúcidas: trimestre derivado de las razones que dio la administración. Fuentes: comunicados de resultados (capex, ingresos, RPO); transcripciones de las llamadas (MW entregados, capacidad asegurada, financiamiento) · ${this.T('al', 'as of')} ${ql}.`, `Translucent bars: quarter derived from the ratios management gave. Sources: earnings releases (capex, revenue, RPO); call transcripts (MW delivered, secured capacity, funding) · as of ${ql}.`), Math.max(yl, yr) + 6);
    }

    // ================= 14. 10 RPO EXPLAINED =================
    rpoPage() {
      const M = this.M, R = M.REF.rpo || {}, lastQ = M.lastQ, rpo = lastQ.kpi.rpo;
      let y = this.page('L', this.T('10 · Qué es el RPO (obligaciones de desempeño restantes)', '10 · RPO (Remaining Performance Obligations) Explained'), this.T(`RPO de US$ ${this.n(rpo / 1000, 0)} mil M al ${R.latestQuarter || this.qlab(lastQ)} · calendario de reconocimiento del Formulario 10-Q${R.quoteSource ? ` (${this.date(R.quoteSource.date)})` : ''}`, `RPO of US$ ${this.n(rpo / 1000, 0)} bn at ${R.latestQuarter || this.qlab(lastQ)} · recognition schedule from the Form 10-Q${R.quoteSource ? ` (${this.date(R.quoteSource.date)})` : ''}`));
      // diagram: contract -> RPO -> capacity -> revenue
      const boxes = [
        [this.T('Contrato firmado', 'Contract signed'), this.T('Contrato plurianual de nube (OCI) para cargas de IA', 'Multi-year cloud (OCI) contract for AI workloads')],
        [this.T('RPO sube de inmediato', 'RPO rises at once'), this.T('Todo el valor del contrato entra a la cartera, aunque no se haya facturado', 'The full contract value joins the backlog before anything is billed')],
        [this.T('Capacidad construida', 'Capacity built'), this.T('Centros de datos y GPU: el capex se paga antes de facturar', 'Data centers and GPUs: capex is paid before billing')],
        [this.T('Ingreso reconocido', 'Revenue recognised'), this.T('Trimestre a trimestre, conforme corren las cargas de trabajo', 'Quarter by quarter, as the workloads actually run')],
      ];
      const n = boxes.length, g = 26, bw = (this.width() - (n - 1) * g) / n, bh = 52;
      boxes.forEach((b, i) => { const x = this.cur.x0 + i * (bw + g); this.box(x, y, bw, bh, b[0], b[1]); if (i < n - 1) this.arrow(x + bw + 3, x + bw + g - 3, y + bh / 2, '', false); });
      y += bh + 14;
      const gap = 26, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T('En una frase', 'In one sentence'), this.cur.x0, y, 10);
      yl = this.text(M.L(R.plain), this.cur.x0, yl, wl, 8.6, 'normal', INK) + 6;
      if (R.quote) { yl = this.heading(this.T('Lo que dice Oracle en el 10-Q', 'What Oracle says in the 10-Q'), this.cur.x0, yl, 10); yl = this.text(M.L(R.quote), this.cur.x0, yl, wl, 8, 'italic', MUTED) + 2; if (R.quoteSource) yl = this.note(`${R.quoteSource.title} (${this.date(R.quoteSource.date)})`, yl, 7, this.cur.x0, wl) + 4; }
      yl = this.heading(this.T('Cómo leerlo', 'Reading it'), this.cur.x0, yl, 10);
      yl = this.bullets([M.L(R.caution), this.T('Es un indicador adelantado, no ingreso asegurado: su conversión depende de la capacidad que Oracle construya y energice; por eso se lee junto con el capex (secciones 03 y 09).', 'It is a leading indicator, not assured revenue: conversion depends on the capacity Oracle builds and energises, which is why it is read with capex (sections 03 and 09).')], this.cur.x0, yl, wl, 8.2, { gap: 3 });
      // right: schedule chart + table
      const sched = R.schedule || [];
      let yr = this.heading(this.T(`Calendario de reconocimiento (US$ mil millones del RPO de ${this.n(rpo / 1000, 0)})`, `Recognition schedule (US$ billion of the ${this.n(rpo / 1000, 0)} RPO)`), xr, y, 10);
      const h = 150;
      const img = this.chart({ type: 'bar', data: { labels: sched.map((s) => this.T(s.bucket_es, s.bucket_en)), datasets: [{ label: this.T('Monto (US$ mil M)', 'Amount (US$ bn)'), data: sched.map((s) => s.amount_bn), backgroundColor: sched.map((_, i) => [PALETTE[0], PALETTE[2], PALETTE[1], PALETTE[5]][i % 4]), maxBarThickness: 46 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9.5 } } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h * 1.6));
      yr = this.image(img, xr, yr, wr, h) + 6;
      const rows = sched.map((s) => [this.T(s.bucket_es, s.bucket_en), this.pct(s.pct, 0), `US$ ${this.n(s.amount_bn)} ${this.T('mil M', 'bn')}`]);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Horizonte de reconocimiento', 'Recognition horizon'), '%', this.T('Monto', 'Amount')], body: rows, meta: rows.map(() => ['left', '', 'bold']), size: 8.4, cols: { 0: { halign: 'left', cellWidth: wr * 0.5 } } });
      const q8 = M.Q.slice(-6).filter((q) => q.kpi.rpo != null);
      const rr = q8.map((q) => [this.qlab(q), `US$ ${this.n(q.kpi.rpo / 1000, 0)} ${this.T('mil M', 'bn')}`, q.kpi.rpoYoyPct != null ? this.pct(q.kpi.rpoYoyPct, 0, true) : '—']);
      if (this.cur.y1 - yr > 120) { yr = this.heading(this.T('RPO por trimestre', 'RPO by quarter'), xr, yr + 8, 10); yr = this.fitTable({ y: yr, x: xr, w: wr, head: [this.T('Trimestre', 'Quarter'), 'RPO', this.T('a/a declarado', 'stated y/y')], body: rr, meta: rr.map((r) => ['left', 'bold', this.cls(1)]), cols: { 0: { halign: 'left' } } }, [8, 7.4, 6.8], this.cur.y1 - 30); }
      this.noteAbove(this.T('Fuentes: Formulario 10-Q de Oracle (calendario de reconocimiento y definición); comunicados de resultados (RPO por trimestre, redondeado a miles de millones). Montos = porcentajes aplicados al RPO total.', 'Sources: Oracle Form 10-Q (recognition schedule and definition); earnings releases (RPO by quarter, rounded to billions). Amounts = percentages applied to total RPO.'), Math.max(yl, yr) + 6);
    }

    // ================= 15. 11 DEBT DETAIL AND CREDIT RISK =================
    creditPage() {
      const M = this.M, D2 = M.REF.debt || {}, all = D2.instruments || [], lastQ = M.lastQ, CDS = M.CDS || {};
      const dated = all.filter((i) => i.matures && i.principalUsdM != null), total = all.reduce((a, i) => a + (i.principalUsdM || 0), 0);
      const typeEn = (i) => (typeof i.type === 'string' ? i.type : (i.type && i.type.en) || '');
      const fixed = dated.filter((i) => typeEn(i) === 'senior notes' && i.ratePct != null), rated = all.filter((i) => i.ratePct != null && !/floating|FRN/i.test(typeEn(i))), frn = all.filter((i) => /floating|FRN/i.test(typeEn(i)));
      const wavg = (arr) => { const p = arr.reduce((a, i) => a + i.principalUsdM, 0); return p ? arr.reduce((a, i) => a + i.ratePct * i.principalUsdM, 0) / p : null; };
      const end = M.qEndDate(lastQ); const lim = (months) => { const d = new Date(end + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + months); return d.toISOString().slice(0, 10); };
      const within = (months) => dated.filter((i) => i.matures > end && i.matures <= lim(months)).reduce((a, i) => a + i.principalUsdM, 0);
      const m12 = within(12), m24 = within(24), cash = lastQ.bs ? lastQ.bs.cashAndInvestments : null;
      let y = this.page('L', this.T('11 · Detalle de la deuda y riesgo de crédito', '11 · Debt Detail and Credit Risk'), this.T(`${all.length} instrumentos de la nota de deuda del 10-K del AF2026 (al 31 de mayo de 2026) · efectivo del balance del ${this.qlab(lastQ)} · US$ millones`, `${all.length} instruments from the FY2026 10-K debt footnote (as of 31 May 2026) · cash from the ${this.qlab(lastQ)} balance sheet · US$ million`));
      y = this.tiles([
        { v: this.bn(total), l: this.T(`principal total · ${frn.length} nota(s) a tasa flotante fuera del promedio`, `total principal · ${frn.length} floating-rate note(s) outside the average`) },
        { v: this.pct(wavg(fixed), 2), l: this.T(`cupón promedio ponderado, bonos a tasa fija (${fixed.length})`, `weighted-average coupon, fixed-rate notes (${fixed.length})`) },
        { v: this.pct(wavg(rated), 2), l: this.T('promedio ponderado incl. crédito a plazo y papel comercial', 'weighted average incl. term loan and commercial paper') },
        { v: this.usdM(m12), l: this.T(`vence en los 12 meses posteriores al ${this.qlab(lastQ)} · US$ ${this.n(m24)} M en 24 meses`, `matures in the 12 months after ${this.qlab(lastQ)} · US$ ${this.n(m24)} M within 24 months`) },
        { v: this.usdM(cash), l: this.T(`efectivo e inversiones al ${this.date(end)}`, `cash and investments at ${this.date(end)}`) },
      ], y);
      const gap = 24, wl = this.width() * 0.46, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const mb = M.maturityBuckets(dated); let cum = 0; const cp = all.find((i) => !i.matures);
      const rows = mb.map((b) => { cum += b.principal; return [b.label + (b.matured ? this.T(' (vencido)', ' (matured)') : ''), String(b.n), this.n(b.principal), this.pct(100 * b.principal / total), this.pct(100 * cum / total), b.coupon != null ? this.pct(b.coupon, 2) : '—']; });
      if (cp) rows.push([M.LS(cp.name), '1', this.n(cp.principalUsdM), this.pct(100 * cp.principalUsdM / total), '—', cp.ratePct != null ? this.pct(cp.ratePct, 2) : '—']);
      rows.push([M.t('total'), String(all.length), this.n(total), '100%', '', this.pct(wavg(fixed), 2)]);
      let yl = this.heading(this.T('Vencimientos por año calendario', 'Maturity schedule by calendar year'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [this.T('Año de vencimiento', 'Maturity year'), this.T('Instr.', 'Instr.'), M.t('principal'), this.T('% del total', '% of total'), this.T('Acumulado', 'Cumulative'), this.T('Cupón prom.', 'Avg. coupon')], body: rows, meta: rows.map((r, i) => (i === rows.length - 1 ? ['bold left', 'bold', 'bold', 'bold', '', 'bold'] : [r[0].includes('(') && i < mb.length ? 'muted left' : 'left', '', '', '', '', ''])), size: 8, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 } } });
      // CDS box
      const pts = CDS.points || [];
      const cdsTxt = pts.length ? this.T(`CDS a ${CDS.tenor || 5} años: ${this.n(pts[pts.length - 1][1])} pb al ${this.date(pts[pts.length - 1][0])} (${CDS.source}).`, `${CDS.tenor || 5}-year CDS: ${this.n(pts[pts.length - 1][1])} bp at ${this.date(pts[pts.length - 1][0])} (${CDS.source}).`) : this.T(`CDS a ${CDS.tenor || 5} años: pendiente del conector de FactSet; al conectarse, esta página mostrará el spread, su variación a 1 año y la probabilidad de incumplimiento implícita.`, `${CDS.tenor || 5}-year CDS: pending the FactSet connector; once connected this page shows the spread, its 1-year change and the implied default probability.`);
      yl = this.bullets([cdsTxt, M.LS(D2.instrumentsNote) || ''].filter(Boolean), this.cur.x0, yl + 8, wl, 7.6, { gap: 3, color: MUTED });
      // right: instruments maturing within 36 months (plus the one just matured)
      const soon = all.filter((i) => i.matures && i.matures <= lim(36)).sort((a, b) => a.matures.localeCompare(b.matures));
      let yr = this.heading(this.T(`Instrumentos que vencen hasta ${this.date(lim(36))} (36 meses)`, `Instruments maturing through ${this.date(lim(36))} (36 months)`), xr, y, 10);
      const ir = soon.map((i) => [M.LS(i.name).replace(/^Fixed-Rate Senior Notes Due /i, this.T('Bonos senior ', 'Senior notes ')).replace(/^Floating-Rate Senior Notes Due /i, this.T('Bonos flotantes ', 'Floating notes ')), this.date(i.matures), this.n(i.principalUsdM), M.LS(i.rate) || '—']);
      const noteStr = this.T(`Instrumentos vencidos después del 31 de mayo de 2026 se muestran atenuados hasta que el 10-Q confirme el pago. Cupón promedio ponderado por principal de los bonos a tasa fija de cada grupo. Fuentes: Formulario 10-K AF2026, nota de deuda; balance del ${this.qlab(lastQ)}; calificaciones en la sección 07. Referencia actualizada ${this.date(M.REF.updatedAt)}.`, `Instruments matured after 31 May 2026 are greyed until the 10-Q confirms repayment. Average coupon is principal-weighted across each group's fixed-rate notes. Sources: Form 10-K FY2026, debt footnote; ${this.qlab(lastQ)} balance sheet; ratings in section 07. Reference updated ${this.date(M.REF.updatedAt)}.`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('instrument'), M.t('matures'), this.T('Principal (US$ M)', 'Principal (US$ M)'), M.t('rate')], body: ir, meta: soon.map((i) => [(i.matures < this.todayIso ? 'muted ' : '') + 'left', i.matures < this.todayIso ? 'muted' : '', i.matures < this.todayIso ? 'muted' : 'bold', 'left']), cols: { 0: { halign: 'left', cellWidth: wr * 0.4 }, 3: { halign: 'left' } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - noteH - 12);
      this.noteAbove(noteStr, Math.max(yl, yr) + 6);
    }

    // ================= 16. SOURCES AND METHODOLOGY =================
    sourcesPage() {
      const M = this.M;
      let y = this.page('L', this.T('Fuentes y metodología', 'Sources and Methodology'), this.T('Todo el contenido proviene de información pública; cada bloque de datos se actualiza automáticamente con la cadencia indicada', 'All content comes from public information; each data block refreshes automatically at the cadence shown'));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const d = (iso) => this.date((iso || '').slice(0, 10));
      const rows = [
        [this.T('Estados financieros trimestrales, acumulados y anuales', 'Quarterly, YTD and annual statements'), this.T('días hábiles, tras cada 8-K', 'weekdays, after each 8-K'), this.T('cosecha de los 8-K en SEC EDGAR, validada antes de publicarse', 'harvest of the 8-Ks from SEC EDGAR, validated before publishing'), d(M.FIN.generatedAt)],
        [this.T('Guía de la administración', 'Management guidance'), this.T('con cada reporte / transcripción', 'with each report / transcript'), this.T('comunicados y transcripciones de las llamadas', 'releases and call transcripts'), d(M.GD.generatedAt)],
        [this.T('Comentarios del estado de resultados', 'Income-statement comments'), this.T('por trimestre (revisados)', 'per quarter (reviewed)'), this.T('comunicado y transcripción de cada trimestre', 'each quarter\'s release and transcript'), d(M.CM.updatedAt)],
        [this.T('Resumen ejecutivo', 'Executive summary'), this.T('con cada reporte', 'with each report'), this.T('redactado a partir de los datos y comunicados', 'written from the data files and releases'), d(M.SUM.updatedAt)],
        [this.T('Precios, dividendos, tasas', 'Prices, dividends, yields'), this.T('diario, tras el cierre de la NYSE', 'daily after the NYSE close'), `${M.MK.prices.ORCL ? M.MK.prices.ORCL.source : ''} · FRED (SP500, DGS10)`, d(M.MK.generatedAt)],
        [this.T('Referencia: acciones, deuda, calificaciones, RPO', 'Reference: shares, debt, ratings, RPO'), this.T('por evento (revisado)', 'event-driven (reviewed)'), this.T('10-K, 10-Q y comunicados de las agencias', '10-K, 10-Q and agency releases'), d(M.REF.updatedAt)],
        [this.T('Expansión de IA: capacidad, sitios, financiamiento', 'AI buildout: capacity, sites, funding'), this.T('tras cada llamada de resultados', 'after each earnings call'), this.T('transcripciones y comunicados de desarrolladores', 'transcripts and developer releases'), M.BO ? d(M.BO.updated) : '—'],
        [this.T('CDS a 5 años', '5-year CDS'), this.T('pendiente', 'pending'), 'FactSet', M.CDS && M.CDS.updatedAt ? d(M.CDS.updatedAt) : '—'],
      ];
      let yl = this.heading(this.T('Cómo se actualiza cada bloque', 'How each block is refreshed'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [M.t('block'), M.t('cadence'), M.t('mechanism'), M.t('lastUpdate')], body: rows, meta: rows.map(() => ['left', 'left', 'left small', '']), size: 7.8, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 }, 1: { halign: 'left', cellWidth: wl * 0.2 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.14 } } });
      const meth = [
        this.T('Trimestres, acumulado y UDM: Oracle imprime el estado de flujos de forma acumulada; los trimestres discretos se obtienen por diferencia y se verifican contra el total anual. Los últimos doce meses suman los cuatro trimestres más recientes; el balance es siempre al cierre del periodo.', 'Quarters, YTD and LTM: Oracle prints the cash-flow statement cumulatively; discrete quarters are derived by difference and checked against the annual total. Last twelve months sums the four most recent quarters; the balance sheet is always the period-end position.'),
        this.T('Base de ingresos: desde el 1T26 Oracle presenta Nube / Software; los periodos anteriores se muestran como Oracle mismo los reexpresó cuando se comparan con periodos posteriores. Crecimiento de nube de la guía comparado en esa base.', 'Revenue basis: from 1Q26 Oracle presents Cloud / Software; earlier periods are shown as Oracle itself recast them when compared with later ones. Guided cloud growth is compared on that basis.'),
        this.T('EBITDA = utilidad de operación GAAP + D&A del flujo de efectivo. Deuda neta = notas por pagar y otros préstamos − efectivo, equivalentes e inversiones negociables. No-GAAP tal como Oracle lo define y concilia en cada comunicado.', 'EBITDA = GAAP operating income + cash-flow D&A. Net debt = notes payable and other borrowings − cash, equivalents and marketable securities. Non-GAAP as Oracle defines and reconciles it in every release.'),
        this.T('Próximos resultados: cuando Oracle publica la fecha, se marca «confirmada»; mientras tanto se supone la mediana del rezago entre el cierre del trimestre y la publicación del mismo trimestre en los tres años anteriores.', 'Next results: once Oracle publishes the date it is marked "confirmed"; until then it is assumed from the median lag between quarter-end and release for the same quarter in the previous three years.'),
        this.T('Mercado: cierres diarios (precio, sin dividendos reinvertidos); acciones en circulación de la portada del 10-Q. Las citas de las llamadas provienen de transcripciones aportadas por la autora y no se republican.', 'Market: daily closes (price only, dividends not reinvested); shares outstanding from the 10-Q cover page. Call quotes come from transcripts supplied by the author and are not republished.'),
      ];
      yl = this.heading(this.T('Metodología', 'Methodology'), this.cur.x0, yl + 10, 10);
      yl = this.bullets(meth, this.cur.x0, yl, wl, 7.9, { gap: 3 });
      const srcs = [
        ['SEC EDGAR — Oracle Corporation (CIK 1341439)', this.T('Comunicados de resultados (Anexo 99.1 del 8-K), Formularios 10-Q y 10-K; base de todos los estados financieros, la deuda y el RPO.', 'Earnings releases (Exhibit 99.1 to 8-K), Forms 10-Q and 10-K; the basis of every statement, debt and RPO figure.'), 'sec.gov'],
        [this.T('Oracle — Relación con inversionistas', 'Oracle — Investor relations'), this.T('Comunicados, presentaciones y webcasts de resultados.', 'Releases, presentations and results webcasts.'), 'investor.oracle.com'],
        [this.T('Transcripciones de llamadas de resultados', 'Earnings-call transcripts'), this.T('Aportadas por la autora del modelo (FactSet CallStreet); citas breves con orador y página.', 'Supplied by the model\'s author (FactSet CallStreet); short quotes with speaker and page.'), '—'],
        [this.T('Precios diarios', 'Daily prices'), `${M.MK.prices.ORCL ? M.MK.prices.ORCL.source : 'Nasdaq'} (ORCL); ${this.T('S&P 500 de FRED (SP500)', 'S&P 500 from FRED (SP500)')}.`, 'nasdaq.com · fred.stlouisfed.org'],
        ['FRED — Federal Reserve Bank of St. Louis', this.T('Tesoro a 10 años (DGS10) para la tasa libre de riesgo.', '10-year Treasury (DGS10) for the risk-free rate.'), 'fred.stlouisfed.org'],
        [this.T('Agencias calificadoras', 'Rating agencies'), this.T("Moody's, S&P Global Ratings y Fitch: comunicados de acción de calificación.", "Moody's, S&P Global Ratings and Fitch: rating-action releases."), 'moodys.com · spglobal.com · fitchratings.com'],
        [this.T('Desarrolladores de centros de datos y prensa especializada', 'Data-center developers and trade press'), this.T('Crusoe, Vantage/DigitalBridge, Related; DCD, CNBC, Construction Dive: capacidad y financiamiento de los sitios nombrados.', 'Crusoe, Vantage/DigitalBridge, Related; DCD, CNBC, Construction Dive: capacity and financing of the named sites.'), this.T('enlaces por fila en la página', 'links per row on the page')],
      ];
      let yr = this.heading(this.T('Fuentes', 'Sources'), xr, y, 10);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Fuente', 'Source'), this.T('Qué aporta', 'What it provides'), 'URL'], body: srcs, meta: srcs.map(() => ['bold left', 'left small', 'left small']), size: 7.8, cols: { 0: { halign: 'left', cellWidth: wr * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wr * 0.26 } } });
      yr = this.text(this.T(`Este documento se generó automáticamente el ${this.longDate(this.today)} desde fnam.mx/oracle con los datos vigentes en ese momento; las cifras de mercado son del último cierre disponible y el resto de la información de los últimos reportes publicados por Oracle. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.today)} from fnam.mx/oracle with the data current at that moment; market figures are from the latest available close and everything else from Oracle's latest published reports. It is not investment advice.`), xr, yr + 12, wr, 8.2, 'normal', MUTED);
      this.font('bold', 9, ACCENT); this.pdf.text(tx(this.confidential()), xr, yr + 16);
    }
  }

  window.ORCL_PRESENT = { build };
  P.autoRun(build);
})();
