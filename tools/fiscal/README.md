# U.S. Fiscal Debt Monitor — fnam.mx/fiscal

Bilingual (EN default on this page, ES via the toggle) dashboard of the federal debt, its holders,
maturity structure, cost, composition, debt-to-GDP, revenues and outlays, then the Fed's balance
sheet, policy rates and instruments. One file, `site/fiscal/index.html`, renders everything in the
browser from two data files; the page has no hand-typed figures left in it.

## How it stays current

| File | What it holds | Who writes it | When |
|---|---|---|---|
| `site/fiscal/data.js` (`window.LIVE_DATA`) | every Treasury, Federal Reserve and FRED series the page shows | `scripts/fetch-data.mjs`, run by `.github/workflows/refresh-data.yml` | 13:15 and 21:30 UTC daily |
| `site/fiscal/monthly-data.js` (`window.MONTHLY_DATA`) | the figures with no machine-readable source: CBO projection tables, the CME FedWatch snapshot, the two fixed TBAC maturity anchors | the Claude routine "FNAM US Fiscal: CBO / FedWatch research", which commits to `main` | Mondays and Thursdays 15:00 UTC (Thursday = the morning after an FOMC decision) |

`data.js` always wins; the monthly file is only read where `data.js` has nothing. If a series
fails to fetch it is `null` for that run and the page keeps its last baked value for it, so the
page always renders.

### What `fetch-data.mjs` pulls

Treasury Fiscal Data (no key): Debt to the Penny (latest day, the last completed fiscal year-end
and calendar year-end, the first close above the latest whole trillion), Average Interest Rates
(all interest-bearing, marketable, non-marketable, plus the prior fiscal year-end), MSPD table 1
(every security class, Treasury's own totals, the non-marketable pieces), MSPD table 3
(security level: weighted-average maturity, principal maturing within 12 months, maturities by
calendar year), MTS table 3 (receipts by source, outlays by agency, gross interest on Treasury
debt securities for the current and prior fiscal year to date and the completed prior year),
Interest Expense on the Debt Outstanding (accrual basis, current FYTD and the completed prior
year), Treasury Bulletin OFS-2 (ownership, latest fully reported quarter), TIC SLT table 5
(major foreign holders).

FRED CSV export (no key): DFEDTARU/DFEDTARL (FOMC target range and the date it took effect),
EFFR, IORB, RRPONTSYAWARD, DPCREDIT, RRPONTSYD (take-up and its peak), WALCL (with its peak
and the calendar year-end), TREAST, WSHOMCB, WRESBAL, WCURCIR, WTREGEN (the H.4.1 T-account,
all published in $ millions), M2SL, GDP, GFDGDPA188S, and the four "most recent actual"
readings of the CBO table: A191RL1Q225SBEA, CPIAUCSL (y/y computed), DGS10, UNRATE.

Every request has a 45-second timeout and its own try/catch, so one slow or dead source never
takes down the run or the other series.

### The freshness check

`scripts/fiscal/check-freshness.mjs` runs after every refresh (and locally: `node
scripts/fiscal/check-freshness.mjs --now 2026-09-29`). It lists every data point with its
date, age and the allowance for its publication cadence, and cross-checks the figures that must
agree: ON RRP = target-range floor, discount rate = ceiling, IORB and EFFR inside the range,
the FedWatch snapshot dated on or after the latest FOMC decision with its first meeting still
ahead and its columns summing to ~100, MSPD classes summing to Treasury's total, MTS categories
summing to total receipts and outlays. Problems go to the run summary and, on `main`, to one
GitHub issue labeled `fiscal-health` titled "SOURCE DOWN: US fiscal - ..." (commented at most
every ~20 h, closed by the first clean run). The routine "FNAM US Fiscal: email material
changes" emails the owner when that issue opens.

### Probing a source from the runner

The Claude cloud session cannot reach Treasury, FRED, the Fed, CME, Investing.com or CNBC (egress
policy). Run the workflow from the Actions tab with the `url` input to fetch from the runner and
read the answer in the log:

```
https://api.fiscaldata.treasury.gov/.../debt_to_penny?sort=-record_date&page[size]=1
https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm#^(January|March)$|^\d{1,2}-\d{1,2}
https://www.cnbc.com/2026/09/24/....html#FedWatch|probabilit
raw:https://www.atlantafed.org/research-and-data/data/market-probability-tracker##href="[^"]*xlsx
```

`URL` prints the first 2,500 characters, `URL#regex` the matching lines, `URL##regex` each
match with context, `raw:` keeps the HTML. Nothing is fetched into `data.js` or committed in
that mode. Known answers (2026-09-29): CME FedWatch and Investing.com answer 403 to every
script, FRED stalls on a browser user agent (the probe sends the fetch script's own for FRED
and Treasury), the Fed, Treasury, the Atlanta Fed and CNBC answer normally.

## What the page computes at render time

- FOMC target range and "in force since" from DFEDTARU/DFEDTARL (ON RRP floor + 25 bp only as a
  fallback); the corridor, the Section 10 sentence, the Section 11 cards and their dates.
- Fiscal-year and calendar-year charts add a column when a year closes (the FY-end split from
  Debt to the Penny; December values for debt, M2 and WALCL); the final column is always the
  latest reading.
- Section 03: bills as a share of marketable and of total debt, and whether that is above,
  within or below the 15–20% share TBAC recommends; the 12-month roll-over; the maturity
  schedule prose (this year, five years, eight years, as shares of marketable debt).
- Section 04: the three average rates and their month; accrued interest FYTD and for the
  completed prior fiscal year; gross cash interest FYTD against the same months a year earlier and
  the full prior year; the rank of interest among the outlay lines of Section 08. Cash interest is
  MTS table 3's "Interest on Treasury Debt Securities (Gross)": it is described as gross interest,
  not "net interest" (CBO's net interest is lower because it nets what the trust funds receive).
- Section 06: the "most recent actual" column of the CBO table (real GDP growth, CPI y/y, 10-year
  yield, unemployment) from FRED with its period. The CBO columns come from the research file.
- Section 09: T-account, composition column, WALCL peak and QT runoff, reserves against end-2019.
- FedWatch (Section 10): meetings already held are dropped at render time; a notice appears when
  the snapshot predates the latest FOMC decision (its date comes from `targetRange.since`); the
  callout is composed from the same odds as the chart in both languages, never hand-written;
  `calloutEn`/`calloutEs` in the monthly file are ignored.
- Footer: the `data.js` write time in UTC and Mexico City time.

## Verifying a change

```
node --check scripts/fetch-data.mjs scripts/fiscal/check-freshness.mjs scripts/fiscal/probe.mjs
node scripts/fiscal/check-freshness.mjs
setsid nohup python3 -m http.server 8123 --directory site >/dev/null 2>&1 &
```

Then open http://localhost:8123/fiscal/ in Playwright Chromium at 1280 px and 390 px, in both
languages, light and dark: route the Chart.js CDN to a local `chart.js@4.4.0` copy, stub Google
Fonts, and check for `undefined`/`NaN`, empty `[data-bind]` spans, horizontal overflow and text
below 11 px. To exercise the FedWatch guards, freeze "today" with a Date shim that keeps time
advancing (Chart.js animates on `Date.now()`; a frozen clock leaves every chart at frame zero).
The real fetch cannot run in the cloud session: push the branch and dispatch the workflow on it
(no inputs); it commits the refreshed `data.js` to that branch, which is the data to test against.

## The research routine (monthly-data.js)

Rules of the road are in the file's header. In short: JSON inside the assignment, every key kept,
no figure without a primary source (CBO; CME itself or a named financial outlet quoting FedWatch
on a stated date; two independent reputable outlets when cbo.gov blocks the fetch), sources
recorded in the `sources` block and the commit message, `[skip actions]` in the subject. The
routine also re-reads the FOMC calendar so `fedWatch.meetings` always starts with the next
decision, and leaves the odds untouched (the page then shows the stale notice) rather than guess.
CME and Investing.com refuse scripts, so the odds come from outlets that quote FedWatch (CNBC,
Reuters, Bloomberg); when an outlet only quotes part of the distribution, the routine records
only the meetings it can complete (the chart shows however many meetings the file holds).

### A machine-readable alternative for market odds (not wired yet)

The Federal Reserve Bank of Atlanta's Market Probability Tracker publishes its model's output as
`https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/research-and-data/data/market-probability-tracker/mpt_histdata.xlsx`
(probabilities of rate ranges implied by options on three-month SOFR futures, updated daily; the
runner can fetch it). It is not CME FedWatch (a different instrument and methodology), but it is a
Federal Reserve source that would let the daily workflow refresh market-implied odds without a
research step. Wiring it means parsing the workbook on the runner and presenting it as what it is.

## Data facts that trip people up

- FRED publishes WRESBAL in $ millions like the other H.4.1 lines (2,930,193 = $2.93T on
  2026-09-23); RRPONTSYD is in $ billions.
- MSPD table 1 has 15 rows a month; the six classes the page charts sum to Treasury's total
  minus the Federal Financing Bank line (a few $B).
- The FOMC decision is the day before `targetRange.since` (the range takes effect the next day).
- `fedWatch.meetings` are `dd-Mon-yyyy` strings; the page and the check parse them without Date
  objects, so no time zone can shift a meeting by a day.
