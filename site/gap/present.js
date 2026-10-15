/* GAP board presentation — one click builds a Letter PDF from the same data the page renders.
   Every figure comes from window.GAP_MODEL (app.js), i.e. the calculations already on screen; nothing is
   typed in here except section prose, which is trimmed to bullets and quotes the reference data.
   The generic engine (pages, tables, charts, cover, footers) lives in /assets/present-core.js; this file
   only adds GAP's pages. Language follows the page toggle.
   Sections are numbered in the deck's own reading order (00 key messages … 11 sources, A appendix); the page
   fnam.mx/gap keeps its own numbering (owner, 15-Oct-2026). The Spanish deck prints UAFIDA, UPA and UDM for
   EBITDA, EPS and LTM through the engine's glossary. */
(function () {
  'use strict';
  const MX_TRAFFIC = '/aeropuertos/data/traffic.js';               // national series (AFAC) for the GAP-vs-Mexico chart
  const P = window.FNAM_PRESENT;
  const { tx, gl } = P;
  const { INK, MUTED, ACCENT, GRID, HEAD, ALT, POS, NEG, PALETTE } = P.C;

  const CFG = { slug: 'gap', short: 'GAP', tickerLine: 'BMV: GAP  ·  NYSE: PAC', url: 'fnam.mx/gap', fileStem: 'GAP_PAC', publicSources: 'informes y comunicados de GAP, eventos relevantes BMV, SEC', publicSourcesEn: 'GAP reports and releases, BMV material events, SEC' };
  // Deck sections in reading order; the label is the position (00, 01 …) except the appendix (A).
  const SECTIONS = [
    { id: 'key', es: 'Mensajes clave', en: 'Key messages' },
    { id: 'summary', es: 'Resumen ejecutivo', en: 'Executive summary' },
    { id: 'tear', es: 'Ficha técnica', en: 'Tear sheet' },
    { id: 'statements', es: 'Resultados', en: 'Results' },
    { id: 'guidance', es: 'Guía de la administración', en: 'Management guidance' },
    { id: 'traffic', es: 'Tráfico', en: 'Traffic' },
    { id: 'debt', es: 'Apalancamiento, deuda y liquidez', en: 'Leverage, debt and liquidity' },
    { id: 'dividends', es: 'Dividendos', en: 'Dividends' },
    { id: 'cbx', es: 'Cross Border Xpress (CBX)', en: 'Cross Border Xpress (CBX)' },
    { id: 'fibra', es: 'FIBRA GAP', en: 'FIBRA GAP' },
    { id: 'relative', es: 'Valuación relativa', en: 'Relative valuation' },
    { id: 'method', es: 'Fuentes y metodología', en: 'Sources and methodology' },
    { id: 'appendix', es: 'Apéndice', en: 'Appendix', label: 'A' },
  ];
  // Spanish finance terms the owner asked for in the Spanish deck (applied by the engine to every string it draws).
  const GLOSSARY_ES = [[/\bEBITDA\b/g, 'UAFIDA'], [/\bEPS\b/g, 'UPA'], [/\bLTM\b/g, 'UDM']];

  // ---------- builder ----------
  async function build() {
    const M = window.GAP_MODEL;
    await P.run(M, window.MX_AIRPORTS ? [] : [MX_TRAFFIC], async () => {
      P.setGlossary(M.LANG === 'es' ? GLOSSARY_ES : null);
      const doc = new GapDoc(M);
      doc.cover();
      doc.at('key'); doc.keyMessages();
      doc.at('summary'); doc.execSummary(); doc.at(null); doc.contents();
      doc.at('tear'); doc.tearSheet();
      doc.at('statements'); doc.opsPage(); doc.incomePage('q'); doc.bridgePage(); doc.countryPage(); doc.incomePage('ltm'); doc.incomePage('fy');
      doc.at('guidance'); doc.guidancePage();
      doc.at('traffic'); doc.trafficTables(); doc.trafficCharts();
      doc.at('debt'); doc.debtPage(); doc.liquidityPage();
      doc.at('dividends'); doc.dividendPage();
      doc.at('cbx'); doc.cbxPage();
      doc.at('fibra'); doc.fibraPage();
      doc.at('relative'); doc.relativePages();
      doc.at('method'); doc.sourcesPage();
      doc.at('appendix'); doc.appendixGuidance(); doc.appendixDividends(); doc.at(null);
      doc.contentsPage();
      doc.finish();
    });
  }

  class GapDoc extends P.Doc {
    constructor(M) {
      super(M, { ...CFG, name: M.REF.company ? M.REF.company.name : 'Grupo Aeroportuario del Pacífico', tickerLine: `BMV: ${(M.REF.company && M.REF.company.short) || 'GAP'}  ·  NYSE: PAC` });
      this.MX = window.MX_AIRPORTS || null;
      this.next = this.nextResults();
      this.trackPages = true; // page() records every page for the contents page
    }
    at(sec) { this.sec = sec; }
    // The engine's executive summary names its own page title; the deck's section number is prefixed through this hook.
    page(orient, title, subtitle) { if (this._prefix && title) { title = this._prefix + title; this._prefix = null; } return super.page(orient, title, subtitle); }
    // The deck's own section numbers (reading order), used by secNo() in the titles and by the contents page.
    pageSectionMeta() { const out = {}; let n = 0; for (const s of SECTIONS) out[s.id] = { label: s.label || String(n++).padStart(2, '0'), title: this.T(s.es, s.en) }; return out; }
    // One sentence for every "next results" mention: the model's rule (assumed date, GAP has not announced it, FactSet's projection).
    nextText() { const n = this.next; const q = n ? this.qlab(n.q) : ''; return this.T(`Próximos resultados (${q}): ${this.M.nextResultsText()}`, `Next results (${q}): ${this.M.nextResultsText()}`); }
    contentsPage() {
      this.drawContents(this.tocEntries(this.pageSectionMeta()), this.T('Cada fila es un enlace a su página. Las secciones se numeran en el orden de esta presentación (00–11 y apéndice A); la página fnam.mx/gap conserva su propia numeración.', 'Every row links to its page. Sections are numbered in the order of this presentation (00–11 and appendix A); the page fnam.mx/gap keeps its own numbering.'));
    }
    // "(≈5th)" / "(≈día 5)" placeholders in older curated text become the expected date of the next monthly traffic report.
    liveDates(text) {
      const n = this.M.nextTraffic(); if (!n) return text;
      const ord = (d) => (this.es ? String(d) : d + ([, 'st', 'nd', 'rd'][(d % 100 >> 3 ^ 1 && d % 10) || 0] || 'th'));
      return String(text).replace(/\((?:~|≈)\s*(?:día\s*)?\d{1,2}(?:st|nd|rd|th)?\)/g, this.es ? `(hacia el ${n.day} de ${n.month})` : `(around ${n.month} ${ord(n.day)})`);
    }
    basisLine() {
      const M = this.M, lastQ = M.lastQ, lastM = M.TR.months[M.TR.months.length - 1], gv = M.GV[M.GV.length - 1];
      return this.T(`Base: resultados del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}) · tráfico de ${M.ymLabel(lastM.ym)} (${this.date(lastM.source && lastM.source.date)}) · guía del ${this.date(gv.date)} · mercado al cierre del ${this.date(M.lastPx[0])}`,
        `Basis: ${this.qlab(lastQ)} results (${this.date(lastQ.sources.is.date)}) · ${M.ymLabel(lastM.ym)} traffic (${this.date(lastM.source && lastM.source.date)}) · guidance of ${this.date(gv.date)} · market close ${this.date(M.lastPx[0])}`);
    }
    // Change helpers: the model's rule (n.m. on a sign flip) and the color of a numeric change.
    chg(a, b) { return this.M.fmtChg(a, b); }
    chgCls(a, b) { const p = this.M.chgPct(a, b); return typeof p === 'number' ? this.cls(p) : ''; }
    // "Jan–Sep 2026" from the latest month's ym.
    ytdSpan(ym) { const M = this.M; const jan = M.ymLabel(`${ym.slice(0, 4)}-01`).split(' ')[0]; return `${jan}–${M.ymLabel(ym)}`; }
    secTitle(id, tail) { return `${this.secNo(id)}${tail}`; }

    // ================= COVER =================
    cover() {
      const M = this.M, lastQ = M.lastQ, lastM = M.TR.months[M.TR.months.length - 1];
      super.cover(this.T(`Datos: resultados del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}), tráfico de ${M.ymLabel(lastM.ym)}, mercado al ${this.date(M.lastPx[0])}.`, `Data: ${this.qlab(lastQ)} results (${this.date(lastQ.sources.is.date)}), ${M.ymLabel(lastM.ym)} traffic, market as of ${this.date(M.lastPx[0])}.`));
    }

    // ================= 00 KEY MESSAGES =================
    // A strip of headline metrics and six messages, every figure composed from the model (traffic vs guidance from the
    // latest monthly report's year-to-date columns; margin vs guidance from the reported year-to-date; leverage, liquidity,
    // dividends, FIBRA status and the next results date from the same functions the other pages use).
    keyMessages() {
      const M = this.M, A = M.lastQ, B0 = M.qById[M.yoyQid(A)], B = M.cmpBase(A, B0, 'q'), L = M.lastLTM, Lp = L && B0 ? M.cmpBase(L, M.ltmFor(B0), 'ltm') : null;
      const nd = M.netDebt(A), TL = M.trafficLatest(), agm = (M.REF.dividends || []).slice(-1)[0], F = M.REF.fibra || {}, liq = M.liquidity(), cp = M.capexProgress();
      const fyG = M.GV.length ? Math.max(...M.GV.map((v) => v.fy)) : null, gv = fyG ? M.GV.filter((v) => v.fy === fyG).pop() : null, act = fyG ? M.gActual(fyG) : null;
      const GMk = (k) => M.GM.find((m) => m.k === k);
      const tot = TL.rows.TOTAL, ytdChg = tot.ytdYoy, ytdSpan = this.ytdSpan(TL.month.ym);
      const trStatus = gv && typeof ytdChg === 'number' ? M.gStatus(GMk('traffic'), gv.items.traffic, ytdChg) : null;
      const mg = act ? act.v.ebitdaMargin : null, mgStatus = gv && mg != null ? M.gStatus(GMk('ebitdaMargin'), gv.items.ebitdaMargin, mg) : null;
      const lev = nd && L ? nd.net / L.is.ebitda : null; const px = M.lastPx;
      const divPay = A.bs && A.bs.dividendsPayable != null ? A.bs.dividendsPayable : null;
      let y = this.page('L', this.secTitle('key', this.T('Mensajes clave', 'Key Messages')), this.basisLine());
      y = this.tiles([
        { v: this.pct(typeof ytdChg === 'number' ? ytdChg : null, 1, true), l: this.T(`Pasajeros ${ytdSpan} a/a · guía FY${fyG} ${gv ? M.gRange(GMk('traffic'), gv.items.traffic) : '—'} · ${trStatus ? M.t(trStatus).toLowerCase() + ' del rango' : ''}`, `Passengers ${ytdSpan} y/y · FY${fyG} guidance ${gv ? M.gRange(GMk('traffic'), gv.items.traffic) : '—'} · ${trStatus ? M.t(trStatus).toLowerCase() + ' the range' : ''}`) },
        { v: this.pct(mg), l: this.T(`Margen EBITDA ${act ? act.label : ''} (sin IFRIC 12) · guía ${gv ? M.gRange(GMk('ebitdaMargin'), gv.items.ebitdaMargin) : '—'} · ${mgStatus ? M.t(mgStatus).toLowerCase() + ' del rango' : ''}`, `EBITDA margin ${act ? act.label : ''} (ex-IFRIC 12) · guidance ${gv ? M.gRange(GMk('ebitdaMargin'), gv.items.ebitdaMargin) : '—'} · ${mgStatus ? M.t(mgStatus).toLowerCase() + ' the range' : ''}`) },
        { v: L ? `Ps. ${this.m(L.is.ebitda)} M` : '—', l: this.T(`EBITDA UDM al ${this.qlab(A)} · ${Lp ? this.chg(L.is.ebitda, Lp.is.ebitda) + ' a/a' : ''} · margen ${L ? this.pct(L.is.ebitdaMarginExIfric) : '—'}`, `LTM EBITDA to ${this.qlab(A)} · ${Lp ? this.chg(L.is.ebitda, Lp.is.ebitda) + ' y/y' : ''} · margin ${L ? this.pct(L.is.ebitdaMarginExIfric) : '—'}`) },
        { v: lev != null ? this.x(lev, 2) : '—', l: this.T(`Deuda neta / EBITDA UDM · Ps. ${nd ? this.m(nd.net) : '—'} M al ${this.date(M.qEndDate(A))}`, `Net debt / LTM EBITDA · Ps. ${nd ? this.m(nd.net) : '—'} M at ${this.date(M.qEndDate(A))}`) },
        { v: divPay != null ? `Ps. ${this.m(divPay)} M` : '—', l: this.T(`Dividendo ${agm ? agm.agmYear : ''} (Ps. ${agm ? this.n(agm.dps, 2) : '—'} por acción) por pagar al ${this.date(M.qEndDate(A))} · ${M.liveTokens('{{divYield}}')} sobre el cierre`, `${agm ? agm.agmYear : ''} dividend (Ps. ${agm ? this.n(agm.dps, 2) : '—'} per share) payable at ${this.date(M.qEndDate(A))} · ${M.liveTokens('{{divYield}}')} yield on the close`) },
        { v: F.placed ? this.T('Colocada', 'Placed') : this.T('Pendiente', 'Pending'), l: this.T(`FIBRA GAP: ${F.placed ? 'colocada el ' + this.date(F.placedDate) : 'no colocada al ' + this.date(F.statusAsOf)} (comunicados de GAP y eventos relevantes BMV)`, `FIBRA GAP: ${F.placed ? 'placed on ' + this.date(F.placedDate) : 'not placed as of ' + this.date(F.statusAsOf)} (GAP releases and BMV material events)`) },
      ], y, 54);
      const exRev = (o) => o.is.revTotal - (o.is.revConstruction || 0);
      const br = M.ebitdaBridge(A, B), ex = M.exCbx(A, B), lfl = M.likeForLike(A, B), BC = TL.byCountry || {};
      const fac = liq && liq.facilities && liq.facilities[0];
      const fyPrev = M.Y.find((yy) => yy.fy === (agm ? agm.agmYear : 0) - 1), psPrev = fyPrev ? M.perShare(fyPrev) : null;
      const payout = psPrev && psPrev.eps && agm ? 100 * agm.dps / psPrev.eps : null;
      const items = [
        this.T(`**Tráfico:** ${this.n(tot.v / 1000, 2)} M de pasajeros en ${M.ymLabel(TL.month.ym)} (${M.fmtChgV(tot.yoy)} a/a); acumulado ${ytdSpan} ${this.pct(typeof ytdChg === 'number' ? ytdChg : null, 1, true)} frente a una guía FY${fyG} de ${gv ? M.gRange(GMk('traffic'), gv.items.traffic) : '—'}: ${trStatus ? M.t(trStatus).toLowerCase() + ' del rango' : ''}. México ${this.chg(BC.MX && BC.MX.ytd, BC.MX && BC.MX.ytdPrior)}, Jamaica ${this.chg(BC.JM && BC.JM.ytd, BC.JM && BC.JM.ytdPrior)}; usuarios de CBX ${M.fmtChgV(TL.cbx.ytdYoy)} (columnas acumuladas del reporte mensual de GAP).`,
          `**Traffic:** ${this.n(tot.v / 1000, 2)} M passengers in ${M.ymLabel(TL.month.ym)} (${M.fmtChgV(tot.yoy)} y/y); ${ytdSpan} ${this.pct(typeof ytdChg === 'number' ? ytdChg : null, 1, true)} against FY${fyG} guidance of ${gv ? M.gRange(GMk('traffic'), gv.items.traffic) : '—'}: ${trStatus ? M.t(trStatus).toLowerCase() + ' the range' : ''}. Mexico ${this.chg(BC.MX && BC.MX.ytd, BC.MX && BC.MX.ytdPrior)}, Jamaica ${this.chg(BC.JM && BC.JM.ytd, BC.JM && BC.JM.ytdPrior)}; CBX users ${M.fmtChgV(TL.cbx.ytdYoy)} (year-to-date columns of GAP's monthly report).`),
        this.T(`**${this.qlab(A)}:** ingresos sin IFRIC 12 Ps. ${this.m(exRev(A))} M (${this.chg(exRev(A), exRev(B))}), EBITDA Ps. ${this.m(A.is.ebitda)} M (${this.chg(A.is.ebitda, B.is.ebitda)}), margen ${this.pct(A.is.ebitdaMarginExIfric)} (${this.n(A.is.ebitdaMarginExIfric - B.is.ebitdaMarginExIfric, 1)} pp). CBX aportó Ps. ${br ? this.m(br.cbx.ebitda) : '—'} M de EBITDA en dos meses y la cuota de asistencia técnica desapareció (${br ? '+Ps. ' + this.m(br.steps.find((s) => s.k === 'techAssistance').v) + ' M' : ''}); sin CBX el EBITDA creció ${ex ? this.chg(ex.ebitdaA, ex.ebitdaB) : '—'}. Utilidad integral por ADS US$ ${lfl ? this.n(lfl.A.gapAds, 2) : '—'} vs ${lfl ? this.n(lfl.B.gapAds, 2) : '—'} (${lfl ? this.chg(lfl.A.gapAds, lfl.B.gapAds) : '—'}) con ${lfl ? this.pct(lfl.sharesChg, 1) : '—'} más acciones.`,
          `**${this.qlab(A)}:** revenue ex-IFRIC 12 Ps. ${this.m(exRev(A))} M (${this.chg(exRev(A), exRev(B))}), EBITDA Ps. ${this.m(A.is.ebitda)} M (${this.chg(A.is.ebitda, B.is.ebitda)}), margin ${this.pct(A.is.ebitdaMarginExIfric)} (${this.n(A.is.ebitdaMarginExIfric - B.is.ebitdaMarginExIfric, 1)} pp). CBX added Ps. ${br ? this.m(br.cbx.ebitda) : '—'} M of EBITDA in two months and the technical-assistance fee ended (${br ? '+Ps. ' + this.m(br.steps.find((s) => s.k === 'techAssistance').v) + ' M' : ''}); excluding CBX, EBITDA grew ${ex ? this.chg(ex.ebitdaA, ex.ebitdaB) : '—'}. Comprehensive income per ADS US$ ${lfl ? this.n(lfl.A.gapAds, 2) : '—'} vs ${lfl ? this.n(lfl.B.gapAds, 2) : '—'} (${lfl ? this.chg(lfl.A.gapAds, lfl.B.gapAds) : '—'}) on ${lfl ? this.pct(lfl.sharesChg, 1) : '—'} more shares.`),
        this.T(`**Guía FY${fyG}** (${gv && gv.kind === 'revised' ? 'revisada el' : 'emitida el'} ${gv ? this.date(gv.date) : '—'}): tráfico ${gv ? M.gRange(GMk('traffic'), gv.items.traffic) : '—'}, EBITDA ${gv ? M.gRange(GMk('ebitda'), gv.items.ebitda) : '—'}, margen ${gv ? M.gRange(GMk('ebitdaMargin'), gv.items.ebitdaMargin) : '—'}, capex Ps. ${gv && gv.items.capex ? this.n(gv.items.capex.mxnM) : '—'} M. A ${act ? act.label : '—'} el margen va ${mgStatus ? M.t(mgStatus).toLowerCase() + ' del rango' : '—'} y el capex lleva ${cp && cp.ytd != null && cp.guided ? this.pct(100 * cp.ytd / cp.guided, 0) : '—'} de lo guiado (Ps. ${cp && cp.ytd != null ? this.n(cp.ytd) : '—'} M).`,
          `**FY${fyG} guidance** (${gv && gv.kind === 'revised' ? 'revised' : 'issued'} ${gv ? this.date(gv.date) : '—'}): traffic ${gv ? M.gRange(GMk('traffic'), gv.items.traffic) : '—'}, EBITDA ${gv ? M.gRange(GMk('ebitda'), gv.items.ebitda) : '—'}, margin ${gv ? M.gRange(GMk('ebitdaMargin'), gv.items.ebitdaMargin) : '—'}, capex Ps. ${gv && gv.items.capex ? this.n(gv.items.capex.mxnM) : '—'} M. At ${act ? act.label : '—'} the margin is ${mgStatus ? M.t(mgStatus).toLowerCase() + ' the range' : '—'} and capex is ${cp && cp.ytd != null && cp.guided ? this.pct(100 * cp.ytd / cp.guided, 0) : '—'} of the guided amount (Ps. ${cp && cp.ytd != null ? this.n(cp.ytd) : '—'} M).`),
        this.T(`**Apalancamiento y liquidez:** deuda neta Ps. ${nd ? this.m(nd.net) : '—'} M = ${lev != null ? this.x(lev, 2) : '—'} el EBITDA UDM al ${this.date(M.qEndDate(A))}; efectivo Ps. ${liq ? this.n(liq.cash) : '—'} M frente a Ps. ${liq ? this.n(liq.due12) : '—'} M de vencimientos a doce meses${fac ? `; líneas bancarias por Ps. ${this.n(fac.amountMxnM)} M firmadas el ${this.date(fac.date)} (Ps. ${this.n(fac.refinanceMxnM)} M para pagar GAP 22L y GAP 21-V, Ps. ${this.n(fac.capexMxnM)} M para capex del PMD)` : ''}.`,
          `**Leverage and liquidity:** net debt Ps. ${nd ? this.m(nd.net) : '—'} M = ${lev != null ? this.x(lev, 2) : '—'} LTM EBITDA at ${this.date(M.qEndDate(A))}; cash Ps. ${liq ? this.n(liq.cash) : '—'} M against Ps. ${liq ? this.n(liq.due12) : '—'} M maturing within twelve months${fac ? `; Ps. ${this.n(fac.amountMxnM)} M of bank facilities signed ${this.date(fac.date)} (Ps. ${this.n(fac.refinanceMxnM)} M to repay GAP 22L and GAP 21-V, Ps. ${this.n(fac.capexMxnM)} M for MDP capex)` : ''}.`),
        this.T(`**Dividendo ${agm ? agm.agmYear : ''}:** Ps. ${agm ? this.n(agm.dps, 2) : '—'} por acción aprobado el ${agm ? this.date(agm.agmDate) : '—'} (Ps. ${divPay != null ? this.m(divPay) : '—'} M por pagar al ${this.date(M.qEndDate(A))}, sin exhibiciones pagadas; pagadero hasta el ${agm ? this.date(agm.payableUntil) : '—'}); rendimiento ${M.liveTokens('{{divYield}}')} sobre el cierre del ${M.liveTokens('{{lastPxDate}}')} (${M.liveTokens('{{lastPx}}')}); razón de pago ${payout != null ? this.pct(payout, 0) : '—'} de la utilidad neta por acción de FY${fyPrev ? fyPrev.fy : '—'}.`,
          `**${agm ? agm.agmYear : ''} dividend:** Ps. ${agm ? this.n(agm.dps, 2) : '—'} per share approved ${agm ? this.date(agm.agmDate) : '—'} (Ps. ${divPay != null ? this.m(divPay) : '—'} M payable at ${this.date(M.qEndDate(A))}, no installment paid; payable until ${agm ? this.date(agm.payableUntil) : '—'}); ${M.liveTokens('{{divYield}}')} yield on the ${M.liveTokens('{{lastPxDate}}')} close (${M.liveTokens('{{lastPx}}')}); payout ${payout != null ? this.pct(payout, 0) : '—'} of FY${fyPrev ? fyPrev.fy : '—'} net income per share.`),
        this.T(`**FIBRA GAP y PMD:** ${F.placed ? 'colocada el ' + this.date(F.placedDate) : 'sin colocar al ' + this.date(F.statusAsOf) + ' según los comunicados de GAP y los eventos relevantes de la BMV'}; ${M.mdpUseText()}. **${this.next ? this.qlab(this.next.q) : ''}:** ${M.nextResultsText()}.`,
          `**FIBRA GAP and MDP:** ${F.placed ? 'placed on ' + this.date(F.placedDate) : 'not placed as of ' + this.date(F.statusAsOf) + ' per GAP\'s releases and the BMV material events'}; ${M.mdpUseText()}. **${this.next ? this.qlab(this.next.q) : ''}:** ${M.nextResultsText()}.`),
      ];
      const gap = 24, cw = (this.width() - gap) / 2, cols = [items.slice(0, 3), items.slice(3)];
      let size = 11.5; for (; size >= 8; size -= 0.25) { if (Math.max(...cols.map((c) => this.measureBullets(c, cw, size, { gap: 6 }))) <= this.cur.y1 - y - 30) break; }
      let yEnd = y;
      cols.forEach((c, i) => { yEnd = Math.max(yEnd, this.bullets(c, this.cur.x0 + i * (cw + gap), y, cw, size, { gap: 6, lh: 1.32 })); });
      // two small charts when the page has room: monthly traffic y/y (last twelve reports) and quarterly EBITDA with its margin
      const srcH = 24, remH = this.cur.y1 - yEnd - srcH - 16;
      if (remH > 110) {
        const h = Math.min(remH - 18, 150), ms = M.TR.months.slice(-12), qs = M.Q.slice(-8);
        const yoyM = ms.map((m) => (m.chg && m.chg.total && m.chg.total.TOTAL != null ? m.chg.total.TOTAL : (() => { const p = M.TR.months.find((x) => x.ym === `${+m.ym.slice(0, 4) - 1}${m.ym.slice(4)}`); return p ? 100 * (m.total.TOTAL / p.total.TOTAL - 1) : null; })()));
        let yc = this.heading(this.T('Pasajeros por mes · variación a/a (%), últimos doce reportes', 'Passengers by month · y/y change (%), last twelve reports'), this.cur.x0, yEnd + 4, 9.5, cw);
        this.heading(gl(this.T('EBITDA trimestral (Ps. millones) y margen sin IFRIC 12 (%, eje derecho)', 'Quarterly EBITDA (Ps. million) and margin ex-IFRIC 12 (%, right axis)')), this.cur.x0 + cw + gap, yEnd + 4, 9.5, cw);
        const img1 = this.chart({ type: 'bar', data: { labels: ms.map((m) => M.ymLabel(m.ym)), datasets: [{ label: this.T('GAP · a/a %', 'GAP · y/y %'), data: yoyM, backgroundColor: yoyM.map((v) => (v != null && v < 0 ? '#b42318' : PALETTE[0])), maxBarThickness: 26 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: false, callback: (v, i) => M.ymLabel(ms[i].ym).split(' ')[0] } }, y: { ticks: { callback: (v) => v + '%' } } } } }, Math.round(cw * 1.6), Math.round(h * 1.6));
        const img2 = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [{ type: 'line', label: this.T('margen', 'margin'), data: qs.map((q) => q.is.ebitdaMarginExIfric), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.2, pointRadius: 3.5, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0 }, { type: 'bar', label: gl('EBITDA'), data: qs.map((q) => q.is.ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 30, order: 1 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, beginAtZero: false, suggestedMin: 60, suggestedMax: 72, ticks: { callback: (v) => v + '%' } } } } }, Math.round(cw * 1.6), Math.round(h * 1.6));
        this.image(img1, this.cur.x0, yc, cw, h); yEnd = this.image(img2, this.cur.x0 + cw + gap, yc, cw, h);
      }
      this.noteAbove(this.T(`Fuentes: informe trimestral de GAP ${this.qlab(A)} (${this.date(A.sources.is.date)}; base ${this.qlab(B)} como la reexpresa ese informe), reporte mensual de tráfico de ${M.ymLabel(TL.month.ym)} (${this.date(TL.month.source && TL.month.source.date)}), guía del ${gv ? this.date(gv.date) : '—'}, resoluciones de la asamblea del ${agm ? this.date(agm.agmDate) : '—'}, comunicado de líneas bancarias del ${fac ? this.date(fac.date) : '—'}, mercado al cierre del ${this.date(px[0])}. Cifras en Ps. millones salvo indicación.`,
        `Sources: GAP ${this.qlab(A)} quarterly report (${this.date(A.sources.is.date)}; ${this.qlab(B)} base as restated in that report), ${M.ymLabel(TL.month.ym)} monthly traffic report (${this.date(TL.month.source && TL.month.source.date)}), guidance of ${gv ? this.date(gv.date) : '—'}, AGM resolutions of ${agm ? this.date(agm.agmDate) : '—'}, bank-facilities release of ${fac ? this.date(fac.date) : '—'}, market close of ${this.date(px[0])}. Ps. million unless stated.`), yEnd + 6);
    }

    // ================= 01 EXECUTIVE SUMMARY =================
    execSummary() {
      const M = this.M, secs = (M.SUM.sections || []).map((s) => ({ title: M.L(s.title), items: (s[M.LANG] || s.en || []).map((x) => M.liveTokens(this.liveDates(x))) }));
      this._prefix = this.secNo('summary');
      super.execSummary(secs, this.basisLine() + this.T(` · redactado el ${this.date(M.SUM.updatedAt)}`, ` · written ${this.date(M.SUM.updatedAt)}`));
    }

    // ================= 02 TEAR SHEET =================
    tearSheet() {
      const M = this.M, lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ), px = M.lastPx, gap = M.gapPx;
      const sub = this.T(`Mercado: cierre del ${this.date(px[0])} (datos obtenidos ${this.stamp(M.MK.prices['GAPB.MX'].fetchedAt || M.MK.generatedAt)}) · Financieros: ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)})`, `Market: close of ${this.date(px[0])} (data fetched ${this.stamp(M.MK.prices['GAPB.MX'].fetchedAt || M.MK.generatedAt)}) · Financials: ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)})`);
      let y = this.page('L', this.secTitle('tear', this.T('Ficha técnica', 'Tear Sheet')), sub);
      const colW = this.width() * 0.5 - 10, xr = this.cur.x0 + colW + 20;
      const yAgo = M.pointAtOrBefore(gap, M.addDays(px[0], -365)), yStart = M.pointAtOrBefore(gap, `${px[0].slice(0, 4)}-01-01`);
      const ipc = M.px('^MXX'), ipcLast = M.lastPoint(ipc), ipcAgo = ipcLast && M.pointAtOrBefore(ipc, M.addDays(ipcLast[0], -365)), ipcStart = ipcLast && M.pointAtOrBefore(ipc, `${ipcLast[0].slice(0, 4)}-01-01`);
      const chg = (a, b) => (a && b ? 100 * (a[1] / b[1] - 1) : null);
      const w52 = gap.filter((p) => p[0] >= M.addDays(px[0], -365)); const hi = Math.max(...w52.map((p) => p[1])), lo = Math.min(...w52.map((p) => p[1]));
      const fxP = M.pointAtOrBefore(M.fxPts, px[0]); const fx = fxP ? fxP[1] : null;
      const mc = px[1] * M.sharesNow; const ads = M.lastPoint(M.px('PAC'));
      const ev = mc / 1000 + (nd ? nd.net : 0) + ((lastQ.bs && lastQ.bs.nci) || 0);
      const prevQ = M.qById[M.yoyQid(lastQ)], prevQr = prevQ ? M.cmpBase(lastQ, prevQ, 'q') : null;
      const exRev = (o) => (o && o.is ? o.is.revTotal - (o.is.revConstruction || 0) : null);
      const prevL = prevQ && L ? M.cmpBase(L, M.ltmFor(prevQ), 'ltm') : null;
      // traffic KPIs: latest month and year-to-date from the report's own columns; last twelve months summed from the reports
      const ms = M.TR.months, lastM = ms[ms.length - 1], TL = M.trafficLatest(), tot = TL.rows.TOTAL; const sum12 = (end) => { const i = ms.findIndex((m) => m.ym === end); return i >= 11 ? ms.slice(i - 11, i + 1).reduce((a, m) => a + m.total.TOTAL, 0) : null; };
      const ltmPax = sum12(lastM.ym), ltmPaxPrev = sum12(`${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const pm = (v) => (v == null ? '' : `${this.pct(v, 1, true)}`);
      const rows = [], meta = [];
      const H = (s) => { rows.push([s, '']); meta.push(['head left', 'head']); };
      const R = (l, v, c) => { rows.push([l, v]); meta.push(['left', c || '']); };
      H(this.T('Mercado', 'Market'));
      R(this.T('Precio GAP B (BMV)', 'GAP B share price (BMV)'), `Ps. ${this.n(px[1], 2)}  ·  ${this.date(px[0])}`);
      if (ads) R(this.T('ADS PAC (NYSE) · 1 ADS = 10 acciones', 'PAC ADS (NYSE) · 1 ADS = 10 shares'), `US$ ${this.n(ads[1], 2)}  ·  ${this.date(ads[0])}`);
      R(this.T('Capitalización de mercado', 'Market capitalization'), `Ps. ${this.n(mc / 1e9, 1)} ${this.T('mil M', 'bn')}${fx ? `  ·  US$ ${this.n(mc / fx / 1e9, 1)} ${this.T('mil M', 'bn')}` : ''}`);
      if (fx) { const fxSrc = String((M.MK.fx && M.MK.fx.USDMXN && M.MK.fx.USDMXN.source) || ''); const fxLab = /banxico/i.test(fxSrc) ? 'Banxico FIX' : /fred|dexmxus/i.test(fxSrc) ? 'FRED DEXMXUS' : fxSrc.split(' (')[0]; R(this.T(`Tipo de cambio usado (${fxLab})`, `FX rate used (${fxLab})`), `${this.n(fx, 4)} MXN/USD  ·  ${this.date(fxP[0])}`, 'muted'); }
      R(this.T('Acciones en circulación', 'Shares outstanding'), `${this.n(M.sharesNow)}  ·  ${M.REF.shares ? this.date(M.REF.shares.asOf) : ''}`, 'muted');
      R(this.T('Variación en el año (GAP B · IPC)', 'Year-to-date change (GAP B · IPC)'), `${pm(chg(px, yStart))}  ·  IPC ${pm(chg(ipcLast, ipcStart))}`, this.cls(chg(px, yStart)));
      R(this.T('Variación 12 meses (GAP B · IPC)', '12-month change (GAP B · IPC)'), `${pm(chg(px, yAgo))}  ·  IPC ${pm(chg(ipcLast, ipcAgo))}`, this.cls(chg(px, yAgo)));
      R(this.T('Máximo / mínimo 52 semanas', '52-week high / low'), `Ps. ${this.n(hi, 2)}  /  Ps. ${this.n(lo, 2)}`);
      const agm = (M.REF.dividends || []).slice(-1)[0];
      if (agm) R(this.T(`Dividendo aprobado en asamblea ${agm.agmYear} · rendimiento sobre el precio`, `Dividend approved at the ${agm.agmYear} AGM · yield on the price`), `Ps. ${this.n(agm.dps, 2)} ${this.T('por acción', 'per share')}  ·  ${this.pct(100 * agm.dps / px[1])}`);
      H(this.T(`Financieros (${this.qlab(lastQ)} · Ps. millones, sin IFRIC 12)`, `Financials (${this.qlab(lastQ)} · Ps. million, ex-IFRIC 12)`));
      if (L) R(this.T('EBITDA últimos 12 meses · margen', 'EBITDA last twelve months · margin'), `Ps. ${this.m(L.is.ebitda)} M  ·  ${this.pct(L.is.ebitdaMarginExIfric)}${prevL ? `  ·  ${this.chg(L.is.ebitda, prevL.is.ebitda)} ${this.T('a/a', 'y/y')}` : ''}`);
      R(this.T(`EBITDA ${this.qlab(lastQ)} · margen`, `EBITDA ${this.qlab(lastQ)} · margin`), `Ps. ${this.m(lastQ.is.ebitda)} M  ·  ${this.pct(lastQ.is.ebitdaMarginExIfric)}${prevQr ? `  ·  ${this.chg(lastQ.is.ebitda, prevQr.is.ebitda)} ${this.T('a/a', 'y/y')}` : ''}`);
      if (L) R(this.T('Ingresos últimos 12 meses (sin IFRIC 12)', 'Revenue last twelve months (ex-IFRIC 12)'), `Ps. ${this.m(exRev(L))} M${prevL ? `  ·  ${this.chg(exRev(L), exRev(prevL))} ${this.T('a/a', 'y/y')}` : ''}`);
      if (L) R(this.T('Utilidad neta últimos 12 meses', 'Net income last twelve months'), `Ps. ${this.m(L.is.netIncome)} M${prevL ? `  ·  ${this.chg(L.is.netIncome, prevL.is.netIncome)} ${this.T('a/a', 'y/y')}` : ''}`);
      if (nd) R(this.T(`Deuda neta (${this.date(M.qEndDate(lastQ))})`, `Net debt (${this.date(M.qEndDate(lastQ))})`), `Ps. ${this.m(nd.net)} M  ·  ${this.T('bruta', 'gross')} Ps. ${this.m(nd.gross)} M  ·  ${this.T('efectivo', 'cash')} Ps. ${this.m(nd.cash)} M`);
      if (nd && L) R(this.T('Deuda neta / EBITDA UDM', 'Net debt / LTM EBITDA'), this.x(nd.net / L.is.ebitda, 2), 'bold');
      if (L) R(this.T('VE / EBITDA UDM  ·  P/U UDM (utilidad neta)', 'EV / LTM EBITDA  ·  LTM P/E (net income)'), `${this.x(ev / L.is.ebitda)}  ·  ${L.is.netIncome ? this.x(mc / 1000 / L.is.netIncome) : '—'}`);
      if (L && L.cf && L.cf.capex != null) R(this.T('Capex últimos 12 meses', 'Capex last twelve months'), `Ps. ${this.m(-L.cf.capex)} M`);
      H(this.T('Operación', 'Operations'));
      if (ltmPax) R(this.T('Pasajeros últimos 12 meses (millones)', 'Passengers last twelve months (million)'), `${this.n(ltmPax / 1000, 1)}${ltmPaxPrev ? `  ·  ${this.chg(ltmPax, ltmPaxPrev)} ${this.T('a/a', 'y/y')}` : ''}`, this.chgCls(ltmPax, ltmPaxPrev));
      R(this.T(`Pasajeros ${M.ymLabel(lastM.ym)} (millones) · acumulado ${this.ytdSpan(lastM.ym)}`, `Passengers ${M.ymLabel(lastM.ym)} (million) · ${this.ytdSpan(lastM.ym)}`), `${this.n(tot.v / 1000, 2)}  ·  ${M.fmtChgV(tot.yoy)} ${this.T('a/a', 'y/y')}  ·  ${this.T('acum.', 'YTD')} ${M.fmtChgV(tot.ytdYoy)}`, this.cls(typeof tot.yoy === 'number' ? tot.yoy : null));
      const gv = M.GV[M.GV.length - 1]; if (gv) R(this.T(`Guía ${gv.fy} (${this.date(gv.date)})`, `${gv.fy} guidance (${this.date(gv.date)})`), `${this.T('tráfico', 'traffic')} ${M.gRange(M.GM[0], gv.items.traffic)}  ·  EBITDA ${M.gRange(M.GM[4], gv.items.ebitda)}  ·  ${this.T('margen', 'margin')} ${M.gRange(M.GM[5], gv.items.ebitdaMargin)}`);
      R(this.T('Próximos resultados', 'Next results'), this.nextText().replace(/^[^:]*:\s*/, ''), this.next && this.next.kind === 'confirmed' ? 'bold' : '');
      const noteStr = this.T(`Fuentes: ${M.marketSrcNote(['GAPB.MX', 'PAC', '^MXX'])}, Banxico SIE SF43718 (tipo de cambio FIX), informe trimestral de GAP ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}; base ${prevQ ? this.qlab(prevQ) : ''} como la reexpresa ese informe), reportes mensuales de tráfico de GAP (variaciones y acumulado de las columnas del reporte de ${M.ymLabel(lastM.ym)}). VE = capitalización + deuda neta + participación no controladora. P/U = capitalización ÷ utilidad neta UDM. Deuda neta = préstamos bancarios + certificados bursátiles − efectivo (${nd && nd.basis === 'est' ? 'estimada' : 'balance publicado'}). UDM = últimos doce meses (suma de los cuatro trimestres más recientes). Rendimiento del dividendo = monto aprobado en la asamblea ÷ precio.`,
        `Sources: ${M.marketSrcNote(['GAPB.MX', 'PAC', '^MXX'])}, Banxico SIE SF43718 (FIX exchange rate), GAP ${this.qlab(lastQ)} quarterly report (${this.date(lastQ.sources.is.date)}; ${prevQ ? this.qlab(prevQ) : ''} base as restated in that report), GAP monthly traffic reports (changes and year-to-date from the columns of the ${M.ymLabel(lastM.ym)} report). EV = market cap + net debt + non-controlling interest. P/E = market cap ÷ LTM net income. Net debt = bank loans + certificados bursátiles − cash (${nd && nd.basis === 'est' ? 'estimated' : 'published balance sheet'}). LTM = last twelve months (sum of the four most recent quarters). Dividend yield = amount approved at the AGM ÷ price.`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25), limitY = this.cur.y1 - noteH - 10;
      const fy = this.fitTable({ y, w: colW, head: null, body: rows, meta, cols: { 0: { cellWidth: colW * 0.46, halign: 'left' }, 1: { cellWidth: colW * 0.54 } }, pad: { top: 2.6, bottom: 2.6, left: 4, right: 4 } }, [8.6, 8.3, 8, 7.7, 7.4], limitY);
      // right: GAP vs IPC rebased, last 12 months
      const base = M.addDays(px[0], -365);
      const series = [{ id: 'GAPB.MX', label: 'GAP B (BMV)' }, { id: '^MXX', label: 'S&P/BMV IPC' }].map((s) => ({ ...s, pts: M.px(s.id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
      const dates = series[0].pts.map((p) => p[0]);
      const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lv = null; return { label: s.label + ` (${this.T('base 100', 'rebased to 100')})`, data: dates.map((d) => { const v = map.get(d); if (v != null) lv = v; return lv != null ? 100 * lv / b : null; }), borderColor: PALETTE[i], backgroundColor: PALETTE[i], borderWidth: i === 0 ? 2.4 : 1.6 }; });
      this.heading(this.T('GAP B vs S&P/BMV IPC · últimos 12 meses (base 100, precio sin dividendos)', 'GAP B vs S&P/BMV IPC · last 12 months (rebased to 100, price only)'), xr, y, 10, colW);
      const img = this.chart({ type: 'line', data: { labels: dates, datasets: ds }, options: { scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (dates[i] ? M.ymLabel(dates[i].slice(0, 7)) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, 760, 470);
      const cw = this.cur.x1 - xr, chH = cw * 470 / 760;
      this.image(img, xr, y + 18, cw, chH);
      let yy = y + 18 + chH + 6;
      const perf = ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return [d.label.replace(/ \(.*\)/, ''), this.pct(last - 100, 1, true)]; });
      yy = this.table({ y: yy, x: xr, w: cw, head: [this.T(`Rendimiento ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`, `Return ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`), this.T('Precio', 'Price')], body: perf, meta: perf.map((r) => ['left', this.cls(parseFloat(r[1].replace(',', '')))]), size: 8.5, cols: { 0: { halign: 'left' } } });
      const rem = limitY - yy - 30;
      if (rem > 90) {
        const b3 = M.addDays(px[0], -365 * 3); const w3 = gap.filter((p) => p[0] >= b3); const step = Math.max(1, Math.ceil(w3.length / 500)); const pts3 = w3.filter((_, i) => i % step === 0 || i === w3.length - 1);
        yy = this.heading(this.T('Precio GAP B (BMV, Ps.) · últimos 3 años', 'GAP B share price (BMV, Ps.) · last 3 years'), xr, yy + 8, 10);
        const h3 = Math.min(rem - 22, 150);
        const img3 = this.chart({ type: 'line', data: { labels: pts3.map((p) => p[0]), datasets: [{ label: 'GAP B', data: pts3.map((p) => p[1]), borderColor: PALETTE[0], backgroundColor: PALETTE[0] + '22', fill: true, borderWidth: 1.6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (pts3[i] ? M.ymLabel(pts3[i][0].slice(0, 7)) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(cw * 1.6), Math.round(h3 * 1.6));
        yy = this.image(img3, xr, yy, cw, h3);
      }
      this.noteAbove(noteStr, Math.max(fy, yy) + 8);
    }

    // ================= 03 OPERATING METRICS (latest quarter y/y) =================
    opsPage() {
      const M = this.M, A = M.lastQ, B = M.qById[M.yoyQid(A)];
      const oa = M.opsFor(A, 'q'), ob = M.opsFor(B, 'q'), C = M.yoyCommentsFor(A, B, 'q'), ops = C && C.ops;
      const la = this.qlab(A), lb = this.qlab(B);
      let y = this.page('P', this.secTitle('statements', this.T(`Métricas operativas · ${la} vs ${lb}`, `Operating Metrics · ${la} vs ${lb}`)), this.nextText());
      const rows = [], meta = [];
      const head = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      const row = (l, k, o = {}) => { const va = oa && oa[k], vb = ob && ob[k]; if (va == null && vb == null) return; const d = va != null && vb != null ? va - vb : null; rows.push([l, va == null ? '—' : this.n(va, 1), vb == null ? '—' : this.n(vb, 1), d == null ? '—' : this.n(d, 1), this.chg(va, vb), ops && ops[k] ? M.L(ops[k]) : '']); meta.push([(o.cls || '') + ' left', o.cls || '', o.cls || '', this.cls(d), this.chgCls(va, vb), 'left small']); };
      head(M.t('trafCargo')); row(M.t('domPax'), 'dom', { cls: 'sub' }); row(M.t('intlPax'), 'intl', { cls: 'sub' }); row(M.t('totalPax'), 'total', { cls: 'bold' }); row(M.t('cbxUsers'), 'cbx'); row(M.t('cargoWlu'), 'cargo'); row(M.t('wluTotal'), 'wlu', { cls: 'bold' });
      head(`${M.t('unitRev')} (Ps.)`); row(M.t('aeroPerPax'), 'aeroPerPax'); row(M.t('nonAeroPerPax'), 'nonAeroPerPax'); if ([A, B].some((o) => o && o.is && o.is.revCbx != null)) row(M.t('nonAeroExCbx'), 'nonAeroExCbxPerPax', { cls: 'sub' }); row(M.t('cbxPerUser'), 'cbxPerUser'); row(M.t('revPerPaxGap'), 'revPerPaxGap'); row(M.t('aeroPerWlu'), 'aeroPerWlu'); row(M.t('costPerWlu'), 'costPerWlu');
      const W = this.width(), cw = { 0: { cellWidth: W * 0.24, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.07 }, 5: { cellWidth: W * 0.44, halign: 'left' } };
      y = this.fitTable({ y, head: [M.t('metric'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral y conferencia)', 'Comments (quarterly report and earnings call)')], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)) }, [8.6, 8.2, 7.8, 7.4, 7], this.cur.y1 - 150);
      const qs = M.Q.slice(-8); const yoy = (q) => { const p = M.qById[M.yoyQid(q)]; const a = M.opsFor(q, 'q'), b = p && M.opsFor(p, 'q'); return a && b && a.total && b.total ? 100 * (a.total / b.total - 1) : null; };
      const remaining = this.cur.y1 - y - 30;
      if (remaining > 110) {
        const h = Math.min(remaining - 26, 200);
        y = this.heading(this.T('Pasajeros terminales por trimestre (millones) y variación a/a', 'Terminal passengers by quarter (million) and YoY change'), this.cur.x0, y + 10, 10);
        const img = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [{ type: 'line', label: this.T('Variación a/a, % (eje der.)', 'YoY change, % (right axis)'), data: qs.map(yoy), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0 }, { type: 'bar', label: this.T('Pasajeros (millones, eje izq.)', 'Passengers (million, left axis)'), data: qs.map((q) => { const o = M.opsFor(q, 'q'); return o && o.total ? o.total / 1000 : null; }), backgroundColor: PALETTE[0], yAxisID: 'y', maxBarThickness: 40, order: 1 }] }, options: { scales: { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => this.n(v, 0) + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
        y = this.image(img, this.cur.x0, y, W, h) + 4;
      }
      const cap = this.T(`Pasajeros de los reportes mensuales de tráfico (CBX en Tijuana se clasifica como internacional); ingresos unitarios = ingresos del estado de resultados ÷ pasajeros del periodo. CBX se consolida desde ${M.REF.cbx && M.REF.cbx.consolidatedFrom ? M.ymLabel(M.REF.cbx.consolidatedFrom) : '—'}. Carga, WLU y los tres últimos renglones siguen el Exhibit F del informe trimestral. ${M.t('nmNote')} Fuentes: informe trimestral ${la} (${this.date(A.sources.is.date)})${C && C.call ? ' · ' + M.L(C.call) : ''} · reportes mensuales de tráfico de GAP.`,
        `Passengers from the monthly traffic reports (CBX users at Tijuana count as international); unit revenues = income-statement revenue ÷ passengers in the period. CBX consolidated from ${M.REF.cbx && M.REF.cbx.consolidatedFrom ? M.ymLabel(M.REF.cbx.consolidatedFrom) : '—'}. Cargo, WLUs and the last three rows follow Exhibit F of the quarterly report. ${M.t('nmNote')} Sources: ${la} quarterly report (${this.date(A.sources.is.date)})${C && C.call ? ' · ' + M.L(C.call) : ''} · GAP monthly traffic reports.`);
      this.note(cap, Math.max(y, this.cur.y1 - 34));
    }

    // ================= 03 INCOME STATEMENT (quarter, LTM, fiscal year) =================
    // The base column is the period as GAP restates it in the current period's own report (cmpBase), so every change
    // printed is GAP's; per-share rows on both bases at the current period's exchange rate (isValue); n.m. on sign flips.
    incomePage(mode) {
      const M = this.M; let A, B, B0, C, la, lb, cmtNote = '';
      if (mode === 'q') { A = M.lastQ; B0 = M.qById[M.yoyQid(A)]; B = M.cmpBase(A, B0, 'q'); C = M.yoyCommentsFor(A, B0, 'q'); la = this.qlab(A); lb = this.qlab(B0); }
      else if (mode === 'fy') { A = M.Y[M.Y.length - 1]; B0 = M.Y[M.Y.length - 2]; B = M.cmpBase(A, B0, 'fy'); C = M.yoyCommentsFor(A, B0, 'fy'); la = 'FY' + A.fy; lb = 'FY' + B0.fy; }
      else { A = M.ltmFor(M.lastQ); const bq = M.qById[M.yoyQid(M.lastQ)]; B0 = bq && M.ltmFor(bq); B = B0 && M.cmpBase(A, B0, 'ltm'); C = B && M.yoyCommentsFor(A, B, 'ltm'); la = A && A.id; lb = B ? B.id : '—'; cmtNote = this.T(` · Comentarios sobre los doce meses móviles (${la} vs ${lb})`, ` · Comments refer to the rolling twelve months (${la} vs ${lb})`); }
      if (!A || !B) return;
      const title = mode === 'ltm' ? this.T('Estado de resultados · doce meses móviles', 'Income Statement · Rolling Twelve Months') : mode === 'fy' ? this.T('Estado de resultados · año fiscal', 'Income Statement · Fiscal Year') : this.T('Estado de resultados · trimestre', 'Income Statement · Quarter');
      let y = this.page('P', this.secTitle('statements', `${title} · ${la} vs ${lb}`), this.nextText());
      const layout = M.isLayout(); const rows = [], meta = []; const fxRef = M.periodFx(A);
      const OCI = new Set(); { let on = false; for (const d of layout) { if (d.k === 'comprehensiveControlling') on = false; if (on) OCI.add(d.k); if (d.k === 'netIncome') on = true; } }
      for (const def of layout) {
        if (def.ifric || OCI.has(def.k)) continue;
        if (def.level === 2 && def.k !== 'revCbx') continue;                    // cost-of-services detail collapsed, as on screen
        let va = M.isValue(A, def, fxRef), vb = M.isValue(B, def, fxRef);
        if (def.k === 'revTotal' || def.k === 'totalOpCosts') { va = va == null ? va : va - ((A.is.revConstruction) || 0); vb = vb == null ? vb : vb - ((B.is.revConstruction) || 0); }
        if (va == null && vb == null) continue;
        const d = va != null && vb != null ? va - vb : null;
        const f = (v) => (v == null ? '—' : def.pct ? this.pct(v) : def.perShare ? this.n(v, 2) : this.m(v));
        const fd = d == null ? '—' : def.pct ? this.n(d, 1) + ' pp' : def.perShare ? this.n(d, 2) : this.m(d);
        const c = def.level === 0 ? 'bold' : def.level === 2 ? 'sub' : '';
        rows.push([M.lineLabel(def), f(va), f(vb), fd, def.pct ? '' : this.chg(va, vb), C && C.lines && C.lines[def.k] ? M.L(C.lines[def.k]) : '']);
        meta.push([c + ' left', c, c, this.cls(d) + ' ' + c, this.chgCls(va, vb) + ' ' + c, 'left small']);
      }
      const W = this.width(), cw = { 0: { cellWidth: W * 0.245, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.085 }, 5: { cellWidth: W * 0.42, halign: 'left' } };
      const rn = M.restatedNote(B);
      const srcs = [A, B0].map((o) => o && o.sources && o.sources.is).filter(Boolean);
      const cap = this.T(`Ps. millones, sin IFRIC 12 (ingresos y costos de construcción excluidos; el EBITDA no cambia). Detalle del costo de servicios y otros resultados integrales omitidos${(A.derived || B.derived) ? '; periodos UDM calculados a partir de trimestres reportados' : ''}${rn ? '. ' + rn : ''}. ${M.t('perShareNote')} ${M.t('nmNote')} Fuentes: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `informe trimestral de GAP (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`,
        `Ps. million, ex-IFRIC 12 (construction revenue and cost excluded; EBITDA is unchanged). Cost-of-services detail and other comprehensive income omitted${(A.derived || B.derived) ? '; LTM periods computed from reported quarters' : ''}${rn ? '. ' + rn : ''}. ${M.t('perShareNote')} ${M.t('nmNote')} Sources: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `GAP quarterly report (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`);
      const capH = this.measureText(cap, W, 6.8, 1.25);
      y = this.fitTable({ y, head: [this.T('Cifras en MXN millones', 'Figures in MXN mn'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral y conferencia)', 'Comments (quarterly report and earnings call)')], body: rows, meta, cols: cw }, [8.6, 8.2, 7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - capH - 8);
      if (mode === 'fy') y = this.isFiller(mode, y, capH);
      this.noteAbove(cap, y + 6, 6.8);
    }

    // Revenue, EBITDA and margin chart when an income-statement page has room left (annual for the FY page, quarterly otherwise).
    isFiller(mode, y, reserve) {
      const M = this.M, rem = this.cur.y1 - y - (reserve || 46) - 8; if (rem < 92) return y;
      const h = Math.min(rem - 20, 190), W = this.width();
      const objs = mode === 'fy' ? M.Y.slice(-6) : M.Q.slice(-8); const lab = (o) => (mode === 'fy' ? 'FY' + o.fy : this.qlab(o));
      const ex = (o) => (o.is.revTotal - (o.is.revConstruction || 0)) / 1000;
      y = this.heading(mode === 'fy' ? this.T('Ingresos sin IFRIC 12, EBITDA (Ps. millones) y margen EBITDA por año fiscal', 'Revenue ex-IFRIC 12, EBITDA (Ps. million) and EBITDA margin by fiscal year') : this.T('Ingresos sin IFRIC 12, EBITDA (Ps. millones) y margen EBITDA por trimestre', 'Revenue ex-IFRIC 12, EBITDA (Ps. million) and EBITDA margin by quarter'), this.cur.x0, y + 8, 10);
      const img = this.chart({ type: 'bar', data: { labels: objs.map(lab), datasets: [{ type: 'bar', label: this.T('Ingresos sin IFRIC 12 (eje izq.)', 'Revenue ex-IFRIC 12 (left axis)'), data: objs.map(ex), backgroundColor: '#c9c6bd', maxBarThickness: 34 }, { type: 'bar', label: gl('EBITDA') + ' (' + this.T('eje izq.', 'left axis') + ')', data: objs.map((o) => o.is.ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 34 }, { type: 'line', label: gl(this.T('Margen EBITDA sin IFRIC 12, % (eje der.)', 'EBITDA margin ex-IFRIC 12, % (right axis)')), data: objs.map((o) => o.is.ebitdaMarginExIfric), borderColor: PALETTE[1], backgroundColor: PALETTE[1], yAxisID: 'y2', pointRadius: 3 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, beginAtZero: false, suggestedMin: 55, suggestedMax: 75, ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
      return this.image(img, this.cur.x0, y, W, h) + 4;
    }

    // ================= 03 EBITDA BRIDGE, GROWTH EX-CBX, LIKE-FOR-LIKE PER SHARE =================
    bridgePage() {
      const M = this.M, A = M.lastQ, B0 = M.qById[M.yoyQid(A)], B = M.cmpBase(A, B0, 'q'); const br = M.ebitdaBridge(A, B), ex = M.exCbx(A, B), lfl = M.likeForLike(A, B);
      if (!br || !ex || !lfl) return;
      const la = this.qlab(A), lb = this.qlab(B0), cons = M.REF.cbx && M.REF.cbx.consolidatedFrom ? M.ymLabel(M.REF.cbx.consolidatedFrom) : '—';
      let y = this.page('L', this.secTitle('statements', this.T(`Puente del EBITDA ${lb} → ${la}, crecimiento sin CBX y comparación por acción`, `EBITDA Bridge ${lb} → ${la}, Growth Excluding CBX and Per-Share Comparison`)), this.T(`Ps. millones · ${lb} como lo reexpresa el informe del ${la} · CBX consolidado desde ${cons} (dos meses en el ${la}; ingresos y EBITDA de CBX del Exhibit A)`, `Ps. million · ${lb} as restated in the ${la} report · CBX consolidated from ${cons} (two months in ${la}; CBX revenue and EBITDA from Exhibit A)`));
      const gap = 24, wl = this.width() * 0.54, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const names = { revAero: this.T('Ingresos aeronáuticos', 'Aeronautical revenue'), revNonAeroEx: this.T('No aeronáuticos sin CBX', 'Non-aeronautical ex-CBX'), cbx: this.T('CBX (EBITDA, Exhibit A)', 'CBX (EBITDA, Exhibit A)'), costServicesEx: this.T('Costo de servicios sin CBX', 'Cost of services ex-CBX'), techAssistance: this.T('Asistencia técnica', 'Technical assistance'), concessionTaxes: this.T('Derechos de concesión', 'Concession taxes'), otherIncome: this.T('Otros ingresos (gastos)', 'Other income (expense)') };
      // waterfall: floating bars, start and end in the house color, steps green or red
      const short = { revAero: this.T(['Ingresos', 'aeronáuticos'], ['Aeronautical', 'revenue']), revNonAeroEx: this.T(['No aero.', 'sin CBX'], ['Non-aero', 'ex-CBX']), cbx: ['CBX'], costServicesEx: this.T(['Costo de serv.', 'sin CBX'], ['Cost of serv.', 'ex-CBX']), techAssistance: this.T(['Asistencia', 'técnica'], ['Technical', 'assistance']), concessionTaxes: this.T(['Derechos de', 'concesión'], ['Concession', 'taxes']), otherIncome: this.T(['Otros'], ['Other']) };
      const labels = [[lb], ...br.steps.map((s) => short[s.k]), [la]]; const data = [], colors = []; let run = br.start, lo = Math.min(br.start, br.end);
      data.push([0, br.start / 1000]); colors.push(PALETTE[0]);
      for (const s of br.steps) { const a = run, b = run + s.v; data.push([Math.min(a, b) / 1000, Math.max(a, b) / 1000]); colors.push(s.v >= 0 ? '#1a7f37' : '#b42318'); run = b; lo = Math.min(lo, a, b); }
      data.push([0, br.end / 1000]); colors.push(PALETTE[0]);
      let yl = this.heading(this.T(`EBITDA ${lb} → ${la} (Ps. millones): barras verdes suman, rojas restan`, `EBITDA ${lb} → ${la} (Ps. million): green bars add, red bars subtract`), this.cur.x0, y, 10, wl);
      const h1 = 225;
      const img = this.chart({ type: 'bar', data: { labels, datasets: [{ label: gl('EBITDA'), data, backgroundColor: colors, maxBarThickness: 48 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: false } }, y: { min: Math.floor((lo / 1000 - 300) / 200) * 200, ticks: { stepSize: 200, callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h1 * 1.6));
      yl = this.image(img, this.cur.x0, yl, wl, h1) + 6;
      const rows = [[`EBITDA ${lb}`, this.m(br.start), '']]; const meta = [['bold left', 'bold', '']];
      for (const s of br.steps) { rows.push([names[s.k], (s.v >= 0 ? '+' : '') + this.m(s.v), this.pct(100 * s.v / br.start, 1, true)]); meta.push(['left', this.cls(s.v), this.cls(s.v)]); }
      if (Math.abs(br.residual) >= 500) { rows.push([this.T('Redondeo', 'Rounding'), this.m(br.residual), '']); meta.push(['left muted', 'muted', '']); }
      rows.push([`EBITDA ${la}`, this.m(br.end), this.chg(br.end, br.start)]); meta.push(['bold left', 'bold', 'bold ' + this.chgCls(br.end, br.start)]);
      yl = this.table({ y: yl, w: wl, head: [this.T('Paso', 'Step'), 'Ps. M', this.T(`% del EBITDA ${lb}`, `% of ${lb} EBITDA`)], body: rows, meta, size: 8.4, cols: { 0: { halign: 'left', cellWidth: wl * 0.5 } }, pad: { top: 2.4, bottom: 2.4, left: 3.5, right: 3.5 } });
      // right: growth ex-CBX
      let yr = this.heading(this.T('Crecimiento sin CBX (ingresos sin IFRIC 12 y EBITDA)', 'Growth excluding CBX (revenue ex-IFRIC 12 and EBITDA)'), xr, y, 10, wr);
      const mg = (e, r) => (r ? 100 * e / r : null);
      const exRows = [
        [this.T('Ingresos sin IFRIC 12', 'Revenue ex-IFRIC 12'), this.m(ex.revReported[0]), this.m(ex.revA), this.m(ex.revReported[1]), this.chg(ex.revReported[0], ex.revReported[1]), this.chg(ex.revA, ex.revB)],
        ['EBITDA', this.m(ex.ebitdaReported[0]), this.m(ex.ebitdaA), this.m(ex.ebitdaReported[1]), this.chg(ex.ebitdaReported[0], ex.ebitdaReported[1]), this.chg(ex.ebitdaA, ex.ebitdaB)],
        [this.T('Margen EBITDA', 'EBITDA margin'), this.pct(mg(ex.ebitdaReported[0], ex.revReported[0])), this.pct(mg(ex.ebitdaA, ex.revA)), this.pct(mg(ex.ebitdaReported[1], ex.revReported[1])), this.n(mg(ex.ebitdaReported[0], ex.revReported[0]) - mg(ex.ebitdaReported[1], ex.revReported[1]), 1) + ' pp', this.n(mg(ex.ebitdaA, ex.revA) - mg(ex.ebitdaB, ex.revB), 1) + ' pp'],
      ];
      const exMeta = [['left', '', '', '', this.chgCls(ex.revReported[0], ex.revReported[1]), this.chgCls(ex.revA, ex.revB)], ['bold left', 'bold', 'bold', 'bold', 'bold ' + this.chgCls(ex.ebitdaReported[0], ex.ebitdaReported[1]), 'bold ' + this.chgCls(ex.ebitdaA, ex.ebitdaB)], ['left', '', '', '', '', '']];
      yr = this.table({ y: yr, x: xr, w: wr, head: ['', la, this.T(`${la} sin CBX`, `${la} ex-CBX`), lb, this.T('a/a', 'y/y'), this.T('a/a sin CBX', 'y/y ex-CBX')], body: exRows, meta: exMeta, size: 8.4, cols: { 0: { halign: 'left', cellWidth: wr * 0.24 } }, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } });
      yr = this.note(this.T(`CBX en el ${la}: ingresos Ps. ${this.m(br.cbx.rev)} M, EBITDA Ps. ${this.m(br.cbx.ebitda)} M (margen ${this.pct(mg(br.cbx.ebitda, br.cbx.rev))}), mayo–junio (Exhibit A). El ${lb} no tiene CBX; la cuota de asistencia técnica (Ps. ${this.m(B.is.techAssistance)} M en el ${lb}) desaparece con la fusión.`, `CBX in ${la}: revenue Ps. ${this.m(br.cbx.rev)} M, EBITDA Ps. ${this.m(br.cbx.ebitda)} M (${this.pct(mg(br.cbx.ebitda, br.cbx.rev))} margin), May–June (Exhibit A). ${lb} has no CBX; the technical-assistance fee (Ps. ${this.m(B.is.techAssistance)} M in ${lb}) ends with the merger.`), yr + 3, 7.2, xr, wr);
      // right: like-for-like per share
      yr = this.heading(this.T('Por acción, como-con-como: el año anterior sobre las acciones de hoy', 'Per share, like for like: last year\'s result on today\'s share count'), xr, yr + 8, 10, wr);
      const pa = lfl.A, pb = lfl.B, onA = lfl.onA, ads = (v) => (v != null && pa.fx ? v * M.ADS / pa.fx : null);
      const lr = [
        [this.T('Acciones en circulación (millones)', 'Shares outstanding (million)'), this.n(pa.sh / 1e6, 1), this.n(pb.sh / 1e6, 1), this.pct(lfl.sharesChg, 1, true), '—', '—'],
        [this.T('Utilidad integral por acción, Ps. (base de GAP)', 'Comprehensive income per share, Ps. (GAP\'s basis)'), this.n(pa.gap, 2), this.n(pb.gap, 2), this.chg(pa.gap, pb.gap), this.n(onA.gap, 2), this.chg(pa.gap, onA.gap)],
        [this.T('Utilidad integral por ADS, US$ (base de GAP)', 'Comprehensive income per ADS, US$ (GAP\'s basis)'), this.n(pa.gapAds, 2), this.n(pb.gapAds, 2), this.chg(pa.gapAds, pb.gapAds), this.n(ads(onA.gap), 2), this.chg(pa.gapAds, ads(onA.gap))],
        [this.T('Utilidad integral controladora por acción, Ps.', 'Controlling-interest comprehensive income per share, Ps.'), this.n(pa.ctrl, 2), this.n(pb.ctrl, 2), this.chg(pa.ctrl, pb.ctrl), this.n(onA.ctrl, 2), this.chg(pa.ctrl, onA.ctrl)],
        [this.T('Utilidad integral controladora por ADS, US$', 'Controlling-interest comprehensive income per ADS, US$'), this.n(pa.ctrlAds, 2), this.n(pb.ctrlAds, 2), this.chg(pa.ctrlAds, pb.ctrlAds), this.n(ads(onA.ctrl), 2), this.chg(pa.ctrlAds, ads(onA.ctrl))],
        [this.T('Utilidad neta por acción, Ps.', 'Net income per share, Ps.'), this.n(pa.eps, 2), this.n(pb.eps, 2), this.chg(pa.eps, pb.eps), this.n(onA.eps, 2), this.chg(pa.eps, onA.eps)],
      ];
      const lm = lr.map((r, i) => ['left', i === 0 ? '' : 'bold', '', i === 0 ? this.cls(lfl.sharesChg) : this.chgCls(+r[1].replace(/,/g, ''), +r[2].replace(/,/g, '')), '', i === 0 ? '' : this.chgCls(+r[1].replace(/,/g, ''), +r[4].replace(/,/g, ''))]);
      yr = this.table({ y: yr, x: xr, w: wr, head: ['', la, lb, this.T('a/a', 'y/y'), this.T(`${lb} sobre acciones del ${la}`, `${lb} on ${la} shares`), this.T('a/a como-con-como', 'y/y like for like')], body: lr, meta: lm, size: 8, cols: { 0: { halign: 'left', cellWidth: wr * 0.34 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } });
      const sh = M.REF.shares || {}, newSh = sh.newSharesIssuedCbx, pre = sh.preMergerOutstanding;
      this.noteAbove(this.T(`Acciones: ${this.n(pa.sh)} al ${this.date(M.qEndDate(A))} frente a ${this.n(pb.sh)} al ${this.date(M.qEndDate(B0))} (${this.pct(lfl.sharesChg, 1, true)}); las ${newSh ? this.n(newSh) : '—'} acciones emitidas en la fusión con CBX/AMP (${this.date(sh.asOf)}) son ${newSh && pre ? this.pct(100 * newSh / pre, 1) : '—'} de las ${pre ? this.n(pre) : '—'} previas y ${newSh ? this.pct(100 * newSh / pa.sh, 1) : '—'} del total ampliado (dilución): las dos cifras son correctas, cambia el denominador. ${M.t('perShareNote')} Tipo de cambio: Ps. ${this.n(pa.fx, 4)} por US$ (${pa.fxSrc === 'fix' ? 'FIX de Banxico' : 'tipo de la Fed, nota del informe'}) para ambas columnas. ${M.t('nmNote')} Fuentes: informe trimestral de GAP ${la} (${this.date(A.sources.is.date)}), Exhibit A y nota de acciones en circulación; comunicado de GAP del ${this.date(sh.asOf)} (cierre de la fusión).`,
        `Shares: ${this.n(pa.sh)} at ${this.date(M.qEndDate(A))} against ${this.n(pb.sh)} at ${this.date(M.qEndDate(B0))} (${this.pct(lfl.sharesChg, 1, true)}); the ${newSh ? this.n(newSh) : '—'} shares issued in the CBX/AMP merger (${this.date(sh.asOf)}) are ${newSh && pre ? this.pct(100 * newSh / pre, 1) : '—'} of the ${pre ? this.n(pre) : '—'} shares before it and ${newSh ? this.pct(100 * newSh / pa.sh, 1) : '—'} of the enlarged total (dilution): both figures are right, the denominator differs. ${M.t('perShareNote')} Exchange rate: Ps. ${this.n(pa.fx, 4)} per US$ (${pa.fxSrc === 'fix' ? 'Banxico FIX' : 'Fed rate, report footnote'}) for both columns. ${M.t('nmNote')} Sources: GAP ${la} quarterly report (${this.date(A.sources.is.date)}), Exhibit A and the shares-outstanding note; GAP release of ${this.date(sh.asOf)} (merger completion).`), Math.max(yl, yr) + 6, 6.8);
    }

    // ================= 03 MEXICO VS JAMAICA =================
    countryPage() {
      const M = this.M, A = M.lastQ, B0 = M.qById[M.yoyQid(A)], B = M.cmpBase(A, B0, 'q'); if (!B0) return;
      const Yt = M.ytdFor(A), Yp0 = M.ytdById[`${A.fy - 1}M${A.q * 3}`], TL = M.trafficLatest(), BC = TL.byCountry || {};
      const pq = M.paxByCountry(M.periodYms(A, 'q')), pqB = M.paxByCountry(M.periodYms(B0, 'q'));
      const la = this.qlab(A), lb = this.qlab(B0), ly = Yt ? Yt.id : '', lyp = Yp0 ? M.ytdLabel(A.fy - 1, A.q * 3) : '';
      let y = this.page('L', this.secTitle('statements', this.T(`México y Jamaica · ${la} y acumulado`, `Mexico and Jamaica · ${la} and Year to Date`)), this.T(`Pasajeros de los reportes mensuales por país · variaciones de ingresos y costos por país como las enuncia GAP en el informe del ${la} · resultados por aeropuerto del Exhibit A (Kingston dentro de «Otros»)`, `Passengers by country from the monthly reports · revenue and cost changes by country as GAP states them in the ${la} report · results by airport from Exhibit A (Kingston inside "Others")`));
      const gap = 24, wl = this.width() * 0.46, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const rows = [], meta = [];
      const H = (s) => { rows.push([s, '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head']); };
      const paxRow = (l, a, b) => { rows.push([l, a && a.MX != null ? this.n(a.MX / 1000, 2) : '—', a && b ? this.chg(a.MX, b.MX) : '—', a && a.JM != null ? this.n(a.JM / 1000, 2) : '—', a && b ? this.chg(a.JM, b.JM) : '—']); meta.push(['left', '', a && b ? this.chgCls(a.MX, b.MX) : '', '', a && b ? this.chgCls(a.JM, b.JM) : '']); };
      H(this.T('Pasajeros (millones)', 'Passengers (million)'));
      paxRow(`${la} vs ${lb}`, pq, pqB);
      if (BC.MX) paxRow(this.T(`${this.ytdSpan(TL.month.ym)} (columnas acumuladas del reporte mensual)`, `${this.ytdSpan(TL.month.ym)} (year-to-date columns of the monthly report)`), { MX: BC.MX.ytd, JM: BC.JM.ytd }, { MX: BC.MX.ytdPrior, JM: BC.JM.ytdPrior });
      const cRow = (l, c, k) => { if (!c) return; const mx = c.MX && c.MX[k], jm = c.JM && c.JM[k]; rows.push([l, mx ? `${mx.chgM >= 0 ? '+' : ''}${this.n(mx.chgM, 1)} M` : '—', mx ? this.pct(mx.pct, 1, true) : '—', jm ? `${jm.chgM >= 0 ? '+' : ''}${this.n(jm.chgM, 1)} M` : '—', jm ? this.pct(jm.pct, 1, true) : '—']); meta.push(['left', mx ? this.cls(mx.chgM) : '', mx ? this.cls(mx.pct) : '', jm ? this.cls(jm.chgM) : '', jm ? this.cls(jm.pct) : '']); };
      if (A.country) { H(this.T(`Variación a/a que GAP enuncia · ${la} vs ${lb} (Ps. millones)`, `Year-over-year change GAP states · ${la} vs ${lb} (Ps. million)`)); cRow(this.T('Ingresos aeronáuticos', 'Aeronautical revenue'), A.country, 'revAero'); cRow(this.T('Ingresos no aeronáuticos', 'Non-aeronautical revenue'), A.country, 'revNonAero'); cRow(this.T('Costos de operación', 'Operating costs'), A.country, 'opCosts'); }
      if (Yt && Yt.country) { H(this.T(`Variación a/a que GAP enuncia · ${ly} vs ${lyp} (Ps. millones)`, `Year-over-year change GAP states · ${ly} vs ${lyp} (Ps. million)`)); cRow(this.T('Ingresos aeronáuticos', 'Aeronautical revenue'), Yt.country, 'revAero'); cRow(this.T('Ingresos no aeronáuticos', 'Non-aeronautical revenue'), Yt.country, 'revNonAero'); cRow(this.T('Costos de operación', 'Operating costs'), Yt.country, 'opCosts'); }
      let yl = this.table({ y, w: wl, head: ['', this.T('México (12)', 'Mexico (12)'), this.T('a/a', 'y/y'), this.T('Jamaica (2)', 'Jamaica (2)'), this.T('a/a', 'y/y')], body: rows, meta, size: 8.8, cols: { 0: { halign: 'left', cellWidth: wl * 0.4 } }, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 5 : 0)), pad: { top: 3.2, bottom: 3.2, left: 3.5, right: 3.5 } });
      yl = this.note(this.T(`Jamaica = Montego Bay (MBJ) y Kingston (KIN); México = los 12 aeropuertos mexicanos (CBX en Tijuana cuenta como internacional). Las variaciones por país son las que GAP escribe en su informe (no se publican estados por país); los costos de operación excluyen depreciación y derechos de concesión como los define GAP en ese pasaje.`, `Jamaica = Montego Bay (MBJ) and Kingston (KIN); Mexico = the 12 Mexican airports (CBX users at Tijuana count as international). Country changes are the ones GAP writes in its report (no country statements are published); operating costs as GAP defines them in that passage.`), yl + 3, 7.2, this.cur.x0, wl);
      // right: Exhibit A by airport, EBITDA current vs base
      const order = ['GDL', 'TIJ', 'SJD', 'PVR', 'BJX', 'HMO', 'MBJ', 'OTHERS', 'CARGO', 'CBX'].filter((k) => A.seg && A.seg[k]);
      const segName = (k) => (k === 'OTHERS' ? this.T('Otros (7)', 'Others (7)') : k === 'CARGO' ? this.T('Carga', 'Cargo') : k === 'CBX' ? 'CBX' : k);
      let yr = this.heading(this.T(`EBITDA por aeropuerto · ${la} vs ${lb} (Ps. millones, Exhibit A)`, `EBITDA by airport · ${la} vs ${lb} (Ps. million, Exhibit A)`), xr, y, 10, wr);
      const h1 = 185;
      const img = this.chart({ type: 'bar', data: { labels: order.map(segName), datasets: [{ label: lb, data: order.map((k) => (B.seg && B.seg[k] ? B.seg[k].ebitda / 1000 : null)), backgroundColor: '#c9c6bd', maxBarThickness: 22 }, { label: la, data: order.map((k) => A.seg[k].ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 22 }] }, options: { scales: { x: { grid: { display: false }, ticks: { font: { size: 9.5 } } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h1 * 1.6));
      yr = this.image(img, xr, yr, wr, h1) + 6;
      const sr = [], sm = [];
      for (const k of [...order, 'TOTAL']) { const a = A.seg[k], b = B.seg && B.seg[k]; if (!a) continue; const ra = a.revTotal - (a.revConstruction || 0), rb = b ? b.revTotal - (b.revConstruction || 0) : null; const bold = k === 'TOTAL' ? 'bold' : ''; sr.push([k === 'TOTAL' ? this.T('Total GAP', 'GAP total') : segName(k), this.m(ra), rb ? this.chg(ra, rb) : '—', this.m(a.ebitda), b && b.ebitda ? this.chg(a.ebitda, b.ebitda) : '—', ra ? this.pct(100 * a.ebitda / ra) : '—']); sm.push([bold + ' left', bold, bold + ' ' + (rb ? this.chgCls(ra, rb) : ''), bold, bold + ' ' + (b && b.ebitda ? this.chgCls(a.ebitda, b.ebitda) : ''), bold]); }
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Aeropuerto / negocio', 'Airport / business'), this.T('Ingresos sin IFRIC 12', 'Revenue ex-IFRIC 12'), this.T('a/a', 'y/y'), 'EBITDA', this.T('a/a', 'y/y'), this.T('Margen', 'Margin')], body: sr, meta: sm, size: 8.2, cols: { 0: { halign: 'left', cellWidth: wr * 0.24 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } });
      const notes = Object.values(A.segNotes || {}).join(' ');
      this.noteAbove(this.T(`Exhibit A del informe ${la}: ${notes ? 'notas de GAP: «' + notes + '». ' : ''}El ${lb} como lo reexpresa el informe del ${la} (la carga y CBX separados). Ingresos sin IFRIC 12 = ingresos totales menos ingresos por construcción. Fuentes: informe trimestral de GAP ${la} (${this.date(A.sources.is.date)}); reportes mensuales de tráfico de GAP.`, `Exhibit A of the ${la} report: ${notes ? 'GAP\'s notes: "' + notes + '". ' : ''}${lb} as restated in the ${la} report (cargo and CBX broken out). Revenue ex-IFRIC 12 = total revenue less construction revenue. Sources: GAP ${la} quarterly report (${this.date(A.sources.is.date)}); GAP monthly traffic reports.`), Math.max(yl, yr) + 6, 7);
    }

    // ================= 04 GUIDANCE =================
    // compact range text for dense tables: "−3 a 0%" / "67 ± 1%" / "12,000"
    gr(m, x) { if (!x) return '—'; if (m.kind === 'amount') return this.n(x.mxnM); const f = (v) => this.n(v, Number.isInteger(v) ? 0 : 1); if (x.mid != null) return `${f(x.mid)} ± ${this.n(x.band, 0)}%`; return `${f(x.lo)} ${this.T('a', 'to')} ${f(x.hi)}%`; }
    grs(m, x) { if (!x) return '—'; if (m.kind === 'amount') return this.n(x.mxnM); const f = (v) => this.n(v, Number.isInteger(v) ? 0 : 1); if (x.mid != null) return `${f(x.mid)}±${this.n(x.band, 0)}`; return `${f(x.lo)}/${f(x.hi)}`; }
    guidancePage() {
      const M = this.M; if (!M.GV.length) return;
      const fy = Math.max(...M.GV.map((v) => v.fy)), cur = M.GV.filter((v) => v.fy === fy), last = cur[cur.length - 1];
      const act = M.gActual(fy), closed = !!(act && act.kind === 'fy'), cp = M.capexProgress();
      let y = this.page('L', this.secTitle('guidance', this.T(`Guía de la administración · FY${fy}, historial y avance del capex`, `Management Guidance · FY${fy}, Track Record and Capex Progress`)), this.nextText());
      const gap = 20, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      // ---- left: guidance in force vs actual
      let yl = this.heading(this.T(`Guía FY${fy} · ${cur.length > 1 ? 'revisada el' : 'emitida el'} ${this.date(last.date)} · vs ${act ? act.label : '—'}`, `FY${fy} guidance · ${cur.length > 1 ? 'revised' : 'issued'} ${this.date(last.date)} · vs ${act ? act.label : '—'}`), this.cur.x0, y, 10, wl);
      const head = [M.t('metric'), ...cur.map((v, i) => `${i === 0 ? M.t('initial') : M.t('revised')} ${this.date(v.date)}`), ...(cur.length > 1 ? [this.T('Cambio', 'Change')] : []), `${M.t('actual')} ${act ? act.label : ''}`, closed ? M.t('outcome') : M.t('tracking')];
      const rows = [], meta = [];
      for (const m of M.GM) {
        const cells = cur.map((v) => this.gr(m, v.items[m.k])); let chg = null;
        if (cur.length > 1) { const a = M.gMid(m, cur[0].items[m.k]), bb = M.gMid(m, last.items[m.k]); chg = a != null && bb != null ? bb - a : null; }
        const v = act ? act.v[m.k] : null, x = last.items[m.k]; let st = '', sc = '';
        if (v != null && x) { if (m.kind === 'amount') st = `${this.pct(100 * v / x.mxnM, 0)} ${closed ? this.T('de la guía', 'of guidance') : M.t('ofYear')}`; else { const sx = M.gStatus(m, x, v); st = M.t(sx); sc = sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : ''; } }
        rows.push([M.L(m), ...cells, ...(cur.length > 1 ? [chg == null ? '—' : m.kind === 'amount' ? this.n(chg) : this.n(chg, 1) + ' pp'] : []), M.gActualFmt(m, v), st]);
        meta.push(['left', ...cells.map(() => ''), ...(cur.length > 1 ? [this.cls(chg)] : []), 'bold', sc + ' bold']);
      }
      yl = this.table({ y: yl, w: wl, head, body: rows, meta, size: 8.4, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 } }, pad: { top: 2.6, bottom: 2.6, left: 3.5, right: 3.5 } });
      const TL = M.trafficLatest(), tot = TL.rows.TOTAL, trYtd = tot.ytdYoy, trSt = typeof trYtd === 'number' ? M.gStatus(M.GM[0], last.items.traffic, trYtd) : null;
      yl = this.note((closed ? this.T(`Año cerrado: real FY${fy} frente a la última guía.`, `Closed year: actual FY${fy} versus the final guidance.`) : this.T(`Seguimiento con el acumulado reportado (${act ? act.label : '—'} vs ${act ? M.ytdLabel(fy - 1, act.months) : '—'}); la guía es para el año completo, así que un acumulado fuera del rango no implica incumplimiento. Crecimientos vs año anterior; ingresos y margen sin IFRIC 12; capex en Ps. millones.`, `Tracked against the reported year-to-date (${act ? act.label : '—'} vs ${act ? M.ytdLabel(fy - 1, act.months) : '—'}); guidance is for the full year, so a year-to-date figure outside the range is not a miss in itself. Growth vs prior year; revenue and margin ex-IFRIC 12; capex in Ps. million.`)) + (trSt ? this.T(` Tráfico ${this.ytdSpan(TL.month.ym)} según los reportes mensuales: ${this.pct(trYtd, 1, true)}, ${M.t(trSt).toLowerCase()} del rango.`, ` Traffic ${this.ytdSpan(TL.month.ym)} per the monthly reports: ${this.pct(trYtd, 1, true)}, ${M.t(trSt).toLowerCase()} the range.`) : ''), yl + 4, 7.4, this.cur.x0, wl);
      // management's own framing of the latest vintage: the Spanish deck prints FNAM's translation of GAP's English sentence
      const intro = (last.intro || [])[0]; const trIntro = this.es && M.REF.guidanceTranslations && M.REF.guidanceTranslations[last.date] && (M.REF.guidanceTranslations[last.date].intro || [])[0];
      if (intro) yl = this.text(this.es ? `«${trIntro || intro}» — comunicado de GAP del ${this.date(last.date)}${trIntro ? ' (traducción de FNAM del texto en inglés)' : ' (texto original en inglés)'}` : `"${intro}" — GAP release of ${this.date(last.date)}`, this.cur.x0, yl + 3, wl, 8, 'normal', MUTED);
      // ---- right: track record for closed years
      let yr = y;
      const fys = [...new Set(M.GV.map((v) => v.fy))].sort(); const finalOf = (yv) => M.GV.filter((v) => v.fy === yv).pop();
      const closedFys = fys.filter((yv) => { const a = M.gActual(yv); return a && a.kind === 'fy'; });
      if (closedFys.length) {
        yr = this.heading(this.T('Historial: real vs última guía de cada año', "Track record: actual vs each year's final guidance"), xr, yr, 10, wr);
        const rr = [], rm = [];
        for (const yv of closedFys) { const v = finalOf(yv), a = M.gActual(yv); let hit = 0, n = 0; const cells = [], cm = []; for (const m of M.GM) { const x = v.items[m.k], val = a.v[m.k]; const sx = M.gStatus(m, x, val); if (sx) { n++; if (sx !== 'below') hit++; } cells.push(`${M.gActualFmt(m, val)}\n(${this.grs(m, x)})`); cm.push(sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : ''); } rr.push([`FY${yv}\n${v.kind === 'revised' ? M.t('revised') : M.t('initial')} ${this.date(v.date)}`, ...cells, `${hit}/${n}`]); rm.push(['left', ...cm, 'bold']); }
        const mw = (wr - wr * 0.19 - wr * 0.1) / M.GM.length; const rc = { 0: { halign: 'left', cellWidth: wr * 0.19 }, [M.GM.length + 1]: { cellWidth: wr * 0.1 } }; M.GM.forEach((m, i) => { rc[i + 1] = { cellWidth: mw }; });
        yr = this.table({ y: yr, x: xr, w: wr, head: [M.t('year'), ...M.GM.map((m) => M.L(m.s)), this.T('En rango o mejor', 'In range or better')], body: rr, meta: rm, size: 7.4, cols: rc, pad: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 } });
        yr = this.note(this.T('Primera línea: real; entre paréntesis, guía vigente al cierre del año (mínimo/máximo o punto medio ± banda). Verde = por encima del rango, rojo = por debajo. Todas las guías emitidas: apéndice A.', 'First line: actual; in brackets, guidance in force at year-end (low/high or midpoint ± band). Green = above the range, red = below. Every guidance issued: appendix A.'), yr + 3, 7.2, xr, wr);
      }
      // ---- full width: capex progress (guided year to date, prior year's outcome, the MDP as GAP files it)
      let yb = Math.max(yl, yr) + 8;
      if (cp) {
        yb = this.heading(this.T('Avance del capex y del Programa Maestro de Desarrollo (PMD)', 'Capex and Master Development Program (MDP) progress'), this.cur.x0, yb, 10);
        const mdp = cp.mdp || {}, rem = mdp.remaining;
        yb = this.tiles([
          { v: cp.guided != null ? `Ps. ${this.n(cp.guided)} M` : '—', l: this.T(`Capex guiado FY${cp.fy} (guía del ${this.date(cp.guidedDate)})`, `FY${cp.fy} guided capex (guidance of ${this.date(cp.guidedDate)})`) },
          { v: cp.ytd != null ? `Ps. ${this.n(cp.ytd)} M` : '—', l: this.T(`Capex ${cp.ytdLabel || ''} según el flujo de efectivo · ${cp.guided ? this.pct(100 * cp.ytd / cp.guided, 0) : '—'} de lo guiado`, `${cp.ytdLabel || ''} capex per the cash-flow statement · ${cp.guided ? this.pct(100 * cp.ytd / cp.guided, 0) : '—'} of the guided amount`) },
          { v: cp.prevActual != null ? `Ps. ${this.n(cp.prevActual)} M` : '—', l: this.T(`Capex FY${cp.prevFy} real · guía ${cp.prevGuided != null ? 'Ps. ' + this.n(cp.prevGuided) + ' M' : '—'} (${cp.prevGuided ? this.pct(100 * cp.prevActual / cp.prevGuided, 0) : '—'})`, `FY${cp.prevFy} actual capex · guided ${cp.prevGuided != null ? 'Ps. ' + this.n(cp.prevGuided) + ' M' : '—'} (${cp.prevGuided ? this.pct(100 * cp.prevActual / cp.prevGuided, 0) : '—'})`) },
          { v: rem ? `≈ Ps. ${this.n(rem.capexMxnBn * 1000)} M` : '—', l: this.T(`PMD ${rem ? rem.period : ''} según GAP (6-K del ${rem ? this.date(rem.sourceDate) : '—'}); el anuncio del ${this.date(mdp.sourceDate)} hablaba de más de Ps. ${this.n(mdp.capexMxnBn * 1000)} M para ${mdp.period} (cobertura de prensa, no consta en un comunicado)`, `${rem ? rem.period : ''} MDP per GAP (6-K of ${rem ? this.date(rem.sourceDate) : '—'}); the ${this.date(mdp.sourceDate)} announcement spoke of more than Ps. ${this.n(mdp.capexMxnBn * 1000)} M for ${mdp.period} (press coverage, not in a filing)`) },
        ], yb, 50);
        const yrs = cp.years || []; const remH = this.cur.y1 - yb - 30;
        if (yrs.length && remH > 95) {
          const h = Math.min(remH - 16, 125);
          const img = this.chart({ type: 'bar', data: { labels: yrs.map((r) => 'FY' + r.fy), datasets: [{ label: this.T('Capex real (flujo de efectivo)', 'Actual capex (cash-flow statement)'), data: yrs.map((r) => r.capex), backgroundColor: PALETTE[0], maxBarThickness: 36 }, { label: this.T('Capex guiado (última guía del año)', 'Guided capex (final guidance of the year)'), data: yrs.map((r) => r.guided), backgroundColor: '#c9c6bd', maxBarThickness: 36 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(this.width() * 1.6), Math.round(h * 1.6));
          yb = this.image(img, this.cur.x0, yb, this.width(), h) + 4;
        }
      }
      this.noteAbove(this.T(`Fuente: tablas de guía en los comunicados de resultados de GAP (GlobeNewswire / Form 6-K); real de los informes trimestrales y anuales; capex = adquisiciones de mejoras a bienes concesionados y activos fijos del estado de flujos; PMD según el comunicado de GAP del ${cp && cp.mdp && cp.mdp.remaining ? this.date(cp.mdp.remaining.sourceDate) : '—'} (Form 6-K). Rangos como los publica GAP: crecimiento % vs el año anterior, margen EBITDA en nivel (sin IFRIC 12), capex en Ps. millones.`, `Source: guidance tables in GAP's results releases (GlobeNewswire / Form 6-K); actuals from the quarterly and annual reports; capex = additions to concession improvements and fixed assets in the cash-flow statement; MDP per GAP's release of ${cp && cp.mdp && cp.mdp.remaining ? this.date(cp.mdp.remaining.sourceDate) : '—'} (Form 6-K). Ranges as GAP publishes them: % growth vs prior year, EBITDA margin as a level (ex-IFRIC 12), capex in Ps. million.`), yb + 4, 7);
    }

    // ================= 05 TRAFFIC TABLES =================
    // Latest month with GAP's own comparative and year-to-date columns (trafficLatest); the last twelve months are
    // sums of the monthly reports.
    trafficTables() {
      const M = this.M, ms = M.TR.months, TL = M.trafficLatest(), lastM = TL.month, AIR = M.AIR, own = TL.basis === 'release';
      let y = this.page('P', this.secTitle('traffic', this.T(`Tráfico por aeropuerto · ${M.ymLabel(lastM.ym)} y últimos doce meses`, `Traffic by Airport · ${M.ymLabel(lastM.ym)} and Last Twelve Months`)), this.T(`Miles de pasajeros terminales · reporte mensual de tráfico de GAP del ${this.date(lastM.source && lastM.source.date)} · cifras preliminares; CBX en Tijuana se clasifica como internacional`, `Thousand terminal passengers · GAP monthly traffic report of ${this.date(lastM.source && lastM.source.date)} · preliminary figures; CBX users at Tijuana count as international`));
      const name = (code) => (code === 'TOTAL' ? this.T('Total GAP (14 aeropuertos)', 'Total GAP (14 airports)') : `${code} · ${(AIR.find((a) => a.code === code) || {})[M.LANG] || code}`);
      const codes = [...AIR.map((a) => a.code), 'TOTAL'];
      const rows = [], meta = [];
      for (const code of codes) { const r = TL.rows[code]; rows.push([name(code), this.n(r.v, 1), M.fmtChgV(r.yoy), this.n(r.dom, 1), this.n(r.intl, 1), this.n(r.ytd, 1), M.fmtChgV(r.ytdYoy), this.pct(100 * r.v / TL.rows.TOTAL.v, 1)]); const b = code === 'TOTAL' ? 'bold' : ''; meta.push([b + ' left', b, this.cls(typeof r.yoy === 'number' ? r.yoy : null) + ' ' + b, b, b, b, this.cls(typeof r.ytdYoy === 'number' ? r.ytdYoy : null) + ' ' + b, b]); }
      y = this.heading(this.T(`Último mes: ${M.ymLabel(lastM.ym)} · acumulado ${this.ytdSpan(lastM.ym)}`, `Latest month: ${M.ymLabel(lastM.ym)} · year to date ${this.ytdSpan(lastM.ym)}`), this.cur.x0, y, 10.5);
      y = this.table({ y, head: [M.t('airport'), M.ymLabel(lastM.ym), M.t('yoy'), M.t('dom'), M.t('intl'), this.ytdSpan(lastM.ym), M.t('yoy'), M.t('share')], body: rows, meta, size: 8.4, cols: { 0: { halign: 'left', cellWidth: this.width() * 0.3 } } });
      if (TL.cbx.v != null) y = this.note(this.T(`Usuarios de CBX en ${M.ymLabel(lastM.ym)}: ${this.n(TL.cbx.v, 1)} mil (${M.fmtChgV(TL.cbx.yoy)} a/a); acumulado ${this.ytdSpan(lastM.ym)}: ${TL.cbx.ytd != null ? this.n(TL.cbx.ytd, 1) + ' mil (' + M.fmtChgV(TL.cbx.ytdYoy) + ')' : '—'} (ambas direcciones).`, `CBX users in ${M.ymLabel(lastM.ym)}: ${this.n(TL.cbx.v, 1)} thousand (${M.fmtChgV(TL.cbx.yoy)} y/y); ${this.ytdSpan(lastM.ym)}: ${TL.cbx.ytd != null ? this.n(TL.cbx.ytd, 1) + ' thousand (' + M.fmtChgV(TL.cbx.ytdYoy) + ')' : '—'} (both directions).`), y + 3);
      const nt = M.nextTraffic();
      if (nt) y = this.text(this.T(`Próximo reporte: tráfico de ${nt.dataMonth}, esperado hacia el ${this.date(nt.date)} (GAP publica alrededor del día ${nt.day}, mediana de los últimos doce reportes).`, `Next report: ${nt.dataMonth} traffic, expected around ${this.date(nt.date)} (GAP publishes around the ${nt.day}${[1, 21, 31].includes(nt.day) ? 'st' : [2, 22].includes(nt.day) ? 'nd' : [3, 23].includes(nt.day) ? 'rd' : 'th'}, median of the last twelve reports).`), this.cur.x0, y + 2, this.width(), 8.4, 'bold', ACCENT);
      // LTM table
      const i = ms.length - 1; const win = ms.slice(i - 11, i + 1), pwin = ms.slice(i - 23, i - 11);
      if (win.length === 12) {
        const sum = (arr, seg, code) => arr.reduce((a, m) => a + ((m[seg] && m[seg][code]) || 0), 0);
        const r2 = [], m2 = []; const tot = sum(win, 'total', 'TOTAL');
        for (const code of codes) { const v = sum(win, 'total', code), p = pwin.length === 12 ? sum(pwin, 'total', code) : null; r2.push([name(code), this.n(v, 1), this.chg(v, p), this.n(sum(win, 'dom', code), 1), this.n(sum(win, 'intl', code), 1), this.pct(100 * sum(win, 'intl', code) / v, 1), this.pct(100 * v / tot, 1)]); const b = code === 'TOTAL' ? 'bold' : ''; m2.push([b + ' left', b, this.chgCls(v, p) + ' ' + b, b, b, b, b]); }
        y = this.heading(this.T(`Últimos doce meses: ${M.ymLabel(win[0].ym)} – ${M.ymLabel(lastM.ym)}`, `Last twelve months: ${M.ymLabel(win[0].ym)} – ${M.ymLabel(lastM.ym)}`), this.cur.x0, y + 8, 10.5);
        y = this.table({ y, head: [M.t('airport'), this.T('UDM', 'LTM'), this.T('a/a vs UDM previos', 'y/y vs prior LTM'), M.t('dom'), M.t('intl'), this.T('% internacional', '% international'), M.t('share')], body: r2, meta: m2, size: 8.4, cols: { 0: { halign: 'left', cellWidth: this.width() * 0.3 } } });
      }
      this.noteAbove(this.T(`Fuente: reportes mensuales de tráfico de GAP (GlobeNewswire / Form 6-K); cobertura ${M.ymLabel(ms[0].ym)} – ${M.ymLabel(lastM.ym)}. ${own ? `Variaciones y acumulado del año tomados de las columnas del propio reporte de ${M.ymLabel(lastM.ym)} (comparativo del mismo mes y enero–${M.ymLabel(lastM.ym).split(' ')[0]} de ambos años), no de sumas de reportes preliminares.` : 'Variaciones y acumulado calculados a partir de los reportes mensuales.'} Los últimos doce meses suman los doce reportes mensuales. ${M.t('nmNote')}`, `Source: GAP monthly traffic reports (GlobeNewswire / Form 6-K); coverage ${M.ymLabel(ms[0].ym)} – ${M.ymLabel(lastM.ym)}. ${own ? `Changes and year to date taken from the ${M.ymLabel(lastM.ym)} report's own columns (same-month comparative and January–${M.ymLabel(lastM.ym).split(' ')[0]} of both years), not from sums of preliminary reports.` : 'Changes and year to date computed from the monthly reports.'} Last twelve months add the twelve monthly reports. ${M.t('nmNote')}`), y + 6, 7.2);
    }

    // ================= 05 TRAFFIC CHARTS: GAP vs MEXICO =================
    trafficCharts() {
      const M = this.M, ms = M.TR.months, MX = this.MX;
      const from = '2023-01'; const gapM = ms.filter((m) => m.ym >= from);
      const labels = gapM.map((m) => m.ym);
      const gapV = gapM.map((m) => m.total.TOTAL / 1000);
      const mxIdx = MX ? Object.fromEntries(MX.months.map((ym, i) => [ym, i])) : {};
      const mxAt = (ym) => (MX && mxIdx[ym] != null ? (MX.national.pax.dom[mxIdx[ym]] + MX.national.pax.intl[mxIdx[ym]]) / 1e6 : null);
      const mxV = labels.map(mxAt);
      const yoyG = gapM.map((m) => { const p = ms.find((x) => x.ym === `${+m.ym.slice(0, 4) - 1}${m.ym.slice(4)}`); return p ? 100 * (m.total.TOTAL / p.total.TOTAL - 1) : null; });
      const yoyM = labels.map((ym) => { const a = mxAt(ym), b = mxAt(`${+ym.slice(0, 4) - 1}${ym.slice(4)}`); return a != null && b ? 100 * (a / b - 1) : null; });
      const mxLast = MX ? MX.lastMonth : null;
      let y = this.page('P', this.secTitle('traffic', this.T(`Tráfico de GAP frente al total de México · desde ${M.ymLabel(from)}`, `GAP Traffic Versus Mexico Total · Since ${M.ymLabel(from)}`)), this.T(`GAP: pasajeros terminales de los 14 aeropuertos (reportes mensuales, hasta ${M.ymLabel(ms[ms.length - 1].ym)}) · México: pasajeros de todos los aeropuertos comerciales según la AFAC (hasta ${mxLast ? M.ymLabel(mxLast) : '—'})`, `GAP: terminal passengers at its 14 airports (monthly reports, to ${M.ymLabel(ms[ms.length - 1].ym)}) · Mexico: passengers at every commercial airport per AFAC (to ${mxLast ? M.ymLabel(mxLast) : '—'})`));
      const W = this.width(); const tick = (v, i) => (labels[i] && labels[i].slice(5) === '01' ? labels[i].slice(0, 4) : labels[i] && labels[i].slice(5) === '07' ? M.ymLabel(labels[i]).split(' ')[0] : '');
      y = this.heading(this.T('Pasajeros por mes (millones): GAP en el eje izquierdo, México en el eje derecho', 'Passengers per month (million): GAP on the left axis, Mexico on the right axis'), this.cur.x0, y, 10.5);
      const h1 = 215;
      const img1 = this.chart({ type: 'line', data: { labels, datasets: [{ label: this.T('◀ GAP · total 14 aeropuertos (millones, EJE IZQUIERDO)', '◀ GAP · total 14 airports (million, LEFT AXIS)'), data: gapV, borderColor: PALETTE[0], backgroundColor: PALETTE[0], yAxisID: 'y', borderWidth: 2.4 }, { label: this.T('México · todos los aeropuertos, AFAC (millones, EJE DERECHO) ▶', 'Mexico · all airports, AFAC (million, RIGHT AXIS) ▶'), data: mxV, borderColor: PALETTE[1], backgroundColor: PALETTE[1], yAxisID: 'y2', borderWidth: 2, borderDash: [6, 3] }] }, options: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { position: 'left', title: { display: true, text: this.T('GAP (millones)', 'GAP (million)'), color: PALETTE[0], font: { size: 10, weight: 'bold' } }, ticks: { color: PALETTE[0], callback: (v) => this.n(v, 1) } }, y2: { position: 'right', grid: { display: false }, title: { display: true, text: this.T('México (millones)', 'Mexico (million)'), color: '#8a6a12', font: { size: 10, weight: 'bold' } }, ticks: { color: '#8a6a12', callback: (v) => this.n(v, 1) } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img1, this.cur.x0, y, W, h1) + 8;
      y = this.heading(this.T('Variación anual (%) del mismo mes: GAP y México (un solo eje)', 'Year-on-year change (%) of the same month: GAP and Mexico (single axis)'), this.cur.x0, y, 10.5);
      const h2 = 165;
      const img2 = this.chart({ type: 'bar', data: { labels, datasets: [{ type: 'bar', label: this.T('GAP · variación a/a %', 'GAP · y/y change %'), data: yoyG, backgroundColor: PALETTE[0], maxBarThickness: 9 }, { type: 'line', label: this.T('México (AFAC) · variación a/a %', 'Mexico (AFAC) · y/y change %'), data: yoyM, borderColor: PALETTE[1], backgroundColor: PALETTE[1], borderWidth: 2, pointRadius: 2 }] }, options: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h2 * 1.6));
      y = this.image(img2, this.cur.x0, y, W, h2) + 8;
      const last12 = labels.slice(-12); const rows = last12.map((ym) => { const i = labels.indexOf(ym); return [M.ymLabel(ym), this.n(gapV[i], 2), this.pct(yoyG[i], 1, true), mxV[i] == null ? '—' : this.n(mxV[i], 2), this.pct(yoyM[i], 1, true), mxV[i] ? this.pct(100 * gapV[i] / mxV[i], 1) : '—']; });
      const meta = rows.map((r, i) => ['left', '', this.cls(yoyG[labels.indexOf(last12[i])]), '', this.cls(yoyM[labels.indexOf(last12[i])]), '']);
      const rem = this.cur.y1 - y - 30;
      if (rem > 90) y = this.fitTable({ y, head: [this.T('Mes', 'Month'), this.T('GAP (M)', 'GAP (M)'), this.T('GAP a/a', 'GAP y/y'), this.T('México (M)', 'Mexico (M)'), this.T('México a/a', 'Mexico y/y'), this.T('GAP / México', 'GAP / Mexico')], body: rows, meta, cols: { 0: { halign: 'left' } } }, [8.2, 7.6, 7, 6.5], this.cur.y1 - 44);
      this.noteAbove(this.T(`Ambas series cuentan pasajeros en cada aeropuerto (llegadas y salidas), por lo que un vuelo nacional cuenta en origen y destino. El total de GAP incluye Montego Bay y Kingston (Jamaica); el de México solo aeropuertos mexicanos. Variaciones mensuales calculadas sobre los reportes de cada mes. Fuentes: reportes mensuales de tráfico de GAP; AFAC, Estadística operativa de aeropuertos (${MX && MX.sources && MX.sources.afac ? MX.sources.afac.file + ', publicado el ' + this.date(MX.sources.afac.published) : 'archivo mensual'}).`, `Both series count passengers at each airport (arrivals and departures), so a domestic flight counts at both ends. GAP's total includes Montego Bay and Kingston (Jamaica); Mexico's covers Mexican airports only. Monthly changes computed on each month's report. Sources: GAP monthly traffic reports; AFAC, airport operating statistics (${MX && MX.sources && MX.sources.afac ? MX.sources.afac.file + ', published ' + this.date(MX.sources.afac.published) : 'monthly file'}).`), y + 4, 7);
    }

    // ================= 06 LEVERAGE AND DEBT =================
    debtPage() {
      const M = this.M, qs = M.Q.slice(-8), lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ);
      const nds = qs.map((q) => ({ q, nd: M.netDebt(q), l: M.ltmFor(q) })); const est = nds.map((x) => x.nd && x.nd.basis === 'est');
      const D2 = M.REF.debt || {}; const rat = (D2.ratings || []).map((r) => `${r.agency.replace("Moody's Local MX", "Moody's").replace('S&P Global Ratings', 'S&P')} ${r.rating}`).join(' · ');
      const asOfI = D2.instrumentsAsOf || M.qEndDate(lastQ), fac = (D2.facilities || [])[0];
      let y = this.page('L', this.secTitle('debt', this.T('Apalancamiento y perfil de deuda', 'Leverage and Debt Profile')), this.T(`Ps. millones · balance del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}) · instrumentos al ${this.date(asOfI)} (FactSet, nombres de los 6-K) · comunicados de GAP y eventos relevantes BMV (referencia del ${this.date(M.REF.updatedAt)})`, `Ps. million · ${this.qlab(lastQ)} balance sheet (${this.date(lastQ.sources.is.date)}) · instruments at ${this.date(asOfI)} (FactSet, 6-K series names) · GAP releases and BMV material events (reference of ${this.date(M.REF.updatedAt)})`));
      const asOf = this.date(M.qEndDate(lastQ));
      y = this.tiles([
        { v: nd ? `Ps. ${this.m(nd.net)} M` : '—', l: this.T(`Deuda neta · ${asOf}`, `Net debt · ${asOf}`) },
        { v: nd ? `Ps. ${this.m(nd.gross)} M` : '—', l: this.T('Deuda bruta (préstamos + certificados)', 'Gross debt (loans + certificados)') },
        { v: nd ? `Ps. ${this.m(nd.cash)} M` : '—', l: this.T('Efectivo y equivalentes', 'Cash and equivalents') },
        { v: nd && L ? this.x(nd.net / L.is.ebitda, 2) : '—', l: this.T('Deuda neta / EBITDA UDM', 'Net debt / LTM EBITDA') },
        { v: rat || '—', l: this.T('Calificación de los certificados (escala nacional)', 'Rating of the certificados (national scale)'), size: 11 },
      ], y);
      const gap = 24, wl = this.width() * 0.5, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T('Deuda neta (barras, Ps. millones) y deuda neta / EBITDA UDM (línea, eje derecho)', 'Net debt (bars, Ps. million) and net debt / LTM EBITDA (line, right axis)'), this.cur.x0, y, 10, wl);
      const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');
      const h1 = 260;
      const img1 = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [
        { type: 'line', label: gl(this.T('Deuda neta / EBITDA UDM (eje der.)', 'Net debt / LTM EBITDA (right axis)')), data: nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null)), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true, segment: { borderDash: (ctx) => (est[ctx.p1DataIndex] ? [5, 4] : undefined) } },
        { type: 'bar', label: this.T('Deuda neta (eje izq.)', 'Net debt (left axis)'), data: nds.map((x) => (x.nd ? x.nd.net / 1000 : null)), backgroundColor: nds.map((_, i) => alpha(PALETTE[0], est[i] ? 0.45 : 1)), maxBarThickness: 38, order: 1 }] },
        options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, min: 1.8, ticks: { stepSize: 0.1, callback: (v) => this.n(v, 1) + 'x' } } } } }, Math.round(wl * 1.6), Math.round(h1 * 1.6));
      yl = this.image(img1, this.cur.x0, yl, wl, h1) + 6;
      const firstBs = nds.find((x) => x.nd && x.nd.basis === 'bs');
      const mar = (D2.events || []).find((e) => /GAP 26/.test(e.en || ''));
      yl = this.bullets([
        this.T(`Deuda neta = préstamos bancarios + certificados bursátiles − efectivo, del balance publicado (detallado desde ${firstBs ? this.qlab(firstBs.q) : '—'}). Barras translúcidas y línea punteada: estimación a partir de los flujos de financiamiento de cada trimestre.`, `Net debt = bank loans + certificados bursátiles − cash, from the published balance sheet (itemized from ${firstBs ? this.qlab(firstBs.q) : '—'}). Translucent bars and dashed line: estimated from each quarter's financing flows.`),
        this.T(`La emisión de marzo de 2026 (GAP 26 / GAP 26-2, Ps. 10,718 M) financió el 25% restante de CBX y capex del PMD${fac ? `; el ${this.date(fac.date)} se firmaron líneas bancarias por Ps. ${this.n(fac.amountMxnM)} M (${M.LS(fac.use)})` : ''}.`, `The March 2026 issuance (GAP 26 / GAP 26-2, Ps. 10,718 M) funded the remaining 25% of CBX and MDP capex${fac ? `; on ${this.date(fac.date)} Ps. ${this.n(fac.amountMxnM)} M of bank facilities were signed (${M.LS(fac.use)})` : ''}.`),
      ], this.cur.x0, yl, wl, 8.4, { gap: 3, color: MUTED });
      let yr = this.heading(this.T(`Vencimientos de los instrumentos vigentes al ${this.date(asOfI)}`, `Maturity profile of instruments outstanding at ${this.date(asOfI)}`), xr, y, 10, wr);
      // One row per maturity year; the instruments GAP's September release says are repaid from the new facilities are flagged.
      const byYear = new Map(); let flagged = [];
      for (const i of D2.instruments || []) { const yv = i.matures ? i.matures.slice(0, 4) : '—'; const g = byYear.get(yv) || { y: yv, n: 0, cb: 0, loan: 0, fixed: 0, repaid: 0 }; if (i.type === 'CB') { g.n++; g.cb += i.principalMxn || 0; if (/fij|fixed/i.test(M.LS(i.rate) || '')) g.fixed += i.principalMxn || 0; } else g.loan += i.principalMxn || 0; if (i.repaid) { g.repaid += i.principalMxn || 0; flagged.push(i); } byYear.set(yv, g); }
      const rows = [...byYear.values()].sort((a, b) => a.y.localeCompare(b.y)).map((g) => [g.y + (g.repaid ? ' ¹' : ''), g.n ? String(g.n) : '—', g.cb ? this.n(g.cb) : '—', g.loan ? this.n(g.loan) : '—', this.n(g.cb + g.loan), g.cb + g.loan ? this.n(100 * g.fixed / (g.cb + g.loan), 0) + '%' : '—']);
      const tot = [...byYear.values()].reduce((x, g) => ({ n: x.n + g.n, cb: x.cb + g.cb, loan: x.loan + g.loan, fixed: x.fixed + g.fixed }), { n: 0, cb: 0, loan: 0, fixed: 0 });
      rows.push([this.T('Total instrumentos', 'Total instruments'), String(tot.n), this.n(tot.cb), this.n(tot.loan), this.n(tot.cb + tot.loan), this.n(100 * tot.fixed / (tot.cb + tot.loan), 0) + '%']);
      // reconciliation to the balance sheet
      const bsDebt = nd ? nd.gross / 1000 : null, diff = bsDebt != null ? bsDebt - (tot.cb + tot.loan) : null, legacy = (D2.reconciliation || {}).legacyLoansMxnM;
      if (diff != null) { rows.push([this.T(`Intereses devengados y préstamos antiguos${legacy ? ` (Ps. ${this.n(legacy)} M)` : ''}`, `Accrued interest and legacy loans${legacy ? ` (Ps. ${this.n(legacy)} M)` : ''}`), '', '', '', this.n(diff), '']); rows.push([this.T(`Préstamos + certificados en balance (${asOf})`, `Bank loans + certificados on the balance sheet (${asOf})`), '', '', '', this.n(bsDebt), '']); }
      const rm = rows.map((r, i) => (i === rows.length - (diff != null ? 3 : 1) ? ['bold left', 'bold', 'bold', 'bold', 'bold', 'bold'] : i >= rows.length - 2 && diff != null ? [i === rows.length - 1 ? 'bold left' : 'left muted', '', '', '', i === rows.length - 1 ? 'bold' : 'muted', ''] : ['left', '', '', '', '', '']));
      yr = this.table({ y: yr, x: xr, w: wr, head: [M.t('matures'), this.T('CB (n)', 'CB (n)'), this.T('CB (Ps. M)', 'CB (Ps. M)'), this.T('Préstamos (Ps. M)', 'Loans (Ps. M)'), this.T('Total (Ps. M)', 'Total (Ps. M)'), this.T('% fija', '% fixed')], body: rows, meta: rm, size: 8.6, cols: { 0: { halign: 'left', cellWidth: wr * 0.36 } }, pad: { top: 3, bottom: 3, left: 3, right: 3 } });
      if (flagged.length) yr = this.note(`¹ ${flagged.map((i) => `${M.LS(i.name)} (Ps. ${this.n(i.principalMxn, 1)} M, ${this.date(i.matures)})`).join(this.T(' y ', ' and '))}: ${M.LS(flagged[0].repaid)}`, yr + 4, 7.4, xr, wr);
      yr = this.note((D2.ratings || []).map((r) => `${r.agency}: ${r.rating} (${M.LS(r.outlook)}; ${M.LS(r.source)})`).join(' · ') + this.T(` Detalle por instrumento en la página del modelo; liquidez y deuda por trimestre en la página siguiente.`, ` Instrument-level detail on the model page; liquidity and debt by quarter on the next page.`), yr + 4, 7.4, xr, wr);
      this.noteAbove(this.T(`Fuentes: balances trimestrales de GAP; FactSet Debt Capital Structure al ${this.date(asOfI)}; comunicados de emisión, de líneas bancarias (${fac ? this.date(fac.date) + ', evento relevante BMV 1588421' : ''}) y de calificación.`, `Sources: GAP quarterly balance sheets; FactSet Debt Capital Structure at ${this.date(asOfI)}; issuance, bank-facility (${fac ? this.date(fac.date) + ', BMV material event 1588421' : ''}) and rating releases.`), Math.max(yl, yr) + 6, 7);
    }

    // ================= 06 LIQUIDITY =================
    liquidityPage() {
      const M = this.M, liq = M.liquidity(), lastQ = M.lastQ, L = M.lastLTM, cp = M.capexProgress(); if (!liq) return;
      const asOf = this.date(liq.asOf), fac = (liq.facilities || [])[0];
      let y = this.page('L', this.secTitle('debt', this.T(`Liquidez al ${asOf} y deuda por trimestre`, `Liquidity at ${asOf} and Debt by Quarter`)), this.T(`Ps. millones · balance y flujo de efectivo del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}) · instrumentos al ${this.date(M.REF.debt.instrumentsAsOf)} · líneas bancarias del ${fac ? this.date(fac.date) : '—'}`, `Ps. million · ${this.qlab(lastQ)} balance sheet and cash-flow statement (${this.date(lastQ.sources.is.date)}) · instruments at ${this.date(M.REF.debt.instrumentsAsOf)} · bank facilities of ${fac ? this.date(fac.date) : '—'}`));
      const gap = 24, wl = this.width() * 0.52, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const rows = [], meta = [];
      const H = (s) => { rows.push([s, '', '']); meta.push(['head left', 'head', 'head']); };
      const R = (l, v, note, c) => { rows.push([l, v == null ? '—' : this.n(v), note || '']); meta.push([(c || '') + ' left', c || '', 'left small muted']); };
      H(this.T('Fuentes de liquidez', 'Sources of liquidity'));
      R(this.T(`Efectivo y equivalentes (${asOf})`, `Cash and equivalents (${asOf})`), liq.cash, this.T('balance', 'balance sheet'), 'bold');
      if (fac) R(this.T(`Líneas bancarias comprometidas (${this.date(fac.date)}, posteriores al balance)`, `Committed bank facilities (${this.date(fac.date)}, after the balance sheet)`), fac.amountMxnM, `${M.LS(fac.term)} · ${M.LS(fac.rate)}`);
      R(this.T(`Flujo operativo UDM al ${this.qlab(lastQ)}`, `LTM operating cash flow to ${this.qlab(lastQ)}`), liq.cfoLtm, this.T('después de impuestos e intereses pagados', 'after taxes and interest paid'));
      H(this.T('Usos a doce meses', 'Uses within twelve months'));
      for (const i of liq.due12Items) R(`${M.LS(i.name)} · ${this.date(i.matures)}${i.repaid ? ' ¹' : ''}`, i.principalMxn, M.LS(i.rate), 'sub');
      R(this.T(`Vencimientos a doce meses (${asOf} → ${this.date(M.addDays(liq.asOf, 365))})`, `Maturities within twelve months (${asOf} → ${this.date(M.addDays(liq.asOf, 365))})`), liq.due12, this.T('principal de los instrumentos', 'instrument principal'), 'bold');
      R(this.T(`Dividendos por pagar (${asOf})`, `Dividends payable (${asOf})`), liq.dividendsPayable, this.T('dividendo 2026 declarado íntegro, sin exhibiciones pagadas', '2026 dividend declared in full, no installment paid'), 'bold');
      if (cp && cp.guided != null && cp.ytd != null) R(this.T(`Capex restante de la guía FY${cp.fy}`, `Remaining FY${cp.fy} guided capex`), cp.guided - cp.ytd, this.T(`guía Ps. ${this.n(cp.guided)} M − ${cp.ytdLabel} Ps. ${this.n(cp.ytd)} M`, `guidance Ps. ${this.n(cp.guided)} M − ${cp.ytdLabel} Ps. ${this.n(cp.ytd)} M`));
      H(this.T('Flujo de efectivo UDM (referencia)', 'LTM cash flow (reference)'));
      R(this.T('Capex pagado', 'Capex paid'), liq.capexLtm, ''); R(this.T('Intereses pagados', 'Interest paid'), liq.interestLtm, ''); R(this.T('Impuestos pagados', 'Taxes paid'), liq.taxesLtm, '');
      let yl = this.table({ y, w: wl, head: [this.T('Concepto', 'Item'), 'Ps. M', this.T('Nota', 'Note')], body: rows, meta, size: 8.8, cols: { 0: { halign: 'left', cellWidth: wl * 0.5 }, 1: { cellWidth: wl * 0.14 }, 2: { halign: 'left' } }, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 3 : 0)), pad: { top: 3, bottom: 3, left: 3, right: 3 } });
      const fl = liq.due12Items.filter((i) => i.repaid);
      if (fl.length) yl = this.note(`¹ ${M.LS(fl[fl.length - 1].repaid)}`, yl + 4, 7.4, this.cur.x0, wl);
      // right: debt by quarter
      const qs = M.Q.slice(-8), nds = qs.map((q) => ({ q, nd: M.netDebt(q), l: M.ltmFor(q) }));
      let yr = this.heading(this.T('Deuda neta y EBITDA UDM por trimestre (Ps. millones)', 'Net debt and LTM EBITDA by quarter (Ps. million)'), xr, y, 10, wr);
      const qr = nds.map((x) => [this.qlab(x.q) + (x.nd && x.nd.basis === 'est' ? ' *' : ''), x.nd ? this.m(x.nd.gross) : '—', x.nd ? this.m(x.nd.cash) : '—', x.nd ? this.m(x.nd.net) : '—', x.l ? this.m(x.l.is.ebitda) : '—', x.nd && x.l && x.l.is.ebitda ? this.x(x.nd.net / x.l.is.ebitda, 2) : '—']);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Trimestre', 'Quarter'), this.T('Deuda bruta', 'Gross debt'), this.T('Efectivo', 'Cash'), this.T('Deuda neta', 'Net debt'), this.T('EBITDA UDM', 'LTM EBITDA'), this.T('Deuda neta / EBITDA', 'Net debt / EBITDA')], body: qr, meta: qr.map(() => ['left', '', '', 'bold', '', 'bold']), size: 8.8, cols: { 0: { halign: 'left' } }, pad: { top: 3, bottom: 3, left: 3, right: 3 } });
      yr = this.note(this.T('* estimación a partir de los flujos de financiamiento del trimestre. Deuda bruta = préstamos bancarios + certificados bursátiles (incluye intereses devengados, como en el balance).', '* estimated from the quarter\'s financing flows. Gross debt = bank loans + certificados bursátiles (accrued interest included, as on the balance sheet).'), yr + 4, 7.4, xr, wr);
      const net = liq.cash + (fac ? fac.amountMxnM : 0) - liq.due12 - (liq.dividendsPayable || 0);
      yr = this.bullets([
        this.T(`**Cobertura:** efectivo${fac ? ' más líneas comprometidas' : ''} (Ps. ${this.n(liq.cash + (fac ? fac.amountMxnM : 0))} M) frente a vencimientos a doce meses y dividendos por pagar (Ps. ${this.n(liq.due12 + (liq.dividendsPayable || 0))} M): ${net >= 0 ? 'excedente' : 'faltante'} de Ps. ${this.n(Math.abs(net))} M antes del flujo operativo (Ps. ${liq.cfoLtm != null ? this.n(liq.cfoLtm) : '—'} M UDM) y del capex.`, `**Coverage:** cash${fac ? ' plus committed facilities' : ''} (Ps. ${this.n(liq.cash + (fac ? fac.amountMxnM : 0))} M) against maturities within twelve months and dividends payable (Ps. ${this.n(liq.due12 + (liq.dividendsPayable || 0))} M): a ${net >= 0 ? 'surplus' : 'shortfall'} of Ps. ${this.n(Math.abs(net))} M before operating cash flow (Ps. ${liq.cfoLtm != null ? this.n(liq.cfoLtm) : '—'} M LTM) and capex.`),
        this.T(`**Refinanciamiento:** ${fac ? `las líneas del ${this.date(fac.date)} cubren Ps. ${this.n(fac.refinanceMxnM)} M de los certificados que vencen en 2026 y aportan Ps. ${this.n(fac.capexMxnM)} M para el PMD` : '—'}; el resto de los vencimientos a doce meses corresponde a 2027.`, `**Refinancing:** ${fac ? `the facilities of ${this.date(fac.date)} cover Ps. ${this.n(fac.refinanceMxnM)} M of the certificados maturing in 2026 and add Ps. ${this.n(fac.capexMxnM)} M for the MDP` : '—'}; the other maturities within twelve months fall in 2027.`),
      ], xr, yr + 8, wr, 9, { gap: 5, color: MUTED });
      this.noteAbove(this.T(`Fuentes: informe trimestral de GAP ${this.qlab(lastQ)} (balance y flujo de efectivo); FactSet Debt Capital Structure al ${this.date(M.REF.debt.instrumentsAsOf)}; comunicado de GAP del ${fac ? this.date(fac.date) : '—'} (Form 6-K; evento relevante BMV 1588421); guía de capex del ${cp && cp.guidedDate ? this.date(cp.guidedDate) : '—'}. Las líneas bancarias no estaban dispuestas al ${asOf}; su uso efectivo se verá en el balance del 3T26.`, `Sources: GAP ${this.qlab(lastQ)} quarterly report (balance sheet and cash-flow statement); FactSet Debt Capital Structure at ${this.date(M.REF.debt.instrumentsAsOf)}; GAP release of ${fac ? this.date(fac.date) : '—'} (Form 6-K; BMV material event 1588421); capex guidance of ${cp && cp.guidedDate ? this.date(cp.guidedDate) : '—'}. The bank facilities were not drawn at ${asOf}; their actual use will show in the 3Q26 balance sheet.`), Math.max(yl, yr) + 6, 7);
    }

    // ================= 07 DIVIDENDS =================
    // Each AGM's amount reconciled to the cash-flow statements (per share × shares at the payment dates = dividends or capital
    // reductions paid); payout on the earnings of the fiscal year the AGM distributes (the year before the meeting).
    dividendPage() {
      const M = this.M, agms = M.REF.dividends || [], px = M.lastPx, lastQ = M.lastQ;
      let y = this.page('L', this.secTitle('dividends', this.T('Dividendos: aprobado, pagado y razón de pago', 'Dividends: Approved, Paid and Payout')), this.T(`Resoluciones de las asambleas de GAP · estados de flujos de efectivo (dividendos y reembolsos de capital pagados) · razón de pago sobre la utilidad del año fiscal que la asamblea distribuye · rendimiento sobre el cierre del ${this.date(px[0])}`, `GAP AGM resolutions · cash-flow statements (dividends and capital reductions paid) · payout on the earnings of the fiscal year the AGM distributes · yield on the ${this.date(px[0])} close`));
      const paidFor = (d) => { // cash paid under this AGM: the AGM year's cash-flow line (fiscal year if closed, else the latest year-to-date)
        const fy = M.Y.find((yy) => yy.fy === d.agmYear); const cf = fy && fy.cf ? fy.cf : (lastQ.fy === d.agmYear ? (M.ytdFor(lastQ) || {}).cf : null); const lab = fy && fy.cf ? 'FY' + d.agmYear : lastQ.fy === d.agmYear ? (M.ytdFor(lastQ) || {}).id : null;
        if (!cf) return { v: null, lab: null }; const v = d.kind === 'capitalReduction' ? -(cf.capitalReduction || 0) : -(cf.dividendsPaid || 0); return { v: v / 1000, lab };
      };
      const rows = [], meta = []; const qEnd = this.date(M.qEndDate(lastQ)), payable = lastQ.bs && lastQ.bs.dividendsPayable != null ? lastQ.bs.dividendsPayable / 1000 : null;
      for (const d of agms) {
        const paid = paidFor(d), isOpen = d === agms[agms.length - 1] && payable != null && payable > 1;
        // closed meetings: per share × shares at the meeting date (ties to the cash-flow line); the open one: the balance sheet's
        // dividends payable, which is per share × the shares outstanding at the balance-sheet date (GAP pays the shares of each payment date)
        const sh = isOpen ? payable * 1e6 / d.dps : M.sharesAt(d.agmDate), amount = isOpen ? payable : d.dps * sh / 1e6, open = paid.v != null ? amount - paid.v : null;
        const status = paid.v == null ? '—' : isOpen ? this.T(`Ps. ${this.n(payable)} M por pagar al ${qEnd} (balance); la línea «dividendos declarados y pagados» del flujo ${paid.lab} trae Ps. ${this.n(paid.v)} M sin explicación en el informe; ninguna exhibición registrada en bolsa; pagadero hasta el ${this.date(d.payableUntil)}`, `Ps. ${this.n(payable)} M payable at ${qEnd} (balance sheet); the ${paid.lab} cash-flow line "dividends declared and paid" carries Ps. ${this.n(paid.v)} M, unexplained in the report; no installment recorded on the exchange; payable until ${this.date(d.payableUntil)}`) : Math.abs(open) < 1 ? this.T('pagado íntegro', 'paid in full') : this.T(`diferencia de Ps. ${this.n(open)} M al ${paid.lab}`, `difference of Ps. ${this.n(open)} M at ${paid.lab}`);
        rows.push([`${d.agmYear} · ${this.date(d.agmDate)}`, d.kind === 'capitalReduction' ? this.T('Reembolso de capital', 'Capital reduction') : this.T('Dividendo', 'Dividend'), this.n(d.dps, 2), this.n(sh / 1e6, 1), this.n(amount), paid.v == null ? '—' : `${this.n(paid.v)} (${paid.lab})`, status]);
        meta.push(['left', 'left', 'bold', '', '', '', 'left small']);
      }
      const W = this.width();
      let yl = this.heading(this.T('Lo aprobado en cada asamblea frente a lo pagado según el estado de flujos', 'Each AGM\'s approval against the cash paid per the cash-flow statement'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, head: [this.T('Asamblea', 'AGM'), this.T('Tipo', 'Kind'), this.T('Ps. por acción', 'Ps. per share'), this.T('Acciones (M)', 'Shares (M)'), this.T('Monto (Ps. M)', 'Amount (Ps. M)'), this.T('Pagado según flujo (Ps. M)', 'Paid per cash flow (Ps. M)'), this.T('Estatus', 'Status')], body: rows, meta, size: 8.6, cols: { 0: { halign: 'left', cellWidth: W * 0.13 }, 1: { halign: 'left', cellWidth: W * 0.12 }, 6: { halign: 'left', cellWidth: W * 0.36 } }, pad: { top: 3, bottom: 3, left: 3.5, right: 3.5 } });
      yl = this.note(this.T(`Asambleas cerradas: por acción × acciones en circulación en la fecha de la asamblea (505,277,464 hasta la fusión con CBX/AMP del 7-may-2026), que cuadra con el flujo de efectivo del año. Asamblea ${agms.length ? agms[agms.length - 1].agmYear : ''}: dividendos por pagar del balance al ${qEnd} (por acción × las 595,018,195 acciones posteriores a la fusión: GAP paga a las acciones en circulación en cada fecha de pago). Pagado = «dividendos declarados y pagados» (o reembolsos de capital) del estado de flujos.`, `Closed meetings: per share × shares outstanding at the meeting date (505,277,464 until the CBX/AMP merger of 7-May-2026), which ties to the year's cash-flow statement. ${agms.length ? agms[agms.length - 1].agmYear : ''} meeting: dividends payable on the ${qEnd} balance sheet (per share × the 595,018,195 post-merger shares: GAP pays the shares outstanding on each payment date). Paid = "dividends declared and paid" (or capital reductions) in the cash-flow statement.`), yl + 4, 7.4);
      // payout on the prior fiscal year's earnings, yield at the AGM-date close and on the latest close
      const gap = 24, wl = W * 0.56, xr = this.cur.x0 + wl + gap, wr = W - wl - gap;
      const pr = [], pm = [];
      for (const d of agms) {
        const fy = M.Y.find((yy) => yy.fy === d.agmYear - 1), ps = fy ? M.perShare(fy) : null; const pAgm = M.pointAtOrBefore(M.gapPx, d.agmDate);
        pr.push([`${d.agmYear}`, this.n(d.dps, 2), ps && ps.eps != null ? this.n(ps.eps, 2) : '—', ps && ps.eps ? this.pct(100 * d.dps / ps.eps, 0) : '—', ps && ps.ctrl != null ? this.n(ps.ctrl, 2) : '—', ps && ps.ctrl ? this.pct(100 * d.dps / ps.ctrl, 0) : '—', pAgm ? this.pct(100 * d.dps / pAgm[1]) : '—']);
        pm.push(['left', 'bold', '', 'bold', '', '', '']);
      }
      const last = agms[agms.length - 1];
      let y2 = this.heading(this.T('Razón de pago sobre la utilidad del año fiscal anterior a la asamblea', 'Payout on the earnings of the fiscal year before the AGM'), this.cur.x0, yl + 8, 10, wl);
      y2 = this.table({ y: y2, w: wl, head: [this.T('Asamblea', 'AGM'), this.T('Ps. por acción', 'Ps. per share'), this.T('Utilidad neta por acción FY anterior', 'Prior-FY net income per share'), this.T('Razón de pago', 'Payout'), this.T('Utilidad integral controladora por acción FY anterior', 'Prior-FY controlling comprehensive income per share'), this.T('Razón de pago', 'Payout'), this.T('Rendimiento al cierre de la asamblea', 'Yield at the AGM-date close')], body: pr, meta: pm, size: 8.6, cols: { 0: { halign: 'left', cellWidth: wl * 0.13 } }, pad: { top: 3, bottom: 3, left: 3, right: 3 } });
      y2 = this.note(this.T(`Utilidad por acción del año fiscal anterior = utilidad del año ÷ acciones en circulación al cierre de ese año (505,277,464 para FY2023–FY2025). Rendimiento del dividendo ${last ? last.agmYear : ''} sobre el cierre del ${this.date(px[0])} (Ps. ${this.n(px[1], 2)}): ${last ? this.pct(100 * last.dps / px[1]) : '—'}, la misma cifra del resumen ejecutivo y la ficha técnica.`, `Prior-fiscal-year earnings per share = the year's earnings ÷ shares outstanding at that year-end (505,277,464 for FY2023–FY2025). ${last ? last.agmYear : ''} dividend yield on the ${this.date(px[0])} close (Ps. ${this.n(px[1], 2)}): ${last ? this.pct(100 * last.dps / px[1]) : '—'}, the same figure as the executive summary and the tear sheet.`), y2 + 4, 7.6, this.cur.x0, wl);
      // right: distributions per the cash-flow statements, last ten fiscal years
      const fys = M.Y.filter((fy) => fy.cf && fy.cf.cfo != null).slice(-10);
      const z = (v) => -(v || 0) / 1000;
      let yr = this.heading(this.T('Distribuciones según el estado de flujos (Ps. millones)', 'Distributions per the cash-flow statements (Ps. million)'), xr, yl + 8, 10, wr);
      const h = Math.min(215, this.cur.y1 - yr - 60);
      const img = this.chart({ type: 'bar', data: { labels: fys.map((f) => 'FY' + f.fy), datasets: [{ label: this.T('Dividendos pagados', 'Dividends paid'), data: fys.map((f) => z(f.cf.dividendsPaid)), backgroundColor: PALETTE[0], stack: 's', maxBarThickness: 30 }, { label: this.T('Reembolsos de capital', 'Capital reductions'), data: fys.map((f) => z(f.cf.capitalReduction)), backgroundColor: PALETTE[1], stack: 's', maxBarThickness: 30 }, { label: this.T('Recompras', 'Buybacks'), data: fys.map((f) => z(f.cf.buybacks)), backgroundColor: PALETTE[5], stack: 's', maxBarThickness: 30 }] }, options: { scales: { x: { grid: { display: false }, stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h * 1.6));
      yr = this.image(img, xr, yr, wr, h) + 4;
      yr = this.note(this.T('Flujos de efectivo anuales de GAP (informe del 4T de cada año); el apéndice A trae la tabla completa (flujo operativo, capex, flujo libre, pago de deuda, distribuciones) y el registro de bolsa por año de pago.', 'GAP annual cash-flow statements (4Q report of each year); appendix A carries the full table (operating cash flow, capex, free cash flow, debt paydown, distributions) and the exchange record by payment year.'), yr + 2, 7.2, xr, wr);
      const srcs = agms.map((d) => M.LS(d.source)).filter(Boolean);
      this.noteAbove(this.T('Fuentes: ', 'Sources: ') + [...new Set(srcs)].join(' · ') + this.T(`; estados de flujos de efectivo de GAP (FY${fys[0] ? fys[0].fy : ''}–FY${fys.length ? fys[fys.length - 1].fy : ''} y ${M.ytdFor(lastQ) ? M.ytdFor(lastQ).id : ''}); ${M.marketSrcNote(['GAPB.MX'])}.`, `; GAP cash-flow statements (FY${fys[0] ? fys[0].fy : ''}–FY${fys.length ? fys[fys.length - 1].fy : ''} and ${M.ytdFor(lastQ) ? M.ytdFor(lastQ).id : ''}); ${M.marketSrcNote(['GAPB.MX'])}.`), Math.max(y2, yr) + 6, 7);
    }

    // ================= 08 CBX =================
    cbxPage() {
      const M = this.M, C = M.REF.cbx || {}, lastQ = M.lastQ, sh = M.REF.shares || {};
      let y = this.page('L', this.secTitle('cbx', this.T('Adquisición de Cross Border Xpress (CBX)', 'The Cross Border Xpress (CBX) Acquisition')), this.T(`Consolidado desde ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'} · cifras de los comunicados de GAP (Form 6-K), los eventos relevantes de la BMV y el informe del ${this.qlab(lastQ)}`, `Consolidated from ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'} · figures from GAP's releases (Form 6-K), the BMV material events and the ${this.qlab(lastQ)} report`));
      const F = (k) => (C.facts || []).find((f) => f.k === k); const tiles = ['newShares', 'sharesAfter', 'dilution', 'cash25', 'cbxRev2025', 'cbxMargin2025'].map(F).filter(Boolean);
      y = this.tiles(tiles.map((f) => ({ v: M.fmtFact(f), l: this.es ? f.label_es : f.label_en })), y, 48);
      const gap = 22, wl = this.width() * 0.58, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const shF = F('newShares'), cash = F('cash25'), dil = F('dilution'), tij = F('tijPax2025');
      const ops = M.opsFor(lastQ, 'q'); const perUser = ops && ops.cbxPerUser;
      const newSh = sh.newSharesIssuedCbx || (shF && shF.v), pre = sh.preMergerOutstanding, post = sh.total;
      // ---- diagram A: what CBX is (two boxes joined by a bridge across a dashed border line)
      let yl = this.heading(this.T('Qué es: una terminal en EE. UU. unida a Tijuana por un puente fronterizo', 'What it is: a US terminal linked to Tijuana by a bridge over the border'), this.cur.x0, y, 10, wl) + 4;
      const bw = wl * 0.34, bh = 56, mid = this.cur.x0 + wl / 2, xa = this.cur.x0, xb = this.cur.x0 + wl - bw;
      this.box(xa, yl, bw, bh, this.T('San Diego, EE. UU. · terminal CBX (Otay Mesa)', 'San Diego, USA · CBX terminal (Otay Mesa)'), this.T('Estacionamiento, documentación y aduana/migración de EE. UU.', 'Parking, check-in and US customs/immigration'), [232, 236, 240]);
      this.box(xb, yl, bw, bh, this.T('Tijuana, México · Aeropuerto Internacional (TIJ)', 'Tijuana, Mexico · Tijuana International Airport (TIJ)'), this.T(`Aeropuerto de GAP${tij ? ' · ' + M.fmtFact(tij) + ' de pasajeros en 2025 (reportes mensuales)' : ''}`, `GAP airport${tij ? ' · ' + M.fmtFact(tij) + ' passengers in 2025 (monthly reports)' : ''}`), HEAD);
      this.pdf.setFillColor(...ACCENT); this.pdf.rect(xa + bw, yl + bh / 2 - 4, xb - xa - bw, 8, 'F');
      this.font('normal', 7.4, ACCENT); this.pdf.text(tx(this.T('puente peatonal de 120 m', '120 m pedestrian bridge')), mid, yl + bh / 2 - 8, { align: 'center' });
      this.font('normal', 7.2, ACCENT); this.pdf.text(tx(this.T('cruce en ambos sentidos', 'crossing both ways')), mid, yl + bh / 2 + 14, { align: 'center' });
      this.pdf.setFillColor(...ACCENT); const by = yl + bh / 2; this.pdf.triangle(xa + bw + 1, by, xa + bw + 9, by - 8, xa + bw + 9, by + 8, 'F'); this.pdf.triangle(xb - 1, by, xb - 9, by - 8, xb - 9, by + 8, 'F');
      this.pdf.setDrawColor(...NEG); this.pdf.setLineWidth(0.8); this.pdf.setLineDashPattern([3, 2], 0); this.pdf.line(mid, yl - 3, mid, yl + bh + 10); this.pdf.setLineDashPattern([], 0);
      this.font('bold', 7.2, NEG); this.pdf.text(tx(this.T('frontera EE. UU.–México', 'US–Mexico border')), mid, yl + bh + 18, { align: 'center' });
      yl += bh + 26;
      yl = this.text(this.T(`Los pasajeros con boleto de avión cruzan directamente entre Estados Unidos y la terminal de Tijuana pagando una cuota por cruce (Ps. ${perUser ? this.n(perUser, 0) : '—'} por usuario en el ${this.qlab(lastQ)}). Es ingreso no aeronáutico, sin tarifa regulada.`, `Ticketed passengers cross directly between the United States and the Tijuana terminal for a per-crossing fee (Ps. ${perUser ? this.n(perUser, 0) : '—'} per user in ${this.qlab(lastQ)}). It is non-aeronautical revenue, not tariff-regulated.`), this.cur.x0, yl, wl, 8.2, 'normal', MUTED) + 8;
      // ---- diagram B: the transaction (two sources on top, GAP below)
      yl = this.heading(this.T('La operación: GAP pasó de socio a dueño del 100% de CBX', 'The deal: GAP went from partner to 100% owner of CBX'), this.cur.x0, yl, 10, wl) + 4;
      const b2 = wl * 0.46, bh2 = 64, xr2 = this.cur.x0 + wl - b2;
      this.box(this.cur.x0, yl, b2, bh2, this.T('AMP + 75% de CBX', 'AMP + 75% of CBX'), this.T(`Asistencia técnica (cobrada a GAP desde 1999) y 75% de CBX, del grupo CMA y Aena; fusionados en GAP por ${newSh ? this.n(newSh) : '—'} acciones nuevas (${dil ? M.fmtFact(dil) : '—'} de dilución)`, `Technical assistance (charged to GAP since 1999) and 75% of CBX, held by the CMA group and Aena; merged into GAP for ${newSh ? this.n(newSh) : '—'} new shares (${dil ? M.fmtFact(dil) : '—'} dilution)`), [232, 236, 240]);
      this.box(xr2, yl, b2, bh2, this.T('25% restante de CBX', 'Remaining 25% of CBX'), this.T(`Comprado por ${cash ? M.fmtFact(cash) : '—'} en efectivo, financiado con los certificados GAP 26 / GAP 26-2 (Ps. 10,718 M, marzo de 2026)`, `Bought for ${cash ? M.fmtFact(cash) : '—'} in cash, funded by the GAP 26 / GAP 26-2 certificados (Ps. 10,718 M, March 2026)`), [232, 236, 240]);
      const gw = wl * 0.5, gx = this.cur.x0 + (wl - gw) / 2, gy = yl + bh2 + 22, gh = 44;
      this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(0.9);
      for (const cx0 of [this.cur.x0 + b2 / 2, xr2 + b2 / 2]) { const ex = cx0 < mid ? gx + gw * 0.25 : gx + gw * 0.75; this.pdf.line(cx0, yl + bh2, cx0, yl + bh2 + 11); this.pdf.line(cx0, yl + bh2 + 11, ex, yl + bh2 + 11); this.pdf.line(ex, yl + bh2 + 11, ex, gy); this.pdf.line(ex, gy, ex - 3, gy - 5); this.pdf.line(ex, gy, ex + 3, gy - 5); }
      this.box(gx, gy, gw, gh, this.T('GAP · 100% de CBX', 'GAP · 100% of CBX'), this.T(`Consolida CBX desde ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'}; la cuota de asistencia técnica desaparece`, `Consolidates CBX from ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'}; the technical-assistance fee ends`), [226, 234, 228]);
      yl = gy + gh + 12;
      const segC = lastQ.seg && lastQ.seg.CBX; const approved = (C.timeline || []).find((e) => /approves|aprueba/i.test((e.en || '') + (e.es || '')));
      const bl = [
        this.T(`Ingresos de CBX en su primer periodo consolidado (${this.qlab(lastQ)}, dos meses): Ps. ${this.m(lastQ.is.revCbx)} M dentro de los no aeronáuticos${segC ? `; EBITDA Ps. ${this.m(segC.ebitda)} M (Exhibit A)` : ''}. ${approved ? `Aprobado por los accionistas el ${this.date(approved.date)}.` : ''}`, `CBX revenue in its first consolidated period (${this.qlab(lastQ)}, two months): Ps. ${this.m(lastQ.is.revCbx)} M within non-aeronautical revenue${segC ? `; EBITDA Ps. ${this.m(segC.ebitda)} M (Exhibit A)` : ''}. ${approved ? `Approved by shareholders on ${this.date(approved.date)}.` : ''}`),
        this.T(`**Dilución 15.1% y acciones +17.8%: las dos cifras son correctas.** Las ${newSh ? this.n(newSh) : '—'} acciones nuevas son ${newSh && post ? this.pct(100 * newSh / post, 1) : '—'} del total ampliado (${post ? this.n(post) : '—'}): la dilución de los accionistas previos. Las mismas acciones son ${newSh && pre ? this.pct(100 * newSh / pre, 1) : '—'} de las ${pre ? this.n(pre) : '—'} previas: el aumento del número de acciones. Al comparar por acción, el ${this.qlab(lastQ)} incluye dos meses de CBX y ningún trimestre anterior lo incluye; la deuda aumentó por el 25% en efectivo.`, `**15.1% dilution and 17.8% more shares: both are right.** The ${newSh ? this.n(newSh) : '—'} new shares are ${newSh && post ? this.pct(100 * newSh / post, 1) : '—'} of the enlarged total (${post ? this.n(post) : '—'}): the dilution of pre-deal holders. The same shares are ${newSh && pre ? this.pct(100 * newSh / pre, 1) : '—'} of the ${pre ? this.n(pre) : '—'} shares before: the increase in the share count. In per-share comparisons, ${this.qlab(lastQ)} includes two months of CBX and no earlier quarter does; debt rose for the 25% paid in cash.`),
      ];
      yl = this.bullets(bl, this.cur.x0, yl, wl, 8, { gap: 3, color: MUTED });
      // ---- right: timeline
      let yr = this.heading(this.T('Cronología', 'Timeline'), xr, y, 10);
      const rows = (C.timeline || []).map((e) => [this.date(e.date), M.L(e)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: null, body: rows, meta: rows.map(() => ['bold left', 'left']), cols: { 0: { cellWidth: 58, halign: 'left' }, 1: { halign: 'left' } }, pad: { top: 2.6, bottom: 2.6, left: 4, right: 4 } }, [8.2, 7.8, 7.4, 7], this.cur.y1 - 60);
      this.noteAbove(this.T('Fuentes: ', 'Sources: ') + (M.LS(C.sources) || []).join(' · '), Math.max(yl, yr) + 6, 6.8);
    }

    // ================= 09 FIBRA GAP =================
    fibraPage() {
      const M = this.M, F = M.REF.fibra || {};
      const placedTag = F.placed ? '' : this.T(' (aún no colocada)', ' (Not Yet Placed)');
      const asOf = this.date(F.placed ? F.placedDate : F.statusAsOf);
      let y = this.page('L', this.secTitle('fibra', this.T('FIBRA GAP explicada' + placedTag, 'FIBRA GAP Explained' + placedTag)), this.T(`Fibra E constituida por GAP para cofinanciar el Programa Maestro de Desarrollo · estatus al ${asOf} (comunicados de GAP, sitio de inversionistas y eventos relevantes de la BMV)`, `Fibra E set up by GAP to co-fund the Master Development Program · status as of ${asOf} (GAP releases, investor site and BMV material events)`));
      const gap = 24, wl = this.width() * 0.38, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const rows = [[this.T('Vehículo', 'Vehicle'), F.name], [this.T('Clave', 'Ticker'), F.ticker], [this.T('Bolsa', 'Exchange'), F.exchange], [this.T('Monto objetivo', 'Target size'), 'Ps. ' + this.n(F.targetMxnM) + ' M'], ['CBFEs', this.n(F.certificates) + ' × Ps. ' + this.n(F.priceMxn)], [this.T('Participación en cada concesionaria mexicana', 'Stake in each Mexican concessionaire'), this.pct(F.stakePct)], [this.T('Uso de recursos', 'Use of proceeds'), M.mdpUseText()]];
      let yl = this.heading(this.T('Ficha', 'Fact sheet'), this.cur.x0, y, 10.5);
      yl = this.table({ y: yl, w: wl, head: null, body: rows.map((r) => [r[0], r[1] || '—']), meta: rows.map(() => ['left muted', 'left bold']), size: 9.2, cols: { 0: { cellWidth: wl * 0.42, halign: 'left' }, 1: { halign: 'left' } }, pad: { top: 4, bottom: 4, left: 4, right: 4 } });
      const b = [
        this.T('Qué es una Fibra E: fideicomiso de inversión en energía e infraestructura listado en bolsa, fiscalmente transparente, que emite certificados bursátiles fiduciarios (CBFEs) y cuyo activo son participaciones en sociedades que operan infraestructura con flujos estables; diseñado para que las Afores y otros institucionales financien infraestructura con ingresos regulados. Distribuye la mayor parte del flujo que recibe como dividendos.', 'What a Fibra E is: a listed, tax-transparent energy-and-infrastructure investment trust that issues trust certificates (CBFEs) and whose assets are stakes in companies operating infrastructure with stable cash flows; designed so that Afores and other institutions fund regulated-revenue infrastructure. It distributes most of the cash it receives as dividends.'),
        this.T(`Estructura: fideicomiso irrevocable que suscribe ~${this.pct(F.stakePct)} del capital de cada una de las 12 concesionarias mexicanas (no de Jamaica ni de CBX). GAP sigue controlando y operando los aeropuertos; la Fibra recibe su parte proporcional de los dividendos de las concesionarias. Primera emisión: ${this.n(F.certificates / 1e6, 2)} M de CBFEs a Ps. ${this.n(F.priceMxn)} (≈ Ps. ${this.n(F.targetMxnM)} M), clave ${F.ticker} en BIVA; BBVA y Santander colocadores, Actinver fiduciario (términos reportados por la prensa; la emisión no se ha colocado).`, `Structure: an irrevocable trust subscribing ~${this.pct(F.stakePct)} of the equity of each of the 12 Mexican concessionaires (not Jamaica nor CBX). GAP keeps controlling and operating the airports; the trust receives its proportional share of the concessionaires' dividends. First issue: ${this.n(F.certificates / 1e6, 2)} M CBFEs at Ps. ${this.n(F.priceMxn)} (≈ Ps. ${this.n(F.targetMxnM)} M), ticker ${F.ticker} on BIVA; BBVA and Santander as underwriters, Actinver as trustee (terms as reported by the press; the issue has not been placed).`),
        this.T(`Para qué sirve: los recursos complementan el ${M.mdpUseText().split(' (')[0]} sin emitir deuda a nivel GAP ni diluir a los accionistas de la controladora. En los estados consolidados la participación de la Fibra aparece como participación no controladora: el EBITDA consolidado no cambia, pero ~${this.pct(F.stakePct)} de la utilidad de las concesionarias mexicanas pasa a los tenedores de CBFEs. Puede repetirse con emisiones subsecuentes conforme avance el capex.`, `Purpose: the proceeds top up the ${M.mdpUseText().split(' (')[0]} without issuing debt at GAP level or diluting the parent's shareholders. In the consolidated statements the trust's stake appears as non-controlling interest: consolidated EBITDA is unchanged, but ~${this.pct(F.stakePct)} of the Mexican concessionaires' profit goes to CBFE holders. It can be repeated with subsequent issues as capex progresses.`),
      ];
      let yr = this.heading(this.T('Qué es, cómo se estructura y qué implica', 'What it is, how it is structured and what it implies'), xr, y, 10.5);
      yr = this.bullets(b, xr, yr, wr, 8.8, { gap: 4 });
      const kindL = { filing: this.T('comunicado', 'filing'), press: this.T('prensa', 'press'), check: this.T('revisión FNAM', 'FNAM check') };
      const lastPress = (F.timeline || []).filter((e) => e.kind === 'press').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const headline = F.placed ? this.T(`Colocada el ${this.date(F.placedDate)}.`, `Placed on ${this.date(F.placedDate)}.`) : this.T(`Aún no colocada al ${this.date(F.statusAsOf)}: sin aviso de precio ni de cierre en los comunicados de GAP ni en los eventos relevantes de la BMV${lastPress ? `; último reporte de prensa (${this.date(lastPress.date)}): ${lastPress.es}` : ''}`, `Not yet placed as of ${this.date(F.statusAsOf)}: no pricing or completion notice in GAP's releases or the BMV material events${lastPress ? `; latest press report (${this.date(lastPress.date)}): ${lastPress.en}` : ''}`);
      const tl = (F.timeline || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      const items = tl.map((e) => `**${this.date(e.date)}** · ${this.es ? e.es : e.en}${kindL[e.kind] ? ` (${kindL[e.kind]})` : ''}`);
      let ys = this.heading(this.T('Estatus', 'Status'), this.cur.x0, Math.max(yl, yr) + 4, 10.5);
      ys = this.text(headline, this.cur.x0, ys, this.width(), 9, 'bold');
      const nCols = items.length > 4 ? 3 : 2, per = Math.ceil(items.length / nCols), wc = (this.width() - gap * (nCols - 1)) / nCols;
      let yStatus = ys;
      for (let c = 0; c < nCols; c++) yStatus = Math.max(yStatus, this.bullets(items.slice(c * per, (c + 1) * per), this.cur.x0 + c * (wc + gap), ys + 1, wc, 7.6, { gap: 2 }));
      const srcStr = this.T('Fuentes: ', 'Sources: ') + (M.LS(F.sources) || []).join(' · ');
      const srcH = this.measureText(srcStr, this.width(), 6.8, 1.25);
      const top = yStatus + 8, availH = this.cur.y1 - top - srcH - 10; let yEnd = top;
      if (availH > 85) {
        const dy = this.heading(this.T('Estructura: quién es dueño de qué y hacia dónde fluye el dinero', 'Structure: who owns what and where the money flows'), this.cur.x0, top, 10.5);
        const W = this.width(), bh = 52, y0 = dy + 8, bw = W * 0.175, pad = (W - 4 * bw) / 3;
        const boxes = [
          [this.T('Accionistas de GAP', 'GAP shareholders'), this.T('BMV: GAP · NYSE: PAC', 'BMV: GAP · NYSE: PAC')],
          [this.T('GAP (controladora)', 'GAP (parent)'), this.T('controla y opera los 14 aeropuertos', 'controls and operates the 14 airports')],
          [this.T('12 concesionarias mexicanas', '12 Mexican concessionaires'), this.T(`~${this.pct(100 - F.stakePct)} GAP · ~${this.pct(F.stakePct)} FIBRA GAP`, `~${this.pct(100 - F.stakePct)} GAP · ~${this.pct(F.stakePct)} FIBRA GAP`)],
          [this.T('FIBRA GAP (Fibra E)', 'FIBRA GAP (Fibra E)'), this.T(`CBFEs ${F.ticker} en BIVA · tenedores: Afores e institucionales`, `${F.ticker} CBFEs on BIVA · holders: Afores and institutions`)],
        ];
        boxes.forEach((bx, i) => { const x = this.cur.x0 + i * (bw + pad); this.pdf.setFillColor(...(i === 3 ? [232, 226, 204] : HEAD)); this.pdf.setDrawColor(...GRID); this.pdf.roundedRect(x, y0, bw, bh, 4, 4, 'FD'); this.font('bold', 9, ACCENT); const tl2 = this.pdf.splitTextToSize(tx(bx[0]), bw - 10); this.pdf.text(tl2, x + 5, y0 + 13); this.font('normal', 7.4, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(bx[1]), bw - 10), x + 5, y0 + 13 + tl2.length * 10.5 + 2); });
        const arrow = (x1, x2, yy, label, above) => { this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(0.9); this.pdf.line(x1, yy, x2, yy); const dir = x2 > x1 ? 1 : -1; this.pdf.line(x2, yy, x2 - dir * 5, yy - 3); this.pdf.line(x2, yy, x2 - dir * 5, yy + 3); this.font('normal', 7.2, ACCENT); const ls = this.pdf.splitTextToSize(tx(label), Math.abs(x2 - x1) - 8); this.pdf.text(ls, (x1 + x2) / 2, yy + (above ? -5 - (ls.length - 1) * 8 : 10), { align: 'center' }); };
        const cx = (i) => this.cur.x0 + i * (bw + pad); const mid = y0 + bh / 2;
        arrow(cx(0) + bw + 2, cx(1) - 2, mid - 8, this.T('capital', 'equity'), true); arrow(cx(1) - 2, cx(0) + bw + 2, mid + 8, this.T('dividendos', 'dividends'), false);
        arrow(cx(1) + bw + 2, cx(2) - 2, mid - 8, this.T(`~${this.pct(100 - F.stakePct)} del capital`, `~${this.pct(100 - F.stakePct)} of equity`), true); arrow(cx(2) - 2, cx(1) + bw + 2, mid + 8, this.T('dividendos', 'dividends'), false);
        arrow(cx(3) - 2, cx(2) + bw + 2, mid - 8, this.T(`~${this.pct(F.stakePct)} del capital: Ps. ${this.n(F.targetMxnM)} M`, `~${this.pct(F.stakePct)} of equity: Ps. ${this.n(F.targetMxnM)} M`), true); arrow(cx(2) + bw + 2, cx(3) - 2, mid + 8, this.T(`dividendos (~${this.pct(F.stakePct)})`, `dividends (~${this.pct(F.stakePct)})`), false);
        yEnd = y0 + bh + (availH > 110 ? 22 : 12);
        if (availH > 150) {
          const yy2 = y0 + bh + 34; this.font('normal', 8.2, MUTED);
          const capLines = this.pdf.splitTextToSize(tx(this.T(`Los recursos que la Fibra aporta a las concesionarias financian el ${M.mdpUseText()}. En los estados consolidados de GAP la participación de la Fibra es participación no controladora: el EBITDA no cambia, ~${this.pct(F.stakePct)} de la utilidad de las concesionarias mexicanas pasa a los tenedores de CBFEs.`, `The cash the trust puts into the concessionaires funds the ${M.mdpUseText()}. In GAP's consolidated statements the trust's stake is non-controlling interest: EBITDA is unchanged, ~${this.pct(F.stakePct)} of the Mexican concessionaires' profit goes to CBFE holders.`)), W); this.pdf.text(capLines, this.cur.x0, yy2); yEnd = yy2 + capLines.length * 8.2 * 1.15;
        }
      }
      this.noteAbove(srcStr, Math.max(yEnd + 8, this.cur.y1 - srcH - 4), 6.8);
    }

    // ================= 10 RELATIVE VALUATION (two pages in the shared engine) =================
    relativePages() {
      const M = this.M, PE = M.PEERS, own = M.peersOwnRow(); if (!own) return;
      const sec = this.pageSectionMeta().relative || {}; const title = (tail) => `${sec.label ? sec.label + ' · ' : ''}${sec.title || this.T('Valuación relativa', 'Relative valuation')} · ${tail}`;
      const note = this.richTextOf('peersNote').replace('de la tabla izquierda', 'de la ficha técnica').replace('in the left-hand table', 'on the tear sheet');
      this.peersPage({ P: PE, own, ownPf: null, title: title(this.T('pares: múltiplos a futuro, sus promedios y liquidez', 'peers: forward multiples, their averages and liquidity')), lead: this.richTextOf('peersLead'), note });
      this.multiplesHistoryPage({ P: PE, own, title: title(this.T('múltiplos a doce meses, historial semanal', 'forward multiples, weekly history')) });
    }

    // ================= 11 SOURCES AND METHODOLOGY =================
    sourcesPage() {
      const M = this.M;
      let y = this.page('L', this.secTitle('method', this.T('Fuentes y metodología', 'Sources and Methodology')), this.T('Todo el contenido proviene de información pública; cada bloque de datos se actualiza automáticamente con la cadencia indicada', 'All content comes from public information; each data block refreshes automatically at the cadence shown'));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const d = (iso) => this.date((iso || '').slice(0, 10));
      const rows = [
        [this.T('Estados financieros trimestrales, acumulados y anuales (con las columnas comparativas reexpresadas y el Exhibit A)', 'Quarterly, YTD and annual statements (with the restated comparative columns and Exhibit A)'), this.T('días 6, 12, 18 y 24 de cada mes', '6th, 12th, 18th, 24th monthly'), this.T('informes de GAP (GlobeNewswire / 6-K) convertidos en tablas y validados', 'GAP reports (GlobeNewswire / 6-K) parsed into tables and validated'), d(M.FIN.generatedAt)],
        [this.T('Tráfico mensual por aeropuerto (con las columnas comparativas y acumuladas de cada reporte)', 'Monthly traffic by airport (with each report\'s comparative and year-to-date columns)'), this.T('misma corrida', 'same run'), this.T('reporte mensual de tráfico de GAP', 'GAP monthly traffic report'), d(M.TR.generatedAt)],
        [this.T('Guía de la administración', 'Management guidance'), this.T('misma corrida', 'same run'), this.T('tabla de guía en los comunicados', 'guidance table in the releases'), d(M.GD.generatedAt)],
        [this.T('Comentarios del estado de resultados (trimestre, año y doce meses móviles)', 'Income-statement comments (quarter, year and rolling twelve months)'), this.T('por trimestre', 'per quarter'), this.T('informes y transcripciones de conferencias (revisados)', 'reports and earnings-call transcripts (reviewed)'), d(M.CM.updatedAt)],
        [this.T('Resumen ejecutivo', 'Executive summary'), this.T('con cada reporte', 'with each report'), this.T('redactado a partir de los datos y comunicados; fechas, precio y rendimiento se rellenan al generar', 'written from the data files and releases; dates, price and yield filled in at build time'), d(M.SUM.updatedAt)],
        [this.T('Precios, tipo de cambio, tasas', 'Prices, FX, yields'), M.marketCadence(Object.keys(M.MK.prices || {})), `${M.priceSources(['GAPB.MX', 'PAC']).factset.length ? 'FactSet Global Prices · ' : ''}Banxico SIE · FRED · Yahoo Finance (IPC)`, d(M.MK.generatedAt)],
        [this.T('Referencia: acciones, concesiones, deuda, dividendos, CBX, FIBRA', 'Reference: shares, concessions, debt, dividends, CBX, FIBRA'), this.T('por evento', 'event-driven'), this.T('comunicados de GAP y eventos relevantes BMV, revisados a mano', 'GAP releases and BMV material events, hand-reviewed'), d(M.REF.updatedAt)],
        [this.T('Tráfico nacional (comparación con México)', 'National traffic (Mexico comparison)'), this.T('diario', 'daily'), this.T('AFAC, estadística operativa de aeropuertos', 'AFAC airport operating statistics'), this.MX ? d(this.MX.generatedAt) : '—'],
      ];
      let yl = this.heading(this.T('Cómo se actualiza cada bloque', 'How each block is refreshed'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [M.t('block'), M.t('cadence'), M.t('mechanism'), M.t('lastUpdate')], body: rows, meta: rows.map(() => ['left', 'left', 'left small', '']), size: 7, cols: { 0: { halign: 'left', cellWidth: wl * 0.34 }, 1: { halign: 'left', cellWidth: wl * 0.17 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.14 } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } });
      const meth = [
        this.T('IFRIC 12: el operador de una concesión registra las obras que construye para el concedente como ingreso y costo por el mismo importe (margen cero). La vista «sin IFRIC 12» resta ese ingreso y ese costo; el EBITDA no cambia, el margen sí.', 'IFRIC 12: a concession operator books the works it builds for the grantor as revenue and cost for the same amount (zero margin). The "ex-IFRIC 12" view removes that revenue and cost; EBITDA is unchanged, the margin is not.'),
        this.T('Base comparativa: el periodo anterior se toma como lo reexpresa el informe del periodo actual (reclasificaciones, negocios separados en el Exhibit A, cifras por ADS al tipo de cambio actual), de modo que cada variación impresa es la de GAP. Los doce meses móviles reexpresan cada trimestre con el informe del mismo trimestre un año después.', 'Comparison base: the prior period is taken as restated in the current period\'s report (reclassifications, businesses broken out in Exhibit A, per-ADS figures at the current exchange rate), so every change printed is GAP\'s own. The rolling twelve months restate each quarter with the report of the same quarter a year later.'),
        this.T(`${M.t('perShareNote')} P/U sobre la utilidad neta de los últimos doce meses. ${M.t('nmNote')}`, `${M.t('perShareNote')} P/E on last-twelve-month net income. ${M.t('nmNote')}`),
        this.T('Tráfico: las variaciones del último mes y del acumulado son las columnas del propio reporte mensual (comparativo y enero–mes de ambos años); los últimos doce meses suman los doce reportes.', 'Traffic: the latest month\'s and the year-to-date changes are the monthly report\'s own columns (comparative and January-to-month of both years); the last twelve months add the twelve reports.'),
        this.T('Próximos resultados: cuando GAP publica su calendario, la fecha se marca «confirmada»; mientras tanto se supone la mediana del rezago entre el cierre del trimestre y la publicación del mismo trimestre en los tres años anteriores, y se nombra la proyección de FactSet cuando difiere. Próximo reporte de tráfico: el día mediano de los últimos doce reportes.', 'Next results: once GAP publishes its calendar the date is marked "confirmed"; until then it is assumed from the median lag between quarter-end and release for the same quarter in the previous three years, and FactSet\'s projection is named when it differs. Next traffic report: the median day of the last twelve reports.'),
        this.T('Deuda neta = préstamos bancarios + certificados bursátiles − efectivo del balance publicado; los trimestres sin detalle se estiman con los flujos de financiamiento y se señalan como estimación. Rendimiento del dividendo = monto aprobado en la asamblea ÷ último cierre; razón de pago sobre la utilidad por acción del año fiscal anterior a la asamblea.', 'Net debt = bank loans + certificados bursátiles − cash from the published balance sheet; quarters without the breakdown are estimated from financing flows and flagged as estimates. Dividend yield = amount approved at the AGM ÷ latest close; payout on the earnings per share of the fiscal year before the AGM.'),
        this.T(`Mercado: ${M.marketSrcNote(['GAPB.MX', 'PAC', 'ASURB.MX', 'OMAB.MX', '^MXX'])}; precio, sin dividendos reinvertidos; tipo de cambio FIX de Banxico (SIE SF43718), con FRED DEXMXUS como respaldo.`, `Market: ${M.marketSrcNote(['GAPB.MX', 'PAC', 'ASURB.MX', 'OMAB.MX', '^MXX'])}; price only, dividends not reinvested; Banxico FIX exchange rate (SIE SF43718), FRED DEXMXUS as the fallback.`),
      ];
      yl = this.heading(this.T('Metodología', 'Methodology'), this.cur.x0, yl + 6, 10);
      let ms = 7.4; while (ms > 5.8 && this.measureBullets(meth, wl, ms, { gap: 2 }) > this.cur.y1 - yl - 4) ms -= 0.2;
      yl = this.bullets(meth, this.cur.x0, yl, wl, ms, { gap: 2, lh: 1.25 });
      const srcs = [
        [this.T('GAP — informes trimestrales y comunicados', 'GAP — quarterly reports and releases'), this.T('GlobeNewswire / Form 6-K ante la SEC; base de todos los estados financieros, el Exhibit A, el tráfico, la guía, las resoluciones de asambleas (dividendos), las emisiones y las líneas bancarias.', 'GlobeNewswire / Form 6-K to the SEC; the basis of every statement, Exhibit A, traffic figure, guidance, AGM resolutions (dividends), issuances and bank facilities.'), 'globenewswire.com'],
        ['SEC EDGAR — GAP (CIK 1347557)', this.T('Formas 20-F (anuales auditadas) y 6-K.', 'Forms 20-F (audited annual) and 6-K.'), 'sec.gov'],
        [this.T('BMV — eventos relevantes de GAP', 'BMV — GAP material events'), this.T('FIBRA GAP (1558742), certificados bursátiles y CBX (1545742, 1557757), líneas bancarias (1588421), asambleas; revisados hasta la fecha de referencia.', 'FIBRA GAP (1558742), certificados bursátiles and CBX (1545742, 1557757), bank facilities (1588421), shareholder meetings; checked through the reference date.'), 'bmv.com.mx'],
        [this.T('GAP — Relación con inversionistas', 'GAP — Investor relations'), this.T('Reportes trimestrales en PDF, eventos relevantes, asambleas, PMD y tarifas máximas.', 'PDF quarterly reports, material events, shareholder meetings, MDP and maximum tariffs.'), 'aeropuertosgap.com.mx/en/investors'],
        ['FactSet', this.T('Cierres diarios GAPB.MX, PAC, ASURB.MX, OMAB.MX (Global Prices, cada noche); pares, consenso, calendario proyectado; estructura de deuda al 30-jun-2026.', 'Daily closes GAPB.MX, PAC, ASURB.MX, OMAB.MX (Global Prices, nightly); peers, consensus, projected calendar; debt capital structure at 30-Jun-2026.'), 'factset.com'],
        [this.T('Banxico — tipo de cambio FIX y bono M', 'Banxico — FIX exchange rate and M bond'), this.T('USD/MXN diario (SIE SF43718) y bono M 10 años, subasta primaria (SIE SF44071); FRED como respaldo.', 'Daily USD/MXN (SIE SF43718) and the 10-year M bond auction yield (SIE SF44071); FRED as the fallback.'), 'banxico.org.mx/SieAPIRest'],
        ['FRED — Federal Reserve Bank of St. Louis', this.T('Bono del Tesoro a 10 años (DGS10); USD/MXN y bono M a 10 años solo como respaldo.', 'US 10-yr (DGS10); USD/MXN and Mexico 10-yr only as fallbacks.'), 'fred.stlouisfed.org'],
        ['Yahoo Finance', this.T('Índice S&P/BMV IPC (^MXX); cierres de respaldo mientras FactSet no publica la sesión; registro de dividendos ex (solo en el apéndice).', 'S&P/BMV IPC index (^MXX); fallback closes until FactSet posts the session; ex-dividend record (appendix only).'), 'finance.yahoo.com'],
        [this.T('AFAC — Estadística operativa de aeropuertos', 'AFAC — Airport operating statistics'), this.T('Pasajeros por aeropuerto y mes de todos los aeropuertos comerciales de México.', 'Passengers by airport and month for every commercial airport in Mexico.'), 'gob.mx/afac'],
        [this.T('Transcripciones de conferencias de resultados', 'Earnings-call transcripts'), this.T('Aportadas por la autora del modelo (Bloomberg); base de los comentarios.', 'Supplied by the model\'s author (Bloomberg); basis of the comments.'), '—'],
      ];
      let yr = this.heading(this.T('Fuentes', 'Sources'), xr, y, 10);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Fuente', 'Source'), this.T('Qué aporta', 'What it provides'), 'URL'], body: srcs, meta: srcs.map(() => ['bold left', 'left small', 'left small']), size: 7.4, cols: { 0: { halign: 'left', cellWidth: wr * 0.28 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wr * 0.24 } } });
      yr = this.text(this.T(`Este documento se generó automáticamente el ${this.longDate(this.todayDate)} desde fnam.mx/gap con los datos vigentes en ese momento; las cifras de mercado son del último cierre disponible y el resto de la información de los últimos informes publicados por GAP. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.todayDate)} from fnam.mx/gap with the data current at that moment; market figures are from the latest available close and everything else from GAP's latest published reports. It is not investment advice.`), xr, yr + 10, wr, 8, 'normal', MUTED);
      this.font('bold', 9, ACCENT); this.pdf.text(tx(this.confidential()), xr, yr + 14);
    }

    // ================= APPENDIX A =================
    appendixGuidance() {
      const M = this.M; if (!M.GV.length) return;
      let y = this.page('L', this.secTitle('appendix', this.T('Todas las guías emitidas', 'Every Guidance Issued')), this.T('Historial completo de la guía de GAP, más reciente primero · rangos como los publica GAP', 'GAP\'s full guidance history, latest first · ranges as GAP publishes them'));
      const ar = [], am = [];
      for (const v of M.GV.slice().reverse()) { const qq = v.quarter ? (M.qById[v.quarter] || { fy: +v.quarter.slice(0, 4), q: +v.quarter.slice(5) }) : null; ar.push([`${this.date(v.date)}${qq ? ` (${this.T('con resultados', 'with')} ${this.qlab(qq)})` : ` (${M.t('standalone')})`}`, `FY${v.fy}`, v.kind === 'revised' ? M.t('revised') : M.t('initial'), ...M.GM.map((m) => this.gr(m, v.items[m.k]))]); am.push(['left', '', v.kind === 'revised' ? 'bold' : '', ...M.GM.map(() => '')]); }
      const W = this.width(), vw = (W - W * 0.33) / M.GM.length; const vc = { 0: { halign: 'left', cellWidth: W * 0.2 }, 1: { cellWidth: W * 0.06 }, 2: { cellWidth: W * 0.07 } }; M.GM.forEach((m, i) => { vc[i + 3] = { cellWidth: vw }; });
      const ng = (M.REF.noGuidance || []).map((x) => `FY${x.fy}: ${M.L(x.note)}`).join(' ');
      const vnote = this.T(`Fuente: tablas de guía en los comunicados de resultados de GAP (GlobeNewswire / Form 6-K). Rangos como los publica GAP: crecimiento % vs el año anterior, margen EBITDA en nivel (sin IFRIC 12), capex en Ps. millones. ${ng}`, `Source: guidance tables in GAP's results releases (GlobeNewswire / Form 6-K). Ranges as GAP publishes them: % growth vs prior year, EBITDA margin as a level (ex-IFRIC 12), capex in Ps. million. ${ng}`);
      const vh = this.measureText(vnote, W, 7.5, 1.25);
      y = this.fitTable({ y, head: [M.t('date'), M.t('year'), M.t('type'), ...M.GM.map((m) => M.L(m))], body: ar, meta: am, cols: vc, pad: { top: 2.6, bottom: 2.6, left: 3, right: 3 } }, [9, 8.6, 8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - vh - 8);
      // guidance midpoint vs actual for the closed years: traffic and EBITDA growth
      const fys = [...new Set(M.GV.map((v) => v.fy))].sort().filter((yv) => { const a = M.gActual(yv); return a && a.kind === 'fy'; });
      const finalOf = (yv) => M.GV.filter((v) => v.fy === yv).pop(); const GMk = (k) => M.GM.find((m) => m.k === k);
      const remH = this.cur.y1 - y - vh - 40;
      if (fys.length && remH > 110) {
        const h = Math.min(remH - 20, 190);
        y = this.heading(this.T('Punto medio de la última guía frente al real, años cerrados: crecimiento del tráfico y del EBITDA (%)', 'Final guidance midpoint against actual, closed years: passenger traffic and EBITDA growth (%)'), this.cur.x0, y + 10, 10);
        const mid = (yv, k) => M.gMid(GMk(k), finalOf(yv).items[k]), act = (yv, k) => M.gActual(yv).v[k];
        const img = this.chart({ type: 'bar', data: { labels: fys.map((yv) => 'FY' + yv), datasets: [
          { label: this.T('Tráfico · guía (punto medio)', 'Traffic · guidance (midpoint)'), data: fys.map((yv) => mid(yv, 'traffic')), backgroundColor: '#c9c6bd', maxBarThickness: 26 },
          { label: this.T('Tráfico · real', 'Traffic · actual'), data: fys.map((yv) => act(yv, 'traffic')), backgroundColor: PALETTE[0], maxBarThickness: 26 },
          { label: gl(this.T('EBITDA · guía (punto medio)', 'EBITDA · guidance (midpoint)')), data: fys.map((yv) => mid(yv, 'ebitda')), backgroundColor: '#e3d3a3', maxBarThickness: 26 },
          { label: gl(this.T('EBITDA · real', 'EBITDA · actual')), data: fys.map((yv) => act(yv, 'ebitda')), backgroundColor: PALETTE[1], maxBarThickness: 26 }] },
          options: { scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
        y = this.image(img, this.cur.x0, y, W, h) + 4;
      }
      this.noteAbove(vnote, y + 4);
    }
    appendixDividends() {
      const M = this.M, divs = (M.MK.dividends && M.MK.dividends['GAPB.MX'] && M.MK.dividends['GAPB.MX'].points) || [];
      const byYear = {}; for (const [d, v] of divs) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + v;
      const lastYear = Math.max(...Object.keys(byYear).map(Number)); const years = []; for (let yv = 2015; yv <= lastYear; yv++) { years.push(String(yv)); byYear[yv] ??= 0; }
      let y = this.page('L', this.secTitle('appendix', this.T('Dividendos por año de pago y flujo de efectivo de diez años', 'Dividends by Payment Year and Ten Years of Cash Flow')), this.T('Efectivo por acción registrado en bolsa por año de pago (incluye reembolsos de capital) · flujo operativo, capex, flujo libre y distribuciones según los estados de flujos anuales de GAP', 'Exchange-recorded cash per share by payment year (capital reductions included) · operating cash flow, capex, free cash flow and distributions per GAP\'s annual cash-flow statements'));
      const gap = 24, wl = this.width() * 0.42, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T('Efectivo por acción por año de pago (Ps.)', 'Cash per share by payment year (Ps.)'), this.cur.x0, y, 10, wl);
      const h = 150;
      const img = this.chart({ type: 'bar', data: { labels: years, datasets: [{ label: this.T('Por acción (registro de bolsa)', 'Per share (exchange record)'), data: years.map((yv) => byYear[yv]), backgroundColor: PALETTE[0], maxBarThickness: 30 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
      yl = this.image(img, this.cur.x0, yl, wl, h) + 4;
      const rows = years.map((yv) => { const pEnd = M.pointAtOrBefore(M.gapPx, `${yv}-12-31`); return [yv, this.n(byYear[yv], 2), pEnd && byYear[yv] ? this.pct(100 * byYear[yv] / pEnd[1]) : '—']; });
      let yr = this.table({ y, x: xr, w: wr, head: [M.t('year'), this.T('Ps. por acción (registro de bolsa)', 'Ps. per share (exchange record)'), this.T('Rendimiento sobre el cierre del año', 'Yield on the year-end close')], body: rows, meta: rows.map(() => ['left', 'bold', '']), size: 7.6, cols: { 0: { halign: 'left' } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } });
      yr = this.note(this.T(`Registro de bolsa: fechas ex y efectivo por acción (${M.MK.dividends['GAPB.MX'].source}); agrupa por año de pago, por lo que no coincide con el año de la asamblea (p. ej., el dividendo aprobado en 2025 se pagó en dos exhibiciones de 2025). La conciliación con lo aprobado y lo pagado según el flujo de efectivo está en la sección 07.`, `Exchange record: ex-dates and cash per share (${M.MK.dividends['GAPB.MX'].source}); grouped by payment year, so it does not match the AGM year (e.g. the dividend approved in 2025 was paid in two 2025 installments). The reconciliation to the approved amounts and the cash-flow statements is in section 07.`), yr + 3, 7, xr, wr);
      const fys = M.Y.filter((fy) => fy.cf && fy.cf.cfo != null).slice(-10);
      const z = (v) => (v || 0) + 0;
      const cf = fys.map((fy) => { const c = fy.cf; const cfo = c.cfo / 1000, capex = z(-(c.capex || 0) / 1000), div = z(-(c.dividendsPaid || 0) / 1000), cr = z(-(c.capitalReduction || 0) / 1000), buy = z(-(c.buybacks || 0) / 1000), pay = z(-((c.bondsPaid || 0) + (c.loansPaid || 0)) / 1000), chg = c.netChangeCash != null ? c.netChangeCash / 1000 : null; return { fy: fy.fy, cfo, capex, fcf: cfo - capex, pay, div, cr, buy, chg }; });
      const cfRows = cf.map((r) => ['FY' + r.fy, this.n(r.cfo), this.n(-r.capex), this.n(r.fcf), this.n(r.pay), this.n(r.div), this.n(r.cr), this.n(r.buy), r.chg == null ? '—' : this.n(r.chg), r.fcf ? this.pct(z(100 * (r.div + r.cr + r.buy) / r.fcf), 0) : '—']);
      const cfMeta = cf.map((r) => ['left', '', 'neg', 'bold', '', '', 'muted', '', this.cls(r.chg), r.div + r.cr + r.buy > r.fcf ? 'neg' : '']);
      const yb = Math.max(yl, yr) + 10;
      let y2 = this.heading(this.T(`Flujo operativo, capex, flujo libre y distribuciones · últimos ${cf.length} años fiscales (Ps. millones)`, `Operating cash flow, capex, free cash flow and distributions · last ${cf.length} fiscal years (Ps. million)`), this.cur.x0, yb, 10);
      const W = this.width();
      const cfNote = this.T('Estado de flujos de efectivo anual de GAP (informe del 4T de cada año): flujo operativo después de impuestos; capex = adquisiciones de mejoras a bienes concesionados y activos fijos; FCF = flujo operativo − capex; pago de deuda = certificados bursátiles y préstamos bancarios amortizados en el año (bruto, sin restar emisiones). Reembolsos de capital: usados en lugar de dividendos en 2021 y 2024. Variación neta de efectivo = aumento (disminución) del efectivo en el año según el estado de flujos, incluidas emisiones de deuda, adquisiciones y efecto cambiario. Distribuciones = dividendos + reembolsos + recompras.', 'GAP annual cash-flow statement (4Q report of each year): operating cash flow after taxes; capex = additions to concession improvements and fixed assets; FCF = operating cash flow − capex; debt paydown = certificados bursátiles and bank loans repaid in the year (gross, before new issuance). Capital reductions were used instead of dividends in 2021 and 2024. Net change in cash = increase (decrease) in cash for the year per the cash-flow statement, including debt issuance, acquisitions and the FX effect. Distributions = dividends + capital reductions + buybacks.');
      const cfH = this.measureText(cfNote, W, 7.2, 1.25);
      y2 = this.fitTable({ y: y2, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Flujo operativo', 'Operating cash flow'), this.T('Capex', 'Capital expenditures'), this.T('Flujo libre (FCF)', 'Free cash flow (FCF)'), this.T('Pago de deuda', 'Debt paydown'), this.T('Dividendos pagados', 'Dividends paid'), this.T('Reembolsos de capital', 'Capital reductions'), this.T('Recompras', 'Share buybacks'), this.T('Variación neta de efectivo', 'Net change in cash'), this.T('Distribuciones / FCF', 'Distributions / FCF')], body: cfRows, meta: cfMeta, cols: { 0: { halign: 'left', cellWidth: W * 0.1 } }, pad: { top: 2, bottom: 2, left: 4, right: 4 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - cfH - 6);
      this.noteAbove(cfNote, y2 + 4, 7.2);
    }
  }

  window.GAP_PRESENT = { build };
  P.autoRun(build);
})();
