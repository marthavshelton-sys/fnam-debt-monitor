// CURATED by hand from the companies' own filings (BMV/SEC releases and quarterly reports) — not generated.
// Each cell is a short list of bullets plus the ids of the sources it was read from (`src`); the sources
// themselves are numbered in `sources` and printed once under the table. Figures are quoted as the filings
// state them, in the constant pesos of each regulatory period. A figure computed from a filing (not quoted)
// is listed in the cell's `calc` and the bullet says how it was computed; scripts/aeropuertos/verify-sources.mjs
// searches every other figure in the cited filings. Every row shows the same year for the three groups.
// Re-read the latest quarterly report and the next MDP approval before changing a cell; update `updatedAt`.
window.MX_AIRPORTS_REG = {
  updatedAt: "2026-09-29",
  companies: [
    { key: "GAP", name: "GAP", full: "Grupo Aeroportuario del Pacífico", href: "/gap/" },
    { key: "OMA", name: "OMA", full: "Grupo Aeroportuario del Centro Norte", href: "/oma/" },
    { key: "ASUR", name: "ASUR", full: "Grupo Aeroportuario del Sureste", href: "/asur/" }
  ],
  intro: {
    es: "Concesiones federales reguladas por la SICT a través de la AFAC: cada cinco años se aprueban el Programa Maestro de Desarrollo (PMD, inversiones comprometidas) y las tarifas máximas por unidad de tráfico (un pasajero o 100 kg de carga) de cada aeropuerto. Cifras vigentes según las propias empresas; los números entre corchetes remiten a las fuentes al pie.",
    en: "Federal concessions regulated by SICT through AFAC: every five years each airport's Master Development Program (MDP, committed investments) and maximum tariffs per workload unit (one passenger or 100 kg of cargo) are approved. Figures in force as the companies report them; bracketed numbers point to the sources below the table."
  },
  sources: {
    gapMdp:  { label: { es: "GAP, comunicado 27-ago-2024 (6-K): PMD y tarifas máximas 2025–2029", en: "GAP release Aug 27, 2024 (6-K): MDP and maximum tariffs 2025–2029" }, url: "https://www.globenewswire.com/news-release/2024/08/27/2936661/0/en/grupo-aeroportuario-del-pacifico-announces-master-development-program-and-maximum-tariffs-for-its-mexican-airports-for-the-2025-2029-period.html" },
    gap4q24: { label: { es: "GAP, informe 4T24, 25-feb-2025 (6-K)", en: "GAP 4Q24 report, Feb 25, 2025 (6-K)" }, url: "https://www.globenewswire.com/news-release/2025/02/25/3031645/0/en/grupo-aeroportuario-del-pacifico-announces-results-for-the-fourth-quarter-of-2024.html" },
    gap2q26: { label: { es: "GAP, informe 2T26, 14-jul-2026 (6-K)", en: "GAP 2Q26 report, Jul 14, 2026 (6-K)" }, url: "https://www.globenewswire.com/news-release/2026/07/14/3326564/0/en/grupo-aeroportuario-del-pacifico-announces-results-for-the-second-quarter-of-2026.html" },
    omaMdp:  { label: { es: "OMA, comunicado 18-dic-2025: PMD y tarifas máximas 2026–2030", en: "OMA release Dec 18, 2025: MDP and maximum tariffs 2026–2030" }, url: "https://ir.oma.aero/wp-content/uploads/2025/12/OMA_MDP_reset_2026_2030_vf.pdf" },
    oma1q25: { label: { es: "OMA, informe 1T25, 28-abr-2025", en: "OMA 1Q25 report, Apr 28, 2025" }, url: "https://ir.oma.aero/wp-content/uploads/2025/04/OMA_1Q25_Results_vf.pdf" },
    oma2q26: { label: { es: "OMA, informe 2T26, 27-jul-2026", en: "OMA 2Q26 report, Jul 27, 2026" }, url: "https://miranda-newswire.com/wp-content/uploads/2026/07/Results_2Q26_vf.pdf" },
    asur4q23:{ label: { es: "ASUR, informe 4T23, 26-feb-2024, pp. 8–9: PMD y tarifas máximas 2024–2028", en: "ASUR 4Q23 report, Feb 26, 2024, pp. 8–9: MDP and maximum tariffs 2024–2028" }, url: "https://www.asur.com.mx/media/Informes%20Financieros/2023/4/ASUR-Airport-Cancun-Mexico-Earnings-Release-4Q23.pdf" },
    asur1q24:{ label: { es: "ASUR, informe 1T24, 22-abr-2024", en: "ASUR 1Q24 report, Apr 22, 2024" }, url: "https://www.asur.com.mx/media/Informes%20Financieros/2024/1/ASUR-Airport-Cancun-Mexico-Earnings-Release-1Q24.pdf" },
    asur2q26:{ label: { es: "ASUR, informe 2T26, 23-jul-2026, pp. 13, 15 y 18", en: "ASUR 2Q26 report, Jul 23, 2026, pp. 13, 15 and 18" }, url: "https://www.asur.com.mx/media/Informes%20Financieros/2026/2/ASUR-Airport-Cancun-Mexico-Earnings-Release-2Q26.pdf.pdf" }
  },
  rows: [
    {
      id: "period",
      label: { es: "Periodo Regulatorio Vigente", en: "Regulatory Period in Force" },
      cells: {
        GAP:  { es: ["PMD y tarifas máximas 2025–2029, 12 aeropuertos", "Aprobado por la SICT/AFAC, 27-ago-2024", "Bases tarifarias del Anexo 7 vigentes desde 19-oct-2023"],
                en: ["MDP and maximum tariffs 2025–2029, 12 airports", "Approved by SICT/AFAC, Aug 27, 2024", "Annex 7 tariff rules in force since Oct 19, 2023"], src: ["gapMdp"] },
        OMA:  { es: ["PMD y tarifas máximas 2026–2030, 13 aeropuertos", "Aprobado por la SICT/AFAC, 18-dic-2025", "2026 es el primer año del quinquenio"],
                en: ["MDP and maximum tariffs 2026–2030, 13 airports", "Approved by SICT/AFAC, Dec 18, 2025", "2026 is the first year of the period"], src: ["omaMdp"] },
        ASUR: { es: ["PMD y tarifas máximas 2024–2028, 9 aeropuertos", "Aprobado por la SICT, 13-dic-2023", "Bases tarifarias modificadas notificadas el 19-oct-2023"],
                en: ["MDP and maximum tariffs 2024–2028, 9 airports", "Approved by SICT, Dec 13, 2023", "Amended tariff rules notified Oct 19, 2023"], src: ["asur4q23"] }
      }
    },
    {
      id: "capex",
      label: { es: "Inversiones Comprometidas (PMD)", en: "Committed Investments (MDP)" },
      cells: {
        GAP:  { es: ["Ps. 43,185 M en 2025–2029 (pesos de dic-2022)", "Guadalajara 18,884 M (44%), Tijuana 7,971 M, Los Cabos 5,614 M", "Por año: 10,947 / 7,361 / 8,788 / 6,852 / 9,237 M"],
                en: ["Ps. 43,185 M over 2025–2029 (Dec-2022 pesos)", "Guadalajara 18,884 M (44%), Tijuana 7,971 M, Los Cabos 5,614 M", "By year: 10,947 / 7,361 / 8,788 / 6,852 / 9,237 M"], src: ["gapMdp"] },
        OMA:  { es: ["Ps. 16,005 M en 2026–2030 (pesos de dic-2024)", "Monterrey 7,969 M (50%), Culiacán 1,207 M, Cd. Juárez 1,186 M", "Por año: 1,152 / 2,466 / 3,904 / 4,280 / 4,203 M"],
                en: ["Ps. 16,005 M over 2026–2030 (Dec-2024 pesos)", "Monterrey 7,969 M (50%), Culiacán 1,207 M, Cd. Juárez 1,186 M", "By year: 1,152 / 2,466 / 3,904 / 4,280 / 4,203 M"], src: ["omaMdp"] },
        ASUR: { es: ["Ps. 28,496 M en 2024–2028 (pesos de dic-2022)", "Cancún 21,477 M (75%), Oaxaca 2,121 M, Mérida 1,900 M", "Por año: 3,575 / 6,232 / 7,086 / 5,053 / 6,550 M", "Indicativo (no vinculante): 7,120 M en 2029–2033"],
                en: ["Ps. 28,496 M over 2024–2028 (Dec-2022 pesos)", "Cancún 21,477 M (75%), Oaxaca 2,121 M, Mérida 1,900 M", "By year: 3,575 / 6,232 / 7,086 / 5,053 / 6,550 M", "Indicative (non-binding): 7,120 M in 2029–2033"], src: ["asur4q23"] }
      }
    },
    {
      id: "tariff",
      label: { es: "Tarifa Máxima por Unidad de Tráfico, 2026", en: "Maximum Tariff per Workload Unit, 2026" },
      cells: {
        GAP:  { es: ["2026, pesos de dic-2023: Guadalajara Ps. 346.65, Tijuana 264.31, Los Cabos 520.01", "Rango: Mexicali 250.43 – Los Cabos 520.01", "−0.8% real al año (factor de eficiencia)", "Se actualiza con el INPP sin petróleo"],
                en: ["2026, Dec-2023 pesos: Guadalajara Ps. 346.65, Tijuana 264.31, Los Cabos 520.01", "Range: Mexicali 250.43 – Los Cabos 520.01", "−0.8% a year in real terms (efficiency factor)", "Updated by the producer price index ex-petroleum"], src: ["gapMdp"] },
        OMA:  { es: ["2026, pesos de dic-2024: Monterrey Ps. 354.23, Culiacán 378.34, Chihuahua 373.04", "Rango: San Luis Potosí 338.13 – Zihuatanejo 456.39", "−0.8% real al año (Monterrey 343.03 en 2030)"],
                en: ["2026, Dec-2024 pesos: Monterrey Ps. 354.23, Culiacán 378.34, Chihuahua 373.04", "Range: San Luis Potosí 338.13 – Zihuatanejo 456.39", "−0.8% a year in real terms (Monterrey 343.03 by 2030)"], src: ["omaMdp"] },
        ASUR: { es: ["2026, pesos de dic-2022: Cancún Ps. 327.11, Mérida 278.72, Oaxaca 329.79", "Rango: Veracruz 262.04 – Minatitlán 494.33", "Calculadas: ASUR publica solo las tarifas de 2024 (Cancún 332.41, Veracruz 266.28, Minatitlán 502.34) y −0.80% real al año hasta 2028; 2026 = 2024 × 0.992²", "Tarifa implícita cobrada 1S26: Ps. 353.8 (pesos de dic-2025)"],
                en: ["2026, Dec-2022 pesos: Cancún Ps. 327.11, Mérida 278.72, Oaxaca 329.79", "Range: Veracruz 262.04 – Minatitlán 494.33", "Computed: ASUR publishes only the 2024 tariffs (Cancún 332.41, Veracruz 266.28, Minatitlán 502.34) and −0.80% a year in real terms through 2028; 2026 = 2024 × 0.992²", "Implicit tariff charged 1H26: Ps. 353.8 (Dec-2025 pesos)"],
                calc: ["327.11", "278.72", "329.79", "262.04", "494.33", "0.992"], src: ["asur4q23", "asur2q26"] }
      }
    },
    {
      id: "fee",
      label: { es: "Derecho de Concesión", en: "Concession Fee" },
      cells: {
        GAP:  { es: ["9% de los ingresos desde 1-ene-2024 (antes 5%)", "Costo adicional 2024: Ps. 148.8 M"],
                en: ["9% of revenue since Jan 1, 2024 (5% before)", "Extra cost in 2024: Ps. 148.8 M"], src: ["gap4q24"] },
        OMA:  { es: ["9% desde 1-ene-2024 (antes 5%)", "Los 4 puntos extra: Ps. 99.2 M en el 1T25 (3.1% de los ingresos)", "2T26: Ps. 293.8 M (+3.9% a/a)"],
                en: ["9% since Jan 1, 2024 (5% before)", "The extra 4 points: Ps. 99.2 M in 1Q25 (3.1% of revenue)", "2Q26: Ps. 293.8 M (+3.9% y/y)"], src: ["oma1q25", "oma2q26"] },
        ASUR: { es: ["9% desde 1-ene-2024 (antes 5%), aeropuertos mexicanos"],
                en: ["9% since Jan 1, 2024 (5% before), Mexican airports"], src: ["asur1q24"] }
      }
    },
    {
      id: "latest",
      label: { es: "Última Lectura (2T26)", en: "Latest Reading (2Q26)" },
      cells: {
        GAP:  { es: ["Ingresos aeronáuticos en México −0.7% a/a (tráfico −4.2%, peso +10.9%)", "Compensado en parte por las tarifas máximas 2025–2029", "1S26: +4.4% por la misma razón"],
                en: ["Mexican aeronautical revenue −0.7% y/y (traffic −4.2%, peso +10.9%)", "Partly offset by the 2025–2029 maximum tariffs", "1H26: +4.4% for the same reason"], src: ["gap2q26"] },
        OMA:  { es: ["Inversiones PMD y estratégicas 1S26: Ps. 2,709 M (−21.7% a/a)", "2T26: Ps. 949 M (−2.7% a/a): 844 M en mejoras a bienes concesionados, 21 M en mantenimiento mayor y 84 M estratégicas"],
                en: ["MDP and strategic investments 1H26: Ps. 2,709 M (−21.7% y/y)", "2Q26: Ps. 949 M (−2.7% y/y): 844 M improvements to concession assets, 21 M major maintenance and 84 M strategic"], src: ["oma2q26"] },
        ASUR: { es: ["Ingreso regulado acumulado en México: Ps. 7,458.9 M al 30-jun-2026", "≈69.4% de los ingresos sin construcción", "Cumplimiento revisado por la SICT cada cierre de año", "Capex México 1S26: Ps. 2,173.1 M"],
                en: ["Accumulated regulated revenue in Mexico: Ps. 7,458.9 M at Jun 30, 2026", "≈69.4% of revenue ex-construction", "Compliance reviewed by SICT at each year-end", "Mexico capex 1H26: Ps. 2,173.1 M"], src: ["asur2q26"] }
      }
    },
    {
      id: "abroad",
      label: { es: "Fuera de México", en: "Outside Mexico" }, // already Title Case in both languages
      cells: {
        GAP:  { es: ["Jamaica (Montego Bay, Kingston): contraprestación proporcional a los ingresos", "2T26: −20.8% por menores ingresos en Montego Bay"],
                en: ["Jamaica (Montego Bay, Kingston): fee is a share of revenue", "2Q26: −20.8% on lower revenue at Montego Bay"], src: ["gap2q26"] },
        OMA:  { es: ["No aplica: los 13 aeropuertos están en México"],
                en: ["Not applicable: all 13 airports are in Mexico"], src: ["omaMdp"] },
        ASUR: { es: ["Puerto Rico (San Juan): contribución de las aerolíneas US$62.0 M al año, cinco años; después indexada al IPC", "Colombia (6 aeropuertos): tarifas de la Aeronáutica Civil (Res. 04530, 2007)", "Ingreso regulado Colombia 2T26: Ps. 642.2 M"],
                en: ["Puerto Rico (San Juan): airline contribution US$62.0 M a year for five years; CPI-indexed thereafter", "Colombia (6 airports): tariffs set by Civil Aeronautics (Res. 04530, 2007)", "Colombia regulated revenue 2Q26: Ps. 642.2 M"], src: ["asur2q26"] }
      }
    }
  ]
};
