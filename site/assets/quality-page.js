// Renderer for the hidden owner data-quality pages (site/<slug>/quality.html). One design for every model,
// copied from the Quálitas page the owner liked. The shell page sets window.QUALITY_PAGE before loading this:
//   { key: 'GAP_QUALITY', name: 'GAP', lang: 'gap-lang' }
// and includes data/quality.js, which the validator writes after every run:
//   { generatedAt, ok, counts:{checks,ok,warn,fail}, latestQuarter, expectedQuarter, coverage:{...}, financialsGeneratedAt,
//     cards:[{v,l:{es,en}}], checks:[{tag,check,status,diff,tol,note}], stale:[{series,lastDate,ageDays,limitDays,status,note}],
//     curated:[{file,status,detail}], parse:[{file,msg}], origins:[{id,origin,title,url,date,page}], tolerances:{es,en} }
(function () {
  const CFG = window.QUALITY_PAGE || {};
  const Q = window[CFG.key] || null;
  let LANG = 'es'; try { LANG = localStorage.getItem(CFG.lang || 'q-lang') || 'es'; } catch (e) { /* ignore */ }
  const T = { ok: { es: 'OK', en: 'OK' }, warn: { es: 'Aviso', en: 'Warning' }, fail: { es: 'Falla', en: 'Fail' }, all: { es: 'Todos', en: 'All' } };
  const t = (k) => (T[k] ? T[k][LANG] : k);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const L = (x) => (x && typeof x === 'object' ? (x[LANG] || x.es || x.en || '') : (x || ''));
  const fmtDate = (iso) => (iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString(LANG === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
  const dateish = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? fmtDate(v) : (v || '—'));
  const st = (s) => `<span class="st ${s}">${t(s)}</span>`;
  const el = (id) => document.getElementById(id);
  const set = (id, html) => { const e = el(id); if (e) e.innerHTML = html; };
  let filter = 'all', showAllOrigins = false;

  function render() {
    document.querySelectorAll('.es').forEach((e) => { e.hidden = LANG !== 'es'; }); document.querySelectorAll('.en').forEach((e) => { e.hidden = LANG !== 'en'; });
    el('es').classList.toggle('active', LANG === 'es'); el('en').classList.toggle('active', LANG === 'en');
    document.documentElement.lang = LANG === 'es' ? 'es-MX' : 'en';
    const es = LANG === 'es';
    if (!Q) { set('meta', es ? 'data/quality.js no existe todavía: ejecute el validador.' : 'data/quality.js does not exist yet: run the validator.'); return; }
    const badge = Q.ok ? (Q.counts && Q.counts.warn ? 'warn' : 'ok') : 'fail';
    const badgeTxt = Q.ok ? (Q.counts && Q.counts.warn ? (es ? `sin fallas · ${Q.counts.warn} ${Q.counts.warn === 1 ? 'aviso' : 'avisos'}` : `no failures · ${Q.counts.warn} ${Q.counts.warn === 1 ? 'warning' : 'warnings'}`) : (es ? 'sin fallas' : 'no failures')) : (es ? 'con fallas: no se publicó' : 'failures: not published');
    set('meta', `${es ? 'Generado' : 'Generated'} ${fmtDate(Q.generatedAt)} · ${es ? 'datos financieros del' : 'financial data of'} ${fmtDate(Q.financialsGeneratedAt)} · <span class="badge ${badge}">${badgeTxt}</span>`);
    const c = Q.counts || {};
    const cards = [
      [c.checks, es ? 'identidades verificadas' : 'identities checked'], [c.ok, 'OK'], [c.warn, es ? 'avisos' : 'warnings'], [c.fail, es ? 'fallas' : 'failures'],
      [Q.latestQuarter, es ? 'último trimestre' : 'latest quarter'], [Q.expectedQuarter, es ? 'esperado por calendario' : 'expected by calendar'],
      ...((Q.cards || []).map((x) => [x.v, L(x.l)])),
    ];
    set('cards', cards.map(([v, l]) => `<div class="card"><div class="v">${v == null ? '—' : esc(v)}</div><div class="l">${esc(l)}</div></div>`).join(''));
    set('stale', `<table><thead><tr><th>${es ? 'Serie' : 'Series'}</th><th>${es ? 'Última fecha' : 'Last date'}</th><th>${es ? 'Antigüedad (días)' : 'Age (days)'}</th><th>${es ? 'Límite' : 'Limit'}</th><th>${es ? 'Estado' : 'Status'}</th><th>${es ? 'Nota' : 'Note'}</th></tr></thead><tbody>${(Q.stale || []).map((s) => `<tr><td>${esc(s.series)}</td><td>${esc(dateish(s.lastDate))}</td><td class="n">${s.ageDays == null ? '—' : s.ageDays}</td><td class="n">${s.limitDays == null ? '—' : s.limitDays}</td><td>${st(s.status)}</td><td>${esc(L(s.note))}</td></tr>`).join('')}</tbody></table>`);
    set('curated', `<table><thead><tr><th>${es ? 'Archivo' : 'File'}</th><th>${es ? 'Estado' : 'Status'}</th><th>${es ? 'Detalle' : 'Detail'}</th></tr></thead><tbody>${(Q.curated || []).map((s) => `<tr><td>${esc(s.file)}</td><td>${st(s.status)}</td><td>${esc(L(s.detail))}</td></tr>`).join('')}</tbody></table>`);
    // origin of every quarter (newest first; the last 12 by default)
    const og = (Q.origins || []).slice().reverse();
    if (el('origins')) {
      const rows = showAllOrigins ? og : og.slice(0, 12);
      const pill = (o) => `<span class="pill ${esc(o)}">${esc(o)}</span>`;
      set('origins', og.length ? `<table><thead><tr><th>${es ? 'Trimestre' : 'Quarter'}</th><th>${es ? 'Origen' : 'Origin'}</th><th>${es ? 'Fuente' : 'Source'}</th><th>${es ? 'Fecha' : 'Date'}</th><th>${es ? 'Partes' : 'Parts'}</th></tr></thead><tbody>${rows.map((o) => `<tr><td>${esc(o.id)}</td><td>${pill(o.origin)}</td><td>${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.title || o.url)}</a>` : esc(o.title || '—')}${o.page ? ` · p. ${esc(o.page)}` : ''}</td><td>${esc(dateish(o.date))}</td><td>${esc(o.parts || '')}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">—</div>`);
      set('originsMore', og.length > 12 ? `<button type="button" id="btnOrigins">${showAllOrigins ? (es ? 'Mostrar sólo los últimos 12' : 'Show only the last 12') : (es ? `Mostrar los ${og.length} trimestres` : `Show all ${og.length} quarters`)}</button>` : '');
      const b = el('btnOrigins'); if (b) b.addEventListener('click', () => { showAllOrigins = !showAllOrigins; render(); });
    }
    const p = Q.parse || [];
    set('parse', p.length ? `<table><thead><tr><th>${es ? 'Archivo' : 'File'}</th><th>${es ? 'Aviso' : 'Warning'}</th></tr></thead><tbody>${p.map((w) => `<tr><td>${esc(w.file || '')}</td><td>${esc(w.msg)}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">${es ? 'Sin avisos en el último parseo.' : 'No warnings in the last parse.'}</div>`);
    set('tolNote', esc(L(Q.tolerances)));
    const checks = Q.checks || [];
    const counts = { all: checks.length, fail: checks.filter((x) => x.status === 'fail').length, warn: checks.filter((x) => x.status === 'warn').length, ok: checks.filter((x) => x.status === 'ok').length };
    set('filters', ['all', 'fail', 'warn', 'ok'].map((k) => `<button type="button" data-f="${k}" class="${filter === k ? 'active' : ''}" aria-pressed="${filter === k}">${t(k)} (${counts[k]})</button>`).join(''));
    document.querySelectorAll('#filters button').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
    const order = { fail: 0, warn: 1, ok: 2 };
    const rows = checks.filter((x) => filter === 'all' || x.status === filter).slice().sort((a, b) => (order[a.status] - order[b.status]) || String(b.tag).localeCompare(String(a.tag)));
    const unit = L(Q.diffUnit) || (es ? 'Diferencia' : 'Difference');
    set('checks', rows.length ? `<table><thead><tr><th>${es ? 'Periodo' : 'Period'}</th><th>${es ? 'Cuadre' : 'Check'}</th><th>${esc(unit)}</th><th>${es ? 'Tolerancia' : 'Tolerance'}</th><th>${es ? 'Estado' : 'Status'}</th><th>${es ? 'Nota' : 'Note'}</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${esc(x.tag)}</td><td>${esc(x.check)}</td><td class="n">${x.diff == null ? '—' : Number(x.diff).toLocaleString(es ? 'es-MX' : 'en-US', { maximumFractionDigits: 3 })}</td><td class="n">${x.tol == null ? '—' : x.tol}</td><td>${st(x.status)}</td><td>${esc(L(x.note))}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">—</div>`);
  }
  el('es').addEventListener('click', () => { LANG = 'es'; try { localStorage.setItem(CFG.lang || 'q-lang', 'es'); } catch (e) { /* ignore */ } render(); });
  el('en').addEventListener('click', () => { LANG = 'en'; try { localStorage.setItem(CFG.lang || 'q-lang', 'en'); } catch (e) { /* ignore */ } render(); });
  render();
})();
