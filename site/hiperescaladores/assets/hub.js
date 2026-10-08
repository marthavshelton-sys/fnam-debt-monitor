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
  try { var saved = localStorage.getItem('fnam-lang') || localStorage.getItem('hyp-lang'); if (saved === 'en' || saved === 'es') LANG = saved; } catch (e) { /* storage blocked */ }
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
  // compact mark (the per-page data-quality line explains it; the full reason is on hover and in the cell's title)
  function nt(why) { var w = t('Sin etiqueta XBRL: ', 'Not tagged: ') + (why || t('la empresa no etiqueta esta cifra con un concepto XBRL estándar para este periodo; puede estar solo en el texto de la presentación', 'the company does not tag this figure with a standard XBRL concept for this period; it may be in the filing text only')); return '<span class="nd nt" title="' + esc(w) + '" aria-label="' + esc(w) + '">' + t('s.e.', 'n.t.') + '</span>'; }
  function nm(why) { return '<span class="nd" title="' + esc(why || '') + '">' + t('n.s.', 'n.m.') + '</span>'; }
  function num(v, d) { return v.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
  // US$ figures: always billions, one unit on every page (owner's review, 2026-10-04): one decimal from US$1bn, two
  // below it, three below US$10m ("US$ 12.3 bn", "US$ 0.85 bn", "US$ 0.003 bn"; ES "mil M")
  function money(usd, d, opts) {
    if (usd == null || !isFinite(usd)) return (opts && opts.blank) ? '' : nd(opts && opts.why);
    var a = Math.abs(usd);
    var dd = d != null ? d : a >= 1e9 ? 1 : a >= 1e7 ? 2 : a === 0 ? 0 : 3;
    var s = num(usd / 1e9, dd) + (LANG === 'es' ? ' mil M' : ' bn');
    return (usd < 0 ? '<span class="neg">' : '') + 'US$ ' + s + (usd < 0 ? '</span>' : '');
  }
  function moneyM(m, d) { return m == null ? nd() : money(m * 1e6, d); }
  function pct(r, d) { return r == null || !isFinite(r) ? nm(t('El denominador es cero o negativo', 'Denominator is zero or negative')) : num(r * 100, d == null ? 0 : d) + '%'; }
  function mult(x, d) { return x == null || !isFinite(x) ? nm(t('EBITDA o intereses no positivos, o un insumo no divulgado', 'EBITDA or interest not positive, or an input not disclosed')) : num(x, d == null ? 1 : d) + 'x'; }
  function date(iso) {
    if (!iso) return '';
    if (/^\d{4}-\d{2}-\d{2}T/.test(String(iso))) return etDate(iso);   // an instant: its ET calendar date, never the UTC day
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
    T4R: { es: 'T4 · terceros', en: 'T4 · third party', tip: { es: 'Opinión de un tercero (acción de una calificadora, según nota de prensa fechada); nunca se mezcla con cifras de las empresas', en: 'Third-party opinion (a rating agency action, per a dated press report); never blended into company figures' } },
    // a rating action known only through the press (the agency's own page or an SEC filing was not available): secondary source
    T4S: { es: 'T4 · fuente secundaria', en: 'T4 · secondary source', tip: { es: 'Acción de una calificadora conocida por una nota de prensa fechada, no por la página de la agencia ni por una presentación ante la SEC; nunca se mezcla con cifras de las empresas', en: 'Rating action known from a dated press report, not from the agency\'s own page or an SEC filing; never blended into company figures' } },
    // a company statement whose document has no public address (licensed earnings-call transcript)
    T2N: { es: 'T2 · declaración de la empresa, sin enlace público', en: 'T2 · company statement, no public link', tip: { es: 'Declaración de la empresa en su llamada de resultados (transcripción con licencia): no auditada y sin documento público que enlazar', en: 'Company statement on its earnings call (licensed transcript): not audited and no public document to link' } },
    FS: { es: 'FactSet', en: 'FactSet', tip: { es: 'Instantánea fechada de FactSet (agregación de presentaciones); no es T1 hasta cotejarse con el 424B/8-K', en: 'Dated FactSet snapshot (aggregated from filings); not T1 until matched to the 424B/8-K' } }
  };
  function tier(k) { var x = TIER[k] || TIER.C; return '<span class="tier ' + (k === 'T4R' || k === 'T4S' ? 'T4' : k === 'T2N' ? 'T2' : k) + '" title="' + esc(x.tip[LANG]) + '">' + x[LANG] + '</span>'; }
  // the verification method, stated wherever a figure is called "verified" (owner's third review, 2026-10-03): the checks
  // are an automated quote-match against the harvested filing page plus a second automated read; an analyst's sign-off is
  // a separate field (reviewedBy) and is shown apart. No tool name is ever printed.
  var VERIF = { es: 'cotejo automático de la cita más una segunda lectura automática; sin revisión de analista', en: 'automated quote-match plus a second automated read; not analyst-reviewed' };
  function verifText(reviewedBy) { return reviewedBy ? t('revisado por analista: ', 'analyst-reviewed: ') + esc(reviewedBy) : t(VERIF.es, VERIF.en); }
  // "needs review" and "mixed tag" are no longer printed in every cell: a small dot marks the cell (shaded by decorate()),
  // the reason is on hover, and the page's data-quality line counts them. Stale and age flags stay visible.
  function flag(kind, why) {
    if (kind === 'review' || kind === 'mixed') {
      var w = (kind === 'review' ? t('Por revisar', 'Needs review') : t('Etiqueta mixta', 'Mixed tag')) + (why ? ': ' + why : kind === 'review' ? t(': falla un control de identidad o de valores atípicos, o espera la segunda lectura automática; detalle en la ficha ⓘ y en la lista de calidad de esta página', ': fails an identity or outlier check, or awaits the automated second read; detail in the ⓘ card and in this page\'s data-quality list') : t(': un trimestre usa otra etiqueta XBRL que el resto de su año', ': one quarter uses a different XBRL tag from the rest of its year'));
      return '<span class="rvw ' + kind + '" title="' + esc(w) + '" aria-label="' + esc(w) + '"></span>';
    }
    var m = { stale: [t('desactualizado', 'stale'), 'stale'], ok: [t('cotejado', 'matched'), 'ok'], sec: [t('fuente secundaria', 'secondary source'), 'sec'] }[kind];
    return m ? '<span class="flag ' + m[1] + '"' + (kind === 'sec' ? ' title="' + esc(t('Acción de la agencia conocida por una nota de prensa; la página de la agencia y las presentaciones ante la SEC no la publican', 'Agency action known from a press report; neither the agency\'s page nor an SEC filing publishes it')) + '"' : '') + '>' + m[0] + '</span>' : '';
  }
  // an explained gap: the cell has no XBRL value and the curated file not-tagged.json says why
  // (none: the line does not exist for this company; text: the figure is in the filing text and shown from it; fy_only:
  // tagged only in the annual report; custom_tag: a company-specific tag the SEC API does not serve; not_disclosed:
  // searched and absent). The cell is not counted as "not tagged" in the data-quality line; the reason is on hover and in ⓘ.
  var NTR = { none: ['no aplica', 'n/a'], text: ['texto', 'text'], fy_only: ['solo anual', 'annual only'], ytd_only: ['solo acumulado', 'YTD only'], last_tagged: ['última etiqueta', 'last tagged'], custom_tag: ['etiqueta propia', 'custom tag'], not_disclosed: ['No divulgado', 'Not disclosed'], unknown: ['s.e.', 'n.t.'] };
  var NTS = { none: ['no aplica: la partida no existe para esta empresa', 'not applicable: the line does not exist for this company'], text: ['cifra leída del texto de la presentación (sin etiqueta XBRL estándar)', 'figure read from the filing text (no standard XBRL tag)'], fy_only: ['etiquetada solo en el informe anual', 'tagged only in the annual report'], ytd_only: ['etiquetada solo como acumulado del año (el trimestre se deriva o falta)', 'tagged only year-to-date (the quarter is derived or missing)'], last_tagged: ['la empresa dejó de etiquetar el concepto: se muestra el último valor con su fecha', 'the company stopped tagging the concept: the latest value is shown with its date'], custom_tag: ['la empresa usa una etiqueta propia que la API de la SEC no publica', 'the company uses a custom tag the SEC API does not serve'], not_disclosed: ['buscado en la presentación y ausente', 'searched in the filing and absent'], unknown: ['sin etiqueta XBRL; motivo no resuelto', 'not tagged in XBRL; reason not resolved'] };
  function ntReason(tk, metric) { var F = window.HYP_FIN; var L = (F && F.notTagged) || []; for (var i = 0; i < L.length; i++) if (L[i].ticker === tk && L[i].metric === metric) return L[i]; return null; }
  // how a gap's explanation was established (check, from build.mjs): a quote matched on the cited page; a derivation from
  // tagged facts; or an XBRL concept check / EDGAR full-text search alone, which the pages call "tag-checked", never "verified"
  function ntCheck(r) { return r.check === 'quote' ? t('cita cotejada en la página citada de la presentación', 'quote matched on the cited filing page') : r.check === 'derived' ? t('derivado de hechos etiquetados y de líneas del estado de flujos (método abajo); cálculo FNAM', 'derived from tagged facts and cash-flow statement lines (method below); FNAM calculation') : r.check === 'quote_unmatched' ? t('la cita no está en la página citada del texto cosechado: por revisar', 'the quote is not on the cited page of the harvested text: needs review') : t('control de concepto XBRL o búsqueda de texto completo en EDGAR: etiqueta cotejada, no verificado', 'XBRL concept check or EDGAR full-text search: tag-checked, not verified'); }
  // not-tagged cell with its reason when one is recorded, else the plain "n.t." mark; a text figure prints its amount; a
  // derived trailing-twelve-month figure prints in TTM cells only (opts.ttm) with its method in the ⓘ card
  function ntCell(tk, metric, opts) {
    var r = ntReason(tk, metric);
    if (!r) return nt(opts && opts.why);
    var lb = NTR[r.result] || NTR.unknown, lab = t(lb[0], lb[1]), note = r['note_' + LANG] || r.note_en || '', st = NTS[r.result] || NTS.unknown;
    var d = r.derived && opts && opts.ttm ? r.derived : null;
    var rows = [[t('Situación', 'Status'), t(st[0], st[1])], [t('Motivo', 'Reason'), note], [t('Cómo se estableció', 'How it was established'), ntCheck(r)]];
    if (r.evidence) rows.push([t('Evidencia', 'Evidence'), r.evidence[LANG] || r.evidence.en || r.evidence]);
    if (d) {
      rows.push([t('Derivación (cálculo FNAM)', 'Derivation (FNAM calculation)'), d['method_' + LANG] || d.method_en]);
      rows.push([t('Insumos', 'Inputs'), (d.inputs || []).map(function (x) { return x.period + ': ' + (x.amountUSDm != null ? money(x.amountUSDm * 1e6).replace(/<[^>]+>/g, '') : '') + ' (' + x.tag + ' · ' + x.accn + ')'; }).join(' · ')]);
      if ((d.zeroPeriods || []).length) rows.push([t('Periodos leídos como cero', 'Periods read as zero'), d.zeroPeriods.map(function (z) { return z.period + ' (' + z.accn + '): ' + (z['why_' + LANG] || z.why_en); }).join(' · ')]);
    }
    rows = rows.concat(citeRows(r.src));
    if (!r.src && r.accn) rows.push([t('Presentación', 'Filing'), (r.form || '') + ' · ' + r.accn]);
    var card = src({ title: (window.HYP_FIN && window.HYP_FIN.companies[tk] ? window.HYP_FIN.companies[tk].name : tk) + ' · ' + ((window.HYP_FIN && window.HYP_FIN.defs[metric]) ? window.HYP_FIN.defs[metric][LANG] : metric), rows: rows, url: (r.src && r.src.url) || (r.url || null) });
    if (d) return '<span class="ntx-val">' + money(d.amountUSDm * 1e6) + '</span>' + card + '<span class="nd nx small" title="' + esc(d['method_' + LANG] || d.method_en) + '">' + t('derivado', 'derived') + ' · ' + esc(d.period) + '</span>';
    if (r.result === 'text' && r.amountUSDm != null) return '<span class="ntx-val">' + money(r.amountUSDm * 1e6) + '</span>' + card + '<span class="nd nx small" title="' + esc(note) + '">' + lab + (r.asOf ? ' · ' + date(r.asOf) : '') + '</span>';
    if ((r.result === 'fy_only' || r.result === 'ytd_only' || r.result === 'last_tagged') && r.amountUSDm != null) return '<span class="ntx-val">' + money(r.amountUSDm * 1e6) + '</span>' + card + '<span class="nd nx small" title="' + esc(note) + '">' + lab + (r.period ? ' · ' + esc(r.period) : '') + '</span>';
    return '<span class="nd nx" title="' + esc(note) + '" aria-label="' + esc(note) + '">' + lab + '</span>' + card;
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
    if (b.closest('summary')) e.preventDefault();   // a ⓘ inside a <summary> opens its card without toggling the expander
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
    parts.push('<span><b>' + t('Datos reconstruidos', 'Data rebuilt') + '</b> ' + esc(o.refreshed || F.refreshedET || '') + '</span>');
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

  // capacity under the company's own definition, always in GW (one unit on every page): "0.85 GW", "3.1 GW", "0.04 GW";
  // qualifier over/approx → "> 0.85 GW" / "≈ 0.17 GW". The quoted filing text in the source card keeps the company's MW.
  function mw(v, q) {
    if (v == null || !isFinite(v)) return nd();
    var g = v / 1000, dd = g >= 10 ? 1 : g >= 1 ? 2 : 3;
    var s = num(g, dd).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1') + ' GW';
    return (q === 'over' ? '> ' : q === 'approx' ? '≈ ' : '') + s;
  }
  // the as-of date of a filing item: a month the filing states only as a month ("As of February 2026") prints as a month
  function itemDate(x) { if (!x || !x.asOf) return ''; var d = new Date(x.asOf + 'T12:00:00Z'), day = d.getUTCDate(); return x.src && x.src.quote && !new RegExp('\\b' + day + ',\\s*' + d.getUTCFullYear()).test(x.src.quote) && /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/.test(x.src.quote) ? date(x.asOf.slice(0, 7)) : date(x.asOf); }
  // filing citation (resolved by build-modules.mjs) → rows for the ⓘ card
  function citeRows(s) {
    if (!s) return [];
    var page = s.page ? s.page : s.pageSeq ? t('sin número impreso (secuencia ', 'no printed number (sequence ') + s.pageSeq + ')' : null;
    var qc = s.quoteCheck === 'page' ? t('cita cotejada contra el texto de la página', 'quote matched against the page text') : s.quoteCheck === 'other_page' ? t('cita hallada en otra página (', 'quote found on another page (') + s.foundOn + ')' : s.quoteCheck ? t('cita no cotejada', 'quote not matched') : null;
    return [[t('Nivel', 'Tier'), s.tier === 'T1' ? 'T1 · SEC' : s.tier === 'T2' ? (s.noUrl ? t('T2 · declaración de la empresa, sin enlace público', 'T2 · company statement, no public link') : t('T2 · declaración de la empresa, no auditada', 'T2 · company statement, not audited')) : s.tier], [t('Presentación', 'Filing'), s.form ? s.form + ' · ' + s.accn + (s.filed ? ' · ' + t('presentada ', 'filed ') + date(s.filed) : '') : s.title + (s.date && !s.form ? ' · ' + date(s.date) : '')], [t('Sección', 'Section'), s.section], [t('Página', 'Page'), page], s.quote ? [t('Texto', 'Text'), '“' + s.quote + '”'] : null, [t('Cotejo', 'Check'), qc], s.status ? [t('Verificación', 'Verification'), s.status === 'verified' ? t('verificado ', 'verified ') + (s.verifiedOn ? date(s.verifiedOn) + ' · ' : '') + t(VERIF.es, VERIF.en) : t('pendiente de la segunda lectura automática', 'pending the automated second read')] : null, s.status ? [t('Revisión de analista', 'Analyst review'), s.reviewedBy ? esc(s.reviewedBy) + (s.reviewedOn ? ' · ' + date(s.reviewedOn) : '') : t('ninguna', 'none')] : null].concat(noUrlRows(s));
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
  function status(st, reviewedBy) { return st === 'verified' ? '<span class="vchk' + (reviewedBy ? ' an' : '') + '" title="' + esc(t('Verificado: ', 'Verified: ') + verifText(reviewedBy)) + '">✓</span>' : st === 'company_statement' ? '' : flag('review', t('cifra leída del texto, pendiente de la segunda lectura automática de la página citada', 'figure read from the text, pending the automated second read of the cited page')); }
  // a curated item counts as verified only with stored evidence: its quote matched on the cited harvested page (quoteCheck
  // "page", on the item or its citation). A term sheet read twice has no harvested text to match and keeps its status.
  function quoteOk(i) { var s = i.src || null, qc = s && s.quoteCheck != null ? s.quoteCheck : i.quoteCheck; if (qc != null) return qc === 'page'; return !s && !i.filing; }
  // "verified N of M (method) · K tag-checked · analyst-reviewed R of M" for a list of curated items (status / check / reviewedBy)
  function verifSummary(items) {
    var n = items.length, v = items.filter(function (i) { return i.status === 'verified' && i.check !== 'xbrl_concept' && quoteOk(i); }).length, tg = items.filter(function (i) { return i.status === 'verified' && i.check === 'xbrl_concept'; }).length, r = items.filter(function (i) { return i.reviewedBy; }).length;
    return '<span class="vsum" title="' + esc(t('Verificado = ', 'Verified = ') + VERIF[LANG] + t('; solo cuenta con la cita cotejada en la página citada. Etiqueta cotejada = control de concepto XBRL o búsqueda de texto completo, sin cita. Revisado por analista = firma de una persona en el campo reviewedBy.', '; counted only with the quote matched on the cited page. Tag-checked = an XBRL concept check or full-text search, no quote. Analyst-reviewed = a person\'s sign-off in the reviewedBy field.')) + '">' + t(v + ' de ' + n + ' verificadas (' + VERIF.es + ')' + (tg ? ' · ' + tg + ' con etiqueta cotejada, no verificadas' : '') + ' · revisadas por analista: ' + r + ' de ' + n, v + ' of ' + n + ' verified (' + VERIF.en + ')' + (tg ? ' · ' + tg + ' tag-checked, not verified' : '') + ' · analyst-reviewed: ' + r + ' of ' + n) + '</span>';
  }
  // header fields every page shares, kept apart: the build time (one stamp per rebuild) and the last successful EDGAR poll
  function buildRow() {
    var F = window.HYP_FIN || {}, S = window.HYP_STATUS || {};
    var poll = S.lastEdgarSuccessET || (S.lastEdgarSuccess ? etTime(S.lastEdgarSuccess) : '');
    return '<span><b>' + t('Datos reconstruidos', 'Data rebuilt') + '</b> ' + esc(S.refreshedET || F.refreshedET || '') + '</span>' + (poll ? '<span><b>' + t('Última consulta a EDGAR', 'Last EDGAR poll') + '</b> ' + esc(poll) + '</span>' : '');
  }
  // older than two quarters: more than two calendar quarter-ends have passed since the value's date (computed in the browser)
  function oldQ(end, today) {
    if (!end) return false;
    var d = new Date(String(end).slice(0, 10) + 'T12:00:00Z'), now = new Date((today || new Date().toISOString().slice(0, 10)) + 'T12:00:00Z');
    var m = d.getUTCMonth(), q = new Date(Date.UTC(d.getUTCFullYear(), m - (m % 3) + 3, 0)), n = 0;
    if (q <= d) q = new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth() + 4, 0));
    while (q <= now && n < 40) { n++; q = new Date(Date.UTC(q.getUTCFullYear(), q.getUTCMonth() + 4, 0)); }
    return n > 2;
  }
  function oldFlag(end) { return oldQ(end) && !aged(end) ? ' <span class="flag old2" title="' + esc(t('Dato de hace más de dos trimestres; se revisa si hay una presentación más reciente (la ficha dice cuál se buscó)', 'Value more than two quarters old; newer filings are checked (the card says which were searched)')) + '">' + t('> 2 trim.', '> 2 qtrs') + '</span>' : ''; }
  // committed ÷ operating multiple: when the operating figure is a rounded "approximately" number the filing itself rounds,
  // the quotient is an order of magnitude ("more than 10x") with the note, never a decimal
  function capMult(b, a) {
    var r = b.mw / a.mw;
    if (a.qualifier === 'approx' && a.rounded_en) { var fl = r >= 10 ? Math.floor(r / 10) * 10 : Math.floor(r); return { r: r, text: t('más de ' + num(fl, 0) + ' veces', 'more than ' + num(fl, 0) + 'x'), short: '> ' + num(fl, 0) + 'x', note: a['rounded_' + LANG] || a.rounded_en, approx: true }; }
    var ap = !!(a.qualifier || b.qualifier);
    return { r: r, text: (ap ? '≈ ' : '') + num(r, 1) + (LANG === 'es' ? ' veces' : 'x'), short: (ap ? '≈ ' : '') + num(r, 1) + 'x', note: ap ? t('cifras «más de» / «aprox.» en la presentación: el múltiplo es aproximado', '"over" / "approx." figures in the filing: the multiple is approximate') : null, approx: ap };
  }
  // leases signed but not commenced against recognized payments: within ±5% of 1.0x the two are "about equal", not "exceed"
  function leaseCmp(r) { return r > 1.05 ? 'above' : r < 0.95 ? 'below' : 'equal'; }
  function leaseCmpText(r) { var k = leaseCmp(r); return k === 'equal' ? t('casi iguales', 'about equal') : k === 'above' ? t('superan', 'exceed') : t('no alcanzan', 'fall short of'); }
  function narrow() { return window.innerWidth < 640; }
  // T3/T4 freshness: amber after the publisher's next expected edition + 30 days (computed in the reader's browser)
  function staleT3(next, today) {
    if (!next) return { stale: false };
    var now = today || new Date().toISOString().slice(0, 10);
    var lim = new Date(Date.parse(next + 'T12:00:00Z') + 30 * 864e5).toISOString().slice(0, 10);
    return { stale: now > lim, limit: lim };
  }

  // labels of the MW definitions (capacity.json → definitions)
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
    if (!aged(end)) return html + oldFlag(end);
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
  // the ET calendar date of an ISO timestamp (UTC), printed like other dates ("3 Oct 2026"); never the UTC date
  function etDate(iso) { if (!iso) return ''; var s = etTime(iso); return /ET$/.test(s) ? date(s.slice(0, 10)) : date(String(iso).slice(0, 10)); }
  // the date a curated file was last edited: its updatedAt timestamp in ET when present, else its stated date
  function curatedDate(o) { return o ? (o.updatedAt ? etDate(o.updatedAt) : date(o.updated)) : ''; }

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
    tiers: { id: 'g-tiers', re: { es: /\bT[1-4](?![\s\u00a0]*\d{4})(?:[–-]T[1-4])?\b/, en: /\bT[1-4](?:[–-]T[1-4])?\b/ }, label: { es: 'Niveles de fuente T1–T4', en: 'Source tiers T1–T4' }, def: { es: 'T1 = presentación ante la SEC; T2 = material de la empresa, no auditado; T3 = regulador u operador de red; T4 = estimación de terceros. Nunca se mezclan en una cifra.', en: 'T1 = SEC filing; T2 = company material, not audited; T3 = regulator or grid operator; T4 = third-party estimate. Never mixed within one figure.' } },
    // jargon expanded on first use per page (owner's third review): OCF, D&A, EBITDA, bp and "n.m."
    ocf: { id: 'g-ocf', re: { es: /\bFEO\b/, en: /\bOCF\b/ }, label: { es: 'FEO (flujo de efectivo de operación)', en: 'OCF (operating cash flow)' }, def: { es: 'Efectivo que genera la operación en el periodo, antes de inversiones y financiamiento (estado de flujos de efectivo).', en: 'Cash the operations generate in the period, before investing and financing (cash-flow statement).' } },
    da: { id: 'g-da', re: { es: /\bD&A\b/, en: /\bD&A\b/ }, label: { es: 'D&A (depreciación y amortización)', en: 'D&A (depreciation and amortization)' }, def: { es: 'Cargo contable que reparte el costo de los activos (servidores, edificios, intangibles) a lo largo de su vida útil; no es una salida de efectivo del periodo.', en: 'The accounting charge that spreads the cost of assets (servers, buildings, intangibles) over their useful lives; not a cash outflow of the period.' } },
    ebitda: { id: 'g-ebitda', re: { es: /\bEBITDA\b/, en: /\bEBITDA\b/ }, label: { es: 'EBITDA', en: 'EBITDA' }, def: { es: 'Utilidad de operación más depreciación y amortización (utilidad antes de intereses, impuestos, depreciación y amortización); aquí, cálculo FNAM con cifras T1.', en: 'Operating income plus depreciation and amortization (earnings before interest, taxes, depreciation and amortization); here an FNAM calculation on T1 figures.' } },
    bp: { id: 'g-bp', re: { es: /\bpb\b/, en: /\bbps?\b/ }, label: { es: 'pb (puntos base)', en: 'bp (basis points)' }, def: { es: 'Centésimas de punto porcentual: 100 pb = 1%. Un diferencial de 145 pb es 1.45% sobre el bono de referencia.', en: 'Hundredths of a percentage point: 100 bp = 1%. A 145 bp spread is 1.45% over the benchmark bond.' } },
    nm: { id: 'g-nm', re: { es: /\bn\.s\./, en: /\bn\.m\./ }, label: { es: 'n.s. (no significativo)', en: 'n.m. (not meaningful)' }, def: { es: 'La razón no se muestra porque el denominador es cero, negativo o tan pequeño que el cociente dice más del denominador que del numerador (por ejemplo, capex / flujo de operación cuando el flujo es ≤ 0).', en: 'The ratio is not shown because the denominator is zero, negative or so small that the quotient says more about the denominator than the numerator (for example capex / operating cash flow when the flow is ≤ 0).' } }
  };
  var GLOSS_SCOPE = 'header .lede, .srcmeth p, .srcmeth li, .sec-desc, .kpi .lbl, .kpi .sub, .wtk li, .wtk summary, .wtk .det, .thesis, .thesis-meta, .card .cap, .card h3, .callout, .sowhat, .dq-line, main th, .stamp, .changes-list, .paths, main td .nd';
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
    if (!s || /^(no divulgad|not disclosed|sin etiqueta|not tagged|s\.e\.|n\.t\.|n\.s\.|n\.m\.|pendiente|pending|no revelad|n\.d\.)/i.test(s)) return null;
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
      cards(); shade(); dqLine(); foldM();
    } finally { busy = false; flushMO(); }
  }
  // phones: secondary tables (cards marked data-fold) start folded behind a button, so the longest pages scroll less
  function foldM() {
    document.querySelectorAll('.card[data-fold]').forEach(function (card) {
      var b = card.querySelector(':scope > .fold-btn');
      var lbl = card.getAttribute('data-fold-' + LANG) || t('Mostrar tabla', 'Show table');
      if (b) { b.querySelector('span').textContent = lbl; return; }
      if (window.innerWidth > 640) return;
      b = document.createElement('button'); b.type = 'button'; b.className = 'fold-btn'; b.setAttribute('aria-expanded', 'false');
      b.innerHTML = '<span>' + esc(lbl) + '</span><span class="chev" aria-hidden="true">+</span>';
      card.classList.add('folded'); card.insertBefore(b, card.firstChild);
      b.addEventListener('click', function () { var folded = card.classList.toggle('folded'); b.setAttribute('aria-expanded', String(!folded)); b.querySelector('.chev').textContent = folded ? '+' : '–'; });
    });
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

  // ---- heat-map cell: a single-hue scale (light → dark) of how strongly a metric points to risk, 0..1; the value is
  // always printed in the cell, so the color never carries the information alone
  function heat(level) { if (level == null || !isFinite(level)) return ''; var l = Math.max(0, Math.min(1, level)); return ' data-heat="' + Math.round(l * 4) + '"'; }
  // the legend is one bar of the five cell colors, lowest strain on the left, highest on the right
  function heatLegend() { return '<span class="heat-legend"><span>' + t('Menor presión', 'Lowest strain') + '</span><span class="heat-bar" aria-hidden="true">' + [0, 1, 2, 3, 4].map(function (k) { return '<i data-heat="' + k + '"></i>'; }).join('') + '</span><span>' + t('Mayor presión', 'Highest strain') + '</span></span>'; }

  // ---- data quality: cells holding a "needs review" mark or a "not tagged" mark get a subtle shade (the reason is on
  // hover); one line under the page header counts the figures shown and the share verified or matched
  // phones: every data table without its own phone summary becomes a stack of cards (one per row, each value under its
  // column heading); the key-column choice still applies
  function cards() {
    document.querySelectorAll('main .tblwrap table').forEach(function (tbl) {
      if (tbl.closest('.only-d') || tbl.closest('[data-nocards]') || !tbl.tHead) return;
      var hr = tbl.tHead.rows[tbl.tHead.rows.length - 1], heads = [];
      Array.prototype.forEach.call(hr.cells, function (th) { for (var k = 0; k < (th.colSpan || 1); k++) heads.push(th.getAttribute('data-short') || (th.textContent || '').replace(/[↕↑↓]/g, '').trim()); });
      tbl.classList.add('collapse', 'cards');
      Array.prototype.forEach.call(tbl.tBodies[0] ? tbl.tBodies[0].rows : [], function (tr) {
        var i = 0; Array.prototype.forEach.call(tr.cells, function (td) { if (i > 0 && (td.colSpan || 1) === 1 && heads[i] && !td.hasAttribute('data-h')) td.setAttribute('data-h', heads[i]); i += td.colSpan || 1; });
      });
    });
  }
  function shade() {
    document.querySelectorAll('main td, main .kpi .val, main .mrow').forEach(function (td) {
      var rv = td.querySelector('.rvw'), n = td.querySelector('.nt');
      td.classList.toggle('cell-review', !!rv); td.classList.toggle('cell-nt', !rv && !!n);
      if (rv && !td.title) td.title = rv.getAttribute('title');
    });
  }
  // ---- data quality, computed from the data each page shows (not from cells): one function per module gives the figures
  // shown, how many are verified or matched, the items that need review, the XBRL gaps that remain unexplained and the gaps
  // the curated file explains (not-tagged.json). Every page prints the line with the verification method and the item lists
  // folded beneath (#dq); the summary page rolls all modules up in module order, names the weakest, and links each count to that list.
  var MODULE_IDS = ['capacidad', 'comprometida', 'capex', 'electricidad', 'sitios', 'fuera-de-balance', 'circular', 'retorno'];
  function dqLatest(c) { return c.latest ? c.quarters.filter(function (q) { return q.id === c.latest.id; })[0] : null; }
  function dqLastWith(c, k) { for (var i = c.quarters.length - 1; i >= 0; i--) if (c.quarters[i].m[k]) return c.quarters[i]; return null; }
  // Three kinds of credit, never blended (owner's fourth review): quote = a quoted sentence matched on the cited harvested
  // page (text items, 424B totals, filings found by EDGAR's index, term sheets read twice); tag = a value under a standard
  // XBRL concept that passes the identity checks; present = a figure FNAM computes from those inputs (TTM sums, ratios,
  // derived trailing figures). Explained gaps and unexplained "not tagged" cells are counted apart and enter the "all
  // figures" denominator; "needs review" items are shown with their reason.
  function dqNew(id) { return { id: id, quote: 0, tag: 0, present: 0, review: [], nt: [], explained: [], statements: 0, secondary: 0, curated: { n: 0, verified: 0, tagChecked: 0, reviewed: 0, t1: 0, t2: 0 } }; }
  function dqItem(D, kind, who, what, why, href) { D[kind].push({ who: who, what: what, why: why || '', href: href || null }); }
  function dqCurated(D, items) { items.forEach(function (i) { D.curated.n++; if (i.status === 'verified' && i.check === 'xbrl_concept') D.curated.tagChecked++; else if ((i.status === 'verified' || i.status === 'matched') && quoteOk(i)) D.curated.verified++; if (i.reviewedBy) D.curated.reviewed++; }); }
  // an XBRL-fed cell: present → tag-matched (or review when flagged); absent → a derived trailing figure counts as a value
  // present (TTM cells only), else explained (curated reason) or not tagged
  function dqXbrl(D, c, k, present, flagged, what, why, opts) {
    var F = window.HYP_FIN, name = c.name, label = (F.defs[k] ? F.defs[k][LANG] : k) + (what ? ' · ' + what : '');
    if (present) { if (flagged) dqItem(D, 'review', name, label, why || t('falla un control de identidad o de valores atípicos', 'fails an identity or outlier check')); else D.tag++; return; }
    var r = ntReason(c.ticker, k);
    if (r && r.derived && opts && opts.ttm) { D.present++; return; }
    if (r && r.result !== 'unknown') dqItem(D, 'explained', name, label, t(NTR[r.result][0], NTR[r.result][1]) + ': ' + (r['note_' + LANG] || r.note_en || ''));
    else dqItem(D, 'nt', name, label, r ? (r['note_' + LANG] || r.note_en || '') : t('sin etiqueta XBRL estándar; motivo no registrado', 'no standard XBRL tag; reason not recorded'));
  }
  // text items: credited only with the stored quote check on the cited page (no default); the reason otherwise
  function dqText(D, items, who, what) {
    items.forEach(function (i) {
      var s = i.src || null, qc = s && s.quoteCheck != null ? s.quoteCheck : i.quoteCheck;
      if (i.status === 'verified' && quoteOk(i)) D.quote++;
      else dqItem(D, 'review', who(i), what(i), i.status !== 'verified' ? (i['reviewNote_' + LANG] || i.reviewNote_en || t('pendiente de la segunda lectura automática', 'pending the automated second read')) : qc === 'other_page' ? t('la cita está en otra página del texto cosechado', 'the quote is on another page of the harvested text') : qc == null ? t('cita sin cotejar contra la página citada', 'quote not checked against the cited page') : t('la cita no está en la página citada', 'quote not on the cited page'));
    });
    dqCurated(D, items);
  }
  var DQ = {
    capex: function () {
      var F = window.HYP_FIN; if (!F) return null; var D = dqNew('capex'), cos = Object.keys(F.companies).map(function (k) { return F.companies[k]; });
      var ttmK = ['capex_cash', 'fl_additions', 'ocf', 'debt_proceeds', 'debt_repaid', 'cp_net', 'equity_proceeds', 'pref_proceeds', 'buybacks', 'dividends', 'interest_cap'], derK = ['capex_incl_fl', 'fcf', 'fcf_after_fl'], balK = ['cash', 'debt', 'ol_liab', 'fl_liab'];
      cos.forEach(function (c) {
        var q = dqLatest(c); if (!q) return;
        var i = c.quarters.indexOf(q), four = c.quarters.slice(Math.max(0, i - 3), i + 1);
        ttmK.forEach(function (k) { var pres = q.ttm && q.ttm[k] != null; var fl = four.some(function (x) { return x.m[k] && x.m[k][4]; }); dqXbrl(D, c, k, pres, fl, t('UDM', 'TTM'), fl ? t('un trimestre de la suma falla un control (ver la ficha ⓘ)', 'one quarter in the sum fails a check (see the ⓘ card)') : '', { ttm: true }); });
        derK.forEach(function (k) { var pres = q.ttm && q.ttm[k] != null; if (pres) { D.present++; return; } var dep = k === 'capex_incl_fl' ? 'fl_additions' : k === 'fcf_after_fl' ? 'fl_principal' : 'ocf'; dqXbrl(D, c, dep, false, false, t('insumo de ', 'input of ') + k.replace(/_/g, ' '), '', { ttm: true }); });
        var bq = dqLastWith(c, 'debt') || q;
        balK.forEach(function (k) { dqXbrl(D, c, k, !!bq.m[k], bq.m[k] && bq.m[k][4], date(bq.end)); });
        if (bq.d && bq.d.lease_adj_net_debt == null && bq.m.debt) dqXbrl(D, c, 'fl_liab', false, false, t('insumo de deuda neta ajustada', 'input of lease-adjusted net debt'));
        // the FactSet cross-check confirms a debt figure already counted; only a miss is listed
        var fs = F.debt && F.debt.totals[c.ticker];
        if (fs && bq.m.debt && fs.report === bq.end && Math.abs(fs.total * 1e6 - bq.m.debt[0]) / Math.max(1, Math.abs(bq.m.debt[0])) > 0.02) dqItem(D, 'review', c.name, t('deuda total: XBRL vs. FactSet', 'total debt: XBRL vs FactSet'), t('difieren más de 2% a la misma fecha', 'differ by more than 2% at the same date'));
      });
      ((F.debt && F.debt.deals) || []).forEach(function (d) {
        var who = (F.companies[d.ticker] || {}).name || d.ticker, what = date(d.issued) + ' · ' + d.klass + (d.amount ? ' · ' + money(d.amount * 1e6).replace(/<[^>]+>/g, '') : '');
        if (d.match || (d.fs && d.fs.result === 'filing')) D.quote++;
        else if (d.fs && d.fs.result === 'partial') dqItem(D, 'explained', who, what, t('cotejo parcial: ', 'partial match: ') + (d.fs['note_' + LANG] || d.fs.note_en || ''));
        else dqItem(D, 'review', who, what, d.fs ? (d.fs['note_' + LANG] || d.fs.note_en || t('sin resolver', 'unresolved')) : t('solo FactSet: sin presentación cotejada', 'FactSet only: no filing matched'));
      });
      dqCurated(D, (F.notTagged || []).concat(((F.debt && F.debt.deals) || []).filter(function (d) { return d.fs; }).map(function (d) { return d.fs; })));
      return D;
    },
    'fuera-de-balance': function () {
      var F = window.HYP_FIN; if (!F) return null; var D = dqNew('fuera-de-balance'), OB = F.offbs || { items: [] }, cos = Object.keys(F.companies).map(function (k) { return F.companies[k]; });
      var L = { leases_not_commenced: t('arrend. no iniciados', 'leases not commenced'), vie_unconsolidated: t('EIV no consolidada', 'unconsolidated VIE'), jv_equity_method_debt: t('deuda de coinversión', 'JV debt'), spv: 'SPV', rvg: t('garantía de valor residual', 'residual value guarantee'), guarantee: t('garantía', 'guarantee'), backstop: 'backstop', purchase_obligation: t('obligación de compra', 'purchase obligation'), prepayment: t('prepagos', 'prepayments'), funding_commitment: t('compromiso de fondeo', 'funding commitment') };
      dqText(D, OB.items, function (i) { return (F.companies[i.ticker] || {}).name || i.ticker; }, function (i) { return (L[i.item] || i.item) + ' · ' + money(i.amountUSDm != null ? i.amountUSDm * 1e6 : null).replace(/<[^>]+>/g, ''); });
      ['rpo', 'purchase_oblig', 'vie_max_loss', 'guarantees_max', 'equity_method', 'nci_vie', 'ol_pay_due', 'fl_pay_due', 'ol_liab', 'fl_liab', 'debt'].forEach(function (k) {
        cos.forEach(function (c) { var q = dqLastWith(c, k); dqXbrl(D, c, k, !!q, q && q.m[k][4], q ? date(q.end) : t('último balance', 'latest balance sheet')); });
      });
      return D;
    },
    capacidad: function () { var C = window.HYP_CAP, F = window.HYP_FIN; if (!C || !F) return null; var D = dqNew('capacidad'); dqText(D, C.current, function (x) { return F.companies[x.ticker].name; }, function (x) { return metricLabel(x.metric) + ' · ' + mw(x.mw, x.qualifier); }); D.curated.t1 = C.current.length; if (C.oracle) D.statements += (C.oracle.quarters || []).length + (C.oracle.fiscalYears || []).length; return D; },
    comprometida: function () { var C = window.HYP_CAP, F = window.HYP_FIN; if (!C || !F) return null; var D = dqNew('comprometida'); var t1 = C.pipeline.filter(function (x) { return x.tier !== 'T2'; }); dqText(D, t1, function (x) { return F.companies[x.ticker].name; }, function (x) { return metricLabel(x.metric) + ' · ' + mw(x.mw, x.qualifier); }); D.curated.t1 = t1.length; D.statements += C.pipeline.length - t1.length; return D; },
    electricidad: function () { var P = window.HYP_POWER, F = window.HYP_FIN; if (!P || !F) return null; var D = dqNew('electricidad'); P.companyDeals.forEach(function (d) { if (d.src && d.src.tier === 'T1') { D.curated.t1++; if (d.src.quoteCheck === 'page') D.quote++; else dqItem(D, 'review', F.companies[d.ticker].name, d.counterparty || d.counterparty_en || d.id, t('la cita no está en la página citada', 'quote not on the cited page')); } else { D.statements++; D.curated.t2++; } }); D.curated.n = P.companyDeals.length; D.curated.verified = P.companyDeals.filter(function (d) { return d.src && d.src.quoteCheck === 'page'; }).length; D.curated.reviewed = P.companyDeals.filter(function (d) { return d.reviewedBy; }).length; return D; },
    sitios: function () { var S = window.HYP_SITES, F = window.HYP_FIN; if (!S || !F) return null; var D = dqNew('sitios'); S.sites.forEach(function (x) { if (x.src && x.src.tier === 'T1') { D.curated.t1++; if (x.src.quoteCheck === 'page') D.quote++; else dqItem(D, 'review', F.companies[x.ticker].name, x.name || x.name_en, t('la cita no está en la página citada', 'quote not on the cited page')); } else { D.statements++; D.curated.t2++; } }); D.curated.n = S.sites.length; D.curated.verified = S.sites.filter(function (x) { return x.src && x.src.quoteCheck === 'page'; }).length; D.curated.reviewed = S.sites.filter(function (x) { return x.reviewedBy; }).length; return D; },
    circular: function () { var C = window.HYP_CIRC; if (!C) return null; var D = dqNew('circular'); C.flows.forEach(function (f) { if (f.src && f.src.tier === 'T1') { D.curated.t1++; if (f.src.quoteCheck === 'page') D.quote++; else dqItem(D, 'review', f.from + ' → ' + f.to, f.type, t('la cita no está en la página citada', 'quote not on the cited page')); } else if (f.pending_en) { D.curated.t1++; dqItem(D, 'review', f.from + ' → ' + f.to, f.type, f['pending_' + LANG] || f.pending_en); } else { D.statements++; D.curated.t2++; } }); D.curated.n = C.flows.length; D.curated.verified = C.flows.filter(function (f) { return f.src && f.src.quoteCheck === 'page'; }).length; D.curated.reviewed = C.flows.filter(function (f) { return f.reviewedBy; }).length; return D; },
    retorno: function () {
      var P = window.HYP_PAY, F = window.HYP_FIN; if (!P || !F) return null; var D = dqNew('retorno');
      var items = [].concat(P.segments, P.rpoTiming, P.usefulLives, P.capexPerMW);
      dqText(D, items, function (x) { return F.companies[x.ticker].name; }, function (x) { return x.segment_en ? x['segment_' + LANG] : x.rpoUSDm ? 'RPO' : x.servers_en ? t('vida útil', 'useful life') : t('capex por GW', 'capex per GW'); });
      P.termSheets.forEach(function (x) { if (x.status === 'verified') D.quote++; else dqItem(D, 'review', F.companies[x.ticker].name, x.form + ' ' + date(x.date), t('hoja de términos pendiente de segunda lectura', 'term sheet pending second read')); }); dqCurated(D, P.termSheets);
      D.curated.t1 = D.curated.n;
      P.ratings.forEach(function (r) { r.items.forEach(function (it) { if (it.supersededBy) return; if (it.tier === 'T1') D.quote++; else D.secondary++; }); });
      Object.keys(F.companies).forEach(function (k) { var c = F.companies[k], q = dqLatest(c); if (!q) return; dqXbrl(D, c, 'interest_paid', q.ttm && q.ttm.interest_paid != null, false, t('UDM', 'TTM'), '', { ttm: true }); });
      return D;
    }
  };
  function dqModule(id) { var f = DQ[id]; if (!f) return null; try { return f(); } catch (e) { console.error(e); return null; } }
  // two shares, both stated: of all figures (explained gaps and unexplained cells in the denominator) and of figures with a value
  function dqPct(D) { var ok = D.quote + D.tag + D.present, shown = ok + D.review.length, all = shown + D.explained.length + D.nt.length; return { ok: ok, shown: shown, all: all, pct: shown ? Math.round(ok / shown * 100) : 100, pctAll: all ? Math.round(ok / all * 100) : 100 }; }
  function dqKinds(D) { return t(D.quote + ' con cita cotejada, ' + D.tag + ' con etiqueta XBRL cotejada, ' + D.present + ' valores presentes (cálculo FNAM)', D.quote + ' quote-matched, ' + D.tag + ' XBRL tag-matched, ' + D.present + ' values present (FNAM calculation)'); }
  function dqAnalyst(D) { if (!D.curated.n) return ''; var mix = D.curated.t1 && D.curated.t2 ? ' (' + t(D.curated.t1 + ' cifras T1 y ' + D.curated.t2 + ' declaraciones T2', D.curated.t1 + ' T1 figures and ' + D.curated.t2 + ' T2 statements') + ')' : ''; return ' · ' + t('revisadas por analista: ' + D.curated.reviewed + ' de ' + D.curated.n + ' partidas curadas', 'analyst-reviewed: ' + D.curated.reviewed + ' of ' + D.curated.n + ' curated items') + mix + (D.curated.tagChecked ? ' · ' + t(D.curated.tagChecked + ' huecos con etiqueta cotejada (control de concepto, no verificados)', D.curated.tagChecked + ' gaps tag-checked (concept check, not verified)') : ''); }
  function dqList(D) {
    var li = function (kind, label) { return D[kind].length ? '<li><span class="k">' + label + '</span> ' + D[kind].map(function (x) { return '<b>' + esc(x.who) + '</b> · ' + esc(plain(x.what)) + (x.why ? ' <span class="muted">(' + esc(plain(x.why)) + ')</span>' : ''); }).join('; ') + '</li>' : ''; };
    return '<ul>' + li('review', t('Por revisar', 'Needs review')) + li('nt', t('Sin etiqueta XBRL', 'Not tagged')) + li('explained', t('Huecos explicados', 'Explained gaps')) + '</ul>';
  }
  function dqLine() {
    var host = document.getElementById('dqLine');
    var mid = curMod() > 0 && MODS[curMod()].n ? MODS[curMod()].p : null;
    if (!host) { var a = document.getElementById('asofRow'); if (!a) return; host = document.createElement('div'); host.id = 'dqLine'; host.className = 'dq-line'; a.parentNode.insertBefore(host, a.nextSibling); }
    if (!mid) { host.innerHTML = ''; return; }
    var D = dqModule(mid); if (!D) { host.innerHTML = ''; return; }
    var P = dqPct(D), open = location.hash === '#dq', gaps = D.explained.length + D.nt.length;
    host.innerHTML = '<b>' + t('Calidad de los datos', 'Data quality') + '</b> ' + t(P.pctAll + '% de las ' + P.all + ' cifras de esta página está verificado o cotejado' + (gaps ? ' (incluye ' + gaps + ' huecos en el denominador)' : '') + '; ' + P.pct + '% de las ' + P.shown + ' cifras con valor', P.pctAll + '% of all ' + P.all + ' figures on this page are verified or matched' + (gaps ? ' (' + gaps + ' gaps in the denominator)' : '') + '; ' + P.pct + '% of the ' + P.shown + ' figures with a value') + ' · ' + dqKinds(D) + ' · ' + t('verificado = ', 'verified = ') + VERIF[LANG] +
      dqAnalyst(D) +
      (D.review.length ? ' · <span class="sw-review"></span>' + t(D.review.length + ' por revisar', D.review.length === 1 ? '1 needs review' : D.review.length + ' need review') : '') +
      (D.nt.length ? ' · <span class="sw-nt"></span>' + t(D.nt.length + ' sin etiqueta XBRL sin explicar', D.nt.length + ' not tagged in XBRL, unexplained') : '') +
      (D.explained.length ? ' · ' + t(D.explained.length + ' huecos explicados (n/a, texto, solo anual, última etiqueta)', D.explained.length + ' explained gaps (n/a, text, annual only, last tagged)') : '') +
      (D.statements ? ' · ' + t(D.statements + ' declaraciones de la empresa (T2)', D.statements + ' company statements (T2)') : '') + (D.secondary ? ' · ' + t(D.secondary + ' de fuente secundaria (T4)', D.secondary + ' from a secondary source (T4)') : '') +
      (QPAGE ? ' · <a href="' + QPAGE + '">' + t('página de calidad', 'quality page') + '</a>' : '') +
      (D.review.length + D.nt.length + D.explained.length ? '<details id="dq"' + (open ? ' open' : '') + '><summary>' + t('Lista de partidas', 'Item list') + '</summary>' + dqList(D) + '</details>' : '');
  }
  // summary page, in its last section "Sources and methodology" (owner, 2026-10-08; the heading there replaces the inline
  // label, o.noLabel): hub-wide coverage first (all figures, explained gaps included, and figures with a value), then one line
  // per module in module order (1 to 8; owner, 2026-10-06), the weakest module named in the text and highlighted in the
  // table; the counts link to that module's list (#dq)
  function dqRollup(hostId, o) {
    var host = document.getElementById(hostId); if (!host) return;
    var rows = MODULE_IDS.map(function (id) { var D = dqModule(id); return D ? { id: id, D: D, P: dqPct(D), m: MODS.filter(function (x) { return x.p === id; })[0] } : null; }).filter(Boolean);
    if (!rows.length) { host.innerHTML = ''; return; }
    // the weakest module: the lowest share of all figures, then the most items to review or unexplained
    var w = rows.slice().sort(function (a, b) { return (a.P.pctAll - b.P.pctAll) || ((b.D.review.length + b.D.nt.length) - (a.D.review.length + a.D.nt.length)); })[0];
    var T = rows.reduce(function (s, r) { return { ok: s.ok + r.P.ok, shown: s.shown + r.P.shown, all: s.all + r.P.all, q: s.q + r.D.quote, tg: s.tg + r.D.tag, pr: s.pr + r.D.present, rev: s.rev + r.D.review.length, nt: s.nt + r.D.nt.length, ex: s.ex + r.D.explained.length, cn: s.cn + r.D.curated.n, cr: s.cr + r.D.curated.reviewed, tc: s.tc + r.D.curated.tagChecked }; }, { ok: 0, shown: 0, all: 0, q: 0, tg: 0, pr: 0, rev: 0, nt: 0, ex: 0, cn: 0, cr: 0, tc: 0 });
    var pctAll = T.all ? Math.round(T.ok / T.all * 100) : 100, pctVal = T.shown ? Math.round(T.ok / T.shown * 100) : 100;
    var link = function (r, kind, n) { return n ? '<a href="/hiperescaladores/' + r.id + '/#dq">' + n + '</a>' : '0'; };
    host.innerHTML = (o && o.noLabel ? '' : '<b>' + t('Calidad de los datos del centro', 'Hub data quality') + '</b> ') + t(pctAll + '% de las ' + T.all + ' cifras de los ocho módulos está verificado o cotejado, con los ' + T.ex + ' huecos explicados y los ' + T.nt + ' sin explicar en el denominador; ' + pctVal + '% de las ' + T.shown + ' cifras con valor. ', pctAll + '% of all ' + T.all + ' figures across the eight modules are verified or matched, with the ' + T.ex + ' explained gaps and ' + T.nt + ' unexplained in the denominator; ' + pctVal + '% of the ' + T.shown + ' figures with a value. ') + t('Del total cotejado: ' + T.q + ' con cita cotejada, ' + T.tg + ' con etiqueta XBRL cotejada, ' + T.pr + ' valores presentes (cálculo FNAM). ', 'Of those: ' + T.q + ' quote-matched, ' + T.tg + ' XBRL tag-matched, ' + T.pr + ' values present (FNAM calculation). ') +
      t('El módulo más débil es ', 'The weakest module is ') + '<a href="/hiperescaladores/' + w.id + '/#dq">' + esc(modLabel(w.m)) + '</a>: ' + t(w.P.pctAll + '% de ' + w.P.all + ' cifras, ' + w.D.review.length + ' por revisar, ' + w.D.nt.length + ' sin etiqueta XBRL sin explicar', w.P.pctAll + '% of ' + w.P.all + ' figures, ' + (w.D.review.length === 1 ? '1 needs review, ' : w.D.review.length + ' need review, ') + w.D.nt.length + ' not tagged in XBRL and unexplained') + '. ' +
      t((T.rev === 1 ? '1 partida por revisar' : T.rev + ' partidas por revisar') + ' en total; revisadas por analista: ' + T.cr + ' de ' + T.cn + ' partidas curadas' + (T.tc ? '; ' + T.tc + ' huecos con etiqueta cotejada (control de concepto, no verificados)' : '') + '. Verificado significa ' + VERIF.es + '.', (T.rev === 1 ? '1 item needs review' : T.rev + ' items need review') + ' in total; analyst-reviewed: ' + T.cr + ' of ' + T.cn + ' curated items' + (T.tc ? '; ' + T.tc + ' gaps tag-checked (concept check, not verified)' : '') + '. Verified means ' + VERIF.en + '.') +
      '<div class="tblwrap" data-nosort data-nocards><table><thead><tr><th scope="col" class="l">' + t('Módulo', 'Module') + '</th><th scope="col">' + t('Verificado, todas las cifras', 'Verified, all figures') + '</th><th scope="col">' + t('Verificado, con valor', 'Verified, with a value') + '</th><th scope="col">' + t('Cita', 'Quote') + '</th><th scope="col">' + t('Etiqueta', 'Tag') + '</th><th scope="col">' + t('Presente', 'Present') + '</th><th scope="col">' + t('Por revisar', 'Needs review') + '</th><th scope="col">' + t('Sin etiqueta', 'Not tagged') + '</th><th scope="col">' + t('Explicados', 'Explained') + '</th><th scope="col">' + t('Analista', 'Analyst') + '</th></tr></thead><tbody>' +
      rows.map(function (r) { var c = function (l, v) { return '<td data-l="' + esc(l) + '">' + v + '</td>'; }; return '<tr' + (r === w ? ' class="worst"' : '') + '><td class="l"><a href="/hiperescaladores/' + r.id + '/">' + esc(modLabel(r.m)) + '</a></td>' + c(t('Todas', 'All'), r.P.pctAll + '% · ' + r.P.all) + c(t('Con valor', 'With value'), r.P.pct + '% · ' + r.P.shown) + c(t('Cita', 'Quote'), r.D.quote) + c(t('Etiqueta', 'Tag'), r.D.tag) + c(t('Presente', 'Present'), r.D.present) + c(t('Por revisar', 'Needs review'), link(r, 'review', r.D.review.length)) + c(t('Sin etiqueta', 'Not tagged'), link(r, 'nt', r.D.nt.length)) + c(t('Explicados', 'Explained'), link(r, 'explained', r.D.explained.length)) + c(t('Analista', 'Analyst'), r.D.curated.reviewed + ' / ' + r.D.curated.n) + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  var QPAGE = (function () { var m = /^\/hiperescaladores\/([a-z-]+)\/$/.exec(location.pathname); return m && ['capacidad', 'comprometida', 'capex', 'electricidad', 'sitios', 'fuera-de-balance', 'circular', 'retorno'].indexOf(m[1]) >= 0 ? location.pathname + 'quality.html' : null; })();

  // ---- module order: compact navigation, previous / next links and the module's "so what" line
  var MODS = [
    { p: '', es: 'Resumen', en: 'Summary' }, { p: 'capacidad', n: 1, es: 'Capacidad', en: 'Capacity' }, { p: 'comprometida', n: 2, es: 'Comprometida', en: 'Committed' },
    { p: 'capex', n: 3, es: 'Capex', en: 'Capex' }, { p: 'electricidad', n: 4, es: 'Energía', en: 'Power' }, { p: 'sitios', n: 5, es: 'Sitios', en: 'Sites' },
    { p: 'fuera-de-balance', n: 6, es: 'Fuera de balance', en: 'Off-balance-sheet' }, { p: 'circular', n: 7, es: 'Circular', en: 'Circular' },
    { p: 'retorno', n: 8, es: 'Retorno', en: 'Payoff' }, { p: 'metodologia', es: 'Metodología', en: 'Methodology' }, { p: 'glosario', es: 'Glosario', en: 'Glossary' }
  ];
  function curMod() { var m = /^\/hiperescaladores\/(?:([a-z-]+)\/)?(?:index\.html)?$/.exec(location.pathname); return m ? MODS.findIndex(function (x) { return x.p === (m[1] || ''); }) : -1; }
  function modHref(x) { return '/hiperescaladores/' + (x.p ? x.p + '/' : ''); }
  function modLabel(x) { return (x.n ? x.n + ' · ' : '') + x[LANG]; }
  function pager() {
    var i = curMod(), main = document.querySelector('main'); if (i < 0 || !main) return;
    var el = document.getElementById('pager'); if (!el) { el = document.createElement('nav'); el.id = 'pager'; el.className = 'pager wrap'; el.setAttribute('aria-label', 'Módulos / Modules'); main.parentNode.insertBefore(el, main.nextSibling); }
    var prev = MODS[i - 1], next = MODS[i + 1];
    el.innerHTML = (prev ? '<a class="prev" href="' + modHref(prev) + '"><span class="k">← ' + t('Anterior', 'Previous') + '</span><b>' + esc(modLabel(prev)) + '</b></a>' : '<span></span>') + (next ? '<a class="next" href="' + modHref(next) + '"><span class="k">' + t('Siguiente', 'Next') + ' →</span><b>' + esc(modLabel(next)) + '</b></a>' : '<span></span>');
  }
  // the static navigation in each page lists the same order; its labels are re-written here so every page matches
  function navLabels() {
    var nav = document.querySelector('nav.mods .wrap'); if (!nav) return;
    var i = curMod(), cur = i >= 0 ? MODS[i] : null;
    var links = MODS.map(function (x, k) { return '<a href="' + modHref(x) + '"' + (k === i ? ' class="active" aria-current="page"' : '') + '>' + (x.n ? '<span class="n">' + x.n + '</span>' : '') + esc(x[LANG]) + '</a>'; }).join('');
    nav.innerHTML = '<button type="button" class="nav-toggle" aria-expanded="false" aria-controls="modLinks"><span class="ic" aria-hidden="true"><i></i><i></i><i></i></span><span>' + t('Módulos', 'Modules') + '</span>' + (cur ? '<span class="cur">· ' + esc(modLabel(cur)) + '</span>' : '') + '</button><div class="nav-links" id="modLinks">' + links + '</div>';
    wireToggle(nav);
    var jump = document.querySelector('nav.jump .wrap');
    if (jump && !jump.querySelector('.nav-toggle')) {
      var inner = jump.innerHTML;
      jump.innerHTML = '<button type="button" class="nav-toggle" aria-expanded="false" aria-controls="jumpLinks"><span class="ic" aria-hidden="true"><i></i><i></i><i></i></span><span>' + t('Secciones de esta página', 'Sections on this page') + '</span></button><div class="nav-links" id="jumpLinks">' + inner + '</div>';
      wireToggle(jump);
    } else if (jump) { var lb = jump.querySelector('.nav-toggle > span:nth-child(2)'); if (lb) lb.textContent = t('Secciones de esta página', 'Sections on this page'); }
  }
  function wireToggle(box) {
    var b = box.querySelector('.nav-toggle'), links = box.querySelector('.nav-links'); if (!b || !links) return;
    b.addEventListener('click', function () { var open = !links.classList.contains('open'); links.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open)); });
    links.addEventListener('click', function (e) { if (e.target.closest('a') && box.closest('nav.jump')) { links.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); } });
  }
  // "so what": one sentence under the module title, composed by the module from its data (never hand-written figures)
  function soWhat(html) {
    var el = document.getElementById('sowhat');
    if (!el) { var h = document.querySelector('header .lede'); if (!h) return; el = document.createElement('p'); el.id = 'sowhat'; el.className = 'sowhat'; h.parentNode.insertBefore(el, h); }
    el.innerHTML = html ? '<b>' + t('En una frase: ', 'So what: ') + '</b>' + html : '';
    el.hidden = !html;
  }
  // a module title that states its conclusion, composed from data when it depends on figures (fallback: the static one)
  function title(es, en) { var h = document.querySelector('header h1'); if (!h || !es) return; h.innerHTML = '<span class="es"' + (LANG === 'es' ? '' : ' hidden') + '>' + esc(es) + '</span><span class="en"' + (LANG === 'en' ? '' : ' hidden') + '>' + esc(en) + '</span>'; }

  // ---- scope notes: figures that look alike across modules but measure different things (data/scope.js)
  function scope(id, label) {
    var S = window.HYP_SCOPE, n = S && S.notes.find(function (x) { return x.id === id; }); if (!n) return '';
    return '<button type="button" class="scope-btn" data-scope="' + esc(id) + '">' + esc(label || t('alcance distinto', 'different scope')) + ' ⓘ</button>';
  }
  function scopeHtml(n) {
    return '<b>' + esc(n['title_' + LANG]) + '</b><ul class="plain">' + n.figures.map(function (f) { return '<li>' + (f.mw != null ? '<b>' + mw(f.mw) + '</b> ' : '') + esc(f[LANG]) + ' · <a href="/hiperescaladores/' + MODS.find(function (x) { return x.n === f.module; }).p + '/">' + t('módulo ', 'module ') + f.module + '</a></li>'; }).join('') + '</ul>' + esc(n['why_' + LANG]) + '<br><a href="/hiperescaladores/metodologia/#scope">' + t('Todas las diferencias de alcance', 'All scope differences') + ' →</a>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.scope-btn'); if (!b) return;
    e.stopPropagation(); var S = window.HYP_SCOPE, n = S && S.notes.find(function (x) { return x.id === b.getAttribute('data-scope'); }); if (n) openPop(b, scopeHtml(n));
  });

  function applyLang() {
    document.querySelectorAll('.es').forEach(function (e) { e.hidden = LANG !== 'es'; });
    document.querySelectorAll('.en').forEach(function (e) { e.hidden = LANG !== 'en'; });
    document.documentElement.lang = LANG === 'es' ? 'es-MX' : 'en';
    var b = document.body; if (b && b.dataset['title' + (LANG === 'es' ? 'Es' : 'En')]) document.title = b.dataset['title' + (LANG === 'es' ? 'Es' : 'En')];
    var es = document.getElementById('btnLangEs'), en = document.getElementById('btnLangEn');
    if (es) es.classList.toggle('active', LANG === 'es'); if (en) en.classList.toggle('active', LANG === 'en');
    provs = []; closePop();
    try { navLabels(); pager(); } catch (e) { console.error(e); }
    listeners.forEach(function (fn) { try { fn(LANG); } catch (e) { console.error(e); } });
    try { glossify(); decorate(); } catch (e) { console.error(e); }
  }
  // modules re-render tables on filter changes: decorate them again (sort order and key-column choice persist)
  var moTimer = null;
  if (window.MutationObserver) (MO = new MutationObserver(function () { if (busy) return; clearTimeout(moTimer); moTimer = setTimeout(function () { try { decorate(); glossify(); } catch (e) { console.error(e); } }, 30); })).observe(document.documentElement, { childList: true, subtree: true });
  function setLang(l) {
    LANG = l; try { localStorage.setItem('fnam-lang', l); } catch (e) { /* ignore */ }
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
    aged: aged, agedCell: agedCell, capexOcf: capexOcf, CO_MAX: CO_MAX, calTTM: calTTM, calRows: calRows, offsetNote: offsetNote, etTime: etTime, glossify: glossify,
    soWhat: soWhat, title: title, itemDate: itemDate, scope: scope, scopeHtml: scopeHtml, MODS: MODS, heat: heat, heatLegend: heatLegend,
    ntReason: ntReason, ntCell: ntCell, ntCheck: ntCheck, verifText: verifText, verifSummary: verifSummary, quoteOk: quoteOk, VERIF: VERIF, etDate: etDate, curatedDate: curatedDate, dqModule: dqModule, dqRollup: dqRollup, dqPct: dqPct,
    buildRow: buildRow, oldQ: oldQ, oldFlag: oldFlag, capMult: capMult, leaseCmp: leaseCmp, leaseCmpText: leaseCmpText, narrow: narrow
  };
})();
