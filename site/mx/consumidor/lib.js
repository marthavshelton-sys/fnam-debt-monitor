// The Mexican Consumer: drawing toolkit of the page (formatters, Chart.js wrappers, the state map and the
// sources-and-uses flow). Everything is drawn in the reader's browser from data/data.js; nothing is fetched elsewhere.
(function () {
  'use strict';
  var P = window.FNAM_PROV || null;
  var UI = { lang: window.__MXC_LANG === 'en' ? 'en' : 'es', charts: {} };
  var $ = function (id) { return document.getElementById(id); };
  UI.$ = $;
  UI.tr = function (es, en) { return UI.lang === 'en' ? en : es; };
  UI.bi = function (es, en) { return '<span class="es">' + es + '</span><span class="en">' + en + '</span>'; };
  UI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  UI.css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  UI.isDark = function () { var s = document.documentElement.getAttribute('data-theme'); if (s === 'dark') return true; if (s === 'light') return false; return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); };

  // ---------- numbers and dates (Mexican and U.S. usage share the 1,234.5 form) ----------
  var nf = function (v, d) { return Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  UI.nf = nf;
  UI.nd = function () { return '<span class="nd">' + UI.tr('n. d.', 'n/a') + '</span>'; };
  // pesos: "$25,955" in Spanish, "MX$25,955" in English (so a dollar sign is never read as U.S. dollars); U.S. dollars always "US$"
  UI.cur = function () { return UI.lang === 'en' ? 'MX$' : '$'; };
  UI.peso = function (v, d) { return v == null ? '—' : (v < 0 ? '−' : '') + UI.cur() + nf(Math.abs(v), d || 0); };
  UI.pesoK = function (v, d) { return v == null ? '—' : (v < 0 ? '−' : '') + UI.cur() + nf(Math.abs(v) / 1000, d == null ? 1 : d) + (UI.lang === 'en' ? 'K' : ' mil'); };   // pesos -> thousands
  UI.thou = function (v, d) { return v == null ? '—' : (v < 0 ? '−' : '') + UI.cur() + nf(Math.abs(v), d == null ? 1 : d) + (UI.lang === 'en' ? 'K' : ' mil'); };              // a figure already in thousands of pesos
  UI.usd = function (v, d) { return v == null ? '—' : (v < 0 ? '−' : '') + 'US$' + nf(Math.abs(v), d || 0); };
  // thousands of millions of pesos -> "$6.26 billones" / "MX$6.26 trillion", or "$746 mil millones" / "MX$746 billion"
  UI.money = function (bn, d) {
    if (bn == null) return '—';
    var a = Math.abs(bn), s = bn < 0 ? '−' : '';
    if (a >= 1000) return s + UI.cur() + nf(a / 1000, d == null ? 2 : d) + (UI.lang === 'en' ? ' trillion' : ' billones');
    return s + UI.cur() + nf(a, d == null ? 0 : d) + (UI.lang === 'en' ? ' billion' : ' mil millones');
  };
  // a figure already in "billones" (millions of millions) of pesos
  UI.bill = function (v, d) { return v == null ? '—' : UI.cur() + nf(v, d == null ? 1 : d) + (UI.lang === 'en' ? ' trillion' : ' billones'); };
  UI.pct = function (v, d) { return v == null ? '—' : nf(v, d == null ? 1 : d) + '%'; };
  UI.signed = function (v, d) { return v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d == null ? 1 : d) + '%'; };
  UI.pp = function (v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d == null ? 1 : d) + (UI.lang === 'en' ? ' pp' : ' pp'); };
  UI.mill = function (n, d) { return nf(n / 1e6, d == null ? 1 : d) + (UI.lang === 'en' ? ' million' : ' millones'); };
  UI.date = function (d) { return P ? P.fmt(d, UI.lang) : String(d); };
  UI.through = function (d) { return P ? P.through(d, UI.lang) : String(d); };
  UI.kind = function (k) { return P ? P.kind(k, UI.lang) : ''; };
  UI.amber = function (t, tip) { return P ? P.amber(t, tip) : ''; };

  // ---------- table view and legend of a chart ----------
  UI.table = function (key, head, rows, opts) {
    var el = document.querySelector('[data-tbl="' + key + '"]'); if (!el) return;
    var h = '<details class="tbl"' + (opts && opts.open ? ' open' : '') + '><summary>' + UI.tr('Ver tabla de datos', 'View data table') + '</summary><div class="tblwrap"><table><thead><tr>' +
      head.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr' + (r._cls ? ' class="' + r._cls + '"' : '') + '>' + r.map(function (c, i) { return i === 0 ? '<td>' + c + '</td>' : '<td class="num">' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div></details>';
    el.innerHTML = h;
  };
  UI.legend = function (key, items) {
    var el = document.querySelector('[data-legend="' + key + '"]'); if (!el) return;
    el.innerHTML = '<div class="legend-row">' + items.map(function (it) { return '<span class="li"><span class="' + (it.line ? 'ln' : 'dot') + '" style="background:' + it.c + '"></span>' + UI.esc(it.l) + '</span>'; }).join('') + '</div>';
  };

  // ---------- Chart.js ----------
  UI.series = function (n) { return UI.css('--series-' + n); };
  UI.setupCharts = function () {
    if (!window.Chart) return;
    var dark = UI.isDark();
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = UI.css('--text-secondary');
    Chart.defaults.borderColor = UI.css('--grid');
    Chart.defaults.animation = false;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = dark ? '#2a2a27' : '#0b0b0b';
    Chart.defaults.plugins.tooltip.titleFont = { family: 'Inter', weight: '700', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { family: 'Inter', size: 12 };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.plugins.tooltip.usePointStyle = true;
  };
  // value at the end of each bar (single-series bar charts): drawn only where it fits
  var valueLabels = {
    id: 'valueLabels',
    afterDatasetsDraw: function (chart, args, o) {
      if (!o || !o.fmt) return;
      var ctx = chart.ctx, horiz = chart.options.indexAxis === 'y', area = chart.chartArea;
      ctx.save(); ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.fillStyle = UI.css('--text-secondary'); ctx.textBaseline = 'middle';
      chart.data.datasets.forEach(function (ds, di) {
        if (o.dataset != null && o.dataset !== di) return;
        var meta = chart.getDatasetMeta(di); if (meta.hidden) return;
        meta.data.forEach(function (el, i) {
          var v = ds.data[i]; if (v == null) return;
          var t = o.fmt(v, i), w = ctx.measureText(t).width;
          if (horiz) { var x = el.x + 6; if (v < 0) x = el.x - w - 6;
            if (x + w > chart.width - 2) { var bg = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor; if (el.x - el.base < w + 14) return; ctx.save(); ctx.fillStyle = UI.inkOn(bg); ctx.textAlign = 'right'; ctx.fillText(t, el.x - 7, el.y); ctx.restore(); return; }
            ctx.textAlign = 'left'; ctx.fillText(t, x, el.y); }
          else { if (w > (el.width || 0) + 14) return; ctx.textAlign = 'center'; ctx.fillText(t, el.x, v < 0 ? el.y + 10 : el.y - 9); }
        });
      });
      ctx.restore();
    }
  };
  function tick(fmt) { var t = { color: UI.css('--muted'), font: { size: 11 } }; if (fmt) t.callback = function (v) { var x = String(fmt(v)); return Math.abs(v - Math.round(v)) < 1e-9 ? x.replace(/\.0+(?=\D*$)/, '') : x; }; return t; }
  // a long category label becomes two or three lines instead of being cut by the axis
  function wrapLabel(s, n) { s = String(s); if (!n || s.length <= n) return s; var lines = ['']; s.split(' ').forEach(function (w) { var l = lines[lines.length - 1]; if (l && (l + ' ' + w).length > n) lines.push(w); else lines[lines.length - 1] = l ? l + ' ' + w : w; }); return lines.length > 1 ? lines : s; }
  UI.mk = function (id, cfg, aria) {
    if (UI.charts[id]) { UI.charts[id].destroy(); delete UI.charts[id]; }
    var el = $(id); if (!el || !window.Chart) return null;
    if (aria) el.setAttribute('aria-label', aria);
    cfg.plugins = (cfg.plugins || []).concat([valueLabels]);
    UI.charts[id] = new Chart(el, cfg);
    return UI.charts[id];
  };
  // o: { labels, data | datasets:[{label,data,color}], horizontal, stacked, fmt (value -> text), axisFmt, color | colors[], max, min, valueLabels, aria, thickness, tipTitle, tipExtra }
  UI.bar = function (id, o) {
    var horiz = !!o.horizontal, host = $(id), narrow = host && host.parentNode.clientWidth < 430;
    var wrapN = o.wrap != null ? o.wrap : (horiz ? (narrow ? 17 : 26) : (narrow ? 9 : 0)), labels = o.labels.map(function (l) { return wrapLabel(l, wrapN); });
    // a horizontal chart grows with its rows, so wrapped labels and grouped bars never run into each other
    if (horiz && host) {
      var box = host.parentNode; box.style.height = ''; box.style.removeProperty('--h');
      var base = parseFloat(getComputedStyle(box).getPropertyValue('--h')) || box.clientHeight, per = (o.thickness || 22) * (o.datasets && !o.stacked ? o.datasets.length : 1) + 12;
      var need = 46 + labels.reduce(function (a, l) { return a + Math.max((Array.isArray(l) ? l.length : 1) * 14 + 8, per); }, 0);
      if (need > base) { box.style.setProperty('--h', need + 'px'); box.style.height = need + 'px'; }
    }
    var datasets = (o.datasets || [{ label: o.label || '', data: o.data, color: o.color || UI.series(1) }]).map(function (d, i) {
      return { label: d.label, data: d.data, backgroundColor: d.colors || o.colors || d.color, stack: o.stacked ? 's' : (d.stack || undefined), borderRadius: o.stacked ? 0 : 3, borderSkipped: 'start',
        maxBarThickness: o.thickness || 22, borderColor: UI.css('--surface'), borderWidth: o.stacked ? (horiz ? { right: 2 } : { top: 2 }) : 0, categoryPercentage: o.catPct || 0.78, barPercentage: o.barPct || 0.9 };
    });
    var val = { grid: { color: UI.css('--grid'), drawTicks: false }, border: { display: false }, stacked: !!o.stacked, ticks: Object.assign(tick(o.axisFmt || o.fmt), { padding: 6, maxTicksLimit: o.valTicks || (narrow && horiz ? 5 : 7), maxRotation: 0 }), beginAtZero: true };
    if (o.max != null) val.max = o.max; if (o.min != null) val.min = o.min;
    var cat = { grid: { display: false }, border: { color: UI.css('--baseline') }, stacked: !!o.stacked, ticks: Object.assign(tick(), { autoSkip: !!o.autoSkip, maxRotation: o.rot != null ? o.rot : (narrow && !horiz ? 55 : 0), font: { size: Math.max(11, o.catSize || 11) }, color: UI.css('--text-secondary') }) };
    return UI.mk(id, { type: 'bar', data: { labels: labels, datasets: datasets },
      options: { indexAxis: horiz ? 'y' : 'x', responsive: true, maintainAspectRatio: false, layout: { padding: horiz ? { right: o.valueLabels ? 46 : 6 } : { top: o.valueLabels ? 16 : 4 } },
        interaction: { mode: 'index', intersect: false, axis: horiz ? 'y' : 'x' },
        plugins: { valueLabels: o.valueLabels ? { fmt: o.valueLabels === true ? o.fmt : o.valueLabels, dataset: o.labelDataset } : false,
          tooltip: { callbacks: { title: function (it) { return o.tipTitle ? o.tipTitle(it[0].dataIndex) : String(o.labels[it[0].dataIndex]); },
            label: function (c) { var v = horiz ? c.parsed.x : c.parsed.y; return (c.dataset.label ? c.dataset.label + ': ' : '') + (o.fmt ? o.fmt(v, c.dataIndex, c.datasetIndex) : v); },
            afterBody: o.tipExtra ? function (it) { return o.tipExtra(it[0].dataIndex); } : undefined } } },
        scales: horiz ? { x: val, y: cat } : { x: cat, y: val } } }, o.aria);
  };
  // o: { labels, datasets:[{label,data,color,dash,fill,points,axis}], fmt, axisFmt, xTicks, min, max, aria, yTitle,
  //      y2: { min, max, grace, title } }   a dataset with axis: 'y2' is read on the right-hand axis (the titles say which is which)
  UI.line = function (id, o) {
    var datasets = o.datasets.map(function (d) {
      return { label: d.label, data: d.data, borderColor: d.color, backgroundColor: d.fill ? d.color + '1c' : d.color, fill: !!d.fill, borderWidth: d.width || 2, tension: 0.15, spanGaps: true, yAxisID: d.axis === 'y2' && o.y2 ? 'y2' : 'y',
        pointRadius: d.points ? 3 : 0, pointHoverRadius: 4, pointBackgroundColor: d.color, pointBorderColor: UI.css('--surface'), pointBorderWidth: 2, borderDash: d.dash || undefined };
    });
    var title = function (t) { return t ? { display: true, text: t, color: UI.css('--text-secondary'), font: { size: 11, weight: '600' }, padding: { top: 0, bottom: 4 } } : { display: false }; };
    var y = { grid: { color: UI.css('--grid'), drawTicks: false }, border: { display: false }, ticks: Object.assign(tick(o.axisFmt || o.fmt), { padding: 6, maxTicksLimit: 7 }), title: title(o.yTitle) };
    if (o.min != null) y.min = o.min; if (o.max != null) y.max = o.max;
    var scales = { x: { grid: { display: false }, border: { color: UI.css('--baseline') }, ticks: Object.assign(tick(), { autoSkip: true, maxTicksLimit: o.xTicks || 9, maxRotation: 0 }) }, y: y };
    if (o.y2) {
      scales.y2 = { position: 'right', grid: { drawOnChartArea: false, drawTicks: false }, border: { display: false }, ticks: Object.assign(tick(o.axisFmt || o.fmt), { padding: 6, maxTicksLimit: 7 }), title: title(o.y2.title) };
      if (o.y2.min != null) scales.y2.min = o.y2.min; if (o.y2.max != null) scales.y2.max = o.y2.max; if (o.y2.grace != null) scales.y2.grace = o.y2.grace;
    }
    return UI.mk(id, { type: 'line', data: { labels: o.labels, datasets: datasets },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { itemSort: function (a, b) { return b.parsed.y - a.parsed.y; }, callbacks: { label: function (c) { return c.dataset.label + ': ' + (o.fmt ? o.fmt(c.parsed.y) : c.parsed.y); } } } },
        scales: scales } }, o.aria);
  };

  // ---------- sequential color classes ----------
  UI.seq = function (i) { return UI.css('--seq-' + (i + 1)); };   // i = 0..6
  function lum(hex) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || ''); if (!m) return 1; var c = [m[1], m[2], m[3]].map(function (h) { var v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  UI.inkOn = function (hex) { return lum(hex) > 0.36 ? '#0b0b0b' : '#ffffff'; };
  // seven classes with (nearly) the same number of states each; returns the six break values
  UI.breaks = function (values, n) {
    var v = values.filter(function (x) { return x != null && isFinite(x); }).sort(function (a, b) { return a - b; });
    var out = []; for (var i = 1; i < n; i++) out.push(v[Math.min(v.length - 1, Math.round(i * v.length / n))]);
    return out;
  };
  UI.classOf = function (v, br) { if (v == null) return -1; var c = 0; while (c < br.length && v >= br[c]) c++; return c; };

  // ---------- state map ----------
  // o: { box, chips, scale, rank, tblKey, metrics:[{id, label, short, get(state), us, fmt(v), kind, note}], current, onChange, source(metric) }
  // the states too small to label or point at (Mexico City, Tlaxcala, Morelos, Aguascalientes, Colima, Querétaro) get a chip each
  var SMALL = { '09': 1, '29': 1, '17': 1, '01': 1, '06': 1, '22': 1 };
  var NUDGE = { '02': [-6, -10], '03': [4, 6], '15': [-16, -6], '13': [4, -4], '21': [6, 8], '30': [10, -6], '28': [4, 0], '26': [0, 6], '11': [-2, 0], '18': [-4, 0], '27': [0, -2], '04': [-4, 6], '31': [0, -4], '23': [2, 4], '25': [-6, 6], '16': [0, 2], '12': [0, 2], '24': [2, -6], '32': [-2, -2], '19': [0, -10], '14': [-8, 6] };
  UI.stateMap = function (o) {
    var M = window.FNAM_MX_STATES, box = $(o.box); if (!M || !box) return;
    var metric = o.metrics.filter(function (m) { return m.id === o.current; })[0] || o.metrics[0];
    var list = o.states.map(function (s) { return { s: s, v: metric.get(s) }; });
    var br = UI.breaks(list.map(function (x) { return x.v; }), 7);
    var ranked = list.filter(function (x) { return x.v != null; }).sort(function (a, b) { return b.v - a.v; });
    var rankOf = {}; ranked.forEach(function (x, i) { rankOf[x.s.code] = i + 1; });
    var byCode = {}; list.forEach(function (x) { byCode[x.s.code] = x; });
    var fill = function (v) { var c = UI.classOf(v, br); return c < 0 ? UI.css('--seq-none') : UI.seq(c); };
    var tipText = function (x) { return '<b>' + UI.esc(x.s.name) + '</b>' + UI.esc(metric.label) + ': ' + (x.v == null ? UI.tr('sin dato', 'no data') : metric.fmt(x.v)) + (x.v == null ? '' : '<br>' + UI.tr('Lugar ', 'Rank ') + rankOf[x.s.code] + UI.tr(' de ', ' of ') + ranked.length + (metric.us != null ? ' · ' + UI.tr('México ', 'Mexico ') + metric.fmt(metric.us) : '')); };
    var aria = function (x) { return x.s.name + ': ' + (x.v == null ? UI.tr('sin dato', 'no data') : metric.fmt(x.v) + UI.tr(', lugar ', ', rank ') + rankOf[x.s.code]); };
    var svg = '<svg viewBox="0 0 ' + M.width + ' ' + M.height + '" role="group" aria-label="' + UI.esc(metric.label + UI.tr(' por estado', ' by state')) + '">';
    var labels = '';
    Object.keys(M.states).forEach(function (code) {
      var g = M.states[code], x = byCode[code]; if (!x) return;
      var f = fill(x.v);
      svg += '<path class="st" data-code="' + code + '" d="' + g.d + '" fill="' + f + '" tabindex="0" role="img" aria-label="' + UI.esc(aria(x)) + '"/>';
      if (!SMALL[code]) { var n = NUDGE[code] || [0, 0]; labels += '<text class="lab" x="' + (g.c[0] + n[0]) + '" y="' + (g.c[1] + n[1]) + '" fill="' + UI.inkOn(f) + '">' + g.ab + '</text>'; }
    });
    box.innerHTML = svg + labels + '</svg><div class="map-tip" role="tooltip"></div>';
    var tip = box.querySelector('.map-tip');
    var show = function (code, el) {
      var x = byCode[code]; if (!x) return;
      tip.innerHTML = tipText(x);
      var b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2 - b.left, cy = r.top - b.top;
      tip.style.left = Math.max(110, Math.min(b.width - 110, cx)) + 'px'; tip.style.top = Math.max(54, cy - 6) + 'px';
      tip.classList.add('show');
      Array.prototype.forEach.call(document.querySelectorAll('#' + o.box + ' .st.on, #' + o.chips + ' .chip.on'), function (n) { n.classList.remove('on'); });
      var p = box.querySelector('.st[data-code="' + code + '"]'); if (p) p.classList.add('on');
    };
    var hide = function () { tip.classList.remove('show'); Array.prototype.forEach.call(document.querySelectorAll('#' + o.box + ' .st.on'), function (n) { n.classList.remove('on'); }); };
    Array.prototype.forEach.call(box.querySelectorAll('.st'), function (el) {
      var code = el.getAttribute('data-code');
      el.addEventListener('mouseenter', function () { show(code, el); }); el.addEventListener('focus', function () { show(code, el); });
      el.addEventListener('mouseleave', hide); el.addEventListener('blur', hide);
      el.addEventListener('click', function () { show(code, el); });
    });
      var chips = $(o.chips);
    if (chips) {
      chips.innerHTML = Object.keys(SMALL).map(function (code) { var x = byCode[code]; if (!x) return ''; var f = fill(x.v); return '<span class="chip" tabindex="0" data-code="' + code + '" style="background:' + f + ';color:' + UI.inkOn(f) + '" role="img" aria-label="' + UI.esc(aria(x)) + '">' + M.states[code].ab + ' ' + (x.v == null ? '—' : (metric.short || metric.fmt)(x.v)) + '</span>'; }).join('');
      Array.prototype.forEach.call(chips.querySelectorAll('.chip'), function (el) {
        var code = el.getAttribute('data-code'), path = box.querySelector('.st[data-code="' + code + '"]');
        var on = function () { if (path) show(code, path); }; el.addEventListener('mouseenter', on); el.addEventListener('focus', on); el.addEventListener('mouseleave', hide); el.addEventListener('blur', hide);
      });
    }
    var scale = $(o.scale);
    if (scale) {
      var sf = metric.short || metric.fmt, steps = '';
      for (var i = 0; i < 7; i++) steps += '<i style="background:' + UI.seq(i) + '" title="' + UI.esc((i === 0 ? '< ' + sf(br[0]) : i === 6 ? '≥ ' + sf(br[5]) : sf(br[i - 1]) + ' – ' + sf(br[i]))) + '"></i>';
      scale.innerHTML = '<span>' + sf(ranked[ranked.length - 1].v) + '</span><span class="steps">' + steps + '</span><span>' + sf(ranked[0].v) + '</span><span class="note">' + UI.tr('Siete grupos con el mismo número de estados; cortes: ', 'Seven groups with the same number of states; breaks: ') + br.map(sf).join(' · ') + '</span>';
    }
    var rank = $(o.rank);
    if (rank) {
      var li = function (x, i) { return '<li><span class="n">' + i + '</span><span class="nm">' + UI.esc(x.s.name) + '</span><span class="vl">' + metric.fmt(x.v) + '</span></li>'; };
      rank.innerHTML = '<h4>' + UI.tr('Los cinco más altos', 'Top five') + '</h4><ol>' + ranked.slice(0, 5).map(function (x, i) { return li(x, i + 1); }).join('') + '</ol>' +
        '<h4>' + UI.tr('Los cinco más bajos', 'Bottom five') + '</h4><ol>' + ranked.slice(-5).map(function (x, i) { return li(x, ranked.length - 4 + i); }).join('') + '</ol>' +
        (metric.us != null ? '<div class="us">' + UI.tr('México: ', 'Mexico: ') + '<b>' + metric.fmt(metric.us) + '</b>' + (metric.usNote ? ' ' + metric.usNote : '') + '</div>' : '');
    }
    if (o.tblKey) UI.table(o.tblKey, ['#', UI.tr('Estado', 'State'), UI.esc(metric.label)], ranked.map(function (x, i) { return [i + 1, UI.esc(x.s.name), metric.fmt(x.v)]; }));
    return metric;
  };
  // segmented control: items [{id, label}], returns nothing; calls cb(id)
  UI.seg = function (elId, items, current, cb) {
    var el = $(elId); if (!el) return;
    el.innerHTML = items.map(function (it) { return '<button type="button" data-id="' + it.id + '" aria-pressed="' + (it.id === current ? 'true' : 'false') + '">' + UI.esc(it.label) + '</button>'; }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) { b.addEventListener('click', function () { cb(b.getAttribute('data-id')); }); });
  };

  // ---------- sources-and-uses flow ----------
  // o: { el, bars, left:[{label, v, color}], right:[...], midLabel, midValue, fmt, headL, headR }
  UI.flow = function (o) {
    var el = $(o.el); if (!el) return;
    var W = 1000, padT = 34, gap = 7, nodeW = 14, xL = 268, xM = 493, xR = 718;
    var totL = o.left.reduce(function (a, n) { return a + n.v; }, 0), totR = o.right.reduce(function (a, n) { return a + n.v; }, 0);
    var tot = Math.max(totL, totR);
    var n = Math.max(o.left.length, o.right.length), H = 470, scale = (H - padT - 16 - gap * (n - 1)) / tot;
    function layout(nodes) { var y = padT; return nodes.map(function (nd) { var h = Math.max(2, nd.v * scale); var r = { n: nd, y: y, h: h }; y += h + gap; return r; }); }
    var L = layout(o.left), R = layout(o.right);
    var midH = tot * scale, lH = L[L.length - 1].y + L[L.length - 1].h - padT, rH = R[R.length - 1].y + R[R.length - 1].h - padT;
    var midY = padT + (Math.max(lH, rH) - midH) / 2;
    // label rows: at the node's middle, pushed apart to at least 27px so two lines of text never touch
    function spread(arr) { var ys = arr.map(function (r) { return r.y + r.h / 2; }); for (var i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] < 29) ys[i] = ys[i - 1] + 29; var over = ys[ys.length - 1] - (H - 14); if (over > 0) for (var j = ys.length - 1; j >= 0; j--) { ys[j] -= over; if (j > 0 && ys[j] - ys[j - 1] >= 29) break; } return ys; }
    var yl = spread(L), yr = spread(R);
    var band = function (x0, y0, h0, x1, y1, h1, color, title) { var c = (x0 + x1) / 2; return '<path class="band" fill="' + color + '" d="M' + x0 + ',' + y0 + 'C' + c + ',' + y0 + ' ' + c + ',' + y1 + ' ' + x1 + ',' + y1 + 'L' + x1 + ',' + (y1 + h1) + 'C' + c + ',' + (y1 + h1) + ' ' + c + ',' + (y0 + h0) + ' ' + x0 + ',' + (y0 + h0) + 'Z"><title>' + UI.esc(title) + '</title></path>'; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(o.aria || '') + '">';
    s += '<text class="col-h" x="' + (xL - 12) + '" y="14" text-anchor="end">' + UI.esc(o.headL) + '</text><text class="col-h" x="' + (xR + nodeW + 12) + '" y="14">' + UI.esc(o.headR) + '</text>';
    var my = midY, sh = function (v) { return UI.pct(v / tot * 100, 1); };
    L.forEach(function (r, i) {
      var h1 = r.n.v * scale;
      s += band(xL + nodeW, r.y, r.h, xM, my, h1, r.n.color, r.n.label + ': ' + o.fmt(r.n.v) + ' (' + sh(r.n.v) + ')'); my += h1;
      s += '<rect x="' + xL + '" y="' + r.y + '" width="' + nodeW + '" height="' + r.h + '" rx="2" fill="' + r.n.color + '"/>';
      if (Math.abs(yl[i] - (r.y + r.h / 2)) > 3) s += '<path d="M' + (xL - 3) + ',' + (r.y + r.h / 2) + 'L' + (xL - 10) + ',' + yl[i] + '" stroke="' + UI.css('--baseline') + '" fill="none"/>';
      s += '<text class="node-l" x="' + (xL - 12) + '" y="' + (yl[i] - 2) + '" text-anchor="end">' + UI.esc(r.n.label) + '</text><text class="node-v" x="' + (xL - 12) + '" y="' + (yl[i] + 12) + '" text-anchor="end">' + o.fmt(r.n.v) + ' · ' + sh(r.n.v) + '</text>';
    });
    my = midY;
    R.forEach(function (r, i) {
      var h1 = r.n.v * scale;
      s += band(xM + nodeW, my, h1, xR, r.y, r.h, r.n.color, r.n.label + ': ' + o.fmt(r.n.v) + ' (' + sh(r.n.v) + ')'); my += h1;
      s += '<rect x="' + xR + '" y="' + r.y + '" width="' + nodeW + '" height="' + r.h + '" rx="2" fill="' + r.n.color + '"/>';
      if (Math.abs(yr[i] - (r.y + r.h / 2)) > 3) s += '<path d="M' + (xR + nodeW + 3) + ',' + (r.y + r.h / 2) + 'L' + (xR + nodeW + 10) + ',' + yr[i] + '" stroke="' + UI.css('--baseline') + '" fill="none"/>';
      s += '<text class="node-l" x="' + (xR + nodeW + 12) + '" y="' + (yr[i] - 2) + '">' + UI.esc(r.n.label) + '</text><text class="node-v" x="' + (xR + nodeW + 12) + '" y="' + (yr[i] + 12) + '">' + o.fmt(r.n.v) + ' · ' + sh(r.n.v) + '</text>';
    });
    s += '<rect x="' + xM + '" y="' + midY + '" width="' + nodeW + '" height="' + midH + '" rx="2" fill="' + UI.css('--text-primary') + '"/>';
    s += '</svg>';
    el.innerHTML = s;
    // phones: the same two columns as stacked bars with their lists
    var bars = $(o.bars);
    if (bars) {
      var block = function (title, nodes) { var t = nodes.reduce(function (a, x) { return a + x.v; }, 0); return '<h4>' + UI.esc(title) + '</h4><div class="bar">' + nodes.map(function (x) { return '<i style="background:' + x.color + ';flex:' + x.v + ' 1 0"></i>'; }).join('') + '</div><ul>' + nodes.map(function (x) { return '<li><span class="sw" style="background:' + x.color + '"></span><span class="nm">' + UI.esc(x.label) + '</span><span class="vl">' + o.fmt(x.v) + ' · ' + UI.pct(x.v / t * 100, 1) + '</span></li>'; }).join('') + '</ul>'; };
      bars.innerHTML = block(o.headL, o.left) + block(o.headR, o.right);
    }
  };

  window.MXC_UI = UI;
})();
