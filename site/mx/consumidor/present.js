/* The Mexican Consumer: board presentation (PDF).
   One click builds a Letter PDF from what the page shows at that moment. Nothing is typed or computed here: the figures
   come from window.MXC_MODEL (the page's data and formatters), the sentences are the ones the page composed (read from
   its own elements, in the language on screen) and every chart is drawn again off-screen from the options the page drew
   it with (MXC_UI.printConfig). The generic engine (pages, tables, tiles, cover, linked contents page, footers) lives in
   /assets/present-core.js; this file only lays out this page's sections. */
(function () {
  'use strict';
  const P = window.FNAM_PRESENT; if (!P) return;
  const { tx } = P, { INK, MUTED, ACCENT, GRID } = P.C;
  const K = 1.3;   // off-screen charts are drawn at 1.3 px per PDF point: the page's 11 px chart text prints at 8.5 pt
  const $ = (id) => document.getElementById(id);

  // the ten points of "At a Glance" by topic (the page tags each point with its topic)
  const TOPIC = {
    households: ['Hogares', 'Households'], income: ['Ingreso', 'Income'], funds: ['Fuentes y usos de fondos', 'Sources and uses of funds'], deciles: ['Gasto por decil de ingreso', 'Spending by income decile'],
    credit: ['Crédito', 'Credit'], stress: ['Estrés financiero', 'Financial stress'], poverty: ['Pobreza', 'Poverty'], wealth: ['Riqueza', 'Wealth'], kshape: ['Economía en forma de K', 'The K-shaped economy'], companies: ['Lo que reportan las empresas', 'What companies report'],
  };
  // short names of the sources for the "data through" line under each page title (the full names print in the page's note)
  const SRC = {
    enigh: 'ENIGH', informality: ['ENOE, informalidad', 'ENOE, informality'], poverty: ['Pobreza multidimensional', 'Multidimensional poverty'], statesBanxico: ['Banxico por estado', 'Banxico by state'], accounts: ['Cuentas nacionales', 'National accounts'],
    consumption: ['Consumo privado mensual', 'Monthly private consumption'], remittances: ['Remesas', 'Remittances'], cardPayments: ['Pagos con tarjeta', 'Card payments'], financing: ['Financiamiento a hogares', 'Household financing'], bankCredit: ['Crédito bancario', 'Bank credit'],
    rates: ['Tasas de interés', 'Interest rates'], cardsInForce: ['Tarjetas vigentes', 'Cards in force'], bis: 'BIS', lending: ['Encuesta a bancos', 'Bank lending survey'], enif: 'ENIF', enfih: 'ENFIH', savings: ['Ahorro financiero', 'Financial savings'],
    wages: ['Salarios', 'Wages'], enoe: ['ENOE, ingresos', 'ENOE, income'],
  };

  // The pages of the deck, in the page's own order. `cols` are columns (relative width `w`) of rows of charts (relative
  // heights `hs`); a chart is named by the id of its canvas on the page. `stats` is the section's row of figures (`src`: the
  // sources of those figures that no chart of the page names), `callouts` the sentences the page composes under its charts.
  // A horizontal bar chart with many rows gets a column to itself: its rows need the height.
  const PAGES = [
    { sec: 'demografia', stats: 'demoStats', src: ['informality'], callouts: ['demoCallout'], cols: [{ rows: [['chAge', 'chEdu', 'chEquip'], ['chHhTypes', 'chLocality', 'chOwnAge']], hs: [1.2, 0.8] }] },
    { sec: 'ingreso', part: ['Nivel y distribución', 'Level and distribution'], stats: 'incomeStats', callouts: ['incomeCallout', 'receiveCallout'], cols: [{ w: 1.9, rows: [['chIncHist', 'chDecileMeans'], ['chBrackets', 'chReceive']] }, { w: 1, rows: [['chIncGroups']] }] },
    { sec: 'ingreso', part: ['Por estado', 'By state'], states: { map: 'income', maps: ['mean', 'growth'], table: ['mean', 'median', 'perCapita', 'growth', 'gini', 'transferShare', 'remitHH'] } },
    { sec: 'fondos', stats: 'fundsStats', src: ['accounts'], callouts: ['fundsCallout'], cols: [{ w: 1.25, rows: [['chSrcHist'], ['chUseHist']] }, { w: 1, rows: [['chIndicator'], ['chRemit']] }, { w: 0.95, rows: [['chCardPay']] }] },
    { sec: 'deciles', stats: 'decStats', callouts: ['decCallout'], cols: [{ rows: [['chDecSpendInc', 'chDecShare', 'chBasics'], ['chDecSources', 'chAgeSpend', 'chDecOwn']] }] },
    { sec: 'credito', part: ['Tamaño, crecimiento y costo', 'Size, growth and cost'], stats: 'creditStats', src: ['bis', 'cardsInForce', 'enif'], callouts: ['cardCallout'], cols: [{ rows: [['chFinGdp', 'chBankGrowth', 'chRates'], ['chFinParts', 'chBankProd', 'chDecCard']], hs: [0.9, 1.1] }] },
    { sec: 'credito', part: ['Quién lo tiene', 'Who has it'], cols: [{ rows: [['chEnifCredit']] }, { rows: [['chEnifAccounts']] }, { rows: [['chEnifGroups']] }] },
    { sec: 'estres', part: ['Morosidad, atrasos y colchones', 'Past-due loans, late payments and cushions'], stats: 'stressStats', src: ['enif', 'enigh', 'poverty'], callouts: ['stressCallout'], cols: [{ w: 1.15, rows: [['chImor'], ['chLending']] }, { w: 0.95, rows: [['chLate']] }, { w: 0.9, rows: [['chOverspend'], ['chPovLines']] }] },
    { sec: 'estres', part: ['Cómo se arreglan los hogares', 'How households cope'], callouts: ['cushionCallout', 'accessCallout'], cols: [{ w: 1.75, rows: [['chCoping', 'chReject'], ['chEmergency', 'chCushion']] }, { w: 1, rows: [['chStressGroups']] }] },
    { sec: 'estres', part: ['Pobreza por estado', 'Poverty by state'], states: { map: 'stress', maps: ['poverty'], chart: 'chPoverty', table: ['poverty', 'extreme', 'povertyChg', 'belowLine', 'noSocSec', 'foodShare', 'rentBurden'] } },
    { sec: 'riqueza', stats: 'wealthStats', callouts: ['wealthCallout'], cols: [{ rows: [['chWealthShare'], ['chWealthGroups']] }, { rows: [['chSavings'], ['chDebtTypes']] }, { rows: [['chAssetsOwn']] }] },
    { sec: 'economia-k', stats: 'kStats', callouts: ['kCallout'], cols: [{ rows: [['chKGrowth', 'chKIndex', 'chKShares'], ['chKWages', 'chKWork', 'chKTop']] }] },
  ];

  // ---------- builder ----------
  async function build() {
    const M = window.MXC_MODEL;
    await P.run(M, [], async () => {
      // the charts are drawn for paper: with the page in its dark theme, the light one is put on while the deck is built
      const root = document.documentElement, theme = root.getAttribute('data-theme'), dark = M.UI.isDark();
      if (dark) { root.setAttribute('data-theme', 'light'); M.render(); }
      try {
        const doc = new MxcDoc(M);
        doc.cover();
        doc.at('resumen'); doc.summary(); doc.at(null); doc.contents();
        for (const pg of PAGES) { doc.at(pg.sec); if (pg.states) doc.statePage(pg); else doc.sectionPage(pg); }
        doc.at('empresas'); doc.companyPages();
        doc.at('fuentes'); doc.sourcesPage(); doc.methodPage(); doc.at(null);
        doc.contentsPage();
        doc.finish();
      } finally {
        if (dark) { if (theme == null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme); M.render(); }
      }
    });
  }

  class MxcDoc extends P.Doc {
    constructor(M) {
      const es = M.LANG === 'es', name = es ? 'El Consumidor Mexicano' : 'The Mexican Consumer';
      super(M, { slug: 'mx-consumidor', short: name, name, url: 'fnam.mx/mx/consumidor', fileStem: es ? 'Consumidor_Mexicano' : 'Mexican_Consumer',
        tickerLine: es ? 'México · ingreso, gasto, crédito y riqueza de los hogares' : 'Mexico · household income, spending, credit and wealth',
        confidential: { es: 'Fuente: INEGI, Banco de México, CNBV, BIS y reportes de las empresas; no es asesoría de inversión.', en: 'Source: INEGI, Banco de México, CNBV, BIS and company filings; not investment advice.' } });
      this.lang = es ? 'es' : 'en'; this.UI = M.UI; this.D = M.D;
      this.trackPages = true;   // page() records every page for the contents page
      this.meta = this.pageSectionMeta();
      const fh = document.querySelector('#fuentes h3'); this.meta.fuentes = { label: '', title: fh ? this.plain(fh) : this.T('Fuentes y Metodología', 'Sources and Methodology') };
    }
    at(sec) { this.sec = sec; }
    // The engine wraps a page's subtitle at the full width of the page, and a line measured to fit exactly can print a few
    // points past the margin. While the engine draws the page head, long text is wrapped here instead, a little narrower.
    page(orient, title, subtitle) {
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
    // "Datos a: ENIGH 2024 · Crédito bancario ago 2026" for the sources a page draws on
    through(ids) {
      const parts = ids.map((id) => { const s = this.D.sources[id], n = SRC[id]; return s && n ? `${Array.isArray(n) ? this.T(n[0], n[1]) : n} ${this.UI.date(s.asOf)}` : null; }).filter(Boolean);
      return parts.length ? this.T('Datos a: ', 'Data through: ') + parts.join(' · ') : '';
    }
    // the full names of the same sources, for the note at the foot of the page
    sourceNote(ids) {
      const parts = ids.map((id) => { const s = this.D.sources[id]; return s ? `${this.M.name('srcShort', id)} (${this.UI.date(s.asOf)}${s.stored ? this.T(', dato guardado', ', stored value') : ''})` : null; }).filter(Boolean);
      return parts.length ? this.T('Fuentes: ', 'Sources: ') + parts.join('; ') + this.T('. Cálculos de fnam.mx donde la página lo indica.', '. fnam.mx calculations where the page says so.') : '';
    }
    has(id) { const cv = $(id); return !!(cv && this.UI.specs[id] && !cv.closest('[hidden]')); }
    srcOf(id) { const cv = $(id), el = cv && cv.closest('.card') && cv.closest('.card').querySelector('[data-src]'); return el ? el.getAttribute('data-src').split(',') : []; }
    uniq(a) { return a.filter((x, i) => x && a.indexOf(x) === i); }
    statsOf(id, max = 8) {
      const row = $(id); if (!row || row.closest('[hidden]')) return [];
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
        this.T('Elaborado únicamente con información pública: microdatos y series del INEGI, Banco de México y la CNBV, el BIS y los reportes de resultados de las empresas ante la BMV y la SEC', 'Built only from public information: microdata and series of INEGI, Banco de México and the CNBV, the BIS, and company results releases filed with the BMV and the SEC') + ` · ${this.cfg.url}`];
      let yy = c.h - 140;
      for (const l of lines) yy = this.text(l, cx, yy, w, 10, 'normal', MUTED, 1.35) + 4;
      this.font('bold', 10, ACCENT); this.pdf.text(tx(this.confidential()), cx, yy + 12);
    }

    // ================= executive summary: the page's "At a Glance", 1-5 down the left, 6-10 down the right =================
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
    capLines(cap, w) {
      this.font('normal', 7.2, MUTED);
      const split = (t) => this.wrap(t, w - 2);
      let lines = split(cap); if (lines.length <= 3) return lines;
      const parts = cap.split(/(?<=[.;])\s+/); let keep = '';
      for (const p of parts) { const t = keep ? `${keep} ${p}` : p; if (split(t).length > 3) break; keep = t; }
      if (keep) return split(keep.replace(/;$/, '.'));
      lines = lines.slice(0, 3); lines[2] = lines[2].replace(/\s+\S*$/, '') + '...'; return lines;
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
          const rgb = /^#[0-9a-f]{6}$/i.test(it.c) ? [1, 3, 5].map((p) => parseInt(it.c.slice(p, p + 2), 16)) : MUTED;
          this.pdf.setFillColor(...rgb);
          if (it.line) this.pdf.rect(cx, cy + 3.4, 6.5, 1.5, 'F'); else this.pdf.rect(cx, cy + 1.6, 5, 5, 'F');
          this.font('normal', size, MUTED); lines.forEach((l, i) => this.pdf.text(l, cx + 9, cy + i * lh + size * 0.85));
        }
        if (lines.length > 1) { cx = x; cy += lines.length * lh; } else cx += iw;
      }
      return (cx === x && cy > y ? cy : cy + lh) + 2;
    }
    // the heading of a chart: one line, or two when the title (with the option chosen on the page) is longer than its cell
    cellHeading(title, x, y, w) {
      const t = P.titleCase(title, this.es); let size = 9.6, lines;
      for (;;) { this.font('bold', size, ACCENT); lines = this.wrap(t, w - 2); if (lines.length <= 2 || size <= 8) break; size -= 0.4; }
      lines = lines.slice(0, 2); this.pdf.text(lines, x, y + size * 0.85);
      return y + lines.length * size * 1.3 + 2.4;
    }
    // one chart with the heading, caption and legend of its card on the page
    chartCell(id, x, y, w, h) {
      const cv = $(id), card = cv.closest('.card');
      let title = this.plain(card.querySelector('h3'));
      const on = card.querySelector('.seg button[aria-pressed="true"]'); if (on) title += ` · ${on.textContent.trim()}`;
      let yy = this.cellHeading(title, x, y, w);
      const cap = this.plain(card.querySelector('.cap'));
      if (cap) { const ls = this.capLines(cap, w); this.font('normal', 7.2, MUTED); this.pdf.text(ls, x, yy + 6.4); yy += ls.length * 9 + 3; }
      const items = this.UI.legends[id]; if (items && items.length) yy = this.legend(items, x, yy + 1, w, true);
      const ch = y + h - yy; if (ch < 50) return;
      // A horizontal bar chart needs a given height for its rows (the more its labels wrap, the more). When the cell is
      // shorter, the chart is drawn larger and scaled down: a larger canvas has room for longer label lines, so fewer of them
      // wrap, and its text prints smaller (never below 6.8 pt).
      const make = (k) => this.UI.printConfig(id, Math.round(w * k));
      let k = K, cfg = make(k); if (!cfg) return;
      while (cfg.need && cfg.need > ch * k && k < 1.62) { k = Math.min(1.62, k + 0.08); cfg = make(k); }
      cfg.options.devicePixelRatio = 2.5;
      this.image(this.chart(cfg, Math.round(w * k), Math.round(ch * k)), x, yy, w, ch);
    }
    grid(cols, x0, y0, W, H, gap = 16) {
      const tw = cols.reduce((a, c) => a + (c.w || 1), 0); let x = x0;
      for (const c of cols) {
        const cw = (W - gap * (cols.length - 1)) * (c.w || 1) / tw, hs = c.rows.map((r, i) => (c.hs && c.hs[i]) || 1), th = hs.reduce((a, b) => a + b, 0);
        let y = y0;
        c.rows.forEach((row, ri) => {
          const rh = (H - gap * (c.rows.length - 1)) * hs[ri] / th, w1 = (cw - gap * (row.length - 1)) / row.length;
          row.forEach((id, i) => this.chartCell(id, x + i * (w1 + gap), y, w1, rh));
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
    sectionPage(pg) {
      // charts the page is not showing (a block of data missing) leave the layout; a page with nothing left is not printed
      const cols = pg.cols.map((c) => { const rows = [], hs = []; c.rows.forEach((r, i) => { const rr = r.filter((id) => this.has(id)); if (rr.length) { rows.push(rr); hs.push((c.hs && c.hs[i]) || 1); } }); return { w: c.w, rows, hs }; }).filter((c) => c.rows.length);
      const stats = pg.stats ? this.statsOf(pg.stats) : [];
      if (!cols.length && !stats.length) return;
      // the sources of the page: those of its charts and those of the figures in its row of tiles (`src`)
      const ids = [].concat(...cols.map((c) => [].concat(...c.rows))), src = this.uniq([].concat(...ids.map((id) => this.srcOf(id))).concat(stats.length ? pg.src || [] : []));
      let y = this.page('L', this.title(pg), this.through(src));
      const x0 = this.cur.x0, W = this.width();
      if (stats.length) y = this.tiles(stats, y, 44) - 2;
      const texts = (pg.callouts || []).map((id) => { const el = $(id); return el && !el.closest('[hidden]') ? this.rich(el) : ''; }).filter(Boolean);
      const note = this.sourceNote(src), nh = note ? this.measureText(note, W, 7, 1.25) + 2 : 0;
      const cs = 8.4, ch = texts.length ? this.callout(texts, x0, 0, W, cs, false) + 10 : 0;
      const bottom = this.cur.y1 - nh - ch;
      if (cols.length) this.grid(cols, x0, y, W, bottom - y - 6);
      if (texts.length) this.callout(texts, x0, bottom + 4, W, cs, true);
      if (note) this.note(note, this.cur.y1 - nh + 2, 7);
    }

    // ================= a section by state: the map(s), the national trend and the table of the 32 states =================
    // The map of the page, drawn on a canvas from the same shapes, classes and colors (seven groups with the same number of states).
    mapImage(metric, list, wpx) {
      const G = window.FNAM_MX_STATES, UI = this.UI, L = UI.mapLayout || { small: {}, nudge: {} }, k = wpx / G.width, hpx = Math.round(G.height * k), R = 3;
      const cv = document.createElement('canvas'); cv.width = wpx * R; cv.height = hpx * R;
      const c = cv.getContext('2d'); c.scale(k * R, k * R);
      const by = {}; list.forEach((s) => { by[s.code] = metric.get(s); });
      const br = UI.breaks(list.map((s) => metric.get(s)), 7);
      const fill = (v) => { const cl = UI.classOf(v, br); return cl < 0 ? UI.css('--seq-none') : UI.seq(cl); };
      c.lineJoin = 'round'; c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
      Object.keys(G.states).forEach((code) => { const p = new Path2D(G.states[code].d); c.fillStyle = fill(by[code]); c.fill(p); c.stroke(p); });
      // abbreviations: larger on the large states so they read on paper, small where the states are small
      c.textAlign = 'center'; c.textBaseline = 'middle';
      Object.keys(G.states).forEach((code) => { if (L.small[code]) return; const g = G.states[code], n = L.nudge[code] || [0, 0]; c.font = `600 ${g.a >= 4500 ? 21 : 15}px Helvetica, Arial, sans-serif`; c.fillStyle = UI.inkOn(fill(by[code])); c.fillText(g.ab, g.c[0] + n[0], g.c[1] + n[1]); });
      return { url: cv.toDataURL('image/png'), ratio: G.height / G.width, br, fill, by };
    }
    // map with its heading, its color scale and the six entities too small to label
    mapBlock(metric, list, x, y, w) {
      const G = window.FNAM_MX_STATES, UI = this.UI, L = UI.mapLayout || { small: {} }, sf = metric.short || metric.fmt;
      let yy = this.heading(metric.label, x, y, 9.6, w) - 1;
      const m = this.mapImage(metric, list, Math.round(w * 2)), h = w * m.ratio;
      this.image(m.url, x, yy, w, h); yy += h + 4;
      // scale: seven classes, with each cut under the boundary between two of them
      const sw = Math.min(46, (w - 6 * 2) / 7);
      for (let i = 0; i < 7; i++) {
        const hex = UI.seq(i), rgb = [1, 3, 5].map((p) => parseInt(hex.slice(p, p + 2), 16));
        this.pdf.setFillColor(...rgb); this.pdf.rect(x + i * (sw + 2), yy, sw, 6, 'F');
      }
      this.font('normal', 6, MUTED);
      for (let i = 0; i < 6; i++) this.pdf.text(tx(sf(m.br[i])), x + (i + 1) * (sw + 2) - 1, yy + 13, { align: 'center' });
      yy += 18;
      // the entities with no room for a label on the map
      let cx = x;
      Object.keys(L.small).forEach((code) => {
        if (m.by[code] === undefined) return;
        const t = tx(`${G.states[code].ab} ${m.by[code] == null ? '—' : sf(m.by[code])}`), hex = m.fill(m.by[code]), rgb = [1, 3, 5].map((p) => parseInt(hex.slice(p, p + 2), 16));
        this.font('bold', 6.2, UI.inkOn(hex) === '#ffffff' ? [255, 255, 255] : INK); const tw = this.tw(t) + 7;
        if (cx > x && cx + tw > x + w) { cx = x; yy += 13; }
        this.pdf.setFillColor(...rgb); this.pdf.roundedRect(cx, yy, tw, 10.5, 2, 2, 'F'); this.pdf.text(t, cx + 3.5, yy + 7.5); cx += tw + 3;
      });
      return yy + 15;
    }
    statePage(pg) {
      const T = this.D.states, MP = this.M.maps[pg.states.map]; if (!T || !MP) return;
      const byId = (id) => MP.metrics.filter((m) => m.id === id)[0];
      const maps = pg.states.maps.map(byId).filter(Boolean), tcols = pg.states.table.map(byId).filter(Boolean); if (!maps.length || !tcols.length) return;
      const chart = pg.states.chart && this.has(pg.states.chart) ? pg.states.chart : null;
      const src = this.uniq(tcols.map((m) => m.src).concat(chart ? this.srcOf(chart) : []));
      let y = this.page('L', this.title(pg), this.through(src));
      const x0 = this.cur.x0, W = this.width(), gap = 20, wl = W * 0.4, xr = x0 + wl + gap, wr = W - wl - gap;
      const note = this.sourceNote(src) + ' ' + this.html(MP.notes[maps[0].id]), nh = this.measureText(note, W, 7, 1.25) + 2, bottom = this.cur.y1 - nh - 4;
      // left: the map(s); with one map, the national chart goes under it
      const slots = maps.length + (chart ? 1 : 0), mw = Math.min(wl, ((bottom - y) / slots - 62) / (window.FNAM_MX_STATES.height / window.FNAM_MX_STATES.width));
      let yl = y;
      for (const m of maps) yl = this.mapBlock(m, T.list, x0, yl, mw) + 6;
      if (chart && bottom - yl > 90) this.chartCell(chart, x0, yl, wl, bottom - yl);
      // right: the 32 entities ranked by the first map's figure, then the country
      const main = maps[0], rows = T.list.filter((s) => main.get(s) != null).sort((a, b) => main.get(b) - main.get(a));
      const cell = (m, v) => (v == null ? this.T('n. d.', 'n/a') : m.fmt(v));
      const body = rows.map((s, i) => [String(i + 1), s.name].concat(tcols.map((m) => cell(m, m.get(s))))), meta = rows.map(() => ['muted', 'left'].concat(tcols.map((m, i) => (i === 0 ? 'bold' : ''))));
      body.push(['', this.T('México', 'Mexico')].concat(tcols.map((m) => cell(m, m.us)))); meta.push(['', 'bold left'].concat(tcols.map(() => 'bold')));
      const cols = { 0: { cellWidth: 16 }, 1: { halign: 'left', cellWidth: wr * 0.2 } };
      this.fitTable({ y, x: xr, w: wr, head: ['#', this.T('Entidad', 'State')].concat(tcols.map((m) => m.btn)), body, meta, cols, pad: { top: 1.5, bottom: 1.5, left: 3, right: 3 } }, [7.8, 7.4, 7, 6.6, 6.2, 5.8], bottom);
      this.note(note, this.cur.y1 - nh + 2, 7);
    }

    // ================= what companies report =================
    companyPages() {
      const M = this.M, CO = M.CO; if (!CO || !CO.companies || !CO.companies.length || ($('empresas') && $('empresas').hidden)) return;
      const tr = (o) => (o ? this.T(o.es, o.en) : ''), nd = this.T('n. d.', 'n/a');
      const fig = (m) => (m ? M.figure(m) : nd), sign = (m) => (m && (m.unit === 'chg' || !m.unit) ? this.cls(m.v) : '');
      const m0 = this.meta.empresas || {}, base = `${m0.label ? m0.label + ' · ' : ''}${m0.title || ''}`;
      const sub = this.plain($('metaCompanies')), tail = this.T('n. d. = el reporte no da la cifra. Entre paréntesis, el mismo periodo del año anterior. Las definiciones difieren entre empresas; las cifras no son estrictamente comparables entre sí. Cada cifra se coteja contra el texto del reporte que cita.', 'n/a = the release does not give the figure. In parentheses, the same period a year earlier. Definitions differ across companies; the figures are not strictly comparable with one another. Every figure is checked against the text of the release it cites.');
      const who = (c) => `${c.name} (${c.ticker})`, per = (c) => `${tr(c.period)} · ${this.date(c.filed)}`;
      const retail = CO.groups.filter((g) => ['grocery', 'value', 'department'].includes(g.id)), other = CO.groups.filter((g) => !['grocery', 'value', 'department'].includes(g.id));
      const of = (g) => CO.companies.filter((c) => c.group === g.id);
      // --- stores: same-store sales, total sales, traffic, ticket
      if (retail.some((g) => of(g).length)) {
        let y = this.page('L', `${base} · ${this.T('Tiendas y restaurantes', 'Stores and restaurants')}`, sub);
        const x0 = this.cur.x0, W = this.width(), gap = 18, wl = this.has('chComps') ? W * 0.3 : 0, xr = x0 + (wl ? wl + gap : 0), wr = W - (wl ? wl + gap : 0);
        const lead = this.rich($('coCallout')), nh = this.measureText(tail, W, 7, 1.25) + 2;
        if (lead) y += this.callout([lead], x0, y, W, 8.6, true) + 10;
        const bottom = this.cur.y1 - nh - 4;
        if (wl) this.chartCell('chComps', x0, y, wl, Math.min(bottom - y, 300));
        const body = [], meta = [], rowSpan = {};
        retail.forEach((g) => { const list = of(g); if (!list.length) return; rowSpan[body.length] = 7; body.push([tr(g), '', '', '', '', '', '']); meta.push(['head left', '', '', '', '', '', '']);
          list.forEach((c) => { const nplL = c.npl ? tr(c.npl.label || { es: 'Cartera vencida', en: 'Past-due loans' }) : '';
            const extra = (c.npl ? [`${nplL}: ${fig(c.npl)}`] : []).concat((c.extra || []).map((x) => `${tr(x.label)}: ${fig(x)}`));
            body.push([who(c), per(c), fig(c.comp), fig(c.sales), fig(c.traffic), fig(c.ticket), `${tr(c.segment)}.${extra.length ? ' ' + extra.join(' · ') : ''}`]);
            meta.push(['bold left', 'left small', `bold ${sign(c.comp)}`, sign(c.sales), sign(c.traffic), sign(c.ticket), 'left small']); }); });
        this.fitTable({ y, x: xr, w: wr, head: [this.T('Empresa', 'Company'), this.T('Periodo y fecha del reporte', 'Period and filing date'), this.T('Ventas a tiendas iguales', 'Same-store sales'), this.T('Ventas totales', 'Total sales'), this.T('Tráfico', 'Traffic'), this.T('Ticket promedio', 'Average ticket'), this.T('Segmento y otras cifras', 'Segment and other figures')], body, meta, rowSpan,
          cols: { 0: { halign: 'left', cellWidth: wr * 0.19 }, 1: { halign: 'left', cellWidth: wr * 0.12 }, 2: { cellWidth: wr * 0.11 }, 3: { cellWidth: wr * 0.09 }, 4: { cellWidth: wr * 0.08 }, 5: { cellWidth: wr * 0.08 }, 6: { halign: 'left' } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8, 7.6, 7.2, 6.8, 6.4, 6], bottom);
        this.note(tail, this.cur.y1 - nh + 2, 7);
      }
      // --- staples and lenders: each reports its own measures
      if (other.some((g) => of(g).length)) {
        const y = this.page('L', `${base} · ${this.T('Productos básicos y crédito', 'Staples and credit')}`, sub);
        const W = this.width(), nh = this.measureText(tail, W, 7, 1.25) + 2, bottom = this.cur.y1 - nh - 4;
        const body = [], meta = [], rowSpan = {};
        other.forEach((g) => { const list = of(g); if (!list.length) return; rowSpan[body.length] = 4; body.push([tr(g), '', '', '']); meta.push(['head left', '', '', '']);
          list.forEach((c) => { const figs = [c.comp ? { label: { es: 'Ventas a tiendas iguales', en: 'Same-store sales' }, m: c.comp } : null, c.sales ? { label: { es: 'Ventas totales', en: 'Total sales' }, m: c.sales } : null, c.npl ? { label: c.npl.label || { es: 'Cartera vencida', en: 'Past-due loans' }, m: c.npl } : null, c.loans ? { label: c.loans.label || { es: 'Cartera de crédito, variación anual', en: 'Loan portfolio, y/y' }, m: c.loans } : null]
            .filter(Boolean).concat((c.extra || []).map((x) => ({ label: x.label, m: x })));
            body.push([who(c), per(c), figs.map((f) => `${tr(f.label)}: ${fig(f.m)}`).join('  ·  '), `${tr(c.segment)}.`]); meta.push(['bold left', 'left small', 'left', 'left small']); }); });
        // what management says: the quotes the page carries, in the language of each release, as many as the page holds
        const quotes = CO.companies.filter((c) => c.quote && c.quote.text).map((c) => [who(c), `“${c.quote.text}”`, [c.quote.by, c.quote.role ? tr(c.quote.role) : ''].filter(Boolean).join(', ')]);
        const qHead = [this.T('Empresa', 'Company'), this.T('Cita del reporte', 'Quote from the release'), this.T('Quién', 'Who')], qCols = { 0: { halign: 'left', cellWidth: W * 0.17 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: W * 0.2 } };
        const qTable = (n, size) => ({ y: 0, w: W, head: qHead, body: quotes.slice(0, n), meta: quotes.slice(0, n).map(() => ['bold left', 'left', 'left small']), cols: qCols, size, pad: { top: 2.6, bottom: 2.6, left: 3, right: 3 } });
        const qNote = this.T('Las citas se muestran en el idioma del reporte y se cotejan contra su texto.', 'Quotes are shown in the language of the release and are checked against its text.');
        // the figures table keeps at least 7.4 pt; the quotes take what is left of the page
        let y2 = this.fitTable({ y, w: W, head: [this.T('Empresa', 'Company'), this.T('Periodo y fecha del reporte', 'Period and filing date'), this.T('Lo que reporta', 'What it reports'), this.T('Segmento', 'Segment')], body, meta, rowSpan,
          cols: { 0: { halign: 'left', cellWidth: W * 0.17 }, 1: { halign: 'left', cellWidth: W * 0.15 }, 2: { halign: 'left' }, 3: { halign: 'left', cellWidth: W * 0.2 } }, pad: { top: 2.6, bottom: 2.6, left: 3, right: 3 } }, quotes.length ? [8, 7.6, 7.2, 6.8, 6.4] : [8.6, 8.2, 7.8, 7.4, 7, 6.6], quotes.length ? y + (bottom - y) * 0.6 : bottom);
        if (quotes.length) {
          const room = bottom - y2 - 30; let pick = null;
          outer: for (let n = quotes.length; n >= 2; n--) for (const size of [7.8, 7.4, 7, 6.6]) { const r = this.measureTable(qTable(n, size)); if (r.pages === 1 && r.finalY <= room) { pick = { n, size }; break outer; } }
          if (pick) { y2 = this.heading(this.T('Lo que dice la administración', 'What Management Says'), this.cur.x0, y2 + 12, 10); this.table({ ...qTable(pick.n, pick.size), y: y2 }); }
        }
        this.note((quotes.length ? qNote + ' ' : '') + tail, this.cur.y1 - nh + 2, 7);
      }
    }

    // ================= sources and methodology =================
    sourcesPage() {
      const items = Array.prototype.map.call(document.querySelectorAll('#srcGrid .item'), (it) => [this.plain(it.querySelector('.t')), this.plain(it.querySelector('.d')), this.plain(it.querySelector(':scope > a'))]);   // the site link, not a link inside the description if (!items.length) return;
      const y = this.page('L', this.T('Fuentes', 'Sources'), this.T('Todo el contenido proviene de información pública; cada fuente indica el periodo de su dato más reciente', 'All content comes from public information; each source shows the period of its latest data'));
      const W = this.width();
      this.fitTable({ y, w: W, head: [this.T('Fuente', 'Source'), this.T('Qué aporta y hasta cuándo llegan sus datos', 'What it provides and how far its data go'), this.T('Sitio', 'Site')], body: items, meta: items.map(() => ['bold left', 'left', 'left small']),
        cols: { 0: { halign: 'left', cellWidth: W * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: W * 0.13 } }, pad: { top: 2.4, bottom: 2.4, left: 3, right: 3 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4, 6], this.cur.y1 - 4);
    }
    methodPage() {
      const defs = Array.prototype.map.call(document.querySelectorAll('#fuentes dl.defs > div'), (d) => `**${this.plain(d.querySelector('dt'))}.** ${this.plain(d.querySelector('dd'))}`); if (!defs.length) return;
      let y = this.page('L', this.T('Metodología', 'Methodology'), this.T('Las definiciones que usa la página, tal como las publica', 'The definitions the page uses, as it publishes them'));
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

  window.MXC_PRESENT = { build };
  P.autoRun(build);
})();
