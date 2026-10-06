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
// is-ok / is-alert / is-late / is-unverified and a tooltip in the language on screen; until then the page's
// own CSS keeps it neutral.
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
    unverified: { es: 'Sin verificar', en: 'Unverified' }
  };

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
    return fetch(d.url, { cache: 'no-store', headers: { Range: 'bytes=0-' + ((d.bytes || 1200) - 1) } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { var m = d.re.exec(t.slice(0, d.bytes || 1200)); if (!m) return null; var v = m[1]; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + 'T12:00:00Z'; return v; })
      .catch(function () { return null; });
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

  function pageLang() {
    return (document.documentElement.getAttribute('lang') || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  }

  function wireDots() {
    var dots = document.querySelectorAll('[data-status-dot]');
    if (!dots.length) return;
    load().then(function (s) {
      function paint() {
        var lg = pageLang();
        Array.prototype.forEach.call(dots, function (el) {
          var id = el.getAttribute('data-status-dot');
          var d = s.dashboards.filter(function (x) { return x.id === id; })[0] || null;
          var state = d ? d.state : 'unverified';
          el.classList.remove('is-ok', 'is-alert', 'is-late', 'is-unverified');
          el.classList.add('is-' + state);
          // The page's own data time (data-status-time, the stamp its header prints) comes first; the watchdog checks only
          // every 12 hours, so its verdict names the refresh it verified and when it looked.
          var own = el.getAttribute('data-status-time');
          var tail = (own ? (lg === 'es' ? 'datos del ' : 'data of ') + when(own, lg) + ' · ' : '')
            + (d && d.lastSuccess
              ? (lg === 'es' ? 'actualización verificada por el vigilante ' : 'refresh verified by the watchdog ') + when(d.lastSuccess, lg)
                + (s.checkedAt ? (lg === 'es' ? ' (revisión ' : ' (check ') + when(s.checkedAt, lg) + ')' : '')
              : (lg === 'es' ? 'el vigilante no lo ha verificado' : 'not verified by the watchdog')) + ' · CDMX';
          var text = LABELS[state][lg] + ' · ' + tail;
          el.setAttribute('role', 'img');
          el.setAttribute('title', text);
          el.setAttribute('aria-label', text);
        });
      }
      paint();
      // The pages switch language in place, and set their data time once their data has rendered; repaint on both.
      if (window.MutationObserver) {
        new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        Array.prototype.forEach.call(dots, function (el) { new MutationObserver(paint).observe(el, { attributes: true, attributeFilter: ['data-status-time'] }); });
      }
    });
  }

  window.FNAM_STATUS = { load: load, when: when, labels: LABELS, stamps: stamps };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireDots); else wireDots();
})();
