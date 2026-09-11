// Refreshed monthly by a scheduled research task, which opens a pull request for human
// review rather than publishing directly — these series either have no live API (CBO) or
// need hierarchy-aware aggregation Treasury's raw tables don't hand you directly (holders,
// revenue/outlay by category). Initial values below mirror the snapshot baked into
// index.html, so this file is a no-op until the first monthly PR is reviewed and merged.
window.MONTHLY_DATA = {
  "asOf": "Mar 31, 2026",
  "revOutAsOf": "Aug 31, 2026",
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
  "revYTDcur": [2548.00,1663.28,294.86,167.31,92.92,36.03,43.05],
  "revYTDpri": [2357.63,1614.36,389.61,165.19,93.16,26.43,44.58],
  "outFY2025": [1646.52,1884.28,868.41,1458.91,376.59,775.26],
  "outYTDcur": [1586.73,1822.38,832.63,1520.32,395.06,653.93],
  "outYTDpri": [1512.60,1769.79,796.96,1396.30,359.33,829.28]
};
