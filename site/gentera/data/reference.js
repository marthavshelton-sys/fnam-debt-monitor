// Hand-curated reference data for the Gentera model: company facts, share count, subsidiaries, dividends approved
// at each AGM, the ConCrédito buyouts, the Perú turnaround, the 4Q25 deferred-tax item (drives the accounting
// toggle), the group-lending / stage-3 explainer facts, glossary, valuation defaults and sources. Updated by
// reviewed commit when an event lands (AGM, rating action, material event). Figures quoted come from Gentera's
// quarterly press releases (IR site) unless a source says otherwise.
window.G_REF = {
  updatedAt: "2026-09-25",
  company: {
    name: "Gentera, S.A.B. de C.V.", short: "Gentera", ticker: "GENTERA", bmv: "GENTERA", bloomberg: "GENTERA* MM", exchange: "BMV", yahoo: "GENTERA.MX",
    sector: { es: "Microfinanzas y servicios financieros de inclusión", en: "Microfinance and inclusion financial services" },
    hq: "Ciudad de México", fiscalYearEnd: "12-31",
    accounting: { es: "Criterios contables de la CNBV para instituciones de crédito (convergentes con IFRS 9 desde el 1 de enero de 2022). Estados financieros consolidados de la tenedora; cifras trimestrales no auditadas.", en: "CNBV accounting criteria for credit institutions (converged with IFRS 9 from 1 January 2022). Consolidated statements of the holding company; quarterly figures unaudited." },
    description: {
      es: "Mayor grupo de microfinanzas de México: Banco Compartamos (crédito grupal e individual a microempresarios, captación, seguros vía Aterna, corresponsales Yastás), Compartamos Banco Perú (banco desde 2025, antes Compartamos Financiera) y ConCrédito (crédito al consumo a través de ~84 mil empresarias distribuidoras y la tienda en línea CrediTienda). 4.68 millones de clientes de crédito y 6.79 millones de personas atendidas al 2T26.",
      en: "Mexico's largest microfinance group: Banco Compartamos (group and individual loans to micro-entrepreneurs, deposits, insurance through Aterna, Yastás correspondent network), Compartamos Banco Perú (a bank since 2025, formerly Compartamos Financiera) and ConCrédito (consumer credit through ~84 thousand women distributors and the CrediTienda online store). 4.68 million credit clients and 6.79 million people served at 2Q26.",
    },
    ir: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral",
    // Assumed date: median lag between quarter-end and the 3Q release in 2023–2025 (25, 23 and 22 Oct → 23 days);
    // Gentera has not announced the 3T26 date in its releases. When it does, set `assumed: false` here and add
    // `calendar: { nextResults: { date, source } }` (the board deck reads that key for confirmed dates).
    nextResults: { date: "2026-10-23", quarter: "2026Q3", assumed: true, note: { es: "Fecha supuesta: mediana del rezago de publicación del tercer trimestre en 2023–2025 (22–25 de octubre); Gentera no la ha anunciado.", en: "Assumed date: median release lag of the third quarter in 2023–2025 (22–25 October); not announced by Gentera." } },
  },
  // Shares outstanding as printed in each release (millions). No ADR. Buybacks are not disclosed in the releases.
  shares: {
    issued: 1579243876, treasuryApprox: 0, asOf: "2026-06-30",
    note: { es: "1,579,243,876 acciones desde el 3T23 (1,587,593,876 en el 1T22; −0.5% en 2022–23 por cancelación de recompras). Sin ADR.", en: "1,579,243,876 shares since 3Q23 (1,587,593,876 at 1Q22; −0.5% over 2022–23 through cancellation of repurchased shares). No ADR." },
    history: [{ q: "2022Q1", shares: 1587593876 }, { q: "2022Q2", shares: 1582743876 }, { q: "2023Q1", shares: 1581243876 }, { q: "2023Q2", shares: 1579943876 }, { q: "2023Q3", shares: 1579243876 }],
  },
  subsidiaries: [
    { k: "mx", name: { es: "Banco Compartamos", en: "Banco Compartamos" }, country: "México", regulator: "CNBV / Banxico", note: { es: "≈66% de la cartera del grupo; metodología grupal 60.5% e individual 39.5% del banco (2T26); castiga a 180 días de atraso; 154 sucursales y 61 oficinas de servicio compartidas.", en: "≈66% of the group loan book; group lending 60.5% and individual 39.5% of the bank (2Q26); writes off at 180 days past due; 154 branches and 61 co-located service offices." } },
    { k: "pe", name: { es: "Compartamos Banco Perú", en: "Compartamos Banco Perú" }, country: "Perú", regulator: "SBS", note: { es: "Compartamos Financiera hasta 2024 (Empresas Financieras en la estadística de la SBS), banco múltiple desde 2025. Crédito grupal ≈25% de su cartera. Cifras consolidadas en pesos al tipo de cambio de cada cierre.", en: "Compartamos Financiera until 2024 (an 'Empresa Financiera' in SBS statistics), a full bank from 2025. Group loans ≈25% of its book. Consolidated in pesos at each quarter-end rate." } },
    { k: "cc", name: { es: "ConCrédito", en: "ConCrédito" }, country: "México", regulator: "CONDUSEF (SOFOM)", note: { es: "Crédito al consumo a través de empresarias distribuidoras; CrediTienda (comercio en línea) fuera de la cartera. 57.53% → 74.91% en agosto de 2022; 100% desde el 30 de junio de 2025.", en: "Consumer credit through women distributors; CrediTienda (online retail) sits outside the loan book. 57.53% → 74.91% in August 2022; 100% since 30 June 2025." } },
    { k: "yastas", name: { es: "Yastás", en: "Yastás" }, country: "México", note: { es: "Red de corresponsales (comisionistas) para pagos y cobranza; 9.1 millones de operaciones en el 2T26 (+23% a/a); cartera pequeña, incluida en 'Otros'.", en: "Correspondent network for payments and collections; 9.1 million transactions in 2Q26 (+23% y/y); small loan book, shown under 'Other'." } },
    { k: "aterna", name: { es: "Aterna", en: "Aterna" }, country: "México / Perú", note: { es: "Intermediario de microseguros: 16.4 millones de pólizas activas y Ps. 2,486 M de primas en el 2T26; ≈88% de las comisiones cobradas del banco.", en: "Micro-insurance broker: 16.4 million active policies and Ps. 2,486 M of premiums in 2Q26; ≈88% of the bank's fees charged." } },
  ],
  // Dividends approved at each April AGM (total Ps. M) — 40% of the prior year's controlling net income since 2023.
  dividendPolicy: { pct: 40, proposed: 45, note: { es: "Política vigente: 40% de la utilidad neta controladora del año anterior. La propuesta de subir la distribución hasta 45% (y la contribución a Fundación Compartamos hasta 3%) no alcanzó los votos necesarios en la asamblea del 10 de abril de 2026; el consejo convocó una asamblea extraordinaria para junio y en la conferencia del 2T26 (23 de julio) la administración dijo que la presentará de nuevo en la asamblea del próximo año.", en: "Current policy: 40% of the prior year's controlling net income. The proposal to lift the distribution to up to 45% (and the Fundación Compartamos contribution to up to 3%) did not obtain the required votes at the 10 April 2026 AGM; the board called an extraordinary meeting for June and on the 2Q26 call (23 July) management said it will present it again at next year's meeting." } },
  dividends: [
    { agmYear: 2022, totalMxnM: 469.4, shares: 1582743876, source: "Press release 1T22 / AGM abril 2022" },
    { agmYear: 2023, totalMxnM: 1821.6, shares: 1579943876, source: "AGM abril 2023 (press release 1T23)" },
    { agmYear: 2024, totalMxnM: 1888.15, shares: 1579243876, source: "AGM abril 2024 (press release 1T24)" },
    { agmYear: 2025, totalMxnM: 2401.8, shares: 1579243876, source: "AGM abril 2025 (press release 1T25)" },
    { agmYear: 2026, totalMxnM: 3285.9, shares: 1579243876, payments: ["2026-04-23", "2026-11-27"], note: { es: "40% de la utilidad neta controladora 2025 (Ps. 8,215 M); dos pagos: 23 de abril y a más tardar 27 de noviembre de 2026.", en: "40% of 2025 controlling net income (Ps. 8,215 M); two instalments: 23 April and by 27 November 2026." }, source: "AGM abril 2026 (press release 1T26)" },
  ],
  // The 4Q25 non-recurring item that the accounting toggle strips out.
  adjust: {
    quarter: "2025Q4", label: { es: "Excluir cancelación de impuesto diferido de ConCrédito (4T25)", en: "Exclude the 4Q25 ConCrédito deferred-tax write-down" },
    taxMxnM: 328, subsidiary: "cc",
    note: { es: "En el 4T25 ConCrédito canceló Ps. 328 M de activo por impuesto diferido tras la reestructura corporativa de 2024 (pérdida trimestral de Ps. 72 M); la tasa efectiva del año subió a 33.5%. El interruptor suma esos Ps. 328 M a la utilidad neta, a la participación controladora y a ConCrédito, y baja los impuestos, para comparar 2025 en base recurrente.", en: "In 4Q25 ConCrédito wrote down Ps. 328 M of deferred tax assets after the 2024 corporate restructuring (a Ps. 72 M quarterly loss); the year's effective tax rate rose to 33.5%. The switch adds those Ps. 328 M back to net income, to the controlling interest and to ConCrédito, and lowers taxes, to compare 2025 on a recurring basis." },
  },
  // Section 09: ConCrédito buyouts and the Perú turnaround.
  concredito: {
    facts: [
      { v: 1991.7, fmt: "mxnM", label_es: "Pagado el 15 de agosto de 2022 por subir de 57.53% a 74.91%", label_en: "Paid on 15 August 2022 to move from 57.53% to 74.91%" },
      { v: 1244.6, fmt: "mxnM", label_es: "Reducción de la participación no controladora (2022)", label_en: "Reduction in non-controlling interest (2022)" },
      { v: 747.1, fmt: "mxnM", label_es: "Prima pagada cargada a prima en venta de acciones (2022)", label_en: "Premium charged to share premium (2022)" },
      { v: 25.1, fmt: "pct", label_es: "Participación restante comprada el 30 de junio de 2025 (100% desde entonces)", label_en: "Remaining stake bought on 30 June 2025 (100% since)" },
      { v: 3853, fmt: "mxnM", label_es: "Crédito mercantil atribuible a ConCrédito", label_en: "Goodwill attributable to ConCrédito" },
      { v: 328, fmt: "mxnM", label_es: "Cancelación de impuesto diferido en el 4T25 (partida no recurrente)", label_en: "Deferred-tax write-down in 4Q25 (non-recurring)" },
    ],
    timeline: [
      { date: "2019-01-01", es: "Gentera consolida ConCrédito con 57.53% tras la compra inicial (cierre 2018–19).", en: "Gentera consolidates ConCrédito with 57.53% after the initial purchase (closed 2018–19)." },
      { date: "2022-08-15", es: "Compra de 17.38% adicional por Ps. 1,991.7 M: 74.91%. La participación no controladora baja de Ps. 3,187 M (2T22) a Ps. 1,953 M (3T22); la prima pagada de Ps. 747.1 M se carga a prima en venta de acciones.", en: "Purchase of a further 17.38% for Ps. 1,991.7 M: 74.91%. Non-controlling interest falls from Ps. 3,187 M (2Q22) to Ps. 1,953 M (3Q22); the Ps. 747.1 M premium is charged to share premium." },
      { date: "2024-09-30", es: "3T24: reestructura corporativa de ConCrédito (Fincrementar y Fin Útil como originadores para las empresarias); CrediTienda inicia en Perú. En el 4T24 se amortizan anticipadamente Ps. 200 M del intangible de la base de clientes original (conferencias 3T24 y 4T24).", en: "3Q24: ConCrédito corporate restructuring (Fincrementar and Fin Útil as originators for the empresarias); CrediTienda starts in Peru. In 4Q24 Ps. 200 M of the original client-base intangible is amortised early (3Q24 and 4Q24 calls)." },
      { date: "2024-12-31", es: "La reestructura de 2024 es el origen de la reserva y posterior cancelación del impuesto diferido del 4T25.", en: "The 2024 restructuring is the origin of the deferred-tax reserve and its 4Q25 cancellation." },
      { date: "2025-06-30", es: "Compra del ~25.1% restante: 100%, fondeada con dividendos de subsidiarias y fondeo externo; prima de ≈Ps. 575 M cargada a prima en venta de acciones (conferencia 2T25). La participación no controladora cae de Ps. 2,419 M (1T25) a Ps. 234 M (2T25); desde el 3T25 el resultado de ConCrédito es 100% controlador.", en: "Purchase of the remaining ~25.1%: 100%, funded with subsidiary dividends and external funding; ≈Ps. 575 M premium charged to share premium (2Q25 call). Non-controlling interest drops from Ps. 2,419 M (1Q25) to Ps. 234 M (2Q25); from 3Q25 ConCrédito's result is fully attributable to the controlling interest." },
      { date: "2025-12-31", es: "4T25: cancelación de Ps. 328 M de activo por impuesto diferido; pérdida trimestral de Ps. 72 M; utilidad 2025 de Ps. 676 M vs Ps. 1,038 M en 2024.", en: "4Q25: Ps. 328 M deferred-tax write-down; Ps. 72 M quarterly loss; 2025 net income Ps. 676 M vs Ps. 1,038 M in 2024." },
      { date: "2026-06-30", es: "2T26: cartera récord de Ps. 6,472 M (+14.9% a/a), etapa 3 en la zona de 2–3%, ROE 26.5%; CrediTienda Ps. 1,144 M de cuentas por cobrar (+26.9%).", en: "2Q26: record loan book of Ps. 6,472 M (+14.9% y/y), stage 3 in the 2–3% zone, ROE 26.5%; CrediTienda receivables Ps. 1,144 M (+26.9%)." },
    ],
    modelNote: { es: "Ninguna de las compras cambia activos, ingresos ni utilidad neta consolidados: mueven utilidad de la participación no controladora a la controladora. Por eso la UPA (sobre utilidad controladora) crece más que la utilidad neta en 2022–23 y en 2025–26, y la comparación a/a de 'participación no controladora' es mecánica hasta el 2T26.", en: "Neither purchase changes consolidated assets, revenue or net income: they move profit from the non-controlling to the controlling interest. That is why EPS (on controlling income) grows faster than net income in 2022–23 and 2025–26, and why the y/y comparison of 'non-controlling interest' is mechanical until 2Q26." },
    sources: ["Press release 3T22 (Gentera IR)", "Press release 2T25 (Gentera IR)", "Press release 4T25 (Gentera IR)"],
  },
  peru: {
    facts: [
      { v: 1440, fmt: "mxnM", label_es: "Utilidad neta 2025 (Ps. 397 M en 2024)", label_en: "2025 net income (Ps. 397 M in 2024)" },
      { v: 3.25, fmt: "pct", label_es: "Índice de etapa 3 al 2T26 (3.72% un año antes)", label_en: "Stage-3 ratio at 2Q26 (3.72% a year earlier)" },
      { v: 22.5, fmt: "pct", label_es: "Índice de solvencia al 2T26", label_en: "Solvency ratio at 2Q26" },
      { v: 26.2, fmt: "pct", label_es: "ROE al 2T26 (sostenible 20–23% según la administración)", label_en: "ROE at 2Q26 (20–23% sustainable per management)" },
    ],
    timeline: [
      { date: "2023-03-31", es: "1T23: movimientos sociales y lluvias de El Niño golpean la cartera, sobre todo grupal; la morosidad mejora desde julio de 2023 (conferencia 3T23).", en: "1Q23: social unrest and El Niño rains hit the book, mostly group loans; delinquency improves from July 2023 (3Q23 call)." },
      { date: "2024-04-30", es: "Abril de 2024: \"acciones decididas\" ante el repunte de morosidad (originación más estricta, menores saldos por cliente, más gestores de cobranza, reprecio); ROE esperado ~15% en soles para 2024 y > 20% en un año (conferencias 1T24–2T24).", en: "April 2024: \"bold actions\" on the delinquency pickup (tighter origination, lower balances per client, more collection agents, repricing); ROE expected ~15% in soles for 2024 and > 20% within a year (1Q24–2Q24 calls)." },
      { date: "2024-12-31", es: "Año de limpieza: cartera +1.5% y clientes +3.6% en moneda local; utilidad anual de Ps. 397 M (≈6% del grupo). Licencia bancaria recibida en enero de 2025.", en: "Clean-up year: loans +1.5% and clients +3.6% in local currency; annual net income Ps. 397 M (≈6% of the group). Banking licence received in January 2025." },
      { date: "2025-01-01", es: "Compartamos Financiera se convierte en Compartamos Banco (banca múltiple bajo la SBS). Adolfo Peniche asume la dirección general el 1 de abril de 2025 tras el retiro de Ralph Guerra.", en: "Compartamos Financiera becomes Compartamos Banco (a full bank supervised by the SBS). Adolfo Peniche becomes CEO on 1 April 2025 after Ralph Guerra's retirement." },
      { date: "2025-07-23", es: "Conferencia 2T25: objetivo de ROE 2025 subido de 15% a ~20% en soles; utilidad de nueve meses 189 M de soles vs 45 M en 2024 (conferencia 3T25).", en: "2Q25 call: 2025 ROE objective lifted from 15% to ~20% in soles; nine-month net income 189 M soles vs 45 M in 2024 (3Q25 call)." },
      { date: "2025-12-31", es: "Recuperación: resultado de la operación +257%, utilidad de Ps. 1,440 M con mayor margen y menores provisiones.", en: "Turnaround: operating result +257%, net income Ps. 1,440 M on a wider margin and lower provisions." },
      { date: "2026-06-30", es: "2T26: cartera +14.5% en soles (+10.9% en pesos), utilidad +30.3% a/a, etapa 3 3.25%, costo de fondeo 4.8%.", en: "2Q26: loans +14.5% in soles (+10.9% in pesos), net income +30.3% y/y, stage 3 3.25%, cost of funds 4.8%." },
    ],
    sources: ["Press releases 4T24, 4T25 y 2T26 (Gentera IR)", "Earnings-call transcripts 3T23–4T25 (FactSet CallStreet, hand-supplied)"],
  },
  // Management and board changes mentioned on the calls.
  management: [
    { date: "2024-09-17", es: "Iván Mancillas (cofundador) nombrado director general de Banco Compartamos; Patricio Diez de Bonilla deja el grupo tras 16 años.", en: "Iván Mancillas (co-founder) appointed CEO of Banco Compartamos; Patricio Diez de Bonilla leaves after 16 years." },
    { date: "2025-04-01", es: "Adolfo Peniche director general de Compartamos Banco Perú (Ralph Guerra se retira tras 32 años).", en: "Adolfo Peniche CEO of Compartamos Banco Perú (Ralph Guerra retires after 32 years)." },
    { date: "2025-04-24", es: "Consejo: salen John Santa María (desde 2008) y Luis Nicolau (desde 2019); entran Ignacio Echevarría y Gerardo Esquivel (subgobernador de Banxico 2019–2024).", en: "Board: John Santa María (since 2008) and Luis Nicolau (since 2019) step down; Ignacio Echevarría and Gerardo Esquivel (Banxico deputy governor 2019–2024) join." },
    { date: "2026-04-23", es: "Consejo de Gentera (11 miembros): salen Antonio Rallo Verdugo (11 años) y Juan Carlos Torres Cisneros (cofundador y presidente de ConCrédito). Consejo de Compartamos Banco Perú: entran Silvia Tapia Navarro y Santiago Casanueva Pérez (conferencia 1T26).", en: "Gentera board (11 members): Antonio Rallo Verdugo (11 years) and Juan Carlos Torres Cisneros (ConCrédito co-founder and chairman) step down. Compartamos Banco Perú board: Silvia Tapia Navarro and Santiago Casanueva Pérez join (1Q26 call)." },
  ],
  // Section 10: group lending and stage-3 provisioning explainer facts.
  groupLending: {
    facts: [
      { v: 60.5, fmt: "pct", label_es: "Cartera del banco con metodología grupal (2T26)", label_en: "Bank loan book under the group methodology (2Q26)" },
      { v: 4.59, fmt: "pct", label_es: "Etapa 3 de Banco Compartamos (2T26)", label_en: "Banco Compartamos stage-3 ratio (2Q26)" },
      { v: 6.12, fmt: "pct", label_es: "Etapa 3 del crédito individual del banco (3.79% grupal); picos previos 7.9% en 2011–12 y 5.8% en 2014–16", label_en: "Stage 3 of the bank's individual loans (3.79% group); earlier peaks 7.9% in 2011–12 and 5.8% in 2014–16" },
      { v: 180, fmt: "days", label_es: "Días de atraso a los que Banco Compartamos castiga", label_en: "Days past due at which Banco Compartamos writes off" },
      { v: 219.5, fmt: "pct", label_es: "Cobertura consolidada (estimación ÷ etapa 3, 2T26)", label_en: "Consolidated coverage (allowance ÷ stage 3, 2Q26)" },
      { v: 14.5, fmt: "pct", label_es: "Costo de riesgo consolidado 2T26 (12.7% un año antes)", label_en: "Consolidated cost of risk 2Q26 (12.7% a year earlier)" },
    ],
    sources: ["Press release 2T26 (Gentera IR)", "Earnings call 2T26 (23 Jul 2026)", "CNBV, Disposiciones de carácter general aplicables a las instituciones de crédito (Anexo 33, criterio B-6 Cartera de crédito)"],
  },
  // Ratings as printed in the 3Q24 corporate presentation (hand-supplied, tools/gentera/raw/transcripts); the
  // routine updates them from material-event notices when an agency acts.
  ratings: [
    { agency: "Fitch Ratings", entity: "Banco Compartamos", rating: "AA(mex) / F1+(mex) · BB+ / B (global)", outlook: { es: "Estable", en: "Stable" }, date: "2024-10-22", source: { es: "Presentación corporativa 3T24, p. 34", en: "3Q24 corporate presentation, p. 34" } },
    { agency: "S&P Global Ratings", entity: "Banco Compartamos", rating: "mxAA / mxA-1+ · BB+ / B (global)", outlook: { es: "Estable", en: "Stable" }, date: "2024-10-22", source: { es: "Presentación corporativa 3T24, p. 34", en: "3Q24 corporate presentation, p. 34" } },
    { agency: "Moody's", entity: "Banco Compartamos", rating: "AA.mx / ML A-1.mx", outlook: { es: "Estable", en: "Stable" }, date: "2024-10-22", source: { es: "Presentación corporativa 3T24, p. 34", en: "3Q24 corporate presentation, p. 34" } },
    { agency: "Apoyo & Asociados", entity: "Compartamos Financiera (Perú)", rating: "A-", outlook: { es: "Estable", en: "Stable" }, date: "2024-10-22", source: { es: "Presentación corporativa 3T24, p. 40", en: "3Q24 corporate presentation, p. 40" } },
    { agency: "Moody's Local PE", entity: "Compartamos Financiera (Perú)", rating: "A-", outlook: { es: "Estable", en: "Stable" }, date: "2024-10-22", source: { es: "Presentación corporativa 3T24, p. 40", en: "3Q24 corporate presentation, p. 40" } },
    { agency: "JCR", entity: "Compartamos Financiera (Perú)", rating: "A", outlook: { es: "Estable", en: "Stable" }, date: "2024-10-22", source: { es: "Presentación corporativa 3T24, p. 40", en: "3Q24 corporate presentation, p. 40" } },
  ],
  ratingsNote: { es: "Calificaciones tomadas de la presentación corporativa del 3T24 (octubre de 2024), la más reciente suministrada; Gentera (tenedora) no aparece calificada en ella. Se actualizan con los eventos relevantes.", en: "Ratings taken from the 3Q24 corporate presentation (October 2024), the latest one supplied; Gentera (the holding company) is not rated in it. Updated from material-event notices." },
  // Sell-side coverage seen on the 2023–2025 calls (no targets or recommendations transcribed; FactSet pending).
  analysts: [],
  coverage: ["BofA Securities", "Citi", "Goldman Sachs", "JPMorgan", "HSBC", "UBS", "Bradesco BBI", "Santander", "BBVA", "GBM", "Barclays", "BTG Pactual"],
  // Valuation defaults (excess-return model on book value). Live inputs (risk-free, beta) come from market.js.
  valuation: {
    years: 5, erpPct: 6.0, betaFloor: 0.5, betaCap: 1.4, rfFallbackPct: 9.0, terminalGrowthPct: 5.0, exitPbv: 2.0, payoutPct: 40, loanGrowthPct: 8.0,
    notes: { es: "Tasa libre de riesgo = bono M a 10 años (Banxico o FRED/OCDE); beta = rendimientos semanales de dos años de GENTERA contra el IPC, acotada; prima de riesgo 6%. Impulsores iniciales = últimos doce meses reportados; crecimiento de cartera 8% (guía 2026: 6–9%); pago de dividendos 40% (política vigente; el 45% se propondrá de nuevo en 2027).", en: "Risk-free = 10-year M bond (Banxico or FRED/OECD); beta = two years of weekly GENTERA returns against the IPC, clipped; equity risk premium 6%. Starting drivers = last twelve reported months; loan growth 8% (2026 guidance 6–9%); payout 40% (policy in force; 45% to be proposed again in 2027)." },
  },
  peers: { note: { es: "Pares provisionales: bancos mexicanos listados (Banorte, Regional, BanBajío) y Credicorp (dueño de Mibanco, mayor microfinanciera de Perú); ninguno es una microfinanciera pura. Se sustituyen por la lista de FactSet cuando el conector esté autorizado.", en: "Placeholder peers: listed Mexican banks (Banorte, Regional, BanBajío) and Credicorp (owner of Mibanco, Peru's largest microlender); none is a pure microfinance comparable. Replaced by the FactSet list once the connector is authorised." } },
  glossary: {
    stage3: { es: "Etapa 3: cartera con deterioro crediticio (≥ 90 días de atraso bajo IFRS 9/CNBV); sustituye a la 'cartera vencida' desde 2022.", en: "Stage 3: credit-impaired loans (≥ 90 days past due under IFRS 9/CNBV); replaced 'non-performing loans' from 2022." },
    coverage: { es: "Cobertura: estimación preventiva ÷ cartera etapa 3; definición de Gentera desde el 4T25, recalculada aquí para todos los trimestres.", en: "Coverage: loan-loss allowance ÷ stage-3 loans; Gentera's definition since 4Q25, recomputed here for every quarter." },
    cor: { es: "Costo de riesgo: provisiones anualizadas ÷ cartera bruta promedio del periodo.", en: "Cost of risk: annualised provisions ÷ average gross loans of the period." },
    nim: { es: "MIN: margen financiero anualizado ÷ activos productivos promedio (cifra de Gentera).", en: "NIM: annualised financial margin ÷ average productive assets (Gentera's figure)." },
    icap: { es: "ICAP: índice de capitalización de Banco Compartamos (capital neto ÷ activos ponderados por riesgo, Basilea III; mínimo regulatorio 10.5%).", en: "ICAP: Banco Compartamos capitalisation ratio (net capital ÷ risk-weighted assets, Basel III; regulatory minimum 10.5%)." },
    group: { es: "Crédito grupal (Crédito Mujer): préstamo a un grupo de 10–50 personas con garantía solidaria y pagos semanales o quincenales.", en: "Group lending (Crédito Mujer): a loan to a group of 10–50 people with joint guarantee and weekly or fortnightly payments." },
    efficiency: { es: "Índice de eficiencia (Gentera): gastos de administración ÷ (margen ajustado por riesgos + comisiones netas + intermediación + otros).", en: "Efficiency ratio (Gentera): administrative expenses ÷ (risk-adjusted margin + net fees + trading + other)." },
    roae: { es: "ROAE: utilidad neta anualizada ÷ capital contable promedio.", en: "ROAE: annualised net income ÷ average stockholders' equity." },
    excessReturn: { es: "Modelo de retorno en exceso: valor = capital contable + valor presente de (utilidad − Ke × capital inicial) cada año, más un valor terminal.", en: "Excess-return model: value = book equity + present value of (net income − Ke × opening equity) each year, plus a terminal value." },
  },
  sources: [
    { t: { es: "Gentera · Información trimestral (press releases)", en: "Gentera · Quarterly information (press releases)" }, u: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", d: { es: "Informes trimestrales 1T12–2T26 en español; estados financieros, indicadores, cartera por subsidiaria y guía.", en: "Quarterly releases 1Q12–2Q26 in Spanish; statements, indicators, loan book by subsidiary and guidance." } },
    { t: { es: "CNBV · Boletín Estadístico Banca Múltiple", en: "CNBV · Monthly statistical bulletin, commercial banks" }, u: "https://portafolioinfo.cnbv.gob.mx/PortafolioInformacion/", d: { es: "Cartera, IMOR, captación y resultado mensuales de Banco Compartamos.", en: "Monthly loans, IMOR, deposits and result of Banco Compartamos." } },
    { t: { es: "SBS Perú · Estadísticas del sistema financiero", en: "SBS Peru · Financial system statistics" }, u: "https://www.sbs.gob.pe/app/stats/EstadisticaSistemaFinancieroResultados.asp?c=B-2201", d: { es: "Balance, cartera por tipo, morosidad y castigos mensuales de Compartamos Banco (Financiera hasta 2024).", en: "Monthly balance sheet, loans by type, delinquency and write-offs of Compartamos Banco (Financiera until 2024)." } },
    { t: { es: "Yahoo Finance · GENTERA.MX, ^MXX y pares", en: "Yahoo Finance · GENTERA.MX, ^MXX and peers" }, u: "https://finance.yahoo.com/quote/GENTERA.MX", d: { es: "Cierres diarios y dividendos en efectivo.", en: "Daily closes and cash dividends." } },
    { t: { es: "Banco de México · SIE (bono M 10 años)", en: "Banco de México · SIE (10-year M bond)" }, u: "https://www.banxico.org.mx/SieAPIRest/service/v1/", d: { es: "Rendimiento diario del bono M a 10 años (tasa libre de riesgo).", en: "Daily 10-year M bond yield (risk-free rate)." } },
    { t: { es: "FRED · DEXMXUS, DGS10, IRLTLT01MXM156N", en: "FRED · DEXMXUS, DGS10, IRLTLT01MXM156N" }, u: "https://fred.stlouisfed.org/", d: { es: "Tipo de cambio, Treasury 10 años y respaldo mensual del bono mexicano.", en: "FX, 10-year Treasury and the monthly fallback for the Mexican bond." } },
  ],
};
