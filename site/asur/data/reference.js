// Slow-moving reference facts for the ASUR model. Every entry carries its source; edit by hand or via the
// weekday routine when a release changes a fact (dividends, debt, share count, acquisitions).
window.ASUR_REF = {
  updatedAt: "2026-09-22",
  company: {
    name: "Grupo Aeroportuario del Sureste, S.A.B. de C.V.",
    short: "ASUR",
    tickers: { bmv: "ASUR (serie B)", nyse: "ASR (ADS)" },
    adsRatio: 10,
    fiscalYearEnd: "12-31",
    reportingCurrency: "MXN",
    accounting: {
      en: "IFRS (IFRIC 12 service-concession accounting: construction of concession assets is booked as construction revenue and cost, with a margin in Colombia). Aerostar (San Juan) is consolidated at 100% with a 40% non-controlling interest; ASUR reports 'majority net income'.",
      es: "IFRS (contabilidad de concesiones IFRIC 12: la construcción de activos concesionados se registra como ingreso y costo de construcción, con margen en Colombia). Aerostar (San Juan) se consolida al 100% con 40% de participación no controladora; ASUR reporta la 'utilidad neta mayoritaria'."
    },
    ir: "https://www.asur.com.mx/informacion-financiera-page-0"
  },
  shares: {
    total: 300000000,
    asOf: "2026-08-20",
    note: {
      en: "300 million series B and BB shares in circulation (ASUR, 20-Aug-2026). The merger with ITA approved that day issues about 7.2 million net new shares, taking the total to about 307.2 million once completed; the quarterly reports imply 300 million (majority net income / EPS).",
      es: "300 millones de acciones series B y BB en circulación (ASUR, 20-ago-2026). La fusión con ITA aprobada ese día emite unos 7.2 millones de acciones netas nuevas, para llegar a unos 307.2 millones al completarse; los informes trimestrales implican 300 millones (utilidad mayoritaria / UPA)."
    },
    history: [
      { asOf: "2018-01-01", total: 300000000, note: { en: "300 million shares throughout the modelled period (implied by EPS in every quarterly report)", es: "300 millones de acciones en todo el periodo modelado (implícito en la UPA de cada informe)" } }
    ],
    holders: [
      { name: "Fernando Chico Pardo (controlling shareholder, series BB via ITA and series B)", pct: null, note: { en: "Controlling shareholder; ITA (Inversiones y Técnicas Aeroportuarias) is the strategic partner being merged into ASUR (approved 20-Aug-2026).", es: "Accionista de control; ITA (Inversiones y Técnicas Aeroportuarias) es el socio estratégico que se fusiona en ASUR (aprobado el 20-ago-2026)." }, source: { en: "ASUR releases 23-Jun-2026 and 20-Aug-2026; Form 20-F for percentages", es: "Comunicados de ASUR 23-jun-2026 y 20-ago-2026; Forma 20-F para porcentajes" } }
    ],
    source: { en: "ASUR release 20-Aug-2026 (summary of resolutions)", es: "Comunicado de ASUR 20-ago-2026 (resumen de resoluciones)" }
  },
  concessions: [
    { scope: "9 Mexican airports", scopeEs: "9 aeropuertos en México", granted: "1998-11-01", expires: "2048-11-01", years: 50, note: { en: "50-year concessions from the Mexican federal government (SICT/AFAC), extendable at the government's discretion.", es: "Concesiones a 50 años del gobierno federal mexicano (SICT/AFAC), prorrogables a discreción del gobierno." }, source: { en: "ASUR Form 20-F", es: "Forma 20-F de ASUR" } },
    { scope: "San Juan, Puerto Rico (Aerostar, 60%)", scopeEs: "San Juan, Puerto Rico (Aerostar, 60%)", granted: "2013-02-27", expires: "2053-02-27", years: 40, note: { en: "40-year lease of Luis Muñoz Marín airport under the FAA airport privatisation pilot programme; ASUR holds 60% of Aerostar Airport Holdings.", es: "Arrendamiento a 40 años del aeropuerto Luis Muñoz Marín bajo el programa piloto de privatización de la FAA; ASUR tiene 60% de Aerostar Airport Holdings." }, source: { en: "ASUR releases (About ASUR) and Form 20-F", es: "Comunicados de ASUR (Acerca de ASUR) y Forma 20-F" } },
    { scope: "6 airports in Colombia (Airplan)", scopeEs: "6 aeropuertos en Colombia (Airplan)", granted: "2008-01-01", expires: null, years: null, note: { en: "Airplan concession (Medellín Rionegro, Olaya Herrera, Montería, Carepa, Quibdó, Corozal), acquired by ASUR in 2017; term per the Form 20-F (runs into the 2030s). The amortisation method of the concession changed in 3Q25.", es: "Concesión de Airplan (Medellín Rionegro, Olaya Herrera, Montería, Carepa, Quibdó, Corozal), adquirida por ASUR en 2017; plazo según la Forma 20-F (llega a la década de 2030). El método de amortización de la concesión cambió en el 3T25." }, source: { en: "ASUR 2Q26 report; Form 20-F", es: "Informe 2T26 de ASUR; Forma 20-F" } }
  ],
  regulation: {
    updatedAt: "2026-09-22",
    facts: [
      { label: { es: "Guía formal", en: "Formal guidance" }, value: { es: "No publica; la dirección da objetivos cualitativos en la conferencia.", en: "None published; management gives qualitative targets on the call." }, source: { es: "Conferencia 2T26 (23-jul-2026)", en: "2Q26 call (23-Jul-2026)" } },
      { label: { es: "Cumplimiento de tarifa máxima 2026 (Cancún)", en: "Maximum-tariff compliance 2026 (Cancún)" }, value: { es: "Objetivo ≈99% al cierre del año (mezcla de pasajeros cambió)", en: "Target ≈99% by year-end (passenger mix changed)" }, source: { es: "Adolfo Castro, conferencia 2T26", en: "Adolfo Castro, 2Q26 call" } },
      { label: { es: "Tráfico 2S26", en: "2H26 traffic" }, value: { es: "3T26 similar al 2T26; mejora esperada en el 4T26 con más asientos en temporada de invierno", en: "3Q26 similar to 2Q26; improvement expected in 4Q26 with more winter-season seats" }, source: { es: "Conferencia 2T26", en: "2Q26 call" } },
      { label: { es: "Terminal 1 de Cancún", en: "Cancún Terminal 1" }, value: { es: "Remodelación en curso; apertura esperada en el 4T26", en: "Remodelling under way; opening expected in 4Q26" }, source: { es: "Conferencia 2T26", en: "2Q26 call" } },
      { label: { es: "ASUR US Airports", en: "ASUR US Airports" }, value: { es: "JFK T8 transformado (US$125 M, abril 2026); New Terminal One abre hacia el 1T27; margen EBITDA actual ≈9%", en: "JFK T8 transformation done (US$125 M, April 2026); New Terminal One opens around 1Q27; current EBITDA margin ≈9%" }, source: { es: "Conferencia 2T26", en: "2Q26 call" } },
      { label: { es: "Capex 2T26", en: "2Q26 capex" }, value: { es: "Ps. 1,950 M (+40.3% a/a)", en: "Ps. 1,950 M (+40.3% YoY)" }, source: { es: "Informe 2T26, Tabla 1", en: "2Q26 report, Table 1" } },
      { label: { es: "Dividendos 2026", en: "2026 dividends" }, value: { es: "Ps. 10.00 ordinario (mayo) + 2 × Ps. 10.00 extraordinarios (24-nov y 15-dic)", en: "Ps. 10.00 ordinary (May) + 2 × Ps. 10.00 extraordinary (24-Nov and 15-Dec)" }, source: { es: "Asambleas 23-abr-2026 y 20-ago-2026", en: "Shareholder meetings 23-Apr-2026 and 20-Aug-2026" } }
    ]
  },
  dividends: [
    { agmYear: 2025, agmDate: "2025-04-23", dps: 80.00, note: { en: "Ps. 50.00 ordinary (May-2025) plus two extraordinary dividends of Ps. 15.00 (Sep-2025 and Nov-2025) from the buyback reserve.", es: "Ps. 50.00 ordinario (may-2025) más dos extraordinarios de Ps. 15.00 (sep-2025 y nov-2025) con cargo a la reserva de recompra." }, source: { en: "ASUR release 23-Apr-2025 (AGM resolutions)", es: "Comunicado de ASUR 23-abr-2025 (resoluciones de la asamblea)" } },
    { agmYear: 2026, agmDate: "2026-04-23", dps: 30.00, note: { en: "Ps. 10.00 ordinary (paid May-2026) plus two extraordinary dividends of Ps. 10.00 each from the buyback reserve, payable 24-Nov-2026 and 15-Dec-2026 (approved 20-Aug-2026).", es: "Ps. 10.00 ordinario (pagado en may-2026) más dos extraordinarios de Ps. 10.00 cada uno con cargo a la reserva de recompra, pagaderos el 24-nov-2026 y el 15-dic-2026 (aprobados el 20-ago-2026)." }, source: { en: "ASUR releases 23-Apr-2026 and 20-Aug-2026", es: "Comunicados de ASUR 23-abr-2026 y 20-ago-2026" } }
  ],
  debt: {
    ratings: [],
    instruments: [
      { name: "Aerostar 2013 bonds (US$350 M)", type: { en: "USD bond (Puerto Rico)", es: "bono en US$ (Puerto Rico)" }, issued: "2013-03-01", matures: "2035-12-31", principalMxn: 4262, rate: "5.75% (US$)", note: { en: "Balance US$244.0 M at 30-Jun-2026, amortising to 2035; converted at Ps. 17.4693/US$.", es: "Saldo US$244.0 M al 30-jun-2026, amortizable hasta 2035; convertido a Ps. 17.4693/US$." }, source: "ASUR 2Q26 Table 7" },
      { name: "Aerostar 2015 bonds (US$200 M)", type: { en: "USD bond (Puerto Rico)", es: "bono en US$ (Puerto Rico)" }, issued: "2015-06-01", matures: "2035-12-31", principalMxn: 3494, rate: "4.92% (US$)", note: { en: "Bullet 2035 (maturity modified in May-2022); Ps. 17.4693/US$.", es: "Pago único en 2035 (vencimiento modificado en may-2022); Ps. 17.4693/US$." }, source: "ASUR 2Q26 Table 7" },
      { name: "Aerostar bonds (US$50 M)", type: { en: "USD bond (Puerto Rico)", es: "bono en US$ (Puerto Rico)" }, issued: "2015-06-01", matures: "2035-12-31", principalMxn: 873, rate: "6.75% (US$)", note: { en: "Balance US$42.0 M; Ps. 17.4693/US$.", es: "Saldo US$42.0 M; Ps. 17.4693/US$." }, source: "ASUR 2Q26 Table 7" },
      { name: "BBVA loan (Cancún Airport)", type: { en: "bank loan", es: "préstamo bancario" }, issued: "2021-10-01", matures: "2029-12-31", principalMxn: 1750, rate: { en: "TIIE + 1.35 pp", es: "TIIE + 1.35 pp" }, note: { en: "Ps. 2,000 M original; Ps. 50 M quarterly repayments Apr-2023 to Apr-2024.", es: "Ps. 2,000 M originales; amortizaciones de Ps. 50 M trimestrales de abr-2023 a abr-2024." }, source: "ASUR 2Q26 Table 7" },
      { name: "BBVA loan (Cancún Airport)", type: { en: "bank loan", es: "préstamo bancario" }, issued: "2025-05-22", matures: "2027-12-31", principalMxn: 9500, rate: { en: "TIIE de fondeo + 1.25 pp", es: "TIIE de fondeo + 1.25 pp" }, note: { en: "Ps. 9,500 M; funded the 2025 dividends and liquidity.", es: "Ps. 9,500 M; financió los dividendos 2025 y liquidez." }, source: "ASUR 2Q26 Table 7" },
      { name: "Santander loan (Cancún Airport)", type: { en: "bank loan", es: "préstamo bancario" }, issued: "2025-09-26", matures: "2027-09-26", principalMxn: 675, rate: { en: "TIIE de fondeo + 1.50 pp", es: "TIIE de fondeo + 1.50 pp" }, note: { en: "Renewal of the Sep-2021 Ps. 2,650 M loan after prepayments in 2022–2023.", es: "Renovación del préstamo de sep-2021 por Ps. 2,650 M tras prepagos en 2022–2023." }, source: "ASUR 2Q26 Table 7" },
      { name: "JPMorgan Chase loan", type: { en: "bank loan", es: "préstamo bancario" }, issued: "2025-12-05", matures: "2027-12-31", principalMxn: 6390, rate: { en: "TIIE de fondeo + 0.75 pp", es: "TIIE de fondeo + 0.75 pp" }, note: { en: "Ps. 6,390 M drawn days before the URW Airports (ASUR US) closing on 11-Dec-2025.", es: "Ps. 6,390 M dispuestos días antes del cierre de URW Airports (ASUR US) el 11-dic-2025." }, source: "ASUR 2Q26 Table 7; release 30-Jul-2025" }
    ],
    instrumentsNote: {
      en: "Colombia (Airplan) carries bank facilities pegged to the DTF rate (Table 7); the Colombian acquisition loan was repaid on 22-Apr-2026. Total debt Ps. 26,780 M, cash Ps. 11,641 M and net debt Ps. 15,138 M at 30-Jun-2026 (0.9× LTM EBITDA). The Motiva/CPC purchase closed on 1-Sep-2026 for R$5.1 bn (US$992 M) financed with a loan facility arranged at the time of the offer; it will appear in the 3Q26 balance sheet.",
      es: "Colombia (Airplan) tiene créditos bancarios referenciados a la tasa DTF (Tabla 7); el crédito de adquisición colombiano se liquidó el 22-abr-2026. Deuda total Ps. 26,780 M, efectivo Ps. 11,641 M y deuda neta Ps. 15,138 M al 30-jun-2026 (0.9× EBITDA UDM). La compra de Motiva/CPC cerró el 1-sep-2026 por R$5.1 mil millones (US$992 M) financiada con un crédito contratado al presentar la oferta; aparecerá en el balance del 3T26."
    },
    history: []
  },
  event: {
    timeline: [
      { date: "2025-07-30", en: "ASUR signs the purchase of URW Airports (LAX, ORD, JFK retail concessions) for an enterprise value of US$295 M, funded with cash and JPMorgan financing.", es: "ASUR firma la compra de URW Airports (concesiones comerciales en LAX, ORD y JFK) por un valor de empresa de US$295 M, con efectivo y financiamiento de JPMorgan." },
      { date: "2025-11-18", en: "Purchase agreement with Motiva for 100% of CPC: R$5,000 M (US$936 M) equity, implied EV R$13,700 M (US$2,566 M); 20 airports in Brazil, Ecuador, Costa Rica and Curaçao.", es: "Contrato de compra con Motiva por el 100% de CPC: R$5,000 M (US$936 M) de capital, VE implícito R$13,700 M (US$2,566 M); 20 aeropuertos en Brasil, Ecuador, Costa Rica y Curazao." },
      { date: "2025-12-05", en: "Ps. 6,390 M loan from JPMorgan Chase (TIIE de fondeo + 0.75 pp, 2027).", es: "Crédito de Ps. 6,390 M con JPMorgan Chase (TIIE de fondeo + 0.75 pp, 2027)." },
      { date: "2025-12-11", en: "URW Airports acquisition closes; the business is renamed ASUR Airports (ASUR US Airports) and consolidates from December 2025.", es: "Cierra la compra de URW Airports; el negocio pasa a llamarse ASUR Airports (ASUR US Airports) y consolida desde diciembre de 2025." },
      { date: "2026-04-21", en: "ASUR US completes the US$125 M commercial transformation of JFK Terminal 8 (60+ dining, retail and duty-free concepts).", es: "ASUR US concluye la transformación comercial de la Terminal 8 de JFK por US$125 M (más de 60 conceptos de restaurantes, retail y duty-free)." },
      { date: "2026-06-23", en: "Board proposes internalising ITA's technical-assistance services through a merger (≈7.25 M new shares) and two extraordinary dividends of Ps. 10.00.", es: "El consejo propone internalizar los servicios de asistencia técnica de ITA mediante una fusión (≈7.25 M de acciones nuevas) y dos dividendos extraordinarios de Ps. 10.00." },
      { date: "2026-07-23", en: "2Q26: ASUR US contributed Ps. 443.8 M of revenue and Ps. 19.6 M of EBITDA; consolidated adjusted EBITDA margin 62.0% (67.6% a year earlier).", es: "2T26: ASUR US aportó Ps. 443.8 M de ingresos y Ps. 19.6 M de EBITDA; margen EBITDA ajustado consolidado 62.0% (67.6% un año antes)." },
      { date: "2026-08-20", en: "Shareholders approve the ITA merger (≈7.2 M net new shares; 300 M → ≈307.2 M shares), the extraordinary dividends and the bylaw amendments.", es: "Los accionistas aprueban la fusión con ITA (≈7.2 M de acciones netas nuevas; de 300 M a ≈307.2 M), los dividendos extraordinarios y las reformas a los estatutos." },
      { date: "2026-09-01", en: "Motiva/CPC acquisition closes for R$5.1 bn (US$992.2 M) after closing adjustments, financed with a loan facility; ASUR adds 20 airports and ≈45 M annual passengers.", es: "Cierra la compra de Motiva/CPC por R$5.1 mil millones (US$992.2 M) tras ajustes de cierre, financiada con un crédito; ASUR suma 20 aeropuertos y ≈45 M de pasajeros anuales." }
    ],
    facts: [
      { k: "motivaPrice", v: 992.2, fmt: "usdM", label: { es: "Precio pagado por CPC (Motiva)", en: "Price paid for CPC (Motiva)" }, source: "ASUR 1-Sep-2026" },
      { k: "motivaEv", v: 2566, fmt: "usdM", label: { es: "VE implícito al firmar (100%)", en: "Implied EV at signing (100%)" }, source: "ASUR 18-Nov-2025" },
      { k: "motivaEbitda", v: 243, fmt: "usdM", label: { es: "EBITDA proporcional UDM sep-25 (R$1,300 M)", en: "Proportionate LTM Sep-25 EBITDA (R$1,300 M)" }, source: "ASUR 18-Nov-2025" },
      { k: "motivaNetDebt", v: 1180, fmt: "usdM", label: { es: "Deuda neta financiera de CPC al 100% (R$6,300 M)", en: "CPC net financial debt at 100% (R$6,300 M)" }, source: "ASUR 18-Nov-2025" },
      { k: "motivaAirports", v: 20, fmt: "int", label: { es: "Aeropuertos añadidos (17 con >15 años de concesión)", en: "Airports added (17 with >15 years of concession left)" }, source: "ASUR 18-Nov-2025" },
      { k: "motivaPax", v: 45, fmt: "M", label: { es: "Pasajeros anuales añadidos (vs. 71 M de ASUR en 2024)", en: "Annual passengers added (vs. ASUR's 71 M in 2024)" }, source: "ASUR 18-Nov-2025" },
      { k: "urwEv", v: 295, fmt: "usdM", label: { es: "Valor de empresa de URW Airports (ASUR US)", en: "URW Airports enterprise value (ASUR US)" }, source: "ASUR 30-Jul-2025" },
      { k: "usRev", v: 443.8, fmt: "mxnM", label: { es: "Ingresos de ASUR US en el 2T26 (EBITDA Ps. 19.6 M)", en: "ASUR US revenue in 2Q26 (EBITDA Ps. 19.6 M)" }, source: "ASUR 2Q26" },
      { k: "itaShares", v: 7200000, fmt: "int", label: { es: "Acciones netas nuevas por la fusión con ITA (≈2.4%)", en: "Net new shares from the ITA merger (≈2.4%)" }, source: "ASUR 20-Aug-2026" },
      { k: "itaFee", v: 401, fmt: "mxnM", label: { es: "Cuota de asistencia técnica pagada a ITA en 2025", en: "Technical-assistance fees paid to ITA in 2025" }, source: { es: "Conferencia 2T26", en: "2Q26 call" } }
    ],
    sources: {
      en: ["ASUR releases 30-Jul-2025, 18-Nov-2025, 11-Dec-2025, 23-Jun-2026, 20-Aug-2026 and 1-Sep-2026 (PR Newswire)", "ASUR 2Q26 report and call transcript (23-Jul-2026)"],
      es: ["Comunicados de ASUR 30-jul-2025, 18-nov-2025, 11-dic-2025, 23-jun-2026, 20-ago-2026 y 1-sep-2026 (PR Newswire)", "Informe y transcripción del 2T26 de ASUR (23-jul-2026)"]
    }
  },
  explainer: {
    rows: [
      { label: { es: "Aerostar Airport Holdings (Puerto Rico)", en: "Aerostar Airport Holdings (Puerto Rico)" }, value: { es: "ASUR 60%; opera el aeropuerto Luis Muñoz Marín de San Juan bajo un arrendamiento de 40 años (2013–2053), única APP concluida bajo el programa piloto de la FAA. Se consolida al 100%; el 40% aparece como participación no controladora.", en: "ASUR 60%; operates San Juan's Luis Muñoz Marín airport under a 40-year lease (2013–2053), the only completed PPP under the FAA pilot programme. Fully consolidated; the 40% appears as non-controlling interest." } },
      { label: { es: "Airplan (Colombia)", en: "Airplan (Colombia)" }, value: { es: "Seis aeropuertos: Medellín–Rionegro (José María Córdova), Olaya Herrera, Montería, Carepa, Quibdó y Corozal; adquirida en 2017. Desde el 3T25 la concesión se amortiza con otro método (D&A de Colombia +170.7% en el 2T26); el crédito de adquisición se pagó el 22-abr-2026.", en: "Six airports: Medellín–Rionegro (José María Córdova), Olaya Herrera, Montería, Carepa, Quibdó and Corozal; acquired in 2017. Since 3Q25 the concession is amortised under a different method (Colombia D&A +170.7% in 2Q26); the acquisition loan was repaid on 22-Apr-2026." } },
      { label: { es: "Tráfico 2T26 por país", en: "2Q26 traffic by country" }, value: { es: "México 9.51 M (−5.0%; Cancún −7.8%, otros ocho +2.5%) · Puerto Rico 3.46 M (−3.5%) · Colombia 4.29 M (+3.6%).", en: "Mexico 9.51 M (−5.0%; Cancún −7.8%, other eight +2.5%) · Puerto Rico 3.46 M (−3.5%) · Colombia 4.29 M (+3.6%)." } },
      { label: { es: "EBITDA 2T26 por país (Ps. M)", en: "2Q26 EBITDA by country (Ps. M)" }, value: { es: "México 3,501.1 (−9.1%) · Puerto Rico 543.0 (−16.9%) · Colombia 526.2 (+1.0%) · Estados Unidos 19.6.", en: "Mexico 3,501.1 (−9.1%) · Puerto Rico 543.0 (−16.9%) · Colombia 526.2 (+1.0%) · United States 19.6." } },
      { label: { es: "Ingreso comercial por pasajero 2T26 (Ps.)", en: "2Q26 commercial revenue per passenger (Ps.)" }, value: { es: "Consolidado 153.0 (+12.6%) · México 145.7 (−8.1%) · San Juan 167.5 (+1.3%) · Colombia 63.2 (+9.3%).", en: "Consolidated 153.0 (+12.6%) · Mexico 145.7 (−8.1%) · San Juan 167.5 (+1.3%) · Colombia 63.2 (+9.3%)." } },
      { label: { es: "Moneda", en: "Currency" }, value: { es: "Puerto Rico y ASUR US operan en dólares; Colombia en pesos colombianos (COP 195.17 = Ps. 1.00 al 30-jun-2026). Un peso mexicano fuerte reduce los ingresos traducidos.", en: "Puerto Rico and ASUR US operate in US dollars; Colombia in Colombian pesos (COP 195.17 = Ps. 1.00 at 30-Jun-2026). A strong Mexican peso lowers translated revenue." } }
    ],
    status: { es: "Los tres segmentos históricos (México, Puerto Rico, Colombia) más Estados Unidos desde el 4T25 se muestran en la tarjeta 'Segmentos' de la sección 01; Brasil, Ecuador, Costa Rica y Curazao (Motiva) se sumarán a partir del 3T26.", en: "The three historical segments (Mexico, Puerto Rico, Colombia) plus the United States from 4Q25 appear in the 'Segments' card of section 01; Brazil, Ecuador, Costa Rica and Curaçao (Motiva) join from 3Q26." },
    sources: { en: ["ASUR 2Q26 report (Tables 1–2, country reviews)", "ASUR Form 20-F 2025 (concessions, Aerostar, Airplan)"], es: ["Informe 2T26 de ASUR (Tablas 1–2, revisiones por país)", "Forma 20-F 2025 de ASUR (concesiones, Aerostar, Airplan)"] }
  },
  dcf: {
    horizonYears: 5, terminalMethod: "annuity", concessionEnd: 2048,
    trafficGrowthPct: [0.5, 3, 3.5, 3.5, 3], revPerPaxGrowthPct: 5, ebitdaMarginPct: null,
    capexMxnM: [7500, 7500, 6500, 6000, 6000], daPctRevenue: null, taxRatePct: 30, nwcPctDeltaRevenue: 5,
    riskFreePct: null, erpPct: 5, beta: 0.85, costOfDebtPct: 9.5, targetDebtPct: 25, terminalGrowthPct: 4, exitMultiple: 11,
    note: { en: "Fallback assumptions (analyst judgement, not company guidance): traffic 0.5% in 2026 after −0.3% in 6M26, then 3–3.5%; capex from the 2Q26 run-rate (Ps. 1,950 M in the quarter); cost of debt ≈ TIIE de fondeo + 1.25 pp. Beta and the risk-free rate are derived from market data at render time. Motiva's airports are not in the base (consolidated from 3Q26).", es: "Supuestos de respaldo (juicio del analista, no guía de la empresa): tráfico 0.5% en 2026 tras −0.3% en 6M26, luego 3–3.5%; capex según el ritmo del 2T26 (Ps. 1,950 M en el trimestre); costo de deuda ≈ TIIE de fondeo + 1.25 pp. La beta y la tasa libre de riesgo se derivan del mercado al renderizar. Los aeropuertos de Motiva no están en la base (consolidan desde el 3T26)." }
  },
  peers: ["GAP", "OMA", "AENA", "Fraport", "Flughafen Zürich", "Auckland International"]
};
