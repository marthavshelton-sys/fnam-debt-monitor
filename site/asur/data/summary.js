// Executive summary shown at the top of the page. compose: true → the bullets written exactly as {{auto:traffic}},
// {{auto:results}}, {{auto:debt}} and {{auto:calendar}} are composed by the page from the data files every time it loads
// (figures, months, dates: never hand-written), and the hand-written commentary below is withheld automatically while its
// basis quarter is older than the latest quarter in financials.js. The upkeep routine rewrites the commentary with each new
// report, keeps the four markers in place and uses tokens ({{nextResults}}, {{lastQ}}, {{netDebt}}, {{pfLev}}…) instead of
// typing a figure of the latest quarter. Basis periods drive the "as of" line.
window.ASUR_SUMMARY = {
  updatedAt: "2026-10-11",
  compose: true,
  basis: { quarter: "2026Q2", resultsDate: "2026-07-23", trafficMonth: "2026-09", guidanceDate: null },
  sections: [
    { k: "ops", title: { es: "Operación", en: "Operations" },
      es: [
        "{{auto:results}}",
        "Detrás del 2T26: pesan Cancún (−7.8%, internacional −9.1%), el peso 10% más fuerte sobre los cargos en dólares y la consolidación de ASUR US (Ps. 444 M de ingresos, Ps. 20 M de EBITDA, margen ≈9%); la utilidad mayoritaria sube por menor pérdida cambiaria y menos impuestos. La dirección espera un 3T26 parecido al 2T26 y mejora en el 4T26 con más asientos en la temporada de invierno.",
        "{{auto:traffic}}",
        "Ingreso comercial por pasajero en el 2T26 Ps. 153.0 (+12.6%) por ASUR US; en México cae 8.1% a Ps. 145.7. Capex del trimestre Ps. 1,950 M (+40%): remodelación de la Terminal 1 de Cancún, apertura esperada en el 4T26."
      ],
      en: [
        "{{auto:results}}",
        "Behind 2Q26: the drags were Cancún (−7.8%, international −9.1%), a 10% stronger peso on dollar-linked charges and the consolidation of ASUR US (Ps. 444 M revenue, Ps. 20 M EBITDA, ≈9% margin); majority net income rose on a smaller FX loss and lower taxes. Management expects a 3Q26 similar to 2Q26 and improvement in 4Q26 with more winter-season seats.",
        "{{auto:traffic}}",
        "Commercial revenue per passenger in 2Q26 Ps. 153.0 (+12.6%) on ASUR US; Mexico down 8.1% to Ps. 145.7. Quarter capex Ps. 1,950 M (+40%): Cancún Terminal 1 remodeling, opening expected in 4Q26."
      ] },
    { k: "guidance", title: { es: "Expansión y capital", en: "Expansion and capital" },
      es: [
        "Motiva cerró el 1-sep-2026: 100% de CPC por R$5.1 mil millones (US$992 M), VE implícito US$2,566 M al firmar; 20 aeropuertos en Brasil, Ecuador, Costa Rica y Curazao con ≈45 M de pasajeros anuales (ASUR tuvo 71 M en 2024) y EBITDA proporcional UDM de US$243 M. Financiado con crédito; consolida desde el 3T26 y la dirección no espera sinergias relevantes.",
        "Fusión con ITA aprobada el 20-ago-2026: ASUR internaliza la asistencia técnica (cuota de Ps. 401 M en 2025) emitiendo ≈7.2 M de acciones netas (≈2.4%; de 300 M a ≈307.2 M).",
        "ASUR no publica guía. Objetivos cualitativos de la conferencia del 2T26: cumplimiento de tarifa máxima ≈99% al cierre de 2026; JFK Terminal 8 transformada (US$125 M) y New Terminal One hacia el 1T27; LAX en obras antes del Super Bowl 2027 y los Juegos Olímpicos 2028."
      ],
      en: [
        "Motiva closed on 1-Sep-2026: 100% of CPC for R$5.1 bn (US$992 M), implied EV US$2,566 M at signing; 20 airports in Brazil, Ecuador, Costa Rica and Curaçao with ≈45 M annual passengers (ASUR had 71 M in 2024) and proportionate LTM EBITDA of US$243 M. Debt-financed; consolidates from 3Q26 and management expects no meaningful synergies.",
        "ITA merger approved on 20-Aug-2026: ASUR internalizes technical assistance (Ps. 401 M fee in 2025) by issuing ≈7.2 M net new shares (≈2.4%; 300 M → ≈307.2 M).",
        "ASUR publishes no guidance. Qualitative targets from the 2Q26 call: maximum-tariff compliance ≈99% by end-2026; JFK Terminal 8 transformed (US$125 M) and New Terminal One around 1Q27; LAX works ahead of the 2027 Super Bowl and 2028 Olympics."
      ] },
    { k: "debt", title: { es: "Deuda y dividendos", en: "Debt and dividends" },
      es: [
        "{{auto:debt}}",
        "8-oct-2026: Aeropuerto de Cancún liquidó US$1.8 mil millones en notas senior garantizadas por ASUR, su primer bono internacional (US$900 M al 6.711% a 2031 y US$900 M al 7.491% a 2036; S&P BBB, Fitch BBB+), para pagar íntegramente los créditos puente CPC (US$1,299 M) y ASUR US (Ps. 6,390 M); la deuda neta pro forma no cambia, sí el plazo y el costo. El balance del 3T26 será el primero con CPC consolidado (deuda propia de CPC Ps. 20,919 M al firmar).",
        "En el 2T26, gasto por intereses +66.8% por los préstamos de 2025 (BBVA Ps. 9,500 M a 2027, JPMorgan Ps. 6,390 M a 2027) y pérdida cambiaria −78% (Ps. 252 M) con el peso más estable; bonos de Aerostar US$486 M (2035).",
        "Dividendos 2026 aprobados: Ps. 30.00 por acción (Ps. 10.00 ordinario pagado en mayo y dos extraordinarios de Ps. 10.00 con cargo a la reserva de recompra); en 2025 se pagaron Ps. 80 por acción (Ps. 24,000 M)."
      ],
      en: [
        "{{auto:debt}}",
        "8-Oct-2026: Aeropuerto de Cancún settled US$1.8 bn of ASUR-guaranteed senior notes, its first international bond (US$900 M 6.711% 2031 and US$900 M 7.491% 2036; S&P BBB, Fitch BBB+), to repay in full the CPC (US$1,299 M) and ASUR US (Ps. 6,390 M) bridge facilities; pro-forma net debt is unchanged, tenor and cost are not. The 3Q26 balance sheet will be the first with CPC consolidated (CPC's own debt Ps. 20,919 M at signing).",
        "In 2Q26, interest expense +66.8% on the 2025 loans (BBVA Ps. 9,500 M due 2027, JPMorgan Ps. 6,390 M due 2027) and FX loss −78% (Ps. 252 M) with a steadier peso; Aerostar bonds US$486 M (2035).",
        "2026 dividends approved: Ps. 30.00 per share (Ps. 10.00 ordinary paid in May and two extraordinary Ps. 10.00 payments from the buyback reserve); 2025 paid Ps. 80 per share (Ps. 24,000 M)."
      ] },
    { k: "watch", title: { es: "Qué vigilar", en: "What to watch" },
      es: [
        "{{auto:calendar}}",
        "Resultados del 3T26: primer trimestre con Motiva consolidado (un mes de CPC), primer balance con el crédito puente y la deuda de CPC, costos únicos de la transacción; tráfico de octubre, segundo mes con los 20 aeropuertos nuevos.",
        "Cancún: recuperación internacional (EE. UU. −11.7% en el 2T26, sargazo, capacidad de Spirit/Viva-Volaris), apertura de la Terminal 1 en el 4T26 y cumplimiento de la tarifa máxima.",
        "Refinanciamiento del resto de los préstamos de 2027 (BBVA Ps. 9,500 M, Santander Ps. 675 M) tras pagar los créditos puente con las notas del 8-oct; compra de las minorías de Confins (Infraero, Zurich) prevista en diciembre; primer año completo de ASUR US con New Terminal One."
      ],
      en: [
        "{{auto:calendar}}",
        "3Q26 results: first quarter with Motiva consolidated (one month of CPC), first balance sheet with the bridge and CPC's debt, one-off transaction costs; October traffic, the second month with the 20 new airports.",
        "Cancún: international recovery (US −11.7% in 2Q26, sargassum, Spirit/Viva-Volaris capacity), Terminal 1 opening in 4Q26 and maximum-tariff compliance.",
        "Refinancing of the other 2027 loans (BBVA Ps. 9,500 M, Santander Ps. 675 M) after the bridges were repaid with the 8-Oct notes; the Confins minority purchases (Infraero, Zurich) expected in December; ASUR US's first full year with New Terminal One."
      ] }
  ]
};
