// Peer multiples for the relative-valuation section.
// PLACEHOLDER: populated by the FactSet connector (FactSet AI-Ready Data MCP) once it is authorised
// for this workspace. Until then every peer value is null and the page shows the schema with a
// "pending FactSet" notice. GAP's own row is computed live in the page from market.js + financials.js.
//
// Field contract (one object per peer; currency = trading currency; multiples dimensionless):
//   ticker, name, exchange, currency, asOf,
//   price, mktCapUsdM, evUsdM,
//   evEbitdaLtm, evEbitdaNtm, peLtm, peNtm, evSalesLtm, divYieldPct, netDebtEbitda, ebitdaMarginPct
// FactSet formulas to map (FQL/Formula API):  FF_EV_EBITDA_LTM? → evEbitdaLtm, FG_PE(NTM) → peNtm, etc.
window.GAP_PEERS = {
  updatedAt: null,
  source: "FactSet (pending authorisation)",
  peers: [
    { ticker: "ASURB-MX", name: "Grupo Aeroportuario del Sureste (ASUR)", exchange: "BMV", currency: "MXN", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null },
    { ticker: "OMAB-MX", name: "Grupo Aeroportuario Centro Norte (OMA)", exchange: "BMV", currency: "MXN", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null },
    { ticker: "AENA-ES", name: "Aena", exchange: "BME", currency: "EUR", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null },
    { ticker: "FRA-DE", name: "Fraport", exchange: "XETRA", currency: "EUR", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null },
    { ticker: "FHZN-CH", name: "Flughafen Zürich", exchange: "SIX", currency: "CHF", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null },
    { ticker: "AIA-NZ", name: "Auckland International Airport", exchange: "NZX", currency: "NZD", asOf: null, price: null, mktCapUsdM: null, evUsdM: null, evEbitdaLtm: null, evEbitdaNtm: null, peLtm: null, peNtm: null, evSalesLtm: null, divYieldPct: null, netDebtEbitda: null, ebitdaMarginPct: null },
  ],
};
