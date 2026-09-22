// Management expectations ("expectativas") for the Quálitas model. Quálitas does not publish formal guidance
// or targets; each January (with the 4Q results) it gives directional expectations for the year and
// reiterates or nuances them on the quarterly calls. One entry per statement, in date order, with the
// source (results report page or earnings call). Ranges are the model's numeric reading of the words
// (e.g. "high single digits to low double digits" = 7% to 12%); `text` keeps the wording.
// Long-term references that do not change: loss-ratio technical range 62–65%, combined-ratio target
// 92–94%, ROE 20–25%, dividend policy 40–90% of net income.
window.Q_GUIDANCE = {
  updatedAt: "2026-09-22",
  basis: "Growth vs the prior fiscal year in %, ratios as levels in %. Loss ratio = claims cost / earned premiums; combined ratio = acquisition (on retained) + loss (on earned) + operating (on written) ratios, Quálitas' definitions.",
  metrics: ["written", "earned", "lossRatio", "combined", "rif", "roe"],
  longTerm: { lossRatio: { lo: 62, hi: 65 }, combined: { lo: 92, hi: 94 }, roe: { lo: 20, hi: 25 }, payout: { lo: 40, hi: 90 } },
  vintages: [
    {
      fy: 2024, kind: "initial", date: "2024-01-25", quarter: "2023Q4",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2023/trimestral/4T/mx/Q-Reporte_de_resultados_4T23.pdf", date: "2024-01-25", title: { es: "Informe 4T23 y conferencia de resultados (26 ene 2024)", en: "4Q23 report and earnings call (26 Jan 2024)" } },
      items: {
        written: { lo: 15, hi: 19, text: { es: "Crecimiento de dos dígitos medios a altos ('mid- to high-teens'), impulsado por el arrastre de tarifas de 2023 y nuevos precios; unidades de dígito bajo a medio", en: "Mid- to high-teens growth, driven by the 2023 tariff carry-over and new pricing; units low- to mid-single digit" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Seguir avanzando hacia el rango técnico de 62%–65%; cerca de los objetivos y mejor que los últimos tres años", en: "Continue making progress towards the 62%–65% technical range; close to targets and better than the past three years" } },
        combined: { lo: 90, hi: 94, text: { es: "Objetivo de 90%–94% (2023 cerró en 96%); margen operativo objetivo 5%–7%", en: "90%–94% target (2023 closed at 96%); operating-margin target 5%–7%" } },
        roe: { lo: 20, hi: 25, text: { es: "Objetivo de largo plazo 20%–25%", en: "Long-term objective 20%–25%" } },
      },
      notes: { es: ["La administración recuerda que no publica guía formal, sólo expectativas generales.", "Portafolio: migración gradual a la asignación objetivo de ETFs aprovechando el tipo de cambio."], en: ["Management reiterates it gives no formal guidance, only overall expectations.", "Portfolio: gradual migration to the target ETF allocation, taking advantage of FX levels."] },
    },
    {
      fy: 2024, kind: "reaffirmed", date: "2024-04-18", quarter: "2024Q1",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2024/trimestral/1T/mx/Q-Reporte_de_resultados_1T24.pdf", date: "2024-04-18", title: { es: "Conferencia de resultados 1T24 (19 abr 2024)", en: "1Q24 earnings call (19 Apr 2024)" } },
      items: {
        written: { lo: 15, hi: 19, text: { es: "Se mantiene el crecimiento de dos dígitos medios a altos, con un primer semestre más fuerte por el calendario de precios", en: "Mid- to high-teens growth maintained, with a stronger first half given the pricing calendar" } },
        lossRatio: { lo: 62, hi: 65 },
        combined: { lo: 90, hi: 94, text: { es: "89.4% en el 1T, por debajo del objetivo de 90%–94% (efectos de Semana Santa y menor robo); índice de operación de 3%–4% sostenible", en: "89.4% in 1Q, below the 90%–94% target (Holy Week and lower theft); a 3%–4% operating ratio should hold" } },
        roe: { lo: 20, hi: 25 },
      },
      notes: { es: ["Se esperan mayores bonos a agentes (índice de adquisición) si primas y siniestralidad siguen la tendencia."], en: ["Higher agent bonuses (acquisition ratio) expected if premiums and the loss ratio keep their trend."] },
    },
    {
      fy: 2024, kind: "revised", date: "2024-10-17", quarter: "2024Q3",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2024/trimestral/3T/mx/Q-Reporte_de_resultados_3T24.pdf", date: "2024-10-17", title: { es: "Conferencia de resultados 3T24 (18 oct 2024)", en: "3Q24 earnings call (18 Oct 2024)" } },
      items: {
        written: { lo: 15, hi: 19, text: { es: "Desaceleración secuencial al diluirse el beneficio de los precios de 2023; la prima devengada crecerá más rápido al estabilizarse la emisión", en: "Sequential slowdown as the 2023 pricing benefit fades; earned premiums to grow faster once written growth stabilises" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Acumulado México 64.9%, consistente con el rango; mejora en el 4T por estacionalidad", en: "Mexico YTD 64.9%, consistent with the range; 4Q improvement on seasonality" } },
        combined: { lo: 92, hi: 94, text: { es: "Objetivo reexpresado como 92%–94%; acumulado dentro del rango", en: "Target restated as 92%–94%; year-to-date within the range" } },
        roe: { lo: 20, hi: 25, text: { es: "ROE 12M 22.4%, dentro del objetivo de largo plazo", en: "12M ROE 22.4%, within the long-term objective" } },
      },
      notes: { es: ["Quálitas Salud: punto de equilibrio esperado en 2026. Duración del portafolio ≈1.7 años al cierre de 2024."], en: ["Quálitas Salud: breakeven expected by 2026. Portfolio duration ≈1.7 years by end-2024."] },
    },
    {
      fy: 2025, kind: "initial", date: "2025-01-27", quarter: "2024Q4",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2024/trimestral/4T/mx/Q-Reporte_de_resultados_4T24.pdf", date: "2025-01-27", title: { es: "Conferencia de resultados 4T24 y 2024 (28 ene 2025)", en: "4Q24 and FY2024 earnings call (28 Jan 2025)" } },
      items: {
        written: { lo: 7, hi: 15, text: { es: "Dígito alto a bajos-medios dos dígitos, con ventas de autos nuevos (AMDA) creciendo menos", en: "High single digits to low-mid teens, with new-car sales (AMDA) slowing" } },
        earned: { text: { es: "Creciendo por encima de la prima emitida", en: "Growing ahead of written premiums" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Seguir avanzando hacia el rango técnico de 62%–65%; estacionalidad histórica por trimestre", en: "Continue making progress towards the 62%–65% technical range; usual quarterly seasonality" } },
        combined: { lo: 92, hi: 94, text: { es: "Razones dentro de los rangos objetivo", en: "Ratios within the target ranges" } },
        rif: { text: { es: "Portafolio resiliente pese a la baja de tasas", en: "Resilient portfolio despite easing rates" } },
        roe: { lo: 20, hi: 25, text: { es: "Objetivo de largo plazo 20%–25%", en: "Long-term objective 20%–25%" } },
      },
      notes: { es: ["Dividendo esperado en la parte alta de la política de 40%–90% de la utilidad; sin dividendo extraordinario por la volatilidad esperada en 2025."], en: ["Dividend expected at the high end of the 40%–90% payout policy; no extraordinary dividend given the volatility expected in 2025."] },
    },
    {
      fy: 2025, kind: "reaffirmed", date: "2025-04-22", quarter: "2025Q1",
      source: { url: "https://qinversionistas.qualitas.com.mx/storage/informes/2025/trimestral/1T/mx/Reporte Trimestral 1T25.pdf", date: "2025-04-22", title: { es: "Conferencia de resultados 1T25 (23 abr 2025)", en: "1Q25 earnings call (23 Apr 2025)" } },
      items: {
        written: { lo: 7, hi: 15, text: { es: "Se mantiene: dígito alto a bajos-medios dos dígitos; prima devengada creciendo por encima", en: "Maintained: high single digits to low-mid teens; earned premiums growing ahead" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Dentro del rango 62%–65%", en: "Within the 62%–65% range" } },
        combined: { lo: 92, hi: 94, text: { es: "Dentro de los rangos objetivo", en: "Within the target ranges" } },
        roe: { lo: 20, hi: 25 },
      },
      notes: { es: ["Asamblea del 29 abr 2025: dividendo de Ps. 10.0 por acción en dos exhibiciones (78% de pago) y fondo de recompra de Ps. 800 M."], en: ["AGM of 29 Apr 2025: dividend of Ps. 10.0 per share in two instalments (78% payout) and a Ps. 800 M buyback fund."] },
    },
    {
      fy: 2025, kind: "reaffirmed", date: "2025-07-18", quarter: "2025Q2",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2025/trimestral/2T/mx/Reporte_Trimestral_2T25.pdf", date: "2025-07-18", title: { es: "Conferencia de resultados 2T25 (21 jul 2025)", en: "2Q25 earnings call (21 Jul 2025)" } },
      items: {
        written: { lo: 7, hi: 13, text: { es: "Reafirmado: dígito alto a bajos dos dígitos (low teens)", en: "Reaffirmed: high single digits to low teens" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Indicadores dentro de los niveles objetivo; el ROE se moderaría hacia 20%–25% al normalizarse la frecuencia en el 2S", en: "KPIs within target levels; ROE to moderate towards 20%–25% as frequency normalises in 2H" } },
        combined: { lo: 92, hi: 94 },
        roe: { lo: 20, hi: 25 },
      },
      notes: { es: [], en: [] },
    },
    {
      fy: 2025, kind: "reaffirmed", date: "2025-10-21", quarter: "2025Q3",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2025/trimestral/3T/mx/Q-Reporte_Trimestral_3T25.pdf", date: "2025-10-21", title: { es: "Conferencia de resultados 3T25 (22 oct 2025)", en: "3Q25 earnings call (22 Oct 2025)" } },
      items: {
        written: { lo: 7, hi: 13, text: { es: "Reafirmado: dígito alto a bajos dos dígitos", en: "Reaffirmed: high single digits to low teens" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Indicadores dentro de rango; pendiente el impacto no recurrente del IVA en el 4T25 (Ley de Ingresos 2026)", en: "KPIs within range; one-time VAT impact pending for 4Q25 (2026 Revenue Law)" } },
        combined: { lo: 92, hi: 94 },
        roe: { lo: 20, hi: 25 },
      },
      notes: { es: ["El 17 oct 2025 se presentó al Congreso la reserva a la Ley de Ingresos 2026 sobre el IVA en siniestros; el Consejo aprobó adherirse: cargo único en 2025 y mayor costo de siniestros desde 2026."], en: ["On 17 Oct 2025 the 2026 Revenue Law amendment on VAT in claims was submitted to Congress; the Board approved adhering: a one-off 2025 charge and a higher claims cost from 2026."] },
    },
    {
      fy: 2026, kind: "initial", date: "2026-01-28", quarter: "2025Q4",
      source: { url: "https://qinversionistas.qualitas.com.mx/uploads/informes/2025/trimestral/4T/mx/Q - Reporte Trimestral 4T25 y 2025.pdf", date: "2026-01-28", title: { es: "Informe 4T25 (p. 4, Expectativas para 2026) y conferencia del 29 ene 2026", en: "4Q25 report (p. 4, Expectations for 2026) and the 29 Jan 2026 call" } },
      items: {
        written: { lo: 7, hi: 12, text: { es: "Dígito alto a bajos dos dígitos; ventas de autos nuevos (AMDA) +0.2% a +2.0%", en: "High single digits to low double digits; new-car sales (AMDA) +0.2% to +2.0%" } },
        earned: { text: { es: "Unos puntos por encima de la emitida", en: "A few points ahead of written premiums" } },
        lossRatio: { lo: 62, hi: 66, text: { es: "En la parte alta o ligeramente por encima de 62%–65%, normalizándose en el año conforme se absorbe el IVA; 1T y 1S por encima del objetivo", en: "At the higher end or slightly above 62%–65%, normalising through the year as VAT is absorbed; 1Q and 1H above target" } },
        combined: { lo: 92, hi: 95, text: { es: "Extremo superior de 92%–94% o ligeramente por encima; adquisición y operación en niveles históricos", en: "Upper end of 92%–94% or slightly higher; acquisition and operating ratios at historical levels" } },
        rif: { text: { es: "Consistente con 2025 en estrategia (duración en renta fija); en monto absoluto probablemente menor, pero por encima de las tasas de referencia", en: "Consistent with 2025 in strategy (fixed-income duration); likely lower in absolute terms but above reference rates" } },
        roe: { lo: 18, hi: 20, text: { es: "ROE en 20% o ligeramente por debajo", en: "ROE at 20% or slightly below" } },
      },
      notes: { es: ["La tarifa media sube cerca de la inflación (modelo multivariable); gran parte del impacto del IVA lo absorbe Quálitas para mantener la propuesta de valor.", "Dividendo esperado dentro de la política de 40%–90%."], en: ["Average tariff rises close to inflation (multivariable model); a large part of the VAT impact is absorbed by Quálitas to keep the value proposition.", "Dividend expected within the 40%–90% policy."] },
    },
    {
      fy: 2026, kind: "reaffirmed", date: "2026-04-22", quarter: "2026Q1",
      source: { url: "https://qinversionistas.qualitas.com.mx/storage/informes/2026/trimestral/1T/mx/Q - Reporte Trimestral 1T26.pdf", date: "2026-04-22", title: { es: "Conferencia de resultados 1T26 (23 abr 2026)", en: "1Q26 earnings call (23 Apr 2026)" } },
      items: {
        written: { lo: 7, hi: 12, text: { es: "Se mantiene dígito alto a bajos dos dígitos pese al +15.3% del 1T (flotillas impulsadas por pocas cuentas grandes)", en: "High single to low double digits maintained despite +15.3% in 1Q (fleets boosted by a few large accounts)" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Dentro de 62%–65% en el año incluyendo el IVA; el 2S sube por estacionalidad", en: "Within 62%–65% for the year including VAT; 2H rises with seasonality" } },
        combined: { lo: 92, hi: 95, text: { es: "Extremo superior de 92%–94% o ligeramente por encima", en: "Upper end of 92%–94% or slightly above" } },
        roe: { lo: 18, hi: 20, text: { es: "Meta de 20%, posiblemente ligeramente por debajo", en: "Aim of 20%, possibly slightly below" } },
      },
      notes: { es: ["Asamblea del 29 abr 2026: dividendo de Ps. 9.0 por acción (71% de pago) en dos exhibiciones y nuevo fondo de recompra de Ps. 800 M."], en: ["AGM of 29 Apr 2026: dividend of Ps. 9.0 per share (71% payout) in two instalments and a new Ps. 800 M buyback fund."] },
    },
    {
      fy: 2026, kind: "revised", date: "2026-07-21", quarter: "2026Q2",
      source: { url: "https://qinversionistas.qualitas.com.mx/storage/informes/2026/trimestral/2T/mx/Q - Reporte Trimestral 2T26 VFF2.pdf", date: "2026-07-21", title: { es: "Conferencia de resultados 2T26 (22 jul 2026, sesión de preguntas)", en: "2Q26 earnings call (22 Jul 2026, Q&A)" } },
      items: {
        written: { lo: 5, hi: 9, text: { es: "Recortado a dígito medio-alto por la agresividad en precios y un 2S más apretado (cuenta multianual que redujo cobertura: −3 pp en el 2T)", en: "Cut to mid-to-high single digits on aggressive pricing and a tighter 2H (a multi-year account that reduced coverage: −3 pp in 2Q)" } },
        lossRatio: { lo: 62, hi: 65, text: { es: "Acumulado 63.7% con ~320 pb de IVA; meta anual dentro del rango pese a lluvias tempranas", en: "YTD 63.7% including ~320 bp of VAT; full-year goal within the range despite the early rainy season" } },
        combined: { lo: 92, hi: 95, text: { es: "En o ligeramente por encima de 92%–94% (acumulado 92.8%)", en: "At or slightly above 92%–94% (YTD 92.8%)" } },
        rif: { text: { es: "≈ Ps. 1.1–1.2 mil M por trimestre más ganancias no realizadas que se materialicen", en: "≈ Ps. 1.1–1.2 bn per quarter plus any unrealised gains crystallised" } },
        roe: { lo: 18, hi: 20, text: { es: "Cercano al 20%", en: "Close to 20%" } },
      },
      notes: { es: ["Sin nuevos eventos no recurrentes esperados en cuentas grandes; se mantiene la inversión en Quálitas Salud, Colombia, TI y servicio.", "Principales riesgos: recortes de precios por más tiempo y aranceles a autopartes asiáticas."], en: ["No further one-off coverage changes expected in large accounts; investment in Quálitas Salud, Colombia, IT and service maintained.", "Main risks: price cuts lasting longer and tariffs on Asian spare parts."] },
    },
  ],
};
