/* FNAM site search: the button in the landing page's top bar opens a dialog that suggests pages, sections, macro
   indicators and board presentations as the reader types. The index (/assets/search-index.js) is read from the pages
   themselves in Spanish and English; this file only ranks and shows it.

   Ranking, in order of weight: a company's own identifiers (ticker, name: "ORCL" or "oracle" puts the Oracle model
   first), the identifiers of a page that covers it (the Hyperscaler Hub for "ORCL"), titles, the page a section sits
   in, descriptions, then the words of each section's sub-headings and table labels (rarer words weigh more). Accents,
   case and punctuation are ignored, both languages match whichever is on screen, every word typed must match
   (a prefix counts: "remes" finds "remesas"), and a word of five letters or more that matches nothing is read as a typo of the closest one. */
(function () {
  'use strict';
  var root = document.documentElement;
  var openBtn = document.getElementById('searchOpen');
  var dlg = document.getElementById('searchDialog');
  if (!openBtn || !dlg || typeof dlg.showModal !== 'function') { if (openBtn) openBtn.hidden = true; return; }
  var input = document.getElementById('searchInput');
  var list = document.getElementById('searchList');
  var msg = document.getElementById('searchMsg');
  var status = document.getElementById('searchStatus');
  var closeBtn = document.getElementById('searchClose');

  var MAX = 12;
  var lang = function () { return root.getAttribute('lang') === 'en' ? 'en' : 'es'; };
  var L = function (es, en) { return lang() === 'en' ? en : es; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- text normalization: the index builder applies the same rule ----------
  var MARKS = /\p{M}+/gu, NONWORD = /[^\p{L}\p{N}]+/gu;
  function norm(s) { return String(s || '').normalize('NFD').replace(MARKS, '').toLowerCase().replace(NONWORD, ' ').trim(); }
  var STOP = {};
  ('de del la las el los lo y e o u en a al por para con sin un una unos unas que se su sus como mas ' +
    'the of and or in on to for by with an as at from its is are vs per').split(' ').forEach(function (w) { STOP[w] = 1; });
  var DECK_WORDS = { pdf: 1, presentacion: 1, presentaciones: 1, presentation: 1, presentations: 1, deck: 1, decks: 1, consejo: 1, board: 1 };

  // ---------- index ----------
  // Fields and their weights for one matched word. KW (sub-headings, table labels) is scaled by how rare the word is.
  // Titles count in full in the language on screen and a little less in the other one ("gap" should not surface a
  // Spanish "Huecos" section because its English title says "Gaps"), so both titles are kept apart.
  // PID: the identifiers of the page a section sits in ("gap" for every GAP section).
  var F = { TITLE_ES: 0, ID: 1, ALIAS: 2, CTX: 3, DESC: 4, KW: 5, GROUP: 6, TITLE_EN: 7, PID: 8 };
  var WEIGHT = [60, 70, 34, 18, 22, 11, 40, 60, 36];
  var isTitle = function (f) { return f === F.TITLE_ES || f === F.TITLE_EN; };
  function weights() { var w = WEIGHT.slice(); if (lang() === 'en') w[F.TITLE_ES] = 40; else w[F.TITLE_EN] = 40; return w; }
  var IX = null, loading = null;

  function prepare(raw) {
    var E = raw.entries, byUrl = {}, vocab = new Map(), idFull = new Map(), aliasFull = new Map(), df = new Map();
    E.forEach(function (e, i) { e.i = i; if (!byUrl[e.u]) byUrl[e.u] = e; });
    E.forEach(function (e, i) {
      var seen = new Set();
      var add = function (text, f) {
        norm(text).split(' ').forEach(function (t) {
          if (!t) return;
          var k = t + '\u0001' + f;
          if (seen.has(k)) return;
          seen.add(k);
          var p = vocab.get(t); if (!p) vocab.set(t, p = []);
          p.push(i * 16 + f);
        });
      };
      var full = function (map, x) { var c = norm(x).replace(/ /g, ''); if (!c) return; var a = map.get(c); if (!a) map.set(c, a = []); if (a.indexOf(i) < 0) a.push(i); };
      add(e.t[0], F.TITLE_ES); add(e.t[1], F.TITLE_EN);
      (e.id || []).forEach(function (x) { add(x, F.ID); full(idFull, x); });
      (e.a || []).forEach(function (x) { add(x, F.ALIAS); full(aliasFull, x); });
      var parent = e.p && byUrl[e.p];
      if (e.c) { add(e.c[0], F.CTX); add(e.c[1], F.CTX); }
      if (parent) { add(parent.t[0], F.CTX); add(parent.t[1], F.CTX); (parent.id || []).forEach(function (x) { add(x, F.PID); }); }
      if (e.d) { add(e.d[0], F.DESC); add(e.d[1], F.DESC); }
      if (e.g) { add(e.g[0], F.GROUP); add(e.g[1], F.GROUP); }
      if (e.w) add(e.w, F.KW);
      e.nt = [norm(e.t[0]), norm(e.t[1])];
      e.nd = e.d ? norm(e.d[0] + ' | ' + e.d[1]) : '';
      e.tw = new Set((e.nt[0] + ' ' + e.nt[1]).split(' ').filter(Boolean));
      // the words that name the page a section sits in ("orcl", "oracle", "gap"…): "oracle capex" asks for that section
      if (parent) e.pw = new Set(norm([parent.t[0], parent.t[1]].concat(parent.id || []).join(' ')).split(' ').filter(function (w) { return w && !STOP[w]; }));
      e.ticks = (e.id || []).filter(function (x) { return /^[A-Z][A-Z0-9*.]{0,7}$/.test(x) && norm(x) !== e.nt[0] && norm(x) !== e.nt[1]; }).slice(0, 3);
    });
    vocab.forEach(function (posts, t) { var s = new Set(); posts.forEach(function (p) { s.add(p >> 4); }); df.set(t, s.size); });
    var words = Array.from(vocab.keys()).sort();
    return { E: E, byUrl: byUrl, vocab: vocab, words: words, idFull: idFull, aliasFull: aliasFull, df: df, N: E.length };
  }

  function loadIndex() {
    if (IX) return Promise.resolve(IX);
    if (loading) return loading;
    loading = new Promise(function (ok, fail) {
      if (window.FNAM_SEARCH_INDEX) { ok(); return; }
      var s = document.createElement('script');
      s.src = '/assets/search-index.js';
      s.async = true;
      s.onload = function () { window.FNAM_SEARCH_INDEX ? ok() : fail(new Error('empty index')); };
      s.onerror = function () { fail(new Error('index not loaded')); };
      document.head.appendChild(s);
    }).then(function () { IX = prepare(window.FNAM_SEARCH_INDEX); return IX; }, function (e) { loading = null; throw e; });
    return loading;
  }

  // ---------- matching ----------
  function lowerBound(arr, t) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < t) lo = m + 1; else hi = m; } return lo; }
  // Damerau-Levenshtein distance, giving up past `max`.
  function dist(a, b, max) {
    var n = a.length, m = b.length;
    if (Math.abs(n - m) > max) return max + 1;
    var prev2 = null, prev = new Array(m + 1), cur;
    for (var j = 0; j <= m; j++) prev[j] = j;
    for (var i = 1; i <= n; i++) {
      cur = new Array(m + 1); cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= m; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v; if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[m];
  }
  function idf(ix, t) { var d = ix.df.get(t) || 1; return Math.max(0.25, Math.log(ix.N / d) / Math.log(ix.N)); }

  // Scores of every entry for one typed word: {entry index: best score}, and how the word matched.
  function scoreWord(ix, q, single) {
    var out = new Map(), field = new Map(), W = weights();
    var credit = function (t, factor) {
      var posts = ix.vocab.get(t); if (!posts) return;
      var rare = idf(ix, t);
      for (var k = 0; k < posts.length; k++) {
        var i = posts[k] >> 4, f = posts[k] & 15;
        if (q.length < 2 && t !== q && !isTitle(f) && f !== F.ID) continue; // one letter: titles and identifiers only
        var s = W[f] * factor * (f === F.KW ? rare : 1);
        if (s > (out.get(i) || 0)) { out.set(i, s); field.set(i, f); }
      }
    };
    var exact = ix.vocab.has(q);
    if (exact) credit(q, 1);
    // prefix: "remes" → "remesas"; shorter completions score closer to an exact match
    var start = lowerBound(ix.words, q), prefixHits = 0;
    for (var w = start; w < ix.words.length && ix.words[w].lastIndexOf(q, 0) === 0; w++) {
      var t = ix.words[w]; if (t === q) continue;
      prefixHits++;
      credit(t, 0.5 + 0.38 * (q.length / t.length));
    }
    // a word that matches nothing is read as a typo of the nearest words ("oracel" → "oracle")
    var fuzzy = false;
    if (!exact && !prefixHits && q.length >= 5) {
      var maxD = q.length >= 8 ? 2 : 1;
      for (var x = 0; x < ix.words.length; x++) {
        var cand = ix.words[x];
        if (Math.abs(cand.length - q.length) > maxD) continue;
        var d = dist(q, cand, maxD);
        if (d <= maxD) { credit(cand, d === 1 ? 0.55 : 0.4); fuzzy = true; }
      }
    }
    return { scores: out, field: field, fuzzy: fuzzy, matched: exact || prefixHits > 0 || fuzzy, single: single };
  }
  function hasWord(set, t) {
    if (!set) return false;
    if (set.has(t)) return true;
    if (t.length < 2) return false;
    var hit = false; set.forEach(function (w) { if (!hit && w.lastIndexOf(t, 0) === 0) hit = true; });
    return hit;
  }

  function search(query) {
    var ix = IX; if (!ix) return { results: [], tokens: [] };
    var qn = norm(query);
    if (!qn) return { results: [], tokens: [] };
    var all = qn.split(' ');
    var tokens = all.filter(function (t) { return !STOP[t]; });
    if (!tokens.length) tokens = all;
    var deckAsked = all.some(function (t) { return DECK_WORDS[t]; });
    var per = tokens.map(function (t) { return scoreWord(ix, t, tokens.length === 1); });
    var compact = qn.replace(/ /g, '');
    var total = new Map(), hits = new Map();
    per.forEach(function (r) { r.scores.forEach(function (s, i) { total.set(i, (total.get(i) || 0) + s); hits.set(i, (hits.get(i) || 0) + 1); }); });
    var need = tokens.length;
    var full = []; hits.forEach(function (n, i) { if (n === need) full.push(i); });
    var partial = false;
    var pool = full;
    if (!pool.length && need > 1) { // nothing matches every word: show what matches the most words
      var best = 0; hits.forEach(function (n) { if (n > best) best = n; });
      if (best > 0) { partial = true; pool = []; hits.forEach(function (n, i) { if (n === best) pool.push(i); }); }
    }
    var ranked = pool.map(function (i) {
      var e = ix.E[i], s = total.get(i);
      // whole-query bonuses: an identifier typed in full (ticker or name), the title itself, the title's start
      if ((ix.idFull.get(compact) || []).indexOf(i) >= 0) s += 1000;
      else if ((ix.aliasFull.get(compact) || []).indexOf(i) >= 0) s += 420;
      else if (compact.length >= 3 && (e.id || []).some(function (x) { return norm(x).replace(/ /g, '').lastIndexOf(compact, 0) === 0; })) s += 220;
      if (qn.length >= 2) {
        // the title itself, its beginning (the reader may still be typing), or the words typed in order inside it
        var cur = lang() === 'en' ? 1 : 0, order = [cur, 1 - cur], cut = function (k, b) { return k === cur ? b : b * 0.66; };
        for (var o = 0; o < 2; o++) {
          var k = order[o], nt = e.nt[k];
          if (nt === qn) { s += cut(k, 200); break; }
          if (nt.lastIndexOf(qn, 0) === 0) { s += cut(k, 90); break; }
          if ((' ' + nt + ' ').indexOf(' ' + qn + ' ') >= 0) { s += cut(k, 45); break; }
        }
        // several words in the order a page's own description uses them ("deuda pública")
        if (tokens.length > 1 && e.nd && (' ' + e.nd).indexOf(' ' + qn) >= 0) s += 40;
      }
      // a section of the page the query names, with the rest of the query in its title: "oracle capex", "gap tráfico"
      if (e.pw && tokens.length > 1) {
        var inPage = 0, inTitle = 0, rest = 0;
        tokens.forEach(function (t) { if (hasWord(e.pw, t)) inPage++; else if (hasWord(e.tw, t)) inTitle++; else rest++; });
        if (inPage && inTitle && !rest) s += 150;
      }
      // pages first, but only when the match is on what names them (title or identifiers), not on a word inside them
      var strong = per.some(function (r) { var f = r.field.get(i); return isTitle(f) || f === F.ID || f === F.ALIAS; });
      if (e.k === 'page' && strong) s += 30; else if (e.k === 'view' && strong) s += 8;
      if (e.k === 'deck' && !deckAsked) s *= 0.55;
      return { e: e, s: s };
    });
    ranked.sort(function (a, b) { return b.s - a.s || a.e.i - b.e.i; });
    return { results: ranked.slice(0, MAX), count: ranked.length, tokens: tokens, partial: partial, fuzzy: per.some(function (r) { return r.fuzzy; }) };
  }

  // ---------- rendering ----------
  // Highlight the typed words where they begin a word of the title (accents and case ignored).
  function highlight(text, tokens) {
    var chars = Array.from(String(text)), n = '', map = [];
    chars.forEach(function (c, idx) { var x = c.normalize('NFD').replace(MARKS, '').toLowerCase(); for (var k = 0; k < x.length; k++) { n += x[k]; map.push(idx); } });
    var on = new Array(chars.length).fill(false);
    tokens.forEach(function (t) {
      if (!t) return;
      for (var p = n.indexOf(t); p >= 0; p = n.indexOf(t, p + 1)) {
        if (p > 0 && /[\p{L}\p{N}]/u.test(n[p - 1])) continue;
        for (var q = p; q < p + t.length && q < map.length; q++) on[map[q]] = true;
      }
    });
    var out = '', inMark = false;
    chars.forEach(function (c, idx) {
      if (on[idx] && !inMark) { out += '<mark>'; inMark = true; }
      if (!on[idx] && inMark) { out += '</mark>'; inMark = false; }
      out += esc(c);
    });
    return out + (inMark ? '</mark>' : '');
  }
  var ICON = {
    page: '<path d="M4 2.5h5.5L13 6v7.5H4z"/><path d="M9.5 2.5V6H13"/>',
    section: '<path d="M6 2.5 4.5 13.5M11.5 2.5 10 13.5M3 6h10.5M2.5 10H13"/>',
    view: '<path d="M2.5 13.5h11"/><path d="M3.5 10.5 6.5 7l2.5 2 4-5"/>',
    deck: '<path d="M4 2.5h5.5L13 6v7.5H4z"/><path d="M6.5 9h4M6.5 11.3h4"/>'
  };
  var KIND = { page: ['Página', 'Page'], section: ['Sección', 'Section'], view: ['Sección', 'Section'], deck: ['PDF', 'PDF'] };
  function href(e) {
    var hash = '', u = e.u, h = u.indexOf('#');
    if (h >= 0) { hash = u.slice(h); u = u.slice(0, h); }
    if (u === '/') return hash || '/'; // a panel of this page: just its anchor
    // every page honors ?lang= (and the site serves it in that language from the first paint)
    return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + lang() + hash;
  }
  function sub(e) {
    var k = lang() === 'en' ? 1 : 0;
    var parts = [];
    if (e.c && e.c[k]) parts.push(e.c[k]);
    if (e.k === 'page' && e.d && e.d[k]) parts.push(e.d[k]);
    if (e.k === 'deck') parts.push(L('se genera al abrir la página', 'built when the page opens'));
    return parts.join(' · ');
  }

  var current = { results: [], active: -1, q: '' };
  function setActive(i) {
    var opts = list.querySelectorAll('[role="option"]');
    if (!opts.length) { current.active = -1; input.removeAttribute('aria-activedescendant'); return; }
    i = (i + opts.length) % opts.length;
    opts.forEach(function (o, k) { o.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    current.active = i;
    input.setAttribute('aria-activedescendant', opts[i].id);
    var o = opts[i], box = list.parentNode;
    if (o.offsetTop < box.scrollTop) box.scrollTop = o.offsetTop - 8;
    else if (o.offsetTop + o.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = o.offsetTop + o.offsetHeight - box.clientHeight + 8;
  }
  var SUGGEST = { es: ['ORCL', 'GAP', 'inflación', 'remesas', 'deuda pública', 'capex', 'Walmart'], en: ['ORCL', 'GAP', 'inflation', 'remittances', 'public debt', 'capex', 'Walmart'] };
  function hint(text) {
    msg.innerHTML = '<p class="sd-hint">' + text + '</p><div class="sd-chips" role="group" aria-label="' + esc(L('Sugerencias', 'Suggestions')) + '">' +
      SUGGEST[lang()].map(function (s) { return '<button type="button" class="sd-chip" data-q="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>';
    msg.hidden = false;
  }
  function render() {
    var q = input.value;
    current.q = q;
    if (!IX) {
      list.innerHTML = ''; input.setAttribute('aria-expanded', 'false');
      msg.innerHTML = '<p class="sd-hint">' + esc(L('Cargando el índice…', 'Loading the index…')) + '</p>'; msg.hidden = false;
      return;
    }
    if (!norm(q)) {
      list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
      hint(esc(L('Busca una página, una sección, una empresa o su ticker, o un indicador.', 'Search for a page, a section, a company or its ticker, or an indicator.')));
      status.textContent = '';
      return;
    }
    var r = search(q);
    current.results = r.results;
    if (!r.results.length) {
      list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
      hint(L('Sin resultados para «', 'No results for “') + '<strong>' + esc(q.trim()) + '</strong>' + L('». Prueba con un ticker, una empresa o un tema:', '”. Try a ticker, a company or a topic:'));
      status.textContent = L('Sin resultados', 'No results');
      return;
    }
    var k = lang() === 'en' ? 1 : 0;
    list.innerHTML = r.results.map(function (x, n) {
      var e = x.e;
      var ticks = (e.ticks || []).map(function (t) { return '<span class="sr-tick">' + esc(t) + '</span>'; }).join('');
      return '<a class="sr" role="option" tabindex="-1" aria-selected="false" id="sr-' + n + '" href="' + esc(href(e)) + '" data-kind="' + e.k + '">' +
        '<span class="sr-ico" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + ICON[e.k] + '</svg></span>' +
        '<span class="sr-main"><span class="sr-title"><span class="sr-t">' + highlight(e.t[k], r.tokens) + '</span>' + ticks + '</span>' +
        '<span class="sr-sub">' + esc(sub(e)) + '</span></span>' +
        '<span class="sr-kind">' + esc(KIND[e.k][k]) + '</span></a>';
    }).join('');
    var note = r.partial ? L('Ninguna página tiene todas las palabras; estas son las más cercanas.', 'No page has every word; these are the closest.') : '';
    msg.innerHTML = note ? '<p class="sd-note">' + esc(note) + '</p>' : '';
    msg.hidden = !note;
    input.setAttribute('aria-expanded', 'true');
    list.parentNode.scrollTop = 0;
    setActive(0);
    status.textContent = r.count === 1 ? L('1 resultado', '1 result') : (r.count > MAX ? L('Más de ' + MAX + ' resultados', 'Over ' + MAX + ' results') : L(r.count + ' resultados', r.count + ' results'));
  }

  function labels() {
    input.placeholder = L('Empresa, ticker, tema o sección', 'Company, ticker, topic or section');
    input.setAttribute('aria-label', L('Buscar en FNAM', 'Search FNAM'));
    list.setAttribute('aria-label', L('Resultados', 'Results'));
  }

  // ---------- open / close / keys ----------
  var lastFocus = null;
  function open(prefill) {
    if (dlg.open) { input.focus(); return; }
    lastFocus = document.activeElement;
    labels();
    if (typeof prefill === 'string') input.value = prefill;
    dlg.showModal();
    root.classList.add('sd-open');
    input.focus(); input.select();
    render();
    loadIndex().then(render, function () {
      msg.innerHTML = '<p class="sd-hint">' + esc(L('No se pudo cargar el índice de búsqueda. Vuelve a intentarlo en un momento.', 'The search index could not be loaded. Try again in a moment.')) + '</p>';
      msg.hidden = false;
    });
  }
  function close() { if (dlg.open) dlg.close(); root.classList.remove('sd-open'); }
  dlg.addEventListener('close', function () {
    root.classList.remove('sd-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });
  openBtn.addEventListener('click', function () { open(); });
  closeBtn.addEventListener('click', close);
  dlg.addEventListener('click', function (ev) { if (ev.target === dlg) close(); }); // the backdrop
  var timer = 0;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 40); });
  input.addEventListener('keydown', function (ev) {
    // Esc closes at once (a search field's own Esc would only clear it first)
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive(current.active + 1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive(current.active - 1); }
    else if (ev.key === 'Enter') {
      clearTimeout(timer);
      if (current.q !== input.value) render();
      var o = list.querySelector('[aria-selected="true"]') || list.querySelector('[role="option"]');
      if (!o) return;
      ev.preventDefault();
      go(o, ev.metaKey || ev.ctrlKey);
    }
  });
  function go(a, newTab) {
    var h = a.getAttribute('href');
    if (newTab) { window.open(h, '_blank', 'noopener'); return; }
    if (h.charAt(0) === '#') { close(); location.hash = h; return; }
    location.assign(h);
  }
  list.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a.sr'); if (!a) return;
    if (a.getAttribute('href').charAt(0) === '#') { ev.preventDefault(); go(a, false); }
  });
  list.addEventListener('mousemove', function (ev) {
    var a = ev.target.closest && ev.target.closest('a.sr'); if (!a) return;
    var opts = Array.prototype.indexOf.call(list.querySelectorAll('[role="option"]'), a);
    if (opts >= 0 && opts !== current.active) setActive(opts);
  });
  msg.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.sd-chip'); if (!b) return;
    input.value = b.getAttribute('data-q'); input.focus(); render();
  });
  // "/" or Ctrl/Cmd+K opens the search from anywhere on the page, unless the reader is typing somewhere.
  document.addEventListener('keydown', function (ev) {
    var t = ev.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((ev.key === 'k' || ev.key === 'K') && (ev.metaKey || ev.ctrlKey) && !ev.altKey) { ev.preventDefault(); open(); return; }
    if (ev.key === '/' && !typing && !ev.metaKey && !ev.ctrlKey && !ev.altKey) { ev.preventDefault(); open(); }
  });
  // The language toggle re-renders the open dialog in the other language.
  new MutationObserver(function () { labels(); if (dlg.open) render(); }).observe(root, { attributes: true, attributeFilter: ['lang'] });
  // Fetch the index once the page is idle, so the first keystroke finds it ready.
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1200); };
  window.addEventListener('load', function () { idle(function () { loadIndex().catch(function () {}); }); });

  // For checks and for the console: FNAM_SEARCH.query('orcl') → [{url, title}]
  window.FNAM_SEARCH = {
    ready: function () { return loadIndex(); },
    query: function (q) { return search(q).results.map(function (x) { return { url: x.e.u, kind: x.e.k, title: x.e.t[lang() === 'en' ? 1 : 0], score: Math.round(x.s) }; }); },
    open: open
  };
})();
