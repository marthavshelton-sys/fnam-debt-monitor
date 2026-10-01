// Data-refresh status for fnam.mx pages. Reads /status/refresh.json, which the watchdog (every 12 hours,
// .github/workflows/data-watchdog.yml; runbook tools/watchdog/README.md) writes, and exposes the verdict
// per dashboard. A verdict counts only while the watchdog keeps reporting: a missing file, or one older
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
          var tail = d && d.lastSuccess
            ? (lg === 'es' ? 'última actualización exitosa ' : 'last successful refresh ') + when(d.lastSuccess, lg) + ' (CDMX)'
            : (lg === 'es' ? 'el vigilante no lo ha verificado' : 'not verified by the watchdog');
          var text = LABELS[state][lg] + ' · ' + tail;
          el.setAttribute('role', 'img');
          el.setAttribute('title', text);
          el.setAttribute('aria-label', text);
        });
      }
      paint();
      // The pages switch language in place; keep the tooltip in the language on screen.
      if (window.MutationObserver) new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    });
  }

  window.FNAM_STATUS = { load: load, when: when, labels: LABELS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireDots); else wireDots();
})();
