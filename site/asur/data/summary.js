// Executive summary shown at the top of the page. compose: true → the bullets written exactly as {{auto:traffic}},
// {{auto:results}}, {{auto:debt}} and {{auto:calendar}} are composed by the page from the data files every time it loads
// (figures, months, dates: never hand-written), and the hand-written commentary below is withheld automatically while its
// basis quarter is older than the latest quarter in financials.js. The upkeep routine rewrites the commentary with each new
// report, keeps the four markers in place and uses tokens ({{nextResults}}, {{lastQ}}, {{netDebt}}, {{pfLev}}…) instead of
// typing a figure of the latest quarter. Basis periods drive the "as of" line.
window.ASUR_SUMMARY = {
  updatedAt: "2026-10-22",
  compose: true,
  basis: { quarter: "2026Q3", resultsDate: "2026-10-22", trafficMonth: "2026-09", guidanceDate: null },
  sections: [
    { k: "ops", title: { es: "Operación", en: "Operations" },
      es: [
        "{{auto:results}}",
        "Detrás del 3T26: Cancún −8.8% (internacional −13.3%) y el peso bajan el EBITDA de México 9.5%; lo compensan un mes de Brasil y otros (EBITDA Ps. 313.2 M, margen ajustado 46.3%), ASUR US (Ps. 49.0 M) y Puerto Rico (+7.1%). La utilidad mayoritaria sube 2.1% con menos impuesto causado y Ps. 719.2 M de ganancia en forwards cambiarios.",
        "{{auto:traffic}}",
        "Ingreso comercial por pasajero Ps. 130.5 (+3.5%); en México −10.4% a Ps. 129.1, con duty free −16.4% y renta de autos −17.6%. Capex del trimestre Ps. 2,716.6 M (+45.1%), de ellos Ps. 2,241.5 M en México bajo el PMD."
      ],
      en: [
        "{{auto:results}}",
        "Behind 3Q26: Cancún −8.8% (international −13.3%) and the peso cut Mexico's EBITDA 9.5%; one month of Brazil & Others (EBITDA Ps. 313.2 M, 46.3% adjusted margin), ASUR US (Ps. 49.0 M) and Puerto Rico (+7.1%) offset it. Majority net income rose 2.1% on lower current tax and a Ps. 719.2 M gain on FX forwards.",
        "{{auto:traffic}}",
        "Commercial revenue per passenger Ps. 130.5 (+3.5%); Mexico −10.4% to Ps. 129.1, with duty free −16.4% and car rental −17.6%. Quarter capex Ps. 2,716.6 M (+45.1%), of which Ps. 2,241.5 M in Mexico under the MDP."
      ] },
    { k: "guidance", title: { es: "Expansión y capital", en: "Expansion and capital" },
      es: [
        "Motiva/CPC cerró el 1-sep-2026 por R$5.1 mil millones (US$992.2 M) y consolida línea por línea desde esa fecha: en septiembre aportó Ps. 841.2 M de ingresos y Ps. 313.2 M de EBITDA; crédito mercantil preliminar Ps. 7,191.8 M. Hay minoritarios en Ecuador (53.5%), Curazao (20.2%), Costa Rica (2.5%) y Belo Horizonte (61.7%).",
        "Fusión con ITA aprobada el 20-ago-2026: ≈7.2 M de acciones netas nuevas (de 300.0 M a ≈307.3 M según el informe del 3T26); la cuota de asistencia técnica bajó 31.6% en el 3T26 (Ps. 61.0 M) y desaparece con la fusión.",
        "ASUR no publica guía. ASUR US en su tercer trimestre completo: ingresos Ps. 456.4 M y EBITDA Ps. 49.0 M (margen 10.7%). Objetivos de la conferencia del 2T26, a revisar en la del 23-oct-2026: tarifa máxima ≈99% al cierre de 2026 y New Terminal One de JFK hacia el 1T27."
      ],
      en: [
        "Motiva/CPC closed on 1-Sep-2026 for R$5.1 bn (US$992.2 M) and consolidates line by line from that date: in September it contributed Ps. 841.2 M of revenue and Ps. 313.2 M of EBITDA; preliminary goodwill Ps. 7,191.8 M. Minorities remain in Ecuador (53.5%), Curaçao (20.2%), Costa Rica (2.5%) and Belo Horizonte (61.7%).",
        "ITA merger approved on 20-Aug-2026: ≈7.2 M net new shares (300.0 M → ≈307.3 M per the 3Q26 report); the technical-assistance fee fell 31.6% in 3Q26 (Ps. 61.0 M) and disappears with the merger.",
        "ASUR publishes no guidance. ASUR US in its third full quarter: revenue Ps. 456.4 M and EBITDA Ps. 49.0 M (10.7% margin). Targets from the 2Q26 call, to be revisited on the 23-Oct-2026 call: maximum-tariff compliance ≈99% by end-2026 and JFK's New Terminal One around 1Q27."
      ] },
    { k: "debt", title: { es: "Deuda y dividendos", en: "Debt and dividends" },
      es: [
        "{{auto:debt}}",
        "El balance al {{bsDate}} es el primero con CPC: Ps. 21,009.2 M de deuda de Brasil y otros (BNDES y BNB en reales; 27.1% de la deuda total) y el crédito puente de Ps. 22,225.1 M (US$1,230 M). El EBITDA UDM lleva un solo mes de CPC frente a toda su deuda, por eso el 2.6× que imprime ASUR sobrestima el apalancamiento de un año completo.",
        "8-oct-2026: Aeropuerto de Cancún colocó US$1.8 mil millones en notas senior (US$900 M al 6.711% 2031 y US$900 M al 7.491% 2036; S&P BBB, Fitch BBB+) y prepagó los créditos de JPMorgan (Ps. 6,390 M y US$1,230 M), Santander (Ps. 675 M) y Ps. 3,000 M del BBVA de Ps. 9,500 M. En el 3T26 el resultado financiero perdió Ps. 718.7 M: intereses +95.6% y pérdida cambiaria de Ps. 803.5 M.",
        "Dividendos 2026: Ps. 30.00 por acción (Ps. 10.00 ordinario pagado en mayo y dos extraordinarios de Ps. 10.00 de la reserva de recompra, pagaderos a partir del 30-nov-2026 y del 23-dic-2026)."
      ],
      en: [
        "{{auto:debt}}",
        "The {{bsDate}} balance sheet is the first with CPC: Ps. 21,009.2 M of Brazil & Others debt (BNDES and BNB in reais; 27.1% of total debt) and the Ps. 22,225.1 M (US$1,230 M) bridge loan. LTM EBITDA carries only one month of CPC against all of its debt, so the 2.6× ASUR prints overstates full-year leverage.",
        "8-Oct-2026: Aeropuerto de Cancún placed US$1.8 bn of senior notes (US$900 M 6.711% 2031 and US$900 M 7.491% 2036; S&P BBB, Fitch BBB+) and prepaid the JPMorgan loans (Ps. 6,390 M and US$1,230 M), Santander (Ps. 675 M) and Ps. 3,000 M of the Ps. 9,500 M BBVA loan. In 3Q26 the financing result was a Ps. 718.7 M loss: interest +95.6% and a Ps. 803.5 M FX loss.",
        "2026 dividends: Ps. 30.00 per share (Ps. 10.00 ordinary paid in May and two extraordinary Ps. 10.00 payments from the buyback reserve, payable from 30-Nov-2026 and 23-Dec-2026)."
      ] },
    { k: "watch", title: { es: "Qué vigilar", en: "What to watch" },
      es: [
        "{{auto:calendar}}",
        "Conferencia del 3T26 el 23-oct-2026 (10:00 ET): tráfico de la temporada de invierno, cumplimiento de la tarifa máxima de 2026, integración de CPC y la compra de las minorías de Confins (Infraero, Zurich) prevista en diciembre.",
        "4T26: primer trimestre completo de CPC y el primero con las notas de 2031 y 2036 en lugar de los créditos puente; recuperación del internacional de Cancún (−13.3% en el 3T26) y apertura de la Terminal 1.",
        "Vencimientos restantes de 2027 en México: el saldo del crédito BBVA de Ps. 9,500 M tras el prepago de Ps. 3,000 M (vence el 21-may-2027)."
      ],
      en: [
        "{{auto:calendar}}",
        "3Q26 call on 23-Oct-2026 (10:00 ET): winter-season traffic, 2026 maximum-tariff compliance, CPC integration and the purchase of the Confins minorities (Infraero, Zurich) expected in December.",
        "4Q26: the first full quarter of CPC and the first with the 2031 and 2036 notes in place of the bridge loans; recovery of Cancún's international traffic (−13.3% in 3Q26) and the Terminal 1 opening.",
        "Remaining 2027 maturities in Mexico: the balance of the Ps. 9,500 M BBVA loan after the Ps. 3,000 M prepayment (due 21-May-2027)."
      ] }
  ]
};
