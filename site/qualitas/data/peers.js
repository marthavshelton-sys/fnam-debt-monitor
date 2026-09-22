// Peer multiples for the relative-valuation section.
// PLACEHOLDER: populated by the FactSet connector once it is authorised for this workspace (same contract
// as site/gap/data/peers.js). Until then every peer value is null and the page shows the schema with a
// "pending" notice. Quálitas' own row is computed live in the page from market.js + financials.js.
//
// Field contract (one object per peer; currency = trading currency; multiples dimensionless):
//   ticker, name, exchange, currency, asOf, price, mktCapUsdM,
//   peLtm, peNtm, pbv, divYieldPct, roePct, combinedRatioPct, premiumGrowthPct
window.Q_PEERS = {
  updatedAt: null,
  source: "FactSet (pending authorisation)",
  peers: [
    { ticker: "PGR-US", name: "Progressive", exchange: "NYSE", currency: "USD", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, combinedRatioPct: null, premiumGrowthPct: null },
    { ticker: "ALL-US", name: "Allstate", exchange: "NYSE", currency: "USD", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, combinedRatioPct: null, premiumGrowthPct: null },
    { ticker: "PSSA3-BR", name: "Porto Seguro", exchange: "B3", currency: "BRL", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, combinedRatioPct: null, premiumGrowthPct: null },
    { ticker: "MAP-ES", name: "Mapfre", exchange: "BME", currency: "EUR", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, combinedRatioPct: null, premiumGrowthPct: null },
    { ticker: "ADM-GB", name: "Admiral Group", exchange: "LSE", currency: "GBP", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, combinedRatioPct: null, premiumGrowthPct: null },
    { ticker: "GNP-MX", name: "Grupo Nacional Provincial (illiquid)", exchange: "BMV", currency: "MXN", asOf: null, price: null, mktCapUsdM: null, peLtm: null, peNtm: null, pbv: null, divYieldPct: null, roePct: null, combinedRatioPct: null, premiumGrowthPct: null },
  ],
};
