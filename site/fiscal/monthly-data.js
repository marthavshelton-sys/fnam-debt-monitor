// Research-only figures with no machine-readable primary source. Everything else the page shows
// (debt, rates and the FOMC target range, holders, revenue/outlays, interest, maturity, TIC, GDP, the
// Fed balance sheet, the macro readings in the CBO table) is fetched from Treasury, the Fed and FRED
// twice a day into data.js by the data refresh, and data.js always wins.
//
// This file is maintained by the automated research routine "FNAM US Fiscal: CBO / FedWatch research", which
// commits directly to main on Mondays, Wednesdays and Fridays (Friday is the first run after a
// Wednesday FOMC decision), only when
// it can cite the primary publisher (or, for CBO figures, two independent reputable outlets quoting
// CBO), and records its sources in the `sources` block below and in the commit message. Rules:
//   - valid JSON inside the assignment (double-quoted keys, no trailing commas, no comments here)
//   - keep every key; update values in place; never publish a figure you could not source
//   - cboYears: the calendar/fiscal years of the columns in cboCategoryTable and cboGdpRow (one entry
//     per column, ascending); the page prints them as the table headers
//   - cboCategoryTable / cboGdpRow: direct:true = CBO's own published number for that exact year,
//     direct:false = interpolation between CBO's nearest published anchor years; the deficit row must
//     equal total outlays minus total revenue and the "everything else" outlay row the remainder of
//     total outlays; cboOutlaysT holds CBO's outlays in $ trillions for the published years (used to
//     derive nominal GDP as outlays / outlays-to-GDP)
//   - cboProjection: debt held by the public, percent of GDP, one label per year with a value only
//     where CBO states one; cboRecordYear is the first year CBO says it passes the 1946 record (106%)
//     and must be a labelled year with a value >= 106; the page composes the Section 06 sentence
//     from these keys, never from hand-written prose
//   - cboAssumptions: CBO's economic assumptions for the first projection year (first) and the
//     10-year average (avg): realGdp, cpi, tenYear, unemployment, in percent
//   - cboPublished / cboTitle / cboUrl: the baseline's publication date (YYYY-MM-DD), title and
//     cbo.gov link; the page prints the vintage ("February 2026") and the source links from them.
//     Every CBO key changes together when a new baseline is adopted; a baseline older than about
//     14 months is flagged as stale (CBO publishes one each January or February)
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
// days, predates the latest decision, or lists a meeting already held, and when the CBO blocks are
// inconsistent (column count vs cboYears, deficit != outlays - revenue, cboRecordYear not backed by
// cboProjection, a cboProjection year that is not the baseline's first year).
window.MONTHLY_DATA = {
  "cboYears": [
    2026,
    2030,
    2036
  ],
  "cboRecordYear": 2030,
  "cboPublished": "2026-02-11",
  "cboTitle": "The Budget and Economic Outlook: 2026 to 2036",
  "cboUrl": "https://www.cbo.gov/publication/61882",
  "cboOutlaysT": {
    "2026": 7.4,
    "2036": 11.4
  },
  "cboGdpRow": {
    "label": "Nominal GDP ($ trillions)",
    "vals": [
      {
        "v": 31.8,
        "direct": false
      },
      {
        "v": 37.1,
        "direct": false
      },
      {
        "v": 46.7,
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
          "v": 17.5,
          "direct": true
        },
        {
          "v": 17.6,
          "direct": false
        },
        {
          "v": 17.8,
          "direct": true
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
          "v": 5.5,
          "direct": false
        },
        {
          "v": 5.9,
          "direct": true
        }
      ]
    },
    {
      "label": "— Net interest",
      "bold": false,
      "vals": [
        {
          "v": 3.3,
          "direct": true
        },
        {
          "v": 3.8,
          "direct": false
        },
        {
          "v": 4.6,
          "direct": true
        }
      ]
    },
    {
      "label": "— Health programs, defense, other discretionary & other mandatory",
      "bold": false,
      "vals": [
        {
          "v": 14.8,
          "direct": false
        },
        {
          "v": 14.4,
          "direct": false
        },
        {
          "v": 13.9,
          "direct": false
        }
      ]
    },
    {
      "label": "Deficit (outlays − revenue)",
      "bold": true,
      "vals": [
        {
          "v": 5.8,
          "direct": true
        },
        {
          "v": 6.1,
          "direct": false
        },
        {
          "v": 6.7,
          "direct": true
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
      "2036"
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
      120
    ]
  },
  "cboAssumptions": {
    "realGdp": {
      "first": 2.2,
      "avg": 1.8
    },
    "cpi": {
      "first": 2.9,
      "avg": 2.3
    },
    "tenYear": {
      "first": 4.1,
      "avg": 4.4
    },
    "unemployment": {
      "first": 4.6,
      "avg": 4.3
    }
  },
  "fedWatch": {
    "asOf": "2026-10-05",
    "meetings": [
      "28-Oct-2026",
      "09-Dec-2026"
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
        0,
        0
      ],
      [
        77.9,
        11.4
      ],
      [
        22.1,
        62.3
      ],
      [
        0,
        24.3
      ],
      [
        0,
        2.1
      ]
    ],
    "sourceName": "Phemex News (quoting CME FedWatch)",
    "sourceNameEs": "Phemex News (citando CME FedWatch)",
    "sourceUrl": "https://phemex.com/news/article/cme-fedwatch-779-probability-fed-holds-rates-in-october-98766",
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
    "cbo": "Congressional Budget Office, The Budget and Economic Outlook: 2026 to 2036 (February 2026, https://www.cbo.gov/publication/61882; cbo.gov answers HTTP 403 to scripts), as quoted on 2026-09-29 by two independent outlets: Committee for a Responsible Federal Budget, \"CBO's February 2026 Budget and Economic Outlook\" (2026-02-11, https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook): deficit $1.8T = 5.8% of GDP in 2025 rising to $3.1T = 6.7% in 2036; debt held by the public 99% of GDP (2025) to 120% (2036); net interest 3.3% (2026) to 4.6% (2036); and American Action Forum, \"Highlights of CBO's February 2026 Budget and Economic Outlook\" (https://www.americanactionforum.org/insight/highlights-of-cbos-february-2026-budget-and-economic-outlook/): revenues 17.5% of GDP ($5.6T) in 2026 and 17.8% ($8.3T) in 2036; outlays 23.3% ($7.4T) in 2026 and 24.4% ($11.4T) in 2036; deficit 5.8% in 2026; Social Security 5.2% to 5.9%; debt 101% (2026), 108% (2030), 120% (2036), surpassing the 1946 high of 106% in 2030 (also The Hill, \"National debt may surpass historical high by 2030: CBO\", https://thehill.com/business/5733818-cbo-federal-deficit-debt-projections/). Economic assumptions (same outlook, via CRFB/AAF): real GDP growth 2.2% in 2026 and 1.8% a year on average in 2031-2036; CPI 2.9% in 2026 and 2.3% average; 10-year yield 4.1% in 2026 rising to 4.4%; unemployment 4.6% in 2026 and 4.3% average. cboYears are the years each column belongs to: 2026 and 2036 are CBO's published figures (direct:true), 2030 is a linear interpolation, the 'everything else' outlay row is total outlays minus Social Security and net interest, and nominal GDP is CBO's outlays divided by its outlays-to-GDP ratio (cboOutlaysT). The health-programs row and the 2040 column of the earlier table were dropped: their figures could not be confirmed against this baseline (they came from CBO's January 2025 baseline and March 2025 long-term outlook).",
    "fedWatch": "Phemex News, \"CME FedWatch: 77.9% Chance Fed Holds Rates in October\", 2026-10-05 (https://phemex.com/news/article/cme-fedwatch-779-probability-fed-holds-rates-in-october-98766): October, \"77.9% probability that the Federal Reserve will maintain current interest rates through October, with a 22.1% chance of a cumulative 25 basis point hike\"; December, \"only an 11.4% probability of rates remaining unchanged, while a cumulative 25 basis point hike carries a 62.3% likelihood. A 50 basis point cumulative increase is priced at 24.3%, with a 75 basis point hike at just 2.1%.\" The article gives cumulative moves from the current 3.75-4.00% target range, so they map one to one onto the buckets: unchanged = 3.75-4.00%, +25 bp = 4.00-4.25%, +50 bp = 4.25-4.50%, +75 bp = 4.50-4.75% (the December column sums to 100.1 as printed). Cross-check: Investing.com's Fed Rate Monitor (CME 30-day fed fund futures, 2026-10-03) put the December 4.25-4.50% bucket at 18.4%. Replaces the CNBC 2026-10-05 snapshot (binary 22% October hike / 87% December hike reading, which this file had placed entirely in the 4.00-4.25% bucket; now superseded by the full distribution). CME's tool and Investing.com answer 403 to scripts.",
    "tbac": "Treasury Borrowing Advisory Committee quarterly refunding presentations (Feb 2021, Aug 2023, Feb 2026) for the historical anchors"
  }
};
