// The Mexican Consumer: the page. Every figure, sentence and chart is composed here from data/data.js (official
// sources, refreshed by the site's scheduled job) and data/companies.js (company results releases), in the language on
// screen. Nothing on the page is typed by hand, so the text can never disagree with the charts.
(function () {
  'use strict';
  var UI = window.MXC_UI, D = window.MXC_DATA, CO = window.MXC_COMPANIES || null;
  var $ = UI.$, tr = UI.tr, bi = UI.bi, esc = UI.esc;
  if (!D) { var w = $('dataWarn'); if (w) { w.hidden = false; w.innerHTML = bi('No se pudieron cargar los datos de la página. Vuelva a intentarlo en unos minutos.', 'The page data could not be loaded. Please try again in a few minutes.'); } return; }
  var state = { incomeMap: 'mean', debtMap: 'card', stressMap: 'poverty', heat: 'share', enifGroups: 'anyCredit', stressGroups: 'lateAny' };
  var S = function (n) { return UI.series(n); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); };
  var last = function (a) { return a[a.length - 1]; };
  var by = function (arr, k) { return arr.filter(function (x) { return x.k === k; })[0]; };
  var NEUTRAL = function () { return UI.css('--neutral-mark'); };

  // ---------- names ----------
  var N = {
    age: { '0-14': ['0 a 14', '0 to 14'], '15-24': ['15 a 24', '15 to 24'], '25-34': ['25 a 34', '25 to 34'], '35-44': ['35 a 44', '35 to 44'], '45-54': ['45 a 54', '45 to 54'], '55-64': ['55 a 64', '55 to 64'], '65-74': ['65 a 74', '65 to 74'], '75+': ['75 o más', '75 and over'], '<25': ['Menores de 25', 'Under 25'], '65+': ['65 o más', '65 and over'],
      '18-29': ['18 a 29', '18 to 29'], '30-44': ['30 a 44', '30 to 44'], '45-59': ['45 a 59', '45 to 59'], '60-70': ['60 a 70', '60 to 70'] },
    edu: { none: ['Sin primaria completa', 'Less than primary school'], primary: ['Primaria', 'Primary school'], secondary: ['Secundaria', 'Lower secondary school'], highSchool: ['Preparatoria', 'High school'], college: ['Licenciatura o posgrado', 'College or graduate degree'] },
    enifEdu: { basic: ['Hasta secundaria', 'Up to lower secondary'], highSchool: ['Preparatoria o carrera técnica', 'High school or technical'], college: ['Licenciatura o más', 'College or more'] },
    xfEdu: { none: ['Sin escolaridad', 'No schooling'], basic: ['Educación básica', 'Basic education'], highSchool: ['Educación media superior', 'High school'], college: ['Licenciatura', 'College'], graduate: ['Posgrado', 'Graduate degree'] },
    sex: { men: ['Hombres', 'Men'], women: ['Mujeres', 'Women'] },
    hh: { nuclear: ['Nuclear: pareja o padres con hijos', 'Nuclear: couple or parents with children'], extended: ['Ampliado: con otros parientes', 'Extended: with other relatives'], alone: ['Una sola persona', 'One person'], composite: ['Compuesto: con no parientes', 'Composite: with non-relatives'], coresident: ['Corresidentes', 'Unrelated people'] },
    loc: { big: ['100 mil habitantes o más', '100,000 people or more'], mid: ['15 mil a 99,999', '15,000 to 99,999'], small: ['2,500 a 14,999', '2,500 to 14,999'], rural: ['Menos de 2,500 (rural)', 'Under 2,500 (rural)'] },
    enifLoc: { urban: ['Localidades de 15 mil habitantes o más', 'Localities of 15,000 people or more'], small: ['Localidades de menos de 15 mil', 'Localities under 15,000 people'] },
    region: { northwest: ['Noroeste', 'Northwest'], northeast: ['Noreste', 'Northeast'], west: ['Occidente y Bajío', 'West and Bajío'], cdmx: ['Ciudad de México', 'Mexico City'], center: ['Centro Sur y Oriente', 'South-Center and East'], south: ['Sur', 'South'] },
    tenure: { owner: ['Propia y pagada', 'Owned outright'], paying: ['Propia, pagándose', 'Owned, being paid for'], renter: ['Rentada', 'Rented'], lent: ['Prestada', 'Lent'], other: ['Otra situación', 'Other'] },
    equip: { cell: ['Teléfono celular', 'Cell phone'], fridge: ['Refrigerador', 'Refrigerator'], washer: ['Lavadora', 'Washing machine'], internet: ['Conexión a internet', 'Internet connection'], vehicle: ['Automóvil, camioneta o pickup', 'Car, van or pickup'], payTv: ['Televisión de paga', 'Pay TV'], computer: ['Computadora', 'Computer'], creditCard: ['Tarjeta de crédito, bancaria o de tienda', 'Credit card, bank or store'], moto: ['Motocicleta', 'Motorcycle'], owner: ['Vivienda propia', 'Own their home'] },
    inc: { trabajo: ['Sueldos y salarios', 'Wages and salaries'], negocio: ['Trabajo independiente y negocios propios', 'Self-employment and own businesses'], otros_trab: ['Otros ingresos del trabajo', 'Other labor income'], jubilacion: ['Jubilaciones y pensiones', 'Retirement pensions'], bene_gob: ['Programas de gobierno', 'Government programs'], remesas: ['Remesas', 'Remittances'],
      otherTransfers: ['Otras transferencias: donativos, becas y en especie', 'Other transfers: gifts, scholarships and in kind'], rentas: ['Renta de la propiedad', 'Property income'], estim_alqu: ['Alquiler estimado de la vivienda propia', 'Estimated rent of the owned home'], donativos: ['Donativos de hogares e instituciones', 'Gifts from households and institutions'], becas: ['Becas', 'Scholarships'] },
    mix: { wages: ['Sueldos y salarios', 'Wages and salaries'], business: ['Trabajo independiente y otros ingresos del trabajo', 'Self-employment and other labor income'], pensions: ['Jubilaciones y pensiones', 'Retirement pensions'], programs: ['Programas de gobierno', 'Government programs'], remittances: ['Remesas', 'Remittances'], otherTransfers: ['Otras transferencias', 'Other transfers'], property: ['Renta de la propiedad', 'Property income'], imputedRent: ['Alquiler estimado de la vivienda propia', 'Estimated rent of the owned home'] },
    spend: { alimentos: ['Alimentos, bebidas y tabaco', 'Food, beverages and tobacco'], transporte: ['Transporte y comunicaciones', 'Transport and communications'], educa_espa: ['Educación y esparcimiento', 'Education and recreation'], vivienda: ['Vivienda y servicios', 'Housing and utilities'], personales: ['Cuidados personales', 'Personal care'], limpieza: ['Artículos y servicios para la casa', 'Household goods and services'],
      vesti_calz: ['Vestido y calzado', 'Clothing and footwear'], salud: ['Salud', 'Health care'], transf_gas: ['Transferencias de gasto', 'Transfers paid'], estim_alqu: ['Uso de la vivienda propia (alquiler estimado)', 'Use of the owned home (estimated rent)'], rest: ['Resto: ahorro, pagos de deuda e ingreso en especie', 'Rest: saving, debt payments and income in kind'],
      ali_dentro: ['Alimentos dentro del hogar', 'Food at home'], ali_fuera: ['Alimentos fuera del hogar', 'Food away from home'], tabaco: ['Tabaco', 'Tobacco'], publico: ['Transporte público', 'Public transport'], foraneo: ['Transporte foráneo', 'Intercity transport'], adqui_vehi: ['Compra de vehículos', 'Vehicle purchases'], combus: ['Combustibles para vehículos', 'Vehicle fuel'], refaccion: ['Refacciones y servicios del vehículo', 'Vehicle parts and service'],
      comunica: ['Comunicaciones', 'Communications'], educacion: ['Educación', 'Education'], esparci: ['Esparcimiento', 'Recreation'], paq_turist: ['Paquetes turísticos', 'Package tours'], alquiler: ['Renta de la vivienda', 'Rent'], pred_cons: ['Predial y conservación', 'Property tax and upkeep'], agua: ['Agua', 'Water'], energia: ['Electricidad y combustibles del hogar', 'Electricity and household fuels'],
      cuida_pers: ['Cuidado personal', 'Personal care'], acces_pers: ['Accesorios personales', 'Personal accessories'], otros_gas: ['Otros gastos', 'Other spending'], otherSpend: ['Todo lo demás', 'Everything else'] },
    fin: { deposito: ['Depósitos en cuentas, tandas y cajas de ahorro', 'Deposits in accounts and savings clubs'], pago_tarje: ['Pagos de tarjeta de crédito', 'Credit card payments'], cuota_viv: ['Cuotas de la vivienda propia', 'Installments on the owned home'], deudas: ['Pagos de otras deudas', 'Payments on other debts'], mater_serv: ['Materiales y servicios para reparar o ampliar la vivienda', 'Materials and services to repair or extend the home'],
      balance: ['Pérdidas de negocios del hogar', 'Losses of household businesses'], prest_terc: ['Préstamos a terceros', 'Loans to others'], otras_erog: ['Otras erogaciones', 'Other outlays'], retiro_inv: ['Retiros de ahorros, inversiones y tandas', 'Withdrawals of savings, investments and savings clubs'], prestamos: ['Préstamos recibidos', 'Loans received'], otras_perc: ['Otras percepciones', 'Other receipts'], inKind: ['Percepciones de capital en especie', 'Capital receipts in kind'] },
    part: { bankCons: ['Consumo: bancos', 'Consumer: banks'], otherCons: ['Consumo: otros intermediarios', 'Consumer: other lenders'], bankViv: ['Vivienda: bancos', 'Housing: banks'], infonavit: ['Vivienda: Infonavit', 'Housing: Infonavit'], fovissste: ['Vivienda: Fovissste', 'Housing: Fovissste'], otherViv: ['Vivienda: otros intermediarios', 'Housing: other lenders'] },
    prod: { card: ['Tarjetas de crédito', 'Credit cards'], payroll: ['Nómina', 'Payroll loans'], personal: ['Personales', 'Personal loans'], auto: ['Automotriz', 'Auto loans'], goods: ['Otros bienes muebles', 'Other durable goods'], other: ['Otros', 'Other'], housing: ['Vivienda', 'Housing'], consumer: ['Consumo, total', 'All consumer credit'] },
    enifCredit: { storeCard: ['Tarjeta de tienda departamental o de autoservicio', 'Department-store or supermarket card'], bankCard: ['Tarjeta de crédito bancaria', 'Bank credit card'], housing: ['Crédito de vivienda', 'Housing loan'], personal: ['Crédito personal', 'Personal loan'], payroll: ['Crédito de nómina', 'Payroll loan'], group: ['Crédito grupal', 'Group loan'], auto: ['Crédito automotriz', 'Auto loan'], online: ['Crédito por internet o aplicación', 'Online or app loan'],
      family: ['Préstamo de familiares', 'Loan from family'], friends: ['Préstamo de amistades o conocidos', 'Loan from friends or acquaintances'], savingsClub: ['Caja de ahorro del trabajo o de conocidos', 'Savings club at work or among acquaintances'], pawn: ['Casa de empeño', 'Pawnshop'] },
    acct: { payroll: ['Cuenta de nómina', 'Payroll account'], savings: ['Cuenta de ahorro', 'Savings account'], benefits: ['Cuenta para apoyos de gobierno', 'Account for government benefits'], app: ['Cuenta por internet o aplicación, no bancaria', 'Online or app account, non-bank'], pension: ['Cuenta de pensión', 'Pension account'], checking: ['Cuenta de cheques', 'Checking account'], term: ['Depósito a plazo fijo', 'Term deposit'], fund: ['Fondo de inversión', 'Investment fund'] },
    isave: { home: ['Guardó dinero en su casa', 'Kept money at home'], tanda: ['Participó en una tanda', 'Took part in a tanda (rotating savings group)'], savingsClub: ['Caja de ahorro del trabajo o de conocidos', 'Savings club at work or among acquaintances'], family: ['Guardó dinero con familiares o conocidos', 'Kept money with family or acquaintances'], goods: ['Compró animales o bienes', 'Bought animals or goods'], lending: ['Prestó dinero', 'Lent money'] },
    coping: { cutSpending: ['Redujo sus gastos', 'Cut spending'], family: ['Pidió prestado a familiares o conocidos', 'Borrowed from family or acquaintances'], savings: ['Usó sus ahorros', 'Used savings'], extraWork: ['Adelanto de sueldo, horas extra o trabajo temporal', 'Wage advance, overtime or temporary work'], pawn: ['Vendió o empeñó un bien', 'Sold or pawned something'], credit: ['Usó tarjeta de crédito o pidió un crédito', 'Used a credit card or took a loan'], latePayment: ['Se atrasó en el pago de un crédito', 'Fell behind on a loan'] },
    cushion: { lt1w: ['Menos de una semana o sin ahorros', 'Less than a week, or no savings'], lt1m: ['De una semana a menos de un mes', 'A week to under a month'], lt3m: ['De uno a menos de tres meses', 'One to under three months'], lt6m: ['De tres a menos de seis meses', 'Three to under six months'], gte6m: ['Seis meses o más', 'Six months or more'] },
    reject: { bureau: ['Problemas con el buró de crédito', 'Problems with the credit bureau'], noHistory: ['No tenía historial crediticio', 'No credit history'], income: ['Ingresos insuficientes o no comprobables', 'Insufficient or unverifiable income'], documents: ['Pedían documentos que no tenía', 'Missing documents'], noCollateral: ['Falta de garantía, fiador o aval', 'No collateral or guarantor'], other: ['Otra razón', 'Other reason'] },
    xfGroup: { p0_20: ['20% inferior', 'Bottom 20%'], p20_40: ['20 a 40', '20 to 40'], p40_60: ['40 a 60', '40 to 60'], p60_80: ['60 a 80', '60 to 80'], p80_90: ['80 a 90', '80 to 90'], p90_95: ['90 a 95', '90 to 95'], p95_100: ['5% superior', 'Top 5%'] },
    xfAsset: { household: ['Menaje de casa', 'Household goods'], home: ['Vivienda principal', 'Main home'], vehicle: ['Vehículos', 'Vehicles'], otherProperty: ['Otras propiedades', 'Other properties'], business: ['Negocios', 'Businesses'], other: ['Otros activos', 'Other assets'],
      retirement: ['Ahorro para el retiro', 'Retirement savings'], payroll: ['Tarjeta de nómina o pensión', 'Payroll or pension card'], informal: ['Ahorro informal', 'Informal savings'], benefits: ['Cuenta de apoyos de gobierno', 'Government benefits account'], formal: ['Ahorro formal: cuentas de ahorro y de cheques', 'Formal savings: savings and checking accounts'], termFunds: ['Depósitos a plazo y fondos de inversión', 'Term deposits and investment funds'], lifeInsurance: ['Seguro de vida capitalizable', 'Cash-value life insurance'] },
    xfDebt: { card: ['Tarjeta de crédito', 'Credit card'], otherLoans: ['Otros: familiares, grupales, empeño, cajas de ahorro', 'Other: family, group loans, pawn, savings clubs'], payrollPersonal: ['Crédito de nómina o personal', 'Payroll or personal loan'], vehicle: ['Crédito para vehículos', 'Vehicle loan'] },
    emergency: { family: ['Préstamo de familiares, amigos o conocidos', 'Loan from family, friends or acquaintances'], sellOrPawn: ['Venta o empeño de algún bien', 'Selling or pawning something'], wageAdvance: ['Adelanto de sueldo', 'Wage advance'], savings: ['Ahorros', 'Savings'], bankCredit: ['Crédito bancario', 'Bank credit'] },
    pov: { extreme: ['Pobreza extrema', 'Extreme poverty'], moderate: ['Pobreza moderada', 'Moderate poverty'], vulnerableDeprivation: ['Vulnerable por carencias sociales', 'Vulnerable: social deprivations'], vulnerableIncome: ['Vulnerable por ingresos', 'Vulnerable: income'], notPoor: ['No pobre y no vulnerable', 'Not poor and not vulnerable'] },
    giro: { bigBox: ['Grandes superficies', 'Big-box stores'], retail: ['Ventas al detalle', 'Retail'], other: ['Otros', 'Other'], gas: ['Gasolineras', 'Gas stations'], aggregators: ['Agregadores de pagos', 'Payment aggregators'], misc: ['Misceláneos', 'Miscellaneous'], hardware: ['Refacciones y ferretería', 'Auto parts and hardware'], restaurants: ['Restaurantes', 'Restaurants'], entertainment: ['Entretenimiento', 'Entertainment'],
      government: ['Gobierno', 'Government'], fastFood: ['Comida rápida', 'Fast food'], pharmacies: ['Farmacias', 'Pharmacies'], telecom: ['Telecomunicaciones', 'Telecommunications'], insurance: ['Aseguradoras', 'Insurers'], airlines: ['Transporte aéreo', 'Airlines'], universities: ['Colegios y universidades', 'Colleges and universities'], groundTransport: ['Transporte terrestre de pasajeros', 'Ground passenger transport'],
      doctors: ['Médicos y dentistas', 'Doctors and dentists'], hotels: ['Hoteles', 'Hotels'], schools: ['Educación básica', 'Basic education'], travel: ['Agencias de viajes', 'Travel agencies'], hospitals: ['Hospitales', 'Hospitals'], charity: ['Beneficencia', 'Charity'], beauty: ['Salones de belleza', 'Beauty salons'], tolls: ['Peaje', 'Tolls'], carRental: ['Renta de autos', 'Car rental'], parking: ['Estacionamientos', 'Parking'],
      supermarkets: ['Supermercados', 'Supermarkets'], daycare: ['Guarderías', 'Daycare'], undefined: ['No definido', 'Not defined'], rest: ['Los demás giros', 'All other categories'] },
    srcShort: { enigh: ['INEGI, Encuesta Nacional de Ingresos y Gastos de los Hogares (ENIGH)', 'INEGI, National Survey of Household Income and Expenditure (ENIGH)'], informality: ['INEGI, Encuesta Nacional de Ocupación y Empleo (ENOE)', 'INEGI, National Survey of Occupation and Employment (ENOE)'], poverty: ['INEGI, medición de la pobreza multidimensional', 'INEGI, multidimensional poverty measurement'],
      statesBanxico: ['Banco de México, remesas y crédito bancario a la vivienda por estado', 'Banco de México, remittances and bank housing credit by state'], accounts: ['INEGI, Cuentas Nacionales', 'INEGI, National Accounts'], consumption: ['INEGI, Indicador Mensual del Consumo Privado', 'INEGI, Monthly Indicator of Private Consumption'], remittances: ['Banco de México, remesas familiares', 'Banco de México, family remittances'],
      cardPayments: ['Banco de México, pagos con tarjeta por giro del comercio', 'Banco de México, card payments by type of merchant'], financing: ['Banco de México, financiamiento total a los hogares', 'Banco de México, total financing to households'], bankCredit: ['Banco de México, crédito de la banca comercial a los hogares', 'Banco de México, commercial bank credit to households'],
      rates: ['Banco de México, indicadores básicos de crédito', 'Banco de México, basic credit indicators'], cardsInForce: ['Banco de México, sistemas de pago de bajo valor', 'Banco de México, retail payment systems'], bis: ['Banco de Pagos Internacionales (BIS), crédito a los hogares', 'Bank for International Settlements (BIS), credit to households'], lending: ['Banco de México, encuesta a bancos sobre el mercado de crédito (EnBan)', 'Banco de México, bank lending survey (EnBan)'],
      enif: ['INEGI y CNBV, Encuesta Nacional de Inclusión Financiera (ENIF)', 'INEGI and CNBV, National Survey of Financial Inclusion (ENIF)'], enfih: ['INEGI y Banco de México, Encuesta Nacional sobre las Finanzas de los Hogares (ENFIH)', 'INEGI and Banco de México, National Survey of Household Finances (ENFIH)'], savings: ['Banco de México, agregados monetarios y fondos de ahorro', 'Banco de México, monetary aggregates and savings funds'],
      wages: ['Banco de México e INEGI, salario mínimo y remuneraciones medias reales', 'Banco de México and INEGI, minimum wage and average real pay'], enoe: ['INEGI, ENOE, ocupados por nivel de ingresos', 'INEGI, ENOE, workers by income level'] }
  };
  // shorter names where the flow diagram has no room for the full ones
  N.flowL = { otherTransfers: ['Otras transferencias', 'Other transfers'], negocio: ['Trabajo independiente y negocios', 'Self-employment and businesses'], estim_alqu: ['Alquiler estimado, vivienda propia', 'Estimated rent, owned home'] };
  N.flowR = { rest: ['Resto: ahorro, deudas, en especie', 'Rest: saving, debts, in kind'], estim_alqu: ['Uso de la vivienda propia', 'Use of the owned home'] };
  var nm = function (map, k) { var x = N[map][k]; return x ? tr(x[0], x[1]) : k; };
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  var dl = function (i) { return ROMAN[i]; }, dT = function (i) { return tr('Decil ', 'Decile ') + ROMAN[i]; };
  var ageS = function (k) { return String(k).replace('-', '–'); };
  var pesoAxis = function (v) { return (v < 0 ? '−' : '') + UI.cur() + (Math.abs(v) >= 1000 ? UI.nf(Math.abs(v) / 1000, Math.abs(v) % 1000 ? 1 : 0) + (UI.lang === 'en' ? 'K' : ' mil') : UI.nf(Math.abs(v), 0)); };
  var pctAxis = function (v) { return v + '%'; };
  var st = function (v, l, kind) { return '<div class="stat"><div class="v num">' + v + '</div><div class="l">' + l + ' ' + UI.kind(kind || 'R') + '</div></div>'; };
  var yoyTxt = function (v) { return v == null ? '' : UI.signed(v) + tr(' real anual', ' real y/y'); };
  var qLabel = function (q) { return UI.date(q); };
  var moreLess = function (a, b, es, en) { return a > b ? tr(es[0], en[0]) : a < b ? tr(es[1], en[1]) : tr(es[2], en[2]); };

  // ---------- provenance: source lines, "data through", freshness ----------
  function fresh(id) { var s = D.sources[id]; if (!s || !s.asOf || !s.allowDays || !window.FNAM_PROV) return null; return window.FNAM_PROV.freshness(s.asOf, { days: s.allowDays }, 'mx'); }
  function srcLine(id) {
    var s = D.sources[id]; if (!s) return '';
    var f = fresh(id), late = f && f.level === 'amber';
    return tr('Fuente: ', 'Source: ') + '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(nm('srcShort', id)) + ' ↗</a>' + (s.via ? tr(' (vía FRED)', ' (through FRED)') : '') + ' · ' + UI.through(s.asOf) +
      (s.stored ? UI.amber(tr('dato guardado', 'stored value'), tr('La última descarga de esta fuente falló; se muestra el último dato obtenido.', 'The last download of this source failed; the last value obtained is shown.')) : '') +
      (late && s.publisherChecked ? ' · <span class="chk">' + tr('lo más reciente que publica la fuente, verificado el ', 'the latest the source publishes, checked ') + UI.date(s.publisherChecked) + '</span>'
        : late ? UI.amber(tr('sin actualización reciente', 'no recent update'), tr('La fuente no ha publicado un periodo más nuevo dentro de su calendario habitual.', 'The source has not published a newer period within its usual calendar.')) : '');
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
    [['enigh', tr('Ingreso y gasto de los hogares', 'Household income and spending')], ['poverty', tr('Pobreza', 'Poverty')], ['bankCredit', tr('Crédito bancario', 'Bank credit')], ['financing', tr('Financiamiento a hogares', 'Household financing')], ['enif', tr('Inclusión financiera', 'Financial inclusion')], ['enfih', tr('Riqueza', 'Wealth')]]
      .forEach(function (p) { var s = D.sources[p[0]]; if (s) parts.push(p[1] + ': <b>' + UI.through(s.asOf) + '</b>'); });
    $('asofRow').innerHTML = parts.map(function (p) { return '<span>' + p + '</span>'; }).join('');
    var dot = document.querySelector('[data-status-dot]'); if (dot && D.generatedAt) dot.setAttribute('data-status-time', D.generatedAt);
    $('legendTop').innerHTML = window.FNAM_PROV ? window.FNAM_PROV.legend(UI.lang) : '';
    var stored = Object.keys(D.sources).filter(function (k) { return D.sources[k].stored; });
    var warn = $('dataWarn');
    if (stored.length) { warn.hidden = false; warn.innerHTML = tr('La última descarga falló para: ', 'The last download failed for: ') + stored.map(function (k) { return esc(nm('srcShort', k)); }).join('; ') + tr('. Se muestran los últimos datos obtenidos, con su fecha.', '. The last data obtained are shown, with their date.'); } else warn.hidden = true;

    var k = [];
    var tile = function (lbl, val, unit, delta, kind) { k.push('<div class="kpi"><div class="lbl">' + lbl + '</div><div class="val">' + val + (unit ? '<span class="unit"> ' + unit + '</span>' : '') + '</div><div class="delta">' + delta + '</div><div class="delta">' + UI.kind(kind) + '</div></div>'); };
    var F = D.funds, I = D.income, P = D.poverty, C = D.credit, B = D.bank, X = D.enfih;
    if (F && F.consGdp) tile(tr('Consumo de los hogares', 'Household consumption'), UI.pct(F.consGdp.v), tr('del PIB', 'of GDP'), tr('Cuatro trimestres a ', 'Four quarters to ') + UI.date(F.consGdp.asOf) + ' · ' + UI.bill(F.consGdp.cons) + tr(' al año', ' a year'), 'C');
    if (I) { var h = I.history, ch = h.length > 1 ? (last(h).medianReal / h[h.length - 2].medianReal - 1) * 100 : null; tile(tr('Ingreso mediano del hogar', 'Median household income'), UI.peso(I.median), tr('al mes', 'a month'), I.asOf + (ch != null ? ' · ' + UI.signed(ch) + tr(' real vs. ', ' real vs. ') + h[h.length - 2].year : '') + ' · ' + tr('promedio ', 'mean ') + UI.peso(I.mean), 'C'); }
    if (P) { var n = P.national.poverty, i = n.length - 1; tile(tr('Población en pobreza', 'People in poverty'), UI.pct(n[i]), '', P.asOf + ' · ' + UI.pct(n[i - 1]) + tr(' en ', ' in ') + P.years[i - 1] + (P.people ? ' · ' + UI.mill(P.people[i]) + tr(' de personas', ' people') : ''), 'R'); }
    if (C) tile(tr('Deuda de los hogares', 'Household debt'), UI.cur() + UI.nf(C.total / 1000, 2), tr('billones', 'trillion'), UI.date(C.asOf) + (C.gdpShare != null ? ' · ' + UI.pct(C.gdpShare) + tr(' del PIB', ' of GDP') : '') + (C.yoyReal.total != null ? ' · ' + yoyTxt(C.yoyReal.total) : ''), 'R');
    if (B) tile(tr('Cartera vencida de consumo', 'Past-due consumer loans'), UI.pct(B.imor.consumer, 2), tr('de la cartera', 'of the portfolio'), UI.date(B.imorAsOf) + ' · ' + UI.pct(B.imor.consumerYearAgo, 2) + tr(' un año antes', ' a year earlier') + ' · ' + tr('banca comercial', 'commercial banks'), 'C');
    if (X) tile(tr('Riqueza neta mediana del hogar', 'Median household net worth'), UI.thou(X.totals.median, 0), '', X.asOf + ' · ' + tr('el 10% más rico tiene ', 'the top 10% hold ') + UI.pct(X.top10) + tr(' del total', ' of the total'), 'R');
    $('kpiStrip').innerHTML = k.join('');
  }

  // =====================================================================================================================
  // 01 At a glance (composed)
  // =====================================================================================================================
  function shareOf(arr, from, to) { return sum(arr.slice(from, to)); }
  function kFacts() {
    var K = D.kshape; if (!K) return null;
    var a = K.income[0], b = last(K.income), g = b.map(function (v, i) { return (v / a[i] - 1) * 100; });
    var W = D.wages, wi = W ? W.months.indexOf('2018-12') : -1;
    return { y0: K.years[0], y1: last(K.years), g: g, g1: g[0], g10: g[9], top10: [K.share[0][9], last(K.share)[9]], bot40: [shareOf(K.share[0], 0, 4), shareOf(last(K.share), 0, 4)], gini: [K.gini[0], last(K.gini)], ratio: [K.ratio[0], last(K.ratio)],
      mw: W && wi >= 0 ? (last(W.minWage) / W.minWage[wi] - 1) * 100 : null, pay: W && wi >= 0 ? (last(W.avgPay) / W.avgPay[wi] - 1) * 100 : null, wAsOf: W ? W.asOf : null };
  }
  function glance() {
    var pts = [], d = D.demo, I = D.income, F = D.funds, Q = D.deciles, C = D.credit, B = D.bank, E = D.enif, P = D.poverty, X = D.enfih, T = D.states;
    if (d) pts.push(bi(
      'Hay <b>' + UI.mill(d.households) + ' de hogares</b> y ' + UI.mill(d.pop) + ' de personas (' + d.asOf + '). La edad mediana es de ' + UI.nf(d.medianAge, 0) + ' años; el ' + UI.pct(d.equip.owner) + ' de los hogares vive en vivienda propia y el ' + UI.pct(by(d.hhTypes, 'alone').n / d.households * 100) + ' son personas que viven solas.' + (d.informality ? ' El <b>' + UI.pct(d.informality.v) + '</b> de quienes trabajan lo hace en la informalidad (' + UI.date(d.informality.asOf) + ').' : ''),
      'There are <b>' + UI.mill(d.households) + ' households</b> and ' + UI.mill(d.pop) + ' people (' + d.asOf + '). The median age is ' + UI.nf(d.medianAge, 0) + '; ' + UI.pct(d.equip.owner) + ' of households live in a home they own and ' + UI.pct(by(d.hhTypes, 'alone').n / d.households * 100) + ' are people living alone.' + (d.informality ? ' <b>' + UI.pct(d.informality.v) + '</b> of those who work do so informally (' + UI.date(d.informality.asOf) + ').' : '')));
    if (I) { var sh = I.deciles.share, b40 = shareOf(sh, 0, 4);
      pts.push(bi(
        'El hogar típico recibe <b>' + UI.peso(I.median) + ' al mes</b> (mediana de ' + I.asOf + '; el promedio es de ' + UI.peso(I.mean) + '). El 10% de hogares de mayor ingreso recibe el <b>' + UI.pct(sh[9]) + '</b> del ingreso de todos los hogares y el 40% de menor ingreso, el ' + UI.pct(b40) + '; el decil más alto gana ' + UI.nf(I.deciles.mean[9] / I.deciles.mean[0], 1) + ' veces lo que el más bajo.',
        'The typical household receives <b>' + UI.peso(I.median) + ' a month</b> (' + I.asOf + ' median; the mean is ' + UI.peso(I.mean) + '). The top 10% of households by income receive <b>' + UI.pct(sh[9]) + '</b> of all household income and the bottom 40% receive ' + UI.pct(b40) + '; the highest decile earns ' + UI.nf(I.deciles.mean[9] / I.deciles.mean[0], 1) + ' times what the lowest does.')); }
    if (F) { var m = last(F.mix), fd = by(F.spend, 'alimentos');
      pts.push(bi(
        'De cada peso de ingreso de los hogares, <b>' + UI.nf(m.labor, 0) + ' centavos</b> vienen del trabajo, ' + UI.nf(m.pensions, 0) + ' de jubilaciones, ' + UI.nf(m.programs, 0) + ' de programas de gobierno y ' + UI.nf(m.remittances, 0) + ' de remesas (' + F.asOf + '). El hogar promedio gasta ' + UI.peso(F.spending) + ' al mes en consumo; el <b>' + UI.pct(fd.pct, 0) + '</b> de ese gasto es comida.' + (F.consGdp ? ' En las cuentas nacionales, el consumo de los hogares equivale al ' + UI.pct(F.consGdp.v) + ' del PIB.' : ''),
        'Of every peso of household income, <b>' + UI.nf(m.labor, 0) + ' centavos</b> come from work, ' + UI.nf(m.pensions, 0) + ' from retirement pensions, ' + UI.nf(m.programs, 0) + ' from government programs and ' + UI.nf(m.remittances, 0) + ' from remittances (' + F.asOf + '). The average household spends ' + UI.peso(F.spending) + ' a month on consumption; <b>' + UI.pct(fd.pct, 0) + '</b> of that is food.' + (F.consGdp ? ' In the national accounts, household consumption equals ' + UI.pct(F.consGdp.v) + ' of GDP.' : ''))); }
    if (Q) { var s = Q.spendShare, t20 = s[8] + s[9], bb = shareOf(s, 0, 4);
      pts.push(bi(
        'El 20% de hogares de mayor ingreso hace el <b>' + UI.pct(t20, 0) + '</b> del gasto de consumo y el 40% de menor ingreso, el ' + UI.pct(bb, 0) + ' (' + Q.asOf + '). Lo básico (comida en casa, vivienda y servicios, salud, transporte público y combustible) absorbe el <b>' + UI.pct(Q.basics[0], 0) + '</b> del gasto del decil más bajo y el ' + UI.pct(Q.basics[9], 0) + ' del más alto.',
        'The top 20% of households by income do <b>' + UI.pct(t20, 0) + '</b> of consumer spending and the bottom 40% do ' + UI.pct(bb, 0) + ' (' + Q.asOf + '). Basics (food at home, housing and utilities, health care, public transport and fuel) take <b>' + UI.pct(Q.basics[0], 0) + '</b> of the lowest decile\'s spending and ' + UI.pct(Q.basics[9], 0) + ' of the highest\'s.')); }
    if (C && B) { var R = D.rates;
      pts.push(bi(
        'Los hogares deben <b>' + UI.money(C.total) + '</b> (' + UI.date(C.asOf) + ')' + (C.gdpShare != null ? ', el ' + UI.pct(C.gdpShare) + ' del PIB' : '') + ': ' + UI.pct(C.housing / C.total * 100, 0) + ' es crédito a la vivienda. El crédito bancario al consumo crece ' + UI.pct(B.consumerYoyReal) + ' real anual' + (R ? ' y las tarjetas cobran en promedio <b>' + UI.pct(R.latest.cardRev.v) + '</b> a quienes no pagan el total cada mes' : '') + '.' + (E ? ' El <b>' + UI.pct(E.all.anyCredit) + '</b> de los adultos tiene un crédito formal; el ' + UI.pct(E.all.onlyInformalCredit) + ' solo se ha endeudado con familiares, amistades, cajas o casas de empeño (' + E.asOf + ').' : ''),
        'Households owe <b>' + UI.money(C.total) + '</b> (' + UI.date(C.asOf) + ')' + (C.gdpShare != null ? ', ' + UI.pct(C.gdpShare) + ' of GDP' : '') + ': ' + UI.pct(C.housing / C.total * 100, 0) + ' is housing credit. Bank consumer credit is growing ' + UI.pct(B.consumerYoyReal) + ' a year in real terms' + (R ? ' and cards charge an average of <b>' + UI.pct(R.latest.cardRev.v) + '</b> to those who do not pay in full each month' : '') + '.' + (E ? ' <b>' + UI.pct(E.all.anyCredit) + '</b> of adults have formal credit; ' + UI.pct(E.all.onlyInformalCredit) + ' have borrowed only from family, friends, savings clubs or pawnshops (' + E.asOf + ').' : ''))); }
    if (B && E) { var c = E.all.cushion, under = c.lt1w + c.lt1m;
      pts.push(bi(
        'La tensión está en el ingreso más que en el tamaño de la deuda: la cartera vencida de consumo en los bancos es de <b>' + UI.pct(B.imor.consumer, 2) + '</b> (' + UI.pct(B.imor.consumerYearAgo, 2) + ' un año antes), pero al <b>' + UI.pct(E.all.notEnough) + '</b> de los adultos no le alcanzó lo que ganó para cubrir sus gastos, el ' + UI.pct(under, 0) + ' no cubriría un mes de gastos con sus ahorros y el ' + UI.pct(E.all.lateAny) + ' de quienes tienen crédito se atrasó en algún pago en un año (' + E.asOf + ').' + (Q ? ' El ' + UI.pct(Q.overspend.all, 0) + ' de los hogares gasta más de lo que gana.' : ''),
        'The strain is in income more than in the size of the debt: past-due consumer loans at banks are <b>' + UI.pct(B.imor.consumer, 2) + '</b> (' + UI.pct(B.imor.consumerYearAgo, 2) + ' a year earlier), but for <b>' + UI.pct(E.all.notEnough) + '</b> of adults what they earned did not cover their expenses, ' + UI.pct(under, 0) + ' could not cover a month of expenses with their savings and ' + UI.pct(E.all.lateAny) + ' of those with credit fell behind on a payment within a year (' + E.asOf + ').' + (Q ? ' ' + UI.pct(Q.overspend.all, 0) + ' of households spend more than they earn.' : ''))); }
    if (P) { var n = P.national.poverty, i = n.length - 1, hi = null, lo = null;
      if (T) T.list.forEach(function (x) { if (x.poverty == null) return; if (!hi || x.poverty > hi.poverty) hi = x; if (!lo || x.poverty < lo.poverty) lo = x; });
      pts.push(bi(
        'El <b>' + UI.pct(n[i]) + '</b> de la población vive en pobreza (' + P.asOf + '), frente al ' + UI.pct(n[0]) + ' en ' + P.years[0] + '; el ' + UI.pct(P.national.extreme[i]) + ', en pobreza extrema.' + (hi && lo ? ' Por estado va de ' + UI.pct(hi.poverty) + ' en ' + esc(hi.name) + ' a ' + UI.pct(lo.poverty) + ' en ' + esc(lo.name) + '.' : '') + ' El ' + UI.pct(P.national.noSocialSecurity[i], 0) + ' de la población carece de acceso a la seguridad social.',
        '<b>' + UI.pct(n[i]) + '</b> of the population lives in poverty (' + P.asOf + '), against ' + UI.pct(n[0]) + ' in ' + P.years[0] + '; ' + UI.pct(P.national.extreme[i]) + ' in extreme poverty.' + (hi && lo ? ' By state it runs from ' + UI.pct(hi.poverty) + ' in ' + esc(hi.name) + ' to ' + UI.pct(lo.poverty) + ' in ' + esc(lo.name) + '.' : '') + ' ' + UI.pct(P.national.noSocialSecurity[i], 0) + ' of the population lacks access to social security.')); }
    if (X) { var home = by(X.assetValue, 'home');
      pts.push(bi(
        'La única medición oficial de la riqueza es de ' + X.asOf + ': los hogares tenían <b>' + UI.bill(X.totals.netWorth) + '</b> de riqueza neta, ' + UI.nf(X.totals.gdpMultiple, 1) + ' veces el PIB. El hogar típico tenía ' + UI.thou(X.totals.median, 0) + ' (mediana) frente a un promedio de ' + UI.thou(X.totals.mean, 0) + '; el 10% más rico concentraba el <b>' + UI.pct(X.top10) + '</b> y el 40% con menos, el ' + UI.pct(X.bottom40) + '. La vivienda principal es el ' + UI.pct(home.share, 0) + ' del valor de los activos no financieros.',
        'The only official measurement of wealth is from ' + X.asOf + ': households held <b>' + UI.bill(X.totals.netWorth) + '</b> of net worth, ' + UI.nf(X.totals.gdpMultiple, 1) + ' times GDP. The typical household had ' + UI.thou(X.totals.median, 0) + ' (median) against a mean of ' + UI.thou(X.totals.mean, 0) + '; the wealthiest 10% held <b>' + UI.pct(X.top10) + '</b> and the 40% with least held ' + UI.pct(X.bottom40) + '. The main home is ' + UI.pct(home.share, 0) + ' of the value of non-financial assets.')); }
    var kf = kFacts();
    if (kf) pts.push(bi(
      (kf.g1 > kf.g10 ? 'En la encuesta de hogares, los ingresos de abajo crecieron más que los de arriba: entre ' : 'En la encuesta de hogares, los ingresos de arriba crecieron más que los de abajo: entre ') + kf.y0 + ' y ' + kf.y1 + ' el ingreso real del decil más bajo ' + (kf.g1 >= 0 ? 'creció' : 'cayó') + ' <b>' + UI.pct(Math.abs(kf.g1), 0) + '</b> y el del más alto ' + (kf.g10 >= 0 ? 'creció' : 'cayó') + ' ' + UI.pct(Math.abs(kf.g10), 0) + '; la parte del ingreso del 10% superior pasó del ' + UI.pct(kf.top10[0]) + ' al ' + UI.pct(kf.top10[1]) + '.' + (kf.mw != null ? ' El salario mínimo real subió ' + UI.pct(kf.mw, 0) + ' desde diciembre de 2018 y la remuneración media real, ' + UI.pct(kf.pay, 0) + '.' : '') + (X ? ' La riqueza está más concentrada que el ingreso: el 10% más rico tenía el ' + UI.pct(X.top10) + ' (' + X.asOf + ').' : ''),
      (kf.g1 > kf.g10 ? 'In the household survey, incomes at the bottom grew faster than those at the top: between ' : 'In the household survey, incomes at the top grew faster than those at the bottom: between ') + kf.y0 + ' and ' + kf.y1 + ' the real income of the lowest decile ' + (kf.g1 >= 0 ? 'grew' : 'fell') + ' <b>' + UI.pct(Math.abs(kf.g1), 0) + '</b> and that of the highest ' + (kf.g10 >= 0 ? 'grew' : 'fell') + ' ' + UI.pct(Math.abs(kf.g10), 0) + '; the top 10%\'s share of income went from ' + UI.pct(kf.top10[0]) + ' to ' + UI.pct(kf.top10[1]) + '.' + (kf.mw != null ? ' The real minimum wage has risen ' + UI.pct(kf.mw, 0) + ' since December 2018 and average real pay ' + UI.pct(kf.pay, 0) + '.' : '') + (X ? ' Wealth is more concentrated than income: the wealthiest 10% held ' + UI.pct(X.top10) + ' (' + X.asOf + ').' : '')));
    var cs = companySummary(); if (cs) pts.push(cs);
    $('glance').innerHTML = pts.map(function (p, i) { return '<div class="pt"><span class="ix">' + (i + 1) + '</span><div>' + p + '</div></div>'; }).join('');
  }

  // =====================================================================================================================
  // 02 Demographics
  // =====================================================================================================================
  function demographics() {
    var d = D.demo; if (!d) return;
    var share = function (n, base) { return n / base * 100; };
    var hs = (by(d.edu, 'highSchool').n + by(d.edu, 'college').n) / d.pop25 * 100;
    $('demoStats').innerHTML = [st(UI.nf(d.pop / 1e6, 1) + ' M', tr('Población', 'Population')), st(UI.nf(d.households / 1e6, 1) + ' M', tr('Hogares', 'Households')), st(UI.nf(d.hhSize, 2), tr('Personas por hogar', 'People per household')), st(UI.nf(d.medianAge, 0), tr('Edad mediana, años', 'Median age, years')),
      st(UI.pct(d.equip.owner), tr('Hogares en vivienda propia', 'Households in a home they own')), st(UI.pct(d.headWomen), tr('Hogares encabezados por una mujer', 'Households headed by a woman'), 'C'), st(UI.pct(hs), tr('Personas de 25+ con preparatoria o más', 'People 25+ with high school or more'), 'C'),
      d.informality ? st(UI.pct(d.informality.v), tr('Trabajadores en la informalidad, ', 'Workers in informal jobs, ') + UI.date(d.informality.asOf)) : ''].join('');
    UI.bar('chAge', { labels: d.age.map(function (a) { return ageS(a.k); }), tipTitle: function (i) { return nm('age', d.age[i].k) + tr(' años', ''); }, data: d.age.map(function (a) { return a.n / 1e6; }), fmt: function (v, i) { return UI.nf(v, 1) + ' M' + (i != null ? ' · ' + UI.pct(share(d.age[i].n, d.pop)) : ''); }, axisFmt: function (v) { return v + ' M'; }, valueLabels: function (v, i) { return UI.pct(share(d.age[i].n, d.pop), 0); }, aria: tr('Población por grupo de edad', 'Population by age group') });
    UI.table('chAge', [tr('Edad', 'Age'), tr('Personas', 'People'), '%'], d.age.map(function (a) { return [nm('age', a.k), UI.nf(a.n), UI.pct(share(a.n, d.pop))]; }));
    UI.bar('chEdu', { horizontal: true, labels: d.edu.map(function (a) { return nm('edu', a.k); }), data: d.edu.map(function (a) { return share(a.n, d.pop25); }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, valueLabels: true });
    UI.table('chEdu', [tr('Nivel', 'Level'), tr('Personas', 'People'), '%'], d.edu.map(function (a) { return [nm('edu', a.k), UI.nf(a.n), UI.pct(share(a.n, d.pop25))]; }));
    UI.bar('chHhTypes', { horizontal: true, labels: d.hhTypes.map(function (a) { return nm('hh', a.k); }), data: d.hhTypes.map(function (a) { return share(a.n, d.households); }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, valueLabels: true, catSize: 10.5 });
    UI.table('chHhTypes', [tr('Tipo', 'Type'), tr('Hogares', 'Households'), '%'], d.hhTypes.map(function (a) { return [nm('hh', a.k), UI.nf(a.n), UI.pct(share(a.n, d.households))]; }));
    UI.bar('chLocality', { horizontal: true, labels: d.locality.map(function (a) { return nm('loc', a.k); }), data: d.locality.map(function (a) { return share(a.n, d.households); }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, valueLabels: true, catSize: 10.5 });
    UI.table('chLocality', [tr('Tamaño de la localidad', 'Size of the locality'), tr('Hogares', 'Households'), '%', tr('Personas', 'People')], d.locality.map(function (a) { return [nm('loc', a.k), UI.nf(a.n), UI.pct(share(a.n, d.households)), UI.nf(a.persons)]; }));
    UI.bar('chOwnAge', { labels: d.ownerByAge.map(function (a) { return ageS(a.k); }), tipTitle: function (i) { return nm('age', d.ownerByAge[i].k) + tr(' años', ''); }, data: d.ownerByAge.map(function (a) { return a.owner; }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, max: 100, valueLabels: function (v) { return UI.pct(v, 0); }, catSize: 10 });
    UI.table('chOwnAge', [tr('Edad del jefe del hogar', 'Age of the head of household'), tr('Hogares', 'Households'), tr('% en vivienda propia', '% in an owned home')], d.ownerByAge.map(function (a) { return [nm('age', a.k), UI.nf(a.hh), UI.pct(a.owner)]; }));
    UI.bar('chTenure', { horizontal: true, labels: d.tenure.map(function (a) { return nm('tenure', a.k); }), data: d.tenure.map(function (a) { return share(a.n, d.households); }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, valueLabels: true, catSize: 10.5 });
    UI.table('chTenure', [tr('Tenencia', 'Tenure'), tr('Hogares', 'Households'), '%'], d.tenure.map(function (a) { return [nm('tenure', a.k), UI.nf(a.n), UI.pct(share(a.n, d.households))]; }));
    var eq = ['cell', 'fridge', 'washer', 'internet', 'vehicle', 'payTv', 'computer', 'creditCard', 'moto'].filter(function (k) { return d.equip[k] != null; }).sort(function (a, b) { return d.equip[b] - d.equip[a]; });
    UI.bar('chEquip', { horizontal: true, labels: eq.map(function (k) { return nm('equip', k); }), data: eq.map(function (k) { return d.equip[k]; }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, max: 100, valueLabels: true, catSize: 10.5, thickness: 16 });
    UI.table('chEquip', [tr('Bien o servicio', 'Good or service'), tr('% de hogares', '% of households')], eq.map(function (k) { return [nm('equip', k), UI.pct(d.equip[k])]; }));
    var o65 = (by(d.age, '65-74').n + by(d.age, '75+').n) / d.pop * 100, u15 = by(d.age, '0-14').n / d.pop * 100, yo = d.ownerByAge[1], ol = last(d.ownerByAge), big = by(d.locality, 'big');
    $('demoCallout').innerHTML = bi(
      '<b>Para leer al consumidor:</b> el ' + UI.pct(u15) + ' de la población tiene menos de 15 años y el ' + UI.pct(o65) + ' tiene 65 o más; el ' + UI.pct(share(big.n, d.households), 0) + ' de los hogares vive en localidades de 100 mil habitantes o más y el ' + UI.pct(share(by(d.locality, 'rural').n, d.households), 0) + ', en localidades rurales. La vivienda: ' + UI.pct(yo.owner, 0) + ' de los hogares de ' + nm('age', yo.k) + ' años y ' + UI.pct(ol.owner, 0) + ' de los de ' + nm('age', ol.k) + ' viven en casa propia; el ' + UI.pct(d.rent.share) + ' renta, con una renta mediana de ' + UI.peso(d.rent.median) + ' al mes, y el <b>' + UI.pct(d.rent.burden30, 0) + '</b> de quienes rentan destina 30% o más de su ingreso a ella. ' + UI.kind('C'),
      '<b>Reading the consumer:</b> ' + UI.pct(u15) + ' of the population is under 15 and ' + UI.pct(o65) + ' is 65 or older; ' + UI.pct(share(big.n, d.households), 0) + ' of households live in localities of 100,000 people or more and ' + UI.pct(share(by(d.locality, 'rural').n, d.households), 0) + ' in rural ones. Housing: ' + UI.pct(yo.owner, 0) + ' of households aged ' + nm('age', yo.k) + ' and ' + UI.pct(ol.owner, 0) + ' of those ' + nm('age', ol.k) + ' live in a home they own; ' + UI.pct(d.rent.share) + ' rent, with a median rent of ' + UI.peso(d.rent.median) + ' a month, and <b>' + UI.pct(d.rent.burden30, 0) + '</b> of renters spend 30% or more of their income on it. ' + UI.kind('C'));
  }

  // =====================================================================================================================
  // 03 Income
  // =====================================================================================================================
  function income() {
    var I = D.income; if (!I) return;
    var stats = [st(UI.peso(I.mean), tr('Ingreso promedio del hogar al mes (', 'Mean household income a month (') + UI.peso(I.meanQ) + tr(' al trimestre, cifra publicada)', ' a quarter, as published)'), 'C'), st(UI.peso(I.median), tr('Ingreso mediano del hogar al mes', 'Median household income a month'), 'C'),
      st(UI.peso(I.perCapita.mean), tr('Ingreso promedio por persona al mes', 'Mean income per person a month'), 'C'), st(UI.nf(I.gini, 3), tr('Coeficiente de Gini (0 = igualdad total)', 'Gini coefficient (0 = full equality)')), st(UI.nf(I.giniNoT, 3), tr('Gini sin transferencias', 'Gini without transfers')), st(UI.pct(I.top1), tr('del ingreso lo recibe el 1% de hogares de mayor ingreso', 'of income goes to the top 1% of households'), 'C')];
    $('incomeStats').innerHTML = stats.join('');
    var H = I.history, ys = H.map(function (h) { return h.year; });
    $('capIncHist').innerHTML = bi('Ingreso corriente por hogar, pesos al mes; las cifras reales están a precios de ' + I.base + ' ' + UI.kind('C'), 'Current income per household, pesos a month; real figures are at ' + I.base + ' prices ' + UI.kind('C'));
    UI.line('chIncHist', { labels: ys, datasets: [{ label: tr('Promedio, real', 'Mean, real'), data: H.map(function (h) { return h.meanReal; }), color: S(1), points: true }, { label: tr('Mediana, real', 'Median, real'), data: H.map(function (h) { return h.medianReal; }), color: S(3), points: true }, { label: tr('Promedio, pesos corrientes', 'Mean, current pesos'), data: H.map(function (h) { return h.mean; }), color: S(2), points: true, dash: [5, 4] }], fmt: function (v) { return UI.peso(v); }, axisFmt: pesoAxis, min: 0 });
    UI.legend('chIncHist', [{ c: S(1), l: tr('Promedio, pesos de ', 'Mean, pesos of ') + I.base, line: 1 }, { c: S(3), l: tr('Mediana, pesos de ', 'Median, pesos of ') + I.base, line: 1 }, { c: S(2), l: tr('Promedio, pesos corrientes', 'Mean, current pesos'), line: 1 }]);
    UI.table('chIncHist', [tr('Edición', 'Edition'), tr('Promedio, corrientes', 'Mean, current'), tr('Promedio, real', 'Mean, real'), tr('Mediana, real', 'Median, real'), tr('Por persona, real', 'Per person, real'), 'Gini', tr('Personas por hogar', 'People per household')], H.slice().reverse().map(function (h) { return [h.year, UI.peso(h.mean), UI.peso(h.meanReal), UI.peso(h.medianReal), UI.peso(h.perCapitaReal), UI.nf(h.gini, 3), UI.nf(h.hhSize, 2)]; }));
    var bl = function (b) { return b.hi == null ? '≥ ' + b.lo / 1000 : b.lo / 1000 + '–' + b.hi / 1000; };
    UI.bar('chBrackets', { labels: I.brackets.map(bl), data: I.brackets.map(function (b) { return b.n / 1e6; }), fmt: function (v, i) { return UI.nf(v, 1) + ' M' + (i != null ? ' · ' + UI.pct(I.brackets[i].n / I.households * 100) : ''); }, axisFmt: function (v) { return v + ' M'; }, valueLabels: function (v, i) { return UI.pct(I.brackets[i].n / I.households * 100, 0); }, catSize: 10, tipTitle: function (i) { return UI.cur() + bl(I.brackets[i]) + tr(' mil al mes', 'K a month'); } });
    UI.table('chBrackets', [tr('Ingreso mensual (miles de pesos)', 'Monthly income (thousands of pesos)'), tr('Hogares', 'Households'), '%'], I.brackets.map(function (b) { return [bl(b), UI.nf(b.n), UI.pct(b.n / I.households * 100)]; }));
    var q = I.deciles;
    UI.bar('chDecileMeans', { labels: ROMAN, data: q.mean, colors: q.mean.map(function (_, i) { return i === 9 ? S(1) : UI.css('--seq-3'); }), fmt: function (v) { return UI.peso(v); }, axisFmt: pesoAxis, valueLabels: function (v) { return UI.pesoK(v, v >= 10000 ? 0 : 1); }, tipTitle: dT });
    UI.table('chDecileMeans', [tr('Decil', 'Decile'), tr('Ingreso promedio al mes', 'Mean income a month'), tr('Límite superior', 'Upper limit'), tr('% del ingreso', '% of income'), tr('Personas por hogar', 'People per household'), tr('Ingreso por persona', 'Income per person')], q.mean.map(function (v, i) { return [dT(i), UI.peso(v), i < 9 ? UI.peso(I.limits[i]) : '—', UI.pct(q.share[i]), UI.nf(q.size[i], 2), UI.peso(q.perCapita[i])]; }));
    var g3 = [{ l: tr('40% de menor ingreso (deciles I a IV)', 'Bottom 40% (deciles I to IV)'), v: shareOf(q.share, 0, 4), c: UI.css('--seq-2') }, { l: tr('50% intermedio (deciles V a IX)', 'Middle 50% (deciles V to IX)'), v: shareOf(q.share, 4, 9), c: UI.css('--seq-4') }, { l: tr('10% de mayor ingreso (decil X)', 'Top 10% (decile X)'), v: q.share[9], c: UI.css('--seq-6') }];
    $('incomeShares').innerHTML = '<div class="flow-bars" style="display:block"><div class="bar" style="height:26px;margin-top:16px">' + g3.map(function (g) { return '<i style="background:' + g.c + ';flex:' + g.v + ' 1 0" title="' + esc(g.l + ': ' + UI.pct(g.v)) + '"></i>'; }).join('') + '</div><ul>' +
      g3.map(function (g) { return '<li><span class="sw" style="background:' + g.c + '"></span><span class="nm">' + g.l + '</span><span class="vl">' + UI.pct(g.v) + tr(' del ingreso', ' of income') + '</span></li>'; }).join('') + '</ul></div>';
    $('incomeCallout').innerHTML = bi(
      'Un hogar entra al 10% de mayor ingreso a partir de <b>' + UI.peso(I.limits[8]) + ' al mes</b>, y al 1%, desde ' + UI.peso(I.pctl.p99) + '. El 5% superior recibe el ' + UI.pct(I.top5) + ' del ingreso y el 1%, el ' + UI.pct(I.top1) + '. Sin las transferencias (jubilaciones, programas de gobierno, remesas y apoyos entre hogares) el Gini sería de ' + UI.nf(I.giniNoT, 3) + ' en lugar de ' + UI.nf(I.gini, 3) + '. ' + UI.kind('C'),
      'A household enters the top 10% by income at <b>' + UI.peso(I.limits[8]) + ' a month</b>, and the top 1% at ' + UI.peso(I.pctl.p99) + '. The top 5% receive ' + UI.pct(I.top5) + ' of income and the top 1% receive ' + UI.pct(I.top1) + '. Without transfers (pensions, government programs, remittances and support between households) the Gini would be ' + UI.nf(I.giniNoT, 3) + ' instead of ' + UI.nf(I.gini, 3) + '. ' + UI.kind('C'));
    var rows = [], push = function (fam, label, x, color) { rows.push({ fam: fam, label: label, v: x.mean, med: x.median, color: color }); };
    I.byAge.forEach(function (a) { push(tr('Edad', 'Age'), nm('age', a.k), a, S(1)); });
    I.bySex.forEach(function (a) { push(tr('Sexo', 'Sex'), nm('sex', a.k), a, S(5)); });
    I.byEdu.forEach(function (a) { push(tr('Escolaridad', 'Schooling'), nm('edu', a.k), a, S(3)); });
    I.byLocality.forEach(function (a) { push(tr('Localidad', 'Locality'), nm('loc', a.k), a, S(2)); });
    UI.bar('chIncGroups', { horizontal: true, labels: rows.map(function (r) { return r.label; }), data: rows.map(function (r) { return r.v; }), colors: rows.map(function (r) { return r.color; }), fmt: function (v, i) { return UI.peso(v) + (i != null && rows[i].med != null ? tr(' · mediana ', ' · median ') + UI.peso(rows[i].med) : ''); }, axisFmt: pesoAxis, valueLabels: function (v) { return UI.pesoK(v, 1); }, catSize: 10.5, thickness: 14, tipTitle: function (i) { return rows[i].fam + ': ' + rows[i].label; } });
    UI.legend('chIncGroups', [{ c: S(1), l: tr('Edad del jefe del hogar', 'Age of the head of household') }, { c: S(5), l: tr('Sexo del jefe del hogar', 'Sex of the head of household') }, { c: S(3), l: tr('Escolaridad del jefe del hogar', 'Schooling of the head of household') }, { c: S(2), l: tr('Tamaño de la localidad', 'Size of the locality') }]);
    UI.table('chIncGroups', [tr('Grupo', 'Group'), tr('Categoría', 'Category'), tr('Promedio al mes', 'Mean a month'), tr('Mediana al mes', 'Median a month')], rows.map(function (r) { return [r.fam, r.label, UI.peso(r.v), r.med == null ? '—' : UI.peso(r.med)]; }).concat([[tr('Todos', 'All'), tr('Todos los hogares', 'All households'), UI.peso(I.mean), UI.peso(I.median)]]));
    var rc = I.receive.slice().sort(function (a, b) { return b.pct - a.pct; });
    UI.bar('chReceive', { horizontal: true, labels: rc.map(function (a) { return nm('inc', a.k); }), data: rc.map(function (a) { return a.pct; }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, valueLabels: true, catSize: 10.5, thickness: 16 });
    UI.table('chReceive', [tr('Tipo de ingreso', 'Type of income'), tr('% de hogares que lo recibe', '% of households receiving it')], rc.map(function (a) { return [nm('inc', a.k), UI.pct(a.pct)]; }));
    var mEdu = I.byEdu, coll = by(mEdu, 'college'), none = by(mEdu, 'none'), men = by(I.bySex, 'men'), wom = by(I.bySex, 'women');
    $('receiveCallout').innerHTML = bi(
      'El ' + UI.pct(by(I.receive, 'bene_gob').pct, 0) + ' de los hogares recibe algún programa de gobierno y el ' + UI.pct(by(I.receive, 'negocio').pct, 0) + ' tiene ingresos de un negocio propio o trabajo independiente. Un hogar encabezado por alguien con licenciatura gana ' + UI.nf(coll.mean / none.mean, 1) + ' veces lo que uno cuyo jefe no terminó la primaria. Los hogares encabezados por mujeres ganan ' + UI.pct(Math.abs(1 - wom.mean / men.mean) * 100, 0) + ' ' + (wom.mean < men.mean ? 'menos' : 'más') + ' y tienen ' + UI.nf(wom.size, 1) + ' integrantes frente a ' + UI.nf(men.size, 1) + ': por persona, ' + UI.peso(wom.perCapita) + ' frente a ' + UI.peso(men.perCapita) + '. ' + UI.kind('C'),
      UI.pct(by(I.receive, 'bene_gob').pct, 0) + ' of households receive a government program and ' + UI.pct(by(I.receive, 'negocio').pct, 0) + ' have income from an own business or self-employment. A household headed by someone with a college degree earns ' + UI.nf(coll.mean / none.mean, 1) + ' times what one whose head did not finish primary school earns. Households headed by women earn ' + UI.pct(Math.abs(1 - wom.mean / men.mean) * 100, 0) + ' ' + (wom.mean < men.mean ? 'less' : 'more') + ' and have ' + UI.nf(wom.size, 1) + ' members against ' + UI.nf(men.size, 1) + ': per person, ' + UI.peso(wom.perCapita) + ' against ' + UI.peso(men.perCapita) + '. ' + UI.kind('C'));
    incomeMap();
  }
  var pF = function (v) { return UI.pct(v); };
  function incomeMap() {
    var T = D.states; if (!T) return;
    var pesoF = function (v) { return UI.peso(v); }, kF = function (v) { return UI.pesoK(v, 1); }, sF = function (v) { return UI.signed(v); };
    var M = [
      { id: 'mean', label: tr('Ingreso promedio del hogar al mes', 'Mean household income a month'), btn: tr('Promedio del hogar', 'Household mean'), get: function (s) { return s.mean; }, us: T.mx.mean, fmt: pesoF, short: kF, kind: 'C', src: 'enigh' },
      { id: 'median', label: tr('Ingreso mediano del hogar al mes', 'Median household income a month'), btn: tr('Mediana del hogar', 'Household median'), get: function (s) { return s.median; }, us: T.mx.median, fmt: pesoF, short: kF, kind: 'C', src: 'enigh' },
      { id: 'perCapita', label: tr('Ingreso promedio por persona al mes', 'Mean income per person a month'), btn: tr('Por persona', 'Per person'), get: function (s) { return s.perCapita; }, us: T.mx.perCapita, fmt: pesoF, short: kF, kind: 'C', src: 'enigh' },
      { id: 'growth', label: tr('Crecimiento real del ingreso promedio, ', 'Real growth of mean income, ') + T.first + '–' + T.asOf, btn: tr('Crecimiento real desde ', 'Real growth since ') + T.first, get: function (s) { return s.growth; }, us: T.mx.growth, fmt: sF, kind: 'C', src: 'enigh' },
      { id: 'gini', label: tr('Coeficiente de Gini del ingreso de los hogares', 'Gini coefficient of household income'), btn: tr('Desigualdad (Gini)', 'Inequality (Gini)'), get: function (s) { return s.gini; }, us: T.mx.gini, fmt: function (v) { return UI.nf(v, 3); }, kind: 'C', src: 'enigh' },
      { id: 'transferShare', label: tr('Transferencias como parte del ingreso', 'Transfers as a share of income'), btn: tr('Peso de las transferencias', 'Weight of transfers'), get: function (s) { return s.transferShare; }, us: T.mx.transferShare, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'programsHH', label: tr('Hogares que reciben programas de gobierno', 'Households receiving government programs'), btn: tr('Programas de gobierno', 'Government programs'), get: function (s) { return s.programsHH; }, us: T.mx.programsHH, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'remitHH', label: tr('Hogares que reciben remesas', 'Households receiving remittances'), btn: tr('Hogares con remesas', 'Households with remittances'), get: function (s) { return s.remitHH; }, us: T.mx.remitHH, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'remitPerHH', label: tr('Remesas por hogar del estado, dólares al año', 'Remittances per household of the state, U.S. dollars a year'), btn: tr('Remesas por hogar', 'Remittances per household'), get: function (s) { return s.remitPerHH; }, us: T.mx.remitPerHH, fmt: function (v) { return UI.usd(v); }, kind: 'C', src: 'statesBanxico' }
    ].filter(function (m) { return T.list.some(function (s) { return m.get(s) != null; }); });
    var notes = {
      mean: bi('Ingreso corriente total del estado entre su número de hogares; lo elevan los ingresos más altos, por eso supera a la mediana. Pesos al mes de ' + T.asOf + '.', 'Total current income of the state divided by its number of households; the highest incomes pull it up, which is why it exceeds the median. Pesos a month, ' + T.asOf + '.'),
      median: bi('La mitad de los hogares del estado gana más y la mitad gana menos. Pesos al mes de ' + T.asOf + '.', 'Half of the state\'s households earn more and half earn less. Pesos a month, ' + T.asOf + '.'),
      perCapita: bi('Ingreso corriente del estado entre su población: descuenta que los hogares son más grandes en unos estados que en otros. Pesos al mes de ' + T.asOf + '.', 'Current income of the state divided by its population: it allows for households being larger in some states than in others. Pesos a month, ' + T.asOf + '.'),
      growth: bi('Variación del ingreso promedio por hogar entre la encuesta de ' + T.first + ' y la de ' + T.asOf + ', descontada la inflación nacional. La muestra de un estado es menor que la nacional, así que los cambios pequeños no son concluyentes.', 'Change in mean household income between the ' + T.first + ' and the ' + T.asOf + ' surveys, net of national inflation. A state\'s sample is smaller than the national one, so small changes are not conclusive.'),
      gini: bi('0 = todos los hogares ganan lo mismo; 1 = un hogar recibe todo el ingreso. Calculado con los diez deciles de hogares de cada estado, como lo hace el INEGI a nivel nacional. ' + T.asOf + '.', '0 = every household earns the same; 1 = one household receives all income. Computed on the ten deciles of households of each state, the way INEGI does nationally. ' + T.asOf + '.'),
      transferShare: bi('Jubilaciones, programas de gobierno, remesas, becas y apoyos de otros hogares, como porcentaje del ingreso corriente. ' + T.asOf + '.', 'Pensions, government programs, remittances, scholarships and support from other households, as a percent of current income. ' + T.asOf + '.'),
      programsHH: bi('Porcentaje de hogares con ingresos por programas de gobierno en el trimestre de la encuesta. ' + T.asOf + '.', 'Share of households with income from government programs in the survey quarter. ' + T.asOf + '.'),
      remitHH: bi('Porcentaje de hogares que recibieron dinero de otros países en el trimestre de la encuesta. ' + T.asOf + '.', 'Share of households that received money from abroad in the survey quarter. ' + T.asOf + '.'),
      remitPerHH: bi('Remesas recibidas en el estado en los cuatro trimestres a ' + qLabel(T.remitAsOf) + ' (Banco de México) entre el número de hogares del estado (ENIGH ' + T.asOf + ').', 'Remittances received in the state in the four quarters to ' + qLabel(T.remitAsOf) + ' (Banco de México) divided by the number of households of the state (ENIGH ' + T.asOf + ').')
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
    var stats = [st(UI.peso(F.income), tr('Ingreso corriente por hogar al mes', 'Current income per household a month'), 'C'), st(UI.peso(F.monetaryIncome), tr('de ese ingreso es dinero (sin alquiler estimado ni especie)', 'of that income is money (no estimated rent, nothing in kind)'), 'C'), st(UI.peso(F.spending), tr('Gasto monetario en consumo al mes', 'Monetary spending on consumption a month'), 'C'),
      st(UI.pct(F.spending / F.monetaryIncome * 100, 0), tr('del ingreso en dinero se gasta en consumo', 'of money income is spent on consumption'), 'C')];
    if (F.consGdp) stats.push(st(UI.pct(F.consGdp.v), tr('Consumo privado como parte del PIB, cuatro trimestres a ', 'Private consumption as a share of GDP, four quarters to ') + UI.date(F.consGdp.asOf), 'C'));
    if (F.remittances) stats.push(st(UI.usd(F.remittances.latest12, 1) + tr(' mil M', 'B'), tr('Remesas en 12 meses a ', 'Remittances in the 12 months to ') + UI.date(F.remittances.asOf), 'C'));
    $('fundsStats').innerHTML = stats.join('');
    // flow: where current income comes from and what it is used for
    var gcol = { labor: S(1), transfers: S(2), property: S(3), imputed: NEUTRAL(), consumption: S(5), rest: S(6) };
    var sg = { trabajo: 'labor', negocio: 'labor', otros_trab: 'labor', jubilacion: 'transfers', bene_gob: 'transfers', remesas: 'transfers', otherTransfers: 'transfers', rentas: 'property', estim_alqu: 'imputed' };
    var left = F.sources.map(function (x) { return { label: N.flowL[x.k] ? nm('flowL', x.k) : nm('inc', x.k), v: x.v, color: gcol[sg[x.k]] }; });
    var right = F.uses.map(function (x) { return { label: N.flowR[x.k] ? nm('flowR', x.k) : nm('spend', x.k), v: x.v, color: x.k === 'rest' ? gcol.rest : x.k === 'estim_alqu' ? gcol.imputed : gcol.consumption }; });
    var rest = by(F.uses, 'rest');
    $('capFlow').innerHTML = bi(
      'Hogar promedio, ' + F.asOf + ', pesos al mes y porcentaje del ingreso corriente (' + UI.peso(F.income) + '). El alquiler estimado de la vivienda propia cuenta como ingreso y como uso por el mismo monto: no es dinero. "Resto" es lo que no se gasta en consumo monetario (' + UI.peso(rest.v) + '): ahorro, pagos de deuda, compra y mejora de vivienda, y el ingreso recibido en especie. ' + UI.kind('C'),
      'Average household, ' + F.asOf + ', pesos a month and percent of current income (' + UI.peso(F.income) + '). The estimated rent of the owned home counts as income and as a use for the same amount: it is not money. "Rest" is what is not spent on monetary consumption (' + UI.peso(rest.v) + '): saving, debt payments, buying and improving a home, and income received in kind. ' + UI.kind('C'));
    UI.flow({ el: 'flowSvg', bars: 'flowBars', left: left, right: right, fmt: function (v) { return UI.peso(v); }, headL: tr('Fuentes', 'Sources'), headR: tr('Usos', 'Uses'), aria: tr('Fuentes y usos del ingreso corriente de los hogares', 'Sources and uses of household current income') });
    UI.table('flow', [tr('Concepto', 'Item'), tr('Pesos al mes', 'Pesos a month'), tr('% del ingreso', '% of income')],
      [['<b>' + tr('Fuentes', 'Sources') + '</b>', '', '']].concat(F.sources.map(function (x) { return [nm('inc', x.k), UI.nf(x.v), UI.pct(x.pct)]; })).concat([['<b>' + tr('Usos', 'Uses') + '</b>', '', '']]).concat(F.uses.map(function (x) { return [nm('spend', x.k), UI.nf(x.v), UI.pct(x.pct)]; })).concat([[tr('Total de cada lado', 'Total of each side'), UI.nf(F.income), '100.0%']]));
    // by edition
    var MK = ['wages', 'business', 'pensions', 'programs', 'remittances', 'otherTransfers', 'property', 'imputedRent'], mc = { wages: S(1), business: S(7), pensions: S(2), programs: S(4), remittances: S(5), otherTransfers: S(8), property: S(3), imputedRent: NEUTRAL() };
    var sets = MK.map(function (k) { return { label: nm('mix', k), color: mc[k], data: F.mix.map(function (m) { return m[k]; }) }; });
    UI.bar('chSrcHist', { labels: F.years, stacked: true, datasets: sets, fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, max: 100, thickness: 44 });
    UI.legend('chSrcHist', sets.map(function (x) { return { c: x.color, l: x.label }; }));
    UI.table('chSrcHist', [tr('Edición', 'Edition')].concat(sets.map(function (x) { return x.label; })), F.years.map(function (y, i) { return [y].concat(sets.map(function (x) { return UI.pct(x.data[i]); })); }).reverse());
    var UK = F.spend.map(function (x) { return x.k; }), uc = [S(1), S(2), S(3), S(4), S(5), S(6), S(7), S(8), NEUTRAL()];
    var usets = UK.map(function (k, i) { return { label: nm('spend', k), color: uc[i], data: F.useMix.map(function (m) { return m[k]; }) }; });
    UI.bar('chUseHist', { labels: F.years, stacked: true, datasets: usets, fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, max: 100, thickness: 44 });
    UI.legend('chUseHist', usets.map(function (x) { return { c: x.color, l: x.label }; }));
    UI.table('chUseHist', [tr('Edición', 'Edition')].concat(usets.map(function (x) { return x.label; })), F.years.map(function (y, i) { return [y].concat(usets.map(function (x) { return UI.pct(x.data[i]); })); }).reverse());
    // what households buy: the detailed lines, colored by their group
    var gc = {}; UK.forEach(function (k, i) { gc[k] = uc[i]; });
    var lines = F.detail.map(function (x) { return { k: x.k, g: x.g, v: x.v, pct: x.pct }; }).concat(['limpieza', 'vesti_calz', 'salud', 'transf_gas'].map(function (k) { var x = by(F.spend, k); return { k: k, g: k, v: x.v, pct: x.pct }; })).filter(function (x) { return x.pct >= 0.25; }).sort(function (a, b) { return b.v - a.v; });
    $('capBuy').innerHTML = bi('Gasto monetario del hogar promedio por rubro, ' + F.asOf + ', porcentaje del gasto (' + UI.peso(F.spending) + ' al mes); el color indica el grupo de gasto ' + UI.kind('C'), 'Monetary spending of the average household by line, ' + F.asOf + ', percent of spending (' + UI.peso(F.spending) + ' a month); color shows the spending group ' + UI.kind('C'));
    UI.bar('chBuy', { horizontal: true, labels: lines.map(function (x) { return nm('spend', x.k); }), data: lines.map(function (x) { return x.pct; }), colors: lines.map(function (x) { return gc[x.g]; }), fmt: function (v, i) { return UI.pct(v) + (i != null ? ' · ' + UI.peso(lines[i].v) + tr(' al mes', ' a month') : ''); }, axisFmt: pctAxis, valueLabels: function (v) { return UI.pct(v); }, catSize: 10.5, thickness: 15, tipTitle: function (i) { return nm('spend', lines[i].k) + ' (' + nm('spend', lines[i].g) + ')'; } });
    var used = {}; lines.forEach(function (x) { used[x.g] = 1; });
    UI.legend('chBuy', UK.filter(function (k) { return used[k]; }).map(function (k) { return { c: gc[k], l: nm('spend', k) }; }));
    UI.table('chBuy', [tr('Rubro', 'Line'), tr('Grupo', 'Group'), tr('Pesos al mes', 'Pesos a month'), '%'], lines.map(function (x) { return [nm('spend', x.k), nm('spend', x.g), UI.nf(x.v), UI.pct(x.pct)]; }));
    // financial flows
    var fo = F.finOut.filter(function (x) { return x.v > 0; }), fi = F.finIn.filter(function (x) { return x.v > 0; });
    var fl = fo.map(function (x) { return { l: nm('fin', x.k), v: x.v, recv: x.recv, c: S(6) }; }).concat(fi.map(function (x) { return { l: nm('fin', x.k), v: x.v, recv: x.recv, c: S(4) }; }));
    $('capFinFlows').innerHTML = bi('Lo que el hogar promedio aparta o paga además del consumo (' + UI.peso(F.finOutTotal) + ' al mes) y lo que recibe que no es ingreso corriente (' + UI.peso(F.finInTotal) + '), ' + F.asOf + ', pesos al mes ' + UI.kind('C'), 'What the average household sets aside or pays besides consumption (' + UI.peso(F.finOutTotal) + ' a month) and what it receives that is not current income (' + UI.peso(F.finInTotal) + '), ' + F.asOf + ', pesos a month ' + UI.kind('C'));
    UI.bar('chFinFlows', { horizontal: true, labels: fl.map(function (x) { return x.l; }), data: fl.map(function (x) { return x.v; }), colors: fl.map(function (x) { return x.c; }), fmt: function (v, i) { return UI.peso(v) + (i != null && fl[i].recv != null ? ' · ' + UI.pct(fl[i].recv) + tr(' de los hogares', ' of households') : ''); }, axisFmt: pesoAxis, valueLabels: function (v) { return UI.peso(v); }, catSize: 10.5, thickness: 14 });
    UI.legend('chFinFlows', [{ c: S(6), l: tr('Salidas: ahorro, pagos de deuda y vivienda', 'Outflows: saving, debt payments and housing') }, { c: S(4), l: tr('Entradas: retiros de ahorro y préstamos', 'Inflows: savings withdrawn and loans') }]);
    UI.table('chFinFlows', [tr('Concepto', 'Item'), tr('Pesos al mes, promedio de todos los hogares', 'Pesos a month, average of all households'), tr('% de hogares con ese movimiento', '% of households with that flow')], fl.map(function (x) { return [x.l, UI.nf(x.v), x.recv == null ? '—' : UI.pct(x.recv)]; }));
    var m0 = F.mix[0], m1 = last(F.mix), dep = by(F.finOut, 'deposito'), card = by(F.finOut, 'pago_tarje');
    $('fundsCallout').innerHTML = bi(
      '<b>Cambio de fondo:</b> los programas de gobierno pasaron del ' + UI.pct(m0.programs) + ' del ingreso de los hogares en ' + F.years[0] + ' al <b>' + UI.pct(m1.programs) + '</b> en ' + last(F.years) + ', y las jubilaciones, del ' + UI.pct(m0.pensions) + ' al ' + UI.pct(m1.pensions) + '; el trabajo aporta el ' + UI.pct(m1.labor) + '. El ' + UI.pct(dep.recv, 0) + ' de los hogares depositó dinero en una cuenta, tanda o caja de ahorro y el ' + UI.pct(card.recv, 0) + ' pagó una tarjeta de crédito en el trimestre de la encuesta. ' + UI.kind('C'),
      '<b>The structural shift:</b> government programs went from ' + UI.pct(m0.programs) + ' of household income in ' + F.years[0] + ' to <b>' + UI.pct(m1.programs) + '</b> in ' + last(F.years) + ', and retirement pensions from ' + UI.pct(m0.pensions) + ' to ' + UI.pct(m1.pensions) + '; work provides ' + UI.pct(m1.labor) + '. ' + UI.pct(dep.recv, 0) + ' of households put money into an account or savings club and ' + UI.pct(card.recv, 0) + ' paid a credit card in the survey quarter. ' + UI.kind('C'));
    // the economy's side
    var X = F.indicator;
    if (X) {
      var idx = [{ k: 'total', id: 'consTotal', l: tr('Total', 'Total'), c: UI.css('--text-primary') }, { k: 'goods', id: 'consGoods', l: tr('Bienes nacionales', 'Domestic goods'), c: S(1) }, { k: 'services', id: 'consServices', l: tr('Servicios nacionales', 'Domestic services'), c: S(3) }, { k: 'imported', id: 'consImported', l: tr('Bienes importados', 'Imported goods'), c: S(2) }];
      $('capIndicator').innerHTML = bi('Índice de volumen, 2018 = 100, series desestacionalizadas. A ' + UI.date(X.asOf) + ': total ' + UI.signed(X.yoy.consTotal) + ' anual; bienes importados ' + UI.signed(X.vs2019.consImported, 0) + ' frente al promedio de 2019 y servicios nacionales ' + UI.signed(X.vs2019.consServices, 0) + '.', 'Volume index, 2018 = 100, seasonally adjusted. To ' + UI.date(X.asOf) + ': total ' + UI.signed(X.yoy.consTotal) + ' y/y; imported goods ' + UI.signed(X.vs2019.consImported, 0) + ' against the 2019 average and domestic services ' + UI.signed(X.vs2019.consServices, 0) + '.');
      UI.line('chIndicator', { labels: X.months.map(function (m) { return m.slice(0, 4); }), datasets: idx.map(function (s) { return { label: s.l, data: X[s.k], color: s.c, width: s.k === 'total' ? 2.6 : 1.8 }; }), fmt: function (v) { return UI.nf(v, 1); }, xTicks: 9 });
      UI.charts.chIndicator.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(X.months[it[0].dataIndex]); }; UI.charts.chIndicator.update();
      UI.legend('chIndicator', idx.map(function (s) { return { c: s.c, l: s.l, line: 1 }; }));
      UI.table('chIndicator', [tr('Componente', 'Component'), UI.date(X.asOf), tr('Variación anual', 'Change y/y'), tr('Frente al promedio de 2019', 'Against the 2019 average')], idx.map(function (s) { return [s.l, UI.nf(last(X[s.k]), 1), UI.signed(X.yoy[s.id]), UI.signed(X.vs2019[s.id])]; }));
    }
    var R = F.remittances;
    if (R) {
      $('capRemit').innerHTML = bi('Suma de 12 meses, miles de millones de dólares. A ' + UI.date(R.asOf) + ': ' + UI.usd(R.latest12, 1) + ' mil millones, ' + UI.signed((R.latest12 / R.yearAgo12 - 1) * 100) + ' frente a los 12 meses anteriores ' + UI.kind('C'), '12-month sum, billions of U.S. dollars. To ' + UI.date(R.asOf) + ': ' + UI.usd(R.latest12, 1) + ' billion, ' + UI.signed((R.latest12 / R.yearAgo12 - 1) * 100) + ' against the previous 12 months ' + UI.kind('C'));
      UI.line('chRemit', { labels: R.months.map(function (m) { return m.slice(0, 4); }), datasets: [{ label: tr('Remesas, 12 meses', 'Remittances, 12 months'), data: R.sum12, color: S(5), fill: true }], fmt: function (v) { return UI.usd(v, 1) + tr(' mil millones', ' billion'); }, axisFmt: function (v) { return 'US$' + v; }, min: 0, xTicks: 9 });
      UI.charts.chRemit.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(R.months[it[0].dataIndex]); }; UI.charts.chRemit.update();
      UI.table('chRemit', [tr('12 meses a', '12 months to'), tr('Miles de millones de dólares', 'Billions of U.S. dollars')], R.months.filter(function (m) { return /-12$/.test(m) || m === R.asOf; }).reverse().slice(0, 12).map(function (m) { return [UI.date(m), UI.nf(R.sum12[R.months.indexOf(m)], 1)]; }));
    }
    var CP = D.cardPayments;
    if (CP) {
      var top = CP.giros.filter(function (g) { return g.k !== 'undefined' && g.k !== 'other' && g.k !== 'misc'; }).slice(0, 14), restV = CP.total - sum(top.map(function (g) { return g.v; }));
      var rowsG = top.map(function (g) { return { l: nm('giro', g.k), v: g.v, pct: g.pct, yoy: g.yoy }; }).concat([{ l: nm('giro', 'rest'), v: restV, pct: restV / CP.total * 100, yoy: null }]);
      $('capCardPay').innerHTML = bi('Pagos con tarjetas de crédito y débito por giro del comercio, 12 meses a ' + UI.date(CP.asOf) + ', porcentaje del total (' + UI.money(CP.total) + ', ' + UI.signed(CP.totalYoy) + ' anual' + (CP.totalYoyReal != null ? '; ' + UI.signed(CP.totalYoyReal) + ' real' : '') + ') ' + UI.kind('C'), 'Payments with credit and debit cards by type of merchant, 12 months to ' + UI.date(CP.asOf) + ', percent of the total (' + UI.money(CP.total) + ', ' + UI.signed(CP.totalYoy) + ' y/y' + (CP.totalYoyReal != null ? '; ' + UI.signed(CP.totalYoyReal) + ' real' : '') + ') ' + UI.kind('C'));
      UI.bar('chCardPay', { horizontal: true, labels: rowsG.map(function (x) { return x.l; }), data: rowsG.map(function (x) { return x.pct; }), colors: rowsG.map(function (x, i) { return i === rowsG.length - 1 ? NEUTRAL() : S(1); }), fmt: function (v, i) { return UI.pct(v) + (i != null ? ' · ' + UI.money(rowsG[i].v) + (rowsG[i].yoy != null ? ' · ' + UI.signed(rowsG[i].yoy) + tr(' anual', ' y/y') : '') : ''); }, axisFmt: pctAxis, valueLabels: function (v, i) { return UI.pct(v) + (rowsG[i].yoy != null ? '  ' + UI.signed(rowsG[i].yoy, 0) : ''); }, catSize: 10.5, thickness: 15 });
      UI.table('chCardPay', [tr('Giro', 'Type of merchant'), tr('Miles de millones de pesos, 12 meses', 'Billions of pesos, 12 months'), '%', tr('Variación anual', 'Change y/y')], CP.giros.map(function (g) { return [nm('giro', g.k), UI.nf(g.v, 1), UI.pct(g.pct), g.yoy == null ? '—' : UI.signed(g.yoy)]; }).concat([[tr('Total', 'Total'), UI.nf(CP.total, 1), '100.0%', UI.signed(CP.totalYoy)]]));
    }
  }

  // =====================================================================================================================
  // 05 Spending by income decile
  // =====================================================================================================================
  function deciles() {
    var Q = D.deciles; if (!Q || !D.income || !D.funds) return;
    var s = Q.spendShare;
    $('decStats').innerHTML = [st(UI.peso(D.funds.spending), tr('Gasto monetario promedio por hogar al mes', 'Mean monetary spending per household a month'), 'C'), st(UI.peso(Q.spending[0]) + ' – ' + UI.peso(Q.spending[9]), tr('Gasto del decil I al decil X', 'Spending, decile I to decile X'), 'C'),
      st(UI.nf(Q.spending[9] / Q.spending[0], 1) + '×', tr('Gasto del decil X frente al decil I', 'Decile X spending relative to decile I'), 'C'), st(UI.pct(s[8] + s[9], 0), tr('del gasto total lo hace el 20% superior', 'of all spending is done by the top 20%'), 'C'), st(UI.pct(Q.foodAll, 0), tr('del gasto es comida, bebidas y tabaco', 'of spending is food, beverages and tobacco'), 'C'), st(UI.pct(Q.overspend.all, 0), tr('de los hogares gasta más de lo que gana en dinero', 'of households spend more than their money income'), 'C')].join('');
    UI.bar('chDecSpendInc', { labels: ROMAN, datasets: [{ label: tr('Gasto monetario', 'Monetary spending'), data: Q.spending, color: S(1) }, { label: tr('Ingreso corriente', 'Current income'), data: Q.income, color: S(2) }], fmt: function (v) { return UI.peso(v); }, axisFmt: pesoAxis, thickness: 16, tipTitle: dT });
    UI.legend('chDecSpendInc', [{ c: S(1), l: tr('Gasto monetario al mes', 'Monetary spending a month') }, { c: S(2), l: tr('Ingreso corriente al mes', 'Current income a month') }]);
    UI.table('chDecSpendInc', [tr('Decil', 'Decile'), tr('Gasto', 'Spending'), tr('Ingreso', 'Income'), tr('Gasto ÷ ingreso', 'Spending ÷ income'), tr('Personas por hogar', 'People per household'), tr('Hogares que gastan más de lo que ganan', 'Households spending more than they earn')], Q.spending.map(function (v, i) { return [dT(i), UI.peso(v), UI.peso(Q.income[i]), UI.pct(Q.ratio[i], 0), UI.nf(Q.size[i], 2), UI.pct(Q.overspend.byDecile[i], 0)]; }));
    UI.bar('chDecShare', { labels: ROMAN, data: s, colors: s.map(function (_, i) { return i >= 8 ? S(1) : NEUTRAL(); }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, valueLabels: function (v) { return UI.pct(v, 0); }, tipTitle: dT });
    UI.table('chDecShare', [tr('Decil', 'Decile'), tr('% del gasto total', '% of all spending'), tr('% acumulado', 'Cumulative %'), tr('% del ingreso total', '% of all income')], s.map(function (v, i) { return [dT(i), UI.pct(v), UI.pct(sum(s.slice(0, i + 1))), UI.pct(D.income.deciles.share[i])]; }));
    var gapD = Q.income.map(function (v, i) { return v - Q.spending[i]; }), gapTop = (gapD[8] + gapD[9]) / sum(gapD) * 100;
    var over = Q.ratio.map(function (r, i) { return r >= 100 ? i : -1; }).filter(function (i) { return i >= 0; });
    $('decCallout').innerHTML = bi(
      '<b>' + (s[9] < D.income.deciles.share[9] ? 'El gasto está menos concentrado que el ingreso.' : 'El gasto está tan concentrado como el ingreso.') + '</b> El 20% de hogares de mayor ingreso hace el <b>' + UI.pct(s[8] + s[9], 0) + '</b> del gasto y el decil X solo, el ' + UI.pct(s[9], 0) + ' (recibe el ' + UI.pct(D.income.deciles.share[9], 0) + ' del ingreso); la mitad de menor ingreso hace el ' + UI.pct(sum(s.slice(0, 5)), 0) + '. El decil más bajo gasta el ' + UI.pct(Q.ratio[0], 0) + ' de su ingreso corriente y el más alto, el ' + UI.pct(Q.ratio[9], 0) + '; los dos deciles más altos concentran el ' + UI.pct(gapTop, 0) + ' de la diferencia entre ingreso y gasto de todos los hogares. ' +
      (over.length ? 'En ' + (over.length === 1 ? 'el decil ' + ROMAN[over[0]] : 'los deciles ' + over.map(function (i) { return ROMAN[i]; }).join(' y ')) + ' el gasto en dinero supera al ingreso corriente total, que además incluye ingreso que no es dinero. ' : '') + UI.kind('C'),
      '<b>' + (s[9] < D.income.deciles.share[9] ? 'Spending is less concentrated than income.' : 'Spending is as concentrated as income.') + '</b> The top 20% of households by income do <b>' + UI.pct(s[8] + s[9], 0) + '</b> of spending and decile X alone does ' + UI.pct(s[9], 0) + ' (it receives ' + UI.pct(D.income.deciles.share[9], 0) + ' of income); the lower-income half does ' + UI.pct(sum(s.slice(0, 5)), 0) + '. The lowest decile spends ' + UI.pct(Q.ratio[0], 0) + ' of its current income and the highest spends ' + UI.pct(Q.ratio[9], 0) + '; the two highest deciles account for ' + UI.pct(gapTop, 0) + ' of the difference between the income and the spending of all households. ' +
      (over.length ? 'In decile' + (over.length === 1 ? ' ' + ROMAN[over[0]] : 's ' + over.map(function (i) { return ROMAN[i]; }).join(' and ')) + ' money spending exceeds total current income, which also includes income that is not money. ' : '') + UI.kind('C'));
    heat();
    UI.bar('chBasics', { labels: ROMAN, stacked: true, datasets: [{ label: tr('Básico', 'Basics'), data: Q.basics, color: S(1) }, { label: tr('Todo lo demás', 'Everything else'), data: Q.basics.map(function (v) { return Math.round((100 - v) * 10) / 10; }), color: NEUTRAL() }], fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, max: 100, thickness: 26, tipTitle: dT });
    UI.legend('chBasics', [{ c: S(1), l: tr('Básico: comida en casa, vivienda y servicios, salud, transporte público y combustible', 'Basics: food at home, housing and utilities, health care, public transport and fuel') }, { c: NEUTRAL(), l: tr('Todo lo demás', 'Everything else') }]);
    UI.table('chBasics', [tr('Decil', 'Decile'), tr('Básico, % del gasto', 'Basics, % of spending'), tr('Comida, bebidas y tabaco, % del gasto', 'Food, beverages and tobacco, % of spending')], Q.basics.map(function (v, i) { return [dT(i), UI.pct(v), UI.pct(Q.food[i])]; }).concat([[tr('Todos', 'All'), UI.pct(Q.basicsAll), UI.pct(Q.foodAll)]]));
    var MK = ['wages', 'business', 'pensions', 'programs', 'remittances', 'otherTransfers', 'property', 'imputedRent'], mc = { wages: S(1), business: S(7), pensions: S(2), programs: S(4), remittances: S(5), otherTransfers: S(8), property: S(3), imputedRent: NEUTRAL() };
    var sets = MK.map(function (k) { return { label: nm('mix', k), color: mc[k], data: Q.incomeMix.map(function (m) { return m[k]; }) }; });
    UI.bar('chDecSources', { labels: ROMAN, stacked: true, datasets: sets, fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, max: 100, thickness: 26, tipTitle: dT });
    UI.legend('chDecSources', sets.map(function (x) { return { c: x.color, l: x.label }; }));
    UI.table('chDecSources', [tr('Decil', 'Decile')].concat(sets.map(function (x) { return x.label; })), Q.incomeMix.map(function (m, i) { return [dT(i)].concat(MK.map(function (k) { return UI.pct(m[k]); })); }).concat([[tr('Todos', 'All')].concat(MK.map(function (k) { return UI.pct(Q.incomeMixAll[k]); }))]));
    UI.bar('chAgeSpend', { labels: Q.byAge.map(function (a) { return ageS(a.k); }), tipTitle: function (i) { return nm('age', Q.byAge[i].k) + tr(' años', ''); }, datasets: [{ label: tr('Gasto monetario', 'Monetary spending'), data: Q.byAge.map(function (a) { return a.spending; }), color: S(1) }, { label: tr('Ingreso corriente', 'Current income'), data: Q.byAge.map(function (a) { return a.income; }), color: S(2) }], fmt: function (v) { return UI.peso(v); }, axisFmt: pesoAxis, thickness: 18 });
    UI.legend('chAgeSpend', [{ c: S(1), l: tr('Gasto monetario al mes', 'Monetary spending a month') }, { c: S(2), l: tr('Ingreso corriente al mes', 'Current income a month') }]);
    UI.table('chAgeSpend', [tr('Edad del jefe del hogar', 'Age of the head of household'), tr('Hogares', 'Households'), tr('Gasto', 'Spending'), tr('Ingreso', 'Income')], Q.byAge.map(function (a) { return [nm('age', a.k), UI.nf(a.hh), UI.peso(a.spending), UI.peso(a.income)]; }));
    var OW = [['owner', S(1)], ['vehicle', S(2)], ['internet', S(3)], ['computer', S(7)], ['creditCard', S(5)], ['washer', S(4)]];
    UI.line('chDecOwn', { labels: ROMAN, datasets: OW.map(function (o) { return { label: nm('equip', o[0]), data: Q.own.map(function (x) { return x[o[0]]; }), color: o[1], points: true }; }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, min: 0, max: 100, xTicks: 10 });
    UI.charts.chDecOwn.options.plugins.tooltip.callbacks.title = function (it) { return dT(it[0].dataIndex); }; UI.charts.chDecOwn.update();
    UI.legend('chDecOwn', OW.map(function (o) { return { c: o[1], l: nm('equip', o[0]), line: 1 }; }));
    UI.table('chDecOwn', [tr('Decil', 'Decile')].concat(OW.map(function (o) { return nm('equip', o[0]); })).concat([tr('Vivienda rentada', 'Rented home')]), Q.own.map(function (x, i) { return [dT(i)].concat(OW.map(function (o) { return UI.pct(x[o[0]], 0); })).concat([UI.pct(x.renter, 0)]); }));
  }
  function heat() {
    if (!D.deciles || !D.funds) return;
    var Q = D.deciles, mode = state.heat, compact = window.innerWidth <= 640;   // phones: ten narrow columns, whole numbers, no "All" column (the table view keeps every figure)
    state.heatCompact = compact;
    UI.seg('segHeat', [{ id: 'share', label: tr('% del gasto del decil', '% of the decile\'s spending') }, { id: 'pesos', label: tr('Pesos al mes por hogar', 'Pesos a month per household') }], mode, function (id) { state.heat = id; heat(); });
    $('capHeat').innerHTML = bi('Cada fila es un rubro de gasto y cada columna un decil de ingreso (' + Q.asOf + '). El color compara los deciles dentro de cada fila: el más oscuro es el decil donde ese rubro pesa más. ' + UI.kind('C'),
      'Each row is a spending line and each column an income decile (' + Q.asOf + '). Color compares the deciles within each row: the darkest is the decile where that line weighs most. ' + UI.kind('C'));
    var h = '<thead><tr><th scope="col">' + (compact ? tr('Decil', 'Decile') + ' →' : tr('Rubro', 'Line')) + '</th>' + (compact ? '' : '<th scope="col">' + tr('Todos', 'All') + '</th>') + ROMAN.map(function (r) { return '<th scope="col">' + r + '</th>'; }).join('') + '</tr></thead><tbody>';
    Q.heat.forEach(function (c) {
      var vals = mode === 'share' ? c.pct : c.v, all = mode === 'share' ? c.allPct : c.all, mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      var f = function (v) { return mode === 'share' ? UI.nf(v, compact ? 0 : 1) : UI.nf(v, 0); };
      h += '<tr><td>' + nm('spend', c.k) + '</td>' + (compact ? '' : '<td class="all num">' + f(all) + '</td>') + vals.map(function (v) { var cls = mx > mn ? Math.min(6, Math.floor((v - mn) / (mx - mn) * 7)) : 3, bg = UI.seq(cls); return '<td class="num" style="background:' + bg + ';color:' + UI.inkOn(bg) + '">' + (mode !== 'share' && compact ? UI.nf(v / 1000, 1) : f(v)) + '</td>'; }).join('') + '</tr>';
    });
    h += '<tr class="sep"><td><b>' + (compact ? tr('Gasto total, miles de pesos al mes', 'Total spending, thousands of pesos a month') : tr('Gasto total, pesos al mes', 'Total spending, pesos a month')) + '</b></td>' + (compact ? '' : '<td class="all num">' + UI.nf(D.funds.spending) + '</td>') + Q.spending.map(function (v) { return '<td class="all num">' + (compact ? UI.nf(v / 1000, 1) : UI.nf(v)) + '</td>'; }).join('') + '</tr></tbody>';
    $('heatDeciles').innerHTML = h; $('heatDeciles').classList.toggle('compact', compact);
    var steps = ''; for (var i = 0; i < 7; i++) steps += '<i style="background:' + UI.seq(i) + '"></i>';
    $('scaleHeat').innerHTML = '<span>' + tr('Menor peso en la fila', 'Lowest in the row') + '</span><span class="steps">' + steps + '</span><span>' + tr('Mayor peso en la fila', 'Highest in the row') + '</span><span class="note">' + (mode === 'share' ? tr('Porcentaje del gasto monetario de cada decil', 'Percent of each decile\'s monetary spending') : (compact ? tr('Miles de pesos al mes por hogar', 'Thousands of pesos a month per household') : tr('Pesos al mes por hogar', 'Pesos a month per household'))) + '</span>';
  }

  // =====================================================================================================================
  // 06 Consumer credit
  // =====================================================================================================================
  var GROUPS = [['sex', 'sex', 5], ['age', 'age', 1], ['edu', 'enifEdu', 3], ['locality', 'enifLoc', 2], ['region', 'region', 7]];
  var famName = function (g) { return { sex: tr('Sexo', 'Sex'), age: tr('Edad', 'Age'), edu: tr('Escolaridad', 'Schooling'), locality: tr('Localidad', 'Locality'), region: tr('Región', 'Region') }[g]; };
  // one horizontal bar per group of the inclusion survey, colored by family, for the measure chosen
  function groupChart(id, metric, fmtFn) {
    var E = D.enif, rows = [];
    GROUPS.forEach(function (g) { E.groups[g[0]].forEach(function (x) { var v = metric.get(x); if (v != null) rows.push({ fam: famName(g[0]), label: nm(g[1], x.k) + (g[0] === 'age' ? tr(' años', '') : ''), v: v, color: S(g[2]), n: x.sample }); }); });
    var all = metric.get(E.all);
    rows.unshift({ fam: tr('Total', 'Total'), label: tr('Todos los adultos de 18 a 70 años', 'All adults aged 18 to 70'), v: all, color: UI.css('--text-primary'), n: E.all.sample });
    UI.bar(id, { horizontal: true, labels: rows.map(function (r) { return r.label; }), data: rows.map(function (r) { return r.v; }), colors: rows.map(function (r) { return r.color; }), fmt: fmtFn || pF, axisFmt: pctAxis, valueLabels: fmtFn || pF, catSize: 10.5, thickness: 13, tipTitle: function (i) { return rows[i].fam + ': ' + rows[i].label; } });
    UI.legend(id, [{ c: S(5), l: famName('sex') }, { c: S(1), l: famName('age') }, { c: S(3), l: famName('edu') }, { c: S(2), l: tr('Tamaño de la localidad', 'Size of the locality') }, { c: S(7), l: famName('region') }]);
    UI.table(id, [tr('Grupo', 'Group'), tr('Categoría', 'Category'), esc(metric.label), tr('Personas en la muestra', 'People in the sample')], rows.map(function (r) { return [r.fam, r.label, (fmtFn || pF)(r.v), UI.nf(r.n)]; }));
    return rows;
  }
  function credit() {
    var C = D.credit, B = D.bank, R = D.rates, E = D.enif, K = D.cardsInForce;
    var stats = [];
    if (C) stats.push(st(UI.money(C.total), tr('Financiamiento total a los hogares, ', 'Total financing to households, ') + UI.date(C.asOf)), st(UI.pct(C.gdpShare), tr('del PIB de los últimos cuatro trimestres', 'of GDP of the last four quarters'), 'C'));
    if (D.bis) stats.push(st(UI.pct(D.bis.v), tr('del PIB según el BIS, ', 'of GDP according to the BIS, ') + UI.date(D.bis.asOf)));
    if (B) stats.push(st(UI.signed(B.consumerYoyReal), tr('Crédito bancario al consumo, variación real anual a ', 'Bank consumer credit, real change y/y to ') + UI.date(B.asOf), 'C'));
    if (R) stats.push(st(UI.pct(R.latest.cardRev.v), tr('Tasa promedio de tarjetas para quienes no pagan el total, ', 'Average card rate for those who do not pay in full, ') + UI.date(R.latest.cardRev.asOf)));
    if (K) stats.push(st(UI.nf(K.v, 1) + ' M', tr('Tarjetas de crédito vigentes, ', 'Credit cards in force, ') + UI.date(K.asOf)));
    if (E) stats.push(st(UI.pct(E.all.anyCredit), tr('de los adultos tiene un crédito formal (', 'of adults have formal credit (') + E.asOf + ')'), st(UI.pct(E.all.noCredit), tr('no tiene crédito formal ni informal', 'have neither formal nor informal credit'), 'C'));
    $('creditStats').innerHTML = stats.join('');
    if (C) {
      var pc = { bankCons: S(1), otherCons: UI.css('--seq-2'), bankViv: S(2), infonavit: S(4), fovissste: S(8), otherViv: NEUTRAL() };
      $('capFinParts').innerHTML = bi(UI.date(C.asOf) + ', miles de millones de pesos. Consumo: ' + UI.money(C.consumer) + ' (' + yoyTxt(C.yoyReal.consumer) + '); vivienda: ' + UI.money(C.housing) + ' (' + yoyTxt(C.yoyReal.housing) + ') ' + UI.kind('C'), UI.date(C.asOf) + ', billions of pesos. Consumer: ' + UI.money(C.consumer) + ' (' + yoyTxt(C.yoyReal.consumer) + '); housing: ' + UI.money(C.housing) + ' (' + yoyTxt(C.yoyReal.housing) + ') ' + UI.kind('C'));
      UI.bar('chFinParts', { horizontal: true, labels: C.parts.map(function (p) { return nm('part', p.k); }), data: C.parts.map(function (p) { return p.v; }), colors: C.parts.map(function (p) { return pc[p.k]; }), fmt: function (v, i) { return UI.money(v) + (i != null ? ' · ' + UI.pct(C.parts[i].pct) : ''); }, axisFmt: function (v) { return UI.nf(v, 0); }, valueLabels: function (v, i) { return UI.pct(C.parts[i].pct, 0); }, catSize: 10.5, thickness: 20 });
      UI.legend('chFinParts', [{ c: S(1), l: tr('Crédito al consumo', 'Consumer credit') }, { c: S(2), l: tr('Crédito a la vivienda', 'Housing credit') }]);
      UI.table('chFinParts', [tr('Tipo y otorgante', 'Type and lender'), tr('Miles de millones de pesos', 'Billions of pesos'), tr('% del total', '% of total')], C.parts.map(function (p) { return [nm('part', p.k), UI.nf(p.v, 1), UI.pct(p.pct)]; }).concat([[tr('Total', 'Total'), UI.nf(C.total, 1), '100.0%']]));
      var H = C.hist, bisM = {}; if (D.bis) D.bis.q.forEach(function (q, i) { bisM[q] = D.bis.series[i]; });
      var dsG = [{ label: tr('Total', 'Total'), data: H.total, color: UI.css('--text-primary'), width: 2.6 }, { label: tr('Vivienda', 'Housing'), data: H.housing, color: S(2) }, { label: tr('Consumo', 'Consumer'), data: H.consumer, color: S(1) }];
      if (D.bis) dsG.push({ label: tr('Total según el BIS', 'Total according to the BIS'), data: H.q.map(function (q) { return bisM[q] == null ? null : bisM[q]; }), color: S(5), dash: [5, 4] });
      $('capFinGdp').innerHTML = bi('Financiamiento a los hogares como porcentaje del PIB de los cuatro trimestres a cada fecha, trimestral ' + UI.kind('C') + (D.bis ? ' La línea punteada es la medida del BIS, que permite comparar países.' : ''), 'Financing to households as a percent of GDP of the four quarters to each date, quarterly ' + UI.kind('C') + (D.bis ? ' The dashed line is the BIS measure, which allows comparison across countries.' : ''));
      UI.line('chFinGdp', { labels: H.q.map(function (q) { return q.slice(0, 4); }), datasets: dsG, fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, min: 0, xTicks: 9 });
      UI.charts.chFinGdp.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(H.q[it[0].dataIndex]); }; UI.charts.chFinGdp.update();
      UI.legend('chFinGdp', dsG.map(function (d2) { return { c: d2.color, l: d2.label, line: 1 }; }));
      UI.table('chFinGdp', [tr('Trimestre', 'Quarter'), tr('Total', 'Total'), tr('Consumo', 'Consumer'), tr('Vivienda', 'Housing')].concat(D.bis ? ['BIS'] : []), H.q.map(function (q, i) { return [UI.date(q), UI.pct(H.total[i]), UI.pct(H.consumer[i]), UI.pct(H.housing[i])].concat(D.bis ? [bisM[q] == null ? '—' : UI.pct(bisM[q])] : []); }).filter(function (r, i) { return /Q4|T4/.test(r[0]) || i === H.q.length - 1; }).reverse());
      $('srcFinGdp').innerHTML = srcLine('financing') + (D.bis ? ' · ' + srcLine('bis').replace(/^[^:]+: /, '') : '');
    }
    if (B) {
      var pr = B.products;
      $('capBankProd').innerHTML = bi('Cartera vigente de la banca comercial, ' + UI.date(B.asOf) + ', miles de millones de pesos (total ' + UI.money(B.consumer) + '); junto a cada barra, la variación real anual ' + UI.kind('C'), 'Performing portfolio of commercial banks, ' + UI.date(B.asOf) + ', billions of pesos (total ' + UI.money(B.consumer) + '); beside each bar, the real change from a year earlier ' + UI.kind('C'));
      UI.bar('chBankProd', { horizontal: true, labels: pr.map(function (p) { return nm('prod', p.k); }), data: pr.map(function (p) { return p.v; }), fmt: function (v, i) { return UI.money(v) + (i != null ? ' · ' + UI.pct(pr[i].pct) + (pr[i].yoyReal != null ? ' · ' + yoyTxt(pr[i].yoyReal) : '') : ''); }, axisFmt: function (v) { return UI.nf(v, 0); }, valueLabels: function (v, i) { return UI.nf(v, 0) + (pr[i].yoyReal != null ? '  ' + UI.signed(pr[i].yoyReal) : ''); }, catSize: 10.5, thickness: 20 });
      UI.table('chBankProd', [tr('Producto', 'Product'), tr('Miles de millones de pesos', 'Billions of pesos'), '%', tr('Variación real anual', 'Real change y/y'), tr('Cartera vencida, %', 'Past due, %')], pr.map(function (p) { return [nm('prod', p.k), UI.nf(p.v, 1), UI.pct(p.pct), p.yoyReal == null ? '—' : UI.signed(p.yoyReal), p.imor == null ? '—' : UI.pct(p.imor, 2)]; }).concat([[nm('prod', 'consumer'), UI.nf(B.consumer, 1), '100.0%', UI.signed(B.consumerYoyReal), UI.pct(B.imor.consumer, 2)], [nm('prod', 'housing'), UI.nf(B.housing, 1), '—', UI.signed(B.housingYoyReal), UI.pct(B.imor.housing, 2)]]));
      var G = B.growth, gs = [['consumer', tr('Consumo, total', 'All consumer credit'), UI.css('--text-primary'), 2.6], ['card', nm('prod', 'card'), S(1)], ['payroll', nm('prod', 'payroll'), S(3)], ['personal', nm('prod', 'personal'), S(5)], ['auto', nm('prod', 'auto'), S(4)], ['housing', nm('prod', 'housing'), S(2)]];
      UI.line('chBankGrowth', { labels: G.months.map(function (m) { return m.slice(0, 4); }), datasets: gs.map(function (g) { return { label: g[1], data: G[g[0]], color: g[2], width: g[3] || 1.8 }; }), fmt: function (v) { return UI.signed(v); }, axisFmt: function (v) { return (v < 0 ? '−' : '') + Math.abs(v) + '%'; }, xTicks: 9 });
      UI.charts.chBankGrowth.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(G.months[it[0].dataIndex]); }; UI.charts.chBankGrowth.update();
      UI.legend('chBankGrowth', gs.map(function (g) { return { c: g[2], l: g[1], line: 1 }; }));
      UI.table('chBankGrowth', [tr('Mes', 'Month')].concat(gs.map(function (g) { return g[1]; })), G.months.map(function (m, i) { return [UI.date(m)].concat(gs.map(function (g) { return G[g[0]][i] == null ? '—' : UI.signed(G[g[0]][i]); })); }).slice(-24).reverse());
    }
    if (R) {
      var rs = [['cardRev', tr('Tarjetas, quienes no pagan el total', 'Cards, those not paying in full'), S(1)], ['personal', tr('Créditos personales', 'Personal loans'), S(5)], ['payroll', tr('Créditos de nómina', 'Payroll loans'), S(3)], ['cardAll', tr('Tarjetas, todos los clientes', 'Cards, all customers'), UI.css('--seq-3')], ['auto', tr('Automotriz', 'Auto loans'), S(4)], ['mortgage', tr('Hipotecario, tasa fija', 'Mortgage, fixed rate'), S(2)]].filter(function (r) { return R.series[r[0]]; });
      $('capRates').innerHTML = bi('Tasas promedio ponderadas por saldo, porcentaje anual; bimestral (el dato más reciente es de ' + UI.date(R.asOf) + '). Sin promociones a meses sin intereses, las tarjetas de quienes no pagan el total cobran ' + UI.pct(R.cardNoPromo) + '.', 'Balance-weighted average rates, percent a year; every two months (the latest is ' + UI.date(R.asOf) + '). Leaving out interest-free installment promotions, the cards of those who do not pay in full charge ' + UI.pct(R.cardNoPromo) + '.');
      UI.line('chRates', { labels: R.periods.map(function (m) { return m.slice(0, 4); }), datasets: rs.map(function (r) { return { label: r[1], data: R.series[r[0]], color: r[2] }; }), fmt: function (v) { return UI.pct(v); }, axisFmt: pctAxis, min: 0, xTicks: 9 });
      UI.charts.chRates.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(R.periods[it[0].dataIndex]); }; UI.charts.chRates.update();
      UI.legend('chRates', rs.map(function (r) { return { c: r[2], l: r[1], line: 1 }; }));
      UI.table('chRates', [tr('Producto', 'Product'), tr('Tasa', 'Rate'), tr('Dato de', 'As of')], rs.map(function (r) { var l = R.latest[r[0]]; return [r[1], UI.pct(l.v), UI.date(l.asOf)]; }).concat(R.mortgageCat ? [[tr('Hipotecario, costo anual total (CAT)', 'Mortgage, total annual cost (CAT)'), UI.pct(R.mortgageCat.v), UI.date(R.mortgageCat.asOf)]] : []));
    }
    if (K) {
      UI.line('chCards', { labels: K.q.map(function (q) { return q.slice(0, 4); }), datasets: [{ label: tr('Tarjetas vigentes', 'Cards in force'), data: K.series, color: S(1), fill: true }], fmt: function (v) { return UI.nf(v, 1) + tr(' millones', ' million'); }, axisFmt: function (v) { return v + ' M'; }, min: 0, xTicks: 9 });
      UI.charts.chCards.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(K.q[it[0].dataIndex]); }; UI.charts.chCards.update();
      UI.table('chCards', [tr('Trimestre', 'Quarter'), tr('Millones de tarjetas', 'Millions of cards')], K.q.map(function (q, i) { return [UI.date(q), UI.nf(K.series[i], 1)]; }).slice(-12).reverse());
    }
    if (E) {
      var a = E.all, formal = ['storeCard', 'bankCard', 'housing', 'personal', 'payroll', 'group', 'auto', 'online'].map(function (k) { return { l: nm('enifCredit', k), v: a.credit[k], c: S(1) }; }), informal = ['family', 'friends', 'savingsClub', 'pawn'].map(function (k) { return { l: nm('enifCredit', k), v: a.informalCredit[k], c: S(2) }; });
      var rowsC = formal.concat(informal).sort(function (x, y) { return y.v - x.v; });
      $('capEnifCredit').innerHTML = bi('Porcentaje de las personas de 18 a 70 años, ' + E.asOf + '. Crédito formal: lo tiene hoy; informal: pidió prestado en los últimos 12 meses. Con algún crédito formal: ' + UI.pct(a.anyCredit) + '; con alguno informal: ' + UI.pct(a.anyInformalCredit) + '.', 'Share of people aged 18 to 70, ' + E.asOf + '. Formal credit: has it today; informal: borrowed in the past 12 months. With any formal credit: ' + UI.pct(a.anyCredit) + '; with any informal: ' + UI.pct(a.anyInformalCredit) + '.');
      UI.bar('chEnifCredit', { horizontal: true, labels: rowsC.map(function (x) { return x.l; }), data: rowsC.map(function (x) { return x.v; }), colors: rowsC.map(function (x) { return x.c; }), fmt: pF, axisFmt: pctAxis, valueLabels: true, catSize: 10.5, thickness: 15 });
      UI.legend('chEnifCredit', [{ c: S(1), l: tr('Crédito formal', 'Formal credit') }, { c: S(2), l: tr('Préstamo informal', 'Informal loan') }]);
      UI.table('chEnifCredit', [tr('Tipo', 'Type'), tr('% de los adultos', '% of adults')], rowsC.map(function (x) { return [x.l, UI.pct(x.v)]; }).concat([[tr('Algún crédito formal', 'Any formal credit'), UI.pct(a.anyCredit)], [tr('Solo préstamos informales', 'Informal loans only'), UI.pct(a.onlyInformalCredit)], [tr('Ningún crédito', 'No credit at all'), UI.pct(a.noCredit)]]));
      var ME = [
        { id: 'anyCredit', label: tr('Tiene algún crédito formal', 'Has any formal credit'), btn: tr('Crédito formal', 'Formal credit'), get: function (x) { return x.anyCredit; } },
        { id: 'bankCard', label: tr('Tiene tarjeta de crédito bancaria', 'Has a bank credit card'), btn: tr('Tarjeta bancaria', 'Bank card'), get: function (x) { return x.bankCard != null ? x.bankCard : x.credit ? x.credit.bankCard : null; } },
        { id: 'storeCard', label: tr('Tiene tarjeta de tienda', 'Has a store card'), btn: tr('Tarjeta de tienda', 'Store card'), get: function (x) { return x.storeCard != null ? x.storeCard : x.credit ? x.credit.storeCard : null; } },
        { id: 'onlyInformalCredit', label: tr('Solo ha pedido préstamos informales', 'Has borrowed only informally'), btn: tr('Solo informal', 'Informal only'), get: function (x) { return x.onlyInformalCredit; } },
        { id: 'anyAccount', label: tr('Tiene alguna cuenta', 'Has an account'), btn: tr('Cuenta', 'Account'), get: function (x) { return x.anyAccount; } },
        { id: 'app', label: tr('Tiene cuenta por internet o aplicación, no bancaria', 'Has an online or app account, non-bank'), btn: tr('Cuenta digital', 'Digital account'), get: function (x) { return x.app != null ? x.app : x.accounts ? x.accounts.app : null; } },
        { id: 'afore', label: tr('Tiene cuenta de ahorro para el retiro (afore)', 'Has a retirement savings account (afore)'), btn: tr('Afore', 'Retirement account'), get: function (x) { return x.afore; } },
        { id: 'insurance', label: tr('Tiene algún seguro', 'Has insurance'), btn: tr('Seguro', 'Insurance'), get: function (x) { return x.insurance; } }];
      var drawG = function () {
        var m = ME.filter(function (x) { return x.id === state.enifGroups; })[0] || ME[0];
        UI.seg('segEnifGroups', ME.map(function (x) { return { id: x.id, label: x.btn }; }), m.id, function (id) { state.enifGroups = id; drawG(); });
        var rows = groupChart('chEnifGroups', m);
        var body = rows.slice(1), hi = body.slice().sort(function (x, y) { return y.v - x.v; })[0], lo = body.slice().sort(function (x, y) { return x.v - y.v; })[0];
        $('capEnifGroups').innerHTML = bi(esc(m.label) + ': porcentaje de las personas de 18 a 70 años de cada grupo, ' + E.asOf + '. Va de ' + UI.pct(lo.v) + ' (' + esc(lo.label) + ') a ' + UI.pct(hi.v) + ' (' + esc(hi.label) + ').', esc(m.label) + ': share of people aged 18 to 70 in each group, ' + E.asOf + '. It runs from ' + UI.pct(lo.v) + ' (' + esc(lo.label) + ') to ' + UI.pct(hi.v) + ' (' + esc(hi.label) + ').');
      };
      drawG();
    }
    var Q = D.deciles;
    if (Q) {
      UI.line('chDecCard', { labels: ROMAN, datasets: [{ label: tr('Tienen tarjeta de crédito, bancaria o de tienda', 'Have a credit card, bank or store'), data: Q.own.map(function (x) { return x.creditCard; }), color: S(1), points: true }, { label: tr('Pagaron una tarjeta en el trimestre', 'Paid a card in the quarter'), data: Q.recv.map(function (x) { return x.pago_tarje; }), color: S(2), points: true }, { label: tr('Depositaron en cuentas, tandas o cajas', 'Put money in accounts or savings clubs'), data: Q.recv.map(function (x) { return x.deposito; }), color: S(3), points: true }], fmt: pF, axisFmt: pctAxis, min: 0, xTicks: 10 });
      UI.charts.chDecCard.options.plugins.tooltip.callbacks.title = function (it) { return dT(it[0].dataIndex); }; UI.charts.chDecCard.update();
      UI.legend('chDecCard', [{ c: S(1), l: tr('Tienen tarjeta de crédito', 'Have a credit card'), line: 1 }, { c: S(2), l: tr('Pagaron una tarjeta en el trimestre', 'Paid a card in the quarter'), line: 1 }, { c: S(3), l: tr('Depositaron en cuentas, tandas o cajas', 'Put money in accounts or savings clubs'), line: 1 }]);
      UI.table('chDecCard', [tr('Decil', 'Decile'), tr('Con tarjeta de crédito', 'With a credit card'), tr('Pagaron una tarjeta', 'Paid a card'), tr('Pago promedio de tarjeta al mes', 'Mean card payment a month'), tr('Depositaron', 'Made deposits'), tr('Depósito promedio al mes', 'Mean deposit a month')], Q.own.map(function (x, i) { return [dT(i), UI.pct(x.creditCard), UI.pct(Q.recv[i].pago_tarje), UI.peso(Q.cardPay[i]), UI.pct(Q.recv[i].deposito), UI.peso(Q.deposits[i])]; }));
      $('cardCallout').innerHTML = bi(
        'Tiene tarjeta de crédito el <b>' + UI.pct(Q.own[9].creditCard, 0) + '</b> de los hogares del decil X y el ' + UI.pct(Q.own[0].creditCard, 0) + ' de los del decil I. El decil X hace el ' + UI.pct(Q.cardPay[9] / sum(Q.cardPay) * 100, 0) + ' de todos los pagos de tarjeta que registra la encuesta. ' + UI.kind('C'),
        '<b>' + UI.pct(Q.own[9].creditCard, 0) + '</b> of the households of decile X have a credit card, against ' + UI.pct(Q.own[0].creditCard, 0) + ' of those of decile I. Decile X makes ' + UI.pct(Q.cardPay[9] / sum(Q.cardPay) * 100, 0) + ' of all card payments the survey records. ' + UI.kind('C'));
    }
    debtMap();
  }
  function debtMap() {
    var T = D.states; if (!T) return;
    var M = [
      { id: 'card', label: tr('Hogares con tarjeta de crédito, bancaria o de tienda', 'Households with a credit card, bank or store'), btn: tr('Con tarjeta de crédito', 'With a credit card'), get: function (s) { return s.card; }, us: T.mx.card, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'cardPay', label: tr('Hogares que pagaron una tarjeta de crédito en el trimestre', 'Households that paid a credit card in the quarter'), btn: tr('Pagaron una tarjeta', 'Paid a card'), get: function (s) { return s.cardPay; }, us: T.mx.cardPay, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'housingCredit', label: tr('Crédito bancario a la vivienda por hogar del estado, pesos', 'Bank housing credit per household of the state, pesos'), btn: tr('Crédito a la vivienda por hogar', 'Housing credit per household'), get: function (s) { return s.housingCredit; }, us: T.mx.housingCredit, fmt: function (v) { return UI.peso(v); }, short: function (v) { return UI.pesoK(v, 0); }, kind: 'C', src: 'statesBanxico' },
      { id: 'housingPastDue', label: tr('Cartera vencida del crédito bancario a la vivienda', 'Past-due bank housing loans'), btn: tr('Vivienda: cartera vencida', 'Housing: past due'), get: function (s) { return s.housingPastDue; }, us: T.mx.housingPastDue, fmt: function (v) { return UI.pct(v, 2); }, kind: 'C', src: 'statesBanxico' },
      { id: 'owner', label: tr('Hogares en vivienda propia', 'Households in a home they own'), btn: tr('Vivienda propia', 'Own their home'), get: function (s) { return s.owner; }, us: T.mx.owner, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'vehicle', label: tr('Hogares con automóvil, camioneta o pickup', 'Households with a car, van or pickup'), btn: tr('Con vehículo', 'With a vehicle'), get: function (s) { return s.vehicle; }, us: T.mx.vehicle, fmt: pF, kind: 'C', src: 'enigh' }
    ].filter(function (m) { return T.list.some(function (s) { return m.get(s) != null; }); });
    var notes = {
      card: bi('Porcentaje de hogares en los que alguien tiene tarjeta de crédito de un banco o de una tienda. ENIGH ' + T.asOf + '. Banco de México no publica el crédito al consumo por estado.', 'Share of households in which someone has a credit card from a bank or a store. ENIGH ' + T.asOf + '. Banco de México does not publish consumer credit by state.'),
      cardPay: bi('Porcentaje de hogares que hicieron algún pago a una tarjeta de crédito bancaria o de tienda en el trimestre de la encuesta. ENIGH ' + T.asOf + '.', 'Share of households that made a payment on a bank or store credit card in the survey quarter. ENIGH ' + T.asOf + '.'),
      housingCredit: bi('Cartera total de crédito a la vivienda de la banca comercial en el estado (' + qLabel(T.housingAsOf) + ') entre el número de hogares del estado (ENIGH ' + T.asOf + '). No incluye Infonavit ni Fovissste.', 'Total housing loan portfolio of commercial banks in the state (' + qLabel(T.housingAsOf) + ') divided by the number of households of the state (ENIGH ' + T.asOf + '). It leaves out Infonavit and Fovissste.'),
      housingPastDue: bi('Cartera vencida entre cartera total del crédito a la vivienda de la banca comercial en el estado, ' + qLabel(T.housingAsOf) + '.', 'Past-due portfolio divided by total portfolio of commercial banks\' housing loans in the state, ' + qLabel(T.housingAsOf) + '.'),
      owner: bi('Porcentaje de hogares en vivienda propia, pagada o pagándose. ENIGH ' + T.asOf + '.', 'Share of households in a home they own, paid off or being paid. ENIGH ' + T.asOf + '.'),
      vehicle: bi('Porcentaje de hogares con al menos un automóvil, camioneta cerrada o pickup. ENIGH ' + T.asOf + '.', 'Share of households with at least one car, van or pickup. ENIGH ' + T.asOf + '.')
    };
    function draw() {
      UI.seg('segDebtMap', M.map(function (m) { return { id: m.id, label: m.btn }; }), state.debtMap, function (id) { state.debtMap = id; draw(); });
      var m = UI.stateMap({ box: 'mapDebt', chips: 'chipsDebt', scale: 'scaleDebt', rank: 'rankDebt', tblKey: 'mapDebt', states: T.list, metrics: M, current: state.debtMap });
      $('capDebtMap').innerHTML = notes[m.id] + ' ' + UI.kind(m.kind);
      $('srcDebtMap').innerHTML = srcLine(m.src);
    }
    draw();
  }

  // =====================================================================================================================
  // 07 Leverage and financial stress
  // =====================================================================================================================
  function stress() {
    var B = D.bank, E = D.enif, Q = D.deciles, X = D.enfih, P = D.poverty, a = E ? E.all : null;
    var stats = [];
    if (B) stats.push(st(UI.pct(B.imor.consumer, 2), tr('Cartera vencida del crédito bancario al consumo, ', 'Past-due bank consumer loans, ') + UI.date(B.imorAsOf) + ' (' + UI.pct(B.imor.consumerYearAgo, 2) + tr(' un año antes)', ' a year earlier)'), 'C'));
    if (a) stats.push(st(UI.pct(a.lateAny), tr('de quienes tienen crédito formal se atrasó en un pago en un año', 'of those with formal credit fell behind on a payment within a year'), 'C'), st(UI.pct(a.notEnough), tr('de los adultos: su ingreso no alcanzó para cubrir sus gastos', 'of adults: their income did not cover their expenses'), 'C'),
      st(UI.pct(a.cushion.lt1w + a.cushion.lt1m, 0), tr('no cubriría un mes de gastos con sus ahorros', 'could not cover a month of expenses with their savings'), 'C'), st(UI.pct(a.rejected), tr('de quienes han pedido un crédito: alguna vez se lo negaron', 'of those who have applied for credit: turned down at least once'), 'C'));
    if (Q) stats.push(st(UI.pct(Q.overspend.all, 0), tr('de los hogares gasta más de lo que gana en dinero', 'of households spend more than their money income'), 'C'));
    if (P) stats.push(st(UI.pct(last(P.national.poverty)), tr('de la población en pobreza, ', 'of the population in poverty, ') + P.asOf));
    $('stressStats').innerHTML = stats.join('');
    if (B && a) $('stressCallout').innerHTML = bi(
      '<b>Qué dicen los datos.</b> En los bancos, el <b>' + UI.pct(B.imor.consumer, 2) + '</b> de la cartera de consumo está vencida (' + UI.pct(B.imor.consumerYearAgo, 2) + ' un año antes), con el crédito creciendo ' + UI.pct(B.consumerYoyReal) + ' real. Pero el banco solo ve a quien tiene crédito formal, el ' + UI.pct(a.anyCredit) + ' de los adultos. En la encuesta, al <b>' + UI.pct(a.notEnough) + '</b> no le alcanzó el ingreso para sus gastos; de ellos, el ' + UI.pct(a.coping.family, 0) + ' pidió prestado a familiares o conocidos y el ' + UI.pct(a.coping.pawn, 0) + ' vendió o empeñó algo, frente al ' + UI.pct(a.coping.credit, 0) + ' que usó una tarjeta o un crédito. El ' + UI.pct(a.cushion.lt1w, 0) + ' no tiene ahorros ni para una semana. ' + UI.kind('C'),
      '<b>What the data say.</b> At banks, <b>' + UI.pct(B.imor.consumer, 2) + '</b> of the consumer portfolio is past due (' + UI.pct(B.imor.consumerYearAgo, 2) + ' a year earlier), with credit growing ' + UI.pct(B.consumerYoyReal) + ' in real terms. But a bank sees only those with formal credit, ' + UI.pct(a.anyCredit) + ' of adults. In the survey, for <b>' + UI.pct(a.notEnough) + '</b> income did not cover expenses; of them, ' + UI.pct(a.coping.family, 0) + ' borrowed from family or acquaintances and ' + UI.pct(a.coping.pawn, 0) + ' sold or pawned something, against ' + UI.pct(a.coping.credit, 0) + ' who used a card or a loan. ' + UI.pct(a.cushion.lt1w, 0) + ' do not have savings for even a week. ' + UI.kind('C'));
    if (B) {
      var H = B.hist, ls = [['card', nm('prod', 'card'), S(1)], ['personal', nm('prod', 'personal'), S(5)], ['payroll', nm('prod', 'payroll'), S(3)], ['auto', nm('prod', 'auto'), S(4)], ['housing', nm('prod', 'housing'), S(2)], ['consumer', tr('Consumo, total', 'All consumer credit'), UI.css('--text-primary'), 2.6]];
      $('capImor').innerHTML = bi('Cartera vencida entre cartera total de cada producto en la banca comercial, porcentaje, mensual. El índice no cuenta los créditos ya castigados. La cobertura de la tabla cambió en febrero de 2026, lo que mueve los saldos pero casi no el cociente. ' + UI.kind('C'), 'Past-due portfolio divided by total portfolio of each product at commercial banks, percent, monthly. The ratio does not count loans already written off. The table\'s coverage changed in February 2026, which moves the balances but hardly the ratio. ' + UI.kind('C'));
      UI.line('chImor', { labels: H.months.map(function (m) { return m.slice(0, 4); }), datasets: ls.map(function (l) { return { label: l[1], data: H[l[0]], color: l[2], width: l[3] || 1.8 }; }), fmt: function (v) { return UI.pct(v, 2); }, axisFmt: pctAxis, min: 0, xTicks: 9 });
      UI.charts.chImor.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(H.months[it[0].dataIndex]); }; UI.charts.chImor.update();
      UI.legend('chImor', ls.map(function (l) { return { c: l[2], l: l[1], line: 1 }; }));
      UI.table('chImor', [tr('Producto', 'Product'), UI.date(B.imorAsOf), tr('Un año antes', 'A year earlier')], B.products.filter(function (p) { return p.imor != null; }).map(function (p) { return [nm('prod', p.k), UI.pct(p.imor, 2), p.imorYearAgo == null ? '—' : UI.pct(p.imorYearAgo, 2)]; }).concat([[nm('prod', 'consumer'), UI.pct(B.imor.consumer, 2), UI.pct(B.imor.consumerYearAgo, 2)], [nm('prod', 'housing'), UI.pct(B.imor.housing, 2), UI.pct(B.imor.housingYearAgo, 2)]]));
    }
    if (a) {
      var lt = Object.keys(a.late).filter(function (k) { return a.late[k] != null && N.enifCredit[k]; }).map(function (k) { return { l: nm('enifCredit', k), v: a.late[k], own: a.credit[k] }; }).sort(function (x, y) { return y.v - x.v; });
      $('capLate').innerHTML = bi('De las personas que tienen cada tipo de crédito, porcentaje que se atrasó en algún pago en el año previo a la encuesta (' + E.asOf + '). De quienes tienen algún crédito formal: ' + UI.pct(a.lateAny) + '. ' + UI.kind('C'), 'Of the people who have each type of credit, the share that fell behind on a payment in the year before the survey (' + E.asOf + '). Of those with any formal credit: ' + UI.pct(a.lateAny) + '. ' + UI.kind('C'));
      UI.bar('chLate', { horizontal: true, labels: lt.map(function (x) { return x.l; }), data: lt.map(function (x) { return x.v; }), fmt: function (v, i) { return UI.pct(v) + (i != null ? tr(' · lo tiene el ', ' · held by ') + UI.pct(lt[i].own) + tr(' de los adultos', ' of adults') : ''); }, axisFmt: pctAxis, valueLabels: pF, catSize: 10.5, thickness: 16 });
      UI.table('chLate', [tr('Tipo de crédito', 'Type of credit'), tr('% de quienes lo tienen que se atrasó', '% of holders who fell behind'), tr('% de los adultos que lo tiene', '% of adults who hold it')], lt.map(function (x) { return [x.l, UI.pct(x.v), UI.pct(x.own)]; }));
      var MS = [
        { id: 'lateAny', label: tr('Se atrasó en algún pago de un crédito formal, de quienes lo tienen', 'Fell behind on a payment of formal credit, of those who have it'), btn: tr('Se atrasó en un pago', 'Fell behind'), get: function (x) { return x.lateAny; } },
        { id: 'notEnough', label: tr('Su ingreso no alcanzó para cubrir sus gastos', 'Income did not cover expenses'), btn: tr('No le alcanzó', 'Income fell short'), get: function (x) { return x.notEnough; } },
        { id: 'cushion', label: tr('No cubriría un mes de gastos con sus ahorros', 'Could not cover a month of expenses with savings'), btn: tr('Menos de un mes de ahorros', 'Under a month of savings'), get: function (x) { return x.cushion ? Math.round((x.cushion.lt1w + x.cushion.lt1m) * 10) / 10 : null; } },
        { id: 'leftover', label: tr('Nunca le sobra dinero a fin de mes', 'Never has money left at the end of the month'), btn: tr('Nunca le sobra', 'Nothing left over'), get: function (x) { return x.leftoverNever != null ? x.leftoverNever : x.leftover ? x.leftover.never : null; } },
        { id: 'rejected', label: tr('Le han negado un crédito, de quienes alguna vez lo solicitaron', 'Has been denied credit, of those who ever applied'), btn: tr('Crédito negado', 'Denied credit'), get: function (x) { return x.rejected; } },
        { id: 'cannotPay', label: tr('No puede pagar a tiempo todas sus deudas, de quienes tienen deudas', 'Cannot pay all debts on time, of those with debts'), btn: tr('No puede pagar todo', 'Cannot pay it all'), get: function (x) { return x.cannotPay != null ? x.cannotPay : x.debtView ? Math.round((x.debtView.cannot + x.debtView.some) * 10) / 10 : null; } }];
      var drawS = function () {
        var m = MS.filter(function (x) { return x.id === state.stressGroups; })[0] || MS[0];
        UI.seg('segStressGroups', MS.map(function (x) { return { id: x.id, label: x.btn }; }), m.id, function (id) { state.stressGroups = id; drawS(); });
        var rows = groupChart('chStressGroups', m), body = rows.slice(1), hi = body.slice().sort(function (x, y) { return y.v - x.v; })[0], lo = body.slice().sort(function (x, y) { return x.v - y.v; })[0];
        $('capStressGroups').innerHTML = bi(esc(m.label) + ': porcentaje de las personas de 18 a 70 años de cada grupo, ' + E.asOf + '. Va de ' + UI.pct(lo.v) + ' (' + esc(lo.label) + ') a ' + UI.pct(hi.v) + ' (' + esc(hi.label) + '). ' + UI.kind('C'), esc(m.label) + ': share of people aged 18 to 70 in each group, ' + E.asOf + '. It runs from ' + UI.pct(lo.v) + ' (' + esc(lo.label) + ') to ' + UI.pct(hi.v) + ' (' + esc(hi.label) + '). ' + UI.kind('C'));
      };
      drawS();
      var cp = Object.keys(a.coping).map(function (k) { return { l: nm('coping', k), v: a.coping[k] }; }).sort(function (x, y) { return y.v - x.v; });
      $('capCoping').innerHTML = bi('Al ' + UI.pct(a.notEnough) + ' de los adultos su ingreso no le alcanzó para cubrir sus gastos en algún mes del año previo; qué hicieron la última vez, porcentaje de ellos (' + E.asOf + '; podían dar varias respuestas) ' + UI.kind('C'), 'For ' + UI.pct(a.notEnough) + ' of adults income did not cover expenses in some month of the previous year; what they did the last time, percent of them (' + E.asOf + '; several answers allowed) ' + UI.kind('C'));
      UI.bar('chCoping', { horizontal: true, labels: cp.map(function (x) { return x.l; }), data: cp.map(function (x) { return x.v; }), fmt: pF, axisFmt: pctAxis, valueLabels: true, catSize: 10.5, thickness: 16 });
      UI.table('chCoping', [tr('Qué hicieron', 'What they did'), '%'], cp.map(function (x) { return [x.l, UI.pct(x.v)]; }));
      var ck = ['lt1w', 'lt1m', 'lt3m', 'lt6m', 'gte6m'];
      $('capCushion').innerHTML = bi('Si dejara de recibir ingresos, por cuánto tiempo podría cubrir sus gastos con sus ahorros; porcentaje de los adultos de 18 a 70 años, ' + E.asOf + ' ' + UI.kind('C'), 'If income stopped, how long savings would cover expenses; percent of adults aged 18 to 70, ' + E.asOf + ' ' + UI.kind('C'));
      UI.bar('chCushion', { labels: ck.map(function (k) { return nm('cushion', k); }), data: ck.map(function (k) { return a.cushion[k]; }), colors: ck.map(function (_, i) { return i < 2 ? S(8) : i === 2 ? S(4) : S(3); }), fmt: pF, axisFmt: pctAxis, valueLabels: function (v) { return UI.pct(v, 0); }, wrap: 14, catSize: 10 });
      UI.table('chCushion', [tr('Los ahorros alcanzarían para', 'Savings would last'), tr('Todos', 'All')].concat(E.groups.edu.map(function (x) { return nm('enifEdu', x.k); })), ck.map(function (k) { return [nm('cushion', k), UI.pct(a.cushion[k])].concat(E.groups.edu.map(function (x) { return UI.pct(x.cushion[k]); })); }));
      var eb = by(E.groups.edu, 'basic'), ec = by(E.groups.edu, 'college');
      $('cushionCallout').innerHTML = bi(
        'El colchón depende de la escolaridad: no tiene ahorros ni para una semana el <b>' + UI.pct(eb.cushion.lt1w, 0) + '</b> de quienes estudiaron hasta secundaria y el ' + UI.pct(ec.cushion.lt1w, 0) + ' de quienes tienen licenciatura; aguantaría seis meses o más el ' + UI.pct(eb.cushion.gte6m, 0) + ' y el ' + UI.pct(ec.cushion.gte6m, 0) + ', respectivamente. ' + UI.kind('C'),
        'The cushion depends on schooling: <b>' + UI.pct(eb.cushion.lt1w, 0) + '</b> of those who studied up to lower secondary and ' + UI.pct(ec.cushion.lt1w, 0) + ' of those with a college degree do not have savings for even a week; ' + UI.pct(eb.cushion.gte6m, 0) + ' and ' + UI.pct(ec.cushion.gte6m, 0) + ', respectively, could last six months or more. ' + UI.kind('C'));
      if (a.rejectWhy) {
        var rj = Object.keys(a.rejectWhy).map(function (k) { return { l: nm('reject', k), v: a.rejectWhy[k] }; }).sort(function (x, y) { return y.v - x.v; });
        $('capReject').innerHTML = bi('El ' + UI.pct(a.everApplied) + ' de los adultos ha solicitado un crédito alguna vez y al ' + UI.pct(a.rejected) + ' de ellos se lo han negado; razones que les dieron, porcentaje de los rechazados (' + E.asOf + ') ' + UI.kind('C'), UI.pct(a.everApplied) + ' of adults have applied for credit at some time and ' + UI.pct(a.rejected) + ' of them have been turned down; the reasons they were given, percent of those turned down (' + E.asOf + ') ' + UI.kind('C'));
        UI.bar('chReject', { horizontal: true, labels: rj.map(function (x) { return x.l; }), data: rj.map(function (x) { return x.v; }), fmt: pF, axisFmt: pctAxis, valueLabels: true, catSize: 10.5, thickness: 16 });
        UI.table('chReject', [tr('Razón', 'Reason'), '%'], rj.map(function (x) { return [x.l, UI.pct(x.v)]; }));
        var gm = by(E.groups.sex, 'men'), gw = by(E.groups.sex, 'women');
        $('accessCallout').innerHTML = bi(
          'Las dos razones más citadas: ' + esc(rj[0].l.toLowerCase()) + ' (' + UI.pct(rj[0].v, 0) + ') y ' + esc(rj[1].l.toLowerCase()) + ' (' + UI.pct(rj[1].v, 0) + '). A los hombres les han negado un crédito ' + (gm.rejected > gw.rejected ? 'más' : 'menos') + ' que a las mujeres: ' + UI.pct(gm.rejected) + ' frente a ' + UI.pct(gw.rejected) + ' de quienes lo han solicitado. ' + UI.kind('C'),
          'The two reasons most often given: ' + esc(rj[0].l.toLowerCase()) + ' (' + UI.pct(rj[0].v, 0) + ') and ' + esc(rj[1].l.toLowerCase()) + ' (' + UI.pct(rj[1].v, 0) + '). Men have been denied credit ' + (gm.rejected > gw.rejected ? 'more' : 'less') + ' often than women: ' + UI.pct(gm.rejected) + ' against ' + UI.pct(gw.rejected) + ' of those who have applied. ' + UI.kind('C'));
      }
    }
    var LN = D.lending;
    if (LN) {
      $('capLending').innerHTML = bi('Encuesta trimestral a los bancos con mayor participación, crédito vía tarjetas, índices de difusión. Arriba de cero: más demanda o condiciones de aprobación más relajadas; abajo de cero: menos demanda o condiciones más estrictas. Último dato: ' + UI.date(LN.asOf) + '.', 'Quarterly survey of the banks with the largest market share, card lending, diffusion indexes. Above zero: more demand or easier approval standards; below zero: less demand or tighter standards. Latest: ' + UI.date(LN.asOf) + '.');
      UI.line('chLending', { labels: LN.q.map(function (q) { return q.slice(0, 4); }), datasets: [{ label: tr('Demanda de crédito', 'Demand for credit'), data: LN.demand, color: S(1) }, { label: tr('Condiciones de aprobación', 'Approval standards'), data: LN.standards, color: S(2) }], fmt: function (v) { return UI.nf(v, 2); }, xTicks: 9 });
      UI.charts.chLending.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(LN.q[it[0].dataIndex]); }; UI.charts.chLending.update();
      UI.legend('chLending', [{ c: S(1), l: tr('Demanda de crédito en tarjetas', 'Demand for card credit'), line: 1 }, { c: S(2), l: tr('Condiciones de aprobación (positivo = más relajadas)', 'Approval standards (positive = easier)'), line: 1 }]);
      UI.table('chLending', [tr('Trimestre', 'Quarter'), tr('Demanda', 'Demand'), tr('Condiciones', 'Standards')], LN.q.map(function (q, i) { return [UI.date(q), UI.nf(LN.demand[i], 2), LN.standards[i] == null ? '—' : UI.nf(LN.standards[i], 2)]; }).slice(-12).reverse());
    }
    if (Q) {
      $('capOverspend').innerHTML = bi('Por decil de ingreso, ' + Q.asOf + ': hogares cuyo gasto monetario supera a su ingreso en dinero, y hogares que rentan y destinan 30% o más de su ingreso a la renta (porcentaje de los que rentan). ' + UI.kind('C'), 'By income decile, ' + Q.asOf + ': households whose monetary spending exceeds their money income, and renter households that spend 30% or more of their income on rent (percent of renters). ' + UI.kind('C'));
      UI.bar('chOverspend', { labels: ROMAN, datasets: [{ label: tr('Gastan más de lo que ganan', 'Spend more than they earn'), data: Q.overspend.byDecile, color: S(8) }, { label: tr('Renta de 30% o más del ingreso', 'Rent of 30% or more of income'), data: Q.rentBurden, color: S(4) }], fmt: pF, axisFmt: pctAxis, thickness: 16, tipTitle: dT });
      UI.legend('chOverspend', [{ c: S(8), l: tr('Hogares que gastan más de lo que ganan en dinero', 'Households spending more than their money income') }, { c: S(4), l: tr('Hogares que rentan con renta de 30% o más de su ingreso', 'Renter households with rent of 30% or more of income') }]);
      UI.table('chOverspend', [tr('Decil', 'Decile'), tr('Gastan más de lo que ganan', 'Spend more than they earn'), tr('Renta de 30% o más (de los que rentan)', 'Rent of 30% or more (of renters)'), tr('Hogares que rentan', 'Renter households')], Q.overspend.byDecile.map(function (v, i) { return [dT(i), UI.pct(v), Q.rentBurden[i] == null ? '—' : UI.pct(Q.rentBurden[i]), UI.pct(Q.own[i].renter)]; }).concat(D.demo ? [[tr('Todos', 'All'), UI.pct(Q.overspend.all), UI.pct(D.demo.rent.burden30), UI.pct(D.demo.rent.share)]] : []));
    }
    if (X) {
      var b = X.burden;
      $('capBurden').innerHTML = bi('Indicadores de la carga de la deuda de los hogares con deuda, ' + X.asOf + ', tal como los publica la encuesta. Es la única edición.', 'Indicators of the debt burden of households with debt, ' + X.asOf + ', as the survey publishes them. It is the only edition.');
      var li = function (v, l) { return '<li><span class="fv">' + v + '</span><span class="fl">' + l + '</span></li>'; };
      $('burdenFacts').innerHTML = [li(UI.pct(b.paymentToIncome, 0), tr('del ingreso mensual se va en pagos de deuda', 'of monthly income goes to debt payments')), li(UI.pct(b.debtToIncome, 0), tr('representa la deuda total frente al ingreso de un año', 'is total debt relative to a year of income')), li(UI.pct(b.debtToAssets, 0), tr('representa la deuda total frente a los activos', 'is total debt relative to assets')),
        li(UI.pct(b.mortgageToHome, 0), tr('representa la deuda hipotecaria frente al valor de la vivienda', 'is mortgage debt relative to the value of the home')), li(UI.pct(b.mortgageServiceToIncome, 0), tr('del ingreso mensual se va en pagar la hipoteca', 'of monthly income goes to mortgage payments')), li(UI.pct(X.perception.notEnough), tr('de los adultos: lo que gana no le alcanza ni para lo necesario', 'of adults: what they earn does not cover even the essentials'))].join('');
      var em = Object.keys(X.emergency).map(function (k) { return { l: nm('emergency', k), v: X.emergency[k] }; }).sort(function (x, y) { return y.v - x.v; });
      UI.bar('chEmergency', { horizontal: true, labels: em.map(function (x) { return x.l; }), data: em.map(function (x) { return x.v; }), fmt: pF, axisFmt: pctAxis, valueLabels: true, catSize: 10.5, thickness: 15 });
      UI.table('chEmergency', [tr('Fuente de pago', 'Source of payment'), tr('% de los adultos', '% of adults')], em.map(function (x) { return [x.l, UI.pct(x.v)]; }));
    }
    if (P) {
      var PK = ['extreme', 'moderate', 'vulnerableDeprivation', 'vulnerableIncome', 'notPoor'], pc = { extreme: S(8), moderate: S(2), vulnerableDeprivation: S(4), vulnerableIncome: UI.css('--seq-3'), notPoor: S(3) }, n = P.national, i = P.years.length - 1;
      $('capPoverty').innerHTML = bi('Porcentaje de la población en cada situación. Pobreza (extrema más moderada): ' + UI.pct(n.poverty[i]) + ' en ' + P.asOf + ', ' + UI.pp(n.poverty[i] - n.poverty[0]) + ' desde ' + P.years[0] + (P.people ? '; ' + UI.mill(P.people[i]) + ' de personas' : '') + '.', 'Percent of the population in each situation. Poverty (extreme plus moderate): ' + UI.pct(n.poverty[i]) + ' in ' + P.asOf + ', ' + UI.pp(n.poverty[i] - n.poverty[0]) + ' since ' + P.years[0] + (P.people ? '; ' + UI.mill(P.people[i]) + ' people' : '') + '.');
      var sets = PK.map(function (k) { return { label: nm('pov', k), color: pc[k], data: n[k] }; });
      UI.bar('chPoverty', { labels: P.years, stacked: true, datasets: sets, fmt: pF, axisFmt: pctAxis, max: 100, thickness: 44 });
      UI.legend('chPoverty', sets.map(function (x) { return { c: x.color, l: x.label }; }));
      UI.table('chPoverty', [tr('Año', 'Year'), tr('Pobreza', 'Poverty')].concat(sets.map(function (x) { return x.label; })).concat(P.people ? [tr('Personas en pobreza', 'People in poverty')] : []), P.years.map(function (y, j) { return [y, UI.pct(n.poverty[j])].concat(PK.map(function (k) { return UI.pct(n[k][j]); })).concat(P.people ? [UI.nf(P.people[j])] : []); }).reverse());
      var LK = [['poverty', tr('En pobreza', 'In poverty'), S(8)], ['belowIncomeLine', tr('Ingreso inferior a la línea de pobreza', 'Income below the poverty line'), S(2)], ['noSocialSecurity', tr('Sin acceso a la seguridad social', 'No access to social security'), S(1)], ['noHealth', tr('Sin acceso a servicios de salud', 'No access to health services'), S(5)], ['food', tr('Sin alimentación nutritiva y de calidad', 'Without nutritious, quality food'), S(4)]];
      UI.line('chPovLines', { labels: P.years, datasets: LK.map(function (l) { return { label: l[1], data: n[l[0]], color: l[2], points: true }; }), fmt: pF, axisFmt: pctAxis, min: 0, xTicks: 6 });
      UI.legend('chPovLines', LK.map(function (l) { return { c: l[2], l: l[1], line: 1 }; }));
      UI.table('chPovLines', [tr('Año', 'Year')].concat(LK.map(function (l) { return l[1]; })), P.years.map(function (y, j) { return [y].concat(LK.map(function (l) { return UI.pct(n[l[0]][j]); })); }).reverse());
    }
    stressMap();
  }
  function stressMap() {
    var T = D.states; if (!T || T.list[0].poverty == null) return;
    var ppF = function (v) { return UI.pp(v); };
    var M = [
      { id: 'poverty', label: tr('Población en pobreza', 'People in poverty'), btn: tr('Pobreza', 'Poverty'), get: function (s) { return s.poverty; }, us: T.mx.poverty, fmt: pF, kind: 'R', src: 'poverty' },
      { id: 'extreme', label: tr('Población en pobreza extrema', 'People in extreme poverty'), btn: tr('Pobreza extrema', 'Extreme poverty'), get: function (s) { return s.extreme; }, us: T.mx.extreme, fmt: pF, kind: 'R', src: 'poverty' },
      { id: 'povertyChg', label: tr('Cambio en la pobreza, ', 'Change in poverty, ') + T.povertyFirst + '–' + T.povertyAsOf + tr(', puntos porcentuales', ', percentage points'), btn: tr('Cambio desde ', 'Change since ') + T.povertyFirst, get: function (s) { return s.povertyChg; }, us: T.mx.povertyChg, fmt: ppF, kind: 'C', src: 'poverty' },
      { id: 'belowLine', label: tr('Población con ingreso inferior a la línea de pobreza', 'People with income below the poverty line'), btn: tr('Ingreso bajo la línea', 'Income below the line'), get: function (s) { return s.belowLine; }, us: T.mx.belowLine, fmt: pF, kind: 'R', src: 'poverty' },
      { id: 'noSocSec', label: tr('Población sin acceso a la seguridad social', 'People without access to social security'), btn: tr('Sin seguridad social', 'No social security'), get: function (s) { return s.noSocSec; }, us: T.mx.noSocSec, fmt: pF, kind: 'R', src: 'poverty' },
      { id: 'foodShare', label: tr('Comida como parte del gasto de los hogares', 'Food as a share of household spending'), btn: tr('Peso de la comida', 'Weight of food'), get: function (s) { return s.foodShare; }, us: T.mx.foodShare, fmt: pF, kind: 'C', src: 'enigh' },
      { id: 'rentBurden', label: tr('Hogares que rentan con renta de 30% o más de su ingreso', 'Renter households with rent of 30% or more of income'), btn: tr('Carga de la renta', 'Rent burden'), get: function (s) { return s.rentBurden; }, us: T.mx.rentBurden, fmt: pF, kind: 'C', src: 'enigh' }
    ].filter(function (m) { return T.list.some(function (s) { return m.get(s) != null; }); });
    var notes = {
      poverty: bi('Personas con ingreso inferior a la línea de pobreza y al menos una carencia social, porcentaje de la población del estado. ' + T.povertyAsOf + '.', 'People with income below the poverty line and at least one social deprivation, percent of the state\'s population. ' + T.povertyAsOf + '.'),
      extreme: bi('Personas con ingreso inferior a la línea de pobreza extrema y tres o más carencias sociales. ' + T.povertyAsOf + '.', 'People with income below the extreme poverty line and three or more social deprivations. ' + T.povertyAsOf + '.'),
      povertyChg: bi('Diferencia entre el porcentaje de población en pobreza de ' + T.povertyAsOf + ' y el de ' + T.povertyFirst + '. Un número negativo es una baja de la pobreza.', 'Difference between the share of the population in poverty in ' + T.povertyAsOf + ' and in ' + T.povertyFirst + '. A negative number is a fall in poverty.'),
      belowLine: bi('Personas cuyo ingreso no alcanza para la canasta alimentaria y no alimentaria, tengan o no carencias sociales. ' + T.povertyAsOf + '.', 'People whose income does not cover the food and non-food basket, with or without social deprivations. ' + T.povertyAsOf + '.'),
      noSocSec: bi('Personas sin acceso a la seguridad social por su trabajo, una pensión o un familiar: una medida cercana a la informalidad. ' + T.povertyAsOf + '.', 'People with no access to social security through their job, a pension or a relative: a measure close to informality. ' + T.povertyAsOf + '.'),
      foodShare: bi('Alimentos, bebidas y tabaco como porcentaje del gasto monetario de los hogares del estado: cuanto más alto, menos margen queda para lo demás. ENIGH ' + T.asOf + '.', 'Food, beverages and tobacco as a percent of the monetary spending of the state\'s households: the higher it is, the less room is left for everything else. ENIGH ' + T.asOf + '.'),
      rentBurden: bi('De los hogares que pagan renta, porcentaje que destina a ella 30% o más de su ingreso corriente. ENIGH ' + T.asOf + '; no se muestra en los estados con menos de 150 hogares que rentan en la muestra.', 'Of the households that pay rent, the share that spends 30% or more of current income on it. ENIGH ' + T.asOf + '; not shown for states with fewer than 150 renter households in the sample.')
    };
    function draw() {
      UI.seg('segStressMap', M.map(function (m) { return { id: m.id, label: m.btn }; }), state.stressMap, function (id) { state.stressMap = id; draw(); });
      var m = UI.stateMap({ box: 'mapStress', chips: 'chipsStress', scale: 'scaleStress', rank: 'rankStress', tblKey: 'mapStress', states: T.list, metrics: M, current: state.stressMap });
      $('capStressMap').innerHTML = notes[m.id] + ' ' + UI.kind(m.kind);
      $('srcStressMap').innerHTML = srcLine(m.src);
    }
    draw();
  }

  // =====================================================================================================================
  // 08 Wealth
  // =====================================================================================================================
  function wealth() {
    var X = D.enfih, SV = D.savings, E = D.enif;
    var stats = [], T = X ? X.totals : null, tK = function (v) { return UI.thou(v, 0); };
    if (X) stats.push(st(UI.bill(T.netWorth), tr('Riqueza neta de los hogares, ', 'Household net worth, ') + X.asOf + ' (' + UI.nf(T.gdpMultiple, 1) + tr(' veces el PIB)', ' times GDP)')), st(tK(T.median), tr('Riqueza neta mediana por hogar', 'Median net worth per household')), st(tK(T.mean), tr('Riqueza neta promedio por hogar', 'Mean net worth per household')),
      st(UI.pct(X.top10), tr('de la riqueza la tiene el 10% más rico', 'of the wealth is held by the top 10%'), 'C'), st(UI.pct(X.bottom40), tr('de la riqueza la tiene el 40% con menos', 'of the wealth is held by the bottom 40%'), 'C'));
    if (SV) stats.push(st(UI.bill(SV.funds), tr('Ahorro para el retiro y la vivienda, ', 'Retirement and housing savings, ') + UI.date(SV.fundsAsOf)), st(UI.bill(SV.m2), tr('Depósitos y valores de los hogares (M2), ', 'Household deposits and securities (M2), ') + UI.date(SV.asOf)));
    $('wealthStats').innerHTML = stats.join('');
    if (X) {
      $('wealthCallout').innerHTML = bi(
        '<b>Una fotografía de ' + X.asOf + '.</b> De ' + UI.bill(T.assets) + ' en activos de los hogares, ' + UI.bill(T.nonFinancial) + ' (' + UI.pct(T.nonFinancial / T.assets * 100, 0) + ') son no financieros (vivienda, otras propiedades, negocios, vehículos) y ' + UI.bill(T.financial) + ', financieros; el ' + UI.pct(by(X.financialValue, 'retirement').share, 0) + ' de estos es ahorro para el retiro. Las deudas suman ' + UI.bill(T.debts) + ', el ' + UI.pct(T.debts / T.assets * 100) + ' de los activos. La mitad de los hogares tiene menos de ' + tK(T.median) + '. ' + UI.kind('C'),
        '<b>A photograph of ' + X.asOf + '.</b> Of ' + UI.bill(T.assets) + ' in household assets, ' + UI.bill(T.nonFinancial) + ' (' + UI.pct(T.nonFinancial / T.assets * 100, 0) + ') are non-financial (homes, other properties, businesses, vehicles) and ' + UI.bill(T.financial) + ' financial; ' + UI.pct(by(X.financialValue, 'retirement').share, 0) + ' of the latter is retirement savings. Debts total ' + UI.bill(T.debts) + ', ' + UI.pct(T.debts / T.assets * 100) + ' of assets. Half of households have less than ' + tK(T.median) + '. ' + UI.kind('C'));
      var gl = X.groupKeys.map(function (k) { return nm('xfGroup', k); });
      $('capWealthShare').innerHTML = bi('Hogares ordenados por su riqueza neta, ' + X.asOf + ': parte de los hogares y parte de la riqueza de cada grupo. La parte de la riqueza se calcula con el promedio de cada grupo y su tamaño. ' + UI.kind('C'), 'Households ranked by net worth, ' + X.asOf + ': each group\'s share of households and of wealth. The share of wealth is computed from each group\'s mean and its size. ' + UI.kind('C'));
      UI.bar('chWealthShare', { labels: gl, datasets: [{ label: tr('% de los hogares', '% of households'), data: X.sizes, color: NEUTRAL() }, { label: tr('% de la riqueza neta', '% of net worth'), data: X.share, color: S(1) }], fmt: pF, axisFmt: pctAxis, thickness: 20, catSize: 10 });
      UI.legend('chWealthShare', [{ c: NEUTRAL(), l: tr('Parte de los hogares', 'Share of households') }, { c: S(1), l: tr('Parte de la riqueza neta', 'Share of net worth') }]);
      UI.table('chWealthShare', [tr('Percentiles de riqueza', 'Wealth percentiles'), tr('% de los hogares', '% of households'), tr('% de la riqueza', '% of wealth'), tr('Promedio (miles de pesos)', 'Mean (thousands of pesos)'), tr('Mediana (miles de pesos)', 'Median (thousands of pesos)')], gl.map(function (l, i) { return [l, UI.pct(X.sizes[i], 0), UI.pct(X.share[i]), UI.nf(X.byNetWorth.mean[i], 1), UI.nf(X.byNetWorth.median[i], 1)]; }));
      var two = function (id, G) {
        UI.bar(id, { labels: gl, datasets: [{ label: tr('Mediana', 'Median'), data: G.median, color: S(3) }, { label: tr('Promedio', 'Mean'), data: G.mean, color: S(1) }], fmt: function (v) { return UI.thou(v, 1); }, axisFmt: function (v) { return UI.nf(v, 0); }, thickness: 20, catSize: 10 });
        UI.legend(id, [{ c: S(3), l: tr('Mediana', 'Median') }, { c: S(1), l: tr('Promedio', 'Mean') }]);
        UI.table(id, [tr('Percentiles', 'Percentiles'), tr('Mediana (miles de pesos)', 'Median (thousands of pesos)'), tr('Promedio (miles de pesos)', 'Mean (thousands of pesos)')], gl.map(function (l, i) { return [l, UI.nf(G.median[i], 1), UI.nf(G.mean[i], 1)]; }));
      };
      two('chWealthGroups', X.byNetWorth); two('chWealthIncome', X.byIncome);
      var dr = X.bySex.map(function (x) { return { l: nm('sex', x.k), x: x }; }).concat(X.byEdu.map(function (x) { return { l: nm('xfEdu', x.k), x: x }; }));
      UI.bar('chWealthDemo', { horizontal: true, labels: dr.map(function (r) { return r.l; }), datasets: [{ label: tr('Mediana', 'Median'), data: dr.map(function (r) { return r.x.median; }), color: S(3) }, { label: tr('Promedio', 'Mean'), data: dr.map(function (r) { return r.x.mean; }), color: S(1) }], fmt: function (v) { return UI.thou(v, 1); }, axisFmt: function (v) { return UI.nf(v, 0); }, thickness: 12, catSize: 10.5 });
      UI.legend('chWealthDemo', [{ c: S(3), l: tr('Mediana', 'Median') }, { c: S(1), l: tr('Promedio', 'Mean') }]);
      UI.table('chWealthDemo', [tr('Persona de referencia del hogar', 'Reference person of the household'), tr('Mediana (miles de pesos)', 'Median (thousands of pesos)'), tr('Promedio (miles de pesos)', 'Mean (thousands of pesos)')], dr.map(function (r) { return [r.l, UI.nf(r.x.median, 1), UI.nf(r.x.mean, 1)]; }));
      var own = X.assets.map(function (x) { return { l: nm('xfAsset', x.k), v: x.own, med: x.median, mean: x.mean, c: S(1) }; }).concat(X.financial.map(function (x) { return { l: nm('xfAsset', x.k), v: x.own, med: x.median, mean: x.mean, c: S(3) }; })).sort(function (a, b) { return b.v - a.v; });
      $('capAssetsOwn').innerHTML = bi('Porcentaje de hogares que tiene cada activo, ' + X.asOf + '. La mediana del valor entre quienes lo tienen está en la tabla y al pasar el cursor.', 'Share of households that own each asset, ' + X.asOf + '. The median value among owners is in the table and on hover.');
      UI.bar('chAssetsOwn', { horizontal: true, labels: own.map(function (x) { return x.l; }), data: own.map(function (x) { return x.v; }), colors: own.map(function (x) { return x.c; }), fmt: function (v, i) { return UI.pct(v) + (i != null ? tr(' · mediana ', ' · median ') + UI.thou(own[i].med, 1) : ''); }, axisFmt: pctAxis, max: 100, valueLabels: pF, catSize: 10.5, thickness: 15 });
      UI.legend('chAssetsOwn', [{ c: S(1), l: tr('Activos no financieros', 'Non-financial assets') }, { c: S(3), l: tr('Activos financieros', 'Financial assets') }]);
      UI.table('chAssetsOwn', [tr('Activo', 'Asset'), tr('% de hogares que lo tiene', '% of households that own it'), tr('Mediana (miles de pesos)', 'Median (thousands of pesos)'), tr('Promedio (miles de pesos)', 'Mean (thousands of pesos)')], own.map(function (x) { return [x.l, UI.pct(x.v), UI.nf(x.med, 1), UI.nf(x.mean, 1)]; }));
      var cols = [S(1), S(2), S(3), S(4), S(5), S(7), NEUTRAL()];
      var mixBlock = function (title, list) { return '<h4 style="margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)">' + title + '</h4><div class="bar">' + list.map(function (x, i) { return '<i style="background:' + cols[i % cols.length] + ';flex:' + x.share + ' 1 0" title="' + esc(nm('xfAsset', x.k) + ': ' + UI.pct(x.share)) + '"></i>'; }).join('') + '</div><ul>' + list.map(function (x, i) { return '<li><span class="sw" style="background:' + cols[i % cols.length] + '"></span><span class="nm">' + nm('xfAsset', x.k) + '</span><span class="vl">' + UI.pct(x.share) + '</span></li>'; }).join('') + '</ul>'; };
      $('capAssetMix').innerHTML = bi('Composición del valor de los activos de todos los hogares, ' + X.asOf, 'Composition of the value of the assets of all households, ' + X.asOf);
      $('assetMix').innerHTML = '<div class="flow-bars" style="display:block">' + mixBlock(tr('Activos no financieros: ', 'Non-financial assets: ') + UI.bill(T.nonFinancial), X.assetValue) + mixBlock(tr('Activos financieros: ', 'Financial assets: ') + UI.bill(T.financial), X.financialValue) + '</div>';
      var ret = by(X.financial, 'retirement'), home = by(X.assets, 'home');
      $('assetCallout').innerHTML = bi(
        'El ' + UI.pct(home.own) + ' de los hogares es dueño de su vivienda principal, con un valor mediano de ' + UI.thou(home.median, 0) + '. El activo financiero más extendido es el ahorro para el retiro (' + UI.pct(ret.own) + ' de los hogares, mediana de ' + UI.thou(ret.median, 0) + '), que es el ' + UI.pct(by(X.financialValue, 'retirement').share) + ' del valor de los activos financieros. Si se dejan fuera las tarjetas de nómina y cuentas de apoyos sin saldo, solo el ' + UI.pct(T.financialOwnWithBalance) + ' de los hogares tiene activos financieros.',
        UI.pct(home.own) + ' of households own their main home, with a median value of ' + UI.thou(home.median, 0) + '. The most widespread financial asset is retirement savings (' + UI.pct(ret.own) + ' of households, median ' + UI.thou(ret.median, 0) + '), which is ' + UI.pct(by(X.financialValue, 'retirement').share) + ' of the value of financial assets. Leaving out payroll cards and benefit accounts with no balance, only ' + UI.pct(T.financialOwnWithBalance) + ' of households hold financial assets.');
      var dt = X.debtTypes;
      $('capDebtTypes').innerHTML = bi('De los hogares con deuda (' + UI.pct(X.debt.any.own) + ' del total), porcentaje que tiene cada tipo de deuda no hipotecaria, ' + X.asOf + '; junto a cada barra, la mediana de lo que deben', 'Of households with debt (' + UI.pct(X.debt.any.own) + ' of all), the share with each type of non-mortgage debt, ' + X.asOf + '; beside each bar, the median owed');
      UI.bar('chDebtTypes', { horizontal: true, labels: dt.map(function (x) { return nm('xfDebt', x.k); }), data: dt.map(function (x) { return x.own; }), fmt: function (v, i) { return UI.pct(v) + (i != null ? tr(' · mediana ', ' · median ') + UI.thou(dt[i].median, 1) + tr(' · promedio ', ' · mean ') + UI.thou(dt[i].mean, 1) : ''); }, axisFmt: pctAxis, valueLabels: function (v, i) { return UI.pct(v, 0) + ' · ' + UI.thou(dt[i].median, 0); }, catSize: 10.5, thickness: 18 });
      UI.table('chDebtTypes', [tr('Tipo de deuda', 'Type of debt'), tr('% de los hogares con deuda', '% of households with debt'), tr('Mediana (miles de pesos)', 'Median (thousands of pesos)'), tr('Promedio (miles de pesos)', 'Mean (thousands of pesos)'), tr('% del valor de la deuda', '% of the value of debt')], dt.map(function (x) { var sp = by(X.debtValue.split, x.k); return [nm('xfDebt', x.k), UI.pct(x.own), UI.nf(x.median, 1), UI.nf(x.mean, 1), sp ? UI.pct(sp.share) : '—']; }));
      var li = function (v, l) { return '<li><span class="fv">' + v + '</span><span class="fl">' + l + '</span></li>'; }, hf = X.housingFinance;
      $('capDebtFacts').innerHTML = bi('Hogares con deuda y cómo se financió la vivienda, ' + X.asOf, 'Households with debt and how homes were financed, ' + X.asOf);
      $('debtFacts').innerHTML = [li(UI.pct(X.debt.any.own), tr('de los hogares tiene alguna deuda; la mediana es de ', 'of households have some debt; the median is ') + UI.thou(X.debt.any.median, 1)), li(UI.pct(X.debt.mortgage.own), tr('tiene deuda hipotecaria; mediana de ', 'have mortgage debt; median ') + UI.thou(X.debt.mortgage.median, 0)), li(UI.pct(X.debt.other.own), tr('tiene deuda no hipotecaria; mediana de ', 'have non-mortgage debt; median ') + UI.thou(X.debt.other.median, 0)),
        li(UI.pct(X.debtValue.mortgage), tr('del valor de toda la deuda es hipotecaria', 'of the value of all debt is mortgage debt')), li(UI.pct(hf.mortgage), tr('de las viviendas habitadas se financió con crédito hipotecario', 'of occupied homes were financed with a mortgage')), li(UI.pct(hf.none), tr('se pagó con recursos propios del hogar, sin financiamiento', 'were paid for with the household\'s own resources, with no financing')),
        li(UI.pct(hf.informalLoan), tr('se financió con un préstamo informal y ', 'were financed with an informal loan and ') + UI.pct(hf.subsidy) + tr(' con un subsidio de gobierno', ' with a government subsidy'))].join('');
    }
    if (SV) {
      var H = SV.hist, ls = [['m2', tr('Depósitos y valores de los hogares (M2)', 'Household deposits and securities (M2)'), S(1)], ['retirement', tr('Ahorro para el retiro', 'Retirement savings'), S(3)], ['housingFunds', tr('Fondos de vivienda (Infonavit y Fovissste)', 'Housing funds (Infonavit and Fovissste)'), S(4)]];
      $('capSavings').innerHTML = bi('Porcentaje del PIB de los cuatro trimestres a cada fecha. A ' + UI.date(SV.asOf) + ': M2 de los hogares ' + UI.bill(SV.m2) + ' (' + yoyTxt(SV.yoyReal.m2) + '); ahorro para el retiro ' + UI.bill(SV.retirement) + '; fondos de vivienda ' + UI.bill(SV.housingFunds) + '. ' + UI.kind('C'), 'Percent of GDP of the four quarters to each date. To ' + UI.date(SV.asOf) + ': household M2 ' + UI.bill(SV.m2) + ' (' + yoyTxt(SV.yoyReal.m2) + '); retirement savings ' + UI.bill(SV.retirement) + '; housing funds ' + UI.bill(SV.housingFunds) + '. ' + UI.kind('C'));
      UI.line('chSavings', { labels: H.months.map(function (m) { return m.slice(0, 4); }), datasets: ls.map(function (l) { return { label: l[1], data: H[l[0]], color: l[2] }; }), fmt: pF, axisFmt: pctAxis, min: 0, xTicks: 9 });
      UI.charts.chSavings.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(H.months[it[0].dataIndex]); }; UI.charts.chSavings.update();
      UI.legend('chSavings', ls.map(function (l) { return { c: l[2], l: l[1], line: 1 }; }));
      UI.table('chSavings', [tr('Fecha', 'Date')].concat(ls.map(function (l) { return l[1] + tr(', % del PIB', ', % of GDP'); })), H.months.map(function (m, i) { return [UI.date(m)].concat(ls.map(function (l) { return H[l[0]][i] == null ? '—' : UI.pct(H[l[0]][i]); })); }).filter(function (r, i) { return /-12$/.test(H.months[i]) || i === H.months.length - 1; }).reverse());
    }
    if (E) {
      var a = E.all, ac = ['payroll', 'savings', 'benefits', 'app', 'pension', 'checking', 'term', 'fund'].map(function (k) { return { l: nm('acct', k), v: a.accounts[k], c: S(1) }; }), inf = Object.keys(a.informalSaving).map(function (k) { return { l: nm('isave', k), v: a.informalSaving[k], c: S(2) }; });
      var rows = ac.concat(inf).filter(function (x) { return x.v >= 1; }).sort(function (x, y) { return y.v - x.v; });
      $('capEnifAccounts').innerHTML = bi('Porcentaje de las personas de 18 a 70 años, ' + E.asOf + '. Cuentas: las tiene hoy; ahorro informal: lo hizo en los últimos 12 meses. Con alguna cuenta: ' + UI.pct(a.anyAccount) + '; con afore: ' + UI.pct(a.afore) + '; con algún seguro: ' + UI.pct(a.insurance) + '.', 'Share of people aged 18 to 70, ' + E.asOf + '. Accounts: held today; informal saving: done in the past 12 months. With any account: ' + UI.pct(a.anyAccount) + '; with a retirement account: ' + UI.pct(a.afore) + '; with any insurance: ' + UI.pct(a.insurance) + '.');
      UI.bar('chEnifAccounts', { horizontal: true, labels: rows.map(function (x) { return x.l; }), data: rows.map(function (x) { return x.v; }), colors: rows.map(function (x) { return x.c; }), fmt: pF, axisFmt: pctAxis, valueLabels: true, catSize: 10.5, thickness: 14 });
      UI.legend('chEnifAccounts', [{ c: S(1), l: tr('Cuentas en instituciones financieras', 'Accounts at financial institutions') }, { c: S(2), l: tr('Ahorro informal', 'Informal saving') }]);
      UI.table('chEnifAccounts', [tr('Instrumento', 'Instrument'), tr('% de los adultos', '% of adults')], rows.map(function (x) { return [x.l, UI.pct(x.v)]; }));
      var sv = a.saving;
      $('savingCallout').innerHTML = bi(
        'Cómo ahorran los adultos: el <b>' + UI.pct(sv.onlyInformal) + '</b> ahorró solo de manera informal, el ' + UI.pct(sv.both) + ' de las dos maneras, el ' + UI.pct(sv.onlyFormal) + ' solo en una institución y el ' + UI.pct(sv.none) + ' no ahorró.',
        'How adults save: <b>' + UI.pct(sv.onlyInformal) + '</b> saved only informally, ' + UI.pct(sv.both) + ' both ways, ' + UI.pct(sv.onlyFormal) + ' only at an institution and ' + UI.pct(sv.none) + ' did not save.');
    }
  }

  // =====================================================================================================================
  // 09 The K-shaped economy
  // =====================================================================================================================
  function kshape() {
    var K = D.kshape; if (!K || !D.income) return;
    var f = kFacts(), n = K.years.length, a = K.income[0], b = K.income[n - 1], p = K.income[n - 2], X = D.enfih, W = D.wages, WK = D.work, P = D.poverty;
    var gPrev = b.map(function (v, i) { return (v / p[i] - 1) * 100; });
    var stats = [st(UI.signed(f.g1, 0), tr('Ingreso real del decil I, ', 'Real income of decile I, ') + f.y0 + '–' + f.y1, 'C'), st(UI.signed(f.g10, 0), tr('Ingreso real del decil X, ', 'Real income of decile X, ') + f.y0 + '–' + f.y1, 'C'), st(UI.nf(f.ratio[1], 1) + '×', tr('Ingreso del decil X frente al decil I (', 'Decile X income relative to decile I (') + UI.nf(f.ratio[0], 1) + '× ' + tr('en ', 'in ') + f.y0 + ')', 'C'),
      st(UI.nf(f.gini[1], 3), tr('Coeficiente de Gini (', 'Gini coefficient (') + UI.nf(f.gini[0], 3) + tr(' en ', ' in ') + f.y0 + ')')];
    if (f.mw != null) stats.push(st(UI.signed(f.mw, 0), tr('Salario mínimo real desde diciembre de 2018', 'Real minimum wage since December 2018'), 'C'), st(UI.signed(f.pay, 0), tr('Remuneración media real desde diciembre de 2018', 'Average real pay since December 2018'), 'C'));
    $('kStats').innerHTML = stats.join('');
    var closer = f.g1 > f.g10;
    $('kCallout').innerHTML = bi(
      '<b>Qué dicen los datos.</b> ' + (closer ? 'En la encuesta de hogares los dos brazos se acercaron en lugar de separarse' : 'En la encuesta de hogares los dos brazos se separaron') + ': entre ' + f.y0 + ' y ' + f.y1 + ' el ingreso real ' + (f.g1 >= 0 ? 'creció' : 'cayó') + ' ' + UI.pct(Math.abs(f.g1), 0) + ' en el decil más bajo y ' + (f.g10 >= 0 ? 'creció' : 'cayó') + ' ' + UI.pct(Math.abs(f.g10), 0) + ' en el más alto; el 40% de menor ingreso pasó de recibir el ' + UI.pct(f.bot40[0]) + ' del ingreso al <b>' + UI.pct(f.bot40[1]) + '</b> y el 10% superior, del ' + UI.pct(f.top10[0]) + ' al ' + UI.pct(f.top10[1]) + '. ' +
      'Dos advertencias para leerlo: las encuestas de hogares no captan bien los ingresos más altos, así que la caída del decil X puede ser en parte un problema de medición; y la única medición de la riqueza (' + (X ? X.asOf : '—') + ') muestra una concentración mucho mayor que la del ingreso' + (X ? ': el 10% más rico tenía el ' + UI.pct(X.top10) + ' de la riqueza neta' : '') + '. ' + UI.kind('C'),
      '<b>What the data say.</b> ' + (closer ? 'In the household survey the two arms moved closer instead of apart' : 'In the household survey the two arms moved apart') + ': between ' + f.y0 + ' and ' + f.y1 + ' real income ' + (f.g1 >= 0 ? 'grew' : 'fell') + ' ' + UI.pct(Math.abs(f.g1), 0) + ' in the lowest decile and ' + (f.g10 >= 0 ? 'grew' : 'fell') + ' ' + UI.pct(Math.abs(f.g10), 0) + ' in the highest; the bottom 40% went from receiving ' + UI.pct(f.bot40[0]) + ' of income to <b>' + UI.pct(f.bot40[1]) + '</b> and the top 10% from ' + UI.pct(f.top10[0]) + ' to ' + UI.pct(f.top10[1]) + '. ' +
      'Two cautions: household surveys do not capture the highest incomes well, so the fall of decile X may be partly a measurement problem; and the only measurement of wealth (' + (X ? X.asOf : '—') + ') shows a far greater concentration than that of income' + (X ? ': the wealthiest 10% held ' + UI.pct(X.top10) + ' of net worth' : '') + '. ' + UI.kind('C'));
    var yPrev = K.years[n - 2];
    $('capKGrowth').innerHTML = bi('Variación del ingreso corriente promedio de cada decil, a precios de ' + K.base + ', porcentaje ' + UI.kind('C'), 'Change in the mean current income of each decile, at ' + K.base + ' prices, percent ' + UI.kind('C'));
    UI.bar('chKGrowth', { labels: ROMAN, datasets: [{ label: f.y0 + '–' + f.y1, data: f.g.map(function (v) { return Math.round(v * 10) / 10; }), color: S(1) }, { label: yPrev + '–' + f.y1, data: gPrev.map(function (v) { return Math.round(v * 10) / 10; }), color: S(4) }], fmt: function (v) { return UI.signed(v); }, axisFmt: function (v) { return (v < 0 ? '−' : '') + Math.abs(v) + '%'; }, thickness: 16, tipTitle: dT });
    UI.legend('chKGrowth', [{ c: S(1), l: f.y0 + '–' + f.y1 }, { c: S(4), l: yPrev + '–' + f.y1 }]);
    UI.table('chKGrowth', [tr('Decil', 'Decile')].concat(K.years.map(function (y) { return tr('Ingreso ', 'Income ') + y; })).concat([f.y0 + '–' + f.y1, yPrev + '–' + f.y1]), ROMAN.map(function (_, i) { return [dT(i)].concat(K.income.map(function (r) { return UI.peso(r[i]); })).concat([UI.signed(f.g[i]), UI.signed(gPrev[i])]); }));
    var idx = function (i) { return K.income.map(function (r) { return Math.round(r[i] / K.income[0][i] * 1000) / 10; }); }, meanIdx = D.income.history.map(function (h) { return Math.round(h.meanReal / D.income.history[0].meanReal * 1000) / 10; });
    var ix = [[0, tr('Decil I (10% de menor ingreso)', 'Decile I (lowest 10%)'), S(3)], [4, tr('Decil V', 'Decile V'), S(4)], [8, tr('Decil IX', 'Decile IX'), S(1)], [9, tr('Decil X (10% de mayor ingreso)', 'Decile X (highest 10%)'), S(8)]];
    $('capKIndex').innerHTML = bi('Ingreso corriente real por hogar, índice ' + f.y0 + ' = 100, por edición de la encuesta ' + UI.kind('C'), 'Real current income per household, index ' + f.y0 + ' = 100, by edition of the survey ' + UI.kind('C'));
    UI.line('chKIndex', { labels: K.years, datasets: ix.map(function (x) { return { label: x[1], data: idx(x[0]), color: x[2], points: true }; }).concat([{ label: tr('Promedio de todos los hogares', 'Mean of all households'), data: meanIdx, color: UI.css('--text-primary'), dash: [5, 4], points: true }]), fmt: function (v) { return UI.nf(v, 1); }, xTicks: 6 });
    UI.legend('chKIndex', ix.map(function (x) { return { c: x[2], l: x[1], line: 1 }; }).concat([{ c: UI.css('--text-primary'), l: tr('Promedio de todos los hogares', 'Mean of all households'), line: 1 }]));
    UI.table('chKIndex', [tr('Edición', 'Edition')].concat(ix.map(function (x) { return x[1]; })).concat([tr('Promedio', 'Mean')]), K.years.map(function (y, j) { return [y].concat(ix.map(function (x) { return UI.nf(idx(x[0])[j], 1); })).concat([UI.nf(meanIdx[j], 1)]); }));
    var sh3 = [[tr('40% de menor ingreso', 'Bottom 40%'), K.share.map(function (r) { return Math.round(shareOf(r, 0, 4) * 10) / 10; }), S(3)], [tr('50% intermedio', 'Middle 50%'), K.share.map(function (r) { return Math.round(shareOf(r, 4, 9) * 10) / 10; }), S(4)], [tr('10% de mayor ingreso', 'Top 10%'), K.share.map(function (r) { return r[9]; }), S(8)]];
    UI.line('chKShares', { labels: K.years, datasets: sh3.map(function (x) { return { label: x[0], data: x[1], color: x[2], points: true }; }), fmt: pF, axisFmt: pctAxis, min: 0, xTicks: 6 });
    UI.legend('chKShares', sh3.map(function (x) { return { c: x[2], l: x[0], line: 1 }; }));
    UI.table('chKShares', [tr('Edición', 'Edition')].concat(sh3.map(function (x) { return x[0]; })).concat([tr('5% superior', 'Top 5%'), tr('1% superior', 'Top 1%')]), K.years.map(function (y, j) { return [y].concat(sh3.map(function (x) { return UI.pct(x[1][j]); })).concat([UI.pct(K.top5[j]), UI.pct(K.top1[j])]); }));
    $('capKGini').innerHTML = bi('Coeficiente de Gini del ingreso de los hogares con y sin transferencias (jubilaciones, programas, remesas y apoyos entre hogares). En ' + f.y1 + ' las transferencias lo bajan ' + UI.nf(last(K.giniNoT) - last(K.gini), 3) + ' puntos; en ' + f.y0 + ', ' + UI.nf(K.giniNoT[0] - K.gini[0], 3) + '.', 'Gini coefficient of household income with and without transfers (pensions, programs, remittances and support between households). In ' + f.y1 + ' transfers lower it by ' + UI.nf(last(K.giniNoT) - last(K.gini), 3) + ' points; in ' + f.y0 + ', by ' + UI.nf(K.giniNoT[0] - K.gini[0], 3) + '.');
    UI.line('chKGini', { labels: K.years, datasets: [{ label: tr('Con transferencias', 'With transfers'), data: K.gini, color: S(1), points: true }, { label: tr('Sin transferencias', 'Without transfers'), data: K.giniNoT, color: S(2), points: true }], fmt: function (v) { return UI.nf(v, 3); }, axisFmt: function (v) { return UI.nf(v, 2); }, xTicks: 6 });
    UI.legend('chKGini', [{ c: S(1), l: tr('Gini con transferencias', 'Gini with transfers'), line: 1 }, { c: S(2), l: tr('Gini sin transferencias', 'Gini without transfers'), line: 1 }]);
    UI.table('chKGini', [tr('Edición', 'Edition'), tr('Con transferencias', 'With transfers'), tr('Sin transferencias', 'Without transfers'), tr('Decil X ÷ decil I', 'Decile X ÷ decile I')], K.years.map(function (y, j) { return [y, UI.nf(K.gini[j], 3), UI.nf(K.giniNoT[j], 3), UI.nf(K.ratio[j], 1) + '×']; }));
    // what moved each decile: change in real pesos a month between the first and the latest edition, by source
    var dv = function (key) { return K[key][n - 1].map(function (v, i) { return v - K[key][0][i]; }); }, dl2 = dv('labor'), dp = dv('programs'), dj = dv('pensions'), dtot = b.map(function (v, i) { return v - a[i]; }), doth = dtot.map(function (v, i) { return v - dl2[i] - dp[i] - dj[i]; });
    $('capKDrivers').innerHTML = bi('Cambio en el ingreso real por hogar entre ' + f.y0 + ' y ' + f.y1 + ', pesos al mes de ' + K.base + ', por fuente de ingreso ' + UI.kind('C'), 'Change in real income per household between ' + f.y0 + ' and ' + f.y1 + ', pesos a month of ' + K.base + ', by source of income ' + UI.kind('C'));
    var ds = [{ label: tr('Trabajo', 'Work'), data: dl2, color: S(1) }, { label: tr('Programas de gobierno', 'Government programs'), data: dp, color: S(4) }, { label: tr('Jubilaciones y pensiones', 'Retirement pensions'), data: dj, color: S(2) }, { label: tr('Todo lo demás', 'Everything else'), data: doth, color: NEUTRAL() }];
    UI.bar('chKDrivers', { labels: ROMAN, stacked: true, datasets: ds, fmt: function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + UI.cur() + UI.nf(Math.abs(v)); }, axisFmt: function (v) { return (v < 0 ? '−' : '') + UI.cur() + UI.nf(Math.abs(v)); }, thickness: 26, tipTitle: dT });
    UI.legend('chKDrivers', ds.map(function (x) { return { c: x.color, l: x.label }; }));
    UI.table('chKDrivers', [tr('Decil', 'Decile')].concat(ds.map(function (x) { return x.label; })).concat([tr('Cambio total', 'Total change')]), ROMAN.map(function (_, i) { return [dT(i)].concat(ds.map(function (x) { return (x.data[i] < 0 ? '−' : '+') + UI.nf(Math.abs(x.data[i])); })).concat([(dtot[i] < 0 ? '−' : '+') + UI.nf(Math.abs(dtot[i]))]); }));
    $('capKPrograms').innerHTML = bi('Porcentaje de los hogares de cada decil que recibe ingresos de programas de gobierno. En ' + f.y0 + ' los recibía el ' + UI.pct(K.recvPrograms[0][0], 0) + ' del decil I y el ' + UI.pct(K.recvPrograms[0][9], 0) + ' del X; en ' + f.y1 + ', el ' + UI.pct(last(K.recvPrograms)[0], 0) + ' y el ' + UI.pct(last(K.recvPrograms)[9], 0) + '.', 'Share of the households of each decile that receive income from government programs. In ' + f.y0 + ' it was ' + UI.pct(K.recvPrograms[0][0], 0) + ' of decile I and ' + UI.pct(K.recvPrograms[0][9], 0) + ' of decile X; in ' + f.y1 + ', ' + UI.pct(last(K.recvPrograms)[0], 0) + ' and ' + UI.pct(last(K.recvPrograms)[9], 0) + '.');
    UI.bar('chKPrograms', { labels: ROMAN, datasets: [{ label: String(f.y0), data: K.recvPrograms[0], color: NEUTRAL() }, { label: String(f.y1), data: last(K.recvPrograms), color: S(4) }], fmt: pF, axisFmt: pctAxis, thickness: 16, tipTitle: dT });
    UI.legend('chKPrograms', [{ c: NEUTRAL(), l: String(f.y0) }, { c: S(4), l: String(f.y1) }]);
    UI.table('chKPrograms', [tr('Decil', 'Decile')].concat(K.years.map(function (y) { return tr('% que recibe, ', '% receiving, ') + y; })).concat([tr('Monto promedio al mes, ', 'Mean amount a month, ') + f.y0, tr('Monto promedio al mes, ', 'Mean amount a month, ') + f.y1]), ROMAN.map(function (_, i) { return [dT(i)].concat(K.recvPrograms.map(function (r) { return UI.pct(r[i]); })).concat([UI.peso(K.programs[0][i]), UI.peso(last(K.programs)[i])]); }));
    if (W) {
      $('capKWages').innerHTML = bi('Índices reales, promedio de 2018 = 100, mensual. El salario mínimo general es de ' + UI.peso(W.minWagePesos, 2) + ' al día (' + UI.date(W.minWageAsOf) + '); en diciembre de 2018 era de ' + UI.peso(W.minWagePesos2018, 2) + '. ' + UI.kind('C'), 'Real indexes, 2018 average = 100, monthly. The general minimum wage is ' + UI.peso(W.minWagePesos, 2) + ' a day (' + UI.date(W.minWageAsOf) + '); in December 2018 it was ' + UI.peso(W.minWagePesos2018, 2) + '. ' + UI.kind('C'));
      UI.line('chKWages', { labels: W.months.map(function (m) { return m.slice(0, 4); }), datasets: [{ label: tr('Salario mínimo real', 'Real minimum wage'), data: W.minWage, color: S(3) }, { label: tr('Remuneración media real', 'Average real pay'), data: W.avgPay, color: S(1) }], fmt: function (v) { return UI.nf(v, 1); }, xTicks: 9 });
      UI.charts.chKWages.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(W.months[it[0].dataIndex]); }; UI.charts.chKWages.update();
      UI.legend('chKWages', [{ c: S(3), l: tr('Salario mínimo general, real', 'General minimum wage, real'), line: 1 }, { c: S(1), l: tr('Remuneraciones medias reales de los sectores económicos', 'Average real pay across economic sectors'), line: 1 }]);
      UI.table('chKWages', [tr('Mes', 'Month'), tr('Salario mínimo real', 'Real minimum wage'), tr('Remuneración media real', 'Average real pay')], W.months.map(function (m, i) { return [UI.date(m), UI.nf(W.minWage[i], 1), UI.nf(W.avgPay[i], 1)]; }).filter(function (r, i) { return /-12$/.test(W.months[i]) || i === W.months.length - 1; }).reverse());
    }
    if (WK) {
      var i0 = 0, i1 = WK.q.length - 1;
      $('capKWork').innerHTML = bi('Porcentaje de la población ocupada según su ingreso por trabajo, trimestral; el resto no recibe ingresos o no lo especifica. A ' + UI.date(WK.asOf) + ', ' + UI.mill(by(WK.levels, 'UpTo1').n) + ' de ' + UI.mill(WK.employed) + ' de ocupados ganan hasta un salario mínimo.', 'Percent of the employed population by labor income, quarterly; the rest receive no income or do not state it. To ' + UI.date(WK.asOf) + ', ' + UI.mill(by(WK.levels, 'UpTo1').n) + ' of ' + UI.mill(WK.employed) + ' workers earn up to one minimum wage.');
      UI.line('chKWork', { labels: WK.q.map(function (q) { return q.slice(0, 4); }), datasets: [{ label: tr('Hasta un salario mínimo', 'Up to one minimum wage'), data: WK.upTo1, color: S(8) }, { label: tr('Más de uno y hasta dos', 'More than one, up to two'), data: WK.from1to2, color: S(4) }, { label: tr('Más de dos', 'More than two'), data: WK.over2, color: S(1) }], fmt: pF, axisFmt: pctAxis, min: 0, xTicks: 9 });
      UI.charts.chKWork.options.plugins.tooltip.callbacks.title = function (it) { return UI.date(WK.q[it[0].dataIndex]); }; UI.charts.chKWork.update();
      UI.legend('chKWork', [{ c: S(8), l: tr('Hasta un salario mínimo', 'Up to one minimum wage'), line: 1 }, { c: S(4), l: tr('Más de uno y hasta dos salarios mínimos', 'More than one and up to two minimum wages'), line: 1 }, { c: S(1), l: tr('Más de dos salarios mínimos', 'More than two minimum wages'), line: 1 }]);
      UI.table('chKWork', [tr('Trimestre', 'Quarter'), tr('Hasta un salario mínimo', 'Up to one minimum wage'), tr('Más de uno y hasta dos', 'More than one, up to two'), tr('Más de dos', 'More than two')], WK.q.map(function (q, i) { return [UI.date(q), UI.pct(WK.upTo1[i]), UI.pct(WK.from1to2[i]), UI.pct(WK.over2[i])]; }).filter(function (r, i) { return /Q4$/.test(WK.q[i]) || i === WK.q.length - 1; }).reverse());
      $('workCallout').innerHTML = bi(
        '<b>Cómo leerlo.</b> La parte de trabajadores que gana hasta un salario mínimo pasó del ' + UI.pct(WK.upTo1[i0]) + ' en ' + UI.date(WK.q[i0]) + ' al <b>' + UI.pct(WK.upTo1[i1]) + '</b>, y la de quienes ganan más de dos bajó del ' + UI.pct(WK.over2[i0]) + ' al ' + UI.pct(WK.over2[i1]) + '. ' + (f.mw != null && f.mw > f.pay ? 'No significa por sí solo que ganen menos: la vara subió. Desde diciembre de 2018 el salario mínimo real aumentó ' + UI.pct(f.mw, 0) + ' y la remuneración media real, ' + UI.pct(f.pay, 0) + '; cuando el mínimo sube más rápido que los demás sueldos, más trabajadores quedan en el primer escalón. ' : '') + UI.kind('C'),
        '<b>How to read it.</b> The share of workers earning up to one minimum wage went from ' + UI.pct(WK.upTo1[i0]) + ' in ' + UI.date(WK.q[i0]) + ' to <b>' + UI.pct(WK.upTo1[i1]) + '</b>, and the share earning more than two fell from ' + UI.pct(WK.over2[i0]) + ' to ' + UI.pct(WK.over2[i1]) + '. ' + (f.mw != null && f.mw > f.pay ? 'By itself it does not mean they earn less: the yardstick rose. Since December 2018 the real minimum wage has increased ' + UI.pct(f.mw, 0) + ' and average real pay ' + UI.pct(f.pay, 0) + '; when the minimum rises faster than other pay, more workers sit on the first rung. ' : '') + UI.kind('C'));
    }
    var sa = K.spending[0], sb = K.spending[n - 1], sp = K.spending[n - 2], sg = sb.map(function (v, i) { return Math.round((v / sa[i] - 1) * 1000) / 10; }), sgp = sb.map(function (v, i) { return Math.round((v / sp[i] - 1) * 1000) / 10; });
    $('capKSpend').innerHTML = bi('Variación del gasto monetario promedio de cada decil de ingreso, a precios de ' + K.base + ', porcentaje ' + UI.kind('C'), 'Change in the mean monetary spending of each income decile, at ' + K.base + ' prices, percent ' + UI.kind('C'));
    UI.bar('chKSpend', { labels: ROMAN, datasets: [{ label: f.y0 + '–' + f.y1, data: sg, color: S(5) }, { label: yPrev + '–' + f.y1, data: sgp, color: S(4) }], fmt: function (v) { return UI.signed(v); }, axisFmt: function (v) { return (v < 0 ? '−' : '') + Math.abs(v) + '%'; }, thickness: 16, tipTitle: dT });
    UI.legend('chKSpend', [{ c: S(5), l: f.y0 + '–' + f.y1 }, { c: S(4), l: yPrev + '–' + f.y1 }]);
    UI.table('chKSpend', [tr('Decil', 'Decile')].concat(K.years.map(function (y) { return tr('Gasto ', 'Spending ') + y; })).concat([f.y0 + '–' + f.y1, yPrev + '–' + f.y1, tr('% del gasto total, ', '% of all spending, ') + f.y0, tr('% del gasto total, ', '% of all spending, ') + f.y1]), ROMAN.map(function (_, i) { return [dT(i)].concat(K.spending.map(function (r) { return UI.peso(r[i]); })).concat([UI.signed(sg[i]), UI.signed(sgp[i]), UI.pct(K.spendShare[0][i]), UI.pct(last(K.spendShare)[i])]); }));
    // how concentrated: income and spending (latest survey) against wealth (2019)
    var ls = last(K.share), lss = last(K.spendShare);
    var cats = [{ l: tr('Ingreso (', 'Income (') + f.y1 + ')', top: ls[9], bot: shareOf(ls, 0, 4) }, { l: tr('Gasto de consumo (', 'Consumer spending (') + f.y1 + ')', top: lss[9], bot: shareOf(lss, 0, 4) }];
    if (X) cats.push({ l: tr('Riqueza neta (', 'Net worth (') + X.asOf + ')', top: X.top10, bot: X.bottom40 });
    $('capKTop').innerHTML = bi('Parte que corresponde al 10% superior y al 40% inferior de los hogares. En ingreso y gasto los hogares se ordenan por ingreso; en riqueza, por riqueza neta. ' + UI.kind('C'), 'Share held by the top 10% and by the bottom 40% of households. For income and spending households are ranked by income; for wealth, by net worth. ' + UI.kind('C'));
    UI.bar('chKTop', { labels: cats.map(function (c) { return c.l; }), datasets: [{ label: tr('10% superior', 'Top 10%'), data: cats.map(function (c) { return c.top; }), color: S(8) }, { label: tr('40% inferior', 'Bottom 40%'), data: cats.map(function (c) { return Math.round(c.bot * 10) / 10; }), color: S(3) }], fmt: pF, axisFmt: pctAxis, thickness: 34, valueLabels: false, wrap: 16 });
    UI.legend('chKTop', [{ c: S(8), l: tr('10% superior de los hogares', 'Top 10% of households') }, { c: S(3), l: tr('40% inferior de los hogares', 'Bottom 40% of households') }]);
    UI.table('chKTop', [tr('Medida', 'Measure'), tr('10% superior', 'Top 10%'), tr('40% inferior', 'Bottom 40%')], cats.map(function (c) { return [c.l, UI.pct(c.top), UI.pct(c.bot)]; }));
    $('srcKTop').innerHTML = srcLine('enigh') + (X ? ' · ' + srcLine('enfih').replace(/^[^:]+: /, '') : '');
    $('kTopCallout').innerHTML = bi(
      'El 10% de hogares de arriba hace el ' + UI.pct(lss[9], 0) + ' del gasto y recibe el ' + UI.pct(ls[9], 0) + ' del ingreso' + (X ? '; el 10% más rico tenía el ' + UI.pct(X.top10, 0) + ' de la riqueza' : '') + '. La K mexicana, si existe, no está en el flujo de ingresos que mide la encuesta sino en quién tiene activos, crédito formal y seguridad social' + (P ? ' (el ' + UI.pct(last(P.national.noSocialSecurity), 0) + ' de la población no tiene acceso a ella)' : '') + '. ' + UI.kind('C'),
      'The top 10% of households do ' + UI.pct(lss[9], 0) + ' of spending and receive ' + UI.pct(ls[9], 0) + ' of income' + (X ? '; the wealthiest 10% held ' + UI.pct(X.top10, 0) + ' of the wealth' : '') + '. Mexico\'s K, if there is one, is not in the flow of income the survey measures but in who has assets, formal credit and social security' + (P ? ' (' + UI.pct(last(P.national.noSocialSecurity), 0) + ' of the population has no access to it)' : '') + '. ' + UI.kind('C'));
  }

  // =====================================================================================================================
  // 10 What companies report
  // =====================================================================================================================
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; }
  var RETAIL = { grocery: 1, value: 1, department: 1 };
  function companySummary() {
    if (!CO || !CO.companies.length) return null;
    var comps = CO.companies.filter(function (c) { return c.comp; }), pos = comps.filter(function (c) { return c.comp.v > 0; }), med = median(comps.map(function (c) { return c.comp.v; }));
    var tr2 = CO.companies.filter(function (c) { return c.traffic; }), trDown = tr2.filter(function (c) { return c.traffic.v < 0; });
    var npl = CO.companies.filter(function (c) { return c.npl && c.npl.prev != null; }), nplUp = npl.filter(function (c) { return c.npl.v > c.npl.prev; });
    if (!comps.length) return null;
    var best = comps.slice().sort(function (x, y) { return y.comp.v - x.comp.v; })[0], worst = comps.slice().sort(function (x, y) { return x.comp.v - y.comp.v; })[0];
    return bi(
      'Lo que ven las empresas: de ' + comps.length + ' cadenas que reportan ventas a tiendas iguales en México, ' + pos.length + ' crecieron; la mediana es de <b>' + UI.signed(med) + '</b>, de ' + UI.signed(worst.comp.v, worst.comp.dp) + ' (' + esc(worst.short || worst.name) + ') a ' + UI.signed(best.comp.v, best.comp.dp) + ' (' + esc(best.short || best.name) + ').' + (tr2.length ? ' El tráfico cayó en ' + trDown.length + ' de las ' + tr2.length + ' que lo reportan.' : '') + (npl.length ? ' La cartera vencida subió frente al año anterior en ' + nplUp.length + ' de ' + npl.length + ' prestamistas.' : ''),
      'What companies see: of ' + comps.length + ' chains that report same-store sales in Mexico, ' + pos.length + ' grew; the median is <b>' + UI.signed(med) + '</b>, from ' + UI.signed(worst.comp.v, worst.comp.dp) + ' (' + esc(worst.short || worst.name) + ') to ' + UI.signed(best.comp.v, best.comp.dp) + ' (' + esc(best.short || best.name) + ').' + (tr2.length ? ' Traffic fell at ' + trDown.length + ' of the ' + tr2.length + ' that report it.' : '') + (npl.length ? ' Past-due loans rose from a year earlier at ' + nplUp.length + ' of ' + npl.length + ' lenders.' : ''));
  }
  // one figure of a company, in the unit its report gives
  function figVal(m) {
    var dp = m.dp == null ? 1 : m.dp, v = m.v;
    if (m.unit === 'rate') return UI.pct(v, dp);
    if (m.unit === 'x') return UI.nf(v, dp) + '×';
    if (m.unit === 'mm') return UI.nf(v, dp) + tr(' millones', ' million');
    if (m.unit === 'k') return UI.nf(v, dp) + tr(' mil', ' thousand');
    if (m.unit === 'n') return UI.nf(v, dp);
    if (m.unit === 'mxnM') return UI.cur() + UI.nf(v, dp) + tr(' millones', ' million');
    if (m.unit === 'usdM') return 'US$' + UI.nf(v, dp) + tr(' millones', ' million');
    return '<span class="' + (v > 0 ? 'up' : v < 0 ? 'down' : '') + '">' + UI.signed(v, dp) + '</span>';
  }
  function figPrev(m) { if (m.prev == null) return ''; var dp = m.dp == null ? 1 : m.dp; return ' <span class="nd">(' + (m.unit === 'rate' ? UI.pct(m.prev, dp) : m.unit === 'x' ? UI.nf(m.prev, dp) + '×' : m.unit === 'chg' || !m.unit ? UI.signed(m.prev, dp) : UI.nf(m.prev, dp)) + tr(' un año antes', ' a year earlier') + ')</span>'; }
  function companies() {
    if (!CO || !CO.companies.length) { $('empresas').hidden = true; return; }
    var newer = CO.companies.filter(function (c) { return c.newerFiling; });
    $('metaCompanies').innerHTML = bi('Fuente: reportes de resultados de cada empresa, presentados ante la Bolsa Mexicana de Valores o la SEC de Estados Unidos; cada empresa enlaza a su documento. Última revisión: <span class="data-through">' + UI.date(CO.reviewed) + '</span>.', 'Source: each company\'s results release, filed with the Mexican stock exchange (BMV) or the U.S. SEC; every company links to its document. Last reviewed: <span class="data-through">' + UI.date(CO.reviewed) + '</span>.') +
      (newer.length ? ' ' + UI.amber(tr(newer.length + ' con reporte más reciente por revisar', newer.length + ' with a newer report to review'), newer.map(function (c) { return c.ticker; }).join(', ')) : '');
    $('coCallout').innerHTML = (companySummary() || '') + ' ' + UI.kind('C') + bi(' Las definiciones difieren entre empresas; las cifras no son estrictamente comparables entre sí.', ' Definitions differ across companies; the figures are not strictly comparable with one another.');
    var gname = {}; CO.groups.forEach(function (g) { gname[g.id] = tr(g.es, g.en); });
    var gcol = { grocery: S(1), value: S(2), department: S(5), staples: S(3) };
    var order = CO.groups.map(function (g) { return g.id; });
    var comps = CO.companies.filter(function (c) { return c.comp; });
    comps.sort(function (x, y) { return order.indexOf(x.group) - order.indexOf(y.group) || y.comp.v - x.comp.v; });
    if (comps.length) {
      UI.bar('chComps', { horizontal: true, labels: comps.map(function (c) { return c.short || c.name; }), data: comps.map(function (c) { return c.comp.v; }), colors: comps.map(function (c) { return gcol[c.group] || NEUTRAL(); }), fmt: function (v, i) { return UI.signed(v, i != null && comps[i].comp.dp != null ? comps[i].comp.dp : 1) + (i != null ? ' · ' + tr(comps[i].segment.es, comps[i].segment.en) + ' · ' + tr(comps[i].period.es, comps[i].period.en) : ''); }, axisFmt: function (v) { return (v < 0 ? '−' : '') + Math.abs(v) + '%'; }, valueLabels: function (v, i) { return UI.signed(v, comps[i].comp.dp == null ? 1 : comps[i].comp.dp); }, thickness: 16, tipTitle: function (i) { return comps[i].name + ' (' + comps[i].ticker + ')'; } });
      var usedG = {}; comps.forEach(function (c) { usedG[c.group] = 1; });
      UI.legend('chComps', order.filter(function (g) { return usedG[g]; }).map(function (g) { return { c: gcol[g] || NEUTRAL(), l: gname[g] }; }));
    }
    $('compsCard').hidden = !comps.length;
    var srcA = function (c) { return '<a class="srcl" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + (c.channel === 'sec' ? tr('Reporte ante la SEC ↗', 'SEC filing ↗') : tr('Reporte ante la BMV ↗', 'BMV filing ↗')) + '</a>'; };
    var td = function (label, inner) { return '<td data-l="' + label + '"' + (inner === UI.nd() ? ' class="empty"' : '') + '>' + inner + '</td>'; };
    var cellOf = function (m) { return m ? figVal(m) + figPrev(m) : UI.nd(); };
    var html = '';
    CO.groups.forEach(function (g) {
      var list = CO.companies.filter(function (c) { return c.group === g.id; }); if (!list.length) return;
      var retail = !!RETAIL[g.id];
      var head = retail ? [tr('Empresa', 'Company'), tr('Ventas a tiendas iguales', 'Same-store sales'), tr('Ventas totales', 'Total sales'), tr('Tráfico', 'Traffic'), tr('Ticket promedio', 'Average ticket'), tr('Segmento, otras cifras, cita y fuente', 'Segment, other figures, quote and source')]
        : [tr('Empresa', 'Company'), tr('Lo que reporta', 'What it reports'), tr('Segmento, cita y fuente', 'Segment, quote and source')];
      html += '<div class="card full co-group"><h3>' + gname[g.id] + '</h3><div class="tblwrap"><table class="co-table"><colgroup>' + (retail ? [21, 12, 11, 9, 10, 37] : [21, 39, 40]).map(function (w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup><thead><tr>' + head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
      list.forEach(function (c) {
        var first = '<td><span class="tk">' + esc(c.name) + '</span> <span class="nd">' + esc(c.ticker) + '</span><span class="per">' + tr(c.period.es, c.period.en) + ' · ' + UI.date(c.periodEnd) + '</span>' + (c.newerFiling ? '<span class="new" title="' + esc(tr('Ya hay un reporte de resultados más reciente, del ', 'A newer results release exists, dated ') + UI.date(c.newerFiling)) + '">' + tr('reporte más reciente por revisar', 'newer report to review') + '</span>' : '') + '</td>';
        var extras = (c.extra || []).map(function (x) { return tr(x.label.es, x.label.en) + ': ' + figVal(x) + figPrev(x); });
        var txt = '<td class="txt"><b>' + tr(c.segment.es, c.segment.en) + '.</b>' + (retail && extras.length ? '<span class="xt">' + extras.join(' · ') + '</span>' : '') +
          (c.quote ? '<span class="xt"><q lang="' + (c.quote.lang || 'es') + '">' + esc(c.quote.text) + '</q>' + (c.quote.by || c.quote.role ? '<span class="by">' + (c.quote.by ? esc(c.quote.by) : '') + (c.quote.by && c.quote.role ? ', ' : '') + (c.quote.role ? tr(c.quote.role.es, c.quote.role.en) : '') + '</span>' : '') + '</span>' : '') + '<span class="xt">' + srcA(c) + ' · ' + tr('presentado el ', 'filed ') + UI.date(c.filed) + '</span></td>';
        if (retail) html += '<tr>' + first + td(head[1], cellOf(c.comp)) + td(head[2], cellOf(c.sales)) + td(head[3], cellOf(c.traffic)) + td(head[4], cellOf(c.ticket)) + txt + '</tr>';
        else { var figs = [c.npl ? { label: c.npl.label || { es: 'Cartera vencida', en: 'Past-due loans' }, m: c.npl } : null, c.loans ? { label: c.loans.label || { es: 'Cartera de crédito, variación anual', en: 'Loan portfolio, y/y' }, m: c.loans } : null].filter(Boolean).concat((c.extra || []).map(function (x) { return { label: x.label, m: x }; }));
          html += '<tr>' + first + '<td data-l="' + head[1] + '" style="text-align:left">' + figs.map(function (f) { return '<span class="lbl">' + tr(f.label.es, f.label.en) + '</span><span class="big">' + figVal(f.m) + '</span>' + figPrev(f.m); }).join('<span style="display:block;height:6px"></span>') + '</td>' + txt + '</tr>'; }
      });
      html += '</tbody></table></div><p class="chart-src">' + tr('n. d. = el reporte no da la cifra. Entre paréntesis, el mismo periodo del año anterior. Las citas se muestran en el idioma del reporte.', 'n/a = the release does not give the figure. In parentheses, the same period a year earlier. Quotes are shown in the language of the release.') + '</p></div>';
    });
    $('coTables').innerHTML = html;
  }

  // =====================================================================================================================
  // Sources
  // =====================================================================================================================
  function sources() {
    var desc = {
      enigh: ['Ingreso y gasto de los hogares, cada dos años, con microdatos públicos: promedio, mediana, deciles, estados y grupos de hogares. Las tabulaciones se cotejan contra las cifras que imprime el INEGI.', 'Household income and spending, every two years, from public microdata: mean, median, deciles, states and groups of households. The tabulations are checked against the figures INEGI prints.'],
      informality: ['Tasa de informalidad laboral, mensual.', 'Rate of informal employment, monthly.'],
      poverty: ['Pobreza y carencias sociales, nacional y por estado, cada dos años con la ENIGH.', 'Poverty and social deprivations, national and by state, every two years with the ENIGH.'],
      statesBanxico: ['Remesas por estado y cartera de crédito a la vivienda de la banca comercial por estado, trimestral.', 'Remittances by state and commercial banks\' housing loan portfolio by state, quarterly.'],
      accounts: ['Consumo privado y PIB a precios corrientes, trimestral.', 'Private consumption and GDP at current prices, quarterly.'],
      consumption: ['Indicador mensual del consumo privado en el mercado interior: bienes y servicios nacionales y bienes importados.', 'Monthly indicator of private consumption in the domestic market: domestic goods and services, and imported goods.'],
      remittances: ['Ingresos por remesas familiares, mensual.', 'Family remittance inflows, monthly.'],
      cardPayments: ['Monto de los pagos con tarjetas de crédito y débito por giro del comercio, diario desde diciembre de 2022.', 'Value of credit and debit card payments by type of merchant, daily since December 2022.'],
      financing: ['Financiamiento total a los hogares, por destino y otorgante: bancos, Infonavit, Fovissste y otros. Trimestral.', 'Total financing to households, by purpose and lender: banks, Infonavit, Fovissste and others. Quarterly.'],
      bankCredit: ['Cartera vigente de la banca comercial por producto, y cartera total y vencida por producto. Mensual.', 'Performing portfolio of commercial banks by product, and total and past-due portfolio by product. Monthly.'],
      rates: ['Tasas promedio ponderadas de tarjetas de crédito, créditos de nómina, personales y automotrices (bimestral) y costo de los créditos hipotecarios (mensual).', 'Weighted average rates of credit cards, payroll, personal and auto loans (every two months) and cost of mortgages (monthly).'],
      cardsInForce: ['Tarjetas de crédito vigentes al cierre de cada trimestre.', 'Credit cards in force at the end of each quarter.'],
      bis: ['Crédito total a los hogares como porcentaje del PIB, serie comparable entre países, trimestral.', 'Total credit to households as a percent of GDP, a series comparable across countries, quarterly.'],
      lending: ['Encuesta trimestral a los bancos sobre demanda de crédito y condiciones de aprobación.', 'Quarterly survey of banks on credit demand and approval standards.'],
      enif: ['Encuesta trienal a personas de 18 a 70 años, con microdatos públicos: cuentas, crédito, ahorro, atrasos, rechazos y resiliencia financiera.', 'Triennial survey of people aged 18 to 70, from public microdata: accounts, credit, saving, late payments, rejections and financial resilience.'],
      enfih: ['Única edición (2019): activos, deudas y riqueza neta de los hogares. Cifras leídas en la presentación de resultados y cotejadas contra su texto.', 'The only edition (2019): assets, debts and net worth of households. Figures read in the results presentation and checked against its text.'],
      savings: ['M2 en poder de los hogares y fondos de ahorro para el retiro y la vivienda, mensual.', 'M2 held by households and retirement and housing savings funds, monthly.'],
      wages: ['Índice real del salario mínimo general e índice global de remuneraciones medias reales, mensual.', 'Real index of the general minimum wage and global index of average real pay, monthly.'],
      enoe: ['Población ocupada por nivel de ingresos en múltiplos del salario mínimo, trimestral.', 'Employed population by income level in multiples of the minimum wage, quarterly.']
    };
    var items = Object.keys(D.sources).map(function (id) { var s = D.sources[id], d = desc[id] || ['', '']; return '<div class="item"><div class="t">' + esc(nm('srcShort', id)) + '</div><div class="d">' + tr(d[0], d[1]) + ' <span class="data-through">' + UI.through(s.asOf) + '</span>.' + (s.via ? ' ' + tr('Serie leída a través de FRED (Fed de San Luis), verificada contra su título.', 'Series read through FRED (St. Louis Fed), checked against its title.') : '') + '</div><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + ' ↗</a></div>'; });
    if (CO && CO.companies.length) items.push('<div class="item"><div class="t">' + tr('Reportes de resultados de las empresas', 'Company results releases') + '</div><div class="d">' + tr('Reportes de ' + CO.companies.length + ' empresas, presentados como eventos relevantes o reportes trimestrales ante la Bolsa Mexicana de Valores, o como formularios 6-K y 8-K ante la SEC de Estados Unidos. Cada cifra y cita se coteja contra el texto del documento. Última revisión: ', 'Releases of ' + CO.companies.length + ' companies, filed as material events or quarterly reports with the Mexican stock exchange (BMV), or as Forms 6-K and 8-K with the U.S. SEC. Every figure and quote is checked against the text of the document. Last reviewed: ') + '<span class="data-through">' + UI.date(CO.reviewed) + '</span>.</div><a href="https://www.bmv.com.mx/" target="_blank" rel="noopener">bmv.com.mx ↗</a></div>');
    $('srcGrid').innerHTML = items.join('');
    $('fineUpdate').innerHTML = bi(
      '<b>Actualización.</b> Las fuentes oficiales se consultan dos veces al día y la página cambia solo cuando alguna publica un dato nuevo: crédito, ahorro, salarios y pagos cada mes; financiamiento, cuentas nacionales y empleo cada trimestre; y las encuestas (ENIGH y pobreza cada dos años, ENIF cada tres) cuando sale su siguiente edición. Cada bloque indica el periodo de sus datos. Las cifras de las empresas se revisan cuando publican resultados. Datos generados: ' + when(D.generatedAt) + ' (hora de la Ciudad de México).',
      '<b>Updates.</b> The official sources are checked twice a day and the page changes only when one of them publishes something new: credit, savings, wages and payments every month; financing, national accounts and employment every quarter; and the surveys (ENIGH and poverty every two years, ENIF every three) when their next edition comes out. Every block states the period of its data. Company figures are reviewed when results are published. Data generated: ' + when(D.generatedAt) + ' (Mexico City time).');
  }

  // =====================================================================================================================
  function statColumns() { Array.prototype.forEach.call(document.querySelectorAll('.stat-row'), function (el) { var n = el.children.length; el.style.setProperty('--n', n <= 6 ? n : Math.ceil(n / 2)); }); }
  // a block the last build could not produce leaves no empty frame: its section, its navigation link and any card whose charts have no data are hidden
  function hideEmpty() {
    var need = { demografia: D.demo, ingreso: D.income, fondos: D.funds, deciles: D.deciles, credito: D.credit || D.bank || D.enif, estres: D.bank || D.enif || D.poverty, riqueza: D.enfih || D.savings, 'economia-k': D.kshape, empresas: CO && CO.companies.length };
    Object.keys(need).forEach(function (id) { var el = $(id), a = document.querySelector('#jumpNav a[href="#' + id + '"]'); if (el) el.hidden = !need[id]; if (a) a.hidden = !need[id]; });
    var maps = { incomeMapCard: D.states, debtMapCard: D.states, stressMapCard: D.states && D.states.list[0].poverty != null };
    Object.keys(maps).forEach(function (id) { var el = $(id); if (el) el.hidden = !maps[id]; });
    Array.prototype.forEach.call(document.querySelectorAll('.card'), function (card) {
      if (card.id === 'compsCard') return;
      var cv = card.querySelectorAll('canvas'); if (!cv.length) return;
      card.hidden = !Array.prototype.some.call(cv, function (c) { return !!UI.charts[c.id]; });
    });
    var bc = $('burdenCard'); if (bc) bc.hidden = !D.enfih;
  }
  function renderAll() {
    UI.setupCharts();
    [header, paintProvenance, demographics, income, funds, deciles, credit, stress, wealth, kshape, companies, glance, sources, statColumns, hideEmpty].forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.error(fn.name, e); window.__MXC_ERRORS = (window.__MXC_ERRORS || []).concat([fn.name + ': ' + e.message]); } });
  }
  function setLang(l) {
    UI.lang = l; document.documentElement.setAttribute('lang', l);
    try { localStorage.setItem('fnam-lang', l); } catch (e) {}
    document.title = l === 'en' ? 'The Mexican Consumer · FNAM' : 'El Consumidor Mexicano · FNAM';
    $('btnLangEs').classList.toggle('active', l === 'es'); $('btnLangEn').classList.toggle('active', l === 'en');
    Array.prototype.forEach.call(document.querySelectorAll('a[data-base]'), function (a) { var b = a.getAttribute('data-base'); a.setAttribute('href', b + (b.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + l); });
    try { var u = new URL(location.href); if (u.searchParams.get('lang')) { u.searchParams.set('lang', l); history.replaceState(null, '', u.toString()); } } catch (e) {}
    window.__MXC_ERRORS = [];
    renderAll();
  }
  $('btnLangEs').addEventListener('click', function () { setLang('es'); });
  $('btnLangEn').addEventListener('click', function () { setLang('en'); });
  window.addEventListener('resize', function () { if (D.deciles && (window.innerWidth <= 640) !== state.heatCompact) heat(); });
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

  // A tab left open: when it comes back into view, ask the server whether the data files changed and, if so, load the page
  // again (the files are served with no-store, so a normal visit always reads the latest ones).
  (function () {
    if (!window.fetch || !window.Promise) return;
    var files = ['data/data.js', 'data/companies.js'], seen = {}, lastT = Date.now();
    var tag = function (f) { return fetch(f, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : ''; }).catch(function () { return ''; }); };
    files.forEach(function (f) { tag(f).then(function (t) { seen[f] = t; }); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible' || Date.now() - lastT < 15 * 60000) return;
      lastT = Date.now();
      Promise.all(files.map(tag)).then(function (now) { if (now.some(function (t, i) { return t && seen[files[i]] && t !== seen[files[i]]; })) location.reload(); });
    });
  })();

  setLang(UI.lang);
  window.MXC_APP = { render: renderAll, state: state };
})();
