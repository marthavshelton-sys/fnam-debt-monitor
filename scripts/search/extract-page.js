// In-page extractor for the site search index. Runs inside each rendered page (headless Chromium, one language at a time)
// and returns what a reader can find there: the page's title, its sections (every h2 with the anchor that reaches it),
// the macro dashboards' ?view= sections, the cards and footer links that describe other pages, the landing page's
// PDF links, and the page's full visible text (used only to validate the curated aliases; never shipped).
//
// Language: the pages mark their copy as .es / .en (hidden by attribute or by CSS) or translate it in place; text in
// the other language is skipped, so every string returned is in the language the page was opened in.
// eslint-disable-next-line no-unused-vars
function extractPage(cfg) {
  const LANG = cfg.lang === 'en' ? 'en' : 'es';
  const OTHER = LANG === 'en' ? 'es' : 'en';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'svg', 'CANVAS', 'SELECT', 'OPTION', 'TEXTAREA', 'INPUT', 'BUTTON', 'IFRAME', 'DIALOG']);
  const INLINE = new Set(['SPAN', 'A', 'B', 'STRONG', 'EM', 'I', 'SMALL', 'SUP', 'SUB', 'ABBR', 'CODE', 'TIME', 'MARK', 'U', 'S', 'Q', 'CITE', 'DFN', 'KBD', 'SAMP', 'VAR', 'BDI', 'BDO', 'DATA', 'LABEL']);
  const skipEl = (el) => el.hidden || SKIP_TAGS.has(el.tagName) || el.classList.contains(OTHER) || el.getAttribute('aria-hidden') === 'true';
  const clean = (s) => String(s || '').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
  // pad: also separate inline elements, for keywords: a table cell such as <span>Walmart</span> <span>WMT</span><span>Q2
  // FY2027</span> must give the word "WMT", not "WMTQ2". Displayed titles keep the page's own spacing.
  function rawText(node, pad) {
    let out = '';
    for (const c of node.childNodes) {
      if (c.nodeType === 3) out += c.nodeValue;
      else if (c.nodeType === 1) {
        if (c.tagName === 'BR') { out += ' '; continue; }
        if (skipEl(c)) continue;
        const t = rawText(c, pad);
        out += INLINE.has(c.tagName) && !pad ? t : ' ' + t + ' ';
      }
    }
    return out;
  }
  const text = (el, pad) => (el ? clean(rawText(el, pad)) : '');
  // shown: not removed from the page by an ancestor (hidden attribute, the other language, display:none), up to `root`.
  function shown(el, root) {
    for (let p = el; p && p !== root && p !== document.documentElement; p = p.parentElement) {
      if (p.hidden || p.classList.contains(OTHER)) return false;
      if (getComputedStyle(p).display === 'none') return false;
    }
    return true;
  }
  // present: part of the page for a reader who opens it, even if folded away for now (a collapsed section, an inactive
  // tab, a closed <details>): only the hidden attribute and the other language take content out.
  function present(el, root) {
    for (let p = el; p && p !== root && p !== document.documentElement; p = p.parentElement) {
      if (p.hidden || p.classList.contains(OTHER)) return false;
    }
    return true;
  }
  // Labels worth matching: letters, not a period stamp. Digit-bearing tokens are dropped from keyword strings, so a label
  // such as "Sources and uses of cash, FY2027–FY2030" keeps "Sources and uses of cash" and data refreshes do not churn it.
  function label(s, max) {
    s = clean(s);
    if (!s) return '';
    s = s.split(' ').filter((w) => !/\d/.test(w)).join(' ').replace(/^[\s,;:·.–—\-()]+|[\s,;:·–—\-(]+$/g, '').trim();
    const letters = (s.match(/\p{L}/gu) || []).length;
    if (letters < 3) return '';
    return s.length > (max || 90) ? s.slice(0, max || 90).replace(/\s+\S*$/, '') : s;
  }
  const meta = (n) => { const m = document.querySelector(`meta[name="${n}"]`); return m ? clean(m.getAttribute('content')) : ''; };
  const path = (href) => {
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return null;
      u.searchParams.delete('lang');
      const q = u.searchParams.toString();
      return u.pathname + (q ? '?' + q : '') + (u.hash || '');
    } catch (e) { return null; }
  };

  const out = { path: location.pathname, lang: document.documentElement.getAttribute('lang') || '', title: clean(document.title), desc: meta('description'), h1: '', sections: [], views: [], cards: [], links: [], decks: [], text: '' };
  if (meta('fnam-search') === 'exclude') { out.exclude = true; return out; }
  const h1 = Array.from(document.querySelectorAll('h1')).find((h) => shown(h) && text(h));
  out.h1 = h1 ? text(h1) : '';

  // Words from a block of the page: sub-headings, table headers and row labels, captions and definition terms.
  function keywords(root) {
    const seen = new Set(); const list = [];
    const add = (s) => { const t = label(s); const k = t.toLowerCase(); if (t && !seen.has(k)) { seen.add(k); list.push(t); } };
    for (const el of root.querySelectorAll('h2, h3, h4, caption, figcaption, th, dt, td:first-child, [data-search-label]')) {
      if (list.length >= 400) break;
      if (el.closest('nav, header, footer, button, dialog')) continue;
      if (!present(el, root)) continue;
      add(text(el, true));
    }
    // The choices of a selector (an airport, an airline, a company) are what a reader picks there.
    for (const sel of root.querySelectorAll('select')) {
      if (sel.closest('nav, header, footer, dialog') || !present(sel, root)) continue;
      for (const o of sel.options) { if (list.length >= 400) break; add(o.label || o.textContent); }
    }
    return list;
  }

  // In-page navigation (the jump bars of the models and dashboards): its labels are the readers' short names for sections.
  const navLabel = new Map();
  for (const a of document.querySelectorAll('nav a[href^="#"]')) {
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || id === 'main' || navLabel.has(id)) continue;
    const t = label(text(a), 60);
    if (t) navLabel.set(id, t);
  }

  // Sections: every visible h2 outside the page chrome, keyed by the anchor that reaches it (a jump-bar target, else
  // the closest section with an id, else the heading's own id). Macro dashboards are read through their rail instead.
  const rail = document.getElementById('rail');
  if (!rail) {
    const byId = new Map();
    for (const h of document.querySelectorAll('h2')) {
      if (h.closest('header, footer, nav, dialog, .topbar')) continue;
      if (!shown(h)) continue;
      let anchor = null; let sec = null;
      for (let p = h; p && p !== document.body; p = p.parentElement) {
        if (p.id && navLabel.has(p.id)) { anchor = p; break; }
        if (!sec && p.id && p.tagName === 'SECTION') sec = p;
      }
      anchor = anchor || sec || (h.id ? h : null);
      if (!anchor || anchor.id === 'main') continue;
      const title = text(h) || navLabel.get(anchor.id) || '';
      if (!title) continue;
      if (byId.has(anchor.id)) { byId.get(anchor.id).extra.push(title); continue; }
      byId.set(anchor.id, { id: anchor.id, title, nav: navLabel.get(anchor.id) || '', extra: [], el: anchor });
    }
    for (const s of byId.values()) {
      const kw = keywords(s.el).filter((k) => k !== s.title);
      out.sections.push({ id: s.id, title: s.title, nav: s.nav, kw: s.extra.concat(kw).slice(0, 400), hasCards: !!s.el.querySelector('a.card') });
    }
  } else {
    // Macro dashboards: one section per rail item (?view=<id>), grouped under the rail's group labels.
    let group = '';
    for (const el of rail.children) {
      if (el.classList.contains('rail-group-label')) { group = text(el); continue; }
      if (!el.matches('.rail-item[data-view]')) continue;
      const id = el.getAttribute('data-view');
      const view = document.getElementById('view-' + id);
      out.views.push({ id, title: text(el), group, kw: view ? keywords(view) : [] });
    }
  }

  // Cards and links that describe other pages: the cards of the landing page and the hubs (a.card, a.tile, or an
  // article.tile whose name links to the page), and the short names in footers and module bars.
  for (const a of document.querySelectorAll('a[href]')) {
    const p = path(a.getAttribute('href'));
    if (!p || p.indexOf('present=') >= 0 || p.split(/[?#]/)[0] === location.pathname && p.indexOf('?') < 0) continue;
    if (!shown(a)) continue;
    if (a.closest('header, footer, nav, .decks')) {
      if (a.closest('footer, nav')) { const t = text(a); if (t && t.length <= 60) out.links.push({ href: p, text: t }); }
      continue;
    }
    const box = a.matches('a.card, a.tile') ? a : a.closest('article.tile');
    if (!box) continue;
    const h = box.querySelector('h3, h2, .tile-name, .title');
    const title = h ? text(h) : text(a);
    if (!title) continue;
    const kicker = box.querySelector('.kicker, .k, .tile-tick, .eyebrow');
    const ps = Array.from(box.querySelectorAll('p')).map(text).filter(Boolean);
    const sec = box.closest('section'); const sh = sec && sec.querySelector('h2');
    out.cards.push({ href: p, title, kicker: kicker ? text(kicker) : '', desc: ps[0] || '', name: a !== box ? text(a) : '', group: sh ? text(sh) : '' });
  }
  // The landing page's board presentations: one PDF per model, built in the reader's language on arrival.
  for (const a of document.querySelectorAll('.decks a[data-base]')) {
    out.decks.push({ base: a.getAttribute('data-base'), text: text(a), label: text(document.querySelector('.decks .decks-label')) });
  }
  out.text = text(document.body, true);
  return out;
}
