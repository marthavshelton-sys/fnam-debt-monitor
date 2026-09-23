// Management guidance for the Gentera model. Gentera publishes numeric guidance with the 4Q release (February)
// and reaffirms or revises it on the 1Q, 2Q and 3Q calls. One entry per vintage, in date order, with the source
// (release date = the PDF dateline, the call day or the day before; `call` = earnings-call date and converted transcript under tools/gentera/raw/text/transcripts).
// Ranges are as stated; `text` keeps the wording. Metrics: eps (Ps.), loanGrowth (%), opexGrowth (%), cor (cost
// of risk, %), npl (stage-3 ratio, %), roe (controlling ROE, %). lo = null / hi = null means the bound was not
// given ("around" values use lo = hi). 2023Q3–2025Q4 vintages are transcribed from the FactSet CallStreet
// transcripts of the calls (hand-supplied); 2026 vintages from the 4T25, 1T26 and 2T26 releases (harvested).
window.G_GUIDANCE = {
  updatedAt: "2026-09-22",
  basis: "Full-year figures; growth vs the prior fiscal year; stage-3 ratio and cost of risk as full-year levels; EPS on controlling net income and 1,579.2 M shares; ROE = controlling ROE as Gentera reports it.",
  metrics: ["eps", "loanGrowth", "opexGrowth", "cor", "npl", "roe"],
  ir: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral",
  vintages: [
    {
      fy: 2023, kind: "revised", date: "2023-10-25", quarter: "2023Q3", call: "2023-10-25",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2023-10-25", title: { es: "Informe 3T23 y conferencia del 25 de octubre de 2023", en: "3Q23 release and call of 25 October 2023" }, transcript: "tools/gentera/raw/text/transcripts/2023Q3-transcript-Gentera_3T23_earnings_call_transcript_2023-10-25.txt" },
      items: {
        eps: { lo: 3.04, hi: 3.14, text: { es: "UPA 2023 recortada a Ps. 3.04–3.14 por las inversiones y gastos de colocación para capturar la oportunidad de mercado (rango previo no transcrito).", en: "2023 EPS cut to Ps. 3.04–3.14 because of the investments and placement expenses made to capture the market opportunity (previous range not transcribed)." } },
        loanGrowth: { lo: 16, hi: 18, text: { es: "Cartera subida a 16%–18% desde 14%–16%.", en: "Loan growth raised to 16%–18% from 14%–16%." } },
        opexGrowth: { lo: 15, hi: 15, text: { es: "Gastos ~+15% en el año (3,800 contrataciones, sobre todo fuerza de ventas); mordazas positivas en 2023 y 2024.", en: "Opex ~+15% for the year (3,800 hires, mostly sales force); positive jaws in 2023 and 2024." } },
        cor: { lo: null, hi: null, text: { es: "Sin cifra anual: 10.3% acumulado a septiembre, mejor que la guía inicial; para 2024, de manera informal, 10.5%–11%.", en: "No full-year figure: 10.3% year-to-date at September, better than the initial guidance; informally 10.5%–11% for 2024." } },
        npl: { lo: 3.5, hi: 4.0, text: { es: "Rango de referencia de cartera sana 3.5%–4%; 3.29% en el 3T23.", en: "Healthy-book reference range 3.5%–4%; 3.29% at 3Q23." } },
        roe: { lo: 20, hi: 20, text: { es: "ROE controlador alrededor de 20% en 2023.", en: "Controlling ROE around 20% for 2023." } },
      },
      notes: { es: ["MIN alrededor de 40% y MIN después de provisiones 30%–31% en los siguientes trimestres; comisiones netas ~+40% en 2023 y ~+20% en 2024; para 2024 crecimiento de doble dígito en cartera, ingresos y UPA con ROE > 20%.", "Huracán Otis (24 de octubre de 2023): Acapulco ≈1.5% de la cartera del Banco y ≈1% de la de Gentera."], en: ["NIM around 40% and NIM after provisions 30%–31% in the coming quarters; net fees ~+40% in 2023 and ~+20% in 2024; for 2024 double-digit growth in loans, revenue and EPS with ROE > 20%.", "Hurricane Otis (24 October 2023): Acapulco ≈1.5% of the Bank's book and ≈1% of Gentera's."] },
    },
    {
      fy: 2024, kind: "initial", date: "2024-02-21", quarter: "2023Q4", call: "2024-02-22",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2024-02-21", title: { es: "Informe 4T23 y conferencia del 22 de febrero de 2024", en: "4Q23 release and call of 22 February 2024" }, transcript: "tools/gentera/raw/text/transcripts/2023Q4-transcript-Gentera_4T23_earnings_call_transcript_2024-02-22.txt" },
      items: {
        eps: { lo: 3.50, hi: 3.60, text: { es: "UPA 2024 entre Ps. 3.50 y Ps. 3.60 (+17% a +20% sobre Ps. 2.99).", en: "2024 EPS between Ps. 3.50 and Ps. 3.60 (+17% to +20% on Ps. 2.99)." } },
        loanGrowth: { lo: 18, hi: 20, text: { es: "Cartera +18% a +20%: Banco ~17%, Perú ~20%, ConCrédito ~17%.", en: "Loans +18% to +20%: Bank ~17%, Perú ~20%, ConCrédito ~17%." } },
        opexGrowth: { lo: 17, hi: 17, text: { es: "Gastos alrededor de +17% (75% ligados a ventas), con ingresos creciendo por encima.", en: "Opex around +17% (75% sales-related), with revenue growing faster." } },
        cor: { lo: 11, hi: 11.5, text: { es: "Costo de riesgo 11%–11.5% con cobertura > 200%.", en: "Cost of risk 11%–11.5% with coverage > 200%." } },
        npl: { lo: 3.5, hi: 4.0, text: { es: "Rango de cartera sana 3.5%–4% (3.44% al cierre de 2023).", en: "Healthy range 3.5%–4% (3.44% at end-2023)." } },
        roe: { lo: 20.5, hi: 20.5, text: { es: "ROE controlador alrededor de 20.5%.", en: "Controlling ROE around 20.5%." } },
      },
      notes: { es: ["Margen financiero ~+19% (como la cartera), MIN ~40%, MIN después de provisiones ~30%, comisiones netas creciendo como la cartera; tasa de referencia asumida 9.75% en México y 4.5% en Perú; dividendo 40%.", "La UPA 2023 de Ps. 2.99 quedó bajo el piso de Ps. 3.04 por Otis (Ps. 194 M de provisiones no recurrentes; Ps. 3.07 sin ese efecto)."], en: ["Net interest income ~+19% (in line with loans), NIM ~40%, NIM after provisions ~30%, net fees growing with the book; reference rate assumed at 9.75% in Mexico and 4.5% in Peru; 40% dividend.", "2023 EPS of Ps. 2.99 fell below the Ps. 3.04 floor because of Otis (Ps. 194 M non-recurring provisions; Ps. 3.07 without it)."] },
    },
    {
      fy: 2024, kind: "reaffirmed", date: "2024-04-24", quarter: "2024Q1", call: "2024-04-24",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2024-04-24", title: { es: "Informe 1T24 y conferencia del 24 de abril de 2024", en: "1Q24 release and call of 24 April 2024" }, transcript: "tools/gentera/raw/text/transcripts/2024Q1-transcript-Gentera_1T24_earnings_call_transcript_2024-04-24.txt" },
      items: {
        eps: { lo: 3.50, hi: 3.60, text: { es: "Reiterada; \"más cerca del techo, pero dentro de la guía\".", en: "Reaffirmed; \"closer to the high end, but still within the guidance\"." } },
        loanGrowth: { lo: 18, hi: 20, text: { es: "Reiterada; +20.6% en el 1T24.", en: "Reaffirmed; +20.6% at 1Q24." } },
        opexGrowth: { lo: 17, hi: 17, text: { es: "Sin cambio; +13.3% en el 1T24, con gastos adicionales de iniciativas estratégicas por venir.", en: "Unchanged; +13.3% in 1Q24, with further strategic-initiative spending to come." } },
        cor: { lo: 11, hi: 11.5, text: { es: "Sin cambio; 10.7% en el 1T24, por debajo del rango.", en: "Unchanged; 10.7% in 1Q24, below the range." } },
        npl: { lo: 3.5, hi: 4.0, text: { es: "3.57% en el 1T24, dentro del rango objetivo.", en: "3.57% at 1Q24, within the target range." } },
        roe: { lo: 20.5, hi: 20.5, text: { es: "Alrededor de 20.5% (21.4% en el 1T24).", en: "Around 20.5% (21.4% in 1Q24)." } },
      },
      notes: { es: ["Tasa de referencia esperada ~10% en México para el resto del año; MIN 40% y MIN después de provisiones 30%; otros ingresos ~Ps. 200 M promedio en el año.", "Perú: acciones en abril para normalizar la calidad de la cartera hacia el 3T24."], en: ["Reference rate expected ~10% in Mexico for the rest of the year; NIM 40% and NIM after provisions 30%; other income ~Ps. 200 M on average for the year.", "Peru: April actions to normalise asset quality by 3Q24."] },
    },
    {
      fy: 2024, kind: "revised", date: "2024-07-24", quarter: "2024Q2", call: "2024-07-24",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2024-07-24", title: { es: "Informe 2T24 y conferencia del 24 de julio de 2024", en: "2Q24 release and call of 24 July 2024" }, transcript: "tools/gentera/raw/text/transcripts/2024Q2-transcript-Gentera_2T24_earnings_call_transcript_2024-07-24.txt" },
      items: {
        eps: { lo: 3.50, hi: 3.60, text: { es: "Reiterada: mayor costo de riesgo compensado con más ingresos por intereses, seguros y control de gastos.", en: "Reaffirmed: higher cost of risk offset by more interest income, insurance fees and expense control." } },
        loanGrowth: { lo: 18, hi: 20, text: { es: "Reiterada; +19.3% en el 2T24 pese al rezago de Perú.", en: "Reaffirmed; +19.3% at 2Q24 despite Peru lagging." } },
        opexGrowth: { lo: null, hi: 17, text: { es: "Por debajo de la guía original de ~17% (+13% en el 1S24); índice de eficiencia ~69% al cierre.", en: "Below the original ~17% guide (+13% in 1H24); efficiency ratio ~69% at year-end." } },
        cor: { lo: 12, hi: 12, text: { es: "Subido a ~12% (desde 11%–11.5%) por Perú, la mezcla individual y la mora temprana; provisiones ~Ps. 2.2 mil M por trimestre en el 2S24; objetivo 2025 11.5%–12%.", en: "Raised to ~12% (from 11%–11.5%) on Peru, the individual-loan mix and early delinquency; provisions ~Ps. 2.2 bn a quarter in 2H24; 2025 target 11.5%–12%." } },
        npl: { lo: 3.5, hi: 3.7, text: { es: "3.5%–3.7% al cierre (≈3.6%); Banco y ConCrédito estables, repunte por Perú.", en: "3.5%–3.7% at year-end (≈3.6%); Bank and ConCrédito stable, uptick from Peru." } },
        roe: { lo: 20.5, hi: 20.5, text: { es: "Alrededor de 20.5% (19.6% en el 1S24); objetivo de largo plazo ~23%.", en: "Around 20.5% (19.6% in 1H24); long-term objective ~23%." } },
      },
      notes: { es: ["MIN después de provisiones ~30% en el año; Perú: ROE ~15% en soles / 13% en pesos en 2024 y > 20% en un año aproximadamente; tasa corporativa normal 30%.", "Límites internos de capital: ICAP Banco 25%, solvencia Perú 17%, ConCrédito > 35%, capital tangible ~22.5%."], en: ["NIM after provisions ~30% for the year; Peru: ROE ~15% in soles / 13% in pesos for 2024 and > 20% in about a year; normal corporate tax rate 30%.", "Internal capital limits: Bank ICAP 25%, Peru solvency 17%, ConCrédito > 35%, tangible equity ~22.5%."] },
    },
    {
      fy: 2024, kind: "revised", date: "2024-10-23", quarter: "2024Q3", call: "2024-10-23",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2024-10-23", title: { es: "Informe 3T24 y conferencia del 23 de octubre de 2024", en: "3Q24 release and call of 23 October 2024" }, transcript: "tools/gentera/raw/text/transcripts/2024Q3-transcript-Gentera_3T24_earnings_call_transcript_2024-10-23.txt" },
      items: {
        eps: { lo: 3.50, hi: 3.60, text: { es: "Reiterada, cierre esperado en el techo (Ps. 3.60); 4T con estacionalidad de gastos e incentivos.", en: "Reaffirmed, year-end expected at the high end (Ps. 3.60); 4Q carries expense and incentive seasonality." } },
        loanGrowth: { lo: 18, hi: 20, text: { es: "Reiterada, cierre en la parte media del rango (+24.5% en el 3T24).", en: "Reaffirmed, year-end in the middle of the range (+24.5% at 3Q24)." } },
        opexGrowth: { lo: 14, hi: 14, text: { es: "Alrededor de +14% en el año (+12.4% a septiembre; ~+18% en el 4T por incentivos).", en: "Around +14% for the year (+12.4% at September; ~+18% in 4Q on incentives)." } },
        cor: { lo: 12.9, hi: 12.9, text: { es: "Alrededor de 12.9% (≈12% sin el impacto inesperado de Perú); ~12% en 2025 al normalizarse Perú.", en: "Around 12.9% (≈12% without the unexpected Peru impact); ~12% in 2025 once Peru normalises." } },
        npl: { lo: 3.5, hi: 4.0, text: { es: "3.5% en el 3T24, dentro del rango 3.5%–4%; sólo Perú por encima, con tendencia a la baja desde junio.", en: "3.5% at 3Q24, within the 3.5%–4% range; only Peru above it, trending down since June." } },
        roe: { lo: 20.5, hi: 20.5, text: { es: "Alrededor de 20.5% (piso); 20.5%–23% factible en 2025, sin 25% en el corto plazo.", en: "Around 20.5% (floor); 20.5%–23% feasible in 2025, no 25% in the short run." } },
      },
      notes: { es: ["MIN después de provisiones ~29% en el año; 2025: crecimiento de cartera de doble dígito (mid-teens), comisiones algo por encima de la cartera; dividendo Ps. 0.60 el 14 de noviembre.", "Iván Mancillas nombrado director general de Banco Compartamos el 17 de septiembre de 2024."], en: ["NIM after provisions ~29% for the year; 2025: double-digit (mid-teens) loan growth, fees slightly above loan growth; Ps. 0.60 dividend on 14 November.", "Iván Mancillas appointed CEO of Banco Compartamos on 17 September 2024."] },
    },
    {
      fy: 2025, kind: "initial", date: "2025-02-26", quarter: "2024Q4", call: "2025-02-27",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2025-02-26", title: { es: "Informe 4T24 y conferencia del 27 de febrero de 2025", en: "4Q24 release and call of 27 February 2025" }, transcript: "tools/gentera/raw/text/transcripts/2024Q4-transcript-Gentera_4T24_earnings_call_transcript_2025-02-27.txt" },
      items: {
        eps: { lo: 4.56, hi: 4.71, text: { es: "Crecimiento de UPA +20% a +24% sobre Ps. 3.80 (Ps. 4.56–4.71, rango derivado de los porcentajes guiados).", en: "EPS growth +20% to +24% on Ps. 3.80 (Ps. 4.56–4.71, range derived from the guided percentages)." } },
        loanGrowth: { lo: 13, hi: 16, text: { es: "Cartera +13% a +16%; doble dígito en las tres subsidiarias; individual más rápido en México, grupal más rápido en Perú.", en: "Loans +13% to +16%; double digits at all three lenders; individual faster in Mexico, group faster in Peru." } },
        opexGrowth: { lo: 13, hi: 13, text: { es: "Gastos alrededor de +13%.", en: "Opex around +13%." } },
        cor: { lo: 13, hi: 13, text: { es: "Costo de riesgo alrededor de 13% por la mezcla de cartera.", en: "Cost of risk around 13% on the portfolio mix." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Etapa 3 alrededor de 4% (3.93% al cierre de 2024) con más crédito individual.", en: "Stage 3 around 4% (3.93% at end-2024) with more individual loans." } },
        roe: { lo: 21.5, hi: null, text: { es: "ROE controlador igual o mayor a 21.5%; ROE sostenible de largo plazo 20%–22% y el excedente compartido con clientes.", en: "Controlling ROE at or above 21.5%; long-term sustainable ROE 20%–22%, the remainder shared with clients." } },
      },
      notes: { es: ["MIN ~39%, MIN después de provisiones ~28%, margen financiero ligeramente por encima del techo de la cartera; tasa de referencia al cierre 8.75% en México y 4.75% en Perú; 100 pb = Ps. 580 M antes de impuestos (Ps. 410 M netos); Perú ROE mid-teens y ~8% de la utilidad; dividendo 40% en mayo y noviembre.", "Amortización anticipada de Ps. 200 M del intangible de la base de clientes de ConCrédito en el 4T24; análisis de la compra del 25% restante de ConCrédito durante 2025."], en: ["NIM ~39%, NIM after provisions ~28%, net interest income slightly above the top of the loan range; year-end reference rate 8.75% in Mexico and 4.75% in Peru; 100 bp = Ps. 580 M pre-tax (Ps. 410 M net); Peru ROE mid-teens and ~8% of net income; 40% dividend in May and November.", "Ps. 200 M anticipated amortisation of the ConCrédito client-base intangible in 4Q24; purchase of the remaining 25% of ConCrédito under analysis for 2025."] },
    },
    {
      fy: 2025, kind: "reaffirmed", date: "2025-04-23", quarter: "2025Q1", call: "2025-04-24",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2025-04-23", title: { es: "Informe 1T25 y conferencia del 24 de abril de 2025", en: "1Q25 release and call of 24 April 2025" }, transcript: "tools/gentera/raw/text/transcripts/2025Q1-transcript-Gentera_1T25_earnings_call_transcript_2025-04-24.txt" },
      items: {
        eps: { lo: 4.56, hi: 4.71, text: { es: "Rango sin cambio; cierre esperado en el techo con espacio para +5% adicional; revisión formal en el 2T.", en: "Range unchanged; year-end expected at the high end with room for a further +5%; formal revision in 2Q." } },
        loanGrowth: { lo: 13, hi: 16, text: { es: "Alrededor de 15% (+26.3% en el 1T25).", en: "Around 15% (+26.3% at 1Q25)." } },
        opexGrowth: { lo: 15, hi: 15, text: { es: "Más cerca de +15% que del 13% original: pagos de ventas e incentivos por el mejor desempeño.", en: "Closer to +15% than the original 13%: sales and incentive payments on the better performance." } },
        cor: { lo: 13, hi: 13, text: { es: "Se mantiene ~13% (11.6% en el 1T25) a la espera de las cifras de junio.", en: "Kept at ~13% (11.6% in 1Q25) pending the June numbers." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Alrededor de 4%.", en: "Around 4%." } },
        roe: { lo: 22, hi: 22, text: { es: "Alrededor de 22% (26.3% en el 1T25).", en: "Around 22% (26.3% in 1Q25)." } },
      },
      notes: { es: ["MIN 39.5% en línea; MIN después de provisiones 28%–29%; seguros creciendo en el techo de la cartera (16%–17%); tasa de referencia 8.75% asumida (consenso 8%), 7.75% en 2026.", "Compra del 25.1% restante de ConCrédito prevista para el 2T25; Adolfo Peniche director general de Banco Compartamos Perú desde el 1 de abril de 2025; dividendos 16 de mayo y 28 de noviembre."], en: ["NIM 39.5% in line; NIM after provisions 28%–29%; insurance growing at the top of the loan range (16%–17%); reference rate 8.75% assumed (consensus 8%), 7.75% in 2026.", "Purchase of the remaining 25.1% of ConCrédito expected in 2Q25; Adolfo Peniche CEO of Banco Compartamos Perú from 1 April 2025; dividends 16 May and 28 November."] },
    },
    {
      fy: 2025, kind: "revised", date: "2025-07-23", quarter: "2025Q2", call: "2025-07-23",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2025-07-23", title: { es: "Informe 2T25 y conferencia del 23 de julio de 2025", en: "2Q25 release and call of 23 July 2025" }, transcript: "tools/gentera/raw/text/transcripts/2025Q2-transcript-Gentera_2T25_earnings_call_transcript_2025-07-23.txt" },
      items: {
        eps: { lo: 5.00, hi: 5.15, text: { es: "Subida hasta 10%: Ps. 5.00–5.15 (punto medio ~+32% sobre Ps. 3.80).", en: "Raised by up to 10%: Ps. 5.00–5.15 (midpoint ~+32% on Ps. 3.80)." } },
        loanGrowth: { lo: 13, hi: 16, text: { es: "Reiterada, cierre más cerca del techo (15%–16%).", en: "Reaffirmed, year-end closer to the high end (15%–16%)." } },
        opexGrowth: { lo: 19, hi: 19, text: { es: "Alrededor de +19% (desde 15%): gastos productivos de ventas e incentivos.", en: "Around +19% (from 15%): productive sales and incentive expenses." } },
        cor: { lo: 12.5, hi: 12.5, text: { es: "Alrededor de 12.5% (mejor que el 13% guiado); Perú ~11%; ConCrédito ~25% estructural; individual ~15%, grupal ~10%.", en: "Around 12.5% (better than the 13% guided); Peru ~11%; ConCrédito ~25% structural; individual ~15%, group ~10%." } },
        npl: { lo: 3.5, hi: 4.0, text: { es: "3.32% en el 2T25, por debajo del umbral sano de 3.5%–4%.", en: "3.32% at 2Q25, below the 3.5%–4% healthy threshold." } },
        roe: { lo: 24, hi: 24, text: { es: "Alrededor de 24% (26.3% en el 1S25); Perú ~20% en soles; ConCrédito > 25%.", en: "Around 24% (26.3% in 1H25); Peru ~20% in soles; ConCrédito > 25%." } },
      },
      notes: { es: ["MIN ~41% al cierre, MIN después de provisiones ~30%, comisiones netas ~+25%; plan con tasa de referencia de 8% en México.", "Compra del 25% restante de ConCrédito cerrada (prima ≈Ps. 575 M contra prima en venta de acciones); política de dividendos 40% en principio, revisable si sigue la acumulación de capital; plan de reparto de valor en febrero de 2026."], en: ["NIM ~41% at year-end, NIM after provisions ~30%, net fees ~+25%; plan assumes an 8% reference rate in Mexico.", "Purchase of the remaining 25% of ConCrédito closed (premium ≈Ps. 575 M against share premium); 40% dividend policy kept in principle, reviewable if capital keeps accumulating; value-sharing plan in February 2026."] },
    },
    {
      fy: 2025, kind: "revised", date: "2025-10-22", quarter: "2025Q3", call: "2025-10-22",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2025-10-22", title: { es: "Informe 3T25 y conferencia del 22 de octubre de 2025", en: "3Q25 release and call of 22 October 2025" }, transcript: "tools/gentera/raw/text/transcripts/2025Q3-transcript-Gentera_3T25_earnings_call_transcript_2025-10-22.txt" },
      items: {
        eps: { lo: 5.15, hi: 5.15, text: { es: "Cierre en el techo, Ps. 5.15 (~+36%); guía no subida por mayores gastos e iniciativas estratégicas en el 4T.", en: "Year-end at the high end, Ps. 5.15 (~+36%); guidance not raised because of higher 4Q expenses and strategic initiatives." } },
        loanGrowth: { lo: 13, hi: 16, text: { es: "Rango formal 13%–16% sin cambio; expectativa \"alrededor de 15%\" (+16.4% en el 3T25).", en: "Formal 13%–16% range unchanged; expectation \"around 15%\" (+16.4% at 3Q25)." } },
        opexGrowth: { lo: 20, hi: 20, text: { es: "Alrededor de +20% (incentivos de fin de año).", en: "Around +20% (year-end incentives)." } },
        cor: { lo: 12.5, hi: 12.5, text: { es: "Alrededor de 12.5% aun con las lluvias (≈1% de clientes y cartera afectados); ~13% en 2026.", en: "Around 12.5% even after the floods (≈1% of clients and loans affected); ~13% in 2026." } },
        npl: { lo: 3.5, hi: 4.0, text: { es: "3.42% en el 3T25.", en: "3.42% at 3Q25." } },
        roe: { lo: null, hi: null, text: { es: "Sin cifra nueva: 25.9% a nueve meses, por encima de la expectativa; las tres subsidiarias > 20%.", en: "No new figure: 25.9% for nine months, above expectation; all three lenders > 20%." } },
      },
      notes: { es: ["MIN ~40% y MIN después de provisiones ~30% en 2025; comisiones netas ~+20%; 2026: doble dígito en cartera y UPA, detalle en febrero.", "Tasa efectiva del trimestre elevada por el evento de impuestos diferidos de ConCrédito (reestructura de 2024); reforma fiscal (IPAB, castigos) con efecto marginal de Ps. 40–50 M."], en: ["NIM ~40% and NIM after provisions ~30% for 2025; net fees ~+20%; 2026: double-digit loans and EPS, detail in February.", "Quarter's effective tax rate lifted by ConCrédito's deferred-tax event (2024 restructuring); tax reform (IPAB, write-offs) with a marginal Ps. 40–50 M effect."] },
    },
    {
      fy: 2026, kind: "initial", date: "2026-02-25", quarter: "2025Q4", call: "2026-02-25",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2026-02-25", title: { es: "Informe 4T25 y conferencia del 25 de febrero de 2026", en: "4Q25 release and call of 25 February 2026" }, transcript: "tools/gentera/raw/text/transcripts/2025Q4-transcript-Gentera_4T25_earnings_call_transcript_2026-02-25.txt" },
      items: {
        eps: { lo: 5.88, hi: 6.03, text: { es: "UPA 2026 entre Ps. 5.88 y Ps. 6.03 (+13% a +16% sobre Ps. 5.20); utilidad neta +13% a +16%; utilidad antes de impuestos ~+13% con tasa de 30%.", en: "2026 EPS between Ps. 5.88 and Ps. 6.03 (+13% to +16% on Ps. 5.20); net income +13% to +16%; pre-tax profit ~+13% at a 30% tax rate." } },
        loanGrowth: { lo: 13, hi: 16, text: { es: "Cartera +13% a +16%; doble dígito en las tres subsidiarias en moneda local.", en: "Loans +13% to +16%; double digits at all three lenders in local currency." } },
        opexGrowth: { lo: 12, hi: 13, text: { es: "Gastos +12% a +13% (12%–14% en la sesión de preguntas), incluyendo el programa de lealtad del 2S26; eficiencia ~65%.", en: "Opex +12% to +13% (12%–14% in Q&A), including the 2H26 loyalty programme; efficiency ~65%." } },
        cor: { lo: 13, hi: 13, text: { es: "Costo de riesgo alrededor de 13% (14.5% en el 4T25): grupal 10%–11%, individual 15%–16%.", en: "Cost of risk around 13% (14.5% in 4Q25): group 10%–11%, individual 15%–16%." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Etapa 3 alrededor de 4% en el año.", en: "Stage 3 around 4% for the year." } },
        roe: { lo: 24, hi: 25, text: { es: "ROE controlador 24%–25%, nivel de referencia para los próximos tres años aun con las tres iniciativas de reparto de valor.", en: "Controlling ROE 24%–25%, the reference level for the next three years even after the three value-sharing initiatives." } },
      },
      notes: { es: ["MIN 41%–42%, MIN después de provisiones ~30%, comisiones netas normalizándose hacia el crecimiento de clientes, tasa efectiva ~30%; costo de fondeo al cierre de 2025 7.9% en México (referencia 7%) y 4.9% en Perú (4.25%), con giro hacia fondeo a tasa fija.", "Tres iniciativas: programa de lealtad para clientes en el 2S26, contribución a Fundación Compartamos de 2% a 3% de la utilidad y política de dividendos de hasta 45% (propuesta a la asamblea de abril de 2026).", "4T25: Ps. 500 M en gastos por la nueva metodología de contingencias fiscales de Banco Compartamos y Ps. 328 M por la cancelación del impuesto diferido de ConCrédito (sin ese efecto, ConCrédito ≈Ps. 1,000 M de utilidad)."], en: ["NIM 41%–42%, NIM after provisions ~30%, net fees normalising toward client growth, effective tax rate ~30%; cost of funds at end-2025 7.9% in Mexico (reference 7%) and 4.9% in Peru (4.25%), with a shift toward fixed-rate funding.", "Three initiatives: a customer loyalty programme in 2H26, Fundación Compartamos contribution from 2% to 3% of profit and a dividend policy of up to 45% (proposed to the April 2026 meeting).", "4Q25: Ps. 500 M in opex from Banco Compartamos' new tax-contingency methodology and Ps. 328 M from the ConCrédito deferred-tax cancellation (ConCrédito ≈Ps. 1,000 M net income without it)."] },
    },
    {
      fy: 2026, kind: "reaffirmed", date: "2026-04-22", quarter: "2026Q1",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2026-04-22", title: { es: "Informe 1T26 (22 de abril de 2026)", en: "1Q26 release (22 April 2026)" } },
      items: {
        eps: { lo: 5.88, hi: 6.03, text: { es: "Reiterada: Ps. 5.88–6.03.", en: "Reaffirmed: Ps. 5.88–6.03." } },
        loanGrowth: { lo: 13, hi: 16, text: { es: "Sin cambio respecto a la guía inicial.", en: "Unchanged from the initial guidance." } },
        opexGrowth: { lo: 12, hi: 13, text: { es: "Sin cambio: +10.5% en el 1T26, por debajo del 12%–13% proyectado para el año.", en: "Unchanged: +10.5% in 1Q26, below the 12%–13% projected for the year." } },
        cor: { lo: 13, hi: 13, text: { es: "Sin cambio comunicado en el informe (transcripción de la conferencia 1T26 no suministrada).", en: "No change communicated in the release (1Q26 call transcript not supplied)." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Alrededor de 4%; la etapa 3 subió en el trimestre pero sigue en el rango esperado.", en: "Around 4%; stage 3 rose in the quarter but stays within the expected range." } },
        roe: { lo: 24, hi: 25, text: { es: "Sin cambio comunicado.", en: "No change communicated." } },
      },
      notes: { es: ["Asamblea del 10 de abril de 2026: dividendo de 40% de la utilidad controladora 2025 (≈Ps. 3,285.9 M) en dos pagos (23 de abril y a más tardar 27 de noviembre). El 22 de abril el consejo convocó una asamblea extraordinaria para la política de dividendos de hasta 45% y la contribución de hasta 3% a Fundación Compartamos."], en: ["AGM of 10 April 2026: 40% of 2025 controlling net income (≈Ps. 3,285.9 M) in two instalments (23 April and by 27 November). On 22 April the board called an extraordinary meeting for the up-to-45% dividend policy and the up-to-3% Fundación Compartamos contribution."] },
    },
    {
      fy: 2026, kind: "revised", date: "2026-07-22", quarter: "2026Q2",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2026-07-22", title: { es: "Informe 2T26 (22 de julio de 2026)", en: "2Q26 release (22 July 2026)" } },
      items: {
        eps: { lo: 5.88, hi: 6.03, text: { es: "Reiterada: Ps. 5.88–6.03 (13%–16%); 1S26: Ps. 2.98.", en: "Reaffirmed: Ps. 5.88–6.03 (13%–16%); 1H26: Ps. 2.98." } },
        loanGrowth: { lo: 6, hi: 9, text: { es: "\"Crecimiento más prudente\" de ~6% a 9% hacia finales del año (desde 13%–16%) tras un segundo trimestre plano en Banco Compartamos.", en: "\"More prudent growth\" of ~6% to 9% toward year-end (from 13%–16%) after a flat second quarter at Banco Compartamos." } },
        opexGrowth: { lo: null, hi: 12, text: { es: "+7.7% en el 2T26 y +9.0% en el 1S26, por debajo de la expectativa original de 12%–13%; foco en eficiencias el resto del año.", en: "+7.7% in 2Q26 and +9.0% in 1H26, below the original 12%–13% expectation; efficiency focus for the rest of the year." } },
        cor: { lo: 13, hi: 13, text: { es: "Sin cifra nueva en el informe: 14.5% en el 2T26 y 13.7% en el 1S26 contra ~13% guiado (transcripción no suministrada).", en: "No new figure in the release: 14.5% in 2Q26 and 13.7% in 1H26 against the ~13% guided (transcript not supplied)." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Alrededor de 4%; 2T26 en 4.04%, dentro del rango esperado.", en: "Around 4%; 2Q26 at 4.04%, within the expected range." } },
        roe: { lo: 24, hi: 25, text: { es: "Sin cifra nueva: ROE controlador 24.5% en el 2T26 (25.9% en el 2T25).", en: "No new figure: controlling ROE 24.5% in 2Q26 (25.9% in 2Q25)." } },
      },
      notes: { es: ["La administración privilegia la calidad de la cartera sobre el crecimiento: el banco se contrajo 1.5% en el trimestre con la etapa 3 individual en 6.12%."], en: ["Management is prioritising asset quality over growth: the bank shrank 1.5% in the quarter with individual-loan stage 3 at 6.12%."] },
    },
  ],
};
