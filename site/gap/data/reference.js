// Hand-curated, slow-moving facts for the GAP model. Every block carries its source.
// Update by PR when a shareholders' meeting, a corporate transaction or a tariff/MDP review changes
// something (see tools/gap/README.md "Reference data"). Numbers here are NEVER derived from the
// auto-parsed statements; those live in financials.js / traffic.js / market.js.
window.GAP_REF = {
  updatedAt: "2026-09-29",
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
  // Shares outstanding after the CBX / AMP business combination (merger notarised 30-Apr-2026,
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
    mdp: { period: "2025–2029", capexMxnBn: 52, note: { en: "Approved Feb-2025: over Ps. 52 bn over five years; about 50% more terminal capacity, +45% inspection points, +25% aprons, +20% airfield across the 12 Mexican airports. 2026 capex guidance above Ps. 13 bn.", es: "Aprobado en feb-2025: más de Ps. 52 mil millones en cinco años; alrededor de 50% más capacidad de terminales, +45% puntos de inspección, +25% plataformas, +20% pistas y rodajes en los 12 aeropuertos mexicanos. Guía de capex 2026 superior a Ps. 13 mil millones." }, source: { en: "GAP release, 12-Feb-2025; La Jornada, 3-Feb-2026", es: "Comunicado de GAP, 12-feb-2025; La Jornada, 3-feb-2026" } },
    tua2026: { avgIncreasePct: 5, tijuanaPct: 2, note: { en: "Average +5% TUA (passenger charge) increase in 2026, +2% in Tijuana.", es: "Aumento promedio de 5% en la TUA (tarifa de uso de aeropuerto) en 2026, 2% en Tijuana." }, source: { en: "Milenio, Feb-2026 (CEO Raúl Revuelta)", es: "Milenio, feb-2026 (director general Raúl Revuelta)" } },
  },
  // Dividends approved at the Annual General Meeting (AGM), Ps. per share, paid in installments over the
  // following 12 months (payableUntil). The page and the validator compare dps with the exchange-recorded
  // installments in market.js since agmDate, so an unpaid balance is stated rather than read as a missing feed. Older years are shown from the exchange-recorded cash dividends in market.js
  // (Yahoo Finance) — cross-check against the 20-F Item 8 before quoting them.
  dividends: [
    { agmYear: 2025, agmDate: "2025-04-24", dps: 16.84, payableUntil: "2026-04-24", note: { en: "Paid in two installments of Ps. 8.42: ex-dates 27-May-2025 and 13-Aug-2025 (exchange record; Ps. 4,254 M each in the 2Q25 and 3Q25 cash-flow statements).", es: "Pagado en dos exhibiciones de Ps. 8.42: fechas ex 27-may-2025 y 13-ago-2025 (registro de bolsa; Ps. 4,254 M en cada uno de los flujos de efectivo del 2T25 y 3T25)." }, source: { en: "GAP release 25-Apr-2025 (AGM resolutions, item V); exchange dividend record", es: "Comunicado de GAP, 25-abr-2025 (resoluciones de la asamblea, punto V); registro de dividendos de la bolsa" }, sourceUrl: "https://www.globenewswire.com/news-release/2025/04/25/3068046/0/en/resolutions-adopted-at-the-annual-general-ordinary-and-extraordinary-shareholders-meeting-for-grupo-aeroportuario-del-pacifico-on-april-24-2025.html" },
    { agmYear: 2026, agmDate: "2026-04-22", dps: 20.80, payableUntil: "2027-04-22", note: { en: "Approved (item V): payable in one or more installments within the 12 months following 22-Apr-2026, to shares outstanding on each payment date. Declared in full in 2Q26 (Ps. 12,376 M, dividends payable at 30-Jun-2026); no installment had gone ex on the exchange as of the last market refresh.", es: "Aprobado (punto V): pagadero en una o más exhibiciones dentro de los 12 meses siguientes al 22-abr-2026, a las acciones en circulación en cada fecha de pago. Declarado íntegro en el 2T26 (Ps. 12,376 M en dividendos por pagar al 30-jun-2026); ninguna exhibición había pasado por la bolsa al último refresco de mercado." }, source: { en: "GAP release 24-Apr-2026 (AGM resolutions, item V); 2Q26 report (balance sheet and cash-flow statement)", es: "Comunicado de GAP, 24-abr-2026 (resoluciones de la asamblea, punto V); informe 2T26 (balance y flujo de efectivo)" }, sourceUrl: "https://www.globenewswire.com/news-release/2026/04/24/3280487/0/en/resolutions-adopted-at-the-annual-general-ordinary-shareholders-meeting-for-grupo-aeroportuario-del-pacifico-on-april-22-2026.html" },
  ],
  // Debt instruments — long-term certificados bursátiles (local bonds) and bank facilities. Fill /
  // refresh from the "Debt" table of the latest quarterly report; principal in Ps. million.
  debt: {
    ratings: [
      { agency: "Moody's Local MX", rating: "Aaa.mx", outlook: { en: "stable", es: "estable" }, scope: { en: "national scale, certificados bursátiles", es: "escala nacional, certificados bursátiles" }, source: { en: "Moody's Local rating report, 1-Apr-2026", es: "Informe de calificación de Moody's Local, 1-abr-2026" } },
      { agency: "S&P Global Ratings", rating: "mxAAA", outlook: { en: "stable", es: "estable" }, scope: { en: "national scale, certificados bursátiles", es: "escala nacional, certificados bursátiles" }, source: { en: "S&P, Mar-2026 (A21, 17-Mar-2026)", es: "S&P, mar-2026 (A21, 17-mar-2026)" } },
    ],
    // Every instrument outstanding at 30-Jun-2026 (FactSet Debt Capital Structure, GAPB-MX, quarterly detail at
    // 2026-06-30; amounts in Ps. million) with series names, coupons and maturities confirmed from GAP's own
    // issuance and repayment 6-Ks where one exists. Names marked inferred: true come from the issuance pattern of
    // that date (the 6-K for the sister tranche names only one series) and are shown with an asterisk.
    // Post-quarter events (the Ps. 8,000 M bank facilities of 11-Sep-2026 and the two September/October
    // maturities they repay) are recorded in `events` and shown under the table.
    instrumentsAsOf: "2026-06-30",
    instruments: [
      // --- certificados bursátiles (local bonds) ---
      { name: "GAP 21-V", type: "CB", issued: "2021-10-15", matures: "2026-10-09", principalMxn: 1500, rate: { en: "floating (TIIE-based)", es: "variable (sobre TIIE)" }, source: "6-K 11-Sep-2026 · FactSet", note: { en: "Repaid at maturity out of the Sep-2026 bank facilities.", es: "Se paga a su vencimiento con las líneas bancarias de sep-2026." } },
      { name: "GAP 22L", type: "CB", issued: "2022-09-26", matures: "2026-09-21", principalMxn: 2757.6, rate: { en: "floating (TIIE-based)", es: "variable (sobre TIIE)" }, source: "6-K 21-Oct-2022, 11-Sep-2026 · FactSet", note: { en: "Repaid at maturity (21-Sep-2026) out of the Sep-2026 bank facilities.", es: "Pagado a su vencimiento (21-sep-2026) con las líneas bancarias de sep-2026." } },
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
    // Events after instrumentsAsOf that change the table; the page prints them under it.
    events: [
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
      { date: "2026-04-30", en: "Merger agreement notarised; AMP and the intermediate CBX holding entities merge into GAP. Effective 1-May-2026.", es: "Se protocoliza el convenio de fusión; AMP y las tenedoras intermedias de CBX se fusionan en GAP. Efectiva el 1-May-2026." },
      { date: "2026-05-07", en: "Completion: 89,740,731 net new shares issued (595,018,195 total); remaining 25% of CBX purchased; GAP owns 100% of CBX and no longer pays the technical-assistance fee. Aena becomes a direct 6.55% holder.", es: "Cierre: se emiten 89,740,731 acciones netas nuevas (595,018,195 en total); se compra el 25% restante de CBX; GAP posee 100% de CBX y deja de pagar la cuota de asistencia técnica. Aena pasa a tener 6.55% directo." },
      { date: "2026-07-14", en: "2Q26 results are the first to consolidate CBX (two months): revenue ex-IFRIC 12 +4.9% (total revenue +3.7%), EBITDA +8.4%, net income +9.0% y/y.", es: "Los resultados del 2T26 son los primeros que consolidan CBX (dos meses): ingresos sin IFRIC 12 +4.9% (ingresos totales +3.7%), EBITDA +8.4%, utilidad neta +9.0% a/a." },
    ],
    facts: [
      { k: "newShares", label_en: "Net new shares issued", label_es: "Acciones netas emitidas", v: 89740731, fmt: "int" },
      { k: "cash25", label_en: "Cash for the remaining 25%", label_es: "Efectivo por el 25% restante", v: 487.5, fmt: "usdM" },
      { k: "sharesAfter", label_en: "Shares outstanding after", label_es: "Acciones en circulación después", v: 595018195, fmt: "int" },
      { k: "dilution", label_en: "Dilution to pre-deal holders", label_es: "Dilución para accionistas previos", v: 89740731 / 595018195, fmt: "pct" },
      { k: "cbxEbitda2024", label_en: "CBX EBITDA 2024 (press estimate)", label_es: "EBITDA de CBX 2024 (estimación de prensa)", v: 93.6, fmt: "usdM", source: "San Diego Business Journal" },
      { k: "tijPax2025", label_en: "Tijuana passengers 2025", label_es: "Pasajeros de Tijuana 2025", v: 13.0, fmt: "M", source: { en: "SDBJ; GAP traffic reports", es: "SDBJ; reportes de tráfico de GAP" } },
    ],
    sources: {
      en: [
        "GAP, 'Business combination of CBX and technical assistance services', 3-Nov-2025 (6-K)",
        "GAP, 'Shareholder approval …', 11-Dec-2025 (6-K)",
        "GAP, 'Issuance of bond certificates for Ps. 10,718.0 million', 1-Apr-2026 (6-K)",
        "GAP, 'Completion of business combination process of CBX …', 7-May-2026 (6-K)",
        "Aena, notice to the CNMV, 7-May-2026 (Infobae, El Economista)",
        "San Diego Business Journal, 'Cross Border Xpress has $100M growth agenda' (2025)",
      ],
      es: [
        "GAP, 'Combinación de negocios de CBX y de los servicios de asistencia técnica', 3-nov-2025 (6-K)",
        "GAP, 'Aprobación de los accionistas …', 11-dic-2025 (6-K)",
        "GAP, 'Emisión de certificados bursátiles por Ps. 10,718.0 millones', 1-abr-2026 (6-K)",
        "GAP, 'Conclusión del proceso de combinación de negocios de CBX …', 7-may-2026 (6-K)",
        "Aena, comunicación a la CNMV, 7-may-2026 (Infobae, El Economista)",
        "San Diego Business Journal, 'Cross Border Xpress has $100M growth agenda' (2025)",
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
    status_en: "Not yet placed as of 29-Sep-2026. Announced 8-May-2026 (GAP release of 9-May-2026, Form 6-K; the 2Q26 report repeats the date). GAP filed no completion or pricing notice in its releases harvested through 29-Sep-2026 (latest filing 11-Sep-2026); the 2Q26 report says the approval process with the authorities continues. Press only (not confirmed by a filing): the placement planned for 25-Jun-2026 on BIVA was postponed on 25-Jun-2026, and on 22-Sep-2026 GAP was reported to expect it in October 2026 (FGAP 26, about Ps. 10,200 M for 4.2% of each of the 12 Mexican concessionaires; roughly Ps. 3,680 M, 36% of the proceeds, for Guadalajara).",
    status_es: "Aún no colocada al 29-Sep-2026. Anunciada el 8-May-2026 (comunicado de GAP del 9-may-2026, Forma 6-K; el informe del 2T26 repite la fecha). GAP no presentó aviso de cierre ni de precio en sus comunicados recopilados hasta el 29-sep-2026 (último comunicado del 11-sep-2026); el informe del 2T26 dice que continúa el proceso de autorización ante las autoridades. Solo prensa (sin confirmar en un comunicado): la colocación prevista para el 25-jun-2026 en BIVA se pospuso el 25-jun-2026 y el 22-sep-2026 se informó que GAP la espera para octubre de 2026 (FGAP 26, unos Ps. 10,200 M por el 4.2% de cada una de las 12 concesionarias mexicanas; cerca de Ps. 3,680 M, 36% de los recursos, para Guadalajara).",
    sources: {
      en: [
        "GAP release 9-May-2026 (Form 6-K), initiation of the process to establish a FIBRA; BMV material event 1558742 (May-2026)",
        "GAP 2Q26 report, 14-Jul-2026 (Form 6-K): status of the CBFE approval process",
        "El Cronista, Axis Negocios and El CEO, coverage of the FGAP 26 offering (Jun–Jul 2026)",
        "Financial press via Yahoo Noticias, 'GAP pospone colocación de fibra E planeada para el 25 de junio' (25-Jun-2026) and 'En octubre saldrá la Fibra E de GAP' (22-Sep-2026)",
        "GAP releases harvested for this model through 29-Sep-2026 (latest 11-Sep-2026): no completion notice",
      ],
      es: [
        "Comunicado de GAP del 9-may-2026 (Forma 6-K), inicio del proceso para constituir una FIBRA; evento relevante BMV 1558742 (may-2026)",
        "Informe 2T26 de GAP, 14-jul-2026 (Forma 6-K): estado del proceso de autorización de los CBFE",
        "El Cronista, Axis Negocios y El CEO, cobertura de la oferta de FGAP 26 (jun–jul 2026)",
        "Prensa financiera vía Yahoo Noticias, 'GAP pospone colocación de fibra E planeada para el 25 de junio' (25-jun-2026) y 'En octubre saldrá la Fibra E de GAP' (22-sep-2026)",
        "Comunicados de GAP recopilados para este modelo hasta el 29-sep-2026 (último del 11-sep-2026): sin aviso de cierre",
      ],
    },
  },
  // Share repurchase authorisations (AGM item VI). The AGM cancels whatever is left of the prior year's
  // program and sets the maximum for the next 12 months.
  buyback: [
    { agmDate: "2025-04-24", maxMxnM: 2500, note: { en: "Unused balance canceled by the 22-Apr-2026 AGM.", es: "El saldo no utilizado se canceló en la asamblea del 22-abr-2026." }, source: { en: "GAP release 24-Apr-2026 (AGM resolutions, item VI)", es: "Comunicado de GAP 24-abr-2026 (resoluciones de la asamblea, punto VI)" } },
    { agmDate: "2026-04-22", maxMxnM: 2500, note: { en: "Maximum amount for repurchases of own shares in the 12 months from 22-Apr-2026 (Securities Market Law, art. 56-IV).", es: "Monto máximo para recompra de acciones propias en los 12 meses desde el 22-abr-2026 (Ley del Mercado de Valores, art. 56-IV)." }, source: { en: "GAP release 24-Apr-2026 (AGM resolutions, item VI)", es: "Comunicado de GAP 24-abr-2026 (resoluciones de la asamblea, punto VI)" } },
  ],
  // Fiscal years for which GAP published no guidance. Checked 29-Sep-2026 against every GAP release on
  // GlobeNewswire since 2016 (the harvester keeps every "guidance" release): none for 2020 or 2021, and the
  // 4Q19 (20-Feb-2020) and 4Q20 (25-Feb-2021) results carry no guidance table.
  noGuidance: [
    { fy: 2020, note: { en: "No guidance published (none in GAP's releases; 4Q19 report of 20-Feb-2020 has no guidance table).", es: "Sin guía publicada (no hay comunicado de guía; el informe 4T19 del 20-feb-2020 no trae tabla de guía)." } },
    { fy: 2021, note: { en: "No guidance published (none in GAP's releases; 4Q20 report of 25-Feb-2021 has no guidance table).", es: "Sin guía publicada (no hay comunicado de guía; el informe 4T20 del 25-feb-2021 no trae tabla de guía)." } },
  ],
  // Results calendar. The presentation PDF marks the next results date "confirmed" only when GAP has announced
  // it; set nextResults when the company publishes its calendar (date, plus the release it came from) and clear
  // it after the results are out. Without it the date is assumed from GAP's own release-lag history.
  calendar: {
    nextResults: null,   // e.g. { date: "2026-10-21", source: { title: "GAP announces 3Q26 results date", url: "https://...", date: "2026-10-01" } }
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
