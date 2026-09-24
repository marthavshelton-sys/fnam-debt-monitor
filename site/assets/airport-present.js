/* Board presentation for the airport pages built on the shared engine (ASUR, OMA): one click builds a Letter PDF
   from the same data the page renders. Every figure comes from window.<PREFIX>_MODEL (airport-model.js), i.e. the
   calculations already on screen; section prose for 09 and 10 is read from the page itself (the same paragraphs the
   reader sees), trimmed to bullets. The generic engine (pages, tables, charts, cover, footers) lives in
   /assets/present-core.js. Language follows the page toggle. */
(function () {
  'use strict';
  const MX_TRAFFIC = '/aeropuertos/data/traffic.js';               // national series (AFAC) for the company-vs-Mexico chart
  const P = window.FNAM_PRESENT;
  const { tx } = P;
  const { INK, MUTED, ACCENT, GRID, HEAD, PALETTE } = P.C;
  const CFG = window.MODEL_CFG;
  const PREFIX = CFG.prefix;

  async function build() {
    const M = window[PREFIX + '_MODEL'];
    await P.run(M, window.MX_AIRPORTS ? [] : [MX_TRAFFIC], async () => {
      const doc = new AirportDoc(M);
      doc.cover(); doc.execSummary(); doc.tearSheet(); doc.opsPage(); doc.incomePage('q'); doc.incomePage('ltm'); doc.incomePage('fy');
      doc.guidancePage(); doc.trafficTables(); doc.trafficCharts(); doc.debtPage(); doc.dividendPage(); doc.eventPage(); doc.explainerPage(); doc.sourcesPage();
      doc.finish();
    });
  }

  class AirportDoc extends P.Doc {
    constructor(M) {
      const co = M.REF.company || {}, tk = co.tickers || {};
      const tickerLine = [tk.bmv ? `BMV: ${String(tk.bmv).split(' ')[0]}` : null, tk.nyse ? `NYSE: ${String(tk.nyse).split(' ')[0]}` : null, tk.nasdaq ? `Nasdaq: ${String(tk.nasdaq).split(' ')[0]}` : null].filter(Boolean).join('  ·  ');
      const short = co.short || CFG.short;
      super(M, { slug: CFG.slug, short, name: co.name || short, tickerLine, url: `fnam.mx/${CFG.slug}`, fileStem: `${short}_${(tk.nyse || tk.nasdaq || short).split(' ')[0]}`, publicSources: 'BMV, SEC, comunicados de la empresa', publicSourcesEn: 'BMV, SEC, company releases' });
      this.MX = window.MX_AIRPORTS || null;
      this.next = this.nextResults();
      this.ebitdaL = M.L(CFG.ebitdaLabel || { es: 'EBITDA', en: 'EBITDA' });
      this.marginL = M.L(CFG.marginLabel || { es: 'Margen EBITDA (sin IFRIC 12)', en: 'EBITDA margin (ex-IFRIC 12)' });
    }
    // ----- shared pieces -----
    rel(q) { return q && q.sources && q.sources.is && q.sources.is.date; }
    lastM() { const ms = this.M.TR.months; return ms[ms.length - 1]; }
    // Section title as printed on the page (the h2 of #event / #explainer), so the PDF and the page never diverge.
    sectionTitle(id, fallback) { const el = document.querySelector(`#${id} .sec-head h2 .${this.es ? 'es' : 'en'}`); return el ? el.textContent.trim() : fallback; }
    // Section prose from the page: each paragraph becomes a bullet; a leading <b> becomes the bold lead.
    sectionProse(id) {
      return [...document.querySelectorAll(`#${id} .prose > p`)].map((p) => { const span = p.querySelector(`.${this.es ? 'es' : 'en'}`); if (!span) return null; let out = ''; for (const n of span.childNodes) { const t = (n.textContent || '').replace(/\s+/g, ' '); out += n.nodeType === 1 && n.tagName === 'B' ? `**${t.trim()}** ` : t; } return out.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    }
    // Next monthly traffic report: the month after the latest one, on the company's usual day (median of the last twelve releases).
    nextTraffic() {
      const ms = this.M.TR.months; if (!ms.length) return null;
      const days = ms.slice(-12).map((m) => (m.source && m.source.date ? +m.source.date.slice(8, 10) : null)).filter(Boolean).sort((a, b) => a - b);
      const day = days.length ? days[Math.floor((days.length - 1) / 2)] : 5;
      const last = ms[ms.length - 1].ym; const y = +last.slice(0, 4), mo = +last.slice(5, 7);
      const rel = new Date(Date.UTC(y, mo - 1 + 2, day));
      return { day, date: rel.toISOString().slice(0, 10), month: rel.toLocaleDateString(this.es ? 'es-MX' : 'en-US', { month: 'long', timeZone: 'UTC' }) };
    }
    basisLine() {
      const M = this.M, lastQ = M.lastQ, lastM = this.lastM();
      return this.T(`Base: resultados del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · tráfico de ${M.ymLabel(lastM.ym)} (${this.date(lastM.source && lastM.source.date)}) · mercado al cierre del ${this.date(M.lastPx[0])}`,
        `Basis: ${this.qlab(lastQ)} results (${this.date(this.rel(lastQ))}) · ${M.ymLabel(lastM.ym)} traffic (${this.date(lastM.source && lastM.source.date)}) · market close ${this.date(M.lastPx[0])}`);
    }
    airportName(code) { const M = this.M; if (code === 'TOTAL') return this.T(`Total ${this.cfg.short}`, `Total ${this.cfg.short}`); const a = M.AIR.find((x) => x.code === code) || {}; return `${code} · ${a[M.LANG] || a.en || code}`; }

    // ================= 1. COVER =================
    cover() {
      const M = this.M, lastQ = M.lastQ, lastM = this.lastM();
      super.cover(this.T(`Datos: resultados del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}), tráfico de ${M.ymLabel(lastM.ym)}, mercado al ${this.date(M.lastPx[0])}.`, `Data: ${this.qlab(lastQ)} results (${this.date(this.rel(lastQ))}), ${M.ymLabel(lastM.ym)} traffic, market as of ${this.date(M.lastPx[0])}.`));
    }

    // ================= 2. EXECUTIVE SUMMARY =================
    execSummary() {
      const M = this.M, secs = (M.SUM.sections || []).map((s) => ({ title: M.L(s.title), items: (s[M.LANG] || s.en || []).map((x) => this.autoBold(x)) }));
      super.execSummary(secs, this.basisLine() + (M.SUM.updatedAt ? this.T(` · redactado el ${this.date(M.SUM.updatedAt)}`, ` · written ${this.date(M.SUM.updatedAt)}`) : ''));
    }

    // ================= 3. TEAR SHEET =================
    tearSheet() {
      const M = this.M, lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ), px = M.lastPx, home = M.homePx, meta = M.MK.prices[M.HOME] || {};
      const sub = this.T(`Mercado: cierre del ${this.date(px[0])} (datos obtenidos ${this.stamp(meta.fetchedAt || M.MK.generatedAt)}) · Financieros: ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`, `Market: close of ${this.date(px[0])} (data fetched ${this.stamp(meta.fetchedAt || M.MK.generatedAt)}) · Financials: ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))})`);
      let y = this.page('L', this.T('Ficha técnica', 'Tear Sheet'), sub);
      const colW = this.width() * 0.5 - 10, xr = this.cur.x0 + colW + 20;
      const yAgo = M.pointAtOrBefore(home, M.addDays(px[0], -365)), yStart = M.pointAtOrBefore(home, `${px[0].slice(0, 4)}-01-01`);
      const ipc = M.px('^MXX'), ipcLast = M.lastPoint(ipc), ipcAgo = ipcLast && M.pointAtOrBefore(ipc, M.addDays(ipcLast[0], -365)), ipcStart = ipcLast && M.pointAtOrBefore(ipc, `${ipcLast[0].slice(0, 4)}-01-01`);
      const chg = (a, b) => (a && b ? 100 * (a[1] / b[1] - 1) : null);
      const w52 = home.filter((p) => p[0] >= M.addDays(px[0], -365)); const hi = Math.max(...w52.map((p) => p[1])), lo = Math.min(...w52.map((p) => p[1]));
      const fxP = M.pointAtOrBefore(M.fxPts, px[0]); const fx = fxP ? fxP[1] : null;
      const mc = px[1] * M.sharesNow; const ads = M.lastPoint(M.px(M.ADS)); const ratio = (M.REF.company && M.REF.company.adsRatio) || CFG.adsRatio;
      const divs = ((M.MK.dividends && M.MK.dividends[M.HOME] && M.MK.dividends[M.HOME].points) || []).filter((d) => d[0] > M.addDays(px[0], -365)); const dps12 = divs.reduce((a, d) => a + d[1], 0);
      const ev = mc / 1000 + (nd ? nd.net : 0) + M.nciOf(lastQ);
      const prevQ = M.qById[M.yoyQid(lastQ)], prevL = prevQ ? M.ltmFor(prevQ) : null;
      const g = (a, b) => (a != null && b ? 100 * (a / b - 1) : null);
      const ms = M.TR.months, lastM = this.lastM(); const sum12 = (end) => { const i = ms.findIndex((m) => m.ym === end); return i >= 11 ? ms.slice(i - 11, i + 1).reduce((a, m) => a + m.total.TOTAL, 0) : null; };
      const ltmPax = sum12(lastM.ym), ltmPaxPrev = sum12(`${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const prevM = ms.find((m) => m.ym === `${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const ytd = (ym) => ms.filter((m) => m.ym.slice(0, 4) === ym.slice(0, 4) && m.ym <= ym).reduce((a, m) => a + m.total.TOTAL, 0);
      const ytdNow = ytd(lastM.ym), ytdPrev = prevM ? ytd(prevM.ym) : null;
      const pm = (v) => (v == null ? '' : this.pct(v, 1, true)); const yy = this.T('a/a', 'y/y');
      const rows = [], meta2 = [];
      const H = (s) => { rows.push([s, '']); meta2.push(['head left', 'head']); };
      const R = (l, v, c) => { rows.push([l, v]); meta2.push(['left', c || '']); };
      H(this.T('Mercado', 'Market'));
      R(this.T(`Precio ${CFG.homeLabel}`, `${CFG.homeLabel} share price`), `Ps. ${this.n(px[1], 2)}  ·  ${this.date(px[0])}`);
      if (ads) R(this.T(`ADS ${M.ADS} · 1 ADS = ${ratio} acciones`, `${M.ADS} ADS · 1 ADS = ${ratio} shares`), `US$ ${this.n(ads[1], 2)}  ·  ${this.date(ads[0])}`);
      R(this.T('Capitalización de mercado', 'Market capitalisation'), `Ps. ${this.n(mc / 1e9, 1)} ${this.T('mil M', 'bn')}${fx ? `  ·  US$ ${this.n(mc / fx / 1e9, 1)} ${this.T('mil M', 'bn')}` : ''}`);
      if (fx) R(this.T('Tipo de cambio usado (Fed H.10)', 'FX rate used (Fed H.10)'), `${this.n(fx, 4)} MXN/USD  ·  ${this.date(fxP[0])}`, 'muted');
      R(this.T('Acciones en circulación', 'Shares outstanding'), `${this.n(M.sharesNow)}  ·  ${M.REF.shares ? this.date(M.REF.shares.asOf) : ''}`, 'muted');
      R(this.T(`Variación en el año (${this.cfg.short} B · IPC)`, `Year-to-date change (${this.cfg.short} B · IPC)`), `${pm(chg(px, yStart))}  ·  IPC ${pm(chg(ipcLast, ipcStart))}`, this.cls(chg(px, yStart)));
      R(this.T(`Variación 12 meses (${this.cfg.short} B · IPC)`, `12-month change (${this.cfg.short} B · IPC)`), `${pm(chg(px, yAgo))}  ·  IPC ${pm(chg(ipcLast, ipcAgo))}`, this.cls(chg(px, yAgo)));
      R(this.T('Máximo / mínimo 52 semanas', '52-week high / low'), `Ps. ${this.n(hi, 2)}  /  Ps. ${this.n(lo, 2)}`);
      const agm = (M.REF.dividends || []).slice(-1)[0];
      if (agm) R(this.T(`Dividendo aprobado en asamblea ${agm.agmYear} · rendimiento`, `Dividend approved at the ${agm.agmYear} AGM · yield`), `Ps. ${this.n(agm.dps, 2)} ${this.T('por acción', 'per share')}  ·  ${this.pct(100 * agm.dps / px[1])}`);
      if (dps12) R(this.T('Dividendos pagados últimos 12 meses (bolsa)', 'Dividends paid last 12 months (exchange)'), `Ps. ${this.n(dps12, 2)}  ·  ${this.pct(100 * dps12 / px[1])}`, 'muted');
      H(this.T(`Financieros (${this.qlab(lastQ)} · Ps. millones, sin IFRIC 12)`, `Financials (${this.qlab(lastQ)} · Ps. million, ex-IFRIC 12)`));
      if (L) R(this.T(`${this.ebitdaL} últimos 12 meses · margen`, `${this.ebitdaL} last twelve months · margin`), `Ps. ${this.m(L.is.ebitda)} M  ·  ${this.pct(L.is.ebitdaMarginExIfric)}${prevL ? `  ·  ${pm(g(L.is.ebitda, prevL.is.ebitda))} ${yy}` : ''}`);
      R(this.T(`${this.ebitdaL} ${this.qlab(lastQ)} · margen`, `${this.ebitdaL} ${this.qlab(lastQ)} · margin`), `Ps. ${this.m(lastQ.is.ebitda)} M  ·  ${this.pct(lastQ.is.ebitdaMarginExIfric)}${prevQ ? `  ·  ${pm(g(lastQ.is.ebitda, prevQ.is.ebitda))} ${yy}` : ''}`);
      if (L) R(this.T('Ingresos últimos 12 meses (sin construcción)', 'Revenue last twelve months (ex-construction)'), `Ps. ${this.m(M.exRev(L.is))} M${prevL ? `  ·  ${pm(g(M.exRev(L.is), M.exRev(prevL.is)))} ${yy}` : ''}`);
      if (L) R(this.T('Utilidad neta (participación controladora) últimos 12 meses', 'Net income (controlling interest) last twelve months'), `Ps. ${this.m(M.niCtrl(L.is))} M${prevL ? `  ·  ${pm(g(M.niCtrl(L.is), M.niCtrl(prevL.is)))} ${yy}` : ''}`);
      if (nd) R(this.T(`Deuda neta (${this.date(M.qEndDate(lastQ))})`, `Net debt (${this.date(M.qEndDate(lastQ))})`), `Ps. ${this.m(nd.net)} M  ·  ${this.T('bruta', 'gross')} Ps. ${this.m(nd.gross)} M  ·  ${this.T('efectivo', 'cash')} Ps. ${this.m(nd.cash)} M`);
      if (nd && L) R(this.T(`Deuda neta / ${this.ebitdaL} UDM`, `Net debt / LTM ${this.ebitdaL}`), this.x(nd.net / L.is.ebitda, 2), 'bold');
      if (L) R(this.T(`VE / ${this.ebitdaL} UDM  ·  P/U UDM`, `EV / LTM ${this.ebitdaL}  ·  LTM P/E`), `${this.x(ev / L.is.ebitda)}  ·  ${M.niCtrl(L.is) ? this.x(mc / 1000 / M.niCtrl(L.is)) : '—'}`);
      if (L && L.cf && L.cf.capex != null) R(this.T('Capex últimos 12 meses', 'Capex last twelve months'), `Ps. ${this.m(-L.cf.capex)} M`);
      H(this.T('Operación', 'Operations'));
      if (ltmPax) R(this.T('Pasajeros últimos 12 meses (millones)', 'Passengers last twelve months (million)'), `${this.n(ltmPax / 1000, 1)}${ltmPaxPrev ? `  ·  ${pm(g(ltmPax, ltmPaxPrev))} ${yy}` : ''}`, this.cls(g(ltmPax, ltmPaxPrev)));
      R(this.T(`Pasajeros ${M.ymLabel(lastM.ym)} (millones)`, `Passengers ${M.ymLabel(lastM.ym)} (million)`), `${this.n(lastM.total.TOTAL / 1000, 2)}${prevM ? `  ·  ${pm(g(lastM.total.TOTAL, prevM.total.TOTAL))} ${yy}` : ''}  ·  ${this.T('acum.', 'YTD')} ${pm(g(ytdNow, ytdPrev))}`, this.cls(g(lastM.total.TOTAL, prevM && prevM.total.TOTAL)));
      for (const c of M.CTRY) { const v = lastM.countries && lastM.countries[c.code], p = prevM && prevM.countries && prevM.countries[c.code]; if (v) R(this.T(`  ${M.L(c)} · ${M.ymLabel(lastM.ym)}`, `  ${M.L(c)} · ${M.ymLabel(lastM.ym)}`), `${this.n(v.total / 1000, 2)}${p ? `  ·  ${pm(g(v.total, p.total))} ${yy}` : ''}`, 'muted'); }
      R(this.T('Próximos resultados', 'Next results'), this.nextText().replace(/^[^:]*:\s*/, ''), this.next && this.next.kind === 'confirmed' ? 'bold' : '');
      const noteStr = this.T(`Fuentes: Yahoo Finance (cierres diarios ${M.HOME}, ${M.ADS}, ^MXX; dividendos), FRED DEXMXUS (Fed H.10), informe trimestral de ${this.cfg.short} ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}), reportes mensuales de tráfico. VE = capitalización + deuda neta + participación no controladora. ${M.L(CFG.debtNote)} UDM = últimos doce meses (suma de los cuatro trimestres más recientes).`,
        `Sources: Yahoo Finance (daily closes ${M.HOME}, ${M.ADS}, ^MXX; dividends), FRED DEXMXUS (Fed H.10), ${this.cfg.short} ${this.qlab(lastQ)} quarterly report (${this.date(this.rel(lastQ))}), monthly traffic reports. EV = market cap + net debt + non-controlling interest. ${M.L(CFG.debtNote)} LTM = last twelve months (sum of the four most recent quarters).`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25), limitY = this.cur.y1 - noteH - 10;
      const fy = this.fitTable({ y, w: colW, head: null, body: rows, meta: meta2, cols: { 0: { cellWidth: colW * 0.46, halign: 'left' }, 1: { cellWidth: colW * 0.54 } }, pad: { top: 2.6, bottom: 2.6, left: 4, right: 4 } }, [8.6, 8.3, 8, 7.7, 7.4, 7], limitY);
      const base = M.addDays(px[0], -365);
      const series = [{ id: M.HOME, label: CFG.homeLabel }, { id: '^MXX', label: 'S&P/BMV IPC' }].map((s) => ({ ...s, pts: M.px(s.id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
      const dates = series[0].pts.map((p) => p[0]);
      const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lv = null; return { label: s.label + ` (${this.T('base 100', 'rebased to 100')})`, data: dates.map((d) => { const v = map.get(d); if (v != null) lv = v; return lv != null ? 100 * lv / b : null; }), borderColor: PALETTE[i], backgroundColor: PALETTE[i], borderWidth: i === 0 ? 2.4 : 1.6 }; });
      this.heading(this.T(`${CFG.homeLabel} vs S&P/BMV IPC · últimos 12 meses (base 100, precio sin dividendos)`, `${CFG.homeLabel} vs S&P/BMV IPC · last 12 months (rebased to 100, price only)`), xr, y, 10);
      const img = this.chart({ type: 'line', data: { labels: dates, datasets: ds }, options: { scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (dates[i] ? dates[i].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, 760, 470);
      const cw = this.cur.x1 - xr, chH = cw * 470 / 760;
      this.image(img, xr, y + 18, cw, chH);
      let yy2 = y + 18 + chH + 6;
      const perf = ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return [d.label.replace(/ \(.*\)/, ''), this.pct(last - 100, 1, true)]; });
      yy2 = this.table({ y: yy2, x: xr, w: cw, head: [this.T(`Rendimiento ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`, `Return ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`), this.T('Precio', 'Price')], body: perf, meta: perf.map((r) => ['left', this.cls(parseFloat(r[1].replace(',', '')))]), size: 8.5, cols: { 0: { halign: 'left' } } });
      const rem = limitY - yy2 - 30;
      if (rem > 90) {
        const b3 = M.addDays(px[0], -365 * 3); const w3 = home.filter((p) => p[0] >= b3); const step = Math.max(1, Math.ceil(w3.length / 500)); const pts3 = w3.filter((_, i) => i % step === 0 || i === w3.length - 1);
        yy2 = this.heading(this.T(`Precio ${CFG.homeLabel} (Ps.) · últimos 3 años`, `${CFG.homeLabel} share price (Ps.) · last 3 years`), xr, yy2 + 8, 10);
        const h3 = Math.min(rem - 22, 150);
        const img3 = this.chart({ type: 'line', data: { labels: pts3.map((p) => p[0]), datasets: [{ label: CFG.homeLabel, data: pts3.map((p) => p[1]), borderColor: PALETTE[0], backgroundColor: PALETTE[0] + '22', fill: true, borderWidth: 1.6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (pts3[i] ? pts3[i][0].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(cw * 1.6), Math.round(h3 * 1.6));
        yy2 = this.image(img3, xr, yy2, cw, h3);
      }
      this.noteAbove(noteStr, Math.max(fy, yy2) + 8);
    }

    // ================= 4. OPERATING METRICS (latest quarter y/y) =================
    opsPage() {
      const M = this.M, A = M.lastQ, B = M.qById[M.yoyQid(A)];
      const oa = M.opsFor(A, 'q'), ob = M.opsFor(B, 'q'), C = M.yoyCommentsFor(A, B, 'q'), ops = C && C.ops;
      const la = this.qlab(A), lb = this.qlab(B);
      let y = this.page('P', this.T(`Métricas operativas de ${this.cfg.short} · ${la} vs ${lb}`, `${this.cfg.short} Operating Metrics · ${la} vs ${lb}`), this.nextText());
      const rows = [], meta = [];
      const head = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      const row = (l, k, o = {}) => { const va = oa && oa[k], vb = ob && ob[k]; if (va == null && vb == null) return; const d = va != null && vb != null ? va - vb : null, p = o.pct ? null : (d != null && vb ? 100 * d / Math.abs(vb) : null); const dec = o.dec != null ? o.dec : 1; const f = (v) => (v == null ? '—' : o.pct ? this.pct(v) : this.n(v, dec)); rows.push([l, f(va), f(vb), d == null ? '—' : o.pct ? this.n(d, 1) + ' pp' : this.n(d, dec), o.pct ? '' : this.pct(p, 1, true), ops && ops[o.ck || k] ? M.L(ops[o.ck || k]) : '']); meta.push([(o.cls || '') + ' left', o.cls || '', o.cls || '', this.cls(d) + ' ' + (o.cls || ''), this.cls(p) + ' ' + (o.cls || ''), 'left small']); };
      head(M.t('trafCargo')); row(M.t('domPax'), 'dom', { cls: 'sub' }); row(M.t('intlPax'), 'intl', { cls: 'sub' }); row(M.t('totalPax'), 'total', { cls: 'bold' });
      for (const c of M.CTRY) row(`${this.T('Pasajeros', 'Passengers')} ${M.L(c)}`, 'country_' + c.code, { cls: 'sub' });
      head(`${M.t('unitRev')} (Ps.)`); row(M.t('aeroPerPax'), 'aeroPerPax'); row(M.t('nonAeroPerPax'), 'nonAeroPerPax'); row(M.t('commercialPerPax'), 'commercialPerPax', { cls: 'sub' }); row(M.t('revPerPaxAll'), 'revPerPaxAll', { cls: 'bold' }); if (CFG.costPerPax) row(M.t('costPerPax'), 'costPerPax');
      const extra = (CFG.opsKpi || []).filter((k) => [oa, ob].some((o) => o && o['kpi_' + k.k] != null));
      if (extra.length) { head(M.t('otherOps')); for (const k of extra) row(M.L(k), 'kpi_' + k.k, { dec: k.dec != null ? k.dec : 1, pct: !!k.pct, ck: k.k }); }
      const W = this.width(), cw = { 0: { cellWidth: W * 0.22, halign: 'left' }, 1: { cellWidth: W * 0.095 }, 2: { cellWidth: W * 0.095 }, 3: { cellWidth: W * 0.085 }, 4: { cellWidth: W * 0.075 }, 5: { cellWidth: W * 0.43, halign: 'left' } };
      const cap = `${M.L(CFG.opsCap)} ${this.T('Ingresos unitarios = ingresos del estado de resultados ÷ pasajeros del periodo.', 'Unit revenues = income-statement revenue ÷ passengers in the period.')} ${M.L(CFG.opsNote || { es: '', en: '' })} ${(CFG.opsKpi || []).length ? M.L(CFG.opsKpiNote || { es: '', en: '' }) : ''} ${this.T(`Fuentes: informe trimestral ${la} (${this.date(this.rel(A))})`, `Sources: ${la} quarterly report (${this.date(this.rel(A))})`)}${C && C.call ? ' · ' + M.L(C.call) : ''} · ${this.T('reportes mensuales de tráfico', 'monthly traffic reports')}.`.replace(/\s+/g, ' ');
      const noteH = this.measureText(cap, W, 7.5, 1.25);
      y = this.fitTable({ y, head: [M.t('metric'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral y conferencia)', 'Comments (quarterly report and earnings call)')], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)) }, [8.6, 8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - noteH - 150);
      const qs = M.Q.slice(-8); const pax = (q) => { const o = M.opsFor(q, 'q'); return o && o.total ? o.total : null; };
      const yoy = (q) => { const p = M.qById[M.yoyQid(q)]; const a = pax(q), b = p && pax(p); return a && b ? 100 * (a / b - 1) : null; };
      const remaining = this.cur.y1 - noteH - y - 34;
      if (remaining > 110) {
        const h = Math.min(remaining - 26, 200);
        y = this.heading(this.T('Pasajeros terminales por trimestre (millones) y variación a/a', 'Terminal passengers by quarter (million) and YoY change'), this.cur.x0, y + 10, 10);
        const img = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [{ type: 'line', label: this.T('Variación a/a, % (eje der.)', 'YoY change, % (right axis)'), data: qs.map(yoy), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0 }, { type: 'bar', label: this.T('Pasajeros (millones, eje izq.)', 'Passengers (million, left axis)'), data: qs.map((q) => { const v = pax(q); return v ? v / 1000 : null; }), backgroundColor: PALETTE[0], yAxisID: 'y', maxBarThickness: 40, order: 1 }] }, options: { scales: { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => this.n(v, 0) + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
        y = this.image(img, this.cur.x0, y, W, h) + 4;
      }
      this.noteAbove(cap, y + 6);
    }

    // ================= 5–7. INCOME STATEMENT (quarter, LTM, fiscal year) =================
    incomePage(mode) {
      const M = this.M; let A, B, C, la, lb, cmtNote = '';
      if (mode === 'q') { A = M.lastQ; B = M.qById[M.yoyQid(A)]; C = M.yoyCommentsFor(A, B, 'q'); la = this.qlab(A); lb = this.qlab(B); }
      else if (mode === 'fy') { A = M.Y[M.Y.length - 1]; B = M.Y[M.Y.length - 2]; C = M.yoyCommentsFor(A, B, 'fy'); la = 'FY' + A.fy; lb = 'FY' + B.fy; }
      else { A = M.ltmFor(M.lastQ); const bq = M.qById[M.yoyQid(M.lastQ)]; B = bq && M.ltmFor(bq); C = M.yoyCommentsFor(M.lastQ, bq, 'q'); la = A.id; lb = B ? B.id : '—'; cmtNote = this.T(` · Los comentarios corresponden al ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (último trimestre reportado)`, ` · Comments refer to ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (latest reported quarter)`); }
      if (!A || !B) return;
      let y = this.page('P', `${this.T(`Estado de resultados de ${this.cfg.short}`, `${this.cfg.short} Income Statement`)} · ${la} vs ${lb}`, this.nextText());
      const layout = M.FIN.layout.is; const rows = [], meta = [];
      const OCI = new Set(); if (layout.some((d) => d.k === 'comprehensiveControlling')) { let on = false; for (const d of layout) { if (d.k === 'comprehensiveControlling') on = false; if (on) OCI.add(d.k); if (d.k === 'netIncome') on = true; } }
      const get = (o, d) => (o && o.is && o.is[d.k] != null ? o.is[d.k] : null);
      for (const def of layout) {
        if (def.ifric || OCI.has(def.k)) continue;
        if (def.level === 2 && !def.memo) continue;                                      // detail rows collapsed, as on screen
        let va = get(A, def), vb = get(B, def);
        if (def.k === 'revTotal' || def.k === 'totalOpCosts') { va = va == null ? va : va - ((A.is.revConstruction) || 0); vb = vb == null ? vb : vb - ((B.is.revConstruction) || 0); }
        if (va == null && vb == null) continue;
        const d = va != null && vb != null ? va - vb : null, p = d != null && vb ? 100 * d / Math.abs(vb) : null;
        const f = (v) => (v == null ? '—' : def.pct ? this.pct(v) : def.perShare ? this.n(v, 2) : this.m(v));
        const fd = d == null ? '—' : def.pct ? this.n(d, 1) + ' pp' : def.perShare ? this.n(d, 2) : this.m(d);
        const c = def.level === 0 ? 'bold' : def.level === 2 ? 'sub' : '';
        rows.push([M.L(def), f(va), f(vb), fd, def.pct ? '' : this.pct(p, 1, true), C && C.lines && C.lines[def.k] ? M.L(C.lines[def.k]) : '']);
        meta.push([c + ' left', c, c, this.cls(d) + ' ' + c, this.cls(p) + ' ' + c, 'left small']);
      }
      const W = this.width(), cw = { 0: { cellWidth: W * 0.245, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.085 }, 5: { cellWidth: W * 0.42, halign: 'left' } };
      y = this.fitTable({ y, head: [this.T('Cifras en MXN millones', 'Figures in MXN mn'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral y conferencia)', 'Comments (quarterly report and earnings call)')], body: rows, meta, cols: cw }, [8.6, 8.2, 7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - 40);
      if (mode === 'fy') y = this.isFiller(y);
      const srcs = [A, B].map((o) => o.sources && o.sources.is).filter(Boolean);
      const cap = this.T(`Ps. millones, sin IFRIC 12 (ingresos y costos de construcción excluidos; el ${this.ebitdaL} no cambia). Detalle y otros resultados integrales omitidos${(A.derived || B.derived) ? '; periodos UDM calculados a partir de trimestres reportados' : ''}. Fuentes: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `informe trimestral de ${this.cfg.short} (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`,
        `Ps. million, ex-IFRIC 12 (construction revenue and cost excluded; ${this.ebitdaL} is unchanged). Detail rows and other comprehensive income omitted${(A.derived || B.derived) ? '; LTM periods computed from reported quarters' : ''}. Sources: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `${this.cfg.short} quarterly report (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`);
      this.note(cap, Math.max(y + 6, this.cur.y1 - 34));
    }
    isFiller(y) {
      const M = this.M, rem = this.cur.y1 - y - 46; if (rem < 92) return y;
      const h = Math.min(rem - 20, 190), W = this.width(), ys = M.Y.slice(-6);
      y = this.heading(this.T(`Ingresos sin construcción, ${this.ebitdaL} (Ps. millones) y margen por año fiscal`, `Revenue ex-construction, ${this.ebitdaL} (Ps. million) and margin by fiscal year`), this.cur.x0, y + 8, 10);
      const img = this.chart({ type: 'bar', data: { labels: ys.map((o) => 'FY' + o.fy), datasets: [{ type: 'bar', label: this.T('Ingresos sin construcción (eje izq.)', 'Revenue ex-construction (left axis)'), data: ys.map((o) => M.exRev(o.is) / 1000), backgroundColor: '#c9c6bd', maxBarThickness: 34, order: 2 }, { type: 'bar', label: `${this.ebitdaL} (${this.T('eje izq.', 'left axis')})`, data: ys.map((o) => o.is.ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 34, order: 1 }, { type: 'line', label: `${this.marginL} (${this.T('eje der.', 'right axis')})`, data: ys.map((o) => o.is.ebitdaMarginExIfric), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, suggestedMin: 50, suggestedMax: 80, ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
      return this.image(img, this.cur.x0, y, W, h) + 4;
    }

    // ================= 8. GUIDANCE (or the reference table when the company publishes none) =================
    guidancePage() {
      const M = this.M;
      if (M.GV.length) return this.formalGuidancePage();
      const reg = M.REF.regulation || {};
      let y = this.page('L', this.T('Perspectivas, tarifas y compromisos de inversión (sin guía formal)', 'Outlook, Tariffs and Investment Commitments (No Formal Guidance)'), this.nextText());
      const gap = 24, wl = this.width() * 0.56, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.text(M.L(CFG.noGuidance || {}), this.cur.x0, y, wl, 8.6, 'normal', INK) + 6;
      const rows = (reg.facts || []).map((f) => [M.L(f.label), M.LS(f.value), M.LS(f.source)]);
      yl = this.heading(this.T('Lo que la administración ha dicho y los compromisos vigentes', 'What management has said and the commitments in force'), this.cur.x0, yl, 10);
      yl = this.fitTable({ y: yl, w: wl, head: [M.t('metric'), M.t('value'), M.t('src')], body: rows, meta: rows.map(() => ['bold left', 'left', 'left small muted']), cols: { 0: { halign: 'left', cellWidth: wl * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wl * 0.22 } } }, [8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - 30);
      // right: concessions and, when the MDP carries a yearly profile, the committed capex by year
      let yr = this.heading(this.T('Concesiones', 'Concessions'), xr, y, 10);
      const cons = (M.REF.concessions || []).map((c) => [this.es ? c.scopeEs || c.scope : c.scope, c.granted, c.expires, c.years ? String(c.years) : '—']);
      if (cons.length) yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Alcance', 'Scope'), this.T('Otorgada', 'Granted'), this.T('Vence', 'Expires'), this.T('Años', 'Years')], body: cons, meta: cons.map(() => ['left', '', 'bold', '']), size: 7.8, cols: { 0: { halign: 'left', cellWidth: wr * 0.5 } } });
      const mdp = reg.mdp;
      if (mdp && mdp.byYear) {
        const yrs = Object.keys(mdp.byYear).sort();
        yr = this.heading(this.T(`PMD ${mdp.period} por año (Ps. millones de dic-2024)`, `MDP ${mdp.period} by year (Ps. million, Dec-2024 pesos)`), xr, yr + 10, 9.5);
        const h = 150;
        const img = this.chart({ type: 'bar', data: { labels: yrs, datasets: [{ label: this.T('Inversión comprometida', 'Committed investment'), data: yrs.map((k) => mdp.byYear[k]), backgroundColor: PALETTE[0], maxBarThickness: 36 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wr * 1.6), Math.round(h * 1.6));
        yr = this.image(img, xr, yr, wr, h) + 4;
        yr = this.note(`${M.L(mdp.note)} (${M.L(mdp.source)})`, yr, 7.2, xr, wr);
      }
      const conc = M.L(CFG.concessionNote || {});
      if (conc) yr = this.note(conc, yr + 6, 7.4, xr, wr);
      this.noteAbove(this.T(`Fuentes: conferencias de resultados e informes trimestrales de ${this.cfg.short}; comunicados sobre el PMD y las tarifas máximas; Forma 20-F (concesiones). Referencia actualizada ${this.date(reg.updatedAt || M.REF.updatedAt)}. La página de guía formal se activa automáticamente si ${this.cfg.short} empieza a publicarla.`, `Sources: ${this.cfg.short} earnings calls and quarterly reports; MDP and maximum-tariff releases; Form 20-F (concessions). Reference updated ${this.date(reg.updatedAt || M.REF.updatedAt)}. The formal guidance page switches on automatically if ${this.cfg.short} starts publishing one.`), Math.max(yl, yr) + 6);
    }
    // Formal guidance table (same layout as GAP): used automatically when guidance vintages exist.
    formalGuidancePage() {
      const M = this.M, fy = Math.max(...M.GV.map((v) => v.fy)), cur = M.GV.filter((v) => v.fy === fy), last = cur[cur.length - 1];
      const act = M.gActual(fy), closed = !!(act && act.kind === 'fy');
      let y = this.page('L', this.T(`Guía de la administración · FY${fy}`, `Management Guidance · FY${fy}`), this.nextText());
      const rows = M.GM.map((m) => { const cells = cur.map((v) => M.gRange(m, v.items[m.k])); const v = act ? act.v[m.k] : null, x = last.items[m.k]; const sx = M.gStatus(m, x, v); return [M.L(m), ...cells, M.gActualFmt(m, v), sx ? M.t(sx) : '']; });
      y = this.table({ y, head: [M.t('metric'), ...cur.map((v, i) => `${i === 0 ? M.t('initial') : M.t('revised')} ${this.date(v.date)}`), `${M.t('actual')} ${act ? act.label : ''}`, closed ? M.t('outcome') : M.t('tracking')], body: rows, meta: rows.map(() => ['left', ...cur.map(() => ''), 'bold', '']), size: 8.4, cols: { 0: { halign: 'left' } } });
      this.noteAbove(this.T(`Fuente: comunicados de guía de ${this.cfg.short} (${cur.map((v) => this.date(v.date)).join(', ')}).`, `Source: ${this.cfg.short} guidance releases (${cur.map((v) => this.date(v.date)).join(', ')}).`), y + 8);
    }

    // ================= 9. TRAFFIC TABLES =================
    trafficTables() {
      const M = this.M, ms = M.TR.months, lastM = this.lastM(), AIR = M.AIR;
      let y = this.page('P', this.T(`Tráfico por aeropuerto · ${M.ymLabel(lastM.ym)} y últimos doce meses`, `Traffic by Airport · ${M.ymLabel(lastM.ym)} and Last Twelve Months`), this.T(`Miles de pasajeros terminales · reporte mensual de tráfico de ${this.cfg.short} del ${this.date(lastM.source && lastM.source.date)}`, `Thousand terminal passengers · ${this.cfg.short} monthly traffic report of ${this.date(lastM.source && lastM.source.date)}`));
      const prev = ms.find((m) => m.ym === `${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const ytdOf = (ym, code) => ms.filter((m) => m.ym.slice(0, 4) === ym.slice(0, 4) && m.ym <= ym).reduce((a, m) => a + (m.total[code] || 0), 0);
      // Airports in country order (ASUR) or as listed (OMA); a subtotal row per country when the data carries countries.
      const groups = M.CTRY.length ? M.CTRY.map((c) => ({ label: M.L(c), code: c.code, codes: AIR.filter((a) => a.country === c.code).map((a) => a.code) })) : [{ label: null, codes: AIR.map((a) => a.code) }];
      const rows = [], meta = [];
      const push = (label, v, p, yv, yp, dom, intl, tot, b) => { const yoy = p ? 100 * (v / p - 1) : null, yoyY = yp ? 100 * (yv / yp - 1) : null; rows.push([label, this.n(v, 1), this.pct(yoy, 1, true), this.n(dom, 1), this.n(intl, 1), this.n(yv, 1), this.pct(yoyY, 1, true), this.pct(100 * v / tot, 1)]); meta.push([b + ' left', b, this.cls(yoy) + ' ' + b, b, b, b, this.cls(yoyY) + ' ' + b, b]); };
      const totNow = lastM.total.TOTAL;
      for (const g of groups) {
        if (g.label) { rows.push([g.label, '', '', '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head', 'head', 'head']); }
        for (const code of g.codes) push(this.airportName(code), lastM.total[code], prev && prev.total[code], ytdOf(lastM.ym, code), prev ? ytdOf(prev.ym, code) : null, lastM.dom[code], lastM.intl[code], totNow, '');
        if (g.label && lastM.countries && lastM.countries[g.code]) { const cv = lastM.countries[g.code], cp = prev && prev.countries && prev.countries[g.code]; const ytdC = (mm, k) => ms.filter((m) => m.ym.slice(0, 4) === mm.slice(0, 4) && m.ym <= mm).reduce((a, m) => a + ((m.countries && m.countries[k] && m.countries[k].total) || 0), 0); push(this.T(`Subtotal ${g.label}`, `Subtotal ${g.label}`), cv.total, cp && cp.total, ytdC(lastM.ym, g.code), prev ? ytdC(prev.ym, g.code) : null, cv.dom, cv.intl, totNow, 'bold'); }
      }
      push(this.T(`Total ${this.cfg.short} (${AIR.length} aeropuertos)`, `Total ${this.cfg.short} (${AIR.length} airports)`), totNow, prev && prev.total.TOTAL, ytdOf(lastM.ym, 'TOTAL'), prev ? ytdOf(prev.ym, 'TOTAL') : null, lastM.dom.TOTAL, lastM.intl.TOTAL, totNow, 'bold');
      y = this.heading(this.T(`Último mes: ${M.ymLabel(lastM.ym)}`, `Latest month: ${M.ymLabel(lastM.ym)}`), this.cur.x0, y, 10.5);
      const nt = this.nextTraffic();
      const nextLine = nt ? this.T(`Próximo reporte: tráfico de ${new Date(Date.UTC(+lastM.ym.slice(0, 4), +lastM.ym.slice(5, 7), 1)).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })}, esperado hacia el ${this.date(nt.date)} (${this.cfg.short} publica alrededor del día ${nt.day}, mediana de los últimos doce reportes).`, `Next report: ${new Date(Date.UTC(+lastM.ym.slice(0, 4), +lastM.ym.slice(5, 7), 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} traffic report expected around ${this.date(nt.date)} (${this.cfg.short} publishes around the ${nt.day}${this.es ? '' : 'th'}, median of the last twelve reports).`) : '';
      const i = ms.length - 1; const win = ms.slice(i - 11, i + 1), pwin = ms.slice(i - 23, i - 11);
      const half = win.length === 12 ? (this.cur.y1 - y) / 2 - 10 : this.cur.y1 - y - 40;
      y = this.fitTable({ y, head: [M.t('airport'), M.ymLabel(lastM.ym), M.t('yoy'), M.t('dom'), M.t('intl'), `${M.t('ytdShort')} ${lastM.ym.slice(0, 4)}`, M.t('yoy'), M.t('share')], body: rows, meta, cols: { 0: { halign: 'left', cellWidth: this.width() * 0.3 } }, rowSpan: rows.map((r) => (r[1] === '' ? 8 : 0)), pad: { top: 1.9, bottom: 1.9, left: 3.5, right: 3.5 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4, 6], y + half);
      if (nextLine) y = this.text(nextLine, this.cur.x0, y + 3, this.width(), 8.2, 'bold', ACCENT);
      if (win.length === 12) {
        const sum = (arr, seg, code) => arr.reduce((a, m) => a + ((m[seg] && m[seg][code]) || 0), 0);
        const r2 = [], m2 = []; const tot = sum(win, 'total', 'TOTAL');
        const push2 = (label, code, b) => { const v = sum(win, 'total', code), p = pwin.length === 12 ? sum(pwin, 'total', code) : null; const yoy = p ? 100 * (v / p - 1) : null; r2.push([label, this.n(v, 1), this.pct(yoy, 1, true), this.n(sum(win, 'dom', code), 1), this.n(sum(win, 'intl', code), 1), this.pct(100 * sum(win, 'intl', code) / v, 1), this.pct(100 * v / tot, 1)]); m2.push([b + ' left', b, this.cls(yoy) + ' ' + b, b, b, b, b]); };
        for (const g of groups) { if (g.label) { r2.push([g.label, '', '', '', '', '', '']); m2.push(['head left', 'head', 'head', 'head', 'head', 'head', 'head']); } for (const code of g.codes) push2(this.airportName(code), code, ''); }
        push2(this.T(`Total ${this.cfg.short}`, `Total ${this.cfg.short}`), 'TOTAL', 'bold');
        y = this.heading(this.T(`Últimos doce meses: ${M.ymLabel(win[0].ym)} – ${M.ymLabel(lastM.ym)}`, `Last twelve months: ${M.ymLabel(win[0].ym)} – ${M.ymLabel(lastM.ym)}`), this.cur.x0, y + 6, 10.5);
        y = this.fitTable({ y, head: [M.t('airport'), this.T('UDM', 'LTM'), this.T('a/a vs UDM previos', 'y/y vs prior LTM'), M.t('dom'), M.t('intl'), this.T('% internacional', '% international'), M.t('share')], body: r2, meta: m2, cols: { 0: { halign: 'left', cellWidth: this.width() * 0.3 } }, rowSpan: r2.map((r) => (r[1] === '' ? 7 : 0)), pad: { top: 1.9, bottom: 1.9, left: 3.5, right: 3.5 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 34);
      }
      this.noteAbove(`${M.L(CFG.trafficCap)} ${this.T(`Cobertura ${M.ymLabel(ms[0].ym)} – ${M.ymLabel(lastM.ym)}; acumulado del año vs el mismo periodo del año anterior.`, `Coverage ${M.ymLabel(ms[0].ym)} – ${M.ymLabel(lastM.ym)}; year-to-date vs the same period a year earlier.`)}`, y + 6);
    }

    // ================= 10. TRAFFIC CHARTS: COMPANY vs MEXICO =================
    trafficCharts() {
      const M = this.M, ms = M.TR.months, MX = this.MX, short = this.cfg.short;
      const mxCountry = M.CTRY.find((c) => c.code === 'MX');               // ASUR: compare its Mexican airports only
      const coV = (m) => (mxCountry ? (m.countries && m.countries.MX ? m.countries.MX.total : null) : m.total.TOTAL);
      const coLabel = mxCountry ? this.T(`${short} México (${M.AIR.filter((a) => a.country === 'MX').length} aeropuertos)`, `${short} Mexico (${M.AIR.filter((a) => a.country === 'MX').length} airports)`) : this.T(`${short} · total ${M.AIR.length} aeropuertos`, `${short} · total ${M.AIR.length} airports`);
      const from = '2023-01'; const coM = ms.filter((m) => m.ym >= from);
      const labels = coM.map((m) => m.ym);
      const coVals = coM.map((m) => (coV(m) != null ? coV(m) / 1000 : null));
      const mxIdx = MX ? Object.fromEntries(MX.months.map((ym, i) => [ym, i])) : {};
      const mxAt = (ym) => (MX && mxIdx[ym] != null ? (MX.national.pax.dom[mxIdx[ym]] + MX.national.pax.intl[mxIdx[ym]]) / 1e6 : null);
      const mxV = labels.map(mxAt);
      const yoyC = coM.map((m) => { const p = ms.find((x) => x.ym === `${+m.ym.slice(0, 4) - 1}${m.ym.slice(4)}`); return p && coV(m) != null && coV(p) ? 100 * (coV(m) / coV(p) - 1) : null; });
      const yoyM = labels.map((ym) => { const a = mxAt(ym), b = mxAt(`${+ym.slice(0, 4) - 1}${ym.slice(4)}`); return a != null && b ? 100 * (a / b - 1) : null; });
      const mxLast = MX ? MX.lastMonth : null;
      let y = this.page('P', this.T(`Tráfico de ${short} frente al total de México · enero 2023 en adelante`, `${short} Traffic Versus Mexico Total · January 2023 Onwards`), this.T(`${coLabel}: pasajeros terminales de los reportes mensuales (hasta ${M.ymLabel(ms[ms.length - 1].ym)}) · México: pasajeros de todos los aeropuertos comerciales según la AFAC (hasta ${mxLast ? M.ymLabel(mxLast) : '—'})`, `${coLabel}: terminal passengers from the monthly reports (to ${M.ymLabel(ms[ms.length - 1].ym)}) · Mexico: passengers at every commercial airport per AFAC (to ${mxLast ? M.ymLabel(mxLast) : '—'})`));
      const W = this.width(); const tick = (v, i) => (labels[i] && labels[i].slice(5) === '01' ? labels[i].slice(0, 4) : labels[i] && labels[i].slice(5) === '07' ? this.T('jul', 'Jul') : '');
      y = this.heading(this.T(`Pasajeros por mes (millones): ${short} en el eje izquierdo, México en el eje derecho`, `Passengers per month (million): ${short} on the left axis, Mexico on the right axis`), this.cur.x0, y, 10.5);
      const h1 = 215;
      const img1 = this.chart({ type: 'line', data: { labels, datasets: [{ label: `◀ ${coLabel} (${this.T('millones, EJE IZQUIERDO', 'million, LEFT AXIS')})`, data: coVals, borderColor: PALETTE[0], backgroundColor: PALETTE[0], yAxisID: 'y', borderWidth: 2.4 }, { label: this.T('México · todos los aeropuertos, AFAC (millones, EJE DERECHO) ▶', 'Mexico · all airports, AFAC (million, RIGHT AXIS) ▶'), data: mxV, borderColor: PALETTE[1], backgroundColor: PALETTE[1], yAxisID: 'y2', borderWidth: 2, borderDash: [6, 3] }] }, options: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { position: 'left', title: { display: true, text: `${short} (${this.T('millones', 'million')})`, color: PALETTE[0], font: { size: 10, weight: 'bold' } }, ticks: { color: PALETTE[0], callback: (v) => this.n(v, 1) } }, y2: { position: 'right', grid: { display: false }, title: { display: true, text: this.T('México (millones)', 'Mexico (million)'), color: '#8a6a12', font: { size: 10, weight: 'bold' } }, ticks: { color: '#8a6a12', callback: (v) => this.n(v, 1) } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img1, this.cur.x0, y, W, h1) + 8;
      y = this.heading(this.T(`Variación anual (%) del mismo mes: ${short} y México (un solo eje)`, `Year-on-year change (%) of the same month: ${short} and Mexico (single axis)`), this.cur.x0, y, 10.5);
      const h2 = 165;
      const img2 = this.chart({ type: 'bar', data: { labels, datasets: [{ type: 'bar', label: this.T(`${short} · variación a/a %`, `${short} · y/y change %`), data: yoyC, backgroundColor: PALETTE[0], maxBarThickness: 9 }, { type: 'line', label: this.T('México (AFAC) · variación a/a %', 'Mexico (AFAC) · y/y change %'), data: yoyM, borderColor: PALETTE[1], backgroundColor: PALETTE[1], borderWidth: 2, pointRadius: 2 }] }, options: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h2 * 1.6));
      y = this.image(img2, this.cur.x0, y, W, h2) + 8;
      const last12 = labels.slice(-12); const rows = last12.map((ym) => { const i = labels.indexOf(ym); return [M.ymLabel(ym), this.n(coVals[i], 2), this.pct(yoyC[i], 1, true), mxV[i] == null ? '—' : this.n(mxV[i], 2), this.pct(yoyM[i], 1, true), mxV[i] && coVals[i] != null ? this.pct(100 * coVals[i] / mxV[i], 1) : '—']; });
      const meta = rows.map((r, i) => ['left', '', this.cls(yoyC[labels.indexOf(last12[i])]), '', this.cls(yoyM[labels.indexOf(last12[i])]), '']);
      const rem = this.cur.y1 - y - 30;
      if (rem > 90) y = this.fitTable({ y, head: [this.T('Mes', 'Month'), `${short} (M)`, this.T(`${short} a/a`, `${short} y/y`), this.T('México (M)', 'Mexico (M)'), this.T('México a/a', 'Mexico y/y'), `${short} / ${this.T('México', 'Mexico')}`], body: rows, meta, cols: { 0: { halign: 'left' } } }, [8.2, 7.6, 7, 6.5], this.cur.y1 - 28);
      this.noteAbove(this.T(`Ambas series cuentan pasajeros en cada aeropuerto (llegadas y salidas), por lo que un vuelo nacional cuenta en origen y destino${mxCountry ? `; para la comparación se usan solo los aeropuertos mexicanos de ${short}` : ''}. Fuentes: reportes mensuales de tráfico de ${short}; AFAC, Estadística operativa de aeropuertos (${MX && MX.sources && MX.sources.afac ? MX.sources.afac.file + ', publicado el ' + this.date(MX.sources.afac.published) : 'archivo mensual'}).`, `Both series count passengers at each airport (arrivals and departures), so a domestic flight counts at both ends${mxCountry ? `; only ${short}'s Mexican airports are used for the comparison` : ''}. Sources: ${short} monthly traffic reports; AFAC, airport operating statistics (${MX && MX.sources && MX.sources.afac ? MX.sources.afac.file + ', published ' + this.date(MX.sources.afac.published) : 'monthly file'}).`), Math.max(y + 4, this.cur.y1 - 30));
    }

    // ================= 11. 07 LEVERAGE AND DEBT =================
    debtPage() {
      const M = this.M, qs = M.Q.slice(-8), lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ);
      const nds = qs.map((q) => ({ q, nd: M.netDebt(q), l: M.ltmFor(q) })); const est = nds.map((x) => x.nd && x.nd.basis === 'est');
      const D2 = M.REF.debt || {}; const rat = (D2.ratings || []).map((r) => `${r.agency.replace("Moody's Local MX", "Moody's").replace('S&P Global Ratings', 'S&P')} ${r.rating}`).join(' · ');
      let y = this.page('L', this.T('07 · Apalancamiento y perfil de deuda', '07 · Leverage and Debt Profile'), this.T(`Ps. millones · balance del ${this.qlab(lastQ)} (${this.date(this.rel(lastQ))}) · instrumentos según los informes de ${this.cfg.short}, referencia actualizada ${this.date(M.REF.updatedAt)}`, `Ps. million · ${this.qlab(lastQ)} balance sheet (${this.date(this.rel(lastQ))}) · instruments per ${this.cfg.short}'s reports, reference updated ${this.date(M.REF.updatedAt)}`));
      const asOf = this.date(M.qEndDate(lastQ));
      const lev = nd && L ? nd.net / L.is.ebitda : null;
      y = this.tiles([
        { v: nd ? `Ps. ${this.m(nd.net)} M` : '—', l: this.T(`Deuda neta · ${asOf}`, `Net debt · ${asOf}`) },
        { v: nd ? `Ps. ${this.m(nd.gross)} M` : '—', l: this.T('Deuda bruta (préstamos y bonos)', 'Gross debt (loans and bonds)') },
        { v: nd ? `Ps. ${this.m(nd.cash)} M` : '—', l: this.T('Efectivo y equivalentes', 'Cash and equivalents') },
        { v: lev != null ? this.x(lev, 2) : '—', l: this.T(`Deuda neta / ${this.ebitdaL} UDM`, `Net debt / LTM ${this.ebitdaL}`) },
        rat ? { v: rat, l: this.T('Calificaciones', 'Ratings'), size: 11 } : { v: nd && L ? this.x(nd.gross / L.is.ebitda, 2) : '—', l: this.T(`Deuda bruta / ${this.ebitdaL} UDM`, `Gross debt / LTM ${this.ebitdaL}`) },
      ], y);
      const gap = 24, wl = this.width() * 0.54, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T(`Deuda neta (barras, Ps. M) y deuda neta / ${this.ebitdaL} UDM (línea, eje der.)`, `Net debt (bars, Ps. M) and net debt / LTM ${this.ebitdaL} (line, right axis)`), this.cur.x0, y, 9.5);
      const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');
      const levs = nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null)).filter((v) => v != null);
      const levMin = Math.max(0, Math.floor((Math.min(...levs) - 0.2) * 2) / 2);
      const h1 = 235;
      const img1 = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [
        { type: 'line', label: this.T(`Deuda neta / ${this.ebitdaL} UDM (eje der.)`, `Net debt / LTM ${this.ebitdaL} (right axis)`), data: nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null)), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true, segment: { borderDash: (ctx) => (est[ctx.p1DataIndex] ? [5, 4] : undefined) } },
        { type: 'bar', label: this.T('Deuda neta (eje izq.)', 'Net debt (left axis)'), data: nds.map((x) => (x.nd ? x.nd.net / 1000 : null)), backgroundColor: nds.map((_, i) => alpha(PALETTE[0], est[i] ? 0.45 : 1)), maxBarThickness: 38, order: 1 }] },
        options: { scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, min: levMin, ticks: { stepSize: 0.25, callback: (v) => this.n(v, 2) + 'x' } } } } }, Math.round(wl * 1.6), Math.round(h1 * 1.6));
      yl = this.image(img1, this.cur.x0, yl, wl, h1) + 6;
      const firstBs = nds.find((x) => x.nd && x.nd.basis === 'bs');
      const bl = [M.L(CFG.debtNote) + (est.some(Boolean) ? this.T(` Barras translúcidas y línea punteada: estimación a partir de los flujos de financiamiento (balance detallado desde ${firstBs ? this.qlab(firstBs.q) : '—'}).`, ` Translucent bars and dashed line: estimated from financing flows (itemised balance sheet from ${firstBs ? this.qlab(firstBs.q) : '—'}).`) : '')];
      if (D2.instrumentsNote) bl.push(M.LS(D2.instrumentsNote));
      yl = this.bullets(bl, this.cur.x0, yl, wl, 7.8, { gap: 3, color: MUTED });
      let yr = this.heading(this.T('Instrumentos vigentes (Ps. millones)', 'Outstanding instruments (Ps. million)'), xr, y, 10);
      const ins = (D2.instruments || []).map((i) => [M.LS(i.name), i.matures ? this.date(i.matures) : '—', this.n(i.principalMxn), M.LS(i.rate) || '—']);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('instrument'), M.t('matures'), M.t('principal'), M.t('rate')], body: ins, meta: ins.map(() => ['left', '', '', 'left']), cols: { 0: { halign: 'left', cellWidth: wr * 0.36 }, 1: { cellWidth: wr * 0.2 }, 2: { cellWidth: wr * 0.17 }, 3: { halign: 'left', cellWidth: wr * 0.27 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 136);
      const qr = nds.map((x) => [this.qlab(x.q) + (x.nd && x.nd.basis === 'est' ? ' *' : ''), x.nd ? this.m(x.nd.net) : '—', x.l ? this.m(x.l.is.ebitda) : '—', x.nd && x.l && x.l.is.ebitda ? this.x(x.nd.net / x.l.is.ebitda, 2) : '—']);
      yr = this.heading(this.T('Por trimestre (Ps. millones)', 'By quarter (Ps. million)'), xr, yr + 8, 10);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [this.T('Trimestre', 'Quarter'), this.T('Deuda neta', 'Net debt'), `${this.ebitdaL} UDM`, this.T(`Deuda neta / ${this.ebitdaL}`, `Net debt / ${this.ebitdaL}`)], body: qr, meta: qr.map(() => ['left', 'bold', '', 'bold']), cols: { 0: { halign: 'left' } } }, [8, 7.6, 7.2, 6.8], this.cur.y1 - 26);
      this.noteAbove(this.T(`* estimación. Fuentes: balances trimestrales de ${this.cfg.short}; informes y comunicados sobre instrumentos (referencia actualizada ${this.date(M.REF.updatedAt)}).`, `* estimate. Sources: ${this.cfg.short} quarterly balance sheets; reports and releases on instruments (reference updated ${this.date(M.REF.updatedAt)}).`), Math.max(yl, yr) + 4, 7);
    }

    // ================= 12. 08 DIVIDENDS =================
    dividendPage() {
      const M = this.M, divs = (M.MK.dividends && M.MK.dividends[M.HOME] && M.MK.dividends[M.HOME].points) || [];
      const byYear = {}; for (const [d, v] of divs) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + v;
      const lastYear = Math.max(...Object.keys(byYear).map(Number)); const years = []; for (let yv = 2015; yv <= lastYear; yv++) { years.push(String(yv)); byYear[yv] ??= 0; }
      let y = this.page('L', this.T('08 · Dividendos', '08 · Dividends'), this.T('Dividendo por acción pagado cada año (efectivo por acción registrado en bolsa) y el aprobado por la asamblea más reciente · razón de pago sobre la utilidad por acción del año fiscal · rendimiento sobre el cierre del año', 'Dividend per share paid each year (exchange-recorded cash per share) and the amount approved at the latest AGM · payout on fiscal-year EPS · yield on the year-end close'));
      const gap = 20, wl = this.width() * 0.42, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const ag = (M.REF.dividends || []).map((d) => this.T(`Asamblea ${d.agmYear} (${this.date(d.agmDate)}): Ps. ${this.n(d.dps, 2)} por acción. ${M.LS(d.note)}`, `AGM ${d.agmYear} (${this.date(d.agmDate)}): Ps. ${this.n(d.dps, 2)} per share. ${M.LS(d.note)}`));
      const px = M.lastPx; const last = (M.REF.dividends || []).slice(-1)[0];
      if (last && px) ag.push(this.T(`Rendimiento del DPS aprobado en ${last.agmYear} sobre el precio actual (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * last.dps / px[1])}.`, `Yield of the DPS approved in ${last.agmYear} on the current price (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * last.dps / px[1])}.`));
      let yl = this.bullets(ag, this.cur.x0, y, wl, 8.2, { gap: 3 });
      yl = this.heading(this.T('Dividendo por acción por año de pago (Ps.)', 'Dividend per share by payment year (Ps.)'), this.cur.x0, yl + 4, 10);
      const h = 140;
      const img = this.chart({ type: 'bar', data: { labels: years, datasets: [{ label: M.t('dps'), data: years.map((yv) => byYear[yv]), backgroundColor: PALETTE[0], maxBarThickness: 30 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
      this.image(img, this.cur.x0, yl, wl, h);
      const rows = years.map((yv) => { const fy = M.Y.find((yy) => yy.fy === +yv); const ni = fy && fy.is ? M.niCtrl(fy.is) / 1000 : null; const sh2 = M.sharesAt(`${yv}-12-31`); const eps = ni && sh2 ? ni * 1e6 / sh2 : null; const pEnd = M.pointAtOrBefore(M.homePx, `${yv}-12-31`); return [yv, this.n(byYear[yv], 2), eps ? this.pct(100 * byYear[yv] / eps, 0) : '—', pEnd && byYear[yv] ? this.pct(100 * byYear[yv] / pEnd[1]) : '—']; });
      let yr = this.table({ y, x: xr, w: wr, head: [M.t('year'), this.T('DPS (Ps. por acción)', 'DPS (Ps. per share)'), M.t('payout'), M.t('yield')], body: rows, meta: rows.map(() => ['left', 'bold', '', '']), size: 8, cols: { 0: { halign: 'left' } } });
      yr = this.note(M.L(CFG.dpsCap) + this.T(' Razón de pago = DPS / utilidad por acción (participación controladora) del año fiscal; rendimiento sobre el cierre del año.', ' Payout = DPS / fiscal-year EPS (controlling interest); yield on the year-end close.'), yr + 3, 7.2, xr, wr);
      const fys = M.Y.filter((fy) => fy.cf && fy.cf.cfo != null).slice(-10);
      const z = (v) => (v || 0) + 0;
      const cf = fys.map((fy) => { const c = fy.cf; const cfo = c.cfo / 1000, capex = z(-(c.capex || 0) / 1000), div = z(-(c.dividendsPaid || 0) / 1000), cr = z(-(c.capitalReduction || 0) / 1000), buy = z(-(c.buybacks || 0) / 1000), pay = z(-((c.bondsPaid || 0) + (c.loansPaid || 0) + (c.ltDebtPaid || 0)) / 1000), chg = c.netChangeCash != null ? c.netChangeCash / 1000 : null; return { fy: fy.fy, cfo, capex, fcf: cfo - capex, pay, div, cr, buy, chg }; });
      const hasCr = cf.some((r) => r.cr);
      const cfRows = cf.map((r) => ['FY' + r.fy, this.n(r.cfo), this.n(-r.capex), this.n(r.fcf), this.n(r.pay), this.n(r.div), ...(hasCr ? [this.n(r.cr)] : []), this.n(r.buy), r.chg == null ? '—' : this.n(r.chg), r.fcf ? this.pct(z(100 * (r.div + r.cr + r.buy) / r.fcf), 0) : '—']);
      const cfMeta = cf.map((r) => ['left', '', 'neg', 'bold', '', '', ...(hasCr ? ['muted'] : []), '', this.cls(r.chg), r.div + r.cr + r.buy > r.fcf ? 'neg' : '']);
      const yb = Math.max(yl + h + 6, yr) + 12;
      let y2 = this.heading(this.T(`Flujo operativo, capex, flujo libre y distribuciones · últimos ${cf.length} años fiscales (Ps. millones)`, `Operating cash flow, capex, free cash flow and distributions · last ${cf.length} fiscal years (Ps. million)`), this.cur.x0, yb, 10);
      const W = this.width();
      const cfNote = this.T(`Estado de flujos de efectivo anual de ${this.cfg.short}: flujo operativo después de impuestos; capex = adquisiciones de mejoras a bienes concesionados y activos fijos; FCF = flujo operativo − capex; pago de deuda = bonos y préstamos amortizados en el año (bruto, sin restar emisiones). Variación neta de efectivo = aumento (disminución) del efectivo en el año según el estado de flujos. Distribuciones = dividendos${hasCr ? ' + reembolsos de capital' : ''} + recompras.`, `${this.cfg.short} annual cash-flow statement: operating cash flow after taxes; capex = additions to concession improvements and fixed assets; FCF = operating cash flow − capex; debt paydown = bonds and loans repaid in the year (gross, before new issuance). Net change in cash = increase (decrease) in cash for the year per the cash-flow statement. Distributions = dividends${hasCr ? ' + capital reductions' : ''} + buybacks.`);
      const cfH = this.measureText(cfNote, W, 7.5, 1.25);
      y2 = this.fitTable({ y: y2, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Flujo operativo', 'Operating cash flow'), this.T('Capex', 'Capital expenditures'), this.T('Flujo libre (FCF)', 'Free cash flow (FCF)'), this.T('Pago de deuda', 'Debt paydown'), this.T('Dividendos pagados', 'Dividends paid'), ...(hasCr ? [this.T('Reembolsos de capital', 'Capital reductions')] : []), this.T('Recompras', 'Share buybacks'), this.T('Variación neta de efectivo', 'Net change in cash'), this.T('Distribuciones / FCF', 'Distributions / FCF')], body: cfRows, meta: cfMeta, cols: { 0: { halign: 'left', cellWidth: W * 0.1 } }, pad: { top: 2, bottom: 2, left: 4, right: 4 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - cfH - 6);
      this.noteAbove(cfNote, y2 + 4);
    }

    // ================= 13. 09 EVENT (expansion / MDP): facts, timeline and the page's own prose =================
    eventPage() {
      const M = this.M, E = M.REF.event || {}, title = this.sectionTitle('event', this.T('Evento', 'Event'));
      let y = this.page('L', `09 · ${title}`, this.T(`Hechos y cronología de los comunicados de ${this.cfg.short}; referencia actualizada ${this.date(M.REF.updatedAt)}`, `Facts and timeline from ${this.cfg.short}'s releases; reference updated ${this.date(M.REF.updatedAt)}`));
      const facts = E.facts || [];
      y = this.tiles(facts.slice(0, 5).map((f) => ({ v: M.fmtFact(f), l: M.L(f.label), size: 12.5 })), y, 52);
      const gap = 24, wl = this.width() * 0.55, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const prose = this.sectionProse('event');
      const srcNote = E.sources ? `${M.t('src')}: ${(M.LS(E.sources) || []).join(' · ')}` : '';
      const noteH = srcNote ? this.measureText(srcNote, this.width(), 7.5, 1.25) : 0;
      let yl = y;
      for (let size = 8.4; size >= 6.8; size -= 0.4) { if (this.measureBullets(prose, wl, size, { gap: 4 }) <= this.cur.y1 - noteH - y - 10) { yl = this.bullets(prose, this.cur.x0, y, wl, size, { gap: 4 }); break; } if (size < 7.2) yl = this.bullets(prose, this.cur.x0, y, wl, 6.8, { gap: 3 }); }
      const capKey = (CFG.opsKpi || []).some((k) => k.k === 'capexMdpM') ? 'capexMdpM' : 'capex';
      const qs = M.Q.slice(-8).filter((q) => q.kpi && q.kpi[capKey] != null);
      const room = this.cur.y1 - noteH - yl - 40;
      if (qs.length >= 4 && room >= 110) {
        const h = Math.min(room - 20, 170);
        const capL = capKey === 'capexMdpM' ? this.T('Inversiones PMD y estratégicas por trimestre (Ps. millones)', 'MDP and strategic investments by quarter (Ps. million)') : this.T('Capex por trimestre (Ps. millones)', 'Capex by quarter (Ps. million)');
        yl = this.heading(capL, this.cur.x0, yl + 6, 9.5);
        const vals = qs.map((q) => (capKey === 'capexMdpM' ? q.kpi[capKey] : q.kpi[capKey] / 1000));
        const img = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [{ label: capL, data: vals, backgroundColor: PALETTE[0], maxBarThickness: 34 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
        yl = this.image(img, this.cur.x0, yl, wl, h) + 2;
        yl = this.note(this.T('Fuente: Tabla de indicadores del informe trimestral (capex del trimestre).', 'Source: the quarterly report\'s indicator table (capex for the quarter).'), yl, 7, this.cur.x0, wl);
      }
      let yr = this.heading(this.T('Cronología', 'Timeline'), xr, y, 10);
      const tl = (E.timeline || []).map((e) => [this.date(e.date), M.L(e)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: [M.t('date'), this.T('Hecho', 'Event')], body: tl, meta: tl.map(() => ['bold left', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.2 }, 1: { halign: 'left' } }, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - noteH - (facts.length > 5 ? 90 : 12));
      if (facts.length > 5) { const more = facts.slice(5).map((f) => [M.L(f.label), M.fmtFact(f)]); yr = this.fitTable({ y: yr + 8, x: xr, w: wr, head: null, body: more, meta: more.map(() => ['left small', 'bold']), cols: { 0: { halign: 'left', cellWidth: wr * 0.72 } }, pad: { top: 2, bottom: 2, left: 3, right: 3 } }, [7.6, 7.2, 6.8], this.cur.y1 - noteH - 8); }
      if (srcNote) this.noteAbove(srcNote, Math.max(yl, yr) + 6);
    }

    // ================= 14. 10 EXPLAINER: fact sheet, status, the page's own prose and a company graphic =================
    explainerPage() {
      const M = this.M, X = M.REF.explainer || {}, title = this.sectionTitle('explainer', this.T('Explicación', 'Explainer'));
      let y = this.page('L', `10 · ${title}`, this.T(`Ficha y contexto de los informes y comunicados de ${this.cfg.short}; referencia actualizada ${this.date(M.REF.updatedAt)}`, `Fact sheet and context from ${this.cfg.short}'s reports and releases; reference updated ${this.date(M.REF.updatedAt)}`));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const srcNote = X.sources ? `${M.t('src')}: ${(M.LS(X.sources) || []).join(' · ')}` : '';
      const noteH = srcNote ? this.measureText(srcNote, this.width(), 7.5, 1.25) : 0;
      const prose = this.sectionProse('explainer'); if (X.status) prose.push(`**${this.T('Estatus.', 'Status.')}** ${M.L(X.status)}`);
      let yl = y;
      for (let size = 8.4; size >= 6.8; size -= 0.4) { if (this.measureBullets(prose, wl, size, { gap: 4 }) <= this.cur.y1 - noteH - y - 10) { yl = this.bullets(prose, this.cur.x0, y, wl, size, { gap: 4 }); break; } if (size < 7.2) yl = this.bullets(prose, this.cur.x0, y, wl, 6.8, { gap: 3 }); }
      let yr = this.heading(this.T('Ficha', 'Fact sheet'), xr, y, 10);
      const rows = (X.rows || []).map((r) => [M.L(r.label), M.LS(r.value) || '—']);
      const chartH = 130;
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: null, body: rows, meta: rows.map(() => ['bold left', 'left small']), cols: { 0: { halign: 'left', cellWidth: wr * 0.3 }, 1: { halign: 'left' } }, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - noteH - chartH - 30);
      yr = this.explainerChart(xr, yr + 8, wr, Math.min(chartH, this.cur.y1 - noteH - yr - 24));
      if (srcNote) this.noteAbove(srcNote, Math.max(yl, yr) + 6);
    }
    // Company graphic for the explainer page: results by country for a multi-country group (segments), else the
    // local-bond maturity profile.
    explainerChart(x, y, w, h) {
      const M = this.M, q = M.lastQ; if (h < 70) return y;
      if (q.segments && M.FIN.segments) {
        const segs = M.FIN.segments.filter((s) => q.segments[s.code] && q.segments[s.code].ebitda != null);
        y = this.heading(this.T(`${this.ebitdaL} y pasajeros por país · ${this.qlab(q)}`, `${this.ebitdaL} and passengers by country · ${this.qlab(q)}`), x, y, 9.5);
        const img = this.chart({ type: 'bar', data: { labels: segs.map((s) => M.L(s).split(' (')[0]), datasets: [{ type: 'bar', label: `${this.ebitdaL} (Ps. M, ${this.T('eje izq.', 'left axis')})`, data: segs.map((s) => q.segments[s.code].ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 40, yAxisID: 'y', order: 1 }, { type: 'line', label: this.T('Pasajeros (miles, eje der.)', 'Passengers (thousand, right axis)'), data: segs.map((s) => q.segments[s.code].pax), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 5, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', showLine: false, yAxisID: 'y2', order: 0 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(w * 1.6), Math.round((h - 16) * 1.6));
        return this.image(img, x, y, w, h - 16);
      }
      const ins = ((M.REF.debt && M.REF.debt.instruments) || []).filter((i) => i.matures && i.principalMxn);
      if (!ins.length) return y;
      const byY = {}; for (const i of ins) { const yr = String(i.matures).slice(0, 4); byY[yr] = (byY[yr] || 0) + i.principalMxn; }
      const yrs = Object.keys(byY).sort();
      y = this.heading(this.T('Vencimientos de la deuda por año (Ps. millones)', 'Debt maturities by year (Ps. million)'), x, y, 9.5);
      const img = this.chart({ type: 'bar', data: { labels: yrs, datasets: [{ label: this.T('Principal', 'Principal'), data: yrs.map((k) => byY[k]), backgroundColor: PALETTE[0], maxBarThickness: 36 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(w * 1.6), Math.round((h - 16) * 1.6));
      return this.image(img, x, y, w, h - 16);
    }

    // ================= 15. SOURCES AND METHODOLOGY =================
    sourcesPage() {
      const M = this.M, short = this.cfg.short;
      let y = this.page('L', this.T('Fuentes y metodología', 'Sources and Methodology'), this.T('Todo el contenido proviene de información pública; cada bloque de datos se actualiza automáticamente con la cadencia indicada', 'All content comes from public information; each data block refreshes automatically at the cadence shown'));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const d = (iso) => this.date((iso || '').slice(0, 10));
      const rows = [
        [this.T('Estados financieros trimestrales, acumulados y anuales', 'Quarterly, YTD and annual statements'), this.T('días hábiles', 'weekdays'), M.L(CFG.methodStatements), d(M.FIN.generatedAt)],
        [this.T('Tráfico mensual por aeropuerto', 'Monthly traffic by airport'), this.T('misma corrida', 'same run'), M.L(CFG.methodTraffic), d(M.TR.generatedAt)],
        [this.T('Guía de la administración', 'Management guidance'), this.T('misma corrida', 'same run'), M.L(CFG.methodGuidance), d(M.GD.generatedAt)],
        [this.T('Comentarios del estado de resultados', 'Income-statement comments'), this.T('por trimestre (revisados)', 'per quarter (reviewed)'), this.T('informes y transcripciones de conferencias', 'reports and earnings-call transcripts'), d(M.CM.updatedAt)],
        [this.T('Resumen ejecutivo', 'Executive summary'), this.T('con cada reporte', 'with each report'), this.T('redactado a partir de los datos y comunicados', 'written from the data files and releases'), d(M.SUM.updatedAt)],
        [this.T('Precios, dividendos, tipo de cambio, tasas', 'Prices, dividends, FX, yields'), this.T('diario, tras el cierre de la BMV', 'daily after the BMV close'), 'Yahoo Finance · FRED', d(M.MK.generatedAt)],
        [this.T('Referencia: acciones, concesiones, deuda, eventos', 'Reference: shares, concessions, debt, events'), this.T('por evento', 'event-driven'), this.T(`comunicados de ${short}, revisados a mano`, `${short} releases, hand-reviewed`), d(M.REF.updatedAt)],
        [this.T('Tráfico nacional (comparación con México)', 'National traffic (Mexico comparison)'), this.T('diario', 'daily'), this.T('AFAC, estadística operativa de aeropuertos', 'AFAC airport operating statistics'), this.MX ? d(this.MX.generatedAt) : '—'],
      ];
      let yl = this.heading(this.T('Cómo se actualiza cada bloque', 'How each block is refreshed'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [M.t('block'), M.t('cadence'), M.t('mechanism'), M.t('lastUpdate')], body: rows, meta: rows.map(() => ['left', 'left', 'left small', '']), size: 7.6, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 }, 1: { halign: 'left', cellWidth: wl * 0.18 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.14 } } });
      const meth = [
        this.T('IFRIC 12: el operador de una concesión registra las obras que construye para el concedente como ingreso y costo de construcción. La vista «sin IFRIC 12» resta ese ingreso y ese costo; el EBITDA (ajustado) no cambia, el margen sí.', 'IFRIC 12: a concession operator books the works it builds for the grantor as construction revenue and cost. The "ex-IFRIC 12" view removes that revenue and cost; (adjusted) EBITDA is unchanged, the margin is not.'),
        this.T('Acumulado y UDM: el acumulado usa las columnas de seis, nueve o doce meses de cada informe; los últimos doce meses suman los cuatro trimestres más recientes. El balance es siempre al cierre del periodo.', 'YTD and LTM: year-to-date uses the six-, nine- or twelve-month columns of each report; last twelve months adds the four most recent quarters. The balance sheet is always the period-end position.'),
        this.T(`Próximos resultados: cuando ${short} publica su calendario, la fecha se marca «confirmada»; mientras tanto se supone la mediana del rezago entre el cierre del trimestre y la publicación del mismo trimestre en los tres años anteriores. El próximo reporte de tráfico se estima con la mediana del día de publicación de los últimos doce.`, `Next results: once ${short} publishes its calendar the date is marked "confirmed"; until then it is assumed from the median lag between quarter-end and release for the same quarter in the previous three years. The next traffic report is estimated from the median release day of the last twelve.`),
        M.L(CFG.debtNote),
        this.T('Mercado: cierres diarios de Yahoo Finance (precio, sin dividendos reinvertidos); tipo de cambio de la Fed H.10 (FRED DEXMXUS).', 'Market: Yahoo Finance daily closes (price only, dividends not reinvested); Fed H.10 FX rate (FRED DEXMXUS).'),
      ];
      yl = this.heading(this.T('Metodología', 'Methodology'), this.cur.x0, yl + 10, 10);
      yl = this.bullets(meth, this.cur.x0, yl, wl, 7.7, { gap: 3 });
      const srcs = (CFG.sources || []).map((s) => [M.L(s.t), M.L(s.d), s.u.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].slice(0, 44)]);
      let yr = this.heading(this.T('Fuentes', 'Sources'), xr, y, 10);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Fuente', 'Source'), this.T('Qué aporta', 'What it provides'), 'URL'], body: srcs, meta: srcs.map(() => ['bold left', 'left small', 'left small']), size: 7.6, cols: { 0: { halign: 'left', cellWidth: wr * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wr * 0.28 } } });
      yr = this.text(this.T(`Este documento se generó automáticamente el ${this.longDate(this.today)} desde fnam.mx/${CFG.slug} con los datos vigentes en ese momento; las cifras de mercado son del último cierre disponible y el resto de la información de los últimos informes publicados por ${short}. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.today)} from fnam.mx/${CFG.slug} with the data current at that moment; market figures are from the latest available close and everything else from ${short}'s latest published reports. It is not investment advice.`), xr, yr + 12, wr, 8.2, 'normal', MUTED);
      this.font('bold', 9, ACCENT); this.pdf.text(tx(this.confidential()), xr, yr + 16);
    }
  }

  window[PREFIX + '_PRESENT'] = { build };
  window.FNAM_AIRPORT_PRESENT = { AirportDoc, build };
  P.autoRun(build);
})();
