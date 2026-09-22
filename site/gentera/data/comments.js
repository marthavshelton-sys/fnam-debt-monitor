// Hand-written, bilingual one-line explanations of year-over-year changes for the Gentera model, keyed by
// period: a quarter (`2026Q2`), a year-to-date period (`2026M6`) or a fiscal year (`FY2025`). `lines` are income
// statement rows (keys = layout keys in financials.js), `bs` balance-sheet rows, `ops` operating-metric rows.
// Written from the management discussion in the corresponding press releases (Gentera publishes no
// earnings-call transcripts). The page shows them only when period A is compared with the same period a
// year earlier; for other pairs it generates mechanical driver-based comments. Add a block for each new
// quarter by reviewed commit (see tools/gentera/README.md).
window.G_COMMENTS = {
 "updatedAt": "2026-09-22",
 "periods": {
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
     "es": "+13.9% anual, +3.4% secuencial: margen financiero +13.9%, comisiones netas +14.2%, otros ingresos +12%; la línea superior sigue impulsada por la cartera.",
     "en": "+13.9% YoY, +3.4% QoQ: financial margin +13.9%, net fees +14.2%, other income +12%; the top line is still driven by the loan book."
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
     "es": "+11.8% anual, −5.6% secuencial: en el trimestre, provisiones (+13.2%) y gastos (+3.3%) crecieron más que los ingresos (+3.4%).",
     "en": "+11.8% YoY, −5.6% QoQ: sequentially, provisions (+13.2%) and opex (+3.3%) outgrew revenue (+3.4%)."
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
   "call": {
    "es": "Gentera no publica transcripciones de sus conferencias de resultados; comentarios elaborados a partir de la discusión de la administración en el informe trimestral.",
    "en": "Gentera publishes no earnings-call transcripts; comments are written from the management discussion in the quarterly release."
   },
   "source": "Press release 2T26"
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
     "es": "+14.8%; MIN del semestre 40.6% vs 40.2% porque el costo de fondeo cayó más rápido que la tasa activa.",
     "en": "+14.8%; 1H NIM 40.6% vs 40.2% as funding cost fell faster than the yield."
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
   "call": {
    "es": "Gentera no publica transcripciones de sus conferencias de resultados; comentarios elaborados a partir de la discusión de la administración en el informe trimestral.",
    "en": "Gentera publishes no earnings-call transcripts; comments are written from the management discussion in the quarterly release."
   },
   "source": "Press releases 1T26 y 2T26"
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
     "es": "+22.9%; MIN 41.0% vs 39.8% al dejar de subir el costo de fondeo.",
     "en": "+22.9%; NIM 41.0% vs 39.8% as funding cost stopped rising."
    },
    "prov": {
     "es": "+21.7%; costo de riesgo 12.9% vs 11.6%; etapa 3 al cierre 3.83% vs 3.93%, así que el aumento es volumen más una mayor mezcla de crédito individual.",
     "en": "+21.7%; cost of risk 12.9% vs 11.6%; year-end stage-3 3.83% vs 3.93%, so the increase is volume plus a bigger individual-loan mix."
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
   "call": {
    "es": "Gentera no publica transcripciones de sus conferencias de resultados; comentarios elaborados a partir de la discusión de la administración en el informe trimestral.",
    "en": "Gentera publishes no earnings-call transcripts; comments are written from the management discussion in the quarterly release."
   },
   "source": "Press release 4T25"
  }
 }
};
