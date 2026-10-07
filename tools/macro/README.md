# Macro Monitor — fnam.mx/macro

Bilingual (EN / es-MX) US macro dashboard: CPI, PCE, PPI, labor, GDP, productivity,
income, retail, corporate profits and the labor share, consumer sentiment, household
debt, private-sector debt, bank capitalization, financial conditions, supply chain,
fiscal deficit, the Strategic Petroleum Reserve and the Shiller CAPE ratio.
One page, two languages; the page is served at `site/macro/index.html`.

## How it stays current

`.github/workflows/macro-refresh.yml` runs at 12:50 and 13:50 UTC on weekdays (one of the
two is 08:50 ET in either season, so an 08:30 ET release is on the page by about
09:10 ET) and at 14:05 and 20:05 UTC every day (and on demand from the Actions tab), plus two
weekly slots: 14:45 and 15:45 UTC on Wednesdays for EIA's petroleum report
(10:30 ET; 10:45 and 11:45 ET in daylight time, 10:45 ET in winter) and 17:20 UTC
on Thursdays for EIA's holiday weeks and Freddie Mac's mortgage survey (both
12:00 ET). It:

1. runs every `process_*.ps1` here, pulling fresh data from BLS, BEA, FRED,
   Census, Treasury FiscalData, the University of Michigan, the New York Fed and
   the FDIC, into `tools/macro/data/`;
2. runs `build.ps1`, which bakes that data into the page template and writes
   `site/macro/index.html`;
3. commits the page only if the data actually changed. Cloudflare Pages
   deploys the commit like any other.

A source that fails on a given run is logged and that section keeps its last
data; one bad feed never takes the page down.

**Required repository secrets** (Settings → Secrets and variables → Actions):
`BLS_API_KEY`, `BEA_API_KEY`, `FRED_API_KEY`, `CENSUS_API_KEY`. All four are free
registrations. Keys are read from the environment inside the job and never
written to the repo or the page. The FDIC API and the New York Fed workbook need no key.

**Testing a pipeline change before merging.** The workflow's `branch` input (Actions →
"Refresh macro dashboard" → Run workflow) checks out that branch, runs every processor
with the real keys on the Windows runner, builds the page and commits the data and the
page to that branch; the alert step and the source-down issue are skipped off main, and
the live check does not run for a branch run. That is how the five quarterly sections of
7-Oct-2026 were seeded: a session cannot reach BLS with a key (and PowerShell in the
sandbox cannot reach FRED at all), so the data files were first written from FRED's
keyless CSV mirror and then replaced by the runner's own output on the branch.

## What is automatic

Everything on the page except the four items below, including: all series
from BLS, BEA, FRED, Census, Treasury, Michigan and the NY Fed; every "next
release" date (pulled from FRED's mirror of each agency's official calendar,
so no date tables live in the code, plus the last six dates that published,
which name the GDP estimate on the page; the weekly NFCI and mortgage survey
come from the same calendars, and EIA's weekly report from EIA's own holiday
schedule); the first-print payroll figures behind
the revisions chart (recorded on the first run after each jobs report) and every
published value of the last two years of payrolls (ALFRED vintages, see below);
and state nonfarm employment behind the job-cut maps.

## Conventions the page derives from the data

- **Payroll revisions have two bases, and the page names the one it uses.** The
  chart "How the first estimate held up" is today's change for each month minus
  what that month's own jobs report first said. BLS's release text ("June and
  July were revised +55K in total") compares each month with the *previous*
  report instead, and the two figures differ. `process_core.ps1` therefore rebuilds
  the change for each month as it stood at every release from ALFRED (the St.
  Louis Fed's archive of FRED vintages: `series/vintagedates` and
  `series/observations` with `realtime_start`/`realtime_end` for PAYEMS) into
  `labor_static.json` as `payrollVintages` `{ "2026-06": [[release, change], ...] }`
  (latest 24 months; `ConvertTo-PayrollVintages` in `common.ps1` keeps a pair only
  when the value moved). The "At a glance" card quotes BLS's basis when that block
  is current and says "against their first estimates" otherwise; the chart's
  first prints come from the vintages when present, else from `payrollInitial`.
- **Financial conditions quote the freshest print with its real date.** The
  charts stay weekly (FRED's end-of-week aggregation), but each daily series
  (spreads, rates, dollar, VIX, S&P 500) also carries `latest`, its newest native
  observation dated no later than the run day, so a Monday high-yield spread no
  longer waits for Friday. FRED dates an unfinished week to its Friday, which can
  lie in the future; the processor drops that point and the page ignores any
  point dated after today. The FRED calls are paced (FRED allows 120 a minute
  per key).
- **GDP estimate names.** BEA publishes each quarter three times; the page
  counts the release dates after the quarter's end (`calendar.json` `recent`, an
  explicit 13-month look-back) to label the figure "advance / second / third
  estimate (BEA, date)" and to say which estimate the next release brings. BEA's
  own "last revised" date for table 1.1.1 (`gdp_processed.json` `vintage.gdp`,
  from the API's table note) caps and completes that list, so a run between BEA's
  release and FRED's calendar update still names the estimate the figures come
  from. With only `last` available it infers the same from the month gap.
- **Shiller's 10-year rate.** For finished months it is the monthly average;
  for the current (partial) month Shiller's file carries a single daily reading
  from when the file was posted (September 2026: 4.75%, the 31-Aug H.15 value).
  The CAPE view labels it "one daily reading at posting, not a month average"
  and shows FRED's latest daily yield beside it.
- **SPR cavern counts** follow DOE's storage-sites page (the capacity source).
  DOE's SPR Quick Facts table carries its own cavern column and, for West
  Hackberry, a different count (22 vs 21); the page keeps one source and
  prints a note whenever the two disagree, rather than showing both numbers.
- **Language.** English headings are Title Case (applied to the rendered text,
  so dynamic headings follow); Spanish headings keep sentence case, month
  abbreviations are lowercase (`28-sep-2026`), thousands read "mil" and
  millions "M", dollar amounts "mmd" (miles de millones de dólares) with a units
  note under the fiscal tiles. Words with a Spain-only flavour (hostelería,
  derbi) are avoided, and Spanish copy carries no English glosses; only proper
  names stay in English (DOE's "SPR Quick Facts" page, Shiller's “Irrational
  Exuberance” data set). A term whose sign is in the verb ("restó", "subtracted")
  takes the absolute value.
- **Addresses and metadata.** Every section is a real link (`?view=`,
  `&lang=`), the browser history follows it, and the document title,
  description, canonical, hreflang and Open Graph tags are rewritten per
  section and language. An unknown `?view=` gets its own "Section Not Found"
  state (the address as typed, every section as a link, `noindex`), never another
  section in its place, and the server answers it with 404:
  `functions/macro/_middleware.js` (a Cloudflare Pages Function) lists the section
  ids, and both builders refuse to build when that list and the page's navigation
  differ. A missing address anywhere on the site gets `site/404.html` with status
  404 (without a top-level 404.html Cloudflare Pages answers every unknown address
  with the home page and 200); `site/favicon.ico` answers browsers' default icon
  request, and the page carries the site's icon itself.
- **Weekly release dates follow the publisher's calendar.** The NFCI (Chicago Fed,
  Wednesdays 8:30 ET, Thursday in a week with a Monday holiday) and the 30-year
  mortgage rate (Freddie Mac, Thursdays 12:00 ET, Wednesday in Thanksgiving week)
  take their dates from FRED's release calendars (`calendar.json` keys `nfci`,
  release 221, and `mortgage`, release 190); EIA's weekly report from EIA's holiday
  schedule page (`spr_processed.json` `schedule`). "Next" is always the release
  after the one whose data the page shows, never a date counted from today, so it
  moves on by itself with the refresh that brings the new point; once its time
  (ET) has passed and the data is not in yet, the line says "not on this page
  yet". Without the calendar the page falls back to the usual weekday and says
  "expected".
- **Each figure carries its own date.** The policy callout dates the Fed's target
  (same day), the effective rate (a business day later) and the mortgage rate
  (Freddie Mac's weekly survey) separately, with the next mortgage reading.
- **No signed zero.** Every signed figure goes through `sgnFix` (sign only when the
  rounded value is not zero, a real minus sign) and every tile arrow through
  `deltaArrow` (a dash when the change rounds to zero), so a tiny decline reads
  "0.0%", never "−0.0%".
- **GDP "why it matters"** names what added to growth and what subtracted, with
  each contribution, from BEA's table 1.1.2 (consumer spending, investment,
  exports, imports, government); never a blanket "the other components".
- **History revisions are said, not silent.** Once a year (late September) BEA's
  annual update revises years of GDP, income, spending and PCE-price history.
  `Get-HistoryRevision` (`common.ps1`, called by `process_core.ps1`) compares each
  run with the previous data and, when growth changed for a quarter older than the
  two latest or a monthly series for a month more than seven months back, records
  the release in `gdp_processed.json` `revisions` (earliest quarter and months
  revised, quarters changed, the three largest changes in growth; kept 400 days).
  For 120 days the GDP, income and PCE views open with a "History revised" note.
  The 30-Sep-2026 update (GDP from Q1 2021, 19 quarters; Q1 2025 −0.6% → 0.1%) was
  recorded from the committed data before and after it.
- `labor_static.json` is written compact (it is baked into the page; the
  pretty-printed form was 65 KB of whitespace).
- **Phones.** No text below 11 px: chart SVGs narrower than their drawing are
  refitted (`fitChartViewBoxes` shrinks the viewBox so the smallest chart text
  renders at 11 px) and axis margins, tick spacing and annotation labels adapt to
  the width. The phone `@media` blocks sit at the end of the stylesheet; placed
  earlier, later base rules silently override them.

## The quarterly sections: productivity, profits, debt, household debt, bank capital, nonbank finance

Added 7-Oct-2026 (owner's request; the nonbank section the same day, after she asked for nonbank financials). One processor each; all six verify their series
before writing anything and fail (keeping the committed file) rather than publish a wrong
figure. Every FRED pull goes through `Get-FredChecked` in `common.ps1`: a list of candidate
ids with the title the series must carry; the first id whose FRED title matches wins, so a
renamed or discontinued series never reaches the page. With `FRED_API_KEY` set the API is
used; without it the public series page and `fredgraph.csv` serve the same title and data,
so the FRED-based processors can run in a session too (PowerShell in the sandbox times out
against fred.stlouisfed.org, though; `curl` works).

| Section (`?view=`) | Processor → file | Source and series |
|---|---|---|
| `productivity` | `process_productivity.ps1` → `productivity_processed.json` | BLS Productivity and Costs via the BLS API: nonfarm business (sector 8500) output per hour (measure 09), unit labor costs (11), hourly compensation (10), real hourly compensation (15), output (04), hours (03), labor share (17) and manufacturing (3000) output per hour, each as index 2017=100 (duration 3), q/q at an annual rate (2) and y/y (1), 1947 on. Pulled in 20-year windows with the key (10 without). Checks: catalog titles (with the key) and, always, that each index averages 100 in 2017 and that the two percent changes are the index's own changes. |
| `profits` | `process_profits.ps1` → `profits_processed.json` | BEA NIPA table 1.14 via FRED (BEA's own series codes, e.g. A455RC1Q027SBEA = gross value added of nonfinancial corporate business, A460RC = compensation, A463RC = profits with IVA and CCAdj, W328RC = after tax, B471RC = net interest), table 1.12 (CPROFIT, CPATAX) and GDP, quarterly SAAR $ bn since 1947. Checks: the table's five identities (GVA = CFC + net value added; net value added = compensation + production taxes + net operating surplus; NOS = net interest + transfers + profits; profits = taxes + after tax; after tax = dividends + undistributed). Margin = profits ÷ GVA and labor share = compensation ÷ GVA are computed on the page. BEA publishes profits with the second and third GDP estimates, so `asOf` can trail GDP by a quarter. |
| `debt` | `process_debt.ps1` → `debt_processed.json` | Federal Reserve Z.1 via FRED: debt securities and loans, liability, level, by sector (CMDEBT households, BCNSDODNS nonfinancial corporate, TCMILBSNNB noncorporate, TBSDODNS business, FGSDODNS federal, SLGSDODNS state and local, TCMDODNS domestic nonfinancial, DODFS financial, TCMDO all) plus NCBDBIQ027S (corporate debt securities), $ millions → $ bn, 1952 on; GDP for the ratios (the Z.1's table D.3 method). Checks: business within 0.3% of corporate + noncorporate and domestic nonfinancial within 2% of households + business + governments (the Fed's published totals are not exact sums of the component series: gaps up to 0.35% for business and 1.5% for the total in the 1950s). |
| `hhdebt` | `process_hhdebt.ps1` + `hhdc_xlsx.py` → `hhdebt_processed.json` | New York Fed Quarterly Report on Household Debt and Credit: the data workbook is named for its quarter (`…/householdcredit/data/xls/HHD_C_Report_2026Q2.xlsx`); the processor tries the current quarter and the five before it and keeps the newest that is a real workbook, and `hhdc_xlsx.py` (openpyxl) finds the sheets by title ("Total Debt Balance and Its Composition", "Percent of Balance 90+ Days Delinquent by Loan Type"), checks that every balance row adds up and writes 2003Q1 on. Plus, via FRED: Z.1 household liabilities (CMDEBT, HHMSDODNS mortgages, HCCSDODNS consumer credit; other = the remainder) since 1952, G.19 consumer credit (TOTALSL, REVOLSL, NONREVSL, monthly, revolving + nonrevolving = total is checked), the debt service ratio (TDSP) and disposable income (DSPI, quarterly average) for debt/income. |
| `banks` | `process_banks.ps1` → `banks_processed.json` | FDIC BankFind Suite API (`api.fdic.gov/banks/financials`), aggregated by report date (`agg_by=REPDTE`, `agg_sum_fields`) over `INSFDIC:1 AND NOT BKCLASS:OI`: that filter reproduces the Quarterly Banking Profile's "all insured institutions" universe exactly (17,885 institutions in 1984Q1, 5,177 in 2019Q4, 4,238 in 2026Q2, and total assets to the million; the API's other records are insured branches of foreign banks and noninsured trust companies). Fields: ASSET, EQ, DEP, DEPDOM, DEPINS, DEPUNINS, LNLS, NCLNLS, LNATRES, SC, SCAA/SCAF/SCHA/SCHF (amortized cost and fair value of AFS and HTM securities, 1994 on), RBCT1, RBC, RWAJT (1990 on), AVASSETJ, RBCT1C (CET1, kept from 2015Q1 when every institution reports it), NETINCQ, NETINC; $ thousands → $ bn; a zero sum is a field that did not exist yet and is stored as null. The page forms the ratios from the sums, as the QBP does (its 2Q 2026 time-series workbook was used to cross-check: equity 2,624.8 vs 2,624,826 $M, Tier 1 2,322.8 vs 2,322,821, unrealized AFS −109.8 vs −109,817). Plus the Fed's weekly H.8 via FRED (TLAACBW027SBOG, DPSACBW027SBOG, RALACBW027SBOG) since 2000. |
| `nonbank` | `process_nonbank.ps1` + `mmf_xlsx.py` + `ncua_xlsx.py` → `nonbank_processed.json` | Four sources. (1) Federal Reserve Z.1 via FRED, 43 title-checked series since 1952 (`BOGZ1FL…Q`, `BOGZ1LM…Q`): total financial assets of every domestic financial sector (private depository institutions, which already include credit unions; property-casualty and life insurers; pension funds; money market, mutual, closed-end and exchange-traded funds; GSEs and agency mortgage pools (`FL413065005`, total mortgages); ABS issuers; finance companies; mortgage REITs; broker-dealers; holding companies; other financial business; and the four sectors the Z.1 added from 2012-Q4: domestic hedge funds, private debt funds, business development companies, interval funds), which must sum exactly (within $2 bn or 0.05%) to the "domestic financial sectors" total less the central bank; total liabilities and equity and total liabilities for depositories, life insurers' general accounts, P&C insurers, broker-dealers, GSEs and finance companies (equity = the difference); defined benefit pension funds' funded assets and entitlements (private, state and local, federal; the three must sum exactly to the all-DB series). (2) OFR Hedge Fund Monitor API (`data.financialresearch.gov/hf/v1/series/full?mnemonic=…`, Form PF aggregates for qualifying hedge funds, quarterly since 2013; each series' `metadata.description.name` is checked). (3) SEC Money Market Fund Statistics: the newest `…supporting-data…xlsx` linked from the SEC's page (file names are irregular, so the page is scraped; SEC hosts want a descriptive User-Agent, `fnam.mx macro monitor (https://fnam.mx)`, no email), read by `mmf_xlsx.py` with subtotal/total identity checks (net assets by category since 2010-12, daily and weekly liquid assets since 2016-10). (4) NCUA Financial Trends chart pack: the newest `chart-pack-YYYY-qN.zip` linked from the NCUA's page, read by `ncua_xlsx.py` (count, aggregate net worth ratio, delinquency, borrowings, ROAA; the summary sheet's printed ratio and count must agree with the chart series); the pack holds forty quarters, so earlier quarters are kept from the committed file. |

Release dates: `process_calendar.ps1` carries FRED releases 47 (Productivity and Costs → `productivity`),
52 (Z.1 → `z1`), 14 (G.19 → `g19`) and 22 (H.8 → `h8`, weekly); every release id's FRED name is
now checked against the name it should have, and a release whose name no longer matches is left
out (the page falls back to its "expected" wording). The New York Fed and the FDIC publish no
machine-readable calendar: the page says "expected early <month>" (report ~5 weeks after the
quarter) and "expected late <month>" (QBP ~8 weeks after the quarter). Corporate profits take
the GDP calendar and say whether the next release is an advance estimate (profits follow with
the second).

Staleness: `refresh_all.ps1` warns when a quarterly file's next quarter is overdue (quarter end
+ publisher lag + 30 days: BLS 40, BEA 60, Z.1 75, New York Fed 45, FDIC 60, OFR 85, NCUA 80 days), when the G.19
month is more than ~5 weeks late, the SEC money fund month is older than the end of the second month after it
(August is overdue on 1-Nov) or the H.8 week more than three weeks old; three runs in a row
turn that into the SOURCE DOWN issue like any other stuck source.

Alerts: `alerts.ps1` tracks the ten new releases (`productivity`, `profits`, `debt`, `hhdebt`,
`g19` monthly, `banks`, `nonbank`, `hedge`, `mmf` monthly, `ncua`), with MATERIAL thresholds in the script (productivity |q/q| ≥ 3 pp, a
2 pp swing or unit labor costs ≥ 4%; margin ±0.5 pp q/q or profits ±10% y/y; corporate debt
≥ 8% or ≤ 0% y/y or private debt/GDP ±2 pp q/q; 90+ delinquency ±0.3 pp q/q, card balances
≥ 10% y/y or ±$300 bn q/q; G.19 ±$30 bn m/m or a 1 pp swing in y/y growth; Tier 1 leverage
±0.25 pp q/q, unrealized securities ±$100 bn or noncurrent rate ±0.2 pp; nonbank share ±1 pp q/q, life insurers'
equity ratio ±1 pp, broker-dealers' ±2 pp or the state and local funded ratio ±5 pp; hedge funds' gross/net
assets ±0.15x, notional/net ±0.5x or borrowing ±10% q/q; money funds ±$300 bn m/m, prime assets ±10% m/m or any
weekly-liquid-assets share below 55%; credit unions' net worth ratio or delinquency ±0.3 pp q/q) and revision bands
(productivity q/q 0.3 / 1 pp, unit labor costs 0.5 / 1.5 pp, margin 0.1 / 0.5 pp, corporate
debt/GDP 0.3 / 1.5 pp, household debt 1% / 3%, Tier 1 leverage 0.05 / 0.25 pp, nonbank share 0.1 / 0.5 pp,
state and local funded ratio 0.5 / 2 pp, hedge fund gross/net assets 0.05 / 0.2x). A release the
state has never seen is seeded silently (the first run after adding a section sends nothing).
The existing email routine delivers them: it emails every "MATERIAL: " issue, so its prompt
needs no change.

Page conventions for these sections: quarterly labels through `fmtQuarter` ("Q2 2026" / "T2
2026"), dollar levels in $ trillions with `fmtTn` (Spanish "billones"), every chart through
`plotSeries` with year ticks, KPI tiles through `kpiTiles`, and the "At a glance" cards composed
from the data like every other section (the alert emails reuse them).


### Nonbank finance: what is and is not on the page

- The sector shares use the Z.1's own aggregate: "domestic financial sectors" less the central bank. Credit
  unions sit inside private depository institutions (sector 70), so they are a memo item in the sector list and
  never added to the sum. The Z.1 brought domestic hedge funds (62), private debt funds (44), business development
  companies (45) and interval funds (46) into the financial-sector total from 2012-Q4; before that the series are
  zero or absent and the page shows them as null. The identity held exactly in every quarter 1952–2026 when
  checked against the Board's CSV package (`z1_csv_files.zip`); the processor allows $2 bn or 0.05% for rounding.
- Equity is "total liabilities and equity" less "total liabilities" in each sector's L table (the Z.1's
  integrated-macroeconomic-accounts equity line), over total liabilities and equity. Life insurers use the general
  accounts table (separate accounts carry no equity). It is a balance-sheet measure, not statutory capital, net
  capital or the ERCF: the page says so in its method note.
- Pension funded ratios are the Fed's "total funded assets" over "pension entitlements" (L.118.b–L.120.b), the
  same figures the Fed's own funded-status chart uses; sponsors' claims are already netted out by the Fed.
- Hedge funds: the OFR API is the only machine-readable official aggregate (SEC Form PF). Its universe (qualifying
  hedge funds advised from the US, including offshore funds) is wider than the Z.1's domestic hedge fund sector,
  and the page says which is which. Money funds: fund-type assets and liquidity come from the SEC's supporting-data
  workbook (the OFR MMF API gives holdings by instrument only). Credit unions: the NCUA chart pack's aggregate net
  worth ratio (not the PCA ratio of the aggregate FPR, which differs by a few basis points).
- Left out on purpose, with the reasons, so nobody re-hunts: the G.20 finance-company balance sheet (the Z.1
  finance-company sector already gives equity; the G.20 benchmark revisions would make two figures disagree);
  Fannie Mae / Freddie Mac net worth and ERCF capital from EDGAR XBRL (Freddie tags them under custom `fmcc:`
  elements that never reach the frames API; the Z.1 GSE sector covers them in aggregate); FIO insurance capital
  (PDF only); SEC broker-dealer FOCUS net capital (no machine-readable aggregate exists).

## The Challenger report (no API, handled on the runner)

`process_challenger.ps1` finds the newest post in Challenger's job-cuts
category, downloads the report PDF and hands it to `challenger_pdf.py`
(PyMuPDF), which reads Tables 1, 2, 3 and 6 by position and checks every
figure against the report's own totals (industries sum to the month, states
sum to regions, regions to the headline, 51 states). Only a report that
reconciles is written into the `challenger` block; anything else fails that
step and the page keeps last month's data.

The newest post is the first entry title on the category page whose post links a
`Challenger-Report-*.pdf` (up to four posts are tried). Do not key on the slug:
September 2026's post was `job-cuts-fall-in-september-...`, without the old
`challenger-report-` prefix, and the old slug match silently kept August. The same
report changed layout: month columns became mixed case (`Sep-26`) and every page got
a footer "Challenger Report | September 2026 | Page N"; the parser upper-cases
hyphenated month headers and drops that footer line.

The `challenger` block is a growing history, not a snapshot: `monthly[]` is the
national series, `industry[]` is keyed by Challenger's own labels, and
`stateCuts.<code>` holds `m` (the month's cuts), `ytd` and `priorYtd` keyed by
month, with `stateYearTotals.<year>` for completed years. The page derives its
1/3/6/12-month state maps from that history and states the span each map
covers, so a month is simply appended - nothing is re-keyed.

## The two yearly inputs that still arrive as a pull request

BLS answers scripted requests for its tables with HTTP 403 (`process_weights.ps1`
probes on every run and logs the result; if BLS ever allows it, the update can
move here). Until then two scheduled browser tasks in Marcie's Claude desktop
app read the tables and open a pull request; nothing is live until the PR is
merged, and the workflow rebuilds the page on the merge.

| File | Cadence | Task | Source |
|---|---|---|---|
| `data/bls_weights.json` | Yearly, February/March | `cpi-weights-yearly` | BLS CPI relative-importance Table 1 |
| `data/ppi-fdgrouprel.xlsx` | Yearly, June/July | `ppi-weights-yearly` | BLS PPI final-demand relative-importance workbook |

## Email alerts on new data

`alerts.ps1` runs after every build. It compares the latest period of each
tracked release (CPI, PPI, jobs, PCE, GDP, retail, sentiment preliminary and
final, the Monthly Treasury Statement, Challenger, CAPE, and SPR weekly moves
of 3 M bbl or more) with `data/alerts_state.json`. For anything new it opens
one GitHub issue whose body is the page's own "At a glance" text for the
affected sections - `exec_extract.js` runs the built page under Node with a
stand-in DOM and reads the summaries out, so the wording is written once, in
the template. The subject starts with MATERIAL when a threshold in `alerts.ps1`
is crossed. The state file is seeded from the current data on first run and
committed with the data.

**Revisions.** The state also keeps, for CPI, PPI, jobs, PCE, GDP and retail, the
headline figures of the last three periods as they were last reported. When one of
them has since moved by more than its noise band, the alert says so: inside the next
release's issue when the revision comes with one ("Jobs Sep 2026 +150K ...; Aug 2026
revised to +140K (was +162K)"), or as an issue of its own when nothing new was
published ("MATERIAL: GDP Q2 2026 revised to 2.2% (was 1.5%, +0.7 pp)"). The issue
body gets a "Revision:" line listing every period revised, then the page's own
summary. Bands (reported / MATERIAL): GDP growth 0.1 / 0.5 pp; CPI, PPI and PCE y/y,
headline or core, 0.1 / 0.2 pp; payroll change 10K / 50K (also the net of the months
revised); unemployment 0.1 / 0.2 pp; retail level 0.3% / 1%; retail m/m 0.2 / 0.5 pp.
A figure below its band is not re-stored, so small moves add up until they clear it.
`alerts.ps1 -DumpValues` prints the figures the state would keep for the data in
`MACRO_DATA_DIR`. The figures were first stored on 30-Sep-2026, backfilled for GDP
with the values before BEA's annual update of that day and for retail with those
before Census's 28-Sep benchmark revision, so both revisions were reported once.

The issue is only a queue: the owner does not receive GitHub's own notification
emails (she turned them off to avoid the noise). Delivery is the Claude Routine
"FNAM US Macro: email material changes" (cloud, daily at 09:20 and 16:45 New York
time, right after the morning and afternoon refresh runs; prompt in
`tools/macro/email-routine-prompt.md`, set on 2-Oct-2026 - before, 14:45 and 20:45 UTC,
which held the 8:30 ET releases until 10:45 ET). It is read-only: it reads the issues
opened by github-actions[bot] through the public GitHub API and emails the
owner the body of every "MATERIAL: ", "SOURCE DOWN: " and "LIVE CHECK FAILED: " issue
created in its slot's window, in New York time (the 09:20 slot covers 16:45 the day
before to 09:20; the 16:45 slot covers 09:20 to 16:45). The routine's own schedule
must follow New York time: 13:20 and 20:45 UTC in daylight time, 14:20 and 21:45 UTC
in winter if it is set in UTC. A run that starts late keeps the window of
the slot it belongs to, so nothing is sent twice: on 29-Sep-2026 the 20:45 run
was marked failed, resumed at 02:41 UTC and, under the old hour-based rule,
re-sent an alert already delivered at 15:16. Everything goes in one
message sent with the Gmail connector from the owner's fnam.mx account to her
gmail.com address, the same path the US fiscal alerts use. The routine must
have both the Gmail connector and the repository marthavshelton-sys/fnam-debt-monitor
attached (claude.ai, Routines): the cloud environment refuses GitHub API calls
for repositories not attached to the session, and without Gmail nothing is sent.
Either gap makes the run end with a one-line reason and no email. Verified
end to end on 28-Sep-2026 (issue #63 delivered). To catch up by hand, run the
routine with a message such as "catch up: last 7 days"; without one, a run maps
to its latest slot. "Macro update: " issues are never emailed. The routine
does not close issues, so they accumulate harmlessly; close them by hand when
convenient. A missing alert usually means the routine did not run at its time;
check the Routines page before touching `alerts.ps1`. The same routine also
emails the Mexico macro dashboard's "MATERIAL (MX): " and "SOURCE DOWN: MX macro"
issues (tools/mx-macro/README.md).

## Freshness lines for file-based sources

Sections fed by a downloaded file rather than an API show "<file> dated D ·
checked C". D is the source's own Last-Modified date, recorded by the
processor (`Get-RemoteFileDate` in `common.ps1`) for the files that change
only when the data does: Shiller's `ie_data.xls`, EIA's SPR workbooks, the
Challenger PDF. Michigan and Census regenerate their CSVs on a schedule (the
stamp is the generation time) and the NY Fed sends no date, so those sections
show "checked C" only. C comes from `site/macro/status.json`, which
`refresh_all.ps1` writes on every run (run time plus the processors that fell
back to last-good data) - the page reads it at load, so C moves every run even
though the page itself is only rewritten when data changes. A source that
failed on the last run shows its last successful download date instead.

## When something breaks

Every run writes `data/health.json`: which processors failed, for how many
consecutive runs, the staleness warnings and how long they have persisted.
One failed run is silent (feeds hiccup; the page keeps last-good data). When a
source has failed three runs in a row, or a staleness warning has lasted that
long, `refresh_all.ps1` reports it (`stuck` output) and the workflow opens one
issue titled "SOURCE DOWN: US macro - <what>" labeled `macro-source-down`
(never a second while one is open), then fails the run so the outage shows in
the Actions history. The alert routine below emails the SOURCE DOWN issue in
the same way as a MATERIAL one. The first healthy run comments and closes the
issue; the recovery itself is not emailed.

## Live check

After every refresh, `.github/workflows/macro-live-check.yml` (ubuntu runner) runs
`live-check.mjs` against the published page the way a visitor gets it:

- **The deploy arrived.** It waits up to 20 minutes for https://fnam.mx/macro/ to
  serve main's `site/macro/index.html` byte for byte. A page that never catches up
  means Cloudflare stopped publishing (the `[skip ci]` incident, see CLAUDE.md).
- **Every section, both languages, in Chromium with the page's web fonts:** no
  script errors or failed requests, no "undefined"/"NaN" or raw markup in the text,
  the four "At a glance" lines filled, the section's own title, description,
  canonical and hreflang, every chart labelled for screen readers, every sparkline
  drawn, every image loaded, chart text inside its panel, every line inside its
  chart, no Spanish regressions (English glosses, capitalised months).
- **Layout:** phones at 390 and 360 px, light and dark: no text below 11 px and
  nothing wider than the screen; desktops at 1280 and 1024 px: no sideways scroll.
- **Navigation:** an unknown `?view=` shows the "Section Not Found" state (every
  section as a link, address kept, `noindex`) and the server answers 404; a missing
  address on the site answers 404 and `/favicon.ico` is an image; the page has an
  icon; section links update the address, title and history.

It is read-only: public pages only, nothing committed. A failure opens one
"LIVE CHECK FAILED: US macro - ..." issue labeled `macro-live-check`, which the
email routine above sends; later failures comment on it and the first passing
check closes it. The run keeps the report in its summary and the screenshots as
an artifact for 14 days. Run it by hand from Actions ("Check live macro
dashboard", optional `wait_minutes`). With `test_alert` ticked, a passing run also
opens a "LIVE CHECK FAILED: US macro - TEST ALERT ..." issue and closes it at once:
the email routine sends it like a real one, so it proves the email path end to end
without holding an open issue that would absorb a real failure.

In a session, try the script against a local copy (the session's browser cannot
check the live site: it does not trust the egress proxy's certificate, and
driving it at fnam.mx is refused by the session's permission check):

    python3 -m http.server 8123 --directory site
    node tools/macro/live-check.mjs --url http://localhost:8123/macro/ --expect site/macro/index.html --local

`--local` blocks the web fonts, so layout is checked with fallback fonts there.

## Sharing the repository with other pages

Several other dashboards live in this repository with their own workflows.
This job stays in its lane: it reads only `tools/macro/**`, writes only
`site/macro/index.html`, `site/macro/spr-inventory.jpg`,
`site/macro/status.json` and `tools/macro/data/**`, and rebases onto whatever
the other jobs pushed before pushing its own commit. Files another job leaves "modified" in the checkout
(line-ending normalisation) are marked skip-worktree for the duration of the
run and are never committed here. Nothing in this folder alters another page.

## Editing the page

All content lives in `macro_monitor_template.html`. Every user-visible string is
in the `I18N` block in both languages; the build refuses to run if the two
locales don't have identical keys, or if the code references a string that
doesn't exist. After editing, push — the workflow rebuilds and deploys.

The published page is written by `build-page.mjs`, which `build.ps1` runs whenever
Node is available (the runner has it): the same substitution, wrap and guards,
plus two things that take the page from about 1.8 MB to about 1.0 MB without
changing what it shows:

- every data block is packed losslessly (arrays of identical rows as columns,
  regular date sequences as ranges, irregular ones as steps); the page's
  `unpack()`, between the `// @unpack-begin` and `// @unpack-end` markers, restores
  them, and a block is packed only if that same function gives back exactly the
  original and the template reads the placeholder through `unpack()`;
- developer comments are left out of the published copy, only if the stripped
  script still parses and keeps every code character.

If Node is missing or the script fails, `build.ps1` builds the page itself, unpacked
and with comments (identical in rendering), and the run logs a warning.
`node tools/macro/build-page.mjs --plain` reproduces that output byte for byte.

In a Linux session, `node tools/macro/build-page.mjs` builds `site/macro/index.html`
from the committed data, so a template change can be opened in a browser (serve
`site/` locally) and committed with the template; the workflow rebuilds the page on
merge either way. `node tools/macro/exec_extract.js site/macro/index.html en`
checks that the alert extractor still reads every section. PowerShell 7 (`pwsh`)
can be installed in a session to parse-check the scripts and run them against a
mocked `Invoke-RestMethod`; the data providers themselves are not reachable from
there.

To preview locally on Windows with the keys in `%TEMP%\claude\api_keys.json`:

```powershell
.\refresh_all.ps1                # pulls data, writes macro_monitor.html next to the scripts
```

## Files

- `common.ps1` — shared: data folder, API keys from environment, BLS/BEA helpers,
  `Get-HistoryRevision` (BEA's annual update, see "History revisions")
- `process_core.ps1` — CPI, labor, PCE (+weights), GDP/income (BLS + BEA)
- `process_calendar.ps1` - release dates for every section, from FRED (monthly
  releases plus the weekly NFCI and mortgage survey)
- `process_umich.ps1`, `process_ppi.ps1`, `process_retail.ps1`,
  `process_fincond.ps1`, `process_supply.ps1`, `process_fiscal.ps1` — one per section
- `process_spr.ps1` — EIA weekly/monthly SPR stocks (keyless history workbooks: the
  weekly series from the WPSR's Table 1 workbook `ir.eia.gov/wpsr/psw01.xls`, posted at
  the 10:30 ET release, with the series-page workbook as fallback), EIA's holiday
  release schedule (`schedule.exceptions`),
  DOE capacity per site (scraped from the storage-sites page), DOE's inventory
  per site (the "Crude Oil Inventory by Site (as of ...)" table on the SPR
  Quick Facts page; each new as-of date is appended to `bySiteHistory`), and
  DOE's inventory report, which exists only as an image (posted weekly on
  Mondays of late, for the prior Friday) and is saved as
  `data/spr-inventory.jpg` then copied beside the page; `spr_image_ocr.py` (RapidOCR) reads
  the report's "as of" date and sweet/sour/total volumes into `image.reading`
  (kept only if sweet + sour = total, the date is on or before DOE's posting
  and within 14 days, and the total is within 3% of EIA's latest week). When
  that reading is newer than EIA's latest week the page uses it as the latest
  point everywhere (header, summary, KPIs, weekly chart) and names DOE as the
  source; EIA's Wednesday release then takes over. The 1977 history chart uses EIA's
  monthly series (MCSSTUS1, about two months late) and fills the months after
  it with each month's last weekly reading, so every SPR chart ends at the
  same latest point
- `process_challenger.ps1` + `challenger_pdf.py` — the Challenger job-cut report
  (see above); `process_weights.ps1` — BLS probe for the weights tables
- `process_cape.ps1` — Shiller's ie_data.xls from shillerdata.com (the link
  carries a version token, so the page is read first); CAPE since 1881 plus
  Shiller's excess CAPE yield and ten-year subsequent real returns
- `process_productivity.ps1`, `process_profits.ps1`, `process_debt.ps1`,
  `process_hhdebt.ps1` (+ `hhdc_xlsx.py`), `process_banks.ps1`, `process_nonbank.ps1` (+ `mmf_xlsx.py`, `ncua_xlsx.py`) — the quarterly
  sections (see above); `Get-FredChecked` in `common.ps1` is their FRED reader
- `xlsx_to_rows.ps1` — reads the PPI weights workbook without Excel
- `gscpi_xls_to_csv.py`, `xls_to_csv.py` — convert legacy .xls workbooks on the
  runner (no Excel there); locally `common.ps1` uses Excel COM first
- `alerts.ps1` + `exec_extract.js` — new-release emails via GitHub issues (see above)
- `live-check.mjs` — the published page in a browser after every refresh (see "Live check")
- `build.ps1` — template + data → page, with the locale guards; `build-page.mjs` —
  writes the published page (packed data, no comments) when Node is available
- `refresh_all.ps1` — runs everything in order; what the workflow calls
- `../../functions/macro/_middleware.js` — Cloudflare Pages Function: an unknown
  `?view=` answers 404 (section list checked by both builders)
- `../../site/404.html`, `../../site/favicon.ico` — the site-wide "not found" page
  (status 404 for any missing address) and icon
