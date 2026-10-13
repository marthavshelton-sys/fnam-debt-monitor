/* The American Consumer: board presentation (PDF).
   One click builds a Letter PDF from what the page shows at that moment. Nothing is typed or computed here: the figures
   come from window.CONS_MODEL (the page's data and formatters) and from the page's own tables, the sentences are the ones
   the page composed (read from its own elements, in the language on screen) and every chart is drawn again off-screen from
   the options the page drew it with (CONS_UI.printConfig). The generic engine (pages, tables, tiles, cover, linked contents
   page, footers) lives in /assets/present-core.js; this file only lays out this page's sections. It follows the Mexican
   Consumer deck (/mx/consumidor/present.js), with the 50 states and the District of Columbia in two columns and the
   company tables read from the page. */
(function () {
  'use strict';
  const P = window.FNAM_PRESENT; if (!P) return;
  const { tx } = P, { INK, MUTED, ACCENT, GRID } = P.C;
  const K = 1.3;   // off-screen charts are drawn at 1.3 px per PDF point: the page's 11 px chart text prints at 8.5 pt
  const $ = (id) => document.getElementById(id);
  const rgbOf = (c) => {
    if (/^#[0-9a-f]{6}$/i.test(c)) return [1, 3, 5].map((p) => parseInt(c.slice(p, p + 2), 16));
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? [+m[1], +m[2], +m[3]] : null;
  };

  // the points of "At a Glance" by topic (the page tags each point with its topic)
  const TOPIC = {
    households: ['Hogares', 'Households'], income: ['Ingreso', 'Income'], funds: ['Fuentes y usos de fondos', 'Sources and uses of funds'], deciles: ['Gasto por decil de ingreso', 'Spending by income decile'],
    credit: ['Crédito', 'Credit'], stress: ['Apalancamiento y estrés financiero', 'Leverage and financial stress'], wealth: ['Riqueza', 'Wealth'], kshape: ['Economía en forma de K', 'The K-shaped economy'], companies: ['Lo que reportan las empresas', 'What companies report'],
  };
  // short names of the sources for the "data through" line under each page title (the full names print in the page's note)
  const SRC = {
    census: ['Censo, ACS', 'Census, ACS'], cps: ['Censo, CPS ASEC', 'Census, CPS ASEC'], bea: ['BEA, ingreso y gasto personal', 'BEA, personal income and outlays'], beaStates: ['BEA, estados', 'BEA, states'],
    cex: ['BLS, gastos del consumidor', 'BLS, consumer expenditures'], cexHist: ['BLS, gastos por quintil', 'BLS, expenditures by quintile'], dfa: ['Fed, cuentas distributivas', 'Fed, distributional accounts'],
    scf: ['Fed, Encuesta de Finanzas del Consumidor', 'Fed, Survey of Consumer Finances'], nyfed: ['Fed de Nueva York, deuda', 'New York Fed, debt'], nyfedStates: ['Fed de Nueva York, estados', 'New York Fed, states'],
    board: ['Reserva Federal', 'Federal Reserve'], courts: ['Tribunales de EE. UU., quiebras', 'U.S. Courts, bankruptcies'], phillyCards: ['Fed de Filadelfia, tarjetas', 'Philadelphia Fed, cards'],
    sce: ['Fed de Nueva York, expectativas', 'New York Fed, expectations'], fsa: ['Ayuda Federal para Estudiantes', 'Federal Student Aid'], cfpbBnpl: ['CFPB', 'CFPB'], shed: ['Fed, SHED', 'Fed, SHED'],
    beaDist: ['BEA, distribución del ingreso', 'BEA, income distribution'], atlWages: ['Fed de Atlanta, salarios', 'Atlanta Fed, wages'], umich: ['Universidad de Michigan', 'University of Michigan'],
    pceDist: ['BLS-BEA, consumo por decil', 'BLS-BEA, consumption by decile'], jointDist: ['BEA-BLS, distribución conjunta', 'BEA-BLS, joint distribution'], nes: ['Censo, negocios sin empleados', 'Census, nonemployer businesses'],
  };

  // The pages of the deck, in the page's own order. `cols` are columns (relative width `w`) of rows of charts (relative
  // heights `hs`); a chart is named by the id of its canvas on the page, and two ids in brackets are the two charts of one
  // card, printed side by side under the card's heading. `stats` is the section's row of figures (`src`: the sources of
  // those figures that no chart of the page names), `callouts` the sentences the page composes under its charts.
  // A horizontal bar chart with many rows gets a column to itself: its rows need the height.
  const PAGES = [
    { sec: 'demografia', stats: 'demoStats', callouts: ['demoCallout'], cols: [{ w: 1, rows: [['chAge'], ['chOwnAge']] }, { w: 1, rows: [['chRace']] }, { w: 1.05, rows: [['chHhTypes'], ['chEdu']] }] },
    { sec: 'ingreso', part: ['Nivel y distribución', 'Level and distribution'], stats: 'incomeStats', src: ['cps'], callouts: ['incomeCallout'], cols: [{ rows: [['chCps', 'chBrackets', 'chQuintiles']] }] },
    { sec: 'ingreso', part: ['Por grupo', 'By group'], cols: [{ w: 1.1, rows: [['chIncGroups']] }, { w: 1, rows: [['chEarnEdu'], ['chReceive']] }] },
    { sec: 'ingreso', part: ['Por estado', 'By state'], states: { map: 'income', maps: ['medHH', 'poverty'], table: ['medHH', 'pcpiAdj', 'poverty', 'gini'] } },
    { sec: 'fondos', stats: 'fundsStats', callouts: ['fundsCallout'], cols: [{ w: 2, rows: [['chSrcHist', 'chUseHist'], ['chSaving']] }, { w: 1, rows: [['chPce']] }] },
    { sec: 'deciles', stats: 'cexStats', callouts: ['cexCallout'], cols: [{ rows: [['chDecSpendInc', 'chDecShare', 'chBasics'], ['chDecSources', 'chAgeSpend', 'chDecTenure']] }] },
    { sec: 'deciles', part: ['Qué gasta cada decil', 'What each decile spends on'], heat: 'heatDeciles' },
    { sec: 'credito', part: ['Saldos, costo y morosidad', 'Balances, cost and delinquency'], stats: 'creditStats', cols: [{ rows: [['chDebtType', 'chDebtAge', 'chT90'], ['chRates', 'chDsr', 'chBank']] }] },
    { sec: 'credito', part: ['Quién usa crédito y deuda por estado', 'Who uses credit and debt by state'], states: { map: 'debt', maps: ['total'], chart: 'chScfDebt', table: ['total', 'mortgage', 'card', 'dqCard'] } },
    { sec: 'estres', part: ['Apalancamiento', 'Leverage'], stats: 'stressStats', callouts: ['stressCallout', 'levCallout'], cols: [{ rows: [[['chLevD2A', 'chLevCash']]] }] },
    { sec: 'estres', part: ['Pagos de deuda y tarjetas', 'Debt payments and cards'], cols: [{ rows: [[['chBurden40', 'chBurdenLate']], ['chCardPay', 'chCardBuy']] }] },
    { sec: 'estres', part: ['Crédito, préstamos estudiantiles y quiebras', 'Credit, student loans and bankruptcies'], callouts: ['accessCallout', 'studentCallout'], cols: [{ rows: [['chExpDq', 'chAccess', 'chStudent'], ['chInsolv', 'chOrig']] }] },
    { sec: 'estres', part: ['Compra ahora, paga después y colchones de efectivo', 'Buy now, pay later and cash cushions'], stats: 'bnplStats', callouts: ['bnplCallout', 'bufferCallout'], cols: [{ w: 2, rows: [[['chBnplYear', 'chBnplSavings']]] }, { w: 1, rows: [['chBuffer']] }] },
    { sec: 'estres', part: ['Renta y quiebras por estado', 'Rent and bankruptcies by state'], states: { map: 'stress', maps: ['p30', 'bk'], table: ['p30', 'p50', 'bk', 'bkYoy'] } },
    { sec: 'riqueza', part: ['Quién la tiene', 'Who holds it'], stats: 'wealthStats', cols: [{ w: 1, rows: [['chWealthShare'], ['chWealthHist']] }, { w: 1.6, rows: [['chWealthMix']] }] },
    { sec: 'riqueza', part: ['Por grupo y por familia', 'By group and by family'], cols: [{ w: 2, rows: [[['chWealthDemoShare', 'chWealthDemoAvg']]] }, { w: 1, rows: [['chScfHist'], ['chScfOwn']] }] },
    { sec: 'economia-k', part: ['Gasto, ingreso y activos', 'Spending, income and assets'], stats: 'kStats', callouts: ['kCallout'], cols: [{ w: 1.3, rows: [['chKSpend'], ['chKIncome', 'chKEquity']] }, { w: 1.2, rows: [['chKMeasure']] }] },
    { sec: 'economia-k', part: ['Ahorro, precios, salarios y confianza', 'Saving, prices, wages and confidence'], callouts: ['kSpendCallout'], cols: [{ rows: [['chKGain', 'chKSpendGrowth', 'chKSaving'], ['chKPrices', 'chKWages', 'chKSent']] }] },
    { sec: 'empresas', part: ['Ventas comparables', 'Comparable sales'], comps: true },
    { sec: 'empresas', part: ['Trabajo por encargo: el conteo oficial', 'Gig work: the official count'], stats: 'gigStats', callouts: ['gigCallout'], cols: [{ rows: [[['chGigUS', 'chGigAvg']]] }] },
  ];

  // ---------- builder ----------
  async function build() {
    const M = window.CONS_MODEL;
    await P.run(M, [], async () => {
      // the charts are drawn for paper: with the page in its dark theme, the light one is put on while the deck is built
      const root = document.documentElement, theme = root.getAttribute('data-theme'), dark = M.UI.isDark();
      if (dark) { root.setAttribute('data-theme', 'light'); M.render(); }
      try {
        const doc = new ConsDoc(M);
        doc.cover();
        doc.at('resumen'); doc.summary(); doc.at(null); doc.contents();
        for (const pg of PAGES) {
          doc.at(pg.sec);
          if (pg.states) doc.statePage(pg); else if (pg.heat) doc.heatPage(pg); else if (pg.comps) doc.compsPage(pg); else doc.sectionPage(pg);
        }
        doc.at('empresas'); doc.companyPages();
        doc.at('fuentes'); doc.sourcesPage(); doc.methodPage(); doc.at(null);
        doc.contentsPage();
        doc.finish();
      } finally {
        if (dark) { if (theme == null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme); M.render(); }
      }
    });
  }

  class ConsDoc extends P.Doc {
    constructor(M) {
      const es = M.LANG === 'es', name = es ? 'El Consumidor Estadounidense' : 'The American Consumer';
      super(M, { slug: 'consumidor', short: name, name, url: 'fnam.mx/consumidor', fileStem: es ? 'Consumidor_Estadounidense' : 'American_Consumer',
        tickerLine: es ? 'Estados Unidos · ingreso, gasto, crédito y riqueza de los hogares' : 'United States · household income, spending, credit and wealth',
        confidential: { es: 'Fuente: Oficina del Censo, BEA, BLS, Reserva Federal, Fed de Nueva York y reportes de las empresas; no es asesoría de inversión.', en: 'Source: Census Bureau, BEA, BLS, Federal Reserve, New York Fed and company filings; not investment advice.' } });
      this.lang = es ? 'es' : 'en'; this.UI = M.UI; this.D = M.D;
      this.trackPages = true;   // page() records every page for the contents page
      this.meta = this.pageSectionMeta();
      const fh = document.querySelector('#fuentes h3'); this.meta.fuentes = { label: '', title: fh ? this.plain(fh) : this.T('Fuentes y Metodología', 'Sources and Methodology') };
    }
    at(sec) { this.sec = sec; }
    // The engine wraps a page's subtitle at the full width of the page, and a line measured to fit exactly can print a few
    // points past the margin. While the engine draws the page head, long text is wrapped here instead, a little narrower.
    page(orient, title, subtitle) {
      // a title still wider than the page at the engine's smallest size (12 pt) drops its middle part, the section's name
      if (title) { const g = P.PAGE[orient], parts = String(title).split(' · '); this.font('bold', 12, ACCENT); if (parts.length > 2 && this.tw(tx(P.titleCase(title, this.es))) > g.w - P.MARGIN.left - P.MARGIN.right) title = [parts[0]].concat(parts.slice(2)).join(' · '); }
      const pdf = this.pdf, orig = pdf.splitTextToSize;
      pdf.splitTextToSize = (t, w, o) => (typeof t === 'string' ? this.wrap(t, w - 8) : orig.call(pdf, t, w, o));
      try { return super.page(orient, title, subtitle); } finally { pdf.splitTextToSize = orig; }
    }
    // lines of `text` no wider than `w` at the current font, measured glyph by glyph (the widths the PDF is written with)
    wrap(text, w) {
      const words = tx(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
      for (const wd of words) { const t = cur ? `${cur} ${wd}` : wd; if (cur && this.tw(t) > w) { lines.push(cur); cur = wd; } else cur = t; }
      if (cur) lines.push(cur);
      return lines;
    }

    // ----- the page's own text -----
    // Text of a page element in the deck's language, with its <b> runs as **bold**; badges, buttons and data tables are left out.
    rich(el) {
      if (!el) return '';
      const other = this.es ? 'en' : 'es';
      const walk = (n) => {
        if (n.nodeType === 3) return n.nodeValue;
        if (n.nodeType !== 1) return '';
        const c = n.classList;
        if (c.contains(other) || c.contains('pk') || c.contains('new') || n.tagName === 'BUTTON' || n.tagName === 'DETAILS' || n.tagName === 'CANVAS') return '';
        const inner = Array.prototype.map.call(n.childNodes, walk).join('');
        return (n.tagName === 'B' || n.tagName === 'STRONG') && inner.trim() ? `**${inner.trim()}**${/\s$/.test(inner) ? ' ' : ''}` : inner;
      };
      return Array.prototype.map.call(el.childNodes, walk).join('').replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/↗/g, '').trim();
    }
    plain(el) { return this.rich(el).replace(/\*\*/g, ''); }
    html(str) { const d = document.createElement('div'); d.innerHTML = str || ''; return this.rich(d); }
    // "Datos a: Censo, ACS 2024 · BEA, estados 2025" for the sources a page draws on
    through(ids) {
      const parts = ids.map((id) => { const s = this.D.sources[id], n = SRC[id]; return s && n ? `${this.T(n[0], n[1])} ${this.UI.date(s.asOf)}` : null; }).filter(Boolean);
      return parts.length ? this.T('Datos a: ', 'Data through: ') + parts.join(' · ') : '';
    }
    // the full names of the same sources, for the note at the foot of the page
    sourceNote(ids) {
      const parts = ids.map((id) => { const s = this.D.sources[id]; return s ? `${this.M.name('srcShort', id)} (${this.UI.date(s.asOf)}${s.stored ? this.T(', dato guardado', ', stored value') : ''})` : null; }).filter(Boolean);
      return parts.length ? this.T('Fuentes: ', 'Sources: ') + parts.join('; ') + this.T('. Cálculos de fnam.mx donde la página lo indica.', '. fnam.mx calculations where the page says so.') : '';
    }
    shown(el) { return !!(el && !el.closest('[hidden]')); }
    has(id) { const cv = $(id); return !!(cv && this.UI.specs[id] && this.UI.charts[id] && this.shown(cv)); }
    srcOf(id) { const cv = $(id), el = cv && cv.closest('.card') && cv.closest('.card').querySelector('[data-src]'); return el ? el.getAttribute('data-src').split(',') : []; }
    uniq(a) { return a.filter((x, i) => x && a.indexOf(x) === i); }
    statsOf(id, max = 8) {
      const row = $(id); if (!this.shown(row)) return [];
      return Array.prototype.slice.call(row.querySelectorAll('.stat'), 0, max).map((s) => ({ v: this.plain(s.querySelector('.v')), l: this.plain(s.querySelector('.l')) }));
    }
    title(pg) { const m = this.meta[pg.sec] || {}; return `${m.label ? m.label + ' · ' : ''}${m.title || ''}${pg.part ? ' · ' + this.T(pg.part[0], pg.part[1]) : ''}`; }

    // ================= cover =================
    cover() {
      this.page('L');
      const c = this.cur, cx = c.x0 + 30, w = c.x1 - cx;
      this.pdf.setFillColor(...ACCENT); this.pdf.rect(0, 0, 14, c.h, 'F');
      this.font('bold', 30, INK); this.pdf.text(tx(this.cfg.name), cx, 150);
      let y = 186;
      this.font('bold', 17, ACCENT); this.pdf.text(tx(this.cfg.tickerLine), cx, y); y += 34;
      this.font('normal', 15, INK); this.pdf.text(tx(this.longDate(this.today)), cx, y); y += 46;
      this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.8); this.pdf.line(cx, y, cx + 300, y);
      // what the figures stand on: the page's own "data through" row, then the sources
      const row = $('asofRow'), stamps = row ? Array.prototype.map.call(row.children, (s) => this.plain(s)).filter(Boolean) : [];
      const lines = [stamps.join(' · '),
        this.T('Elaborado únicamente con información pública: series y encuestas de la Oficina del Censo, la BEA, la BLS, la Reserva Federal y los bancos de la Reserva Federal, y los reportes de resultados de las empresas ante la SEC', 'Built only from public information: series and surveys of the Census Bureau, BEA, BLS, the Federal Reserve Board and the Reserve Banks, and company results releases filed with the SEC') + ` · ${this.cfg.url}`];
      let yy = c.h - 140;
      for (const l of lines) yy = this.text(l, cx, yy, w, 10, 'normal', MUTED, 1.35) + 4;
      this.font('bold', 10, ACCENT); this.pdf.text(tx(this.confidential()), cx, yy + 12);
    }

    // ================= executive summary: the page's "At a Glance", the first half down the left, the rest down the right =================
    summary() {
      const pts = Array.prototype.map.call(document.querySelectorAll('#glance .pt'), (el) => ({ k: el.getAttribute('data-k'), text: this.rich(el.querySelector('div')) })).filter((p) => p.text);
      const secs = pts.map((p, i) => ({ title: `${i + 1}. ${TOPIC[p.k] ? this.T(TOPIC[p.k][0], TOPIC[p.k][1]) : ''}`, paras: [p.text] }));
      const half = Math.ceil(secs.length / 2);
      const tiles = Array.prototype.map.call(document.querySelectorAll('#kpiStrip .kpi'), (t) => ({ v: [this.plain(t.querySelector('.val .n')), this.plain(t.querySelector('.val .unit'))].filter(Boolean).join(' '), l: `${this.plain(t.querySelector('.lbl'))} · ${this.plain(t.querySelector('.delta'))}` }));
      const gen = this.D.generatedAt ? this.T(`Redactado con los datos de la página; datos generados el ${this.M.when(this.D.generatedAt)} (hora de la Ciudad de México)`, `Written from the page's data; data generated ${this.M.when(this.D.generatedAt)} (Mexico City time)`) : '';
      this.execSummary(secs, gen, tiles.length ? (y) => this.tiles(tiles, y, 60) - 2 : null, [secs.slice(0, half), secs.slice(half)]);
    }

    // ================= contents =================
    contentsPage() {
      this.drawContents(this.tocEntries(this.meta), this.T(`Cada fila es un enlace a su página. La numeración de las secciones es la de ${this.cfg.url}.`, `Every row links to its page. Sections are numbered as on ${this.cfg.url}.`));
    }

    // ================= a section: figures, charts, what the page says about them =================
    // a caption in at most three lines: whole sentences while they fit, never a sentence cut in half without saying so
    capLines(cap, w, max = 3) {
      this.font('normal', 7.2, MUTED);
      const split = (t) => this.wrap(t, w - 2);
      let lines = split(cap); if (lines.length <= max) return lines;
      const parts = cap.split(/(?<=[.;])\s+/); let keep = '';
      for (const p of parts) { const t = keep ? `${keep} ${p}` : p; if (split(t).length > max) break; keep = t; }
      if (keep) return split(keep.replace(/;$/, '.'));
      lines = lines.slice(0, max); lines[max - 1] = lines[max - 1].replace(/\s+\S*$/, '') + '...'; return lines;
    }
    // the legend the page prints under a chart, set here in small type above it; returns the y under the legend
    legend(items, x, y, w, draw) {
      const size = 6.9, lh = 9.4; this.font('normal', size, MUTED);
      let cx = x, cy = y;
      for (const it of items) {
        this.font('normal', size, MUTED);
        const lines = this.wrap(it.l, w - 11), iw = 9 + Math.max(...lines.map((l) => this.tw(l))) + 9;
        if (cx > x && (lines.length > 1 || cx + iw - 9 > x + w)) { cx = x; cy += lh; }   // an entry longer than the cell takes lines of its own
        if (draw) {
          this.pdf.setFillColor(...(rgbOf(it.c) || MUTED));
          if (it.line) this.pdf.rect(cx, cy + 3.4, 6.5, 1.5, 'F'); else this.pdf.rect(cx, cy + 1.6, 5, 5, 'F');
          this.font('normal', size, MUTED); lines.forEach((l, i) => this.pdf.text(l, cx + 9, cy + i * lh + size * 0.85));
        }
        if (lines.length > 1) { cx = x; cy += lines.length * lh; } else cx += iw;
      }
      return (cx === x && cy > y ? cy : cy + lh) + 2;
    }
    // the heading of a chart: one line, or two when the title (with the option chosen on the page) is longer than its cell
    cellHeading(title, x, y, w, size0 = 9.6, color = ACCENT) {
      const t = P.titleCase(title, this.es); let size = size0, lines;
      for (;;) { this.font('bold', size, color); lines = this.wrap(t, w - 2); if (lines.length <= 2 || size <= 7.6) break; size -= 0.4; }
      lines = lines.slice(0, 2); this.pdf.text(lines, x, y + size * 0.85);
      return y + lines.length * size * 1.3 + 2.4;
    }
    // the heading of a chart's card, with the option chosen on the page (a group, a measure) after a dot
    cardTitle(card) {
      let title = this.plain(card.querySelector('h3'));
      const on = card.querySelector('.seg button[aria-pressed="true"]'); if (on) title += ` · ${on.textContent.trim()}`;
      return title;
    }
    // the heading and caption that belong to one canvas: a card with a second heading before the canvas (two charts stacked
    // in one card) gives that heading and the caption under it; otherwise the card's own
    headOf(cv) {
      const card = cv.closest('.card'), hs = Array.prototype.filter.call(card.querySelectorAll('h3'), (h) => h.compareDocumentPosition(cv) & Node.DOCUMENT_POSITION_FOLLOWING);
      const h = hs.length ? hs[hs.length - 1] : card.querySelector('h3');
      let cap = h && h.nextElementSibling && h.nextElementSibling.classList.contains('cap') ? h.nextElementSibling : null;
      if (!cap) cap = card.querySelector('.cap');
      let title = h === card.querySelector('h3') ? this.cardTitle(card) : this.plain(h);
      return { title, cap: this.plain(cap) };
    }
    // the chart itself, filling the box (x, y, w, h); a horizontal bar chart with many rows is drawn larger and scaled down
    drawChart(id, x, y, w, h) {
      if (h < 50) return;
      // A horizontal bar chart needs a given height for its rows (the more its labels wrap, the more). When the cell is
      // shorter, the chart is drawn larger and scaled down: a larger canvas has room for longer label lines, so fewer of them
      // wrap, and its text prints smaller (never below 6.8 pt).
      const make = (k) => this.UI.printConfig(id, Math.round(w * k));
      let k = K, cfg = make(k); if (!cfg) return;
      while (cfg.need && cfg.need > h * k && k < 1.62) { k = Math.min(1.62, k + 0.08); cfg = make(k); }
      cfg.options.devicePixelRatio = 2.5;
      // An axis title longer than the plot is tall is cut by the canvas: it is set smaller, and left out when it still does
      // not fit (the legend already says which series reads on which axis).
      const mc = document.createElement('canvas').getContext('2d'), room = h * k - 40;
      Object.values(cfg.options.scales || {}).forEach((sc) => {
        if (!sc.title || !sc.title.display || !sc.title.text) return;
        let size = (sc.title.font && sc.title.font.size) || 11;
        const fits = (z) => { mc.font = `600 ${z}px Helvetica, Arial, sans-serif`; return mc.measureText(String(sc.title.text)).width <= room; };
        while (size > 8 && !fits(size)) size -= 0.5;
        if (fits(size)) sc.title.font = Object.assign({}, sc.title.font, { size }); else sc.title.display = false;
      });
      this.image(this.chart(cfg, Math.round(w * k), Math.round(h * k)), x, y, w, h);
    }
    // one chart with the heading, caption and legend of its card on the page
    chartCell(id, x, y, w, h) {
      const cv = $(id), hd = this.headOf(cv);
      let yy = this.cellHeading(hd.title, x, y, w);
      if (hd.cap) { const ls = this.capLines(hd.cap, w); this.font('normal', 7.2, MUTED); this.pdf.text(ls, x, yy + 6.4); yy += ls.length * 9 + 3; }
      const items = this.UI.legends[id]; if (items && items.length) yy = this.legend(items, x, yy + 1, w, true);
      this.drawChart(id, x, yy, w, y + h - yy);
    }
    // the two charts of one card side by side: the card's heading and caption once, then each chart under its own small
    // heading; a legend the card prints once (for both charts) prints once above them
    pairCell(ids, x, y, w, h) {
      const cv0 = $(ids[0]), card = cv0.closest('.card'), gap = 14;
      let yy = this.cellHeading(this.cardTitle(card), x, y, w);
      const cap = this.plain(card.querySelector('.cap'));
      if (cap) { const ls = this.capLines(cap, w, 2); this.font('normal', 7.2, MUTED); this.pdf.text(ls, x, yy + 6.4); yy += ls.length * 9 + 3; }
      const own = (id) => { const lg = document.querySelector(`[data-legend="${id}"]`), cv = $(id), box = cv && cv.closest('.chart-wrap') && cv.closest('.chart-wrap').parentElement; return !!(lg && box && box !== card && box.contains(lg)); };
      const shared = ids.filter((id) => this.UI.legends[id] && this.UI.legends[id].length && !own(id));
      for (const id of shared) yy = this.legend(this.UI.legends[id], x, yy + 1, w, true);
      const cw = (w - gap * (ids.length - 1)) / ids.length;
      ids.forEach((id, i) => {
        const cx = x + i * (cw + gap), cv = $(id), wrap = cv.closest('.chart-wrap'), box = wrap && wrap.parentElement, h4 = box && box.querySelector('h4');
        let cy = yy + 2;
        if (h4) cy = this.cellHeading(this.plain(h4), cx, cy, cw, 8.4, INK);
        if (own(id)) cy = this.legend(this.UI.legends[id], cx, cy + 1, cw, true);
        this.drawChart(id, cx, cy, cw, y + h - cy);
      });
    }
    cellOf(c, x, y, w, h) { if (Array.isArray(c)) { if (c.length > 1) this.pairCell(c, x, y, w, h); else this.chartCell(c[0], x, y, w, h); } else this.chartCell(c, x, y, w, h); }
    grid(cols, x0, y0, W, H, gap = 16) {
      const tw = cols.reduce((a, c) => a + (c.w || 1), 0); let x = x0;
      for (const c of cols) {
        const cw = (W - gap * (cols.length - 1)) * (c.w || 1) / tw, hs = c.rows.map((r, i) => (c.hs && c.hs[i]) || 1), th = hs.reduce((a, b) => a + b, 0);
        let y = y0;
        c.rows.forEach((row, ri) => {
          const rh = (H - gap * (c.rows.length - 1)) * hs[ri] / th, w1 = (cw - gap * (row.length - 1)) / row.length;
          row.forEach((cell, i) => this.cellOf(cell, x + i * (w1 + gap), y, w1, rh));
          y += rh + gap;
        });
        x += cw + gap;
      }
    }
    // the sentences the page composes, set off by a rule on their left; returns the height they take
    callout(texts, x, y, w, size, draw) {
      const o = { marker: false, lh: 1.32, gap: 4 }, h = this.measureBullets(texts, w - 10, size, o) - 4;
      if (draw) { this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(1.6); this.pdf.line(x + 1, y, x + 1, y + h); this.bullets(texts, x + 10, y, w - 10, size, o); }
      return h;
    }
    // the charts of a page that the page is showing (a block of data missing leaves the layout); pairs keep what is left
    liveCols(cols) {
      const keep = (cell) => (Array.isArray(cell) ? (cell.filter((id) => this.has(id)).length ? cell.filter((id) => this.has(id)) : null) : this.has(cell) ? cell : null);
      return cols.map((c) => { const rows = [], hs = []; c.rows.forEach((r, i) => { const rr = r.map(keep).filter(Boolean); if (rr.length) { rows.push(rr); hs.push((c.hs && c.hs[i]) || 1); } }); return { w: c.w, rows, hs }; }).filter((c) => c.rows.length);
    }
    textsOf(ids) { return (ids || []).map((id) => { const el = $(id); return this.shown(el) ? this.rich(el) : ''; }).filter(Boolean); }
    sectionPage(pg) {
      const cols = this.liveCols(pg.cols);
      const stats = pg.stats ? this.statsOf(pg.stats) : [];
      if (!cols.length && !stats.length) return;
      // the sources of the page: those of its charts and those of the figures in its row of tiles (`src`)
      const ids = [].concat(...cols.map((c) => [].concat(...c.rows.map((r) => [].concat(...r))))), src = this.uniq([].concat(...ids.map((id) => this.srcOf(id))).concat(stats.length ? pg.src || [] : []));
      let y = this.page('L', this.title(pg), this.through(src));
      const x0 = this.cur.x0, W = this.width();
      if (stats.length) y = this.tiles(stats, y, 44) - 2;
      const texts = this.textsOf(pg.callouts);
      const note = this.sourceNote(src), nh = note ? this.measureText(note, W, 7, 1.25) + 2 : 0;
      const cs = 8.4, ch = texts.length ? this.callout(texts, x0, 0, W, cs, false) + 10 : 0;
      const bottom = this.cur.y1 - nh - ch;
      if (cols.length) this.grid(cols, x0, y, W, bottom - y - 6);
      if (texts.length) this.callout(texts, x0, bottom + 4, W, cs, true);
      if (note) this.note(note, this.cur.y1 - nh + 2, 7);
    }

    // ================= what each decile spends on: the page's heat table, colors and all =================
    // The engine's table has no per-cell fill, so while this table is measured and drawn each cell's background is set
    // from the color the page gave it.
    // The engine's table collapses white space and has no per-cell fill. While a table of this deck is measured and drawn,
    // a cell's lines (joined with ¶) are split again, and the heat table's cells get the background the page gave them.
    withFills(fills, fn) { this._fills = fills; try { return fn(); } finally { this._fills = null; } }
    table(o) {
      const fills = this._fills;
      const wrapOpt = (opt) => { const orig = opt.didParseCell; opt.didParseCell = (d) => {
        if (orig) orig(d);
        const t = Array.isArray(d.cell.text) ? d.cell.text.join(' ') : String(d.cell.text || '');
        if (t.indexOf('¶') >= 0) d.cell.text = t.split('¶').map((x) => x.trim()).filter(Boolean);
        const f = fills && d.section === 'body' && fills[d.row.index] && fills[d.row.index][d.column.index]; if (f) { d.cell.styles.fillColor = f.bg; d.cell.styles.textColor = f.fg; }
      }; return opt; };
      const hadW = !!window.autoTable, origW = window.autoTable, proto = window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API, origP = proto && proto.autoTable;
      if (hadW) window.autoTable = (pdf, opt) => origW(pdf, wrapOpt(opt));
      if (origP) proto.autoTable = function (opt) { return origP.call(this, wrapOpt(opt)); };
      try { return super.table(o); } finally { if (hadW) window.autoTable = origW; if (origP) proto.autoTable = origP; }
    }
    heatPage(pg) {
      const tbl = $(pg.heat); if (!this.shown(tbl) || !tbl.rows.length) return;
      const card = tbl.closest('.card');
      const head = Array.prototype.map.call(tbl.tHead ? tbl.tHead.rows[0].cells : tbl.rows[0].cells, (c) => this.plain(c));
      const rows = Array.prototype.slice.call(tbl.tBodies[0].rows);
      const body = rows.map((r) => Array.prototype.map.call(r.cells, (c) => this.plain(c)));
      const fills = rows.map((r) => Array.prototype.map.call(r.cells, (c) => { const bg = rgbOf(c.style.backgroundColor); if (!bg) return null; const fg = rgbOf(c.style.color) || INK; return { bg, fg }; }));
      const meta = rows.map((r) => Array.prototype.map.call(r.cells, (c, i) => (i === 0 ? 'left' : '') + (r.classList.contains('sep') ? ' bold' : '')));
      const se = card && card.querySelector('[data-src]'), src = se ? se.getAttribute('data-src').split(',') : [];
      let y = this.page('L', this.title(pg), this.through(src));
      const sc = $('scaleHeat'), scale = sc ? Array.prototype.map.call(sc.children, (e) => this.plain(e)).filter(Boolean).join(' · ') : '';
      const W = this.width(), cap = this.plain($('capHeat'));
      const note = [scale, this.sourceNote(src)].filter(Boolean).join(' '), nh = this.measureText(note, W, 7, 1.25) + 2;
      if (cap) { this.font('normal', 8.4, MUTED); const ls = this.wrap(cap, W); this.pdf.text(ls, this.cur.x0, y + 7); y += ls.length * 11 + 6; }
      const cols = { 0: { halign: 'left', cellWidth: W * 0.25 } };
      this.withFills(fills, () => this.fitTable({ y, w: W, head, body, meta, cols, pad: { top: 3.2, bottom: 3.2, left: 3, right: 3 } }, [9.6, 9.2, 8.8, 8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - nh - 4));
      this.note(note, this.cur.y1 - nh + 2, 7);
    }

    // ================= a section by state: the map(s), and the 50 states and the District of Columbia in two columns =================
    // The map of the page, drawn on a canvas from the same shapes, classes and colors (seven groups with the same number of states).
    mapImage(metric, list, wpx) {
      const G = window.FNAM_US_STATES, UI = this.UI, L = UI.mapLayout || { small: {}, nudge: {} }, k = wpx / G.width, hpx = Math.round(G.height * k), R = 3;
      const cv = document.createElement('canvas'); cv.width = wpx * R; cv.height = hpx * R;
      const c = cv.getContext('2d'); c.scale(k * R, k * R);
      const by = {}; list.forEach((s) => { by[s.code] = metric.get(s); });
      const br = UI.breaks(list.map((s) => metric.get(s)), 7);
      const fill = (v) => { const cl = UI.classOf(v, br); return cl < 0 ? UI.css('--seq-none') : UI.seq(cl); };
      c.lineJoin = 'round'; c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
      Object.keys(G.states).forEach((code) => { const p = new Path2D(G.states[code].d); c.fillStyle = fill(by[code]); c.fill(p); c.stroke(p); });
      // the state codes, as on the page; the small states get a chip under the map instead
      c.textAlign = 'center'; c.textBaseline = 'middle';
      Object.keys(G.states).forEach((code) => { if (L.small[code]) return; const g = G.states[code], n = L.nudge[code] || [0, 0]; c.font = `600 ${g.a >= 4500 ? 17 : 13}px Helvetica, Arial, sans-serif`; c.fillStyle = UI.inkOn(fill(by[code])); c.fillText(code, g.c[0] + n[0], g.c[1] + n[1]); });
      return { url: cv.toDataURL('image/png'), ratio: G.height / G.width, br, fill, by };
    }
    // map with its heading, its color scale and the states too small to label
    mapBlock(metric, list, x, y, w) {
      const UI = this.UI, L = UI.mapLayout || { small: {} }, sf = metric.short || metric.fmt;
      let yy = this.heading(metric.label, x, y, 9.6, w) - 1;
      const m = this.mapImage(metric, list, Math.round(w * 2)), h = w * m.ratio;
      this.image(m.url, x, yy, w, h); yy += h + 4;
      // scale: seven classes, with each cut under the boundary between two of them
      const sw = Math.min(46, (w - 6 * 2) / 7);
      for (let i = 0; i < 7; i++) { this.pdf.setFillColor(...rgbOf(UI.seq(i))); this.pdf.rect(x + i * (sw + 2), yy, sw, 6, 'F'); }
      this.font('normal', 6, MUTED);
      for (let i = 0; i < 6; i++) this.pdf.text(tx(sf(m.br[i])), x + (i + 1) * (sw + 2) - 1, yy + 13, { align: 'center' });
      yy += 18;
      let cx = x;
      Object.keys(L.small).forEach((code) => {
        if (m.by[code] === undefined) return;
        const t = tx(`${code} ${m.by[code] == null ? '—' : sf(m.by[code])}`), hex = m.fill(m.by[code]);
        this.font('bold', 6.2, UI.inkOn(hex) === '#ffffff' ? [255, 255, 255] : INK); const tw = this.tw(t) + 7;
        if (cx > x && cx + tw > x + w) { cx = x; yy += 13; }
        this.pdf.setFillColor(...(rgbOf(hex) || GRID)); this.pdf.roundedRect(cx, yy, tw, 10.5, 2, 2, 'F'); this.pdf.text(t, cx + 3.5, yy + 7.5); cx += tw + 3;
      });
      return yy + 15;
    }
    statePage(pg) {
      const T = this.D.states, MP = this.M.maps[pg.states.map]; if (!T || !MP) return;
      const byId = (id) => MP.metrics.filter((m) => m.id === id)[0];
      const maps = pg.states.maps.map(byId).filter(Boolean), tcols = pg.states.table.map(byId).filter(Boolean); if (!maps.length || !tcols.length) return;
      const chart = pg.states.chart && this.has(pg.states.chart) ? pg.states.chart : null;
      const src = this.uniq(tcols.map((m) => m.src || MP.src).concat(chart ? this.srcOf(chart) : []));
      let y = this.page('L', this.title(pg), this.through(src));
      const x0 = this.cur.x0, W = this.width(), gap = 18, wl = W * (chart ? 0.34 : 0.3), xr = x0 + wl + gap, wr = W - wl - gap;
      const notes = this.uniq(maps.map((m) => this.html(MP.note(m))));
      const note = [this.sourceNote(src)].concat(notes).join(' '), nh = this.measureText(note, W, 7, 1.25) + 2, bottom = this.cur.y1 - nh - 4;
      // left: the map(s); with one map, a national chart of the section goes under it
      const G = window.FNAM_US_STATES, slots = maps.length + (chart ? 1.4 : 0), mw = Math.min(wl, ((bottom - y) / slots - 50) / (G.height / G.width));
      let yl = y;
      for (const m of maps) yl = this.mapBlock(m, T.list, x0, yl, mw) + 6;
      if (chart && bottom - yl > 90) this.chartCell(chart, x0, yl, wl, bottom - yl);
      // right: the states ranked by the first map's figure in two columns, then the country
      const main = maps[0], rows = T.list.filter((s) => main.get(s) != null).sort((a, b) => main.get(b) - main.get(a));
      const cell = (m, v) => (v == null ? this.T('n. d.', 'n/a') : m.fmt(v));
      const half = Math.ceil((rows.length + 1) / 2), parts = [rows.slice(0, half), rows.slice(half)];
      const head = ['#', this.T('Estado', 'State')].concat(tcols.map((m) => m.btn)), tg = 12, tw = (wr - tg) / 2;
      const cols = { 0: { cellWidth: 15 }, 1: { halign: 'left', cellWidth: tw * 0.27 } };
      const sizes = [7.4, 7, 6.6, 6.2, 5.9, 5.6];
      const spec = (part, from, last) => {
        const body = part.map((s, i) => [String(from + i + 1), s.name].concat(tcols.map((m) => cell(m, m.get(s))))), meta = part.map(() => ['muted', 'left'].concat(tcols.map((m, i) => (i === 0 ? 'bold' : ''))));
        if (last) { body.push(['', this.T('Estados Unidos', 'United States')].concat(tcols.map((m) => cell(m, m.us)))); meta.push(['', 'bold left'].concat(tcols.map(() => 'bold'))); }
        return { y, w: tw, head, body, meta, cols, pad: { top: 1.6, bottom: 1.6, left: 2.5, right: 2.5 } };
      };
      // one size for both columns: the largest at which each fits above the note
      const a = spec(parts[0], 0, false), b = spec(parts[1], half, true);
      let size = sizes[sizes.length - 1];
      for (const s of sizes) { const ra = this.measureTable({ ...a, x: xr, size: s, pageBreak: 'auto' }), rb = this.measureTable({ ...b, x: xr + tw + tg, size: s, pageBreak: 'auto' }); if (ra.pages === 1 && rb.pages === 1 && ra.finalY <= bottom && rb.finalY <= bottom) { size = s; break; } }
      this.table({ ...a, x: xr, size }); this.table({ ...b, x: xr + tw + tg, size });
      this.note(note, this.cur.y1 - nh + 2, 7);
    }

    // ================= what companies report =================
    // A table of the page, read as it shows: its column heads and each row's cells in the deck's language, one line per
    // figure (a cell's lines are joined with ¶). In the company column the name and ticker, then the period; in the last
    // column (segment, figures, quote and source) the segment and the figures stay, the quote goes to the quotes page and
    // the link to the release becomes its filing date.
    cellLines(c) {
      const other = this.es ? 'en' : 'es', out = []; let cur = '';
      const flush = () => { const t = cur.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim(); if (t) out.push(t); cur = ''; };
      const filed = (el) => { const k = el.cloneNode(true); Array.prototype.forEach.call(k.querySelectorAll('a'), (a) => a.remove()); const t = this.plain(k).replace(/^[\s·]+/, '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
      Array.prototype.forEach.call(c.childNodes, (n) => {
        if (n.nodeType === 3) { cur += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        const cl = n.classList;
        if (cl.contains(other) || cl.contains('new') || n.tagName === 'Q' || cl.contains('by')) return;
        if (cl.contains('usm')) {   // one reported figure: value, change, then what it is, its period and its document
          flush();
          const v = n.querySelector(':scope > b'), ch = n.querySelector(':scope > .up, :scope > .down, :scope > .chg'), sub = n.querySelector(':scope > .sub');
          out.push([[v ? this.plain(v) : '', ch ? this.plain(ch) : ''].filter(Boolean).join(' '), sub ? this.plain(sub) : ''].filter(Boolean).join(' · '));
          return;
        }
        if (cl.contains('scope')) { flush(); out.push(this.plain(n) + ':'); return; }
        if (cl.contains('xt')) { flush(); if (n.querySelector('q')) return; if (n.querySelector('a.srcl')) { const t = filed(n); if (t && out.length) out[out.length - 1] += ` · ${t}`; else if (t) out.push(t); return; } const t = this.plain(n); if (t) out.push(t); return; }
        if (cl.contains('sub') || cl.contains('per')) { flush(); const t = this.plain(n); if (t) out.push(t); return; }
        cur += ' ' + this.plain(n) + ' ';
      });
      flush();
      return out.map((l) => l.replace(/\.\.(?!\.)/g, '.'));
    }
    readTable(tbl) {
      const head = Array.prototype.map.call(tbl.tHead ? tbl.tHead.rows[0].cells : [], (c) => this.plain(c));
      const rows = Array.prototype.map.call(tbl.tBodies[0] ? tbl.tBodies[0].rows : [], (r) => Array.prototype.map.call(r.cells, (c, i) => {
        if (i === 0) {
          const nm = c.querySelector('.tk'), per = c.querySelector('.per'), tick = Array.prototype.map.call(c.querySelectorAll(':scope > .nd'), (e) => this.plain(e)).join(' ');
          const name = nm ? this.plain(nm) : this.plain(c);
          return { name, tick, per: per ? this.plain(per) : '', label: `${name}${tick ? ' (' + tick + ')' : ''}` };
        }
        const q = c.querySelector('q'), by = c.querySelector('.by');
        return { lines: this.cellLines(c), quote: q ? this.plain(q) : '', by: by ? this.plain(by) : '' };
      }));
      return { head, rows };
    }
    // a table of the page as deck rows: the company cell on two lines, every other cell one line per figure; a cell that
    // holds one figure is colored by its sign; quotes are collected for their own page
    deckRows(t, quotes) {
      const body = [], meta = [], figures = t.head.length < 5;   // the tables of several reported figures per cell
      t.rows.forEach((cells) => {
        const co = cells[0], n = cells.length;
        body.push([`${co.label}¶${co.per}`].concat(cells.slice(1).map((c) => c.lines.join('¶'))));
        meta.push(['bold left'].concat(cells.slice(1).map((c, i) => { const one = c.lines.length === 1 ? c.lines[0] : '';
          return figures || i === n - 2 || c.lines.length > 1 ? 'left small' : /^[−-]\d/.test(one) ? 'neg' : /^\+\d/.test(one) ? 'pos' : ''; })));
        cells.slice(1).forEach((c) => { if (c.quote) quotes.push([co.label, `“${c.quote}”`, c.by]); });
      });
      return { body, meta };
    }
    // "A, B y C" / "A, B and C"
    list(a) { return a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')}${this.T(' y ', ' and ')}${a[a.length - 1]}`; }
    // the y where a landscape page's content starts under a one-line title and this subtitle (as the engine's page() lays it)
    contentTop(sub) { this.font('normal', 9.5, MUTED); const W = P.PAGE.L.w - P.MARGIN.left - P.MARGIN.right; return P.MARGIN.top + 21 + (sub ? 12 * this.wrap(sub, W - 8).length + 1 : 0) + 14; }
    companyPages() {
      const sec = $('empresas'); if (!this.shown(sec)) return;
      const m0 = this.meta.empresas || {}, base = `${m0.label ? m0.label + ' · ' : ''}${m0.title || ''}`;
      const sub = this.plain($('metaCompanies')).replace(/\s*·?\s*\d+ (con reporte más reciente por revisar|with a newer report to review)\s*$/, '');
      const tail = this.T('n. d. = el comunicado no da la cifra. Las definiciones y los trimestres fiscales difieren entre empresas; las cifras no son estrictamente comparables entre sí. Cada cifra se coteja contra el texto del comunicado que cita.', 'n/a = the release does not give the figure. Definitions and fiscal quarters differ across companies; the figures are not strictly comparable with one another. Every figure is checked against the text of the release it cites.');
      const quotes = [];
      // the page's tables: one per group of retailers and card issuers, then buy now, pay later and the lenders who see stress first
      const blocks = Array.prototype.map.call(document.querySelectorAll('#coTables .card'), (card) => ({ title: this.plain(card.querySelector('h3')), tbl: card.querySelector('table'), note: this.plain(card.querySelector('.chart-src')) }))
        .filter((g) => g.tbl && this.shown(g.tbl)).map((g) => { const t = this.readTable(g.tbl), n = t.head.length; return { ...g, n, head: t.head.map((h, i) => (i === n - 1 && n > 2 ? this.T('Segmento y otras cifras', 'Segment and other figures') : h)), ...this.deckRows(t, quotes) }; });
      const W = P.PAGE.L.w - P.MARGIN.left - P.MARGIN.right, y0 = this.contentTop(sub), nh = this.measureText(tail, W, 7, 1.25) + 2, bottom = P.PAGE.L.h - P.MARGIN.bottom - nh - 4;
      const spec = (b, y, size) => ({ y, w: W, head: b.head, body: b.body, meta: b.meta, size, pad: { top: 2, bottom: 2, left: 3, right: 3 },
        cols: Object.assign({ 0: { halign: 'left', cellWidth: W * 0.17 } }, b.n > 2 ? { [b.n - 1]: { halign: 'left', cellWidth: W * (b.n > 5 ? 0.3 : b.n === 3 ? 0.36 : 0.38) } } : {}, b.n === 3 ? { 1: { halign: 'left' } } : {}, b.n === 4 ? { 1: { halign: 'left', cellWidth: W * 0.24 }, 2: { halign: 'left' } } : {}) });
      // plan: the tables in order, as many as fit on each page at one size each (a page's title names its groups)
      const pages = []; let i = 0;
      while (i < blocks.length) {
        const pg = { items: [] }, notes = []; let y = y0;
        while (i < blocks.length) {
          const b = blocks[i], note = b.note && notes.indexOf(b.note) < 0 ? b.note : '';
          let fit = null;
          for (const size of pg.items.length ? [7.8, 7.4, 7] : [7.8, 7.4, 7, 6.6, 6.2]) { const r = this.measureTable({ ...spec(b, y + 16, size), pageBreak: 'auto' });   // a table below 7 pt goes to a page of its own, where it can be larger
          if (r.pages === 1 && r.finalY + (note ? 12 : 0) <= bottom) { fit = { size, end: r.finalY }; break; } }
          if (!fit && pg.items.length) break;   // the next table starts a page of its own
          pg.items.push({ b, size: fit ? fit.size : 6.2, note }); if (note) notes.push(note);
          y = (fit ? fit.end : bottom) + (note ? 12 : 0) + 12; i++;
        }
        pages.push(pg);
      }
      pages.forEach((pg, k) => {
        let title = `${base} · ${this.list(pg.items.map((it) => it.b.title))}`;
        this.font('bold', 12, ACCENT); if (this.tw(P.titleCase(title, this.es)) > W) title = `${base} · ${this.T('Lo que reportan', 'What they report')} (${k + 1}/${pages.length})`;
        let y = this.page('L', title, sub);
        for (const it of pg.items) {
          const yh = this.heading(it.b.title, this.cur.x0, y, 10) + 1;
          y = it.size === 6.2 && pg.items.length === 1 ? this.fitTable(spec(it.b, yh, 6.2), [6.2, 5.8], bottom) : this.table(spec(it.b, yh, it.size));
          if (it.note) y = this.note(it.note, y + 3, 6.8);
          y += 12;
        }
        this.note(tail, this.cur.y1 - nh + 2, 7);
      });
      // gig platforms: what each reports for the United States, and for the whole platform
      const gt = $('gigTable');
      if (this.shown(gt) && gt.tBodies[0] && gt.tBodies[0].rows.length) {
        const t = this.readTable(gt), card = gt.closest('.card'), r = this.deckRows(t, quotes);
        const y = this.page('L', `${base} · ${this.T('Plataformas de trabajo por encargo', 'Gig platforms')}`, this.plain($('capGig')));
        const gnote = this.plain($('gigNote')), gh = this.measureText(gnote, W, 7, 1.25) + 2;
        this.fitTable({ y, w: W, head: t.head, body: r.body, meta: r.meta.map((m) => m.map((x, j) => (j === 0 ? x : 'left small'))), cols: { 0: { halign: 'left', cellWidth: W * 0.14 }, 1: { halign: 'left', cellWidth: W * 0.33 }, 2: { halign: 'left', cellWidth: W * 0.27 }, 3: { halign: 'left' } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8.6, 8.2, 7.8, 7.4, 7, 6.6, 6.2], this.cur.y1 - gh - 4);
        this.note(gnote, this.cur.y1 - gh + 2, 7);
      }
      // what management says: every quote the page carries, in the language of its release
      if (quotes.length) {
        const qNote = this.T('Las citas se muestran en el idioma del comunicado y se cotejan contra su texto.', 'Quotes are shown in the language of the release and are checked against its text.');
        let k = 0, part = 0;
        while (k < quotes.length) {
          const y = this.page('L', `${base} · ${this.T('Lo que dice la administración', 'What Management Says')}${part ? this.T(' (continuación)', ' (continued)') : ''}`, sub);
          const qh = this.measureText(qNote, W, 7, 1.25) + 2, qb = this.cur.y1 - qh - 4;
          const qspec = (n, size) => ({ y, w: W, head: [this.T('Empresa', 'Company'), this.T('Cita del comunicado', 'Quote from the release'), this.T('Quién', 'Who')], body: quotes.slice(k, k + n), meta: quotes.slice(k, k + n).map(() => ['bold left', 'left', 'left small']), size,
            cols: { 0: { halign: 'left', cellWidth: W * 0.17 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: W * 0.2 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } });
          let pick = null;
          for (let n = quotes.length - k; n >= 1 && !pick; n--) for (const size of [8, 7.6, 7.2, 6.8, 6.4]) { const r = this.measureTable({ ...qspec(n, size), pageBreak: 'auto' }); if (r.pages === 1 && r.finalY <= qb) { pick = { n, size }; break; } }
          if (!pick) pick = { n: 1, size: 6.4 };
          this.table(qspec(pick.n, pick.size)); k += pick.n; part++;
          this.note(qNote, this.cur.y1 - qh + 2, 7);
        }
      }
    }
    // comparable sales: the page's chart of every retailer and restaurant beside what the page says about them
    compsPage(pg) {
      if (!this.has('chComps')) return;
      const y = this.page('L', this.title(pg), this.plain($('metaCompanies')).replace(/\s*·?\s*\d+ (con reporte más reciente por revisar|with a newer report to review)\s*$/, ''));
      const x0 = this.cur.x0, W = this.width(), gap = 22, wl = W * 0.58, xr = x0 + wl + gap, wr = W - wl - gap;
      this.chartCell('chComps', x0, y, wl, this.cur.y1 - y - 4);
      const lead = this.rich($('coCallout'));
      if (lead) this.callout([lead], xr, y + 4, wr, 9.4, true);
    }

    // ================= sources and methodology =================
    sourcesPage() {
      const items = Array.prototype.map.call(document.querySelectorAll('#srcGrid .item'), (it) => [this.plain(it.querySelector('.t')), this.plain(it.querySelector('.d')), this.plain(it.querySelector(':scope > a'))]);   // the site link, not a link inside the description
      if (!items.length) return;
      const y = this.page('L', this.T('Fuentes', 'Sources'), this.T('Todo el contenido proviene de información pública; cada fuente indica el periodo de su dato más reciente', 'All content comes from public information; each source shows the period of its latest data'));
      const W = this.width();
      this.fitTable({ y, w: W, head: [this.T('Fuente', 'Source'), this.T('Qué aporta y hasta cuándo llegan sus datos', 'What it provides and how far its data go'), this.T('Sitio', 'Site')], body: items, meta: items.map(() => ['bold left', 'left', 'left small']),
        cols: { 0: { halign: 'left', cellWidth: W * 0.24 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: W * 0.13 } }, pad: { top: 1.8, bottom: 1.8, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4, 6, 5.6], this.cur.y1 - 4);
    }
    methodPage() {
      const defs = Array.prototype.map.call(document.querySelectorAll('#fuentes dl.defs > div'), (d) => `**${this.plain(d.querySelector('dt'))}.** ${this.plain(d.querySelector('dd'))}`); if (!defs.length) return;
      const y = this.page('L', this.T('Metodología', 'Methodology'), this.T('Las definiciones que usa la página, tal como las publica', 'The definitions the page uses, as it publishes them'));
      const x0 = this.cur.x0, W = this.width(), gap = 24, cw = (W - gap) / 2, half = Math.ceil(defs.length / 2), cols = [defs.slice(0, half), defs.slice(half)];
      const upd = this.rich($('fineUpdate')), close = this.T(`Este documento se generó automáticamente el ${this.longDate(this.today)} desde ${this.cfg.url} con los datos vigentes en ese momento. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.today)} from ${this.cfg.url} with the data current at that moment. It is not investment advice.`);
      const tail = [upd, close].filter(Boolean), o = { gap: 6, lh: 1.32 };
      // the largest size at which the two columns and the closing notes fit the page
      let size = 10; const room = this.cur.y1 - y - 6;
      for (; size > 6.6; size -= 0.2) { const th = this.measureBullets(tail, W, size, { marker: false, gap: 5, lh: 1.32 }) + 14; if (Math.max(...cols.map((c) => this.measureBullets(c, cw, size, o))) + th <= room) break; }
      let yb = y; cols.forEach((c, i) => { yb = Math.max(yb, this.bullets(c, x0 + i * (cw + gap), y, cw, size, o)); });
      this.rule(yb + 4);
      this.bullets(tail, x0, yb + 12, W, size, { marker: false, gap: 5, lh: 1.32 });
    }

    // ----- footers and download (the engine's footer names a company and its tickers; this page has neither) -----
    finish() {
      while (this.pages.length < this.pdf.getNumberOfPages()) this.pages.push({ ...this.cur });
      const n = this.pdf.getNumberOfPages();
      const left = this.T(`${this.cfg.short} · Presentación · ${this.date(this.todayIso)} · ${this.confidential()} · ${this.cfg.url}`, `${this.cfg.short} · Presentation · ${this.date(this.todayIso)} · ${this.confidential()} · ${this.cfg.url}`);
      for (let i = 2; i <= n; i++) {
        const pg = this.pages[i - 1]; if (!pg) continue; this.pdf.setPage(i);
        this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.5); this.pdf.line(pg.x0, pg.h - 30, pg.x1, pg.h - 30);
        this.font('normal', 7.2, MUTED); this.pdf.text(tx(left), pg.x0, pg.h - 19, { maxWidth: pg.x1 - pg.x0 - 90 });
        this.font('bold', 8, INK); this.pdf.text(this.T(`Página ${i} de ${n}`, `Page ${i} of ${n}`), pg.x1, pg.h - 19, { align: 'right' });
      }
      const name = this.T(`${this.cfg.fileStem}_presentacion_${this.todayIso}.pdf`, `${this.cfg.fileStem}_presentation_${this.todayIso}.pdf`);
      this.pdf.setProperties({ title: this.T(`${this.cfg.short} · Presentación`, `${this.cfg.short} · Presentation`), subject: name, creator: 'fnam.mx' });
      this.pdf.save(name);
    }
  }

  window.CONS_PRESENT = { build };
  P.autoRun(build);
})();
