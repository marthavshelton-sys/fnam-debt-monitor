// Document-sourced figures for the Mexico fiscal monitor: values that exist only in PDFs and
// press releases (Paquete Económico / CGPE, Plan Anual de Financiamiento, Ley de Ingresos,
// Presupuesto de Egresos, Pemex quarterly reports, rating actions, Banxico's decision calendar,
// the analysts' survey). Everything with a time series lives in data.js and is refreshed daily by
// scripts/mx-fiscal/fetch.mjs; this file is refreshed by a weekly Claude routine that re-reads the
// documents and opens a pull request when a value changed. Every block carries `asOf` (the
// document's date) and the page prints it next to the figures. `approx: true` marks values taken
// from press coverage rather than the official table; the page shows them with "~".
window.MX_DOCS = {
  "updatedAt": "2026-09-18",
  "cgpe": {
    "title": "Criterios Generales de Política Económica 2027",
    "url": "https://www.finanzaspublicas.hacienda.gob.mx/es/Finanzas_Publicas/Paquete_Economico_y_Presupuesto",
    "asOf": "2026-09-08",
    "approx": true,
    "shrfspPct": { "2026": 52.3, "2027": 55.0 },
    "rfspPct": { "2026": 4.1, "2027": 3.9 },
    "budgetDeficitPct": { "2026": 3.0, "2027": 3.4 },
    "gdpNominalBn": { "2026": 37.2 },
    "taxRevenuePct": { "2027": 15.9 },
    "analystsSource": { "es": "Encuesta Citi, ago. 2026", "en": "Citi survey, Aug 2026" },
    "rows": [
      { "es": "Crecimiento del PIB real", "en": "Real GDP growth", "shcp2026": "1.0–2.0%", "analysts2026": "1.2%", "shcp2027": "1.5–2.5%", "analysts2027": "1.8%" },
      { "es": "Inflación, cierre de año", "en": "Inflation, year-end", "shcp2026": "3.5%", "analysts2026": "4.15%", "shcp2027": "3.0%", "analysts2027": "3.84%" },
      { "es": "Tipo de cambio, cierre de año", "en": "Exchange rate, year-end", "shcp2026": "—", "analysts2026": "17.92", "shcp2027": "18.0", "analysts2027": "18.50" },
      { "es": "Tasa objetivo, cierre de año", "en": "Target rate, year-end", "shcp2026": "—", "analysts2026": "6.50%", "shcp2027": "—", "analysts2027": "6.50%" },
      { "es": "Cetes 28 días, promedio", "en": "28-day Cetes, average", "shcp2026": "—", "analysts2026": "—", "shcp2027": "6.00%", "analysts2027": "—" },
      { "es": "Mezcla mexicana, US$/barril", "en": "Mexican crude basket, USD/bbl", "shcp2026": "—", "analysts2026": "—", "shcp2027": "61.8", "analysts2027": "—" },
      { "es": "RFSP, % del PIB", "en": "RFSP, % of GDP", "shcp2026": "4.1%", "analysts2026": "—", "shcp2027": "3.9%", "analysts2027": "—" },
      { "es": "Déficit presupuestario, % del PIB", "en": "Budget deficit, % of GDP", "shcp2026": "3.0%", "analysts2026": "—", "shcp2027": "3.4%", "analysts2027": "—" }
    ]
  },
  "paf": {
    "title": "Plan Anual de Financiamiento 2026",
    "url": "https://www.finanzaspublicas.hacienda.gob.mx/work/models/Finanzas_Publicas/docs/paquete_economico/paf/paf_2026.pdf",
    "asOf": "2025-12-19",
    "avgMaturityDomesticYears": 7.9,
    "avgMaturityExternalYears": 15.6,
    "fixedRateSharePct": 79.4,
    "externalCapPct": 15.8,
    "amortizations": { "asOf": "2025-12-31", "labels": ["2026", "2027", "2028", "2029", "2030", "2031"], "values": [3163.1, 1934.8, 1048.3, 1150.7, 398.7, 1074.0] }
  },
  "lif": {
    "title": "Ley de Ingresos de la Federación 2026",
    "url": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LIF_2026.pdf",
    "asOf": "2025-11-30",
    "netBorrowingBn": 1780,
    "domesticBn": 1700,
    "externalUsdBn": 15.5,
    "revenueBn": { "tributarios": 5839.0, "petroleros": 1204.2, "otros": 1677.8 }
  },
  "pef": {
    "title": "Presupuesto de Egresos de la Federación 2026",
    "url": "https://www.diputados.gob.mx/LeyesBiblio/pdf/PEF_2026.pdf",
    "asOf": "2025-11-30",
    "totalBn": 10193.7,
    "costoFinancieroBn": 1572.1,
    "costoFinancieroPctGdp": 4.1,
    "pensionesBn": 1716.6,
    "participacionesBn": 1456.0,
    "adefasBn": 70.9,
    "programableBn": 7094.7,
    "noProgramableBn": 3099.0
  },
  "ratings": {
    "asOf": "2026-05-20",
    "items": [
      { "agency": "Moody's", "rating": "Baa3", "outlook": { "es": "estable", "en": "stable" }, "date": "2026-05-20", "note": { "es": "rebaja desde Baa2", "en": "cut from Baa2" } },
      { "agency": "S&P Global", "rating": "BBB", "outlook": { "es": "negativa", "en": "negative" }, "date": "2026-05-20" },
      { "agency": "Fitch", "rating": "BBB−", "outlook": { "es": "estable", "en": "stable" }, "date": "2026-05-20" }
    ]
  },
  "pemex": {
    "title": "Pemex, reporte trimestral 2T26",
    "url": "https://www.pemex.com/ri/finanzas/Paginas/default.aspx",
    "asOf": "2026-07-31",
    "debtUsdBn": { "labels": ["2018", "2020", "2022", "2024", "2025", "jun '26"], "values": [105.8, 110.3, 107.7, 97.6, 84.5, 77.5], "est": [false, true, true, false, false, false] },
    "supportBn": { "2025": 396 },
    "capitalContributionsBn": { "period": { "es": "1er semestre de 2026", "en": "H1 2026" }, "value": 100, "cap2026": 177 },
    "pcapsUsdBn": 12,
    "maturities2026UsdBn": 18.7,
    "suppliersBn": { "value": 517, "asOf": "2025-09-30" }
  },
  "survey": {
    "title": { "es": "Encuesta Citi México de expectativas", "en": "Citi Mexico expectations survey" },
    "asOf": "2026-08-31",
    "institutions": 35,
    "nextMove": { "hold": 22, "hike": 7, "cut": 6 },
    "rateEnd": { "2026": 6.50, "2027": 6.50 },
    "inflationEnd": { "2026": 4.15, "2027": 3.84 },
    "fxEnd": { "2026": 17.92, "2027": 18.50 }
  },
  "banxico": {
    "calendarUrl": "https://www.banxico.org.mx/publicaciones-y-prensa/anuncios-de-las-decisiones-de-politica-monetaria/anuncios-politica-monetaria-t.html",
    "decisionDates": ["2026-02-05", "2026-03-26", "2026-05-07", "2026-06-25", "2026-08-06", "2026-09-24", "2026-11-05", "2026-12-17"],
    "fedFunds": { "asOf": "2026-09-17", "value": 3.63 },
    "fclUsdBn": { "asOf": "2025-11-30", "value": 24 }
  }
};
