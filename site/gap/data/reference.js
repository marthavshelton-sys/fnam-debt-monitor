// Hand-curated, slow-moving facts for the GAP model. Every block carries its source.
// Update by PR when a shareholders' meeting, a corporate transaction or a tariff/MDP review changes
// something (see tools/gap/README.md "Reference data"). Numbers here are NEVER derived from the
// auto-parsed statements; those live in financials.js / traffic.js / market.js.
window.GAP_REF = {
  updatedAt: "2026-09-24",
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
  // Dividends approved at the Annual General Meeting (AGM), Ps. per share, paid in instalments over the
  // following 12 months. Older years are shown from the exchange-recorded cash dividends in market.js
  // (Yahoo Finance) — cross-check against the 20-F Item 8 before quoting them.
  dividends: [
    { agmYear: 2025, agmDate: "2025-04-24", dps: 16.84, note: { en: "Paid in two instalments (Jul-2025, Dec-2025).", es: "Pagado en dos exhibiciones (jul-2025 y dic-2025)." }, source: { en: "GAP release 24-Apr-2025 (AGM resolutions)", es: "Comunicado de GAP, 24-abr-2025 (resoluciones de la asamblea)" } },
    { agmYear: 2026, agmDate: "2026-04-22", dps: 20.80, note: { en: "Board proposal of Ps. 20.80 per share for the 22-Apr-2026 AGM (≈5% yield on the 9-Mar-2026 price of Ps. 415.73); confirm the approved amount in the AGM resolutions.", es: "Propuesta del consejo de Ps. 20.80 por acción para la asamblea del 22-abr-2026 (≈5% de rendimiento sobre el precio de Ps. 415.73 del 9-mar-2026); confirmar el monto aprobado en las resoluciones de la asamblea." }, source: { en: "GAP AGM call, Mar-2026 (Axis Negocios)", es: "Convocatoria a la asamblea de GAP, mar-2026 (Axis Negocios)" } },
  ],
  // Debt instruments — long-term certificados bursátiles (local bonds) and bank facilities. Fill /
  // refresh from the "Debt" table of the latest quarterly report; principal in Ps. million.
  debt: {
    ratings: [
      { agency: "Moody's Local MX", rating: "Aaa.mx", outlook: { en: "stable", es: "estable" }, scope: { en: "national scale, certificados bursátiles", es: "escala nacional, certificados bursátiles" }, source: { en: "Moody's Local rating report, 1-Apr-2026", es: "Informe de calificación de Moody's Local, 1-abr-2026" } },
      { agency: "S&P Global Ratings", rating: "mxAAA", outlook: { en: "stable", es: "estable" }, scope: { en: "national scale, certificados bursátiles", es: "escala nacional, certificados bursátiles" }, source: { en: "S&P, Mar-2026 (A21, 17-Mar-2026)", es: "S&P, mar-2026 (A21, 17-mar-2026)" } },
    ],
    instruments: [
      { name: "GAP 26", type: "CB", issued: "2026-03-27", matures: "2029-03-27", principalMxn: 2767, rate: { en: "TIIE + 45 bp (28-day)", es: "TIIE + 45 pb (28 días)" }, source: "GAP 1-Apr-2026" },
      { name: "GAP 26-2", type: "CB", issued: "2026-03-27", matures: "2036-03-27", principalMxn: 7951, rate: { en: "9.87% fixed (182-day)", es: "9.87% fija (182 días)" }, source: "GAP 1-Apr-2026" },
      { name: { en: "Bank credit facilities (Ps. 8,000 M)", es: "Líneas de crédito bancarias (Ps. 8,000 M)" }, type: { en: "loan", es: "préstamo" }, issued: "2026-09-11", matures: null, principalMxn: 8000, rate: { en: "n/a", es: "n/d" }, note: { en: "Executed 11-Sep-2026 to refinance maturities and fund the PMD; terms in the 6-K.", es: "Firmadas el 11-sep-2026 para refinanciar vencimientos y financiar el PMD; términos en el 6-K." }, source: "GAP 11-Sep-2026" },
    ],
    instrumentsNote: {
      en: "Outstanding older series (GAP 17, GAP 19, GAP 20, GAP 21, GAP 22, GAP 23, GAP 24 and GAP 25 tranches) and the Jamaican USD facilities are listed in the quarterly report's debt table and in the 20-F, Item 5.B; this table is to be completed from the latest report. GAP 23L (Ps. 1,120 M) was repaid at maturity in Mar-2026.",
      es: "Las series anteriores vigentes (tramos GAP 17, GAP 19, GAP 20, GAP 21, GAP 22, GAP 23, GAP 24 y GAP 25) y las líneas en dólares de Jamaica aparecen en la tabla de deuda del reporte trimestral y en la Forma 20-F, punto 5.B; esta tabla está por completarse con el reporte más reciente. GAP 23L (Ps. 1,120 M) se pagó a su vencimiento en mar-2026.",
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
      { date: "2026-07-14", en: "2Q26 results are the first to consolidate CBX (two months) — revenue +3.7%, EBITDA +8.4%, net income +9.0% y/y.", es: "Los resultados del 2T26 son los primeros que consolidan CBX (dos meses): ingresos +3.7%, EBITDA +8.4%, utilidad neta +9.0% a/a." },
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
    name: "FIBRA GAP (Fibra E)",
    ticker: "FGAP 26",
    exchange: "BIVA (Bolsa Institucional de Valores)",
    targetMxnM: 10195,
    certificates: 101950000,
    priceMxn: 100,
    stakePct: 4.2,
    status_en: "Not yet placed as of 24-Sep-2026. Announced 8-May-2026; the first placement, planned for 25-Jun-2026 on BIVA, was postponed on 25-Jun-2026 with no new date. On 22-Sep-2026 the financial press reported that GAP now expects to place it in October 2026 (FGAP 26, about Ps. 10,200 M for 4.2% of each of the 12 Mexican concessionaires; roughly Ps. 3,680 M, 36% of the proceeds, earmarked for Guadalajara). No completion notice appears on GAP's material-events page or in its Form 6-K filings through 14-Sep-2026.",
    status_es: "Aún no colocada al 24-Sep-2026. Anunciada el 8-May-2026; la primera colocación, prevista para el 25-Jun-2026 en BIVA, se pospuso el 25-Jun-2026 sin nueva fecha. El 22-Sep-2026 la prensa financiera informó que GAP prevé colocarla en octubre de 2026 (FGAP 26, unos Ps. 10,200 M por el 4.2% de cada una de las 12 concesionarias mexicanas; cerca de Ps. 3,680 M, 36% de los recursos, para Guadalajara). No hay aviso de cierre en los eventos relevantes de GAP ni en sus Formas 6-K hasta el 14-Sep-2026.",
    sources: {
      en: [
        "GAP, material event on the constitution of FIBRA GAP, BMV eventemi 1558742 (May-2026)",
        "El Universal, 'GAP inicia proceso para crear fideicomiso; prevé inversiones por 40 mil mdp'",
        "El Cronista, Axis Negocios and El CEO, coverage of the FGAP 26 offering (Jun–Jul 2026)",
        "Financial press via Yahoo Noticias, 'GAP pospone colocación de fibra E planeada para el 25 de junio' (25-Jun-2026) and 'En octubre saldrá la Fibra E de GAP' (22-Sep-2026)",
        "GAP material events page and SEC EDGAR filing index, checked 24-Sep-2026 (no completion notice)",
      ],
      es: [
        "GAP, evento relevante sobre la constitución de FIBRA GAP, BMV eventemi 1558742 (may-2026)",
        "El Universal, 'GAP inicia proceso para crear fideicomiso; prevé inversiones por 40 mil mdp'",
        "El Cronista, Axis Negocios y El CEO, cobertura de la oferta de FGAP 26 (jun–jul 2026)",
        "Prensa financiera vía Yahoo Noticias, 'GAP pospone colocación de fibra E planeada para el 25 de junio' (25-jun-2026) y 'En octubre saldrá la Fibra E de GAP' (22-sep-2026)",
        "Página de eventos relevantes de GAP e índice de la SEC (EDGAR), revisados el 24-sep-2026 (sin aviso de cierre)",
      ],
    },
  },
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
