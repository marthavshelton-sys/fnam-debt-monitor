// Data-refresh status for fnam.mx pages. Reads /status/refresh.json, which the site's watchdog writes every 12 hours,
// and exposes the verdict per dashboard. A verdict counts only while the watchdog keeps reporting: a missing file, or one older
// than STALE_HOURS, makes every dashboard "unverified", so nothing is shown as up to date on old evidence.
// The site calls nothing "live" (owner's rule); "Al día / Up to date" is the verified state.
//
//   window.FNAM_STATUS.load()          -> Promise<{ ok, fresh, checkedAt, dashboards: [{ ..., state }] }>
//   window.FNAM_STATUS.when(iso, lang) -> "30-sep-2026 16:48" (Mexico City time)
//   window.FNAM_STATUS.labels[state]   -> { es, en }
//
// Any element with data-status-dot="<dashboard id>" (the dot in each company page's header) gets the class
// is-ok / is-alert / is-late / is-stale / is-unverified and a tooltip in the language on screen; until then the page's
// own CSS keeps it neutral.
//
// Prices (owner's rule, 6-Oct-2026): a dashboard whose price feed is behind the exchange's last completed session is
// "stale": red and pulsing; so is one whose monthly data feed (refresh.json → data, the airport pages' traffic file, added
// 9-Oct-2026) does not carry the month its publisher's calendar requires. The tooltip names the feed that is behind. The watchdog judges every feed from the files in main (refresh.json → prices) and, between its
// checks, this script compares the page's own latest close (OWN_CLOSE, read from the first bytes of the market file) with
// the session the watchdog said comes next and the time from which it is required; the page can turn red on its own,
// never green.
(function () {
  'use strict';
  var STALE_HOURS = 14;   // one 12-hour check interval plus two hours for GitHub's schedule delays
  var MON = {
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  };
  var LABELS = {
    ok: { es: 'Al día', en: 'Up to date' },
    alert: { es: 'Alerta abierta', en: 'Open alert' },
    late: { es: 'Retrasado', en: 'Late' },
    stale: { es: 'Datos desactualizados', en: 'Data out of date' },
    unverified: { es: 'Sin verificar', en: 'Unverified' }
  };
  // red, pulsing: the stale state on the header dots and the landing page's status cards (static red when the reader asks for reduced motion)
  var STALE_CSS = '.eyebrow .live.is-stale,[data-status-dot].is-stale{background:#c0392b;opacity:1;animation:fnam-stale 1.1s ease-in-out infinite}'
    + '.st.stale .st-state{color:var(--st-late,#b42318)}.st.stale .st-state::before{background:var(--st-late,#b42318);animation:fnam-stale 1.1s ease-in-out infinite}'
    + '@keyframes fnam-stale{50%{opacity:.2}}'
    + '@media (prefers-reduced-motion:reduce){.eyebrow .live.is-stale,[data-status-dot].is-stale,.st.stale .st-state::before{animation:none}}';
  try { var styleEl = document.createElement('style'); styleEl.textContent = STALE_CSS; (document.head || document.documentElement).appendChild(styleEl); } catch (e) { /* no document */ }

  function pad(n) { return ('0' + n).slice(-2); }
  function when(iso, lang) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '—';
    var p = {};
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    } catch (e) {
      // No time-zone data in this browser: Mexico City has been UTC-6 all year since 2022.
      var m = new Date(d.getTime() - 6 * 36e5);
      p = { year: String(m.getUTCFullYear()), month: String(m.getUTCMonth() + 1), day: pad(m.getUTCDate()), hour: pad(m.getUTCHours()), minute: pad(m.getUTCMinutes()) };
    }
    return p.day + '-' + MON[lang === 'en' ? 'en' : 'es'][Number(p.month) - 1] + '-' + p.year + ' ' + p.hour + ':' + p.minute;
  }
  // "sep-2026" for a month (a monthly data feed)
  function my(ym, lang) {
    if (!ym || !/^\d{4}-\d{2}/.test(ym)) return '—';
    return MON[lang === 'en' ? 'en' : 'es'][Number(ym.slice(5, 7)) - 1] + '-' + ym.slice(0, 4);
  }
  // "05-oct-2026" for a plain date (a session), no time
  function dmy(iso, lang) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '—';
    return iso.slice(8, 10) + '-' + MON[lang === 'en' ? 'en' : 'es'][Number(iso.slice(5, 7)) - 1] + '-' + iso.slice(0, 4);
  }
  // The first bytes of a data file, fetched once per page with a Range request and shared by every reader below.
  var HEAD = {};
  function head(url, bytes) {
    var key = url + '#' + bytes;
    if (!HEAD[key]) {
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;   // a hung file never holds a verdict back
      HEAD[key] = fetch(url, { cache: 'no-store', headers: { Range: 'bytes=0-' + (bytes - 1) }, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { return t.slice(0, bytes); })
        .catch(function () { return ''; })
        .then(function (t) { if (timer) clearTimeout(timer); return t; });
    }
    return HEAD[key];
  }

  // Each dashboard's own data stamp (the time its last refresh wrote), read from the first bytes of the file that carries it
  // with a Range request, so the landing page shows when the data last changed and not only when the watchdog last looked.
  var STAMPS = {
    'us-macro': { url: '/macro/status.json', re: /"runAt":"([^"]+)"/ },
    'us-fiscal': { url: '/fiscal/data.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'mx-macro': { url: '/mx/macro/index.html', re: /REFRESHED_AT = "([^"]+)"/, bytes: 400000 },
    'mx-fiscal': { url: '/mx/fiscal/data.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'gap': { url: '/gap/data/market.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'oma': { url: '/oma/data/market.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'asur': { url: '/asur/data/market.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'airport-traffic': { url: '/aeropuertos/data/summary.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'airline-traffic': { url: '/aeropuertos/data/airlines-summary.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'qualitas': { url: '/qualitas/data/market.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'gentera': { url: '/gentera/data/market.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'oracle': { url: '/oracle/data/market.js', re: /generatedAt"?\s*:\s*"([^"]+)"/ },
    'hyperscalers': { url: '/hiperescaladores/data/financials.js', re: /"generated"\s*:\s*"([^"]+)"/ }
  };
  function stamp(id) {
    var d = STAMPS[id]; if (!d) return Promise.resolve(null);
    return head(d.url, d.bytes || 1200)
      .then(function (t) { var m = d.re.exec(t); if (!m) return null; var v = m[1]; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + 'T12:00:00Z'; return v; });
  }
  // Each price-checked dashboard's own latest close (the date the page prints), from the first bytes of its market file.
  var OWN_CLOSE = {
    'oracle': { url: '/oracle/data/market.js', re: /latestClose"?\s*:\s*"(\d{4}-\d{2}-\d{2})"/ },
    'gap': { url: '/gap/data/market.js', re: /latestClose"?\s*:\s*"(\d{4}-\d{2}-\d{2})"/ },
    'asur': { url: '/asur/data/market.js', re: /latestClose"?\s*:\s*"(\d{4}-\d{2}-\d{2})"/ },
    'oma': { url: '/oma/data/market.js', re: /latestClose"?\s*:\s*"(\d{4}-\d{2}-\d{2})"/ },
    'qualitas': { url: '/qualitas/data/market.js', re: /latestClose"?\s*:\s*"(\d{4}-\d{2}-\d{2})"/ },
    'gentera': { url: '/gentera/data/market.js', re: /latestClose"?\s*:\s*"(\d{4}-\d{2}-\d{2})"/ }
  };
  function ownClose(id) {
    var d = OWN_CLOSE[id]; if (!d) return Promise.resolve(null);
    return head(d.url, d.bytes || 1200).then(function (t) { var m = d.re.exec(t); return m ? m[1] : null; });
  }
  // The session the page must carry right now: the one the watchdog found required, or the next one once its
  // required-from instant (close + the routine's settle time) has passed.
  function neededSession(p, now) {
    // only a verified verdict names sessions; an 'unverified' one (exchange calendar not maintained) carries none
    if (!p || (p.status !== 'ok' && p.status !== 'stale')) return null;
    if (p.next && p.next.session && p.next.requiredFrom && now >= Date.parse(p.next.requiredFrom)) return p.next.session;
    return p.expected || null;
  }
  // Apply the page-side price check: a dashboard whose own close is behind the needed session turns stale here, before
  // the watchdog's next look; nothing here ever clears a stale verdict the watchdog wrote. A second pass after load():
  // the watchdog's verdict paints first and never waits for this fetch.
  function applyOwnCloses(s) {
    var now = Date.now();
    if (!s || !s.dashboards) return Promise.resolve(s);
    // only for the dashboards this page shows: its own header dot, or every card on the landing page's status grid
    var onLanding = !!document.getElementById('statusGrid');
    var targets = s.dashboards.filter(function (d) { return d.prices && OWN_CLOSE[d.id] && (onLanding || document.querySelector('[data-status-dot="' + d.id + '"]')); });
    if (!targets.length) return Promise.resolve(s);
    return Promise.all(targets.map(function (d) {
      return ownClose(d.id).then(function (close) {
        var need = neededSession(d.prices, now);
        d.ownClose = close;
        d.needed = need;
        if (close && need && close < need) { d.state = 'stale'; d.staleOwn = true; }
      });
    })).then(function () { return s; });
  }
  function stamps(ids) {
    return Promise.all(ids.map(function (id) { return stamp(id).then(function (v) { return [id, v]; }); })).then(function (pairs) { var o = {}; pairs.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
  }

  var pending = null;
  function load() {
    if (pending) return pending;
    pending = fetch('/status/refresh.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) {
        var checked = j && Date.parse(j.checkedAt);
        var fresh = !!(checked && Date.now() - checked < STALE_HOURS * 36e5);
        var list = (j && Array.isArray(j.dashboards)) ? j.dashboards : [];
        list.forEach(function (d) { d.state = fresh && LABELS[d.status] ? d.status : 'unverified'; });
        return { ok: !!j, fresh: fresh, checkedAt: j ? j.checkedAt : null, dashboards: list };
      });
    return pending;
  }

  // "ORCL close 05-oct-2026, session 06-oct-2026 required · " for a stale dashboard: which feed is behind and what it needs.
  function feedName(n, lg) { return n && typeof n === 'object' ? (n[lg] || n.en || n.es || '') : String(n || ''); }
  function staleDetail(d, lg) {
    if (!d || d.state !== 'stale') return '';
    var parts = [];
    // the page's own reading first, then every feed the watchdog found behind (both when both apply)
    if (d.staleOwn) parts.push((lg === 'es' ? 'cierre en la página ' : 'close on the page ') + dmy(d.ownClose, lg) + (lg === 'es' ? ', se requiere la sesión del ' : ', session of ') + dmy(d.needed, lg) + (lg === 'es' ? '' : ' required'));
    if (d.prices && d.prices.series) {
      d.prices.series.filter(function (x) { return x.ok === false; }).forEach(function (x) {
        parts.push(feedName(x.name, lg) + ' ' + (x.date ? dmy(x.date, lg) : (lg === 'es' ? 'sin fecha' : 'no date')) + (lg === 'es' ? ', se requiere ' : ', needs ') + dmy(x.needed, lg));
      });
    }
    // a monthly data feed behind the month its publisher's calendar requires (the airport pages' traffic file)
    if (d.data && d.data.series) {
      d.data.series.filter(function (x) { return x.ok === false; }).forEach(function (x) {
        parts.push(feedName(x.name, lg) + ' ' + (x.month ? my(x.month, lg) : (lg === 'es' ? 'sin mes' : 'no month')) + (lg === 'es' ? ', se requiere ' : ', needs ') + my(x.needed, lg));
      });
    }
    return parts.length ? parts.join(' · ') + ' · ' : '';
  }

  function pageLang() {
    return (document.documentElement.getAttribute('lang') || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  }

  function wireDots() {
    if (!document.querySelector('[data-status-dot]')) return;
    load().then(function (s) {
      function paint() {
        var lg = pageLang();
        // queried at each paint: a page may rebuild its dot (the Oracle phone header is re-rendered on every toggle)
        Array.prototype.forEach.call(document.querySelectorAll('[data-status-dot]'), function (el) {
          var id = el.getAttribute('data-status-dot');
          var d = s.dashboards.filter(function (x) { return x.id === id; })[0] || null;
          var state = d ? d.state : 'unverified';
          el.classList.remove('is-ok', 'is-alert', 'is-late', 'is-stale', 'is-unverified');
          el.classList.add('is-' + state);
          el.setAttribute('data-status-painted', '1');
          // The page's own data time (data-status-time, the stamp its header prints) comes first; the watchdog checks only
          // every 12 hours, so its verdict names the refresh it verified and when it looked.
          var own = el.getAttribute('data-status-time');
          var tail = (own ? (lg === 'es' ? 'datos del ' : 'data of ') + when(own, lg) + ' · ' : '')
            + (d && d.lastSuccess
              ? (lg === 'es' ? 'actualización verificada por el vigilante ' : 'refresh verified by the watchdog ') + when(d.lastSuccess, lg)
                + (s.checkedAt ? (lg === 'es' ? ' (revisión ' : ' (check ') + when(s.checkedAt, lg) + ')' : '')
              : (lg === 'es' ? 'el vigilante no lo ha verificado' : 'not verified by the watchdog')) + ' · CDMX';
          var text = LABELS[state][lg] + ' · ' + staleDetail(d, lg) + tail;
          el.setAttribute('role', 'img');
          el.setAttribute('title', text);
          el.setAttribute('aria-label', text);
        });
      }
      paint();
      applyOwnCloses(s).then(paint);
      // The pages switch language in place, set their data time once their data has rendered, and may rebuild a dot;
      // repaint on each (a dot without data-status-painted is a rebuilt one).
      if (window.MutationObserver) {
        new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            if (muts[i].type === 'attributes' || document.querySelector('[data-status-dot]:not([data-status-painted])')) { paint(); return; }
          }
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-status-time'] });
      }
    });
  }

  window.FNAM_STATUS = { load: load, when: when, dmy: dmy, labels: LABELS, stamps: stamps, ownCloses: applyOwnCloses, staleDetail: staleDetail };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireDots); else wireDots();
})();
