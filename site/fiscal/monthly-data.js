// Research-only figures with no machine-readable primary source. Everything else the page shows
// (debt, rates, holders, revenue/outlays, interest, maturity, TIC, GDP) is fetched from Treasury,
// the Fed and FRED every day into data.js by scripts/fetch-data.mjs, and data.js always wins.
//
// This file is maintained by the cloud routine "FNAM US Fiscal: monthly CBO/FedWatch research",
// which commits directly to main on the 5th of each month, only when it can cite the primary
// publisher (or, for CBO figures, two independent reputable outlets quoting CBO), and records
// its sources in the `sources` block below and in the commit message. Rules of the road:
//   - valid JSON inside the assignment (double-quoted keys, no trailing commas, no comments here)
//   - keep every key; update values in place; never publish a figure you could not source
//   - cboCategoryTable / cboGdpRow: direct:true = CBO's own published number for that exact year,
//     direct:false = interpolation between CBO's nearest published anchor years
//   - fedWatch: probs rows align to buckets, inner arrays to meetings; buckets are centred on the
//     current FOMC target range (data.js rates.onrrp.value = range floor); calloutEn/calloutEs are
//     finished dashboard prose (HTML, <b> only) that replace the page's callout verbatim
//   - tbac.history: the first two entries are fixed TBAC anchors; the LAST entry is overwritten
//     every day by the page from the MSPD-computed average maturity, so leave it alone
window.MONTHLY_DATA = {
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
    "history": [
      { "label": "Dec 2020", "labelEs": "dic. 2020", "months": 65 },
      { "label": "May 2023 peak", "labelEs": "máximo de mayo 2023", "months": 75 },
      { "label": "Dec 2025", "labelEs": "dic. 2025", "months": 70 }
    ]
  },
  "sources": {
    "cbo": "Congressional Budget Office, The Budget and Economic Outlook: 2026 to 2036 (February 2026) and The Long-Term Budget Outlook: 2025 to 2055 (March 2025), as carried on the page's Section 06 links",
    "fedWatch": "CME Group FedWatch methodology, odds as reported by Investing.com's Fed Rate Monitor on 2026-09-10",
    "tbac": "Treasury Borrowing Advisory Committee quarterly refunding presentations (Feb 2021, Aug 2023, Feb 2026) for the historical anchors"
  }
};
