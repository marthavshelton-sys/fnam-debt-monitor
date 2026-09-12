// Hand-curated, slow-moving facts for the GAP model. Every block carries its source.
// Update by PR when a shareholders' meeting, a corporate transaction or a tariff/MDP review changes
// something (see tools/gap/README.md "Reference data"). Numbers here are NEVER derived from the
// auto-parsed statements; those live in financials.js / traffic.js / market.js.
window.GAP_REF = {
  updatedAt: "2026-09-12",
  company: {
    name: "Grupo Aeroportuario del Pacífico, S.A.B. de C.V.",
    short: "GAP",
    tickers: { bmv: "GAP (serie B)", nyse: "PAC (ADS)" },
    adsRatio: 10,                       // 1 ADS = 10 Series B shares
    fiscalYearEnd: "12-31",
    reportingCurrency: "MXN",
    accounting: "IFRS (IFRIC 12 service-concession accounting: construction of concession assets is booked as revenue and cost at zero margin)",
    ir: "https://www.aeropuertosgap.com.mx/en/investors",
  },
  // Shares outstanding after the CBX / AMP business combination (merger notarised 30-Apr-2026,
  // effective 1-May-2026). Source: GAP release 7-May-2026 "Completion of Business Combination
  // Process of CBX and the Provision of Technical Assistance Services" (GlobeNewswire / Form 6-K).
  shares: {
    total: 595018195, seriesB: 519226576, seriesBB: 75791619,
    asOf: "2026-05-07",
    preMergerOutstanding: 505277464,       // = 595,018,195 − 89,740,731 net new shares
    newSharesIssuedCbx: 89740731,
    history: [
      { asOf: "2025-12-31", total: 505277464, note: "before the CBX/AMP merger" },
      { asOf: "2026-05-07", total: 595018195, note: "after issuing 89,740,731 net new shares" },
    ],
    holders: [
      { name: "Aena Desarrollo Internacional (ES)", pct: 6.55, shares: 38900000, note: "25.2 M serie BB + 13.7 M serie B; direct stake after AMP merged into GAP", source: "Aena notice to CNMV, 7-May-2026 (via Infobae / El Economista)" },
      { name: "Former AMP partners (CMA group)", pct: null, shares: null, note: "Remaining serie BB (≈50.6 M) plus serie B received in the merger — confirm in the 2026 20-F Item 7", source: "GAP 6-K 7-May-2026" },
      { name: "Float (serie B, BMV + NYSE ADS)", pct: null, note: "Balance", source: "" },
    ],
  },
  airports: [
    { code: "GDL", en: "Guadalajara", es: "Guadalajara", country: "MX", group: "metro" },
    { code: "TIJ", en: "Tijuana", es: "Tijuana", country: "MX", group: "metro" },
    { code: "SJD", en: "Los Cabos", es: "Los Cabos", country: "MX", group: "tourist" },
    { code: "PVR", en: "Puerto Vallarta", es: "Puerto Vallarta", country: "MX", group: "tourist" },
    { code: "BJX", en: "Bajío (León)", es: "Bajío (León)", country: "MX", group: "regional" },
    { code: "HMO", en: "Hermosillo", es: "Hermosillo", country: "MX", group: "regional" },
    { code: "MLM", en: "Morelia", es: "Morelia", country: "MX", group: "regional" },
    { code: "LAP", en: "La Paz", es: "La Paz", country: "MX", group: "tourist" },
    { code: "MXL", en: "Mexicali", es: "Mexicali", country: "MX", group: "regional" },
    { code: "AGU", en: "Aguascalientes", es: "Aguascalientes", country: "MX", group: "regional" },
    { code: "LMM", en: "Los Mochis", es: "Los Mochis", country: "MX", group: "regional" },
    { code: "ZLO", en: "Manzanillo", es: "Manzanillo", country: "MX", group: "tourist" },
    { code: "MBJ", en: "Montego Bay (Sangster)", es: "Montego Bay (Sangster)", country: "JM", group: "jamaica" },
    { code: "KIN", en: "Kingston (Norman Manley)", es: "Kingston (Norman Manley)", country: "JM", group: "jamaica" },
  ],
  concessions: [
    { scope: "12 Mexican airports", scopeEs: "12 aeropuertos en México", granted: "1998-11-01", expires: "2048-11-01", years: 50, note: "50-year concessions from the Mexican federal government (SICT/AFAC); extendable by up to 50 more years at the government's discretion.", source: "GAP Form 20-F, Item 4" },
    { scope: "Montego Bay (MBJ Airports Ltd, 74.5% GAP)", scopeEs: "Montego Bay (MBJ Airports Ltd, 74.5% GAP)", granted: "2003-04-01", expires: "2033-04-01", years: 30, note: "30-year concession from the Airports Authority of Jamaica; the Jamaican government opened early extension talks in 2025.", source: "GAP 20-F; Jamaica Gleaner 4-Jul-2025" },
    { scope: "Kingston (PAC Kingston Airport Ltd, 100% GAP)", scopeEs: "Kingston (PAC Kingston Airport Ltd, 100% GAP)", granted: "2019-10-10", expires: "2044-10-10", years: 25, note: "25-year concession signed Oct-2018 with a 12-month transition; operations started Oct-2019.", source: "GAP 20-F; Development Bank of Jamaica" },
  ],
  // Regulated-tariff cycle. Maximum tariffs (TM) per workload unit are set every 5 years by SICT/AFAC
  // together with the Master Development Program (PMD) capex commitment.
  regulation: {
    mdp: { period: "2025–2029", capexMxnBn: 52, note: "Approved Feb-2025: > Ps. 52 bn over five years; ≈50% more terminal capacity, +45% inspection points, +25% aprons, +20% airfield across the 12 Mexican airports. 2026 capex guidance > Ps. 13 bn.", source: "GAP release 12-Feb-2025; La Jornada 3-Feb-2026" },
    tua2026: { avgIncreasePct: 5, tijuanaPct: 2, note: "Average +5% TUA (passenger charge) increase in 2026, +2% in Tijuana.", source: "Milenio, Feb-2026 (CEO Raúl Revuelta)" },
  },
  // Dividends approved at the Annual General Meeting (AGM), Ps. per share, paid in instalments over the
  // following 12 months. Older years are shown from the exchange-recorded cash dividends in market.js
  // (Yahoo Finance) — cross-check against the 20-F Item 8 before quoting them.
  dividends: [
    { agmYear: 2025, agmDate: "2025-04-24", dps: 16.84, note: "Paid in two instalments (Jul-2025, Dec-2025).", source: "GAP release 24-Apr-2025 (AGM resolutions)" },
    { agmYear: 2026, agmDate: "2026-04-22", dps: 20.80, note: "Board proposal of Ps. 20.80 per share for the 22-Apr-2026 AGM (≈5% yield on the 9-Mar-2026 price of Ps. 415.73); confirm the approved amount in the AGM resolutions.", source: "GAP AGM call, Mar-2026 (Axis Negocios)" },
  ],
  // Debt instruments — long-term certificados bursátiles (local bonds) and bank facilities. Fill /
  // refresh from the "Debt" table of the latest quarterly report; principal in Ps. million.
  debt: {
    ratings: [
      { agency: "Moody's Local MX", rating: "Aaa.mx", outlook: "estable", scope: "national scale, CBs", source: "Moody's Local rating report 1-Apr-2026" },
      { agency: "S&P Global Ratings", rating: "mxAAA", outlook: "estable", scope: "national scale, CBs", source: "S&P, Mar-2026 (A21 17-Mar-2026)" },
    ],
    instruments: [
      { name: "GAP 26", type: "CB", issued: "2026-03-27", matures: "2029-03-27", principalMxn: 2767, rate: "TIIE + 45 pb (28 días)", source: "GAP release 1-Apr-2026" },
      { name: "GAP 26-2", type: "CB", issued: "2026-03-27", matures: "2036-03-27", principalMxn: 7951, rate: "9.87% fija (182 días)", source: "GAP release 1-Apr-2026" },
      { name: "Bank credit facilities (Ps. 8,000 M)", type: "loan", issued: "2026-09-11", matures: null, principalMxn: 8000, rate: "n/d", note: "Executed 11-Sep-2026 to refinance maturities and fund the PMD; terms in the 6-K.", source: "GAP release 11-Sep-2026" },
    ],
    instrumentsNote: "Outstanding older series (GAP 17, GAP 19, GAP 20, GAP 21, GAP 22, GAP 23, GAP 24, GAP 25 tranches) and the Jamaican USD facilities are listed in the quarterly report's debt table and the 20-F Item 5.B — complete this table from the latest report; GAP 23L (Ps. 1,120 M) was repaid at maturity in Mar-2026.",
  },
  cbx: {
    // Cross Border Xpress: the ground-side terminal in Otay Mesa (San Diego) linked to Tijuana airport
    // by a 120 m pedestrian bridge. Timeline and terms from GAP's releases (GlobeNewswire / Form 6-K).
    timeline: [
      { date: "2015-12-09", en: "CBX opens (Otay-Tijuana Venture LLC; investors incl. PAP Corp and Equity Group Investments).", es: "Abre CBX (Otay-Tijuana Venture LLC; inversionistas como PAP Corp y Equity Group Investments)." },
      { date: "2025-11-03", en: "GAP's board proposes combining (i) the technical-assistance & technology-transfer business provided by strategic partner AMP since 1999 and (ii) CBX: 75% of CBX via merger paid with ≈90 M new serie B shares; remaining 25% for US$487.5 M cash.", es: "El consejo de GAP propone combinar (i) el negocio de asistencia técnica y transferencia de tecnología que el socio estratégico AMP prestaba desde 1999 y (ii) CBX: 75% de CBX vía fusión pagada con ≈90 M de nuevas acciones serie B; el 25% restante por US$487.5 M en efectivo." },
      { date: "2025-12-11", en: "Extraordinary shareholders' meeting approves the combination (~96% of votes cast; 88.1% quorum).", es: "La asamblea extraordinaria aprueba la combinación (~96% de los votos; quórum de 88.1%)." },
      { date: "2026-03-27", en: "Ps. 10,718 M of certificados bursátiles (GAP 26 / GAP 26-2) issued, 1.74× oversubscribed, to fund the 25% cash purchase and PMD capex.", es: "Emisión de Ps. 10,718 M en certificados bursátiles (GAP 26 / GAP 26-2), 1.74× sobresuscrita, para financiar la compra del 25% en efectivo y el capex del PMD." },
      { date: "2026-04-30", en: "Merger agreement notarised; AMP and the intermediate CBX holding entities merge into GAP. Effective 1-May-2026.", es: "Se protocoliza el convenio de fusión; AMP y las tenedoras intermedias de CBX se fusionan en GAP. Efectiva el 1-May-2026." },
      { date: "2026-05-07", en: "Completion: 89,740,731 net new shares issued (595,018,195 total); remaining 25% of CBX purchased; GAP owns 100% of CBX and no longer pays the technical-assistance fee. Aena becomes a direct 6.55% holder.", es: "Cierre: se emiten 89,740,731 acciones netas nuevas (595,018,195 en total); se compra el 25% restante de CBX; GAP posee 100% de CBX y deja de pagar la cuota de asistencia técnica. Aena pasa a tener 6.55% directo." },
      { date: "2026-07-14", en: "2Q26 results are the first to consolidate CBX (two months) — revenue +3.7%, EBITDA +8.4%, net income +9.0% y/y.", es: "Los resultados del 2T26 son los primeros que consolidan CBX (dos meses): ingresos +3.7%, EBITDA +8.4%, utilidad neta +9.0% a/a." },
    ],
    facts: [
      { k: "newShares", label_en: "Net new shares issued", label_es: "Acciones netas emitidas", v: 89740731, fmt: "int" },
      { k: "cash25", label_en: "Cash for the remaining 25%", label_es: "Efectivo por el 25% restante", v: 487.5, fmt: "usdM" },
      { k: "sharesAfter", label_en: "Shares outstanding after", label_es: "Acciones en circulación después", v: 595018195, fmt: "int" },
      { k: "dilution", label_en: "Dilution to pre-deal holders", label_es: "Dilución para accionistas previos", v: 89740731 / 595018195, fmt: "pct" },
      { k: "cbxEbitda2024", label_en: "CBX EBITDA 2024 (press estimate)", label_es: "EBITDA de CBX 2024 (estimación de prensa)", v: 93.6, fmt: "usdM", source: "San Diego Business Journal" },
      { k: "tijPax2025", label_en: "Tijuana passengers 2025", label_es: "Pasajeros de Tijuana 2025", v: 13.0, fmt: "M", source: "SDBJ; GAP traffic reports" },
    ],
    sources: [
      "GAP, 'Business combination of CBX and technical assistance services' — 3-Nov-2025 (6-K)",
      "GAP, 'Shareholder approval …' — 11-Dec-2025 (6-K)",
      "GAP, 'Issuance of bond certificates for Ps. 10,718.0 million' — 1-Apr-2026 (6-K)",
      "GAP, 'Completion of business combination process of CBX …' — 7-May-2026 (6-K)",
      "Aena, notice to CNMV — 7-May-2026 (Infobae, El Economista)",
      "San Diego Business Journal, 'Cross Border Xpress has $100M growth agenda' (2025)",
    ],
  },
  fibra: {
    name: "FIBRA GAP (Fibra E)",
    ticker: "FGAP 26",
    exchange: "BIVA (Bolsa Institucional de Valores)",
    targetMxnM: 10195,
    certificates: 101950000,
    priceMxn: 100,
    stakePct: 4.2,
    status_en: "Announced May-2026; first placement targeted for 25-Jun-2026, then guided to 3Q26 while authorisations completed. As of 12-Sep-2026 no completion notice had been located — verify in GAP's material events before quoting it as closed.",
    status_es: "Anunciada en mayo de 2026; primera colocación prevista para el 25-Jun-2026 y después guiada al 3T26 mientras concluían las autorizaciones. Al 12-Sep-2026 no se localizó aviso de cierre: verificar en los eventos relevantes de GAP antes de darla por colocada.",
    sources: [
      "GAP, material event on the constitution of FIBRA GAP — BMV eventemi 1558742 (May-2026)",
      "El Universal, 'GAP inicia proceso para crear fideicomiso; prevé inversiones por 40 mil mdp'",
      "El Cronista / Axis Negocios / El CEO, coverage of the FGAP 26 offering (Jun–Jul 2026)",
    ],
  },
  // Default DCF assumptions (editable in the page). Rates in %, money in Ps. million.
  dcf: {
    horizonYears: 5,
    terminalMethod: "annuity",        // annuity to concession end | perpetuity | exit multiple
    concessionEnd: 2048,
    trafficGrowthPct: [2.0, 4.0, 4.0, 3.5, 3.5],   // 2027e–2031e; 2026 guidance −3% to 0% (World Cup base, Jamaica)
    revPerPaxGrowthPct: 6.0,          // maximum-tariff path 2025-29 + inflation + commercial yield (LTM: +11%)
    ebitdaMarginPct: null,            // null = latest LTM margin (ex-IFRIC 12)
    capexMxnM: [12000, 10000, 8000, 7000, 7000],   // PMD 2025-29 (> Ps. 52 bn) tapering after 2029; 2026 guidance Ps. 12 bn
    daPctRevenue: null,               // null = LTM D&A / revenue
    taxRatePct: 30,
    nwcPctDeltaRevenue: 5,
    riskFreePct: null,                // null = latest MX 10-year yield in market.js (FRED IRLTLT01MXM156N)
    erpPct: 5.0,
    beta: 0.85,
    costOfDebtPct: 9.9,               // GAP 26-2 coupon 9.87% (10-yr fixed, Mar-2026)
    targetDebtPct: 25,
    terminalGrowthPct: 4.0,           // nominal MXN (≈ 3.5–4% inflation + modest real growth)
    exitMultiple: 11.0,
  },
  // Peer set for relative valuation. Multiples are placeholders until the FactSet connector is
  // authorised; see peers.js.
  peers: ["ASUR", "OMA", "AENA", "Fraport", "Flughafen Zürich", "Auckland International"],
};
