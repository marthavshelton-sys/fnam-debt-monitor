// Hyperscaler Hub · Module 5: sites. Reads window.HYP_SITES (build-modules.mjs) and HYP_MAP (pre-projected base map,
// scripts/hyperscalers/build-map.mjs). Map positions are the locality / county / state / country the company names,
// never campus coordinates; circles mark a named town or county, diamonds a state or country. Marker size is fixed:
// MW use different definitions per company and are never compared by area.
(function () {
  'use strict';
  var F = window.HYP_FIN, H = window.HUB, S = window.HYP_SITES, M = window.HYP_MAP;
  if (!F || !H || !S) return;
  var t = H.t, esc = H.esc, set = function (id, h) { var e = document.getElementById(id); if (e) e.innerHTML = h; };
  var VIEW = 'na', CO = 'all', SEL = null;
  var ORDER = Object.keys(F.companies);
  function nm(tk) { return F.companies[tk] ? F.companies[tk].name : tk; }
  function sname(s) { return s.name || s['name_' + H.lang] || s.name_en; }
  function stL(st) { return { operating: t('En operación', 'Operating'), partial: t('Parcialmente en operación', 'Partially operating'), construction: t('En construcción', 'Under construction'), contracted: t('Contratado', 'Contracted'), development: t('En desarrollo', 'In development'), announced: t('Anunciado', 'Announced') }[st] || st; }
  function precL(p) { return { locality: t('localidad', 'locality'), county: t('condado', 'county'), state: t('estado o provincia', 'state or province'), country: t('país', 'country') }[p] || ''; }
  var CTRY = { US: ['EE. UU.', 'US'], CA: ['Canadá', 'Canada'], AU: ['Australia', 'Australia'], ES: ['España', 'Spain'], FI: ['Finlandia', 'Finland'], GB: ['Reino Unido', 'UK'], FR: ['Francia', 'France'], IS: ['Islandia', 'Iceland'], IL: ['Israel', 'Israel'] };
  function ctry(c) { var x = CTRY[c]; return x ? t(x[0], x[1]) : c; }
  function loc(s) { return [s.locality, s.region || s['region_' + H.lang], ctry(s.country)].filter(Boolean).join(', '); }
  function cust(s) { var c = s.customer || s['customer_' + H.lang] || ''; return H.lang === 'es' ? c.replace(/^Not disclosed by Oracle$/, 'No revelado por Oracle').replace(/\bvia\b/g, 'vía') : c; }
  // expected date and power: the Spanish field when the curated file has one; Oracle's store is English only (labeled)
  function enOnly(s, k) { return !s[k + '_' + H.lang] && s[k + '_en'] && H.lang === 'es' ? ' <span class="small muted">(texto de la empresa, en inglés)</span>' : ''; }
  function online(s) { var v = s['online_' + H.lang] || s.online_en; return v ? esc(v) + enOnly(s, 'online') : '<span class="nd">' + t('no revelada', 'not disclosed') + '</span>'; }
  function power(s) { var v = s['power_' + H.lang] || s.power_en; return v ? esc(v) + enOnly(s, 'power') : '<span class="nd">' + t('no revelada', 'not disclosed') + '</span>'; }
  // Oracle (T2) sources: one card listing every statement; a transcript without public address says so
  function t2card(s) {
    var xs = (s.sources || []).filter(function (x) { return x.tier === 'T2'; });
    if (!xs.length) return '';
    var rows = [];
    xs.forEach(function (x) {
      rows.push([t('Fuente', 'Source'), (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title || x.short) + '</a>' : esc((x.title || x.short) + (x.date ? ' · ' + H.date(x.date) : '') + (x.page ? ', p. ' + x.page : ''))), true]);
      H.noUrlRows(x).forEach(function (r) { rows.push(r); });
    });
    return H.src({ title: nm(s.ticker) + ' · ' + sname(s), rows: [[t('Nivel', 'Tier'), t('T2 · declaración de la empresa, no auditada', 'T2 · company statement, not audited')]].concat(rows) });
  }
  function proj(view, lon, lat) {
    var P = M[view].proj, rad = Math.PI / 180;
    if (view === 'world') return [P.t[0] + P.k * lon * rad, P.t[1] - P.k * lat * rad];
    var p0 = P.par[0] * rad, p1 = P.par[1] * rad, n = (Math.sin(p0) + Math.sin(p1)) / 2, C = Math.cos(p0) * Math.cos(p0) + 2 * n * Math.sin(p0);
    var l = (lon + P.rot) * rad, rho = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n, rho0 = Math.sqrt(C) / n;
    return [P.t[0] + P.k * rho * Math.sin(n * l), P.t[1] - P.k * (rho0 - rho * Math.cos(n * l))];
  }

  function header() {
    var withPt = S.sites.filter(function (s) { return s.lat != null; }).length;
    set('asofRow', '<span><b>' + t('Sitios', 'Sites') + '</b> ' + S.sites.length + ' (' + (S.sites.length - withPt) + ' ' + t('sin ubicación revelada', 'location not disclosed') + ')</span><span><b>' + t('Archivo curado', 'Curated file') + '</b> ' + H.date(S.updated) + '</span><span><b>' + t('Última actualización', 'Last refreshed') + '</b> ' + esc(S.refreshedET) + '</span>');
    set('notices', '<div class="notice warn"><b>' + t('Cobertura desigual.', 'Uneven coverage.') + '</b> ' + t('Las neonubes nombran sus campus en el 10-K; Microsoft, Alphabet y Amazon no nombran ninguno en sus presentaciones, y Meta solo sus coinversiones. Los campus de Oracle provienen de sus llamadas y comunicados (T2). La ausencia de un hiperescalador en el mapa es falta de divulgación, no falta de centros de datos.', 'The neoclouds name their campuses in the 10-K; Microsoft, Alphabet and Amazon name none in their filings, and Meta only its ventures. Oracle\'s campuses come from its calls and releases (T2). A hyperscaler missing from the map reflects missing disclosure, not missing data centers.') + '</div>');
  }

  function controls() {
    var tks = ORDER.filter(function (tk) { return S.sites.some(function (s) { return s.ticker === tk; }); });
    set('mapCtl', '<span class="ctl-lbl">' + t('Vista', 'View') + '</span><div class="seg" id="segView"><button type="button" data-v="na"' + (VIEW === 'na' ? ' class="active"' : '') + '>' + t('Norteamérica', 'North America') + '</button><button type="button" data-v="world"' + (VIEW === 'world' ? ' class="active"' : '') + '>' + t('Mundo', 'World') + '</button></div><span class="ctl-lbl">' + t('Empresa', 'Company') + '</span><select id="selCo"><option value="all">' + t('Todas', 'All') + '</option>' + tks.map(function (tk) { return '<option value="' + tk + '"' + (CO === tk ? ' selected' : '') + '>' + esc(nm(tk)) + '</option>'; }).join('') + '</select>');
    document.querySelectorAll('#segView button').forEach(function (b) { b.addEventListener('click', function () { VIEW = b.getAttribute('data-v'); controls(); map(); }); });
    document.getElementById('selCo').addEventListener('change', function (e) { CO = e.target.value; SEL = null; map(); table(); });
  }

  function points() {
    var pts = [];
    S.sites.forEach(function (s, i) {
      if (s.lat == null || (CO !== 'all' && s.ticker !== CO)) return;
      pts.push({ s: s, i: i, lat: s.lat, lon: s.lon, prec: s.precision });
      (s.extraPoints || []).forEach(function (e) { pts.push({ s: s, i: i, lat: e.lat, lon: e.lon, prec: s.precision }); });
    });
    return pts;
  }
  function map() {
    if (!M) { set('mapBox', '<p class="muted">' + t('Mapa no disponible.', 'Map not available.') + '</p>'); return; }
    var V = M[VIEW], pts = points();
    var groups = {};
    pts.forEach(function (p) {
      var xy = proj(VIEW, p.lon, p.lat);
      if (xy[0] < 0 || xy[0] > V.w || xy[1] < 0 || xy[1] > V.h) return;
      var key = Math.round(xy[0] / 9) + ':' + Math.round(xy[1] / 9);
      (groups[key] ||= []).push({ p: p, x: xy[0], y: xy[1] });
    });
    var marks = [];
    Object.values(groups).forEach(function (g) {
      g.forEach(function (m, j) {
        var a = g.length > 1 ? (j / g.length) * 2 * Math.PI : 0, rr = g.length > 1 ? 7 + g.length : 0;
        marks.push({ p: m.p, x: m.x + rr * Math.cos(a), y: m.y + rr * Math.sin(a) });
      });
    });
    var off = pts.length - marks.length;
    var r = VIEW === 'world' ? 4.2 : 5.5;
    var svg = '<svg viewBox="0 0 ' + V.w + ' ' + V.h + '" role="img" aria-label="' + t('Mapa de sitios', 'Sites map') + '" style="width:100%;height:auto;display:block">' +
      '<path d="' + V.land + '" fill="var(--surface-2)" stroke="none"/>' + (V.states ? '<path d="' + V.states + '" fill="none" stroke="var(--grid)" stroke-width="0.7"/>' : '') + '<path d="' + V.borders + '" fill="none" stroke="var(--baseline)" stroke-width="0.8"/>' +
      marks.map(function (m) {
        var s = m.p.s, c = H.color(s.ticker), solid = s.status === 'operating', half = s.status === 'partial', dash = s.status === 'announced' || s.status === 'development';
        var fill = solid ? c : half ? c : 'var(--surface)', sw = solid ? 1.2 : 2;
        var title = '<title>' + esc(nm(s.ticker) + ' · ' + sname(s) + ' · ' + stL(s.status) + (s.mw ? ' · ' + H.mw(s.mw).replace(/<[^>]+>/g, '') : '')) + '</title>';
        var shape = (m.p.prec === 'state' || m.p.prec === 'country') ? '<rect x="' + (m.x - r * 0.85).toFixed(1) + '" y="' + (m.y - r * 0.85).toFixed(1) + '" width="' + (r * 1.7).toFixed(1) + '" height="' + (r * 1.7).toFixed(1) + '" transform="rotate(45 ' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')"' : '<circle cx="' + m.x.toFixed(1) + '" cy="' + m.y.toFixed(1) + '" r="' + r + '"';
        var inner = half ? '<circle cx="' + m.x.toFixed(1) + '" cy="' + m.y.toFixed(1) + '" r="' + (r * 0.45).toFixed(1) + '" fill="var(--surface)" pointer-events="none"/>' : '';
        return '<g class="mk" data-i="' + m.p.i + '" style="cursor:pointer" tabindex="0">' + title + shape + ' fill="' + fill + '" stroke="' + c + '" stroke-width="' + sw + '"' + (dash ? ' stroke-dasharray="2.5 1.8"' : '') + (SEL === m.p.i ? ' style="filter:drop-shadow(0 0 3px ' + c + ')"' : '') + '/>' + inner + '</g>';
      }).join('') + '</svg>';
    set('mapBox', svg + (off > 0 ? '<p class="small muted">' + t(off + ' punto(s) fuera de esta vista; cambie a "Mundo".', off + ' point(s) outside this view; switch to "World".') + '</p>' : ''));
    document.querySelectorAll('#mapBox .mk').forEach(function (g) {
      var go = function () { SEL = +g.getAttribute('data-i'); info(); map(); };
      g.addEventListener('click', go); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    var used = {}; S.sites.forEach(function (s) { if (CO === 'all' || s.ticker === CO) used[s.ticker] = 1; });
    set('mapLeg', ORDER.filter(function (tk) { return used[tk]; }).map(function (tk) { return '<span><i style="background:' + H.color(tk) + ';border-radius:50%"></i>' + esc(nm(tk)) + '</span>'; }).join('') +
      '<span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="var(--text-secondary)"/></svg>' + t('en operación', 'operating') + '</span><span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="var(--text-secondary)"/><circle cx="7" cy="7" r="2.2" fill="var(--surface)"/></svg>' + t('parcial', 'partial') + '</span><span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--text-secondary)" stroke-width="2"/></svg>' + t('en construcción / contratado', 'under construction / contracted') + '</span><span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-dasharray="2.5 1.8"/></svg>' + t('en desarrollo / anunciado', 'in development / announced') + '</span><span><svg width="14" height="14" aria-hidden="true"><rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill="none" stroke="var(--text-secondary)" stroke-width="1.6"/></svg>' + t('ubicación aproximada: estado o país', 'approximate location: state or country') + '</span>');
    set('mapDesc', t('Toque un punto para ver la ficha del sitio. Círculo = localidad o condado que nombra la empresa; rombo = solo el estado o país. Puntos que coinciden se separan ligeramente. El tamaño es fijo: los MW usan definiciones distintas por empresa.', 'Tap a dot to see the site card. Circle = locality or county the company names; diamond = state or country only. Overlapping dots are spread slightly. Size is fixed: MW use different definitions per company.'));
    set('mapStamp', H.stamp({ asOf: t('varía por sitio', 'varies by site'), refreshed: S.refreshedET, sources: [{ label: t('10-K, 10-Q y 20-F (SEC EDGAR)', '10-K, 10-Q and 20-F (SEC EDGAR)') }, { label: t('Oracle (T2)', 'Oracle (T2)'), url: '/oracle/' }, { label: M ? (H.lang === 'es' ? 'Mapa base: Natural Earth; Censo de EE. UU.' : 'Base map: Natural Earth; U.S. Census Bureau') : '' }], csv: '/hiperescaladores/csv/sites.csv', note: '<a href="/hiperescaladores/sitios/quality.html">' + t('Calidad de datos', 'Data quality') + '</a>' }));
  }

  function card(s) {
    var rows = [];
    var mw = s.mw != null ? H.mw(s.mw) + ' · ' + esc(H.metricLabel(s.mwMetric)) : '<span class="nd">' + t('MW no revelados para este sitio', 'MW not disclosed for this site') + '</span>';
    rows.push([t('Capacidad', 'Capacity'), mw]);
    rows.push([t('Estado', 'Status'), esc(stL(s.status)) + (s.subsequent ? ' <span class="flag">' + t('posterior al balance', 'after balance-sheet date') + '</span>' : '')]);
    if (s['online_' + H.lang] || s.online_en) rows.push([t('Entrada en operación', 'Expected online'), esc(s['online_' + H.lang] || s.online_en) + (s.tier === 'T2' && H.lang === 'es' ? ' <span class="small muted">(texto de Oracle, en inglés)</span>' : '')]);
    if (cust(s)) rows.push([t('Cliente', 'Customer'), esc(cust(s))]);
    if (s.developer) rows.push([t('Desarrollador', 'Developer'), esc(s.developer)]);
    if (s['power_' + H.lang]) rows.push([t('Energía', 'Power'), esc(s['power_' + H.lang])]);
    if (s['note_' + H.lang]) rows.push([t('Nota', 'Note'), esc(s['note_' + H.lang])]);
    if (s.oracleStatus && H.lang === 'en') rows.push(['Oracle', esc(s.oracleStatus)]);
    rows.push([t('Ubicación en el mapa', 'Map position'), s.precision ? esc(precL(s.precision)) + t(' nombrada por la empresa (no son coordenadas del campus)', ' named by the company (not campus coordinates)') : t('no revelada: sin punto en el mapa', 'not disclosed: no map point')]);
    var src = s.src ? H.cite(nm(s.ticker) + ' · ' + sname(s), s.src) + ' ' + esc((s.src.form || '') + ' p. ' + (s.src.page || s.src.pageSeq)) : (s.sources || []).filter(function (x) { return x.tier === 'T2'; }).map(function (x) { return x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title || x.short) + '</a>' : esc((x.title || x.short) + (x.page ? ', p. ' + x.page : '')) + ' <span class="small muted">(' + t('sin enlace público', 'no public link') + ')</span>' + (x.companion ? ' · <a href="' + esc(x.companion.url) + '" target="_blank" rel="noopener">' + t('comunicado del mismo día', 'same-day release') + '</a>' : ''); }).join(' · ') + t2card(s);
    rows.push([t('Fuente', 'Source'), H.tier(s.tier) + ' ' + src]);
    return '<div class="callout" style="margin-top:12px"><b>' + H.coName(s.ticker) + ' · ' + esc(sname(s)) + '</b><br><span class="small muted">' + esc(loc(s) || s['region_' + H.lang] || '') + '</span><table style="margin-top:6px"><tbody>' + rows.map(function (r) { return '<tr><td class="l" style="white-space:nowrap;color:var(--muted);width:1%">' + r[0] + '</td><td class="l" style="white-space:normal">' + r[1] + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function info() { set('mapInfo', SEL != null ? card(S.sites[SEL]) : '<p class="small muted" style="margin-top:10px">' + t('Seleccione un punto del mapa o una fila de la tabla.', 'Select a dot on the map or a row in the table.') + '</p>'); }

  function table() {
    set('tbDesc', t('Todos los sitios, incluidos los que la empresa no ubica (sin punto en el mapa), con fecha esperada, cliente y energía como los indica la empresa. MW con la definición de cada empresa; "MW no revelados" cuando la empresa nombra el sitio sin capacidad. Haga clic en un encabezado para ordenar.', 'All sites, including those the company does not locate (no map point), with expected date, customer and power as the company states them. MW under each company\'s definition; "MW not disclosed" when the company names the site without capacity. Click a column heading to sort.'));
    var rows = S.sites.map(function (s, i) { return { s: s, i: i }; }).filter(function (r) { return CO === 'all' || r.s.ticker === CO; }).sort(function (a, b) { return ORDER.indexOf(a.s.ticker) - ORDER.indexOf(b.s.ticker); });
    var body = rows.map(function (r) {
      var s = r.s;
      return '<tr data-i="' + r.i + '" style="cursor:pointer"><td class="l">' + H.coName(s.ticker) + '</td><td class="l" style="white-space:normal;min-width:200px">' + esc(sname(s)) + (s.subsequent ? ' <span class="flag">' + t('posterior', 'subsequent') + '</span>' : '') + '<br><span class="small muted">' + (s.lat != null ? esc(loc(s)) : esc(s['region_' + H.lang] || t('ubicación no revelada', 'location not disclosed'))) + '</span></td><td>' + (s.mw != null ? H.mw(s.mw) + '<br><span class="small muted">' + esc(H.metricLabel(s.mwMetric)) + '</span>' : '<span class="nd">' + t('no revelados', 'not disclosed') + '</span>') + '</td><td class="l">' + esc(stL(s.status)) + '</td><td class="l" style="white-space:normal;min-width:150px">' + online(s) + '</td><td class="l" style="white-space:normal;min-width:150px">' + esc(cust(s)) + '</td><td class="l" style="white-space:normal;min-width:170px">' + power(s) + '</td><td class="l">' + H.tier(s.tier) + (s.src ? H.cite(nm(s.ticker) + ' · ' + sname(s), s.src) : t2card(s)) + '</td></tr>';
    }).join('');
    var mob = rows.map(function (r) { var s = r.s; return '<div class="mrow" data-i="' + r.i + '"><div class="h"><b><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;background:' + H.color(s.ticker) + '"></span>' + esc(sname(s)) + '</b><span class="v">' + (s.mw != null ? H.mw(s.mw) : t('MW n.d.', 'MW n.d.')) + '</span></div><div class="c">' + esc(nm(s.ticker)) + ' · ' + esc(s.lat != null ? loc(s) : (s['region_' + H.lang] || '')) + ' · ' + esc(stL(s.status)) + (s.mw != null ? ' · ' + esc(H.metricLabel(s.mwMetric)) : '') + ((s['online_' + H.lang] || s.online_en) ? ' · ' + t('fecha esperada: ', 'expected: ') + esc(s['online_' + H.lang] || s.online_en) : '') + ((s['power_' + H.lang] || s.power_en) ? ' · ' + t('energía: ', 'power: ') + esc(s['power_' + H.lang] || s.power_en) : '') + '</div></div>'; }).join('');
    set('tbTbl', '<div class="only-d"><table><thead><tr><th class="l">' + t('Empresa', 'Company') + '</th><th class="l">' + t('Sitio y ubicación', 'Site and location') + '</th><th>MW</th><th class="l">' + t('Estado', 'Status') + '</th><th class="l">' + t('Fecha esperada', 'Expected date') + '</th><th class="l">' + t('Cliente', 'Customer') + '</th><th class="l">' + t('Energía', 'Power') + '</th><th class="l">' + t('Fuente', 'Source') + '</th></tr></thead><tbody>' + body + '</tbody></table></div><div class="only-m">' + mob + '</div>');
    document.querySelectorAll('#tbTbl [data-i]').forEach(function (el) { el.addEventListener('click', function (e) { if (e.target.closest('.src-btn')) return; SEL = +el.getAttribute('data-i'); var s = S.sites[SEL]; if (s.lat != null && VIEW === 'na' && (s.lon > -50 || s.lon < -140 || s.lat < 15)) VIEW = 'world'; controls(); map(); info(); document.getElementById('map').scrollIntoView({ behavior: 'smooth' }); }); });
    set('tbStamp', H.stamp({ refreshed: S.refreshedET, sources: [{ label: t('10-K, 10-Q y 20-F; Oracle (T2)', '10-Ks, 10-Qs and 20-F; Oracle (T2)') }], csv: '/hiperescaladores/csv/sites.csv' }));
  }

  function foot() { set('foot', t('Fuentes: 10-K, 10-Q y 20-F (SEC EDGAR), con página y frase citadas; Oracle (T2): llamadas de resultados y comunicados, del almacén del modelo de Oracle. Mapa base: Natural Earth (world-atlas) y Oficina del Censo de EE. UU. (us-atlas). ', 'Sources: 10-Ks, 10-Qs and 20-F (SEC EDGAR), with page and quoted sentence; Oracle (T2): earnings calls and releases, from the Oracle model store. Base map: Natural Earth (world-atlas) and U.S. Census Bureau (us-atlas). ') + '<a href="/hiperescaladores/metodologia/">' + t('Metodología', 'Methodology') + '</a> · ' + t('Nada en esta página es una recomendación de inversión.', 'Nothing on this page is investment advice.')); }
  H.onLang(function () { header(); controls(); map(); info(); table(); foot(); });
})();
