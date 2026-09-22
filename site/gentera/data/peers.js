// Peer multiples and sell-side consensus for the relative-valuation section.
// PLACEHOLDER: populated by the FactSet connector once it is authorised for this workspace (same contract as
// site/gap/data/peers.js and site/qualitas/data/peers.js). Until then every peer value is null and the page
// shows the schema with a "pending" notice. Gentera's own row is computed live from market.js + financials.js.
// The share prices of these placeholder peers are already pulled daily by fetch-market.mjs for the rebased chart.
//
// Field contract (one object per peer; currency = trading currency; multiples dimensionless):
//   ticker, name, exchange, currency, asOf, price, mktCapUsdM, peLtm, peNtm, pbv, divYieldPct, roePct,
//   nplPct (stage-3 / NPL ratio), loanGrowthPct
// Consensus contract (Gentera): asOf, epsFY1, epsFY2, bvpsFY1, dpsFY1, netIncomeFY1MxnM, loanGrowthFY1Pct,
//   targetPrice, rating, nAnalysts — rendered next to management guidance in section 02.
window.G_PEERS = {
  updatedAt: null,
  source: "FactSet (pending authorisation)",
  peers: [
    { ticker: "GFNORTEO-MX", name: "Grupo Financiero Banorte", exchange: "BMV", currency: "MXN", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, nplPct: null, loanGrowthPct: null },
    { ticker: "RA-MX", name: "Regional (Banregio)", exchange: "BMV", currency: "MXN", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, nplPct: null, loanGrowthPct: null },
    { ticker: "BBAJIOO-MX", name: "Banco del Bajío", exchange: "BMV", currency: "MXN", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, nplPct: null, loanGrowthPct: null },
    { ticker: "BAP-US", name: "Credicorp (Mibanco)", exchange: "NYSE", currency: "USD", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, nplPct: null, loanGrowthPct: null },
  ],
  consensus: { asOf: null, epsFY1: null, epsFY2: null, bvpsFY1: null, dpsFY1: null, netIncomeFY1MxnM: null, loanGrowthFY1Pct: null, targetPrice: null, rating: null, nAnalysts: null },
};
