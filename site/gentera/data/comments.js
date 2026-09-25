// Hand-written, bilingual one-line explanations of year-over-year changes for the Gentera model, keyed by
// period: a quarter (`2026Q2`), a year-to-date period (`2026M6`) or a fiscal year (`FY2025`). `lines` are income
// statement rows (keys = layout keys in financials.js), `bs` balance-sheet rows, `ops` operating-metric rows,
// written from the management discussion in the corresponding press releases. `call` is the earnings-call block
// of the quarter that closes the period: `es`/`en` note, `date`, `file` (converted transcript under
// tools/gentera/raw/text/transcripts) and `quotes` keyed by the same row keys ({who, en, es}; en = transcript
// wording, es = our translation). Gentera publishes no transcripts: the calls are hand-supplied FactSet CallStreet
// files converted by scripts/gentera/ingest-transcripts.py. The page shows `lines` only when period A is compared
// with the same period a year earlier (mechanical driver comments otherwise) and the quotes whenever the period
// has a call block. Add a block for each new quarter by reviewed commit (see tools/gentera/README.md).
window.G_COMMENTS = (function () {
const CALLS = {
 "2023Q3": {
  "date": "2023-10-25",
  "quarter": "2023Q3",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2023Q3-transcript-Gentera_3T23_earnings_call_transcript_2023-10-25.txt",
  "note": "FactSet CallStreet raw transcript",
  "es": "Conferencia de resultados 3T23 (25 de octubre de 2023; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "3Q23 earnings call (25 October 2023; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Enrique Majós (CEO)",
    "en": "Gentera's total loan portfolio reached a new historic figure, closing at Ps. 60.5 billion, which represents more than 17% growth in the last 12 months. And by the way, this portfolio growth is above the 14% to 16% that we had in the previous guidance.",
    "es": "La cartera total de Gentera alcanzó una nueva cifra histórica: cerró en Ps. 60.5 mil millones, un crecimiento de más de 17% en los últimos 12 meses. Y este crecimiento está por encima del 14% a 16% que teníamos en la guía anterior."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "In Mexico, we increased our market share from 47% to 63% with our group lending products and for the individual loans, we also increased our share from 11% to 20%. [..] Acapulco represents less than 1.5% of the portfolio of Banco Compartamos and around 1% of Gentera's portfolio.",
    "es": "En México aumentamos nuestra participación de mercado de 47% a 63% en crédito grupal y de 11% a 20% en crédito individual. [..] Acapulco representa menos de 1.5% de la cartera de Banco Compartamos y alrededor de 1% de la cartera de Gentera."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Interest income for the 2023 nine-month period stood at Ps. 23.6 billion, growing 14.7% compared to the same period in 2022. And while we have had an important increase in financing and origination expenses, net interest income grew 7.7% for the same period.",
    "es": "Los ingresos por intereses de los nueve meses de 2023 fueron Ps. 23.6 mil millones, 14.7% más que en el mismo periodo de 2022. Y aunque tuvimos un aumento importante en gastos de financiamiento y de originación, el margen financiero creció 7.7% en el mismo periodo."
   },
   "finMargin": {
    "who": "Mario Langarica (CFO)",
    "en": "NIM amounted to 39.6% for 3Q 2023, compared to 41.3% in 3Q 2022. Our expectation for the following quarters is to be moving around 40%.",
    "es": "La MIN fue 39.6% en el 3T23, contra 41.3% en el 3T22. Nuestra expectativa para los siguientes trimestres es movernos alrededor de 40%."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "As of September 2023, cumulative cost of risk amounted to 10.3%, and NPL stood at 3.29%, which are both better than our initial guidance and expectations. [..] Coverage ratio amounted to 230%. [..] We expect to maintain sound asset quality, maintaining robust coverage ratios above 200%.",
    "es": "A septiembre de 2023 el costo de riesgo acumulado fue 10.3% y la cartera vencida 3.29%, ambos mejores que nuestra guía inicial. [..] La cobertura fue 230%. [..] Esperamos mantener una calidad de activos sana, con coberturas robustas por encima de 200%."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Regarding net fees for the nine-month period, we have generated a 59.7% growth compared to the same period in 2022. [..] We expect that this item will grow about 40% for the full year. [..] For next year, [growth] should be probably around 20% following the growth of clients and portfolio.",
    "es": "En comisiones netas de los nueve meses generamos un crecimiento de 59.7% contra el mismo periodo de 2022. [..] Esperamos que este rubro crezca alrededor de 40% en el año completo. [..] Para el próximo año probablemente alrededor de 20%, siguiendo el crecimiento de clientes y cartera."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Accumulated operational expenses as of 3Q 2023 amounted to Ps. 12.5 billion, representing a 13% growth. [..] An important component of this growth relates to the actions that we have implemented to capture the strong market opportunity, including hiring more than 3,800 employees, most of them in our sales force. [..] We expect to end the year with around a 15% increase in expenses.",
    "es": "Los gastos de operación acumulados al 3T23 fueron Ps. 12.5 mil millones, un crecimiento de 13%. [..] Un componente importante son las acciones para capturar la fuerte oportunidad de mercado, incluida la contratación de más de 3,800 colaboradores, la mayoría en la fuerza de ventas. [..] Esperamos cerrar el año con un aumento de gastos de alrededor de 15%."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income in 3Q 2023 amounted to Ps. 1.35 billion, representing our second best quarterly historic result. [..] As mentioned in our press release, we are revising the year-end guidance to a range between Ps. 3.04 and Ps. 3.14 EPS. This reduction is explained by the investments and credit placement expenses that we incurred to capture the market opportunity.",
    "es": "La utilidad neta del 3T23 fue Ps. 1.35 mil millones, nuestro segundo mejor resultado trimestral histórico. [..] Como dijimos en el informe, revisamos la guía de cierre de año a un rango de UPA entre Ps. 3.04 y Ps. 3.14. La reducción se explica por las inversiones y gastos de colocación en que incurrimos para capturar la oportunidad de mercado."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "Due to the successful results on our client and portfolio growth strategy, we are increasing our portfolio guidance for the present year. At the same time, EPS guidance will be reduced due to the investments we've made to capture an even higher future growth.",
    "es": "Por los buenos resultados de la estrategia de crecimiento en clientes y cartera, subimos la guía de cartera para este año. Al mismo tiempo, la guía de UPA se reduce por las inversiones que hicimos para capturar un crecimiento futuro aún mayor."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for the nine-month period [..] is on track to meet the expected 20% objective for the year. Banco Compartamos [..] an ROE of 25.7% and an ROA of 8.1%. Compartamos Financiera in Peru presented an ROE of 17.5%, and ConCrédito's ROE improved to 21.8% from 16.7% last year.",
    "es": "El ROE controlador de Gentera de los nueve meses [..] va en línea con el objetivo de 20% para el año. Banco Compartamos [..] ROE de 25.7% y ROA de 8.1%. Compartamos Financiera en Perú presentó un ROE de 17.5%, y el de ConCrédito mejoró a 21.8% desde 16.7% el año pasado."
   },
   "niPE": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "Peru's portfolio got affected in the first quarter of this 2023 because of social movements at the beginning of the year as well as the impact of El Niño. [..] We've been dealing with higher delinquencies throughout the year, but we are seeing better trends since July.",
    "es": "La cartera de Perú se vio afectada en el primer trimestre de 2023 por los movimientos sociales de inicio de año y por El Niño. [..] Hemos lidiado con mayor morosidad todo el año, pero vemos mejores tendencias desde julio."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "At this point, 100 basis points, given our variable rate structure, could represent a positive Ps. 420 million improvement in the financial margin line.",
    "es": "En este momento, 100 puntos base, dada nuestra estructura a tasa variable, podrían representar una mejora de Ps. 420 millones en el margen financiero."
   },
   "clientsCred": {
    "who": "Enrique Majós (CEO)",
    "en": "In terms of number of clients, we have reached an annual growth of 412,000 clients. From them, 222,000 come from Banco Compartamos. This is a historic growth never seen before in Gentera.",
    "es": "En número de clientes alcanzamos un crecimiento anual de 412,000 clientes; 222,000 de ellos de Banco Compartamos. Es un crecimiento histórico, nunca visto en Gentera."
   }
  }
 },
 "2023Q4": {
  "date": "2024-02-22",
  "quarter": "2023Q4",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2023Q4-transcript-Gentera_4T23_earnings_call_transcript_2024-02-22.txt",
  "note": "FactSet CallStreet corrected transcript",
  "es": "Conferencia de resultados 4T23 (22 de febrero de 2024; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "4Q23 earnings call (22 February 2024; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Enrique Majós (CEO)",
    "en": "At the end of 2023, Gentera reached Ps. 65 billion, which represents a 21% growth on a yearly basis and a record number. [..] We expect to grow between 18% and 20% in portfolio [in 2024].",
    "es": "Al cierre de 2023 Gentera alcanzó Ps. 65 mil millones de cartera, un crecimiento anual de 21% y una cifra récord. [..] Esperamos crecer entre 18% y 20% en cartera [en 2024]."
   },
   "loansMX": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "Banco Compartamos we expect to grow around 17% portfolio, Compartamos Financiera should grow around 20%, and ConCrédito also around 17%, more or less. [..] The market opportunity remains since competitors both in Mexico and Peru remain relatively weak.",
    "es": "Esperamos que Banco Compartamos crezca alrededor de 17% en cartera, Compartamos Financiera alrededor de 20% y ConCrédito también alrededor de 17%. [..] La oportunidad de mercado sigue porque los competidores en México y Perú siguen relativamente débiles."
   },
   "finMargin": {
    "who": "Mario Langarica (CFO)",
    "en": "NIM for full year 2023 amounted to 39.7%, which was in line with the forecast for the year. And our expectation for 2024 is to keep moving around 40%. [..] For 2024, we expect that [net interest income] will grow very similar to the expected growth of our portfolio, around 19%.",
    "es": "La MIN de 2023 fue 39.7%, en línea con el pronóstico. Para 2024 esperamos seguir alrededor de 40%. [..] Esperamos que [el margen financiero] crezca de forma muy similar a la cartera, alrededor de 19%."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "Our projections for Mexico include a base rate of around 9.75%. If rates reduce faster or more than these, it should benefit us. [..] In Peru, what we're putting in our projection is something around 4.5%.",
    "es": "Nuestras proyecciones para México incluyen una tasa de referencia de alrededor de 9.75%. Si las tasas bajan más rápido o más que eso, nos beneficiaría. [..] Para Perú proyectamos alrededor de 4.5%."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Cost of risk amounted to 11.1%, within our expected range, and NPLs at the end of 4Q 2023 stood at 3.44%. [..] In the fourth quarter, we booked in Banco Compartamos Ps. 194 million in non-recurring provisions related to Hurricane Otis. [..] For 2024, we expect to maintain sound asset quality with a cost of risk between 11% and 11.5%, always maintaining robust coverage ratios above 200%.",
    "es": "El costo de riesgo fue 11.1%, dentro del rango esperado, y la cartera vencida cerró el 4T23 en 3.44%. [..] En el cuarto trimestre registramos en Banco Compartamos Ps. 194 millones de provisiones no recurrentes por el huracán Otis. [..] Para 2024 esperamos un costo de riesgo entre 11% y 11.5%, siempre con coberturas por encima de 200%."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 2.88 billion, representing a 54.3% growth compared to 2022. [..] Part of these fees are non-recurring. Therefore, we should expect that for 2024, net fees should grow very close to the growth rates expected for the loan portfolio.",
    "es": "Las comisiones netas fueron Ps. 2.88 mil millones, un crecimiento de 54.3% contra 2022. [..] Parte de estas comisiones no es recurrente. Por eso, para 2024 esperamos que las comisiones netas crezcan muy cerca del crecimiento esperado de la cartera."
   },
   "otherInc": {
    "who": "Enrique Majós (CEO)",
    "en": "In 2022, income from insurance products represented for Gentera 6.7% of its total income. In 2023, this number increased to 8.8%. [..] During 2023, Aterna placed 50 million policies, 16% growth compared with the previous year.",
    "es": "En 2022 los ingresos por seguros representaron 6.7% de los ingresos totales de Gentera. En 2023 subieron a 8.8%. [..] Durante 2023 Aterna colocó 50 millones de pólizas, 16% más que el año anterior."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Accumulated operational expenses for 2023 amounted to Ps. 17 billion. [..] A very important component of the expense growth follows the actions that we took to capture the market opportunity, such as hiring employees and upgrading our infrastructure. [..] Since almost 75% of our expenses are related to sales, we expect that during 2024 we will still have double-digit growth in expenses, moving around 17%. But we expect that total revenues will grow above expenses, implying positive jaws.",
    "es": "Los gastos de operación acumulados de 2023 fueron Ps. 17 mil millones. [..] Un componente muy importante del crecimiento son las acciones para capturar la oportunidad de mercado: contratación y mejora de infraestructura. [..] Como casi 75% de nuestros gastos están ligados a ventas, en 2024 todavía tendremos crecimiento de doble dígito en gastos, alrededor de 17%. Pero los ingresos totales crecerán por encima de los gastos."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income for the year amounted to Ps. 5.05 billion, a historic record. Gentera's controlling participation amounted to Ps. 4.72 billion, representing an EPS of Ps. 2.99. While we recognize that this result is slightly below the low end of the range guided last quarter, this happened mostly by the impact of Hurricane Otis. If we hadn't had this impact, [..] EPS [would have been] Ps. 3.07.",
    "es": "La utilidad neta del año fue Ps. 5.05 mil millones, récord histórico. La participación controladora fue Ps. 4.72 mil millones, una UPA de Ps. 2.99. Reconocemos que está ligeramente por debajo del piso del rango guiado el trimestre pasado, sobre todo por el impacto del huracán Otis. Sin ese impacto [..] la UPA habría sido Ps. 3.07."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "We expect to grow between 18% and 20% in portfolio and our EPS will be between Ps. 3.5 and Ps. 3.6, which means between 17% and 20% growth compared with last year. We are also expecting to distribute dividends based on our 40% dividend policy. [..] Our ROE will move above 20%.",
    "es": "Esperamos crecer entre 18% y 20% en cartera y una UPA entre Ps. 3.50 y Ps. 3.60, es decir, entre 17% y 20% de crecimiento contra el año pasado. También esperamos distribuir dividendos con nuestra política de 40%. [..] El ROE se moverá por encima de 20%."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for the year reached 19.3%, where Banco Compartamos posted a return on equity of about 24.8%, Compartamos Financiera improved its ROE from 12.2% to 17.7% and ConCrédito improved from 19.1% to 24.4%. For 2024, we expect controlling ROE moving around 20.5%.",
    "es": "El ROE controlador de Gentera fue 19.3%; Banco Compartamos tuvo un ROE de 24.8%, Compartamos Financiera mejoró de 12.2% a 17.7% y ConCrédito de 19.1% a 24.4%. Para 2024 esperamos un ROE controlador alrededor de 20.5%."
   },
   "niCC": {
    "who": "Mario Langarica (CFO)",
    "en": "For 2023, the results of ConCrédito were above the projections. Therefore, there is no need for impairment [of goodwill]. [..] If that happens, which we don't foresee, the amount should be something similar to what we incurred in 2022, around Ps. 350 million.",
    "es": "En 2023 los resultados de ConCrédito estuvieron por encima de las proyecciones, así que no hay necesidad de deterioro [del crédito mercantil]. [..] Si ocurriera, y no lo prevemos, el monto sería similar al de 2022, alrededor de Ps. 350 millones."
   },
   "niPE": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "In 2023, we started the year with some climate events that hit hard certain regions of the Peruvian market. So asset quality went up at the beginning of the year and we handled this situation throughout 2023 with good results by year end. [..] We expect to maintain a stable asset quality for 2024.",
    "es": "En 2023 empezamos el año con eventos climáticos que golpearon con fuerza algunas regiones de Perú. La morosidad subió a inicios de año y la manejamos durante 2023 con buenos resultados al cierre. [..] Esperamos una calidad de activos estable en 2024."
   },
   "clientsCred": {
    "who": "Enrique Majós (CEO)",
    "en": "Gentera reached more than 5 million people through our different financial products and services. This means that just in one year, we grew more than half a million net clients. [..] Last October, Peru reached our first 1 million clients [..] and in Banco Compartamos we reached our first 3 million customers [in January 2024].",
    "es": "Gentera alcanzó más de 5 millones de personas con sus productos y servicios. Eso significa que en un solo año crecimos más de medio millón de clientes netos. [..] En octubre Perú llegó al primer millón de clientes [..] y Banco Compartamos a sus primeros 3 millones [en enero de 2024]."
   },
   "eqAssets": {
    "who": "Mario Langarica (CFO)",
    "en": "We are now monitoring very closely tangible equity. Tangible equity for the year ended at around 22.1%. We have an internal limit on that. [..] We plan to keep at this point this 40% dividend payout.",
    "es": "Ahora monitoreamos muy de cerca el capital tangible, que cerró el año en alrededor de 22.1%. Tenemos un límite interno. [..] Por ahora planeamos mantener el pago de dividendos de 40%."
   }
  }
 },
 "2024Q1": {
  "date": "2024-04-24",
  "quarter": "2024Q1",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2024Q1-transcript-Gentera_1T24_earnings_call_transcript_2024-04-24.txt",
  "note": "FactSet CallStreet raw transcript",
  "es": "Conferencia de resultados 1T24 (24 de abril de 2024; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "1Q24 earnings call (24 April 2024; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Enrique Majós (CEO)",
    "en": "Gentera's portfolio grew over 20% in a yearly basis, reaching Ps. 65.5 billion, once again a historic figure, in line with our guidance. [..] We have now accumulated 11 quarters of continuous portfolio growth.",
    "es": "La cartera de Gentera creció más de 20% anual, a Ps. 65.5 mil millones, otra vez una cifra histórica y en línea con la guía. [..] Llevamos 11 trimestres consecutivos de crecimiento de cartera."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "Banco Compartamos portfolio growth was outstanding with a 29% growth in a yearly basis. [..] Productivity levels of our loan officers are in the highest levels ever, even considering that last year we increased our sales force by more than 1,500 new loan officers.",
    "es": "El crecimiento de cartera de Banco Compartamos fue sobresaliente: 29% anual. [..] La productividad de nuestros oficiales de crédito está en su nivel más alto, aun cuando el año pasado sumamos más de 1,500 nuevos oficiales."
   },
   "loansPE": {
    "who": "Enrique Majós (CEO)",
    "en": "In Peru, compared with the first quarter 2023, we grew 25% in clients and 13% in portfolio if we take local currency. NPLs stood at 4.6%. And we are confident that we will be able to improve the portfolio quality in the following months.",
    "es": "En Perú, contra el 1T23, crecimos 25% en clientes y 13% en cartera en moneda local. La cartera vencida quedó en 4.6% y confiamos en mejorar la calidad en los próximos meses."
   },
   "loansCC": {
    "who": "Enrique Majós (CEO)",
    "en": "In ConCrédito, since the second half of last year, we maintain a solid, healthy and sustainable growth. Portfolio annual growth was over 20%, and NPL is now in historic low levels, reaching 1.6%, compared with 2.26% last quarter.",
    "es": "En ConCrédito, desde el segundo semestre del año pasado mantenemos un crecimiento sólido y sano. La cartera creció más de 20% anual y la cartera vencida está en mínimos históricos: 1.6% contra 2.26% el trimestre anterior."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Interest income grew 24.9% versus 1Q 2023, reaching Ps. 9.3 billion. Net interest income grew 19.4% to Ps. 7.5 billion. Consequently NIM amounted to 39.4% this quarter, in line with our expectations for the year.",
    "es": "Los ingresos por intereses crecieron 24.9% contra el 1T23, a Ps. 9.3 mil millones. El margen financiero creció 19.4% a Ps. 7.5 mil millones. La MIN fue 39.4% en el trimestre, en línea con lo esperado para el año."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "The levels of interest rate that we're expecting for the rest of the year are, for Mexico, around 10%. We are seeing a little slowdown in the velocity of the reduction of rates from the central bank, but that doesn't affect at all our expectations for the end of the year. [..] Interest expenses represent only 13.6% of interest income.",
    "es": "El nivel de tasa que esperamos para el resto del año en México es alrededor de 10%. Vemos una menor velocidad en los recortes del banco central, pero eso no afecta nuestras expectativas de cierre de año. [..] Los gastos por intereses son sólo 13.6% de los ingresos por intereses."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Provisions for loan losses for 1Q 2024 amounted to Ps. 1.75 billion, 23.1% higher than last year's quarter, mostly explained by our portfolio growth. Compared to 4Q 2023, we observed a 16.5% contraction, mainly driven by a lower than expected impact related to Hurricane Otis. [..] We decided to write off in advance Ps. 36 million, while still maintaining Ps. 24 million in additional reserves.",
    "es": "Las provisiones del 1T24 fueron Ps. 1.75 mil millones, 23.1% más que hace un año, sobre todo por el crecimiento de la cartera. Contra el 4T23 bajaron 16.5% por un impacto menor al esperado del huracán Otis. [..] Decidimos castigar por adelantado Ps. 36 millones y mantenemos Ps. 24 millones de reservas adicionales."
   },
   "cor": {
    "who": "Enrique Majós (CEO)",
    "en": "NPLs stand at 3.5%, and cost of risk closed at 10.7%, which is below the 11% to 11.5% we guided for the present year.",
    "es": "La cartera vencida está en 3.5% y el costo de riesgo cerró en 10.7%, por debajo del 11% a 11.5% que guiamos para este año."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees grew 25% compared to 1Q 2023 to Ps. 878 million, mostly related to our insurance business. The incremental use of Yastás and Banco Compartamos branches also benefited Gentera, depending less on third-party channels and reducing fee expenses in relative terms.",
    "es": "Las comisiones netas crecieron 25% contra el 1T23, a Ps. 878 millones, sobre todo por el negocio de seguros. El mayor uso de Yastás y de las sucursales de Banco Compartamos también nos ayudó a depender menos de canales de terceros y reducir las comisiones pagadas en términos relativos."
   },
   "otherInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Last year in the first quarter, we had a non-recurring extra insurance income. Now, mainly because of the quarterly cut, we got a negative effect on that line. [..] For that line, you should expect an average level of around Ps. 200 million for the year.",
    "es": "El año pasado en el primer trimestre tuvimos un ingreso extraordinario de seguros. Ahora, por el corte trimestral, hay un efecto negativo en esa línea. [..] Para esa línea deben esperar un nivel promedio de alrededor de Ps. 200 millones en el año."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 1Q 2024 amounted to Ps. 4.5 billion, representing a 13.3% growth compared to 1Q 2023. Most of this growth comes from our larger sales force and upgraded infrastructure.",
    "es": "Los gastos de operación del 1T24 fueron Ps. 4.5 mil millones, 13.3% más que en el 1T23. La mayor parte viene de la mayor fuerza de ventas y la infraestructura mejorada."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income for 1Q 2024 amounted to Ps. 1.508 billion, representing the second largest quarter result in our history. Gentera's controlling participation amounted to Ps. 1.412 billion, representing an EPS of Ps. 0.89, a 10.3% increase compared to 1Q 2023.",
    "es": "La utilidad neta del 1T24 fue Ps. 1,508 millones, el segundo mejor trimestre de nuestra historia. La participación controladora fue Ps. 1,412 millones, una UPA de Ps. 0.89, 10.3% más que en el 1T23."
   },
   "eps": {
    "who": "Mario Langarica (CFO)",
    "en": "The growth of the portfolio and the good behavior of margins and risk show very positive trends. [..] One thing that will be slower is the reduction on interest rates, and the other would be additional increases in expenses related to our strategic initiatives. At this point we think that we are closer to the high end of the guidance, but still within the guidance.",
    "es": "El crecimiento de la cartera y el buen comportamiento de márgenes y riesgo muestran tendencias muy positivas. [..] Lo que será más lento es la baja de tasas, y habrá gastos adicionales por las iniciativas estratégicas. Por ahora creemos que estamos más cerca del techo de la guía, pero dentro de ella."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE reached 21.4%. And our largest subsidiary, Banco Compartamos, posted a return on equity of 34.1%. With this solid start of the year, we reinforce our view that for 2024, Gentera's controlling ROE should be around 20.5%.",
    "es": "El ROE controlador de Gentera fue 21.4%, y Banco Compartamos, nuestra mayor subsidiaria, tuvo un ROE de 34.1%. Con este sólido inicio de año reforzamos la visión de un ROE controlador de alrededor de 20.5% en 2024."
   },
   "niPE": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "NPLs for the Peruvian operation are still picking up even though we have taken bold actions this April that we expect to normalize the asset quality by the third quarter of this year. So we have exceeded provisioning and this is why the ROE for this operation has decreased this quarter.",
    "es": "La cartera vencida de Perú sigue subiendo, aunque tomamos acciones decididas en abril y esperamos normalizar la calidad para el tercer trimestre. Provisionamos de más, y por eso el ROE de esa operación bajó este trimestre."
   },
   "niCC": {
    "who": "Enrique Majós (CEO)",
    "en": "This improvement in our NPLs has to do with three things: the use of better data and risk assessment tools; the growth that we had last year is now maturing, the empresarias go through a learning curve; and the experience and discipline of our team to manage the traditional cycle of growing and controlling.",
    "es": "La mejora en cartera vencida tiene que ver con tres cosas: mejores datos y herramientas de evaluación de riesgo; el crecimiento del año pasado está madurando, las empresarias pasan por una curva de aprendizaje; y la experiencia y disciplina del equipo para manejar el ciclo de crecer y controlar."
   },
   "deposits": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "Most of our customers now receive their loans in debit cards [..] and they are starting to make deposits into these accounts. [Deposits] represent less than 2% of our funding, so today it's not something that really benefits the cost of funds line.",
    "es": "La mayoría de nuestros clientes ahora reciben su crédito en tarjetas de débito [..] y empiezan a depositar en esas cuentas. [La captación] es menos de 2% de nuestro fondeo, así que hoy no beneficia realmente el costo de fondos."
   }
  }
 },
 "2024Q2": {
  "date": "2024-07-24",
  "quarter": "2024Q2",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2024Q2-transcript-Gentera_2T24_earnings_call_transcript_2024-07-24.txt",
  "note": "FactSet CallStreet corrected transcript",
  "es": "Conferencia de resultados 2T24 (24 de julio de 2024; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "2Q24 earnings call (24 July 2024; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Enrique Majós (CEO)",
    "en": "Gentera's total portfolio grew 19.3%, which is right on target if we compare it with our guidance of 18% to 20%. We closed this quarter reaching a historic portfolio of Ps. 68.8 billion. [..] We are reporting that we're lagging behind in our growth estimates for Financiera Compartamos in Peru.",
    "es": "La cartera total de Gentera creció 19.3%, justo en el objetivo de nuestra guía de 18% a 20%. Cerramos el trimestre con una cartera histórica de Ps. 68.8 mil millones. [..] Vamos rezagados en las estimaciones de crecimiento de Financiera Compartamos en Perú."
   },
   "loansMX": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "Today we are serving like 240,000 customers [in individual lending]. [..] We are today the number one player in individual lending. [..] In the group lending methodologies, we've been gaining share from weaker competitors: in the last 12 months we moved our market share from 58% to 68%.",
    "es": "Hoy atendemos unos 240,000 clientes [en crédito individual]. [..] Somos el jugador número uno en crédito individual. [..] En crédito grupal hemos ganado participación a competidores más débiles: en 12 meses pasamos de 58% a 68% de participación."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Interest income grew 24% versus 2Q 2023, reaching Ps. 9.6 billion. Net interest income grew 19.4% to Ps. 7.8 billion. Consequently, NIM amounted to 39.6% this quarter and in the semester, in line with our expectations for the year.",
    "es": "Los ingresos por intereses crecieron 24% contra el 2T23, a Ps. 9.6 mil millones. El margen financiero creció 19.4% a Ps. 7.8 mil millones. La MIN fue 39.6% en el trimestre y en el semestre, en línea con lo esperado."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "We have a very healthy funding cost in Mexico, around 10%, and in Peru, around 6.8%. [..] Relying only on paying high rates on deposits may be risky. That's why it's important to have many funding sources available.",
    "es": "Tenemos un costo de fondeo muy sano: alrededor de 10% en México y 6.8% en Perú. [..] Depender sólo de pagar tasas altas en depósitos puede ser riesgoso; por eso es importante tener muchas fuentes de fondeo."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Cost of risk amounted to 12.1% [1H] and for 2Q to 13.6%, which is higher than our expected level for the year. This is mostly explained by the higher-than-expected risk in our loan portfolio in Peru, a larger individual lending growth that requires higher provisions in the mix and, three, incremental early NPLs. [..] We observed a normalization in reserve creation at Banco Compartamos after having excess reserves from Hurricane Otis in 1Q 2024. [..] We expect that reserves in the next two quarters will be around Ps. 2.2 billion. Our coverage ratio stood at 249.8%.",
    "es": "El costo de riesgo fue 12.1% [1S] y 13.6% en el 2T, por encima de lo esperado para el año. Se explica por el mayor riesgo en Perú, por el mayor crecimiento del crédito individual que requiere más provisiones en la mezcla y por un aumento en la morosidad temprana. [..] En Banco Compartamos se normalizó la creación de reservas tras el exceso por el huracán Otis en el 1T24. [..] Esperamos reservas de alrededor de Ps. 2.2 mil millones en cada uno de los próximos dos trimestres. La cobertura fue 249.8%."
   },
   "cor": {
    "who": "Enrique Majós (CEO)",
    "en": "Cost of risk closed at 12.1%, which is slightly above the 11.5% that we guided for this year, mainly because of our risk levels in Peru. [..] Once we normalize our risk levels in Peru, we would like to return in 2025 to a target cost of risk between 11.5% and 12%.",
    "es": "El costo de riesgo cerró en 12.1%, ligeramente por encima del 11.5% que guiamos para este año, sobre todo por los niveles de riesgo en Perú. [..] Una vez normalizado Perú, queremos regresar en 2025 a un costo de riesgo objetivo entre 11.5% y 12%."
   },
   "npl": {
    "who": "Mario Langarica (CFO)",
    "en": "NPLs, we should expect levels around 3.5%, 3.7% by the end of the year. The bank and ConCrédito will be stable. The pickup was by Peru, but by the end of the year, we expect NPLs around 3.6%.",
    "es": "En cartera vencida esperamos niveles de 3.5% a 3.7% al cierre del año. El banco y ConCrédito estarán estables; el repunte fue por Perú, pero al cierre esperamos alrededor de 3.6%."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees have shown a better-than-expected growth of 70% compared to 2Q 2023 to Ps. 1.01 billion, and this is mostly related to our insurance business. Insurance represents around 90% of the commissions and fee income generated in Gentera. [..] We've sold like 64 million policies in the first semester.",
    "es": "Las comisiones netas crecieron 70% contra el 2T23, mejor de lo esperado, a Ps. 1.01 mil millones, sobre todo por el negocio de seguros, que representa alrededor de 90% de las comisiones de Gentera. [..] Vendimos unos 64 millones de pólizas en el primer semestre."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 2Q amounted to Ps. 4.7 billion, representing a 12.7% growth compared to 2Q 2023. [..] Expense growth has been lower than our original expected guidance for the year. [..] We expect to close the year with an efficiency ratio of around 69%.",
    "es": "Los gastos de operación del 2T fueron Ps. 4.7 mil millones, 12.7% más que en el 2T23. [..] El crecimiento de gastos ha sido menor a la guía original del año. [..] Esperamos cerrar el año con un índice de eficiencia de alrededor de 69%."
   },
   "tax": {
    "who": "Mario Langarica (CFO)",
    "en": "The corporate rate in Mexico is 30%. [..] This year, these quarters, we have had a little pickup. But remember that in other quarters we have been around 28%. So the normal tax rate that we should always consider is 30%.",
    "es": "La tasa corporativa en México es 30%. [..] Este año, en estos trimestres, hubo un ligero repunte; pero en otros trimestres hemos estado alrededor de 28%. La tasa normal que siempre debe considerarse es 30%."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income amounted to Ps. 1.29 billion in 2Q 2024, with a cumulative net income in the first semester amounting to Ps. 2.8 billion, making it our best semester ever. Controlling net income amounted to Ps. 1.185 billion, an EPS of Ps. 0.75 for the quarter, a 10.6% increase compared to 2Q 2023.",
    "es": "La utilidad neta del 2T24 fue Ps. 1.29 mil millones y la del semestre Ps. 2.8 mil millones, nuestro mejor semestre. La utilidad controladora fue Ps. 1,185 millones, una UPA de Ps. 0.75 en el trimestre, 10.6% más que en el 2T23."
   },
   "eps": {
    "who": "Mario Langarica (CFO)",
    "en": "In order to deliver on the EPS guidance for the year: higher cost of risk, but maybe better expenses and better fees. Exactly. [..] First half 2024 results give us confidence to maintain Gentera's loan portfolio and EPS guidance, expecting controlling ROE to move around 20.5%.",
    "es": "Para cumplir la guía de UPA del año: mayor costo de riesgo, pero mejores gastos y mejores comisiones. Exactamente. [..] Los resultados del primer semestre nos dan confianza para mantener la guía de cartera y de UPA, con un ROE controlador alrededor de 20.5%."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for the semester reached 19.6%, with Banco Compartamos posting an ROE of 31.6%. [..] Our long-term objective would be to achieve ROE around 23%. And if we have higher profitability than that, we would love to bring prices down to our clients to share that economic creation with them.",
    "es": "El ROE controlador del semestre fue 19.6%, y Banco Compartamos tuvo 31.6%. [..] Nuestro objetivo de largo plazo es un ROE de alrededor de 23%. Si tenemos más rentabilidad que eso, nos encantaría bajar precios a los clientes para compartir esa creación de valor."
   },
   "niPE": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "[In Peru] we've been able to be more stringent in our credit origination processes, we have reduced the balances that we lend to the customers, we have increased our collection agents [..] We can expand the active rate in the market. [..] ML: We expect ROE to recover, probably 15% in soles and 13% in pesos. Our objective, probably it will take us a year or so, is to bring Peru back to ROEs above 20%.",
    "es": "[En Perú] hemos sido más estrictos en la originación, redujimos los saldos que prestamos, aumentamos los gestores de cobranza [..] y podemos subir la tasa activa en el mercado. [..] ML: Esperamos que el ROE se recupere, probablemente a 15% en soles y 13% en pesos. El objetivo, que tomará un año más o menos, es regresar Perú a ROE por encima de 20%."
   },
   "icap": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "Our internal minimum ICAP level for the bank is 25%, our internal limit for the solvency index in Peru is 17%, and we also have an internal equivalent ICAP level for ConCrédito, which we want to keep above 35%. [..] Tangible equity, our objective is to keep it around 22.5%.",
    "es": "Nuestro ICAP mínimo interno para el banco es 25%, el límite interno de solvencia en Perú es 17%, y para ConCrédito queremos un ICAP equivalente por encima de 35%. [..] En capital tangible el objetivo es mantenerlo alrededor de 22.5%."
   },
   "avgBal": {
    "who": "Patricio Diez de Bonilla (CEO Banco Compartamos)",
    "en": "[Individual lending] is a more efficient product: once you originate the loan, you don't require such an intense monitoring as in the group lending methodology. We lend up to Ps. 500,000 at four years. We can lend at, I don't know, 30% active rate, and that should make us as profitable as we are more efficient on the monitoring side despite lower NIMs.",
    "es": "[El crédito individual] es un producto más eficiente: una vez originado no requiere un monitoreo tan intenso como la metodología grupal. Prestamos hasta Ps. 500,000 a cuatro años, a una tasa activa de alrededor de 30%, y la eficiencia en el monitoreo compensa la menor MIN."
   }
  }
 },
 "2024Q3": {
  "date": "2024-10-23",
  "quarter": "2024Q3",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2024Q3-transcript-Gentera_3T24_earnings_call_transcript_2024-10-23.txt",
  "note": "FactSet CallStreet corrected transcript",
  "es": "Conferencia de resultados 3T24 (23 de octubre de 2024; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "3Q24 earnings call (23 October 2024; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's loan portfolio amounted to Ps. 75.4 billion in 3Q 2024, growing 24.5% compared to 3Q 2023. Worth highlighting the strong annual portfolio growth of 27.3% in Banco Compartamos and 20.6% in ConCrédito. [..] The robust portfolio growth in our Mexican subsidiaries has more than compensated the slowdown in Peru.",
    "es": "La cartera de Gentera fue Ps. 75.4 mil millones en el 3T24, 24.5% más que en el 3T23. Destaca el crecimiento anual de 27.3% en Banco Compartamos y 20.6% en ConCrédito. [..] El crecimiento robusto en México compensó con creces la desaceleración en Perú."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Interest income grew 23% versus 3Q 2023, reaching Ps. 10.2 billion. Net interest income grew 24% to Ps. 8.45 billion. Consequently, NIM amounted to 40.5% in this quarter and 39.7% in the nine-month period, in line with our expectations for the year.",
    "es": "Los ingresos por intereses crecieron 23% contra el 3T23, a Ps. 10.2 mil millones. El margen financiero creció 24% a Ps. 8.45 mil millones. La MIN fue 40.5% en el trimestre y 39.7% en los nueve meses, en línea con lo esperado."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's cost of risk amounted to 12.7% in the nine-month period and 13.8% in 3Q 2024. These numbers, which have been higher than expected, are mostly explained by: one, a higher-than-expected risk of our loan portfolio in Peru; two, a larger individual portfolio which requires higher provisions; three, the strong portfolio growth; and four, some potential risk associated to the meteorological events. [..] Provisions amounted to Ps. 2.49 billion with a coverage ratio of 231%.",
    "es": "El costo de riesgo fue 12.7% en los nueve meses y 13.8% en el 3T24, más de lo esperado, por: uno, mayor riesgo en Perú; dos, una cartera individual más grande que requiere más provisiones; tres, el fuerte crecimiento de cartera; y cuatro, riesgos por los eventos meteorológicos. [..] Las provisiones fueron Ps. 2.49 mil millones con cobertura de 231%."
   },
   "cor": {
    "who": "Mario Langarica (CFO)",
    "en": "Our expectation for Gentera year end is to have a cost of risk around 12.9%. Important to note that if we remove the unexpected impact from Peru, our cost of risk [would be] around 12%. [..] For next year, we would expect something around 12% once we normalize Peru's performance.",
    "es": "Nuestra expectativa de cierre de año es un costo de riesgo alrededor de 12.9%. Sin el impacto inesperado de Perú sería alrededor de 12%. [..] Para el próximo año esperaríamos alrededor de 12% una vez normalizado Perú."
   },
   "npl": {
    "who": "Enrique Majós (CEO)",
    "en": "The quality of our portfolio stands at 3.5% of NPL, a figure that remains within our 3.5% to 4% reference range. Only Peru is above this limit. However, NPLs are decreasing with a positive trend since June in Peru.",
    "es": "La calidad de la cartera está en 3.5% de cartera vencida, dentro de nuestro rango de referencia de 3.5% a 4%. Sólo Perú está por encima, pero su morosidad baja desde junio."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 1.17 billion in 3Q and Ps. 3.06 billion in the nine-month period, representing a 55.4% growth compared to 3Q 2023. These fees have been mostly driven by the extraordinary and better-than-expected results of our insurance business that represents almost 90% of collected commissions. [..] For next year we would probably expect a little higher growth on fees above the portfolio growth.",
    "es": "Las comisiones netas fueron Ps. 1.17 mil millones en el 3T y Ps. 3.06 mil millones en nueve meses, 55.4% más que en el 3T23, impulsadas por los resultados extraordinarios del negocio de seguros, casi 90% de las comisiones cobradas. [..] Para el próximo año esperaríamos un crecimiento de comisiones un poco por encima del de la cartera."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Accumulated operational expenses amounted to Ps. 14.066 billion, representing 12.4% growth compared to 3Q 2023, below the expected growth guidance for the year. [..] Our expectation for expenses for year-end is to grow around 14%. [..] Fourth quarter to fourth quarter is 18% more or less; it has to do with the incentives and extra payments at the end of the year.",
    "es": "Los gastos de operación acumulados fueron Ps. 14,066 millones, 12.4% más que al 3T23, por debajo de la guía del año. [..] Esperamos que los gastos crezcan alrededor de 14% al cierre. [..] El cuarto trimestre contra el cuarto trimestre será 18% más o menos, por los incentivos y pagos de fin de año."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income amounted to Ps. 1.749 billion in 3Q 2024, 29.6% growth compared to last year, while cumulative net income in the nine-month period amounted to Ps. 4.549 billion, our best figures ever for comparable periods. Controlling net income in 3Q amounted to Ps. 1.66 billion, an EPS of Ps. 1.04 for the quarter, 32.7% above 3Q 2023.",
    "es": "La utilidad neta fue Ps. 1,749 millones en el 3T24, 29.6% más que hace un año, y la acumulada de nueve meses Ps. 4,549 millones, las mejores cifras para periodos comparables. La utilidad controladora del 3T fue Ps. 1.66 mil millones, una UPA de Ps. 1.04, 32.7% más que en el 3T23."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "We estimate we will close the year in the mid-range of our guidance in terms of portfolio growth and in the high end of the guidance in terms of EPS. [..] The second and last dividend for this year will be paid on November 14, Ps. 0.60 per stock.",
    "es": "Estimamos cerrar el año en la parte media de la guía de crecimiento de cartera y en la parte alta de la guía de UPA. [..] El segundo y último dividendo del año se pagará el 14 de noviembre, Ps. 0.60 por acción."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for 3Q amounted to 23.6%, and for the nine-month period it reached 20.9%, with Banco Compartamos posting a ROE of 33.6%. [..] We feel very comfortable saying that the floor will now be 20.5% and something between 20.5% and 23% is feasible [for 2025]. We don't see 25% in the short run.",
    "es": "El ROE controlador del 3T fue 23.6% y el de nueve meses 20.9%; Banco Compartamos tuvo 33.6%. [..] Nos sentimos cómodos diciendo que el piso ahora es 20.5% y que algo entre 20.5% y 23% es factible [para 2025]. No vemos 25% en el corto plazo."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "In early 2024, we observed incremental NPLs and cost of risk that made us slow down the portfolio growth in Peru and take bold actions to prioritize asset quality. The recent dynamics observed in 3Q 2024 allow us to think that the inflection point in Peru is behind us.",
    "es": "A inicios de 2024 observamos más cartera vencida y costo de riesgo, lo que nos llevó a frenar el crecimiento en Perú y a tomar acciones decididas para priorizar la calidad. La dinámica del 3T24 nos permite pensar que el punto de inflexión en Perú quedó atrás."
   },
   "niCC": {
    "who": "Mario Langarica (CFO)",
    "en": "ConCrédito's business line CrediTienda has started operations in Peru in synergy with Compartamos Financiera. [..] As part of the process of integrating ConCrédito into Gentera, we've made some adjustments to the corporate structure of ConCrédito: Fincrementar, together with Fin Útil, will be the credit originators for the empresarias in the next periods.",
    "es": "CrediTienda, la línea de negocio de ConCrédito, empezó a operar en Perú en sinergia con Compartamos Financiera. [..] Como parte de la integración de ConCrédito en Gentera ajustamos su estructura corporativa: Fincrementar, junto con Fin Útil, serán los originadores de crédito para las empresarias."
   },
   "clientsCred": {
    "who": "Mario Langarica (CFO)",
    "en": "As of 3Q 2024, we have reached a new record of 5.58 million people using our financial services, adding 789,000 people in a year with a 16.5% growth versus 2023.",
    "es": "Al 3T24 alcanzamos un nuevo récord de 5.58 millones de personas que usan nuestros servicios financieros, 789,000 más en un año, un crecimiento de 16.5% contra 2023."
   },
   "employees": {
    "who": "Mario Langarica (CFO)",
    "en": "We have a P&L methodology in each office, and we only allow the hiring of new people if the profitability level has reached the highest potential at the specific place. We will keep hiring as appropriate, but it's linked to a P&L contribution.",
    "es": "Tenemos una metodología de estado de resultados por oficina y sólo permitimos contratar si la rentabilidad de ese lugar alcanzó su máximo potencial. Seguiremos contratando cuando convenga, pero ligado a la contribución al resultado."
   }
  }
 },
 "2024Q4": {
  "date": "2025-02-27",
  "quarter": "2024Q4",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2024Q4-transcript-Gentera_4T24_earnings_call_transcript_2025-02-27.txt",
  "note": "FactSet CallStreet corrected transcript",
  "es": "Conferencia de resultados 4T24 (27 de febrero de 2025; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "4Q24 earnings call (27 February 2025; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Enrique Majós (CEO)",
    "en": "Gentera's portfolio reached Ps. 82.7 billion, which means a 27% growth compared with 2023. As you remember, our guidance for the year was between 18% and 20%. [..] Our guidance for 2025 is between 13% and 16% in portfolio, and between 20% and 24% growth in our EPS.",
    "es": "La cartera de Gentera alcanzó Ps. 82.7 mil millones, un crecimiento de 27% contra 2023. Nuestra guía era entre 18% y 20%. [..] La guía 2025 es entre 13% y 16% en cartera y entre 20% y 24% de crecimiento en UPA."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "Banco Compartamos' portfolio grew 29%, while group lending contributed with a 21% growth. Our individual lending product showed an impressive 48% growth. [..] ML: In Mexico, we will be growing faster in individual lending than in group lending, but both products have healthy growth plans.",
    "es": "La cartera de Banco Compartamos creció 29%: el crédito grupal 21% y el individual un impresionante 48%. [..] ML: En México creceremos más rápido en individual que en grupal, pero ambos productos tienen planes de crecimiento sanos."
   },
   "loansPE": {
    "who": "Enrique Majós (CEO)",
    "en": "Our business in Peru faced a difficult year in 2024. During the first semester, we slowed down our growth in order to control the quality of the portfolio. By December 2024, we ended slightly above the 2023 figures with a 3.6% growth in clients and 1.5% growth in portfolio in local currency. [..] Last month we received the banking license for our operation in Peru.",
    "es": "Perú tuvo un año difícil en 2024. En el primer semestre frenamos el crecimiento para controlar la calidad de la cartera. A diciembre cerramos ligeramente por encima de 2023: +3.6% en clientes y +1.5% en cartera en moneda local. [..] El mes pasado recibimos la licencia bancaria para Perú."
   },
   "loansCC": {
    "who": "Enrique Majós (CEO)",
    "en": "In ConCrédito, we reached a maximum portfolio of Ps. 5.1 billion, a 22.6% growth versus last year, and net income grew 29%, while the quality of the portfolio remains at 2.6%. [..] We are already in the process of analyzing the acquisition of the remaining 25% of ConCrédito; this transaction could take place within the present year.",
    "es": "En ConCrédito alcanzamos una cartera máxima de Ps. 5.1 mil millones, 22.6% más que el año pasado, y la utilidad neta creció 29%, con cartera vencida de 2.6%. [..] Ya analizamos la compra del 25% restante de ConCrédito; la transacción podría darse este año."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's 2024 interest income grew 23.8% versus 2023, reaching Ps. 40.2 billion, and net interest income grew 22.6% to Ps. 32.9 billion. NIM amounted to 39.8% in 2024, in line with our expectations. For 2025, we expect to have our NIM moving around 39%.",
    "es": "Los ingresos por intereses de 2024 crecieron 23.8% contra 2023, a Ps. 40.2 mil millones, y el margen financiero 22.6% a Ps. 32.9 mil millones. La MIN fue 39.8%, en línea con lo esperado. Para 2025 esperamos una MIN alrededor de 39%."
   },
   "intExp": {
    "who": "Enrique Barrera (IR)",
    "en": "What we are expecting for Mexico is that the reference rate will end the year moving around 8.75%, and in the case of Peru, 4.75%. [..] Any reduction around 100 basis points is a benefit moving around Ps. 580 million before taxes in the interest expense line for a full year [Ps. 410 million after taxes].",
    "es": "Esperamos que la tasa de referencia en México cierre el año alrededor de 8.75% y en Perú 4.75%. [..] Cada reducción de 100 puntos base beneficia en alrededor de Ps. 580 millones antes de impuestos la línea de gastos por intereses en un año completo [Ps. 410 millones después de impuestos]."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Cost of risk for 2024 amounted to 12.9%, mainly driven by the strong growth, the mix of our portfolio, and the challenges that we faced in Peru in early 2024. We feel comfortable with the observed level and we expect to maintain it around 13% for 2025. Provisions amounted to Ps. 9.2 billion, a 42% growth, and we finished the year with a 209.5% coverage ratio. [..] NIM after provisions amounted to 28.7%; for 2025 we expect around 28%.",
    "es": "El costo de riesgo de 2024 fue 12.9%, por el fuerte crecimiento, la mezcla de cartera y los retos en Perú a inicios de 2024. Nos sentimos cómodos y esperamos mantenerlo alrededor de 13% en 2025. Las provisiones fueron Ps. 9.2 mil millones, +42%, y cerramos con cobertura de 209.5%. [..] La MIN después de provisiones fue 28.7%; para 2025 esperamos alrededor de 28%."
   },
   "npl": {
    "who": "Enrique Majós (CEO)",
    "en": "What we should be seeing for 2025 is an NPL moving around 4%. We are currently moving at 3.9%. Now that different methodologies like individual lending, which has a different risk profile, [weigh more], it should be moving around 4% going forward.",
    "es": "Para 2025 deberíamos ver una cartera vencida alrededor de 4%. Hoy estamos en 3.9%. Con más peso de metodologías como el crédito individual, que tiene otro perfil de riesgo, debería moverse alrededor de 4%."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 4.65 billion in 2024, compared to Ps. 2.88 billion in 2023, representing a 61.8% growth. These fees have been mostly driven by better-than-expected results of our insurance business, around 90% of collected commissions, and also two extraordinary nonrecurring benefits.",
    "es": "Las comisiones netas fueron Ps. 4.65 mil millones en 2024 contra Ps. 2.88 mil millones en 2023, un crecimiento de 61.8%, impulsadas por el negocio de seguros, alrededor de 90% de las comisiones cobradas, y por dos beneficios extraordinarios no recurrentes."
   },
   "otherInc": {
    "who": "Enrique Majós (CEO)",
    "en": "Today, we can proudly say that the insurance business income stands at 10% of Gentera's income. [..] By the end of 2024, we reached 17.3 million active insurance policies, an impressive 43% annual growth.",
    "es": "Hoy el ingreso del negocio de seguros representa 10% de los ingresos de Gentera. [..] Al cierre de 2024 llegamos a 17.3 millones de pólizas activas, un crecimiento anual de 43%."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 2024 amounted to Ps. 19.8 billion, a 16.4% increase compared to 2023, in line with the guidance. [..] In 4Q 2024 we decided to make an anticipated amortization of Ps. 200 million of an intangible asset related to the original client base of ConCrédito at the moment of the acquisition. For 2025, we expect to grow operating expenses around 13%.",
    "es": "Los gastos de operación de 2024 fueron Ps. 19.8 mil millones, 16.4% más que en 2023, en línea con la guía. [..] En el 4T24 decidimos amortizar anticipadamente Ps. 200 millones de un intangible ligado a la base de clientes original de ConCrédito al momento de la adquisición. Para 2025 esperamos un crecimiento de gastos de alrededor de 13%."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income in 2024 was a historic record, amounting to Ps. 6.462 billion, growing 27.9% compared to 2023. Gentera's controlling participation amounted to Ps. 6.005 billion, representing an EPS of Ps. 3.8 for the year, above our original guidance, and 27.1% above 2023 EPS of Ps. 2.99.",
    "es": "La utilidad neta de 2024 fue récord: Ps. 6,462 millones, 27.9% más que en 2023. La participación controladora fue Ps. 6,005 millones, una UPA de Ps. 3.80, por encima de la guía original y 27.1% arriba de los Ps. 2.99 de 2023."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "EPS reached Ps. 3.8, which is 6% above the higher end of our 2024 guidance. [..] Regarding our 2024 dividend payout, we will maintain our 40% dividend policy and the payout will take place in two events, the first one in May and the second one in November.",
    "es": "La UPA fue Ps. 3.80, 6% por encima del techo de la guía 2024. [..] Sobre el dividendo 2024, mantendremos la política de 40%, pagadero en dos eventos: mayo y noviembre."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's ROE for 2024 stood at 21.5%, above our original 20.5% expectation. For 2025, we expect controlling ROE to move at or above 21.5%. [..] We would like to have a sustainable ROE in the long term of something between 20% and 22%, and the remainder we would like to share with our clients.",
    "es": "El ROE de Gentera en 2024 fue 21.5%, por encima del 20.5% esperado. Para 2025 esperamos un ROE controlador igual o mayor a 21.5%. [..] Queremos un ROE sostenible de largo plazo entre 20% y 22%, y el remanente compartirlo con los clientes."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "The general rule is that we want all of our subsidiaries to have an ROE above 20%. Peru is in the trend to recovery; this year the objective is to bring it to mid-teens levels. [..] Peru represented around 6% of net income; with the recovery we expect it to come back to around 8% in 2025.",
    "es": "La regla general es que todas las subsidiarias tengan un ROE por encima de 20%. Perú va en recuperación; este año el objetivo es llevarlo a la zona de 15%. [..] Perú fue alrededor de 6% de la utilidad neta; con la recuperación esperamos que regrese a alrededor de 8% en 2025."
   },
   "clientsCred": {
    "who": "Enrique Majós (CEO)",
    "en": "At the end of 2024, we reached 5.7 million people, which represents 11.9% [growth] compared to the fourth quarter 2023. [..] Between 2010 and 2019, we grew 6.5% [net income] on average per year; as soon as we started with our modernization plan, we have been growing more than twice as fast, 14.3% on average.",
    "es": "Al cierre de 2024 llegamos a 5.7 millones de personas, 11.9% más que en el 4T23. [..] Entre 2010 y 2019 crecimos 6.5% [utilidad neta] en promedio anual; desde que inició el plan de modernización crecemos más del doble, 14.3% en promedio."
   }
  }
 },
 "2025Q1": {
  "date": "2025-04-24",
  "quarter": "2025Q1",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2025Q1-transcript-Gentera_1T25_earnings_call_transcript_2025-04-24.txt",
  "note": "FactSet CallStreet corrected transcript",
  "es": "Conferencia de resultados 1T25 (24 de abril de 2025; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "1Q25 earnings call (24 April 2025; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Mario Langarica (CFO)",
    "en": "Our loan portfolio kept similar historic levels as those of 4Q 2024, amounting to Ps. 82.7 billion, representing a 26.3% annual growth compared to 1Q 2024. [..] With this strong start of the year, we expect to grow the consolidated loan portfolio around 15% in 2025.",
    "es": "La cartera se mantuvo en niveles históricos similares al 4T24, Ps. 82.7 mil millones, 26.3% más que en el 1T24. [..] Con este inicio de año esperamos crecer la cartera consolidada alrededor de 15% en 2025."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's interest income is growing at solid levels, showing a 19.9% growth in 1Q 2025 compared to 1Q 2024, amounting to Ps. 11.2 billion. Net interest income grew 24.3% to Ps. 9.35 billion following the robust growth in portfolio and clients. NIM amounted to 39.5% in 1Q 2025, in line with our expectations for the year.",
    "es": "Los ingresos por intereses crecen a niveles sólidos: 19.9% en el 1T25 contra el 1T24, a Ps. 11.2 mil millones. El margen financiero creció 24.3% a Ps. 9.35 mil millones. La MIN fue 39.5%, en línea con lo esperado para el año."
   },
   "intExp": {
    "who": "Enrique Majós (CEO)",
    "en": "The original prediction for this year on the reference rate was 8.75%. Obviously I know that consensus now is moving towards 8%; that would be an additional benefit that will translate into the bottom line. For next year, we are estimating around 7.75%. [..] With the liabilities that we currently have, if there is a 100 bps reduction, the benefit would be Ps. 580 million before taxes.",
    "es": "La predicción original de tasa de referencia para este año era 8.75%. El consenso ahora va hacia 8%; sería un beneficio adicional que se traduciría en utilidad. Para el próximo año estimamos alrededor de 7.75%. [..] Con los pasivos actuales, una baja de 100 pb beneficiaría en Ps. 580 millones antes de impuestos."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "We have observed better-than-expected asset quality at the start of the year, both in Mexico and Peru, with a cost of risk for 1Q 2025 amounting to 11.6%. At this point, we are maintaining our 2025 expected level of cost of risk around 13%, but we will look closely to our June numbers. [..] Provisions amounted to Ps. 2.4 billion, a 37.6% growth, in line with the portfolio growth and its mix. NIM after provisions 29.3%, slightly above the expectation for 2025 of 28% to 29%.",
    "es": "Observamos una calidad de activos mejor a la esperada al inicio del año, en México y Perú, con un costo de riesgo de 11.6% en el 1T25. Por ahora mantenemos la expectativa de alrededor de 13% para 2025, pero revisaremos las cifras de junio. [..] Las provisiones fueron Ps. 2.4 mil millones, +37.6%, en línea con el crecimiento y la mezcla. MIN después de provisiones 29.3%, ligeramente arriba de la expectativa de 28% a 29%."
   },
   "cor": {
    "who": "Mario Langarica (CFO)",
    "en": "The way we see risk is from a bottom-up perspective: we start with the weekly payment, and what we have been seeing is outstanding weekly payments from our clients, both in Mexico and Peru. That reduces the 90-day past due, feeds the construction of provisions and improves cost of risk.",
    "es": "Vemos el riesgo de abajo hacia arriba: empezamos por el pago semanal, y hemos visto pagos semanales sobresalientes de nuestros clientes en México y Perú. Eso reduce la mora a 90 días, alimenta la construcción de provisiones y mejora el costo de riesgo."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 1.337 billion in 1Q 2025, compared to Ps. 878 million in 1Q 2024, representing a 52.3% annual growth, mostly driven by better-than-expected results of our insurance business, around 90% of the collected commissions. [..] We should be growing our penetration in insurance at the high end of the portfolio growth guidance, around 16%, 17%.",
    "es": "Las comisiones netas fueron Ps. 1,337 millones en el 1T25 contra Ps. 878 millones en el 1T24, +52.3%, impulsadas por el negocio de seguros, alrededor de 90% de las comisiones cobradas. [..] La penetración en seguros debería crecer en la parte alta de la guía de cartera, alrededor de 16% a 17%."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 1Q 2025 amounted to Ps. 5.4 billion, a 20% increase, mainly explained by a larger base of our sales force. [..] Given the observed robust growth and solid asset quality, expenses could finalize this year growing closer to 15% instead of the 13% originally guided. These additional expenses would mostly be sales and incentive payments resulting from our better-than-expected performance.",
    "es": "Los gastos de operación del 1T25 fueron Ps. 5.4 mil millones, +20%, sobre todo por una mayor fuerza de ventas. [..] Dado el crecimiento robusto y la calidad de activos, los gastos podrían cerrar el año creciendo más cerca de 15% en lugar del 13% guiado. Serían sobre todo pagos de ventas e incentivos por el desempeño mejor al esperado."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income in 1Q 2025 reached another historic quarter record amounting to Ps. 2.221 billion, growing 47% compared to 1Q 2024. Gentera's controlling participation amounted to Ps. 2.106 billion, representing an EPS of Ps. 1.33, 49% above our first quarter 2024 EPS.",
    "es": "La utilidad neta del 1T25 fue otro récord trimestral: Ps. 2,221 millones, 47% más que en el 1T24. La participación controladora fue Ps. 2,106 millones, una UPA de Ps. 1.33, 49% arriba del 1T24."
   },
   "eps": {
    "who": "Mario Langarica (CFO)",
    "en": "For the year end, we believe that we're going to reach the high end of our EPS guidance with room for an additional 5% improvement. At this point, we're not changing the range of our EPS guidance, since we want to have additional information on our business trends and macro evolution. We will come back to you in our second quarter report.",
    "es": "Para el cierre creemos que llegaremos al techo de la guía de UPA con espacio para 5% adicional. Por ahora no cambiamos el rango, porque queremos más información sobre las tendencias del negocio y la macro. Regresaremos con ustedes en el informe del segundo trimestre."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for 1Q 2025 stood at 26.3%, above our original expectation for the year. For 2025, we would expect controlling ROE to move around 22%, but with the revision that we will do in the second quarter we will provide more specifics.",
    "es": "El ROE controlador del 1T25 fue 26.3%, por encima de la expectativa original. Para 2025 esperaríamos un ROE controlador alrededor de 22%, pero con la revisión del segundo trimestre daremos más detalle."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "[Peru at 20% ROE] is a quarter effect. Obviously, that's our objective. We believe that by the end of the year we will be closing somewhere in the mid-teens. [..] EM: As of April 1st, we appointed Adolfo Peniche as the new CEO for Banco Compartamos in Peru, after Ralph Guerra stepped down after 32 years.",
    "es": "[El ROE de 20% en Perú] es un efecto del trimestre. Ése es el objetivo, pero creemos que cerraremos el año en la zona de 15%. [..] EM: Desde el 1 de abril nombramos a Adolfo Peniche como nuevo director general de Banco Compartamos en Perú, tras el retiro de Ralph Guerra después de 32 años."
   },
   "niCC": {
    "who": "Enrique Majós (CEO)",
    "en": "We expect to finalize the acquisition [of the remaining 25.1% of ConCrédito] in this second quarter. We will fund the acquisition with a combination of dividends from the subsidiaries and some external funding.",
    "es": "Esperamos concluir la adquisición [del 25.1% restante de ConCrédito] en este segundo trimestre. La fondearemos con dividendos de las subsidiarias y algo de fondeo externo."
   },
   "avgBal": {
    "who": "Mario Langarica (CFO)",
    "en": "In average, group lending is Ps. 10,000, and the average that we're lending in individual lending is Ps. 40,000 to Ps. 50,000. [..] Individual lending is a larger loan with a little higher risk profile, but with better cost dynamics, and the margins at the end are similar. [Loan growth from existing clients is] the change in mix, better risk assessment tools and the exit or reduction of competition in traditional microfinance.",
    "es": "En promedio, el crédito grupal es de Ps. 10,000 y el individual de Ps. 40,000 a Ps. 50,000. [..] El individual es un préstamo mayor, con perfil de riesgo un poco más alto pero mejores costos, y al final los márgenes son similares. [El crecimiento con clientes existentes viene de] la mezcla, mejores herramientas de riesgo y la salida o reducción de competidores tradicionales."
   },
   "clientsCred": {
    "who": "Mario Langarica (CFO)",
    "en": "In 1Q 2025, we reached a new record of 5.8 million people using our financial services, adding around 532,000 people on a year-over-year comparison, a 10.1% growth. [..] Between Mexico and Peru there are around 65 million people above 18 years old that are underserved. We expect to keep growing at about 10% in the long run.",
    "es": "En el 1T25 alcanzamos un récord de 5.8 millones de personas usando nuestros servicios, 532,000 más que hace un año, +10.1%. [..] Entre México y Perú hay unos 65 millones de mayores de 18 años subatendidos. Esperamos seguir creciendo alrededor de 10% en el largo plazo."
   }
  }
 },
 "2025Q2": {
  "date": "2025-07-23",
  "quarter": "2025Q2",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2025Q2-transcript-Gentera_2T25_earnings_call_transcript_2025-07-23.txt",
  "note": "FactSet CallStreet raw transcript",
  "es": "Conferencia de resultados 2T25 (23 de julio de 2025; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "2Q25 earnings call (23 July 2025; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera reached a new record loan portfolio of Ps. 83.7 billion, representing a 21.6% annual growth. In Mexico, both Banco Compartamos and ConCrédito have maintained annual growth above 20%. [..] EM: Our portfolio growth guidance remains between 13% and 16%; however, we believe we will finish the year closer to the high end of this range.",
    "es": "Gentera alcanzó una cartera récord de Ps. 83.7 mil millones, +21.6% anual. En México, Banco Compartamos y ConCrédito mantuvieron crecimientos anuales de más de 20%. [..] EM: La guía de crecimiento de cartera se mantiene entre 13% y 16%, pero creemos que cerraremos más cerca del techo."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "In the working capital lending products with our group lending methodology, we are the leaders: we have around 3 million customers, the second place has around 200,000, so clearly we have around 70% of the market share. In individual lending, with 280,000 customers, we are the leaders from a group of six relevant players with around 30% market share. [..] Group lending portfolio grew 13% while the individual portfolio grew almost 30%.",
    "es": "En capital de trabajo con metodología grupal somos líderes: tenemos unos 3 millones de clientes, el segundo lugar unos 200,000, así que tenemos alrededor de 70% de participación. En crédito individual, con 280,000 clientes, somos líderes entre seis jugadores relevantes, con alrededor de 30%. [..] La cartera grupal creció 13% y la individual casi 30%."
   },
   "loansPE": {
    "who": "Enrique Majós (CEO)",
    "en": "Banco Compartamos in Peru is recovering momentum with a good asset quality. In the last 12 months, it grew by 10% in clients and 8% in portfolio in local currency. [..] In Peru, group lending portfolio grew 16% while individual lending grew 5%.",
    "es": "Banco Compartamos en Perú recupera impulso con buena calidad de activos. En 12 meses creció 10% en clientes y 8% en cartera en moneda local. [..] En Perú la cartera grupal creció 16% y la individual 5%."
   },
   "loansCC": {
    "who": "Enrique Majós (CEO)",
    "en": "ConCrédito continues growing strong and solid, with an annual portfolio growth of 20%; we are now fully present in all the 32 states nationwide, with presence in 195 cities. CrediTienda increased its income by 90% compared with the second quarter 2024.",
    "es": "ConCrédito sigue creciendo fuerte y sólido, con cartera +20% anual; ya estamos en los 32 estados, con presencia en 195 ciudades. CrediTienda aumentó sus ingresos 90% contra el 2T24."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2Q 2025, Gentera's interest income amounted to Ps. 11.8 billion, with a solid 21.8% growth compared to last year. Even after the growth in our portfolio, financing expenses had a marginal increase of 1.7%, mostly driven by the reduction of reference interest rates. Therefore, net interest income grew 25.7% and NIM improved to 40.9%. [..] We expect to finish the year with NIM around 41%.",
    "es": "En el 2T25 los ingresos por intereses fueron Ps. 11.8 mil millones, +21.8%. Aun con el crecimiento de cartera, los gastos de financiamiento subieron sólo 1.7%, por la baja de tasas de referencia. Así, el margen financiero creció 25.7% y la MIN mejoró a 40.9%. [..] Esperamos cerrar el año con una MIN alrededor de 41%."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "A couple of years ago we started taking variable rate funding to take advantage of this expected reduction in rates, and that has been playing well. In this business plan, we still have 8% in Mexico [reference rate], so we may see some other potential improvements if rates come down.",
    "es": "Hace un par de años empezamos a tomar fondeo a tasa variable para aprovechar la baja esperada de tasas, y ha funcionado. En el plan seguimos con 8% en México [tasa de referencia], así que podríamos ver mejoras adicionales si bajan más."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's consolidated NPLs amounted to 3.32% and cost of risk to 12.7% in this quarter. For the first semester, cost of risk amounted to 12.2%, compared to 12.1% last year. We now expect a cost of risk around 12.5% by year end, better than the 13% originally guided. Provisions amounted to Ps. 2.65 billion, a 15.8% growth, adequate considering the loan portfolio growth and its mix. NIM after provisions 29.8% vs 28%; we expect to close the year around 30%.",
    "es": "La cartera vencida consolidada fue 3.32% y el costo de riesgo 12.7% en el trimestre; en el semestre 12.2% contra 12.1%. Ahora esperamos un costo de riesgo alrededor de 12.5% al cierre, mejor que el 13% guiado. Las provisiones fueron Ps. 2.65 mil millones, +15.8%, adecuadas para el crecimiento y la mezcla. MIN después de provisiones 29.8% vs 28%; esperamos cerrar alrededor de 30%."
   },
   "cor": {
    "who": "Enrique Majós (CEO)",
    "en": "The typical cost of risk in individual lending in Mexico is moving around 15%, and that's a normal cost of risk. The typical cost of risk in the group lending methodology is moving around 10%. [..] ML: For Peru, we expect this year around 11%. ConCrédito: 25% you should take as the structural cost of the business; it's well priced and we can make the profitability that we want after cost of risk.",
    "es": "El costo de riesgo típico del crédito individual en México se mueve alrededor de 15%, y es normal. El de la metodología grupal alrededor de 10%. [..] ML: Para Perú esperamos alrededor de 11% este año. ConCrédito: 25% debe tomarse como el costo estructural del negocio; está bien tarificado y da la rentabilidad que queremos después de costo de riesgo."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 1.4 billion, compared to Ps. 1.01 billion in 2Q 2024, representing a 52.3% annual growth, mostly driven by better than expected results of our insurance business. We now expect net fees to grow around 25% for the year. [..] EM: Our insurance business had an outstanding 32% growth in intermediated policies, and we ended the quarter with 17 million active policies.",
    "es": "Las comisiones netas fueron Ps. 1.4 mil millones contra Ps. 1.01 mil millones en el 2T24, +52.3%, por los resultados del negocio de seguros. Ahora esperamos que las comisiones netas crezcan alrededor de 25% en el año. [..] EM: Las pólizas intermediadas crecieron 32% y cerramos con 17 millones de pólizas activas."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses amounted to Ps. 5.75 billion, representing a 22.3% growth, mainly explained by a larger base of employees, the variable compensation associated to the solid growth of our business, and the strategic initiatives. Therefore, we expect expenses to grow around 19% for the full year, higher than the 15% originally guided. These are productive expenses, mainly associated to the sales process and incentive programs.",
    "es": "Los gastos de operación fueron Ps. 5.75 mil millones, +22.3%, por una mayor base de empleados, la compensación variable ligada al crecimiento y las iniciativas estratégicas. Esperamos que los gastos crezcan alrededor de 19% en el año, más que el 15% guiado. Son gastos productivos, ligados a ventas e incentivos."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2Q 2025, net income amounted to Ps. 2.108 billion, growing 63% compared to 2Q 2024. Controlling net income amounted to Ps. 2.105 billion, representing an EPS of Ps. 1.32, 77% above the same period in 2024. As of June 2025, net income amounted to Ps. 4.329 billion, the highest six months number in our history.",
    "es": "En el 2T25 la utilidad neta fue Ps. 2,108 millones, +63% contra el 2T24. La utilidad controladora fue Ps. 2,105 millones, una UPA de Ps. 1.32, 77% más que hace un año. A junio de 2025 la utilidad neta fue Ps. 4,329 millones, el mejor semestre de nuestra historia."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "We are increasing our EPS guidance as much as 10%, so our new EPS guidance stands between Ps. 5 and Ps. 5.15. [..] ML: In the midpoint, around 32% higher than our 2024 EPS of Ps. 3.80. [..] When we said the high end of the guidance, we refer to the portfolio, 15% to 16%; EPS we will keep it at the midpoint.",
    "es": "Subimos la guía de UPA hasta 10%: la nueva guía está entre Ps. 5.00 y Ps. 5.15. [..] ML: En el punto medio, alrededor de 32% arriba de la UPA 2024 de Ps. 3.80. [..] Cuando hablamos del techo de la guía nos referimos a la cartera, 15% a 16%; la UPA la dejamos en el punto medio."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for the second quarter amounted to 25.9%, above our original expectation for the year, and for the first semester it stood at 26.3%. We now expect that controlling ROE for the year will move around 24%. [..] We have already started an analysis on how this incremental profitability can be shared between our shareholders, our clients and our employees; we will give a specific plan when we announce the 2026 plan in February.",
    "es": "El ROE controlador del segundo trimestre fue 25.9%, arriba de la expectativa original, y el del semestre 26.3%. Ahora esperamos un ROE controlador alrededor de 24% en el año. [..] Ya iniciamos un análisis de cómo compartir esta rentabilidad incremental entre accionistas, clientes y empleados; daremos un plan específico con el plan 2026 en febrero."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "Very good news have come from Peru, mostly from the asset quality, and that has allowed us to start growth again. [..] We should change it from 15% to maybe 20% ROE for Peru this year in local currency.",
    "es": "Muy buenas noticias de Perú, sobre todo en calidad de activos, lo que nos permitió volver a crecer. [..] Deberíamos cambiar la expectativa de ROE de Perú de 15% a quizá 20% este año en moneda local."
   },
   "niCC": {
    "who": "Mario Langarica (CFO)",
    "en": "ConCrédito is performing very well and will keep delivering ROEs above probably 25% for the year. [..] The [equity] effect: the dividend; the premium in the stock acquisition of the 25% of ConCrédito, around Ps. 575 million, booked in premium on sale of stock; and the OCI.",
    "es": "ConCrédito va muy bien y seguirá entregando ROE por encima de 25% en el año. [..] El efecto en capital: el dividendo; la prima por la compra del 25% de ConCrédito, unos Ps. 575 millones, registrada en prima en venta de acciones; y el ORI."
   },
   "niMin": {
    "who": "Mario Langarica (CFO)",
    "en": "[The minority interest] relates specifically to our partnership 50% for Aterna: the net income that we expect for Aterna, 50% of that on an annual basis goes to our partner. [..] Something around Ps. 200 million for that line [for the year].",
    "es": "[La participación minoritaria] corresponde a nuestro socio al 50% en Aterna: 50% de la utilidad de Aterna va cada año al socio. [..] Alrededor de Ps. 200 millones en esa línea [para el año]."
   },
   "eqAssets": {
    "who": "Mario Langarica (CFO)",
    "en": "Our first objective is to have sufficient capital to support our organic growth. The second, to close product gaps inorganically, very selectively. The third, to maintain a stable dividend payout policy, the 40% that in principle we want to keep. And fourth, if we keep accumulating capital, it could potentially be at some point a review of the dividend policy. We typically prefer dividends instead of buybacks.",
    "es": "El primer objetivo es tener capital suficiente para el crecimiento orgánico. El segundo, cerrar brechas de producto de forma inorgánica, muy selectivamente. El tercero, mantener una política estable de dividendos, el 40% que en principio queremos conservar. Y cuarto, si seguimos acumulando capital, en algún momento podría revisarse la política. Preferimos dividendos a recompras."
   }
  }
 },
 "2025Q3": {
  "date": "2025-10-22",
  "quarter": "2025Q3",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2025Q3-transcript-Gentera_3T25_earnings_call_transcript_2025-10-22.txt",
  "note": "FactSet CallStreet NRT (automated) transcript; wording lightly corrected where garbled",
  "es": "Conferencia de resultados 3T25 (22 de octubre de 2025; transcripción automática FactSet en inglés, citas traducidas y depuradas)",
  "en": "3Q25 earnings call (22 October 2025; FactSet automated transcript, quotes lightly cleaned)",
  "quotes": {
   "loans": {
    "who": "Mario Langarica (CFO)",
    "en": "The modernization initiatives have allowed Gentera to reach a new record loan portfolio of Ps. 87.8 billion, representing a 16.4% annual growth. In Mexico, both Banco Compartamos and ConCrédito have reported annual growth around 20% in their respective loan books, and in Compartamos Peru we have restarted growth while improving asset quality and profitability. [..] We expect to grow the consolidated loan portfolio around 15% for 2025.",
    "es": "Las iniciativas de modernización llevaron a Gentera a una cartera récord de Ps. 87.8 mil millones, +16.4% anual. En México, Banco Compartamos y ConCrédito reportaron crecimientos anuales alrededor de 20%, y en Compartamos Perú reiniciamos el crecimiento mejorando calidad y rentabilidad. [..] Esperamos crecer la cartera consolidada alrededor de 15% en 2025."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Accumulated interest income amounted to Ps. 35 billion in the nine-month period, a solid 21.1% growth. Financing expenses only increased 1%, mainly driven by the reduction of reference interest rates, even after considering the growth in the funding of our loan portfolio. Net interest income grew 24.3% and NIM amounted to 40.8%, above our expectation for the year.",
    "es": "Los ingresos por intereses acumulados fueron Ps. 35 mil millones en nueve meses, +21.1%. Los gastos de financiamiento subieron sólo 1%, por la baja de tasas de referencia, aun con el mayor fondeo de la cartera. El margen financiero creció 24.3% y la MIN fue 40.8%, por encima de lo esperado para el año."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Consolidated NPLs amounted to 3.42% and cost of risk to 13.3% in 3Q 2025; for the nine-month period, cost of risk amounted to 12.5%, compared to 12.7% in 2024. We expect to end the year with a cost of risk around 12.5%, better than the 13% originally guided, even considering the heavy rains in Mexico recently. Provisions amounted to Ps. 2.85 billion, a 14.6% growth. NIM after provisions 30.6%.",
    "es": "La cartera vencida consolidada fue 3.42% y el costo de riesgo 13.3% en el 3T25; en nueve meses 12.5% contra 12.7% en 2024. Esperamos cerrar el año alrededor de 12.5%, mejor que el 13% guiado, aun considerando las lluvias recientes en México. Las provisiones fueron Ps. 2.85 mil millones, +14.6%. MIN después de provisiones 30.6%."
   },
   "cor": {
    "who": "Mario Langarica (CFO)",
    "en": "This specific event [the floods] is hitting around 1% of our clients and 1% of the portfolio. But that doesn't mean that the 1% will be a write off; it's usually a fraction of that. We don't expect any impact on what we have already guided. [..] For next year, something similar to the 13% would be something that we would probably be thinking about.",
    "es": "Este evento [las inundaciones] afecta alrededor de 1% de los clientes y 1% de la cartera. Pero eso no significa que ese 1% se castigue; normalmente es una fracción. No esperamos impacto en lo guiado. [..] Para el próximo año, algo similar al 13% es lo que probablemente estaríamos pensando."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 1.5 billion in 3Q 2025, compared with Ps. 1.17 billion in 3Q 2024, a 29.5% annual growth, mostly driven by our insurance business, around 90% of the commissions collected. For the nine-month period net fees stood at Ps. 4.3 billion, +39.4%. [..] Growth in net fees should be around 20% for this year and going forward more in line with the growth of the portfolio.",
    "es": "Las comisiones netas fueron Ps. 1.5 mil millones en el 3T25 contra Ps. 1.17 mil millones en el 3T24, +29.5%, por el negocio de seguros, alrededor de 90% de las comisiones cobradas. En nueve meses fueron Ps. 4.3 mil millones, +39.4%. [..] El crecimiento de comisiones netas debe ser alrededor de 20% este año y en adelante más en línea con la cartera."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 3Q 2025 amounted to Ps. 6.08 billion, a 25.3% growth, mainly explained by a larger number of employees, the variable compensation associated with our solid growth, and strategic initiatives. We expect expenses to grow around 20% for the full year. [..] In the last quarter, mostly it would be the incentives that we're going to pay for year end, given the very strong performance in all the subsidiaries.",
    "es": "Los gastos de operación del 3T25 fueron Ps. 6.08 mil millones, +25.3%, por más empleados, la compensación variable ligada al crecimiento y las iniciativas estratégicas. Esperamos que crezcan alrededor de 20% en el año. [..] En el último trimestre serán sobre todo los incentivos de fin de año, dado el desempeño tan fuerte de todas las subsidiarias."
   },
   "tax": {
    "who": "Mario Langarica (CFO)",
    "en": "You will notice a higher than average effective tax rate that is mainly related to ConCrédito's corporate restructure that we announced last year, specifically a deferred taxes event. Going forward, the effective tax rate for ConCrédito should be moving around 30%. [..] The [IPAB and write-off] tax reform effect is going to be marginal, probably around Ps. 40 to 50 million; the write-off change would be a matter of deferring the deduction.",
    "es": "Verán una tasa efectiva más alta que el promedio, ligada a la reestructura corporativa de ConCrédito anunciada el año pasado, específicamente un evento de impuestos diferidos. En adelante la tasa efectiva de ConCrédito debe moverse alrededor de 30%. [..] El efecto de la reforma fiscal [IPAB y castigos] será marginal, unos Ps. 40 a 50 millones; el cambio en castigos sólo difiere la deducción."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income amounted to Ps. 2.156 billion in 3Q 2025, growing 23%. Controlling net income amounted to Ps. 2.099 billion, an EPS of Ps. 1.33, 27.5% above 3Q 2024. As of September 2025, accumulated net income amounted to Ps. 6.485 billion, the highest nine-month figure in our history and already higher than the net income generated in 2024.",
    "es": "La utilidad neta del 3T25 fue Ps. 2,156 millones, +23%. La utilidad controladora fue Ps. 2,099 millones, una UPA de Ps. 1.33, 27.5% más que en el 3T24. A septiembre la utilidad acumulada fue Ps. 6,485 millones, la mayor de nueve meses en nuestra historia y ya mayor que la de todo 2024."
   },
   "eps": {
    "who": "Mario Langarica (CFO)",
    "en": "After these strong results, we expect to finalize the year at the high end of our EPS guidance, which is Ps. 5.15, around 36% higher than our 2024 EPS of Ps. 3.80. [..] In the last quarter we're expecting higher expenses and we are analyzing some strategic initiatives; that's why we're keeping the guidance.",
    "es": "Tras estos resultados esperamos cerrar el año en el techo de la guía de UPA, Ps. 5.15, alrededor de 36% arriba de los Ps. 3.80 de 2024. [..] En el último trimestre esperamos mayores gastos y analizamos iniciativas estratégicas; por eso mantenemos la guía."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Controlling ROE for 3Q 2025 amounted to 25.5%, above our original expectation, and for the nine-month period it stood at 25.9%. Very important to highlight that our three credit subsidiaries are showing ROE ratios for the nine-month period above 20%. [..] Capital: first, sufficient capital to support growth, which could include some improvement in pricing; second, potential inorganic initiatives; and a stable dividend payout policy. We will provide a clearer picture in February.",
    "es": "El ROE controlador del 3T25 fue 25.5%, por encima de lo esperado, y el de nueve meses 25.9%. Es muy importante que las tres subsidiarias de crédito muestran ROE de nueve meses por encima de 20%. [..] Capital: primero, suficiente para el crecimiento, lo que podría incluir mejoras de precio; segundo, iniciativas inorgánicas potenciales; y una política estable de dividendos. Daremos un panorama más claro en febrero."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "After a challenging 2024, Banco Compartamos Peru has recovered faster than expected, achieving a 9% portfolio growth in local currency with strong quality. [..] Net income grew from 45 million soles in the first nine months of 2024 to 189 million soles in the same period of 2025.",
    "es": "Tras un 2024 difícil, Banco Compartamos Perú se recuperó más rápido de lo esperado, con un crecimiento de cartera de 9% en moneda local y buena calidad. [..] La utilidad neta pasó de 45 millones de soles en los primeros nueve meses de 2024 a 189 millones de soles en el mismo periodo de 2025."
   },
   "clientsCred": {
    "who": "Mario Langarica (CFO)",
    "en": "As of September, we reached a historic record of 6.35 million people using our financial services, an increase of around 650,000 people and 11.4% growth compared to 3Q 2024. [..] EM: Insurance products have grown to 11% of total interest income; Aterna is already serving 16 million active insurance clients.",
    "es": "A septiembre alcanzamos un récord de 6.35 millones de personas usando nuestros servicios, unas 650,000 más y +11.4% contra el 3T24. [..] EM: Los seguros ya son 11% de los ingresos por intereses; Aterna atiende 16 millones de clientes de seguros activos."
   },
   "employees": {
    "who": "Mario Langarica (CFO)",
    "en": "We are in growth mode in ConCrédito and also in the bank; our model is hybrid, so we will be hiring people as it makes sense given our objectives to grow the portfolio. These hirings always have a multiplying effect on revenues.",
    "es": "Estamos en modo de crecimiento en ConCrédito y en el banco; el modelo es híbrido, así que contrataremos cuando tenga sentido para crecer la cartera. Estas contrataciones siempre tienen un efecto multiplicador en ingresos."
   }
  }
 },
 "2025Q4": {
  "date": "2026-02-25",
  "quarter": "2025Q4",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2025Q4-transcript-Gentera_4T25_earnings_call_transcript_2026-02-25.txt",
  "note": "FactSet CallStreet corrected transcript",
  "es": "Conferencia de resultados 4T25 (25 de febrero de 2026; transcripción FactSet CallStreet en inglés, citas traducidas)",
  "en": "4Q25 earnings call (25 February 2026; FactSet CallStreet transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Mario Langarica (CFO)",
    "en": "The strategic decisions we have taken in previous years have allowed Gentera to finalize the year with a historic loan portfolio of Ps. 93.6 billion, growing 13.1% compared to 2024. Our credit subsidiaries closed the year with double-digit growth in local currencies; special notice to Compartamos Peru that presented a strong recovery. [..] Loan portfolio growth [guidance for 2026] between 13% and 16%.",
    "es": "Las decisiones estratégicas de años anteriores permitieron a Gentera cerrar con una cartera histórica de Ps. 93.6 mil millones, +13.1% contra 2024. Las subsidiarias de crédito cerraron con crecimiento de doble dígito en moneda local; destaca la fuerte recuperación de Compartamos Perú. [..] Crecimiento de cartera [guía 2026] entre 13% y 16%."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "In Mexico, 42% of our portfolio is individual and 58% is group lending. In Peru, 53% of the portfolio is individual and 47% group lending. [..] In the following three to five years we would like to see a convergence of both markets, and have maybe two-thirds of the portfolio in individual lending products and one-third with the group lending methodology.",
    "es": "En México 42% de la cartera es individual y 58% grupal. En Perú 53% es individual y 47% grupal. [..] En los próximos tres a cinco años quisiéramos ver una convergencia de ambos mercados, con quizá dos tercios de la cartera en crédito individual y un tercio con la metodología grupal."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's 2025 interest income grew 20.3% versus 2024, reaching Ps. 48.4 billion; and net interest income grew 22.9% to Ps. 40.5 billion, following the solid growth in clients and portfolio. NIM amounted to 41% in 2025, a slight improvement compared to 2024's 39.8%. For 2026, we expect our NIM moving around 41% to 42%.",
    "es": "Los ingresos por intereses de 2025 crecieron 20.3% contra 2024, a Ps. 48.4 mil millones; el margen financiero creció 22.9% a Ps. 40.5 mil millones. La MIN fue 41% en 2025, una ligera mejora contra 39.8% en 2024. Para 2026 esperamos una MIN entre 41% y 42%."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "At the end of 2025, our cost of funds for Mexico is 7.9%, where the reference rate is 7%. And in Peru, we have a cost of funds of 4.9%, where the reference rate is 4.25%. We have been relying on variable rate funding for the last year. We think that now we're at probably the bottom or very close to the bottom of that rate reduction, and now we are going to be changing to have more fixed rate funding. We just did an issuance this year, coming back to long-term fixed rate bonds in Mexico.",
    "es": "Al cierre de 2025 el costo de fondeo en México es 7.9%, con tasa de referencia de 7%. En Perú es 4.9%, con referencia de 4.25%. El último año nos apoyamos en fondeo a tasa variable. Creemos que estamos en el piso o muy cerca del piso de la baja de tasas, y ahora cambiaremos hacia más fondeo a tasa fija. Este año ya hicimos una emisión de bonos de largo plazo a tasa fija en México."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Cost of risk for 2025 amounted to 13%, mainly explained by the mix, the growth and the asset quality of our portfolio. We feel comfortable with the observed level and we expect to maintain it around 13% for 2026. Provisions amounted to Ps. 11.2 billion, a 21.7% growth, and we finished the year with a 222% coverage ratio, compared to 209.5% in 2024. NIM after provisions 29.7% vs 28.7%; for 2026 around 30%.",
    "es": "El costo de riesgo de 2025 fue 13%, por la mezcla, el crecimiento y la calidad de la cartera. Nos sentimos cómodos y esperamos mantenerlo alrededor de 13% en 2026. Las provisiones fueron Ps. 11.2 mil millones, +21.7%, y cerramos con cobertura de 222% contra 209.5% en 2024. MIN después de provisiones 29.7% vs 28.7%; para 2026 alrededor de 30%."
   },
   "cor": {
    "who": "Mario Langarica (CFO)",
    "en": "We saw a little pickup in the last quarter [14.5%]. But we expect to be controlling and focusing a lot on making sure that asset quality keeps in line. We would expect to have NPLs around 4% for the year and cost of risk around 13%. [..] EM: In group lending our normal level should be moving around 10% to 11%; and individual should be moving around 15% to 16%.",
    "es": "Vimos un ligero repunte en el último trimestre [14.5%]. Pero estaremos controlando y enfocados en que la calidad de activos se mantenga. Esperaríamos cartera vencida alrededor de 4% en el año y costo de riesgo alrededor de 13%. [..] EM: En grupal el nivel normal se mueve alrededor de 10% a 11%; en individual alrededor de 15% a 16%."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 6.2 billion, compared to Ps. 4.65 billion in 2024, representing a 31.5% growth, mostly driven by the strong results of our insurance business that represents around 90% of the collected commissions. [..] For this year, we expect a normalization, more close to the growth of clients. The last couple of years in insurance were very successful because we launched new products and expanded the offering to family members of our clients.",
    "es": "Las comisiones netas fueron Ps. 6.2 mil millones contra Ps. 4.65 mil millones en 2024, +31.5%, por los resultados del negocio de seguros, alrededor de 90% de las comisiones cobradas. [..] Para este año esperamos una normalización, más cerca del crecimiento de clientes. Los últimos dos años en seguros fueron muy buenos porque lanzamos productos nuevos y ampliamos la oferta a familiares de los clientes."
   },
   "otherInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Other operating income is mostly driven by ConCrédito's participation of CrediTienda, and it should be a product that will be growing in the next years. It has been very successful and we think that we can keep growing there.",
    "es": "Otros ingresos de la operación vienen sobre todo de la participación de CrediTienda en ConCrédito, y deberían seguir creciendo en los próximos años. Ha sido muy exitoso y creemos que podemos seguir creciendo ahí."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 2025 amounted to Ps. 23.6 billion, a 19.3% increase compared to 2024. Worth highlighting in 4Q 2025 is that Banco Compartamos changed its methodology for potential tax contingencies, aligning it with practices used by other banks in Mexico, based on expected value applied to statistical scenarios. The calculation represented an effect amounting to Ps. 500 million, recorded in the operating expenses line in 4Q 2025. Operational expenses for 2026 should grow between 12% and 13%. [..] The 12% to 14% growth should take the efficiency ratio to around 65%, similar to 2025.",
    "es": "Los gastos de operación de 2025 fueron Ps. 23.6 mil millones, +19.3% contra 2024. Destaca en el 4T25 que Banco Compartamos cambió su metodología para contingencias fiscales potenciales, alineándola con la de otros bancos en México, con valor esperado sobre escenarios estadísticos. El cálculo representó un efecto de Ps. 500 millones registrado en gastos de operación en el 4T25. Los gastos de 2026 deben crecer entre 12% y 13%. [..] Ese crecimiento debe llevar el índice de eficiencia a alrededor de 65%, similar a 2025."
   },
   "tax": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2024 we communicated the corporate restructuring of ConCrédito. As a result, in 2025 and on a non-recurring basis, it was decided to generate a reserve related to the deferred tax assets due to the uncertainty of the future recovery, which later resulted in the cancellation of the deferred tax asset with an impact of Ps. 328 million in 4Q 2025. Excluding this effect, ConCrédito would have completed the year with a net income about Ps. 1 billion. [..] The tax rate for next year should move around 30%.",
    "es": "En 2024 comunicamos la reestructura corporativa de ConCrédito. Como resultado, en 2025 y de forma no recurrente, se decidió crear una reserva sobre los activos por impuesto diferido por la incertidumbre de su recuperación, que después derivó en la cancelación del activo diferido con un impacto de Ps. 328 millones en el 4T25. Sin ese efecto, ConCrédito habría cerrado el año con una utilidad de alrededor de Ps. 1,000 millones. [..] La tasa de impuestos del próximo año debe moverse alrededor de 30%."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2025, our net income amounted to Ps. 8.5 billion, a historic record, growing 31.8% compared to 2024. Gentera's controlling participation amounted to Ps. 8.2 billion, representing an EPS of Ps. 5.20 for the year, above our original guidance, and 36.8% above 2024 EPS of Ps. 3.80. [..] Net income growth [guidance for 2026] between 13% and 16%, representing an EPS between Ps. 5.88 and Ps. 6.03.",
    "es": "En 2025 la utilidad neta fue Ps. 8.5 mil millones, récord histórico, +31.8% contra 2024. La participación controladora fue Ps. 8.2 mil millones, una UPA de Ps. 5.20, por encima de la guía original y 36.8% arriba de los Ps. 3.80 de 2024. [..] Crecimiento de utilidad neta [guía 2026] entre 13% y 16%, una UPA entre Ps. 5.88 y Ps. 6.03."
   },
   "eps": {
    "who": "Mario Langarica (CFO)",
    "en": "This guidance also includes three very important initiatives: improvements in the commercial proposal for our customers in the second half of 2026; increasing the contribution of net income from 2% to 3% to Fundación Compartamos; and proposing to our shareholders meeting to increase the maximum limit of our dividend payout from 40% to 45%. [..] The earnings before taxes that we're planning for the year will be around 13% [growth] with a tax rate of 30%.",
    "es": "Esta guía incluye tres iniciativas muy importantes: mejoras en la propuesta comercial a los clientes en el segundo semestre de 2026; subir la contribución de utilidad neta a Fundación Compartamos de 2% a 3%; y proponer a la asamblea elevar el límite máximo de pago de dividendos de 40% a 45%. [..] La utilidad antes de impuestos que planeamos crece alrededor de 13% con una tasa de 30%."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for 2025 stood at 24.8%, also above our original expectation for the year, the best level achieved in the past 10 years. For 2026, we expect controlling ROE to be between 24% and 25%. [..] We think that 2024 or 2025 ROE should be the level we should be focusing on for the next three years, even after doing these three initiatives.",
    "es": "El ROE controlador de 2025 fue 24.8%, también por encima de la expectativa original y el mejor nivel en 10 años. Para 2026 esperamos un ROE controlador entre 24% y 25%. [..] Creemos que el ROE de 2024 o 2025 debe ser el nivel en que nos enfoquemos los próximos tres años, aun después de estas tres iniciativas."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "Peru surpassed our plan and our expectation. We had a great year; the behavior of asset quality was excellent since the beginning of the year. We have always said that we want all our subsidiaries to have a stable ROE above 20%, so we reached that level in Peru before than expected. [..] EM: In Peru, 54% of the 14 million people in our segment have a formal credit; group lending has a very large potential, and both products in rural areas.",
    "es": "Perú superó el plan y nuestras expectativas. Tuvimos un gran año; la calidad de activos fue excelente desde el inicio. Siempre hemos dicho que queremos que todas las subsidiarias tengan un ROE estable por encima de 20%, y en Perú lo alcanzamos antes de lo esperado. [..] EM: En Perú, 54% de los 14 millones de personas de nuestro segmento tienen crédito formal; el crédito grupal tiene un potencial muy grande, y ambos productos en zonas rurales."
   },
   "niCC": {
    "who": "Mario Langarica (CFO)",
    "en": "Excluding this effect [the Ps. 328 million deferred-tax cancellation], ConCrédito would have completed the year with a net income about Ps. 1 billion, in line with our original business expectation. [..] Regarding the new methodology for reserves for potential fiscal contingencies, the most relevant is the litigation that we are going through right now; we expect a sentence hopefully in the first half of the year.",
    "es": "Sin ese efecto [la cancelación de Ps. 328 millones de impuesto diferido], ConCrédito habría cerrado el año con una utilidad de alrededor de Ps. 1,000 millones, en línea con la expectativa original. [..] Sobre la nueva metodología de reservas por contingencias fiscales, lo más relevante es el litigio en curso; esperamos sentencia en el primer semestre del año."
   },
   "clientsCred": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2025, we reached a new milestone of 6.5 million people using our financial services, adding 684,000 people in a year, with an 11.8% growth compared to 2024. [..] EM: Now we have more than 1 million customers using our mobile banking. [..] From the 50 million people in our segment in Mexico, 36% have a formal credit.",
    "es": "En 2025 llegamos a 6.5 millones de personas usando nuestros servicios, 684,000 más en un año, +11.8% contra 2024. [..] EM: Ya tenemos más de 1 millón de clientes usando la banca móvil. [..] De los 50 millones de personas de nuestro segmento en México, 36% tienen crédito formal."
   },
   "eqAssets": {
    "who": "Mario Langarica (CFO)",
    "en": "With the capital that we accumulate, we have a very clear guide: number one, organic growth; second, new initiatives and investments; third, if we see an opportunity for M&A we could do it, but we don't see it in the proximity; and the last is to share part of the value with our shareholders, proposing to increase the dividend payout to 45%.",
    "es": "Con el capital que acumulamos la guía es clara: uno, crecimiento orgánico; dos, nuevas iniciativas e inversiones; tres, si vemos una oportunidad de fusiones y adquisiciones podríamos tomarla, pero no la vemos cerca; y por último, compartir parte del valor con los accionistas, proponiendo subir el pago de dividendos a 45%."
   }
  }
 },
 "2026Q1": {
  "date": "2026-04-23",
  "quarter": "2026Q1",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2026Q1-transcript-Gentera_1T26_earnings_call_transcript_2026-04-23.txt",
  "note": "Bloomberg final transcript",
  "es": "Conferencia de resultados 1T26 (23 de abril de 2026; transcripción final de Bloomberg en inglés, citas traducidas)",
  "en": "1Q26 earnings call (23 April 2026; Bloomberg final transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Mario Langarica (CFO)",
    "en": "Our loan portfolio has grown 14.7% annually compared to 1Q '26, reaching a historic amount of Ps. 94.8 billion. Our three credit subsidiaries delivered double-digit annual growth in local currency. We maintain our objective to deliver an annual portfolio growth between 13% to 16%.",
    "es": "La cartera creció 14.7% anual contra el 1T25, a un monto histórico de Ps. 94.8 mil millones. Las tres subsidiarias de crédito crecieron a doble dígito en moneda local. Mantenemos el objetivo de crecer la cartera entre 13% y 16% en el año."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "2025 was a year of strong growth: we grew 33% the [individual lending] portfolio. As a result, we are now seeing, as a natural effect, that growth now needs a more strict control. So we are adjusting our origination rules. New loan officers are still gaining experience. [..] We expect to start reversing the trend by the third quarter and normalize these levels by the end of the year.",
    "es": "2025 fue un año de fuerte crecimiento: la cartera [individual] creció 33%. Como efecto natural, ese crecimiento ahora exige un control más estricto, así que ajustamos las reglas de originación. Los nuevos oficiales de crédito siguen ganando experiencia. [..] Esperamos revertir la tendencia hacia el tercer trimestre y normalizar los niveles al cierre del año."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's interest income had a 13.4% growth in 1Q '26 compared to 1Q '25, amounting to Ps. 12.7 billion, following the growth of our portfolio and our clients. Financing expenses decreased 6.7% following the reductions in reference rates. Therefore, net interest income grew 15.7% to Ps. 10.8 billion. NIM amounted to 40% and we expect NIM to be around 41% by the end of the year.",
    "es": "Los ingresos por intereses crecieron 13.4% en el 1T26 contra el 1T25, a Ps. 12.7 mil millones, siguiendo el crecimiento de cartera y clientes. Los gastos de financiamiento bajaron 6.7% por las reducciones de tasas de referencia. Así, el margen financiero creció 15.7% a Ps. 10.8 mil millones. La MIN fue 40% y esperamos alrededor de 41% al cierre del año."
   },
   "finMargin": {
    "who": "Mario Langarica (CFO)",
    "en": "Part of [the NIM pressure] has to do with the seasonality and the cash position that we have today. [..] The two drivers [of net interest income] are portfolio growth and the mix, and we will also be observing a little better performance of interest expenses given the recent reduction of Banxico.",
    "es": "Parte de [la presión en la MIN] tiene que ver con la estacionalidad y la posición de efectivo que tenemos hoy. [..] Los dos impulsores [del margen financiero] son el crecimiento de la cartera y la mezcla, y también veremos un mejor desempeño de los gastos por intereses por la reciente baja de Banxico."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "We have observed a higher level of 4.13% consolidated NPLs, driven by an increase in NPLs to 4.86% at Banco Compartamos Mexico. These effects resulted from our last year's decision to accelerate our clients and portfolio growth. [..] Provisions for loan losses amounted to Ps. 3.03 billion, 26.1% growth, in line with the growth of the portfolio, its asset quality and its mix. NIM after provisions amounted to 28.8%, and we maintain our view that this KPI will be around 30% by the end of the year.",
    "es": "Observamos una cartera vencida consolidada más alta, 4.13%, por el aumento a 4.86% en Banco Compartamos México, efecto de la decisión del año pasado de acelerar el crecimiento en clientes y cartera. [..] Las provisiones fueron Ps. 3.03 mil millones, +26.1%, en línea con el crecimiento, la calidad y la mezcla de la cartera. La MIN después de provisiones fue 28.8% y mantenemos la expectativa de alrededor de 30% al cierre del año."
   },
   "cor": {
    "who": "Mario Langarica (CFO)",
    "en": "At this moment, we expect to consolidate levels of NPLs around 4% and cost of risk to be moving closer to the high end of the 13% to 13.5% range that we consider normal by the end of 2026. [..] Part of the improvement in provisions this quarter has to do with the better early NPLs that we're observing in the new placements.",
    "es": "En este momento esperamos consolidar niveles de cartera vencida alrededor de 4% y un costo de riesgo más cerca del techo del rango de 13% a 13.5% que consideramos normal al cierre de 2026. [..] Parte de la mejora en provisiones este trimestre se debe a la mejor mora temprana que observamos en las nuevas colocaciones."
   },
   "coverage": {
    "who": "Enrique Majós (CEO)",
    "en": "There is a factor in the numerator and denominator, allowances and NPLs. The NPLs that we have at the bank level are now increasing because they are old NPLs. Once we start to write off those NPLs, and with the additional provisions that we will make in the coming quarters, the coverage ratio at the bank level will reach around 200%, which will take Gentera to 210% to 220%.",
    "es": "Hay un factor en el numerador y en el denominador, reservas y cartera vencida. La cartera vencida del banco está subiendo porque es mora antigua. Cuando empecemos a castigarla, y con las provisiones adicionales de los próximos trimestres, la cobertura del banco llegará a alrededor de 200%, lo que llevará a Gentera a 210%–220%."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 1.587 billion in 1Q '26, growing 18.3% compared to the same quarter last year, mostly driven by the growth of our insurance business. [..] We expect that growth to normalize, following the growth of clients, which is somewhere around 12%.",
    "es": "Las comisiones netas fueron Ps. 1,587 millones en el 1T26, +18.3% contra el mismo trimestre del año pasado, impulsadas por el negocio de seguros. [..] Esperamos que ese crecimiento se normalice hacia el crecimiento de clientes, alrededor de 12%."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 1Q '26 amounted to Ps. 6 billion, representing a 10.5% [increase] compared to 1Q '25. We expect that by the end of the year we will maintain the range guided between 12% to 13% for this line. [..] EM: This quarter we reached the best efficiency ratio we have had in the past eight years.",
    "es": "Los gastos de operación del 1T26 fueron Ps. 6 mil millones, +10.5% contra el 1T25. Esperamos cerrar el año dentro del rango guiado de 12% a 13% para esta línea. [..] EM: Este trimestre alcanzamos el mejor índice de eficiencia de los últimos ocho años."
   },
   "tax": {
    "who": "Mario Langarica (CFO)",
    "en": "Regarding the deferred taxes compared to last year, there will not be an additional effect this year. And we feel comfortable with the Ps. 500 million reserve [for legal and tax contingencies] that we created at the bank after changing the methodology; we will see by the end of the year if there is a need to move it up or down.",
    "es": "Sobre los impuestos diferidos del año pasado, no habrá un efecto adicional este año. Y nos sentimos cómodos con la reserva de Ps. 500 millones [por contingencias legales y fiscales] que creamos en el banco al cambiar la metodología; al cierre del año veremos si hay que moverla."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income reached another historic quarter record amounting to Ps. 2.494 billion, growing 12.3% compared to last year, and Gentera's controlling participation amounted to Ps. 2.429 billion, growing 15.3%, implying an EPS for the quarter of Ps. 1.54, 15% above 1Q '25 EPS.",
    "es": "La utilidad neta alcanzó otro récord trimestral: Ps. 2,494 millones, +12.3% contra el año pasado; la participación controladora fue Ps. 2,429 millones, +15.3%, una UPA trimestral de Ps. 1.54, 15% arriba del 1T25."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "Our performance is in line with the guidance we set for the year. [..] We reaffirm our commitment to our business plan and we expect to deliver on our guidance and growth targets for 2026. [..] The proposals presented at the April 10 meeting regarding the increase up to 45% of the dividend payout and up to 3% of the contribution to Fundación Compartamos did not obtain the necessary votes; our Board resolved to call an Extraordinary Shareholders Meeting this coming June.",
    "es": "Nuestro desempeño está en línea con la guía del año. [..] Reafirmamos el compromiso con el plan de negocio y esperamos cumplir la guía y las metas de crecimiento de 2026. [..] Las propuestas presentadas en la asamblea del 10 de abril de subir el pago de dividendos hasta 45% y la contribución a Fundación Compartamos hasta 3% no obtuvieron los votos necesarios; el consejo resolvió convocar una asamblea extraordinaria en junio."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE stood at 26.5%, above our original expectation for the year and the best ROE for a quarter since 2017. For 2026, we should expect Gentera's controlling ROE to move around 25%.",
    "es": "El ROE controlador fue 26.5%, por encima de la expectativa original y el mejor ROE trimestral desde 2017. Para 2026 esperamos un ROE controlador alrededor de 25%."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "Banco Compartamos Peru and ConCrédito have shown very good levels of asset quality. [..] EM: In Peru, since 2024 we had already deployed the digital platform and we have had very good results there.",
    "es": "Banco Compartamos Perú y ConCrédito muestran muy buenos niveles de calidad de activos. [..] EM: En Perú la plataforma digital está desplegada desde 2024 y ha dado muy buenos resultados."
   },
   "clientsCred": {
    "who": "Mario Langarica (CFO)",
    "en": "In 1Q '26, we reached a new milestone of 6.6 million people actively using our financial services, adding 674,000 people, representing 11.4% growth compared to 1Q '25. [..] EM: Our client retention rate is above 85%. [..] For individual lending we are in Mexico at 155 customers per loan officer and we expect to get to around 200; for group lending we are around 350 and we believe we can get over 400.",
    "es": "En el 1T26 alcanzamos 6.6 millones de personas usando activamente nuestros servicios, 674,000 más, +11.4% contra el 1T25. [..] EM: La retención de clientes supera 85%. [..] En crédito individual en México estamos en 155 clientes por oficial y esperamos llegar a unos 200; en grupal estamos en unos 350 y creemos que podemos superar 400."
   },
   "avgBal": {
    "who": "Mario Langarica (CFO)",
    "en": "Group lending has lower risk but higher costs, and vice versa with individual lending. [..] NIM is a little better in group lending.",
    "es": "El crédito grupal tiene menor riesgo pero mayores costos, y viceversa en el individual. [..] La MIN es un poco mejor en grupal."
   }
  }
 },
 "2026Q2": {
  "date": "2026-07-23",
  "quarter": "2026Q2",
  "kind": "transcript",
  "file": "tools/gentera/raw/text/transcripts/2026Q2-transcript-Gentera_2T26_earnings_call_transcript_2026-07-23.txt",
  "note": "Bloomberg final transcript",
  "es": "Conferencia de resultados 2T26 (23 de julio de 2026; transcripción final de Bloomberg en inglés, citas traducidas)",
  "en": "2Q26 earnings call (23 July 2026; Bloomberg final transcript, quotes in the original English)",
  "quotes": {
   "loans": {
    "who": "Enrique Majós (CEO)",
    "en": "After incorporating the impact of these adjustments into our projections, we are revising Gentera's loan portfolio growth guidance, and now we expect to close the year with a portfolio growth in the range of 6% to 9%. [..] These adjustments primarily reflect the slowdown in the consumer economy in Mexico, which could affect our customers' payment capacity, and the stabilization of the quality of our individual loan portfolio in Mexico after a long period of sustained growth. [..] ML: Very important to note is that Gentera's average portfolio for the year will be around 10% higher than in 2025.",
    "es": "Tras incorporar el impacto de estos ajustes en las proyecciones, revisamos la guía de crecimiento de cartera y ahora esperamos cerrar el año con un crecimiento de 6% a 9%. [..] Los ajustes reflejan sobre todo la desaceleración del consumo en México, que podría afectar la capacidad de pago de nuestros clientes, y la estabilización de la calidad de la cartera individual en México tras un largo periodo de crecimiento. [..] ML: Es muy importante notar que la cartera promedio del año será alrededor de 10% mayor que en 2025."
   },
   "loansMX": {
    "who": "Enrique Majós (CEO)",
    "en": "Four years ago, we were around Ps. 3 billion in the [individual] portfolio. Today, we are around Ps. 19 billion, and yet we have a market share of a little bit less than 40%. [..] Between 2011 and 2012 our individual portfolio grew like three times, and between 2014 and 2016 it doubled; in both cases NPL levels increased, to 7.9% and 5.8%. Today, after growing this portfolio approximately five times since 2021, our ratio stands at 6.5%. Consequently, we have decided to moderate the growth while implementing the corrective measures. [..] ML: Banco Compartamos Mexico growing single digits [in 2026]; group lending grew almost 17% in the first semester.",
    "es": "Hace cuatro años la cartera [individual] era de unos Ps. 3 mil millones; hoy ronda Ps. 19 mil millones y aun así tenemos una participación de poco menos de 40%. [..] Entre 2011 y 2012 la cartera individual se triplicó y entre 2014 y 2016 se duplicó; en ambos casos la cartera vencida subió, a 7.9% y 5.8%. Hoy, tras multiplicarla por cinco desde 2021, el índice está en 6.5%. Por eso decidimos moderar el crecimiento mientras aplicamos las medidas correctivas. [..] ML: Banco Compartamos México crecerá a un dígito [en 2026]; el crédito grupal creció casi 17% en el primer semestre."
   },
   "loansPE": {
    "who": "Enrique Barrera (IR)",
    "en": "Year-to-year growth in the individual lending in Peru has been 12% with a 3.2% NPLs, and our group lending portfolio has experienced a growth of 7% with a 3.3% NPL. [..] El Niño is something that we are very aware of; we have provisions considered. ML: We have voluntary provisions in Peru above IFRS provisions that we feel comfortable with. [..] In Peru, double digit [growth] is [maintained].",
    "es": "El crédito individual en Perú creció 12% anual con 3.2% de cartera vencida, y el grupal 7% con 3.3%. [..] El Niño es algo que tenemos muy presente; tenemos provisiones consideradas. ML: En Perú tenemos provisiones voluntarias por encima de las de IFRS con las que nos sentimos cómodos. [..] En Perú se mantiene el [crecimiento de] doble dígito."
   },
   "loansCC": {
    "who": "Enrique Majós (CEO)",
    "en": "ConCrédito is really performing very well and as expected; this 15% [growth] is in line with projections. We want our empresarias to become more mature; the loans that more mature empresarias disburse are better loans in terms of quality, and they are increasing the ticket. [..] EB: CrediTienda is growing around 27% year-on-year.",
    "es": "ConCrédito va muy bien y como esperábamos; ese 15% [de crecimiento] está en línea con las proyecciones. Queremos empresarias más maduras: sus créditos son de mejor calidad y con mayor ticket. [..] EB: CrediTienda crece alrededor de 27% anual."
   },
   "intInc": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2Q26, Gentera's interest income grew 9.8% compared to 2Q25, amounting to Ps. 12.96 billion following the observed growth in portfolio and clients. Given the fact that the average portfolio for the year will be above 10%, we expect that NII should also grow at the same rate.",
    "es": "En el 2T26 los ingresos por intereses crecieron 9.8% contra el 2T25, a Ps. 12.96 mil millones, siguiendo el crecimiento de cartera y clientes. Como la cartera promedio del año crecerá más de 10%, esperamos que el margen financiero crezca a ese mismo ritmo."
   },
   "intExp": {
    "who": "Mario Langarica (CFO)",
    "en": "Financing expenses decreased 9.9%, mainly driven by the reduction in reference interest rates in Mexico. Therefore, net interest income grew 13.9% to around Ps. 11.1 billion. NIM amounted to 41.2% in 2Q26. For year-end, we expect NIM to move around 41%.",
    "es": "Los gastos de financiamiento bajaron 9.9%, sobre todo por la reducción de las tasas de referencia en México. Así, el margen financiero creció 13.9% a unos Ps. 11.1 mil millones. La MIN fue 41.2% en el 2T26. Para el cierre esperamos una MIN alrededor de 41%."
   },
   "prov": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's 2Q provision for loan losses amounted to Ps. 2.43 billion [sic; Ps. 3.44 billion in the release], a 29.7% growth, in line with its current asset quality and its loan portfolio mix and growth. NIM after provisions amounted to 28.5%, similar to the 28.8% of 1Q26; we expect this ratio to be between 29% and 30% by the end of the year. [..] Write-offs will continue being higher, but we hope stable in the next quarters, until we empty all of the write-offs we have to empty because of the increased risk observed in these quarters.",
    "es": "Las provisiones del 2T fueron Ps. 2.43 mil millones [sic; Ps. 3.44 mil millones en el informe], +29.7%, en línea con la calidad de activos y la mezcla y crecimiento de la cartera. La MIN después de provisiones fue 28.5%, similar al 28.8% del 1T26; esperamos entre 29% y 30% al cierre. [..] Los castigos seguirán altos, aunque esperamos que estables en los próximos trimestres, hasta vaciar los que corresponden al mayor riesgo observado en estos trimestres."
   },
   "cor": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's cost of risk for the first semester amounted to 13.7%. We have seen stabilization trends due to the actions deployed particularly in Banco Compartamos Mexico: reinforcing origination, monitoring and collection processes, adjusting the incentives program, strengthening our sales force, fine-tuning training and targeting strategies. [..] For year end, we expect that consolidated NPLs should be moving around 4%, maybe a little higher, and consolidated cost of risk around 13.5%. It obviously has a lag; in two quarters we're going to be seeing things normalized.",
    "es": "El costo de riesgo del primer semestre fue 13.7%. Vemos tendencias de estabilización por las acciones desplegadas sobre todo en Banco Compartamos México: reforzar originación, monitoreo y cobranza, ajustar incentivos, fortalecer la fuerza de ventas, afinar capacitación y focalización. [..] Para el cierre esperamos cartera vencida consolidada alrededor de 4%, quizá un poco más, y costo de riesgo alrededor de 13.5%. Tiene rezago; en dos trimestres veremos las cosas normalizadas."
   },
   "netFees": {
    "who": "Mario Langarica (CFO)",
    "en": "Net fees amounted to Ps. 1.6 billion in 2Q, growing 14.2% compared to 2Q25, mostly driven by the growth of our insurance business. [..] EB: More or less 90% of the fee income line comes from the insurance business; fee expenses come mostly from the use of third-party channels. In ConCrédito the insurance business is reflected in other operating income.",
    "es": "Las comisiones netas fueron Ps. 1.6 mil millones en el 2T, +14.2% contra el 2T25, impulsadas por el negocio de seguros. [..] EB: Alrededor de 90% de las comisiones cobradas viene de seguros; las comisiones pagadas provienen sobre todo del uso de canales de terceros. En ConCrédito el negocio de seguros se refleja en otros ingresos de la operación."
   },
   "opex": {
    "who": "Mario Langarica (CFO)",
    "en": "Operational expenses for 2Q26 amounted to Ps. 6.19 billion, representing a 7.7% increase compared to 2Q25. The modernization initiatives and investments in technology have allowed the adjustment of the operational expenses growth for the year to move around 10%. [..] Our plans are to bring the efficiency ratio below 60% in a couple of years, hopefully.",
    "es": "Los gastos de operación del 2T26 fueron Ps. 6.19 mil millones, +7.7% contra el 2T25. Las iniciativas de modernización e inversiones en tecnología permiten ajustar el crecimiento de gastos del año a alrededor de 10%. [..] El plan es llevar el índice de eficiencia por debajo de 60% en un par de años."
   },
   "netInc": {
    "who": "Mario Langarica (CFO)",
    "en": "Net income reached the second-best quarter ever, amounting to Ps. 2.353 billion in 2Q26, growing 11.6% compared to the same period last year. Controlling net income amounted to Ps. 2.284 billion, growing 8.5%, implying an EPS of Ps. 1.45. The net income Gentera generated in the first six months of '26 was the best first half ever.",
    "es": "La utilidad neta fue el segundo mejor trimestre de la historia: Ps. 2,353 millones en el 2T26, +11.6% contra el mismo periodo del año pasado. La utilidad controladora fue Ps. 2,284 millones, +8.5%, una UPA de Ps. 1.45. La utilidad de los primeros seis meses de 2026 es la mejor de cualquier primer semestre."
   },
   "eps": {
    "who": "Enrique Majós (CEO)",
    "en": "The good news is that we are maintaining our EPS growth guidance of 13% to 16%. We expect to achieve this by maintaining the expected growth of our other products and subsidiaries, together with the efficiencies captured and the strong expense discipline. [..] ML: When we decided to increase the payout from 40 to 45, that was a medium-term strategy; for next year, we will present to our shareholders' meeting again the proposal to increase to 45.",
    "es": "La buena noticia es que mantenemos la guía de crecimiento de UPA de 13% a 16%. Esperamos lograrlo con el crecimiento esperado de los demás productos y subsidiarias, las eficiencias capturadas y la disciplina de gastos. [..] ML: Subir el pago de dividendos de 40 a 45 era una estrategia de mediano plazo; el próximo año presentaremos de nuevo la propuesta de 45% a la asamblea."
   },
   "roe": {
    "who": "Mario Langarica (CFO)",
    "en": "Gentera's controlling ROE for 2Q26 stood at 24.5%, in line with our original expectation for the year. For the full year of '26, we should expect Gentera's controlling ROE to move between 24% and 25%. [..] Double-digit growth in portfolio, double-digit growth in earnings with ROEs above 23%, 23%–24%, and still with a very strong capitalization: as you described it, is exactly what we're thinking.",
    "es": "El ROE controlador del 2T26 fue 24.5%, en línea con la expectativa original. Para todo 2026 esperamos un ROE controlador entre 24% y 25%. [..] Crecimiento de doble dígito en cartera y utilidades con ROE por encima de 23%, 23%–24%, y capitalización muy fuerte: tal como lo describió, es exactamente lo que pensamos."
   },
   "niPE": {
    "who": "Mario Langarica (CFO)",
    "en": "We should aim to have an ROE above 20% [in Peru]; 25% was a great period, but something between 20% and around 23% should be sustainable. [..] Even though there has been a little pickup [in Peru's NPLs], it's performing better than expected; for the year end we should expect NPLs around 5% or so and cost of risk around 8.8%, below our original expectations for the year.",
    "es": "Debemos aspirar a un ROE por encima de 20% [en Perú]; 25% fue un gran periodo, pero algo entre 20% y alrededor de 23% debería ser sostenible. [..] Aunque hubo un ligero repunte [en la cartera vencida de Perú], se comporta mejor de lo esperado; para el cierre esperamos cartera vencida alrededor de 5% y costo de riesgo alrededor de 8.8%, por debajo de la expectativa original."
   },
   "clientsCred": {
    "who": "Mario Langarica (CFO)",
    "en": "In 2Q26, we reached a new record of 6.79 million people actively using our financial services, adding 657,000 people and growing 10.7% compared to 2Q25. [..] EM: We have observed that our customers are renewing their loans more cautiously and requesting smaller loan amounts, recognizing a more challenging economic environment; we see this as a positive sign.",
    "es": "En el 2T26 alcanzamos un récord de 6.79 millones de personas usando activamente nuestros servicios, 657,000 más, +10.7% contra el 2T25. [..] EM: Observamos que nuestros clientes renuevan sus créditos con más cautela y piden montos menores ante un entorno más difícil; lo vemos como una señal positiva."
   },
   "avgBal": {
    "who": "Mario Langarica (CFO)",
    "en": "The P&L equation is basically the same: individual lending starts with higher tickets, rates are typically lower than group lending, risk is higher, but at the expense level it can be more efficiently managed. Both products are very profitable.",
    "es": "La ecuación del estado de resultados es básicamente la misma: el crédito individual parte de tickets mayores, tasas típicamente menores que el grupal, mayor riesgo, pero un manejo más eficiente en gastos. Ambos productos son muy rentables."
   }
  }
 }
};
return {
 "updatedAt": "2026-09-25",
 "periods": {
  "2023M9": {
   "call": CALLS["2023Q3"],
   "source": "Earnings call 2023Q3"
  },
  "2023Q3": {
   "call": CALLS["2023Q3"],
   "source": "Earnings call 2023Q3"
  },
  "2023Q4": {
   "call": CALLS["2023Q4"],
   "source": "Earnings call 2023Q4"
  },
  "FY2023": {
   "call": CALLS["2023Q4"],
   "source": "Earnings call 2023Q4"
  },
  "2024M6": {
   "call": CALLS["2024Q2"],
   "source": "Earnings call 2024Q2"
  },
  "2024M9": {
   "call": CALLS["2024Q3"],
   "source": "Earnings call 2024Q3"
  },
  "2024Q1": {
   "call": CALLS["2024Q1"],
   "source": "Earnings call 2024Q1"
  },
  "2024Q2": {
   "call": CALLS["2024Q2"],
   "source": "Earnings call 2024Q2"
  },
  "2024Q3": {
   "call": CALLS["2024Q3"],
   "source": "Earnings call 2024Q3"
  },
  "2024Q4": {
   "call": CALLS["2024Q4"],
   "source": "Earnings call 2024Q4"
  },
  "FY2024": {
   "call": CALLS["2024Q4"],
   "source": "Earnings call 2024Q4"
  },
  "2025M6": {
   "call": CALLS["2025Q2"],
   "source": "Earnings call 2025Q2"
  },
  "2025M9": {
   "call": CALLS["2025Q3"],
   "source": "Earnings call 2025Q3"
  },
  "2025Q1": {
   "call": CALLS["2025Q1"],
   "source": "Earnings call 2025Q1"
  },
  "2025Q2": {
   "call": CALLS["2025Q2"],
   "source": "Earnings call 2025Q2"
  },
  "2025Q3": {
   "call": CALLS["2025Q3"],
   "source": "Earnings call 2025Q3"
  },
  "2025Q4": {
   "call": CALLS["2025Q4"],
   "source": "Earnings call 2025Q4"
  },
  "FY2025": {
   "lines": {
    "intInc": {
     "es": "+20.3%: cartera bruta promedio ~19% mayor con la tasa activa combinada estable alrededor de 56%.",
     "en": "+20.3%: average gross loans ~19% higher with the blended yield stable around 56%."
    },
    "intExp": {
     "es": "+8.3%: gastos por financiamiento planos (+0.2%) porque los recortes de tasa compensaron el crecimiento de saldos; cargos de originación y arrendamiento +29.4% con el volumen desembolsado.",
     "en": "+8.3%: funding cost flat (+0.2%) as rate cuts offset balance growth; origination and lease charges +29.4% with disbursement volume."
    },
    "finMargin": {
     "es": "+22.9%; MIN anual reportada por Gentera 41.0% vs 39.8% al dejar de subir el costo de fondeo (la fila muestra el promedio de los cuatro trimestres: 41.2% vs 40.0%).",
     "en": "+22.9%; Gentera's reported annual NIM 41.0% vs 39.8% as funding cost stopped rising (the row shows the four-quarter average: 41.2% vs 40.0%)."
    },
    "prov": {
     "es": "+21.7%; costo de riesgo 13.0% vs 12.9%; etapa 3 al cierre 3.83% vs 3.93%, así que el aumento es volumen más una mayor mezcla de crédito individual.",
     "en": "+21.7%; cost of risk 13.0% vs 12.9%; year-end stage-3 3.83% vs 3.93%, so the increase is volume plus a bigger individual-loan mix."
    },
    "finMarginAdj": {
     "es": "+23.4%, ligeramente por encima del margen porque las provisiones crecieron menos que los ingresos.",
     "en": "+23.4%, slightly ahead of the margin as provisions grew below revenue."
    },
    "feesCh": {
     "es": "+27.5%: Aterna colocó ~134.5M de pólizas en 2025; comisiones pagadas −3.9%; comisiones netas +31.5% a Ps. 6,117M.",
     "en": "+27.5%: Aterna placed ~134.5M policies in 2025; fees paid −3.9%; net fees +31.5% to Ps. 6,117M."
    },
    "otherInc": {
     "es": "+63.9%: cuentas por cobrar de CrediTienda +52% y ganancias no recurrentes en el 1T25.",
     "en": "+63.9%: CrediTienda receivables +52% and non-recurring gains in 1Q25."
    },
    "totOpInc": {
     "es": "+24.6%: margen +22.9%, comisiones netas +31.5%, otros ingresos +64%.",
     "en": "+24.6%: margin +22.9%, net fees +31.5%, other income +64%."
    },
    "opex": {
     "es": "+19.3% (la base del 4T24 ya traía +27.5%); el índice de eficiencia mejoró a 64.9% desde 68.2% porque los ingresos crecieron más rápido.",
     "en": "+19.3% (4Q24 base was itself +27.5%); efficiency ratio improved to 64.9% from 68.2% as revenue grew faster."
    },
    "opRes": {
     "es": "+38.9%: ingresos +25% contra gastos +19% y provisiones +22%.",
     "en": "+38.9%: 25% revenue growth on 19% opex growth and 22% provision growth."
    },
    "tax": {
     "es": "+55.6%; tasa efectiva 33.5% vs 29.9%, inflada por la cancelación no recurrente de Ps. 328M del activo por impuesto diferido de ConCrédito en el 4T25.",
     "en": "+55.6%; effective rate 33.5% vs 29.9%, inflated by the non-recurring Ps. 328M write-down of ConCrédito's deferred tax asset in 4Q25."
    },
    "netInc": {
     "es": "+31.8% a Ps. 8,520M; ROAE 24.9% vs 21.4%, ROAA 7.6% vs 6.8%.",
     "en": "+31.8% to Ps. 8,520M; ROAE 24.9% vs 21.4%, ROAA 7.6% vs 6.8%."
    },
    "niMX": {
     "es": "+20.8% a Ps. 5,739M: margen +22%, costo de fondeo a 7.9% desde 10.2% al cierre del año.",
     "en": "+20.8% to Ps. 5,739M: margin +22%, cost of funds down to 7.9% from 10.2% at year-end."
    },
    "niPE": {
     "es": "Ps. 1,440M vs Ps. 397M: año de recuperación de Perú, resultado de la operación +257% con mayor margen y menores provisiones tras la limpieza de 2024.",
     "en": "Ps. 1,440M vs Ps. 397M: Perú's turnaround year, operating result up 257% on a wider margin and lower provisions after the 2024 clean-up."
    },
    "niCC": {
     "es": "Ps. 676M vs Ps. 1,038M (−34.9%): pérdida de Ps. 72M en el 4T25 por la cancelación de Ps. 328M del impuesto diferido tras la reestructura corporativa de 2024; etapa 3 2.68%.",
     "en": "Ps. 676M vs Ps. 1,038M (−34.9%): 4Q25 loss of Ps. 72M from the Ps. 328M deferred-tax write-down after the 2024 corporate restructuring; stage-3 2.68%."
    },
    "niCtrl": {
     "es": "+36.8% a Ps. 8,215M contra +31.8% consolidado: la participación minoritaria bajó a Ps. 305M desde Ps. 457M tras la compra en junio de 2025 del 25.1% restante de ConCrédito.",
     "en": "+36.8% to Ps. 8,215M vs +31.8% consolidated: minority interest fell to Ps. 305M from Ps. 457M after the June 2025 purchase of ConCrédito's remaining 25.1%."
    },
    "niMin": {
     "es": "Ps. 305M vs Ps. 457M: los minoritarios de ConCrédito desaparecen desde julio de 2025.",
     "en": "Ps. 305M vs Ps. 457M: ConCrédito minorities disappear from July 2025."
    },
    "oci": {
     "es": "−Ps. 734M vs +Ps. 1,246M: la apreciación del peso en 2025 revirtió la ganancia por conversión de 2024 en la inversión de Perú.",
     "en": "−Ps. 734M vs +Ps. 1,246M: peso appreciation in 2025 reversed 2024's translation gain on the Perú investment."
    },
    "compInc": {
     "es": "Sólo +1.0%, por el giro de Ps. 1,980M en otros resultados integrales.",
     "en": "+1.0% only, because of the Ps. 1,980M swing in other comprehensive income."
    },
    "eps": {
     "es": "Ps. 5.20 vs Ps. 3.80 (+36.8%); guía 2026 Ps. 5.88–6.03 (+13–16%).",
     "en": "Ps. 5.20 vs Ps. 3.80 (+36.8%); 2026 guidance Ps. 5.88–6.03 (+13–16%)."
    }
   },
   "bs": {
    "loans": {
     "es": "+13.1% a Ps. 93,599M: Banco +15.9%, ConCrédito +18.1%, Perú +6.2% en pesos con un sol más débil.",
     "en": "+13.1% to Ps. 93,599M: Bank +15.9%, ConCrédito +18.1%, Perú +6.2% in pesos with a weaker sol."
    }
   },
   "ops": {
    "clientsCred": {
     "es": "+8.2% a 4.63M de clientes de crédito; 6.50M de personas atendidas (+11.7%).",
     "en": "+8.2% to 4.63M credit clients; 6.50M people served (+11.7%)."
    },
    "loans": {
     "es": "+13.1% a Ps. 93,599M: Banco +15.9%, ConCrédito +18.1%, Perú +6.2% en pesos con un sol más débil.",
     "en": "+13.1% to Ps. 93,599M: Bank +15.9%, ConCrédito +18.1%, Perú +6.2% in pesos with a weaker sol."
    }
   },
   "call": CALLS["2025Q4"],
   "source": "Press release 4T25"
  },
  "2026M3": {
   "call": CALLS["2026Q1"],
   "source": "Earnings call 2026Q1"
  },
  "2026M6": {
   "lines": {
    "intInc": {
     "es": "+11.6%: la cartera bruta promedio fue ~14% mayor que en el 1S25, con una tasa activa calculada cerca de un punto menor.",
     "en": "+11.6%: average gross loans ~14% higher than in 1H25, with the computed yield about a point lower."
    },
    "intExp": {
     "es": "−4.3%: gastos por financiamiento −10.4% por los recortes de Banxico (costo de fondeo del Banco 7.2% vs 9.1%), mientras los cargos de originación y arrendamiento subieron 9.4% con el volumen.",
     "en": "−4.3%: funding cost −10.4% on Banxico cuts (Bank cost of funds 7.2% vs 9.1%), while origination and lease charges rose 9.4% with volume."
    },
    "finMargin": {
     "es": "+14.8%; MIN promedio de los dos trimestres 40.6% vs 40.2% porque el costo de fondeo cayó más rápido que la tasa activa.",
     "en": "+14.8%; two-quarter average NIM 40.6% vs 40.2% as funding cost fell faster than the yield."
    },
    "prov": {
     "es": "+28.0%; costo de riesgo del semestre 13.7% vs 12.2% con etapa 3 consolidada en 4.04% vs 3.32% un año antes (el crédito individual del Banco es la fuente principal).",
     "en": "+28.0%; 1H cost of risk 13.7% vs 12.2% with consolidated stage-3 at 4.04% vs 3.32% a year earlier (Bank individual loans the main source)."
    },
    "finMarginAdj": {
     "es": "+10.0%; MIN después de provisiones 28.7% vs 29.6% porque la creación de reservas superó el crecimiento del margen.",
     "en": "+10.0%; NIM after provisions 28.7% vs 29.6% as the reserve build outpaced margin growth."
    },
    "feesCh": {
     "es": "+14.3% por volumen de pólizas de seguros; comisiones pagadas −5.1%, así que las comisiones netas crecieron 16.4%.",
     "en": "+14.3% on insurance policy volumes; fees paid −5.1%, so net fees grew 16.4%."
    },
    "otherInc": {
     "es": "−14.9%: el 1S25 incluyó una ganancia no recurrente mayor en el 1T25 (Ps. 364M); el crecimiento de CrediTienda continúa por debajo.",
     "en": "−14.9%: 1H25 carried a larger non-recurring gain in 1Q25 (Ps. 364M); CrediTienda growth continues underneath."
    },
    "totOpInc": {
     "es": "+14.2%: margen financiero +14.8%, comisiones netas +16.4%, otros ingresos menores por la base del 1T25.",
     "en": "+14.2%: financial margin +14.8%, net fees +16.4%, other income lower on the 1Q25 base."
    },
    "opex": {
     "es": "+9.0%, por debajo del crecimiento de cartera; índice de eficiencia 63.4% vs 64.1%, gastos / activos 20.1% vs 20.7%. La administración apunta a menos de ~12% en el año completo.",
     "en": "+9.0%, below loan growth; efficiency ratio 63.4% vs 64.1%, opex / assets 20.1% vs 20.7%. Management targets under ~12% for the full year."
    },
    "opRes": {
     "es": "+12.1%: ingresos +14% contra gastos +9% y provisiones +28%.",
     "en": "+12.1%: revenue growth of 14% against opex +9% and provisions +28%."
    },
    "tax": {
     "es": "+12.4%; tasa efectiva 31.0% vs 30.9%, estable.",
     "en": "+12.4%; effective rate 31.0% vs 30.9%, stable."
    },
    "netInc": {
     "es": "+12.0% a un semestre récord de Ps. 4,847M; ROAE 26.1% vs 25.7%, ROAA 8.0% sin cambio.",
     "en": "+12.0% to a record Ps. 4,847M half; ROAE 26.1% vs 25.7%, ROAA 8.0% flat."
    },
    "niMX": {
     "es": "+8.5% a Ps. 3,135M, semestre récord para el Banco pese a provisiones +44.8%.",
     "en": "+8.5% to Ps. 3,135M, a record half for the Bank despite provisions +44.8%."
    },
    "niPE": {
     "es": "+39.2% a Ps. 867M: margen +11.0%, provisiones −9.0% por mejor calidad de activos.",
     "en": "+39.2% to Ps. 867M: margin +11.0%, provisions −9.0% on better asset quality."
    },
    "niCC": {
     "es": "+2.2% a Ps. 569M: margen +15.4% absorbido por provisiones +17.9% y gastos +15.1%.",
     "en": "+2.2% to Ps. 569M: margin +15.4% absorbed by provisions +17.9% and opex +15.1%."
    },
    "niCtrl": {
     "es": "+11.9% a Ps. 4,713M, en línea con el consolidado (+12.0%); minoritarios Ps. 134M vs Ps. 118M.",
     "en": "+11.9% to Ps. 4,713M, in line with consolidated (+12.0%); minority Ps. 134M vs Ps. 118M."
    },
    "oci": {
     "es": "−Ps. 285M vs −Ps. 450M: menor pérdida por conversión de la inversión en Perú.",
     "en": "−Ps. 285M vs −Ps. 450M: smaller translation loss on the Perú investment."
    },
    "eps": {
     "es": "Ps. 2.98 vs Ps. 2.67 (+11.9%) con acciones sin cambio; guía anual Ps. 5.88–6.03.",
     "en": "Ps. 2.98 vs Ps. 2.67 (+11.9%) on an unchanged share count; annual guidance Ps. 5.88–6.03."
    }
   },
   "bs": {
    "loans": {
     "es": "Cartera al cierre +13.1% anual; la administración recortó la guía de crecimiento 2026 a 6–9% tras un segundo trimestre plano en el Banco.",
     "en": "Period-end book +13.1% YoY; management trimmed 2026 growth guidance to 6–9% after a flat second quarter at the Bank."
    }
   },
   "ops": {
    "loans": {
     "es": "Cartera al cierre +13.1% anual; la administración recortó la guía de crecimiento 2026 a 6–9% tras un segundo trimestre plano en el Banco.",
     "en": "Period-end book +13.1% YoY; management trimmed 2026 growth guidance to 6–9% after a flat second quarter at the Bank."
    }
   },
   "call": CALLS["2026Q2"],
   "source": "Press releases 1T26 y 2T26"
  },
  "2026Q1": {
   "lines": {
    "intInc": {
     "es": "+13.4% anual por una cartera 14.7% mayor; −2.0% secuencial por estacionalidad y un trimestre más corto en días de interés.",
     "en": "+13.4% YoY on a 14.7% larger book; −2.0% QoQ on seasonality and fewer interest days."
    },
    "intExp": {
     "es": "+1.8% anual: gastos por financiamiento −6.7% con los recortes de Banxico (costo de fondeo del Banco 7.5% vs 9.8%), compensados por más costos de originación y arrendamiento.",
     "en": "+1.8% YoY: funding expense −6.7% on Banxico cuts (Bank cost of funds 7.5% vs 9.8%), offset by higher origination and lease charges."
    },
    "fundExp": {
     "es": "−6.7% anual: menores tasas de referencia; la administración espera un mejor desempeño de esta línea con el recorte reciente de Banxico.",
     "en": "−6.7% YoY: lower reference rates; management expects this line to keep improving after Banxico's latest cut."
    },
    "finMargin": {
     "es": "+15.7% anual; MIN 40.0% vs 39.5%, presionada en el trimestre por estacionalidad y una mayor posición de efectivo; la administración reitera ~41% al cierre.",
     "en": "+15.7% YoY; NIM 40.0% vs 39.5%, held back in the quarter by seasonality and a larger cash position; management reiterates ~41% at year-end."
    },
    "prov": {
     "es": "+26.1% anual, en línea con crecimiento y mezcla; costo de riesgo 12.9% vs 11.6%; etapa 3 consolidada 4.13% vs 3.73% por el crédito individual del Banco (Banco 4.86%; individual 6.33%, grupal 3.90%). Cobertura 207.6%; la administración espera regresar a 210–220%.",
     "en": "+26.1% YoY, in line with growth and mix; cost of risk 12.9% vs 11.6%; consolidated stage 3 4.13% vs 3.73% on the Bank's individual loans (Bank 4.86%; individual 6.33%, group 3.90%). Coverage 207.6%; management expects to return to 210–220%."
    },
    "finMarginAdj": {
     "es": "+10.9% anual; MIN después de provisiones 28.8% vs 29.3%; guía ~30% al cierre.",
     "en": "+10.9% YoY; NIM after provisions 28.8% vs 29.3%; guided ~30% at year-end."
    },
    "feesCh": {
     "es": "+18.0% anual por seguros (16.2M de pólizas activas de Aterna); comisiones pagadas +10.3%.",
     "en": "+18.0% YoY on insurance (16.2M active Aterna policies); fees paid +10.3%."
    },
    "netFees": {
     "es": "+18.7% anual a Ps. 1,587M; la administración espera que el crecimiento converja al de clientes (~12%).",
     "en": "+18.7% YoY to Ps. 1,587M; management expects growth to converge to client growth (~12%)."
    },
    "otherInc": {
     "es": "Ps. 243M vs Ps. 364M (−33%): el 1T25 incluyó ganancias no recurrentes; CrediTienda sigue creciendo por debajo.",
     "en": "Ps. 243M vs Ps. 364M (−33%): 1Q25 carried non-recurring gains; CrediTienda keeps growing underneath."
    },
    "totOpInc": {
     "es": "+14.4% anual: margen +15.7%, comisiones netas +18.7%, otros ingresos menores.",
     "en": "+14.4% YoY: margin +15.7%, net fees +18.7%, other income lower."
    },
    "opIncAfterProv": {
     "es": "+10.9% anual: las provisiones (+26.1%) crecieron más que los ingresos.",
     "en": "+10.9% YoY: provisions (+26.1%) outgrew revenue."
    },
    "opex": {
     "es": "+10.5% anual, −6.2% secuencial (el 4T25 traía Ps. 500M de contingencias fiscales); índice de eficiencia 62.4% vs 62.8%, el mejor en ocho años según la administración; guía 12–13% mantenida en abril.",
     "en": "+10.5% YoY, −6.2% QoQ (4Q25 carried Ps. 500M of tax contingencies); efficiency ratio 62.4% vs 62.8%, the best in eight years per management; 12–13% guide kept in April."
    },
    "opRes": {
     "es": "+12.4% anual: ingresos +14% contra gastos +10.5% y provisiones +26%.",
     "en": "+12.4% YoY: revenue +14% against opex +10.5% and provisions +26%."
    },
    "tax": {
     "es": "+12.8% anual; tasa efectiva 31.0% vs 30.9%. Sin efectos adicionales de impuestos diferidos en 2026, según la administración.",
     "en": "+12.8% YoY; effective rate 31.0% vs 30.9%. No further deferred-tax effects in 2026, per management."
    },
    "netInc": {
     "es": "+12.3% anual a Ps. 2,494M, récord trimestral; +22.6% secuencial sobre un 4T25 cargado de partidas. ROAE 26.9%, ROAA 8.2%.",
     "en": "+12.3% YoY to Ps. 2,494M, a quarterly record; +22.6% QoQ on a 4Q25 laden with one-offs. ROAE 26.9%, ROAA 8.2%."
    },
    "niMX": {
     "es": "+7.2% anual a Ps. 1,656M: margen +14% absorbido por provisiones con etapa 3 en 4.86%; ICAP 32.3%.",
     "en": "+7.2% YoY to Ps. 1,656M: margin +14% absorbed by provisions with stage 3 at 4.86%; ICAP 32.3%."
    },
    "niPE": {
     "es": "+49.2% anual a Ps. 436M: la recuperación de Perú continúa con etapa 3 en 2.85%.",
     "en": "+49.2% YoY to Ps. 436M: Perú's recovery continues with stage 3 at 2.85%."
    },
    "niCC": {
     "es": "+0.4% anual a Ps. 257M: cartera +14.1% con etapa 3 en 1.81%, compensada por más provisiones y gastos.",
     "en": "+0.4% YoY to Ps. 257M: loans +14.1% with stage 3 at 1.81%, offset by higher provisions and opex."
    },
    "niCtrl": {
     "es": "+15.3% anual a Ps. 2,429M contra +12.3% consolidado: la participación minoritaria bajó a Ps. 65M desde Ps. 115M tras la compra del 25.1% de ConCrédito (junio de 2025).",
     "en": "+15.3% YoY to Ps. 2,429M vs +12.3% consolidated: minority interest fell to Ps. 65M from Ps. 115M after the June 2025 purchase of ConCrédito's 25.1%."
    },
    "niMin": {
     "es": "Ps. 65M vs Ps. 115M: ConCrédito es 100% propia desde junio de 2025; resta sobre todo el socio al 50% de Aterna.",
     "en": "Ps. 65M vs Ps. 115M: ConCrédito fully owned since June 2025; mostly the 50% Aterna partner remains."
    },
    "oci": {
     "es": "−Ps. 293M vs −Ps. 153M: mayor pérdida por conversión de la inversión en Perú.",
     "en": "−Ps. 293M vs −Ps. 153M: larger translation loss on the Perú investment."
    },
    "eps": {
     "es": "Ps. 1.54 vs Ps. 1.33 (+15.3%) con acciones sin cambio; guía anual Ps. 5.88–6.03 reiterada.",
     "en": "Ps. 1.54 vs Ps. 1.33 (+15.3%) on an unchanged share count; annual guidance Ps. 5.88–6.03 reaffirmed."
    }
   },
   "bs": {
    "loans": {
     "es": "+14.7% anual a Ps. 94,863M (+1.4% secuencial); guía 13–16% reiterada en abril, recortada a 6–9% en julio.",
     "en": "+14.7% YoY to Ps. 94,863M (+1.4% QoQ); 13–16% guide reaffirmed in April, cut to 6–9% in July."
    },
    "loansMX": {
     "es": "+18.8% anual, +2.6% secuencial; crecimiento del individual moderado desde marzo por la etapa 3 de 6.33%.",
     "en": "+18.8% YoY, +2.6% QoQ; individual-loan growth moderated from March on its 6.33% stage 3."
    },
    "loansPE": {
     "es": "+5.8% en pesos con un peso más fuerte; doble dígito en soles según la administración.",
     "en": "+5.8% in pesos with a stronger peso; double digits in soles per management."
    },
    "loansCC": {
     "es": "+14.1% anual a Ps. 6,066M; etapa 3 1.81%.",
     "en": "+14.1% YoY to Ps. 6,066M; stage 3 1.81%."
    }
   },
   "ops": {
    "clientsCred": {
     "es": "4.66M de clientes de crédito (+7.5%); 6.61M de personas atendidas (+13.7%).",
     "en": "4.66M credit clients (+7.5%); 6.61M people served (+13.7%)."
    },
    "employees": {
     "es": "+3.1% anual: contratación moderada tras el crecimiento de 2025.",
     "en": "+3.1% YoY: hiring moderated after 2025's expansion."
    },
    "loans": {
     "es": "+14.7% anual a Ps. 94,863M (+1.4% secuencial); guía 13–16% reiterada en abril, recortada a 6–9% en julio.",
     "en": "+14.7% YoY to Ps. 94,863M (+1.4% QoQ); 13–16% guide reaffirmed in April, cut to 6–9% in July."
    },
    "loansMX": {
     "es": "+18.8% anual, +2.6% secuencial; crecimiento del individual moderado desde marzo por la etapa 3 de 6.33%.",
     "en": "+18.8% YoY, +2.6% QoQ; individual-loan growth moderated from March on its 6.33% stage 3."
    },
    "loansPE": {
     "es": "+5.8% en pesos con un peso más fuerte; doble dígito en soles según la administración.",
     "en": "+5.8% in pesos with a stronger peso; double digits in soles per management."
    },
    "loansCC": {
     "es": "+14.1% anual a Ps. 6,066M; etapa 3 1.81%.",
     "en": "+14.1% YoY to Ps. 6,066M; stage 3 1.81%."
    }
   },
   "source": "Press release 1T26; earnings call 23 Apr 2026",
   "call": CALLS["2026Q1"]
  },
  "2026Q2": {
   "lines": {
    "intInc": {
     "es": "+9.8% anual por el crecimiento de cartera de 13.1%, parcialmente compensado por una tasa activa ligeramente menor; +2.1% secuencial. El Banco genera 73.1% de los ingresos por intereses; ConCrédito 7.8% con 6.9% de la cartera.",
     "en": "+9.8% YoY on 13.1% loan growth, partly offset by a slightly lower yield; +2.1% QoQ. The Bank generates 73.1% of interest income; ConCrédito 7.8% on 6.9% of loans."
    },
    "intExp": {
     "es": "−9.9% anual, −4.3% secuencial: los recortes de Banxico llevaron el costo de fondeo del Banco a 7.2% desde 9.1% (gasto por financiamiento −20% pese a +7.6% en pasivos con costo); Perú 4.8% vs 5.2%. Sólo 7.2% de los pasivos del Banco están a tasa fija, por lo que los recortes se transmiten rápido.",
     "en": "−9.9% YoY, −4.3% QoQ: Banxico rate cuts took the Bank's cost of funds to 7.2% from 9.1% (funding expense −20% despite +7.6% in interest-bearing liabilities); Perú 4.8% vs 5.2%. Only 7.2% of the Bank's liabilities are fixed-rate, so cuts pass through quickly."
    },
    "fundExp": {
     "es": "−14.0% anual: menores tasas de referencia más un cambio de mezcla hacia captación (+17.3% anual).",
     "en": "−14.0% YoY: lower reference rates plus a mix shift toward deposits (captación +17.3% YoY)."
    },
    "origExp": {
     "es": "−1.2% anual: costos de originación e intereses de arrendamiento registrados en gastos por intereses desde los criterios de 2022; ~Ps. 543M corresponden al Banco.",
     "en": "−1.2% YoY: loan-origination costs and lease interest booked in interest expense since the 2022 criteria; ~Ps. 543M of it sits at the Bank."
    },
    "finMargin": {
     "es": "+13.9% anual, +3.2% secuencial: crecimiento de cartera de doble dígito en las tres subsidiarias con costo de fondeo a la baja; MIN 41.2% (+0.3 pp anual, +1.2 pp secuencial).",
     "en": "+13.9% YoY, +3.2% QoQ: double-digit loan growth at all three lenders with falling funding cost; NIM 41.2% (+0.3 pp YoY, +1.2 pp QoQ)."
    },
    "prov": {
     "es": "+29.7% anual (+Ps. 788M), +13.2% secuencial: la administración cita reservas por el crecimiento de 10.9% en Perú y 14.9% en ConCrédito, además de la etapa 3 del Banco en 4.59% (individual 6.12% vs 3.79%). Costo de riesgo 14.5% vs 12.7%; la cartera vencida consolidada de 4.04% está dentro del rango ~4% guiado para esta mezcla.",
     "en": "+29.7% YoY (+Ps. 788M), +13.2% QoQ: management cites reserves for 10.9% growth in Perú and 14.9% at ConCrédito, on top of Bank stage-3 at 4.59% (individual loans 6.12% vs 3.79%). Cost of risk 14.5% vs 12.7%; consolidated NPL 4.04% is inside the ~4% range guided for this mix."
    },
    "finMarginAdj": {
     "es": "+8.0% anual pero −0.7% secuencial: las provisiones crecieron más que el margen; MIN después de provisiones 28.5% vs 29.8%.",
     "en": "+8.0% YoY but −0.7% QoQ: provisions grew faster than the margin; NIM after provisions 28.5% vs 29.8%."
    },
    "feesCh": {
     "es": "+10.9% anual: la intermediación de seguros es 88% de las comisiones del Banco, con 16.4M de pólizas activas de Aterna y Ps. 2,486M de primas; las comisiones por atraso son 11%.",
     "en": "+10.9% YoY: insurance intermediation is 88% of the Bank's fees, on 16.4M active Aterna policies and Ps. 2,486M of premiums; late-payment fees are 11%."
    },
    "feesPd": {
     "es": "−16.6% anual: menores comisiones a canales de terceros por desembolso y cobranza; la comisión por exclusividad de Yastás es 26% de las comisiones pagadas del Banco.",
     "en": "−16.6% YoY: lower third-party channel fees for disbursement and collection; the Yastás exclusivity fee is 26% of the Bank's fees paid."
    },
    "netFees": {
     "es": "+14.2% anual a Ps. 1,610M: ventas \"extraordinarias\" de pólizas en las subsidiarias, según la administración.",
     "en": "+14.2% YoY to Ps. 1,610M: \"extraordinary\" policy sales across the subsidiaries per management."
    },
    "trading": {
     "es": "Pérdida de Ps. 5M por el efectivo en dólares que el Banco mantiene para obligaciones contractuales; inmaterial.",
     "en": "Ps. 5M loss from the USD cash the Bank holds for contractual obligations; immaterial."
    },
    "otherInc": {
     "es": "+12.2% anual: ventas en línea de CrediTienda en ConCrédito (Ps. 524M brutos) netas de egresos del negocio de seguros, I&D, cuotas del IPAB y donativos en el Banco (−Ps. 95M).",
     "en": "+12.2% YoY: CrediTienda online sales at ConCrédito (Ps. 524M gross) net of insurance-business expenses, R&D, IPAB fees and donations at the Bank (−Ps. 95M)."
    },
    "totOpInc": {
     "es": "+13.9% anual, +3.1% secuencial: margen financiero +13.9%, comisiones netas +14.2%, otros ingresos +12%; la línea superior sigue impulsada por la cartera.",
     "en": "+13.9% YoY, +3.1% QoQ: financial margin +13.9%, net fees +14.2%, other income +12%; the top line is still driven by the loan book."
    },
    "opIncAfterProv": {
     "es": "+9.1% anual, plano secuencialmente (−0.1%): el aumento de Ps. 788M en provisiones absorbió casi toda la ganancia secuencial de ingresos.",
     "en": "+9.1% YoY, flat QoQ (−0.1%): the Ps. 788M provision increase absorbed most of the sequential revenue gain."
    },
    "opex": {
     "es": "+7.7% anual (+3.3% secuencial), muy por debajo de la guía original de 12–13% y del crecimiento de cartera; la administración ahora apunta a un crecimiento anual de gastos menor a ~12%. Banco +4.6% (oficiales de crédito, inflación), Perú +11.4%, ConCrédito +19.2%.",
     "en": "+7.7% YoY (+3.3% QoQ), well below the original 12–13% guide and below loan growth; management now targets full-year opex growth under ~12%. Bank +4.6% (loan officers, inflation), Perú +11.4%, ConCrédito +19.2%."
    },
    "opRes": {
     "es": "+11.8% anual, −5.6% secuencial: en el trimestre, provisiones (+13.2%) y gastos (+3.3%) crecieron más que los ingresos (+3.1%).",
     "en": "+11.8% YoY, −5.6% QoQ: sequentially, provisions (+13.2%) and opex (+3.3%) outgrew revenue (+3.1%)."
    },
    "tax": {
     "es": "+12.1% anual en línea con la utilidad antes de impuestos; tasa efectiva 31.0% vs 30.9% (31.0% en el 1T26), es decir, estable.",
     "en": "+12.1% YoY in line with pre-tax profit; effective rate 31.0% vs 30.9% (31.0% in 1Q26), i.e. stable."
    },
    "netInc": {
     "es": "+11.6% anual a Ps. 2,353M; −5.7% secuencial por mayores provisiones. La utilidad neta del 1S26 de Ps. 4,847M es récord para un semestre. ROAE 25.0%, ROAA 7.7%.",
     "en": "+11.6% YoY to Ps. 2,353M; −5.7% QoQ on higher provisions. 1H26 net income of Ps. 4,847M is a record half. ROAE 25.0%, ROAA 7.7%."
    },
    "niMX": {
     "es": "+10.0% anual, −10.7% secuencial: margen +14.5% y costo de fondeo en 7.2% se compensaron con provisiones +43.1% por una etapa 3 de 4.59%; ICAP 32.1%.",
     "en": "+10.0% YoY, −10.7% QoQ: margin +14.5% and cost of funds down to 7.2% were offset by provisions +43.1% on stage-3 of 4.59%; ICAP 32.1%."
    },
    "niPE": {
     "es": "+30.3% anual: margen +11.7% mientras las provisiones bajaron 6.3% al mejorar la etapa 3 a 3.25% desde 3.72%; gastos +11.4%. ROE 26.2%, solvencia 22.5%.",
     "en": "+30.3% YoY: margin +11.7% while provisions fell 6.3% as stage-3 improved to 3.25% from 3.72%; opex +11.4%. ROE 26.2%, solvency 22.5%."
    },
    "niCC": {
     "es": "+3.7% anual, +21.7% secuencial: margen +18.5% y menores impuestos contra provisiones +27.2% y gastos +19.2%; se recupera de la cancelación del impuesto diferido del 4T25. ROE 26.5%.",
     "en": "+3.7% YoY, +21.7% QoQ: margin +18.5% and lower taxes against provisions +27.2% and opex +19.2%; recovering from the 4Q25 deferred-tax write-down. ROE 26.5%."
    },
    "niOther": {
     "es": "Tenedora, Yastás (9.1M de operaciones, +23% anual), Aterna y asientos de consolidación; línea residual.",
     "en": "Holding company, Yastás (9.1M transactions, +23% YoY), Aterna and consolidation entries; residual line."
    },
    "niCtrl": {
     "es": "+8.5% anual contra +11.6% de la utilidad neta consolidada: la parte minoritaria subió a Ps. 69M desde un inusualmente bajo Ps. 3M en el 2T25, el trimestre de la compra de ConCrédito del 30 de junio.",
     "en": "+8.5% YoY vs +11.6% for consolidated net income: the minority share rose to Ps. 69M from an unusually low Ps. 3M in 2Q25, the quarter of the June 30 ConCrédito buyout."
    },
    "niMin": {
     "es": "Ps. 69M vs Ps. 3M: ConCrédito es 100% propia desde el 30 de junio de 2025; los minoritarios restantes (Perú y otros) son pequeños pero fueron casi cero en el 2T25.",
     "en": "Ps. 69M vs Ps. 3M: ConCrédito has been 100% owned since June 30, 2025; the remaining minorities (Perú and other) are small but were near zero in 2Q25."
    },
    "oci": {
     "es": "+Ps. 8M vs −Ps. 297M: la conversión peso/sol de la inversión en Perú resultó ligeramente positiva este trimestre.",
     "en": "+Ps. 8M vs −Ps. 297M: the peso/sol translation of the Perú investment turned slightly positive this quarter."
    },
    "compInc": {
     "es": "+30.4% anual: crecimiento de la utilidad neta más el giro de Ps. 305M en otros resultados integrales.",
     "en": "+30.4% YoY: net income growth plus the Ps. 305M swing in other comprehensive income."
    },
    "eps": {
     "es": "Ps. 1.45 vs Ps. 1.33 (+8.5%), igual que la utilidad neta controladora; acciones sin cambio en 1,579.2M.",
     "en": "Ps. 1.45 vs Ps. 1.33 (+8.5%), matching controlling net income; share count unchanged at 1,579.2M."
    }
   },
   "bs": {
    "loans": {
     "es": "+13.1% anual pero plana secuencialmente (−0.2%): Banco Compartamos se contrajo 1.5% en el trimestre con una originación más estricta y la administración ahora guía sólo 6–9% de crecimiento para 2026. Perú +10.9% (+14.5% en soles); ConCrédito en récord.",
     "en": "+13.1% YoY but flat QoQ (−0.2%): Banco Compartamos shrank 1.5% QoQ under tighter origination and management now guides only 6–9% growth for 2026. Perú +10.9% (+14.5% in soles); ConCrédito at a record."
    },
    "loansMX": {
     "es": "+13.8% anual, −1.5% secuencial; 66% de la cartera del grupo. La metodología grupal es 60.5% de la cartera del Banco, la individual 39.5%.",
     "en": "+13.8% YoY, −1.5% QoQ; 66% of the group book. Group lending is 60.5% of the Bank's portfolio, individual loans 39.5%."
    },
    "loansPE": {
     "es": "+10.9% en pesos, +14.5% en soles; un peso más firme reduce la cifra convertida. El crédito grupal es 25% de la cartera peruana.",
     "en": "+10.9% in pesos, +14.5% in soles; a firmer peso trims the translated figure. Group loans are 25% of the Peruvian book."
    },
    "loansCC": {
     "es": "Récord de Ps. 6,472M, +14.9% anual y +6.7% secuencial; las cuentas por cobrar de CrediTienda (fuera de la cartera) +26.9% a Ps. 1,144M.",
     "en": "Record Ps. 6,472M, +14.9% YoY and +6.7% QoQ; CrediTienda receivables (outside the loan book) +26.9% to Ps. 1,144M."
    }
   },
   "ops": {
    "clientsCred": {
     "es": "Récord de 4.68M de clientes de crédito (+6.0% anual, +0.3% secuencial); 6.79M de personas atendidas incl. ahorro, seguros y usuarios finales de ConCrédito (+10.7%). Banco +7.1%, Perú +3.1%, usuarios finales de ConCrédito +6.5%.",
     "en": "Record 4.68M credit clients (+6.0% YoY, +0.3% QoQ); 6.79M people served incl. savings, insurance and ConCrédito end users (+10.7%). Banco +7.1%, Perú +3.1%, ConCrédito end users +6.5%."
    },
    "avgBal": {
     "es": "+6.7% anual porque el crédito individual crece más que el grupal; −0.5% secuencial con la contracción del Banco en el trimestre.",
     "en": "+6.7% YoY as individual loans outgrow group loans; −0.5% QoQ with the Bank's sequential contraction."
    },
    "yieldDisc": {
     "es": "Tasa activa combinada ~56.1% contra 56.4% hace un año y 56.3% en el 1T26: precios estables en general, ligero cambio de mezcla.",
     "en": "Blended tasa activa ~56.1% vs 56.4% a year ago and 56.3% in 1Q26: pricing broadly stable, slight mix drift."
    },
    "employees": {
     "es": "+2.2% anual, +0.4% secuencial: la contratación se moderó con el plan de eficiencia; el aumento anual es sobre todo oficiales de crédito en el Banco.",
     "en": "+2.2% YoY, +0.4% QoQ: hiring slowed as the efficiency plan took hold; the YoY increase is mostly loan officers at the Bank."
    },
    "branches": {
     "es": "Dos sucursales más que hace un año (154); 61 oficinas de servicio comparten domicilio con sucursales.",
     "en": "Two branches added YoY (154); 61 service offices share premises with branches."
    },
    "loans": {
     "es": "+13.1% anual pero plana secuencialmente (−0.2%): Banco Compartamos se contrajo 1.5% en el trimestre con una originación más estricta y la administración ahora guía sólo 6–9% de crecimiento para 2026. Perú +10.9% (+14.5% en soles); ConCrédito en récord.",
     "en": "+13.1% YoY but flat QoQ (−0.2%): Banco Compartamos shrank 1.5% QoQ under tighter origination and management now guides only 6–9% growth for 2026. Perú +10.9% (+14.5% in soles); ConCrédito at a record."
    },
    "loansMX": {
     "es": "+13.8% anual, −1.5% secuencial; 66% de la cartera del grupo. La metodología grupal es 60.5% de la cartera del Banco, la individual 39.5%.",
     "en": "+13.8% YoY, −1.5% QoQ; 66% of the group book. Group lending is 60.5% of the Bank's portfolio, individual loans 39.5%."
    },
    "loansPE": {
     "es": "+10.9% en pesos, +14.5% en soles; un peso más firme reduce la cifra convertida. El crédito grupal es 25% de la cartera peruana.",
     "en": "+10.9% in pesos, +14.5% in soles; a firmer peso trims the translated figure. Group loans are 25% of the Peruvian book."
    },
    "loansCC": {
     "es": "Récord de Ps. 6,472M, +14.9% anual y +6.7% secuencial; las cuentas por cobrar de CrediTienda (fuera de la cartera) +26.9% a Ps. 1,144M.",
     "en": "Record Ps. 6,472M, +14.9% YoY and +6.7% QoQ; CrediTienda receivables (outside the loan book) +26.9% to Ps. 1,144M."
    }
   },
   "call": CALLS["2026Q2"],
   "source": "Press release 2T26"
  }
 },
 "calls": CALLS
};
})();
