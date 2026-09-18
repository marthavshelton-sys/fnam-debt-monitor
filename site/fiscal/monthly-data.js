// Refreshed monthly by a scheduled research task, which opens a pull request for human
// review rather than publishing directly — these series either have no live API (CBO,
// CME FedWatch odds, TBAC maturity statistics) or need hierarchy-aware aggregation
// Treasury's raw tables don't hand you directly (holders, revenue/outlay by category).
// Initial values below mirror the snapshot baked into index.html, so this file is a no-op
// until the first monthly PR is reviewed and merged.
window.MONTHLY_DATA = {
  "asOf": "Mar 31, 2026",
  "revOutAsOf": "Jul 31, 2026",
  "holders": [
    { "g": 9, "label": "Foreign & international", "value": 9355.0 },
    { "g": 2, "label": "Other U.S. investors", "value": 6824.7 },
    { "g": 0, "label": "Intragovernmental (trust funds)", "value": 7634.2 },
    { "g": 1, "label": "Federal Reserve (SOMA)", "value": 4390.1 },
    { "g": 2, "label": "Mutual funds", "value": 5122.8 },
    { "g": 2, "label": "Depository institutions", "value": 2169.5 },
    { "g": 2, "label": "State & local governments", "value": 1641.6 },
    { "g": 2, "label": "Private pension funds", "value": 607.0 },
    { "g": 2, "label": "Insurance companies", "value": 597.9 },
    { "g": 2, "label": "State/local pension funds", "value": 573.9 },
    { "g": 2, "label": "Savings bonds (individuals)", "value": 148.8 }
  ],
  "cboGdpRow": { "label": "Nominal GDP ($ trillions)", "vals": [
    {"v":30.0,"direct":false},{"v":36.7,"direct":false},{"v":43.9,"direct":true},{"v":54.5,"direct":false} ] },
  "cboCategoryTable": [
    { "label": "Total revenue", "bold": true, "vals": [
      {"v":17.2,"direct":true},{"v":17.6,"direct":false},{"v":17.8,"direct":false},{"v":18.2,"direct":false} ] },
    { "label": "Total outlays", "bold": true, "vals": [
      {"v":23.3,"direct":true},{"v":23.7,"direct":false},{"v":24.4,"direct":true},{"v":25.2,"direct":false} ] },
    { "label": "— Social Security", "bold": false, "vals": [
      {"v":5.2,"direct":true},{"v":5.4,"direct":false},{"v":5.5,"direct":false},{"v":5.7,"direct":false} ] },
    { "label": "— Medicare & Medicaid/CHIP", "bold": false, "vals": [
      {"v":5.8,"direct":true},{"v":6.2,"direct":false},{"v":6.6,"direct":false},{"v":7.0,"direct":false} ] },
    { "label": "— Net interest", "bold": false, "vals": [
      {"v":3.2,"direct":true},{"v":3.8,"direct":false},{"v":4.1,"direct":true},{"v":4.4,"direct":false} ] },
    { "label": "— Defense, other discretionary & other mandatory", "bold": false, "vals": [
      {"v":9.1,"direct":false},{"v":8.3,"direct":false},{"v":8.2,"direct":false},{"v":8.1,"direct":false} ] },
    { "label": "Deficit (outlays − revenue)", "bold": true, "vals": [
      {"v":6.1,"direct":false},{"v":6.1,"direct":false},{"v":6.6,"direct":false},{"v":7.0,"direct":false} ] }
  ],
  "cboProjection": {
    "labels": ["2025","2026","2027","2028","2029","2030","2031","2032","2033","2034","2035","2036","2037","2038","2039","2040"],
    "values": [99, 101, null, null, null, 108, null, null, null, null, null, 120, null, null, null, 129]
  },
  "revFY2025": [2656.04,1748.29,452.09,194.87,105.94,29.46,47.92],
  "revYTDcur": [2368.96,1522.75,292.91,154.47,84.62,34.01,27.71],
  "revYTDpri": [2204.49,1480.32,387.11,135.69,84.93,24.09,30.01],
  "outFY2025": [1646.52,1884.28,868.41,1458.91,376.59,775.26],
  "outYTDcur": [1444.99,1724.89,764.71,1407.36,360.05,582.24],
  "outYTDpri": [1368.38,1557.01,718.94,1266.66,309.56,754.60],
  "cashInterestT": 1.170,
  "accruedInterestT": 1.268,
  "accruedInterestAsOf": "2026-08-31",
  "fedWatch": {
    "asOf": "2026-09-10",
    "meetings": ["16-Sep-2026","28-Oct-2026","09-Dec-2026","27-Jan-2027"],
    "buckets": ["3.50–3.75%","3.75–4.00%","4.00–4.25%","4.25–4.50%","4.50–4.75%"],
    "probs": [
      [30.4, 20.0, 6.9, 4.1],
      [69.6, 56.1, 32.4, 22.1],
      [0,    24.0, 45.0, 39.9],
      [0,    0,    15.7, 27.6],
      [0,    0,    0,    6.4]
    ],
    "calloutEn": null,
    "calloutEs": null
  },
  "tbac": {
    "asOf": "2025-12",
    "avgMaturityMonths": 70,
    "history": [
      { "label": "Dec 2020", "labelEs": "dic. 2020", "months": 65 },
      { "label": "May 2023 peak", "labelEs": "máximo de mayo 2023", "months": 75 },
      { "label": "Dec 2025", "labelEs": "dic. 2025", "months": 70 }
    ]
  }
};
