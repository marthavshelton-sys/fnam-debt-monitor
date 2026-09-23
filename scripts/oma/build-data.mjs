// Parses the harvested OMA documents (tools/oma/raw/releases/*.txt) into the model's data files:
//   site/oma/data/financials.js — quarterly + year-to-date + fiscal-year statements (IS with revenue and cost
//                                 detail, BS, CF), operating KPIs, results by airport and the debt table, from
//                                 the quarterly results PDFs
//   site/oma/data/traffic.js    — monthly terminal passengers by airport (domestic / international / total)
//   site/oma/data/guidance.js   — OMA publishes no formal guidance table; the file records that fact
// Units as printed: thousands of pesos; passengers converted from persons to thousands. `ebitda` carries
// OMA's Adjusted EBITDA (EBITDA − construction revenue + construction cost + major-maintenance provision) and
// `ebitdaMarginExIfric` its margin over aeronautical + non-aeronautical revenue, OMA's own headline metrics;
// the reported EBITDA is kept as `ebitdaReported`.
import { readdir, readFile } from 'node:fs/promises';
import { writeData, header, norm, normLabel, tokenizeRow, qid, pdfRows, parseRows, mapPair, MONTHS_EN } from '../airports/lib.mjs';

const RAW = new URL('../../tools/oma/raw/releases/', import.meta.url);
const OUT = (f) => new URL(`../../site/oma/data/${f}`, import.meta.url);
const GEN = 'scripts/oma/build-data.mjs from tools/oma/raw/releases';

export const IS_ROWS = [
  { k: 'revAero', en: 'Aeronautical revenues', es: 'Ingresos aeronáuticos', re: /^aeronautical revenues$/, level: 1 },
  { k: 'paxChargesDom', en: 'Domestic passenger charges (TUA)', es: 'TUA nacional', re: /^domestic passenger charges$/, level: 2 },
  { k: 'paxChargesIntl', en: 'International passenger charges (TUA)', es: 'TUA internacional', re: /^international passenger charges$/, level: 2 },
  { k: 'otherAero', en: 'Other aeronautical services, regulated leases and access rights', es: 'Otros servicios aeronáuticos, arrendamientos regulados y derechos de acceso', re: /^other aeronautical services/, level: 2 },
  { k: 'revNonAero', en: 'Non-aeronautical revenues', es: 'Ingresos no aeronáuticos', re: /^non-?aeronautical revenues$/, level: 1 },
  { k: 'revCommercial', en: 'Commercial activities', es: 'Actividades comerciales', re: /^total revenues from commercial activities$/, level: 2 },
  { k: 'revDiversification', en: 'Diversification activities (hotels, OMA Carga, real estate, industrial park)', es: 'Actividades de diversificación (hoteles, OMA Carga, inmobiliario, parque industrial)', re: /^total revenues from diversification activities$/, level: 2 },
  { k: 'revComplementary', en: 'Complementary activities', es: 'Actividades complementarias', re: /^total revenues from complementary activities$/, level: 2 },
  { k: 'revExConstruction', en: 'Aeronautical + non-aeronautical revenues', es: 'Ingresos aeronáuticos + no aeronáuticos', re: /^aeronautical( revenues)? \+ non-?aeronautical revenues$/, level: 0, bold: true },
  { k: 'revConstruction', en: 'Construction revenues (IFRIC 12)', es: 'Ingresos por construcción (IFRIC 12)', re: /^construction revenues?$/, level: 1, ifric: true },
  { k: 'revTotal', en: 'Total revenues', es: 'Ingresos totales', re: /^total revenues$/, level: 0, bold: true },
  { k: 'costServices', en: 'Cost of services', es: 'Costo de servicios', re: /^cost of services$/, level: 1 },
  { k: 'ga', en: 'Administrative expenses (G&A)', es: 'Gastos de administración', re: /^administrative expenses( \(g&a\))?$/, level: 1 },
  { k: 'costPayroll', en: 'Payroll', es: 'Nómina', re: /^payroll$/, level: 2 },
  { k: 'costContracted', en: 'Contracted services (security, cleaning, professional)', es: 'Servicios contratados (seguridad, limpieza, profesionales)', re: /^contracted services/, level: 2 },
  { k: 'costMinorMaint', en: 'Minor maintenance', es: 'Mantenimiento menor', re: /^minor maintenance$/, level: 2 },
  { k: 'costUtilities', en: 'Basic services (electricity, water, telephone)', es: 'Servicios básicos (electricidad, agua, teléfono)', re: /^basic services/, level: 2 },
  { k: 'costMaterials', en: 'Materials and supplies', es: 'Materiales y suministros', re: /^materials and supplies$/, level: 2 },
  { k: 'costInsurance', en: 'Insurance and bonding', es: 'Seguros y fianzas', re: /^insurance and bonding$/, level: 2 },
  { k: 'costOther', en: 'Other costs and expenses', es: 'Otros costos y gastos', re: /^other costs and expenses$/, level: 2 },
  { k: 'costHotel', en: 'Cost of hotel services', es: 'Costo de servicios hoteleros', re: /^cost of hotel services$/, level: 2 },
  { k: 'costIndustrial', en: 'Cost of industrial-park services', es: 'Costo de servicios del parque industrial', re: /^cost of industrial park services$/, level: 2 },
  { k: 'majorMaintenance', en: 'Major maintenance provision', es: 'Provisión de mantenimiento mayor', re: /^major maintenance provision$/, level: 1 },
  { k: 'costConstruction', en: 'Construction costs (IFRIC 12)', es: 'Costos de construcción (IFRIC 12)', re: /^construction costs?$/, level: 1, ifric: true },
  { k: 'concessionTaxes', en: 'Concession taxes', es: 'Derechos de concesión', re: /^concession taxes$/, level: 1 },
  { k: 'techAssistance', en: 'Technical assistance fee', es: 'Cuota de asistencia técnica', re: /^technical assistance fee$/, level: 1 },
  { k: 'da', en: 'Depreciation and amortization', es: 'Depreciación y amortización', re: /^depreciation (and|&) amortization$/, level: 1 },
  { k: 'otherExpense', en: 'Other (income) expense, net', es: 'Otros (ingresos) gastos, neto', re: /^other expenses? - net$/, level: 1 },
  { k: 'totalOpCosts', en: 'Total operating costs and expenses', es: 'Costos y gastos de operación totales', re: /^total operating costs and expenses$/, level: 0, bold: true },
  { k: 'opIncome', en: 'Operating income', es: 'Utilidad de operación', re: /^operating income$|^income from operations$/, level: 0, bold: true },
  { k: 'financialResult', en: 'Financing (expense) income, net', es: 'Resultado de financiamiento, neto', re: /^total financing( income)?$|^total financing expense$/, level: 1 },
  { k: 'interestIncome', en: 'Interest income', es: 'Ingresos por intereses', re: /^interest income$/, level: 2 },
  { k: 'interestExpense', en: 'Interest expense', es: 'Gastos por intereses', re: /^interest( expense)?$/, level: 2 },
  { k: 'interestDebt', en: 'of which: interest on bank and issued debt', es: 'de los cuales: intereses de deuda bancaria y bursátil', re: /^interest expense from bank and issued debt$/, level: 2 },
  { k: 'mmpPV', en: 'of which: unwinding of the major-maintenance provision', es: 'de los cuales: cambio en valor presente de la provisión de mantenimiento mayor', re: /^(changes in )?present value of major maintenance provision$/, level: 2 },
  { k: 'fxResult', en: 'Exchange gain (loss), net', es: 'Resultado cambiario, neto', re: /^exchange gain,? -? ?net$/, level: 2 },
  { k: 'incomeBeforeTax', en: 'Income before taxes', es: 'Utilidad antes de impuestos', re: /^income before taxes$/, level: 0, bold: true },
  { k: 'incomeTaxCurrent', en: 'Taxes, current', es: 'Impuestos causados', re: /^taxes - (cash|current)$/, level: 2 },
  { k: 'incomeTaxDeferred', en: 'Taxes, deferred', es: 'Impuestos diferidos', re: /^taxes - deferred$/, level: 2 },
  { k: 'incomeTax', en: 'Income tax', es: 'Impuestos a la utilidad', re: /^income tax$/, level: 1 },
  { k: 'netIncome', en: 'Consolidated net income', es: 'Utilidad neta consolidada', re: /^consolidated net income$/, level: 0, bold: true },
  { k: 'comprehensiveIncome', en: 'Consolidated comprehensive income', es: 'Utilidad integral consolidada', re: /^consolidated comprehensive income$/, level: 1 },
  { k: 'nci', en: 'Non-controlling interest', es: 'Participación no controladora', re: /^non-?controlling interest$/, level: 1 },
  { k: 'comprehensiveControlling', en: 'Net income of the controlling interest', es: 'Utilidad neta de la participación controladora', re: /^controlling interest$|^net income of controlling intere?s?t$/, level: 0, bold: true },
  { k: 'ebitdaReported', en: 'EBITDA (reported)', es: 'EBITDA (reportado)', re: /^ebitda$/, level: 1, kpi: true },
  { k: 'ebitdaMarginReported', en: 'EBITDA margin (reported, %)', es: 'Margen EBITDA (reportado, %)', re: /^ebitda margin \(%\)$/, level: 1, kpi: true, pct: true },
  { k: 'ebitda', en: 'Adjusted EBITDA (OMA definition)', es: 'EBITDA ajustado (definición de OMA)', re: /^adjusted ebitda$/, level: 0, bold: true, kpi: true },
  { k: 'ebitdaMarginExIfric', en: 'Adjusted EBITDA margin (% of aero + non-aero revenue)', es: 'Margen EBITDA ajustado (% de ingresos aero + no aero)', re: /^adjusted ebitda margin/, level: 1, kpi: true, pct: true },
  { k: 'opMargin', en: 'Operating margin (%)', es: 'Margen operativo (%)', re: /^operating margin \(%\)$/, level: 1, kpi: true, pct: true },
  { k: 'eps', en: 'Earnings per share (Ps.)', es: 'Utilidad por acción (Ps.)', re: /^eps \(ps\.\)$|^earnings per share,? ps$/, level: 1, kpi: true, perShare: true },
  { k: 'epads', en: 'Earnings per ADS (US$)', es: 'Utilidad por ADS (US$)', re: /^epads \(us\$\)$|^earnings per ads,? us\$$/, level: 1, kpi: true, perShare: true },
];
const BS_ASSETS = [
  { k: 'cash', en: 'Cash and cash equivalents', es: 'Efectivo y equivalentes', re: /^cash and cash equivalents$/, level: 1 },
  { k: 'receivables', en: 'Trade accounts receivable, net', es: 'Cuentas por cobrar, neto', re: /^trade accounts receivable - net$/, level: 1 },
  { k: 'receivablesRelated', en: 'Receivables from related parties', es: 'Cuentas por cobrar a partes relacionadas', re: /^trade accounts receivable from related parties$/, level: 1 },
  { k: 'recoverableTaxes', en: 'Recoverable taxes', es: 'Impuestos por recuperar', re: /^recoverable taxes$/, level: 1 },
  { k: 'advancesContractors', en: 'Advances to contractors', es: 'Anticipos a contratistas', re: /^advances to contractors$/, level: 1 },
  { k: 'otherCurrentAssets', en: 'Other current assets', es: 'Otros activos circulantes', re: /^other current assets$/, level: 1 },
  { k: 'totalCurrentAssets', en: 'Total current assets', es: 'Activo circulante', re: /^total current assets$/, level: 0, bold: true },
  { k: 'ppe', en: 'Land, buildings, machinery and equipment, net', es: 'Terrenos, edificios, maquinaria y equipo, neto', re: /^land, buildings, machinery and equipment - net$/, level: 1 },
  { k: 'concessions', en: 'Investments in airport concessions, net', es: 'Inversiones en concesiones aeroportuarias, neto', re: /^investments in airport concessions - net$/, level: 1 },
  { k: 'rou', en: 'Right-of-use assets, net', es: 'Activos por derecho de uso, neto', re: /^rights of use of leased assets/, level: 1 },
  { k: 'otherAssets', en: 'Other assets, net', es: 'Otros activos, neto', re: /^other assets - net$/, level: 1 },
  { k: 'deferredTaxAssets', en: 'Deferred taxes (asset)', es: 'Impuestos diferidos (activo)', re: /^deferred taxes$/, level: 1 },
  { k: 'totalAssets', en: 'Total assets', es: 'Activo total', re: /^total assets$/, level: 0, bold: true },
];
const BS_LIAB = [
  { k: 'bankLoansCurrent', en: 'Bank debt (short-term)', es: 'Deuda bancaria (corto plazo)', re: /^bank debt$/, level: 1 },
  { k: 'bondsCurrent', en: 'Current portion of long-term debt', es: 'Porción circulante de la deuda a largo plazo', re: /^current portion of long-term debt$/, level: 1 },
  { k: 'mmpCurrent', en: 'Current portion of major-maintenance provision', es: 'Porción circulante de la provisión de mantenimiento mayor', re: /^current portion of major maintenance provision$/, level: 1 },
  { k: 'leaseCurrent', en: 'Current portion of lease liabilities', es: 'Porción circulante de arrendamientos', re: /^current portion of financial leases$/, level: 1 },
  { k: 'accountsPayable', en: 'Trade accounts payable', es: 'Cuentas por pagar a proveedores', re: /^trade accounts payable$/, level: 1 },
  { k: 'taxesAccrued', en: 'Taxes and accrued expenses', es: 'Impuestos y gastos acumulados', re: /^taxes and accrued expenses$/, level: 1 },
  { k: 'payablesRelated', en: 'Payables to related parties', es: 'Cuentas por pagar a partes relacionadas', re: /^accounts payable to related parties$/, level: 1 },
  { k: 'totalCurrentLiabilities', en: 'Total current liabilities', es: 'Pasivo circulante', re: /^total current liabilities$/, level: 0, bold: true },
  { k: 'bondsLT', en: 'Long-term debt (certificados bursátiles)', es: 'Deuda a largo plazo (certificados bursátiles)', re: /^long-term debt$/, level: 1 },
  { k: 'guaranteeDeposits', en: 'Guarantee deposits', es: 'Depósitos en garantía', re: /^guarantee deposits$/, level: 1 },
  { k: 'employeeBenefits', en: 'Employee benefits', es: 'Beneficios a empleados', re: /^employee benefits$/, level: 1 },
  { k: 'mmpLT', en: 'Major-maintenance provision (long-term)', es: 'Provisión de mantenimiento mayor (largo plazo)', re: /^major maintenance provision$/, level: 1 },
  { k: 'leaseLT', en: 'Lease liabilities (long-term)', es: 'Arrendamientos (largo plazo)', re: /^financial leases$/, level: 1 },
  { k: 'deferredTaxLiab', en: 'Deferred taxes (liability)', es: 'Impuestos diferidos (pasivo)', re: /^deferred taxes$/, level: 1 },
  { k: 'ltPayablesRelated', en: 'Long-term payables to related parties', es: 'Cuentas por pagar a partes relacionadas a largo plazo', re: /^long-term accounts payable to related parties$/, level: 1 },
  { k: 'totalLiabilities', en: 'Total liabilities', es: 'Pasivo total', re: /^total liabilities$/, level: 0, bold: true },
  { k: 'commonStock', en: 'Common stock', es: 'Capital social', re: /^common stock$/, level: 1 },
  { k: 'apic', en: 'Additional paid-in capital', es: 'Prima en suscripción de acciones', re: /^additional paid-in capital$/, level: 1 },
  { k: 'retainedEarnings', en: 'Retained earnings', es: 'Utilidades retenidas', re: /^retained earnings$/, level: 1 },
  { k: 'repurchaseReserve', en: 'Share repurchase reserve', es: 'Reserva para recompra de acciones', re: /^share repurchase reserve$/, level: 1 },
  { k: 'laborObligations', en: 'Labour obligations (OCI)', es: 'Obligaciones laborales (ORI)', re: /^labor obligations$/, level: 1 },
  { k: 'nci', en: 'Non-controlling interest', es: 'Participación no controladora', re: /^non-?controlling interest$/, level: 1 },
  { k: 'totalEquity', en: "Stockholders' equity", es: 'Capital contable', re: /^stockholders' equity$/, level: 0, bold: true },
  { k: 'totalLiabEquity', en: "Total liabilities and stockholders' equity", es: 'Total pasivo y capital contable', re: /^total liabilities and stockholders?' equity$/, level: 0, bold: true },
];
export const BS_ROWS = [...BS_ASSETS, ...BS_LIAB];
const CF_OPS = [
  { k: 'incomeBeforeTax', en: 'Income before taxes', es: 'Utilidad antes de impuestos', re: /^income before taxes$/, level: 1 },
  { k: 'da', en: 'Depreciation and amortization', es: 'Depreciación y amortización', re: /^depreciation and amortization$/, level: 2 },
  { k: 'majorMaintenance', en: 'Major-maintenance provision', es: 'Provisión de mantenimiento mayor', re: /^major maintenance provision$/, level: 2 },
  { k: 'doubtful', en: 'Doubtful-accounts provision', es: 'Estimación de cuentas incobrables', re: /^doubtful accounts provision$/, level: 2 },
  { k: 'gainLossSale', en: '(Profit) loss on sale of equipment', es: '(Utilidad) pérdida en venta de equipo', re: /on sales? of machinery and equipment/, level: 2 },
  { k: 'interestIncomeAdj', en: 'Interest income (reclassified)', es: 'Ingresos por intereses (reclasificados)', re: /^interest income$/, level: 2 },
  { k: 'leasePV', en: 'Unwinding of lease liabilities', es: 'Cambio en valor presente de arrendamientos', re: /^changes in present value of financial leases$/, level: 2 },
  { k: 'mmpPV', en: 'Unwinding of the major-maintenance provision', es: 'Cambio en valor presente de la provisión de mantenimiento mayor', re: /^(changes in )?present value of major maintenance provision$/, level: 2 },
  { k: 'interestDebt', en: 'Interest on bank and issued debt', es: 'Intereses de deuda bancaria y bursátil', re: /^interest expense from bank and issued debt$/, level: 2 },
  { k: 'interestExpenseAdj', en: 'Interest expense (total)', es: 'Gastos por intereses (total)', re: /^interest( expense)?$/, level: 2 },
  { k: 'fxFluct', en: 'Exchange fluctuation', es: 'Fluctuación cambiaria', re: /^(non-paid )?exchange fluctuation$/, level: 2 },
  { k: 'opBeforeWc', en: 'Cash flow before working capital', es: 'Flujo antes de capital de trabajo', re: /^$/, level: 0, bold: true, unlabeled: true },
  { k: 'wcReceivables', en: 'Trade accounts receivable', es: 'Cuentas por cobrar', re: /^trade accounts receivable - net$/, level: 2 },
  { k: 'wcRecoverableTax', en: 'Recoverable taxes', es: 'Impuestos por recuperar', re: /^recoverable taxes$/, level: 2 },
  { k: 'wcOtherReceivables', en: 'Other accounts receivable', es: 'Otras cuentas por cobrar', re: /^other accounts receivable$/, level: 2 },
  { k: 'wcPayables', en: 'Accounts payable', es: 'Cuentas por pagar', re: /^accounts payable$/, level: 2 },
  { k: 'wcTaxesAccrued', en: 'Taxes and accrued expenses', es: 'Impuestos y gastos acumulados', re: /^taxes and accrued expenses$/, level: 2 },
  { k: 'taxesPaid', en: 'Taxes paid', es: 'Impuestos pagados', re: /^taxes paid$/, level: 2 },
  { k: 'wcRelated', en: 'Payables to related parties', es: 'Cuentas por pagar a partes relacionadas', re: /^accounts payable to related parties$/, level: 2 },
  { k: 'mmPayments', en: 'Major-maintenance payments', es: 'Pagos de mantenimiento mayor', re: /^major maintenance payments$/, level: 2 },
  { k: 'wcOtherLT', en: 'Other long-term liabilities', es: 'Otros pasivos a largo plazo', re: /^other long-term liabilities$/, level: 2 },
  { k: 'cfo', en: 'Net cash from operating activities', es: 'Flujo neto de actividades de operación', re: /^net flow from operating activities$/, level: 0, bold: true },
];
const CF_INV = [
  { k: 'capexPpe', en: 'Acquisition of property, plant and equipment', es: 'Adquisición de propiedades, planta y equipo', re: /^acquisition of property, plant and equipment$/, level: 1 },
  { k: 'capexConcessions', en: 'Investment in airport concessions', es: 'Inversión en concesiones aeroportuarias', re: /^investment in airport concessions$/, level: 1 },
  { k: 'capex', en: 'Capex (PP&E + concession investments)', es: 'Capex (PP&E + inversiones en concesiones)', re: /^capex \(pp&e \+ concession investments\)$/, level: 1 },
  { k: 'otherLTAssets', en: 'Other long-term assets', es: 'Otros activos a largo plazo', re: /^other long-term assets$/, level: 1 },
  { k: 'saleProceeds', en: 'Proceeds from sale of land, machinery and equipment', es: 'Venta de terrenos, maquinaria y equipo', re: /^proceeds from sale of land, machinery and equipment$/, level: 1 },
  { k: 'interestReceived', en: 'Interest income received', es: 'Intereses cobrados', re: /^interest income$/, level: 1 },
  { k: 'cfi', en: 'Net cash used in investing activities', es: 'Flujo neto de actividades de inversión', re: /^net flow from investing activities$/, level: 0, bold: true },
];
const CF_FIN = [
  { k: 'cfBeforeFin', en: 'Cash flow before financing activities', es: 'Flujo antes de actividades de financiamiento', re: /^cash flow before financing activities$/, level: 0, bold: true },
  { k: 'loansReceived', en: 'Bank loans received', es: 'Préstamos bancarios obtenidos', re: /^bank loans - received$|^loans - disbursed$/, level: 1 },
  { k: 'loansPaid', en: 'Bank loans paid', es: 'Préstamos bancarios pagados', re: /^bank loans - paid$/, level: 1 },
  { k: 'bondsIssued', en: 'Debt issuance', es: 'Emisión de deuda', re: /^debt issuance$|^issuance of debt securities$|^securities debt - disbursed$/, level: 1 },
  { k: 'bondsPaid', en: 'Debt issues paid', es: 'Pago de emisiones de deuda', re: /^debt issue - paid$|^repayment of debt securities$|^securities debt - paid$/, level: 1 },
  { k: 'issuanceCosts', en: 'Debt issuance expenses', es: 'Gastos de emisión de deuda', re: /^debt issuance (expenses|costs)$/, level: 1 },
  { k: 'relatedLoansReceived', en: 'Related-party loans received', es: 'Préstamos de partes relacionadas obtenidos', re: /^related-party loans - received$/, level: 1 },
  { k: 'relatedLoansPaid', en: 'Related-party loans paid', es: 'Préstamos de partes relacionadas pagados', re: /^related-party loans - paid$/, level: 1 },
  { k: 'interestPaid', en: 'Interest paid', es: 'Intereses pagados', re: /^interest expense$/, level: 1 },
  { k: 'nciChange', en: 'Change in non-controlling interest', es: 'Cambio en participación no controladora', re: /^increase in the non-?controlling interest$/, level: 1 },
  { k: 'dividendsPaid', en: 'Dividends paid', es: 'Dividendos pagados', re: /^dividends paid$/, level: 1 },
  { k: 'capitalReduction', en: 'Capital reimbursement', es: 'Reembolso de capital', re: /^capital rei[mn]bursements?( paid)?$/, level: 1 },
  { k: 'buybacks', en: 'Share repurchases', es: 'Recompra de acciones', re: /repurchase|buyback/, level: 1 },
  { k: 'leasePayments', en: 'Payment of leases', es: 'Pagos de arrendamientos', re: /^payment of financial leases$/, level: 1 },
  { k: 'cff', en: 'Net cash from (used in) financing activities', es: 'Flujo neto de actividades de financiamiento', re: /^net cash flow from financing activities$/, level: 0, bold: true },
  { k: 'netChangeCash', en: 'Net increase (decrease) in cash', es: 'Aumento (disminución) neto de efectivo', re: /^net in cash and cash equivalents$|^net (increase|decrease) in cash/, level: 0, bold: true },
  { k: 'fxEffectCash', en: 'Effect of changes in the value of cash', es: 'Efecto por cambios en el valor del efectivo', re: /^effects? of changes? in the value of cash/, level: 1 },
  { k: 'cashBegin', en: 'Cash at beginning of period', es: 'Efectivo al inicio del periodo', re: /^cash and equivalents at beginning of period$/, level: 1 },
  { k: 'cashEnd', en: 'Cash at end of period', es: 'Efectivo al final del periodo', re: /^cash and equivalents at end of period$/, level: 0, bold: true },
];
export const CF_ROWS = [...CF_OPS, ...CF_INV, ...CF_FIN];
export const KPI_ROWS = [
  { k: 'seats', en: 'Available seats (thousands)', es: 'Asientos ofrecidos (miles)', re: /^available seats$/, pax: true },
  { k: 'paxDom', en: 'Domestic passengers (thousands)', es: 'Pasajeros nacionales (miles)', re: /^domestic$/, pax: true },
  { k: 'paxIntl', en: 'International passengers (thousands)', es: 'Pasajeros internacionales (miles)', re: /^international$/, pax: true },
  { k: 'pax', en: 'Total passengers (thousands)', es: 'Pasajeros totales (miles)', re: /^total passenger traffic$/, pax: true },
  { k: 'paxCommercial', en: 'Commercial aviation passengers (thousands)', es: 'Pasajeros de aviación comercial (miles)', re: /^commercial aviation/, pax: true },
  { k: 'paxGA', en: 'General-aviation passengers (thousands)', es: 'Pasajeros de aviación general (miles)', re: /^general aviation$/, pax: true },
  { k: 'cargoWlu', en: 'Cargo units (thousands)', es: 'Unidades de carga (miles)', re: /^cargo units$/, pax: true },
  { k: 'wlu', en: 'Workload units (thousands)', es: 'Unidades de carga de trabajo (miles)', re: /^workload units$/, pax: true },
  { k: 'ops', en: 'Flight operations (takeoffs and landings)', es: 'Operaciones (despegues y aterrizajes)', re: /^total flight operations$/ },
  { k: 'aeroPerPax', en: 'Aeronautical revenue per passenger (Ps.)', es: 'Ingreso aeronáutico por pasajero (Ps.)', re: /^aeronautical revenues\/passenger \(ps\.\)$/ },
  { k: 'commercialPerPax', en: 'Commercial revenue per passenger (Ps.)', es: 'Ingreso comercial por pasajero (Ps.)', re: /^revenues from commercial activities\/passenger \(ps\.\)$/ },
  { k: 'nonAeroPerPax', en: 'Non-aeronautical revenue per passenger (Ps.)', es: 'Ingreso no aeronáutico por pasajero (Ps.)', re: /^non-?aeronautical revenues\/passenger \(ps\.\)$/ },
  { k: 'revPerPax', en: 'Aero + non-aero revenue per passenger (Ps.)', es: 'Ingreso aero + no aero por pasajero (Ps.)', re: /^aeronautical revenues \+ non-?aeronautical revenues \/ passenger \(ps\.\)$/ },
  { k: 'costPerPax', en: 'Cost of services + G&A per passenger (Ps.)', es: 'Costo de servicios + gastos de administración por pasajero (Ps.)', re: /^subtotal \(cost of services \+ g&a\) \/ passenger \(ps\.\)$/ },
  { k: 'occupancyPct', en: 'Commercial space occupancy (%)', es: 'Ocupación de espacios comerciales (%)', re: /^$/ },
  { k: 'sharesWeighted', en: 'Weighted average shares outstanding', es: 'Acciones promedio en circulación', re: /^weighted average shares outstanding$/ },
];
const AIRPORTS = [
  { code: 'MTY', en: 'Monterrey', es: 'Monterrey', group: 'metro' }, { code: 'CUL', en: 'Culiacán', es: 'Culiacán', group: 'regional' }, { code: 'CUU', en: 'Chihuahua', es: 'Chihuahua', group: 'regional' },
  { code: 'CJS', en: 'Ciudad Juárez', es: 'Ciudad Juárez', group: 'border' }, { code: 'MZT', en: 'Mazatlán', es: 'Mazatlán', group: 'tourist' }, { code: 'ZIH', en: 'Zihuatanejo', es: 'Zihuatanejo', group: 'tourist' },
  { code: 'ACA', en: 'Acapulco', es: 'Acapulco', group: 'tourist' }, { code: 'TRC', en: 'Torreón', es: 'Torreón', group: 'regional' }, { code: 'SLP', en: 'San Luis Potosí', es: 'San Luis Potosí', group: 'regional' },
  { code: 'TAM', en: 'Tampico', es: 'Tampico', group: 'regional' }, { code: 'DGO', en: 'Durango', es: 'Durango', group: 'regional' }, { code: 'ZCL', en: 'Zacatecas', es: 'Zacatecas', group: 'regional' }, { code: 'REX', en: 'Reynosa', es: 'Reynosa', group: 'border' },
];
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const AIRPORT_BY_NAME = Object.fromEntries(AIRPORTS.map((a) => [stripAccents(a.en.toLowerCase()), a.code]));
const thousands = (v) => (v == null ? null : Math.round(v) / 1000);

// ---------------------------------------------------------------------------------------------
// Headers: "2Q25 2Q26 % Var 6M 2025 6M 2026 % Var" (period tokens inline), or a year line under a title
// line that names the periods ("From April 1 to June 30, From January 1 to June 30").
// ---------------------------------------------------------------------------------------------
function periodsFromTokens(line) {
  const toks = line.replace(/\|/g, ' ').replace(/\(ps\. ?thousands?\)/i, '').split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    let m;
    if ((m = toks[i].match(/^(\d)[QT](\d\d)$/i))) out.push({ q: +m[1], fy: 2000 + +m[2] });
    else if ((m = toks[i].match(/^(\d{1,2})M$/i)) && /^20\d\d$/.test(toks[i + 1] || '')) { out.push({ months: +m[1], fy: +toks[i + 1] }); i++; }
    else if ((m = toks[i].match(/^(\d{1,2})M(\d\d)$/i))) out.push({ months: +m[1], fy: 2000 + +m[2] });
    else if (/^20\d\d$/.test(toks[i])) out.push({ fy: +toks[i] });
  }
  return out;
}
function findHeader(lines, start, maxAhead = 8, ctx = {}) {
  for (let i = start; i < Math.min(lines.length, start + maxAhead); i++) {
    const ps = periodsFromTokens(lines[i]);
    if (ps.length < 2 || ps.length % 2) continue;
    const other = lines[i].replace(/\|/g, ' ').split(/\s+/).filter((t) => t && !/^(\d[QT]\d\d|\d{1,2}M(\d\d)?|20\d\d|%|var\.?|%var\.?|vs|\(ps\.|thousands?\)|thousand|passengers|and|million|pesos\)|\(thousand)$/i.test(t));
    if (other.length > 3) continue; // a prose line that happens to mention years
    // year-only tokens: resolve with the title line(s) above ("From April 1 to June 30" -> quarter; "From January 1" -> YTD; "4Q24 4Q25 % Var 2024 2025" -> FY)
    if (ps.some((p) => p.fy && p.q == null && p.months == null)) {
      const above = lines.slice(Math.max(0, i - 3), i).join(' ');
      const monthNo = (s) => MONTHS_EN.findIndex((m) => m.startsWith(s.toLowerCase().slice(0, 3))) + 1;
      const spans = [...above.matchAll(/From ([A-Za-z]{3,9})\.? \|? ?1,? to ([A-Za-z]{3,9})/g)].filter((m) => monthNo(m[1]) && monthNo(m[2])).map((m) => { const s = monthNo(m[1]), e = monthNo(m[2]); return s === 1 ? { months: e } : { q: Math.ceil(e / 3) }; });
      const groups = ps.length / 2;
      // the spans are trusted only when one is named per group; otherwise fall back to the release's quarter
      const kinds = spans.length === groups ? spans : ps.some((p) => p.q) ? [{ months: 12 }] : ctx.q ? (groups === 1 ? [{ q: ctx.q }] : [{ q: ctx.q }, { months: ctx.q * 3 }]) : spans;
      let gi = 0;
      for (let k = 0; k < ps.length; k += 2) { if (ps[k].q == null && ps[k].months == null) { const kind = kinds[gi] || kinds[kinds.length - 1]; if (!kind) return null; ps[k] = { ...kind, fy: ps[k].fy }; ps[k + 1] = { ...kind, fy: ps[k + 1].fy }; } gi++; }
    }
    return { line: i, periods: ps, groups: ps.length / 2 };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Quarterly results PDF
// ---------------------------------------------------------------------------------------------
function parseResults(text, meta) {
  const lines = text.split('\n');
  const head = text.slice(0, 3000);
  const m = head.match(/(First|Second|Third|Fourth) Quarter (20\d\d)/i) || head.match(/\b(\d)Q(\d\d)\b/);
  if (!m) return null;
  const q = /^\d$/.test(m[1]) ? +m[1] : ['first', 'second', 'third', 'fourth'].indexOf(m[1].toLowerCase()) + 1;
  const fy = /^\d$/.test(m[1]) ? 2000 + +m[2] : +m[2];
  const rel = { id: qid(fy, q), fy, q, source: meta, quarters: {}, ytd: {}, bs: {}, warnings: [] };
  const idx = (re, from = 0) => { for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i; return -1; };
  const store = (p, part, vals) => {
    if (!p || !Object.keys(vals).length) return;
    const s = p.q ? (rel.quarters[qid(p.fy, p.q)] ??= {}) : (rel.ytd[`${p.fy}M${p.months}`] ??= {});
    s[part] = { ...vals, ...(s[part] || {}) };
    if (!p.q && p.months === 3) store({ fy: p.fy, q: 1 }, part, vals); // "From January 1 to March 31" is also the first quarter
  };
  const storeGroups = (hd, out, part, conv = (o) => o) => out.forEach((vals, g) => { store(hd.periods[g * 2], part, conv(mapPair(vals, 0))); store(hd.periods[g * 2 + 1], part, conv(mapPair(vals, 1))); });
  const blockEnd = (from, max, stop = /^<<page|^Grupo Aeroportuario|^Unaudited /) => { let e = from; while (e < lines.length && e < from + max && !stop.test(lines[e])) e++; return e; };
  // --- Income statement exhibit
  const isS = idx(/^Unaudited Consolidated Statement of Comprehensive Income/i);
  if (isS >= 0) {
    const hd = findHeader(lines, isS + 1, 6, { q });
    if (hd) { const rows = pdfRows(lines, hd.line + 1, blockEnd(hd.line + 1, 70)); const { out, unmatched } = parseRows(rows, IS_ROWS, hd.groups, 3); if (unmatched.length) rel.warnings.push(`IS unmatched: ${unmatched.filter((u) => !/^(-|weighted average shares outstanding)$/.test(u)).slice(0, 6).join(' | ')}`); storeGroups(hd, out, 'is'); const sh = parseRows(rows, KPI_ROWS.filter((k) => k.k === 'sharesWeighted'), hd.groups, 3); storeGroups(hd, sh.out, 'kpi'); }
    else rel.warnings.push('IS header not found');
  } else rel.warnings.push('IS exhibit not found');
  // --- Revenue and cost detail tables (pages 4-6): every "(Ps. Thousands) 2Q25 2Q26 ..." header before the traffic pages
  const detailEnd = idx(/^Unaudited Consolidated Balance Sheet/i);
  for (let i = 0; i < (detailEnd < 0 ? lines.length : detailEnd); i++) {
    if (!/\(Ps\. ?Thousands?\)/i.test(lines[i]) && !/^\dQ\d\d \dQ\d\d % ?Var/.test(lines[i])) continue;
    const hd = findHeader(lines, i, 2, { q }); if (!hd) continue;
    const { out } = parseRows(pdfRows(lines, hd.line + 1, blockEnd(hd.line + 1, 40, /^<<page|^\(Ps\. ?Thousands?\)|^\dQ\d\d \dQ\d\d|^Indebtedness|^Cash Flow Statement/i)), [...IS_ROWS, ...KPI_ROWS.filter((k) => /PerPax$/.test(k.k))], hd.groups, 3);
    const isOut = out.map((o) => Object.fromEntries(Object.entries(o).filter(([k]) => IS_ROWS.some((d) => d.k === k))));
    const kOut = out.map((o) => Object.fromEntries(Object.entries(o).filter(([k]) => KPI_ROWS.some((d) => d.k === k))));
    storeGroups(hd, isOut, 'is'); storeGroups(hd, kOut, 'kpi');
    i = hd.line;
  }
  // --- Operating data (seats, passengers, cargo, WLUs, operations)
  const opS = idx(/^Available Seats \|/i);
  if (opS >= 0) {
    const hd = findHeader(lines, Math.max(0, opS - 5), 5, { q });
    if (hd) {
      const end = blockEnd(opS, 20, /^Commercial Operations|^<<page/);
      const flight = idx(/^Flight Operations/i, opS);
      const rows = pdfRows(lines, opS, flight > 0 && flight < end ? flight : end);
      const { out } = parseRows(rows, KPI_ROWS, hd.groups, 3);
      const conv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, KPI_ROWS.find((d) => d.k === k).pax ? thousands(v) : v]));
      storeGroups(hd, out, 'kpi', conv);
      if (flight > 0) { const { out: o2 } = parseRows(pdfRows(lines, flight, end), KPI_ROWS.filter((k) => k.k === 'ops'), hd.groups, 3); storeGroups(hd, o2, 'kpi'); }
    }
  }
  const occ = text.match(/commercial space occupancy rate[^.]*?was ([\d.]+)%/i); if (occ) ((rel.quarters[rel.id] ??= {}).kpi ??= {}).occupancyPct = +occ[1];
  // --- MDP capex (page-1 summary table, Ps. million)
  const mdp = lines.find((l) => /^MDP and Strategic Investments \|/i.test(l));
  if (mdp) { const r = tokenizeRow(mdp); if (r) { const v = r.toks.filter((t) => !t.pct).map((t) => t.v); const hd = findHeader(lines, Math.max(0, lines.indexOf(mdp) - 20), 20, { q }); if (hd && v.length >= 2 * hd.groups) { const vals = Array.from({ length: hd.groups }, (_, g) => [v[g * 3], v[g * 3 + 1]]); storeGroups(hd, vals.map((p) => ({ capexMdpM: p })), 'kpi'); } } }
  // --- Balance sheet exhibit: three dated columns
  const bsS = idx(/^Unaudited Consolidated Balance Sheet/i);
  if (bsS >= 0) {
    const dateLine = lines.slice(bsS + 1, bsS + 5).find((l) => /(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},/.test(l));
    const yearLine = lines.slice(bsS + 1, bsS + 6).find((l) => /^(20\d\d\s+){2,}/.test(l.replace(/\|/g, ' ').trim()) || /^20\d\d \| 20\d\d/.test(l));
    if (dateLine && yearLine) {
      const months = [...dateLine.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}),/g)].map((x) => MONTHS_EN.indexOf(x[1].toLowerCase()) + 1);
      const years = yearLine.replace(/\|/g, ' ').split(/\s+/).filter((t) => /^20\d\d$/.test(t)).map(Number);
      const cols = months.map((mo, i) => ({ fy: years[i], q: Math.ceil(mo / 3) }));
      const liabS = idx(/^Liabilities and Stockholder/i, bsS);
      const end = blockEnd(bsS + 1, 80, /^<<page/);
      const grab = (rows, cat) => { const acc = cols.map(() => ({})); for (const r of rows) { let def = null; for (const c of (r.labels.length ? r.labels : [r.label])) { const nl = normLabel(c); def = cat.find((d) => d.re.test(nl)); if (def) break; } if (!def) continue; const v = r.toks.slice(0, cols.length).map((t) => t.v); v.forEach((x, i) => { if (!(def.k in acc[i])) acc[i][def.k] = x; }); } return acc; };
      const a = grab(pdfRows(lines, bsS + 1, liabS > 0 ? liabS : end), BS_ASSETS), l = grab(pdfRows(lines, liabS > 0 ? liabS : bsS + 1, end), BS_LIAB);
      cols.forEach((c, i) => { if (c.fy && Object.keys(a[i]).length) rel.bs[qid(c.fy, c.q)] = { ...a[i], ...l[i] }; });
    } else rel.warnings.push('BS header not found');
  } else rel.warnings.push('BS exhibit not found');
  // --- Cash-flow exhibit: quarter group + YTD group
  const cfS = idx(/^Unaudited Consolidated Cash Flow Statement/i);
  if (cfS >= 0) {
    const hd = findHeader(lines, cfS + 1, 6, { q });
    if (hd) {
      const rows = pdfRows(lines, hd.line + 1, blockEnd(hd.line + 1, 70, /^<<page/));
      const cfoI = rows.findIndex((r) => /net flow from operating/i.test(r.label)), cfiI = rows.findIndex((r) => /net flow from investing/i.test(r.label));
      const parts = [[rows.slice(0, cfoI + 1), CF_OPS], [rows.slice(cfoI + 1, cfiI + 1), CF_INV], [rows.slice(cfiI + 1), CF_FIN]];
      const merged = Array.from({ length: hd.groups }, () => ({})); const unmatched = [];
      for (const [rs, cat] of parts) { const r = parseRows(rs, cat, hd.groups, 3); r.out.forEach((o, g) => Object.assign(merged[g], o)); unmatched.push(...r.unmatched); }
      if (unmatched.length) rel.warnings.push(`CF unmatched: ${unmatched.slice(0, 6).join(' | ')}`);
      storeGroups(hd, merged, 'cf');
    } else rel.warnings.push('CF header not found');
  } else rel.warnings.push('CF exhibit not found');
  // --- Debt table
  const dS = idx(/^Indebtedness$/i);
  if (dS >= 0) {
    const debt = { instruments: [] };
    for (let i = dS + 1; i < Math.min(lines.length, dS + 40) && !/^Derivatives|^<<page/.test(lines[i]); i++) {
      const l = lines[i];
      const nm = l.match(/\b(OMA ?\d\d[A-Z0-9-]*)\b/);
      if (nm && /\|/.test(l)) {
        const cells = l.split('|').map((c) => c.trim());
        const mat = l.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*\|?\s*(20\d\d)/i);
        const rate = (l.match(/(\d+\.\d+)%/) || [])[1] ? { fixedPct: +(l.match(/(\d+\.\d+)%/) || [])[1] } : (l.match(/TIIE[^|]*bps/i) ? { floating: l.match(/TIIE[^|]*bps/i)[0].replace(/\s+/g, ' ') } : null);
        const nums = cells.slice(1).map((c) => tokenizeRow('x | ' + c)).map((r) => (r && r.toks[0] ? (r.toks[0].dash ? 0 : r.toks[0].v) : null)).filter((v) => v != null);
        const bal = nums.slice(-3);
        const size = (l.match(/Ps\.\s*([\d,]+)\s*mm/i) || [])[1];
        debt.instruments.push({ name: nm[1].replace(/\s+/g, ''), desc: l.split(':')[0].trim(), maturity: mat ? `${mat[2]}-${String(MONTHS_EN.indexOf(mat[1].toLowerCase()) + 1).padStart(2, '0')}` : null, rate, sizeMxnM: size ? +size.replace(/,/g, '') : null, balanceMxnK: bal[bal.length - 1] ?? null, type: /bond/i.test(l) ? 'CB' : 'loan' });
      } else if (/^Credit Lines|^Bank Debt \|/i.test(l) && /\|/.test(l)) {
        const cells = l.split('|').map((c) => c.trim()); const nums = cells.slice(1).map((c) => tokenizeRow('x | ' + c)).map((r) => (r && r.toks[0] ? (r.toks[0].dash ? 0 : r.toks[0].v) : null)).filter((v) => v != null);
        debt.instruments.push({ name: 'Bank credit lines', desc: l.split('|')[0].trim(), maturity: null, rate: (l.match(/TIIE[^|]*bps/i) ? { floating: l.match(/TIIE[^|]*bps/i)[0] } : null), balanceMxnK: nums.slice(-1)[0] ?? null, type: 'loan' });
      } else {
        const r = tokenizeRow(l); if (!r || !r.label) continue; const lab = normLabel(r.label); const last = r.toks.filter((t) => !t.pct).slice(-1)[0];
        if (/^total debt \+ financial leases$/.test(lab)) debt.totalDebtWithLeases = last.v; else if (/^net debt/.test(lab) && !/ebitda/.test(lab)) debt.netDebtWithLeases = last.v; else if (/net debt \/ last twelve months adjusted ebitda/.test(lab)) debt.netDebtEbitda = last.v; else if (/^subtotal long-term debt$/.test(lab)) debt.bondsOutstanding = last.v; else if (/^total short-term debt$/.test(lab)) debt.shortTermDebt = last.v; else if (/^fixed rate issued debt$/.test(lab)) debt.fixedPct = r.toks.slice(-1)[0].v;
      }
    }
    rel.debt = debt;
  }
  // --- Traffic by airport (quarter): kept for tie-outs against the monthly reports
  const tS = idx(/^Passenger Traffic$/i);
  if (tS >= 0) {
    const grab = (title) => { const s = idx(title, tS); if (s < 0) return null; const hd = findHeader(lines, s, 1, { q }); if (!hd) return null; const o = {}; for (const r of pdfRows(lines, s + 1, s + 16)) { const code = AIRPORT_BY_NAME[stripAccents(normLabel(r.label))] || (/^total$/i.test(r.label) ? 'TOTAL' : null); if (!code) continue; hd.periods.forEach((p, k) => { if (!p.q) return; const key = qid(p.fy, p.q); const g = Math.floor(k / 2); const v = r.toks.filter((t) => !t.pct); const val = v[g * 3 + (k % 2)]; if (val) (o[key] ??= {})[code] = thousands(val.v); }); } return o; };
    const tot = grab(/^Total Passengers \dQ/i), dom = grab(/^Domestic Passengers \dQ/i), intl = grab(/^International Passengers \dQ/i);
    if (tot) for (const key of Object.keys(tot)) { const s = key.includes('M') ? null : (rel.quarters[key] ??= {}); if (s) s.trafficQ = { total: tot[key], dom: dom && dom[key], intl: intl && intl[key] }; }
  }
  const fx = text.match(/Ps\.([\d.]+)\s+as of (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d\.?$/m);
  const fxAll = [...text.matchAll(/Ps\.([\d.]+)\s+as of (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, (20\d\d)/g)];
  if (fxAll.length) { const cur = fxAll.find((x) => +x[3] === fy) || fxAll[fxAll.length - 1]; rel.fxEop = +cur[1]; }
  return rel;
}

// ---------------------------------------------------------------------------------------------
// Monthly traffic PDF: "Total Passengers*" (group), then by airport: Total / Domestic / International
// ---------------------------------------------------------------------------------------------
function parseTraffic(text, meta) {
  const head = text.slice(0, 2500);
  const tm = head.match(/in (January|February|March|April|May|June|July|August|September|October|November|December) (20\d\d)(?: passenger traffic| terminal)?/i) || (meta.title || '').match(/(January|February|March|April|May|June|July|August|September|October|November|December) (20\d\d)/i);
  if (!tm) return null;
  const ym = `${tm[2]}-${String(MONTHS_EN.indexOf(tm[1].toLowerCase()) + 1).padStart(2, '0')}`;
  const rel = { ym, source: meta, dom: {}, intl: {}, total: {}, prior: { dom: {}, intl: {}, total: {} }, warnings: [] };
  const lines = text.split('\n');
  let seg = null, swapped = null;
  for (const raw of lines) {
    const l = norm(raw);
    if (/^total passengers/.test(l)) { seg = 'total'; continue; }
    if (/^domestic passengers/.test(l)) { seg = 'dom'; continue; }
    if (/^international passengers/.test(l)) { seg = 'intl'; continue; }
    if (!seg || !/\|/.test(raw)) continue;
    const r = tokenizeRow(raw); if (!r || r.toks.length < 3) continue;
    const lab = stripAccents(normLabel(r.label));
    let code = AIRPORT_BY_NAME[lab] || (/^oma total$|^total$/.test(lab) ? 'TOTAL' : null);
    let kind = seg;
    if (!code && seg === 'total') { if (/^domestic$/.test(lab)) { code = 'TOTAL'; kind = 'dom'; } else if (/^international$/.test(lab)) { code = 'TOTAL'; kind = 'intl'; } }
    if (!code) continue;
    const v = r.toks.map((t) => (t.dash ? 0 : t.v));
    // column order check: the third token is the % change between the first two
    if (swapped == null && v[0] && v[1]) { const chg = 100 * (v[1] / v[0] - 1); swapped = Math.abs(chg - v[2]) > Math.abs(100 * (v[0] / v[1] - 1) - v[2]) + 0.05; }
    const prev = thousands(swapped ? v[1] : v[0]), cur = thousands(swapped ? v[0] : v[1]);
    rel[kind][code] = cur; rel.prior[kind][code] = prev;
  }
  if (!Object.keys(rel.total).length) rel.warnings.push('no rows parsed');
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
    if (h.class === 'results' && /Investor-Relations|Presentacion|_omaIR-|IR-\dT\d\d|PPT/i.test(f)) continue; // investor presentations (no exhibits)
    if (h.class === 'results') { const r = parseResults(text, meta); if (r) results.push(r); else console.warn(`results: could not identify period in ${f}`); }
    else if (h.class === 'traffic') { const t = parseTraffic(text, meta); if (t) traffic.push(t); else console.warn(`traffic: could not identify month in ${f}`); }
  }
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
    for (const [id, parts] of Object.entries(r.quarters)) { for (const part of ['is', 'cf', 'kpi']) put(quarters, id, part, parts[part], src, id === r.id); if (parts.trafficQ) put(quarters, id, 'trafficQ', parts.trafficQ, src, id === r.id); }
    for (const [id, vals] of Object.entries(r.bs)) put(bsByQ, id, 'bs', vals, src, id === r.id);
    for (const [id, parts] of Object.entries(r.ytd)) for (const part of ['is', 'cf', 'kpi']) put(ytd, id, part, parts[part], src, id === `${r.fy}M${r.q * 3}`);
    if (r.id in quarters) { quarters[r.id].fxEop = r.fxEop || null; if (r.debt) quarters[r.id].debt = r.debt; }
    if (r.warnings.length) console.warn(`${r.id} (${r.source.file}): ${r.warnings.join(' ; ')}`);
  }
  for (const [id, e] of Object.entries(bsByQ)) { const qq = (quarters[id] ??= { id, parts: {}, sources: {} }); qq.parts.bs = e.parts.bs; qq.sources.bs = e.sources.bs; }
  const finish = (e) => { const is = e.parts.is, cf = e.parts.cf; if (cf && cf.capex == null && (cf.capexPpe != null || cf.capexConcessions != null)) cf.capex = (cf.capexPpe || 0) + (cf.capexConcessions || 0); if (is && is.revExConstruction == null && is.revAero != null && is.revNonAero != null) is.revExConstruction = is.revAero + is.revNonAero; if (is && is.ebitda != null && is.revExConstruction) is.ebitdaMarginExIfric = +(100 * is.ebitda / is.revExConstruction).toFixed(1); if (is && is.ebitdaReported != null && is.revTotal) is.ebitdaMarginReported = +(100 * is.ebitdaReported / is.revTotal).toFixed(1); if (is && is.opIncome != null && is.revTotal) is.opMargin = +(100 * is.opIncome / is.revTotal).toFixed(1); };
  for (const e of Object.values(quarters)) finish(e);
  for (const e of Object.values(ytd)) finish(e);
  // MDP and strategic investments: the quarterly figure is primary; the YTD column is recomputed as the sum of the
  // quarters when the printed YTD equals the prior full year (the 2Q26 summary table repeats the 2024/2025 annual amounts in its 6M columns).
  for (const [id, e] of Object.entries(ytd)) {
    const fy = +id.slice(0, 4), n = +id.split('M')[1] / 3; if (!e.parts.kpi) continue;
    const qs = Array.from({ length: n }, (_, i) => quarters[`${fy}Q${i + 1}`]?.parts.kpi?.capexMdpM);
    const prevFy = ytd[`${fy - 1}M12`]?.parts.kpi?.capexMdpM;
    if (n < 4 && qs.every((v) => v != null) && prevFy != null && e.parts.kpi.capexMdpM != null && Math.abs(e.parts.kpi.capexMdpM - prevFy) < 1) { const sum = +qs.reduce((a, b) => a + b, 0).toFixed(1); console.warn(`${id}: MDP investments YTD ${e.parts.kpi.capexMdpM} equals the prior full year; replaced by the sum of quarters ${sum}`); e.parts.kpi.capexMdpM = sum; }
  }
  // the cash balance at the end of the period is the same for a quarter and the YTD ending with it
  for (const [id, e] of Object.entries(ytd)) { const qq = quarters[`${id.slice(0, 4)}Q${+id.split('M')[1] / 3}`]; const a = e.parts.cf, b = qq?.parts.cf; if (a && b) { if (a.cashEnd == null && b.cashEnd != null) a.cashEnd = b.cashEnd; if (b.cashEnd == null && a.cashEnd != null) b.cashEnd = a.cashEnd; } }
  const qList = Object.values(quarters).filter((e) => e.parts.is || e.parts.bs).sort((a, b) => a.id.localeCompare(b.id)).map((e) => ({
    id: e.id, fy: +e.id.slice(0, 4), q: +e.id.slice(5), label: `${e.id.slice(5)}Q${e.id.slice(2, 4)}`,
    is: e.parts.is || null, bs: e.parts.bs || null, cf: e.parts.cf || null, kpi: e.parts.kpi || null, trafficQ: e.parts.trafficQ || null, debt: e.debt || null,
    shares: e.parts.kpi && e.parts.kpi.sharesWeighted ? { current: e.parts.kpi.sharesWeighted, note: 'weighted average shares outstanding (income statement)' } : null,
    fxEop: e.fxEop || null, fxAvg: null, sources: e.sources,
  }));
  const ytdList = Object.values(ytd).sort((a, b) => a.id.localeCompare(b.id)).map((e) => ({ id: e.id, fy: +e.id.slice(0, 4), months: +e.id.split('M')[1], is: e.parts.is || null, cf: e.parts.cf || null, kpi: e.parts.kpi || null, sources: e.sources }));
  const years = ytdList.filter((y) => y.months === 12).map((y) => { const q4 = qList.find((x) => x.id === `${y.fy}Q4`); return { id: `FY${y.fy}`, fy: y.fy, is: y.is, cf: y.cf, kpi: y.kpi, bs: q4?.bs || null, sources: { ...y.sources, bs: q4?.sources?.bs } }; });
  const fin = {
    generatedAt: new Date().toISOString(), currency: 'MXN', units: 'thousands',
    unitsNote: "Statements in thousands of pesos as printed by OMA; passengers in thousands; per-share in pesos / US$; margins in %. `ebitda` = OMA's Adjusted EBITDA; `ebitdaReported` = EBITDA as reported.",
    layout: { is: IS_ROWS.map(({ re, ...d }) => d), bs: BS_ROWS.map(({ re, ...d }) => d), cf: CF_ROWS.map(({ re, ...d }) => d), kpi: KPI_ROWS.map(({ re, pax, ...d }) => d) },
    quarters: qList, ytd: ytdList, years,
    coverage: { quarters: [qList[0]?.id, qList.at(-1)?.id], years: [years[0]?.id, years.at(-1)?.id], releasesParsed: results.length },
  };
  const finChanged = await writeData(OUT('financials.js'), 'OMA_FIN', fin, GEN);
  console.log(`financials.js${finChanged ? '' : ' (unchanged)'}: ${qList.length} quarters (${fin.coverage.quarters.join(' → ')}), ${ytdList.length} YTD, ${years.length} fiscal years from ${results.length} PDF releases`);
  // ---- traffic
  const byMonth = {};
  for (const t of traffic.sort((a, b) => a.source.date.localeCompare(b.source.date))) {
    if (!Object.keys(t.total).length) { console.warn(`traffic ${t.ym}: no rows (${t.source.file})`); continue; }
    byMonth[t.ym] = { ym: t.ym, dom: t.dom, intl: t.intl, total: t.total, source: { url: t.source.url, date: t.source.date } };
    if (t.warnings.length) console.warn(`traffic ${t.ym}: ${t.warnings.join(' ; ')}`);
  }
  const nAirports = (m) => Object.keys(m.total).filter((c) => c !== 'TOTAL').length;
  for (const t of traffic) {
    const [y, mo] = t.ym.split('-').map(Number); const prevYm = `${y - 1}-${String(mo).padStart(2, '0')}`;
    if (Object.keys(t.prior.total).length < 12) continue;
    const note = "prior-year comparative column of the following year's release";
    if (!byMonth[prevYm]) byMonth[prevYm] = { ym: prevYm, dom: t.prior.dom, intl: t.prior.intl, total: t.prior.total, source: { url: t.source.url, date: t.source.date, note } };
    else if (nAirports(byMonth[prevYm]) < 10) { const m = byMonth[prevYm]; for (const k of ['dom', 'intl', 'total']) m[k] = { ...t.prior[k], ...m[k] }; m.source.note = `airports from the ${note} (${t.source.url})`; }
  }
  // a month whose release could not be read (e.g. a PDF with an unreadable font) = quarter (results release) − the other two months
  const ymOf = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
  const allYm = Object.keys(byMonth).sort(); const [y0, m0] = allYm[0].split('-').map(Number), [y1, m1] = allYm.at(-1).split('-').map(Number);
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
    const ym = ymOf(y, m); if (byMonth[ym]) continue;
    const qn = Math.ceil(m / 3), qe = quarters[`${y}Q${qn}`], tq = qe?.parts.trafficQ; if (!tq) continue;
    const others = [1, 2, 3].map((k) => (qn - 1) * 3 + k).filter((k) => k !== m).map((k) => byMonth[ymOf(y, k)]); if (others.some((o) => !o)) continue;
    const derived = { ym, dom: {}, intl: {}, total: {}, source: { url: qe.sources?.trafficQ?.url, date: qe.sources?.trafficQ?.date, note: `derived: ${y}Q${qn} traffic by airport (results release) less ${others.map((o) => o.ym).join(' and ')}` } };
    for (const k of ['dom', 'intl', 'total']) for (const [code, v] of Object.entries(tq[k] || {})) { const o = others.map((x) => x[k][code]); if (o.every((x) => x != null)) derived[k][code] = +(v - o[0] - o[1]).toFixed(3); }
    if (nAirports(derived) >= 12) { byMonth[ym] = derived; console.warn(`traffic ${ym}: derived from ${y}Q${qn} less the other two months`); }
  }
  const months = Object.values(byMonth).sort((a, b) => a.ym.localeCompare(b.ym));
  const tr = { generatedAt: new Date().toISOString(), units: 'thousands of terminal passengers', airports: AIRPORTS, months, coverage: [months[0]?.ym, months.at(-1)?.ym], note: 'Terminal passengers (commercial, charter and general aviation), excluding transit passengers, as reported monthly by OMA. Persons converted to thousands.' };
  const trChanged = await writeData(OUT('traffic.js'), 'OMA_TRAFFIC', tr, GEN);
  console.log(`traffic.js${trChanged ? '' : ' (unchanged)'}: ${months.length} months (${tr.coverage.join(' → ')})`);
  const gd = { generatedAt: new Date().toISOString(), basis: 'OMA does not publish a formal annual guidance table; it discloses the five-year Master Development Program (MDP) investment commitments and qualitative outlook on the earnings calls.', metrics: [], vintages: [] };
  const gdChanged = await writeData(OUT('guidance.js'), 'OMA_GUIDANCE', gd, GEN);
  console.log(`guidance.js${gdChanged ? '' : ' (unchanged)'}: ${gd.vintages.length} vintages`);
}
main().catch((e) => { console.error(e); process.exit(1); });
