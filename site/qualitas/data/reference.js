// Hand-curated reference data for the Quálitas model: company facts, share count, subsidiaries, ratings,
// dividends approved at each AGM, the VAT (IVA) matter, international expansion and the valuation
// defaults. Updated by reviewed commit when an event lands (AGM, rating action, material event).
// Figures quoted come from Quálitas' IR site (results reports, material events) and the BMV.
window.Q_REF = {
  updatedAt: "2026-09-22",
  company: {
    name: "Quálitas Controladora, S.A.B. de C.V.", short: "Quálitas", ticker: "Q*", bmv: "Q", bloomberg: "Q* MM", exchange: "BMV",
    sector: { es: "Seguros de automóviles (daños)", en: "Motor insurance (P&C)" },
    hq: "Ciudad de México", fiscalYearEnd: "12-31",
    accounting: { es: "Criterios contables de la CNSF (Circular Única de Seguros y Fianzas), no IFRS. Estados financieros consolidados de la controladora.", en: "CNSF accounting criteria (Circular Única de Seguros y Fianzas), not IFRS. Consolidated statements of the holding company." },
    description: {
      es: "Mayor aseguradora de autos de México desde 2007 (≈34% de participación) con un modelo verticalmente integrado: ≈28,800 agentes no exclusivos, 354 oficinas de servicio (ODQ), talleres, distribución de cristales y refacciones, telemática y venta de salvamentos. Presencia en El Salvador, Costa Rica, Estados Unidos, Perú y Colombia, y Quálitas Salud como nueva línea.",
      en: "Mexico's largest motor insurer since 2007 (≈34% market share) with a vertically integrated model: ≈28,800 non-exclusive agents, 354 service offices (ODQs), repair shops, glass and spare-parts distribution, telematics and salvage sales. Present in El Salvador, Costa Rica, the United States, Peru and Colombia, plus Quálitas Salud as a new line.",
    },
    ir: "https://qinversionistas.qualitas.com.mx/ES/",
  },
  // Shares: 400,000,000 issued; the shares outstanding used for per-share figures come from the IR workbook
  // ("Total de acciones en circulación") in financials.js (issued less treasury shares). `treasury` is the
  // figure quoted in the latest results report.
  shares: { issued: 400000000, asOf: "2026-06-30", treasuryApprox: 6200000, note: { es: "≈6.2 millones de acciones en tesorería al 2T26 con Ps. 784 M remanentes en el fondo de recompra (informe 2T26).", en: "≈6.2 million treasury shares at 2Q26 with Ps. 784 M left in the buyback fund (2Q26 report)." } },
  subsidiaries: [
    { k: "mx", name: "Quálitas Compañía de Seguros (México)", country: "MX", type: "insurer", note: { es: "≈95% de la prima emitida; líder del ramo de autos desde 2007.", en: "≈95% of written premiums; motor-line leader since 2007." } },
    { k: "es", name: "Quálitas El Salvador (QES)", country: "SV", type: "insurer", note: { es: "≈15% de participación en autos en El Salvador.", en: "≈15% motor market share in El Salvador." } },
    { k: "cr", name: "Quálitas Costa Rica (QCR)", country: "CR", type: "insurer", note: { es: "≈16% de participación; la subsidiaria internacional de mayor crecimiento.", en: "≈16% market share; the fastest-growing international subsidiary." } },
    { k: "us", name: "Quálitas Insurance Company (QIC)", country: "US", type: "insurer", note: { es: "Desde 2025 sale del negocio doméstico y se concentra en productos transfronterizos y binacionales; prima −80% a/a en 2T26.", en: "Since 2025 exiting domestic business to focus on cross-border and binational products; premiums −80% y/y in 2Q26." } },
    { k: "pe", name: "Quálitas Perú (QP)", country: "PE", type: "insurer", note: { es: "≈9% de participación en autos.", en: "≈9% motor market share." } },
    { k: "co", name: "Quálitas Colombia (QCol)", country: "CO", type: "insurer", since: "2025-03", note: { es: "Primeras pólizas en el 1T25; 20 oficinas al 2T26 (meta 25 al cierre de 2026).", en: "First policies in 1Q25; 20 offices at 2Q26 (target 25 by end-2026)." } },
    { k: "verticals", name: { es: "Verticales", en: "Verticals" }, type: "services", note: { es: "Quálitas Salud (2023), Autos y Salvamentos, O&T (talleres), Activos Jal (inmuebles), DCT y Flekk (tecnología y telemática), Roto Cristales y Partes (cristales y refacciones, adquirida en 2025).", en: "Quálitas Salud (2023), Autos y Salvamentos (salvage), O&T (repair shops), Activos Jal (real estate), DCT and Flekk (technology and telematics), Roto Cristales y Partes (glass and spare parts, acquired in 2025)." } },
  ],
  ratings: [
    { agency: "Fitch Ratings", date: "2025-12-08", entity: "Quálitas Compañía de Seguros / QIC", rating: "BBB (IFS internacional) · AAA(mex)", outlook: { es: "Estable", en: "Stable" }, holding: "Quálitas Controladora: IDR BBB- · AAA(mex)", source: { url: "https://qinversionistas.qualitas.com.mx/ES/eventos-relevantes", es: "evento relevante 8 dic 2025", en: "material event 8 Dec 2025" } },
    { agency: "AM Best", date: "2025-10-22", entity: "Quálitas Compañía de Seguros", rating: "FSR B+ (Good) · ICR bbb- · NSR aa-.MX", outlook: { es: "Negativa (antes estable): dividendos elevados limitan el crecimiento orgánico del capital y sube el apalancamiento de suscripción", en: "Negative (from stable): sizeable dividends limit organic capital growth and underwriting leverage is trending up" }, source: { url: "https://qinversionistas.qualitas.com.mx/ES/eventos-relevantes", es: "evento relevante 22 oct 2025", en: "material event 22 Oct 2025" } },
    { agency: "S&P National Ratings", date: "2026-05-28", entity: "Quálitas Compañía de Seguros", rating: "mxAAA (fortaleza financiera) · mxAAA (crediticia)", outlook: { es: "Estable", en: "Stable" }, source: { url: "https://qinversionistas.qualitas.com.mx/ES/eventos-relevantes", es: "evento relevante 28 may 2026", en: "material event 28 May 2026" } },
  ],
  analysts: [{ firm: "Citigroup", analyst: "Arnon Shirazi", date: "2026-06-07", target: 180, rating: "Neutral", source: { es: "evento relevante 8 jun 2026 (inicio de cobertura)", en: "material event 8 Jun 2026 (initiation)" } }],
  // Dividends approved at the annual general meeting (Ps. per share, paid in two instalments). Policy: 40–90% of net income.
  dividendPolicy: { lo: 40, hi: 90 },
  dividends: [
    { agmYear: 2023, agmDate: null, dps: 5.0, payoutPct: 90, note: { es: "Dos exhibiciones de Ps. 2.5 (la segunda el 9 nov 2023); 90% de la utilidad de 2022.", en: "Two instalments of Ps. 2.5 (the second on 9 Nov 2023); 90% of 2022 net income." }, source: { es: "conferencia 3T23", en: "3Q23 call" } },
    { agmYear: 2024, agmDate: "2024-04-25", dps: 8.0, payoutPct: 84, buybackFundMxnM: 800, note: { es: "+60% vs 2023; dos exhibiciones; nuevo fondo de recompra de Ps. 800 M.", en: "+60% vs 2023; two instalments; new Ps. 800 M buyback fund." }, source: { es: "informe 1T24", en: "1Q24 report" } },
    { agmYear: 2025, agmDate: "2025-04-29", dps: 10.0, payoutPct: 78, buybackFundMxnM: 800, note: { es: "+25% vs 2024; dos exhibiciones; fondo de recompra renovado por Ps. 800 M.", en: "+25% vs 2024; two instalments; buyback fund renewed at Ps. 800 M." }, source: { es: "informe 1T25 / conferencia 1T25", en: "1Q25 report / 1Q25 call" } },
    { agmYear: 2026, agmDate: "2026-04-29", dps: 9.0, payoutPct: 71, buybackFundMxnM: 800, instalments: ["2026-05-13", "2026-11-05"], note: { es: "71% de la utilidad de 2025 (afectada por el IVA); Ps. 4.5 el 13 may 2026 y Ps. 4.5 el 5 nov 2026; fondo de recompra renovado por Ps. 800 M.", en: "71% of 2025 net income (hit by the VAT charge); Ps. 4.5 on 13 May 2026 and Ps. 4.5 on 5 Nov 2026; buyback fund renewed at Ps. 800 M." }, source: { es: "informe 1T26 y acuerdos de asamblea (BMV)", en: "1Q26 report and AGM resolutions (BMV)" } },
  ],
  // The VAT (IVA) matter: creditability of VAT paid to claims suppliers.
  vat: {
    // One-off 4Q25 charge, used by the "exclude the VAT charge" switch on the statements: Ps. 2,406 M added to
    // claims cost (loss ratio) and Ps. 1,683 M taken off net income (the difference is the tax effect).
    adjust: { quarter: "2025Q4", claimsMxnM: 2406, netIncomeMxnM: 1683 },
    facts: [
      { v: 2406, fmt: "mxnM", label_es: "Cargo no recurrente en el costo de siniestros del 4T25", label_en: "One-off charge to 4Q25 claims cost" },
      { v: 1683, fmt: "mxnM", label_es: "Impacto en la utilidad neta 2025 (Ps. 6,778 M sin IVA vs Ps. 5,095 M reportados)", label_en: "Hit to 2025 net income (Ps. 6,778 M ex-VAT vs Ps. 5,095 M reported)" },
      { v: 320, fmt: "bp", label_es: "Puntos base del índice de siniestralidad del 1S26 atribuibles al IVA", label_en: "Basis points of the 1H26 loss ratio attributable to VAT" },
      { v: 20.2, fmt: "pct", label_es: "ROE 12M 2025 reportado (26.9% sin el IVA)", label_en: "Reported 2025 12M ROE (26.9% ex-VAT)" },
    ],
    timeline: [
      { date: "2024-01-01", es: "La autoridad fiscal cuestiona en auditorías la acreditación del IVA que los proveedores de siniestros trasladan a las aseguradoras; Quálitas informa trimestralmente que no hay novedades.", en: "The tax authority questions in audits whether insurers may credit the VAT charged by claims suppliers; Quálitas reports quarterly that there is no news." },
      { date: "2025-10-17", es: "Tras reuniones entre la AMIS y las autoridades, se presenta al Congreso una reserva a la Ley de Ingresos 2026 que aclara el tratamiento y elimina contingencias hasta 2024.", en: "After AMIS–authority meetings, an amendment to the 2026 Revenue Law is submitted to Congress clarifying the treatment and eliminating contingencies up to 2024." },
      { date: "2025-10-29", es: "El Congreso aprueba la modificación: el IVA de proveedores de siniestros deja de ser acreditable desde 2026; las aseguradoras corrigen 2025 tratándolo como no acreditable.", en: "Congress approves the amendment: VAT from claims suppliers is no longer creditable from 2026; insurers correct 2025 treating it as non-creditable." },
      { date: "2025-11-10", es: "El Consejo de Quálitas decide adherirse; estima un impacto no recurrente de ≈Ps. 2,000 M en la utilidad neta de 2025 (evento relevante).", en: "Quálitas' Board decides to adhere; estimated one-off impact ≈Ps. 2,000 M on 2025 net income (material event)." },
      { date: "2026-01-28", es: "4T25: cargo de Ps. 2,406 M al costo de siniestros; utilidad neta trimestral de −Ps. 190 M (Ps. 1,493 M sin el efecto) y anual de Ps. 5,095 M (Ps. 6,778 M sin el efecto).", en: "4Q25: Ps. 2,406 M charged to claims cost; quarterly net income −Ps. 190 M (Ps. 1,493 M ex-effect) and full-year Ps. 5,095 M (Ps. 6,778 M ex-effect)." },
      { date: "2026-04-22", es: "1T26: el IVA ya vive en el costo medio de siniestros (≈290–320 pb del índice); la tarifa media sube cerca de la inflación y Quálitas absorbe gran parte del impacto.", en: "1Q26: VAT now sits in the average claim cost (≈290–320 bp of the loss ratio); average tariffs rise close to inflation and Quálitas absorbs most of the impact." },
    ],
    sources: { es: ["evento relevante 10 nov 2025", "informe 4T25 (28 ene 2026)", "informes 1T26 y 2T26", "conferencia 3T25"], en: ["material event 10 Nov 2025", "4Q25 report (28 Jan 2026)", "1Q26 and 2Q26 reports", "3Q25 call"] },
  },
  international: {
    timeline: [
      { date: "2023-10-19", es: "Quálitas anuncia diez avenidas de crecimiento dentro del ecosistema asegurador y la entrada orgánica a Colombia (esperada para el 1S24); Quálitas Salud ya opera.", en: "Quálitas outlines ten growth avenues inside the insurance ecosystem and an organic entry into Colombia (expected 1H24); Quálitas Salud already operating." },
      { date: "2024-10-17", es: "Colombia avanza en la autorización final; inicio de operaciones previsto en 3–4 meses. QIC (EUA) reserva por siniestros de años anteriores.", en: "Colombia progresses towards final authorisation; operations expected within 3–4 months. QIC (US) books prior-year claims reserves." },
      { date: "2025-04-22", es: "Quálitas Colombia suscribe sus primeras pólizas; QIC abandona el negocio doméstico (55% de su cartera es transfronteriza/binacional). Adquisición de una distribuidora de cristales y refacciones.", en: "Quálitas Colombia writes its first policies; QIC drops domestic underwriting (55% of its book is cross-border/binational). Acquisition of a glass and spare-parts distributor." },
      { date: "2025-10-21", es: "Colombia alcanza las 14 oficinas previstas para 2025 con más de 900 agentes; QIC −30% en primas por la salida del negocio doméstico.", en: "Colombia reaches the 14 offices planned for 2025 with 900+ agents; QIC premiums −30% on the domestic exit." },
      { date: "2026-07-21", es: "2T26: LATAM +26% en pesos (+39% en dólares); Colombia con 20 oficinas (meta 25) y US$ 11.4 M de primas; QIC −80%; las subsidiarias internacionales suman ≈5% de la prima.", en: "2Q26: LATAM +26% in pesos (+39% in dollars); Colombia with 20 offices (target 25) and US$ 11.4 M of premiums; QIC −80%; international subsidiaries ≈5% of premiums." },
    ],
    sources: { es: ["informes trimestrales 1T25–2T26", "conferencias 3T23, 3T24, 1T25, 3T25"], en: ["quarterly reports 1Q25–2Q26", "3Q23, 3Q24, 1Q25 and 3Q25 calls"] },
  },
  // Valuation defaults for the residual-income (P/BV–ROE) model. All editable on the page.
  valuation: {
    roePct: 20, payoutPct: 70, growthPct: 5.0, terminalRoePct: 18, erpPct: 6.0, betaFloor: 0.5, betaCap: 1.2, years: 5,
    notes: { es: "ROE de 20% = expectativa de la administración para 2026 ('cerca de 20%') y piso de su rango de largo plazo 20–25%; pago de 70% = promedio de las asambleas 2024–2026; g = inflación de largo plazo (≈3.5%) más crecimiento real del parque asegurado.", en: "20% ROE = management's 2026 expectation ('close to 20%') and the floor of its 20–25% long-term range; 70% payout = average of the 2024–2026 AGMs; g = long-run inflation (≈3.5%) plus real growth of the insured fleet." },
  },
  peers: { list: ["Progressive (PGR)", "Allstate (ALL)", "Porto Seguro (PSSA3)", "Mapfre (MAP)", "Admiral (ADM)"], note: { es: "No hay comparables mexicanos líquidos; GNP y otras aseguradoras nacionales no tienen bursatilidad.", en: "There are no liquid Mexican comparables; GNP and other domestic insurers are illiquid." } },
  sources: [
    { t: { es: "Quálitas — Relación con inversionistas", en: "Quálitas — Investor relations" }, d: { es: "Informes trimestrales, reportes SIFIC, Datos Financieros Históricos (xlsx), eventos relevantes, transcripciones.", en: "Quarterly reports, SIFIC filings, historical data workbook, material events, transcripts." }, u: "https://qinversionistas.qualitas.com.mx/ES/" },
    { t: { es: "BMV — Emisora Q", en: "BMV — Issuer Q" }, d: { es: "Eventos relevantes, acuerdos de asamblea, información financiera trimestral.", en: "Material events, AGM resolutions, quarterly financial information." }, u: "https://www.bmv.com.mx/es/emisoras/informacion/Q-6301-CGEN_CAPIT" },
    { t: { es: "CNSF — Comisión Nacional de Seguros y Fianzas", en: "CNSF — insurance regulator" }, d: { es: "Criterios contables, requerimiento de capital de solvencia (RCS) y estadísticas del sector.", en: "Accounting criteria, solvency capital requirement (RCS) and sector statistics." }, u: "https://www.gob.mx/cnsf" },
    { t: "AMIS / AMDA", d: { es: "Índice combinado de la industria de autos (AMIS) y ventas de vehículos nuevos (AMDA) citados por Quálitas.", en: "Motor-industry combined ratio (AMIS) and new-vehicle sales (AMDA) as cited by Quálitas." }, u: "https://www.amis.com.mx/" },
    { t: "Yahoo Finance", d: { es: "Cierres diarios de Q.MX, ^MXX, PGR, ALL, PSSA3.SA, MAP.MC y dividendos en efectivo de Q.MX.", en: "Daily closes for Q.MX, ^MXX, PGR, ALL, PSSA3.SA, MAP.MC and Q.MX cash dividends." }, u: "https://finance.yahoo.com/quote/Q.MX/" },
    { t: "FRED — Federal Reserve Bank of St. Louis", d: "USD/MXN (DEXMXUS), US 10-yr (DGS10), México 10-yr (IRLTLT01MXM156N, OECD).", u: "https://fred.stlouisfed.org/series/DEXMXUS" },
  ],
};
