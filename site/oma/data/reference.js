// Slow-moving reference facts for the OMA model. Every entry carries its source; edit by hand or via the
// weekday routine when a release changes a fact (dividends, debt, share count, MDP, VINCI).
window.OMA_REF = {
  updatedAt: "2026-09-23",
  company: {
    name: "Grupo Aeroportuario del Centro Norte, S.A.B. de C.V.",
    short: "OMA",
    tickers: { bmv: "OMA (serie B)", nasdaq: "OMAB (ADS)" },
    adsRatio: 8,
    fiscalYearEnd: "12-31",
    reportingCurrency: "MXN",
    accounting: {
      en: "IFRS (IFRIC 12: construction of concession assets is booked as construction revenue and cost at zero margin). OMA reports Adjusted EBITDA = EBITDA − construction revenue + construction cost + major-maintenance provision, with the margin over aeronautical + non-aeronautical revenue; that is the `ebitda` series on this page.",
      es: "IFRS (IFRIC 12: la construcción de activos concesionados se registra como ingreso y costo de construcción sin margen). OMA reporta EBITDA ajustado = EBITDA − ingresos de construcción + costo de construcción + provisión de mantenimiento mayor, con margen sobre ingresos aeronáuticos + no aeronáuticos; esa es la serie `ebitda` de esta página."
    },
    ir: "https://ir.oma.aero/en/"
  },
  shares: {
    total: 386169425,
    asOf: "2026-06-30",
    note: {
      en: "Weighted average shares outstanding printed in the 2Q26 income statement (unchanged since 2024). The exchange-recorded dividend per share (Ps. 6.2803 for the May-2026 instalment of Ps. 2,450 M) implies about 390.1 M shares entitled to the payment; the difference is treasury shares.",
      es: "Promedio ponderado de acciones en circulación del estado de resultados del 2T26 (sin cambio desde 2024). El dividendo por acción registrado en bolsa (Ps. 6.2803 por la exhibición de mayo de 2026 de Ps. 2,450 M) implica unos 390.1 M de acciones con derecho al pago; la diferencia son acciones en tesorería."
    },
    history: [
      { asOf: "2018-01-01", total: 386169425, note: { en: "weighted average used for EPS in the quarterly reports (per-share history is approximate before 2024)", es: "promedio ponderado usado para la UPA en los informes trimestrales (historia por acción aproximada antes de 2024)" } }
    ],
    holders: [
      { name: "VINCI Airports (via a subsidiary)", pct: 29.99, note: { en: "Indirect 29.99% stake acquired from Fintech Advisory affiliates; closing announced 7-Dec-2022. OMA is part of VINCI Airports since December 2022 and pays it a technical-assistance fee linked to EBITDA (Ps. 69.0 M in 2Q26).", es: "Participación indirecta de 29.99% adquirida a afiliadas de Fintech Advisory; cierre anunciado el 7-dic-2022. OMA forma parte de VINCI Airports desde diciembre de 2022 y le paga una cuota de asistencia técnica ligada al EBITDA (Ps. 69.0 M en el 2T26)." }, source: { en: "OMA 4Q22 report (16-Feb-2023); OMA release 6-Feb-2026; OMA 2Q26 report", es: "Informe 4T22 de OMA (16-feb-2023); comunicado de OMA 6-feb-2026; informe 2T26 de OMA" } }
    ],
    source: { en: "OMA 2Q26 report (27-Jul-2026)", es: "Informe 2T26 de OMA (27-jul-2026)" }
  },
  concessions: [
    { scope: "13 airports in central and northern Mexico", scopeEs: "13 aeropuertos en el centro y norte de México", granted: "1998", expires: "2048", years: 50, note: { en: "50-year concessions granted by the Mexican federal government in 1998 (SICT/AFAC), extendable at the government's discretion; the term is stated in the Form 20-F, not in the archived releases. Monterrey is the hub; Acapulco, Mazatlán and Zihuatanejo are tourist destinations; Ciudad Juárez and Reynosa are border cities.", es: "Concesiones a 50 años otorgadas por el gobierno federal en 1998 (SICT/AFAC), prorrogables a discreción del gobierno; el plazo consta en la Forma 20-F, no en los comunicados archivados. Monterrey es el eje; Acapulco, Mazatlán y Zihuatanejo son destinos turísticos; Ciudad Juárez y Reynosa, ciudades fronterizas." }, source: { en: "OMA Form 20-F", es: "Forma 20-F de OMA" } }
  ],
  regulation: {
    updatedAt: "2026-09-22",
    mdp: {
      period: "2026–2030", capexMxnM: 16005,
      byYear: { 2026: 1151.9, 2027: 2466.0, 2028: 3904.3, 2029: 4279.8, 2030: 4203.0 },
      note: { en: "Committed investments of Ps. 16,005 M (December-2024 pesos) approved by SICT/AFAC on 18-Dec-2025 for the 13 airports; Monterrey Ps. 7,969 M (50%). Maximum tariffs per workload unit fall 0.8% a year in real terms (efficiency factor).", es: "Inversiones comprometidas de Ps. 16,005 M (pesos de diciembre de 2024) aprobadas por la SICT/AFAC el 18-dic-2025 para los 13 aeropuertos; Monterrey Ps. 7,969 M (50%). Las tarifas máximas por unidad de tráfico bajan 0.8% anual en términos reales (factor de eficiencia)." },
      source: { en: "OMA release 18-Dec-2025", es: "Comunicado de OMA 18-dic-2025" }
    },
    facts: [
      { label: { es: "Guía formal", en: "Formal guidance" }, value: { es: "No publica; comenta el entorno en la conferencia trimestral.", en: "None published; the outlook is discussed on the quarterly call." }, source: { es: "Informes trimestrales", en: "Quarterly reports" } },
      { label: { es: "PMD 2026–2030: inversión comprometida", en: "MDP 2026–2030: committed investment" }, value: { es: "Ps. 16,005 M (pesos de dic-2024): 1,152 / 2,466 / 3,904 / 4,280 / 4,203 M por año", en: "Ps. 16,005 M (Dec-2024 pesos): 1,152 / 2,466 / 3,904 / 4,280 / 4,203 M per year" }, source: { es: "Comunicado 18-dic-2025", en: "Release 18-Dec-2025" } },
      { label: { es: "PMD: Monterrey", en: "MDP: Monterrey" }, value: { es: "Ps. 7,969 M (50% del total); Culiacán 1,207 M, Ciudad Juárez 1,186 M, Mazatlán 1,164 M", en: "Ps. 7,969 M (50% of the total); Culiacán 1,207 M, Ciudad Juárez 1,186 M, Mazatlán 1,164 M" }, source: { es: "Comunicado 18-dic-2025", en: "Release 18-Dec-2025" } },
      { label: { es: "Tarifas máximas 2026–2030", en: "Maximum tariffs 2026–2030" }, value: { es: "Por unidad de tráfico, pesos de dic-2024, −0.8% real anual (p. ej. Acapulco Ps. 433.00 en 2026 → 419.31 en 2030; Culiacán 378.34 → 366.38)", en: "Per workload unit, Dec-2024 pesos, −0.8% real a year (e.g. Acapulco Ps. 433.00 in 2026 → 419.31 in 2030; Culiacán 378.34 → 366.38)" }, source: { es: "Comunicado 18-dic-2025", en: "Release 18-Dec-2025" } },
      { label: { es: "Inversiones PMD y estratégicas 2T26 / 6M26", en: "MDP and strategic investments 2Q26 / 6M26" }, value: { es: "Ps. 949 M (844 mejoras a activos concesionados, 21 mantenimiento mayor, 84 estratégicas) / Ps. 1,554 M (1T26 605 + 2T26 949; +5.2% vs. 6M25 de 1,477)", en: "Ps. 949 M (844 improvements to concession assets, 21 major maintenance, 84 strategic) / Ps. 1,554 M (1Q26 605 + 2Q26 949; +5.2% vs. 6M25 of 1,477)" }, source: { es: "Informes 1T26 y 2T26 (las columnas 6M de la tabla resumen del 2T26 repiten las cifras anuales 2024/2025)", en: "1Q26 and 2Q26 reports (the 6M columns of the 2Q26 summary table repeat the full-year 2024/2025 figures)" } },
      { label: { es: "Dividendo 2026", en: "2026 dividend" }, value: { es: "Ps. 4,900 M en dos exhibiciones (≤31-may y ≤30-nov-2026); reserva de recompra Ps. 1,500 M", en: "Ps. 4,900 M in two instalments (by 31-May and 30-Nov-2026); buyback reserve Ps. 1,500 M" }, source: { es: "Asamblea 24-abr-2026", en: "AGM 24-Apr-2026" } },
      { label: { es: "Bonos ligados a sostenibilidad", en: "Sustainability-linked bonds" }, value: { es: "Meta (SPT) cumplida: −88% de emisiones alcance 1 y 2 por pasajero vs. 2018 (meta −58%)", en: "Target (SPT) met: −88% scope 1 and 2 emissions per passenger vs. 2018 (target −58%)" }, source: { es: "Comunicado 25-jun-2026", en: "Release 25-Jun-2026" } }
    ]
  },
  dividends: [
    { agmYear: 2024, agmDate: "2024-04-26", dps: 10.89, note: { en: "Ps. 4,250 M in two instalments (May-2024 and Nov-2024); per share as recorded by the exchange (2 × Ps. 5.4472).", es: "Ps. 4,250 M en dos exhibiciones (may-2024 y nov-2024); por acción según el registro de la bolsa (2 × Ps. 5.4472)." }, source: { en: "OMA release 26-Apr-2024; Yahoo Finance", es: "Comunicado de OMA 26-abr-2024; Yahoo Finance" } },
    { agmYear: 2025, agmDate: "2025-04-25", dps: 11.54, note: { en: "Ps. 4,500 M in two instalments (May-2025 and Nov-2025); 2 × Ps. 5.7676 per share.", es: "Ps. 4,500 M en dos exhibiciones (may-2025 y nov-2025); 2 × Ps. 5.7676 por acción." }, source: { en: "OMA release 25-Apr-2025; Yahoo Finance", es: "Comunicado de OMA 25-abr-2025; Yahoo Finance" } },
    { agmYear: 2026, agmDate: "2026-04-24", dps: 12.56, note: { en: "Ps. 4,900 M in two instalments: Ps. 2,450 M paid in May-2026 (Ps. 6.2803 per share recorded) and Ps. 2,450 M due by 30-Nov-2026 (assumed equal per share).", es: "Ps. 4,900 M en dos exhibiciones: Ps. 2,450 M pagados en may-2026 (Ps. 6.2803 por acción registrados) y Ps. 2,450 M a más tardar el 30-nov-2026 (se asume igual por acción)." }, source: { en: "OMA release 24-Apr-2026; Yahoo Finance", es: "Comunicado de OMA 24-abr-2026; Yahoo Finance" } }
  ],
  debt: {
    ratings: [],
    instruments: [
      { name: "OMA 21-2", type: "CB", issued: "2021-04", matures: "2028-04", principalMxn: 2500, rate: "7.83% fixed", note: { en: "7-year local bond.", es: "Certificado bursátil a 7 años." }, source: "OMA 2Q26 Indebtedness" },
      { name: "OMA 22L", type: "CB", issued: "2022-03", matures: "2027-03", principalMxn: 1700, rate: { en: "TIIE 28 + 14 bp (sustainability-linked)", es: "TIIE 28 + 14 pb (ligado a sostenibilidad)" }, source: "OMA 2Q26 Indebtedness" },
      { name: "OMA 22-2L", type: "CB", issued: "2022-03", matures: "2029-03", principalMxn: 2300, rate: "9.35% fixed", note: { en: "Sustainability-linked; SPT achieved (release 25-Jun-2026).", es: "Ligado a sostenibilidad; meta cumplida (comunicado 25-jun-2026)." }, source: "OMA 2Q26 Indebtedness" },
      { name: "OMA 23L", type: "CB", issued: "2023-03", matures: "2026-07", principalMxn: 640, rate: { en: "TIIE 28 + 22 bp (sustainability-linked)", es: "TIIE 28 + 22 pb (ligado a sostenibilidad)" }, note: { en: "Matured July 2026 (still outstanding at 30-Jun-2026).", es: "Venció en julio de 2026 (vigente al 30-jun-2026)." }, source: "OMA 2Q26 Indebtedness" },
      { name: "OMA 23-2L", type: "CB", issued: "2023-03", matures: "2030-03", principalMxn: 2560, rate: "10.26% fixed", note: { en: "Sustainability-linked.", es: "Ligado a sostenibilidad." }, source: "OMA 2Q26 Indebtedness" },
      { name: "OMA 25", type: "CB", issued: "2025-06-27", matures: "2028-06", principalMxn: 820, rate: { en: "TIIE de fondeo + 45 bp", es: "TIIE de fondeo + 45 pb" }, source: "OMA 2Q26 Indebtedness; release 25-Jun-2025" },
      { name: "OMA 25-2", type: "CB", issued: "2025-06-27", matures: "2032-06", principalMxn: 1930, rate: "9.34% fixed", source: "OMA 2Q26 Indebtedness; release 25-Jun-2025" },
      { name: { en: "Short-term bank loans", es: "Créditos bancarios de corto plazo" }, type: { en: "bank loan", es: "préstamo bancario" }, issued: "2026-04-01", matures: "2026-09", principalMxn: 1700, rate: { en: "TIIE de fondeo + 59 bp (weighted)", es: "TIIE de fondeo + 59 pb (promedio)" }, note: { en: "Six-month loans drawn to repay OMA 21V (Ps. 1,000 M, 10-Apr-2026) and for working capital.", es: "Créditos a seis meses para pagar OMA 21V (Ps. 1,000 M, 10-abr-2026) y capital de trabajo." }, source: "OMA release 1-Apr-2026" },
      { name: "OMA 26", type: "CB", issued: "2026-07-20", matures: "2029-07-16", principalMxn: 420, rate: { en: "TIIE de fondeo + 39 bp", es: "TIIE de fondeo + 39 pb" }, note: { en: "3-year notes; interest every 28 days. Issued after the 2Q26 close.", es: "Certificados a 3 años; intereses cada 28 días. Emitidos después del cierre del 2T26." }, source: "OMA releases 16-Jul-2026 and 20-Jul-2026" },
      { name: "OMA 26-2", type: "CB", issued: "2026-07-20", matures: "2033-07-11", principalMxn: 2580, rate: "9.17% fixed", note: { en: "7-year notes; interest every 182 days; combined demand 3.2×. Issued after the 2Q26 close.", es: "Certificados a 7 años; intereses cada 182 días; demanda conjunta 3.2×. Emitidos después del cierre del 2T26." }, source: "OMA releases 16-Jul-2026 and 20-Jul-2026" }
    ],
    instrumentsNote: {
      en: "At 30-Jun-2026: total debt plus leases Ps. 14,272 M (of which leases Ps. 142 M), 65.7% fixed rate, net debt Ps. 11,695 M, 1.13× LTM Adjusted EBITDA; no derivatives. The July-2026 issues (Ps. 3,000 M) refinance OMA 23L (Ps. 640 M) and the short-term loans. Dates: the quarterly report prints maturities by month; issue months of the 2021–2023 series are inferred from each bond's term, the 2025 and 2026 issues from OMA's releases.",
      es: "Al 30-jun-2026: deuda total más arrendamientos Ps. 14,272 M (arrendamientos Ps. 142 M), 65.7% a tasa fija, deuda neta Ps. 11,695 M, 1.13× EBITDA ajustado UDM; sin derivados. Las emisiones de julio de 2026 (Ps. 3,000 M) refinancian OMA 23L (Ps. 640 M) y los créditos de corto plazo. Fechas: el informe trimestral imprime los vencimientos por mes; los meses de emisión de las series 2021–2023 se infieren del plazo de cada bono, y los de 2025 y 2026 de los comunicados de OMA."
    },
    history: []
  },
  event: {
    timeline: [
      { date: "2025-12-18", en: "SICT/AFAC approve the 2026–2030 Master Development Programmes for the 13 airports: Ps. 16,005 M of committed investment (Dec-2024 pesos) and the maximum tariffs per workload unit to 2030.", es: "La SICT/AFAC aprueban los Programas Maestros de Desarrollo 2026–2030 de los 13 aeropuertos: Ps. 16,005 M de inversión comprometida (pesos de dic-2024) y las tarifas máximas por unidad de tráfico hasta 2030." },
      { date: "2026-04-27", en: "1Q26 report: MDP and strategic investments of Ps. 604 M (519 M improvements to concession assets, 58 M major maintenance, 28 M strategic).", es: "Informe 1T26: inversiones PMD y estratégicas de Ps. 604 M (519 M mejoras a activos concesionados, 58 M mantenimiento mayor, 28 M estratégicas)." },
      { date: "2026-06-25", en: "Sustainability performance target of the OMA 22L, 22-2L, 23L and 23-2L bonds achieved: −88% scope 1 and 2 emissions per passenger vs. 2018 (target −58%).", es: "Meta de desempeño en sostenibilidad de los certificados OMA 22L, 22-2L, 23L y 23-2L cumplida: −88% de emisiones alcance 1 y 2 por pasajero vs. 2018 (meta −58%)." },
      { date: "2026-07-27", en: "2Q26 report: MDP and strategic investments of Ps. 949 M (844 M improvements to concession assets, 21 M major maintenance, 84 M strategic); major-maintenance provision expense Ps. 99.3 M, balance Ps. 2,912 M.", es: "Informe 2T26: inversiones PMD y estratégicas de Ps. 949 M (844 M mejoras a activos concesionados, 21 M mantenimiento mayor, 84 M estratégicas); gasto de provisión de mantenimiento mayor Ps. 99.3 M, saldo Ps. 2,912 M." }
    ],
    facts: [
      { k: "mdp", v: 16005, fmt: "mxnM", label: { es: "PMD 2026–2030, inversión comprometida (pesos de dic-2024)", en: "MDP 2026–2030 committed investment (Dec-2024 pesos)" }, source: "OMA 18-Dec-2025" },
      { k: "mdpMty", v: 7969, fmt: "mxnM", label: { es: "Monterrey (50% del total)", en: "Monterrey (50% of the total)" }, source: "OMA 18-Dec-2025" },
      { k: "mdp2026", v: 1152, fmt: "mxnM", label: { es: "Comprometido para 2026 (2027: 2,466 M; 2028: 3,904 M)", en: "Committed for 2026 (2027: 2,466 M; 2028: 3,904 M)" }, source: "OMA 18-Dec-2025" },
      { k: "eff", v: { es: "−0.8% real anual", en: "−0.8% real a year" }, fmt: "text", label: { es: "Factor de eficiencia de las tarifas máximas 2026–2030", en: "Efficiency factor on the 2026–2030 maximum tariffs" }, source: "OMA 18-Dec-2025" },
      { k: "capexQ", v: 949, fmt: "mxnM", label: { es: "Inversiones PMD y estratégicas 2T26 (6M26: Ps. 1,554 M, +5.2%, suma de trimestres)", en: "MDP and strategic investments 2Q26 (6M26: Ps. 1,554 M, +5.2%, sum of the quarters)" }, source: "OMA 2Q26" },
      { k: "mmp", v: 2912, fmt: "mxnM", label: { es: "Saldo de la provisión de mantenimiento mayor al 30-jun-2026", en: "Major-maintenance provision balance at 30-Jun-2026" }, source: "OMA 2Q26" }
    ],
    sources: {
      en: ["OMA release 18-Dec-2025 (MDP approval; tables by airport and year; maximum tariffs)", "OMA 1Q26 and 2Q26 reports (MDP and strategic investments)", "OMA release 25-Jun-2026 (sustainability performance target)"],
      es: ["Comunicado de OMA 18-dic-2025 (aprobación del PMD; tablas por aeropuerto y año; tarifas máximas)", "Informes 1T26 y 2T26 de OMA (inversiones PMD y estratégicas)", "Comunicado de OMA 25-jun-2026 (meta de desempeño en sostenibilidad)"]
    }
  },
  explainer: {
    rows: [
      { label: { es: "Participación de VINCI Airports", en: "VINCI Airports' stake" }, value: { es: "29.99% indirecta, en manos de una subsidiaria de VINCI Airports SAS; acuerdo anunciado por Fintech Advisory el 31-jul-2022 y cierre comunicado el 7-dic-2022.", en: "29.99% indirect, held by a subsidiary of VINCI Airports SAS; agreement announced by Fintech Advisory on 31-Jul-2022, closing reported on 7-Dec-2022." } },
      { label: { es: "Relación con OMA", en: "Relationship with OMA" }, value: { es: "OMA se describe como parte de VINCI Airports desde diciembre de 2022 y paga a su socio estratégico una cuota de asistencia técnica calculada sobre el EBITDA: Ps. 69.0 M en el 2T26 (+2.9%), Ps. 130.0 M en 6M26.", en: "OMA describes itself as part of VINCI Airports since December 2022 and pays its strategic partner a technical-assistance fee computed on EBITDA: Ps. 69.0 M in 2Q26 (+2.9%), Ps. 130.0 M in 6M26." } },
      { label: { es: "Reporte de VINCI", en: "VINCI reporting" }, value: { es: "Los resultados anuales 2025 de VINCI SA (6-feb-2026) incluyen cifras de OMA, con base en información no auditada y remediciones a valor razonable a nivel de VINCI.", en: "VINCI SA's 2025 annual results (6-Feb-2026) include OMA figures, based on unaudited information and fair-value remeasurements at the VINCI level." } },
      { label: { es: "Bonos ligados a sostenibilidad", en: "Sustainability-linked bonds" }, value: { es: "OMA 22L, OMA 22-2L, OMA 23L y OMA 23-2L (Ps. 7,200 M): meta de −58% en emisiones alcance 1 y 2 por pasajero al 31-dic-2025 vs. 2018; OMA reportó −88% el 25-jun-2026.", en: "OMA 22L, OMA 22-2L, OMA 23L and OMA 23-2L (Ps. 7,200 M): target of −58% scope 1 and 2 emissions per passenger by 31-Dec-2025 vs. 2018; OMA reported −88% on 25-Jun-2026." } },
      { label: { es: "Participación no controladora", en: "Non-controlling interest" }, value: { es: "Ps. 11.1 M de la utilidad neta del 2T26 (Ps. 1,477.6 M consolidada); Ps. 184 M en el balance al 30-jun-2026.", en: "Ps. 11.1 M of 2Q26 net income (Ps. 1,477.6 M consolidated); Ps. 184 M on the balance sheet at 30-Jun-2026." } },
      { label: { es: "Apalancamiento como lo reporta OMA", en: "Leverage as OMA reports it" }, value: { es: "Deuda neta (incluye arrendamientos) / EBITDA ajustado UDM: 1.13x al 30-jun-2026 (1.04x un año antes); 65.7% de la deuda a tasa fija; sin derivados.", en: "Net debt (including leases) / LTM Adjusted EBITDA: 1.13x at 30-Jun-2026 (1.04x a year earlier); 65.7% of debt at fixed rates; no derivatives." } }
    ],
    status: { es: "VINCI Airports mantiene 29.99% (comunicado de OMA del 6-feb-2026); el resto de las acciones cotiza en la BMV y como ADS en el Nasdaq.", en: "VINCI Airports holds 29.99% (OMA release of 6-Feb-2026); the remaining shares trade on the BMV and as ADSs on Nasdaq." },
    sources: { en: ["OMA 4Q22 report (16-Feb-2023) on the Fintech–VINCI closing", "OMA release 6-Feb-2026 (VINCI SA 2025 results)", "OMA release 25-Jun-2026 (sustainability performance target)", "OMA 2Q26 report (technical-assistance fee, non-controlling interest, indebtedness)"], es: ["Informe 4T22 de OMA (16-feb-2023) sobre el cierre Fintech–VINCI", "Comunicado de OMA 6-feb-2026 (resultados 2025 de VINCI SA)", "Comunicado de OMA 25-jun-2026 (meta de desempeño en sostenibilidad)", "Informe 2T26 de OMA (cuota de asistencia técnica, participación no controladora, deuda)"] }
  },
  dcf: {
    horizonYears: 5, terminalMethod: "annuity", concessionEnd: 2048,
    trafficGrowthPct: [2.5, 3, 3, 3, 3], revPerPaxGrowthPct: 4, ebitdaMarginPct: null,
    capexMxnM: [2000, 3000, 4400, 4800, 4700], daPctRevenue: null, taxRatePct: 30, nwcPctDeltaRevenue: 5,
    riskFreePct: null, erpPct: 5, beta: 0.85, costOfDebtPct: 9.2, targetDebtPct: 25, terminalGrowthPct: 4, exitMultiple: 11,
    note: { en: "Fallback assumptions (analyst judgement, not company guidance): traffic 2.5% in 2026 after +2.4% in 6M26, then 3%; capex = MDP commitments indexed ≈4% for inflation plus ≈Ps. 400 M of strategic investments a year; cost of debt = the OMA 26-2 coupon (9.17%) plus fees. Beta and the risk-free rate are derived from market data at render time.", es: "Supuestos de respaldo (juicio del analista, no guía de la empresa): tráfico 2.5% en 2026 tras +2.4% en 6M26, luego 3%; capex = compromisos del PMD indexados ≈4% por inflación más ≈Ps. 400 M anuales de inversiones estratégicas; costo de deuda = cupón de OMA 26-2 (9.17%) más comisiones. La beta y la tasa libre de riesgo se derivan del mercado al renderizar." }
  },
  peers: ["GAP", "ASUR", "AENA", "Fraport", "Flughafen Zürich", "Auckland International"]
};
