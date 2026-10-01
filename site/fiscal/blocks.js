// Provenance layer for the U.S. fiscal monitor (site/fiscal/index.html). Runs after the page has rendered and again
// whenever the language changes or the KPI strip is rebuilt. For every card it adds:
//   * a kind badge on the heading and on each figure: Reported / FNAM calculation / FNAM estimate;
//   * "Data through <date>" at the end of the source line (one is added where the card had none);
//   * an amber flag when a data point is older than its allowance (site/fiscal/freshness-rules.js, the same table
//     scripts/fiscal/check-freshness.mjs alarms on), or when data.js has no value for it and the page is showing the
//     values stored in its own code (never silent);
//   * the source, series and date of each figure behind an ⓘ, and in every chart tooltip;
//   * the header notice (#dataWarn, both languages): every data point past its allowance, and a data file that has
//     missed two refreshes (36 hours). Left alone when the data files did not load: the page writes that notice.
// Debt to the Penny turns amber after 2 U.S. business days without a new close (federal holidays excluded).
(function(){
  var PV = window.FNAM_PROV; if(!PV) return;
  var LD = window.LIVE_DATA || {}, MD = window.MONTHLY_DATA || {};
  var RULE = {}; ((window.FISCAL_FRESHNESS || {}).points || []).forEach(function(r){ RULE[r.id] = r; });
  function lang(){ return document.documentElement.getAttribute('lang') === 'es-MX' ? 'es' : 'en'; }
  function T(es, en){ return lang() === 'en' ? en : es; }
  function get(o, path){ return path.split('.').reduce(function(x, k){ return x == null ? undefined : x[k]; }, o); }

  // Each rule's latest date in the stamp form provenance.js expects (month -> YYYY-MM, quarter -> YYYY-Qn, year -> YYYY).
  function dateOf(id){
    var r = RULE[id]; if(!r) return null;
    var d = get(r.file === 'monthly' ? MD : LD, r.path); if(!d) return null; d = String(d);
    if(/^\d{4}-\d{2}$/.test(d)) d += '-01';
    if(!/^\d{4}-\d{2}-\d{2}/.test(d)) return null;
    if(r.period === 'month') return d.slice(0,7);
    if(r.period === 'quarter') return d.slice(0,4)+'-Q'+(Math.floor((+d.slice(5,7)-1)/3)+1);
    if(r.period === 'year') return d.slice(0,4);
    return d.slice(0,10);
  }
  function fresh(id){
    var r = RULE[id], d = dateOf(id);
    if(!r) return { level:'ok' };
    if(!d) return { level:'amber', missing:true };
    return PV.freshness(d, r.bd != null ? { bd:r.bd } : { days:r.days }, 'us');
  }
  function amberFor(ids){
    var out = '';
    ids.forEach(function(id){
      var r = RULE[id], f = fresh(id); if(!r || f.level !== 'amber') return;
      if(f.missing) out += PV.amber(T('Sin actualizar: se muestran valores guardados','Not refreshed: showing stored values'), r.label+' — '+T('la última descarga no trajo este dato; las cifras son las guardadas en la página','the last download returned no value; the figures are the ones stored in the page'));
      else out += PV.amber(T('Desactualizado: ','Out of date: ')+PV.ageText(f, lang())+(r.bd != null ? '' : T(' tras el cierre del periodo',' after period end')), r.label+' — '+PV.ageText(f, lang())+' ('+T('tolerancia ','allowance ')+(r.bd != null ? r.bd+' '+T('días hábiles','business days') : r.days+' '+T('días','days'))+') · '+r.source);
    });
    return out;
  }

  // Where each data point comes from (shown behind the ⓘ and in chart tooltips).
  var SRC = {
    debt:{ s:'U.S. Treasury, Debt to the Penny', u:'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny' },
    holders:{ s:'Treasury Bulletin, OFS-2 (ownership of Treasury securities)', u:'https://fiscaldata.treasury.gov/datasets/treasury-bulletin/' },
    foreignHolders:{ s:'Treasury International Capital, major foreign holders (SLT table 5)', u:'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.txt' },
    debtComposition:{ s:'U.S. Treasury, Monthly Statement of the Public Debt, table 1', u:'https://fiscaldata.treasury.gov/datasets/monthly-statement-public-debt/' },
    avgMaturity:{ s:'U.S. Treasury, Monthly Statement of the Public Debt, table 3 (security level)', u:'https://fiscaldata.treasury.gov/datasets/monthly-statement-public-debt/' },
    avgRate:{ s:'U.S. Treasury, Average Interest Rates on U.S. Treasury Securities', u:'https://fiscaldata.treasury.gov/datasets/average-interest-rates-treasury-securities/' },
    mts:{ s:'U.S. Treasury, Monthly Treasury Statement', u:'https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/' },
    accruedInterest:{ s:'U.S. Treasury, Interest Expense on the Debt Outstanding', u:'https://fiscaldata.treasury.gov/datasets/interest-expense-debt-outstanding/' },
    gdp:{ s:'BEA nominal GDP via FRED (GDP)', u:'https://fred.stlouisfed.org/series/GDP' },
    debtGdpAnnual:{ s:'FRED GFDGDPA188S, gross federal debt % of GDP', u:'https://fred.stlouisfed.org/series/GFDGDPA188S' },
    debtGdpQuarterly:{ s:'FRED GFDEGDQ188S, total public debt % of GDP', u:'https://fred.stlouisfed.org/series/GFDEGDQ188S' },
    m2:{ s:'Federal Reserve H.6 via FRED (M2SL)', u:'https://fred.stlouisfed.org/series/M2SL' },
    walcl:{ s:'Federal Reserve H.4.1 via FRED (WALCL)', u:'https://fred.stlouisfed.org/series/WALCL' },
    fedBalanceSheet:{ s:'Federal Reserve H.4.1, Factors Affecting Reserve Balances', u:'https://www.federalreserve.gov/releases/h41/' },
    effr:{ s:'New York Fed EFFR via FRED', u:'https://fred.stlouisfed.org/series/EFFR' },
    targetRange:{ s:'Federal Reserve Board DFEDTARU/DFEDTARL via FRED', u:'https://fred.stlouisfed.org/series/DFEDTARU' },
    iorb:{ s:'Federal Reserve Board IORB via FRED', u:'https://fred.stlouisfed.org/series/IORB' },
    onrrp:{ s:'New York Fed ON RRP award rate via FRED', u:'https://fred.stlouisfed.org/series/RRPONTSYAWARD' },
    discount:{ s:'Federal Reserve Board primary credit rate via FRED', u:'https://fred.stlouisfed.org/series/DPCREDIT' },
    rrpVolume:{ s:'New York Fed ON RRP take-up via FRED', u:'https://fred.stlouisfed.org/series/RRPONTSYD' },
    tenYear:{ s:'10-year Treasury yield via FRED (DGS10)', u:'https://fred.stlouisfed.org/series/DGS10' },
    cpi:{ s:'BLS CPI via FRED (CPIAUCSL)', u:'https://fred.stlouisfed.org/series/CPIAUCSL' },
    unemployment:{ s:'BLS unemployment rate via FRED (UNRATE)', u:'https://fred.stlouisfed.org/series/UNRATE' },
    realGdp:{ s:'BEA real GDP growth via FRED (A191RL1Q225SBEA)', u:'https://fred.stlouisfed.org/series/A191RL1Q225SBEA' },
    cbo:{ s:'Congressional Budget Office baseline', u:(MD.cboUrl || 'https://www.cbo.gov/publication/61882') },
    fedWatch:{ s:(MD.fedWatch && MD.fedWatch.sourceName) || 'CME FedWatch as reported by the press', u:(MD.fedWatch && MD.fedWatch.sourceUrl) || 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
    tariffs:{ s:'BEA customs duties via FRED (B235RC1A027NBEA), annual series stored in the page', u:'https://fred.stlouisfed.org/series/B235RC1A027NBEA' }
  };
  // The customs-duties chart is an annual series typed into the page (it is not fetched): say so, and turn amber when
  // BEA's next annual figure should have been added (same allowance as the annual debt-to-GDP series).
  RULE.tariffs = { id:'tariffs', label:'Customs duties, annual (stored in the page, not fetched)', period:'year', days:470, source:'BEA via FRED, annual; update the series in site/fiscal/index.html (tariffTrend) when the next year posts' };
  var TARIFF_LAST = '2025';
  var _dateOf = dateOf; dateOf = function(id){ return id === 'tariffs' ? TARIFF_LAST : _dateOf(id); };

  function prov(ids, note){ return ids.filter(function(id){ return SRC[id]; }).map(function(id, i){ return { src:SRC[id].s, url:SRC[id].u, date:dateOf(id), note:i === 0 ? note : null }; }); }

  // Card anchors (an element id inside the card, or the card's data-block) -> data points, kind, method note,
  // and per-figure kinds keyed by the data-bind name of the figure's value.
  var CALC = function(es, en){ return T('cálculo FNAM: '+es, 'FNAM calculation: '+en); };
  function BLOCKS(){ return [
    { at:'chartDebtTrend', ids:['debt'], k:'R' },
    { at:'snapshot', ids:['debt'], k:'R', tiles:{ debtPublicT:'R', debtIntragovT:'R' } },
    { at:'chartDebtGdpPct', ids:['debtGdpAnnual'], k:'R' },
    { at:'chartDebtHistory1995', ids:['debt'], k:'R' },
    { at:'chartM2History1995', ids:['m2'], k:'R' },
    { at:'chartTripleIndex', ids:['debt','m2','walcl'], k:'C', note:CALC('cada serie indexada a su propio nivel inicial','each series indexed to its own starting level') },
    { at:'chartHolders', ids:['holders'], k:'R' },
    { at:'tblHolders', ids:['holders'], k:'C', note:CALC('participaciones calculadas sobre el total del Boletín del Tesoro','shares computed on the Treasury Bulletin total') },
    { at:'tblForeign', ids:['foreignHolders'], k:'R' },
    { at:'chartMaturityMix', ids:['debtComposition'], k:'R' },
    { at:'avgMaturity', ids:['avgMaturity'], k:'C', note:CALC('vencimiento promedio ponderado y vencimientos a 12 meses agregados valor por valor (CUSIP)','weighted-average maturity and 12-month maturities aggregated security by security (CUSIP)') },
    { at:'chartMaturitySchedule', ids:['avgMaturity'], k:'C', note:CALC('vencimientos por año agregados valor por valor (CUSIP)','maturities by year aggregated security by security (CUSIP)') },
    { at:'chartRateTrend', ids:['avgRate'], k:'R' },
    { at:'bridgeCap', ids:['mts','accruedInterest','avgRate'], k:'R', note:T('el puente de interés bruto a neto es un cálculo FNAM con cifras del mismo Monthly Treasury Statement','the gross-to-net interest bridge is an FNAM calculation from figures in the same Monthly Treasury Statement') },
    { at:'pieComposition', ids:['debtComposition'], k:'R' },
    { at:'mktVsNonmkt', ids:['debtComposition'], k:'R' },
    { at:'chartGdp', ids:['debtGdpAnnual'], k:'R' },
    { at:'whereStands', ids:['debt','gdp','debtGdpQuarterly'], k:'C', note:CALC('deuda total del último día ÷ PIB nominal del último trimestre (BEA, tasa anualizada); FRED publica su propia razón trimestral, que se muestra al lado','total debt on the latest day ÷ the latest quarter\'s nominal GDP (BEA, annualized rate); FRED\'s own quarterly ratio is shown beside it') },
    { at:'chartCboProjection', ids:['cbo','debtGdpAnnual'], k:'R', note:T('proyección publicada por la CBO; no es una estimación de FNAM','projection published by CBO; not an FNAM estimate') },
    { at:'cboAssumptions', ids:['cbo','realGdp','cpi','tenYear','unemployment'], k:'R' },
    { at:'tblCboProjection', ids:['cbo'], k:'R', note:T('PIB implícito = gasto ÷ gasto como % del PIB (cálculo FNAM con cifras de la CBO)','implied GDP = outlays ÷ outlays as % of GDP (FNAM calculation from CBO figures)') },
    { at:'pieRevFY', ids:['mts'], k:'R' }, { at:'chartRevYTD', ids:['mts'], k:'R' },
    { at:'chartTariffs', ids:['tariffs'], k:'R' },
    { at:'pieOutFY', ids:['mts'], k:'R' }, { at:'chartOutYTD', ids:['mts'], k:'R' },
    { at:'chartFedM2', ids:['walcl','m2'], k:'R' },
    { at:'fedEras', ids:['walcl','fedBalanceSheet'], k:'R' },
    { at:'chartFedComposition', ids:['fedBalanceSheet'], k:'R' },
    { at:'tacctAssets', ids:['fedBalanceSheet'], k:'R' },
    { at:'chartFundsRate', ids:['effr'], k:'R', note:T('promedios anuales; el último punto es la EFFR más reciente','annual averages; the last point is the latest EFFR') },
    { at:'corridorWrap', ids:['targetRange','iorb','onrrp','discount','effr'], k:'R' },
    { at:'chartFedWatch', ids:['fedWatch'], k:'R', note:T('probabilidades implícitas en futuros calculadas por CME y reportadas por la prensa','futures-implied probabilities computed by CME and reported by the press') }
  ]; }
  var CHART_PROV = {};
  function cardOf(at){ var el = document.getElementById(at) || document.querySelector('[data-block="'+at+'"]'); return el ? (el.classList.contains('card') ? el : el.closest('.card')) : null; }
  function stale(ids){ return ids.some(function(id){ return fresh(id).level === 'amber'; }); }
  function tagHtml(k, ids, note){ return PV.kind(k, lang())+PV.src(prov(ids, note), lang())+(stale(ids) ? PV.amber('!', T('Dato fuera de su tolerancia de actualización; ver la línea de fuente','Data past its update allowance; see the source line')) : ''); }

  function apply(){
    var L = lang();
    BLOCKS().forEach(function(b){
      var card = cardOf(b.at); if(!card) return;
      if(document.getElementById(b.at) && document.getElementById(b.at).tagName === 'CANVAS') CHART_PROV[b.at] = b;
      card.querySelectorAll('canvas').forEach(function(cv){ if(cv.id && !CHART_PROV[cv.id]) CHART_PROV[cv.id] = b; });
      var h3 = card.querySelector('h3');
      if(h3){ var old = h3.querySelector('.pk-h'); if(old) old.remove(); h3.insertAdjacentHTML('beforeend', '<span class="pk-h">'+PV.kind(b.k, L)+'</span>'); }
      // "Data through …" + amber, appended to the card's own source line (or a new one).
      card.querySelectorAll('.auto-stamp').forEach(function(x){ x.remove(); });
      var main = b.ids[0], stamp = '<span class="auto-stamp"> · <span class="data-through">'+PV.through(dateOf(main), L)+'</span>'+(b.note ? ' · '+PV.esc(b.note) : '')+amberFor(b.ids)+'</span>';
      var srcs = card.querySelectorAll('.chart-src'), src = srcs.length ? srcs[srcs.length-1] : null;
      if(src){ var vis = src.querySelector(L === 'en' ? '.en' : '.es') || src; vis.insertAdjacentHTML('beforeend', stamp); }
      else card.insertAdjacentHTML('beforeend', '<p class="chart-src auto-stamp">'+T('Fuente: ','Source: ')+prov(b.ids).map(function(p){ return '<a href="'+PV.esc(p.url)+'" target="_blank" rel="noopener">'+PV.esc(p.src)+'</a>'; }).join('; ')+stamp.replace('<span class="auto-stamp">','<span>')+'</p>');
      // Every figure in the card: its kind and its source.
      card.querySelectorAll('.stat').forEach(function(st){
        var o = st.querySelector('.auto-tile'); if(o) o.remove();
        var v = st.querySelector('.v'), bind = v && v.getAttribute('data-bind'), k = (b.tiles && bind && b.tiles[bind]) || b.k;
        var l = st.querySelector('.l'); if(l) l.insertAdjacentHTML('beforeend', '<span class="auto-tile"> '+tagHtml(k, b.ids, b.note)+'</span>');
      });
    });
    // Header: KPI tiles, the as-of row in "Data through" form, the legend, and the eyebrow.
    var kpiIds = [['debt','R'],['debt','R'],['gdp','C'],['mts','R'],['avgRate','R'],['mts','R']];
    document.querySelectorAll('#kpiStrip .kpi').forEach(function(el, i){
      var m = kpiIds[i]; if(!m || el.querySelector('.auto-tile')) return;
      var note = m[1] === 'C' ? T('cálculo FNAM: deuda del último día ÷ PIB nominal del último trimestre','FNAM calculation: latest-day debt ÷ latest quarter\'s nominal GDP') : null;
      el.insertAdjacentHTML('beforeend', '<div class="delta auto-tile">'+PV.through(dateOf(m[0]), L)+' '+tagHtml(m[1], m[1] === 'C' ? ['debt','gdp'] : [m[0]], note)+amberFor(m[1] === 'C' ? ['debt','gdp'] : [m[0]])+'</div>');
    });
    var row = document.getElementById('asofRow');
    if(row && !row.querySelector('.auto-asof')){
      var groups = [[T('Deuda','Debt outstanding'),'debt'],[T('Tenedores','Holders'),'holders'],[T('Vencimientos y composición','Maturity & composition'),'debtComposition'],[T('Costo','Cost of debt'),'avgRate'],[T('Ingresos y gasto','Revenues & outlays'),'mts'],[T('PIB','GDP'),'gdp'],[T('Balance de la Fed','Fed balance sheet'),'walcl'],[T('Tasas','Policy rates'),'effr']];
      row.innerHTML = groups.map(function(g){ return '<span class="auto-asof">'+g[0]+': <b>'+PV.through(dateOf(g[1]), L)+'</b>'+amberFor([g[1]])+'</span>'; }).join('')
        +'<span class="auto-asof">'+T('Última descarga','Last download')+': <b>'+(LD.generatedAt ? PV.fmt(LD.generatedAt.slice(0,10), L) : '—')+'</b></span>'
        +'<span class="auto-asof">'+PV.legend(L)+'</span>';
    }
    notice();
    var eb = document.getElementById(L === 'en' ? 'eyebrowEn' : 'eyebrowEs');
    if(eb) eb.innerHTML = T('Datos del Tesoro de EE. UU. y la Reserva Federal · ','U.S. Treasury &amp; Federal Reserve Data · ')+PV.through(dateOf('debt'), L);
  }

  // Header notice, written in both languages at once (the page shows the one the reader chose).
  var LABEL_ES = { debt:'deuda diaria del Tesoro (Debt to the Penny)', targetRange:'rango objetivo del FOMC', effr:'tasa de fondos federales efectiva',
    iorb:'interés sobre saldos de reservas (IORB)', onrrp:'tasa ON RRP', discount:'tasa de descuento', rrpVolume:'saldo de ON RRP', tenYear:'rendimiento a 10 años',
    walcl:'activos totales de la Fed (WALCL)', fedBalanceSheet:'balance de la Fed (H.4.1)', avgRate:'tasas de interés promedio de la deuda',
    debtComposition:'composición de la deuda (MSPD, cuadro 1)', avgMaturity:'vencimiento promedio (MSPD, cuadro 3)', mts:'Estado Mensual del Tesoro',
    accruedInterest:'interés devengado', m2:'M2', cpi:'IPC', unemployment:'tasa de desempleo', foreignHolders:'principales tenedores extranjeros (TIC)', gdp:'PIB nominal',
    realGdp:'crecimiento del PIB real', holders:'tenedores de la deuda (OFS-2)', debtGdpAnnual:'deuda ÷ PIB anual (FRED)', debtGdpQuarterly:'deuda ÷ PIB trimestral (FRED)',
    fedWatch:'probabilidades de FedWatch', cbo:'panorama base de la CBO', tariffs:'aranceles, serie anual' };
  function notice(){
    var box = document.getElementById('dataWarn'); if(!box || document.documentElement.classList.contains('no-data')) return;
    var en = [], es = [], sEn = [], sEs = [];
    if(LD.generatedAt && Date.now() - Date.parse(LD.generatedAt) > 36*3600*1000){
      en.push('<b>The data file was last refreshed on '+PV.fmt(LD.generatedAt.slice(0,10), 'en')+';</b> the twice-daily refresh appears to have failed.');
      es.push('<b>El archivo de datos se actualizó por última vez el '+PV.fmt(LD.generatedAt.slice(0,10), 'es')+';</b> la actualización de dos veces al día parece haber fallado.');
    }
    Object.keys(RULE).forEach(function(id){
      var f = fresh(id); if(f.level !== 'amber') return;
      var d = dateOf(id), r = RULE[id];
      sEn.push(PV.esc(r.label)+' ('+(d ? 'data through '+PV.fmt(d, 'en')+', '+PV.ageText(f, 'en') : 'no value in the last download')+')');
      sEs.push(PV.esc(LABEL_ES[id] || r.label)+' ('+(d ? 'datos al '+PV.fmt(d, 'es')+', '+PV.ageText(f, 'es') : 'sin dato en la última descarga')+')');
    });
    if(sEn.length){
      en.push('<b>Past their update allowance:</b> '+sEn.join('; ')+'. The page shows the last values it retrieved.');
      es.push('<b>Fuera de su tolerancia de actualización:</b> '+sEs.join('; ')+'. La página muestra los últimos valores que obtuvo.');
    }
    document.getElementById('dataWarnEn').innerHTML = en.join(' ');
    document.getElementById('dataWarnEs').innerHTML = es.join(' ');
    box.hidden = !en.length;
  }

  // Every chart point names its kind, source and data date in the tooltip.
  if(window.Chart){
    Chart.defaults.plugins.tooltip.callbacks.footer = function(items){
      var it = items && items[0]; if(!it) return ''; var b = CHART_PROV[it.chart.canvas.id]; if(!b) return '';
      var kind = { R:T('Reportado','Reported'), C:T('Cálculo FNAM','FNAM calculation'), E:T('Estimación FNAM','FNAM estimate') }[b.k];
      return [kind+' — '+SRC[b.ids[0]].s+' · '+PV.through(dateOf(b.ids[0]), lang())];
    };
  }
  function run(){ try{ apply(); }catch(e){ if(window.console) console.error('blocks.js', e); } }
  run();
  ['btnLangEn','btnLangEs'].forEach(function(id){ var b = document.getElementById(id); if(b) b.addEventListener('click', function(){ setTimeout(run, 0); }); });
  // renderAll() rebuilds the KPI strip and the as-of row (language toggle, resize): re-apply when it does.
  var kpi = document.getElementById('kpiStrip'), busy = false;
  if(kpi && window.MutationObserver) new MutationObserver(function(){ if(busy) return; busy = true; setTimeout(function(){ run(); busy = false; }, 0); }).observe(kpi, { childList:true });
  window.FNAM_FISCAL_BLOCKS = { apply:run, dateOf:dateOf, fresh:fresh };
})();
