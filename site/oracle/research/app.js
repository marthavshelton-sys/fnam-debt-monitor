/* Oracle research dashboard: primary-source disclosures and editable operating cases. */
(() => {
  'use strict';
  const F = window.ORCL_FIN, C = window.ORCL_COMMENTS, G = window.ORCL_GUIDANCE, R = window.ORCL_RESEARCH;
  const $ = (id) => document.getElementById(id);
  if (!F?.quarters?.length || !R?.sources) { $('freshness').textContent = 'Financial or research data unavailable / Datos no disponibles'; return; }
  let lang = localStorage.getItem('orcl-lang') === 'en' ? 'en' : 'es';
  const state = { stmt: 'is', mode: 'q', preset: 'yoy', trend: 'rpo', a: '', b: '', ng: false };
  const q = F.quarters.filter((r) => r.is).sort((a, b) => a.id.localeCompare(b.id));
  const latest = q.at(-1);
  const byId = Object.fromEntries(q.map((x) => [x.id, x]));
  const tr = (es, en) => lang === 'es' ? es : en;
  const num = (v, decimals = 0) => v == null || !Number.isFinite(v) ? '—' : v.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  const bn = (v, decimals = 1) => v == null ? '—' : `US$ ${num(v / 1000, decimals)} ${tr('mil M', 'bn')}`;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const src = (key, page) => { const s = R.sources[key]; return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.title)}">${esc(s.type)} · ${esc(s.date)}${page ? ` · p.${page}` : ''}</a>` : ''; };
  const sourceOf = (r, section) => r?.sources?.[section] || null;
  const financialSource = (r, section) => {
    if (r?.derived && r.members?.length && section !== 'bs') return r.members.map((m) => {
      const s=sourceOf(m,section); return s?.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.title||'')}">${esc(m.id)} · ${esc(s.accession || 'release')}</a>` : '';
    }).filter(Boolean).join(' · ');
    const s=sourceOf(r,section);return s?.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.title || '')}">${esc(s.title || s.url)}${s.accession ? ` · ${esc(s.accession)}` : ''}</a>` : '';
  };
  const labels = (r) => r.id.startsWith('FY') ? r.id : `${r.q}${tr('T', 'Q')}${String(r.fy).slice(2)}`;
  function factCard(f) { const s=R.sources[f.source]; return `<div class="card"><p class="small muted">${esc(f.label[lang])}</p><strong class="num">${esc(f.value)}</strong><p class="small">${esc(f.note?.[lang] || '')}</p><details class="source-line"><summary>${tr('Fuente y fecha', 'Source and date')}</summary>${src(f.source, f.page)}<br>${tr('Periodo:', 'Period:')} ${esc(R.quarter)} · ${tr('Revisado:', 'Reviewed:')} ${esc(R.reviewedAt)}${s?.accession ? ` · ${tr('Acceso:', 'Accession:')} ${esc(s.accession)}` : ''}<br>${tr('Tipo:', 'Type:')} ${esc(s?.type || '')}; ${tr('divulgación directa', 'direct disclosure')}</details></div>`; }
  const facts = (group) => R.facts.filter((f) => f.group === group).map(factCard).join('');
  const row = (a, b, s = '') => `<tr><td>${a}</td><td class="num">${b}</td>${s ? `<td>${s}</td>` : ''}</tr>`;
  const table = (rows, three = false) => `<table class="research-table"><thead><tr><th>${tr('Concepto', 'Item')}</th><th class="num">${tr('Valor', 'Value')}</th>${three ? `<th>${tr('Fuente', 'Source')}</th>` : ''}</tr></thead><tbody>${rows.join('')}</tbody></table>`;

  function renderOverview() {
    const l = latest, prior = byId[`${l.fy}Q${l.q - 1}`] || byId[`${l.fy - 1}Q4`];
    const source = financialSource(l, 'is');
    $('asofRow').innerHTML = `<span><b>${tr('Resultado:', 'Results:')}</b> ${esc(l.periodEnd)} · ${source}</span><span><b>${tr('Hechos revisados:', 'Evidence reviewed:')}</b> ${esc(R.reviewedAt)}</span><span><b>${tr('EDGAR comprobado:', 'EDGAR checked:')}</b> ${esc(R.filingCheck || tr('sin registro', 'not recorded'))}</span><span><b>${tr('Archivo financiero generado:', 'Financial file built:')}</b> ${esc(F.generatedAt?.slice(0,16).replace('T',' ') || '—')} UTC</span>`;
    const stale = R.quarter !== l.id || (R.pending || []).length;
    $('freshness').classList.toggle('warn', !!stale);
    $('freshness').textContent = stale ? tr('Hay reportes por revisar o el registro operativo no coincide con el último periodo financiero. Consulte los enlaces antes de usar estas cifras.', 'Filings await review or the operating evidence does not match the latest financial period. Check the source links before using these figures.') : tr('Datos financieros del último trimestre incorporado; los hechos operativos fueron revisados por última vez en la fecha indicada. No representan datos en tiempo real.', 'Financial data reflect the latest incorporated quarter; operating facts were last reviewed on the stated date. These are not real-time data.');
    const tiles = [
      [tr('RPO', 'RPO'), bn(l.kpi.rpo), 'kpi'],
      [tr('Ingresos OCI', 'OCI revenue'), R.quarter === l.id ? R.facts.find((f) => f.group === 'headline')?.value || '—' : '—', 'release'],
      [tr('Ingresos nube', 'Cloud revenue'), bn(l.kpi.cloudRev), 'is'],
      [tr('Capex GAAP', 'GAAP capex'), bn(-l.cf?.capex), 'cf'],
      [tr('Flujo libre', 'Free cash flow'), bn(l.cf?.fcf), 'cf']
    ];
    $('kpis').innerHTML = tiles.map(([name, value, k]) => `<div class="kpi"><div class="small muted">${name}</div><div class="num" style="font-size:19px;font-weight:700">${value}</div><div class="source-line">${k === 'release' ? src('release') : financialSource(l, k)}</div></div>`).join('');
    $('thesisDeck').innerHTML = [
      [tr('RPO neto t/t', 'Net RPO q/q'), prior?.kpi?.rpo != null ? bn(l.kpi.rpo - prior.kpi.rpo) : '—', tr('No equivale a reservas brutas', 'Not gross bookings')],
      [tr('Capacidad', 'Capacity'), R.quarter === l.id ? (R.facts.find((f) => f.group === 'capacity')?.value || '—') : '—', tr('Adicional en el trimestre', 'Added this quarter')],
      [tr('Ingreso', 'Revenue'), bn(l.is.revTotal), tr('Reportado, no contratado', 'Recognized, not contracted')],
      [tr('Margen operativo', 'Operating margin'), `${num(l.is.opMargin, 1)}%`, tr('GAAP, consolidado', 'GAAP, consolidated')]
    ].map(([title, value, note]) => `<div class="card"><small>${title}</small><strong>${value}</strong><small>${note}</small></div>`).join('');
    $('rpoFacts').innerHTML = facts('rpo'); $('capacityFacts').innerHTML = facts('capacity'); $('fundingFacts').innerHTML = facts('funding'); $('appFacts').innerHTML = facts('apps');
    $('rpoBridge').innerHTML = table([
      row(tr('Saldo inicial', 'Opening balance'), bn(prior?.kpi?.rpo)),
      row(tr('Cambio neto', 'Net change'), prior?.kpi?.rpo != null ? bn(l.kpi.rpo - prior.kpi.rpo) : '—'),
      row(tr('Altas / ingresos reconocidos / ajustes', 'New awards / recognized revenue / adjustments'), '—'),
      row(tr('Saldo final', 'Closing balance'), bn(l.kpi.rpo))
    ]) + `<p class="source-line">${financialSource(l, 'kpi')} · ${tr('No se puede descomponer el cambio neto con la información divulgada.', 'Disclosures do not permit a decomposition of the net change.')}</p>`;
    $('rpoTiming').innerHTML = table([
      row(tr('Próximos 12 meses', 'Next 12 months'), '—'), row(tr('Meses 13–24', 'Months 13–24'), '—'),
      row(tr('Dentro de 36 meses', 'Within 36 months'), R.quarter === l.id ? '~50%' : '—'),
      row(tr('Prepagado / hardware del cliente / Oracle', 'Prepaid / customer hardware / Oracle'), '—')
    ]) + `<p class="source-line">${src('call', 3)} · ${tr('La estructura descrita por la administración se refiere a la mayoría de los contratos nuevos; no a todo el RPO.', 'Management described the majority of new contracts, not the entire RPO.')}</p>`;
    const c = l.cf || {}, b = l.bs || {};
    $('cashBridge').innerHTML = table([
      row(tr('Flujo operativo', 'Operating cash flow'), bn(c.cfo)), row(tr('Gasto de capital GAAP', 'GAAP capital expenditures'), bn(c.capex)),
      row(tr('Flujo libre reportado', 'Reported free cash flow'), bn(c.fcf)),
      row(tr('Anticipos con componente financiero (dentro del flujo operativo)', 'Prepayments with financing component (in operating cash flow)'), R.quarter === l.id ? 'US$ 11.4 bn' : '—'),
      row(tr('Capex neto de efectivo (medida gerencial)', 'Net cash capex (management measure)'), R.quarter === l.id ? '~US$ 18 bn' : '—')
    ]) + `<p class="source-line">${financialSource(l, 'cf')} · ${src('filing')} · ${src('call', 4)}. ${tr('El capex neto no se resta nuevamente del flujo operativo; los anticipos están incluidos en él. La medida gerencial no se concilia aquí por completo con el capex GAAP.', 'Net cash capex is not subtracted again from operating cash flow; prepayments are included in it. The management measure is not fully reconciled here to GAAP capex.')}</p>`;
    $('fundingBridge').innerHTML = table([
      row(tr('Deuda bruta', 'Gross debt'), bn(b.totalDebt)), row(tr('Efectivo e inversiones', 'Cash and investments'), bn(b.cashAndInvestments)),
      row(tr('Deuda neta', 'Net debt'), bn(b.netDebt)), row(tr('Acciones ATM emitidas (bruto)', 'ATM equity issued (gross)'), R.quarter === l.id ? 'US$ 20 bn' : '—')
    ]) + `<p class="source-line">${financialSource(l, 'bs')} · ${src('release')}</p>`;
    $('siteTable').innerHTML = `<table class="research-table"><thead><tr>${[tr('Sitio', 'Site'),tr('Capacidad', 'Capacity'),tr('Cliente', 'Customer'),tr('Rampa', 'Ramp'),tr('Electricidad', 'Power'),tr('Permisos', 'Permits'),tr('Financiamiento', 'Financing'),tr('Fuente', 'Source')].map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${R.sites.map((s) => `<tr>${['name','capacity','customer','ramp','power','permit','financing'].map((k) => `<td>${esc(s[k])}</td>`).join('')}<td>${src(s.source, s.page)}${s.secondary ? ` · ${src(s.secondary)}` : ''}</td></tr>`).join('')}</tbody></table>`;
    $('partnerFacts').innerHTML = R.counterparties.map((f) => `<div class="card"><h3>${esc(f.name)}</h3><p>${esc(f.detail[lang])}</p><div class="source-line">${src(f.source)}</div></div>`).join('');
    $('sourcesList').innerHTML = Object.values(R.sources).map((s) => `<p class="source-line"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a> · ${esc(s.type)} · ${esc(s.date)}${s.accession ? ` · ${esc(s.accession)}` : ''}</p>`).join('');
    renderTrend();
  }

  function renderTrend() {
    const series = state.trend;
    const points = q.map((x) => ({ q:x, value:series==='rpo'?x.kpi?.rpo:series==='cloud'?(x.basis==='fy2026_lines'?x.kpi?.cloudRev:null):x.cf?.capex == null ? null : -x.cf.capex })).filter((x)=>x.value!=null).slice(-8);
    if (!points.length) { $('trendChart').textContent='—'; return; }
    const peak=Math.max(...points.map((p)=>p.value)), width=760, unit=width/points.length, h=112;
    $('trendChart').innerHTML=`<svg viewBox="0 0 760 175" style="width:100%;height:auto" aria-label="${esc(series)} trend"><line x1="15" x2="745" y1="135" y2="135" stroke="currentColor" opacity=".25"/>${points.map(({q:quarter,value},i)=>{
      const barH=peak ? h*value/peak:0, px=15+i*unit+unit*.18, py=135-barH;
      const url=quarter.sources?.[series==='rpo'?'kpi':series==='capex'?'cf':'is']?.url || '';
      return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><rect x="${px}" y="${py}" width="${unit*.64}" height="${barH}" rx="3" fill="var(--accent)"/><title>${esc(labels(quarter))}: ${esc(bn(value))}</title></a><text x="${px+unit*.32}" y="153" text-anchor="middle" fill="currentColor" font-size="11">${esc(labels(quarter))}</text>`;
    }).join('')}</svg>`;
    $('trendSource').innerHTML=`${tr('US$ millones; clic en cada barra para ver el documento de origen. Trimestres anteriores al cambio de presentación de AF2026 omitidos en la serie de nube.', 'US$ million; click a bar for its source document. Pre-FY2026 quarters are excluded from the cloud series because the presentation changed.')} ${financialSource(points.at(-1).q,series==='rpo'?'kpi':series==='capex'?'cf':'is')}`;
  }

  function renderGuidance() {
    const eligible = G.vintages.filter((v) => v.items?.revGrowth || v.items?.fyRevenue).slice(-5).reverse();
    const range = (o, suffix = '') => o?.lo != null && o?.hi != null ? `${num(o.lo, o.lo % 1 ? 2 : 0)}–${num(o.hi, o.hi % 1 ? 2 : 0)}${suffix}` : '—';
    $('guidanceTable').innerHTML = `<table class="research-table"><thead><tr><th>${tr('Emitida', 'Issued')}</th><th>${tr('Periodo', 'Period')}</th><th>${tr('Ingresos', 'Revenue')}</th><th>${tr('Nube', 'Cloud')}</th><th>${tr('UPA No-GAAP', 'Non-GAAP EPS')}</th><th>${tr('Ingresos AF', 'FY revenue')}</th><th>${tr('Fuente', 'Source')}</th></tr></thead><tbody>${eligible.map((v) => `<tr><td>${esc(v.date)}</td><td>${esc(v.forQuarter || 'FY')}</td><td>${range(v.items.revGrowth, '%')}</td><td>${range(v.items.cloudGrowth, '%')}</td><td>${range(v.items.epsNg, ' USD')}</td><td>${v.items.fyRevenue?.usdM != null ? `${v.items.fyRevenue.atLeast ? '≥ ' : ''}${bn(v.items.fyRevenue.usdM)}` : '—'}</td><td>${v.source?.url ? `<a href="${esc(v.source.url)}" target="_blank" rel="noopener noreferrer">${esc(v.source.title)}</a>` : '—'}</td></tr>`).join('')}</tbody></table>`;
  }

  const sum = (records, section) => {
    const out = {};
    for (const r of records) for (const [k,v] of Object.entries(r[section] || {})) if (typeof v === 'number') out[k] = (out[k] || 0) + v;
    if (section === 'is') {
      if (out.revTotal) for (const [key, base] of [['opMargin','opIncome'],['ngOpMargin','ngOpIncome'],['ebitdaMargin','ebitda']]) out[key] = 100 * out[base] / out.revTotal;
      if (out.pretaxIncome) out.taxRate = -100 * out.incomeTax / out.pretaxIncome;
      out.dilutedShares /= records.length;
    }
    if (section === 'cf') { const revenue = records.reduce((n,r) => n + (r.is?.revTotal || 0), 0); out.capexToRevenue = revenue ? -100 * out.capex / revenue : null; }
    return out;
  };
  function periods() {
    if (state.mode === 'fy') return F.years.filter((x) => x.is).slice().sort((a,b) => a.fy-b.fy);
    if (state.mode === 'q') return q;
    return q.map((r, idx) => {
      const records = state.mode === 'ltm' ? q.slice(idx-3, idx+1) : q.filter((x) => x.fy === r.fy && x.q <= r.q);
      if (records.length !== (state.mode === 'ltm' ? 4 : r.q)) return null;
      // Do not sum across a missing quarter in a partially extracted series.
      for (let j=1;j<records.length;j++) { const p=records[j-1], n=records[j]; if (!(n.fy === p.fy && n.q === p.q+1 || p.q === 4 && n.q === 1 && n.fy === p.fy+1)) return null; }
      return { ...r, id:`${state.mode}:${r.id}`, is:sum(records,'is'), cf:sum(records,'cf'), bs:r.bs, derived:true, baseId:r.id, members:records };
    }).filter(Boolean);
  }
  function matchingB(a, arr) {
    if (state.mode === 'fy') return arr.find((b) => b.fy === a.fy-1);
    const current = a.baseId || a.id;
    const [fy, quarter] = current.split('Q').map(Number);
    if (state.preset === 'yoy') return arr.find((b) => (b.baseId || b.id) === `${fy-1}Q${quarter}`);
    return arr.find((b) => (b.baseId || b.id) === (quarter === 1 ? `${fy-1}Q4` : `${fy}Q${quarter-1}`));
  }
  function options() {
    const arr = periods(), newest = arr.at(-1);
    if (!arr.some((x) => x.id === state.a)) state.a = newest?.id || '';
    const a = arr.find((x) => x.id === state.a);
    const wanted = matchingB(a, arr);
    if (!arr.some((x) => x.id === state.b)) state.b = wanted?.id || arr.at(-2)?.id || '';
    const display = (r) => r.id.startsWith('FY') ? r.id : `${state.mode === 'ltm' ? 'LTM ' : state.mode === 'ytd' ? 'YTD ' : ''}${labels(r)}`;
    for (const [id, selected] of [['selA',state.a],['selB',state.b]]) $(id).innerHTML = arr.slice().reverse().map((r) => `<option value="${esc(r.id)}"${r.id === selected ? ' selected' : ''}>${esc(display(r))}</option>`).join('');
    renderStatement();
  }
  function renderStatement() {
    const arr=periods(), a=arr.find((r) => r.id===state.a), b=arr.find((r) => r.id===state.b);
    if (!a || !b) { $('statementTable').textContent = tr('No hay periodos comparables.', 'No comparable periods.'); return; }
    const type=state.stmt, showComment=type==='is' && state.preset==='yoy' && !a.derived && !b.derived && (a.fy-b.fy===1 && a.q===b.q || state.mode==='fy' && a.fy-b.fy===1);
    const commentary=C.periods?.[a.id];
    const header=`<thead><tr><th>${tr('Concepto', 'Line item')}</th><th class="num">${esc(labels(a))}</th><th class="num">${esc(labels(b))}</th><th class="num">Δ</th><th class="num">Δ %</th>${showComment ? `<th>${tr('Comentarios', 'Comments')}</th>` : ''}</tr></thead>`;
    const body=F.layout[type].filter((r) => !r.group).map((r) => {
      const key=state.ng && type==='is' && r.ngAlt ? r.ngAlt : r.k;
      if (state.ng && type==='is' && ['ngOpIncome','ngOpMargin','ngNetIncomeCommon','ngEpsDiluted'].includes(r.k)) return '';
      const va=a[type]?.[key], vb=b[type]?.[key], change=va!=null&&vb!=null?va-vb:null, pct=change!=null&&vb!==0?100*change/Math.abs(vb):null;
      const cm=commentary?.lines?.[r.k];
      const comment=showComment ? `<td>${cm ? `${esc(cm[lang] || '')}<div class="source-line">${esc(cm.src || '')} · ${financialSource(a,'is')}${commentary.release?.url && commentary.release.url !== sourceOf(a,'is')?.url ? ` · <a href="${esc(commentary.release.url)}">release</a>` : ''}</div>` : ''}</td>` : '';
      const value=(v)=>v==null?'—':`${num(v,r.pct ? 1 : r.perShare ? 2 : 0)}${r.pct ? '%' : ''}`;
      const delta=change==null?'—':r.pct ? `${num(change,1)} pp` : value(change);
      return `<tr><td style="padding-left:${12+(r.level||0)*13}px">${esc(r[lang])}</td><td class="num">${value(va)}</td><td class="num">${value(vb)}</td><td class="num">${delta}</td><td class="num">${pct==null?'—':num(pct,1)+'%'}</td>${comment}</tr>`;
    }).join('');
    $('statementTable').innerHTML=`<table class="research-table stmt-table">${header}<tbody>${body}</tbody></table>`;
    $('statementSource').innerHTML=`${tr('Fuentes:', 'Sources:')} ${financialSource(a,type)} · ${financialSource(b,type)}`;
    $('statementNote').textContent=showComment ? tr('Comentarios interanuales revisados a partir de comunicados y transcripciones; las cifras No-GAAP son ajustes informados por Oracle.', 'Reviewed y/y commentary from releases and transcripts; Non-GAAP figures are Oracle-reported adjustments.') : tr('Comentarios disponibles para trimestres comparados contra el mismo trimestre del año anterior, y años fiscales consecutivos.', 'Comments are available for matched year-over-year quarters and consecutive fiscal years.');
  }

  const scenario = [
    ['mw', 'MW / año', 'MW / year', 850, 0, 5000, 10],
    ['ramp', 'Utilización inicial %', 'Initial utilization %', 75, 0, 100, 1],
    ['unit', 'Ingreso anual / MW (US$ M)', 'Annual revenue / MW (US$ M)', 8, 0, 100, .5],
    ['margin', 'Margen de efectivo incremental %', 'Incremental cash margin %', 35, -50, 100, 1],
    ['capex', 'Capex neto por MW (US$ M)', 'Net cash capex / MW (US$ M)', 18, 0, 150, 1],
    ['discount', 'Descuento %', 'Discount rate %', 12, 1, 50, .5],
    ['terminal', 'Múltiplo de flujo terminal', 'Terminal cash-flow multiple', 10, 0, 30, .5]
  ];
  const cases = {
    slow:{mw:500,ramp:60,unit:6,margin:25,capex:24,discount:14,terminal:8},
    reference:{mw:850,ramp:75,unit:8,margin:35,capex:18,discount:12,terminal:10},
    fast:{mw:1200,ramp:90,unit:10,margin:42,capex:14,discount:10,terminal:12}
  };
  function renderScenario() {
    $('scenarioInputs').innerHTML=scenario.map(([key,es,en,defaultValue,min,max,step])=>`<label>${tr(es,en)}<input type="number" id="s_${key}" value="${defaultValue}" min="${min}" max="${max}" step="${step}"></label>`).join('');
    document.querySelectorAll('#scenarioInputs input').forEach((e)=>e.addEventListener('input',()=>{
      $('segScenario').querySelectorAll('button').forEach((b)=>b.classList.remove('active'));calculate();
    })); calculate();
  }
  function calculate() {
    const v=Object.fromEntries(scenario.map(([key])=>[key,Number($(`s_${key}`).value)]));
    if (scenario.some(([key, , , ,min,max])=>!Number.isFinite(v[key]) || v[key]<min || v[key]>max)) { $('scenarioOutput').textContent=tr('Corrija los supuestos fuera de rango.', 'Correct out-of-range assumptions.'); return; }
    const annual=[], disc=v.discount/100;
    for(let year=1;year<=5;year++) {
      // Equal new MW each year. Every new cohort contributes from its installation year.
      const fleet=v.mw*year, revenue=fleet*v.unit*v.ramp/100, incrementalCash=revenue*v.margin/100,
        investment=v.mw*v.capex, freeCash=incrementalCash-investment;
      annual.push({year,revenue,freeCash,pv:freeCash/Math.pow(1+disc,year)});
    }
    const terminal=annual.at(-1).revenue*v.margin/100*v.terminal/Math.pow(1+disc,5);
    const value=annual.reduce((n,x)=>n+x.pv,0)+terminal;
    $('scenarioOutput').innerHTML=`<b>${tr('Valor presente incremental (5 años + terminal):', 'Incremental present value (5 years + terminal):')} ${bn(value)}</b><p>${tr('Año 1:', 'Year 1:')} ${bn(annual[0].revenue)} ${tr('ingresos; flujo después de capex', 'revenue; cash after capex')} ${bn(annual[0].freeCash)}. ${tr('Año 5:', 'Year 5:')} ${bn(annual[4].revenue)} ${tr('ingresos; flujo después de capex', 'revenue; cash after capex')} ${bn(annual[4].freeCash)}.</p><p class="small">${tr('Supuestos ilustrativos del usuario; no son guía de Oracle ni valuación total de ORCL. No incluye negocios existentes, impuestos específicos, capital de trabajo ni deuda.', 'Illustrative user assumptions, not Oracle guidance or a whole-company valuation. Excludes existing operations, specific taxes, working capital and debt.')}</p>`;
  }
  function language(newLang) {
    lang=newLang;localStorage.setItem('orcl-lang',lang);document.documentElement.lang=lang==='es'?'es-MX':'en';
    document.querySelectorAll('.es').forEach((x)=>x.hidden=lang!=='es');document.querySelectorAll('.en').forEach((x)=>x.hidden=lang!=='en');
    $('btnLangEs').classList.toggle('active',lang==='es');$('btnLangEn').classList.toggle('active',lang==='en');
    renderOverview();renderGuidance();options();
    const values=Object.fromEntries(scenario.map(([k])=>[k,$(`s_${k}`)?.value]));renderScenario();for(const [k,v] of Object.entries(values)) if(v!=null)$(`s_${k}`).value=v;calculate();
  }
  function bindSeg(id,key) { $(id).addEventListener('click',(event)=>{const btn=event.target.closest('button[data-v]');if(!btn)return;state[key]=btn.dataset.v;$(id).querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===btn));if(key==='mode'||key==='preset'){state.b='';options();}else renderStatement();}); }
  bindSeg('segStmt','stmt');bindSeg('segMode','mode');bindSeg('segPreset','preset');
  $('segTrend').addEventListener('click',(event)=>{const b=event.target.closest('button[data-v]');if(!b)return;state.trend=b.dataset.v;$('segTrend').querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===b));renderTrend();});
  $('segScenario').addEventListener('click',(event)=>{const b=event.target.closest('button[data-v]');if(!b)return;for(const [k,v] of Object.entries(cases[b.dataset.v]))$(`s_${k}`).value=v;$('segScenario').querySelectorAll('button').forEach((x)=>x.classList.toggle('active',x===b));calculate();});
  $('selA').addEventListener('change',(e)=>{state.a=e.target.value;state.b='';options();});$('selB').addEventListener('change',(e)=>{state.b=e.target.value;renderStatement();});
  $('chkNg').addEventListener('change',(e)=>{state.ng=e.target.checked;renderStatement();});
  $('btnLangEs').addEventListener('click',()=>language('es'));$('btnLangEn').addEventListener('click',()=>language('en'));
  $('btnPrint').addEventListener('click',()=>window.print());
  renderScenario();language(lang);
})();
