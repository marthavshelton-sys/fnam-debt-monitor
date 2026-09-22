/* ASUR page configuration for the shared engine (../assets/airport-model.js).
   Company names, tickers, labels and small hooks only; every figure comes from data/*.js. */
window.MODEL_CFG = {
  prefix: 'ASUR', slug: 'asur', short: 'ASUR',
  homeTicker: 'ASURB.MX', adsTicker: 'ASR', adsRatio: 10,
  homeLabel: 'ASUR B (BMV)',
  rebased: ['ASURB.MX', '^MXX', 'GAPB.MX', 'OMAB.MX'],
  trafficFrom: '2015-01',
  // ASUR's "Adjusted EBITDA margin" = EBITDA / revenues excluding construction services (Table 4 of the report)
  ebitdaLabel: { es: 'EBITDA', en: 'EBITDA' },
  marginLabel: { es: 'Margen EBITDA ajustado (sin IFRIC 12, %)', en: 'Adjusted EBITDA margin (ex-IFRIC 12, %)' },
  marginShort: { es: 'sin construcción', en: 'ex-construction' },
  groupLabel: { es: 'Resultado de financiamiento e impuestos (detalle)', en: 'Financing result and taxes (detail)' },
  // KPIs printed in Table 1 of the quarterly report that are additive across quarters
  additiveKpi: ['pax', 'paxMX', 'paxPR', 'paxCO', 'capex'],
  opsKpi: [
    { k: 'capex', es: 'Capex (Ps. miles)', en: 'Capex (Ps. thousand)', dec: 0 },
    { k: 'netDebt', es: 'Deuda neta (Ps. miles, cierre)', en: 'Net debt (Ps. thousand, period end)', dec: 0 },
    { k: 'totalDebt', es: 'Deuda total (Ps. miles, cierre)', en: 'Total debt (Ps. thousand, period end)', dec: 0 },
  ],
  opsKpiNote: { es: 'Capex y deuda son los de la Tabla 1 del informe trimestral (miles de pesos); la deuda es un saldo al cierre y no se suma entre periodos.', en: 'Capex and debt come from Table 1 of the quarterly report (thousands of pesos); debt is a period-end balance and is not summed across periods.' },
  opsCap: { es: 'Pasajeros por país: tráfico mensual de los comunicados de ASUR (México y Colombia excluyen tránsito y aviación general; Puerto Rico los incluye).', en: 'Passengers by country: monthly traffic releases (Mexico and Colombia exclude transit and general aviation; Puerto Rico includes them).' },
  opsNote: { es: 'Ingreso comercial por pasajero = "Commercial revenues per PAX" de la Tabla 1 cuando el periodo coincide con un trimestre reportado; en otros casos se calcula.', en: '"Commercial revenue per passenger" is Table 1\'s figure when the period is a reported quarter; otherwise it is computed.' },
  trafficCap: { es: 'Pasajeros terminales por aeropuerto según los comunicados mensuales de tráfico de ASUR (PR Newswire). México y Colombia excluyen pasajeros en tránsito y aviación general; San Juan los incluye.', en: 'Terminal passengers by airport from ASUR\'s monthly traffic releases (PR Newswire). Mexico and Colombia exclude transit and general-aviation passengers; San Juan includes them.' },
  dpsCap: { es: 'Dividendos por acción serie B registrados en bolsa (Yahoo Finance, ASURB.MX), sumados por año de pago; dividendos pagados y recompras del estado de flujos de efectivo del informe anual.', en: 'Series B dividends per share as recorded by the exchange (Yahoo Finance, ASURB.MX), summed by payment year; dividends paid and buybacks from the cash-flow statement of the annual report.' },
  debtNote: { es: 'Deuda bruta = préstamos bancarios y bonos (corto y largo plazo) del estado de situación financiera; efectivo = efectivo y equivalentes. Fuente: informes trimestrales de ASUR (Tablas 6 y 7).', en: 'Gross debt = bank loans and bonds (current and non-current) from the statement of financial position; cash = cash and equivalents. Source: ASUR quarterly reports (Tables 6 and 7).' },
  concessionNote: { es: 'México: nueve concesiones a 50 años otorgadas en 1998 (vencen en 2048). Puerto Rico: arrendamiento de 40 años del aeropuerto de San Juan desde 2013 (2053). Colombia: concesión de Airplan (seis aeropuertos) otorgada en 2008 con vencimiento en la década de 2030 (véase la Forma 20-F). El horizonte por defecto usa 2048.', en: 'Mexico: nine 50-year concessions granted in 1998 (expire 2048). Puerto Rico: 40-year lease of San Juan airport from 2013 (2053). Colombia: the Airplan concession (six airports) awarded in 2008 runs into the 2030s (see the Form 20-F). The default horizon uses 2048.' },
  dcfCapexNote: { es: 'Capex de partida: Tabla 1 del informe (2T26: Ps. 1,950 M en el trimestre; remodelación de la Terminal 1 de Cancún en curso).', en: 'Starting capex: Table 1 of the report (2Q26: Ps. 1,950 M in the quarter; Cancún Terminal 1 remodelling under way).' },
  noGuidanceTitle: { es: 'ASUR no publica guía anual', en: 'ASUR does not publish annual guidance' },
  noGuidance: { es: 'ASUR no publica una tabla de guía anual (tráfico, ingresos, EBITDA o capex). Lo más cercano son los objetivos cualitativos que la dirección da en la conferencia de resultados y los compromisos de inversión de los programas maestros de desarrollo; se listan abajo con su fuente. La sección de guía se activará automáticamente si ASUR empieza a publicarla.', en: 'ASUR does not publish an annual guidance table (traffic, revenue, EBITDA or capex). The nearest equivalents are the qualitative targets management gives on the earnings call and the investment commitments of the master development programmes; they are listed below with their source. The guidance section switches on automatically if ASUR starts publishing one.' },
  methodStatements: { es: 'PDF del informe trimestral en asur.com.mx (Informes Financieros) convertido a texto; se leen el estado de resultados, la posición financiera, los flujos de efectivo, las Tablas 1, 4, 5 y 6 y las secciones por país.', en: 'Quarterly report PDF from asur.com.mx (Financial Reports) converted to text; the income statement, financial position, cash flows, Tables 1, 4, 5 and 6 and the country sections are read.' },
  methodTraffic: { es: 'Comunicado mensual de tráfico en PR Newswire (tablas por aeropuerto de México, Puerto Rico y Colombia).', en: 'Monthly traffic release on PR Newswire (airport tables for Mexico, Puerto Rico and Colombia).' },
  methodGuidance: { es: 'No aplica: ASUR no publica guía; la tabla de referencia se mantiene en reference.js.', en: 'Not applicable: ASUR publishes no guidance; the reference table lives in reference.js.' },
  sources: [
    { t: { es: 'ASUR · Información financiera', en: 'ASUR · Financial information' }, d: { es: 'Informes trimestrales (PDF), transcripciones de conferencias y reportes anuales.', en: 'Quarterly reports (PDF), call transcripts and annual reports.' }, u: 'https://www.asur.com.mx/informacion-financiera-page-0' },
    { t: { es: 'PR Newswire · comunicados de ASUR', en: 'PR Newswire · ASUR releases' }, d: { es: 'Tráfico mensual, resultados, asambleas, dividendos, adquisiciones.', en: 'Monthly traffic, results, shareholder meetings, dividends, acquisitions.' }, u: 'https://www.prnewswire.com/news/grupo-aeroportuario-del-sureste%2C-s.a.b.-de-c.v./' },
    { t: { es: 'SEC EDGAR · ASUR (CIK 1123452)', en: 'SEC EDGAR · ASUR (CIK 1123452)' }, d: { es: 'Forma 20-F anual y reportes 6-K.', en: 'Annual Form 20-F and 6-K reports.' }, u: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001123452&type=20-F' },
    { t: { es: 'Yahoo Finance', en: 'Yahoo Finance' }, d: { es: 'Precios diarios ASURB.MX, ASR, GAPB.MX, OMAB.MX, IPC (^MXX) y dividendos registrados.', en: 'Daily prices ASURB.MX, ASR, GAPB.MX, OMAB.MX, IPC (^MXX) and recorded dividends.' }, u: 'https://finance.yahoo.com/quote/ASURB.MX/' },
    { t: { es: 'FRED (Fed de San Luis)', en: 'FRED (St. Louis Fed)' }, d: { es: 'Tipo de cambio USD/MXN (DEXMXUS) y bono del Tesoro a 10 años (DGS10).', en: 'USD/MXN (DEXMXUS) and the 10-year Treasury yield (DGS10).' }, u: 'https://fred.stlouisfed.org/series/DEXMXUS' },
    { t: { es: 'Banxico · bono M a 10 años', en: 'Banxico · 10-year M bond' }, d: { es: 'Tasa libre de riesgo en pesos para el DCF.', en: 'Peso risk-free rate for the DCF.' }, u: 'https://www.banxico.org.mx/SieAPIRest/service/v1/' },
  ],
};
