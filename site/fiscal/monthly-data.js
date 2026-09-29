// Research-only figures with no machine-readable primary source. Everything else the page shows
// (debt, rates and the FOMC target range, holders, revenue/outlays, interest, maturity, TIC, GDP, the
// Fed balance sheet, the macro readings in the CBO table) is fetched from Treasury, the Fed and FRED
// twice a day into data.js by scripts/fetch-data.mjs, and data.js always wins.
//
// This file is maintained by the cloud routine "FNAM US Fiscal: CBO / FedWatch research", which
// commits directly to main on Mondays and Thursdays (the morning after an FOMC decision), only when
// it can cite the primary publisher (or, for CBO figures, two independent reputable outlets quoting
// CBO), and records its sources in the `sources` block below and in the commit message. Rules:
//   - valid JSON inside the assignment (double-quoted keys, no trailing commas, no comments here)
//   - keep every key; update values in place; never publish a figure you could not source
//   - cboCategoryTable / cboGdpRow: direct:true = CBO's own published number for that exact year,
//     direct:false = interpolation between CBO's nearest published anchor years
//   - fedWatch: meetings are the upcoming FOMC decision dates (dd-Mon-yyyy, federalreserve.gov
//     calendar) for which a named outlet quoted CME FedWatch odds on `asOf` - one to four of them,
//     never a meeting already held; probs rows align to buckets, inner arrays to meetings, each
//     column sums to ~100; buckets are five 25 bp ranges centred on the FOMC target range in
//     data.js (targetRange.lower/upper); sourceName/sourceNameEs/sourceUrl name the outlet and
//     article the odds were taken from. The page composes the callout prose itself from these
//     numbers (calloutEn/calloutEs are ignored), drops meetings once they have taken place, and
//     shows a notice when asOf predates the latest FOMC decision (data.js targetRange.since).
//   - tbac.history: the first two entries are fixed TBAC anchors; the LAST entry is overwritten
//     every day by the page from the MSPD-computed average maturity, so leave it alone
// scripts/fiscal/check-freshness.mjs flags this file when the FedWatch snapshot is older than 14
// days, predates the latest decision, or lists a meeting already held.
window.MONTHLY_DATA = {
  "cboGdpRow": {
    "label": "Nominal GDP ($ trillions)",
    "vals": [
      {
        "v": 30.0,
        "direct": false
      },
      {
        "v": 36.7,
        "direct": false
      },
      {
        "v": 43.9,
        "direct": true
      },
      {
        "v": 54.5,
        "direct": false
      }
    ]
  },
  "cboCategoryTable": [
    {
      "label": "Total revenue",
      "bold": true,
      "vals": [
        {
          "v": 17.2,
          "direct": true
        },
        {
          "v": 17.6,
          "direct": false
        },
        {
          "v": 17.8,
          "direct": false
        },
        {
          "v": 18.2,
          "direct": false
        }
      ]
    },
    {
      "label": "Total outlays",
      "bold": true,
      "vals": [
        {
          "v": 23.3,
          "direct": true
        },
        {
          "v": 23.7,
          "direct": false
        },
        {
          "v": 24.4,
          "direct": true
        },
        {
          "v": 25.2,
          "direct": false
        }
      ]
    },
    {
      "label": "— Social Security",
      "bold": false,
      "vals": [
        {
          "v": 5.2,
          "direct": true
        },
        {
          "v": 5.4,
          "direct": false
        },
        {
          "v": 5.5,
          "direct": false
        },
        {
          "v": 5.7,
          "direct": false
        }
      ]
    },
    {
      "label": "— Medicare & Medicaid/CHIP",
      "bold": false,
      "vals": [
        {
          "v": 5.8,
          "direct": true
        },
        {
          "v": 6.2,
          "direct": false
        },
        {
          "v": 6.6,
          "direct": false
        },
        {
          "v": 7.0,
          "direct": false
        }
      ]
    },
    {
      "label": "— Net interest",
      "bold": false,
      "vals": [
        {
          "v": 3.2,
          "direct": true
        },
        {
          "v": 3.8,
          "direct": false
        },
        {
          "v": 4.1,
          "direct": true
        },
        {
          "v": 4.4,
          "direct": false
        }
      ]
    },
    {
      "label": "— Defense, other discretionary & other mandatory",
      "bold": false,
      "vals": [
        {
          "v": 9.1,
          "direct": false
        },
        {
          "v": 8.3,
          "direct": false
        },
        {
          "v": 8.2,
          "direct": false
        },
        {
          "v": 8.1,
          "direct": false
        }
      ]
    },
    {
      "label": "Deficit (outlays − revenue)",
      "bold": true,
      "vals": [
        {
          "v": 6.1,
          "direct": false
        },
        {
          "v": 6.1,
          "direct": false
        },
        {
          "v": 6.6,
          "direct": false
        },
        {
          "v": 7.0,
          "direct": false
        }
      ]
    }
  ],
  "cboProjection": {
    "labels": [
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
      "2031",
      "2032",
      "2033",
      "2034",
      "2035",
      "2036",
      "2037",
      "2038",
      "2039",
      "2040"
    ],
    "values": [
      99,
      101,
      null,
      null,
      null,
      108,
      null,
      null,
      null,
      null,
      null,
      120,
      null,
      null,
      null,
      129
    ]
  },
  "fedWatch": {
    "asOf": "2026-09-24",
    "meetings": [
      "28-Oct-2026"
    ],
    "buckets": [
      "3.50–3.75%",
      "3.75–4.00%",
      "4.00–4.25%",
      "4.25–4.50%",
      "4.50–4.75%"
    ],
    "probs": [
      [
        0
      ],
      [
        22.5
      ],
      [
        77.5
      ],
      [
        0
      ],
      [
        0
      ]
    ],
    "sourceName": "CNBC (quoting CME FedWatch)",
    "sourceNameEs": "CNBC (citando CME FedWatch)",
    "sourceUrl": "https://www.cnbc.com/2026/09/24/feds-williams-another-rate-hike-by-year-end.html",
    "calloutEn": null,
    "calloutEs": null
  },
  "tbac": {
    "history": [
      {
        "label": "Dec 2020",
        "labelEs": "dic. 2020",
        "months": 65
      },
      {
        "label": "May 2023 peak",
        "labelEs": "máximo de mayo 2023",
        "months": 75
      },
      {
        "label": "Dec 2025",
        "labelEs": "dic. 2025",
        "months": 70
      }
    ]
  },
  "sources": {
    "cbo": "Congressional Budget Office, The Budget and Economic Outlook: 2026 to 2036 (February 2026) and The Long-Term Budget Outlook: 2025 to 2055 (March 2025), as carried on the page's Section 06 links",
    "fedWatch": "CNBC, \"New York Fed's Williams says it's 'reasonable' to expect another rate hike by year-end\", 2026-09-24: \"CME Group's FedWatch tool put the probability of an October raise at 77.5% on Thursday, up from around 53% on Wednesday\" (https://www.cnbc.com/2026/09/24/feds-williams-another-rate-hike-by-year-end.html); the remainder is shown as no change at 3.75-4.00%. Later meetings are omitted until an outlet quotes their full distribution; CME's tool and Investing.com's Fed Rate Monitor answer 403 to scripts.",
    "tbac": "Treasury Borrowing Advisory Committee quarterly refunding presentations (Feb 2021, Aug 2023, Feb 2026) for the historical anchors"
  }
};
