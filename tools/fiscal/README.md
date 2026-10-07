# U.S. Fiscal Debt Monitor — fnam.mx/fiscal

Bilingual dashboard of the federal debt, its holders, maturity structure, cost, composition,
debt-to-GDP, revenues and outlays, then the Fed's balance sheet, policy rates and instruments. One
file, `site/fiscal/index.html`, renders everything in the browser from two data files; the page has
no hand-typed figures left in it.

Language: Spanish by default, like the rest of the site. `?lang=en|es` wins, then the reader's last
choice (`localStorage` key `fiscal-lang`), then Spanish; it is applied before first paint, so the
page never flashes the other language. The EN/ES toggle saves the choice and rewrites `?lang=` in
the address bar, so a copied link keeps the language. `document.title` and `<html lang>` follow.

## How it stays current

| File | What it holds | Who writes it | When |
|---|---|---|---|
| `site/fiscal/data.js` (`window.LIVE_DATA`) | every Treasury, Federal Reserve and FRED series the page shows | `scripts/fetch-data.mjs`, run by `.github/workflows/refresh-data.yml` | 13:15 and 21:30 UTC daily |
| `site/fiscal/monthly-data.js` (`window.MONTHLY_DATA`) | the figures with no machine-readable source: the CBO baseline (its date, title and link, the column years, the record year, the projection, the category table, the economic assumptions), the CME FedWatch snapshot, the two fixed TBAC maturity anchors | the Claude routine "FNAM US Fiscal: CBO / FedWatch research", which commits to `main` (prompts in `ROUTINES.md`) | Mondays, Wednesdays and Fridays 14:58 UTC (Friday = the first run after a Wednesday FOMC decision) |

`data.js` always wins; the monthly file is only read where `data.js` has nothing. If a series
fails to fetch it is `null` for that run and the page keeps its last baked value for it, so the
page always renders.

### The static markup (bake)

The page computes every figure in the browser, but its HTML also carries them, so a reader without
JavaScript, a crawler or a plain-text fetch sees the numbers of the last refresh instead of whatever
was typed when the page was last edited. `scripts/fiscal/bake-page.mjs` opens the page in headless
Chromium (`?lang=es` and `?lang=en`) and writes back into `index.html`: the text of every
`[data-bind]` element and `[data-bind-href]` link, the fiscal-year range spans, the FedWatch source
links, the inner HTML of the composed notes, the KPI strip, the as-of row, the tables, the Fed
T-account and the sources list, plus `<meta name="data-refreshed">` and the dates in the
`<noscript>` note. The static markup reads in Spanish (the `.es` spans are visible, the `.en` ones
carry `hidden`). Nothing else changes: the script refuses to write if the file minus its regions
would differ, if a key appears a different number of times in the file and in the rendered page, or
if the page logs an error.

- `refresh-data.yml` installs Playwright's Chromium, runs the bake after every fetch and commits
  `index.html` together with `data.js`. A failed install or bake never blocks the data commit
  (`index.html` stays as it was) and is reported in the `fiscal-health` issue as "page bake failed".
  When another bot pushes first, the run rebuilds its commit on the new head (keeps its `data.js`,
  bakes again) instead of rebasing.
- After editing the page by hand: `node scripts/fiscal/bake-page.mjs`, then `render-check.mjs`, then
  commit. `--check` exits 1 when the file is not up to date and writes nothing.
- Because the bot rewrites `index.html` twice a day, a page branch can conflict with `main` in the
  baked regions. Resolve by merging `main`, keeping your side of `index.html`
  (`git checkout --ours site/fiscal/index.html`), baking again and committing.
- If `data.js` or `monthly-data.js` fails to load in a reader's browser, the page recomputes
  nothing: the baked text, tiles and tables stay, the charts are hidden and a notice at the top says
  the data files did not load, with the time of the baked refresh.

### What `fetch-data.mjs` pulls

Treasury Fiscal Data (no key): Debt to the Penny (latest day, the last completed fiscal year-end
and calendar year-end, the first close above the latest whole trillion), Average Interest Rates
(all interest-bearing, marketable, non-marketable, plus the prior fiscal year-end), MSPD table 1
(every security class, Treasury's own totals, the non-marketable pieces), MSPD table 3
(security level: weighted-average maturity, principal maturing within 12 months, maturities by
calendar year), MTS table 3 (receipts by source, outlays by agency, gross interest on Treasury
debt securities and the interest credited to federal trust funds, for the current and prior
fiscal year to date and the completed prior year), MTS table 9 (net interest, budget function
900, same three periods; optional, so a failure never takes the gross figures down),
Interest Expense on the Debt Outstanding (accrual basis, current FYTD and the completed prior
year), Treasury Bulletin OFS-2 (ownership, latest fully reported quarter), TIC SLT table 5
(major foreign holders).

FRED CSV export (no key): DFEDTARU/DFEDTARL (FOMC target range and the date it took effect),
EFFR, IORB, RRPONTSYAWARD, DPCREDIT, RRPONTSYD (take-up and its peak), WALCL (with its peak
and the calendar year-end), TREAST, WSHOMCB, WRESBAL, WCURCIR, WTREGEN (the H.4.1 T-account,
all published in $ millions), M2SL, GDP, GFDGDPA188S (annual debt-to-GDP), GFDEGDQ188S and
GFDEBTN (quarterly debt-to-GDP and its quarter-end debt), and the four "most recent actual"
readings of the CBO table: A191RL1Q225SBEA, CPIAUCSL (y/y computed), DGS10, UNRATE.

Every request has a 45-second timeout and its own try/catch, so one slow or dead source never
takes down the run or the other series.

### The freshness check

The allowances live in `site/fiscal/freshness-rules.js` (one table, read by both this script and the
page). Debt to the Penny and the five policy rates (target range, EFFR, IORB, ON RRP, discount) are
measured in U.S. business days (federal holidays excluded, computed in `site/assets/provenance.js`): amber
after **2 business days** without a new value (owner's rule, 2026-10-01); the rest in calendar days after
the end of the period. In the reader's browser, `site/fiscal/blocks.js` applies the same table: every
card gets "Data through <date>", a Reported / FNAM calculation / FNAM estimate badge, an ⓘ with the
source and date of each figure, the source in every chart tooltip, and an amber flag when a point is past
its allowance or when `data.js` has no value for it and the page is showing the values stored in its code
("Not refreshed: showing stored values" — never silent). Test a date with `?asof=YYYY-MM-DD`. A sentence
that needs a fetched date (the whole-trillion milestone) stays hidden until the date exists; no typed-in
fallback. The Section 01 callout's monthly pace (the rise since the fiscal year-end record ÷ the months
elapsed, 30.44 days each) is shown only once a full month of the new fiscal year is in; until then the
callout says how many days of the fiscal year the rise covers, because over a shorter base the "pace" would
just repeat the rise itself (1-Oct-2026: one day, +$89B, printed as "$89 billion a month" until fixed on
2026-10-05). The customs-duties chart (`tariffTrend`) is typed into the page: `blocks.js` says so and turns it
amber when BEA's next annual figure is overdue; update `TARIFF_LAST` there with the series.

`scripts/fiscal/check-freshness.mjs` runs after every refresh (and locally: `node
scripts/fiscal/check-freshness.mjs --now 2026-09-29`). It lists every data point with its
date, age and the allowance for its publication cadence, and cross-checks the figures that must
agree: ON RRP = target-range floor, discount rate = ceiling, IORB and EFFR inside the range,
the FedWatch snapshot dated on or after the latest FOMC decision with its first meeting still
ahead and its columns summing to ~100, MSPD classes summing to Treasury's total, MTS categories
summing to total receipts and outlays, gross interest minus trust-fund interest minus net
interest leaving a residual under 10% of gross (and none of the three missing), and the CBO blocks against each other (one value per year in
`cboYears`, deficit = outlays − revenue, the "—" outlay rows summing to total outlays, implied GDP =
outlays ÷ outlays-to-GDP, `cboRecordYear` the first labelled year above 106% in `cboProjection`,
`cboPublished` at most ~14 months old). Problems go to the run summary and, on `main`, to one
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
- Section 04: the three average rates and their month; gross interest expense on an accrual basis
  FYTD and for the completed prior fiscal year; gross cash interest FYTD against the same months a
  year earlier and the full prior year; the rank of gross interest among the outlay lines of
  Section 08; the gross-to-net table (gross interest, less interest credited to trust funds, less
  other interest and investment income as the residual, equals net interest), with the residual
  taken from the rounded figures so each column adds up as printed; the composed note on net
  interest (the figure that counts against the deficit, the one CBO projects and the U.S. Macro
  Monitor reports). The header KPI is gross interest with net under it.
- Section 06 and the header KPI: three debt-to-GDP measures, each labelled with its definition,
  and a composed note reconciling them: the live ratio (total public debt on the latest day ÷ the
  latest quarter's GDP, annual rate), FRED's quarterly ratio (GFDEGDQ188S: total public debt at
  quarter-end ÷ that quarter's GDP; the figure the U.S. Macro Monitor shows; FRED adds a quarter
  three months or more after it ends) and FRED's annual ratio behind the chart (GFDGDPA188S: gross
  federal debt at fiscal year-end, FYGFD, ÷ calendar-year GDP, GDPA).
- Section 06: the "most recent actual" column of the CBO table (real GDP growth, CPI y/y, 10-year
  yield, unemployment) from FRED with its period. Everything else in the section comes from the
  research file's CBO keys: the record-year sentence (`cboRecordYear` looked up in `cboProjection`),
  the table headers (`cboYears`), the stat cards, the assumptions columns, the vintage ("February
  2026" from `cboPublished`) and the source links (`cboTitle`, `cboUrl`). No year or figure in the
  section is typed into the page.
- Section 09: T-account, composition column, WALCL peak and QT runoff, reserves against end-2019.
- FedWatch (Section 10): meetings already held are dropped at render time; a notice appears when
  the snapshot predates the latest FOMC decision (its date comes from `targetRange.since`); the
  callout is composed from the same odds as the chart in both languages, never hand-written;
  `calloutEn`/`calloutEs` in the monthly file are ignored.
- Footer: the `data.js` write time in UTC and Mexico City time.
- Header KPI strip: six tiles (total debt, held by the public, latest debt-to-GDP, FYTD gross
  interest with net under it, average rate, FYTD deficit from MTS with the same months a year
  earlier); `blocks.js` adds each tile's data date and kind. Spanish units ("billones") are set
  smaller so a value stays on one line.
- Header notice (`#dataWarn`, both languages, written by `blocks.js` from `freshness-rules.js`, the
  same table as the amber flags and the freshness check): every data point past its allowance with
  its date and age, and a `data.js` older than 36 hours (two refreshes missed). When the data files
  did not load, the page writes its own notice instead.
- Section 10 dates: the administered rates (IORB, ON RRP, discount) are labelled "in force since"
  the FOMC decision and the effective federal funds rate "as of" its own date (the New York Fed
  publishes it the next business day).
- Every chart canvas gets `role="img"` and an `aria-label` from its card title and caption, in the
  current language.

## Verifying a change

```
node --check scripts/fetch-data.mjs scripts/fiscal/check-freshness.mjs scripts/fiscal/probe.mjs scripts/fiscal/render-check.mjs scripts/fiscal/bake-page.mjs
node scripts/fiscal/check-freshness.mjs
node scripts/fiscal/bake-page.mjs
setsid nohup python3 -m http.server 8123 --directory site >/dev/null 2>&1 &
node scripts/fiscal/render-check.mjs --shots /tmp/fiscal-shots
```

`render-check.mjs` opens the page in Playwright Chromium at 1280, 390 and 360 px, in both languages
(`?lang=`), light and dark (twelve configurations), with Chart.js served by the site itself (`/assets/vendor/chart.umd.4.4.0.min.js`, SRI-pinned;
`--chart` only matters for an old checkout that still loads it from the CDN) and Google Fonts stubbed. It fails on console errors, `undefined`/`NaN` in the text,
`[data-bind]` spans left empty or at "—", a KPI strip without six filled tiles, `document.title` or
`<html lang>` not following the language, horizontal overflow, DOM text below 11 px, a section tab or
language button that a tap would not reach (`elementFromPoint` at its centre, the tab strip scrolled
to each tab), a desktop tab hidden until the strip is scrolled, the language buttons overlapping the
tab strip, a table that overflows sideways without scrolling and a scroll hint, SVG donut labels
below 11 px after the viewBox scale, an English heading or tab label that is not in Title Case, or a
Spanish one in Title Case instead of sentence case. Three passes run once: the language choice
(Spanish with nothing stored, `?lang=en` wins, the toggle rewrites `?lang=` and is remembered after
a reload), JavaScript off (Spanish static text, no placeholder left in the baked figures, the
`<noscript>` note shown) and `data.js` blocked (the missing-data notice, the baked tiles still
filled, no errors). `--now
YYYY-MM-DD` installs a Date shim that keeps time advancing (Chart.js animates on `Date.now()`; a
frozen clock leaves every chart at frame zero) to exercise the FedWatch meeting filter for a chosen
day. Canvas charts are outside the DOM: with `--shots` the script also crops the holders chart, the
donuts, the outlay bars, the CBO tables and the FedWatch chart in both languages — look at every
crop for overlapping or clipped labels before merging. The real fetch cannot run in the cloud
session: push the branch and dispatch the workflow on it (no inputs); it commits the refreshed
`data.js` to that branch, which is the data to test against.

Conventions the check enforces: English headings in Title Case (the site's deck convention in
`site/assets/present-core.js`: connectors such as of, the, vs., over stay lower case; tokens with
digits or capitals are left alone), Spanish headings in sentence case (Mexican usage: only the first
word and proper nouns capitalised).

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

### Adopting a new CBO baseline

CBO publishes its baseline each January or February (occasionally a mid-year update). The routine
changes every CBO key together — `cboPublished`, `cboTitle`, `cboUrl`, `cboYears`, `cboRecordYear`,
`cboOutlaysT`, `cboGdpRow`, `cboCategoryTable`, `cboProjection`, `cboAssumptions` — and the page
recomposes Section 06 from them. The interpolated middle column and the "everything else" outlay row
are derived, marked `direct:false`, and shown in italics with a ~. cbo.gov answers 403 to the runner
and to the cloud session, so the figures come from two independent outlets quoting the report (the
February 2026 vintage: CRFB and the American Action Forum, with The Hill for the record year), and
`sources.cbo` lists which figure came from which.

### A machine-readable alternative for market odds (not wired yet)

The Federal Reserve Bank of Atlanta's Market Probability Tracker publishes its model's output as
`https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/research-and-data/data/market-probability-tracker/mpt_histdata.xlsx`
(probabilities of rate ranges implied by options on three-month SOFR futures, updated daily; the
runner can fetch it). It is not CME FedWatch (a different instrument and methodology), but it is a
Federal Reserve source that would let the daily workflow refresh market-implied odds without a
research step. Wiring it means parsing the workbook on the runner and presenting it as what it is.

## Data facts that trip people up

- Gross vs. net interest: gross is what Treasury pays on all its securities, including those held
  by federal trust funds (MTS table 3, and the accrual-basis Interest Expense dataset); net is
  gross minus the interest credited to the trust funds and other federal interest and investment
  income (MTS table 9, budget function 900). Net is what counts against the deficit and what CBO
  projects; FY2026 through August: gross $1,267.4B, trust funds $215.9B, other $34.5B, net
  $1,017.0B. Label every interest figure one or the other.
- The fiscal year ends 30 September but the September statement that closes it comes out in October (the
  eighth business day on Treasury's schedule: 13-Oct-2026 for FY2026). Between the two dates every MTS figure
  on the page is an 11-month figure, and Section 04 says so in a composed note (`fyEndNoteEn/Es`: year-end
  date, the statement's scheduled date from `provenance.js`'s U.S. business-day calendar, the last download).
  Once the September statement is in (`revOutInfo.months === 12`, `mtsFull`), every "YTD" label reads "full
  fiscal year" (KPI tiles, Section 04 stats and bridge, Sections 07–08 captions and tables, which then drop
  the duplicate prior-full-year column); the accrual-basis stat does the same on its own date (`accruedFull`:
  the Interest Expense dataset posts September before the MTS does). Test the closed-year wording by serving a
  `data.js` with `mts.date` set to the 30 September record; test the note's past-due wording with `?asof=`.
- Debt-to-GDP has three honest answers that differ by timing and definition (see Section 06 above);
  the U.S. Macro Monitor (`/macro/?view=fiscal`) shows FRED's quarterly ratio and net interest, and
  both pages say so.

- FRED publishes WRESBAL in $ millions like the other H.4.1 lines (2,930,193 = $2.93T on
  2026-09-23); RRPONTSYD is in $ billions.
- MSPD table 1 has 15 rows a month; the six classes the page charts sum to Treasury's total
  minus the Federal Financing Bank line (a few $B).
- The FOMC decision is the day before `targetRange.since` (the range takes effect the next day).
- `fedWatch.meetings` are `dd-Mon-yyyy` strings; the page and the check parse them without Date
  objects, so no time zone can shift a meeting by a day.
