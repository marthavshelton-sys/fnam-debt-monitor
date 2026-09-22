// Parses the harvested ASUR documents (tools/asur/raw/releases/*.txt) into the model's data files:
//   site/asur/data/financials.js — quarterly + year-to-date + fiscal-year statements (IS, BS, CF), KPIs,
//                                  segment results by country and the debt indicators, from the full
//                                  quarterly earnings-release PDFs (asur.com.mx)
//   site/asur/data/traffic.js    — monthly passengers by airport and country (PR Newswire traffic reports)
//   site/asur/data/guidance.js   — ASUR publishes no formal guidance table; the file records that fact
// Figures stay in the units ASUR prints: thousands of pesos (statements); passengers are converted from
// persons to thousands so the page shares one convention with the other airport models.
import { readdir, readFile } from 'node:fs/promises';
import { writeData, header, norm, normLabel, tokenizeRow, qid, pdfRows, parseRows, mapPair, repipe, MONTHS_EN } from '../airports/lib.mjs';

const RAW = new URL('../../tools/asur/raw/releases/', import.meta.url);
const OUT = (f) => new URL(`../../site/asur/data/${f}`, import.meta.url);
const GEN = 'scripts/asur/build-data.mjs from tools/asur/raw/releases';

// ---------------------------------------------------------------------------------------------
// Line-item catalogues (regex on the normalised printed label; level 0 total, 1 item, 2 sub-item)
// ---------------------------------------------------------------------------------------------
export const IS_ROWS = [
  { k: 'revAero', en: 'Aeronautical services', es: 'Servicios aeronáuticos', re: /^aeronautical services$/, level: 1 },
  { k: 'revNonAero', en: 'Non-aeronautical services', es: 'Servicios no aeronáuticos', re: /^non-?aeronautical services$/, level: 1 },
  { k: 'revCommercial', en: 'of which: commercial revenues', es: 'de los cuales: ingresos comerciales', re: /^(total )?commercial revenues$/, level: 2, memo: true },
  { k: 'revConstruction', en: 'Construction services (IFRIC 12)', es: 'Servicios de construcción (IFRIC 12)', re: /^construction (services )?revenues?$|^construction services$/, level: 1, ifric: true },
  { k: 'revTotal', en: 'Total revenues', es: 'Ingresos totales', re: /^total revenues?$/, level: 0, bold: true },
  { k: 'costServices', en: 'Cost of services', es: 'Costo de servicios', re: /^costs? of services$/, level: 1 },
  { k: 'costConstruction', en: 'Cost of construction (IFRIC 12)', es: 'Costo de construcción (IFRIC 12)', re: /^costs? of construction$|^construction costs?$/, level: 1, ifric: true },
  { k: 'ga', en: 'General and administrative expenses', es: 'Gastos generales y de administración', re: /^general and administrative expenses?$|^administrative$/, level: 1 },
  { k: 'techAssistance', en: 'Technical assistance', es: 'Asistencia técnica', re: /^technical assistance( fees?)?$/, level: 1 },
  { k: 'concessionFees', en: 'Concession fees', es: 'Derechos de concesión', re: /^concession fees?$/, level: 1 },
  { k: 'da', en: 'Depreciation and amortization', es: 'Depreciación y amortización', re: /^depreciation and amortization$/, level: 1 },
  { k: 'totalOpCosts', en: 'Total operating expenses', es: 'Gastos de operación totales', re: /^total operating (expenses|costs & expenses|costs and expenses)$/, level: 0, bold: true },
  { k: 'otherRevenues', en: 'Other revenues', es: 'Otros ingresos', re: /^other revenues$/, level: 1 },
  { k: 'opIncome', en: 'Operating income', es: 'Utilidad de operación', re: /^operating (income|profit)$/, level: 0, bold: true },
  { k: 'financialResult', en: 'Comprehensive financing result', es: 'Resultado integral de financiamiento', re: /^comprehensive financing (cost|gain|result)|^total$/, level: 1 },
  { k: 'interestIncome', en: 'Interest income', es: 'Ingresos por intereses', re: /^interest income$/, level: 2 },
  { k: 'interestExpense', en: 'Interest expense', es: 'Gastos por intereses', re: /^interest expense$/, level: 2 },
  { k: 'fxResult', en: 'Foreign-exchange gain (loss), net', es: 'Resultado cambiario, neto', re: /^foreign exchange( gain)?,? net$/, level: 2 },
  { k: 'associates', en: 'Share of results of associates (equity method)', es: 'Participación en asociadas (método de participación)', re: /^income from (investment )?results.*equity( method)?$|^(income from )?investment results accounted by the equity method$|^method$/, level: 1 },
  { k: 'incomeBeforeTax', en: 'Income before income taxes', es: 'Utilidad antes de impuestos', re: /^income before income taxes$/, level: 0, bold: true },
  { k: 'incomeTaxCurrent', en: 'Provision for income tax', es: 'Impuesto a la utilidad causado', re: /^provision for income tax(es)?$/, level: 2 },
  { k: 'incomeTaxDeferred', en: 'Deferred income taxes', es: 'Impuesto diferido', re: /^deferred income tax(es)?$/, level: 2 },
  { k: 'incomeTax', en: 'Income taxes (current + deferred)', es: 'Impuestos a la utilidad (causado + diferido)', re: /^income taxes? \(current \+ deferred\)$/, level: 1 },
  { k: 'netIncome', en: 'Net income', es: 'Utilidad neta', re: /^net income( for the (year|period))?$/, level: 0, bold: true },
  { k: 'netIncomeMajority', en: 'Majority net income', es: 'Utilidad neta mayoritaria', re: /^(majority net income|net income majority|majority)$/, level: 1 },
  { k: 'nci', en: 'Non-controlling interests', es: 'Participación no controladora', re: /^non-?controlling interests?$|^non-?ci ?interests?$/, level: 1 },
  { k: 'ebitda', en: 'EBITDA', es: 'EBITDA', re: /^ebitda$/, level: 0, bold: true, kpi: true },
  { k: 'eps', en: 'Earnings per share (Ps.)', es: 'Utilidad por acción (Ps.)', re: /^earnings? per share( \(in pesos\))?$/, level: 1, kpi: true, perShare: true },
  { k: 'epads', en: 'Earnings per ADS (US$)', es: 'Utilidad por ADS (US$)', re: /^earnings? per (ads|american depositary share)/, level: 1, kpi: true, perShare: true },
  { k: 'ebitdaMargin', en: 'EBITDA margin', es: 'Margen EBITDA', re: /^ebitda margin$/, level: 1, kpi: true, pct: true },
  { k: 'ebitdaMarginExIfric', en: 'Adjusted EBITDA margin (ex-IFRIC 12)', es: 'Margen EBITDA ajustado (sin IFRIC 12)', re: /^adjusted ebitda margin$/, level: 1, kpi: true, pct: true },
  { k: 'opMargin', en: 'Operating margin', es: 'Margen operativo', re: /^operating margin$/, level: 1, kpi: true, pct: true },
  { k: 'opMarginExIfric', en: 'Adjusted operating margin (ex-IFRIC 12)', es: 'Margen operativo ajustado (sin IFRIC 12)', re: /^adjusted operating margin$/, level: 1, kpi: true, pct: true },
];
export const BS_ROWS = [
  { k: 'cash', en: 'Cash and cash equivalents', es: 'Efectivo y equivalentes', re: /^cash and cash equivalents$/, level: 1 },
  { k: 'restrictedCash', en: 'Restricted cash', es: 'Efectivo restringido', re: /^cash and cash equivalents restricted$|^restricted cash/, level: 1 },
  { k: 'receivables', en: 'Accounts receivable, net', es: 'Cuentas por cobrar, neto', re: /^accounts receivable,? net$/, level: 1 },
  { k: 'documentReceivable', en: 'Documents receivable', es: 'Documentos por cobrar', re: /^documents? receivable$/, level: 1 },
  { k: 'otherCurrentAssets', en: 'Recoverable taxes and other current assets', es: 'Impuestos por recuperar y otros activos circulantes', re: /^recoverable taxes and other current assets$/, level: 1 },
  { k: 'totalCurrentAssets', en: 'Total current assets', es: 'Activo circulante', re: /^total current assets$/, level: 0, bold: true },
  { k: 'finInstruments', en: 'Investment in financial instruments', es: 'Inversión en instrumentos financieros', re: /^investment in financial instruments?$/, level: 1 },
  { k: 'ppe', en: 'Machinery, furniture and equipment, net', es: 'Maquinaria, mobiliario y equipo, neto', re: /^machinery, furniture and equipment,? net$/, level: 1 },
  { k: 'investmentProperties', en: 'Investment properties', es: 'Propiedades de inversión', re: /^investment properties$/, level: 1 },
  { k: 'intangibles', en: 'Intangible assets, airport concessions and goodwill, net', es: 'Intangibles, concesiones aeroportuarias y crédito mercantil, neto', re: /^intangible assets,? airport concessions and goodwill/, level: 1 },
  { k: 'equityInvestments', en: 'Investments accounted by the equity method', es: 'Inversiones por el método de participación', re: /^investment accounted by the equity met[ho]+d$|^investment in joint venture$/, level: 1 },
  { k: 'totalAssets', en: 'Total assets', es: 'Activo total', re: /^total assets$/, level: 0, bold: true },
  { k: 'accountsPayable', en: 'Trade accounts payable', es: 'Cuentas por pagar a proveedores', re: /^trade accounts payable$/, level: 1 },
  { k: 'bankLoansCurrent', en: 'Bank loans and short-term debt', es: 'Préstamos bancarios y deuda a corto plazo', re: /^bank loans and short[- ]term debt$/, level: 1 },
  { k: 'accrued', en: 'Accrued expenses and other payables', es: 'Pasivos acumulados y otras cuentas por pagar', re: /^accrued expenses and others? payables$/, level: 1 },
  { k: 'leaseCurrent', en: 'Current lease liabilities', es: 'Pasivos por arrendamiento a corto plazo', re: /^current lease liabilities$/, level: 1 },
  { k: 'totalCurrentLiabilities', en: 'Total current liabilities', es: 'Pasivo circulante', re: /^total current liabilities$/, level: 0, bold: true },
  { k: 'bankLoansLT', en: 'Bank loans (long-term)', es: 'Préstamos bancarios (largo plazo)', re: /^bank loans$/, level: 1 },
  { k: 'bondsLT', en: 'Long-term debt (Aerostar notes)', es: 'Deuda a largo plazo (notas de Aerostar)', re: /^long term debt$/, level: 1 },
  { k: 'deferredTax', en: 'Deferred income taxes', es: 'Impuestos diferidos', re: /^deferred income taxes$/, level: 1 },
  { k: 'employeeBenefits', en: 'Employee benefits', es: 'Beneficios a empleados', re: /^employee benefits$/, level: 1 },
  { k: 'leaseNonCurrent', en: 'Non-current lease liabilities', es: 'Pasivos por arrendamiento a largo plazo', re: /^non current lease liabilities$/, level: 1 },
  { k: 'totalLTLiabilities', en: 'Total long-term liabilities', es: 'Pasivo a largo plazo', re: /^total long term liabilities$/, level: 0, bold: true },
  { k: 'totalLiabilities', en: 'Total liabilities', es: 'Pasivo total', re: /^total liabilities$/, level: 0, bold: true },
  { k: 'capitalStock', en: 'Capital stock', es: 'Capital social', re: /^capital stock$/, level: 1 },
  { k: 'legalReserve', en: 'Legal reserve', es: 'Reserva legal', re: /^legal reserve$/, level: 1 },
  { k: 'niPeriodEquity', en: 'Majority net income for the period (in equity)', es: 'Utilidad neta mayoritaria del periodo (en capital)', re: /^ma[jy]ority net income for the period$/, level: 1 },
  { k: 'fxReserve', en: 'Cumulative translation effect', es: 'Efecto acumulado por conversión', re: /^cumulative effect of conversion of foreign currency$/, level: 1 },
  { k: 'retainedEarnings', en: 'Retained earnings', es: 'Utilidades retenidas', re: /^retained earnings$/, level: 1 },
  { k: 'nci', en: 'Non-controlling interests', es: 'Participación no controladora', re: /^non-?controlling interests?$/, level: 1 },
  { k: 'totalEquity', en: "Total stockholders' equity", es: 'Capital contable total', re: /^total stockholders'? equity$/, level: 0, bold: true },
  { k: 'totalLiabEquity', en: "Total liabilities and stockholders' equity", es: 'Total pasivo y capital contable', re: /^total liabilities and stockholders'? equity$/, level: 0, bold: true },
];
const CF_OPS = [
  { k: 'incomeBeforeTax', en: 'Income before income taxes', es: 'Utilidad antes de impuestos', re: /^income before income taxes$/, level: 1 },
  { k: 'da', en: 'Depreciation and amortization', es: 'Depreciación y amortización', re: /^depreciation and amortization$/, level: 2 },
  { k: 'associates', en: 'Results of associates (equity method)', es: 'Resultado de asociadas', re: /equity method$|^equity method$|^income from results of joint venture/, level: 2 },
  { k: 'interestIncomeAdj', en: 'Interest income (reclassified)', es: 'Ingresos por intereses (reclasificados)', re: /^interest income$/, level: 2 },
  { k: 'interestPayable', en: 'Interest payable', es: 'Intereses por pagar', re: /^interest payables?$/, level: 2 },
  { k: 'fxUnrealized', en: 'Unrealised foreign-exchange (gain) loss', es: 'Resultado cambiario no realizado', re: /^foreign exchange.*unearned$|^foreign exchange,? net unearned$/, level: 2 },
  { k: 'opBeforeWc', en: 'Cash flow before working capital', es: 'Flujo antes de capital de trabajo', re: /^sub-?total$/, level: 0, bold: true },
  { k: 'wcReceivables', en: 'Trade receivables', es: 'Cuentas por cobrar', re: /^trade receivables$/, level: 2 },
  { k: 'wcRecoverableTax', en: 'Recoverable taxes and other current assets', es: 'Impuestos por recuperar y otros activos', re: /^recoverable taxes and other current assets$/, level: 2 },
  { k: 'taxesPaid', en: 'Income tax paid', es: 'Impuestos pagados', re: /^income tax(es)? paid$/, level: 2 },
  { k: 'wcPayables', en: 'Trade accounts payable', es: 'Cuentas por pagar', re: /^trade accounts payable$/, level: 2 },
  { k: 'cfo', en: 'Net cash from operating activities', es: 'Flujo neto de actividades de operación', re: /^net cash flows? provided by operating activities$/, level: 0, bold: true },
];
const CF_INV = [
  { k: 'finInstruments', en: 'Investment in financial instruments', es: 'Inversión en instrumentos financieros', re: /^investment in financial instruments?$/, level: 1 },
  { k: 'loansGranted', en: 'Loans granted to third parties', es: 'Préstamos otorgados a terceros', re: /^loans granted to third parties$/, level: 1 },
  { k: 'restrictedCash', en: 'Restricted cash', es: 'Efectivo restringido', re: /^restricted cash$/, level: 1 },
  { k: 'capex', en: 'Investments in machinery, furniture, equipment and concessions', es: 'Inversiones en maquinaria, equipo y concesiones', re: /^investments? in machinery, furniture and equipment/, level: 1 },
  { k: 'interestReceived', en: 'Interest income received', es: 'Intereses cobrados', re: /^interest income$/, level: 1 },
  { k: 'acquisitions', en: 'Business acquisitions (net of cash acquired)', es: 'Adquisiciones de negocios (netas de efectivo adquirido)', re: /^(business )?acquisitions?|^investment in subsidiar|cash acquired|^initial recognition cash/, level: 1 },
  { k: 'jvInvestments', en: 'Joint-venture investments and recoveries', es: 'Inversiones y recuperaciones en negocios conjuntos', re: /joint venture|asur dominicana|adg airport/, level: 1 },
  { k: 'cfi', en: 'Net cash used in investing activities', es: 'Flujo neto de actividades de inversión', re: /^net cash flows? used (by|in) investing activities$/, level: 0, bold: true },
];
const CF_FIN = [
  { k: 'excessCash', en: 'Cash available for financing activities', es: 'Efectivo disponible para financiamiento', re: /^excess cash to use in financing activities$/, level: 0, bold: true },
  { k: 'loansReceived', en: 'Bank loans received', es: 'Préstamos bancarios obtenidos', re: /^bank loans$/, level: 1 },
  { k: 'loansPaid', en: 'Bank loans paid', es: 'Préstamos bancarios pagados', re: /^bank loans paid$/, level: 1 },
  { k: 'ltDebtPaid', en: 'Long-term debt paid', es: 'Deuda a largo plazo pagada', re: /^long term debt paid$/, level: 1 },
  { k: 'interestPaid', en: 'Interest paid', es: 'Intereses pagados', re: /^interest paid$/, level: 1 },
  { k: 'dividendsPaid', en: 'Dividends paid', es: 'Dividendos pagados', re: /^dividends paid$/, level: 1 },
  { k: 'dividendsNci', en: 'Dividends paid to non-controlling interests (Aerostar)', es: 'Dividendos a la participación no controladora (Aerostar)', re: /^non-?controlling interests?( dividends?)?$/, level: 1 },
  { k: 'buybacks', en: 'Share repurchases', es: 'Recompra de acciones', re: /repurchase|buyback/, level: 1 },
  { k: 'cff', en: 'Net cash used in financing activities', es: 'Flujo neto de actividades de financiamiento', re: /^net cash flows? (used|provided) (by|in) financing activities$/, level: 0, bold: true },
  { k: 'netChangeCash', en: 'Net increase (decrease) in cash', es: 'Aumento (disminución) neto de efectivo', re: /^net (increase|decrease) in cash and cash equivalents$/, level: 0, bold: true },
  { k: 'cashBegin', en: 'Cash at beginning of period', es: 'Efectivo al inicio del periodo', re: /^cash and cash equivalents at (the )?beginning/, level: 1 },
  { k: 'fxEffectCash', en: 'Exchange gain (loss) on cash', es: 'Efecto cambiario en el efectivo', re: /^exchange (gain|loss).*on cash/, level: 1 },
  { k: 'cashEnd', en: 'Cash at end of period', es: 'Efectivo al final del periodo', re: /^cash and cash equivalents at (the )?end/, level: 0, bold: true },
];
export const CF_ROWS = [...CF_OPS, ...CF_INV, ...CF_FIN];
export const KPI_ROWS = [
  { k: 'pax', en: 'Total passengers (thousands)', es: 'Pasajeros totales (miles)', re: /^total traffic$/ },
  { k: 'paxMX', en: 'Passengers Mexico (thousands)', es: 'Pasajeros México (miles)', re: /^total (traffic )?m[eé]xico$/ },
  { k: 'paxPR', en: 'Passengers Puerto Rico (thousands)', es: 'Pasajeros Puerto Rico (miles)', re: /^total san juan,? puerto rico$|^sju total$/ },
  { k: 'paxCO', en: 'Passengers Colombia (thousands)', es: 'Pasajeros Colombia (miles)', re: /^total colombia$|^total traffic colombia$/ },
  { k: 'commercialPerPax', en: 'Commercial revenue per passenger (Ps.)', es: 'Ingreso comercial por pasajero (Ps.)', re: /^commercial revenues per pax$|^total commercial revenues per passenger$/ },
  { k: 'capex', en: 'Capex (Ps. thousand)', es: 'Capex (miles de Ps.)', re: /(^|[.:] )capex$/ },
  { k: 'totalDebt', en: 'Total debt (Ps. thousand)', es: 'Deuda total (miles de Ps.)', re: /^total debt$/ },
  { k: 'netDebt', en: 'Net debt (Ps. thousand)', es: 'Deuda neta (miles de Ps.)', re: /^(total )?net debt$/ },
  { k: 'netDebtEbitda', en: 'Net debt / LTM EBITDA (x)', es: 'Deuda neta / EBITDA UDM (x)', re: /^(total )?net debt\/? ?ltm ebitda( \(times\))?$/ },
];
// Segment tables (Review of <country> operations): revenues, costs and P&L in thousands of pesos.
const SEG_ROWS = [
  { k: 'pax', re: /^total passengers?$/ }, { k: 'revTotal', re: /^total revenues?$/ }, { k: 'revAero', re: /^aeronautical services$/ }, { k: 'revNonAero', re: /^non-?aeronautical services$/ },
  { k: 'revConstruction', re: /^construction revenues$/ }, { k: 'revExConstruction', re: /^total revenues excluding construction revenues$/ }, { k: 'revCommercial', re: /^total commercial revenues$/ },
  { k: 'commercialPerPax', re: /^total commercial revenues per passenger$/ }, { k: 'costServices', re: /^cost of services$/ }, { k: 'ga', re: /^administrative$/ }, { k: 'techAssistance', re: /^technical assistance$/ },
  { k: 'concessionFees', re: /^concession fees$/ }, { k: 'da', re: /^depreciation and amortization$/ }, { k: 'opCostsExConstruction', re: /^operating costs and expenses excluding construction costs$/ }, { k: 'costConstruction', re: /^construction costs$/ },
  { k: 'totalOpCosts', re: /^total operating costs & expenses$/ }, { k: 'interestIncome', re: /^interest income$/ }, { k: 'interestExpense', re: /^interest expense$/ }, { k: 'fxResult', re: /^foreign exchange( gain)?,? net$/ }, { k: 'financialResult', re: /^total$/ },
  { k: 'opIncome', re: /^operating profit$/ }, { k: 'netIncome', re: /^net (profit|income)$/ }, { k: 'ebitda', re: /^ebitda$/ },
];
const SEGMENTS = [
  { code: 'MX', en: 'Mexico', es: 'México', re: /^Review of Mexico Operations/i },
  { code: 'PR', en: 'Puerto Rico (Aerostar, 60%)', es: 'Puerto Rico (Aerostar, 60%)', re: /^Review of Puerto Rico Operations/i },
  { code: 'CO', en: 'Colombia (Airplan)', es: 'Colombia (Airplan)', re: /^Review of Colombia Operations/i },
  { code: 'US', en: 'United States (ASUR US Airports)', es: 'Estados Unidos (ASUR US Airports)', re: /^Review of ASUR US Operations/i },
];
const AIRPORTS = [
  { code: 'CUN', en: 'Cancún', es: 'Cancún', country: 'MX', group: 'mexico' }, { code: 'CZM', en: 'Cozumel', es: 'Cozumel', country: 'MX', group: 'mexico' }, { code: 'HUX', en: 'Huatulco', es: 'Huatulco', country: 'MX', group: 'mexico' },
  { code: 'MID', en: 'Mérida', es: 'Mérida', country: 'MX', group: 'mexico' }, { code: 'MTT', en: 'Minatitlán', es: 'Minatitlán', country: 'MX', group: 'mexico' }, { code: 'OAX', en: 'Oaxaca', es: 'Oaxaca', country: 'MX', group: 'mexico' },
  { code: 'TAP', en: 'Tapachula', es: 'Tapachula', country: 'MX', group: 'mexico' }, { code: 'VER', en: 'Veracruz', es: 'Veracruz', country: 'MX', group: 'mexico' }, { code: 'VSA', en: 'Villahermosa', es: 'Villahermosa', country: 'MX', group: 'mexico' },
  { code: 'SJU', en: 'San Juan (Luis Muñoz Marín)', es: 'San Juan (Luis Muñoz Marín)', country: 'PR', group: 'puertorico' },
  { code: 'MDE', en: 'Medellín – Rionegro (José María Córdova)', es: 'Medellín – Rionegro (José María Córdova)', country: 'CO', group: 'colombia' }, { code: 'EOH', en: 'Medellín (Olaya Herrera)', es: 'Medellín (Olaya Herrera)', country: 'CO', group: 'colombia' },
  { code: 'MTR', en: 'Montería', es: 'Montería', country: 'CO', group: 'colombia' }, { code: 'APO', en: 'Carepa', es: 'Carepa', country: 'CO', group: 'colombia' }, { code: 'UIB', en: 'Quibdó', es: 'Quibdó', country: 'CO', group: 'colombia' }, { code: 'CZU', en: 'Corozal', es: 'Corozal', country: 'CO', group: 'colombia' },
];
const COUNTRIES = [{ code: 'MX', en: 'Mexico', es: 'México' }, { code: 'PR', en: 'Puerto Rico', es: 'Puerto Rico' }, { code: 'CO', en: 'Colombia', es: 'Colombia' }];
const thousands = (v) => (v == null ? null : Math.round(v) / 1000);

// ---------------------------------------------------------------------------------------------
// Headers. ASUR prints two-line headers: a label line ("3M 3M % 1Q 1Q %", "First Quarter", "Second Quarter Six Months")
// and a year line ("2025 | 2026 | Chg | 2025 | 2026 | Chg"). Returns {line, periods, groups}.
// ---------------------------------------------------------------------------------------------
const QWORDS = { first: 1, second: 2, third: 3, fourth: 4 };
const MWORDS = { three: 3, six: 6, nine: 9, twelve: 12 };
function findHeader(lines, start, maxAhead = 10, ctx = {}) {
  for (let i = start; i < Math.min(lines.length, start + maxAhead); i++) {
    let cells = lines[i].split('|').map((c) => c.trim()).filter(Boolean);
    const isHc = (c) => /^20\d\d$/.test(c) || /^(%|chg\.?|% chg\.?|var\.?|% var\.?|variation|change)$/i.test(c);
    while (cells.length && !isHc(cells[0])) cells = cells.slice(1); // prose interleaved from the other page column
    const years = cells.filter((c) => /^20\d\d$/.test(c)).map(Number);
    if (years.length < 2 || years.length % 2 || !cells.every(isHc)) continue;
    const groups = years.length / 2;
    const above = lines.slice(Math.max(0, i - 4), i).join(' ');
    const kinds = [];
    for (const m of above.matchAll(/(\d{1,2})M\b|(\d)Q\b|\b(first|second|third|fourth) quarter|\b(three|six|nine|twelve)[- ]months?|\b(?:full year|FY|year)\b/gi)) {
      if (m[1]) kinds.push({ months: +m[1] }); else if (m[2]) kinds.push({ q: +m[2] }); else if (m[3]) kinds.push({ q: QWORDS[m[3].toLowerCase()] }); else if (m[4]) kinds.push({ months: MWORDS[m[4].toLowerCase()] }); else kinds.push({ months: 12 });
    }
    // "3M 3M % 1Q 1Q %" repeats each kind twice; collapse consecutive duplicates
    const kk = kinds.filter((k, j) => !(j && JSON.stringify(kinds[j - 1]) === JSON.stringify(k)));
    const periods = [];
    for (let g = 0; g < groups; g++) {
      const kind = kk[g] || kk[0] || (ctx.q ? { q: ctx.q } : null);
      if (!kind) return null;
      periods.push({ ...kind, fy: years[g * 2] }, { ...kind, fy: years[g * 2 + 1] });
    }
    return { line: i, periods, groups };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Quarterly earnings release (PDF text)
// ---------------------------------------------------------------------------------------------
function parseResults(text, meta) {
  const lines = text.split('\n').map(repipe);
  const h = header(text);
  const m = (h.quarter || text.slice(0, 2000)).match(/(\d)Q(\d\d)/i);
  if (!m) return null;
  const q = +m[1], fy = 2000 + +m[2];
  const rel = { id: qid(fy, q), fy, q, source: meta, quarters: {}, ytd: {}, bs: {}, segments: {}, warnings: [] };
  const idx = (re, from = 0) => { for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i; return -1; };
  const store = (p, part, vals) => { if (!p || !Object.keys(vals).length) return; const s = p.q ? (rel.quarters[qid(p.fy, p.q)] ??= {}) : (rel.ytd[`${p.fy}M${p.months}`] ??= {}); s[part] = { ...vals, ...(s[part] || {}) }; if (p.months === 3 && part !== 'cf') { const s1 = (rel.quarters[qid(p.fy, 1)] ??= {}); s1[part] = { ...vals, ...(s1[part] || {}) }; } };
  // A block is located either by its title (header searched forwards) or by an anchor data row (header
  // searched backwards) — older releases interleave the two page columns, so titles are unreliable.
  const parseBlock = (title, catalogue, part, maxLines, { per = 3, ctx = { q }, anchor = null, footnoteFix = true } = {}) => {
    let s = idx(title), hd = null;
    if (s >= 0) hd = findHeader(lines, s + 1, 12, ctx);
    if (!hd && anchor) { const a = idx(anchor); if (a >= 0) { for (let b = a - 1; b >= Math.max(0, a - 30) && !hd; b--) hd = findHeader(lines, b, 1, ctx); } }
    if (!hd) { rel.warnings.push(`${title.source}: header not found`); return null; }
    let end = hd.line + 1;
    while (end < lines.length && end < hd.line + maxLines && !/^<<page/.test(lines[end]) && !/^Table \d+:|^Review of |^Grupo Aeroportuario del Sureste/.test(lines[end])) end++;
    const rows = pdfRows(lines, hd.line + 1, end, { footnoteFix });
    const { out, unmatched } = parseRows(rows, catalogue, hd.groups, per);
    return { hd, out, unmatched, rows, start: hd.line + 1, end };
  };
  // --- Consolidated income statement exhibit (YTD group + quarter group)
  const isX = parseBlock(/^Consolidated Statements? of Income/i, IS_ROWS, 'is', 60, { footnoteFix: false });
  if (isX) {
    if (isX.unmatched.length) rel.warnings.push(`IS unmatched: ${isX.unmatched.slice(0, 6).join(' | ')}`);
    isX.out.forEach((vals, g) => { const p0 = isX.hd.periods[g * 2], p1 = isX.hd.periods[g * 2 + 1]; store(p0, 'is', mapPair(vals, 0)); store(p1, 'is', mapPair(vals, 1)); });
  } else rel.warnings.push('IS exhibit not found');
  // --- Summary table (Table 4): EBITDA, commercial revenues, majority income, per-share; quarter (and YTD when printed)
  const t4 = parseBlock(/Summary of Consolidated Results/i, IS_ROWS, 'is', 40, { anchor: /^Total Revenues Excluding Construction Revenues \|/i });
  if (t4) t4.out.forEach((vals, g) => { const p0 = t4.hd.periods[g * 2], p1 = t4.hd.periods[g * 2 + 1]; store(p0, 'is', mapPair(vals, 0)); store(p1, 'is', mapPair(vals, 1)); });
  // --- Financing detail (Table 5)
  const t5 = parseBlock(/^Table 5: Consolidated Comprehensive Financing/i, IS_ROWS, 'is', 12, { anchor: /^Foreign Exchange Gain \(Loss\), Net \|/i });
  if (t5) t5.out.forEach((vals, g) => { const p0 = t5.hd.periods[g * 2], p1 = t5.hd.periods[g * 2 + 1]; store(p0, 'is', mapPair(vals, 0)); store(p1, 'is', mapPair(vals, 1)); });
  // --- Table 1 highlights: commercial revenue per pax, capex, debt, cash (quarter)
  const t1 = parseBlock(/^Table 1: Financial and Operating Highlights/i, KPI_ROWS, 'kpi', 45, { anchor: /^Commercial Revenues per PAX \|/i });
  if (t1) t1.out.forEach((vals, g) => { const p0 = t1.hd.periods[g * 2], p1 = t1.hd.periods[g * 2 + 1]; store(p0, 'kpi', mapPair(vals, 0)); store(p1, 'kpi', mapPair(vals, 1)); });
  // --- Passenger traffic summary (page 2 table): persons -> thousands
  const trS = idx(/^Total Traffic \|/i);
  if (trS >= 0) {
    const hd = findHeader(lines, Math.max(0, trS - 30), 30, { q });
    if (hd) {
      const rows = pdfRows(lines, hd.line + 1, trS + 3, { footnoteFix: true });
      const { out } = parseRows(rows, KPI_ROWS, hd.groups, 3);
      out.forEach((vals, g) => { const p0 = hd.periods[g * 2], p1 = hd.periods[g * 2 + 1]; const conv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, /^pax/.test(k) ? thousands(v) : v])); store(p0, 'kpi', conv(mapPair(vals, 0))); store(p1, 'kpi', conv(mapPair(vals, 1))); });
    }
  }
  // --- Balance sheet exhibit: [current, December, variation, %]
  const bsS = idx(/^Consolidated Statements? of Financial Position/i);
  if (bsS >= 0) {
    const dm = lines[bsS].match(/as of (\w+) (\d{1,2}), (20\d\d) and (\w+)( \|)? (\d{1,2}), (20\d\d)/i);
    let end = bsS + 1; while (end < lines.length && !/^Exchange Rate per Dollar|^<<page/.test(lines[end])) end++;
    const rows = pdfRows(lines, bsS + 1, end);
    const { out, unmatched } = parseRows(rows, BS_ROWS, 1, 4);
    if (unmatched.length) rel.warnings.push(`BS unmatched: ${unmatched.slice(0, 6).join(' | ')}`);
    const cur = mapPair(out[0], 0), prior = mapPair(out[0], 1);
    rel.bs[qid(fy, q)] = cur;
    if (dm) { const pm = MONTHS_EN.indexOf(dm[4].toLowerCase()) + 1, py = +dm[7]; if (pm > 0) rel.bs[qid(py, Math.ceil(pm / 3))] = prior; }
    else rel.bs[qid(fy - 1, 4)] = prior;
    const fx = text.match(/Exchange Rate per Dollar Ps \| ([\d.]+)/); if (fx) rel.fxEop = +fx[1];
  } else rel.warnings.push('BS exhibit not found');
  // --- Cash flow exhibit: year-to-date (January 1 to period end), [prior, current, %]
  const cfS = idx(/^Consolidated Statements? of Cash Flows?/i);
  if (cfS >= 0) {
    const hd = findHeader(lines, cfS + 1, 8, { q });
    if (hd) {
      let end = hd.line + 1; while (end < lines.length && !/^ASUR \dQ\d\d Page|^<<page/.test(lines[end])) end++;
      const rows = pdfRows(lines, hd.line + 1, end);
      const cfoI = rows.findIndex((r) => /net cash flow provided by operating/i.test(r.label)), cfiI = rows.findIndex((r) => /net cash flow used by investing/i.test(r.label));
      const parts = [[rows.slice(0, cfoI + 1), CF_OPS], [rows.slice(cfoI + 1, cfiI + 1), CF_INV], [rows.slice(cfiI + 1), CF_FIN]];
      const merged = Array.from({ length: hd.groups }, () => ({})); const unmatched = [];
      for (const [rs, cat] of parts) { const r = parseRows(rs, cat, hd.groups, 3); r.out.forEach((o, g) => Object.assign(merged[g], o)); unmatched.push(...r.unmatched); }
      if (unmatched.length) rel.warnings.push(`CF unmatched: ${unmatched.slice(0, 6).join(' | ')}`);
      merged.forEach((vals, g) => { const p0 = hd.periods[g * 2], p1 = hd.periods[g * 2 + 1]; const ytdP = (p) => ({ months: p.q ? p.q * 3 : p.months, fy: p.fy }); store(ytdP(p0), 'cf', mapPair(vals, 0)); store(ytdP(p1), 'cf', mapPair(vals, 1)); });
    } else rel.warnings.push('CF header not found');
  } else rel.warnings.push('CF exhibit not found');
  // --- Debt indicators (Table 6): last column = current quarter
  const t6 = idx(/^Table 6: Consolidated Debt Indicators/i);
  if (t6 >= 0) {
    const debt = {};
    for (const r of pdfRows(lines, t6 + 1, t6 + 16, { footnoteFix: true })) {
      const lab = normLabel(r.label); const v = r.toks.filter((t) => !t.dash).map((t) => t.v);
      const last = v[v.length - 1];
      if (/^total debt$/.test(lab)) debt.totalDebt = last; else if (/^short-?term debt$/.test(lab)) debt.shortTermDebt = last; else if (/^long-?term debt$/.test(lab)) debt.longTermDebt = last;
      else if (/^cash & cash equivalents$/.test(lab)) debt.cash = last; else if (/^total net debt/.test(lab)) debt.netDebt = last; else if (/^total net debt\/ ?ltm ebitda/.test(lab)) debt.netDebtEbitda = last; else if (/^total debt\/ ?ltm ebitda/.test(lab)) debt.totalDebtEbitda = last; else if (/^interest coverage ratio/.test(lab)) debt.interestCoverage = last;
    }
    if (Object.keys(debt).length) rel.debt = debt;
  }
  // --- Segments by country
  for (let s = 0; s < SEGMENTS.length; s++) {
    const seg = SEGMENTS[s];
    const st = idx(seg.re); if (st < 0) continue;
    let end = st + 1; while (end < lines.length && !SEGMENTS.some((x, j) => j !== s && x.re.test(lines[end])) && !/^Definitions$|^Passenger Traffic Breakdown/i.test(lines[end])) end++;
    const acc = {};
    for (let i = st; i < end; i++) {
      if (!/^Table \d+:/.test(lines[i])) continue;
      const hd = findHeader(lines, i + 1, 8, { q }); if (!hd) continue;
      let e = hd.line + 1; while (e < end && e < hd.line + 25 && !/^Table \d+:|^Figures in|^For the purposes|^\d Represents|^\d Adjusted|^<<page/.test(lines[e])) e++;
      const { out } = parseRows(pdfRows(lines, hd.line + 1, e, { footnoteFix: true }), SEG_ROWS, hd.groups, 3);
      out.forEach((vals, g) => { const p0 = hd.periods[g * 2], p1 = hd.periods[g * 2 + 1]; for (const [p, k] of [[p0, 0], [p1, 1]]) { const key = p.q ? qid(p.fy, p.q) : `${p.fy}M${p.months}`; const o = (acc[key] ??= {}); for (const [kk, pair] of Object.entries(vals)) if (pair[k] != null && !(kk in o)) o[kk] = pair[k]; } });
    }
    for (const [key, o] of Object.entries(acc)) (rel.segments[key] ??= {})[seg.code] = o;
  }
  // average FX (Puerto Rico table footnote)
  const fa = text.match(/average exchange rate of Ps\.([\d.]+) = US\$1\.00 for (\d)Q(\d\d)/i); if (fa) rel.fxAvg = { rate: +fa[1], months: 3 };
  const fe = text.match(/exchange rate of US\$1\.00 = Ps\.([\d.]+)/); if (fe && !rel.fxEop) rel.fxEop = +fe[1];
  return rel;
}

// ---------------------------------------------------------------------------------------------
// Monthly traffic release (PR Newswire): "Passenger Traffic Summary" by country, then by airport
// ---------------------------------------------------------------------------------------------
const AIRPORT_BY_NAME = Object.fromEntries(AIRPORTS.map((a) => [norm(a.en.replace(/ \(.*\)$/, '')).replace(/[áéíóú]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }[c])), a.code]));
AIRPORT_BY_NAME['medellin (rio negro)'] = 'MDE'; AIRPORT_BY_NAME['rionegro'] = 'MDE'; AIRPORT_BY_NAME['medellin – rionegro'] = 'MDE'; AIRPORT_BY_NAME['medellin'] = 'EOH'; AIRPORT_BY_NAME['monteria'] = 'MTR'; AIRPORT_BY_NAME['quibdo'] = 'UIB'; AIRPORT_BY_NAME['merida'] = 'MID';
function parseTraffic(text, meta) {
  const head = text.slice(0, 3000);
  const tm = (meta.title || '').match(/passenger traffic for (January|February|March|April|May|June|July|August|September|October|November|December),? (20\d\d)/i) || head.match(/passenger traffic for (January|February|March|April|May|June|July|August|September|October|November|December),? (20\d\d)/i);
  if (!tm) return null;
  const ym = `${tm[2]}-${String(MONTHS_EN.indexOf(tm[1].toLowerCase()) + 1).padStart(2, '0')}`;
  const rel = { ym, source: meta, dom: {}, intl: {}, total: {}, prior: { dom: {}, intl: {}, total: {} }, warnings: [] };
  const lines = text.split('\n');
  let table = null, seg = null; // table: 'summary' | 'MX' | 'PR' | 'CO'; seg: dom | intl | total
  const setv = (segK, code, cur, prev) => { rel[segK][code] = cur; if (prev != null) rel.prior[segK][code] = prev; };
  const legacy = !/passenger traffic summary/i.test(text) && /^Domestic$/m.test(text);
  if (legacy) { // 2016–2017 format: three Mexico-only tables (Domestic / International / Total), rows "Cancún | prior | current | % chg"
    let kind = null;
    for (const raw of lines) {
      const l = norm(raw);
      if (/^domestic$/.test(l)) { kind = 'dom'; continue; } if (/^international$/.test(l)) { kind = 'intl'; continue; } if (/^total$/.test(l)) { kind = 'total'; continue; }
      if (!kind || !/\|/.test(raw)) continue;
      const r = tokenizeRow(raw); if (!r || r.toks.length < 2) continue;
      const lab = normLabel(r.label).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const code = AIRPORT_BY_NAME[lab] || (/^(asur )?total( domestic| international)?$/.test(lab) ? 'TOTAL' : null);
      if (!code) continue;
      const v = r.toks.filter((t) => !t.pct).map((t) => (t.dash ? 0 : t.v));
      setv(kind, code, thousands(v[1]), thousands(v[0]));
      if (code === 'TOTAL') { (rel.countries ??= {}); ((rel.countries.MX ??= {}))[kind] = thousands(v[1]); ((rel.countries.TOTAL ??= {}))[kind] = thousands(v[1]); ((rel.prior.countries ??= {})); ((rel.prior.countries.MX ??= {}))[kind] = thousands(v[0]); ((rel.prior.countries.TOTAL ??= {}))[kind] = thousands(v[0]); }
    }
    return finishTraffic(rel);
  }
  let ypg = 2; // year columns per group (2021 releases print 2019 | 2020 | 2021)
  const seen = new Set(); // a repeated table title (some releases append the previous month) ends the parse
  const enter = (t) => { if (seen.has(t)) return false; seen.add(t); table = t; seg = null; return true; };
  for (const raw of lines) {
    const l = norm(raw);
    if (/\(continued\)/.test(l)) continue; // "Mexico Passenger Traffic (continued)": same table, next page
    if (/^passenger traffic summary/.test(l)) { if (!enter('summary')) break; continue; }
    if (/passenger traffic/.test(l) && /mexico|m[eé]xico/.test(l) && !/\d/.test(l)) { if (!enter('MX')) break; continue; }
    if (/passenger traffic|san juan airport/.test(l) && /san juan|puerto rico|\(lmm\)/.test(l) && !/\d/.test(l.replace(/\(lmm\)/, ''))) { if (!enter('PR')) break; continue; }
    if (/passenger traffic/.test(l) && /colombia|airplan/.test(l) && !/\d/.test(l)) { if (!enter('CO')) break; continue; }
    if (!table) continue;
    const rawCells = raw.split('|').map((c) => c.trim());
    if (rawCells.some((c) => /^20\d\d$/.test(c)) && rawCells.every((c) => c === '' || /^20\d\d$/.test(c))) { let n = 0, started = false; for (const c of rawCells) { if (/^20\d\d$/.test(c)) { n++; started = true; } else if (started) break; } if (n >= 4) n = n / 2; if (n >= 2) ypg = n; continue; }
    let cells = rawCells.filter(Boolean);
    if (cells.length < 3) continue;
    let code = null;
    if (/^[A-Z]{3}$/.test(cells[0]) && /[A-Za-z]/.test(cells[1]) && !/\d/.test(cells[1])) { code = cells[0]; cells = cells.slice(2); }      // "CUN | Cancun | ..."
    else if (/^[A-Z]{3} [A-Za-z]/.test(cells[0]) && !/\d/.test(cells[0]) && !/ total$/i.test(cells[0])) { code = cells[0].slice(0, 3); cells = cells.slice(1); }      // "CUN Cancun | ..." (2020)
    else { const label = cells[0]; cells = cells.slice(1);
      if (table === 'summary') {
        if (/^m[eé]xico$/i.test(label)) { seg = 'MX'; code = 'MX'; } else if (/puerto rico|san juan/i.test(label)) { seg = 'PR'; code = 'PR'; } else if (/^colombia$/i.test(label)) { seg = 'CO'; code = 'CO'; } else if (/^total traffic$/i.test(label)) { seg = 'TOTAL'; code = 'TOTAL'; }
        else if (/^domestic traffic$/i.test(label) && seg) { code = seg; cells.unshift('__dom'); } else if (/^international traffic$/i.test(label) && seg) { code = seg; cells.unshift('__intl'); }
      } else if (table === 'PR') {
        if (/^(sju|lmm) total$/i.test(label)) { code = 'SJU'; seg = 'total'; } else if (/^domestic traffic$/i.test(label)) { code = 'SJU'; seg = 'dom'; } else if (/^international traffic$/i.test(label)) { code = 'SJU'; seg = 'intl'; }
      } else {
        if (/^domestic traffic$/i.test(label)) { seg = 'dom'; continue; } if (/^international traffic$/i.test(label)) { seg = 'intl'; continue; } if (/traffic total|total traffic/i.test(label)) { seg = 'total'; continue; }
        continue;
      }
    }
    if (!code) continue;
    let kind = seg;
    if (cells[0] === '__dom') { kind = 'dom'; cells.shift(); } else if (cells[0] === '__intl') { kind = 'intl'; cells.shift(); } else if (table === 'summary') kind = 'total';
    const toks = cells.map((c) => tokenizeRow('x | ' + c)).map((r) => (r ? r.toks[0] : null));
    if (toks.some((t) => !t)) continue;
    const vals = toks.map((t) => (t.dash ? 0 : t.v));
    if (vals.length < ypg) continue;
    const prev = thousands(vals[ypg - 2]), cur = thousands(vals[ypg - 1]);
    if (!kind) continue;
    if (['MX', 'PR', 'CO', 'TOTAL'].includes(code)) { (rel.countries ??= {}); ((rel.countries[code] ??= {}))[kind] = cur; ((rel.prior.countries ??= {})[code] ??= {})[kind] = prev; if (code === 'TOTAL') setv(kind, 'TOTAL', cur, prev); }
    else setv(kind, code, cur, prev);
  }
  return finishTraffic(rel);
}
function finishTraffic(rel) {
  for (const o of [rel, rel.prior]) for (const code of new Set([...Object.keys(o.dom), ...Object.keys(o.intl)])) if (o.total[code] == null && (o.dom[code] != null || o.intl[code] != null)) o.total[code] = Math.round(((o.dom[code] || 0) + (o.intl[code] || 0)) * 1000) / 1000;
  if (!Object.keys(rel.total).length) rel.warnings.push('no airport rows parsed');
  // fill dom/intl for airports that print only in one table (Colombia international only at MDE)
  for (const o of [rel, rel.prior]) for (const code of Object.keys(o.total)) { if (o.dom[code] == null && o.intl[code] != null) o.dom[code] = Math.round((o.total[code] - o.intl[code]) * 1000) / 1000; if (o.intl[code] == null && o.dom[code] != null) o.intl[code] = Math.round((o.total[code] - o.dom[code]) * 1000) / 1000; }
  return rel;
}

// ---------------------------------------------------------------------------------------------
async function main() {
  const files = (await readdir(RAW)).filter((f) => f.endsWith('.txt')).sort();
  const results = [], traffic = [];
  for (const f of files) {
    const text = await readFile(new URL(f, RAW), 'utf8');
    const h = header(text);
    const meta = { file: f, url: h.source, date: h.date, title: h.title };
    if (h.class === 'results-pdf') { const r = parseResults(text, meta); if (r) results.push(r); else console.warn(`results: could not identify period in ${f}`); }
    else if (h.class === 'traffic') { const t = parseTraffic(text, meta); if (t) traffic.push(t); }
  }
  // ---- merge (own release wins; comparatives fill gaps; later file wins ties)
  const quarters = {}, ytd = {}, bsByQ = {};
  const put = (store, id, part, vals, src, primary) => {
    if (!vals || !Object.keys(vals).length) return;
    const e = (store[id] ??= { id, parts: {}, sources: {} });
    const cur = e.parts[part], curPrimary = e.sources[part]?.primary;
    if (cur && curPrimary && !primary) return;
    if (cur && curPrimary === primary && e.sources[part].date > src.date) return;
    e.parts[part] = { ...(cur && curPrimary === primary ? cur : {}), ...vals }; e.sources[part] = { ...src, primary };
  };
  for (const r of results.sort((a, b) => a.source.date.localeCompare(b.source.date))) {
    const src = { url: r.source.url, date: r.source.date, title: r.source.title };
    for (const [id, parts] of Object.entries(r.quarters)) for (const part of ['is', 'cf', 'kpi']) put(quarters, id, part, parts[part], src, id === r.id);
    for (const [id, vals] of Object.entries(r.bs)) put(bsByQ, id, 'bs', vals, src, id === r.id);
    for (const [id, parts] of Object.entries(r.ytd)) for (const part of ['is', 'cf', 'kpi']) put(ytd, id, part, parts[part], src, id === `${r.fy}M${r.q * 3}`);
    for (const [id, segs] of Object.entries(r.segments)) put(id.includes('M') ? ytd : quarters, id, 'segments', segs, src, id === r.id || id === `${r.fy}M${r.q * 3}`);
    if (r.id in quarters) { quarters[r.id].fxEop = r.fxEop || null; quarters[r.id].fxAvg = r.fxAvg || null; if (r.debt) quarters[r.id].debt = r.debt; }
    if (r.warnings.length) console.warn(`${r.id} (${r.source.file}): ${r.warnings.join(' ; ')}`);
  }
  for (const [id, e] of Object.entries(bsByQ)) { const qq = (quarters[id] ??= { id, parts: {}, sources: {} }); qq.parts.bs = e.parts.bs; qq.sources.bs = e.sources.bs; }
  // derived: income tax total; 1Q YTD == quarter (the 3M column); quarterly cash flow = YTD − prior YTD
  const finish = (is) => {
    if (is && is.incomeTax == null && (is.incomeTaxCurrent != null || is.incomeTaxDeferred != null)) is.incomeTax = (is.incomeTaxCurrent || 0) + (is.incomeTaxDeferred || 0);
    // the printed "Other Revenues" row leaves one period blank, which the text conversion cannot distinguish from a
    // blank current period: derive it from the totals instead (operating income − (revenue − operating expenses))
    if (is && is.opIncome != null && is.revTotal != null && is.totalOpCosts != null) { const d = is.opIncome - (is.revTotal - is.totalOpCosts); is.otherRevenues = Math.abs(d) < 3 ? 0 : d; }
    // income-tax total: the two tax lines plus small items ASUR nets below the tax line; use EBT − NI when it is within 0.5%
    if (is && is.incomeBeforeTax != null && is.netIncome != null) { const tx = is.incomeBeforeTax - is.netIncome; if (is.incomeTax == null || Math.abs(tx - is.incomeTax) < 0.005 * Math.abs(is.netIncome || 1)) is.incomeTax = tx; } if (is && is.revTotal && is.ebitda != null) { is.ebitdaMargin = +(100 * is.ebitda / is.revTotal).toFixed(1); is.ebitdaMarginExIfric = +(100 * is.ebitda / (is.revTotal - (is.revConstruction || 0))).toFixed(1); } if (is && is.revTotal && is.opIncome != null) { is.opMargin = +(100 * is.opIncome / is.revTotal).toFixed(1); is.opMarginExIfric = +(100 * is.opIncome / (is.revTotal - (is.revConstruction || 0))).toFixed(1); } return is; };
  for (const e of Object.values(quarters)) finish(e.parts.is);
  for (const e of Object.values(ytd)) finish(e.parts.is);
  for (const e of Object.values(quarters)) {
    const fy = +e.id.slice(0, 4), q = +e.id.slice(5);
    if (!e.parts.cf) { const y = ytd[`${fy}M${q * 3}`], p = ytd[`${fy}M${(q - 1) * 3}`]; if (q === 1 && y && y.parts.cf) { e.parts.cf = { ...y.parts.cf }; e.sources.cf = y.sources.cf; } else if (y && y.parts.cf && p && p.parts.cf) { const o = {}; for (const [k, v] of Object.entries(y.parts.cf)) if (typeof v === 'number' && typeof p.parts.cf[k] === 'number' && !/^cash(Begin|End)$/.test(k)) o[k] = v - p.parts.cf[k]; if (y.parts.cf.cashEnd != null) o.cashEnd = y.parts.cf.cashEnd; if (p.parts.cf.cashEnd != null) o.cashBegin = p.parts.cf.cashEnd; e.parts.cf = o; e.sources.cf = { ...y.sources.cf, derived: 'YTD minus prior YTD' }; } }
    if (!e.parts.kpi) e.parts.kpi = {}; if (e.debt) { e.parts.kpi.totalDebt = e.debt.totalDebt ?? e.parts.kpi.totalDebt; e.parts.kpi.netDebt = e.debt.netDebt ?? e.parts.kpi.netDebt; e.parts.kpi.netDebtEbitda = e.debt.netDebtEbitda ?? e.parts.kpi.netDebtEbitda; }
  }
  const qList = Object.values(quarters).filter((e) => e.parts.is || e.parts.bs).sort((a, b) => a.id.localeCompare(b.id)).map((e) => ({
    id: e.id, fy: +e.id.slice(0, 4), q: +e.id.slice(5), label: `${e.id.slice(5)}Q${e.id.slice(2, 4)}`,
    is: e.parts.is || null, bs: e.parts.bs || null, cf: e.parts.cf || null, kpi: e.parts.kpi && Object.keys(e.parts.kpi).length ? e.parts.kpi : null, segments: e.parts.segments || null, debt: e.debt || null,
    shares: e.parts.is && e.parts.is.eps && e.parts.is.netIncomeMajority ? { current: Math.round(e.parts.is.netIncomeMajority * 1000 / e.parts.is.eps / 1e5) * 1e5, note: 'implied: majority net income / EPS' } : null,
    fxEop: e.fxEop || null, fxAvg: e.fxAvg || null, sources: e.sources,
  }));
  const ytdList = Object.values(ytd).sort((a, b) => a.id.localeCompare(b.id)).map((e) => ({ id: e.id, fy: +e.id.slice(0, 4), months: +e.id.split('M')[1], is: e.parts.is || null, cf: e.parts.cf || null, kpi: e.parts.kpi || null, segments: e.parts.segments || null, sources: e.sources }));
  const years = ytdList.filter((y) => y.months === 12).map((y) => { const q4 = qList.find((x) => x.id === `${y.fy}Q4`); return { id: `FY${y.fy}`, fy: y.fy, is: y.is, cf: y.cf, kpi: y.kpi, segments: y.segments, bs: q4?.bs || null, sources: { ...y.sources, bs: q4?.sources?.bs } }; });
  const fin = {
    generatedAt: new Date().toISOString(), currency: 'MXN', units: 'thousands',
    unitsNote: 'Statements in thousands of pesos as printed by ASUR; passengers in thousands; per-share in pesos / US$; margins in %. Puerto Rico (Aerostar) is consolidated at 100% with a 40% non-controlling interest; the US commercial segment (ASUR US Airports) from December 2025.',
    layout: { is: IS_ROWS.map(({ re, ...d }) => d), bs: BS_ROWS.map(({ re, ...d }) => d), cf: CF_ROWS.map(({ re, ...d }) => d), kpi: KPI_ROWS.map(({ re, ...d }) => d) },
    segments: SEGMENTS.map(({ re, ...d }) => d),
    quarters: qList, ytd: ytdList, years,
    coverage: { quarters: [qList[0]?.id, qList.at(-1)?.id], years: [years[0]?.id, years.at(-1)?.id], releasesParsed: results.length },
  };
  const finChanged = await writeData(OUT('financials.js'), 'ASUR_FIN', fin, GEN);
  console.log(`financials.js${finChanged ? '' : ' (unchanged)'}: ${qList.length} quarters (${fin.coverage.quarters.join(' → ')}), ${ytdList.length} YTD, ${years.length} fiscal years from ${results.length} PDF releases`);

  // ---- traffic
  const byMonth = {};
  for (const t of traffic.sort((a, b) => a.source.date.localeCompare(b.source.date))) {
    if (!Object.keys(t.total).length) { console.warn(`traffic ${t.ym}: no rows (${t.source.file})`); continue; }
    byMonth[t.ym] = { ym: t.ym, dom: t.dom, intl: t.intl, total: t.total, countries: t.countries || null, source: { url: t.source.url, date: t.source.date } };
    if (t.warnings.length) console.warn(`traffic ${t.ym}: ${t.warnings.join(' ; ')}`);
  }
  for (const t of traffic) {
    const [y, mo] = t.ym.split('-').map(Number); const prevYm = `${y - 1}-${String(mo).padStart(2, '0')}`;
    if (!byMonth[prevYm] && Object.keys(t.prior.total).length >= 10) { byMonth[prevYm] = { ym: prevYm, dom: t.prior.dom, intl: t.prior.intl, total: t.prior.total, countries: t.prior.countries || null, source: { url: t.source.url, date: t.source.date, note: "prior-year comparative column of the following year's release" } }; }
  }
  const months = Object.values(byMonth).sort((a, b) => a.ym.localeCompare(b.ym));
  const tr = { generatedAt: new Date().toISOString(), units: 'thousands of passengers', airports: AIRPORTS, countries: COUNTRIES, months, coverage: [months[0]?.ym, months.at(-1)?.ym], note: 'Mexico and Colombia exclude transit and general-aviation passengers; San Juan includes them. Persons converted to thousands. Airports acquired from Motiva (Brazil, Costa Rica, Curaçao, Ecuador) report from September 2026.' };
  const trChanged = await writeData(OUT('traffic.js'), 'ASUR_TRAFFIC', tr, GEN);
  console.log(`traffic.js${trChanged ? '' : ' (unchanged)'}: ${months.length} months (${tr.coverage.join(' → ')})`);

  const gd = { generatedAt: new Date().toISOString(), basis: 'ASUR does not publish a formal annual guidance table; it discloses Master Development Program (PMD) capex commitments and qualitative outlook on the earnings calls.', metrics: [], vintages: [] };
  const gdChanged = await writeData(OUT('guidance.js'), 'ASUR_GUIDANCE', gd, GEN);
  console.log(`guidance.js${gdChanged ? '' : ' (unchanged)'}: ${gd.vintages.length} vintages`);
}
main().catch((e) => { console.error(e); process.exit(1); });
