/* GAP board presentation — one click builds a Letter PDF from the same data the page renders.
   Every figure comes from window.GAP_MODEL (app.js), i.e. the calculations already on screen; nothing is
   typed in here except section prose, which is trimmed to bullets and quotes the reference data.
   Libraries: jsPDF 4 + jsPDF-AutoTable 5 (site/assets/vendor, loaded on demand); charts via Chart.js
   drawn on an off-screen canvas. Language follows the page toggle. Cover page is unnumbered; every other
   page carries a confidentiality footer and "Page X of Y". */
(function () {
  'use strict';
  const VENDOR = ['/assets/vendor/jspdf.umd.min.js', '/assets/vendor/jspdf.plugin.autotable.min.js'];
  const MX_TRAFFIC = '/aeropuertos/data/traffic.js';               // national series (AFAC) for the GAP-vs-Mexico chart
  const POWERED_BY = window.FNAM_MODEL_NAME || 'Claude (Anthropic)';
  const PROMPTED_BY = 'Martha V. Shelton, CFA', PROMPTED_ROLE = 'Director, Talipot Research & Analysis';

  // ---------- page geometry (points; Letter) ----------
  const PAGE = { L: { w: 792, h: 612 }, P: { w: 612, h: 792 } };
  const MARGIN = { left: 40, right: 40, top: 36, bottom: 44 };
  const INK = [11, 11, 11], MUTED = [92, 91, 87], ACCENT = [27, 67, 50], GRID = [214, 212, 205], HEAD = [236, 240, 236], ALT = [249, 249, 247];
  const POS = [26, 127, 55], NEG = [180, 35, 24];
  const PALETTE = ['#1b4332', '#b8912a', '#2f6f9f', '#9a4d9a', '#c0392b', '#7f8c8d', '#3a3a38', '#5b8c5a'];

  // Helvetica (WinAnsi) has no glyph for these; swap them before drawing.
  const SWAP = { '−': '-', '≈': '~', '→': '->', '↗': '', 'Δ': 'Chg', '≥': '>=', '≤': '<=', '‑': '-', ' ': ' ', ' ': ' ', '₂': '2', '₆': '6', '⁵': '5', 'β': 'beta', ' ': ' ', ' ': ' ', '…': '...', '✓': 'v', '✘': 'x', '▸': '', '▾': '', '↑': '+', '↓': '-' };
  const tx = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/[−≈→↗Δ≥≤‑  ₂₆⁵β  …✓✘▸▾↑↓]/g, (c) => SWAP[c]).replace(/\s+/g, ' ').trim();

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

  // ---------- builder ----------
  async function build() {
    const M = window.GAP_MODEL; if (!M) { alert('Model not ready'); return; }
    const btn = document.getElementById('btnPrint'); const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = M.LANG === 'es' ? '⏳ Generando PDF…' : '⏳ Building PDF…'; }
    try {
      for (const v of VENDOR) await loadScript(v);
      if (!window.MX_AIRPORTS) { try { await loadScript(MX_TRAFFIC); } catch (e) { /* chart falls back to GAP only */ } }
      const doc = new Doc(M);
      doc.cover(); doc.execSummary(); doc.tearSheet(); doc.opsPage(); doc.incomePage('q'); doc.incomePage('ltm'); doc.incomePage('fy');
      doc.guidancePage(); doc.trafficTables(); doc.trafficCharts(); doc.debtPage(); doc.dividendPage(); doc.cbxPage(); doc.fibraPage(); doc.sourcesPage();
      doc.finish();
    } catch (e) { console.error(e); alert((M.LANG === 'es' ? 'No se pudo generar el PDF: ' : 'The PDF could not be built: ') + (e.message || e)); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = label; } }
  }

  class Doc {
    constructor(M) {
      this.M = M; this.es = M.LANG === 'es'; this.T = (es, en) => (this.es ? es : en);
      const { jsPDF } = window.jspdf;
      this.pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape', compress: true });
      this.pdf.setLineHeightFactor(1.3);
      this.first = true; this.pages = []; this.cur = null;
      this.today = new Date();
      this.todayIso = this.today.toISOString().slice(0, 10);
      this.MX = window.MX_AIRPORTS || null;
      this.next = this.nextResults();
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
    width() { return this.cur.x1 - this.cur.x0; }
    // Paragraph / bullets. Returns the y after the block.
    text(str, x, y, w, size, style, color, lh) {
      this.font(style, size, color); const lines = this.pdf.splitTextToSize(tx(str), w); this.pdf.text(lines, x, y + size * 0.85); return y + lines.length * size * (lh || 1.3) + 1;
    }
    // Word-wrap text that may contain **bold** runs into lines of [{ t, b }] words.
    richLines(text, w, size, style) {
      const runs = []; let b = false;
      for (const seg of String(text).split('**')) { if (seg) { const words = tx(seg).split(' ').filter(Boolean); if (words.length && /^[,;.:)]/.test(words[0]) && runs.length) { runs[runs.length - 1] = { ...runs[runs.length - 1], tail: words[0] }; words.shift(); } for (const word of words) runs.push({ t: word, b }); } b = !b; }
      const width = (r) => { this.pdf.setFont('helvetica', r.b ? 'bold' : style || 'normal'); this.pdf.setFontSize(size); let w2 = this.pdf.getTextWidth(r.t); if (r.tail) { this.pdf.setFont('helvetica', style || 'normal'); w2 += this.pdf.getTextWidth(r.tail); } return w2; };
      this.pdf.setFont('helvetica', style || 'normal'); this.pdf.setFontSize(size); const sp = this.pdf.getTextWidth(' ');
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
        lines.forEach((ln, li) => { let cx = x + ind; const yy = y + size * 0.85 + li * size * lh; for (const r of ln) { this.pdf.setFont('helvetica', r.b ? 'bold' : opts.style || 'normal'); this.pdf.setFontSize(size); this.pdf.setTextColor(...(r.b ? INK : opts.color || INK)); this.pdf.text(r.t, cx, yy); cx += this.pdf.getTextWidth(r.t); if (r.tail) { this.pdf.setFont('helvetica', opts.style || 'normal'); this.pdf.setTextColor(...(opts.color || INK)); this.pdf.text(r.tail, cx, yy); cx += this.pdf.getTextWidth(r.tail); } cx += sp; } });
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
      for (const s of sizes) { const r = this.measureTable({ ...o, size: s, pageBreak: 'auto' }); if (window.GAP_PRESENT && window.GAP_PRESENT.debug) console.log('fitTable', this.cur.title, 'size', s, 'pages', r.pages, 'finalY', Math.round(r.finalY), 'limit', Math.round(limitY)); if (r.pages === 1 && r.finalY <= limitY) return this.table({ ...o, size: s }); }
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

    // ----- shared formatting -----
    n(v, d) { return this.M.fmtN(v, d); } m(v, d) { return this.M.fmtM(v, d); } pct(v, d, s) { return this.M.fmtPct(v, d, s); } x(v, d) { return this.M.fmtX(v, d); } date(iso) { return this.M.fmtDate(iso); }
    longDate(d) { return d.toLocaleDateString(this.es ? 'es-MX' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    stamp(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleString(this.es ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' }) + this.T(' hora CDMX', ' CDMX time'); }
    cls(v) { return v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }
    qlab(q) { return this.M.qLabel(q); }
    // Next results date: confirmed from reference.js (calendar.nextResults) when GAP has announced it; otherwise
    // assumed from the median lag between quarter-end and release for the same quarter in the last three years.
    nextResults() {
      const M = this.M, lastQ = M.lastQ; if (!lastQ) return null;
      const nq = lastQ.q === 4 ? { fy: lastQ.fy + 1, q: 1 } : { fy: lastQ.fy, q: lastQ.q + 1 };
      const cal = M.REF.calendar && M.REF.calendar.nextResults;
      if (cal && cal.date && cal.date >= this.todayIso) return { q: nq, date: cal.date, kind: 'confirmed', source: cal.source || null };
      const dayOf = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
      const lags = [], yrs = [];
      for (let y = nq.fy - 1; y >= nq.fy - 3; y--) { const q = M.qById[`${y}Q${nq.q}`]; if (q && q.sources && q.sources.is && q.sources.is.date) { lags.push(dayOf(q.sources.is.date) - dayOf(M.qEndDate(q))); yrs.push(y); } }
      if (!lags.length) return { q: nq, date: null, kind: 'unknown' };
      lags.sort((a, b) => a - b); const med = lags[Math.floor((lags.length - 1) / 2)];
      const end = M.qEndDate(nq); const d = new Date(end + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + med);
      return { q: nq, date: d.toISOString().slice(0, 10), kind: 'assumed', years: [Math.min(...yrs), Math.max(...yrs)] };
    }
    nextText() {
      const n = this.next; if (!n) return '';
      const q = this.qlab(n.q);
      if (n.kind === 'confirmed') return this.T(`Próximos resultados (${q}): ${this.date(n.date)}, confirmada por GAP`, `Next results (${q}): ${this.date(n.date)}, confirmed by GAP`);
      if (n.kind === 'assumed') return this.T(`Próximos resultados (${q}): ~${this.date(n.date)}, fecha supuesta según el historial de publicación de GAP`, `Next results (${q}): ~${this.date(n.date)}, assumed from GAP's release history`);
      return this.T(`Próximos resultados (${q}): fecha por confirmar`, `Next results (${q}): date to be confirmed`);
    }
    // Next monthly traffic report: the month after the latest one, on GAP's usual day (median of the last twelve releases).
    nextTraffic() {
      const M = this.M, ms = M.TR.months; if (!ms.length) return null;
      const days = ms.slice(-12).map((m) => (m.source && m.source.date ? +m.source.date.slice(8, 10) : null)).filter(Boolean).sort((a, b) => a - b);
      const day = days.length ? days[Math.floor((days.length - 1) / 2)] : 5;
      const last = ms[ms.length - 1].ym; const y = +last.slice(0, 4), mo = +last.slice(5, 7);
      const rel = new Date(Date.UTC(y, mo - 1 + 2, day)); // data month = last + 1, released the month after that
      return { day, date: rel.toISOString().slice(0, 10), month: rel.toLocaleDateString(this.es ? 'es-MX' : 'en-US', { month: 'long', timeZone: 'UTC' }) };
    }
    // "(≈5th)" / "(≈día 5)" placeholders in the curated summary become the actual expected date.
    liveDates(text) {
      const n = this.nextTraffic(); if (!n) return text;
      const ord = (d) => (this.es ? String(d) : d + ([, 'st', 'nd', 'rd'][(d % 100 >> 3 ^ 1 && d % 10) || 0] || 'th'));
      return String(text).replace(/\((?:~|≈)\s*(?:día\s*)?\d{1,2}(?:st|nd|rd|th)?\)/g, this.es ? `(hacia el ${n.day} de ${n.month})` : `(around ${n.month} ${ord(n.day)})`);
    }
    basisLine() {
      const M = this.M, lastQ = M.lastQ, lastM = M.TR.months[M.TR.months.length - 1], gv = M.GV[M.GV.length - 1];
      return this.T(`Base: resultados del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}) · tráfico de ${M.ymLabel(lastM.ym)} (${this.date(lastM.source && lastM.source.date)}) · guía del ${this.date(gv.date)} · mercado al cierre del ${this.date(M.lastPx[0])}`,
        `Basis: ${this.qlab(lastQ)} results (${this.date(lastQ.sources.is.date)}) · ${M.ymLabel(lastM.ym)} traffic (${this.date(lastM.source && lastM.source.date)}) · guidance of ${this.date(gv.date)} · market close ${this.date(M.lastPx[0])}`);
    }

    // ================= 1. COVER =================
    cover() {
      const M = this.M; this.page('L');
      const c = this.cur, cx = c.x0 + 30;
      this.pdf.setFillColor(...ACCENT); this.pdf.rect(0, 0, 14, c.h, 'F');
      this.font('bold', 30, INK); const name = M.REF.company ? M.REF.company.name : 'Grupo Aeroportuario del Pacífico'; const lines = this.pdf.splitTextToSize(tx(name), c.x1 - cx); this.pdf.text(lines, cx, 150);
      let y = 150 + lines.length * 36;
      this.font('bold', 17, ACCENT); this.pdf.text(tx(`BMV: ${(M.REF.company && M.REF.company.short) || 'GAP'}  ·  NYSE: PAC`), cx, y); y += 34;
      this.font('normal', 15, INK); this.pdf.text(tx(this.longDate(this.today)), cx, y); y += 46;
      this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.8); this.pdf.line(cx, y, cx + 300, y); y += 26;
      this.font('normal', 12, INK); this.pdf.text(tx(`Powered by ${POWERED_BY}`), cx, y); y += 20;
      this.pdf.text(tx(`Prompted by ${PROMPTED_BY}`), cx, y); y += 18;
      this.pdf.text(tx(PROMPTED_ROLE), cx, y); y += 20;
      const lastQ = M.lastQ, lastM = M.TR.months[M.TR.months.length - 1];
      this.font('normal', 10, MUTED);
      const basis = [this.T(`Datos: resultados del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}), tráfico de ${M.ymLabel(lastM.ym)}, mercado al ${this.date(M.lastPx[0])}.`, `Data: ${this.qlab(lastQ)} results (${this.date(lastQ.sources.is.date)}), ${M.ymLabel(lastM.ym)} traffic, market as of ${this.date(M.lastPx[0])}.`),
        this.T('Elaborado únicamente con información pública (BMV, SEC, comunicados de la empresa) · fnam.mx/gap', 'Built only from public information (BMV, SEC, company releases) · fnam.mx/gap')];
      this.pdf.text(basis.map(tx), cx, c.h - 96);
      this.font('bold', 10, ACCENT); this.pdf.text(tx(this.confidential()), cx, c.h - 56);
    }
    confidential() { return this.T('Confidencial · Preparado para Talipot Research & Analysis; no distribuir.', 'Confidential · Prepared for Talipot Research & Analysis; not for distribution.'); }

    // ================= 2. EXECUTIVE SUMMARY =================
    execSummary() {
      const M = this.M, secs = (M.SUM.sections || []).map((s) => ({ title: M.L(s.title), items: (s[M.LANG] || s.en || []).map((x) => this.liveDates(x)) }));
      let y = this.page('L', this.T('Resumen ejecutivo', 'Executive Summary'), this.basisLine() + this.T(` · redactado el ${this.date(M.SUM.updatedAt)}`, ` · written ${this.date(M.SUM.updatedAt)}`));
      const gap = 22, colW = (this.width() - gap) / 2, availH = this.cur.y1 - y - 4;
      // two columns, largest font at which both columns fit
      const half = Math.ceil(secs.length / 2), cols = [secs.slice(0, half), secs.slice(half)];
      let size = 13, hs = 0;
      const colH = (col, s) => col.reduce((h, sec) => h + s * 1.5 + 2 + this.measureBullets(sec.items, colW, s, { lh: 1.32, gap: s * 0.5 }) + s * 0.9, 0);
      for (size = 13; size >= 8; size -= 0.25) { if (Math.max(...cols.map((c) => colH(c, size))) <= availH) break; }
      hs = size;
      cols.forEach((col, i) => {
        let yy = y; const x = this.cur.x0 + i * (colW + gap);
        for (const sec of col) {
          yy = this.heading(sec.title, x, yy, hs + 1) + 2;
          yy = this.bullets(sec.items, x, yy, colW, hs, { lh: 1.32, gap: hs * 0.5 }) + hs * 0.9;
        }
      });
      this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.5); this.pdf.line(this.cur.x0 + colW + gap / 2, y, this.cur.x0 + colW + gap / 2, this.cur.y1 - 6);
    }

    // ================= 3. TEAR SHEET =================
    tearSheet() {
      const M = this.M, lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ), px = M.lastPx, gap = M.gapPx;
      const sub = this.T(`Mercado: cierre del ${this.date(px[0])} (datos obtenidos ${this.stamp(M.MK.prices['GAPB.MX'].fetchedAt || M.MK.generatedAt)}) · Financieros: ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)})`, `Market: close of ${this.date(px[0])} (data fetched ${this.stamp(M.MK.prices['GAPB.MX'].fetchedAt || M.MK.generatedAt)}) · Financials: ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)})`);
      let y = this.page('L', this.T('Ficha técnica', 'Tear Sheet'), sub);
      const colW = this.width() * 0.5 - 10, xr = this.cur.x0 + colW + 20;
      const yAgo = M.pointAtOrBefore(gap, M.addDays(px[0], -365)), yStart = M.pointAtOrBefore(gap, `${px[0].slice(0, 4)}-01-01`);
      const ipc = M.px('^MXX'), ipcLast = M.lastPoint(ipc), ipcAgo = ipcLast && M.pointAtOrBefore(ipc, M.addDays(ipcLast[0], -365)), ipcStart = ipcLast && M.pointAtOrBefore(ipc, `${ipcLast[0].slice(0, 4)}-01-01`);
      const chg = (a, b) => (a && b ? 100 * (a[1] / b[1] - 1) : null);
      const w52 = gap.filter((p) => p[0] >= M.addDays(px[0], -365)); const hi = Math.max(...w52.map((p) => p[1])), lo = Math.min(...w52.map((p) => p[1]));
      const fxP = M.pointAtOrBefore(M.fxPts, px[0]); const fx = fxP ? fxP[1] : null;
      const mc = px[1] * M.sharesNow; const ads = M.lastPoint(M.px('PAC'));
      const divs = ((M.MK.dividends && M.MK.dividends['GAPB.MX'] && M.MK.dividends['GAPB.MX'].points) || []).filter((d) => d[0] > M.addDays(px[0], -365)); const dps12 = divs.reduce((a, d) => a + d[1], 0);
      const ev = mc / 1000 + (nd ? nd.net : 0) + ((lastQ.bs && lastQ.bs.nci) || 0);
      const prevQ = M.qById[M.yoyQid(lastQ)];
      const g = (a, b) => (a != null && b ? 100 * (a / b - 1) : null);
      const exRev = (o) => (o && o.is ? o.is.revTotal - (o.is.revConstruction || 0) : null);
      const prevL = prevQ ? M.ltmFor(prevQ) : null;
      // traffic KPIs
      const ms = M.TR.months, lastM = ms[ms.length - 1]; const sum12 = (end) => { const i = ms.findIndex((m) => m.ym === end); return i >= 11 ? ms.slice(i - 11, i + 1).reduce((a, m) => a + m.total.TOTAL, 0) : null; };
      const ltmPax = sum12(lastM.ym), ltmPaxPrev = sum12(`${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const prevM = ms.find((m) => m.ym === `${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const ytd = (ym) => ms.filter((m) => m.ym.slice(0, 4) === ym.slice(0, 4) && m.ym <= ym).reduce((a, m) => a + m.total.TOTAL, 0);
      const ytdNow = ytd(lastM.ym), ytdPrev = prevM ? ytd(prevM.ym) : null;
      const pm = (v) => (v == null ? '' : `${this.pct(v, 1, true)}`);
      const rows = [], meta = [];
      const H = (s) => { rows.push([s, '']); meta.push(['head left', 'head']); };
      const R = (l, v, c) => { rows.push([l, v]); meta.push(['left', c || '']); };
      H(this.T('Mercado', 'Market'));
      R(this.T('Precio GAP B (BMV)', 'GAP B share price (BMV)'), `Ps. ${this.n(px[1], 2)}  ·  ${this.date(px[0])}`);
      if (ads) R(this.T('ADS PAC (NYSE) · 1 ADS = 10 acciones', 'PAC ADS (NYSE) · 1 ADS = 10 shares'), `US$ ${this.n(ads[1], 2)}  ·  ${this.date(ads[0])}`);
      R(this.T('Capitalización de mercado', 'Market capitalisation'), `Ps. ${this.n(mc / 1e9, 1)} ${this.T('mil M', 'bn')}${fx ? `  ·  US$ ${this.n(mc / fx / 1e9, 1)} ${this.T('mil M', 'bn')}` : ''}`);
      if (fx) R(this.T('Tipo de cambio usado (Fed H.10)', 'FX rate used (Fed H.10)'), `${this.n(fx, 4)} MXN/USD  ·  ${this.date(fxP[0])}`, 'muted');
      R(this.T('Acciones en circulación', 'Shares outstanding'), `${this.n(M.sharesNow)}  ·  ${M.REF.shares ? this.date(M.REF.shares.asOf) : ''}`, 'muted');
      R(this.T('Variación en el año (GAP B · IPC)', 'Year-to-date change (GAP B · IPC)'), `${pm(chg(px, yStart))}  ·  IPC ${pm(chg(ipcLast, ipcStart))}`, this.cls(chg(px, yStart)));
      R(this.T('Variación 12 meses (GAP B · IPC)', '12-month change (GAP B · IPC)'), `${pm(chg(px, yAgo))}  ·  IPC ${pm(chg(ipcLast, ipcAgo))}`, this.cls(chg(px, yAgo)));
      R(this.T('Máximo / mínimo 52 semanas', '52-week high / low'), `Ps. ${this.n(hi, 2)}  /  Ps. ${this.n(lo, 2)}`);
      const agm = (M.REF.dividends || []).slice(-1)[0];
      if (agm) R(this.T(`Dividendo aprobado en asamblea ${agm.agmYear} · rendimiento`, `Dividend approved at the ${agm.agmYear} AGM · yield`), `Ps. ${this.n(agm.dps, 2)} ${this.T('por acción', 'per share')}  ·  ${this.pct(100 * agm.dps / px[1])}`);
      if (dps12) R(this.T('Dividendos pagados últimos 12 meses (bolsa)', 'Dividends paid last 12 months (exchange)'), `Ps. ${this.n(dps12, 2)}  ·  ${this.pct(100 * dps12 / px[1])}`, 'muted');
      H(this.T(`Financieros (${this.qlab(lastQ)} · Ps. millones, sin IFRIC 12)`, `Financials (${this.qlab(lastQ)} · Ps. million, ex-IFRIC 12)`));
      if (L) R(this.T('EBITDA últimos 12 meses · margen', 'EBITDA last twelve months · margin'), `Ps. ${this.m(L.is.ebitda)} M  ·  ${this.pct(L.is.ebitdaMarginExIfric)}${prevL ? `  ·  ${pm(g(L.is.ebitda, prevL.is.ebitda))} a/a` : ''}`.replace(' a/a', this.T(' a/a', ' y/y')));
      R(this.T(`EBITDA ${this.qlab(lastQ)} · margen`, `EBITDA ${this.qlab(lastQ)} · margin`), `Ps. ${this.m(lastQ.is.ebitda)} M  ·  ${this.pct(lastQ.is.ebitdaMarginExIfric)}${prevQ ? `  ·  ${pm(g(lastQ.is.ebitda, prevQ.is.ebitda))} ${this.T('a/a', 'y/y')}` : ''}`);
      if (L) R(this.T('Ingresos últimos 12 meses (sin IFRIC 12)', 'Revenue last twelve months (ex-IFRIC 12)'), `Ps. ${this.m(exRev(L))} M${prevL ? `  ·  ${pm(g(exRev(L), exRev(prevL)))} ${this.T('a/a', 'y/y')}` : ''}`);
      if (L) R(this.T('Utilidad neta últimos 12 meses', 'Net income last twelve months'), `Ps. ${this.m(L.is.netIncome)} M${prevL ? `  ·  ${pm(g(L.is.netIncome, prevL.is.netIncome))} ${this.T('a/a', 'y/y')}` : ''}`);
      if (nd) R(this.T(`Deuda neta (${this.date(M.qEndDate(lastQ))})`, `Net debt (${this.date(M.qEndDate(lastQ))})`), `Ps. ${this.m(nd.net)} M  ·  ${this.T('bruta', 'gross')} Ps. ${this.m(nd.gross)} M  ·  ${this.T('efectivo', 'cash')} Ps. ${this.m(nd.cash)} M`);
      if (nd && L) R(this.T('Deuda neta / EBITDA UDM', 'Net debt / LTM EBITDA'), this.x(nd.net / L.is.ebitda, 2), 'bold');
      if (L) R(this.T('VE / EBITDA UDM  ·  P/U UDM', 'EV / LTM EBITDA  ·  LTM P/E'), `${this.x(ev / L.is.ebitda)}  ·  ${L.is.comprehensiveControlling ? this.x(mc / 1000 / L.is.comprehensiveControlling) : '—'}`);
      if (L && L.cf && L.cf.capex != null) R(this.T('Capex últimos 12 meses', 'Capex last twelve months'), `Ps. ${this.m(-L.cf.capex)} M`);
      H(this.T('Operación', 'Operations'));
      if (ltmPax) R(this.T('Pasajeros últimos 12 meses (millones)', 'Passengers last twelve months (million)'), `${this.n(ltmPax / 1000, 1)}${ltmPaxPrev ? `  ·  ${pm(g(ltmPax, ltmPaxPrev))} ${this.T('a/a', 'y/y')}` : ''}`, this.cls(g(ltmPax, ltmPaxPrev)));
      R(this.T(`Pasajeros ${M.ymLabel(lastM.ym)} (millones)`, `Passengers ${M.ymLabel(lastM.ym)} (million)`), `${this.n(lastM.total.TOTAL / 1000, 2)}${prevM ? `  ·  ${pm(g(lastM.total.TOTAL, prevM.total.TOTAL))} ${this.T('a/a', 'y/y')}` : ''}  ·  ${this.T('acum.', 'YTD')} ${pm(g(ytdNow, ytdPrev))}`, this.cls(g(lastM.total.TOTAL, prevM && prevM.total.TOTAL)));
      const gv = M.GV[M.GV.length - 1]; if (gv) R(this.T(`Guía ${gv.fy} (${this.date(gv.date)})`, `${gv.fy} guidance (${this.date(gv.date)})`), `${this.T('tráfico', 'traffic')} ${M.gRange(M.GM[0], gv.items.traffic)}  ·  EBITDA ${M.gRange(M.GM[4], gv.items.ebitda)}  ·  ${this.T('margen', 'margin')} ${M.gRange(M.GM[5], gv.items.ebitdaMargin)}`);
      R(this.T('Próximos resultados', 'Next results'), this.nextText().replace(/^[^:]*:\s*/, ''), this.next && this.next.kind === 'confirmed' ? 'bold' : '');
      const noteStr = this.T(`Fuentes: Yahoo Finance (cierres diarios GAPB.MX, PAC, ^MXX; dividendos), FRED DEXMXUS (Fed H.10), informe trimestral de GAP ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}), reportes mensuales de tráfico de GAP. VE = capitalización + deuda neta + participación no controladora. Deuda neta = préstamos bancarios + certificados bursátiles − efectivo (${nd && nd.basis === 'est' ? 'estimada' : 'balance publicado'}). UDM = últimos doce meses (suma de los cuatro trimestres más recientes).`,
        `Sources: Yahoo Finance (daily closes GAPB.MX, PAC, ^MXX; dividends), FRED DEXMXUS (Fed H.10), GAP ${this.qlab(lastQ)} quarterly report (${this.date(lastQ.sources.is.date)}), GAP monthly traffic reports. EV = market cap + net debt + non-controlling interest. Net debt = bank loans + certificados bursátiles − cash (${nd && nd.basis === 'est' ? 'estimated' : 'published balance sheet'}). LTM = last twelve months (sum of the four most recent quarters).`);
      const noteH = this.measureText(noteStr, this.width(), 7.5, 1.25), limitY = this.cur.y1 - noteH - 10;
      const fy = this.fitTable({ y, w: colW, head: null, body: rows, meta, cols: { 0: { cellWidth: colW * 0.46, halign: 'left' }, 1: { cellWidth: colW * 0.54 } }, pad: { top: 2.6, bottom: 2.6, left: 4, right: 4 } }, [8.6, 8.3, 8, 7.7, 7.4], limitY);
      // right: GAP vs IPC rebased, last 12 months
      const base = M.addDays(px[0], -365);
      const series = [{ id: 'GAPB.MX', label: 'GAP B (BMV)' }, { id: '^MXX', label: 'S&P/BMV IPC' }].map((s) => ({ ...s, pts: M.px(s.id).filter((p) => p[0] >= base) })).filter((s) => s.pts.length > 5);
      const dates = series[0].pts.map((p) => p[0]);
      const ds = series.map((s, i) => { const b = s.pts[0][1]; const map = new Map(s.pts.map((p) => [p[0], p[1]])); let lv = null; return { label: s.label + ` (${this.T('base 100', 'rebased to 100')})`, data: dates.map((d) => { const v = map.get(d); if (v != null) lv = v; return lv != null ? 100 * lv / b : null; }), borderColor: PALETTE[i], backgroundColor: PALETTE[i], borderWidth: i === 0 ? 2.4 : 1.6 }; });
      this.heading(this.T('GAP B vs S&P/BMV IPC · últimos 12 meses (base 100, precio sin dividendos)', 'GAP B vs S&P/BMV IPC · last 12 months (rebased to 100, price only)'), xr, y, 10);
      const img = this.chart({ type: 'line', data: { labels: dates, datasets: ds }, options: { scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (dates[i] ? dates[i].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, 760, 470);
      const cw = this.cur.x1 - xr, chH = cw * 470 / 760;
      this.image(img, xr, y + 18, cw, chH);
      let yy = y + 18 + chH + 6;
      const perf = ds.map((d) => { const last = [...d.data].reverse().find((v) => v != null); return [d.label.replace(/ \(.*\)/, ''), this.pct(last - 100, 1, true)]; });
      yy = this.table({ y: yy, x: xr, w: cw, head: [this.T(`Rendimiento ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`, `Return ${this.date(dates[0])} – ${this.date(dates[dates.length - 1])}`), this.T('Precio', 'Price')], body: perf, meta: perf.map((r) => ['left', this.cls(parseFloat(r[1].replace(',', '')))]), size: 8.5, cols: { 0: { halign: 'left' } } });
      // 3-year price chart in the remaining right-column space
      const rem = limitY - yy - 30;
      if (rem > 90) {
        const b3 = M.addDays(px[0], -365 * 3); const w3 = gap.filter((p) => p[0] >= b3); const step = Math.max(1, Math.ceil(w3.length / 500)); const pts3 = w3.filter((_, i) => i % step === 0 || i === w3.length - 1);
        yy = this.heading(this.T('Precio GAP B (BMV, Ps.) · últimos 3 años', 'GAP B share price (BMV, Ps.) · last 3 years'), xr, yy + 8, 10);
        const h3 = Math.min(rem - 22, 150);
        const img3 = this.chart({ type: 'line', data: { labels: pts3.map((p) => p[0]), datasets: [{ label: 'GAP B', data: pts3.map((p) => p[1]), borderColor: PALETTE[0], backgroundColor: PALETTE[0] + '22', fill: true, borderWidth: 1.6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v, i) => (pts3[i] ? pts3[i][0].slice(0, 7) : '') }, grid: { display: false } }, y: { ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(cw * 1.6), Math.round(h3 * 1.6));
        yy = this.image(img3, xr, yy, cw, h3);
      }
      this.noteAbove(noteStr, Math.max(fy, yy) + 8);
    }

    // ================= 4. OPERATING METRICS (latest quarter y/y) =================
    opsPage() {
      const M = this.M, A = M.lastQ, B = M.qById[M.yoyQid(A)];
      const oa = M.opsFor(A, 'q'), ob = M.opsFor(B, 'q'), C = M.yoyCommentsFor(A, B, 'q'), ops = C && C.ops;
      const la = this.qlab(A), lb = this.qlab(B);
      let y = this.page('P', this.T(`Métricas operativas de GAP · ${la} vs ${lb}`, `GAP Operating Metrics · ${la} vs ${lb}`), this.nextText());
      const rows = [], meta = [];
      const head = (l) => { rows.push([l, '', '', '', '', '']); meta.push(['head left', 'head', 'head', 'head', 'head', 'head']); };
      const row = (l, k, o = {}) => { const va = oa && oa[k], vb = ob && ob[k]; if (va == null && vb == null) return; const d = va != null && vb != null ? va - vb : null, p = d != null && vb ? 100 * d / Math.abs(vb) : null; const dec = o.money ? 1 : 1; rows.push([l, va == null ? '—' : this.n(va, dec), vb == null ? '—' : this.n(vb, dec), d == null ? '—' : this.n(d, dec), this.pct(p, 1, true), ops && ops[k] ? M.L(ops[k]) : '']); meta.push([(o.cls || '') + ' left', o.cls || '', o.cls || '', this.cls(d), this.cls(p), 'left small']); };
      head(M.t('trafCargo')); row(M.t('domPax'), 'dom', { cls: 'sub' }); row(M.t('intlPax'), 'intl', { cls: 'sub' }); row(M.t('totalPax'), 'total', { cls: 'bold' }); row(M.t('cbxUsers'), 'cbx'); row(M.t('cargoWlu'), 'cargo'); row(M.t('wluTotal'), 'wlu', { cls: 'bold' });
      head(`${M.t('unitRev')} (Ps.)`); row(M.t('aeroPerPax'), 'aeroPerPax', { money: true }); row(M.t('nonAeroPerPax'), 'nonAeroPerPax', { money: true }); if ([A, B].some((o) => o && o.is && o.is.revCbx != null)) row(M.t('nonAeroExCbx'), 'nonAeroExCbxPerPax', { money: true, cls: 'sub' }); row(M.t('cbxPerUser'), 'cbxPerUser', { money: true }); row(M.t('revPerPaxGap'), 'revPerPaxGap', { money: true }); row(M.t('aeroPerWlu'), 'aeroPerWlu', { money: true }); row(M.t('costPerWlu'), 'costPerWlu', { money: true });
      const W = this.width(), cw = { 0: { cellWidth: W * 0.24, halign: 'left' }, 1: { cellWidth: W * 0.085 }, 2: { cellWidth: W * 0.085 }, 3: { cellWidth: W * 0.08 }, 4: { cellWidth: W * 0.07 }, 5: { cellWidth: W * 0.44, halign: 'left' } };
      y = this.fitTable({ y, head: [M.t('metric'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral y conferencia)', 'Comments (quarterly report and earnings call)')], body: rows, meta, cols: cw, rowSpan: rows.map((r) => (r[1] === '' && r[2] === '' ? 6 : 0)) }, [8.6, 8.2, 7.8, 7.4, 7], this.cur.y1 - 150);
      // quarterly passengers chart in the remaining space
      const qs = M.Q.slice(-8); const yoy = (q) => { const p = M.qById[M.yoyQid(q)]; const a = M.opsFor(q, 'q'), b = p && M.opsFor(p, 'q'); return a && b && a.total && b.total ? 100 * (a.total / b.total - 1) : null; };
      const remaining = this.cur.y1 - y - 30;
      if (remaining > 110) {
        const h = Math.min(remaining - 26, 200);
        y = this.heading(this.T('Pasajeros terminales por trimestre (millones) y variación a/a', 'Terminal passengers by quarter (million) and YoY change'), this.cur.x0, y + 10, 10);
        const img = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [{ type: 'line', label: this.T('Variación a/a, % (eje der.)', 'YoY change, % (right axis)'), data: qs.map(yoy), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0 }, { type: 'bar', label: this.T('Pasajeros (millones, eje izq.)', 'Passengers (million, left axis)'), data: qs.map((q) => { const o = M.opsFor(q, 'q'); return o && o.total ? o.total / 1000 : null; }), backgroundColor: PALETTE[0], yAxisID: 'y', maxBarThickness: 40, order: 1 }] }, options: { scales: { x: { grid: { display: false } }, y: { position: 'left', beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: (v) => this.n(v, 0) + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
        y = this.image(img, this.cur.x0, y, W, h) + 4;
      }
      const cap = this.T(`Pasajeros de los reportes mensuales de tráfico (CBX en Tijuana se clasifica como internacional); ingresos unitarios = ingresos del estado de resultados ÷ pasajeros del periodo. CBX se consolida desde ${M.REF.cbx && M.REF.cbx.consolidatedFrom ? M.ymLabel(M.REF.cbx.consolidatedFrom) : '—'}. Carga, WLU y los tres últimos renglones siguen el Exhibit F del informe trimestral. Fuentes: informe trimestral ${la} (${this.date(A.sources.is.date)})${C && C.call ? ' · ' + M.L(C.call) : ''} · reportes mensuales de tráfico de GAP.`,
        `Passengers from the monthly traffic reports (CBX users at Tijuana count as international); unit revenues = income-statement revenue ÷ passengers in the period. CBX consolidated from ${M.REF.cbx && M.REF.cbx.consolidatedFrom ? M.ymLabel(M.REF.cbx.consolidatedFrom) : '—'}. Cargo, WLUs and the last three rows follow Exhibit F of the quarterly report. Sources: ${la} quarterly report (${this.date(A.sources.is.date)})${C && C.call ? ' · ' + M.L(C.call) : ''} · GAP monthly traffic reports.`);
      this.note(cap, Math.max(y, this.cur.y1 - 34));
    }

    // ================= 5–7. INCOME STATEMENT (quarter, fiscal year, LTM) =================
    incomePage(mode) {
      const M = this.M; let A, B, C, la, lb, cmtNote = '';
      if (mode === 'q') { A = M.lastQ; B = M.qById[M.yoyQid(A)]; C = M.yoyCommentsFor(A, B, 'q'); la = this.qlab(A); lb = this.qlab(B); }
      else if (mode === 'fy') { A = M.Y[M.Y.length - 1]; B = M.Y[M.Y.length - 2]; C = M.yoyCommentsFor(A, B, 'fy'); la = 'FY' + A.fy; lb = 'FY' + B.fy; }
      else { A = M.ltmFor(M.lastQ); const bq = M.qById[M.yoyQid(M.lastQ)]; B = bq && M.ltmFor(bq); C = M.yoyCommentsFor(M.lastQ, bq, 'q'); la = A.id; lb = B ? B.id : '—'; cmtNote = this.T(` · Los comentarios corresponden al ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (último trimestre reportado)`, ` · Comments refer to ${this.qlab(M.lastQ)} vs ${this.qlab(bq)} (latest reported quarter)`); }
      if (!A || !B) return;
      const title = this.T('Estado de resultados de GAP', 'GAP Income Statement');
      let y = this.page('P', `${title} · ${la} vs ${lb}`, this.nextText());
      const layout = M.FIN.layout.is; const rows = [], meta = [];
      const OCI = new Set(); { let on = false; for (const d of layout) { if (d.k === 'comprehensiveControlling') on = false; if (on) OCI.add(d.k); if (d.k === 'netIncome') on = true; } }
      const get = (o, d) => (o && o.is && o.is[d.k] != null ? o.is[d.k] : null);
      for (const def of layout) {
        if (def.ifric || OCI.has(def.k)) continue;
        if (def.level === 2 && def.k !== 'revCbx') continue;                    // cost-of-services detail collapsed, as on screen
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
      y = this.fitTable({ y, head: [this.T('Cifras en MXN millones', 'Figures in MXN mn'), la, lb, this.T('Var.', 'Chg'), this.T('Var. %', 'Chg %'), this.T('Comentarios (informe trimestral y conferencia)', 'Comments (quarterly report and earnings call)')], body: rows, meta, cols: cw }, [8.6, 8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - 40);
      if (mode === 'fy') y = this.isFiller(mode, y);
      const srcs = [A, B].map((o) => o.sources && o.sources.is).filter(Boolean);
      const cap = this.T(`Ps. millones, sin IFRIC 12 (ingresos y costos de construcción excluidos; el EBITDA no cambia). Detalle del costo de servicios y otros resultados integrales omitidos${(A.derived || B.derived) ? '; periodos UDM calculados a partir de trimestres reportados' : ''}. Fuentes: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `informe trimestral de GAP (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`,
        `Ps. million, ex-IFRIC 12 (construction revenue and cost excluded; EBITDA is unchanged). Cost-of-services detail and other comprehensive income omitted${(A.derived || B.derived) ? '; LTM periods computed from reported quarters' : ''}. Sources: ${[...new Map(srcs.map((s) => [s.url, s])).values()].map((s) => `GAP quarterly report (${this.date(s.date)})`).join(' · ')}${C && C.call ? ' · ' + M.L(C.call) : ''}${cmtNote}.`);
      this.note(cap, Math.max(y + 6, this.cur.y1 - 34));
    }

    // Revenue, EBITDA and margin chart when an income-statement page has room left (annual for the FY page, quarterly otherwise).
    isFiller(mode, y) {
      const M = this.M, rem = this.cur.y1 - y - 46; if (rem < 92) return y;
      const h = Math.min(rem - 20, 190), W = this.width();
      const objs = mode === 'fy' ? M.Y.slice(-6) : M.Q.slice(-8); const lab = (o) => (mode === 'fy' ? 'FY' + o.fy : this.qlab(o));
      const ex = (o) => (o.is.revTotal - (o.is.revConstruction || 0)) / 1000;
      y = this.heading(mode === 'fy' ? this.T('Ingresos sin IFRIC 12, EBITDA (Ps. millones) y margen EBITDA por año fiscal', 'Revenue ex-IFRIC 12, EBITDA (Ps. million) and EBITDA margin by fiscal year') : this.T('Ingresos sin IFRIC 12, EBITDA (Ps. millones) y margen EBITDA por trimestre', 'Revenue ex-IFRIC 12, EBITDA (Ps. million) and EBITDA margin by quarter'), this.cur.x0, y + 8, 10);
      const img = this.chart({ type: 'bar', data: { labels: objs.map(lab), datasets: [{ type: 'bar', label: this.T('Ingresos sin IFRIC 12 (eje izq.)', 'Revenue ex-IFRIC 12 (left axis)'), data: objs.map(ex), backgroundColor: '#c9c6bd', maxBarThickness: 34 }, { type: 'bar', label: 'EBITDA (' + this.T('eje izq.', 'left axis') + ')', data: objs.map((o) => o.is.ebitda / 1000), backgroundColor: PALETTE[0], maxBarThickness: 34 }, { type: 'line', label: this.T('Margen EBITDA sin IFRIC 12, % (eje der.)', 'EBITDA margin ex-IFRIC 12, % (right axis)'), data: objs.map((o) => o.is.ebitdaMarginExIfric), borderColor: PALETTE[1], backgroundColor: PALETTE[1], yAxisID: 'y2', pointRadius: 3 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, suggestedMin: 55, suggestedMax: 75, ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h * 1.6));
      return this.image(img, this.cur.x0, y, W, h) + 4;
    }

    // ================= 8. GUIDANCE =================
    // compact range text for dense tables: "−3 a 0%" / "67 ± 1%" / "12,000"
    gr(m, x) { if (!x) return '—'; if (m.kind === 'amount') return this.n(x.mxnM); const f = (v) => this.n(v, Number.isInteger(v) ? 0 : 1); if (x.mid != null) return `${f(x.mid)} ± ${this.n(x.band, 0)}%`; return `${f(x.lo)} ${this.T('a', 'to')} ${f(x.hi)}%`; }
    grs(m, x) { if (!x) return '—'; if (m.kind === 'amount') return this.n(x.mxnM); const f = (v) => this.n(v, Number.isInteger(v) ? 0 : 1); if (x.mid != null) return `${f(x.mid)}±${this.n(x.band, 0)}`; return `${f(x.lo)}/${f(x.hi)}`; }
    guidancePage() {
      const M = this.M; if (!M.GV.length) return;
      const fy = Math.max(...M.GV.map((v) => v.fy)), cur = M.GV.filter((v) => v.fy === fy), last = cur[cur.length - 1];
      const act = M.gActual(fy), closed = !!(act && act.kind === 'fy');
      let y = this.page('L', this.T(`Guía de la administración · FY${fy} y su historial`, `Management Guidance · FY${fy} and Its History`), this.nextText());
      const gap = 20, wl = this.width() * 0.46 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      // ---- left: guidance in force vs actual
      let yl = this.heading(this.T(`Guía FY${fy} · ${cur.length > 1 ? 'revisada el' : 'emitida el'} ${this.date(last.date)} · vs ${act ? act.label : '—'}`, `FY${fy} guidance · ${cur.length > 1 ? 'revised' : 'issued'} ${this.date(last.date)} · vs ${act ? act.label : '—'}`), this.cur.x0, y, 10);
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
      yl = this.table({ y: yl, w: wl, head, body: rows, meta, size: 8.6, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 } }, pad: { top: 3, bottom: 3, left: 3.5, right: 3.5 } });
      yl = this.note(closed ? this.T(`Año cerrado: real FY${fy} frente a la última guía.`, `Closed year: actual FY${fy} versus the final guidance.`) : this.T(`Seguimiento con el acumulado reportado (${act ? act.label : '—'} vs ${act ? M.ytdLabel(fy - 1, act.months) : '—'}); la guía es para el año completo, así que un acumulado fuera del rango no implica incumplimiento. Crecimientos vs año anterior; ingresos y margen sin IFRIC 12; capex en Ps. millones.`, `Tracked against the reported year-to-date (${act ? act.label : '—'} vs ${act ? M.ytdLabel(fy - 1, act.months) : '—'}); guidance is for the full year, so a year-to-date figure outside the range is not a miss in itself. Growth vs prior year; revenue and margin ex-IFRIC 12; capex in Ps. million.`), yl + 4, 7.6, this.cur.x0, wl);
      // management's own framing of the latest vintage (first sentence only)
      const intro = (last.intro || [])[0]; if (intro) yl = this.text(`"${intro}" — ${this.T('comunicado de GAP', 'GAP release')} ${this.date(last.date)}`, this.cur.x0, yl + 4, wl, 8.2, 'normal', MUTED);
      // ---- right: track record for closed years
      let yr = y;
      const fys = [...new Set(M.GV.map((v) => v.fy))].sort(); const finalOf = (yv) => M.GV.filter((v) => v.fy === yv).pop();
      const closedFys = fys.filter((yv) => { const a = M.gActual(yv); return a && a.kind === 'fy'; });
      if (closedFys.length) {
        yr = this.heading(this.T('Historial: real vs última guía de cada año', "Track record: actual vs each year's final guidance"), xr, yr, 10);
        const rr = [], rm = [];
        for (const yv of closedFys) { const v = finalOf(yv), a = M.gActual(yv); let hit = 0, n = 0; const cells = [], cm = []; for (const m of M.GM) { const x = v.items[m.k], val = a.v[m.k]; const sx = M.gStatus(m, x, val); if (sx) { n++; if (sx !== 'below') hit++; } cells.push(`${M.gActualFmt(m, val)}\n(${this.grs(m, x)})`); cm.push(sx === 'above' ? 'pos' : sx === 'below' ? 'neg' : ''); } rr.push([`FY${yv}\n${v.kind === 'revised' ? M.t('revised') : M.t('initial')} ${this.date(v.date)}`, ...cells, `${hit}/${n}`]); rm.push(['left', ...cm, 'bold']); }
        const mw = (wr - wr * 0.19 - wr * 0.1) / M.GM.length; const rc = { 0: { halign: 'left', cellWidth: wr * 0.19 }, [M.GM.length + 1]: { cellWidth: wr * 0.1 } }; M.GM.forEach((m, i) => { rc[i + 1] = { cellWidth: mw }; });
        yr = this.table({ y: yr, x: xr, w: wr, head: [M.t('year'), ...M.GM.map((m) => M.L(m.s)), this.T('En rango o mejor', 'In range or better')], body: rr, meta: rm, size: 7.6, cols: rc, pad: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 } });
        yr = this.note(this.T('Primera línea: real; entre paréntesis, guía vigente al cierre del año (mínimo/máximo o punto medio ± banda). Verde = por encima del rango, rojo = por debajo.', 'First line: actual; in brackets, guidance in force at year-end (low/high or midpoint ± band). Green = above the range, red = below.'), yr + 3, 7.4, xr, wr);
      }
      // ---- full width: every vintage
      let yb = Math.max(yl, yr) + 10;
      yb = this.heading(this.T('Todas las guías emitidas (más reciente primero)', 'Every guidance issued (latest first)'), this.cur.x0, yb, 10);
      const ar = [], am = [];
      for (const v of M.GV.slice().reverse()) { const qq = v.quarter ? (M.qById[v.quarter] || { fy: +v.quarter.slice(0, 4), q: +v.quarter.slice(5) }) : null; ar.push([`${this.date(v.date)}${qq ? ` (${this.T('con resultados', 'with')} ${this.qlab(qq)})` : ` (${M.t('standalone')})`}`, `FY${v.fy}`, v.kind === 'revised' ? M.t('revised') : M.t('initial'), ...M.GM.map((m) => this.gr(m, v.items[m.k]))]); am.push(['left', '', v.kind === 'revised' ? 'bold' : '', ...M.GM.map(() => '')]); }
      const W = this.width(), vw = (W - W * 0.33) / M.GM.length; const vc = { 0: { halign: 'left', cellWidth: W * 0.2 }, 1: { cellWidth: W * 0.06 }, 2: { cellWidth: W * 0.07 } }; M.GM.forEach((m, i) => { vc[i + 3] = { cellWidth: vw }; });
      const vnote = this.T('Fuente: tablas de guía en los comunicados de resultados de GAP (GlobeNewswire / Form 6-K); real de los informes trimestrales y anuales. Rangos como los publica GAP: crecimiento % vs el año anterior, margen EBITDA en nivel (sin IFRIC 12), capex en Ps. millones.', 'Source: guidance tables in GAP\'s results releases (GlobeNewswire / Form 6-K); actuals from the quarterly and annual reports. Ranges as GAP publishes them: % growth vs prior year, EBITDA margin as a level (ex-IFRIC 12), capex in Ps. million.');
      const vh = this.measureText(vnote, W, 7.5, 1.25);
      yb = this.fitTable({ y: yb, head: [M.t('date'), M.t('year'), M.t('type'), ...M.GM.map((m) => M.L(m))], body: ar, meta: am, cols: vc, pad: { top: 2.2, bottom: 2.2, left: 3, right: 3 } }, [8.2, 7.8, 7.4, 7, 6.6], this.cur.y1 - vh - 8);
      this.noteAbove(vnote, yb + 4);
    }
    // ================= 9. TRAFFIC TABLES =================
    trafficTables() {
      const M = this.M, ms = M.TR.months, lastM = ms[ms.length - 1], AIR = M.AIR;
      let y = this.page('P', this.T(`Tráfico por aeropuerto · ${M.ymLabel(lastM.ym)} y últimos doce meses`, `Traffic by Airport · ${M.ymLabel(lastM.ym)} and Last Twelve Months`), this.T(`Miles de pasajeros terminales · reporte mensual de tráfico de GAP del ${this.date(lastM.source && lastM.source.date)} · cifras preliminares; CBX en Tijuana se clasifica como internacional`, `Thousand terminal passengers · GAP monthly traffic report of ${this.date(lastM.source && lastM.source.date)} · preliminary figures; CBX users at Tijuana count as international`));
      const prev = ms.find((m) => m.ym === `${+lastM.ym.slice(0, 4) - 1}${lastM.ym.slice(4)}`);
      const ytdOf = (ym, code) => ms.filter((m) => m.ym.slice(0, 4) === ym.slice(0, 4) && m.ym <= ym).reduce((a, m) => a + (m.total[code] || 0), 0);
      const name = (code) => (code === 'TOTAL' ? this.T('Total GAP (14 aeropuertos)', 'Total GAP (14 airports)') : `${code} · ${(AIR.find((a) => a.code === code) || {})[M.LANG] || code}`);
      const codes = [...AIR.map((a) => a.code), 'TOTAL'];
      const rows = [], meta = [];
      for (const code of codes) { const v = lastM.total[code], p = prev && prev.total[code], yv = ytdOf(lastM.ym, code), yp = prev ? ytdOf(prev.ym, code) : null; const yoy = p ? 100 * (v / p - 1) : null, yoyY = yp ? 100 * (yv / yp - 1) : null; rows.push([name(code), this.n(v, 1), this.pct(yoy, 1, true), this.n(lastM.dom[code], 1), this.n(lastM.intl[code], 1), this.n(yv, 1), this.pct(yoyY, 1, true), this.pct(100 * v / lastM.total.TOTAL, 1)]); const b = code === 'TOTAL' ? 'bold' : ''; meta.push([b + ' left', b, this.cls(yoy) + ' ' + b, b, b, b, this.cls(yoyY) + ' ' + b, b]); }
      y = this.heading(this.T(`Último mes: ${M.ymLabel(lastM.ym)}`, `Latest month: ${M.ymLabel(lastM.ym)}`), this.cur.x0, y, 10.5);
      y = this.table({ y, head: [M.t('airport'), M.ymLabel(lastM.ym), M.t('yoy'), M.t('dom'), M.t('intl'), `${M.t('ytdShort')} ${lastM.ym.slice(0, 4)}`, M.t('yoy'), M.t('share')], body: rows, meta, size: 8.6, cols: { 0: { halign: 'left', cellWidth: this.width() * 0.3 } } });
      if (lastM.cbx != null) y = this.note(this.T(`Usuarios de CBX en ${M.ymLabel(lastM.ym)}: ${this.n(lastM.cbx, 1)} mil (ambas direcciones).`, `CBX users in ${M.ymLabel(lastM.ym)}: ${this.n(lastM.cbx, 1)} thousand (both directions).`), y + 3);
      // LTM table
      const i = ms.length - 1; const win = ms.slice(i - 11, i + 1), pwin = ms.slice(i - 23, i - 11);
      if (win.length === 12) {
        const sum = (arr, seg, code) => arr.reduce((a, m) => a + ((m[seg] && m[seg][code]) || 0), 0);
        const r2 = [], m2 = []; const tot = sum(win, 'total', 'TOTAL');
        for (const code of codes) { const v = sum(win, 'total', code), p = pwin.length === 12 ? sum(pwin, 'total', code) : null; const yoy = p ? 100 * (v / p - 1) : null; r2.push([name(code), this.n(v, 1), this.pct(yoy, 1, true), this.n(sum(win, 'dom', code), 1), this.n(sum(win, 'intl', code), 1), this.pct(100 * sum(win, 'intl', code) / v, 1), this.pct(100 * v / tot, 1)]); const b = code === 'TOTAL' ? 'bold' : ''; m2.push([b + ' left', b, this.cls(yoy) + ' ' + b, b, b, b, b]); }
        y = this.heading(this.T(`Últimos doce meses: ${M.ymLabel(win[0].ym)} – ${M.ymLabel(lastM.ym)}`, `Last twelve months: ${M.ymLabel(win[0].ym)} – ${M.ymLabel(lastM.ym)}`), this.cur.x0, y + 8, 10.5);
        y = this.table({ y, head: [M.t('airport'), this.T('UDM', 'LTM'), this.T('a/a vs UDM previos', 'y/y vs prior LTM'), M.t('dom'), M.t('intl'), this.T('% internacional', '% international'), M.t('share')], body: r2, meta: m2, size: 8.6, cols: { 0: { halign: 'left', cellWidth: this.width() * 0.3 } } });
      }
      this.note(this.T(`Fuente: reportes mensuales de tráfico de GAP (GlobeNewswire / Form 6-K); cobertura ${M.ymLabel(ms[0].ym)} – ${M.ymLabel(lastM.ym)}. Acumulado del año vs el mismo periodo del año anterior.`, `Source: GAP monthly traffic reports (GlobeNewswire / Form 6-K); coverage ${M.ymLabel(ms[0].ym)} – ${M.ymLabel(lastM.ym)}. Year-to-date vs the same period a year earlier.`), Math.max(y + 6, this.cur.y1 - 26));
    }

    // ================= 10. TRAFFIC CHARTS: GAP vs MEXICO =================
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
      let y = this.page('P', this.T('Tráfico de GAP frente al total de México · enero 2023 en adelante', 'GAP Traffic Versus Mexico Total · January 2023 Onwards'), this.T(`GAP: pasajeros terminales de los 14 aeropuertos (reportes mensuales, hasta ${M.ymLabel(ms[ms.length - 1].ym)}) · México: pasajeros de todos los aeropuertos comerciales según la AFAC (hasta ${mxLast ? M.ymLabel(mxLast) : '—'})`, `GAP: terminal passengers at its 14 airports (monthly reports, to ${M.ymLabel(ms[ms.length - 1].ym)}) · Mexico: passengers at every commercial airport per AFAC (to ${mxLast ? M.ymLabel(mxLast) : '—'})`));
      const W = this.width(); const tick = (v, i) => (labels[i] && labels[i].slice(5) === '01' ? labels[i].slice(0, 4) : labels[i] && labels[i].slice(5) === '07' ? this.T('jul', 'Jul') : '');
      y = this.heading(this.T('Pasajeros por mes (millones): GAP en el eje izquierdo, México en el eje derecho', 'Passengers per month (million): GAP on the left axis, Mexico on the right axis'), this.cur.x0, y, 10.5);
      const h1 = 215;
      const img1 = this.chart({ type: 'line', data: { labels, datasets: [{ label: this.T('◀ GAP · total 14 aeropuertos (millones, EJE IZQUIERDO)', '◀ GAP · total 14 airports (million, LEFT AXIS)'), data: gapV, borderColor: PALETTE[0], backgroundColor: PALETTE[0], yAxisID: 'y', borderWidth: 2.4 }, { label: this.T('México · todos los aeropuertos, AFAC (millones, EJE DERECHO) ▶', 'Mexico · all airports, AFAC (million, RIGHT AXIS) ▶'), data: mxV, borderColor: PALETTE[1], backgroundColor: PALETTE[1], yAxisID: 'y2', borderWidth: 2, borderDash: [6, 3] }] }, options: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { position: 'left', title: { display: true, text: this.T('GAP (millones)', 'GAP (million)'), color: PALETTE[0], font: { size: 10, weight: 'bold' } }, ticks: { color: PALETTE[0], callback: (v) => this.n(v, 1) } }, y2: { position: 'right', grid: { display: false }, title: { display: true, text: this.T('México (millones)', 'Mexico (million)'), color: '#8a6a12', font: { size: 10, weight: 'bold' } }, ticks: { color: '#8a6a12', callback: (v) => this.n(v, 1) } } } } }, Math.round(W * 1.6), Math.round(h1 * 1.6));
      y = this.image(img1, this.cur.x0, y, W, h1) + 8;
      y = this.heading(this.T('Variación anual (%) del mismo mes: GAP y México (un solo eje)', 'Year-on-year change (%) of the same month: GAP and Mexico (single axis)'), this.cur.x0, y, 10.5);
      const h2 = 165;
      const img2 = this.chart({ type: 'bar', data: { labels, datasets: [{ type: 'bar', label: this.T('GAP · variación a/a %', 'GAP · y/y change %'), data: yoyG, backgroundColor: PALETTE[0], maxBarThickness: 9 }, { type: 'line', label: this.T('México (AFAC) · variación a/a %', 'Mexico (AFAC) · y/y change %'), data: yoyM, borderColor: PALETTE[1], backgroundColor: PALETTE[1], borderWidth: 2, pointRadius: 2 }] }, options: { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: tick } }, y: { ticks: { callback: (v) => v + '%' } } } } }, Math.round(W * 1.6), Math.round(h2 * 1.6));
      y = this.image(img2, this.cur.x0, y, W, h2) + 8;
      // last 12 months table
      const last12 = labels.slice(-12); const rows = last12.map((ym) => { const i = labels.indexOf(ym); return [M.ymLabel(ym), this.n(gapV[i], 2), this.pct(yoyG[i], 1, true), mxV[i] == null ? '—' : this.n(mxV[i], 2), this.pct(yoyM[i], 1, true), mxV[i] ? this.pct(100 * gapV[i] / mxV[i], 1) : '—']; });
      const meta = rows.map((r, i) => ['left', '', this.cls(yoyG[labels.indexOf(last12[i])]), '', this.cls(yoyM[labels.indexOf(last12[i])]), '']);
      const rem = this.cur.y1 - y - 30;
      if (rem > 90) y = this.fitTable({ y, head: [this.T('Mes', 'Month'), this.T('GAP (M)', 'GAP (M)'), this.T('GAP a/a', 'GAP y/y'), this.T('México (M)', 'Mexico (M)'), this.T('México a/a', 'Mexico y/y'), this.T('GAP / México', 'GAP / Mexico')], body: rows, meta, cols: { 0: { halign: 'left' } } }, [8.2, 7.6, 7, 6.5], this.cur.y1 - 28);
      this.note(this.T(`Ambas series cuentan pasajeros en cada aeropuerto (llegadas y salidas), por lo que un vuelo nacional cuenta en origen y destino. El total de GAP incluye Montego Bay y Kingston (Jamaica); el de México solo aeropuertos mexicanos. Fuentes: reportes mensuales de tráfico de GAP; AFAC, Estadística operativa de aeropuertos (${MX && MX.sources && MX.sources.afac ? MX.sources.afac.file + ', publicado el ' + this.date(MX.sources.afac.published) : 'archivo mensual'}).`, `Both series count passengers at each airport (arrivals and departures), so a domestic flight counts at both ends. GAP's total includes Montego Bay and Kingston (Jamaica); Mexico's covers Mexican airports only. Sources: GAP monthly traffic reports; AFAC, airport operating statistics (${MX && MX.sources && MX.sources.afac ? MX.sources.afac.file + ', published ' + this.date(MX.sources.afac.published) : 'monthly file'}).`), Math.max(y + 4, this.cur.y1 - 30));
    }

    // ================= 11. 07 LEVERAGE AND DEBT =================
    tiles(items, y, h = 50) {
      const n = items.length, gap = 10, tw = (this.width() - (n - 1) * gap) / n;
      items.forEach((f, i) => { const x = this.cur.x0 + i * (tw + gap); this.pdf.setFillColor(...HEAD); this.pdf.roundedRect(x, y, tw, h, 4, 4, 'F'); this.font('bold', f.size || 14, ACCENT); this.pdf.text(tx(f.v), x + 8, y + 21); this.font('normal', 7.6, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(f.l), tw - 14), x + 8, y + 33); });
      return y + h + 14;
    }
    debtPage() {
      const M = this.M, qs = M.Q.slice(-8), lastQ = M.lastQ, L = M.lastLTM, nd = M.netDebt(lastQ);
      const nds = qs.map((q) => ({ q, nd: M.netDebt(q), l: M.ltmFor(q) })); const est = nds.map((x) => x.nd && x.nd.basis === 'est');
      const D2 = M.REF.debt || {}; const rat = (D2.ratings || []).map((r) => `${r.agency.replace("Moody's Local MX", "Moody's").replace('S&P Global Ratings', 'S&P')} ${r.rating}`).join(' · ');
      let y = this.page('L', this.T('07 · Apalancamiento y perfil de deuda', '07 · Leverage and Debt Profile'), this.T(`Ps. millones · balance del ${this.qlab(lastQ)} (${this.date(lastQ.sources.is.date)}) · instrumentos según comunicados de GAP al ${this.date(M.REF.updatedAt)}`, `Ps. million · ${this.qlab(lastQ)} balance sheet (${this.date(lastQ.sources.is.date)}) · instruments per GAP releases as of ${this.date(M.REF.updatedAt)}`));
      const asOf = this.date(M.qEndDate(lastQ));
      y = this.tiles([
        { v: nd ? `Ps. ${this.m(nd.net)} M` : '—', l: this.T(`Deuda neta · ${asOf}`, `Net debt · ${asOf}`) },
        { v: nd ? `Ps. ${this.m(nd.gross)} M` : '—', l: this.T('Deuda bruta (préstamos + certificados)', 'Gross debt (loans + certificados)') },
        { v: nd ? `Ps. ${this.m(nd.cash)} M` : '—', l: this.T('Efectivo y equivalentes', 'Cash and equivalents') },
        { v: nd && L ? this.x(nd.net / L.is.ebitda, 2) : '—', l: this.T('Deuda neta / EBITDA UDM', 'Net debt / LTM EBITDA') },
        { v: rat || '—', l: this.T('Calificación de los certificados (escala nacional)', 'Rating of the certificados (national scale)'), size: 11 },
      ], y);
      const gap = 24, wl = this.width() * 0.54, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      let yl = this.heading(this.T('Deuda neta (barras, Ps. millones) y deuda neta / EBITDA UDM (línea, eje derecho)', 'Net debt (bars, Ps. million) and net debt / LTM EBITDA (line, right axis)'), this.cur.x0, y, 10);
      const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');
      const h1 = 235;
      const img1 = this.chart({ type: 'bar', data: { labels: qs.map((q) => this.qlab(q)), datasets: [
        { type: 'line', label: this.T('Deuda neta / EBITDA UDM (eje der.)', 'Net debt / LTM EBITDA (right axis)'), data: nds.map((x) => (x.nd && x.l && x.l.is.ebitda ? x.nd.net / x.l.is.ebitda : null)), borderColor: '#c0392b', backgroundColor: '#ffffff', borderWidth: 2.6, pointRadius: 4, pointBorderWidth: 2, pointBorderColor: '#c0392b', pointBackgroundColor: '#ffffff', yAxisID: 'y2', order: 0, spanGaps: true, segment: { borderDash: (ctx) => (est[ctx.p1DataIndex] ? [5, 4] : undefined) } },
        { type: 'bar', label: this.T('Deuda neta (eje izq.)', 'Net debt (left axis)'), data: nds.map((x) => (x.nd ? x.nd.net / 1000 : null)), backgroundColor: nds.map((_, i) => alpha(PALETTE[0], est[i] ? 0.45 : 1)), maxBarThickness: 38, order: 1 }] },
        options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } }, y2: { position: 'right', grid: { display: false }, min: 1.8, ticks: { stepSize: 0.1, callback: (v) => this.n(v, 1) + 'x' } } } } }, Math.round(wl * 1.6), Math.round(h1 * 1.6));
      yl = this.image(img1, this.cur.x0, yl, wl, h1) + 6;
      const firstBs = nds.find((x) => x.nd && x.nd.basis === 'bs');
      yl = this.bullets([
        this.T(`Deuda neta = préstamos bancarios + certificados bursátiles − efectivo, del balance publicado (detallado desde ${firstBs ? this.qlab(firstBs.q) : '—'}). Barras translúcidas y línea punteada: estimación a partir de los flujos de financiamiento de cada trimestre.`, `Net debt = bank loans + certificados bursátiles − cash, from the published balance sheet (itemised from ${firstBs ? this.qlab(firstBs.q) : '—'}). Translucent bars and dashed line: estimated from each quarter's financing flows.`),
        this.T('La emisión de marzo de 2026 (GAP 26 / GAP 26-2, Ps. 10,718 M) financió el 25% restante de CBX y el capex del PMD 2025–2029; en septiembre se contrataron líneas bancarias por Ps. 8,000 M.', 'The March 2026 issuance (GAP 26 / GAP 26-2, Ps. 10,718 M) funded the remaining 25% of CBX and PMD 2025–2029 capex; Ps. 8,000 M of bank facilities were signed in September.'),
      ], this.cur.x0, yl, wl, 8, { gap: 3, color: MUTED });
      let yr = this.heading(this.T('Instrumentos vigentes', 'Outstanding instruments'), xr, y, 10);
      const rows = (D2.instruments || []).map((i) => [M.LS(i.name).replace(/\s*\(Ps\.\s*[\d,.]+\s*M\)\s*$/, ''), i.matures ? this.date(i.matures) : '—', this.n(i.principalMxn), M.LS(i.rate) || '—']);
      yr = this.table({ y: yr, x: xr, w: wr, head: [M.t('instrument'), M.t('matures'), this.T('Principal (Ps. M)', 'Principal (Ps. M)'), M.t('rate')], body: rows, meta: rows.map(() => ['left', '', '', 'left']), size: 8, cols: { 0: { halign: 'left', cellWidth: wr * 0.36 }, 1: { cellWidth: wr * 0.2 }, 2: { cellWidth: wr * 0.17 }, 3: { halign: 'left', cellWidth: wr * 0.27 } }, pad: { top: 2.6, bottom: 2.6, left: 3, right: 3 } });
      yr = this.note((D2.ratings || []).map((r) => `${r.agency}: ${r.rating} (${M.LS(r.outlook)})`).join(' · ') + (D2.instrumentsNote ? '. ' + M.LS(D2.instrumentsNote) : ''), yr + 3, 7, xr, wr);
      const qr = nds.map((x) => [this.qlab(x.q) + (x.nd && x.nd.basis === 'est' ? ' *' : ''), x.nd ? this.m(x.nd.net) : '—', x.l ? this.m(x.l.is.ebitda) : '—', x.nd && x.l && x.l.is.ebitda ? this.x(x.nd.net / x.l.is.ebitda, 2) : '—']);
      yr = this.heading(this.T('Por trimestre (Ps. millones)', 'By quarter (Ps. million)'), xr, yr + 8, 10);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Trimestre', 'Quarter'), this.T('Deuda neta', 'Net debt'), 'EBITDA UDM', this.T('Deuda neta / EBITDA', 'Net debt / EBITDA')], body: qr, meta: qr.map(() => ['left', 'bold', '', 'bold']), size: 8, cols: { 0: { halign: 'left' } } });
      this.note(this.T(`* estimación. Fuentes: balances trimestrales de GAP; comunicados de emisión y de calificación (referencia actualizada ${this.date(M.REF.updatedAt)}).`, `* estimate. Sources: GAP quarterly balance sheets; issuance and rating releases (reference updated ${this.date(M.REF.updatedAt)}).`), yr + 4, 7, xr, wr);
    }

    // ================= 12. 08 DIVIDENDS =================
    dividendPage() {
      const M = this.M, divs = (M.MK.dividends && M.MK.dividends['GAPB.MX'] && M.MK.dividends['GAPB.MX'].points) || [];
      const byYear = {}; for (const [d, v] of divs) byYear[d.slice(0, 4)] = (byYear[d.slice(0, 4)] || 0) + v;
      const lastYear = Math.max(...Object.keys(byYear).map(Number)); const years = []; for (let yv = 2015; yv <= lastYear; yv++) { years.push(String(yv)); byYear[yv] ??= 0; }
      let y = this.page('L', this.T('08 · Dividendos', '08 · Dividends'), this.T('Dividendo por acción pagado cada año (efectivo por acción registrado en bolsa, incluye reembolsos de capital) y el aprobado por la asamblea más reciente · razón de pago sobre la utilidad por acción del año fiscal · rendimiento sobre el cierre del año', 'Dividend per share paid each year (exchange-recorded cash per share, including capital reductions) and the amount approved at the latest AGM · payout on fiscal-year EPS · yield on the year-end close'));
      const gap = 20, wl = this.width() * 0.42, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      // AGM bullets
      const ag = (M.REF.dividends || []).map((d) => this.T(`Asamblea ${d.agmYear} (${this.date(d.agmDate)}): Ps. ${this.n(d.dps, 2)} por acción. ${M.LS(d.note)}`, `AGM ${d.agmYear} (${this.date(d.agmDate)}): Ps. ${this.n(d.dps, 2)} per share. ${M.LS(d.note)}`));
      const px = M.lastPx; const last = (M.REF.dividends || []).slice(-1)[0];
      if (last && px) ag.push(this.T(`Rendimiento del DPS aprobado en ${last.agmYear} sobre el precio actual (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * last.dps / px[1])}.`, `Yield of the DPS approved in ${last.agmYear} on the current price (Ps. ${this.n(px[1], 2)}): ${this.pct(100 * last.dps / px[1])}.`));
      let yl = this.bullets(ag, this.cur.x0, y, wl, 8.6, { gap: 3 });
      yl = this.heading(this.T('Dividendo por acción por año de pago (Ps.)', 'Dividend per share by payment year (Ps.)'), this.cur.x0, yl + 4, 10);
      const h = 150;
      const img = this.chart({ type: 'bar', data: { labels: years, datasets: [{ label: M.t('dps'), data: years.map((yv) => byYear[yv]), backgroundColor: PALETTE[0], maxBarThickness: 30 }] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (v) => this.n(v, 0) } } } } }, Math.round(wl * 1.6), Math.round(h * 1.6));
      this.image(img, this.cur.x0, yl, wl, h);
      // right: table
      const rows = [], meta = [];
      for (const yv of years) { const fy = M.Y.find((yy) => yy.fy === +yv); const ni = fy && fy.is ? (fy.is.comprehensiveControlling || fy.is.netIncome) / 1000 : null; const sh2 = M.sharesAt(`${yv}-12-31`); const eps = ni && sh2 ? ni * 1e6 / sh2 : null; const pEnd = M.pointAtOrBefore(M.gapPx, `${yv}-12-31`); const cf = fy && fy.cf; const paid = cf ? -(cf.dividendsPaid || 0) / 1000 : null; const capred = cf && cf.capitalReduction != null ? -cf.capitalReduction / 1000 : 0; const buy = cf && cf.buybacks != null ? -cf.buybacks / 1000 : 0; const dist = paid != null ? paid + capred + buy : null;
        rows.push([yv, this.n(byYear[yv], 2), paid != null ? this.n(paid) : '—', paid != null ? this.n(capred) : '—', paid != null ? this.n(buy) : '—', dist != null ? this.n(dist) : '—', eps ? this.pct(100 * byYear[yv] / eps, 0) : '—', pEnd && byYear[yv] ? this.pct(100 * byYear[yv] / pEnd[1]) : '—']); meta.push(['left', 'bold', '', '', '', '', '', '']); }
      const rows2 = rows.map((r) => [r[0], r[1], r[6], r[7]]);
      let yr = this.table({ y, x: xr, w: wr, head: [M.t('year'), this.T('DPS (Ps. por acción)', 'DPS (Ps. per share)'), M.t('payout'), M.t('yield')], body: rows2, meta: rows2.map(() => ['left', 'bold', '', '']), size: 8.2, cols: { 0: { halign: 'left' } } });
      yr = this.note(this.T('DPS = efectivo por acción registrado en bolsa (Yahoo Finance, GAPB.MX) por año de pago, incluidos reembolsos de capital. Razón de pago = DPS / utilidad por acción del año fiscal; rendimiento sobre el cierre del año.', 'DPS = exchange-recorded cash per share (Yahoo Finance, GAPB.MX) by payment year, including capital reductions. Payout = DPS / fiscal-year EPS; yield on the year-end close.'), yr + 3, 7.2, xr, wr);
      // ten fiscal years of cash generation and distributions (annual cash-flow statement)
      const fys = M.Y.filter((fy) => fy.cf && fy.cf.cfo != null).slice(-10);
      const z = (v) => (v || 0) + 0;
      const cf = fys.map((fy) => { const c = fy.cf; const z = (v) => (v || 0) + 0; const cfo = c.cfo / 1000, capex = z(-(c.capex || 0) / 1000), div = z(-(c.dividendsPaid || 0) / 1000), cr = z(-(c.capitalReduction || 0) / 1000), buy = z(-(c.buybacks || 0) / 1000), pay = z(-((c.bondsPaid || 0) + (c.loansPaid || 0)) / 1000); return { fy: fy.fy, cfo, capex, fcf: cfo - capex, pay, div, cr, buy }; });
      const cfRows = cf.map((r) => ['FY' + r.fy, this.n(r.cfo), this.n(-r.capex), this.n(r.fcf), this.n(r.pay), this.n(r.div), this.n(r.cr), this.n(r.buy), r.fcf ? this.pct(z(100 * (r.div + r.cr + r.buy) / r.fcf), 0) : '—']);
      const cfMeta = cf.map((r) => ['left', '', 'neg', 'bold', '', '', 'muted', '', r.div + r.cr + r.buy > r.fcf ? 'neg' : '']);
      const yb = Math.max(yl + h + 6, yr) + 12;
      let y2 = this.heading(this.T(`Flujo operativo, capex, flujo libre y distribuciones · últimos ${cf.length} años fiscales (Ps. millones)`, `Operating cash flow, capex, free cash flow and distributions · last ${cf.length} fiscal years (Ps. million)`), this.cur.x0, yb, 10);
      const W = this.width();
      const cfNote = this.T('Estado de flujos de efectivo anual de GAP (informe del 4T de cada año): flujo operativo después de impuestos; capex = adquisiciones de mejoras a bienes concesionados y activos fijos; FCF = flujo operativo − capex; pago de deuda = certificados bursátiles y préstamos bancarios amortizados en el año (bruto, sin restar emisiones). Reembolsos de capital: usados en lugar de dividendos en 2021 y 2024. Distribuciones = dividendos + reembolsos + recompras.', 'GAP annual cash-flow statement (4Q report of each year): operating cash flow after taxes; capex = additions to concession improvements and fixed assets; FCF = operating cash flow − capex; debt paydown = certificados bursátiles and bank loans repaid in the year (gross, before new issuance). Capital reductions were used instead of dividends in 2021 and 2024. Distributions = dividends + capital reductions + buybacks.');
      const cfH = this.measureText(cfNote, W, 7.5, 1.25);
      y2 = this.fitTable({ y: y2, head: [this.T('Año fiscal', 'Fiscal year'), this.T('Flujo operativo', 'Operating cash flow'), this.T('Capex', 'Capital expenditures'), this.T('Flujo libre (FCF)', 'Free cash flow (FCF)'), this.T('Pago de deuda', 'Debt paydown'), this.T('Dividendos pagados', 'Dividends paid'), this.T('Reembolsos de capital', 'Capital reductions'), this.T('Recompras', 'Share buybacks'), this.T('Distribuciones / FCF', 'Distributions / FCF')], body: cfRows, meta: cfMeta, cols: { 0: { halign: 'left', cellWidth: W * 0.1 } }, pad: { top: 2, bottom: 2, left: 4, right: 4 } }, [8.4, 8, 7.6, 7.2, 6.8, 6.4], this.cur.y1 - cfH - 6);
      this.noteAbove(cfNote, y2 + 4);
    }

    // ================= 13. 09 CBX =================
    // rounded box with a bold title and a muted subtitle; returns nothing
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
    cbxPage() {
      const M = this.M, C = M.REF.cbx || {}, lastQ = M.lastQ;
      let y = this.page('L', this.T('09 · Adquisición de Cross Border Xpress (CBX)', '09 · The Cross Border Xpress (CBX) Acquisition'), this.T(`Consolidado desde ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'} · cifras de los comunicados de GAP (Form 6-K) y del informe del ${this.qlab(lastQ)}`, `Consolidated from ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'} · figures from GAP's releases (Form 6-K) and the ${this.qlab(lastQ)} report`));
      const facts = (C.facts || []).slice(0, 6); const fmtFact = (f) => (f.fmt === 'int' ? this.n(f.v) : f.fmt === 'usdM' ? 'US$ ' + this.n(f.v, 1) + ' M' : f.fmt === 'pct' ? this.pct(100 * f.v) : f.fmt === 'M' ? this.n(f.v, 1) + ' M' : this.n(f.v));
      y = this.tiles(facts.map((f) => ({ v: fmtFact(f), l: this.es ? f.label_es : f.label_en })), y, 48);
      const gap = 22, wl = this.width() * 0.58, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const F = (k) => (C.facts || []).find((f) => f.k === k); const sh = F('newShares'), cash = F('cash25'), dil = F('dilution'), tij = F('tijPax2025');
      const ops = M.opsFor(lastQ, 'q'); const perUser = ops && ops.cbxPerUser;
      // ---- diagram A: what CBX is (two boxes joined by a bridge across a dashed border line)
      let yl = this.heading(this.T('Qué es: una terminal en EE. UU. unida a Tijuana por un puente fronterizo', 'What it is: a US terminal linked to Tijuana by a bridge over the border'), this.cur.x0, y, 10) + 4;
      const bw = wl * 0.34, bh = 56, mid = this.cur.x0 + wl / 2, xa = this.cur.x0, xb = this.cur.x0 + wl - bw;
      this.box(xa, yl, bw, bh, this.T('San Diego, EE. UU. · terminal CBX (Otay Mesa)', 'San Diego, USA · CBX terminal (Otay Mesa)'), this.T('Estacionamiento, documentación y aduana/migración de EE. UU.', 'Parking, check-in and US customs/immigration'), [232, 236, 240]);
      this.box(xb, yl, bw, bh, this.T('Tijuana, México · Aeropuerto Internacional (TIJ)', 'Tijuana, Mexico · Tijuana International Airport (TIJ)'), this.T(`Aeropuerto de GAP${tij ? ' · ' + this.n(tij.v, 1) + ' M de pasajeros en 2025' : ''}`, `GAP airport${tij ? ' · ' + this.n(tij.v, 1) + ' M passengers in 2025' : ''}`), HEAD);
      this.pdf.setFillColor(...ACCENT); this.pdf.rect(xa + bw, yl + bh / 2 - 4, xb - xa - bw, 8, 'F');
      this.font('normal', 7.4, ACCENT); this.pdf.text(tx(this.T('puente peatonal de 120 m', '120 m pedestrian bridge')), mid, yl + bh / 2 - 8, { align: 'center' });
      this.font('normal', 7.2, ACCENT); this.pdf.text(tx(this.T('cruce en ambos sentidos', 'crossing both ways')), mid, yl + bh / 2 + 14, { align: 'center' });
      this.pdf.setFillColor(...ACCENT); const by = yl + bh / 2; this.pdf.triangle(xa + bw + 1, by, xa + bw + 9, by - 8, xa + bw + 9, by + 8, 'F'); this.pdf.triangle(xb - 1, by, xb - 9, by - 8, xb - 9, by + 8, 'F');
      this.pdf.setDrawColor(...NEG); this.pdf.setLineWidth(0.8); this.pdf.setLineDashPattern([3, 2], 0); this.pdf.line(mid, yl - 3, mid, yl + bh + 10); this.pdf.setLineDashPattern([], 0);
      this.font('bold', 7.2, NEG); this.pdf.text(tx(this.T('frontera EE. UU.–México', 'US–Mexico border')), mid, yl + bh + 18, { align: 'center' });
      yl += bh + 26;
      yl = this.text(this.T(`Los pasajeros con boleto de avión cruzan directamente entre Estados Unidos y la terminal de Tijuana pagando una cuota por cruce (Ps. ${perUser ? this.n(perUser, 0) : '—'} por usuario en el ${this.qlab(lastQ)}). Es ingreso no aeronáutico, sin tarifa regulada.`, `Ticketed passengers cross directly between the United States and the Tijuana terminal for a per-crossing fee (Ps. ${perUser ? this.n(perUser, 0) : '—'} per user in ${this.qlab(lastQ)}). It is non-aeronautical revenue, not tariff-regulated.`), this.cur.x0, yl, wl, 8.2, 'normal', MUTED) + 8;
      // ---- diagram B: the transaction (two sources on top, GAP below)
      yl = this.heading(this.T('La operación: GAP pasó de socio a dueño del 100% de CBX', 'The deal: GAP went from partner to 100% owner of CBX'), this.cur.x0, yl, 10) + 4;
      const b2 = wl * 0.46, bh2 = 64, xr2 = this.cur.x0 + wl - b2;
      this.box(this.cur.x0, yl, b2, bh2, this.T('AMP + 75% de CBX', 'AMP + 75% of CBX'), this.T(`Asistencia técnica (cobrada a GAP desde 1999) y 75% de CBX, del grupo CMA y Aena; fusionados en GAP por ${sh ? this.n(sh.v) : '—'} acciones nuevas (${dil ? this.pct(100 * dil.v) : '—'} de dilución)`, `Technical assistance (charged to GAP since 1999) and 75% of CBX, held by the CMA group and Aena; merged into GAP for ${sh ? this.n(sh.v) : '—'} new shares (${dil ? this.pct(100 * dil.v) : '—'} dilution)`), [232, 236, 240]);
      this.box(xr2, yl, b2, bh2, this.T('25% restante de CBX', 'Remaining 25% of CBX'), this.T(`Comprado por US$ ${cash ? this.n(cash.v, 1) : '—'} M en efectivo, financiado con los certificados GAP 26 / GAP 26-2 (Ps. 10,718 M, marzo de 2026)`, `Bought for US$ ${cash ? this.n(cash.v, 1) : '—'} M in cash, funded by the GAP 26 / GAP 26-2 certificados (Ps. 10,718 M, March 2026)`), [232, 236, 240]);
      const gw = wl * 0.5, gx = this.cur.x0 + (wl - gw) / 2, gy = yl + bh2 + 22, gh = 44;
      this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(0.9);
      for (const cx0 of [this.cur.x0 + b2 / 2, xr2 + b2 / 2]) { const ex = cx0 < mid ? gx + gw * 0.25 : gx + gw * 0.75; this.pdf.line(cx0, yl + bh2, cx0, yl + bh2 + 11); this.pdf.line(cx0, yl + bh2 + 11, ex, yl + bh2 + 11); this.pdf.line(ex, yl + bh2 + 11, ex, gy); this.pdf.line(ex, gy, ex - 3, gy - 5); this.pdf.line(ex, gy, ex + 3, gy - 5); }
      this.box(gx, gy, gw, gh, this.T('GAP · 100% de CBX', 'GAP · 100% of CBX'), this.T(`Consolida CBX desde ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'}; la cuota de asistencia técnica desaparece`, `Consolidates CBX from ${C.consolidatedFrom ? M.ymLabel(C.consolidatedFrom) : '—'}; the technical-assistance fee ends`), [226, 234, 228]);
      yl = gy + gh + 12;
      const bl = [
        this.T(`Ingresos de CBX en su primer periodo consolidado (${this.qlab(lastQ)}, dos meses): Ps. ${this.m(lastQ.is.revCbx)} M, dentro de los no aeronáuticos. Aprobado por ~96% de los votos en diciembre de 2025.`, `CBX revenue in its first consolidated period (${this.qlab(lastQ)}, two months): Ps. ${this.m(lastQ.is.revCbx)} M, within non-aeronautical revenue. Approved by ~96% of votes in December 2025.`),
        this.T(`Al comparar: el ${this.qlab(lastQ)} incluye dos meses de CBX y ningún trimestre anterior lo incluye; las acciones en circulación subieron ${dil ? this.pct(100 * dil.v / (1 - dil.v)) : '—'} y la deuda aumentó por el 25%.`, `When comparing: ${this.qlab(lastQ)} includes two months of CBX and no earlier quarter does; shares outstanding rose ${dil ? this.pct(100 * dil.v / (1 - dil.v)) : '—'} and debt increased for the 25%.`),
      ];
      yl = this.bullets(bl, this.cur.x0, yl, wl, 8.2, { gap: 3, color: MUTED });
      // ---- right: timeline
      let yr = this.heading(this.T('Cronología', 'Timeline'), xr, y, 10);
      const rows = (C.timeline || []).map((e) => [this.date(e.date), M.L(e)]);
      yr = this.fitTable({ y: yr, x: xr, w: wr, head: null, body: rows, meta: rows.map(() => ['bold left', 'left']), cols: { 0: { cellWidth: 58, halign: 'left' }, 1: { halign: 'left' } }, pad: { top: 2.6, bottom: 2.6, left: 4, right: 4 } }, [8.2, 7.8, 7.4, 7], this.cur.y1 - 40);
      this.noteAbove(this.T('Fuentes: ', 'Sources: ') + (M.LS(C.sources) || []).join(' · '), Math.max(yl, yr) + 6, 7);
    }

    // ================= 14. 10 FIBRA GAP =================
    fibraPage() {
      const M = this.M, F = M.REF.fibra || {}, R = M.REF.regulation || {};
      const placedTag = F.placed ? '' : this.T(' (aún no colocada)', ' (Not Yet Placed)');
      let y = this.page('L', this.T('10 · FIBRA GAP explicada' + placedTag, '10 · FIBRA GAP Explained' + placedTag), this.T(`Fibra E constituida por GAP para cofinanciar el Programa Maestro de Desarrollo 2025–2029 · estatus al ${this.date(M.REF.updatedAt)}`, `Fibra E set up by GAP to co-fund the 2025–2029 Master Development Program · status as of ${this.date(M.REF.updatedAt)}`));
      const gap = 24, wl = this.width() * 0.42, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const rows = [[this.T('Vehículo', 'Vehicle'), F.name], [this.T('Clave', 'Ticker'), F.ticker], [this.T('Bolsa', 'Exchange'), F.exchange], [this.T('Monto objetivo', 'Target size'), 'Ps. ' + this.n(F.targetMxnM) + ' M'], ['CBFEs', this.n(F.certificates) + ' × Ps. ' + this.n(F.priceMxn)], [this.T('Participación en cada concesionaria mexicana', 'Stake in each Mexican concessionaire'), this.pct(F.stakePct)], [this.T('Uso de recursos', 'Use of proceeds'), this.T(`PMD 2025–2029 (> Ps. ${this.n((R.mdp && R.mdp.capexMxnBn) || 52)},000 M), principalmente Guadalajara`, `2025–2029 MDP (> Ps. ${this.n((R.mdp && R.mdp.capexMxnBn) || 52)},000 M), mainly Guadalajara`)]];
      let yl = this.heading(this.T('Ficha', 'Fact sheet'), this.cur.x0, y, 10.5);
      yl = this.table({ y: yl, w: wl, head: null, body: rows.map((r) => [r[0], r[1] || '—']), meta: rows.map(() => ['left muted', 'left bold']), size: 9.6, cols: { 0: { cellWidth: wl * 0.42, halign: 'left' }, 1: { halign: 'left' } }, pad: { top: 4, bottom: 4, left: 4, right: 4 } });
      yl = this.heading(this.T('Estatus', 'Status'), this.cur.x0, yl + 10, 10.5);
      yl = this.text(this.es ? F.status_es : F.status_en, this.cur.x0, yl, wl, 9.4);
      const b = [
        this.T('Qué es una Fibra E: fideicomiso de inversión en energía e infraestructura listado en bolsa, fiscalmente transparente, que emite certificados bursátiles fiduciarios (CBFEs) y cuyo activo son participaciones en sociedades que operan infraestructura con flujos estables; diseñado para que las Afores y otros institucionales financien infraestructura con ingresos regulados. Distribuye la mayor parte del flujo que recibe como dividendos.', 'What a Fibra E is: a listed, tax-transparent energy-and-infrastructure investment trust that issues trust certificates (CBFEs) and whose assets are stakes in companies operating infrastructure with stable cash flows; designed so that Afores and other institutions fund regulated-revenue infrastructure. It distributes most of the cash it receives as dividends.'),
        this.T(`Estructura: fideicomiso irrevocable que suscribe ~${this.pct(F.stakePct)} del capital de cada una de las 12 concesionarias mexicanas (no de Jamaica ni de CBX). GAP sigue controlando y operando los aeropuertos; la Fibra recibe su parte proporcional de los dividendos de las concesionarias. Primera emisión: ${this.n(F.certificates / 1e6, 2)} M de CBFEs a Ps. ${this.n(F.priceMxn)} (≈ Ps. ${this.n(F.targetMxnM)} M), clave ${F.ticker} en BIVA; BBVA y Santander colocadores, Actinver fiduciario.`, `Structure: an irrevocable trust subscribing ~${this.pct(F.stakePct)} of the equity of each of the 12 Mexican concessionaires (not Jamaica nor CBX). GAP keeps controlling and operating the airports; the trust receives its proportional share of the concessionaires' dividends. First issue: ${this.n(F.certificates / 1e6, 2)} M CBFEs at Ps. ${this.n(F.priceMxn)} (≈ Ps. ${this.n(F.targetMxnM)} M), ticker ${F.ticker} on BIVA; BBVA and Santander as underwriters, Actinver as trustee.`),
        this.T('Para qué sirve: los recursos complementan el PMD 2025–2029 sin emitir deuda a nivel GAP ni diluir a los accionistas de la controladora. En los estados consolidados la participación de la Fibra aparece como participación no controladora: el EBITDA consolidado no cambia, pero ~4.2% de la utilidad de las concesionarias mexicanas pasa a los tenedores de CBFEs. Puede repetirse con emisiones subsecuentes conforme avance el capex.', 'Purpose: the proceeds top up the 2025–2029 MDP without issuing debt at GAP level or diluting the parent\'s shareholders. In the consolidated statements the trust\'s stake appears as non-controlling interest: consolidated EBITDA is unchanged, but ~4.2% of the Mexican concessionaires\' profit goes to CBFE holders. It can be repeated with subsequent issues as capex progresses.'),
      ];
      let yr = this.heading(this.T('Qué es, cómo se estructura y qué implica', 'What it is, how it is structured and what it implies'), xr, y, 10.5);
      yr = this.bullets(b, xr, yr, wr, 9.6, { gap: 6 });
      // structure diagram (drawn, not data): who owns what and where the money flows
      const srcStr = this.T('Fuentes: ', 'Sources: ') + (M.LS(F.sources) || []).join(' · ');
      const srcH = this.measureText(srcStr, this.width(), 7.2, 1.25);
      const top = Math.max(yl, yr) + 12, availH = this.cur.y1 - top - srcH - 10; let yEnd = top;
      if (availH > 95) {
        const dy = this.heading(this.T('Estructura: quién es dueño de qué y hacia dónde fluye el dinero', 'Structure: who owns what and where the money flows'), this.cur.x0, top, 10.5);
        const W = this.width(), bh = 52, y0 = dy + 10, bw = W * 0.175, pad = (W - 4 * bw) / 3;
        const boxes = [
          [this.T('Accionistas de GAP', 'GAP shareholders'), this.T('BMV: GAP · NYSE: PAC', 'BMV: GAP · NYSE: PAC')],
          [this.T('GAP (controladora)', 'GAP (parent)'), this.T('controla y opera los 14 aeropuertos', 'controls and operates the 14 airports')],
          [this.T('12 concesionarias mexicanas', '12 Mexican concessionaires'), this.T(`~${this.pct(100 - F.stakePct)} GAP · ~${this.pct(F.stakePct)} FIBRA GAP`, `~${this.pct(100 - F.stakePct)} GAP · ~${this.pct(F.stakePct)} FIBRA GAP`)],
          [this.T('FIBRA GAP (Fibra E)', 'FIBRA GAP (Fibra E)'), this.T(`CBFEs ${F.ticker} en BIVA · tenedores: Afores e institucionales`, `${F.ticker} CBFEs on BIVA · holders: Afores and institutions`)],
        ];
        boxes.forEach((bx, i) => { const x = this.cur.x0 + i * (bw + pad); this.pdf.setFillColor(...(i === 3 ? [232, 226, 204] : HEAD)); this.pdf.setDrawColor(...GRID); this.pdf.roundedRect(x, y0, bw, bh, 4, 4, 'FD'); this.font('bold', 9, ACCENT); const tl = this.pdf.splitTextToSize(tx(bx[0]), bw - 10); this.pdf.text(tl, x + 5, y0 + 13); this.font('normal', 7.4, MUTED); this.pdf.text(this.pdf.splitTextToSize(tx(bx[1]), bw - 10), x + 5, y0 + 13 + tl.length * 10.5 + 2); });
        const arrow = (x1, x2, yy, label, above) => { this.pdf.setDrawColor(...ACCENT); this.pdf.setLineWidth(0.9); this.pdf.line(x1, yy, x2, yy); const dir = x2 > x1 ? 1 : -1; this.pdf.line(x2, yy, x2 - dir * 5, yy - 3); this.pdf.line(x2, yy, x2 - dir * 5, yy + 3); this.font('normal', 7.2, ACCENT); const ls = this.pdf.splitTextToSize(tx(label), Math.abs(x2 - x1) - 8); this.pdf.text(ls, (x1 + x2) / 2, yy + (above ? -5 - (ls.length - 1) * 8 : 10), { align: 'center' }); };
        const cx = (i) => this.cur.x0 + i * (bw + pad); const mid = y0 + bh / 2;
        arrow(cx(0) + bw + 2, cx(1) - 2, mid - 8, this.T('capital', 'equity'), true); arrow(cx(1) - 2, cx(0) + bw + 2, mid + 8, this.T('dividendos', 'dividends'), false);
        arrow(cx(1) + bw + 2, cx(2) - 2, mid - 8, this.T(`~${this.pct(100 - F.stakePct)} del capital`, `~${this.pct(100 - F.stakePct)} of equity`), true); arrow(cx(2) - 2, cx(1) + bw + 2, mid + 8, this.T('dividendos', 'dividends'), false);
        arrow(cx(3) - 2, cx(2) + bw + 2, mid - 8, this.T(`~${this.pct(F.stakePct)} del capital: Ps. ${this.n(F.targetMxnM)} M`, `~${this.pct(F.stakePct)} of equity: Ps. ${this.n(F.targetMxnM)} M`), true); arrow(cx(2) + bw + 2, cx(3) - 2, mid + 8, this.T('dividendos (~4.2%)', 'dividends (~4.2%)'), false);
        yEnd = y0 + bh + 22;
        if (availH > 150) {
        const yy2 = y0 + bh + 34; this.font('normal', 8.4, MUTED);
        const capLines = this.pdf.splitTextToSize(tx(this.T(`Los recursos que la Fibra aporta a las concesionarias financian el PMD 2025–2029 (> Ps. ${this.n((R.mdp && R.mdp.capexMxnBn) || 52)},000 M). En los estados consolidados de GAP la participación de la Fibra es participación no controladora: el EBITDA no cambia, ~${this.pct(F.stakePct)} de la utilidad de las concesionarias mexicanas pasa a los tenedores de CBFEs.`, `The cash the trust puts into the concessionaires funds the 2025–2029 MDP (> Ps. ${this.n((R.mdp && R.mdp.capexMxnBn) || 52)},000 M). In GAP's consolidated statements the trust's stake is non-controlling interest: EBITDA is unchanged, ~${this.pct(F.stakePct)} of the Mexican concessionaires' profit goes to CBFE holders.`)), W); this.pdf.text(capLines, this.cur.x0, yy2); yEnd = yy2 + capLines.length * 8.4 * 1.15;
        }
      }
      this.noteAbove(srcStr, Math.max(yEnd + 8, this.cur.y1 - srcH - 4), 7.2);
    }

    // ================= 15. SOURCES AND METHODOLOGY =================
    sourcesPage() {
      const M = this.M;
      let y = this.page('L', this.T('Fuentes y metodología', 'Sources and Methodology'), this.T('Todo el contenido proviene de información pública; cada bloque de datos se actualiza automáticamente con la cadencia indicada', 'All content comes from public information; each data block refreshes automatically at the cadence shown'));
      const gap = 24, wl = this.width() * 0.5 - gap / 2, xr = this.cur.x0 + wl + gap, wr = this.width() - wl - gap;
      const d = (iso) => this.date((iso || '').slice(0, 10));
      const rows = [
        [this.T('Estados financieros trimestrales, acumulados y anuales', 'Quarterly, YTD and annual statements'), this.T('días 6, 12, 18 y 24 de cada mes', '6th, 12th, 18th, 24th monthly'), this.T('informes de GAP (GlobeNewswire / 6-K) convertidos en tablas y validados', 'GAP reports (GlobeNewswire / 6-K) parsed into tables and validated'), d(M.FIN.generatedAt)],
        [this.T('Tráfico mensual por aeropuerto', 'Monthly traffic by airport'), this.T('misma corrida', 'same run'), this.T('reporte mensual de tráfico (≈ día 5)', 'monthly traffic report (≈ 5th)'), d(M.TR.generatedAt)],
        [this.T('Guía de la administración', 'Management guidance'), this.T('misma corrida', 'same run'), this.T('tabla de guía en los comunicados', 'guidance table in the releases'), d(M.GD.generatedAt)],
        [this.T('Comentarios del estado de resultados', 'Income-statement comments'), this.T('por trimestre', 'per quarter'), this.T('informes y transcripciones de conferencias (revisados)', 'reports and earnings-call transcripts (reviewed)'), d(M.CM.updatedAt)],
        [this.T('Resumen ejecutivo', 'Executive summary'), this.T('con cada reporte', 'with each report'), this.T('redactado a partir de los datos y comunicados', 'written from the data files and releases'), d(M.SUM.updatedAt)],
        [this.T('Precios, dividendos, tipo de cambio, tasas', 'Prices, dividends, FX, yields'), this.T('diario, tras el cierre de la BMV', 'daily after the BMV close'), 'Yahoo Finance · FRED', d(M.MK.generatedAt)],
        [this.T('Referencia: acciones, concesiones, deuda, CBX, FIBRA', 'Reference: shares, concessions, debt, CBX, FIBRA'), this.T('por evento', 'event-driven'), this.T('comunicados de GAP, revisados a mano', 'GAP releases, hand-reviewed'), d(M.REF.updatedAt)],
        [this.T('Tráfico nacional (comparación con México)', 'National traffic (Mexico comparison)'), this.T('diario', 'daily'), this.T('AFAC, estadística operativa de aeropuertos', 'AFAC airport operating statistics'), this.MX ? d(this.MX.generatedAt) : '—'],
      ];
      let yl = this.heading(this.T('Cómo se actualiza cada bloque', 'How each block is refreshed'), this.cur.x0, y, 10);
      yl = this.table({ y: yl, w: wl, head: [M.t('block'), M.t('cadence'), M.t('mechanism'), M.t('lastUpdate')], body: rows, meta: rows.map(() => ['left', 'left', 'left small', '']), size: 7.8, cols: { 0: { halign: 'left', cellWidth: wl * 0.3 }, 1: { halign: 'left', cellWidth: wl * 0.2 }, 2: { halign: 'left' }, 3: { cellWidth: wl * 0.14 } } });
      const meth = [
        this.T('IFRIC 12: el operador de una concesión registra las obras que construye para el concedente como ingreso y costo por el mismo importe (margen cero). La vista «sin IFRIC 12» resta ese ingreso y ese costo; el EBITDA no cambia, el margen sí.', 'IFRIC 12: a concession operator books the works it builds for the grantor as revenue and cost for the same amount (zero margin). The "ex-IFRIC 12" view removes that revenue and cost; EBITDA is unchanged, the margin is not.'),
        this.T('Acumulado y UDM: el acumulado usa las columnas de seis, nueve o doce meses de cada informe; los últimos doce meses suman los cuatro trimestres más recientes (o año anterior + acumulado − acumulado previo). El balance es siempre al cierre del periodo.', 'YTD and LTM: year-to-date uses the six-, nine- or twelve-month columns of each report; last twelve months adds the four most recent quarters (or prior year + YTD − prior YTD). The balance sheet is always the period-end position.'),
        this.T('Próximos resultados: cuando GAP publica su calendario, la fecha se marca «confirmada»; mientras tanto se supone la mediana del rezago entre el cierre del trimestre y la publicación del mismo trimestre en los tres años anteriores.', 'Next results: once GAP publishes its calendar the date is marked "confirmed"; until then it is assumed from the median lag between quarter-end and release for the same quarter in the previous three years.'),
        this.T('Deuda neta = préstamos bancarios + certificados bursátiles − efectivo del balance publicado; los trimestres sin detalle se estiman con los flujos de financiamiento y se señalan como estimación.', 'Net debt = bank loans + certificados bursátiles − cash from the published balance sheet; quarters without the breakdown are estimated from financing flows and flagged as estimates.'),
        this.T('Mercado: cierres diarios de Yahoo Finance (precio, sin dividendos reinvertidos); tipo de cambio de la Fed H.10 (FRED DEXMXUS), que se publica con unos días de rezago.', 'Market: Yahoo Finance daily closes (price only, dividends not reinvested); Fed H.10 FX rate (FRED DEXMXUS), published with a few days\' lag.'),
      ];
      yl = this.heading(this.T('Metodología', 'Methodology'), this.cur.x0, yl + 10, 10);
      yl = this.bullets(meth, this.cur.x0, yl, wl, 7.9, { gap: 3 });
      const srcs = [
        [this.T('GAP — informes trimestrales y comunicados', 'GAP — quarterly reports and releases'), this.T('GlobeNewswire / Form 6-K ante la SEC; base de todos los estados financieros, el tráfico y la guía.', 'GlobeNewswire / Form 6-K to the SEC; the basis of every statement, traffic figure and guidance.'), 'globenewswire.com'],
        ['SEC EDGAR — GAP (CIK 1347557)', this.T('Formas 20-F (anuales auditadas) y 6-K.', 'Forms 20-F (audited annual) and 6-K.'), 'sec.gov'],
        [this.T('GAP — Relación con inversionistas', 'GAP — Investor relations'), this.T('Reportes trimestrales en PDF, eventos relevantes, asambleas, PMD y tarifas máximas.', 'PDF quarterly reports, material events, shareholder meetings, MDP and maximum tariffs.'), 'aeropuertosgap.com.mx/en/investors'],
        ['Yahoo Finance', this.T('Cierres diarios GAPB.MX, PAC, ^MXX y dividendos en efectivo.', 'Daily closes GAPB.MX, PAC, ^MXX and cash dividends.'), 'finance.yahoo.com/quote/GAPB.MX'],
        ['FRED — Federal Reserve Bank of St. Louis', 'USD/MXN (DEXMXUS), US 10-yr (DGS10), México 10-yr (IRLTLT01MXM156N).', 'fred.stlouisfed.org'],
        [this.T('BMV / BIVA — eventos relevantes', 'BMV / BIVA — material events'), this.T('FIBRA GAP, emisiones de certificados bursátiles, asambleas.', 'FIBRA GAP, certificados bursátiles issuances, shareholder meetings.'), 'bmv.com.mx'],
        [this.T('AFAC — Estadística operativa de aeropuertos', 'AFAC — Airport operating statistics'), this.T('Pasajeros por aeropuerto y mes de todos los aeropuertos comerciales de México.', 'Passengers by airport and month for every commercial airport in Mexico.'), 'gob.mx/afac'],
        [this.T('Transcripciones de conferencias de resultados', 'Earnings-call transcripts'), this.T('Aportadas por la autora del modelo (Bloomberg); base de los comentarios.', 'Supplied by the model\'s author (Bloomberg); basis of the comments.'), '—'],
      ];
      let yr = this.heading(this.T('Fuentes', 'Sources'), xr, y, 10);
      yr = this.table({ y: yr, x: xr, w: wr, head: [this.T('Fuente', 'Source'), this.T('Qué aporta', 'What it provides'), 'URL'], body: srcs, meta: srcs.map(() => ['bold left', 'left small', 'left small']), size: 7.8, cols: { 0: { halign: 'left', cellWidth: wr * 0.3 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: wr * 0.26 } } });
      yr = this.text(this.T(`Este documento se generó automáticamente el ${this.longDate(this.today)} desde fnam.mx/gap con los datos vigentes en ese momento; las cifras de mercado son del último cierre disponible y el resto de la información de los últimos informes publicados por GAP. No constituye una recomendación de inversión.`, `This document was generated automatically on ${this.longDate(this.today)} from fnam.mx/gap with the data current at that moment; market figures are from the latest available close and everything else from GAP's latest published reports. It is not investment advice.`), xr, yr + 12, wr, 8.2, 'normal', MUTED);
      this.font('bold', 9, ACCENT); this.pdf.text(tx(this.confidential()), xr, yr + 16);
    }

    // ----- footers and download -----
    finish() {
      while (this.pages.length < this.pdf.getNumberOfPages()) this.pages.push({ ...this.cur });
      const n = this.pdf.getNumberOfPages(); const M = this.M;
      const left = this.T(`GAP (BMV: GAP · NYSE: PAC) · Presentación para el consejo · ${this.date(this.todayIso)} · ${this.confidential()} · Solo información pública · fnam.mx/gap`, `GAP (BMV: GAP · NYSE: PAC) · Board presentation · ${this.date(this.todayIso)} · ${this.confidential()} · Public information only · fnam.mx/gap`);
      for (let i = 2; i <= n; i++) {
        const pg = this.pages[i - 1]; if (!pg) continue; this.pdf.setPage(i);
        this.pdf.setDrawColor(...GRID); this.pdf.setLineWidth(0.5); this.pdf.line(pg.x0, pg.h - 30, pg.x1, pg.h - 30);
        this.font('normal', 7.2, MUTED); this.pdf.text(tx(left), pg.x0, pg.h - 19, { maxWidth: pg.x1 - pg.x0 - 90 });
        this.font('bold', 8, INK); const s = this.T(`Página ${i} de ${n}`, `Page ${i} of ${n}`); this.pdf.text(s, pg.x1, pg.h - 19, { align: 'right' });
      }
      const name = this.T(`GAP_PAC_presentacion_${this.todayIso}.pdf`, `GAP_PAC_board_presentation_${this.todayIso}.pdf`);
      this.pdf.setProperties({ title: this.T('GAP · Presentación para el consejo', 'GAP · Board presentation'), subject: name, creator: 'fnam.mx' });
      this.pdf.save(name);
      void M;
    }
  }

  window.GAP_PRESENT = { build };
})();
