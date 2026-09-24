/* fnam.mx board presentations — shared PDF engine.
   Company builders (site/<slug>/present.js) extend `Doc` with their pages; this file holds everything generic:
   page geometry and footers, text and **bold** runs, tables (jsPDF-AutoTable) with fit-to-page shrinking,
   off-screen Chart.js charts, tiles, boxes and arrows, Title Case for English headings, the cover page,
   the next-results estimate and the "Page X of Y" finish. Every figure still comes from the page's own
   model object (window.<PREFIX>_MODEL) — nothing is typed here.
   Libraries: jsPDF 4 + jsPDF-AutoTable 5 (site/assets/vendor, loaded on demand). */
(function () {
  'use strict';
  const VENDOR = ['/assets/vendor/jspdf.umd.min.js', '/assets/vendor/jspdf.plugin.autotable.min.js'];
  const POWERED_BY = window.FNAM_MODEL_NAME || 'Claude (Anthropic)';
  const PROMPTED_BY = 'Martha V. Shelton, CFA', PROMPTED_ROLE = 'Director, Talipot Research & Analysis';

  // ---------- page geometry (points; Letter) ----------
  const PAGE = { L: { w: 792, h: 612 }, P: { w: 612, h: 792 } };
  const MARGIN = { left: 40, right: 40, top: 36, bottom: 44 };
  const INK = [11, 11, 11], MUTED = [92, 91, 87], ACCENT = [27, 67, 50], GRID = [214, 212, 205], HEAD = [236, 240, 236], ALT = [249, 249, 247];
  const POS = [26, 127, 55], NEG = [180, 35, 24];
  const PALETTE = ['#1b4332', '#b8912a', '#2f6f9f', '#9a4d9a', '#c0392b', '#7f8c8d', '#3a3a38', '#5b8c5a'];
  const C = { INK, MUTED, ACCENT, GRID, HEAD, ALT, POS, NEG, PALETTE };

  // Helvetica (WinAnsi) has no glyph for these; swap them before drawing.
  const SWAP = { '−': '-', '≈': '~', '→': '->', '↗': '', 'Δ': 'Chg', '≥': '>=', '≤': '<=', '‑': '-', ' ': ' ', ' ': ' ', '₂': '2', '₆': '6', '⁵': '5', 'β': 'beta', ' ': ' ', ' ': ' ', '…': '...', '✓': 'v', '✘': 'x', '▸': '', '▾': '', '↑': '+', '↓': '-', '◀': '<', '▶': '>', '▲': '^' };
  const tx = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/[−≈→↗Δ≥≤‑  ₂₆⁵β  …✓✘▸▾↑↓◀▶▲]/g, (c) => SWAP[c]).replace(/\s+/g, ' ').trim();

  // Title Case for English headings: every word capitalised except short connectors; tokens that already carry
  // capitals (EBITDA, LTM, FY2026, GAP) or digits are left as they are.
  const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'vs.', 'with', 'over', 'onto', 'up', 'y/y']);
  function titleCase(str) {
    const words = String(str).split(' ');
    return words.map((w, i) => {
      if (!w) return w;
      const core = w.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '');
      if (!core || /[A-Z]/.test(core) || /\d/.test(core)) return w;
      if (i > 0 && i < words.length - 1 && SMALL.has(core.toLowerCase())) return w;
      return w.replace(/[a-zà-ÿ]/, (c) => c.toUpperCase()).replace(/-([a-z])/g, (m, c) => (SMALL.has(c) ? m : '-' + c.toUpperCase()));
    }).join(' ');
  }
  function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[data-src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('cannot load ' + src)); document.head.appendChild(s); }); }

  // Run a builder behind the page's button: loads the vendor libraries, swaps the button label while building.
  async function run(M, extraScripts, buildFn) {
    if (!M) { alert('Model not ready'); return; }
    const btn = document.getElementById('btnPrint'); const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = M.LANG === 'es' ? '⏳ Generando PDF…' : '⏳ Building PDF…'; }
    try {
      for (const v of VENDOR) await loadScript(v);
      for (const s of extraScripts || []) { try { await loadScript(s); } catch (e) { console.warn('presentation: optional script not loaded', s); } }
      await buildFn();
    } catch (e) { console.error(e); alert((M.LANG === 'es' ? 'No se pudo generar el PDF: ' : 'The PDF could not be built: ') + (e.message || e)); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = label; } }
  }

  // Deep link: /<slug>/?present=1[&lang=es|en] opens the page, sets the language and builds the PDF at once
  // (the landing pages link to it). The build starts after load so the page's own model is ready.
  function autoRun(buildFn) {
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (!q.has('present')) return;
    const go = () => {
      const lang = q.get('lang'); const b = lang === 'en' ? document.getElementById('btnLangEn') : lang === 'es' ? document.getElementById('btnLangEs') : null;
      if (b && !b.classList.contains('active')) b.click();
      setTimeout(buildFn, 700);
    };
    if (document.readyState === 'complete') setTimeout(go, 300); else window.addEventListener('load', () => setTimeout(go, 300));
  }

  class Doc {
    // cfg: { slug, short, name, tickerLine, url, fileStem, confidential: {es,en} (optional) }
    constructor(M, cfg) {
      this.M = M; this.cfg = cfg; this.es = M.LANG === 'es'; this.T = (es, en) => (this.es ? es : en);
      const { jsPDF } = window.jspdf;
      this.pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape', compress: true });
      this.pdf.setLineHeightFactor(1.3);
      this.first = true; this.pages = []; this.cur = null;
      this.today = new Date();
      this.todayIso = this.today.toISOString().slice(0, 10);
      this.debug = false;
    }
    // ----- page management -----
    page(orient, title, subtitle) {
      const g = PAGE[orient];
      while (this.cur && this.pages.length < this.pdf.getNumberOfPages()) { console.warn('presentation: a table spilled onto an extra page after', this.cur.title); this.pages.push({ ...this.cur }); }
      if (this.first) { this.first = false; } else this.pdf.addPage('letter', orient === 'L' ? 'landscape' : 'portrait');
      this.cur = { orient, w: g.w, h: g.h, x0: MARGIN.left, x1: g.w - MARGIN.right, y0: MARGIN.top, y1: g.h - MARGIN.bottom, title };
      this.pages.push(this.cur);
      let y = this.cur.y0;
      if (title) {
        this.font('bold', 17, ACCENT); this.pdf.text(tx(this.es ? title : titleCase(title)), this.cur.x0, y + 15);
        y += 21;
        if (subtitle) { this.font('normal', 9.5, MUTED); const lines = this.pdf.splitTextToSize(tx(subtitle), this.cur.x1 - this.cur.x0); this.pdf.text(lines, this.cur.x0, y + 10); y += 12 * lines.length + 1; }
        this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(0.8); this.pdf.line(this.cur.x0, y + 5, this.cur.x1, y + 5); y += 14;
      }
      this.y = y; return y;
    }
    font(style, size, color) { this.pdf.setFont('helvetica', style || 'normal'); this.pdf.setFontSize(size || 10); this.pdf.setTextColor(...(color || INK)); }
    // Width of a string as the PDF renders it: jsPDF's getTextWidth applies kerning pairs (VA, AT, LA...) that the
    // written page does not, so word-by-word placement must add up glyph advances instead.
    tw(str) { let w = 0; for (const ch of String(str)) w += this.pdf.getTextWidth(ch); return w; }
    width() { return this.cur.x1 - this.cur.x0; }
    // Paragraph. Returns the y after the block.
    text(str, x, y, w, size, style, color, lh) {
      this.font(style, size, color); const lines = this.pdf.splitTextToSize(tx(str), w); this.pdf.text(lines, x, y + size * 0.85); return y + lines.length * size * (lh || 1.3) + 1;
    }
    // Word-wrap text that may contain **bold** runs into lines of [{ t, b }] words.
    richLines(text, w, size, style) {
      const runs = []; let b = false;
      for (const seg of String(text).split('**')) { if (seg) { const words = tx(seg).split(' ').filter(Boolean); if (words.length && /^[,;.:)]/.test(words[0]) && runs.length) { runs[runs.length - 1] = { ...runs[runs.length - 1], tail: words[0] }; words.shift(); } for (const word of words) runs.push({ t: word, b }); } b = !b; }
      const width = (r) => { this.pdf.setFont('helvetica', r.b ? 'bold' : style || 'normal'); this.pdf.setFontSize(size); let w2 = this.tw(r.t); if (r.tail) { this.pdf.setFont('helvetica', style || 'normal'); w2 += this.tw(r.tail); } return w2; };
      this.pdf.setFont('helvetica', style || 'normal'); this.pdf.setFontSize(size); const sp = this.tw(' ');
      const lines = []; let line = [], used = 0;
      for (const r of runs) { const rw = width(r); if (line.length && used + sp + rw > w) { lines.push(line); line = []; used = 0; } line.push(r); used += (line.length > 1 ? sp : 0) + rw; }
      if (line.length) lines.push(line);
      return { lines, sp };
    }
    bullets(items, x, y, w, size, opts = {}) {
      const ind = opts.indent == null ? 9 : opts.indent; const lh = opts.lh || 1.3; const gap = opts.gap == null ? size * 0.45 : opts.gap;
      for (const it of items) {
        const { lines, sp } = this.richLines(it, w - ind, size, opts.style);
        this.font(opts.style || 'normal', size, opts.color || INK); this.pdf.text('•', x, y + size * 0.85);
        lines.forEach((ln, li) => { let cx = x + ind; const yy = y + size * 0.85 + li * size * lh; for (const r of ln) { this.pdf.setFont('helvetica', r.b ? 'bold' : opts.style || 'normal'); this.pdf.setFontSize(size); this.pdf.setTextColor(...(r.b ? INK : opts.color || INK)); this.pdf.text(r.t, cx, yy); cx += this.tw(r.t); if (r.tail) { this.pdf.setFont('helvetica', opts.style || 'normal'); this.pdf.setTextColor(...(opts.color || INK)); this.pdf.text(r.tail, cx, yy); cx += this.tw(r.tail); } cx += sp; } });
        y += lines.length * size * lh + gap;
      }
      return y;
    }
    measureBullets(items, w, size, opts = {}) { const ind = opts.indent == null ? 9 : opts.indent; const lh = opts.lh || 1.3; const gap = opts.gap == null ? size * 0.45 : opts.gap; let h = 0; for (const it of items) h += this.richLines(it, w - ind, size, opts.style).lines.length * size * lh + gap; return h; }
    heading(str, x, y, size = 11) { this.font('bold', size, ACCENT); this.pdf.text(tx(this.es ? str : titleCase(str)), x, y + size * 0.85); return y + size * 1.5; }
    note(str, y, size = 7.5, x, w) { return this.text(str, x == null ? this.cur.x0 : x, y, w == null ? this.width() : w, size, 'normal', MUTED, 1.25); }
    measureText(str, w, size, lh) { this.font('normal', size); return this.pdf.splitTextToSize(tx(str), w).length * size * (lh || 1.3) + 1; }
    // A note that must sit above the footer: placed at `y`, or higher if it would not fit.
    noteAbove(str, y, size = 7.5, x, w) { const h = this.measureText(str, w == null ? this.width() : w, size, 1.25); return this.note(str, Math.min(y, this.cur.y1 - h), size, x, w); }
    rule(y) { this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.5); this.pdf.line(this.cur.x0, y, this.cur.x1, y); }
    // ----- tables (jsPDF-AutoTable) -----
    table(o) {
      const opt = {
        startY: o.y, margin: { left: o.x != null ? o.x : this.cur.x0, right: o.x != null ? this.cur.w - o.x - o.w : MARGIN.right, top: MARGIN.top, bottom: MARGIN.bottom },
        tableWidth: o.w || this.width(), theme: 'plain', head: o.head ? [o.head.map(tx)] : undefined, body: o.body.map((r) => r.map(tx)),
        styles: { font: 'helvetica', fontSize: o.size || 8.5, cellPadding: o.pad || { top: 2.2, bottom: 2.2, left: 3.5, right: 3.5 }, textColor: INK, lineColor: GRID, lineWidth: { bottom: 0.35 }, halign: 'right', valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: HEAD, textColor: ACCENT, fontStyle: 'bold', fontSize: (o.size || 8.5) - 0.5, halign: 'right', lineWidth: { bottom: 0.8 }, lineColor: ACCENT },
        alternateRowStyles: { fillColor: ALT }, columnStyles: o.cols || {}, pageBreak: o.pageBreak || 'avoid', rowPageBreak: 'avoid',
        didParseCell: (d) => {
          const m = o.meta && d.section === 'body' && o.meta[d.row.index] ? o.meta[d.row.index][d.column.index] : null;
          if (m) { if (m.includes('pos')) d.cell.styles.textColor = POS; if (m.includes('neg')) d.cell.styles.textColor = NEG; if (m.includes('bold')) d.cell.styles.fontStyle = 'bold'; if (m.includes('muted')) d.cell.styles.textColor = MUTED; if (m.includes('sub')) d.cell.styles.cellPadding = { top: 2.2, bottom: 2.2, left: 12, right: 3.5 }; if (m.includes('head')) { d.cell.styles.fillColor = [242, 244, 242]; d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = ACCENT; } if (m.includes('small')) d.cell.styles.fontSize = (o.size || 8.5) - 1; if (m.includes('left')) d.cell.styles.halign = 'left'; }
          if (d.section === 'head' && o.cols && o.cols[d.column.index] && o.cols[d.column.index].halign) d.cell.styles.halign = o.cols[d.column.index].halign;
          if (d.section === 'body' && o.rowSpan && o.rowSpan[d.row.index] && d.column.index === 0) d.cell.colSpan = o.rowSpan[d.row.index];
        },
      };
      if (window.autoTable) window.autoTable(this.pdf, opt); else this.pdf.autoTable(opt);
      const last = this.pdf.lastAutoTable; return last ? last.finalY : o.y;
    }
    // Measure a table on a scratch document (same page size) and return { pages, finalY }.
    measureTable(o) {
      const { jsPDF } = window.jspdf; const tmp = new jsPDF({ unit: 'pt', format: 'letter', orientation: this.cur.orient === 'L' ? 'landscape' : 'portrait' });
      tmp.setLineHeightFactor(this.pdf.getLineHeightFactor());
      const saved = this.pdf; this.pdf = tmp; try { const fy = this.table(o); return { pages: tmp.getNumberOfPages(), finalY: fy }; } finally { this.pdf = saved; }
    }
    // Shrink the font until the table fits on the current page above `limitY`.
    fitTable(o, sizes, limitY) {
      for (const s of sizes) { const r = this.measureTable({ ...o, size: s, pageBreak: 'auto' }); if (this.debug) console.log('fitTable', this.cur.title, 'size', s, 'pages', r.pages, 'finalY', Math.round(r.finalY), 'limit', Math.round(limitY)); if (r.pages === 1 && r.finalY <= limitY) return this.table({ ...o, size: s }); }
      console.warn('presentation: table does not fit at any size on', this.cur.title);
      return this.table({ ...o, size: sizes[sizes.length - 1], pageBreak: 'auto' });
    }
    // ----- charts (Chart.js off-screen) -----
    chart(cfg, w, h) {
      if (typeof Chart === 'undefined') return null;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const holder = document.createElement('div'); holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${w}px;height:${h}px;`; holder.appendChild(cv); document.body.appendChild(holder);
      const font = { family: 'Helvetica, Arial, sans-serif', size: 11 };
      cfg.options = cfg.options || {};
      cfg.options = Object.assign({ responsive: false, animation: false, devicePixelRatio: 3, color: '#3a3a38', font }, cfg.options);
      cfg.options.plugins = Object.assign({ legend: { display: true, position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, font: { size: 10.5 }, color: '#3a3a38' } }, tooltip: { enabled: false } }, cfg.options.plugins || {});
      cfg.options.scales = cfg.options.scales || {};
      for (const k of Object.keys(cfg.options.scales)) { const sc = cfg.options.scales[k]; sc.grid = Object.assign({ color: '#e2e0da', drawTicks: false }, sc.grid || {}); sc.border = Object.assign({ color: '#b5b3ac' }, sc.border || {}); sc.ticks = Object.assign({ color: '#4a4945', font: { size: 10 } }, sc.ticks || {}); }
      cfg.options.elements = Object.assign({ line: { borderWidth: 2, tension: 0.15 }, point: { radius: 0 }, bar: { borderRadius: 2, borderSkipped: 'bottom' } }, cfg.options.elements || {});
      const ch = new Chart(cv, cfg); const url = cv.toDataURL('image/png'); ch.destroy(); holder.remove(); return url;
    }
    image(url, x, y, w, h) { if (url) this.pdf.addImage(url, 'PNG', x, y, w, h, undefined, 'FAST'); return y + h; }
    // Row of figure tiles: [{ v, l, size? }]
    tiles(items, y, h = 50) {
      const n = items.length, gap = 10, tw = (this.width() - (n - 1) * gap) / n;
      items.forEach((f, i) => { const x = this.cur.x0 + i * (tw + gap); this.pdf.setFillColor(...HEAD); this.pdf.roundedRect(x, y, tw, h, 4, 4, 'F'); this.font('bold', f.size || 14, ACCENT); this.pdf.text(tx(f.v), x + 8, y + 21); this.font('normal', 7.6, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(f.l), tw - 14), x + 8, y + 33); });
      return y + h + 14;
    }
    // Rounded box with a bold title and a muted subtitle.
    box(x, y, w, h, title, sub, fill) {
      this.pdf.setFillColor(...(fill || HEAD)); this.pdf.setDrawColor(...GRID); this.pdf.roundedRect(x, y, w, h, 4, 4, 'FD');
      this.font('bold', 9.2, ACCENT); const tl = this.pdf.splitTextToSize(tx(title), w - 12); this.pdf.text(tl, x + 6, y + 13);
      this.font('normal', 7.4, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(sub), w - 12), x + 6, y + 13 + tl.length * 10.5 + 2);
    }
    arrow(x1, x2, yy, label, above, color) {
      this.pdf.setDrawColor(...(color || ACCENT)); this.pdf.setLineWidth(0.9); this.pdf.line(x1, yy, x2, yy);
      const dir = x2 > x1 ? 1 : -1; this.pdf.line(x2, yy, x2 - dir * 5, yy - 3); this.pdf.line(x2, yy, x2 - dir * 5, yy + 3);
      if (label) { this.font('normal', 7.2, color || ACCENT); const ls = this.pdf.splitTextToSize(tx(label), Math.abs(x2 - x1) - 6); this.pdf.text(ls, (x1 + x2) / 2, yy + (above ? -5 - (ls.length - 1) * 8 : 10), { align: 'center' }); }
    }
    // Vertical connector from (x, y1) down to (x, y2) with an arrowhead.
    down(x, y1, y2, color) { this.pdf.setDrawColor(...(color || ACCENT)); this.pdf.setLineWidth(0.9); this.pdf.line(x, y1, x, y2); this.pdf.line(x, y2, x - 3, y2 - 5); this.pdf.line(x, y2, x + 3, y2 - 5); }

    // ----- formatting (delegated to the page's helpers so PDF and screen agree) -----
    n(v, d) { return this.M.fmtN(v, d); } m(v, d) { return this.M.fmtM(v, d); } pct(v, d, s) { return this.M.fmtPct(v, d, s); } x(v, d) { return this.M.fmtX(v, d); } date(iso) { return this.M.fmtDate(iso); }
    longDate(d) { return d.toLocaleDateString(this.es ? 'es-MX' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    stamp(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleString(this.es ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' }) + this.T(' hora CDMX', ' CDMX time'); }
    cls(v) { return v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }
    qlab(q) { return this.M.qLabel(q); }
    // Two to four key words per bullet: **markers** in the curated text win; otherwise the lead clause up to the
    // first ";" or ":" (or "," when the clause is long) is emphasised.
    autoBold(text) {
      const s = String(text); if (s.includes('**')) return s;
      let i = s.search(/[;:]/); if (i < 0 || i > 70) { const j = s.indexOf(','); if (j > 0 && j <= 70) i = j; }
      if (i <= 0) return s;
      return `**${s.slice(0, i)}**${s.slice(i)}`;
    }
    // Next results date: confirmed from reference.js (calendar.nextResults) when the company has announced it;
    // otherwise assumed from the median lag between quarter-end and release for the same quarter in the last three years.
    nextResults() {
      const M = this.M, lastQ = M.lastQ; if (!lastQ) return null;
      const nq = lastQ.q === 4 ? { fy: lastQ.fy + 1, q: 1 } : { fy: lastQ.fy, q: lastQ.q + 1 };
      const cal = M.REF.calendar && M.REF.calendar.nextResults;
      if (cal && cal.date && cal.date >= this.todayIso) return { q: nq, date: cal.date, kind: 'confirmed', source: cal.source || null };
      const dayOf = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
      const relDate = (q) => q.releaseDate || (q.sources && q.sources.is && q.sources.is.date);
      const lags = [], yrs = [];
      for (let y = nq.fy - 1; y >= nq.fy - 3; y--) { const q = M.qById[`${y}Q${nq.q}`]; if (q && relDate(q)) { lags.push(dayOf(relDate(q)) - dayOf(M.qEndDate(q))); yrs.push(y); } }
      if (!lags.length) return { q: nq, date: null, kind: 'unknown' };
      lags.sort((a, b) => a - b); const med = lags[Math.floor((lags.length - 1) / 2)];
      const end = M.qEndDate(nq); const d = new Date(end + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + med);
      return { q: nq, date: d.toISOString().slice(0, 10), kind: 'assumed', years: [Math.min(...yrs), Math.max(...yrs)] };
    }
    nextText() {
      const n = this.next || (this.next = this.nextResults()); if (!n) return '';
      const q = this.qlab(n.q), co = this.cfg.short;
      if (n.kind === 'confirmed') return this.T(`Próximos resultados (${q}): ${this.date(n.date)}, confirmada por ${co}`, `Next results (${q}): ${this.date(n.date)}, confirmed by ${co}`);
      if (n.kind === 'assumed') return this.T(`Próximos resultados (${q}): ~${this.date(n.date)}, fecha supuesta según el historial de publicación de ${co}`, `Next results (${q}): ~${this.date(n.date)}, assumed from ${co}'s release history`);
      return this.T(`Próximos resultados (${q}): fecha por confirmar`, `Next results (${q}): date to be confirmed`);
    }
    confidential() { return (this.cfg.confidential && this.T(this.cfg.confidential.es, this.cfg.confidential.en)) || this.T('Confidencial · Preparado para Talipot Research & Analysis; no distribuir.', 'Confidential · Prepared for Talipot Research & Analysis; not for distribution.'); }

    // ----- cover page (landscape, unnumbered) -----
    cover(dataLine) {
      this.page('L');
      const c = this.cur, cx = c.x0 + 30;
      this.pdf.setFillColor(...ACCENT); this.pdf.rect(0, 0, 14, c.h, 'F');
      this.font('bold', 30, INK); const lines = this.pdf.splitTextToSize(tx(this.cfg.name), c.x1 - cx); this.pdf.text(lines, cx, 150);
      let y = 150 + lines.length * 36;
      this.font('bold', 17, ACCENT); this.pdf.text(tx(this.cfg.tickerLine), cx, y); y += 34;
      this.font('normal', 15, INK); this.pdf.text(tx(this.longDate(this.today)), cx, y); y += 46;
      this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.8); this.pdf.line(cx, y, cx + 300, y); y += 26;
      this.font('normal', 12, INK); this.pdf.text(tx(`Powered by ${POWERED_BY}`), cx, y); y += 20;
      this.pdf.text(tx(`Prompted by ${PROMPTED_BY}`), cx, y); y += 18;
      this.pdf.text(tx(PROMPTED_ROLE), cx, y); y += 20;
      this.font('normal', 10, MUTED);
      const basis = [dataLine, this.T(`Elaborado únicamente con información pública (${this.cfg.publicSources || 'comunicados de la empresa'}) · ${this.cfg.url}`, `Built only from public information (${this.cfg.publicSourcesEn || 'company releases'}) · ${this.cfg.url}`)].filter(Boolean);
      this.pdf.text(basis.map(tx), cx, c.h - 96);
      this.font('bold', 10, ACCENT); this.pdf.text(tx(this.confidential()), cx, c.h - 56);
    }
    // ----- executive summary: two columns, largest font that fits -----
    execSummary(sections, subtitle) {
      let y = this.page('L', this.T('Resumen ejecutivo', 'Executive Summary'), subtitle);
      const gap = 22, colW = (this.width() - gap) / 2, availH = this.cur.y1 - y - 4;
      const half = Math.ceil(sections.length / 2), cols = [sections.slice(0, half), sections.slice(half)];
      let size;
      const colH = (col, s) => col.reduce((h, sec) => h + s * 1.5 + 2 + this.measureBullets(sec.items, colW, s, { lh: 1.32, gap: s * 0.5 }) + s * 0.9, 0);
      for (size = 13; size >= 8; size -= 0.25) { if (Math.max(...cols.map((c) => colH(c, size))) <= availH) break; }
      const hs = size;
      cols.forEach((col, i) => {
        let yy = y; const x = this.cur.x0 + i * (colW + gap);
        for (const sec of col) { yy = this.heading(sec.title, x, yy, hs + 1) + 2; yy = this.bullets(sec.items, x, yy, colW, hs, { lh: 1.32, gap: hs * 0.5 }) + hs * 0.9; }
      });
      this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.5); this.pdf.line(this.cur.x0 + colW + gap / 2, y, this.cur.x0 + colW + gap / 2, this.cur.y1 - 6);
    }
    // ----- footers and download -----
    finish() {
      while (this.pages.length < this.pdf.getNumberOfPages()) this.pages.push({ ...this.cur });
      const n = this.pdf.getNumberOfPages();
      const left = this.T(`${this.cfg.short} (${this.cfg.tickerLine}) · Presentación para el consejo · ${this.date(this.todayIso)} · ${this.confidential()} · Solo información pública · ${this.cfg.url}`, `${this.cfg.short} (${this.cfg.tickerLine}) · Board presentation · ${this.date(this.todayIso)} · ${this.confidential()} · Public information only · ${this.cfg.url}`);
      for (let i = 2; i <= n; i++) {
        const pg = this.pages[i - 1]; if (!pg) continue; this.pdf.setPage(i);
        this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.5); this.pdf.line(pg.x0, pg.h - 30, pg.x1, pg.h - 30);
        this.font('normal', 7.2, MUTED); this.pdf.text(tx(left), pg.x0, pg.h - 19, { maxWidth: pg.x1 - pg.x0 - 90 });
        this.font('bold', 8, INK); const s = this.T(`Página ${i} de ${n}`, `Page ${i} of ${n}`); this.pdf.text(s, pg.x1, pg.h - 19, { align: 'right' });
      }
      const name = this.T(`${this.cfg.fileStem}_presentacion_${this.todayIso}.pdf`, `${this.cfg.fileStem}_board_presentation_${this.todayIso}.pdf`);
      this.pdf.setProperties({ title: this.T(`${this.cfg.short} · Presentación para el consejo`, `${this.cfg.short} · Board presentation`), subject: name, creator: 'fnam.mx' });
      this.pdf.save(name);
    }
  }

  window.FNAM_PRESENT = { Doc, run, autoRun, tx, titleCase, loadScript, C, PALETTE, MARGIN, PAGE };
})();
