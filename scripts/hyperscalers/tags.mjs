// XBRL tag map of the Hyperscaler Hub. Each metric lists candidate us-gaap tags in priority order; for every period
// the builder uses the first tag that has a value for that exact period and records which one it used, so a
// company that changes tags mid-history is still read correctly and the page shows the tag behind each figure.
// Instant metrics may use recipes: the sum of required tags (+ optional tags when present) for the same date.
//
// kind: flow (duration; quarters derived from year-to-date by subtraction) | instant (balance at period end)
// sign: +1 keeps the reported sign; the cash-flow outflow tags (capex, repayments, buybacks) are reported positive.
export const TAGS = {
  capex_cash: { kind: 'flow', tags: ['us-gaap:PaymentsToAcquirePropertyPlantAndEquipment', 'us-gaap:PaymentsToAcquireProductiveAssets'], en: 'Cash capex (purchases of property and equipment)', es: 'Capex en efectivo (compras de propiedades y equipo)' },
  fl_additions: { kind: 'flow', tags: ['us-gaap:RightOfUseAssetObtainedInExchangeForFinanceLeaseLiability'], en: 'Assets acquired under finance leases (non-cash)', es: 'Activos adquiridos mediante arrendamiento financiero (no monetario)' },
  ol_additions: { kind: 'flow', tags: ['us-gaap:RightOfUseAssetObtainedInExchangeForOperatingLeaseLiability'], en: 'Right-of-use assets obtained for new operating leases (non-cash)', es: 'Activos por derecho de uso obtenidos por nuevos arrendamientos operativos (no monetario)' },
  fl_principal: { kind: 'flow', tags: ['us-gaap:FinanceLeasePrincipalPayments'], en: 'Principal payments on finance leases', es: 'Pagos de principal de arrendamientos financieros' },
  revenue: { kind: 'flow', tags: ['us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax', 'us-gaap:Revenues'], en: 'Revenue', es: 'Ingresos' },
  ocf: { kind: 'flow', tags: ['us-gaap:NetCashProvidedByUsedInOperatingActivities'], en: 'Operating cash flow', es: 'Flujo de efectivo de operación' },
  op_income: { kind: 'flow', tags: ['us-gaap:OperatingIncomeLoss'], en: 'Operating income', es: 'Utilidad de operación' },
  da: { kind: 'flow', tags: ['us-gaap:DepreciationDepletionAndAmortization', 'us-gaap:DepreciationAmortizationAndAccretionNet', 'us-gaap:DepreciationAndAmortization', 'us-gaap:Depreciation'], en: 'Depreciation and amortization (cash-flow statement)', es: 'Depreciación y amortización (estado de flujos)' },
  interest_exp: { kind: 'flow', tags: ['us-gaap:InterestExpense', 'us-gaap:InterestExpenseNonoperating', 'us-gaap:InterestExpenseDebt'], en: 'Interest expense (as reported, net of capitalized interest)', es: 'Gasto por intereses (reportado, neto de intereses capitalizados)' },
  interest_cap: { kind: 'flow', tags: ['us-gaap:InterestCostsCapitalized', 'us-gaap:InterestCostsCapitalizedAdjustment'], en: 'Interest capitalized into construction', es: 'Intereses capitalizados en construcción' },
  // candidates added 2026-10-03 after a scan of the companies' full companyfacts (owner's third review): Microsoft tags
  // debt by maturity bucket (…MaturingInMoreThanThreeMonths), Alphabet repayments incl. capital leases; the convertible,
  // medium-term and secured candidates are kept so a new issuer type is read without a tag-map change; Alphabet re-tagged
  // dividends in 2026 (ordinary dividends)
  debt_proceeds: { kind: 'flow', tags: ['us-gaap:ProceedsFromIssuanceOfLongTermDebt', 'us-gaap:ProceedsFromIssuanceOfSeniorLongTermDebt', 'us-gaap:ProceedsFromIssuanceOfDebt', 'us-gaap:ProceedsFromDebtNetOfIssuanceCosts', 'us-gaap:ProceedsFromIssuanceOfMediumTermNotes', 'us-gaap:ProceedsFromIssuanceOfSecuredDebt', 'us-gaap:ProceedsFromDebtMaturingInMoreThanThreeMonths', 'us-gaap:ProceedsFromConvertibleDebt'], en: 'Proceeds from debt issued', es: 'Recursos por emisión de deuda' },
  debt_repaid: { kind: 'flow', tags: ['us-gaap:RepaymentsOfLongTermDebt', 'us-gaap:RepaymentsOfDebt', 'us-gaap:RepaymentsOfSeniorDebt', 'us-gaap:RepaymentsOfDebtMaturingInMoreThanThreeMonths', 'us-gaap:RepaymentsOfDebtAndCapitalLeaseObligations', 'us-gaap:RepaymentsOfMediumTermNotes', 'us-gaap:RepaymentsOfConvertibleDebt'], en: 'Repayments of debt', es: 'Pagos de deuda' },
  cp_net: { kind: 'flow', tags: ['us-gaap:ProceedsFromRepaymentsOfCommercialPaper', 'us-gaap:ProceedsFromRepaymentsOfShortTermDebtMaturingInThreeMonthsOrLess'], en: 'Commercial paper, net', es: 'Papel comercial, neto' },
  equity_proceeds: { kind: 'flow', tags: ['us-gaap:ProceedsFromIssuanceOfCommonStock'], en: 'Proceeds from common stock issued (as tagged)', es: 'Recursos por emisión de acciones comunes (según etiqueta)' },
  pref_proceeds: { kind: 'flow', tags: ['us-gaap:ProceedsFromIssuanceOfConvertiblePreferredStock', 'us-gaap:ProceedsFromIssuanceOfPreferredStockAndPreferenceStock', 'us-gaap:ProceedsFromIssuanceOfRedeemablePreferredStock'], en: 'Proceeds from preferred stock issued (as tagged)', es: 'Recursos por emisión de acciones preferentes (según etiqueta)' },
  buybacks: { kind: 'flow', tags: ['us-gaap:PaymentsForRepurchaseOfCommonStock', 'us-gaap:PaymentsForRepurchaseOfEquity'], en: 'Share repurchases', es: 'Recompra de acciones' },
  interest_paid: { kind: 'flow', tags: ['us-gaap:InterestPaidNet', 'us-gaap:InterestPaid'], en: 'Interest paid, net of capitalized interest (cash-flow supplement)', es: 'Intereses pagados, netos de capitalizados (complemento de flujos)' },
  dividends: { kind: 'flow', tags: ['us-gaap:PaymentsOfDividends', 'us-gaap:PaymentsOfDividendsCommonStock', 'us-gaap:PaymentsOfOrdinaryDividends'], en: 'Dividends paid', es: 'Dividendos pagados' },

  cash: { kind: 'instant', recipes: [
    { req: ['us-gaap:CashAndCashEquivalentsAtCarryingValue'], opt: ['us-gaap:MarketableSecuritiesCurrent', 'us-gaap:ShortTermInvestments', 'us-gaap:AvailableForSaleSecuritiesDebtSecuritiesCurrent'] },
    { req: ['us-gaap:CashAndCashEquivalentsAtCarryingValueIncludingDiscontinuedOperations'], opt: ['us-gaap:ShortTermInvestments'] },
  ], en: 'Cash, equivalents and short-term investments', es: 'Efectivo, equivalentes e inversiones de corto plazo' },
  debt: { kind: 'instant', recipes: [
    { req: ['us-gaap:DebtLongtermAndShorttermCombinedAmount'] },
    { req: ['us-gaap:LongTermDebt'], opt: ['us-gaap:CommercialPaper', 'us-gaap:ShortTermBorrowings'] },
    { req: ['us-gaap:LongTermNotesAndLoans', 'us-gaap:NotesPayableCurrent'] },
    { req: ['us-gaap:LongTermDebtNoncurrent'], opt: ['us-gaap:LongTermDebtCurrent', 'us-gaap:DebtCurrent', 'us-gaap:CommercialPaper', 'us-gaap:ShortTermBorrowings'] },
    { req: ['us-gaap:LongTermNotesPayable'], opt: ['us-gaap:NotesPayableCurrent', 'us-gaap:ConvertibleNotesPayable'] },
    { req: ['us-gaap:ConvertibleNotesPayable'] },
    { req: ['us-gaap:ConvertibleLongTermNotesPayable'], opt: ['us-gaap:ConvertibleNotesPayableCurrent'] },
    // last resort: the debt note's total of instruments (principal before discounts), labelled by its tag on the page
    { req: ['us-gaap:DebtInstrumentCarryingAmount'] },
  ], en: 'Total debt (carrying amount)', es: 'Deuda total (valor en libros)' },
  ol_liab: { kind: 'instant', recipes: [{ req: ['us-gaap:OperatingLeaseLiability'] }, { req: ['us-gaap:OperatingLeaseLiabilityNoncurrent'], opt: ['us-gaap:OperatingLeaseLiabilityCurrent'] }], en: 'Operating lease liabilities', es: 'Pasivos por arrendamiento operativo' },
  fl_liab: { kind: 'instant', recipes: [{ req: ['us-gaap:FinanceLeaseLiability'] }, { req: ['us-gaap:FinanceLeaseLiabilityNoncurrent'], opt: ['us-gaap:FinanceLeaseLiabilityCurrent'] }], en: 'Finance lease liabilities', es: 'Pasivos por arrendamiento financiero' },
  // undiscounted lease payments of leases already recognized (the maturity table's total before the interest that brings
  // it to present value): the like-for-like comparator of leases signed but not yet commenced, which are undiscounted
  ol_pay_due: { kind: 'instant', recipes: [{ req: ['us-gaap:LesseeOperatingLeaseLiabilityPaymentsDue'] }], en: 'Operating lease payments due, undiscounted (maturity table)', es: 'Pagos de arrendamientos operativos por vencer, sin descontar (tabla de vencimientos)' },
  fl_pay_due: { kind: 'instant', recipes: [{ req: ['us-gaap:FinanceLeaseLiabilityPaymentsDue'] }], en: 'Finance lease payments due, undiscounted (maturity table)', es: 'Pagos de arrendamientos financieros por vencer, sin descontar (tabla de vencimientos)' },
  rpo: { kind: 'instant', recipes: [{ req: ['us-gaap:RevenueRemainingPerformanceObligation'] }], en: 'Remaining performance obligations (RPO)', es: 'Obligaciones de desempeño pendientes (RPO)' },
  purchase_oblig: { kind: 'instant', recipes: [{ req: ['us-gaap:UnrecordedUnconditionalPurchaseObligationBalanceSheetAmount'] }, { req: ['us-gaap:PurchaseObligation'] }], en: 'Unrecorded purchase obligations', es: 'Obligaciones de compra no registradas' },
  vie_max_loss: { kind: 'instant', recipes: [{ req: ['us-gaap:VariableInterestEntityEntityMaximumLossExposureAmount'] }, { req: ['us-gaap:VariableInterestEntityReportingEntityInvolvementMaximumLossExposureAmount'] }], en: 'Unconsolidated VIEs: maximum exposure to loss', es: 'EIV no consolidadas: exposición máxima a pérdida' },
  guarantees_max: { kind: 'instant', recipes: [{ req: ['us-gaap:GuaranteeObligationsMaximumExposure'] }], en: 'Guarantees: maximum potential payments', es: 'Garantías: pagos potenciales máximos' },
  equity_method: { kind: 'instant', recipes: [{ req: ['us-gaap:EquityMethodInvestments'] }], en: 'Equity-method investments', es: 'Inversiones por método de participación' },
  nci_vie: { kind: 'instant', recipes: [{ req: ['us-gaap:NoncontrollingInterestInVariableInterestEntity'] }], en: 'Noncontrolling interest in consolidated VIEs', es: 'Participación no controladora en EIV consolidadas' },
  ppe_net: { kind: 'instant', recipes: [{ req: ['us-gaap:PropertyPlantAndEquipmentNet'] }, { req: ['us-gaap:PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization'] }], en: 'Property and equipment, net', es: 'Propiedades y equipo, neto' },
};

// Metrics whose quarterly value is meaningful only as reported in a 10-Q/10-K (no 20-F quarters).
export const FLOW = Object.entries(TAGS).filter(([, m]) => m.kind === 'flow').map(([k]) => k);
export const INSTANT = Object.entries(TAGS).filter(([, m]) => m.kind === 'instant').map(([k]) => k);
