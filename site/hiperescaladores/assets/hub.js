// Hyperscaler Hub — shared page helpers (language, formatting, provenance, stamps, staleness, chart defaults).
// Every page under /hiperescaladores/ loads this after its data files and before its own app script.
//
//   HUB.lang / HUB.t(es, en) / HUB.onLang(fn)       language (?lang= wins, then the saved choice, then Spanish)
//   HUB.money(usd) / HUB.pct(r) / HUB.mult(x)        figures; null → "Not disclosed" (never a dash)
//   HUB.tier('T1'|'T2'|'T3'|'T4'|'C'|'FS')           source-tier badge
//   HUB.src({ title, rows: [[k, v]], url })          ⓘ button that opens the figure's source card
//   HUB.stamp({ asOf, sources, csv, tier, note })    as-of + last refreshed (ET) + source link under every chart/table
//   HUB.stale(company)                               T1 staleness against today's date, computed in the reader's browser
(function () {
  'use strict';
  var COLORS = {
    light: { MSFT: '#2a78d6', GOOGL: '#eb6834', AMZN: '#1baf7a', META: '#eda100', ORCL: '#e87ba4', CRWV: '#008300', NBIS: '#4a3aa7', IREN: '#e34948', APLD: '#00989a', CORZ: '#a8780f' },
    dark: { MSFT: '#3987e5', GOOGL: '#d95f2b', AMZN: '#1baf7a', META: '#bb8000', ORCL: '#d0628c', CRWV: '#2a9d2a', NBIS: '#7d6fe0', IREN: '#e34948', APLD: '#00989a', CORZ: '#b8861a' }
  };
  var MON = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  var LANG = 'es';
  try { var saved = localStorage.getItem('hyp-lang'); if (saved === 'en' || saved === 'es') LANG = saved; } catch (e) { /* storage blocked */ }
  var q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'es') LANG = q;
  var listeners = [];
  var provs = [];

  function t(es, en) { return LANG === 'es' ? es : en; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loc() { return LANG === 'es' ? 'es-MX' : 'en-US'; }
  function isDark() { var r = document.documentElement.getAttribute('data-theme'); return r === 'dark' || (r !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
  function color(tk) { return (isDark() ? COLORS.dark : COLORS.light)[tk] || '#888'; }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  function nd(why) { return '<span class="nd" title="' + esc(why || '') + '">' + t('No divulgado', 'Not disclosed') + '</span>'; }
  // "Not tagged": absent from the XBRL feed. Kept apart from "Not disclosed", which is reserved for an item searched in
  // the filing text and confirmed absent.
  function nt(why) { return '<span class="nd" title="' + esc(why || t('La empresa no etiqueta esta cifra con un concepto XBRL estándar para este periodo; puede estar solo en el texto de la presentación', 'The company does not tag this figure with a standard XBRL concept for this period; it may be in the filing text only')) + '">' + t('Sin etiqueta XBRL', 'Not tagged') + '</span>'; }
  function nm(why) { return '<span class="nd" title="' + esc(why || '') + '">' + t('n.s.', 'n.m.') + '</span>'; }
  function num(v, d) { return v.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
  // US$ figures: billions with one decimal ("US$ 12.3 mil M" / "US$ 12.3 bn"), millions below US$1bn
  function money(usd, d, opts) {
    if (usd == null || !isFinite(usd)) return (opts && opts.blank) ? '' : nd(opts && opts.why);
    var a = Math.abs(usd);
    var s = a >= 1e9 ? num(usd / 1e9, d == null ? 1 : d) + (LANG === 'es' ? ' mil M' : ' bn') : num(usd / 1e6, 0) + ' M';
    return (usd < 0 ? '<span class="neg">' : '') + 'US$ ' + s + (usd < 0 ? '</span>' : '');
  }
  function moneyM(m, d) { return m == null ? nd() : money(m * 1e6, d); }
  function pct(r, d) { return r == null || !isFinite(r) ? nm(t('El denominador es cero o negativo', 'Denominator is zero or negative')) : num(r * 100, d == null ? 0 : d) + '%'; }
  function mult(x, d) { return x == null || !isFinite(x) ? nm(t('EBITDA o intereses no positivos, o un insumo no divulgado', 'EBITDA or interest not positive, or an input not disclosed')) : num(x, d == null ? 1 : d) + 'x'; }
  function date(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(iso));
    if (!m) return String(iso);
    return (m[3] ? (+m[3]) + ' ' : '') + MON[LANG][+m[2] - 1] + ' ' + m[1];
  }
  // "FY2026Q4" → "AF2026 T4" / "FY2026 Q4"; "2026-Q2" → "T2 2026" / "Q2 2026"
  function fq(id) { var m = /^FY(\d{4})Q(\d)$/.exec(id || ''); return m ? (LANG === 'es' ? 'AF' + m[1] + ' T' + m[2] : 'FY' + m[1] + ' Q' + m[2]) : (id || ''); }
  function cq(id) { var m = /^(\d{4})-Q(\d)$/.exec(id || ''); return m ? (LANG === 'es' ? 'T' + m[2] + ' ' + m[1] : 'Q' + m[2] + ' ' + m[1]) : (id || ''); }
  function edgar(cik, accn) { return 'https://www.sec.gov/Archives/edgar/data/' + Number(cik) + '/' + String(accn).replace(/-/g, '') + '/' + accn + '-index.htm'; }

  var TIER = {
    T1: { es: 'T1 · SEC', en: 'T1 · SEC', tip: { es: 'Presentación ante la SEC (10-K, 10-Q, 8-K, 424B) vía EDGAR', en: 'SEC filing (10-K, 10-Q, 8-K, 424B) via EDGAR' } },
    T2: { es: 'T2 · empresa', en: 'T2 · company', tip: { es: 'Material de la empresa: declaración de la empresa, no auditada', en: 'Company-issued material: company statement, not audited' } },
    T3: { es: 'T3 · regulador', en: 'T3 · regulator', tip: { es: 'Regulador u operador de red', en: 'Regulator or grid operator' } },
    T4: { es: 'T4 · estimación', en: 'T4 · estimate', tip: { es: 'Estimación de terceros; nunca se mezcla con cifras de las empresas', en: 'Third-party estimate; never blended into company figures' } },
    C: { es: 'Cálculo FNAM', en: 'FNAM calc.', tip: { es: 'Calculado por FNAM a partir de cifras T1; el método está en la ficha de la cifra', en: 'Computed by FNAM from T1 figures; the method is in the figure\'s source card' } },
    FS: { es: 'FactSet', en: 'FactSet', tip: { es: 'Instantánea fechada de FactSet (agregación de presentaciones); no es T1 hasta cotejarse con el 424B/8-K', en: 'Dated FactSet snapshot (aggregated from filings); not T1 until matched to the 424B/8-K' } }
  };
  function tier(k) { var x = TIER[k] || TIER.C; return '<span class="tier ' + k + '" title="' + esc(x.tip[LANG]) + '">' + x[LANG] + '</span>'; }
  function flag(kind) {
    var m = { review: [t('revisar', 'needs review'), ''], stale: [t('desactualizado', 'stale'), 'stale'], ok: [t('cotejado', 'matched'), 'ok'], mixed: [t('etiqueta mixta', 'mixed tag'), ''] }[kind];
    return m ? '<span class="flag ' + m[1] + '">' + m[0] + '</span>' : '';
  }

  // provenance card: a small ⓘ button; the card opens on click (keyboard reachable), closes on Esc / outside click
  function src(p) { provs.push(p); return '<button type="button" class="src-btn" data-prov="' + (provs.length - 1) + '" aria-label="' + t('Fuente', 'Source') + '">ⓘ</button>'; }
  var popEl = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.src-btn');
    if (!b) { if (popEl && !popEl.contains(e.target)) closePop(); return; }
    e.stopPropagation(); closePop();
    var p = provs[+b.getAttribute('data-prov')]; if (!p) return;
    popEl = document.createElement('div'); popEl.className = 'pop'; popEl.setAttribute('role', 'dialog');
    popEl.innerHTML = '<button type="button" class="x" aria-label="' + t('Cerrar', 'Close') + '">×</button>' + (p.title ? '<b>' + esc(p.title) + '</b><br>' : '') +
      (p.rows || []).filter(function (r) { return r && r[1] != null && r[1] !== ''; }).map(function (r) { return '<span class="muted">' + esc(r[0]) + ':</span> ' + (r[2] ? r[1] : esc(r[1])); }).join('<br>') +
      (p.url ? '<br><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + t('Abrir la fuente', 'Open the source') + ' ↗</a>' : '');
    document.body.appendChild(popEl);
    var r = b.getBoundingClientRect(), w = popEl.offsetWidth;
    popEl.style.top = (window.scrollY + r.bottom + 6) + 'px';
    popEl.style.left = Math.max(12, Math.min(window.scrollX + r.left - 20, window.scrollX + document.documentElement.clientWidth - w - 12)) + 'px';
    popEl.querySelector('.x').addEventListener('click', closePop);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

  // as-of + last refreshed + sources + CSV, under every chart and table
  function stamp(o) {
    var F = window.HYP_FIN || {};
    var parts = [];
    if (o.tier) parts.push(tier(o.tier));
    if (o.asOf) parts.push('<span><b>' + t('Al cierre de', 'As of') + '</b> ' + esc(o.asOf) + '</span>');
    parts.push('<span><b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(o.refreshed || F.refreshedET || '') + '</span>');
    if (o.sources && o.sources.length) parts.push('<span>' + t('Fuente', 'Source') + ': ' + o.sources.map(function (s) { return s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a>' : esc(s.label); }).join(' · ') + '</span>');
    if (o.note) parts.push('<span>' + o.note + '</span>');
    if (o.csv) parts.push('<a class="csv" href="' + esc(o.csv) + '" download>CSV ↓</a>');
    return '<div class="stamp">' + parts.join('') + '</div>';
  }

  // T1 staleness: past the next expected filing date (SEC deadline for the filer category) + 7 days
  function stale(c, today) {
    if (!c || !c.nextFilingDue) return { stale: false };
    var now = today || new Date().toISOString().slice(0, 10);
    var lim = new Date(Date.parse(c.nextFilingDue + 'T12:00:00Z') + 7 * 864e5).toISOString().slice(0, 10);
    return { stale: now > lim, limit: lim, due: c.nextFilingDue };
  }

  function chartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = css('--sans') || 'Inter, system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = css('--text-secondary');
    Chart.defaults.borderColor = css('--grid');
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = isDark() ? '#2a2a28' : '#ffffff';
    Chart.defaults.plugins.tooltip.titleColor = css('--text-primary');
    Chart.defaults.plugins.tooltip.bodyColor = css('--text-secondary');
    Chart.defaults.plugins.tooltip.borderColor = css('--border-strong');
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.maintainAspectRatio = false;
  }
  function axisMoney(v) { return 'US$ ' + num(v, Math.abs(v) < 10 && v !== 0 ? 1 : 0) + (LANG === 'es' ? ' mil M' : ' bn'); }

  function applyLang() {
    document.querySelectorAll('.es').forEach(function (e) { e.hidden = LANG !== 'es'; });
    document.querySelectorAll('.en').forEach(function (e) { e.hidden = LANG !== 'en'; });
    document.documentElement.lang = LANG === 'es' ? 'es-MX' : 'en';
    var b = document.body; if (b && b.dataset['title' + (LANG === 'es' ? 'Es' : 'En')]) document.title = b.dataset['title' + (LANG === 'es' ? 'Es' : 'En')];
    var es = document.getElementById('btnLangEs'), en = document.getElementById('btnLangEn');
    if (es) es.classList.toggle('active', LANG === 'es'); if (en) en.classList.toggle('active', LANG === 'en');
    provs = []; closePop();
    listeners.forEach(function (fn) { try { fn(LANG); } catch (e) { console.error(e); } });
  }
  function setLang(l) {
    LANG = l; try { localStorage.setItem('hyp-lang', l); } catch (e) { /* ignore */ }
    var u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u);
    applyLang();
  }
  document.addEventListener('DOMContentLoaded', function () {
    var es = document.getElementById('btnLangEs'), en = document.getElementById('btnLangEn');
    if (es) es.addEventListener('click', function () { setLang('es'); });
    if (en) en.addEventListener('click', function () { setLang('en'); });
    chartDefaults();
    applyLang();
    if (window.FNAM_STATUS && window.FNAM_STATUS.load) window.FNAM_STATUS.load();
  });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { chartDefaults(); applyLang(); });

  window.HUB = {
    get lang() { return LANG; }, t: t, esc: esc, onLang: function (fn) { listeners.push(fn); },
    color: color, css: css, isDark: isDark, nd: nd, nt: nt, nm: nm, num: num, money: money, moneyM: moneyM, pct: pct, mult: mult, date: date, fq: fq, cq: cq,
    edgar: edgar, tier: tier, flag: flag, src: src, stamp: stamp, stale: stale, axisMoney: axisMoney, chartDefaults: chartDefaults
  };
})();
