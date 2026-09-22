// One-line explanations for year-over-year comparisons, per income-statement line (`lines`) and per
// operating metric (`ops`), ES and EN. Keys: quarter `2026Q2`, year-to-date `2026M6`, fiscal year `FY2025`.
// Written from ASUR's 2Q26 report (23-Jul-2026) and the 2Q26 earnings-call transcript; percentages are ASUR's.
window.ASUR_COMMENTS = {
  updatedAt: "2026-09-22",
  periods: {
    "2026Q2": {
      call: { date: "2026-07-23", es: "conferencia de resultados del 2T26 (23 jul 2026, transcripción publicada por ASUR)", en: "2Q26 earnings call (23 Jul 2026, transcript published by ASUR)" },
      ops: {
        dom: { es: "−0.6%: México −1.7% (Cancún −5.6%, otros ocho +2.3%), Puerto Rico −3.7%, Colombia +4.1%.", en: "−0.6%: Mexico −1.7% (Cancún −5.6%, other eight +2.3%), Puerto Rico −3.7%, Colombia +4.1%." },
        intl: { es: "−6.4%: México −8.3% (EE. UU. −11.7%, Europa −11.8%, Sudamérica −6.5%; Canadá +10.5%) por menos capacidad tras la quiebra de Spirit, tarifas aéreas y combustible más caros y sin flujo extra del Mundial; Colombia +1.8%.", en: "−6.4%: Mexico −8.3% (US −11.7%, Europe −11.8%, South America −6.5%; Canada +10.5%) on capacity lost with Spirit's bankruptcy, higher airfares and jet fuel and no incremental World Cup flows; Colombia +1.8%." },
        total: { es: "−2.7% a 17.25 M: la dirección espera un 3T26 parecido y mejora en el 4T26 con más asientos en invierno; sargazo alto todo el verano.", en: "−2.7% to 17.25 M: management expects a similar 3Q26 and improvement in 4Q26 with more winter seats; heavy sargassum all summer." },
        country_MX: { es: "−5.0%: Cancún −7.8% (internacional −9.1%); los otros ocho aeropuertos +2.5%.", en: "−5.0%: Cancún −7.8% (international −9.1%); the other eight airports +2.5%." },
        country_PR: { es: "−3.5%: doméstico −3.7% e internacional −2.4% (San Juan incluye tránsito y aviación general).", en: "−3.5%: domestic −3.7% and international −2.4% (San Juan includes transit and general aviation)." },
        country_CO: { es: "+3.6%: doméstico +4.1%, internacional +1.8%; junio −1.0% tras un semestre de +7.3%.", en: "+3.6%: domestic +4.1%, international +1.8%; June −1.0% after +7.3% in the half." },
        aeroPerPax: { es: "Ingresos aeronáuticos −5.7% con tráfico −2.7%: peso 10% más fuerte sobre los cargos en dólares de Puerto Rico y Cancún; cumplimiento de tarifa máxima por debajo del año (objetivo ≈99% al cierre).", en: "Aeronautical revenue −5.7% on traffic −2.7%: a 10% stronger peso on the dollar-linked charges in Puerto Rico and Cancún; maximum-tariff compliance below the year's target (≈99% by year-end)." },
        nonAeroPerPax: { es: "+12.5%: ASUR US aporta Ps. 443.8 M sin pasajeros propios en el denominador; Colombia +13.2% en comercial.", en: "+12.5%: ASUR US adds Ps. 443.8 M with no passengers of its own in the denominator; Colombia commercial +13.2%." },
        commercialPerPax: { es: "Ps. 153.0 (+12.6%, Tabla 1): ASUR US Ps. 416.9 M; México −8.1% a Ps. 145.7 (peso fuerte, menos tráfico), San Juan +1.3%, Colombia +9.3%.", en: "Ps. 153.0 (+12.6%, Table 1): ASUR US Ps. 416.9 M; Mexico −8.1% to Ps. 145.7 (strong peso, lower traffic), San Juan +1.3%, Colombia +9.3%." },
        revPerPaxAll: { es: "Ingresos sin construcción −0.3% sobre 2.7% menos pasajeros: el negocio de EE. UU. compensa la caída aeronáutica.", en: "Revenue ex-construction −0.3% on 2.7% fewer passengers: the US business offsets the aeronautical decline." },
        capex: { es: "+40.3% a Ps. 1,950 M: remodelación de la Terminal 1 de Cancún (apertura esperada 4T26) y obras del PMD en México.", en: "+40.3% to Ps. 1,950 M: Cancún Terminal 1 remodelling (opening expected 4Q26) and MDP works in Mexico." },
        netDebt: { es: "Ps. 15,138 M (0.9× EBITDA UDM) vs. Ps. 1,934 M: préstamos de Ps. 9,500 M (may-25) y Ps. 6,390 M (dic-25), dividendos de Ps. 24,000 M pagados en 2025 y la compra de URW; efectivo Ps. 11,641 M.", en: "Ps. 15,138 M (0.9× LTM EBITDA) vs. Ps. 1,934 M: the Ps. 9,500 M (May-25) and Ps. 6,390 M (Dec-25) loans, Ps. 24,000 M of dividends paid in 2025 and the URW purchase; cash Ps. 11,641 M." },
        totalDebt: { es: "Ps. 26,780 M: préstamos en México Ps. 18,315 M, bonos de Aerostar US$486 M y créditos de Airplan; el crédito de adquisición colombiano se pagó el 22-abr-2026.", en: "Ps. 26,780 M: Mexican loans Ps. 18,315 M, Aerostar bonds US$486 M and Airplan facilities; the Colombian acquisition loan was repaid on 22-Apr-2026." }
      },
      lines: {
        revTotal: { es: "+9.9%: construcción +69.2% (Ps. 887.7 M) y ASUR US Ps. 443.8 M; sin construcción −0.3%.", en: "+9.9%: construction +69.2% (Ps. 887.7 M) and ASUR US Ps. 443.8 M; ex-construction −0.3%." },
        revAero: { es: "−5.7% (Ps. 273.0 M): menos tráfico en México y Puerto Rico y peso más fuerte; México Ps. 3,379.7 M, Puerto Rico 521.3, Colombia 642.3.", en: "−5.7% (Ps. 273.0 M): lower traffic in Mexico and Puerto Rico and a stronger peso; Mexico Ps. 3,379.7 M, Puerto Rico 521.3, Colombia 642.3." },
        revNonAero: { es: "+9.5% (Ps. 248.8 M): ASUR US Ps. 443.8 M en su segundo trimestre completo; México 1,560.2, Puerto Rico 580.8, Colombia 279.7.", en: "+9.5% (Ps. 248.8 M): ASUR US Ps. 443.8 M in its second full quarter; Mexico 1,560.2, Puerto Rico 580.8, Colombia 279.7." },
        revCommercial: { es: "+9.5%: ASUR US Ps. 416.9 M y Colombia +13.2%; México −12.8% a Ps. 1,393.1 M y Puerto Rico −2.3% por la traducción del peso fuerte.", en: "+9.5%: ASUR US Ps. 416.9 M and Colombia +13.2%; Mexico −12.8% to Ps. 1,393.1 M and Puerto Rico −2.3% on translation at a stronger peso." },
        revConstruction: { es: "+69.2%: más obra en México (Terminal 1 de Cancún); se compensa con el costo de construcción (IFRIC 12).", en: "+69.2%: more construction in Mexico (Cancún Terminal 1); offset by construction cost (IFRIC 12)." },
        totalOpCosts: { es: "+32.3% con construcción; +16.6% sin ella: México −0.2%, Puerto Rico +0.6%, Colombia +39.4% (nueva amortización), EE. UU. Ps. 307.7 M.", en: "+32.3% with construction; +16.6% without: Mexico −0.2%, Puerto Rico +0.6%, Colombia +39.4% (new amortisation), US Ps. 307.7 M." },
        costServices: { es: "+21.8% (Ps. 330.7 M): personal, seguridad y limpieza, honorarios, seguros, rentas a autoridades aeroportuarias de EE. UU. y reservas de cobranza; menos mantenimiento y electricidad.", en: "+21.8% (Ps. 330.7 M): personnel, security and cleaning, professional fees, insurance, lease expense to US airport authorities and doubtful-account provisions; lower maintenance and electricity." },
        costConstruction: { es: "+69.2%: México +74.8% (Ps. 851.7 M), Colombia Ps. 58.7 M; Puerto Rico −16.1%.", en: "+69.2%: Mexico +74.8% (Ps. 851.7 M), Colombia Ps. 58.7 M; Puerto Rico −16.1%." },
        ga: { es: "+35.5% (Ps. 32.3 M): mayores costos de personal.", en: "+35.5% (Ps. 32.3 M): higher personnel costs." },
        techAssistance: { es: "−8.9%: la cuota a ITA se calcula sobre el EBITDA de México, que cayó; desaparece tras la fusión con ITA (aprobada 20-ago-2026).", en: "−8.9%: the fee to ITA is based on Mexican EBITDA, which fell; it disappears after the ITA merger (approved 20-Aug-2026)." },
        concessionFees: { es: "−8.3%: México −13.0% y Puerto Rico −4.5% por menores ingresos; Colombia +3.3%.", en: "−8.3%: Mexico −13.0% and Puerto Rico −4.5% on lower revenue; Colombia +3.3%." },
        da: { es: "+33.3% (Ps. 203.6 M): Colombia +170.7% por el cambio de método de amortización de la concesión (3T25); México +6.6%, Puerto Rico +3.1%.", en: "+33.3% (Ps. 203.6 M): Colombia +170.7% after the change in the concession amortisation method (3Q25); Mexico +6.6%, Puerto Rico +3.1%." },
        opIncome: { es: "Ps. 3,890.1 M (margen 40.6% vs. 50.6%); margen operativo ajustado 52.5% vs. 59.4% por la amortización en Colombia.", en: "Ps. 3,890.1 M (margin 40.6% vs. 50.6%); adjusted operating margin 52.5% vs. 59.4% on the Colombian amortisation." },
        ebitda: { es: "−8.7% a Ps. 4,589.9 M: México −9.1% (3,501.1), Puerto Rico −16.9% (543.0), Colombia +1.0% (526.2), ASUR US 19.6; costos únicos de la transacción con Motiva.", en: "−8.7% to Ps. 4,589.9 M: Mexico −9.1% (3,501.1), Puerto Rico −16.9% (543.0), Colombia +1.0% (526.2), ASUR US 19.6; one-off Motiva transaction costs." },
        ebitdaMarginExIfric: { es: "62.0% vs. 67.6% (−560 pb): menos ingresos en México y Puerto Rico y consolidación del negocio de EE. UU. con margen ≈9%.", en: "62.0% vs. 67.6% (−560 bp): lower revenue in Mexico and Puerto Rico and consolidation of the US business at a ≈9% margin." },
        financialResult: { es: "Pérdida de Ps. 610.7 M vs. 1,102.9 M: pérdida cambiaria −78.2% a Ps. 251.9 M (peso +3.0% y menor posición neta en dólares); gasto por intereses +66.8% por los préstamos de Ps. 9,500 M y 6,390 M.", en: "Loss of Ps. 610.7 M vs. 1,102.9 M: FX loss −78.2% to Ps. 251.9 M (peso +3.0% and a smaller net dollar position); interest expense +66.8% on the Ps. 9,500 M and 6,390 M loans." },
        interestExpense: { es: "+66.8% (Ps. 219.9 M): préstamos BBVA (may-25) y JPMorgan (dic-25).", en: "+66.8% (Ps. 219.9 M): BBVA (May-25) and JPMorgan (Dec-25) loans." },
        fxResult: { es: "Pérdida de Ps. 251.9 M vs. 1,157.5 M: apreciación del peso de 3.0% al cierre (7.8% un año antes) sobre una posición en dólares menor.", en: "Loss of Ps. 251.9 M vs. 1,157.5 M: peso appreciation of 3.0% at the close (7.8% a year earlier) on a smaller dollar position." },
        incomeTax: { es: "−Ps. 146.1 M: impuesto causado −121.0 M (menor base gravable en Cancún y Colombia) y diferido −25.1 M (saldos no redimidos en Cancún; cambio de amortización en Colombia).", en: "−Ps. 146.1 M: current tax −121.0 M (lower taxable base at Cancún and Colombia) and deferred −25.1 M (unredeemed balances at Cancún; Colombian amortisation change)." },
        incomeTaxCurrent: { es: "−Ps. 121.0 M: menor base gravable en el aeropuerto de Cancún y en Colombia.", en: "−Ps. 121.0 M: lower taxable base at Cancún airport and in Colombia." },
        incomeTaxDeferred: { es: "−Ps. 25.1 M, sobre todo en México.", en: "−Ps. 25.1 M, mainly in Mexico." },
        netIncome: { es: "+5.0% a Ps. 2,384.6 M pese al menor EBITDA: menos pérdida cambiaria y menos impuestos.", en: "+5.0% to Ps. 2,384.6 M despite lower EBITDA: smaller FX loss and lower taxes." },
        netIncomeMajority: { es: "+7.1% a Ps. 2,296.4 M (UPA Ps. 7.6547; US$4.3818 por ADS): menor pérdida cambiaria, menos impuestos y la amortización del ajuste a valor razonable del crédito colombiano liquidado el 22-abr-2026.", en: "+7.1% to Ps. 2,296.4 M (EPS Ps. 7.6547; US$4.3818 per ADS): smaller FX loss, lower taxes and amortisation of the fair-value adjustment on the Colombian loan repaid 22-Apr-2026." },
        nci: { es: "40% de Aerostar (Puerto Rico), cuyo EBITDA cayó 16.9%.", en: "40% of Aerostar (Puerto Rico), whose EBITDA fell 16.9%." }
      }
    },
    "2026M6": {
      call: { date: "2026-07-23", es: "conferencia de resultados del 2T26 (23 jul 2026)", en: "2Q26 earnings call (23 Jul 2026)" },
      ops: {
        dom: { es: "+0.8% en el semestre: Colombia +8.0% compensa México −1.3% y Puerto Rico −3.2%.", en: "+0.8% in the half: Colombia +8.0% offsets Mexico −1.3% and Puerto Rico −3.2%." },
        intl: { es: "−2.1%: México −3.4% (Cancún −3.9%) con caídas crecientes desde marzo; Colombia +4.8%.", en: "−2.1%: Mexico −3.4% (Cancún −3.9%) with widening declines since March; Colombia +4.8%." },
        total: { es: "−0.3% a 36.2 M: junio −5.8% fue el peor mes; México −2.4%, Puerto Rico −2.8%, Colombia +7.3%.", en: "−0.3% to 36.2 M: June −5.8% was the weakest month; Mexico −2.4%, Puerto Rico −2.8%, Colombia +7.3%." },
        country_MX: { es: "−2.4%: Cancún −4.7%, otros ocho aeropuertos +3.9%.", en: "−2.4%: Cancún −4.7%, the other eight airports +3.9%." },
        country_PR: { es: "−2.8%: doméstico −3.2%, internacional −0.5%.", en: "−2.8%: domestic −3.2%, international −0.5%." },
        country_CO: { es: "+7.3%: doméstico +8.0%, internacional +4.8%.", en: "+7.3%: domestic +8.0%, international +4.8%." },
        commercialPerPax: { es: "Sube por ASUR US (consolidado desde diciembre de 2025); México cae por el peso fuerte.", en: "Up on ASUR US (consolidated since December 2025); Mexico down on the strong peso." },
        netDebt: { es: "Ps. 15,138 M al cierre de junio (0.9× EBITDA UDM); el crédito de Motiva (R$5.1 mil millones) se suma en septiembre.", en: "Ps. 15,138 M at end-June (0.9× LTM EBITDA); the Motiva loan (R$5.1 bn) is added in September." }
      },
      lines: {
        revTotal: { es: "Semestre: ingresos sin construcción +0.6% (Ps. 15,604.9 M) y construcción +41.2%.", en: "Half-year: revenue ex-construction +0.6% (Ps. 15,604.9 M) and construction +41.2%." },
        revAero: { es: "A la baja por el tráfico de Cancún desde marzo y el peso fuerte sobre los cargos en dólares.", en: "Down on Cancún traffic since March and the strong peso on dollar-linked charges." },
        revNonAero: { es: "Al alza por ASUR US (dos trimestres completos) y Colombia.", en: "Up on ASUR US (two full quarters) and Colombia." },
        totalOpCosts: { es: "+16.9% sin construcción: EE. UU. (dos trimestres), nueva amortización en Colombia, costos de personal.", en: "+16.9% ex-construction: US (two quarters), new Colombian amortisation, personnel costs." },
        da: { es: "Cambio del método de amortización de la concesión colombiana desde el 3T25.", en: "Change in the Colombian concession amortisation method since 3Q25." },
        ebitda: { es: "Menor EBITDA en México y Puerto Rico; ASUR US aún cerca de cero en EBITDA.", en: "Lower EBITDA in Mexico and Puerto Rico; ASUR US still near zero EBITDA." },
        financialResult: { es: "Más intereses por los préstamos de 2025; menores pérdidas cambiarias con el peso más estable.", en: "More interest on the 2025 loans; smaller FX losses with a steadier peso." },
        netIncome: { es: "−10.1% en el semestre (Ps. 5,311.0 M): el 1T26 no tuvo la ganancia cambiaria del 1T25.", en: "−10.1% in the half (Ps. 5,311.0 M): 1Q26 lacked 1Q25's FX gain." },
        netIncomeMajority: { es: "−9.7% a Ps. 5,109.6 M en el semestre.", en: "−9.7% to Ps. 5,109.6 M in the half." }
      }
    }
  }
};
