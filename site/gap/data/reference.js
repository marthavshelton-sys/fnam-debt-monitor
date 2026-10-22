// Hand-curated, slow-moving facts for the GAP model. Every block carries its source.
// Update by PR when a shareholders' meeting, a corporate transaction or a tariff/MDP review changes
// something (see the GAP runbook, "Reference data"). Numbers here are NEVER derived from the
// auto-parsed statements; those live in financials.js / traffic.js / market.js.
window.GAP_REF = {
  updatedAt: "2026-10-22",
  company: {
    name: "Grupo Aeroportuario del Pacífico, S.A.B. de C.V.",
    short: "GAP",
    tickers: { bmv: "GAP (serie B)", nyse: "PAC (ADS)" },
    adsRatio: 10,                       // 1 ADS = 10 Series B shares
    fiscalYearEnd: "12-31",
    reportingCurrency: "MXN",
    accounting: {
      en: "IFRS (IFRIC 12 service-concession accounting: construction of concession assets is booked as revenue and cost at zero margin)",
      es: "IFRS (contabilidad de concesiones IFRIC 12: la construcción de activos concesionados se registra como ingreso y costo a margen cero)",
    },
    ir: "https://www.aeropuertosgap.com.mx/en/investors",
  },
  // Shares outstanding after the CBX / AMP business combination (merger notarized 30-Apr-2026,
  // effective 1-May-2026). Source: GAP release 7-May-2026 "Completion of Business Combination
  // Process of CBX and the Provision of Technical Assistance Services" (GlobeNewswire / Form 6-K).
  shares: {
    total: 595018195, seriesB: 519226576, seriesBB: 75791619,
    asOf: "2026-05-07",
    preMergerOutstanding: 505277464,       // = 595,018,195 − 89,740,731 net new shares
    newSharesIssuedCbx: 89740731,
    history: [
      { asOf: "2025-12-31", total: 505277464, note: { en: "before the CBX/AMP merger", es: "antes de la fusión con CBX/AMP" } },
      { asOf: "2026-05-07", total: 595018195, note: { en: "after issuing 89,740,731 net new shares", es: "después de emitir 89,740,731 acciones netas nuevas" } },
    ],
    holders: [
      { name: "Aena Desarrollo Internacional (ES)", pct: 6.55, shares: 38900000, note: { en: "25.2 M serie BB + 13.7 M serie B; direct stake after AMP merged into GAP", es: "25.2 M serie BB + 13.7 M serie B; participación directa tras la fusión de AMP en GAP" }, source: { en: "Aena notice to the CNMV, 7-May-2026 (via Infobae / El Economista)", es: "Comunicación de Aena a la CNMV, 7-may-2026 (vía Infobae / El Economista)" } },
      { name: { en: "Former AMP partners (CMA group)", es: "Antiguos socios de AMP (grupo CMA)" }, pct: null, shares: null, note: { en: "Remaining serie BB (≈50.6 M) plus serie B received in the merger; confirm in the 2026 20-F, Item 7", es: "Resto de la serie BB (≈50.6 M) más serie B recibida en la fusión; confirmar en la Forma 20-F 2026, punto 7" }, source: "GAP 6-K 7-May-2026" },
      { name: { en: "Float (serie B, BMV + NYSE ADS)", es: "Flotante (serie B, BMV + ADS en NYSE)" }, pct: null, note: { en: "Balance", es: "Resto" }, source: "" },
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
    { scope: "12 Mexican airports", scopeEs: "12 aeropuertos en México", granted: "1998-11-01", expires: "2048-11-01", years: 50, note: { en: "50-year concessions from the Mexican federal government (SICT/AFAC); extendable by up to 50 more years at the government's discretion.", es: "Concesiones a 50 años otorgadas por el gobierno federal mexicano (SICT/AFAC); prorrogables hasta por 50 años más a discreción del gobierno." }, source: { en: "GAP Form 20-F, Item 4", es: "Forma 20-F de GAP, punto 4" } },
    { scope: "Montego Bay (MBJ Airports Ltd, 74.5% GAP)", scopeEs: "Montego Bay (MBJ Airports Ltd, 74.5% GAP)", granted: "2003-04-01", expires: "2033-04-01", years: 30, note: { en: "30-year concession from the Airports Authority of Jamaica; the Jamaican government opened early extension talks in 2025.", es: "Concesión a 30 años otorgada por la Airports Authority of Jamaica; el gobierno jamaiquino abrió pláticas anticipadas de prórroga en 2025." }, source: { en: "GAP 20-F; Jamaica Gleaner, 4-Jul-2025", es: "Forma 20-F de GAP; Jamaica Gleaner, 4-jul-2025" } },
    { scope: "Kingston (PAC Kingston Airport Ltd, 100% GAP)", scopeEs: "Kingston (PAC Kingston Airport Ltd, 100% GAP)", granted: "2019-10-10", expires: "2044-10-10", years: 25, note: { en: "25-year concession signed Oct-2018 with a 12-month transition; operations started Oct-2019.", es: "Concesión a 25 años firmada en oct-2018 con una transición de 12 meses; la operación inició en oct-2019." }, source: { en: "GAP 20-F; Development Bank of Jamaica", es: "Forma 20-F de GAP; Development Bank of Jamaica" } },
  ],
  // Regulated-tariff cycle. Maximum tariffs (TM) per workload unit are set every 5 years by SICT/AFAC
  // together with the Master Development Program (PMD) capex commitment.
  regulation: {
    // Two figures GAP has given for the same program: the five-year total announced by the chair on 11-Feb-2025 ("more than
    // Ps. 52 bn", press coverage of GAP's announcement, not a filing) and the 2026–2029 remainder stated in GAP's own 6-K of
    // 9-May-2026 ("approximately Ps. 40.0 billion"). They are consistent: 2025 capex was Ps. 12,397 M (annual cash-flow
    // statement), so 52 − 12.4 ≈ 40 for the four remaining years. The deck cites the filed figure and labels the announced one.
    mdp: { period: "2025–2029", capexMxnBn: 52, note: { en: "Announced 11-Feb-2025: more than Ps. 52 bn over 2025–2029; about 50% more terminal capacity, +45% inspection points, +25% aprons, +20% airfield across the 12 Mexican airports.", es: "Anunciado el 11-feb-2025: más de Ps. 52 mil millones en 2025–2029; alrededor de 50% más capacidad de terminales, +45% puntos de inspección, +25% plataformas, +20% pistas y rodajes en los 12 aeropuertos mexicanos." }, source: { en: "GAP announcement of the 2025–2029 MDP, 11-Feb-2025 (chair's remarks; press coverage, El Financiero); not in a filing", es: "Anuncio del PMD 2025–2029 por GAP, 11-feb-2025 (palabras de la presidenta del consejo; cobertura de prensa, El Financiero); no consta en un comunicado a la bolsa" }, sourceKind: "press", sourceDate: "2025-02-11",
      remaining: { period: "2026–2029", capexMxnBn: 40.0, note: { en: "Investments of approximately Ps. 40.0 billion contemplated for 2026–2029 (about 60% more terminal space, 35% more inspection points and access areas, 25% more aircraft positions, 10% more airside infrastructure).", es: "Inversiones de aproximadamente Ps. 40.0 mil millones contempladas para 2026–2029 (cerca de 60% más superficie de terminales, 35% más puntos de inspección y accesos, 25% más posiciones de aeronaves, 10% más infraestructura de lado aire)." }, source: { en: "GAP release 9-May-2026 (Form 6-K), initiation of the process to establish a FIBRA", es: "Comunicado de GAP del 9-may-2026 (Forma 6-K), inicio del proceso para constituir una FIBRA" }, sourceUrl: "https://www.globenewswire.com/news-release/2026/05/09/3291422/0/en/grupo-aeroportuario-del-pacifico-announces-initiation-of-the-process-to-establish-a-fibra.html", sourceKind: "filing", sourceDate: "2026-05-09" } },
    tua2026: { avgIncreasePct: 5, tijuanaPct: 2, note: { en: "Average +5% TUA (passenger charge) increase in 2026, +2% in Tijuana.", es: "Aumento promedio de 5% en la TUA (tarifa de uso de aeropuerto) en 2026, 2% en Tijuana." }, source: { en: "Milenio, Feb-2026 (CEO Raúl Revuelta)", es: "Milenio, feb-2026 (director general Raúl Revuelta)" } },
  },
  // Dividends approved at the Annual General Meeting (AGM), Ps. per share, paid in installments over the
  // following 12 months (payableUntil). The page and the validator compare dps with the exchange-recorded
  // installments in market.js since agmDate, so an unpaid balance is stated rather than read as a missing feed. Older years are shown from the exchange-recorded cash dividends in market.js
  // (Yahoo Finance) — cross-check against the 20-F Item 8 before quoting them.
  // One entry per annual meeting: the amount per share approved (a dividend, or a capital reduction when GAP used one instead;
  // kind: "capitalReduction"), the fiscal year whose statements the meeting approved (fy = agmYear − 1) and how it was paid.
  // The deck reconciles each to the cash-flow statement (owner, 15-Oct-2026).
  dividends: [
    { agmYear: 2024, agmDate: "2024-04-25", dps: 13.86, kind: "capitalReduction", payableUntil: "2025-04-25", note: { en: "Capital reduction of Ps. 13.86 per share instead of a dividend, payable within 12 months of 25-Apr-2024 (extraordinary meeting, item I); Ps. 7,003 M paid in 2024 per the cash-flow statement (13.86 × 505,277,464 shares).", es: "Reembolso de capital de Ps. 13.86 por acción en lugar de dividendo, pagadero dentro de los 12 meses siguientes al 25-abr-2024 (asamblea extraordinaria, punto I); Ps. 7,003 M pagados en 2024 según el estado de flujos (13.86 × 505,277,464 acciones)." }, source: { en: "GAP release 25-Apr-2024 (AGM resolutions); FY2024 cash-flow statement", es: "Comunicado de GAP, 25-abr-2024 (resoluciones de la asamblea); estado de flujos FY2024" }, sourceUrl: "https://www.globenewswire.com/news-release/2024/04/26/2870209/0/en/resolutions-adopted-at-the-annual-general-ordinary-and-extraordinary-shareholders-meeting-for-grupo-aeroportuario-del-pacifico-on-april-25-2024.html" },
    { agmYear: 2025, agmDate: "2025-04-24", dps: 16.84, payableUntil: "2026-04-24", note: { en: "Paid in two installments of Ps. 8.42: ex-dates 27-May-2025 and 13-Aug-2025 (exchange record; Ps. 4,254 M each in the 2Q25 and 3Q25 cash-flow statements).", es: "Pagado en dos exhibiciones de Ps. 8.42: fechas ex 27-may-2025 y 13-ago-2025 (registro de bolsa; Ps. 4,254 M en cada uno de los flujos de efectivo del 2T25 y 3T25)." }, source: { en: "GAP release 25-Apr-2025 (AGM resolutions, item V); exchange dividend record", es: "Comunicado de GAP, 25-abr-2025 (resoluciones de la asamblea, punto V); registro de dividendos de la bolsa" }, sourceUrl: "https://www.globenewswire.com/news-release/2025/04/25/3068046/0/en/resolutions-adopted-at-the-annual-general-ordinary-and-extraordinary-shareholders-meeting-for-grupo-aeroportuario-del-pacifico-on-april-24-2025.html" },
    { agmYear: 2026, agmDate: "2026-04-22", dps: 20.80, payableUntil: "2027-04-22", note: { en: "Approved (item V): payable in one or more installments within the 12 months following 22-Apr-2026, to shares outstanding on each payment date. Declared in full in 2Q26 (Ps. 12,376 M, dividends payable at 30-Jun-2026); no installment had gone ex on the exchange as of the last market refresh.", es: "Aprobado (punto V): pagadero en una o más exhibiciones dentro de los 12 meses siguientes al 22-abr-2026, a las acciones en circulación en cada fecha de pago. Declarado íntegro en el 2T26 (Ps. 12,376 M en dividendos por pagar al 30-jun-2026); ninguna exhibición había pasado por la bolsa al último refresco de mercado." }, source: { en: "GAP release 24-Apr-2026 (AGM resolutions, item V); 2Q26 report (balance sheet and cash-flow statement)", es: "Comunicado de GAP, 24-abr-2026 (resoluciones de la asamblea, punto V); informe 2T26 (balance y flujo de efectivo)" }, sourceUrl: "https://www.globenewswire.com/news-release/2026/04/24/3280487/0/en/resolutions-adopted-at-the-annual-general-ordinary-shareholders-meeting-for-grupo-aeroportuario-del-pacifico-on-april-22-2026.html" },
  ],
  // Debt instruments — long-term certificados bursátiles (local bonds) and bank facilities. Fill /
  // refresh from the "Debt" table of the latest quarterly report; principal in Ps. million.
  debt: {
    ratings: [
      { agency: "Moody's Local MX", rating: "Aaa.mx", outlook: { en: "stable", es: "estable" }, scope: { en: "national scale, certificados bursátiles", es: "escala nacional, certificados bursátiles" }, actionDate: "2026-04-01", action: { en: "rating report", es: "informe de calificación" }, source: { en: "Moody's Local MX", es: "Moody's Local MX" } },
      // S&P National Ratings (S&P Global Ratings, national scale): issuer and the outstanding certificados affirmed at mxAAA with a stable
      // outlook on 13-Mar-2026, when mxAAA was assigned to GAP 26 / GAP 26-2 (BMV evento relevante de calificadoras 1541529).
      { agency: "S&P Global Ratings", rating: "mxAAA", outlook: { en: "stable", es: "estable" }, scope: { en: "national scale, issuer and certificados bursátiles", es: "escala nacional, emisor y certificados bursátiles" }, actionDate: "2026-03-13", action: { en: "affirmed (issuer and outstanding certificados); mxAAA assigned to GAP 26 / GAP 26-2", es: "confirmada (emisor y certificados en circulación); mxAAA asignada a GAP 26 / GAP 26-2" }, source: { en: "S&P National Ratings rating action, BMV evento relevante de calificadoras 1541529", es: "acción de calificación de S&P National Ratings, evento relevante de calificadoras BMV 1541529" }, sourceUrl: "https://www.bmv.com.mx/docs-pub/eventoca/eventoca_1541529_1.pdf" },
    ],
    // Every instrument outstanding at 30-Jun-2026 (FactSet Debt Capital Structure, GAPB-MX, quarterly detail at
    // 2026-06-30; amounts in Ps. million) with series names, coupons and maturities confirmed from GAP's own
    // issuance and repayment 6-Ks where one exists. Names marked inferred: true come from the issuance pattern of
    // that date (the 6-K for the sister tranche names only one series) and are shown with an asterisk.
    // Post-quarter events (the Ps. 8,000 M bank facilities of 11-Sep-2026 and the two September/October
    // maturities they repay) are recorded in `events` and shown under the table.
    instrumentsAsOf: "2026-06-30",
    // One note for the two certificados that matured after the snapshot (printed with each note's own amount and due date).
    repaidNote: { en: "GAP's release of 11-Sep-2026 says both are repaid at maturity out of the Ps. 8,000 M bank facilities signed that day; no separate repayment notice in GAP's releases or the BMV material events through 14-Oct-2026 (GAP did file one for GAP 23L in March 2026).", es: "El comunicado de GAP del 11-sep-2026 dice que ambos se pagan a su vencimiento con las líneas bancarias por Ps. 8,000 M firmadas ese día; sin aviso de liquidación en los comunicados de GAP ni en los eventos relevantes de la BMV hasta el 14-oct-2026 (para GAP 23L sí lo hubo en marzo de 2026)." },
    instruments: [
      // --- certificados bursátiles (local bonds) ---
      { name: "GAP 21-V", type: "CB", issued: "2021-10-15", matures: "2026-10-09", principalMxn: 1500, rate: { en: "floating (TIIE-based)", es: "variable (sobre TIIE)" }, source: "6-K 11-Sep-2026 · FactSet", repaid: { date: "2026-10-09", basis: "plan" }, note: { en: "Repaid at maturity out of the Sep-2026 bank facilities (per the 11-Sep-2026 release).", es: "Se paga a su vencimiento con las líneas bancarias de sep-2026 (según el comunicado del 11-sep-2026)." } },
      { name: "GAP 22L", type: "CB", issued: "2022-09-26", matures: "2026-09-21", principalMxn: 2757.6, rate: { en: "floating (TIIE-based)", es: "variable (sobre TIIE)" }, source: "6-K 21-Oct-2022, 11-Sep-2026 · FactSet", repaid: { date: "2026-09-21", basis: "plan" }, note: { en: "Repaid at maturity (21-Sep-2026) out of the Sep-2026 bank facilities (per the 11-Sep-2026 release).", es: "Pagado a su vencimiento (21-sep-2026) con las líneas bancarias de sep-2026 (según el comunicado del 11-sep-2026)." } },
      { name: "GAP 22", type: "CB", inferred: true, issued: "2022-03-17", matures: "2027-03-11", principalMxn: 2000, rate: { en: "floating (7.03% at 30-Jun-2026)", es: "variable (7.03% al 30-jun-2026)" }, source: "FactSet" },
      { name: "GAP 24-L", type: "CB", issued: "2024-03-20", matures: "2027-03-17", principalMxn: 1384.9, rate: { en: "TIIE-28 + 25 bp (sustainability-linked)", es: "TIIE-28 + 25 pb (ligado a sostenibilidad)" }, source: "6-K 20-Mar-2024" },
      { name: "GAP 20-3", type: "CB", inferred: true, issued: "2020-06-25", matures: "2027-06-17", principalMxn: 3598, rate: { en: "8.14% fixed", es: "8.14% fija" }, source: "6-K 24-Jul-2020 (2Q20 report) · FactSet" },
      { name: "GAP 25", type: "CB", issued: "2025-02-04", matures: "2028-02-01", principalMxn: 3000, rate: { en: "TIIE funding + 50 bp (28-day)", es: "TIIE de fondeo + 50 pb (28 días)" }, source: "6-K 4-Feb-2025" },
      { name: "GAP 21-2", type: "CB", inferred: true, issued: "2021-05-07", matures: "2028-04-28", principalMxn: 3000, rate: { en: "7.91% fixed", es: "7.91% fija" }, source: "FactSet" },
      { name: "GAP 25-2", type: "CB", issued: "2025-08-22", matures: "2028-08-18", principalMxn: 4050, rate: { en: "TIIE funding + 48 bp (28-day)", es: "TIIE de fondeo + 48 pb (28 días)" }, source: "6-K 22-Aug-2025" },
      { name: "GAP 26", type: "CB", issued: "2026-03-31", matures: "2029-03-27", principalMxn: 2767, rate: { en: "TIIE funding + 45 bp (28-day)", es: "TIIE de fondeo + 45 pb (28 días)" }, source: "6-K 1-Apr-2026" },
      { name: "GAP 24", type: "CB", issued: "2024-09-05", matures: "2029-08-30", principalMxn: 5648.1, rate: { en: "TIIE-28 + 60 bp", es: "TIIE-28 + 60 pb" }, source: "6-K 5-Sep-2024" },
      { name: "GAP 23-2L", type: "CB", issued: "2023-03-27", matures: "2030-03-18", principalMxn: 4280, rate: { en: "9.65% fixed (sustainability-linked)", es: "9.65% fija (ligado a sostenibilidad)" }, source: "6-K 17-Apr-2023 (1Q23 report) · FactSet" },
      { name: "GAP 24-2L", type: "CB", issued: "2024-03-20", matures: "2031-03-12", principalMxn: 1615.1, rate: { en: "9.94% fixed (sustainability-linked)", es: "9.94% fija (ligado a sostenibilidad)" }, source: "6-K 20-Mar-2024" },
      { name: "GAP 25-3", type: "CB", issued: "2025-08-22", matures: "2031-08-15", principalMxn: 4450, rate: { en: "9.02% fixed (182-day)", es: "9.02% fija (182 días)" }, source: "6-K 22-Aug-2025" },
      { name: "GAP 22-2", type: "CB", issued: "2022-03-17", matures: "2032-03-04", principalMxn: 6000, rate: { en: "9.67% fixed (182-day)", es: "9.67% fija (182 días)" }, source: "6-K 4-Feb-2025", note: { en: "Ps. 3,000 M original issue plus the Ps. 3,000 M reopening of 4-Feb-2025.", es: "Ps. 3,000 M originales más la reapertura de Ps. 3,000 M del 4-feb-2025." } },
      { name: "GAP 26-2", type: "CB", issued: "2026-03-31", matures: "2036-03-18", principalMxn: 7951, rate: { en: "9.87% fixed (182-day)", es: "9.87% fija (182 días)" }, source: "6-K 1-Apr-2026" },
      // --- bank loans (FactSet detail; GAP's releases do not name them individually) ---
      { name: { en: "Term loan (May-2025)", es: "Préstamo a plazo (may-2025)" }, type: { en: "loan", es: "préstamo" }, issued: "2025-05-30", matures: "2030-05-30", principalMxn: 3375, rate: { en: "floating", es: "variable" }, source: "FactSet" },
      { name: { en: "Term loan (Sep-2025)", es: "Préstamo a plazo (sep-2025)" }, type: { en: "loan", es: "préstamo" }, issued: "2025-09-18", matures: "2030-09-18", principalMxn: 698.8, rate: { en: "floating", es: "variable" }, source: "FactSet" },
      { name: { en: "Term loan (matures Dec-2031)", es: "Préstamo a plazo (vence dic-2031)" }, type: { en: "loan", es: "préstamo" }, issued: null, matures: "2031-12-31", principalMxn: 1303.7, rate: { en: "floating", es: "variable" }, source: "FactSet" },
      { name: { en: "Revolving facility (drawn)", es: "Línea revolvente (dispuesta)" }, type: { en: "loan", es: "préstamo" }, issued: "2025-03-31", matures: "2029-10-24", principalMxn: 838.6, rate: { en: "floating", es: "variable" }, source: "FactSet" },
      { name: { en: "Short-term loans (3)", es: "Préstamos de corto plazo (3)" }, type: { en: "loan", es: "préstamo" }, issued: "2026-01-20", matures: "2027-03-19", principalMxn: 4456.8, rate: { en: "floating", es: "variable" }, source: "FactSet", note: { en: "Ps. 1,668 M (Jan-2026 to Jan-2027), Ps. 1,668 M and Ps. 1,120 M (Mar-2026 to Mar-2027).", es: "Ps. 1,668 M (ene-2026 a ene-2027), Ps. 1,668 M y Ps. 1,120 M (mar-2026 a mar-2027)." } },
    ],
    // Committed bank facilities signed after instrumentsAsOf (drawn gradually; amounts drawn are not disclosed until the next
    // quarterly report), for the liquidity table.
    facilities: [
      { date: "2026-09-11", amountMxnM: 8000, lenders: "Santander, BBVA, HSBC, J.P. Morgan, Scotiabank", term: { en: "6 to 12 months (some extendable 6 months)", es: "6 a 12 meses (algunas prorrogables 6 meses)" }, rate: { en: "floating, TIIE funding + 45 bp weighted average", es: "variable, TIIE de fondeo + 45 pb en promedio ponderado" }, use: { en: "Ps. 4,258 M to repay GAP 22L (Ps. 2,758 M, 21-Sep-2026) and GAP 21-V (Ps. 1,500 M, 9-Oct-2026); Ps. 3,742 M for MDP capex", es: "Ps. 4,258 M para pagar GAP 22L (Ps. 2,758 M, 21-sep-2026) y GAP 21-V (Ps. 1,500 M, 9-oct-2026); Ps. 3,742 M para capex del PMD" }, refinanceMxnM: 4258, capexMxnM: 3742, source: { en: "GAP release 11-Sep-2026 (6-K); BMV material event 1588421", es: "Comunicado de GAP 11-sep-2026 (6-K); evento relevante BMV 1588421" }, url: "https://www.globenewswire.com/news-release/2026/09/11/3360535/0/en/grupo-aeroportuario-del-pacifico-announces-the-execution-of-bank-credit-facilities-totaling-ps-8-000-million.html" },
    ],
    // Reconciliation of the instrument list (principal, FactSet) to the balance sheet (bank loans + certificados, incl. accrued
    // interest): FactSet's detail at 30-Jun-2026 carries two legacy loans past their stated maturity (Ps. 8.9 M + 191.1 M = Ps. 200 M)
    // that the list leaves out; the rest of the difference is accrued interest, which GAP shows inside "bank loans and interest payable".
    reconciliation: { legacyLoansMxnM: 200, note: { en: "Instrument principal + accrued interest and two legacy loans (Ps. 200 M, FactSet detail) = balance-sheet bank loans and certificados", es: "Principal de los instrumentos + intereses devengados y dos préstamos antiguos (Ps. 200 M, detalle de FactSet) = préstamos bancarios y certificados en balance" } },
    // Gross debt (bank loans + certificados bursátiles, Ps. million) at the quarter-ends whose own release prints a condensed
    // balance sheet. Sources, by kind: "annual" = the audited balance sheet in GAP's Form 20-F (line items "Bank loans, debt
    // securities and current portion of debt" + "Long-term borrowings" + "Debt securities"; this presentation excludes accrued
    // interest); "factset" = FactSet Fundamentals FF_DEBT, standardized from GAP's BMV quarterly report (includes lease liabilities,
    // Ps. 20–100 M, and excludes accrued interest) — to be replaced by the BMV report's own figures when read (owner's check).
    // 2Q25 and 2Q26 need no entry: the 2Q26 release itemizes both (the model reads a later report's comparative balance sheet).
    history: [
      { q: "2024Q3", grossDebtMxnM: 47994.97, kind: "factset", source: { en: "FactSet Fundamentals FF_DEBT, 30-Sep-2024 (from GAP's 3Q24 quarterly report)", es: "FactSet Fundamentals FF_DEBT, 30-sep-2024 (del informe trimestral 3T24 de GAP)" } },
      { q: "2024Q4", grossDebtMxnM: 47989.879, kind: "annual", source: { en: "GAP Form 20-F 2025, consolidated statement of financial position at 31-Dec-2024 (13,982,903 + 4,103,254 + 29,903,722)", es: "Forma 20-F 2025 de GAP, estado de situación financiera al 31-dic-2024 (13,982,903 + 4,103,254 + 29,903,722)" }, sourceUrl: "https://www.sec.gov/Archives/edgar/data/1347557/000119312526161714/R2.htm" },
      { q: "2025Q1", grossDebtMxnM: 49582.28, kind: "factset", source: { en: "FactSet Fundamentals FF_DEBT, 31-Mar-2025 (from GAP's 1Q25 quarterly report)", es: "FactSet Fundamentals FF_DEBT, 31-mar-2025 (del informe trimestral 1T25 de GAP)" } },
      { q: "2025Q3", grossDebtMxnM: 53236.048, kind: "factset", source: { en: "FactSet Fundamentals FF_DEBT, 30-Sep-2025 (from GAP's 3Q25 quarterly report)", es: "FactSet Fundamentals FF_DEBT, 30-sep-2025 (del informe trimestral 3T25 de GAP)" } },
      { q: "2025Q4", grossDebtMxnM: 52997.093, kind: "annual", source: { en: "GAP Form 20-F 2025, consolidated statement of financial position at 31-Dec-2025 (9,024,828 + 4,946,131 + 39,026,134)", es: "Forma 20-F 2025 de GAP, estado de situación financiera al 31-dic-2025 (9,024,828 + 4,946,131 + 39,026,134)" }, sourceUrl: "https://www.sec.gov/Archives/edgar/data/1347557/000119312526161714/R2.htm" },
      { q: "2026Q1", grossDebtMxnM: 63830.43, kind: "factset", source: { en: "FactSet Fundamentals FF_DEBT, 31-Mar-2026 (from GAP's 1Q26 quarterly report)", es: "FactSet Fundamentals FF_DEBT, 31-mar-2026 (del informe trimestral 1T26 de GAP)" } },
    ],
    // Events after instrumentsAsOf that change the table; the page prints them under it.
    events: [
      { date: "2026-10-19", en: "3Q26 report (filed 19-Oct-2026): Ps. 6,000 M of bank loans drawn in the quarter (cash-flow statement, \"bank loans\") out of the Ps. 8,000 M facilities of 11-Sep-2026 and Ps. 2,757.6 M of certificados repaid (GAP 22L, 21-Sep-2026); at 30-Sep-2026 bank loans and accrued interest total Ps. 24,953 M and certificados Ps. 42,761 M (balance sheet). GAP 21-V (Ps. 1,500 M) matured on 9-Oct-2026, after the quarter.", es: "Informe 3T26 (presentado el 19-oct-2026): en el trimestre se dispusieron Ps. 6,000 M de préstamos bancarios (estado de flujos, \"préstamos bancarios\") de las líneas por Ps. 8,000 M del 11-sep-2026 y se pagaron Ps. 2,757.6 M de certificados (GAP 22L, 21-sep-2026); al 30-sep-2026 los préstamos bancarios e intereses suman Ps. 24,953 M y los certificados Ps. 42,761 M (balance). El GAP 21-V (Ps. 1,500 M) venció el 9-oct-2026, después del trimestre.", source: { en: "GAP 3Q26 report, 19-Oct-2026 (BMV material event 1596277)", es: "Informe 3T26 de GAP, 19-oct-2026 (evento relevante BMV 1596277)" }, url: "https://www.aeropuertosgap.com.mx/files/PR_3Q26_ENG_19Oct26_VF_DEF.pdf" },
      { date: "2026-09-11", en: "Bank credit facilities for Ps. 8,000 M signed with Santander, BBVA, HSBC, J.P. Morgan and Scotiabank: 6 to 12 months (some extendable 6 months), floating at TIIE funding + 45 bp weighted average. Ps. 4,258 M repay GAP 22L (Ps. 2,758 M, 21-Sep-2026) and GAP 21-V (Ps. 1,500 M, 9-Oct-2026); Ps. 3,742 M fund PMD capex.", es: "Líneas de crédito bancarias por Ps. 8,000 M con Santander, BBVA, HSBC, J.P. Morgan y Scotiabank: de 6 a 12 meses (algunas prorrogables 6 meses), a tasa variable de TIIE de fondeo + 45 pb en promedio ponderado. Ps. 4,258 M pagan GAP 22L (Ps. 2,758 M, 21-sep-2026) y GAP 21-V (Ps. 1,500 M, 9-oct-2026); Ps. 3,742 M financian capex del PMD.", source: { en: "GAP release 11-Sep-2026 (6-K)", es: "Comunicado de GAP 11-sep-2026 (6-K)" }, url: "https://www.globenewswire.com/news-release/2026/09/11/3360535/0/en/grupo-aeroportuario-del-pacifico-announces-the-execution-of-bank-credit-facilities-totaling-ps-8-000-million.html" },
    ],
    instrumentsNote: {
      en: "Principal of the certificados (Ps. 54,002 M) plus bank loans (Ps. 10,673 M) totals Ps. 64,675 M, against Ps. 65,667 M of bank loans plus bonds on the 30-Jun-2026 balance sheet; the difference is accrued interest and two small legacy loans (Ps. 200 M). Names with an asterisk are inferred from the issuance pattern; amounts, coupons and maturities are FactSet's. Jamaica's USD facilities are included in the loans at their peso value. GAP 23L (Ps. 1,120 M) was repaid at maturity in Mar-2026.",
      es: "El principal de los certificados (Ps. 54,002 M) más los préstamos bancarios (Ps. 10,673 M) suma Ps. 64,675 M, frente a Ps. 65,667 M de préstamos más certificados en el balance al 30-jun-2026; la diferencia son intereses devengados y dos préstamos antiguos pequeños (Ps. 200 M). Los nombres con asterisco se infieren del patrón de emisión; montos, cupones y vencimientos son de FactSet. Las líneas en dólares de Jamaica van dentro de los préstamos a su valor en pesos. GAP 23L (Ps. 1,120 M) se pagó a su vencimiento en mar-2026.",
    },
  },
  cbx: {
    consolidatedFrom: "2026-05", // first month of CBX revenue in GAP's income statement (merger effective 1 May 2026)
    // Cross Border Xpress: the ground-side terminal in Otay Mesa (San Diego) linked to Tijuana airport
    // by a 120 m pedestrian bridge. Timeline and terms from GAP's releases (GlobeNewswire / Form 6-K).
    timeline: [
      { date: "2015-12-09", en: "CBX opens (Otay-Tijuana Venture LLC; investors incl. PAP Corp and Equity Group Investments).", es: "Abre CBX (Otay-Tijuana Venture LLC; inversionistas como PAP Corp y Equity Group Investments)." },
      { date: "2025-11-03", en: "GAP's board proposes combining (i) the technical-assistance & technology-transfer business provided by strategic partner AMP since 1999 and (ii) CBX: 75% of CBX via merger paid with ≈90 M new serie B shares; remaining 25% for US$487.5 M cash.", es: "El consejo de GAP propone combinar (i) el negocio de asistencia técnica y transferencia de tecnología que el socio estratégico AMP prestaba desde 1999 y (ii) CBX: 75% de CBX vía fusión pagada con ≈90 M de nuevas acciones serie B; el 25% restante por US$487.5 M en efectivo." },
      { date: "2025-12-11", en: "Extraordinary shareholders' meeting approves the combination (~96% of votes cast; 88.1% quorum).", es: "La asamblea extraordinaria aprueba la combinación (~96% de los votos; quórum de 88.1%)." },
      { date: "2026-03-27", en: "Ps. 10,718 M of certificados bursátiles (GAP 26 / GAP 26-2) issued, 1.74× oversubscribed, to fund the 25% cash purchase and PMD capex.", es: "Emisión de Ps. 10,718 M en certificados bursátiles (GAP 26 / GAP 26-2), 1.74× sobresuscrita, para financiar la compra del 25% en efectivo y el capex del PMD." },
      { date: "2026-04-30", en: "Merger agreement notarized; AMP and the intermediate CBX holding entities merge into GAP. Effective 1-May-2026.", es: "Se protocoliza el convenio de fusión; AMP y las tenedoras intermedias de CBX se fusionan en GAP. Efectiva el 1-May-2026." },
      { date: "2026-05-07", en: "Completion: 89,740,731 net new shares issued (595,018,195 total); remaining 25% of CBX purchased; GAP owns 100% of CBX and no longer pays the technical-assistance fee. Aena becomes a direct 6.55% holder.", es: "Cierre: se emiten 89,740,731 acciones netas nuevas (595,018,195 en total); se compra el 25% restante de CBX; GAP posee 100% de CBX y deja de pagar la cuota de asistencia técnica. Aena pasa a tener 6.55% directo." },
      { date: "2026-07-14", en: "2Q26 results are the first to consolidate CBX (two months): revenue ex-IFRIC 12 +4.9% (total revenue +3.7%), EBITDA +8.4%, net income +9.0% y/y.", es: "Los resultados del 2T26 son los primeros que consolidan CBX (dos meses): ingresos sin IFRIC 12 +4.9% (ingresos totales +3.7%), EBITDA +8.4%, utilidad neta +9.0% a/a." },
    ],
    facts: [
      { k: "newShares", label_en: "Net new shares issued", label_es: "Acciones netas emitidas", v: 89740731, fmt: "int" },
      { k: "cash25", label_en: "Cash for the remaining 25%", label_es: "Efectivo por el 25% restante", v: 487.5, fmt: "usdM" },
      // CBX's own 2025 figures as GAP disclosed them with the 2026 guidance (4Q25 report, 23-Feb-2026): revenue and EBITDA margin.
      { k: "cbxRev2025", label_en: "CBX revenue 2025 (GAP, 4Q25 report)", label_es: "Ingresos de CBX 2025 (GAP, informe 4T25)", v: 158.0, fmt: "usdM", source: { en: "GAP 4Q25 report, 23-Feb-2026 (Form 6-K), guidance note", es: "Informe 4T25 de GAP, 23-feb-2026 (Forma 6-K), nota de la guía" } },
      { k: "cbxMargin2025", label_en: "CBX EBITDA margin 2025 (GAP, 4Q25 report)", label_es: "Margen EBITDA de CBX 2025 (GAP, informe 4T25)", v: 0.687, fmt: "pct", source: { en: "GAP 4Q25 report, 23-Feb-2026 (Form 6-K), guidance note", es: "Informe 4T25 de GAP, 23-feb-2026 (Forma 6-K), nota de la guía" } },
      { k: "sharesAfter", label_en: "Shares outstanding after", label_es: "Acciones en circulación después", v: 595018195, fmt: "int" },
      { k: "dilution", label_en: "Dilution to pre-deal holders", label_es: "Dilución para accionistas previos", v: 89740731 / 595018195, fmt: "pct" },
      // Tijuana's passengers are computed from the twelve monthly reports of 2025 (12.65 M), not typed: the page and the deck
      // call paxYear('TIJ', 2025); a press figure of 13.0 M once sat here and was wrong (owner, 15-Oct-2026).
      { k: "tijPax2025", label_en: "Tijuana passengers 2025 (GAP monthly reports)", label_es: "Pasajeros de Tijuana 2025 (reportes mensuales de GAP)", computed: { fn: "paxYear", code: "TIJ", year: 2025 }, fmt: "M", source: { en: "GAP monthly traffic reports, Jan–Dec 2025", es: "Reportes mensuales de tráfico de GAP, ene–dic 2025" } },
    ],
    sources: {
      en: [
        "GAP, 'Business combination of CBX and technical assistance services', 3-Nov-2025 (6-K)",
        "GAP, 'Shareholder approval …', 11-Dec-2025 (6-K)",
        "GAP, 'Issuance of bond certificates for Ps. 10,718.0 million', 1-Apr-2026 (6-K)",
        "GAP, 'Completion of business combination process of CBX …', 7-May-2026 (6-K)",
        "BMV material events 1545742 (31-Mar-2026, certificados bursátiles) and 1557757 (7-May-2026, completion of the combination)",
        "GAP 2Q26 report (BMV filing 13-Jul-2026; Form 6-K 14-Jul-2026): Exhibit A (CBX revenue and EBITDA, May–June 2026) and the business-combination note",
        "GAP monthly traffic reports (CBX users; Tijuana passengers)",
      ],
      es: [
        "GAP, 'Combinación de negocios de CBX y de los servicios de asistencia técnica', 3-nov-2025 (6-K)",
        "GAP, 'Aprobación de los accionistas …', 11-dic-2025 (6-K)",
        "GAP, 'Emisión de certificados bursátiles por Ps. 10,718.0 millones', 1-abr-2026 (6-K)",
        "GAP, 'Conclusión del proceso de combinación de negocios de CBX …', 7-may-2026 (6-K)",
        "Eventos relevantes BMV 1545742 (31-mar-2026, certificados bursátiles) y 1557757 (7-may-2026, conclusión de la combinación)",
        "Informe 2T26 de GAP (presentado en la BMV el 13-jul-2026; Forma 6-K del 14-jul-2026): Exhibit A (ingresos y EBITDA de CBX, mayo–junio de 2026) y la nota de la combinación de negocios",
        "Reportes mensuales de tráfico de GAP (usuarios de CBX; pasajeros de Tijuana)",
      ],
    },
  },
  fibra: {
    placed: false,           // set to true (and placedDate) when the offering completes; the presentation title says "(Not Yet Placed)" until then
    placedDate: null,
    name: "FIBRA GAP (Fibra E)",
    ticker: "FGAP 26",
    exchange: "BIVA (Bolsa Institucional de Valores)",
    targetMxnM: 10195,
    certificates: 101950000,
    priceMxn: 100,
    stakePct: 4.2,
    // statusAsOf: date of the last check of GAP's releases and the BMV eventos relevantes list (not a claim about EDGAR).
    // timeline: newest first; kind "filing" (GAP release / BMV notice), "press" (not confirmed by a filing), "check" (FNAM's harvest).
    statusAsOf: "2026-10-22",
    timeline: [
      { date: "2026-10-22", kind: "check", en: "No pricing or completion notice in GAP's releases, on its investor site or in the BMV material events through 22-Oct-2026 (latest notice 19-Oct-2026, the 3Q26 results, which mention no placement).", es: "Sin aviso de colocación o cierre en los comunicados de GAP, en su sitio de inversionistas ni en los eventos relevantes de la BMV al 22-oct-2026 (último aviso el 19-oct-2026, los resultados del 3T26, que no mencionan colocación)." },
      { date: "2026-10-14", kind: "check", en: "No pricing or completion notice in GAP's releases, on its investor site or in the BMV material events through 14-Oct-2026 (latest notice 6-Oct-2026, the September traffic report).", es: "Sin aviso de precio ni de cierre en los comunicados de GAP, en su sitio de inversionistas ni en los eventos relevantes de la BMV hasta el 14-oct-2026 (último aviso del 6-oct-2026, el reporte de tráfico de septiembre)." },
      { date: "2026-09-21", kind: "press", en: "GAP expects the placement in October 2026 (Axis Negocios; Yahoo Noticias 22-Sep-2026). Not confirmed by a filing.", es: "GAP espera la colocación en octubre de 2026 (Axis Negocios; Yahoo Noticias 22-sep-2026). Sin confirmar en un comunicado." },
      { date: "2026-07-14", kind: "filing", en: "2Q26 report (Form 6-K): the approval process with the authorities continues.", es: "Informe 2T26 (Forma 6-K): continúa el proceso de autorización ante las autoridades." },
      { date: "2026-06-25", kind: "press", en: "Placement planned for 25-Jun-2026 on BIVA postponed (Yahoo Noticias).", es: "Se pospone la colocación prevista para el 25-jun-2026 en BIVA (Yahoo Noticias)." },
      { date: "2026-06-12", kind: "press", en: "Terms reported: FGAP 26 on BIVA, 101.95 M CBFEs at Ps. 100 (about Ps. 10,195 M) for 4.2% of each of the 12 Mexican concessionaires; 36.1% (about Ps. 3,680 M) for Guadalajara; BBVA and Santander as underwriters (Axis Negocios).", es: "Términos reportados: FGAP 26 en BIVA, 101.95 M de CBFEs a Ps. 100 (unos Ps. 10,195 M) por el 4.2% de cada una de las 12 concesionarias mexicanas; 36.1% (unos Ps. 3,680 M) para Guadalajara; BBVA y Santander como colocadores (Axis Negocios)." },
      { date: "2026-05-08", kind: "filing", en: "Announced: GAP starts the process to set up a FIBRA (BMV material event 1558742; GAP release 9-May-2026, Form 6-K).", es: "Anuncio: GAP inicia el proceso para constituir una FIBRA (evento relevante BMV 1558742; comunicado de GAP del 9-may-2026, Forma 6-K)." },
    ],
    sources: {
      en: [
        "GAP release 9-May-2026 (Form 6-K), initiation of the process to establish a FIBRA; BMV material event 1558742 (May-2026)",
        "GAP 2Q26 report (BMV filing 13-Jul-2026; Form 6-K 14-Jul-2026): status of the CBFE approval process",
        "El Cronista, Axis Negocios and El CEO, coverage of the FGAP 26 offering (Jun–Jul 2026)",
        "Axis Negocios, 'GAP planea colocar el 25 de junio fibra E a la que dará 4% de sus aeropuertos' (12-Jun-2026) and 'GAP perfila para octubre colocación de fibra E' (21-Sep-2026)",
        "Financial press via Yahoo Noticias, 'GAP pospone colocación de fibra E planeada para el 25 de junio' (25-Jun-2026) and 'En octubre saldrá la Fibra E de GAP' (22-Sep-2026)",
        "GAP releases, investor site and BMV material events checked for this model through 14-Oct-2026 (latest notice 6-Oct-2026): no pricing or completion notice",
      ],
      es: [
        "Comunicado de GAP del 9-may-2026 (Forma 6-K), inicio del proceso para constituir una FIBRA; evento relevante BMV 1558742 (may-2026)",
        "Informe 2T26 de GAP (presentado en la BMV el 13-jul-2026; Forma 6-K del 14-jul-2026): estado del proceso de autorización de los CBFE",
        "El Cronista, Axis Negocios y El CEO, cobertura de la oferta de FGAP 26 (jun–jul 2026)",
        "Axis Negocios, 'GAP planea colocar el 25 de junio fibra E a la que dará 4% de sus aeropuertos' (12-jun-2026) y 'GAP perfila para octubre colocación de fibra E' (21-sep-2026)",
        "Prensa financiera vía Yahoo Noticias, 'GAP pospone colocación de fibra E planeada para el 25 de junio' (25-jun-2026) y 'En octubre saldrá la Fibra E de GAP' (22-sep-2026)",
        "Comunicados de GAP, sitio de inversionistas y eventos relevantes de la BMV revisados para este modelo hasta el 14-oct-2026 (último aviso del 6-oct-2026): sin aviso de precio ni de cierre",
      ],
    },
  },
  // Share repurchase authorizations (AGM item VI). The AGM cancels whatever is left of the prior year's
  // program and sets the maximum for the next 12 months.
  buyback: [
    { agmDate: "2025-04-24", maxMxnM: 2500, note: { en: "Unused balance canceled by the 22-Apr-2026 AGM.", es: "El saldo no utilizado se canceló en la asamblea del 22-abr-2026." }, source: { en: "GAP release 24-Apr-2026 (AGM resolutions, item VI)", es: "Comunicado de GAP 24-abr-2026 (resoluciones de la asamblea, punto VI)" } },
    { agmDate: "2026-04-22", maxMxnM: 2500, note: { en: "Maximum amount for repurchases of own shares in the 12 months from 22-Apr-2026 (Securities Market Law, art. 56-IV).", es: "Monto máximo para recompra de acciones propias en los 12 meses desde el 22-abr-2026 (Ley del Mercado de Valores, art. 56-IV)." }, source: { en: "GAP release 24-Apr-2026 (AGM resolutions, item VI)", es: "Comunicado de GAP 24-abr-2026 (resoluciones de la asamblea, punto VI)" } },
  ],
  // Fiscal years for which GAP published no guidance. Checked 29-Sep-2026 against every GAP release on
  // GlobeNewswire since 2016 (the harvester keeps every "guidance" release): none for 2020 or 2021, and the
  // Spanish renderings of the English prose GAP prints around its guidance tables (guidance.js keeps the original); the
  // Spanish deck prints the translation and says it is one (owner, 15-Oct-2026). Keyed by the vintage's release date.
  guidanceTranslations: {
    "2026-07-14": { intro: ["Considerando la combinación de negocios efectiva en mayo, las tendencias del tráfico de pasajeros y el avance de los proyectos de inversión de la Compañía:"] },
    "2026-02-23": { intro: ["La Compañía presenta su perspectiva de crecimiento para el periodo del 1 de enero al 31 de diciembre de 2026, comparado con el ejercicio 2025."] },
    "2025-02-24": { intro: ["La Compañía anuncia su guía de crecimiento para el año completo 2025 comparado con 2024:"] },
  },
  // 4Q19 (20-Feb-2020) and 4Q20 (25-Feb-2021) results carry no guidance table.
  noGuidance: [
    { fy: 2020, note: { en: "No guidance published (none in GAP's releases; 4Q19 report of 20-Feb-2020 has no guidance table).", es: "Sin guía publicada (no hay comunicado de guía; el informe 4T19 del 20-feb-2020 no trae tabla de guía)." } },
    { fy: 2021, note: { en: "No guidance published (none in GAP's releases; 4Q20 report of 25-Feb-2021 has no guidance table).", es: "Sin guía publicada (no hay comunicado de guía; el informe 4T20 del 25-feb-2021 no trae tabla de guía)." } },
  ],
  // Results calendar. The presentation PDF marks the next results date "confirmed" only when GAP has announced
  // it; set nextResults when the company publishes its calendar (date, plus the release it came from) and clear
  // it after the results are out. Without it the date is assumed from GAP's own release-lag history.
  // The date each quarterly report was filed with the BMV (evento relevante "anuncia resultados del … trimestre"), the
  // convention every report date on the page and in the deck follows (owner, 15-Oct-2026); a quarter without an entry prints
  // the date of GAP's press release, labeled as such. 2026 entries from the BMV watch (tools/gap/raw/bmv-events.json), 2024–2025
  // from the BMV documents eventemi_<id>_1.pdf read in-session on 15-Oct-2026.
  filings: {
    results: {
      "2024Q3": { bmvDate: "2024-10-21", bmvId: "1413207" },
      "2024Q4": { bmvDate: "2025-02-24", bmvId: "1443753" },
      "2025Q1": { bmvDate: "2025-04-28", bmvId: "1458578" },
      "2025Q2": { bmvDate: "2025-07-21", bmvId: "1480453" },
      "2025Q3": { bmvDate: "2025-10-20", bmvId: "1500009" },
      "2025Q4": { bmvDate: "2026-02-23", bmvId: "1536005" },
      "2026Q1": { bmvDate: "2026-04-20", bmvId: "1549656" },
      "2026Q2": { bmvDate: "2026-07-13", bmvId: "1573976" },
      "2026Q3": { bmvDate: "2026-10-19", bmvId: "1596277" },
    },
  },
  calendar: {
    nextResults: null,   // e.g. { date: "2026-10-21", source: { title: "GAP announces 3Q26 results date", url: "https://...", date: "2026-10-01" } }
    // A vendor's projection, printed beside the assumed date while GAP has not announced one (never as a confirmed date).
    // FactSet CalendarEvents, ProjectedEarningsRelease for 4Q26 (event last modified 21-Apr-2026), read in-session 22-Oct-2026.
    projected: { q: "2026Q4", date: "2027-02-24", source: "FactSet", asOf: "2026-10-22" },
  },
  // Default DCF assumptions (editable in the page). Rates in %, money in Ps. million. The page anchors the first projected
  // year on the guidance midpoints in guidance.js and the next two fiscal years on FactSet's consensus EBITDA in peers.js
  // (anchorConsensus; minAnalysts = fewest estimates for a year to count); the drivers below take over afterward.
  dcf: {
    horizonYears: 5,
    terminalMethod: "annuity",        // annuity to concession end | perpetuity | exit multiple
    concessionEnd: 2048,
    renewalPct: 0,                    // annuity method: weight of a perpetuity after the concession's end (0 = contractual term only, 100 = perpetuity)
    anchorConsensus: true, minAnalysts: 3,
    trafficGrowthPct: [2.0, 4.0, 4.0, 3.5, 3.5],   // the five fiscal years after the guided one; 2026 guidance −3% to 0% (World Cup base, Jamaica)
    revPerPaxGrowthPct: 6.0,          // maximum-tariff path 2025-29 indexed to inflation + commercial yield (LTM to 2Q26: +11%)
    ebitdaMarginPct: null,            // null = the guided year's margin midpoint, else the latest LTM margin (ex-IFRIC 12)
    capexMxnM: null,                  // null = the PMD's annual pace (regulation.mdp: over Ps. 52 bn over 2025–2029 = Ps. 10,400 M a year) for every year after the guided one; an array of five fixes a profile
    daPctRevenue: null,               // null = LTM D&A / revenue
    taxRatePct: 30,
    nwcPctDeltaRevenue: 5,
    riskFreePct: null,                // null = latest MX 10-year auction yield in market.js (Banxico SIE SF44071)
    erpPct: 5.0,                      // mature-market implied ERP 4.23% (Damodaran, Jan-2026) + 0.8 pp; the peso sovereign yield already carries Mexico's default spread
    beta: 0.85,                       // fallback; the page computes two years of weekly GAPB vs IPC returns
    costOfDebtPct: 9.9,               // fallback; the page reads the latest fixed-rate bond (GAP 26-2 coupon 9.87%, 10-yr, Mar-2026)
    targetDebtPct: 25,                // GAP at market values (Oct-2026): gross debt about 24% of EV, net debt about 17%
    terminalGrowthPct: 4.0,           // nominal MXN: Banxico's 3% inflation target + about 1 pp of real growth
    exitMultiple: 11.0,               // about GAP's own NTM EV/EBITDA over the last five years (FactSet, peers.js)
    notes: {
      erp: { en: "mature-market implied ERP 4.2% (Damodaran, Jan-2026) + 0.8 pp; the M bond's yield already carries Mexico's spread", es: "prima madura implícita 4.2% (Damodaran, ene-2026) + 0.8 pp; el rendimiento del bono M ya incluye el riesgo país" },
      g: { en: "nominal pesos: 3% inflation target + about 1 pp of real growth", es: "pesos nominales: meta de inflación de 3% + alrededor de 1 pp de crecimiento real" },
      renew: { en: "annuity method: 0 = no value after the concession ends, 100 = perpetuity; extensions of up to 50 years are at the government's discretion (20-F)", es: "método de anualidad: 0 = sin valor tras el fin de la concesión, 100 = perpetuidad; prórrogas de hasta 50 años a discreción del gobierno (20-F)" },
    },
  },
  // Peer set for relative valuation. Multiples are placeholders until the FactSet connector is
  // authorized; see peers.js.
  peers: ["ASUR", "OMA", "AENA", "Fraport", "Flughafen Zürich", "Auckland International"],
};
