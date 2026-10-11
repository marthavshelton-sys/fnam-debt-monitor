// The American Consumer: the page. Every figure, sentence and chart is composed here from data/data.js (official
// sources, refreshed by the site's scheduled job) and data/companies.js (company results releases), in the language on
// screen. Nothing on the page is typed by hand, so the text can never disagree with the charts.
(function () {
  'use strict';
  var UI = window.CONS_UI, D = window.CONS_DATA, CO = window.CONS_COMPANIES || null;
  var $ = UI.$, tr = UI.tr, bi = UI.bi, esc = UI.esc;
  if (!D) { var w = $('dataWarn'); if (w) { w.hidden = false; w.innerHTML = bi('No se pudieron cargar los datos de la página. Vuelva a intentarlo en unos minutos.', 'The page data could not be loaded. Please try again in a few minutes.'); } return; }
  var state = { incomeMap: 'medHH', debtMap: 'total', t90: 'all', heat: 'share', wealthDemo: 'income', lev: 'income', stressMap: 'p30' };
  var S = function (n) { return UI.series(n); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); };
  var last = function (a) { return a[a.length - 1]; };
  var by = function (arr, k) { return arr.filter(function (x) { return x.k === k; })[0]; };

  // ---------- names ----------
  var N = {
    age: { '0-17': ['0 a 17', 'Under 18'], '18-24': ['18 a 24', '18 to 24'], '25-34': ['25 a 34', '25 to 34'], '35-44': ['35 a 44', '35 to 44'], '45-54': ['45 a 54', '45 to 54'], '55-64': ['55 a 64', '55 to 64'], '65-74': ['65 a 74', '65 to 74'], '75+': ['75 o más', '75 and over'], '15-24': ['15 a 24', '15 to 24'], '<25': ['Menores de 25', 'Under 25'], '25-44': ['25 a 44', '25 to 44'], '45-64': ['45 a 64', '45 to 64'], '65+': ['65 o más', '65 and over'] },
    race: { whiteNH: ['Blancos no hispanos', 'White, non-Hispanic'], hispanic: ['Hispanos o latinos', 'Hispanic or Latino'], blackNH: ['Afroamericanos', 'Black or African American'], asianNH: ['Asiáticos', 'Asian'], multiNH: ['Dos o más razas', 'Two or more races'], otherNH: ['Otros', 'Other'],
      asian: ['Asiáticos', 'Asian'], black: ['Afroamericanos', 'Black or African American'], multi: ['Dos o más razas', 'Two or more races'], aian: ['Indígenas americanos y de Alaska', 'American Indian and Alaska Native'] },
    hh: { married: ['Parejas casadas', 'Married couples'], otherFamily: ['Otras familias', 'Other families'], alone: ['Personas que viven solas', 'People living alone'], otherNonfamily: ['Otros hogares no familiares', 'Other nonfamily households'] },
    edu: { lessHS: ['Sin preparatoria', 'Less than high school'], hs: ['Preparatoria', 'High school'], someCollege: ['Universidad incompleta o técnico', "Some college or associate's"], ba: ['Licenciatura', "Bachelor's degree"], grad: ['Posgrado', 'Graduate degree'] },
    receive: { wages: ['Sueldos y salarios', 'Wages and salaries'], selfEmp: ['Trabajo por cuenta propia', 'Self-employment'], assets: ['Intereses, dividendos o rentas', 'Interest, dividends or rent'], socSec: ['Seguro Social', 'Social Security'], retirement: ['Pensiones y retiro', 'Retirement income'], ssi: ['Ingreso suplementario (SSI)', 'Supplemental Security Income'], paSnap: ['Asistencia pública o cupones (SNAP)', 'Public assistance or SNAP'], other: ['Otros ingresos', 'Other income'] },
    src: { wages: ['Sueldos y salarios', 'Wages and salaries'], supplements: ['Prestaciones pagadas por el empleador', 'Employer-paid benefits'], proprietors: ['Negocios propios', "Proprietors' income"], rental: ['Rentas', 'Rental income'], interest: ['Intereses', 'Interest income'], dividends: ['Dividendos', 'Dividends'],
      socSec: ['Seguro Social', 'Social Security'], medicare: ['Medicare', 'Medicare'], medicaid: ['Medicaid', 'Medicaid'], otherGov: ['Otras prestaciones del gobierno', 'Other government benefits'], otherTransfers: ['Otras transferencias', 'Other transfers'] },
    use: { contributions: ['Contribuciones a la seguridad social', 'Contributions for social insurance'], taxes: ['Impuestos personales', 'Personal taxes'], pceServices: ['Consumo: servicios', 'Consumption: services'], pceNondurables: ['Consumo: bienes no duraderos', 'Consumption: nondurable goods'], pceDurables: ['Consumo: bienes duraderos', 'Consumption: durable goods'], pce: ['Consumo', 'Consumption'],
      interestPaid: ['Intereses pagados', 'Interest paid'], transfersPaid: ['Transferencias pagadas', 'Transfers paid'], saving: ['Ahorro personal', 'Personal saving'] },
    pce: { housing: ['Vivienda y servicios del hogar', 'Housing and utilities'], health: ['Salud', 'Health care'], otherServices: ['Otros servicios', 'Other services'], otherNondurables: ['Otros bienes no duraderos', 'Other nondurable goods'], financial: ['Servicios financieros y seguros', 'Financial services and insurance'], foodHome: ['Alimentos y bebidas para el hogar', 'Food and beverages for the home'],
      foodServices: ['Restaurantes y hoteles', 'Food services and accommodations'], recreation: ['Servicios recreativos', 'Recreation services'], vehicles: ['Vehículos y refacciones', 'Motor vehicles and parts'], recGoods: ['Bienes recreativos', 'Recreational goods and vehicles'], transport: ['Servicios de transporte', 'Transportation services'],
      npish: ['Instituciones sin fines de lucro', 'Nonprofit institutions'], clothing: ['Ropa y calzado', 'Clothing and footwear'], furnishings: ['Muebles y enseres', 'Furnishings and household equipment'], gasoline: ['Gasolina y energéticos', 'Gasoline and other energy goods'], otherDurables: ['Otros bienes duraderos', 'Other durable goods'] },
    cex: { foodHome: ['Alimentos en casa', 'Food at home'], foodAway: ['Alimentos fuera de casa', 'Food away from home'], alcohol: ['Bebidas alcohólicas', 'Alcoholic beverages'], shelter: ['Vivienda (renta o costo de ser dueño)', 'Shelter'], utilities: ['Servicios del hogar', 'Utilities'], household: ['Operación, artículos y muebles del hogar', 'Household operations, supplies, furnishings'],
      apparel: ['Ropa', 'Apparel'], vehicles: ['Compra de vehículos', 'Vehicle purchases'], gasoline: ['Gasolina y aceite', 'Gasoline and motor oil'], vehicleOther: ['Otros gastos del vehículo', 'Other vehicle expenses'], publicTransport: ['Transporte público y viajes', 'Public and other transportation'], health: ['Salud', 'Healthcare'],
      entertainment: ['Entretenimiento', 'Entertainment'], personalCare: ['Cuidado personal', 'Personal care'], education: ['Educación', 'Education'], tobacco: ['Tabaco', 'Tobacco'], other: ['Lectura y otros', 'Reading and miscellaneous'], giving: ['Donativos y apoyos', 'Cash contributions'], insurancePensions: ['Seguros personales y pensiones', 'Personal insurance and pensions'],
      housing: ['Vivienda', 'Housing'], transport: ['Transporte', 'Transportation'] },
    inc: { wages: ['Sueldos y salarios', 'Wages and salaries'], selfEmp: ['Trabajo por cuenta propia', 'Self-employment'], retirement: ['Seguro Social y pensiones', 'Social Security and retirement'], assets: ['Intereses, dividendos y rentas', 'Interest, dividends, rent'], assistance: ['Asistencia pública y SNAP', 'Public assistance and SNAP'], other: ['Otros', 'Other'] },
    debt: { mortgage: ['Hipotecas', 'Mortgages'], heloc: ['Líneas con garantía hipotecaria', 'Home equity lines'], auto: ['Automotriz', 'Auto loans'], card: ['Tarjetas de crédito', 'Credit cards'], student: ['Estudiantil', 'Student loans'], other: ['Otros', 'Other'], total: ['Total', 'Total'] },
    nyRow: { 'Auto Loans': 'auto', 'Credit Card': 'card', Mortgage: 'mortgage', HELOC: 'heloc', 'Student Loans': 'student', Other: 'other' },
    wg: { TopPt1: ['0.1% más rico', 'Top 0.1%'], RemainingTop1: ['Siguiente 0.9%', 'Next 0.9%'], Next9: ['Siguiente 9%', 'Next 9%'], Next40: ['Siguiente 40%', 'Next 40%'], Bottom50: ['50% inferior', 'Bottom 50%'],
      pct99to100: ['1% de mayor ingreso', 'Top 1% by income'], pct80to99: ['Percentil 80 a 99', '80th to 99th percentile'], pct60to80: ['Percentil 60 a 80', '60th to 80th'], pct40to60: ['Percentil 40 a 60', '40th to 60th'], pct20to40: ['Percentil 20 a 40', '20th to 40th'], pct00to20: ['20% de menor ingreso', 'Bottom 20% by income'],
      age70plus: ['70 años o más', '70 and over'], age55to69: ['55 a 69', '55 to 69'], age40to54: ['40 a 54', '40 to 54'], ageunder40: ['Menores de 40', 'Under 40'],
      Silent: ['Silenciosa y anteriores (antes de 1946)', 'Silent and earlier (before 1946)'], BabyBoom: ['Baby boomers (1946 a 1964)', 'Baby boomers (1946 to 1964)'], GenX: ['Generación X (1965 a 1980)', 'Generation X (1965 to 1980)'], Millennial: ['Millennials y más jóvenes (desde 1981)', 'Millennials and younger (1981 on)'],
      College: ['Con título universitario', 'College degree'], SomeCollege: ['Universidad incompleta', 'Some college'], HS: ['Preparatoria', 'High school'], NoHS: ['Sin preparatoria', 'No high school diploma'],
      White: ['Blancos no hispanos', 'White, non-Hispanic'], Black: ['Afroamericanos no hispanos', 'Black, non-Hispanic'], Hispanic: ['Hispanos', 'Hispanic'], Other: ['Otros o multirraciales', 'Other or multiple races'] },
    asset: { re: ['Bienes raíces', 'Real estate'], equities: ['Acciones y fondos', 'Stocks and mutual funds'], pensions: ['Pensiones', 'Pension entitlements'], business: ['Negocios propios', 'Private businesses'], deposits: ['Depósitos y fondos de dinero', 'Deposits and money funds'], durables: ['Bienes duraderos', 'Consumer durables'], otherAssets: ['Otros activos', 'Other assets'] },
    scfInc: { 'Less than 20': ['20% inferior', 'Bottom 20%'], '20-39.9': ['20 a 40', '20 to 40'], '40-59.9': ['40 a 60', '40 to 60'], '60-79.9': ['60 a 80', '60 to 80'], '80-89.9': ['80 a 90', '80 to 90'], '90-100': ['10% superior', 'Top 10%'] },
    scfAge: { 'Less than 35': ['Menores de 35', 'Under 35'], '35-44': ['35 a 44', '35 to 44'], '45-54': ['45 a 54', '45 to 54'], '55-64': ['55 a 64', '55 to 64'], '65-74': ['65 a 74', '65 to 74'], '75 or older': ['75 o más', '75 or older'] },
    scfEdu: { 'No high school diploma': ['Sin preparatoria', 'No high school diploma'], 'High school diploma': ['Preparatoria', 'High school diploma'], 'Some college': ['Universidad incompleta', 'Some college'], 'College degree': ['Con título universitario', 'College degree'] },
    scfRace: { 'White, non-Hispanic': ['Blancos no hispanos', 'White, non-Hispanic'], 'Black, non-Hispanic': ['Afroamericanos no hispanos', 'Black, non-Hispanic'], Hispanic: ['Hispanos', 'Hispanic'], Other: ['Otros o multirraciales', 'Other or multiple races'] },
    scfHouse: { Owner: ['Propietarios', 'Homeowners'], 'Renter or other': ['Inquilinos y otros', 'Renters and other'] },
    srcShort: { census: ['Oficina del Censo, ACS', 'Census Bureau, ACS'], cps: ['Oficina del Censo, CPS ASEC', 'Census Bureau, CPS ASEC'], bea: ['BEA, Ingreso Personal y Gastos', 'BEA, Personal Income and Outlays'], beaStates: ['BEA, cuentas estatales', 'BEA, state accounts'], cex: ['BLS, Encuesta de Gastos del Consumidor', 'BLS, Consumer Expenditure Surveys'],
      dfa: ['Reserva Federal, Cuentas Financieras Distributivas', 'Federal Reserve, Distributional Financial Accounts'], scf: ['Reserva Federal, Encuesta de Finanzas del Consumidor', 'Federal Reserve, Survey of Consumer Finances'], nyfed: ['Fed de Nueva York, Deuda y Crédito de los Hogares', 'New York Fed, Household Debt and Credit'],
      nyfedStates: ['Fed de Nueva York, estadísticas estatales de deuda', 'New York Fed, state-level debt statistics'],
      cexHist: ['BLS, Encuesta de Gastos del Consumidor por quintil', 'BLS, Consumer Expenditure Surveys by quintile'], beaDist: ['BEA, Distribución del Ingreso Personal', 'BEA, Distribution of Personal Income'],
      atlWages: ['Fed de Atlanta, Rastreador de Crecimiento Salarial', 'Atlanta Fed, Wage Growth Tracker'], umich: ['Universidad de Michigan, Encuestas de Consumidores', 'University of Michigan, Surveys of Consumers'], nes: ['Oficina del Censo, Estadísticas de Negocios sin Empleados', 'Census Bureau, Nonemployer Statistics'], phillyCards: ['Fed de Filadelfia, datos de tarjetas de los grandes bancos', 'Philadelphia Fed, Large Bank Credit Card Data'], sce: ['Fed de Nueva York, Encuesta de Expectativas del Consumidor', 'New York Fed, Survey of Consumer Expectations'], shed: ['Reserva Federal, Bienestar Económico de los Hogares (SHED)', 'Federal Reserve, Economic Well-Being of U.S. Households (SHED)'], cfpbBnpl: ['CFPB, estudio de compra ahora, paga después', 'CFPB, study of buy now, pay later'], fsa: ['Departamento de Educación, Ayuda Federal para Estudiantes', 'Department of Education, Federal Student Aid'], courts: ['Tribunales federales, Tabla F-2 de quiebras', 'U.S. Courts, bankruptcy Table F-2'], jointDist: ['BEA y BLS, distribución conjunta de ingreso, consumo y ahorro (prototipo)', 'BEA and BLS, joint distribution of income, consumption and saving (prototype)'], pceDist: ['BLS, Distribución del Gasto de Consumo Personal (experimental)', 'BLS, Distribution of Personal Consumption Expenditures (experimental)'], board: ['Reserva Federal: G.19, servicio de deuda, morosidad bancaria', 'Federal Reserve: G.19, debt service, bank delinquency'] }
  };
  var nm = function (map, k) { var x = N[map][k]; return x ? tr(x[0], x[1]) : k; };
  var ageS = function (k) { return String(k).replace('-', '–'); };   // '25-34' -> '25–34' on a crowded axis; the tooltip and the table carry the full name
  var dec = function (i) { return i === 0 ? tr('Todos', 'All') : 'D' + i; };   // column index of the decile tables: 0 = all consumer units

  // ---------- provenance: source lines, "data through", freshness ----------
  var ALLOW = { census: 700, cps: 660, cex: 730, cexHist: 730, bea: 80, beaDist: 800, board: 85, nyfed: 150, nyfedStates: 530, dfa: 185, scf: 1400, beaStates: 660, atlWages: 80, umich: 80, nes: 1000, pceDist: 800, phillyCards: 200, sce: 75, shed: 560, cfpbBnpl: 100000, fsa: 200, courts: 200, jointDist: 1250 };   // days after the end of the stamped period
  function fresh(id) { var s = D.sources[id]; if (!s || !s.asOf || !window.FNAM_PROV) return null; return window.FNAM_PROV.freshness(s.asOf, { days: ALLOW[id] || 400 }, 'us'); }
  function srcLine(id) {
    var s = D.sources[id]; if (!s) return '';
    var f = fresh(id), late = f && f.level === 'amber';
    return tr('Fuente: ', 'Source: ') + '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(nm('srcShort', id)) + ' ↗</a>' + (s.via ? tr(' (vía FRED)', ' (through FRED)') : '') + ' · ' + UI.through(s.asOf) +
      (s.stored ? UI.amber(tr('dato guardado', 'stored value'), tr('La última descarga de esta fuente falló; se muestra el último dato obtenido.', 'The last download of this source failed; the last value obtained is shown.')) : '') +
      (late ? UI.amber(tr('sin actualización reciente', 'no recent update'), tr('La fuente no ha publicado un periodo más nuevo dentro de su calendario habitual.', 'The source has not published a newer period within its usual calendar.')) : '');
  }
  function paintProvenance() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-src]'), function (el) { el.innerHTML = srcLine(el.getAttribute('data-src')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-meta]'), function (el) {
      el.innerHTML = el.getAttribute('data-meta').split(',').map(function (id) { var s = D.sources[id]; return s ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(nm('srcShort', id)) + '</a>: <span class="data-through">' + UI.through(s.asOf) + '</span>' : ''; }).filter(Boolean).join(' · ');
    });
  }

  // =====================================================================================================================
  // Header: stamps, legend, KPI strip
  // =====================================================================================================================
  // "11-oct-2026 06:50", Mexico City time (the format of the site's other stamps)
  var MON = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  function when(iso) {
    var d = new Date(iso); if (!iso || isNaN(d.getTime())) return '';
    var p = {}, pad = function (n) { return ('0' + n).slice(-2); };
    try { new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); }
    catch (e) { var m = new Date(d.getTime() - 6 * 36e5); p = { year: String(m.getUTCFullYear()), month: String(m.getUTCMonth() + 1), day: pad(m.getUTCDate()), hour: pad(m.getUTCHours()), minute: pad(m.getUTCMinutes()) }; }   // Mexico City has been UTC-6 all year since 2022
    return p.day + '-' + MON[UI.lang === 'en' ? 'en' : 'es'][Number(p.month) - 1] + '-' + p.year + ' ' + p.hour + ':' + p.minute;
  }
  function header() {
    var parts = [];
    if (D.generatedAt) parts.push(tr('Datos generados', 'Data generated') + ': <b>' + when(D.generatedAt) + ' ' + tr('(hora de la Ciudad de México)', '(Mexico City time)') + '</b>');
    [['bea', tr('Ingreso y gasto', 'Income and outlays')], ['cps', tr('Ingreso de hogares (nacional)', 'Household income (national)')], ['census', tr('Demografía y estados', 'Demographics and states')], ['cex', tr('Gasto por decil', 'Spending by decile')], ['nyfed', tr('Deuda', 'Debt')], ['dfa', tr('Riqueza', 'Wealth')], ['scf', tr('Encuesta de finanzas', 'Finance survey')]]
      .forEach(function (p) { var s = D.sources[p[0]]; if (s) parts.push(p[1] + ': <b>' + UI.through(s.asOf) + '</b>'); });
    $('asofRow').innerHTML = parts.map(function (p) { return '<span>' + p + '</span>'; }).join('');
    var dot = document.querySelector('[data-status-dot]'); if (dot && D.generatedAt) dot.setAttribute('data-status-time', D.generatedAt);
    $('legendTop').innerHTML = window.FNAM_PROV ? window.FNAM_PROV.legend(UI.lang) : '';
    var stored = Object.keys(D.sources).filter(function (k) { return D.sources[k].stored; });
    var warn = $('dataWarn');
    if (stored.length) { warn.hidden = false; warn.innerHTML = tr('La última descarga falló para: ', 'The last download failed for: ') + stored.map(function (k) { return esc(nm('srcShort', k)); }).join('; ') + tr('. Se muestran los últimos datos obtenidos, con su fecha.', '. The last data obtained are shown, with their date.'); } else warn.hidden = true;

    var k = [];
    var tile = function (lbl, val, unit, delta, kind) { k.push('<div class="kpi"><div class="lbl">' + lbl + '</div><div class="val">' + val + (unit ? '<span class="unit"> ' + unit + '</span>' : '') + '</div><div class="delta">' + delta + '</div><div class="delta">' + UI.kind(kind) + '</div></div>'); };
    if (D.funds && D.funds.pceShareGdp) tile(tr('Consumo de los hogares', 'Household consumption'), UI.pct(D.funds.pceShareGdp.v), tr('del PIB', 'of GDP'), UI.date(D.funds.pceShareGdp.asOf) + ' · ' + UI.money(D.funds.pceTotal) + tr(' al año', ' a year'), 'R');
    if (D.income && D.income.cps) { var c = D.income.cps, rl = c.real, ch = rl && rl.length > 1 ? (last(rl)[1] / rl[rl.length - 2][1] - 1) * 100 : null; tile(tr('Mediana del ingreso del hogar', 'Median household income'), UI.usd(c.median), '', c.asOf + (ch != null ? ' · ' + UI.signed(ch) + tr(' real vs. ', ' real vs. ') + (Number(c.asOf) - 1) : ''), 'R'); }
    if (D.funds) tile(tr('Tasa de ahorro personal', 'Personal saving rate'), UI.pct(D.funds.savingRate), '', UI.date(D.funds.asOf) + ' · ' + tr('del ingreso disponible', 'of disposable income'), 'R');
    if (D.debt) { var yo = D.debt.yearAgo ? (D.debt.balance.total / D.debt.yearAgo.total - 1) * 100 : null; tile(tr('Deuda de los hogares', 'Household debt'), '$' + UI.nf(D.debt.balance.total, 2), tr('billones', 'trillion'), UI.date(D.debt.asOf) + (yo != null ? ' · ' + UI.signed(yo) + tr(' anual', ' y/y') : ''), 'R'); }
    if (D.wealth) tile(tr('Riqueza neta de los hogares', 'Household net worth'), '$' + UI.nf(D.wealth.total / 1000, 1), tr('billones', 'trillion'), UI.date(D.wealth.asOf) + (D.scf ? ' · ' + tr('mediana por familia ', 'median per family ') + UI.usdK(D.scf.all.medNW * 1000, 0) + ' (' + D.scf.asOf + ')' : ''), 'R');
    if (D.wealth) { var w = D.wealth.dims.networth, top = (by(w, 'TopPt1').nw + by(w, 'RemainingTop1').nw + by(w, 'Next9').nw) / D.wealth.total * 100; tile(tr('Riqueza del 10% más rico', 'Wealth of the top 10%'), UI.pct(top), tr('del total', 'of the total'), UI.date(D.wealth.asOf) + ' · ' + tr('50% inferior: ', 'bottom 50%: ') + UI.pct(by(w, 'Bottom50').nw / D.wealth.total * 100), 'C'); }
    $('kpiStrip').innerHTML = k.join('');
  }

  // =====================================================================================================================
  // 01 At a glance (composed)
  // =====================================================================================================================
  function decileShares() { var t = D.cex.deciles.total.slice(1), s = sum(t); return t.map(function (v) { return v / s * 100; }); }
  function glance() {
    var pts = [];
    if (D.demo && D.income) pts.push(bi(
      'Hay <b>' + UI.mill(D.demo.households) + ' de hogares</b> y ' + UI.mill(D.demo.pop) + ' de personas (' + D.demo.asOf + '). La edad mediana es de ' + UI.nf(D.demo.medianAge, 1) + ' años; el ' + UI.pct(D.demo.owner) + ' de los hogares es dueño de su vivienda y el ' + UI.pct(by(D.demo.hhTypes, 'alone').n / D.demo.households * 100) + ' son personas que viven solas.',
      'There are <b>' + UI.mill(D.demo.households) + ' households</b> and ' + UI.mill(D.demo.pop) + ' people (' + D.demo.asOf + '). The median age is ' + UI.nf(D.demo.medianAge, 1) + '; ' + UI.pct(D.demo.owner) + ' of households own their home and ' + UI.pct(by(D.demo.hhTypes, 'alone').n / D.demo.households * 100) + ' are people living alone.'));
    if (D.income) { var q = D.income.quintiles, c = D.income.cps;
      pts.push(bi(
        (c ? 'El hogar típico ganó <b>' + UI.usd(c.median) + '</b> en ' + c.asOf + ' (mediana nacional). ' : '') + 'El 20% de mayor ingreso recibe el <b>' + UI.pct(q.shares[4]) + '</b> del ingreso de todos los hogares y el 20% de menor ingreso, el ' + UI.pct(q.shares[0]) + ' (' + D.income.asOf + '); el promedio por hogar va de ' + UI.usd(q.means[0]) + ' a ' + UI.usd(q.means[4]) + ' entre esos dos grupos.',
        (c ? 'The typical household earned <b>' + UI.usd(c.median) + '</b> in ' + c.asOf + ' (national median). ' : '') + 'The top 20% by income receive <b>' + UI.pct(q.shares[4]) + '</b> of all household income and the bottom 20% receive ' + UI.pct(q.shares[0]) + ' (' + D.income.asOf + '); the average per household runs from ' + UI.usd(q.means[0]) + ' to ' + UI.usd(q.means[4]) + ' between those two groups.')); }
    if (D.funds) { var f = D.funds, sh = function (v) { return UI.pct(v / f.pi * 100, 0); };
      pts.push(bi(
        'De cada dólar de ingreso personal, <b>' + sh(f.compensation) + '</b> viene del trabajo asalariado, ' + sh(f.assets) + ' de intereses y dividendos y <b>' + sh(f.transfers) + '</b> de transferencias, sobre todo del gobierno (' + UI.date(f.asOf) + '). Los hogares gastan en consumo el ' + UI.pct(f.pceTotal / f.dpi * 100, 0) + ' de su ingreso disponible y ahorran el <b>' + UI.pct(f.savingRate) + '</b>.',
        'Of every dollar of personal income, <b>' + sh(f.compensation) + '</b> comes from employee compensation, ' + sh(f.assets) + ' from interest and dividends and <b>' + sh(f.transfers) + '</b> from transfers, mostly from government (' + UI.date(f.asOf) + '). Households spend ' + UI.pct(f.pceTotal / f.dpi * 100, 0) + ' of their disposable income on consumption and save <b>' + UI.pct(f.savingRate) + '</b>.')); }
    if (D.cex) { var s = decileShares(), top20 = s[8] + s[9], bot40 = s[0] + s[1] + s[2] + s[3], d = D.cex.deciles, basics = basicsShare();
      pts.push(bi(
        'El gasto está concentrado: el 20% de hogares de mayor ingreso hace el <b>' + UI.pct(top20, 0) + '</b> del gasto de consumo y el 40% de menor ingreso, el ' + UI.pct(bot40, 0) + ' (' + D.cex.asOf + '). Lo básico (alimentos en casa, vivienda, servicios, salud y combustible) absorbe el <b>' + UI.pct(basics[1], 0) + '</b> del gasto del decil más bajo y el ' + UI.pct(basics[10], 0) + ' del más alto.',
        'Spending is concentrated: the top 20% of households by income do <b>' + UI.pct(top20, 0) + '</b> of consumer spending and the bottom 40% do ' + UI.pct(bot40, 0) + ' (' + D.cex.asOf + '). Basics (food at home, shelter, utilities, healthcare and fuel) take <b>' + UI.pct(basics[1], 0) + '</b> of the lowest decile\'s spending and ' + UI.pct(basics[10], 0) + ' of the highest\'s.')); }
    if (D.debt) { var b = D.debt.balance, t = D.debt.t90.card, lr = t ? last(t.rows) : null, ct = D.creditTerms;
      pts.push(bi(
        'Los hogares deben <b>$' + UI.nf(b.total, 2) + ' billones</b> (' + UI.date(D.debt.asOf) + '): ' + UI.pct(b.mortgage / b.total * 100, 0) + ' en hipotecas, y $' + UI.nf(b.card, 2) + ' billones en tarjetas' + (ct && ct.rates.card ? ' a una tasa promedio de <b>' + UI.pct(last(ct.rates.card)[1], 1) + '</b>' : '') + '.' + (lr ? ' El estrés se concentra en los jóvenes: en tarjetas, el ' + UI.pct(lr[1]) + ' del saldo de los de 18 a 29 años cayó en morosidad grave en el último año, frente al ' + UI.pct(lr[lr.length - 1]) + ' del total.' : ''),
        'Households owe <b>$' + UI.nf(b.total, 2) + ' trillion</b> (' + UI.date(D.debt.asOf) + '): ' + UI.pct(b.mortgage / b.total * 100, 0) + ' in mortgages, and $' + UI.nf(b.card, 2) + ' trillion on credit cards' + (ct && ct.rates.card ? ' at an average rate of <b>' + UI.pct(last(ct.rates.card)[1], 1) + '</b>' : '') + '.' + (lr ? ' Stress is concentrated among the young: on cards, ' + UI.pct(lr[1]) + ' of the balances of those 18 to 29 became seriously delinquent over the past year, against ' + UI.pct(lr[lr.length - 1]) + ' overall.' : ''))); }
    var sf = D.leverage ? stressFacts() : null;
    if (sf && sf.d2a != null && sf.d2a19 != null) {
      var bEs = [], bEn = [];
      if (sf.late60 != null && sf.late60Prev != null) { bEs.push('el <b>' + UI.pct(sf.late60) + '</b> de las familias con deuda tuvo un pago atrasado 60 días o más en ' + sf.by + ' (' + UI.pct(sf.late60Prev) + ' en ' + sf.byPrev + ')'); bEn.push('<b>' + UI.pct(sf.late60) + '</b> of families with debt had a payment 60 days or more late in ' + sf.by + ' (' + UI.pct(sf.late60Prev) + ' in ' + sf.byPrev + ')'); }
      if (sf.rejected != null) { bEs.push('al ' + UI.pct(sf.rejected) + ' de quienes pidieron crédito se lo negaron (' + UI.date(sf.aw) + ')'); bEn.push(UI.pct(sf.rejected) + ' of those who applied for credit were turned down (' + UI.date(sf.aw) + ')'); }
      if (sf.bnpl != null && sf.bnplLate != null) { bEs.push('el ' + UI.pct(sf.bnpl, 0) + ' de los adultos usó "compra ahora, paga después" y el ' + UI.pct(sf.bnplLate, 0) + ' de ellos pagó tarde (' + sf.bnplY + ')'); bEn.push(UI.pct(sf.bnpl, 0) + ' of adults used buy now, pay later and ' + UI.pct(sf.bnplLate, 0) + ' of them paid late (' + sf.bnplY + ')'); }
      if (sf.cash400 != null) { bEs.push('el ' + UI.pct(100 - sf.cash400, 0) + ' no cubriría un imprevisto de $400 con efectivo'); bEn.push(UI.pct(100 - sf.cash400, 0) + ' would not cover a $400 emergency with cash'); }
      if (sf.slDefault != null) { bEs.push(UI.money(sf.slDefault, 0) + ' de préstamos estudiantiles federales están en incumplimiento' + (sf.slDefaultPrev != null ? ' (' + UI.money(sf.slDefaultPrev, 0) + ' un año antes)' : '')); bEn.push(UI.money(sf.slDefault, 0) + ' of federal student loans are in default' + (sf.slDefaultPrev != null ? ' (' + UI.money(sf.slDefaultPrev, 0) + ' a year earlier)' : '')); }
      var cmp = sf.d2a < sf.d2a19;
      pts.push(bi(
        'El apalancamiento es ' + (cmp ? 'menor' : 'mayor') + ' que antes de la pandemia: la deuda equivale al <b>' + UI.pct(sf.d2a) + '</b> de los activos de los hogares (' + UI.pct(sf.d2a19) + ' a fines de 2019).' + (bEs.length ? ' La tensión está en el flujo de quienes tienen poco margen: ' + bEs.join('; ') + '.' : ''),
        'Leverage is ' + (cmp ? 'lower' : 'higher') + ' than before the pandemic: debt equals <b>' + UI.pct(sf.d2a) + '</b> of household assets (' + UI.pct(sf.d2a19) + ' at the end of 2019).' + (bEn.length ? ' The strain is in the cash flow of those with little room: ' + bEn.join('; ') + '.' : '')));
    }
    if (D.wealth) { var w = D.wealth.dims.networth, T = D.wealth.total, top1 = (by(w, 'TopPt1').nw + by(w, 'RemainingTop1').nw) / T * 100, b50 = by(w, 'Bottom50').nw / T * 100;
      pts.push(bi(
        'La riqueza neta de los hogares suma <b>' + UI.money(T) + '</b> (' + UI.date(D.wealth.asOf) + '). El 1% más rico tiene el <b>' + UI.pct(top1) + '</b> y la mitad con menos riqueza, el ' + UI.pct(b50) + '.' + (D.scf ? ' La familia típica tiene ' + UI.usdK(D.scf.all.medNW * 1000, 0) + ' (mediana, ' + D.scf.asOf + '), frente a un promedio de ' + UI.usd(D.scf.all.meanNW * 1000) + '.' : ''),
        'Household net worth totals <b>' + UI.money(T) + '</b> (' + UI.date(D.wealth.asOf) + '). The top 1% hold <b>' + UI.pct(top1) + '</b> and the less wealthy half hold ' + UI.pct(b50) + '.' + (D.scf ? ' The typical family has ' + UI.usdK(D.scf.all.medNW * 1000, 0) + ' (median, ' + D.scf.asOf + '), against an average of ' + UI.usd(D.scf.all.meanNW * 1000) + '.' : ''))); }
    var kf = kFacts();
    if (kf && kf.eq != null && kf.s20 != null) pts.push(bi(
      'La economía en forma de K se ve en los activos más que en el gasto medido por encuesta: el 10% más rico tiene el <b>' + UI.pct(kf.eq, 0) + '</b> de las acciones y fondos (' + UI.date(kf.q) + ')' + (kf.sentGap != null ? ' y ' + UI.nf(kf.sentGap, 0) + ' puntos separan la confianza del tercio de mayor ingreso de la del menor' : '') + ', mientras que el 20% de mayor ingreso hace el ' + UI.pct(kf.s20) + ' del gasto, ' + (Math.abs(kf.s20 - kf.s20first) < 2.5 ? 'casi igual que' : kf.s20 > kf.s20first ? 'más que' : 'menos que') + ' en ' + kf.sY0 + ' (' + UI.pct(kf.s20first) + ').' + (kf.est ? ' ' + esc(kf.est.publisher) + ' estima ' + estVal(kf.est) + ' ' + kf.est.short.es + ' (' + kf.est.period.es + ')' + (kf.offLo != null && kf.offHi > kf.offLo ? '; las mediciones oficiales, entre ' + UI.pct(kf.offLo) + ' y ' + UI.pct(kf.offHi, kf.offHiDp) : '') + '.' : ''),
      'The K-shaped economy shows in assets more than in survey-measured spending: the wealthiest 10% hold <b>' + UI.pct(kf.eq, 0) + '</b> of stocks and mutual funds (' + UI.date(kf.q) + ')' + (kf.sentGap != null ? ' and ' + UI.nf(kf.sentGap, 0) + ' points separate the confidence of the upper income third from the lower third' : '') + ', while the top 20% by income do ' + UI.pct(kf.s20) + ' of spending, ' + (Math.abs(kf.s20 - kf.s20first) < 2.5 ? 'about the same as' : kf.s20 > kf.s20first ? 'more than' : 'less than') + ' in ' + kf.sY0 + ' (' + UI.pct(kf.s20first) + ').' + (kf.est ? ' ' + esc(kf.est.publisher) + ' estimates ' + estVal(kf.est) + ' ' + kf.est.short.en + ' (' + kf.est.period.en + ')' + (kf.offLo != null && kf.offHi > kf.offLo ? '; official measurements, between ' + UI.pct(kf.offLo) + ' and ' + UI.pct(kf.offHi, kf.offHiDp) : '') + '.' : '')));
    var cs = companySummary(); if (cs) pts.push(cs);
    $('glance').innerHTML = pts.map(function (p, i) { return '<div class="pt"><span class="ix">' + (i + 1) + '</span><div>' + p + '</div></div>'; }).join('');
  }

  // =====================================================================================================================
  // 02 Demographics
  // =====================================================================================================================
  function demographics() {
    var d = D.demo; if (!d) return;
    var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + (kind ? ' ' + UI.kind(kind) : '') + '</div></div>'; };
    var baPlus = (by(d.edu, 'ba').n + by(d.edu, 'grad').n) / d.pop25 * 100;
    $('demoStats').innerHTML = [st(UI.nf(d.pop / 1e6, 1) + ' M', tr('Población', 'Population')), st(UI.nf(d.households / 1e6, 1) + ' M', tr('Hogares', 'Households')), st(UI.nf(d.hhSize, 2), tr('Personas por hogar', 'People per household')), st(UI.nf(d.medianAge, 1), tr('Edad mediana, años', 'Median age, years')),
      st(UI.pct(d.owner), tr('Hogares dueños de su vivienda', 'Households that own their home'), 'C'), st(UI.pct(baPlus), tr('Adultos de 25+ con licenciatura o más', 'Adults 25+ with a bachelor\'s or higher'), 'C'), st(UI.pct(d.foreignBorn), tr('Nacidos en el extranjero', 'Foreign-born'), 'C'), st(UI.pct(d.poverty), tr('Personas en pobreza', 'People in poverty'), 'C')].join('');
    var share = function (n, base) { return n / base * 100; };
    UI.bar('chAge', { labels: d.age.map(function (a) { return nm('age', a.k); }), data: d.age.map(function (a) { return a.n / 1e6; }), fmt: function (v, i) { return UI.nf(v, 1) + ' M' + (i != null ? ' · ' + UI.pct(share(d.age[i].n, d.pop)) : ''); }, axisFmt: function (v) { return v + ' M'; }, valueLabels: function (v, i) { return UI.pct(share(d.age[i].n, d.pop), 0); }, aria: tr('Población por grupo de edad', 'Population by age group') });
    UI.table('chAge', [tr('Edad', 'Age'), tr('Personas', 'People'), '%'], d.age.map(function (a) { return [nm('age', a.k), UI.nf(a.n), UI.pct(share(a.n, d.pop))]; }));
    UI.bar('chRace', { horizontal: true, labels: d.race.map(function (a) { return nm('race', a.k); }), data: d.race.map(function (a) { return share(a.n, d.pop); }), fmt: function (v) { return UI.pct(v); }, valueLabels: true, aria: tr('Población por raza y origen hispano', 'Population by race and Hispanic origin') });
    UI.table('chRace', [tr('Grupo', 'Group'), tr('Personas', 'People'), '%'], d.race.map(function (a) { return [nm('race', a.k), UI.nf(a.n), UI.pct(share(a.n, d.pop))]; }));
    UI.bar('chHhTypes', { horizontal: true, labels: d.hhTypes.map(function (a) { return nm('hh', a.k); }), data: d.hhTypes.map(function (a) { return share(a.n, d.households); }), fmt: function (v) { return UI.pct(v); }, valueLabels: true, catSize: 10.5 });
    UI.table('chHhTypes', [tr('Tipo', 'Type'), tr('Hogares', 'Households'), '%'], d.hhTypes.map(function (a) { return [nm('hh', a.k), UI.nf(a.n), UI.pct(share(a.n, d.households))]; }));
    UI.bar('chEdu', { horizontal: true, labels: d.edu.map(function (a) { return nm('edu', a.k); }), data: d.edu.map(function (a) { return share(a.n, d.pop25); }), fmt: function (v) { return UI.pct(v); }, valueLabels: true, catSize: 10.5 });
    UI.table('chEdu', [tr('Nivel', 'Level'), tr('Personas', 'People'), '%'], d.edu.map(function (a) { return [nm('edu', a.k), UI.nf(a.n), UI.pct(share(a.n, d.pop25))]; }));
    UI.bar('chOwnAge', { labels: d.ownerByAge.map(function (a) { return ageS(a.k); }), tipTitle: function (i) { return nm('age', d.ownerByAge[i].k) + tr(' años', ''); }, data: d.ownerByAge.map(function (a) { return a.owner; }), fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, max: 100, valueLabels: function (v) { return UI.pct(v, 0); }, catSize: 10 });
    UI.table('chOwnAge', [tr('Edad del jefe de hogar', 'Age of householder'), tr('Hogares', 'Households'), tr('% propietarios', '% owners')], d.ownerByAge.map(function (a) { return [nm('age', a.k), UI.nf(a.hh), UI.pct(a.owner)]; }));
    var o65 = (by(d.age, '65-74').n + by(d.age, '75+').n) / d.pop * 100, u18 = by(d.age, '0-17').n / d.pop * 100, yo = d.ownerByAge[1], ol = d.ownerByAge[5];
    $('demoCallout').innerHTML = bi(
      '<b>Para leer al consumidor:</b> el ' + UI.pct(o65) + ' de la población tiene 65 años o más y el ' + UI.pct(u18) + ' es menor de 18. Ser dueño de la vivienda depende de la edad: ' + UI.pct(yo.owner, 0) + ' de los hogares de ' + nm('age', yo.k) + ' años frente a ' + UI.pct(ol.owner, 0) + ' de los de ' + nm('age', ol.k) + '. Entre quienes rentan, la renta mediana es de ' + UI.usd(d.rent.median) + ' al mes y el <b>' + UI.pct(d.rent.burden30, 0) + '</b> destina 30% o más de su ingreso a la renta (' + UI.pct(d.rent.burden50, 0) + ' destina la mitad o más). ' + UI.kind('C'),
      '<b>Reading the consumer:</b> ' + UI.pct(o65) + ' of the population is 65 or older and ' + UI.pct(u18) + ' is under 18. Owning a home depends on age: ' + UI.pct(yo.owner, 0) + ' of households aged ' + nm('age', yo.k) + ' against ' + UI.pct(ol.owner, 0) + ' of those ' + nm('age', ol.k) + '. Among renters, the median rent is ' + UI.usd(d.rent.median) + ' a month and <b>' + UI.pct(d.rent.burden30, 0) + '</b> spend 30% or more of their income on rent (' + UI.pct(d.rent.burden50, 0) + ' spend half or more). ' + UI.kind('C'));
  }

  // =====================================================================================================================
  // 03 Income
  // =====================================================================================================================
  function income() {
    var I = D.income; if (!I) return;
    var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
    var c = I.cps, stats = [];
    if (c) stats.push(st(UI.usd(c.median), tr('Mediana nacional del hogar, ', 'National household median, ') + c.asOf + ' (CPS)'));
    stats.push(st(UI.usd(I.median), tr('Mediana del hogar, ', 'Household median, ') + I.asOf + ' (ACS)'), st(UI.usd(I.mean), tr('Promedio por hogar, ', 'Mean per household, ') + I.asOf + ' (ACS)', I.meanCalc ? 'C' : 'R'), st(UI.usd(I.perCapita), tr('Ingreso por persona, ', 'Income per person, ') + I.asOf + ' (ACS)'), st(UI.nf(I.gini, 3), tr('Índice de Gini (0 = igualdad total)', 'Gini index (0 = full equality)')));
    $('incomeStats').innerHTML = stats.join('');
    if (c) {
      $('capCps').innerHTML = bi('Dólares corrientes y dólares constantes (' + esc(String(c.realUnits || '').replace('C-CPI-U $', 'C-CPI-U')) + '), anual', 'Current dollars and constant dollars (' + esc(String(c.realUnits || '').replace(' $', '')) + '), annual');
      var yrs = c.nominal.map(function (o) { return o[0]; }), realM = {}; (c.real || []).forEach(function (o) { realM[o[0]] = o[1]; });
      UI.line('chCps', { labels: yrs, datasets: [{ label: tr('Dólares constantes', 'Constant dollars'), data: yrs.map(function (y) { return realM[y] == null ? null : realM[y]; }), color: S(1) }, { label: tr('Dólares corrientes', 'Current dollars'), data: c.nominal.map(function (o) { return o[1]; }), color: S(2) }], fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + v / 1000 + (UI.lang === 'en' ? 'K' : ' mil'); }, min: 0 });
      UI.legend('chCps', [{ c: S(1), l: tr('Dólares constantes (ajustado por inflación)', 'Constant dollars (inflation-adjusted)'), line: 1 }, { c: S(2), l: tr('Dólares corrientes', 'Current dollars'), line: 1 }]);
      UI.table('chCps', [tr('Año', 'Year'), tr('Corrientes', 'Current'), tr('Constantes', 'Constant')], yrs.slice().reverse().map(function (y, i) { var n = c.nominal[c.nominal.length - 1 - i]; return [y, UI.usd(n[1]), realM[y] == null ? '—' : UI.usd(realM[y])]; }));
    }
    var bl = function (b) { return b.hi == null ? '≥ ' + b.lo : b.lo + '–' + b.hi; };
    UI.bar('chBrackets', { labels: I.brackets.map(bl), data: I.brackets.map(function (b) { return b.n / 1e6; }), fmt: function (v, i) { return UI.nf(v, 1) + ' M' + (i != null ? ' · ' + UI.pct(I.brackets[i].n / I.households * 100) : ''); }, axisFmt: function (v) { return v + ' M'; }, valueLabels: function (v, i) { return UI.pct(I.brackets[i].n / I.households * 100, 0); }, catSize: 10, tipTitle: function (i) { return '$' + bl(I.brackets[i]) + tr(' mil', 'K'); } });
    UI.table('chBrackets', [tr('Ingreso anual (miles de dólares)', 'Annual income ($ thousands)'), tr('Hogares', 'Households'), '%'], I.brackets.map(function (b) { return [bl(b), UI.nf(b.n), UI.pct(b.n / I.households * 100)]; }));
    var q = I.quintiles, ql = [tr('20% inferior', 'Bottom 20%'), tr('Segundo', 'Second'), tr('Tercero', 'Third'), tr('Cuarto', 'Fourth'), tr('20% superior', 'Top 20%'), tr('5% superior', 'Top 5%')];
    UI.bar('chQuintiles', { labels: ql, data: q.means.concat([q.top5Mean]), colors: [S(1), S(1), S(1), S(1), S(1), UI.css('--neutral-mark')], fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + v / 1000 + (UI.lang === 'en' ? 'K' : ' mil'); }, valueLabels: function (v) { return UI.usdK(v, 0); }, catSize: 10.5 });
    UI.table('chQuintiles', [tr('Grupo', 'Group'), tr('Ingreso promedio', 'Mean income'), tr('Límite superior', 'Upper limit'), tr('% del ingreso', '% of income')], ql.map(function (l, i) { return [l, UI.usd(i < 5 ? q.means[i] : q.top5Mean), i < 4 ? UI.usd(q.limits[i]) : i === 5 ? tr('desde ', 'from ') + UI.usd(q.top5Limit) : '—', UI.pct(i < 5 ? q.shares[i] : q.top5Share)]; }));
    // shares as one stacked bar with a list (the picture is five numbers)
    var cols = [UI.css('--seq-2'), UI.css('--seq-3'), UI.css('--seq-4'), UI.css('--seq-5'), UI.css('--seq-6')];
    $('incomeShares').innerHTML = '<div class="flow-bars" style="display:block"><div class="bar" style="height:26px;margin-top:16px">' + q.shares.map(function (s, i) { return '<i style="background:' + cols[i] + ';flex:' + s + ' 1 0" title="' + esc(ql[i] + ': ' + UI.pct(s)) + '"></i>'; }).join('') + '</div><ul>' +
      q.shares.map(function (s, i) { return '<li><span class="sw" style="background:' + cols[i] + '"></span><span class="nm">' + ql[i] + '</span><span class="vl">' + UI.pct(s) + tr(' del ingreso · promedio ', ' of income · mean ') + UI.usd(q.means[i]) + '</span></li>'; }).join('') + '</ul></div>';
    $('incomeCallout').innerHTML = bi(
      'El 5% de hogares de mayor ingreso (desde ' + UI.usd(q.top5Limit) + ' al año) recibe el <b>' + UI.pct(q.top5Share) + '</b> del ingreso, más que el 60% de hogares de menor ingreso en conjunto (' + UI.pct(q.shares[0] + q.shares[1] + q.shares[2]) + '). Un hogar entra al 20% superior a partir de ' + UI.usd(q.limits[3]) + '.',
      'The top 5% of households by income (from ' + UI.usd(q.top5Limit) + ' a year) receive <b>' + UI.pct(q.top5Share) + '</b> of income, more than the bottom 60% of households combined (' + UI.pct(q.shares[0] + q.shares[1] + q.shares[2]) + '). A household enters the top 20% at ' + UI.usd(q.limits[3]) + '.');
    // groups: three families of bars in one chart, separated by color (identity of the family, not rank)
    var rows = [], push = function (fam, label, v, color) { rows.push({ fam: fam, label: label, v: v, color: color }); };
    I.byAge.forEach(function (a) { push(tr('Edad', 'Age'), nm('age', a.k), a.v, S(1)); });
    I.byRace.forEach(function (a) { if (a.v != null) push(tr('Raza y origen', 'Race and origin'), nm('race', a.k), a.v, S(3)); });
    push(tr('Vivienda', 'Tenure'), tr('Propietarios', 'Owners'), I.byTenure.owner, S(2)); push(tr('Vivienda', 'Tenure'), tr('Inquilinos', 'Renters'), I.byTenure.renter, S(2));
    UI.bar('chIncGroups', { horizontal: true, labels: rows.map(function (r) { return r.label; }), data: rows.map(function (r) { return r.v; }), colors: rows.map(function (r) { return r.color; }), fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + v / 1000 + (UI.lang === 'en' ? 'K' : ' mil'); }, valueLabels: function (v) { return UI.usdK(v, 0); }, catSize: 10.5, thickness: 16, tipTitle: function (i) { return rows[i].fam + ': ' + rows[i].label; } });
    UI.legend('chIncGroups', [{ c: S(1), l: tr('Edad del jefe de hogar', 'Age of householder') }, { c: S(3), l: tr('Raza y origen hispano', 'Race and Hispanic origin') }, { c: S(2), l: tr('Tenencia de la vivienda', 'Housing tenure') }]);
    UI.table('chIncGroups', [tr('Grupo', 'Group'), tr('Categoría', 'Category'), tr('Mediana', 'Median')], rows.map(function (r) { return [r.fam, r.label, UI.usd(r.v)]; }).concat([[tr('Todos', 'All'), tr('Todos los hogares', 'All households'), UI.usd(I.median)]]));
    UI.bar('chEarnEdu', { horizontal: true, labels: I.earningsByEdu.map(function (a) { return nm('edu', a.k); }), data: I.earningsByEdu.map(function (a) { return a.v; }), fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + v / 1000 + (UI.lang === 'en' ? 'K' : ' mil'); }, valueLabels: function (v) { return UI.usdK(v, 0); }, catSize: 10.5 });
    UI.table('chEarnEdu', [tr('Escolaridad', 'Schooling'), tr('Mediana de ingresos laborales', 'Median earnings')], I.earningsByEdu.map(function (a) { return [nm('edu', a.k), UI.usd(a.v)]; }));
    var rc = ['wages', 'socSec', 'retirement', 'assets', 'selfEmp', 'paSnap', 'ssi'].map(function (k) { return by(I.receive, k); }).filter(Boolean);
    UI.bar('chReceive', { horizontal: true, labels: rc.map(function (a) { return nm('receive', a.k); }), data: rc.map(function (a) { return a.pct; }), fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, valueLabels: true, catSize: 10.5, thickness: 14 });
    UI.table('chReceive', [tr('Tipo de ingreso', 'Type of income'), tr('% de hogares que lo recibe', '% of households receiving it')], rc.map(function (a) { return [nm('receive', a.k), UI.pct(a.pct)]; }));
    incomeMap();
  }
  function incomeMap() {
    var T = D.states; if (!T) return;
    var usdF = function (v) { return UI.usd(v); }, kF = function (v) { return '$' + UI.nf(v / 1000, 0) + (UI.lang === 'en' ? 'K' : ' mil'); }, pF = function (v) { return UI.pct(v); };
    var M = [
      { id: 'medHH', label: tr('Mediana del ingreso del hogar', 'Median household income'), btn: tr('Mediana del hogar', 'Household median'), get: function (s) { return s.medHH; }, us: T.us.medHH, fmt: usdF, short: kF, kind: 'R', src: 'census', year: T.acsYear },
      { id: 'meanHH', label: tr('Ingreso promedio del hogar', 'Mean household income'), btn: tr('Promedio del hogar', 'Household mean'), get: function (s) { return s.meanHH; }, us: T.us.meanHH, fmt: usdF, short: kF, kind: 'R', src: 'census', year: T.acsYear },
      { id: 'pcpi', label: tr('Ingreso personal per cápita', 'Per-capita personal income'), btn: tr('Ingreso personal per cápita', 'Per-capita personal income'), get: function (s) { return s.pcpi; }, us: D.funds && D.funds.population ? null : null, fmt: usdF, short: kF, kind: 'R', src: 'beaStates', year: T.pcpiYear },
      { id: 'pcpiAdj', label: tr('Ingreso personal per cápita ajustado por costo de vida', 'Per-capita personal income adjusted for the cost of living'), btn: tr('Ajustado por costo de vida', 'Cost-of-living adjusted'), get: function (s) { return s.pcpiAdj; }, us: null, fmt: usdF, short: kF, kind: 'C', src: 'beaStates', year: T.rppYear },
      { id: 'poverty', label: tr('Personas en pobreza', 'People in poverty'), btn: tr('Pobreza', 'Poverty'), get: function (s) { return s.poverty; }, us: T.us.poverty, fmt: pF, kind: 'C', src: 'census', year: T.acsYear },
      { id: 'gini', label: tr('Índice de Gini del ingreso de los hogares', 'Gini index of household income'), btn: tr('Desigualdad (Gini)', 'Inequality (Gini)'), get: function (s) { return s.gini; }, us: T.us.gini, fmt: function (v) { return UI.nf(v, 3); }, kind: 'R', src: 'census', year: T.acsYear }
    ].filter(function (m) { return T.list.some(function (s) { return m.get(s) != null; }); });
    var notes = {
      medHH: bi('La mitad de los hogares del estado gana más y la mitad gana menos. Dólares de ' + T.acsYear + '.', 'Half of the state\'s households earn more and half earn less. ' + T.acsYear + ' dollars.'),
      meanHH: bi('Ingreso agregado de los hogares entre el número de hogares; lo elevan los ingresos más altos, por eso supera a la mediana. Dólares de ' + T.acsYear + '.', 'Aggregate household income divided by the number of households; the highest incomes pull it up, which is why it exceeds the median. ' + T.acsYear + ' dollars.'),
      pcpi: bi('Ingreso personal de la BEA entre la población: incluye prestaciones pagadas por el empleador y del gobierno (Medicare, Medicaid), por lo que es mayor que el ingreso de las encuestas. ' + T.pcpiYear + '.', 'BEA personal income divided by population: it includes employer-paid and government benefits (Medicare, Medicaid), so it is higher than survey income. ' + T.pcpiYear + '.'),
      pcpiAdj: bi('Ingreso personal per cápita de ' + T.rppYear + ' dividido entre la paridad regional de precios del estado (EE. UU. = 100): lo que ese ingreso compra a precios nacionales.', 'Per-capita personal income of ' + T.rppYear + ' divided by the state\'s regional price parity (U.S. = 100): what that income buys at national prices.'),
      poverty: bi('Porcentaje de personas con ingreso por debajo del umbral oficial de pobreza. ' + T.acsYear + '.', 'Share of people with income below the official poverty threshold. ' + T.acsYear + '.'),
      gini: bi('0 = todos los hogares ganan lo mismo; 1 = un hogar recibe todo el ingreso. ' + T.acsYear + '.', '0 = every household earns the same; 1 = one household receives all income. ' + T.acsYear + '.')
    };
    function draw() {
      UI.seg('segIncomeMap', M.map(function (m) { return { id: m.id, label: m.btn }; }), state.incomeMap, function (id) { state.incomeMap = id; draw(); });
      var m = UI.stateMap({ box: 'mapIncome', chips: 'chipsIncome', scale: 'scaleIncome', rank: 'rankIncome', tblKey: 'mapIncome', states: T.list, metrics: M, current: state.incomeMap });
      $('capIncomeMap').innerHTML = notes[m.id] + ' ' + UI.kind(m.kind);
      $('srcIncomeMap').innerHTML = srcLine(m.src);
    }
    draw();
  }

  // =====================================================================================================================
  // 04 Sources and uses of funds
  // =====================================================================================================================
  function funds() {
    var F = D.funds; if (!F) return;
    var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
    var perCap = F.population ? F.dpi * 1e9 / F.population : null;
    $('fundsStats').innerHTML = [st(UI.money(F.pi), tr('Ingreso personal, tasa anual', 'Personal income, annual rate')), st(UI.money(F.dpi), tr('Ingreso disponible (después de impuestos)', 'Disposable income (after taxes)')), st(UI.money(F.pceTotal), tr('Gasto de consumo', 'Consumer spending')),
      st(UI.pct(F.savingRate), tr('Tasa de ahorro personal', 'Personal saving rate')), perCap ? st(UI.usd(perCap), tr('Ingreso disponible por persona', 'Disposable income per person'), 'C') : ''].join('');
    // flow: gross sources on the left, uses on the right (contributions for social insurance shown as a use)
    var gcol = { labor: S(1), property: S(3), transfers: S(2), gov: S(7), consumption: S(5), finance: S(4), saving: S(6) };
    var grp = { wages: 'labor', supplements: 'labor', proprietors: 'property', rental: 'property', interest: 'property', dividends: 'property', socSec: 'transfers', medicare: 'transfers', medicaid: 'transfers', otherGov: 'transfers', otherTransfers: 'transfers' };
    var ugrp = { contributions: 'gov', taxes: 'gov', pceServices: 'consumption', pceNondurables: 'consumption', pceDurables: 'consumption', pce: 'consumption', interestPaid: 'finance', transfersPaid: 'finance', saving: 'saving' };
    var contrib = -by(F.sources, 'contributions').v;
    var left = F.sources.filter(function (x) { return x.k !== 'contributions'; }).map(function (x) { return { label: nm('src', x.k), v: x.v, color: gcol[grp[x.k]] }; });
    var right = [{ k: 'contributions', v: contrib }].concat(F.uses).map(function (x) { return { label: nm('use', x.k), v: x.v, color: gcol[ugrp[x.k]] }; });
    var gross = sum(left.map(function (x) { return x.v; }));
    $('capFlow').innerHTML = bi(
      UI.date(F.asOf) + ', miles de millones de dólares a tasa anual y porcentaje del total. Total de ambos lados: ' + UI.money(gross) + ' = ingreso personal (' + UI.money(F.pi) + ') más las contribuciones a la seguridad social (' + UI.money(contrib) + '), que las cuentas nacionales restan del ingreso y aquí se muestran como un uso. ' + UI.kind('C'),
      UI.date(F.asOf) + ', billions of dollars at an annual rate and percent of the total. Total on both sides: ' + UI.money(gross) + ' = personal income (' + UI.money(F.pi) + ') plus contributions for social insurance (' + UI.money(contrib) + '), which the national accounts subtract from income and are shown here as a use. ' + UI.kind('C'));
    var mfmt = function (v) { return '$' + UI.nf(v, 0); };
    UI.flow({ el: 'flowSvg', bars: 'flowBars', left: left, right: right, fmt: mfmt, headL: tr('Fuentes', 'Sources'), headR: tr('Usos', 'Uses'), aria: tr('Fuentes y usos del ingreso personal', 'Sources and uses of personal income') });
    UI.table('flow', [tr('Concepto', 'Item'), tr('Miles de millones de dólares', 'Billions of dollars'), tr('% del total', '% of total')],
      [[('<b>' + tr('Fuentes', 'Sources') + '</b>'), '', '']].concat(left.map(function (x) { return [x.label, UI.nf(x.v, 1), UI.pct(x.v / gross * 100)]; })).concat([[('<b>' + tr('Usos', 'Uses') + '</b>'), '', '']]).concat(right.map(function (x) { return [x.label, UI.nf(x.v, 1), UI.pct(x.v / gross * 100)]; })).concat([[tr('Total de cada lado', 'Total of each side'), UI.nf(gross, 1), '100.0%']]));
    var H = F.history;
    if (H) {
      var sh = function (arr) { return arr.map(function (v, i) { return v == null || !H.pi[i] ? null : Math.round(v / H.pi[i] * 1000) / 10; }); };
      var srcSets = [{ label: tr('Remuneración al trabajo', 'Employee compensation'), data: sh(H.compensation), color: S(1) }, { label: tr('Transferencias recibidas', 'Transfers received'), data: sh(H.transfers), color: S(2) }, { label: tr('Intereses y dividendos', 'Interest and dividends'), data: sh(H.assets), color: S(3) }, { label: tr('Negocios propios', "Proprietors' income"), data: sh(H.proprietors), color: S(4) }, { label: tr('Rentas', 'Rental income'), data: sh(H.rental), color: S(5) }];
      UI.line('chSrcHist', { labels: H.years, datasets: srcSets, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
      UI.legend('chSrcHist', srcSets.map(function (d) { return { c: d.color, l: d.label, line: 1 }; }));
      var pick = [0, 20, 40, H.years.length - 1].filter(function (i, j, a) { return i < H.years.length && a.indexOf(i) === j; });
      UI.table('chSrcHist', [tr('Año', 'Year')].concat(srcSets.map(function (d) { return d.label; })), H.years.map(function (y, i) { return [y].concat(srcSets.map(function (d) { return UI.pct(d.data[i]); })); }).reverse());
      var useSets = [{ label: tr('Consumo', 'Consumption'), data: sh(H.pce), color: S(5) }, { label: tr('Impuestos personales', 'Personal taxes'), data: sh(H.taxes), color: S(7) }, { label: tr('Ahorro personal', 'Personal saving'), data: sh(H.saving), color: S(6) }, { label: tr('Intereses pagados', 'Interest paid'), data: sh(H.interestPaid), color: S(4) }];
      UI.line('chUseHist', { labels: H.years, datasets: useSets, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
      UI.legend('chUseHist', useSets.map(function (d) { return { c: d.color, l: d.label, line: 1 }; }));
      UI.table('chUseHist', [tr('Año', 'Year')].concat(useSets.map(function (d) { return d.label; })), H.years.map(function (y, i) { return [y].concat(useSets.map(function (d) { return UI.pct(d.data[i]); })); }).reverse());
      var i0 = H.years.indexOf(1970), i1 = H.years.length - 1, tsh = sh(H.transfers), csh = sh(H.compensation);
      if (i0 >= 0) $('fundsCallout').innerHTML = bi(
        '<b>Cambio de fondo:</b> las transferencias (Seguro Social, Medicare, Medicaid y otras) pasaron del ' + UI.pct(tsh[i0]) + ' del ingreso personal en 1970 al <b>' + UI.pct(tsh[i1]) + '</b> en ' + H.years[i1] + '; la remuneración al trabajo bajó del ' + UI.pct(csh[i0]) + ' al ' + UI.pct(csh[i1]) + '. Un consumidor que envejece depende más de prestaciones y de sus activos que de su salario. ' + UI.kind('C'),
        '<b>The structural shift:</b> transfers (Social Security, Medicare, Medicaid and others) went from ' + UI.pct(tsh[i0]) + ' of personal income in 1970 to <b>' + UI.pct(tsh[i1]) + '</b> in ' + H.years[i1] + '; employee compensation fell from ' + UI.pct(csh[i0]) + ' to ' + UI.pct(csh[i1]) + '. An aging consumer depends more on benefits and assets than on a paycheck. ' + UI.kind('C'));
    }
    if (F.pce) {
      var cats = F.pce.cats.slice().sort(function (a, b) { return b.v - a.v; });
      $('capPce').innerHTML = bi('Consumo por tipo de producto, ' + UI.date(F.pce.asOf) + ', porcentaje del gasto de consumo (' + UI.money(F.pce.total) + ' a tasa anual) ' + UI.kind('C'), 'Consumption by type of product, ' + UI.date(F.pce.asOf) + ', percent of consumer spending (' + UI.money(F.pce.total) + ' at an annual rate) ' + UI.kind('C'));
      var goods = { vehicles: 1, furnishings: 1, recGoods: 1, otherDurables: 1, foodHome: 1, clothing: 1, gasoline: 1, otherNondurables: 1 };
      UI.bar('chPce', { horizontal: true, labels: cats.map(function (c) { return nm('pce', c.k); }), data: cats.map(function (c) { return c.v / F.pce.total * 100; }), colors: cats.map(function (c) { return goods[c.k] ? S(2) : S(1); }), fmt: function (v, i) { return UI.pct(v) + (i != null ? ' · ' + UI.money(cats[i].v) : ''); }, axisFmt: function (v) { return v + '%'; }, valueLabels: function (v) { return UI.pct(v); }, catSize: 10.5, thickness: 16 });
      UI.table('chPce', [tr('Categoría', 'Category'), tr('Tipo', 'Type'), tr('Miles de millones de dólares', 'Billions of dollars'), '%'], cats.map(function (c) { return [nm('pce', c.k), goods[c.k] ? tr('Bienes', 'Goods') : tr('Servicios', 'Services'), UI.nf(c.v, 1), UI.pct(c.v / F.pce.total * 100)]; }));
      UI.legend('chPce', [{ c: S(1), l: tr('Servicios', 'Services') }, { c: S(2), l: tr('Bienes', 'Goods') }]);
    }
    if (F.savingRateSeries) {
      var sr = F.savingRateSeries;
      UI.line('chSaving', { labels: sr.map(function (o) { return o[0].slice(0, 4); }), datasets: [{ label: tr('Tasa de ahorro', 'Saving rate'), data: sr.map(function (o) { return o[1]; }), color: S(6), fill: true }], fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, xTicks: 9 });
      UI.charts.chSaving.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(sr[it[0].dataIndex][0]); }; UI.charts.chSaving.update();
      UI.table('chSaving', [tr('Mes', 'Month'), tr('Tasa de ahorro', 'Saving rate')], sr.slice(-24).reverse().map(function (o) { return [UI.date(o[0]), UI.pct(o[1])]; }));
    }
  }

  // =====================================================================================================================
  // 05 Spending by income decile
  // =====================================================================================================================
  var BASICS = { foodHome: 1, shelter: 1, utilities: 1, health: 1, gasoline: 1, vehicleOther: 1 };
  function basicsShare() { var d = D.cex.deciles; return d.total.map(function (t, i) { return sum(d.cats.filter(function (c) { return BASICS[c.k]; }).map(function (c) { return c.v[i]; })) / t * 100; }); }
  function deciles() {
    var X = D.cex; if (!X) return;
    var d = X.deciles, idx = d.columns.map(function (_, i) { return i; }), ten = idx.slice(1), labels10 = ten.map(dec);
    var s = decileShares(), st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
    $('cexStats').innerHTML = [st(UI.usd(d.total[0]), tr('Gasto anual promedio por hogar', 'Average annual spending per household')), st(UI.usd(d.incomeBefore[0]), tr('Ingreso promedio antes de impuestos', 'Average income before taxes')),
      st(UI.usd(d.total[1]) + ' – ' + UI.usd(d.total[10]), tr('Gasto del decil 1 al decil 10', 'Spending, decile 1 to decile 10')), st(UI.nf(d.total[10] / d.total[1], 1) + '×', tr('Gasto del decil 10 frente al decil 1', 'Decile 10 spending relative to decile 1'), 'C'), st(UI.pct(s[8] + s[9], 0), tr('Del gasto total lo hace el 20% superior', 'Of all spending is done by the top 20%'), 'C')].join('');
    var kf = function (v) { return '$' + UI.nf(v / 1000, 1) + (UI.lang === 'en' ? 'K' : ' mil'); };
    UI.bar('chDecSpendInc', { labels: labels10, datasets: [{ label: tr('Gasto', 'Spending'), data: ten.map(function (i) { return d.total[i]; }), color: S(1) }, { label: tr('Ingreso antes de impuestos', 'Income before taxes'), data: ten.map(function (i) { return d.incomeBefore[i]; }), color: S(2) }], fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + v / 1000 + (UI.lang === 'en' ? 'K' : ' mil'); }, thickness: 16, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1); } });
    UI.legend('chDecSpendInc', [{ c: S(1), l: tr('Gasto anual promedio', 'Average annual expenditures') }, { c: S(2), l: tr('Ingreso antes de impuestos', 'Income before taxes') }]);
    UI.table('chDecSpendInc', [tr('Decil', 'Decile'), tr('Gasto', 'Spending'), tr('Ingreso antes de impuestos', 'Income before taxes'), tr('Gasto ÷ ingreso', 'Spending ÷ income'), tr('Edad de la persona de referencia', 'Age of reference person'), tr('Personas', 'People')],
      idx.map(function (i) { return [i === 0 ? tr('Todos', 'All') : tr('Decil ', 'Decile ') + i, UI.usd(d.total[i]), UI.usd(d.incomeBefore[i]), d.incomeBefore[i] > 0 ? UI.pct(d.total[i] / d.incomeBefore[i] * 100, 0) : '—', d.age[i] == null ? '—' : UI.nf(d.age[i], 1), d.people[i] == null ? '—' : UI.nf(d.people[i], 1)]; }));
    UI.bar('chDecShare', { labels: labels10, data: s, colors: s.map(function (_, i) { return i >= 8 ? S(1) : UI.css('--neutral-mark'); }), fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, valueLabels: function (v) { return UI.pct(v, 0); }, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1); } });
    UI.table('chDecShare', [tr('Decil', 'Decile'), tr('% del gasto total', '% of all spending'), tr('% acumulado', 'Cumulative %')], s.map(function (v, i) { return [tr('Decil ', 'Decile ') + (i + 1), UI.pct(v), UI.pct(sum(s.slice(0, i + 1)))]; }));
    var over = ten.filter(function (i) { return d.total[i] > d.incomeBefore[i]; });
    $('cexCallout').innerHTML = bi(
      '<b>Dos economías de consumo.</b> El 20% de hogares de mayor ingreso hace el <b>' + UI.pct(s[8] + s[9], 0) + '</b> del gasto y el 10% superior solo, el ' + UI.pct(s[9], 0) + '; la mitad de menor ingreso hace el ' + UI.pct(sum(s.slice(0, 5)), 0) + '. Por eso la suerte del consumo agregado depende sobre todo de los hogares de ingreso alto, mientras que los minoristas de descuento dependen de la otra mitad. ' +
      (over.length ? 'En ' + (over.length === 1 ? 'el decil ' + over[0] : 'los deciles ' + over.slice(0, -1).join(', ') + ' y ' + last(over)) + ' el gasto supera al ingreso reportado (jubilados que usan ahorros, estudiantes, ingresos temporalmente bajos y subregistro de ingresos). ' : '') + UI.kind('C'),
      '<b>Two consumer economies.</b> The top 20% of households by income do <b>' + UI.pct(s[8] + s[9], 0) + '</b> of spending and the top 10% alone do ' + UI.pct(s[9], 0) + '; the lower-income half does ' + UI.pct(sum(s.slice(0, 5)), 0) + '. That is why aggregate consumption rides mostly on higher-income households, while discount retailers depend on the other half. ' +
      (over.length ? 'In decile' + (over.length === 1 ? ' ' + over[0] : 's ' + over.slice(0, -1).join(', ') + ' and ' + last(over)) + ' spending exceeds reported income (retirees drawing on savings, students, temporarily low incomes and under-reported income). ' : '') + UI.kind('C'));
    heat();
    var bs = basicsShare();
    UI.bar('chBasics', { labels: labels10, stacked: true, datasets: [{ label: tr('Básico', 'Basics'), data: ten.map(function (i) { return bs[i]; }), color: S(1) }, { label: tr('Todo lo demás', 'Everything else'), data: ten.map(function (i) { return 100 - bs[i]; }), color: UI.css('--neutral-mark') }], fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, max: 100, thickness: 26, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1); } });
    UI.legend('chBasics', [{ c: S(1), l: tr('Básico: alimentos en casa, vivienda, servicios, salud, gasolina y otros gastos del vehículo', 'Basics: food at home, shelter, utilities, healthcare, gasoline and other vehicle expenses') }, { c: UI.css('--neutral-mark'), l: tr('Todo lo demás', 'Everything else') }]);
    UI.table('chBasics', [tr('Decil', 'Decile'), tr('Básico, % del gasto', 'Basics, % of spending'), tr('Básico, dólares', 'Basics, dollars')], idx.map(function (i) { return [i === 0 ? tr('Todos', 'All') : tr('Decil ', 'Decile ') + i, UI.pct(bs[i]), UI.usd(bs[i] / 100 * d.total[i])]; }));
    if (d.incomeSources) {
      var colsI = { wages: S(1), selfEmp: S(4), retirement: S(2), assets: S(3), assistance: S(5), other: UI.css('--neutral-mark') };
      var sets = d.incomeSources.map(function (x) { return { label: nm('inc', x.k), color: colsI[x.k], data: ten.map(function (i) { var t = sum(d.incomeSources.map(function (y) { return Math.max(0, y.v[i]); })); return Math.max(0, x.v[i]) / t * 100; }) }; });
      UI.bar('chDecSources', { labels: labels10, stacked: true, datasets: sets, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, max: 100, thickness: 26, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1); } });
      UI.legend('chDecSources', sets.map(function (x) { return { c: x.color, l: x.label }; }));
      UI.table('chDecSources', [tr('Decil', 'Decile')].concat(d.incomeSources.map(function (x) { return nm('inc', x.k); })).concat([tr('Ingreso antes de impuestos', 'Income before taxes')]), idx.map(function (i) { return [i === 0 ? tr('Todos', 'All') : tr('Decil ', 'Decile ') + i].concat(d.incomeSources.map(function (x) { return UI.usd(x.v[i]); })).concat([UI.usd(d.incomeBefore[i])]); }));
    }
    if (X.age && X.age.total) {
      var A = X.age, cols7 = [1, 2, 3, 4, 5, 7, 8].filter(function (i) { return A.total[i] != null; }), al = { 1: ['Menores de 25', 'Under 25'], 2: ['25 a 34', '25 to 34'], 3: ['35 a 44', '35 to 44'], 4: ['45 a 54', '45 to 54'], 5: ['55 a 64', '55 to 64'], 6: ['65 o más', '65 and over'], 7: ['65 a 74', '65 to 74'], 8: ['75 o más', '75 and over'] };
      var an = function (i) { return tr(al[i][0], al[i][1]); }, as = { 1: '<25', 2: '25–34', 3: '35–44', 4: '45–54', 5: '55–64', 6: '65+', 7: '65–74', 8: '75+' };
      UI.bar('chAgeSpend', { labels: cols7.map(function (i) { return as[i]; }), tipTitle: function (i) { return an(cols7[i]) + (cols7[i] > 1 ? tr(' años', '') : ''); }, datasets: [{ label: tr('Gasto', 'Spending'), data: cols7.map(function (i) { return A.total[i]; }), color: S(1) }, { label: tr('Ingreso antes de impuestos', 'Income before taxes'), data: cols7.map(function (i) { return A.incomeBefore[i]; }), color: S(2) }], fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + v / 1000 + (UI.lang === 'en' ? 'K' : ' mil'); }, thickness: 18 });
      UI.legend('chAgeSpend', [{ c: S(1), l: tr('Gasto anual promedio', 'Average annual expenditures') }, { c: S(2), l: tr('Ingreso antes de impuestos', 'Income before taxes') }]);
      UI.table('chAgeSpend', [tr('Edad de la persona de referencia', 'Age of reference person'), tr('Gasto', 'Spending'), tr('Ingreso antes de impuestos', 'Income before taxes')].concat(A.cats ? [tr('Vivienda, % del gasto', 'Housing, % of spending'), tr('Salud, % del gasto', 'Healthcare, % of spending')] : []),
        cols7.map(function (i) { var r = [an(i), UI.usd(A.total[i]), UI.usd(A.incomeBefore[i])]; if (A.cats) { r.push(UI.pct(by(A.cats, 'housing').v[i] / A.total[i] * 100), UI.pct(by(A.cats, 'health').v[i] / A.total[i] * 100)); } return r; }));
    }
    if (d.tenure) {
      var tn = d.tenure, tsets = [{ label: tr('Dueños con hipoteca', 'Owners with a mortgage'), data: ten.map(function (i) { return tn.ownerMortgage[i]; }), color: S(1) }, { label: tr('Dueños sin hipoteca', 'Owners without a mortgage'), data: ten.map(function (i) { return tn.ownerFree[i]; }), color: S(3) }, { label: tr('Inquilinos', 'Renters'), data: ten.map(function (i) { return tn.renter[i]; }), color: S(2) }];
      UI.bar('chDecTenure', { labels: labels10, stacked: true, datasets: tsets, fmt: function (v) { return UI.pct(v, 0); }, axisFmt: function (v) { return v + '%'; }, max: 100, thickness: 26, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1); } });
      UI.legend('chDecTenure', tsets.map(function (x) { return { c: x.color, l: x.label }; }));
      UI.table('chDecTenure', [tr('Decil', 'Decile')].concat(tsets.map(function (x) { return x.label; })), idx.map(function (i) { return [i === 0 ? tr('Todos', 'All') : tr('Decil ', 'Decile ') + i, UI.pct(tn.ownerMortgage[i], 0), UI.pct(tn.ownerFree[i], 0), UI.pct(tn.renter[i], 0)]; }));
    }
  }
  function heat() {
    var d = D.cex.deciles, mode = state.heat, compact = window.innerWidth <= 640;   // phones: ten narrow columns, whole numbers, no "All" column (the table view keeps every figure)
    state.heatCompact = compact;
    UI.seg('segHeat', [{ id: 'share', label: tr('% del gasto del decil', '% of the decile\'s spending') }, { id: 'usd', label: tr('Dólares por hogar', 'Dollars per household') }], mode, function (id) { state.heat = id; heat(); });
    $('capHeat').innerHTML = bi('Cada fila es una categoría de gasto y cada columna un decil de ingreso (' + D.cex.asOf + '). El color compara los deciles dentro de cada fila: el más oscuro es el decil donde esa categoría pesa más. ' + UI.kind(mode === 'share' ? 'C' : 'R'),
      'Each row is a spending category and each column an income decile (' + D.cex.asOf + '). Color compares the deciles within each row: the darkest is the decile where that category weighs most. ' + UI.kind(mode === 'share' ? 'C' : 'R'));
    var cats = d.cats.slice().sort(function (a, b) { return b.v[0] - a.v[0]; });
    var h = '<thead><tr><th scope="col">' + (compact ? tr('Decil', 'Decile') + ' →' : tr('Categoría', 'Category')) + '</th>' + (compact ? '' : '<th scope="col">' + tr('Todos', 'All') + '</th>') + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return '<th scope="col">' + (compact ? i : 'D' + i) + '</th>'; }).join('') + '</tr></thead><tbody>';
    cats.forEach(function (c) {
      var vals = c.v.map(function (v, i) { return mode === 'share' ? v / d.total[i] * 100 : v; }), ten = vals.slice(1), mn = Math.min.apply(null, ten), mx = Math.max.apply(null, ten);
      var f = function (v) { return mode === 'share' ? UI.nf(v, compact ? 0 : 1) : UI.nf(v / 1000, compact ? 0 : 1); };
      h += '<tr><td>' + nm('cex', c.k) + (c.k === 'gasoline' ? ' *' : '') + '</td>' + (compact ? '' : '<td class="all num">' + f(vals[0]) + '</td>') + ten.map(function (v) { var cls = mx > mn ? Math.min(6, Math.floor((v - mn) / (mx - mn) * 7)) : 3, bg = UI.seq(cls); return '<td class="num" style="background:' + bg + ';color:' + UI.inkOn(bg) + '">' + f(v) + '</td>'; }).join('') + '</tr>';
    });
    h += '<tr class="sep"><td><b>' + (compact ? tr('Gasto total, miles de dólares', 'Total spending, $ thousands') : tr('Gasto total, dólares', 'Total spending, dollars')) + '</b></td>' + (compact ? '' : '<td class="all num">' + UI.nf(d.total[0]) + '</td>') + d.total.slice(1).map(function (v) { return '<td class="all num">' + (compact ? UI.nf(v / 1000, 0) : UI.nf(v)) + '</td>'; }).join('') + '</tr></tbody>';
    $('heatDeciles').innerHTML = h; $('heatDeciles').classList.toggle('compact', compact);
    var steps = ''; for (var i = 0; i < 7; i++) steps += '<i style="background:' + UI.seq(i) + '"></i>';
    $('scaleHeat').innerHTML = '<span>' + tr('Menor peso en la fila', 'Lowest in the row') + '</span><span class="steps">' + steps + '</span><span>' + tr('Mayor peso en la fila', 'Highest in the row') + '</span><span class="note">' + (mode === 'share' ? tr('Porcentaje del gasto de cada decil', 'Percent of each decile\'s spending') : tr('Miles de dólares por hogar al año', 'Thousands of dollars per household a year')) + ' · * ' + tr('gasolina y aceite = transporte menos sus demás renglones publicados', 'gasoline and motor oil = transportation minus its other published lines') + '</span>';
  }

  // =====================================================================================================================
  // 06 Consumer credit
  // =====================================================================================================================
  function credit() {
    var B = D.debt, T = D.creditTerms;
    var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
    var stats = [];
    if (B) {
      stats.push(st(UI.money(B.balance.total * 1000, 2), tr('Deuda total de los hogares', 'Total household debt')), st(UI.money(B.balance.card * 1000, 2), tr('Saldo en tarjetas de crédito', 'Credit card balances')));
      if (B.cardUtilization) stats.push(st(UI.pct(B.cardUtilization.pct, 0), tr('Uso de las líneas de tarjetas (saldo ÷ límite)', 'Card utilization (balance ÷ limit)'), 'C'));
    }
    if (T) {
      if (T.rates.card) stats.push(st(UI.pct(last(T.rates.card)[1], 2), tr('Tasa de tarjetas, cuentas que pagan interés', 'Card rate, accounts assessed interest')));
      if (T.dsr.total) stats.push(st(UI.pct(last(T.dsr.total)[1], 1), tr('Servicio de deuda ÷ ingreso disponible', 'Debt service ÷ disposable income')));
    }
    if (B && B.d90) { var r = last(B.d90.rows), ci = B.d90.columns.indexOf('CC') + 1; if (ci > 0) stats.push(st(UI.pct(r[ci], 1), tr('Saldo de tarjetas con 90+ días de atraso', 'Card balances 90+ days delinquent'))); }
    $('creditStats').innerHTML = stats.join('');
    if (B) {
      var keys = ['mortgage', 'auto', 'student', 'card', 'other', 'heloc'], yoy = function (k) { return B.yearAgo ? (B.balance[k] / B.yearAgo[k] - 1) * 100 : null; };
      $('capDebtType').innerHTML = bi('Billones de dólares, ' + UI.date(B.asOf) + '; total ' + UI.nf(B.balance.total, 2) + ' billones', 'Trillions of dollars, ' + UI.date(B.asOf) + '; total ' + UI.nf(B.balance.total, 2) + ' trillion');
      UI.bar('chDebtType', { horizontal: true, labels: keys.map(function (k) { return nm('debt', k); }), data: keys.map(function (k) { return B.balance[k]; }), fmt: function (v, i) { return '$' + UI.nf(v, 2) + tr(' billones', ' trillion') + (i != null && yoy(keys[i]) != null ? ' · ' + UI.signed(yoy(keys[i])) + tr(' anual', ' y/y') : ''); }, axisFmt: function (v) { return '$' + v; }, valueLabels: function (v, i) { return '$' + UI.nf(v, 2) + ' (' + UI.signed(yoy(keys[i])) + ')'; }, catSize: 10.5 });
      UI.table('chDebtType', [tr('Tipo', 'Type'), tr('Billones de dólares', 'Trillions of dollars'), tr('% del total', '% of total'), tr('Variación anual', 'Change y/y')], keys.concat(['total']).map(function (k) { return [nm('debt', k), UI.nf(B.balance[k], 3), UI.pct(B.balance[k] / B.balance.total * 100), UI.signed(yoy(k))]; }));
      if (B.byProductAge) {
        var PA = B.byProductAge, pk = ['mortgage', 'auto', 'student', 'card', 'heloc', 'other'], pcol = { mortgage: S(1), auto: S(2), student: S(3), card: S(4), heloc: S(5), other: UI.css('--neutral-mark') };
        var rowOf = function (k) { return PA.rows.filter(function (r) { return N.nyRow[r[0]] === k; })[0]; };
        var setsA = pk.map(function (k) { var r = rowOf(k); return r ? { label: nm('debt', k), color: pcol[k], data: r.slice(1) } : null; }).filter(Boolean);
        $('capDebtAge').innerHTML = bi('Billones de dólares por edad del deudor y tipo de préstamo, ' + UI.date(B.asOf), 'Trillions of dollars by borrower age and type of loan, ' + UI.date(B.asOf));
        UI.bar('chDebtAge', { labels: PA.columns, stacked: true, datasets: setsA, fmt: function (v) { return '$' + UI.nf(v, 2) + tr(' billones', ' trillion'); }, axisFmt: function (v) { return '$' + v; }, thickness: 34 });
        UI.legend('chDebtAge', setsA.map(function (x) { return { c: x.color, l: x.label }; }));
        UI.table('chDebtAge', [tr('Tipo', 'Type')].concat(PA.columns), setsA.map(function (x) { return [x.label].concat(x.data.map(function (v) { return UI.nf(v, 3); })); }).concat([[tr('Total', 'Total')].concat(PA.columns.map(function (_, i) { return UI.nf(sum(setsA.map(function (x) { return x.data[i]; })), 3); }))]));
      }
      t90();
    }
    if (T) {
      var R = T.rates, base = R.card || R.auto60, lab = (R.card || []).map(function (o) { return o[0]; });
      var m = function (ser) { var mm = {}; (ser || []).forEach(function (o) { mm[o[0]] = o[1]; }); return lab.map(function (d) { return mm[d] == null ? null : mm[d]; }); };
      var rs = [{ label: tr('Tarjetas de crédito', 'Credit cards'), data: m(R.card), color: S(4) }, { label: tr('Préstamo personal, 24 meses', 'Personal loan, 24 months'), data: m(R.personal24), color: S(7) }, { label: tr('Auto nuevo, 60 meses', 'New car, 60 months'), data: m(R.auto60), color: S(2) }].filter(function (x) { return x.data.some(function (v) { return v != null; }); });
      UI.line('chRates', { labels: lab.map(function (d) { return d.slice(0, 4); }), datasets: rs, fmt: function (v) { return UI.pct(v, 2); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
      UI.charts.chRates.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(lab[it[0].dataIndex]); }; UI.charts.chRates.update();
      UI.legend('chRates', rs.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      UI.table('chRates', [tr('Mes', 'Month')].concat(rs.map(function (x) { return x.label; })), lab.slice(-12).reverse().map(function (d) { var i = lab.indexOf(d); return [UI.date(d)].concat(rs.map(function (x) { return x.data[i] == null ? '—' : UI.pct(x.data[i], 2); })); }));
      var qlab = function (d) { return d.slice(0, 4) + '-Q' + (Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1); };
      if (T.dsr.total) {
        var dl = T.dsr.total.map(function (o) { return o[0]; }), ds = [{ label: tr('Total', 'Total'), data: T.dsr.total.map(function (o) { return o[1]; }), color: S(1) }, { label: tr('Hipotecas', 'Mortgages'), data: (T.dsr.mortgage || []).map(function (o) { return o[1]; }), color: S(3) }, { label: tr('Crédito al consumo', 'Consumer credit'), data: (T.dsr.consumer || []).map(function (o) { return o[1]; }), color: S(2) }];
        UI.line('chDsr', { labels: dl.map(function (d) { return d.slice(0, 4); }), datasets: ds, fmt: function (v) { return UI.pct(v, 2); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
        UI.charts.chDsr.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(qlab(dl[it[0].dataIndex])); }; UI.charts.chDsr.update();
        UI.legend('chDsr', ds.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
        UI.table('chDsr', [tr('Trimestre', 'Quarter')].concat(ds.map(function (x) { return x.label; })), dl.slice(-12).reverse().map(function (d) { var i = dl.indexOf(d); return [UI.date(qlab(d))].concat(ds.map(function (x) { return x.data[i] == null ? '—' : UI.pct(x.data[i], 2); })); }));
      }
      if (T.bank.cardDq) {
        var bl2 = T.bank.cardDq.map(function (o) { return o[0]; }), bs = [{ label: tr('Castigos netos, tarjetas', 'Net charge-offs, cards'), data: (T.bank.cardCo || []).map(function (o) { return o[1]; }), color: S(8) }, { label: tr('Morosidad, tarjetas', 'Delinquency, cards'), data: T.bank.cardDq.map(function (o) { return o[1]; }), color: S(4) }];
        UI.line('chBank', { labels: bl2.map(function (d) { return d.slice(0, 4); }), datasets: bs, fmt: function (v) { return UI.pct(v, 2); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
        UI.charts.chBank.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(qlab(bl2[it[0].dataIndex])); }; UI.charts.chBank.update();
        UI.legend('chBank', bs.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
        UI.table('chBank', [tr('Trimestre', 'Quarter')].concat(bs.map(function (x) { return x.label; })), bl2.slice(-12).reverse().map(function (d) { var i = bl2.indexOf(d); return [UI.date(qlab(d))].concat(bs.map(function (x) { return x.data[i] == null ? '—' : UI.pct(x.data[i], 2); })); }));
      }
    }
    if (D.scf) {
      var G = D.scf.income, lab2 = G.map(function (g) { return nm('scfInc', g.k); });
      var kinds = [['card', tr('Saldo en tarjetas', 'Credit card balance'), S(4)], ['vehicle', tr('Préstamo de auto', 'Vehicle loan'), S(2)], ['edu', tr('Préstamo educativo', 'Education loan'), S(3)], ['home', tr('Deuda con garantía de la vivienda', 'Home-secured debt'), S(1)]];
      $('capScfDebt').innerHTML = bi('Porcentaje de familias con cada tipo de deuda, por percentil de ingreso, ' + D.scf.asOf + '. En la tabla, la mediana del saldo entre quienes tienen esa deuda.', 'Percent of families holding each type of debt, by income percentile, ' + D.scf.asOf + '. The table adds the median balance among those who hold it.');
      UI.bar('chScfDebt', { labels: lab2, datasets: kinds.map(function (k) { return { label: k[1], color: k[2], data: G.map(function (g) { return g.have[k[0]]; }) }; }), fmt: function (v) { return UI.pct(v, 0); }, axisFmt: function (v) { return v + '%'; }, max: 100, thickness: 20, catPct: 0.7 });
      UI.legend('chScfDebt', kinds.map(function (k) { return { c: k[2], l: k[1] }; }));
      UI.table('chScfDebt', [tr('Percentil de ingreso', 'Income percentile'), tr('Con alguna deuda', 'With any debt')].concat(kinds.map(function (k) { return k[1] + ' (%)'; })).concat(kinds.map(function (k) { return k[1] + tr(' (mediana)', ' (median)'); })),
        G.map(function (g) { return [nm('scfInc', g.k), UI.pct(g.have.debt, 0)].concat(kinds.map(function (k) { return UI.pct(g.have[k[0]], 0); })).concat(kinds.map(function (k) { return g.med[k[0]] == null ? '—' : UI.usd(g.med[k[0]] * 1000); })); }));
    }
    debtMap();
  }
  function t90() {
    var B = D.debt, opts = [['all', tr('Toda la deuda', 'All debt')], ['card', tr('Tarjetas', 'Credit cards')], ['auto', tr('Automotriz', 'Auto loans')], ['mortgage', tr('Hipotecas', 'Mortgages')], ['student', tr('Estudiantil', 'Student loans')]].filter(function (o) { return B.t90[o[0]]; });
    UI.seg('segT90', opts.map(function (o) { return { id: o[0], label: o[1] }; }), state.t90, function (id) { state.t90 = id; t90(); });
    var t = B.t90[state.t90]; if (!t) return;
    var palette = [S(1), S(2), S(3), S(4), S(5), S(7)], cols = t.columns, labels = t.rows.map(function (r) { return r[0]; });
    var sets = cols.map(function (c, i) { var isAll = /^all$/i.test(c); return { label: isAll ? tr('Todas las edades', 'All ages') : c, data: t.rows.map(function (r) { return r[i + 1]; }), color: isAll ? UI.css('--text-primary') : palette[i % palette.length], width: isAll ? 2.5 : 1.8, dash: isAll ? [5, 4] : undefined }; });
    UI.line('chT90', { labels: labels.map(function (q) { return q.slice(0, 4); }), datasets: sets, fmt: function (v) { return UI.pct(v, 2); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
    UI.charts.chT90.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(labels[it[0].dataIndex]); }; UI.charts.chT90.update();
    UI.legend('chT90', sets.map(function (x) { return { c: x.color, l: x.label + (/\d/.test(x.label) ? tr(' años', '') : ''), line: 1 }; }));
    UI.table('chT90', [tr('Trimestre', 'Quarter')].concat(sets.map(function (x) { return x.label; })), t.rows.slice(-8).reverse().map(function (r) { return [UI.date(r[0])].concat(r.slice(1).map(function (v) { return v == null ? '—' : UI.pct(v, 2); })); }));
  }
  function debtMap() {
    var T = D.states; if (!T || !T.list[0].debt) return;
    var usdF = function (v) { return UI.usd(v); }, kF = function (v) { return '$' + UI.nf(v / 1000, v < 10000 ? 1 : 0) + (UI.lang === 'en' ? 'K' : ' mil'); }, pF = function (v) { return UI.pct(v, 2); }, pS = function (v) { return UI.pct(v, 1); };
    var g = function (k) { return function (s) { return s.debt ? s.debt[k] : null; }; };
    var M = [
      { id: 'total', label: tr('Deuda total por persona', 'Total debt per person'), btn: tr('Deuda total', 'Total debt'), get: g('total'), us: T.us.debt.total, fmt: usdF, short: kF },
      { id: 'mortgage', label: tr('Deuda hipotecaria por persona', 'Mortgage debt per person'), btn: tr('Hipotecas', 'Mortgages'), get: g('mortgage'), us: T.us.debt.mortgage, fmt: usdF, short: kF },
      { id: 'auto', label: tr('Deuda automotriz por persona', 'Auto debt per person'), btn: tr('Automotriz', 'Auto'), get: g('auto'), us: T.us.debt.auto, fmt: usdF, short: kF },
      { id: 'card', label: tr('Deuda en tarjetas por persona', 'Credit card debt per person'), btn: tr('Tarjetas', 'Cards'), get: g('card'), us: T.us.debt.card, fmt: usdF, short: kF },
      { id: 'student', label: tr('Deuda estudiantil por persona', 'Student debt per person'), btn: tr('Estudiantil', 'Student'), get: g('student'), us: T.us.debt.student, fmt: usdF, short: kF },
      { id: 'dqCard', label: tr('Tarjetas: saldo con 90+ días de atraso', 'Cards: balance 90+ days delinquent'), btn: tr('Morosidad: tarjetas', 'Delinquency: cards'), get: g('dqCard'), us: T.us.debt.dqCard, fmt: pF, short: pS },
      { id: 'dqAuto', label: tr('Automotriz: saldo con 90+ días de atraso', 'Auto: balance 90+ days delinquent'), btn: tr('Morosidad: automotriz', 'Delinquency: auto'), get: g('dqAuto'), us: T.us.debt.dqAuto, fmt: pF, short: pS },
      { id: 'dqMortgage', label: tr('Hipotecas: saldo con 90+ días de atraso', 'Mortgages: balance 90+ days delinquent'), btn: tr('Morosidad: hipotecas', 'Delinquency: mortgages'), get: g('dqMortgage'), us: T.us.debt.dqMortgage, fmt: pF, short: pS }
    ];
    function draw() {
      UI.seg('segDebtMap', M.map(function (m) { return { id: m.id, label: m.btn }; }), state.debtMap, function (id) { state.debtMap = id; draw(); });
      var m = UI.stateMap({ box: 'mapDebt', chips: 'chipsDebt', scale: 'scaleDebt', rank: 'rankDebt', tblKey: 'mapDebt', states: T.list, metrics: M, current: state.debtMap });
      var dq = /^dq/.test(m.id);
      $('capDebtMap').innerHTML = bi(
        (dq ? 'Porcentaje del saldo con 90 días o más de atraso' : 'Saldo promedio por persona con historial crediticio, dólares') + ', al cuarto trimestre de ' + T.debtAsOf.slice(0, 4) + '. Los totales de esta base estatal pueden diferir ligeramente del informe trimestral nacional. ' + UI.kind('R'),
        (dq ? 'Percent of the balance 90 or more days delinquent' : 'Average balance per person with a credit report, dollars') + ', as of the fourth quarter of ' + T.debtAsOf.slice(0, 4) + '. Totals in this state file can differ slightly from the national quarterly report. ' + UI.kind('R'));
    }
    draw();
  }

  // =====================================================================================================================
  // 07 Leverage and financial stress
  // =====================================================================================================================
  var ma = function (a, n) { return a.map(function (_, i) { if (i < n - 1) return null; var s2 = 0, c = 0; for (var j = i - n + 1; j <= i; j++) if (a[j] != null) { s2 += a[j]; c++; } return c === n ? Math.round(s2 / c * 10) / 10 : null; }); };
  var qy = function (q) { return String(q).slice(0, 4); };
  function stressFacts() {
    var f = {}, L = D.leverage, C = D.cards, E = D.expect, B = D.burden, SL = D.studentLoans, I = D.insolvency, T = D.states, BN = D.bnpl, BF = D.buffers;
    if (L) { var a = L.income.all, n = a.d2a.length - 1, i19 = L.income.quarters.indexOf('2019-Q4'); f.d2a = a.d2a[n]; f.d2a19 = i19 >= 0 ? a.d2a[i19] : null; f.levQ = L.asOf;
      var lo = L.income.cc2cash.pct00to20, hi = L.income.cc2cash.pct99to100; if (lo && hi) { f.cashLo = last(lo); f.cashHi = last(hi); f.cashLo19 = i19 >= 0 ? lo[i19] : null; }
      var b50 = L.networth.d2a.Bottom50; if (b50) { f.b50 = last(b50); f.b5019 = i19 >= 0 ? b50[L.networth.quarters.indexOf('2019-Q4')] : null; } }
    if (C) { var m = C.quarters.length - 1, y4 = m - 4; f.cq = C.asOf; f.payMin = C.payMin[m]; f.payFull = C.payFull[m]; f.payMinPrev = y4 >= 0 ? C.payMin[y4] : null; f.payFullPrev = y4 >= 0 ? C.payFull[y4] : null; f.payMinMax = Math.max.apply(null, C.payMin.filter(function (v) { return v != null; }));
      if (C.buyHigh && C.buyLow) { f.buyHigh = C.buyHigh[m]; f.buyLow = C.buyLow[m]; var j19 = C.quarters.indexOf('2019-Q2') >= 0 && /Q2$/.test(C.asOf) ? C.quarters.indexOf('2019-Q2') : C.quarters.indexOf('2019-Q4'); if (j19 >= 0) { f.buyFrom = C.quarters[j19]; f.buyHighG = (C.buyHigh[m] / C.buyHigh[j19] - 1) * 100; f.buyLowG = (C.buyLow[m] / C.buyLow[j19] - 1) * 100; } } }
    if (E) { var d = E.delinquency, k = d.months.length - 1, gi = function (re) { var i = d.groups.findIndex(function (g) { return re.test(g); }); return i < 0 ? null : d.byGroup[i]; };
      f.em = E.asOf; f.miss = d.all[k]; f.miss3 = last(ma(d.all, 3)); var lo2 = gi(/Income under/i), hi2 = gi(/Income Over/i); if (lo2 && hi2) { f.missLo = last(ma(lo2, 3)); f.missHi = last(ma(hi2, 3)); }
      var A = E.access, w = A.waves.length - 1; f.aw = A.asOf; f.applied = A.applied[w]; f.rejected = A.rejected[w]; f.discouraged = A.discouraged[w]; f.rejMax = Math.max.apply(null, A.rejected.filter(function (v) { return v != null; }));
      var sc = function (key) { return A.byScore.filter(function (x) { return x.k === key; })[0] || null; }; f.low = sc('less_680'); f.high = sc('over_760'); f.comeUp = A.comeUp[w];
      f.harder = last(E.credit.harderNow); f.worse = last(E.finances.worseNow); }
    if (B) { var bn = B.years.length - 1; f.by = B.asOf; f.over40 = B.all.over40[bn]; f.over40Prev = B.all.over40[bn - 1]; f.byPrev = B.years[bn - 1]; var inc = B.income; if (inc.length) { f.over40Lo = inc[0].over40[bn]; f.over40Hi = inc[inc.length - 1].over40[bn]; } if (B.all.late60) { f.late60 = B.all.late60[bn]; f.late60Prev = B.all.late60[bn - 1]; if (inc.length && inc[0].late60) f.late60Lo = inc[0].late60[bn]; } }
    if (SL) { var sn = SL.dates.length - 1, s4 = sn - 4; f.sd = SL.asOf; f.slTotal = SL.total[sn]; f.slDefault = SL.usd.default[sn]; f.slDefaultPrev = s4 >= 0 ? SL.usd.default[s4] : null; f.slDefaultPeople = SL.people.default[sn]; f.slRepay = SL.usd.repayment[sn]; f.slForb = SL.usd.forbearance[sn]; f.slForbPeople = SL.people.forbearance[sn]; if (SL.delinquency) f.slLate = last(SL.delinquency.lateShare); }
    if (I) { var q = I.quarters.length - 1; f.iq = I.asOf; f.bk4 = sum(I.bankruptcy.slice(-4)); f.bk4prev = sum(I.bankruptcy.slice(-8, -4)); f.fc4 = sum(I.foreclosure.slice(-4)); f.fc4prev = sum(I.foreclosure.slice(-8, -4)); var i19q = I.quarters.indexOf('2019-Q4'); if (i19q >= 3) f.bk2019 = sum(I.bankruptcy.slice(i19q - 3, i19q + 1)); }
    if (T && T.us.rentBurden) { f.rent30 = T.us.rentBurden.p30; f.rent50 = T.us.rentBurden.p50; f.ry = T.acsYear; }
    if (BN) { f.bnpl = last(BN.all); f.bnplY = BN.asOf; f.bnpl0 = BN.all[0]; f.bnplY0 = BN.years[0]; if (BN.bySavings) { f.bnplLow = BN.bySavings.values[0]; f.bnplHigh = last(BN.bySavings.values); } f.bnplLate = BN.late; f.bnplOverdraft = BN.overdraft; }
    if (BF) { f.okay = BF.okay; f.cash400 = BF.cash400; f.bfY = BF.asOf; }
    return f;
  }
  function stress() {
    var sec = $('estres'); if (!sec) return;
    var f = stressFacts(), any = D.leverage || D.cards || D.expect || D.studentLoans || D.insolvency;
    if (!any) return;
    var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
    var stats = [];
    if (f.d2a != null) stats.push(st(UI.pct(f.d2a), tr('Deuda de los hogares como parte de sus activos, ', 'Household debt as a share of assets, ') + UI.date(f.levQ) + (f.d2a19 != null ? tr(' (', ' (') + UI.pct(f.d2a19) + tr(' a fines de 2019)', ' at the end of 2019)') : ''), 'C'));
    if (f.payMin != null) stats.push(st(UI.pct(f.payMin), tr('De las cuentas de tarjeta paga solo el mínimo, ', 'Of card accounts pay only the minimum, ') + UI.date(f.cq)));
    if (f.miss != null) stats.push(st(UI.pct(f.miss), tr('Probabilidad promedio de no poder hacer un pago mínimo en tres meses, ', 'Average probability of missing a minimum payment within three months, ') + UI.date(f.em)));
    if (f.rejected != null) stats.push(st(UI.pct(f.rejected), tr('De quienes pidieron crédito fueron rechazados, ', 'Of those who applied for credit were turned down, ') + UI.date(f.aw)));
    if (f.bnpl != null) stats.push(st(UI.pct(f.bnpl, 0), tr('De los adultos usó "compra ahora, paga después" en ', 'Of adults used buy now, pay later in ') + f.bnplY));
    if (f.cash400 != null) stats.push(st(UI.pct(f.cash400, 0), tr('Cubriría un gasto imprevisto de $400 con efectivo o su equivalente, ', 'Would cover a $400 emergency with cash or its equivalent, ') + f.bfY));
    if (f.slDefault != null) stats.push(st(UI.money(f.slDefault, 0), tr('En préstamos estudiantiles federales en incumplimiento, ', 'In federal student loans in default, ') + UI.date(f.sd) + ' (' + UI.nf(f.slDefaultPeople, 1) + tr(' millones de personas)', ' million people)')));
    if (f.rent30 != null) stats.push(st(UI.pct(f.rent30), tr('De los inquilinos paga 30% o más de su ingreso en renta, ', 'Of renters pay 30% or more of income in rent, ') + f.ry, 'C'));
    $('stressStats').innerHTML = stats.join('');

    // the section in two halves: where the balance sheet is sound, and where the strain shows
    var es = '', en = '';
    if (f.d2a != null && f.d2a19 != null) {
      var lower = f.d2a < f.d2a19;
      es += '<b>Dónde no hay tensión:</b> en el balance. La deuda de los hogares equivale al <b>' + UI.pct(f.d2a) + '</b> de sus activos (' + UI.date(f.levQ) + '), ' + (lower ? 'menos que' : 'más que') + ' a fines de 2019 (' + UI.pct(f.d2a19) + ')' + (f.b50 != null && f.b5019 != null ? '; en la mitad con menos riqueza pasó de ' + UI.pct(f.b5019) + ' a ' + UI.pct(f.b50) : '') + '.' + (f.payFull != null ? ' El ' + UI.pct(f.payFull) + ' de las cuentas de tarjeta paga el saldo completo cada mes.' : '');
      en += '<b>Where there is no strain:</b> on the balance sheet. Household debt equals <b>' + UI.pct(f.d2a) + '</b> of assets (' + UI.date(f.levQ) + '), ' + (lower ? 'less than' : 'more than') + ' at the end of 2019 (' + UI.pct(f.d2a19) + ')' + (f.b50 != null && f.b5019 != null ? '; for the less wealthy half it went from ' + UI.pct(f.b5019) + ' to ' + UI.pct(f.b50) : '') + '.' + (f.payFull != null ? ' ' + UI.pct(f.payFull) + ' of card accounts pay the full balance every month.' : '');
    }
    var sEs = [], sEn = [];
    if (f.cashLo != null && f.cashHi != null) { sEs.push('el 20% de menor ingreso debe $' + UI.nf(f.cashLo / 100, 2) + ' de crédito al consumo por cada dólar de efectivo que tiene; el 1% de mayor ingreso, $' + UI.nf(f.cashHi / 100, 2)); sEn.push('the bottom 20% by income owe $' + UI.nf(f.cashLo / 100, 2) + ' of consumer credit for every dollar of cash they hold; the top 1%, $' + UI.nf(f.cashHi / 100, 2)); }
    if (f.low && f.high) { sEs.push('al ' + UI.pct(f.low.rejected, 0) + ' de los solicitantes con puntaje de crédito menor a 680 le negaron el crédito, frente al ' + UI.pct(f.high.rejected, 0) + ' de los de más de 760'); sEn.push(UI.pct(f.low.rejected, 0) + ' of applicants with a credit score under 680 were turned down, against ' + UI.pct(f.high.rejected, 0) + ' of those above 760'); }
    if (f.late60 != null && f.late60Prev != null) { sEs.push('el ' + UI.pct(f.late60) + ' de las familias con deuda tuvo un pago atrasado 60 días o más en ' + f.by + ' (' + UI.pct(f.late60Prev) + ' en ' + f.byPrev + ')'); sEn.push(UI.pct(f.late60) + ' of families with debt had a payment 60 days or more late in ' + f.by + ' (' + UI.pct(f.late60Prev) + ' in ' + f.byPrev + ')'); }
    if (f.missLo != null && f.missHi != null) { sEs.push('los hogares con ingreso menor a $50,000 ven ' + UI.pct(f.missLo) + ' de probabilidad de no poder hacer un pago mínimo, y los de más de $100,000, ' + UI.pct(f.missHi)); sEn.push('households earning under $50,000 see a ' + UI.pct(f.missLo) + ' chance of missing a minimum payment, and those above $100,000, ' + UI.pct(f.missHi)); }
    if (f.bnplLow != null && f.bnplHigh != null) { sEs.push('"compra ahora, paga después" lo usa el ' + UI.pct(f.bnplLow, 0) + ' de quienes tienen menos de $100 de ahorro para una emergencia y el ' + UI.pct(f.bnplHigh, 0) + ' de quienes tienen $2,000 o más'); sEn.push('buy now, pay later is used by ' + UI.pct(f.bnplLow, 0) + ' of those with under $100 of emergency savings and ' + UI.pct(f.bnplHigh, 0) + ' of those with $2,000 or more'); }
    if (f.slDefault != null && f.slDefaultPrev != null) { sEs.push('los préstamos estudiantiles federales en incumplimiento pasaron de ' + UI.money(f.slDefaultPrev, 0) + ' a ' + UI.money(f.slDefault, 0) + ' en un año'); sEn.push('federal student loans in default went from ' + UI.money(f.slDefaultPrev, 0) + ' to ' + UI.money(f.slDefault, 0) + ' in a year'); }
    if (f.rent50 != null) { sEs.push('el ' + UI.pct(f.rent50) + ' de los inquilinos paga la mitad o más de su ingreso en renta'); sEn.push(UI.pct(f.rent50) + ' of renters pay half or more of their income in rent'); }
    if (sEs.length) { es += ' <b>Dónde sí la hay:</b> en quienes tienen poco margen. ' + sEs.map(function (x, i) { return (i ? x : x.charAt(0).toUpperCase() + x.slice(1)); }).join('; ') + '.'; en += ' <b>Where there is:</b> among those with little room. ' + sEn.map(function (x, i) { return (i ? x : x.charAt(0).toUpperCase() + x.slice(1)); }).join('; ') + '.'; }
    $('stressCallout').innerHTML = bi(es + ' ' + UI.kind('C'), en + ' ' + UI.kind('C'));

    leverageCard(); burdenCard(f); cardCharts(f); expectCharts(f); bnplCard(f); bufferCard(f); studentCard(f); insolvencyCharts(f); stressMap();
  }
  function leverageCard() {
    var L = D.leverage, card = $('levCard'); if (!card) return; if (!L) { card.hidden = true; return; }
    var dims = [{ id: 'income', label: tr('Por ingreso', 'By income') }, { id: 'networth', label: tr('Por riqueza', 'By wealth') }, { id: 'age', label: tr('Por edad', 'By age') }];
    var order = { income: ['pct00to20', 'pct20to40', 'pct40to60', 'pct60to80', 'pct80to99', 'pct99to100'], networth: ['Bottom50', 'Next40', 'Next9', 'RemainingTop1', 'TopPt1'], age: ['ageunder40', 'age40to54', 'age55to69', 'age70plus'] };
    var pal = [S(7), S(2), S(5), S(4), S(3), S(1)];
    function draw() {
      UI.seg('segLev', dims, state.lev, function (id) { state.lev = id; draw(); });
      var G = L[state.lev], cats = order[state.lev].filter(function (k) { return G.d2a[k]; }), labs = G.quarters.map(qy);
      var mk = function (field) { return cats.map(function (k, i) { return { label: nm('wg', k), data: G[field][k], color: pal[(i + pal.length - cats.length) % pal.length] }; }).concat([{ label: tr('Todos los hogares', 'All households'), data: G.all[field], color: UI.css('--text-secondary'), dash: [4, 3] }]); };
      var a = mk('d2a'), b = mk('cc2cash').map(function (x) { return { label: x.label, data: x.data.map(function (v) { return v == null ? null : v / 100; }), color: x.color, dash: x.dash }; });
      var tipQ = function (id) { UI.charts[id].options.plugins.tooltip.callbacks.title = function (it) { return UI.date(G.quarters[it[0].dataIndex]); }; UI.charts[id].update(); };
      UI.line('chLevD2A', { labels: labs, datasets: a, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0, xTicks: 8 }); tipQ('chLevD2A');
      UI.line('chLevCash', { labels: labs, datasets: b, fmt: function (v) { return '$' + UI.nf(v, 2); }, axisFmt: function (v) { return '$' + UI.nf(v, v < 10 ? 1 : 0); }, min: 0, xTicks: 8 }); tipQ('chLevCash');
      UI.legend('chLevD2A', a.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      var n = G.quarters.length - 1, i19 = G.quarters.indexOf('2019-Q4'), i0 = 0;
      UI.table('chLevD2A', [tr('Grupo', 'Group'), tr('Deuda ÷ activos, ', 'Debt ÷ assets, ') + UI.date(G.quarters[n]), UI.date('2019-Q4'), UI.date(G.quarters[i0]), tr('Crédito al consumo por dólar de efectivo', 'Consumer credit per dollar of cash'), UI.date('2019-Q4'), tr('Deuda por hogar', 'Debt per household')],
        cats.map(function (k) { var lt = G.latest[k] || {}; return [nm('wg', k), UI.pct(G.d2a[k][n]), i19 >= 0 ? UI.pct(G.d2a[k][i19]) : '—', UI.pct(G.d2a[k][i0]), '$' + UI.nf(G.cc2cash[k][n] / 100, 2), i19 >= 0 ? '$' + UI.nf(G.cc2cash[k][i19] / 100, 2) : '—', lt.debtPerHh != null ? UI.usd(lt.debtPerHh * 1000) : '—']; })
          .concat([[tr('Todos los hogares', 'All households'), UI.pct(G.all.d2a[n]), i19 >= 0 ? UI.pct(G.all.d2a[i19]) : '—', UI.pct(G.all.d2a[i0]), '$' + UI.nf(G.all.cc2cash[n] / 100, 2), i19 >= 0 ? '$' + UI.nf(G.all.cc2cash[i19] / 100, 2) : '—', '—']]));
      var first = cats[0], lastK = cats[cats.length - 1], up = cats.filter(function (k) { return i19 >= 0 && G.d2a[k][n] > G.d2a[k][i19]; }).length;
      $('capLev').innerHTML = bi('Pasivos de cada grupo como porcentaje de sus activos, y su crédito al consumo (tarjetas, autos, estudiantil) por cada dólar que tiene en depósitos y fondos de mercado de dinero. Trimestral, ' + qy(G.quarters[0]) + '–' + UI.date(G.quarters[n]) + '. ' + UI.kind('C'),
        'Each group\'s liabilities as a percent of its assets, and its consumer credit (cards, auto, student) for every dollar it holds in deposits and money market funds. Quarterly, ' + qy(G.quarters[0]) + '–' + UI.date(G.quarters[n]) + '. ' + UI.kind('C'));
      $('levCallout').innerHTML = bi(
        '<b>' + nm('wg', first) + ':</b> debe el ' + UI.pct(G.d2a[first][n]) + ' de lo que tiene y $' + UI.nf(G.cc2cash[first][n] / 100, 2) + ' de crédito al consumo por cada dólar de efectivo. <b>' + nm('wg', lastK) + ':</b> ' + UI.pct(G.d2a[lastK][n]) + ' y $' + UI.nf(G.cc2cash[lastK][n] / 100, 2) + '.' + (i19 >= 0 ? ' Frente a fines de 2019, la deuda como parte de los activos ' + (up === 0 ? 'bajó en los ' + cats.length + ' grupos' : up === cats.length ? 'subió en los ' + cats.length + ' grupos' : 'subió en ' + up + ' de los ' + cats.length + ' grupos') + ': los activos (vivienda y acciones) crecieron más que la deuda.' : ''),
        '<b>' + nm('wg', first) + ':</b> owe ' + UI.pct(G.d2a[first][n]) + ' of what they own and $' + UI.nf(G.cc2cash[first][n] / 100, 2) + ' of consumer credit per dollar of cash. <b>' + nm('wg', lastK) + ':</b> ' + UI.pct(G.d2a[lastK][n]) + ' and $' + UI.nf(G.cc2cash[lastK][n] / 100, 2) + '.' + (i19 >= 0 ? ' Against the end of 2019, debt as a share of assets ' + (up === 0 ? 'fell in all ' + cats.length + ' groups' : up === cats.length ? 'rose in all ' + cats.length + ' groups' : 'rose in ' + up + ' of the ' + cats.length + ' groups') + ': assets (homes and stocks) grew faster than debt.' : ''));
    }
    draw();
  }
  function burdenCard(f) {
    var B = D.burden, card = $('burdenCard'); if (!card) return; if (!B || !B.income.length) { card.hidden = true; return; }
    var n = B.years.length - 1, pick = [B.years.indexOf(2007), B.years.indexOf(2019), n].filter(function (i, k, a) { return i >= 0 && a.indexOf(i) === k; });
    var labs = B.income.map(function (g) { return nm('scfInc', g.k.replace(/-/g, '-')); }), cols = [UI.css('--neutral-mark'), S(2), S(1)];
    var sets = function (field) { return pick.map(function (i, k) { return { label: String(B.years[i]), data: B.income.map(function (g) { return g[field] ? g[field][i] : null; }), color: cols[(k + cols.length - pick.length) % cols.length] }; }); };
    UI.bar('chBurden40', { labels: labs, datasets: sets('over40'), fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, thickness: 16 });
    if (B.all.late60) UI.bar('chBurdenLate', { labels: labs, datasets: sets('late60'), fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, thickness: 16 });
    UI.table('chBurden40', [tr('Grupo de ingreso', 'Income group'), tr('Pagos ÷ ingreso, mediana de las familias con deuda', 'Payments ÷ income, median of families with debt'), tr('Pagan más de 40%', 'Pay more than 40%'), tr('Pagan más de 40%, ', 'Pay more than 40%, ') + B.years[n - 1]].concat(B.all.late60 ? [tr('Atraso de 60 días o más', '60 days or more late')] : []),
      B.income.map(function (g, i) { return [labs[i], UI.pct(g.median[n]), UI.pct(g.over40[n]), UI.pct(g.over40[n - 1])].concat(B.all.late60 ? [g.late60 ? UI.pct(g.late60[n]) : '—'] : []); }).concat([[tr('Todas las familias', 'All families'), UI.pct(B.all.median[n]), UI.pct(B.all.over40[n]), UI.pct(B.all.over40[n - 1])].concat(B.all.late60 ? [UI.pct(B.all.late60[n])] : [])]));
    $('capBurden').innerHTML = bi('Familias con deuda, por percentil de ingreso: las que destinan más de 40% de su ingreso a pagos de deuda y las que tuvieron un pago con 60 días o más de atraso en el año. Encuestas de ' + pick.map(function (i) { return B.years[i]; }).join(', ') + '. En ' + B.asOf + ', el ' + UI.pct(f.over40) + ' de las familias con deuda pagaba más de 40% de su ingreso (' + UI.pct(f.over40Prev) + ' en ' + f.byPrev + '); en el 20% de menor ingreso, el ' + UI.pct(f.over40Lo) + '.' + (f.late60 != null ? ' Con un pago atrasado 60 días o más: <b>' + UI.pct(f.late60) + '</b> (' + UI.pct(f.late60Prev) + ' en ' + f.byPrev + ')' + (f.late60Lo != null ? '; en el 20% de menor ingreso, ' + UI.pct(f.late60Lo) : '') + '.' : '') + ' ' + UI.kind('R'),
      'Families with debt, by percentile of income: those putting more than 40% of income into debt payments and those with a payment 60 days or more late in the year. Surveys of ' + pick.map(function (i) { return B.years[i]; }).join(', ') + '. In ' + B.asOf + ', ' + UI.pct(f.over40) + ' of families with debt paid more than 40% of income (' + UI.pct(f.over40Prev) + ' in ' + f.byPrev + '); in the bottom 20% by income, ' + UI.pct(f.over40Lo) + '.' + (f.late60 != null ? ' With a payment 60 days or more late: <b>' + UI.pct(f.late60) + '</b> (' + UI.pct(f.late60Prev) + ' in ' + f.byPrev + ')' + (f.late60Lo != null ? '; in the bottom 20% by income, ' + UI.pct(f.late60Lo) : '') + '.' : '') + ' ' + UI.kind('R'));
    UI.legend('chBurden40', sets('over40').map(function (x) { return { c: x.color, l: x.label }; }));
    var lateBox = $('chBurdenLate'); if (lateBox && !B.all.late60) { var half = lateBox.closest('.grid-2 > div'); if (half) half.hidden = true; lateBox.closest('.grid-2').classList.add('one'); }
  }
  function cardCharts(f) {
    var C = D.cards; if (!C) return;
    var labs = C.quarters.map(qy), tipQ = function (id) { UI.charts[id].options.plugins.tooltip.callbacks.title = function (it) { return UI.date(C.quarters[it[0].dataIndex]); }; UI.charts[id].update(); };
    var sets = [{ label: tr('Pagan el saldo completo', 'Pay the full balance'), data: C.payFull, color: S(1) }, { label: tr('Pagan más del mínimo pero no todo', 'Pay more than the minimum but not all'), data: C.payBetween, color: S(3) }, { label: tr('Pagan solo el mínimo', 'Pay only the minimum'), data: C.payMin, color: S(2) }].filter(function (x) { return x.data; });
    UI.line('chCardPay', { labels: labs, datasets: sets, fmt: function (v) { return UI.pct(v, 2); }, axisFmt: function (v) { return v + '%'; }, min: 0, xTicks: 8 }); tipQ('chCardPay');
    UI.legend('chCardPay', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    var n = C.quarters.length - 1, qs = [n, n - 4, C.quarters.indexOf('2019-Q4'), C.quarters.indexOf('2021-Q2'), 0].filter(function (i, k, a) { return i >= 0 && a.indexOf(i) === k; });
    UI.table('chCardPay', [tr('Trimestre', 'Quarter')].concat(sets.map(function (x) { return x.label; })).concat([tr('Uso de la línea, cuenta mediana', 'Line used, median account'), tr('Saldo con 30+ días de atraso', 'Balance 30+ days past due'), tr('Cuentas nuevas a puntaje menor a 660', 'New accounts to scores under 660')]),
      qs.map(function (i) { return [UI.date(C.quarters[i])].concat(sets.map(function (x) { return UI.pct(x.data[i], 2); })).concat([C.util50 ? UI.pct(C.util50[i], 2) : '—', C.dq30 ? UI.pct(C.dq30[i], 2) : '—', C.newSub660 ? UI.pct(C.newSub660[i], 1) : '—']); }));
    $('capCardPay').innerHTML = bi('Porcentaje de las cuentas de tarjeta de crédito de los grandes bancos según lo que pagaron en el mes; los tres grupos no suman 100%. Trimestral, ' + qy(C.quarters[0]) + '–' + UI.date(C.asOf) + '. En ' + UI.date(C.asOf) + ' pagó solo el mínimo el <b>' + UI.pct(f.payMin, 2) + '</b>' + (f.payMinPrev != null ? ' (' + UI.pct(f.payMinPrev, 2) + ' un año antes; el máximo de la serie es ' + UI.pct(f.payMinMax, 2) + ')' : '') + ' y el saldo completo el ' + UI.pct(f.payFull, 1) + '. ' + UI.kind('R'),
      'Percent of credit card accounts at large banks by what they paid in the month; the three groups do not add to 100%. Quarterly, ' + qy(C.quarters[0]) + '–' + UI.date(C.asOf) + '. In ' + UI.date(C.asOf) + ', <b>' + UI.pct(f.payMin, 2) + '</b> paid only the minimum' + (f.payMinPrev != null ? ' (' + UI.pct(f.payMinPrev, 2) + ' a year earlier; the series high is ' + UI.pct(f.payMinMax, 2) + ')' : '') + ' and ' + UI.pct(f.payFull, 1) + ' the full balance. ' + UI.kind('R'));
    if (C.buyHigh && C.buyLow) {
      var b = [{ label: tr('Puntaje de 720 o más', 'Score of 720 or more'), data: C.buyHigh, color: S(1) }, { label: tr('Puntaje de 660 a 719', 'Score of 660 to 719'), data: C.buyMid, color: S(2) }, { label: tr('Puntaje menor a 660', 'Score under 660'), data: C.buyLow, color: S(7) }].filter(function (x) { return x.data; });
      UI.line('chCardBuy', { labels: labs, datasets: b, fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + UI.nf(v); }, min: 0, xTicks: 8 }); tipQ('chCardBuy');
      UI.legend('chCardBuy', b.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      UI.table('chCardBuy', [tr('Trimestre', 'Quarter')].concat(b.map(function (x) { return x.label; })), qs.map(function (i) { return [UI.date(C.quarters[i])].concat(b.map(function (x) { return UI.usd(x.data[i]); })); }));
      $('capCardBuy').innerHTML = bi('Compras promedio por cuenta en el trimestre, según el puntaje de crédito del titular, dólares corrientes. En ' + UI.date(C.asOf) + ': ' + UI.usd(f.buyHigh) + ' en las cuentas de 720 o más y ' + UI.usd(f.buyLow) + ' en las de menos de 660' + (f.buyHighG != null ? '; desde ' + UI.date(f.buyFrom) + ' crecieron ' + UI.signed(f.buyHighG, 0) + ' y ' + UI.signed(f.buyLowG, 0) + ', sin descontar la inflación' : '') + '. ' + UI.kind('R'),
        'Average purchases per account in the quarter, by the holder\'s credit score, current dollars. In ' + UI.date(C.asOf) + ': ' + UI.usd(f.buyHigh) + ' on accounts of 720 or more and ' + UI.usd(f.buyLow) + ' on those under 660' + (f.buyHighG != null ? '; since ' + UI.date(f.buyFrom) + ' they grew ' + UI.signed(f.buyHighG, 0) + ' and ' + UI.signed(f.buyLowG, 0) + ', before inflation' : '') + '. ' + UI.kind('R'));
    }
  }
  function expectCharts(f) {
    var E = D.expect; if (!E) return;
    var d = E.delinquency, gi = function (re) { var i = d.groups.findIndex(function (g) { return re.test(g); }); return i < 0 ? null : ma(d.byGroup[i], 3); };
    var from = d.months.findIndex(function (m) { return m >= '2014-01'; }), cut = function (a) { return a ? a.slice(from) : a; }, months = d.months.slice(from);
    var sets = [{ label: tr('Ingreso menor a $50,000', 'Income under $50,000'), data: cut(gi(/Income under/i)), color: S(7) }, { label: tr('De $50,000 a $100,000', '$50,000 to $100,000'), data: cut(gi(/Income 50/i)), color: S(2) }, { label: tr('Más de $100,000', 'Over $100,000'), data: cut(gi(/Income Over/i)), color: S(1) }, { label: tr('Todos', 'All'), data: cut(ma(d.all, 3)), color: UI.css('--text-secondary'), dash: [4, 3] }].filter(function (x) { return x.data; });
    UI.line('chExpDq', { labels: months.map(qy), datasets: sets, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0, xTicks: 7 });
    UI.charts.chExpDq.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(months[it[0].dataIndex]); }; UI.charts.chExpDq.update();
    UI.legend('chExpDq', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    var ageS2 = [[/Age Under 40/i, tr('Menores de 40 años', 'Under 40')], [/Age 40-60/i, tr('40 a 60 años', '40 to 60')], [/Age Over 60/i, tr('Mayores de 60', 'Over 60')], [/High School or Less/i, tr('Preparatoria o menos', 'High school or less')], [/BA or Higher/i, tr('Licenciatura o más', 'BA or higher')]];
    var k = d.months.length - 1;
    UI.table('chExpDq', [tr('Grupo', 'Group'), UI.date(d.months[k]) + tr(' (promedio de 3 meses)', ' (3-month average)'), tr('Un año antes', 'A year earlier')],
      sets.map(function (x) { return [x.label, UI.pct(last(x.data)), UI.pct(x.data[x.data.length - 13])]; }).concat(ageS2.map(function (g) { var i = d.groups.findIndex(function (z) { return g[0].test(z); }); if (i < 0) return null; var a = ma(d.byGroup[i], 3); return [g[1], UI.pct(a[k]), UI.pct(a[k - 12])]; }).filter(Boolean)));
    $('capExpDq').innerHTML = bi('Probabilidad promedio que los hogares dan a no poder hacer un pago mínimo de deuda en los próximos tres meses, por ingreso del hogar; promedio móvil de tres meses, ' + qy(months[0]) + '–' + UI.date(d.months[k]) + '. ' + UI.kind('C'),
      'Average probability households give to missing a minimum debt payment over the next three months, by household income; three-month moving average, ' + qy(months[0]) + '–' + UI.date(d.months[k]) + '. ' + UI.kind('C'));
    var A = E.access, w = A.waves.length - 1, wl = A.waves.map(function (m) { return m.slice(2, 4) === '' ? m : qy(m); });
    var as = [{ label: tr('Rechazados, puntaje menor a 680', 'Turned down, score under 680'), data: A.rejectedLowScore, color: S(7), points: true }, { label: tr('Rechazados, todos los solicitantes', 'Turned down, all applicants'), data: A.rejected, color: S(2), points: true }, { label: tr('Desalentados: necesitaban crédito y no lo pidieron', 'Discouraged: needed credit and did not apply'), data: A.discouraged, color: S(1), points: true }];
    UI.line('chAccess', { labels: wl, datasets: as, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0, xTicks: 7 });
    UI.charts.chAccess.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(A.waves[it[0].dataIndex]); }; UI.charts.chAccess.update();
    UI.legend('chAccess', as.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    var scN = { less_680: tr('Puntaje menor a 680', 'Score under 680'), between_680_760: tr('De 680 a 760', '680 to 760'), over_760: tr('Más de 760', 'Over 760'), less_eq_40: tr('40 años o menos', 'Age 40 or under'), between_40_59: tr('De 40 a 59 años', 'Age 40 to 59'), over_60: tr('60 años o más', 'Age 60 or over') };
    UI.table('chAccess', [tr('Grupo, ', 'Group, ') + UI.date(A.asOf), tr('Pidió crédito', 'Applied for credit'), tr('Rechazado (de quienes pidieron)', 'Turned down (of applicants)'), tr('Desalentado', 'Discouraged'), tr('Probabilidad de reunir $2,000 en un mes', 'Chance of coming up with $2,000 in a month')],
      [[tr('Todos', 'All'), UI.pct(A.applied[w]), UI.pct(A.rejected[w]), UI.pct(A.discouraged[w]), A.comeUp[w] == null ? '—' : UI.pct(A.comeUp[w])]].concat(A.byScore.concat(A.byAge).map(function (x) { return [scN[x.k] || x.k, UI.pct(x.applied), UI.pct(x.rejected), UI.pct(x.discouraged), x.comeUp == null ? '—' : UI.pct(x.comeUp)]; })));
    $('capAccess').innerHTML = bi('Encuesta cada cuatro meses: de quienes pidieron algún crédito en los últimos 12 meses, porcentaje al que se lo negaron; y porcentaje de todos los encuestados que necesitaba crédito y no lo pidió por esperar un rechazo. ' + qy(A.waves[0]) + '–' + UI.date(A.asOf) + '. ' + UI.kind('R'),
      'Survey every four months: of those who applied for any credit in the past 12 months, the percent turned down; and the percent of all respondents who needed credit and did not apply because they expected a rejection. ' + qy(A.waves[0]) + '–' + UI.date(A.asOf) + '. ' + UI.kind('R'));
    if (f.low && f.high) $('accessCallout').innerHTML = bi(
      'En ' + UI.date(A.asOf) + ' pidió crédito el ' + UI.pct(f.applied) + ' de los encuestados y al <b>' + UI.pct(f.rejected) + '</b> de ellos se lo negaron (el máximo de la encuesta es ' + UI.pct(f.rejMax) + '). Con puntaje menor a 680: rechazado el <b>' + UI.pct(f.low.rejected) + '</b> y desalentado el ' + UI.pct(f.low.discouraged) + '; con más de 760, ' + UI.pct(f.high.rejected) + ' y ' + UI.pct(f.high.discouraged) + '. Probabilidad de reunir $2,000 en un mes ante una emergencia: ' + UI.pct(f.low.comeUp, 0) + ' frente a ' + UI.pct(f.high.comeUp, 0) + '.',
      'In ' + UI.date(A.asOf) + ', ' + UI.pct(f.applied) + ' of respondents applied for credit and <b>' + UI.pct(f.rejected) + '</b> of them were turned down (the survey high is ' + UI.pct(f.rejMax) + '). With a score under 680: <b>' + UI.pct(f.low.rejected) + '</b> turned down and ' + UI.pct(f.low.discouraged) + ' discouraged; above 760, ' + UI.pct(f.high.rejected) + ' and ' + UI.pct(f.high.discouraged) + '. Chance of coming up with $2,000 within a month in an emergency: ' + UI.pct(f.low.comeUp, 0) + ' against ' + UI.pct(f.high.comeUp, 0) + '.');
  }
  function bnplCard(f) {
    var BN = D.bnpl, ST = D.bnplStudy, card = $('bnplUseCard'); if (!card) return; if (!BN) { card.hidden = true; return; }
    var sets = [{ label: tr('Todos los adultos', 'All adults'), data: BN.all, color: S(1), points: true }].concat(BN.women ? [{ label: tr('Mujeres', 'Women'), data: BN.women, color: S(5), points: true }] : []).concat(BN.men ? [{ label: tr('Hombres', 'Men'), data: BN.men, color: S(3), points: true }] : []);
    UI.line('chBnplYear', { labels: BN.years, datasets: sets, fmt: function (v) { return UI.pct(v, 0); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
    UI.legend('chBnplYear', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    if (BN.bySavings) UI.bar('chBnplSavings', { horizontal: true, labels: BN.bySavings.labels.map(function (l) { return savL(l); }), data: BN.bySavings.values, color: S(1), fmt: function (v) { return UI.pct(v, 0); }, axisFmt: function (v) { return v + '%'; }, valueLabels: function (v) { return UI.pct(v, 0); }, thickness: 18 });
    UI.table('chBnplYear', [tr('Año o grupo', 'Year or group')].concat(sets.map(function (x) { return x.label; })).concat(BN.paidLate ? [tr('Pagó tarde (de quienes lo usan)', 'Paid late (of users)')] : []),
      BN.years.slice().reverse().map(function (y) { var i = BN.years.indexOf(y); return [y].concat(sets.map(function (x) { return UI.pct(x.data[i], 0); })).concat(BN.paidLate ? [UI.pct(BN.paidLate[i], 0)] : []); })
        .concat((BN.byIncome || []).concat(BN.byAge || []).map(function (g) { return [tr(g.label.es, g.label.en) + (/^\d/.test(g.label.en) && !/\$/.test(g.label.en) ? tr(' años', ' years old') : '') + ', ' + BN.asOf, UI.pct(g.used, 0)].concat(sets.slice(1).map(function () { return '—'; })).concat(BN.paidLate ? [UI.pct(g.late, 0)] : []); })));
    var st = function (v, l, k) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(k || 'R') + '</div></div>'; }, stats = [];
    stats.push(st(UI.pct(f.bnpl, 0), tr('De los adultos lo usó en ', 'Of adults used it in ') + BN.asOf + ' (' + UI.pct(f.bnpl0, 0) + tr(' en ', ' in ') + f.bnplY0 + ')'));
    if (BN.late != null) stats.push(st(UI.pct(BN.late, 0), tr('De quienes lo usan pagó tarde al menos una vez', 'Of users paid late at least once')));
    if (BN.overdraft != null) stats.push(st(UI.pct(BN.overdraft, 0), tr('De quienes lo usan tuvo un sobregiro o cargo por fondos insuficientes por un pago', 'Of users had an overdraft or insufficient-funds fee from a payment')));
    if (ST) { stats.push(st(UI.pct(ST.multi, 0), tr('De los deudores tuvo varios préstamos a la vez (', 'Of borrowers held several loans at once (') + ST.dataYear + ')')); stats.push(st(UI.pct(ST.approvedSub, 0), tr('De las solicitudes de puntaje bajo fue aprobado (', 'Of applications from low-score borrowers were approved (') + ST.dataYear + ')')); }
    $('bnplStats').innerHTML = stats.join('');
    $('capBnpl').innerHTML = bi('Adultos que usaron "compra ahora, paga después" en los 12 meses previos, según la encuesta anual de la Reserva Federal a hogares, ' + BN.years[0] + '–' + BN.asOf + '; y uso según el gasto de emergencia más grande que la persona podría cubrir hoy solo con sus ahorros. ' + UI.kind('R'),
      'Adults who used buy now, pay later in the prior 12 months, from the Federal Reserve\'s yearly survey of households, ' + BN.years[0] + '–' + BN.asOf + '; and use by the largest emergency expense the person could cover today from savings alone. ' + UI.kind('R'));
    var bi0 = BN.byIncome && BN.byIncome.length ? BN.byIncome[0] : null, bi1 = bi0 ? last(BN.byIncome) : null, ow = BN.onlyWay && BN.onlyWay.groups.length ? BN.onlyWay : null, lc = function (x) { return x.charAt(0).toLowerCase() + x.slice(1); };
    var es = '<b>Quién lo usa:</b> el ' + UI.pct(f.bnpl, 0) + ' de los adultos en ' + BN.asOf + (f.bnplLow != null ? '; el ' + UI.pct(f.bnplLow, 0) + ' de quienes no podrían cubrir $100 con sus ahorros y el ' + UI.pct(f.bnplHigh, 0) + ' de quienes podrían cubrir $2,000 o más' : '') + '.' + (BN.paidLate ? ' <b>Quién se atrasa:</b> el ' + UI.pct(BN.late, 0) + ' de los usuarios pagó tarde al menos una vez (' + UI.pct(BN.paidLate[0], 0) + ' en ' + BN.years[0] + ')' + (bi0 ? '; el ' + UI.pct(bi0.late, 0) + ' de los usuarios con ingreso familiar de ' + lc(bi0.label.es) + ' y el ' + UI.pct(bi1.late, 0) + ' de los de ' + lc(bi1.label.es) : '') + '.' : '') + (ow ? ' "Era la única forma de pagarlo" es la razón principal del ' + UI.pct(ow.groups[0].v, 0) + ' de los usuarios de menor ingreso y del ' + UI.pct(last(ow.groups).v, 0) + ' de los de mayor ingreso.' : '') + (BN.lateGroceries != null ? ' Entre quienes lo usan para despensa o comida a domicilio, el ' + UI.pct(BN.lateGroceries, 0) + ' pagó un cargo por atraso o un sobregiro (' + UI.pct(BN.lateAll, 0) + ' entre todos los usuarios).' : '');
    var en = '<b>Who uses it:</b> ' + UI.pct(f.bnpl, 0) + ' of adults in ' + BN.asOf + (f.bnplLow != null ? '; ' + UI.pct(f.bnplLow, 0) + ' of those who could not cover $100 from savings and ' + UI.pct(f.bnplHigh, 0) + ' of those who could cover $2,000 or more' : '') + '.' + (BN.paidLate ? ' <b>Who falls behind:</b> ' + UI.pct(BN.late, 0) + ' of users paid late at least once (' + UI.pct(BN.paidLate[0], 0) + ' in ' + BN.years[0] + ')' + (bi0 ? '; ' + UI.pct(bi0.late, 0) + ' of users with family income of ' + lc(bi0.label.en) + ' and ' + UI.pct(bi1.late, 0) + ' of those with ' + lc(bi1.label.en) : '') + '.' : '') + (ow ? ' "It was the only way I could afford it" is the main reason for ' + UI.pct(ow.groups[0].v, 0) + ' of the lowest-income users and ' + UI.pct(last(ow.groups).v, 0) + ' of the highest-income ones.' : '') + (BN.lateGroceries != null ? ' Among those who use it for groceries or food delivery, ' + UI.pct(BN.lateGroceries, 0) + ' paid a late fee or an overdraft (' + UI.pct(BN.lateAll, 0) + ' among all users).' : '');
    if (ST) {
      es += ' <b>Lo que muestran los expedientes de crédito</b> (estudio de la CFPB con préstamos de ' + ST.lenders.length + ' prestamistas, ' + ST.dataYear + '): el ' + UI.pct(ST.used22) + ' de los consumidores con expediente financió al menos una compra (' + UI.pct(ST.used21) + ' un año antes); el ' + UI.pct(ST.multi, 0) + ' de los deudores tuvo varios préstamos simultáneos y el ' + UI.pct(ST.multiLender, 0) + ' con más de un prestamista; entre los de 18 a 24 años, estas compras eran el ' + UI.pct(ST.young, 0) + ' de su deuda de consumo sin garantía (' + UI.pct(ST.allAges, 0) + ' en promedio).' + (ST.notReported ? ' <b>El hueco:</b> los prestamistas por lo general no reportan estos préstamos a los burós de crédito, así que no están en las cifras de deuda de los hogares de esta página.' : '');
      en += ' <b>What credit files show</b> (CFPB study of loans from ' + ST.lenders.length + ' lenders, ' + ST.dataYear + '): ' + UI.pct(ST.used22) + ' of consumers with a credit record financed at least one purchase (' + UI.pct(ST.used21) + ' a year earlier); ' + UI.pct(ST.multi, 0) + ' of borrowers held several loans at once and ' + UI.pct(ST.multiLender, 0) + ' with more than one lender; among those aged 18 to 24, these purchases were ' + UI.pct(ST.young, 0) + ' of their unsecured consumer debt (' + UI.pct(ST.allAges, 0) + ' on average).' + (ST.notReported ? ' <b>The gap:</b> lenders do not typically report these loans to the credit bureaus, so they are not in the household debt figures on this page.' : '');
    }
    $('bnplCallout').innerHTML = bi(es, en);
    $('srcBnpl').innerHTML = srcLine('shed') + (BN.noteUrl ? ' · <a href="' + esc(BN.noteUrl) + '" target="_blank" rel="noopener">' + tr('Nota de la Reserva Federal sobre estos préstamos ↗', 'Federal Reserve note on these loans ↗') + '</a>' : '') + (ST ? ' · ' + srcLine('cfpbBnpl').replace(/^[^:]*:\s*/, '') : '');
  }
  var savL = function (l) { return UI.lang === 'en' ? l : String(l).replace(/^Less than /, 'Menos de ').replace(/ or more$/, ' o más'); };
  function bufferCard(f) {
    var BF = D.buffers, card = $('bufferCard'); if (!card) return; if (!BF || !BF.series || !BF.series.length) { card.hidden = true; return; }
    var cols = [S(1), S(2), S(7), S(3)], sets = BF.series.map(function (x, i) { return { label: tr(x.label.es, x.label.en), data: x.values, color: cols[i % cols.length], points: true }; });
    UI.line('chBuffer', { labels: BF.years, datasets: sets, fmt: function (v) { return UI.pct(v, 0); }, axisFmt: function (v) { return v + '%'; }, min: 0, max: 100 });
    UI.legend('chBuffer', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    UI.table('chBuffer', [tr('Año', 'Year')].concat(sets.map(function (x) { return x.label; })), BF.years.slice().reverse().map(function (y) { var i = BF.years.indexOf(y); return [y].concat(sets.map(function (x) { return x.data[i] == null ? '—' : UI.pct(x.data[i], 0); })); }));
    $('capBuffer').innerHTML = bi('Porcentaje de adultos, encuesta anual de la Reserva Federal a hogares, ' + BF.years[0] + '–' + BF.asOf + '. "Efectivo o su equivalente": efectivo, ahorros o una tarjeta que se paga completa en el siguiente estado de cuenta. ' + UI.kind('R'),
      'Percent of adults, the Federal Reserve\'s yearly survey of households, ' + BF.years[0] + '–' + BF.asOf + '. "Cash or its equivalent": cash, savings or a credit card paid off at the next statement. ' + UI.kind('R'));
    var es = '', en = '', g = BF.groups, sv = BF.savings, lo = BF.leftover, br = BF.behindRent;
    if (g && g.length) { es += '<b>Les va al menos bien, ' + BF.asOf + ':</b> ' + UI.pct(BF.okay, 0) + ' de los adultos; por ingreso familiar, ' + g.map(function (x) { return x.label.es.charAt(0).toLowerCase() + x.label.es.slice(1) + ': ' + UI.pct(x.v, 0); }).join('; ') + '.'; en += '<b>Doing at least okay, ' + BF.asOf + ':</b> ' + UI.pct(BF.okay, 0) + ' of adults; by family income, ' + g.map(function (x) { return x.label.en.charAt(0).toLowerCase() + x.label.en.slice(1) + ': ' + UI.pct(x.v, 0); }).join('; ') + '.'; }
    if (sv) { var n = sv.values.length - 1; es += ' <b>Ahorro para una emergencia:</b> el ' + UI.pct(sv.values[0], 0) + ' no podría cubrir ni $100 solo con sus ahorros y el ' + UI.pct(sv.values[n], 0) + ' podría cubrir ' + sv.labels[n].es.replace(/^\$/, '$') + '.' + (BF.cannotPay400 != null ? ' El ' + UI.pct(BF.cannotPay400, 0) + ' no podría pagar hoy un imprevisto de $400 de ninguna forma.' : '');
      en += ' <b>Emergency savings:</b> ' + UI.pct(sv.values[0], 0) + ' could not cover even $100 from savings alone and ' + UI.pct(sv.values[n], 0) + ' could cover ' + sv.labels[n].en + '.' + (BF.cannotPay400 != null ? ' ' + UI.pct(BF.cannotPay400, 0) + ' could not pay a $400 emergency today by any means.' : ''); }
    if (lo && lo.groups.length) { var a = lo.groups[0], b = last(lo.groups); es += ' <b>Fin de mes:</b> nunca o rara vez le sobra dinero al ' + UI.pct(lo.all, 0) + ' de los adultos; al ' + UI.pct(a.v, 0) + ' con ingreso familiar de ' + a.label.es.charAt(0).toLowerCase() + a.label.es.slice(1) + ' y al ' + UI.pct(b.v, 0) + ' con ' + b.label.es + '.'; en += ' <b>Month end:</b> ' + UI.pct(lo.all, 0) + ' of adults never or rarely have money left over; ' + UI.pct(a.v, 0) + ' with family income of ' + a.label.en.charAt(0).toLowerCase() + a.label.en.slice(1) + ' and ' + UI.pct(b.v, 0) + ' with ' + b.label.en + '.'; }
    if (br) { var m = br.years.length - 1; es += ' <b>Renta:</b> el ' + UI.pct(br.all[m], 0) + ' de los inquilinos se atrasó con la renta en algún momento del año (' + UI.pct(br.all[0], 0) + ' en ' + br.years[0] + ').'; en += ' <b>Rent:</b> ' + UI.pct(br.all[m], 0) + ' of renters fell behind on rent at some point in the year (' + UI.pct(br.all[0], 0) + ' in ' + br.years[0] + ').'; }
    if (es) $('bufferCallout').innerHTML = bi(es, en);
  }
  function studentCard(f) {
    var SL = D.studentLoans; if (!SL) return;
    var from = Math.max(0, SL.dates.length - 28), dts = SL.dates.slice(from), cut = function (a) { return a.slice(from); };
    var keys = [['repayment', tr('En pago', 'In repayment'), S(1)], ['forbearance', tr('Pagos suspendidos (prórroga)', 'Payments suspended (forbearance)'), S(2)], ['deferment', tr('Diferidos', 'Deferred'), S(3)], ['default', tr('En incumplimiento', 'In default'), S(7)], ['school', tr('Estudiando o en periodo de gracia', 'In school or grace'), S(4)]];
    var val = function (k) { return k === 'school' ? SL.usd.inSchool.map(function (v, i) { return Math.round((v + SL.usd.grace[i]) * 10) / 10; }) : SL.usd[k]; };
    var sets = keys.map(function (k) { return { label: k[1], data: cut(val(k[0])), color: k[2] }; });
    UI.bar('chStudent', { labels: dts.map(function (d) { return d.slice(2, 4) + (/-03-31$/.test(d) ? 'T1' : /-06-30$/.test(d) ? 'T2' : /-09-30$/.test(d) ? 'T3' : 'T4').replace('T', UI.lang === 'en' ? 'Q' : 'T'); }), stacked: true, datasets: sets, fmt: function (v) { return UI.money(v, 0); }, axisFmt: function (v) { return '$' + UI.nf(v / 1000, 1) + (UI.lang === 'en' ? 'T' : ' B'); }, thickness: 14, autoSkip: true, tipTitle: function (i) { return UI.date(dts[i]); } });
    UI.legend('chStudent', sets.map(function (x) { return { c: x.color, l: x.label }; }));
    var n = SL.dates.length - 1, rows = [n, n - 1, n - 2, n - 4, SL.dates.indexOf('2019-12-31')].filter(function (i, k, a) { return i >= 0 && a.indexOf(i) === k; });
    UI.table('chStudent', [tr('Fecha', 'Date')].concat(keys.map(function (k) { return k[1]; })).concat([tr('Personas en incumplimiento', 'People in default'), tr('Con atraso de 31+ días, de los préstamos directos en pago', '31+ days late, of Direct Loans in repayment')]),
      rows.map(function (i) { var di = SL.delinquency ? SL.delinquency.dates.indexOf(SL.dates[i]) : -1; return [UI.date(SL.dates[i])].concat(keys.map(function (k) { return UI.money(val(k[0])[i], 0); })).concat([UI.nf(SL.people.default[i], 1) + ' M', di >= 0 ? UI.pct(SL.delinquency.lateShare[di]) : '—']); }));
    $('capStudent').innerHTML = bi('Cartera administrada por el gobierno federal (préstamos directos y FFEL en manos del Departamento de Educación), saldo por situación, miles de millones de dólares, al cierre de cada trimestre. "En incumplimiento": más de 360 días de atraso. ' + UI.kind('R'),
      'Federally managed portfolio (Direct Loans and FFEL held by the Department of Education), balance by status, billions of dollars, at each quarter end. "In default": more than 360 days late. ' + UI.kind('R'));
    $('studentCallout').innerHTML = bi(
      'Al ' + UI.date(SL.asOf) + ', <b>' + UI.money(f.slDefault, 0) + '</b> estaban en incumplimiento (' + UI.nf(f.slDefaultPeople, 1) + ' millones de personas)' + (f.slDefaultPrev != null ? ', frente a ' + UI.money(f.slDefaultPrev, 0) + ' un año antes' : '') + '; ' + UI.money(f.slRepay, 0) + ' estaban en pago y ' + UI.money(f.slForb, 0) + ' con pagos suspendidos (' + UI.nf(f.slForbPeople, 1) + ' millones de personas).' + (f.slLate != null ? ' De los préstamos directos en pago, el ' + UI.pct(f.slLate) + ' del saldo tenía 31 días o más de atraso.' : ''),
      'At ' + UI.date(SL.asOf) + ', <b>' + UI.money(f.slDefault, 0) + '</b> were in default (' + UI.nf(f.slDefaultPeople, 1) + ' million people)' + (f.slDefaultPrev != null ? ', against ' + UI.money(f.slDefaultPrev, 0) + ' a year earlier' : '') + '; ' + UI.money(f.slRepay, 0) + ' were in repayment and ' + UI.money(f.slForb, 0) + ' had payments suspended (' + UI.nf(f.slForbPeople, 1) + ' million people).' + (f.slLate != null ? ' Of Direct Loans in repayment, ' + UI.pct(f.slLate) + ' of the balance was 31 days or more late.' : ''));
  }
  function insolvencyCharts(f) {
    var I = D.insolvency;
    if (I) {
      var labs = I.quarters.map(qy), sets = [{ label: tr('Con una quiebra nueva', 'With a new bankruptcy'), data: I.bankruptcy, color: S(1) }, { label: tr('Con una ejecución hipotecaria nueva', 'With a new foreclosure'), data: I.foreclosure, color: S(2) }];
      UI.line('chInsolv', { labels: labs, datasets: sets, fmt: function (v) { return UI.nf(v, 1) + tr(' mil', ' thousand'); }, axisFmt: function (v) { return UI.nf(v); }, min: 0, xTicks: 8, yTitle: tr('Miles de consumidores en el trimestre', 'Thousands of consumers in the quarter') });
      UI.charts.chInsolv.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(I.quarters[it[0].dataIndex]); }; UI.charts.chInsolv.update();
      UI.legend('chInsolv', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      UI.table('chInsolv', [tr('Trimestre', 'Quarter'), sets[0].label, sets[1].label], I.quarters.slice(-8).reverse().map(function (q) { var i = I.quarters.indexOf(q); return [UI.date(q), UI.nf(I.bankruptcy[i], 1), UI.nf(I.foreclosure[i], 1)]; }));
      $('capInsolv').innerHTML = bi('Consumidores con una quiebra o una ejecución hipotecaria nueva en su expediente de crédito, miles por trimestre, ' + qy(I.quarters[0]) + '–' + UI.date(I.asOf) + '. En los últimos cuatro trimestres: ' + UI.nf(f.bk4) + ' mil quiebras (' + UI.signed((f.bk4 / f.bk4prev - 1) * 100, 0) + ' anual' + (f.bk2019 ? '; ' + UI.nf(f.bk2019) + ' mil en 2019' : '') + ') y ' + UI.nf(f.fc4) + ' mil ejecuciones (' + UI.signed((f.fc4 / f.fc4prev - 1) * 100, 0) + '). ' + UI.kind('R'),
        'Consumers with a new bankruptcy or foreclosure on their credit report, thousands per quarter, ' + qy(I.quarters[0]) + '–' + UI.date(I.asOf) + '. Over the last four quarters: ' + UI.nf(f.bk4) + ' thousand bankruptcies (' + UI.signed((f.bk4 / f.bk4prev - 1) * 100, 0) + ' from a year earlier' + (f.bk2019 ? '; ' + UI.nf(f.bk2019) + ' thousand in 2019' : '') + ') and ' + UI.nf(f.fc4) + ' thousand foreclosures (' + UI.signed((f.fc4 / f.fc4prev - 1) * 100, 0) + '). ' + UI.kind('R'));
    }
    var O = D.originations;
    if (O && O.auto) {
      var q0 = O.auto.quarters, os = [{ label: tr('Créditos automotrices', 'Auto loans'), data: O.auto.sub620, color: S(1) }].concat(O.mortgage ? [{ label: tr('Hipotecas', 'Mortgages'), data: O.mortgage.quarters.length === q0.length ? O.mortgage.sub620 : q0.map(function (q) { var i = O.mortgage.quarters.indexOf(q); return i < 0 ? null : O.mortgage.sub620[i]; }), color: S(2) }] : []);
      UI.line('chOrig', { labels: q0.map(qy), datasets: os, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0, xTicks: 8 });
      UI.charts.chOrig.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(q0[it[0].dataIndex]); }; UI.charts.chOrig.update();
      UI.legend('chOrig', os.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      var m = q0.length - 1, i07 = q0.indexOf('2007-Q1'), i19 = q0.indexOf('2019-Q4');
      UI.table('chOrig', [tr('Trimestre', 'Quarter')].concat(os.map(function (x) { return x.label; })), [m, m - 4, i19, i07].filter(function (i, k, a) { return i >= 0 && a.indexOf(i) === k; }).map(function (i) { return [UI.date(q0[i])].concat(os.map(function (x) { return x.data[i] == null ? '—' : UI.pct(x.data[i]); })); }));
      $('capOrig').innerHTML = bi('Porcentaje del monto de los créditos nuevos de cada trimestre que fue a deudores con puntaje de crédito menor a 620, ' + qy(q0[0]) + '–' + UI.date(O.asOf) + '. En ' + UI.date(O.asOf) + ': ' + UI.pct(O.auto.sub620[m]) + ' de los créditos automotrices' + (O.mortgage ? ' y ' + UI.pct(last(O.mortgage.sub620)) + ' de las hipotecas' : '') + (i07 >= 0 ? ' (' + UI.pct(O.auto.sub620[i07]) + (O.mortgage ? ' y ' + UI.pct(O.mortgage.sub620[O.mortgage.quarters.indexOf('2007-Q1')]) : '') + ' a principios de 2007)' : '') + '. ' + UI.kind('C'),
        'Share of each quarter\'s new lending, by amount, that went to borrowers with a credit score under 620, ' + qy(q0[0]) + '–' + UI.date(O.asOf) + '. In ' + UI.date(O.asOf) + ': ' + UI.pct(O.auto.sub620[m]) + ' of auto loans' + (O.mortgage ? ' and ' + UI.pct(last(O.mortgage.sub620)) + ' of mortgages' : '') + (i07 >= 0 ? ' (' + UI.pct(O.auto.sub620[i07]) + (O.mortgage ? ' and ' + UI.pct(O.mortgage.sub620[O.mortgage.quarters.indexOf('2007-Q1')]) : '') + ' in early 2007)' : '') + '. ' + UI.kind('C'));
    }
  }
  function stressMap() {
    var T = D.states, card = $('stressMapCard'); if (!card) return; if (!T || !T.list[0].rentBurden) { card.hidden = true; return; }
    var pF = function (v) { return UI.pct(v); }, pS = function (v) { return UI.pct(v, 0); }, rF = function (v) { return UI.nf(v, 2); }, g = function (k) { return function (s) { return s.rentBurden ? s.rentBurden[k] : null; }; };
    var M = [
      { id: 'p30', label: tr('Inquilinos que pagan 30% o más de su ingreso en renta', 'Renters paying 30% or more of income in rent'), btn: tr('Renta: 30% o más', 'Rent: 30% or more'), get: g('p30'), us: T.us.rentBurden.p30, fmt: pF, short: pS, kind: 'C', src: 'census' },
      { id: 'p50', label: tr('Inquilinos que pagan 50% o más de su ingreso en renta', 'Renters paying 50% or more of income in rent'), btn: tr('Renta: 50% o más', 'Rent: 50% or more'), get: g('p50'), us: T.us.rentBurden.p50, fmt: pF, short: pS, kind: 'C', src: 'census' },
      { id: 'bk', label: tr('Quiebras personales por cada 1,000 hogares, 12 meses', 'Personal bankruptcies per 1,000 households, 12 months'), btn: tr('Quiebras por 1,000 hogares', 'Bankruptcies per 1,000 households'), get: function (s) { return s.bankruptcy ? s.bankruptcy.per1000 : null; }, us: T.us.bankruptcy ? T.us.bankruptcy.per1000 : null, fmt: rF, short: function (v) { return UI.nf(v, 1); }, kind: 'C', src: 'courts' },
      { id: 'bkYoy', label: tr('Quiebras personales, variación anual', 'Personal bankruptcies, change from a year earlier'), btn: tr('Quiebras: variación anual', 'Bankruptcies: change'), get: function (s) { return s.bankruptcy ? s.bankruptcy.yoy : null; }, us: T.us.bankruptcy ? T.us.bankruptcy.yoy : null, fmt: function (v) { return UI.signed(v); }, short: function (v) { return UI.signed(v, 0); }, kind: 'C', src: 'courts' }
    ].filter(function (m) { return T.list.some(function (s) { return m.get(s) != null; }); });
    if (!M.some(function (m) { return m.id === state.stressMap; })) state.stressMap = M[0].id;
    function draw() {
      UI.seg('segStressMap', M.map(function (m) { return { id: m.id, label: m.btn }; }), state.stressMap, function (id) { state.stressMap = id; draw(); });
      var m = UI.stateMap({ box: 'mapStress', chips: 'chipsStress', scale: 'scaleStress', rank: 'rankStress', tblKey: 'mapStress', states: T.list, metrics: M, current: state.stressMap });
      var bk = /^bk/.test(m.id), C = D.bankruptcy;
      $('capStressMap').innerHTML = bk && C
        ? bi('Casos de quiebra no empresariales presentados en los 12 meses al ' + UI.date(C.asOf) + ', sumados por estado, por cada 1,000 hogares. En los 50 estados y el Distrito de Columbia: ' + UI.nf(T.us.bankruptcy.cases) + ' casos (' + UI.signed(T.us.bankruptcy.yoy, 1) + ' anual); con los territorios, ' + UI.nf(C.total.nb) + ', ' + UI.pct(C.total.nb7 / C.total.nb * 100, 0) + ' bajo el capítulo 7 (liquidación) y ' + UI.pct(C.total.nb13 / C.total.nb * 100, 0) + ' bajo el capítulo 13 (plan de pagos). ' + UI.kind('C'),
          'Nonbusiness bankruptcy cases filed in the 12 months to ' + UI.date(C.asOf) + ', added up by state, per 1,000 households. In the 50 states and the District of Columbia: ' + UI.nf(T.us.bankruptcy.cases) + ' cases (' + UI.signed(T.us.bankruptcy.yoy, 1) + ' from a year earlier); with the territories, ' + UI.nf(C.total.nb) + ', ' + UI.pct(C.total.nb7 / C.total.nb * 100, 0) + ' under Chapter 7 (liquidation) and ' + UI.pct(C.total.nb13 / C.total.nb * 100, 0) + ' under Chapter 13 (repayment plan). ' + UI.kind('C'))
        : bi('Inquilinos cuya renta bruta (renta más servicios) equivale a ' + (m.id === 'p50' ? '50%' : '30%') + ' o más del ingreso del hogar, como porcentaje de los inquilinos para los que se calcula. ' + T.acsYear + '. ' + UI.kind('C'),
          'Renters whose gross rent (rent plus utilities) equals ' + (m.id === 'p50' ? '50%' : '30%') + ' or more of household income, as a percent of the renters for whom it is computed. ' + T.acsYear + '. ' + UI.kind('C'));
      $('srcStressMap').innerHTML = srcLine(m.src);
    }
    draw();
  }

  // =====================================================================================================================
  // 08 Wealth
  // =====================================================================================================================
  function wealth() {
    var W = D.wealth; if (!W) return;
    var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
    var G = W.dims.networth, T = W.total, g = function (k) { return by(G, k); };
    var top1 = (g('TopPt1').nw + g('RemainingTop1').nw) / T * 100, stats = [st(UI.money(T), tr('Riqueza neta de los hogares, ', 'Household net worth, ') + UI.date(W.asOf))];
    if (W.households) stats.push(st(UI.usd(T * 1e9 / W.households), tr('Promedio por hogar', 'Mean per household'), 'C'));
    if (D.scf) stats.push(st(UI.usd(D.scf.all.medNW * 1000), tr('Mediana por familia, ', 'Median per family, ') + D.scf.asOf));
    stats.push(st(UI.pct(top1), tr('De la riqueza la tiene el 1% más rico', 'Of wealth is held by the top 1%'), 'C'), st(UI.pct(g('Bottom50').nw / T * 100), tr('De la riqueza la tiene el 50% inferior', 'Of wealth is held by the bottom 50%'), 'C'));
    if (D.z1 && D.z1.netWorthToDpi) stats.push(st(UI.nf(D.z1.netWorthToDpi / 100, 1) + '×', tr('Riqueza neta ÷ ingreso disponible', 'Net worth ÷ disposable income')));
    $('wealthStats').innerHTML = stats.join('');
    var hhT = sum(G.map(function (x) { return x.households || 0; }));
    var labels = G.map(function (x) { return nm('wg', x.k); });
    UI.bar('chWealthShare', { horizontal: true, labels: labels, datasets: [{ label: tr('% de la riqueza neta', '% of net worth'), data: G.map(function (x) { return x.nw / T * 100; }), color: S(1) }, { label: tr('% de los hogares', '% of households'), data: G.map(function (x) { return x.households / hhT * 100; }), color: UI.css('--neutral-mark') }], fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, thickness: 14, catSize: 10.5, valueLabels: function (v) { return UI.pct(v, v < 1 ? 1 : 0); }, labelDataset: 0 });
    UI.legend('chWealthShare', [{ c: S(1), l: tr('Participación en la riqueza neta', 'Share of net worth') }, { c: UI.css('--neutral-mark'), l: tr('Participación en los hogares', 'Share of households') }]);
    UI.table('chWealthShare', [tr('Grupo de riqueza', 'Wealth group'), tr('Hogares', 'Households'), tr('% de hogares', '% of households'), tr('Riqueza neta', 'Net worth'), tr('% de la riqueza', '% of net worth'), tr('Promedio por hogar', 'Mean per household')],
      G.map(function (x) { return [nm('wg', x.k), UI.nf(x.households), UI.pct(x.households / hhT * 100, 1), UI.money(x.nw), UI.pct(x.nw / T * 100), UI.usd(x.nw * 1e9 / x.households)]; }));
    var Hh = W.history, qs = Hh.quarters, sh = Hh.shares, top1s = qs.map(function (_, i) { return Math.round((sh.TopPt1[i] + sh.RemainingTop1[i]) * 100) / 100; });
    var hs = [{ label: tr('1% más rico', 'Top 1%'), data: top1s, color: S(1) }, { label: nm('wg', 'Next9'), data: sh.Next9, color: S(3) }, { label: nm('wg', 'Next40'), data: sh.Next40, color: S(2) }, { label: nm('wg', 'Bottom50'), data: sh.Bottom50, color: S(7) }];
    UI.line('chWealthHist', { labels: qs.map(function (q) { return q.slice(0, 4); }), datasets: hs, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
    UI.charts.chWealthHist.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(qs[it[0].dataIndex]); }; UI.charts.chWealthHist.update();
    UI.legend('chWealthHist', hs.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    var pickQ = qs.filter(function (q, i) { return /-Q4$/.test(q) && Number(q.slice(0, 4)) % 5 === 0 || i === qs.length - 1 || i === 0; });
    UI.table('chWealthHist', [tr('Trimestre', 'Quarter')].concat(hs.map(function (x) { return x.label; })), pickQ.reverse().map(function (q) { var i = qs.indexOf(q); return [UI.date(q)].concat(hs.map(function (x) { return UI.pct(x.data[i]); })); }));
    var ak = ['re', 'equities', 'pensions', 'business', 'deposits', 'durables', 'otherAssets'], acol = { re: S(1), equities: S(2), pensions: S(3), business: S(4), deposits: S(5), durables: S(7), otherAssets: UI.css('--neutral-mark') };
    var msets = ak.map(function (k) { return { label: nm('asset', k), color: acol[k], data: G.map(function (x) { return x[k] / x.assets * 100; }) }; });
    UI.bar('chWealthMix', { horizontal: true, stacked: true, labels: labels, datasets: msets, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, max: 100, thickness: 26, catSize: 10.5 });
    UI.legend('chWealthMix', msets.map(function (x) { return { c: x.color, l: x.label }; }));
    UI.table('chWealthMix', [tr('Grupo', 'Group')].concat(ak.map(function (k) { return nm('asset', k); })).concat([tr('Deuda ÷ activos', 'Debt ÷ assets'), tr('Hipotecas ÷ activos', 'Mortgages ÷ assets'), tr('Crédito al consumo ÷ activos', 'Consumer credit ÷ assets')]),
      G.map(function (x) { return [nm('wg', x.k)].concat(ak.map(function (k) { return UI.pct(x[k] / x.assets * 100); })).concat([UI.pct(x.liab / x.assets * 100), UI.pct(x.mortgages / x.assets * 100), UI.pct(x.ccredit / x.assets * 100)]); }));
    wealthDemo();
    if (D.scf) {
      var Hs = D.scf.history, yl = Hs.map(function (h) { return h.y; });
      $('capScfHist').innerHTML = bi('Riqueza neta de las familias, mediana y promedio, dólares de ' + D.scf.dollars + ' (escala logarítmica; M = millones)', 'Family net worth, median and mean, ' + D.scf.dollars + ' dollars (logarithmic scale; M = millions)');
      var kM = function (v) { return v >= 1000 ? '$' + UI.nf(v / 1000, v % 1000 ? 2 : 0) + ' M' : '$' + UI.nf(v, 0) + (UI.lang === 'en' ? 'K' : ' mil'); };
      UI.line('chScfHist', { labels: yl, datasets: [{ label: tr('Promedio', 'Mean'), data: Hs.map(function (h) { return h.meanNW; }), color: S(2), points: true }, { label: tr('Mediana', 'Median'), data: Hs.map(function (h) { return h.medNW; }), color: S(1), points: true }], fmt: kM, xTicks: 13 });
      var ch = UI.charts.chScfHist; ch.options.scales.y.type = 'logarithmic'; ch.options.scales.y.min = 50; ch.options.scales.y.max = 2000; ch.options.scales.y.ticks.callback = function (v) { return [50, 100, 200, 500, 1000, 2000].indexOf(v) >= 0 ? kM(v) : ''; }; ch.options.scales.y.ticks.maxTicksLimit = 20; ch.update();
      UI.legend('chScfHist', [{ c: S(2), l: tr('Promedio (lo elevan las grandes fortunas)', 'Mean (pulled up by large fortunes)'), line: 1 }, { c: S(1), l: tr('Mediana (la familia típica)', 'Median (the typical family)'), line: 1 }]);
      UI.table('chScfHist', [tr('Encuesta', 'Survey'), tr('Mediana', 'Median'), tr('Promedio', 'Mean'), tr('Promedio ÷ mediana', 'Mean ÷ median'), tr('Mediana del ingreso', 'Median income')], Hs.slice().reverse().map(function (h) { return [h.y, UI.usd(h.medNW * 1000), UI.usd(h.meanNW * 1000), UI.nf(h.meanNW / h.medNW, 1) + '×', UI.usd(h.medIncome * 1000)]; }));
      var I2 = D.scf.income, own = [['residence', tr('Vivienda principal', 'Primary residence'), S(1)], ['retirement', tr('Cuentas de retiro', 'Retirement accounts'), S(3)], ['stocks', tr('Acciones (directas o en fondos)', 'Stocks (direct or through funds)'), S(2)], ['business', tr('Negocio propio', 'Business equity'), S(4)]];
      $('capScfOwn').innerHTML = bi('Porcentaje de familias que tiene cada activo, por percentil de ingreso, ' + D.scf.asOf, 'Percent of families holding each asset, by income percentile, ' + D.scf.asOf);
      UI.bar('chScfOwn', { labels: I2.map(function (x) { return nm('scfInc', x.k); }), datasets: own.map(function (o) { return { label: o[1], color: o[2], data: I2.map(function (x) { return x.have[o[0]]; }) }; }), fmt: function (v) { return UI.pct(v, 0); }, axisFmt: function (v) { return v + '%'; }, max: 100, thickness: 12, catSize: 10 });
      UI.legend('chScfOwn', own.map(function (o) { return { c: o[2], l: o[1] }; }));
      UI.table('chScfOwn', [tr('Percentil de ingreso', 'Income percentile'), tr('Mediana de riqueza neta', 'Median net worth'), tr('Promedio de riqueza neta', 'Mean net worth')].concat(own.map(function (o) { return o[1] + ' (%)'; })), I2.map(function (x) { return [nm('scfInc', x.k), UI.usd(x.medNW * 1000), UI.usd(x.meanNW * 1000)].concat(own.map(function (o) { return UI.pct(x.have[o[0]], 0); })); }));
    }
  }
  function wealthDemo() {
    var W = D.wealth, dims = [['income', tr('Ingreso', 'Income')], ['age', tr('Edad', 'Age')], ['generation', tr('Generación', 'Generation')], ['education', tr('Escolaridad', 'Schooling')], ['race', tr('Raza y origen', 'Race and origin')]];
    UI.seg('segWealthDemo', dims.map(function (d) { return { id: d[0], label: d[1] }; }), state.wealthDemo, function (id) { state.wealthDemo = id; wealthDemo(); });
    var G = W.dims[state.wealthDemo]; if (!G) return;
    var order = { income: ['pct00to20', 'pct20to40', 'pct40to60', 'pct60to80', 'pct80to99', 'pct99to100'], age: ['ageunder40', 'age40to54', 'age55to69', 'age70plus'], generation: ['Millennial', 'GenX', 'BabyBoom', 'Silent'], education: ['NoHS', 'HS', 'SomeCollege', 'College'], race: ['White', 'Black', 'Hispanic', 'Other'] }[state.wealthDemo];
    var rows = order.map(function (k) { return by(G, k); }).filter(Boolean), T = sum(rows.map(function (x) { return x.nw; })), hhT = sum(rows.map(function (x) { return x.households || 0; }));
    var labels = rows.map(function (x) { return nm('wg', x.k); });
    UI.bar('chWealthDemoShare', { horizontal: true, labels: labels, datasets: [{ label: tr('% de la riqueza neta', '% of net worth'), data: rows.map(function (x) { return x.nw / T * 100; }), color: S(1) }, { label: tr('% de los hogares', '% of households'), data: rows.map(function (x) { return x.households / hhT * 100; }), color: UI.css('--neutral-mark') }], fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, thickness: 14, catSize: 10.5, valueLabels: function (v) { return UI.pct(v, 0); }, labelDataset: 0 });
    UI.legend('chWealthDemoShare', [{ c: S(1), l: tr('Participación en la riqueza neta', 'Share of net worth') }, { c: UI.css('--neutral-mark'), l: tr('Participación en los hogares', 'Share of households') }]);
    // medians from the survey, where the survey has the same grouping
    var scfMap = { income: null, age: null, generation: null, education: 'edu', race: 'race' }[state.wealthDemo];
    UI.bar('chWealthDemoAvg', { horizontal: true, labels: labels, data: rows.map(function (x) { return x.nw * 1e9 / x.households; }), color: S(3), fmt: function (v) { return UI.usd(v); }, axisFmt: function (v) { return '$' + UI.nf(v / 1e6, 1) + ' M'; }, valueLabels: function (v) { return v >= 1e6 ? '$' + UI.nf(v / 1e6, 1) + ' M' : UI.usdK(v, 0); }, thickness: 16, catSize: 10.5 });
    UI.legend('chWealthDemoAvg', [{ c: S(3), l: tr('Riqueza neta promedio por hogar (M = millones)', 'Mean net worth per household (M = millions)') }]);
    var med = null;
    if (D.scf && scfMap) { var sg = D.scf[scfMap], km = { College: 'College degree', SomeCollege: 'Some college', HS: 'High school diploma', NoHS: 'No high school diploma', White: 'White, non-Hispanic', Black: 'Black, non-Hispanic', Hispanic: 'Hispanic', Other: 'Other' }; med = function (k) { var r = by(sg, km[k]); return r ? r.medNW * 1000 : null; }; }
    $('capWealthDemo').innerHTML = bi('Participación de cada grupo en la riqueza neta y en los hogares, y riqueza neta promedio por hogar, ' + UI.date(W.asOf) + '. ' + (med ? 'La tabla agrega la mediana de la encuesta de ' + D.scf.asOf + '. ' : '') + UI.kind('C'),
      'Each group\'s share of net worth and of households, and mean net worth per household, ' + UI.date(W.asOf) + '. ' + (med ? 'The table adds the median from the ' + D.scf.asOf + ' survey. ' : '') + UI.kind('C'));
    UI.table('chWealthDemo', [tr('Grupo', 'Group'), tr('Hogares', 'Households'), tr('% de hogares', '% of households'), tr('Riqueza neta', 'Net worth'), tr('% de la riqueza', '% of net worth'), tr('Promedio por hogar', 'Mean per household')].concat(med ? [tr('Mediana por familia (', 'Median per family (') + D.scf.asOf + ')'] : []),
      rows.map(function (x) { var r = [nm('wg', x.k), UI.nf(x.households), UI.pct(x.households / hhT * 100), UI.money(x.nw), UI.pct(x.nw / T * 100), UI.usd(x.nw * 1e9 / x.households)]; if (med) r.push(med(x.k) == null ? '—' : UI.usd(med(x.k))); return r; }), { open: false });
    $('srcWealthDemo').innerHTML = srcLine('dfa') + (med ? ' · ' + srcLine('scf') : '');
  }

  // =====================================================================================================================
  // 09 The K-shaped economy
  // =====================================================================================================================
  var KG = { top1: ['1% más rico', 'Top 1%'], next9: ['Siguiente 9%', 'Next 9%'], next40: ['Siguiente 40%', 'Next 40%'], bottom50: ['50% inferior', 'Bottom 50%'] };
  var ma3 = function (a) { return a.map(function (v, i) { return i < 2 || a[i] == null || a[i - 1] == null || a[i - 2] == null ? null : Math.round((a[i] + a[i - 1] + a[i - 2]) / 3 * 10) / 10; }); };
  // who produced a figure that is not one of this page's own series: a private firm, Federal Reserve research, or a federal statistical agency
  var extBadge = function (kind) {
    var k = kind || 'private';
    var t = k === 'fed' ? ['Investigación de la Reserva Federal', 'Federal Reserve research', 'Estudio publicado por la Junta de la Reserva Federal o por un banco de la Reserva: no es una estadística periódica.', 'A study published by the Federal Reserve Board or a Reserve Bank: not a regular statistic.']
      : k === 'official' ? ['Oficial, experimental', 'Official, experimental', 'Estadística experimental de una agencia federal.', 'An experimental statistic of a federal agency.']
      : ['Estimación de terceros', 'Third-party estimate', 'Estimación de un tercero: no es una estadística oficial ni un cálculo de FNAM.', 'An estimate by a third party: neither an official statistic nor an FNAM calculation.'];
    return '<span class="badge-ext' + (k === 'private' ? '' : ' pub') + '" title="' + esc(tr(t[2], t[3])) + '">' + tr(t[0], t[1]) + '</span>';
  };
  // what the K block can say in one sentence each (used by the section's callout and by "At a glance")
  function kFacts() {
    var K = D.kshape, f = {}; if (!K) return null;
    if (K.wealth) { var w = K.wealth, g = function (k) { return (w.groups || []).filter(function (x) { return x.k === k; })[0]; };
      f.eq = last(w.eqTop10); f.nw = last(w.nwTop10); f.q = w.asOf; f.top1 = g('top1'); f.b50 = g('bottom50'); f.base = w.base; }
    if (K.sentiment) { var s = K.sentiment, u = ma3(s.upper), l = ma3(s.lower); f.sentGap = last(u) - last(l); f.sentU = last(u); f.sentL = last(l); f.sentAsOf = s.asOf; }
    if (K.wages) { var wg = K.wages, n = wg.months.length - 1; f.w1 = wg.q1[n]; f.w4 = wg.q4[n]; f.wAsOf = wg.asOf;
      var best = -1, bi2 = -1; wg.months.forEach(function (m, i) { if (m >= '2015-01' && wg.q1[i] != null && wg.q4[i] != null && wg.q1[i] - wg.q4[i] > best) { best = wg.q1[i] - wg.q4[i]; bi2 = i; } });
      if (bi2 >= 0) f.wPeak = { m: wg.months[bi2], q1: wg.q1[bi2], q4: wg.q4[bi2] }; }
    if (K.spend) { var sp = K.spend; f.s20 = last(sp.top20); f.s20first = sp.top20[0]; f.sY0 = sp.years[0]; f.sY1 = sp.asOf; f.sMin = Math.min.apply(null, sp.top20); f.sMax = Math.max.apply(null, sp.top20); }
    if (K.spendDeciles) f.s10 = last(K.spendDeciles.top10);
    if (K.spendGrowth) { var r = K.spendGrowth.deciles.map(function (d) { return d.real; }).filter(function (v) { return v != null; }); if (r.length) { f.gMin = Math.min.apply(null, r); f.gMax = Math.max.apply(null, r); f.gFrom = K.spendGrowth.from; f.gTo = K.spendGrowth.to; } }
    if (K.income && K.income.pi) { f.inc10 = last(K.income.pi.top10); f.inc10first = K.income.pi.top10[0]; f.incY0 = K.income.pi.years[0]; f.incY1 = K.income.asOf; }
    if (K.estimates) f.est = K.estimates.list.filter(function (e) { return e.headline; })[0] || null;
    // the range of the official and Federal Reserve measurements of the top 10%'s share of spending
    var off = (f.s10 != null ? [{ v: f.s10, dp: 1 }] : []).concat(K.pceDist ? [{ v: last(K.pceDist.top10), dp: 1 }] : []).concat(K.estimates ? K.estimates.list.filter(function (e) { return e.measure === 'spendTop10' && e.kind !== 'private'; }).map(function (e) { return { v: e.v, dp: e.dp == null ? 1 : e.dp }; }) : []).sort(function (a, b) { return a.v - b.v; });
    if (off.length) { f.offHi = off[off.length - 1].v; f.offHiDp = off[off.length - 1].dp; f.offLo = off[0].v; }
    return f;
  }
  var estVal = function (e) { return e.unit === '%' ? UI.pct(e.v, e.dp == null ? 1 : e.dp) : e.unit === 'usd' ? UI.usd(e.v) : UI.nf(e.v, e.dp || 0) + (e.unit ? ' ' + e.unit : ''); };
  function kshape() {
    var K = D.kshape; if (!K) return;
    var CT = S(1), CM = S(2), CB = S(7), CX = S(5), f = kFacts();
    var st = function (v, l, tag) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + tag + '</div></div>'; };
    var stats = [];
    if (f.eq != null) stats.push(st(UI.pct(f.eq, 0), tr('De las acciones y fondos, en manos del 10% más rico, ', 'Of stocks and mutual funds, held by the wealthiest 10%, ') + UI.date(f.q), UI.kind('C')));
    if (f.inc10 != null) stats.push(st(UI.pct(f.inc10), tr('Del ingreso personal lo recibe el 10% de mayor ingreso, ', 'Of personal income goes to the top 10% by income, ') + f.incY1, UI.kind('R')));
    if (f.s20 != null) stats.push(st(UI.pct(f.s20), tr('Del gasto lo hace el 20% de mayor ingreso, ', 'Of spending is done by the top 20% by income, ') + f.sY1 + tr(' (encuesta de la BLS)', ' (BLS survey)'), UI.kind('C')));
    if (f.est) stats.push(st(estVal(f.est), tr(f.est.label.es, f.est.label.en) + ', ' + tr(f.est.period.es, f.est.period.en) + ' (' + esc(f.est.publisher) + ')', extBadge(f.est.kind)));
    if (f.sentGap != null) stats.push(st(UI.nf(f.sentGap, 1) + tr(' puntos', ' points'), tr('Separan la confianza del tercio de mayor ingreso de la del tercio de menor, ', 'Separate the confidence of the upper income third from the lower third, ') + UI.date(f.sentAsOf), UI.kind('C')));
    if (f.w1 != null) stats.push(st(UI.pct(f.w1) + ' / ' + UI.pct(f.w4), tr('Crecimiento salarial anual del cuarto peor pagado y del mejor pagado, ', 'Annual wage growth of the lowest-paid and highest-paid quarter of workers, ') + UI.date(f.wAsOf), UI.kind('R')));
    $('kStats').innerHTML = stats.join('');

    // the section in two sentences: where the K is documented, and where the official figures do not show it
    var es = '', en = '';
    if (f.top1 && f.b50) {
      es += '<b>Dónde está la K.</b> En la riqueza: el 10% más rico tiene el <b>' + UI.pct(f.eq, 0) + '</b> de las acciones y fondos y el ' + UI.pct(f.nw) + ' de la riqueza neta (' + UI.date(f.q) + '); desde el ' + UI.date(f.base) + ' el 1% más rico ganó ' + UI.money(f.top1.gain) + ' y la mitad con menos riqueza, ' + UI.money(f.b50.gain) + '.';
      en += '<b>Where the K is.</b> In wealth: the wealthiest 10% hold <b>' + UI.pct(f.eq, 0) + '</b> of stocks and mutual funds and ' + UI.pct(f.nw) + ' of net worth (' + UI.date(f.q) + '); since ' + UI.date(f.base) + ' the top 1% gained ' + UI.money(f.top1.gain) + ' and the less wealthy half gained ' + UI.money(f.b50.gain) + '.';
    }
    if (f.sentGap != null) { es += ' En la confianza: ' + UI.nf(f.sentGap, 0) + ' puntos separan al tercio de mayor ingreso (' + UI.nf(f.sentU, 1) + ') del de menor (' + UI.nf(f.sentL, 1) + ').'; en += ' In confidence: ' + UI.nf(f.sentGap, 0) + ' points separate the upper income third (' + UI.nf(f.sentU, 1) + ') from the lower third (' + UI.nf(f.sentL, 1) + ').'; }
    if (f.w1 != null && f.wPeak) {
      var flipped = f.w1 < f.w4 && f.wPeak.q1 > f.wPeak.q4;
      es += ' En los salarios: los del cuarto peor pagado crecen ' + UI.pct(f.w1) + ' al año y los del mejor pagado ' + UI.pct(f.w4) + (flipped ? '; en ' + UI.date(f.wPeak.m) + ' la ventaja era de los primeros (' + UI.pct(f.wPeak.q1) + ' frente a ' + UI.pct(f.wPeak.q4) + ').' : '.');
      en += ' In wages: pay of the lowest-paid quarter is growing ' + UI.pct(f.w1) + ' a year and that of the highest-paid ' + UI.pct(f.w4) + (flipped ? '; in ' + UI.date(f.wPeak.m) + ' the advantage was with the former (' + UI.pct(f.wPeak.q1) + ' against ' + UI.pct(f.wPeak.q4) + ').' : '.');
    }
    if (f.s20 != null) {
      var d = f.s20 - f.s20first, flat = Math.abs(d) < 2.5;
      es += ' <b>Dónde no la muestran las cifras oficiales.</b> En el reparto del gasto: en la encuesta de la BLS el 20% de mayor ingreso hace el ' + UI.pct(f.s20) + ' del gasto (' + f.sY1 + '), ' + (flat ? 'casi lo mismo que' : d > 0 ? 'más que' : 'menos que') + ' en ' + f.sY0 + ' (' + UI.pct(f.s20first) + ')' + (f.gMin != null ? (f.gMin > 0 ? ', y entre ' + f.gFrom + ' y ' + f.gTo + ' el gasto real por hogar creció en los diez deciles (de ' + UI.signed(f.gMin) + ' a ' + UI.signed(f.gMax) + ')' : ', y entre ' + f.gFrom + ' y ' + f.gTo + ' el gasto real por hogar varió entre ' + UI.signed(f.gMin) + ' y ' + UI.signed(f.gMax) + ' según el decil') : '') + '.';
      en += ' <b>Where the official figures do not show it.</b> In the split of spending: in the BLS survey the top 20% by income do ' + UI.pct(f.s20) + ' of spending (' + f.sY1 + '), ' + (flat ? 'about the same as' : d > 0 ? 'more than' : 'less than') + ' in ' + f.sY0 + ' (' + UI.pct(f.s20first) + ')' + (f.gMin != null ? (f.gMin > 0 ? ', and between ' + f.gFrom + ' and ' + f.gTo + ' real spending per household rose in all ten deciles (from ' + UI.signed(f.gMin) + ' to ' + UI.signed(f.gMax) + ')' : ', and between ' + f.gFrom + ' and ' + f.gTo + ' real spending per household changed by ' + UI.signed(f.gMin) + ' to ' + UI.signed(f.gMax) + ' depending on the decile') : '') + '.';
    }
    if (f.est) { es += ' Las estimaciones privadas dan una concentración mayor: ' + estVal(f.est) + ' ' + tr(f.est.short.es, f.est.short.en) + ' (' + esc(f.est.publisher) + ', ' + tr(f.est.period.es, f.est.period.en) + ').'; en += ' Private estimates show more concentration: ' + estVal(f.est) + ' ' + f.est.short.en + ' (' + esc(f.est.publisher) + ', ' + f.est.period.en + ').'; }
    $('kCallout').innerHTML = bi(es + ' ' + UI.kind('C'), en + ' ' + UI.kind('C'));

    // spending shares, two official measurements: the survey (households ranked by income) and the BLS distribution of the
    // national accounts' consumption (households ranked by their spending)
    if (K.spend) {
      var sp = K.spend, PD = K.pceDist;
      var ys = sp.years.slice(); if (PD) PD.years.forEach(function (y) { if (ys.indexOf(y) < 0) ys.push(y); }); ys.sort(function (a, b) { return a - b; });
      var at = function (years, vals) { var m = {}; years.forEach(function (y, i) { m[y] = vals[i]; }); return ys.map(function (y) { return m[y] == null ? null : m[y]; }); };
      // two axes (owner, 11-Oct-2026): the top 20% on the left from 35%, every top-10% series on the right from 20%
      // (a series that ever fell below its axis floor lowers the floor to the round figure under it, so no point is cut off)
      var lax = tr(' (eje izquierdo)', ' (left axis)'), rax = tr(' (eje derecho)', ' (right axis)');
      var leftMin = Math.min(35, Math.floor(Math.min.apply(null, sp.top20) / 5) * 5);
      var sets = [{ label: tr('20% de mayor ingreso, encuesta de la BLS', 'Top 20% by income, BLS survey') + lax, data: at(sp.years, sp.top20), color: CT }];
      if (K.spendDeciles) sets.push({ label: tr('10% de mayor ingreso, encuesta de la BLS', 'Top 10% by income, BLS survey') + rax, data: at(K.spendDeciles.years, K.spendDeciles.top10), color: S(3), points: true, axis: 'y2' });
      if (PD) sets.push({ label: tr('10% que más gasta, consumo de cuentas nacionales (BLS, experimental)', 'Top 10% of spenders, national-accounts consumption (BLS, experimental)') + rax, data: at(PD.years, PD.top10), color: S(4), axis: 'y2' });
      var rightMin = Math.min.apply(null, [20].concat(sets.filter(function (x) { return x.axis === 'y2'; }).map(function (x) { return Math.floor(Math.min.apply(null, x.data.filter(function (v) { return v != null; })) / 5) * 5; })));
      UI.line('chKSpend', { labels: ys, datasets: sets, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: leftMin, xTicks: 11, yTitle: tr('20% de mayor ingreso', 'Top 20% by income'), y2: { min: rightMin, title: tr('10% superior', 'Top 10%') } });
      UI.legend('chKSpend', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      UI.table('chKSpend', [tr('Año', 'Year')].concat(sets.map(function (x) { return x.label; })), ys.slice().reverse().filter(function (y, i) { return i < 8 || y % 5 === 4 || y === ys[0]; }).map(function (y) { var i = ys.indexOf(y); return [y].concat(sets.map(function (x) { return x.data[i] == null ? '—' : UI.pct(x.data[i]); })); }));
      $('capKSpend').innerHTML = bi('Participación en el gasto de consumo de todos los hogares, porcentaje. Encuesta de la BLS: hogares ordenados por su ingreso antes de impuestos, ' + sp.years[0] + '–' + sp.asOf + '.' + (PD ? ' Consumo de cuentas nacionales: la misma encuesta ajustada al consumo total del país, hogares ordenados por su gasto, ' + PD.years[0] + '–' + PD.asOf + '.' : '') + ' Eje izquierdo: el 20% de mayor ingreso; eje derecho: el 10% superior. Ninguno de los dos ejes empieza en cero. ' + UI.kind('C'),
        'Share of the consumer spending of all households, percent. BLS survey: households ranked by income before taxes, ' + sp.years[0] + '–' + sp.asOf + '.' + (PD ? ' National-accounts consumption: the same survey scaled to the country\'s total consumption, households ranked by their spending, ' + PD.years[0] + '–' + PD.asOf + '.' : '') + ' Left axis: the top 20% by income; right axis: the top 10%. Neither axis starts at zero. ' + UI.kind('C'));
      var cEs = '<b>La encuesta oficial:</b> el 20% de hogares de mayor ingreso hizo el <b>' + UI.pct(f.s20) + '</b> del gasto en ' + f.sY1 + ' y el ' + UI.pct(f.s20first) + ' en ' + f.sY0 + '; en esos años la cifra se movió entre ' + UI.pct(f.sMin) + ' y ' + UI.pct(f.sMax) + '.' + (f.s10 != null ? ' El 10% superior hizo el ' + UI.pct(f.s10) + '.' : '');
      var cEn = '<b>The official survey:</b> the top 20% of households by income did <b>' + UI.pct(f.s20) + '</b> of spending in ' + f.sY1 + ' and ' + UI.pct(f.s20first) + ' in ' + f.sY0 + '; over those years the figure moved between ' + UI.pct(f.sMin) + ' and ' + UI.pct(f.sMax) + '.' + (f.s10 != null ? ' The top 10% did ' + UI.pct(f.s10) + '.' : '');
      if (PD) { var p1 = last(PD.top10), p0 = PD.top10[0], pmin = Math.min.apply(null, PD.top10), pmax = Math.max.apply(null, PD.top10);
        cEs += ' <b>Con el consumo de las cuentas nacionales:</b> el 10% de hogares que más gasta hizo el <b>' + UI.pct(p1) + '</b> del consumo en ' + PD.asOf + ' y el ' + UI.pct(p0) + ' en ' + PD.years[0] + ' (entre ' + UI.pct(pmin) + ' y ' + UI.pct(pmax) + ' en esos años).';
        cEn += ' <b>On national-accounts consumption:</b> the top 10% of households by spending did <b>' + UI.pct(p1) + '</b> of consumption in ' + PD.asOf + ' and ' + UI.pct(p0) + ' in ' + PD.years[0] + ' (between ' + UI.pct(pmin) + ' and ' + UI.pct(pmax) + ' over those years).'; }
      cEs += ' <b>Qué tienen en común:</b> ninguna de las dos mediciones oficiales muestra que la parte de arriba haya ganado participación en el gasto.';
      cEn += ' <b>What they have in common:</b> neither official measurement shows the top gaining share of spending.';
      $('kSpendCallout').innerHTML = bi(cEs, cEn);
      $('srcKSpend').innerHTML = srcLine('cexHist') + (PD ? ' · ' + srcLine('pceDist').replace(/^[^:]*:\s*/, '') : '');
    }
    // the same question, by who measures it: official surveys, Federal Reserve research and the private estimate
    var mc = $('kMeasureCard');
    if (mc) {
      var M = [];
      if (K.spendDeciles) M.push({ l: tr('BLS, encuesta de gastos (lo que los hogares declaran)', 'BLS, expenditure survey (what households report)'), v: last(K.spendDeciles.top10), per: String(last(K.spendDeciles.years)), kind: 'own', rank: tr('por ingreso', 'by income') });
      if (K.pceDist) M.push({ l: tr('BLS, consumo de cuentas nacionales (experimental)', 'BLS, national-accounts consumption (experimental)'), v: last(K.pceDist.top10), per: K.pceDist.asOf, kind: 'own', rank: tr('por gasto', 'by spending') });
      if (K.byIncome) M.push({ l: tr('BEA y BLS, consumo de cuentas nacionales (prototipo)', 'BEA and BLS, national-accounts consumption (prototype)'), v: last(K.byIncome.pceTop10), per: K.byIncome.asOf, kind: 'own', rank: tr('por ingreso', 'by income') });
      (K.estimates ? K.estimates.list : []).forEach(function (e) { if (e.measure === 'spendTop10') M.push({ l: tr(e.measureLabel.es, e.measureLabel.en), v: e.v, dp: e.dp == null ? 1 : e.dp, per: tr(e.period.es, e.period.en), kind: e.kind, old: !!e.superseded, rank: tr('por ingreso', 'by income'), e: e }); });
      var mp = function (m) { return UI.pct(m.v, m.dp == null ? 1 : m.dp); };
      var ext = M.filter(function (m) { return m.kind !== 'own'; });
      if (M.length >= 3 && ext.length) {
        mc.hidden = false;
        M.sort(function (a, b) { return a.v - b.v; });
        var colOf = function (m) { return m.kind === 'private' ? (m.old ? CX + '80' : CX) : CT; };
        UI.bar('chKMeasure', { horizontal: true, labels: M.map(function (m) { return m.l + ' · ' + m.per; }), data: M.map(function (m) { return m.v; }), colors: M.map(colOf), wrap: $('chKMeasure').parentNode.clientWidth < 430 ? 19 : 44, thickness: 18,
          fmt: function (v, i) { return (i != null ? mp(M[i]) : UI.pct(v)) + (i != null ? ' · ' + tr('hogares ordenados ', 'households ranked ') + M[i].rank : ''); }, axisFmt: function (v) { return v + '%'; }, valueLabels: function (v, i) { return mp(M[i]); }, tipTitle: function (i) { return M[i].l + ' · ' + M[i].per; } });
        UI.legend('chKMeasure', [{ c: CT, l: tr('Estadísticas oficiales e investigación de la Reserva Federal', 'Official statistics and Federal Reserve research') }, { c: CX, l: tr('Estimación privada', 'Private estimate') }].concat(M.some(function (m) { return m.old; }) ? [{ c: CX + '80', l: tr('Estimación privada, método anterior', 'Private estimate, earlier method') }] : []));
        UI.table('chKMeasure', [tr('Medición', 'Measurement'), tr('Periodo', 'Period'), tr('Hogares ordenados', 'Households ranked'), tr('Parte del gasto del 10% superior', 'Top 10%\'s share of spending')], M.slice().reverse().map(function (m) { return [m.l, m.per, m.rank, mp(m)]; }));
        $('capKMeasure').innerHTML = bi('Parte del gasto de consumo que hace el 10% superior de los hogares según cada medición, porcentaje. Las barras no son una serie: cada una mide algo distinto, en su propio periodo.', 'Share of consumer spending done by the top 10% of households according to each measurement, percent. The bars are not a series: each one measures something different, in its own period.');
        var lo = M[0], hi = M.filter(function (m) { return !m.old; }).slice(-1)[0], old = M.filter(function (m) { return m.old; })[0], pub = M.filter(function (m) { return m.kind !== 'private'; });
        var pubHi = pub[pub.length - 1];
        var mEs = '<b>De ' + mp(lo) + ' a ' + mp(hi) + ':</b> las ' + pub.length + ' mediciones oficiales o de la Reserva Federal ponen la parte del 10% superior entre ' + mp(pub[0]) + ' y ' + mp(pubHi) + '; la estimación de ' + esc(hi.e ? hi.e.publisher : hi.l) + ' la pone en <b>' + mp(hi) + '</b> (' + hi.per + ')' + (old ? ', y era ' + mp(old) + ' (' + old.per + ') antes de un cambio de método' : '') + '.';
        var mEn = '<b>From ' + mp(lo) + ' to ' + mp(hi) + ':</b> the ' + pub.length + ' official or Federal Reserve measurements put the top 10%\'s share between ' + mp(pub[0]) + ' and ' + mp(pubHi) + '; the estimate by ' + esc(hi.e ? hi.e.publisher : hi.l) + ' puts it at <b>' + mp(hi) + '</b> (' + hi.per + ')' + (old ? ', and it was ' + mp(old) + ' (' + old.per + ') before a change of method' : '') + '.';
        mEs += ' <b>Por qué difieren:</b> la encuesta de gastos suma lo que los hogares declaran y alcanza poco a los más ricos; el consumo de cuentas nacionales agrega lo que la encuesta no ve (por ejemplo, la atención médica que pagan aseguradoras y gobierno y la renta imputada a quienes son dueños de su vivienda); la encuesta de finanzas de la Reserva Federal sobremuestrea a las familias ricas; y la estimación privada no cuenta compras: trata como gasto el ingreso disponible que queda después del ahorro estimado de cada grupo.';
        mEn += ' <b>Why they differ:</b> the expenditure survey adds up what households report and reaches few of the richest; national-accounts consumption adds what the survey does not see (for example, health care paid by insurers and government and the rent imputed to homeowners); the Federal Reserve\'s survey of finances oversamples wealthy families; and the private estimate does not count purchases: it treats as spending the disposable income left after each group\'s estimated saving.';
        $('kMeasureCallout').innerHTML = bi(mEs + ' ' + UI.kind('C'), mEn + ' ' + UI.kind('C'));
        $('srcKMeasure').innerHTML = tr('Fuentes: ', 'Sources: ') + [srcLine('cex').replace(/^[^:]*:\s*/, '')].concat(K.pceDist ? [srcLine('pceDist').replace(/^[^:]*:\s*/, '')] : []).concat(K.byIncome ? [srcLine('jointDist').replace(/^[^:]*:\s*/, '')] : []).concat(ext.filter(function (m, i) { return ext.findIndex(function (x) { return x.e.publisher === m.e.publisher; }) === i; }).map(function (m) { return '<a href="' + esc(m.e.url) + '" target="_blank" rel="noopener">' + esc(m.e.publisher) + ' ↗</a> ' + extBadge(m.e.kind); })).join(' · ');
      } else mc.hidden = true;
    }
    // income shares (BEA)
    if (K.income && (K.income.pi || K.income.dpi)) {
      var I = K.income.pi || K.income.dpi, isPi = !!K.income.pi;
      // two axes (owner, 11-Oct-2026): the top 10% and the next 40% on the left from 35%, the bottom 50% on the right from 20%
      // (a series that ever fell below its axis floor lowers the floor to the round figure under it, so no point is cut off)
      var ilax = tr(' (eje izquierdo)', ' (left axis)'), irax = tr(' (eje derecho)', ' (right axis)');
      var floorOf = function (dflt, arrs) { var m = Math.min.apply(null, [].concat.apply([], arrs).filter(function (v) { return v != null; })); return Math.min(dflt, Math.floor(m / 5) * 5); };
      var iset = [{ label: tr('10% de mayor ingreso', 'Top 10% by income') + ilax, data: I.top10, color: CT }, { label: tr('Siguiente 40%', 'Next 40%') + ilax, data: I.next40, color: CM }, { label: tr('50% de menor ingreso', 'Bottom 50%') + irax, data: I.bottom50, color: CB, axis: 'y2' }];
      UI.line('chKIncome', { labels: I.years, datasets: iset, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: floorOf(35, [I.top10, I.next40]), xTicks: 9,
        yTitle: tr('10% superior y siguiente 40%', 'Top 10% and next 40%'), y2: { min: floorOf(20, [I.bottom50]), grace: '6%', title: tr('50% de menor ingreso', 'Bottom 50%') } });   // grace: headroom, so a peak that lands on a round figure is not drawn on the frame
      UI.legend('chKIncome', iset.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      var D2 = K.income.dpi;
      UI.table('chKIncome', [tr('Año', 'Year')].concat(iset.map(function (x) { return x.label; })).concat([tr('1% superior', 'Top 1%')]).concat(D2 && isPi ? [tr('10% superior, ingreso disponible', 'Top 10%, disposable income')] : []),
        I.years.slice().reverse().map(function (y) { var i = I.years.indexOf(y), j = D2 ? D2.years.indexOf(y) : -1; return [y].concat(iset.map(function (x) { return UI.pct(x.data[i]); })).concat([I.top1 && I.top1[i] != null ? UI.pct(I.top1[i]) : '—']).concat(D2 && isPi ? [j >= 0 ? UI.pct(D2.top10[j]) : '—'] : []); }));
      $('capKIncome').innerHTML = bi('Participación en el ingreso personal' + (isPi ? '' : ' disponible') + ', hogares ordenados por su ingreso ajustado por tamaño del hogar, ' + I.years[0] + '–' + K.income.asOf + '; el último año es provisional. Eje izquierdo: el 10% de mayor ingreso y el siguiente 40%; eje derecho: el 50% de menor ingreso. Ninguno de los dos ejes empieza en cero.', 'Share of ' + (isPi ? '' : 'disposable ') + 'personal income, households ranked by income adjusted for household size, ' + I.years[0] + '–' + K.income.asOf + '; the latest year is provisional. Left axis: the top 10% by income and the next 40%; right axis: the bottom 50%. Neither axis starts at zero.');
    }
    // who owns the stock market, and who captured the gain in wealth (DFA)
    if (K.wealth) {
      var W = K.wealth, qy = W.quarters.map(function (q) { return q.slice(0, 4); });
      var eset = [{ label: tr('10% más rico', 'Wealthiest 10%'), data: W.eqTop10, color: CT }, { label: tr('1% más rico', 'Wealthiest 1%'), data: W.eqTop1, color: S(3) }, { label: tr('50% inferior', 'Bottom 50%'), data: W.eqBottom50, color: CB }];
      UI.line('chKEquity', { labels: qy, datasets: eset, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0, max: 100 });
      UI.charts.chKEquity.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(W.quarters[it[0].dataIndex]); }; UI.charts.chKEquity.update();
      UI.legend('chKEquity', eset.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      var pq = W.quarters.filter(function (q, i) { return (/-Q4$/.test(q) && Number(q.slice(0, 4)) % 5 === 4) || i === 0 || i === W.quarters.length - 1; }).reverse();
      UI.table('chKEquity', [tr('Trimestre', 'Quarter')].concat(eset.map(function (x) { return x.label; })).concat([tr('Riqueza neta del 10% más rico', 'Net worth of the wealthiest 10%')]), pq.map(function (q) { var i = W.quarters.indexOf(q); return [UI.date(q)].concat(eset.map(function (x) { return UI.pct(x.data[i]); })).concat([UI.pct(W.nwTop10[i])]); }));
      if (W.groups) {
        var G = W.groups, gt = sum(G.map(function (g) { return g.gain; })), gcol = { top1: S(1), next9: S(3), next40: S(2), bottom50: S(7) }, gn = function (g) { return tr(KG[g.k][0], KG[g.k][1]); };
        UI.bar('chKGain', { horizontal: true, labels: G.map(gn), data: G.map(function (g) { return g.gain / 1000; }), colors: G.map(function (g) { return gcol[g.k]; }), fmt: function (v, i) { return UI.money(v * 1000) + (i != null ? ' · ' + UI.pct(G[i].gain / gt * 100, 0) + tr(' del aumento', ' of the gain') : ''); }, axisFmt: function (v) { return '$' + v; },
          valueLabels: function (v, i) { return '$' + UI.nf(v, 1) + (G[i].real != null ? ' · ' + UI.signed(G[i].real, 0) + tr(' real', ' real') : ''); }, thickness: 26 });
        UI.table('chKGain', [tr('Grupo de riqueza', 'Wealth group'), UI.date(W.base), UI.date(W.asOf), tr('Aumento', 'Gain'), tr('% del aumento', '% of the gain'), tr('Variación nominal', 'Nominal change'), tr('Variación real', 'Real change'), tr('Por hogar, ', 'Per household, ') + UI.date(W.base), tr('Por hogar, ', 'Per household, ') + UI.date(W.asOf)],
          G.map(function (g) { return [gn(g), UI.money(g.nw0), UI.money(g.nw1), UI.money(g.gain), UI.pct(g.gain / gt * 100, 0), UI.signed(g.nominal), g.real == null ? '—' : UI.signed(g.real), g.perHh0 == null ? '—' : UI.usd(g.perHh0), g.perHh1 == null ? '—' : UI.usd(g.perHh1)]; }));
        $('capKGain').innerHTML = bi('Aumento de la riqueza neta entre el ' + UI.date(W.base) + ' y el ' + UI.date(W.asOf) + ' por grupo de riqueza, billones de dólares corrientes; junto a cada barra, la variación descontada el alza de precios del consumo' + (W.prices != null ? ' (' + UI.signed(W.prices) + ')' : '') + ' ' + UI.kind('C'),
          'Gain in net worth between ' + UI.date(W.base) + ' and ' + UI.date(W.asOf) + ' by wealth group, trillions of current dollars; beside each bar, the change net of the rise in consumer prices' + (W.prices != null ? ' (' + UI.signed(W.prices) + ')' : '') + ' ' + UI.kind('C'));
      }
    }
    // spending growth by decile (BLS survey, constant prices)
    if (K.spendGrowth) {
      var SG = K.spendGrowth, real = SG.deciles[0].real != null, val = function (d) { return real ? d.real : d.nominal; };
      UI.bar('chKSpendGrowth', { labels: SG.deciles.map(function (d) { return 'D' + d.d; }), data: SG.deciles.map(val), color: CT, fmt: function (v, i) { return UI.signed(v) + (i != null ? tr(' · nominal ', ' · nominal ') + UI.signed(SG.deciles[i].nominal) + ' · ' + UI.usd(SG.deciles[i].usd0) + ' → ' + UI.usd(SG.deciles[i].usd1) : ''); }, axisFmt: function (v) { return v + '%'; }, valueLabels: function (v) { return UI.signed(v, 0); }, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1); } });
      UI.table('chKSpendGrowth', [tr('Decil', 'Decile'), String(SG.from), String(SG.to), tr('Variación nominal', 'Nominal change'), tr('Variación real', 'Real change')], SG.deciles.map(function (d) { return [tr('Decil ', 'Decile ') + d.d, UI.usd(d.usd0), UI.usd(d.usd1), UI.signed(d.nominal), d.real == null ? '—' : UI.signed(d.real)]; }).concat([[tr('Todos', 'All'), '', '', UI.signed(SG.all.nominal), SG.all.real == null ? '—' : UI.signed(SG.all.real)]]));
      $('capKSpendGrowth').innerHTML = bi('Variación del gasto anual promedio por hogar entre ' + SG.from + ' y ' + SG.to + (real ? ', descontada el alza de precios del consumo (' + UI.signed(SG.prices) + ')' : ', dólares corrientes') + ', por decil de ingreso; todos los hogares: ' + UI.signed(real ? SG.all.real : SG.all.nominal) + '. Encuesta de la BLS. ' + UI.kind('C'),
        'Change in average annual spending per household between ' + SG.from + ' and ' + SG.to + (real ? ', net of the rise in consumer prices (' + UI.signed(SG.prices) + ')' : ', current dollars') + ', by income decile; all households: ' + UI.signed(real ? SG.all.real : SG.all.nominal) + '. BLS survey. ' + UI.kind('C'));
    }
    // who saves: BEA and BLS joint distribution, households ranked by income (national-accounts income, outlays and saving)
    var BI = K.byIncome, svC = $('kSavingCard');
    if (svC) {
      if (BI && BI.saving && BI.saving.deciles && BI.saving.deciles.length === 10) {
        var SV = BI.saving, dl = SV.deciles.map(function (_, i) { return 'D' + (i + 1); }), neg = SV.deciles.filter(function (v) { return v < 0; }).length;
        UI.bar('chKSaving', { labels: dl, data: SV.deciles, colors: SV.deciles.map(function (v) { return v < 0 ? CM : CT; }), fmt: function (v, i) { return UI.signed(v) + (i != null ? tr(' del ingreso disponible · ', ' of disposable income · ') + UI.pct(BI.latest.dpi[i]) + tr(' del ingreso y ', ' of income and ') + UI.pct(BI.latest.pce[i]) + tr(' del consumo', ' of consumption') : ''); }, axisFmt: function (v) { return v + '%'; }, valueLabels: function (v) { return UI.signed(v, 0); }, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1) + tr(' por ingreso', ' by income'); } });
        UI.legend('chKSaving', [{ c: CM, l: tr('Gasta más que su ingreso disponible', 'Spends more than its disposable income') }, { c: CT, l: tr('Ahorra', 'Saves') }]);
        UI.table('chKSaving', [tr('Decil de ingreso', 'Income decile'), tr('Tasa de ahorro, ', 'Saving rate, ') + SV.year, tr('% del ingreso disponible', '% of disposable income'), tr('% del consumo', '% of consumption')],
          SV.deciles.map(function (v, i) { return [tr('Decil ', 'Decile ') + (i + 1), UI.signed(v), UI.pct(BI.latest.dpi[i]), UI.pct(BI.latest.pce[i])]; }).concat(SV.top5 != null ? [[tr('5% superior', 'Top 5%'), UI.signed(SV.top5), '', '']] : []).concat(SV.top1 != null ? [[tr('1% superior', 'Top 1%'), UI.signed(SV.top1), BI.latest.dpiTop1 != null ? UI.pct(BI.latest.dpiTop1) : '', BI.latest.pceTop1 != null ? UI.pct(BI.latest.pceTop1) : '']] : []));
        var y0 = SV.years[0], t0 = SV.top10[0], t1 = last(SV.top10), i19s = SV.years.indexOf(2019);
        $('capKSaving').innerHTML = bi('Ahorro personal como porcentaje del ingreso disponible de cada décima parte de los hogares, ordenados por ingreso; cuentas nacionales repartidas por la BEA y la BLS, ' + SV.year + '. Tasa negativa: el grupo gasta más de lo que recibe (retira ahorros, se endeuda o lo ayudan otros hogares). <b>' + neg + ' de los 10 deciles</b> gastan más que su ingreso; el 10% de mayor ingreso ahorra el <b>' + UI.pct(t1) + '</b>' + (i19s >= 0 ? ' (' + UI.pct(SV.top10[i19s]) + ' en 2019)' : '') + (SV.top1 != null ? ' y el 1% superior, el ' + UI.pct(SV.top1) : '') + '. Ese decil recibe el ' + UI.pct(last(BI.dpiTop10)) + ' del ingreso disponible y hace el ' + UI.pct(last(BI.pceTop10)) + ' del consumo. ' + UI.kind('R'),
          'Personal saving as a percent of the disposable income of each tenth of households, ranked by income; national accounts distributed by BEA and BLS, ' + SV.year + '. A negative rate: the group spends more than it receives (it draws down savings, borrows or is helped by other households). <b>' + neg + ' of the 10 deciles</b> spend more than their income; the top 10% by income save <b>' + UI.pct(t1) + '</b>' + (i19s >= 0 ? ' (' + UI.pct(SV.top10[i19s]) + ' in 2019)' : '') + (SV.top1 != null ? ' and the top 1%, ' + UI.pct(SV.top1) : '') + '. That decile receives ' + UI.pct(last(BI.dpiTop10)) + ' of disposable income and does ' + UI.pct(last(BI.pceTop10)) + ' of consumption. ' + UI.kind('R'));
      } else svC.hidden = true;
    }
    // inflation by spending decile (BLS distribution of consumption, table of price indexes): average yearly rates
    var PR = K.prices, prC = $('kPricesCard');
    if (prC) {
      if (PR && PR.since2019 && PR.since2000 && PR.since2019.deciles.length === 10) {
        var yA = Number(PR.asOf), nA = PR.base - PR.from, nB = yA - PR.base, ann = function (c, n) { return (Math.pow(1 + c / 100, 1 / n) - 1) * 100; };
        var early = PR.since2000.deciles.map(function (v, i) { return ann(((1 + v / 100) / (1 + PR.since2019.deciles[i] / 100) - 1) * 100, nA); }), late = PR.since2019.deciles.map(function (v) { return ann(v, nB); });
        var earlyAll = ann(((1 + PR.since2000.all / 100) / (1 + PR.since2019.all / 100) - 1) * 100, nA), lateAll = ann(PR.since2019.all, nB);
        var pl = PR.since2019.deciles.map(function (_, i) { return 'D' + (i + 1); }), pSets = [{ label: PR.from + '–' + PR.base, data: early, color: UI.css('--neutral-mark') }, { label: PR.base + '–' + yA, data: late, color: CT }];
        UI.bar('chKPrices', { labels: pl, datasets: pSets, fmt: function (v) { return UI.pct(v, 2) + tr(' al año', ' a year'); }, axisFmt: function (v) { return v + '%'; }, thickness: 14, tipTitle: function (i) { return tr('Decil ', 'Decile ') + (i + 1) + tr(' por gasto', ' by spending'); } });
        UI.legend('chKPrices', pSets.map(function (x) { return { c: x.color, l: x.label }; }));
        UI.table('chKPrices', [tr('Decil de gasto', 'Spending decile'), tr('Inflación anual promedio, ', 'Average yearly inflation, ') + PR.from + '–' + PR.base, PR.base + '–' + yA, tr('Alza acumulada, ', 'Cumulative rise, ') + PR.base + '–' + yA, PR.from + '–' + yA],
          pl.map(function (l, i) { return [tr('Decil ', 'Decile ') + (i + 1), UI.pct(early[i], 2), UI.pct(late[i], 2), UI.signed(PR.since2019.deciles[i]), UI.signed(PR.since2000.deciles[i])]; }).concat([[tr('Todos los hogares', 'All households'), UI.pct(earlyAll, 2), UI.pct(lateAll, 2), UI.signed(PR.since2019.all), UI.signed(PR.since2000.all)]]));
        var hiL = Math.max.apply(null, late), loL = Math.min.apply(null, late), d1 = PR.since2000.deciles[0], d9 = Math.min.apply(null, PR.since2000.deciles);
        $('capKPrices').innerHTML = bi('Alza promedio anual de los precios de lo que compra cada décima parte de los hogares, ordenados por su gasto (decil 1: los que menos gastan); índice de precios del consumo de cuentas nacionales, BLS. <b>Desde ' + PR.base + ' casi no hay diferencia:</b> entre ' + UI.pct(loL, 2) + ' y ' + UI.pct(hiL, 2) + ' al año en los diez deciles (acumulado: ' + UI.signed(PR.since2019.deciles[0]) + ' el decil 1, ' + UI.signed(PR.since2019.deciles[9]) + ' el decil 10). <b>Desde ' + PR.from + ' sí:</b> los precios del decil 1 subieron ' + UI.signed(d1) + ' y los del decil con menor alza, ' + UI.signed(d9) + '. ' + UI.kind('C'),
          'Average yearly rise in the prices of what each tenth of households buys, ranked by their spending (decile 1: the lowest spenders); price index of national-accounts consumption, BLS. <b>Since ' + PR.base + ' there is almost no difference:</b> between ' + UI.pct(loL, 2) + ' and ' + UI.pct(hiL, 2) + ' a year across the ten deciles (cumulative: ' + UI.signed(PR.since2019.deciles[0]) + ' for decile 1, ' + UI.signed(PR.since2019.deciles[9]) + ' for decile 10). <b>Since ' + PR.from + ' there is:</b> prices for decile 1 rose ' + UI.signed(d1) + ' and for the decile with the smallest rise, ' + UI.signed(d9) + '. ' + UI.kind('C'));
      } else prC.hidden = true;
    }
    // wages by quartile (Atlanta Fed)
    if (K.wages) {
      var G2 = K.wages, i0 = Math.max(0, G2.months.indexOf('2010-01')), mo = G2.months.slice(i0);
      var wset = [{ label: tr('Cuarto peor pagado', 'Lowest-paid quarter'), data: G2.q1.slice(i0), color: CB }, { label: tr('Cuarto mejor pagado', 'Highest-paid quarter'), data: G2.q4.slice(i0), color: CT }];
      UI.line('chKWages', { labels: mo.map(function (m) { return m.slice(0, 4); }), datasets: wset, fmt: function (v) { return UI.pct(v); }, axisFmt: function (v) { return v + '%'; }, min: 0 });
      UI.charts.chKWages.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(mo[it[0].dataIndex]); }; UI.charts.chKWages.update();
      UI.legend('chKWages', wset.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      UI.table('chKWages', [tr('Mes', 'Month'), tr('Cuartil 1 (menor salario)', 'Quartile 1 (lowest pay)'), tr('Cuartil 2', 'Quartile 2'), tr('Cuartil 3', 'Quartile 3'), tr('Cuartil 4 (mayor salario)', 'Quartile 4 (highest pay)')], G2.months.slice(-12).reverse().map(function (m) { var i = G2.months.indexOf(m); return [UI.date(m), UI.pct(G2.q1[i]), UI.pct(G2.q2[i]), UI.pct(G2.q3[i]), UI.pct(G2.q4[i])]; }));
    }
    // sentiment by income tercile (Michigan)
    if (K.sentiment) {
      var Sx = K.sentiment, j0 = Math.max(0, Sx.months.indexOf('2015-01')), ms = Sx.months.slice(j0), sm = function (a) { return ma3(a).slice(j0); };
      var sset = [{ label: tr('Tercio de mayor ingreso', 'Upper income third'), data: sm(Sx.upper), color: CT }, { label: tr('Tercio medio', 'Middle third'), data: sm(Sx.middle), color: CM }, { label: tr('Tercio de menor ingreso', 'Lower income third'), data: sm(Sx.lower), color: CB }];
      UI.line('chKSent', { labels: ms.map(function (m) { return m.slice(0, 4); }), datasets: sset, fmt: function (v) { return UI.nf(v, 1); }, min: 0 });
      UI.charts.chKSent.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(ms[it[0].dataIndex]); }; UI.charts.chKSent.update();
      UI.legend('chKSent', sset.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
      UI.table('chKSent', [tr('Mes', 'Month'), tr('Tercio inferior', 'Lower third'), tr('Tercio medio', 'Middle third'), tr('Tercio superior', 'Upper third'), tr('Brecha (superior − inferior)', 'Gap (upper − lower)')], Sx.months.slice(-12).reverse().map(function (m) { var i = Sx.months.indexOf(m); return [UI.date(m), UI.nf(Sx.lower[i], 1), UI.nf(Sx.middle[i], 1), UI.nf(Sx.upper[i], 1), UI.nf(Sx.upper[i] - Sx.lower[i], 1)]; }));
    }
    // estimates published by others (curated, dated, linked)
    var ec = $('kEstimatesCard');
    if (K.estimates && K.estimates.list.length) {
      ec.hidden = false;
      $('capKEstimates').innerHTML = bi('Cifras publicadas por otros, con su periodo, fecha y enlace; cada una dice quién la produjo. No se mezclan con las series de esta página. Las tachadas fueron revisadas después por quien las publicó. Última revisión: <span class="data-through">' + UI.date(K.estimates.reviewed) + '</span>.',
        'Figures published by others, with their period, date and link; each says who produced it. They are not mixed with this page\'s series. Those struck through were later revised by their publisher. Last reviewed: <span class="data-through">' + UI.date(K.estimates.reviewed) + '</span>.');
      var head = [tr('Qué mide', 'What it measures'), tr('Cifra', 'Figure'), tr('Periodo', 'Period'), tr('Quién y dónde', 'Who and where')];
      $('kEstimates').innerHTML = '<colgroup><col style="width:38%"><col style="width:13%"><col style="width:15%"><col style="width:34%"></colgroup><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        K.estimates.list.map(function (e) { return '<tr><td><span class="tk">' + tr(e.label.es, e.label.en) + '</span>' + (e.note ? '<span class="sub">' + tr(e.note.es, e.note.en) + '</span>' : '') + '</td><td class="fig' + (e.superseded ? ' old' : '') + '" data-l="' + head[1] + '">' + estVal(e) + '</td><td data-l="' + head[2] + '">' + tr(e.period.es, e.period.en) + '</td><td class="txt" data-l="' + head[3] + '">' + extBadge(e.kind) + ' <b>' + esc(e.publisher) + '</b>' + (e.via ? ', ' + tr(e.via.es, e.via.en) : '') + '<span class="xt"><a class="srcl" href="' + esc(e.url) + '" target="_blank" rel="noopener">' + tr('Fuente ↗', 'Source ↗') + '</a> · ' + UI.date(e.published) + '</span></td></tr>'; }).join('') + '</tbody>';
      $('kQuotes').innerHTML = (K.estimates.quotes || []).map(function (q) { return '<div class="kquote"><q lang="en">' + esc(q.text) + '</q><span class="by">' + esc(q.by) + ', ' + tr(q.role.es, q.role.en) + ' · <a class="srcl" href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.source) + ' ↗</a> · ' + UI.date(q.date) + '</span></div>'; }).join('');
    } else ec.hidden = true;
  }

  // =====================================================================================================================
  // 10 Companies
  // =====================================================================================================================
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; }
  function companySummary() {
    if (!CO || !CO.companies.length) return null;
    var comps = CO.companies.filter(function (c) { return c.comp; }), pos = comps.filter(function (c) { return c.comp.v > 0; }).length;
    var tr2 = CO.companies.filter(function (c) { return c.traffic; }), trNeg = tr2.filter(function (c) { return c.traffic.v < 0; }).length + CO.companies.filter(function (c) { return !c.traffic && c.trafficSign < 0; }).length, trN = tr2.length + CO.companies.filter(function (c) { return !c.traffic && c.trafficSign; }).length;
    var L = CO.companies.filter(function (c) { return c.nco; }), better = L.filter(function (c) { return c.nco.prev != null && c.nco.v < c.nco.prev; }).length;
    var gm = function (g) { var a = comps.filter(function (c) { return c.group === g; }).map(function (c) { return c.comp.v; }); return a.length ? median(a) : null; };
    var mass = gm('mass'), val = gm('value'), home = gm('home'), gro = gm('grocery'), rest = gm('restaurants');
    var GF = gigFacts(), gEs = '', gEn = '';
    if (GF.total != null) {
      gEs = ' Trabajo por encargo en Estados Unidos: ' + UI.nf(GF.total / 1e6, 2) + ' millones de conductores y repartidores por cuenta propia en ' + GF.y + ' (Oficina del Censo)' + (GF.rev.length ? '; los ingresos de ' + GF.rev.map(function (x) { return esc(x.c.name) + ' en ' + (x.u.scope === 'us' ? 'el país' : 'Estados Unidos y Canadá') + ' crecieron ' + UI.signed(x.u.yoy, 0); }).join(' y los de ') + ' en el ' + GF.rev[0].u.period.es : '') + '.';
      gEn = ' Gig work in the United States: ' + UI.nf(GF.total / 1e6, 2) + ' million self-employed drivers and couriers in ' + GF.y + ' (Census Bureau)' + (GF.rev.length ? '; revenue of ' + GF.rev.map(function (x) { return esc(x.c.name) + ' in ' + (x.u.scope === 'us' ? 'the country' : 'the United States and Canada') + ' grew ' + UI.signed(x.u.yoy, 0); }).join(' and that of ') + ' in ' + GF.rev[0].u.period.en : '') + '.';
    }
    var SL2 = coGroup('stress'), sEs = '', sEn = '';
    if (SL2.length) { var x = stressLines(SL2); if (x.nco.length || x.pawn.length) {
      sEs = ' Prestamistas de clientes con poco margen:' + (x.nco.length ? ' castigos netos de ' + x.nco.join(' y ') : '') + (x.pawn.length ? (x.nco.length ? ';' : '') + ' préstamos prendarios en Estados Unidos, ' + x.pawn.join(' y ') + ' anual' : '') + '.';
      sEn = ' Lenders to stretched borrowers:' + (x.nco.length ? ' net charge-offs of ' + x.nco.join(' and ') : '') + (x.pawn.length ? (x.nco.length ? ';' : '') + ' pawn loans in the United States, ' + x.pawn.join(' and ') + ' from a year earlier' : '') + '.'; } }
    return bi(
      'En sus últimos resultados, <b>' + pos + ' de ' + comps.length + '</b> minoristas y restaurantes reportaron ventas comparables positivas' + (trN ? '; el tráfico bajó en ' + trNeg + ' de los ' + trN + ' que lo reportan' : '') + '. Mediana por grupo: comercio masivo ' + UI.signed(mass) + ', descuento ' + UI.signed(val) + ', restaurantes ' + UI.signed(rest) + ', supermercados ' + UI.signed(gro) + ', mejoras para el hogar ' + UI.signed(home) + '.' + (L.length ? ' En tarjetas, la tasa de castigos bajó frente al año anterior en <b>' + better + ' de ' + L.length + '</b> emisores.' : '') + sEs + gEs,
      'In their latest results, <b>' + pos + ' of ' + comps.length + '</b> retailers and restaurants reported positive comparable sales' + (trN ? '; traffic fell at ' + trNeg + ' of the ' + trN + ' that report it' : '') + '. Median by group: mass retail ' + UI.signed(mass) + ', value ' + UI.signed(val) + ', restaurants ' + UI.signed(rest) + ', grocery ' + UI.signed(gro) + ', home improvement ' + UI.signed(home) + '.' + (L.length ? ' On cards, the charge-off rate fell from a year earlier at <b>' + better + ' of ' + L.length + '</b> lenders.' : '') + sEn + gEn);
  }
  // ---------- gig work, United States only (owner, 11-Oct-2026) ----------
  // The official count is the Census Bureau's Nonemployer Statistics; the platforms publish trips and orders for the whole
  // world, so the table shows what each one reports for the United States (or the narrowest geography that contains it)
  // and keeps the worldwide activity in its own, labeled column.
  function gigList() { return CO ? CO.companies.filter(function (c) { return c.group === 'gig'; }) : []; }
  function gigFacts() {
    var G = D.gigUS, f = {};
    if (G) {
      var n = G.years.length - 1, at = function (y) { return G.years.indexOf(y); }, i19 = at(2019);
      f.y = G.years[n]; f.y0 = G.years[0]; f.total = G.total[n]; f.total0 = G.total[0]; f.rcp = G.totalRcp[n]; f.avg = G.totalAvg[n];
      f.taxi = G.taxi[n]; f.courier = G.courier[n]; f.taxi0 = G.taxi[0]; f.courier0 = G.courier[0];
      f.taxiAvg = G.taxiAvg[n]; f.courierAvg = G.courierAvg[n]; f.taxiAvg0 = G.taxiAvg[0]; f.courierAvg0 = G.courierAvg[0];
      if (i19 >= 0 && i19 < n) { f.since19 = (G.total[n] / G.total[i19] - 1) * 100; f.total19 = G.total[i19]; }
      // first year in which couriers outnumbered drivers, if any
      for (var i = 0; i <= n; i++) if (G.courier[i] > G.taxi[i]) { f.crossed = G.years[i]; break; }
    }
    var L = gigList(), pick = function (t, key) { var c = L.filter(function (x) { return x.ticker === t; })[0]; return c && c.us ? c.us.filter(function (u) { return u.key === key; })[0] || null : null; };
    f.dashers = pick('DASH', 'workers'); f.dasherPay = pick('DASH', 'workerPay'); f.weeks = pick('DASH', 'weeks');
    // revenue in the United States, latest quarter each company reports (scope `us` first, then United States and Canada)
    f.rev = L.map(function (c) { var q = (c.us || []).filter(function (u) { return u.unit === 'usdM' && u.yoy != null && /revenue/i.test(u.label.en) && /Q\d/.test(u.period.en); }).sort(function (a, b) { return (a.scope === 'us' ? 0 : 1) - (b.scope === 'us' ? 0 : 1); })[0]; return q ? { c: c, u: q } : null; }).filter(Boolean);
    return f;
  }
  var gq = function (m) { return m.q === 'over' ? tr('más de ', 'more than ') : m.q === 'approx' ? tr('cerca de ', 'about ') : m.q === 'nearly' ? tr('casi ', 'nearly ') : ''; };
  var gval = function (m) {   // a figure of a platform, in the unit its report gives
    var d = m.dp || 0;
    if (m.unit === 'usdK') return gq(m) + (m.v < 1e6 ? '$' + UI.nf(m.v / 1000, 1) + tr(' millones', ' million') : UI.money(m.v / 1e6, 2));   // tables in thousands of dollars
    if (m.unit === 'K') return gq(m) + UI.nf(m.v / 1000, 1) + tr(' millones', ' million');   // tables in thousands
    return gq(m) + (m.unit === 'usdM' ? (m.v < 1000 ? '$' + UI.nf(m.v, d) + tr(' millones', ' million') : UI.money(m.v / 1000, m.v >= 10000 ? 1 : 2)) : m.unit === 'usdB' ? '$' + UI.nf(m.v, d) + tr(' mil millones', ' billion') : m.unit === 'M' ? UI.nf(m.v, d) + tr(' millones', ' million') : m.unit === 'weeks' ? UI.nf(m.v, d) + tr(' semanas', ' weeks') : m.unit === 'hours' ? UI.nf(m.v, d) + tr(' horas', ' hours') : UI.nf(m.v, d));
  };
  var scopeName = function (sc) { return sc === 'us' ? tr('Estados Unidos', 'United States') : tr('EE. UU. y Canadá', 'U.S. and Canada'); };
  // ---------- one figure of a company, as its report gives it: value, change, label, period, share of a total, source ----------
  var figUp = function (m) {
    if (m.unit === 'growth') return '';
    if (m.chgBps != null) return ' <span class="chg">' + (m.chgBps > 0 ? '+' : '−') + UI.nf(Math.abs(m.chgBps)) + tr(' pb', ' bps') + '</span>';
    if (m.unit === 'pct' && m.prev != null) return ' <span class="chg">' + tr('frente a ', 'vs ') + UI.pct(m.prev, m.dp == null ? 1 : m.dp) + '</span>';
    if (m.unit === 'x' && m.prev != null) return ' <span class="chg">' + tr('frente a ', 'vs ') + UI.nf(m.prev, 1) + '×</span>';
    // (a change in losses or provisions is printed without the green / red of growth: less is the good direction there)
    return m.yoy == null ? '' : ' <span class="' + (m.key === 'loss' ? 'chg' : m.yoy > 0 ? 'up' : m.yoy < 0 ? 'down' : '') + '">' + UI.signed(m.yoy, m.yoyCalc ? 1 : (Math.round(m.yoy) === m.yoy ? 0 : 1)) + (m.yoyCalc ? '†' : '') + '</span>';
  };
  var figVal = function (m) {
    var d = m.dp || 0;
    return m.unit === 'pct' ? UI.pct(m.v, m.dp == null ? 1 : m.dp) : m.unit === 'growth' ? '<span class="' + (m.v > 0 ? 'up' : m.v < 0 ? 'down' : '') + '">' + UI.signed(m.v, d) + '</span>' : m.unit === 'x' ? UI.nf(m.v, 1) + '×' : m.unit === 'usd' ? UI.usd(m.v) : gval(m);
  };
  var docName = function (m) { return m.form === '10-K' ? tr('Informe anual', 'Annual report') : m.form === '10-Q' ? tr('Informe trimestral', 'Quarterly report') : m.form === 'page' ? tr('Informe de la empresa', 'Company report') : tr('Comunicado', 'Release'); };
  var figLink = function (m) { return '<a class="srcl" href="' + esc(m.src) + '" target="_blank" rel="noopener">' + docName(m) + ' ↗</a>'; };
  var fig = function (u) {
    var share = u.of ? ' · ' + UI.pct(u.v / u.of * 100, u.ofLabel ? 2 : 0) + ' ' + (u.ofLabel ? tr(u.ofLabel.es, u.ofLabel.en) : tr('del total de la empresa', 'of the company total')) : '';
    var prevNote = u.prevPeriod ? ' (' + tr(u.prevPeriod.es, u.prevPeriod.en) + ')' : u.unit === 'pct' && u.prev != null && u.chgBps == null ? tr(' (un año antes)', ' (a year earlier)') : '';
    return '<span class="usm"><b>' + figVal(u) + '</b>' + figUp(u) + (prevNote ? '<span class="chg">' + prevNote + '</span>' : '') + '<span class="sub">' + tr(u.label.es, u.label.en) + ' · ' + tr(u.period.es, u.period.en) + share + ' · ' + figLink(u) + '</span></span>';
  };
  var coFirstCell = function (c) { return '<td><span class="tk">' + esc(c.name) + '</span> <span class="nd">' + c.ticker + '</span><span class="per">' + tr(c.period.es, c.period.en) + ' · ' + UI.date(c.periodEnd) + '</span>' + (c.newerFiling ? '<span class="new">' + tr('reporte más reciente por revisar', 'newer report to review') + '</span>' : '') + '</td>'; };
  var coTxtCell = function (c, label) { return '<td class="txt" data-l="' + label + '"><b>' + tr(c.segment.es, c.segment.en) + '.</b>' +
    (c.quote ? '<span class="xt"><q lang="en">' + esc(c.quote.text) + '</q><span class="by">' + (c.quote.by ? esc(c.quote.by) + ', ' : '') + tr(c.quote.role.es, c.quote.role.en) + '</span></span>' : '') + '<span class="xt"><a class="srcl" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + tr('Comunicado ↗', 'Release ↗') + '</a> · ' + tr('presentado el ', 'filed ') + UI.date(c.filed) + '</span></td>'; };
  var usCellOf = function (c) {
    var scopes = (c.us || []).map(function (u) { return u.scope; }), sc = scopes.indexOf('us') >= 0 ? 'us' : scopes.length ? 'usca' : null;
    return sc ? '<span class="scope' + (sc === 'us' ? ' us' : '') + '">' + scopeName(sc) + '</span>' + c.us.map(fig).join('') : '<span class="nd">' + tr('n. d.', 'n/a') + '</span>' + (c.usNote ? '<span class="sub">' + tr(c.usNote.es, c.usNote.en) + '</span>' : '<span class="sub">' + tr('La empresa no da cifras de Estados Unidos por separado', 'The company gives no United States figure separately') + '</span>');
  };
  var coList = function (a) { return a.length > 1 ? a.slice(0, -1).join(', ') + tr(' y ', ' and ') + a[a.length - 1] : a[0] || ''; };
  var coGroup = function (id) { return CO ? CO.companies.filter(function (c) { return c.group === id; }) : []; };
  var figOf = function (c, key, lists) { var out = null; (lists || ['us', 'world']).forEach(function (l) { (c[l] || []).forEach(function (u) { if (!out && u.key === key) out = u; }); }); return out; };
  // buy now, pay later: what each lender reports, the United States apart from the whole company
  function bnplTable() {
    var L = coGroup('bnpl'); if (!L.length) return '';
    var head = [tr('Empresa', 'Company'), tr('Estados Unidos: lo que la empresa informa', 'United States: what the company reports'), tr('Toda la empresa (no es solo Estados Unidos)', 'Whole company (not the United States alone)'), tr('Alcance, cita y fuente', 'Scope, quote and source')];
    var withUS = L.filter(function (c) { return (c.us || []).some(function (u) { return u.scope === 'us'; }); }).map(function (c) { return esc(c.name); });
    // (a lender whose latest readable report is its fiscal year says so beside its growth)
    var volP = L.map(function (c) { var u = figOf(c, 'volume'); return u && u.yoy != null ? u.period.en : null; }).filter(Boolean), volMain = volP.slice().sort(function (x, y) { return volP.filter(function (z) { return z === y; }).length - volP.filter(function (z) { return z === x; }).length; })[0];
    var vol = L.map(function (c) { var u = figOf(c, 'volume'); return u && u.yoy != null ? esc(c.name) + ' ' + UI.signed(u.yoy, 0) + (u.scope === 'us' ? tr(' en Estados Unidos', ' in the United States') : '') + (u.period.en !== volMain ? ' (' + tr(u.period.es, u.period.en) + ')' : '') : null; }).filter(Boolean);
    var cap = bi('Volumen de compras financiadas, consumidores y pérdidas crediticias que informa cada prestamista de "compra ahora, paga después" en sus resultados.' + (withUS.length ? ' Solo ' + coList(withUS) + (withUS.length > 1 ? ' dan' : ' da') + ' cifras de Estados Unidos por separado.' : '') + (vol.length ? ' Crecimiento anual del volumen: ' + vol.join('; ') + '.' : '') + ' Estos préstamos casi no aparecen en los burós de crédito, así que las cifras de deuda de los hogares de esta página no los incluyen. ' + UI.kind('R'),
      'Financed purchase volume, consumers and credit losses that each buy now, pay later lender reports in its results.' + (withUS.length ? ' Only ' + coList(withUS) + (withUS.length > 1 ? ' give' : ' gives') + ' United States figures separately.' : '') + (vol.length ? ' Volume growth from a year earlier: ' + vol.join('; ') + '.' : '') + ' These loans are mostly absent from credit bureau files, so the household debt figures on this page do not include them. ' + UI.kind('R'));
    var rows = L.map(function (c) { return '<tr>' + coFirstCell(c) + '<td data-l="' + head[1] + '">' + usCellOf(c) + '</td><td data-l="' + head[2] + '">' + ((c.world || []).length ? c.world.map(fig).join('') : '<span class="sub">' + tr('Sin cifras adicionales.', 'No further figures.') + '</span>') + '</td>' + coTxtCell(c, head[3]) + '</tr>'; });
    return '<div class="card full co-group" id="bnplCard"><h3>' + tr('Compra Ahora, Paga Después: lo que Reportan los Prestamistas', 'Buy Now, Pay Later: What the Lenders Report') + '</h3><p class="cap">' + cap + '</p><div class="tblwrap"><table class="co-table gig"><colgroup>' + [13, 30, 29, 28].map(function (w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="chart-src">' + tr('La variación es frente al mismo periodo del año anterior. † = la calculó FNAM con las dos cifras del informe. n. d. = la empresa no lo informa. Las citas se muestran en su idioma original.', 'The change is against the same period a year earlier. † = FNAM computed it from the two figures in the report. n/a = the company does not report it.') + '</p></div>';
  }
  // lenders to stretched borrowers: subprime auto, personal installment loans, pawn
  function stressLines(L) {
    return { pawn: L.map(function (c) { var u = figOf(c, 'pawn'); return u ? esc(c.name) + ' ' + UI.signed(u.unit === 'growth' ? u.v : u.yoy, 0) : null; }).filter(Boolean),
      nco: L.map(function (c) { var u = figOf(c, 'nco'); return u ? esc(c.name) + ' ' + UI.pct(u.v, u.dp == null ? 2 : u.dp) + (u.chgBps != null ? ' (' + (u.chgBps > 0 ? '+' : '−') + Math.abs(u.chgBps) + tr(' pb', ' bps') + ')' : u.prev != null ? ' (' + UI.pct(u.prev, u.dp == null ? 2 : u.dp) + tr(' un año antes', ' a year earlier') + ')' : '') : null; }).filter(Boolean) };
  }
  function stressTable() {
    var L = coGroup('stress'); if (!L.length) return '';
    var head = [tr('Empresa', 'Company'), tr('Crédito y demanda en Estados Unidos', 'Credit and demand in the United States'), tr('Alcance, cita y fuente', 'Scope, quote and source')];
    var sl = stressLines(L), pawn = sl.pawn, nco = sl.nco;
    var cap = bi('Prestamistas cuyos clientes tienen poco margen: crédito automotriz de alto riesgo, préstamos personales a plazos y casas de empeño.' + (nco.length ? ' Castigos netos: ' + nco.join('; ') + '.' : '') + (pawn.length ? ' Préstamos prendarios vigentes en Estados Unidos, variación anual: ' + pawn.join('; ') + '.' : '') + ' ' + UI.kind('R'),
      'Lenders whose customers have little room: subprime auto loans, personal installment loans and pawn.' + (nco.length ? ' Net charge-offs: ' + nco.join('; ') + '.' : '') + (pawn.length ? ' Pawn loans outstanding in the United States, change from a year earlier: ' + pawn.join('; ') + '.' : '') + ' ' + UI.kind('R'));
    var rows = L.map(function (c) { return '<tr>' + coFirstCell(c) + '<td data-l="' + head[1] + '">' + (c.us || []).map(fig).join('') + ((c.world || []).length ? c.world.map(fig).join('') : '') + '</td>' + coTxtCell(c, head[2]) + '</tr>'; });
    return '<div class="card full co-group" id="stressCard"><h3>' + tr('Crédito Automotriz, Personal y Casas de Empeño', 'Auto, Installment and Pawn Lenders') + '</h3><p class="cap">' + cap + '</p><div class="tblwrap"><table class="co-table gig"><colgroup>' + [14, 50, 36].map(function (w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="chart-src">' + tr('pb = puntos base frente al año anterior. En las tasas, la cifra después de "frente a" es la del periodo que se indica. † = variación que FNAM calculó con las dos cifras del informe. Las citas se muestran en su idioma original.', 'bps = basis points against a year earlier. For rates, the figure after "vs" is that of the period stated. † = a change FNAM computed from the two figures in the report.') + '</p></div>';
  }
  function gigOfficial() {
    var G = D.gigUS, card = $('gigOfficialCard'); if (!card) return;
    if (!G) { card.hidden = true; return; }
    var f = gigFacts(), CR = S(1), CC = S(2), mm = function (v) { return UI.nf(v / 1e6, 2) + tr(' millones', ' million'); };
    $('capGigUS').innerHTML = bi(
      'Negocios sin empleados (casi todos, una persona que trabaja por su cuenta) con ingresos de al menos $1,000 en el año, según los registros fiscales. Los conductores de aplicaciones se clasifican en "servicio de taxis y limusinas" y los repartidores de aplicaciones en "mensajería y paquetería". Solo Estados Unidos, ' + f.y0 + '–' + f.y + '. No todos trabajan por medio de una aplicación, y quien usa varias cuenta una sola vez.',
      'Businesses with no employees (almost all of them one self-employed person) with receipts of at least $1,000 in the year, from tax records. App-based drivers are classified in "taxi and limousine service" and app-based couriers in "couriers and messengers". United States only, ' + f.y0 + '–' + f.y + '. Not all of them work through an app, and a person who uses several is counted once.');
    var st = function (v, l, k) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + (k || UI.kind('C')) + '</div></div>'; };
    var stats = [
      st(mm(f.total), tr('Conductores y repartidores por cuenta propia en Estados Unidos, ', 'Self-employed drivers and couriers in the United States, ') + f.y),
      f.since19 != null ? st(UI.signed(f.since19, 0), tr('Variación desde 2019 (' + mm(f.total19) + ')', 'Change since 2019 (' + mm(f.total19) + ')')) : '',
      st(UI.money(f.rcp, 1), tr('Lo que facturaron en ', 'What they billed in ') + f.y),
      st(UI.usd(f.avg), tr('Facturación promedio de cada uno en el año', 'Average billed by each one in the year'))];
    if (f.dashers && f.dasherPay) stats.push(st((f.dashers.q === 'over' ? '> ' : '') + UI.nf(f.dashers.v, f.dashers.dp || 0) + tr(' millones', ' million'), tr('Personas que repartieron con DoorDash en Estados Unidos en ', 'People who delivered with DoorDash in the United States in ') + tr(f.dashers.period.es, f.dashers.period.en) + tr('; ganaron ', '; they earned ') + gval(f.dasherPay) + tr(' (informe de la empresa)', ' (company report)'), UI.kind('R')));
    if (f.rev.length) stats.push(st(f.rev.map(function (x) { return UI.signed(x.u.yoy, 0); }).join(' / '), tr('Ingresos en ', 'Revenue in ') + f.rev.map(function (x) { return (x.u.scope === 'us' ? tr('Estados Unidos', 'the United States') : tr('Estados Unidos y Canadá', 'the United States and Canada')) + ' (' + esc(x.c.name) + ')'; }).join(tr(' y ', ' and ')) + ', ' + tr(f.rev[0].u.period.es, f.rev[0].u.period.en) + tr(', variación anual', ', change from a year earlier')));
    $('gigStats').innerHTML = stats.join('');
    var sets = [{ label: tr('Conductores: taxis, limusinas y aplicaciones de viajes', 'Drivers: taxis, limousines and ride-hailing apps'), data: G.taxi.map(function (v) { return v / 1e6; }), color: CR }, { label: tr('Repartidores: mensajería y aplicaciones de entrega', 'Couriers: messengers and delivery apps'), data: G.courier.map(function (v) { return v / 1e6; }), color: CC }];
    UI.line('chGigUS', { labels: G.years, datasets: sets, fmt: function (v) { return UI.nf(v, 2) + tr(' millones', ' million'); }, axisFmt: function (v) { return UI.nf(v, 1); }, min: 0, xTicks: 7, yTitle: tr('Millones de negocios sin empleados', 'Millions of businesses with no employees') });
    UI.legend('chGigUS', sets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    var asets = [{ label: tr('Conductores', 'Drivers'), data: G.taxiAvg.map(function (v) { return v / 1000; }), color: CR }, { label: tr('Repartidores', 'Couriers'), data: G.courierAvg.map(function (v) { return v / 1000; }), color: CC }];
    UI.line('chGigAvg', { labels: G.years, datasets: asets, fmt: function (v) { return UI.usd(v * 1000); }, axisFmt: function (v) { return '$' + UI.nf(v, 0) + 'k'; }, min: 0, xTicks: 7, yTitle: tr('Miles de dólares por negocio al año', 'Thousands of dollars per business a year') });
    UI.legend('chGigAvg', asets.map(function (x) { return { c: x.color, l: x.label, line: 1 }; }));
    UI.table('chGigUS', [tr('Año', 'Year'), tr('Conductores', 'Drivers'), tr('Repartidores', 'Couriers'), tr('Total', 'Total'), tr('Facturación total', 'Total billed'), tr('Promedio, conductores', 'Average, drivers'), tr('Promedio, repartidores', 'Average, couriers')],
      G.years.slice().reverse().map(function (y) { var i = G.years.indexOf(y); return [y, UI.nf(G.taxi[i]), UI.nf(G.courier[i]), UI.nf(G.total[i]), UI.money(G.totalRcp[i], 1), UI.usd(G.taxiAvg[i]), UI.usd(G.courierAvg[i])]; }));
    var x = UI.nf(f.total / f.total0, 1);
    var es = '<b>El conteo oficial:</b> en ' + f.y + ' había <b>' + mm(f.total) + '</b> de conductores y repartidores por cuenta propia en Estados Unidos, ' + x + ' veces los de ' + f.y0 + ' (' + mm(f.total0) + '). Los conductores pasaron de ' + mm(f.taxi0) + ' a ' + mm(f.taxi) + ' y los repartidores de ' + mm(f.courier0) + ' a ' + mm(f.courier) + (f.crossed ? ' (en ' + f.crossed + ' fueron más que los conductores por primera vez)' : '') + '.';
    var en = '<b>The official count:</b> in ' + f.y + ' there were <b>' + mm(f.total) + '</b> self-employed drivers and couriers in the United States, ' + x + ' times the number in ' + f.y0 + ' (' + mm(f.total0) + '). Drivers went from ' + mm(f.taxi0) + ' to ' + mm(f.taxi) + ' and couriers from ' + mm(f.courier0) + ' to ' + mm(f.courier) + (f.crossed ? ' (in ' + f.crossed + ' they outnumbered drivers for the first time)' : '') + '.';
    var down = f.courierAvg < f.courierAvg0;
    es += ' <b>Más gente, ' + (down ? 'menos' : 'más') + ' ingreso por persona:</b> un repartidor facturó en promedio ' + UI.usd(f.courierAvg) + ' en ' + f.y + ' (' + UI.usd(f.courierAvg0) + ' en ' + f.y0 + ') y un conductor ' + UI.usd(f.taxiAvg) + ' (' + UI.usd(f.taxiAvg0) + '), antes de gastos como gasolina y vehículo: cifras de un trabajo de tiempo parcial.';
    en += ' <b>More people, ' + (down ? 'less' : 'more') + ' income per person:</b> a courier billed ' + UI.usd(f.courierAvg) + ' on average in ' + f.y + ' (' + UI.usd(f.courierAvg0) + ' in ' + f.y0 + ') and a driver ' + UI.usd(f.taxiAvg) + ' (' + UI.usd(f.taxiAvg0) + '), before costs such as fuel and the vehicle: the figures of part-time work.';
    if (f.dashers && f.weeks) {
      es += ' <b>Por qué las plataformas cuentan más gente:</b> el conteo oficial deja fuera a quien facturó menos de $1,000 en el año, y las plataformas cuentan a cualquiera que completó un trabajo. DoorDash informa que ' + gval(f.dashers) + ' de personas repartieron en Estados Unidos en ' + f.dashers.period.es + ' y que el repartidor típico estuvo activo ' + gval(f.weeks) + ' del año.';
      en += ' <b>Why the platforms count more people:</b> the official count leaves out anyone who billed less than $1,000 in the year, and the platforms count anyone who completed one job. DoorDash reports that ' + gval(f.dashers) + ' people delivered in the United States in ' + f.dashers.period.en + ' and that the typical courier was active ' + gval(f.weeks) + ' of the year.';
    }
    $('gigCallout').innerHTML = bi(es + ' ' + UI.kind('C'), en + ' ' + UI.kind('C'));
  }
  function gig() {
    gigOfficial();
    var card = $('gigCard'); if (!card) return;
    var L = gigList();
    if (!L.length) { card.hidden = true; return; }
    card.hidden = false;
    var withUS = L.filter(function (c) { return (c.us || []).some(function (u) { return u.scope === 'us'; }); }).map(function (c) { return c.name; });
    var list = coList;
    $('capGig').innerHTML = bi(
      'Ninguna de las ' + L.length + ' plataformas publica viajes o pedidos solo de Estados Unidos. La columna "Estados Unidos" reúne lo que cada una sí informa del país (o del ámbito más pequeño que lo contiene), tomado de sus informes ante la SEC' + (withUS.length ? '; solo ' + list(withUS) + ' dan cifras de Estados Unidos por separado' : '') + '. La actividad de toda la plataforma se muestra aparte y no mide a Estados Unidos.',
      'None of the ' + L.length + ' platforms publishes trips or orders for the United States alone. The "United States" column gathers what each one does report for the country (or for the narrowest geography that contains it), taken from its SEC reports' + (withUS.length ? '; only ' + list(withUS) + ' give United States figures separately' : '') + '. Whole-platform activity is shown apart and does not measure the United States.');
    var up = figUp, a = figLink;
    var head = [tr('Empresa', 'Company'), tr('Estados Unidos: lo que la empresa informa', 'United States: what the company reports'), tr('Toda la plataforma (no es solo Estados Unidos)', 'Whole platform (not the United States alone)'), tr('Alcance, cita y fuente', 'Scope, quote and source')];
    var rows = L.map(function (c) {
      var scopes = (c.us || []).map(function (u) { return u.scope; }), sc = scopes.indexOf('us') >= 0 ? 'us' : scopes.length ? 'usca' : null;
      // whole-platform activity: shown only when it is a wider geography than the United States column
      var wide = [], same = sc === 'usca' && (c.us || []).some(function (u) { return u.key === 'tasks'; });
      if (!same) {
        if (c.tasks) wide.push('<span class="usm"><b>' + UI.nf(c.tasks.v, c.tasks.dp || 0) + ' M</b>' + up(c.tasks) + '<span class="sub">' + tr(c.tasks.unit.es, c.tasks.unit.en) + '</span></span>');
        if (c.bookings) wide.push('<span class="usm"><b>' + UI.money(c.bookings.v / 1000, 1) + '</b>' + up(c.bookings) + '<span class="sub">' + tr('reservas brutas', 'gross bookings') + '</span></span>');
        if (c.users) wide.push('<span class="usm"><b>' + UI.nf(c.users.v, c.users.dp || 0) + ' M</b>' + up(c.users) + '<span class="sub">' + tr(c.users.unit.es, c.users.unit.en) + '</span></span>');
        if (c.workers) wide.push('<span class="usm"><b>' + gq(c.workers) + (c.workers.unit === 'M' ? UI.nf(c.workers.v, c.workers.dp || 0) + tr(' millones', ' million') : UI.nf(c.workers.v)) + '</b><span class="sub">' + tr('personas repartieron', 'people delivered') + ' · ' + tr(c.workers.period.es, c.workers.period.en) + ' · ' + a(c.workers) + '</span></span>');
        if (c.workerPay) wide.push('<span class="usm"><b>' + gq(c.workerPay) + '$' + UI.nf(c.workerPay.v, c.workerPay.dp || 0) + tr(' mil millones', ' billion') + '</b><span class="sub">' + tr(c.workerPay.quarterly ? 'ganaron conductores y repartidores en el trimestre, propinas incluidas' : 'ganaron en total', c.workerPay.quarterly ? 'earned by drivers and couriers in the quarter, tips included' : 'earned in total') + ' · ' + tr(c.workerPay.period.es, c.workerPay.period.en) + ' · ' + a(c.workerPay) + '</span></span>');
      }
      var wideCell = wide.length ? wide.join('') : '<span class="sub">' + tr('La misma que la columna anterior: la empresa no opera a escala mundial.', 'The same as the previous column: the company does not operate worldwide.') + '</span>';
      return '<tr>' + coFirstCell(c) + '<td data-l="' + head[1] + '">' + usCellOf(c) + '</td><td data-l="' + head[2] + '">' + wideCell + '</td>' + coTxtCell(c, head[3]) + '</tr>';
    });
    $('gigTable').innerHTML = '<colgroup>' + [13, 32, 25, 30].map(function (w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody>';
    $('gigNote').innerHTML = bi(
      'M = millones. La variación es frente al mismo periodo del año anterior. † = la calculó FNAM con las dos cifras del informe; sin marca, es la que publica la empresa. Reservas brutas: Gross Bookings en Uber y Lyft (sin propinas), Marketplace GOV en DoorDash y GTV en Instacart (con propinas). "Informe de la empresa": documento encargado y publicado por la propia empresa, no presentado ante la SEC. n. d. = la empresa no lo informa. Las citas se muestran en su idioma original.',
      'M = millions. The change is against the same period a year earlier. † = FNAM computed it from the two figures in the report; unmarked, it is the one the company publishes. Gross bookings: Gross Bookings at Uber and Lyft (tips excluded), Marketplace GOV at DoorDash and GTV at Instacart (tips included). "Company report": a document commissioned and published by the company itself, not filed with the SEC. n/a = the company does not report it.');
  }

  function companies() {
    if (!CO) { $('empresas').hidden = true; return; }
    var newer = CO.companies.filter(function (c) { return c.newerFiling; });
    $('metaCompanies').innerHTML = bi('Fuente: comunicados de resultados de cada empresa (Formulario 8-K, SEC EDGAR); cada cifra enlaza a su documento. Última revisión: <span class="data-through">' + UI.date(CO.reviewed) + '</span>.', 'Source: each company\'s results release (Form 8-K, SEC EDGAR); every figure links to its document. Last reviewed: <span class="data-through">' + UI.date(CO.reviewed) + '</span>.') +
      (newer.length ? ' ' + UI.amber(tr(newer.length + ' con reporte más reciente por revisar', newer.length + ' with a newer report to review'), newer.map(function (c) { return c.ticker; }).join(', ')) : '');
    $('coCallout').innerHTML = (companySummary() || '') + ' ' + UI.kind('C') + bi(' Las definiciones y los trimestres fiscales difieren entre empresas; las cifras no son estrictamente comparables entre sí.', ' Definitions and fiscal quarters differ across companies; the figures are not strictly comparable with one another.');
    var gname = {}; CO.groups.forEach(function (g) { gname[g.id] = tr(g.es, g.en); });
    var gcol = { mass: S(1), value: S(2), grocery: S(3), home: S(4), restaurants: S(5) };
    var comps = CO.companies.filter(function (c) { return c.comp && gcol[c.group]; });
    var order = CO.groups.map(function (g) { return g.id; });
    comps.sort(function (a, b) { return order.indexOf(a.group) - order.indexOf(b.group) || b.comp.v - a.comp.v; });
    UI.bar('chComps', { horizontal: true, labels: comps.map(function (c) { return c.name; }), data: comps.map(function (c) { return c.comp.v; }), colors: comps.map(function (c) { return gcol[c.group]; }), fmt: function (v, i) { return UI.signed(v, i != null && comps[i].comp.dp != null ? comps[i].comp.dp : 1) + (i != null ? ' · ' + tr(comps[i].segment.es, comps[i].segment.en) + ' · ' + tr(comps[i].period.es, comps[i].period.en) : ''); }, axisFmt: function (v) { return (v < 0 ? '−' : '') + Math.abs(v) + '%'; }, valueLabels: function (v, i) { return UI.signed(v, comps[i].comp.dp == null ? 1 : comps[i].comp.dp); }, thickness: 14, tipTitle: function (i) { return comps[i].name + ' (' + comps[i].ticker + ')'; } });
    UI.legend('chComps', order.filter(function (g) { return gcol[g]; }).map(function (g) { return { c: gcol[g], l: gname[g] }; }));
    var arrow = function (m) { return !m || m.v == null ? UI.nd() : '<span class="' + (m.v > 0 ? 'up' : m.v < 0 ? 'down' : '') + '">' + UI.signed(m.v, m.dp == null ? 1 : m.dp) + '</span>'; };
    var sign = function (s) { return s > 0 ? '<span class="up">' + tr('sube', 'up') + '</span>' : '<span class="down">' + tr('baja', 'down') + '</span>'; };
    var cell = function (m, s) { return m ? arrow(m) : s ? sign(s) : UI.nd(); };
    var srcA = function (c) { return '<a class="srcl" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + tr('Comunicado ↗', 'Release ↗') + '</a>'; };
    var rate = function (m, v) { return UI.pct(v, m.dp == null ? 2 : m.dp); };   // a lender that reports one decimal is shown with one
    var html = '';
    CO.groups.forEach(function (g) {
      if (g.id === 'gig' || g.id === 'bnpl' || g.id === 'stress') return;
      var list = CO.companies.filter(function (c) { return c.group === g.id; }); if (!list.length) return;
      var lend = g.id === 'lenders';
      var head = lend ? [tr('Empresa', 'Company'), tr('Castigos netos', 'Net charge-offs'), tr('Año anterior', 'Year earlier'), tr('Morosidad 30+ días', '30+ days past due'), tr('Gasto con tarjeta, var. anual', 'Card spending, y/y'), tr('Segmento, cita y fuente', 'Segment, quote and source')]
        : [tr('Empresa', 'Company'), tr('Ventas comparables', 'Comparable sales'), tr('Tráfico', 'Traffic'), tr('Ticket promedio', 'Average ticket'), tr('Segmento, cita y fuente', 'Segment, quote and source')];
      html += '<div class="card full co-group"><h3>' + gname[g.id] + '</h3><div class="tblwrap"><table class="co-table ' + (lend ? 'lend' : 'retail') + '"><colgroup>' + (lend ? [21, 10, 10, 14, 13, 32] : [22, 14, 10, 12, 42]).map(function (w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
      list.forEach(function (c) {
        var first = '<td><span class="tk">' + esc(c.name) + '</span> <span class="nd">' + c.ticker + '</span><span class="per">' + tr(c.period.es, c.period.en) + ' · ' + UI.date(c.periodEnd) + '</span>' + (c.newerFiling ? '<span class="new" title="' + esc(tr('La SEC ya tiene un comunicado de resultados más reciente, del ', 'The SEC already has a newer results release, dated ') + UI.date(c.newerFiling)) + '">' + tr('reporte más reciente por revisar', 'newer report to review') + '</span>' : '') + '</td>';
        var txt = '<td class="txt"><b>' + tr(c.segment.es, c.segment.en) + '.</b>' + (c.extra && c.extra.length ? '<span class="xt">' + c.extra.map(function (x) { return tr(x.label.es, x.label.en) + ': ' + UI.signed(x.v, x.dp == null ? 1 : x.dp); }).join(' · ') + '</span>' : '') +
          (c.spend && c.spend.basis ? '<span class="xt">' + tr('Gasto: ', 'Spending: ') + tr(c.spend.basis.es, c.spend.basis.en) + '.</span>' : '') +
          (c.quote ? '<span class="xt"><q lang="en">' + esc(c.quote.text) + '</q><span class="by">' + (c.quote.by ? esc(c.quote.by) + ', ' : '') + tr(c.quote.role.es, c.quote.role.en) + '</span></span>' : '') + '<span class="xt">' + srcA(c) + ' · ' + tr('presentado el ', 'filed ') + UI.date(c.filed) + '</span></td>';
        var td = function (label, inner) { return '<td data-l="' + label + '"' + (inner === UI.nd() ? ' class="empty"' : '') + '>' + inner + '</td>'; };
        if (lend) html += '<tr>' + first + td(head[1], c.nco ? rate(c.nco, c.nco.v) : UI.nd()) + td(head[2], c.nco && c.nco.prev != null ? rate(c.nco, c.nco.prev) : UI.nd()) + td(head[3], c.dq30 ? rate(c.dq30, c.dq30.v) + (c.dq30.prev != null ? ' <span class="nd">(' + rate(c.dq30, c.dq30.prev) + ')</span>' : '') : UI.nd()) + td(head[4], c.spend ? arrow(c.spend) + (c.spend.notComparable ? ' *' : '') : UI.nd()) + txt + '</tr>';
        else html += '<tr>' + first + td(head[1], c.comp ? arrow(c.comp) : c.sales ? arrow(c.sales) + ' <span class="nd">' + tr('(ventas)', '(sales)') + '</span>' : UI.nd()) + td(head[2], cell(c.traffic, c.trafficSign)) + td(head[3], cell(c.ticket, c.ticketSign)) + txt + '</tr>';
      });
      html += '</tbody></table></div>' + (lend ? '<p class="chart-src">' + tr('Entre paréntesis, el mismo trimestre del año anterior. * Variación no comparable (ver el segmento). Las citas se muestran en su idioma original.', 'In parentheses, the same quarter a year earlier. * Change not comparable (see the segment).') + '</p>' : '<p class="chart-src">' + tr('n. d. = el comunicado no da la cifra; "sube" o "baja" = el comunicado da la dirección sin cifra. Las citas se muestran en su idioma original.', 'n/a = the release does not give the figure; "up" or "down" = the release gives the direction without a figure.') + '</p>') + '</div>';
    });
    $('coTables').innerHTML = html + bnplTable() + stressTable();
    gig();
  }

  // =====================================================================================================================
  // 11 Sources
  // =====================================================================================================================
  function sources() {
    var desc = {
      census: ['Población, hogares, ingreso, vivienda y escolaridad, para el país y cada estado. Encuesta anual; la página toma la edición más reciente disponible.', 'Population, households, income, housing and schooling, for the nation and every state. Annual survey; the page takes the latest edition available.'],
      cps: ['La mediana oficial del ingreso de los hogares del país y su historia desde 1984.', 'The official national median household income and its history since 1984.'],
      bea: ['Ingreso personal y su destino, mensual, y consumo por tipo de producto, trimestral.', 'Personal income and its disposition, monthly, and consumption by type of product, quarterly.'],
      beaStates: ['Ingreso personal per cápita por estado y paridades regionales de precios.', 'Per-capita personal income by state and regional price parities.'],
      cex: ['Gasto e ingreso por decil de ingreso, edad y tenencia de la vivienda. Tablas anuales, leídas por la API pública de la BLS.', 'Spending and income by income decile, age and housing tenure. Annual tables, read through the BLS public API.'],
      dfa: ['Reparto trimestral del balance de los hogares por riqueza, ingreso, edad, generación, escolaridad y raza.', 'Quarterly distribution of the household balance sheet by wealth, income, age, generation, schooling and race.'],
      scf: ['Encuesta trienal a familias: medianas, promedios y tenencia de activos y deudas.', 'Triennial survey of families: medians, means and holdings of assets and debts.'],
      nyfed: ['Deuda por tipo de préstamo y por edad, y morosidad, con base en reportes de crédito (panel de la Fed de Nueva York y Equifax).', 'Debt by type of loan and by age, and delinquency, from credit reports (New York Fed Consumer Credit Panel / Equifax).'],
      nyfedStates: ['Saldos por persona y morosidad por estado, al cuarto trimestre de cada año.', 'Balances per person and delinquency by state, as of the fourth quarter of each year.'],
      cexHist: ['Gasto e ingreso por quintil de ingreso desde 1984: la parte del gasto total que hace cada quinta parte de los hogares.', 'Spending and income by income quintile since 1984: the share of all spending done by each fifth of households.'],
      beaDist: ['Participación de cada decil de hogares en el ingreso personal y en el ingreso disponible, anual desde 2000.', 'Share of each decile of households in personal income and in disposable income, annual since 2000.'],
      atlWages: ['Crecimiento mediano de los salarios por cuartil salarial, con microdatos de la Encuesta de Población Actual.', 'Median wage growth by wage quartile, from Current Population Survey microdata.'],
      umich: ['Índice de sentimiento del consumidor por tercil de ingreso, mensual.', 'Index of consumer sentiment within income terciles, monthly.'],
      phillyCards: ['Cuentas de tarjeta de crédito de los bancos más grandes (reporte FR Y-14M): cómo se pagan, cuánto de la línea se usa, morosidad, cuentas nuevas y compras por puntaje de crédito. Trimestral.', 'Credit card accounts at the largest banks (FR Y-14M report): how they are paid, how much of the line is used, delinquency, new accounts and purchases by credit score. Quarterly.'],
      sce: ['Encuesta mensual a unos 1,300 jefes de hogar: probabilidad de no poder hacer un pago mínimo, acceso al crédito y situación financiera; y su encuesta de acceso al crédito, cada cuatro meses: solicitudes, rechazos y desalentados.', 'Monthly survey of about 1,300 household heads: probability of missing a minimum payment, access to credit and financial situation; and its Credit Access Survey, every four months: applications, rejections and discouraged borrowers.'],
      shed: ['Encuesta anual a más de 12,000 adultos: bienestar financiero, gastos imprevistos, ahorro y uso de "compra ahora, paga después". Tablas y figuras del informe, tal como se publican.', 'Yearly survey of more than 12,000 adults: financial well-being, unexpected expenses, savings and use of buy now, pay later. The report\'s tables and figures, as published.'],
      cfpbBnpl: ['Estudio único (enero de 2025): préstamos de seis prestamistas cruzados con expedientes de crédito, 2021–2022.', 'One-off study (January 2025): loans from six lenders matched to credit records, 2021–2022.'],
      fsa: ['Cartera federal de préstamos estudiantiles por situación (en pago, prórroga, diferido, incumplimiento) y por días de atraso, al cierre de cada trimestre.', 'Federal student loan portfolio by status (repayment, forbearance, deferment, default) and by days delinquent, at each quarter end.'],
      courts: ['Casos de quiebra presentados en periodos de 12 meses, empresariales y no empresariales, por capítulo y distrito judicial.', 'Bankruptcy cases filed in 12-month periods, business and nonbusiness, by chapter and court district.'],
      jointDist: ['Estadística prototipo: participación de cada decil de hogares, ordenados por ingreso, en el ingreso disponible y el consumo de las cuentas nacionales, y su tasa de ahorro; anual desde 2000.', 'Prototype statistic: share of each decile of households, ranked by income, in the disposable income and consumption of the national accounts, and its saving rate; annual since 2000.'],
      pceDist: ['Estadística experimental: la encuesta de gastos ajustada al consumo de las cuentas nacionales, por decil de hogares ordenados por su gasto, anual desde 2000.', 'Experimental statistic: the expenditure survey scaled to the consumption of the national accounts, by decile of households ranked by their spending, annual since 2000.'],
      nes: ['Negocios sin empleados y su facturación por industria, anual, con base en registros fiscales: conductores (taxis, limusinas y aplicaciones de viajes) y repartidores (mensajería y aplicaciones de entrega).', 'Businesses with no employees and their receipts by industry, yearly, from tax records: drivers (taxis, limousines and ride-hailing apps) and couriers (messengers and delivery apps).'],
      board: ['Crédito al consumo y sus tasas, razón de servicio de deuda, morosidad y castigos en bancos comerciales.', 'Consumer credit and its rates, debt service ratio, delinquency and charge-offs at commercial banks.']
    };
    var items = Object.keys(D.sources).map(function (id) { var s = D.sources[id], d = desc[id] || ['', '']; return '<div class="item"><div class="t">' + esc(nm('srcShort', id)) + '</div><div class="d">' + tr(d[0], d[1]) + ' <span class="data-through">' + UI.through(s.asOf) + '</span>.' + (s.via ? ' ' + tr('Series leídas a través de FRED (Fed de San Luis), cada una verificada contra su título.', 'Series read through FRED (St. Louis Fed), each checked against its title.') : '') + '</div><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + ' ↗</a></div>'; });
    if (CO) items.push('<div class="item"><div class="t">' + tr('Comunicados de resultados de las empresas', 'Company results releases') + '</div><div class="d">' + tr('Formulario 8-K (punto 2.02) de ' + CO.companies.length + ' empresas en SEC EDGAR (formulario 6-K en el caso de Klarna) y, para las plataformas de trabajo por encargo y algunos prestamistas, sus informes trimestral (10-Q) y anual (10-K) y el informe de DoorDash sobre Estados Unidos. Cada cifra y cita se coteja contra el texto del documento. Última revisión: ', 'Form 8-K (Item 2.02) of ' + CO.companies.length + ' companies on SEC EDGAR (Form 6-K for Klarna) and, for the gig platforms and some lenders, their quarterly (10-Q) and annual (10-K) reports and DoorDash\'s report on the United States. Every figure and quote is checked against the text of the document. Last reviewed: ') + '<span class="data-through">' + UI.date(CO.reviewed) + '</span>.</div><a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener">sec.gov ↗</a></div>');
    var KE = D.kshape && D.kshape.estimates;
    if (KE) { var pubs = []; KE.list.forEach(function (e) { var n = e.publisher.replace(/\s*\(.*$/, '').replace(/,.*$/, ''); if (pubs.indexOf(n) < 0) pubs.push(n); });
      items.push('<div class="item"><div class="t">' + tr('Mediciones y estimaciones de terceros', 'Measurements and estimates by others') + '</div><div class="d">' + tr('Sección ', 'Section ') + ((document.querySelector('#economia-k .sec-num') || {}).textContent || '') + ': ' + esc(pubs.join(', ')) + tr('. Cada cifra lleva su periodo, fecha de publicación y enlace, y dice quién la produjo; ninguna se mezcla con las series oficiales. Última revisión: ', '. Every figure carries its period, publication date and link, and says who produced it; none is mixed into the official series. Last reviewed: ') + '<span class="data-through">' + UI.date(KE.reviewed) + '</span>.</div><a href="#economia-k">' + tr('Ver la sección ↑', 'See the section ↑') + '</a></div>'); }
    $('srcGrid').innerHTML = items.join('');
    $('fineUpdate').innerHTML = bi(
      '<b>Actualización.</b> Las fuentes oficiales se consultan todos los días y la página cambia solo cuando alguna publica un dato nuevo: ingreso y consumo cada mes, deuda y riqueza cada trimestre, y las encuestas (ACS, gastos del consumidor, finanzas del consumidor) cuando sale su siguiente edición. Cada bloque indica el periodo de sus datos. Las cifras de las empresas se revisan después de cada temporada de resultados. Datos generados: ' + when(D.generatedAt) + ' (hora de la Ciudad de México).',
      '<b>Updates.</b> The official sources are checked every day and the page changes only when one of them publishes something new: income and consumption every month, debt and wealth every quarter, and the surveys (ACS, consumer expenditures, consumer finances) when their next edition comes out. Every block states the period of its data. Company figures are reviewed after each earnings season. Data generated: ' + when(D.generatedAt) + ' (Mexico City time).');
  }

  // =====================================================================================================================
  function statColumns() { Array.prototype.forEach.call(document.querySelectorAll('.stat-row'), function (el) { var n = el.children.length; el.style.setProperty('--n', n <= 6 ? n : Math.ceil(n / 2)); }); }
  // a block the last build could not produce leaves no empty frame: its section, its navigation link and any card whose charts have no data are hidden
  function hideEmpty() {
    var need = { demografia: D.demo, ingreso: D.income, fondos: D.funds, deciles: D.cex, credito: D.debt || D.creditTerms, estres: D.leverage || D.cards || D.expect || D.studentLoans || D.insolvency, riqueza: D.wealth, 'economia-k': D.kshape, empresas: CO };
    Object.keys(need).forEach(function (id) { var el = $(id), a = document.querySelector('#jumpNav a[href="#' + id + '"]'); if (el) el.hidden = !need[id]; if (a) a.hidden = !need[id]; });
    var maps = { incomeMapCard: D.states, debtMapCard: D.states && D.states.list[0].debt, stressMapCard: D.states && D.states.list[0].rentBurden };
    Object.keys(maps).forEach(function (id) { var el = $(id); if (el) el.hidden = !maps[id]; });
    Array.prototype.forEach.call(document.querySelectorAll('.card'), function (card) {
      var cv = card.querySelectorAll('canvas'); if (!cv.length) return;
      card.hidden = !Array.prototype.some.call(cv, function (c) { return !!UI.charts[c.id]; });
    });
  }
  function renderAll() {
    UI.setupCharts();
    [header, paintProvenance, demographics, income, funds, deciles, credit, stress, wealth, kshape, companies, glance, sources, statColumns, hideEmpty].forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.error(fn.name, e); window.__CONS_ERRORS = (window.__CONS_ERRORS || []).concat([fn.name + ': ' + e.message]); } });
  }
  function setLang(l) {
    UI.lang = l; document.documentElement.setAttribute('lang', l);
    try { localStorage.setItem('fnam-lang', l); } catch (e) {}
    document.title = l === 'en' ? 'The American Consumer · FNAM' : 'El Consumidor Estadounidense · FNAM';
    $('btnLangEs').classList.toggle('active', l === 'es'); $('btnLangEn').classList.toggle('active', l === 'en');
    Array.prototype.forEach.call(document.querySelectorAll('a[data-base]'), function (a) { var b = a.getAttribute('data-base'); a.setAttribute('href', b + (b.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + l); });
    try { var u = new URL(location.href); if (u.searchParams.get('lang')) { u.searchParams.set('lang', l); history.replaceState(null, '', u.toString()); } } catch (e) {}
    renderAll();
  }
  $('btnLangEs').addEventListener('click', function () { setLang('es'); });
  $('btnLangEn').addEventListener('click', function () { setLang('en'); });
  window.addEventListener('resize', function () { if (D.cex && (window.innerWidth <= 640) !== state.heatCompact) heat(); });
  if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); var onScheme = function () { renderAll(); }; if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme); }

  // sticky navigation: edge fades, active section, height for anchor offsets
  (function () {
    var strip = $('jumpNav'), wrap = strip.parentNode, nav = document.querySelector('nav.jump');
    function fades() { var f = []; if (strip.scrollLeft > 4) f.push('left'); if (strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4) f.push('right'); wrap.setAttribute('data-fade', f.join(' ')); }
    strip.addEventListener('scroll', fades, { passive: true }); window.addEventListener('resize', fades); setTimeout(fades, 0);
    function setH() { document.documentElement.style.setProperty('--jump-h', Math.ceil(nav.getBoundingClientRect().height) + 8 + 'px'); }
    setH(); window.addEventListener('resize', setH);
    var links = Array.prototype.slice.call(strip.querySelectorAll('a')), targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    if ('IntersectionObserver' in window) {
      var seen = {};
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
        var cur = null; targets.forEach(function (t) { if (t && seen[t.id] && !cur) cur = t.id; });
        if (cur) links.forEach(function (a) { var on = a.getAttribute('href') === '#' + cur; a.classList.toggle('active', on); if (on && strip.scrollWidth > strip.clientWidth) { var l = a.offsetLeft - 24; if (l < strip.scrollLeft || a.offsetLeft + a.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = l; } });
      }, { rootMargin: '-20% 0px -65% 0px' });
      targets.forEach(function (t) { if (t) io.observe(t); });
    }
  })();

  setLang(UI.lang);
  window.CONS_APP = { render: renderAll, state: state };
})();
