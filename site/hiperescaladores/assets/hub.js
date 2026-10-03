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
  var popEl = null, popRow = null, popBtn = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; flushMO(); } if (popRow) { popRow.classList.remove('src-row'); popRow = null; } if (popBtn) { try { popBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } popBtn = null; } }
  // Placement: below the button when the card fits in the viewport, else above it; when neither fits, a panel docked to
  // the side of the viewport (phones: a bottom sheet). The card scrolls inside itself and never runs off-screen; the
  // row it belongs to is highlighted so the reader keeps track of it.
  function openPop(b, html) {
    closePop();
    popBtn = b;
    popEl = document.createElement('div'); popEl.className = 'pop'; popEl.setAttribute('role', 'dialog'); popEl.setAttribute('tabindex', '-1');
    popEl.innerHTML = '<button type="button" class="x" aria-label="' + t('Cerrar', 'Close') + '">×</button>' + html;
    document.body.appendChild(popEl);
    flushMO();
    popRow = b.closest('tr'); if (popRow) popRow.classList.add('src-row');
    var vw = document.documentElement.clientWidth, vh = window.innerHeight, r = b.getBoundingClientRect();
    if (vw < 700) { popEl.classList.add('sheet'); }
    else {
      var w = popEl.offsetWidth, h = popEl.offsetHeight, below = vh - r.bottom - 12, above = r.top - 12;
      if (h <= below || h <= above) {
        popEl.style.top = (window.scrollY + (h <= below ? r.bottom + 6 : r.top - h - 6)) + 'px';
        popEl.style.left = Math.max(12, Math.min(window.scrollX + r.left - 20, window.scrollX + vw - w - 12)) + 'px';
      } else popEl.classList.add('side');
    }
    popEl.querySelector('.x').addEventListener('click', closePop);
    try { popEl.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  document.addEventListener('click', function (e) {
    var tm = e.target.closest && e.target.closest('abbr.term');
    if (tm) { e.stopPropagation(); var g = GLOSS[tm.getAttribute('data-term')]; if (g) openPop(tm, '<b>' + esc(g.label[LANG]) + '</b><br>' + esc(g.def[LANG]) + '<br><a href="/hiperescaladores/glosario/#' + g.id + '">' + t('Ver en el glosario', 'See the glossary') + ' →</a>'); return; }
    var b = e.target.closest && e.target.closest('.src-btn');
    if (!b) { if (popEl && !popEl.contains(e.target)) closePop(); return; }
    e.stopPropagation();
    var p = provs[+b.getAttribute('data-prov')]; if (!p) return;
    openPop(b, (p.title ? '<b>' + esc(p.title) + '</b><br>' : '') +
      (p.rows || []).filter(function (r) { return r && r[1] != null && r[1] !== ''; }).map(function (r) { return '<span class="muted">' + esc(r[0]) + ':</span> ' + (r[2] ? r[1] : esc(plain(r[1]))); }).join('<br>') +
      (p.url ? '<br><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + t('Abrir la fuente', 'Open the source') + ' ↗</a>' : ''));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePop();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('abbr.term')) { e.preventDefault(); e.target.click(); }
  });

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

  // MW under the company's own definition: "850 MW", "3.1 GW"; qualifier over/approx → "> 850 MW" / "≈ 170 MW"
  function mw(v, q) {
    if (v == null || !isFinite(v)) return nd();
    var s = v >= 1000 ? num(v / 1000, v % 1000 === 0 ? 0 : 1) + ' GW' : num(v, 0) + ' MW';
    return (q === 'over' ? '> ' : q === 'approx' ? '≈ ' : '') + s;
  }
  // filing citation (resolved by build-modules.mjs) → rows for the ⓘ card
  function citeRows(s) {
    if (!s) return [];
    var page = s.page ? s.page : s.pageSeq ? t('sin número impreso (secuencia ', 'no printed number (sequence ') + s.pageSeq + ')' : null;
    var qc = s.quoteCheck === 'page' ? t('cita cotejada contra el texto de la página', 'quote matched against the page text') : s.quoteCheck === 'other_page' ? t('cita hallada en otra página (', 'quote found on another page (') + s.foundOn + ')' : s.quoteCheck ? t('cita no cotejada', 'quote not matched') : null;
    return [[t('Nivel', 'Tier'), s.tier === 'T1' ? 'T1 · SEC' : s.tier === 'T2' ? t('T2 · declaración de la empresa, no auditada', 'T2 · company statement, not audited') : s.tier], [t('Presentación', 'Filing'), s.form ? s.form + ' · ' + s.accn + (s.filed ? ' · ' + t('presentada ', 'filed ') + date(s.filed) : '') : s.title + (s.date && !s.form ? ' · ' + date(s.date) : '')], [t('Sección', 'Section'), s.section], [t('Página', 'Page'), page], s.quote ? [t('Texto', 'Text'), '“' + s.quote + '”'] : null, [t('Cotejo', 'Check'), qc], s.status ? [t('Verificación', 'Verification'), s.status === 'verified' ? t('verificado', 'verified') + (s.verifiedOn ? ' ' + date(s.verifiedOn) : '') + (s.verifiedBy ? ' · ' + s.verifiedBy : '') : t('pendiente de segunda lectura', 'pending second reading')] : null].concat(noUrlRows(s));
  }
  // T2 statements whose document has no public address (licensed call transcripts): say so, and point to the nearest
  // public document (the same-day earnings release on EDGAR), which does not contain the quoted sentence
  function noUrlRows(s) {
    if (!s || s.url || !s.noUrl) return [];
    var r = [[t('Enlace', 'Link'), t('Sin enlace público: transcripción con licencia de la llamada de resultados; no se puede rastrear en línea. La repetición de la llamada está en el sitio de relación con inversionistas de la empresa.', 'No public link: licensed transcript of the earnings call; not traceable online. The call replay is on the company\'s investor-relations site.')]];
    if (s.companion && s.companion.url) r.push([t('Documento público del mismo día', 'Same-day public document'), '<a href="' + esc(s.companion.url) + '" target="_blank" rel="noopener">' + esc(s.companion.title) + '</a> ' + t('(no contiene esta frase)', '(does not contain this sentence)'), true]);
    return r;
  }
  // reader-facing text never shows repository paths (e.g. "(tools/…/notes/)")
  function plain(v) { return String(v == null ? '' : v).replace(/\s*\((?:[^()]*?\s)?(?:tools|scripts|site)\/[^()]*\)/g, '').replace(/\s*(?:tools|scripts)\/[\w./<>-]+/g, ''); }
  function cite(title, s, extra) { return s ? src({ title: title, rows: citeRows(s).concat(extra || []), url: s.url || null }) : ''; }
  function status(st) { return st === 'verified' ? '<span class="flag ok">' + t('verificado', 'verified') + '</span>' : st === 'company_statement' ? '' : flag('review'); }
  // T3/T4 freshness: amber after the publisher's next expected edition + 30 days (computed in the reader's browser)
  function staleT3(next, today) {
    if (!next) return { stale: false };
    var now = today || new Date().toISOString().slice(0, 10);
    var lim = new Date(Date.parse(next + 'T12:00:00Z') + 30 * 864e5).toISOString().slice(0, 10);
    return { stale: now > lim, limit: lim };
  }

  // labels of the MW definitions (tools/hyperscalers/data/capacity.json → definitions)
  function metricLabel(m) {
    var L = { active_power: ['Potencia activa', 'Active power'], critical_it_operating: ['Carga crítica de TI en operación', 'Critical IT load operating'], operating_ai: ['Nube de IA en operación', 'AI cloud operating'], mining_dc: ['Centro de datos para minería', 'Bitcoin-mining data center'], hosting: ['Alojamiento (hosting)', 'Hosting'], billable: ['Potencia facturable', 'Billable power'], delivered: ['MW entregados en el periodo', 'MW delivered in the period'], contracted_power: ['Potencia contratada', 'Contracted power'], contracted_it: ['Carga de TI contratada', 'Contracted IT load'], leased_customer: ['Potencia arrendada a clientes', 'Customer leased power'], undelivered_leased: ['Potencia arrendada por entregar', 'Leased power not yet delivered'], grid_gross: ['Potencia bruta de red', 'Gross grid power'], secured_partners: ['Capacidad asegurada vía socios', 'Capacity secured via partners'], option: ['Opción del cliente', 'Customer option'], dc_development: ['Centro de datos en desarrollo', 'Data center in development'], planned_campus: ['Capacidad planeada del campus', 'Planned campus capacity'] }[m];
    return L ? t(L[0], L[1]) : (m || '');
  }
  function coName(tk, F) { var c = (F || window.HYP_FIN).companies[tk]; return '<span class="sw" style="background:' + color(tk) + '"></span><b>' + esc(c ? c.name : tk) + '</b> <span class="muted small">' + tk + '</span>'; }

  // ---- age of a dated value: older than 12 months (365 days) against today, in the reader's browser. Such a value is
  // shown grayed with its date and a flag, and is never used in a total, a KPI or a takeaway.
  function aged(end, today) {
    if (!end) return false;
    var now = Date.parse((today || new Date().toISOString().slice(0, 10)) + 'T12:00:00Z');
    return now - Date.parse(String(end).slice(0, 10) + 'T12:00:00Z') > 365 * 864e5;
  }
  function agedCell(html, end) {
    if (!aged(end)) return html;
    return '<span class="aged" title="' + esc(t('Dato de hace más de 12 meses: no se usa en totales ni indicadores', 'Value more than 12 months old: not used in totals or indicators')) + '">' + html + '</span> <span class="flag old">' + t('> 12 meses', '> 12 months') + '</span><br><span class="small muted">' + t('al ', 'at ') + date(end) + '</span>';
  }
  // capex / operating cash flow: "n.s." when the flow is zero or negative, or smaller than a fifth of capex (ratio above
  // 500%): the ratio then says more about the denominator than about capex (owner's rule, 2026-10-03)
  var CO_MAX = 5;
  function capexOcf(r) {
    if (r == null || !isFinite(r)) return nm(t('El flujo de operación es cero o negativo', 'Operating cash flow is zero or negative'));
    if (r > CO_MAX) return nm(t('No significativo: el flujo de operación es menor que la quinta parte del capex (razón de ', 'Not meaningful: operating cash flow is less than a fifth of capex (ratio of ') + num(r * 100, 0) + '%)');
    return num(r * 100, 0) + '%';
  }
  // an ISO timestamp (UTC) in US Eastern time: "2026-10-03 11:30 ET"
  function etTime(iso) {
    if (!iso) return '';
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
      var g = function (k) { return (p.find(function (x) { return x.type === k; }) || {}).value; };
      return g('year') + '-' + g('month') + '-' + g('day') + ' ' + g('hour').replace('24', '00') + ':' + g('minute') + ' ET';
    } catch (e) { return String(iso).replace('T', ' ').slice(0, 16) + ' UTC'; }
  }

  // ---- calendarized trailing twelve months for cross-company sums: every company at the same calendar quarter (the
  // latest one all of them have reported). A fiscal quarter counts in the calendar quarter that contains its last month,
  // or the one ending a month later for February/May/August/November closes (Oracle, Applied Digital): those are one
  // month earlier than the window, and the offset is listed. Values more than 12 months old are left out.
  function calTTM(cos, k) {
    var have = cos.map(function (c) { var qs = c.quarters.filter(function (q) { return q.ttm && q.ttm[k] != null && !aged(q.end); }); return qs.length ? qs[qs.length - 1].cal : null; });
    var miss = cos.filter(function (c, i) { return !have[i]; });
    var cal = have.filter(Boolean).sort()[0];
    if (!cal) return null;
    var prevCal = (+cal.slice(0, 4) - 1) + cal.slice(4);
    var calEnd = (function (c) { var y = +c.slice(0, 4), qn = +c.slice(-1); return new Date(Date.UTC(y, qn * 3, 0)).toISOString().slice(0, 10); })(cal);
    var rows = [], total = 0, prev = 0, prevOk = true;
    cos.forEach(function (c) {
      var q = c.quarters.find(function (x) { return x.cal === cal && x.ttm && x.ttm[k] != null; }); if (!q) return;
      var p = c.quarters.find(function (x) { return x.cal === prevCal && x.ttm && x.ttm[k] != null; });
      var off = Math.round((Date.parse(calEnd) - Date.parse(q.end)) / (30.44 * 864e5));
      rows.push({ c: c, q: q, v: q.ttm[k], prev: p ? p.ttm[k] : null, offset: off });
      total += q.ttm[k]; if (p) prev += p.ttm[k]; else prevOk = false;
    });
    return { cal: cal, calEnd: calEnd, rows: rows, total: total, prev: prevOk ? prev : null, missing: miss.map(function (c) { return c.name; }), offsets: rows.filter(function (r) { return r.offset; }) };
  }
  // the ⓘ rows of a calendarized sum: each company, its fiscal quarter and period end
  function calRows(x, fmt) {
    return x.rows.map(function (r) { return [r.c.name, (fmt || money)(r.v).replace(/<[^>]+>/g, '') + ' · ' + fq(r.q.id) + ' · ' + t('cierre ', 'period end ') + date(r.q.end) + (r.offset ? ' (' + t('un mes antes de la ventana', 'one month before the window') + ')' : '')]; });
  }
  function offsetNote(x) {
    return x.offsets.length ? x.offsets.map(function (r) { return r.c.name; }).join(', ') + t(' cierra su trimestre un mes antes (', ' closes its quarter one month earlier (') + x.offsets.map(function (r) { return date(r.q.end); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') + ').' : '';
  }

  // ---- jargon: the first visible use of each term on a page gets a dotted underline; hover shows the definition,
  // click or Enter opens it with a link to the glossary row
  var GLOSS = {
    udm: { id: 'g-udm', re: { es: /\bUDM\b/, en: /\bTTM\b/ }, label: { es: 'UDM (últimos doce meses)', en: 'TTM (trailing twelve months)' }, def: { es: 'Suma de los cuatro trimestres más recientes de la empresa.', en: 'Sum of the company\'s four most recent quarters.' } },
    rpo: { id: 'g-rpo', re: { es: /\bRPO\b/, en: /\bRPO\b/ }, label: { es: 'RPO (obligaciones de desempeño pendientes)', en: 'RPO (remaining performance obligations)' }, def: { es: 'Ingresos ya contratados que la empresa reconocerá en el futuro: demanda, no capacidad ni efectivo cobrado.', en: 'Revenue already contracted that the company will recognize in the future: demand, not capacity or cash collected.' } },
    vie: { id: 'g-vie', re: { es: /\bEIV\b/, en: /\bVIEs?\b/ }, label: { es: 'EIV (entidad de interés variable)', en: 'VIE (variable interest entity)' }, def: { es: 'Vehículo cuyo control no depende de los votos; lo consolida quien dirige sus decisiones clave y absorbe sus resultados.', en: 'A vehicle whose control does not depend on votes; whoever directs its key decisions and absorbs its results consolidates it.' } },
    spv: { id: 'g-spv', re: { es: /\bSPVs?\b/, en: /\bSPVs?\b/ }, label: { es: 'SPV (vehículo de propósito específico)', en: 'SPV (special-purpose vehicle)' }, def: { es: 'Sociedad creada para un proyecto, con deuda propia, a menudo sin recurso contra la empresa.', en: 'An entity created for one project, with its own debt, often non-recourse to the company.' } },
    xbrl: { id: 'g-xbrl', re: { es: /\bXBRL\b/, en: /\bXBRL\b/ }, label: { es: 'XBRL', en: 'XBRL' }, def: { es: 'Etiquetas con que las empresas marcan cada cifra de sus estados financieros ante la SEC; permiten leerlas automáticamente.', en: 'Tags companies attach to each figure of their SEC financial statements, so they can be read automatically.' } },
    tiers: { id: 'g-tiers', re: { es: /\bT[1-4](?![\s\u00a0]*\d{4})(?:[–-]T[1-4])?\b/, en: /\bT[1-4](?:[–-]T[1-4])?\b/ }, label: { es: 'Niveles de fuente T1–T4', en: 'Source tiers T1–T4' }, def: { es: 'T1 = presentación ante la SEC; T2 = material de la empresa, no auditado; T3 = regulador u operador de red; T4 = estimación de terceros. Nunca se mezclan en una cifra.', en: 'T1 = SEC filing; T2 = company material, not audited; T3 = regulator or grid operator; T4 = third-party estimate. Never mixed within one figure.' } }
  };
  var GLOSS_SCOPE = 'header .lede, .sec-desc, .kpi .lbl, .kpi .sub, .wtk li, .card .cap, .callout';
  function glossify() {
    var seen = {};
    document.querySelectorAll('abbr.term').forEach(function (a) { if (!a.closest('[hidden]')) seen[a.getAttribute('data-term')] = 1; });
    var nodes = [];
    document.querySelectorAll(GLOSS_SCOPE).forEach(function (el) {
      if (el.closest('[hidden]') || el.closest('.pop')) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var pe = n.parentElement; return !pe || pe.closest('a, abbr, button, .tier, .flag, script, style, [hidden]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
      var n; while ((n = w.nextNode())) nodes.push(n);
    });
    Object.keys(GLOSS).forEach(function (k) {
      if (seen[k]) return;
      var re = GLOSS[k].re[LANG];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i], m = re.exec(n.nodeValue);
        if (!m) continue;
        var after = n.splitText(m.index); after.splitText(m[0].length);
        var ab = document.createElement('abbr'); ab.className = 'term'; ab.setAttribute('data-term', k); ab.setAttribute('tabindex', '0'); ab.title = GLOSS[k].def[LANG]; ab.textContent = m[0];
        after.parentNode.replaceChild(ab, after);
        nodes[i] = ab.nextSibling && ab.nextSibling.nodeType === 3 ? ab.nextSibling : n;
        seen[k] = 1; break;
      }
    });
    flushMO();
  }

  // ---- sortable tables: every column heading of a data table sorts its rows (click or Enter; again to reverse).
  // Group rows (core six / neoclouds) stay in place and rows sort within their group; a detail row spanning the table
  // travels with the row above it. Totals stay last. The order survives re-renders (language, filters).
  var SORT = {};
  var MONTHS = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
  function sortKey(td) {
    if (!td) return null;
    if (td.hasAttribute('data-sort')) { var ds = td.getAttribute('data-sort'); return ds === '' ? null : isNaN(+ds) ? ds.toLowerCase() : +ds; }
    var c = td.cloneNode(true); c.querySelectorAll('.src-btn, .flag, .tier, .small, br').forEach(function (x) { x.replaceWith(' '); });
    var s = (c.textContent || '').replace(/\s+/g, ' ').trim();
    if (!s || /^(no divulgad|not disclosed|sin etiqueta|not tagged|n\.s\.|n\.m\.|pendiente|pending|no revelad|n\.d\.)/i.test(s)) return null;
    var d = /^(\d{1,2}) ([a-z]{3}) (\d{4})/i.exec(s) || /^()([a-z]{3}) (\d{4})$/i.exec(s);
    if (d && MONTHS[d[2].toLowerCase()]) return +d[3] * 1e4 + MONTHS[d[2].toLowerCase()] * 100 + (+d[1] || 0);
    var fy = /^(?:AF|FY)(\d{4}) (?:T|Q)(\d)/.exec(s); if (fy) return +fy[1] * 1e4 + +fy[2] * 100;
    var m = /(-?)\s?([\d,]+(?:\.\d+)?)/.exec(s.replace(/[−–](?=\s?\d)/, '-'));
    if (!m || /^[A-Za-zÁÉÍÓÚáéíóúñ]{3,}/.test(s.replace(/^(US\$|≈|>|<|\+)\s?/, ''))) return s.toLowerCase();
    var v = parseFloat(m[2].replace(/,/g, '')) * (m[1] ? -1 : 1);
    if (/mil M|\bbn\b/.test(s)) v *= 1e9; else if (/\d\s?M\b/.test(s)) v *= 1e6; else if (/\bGW\b/.test(s)) v *= 1000;
    return v;
  }
  function colIndex(th) { var i = 0, x = th; while ((x = x.previousElementSibling)) i += x.colSpan || 1; return i; }
  function cellAt(tr, idx) { var i = 0; for (var k = 0; k < tr.cells.length; k++) { if (i === idx) return tr.cells[k]; i += tr.cells[k].colSpan || 1; } return null; }
  function tableKey(tbl) { var h = tbl.closest('[id]'); return (h ? h.id : '') + ':' + Array.prototype.indexOf.call(document.querySelectorAll('main table'), tbl); }
  function sortTable(tbl, idx, dir) {
    var tb = tbl.tBodies[0]; if (!tb) return;
    var ncol = 0; Array.prototype.forEach.call(tbl.tHead.rows[tbl.tHead.rows.length - 1].cells, function (c) { ncol += c.colSpan || 1; });
    var groups = [[]], units = null;
    Array.prototype.forEach.call(tb.rows, function (tr) {
      var span = tr.cells.length === 1 && (tr.cells[0].colSpan || 1) >= ncol - 1;
      if (tr.classList.contains('grp')) { groups.push({ head: tr }); groups.push([]); return; }
      var g = groups[groups.length - 1];
      if (span && g.length) { g[g.length - 1].rows.push(tr); return; }
      g.push({ rows: [tr], total: tr.classList.contains('total'), k: sortKey(cellAt(tr, idx)), i: g.length });
    });
    groups.forEach(function (g) {
      if (!Array.isArray(g)) { tb.appendChild(g.head); return; }
      var body = g.filter(function (u) { return !u.total; }), tot = g.filter(function (u) { return u.total; });
      body.sort(function (a, b) {
        if (a.k == null && b.k == null) return a.i - b.i; if (a.k == null) return 1; if (b.k == null) return -1;
        var r = typeof a.k === 'number' && typeof b.k === 'number' ? a.k - b.k : String(a.k).localeCompare(String(b.k), loc());
        return (r || a.i - b.i) * (typeof a.k === 'number' && typeof b.k === 'number' ? dir : dir);
      });
      body.concat(tot).forEach(function (u) { u.rows.forEach(function (r) { tb.appendChild(r); }); });
    });
  }
  var busy = false;
  function decorate() {
    if (busy) return; busy = true;
    try {
      document.querySelectorAll('main .tblwrap table').forEach(function (tbl) {
        if (!tbl.tHead || !tbl.tBodies[0] || tbl.closest('[data-nosort]') || tbl.tBodies[0].rows.length < 3) return;
        var hr = tbl.tHead.rows[tbl.tHead.rows.length - 1], key = tableKey(tbl);
        Array.prototype.forEach.call(hr.cells, function (th) {
          if (th.classList.contains('sortable')) return;
          th.classList.add('sortable'); th.tabIndex = 0; th.setAttribute('aria-sort', 'none');
          th.title = t('Ordenar por esta columna', 'Sort by this column');
        });
        var st = SORT[key];
        if (st && !tbl.dataset.sorted) {
          var th = Array.prototype.find.call(hr.cells, function (c) { return colIndex(c) === st.idx; });
          if (th) { sortTable(tbl, st.idx, st.dir); th.setAttribute('aria-sort', st.dir > 0 ? 'ascending' : 'descending'); }
        }
        tbl.dataset.sorted = '1';
      });
      document.querySelectorAll('[data-keycols]').forEach(keyCols);
    } finally { busy = false; flushMO(); }
  }
  // our own DOM changes (sorting, toggles, glossary marks) must not wake the observer that watches for re-renders
  var MO = null;
  function flushMO() { if (MO) MO.takeRecords(); }
  function onSort(th) {
    var tbl = th.closest('table'), idx = colIndex(th), key = tableKey(tbl);
    var cur = SORT[key], dir = cur && cur.idx === idx ? -cur.dir : (th.classList.contains('l') || idx === 0 ? 1 : -1);
    SORT[key] = { idx: idx, dir: dir };
    busy = true;
    try {
      sortTable(tbl, idx, dir);
      Array.prototype.forEach.call(th.parentNode.cells, function (c) { c.setAttribute('aria-sort', 'none'); });
      th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
    } finally { busy = false; flushMO(); }
  }
  document.addEventListener('click', function (e) { var th = e.target.closest && e.target.closest('th.sortable'); if (th && !e.target.closest('.src-btn, a')) onSort(th); });
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('th.sortable')) { e.preventDefault(); onSort(e.target); } });

  // ---- "key columns" view: a container with data-keycols="0,1,4" gets a toggle above its table that hides the other
  // columns (the choice is remembered per table in this browser)
  function keyCols(box) {
    var tbl = box.querySelector('table'); if (!tbl || !tbl.tHead) return;
    var keys = box.getAttribute('data-keycols').split(',').map(Number), id = box.id, on = true;
    try { on = localStorage.getItem('hyp-keycols-' + id) !== 'all'; } catch (e) { /* storage blocked */ }
    var bar = box.previousElementSibling;
    if (!bar || !bar.classList.contains('keybar')) { bar = document.createElement('div'); bar.className = 'keybar controls'; box.parentNode.insertBefore(bar, box); }
    bar.innerHTML = '<span class="ctl-lbl">' + t('Columnas', 'Columns') + '</span><div class="seg"><button type="button" data-k="key"' + (on ? ' class="active"' : '') + '>' + t('Clave', 'Key') + '</button><button type="button" data-k="all"' + (on ? '' : ' class="active"') + '>' + t('Todas', 'All') + '</button></div>';
    bar.querySelectorAll('button').forEach(function (b) { b.onclick = function () { try { localStorage.setItem('hyp-keycols-' + id, b.getAttribute('data-k')); } catch (e) { /* ignore */ } keyCols(box); flushMO(); }; });
    var ncol = 0; Array.prototype.forEach.call(tbl.tHead.rows[tbl.tHead.rows.length - 1].cells, function (c) { ncol += c.colSpan || 1; });
    Array.prototype.forEach.call(tbl.rows, function (tr) {
      if (tr.cells.length === 1 && (tr.cells[0].colSpan || 1) >= ncol - 1) return;
      var i = 0;
      Array.prototype.forEach.call(tr.cells, function (c) { c.classList.toggle('kc-hide', on && keys.indexOf(i) < 0 && (c.colSpan || 1) === 1); i += c.colSpan || 1; });
    });
  }

  function applyLang() {
    document.querySelectorAll('.es').forEach(function (e) { e.hidden = LANG !== 'es'; });
    document.querySelectorAll('.en').forEach(function (e) { e.hidden = LANG !== 'en'; });
    document.documentElement.lang = LANG === 'es' ? 'es-MX' : 'en';
    var b = document.body; if (b && b.dataset['title' + (LANG === 'es' ? 'Es' : 'En')]) document.title = b.dataset['title' + (LANG === 'es' ? 'Es' : 'En')];
    var es = document.getElementById('btnLangEs'), en = document.getElementById('btnLangEn');
    if (es) es.classList.toggle('active', LANG === 'es'); if (en) en.classList.toggle('active', LANG === 'en');
    provs = []; closePop();
    listeners.forEach(function (fn) { try { fn(LANG); } catch (e) { console.error(e); } });
    try { glossify(); decorate(); } catch (e) { console.error(e); }
  }
  // modules re-render tables on filter changes: decorate them again (sort order and key-column choice persist)
  var moTimer = null;
  if (window.MutationObserver) (MO = new MutationObserver(function () { if (busy) return; clearTimeout(moTimer); moTimer = setTimeout(function () { try { decorate(); glossify(); } catch (e) { console.error(e); } }, 30); })).observe(document.documentElement, { childList: true, subtree: true });
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
    edgar: edgar, tier: tier, flag: flag, src: src, stamp: stamp, stale: stale, axisMoney: axisMoney, chartDefaults: chartDefaults,
    mw: mw, metricLabel: metricLabel, coName: coName, cite: cite, citeRows: citeRows, noUrlRows: noUrlRows, plain: plain, status: status, staleT3: staleT3,
    aged: aged, agedCell: agedCell, capexOcf: capexOcf, CO_MAX: CO_MAX, calTTM: calTTM, calRows: calRows, offsetNote: offsetNote, etTime: etTime, glossify: glossify
  };
})();
