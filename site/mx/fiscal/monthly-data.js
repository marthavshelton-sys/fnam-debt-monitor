// Refreshed monthly by a scheduled research task, which opens a pull request for human review
// rather than publishing directly — these series come from SHCP's monthly "Finanzas públicas y
// deuda pública" release (last business day of the following month), the Quarterly Reports and
// Banxico's holdings tables, none of which the daily Banxico SIE job can pull mechanically.
// Initial values below mirror the snapshot baked into index.html, so this file is a no-op until
// the first monthly PR is reviewed and merged.
// Units: bn = billones de pesos (10^12); mmdp / "MXN bn" = miles de millones de pesos (10^9); pct = % of GDP.
window.MONTHLY_DATA_MX = {
  "release": "SHCP Comunicado 70, 28-Aug-2026 (data through July 2026)",
  "shrfsp": { "date": "2026-07-31", "bn": 19.2, "pct": 51.5, "yoyBn": 1.4, "yoyRealPct": 3.7 },
  "grossDebtBn": 20.6036,
  "gfNetPct": 48.3,
  "externalDebtUsdBn": 159.8466,
  "externalFx": 18.7,
  "holdersAsOf": "2026-04-30",
  "holdersTotal": 15366.0,
  "holders": [
    { "g": 9, "label": "Residentes en el extranjero", "value": 1788.5, "est": false },
    { "g": 2, "label": "Siefores (ahorro para el retiro)", "value": 5116.9, "est": true },
    { "g": 2, "label": "Sociedades de inversión", "value": 3042.5, "est": true },
    { "g": 2, "label": "Otros residentes (bancos, aseguradoras, Banxico, otros)", "value": 5418.1, "est": true }
  ],
  "revYTDcur": [1700.0, 1041.0, 401.7, 264.6],
  "revYTDpri": [1747.0, 911.4, 379.1, 241.3],
  "outYTD": { "total": 5742, "vsProgram": -438, "pensions": 1000, "investment": 454, "deficit": -746, "primary": 13, "rfsp": 727.5 },
  "rfspValues": [2.2, 2.3, 3.9, 3.8, 4.3, 4.3, 5.7, 4.4, 4.1, 3.9],
  "pemexDebtUsdBn": 77.5
};
