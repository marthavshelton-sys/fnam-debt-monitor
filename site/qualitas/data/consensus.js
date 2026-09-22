// Sell-side consensus for Quálitas (Q*), shown next to management's expectations in section 02.
// PLACEHOLDER: the data contract is fixed; values are null until a market-data connector (FactSet, Bloomberg
// or LSEG) is authorised for this workspace. The page renders the schema with a "pending" notice.
//
// Field contract (one object per fiscal year; MXN millions unless stated):
//   fy                 fiscal year
//   writtenMxnM        consensus written premiums (mean)          writtenGrowthPct  implied growth vs prior FY
//   netIncomeMxnM      consensus net income (mean)                eps               consensus EPS (Ps.)
//   lossRatioPct       consensus loss ratio                       combinedPct       consensus combined ratio
//   roePct             consensus ROE                              dpsMxn            consensus dividend per share
//   nAnalysts          number of estimates
// targetPrice: { mean, high, low, nAnalysts, asOf }, ratings: { buy, hold, sell }
// Every refresh must set updatedAt (ISO date) and source (vendor + screen or field names).
window.Q_CONSENSUS = {
  updatedAt: null,
  source: "Consensus connector pending authorisation (FactSet / Bloomberg / LSEG)",
  currency: "MXN",
  years: [
    { fy: 2026, writtenMxnM: null, writtenGrowthPct: null, netIncomeMxnM: null, eps: null, lossRatioPct: null, combinedPct: null, roePct: null, dpsMxn: null, nAnalysts: null },
    { fy: 2027, writtenMxnM: null, writtenGrowthPct: null, netIncomeMxnM: null, eps: null, lossRatioPct: null, combinedPct: null, roePct: null, dpsMxn: null, nAnalysts: null },
  ],
  targetPrice: { mean: null, high: null, low: null, nAnalysts: null, asOf: null },
  ratings: { buy: null, hold: null, sell: null },
  // Public broker views recorded from Quálitas' material-event releases (not a consensus): see reference.js → analysts.
  note: { es: "Sin conector autorizado el consenso no se muestra; la única referencia pública es la nota de inicio de cobertura de Citi (junio 2026) registrada en reference.js.", en: "Without an authorised connector no consensus is shown; the only public reference is Citi's initiation note (June 2026) recorded in reference.js." },
};
