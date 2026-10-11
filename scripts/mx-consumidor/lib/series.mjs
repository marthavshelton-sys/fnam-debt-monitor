// Series the Mexican Consumer page reads through Banxico's SIE API and INEGI's Banco de Información Económica.
// Every id carries the pattern its published title must match: a series that answers under another title is refused,
// so a mistyped id never reaches the page. Ids and titles were read from the public SIE table pages (cuadro) and from
// the BIE search on the runner (October 2026); `cuadro` is the public table a reader can open.
const SIE = 'https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?accion=consultarCuadro&locale=es';
const cuadro = (id, sector) => `${SIE}&idCuadro=${id}&sector=${sector}`;

export const BANXICO = {
  // --- Total financing to households, all lenders (quarterly, millions of pesos) ---
  finHH: { id: 'SF42790', title: /Financiamiento total\s+Hogares$/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  finCons: { id: 'SF46335', title: /Hogares\s+Consumo$/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  finViv: { id: 'SF46336', title: /Hogares\s+Vivienda$/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  finBankCons: { id: 'SF46318', title: /bancos comerciales[\s\S]*Consumo$/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  finBankViv: { id: 'SF46319', title: /bancos comerciales[\s\S]*Vivienda$/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  finInfonavit: { id: 'SF46334', title: /INFONAVIT/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  finFovissste: { id: 'SF110040', title: /FOVISSSTE/i, freq: 'Q', cuadro: cuadro('CF297', 19) },
  // --- Commercial banks: performing consumer loans by product (monthly, millions of pesos) ---
  bkCons: { id: 'SF235712', title: /Cartera vigente total por destino del crédito\s+B\.1 Consumo$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkCard: { id: 'SF235713', title: /B\.1\.1 Tarjeta de crédito$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkPayroll: { id: 'SF266103', title: /B\.1\.2 Nómina$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkPersonal: { id: 'SF266104', title: /B\.1\.3 Personales$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkAuto: { id: 'SF266105', title: /B\.1\.4\.1 Automotriz$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkGoods: { id: 'SF266106', title: /B\.1\.4\.2 Adquisición de bienes muebles$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkOther: { id: 'SF235715', title: /B\.1\.5 Otros$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  bkHousing: { id: 'SF235716', title: /B\.2 Vivienda$/i, freq: 'M', cuadro: cuadro('CF835', 19) },
  // --- Commercial banks: total and past-due balances by product (monthly, millions of pesos) ---
  totCons: { id: 'SF289723', title: /Cartera total[\s\S]*6\. Créditos al consumo/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  totCard: { id: 'SF289724', title: /Cartera total[\s\S]*A\. Tarjeta de crédito$/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  totPayroll: { id: 'SF289725', title: /Cartera total[\s\S]*B\. Nómina$/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  totPersonal: { id: 'SF289726', title: /Cartera total[\s\S]*C\. Personales$/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  totDurables: { id: 'SF289727', title: /Cartera total[\s\S]*D\. Bienes de consumo duradero$/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  totAuto: { id: 'SF289728', title: /Cartera total[\s\S]*D\.1 Automotriz$/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  totHousing: { id: 'SF289720', title: /Cartera total[\s\S]*5\. Crédito a la vivienda/i, freq: 'M', cuadro: cuadro('CF762', 19) },
  pdCons: { id: 'SF311900', title: /Cartera vencida[\s\S]*6\. Créditos al consumo/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  pdCard: { id: 'SF311901', title: /Cartera vencida[\s\S]*A\. Tarjeta de crédito$/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  pdPayroll: { id: 'SF311902', title: /Cartera vencida[\s\S]*B\. Nómina$/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  pdPersonal: { id: 'SF311903', title: /Cartera vencida[\s\S]*C\. Personales$/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  pdDurables: { id: 'SF311904', title: /Cartera vencida[\s\S]*D\. Bienes de consumo duradero$/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  pdAuto: { id: 'SF311905', title: /Cartera vencida[\s\S]*D\.1 Automotriz$/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  pdHousing: { id: 'SF311897', title: /Cartera vencida[\s\S]*5\. Crédito a la vivienda/i, freq: 'M', cuadro: cuadro('CF766', 19) },
  // --- What credit costs (percent a year) ---
  rtCardAll: { id: 'SF320890', title: /todos los clientes[\s\S]*Tarjetas de crédito/i, freq: 'B', cuadro: cuadro('CF840', 18) },
  rtCardRev: { id: 'SF320891', title: /clientes no totaleros con y sin promociones[\s\S]*Tarjetas de crédito/i, freq: 'B', cuadro: cuadro('CF840', 18) },
  rtCardRevNoPromo: { id: 'SF320892', title: /clientes no totaleros sin promociones[\s\S]*Tarjetas de crédito/i, freq: 'B', cuadro: cuadro('CF840', 18) },
  rtPayroll: { id: 'SF316115', title: /créditos de nómina/i, freq: 'B', cuadro: cuadro('CF815', 18) },
  rtPersonal: { id: 'SF316116', title: /créditos personales/i, freq: 'B', cuadro: cuadro('CF815', 18) },
  rtAuto: { id: 'SF316117', title: /crédito automotriz/i, freq: 'B', cuadro: cuadro('CF815', 18) },
  rtMortgage: { id: 'SF43426', title: /créditos hipotecarios\s+Tasa de interés promedio/i, freq: 'M', cuadro: cuadro('CF303', 18) },
  rtMortgageCat: { id: 'SF43423', title: /créditos hipotecarios\s+CAT promedio/i, freq: 'M', cuadro: cuadro('CF303', 18) },
  // --- Bank lending survey, credit cards, banks with the larger share (diffusion indices) ---
  svDemand: { id: 'SF310049', title: /Demanda vía tarjetas, últimos tres meses\s+Bancos con mayor participación/i, freq: 'Q', cuadro: cuadro('CF844', 19) },
  svStandards: { id: 'SF309941', title: /estándares de aprobación de crédito vía tarjetas, últimos tres meses\s+Bancos con mayor participación/i, freq: 'Q', cuadro: cuadro('CF844', 19) },
  // --- Cards in force ---
  cardsInForce: { id: 'SF61870', title: /Tarjetas de crédito\s+Tarjetas vigentes al cierre del trimestre \(todas las marcas\)/i, freq: 'Q', cuadro: cuadro('CF256', 21) },
  // --- Households' money and long-term savings (thousands of pesos) ---
  m2HH: { id: 'SF335881', title: /M2 por Tenedor\s+M2\s+Hogares$/i, freq: 'M', cuadro: cuadro('CF886', 3) },
  m1HH: { id: 'SF335863', title: /M2 por Tenedor\s+M1[\s\S]*Hogares$/i, freq: 'M', cuadro: cuadro('CF886', 3) },
  termHH: { id: 'SF335872', title: /Instrumentos a plazo[\s\S]*Hogares$/i, freq: 'M', cuadro: cuadro('CF886', 3) },
  svTotal: { id: 'SF320848', title: /Fondos de ahorro para la vivienda y el retiro\s+Total$/i, freq: 'M', cuadro: cuadro('CF834', 3) },
  svHousing: { id: 'SF320849', title: /Fondos de ahorro para la vivienda y el retiro\s+Total\s+Vivienda$/i, freq: 'M', cuadro: cuadro('CF834', 3) },
  svInfonavit: { id: 'SF320850', title: /Vivienda\s+Infonavit$/i, freq: 'M', cuadro: cuadro('CF834', 3) },
  svRetire: { id: 'SF320852', title: /Fondos de ahorro para la vivienda y el retiro\s+Total\s+Retiro$/i, freq: 'M', cuadro: cuadro('CF834', 3) },
  svSiefores: { id: 'SF320853', title: /Retiro\s+Acciones de las Siefores/i, freq: 'M', cuadro: cuadro('CF834', 3) },
  // --- Wages, prices, consumption, remittances ---
  minWage: { id: 'SL11298', title: /Salarios Mínimos\s+General\s+Pesos por día/i, freq: 'M', cuadro: cuadro('CL289', 10) },
  minWageReal: { id: 'SL11297', title: /Salarios Mínimos\s+General\s+Índice Real/i, freq: 'M', cuadro: cuadro('CL289', 10) },
  inpc: { id: 'SP1', title: /I\s*n\s*d\s*i\s*c\s*e\s+G\s*e\s*n\s*e\s*r\s*a\s*l/i, freq: 'M', cuadro: cuadro('CP154', 8), since: '2015-01-01' },
  consTotal: { id: 'SR17449', title: /consumo privado en el mercado interior \(series desestacionalizadas\)\s+Total$/i, freq: 'M', cuadro: cuadro('CR362', 2) },
  consGoods: { id: 'SR17451', title: /consumo privado en el mercado interior \(series desestacionalizadas\)[\s\S]*Bienes$/i, freq: 'M', cuadro: cuadro('CR362', 2) },
  consServices: { id: 'SR17452', title: /consumo privado en el mercado interior \(series desestacionalizadas\)[\s\S]*Servicios$/i, freq: 'M', cuadro: cuadro('CR362', 2) },
  consImported: { id: 'SR17453', title: /consumo privado en el mercado interior \(series desestacionalizadas\)[\s\S]*Bienes importados$/i, freq: 'M', cuadro: cuadro('CR362', 2) },
  remit: { id: 'SE27803', title: /Remesas Familiares\s+Total$/i, freq: 'M', cuadro: cuadro('CE81', 1) },
};

// Card payments by type of merchant (Banxico, daily; pesos): the categories the page shows. Titles end in "(Total)":
// credit and debit cards together.
export const CARD_GIROS = {
  total: ['SF351084', /^Monto transaccionado \(Total\)$/i],
  bigBox: ['SF351123', /Grandes superficies \(Total\)$/i], supermarkets: ['SF351162', /Supermercados \(Total\)$/i], retail: ['SF351174', /Ventas al detalle \(Retail\) \(Total\)$/i],
  restaurants: ['SF351156', /Restaurantes \(Total\)$/i], fastFood: ['SF351102', /Comida Rápida \(Total\)$/i], gas: ['SF351117', /Gasolineras \(Total\)$/i], pharmacies: ['SF351114', /Farmacias \(Total\)$/i],
  telecom: ['SF351165', /Telecomunicaciones \(Total\)$/i], airlines: ['SF351168', /Transporte Aéreo \(Total\)$/i], hotels: ['SF351132', /Hoteles \(Total\)$/i], travel: ['SF351087', /Agencias de Viajes \(Total\)$/i],
  entertainment: ['SF351108', /Entretenimiento \(Total\)$/i], hospitals: ['SF351129', /Hospitales \(Total\)$/i], doctors: ['SF351138', /Médicos y dentistas \(Total\)$/i], universities: ['SF351099', /Colegios y Universidades \(Total\)$/i],
  schools: ['SF351105', /Educación Básica \(Total\)$/i], insurance: ['SF351093', /Aseguradoras \(Total\)$/i], government: ['SF351120', /Gobierno \(Total\)$/i], aggregators: ['SF351090', /Agregadores \(Total\)$/i],
  hardware: ['SF351150', /Refacciones y ferretería \(Total\)$/i], groundTransport: ['SF351171', /Transporte Terrestre de Pasajeros \(Total\)$/i], tolls: ['SF351147', /Peaje \(Total\)$/i], parking: ['SF351111', /Estacionamientos \(Total\)$/i],
  carRental: ['SF351153', /Renta de Autos \(Total\)$/i], beauty: ['SF351159', /Salones de belleza \(Total\)$/i], daycare: ['SF351126', /Guarderías \(Total\)$/i], charity: ['SF351096', /Beneficencia \(Total\)$/i],
  misc: ['SF351135', /Misceláneos \(Total\)$/i], other: ['SF351144', /Otros \(Total\)$/i], undefined: ['SF351141', /No definido \(Total\)$/i],
};

// INEGI BIE: id, the search that finds it and the pattern its topic path must match.
export const INEGI = {
  retail: { id: '718942', search: 'comercio al por menor ingresos indice serie desestacionalizada', title: /Comercio al por menor > Ingresos por suministros? de bienes y servicios > Índice general > Serie desestacionalizada > Índice$/i, freq: 'M' },
  realWages: { id: '702134', search: 'remuneraciones medias reales', title: /Índice global de remuneraciones medias reales[^>]*> Serie desestacionalizada > Índice$/i, freq: 'M' },
  informality: { id: '444610', search: 'tasa de informalidad laboral', title: /Población total > Tasas complementarias > Tasa de informalidad laboral 1/i, freq: 'M' },
  employed: { id: '446593', search: 'poblacion ocupada nivel de ingresos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > Total$/i, freq: 'Q' },
  empUpTo1: { id: '446594', search: 'poblacion ocupada nivel de ingresos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > Hasta un salario mínimo$/i, freq: 'Q' },
  emp1to2: { id: '446595', search: 'poblacion ocupada nivel de ingresos mas de 1 hasta 2 salarios minimos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > Más de 1 hasta 2 salarios mínimos$/i, freq: 'Q' },
  emp2to3: { id: '446596', search: 'poblacion ocupada nivel de ingresos mas de 2 hasta 3 salarios minimos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > Más de 2 hasta 3 salarios mínimos$/i, freq: 'Q' },
  emp3to5: { id: '446597', search: 'poblacion ocupada nivel de ingresos mas de 3 hasta 5 salarios minimos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > Más de 3 hasta 5 salarios mínimos$/i, freq: 'Q' },
  empOver5: { id: '446598', search: 'poblacion ocupada nivel de ingresos mas de 5 salarios minimos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > Más de 5 salarios mínimos$/i, freq: 'Q' },
  empNoIncome: { id: '446599', search: 'poblacion ocupada nivel de ingresos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > No recibe ingresos$/i, freq: 'Q' },
  empUnspecified: { id: '446600', search: 'poblacion ocupada nivel de ingresos', title: /Nacional > Total > Población ocupada > Por nivel de ingresos > No especificado$/i, freq: 'Q' },
  privateCons: { id: '724119', search: 'consumo privado oferta y demanda', title: /base 2018 > A precios corrientes > Oferta y utilización total de bienes y servicios > Utilización > Demanda final > Gastos de consumo final > Consumo privado$/i, freq: 'A' },
  gdpNominal: { id: '734407', search: 'producto interno bruto precios corrientes trimestral', title: /Producto interno bruto trimestral, base 2018.*Valores a precios corrientes.*Producto Interno Bruto$/i, freq: 'Q' },
  autos: { id: '15169', search: 'venta de vehiculos ligeros', title: /Venta al público de automóviles y camiones > Automóviles > Total$/i, freq: 'M' },
};
