// Shared provenance and freshness helpers for the fiscal dashboards (site/mx/fiscal, site/fiscal).
//
//   FNAM_PROV.through(date, lang)        "Data through 29 Sep 2026" / "Datos al 29 sep 2026"
//                                        (accepts YYYY-MM-DD, YYYY-MM, YYYY-Qn, YYYY)
//   FNAM_PROV.businessDays(from, to, cal) business days strictly after `from` up to `to` ("us" | "mx")
//   FNAM_PROV.freshness(date, rule, cal, today) -> { level: 'ok' | 'amber', age, unit, allowance }
//   FNAM_PROV.kind(k, lang)              badge for k = 'R' (reported), 'C' (FNAM calculation), 'E' (FNAM estimate)
//   FNAM_PROV.src(p, lang)               the ⓘ marker carrying one data point's source, id, date and link
//   FNAM_PROV.amber(text)                the amber warning chip
//   FNAM_PROV.legend(lang)               the three-kind legend
//
// Every page shows the latest observation date of every block, never "live", and every warning is
// computed in the reader's browser against today's date, so a feed that stops updating turns amber
// on its own even when no workflow runs.
(function(){
  var MON_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MON_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function iso(d){ return d.toISOString().slice(0,10); }
  function utc(y, m, d){ return new Date(Date.UTC(y, m, d)); }

  // "2026-09-29" -> "29 Sep 2026"; "2026-08" -> "Aug 2026"; "2026-Q2" -> "Q2 2026"; "2025" -> "2025".
  function fmt(date, lang){
    var s = String(date || ''), m;
    var mon = lang === 'en' ? MON_EN : MON_ES;
    if((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return (+m[3])+' '+mon[+m[2]-1]+' '+m[1];
    if((m = /^(\d{4})-(\d{2})$/.exec(s))) return mon[+m[2]-1]+' '+m[1];
    if((m = /^(\d{4})-Q([1-4])$/.exec(s))) return (lang === 'en' ? 'Q' : 'T')+m[2]+' '+m[1];
    if(/^\d{4}$/.test(s)) return s;
    return s || '—';
  }
  function through(date, lang){
    if(!date) return lang === 'en' ? 'No data date' : 'Sin fecha de datos';
    return (lang === 'en' ? 'Data through ' : (/^\d{4}-\d{2}-\d{2}/.test(String(date)) ? 'Datos al ' : 'Datos a '))+fmt(date, lang);
  }

  // ---- holiday calendars (computed, so they never need yearly maintenance) ----
  function nthDow(y, m, dow, n){ var d = utc(y, m, 1), add = (dow - d.getUTCDay() + 7) % 7; return utc(y, m, 1 + add + 7*(n-1)); }
  function lastDow(y, m, dow){ var d = utc(y, m+1, 0), sub = (d.getUTCDay() - dow + 7) % 7; return utc(y, m+1, -sub); }
  function observed(d){ var w = d.getUTCDay(); return w === 6 ? utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()-1) : w === 0 ? utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()+1) : d; }
  function easter(y){ var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return utc(y, mo-1, da); }
  var cache = {};
  function holidays(y, cal){
    var key = cal+y; if(cache[key]) return cache[key];
    var list;
    if(cal === 'us'){ // U.S. federal holidays (Treasury and Federal Reserve publish nothing on them)
      list = [observed(utc(y,0,1)), nthDow(y,0,1,3), nthDow(y,1,1,3), lastDow(y,4,1), observed(utc(y,5,19)), observed(utc(y,6,4)),
              nthDow(y,8,1,1), nthDow(y,9,1,2), observed(utc(y,10,11)), nthDow(y,10,4,4), observed(utc(y,11,25))];
    } else { // Mexican bank holidays (CNBV calendar: Banxico and SHCP publish nothing on them)
      var e = easter(y);
      list = [utc(y,0,1), nthDow(y,1,1,1), nthDow(y,2,1,3), utc(y,e.getUTCMonth(),e.getUTCDate()-3), utc(y,e.getUTCMonth(),e.getUTCDate()-2),
              utc(y,4,1), utc(y,8,16), nthDow(y,10,1,3), utc(y,11,12), utc(y,11,25)];
      if(y % 6 === 0) list.push(utc(y,9,1)); // presidential inauguration (2024, 2030…)
    }
    return (cache[key] = list.map(iso));
  }
  function isBusiness(d, cal){ var w = d.getUTCDay(); return w !== 0 && w !== 6 && holidays(d.getUTCFullYear(), cal).indexOf(iso(d)) < 0; }
  function businessDays(from, to, cal){
    var a = new Date(from+'T00:00:00Z'), b = new Date(to+'T00:00:00Z'), n = 0;
    if(!(a < b)) return 0;
    for(var d = utc(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()+1); d <= b; d = utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()+1)) if(isBusiness(d, cal)) n++;
    return n;
  }
  function todayIso(){ var q = /[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(location.search); return q ? q[1] : iso(new Date()); } // ?asof= for tests
  // End of the period a date stamp stands for: YYYY-MM -> last day of the month, YYYY-Qn -> quarter end, YYYY -> 31 Dec.
  function periodEnd(date){
    var s = String(date), m;
    if((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return s.slice(0,10);
    if((m = /^(\d{4})-(\d{2})$/.exec(s))) return iso(utc(+m[1], +m[2], 0));
    if((m = /^(\d{4})-Q([1-4])$/.exec(s))) return iso(utc(+m[1], 3*m[2], 0));
    if(/^\d{4}$/.test(s)) return s+'-12-31';
    return null;
  }
  // rule: { bd: n } -> amber after n business days without a newer observation (daily series);
  //       { days: n } -> amber n calendar days after the END of the stamped period (weekly, monthly, quarterly).
  function freshness(date, rule, cal, today){
    today = today || todayIso();
    var end = periodEnd(date);
    if(!end) return { level:'amber', age:null, unit:'', allowance:null, missing:true };
    if(rule.bd != null){ var bd = businessDays(end, today, cal || 'us'); return { level: bd > rule.bd ? 'amber' : 'ok', age: bd, unit: 'bd', allowance: rule.bd }; }
    var days = Math.floor((Date.parse(today+'T00:00:00Z') - Date.parse(end+'T00:00:00Z'))/86400000);
    return { level: days > rule.days ? 'amber' : 'ok', age: days, unit: 'd', allowance: rule.days };
  }
  function ageText(f, lang){
    if(f.missing) return lang === 'en' ? 'no date' : 'sin fecha';
    return f.age+' '+(f.unit === 'bd' ? (lang === 'en' ? 'business days' : 'días hábiles') : (lang === 'en' ? 'days' : 'días'));
  }

  // ---- visual vocabulary ----
  var KINDS = {
    R: { es:'Reportado', en:'Reported', tip_es:'Cifra tal como la publica la fuente oficial.', tip_en:'Figure as published by the official source.' },
    C: { es:'Cálculo FNAM', en:'FNAM calculation', tip_es:'FNAM la calcula con cifras reportadas (p. ej. razones, sumas de 12 meses, variaciones reales); el método está en la nota.', tip_en:'Computed by FNAM from reported figures (e.g. ratios, 12-month sums, real changes); the method is in the note.' },
    E: { es:'Estimación FNAM', en:'FNAM estimate', tip_es:'Aproximación o supuesto de FNAM; no es una cifra publicada.', tip_en:'An FNAM approximation or assumption; not a published figure.' }
  };
  function kind(k, lang){ var d = KINDS[k]; if(!d) return ''; return '<span class="pk pk-'+k+'" title="'+esc(lang === 'en' ? d.tip_en : d.tip_es)+'">'+esc(lang === 'en' ? d.en : d.es)+'</span>'; }
  var SHORT = { R:{ es:'tal como lo publica la fuente', en:'as published by the source' }, C:{ es:'calculado por FNAM con cifras reportadas', en:'computed by FNAM from reported figures' }, E:{ es:'aproximación de FNAM', en:'FNAM approximation' } };
  function legend(lang){ return '<span class="pk-legend">'+['R','C','E'].map(function(k){ return kind(k, lang)+' <span class="pk-legend-t">'+esc(SHORT[k][lang === 'en' ? 'en' : 'es'])+'</span>'; }).join(' ')+'<span class="pk-legend-t">· ⓘ '+(lang === 'en' ? 'source and date of each figure' : 'fuente y fecha de cada cifra')+'</span></span>'; }
  // p: { src:'Banxico SIE SF43783', url:'https://…', date:'2026-09-25', note:'…' } (or an array of them)
  function src(p, lang){
    var ps = [].concat(p || []).filter(function(x){ return x && (x.src || x.url); });
    if(!ps.length) return '';
    var tip = ps.map(function(x){ return (x.src||'')+(x.date ? ' · '+through(x.date, lang) : '')+(x.note ? ' · '+x.note : ''); }).join(' | ');
    var url = ps[0].url;
    return url ? '<a class="pv" href="'+esc(url)+'" target="_blank" rel="noopener" title="'+esc(tip)+'" aria-label="'+esc(tip)+'">ⓘ</a>'
               : '<span class="pv" title="'+esc(tip)+'" tabindex="0" aria-label="'+esc(tip)+'">ⓘ</span>';
  }
  function amber(text, tip){ return '<span class="amber-flag"'+(tip ? ' title="'+esc(tip)+'"' : '')+'>'+esc(text)+'</span>'; }

  // One stylesheet for both pages (tokens fall back to neutral colors when a page lacks them).
  var css = '.pk{display:inline-block;font:700 11px/1.5 Inter,system-ui,sans-serif;letter-spacing:.02em;border-radius:4px;padding:0 6px;margin-left:6px;vertical-align:middle;white-space:nowrap;cursor:help;border:1px solid}'
    +'.pk-R{color:var(--text-secondary,#555);border-color:var(--border,#ccc);background:transparent}'
    +'.pk-C{color:#1d4ed8;border-color:#93c5fd;background:#eff6ff}'
    +'.pk-E{color:#7c2d12;border-color:#fdba74;background:#fff7ed;border-style:dashed}'
    +':root[data-theme="dark"] .pk-C{color:#bfdbfe;border-color:#3b82f6;background:#172554}:root[data-theme="dark"] .pk-E{color:#fed7aa;border-color:#f97316;background:#431407}'
    +'@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .pk-C{color:#bfdbfe;border-color:#3b82f6;background:#172554}:root:not([data-theme="light"]) .pk-E{color:#fed7aa;border-color:#f97316;background:#431407}}'
    +'.pk-legend{display:inline-flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12px;color:var(--muted,#666)}.pk-legend .pk{margin-left:0}.pk-legend-t{margin-right:8px}'
    +'.pv{display:inline-block;margin-left:4px;font-size:11px;line-height:1;color:var(--muted,#777);text-decoration:none;cursor:help;vertical-align:super}.pv:hover,.pv:focus{color:var(--accent,#1d4ed8)}'
    +'.amber-flag{display:inline-block;font:700 11px/1.5 Inter,system-ui,sans-serif;color:#6b4b00;background:#fff4d6;border:1px solid #e0a800;border-radius:100px;padding:1px 9px;margin-left:6px;vertical-align:middle;cursor:help}'
    +':root[data-theme="dark"] .amber-flag{color:#ffd98a;background:#3a2c05}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .amber-flag{color:#ffd98a;background:#3a2c05}}'
    +'.data-through{font-weight:600;color:var(--text-secondary,#444)}';
  if(typeof document !== 'undefined' && !document.getElementById('fnam-prov-css')){ var st = document.createElement('style'); st.id = 'fnam-prov-css'; st.textContent = css; document.head.appendChild(st); }

  var api = { fmt:fmt, through:through, businessDays:businessDays, freshness:freshness, ageText:ageText, periodEnd:periodEnd, today:todayIso, holidays:holidays, kind:kind, legend:legend, src:src, amber:amber, esc:esc };
  if(typeof window !== 'undefined') window.FNAM_PROV = api;
  if(typeof module !== 'undefined') module.exports = api;
})();
