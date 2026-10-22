// Executive summary shown at the top of the GAP page. Narrative is curated from the data files and the
// releases; the change-alert routine rewrites the affected section when new results, traffic, guidance
// or events land. Never type a date or a market figure that the data files carry: write the tokens
// {{nextResults}} (next results date, release-lag rule), {{nextTraffic}} (next monthly traffic report),
// {{lastPx}}, {{lastPxDate}} (latest close and its date), {{divYield}} (the AGM dividend's yield on that close)
// and {{dps}}; the page and the deck fill them from the same model, so the summary never goes stale
// (it once said "~5.4% on the 29 Sep close" with the price at Ps. 362.60; owner, 15-Oct-2026). Section titles are in Title Case in both languages (the page enforces it too). Figures quoted are as of the `basis` periods (not live market data).
window.GAP_SUMMARY = {
  updatedAt: "2026-10-22",
  basis: { quarter: "2026Q3", resultsDate: "2026-10-19", trafficMonth: "2026-09", guidanceDate: "2026-07-14" },
  sections: [
    {
      k: "watch", title: { es: "Qué Observar en los Próximos Reportes", en: "What to Watch in the Next Releases" },
      es: [
        "**Tráfico de octubre** ({{nextTraffic}}): **si la caída de septiembre (−7.3%) fue capacidad o clima**; asientos nacionales en Tijuana y Puerto Vallarta, Los Cabos internacional tras el huracán Polo, Montego Bay para el invierno y CBX. A septiembre el tráfico va −4.2%, por debajo del rango guiado (−3% a 0%).",
        "**4T26** ({{nextResults}}): **cierre del año frente a la guía** (ingresos totales +7% a +10% y EBITDA +10% a +12%; a 9M26 +8.9% y +11.1%), el primer trimestre de invierno con CBX, la fecha de la primera exhibición del dividendo 2026 (Ps. 12,513 M por pagar al 30 de septiembre) y los valores razonables definitivos de la combinación CBX/AMP (aún preliminares en el 3T26).",
        "**FIBRA GAP: sin colocar según los comunicados de GAP y los eventos relevantes de la BMV** (revisados al 22 oct); la prensa reportó octubre de 2026 como fecha prevista (22 sep), tras posponerse en junio. También: fusión Viva–Volaris, combustible y tarifas aéreas, vencimiento del GAP 21-V (Ps. 1,500 M, 9 oct) con las líneas bancarias, guía 2027 en enero–febrero con el incremento de tarifa de enero, y el 20-F en abril."
      ],
      en: [
        "**October traffic** ({{nextTraffic}}): **whether September's drop (−7.3%) was capacity or weather**; domestic seats at Tijuana and Puerto Vallarta, Los Cabos international after Hurricane Polo, Montego Bay for the winter, and CBX. Year-to-date traffic is −4.2%, below the guided range (−3% to 0%).",
        "**4Q26** ({{nextResults}}): **the full year against guidance** (total revenue +7% to +10% and EBITDA +10% to +12%; +8.9% and +11.1% at 9M26), the first winter quarter with CBX, the date of the first 2026 dividend installment (Ps. 12,513 M payable at 30 September) and the final fair values of the CBX/AMP combination (still preliminary in 3Q26).",
        "**FIBRA GAP: not placed per GAP's filings and the BMV material events** (checked 22 Oct); the press reported an October 2026 target (22 Sep), after the June postponement. Also: the Viva–Volaris merger, fuel and airfares, the GAP 21-V maturity (Ps. 1,500 M, 9 Oct) out of the bank facilities, 2027 guidance in January–February with the January tariff increase, and the 20-F in April."
      ]
    },
    {
      k: "ops", title: { es: "Operación", en: "Operations" },
      es: [
        "3T26: **ingresos sin IFRIC 12 +13.2% (+3.4% sin CBX) y EBITDA +19.2%** a Ps. 6,064.6 M (margen sin IFRIC 12 67.8%, +3.5 pp) con un **tráfico −1.4%** (México +0.4%, Jamaica −15.8%). Lo explican las tarifas máximas 2025–29, los negocios operados por GAP (+13.7% sin CBX; carga y recinto fiscal +20.7%) y el primer trimestre completo de CBX: Ps. 775.5 M de ingresos (US$44.6 M), 1.03 M de usuarios a US$43.1, EBITDA Ps. 558.2 M (margen 72.0%). La cuota de asistencia técnica cayó 81% al internalizarse.",
        "**Utilidad neta Ps. 2,914.1 M (+8.1%)** y utilidad integral Ps. 3,265.1 M (+32.8%): el gasto por intereses subió 41.8% por la deuda del capex y del 25% de CBX, y el impuesto 37.7% (menor efecto inflacionario y menos pérdidas fiscales aplicadas). 9M26: ingresos +8.9%, EBITDA +11.1% (margen sin IFRIC 12 68.4%), utilidad neta +11.1%.",
        "**Tráfico enero–septiembre −4.2%** (nacional −1.3%, internacional −8.0%); en el 3T26 nacional +0.6% e internacional −4.5%: Guadalajara +8.0%, Tijuana −0.5% (usuarios de CBX +8.4%), Los Cabos −6.8%, Puerto Vallarta −11.0% (internacional −24.8%), Montego Bay −23.0%. **Septiembre −7.3%** por menos asientos (−7.2%) y el huracán Polo. **Carga +7.5%** en el trimestre (electrónica hacia Guadalajara); ingreso aero + no aero por pasajero Ps. 580 (+14.8%), no aeronáutico por pasajero Ps. 216 (+39%)."
      ],
      en: [
        "3Q26: **revenue ex-IFRIC 12 +13.2% (+3.4% ex-CBX) and EBITDA +19.2%** to Ps. 6,064.6 M (margin ex-IFRIC 12 67.8%, +3.5 pp) on **traffic −1.4%** (Mexico +0.4%, Jamaica −15.8%). Drivers: the 2025–29 maximum tariffs, GAP-operated businesses (+13.7% ex-CBX; cargo and bonded warehouse +20.7%) and the first full quarter of CBX: Ps. 775.5 M of revenue (US$44.6 M), 1.03 M users at US$43.1, EBITDA Ps. 558.2 M (72.0% margin). The technical-assistance fee fell 81% once internalized.",
        "**Net income Ps. 2,914.1 M (+8.1%)** and comprehensive income Ps. 3,265.1 M (+32.8%): interest expense rose 41.8% on the debt for capex and the 25% of CBX, and income tax 37.7% (a smaller inflation effect and fewer tax-loss carryforwards). 9M26: revenue +8.9%, EBITDA +11.1% (margin ex-IFRIC 12 68.4%), net income +11.1%.",
        "**Traffic January–September −4.2%** (domestic −1.3%, international −8.0%); in 3Q26 domestic +0.6% and international −4.5%: Guadalajara +8.0%, Tijuana −0.5% (CBX users +8.4%), Los Cabos −6.8%, Puerto Vallarta −11.0% (international −24.8%), Montego Bay −23.0%. **September −7.3%** on fewer seats (−7.2%) and Hurricane Polo. **Cargo +7.5%** in the quarter (electronics into Guadalajara); aero + non-aero revenue per passenger Ps. 580 (+14.8%), non-aero per passenger Ps. 216 (+39%)."
      ]
    },
    {
      k: "guidance", title: { es: "Guía 2026 y Por Qué Cambió", en: "2026 Guidance and Why It Changed" },
      es: [
        "**Revisada el 14 de julio: tráfico −3% a 0%** (antes +2% a +5%), ingresos aeronáuticos +1% a +4% (antes +9% a +12%), no aeronáuticos +21% a +24% (antes +6% a +9%), ingresos totales +7% a +10% (antes +8% a +11%), **EBITDA +10% a +12%** (antes +8% a +11%), margen EBITDA 67% ±1 (antes 65% ±1), capex Ps. 12.0 mil M (antes 13.5). El informe del 3T26 (19 oct) no trae tabla de guía: los rangos de julio siguen vigentes.",
        "Por qué: **la guía de febrero excluía CBX**; la revisión incorpora su consolidación desde mayo y la internalización de la asistencia técnica (más EBITDA y margen) y recorta tráfico e ingresos aeronáuticos por Melissa en Jamaica, la seguridad en Puerto Vallarta, el combustible y las tarifas aéreas, y un peso 10.9% más fuerte.",
        "Seguimiento al 9M26: tráfico −4.2% (por debajo del rango), aeronáuticos +1.1%, no aeronáuticos +22.4%, ingresos totales +8.9%, **EBITDA +11.1%, margen sin IFRIC 12 68.4%** (todos dentro de los rangos); capex Ps. 8.6 mil M, 72% de lo guiado. Historial: FY2025 quedó por debajo de la guía en tráfico (+2.5% vs 4–6%), aeronáuticos y EBITDA; FY2024 y FY2022 la superaron en todo."
      ],
      en: [
        "**Revised on 14 July: traffic −3% to 0%** (was +2% to +5%), aeronautical revenue +1% to +4% (was +9% to +12%), non-aeronautical +21% to +24% (was +6% to +9%), total revenue +7% to +10% (was +8% to +11%), **EBITDA +10% to +12%** (was +8% to +11%), EBITDA margin 67% ±1 (was 65% ±1), capex Ps. 12.0 bn (was 13.5). The 3Q26 report (19 Oct) carries no guidance table: the July ranges stand.",
        "Why: **the February guidance excluded CBX**; the revision adds its consolidation from May and the internalized technical assistance (more EBITDA and margin) and cuts traffic and aeronautical revenue for Melissa in Jamaica, security in Puerto Vallarta, fuel and airfares, and a 10.9% stronger peso.",
        "Tracking at 9M26: traffic −4.2% (below the range), aero +1.1%, non-aero +22.4%, total revenue +8.9%, **EBITDA +11.1%, margin ex-IFRIC 12 68.4%** (all inside the ranges); capex Ps. 8.6 bn, 72% of the guided amount. Track record: FY2025 missed on traffic (+2.5% vs 4–6%), aero and EBITDA; FY2024 and FY2022 beat on every metric."
      ]
    },
    {
      k: "debt", title: { es: "Deuda y Razones", en: "Debt and Ratios" },
      es: [
        "Al 30 de septiembre de 2026: deuda bruta Ps. 67.7 mil M (préstamos bancarios e intereses Ps. 25.0 mil M, certificados Ps. 42.8 mil M), efectivo Ps. 23.9 mil M, **deuda neta Ps. 43.8 mil M = 1.9x el EBITDA UDM** (Ps. 23.1 mil M); deuda bruta 2.9x. En el trimestre se dispusieron Ps. 6,000 M de las líneas bancarias de septiembre y se pagó el GAP 22L (Ps. 2,757.6 M, 21 sep); el GAP 21-V (Ps. 1,500 M) venció el 9 de octubre.",
        "El apalancamiento subió en el año con los **Ps. 10.7 mil M de certificados bursátiles de marzo** (GAP 26 a TIIE + 45 pb y GAP 26-2 a 9.87% fija a 2036) para pagar US$487.5 M por el 25% de CBX y el capex del PMD, más el crédito de Ps. 1.3 mil M asumido de CBX; en septiembre se contrataron líneas bancarias por Ps. 8.0 mil M. Calificación Aaa.mx / mxAAA, perspectiva estable. El gasto por intereses del 3T26 subió 41.8%.",
        "**Dividendo 2026 aprobado: {{dps}} por acción** ({{divYield}} sobre el cierre del {{lastPxDate}}, {{lastPx}}), pagadero en una o más exhibiciones hasta el 22 abr 2027 a las acciones en circulación en cada fecha de pago; declarado íntegro en el 2T26 (Ps. 12,513 M por pagar al 30 de septiembre) y **sin exhibiciones pagadas** aún. Capex guiado de Ps. 12.0 mil M, 72% ejercido a septiembre (Ps. 3.7 mil M en el trimestre)."
      ],
      en: [
        "At 30 September 2026: gross debt Ps. 67.7 bn (bank loans and interest Ps. 25.0 bn, certificados Ps. 42.8 bn), cash Ps. 23.9 bn, **net debt Ps. 43.8 bn = 1.9x LTM EBITDA** (Ps. 23.1 bn); gross debt 2.9x. In the quarter Ps. 6,000 M of the September bank facilities were drawn and GAP 22L was repaid (Ps. 2,757.6 M, 21 Sep); GAP 21-V (Ps. 1,500 M) matured on 9 October.",
        "Leverage rose in the year with the **Ps. 10.7 bn of certificados bursátiles issued in March** (GAP 26 at TIIE + 45 bp and GAP 26-2 at 9.87% fixed to 2036) to pay US$487.5 M for the remaining 25% of CBX and MDP capex, plus the Ps. 1.3 bn loan assumed from CBX; Ps. 8.0 bn of bank facilities were signed in September. Rated Aaa.mx / mxAAA, stable outlook. 3Q26 interest expense rose 41.8%.",
        "**2026 dividend approved: {{dps}} per share** ({{divYield}} on the {{lastPxDate}} close of {{lastPx}}), payable in one or more installments until 22 Apr 2027 to the shares outstanding on each payment date; declared in full in 2Q26 (Ps. 12,513 M payable at 30 September) and **no installment paid** yet. Guided capex Ps. 12.0 bn, 72% spent by September (Ps. 3.7 bn in the quarter)."
      ]
    }
  ]
};
