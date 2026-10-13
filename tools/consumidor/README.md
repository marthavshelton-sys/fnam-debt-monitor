# American Consumer (`site/consumidor/`) — runbook

Bilingual page of the United States section (`/consumidor/`; `/consumer` redirects): who the U.S. consumer is, what
households earn, where the money comes from and where it goes, spending by income decile, consumer credit, wealth by
group, and what consumer companies report. It complements the U.S. Macro Monitor (monthly series live there; this page
is structure and distribution) and links to it. Since 11-Oct-2026 (owner) it also carries a section on the K-shaped
economy and, in the company section, the gig platforms.

Owner's decisions (11-Oct-2026): complement and link to the macro page; company figures are curated per quarter from
results releases, dated, updated in a session after each earnings season; companies = a broad cut of the consumer
(mass retail, value/off-price, grocery, home improvement, restaurants, gig platforms, card lenders — 29 names in
`companies.json`).

## Sections and their sources

| # | Section | Source (publisher → how it is read) | Cadence |
|---|---|---|---|
| 02 | Demographics | Census ACS 1-year, latest vintage on the API (`api.census.gov`, key `CENSUS_API_KEY`) | yearly (September) |
| 03 | Income | ACS (states, groups, quintiles); CPS ASEC national median through FRED (`MEHOINUSA646N`, `MEHOINUSA672N`); state per-capita personal income and regional price parities (BEA) through FRED | yearly |
| 04 | Sources and uses | BEA Personal Income and Outlays, table 2.6 (monthly) and 2.3.5 (consumption by product, quarterly), through FRED release tables | monthly |
| 05 | Spending by decile | BLS Consumer Expenditure Surveys, annual tables by income decile / age / tenure, through the BLS public API (`BLS_API_KEY`) | yearly (September) |
| 06 | Credit | New York Fed Household Debt and Credit workbook (quarterly) and state-level file (yearly, Q4); Board G.19, debt service ratios, bank delinquency and charge-offs through FRED; SCF for who holds each debt | quarterly / monthly |
| 07 | Leverage and financial stress | DFA (debt ÷ assets and consumer credit ÷ cash by income, wealth and age group); SCF historical tables 12 and 18 (payments ÷ income, families above 40%, 60 days late); Philadelphia Fed large-bank card data (FR Y-14M) through FRED; New York Fed Survey of Consumer Expectations and its Credit Access Survey (two workbooks); Federal Reserve "Economic Well-Being of U.S. Households" (tables and accessible figures of the report's chapters, plus the Board's Consumer & Community Context note on buy now, pay later); CFPB study of buy now, pay later borrowers (January 2025); Federal Student Aid portfolio tables (`.xls`, read by `lib/xls-read.mjs`); New York Fed workbook (new bankruptcies and foreclosures, originations by score); U.S. Courts Table F-2 (nonbusiness filings by district, added up by state); ACS table B25070 (rent as a share of income) | quarterly / monthly / every four months / yearly / every three years |
| 08 | Wealth | Fed Distributional Financial Accounts (quarterly zip); Survey of Consumer Finances (triennial zip) | quarterly / every three years |
| 09 | K-shaped economy | BLS CE by income quintile since 1984 (BLS API); BLS Distribution of Personal Consumption Expenditures (experimental workbook on `bls.gov`, read with the identified user agent); BEA Distribution of Personal Income (summary CSV on `apps.bea.gov`); DFA (equity holdings and net-worth gains by wealth group); Atlanta Fed Wage Growth Tracker by wage quartile (FRED); University of Michigan sentiment by income tercile (the survey's time-series form, table 2); curated measurements and estimates by others (`data/kshape.json`) | yearly / quarterly / monthly; estimates in a session |
| 10 | Companies | Results releases (Form 8-K Item 2.02, EX-99; Form 6-K for Klarna) on SEC EDGAR, curated; for the buy now, pay later lenders and the auto, installment and pawn lenders also passages of the 10-K / 10-Q. Gig work, United States only: Census Nonemployer Statistics (API, yearly) and, for the platforms, passages of the 10-Q and 10-K with figures by country plus DoorDash's U.S. report | after each earnings season, in a session; Census yearly |

Why FRED for BEA: BEA's own API answered 503/timeouts on three runner runs in a row (11-Oct-2026); FRED mirrors the
same tables, and every series is checked against its published title before it is accepted. The page labels those
blocks "through FRED". BLS's bulk files (`download.bls.gov`) answer 403 to scripts, hence the BLS API.

Vintages as of the build of 11-Oct-2026: ACS 2024 (2025 not on the API yet), CE 2024, CPS income 2025, BEA August 2026,
DFA 2026:Q2, SCF 2025, New York Fed 2026:Q2 (state file: Q4 2025), Nonemployer Statistics 2024, BLS distribution of PCE
2000–2023 (version March 2025; the page flags it as not updated recently), BEA and BLS joint distribution 2000–2023,
Philadelphia Fed card data 2026:Q2, Survey of Consumer Expectations September 2026 (Credit Access Survey: June 2026),
Federal Reserve household survey 2025, Federal Student Aid 30 June 2026, U.S. Courts 12 months to 30 June 2026. The
fetcher takes a newer survey year by itself as soon as the publisher's API or file carries it.

## Pipeline

```
scripts/consumidor/fetch.mjs            sources → tools/consumidor/raw/<source>.json (+ raw/status.json)
scripts/consumidor/harvest-releases.mjs SEC EDGAR → tools/consumidor/raw/releases/<TICKER>/*.txt (+ index.json)
scripts/consumidor/build.mjs            raw → site/consumidor/data/data.js   (tie-outs → raw/build-log.json)
scripts/consumidor/build-companies.mjs  data/companies-kpis.json + releases → site/consumidor/data/companies.js
scripts/consumidor/render-check.mjs     Playwright check of the page (see "Before pushing")
scripts/consumidor/deck-check.mjs       builds the PDF presentation in both languages and checks it (see "PDF presentation")
scripts/consumidor/pending.mjs          what is waiting for attention: the worklist of the daily scheduled task
scripts/consumidor/probe.mjs            runner diagnostics (answers committed to a feature branch; never on main)
scripts/consumidor/lib/                 http helpers, CSV and xlsx readers, parsers (DFA, SCF, New York Fed), states
tools/assets/build-us-states.mjs        site/assets/us-states.js (state shapes from us-atlas; rebuild only if the map changes)
```

Workflow `consumidor-refresh.yml`: 14:10 and 21:40 UTC every day. A run commits only when a source published
something (`data.js` keeps its `generatedAt` when nothing changed). Order: fetch → releases → build → company check →
commit → optional steps (SOURCE DOWN issue, link check on the 14:10 run).

- A source that fails keeps its stored file; `raw/status.json` counts consecutive failures and the page labels the
  block "stored value". Three in a row → one issue "SOURCE DOWN: American Consumer - …" (label
  `consumidor-source-down`, which the watchdog reads as this page's alert), closed when every source answers again.
- A tie-out that does not hold stops `build.mjs` (exit 1): the page keeps its last data, the run ends red and the
  watchdog reports it. Soft checks are warnings in `raw/build-log.json`.
- `build-companies.mjs` fails when a curated `find` text or quote is not in the stored release of the cited filing, or
  when the number is not in its own `find` text; that company is left out. The decimals shown for each company figure
  are the ones its release prints (`dp`).
- Watchdog: entry `us-consumer` in `tools/watchdog/dashboards.json`; status stamp from `data.js → generatedAt`.
  The entry carries `since` (11-Oct-2026 18:03 UTC, the merge): schedules due before the page was on main are not
  judged. On its first day the watchdog read the page "late" for the 21:40 run of the evening before, which could not
  have happened; `since` was added for that.

Secrets used: `CENSUS_API_KEY`, `BLS_API_KEY`, `FRED_API_KEY` (keys are removed from everything written).

## What keeps the page current (owner, 11-Oct-2026: nothing may go stale, and without her involvement)

| What | Kept by | How often |
|---|---|---|
| Every official source (all sections) and every sentence, label and chart composed from it | the refresh workflow | 14:10 and 21:40 UTC; a newer edition (survey year, quarter, report) is found by itself |
| Revisions of a period already shown | the workflow's Sunday 14:10 run (`--force`: every source read again in full) | weekly |
| Company figures, quotes and period labels | the scheduled task "FNAM American Consumer: daily upkeep" (prompt: `ROUTINE-PROMPT.md`) | the day a release is stored (15:25 and 22:25 UTC) |
| Estimates of the K-shaped section (`data/kshape.json`) | the same task | weekly check |
| The Board notes the survey block reads (`data/notes.json`) | the same task | monthly check |
| A source past its publisher's usual date | the same task opens the publisher's page and records the check (`data/publisher-checks.json`) | when due, renewed every 30 days |
| A reader broken by a publisher's new layout, a failed tie-out, a failed run | the same task (repair on a branch, tested on the runner, merged only if every check passes) or its note to the owner | daily |
| A tab left open in a browser | the page itself: on return to the tab it asks whether the data files changed and reloads | on return |

- Allowances: one table (`ALLOW` in `build.mjs`), days after the END of the period a source is stamped with. The
  builder puts `allowDays` and `dueBy` on every source; the page turns a block amber from them in the reader's browser.
  A source past `dueBy` is listed in `raw/build-log.json → stale` unless a check of the publisher's own page, at most
  45 days old and naming the same period, is on file: then the page says "the latest the source publishes, checked
  <date>" instead of "no recent update". A check is only ever written from the publisher's page opened that day.
- `node scripts/consumidor/pending.mjs --summary` prints what is waiting: newer releases than the curated ones,
  figures citing a superseded 10-Q / 10-K, failing sources, failed tie-outs, overdue sources, checks about to lapse.
- `routine-state.json` (written only when it changes): filings the task judged not to be results (`skipped`), the
  date the notes were last checked, problems still open with their branch.
- What cannot be made automatic: a publisher that has not published. The page then shows the last period with its
  date and the check; nothing is estimated or carried forward as if it were new.
- The schedule and the task act on `main`: until the page is merged, the preview shows the data of the last run on
  the branch.

## Company figures: updated the day a release is stored

1. The scheduled run stores the two latest results releases of every company under `raw/releases/` and the page shows
   "newer report to review" beside a company whose stored release is at least 60 days newer than the curated one.
2. The daily scheduled task (`ROUTINE-PROMPT.md`, STEP 2 and 3) reads the new exhibit(s) and rewrites the company's
   record in `data/companies-kpis.json` for the new period: `period`, `periodEnd`, `filed`, the metrics (`comp`,
   `traffic`, `ticket` or `sales`; lenders: `nco`, `dq30`, `spend`), each with `v`, the exact `find` text from the
   release and, when the text is not in the first exhibit, `ex`; `prev` for the year-earlier rate; `quote`; `reviewed`.
   A session does the same by hand when asked.
3. `node scripts/consumidor/build-companies.mjs` must end "N of N verified; problems: 0", and the render check must
   be clean, before anything is pushed.
4. Segments are the company's own (Walmart U.S. ex fuel, Costco U.S. ex gasoline and FX, McDonald's U.S., Taco Bell
   for Yum!, Chili's for Brinker, Domestic Card for Capital One…). Never mix a consolidated figure with a segment
   one without saying so in `segment`. Direction-only disclosures use `trafficSign` / `ticketSign` (+1 / −1). A new
   period keeps the metrics and definitions of the record it replaces.

## K-shaped economy (section 09)

- Official series in the time-series charts: BLS spending shares by quintile (1984 on) and decile, the BLS experimental
  distribution of national-accounts consumption (top decile of households **ranked by spending**, 2000 on), BEA income
  shares by decile (2000 on; the latest year is provisional), DFA equity and net-worth shares, net-worth gains since
  2019-Q4 (nominal and deflated by the PCE price index), CE spending growth by decile in constant prices, Atlanta Fed
  wage growth for the lowest and highest wage quartile, Michigan sentiment by income tercile (three-month average).
- Axes the owner set (11-Oct-2026): spending chart, top 20% on the left axis from 35% and every top-10% series on the
  right from 20%; income chart, top 10% and next 40% on the left from 35%, bottom 50% on the right from 20%. Axis
  titles, legend and caption say which series is on which axis. A floor drops to the next round figure only if a
  series ever falls below it.
- Measurements and estimates published by others (Moody's Analytics / Mark Zandi, Federal Reserve research) live in
  `data/kshape.json`: each with its `kind` (`private`, `fed`, `official`), figure, period, publisher, publication date
  and URL. `measure: "spendTop10"` puts a figure in the chart "The Top 10%'s Share of Spending Depends on Who Measures
  It" beside the two official figures the pipeline computes; `superseded: true` marks a figure its publisher revised
  (Moody's 49.2% and 49.7%, before its change of method to reflect taxes); `headline: true` marks the one quoted in the
  stat row and summary. The page badges every row by who produced it and never mixes these into an official series.
  A figure enters the file only after it was read in the document its link opens (or in the intermediary named in
  `via`); a figure seen only in a search result or a research summary stays out (Moody's "45.5%, Q1 2026" could not be
  opened on 11-Oct-2026 and is not in the file). Quotes: one short sentence per source.
- The section's callouts say where the official figures show a K (wealth, confidence, lately wages) and where they do
  not (neither official measurement of the split of spending shows the top gaining share). Keep that balance: the
  measurements differ in what they count and the page says how.

## Gig work, United States only (in section 10)

Owner, 11-Oct-2026: gig figures limited to the United States where possible.

- **Official count** (card "Gig Work in the United States: The Official Count"): Census Nonemployer Statistics, source
  `nes` (`api.census.gov/data/<year>/nonemp`, NAICS 4853 taxi and limousine service, where ride-hailing drivers are
  classified, and 492 couriers and messengers; the NAICS vintage of the variable changes with the year and the industry
  title that comes back is checked). Businesses with no paid employees and receipts of $1,000 or more, from tax
  records, 2012 on. Counts, receipts and receipts per business; totals and averages are FNAM calculations.
- **Platforms** (card "What the Gig Platforms Report for the United States"): none of the four publishes trips or
  orders for the United States alone (checked in the 8-K releases, 10-Q and 10-K, 11-Oct-2026). `us` in
  `companies-kpis.json` lists what each reports for the country (`scope: "us"`) or the narrowest geography that
  contains it (`"usca"`), each entry citing its report through `filed` + `form` (`10-Q`, `10-K`, or `page:<id>`):
  Uber revenue by country (10-K) and for the United States and Canada (10-Q); DoorDash U.S. revenue (10-Q, 10-K) and,
  from the report it commissioned from Public First, people who delivered in the U.S., what they earned, weeks active
  and hours; Instacart operates largely in the United States and Canada and splits nothing; Lyft gives no figure by
  country. Whole-platform trips, orders and bookings stay in their own column, labeled as not the United States alone.
- The harvester keeps the passages of the latest 10-Q / 10-K that match the company's `quarterly` / `annual` pattern
  and the company pages listed under `pages` in `companies.json` (text kept only while the page answers; a figure
  cites it as `filed: "page:<id>"`). A release and the 10-Q are often filed the same day: `form` picks the document.
- Changes shown with one decimal are computed from the two levels in the report; with none, they are the company's.

## Leverage and financial stress (section 07)

Owner, 11-Oct-2026 ("yes to all of this"): leverage by group, how cards are paid, access to credit and expected
stress, buy now, pay later (survey, CFPB and lenders), cash cushions, rent burden by state, student loans by status,
bankruptcies by chapter and state, inflation by decile, saving by income decile, and the lenders that see strain first.
Official or SEC-filed sources only. The macro page already carries the quarterly household-debt aggregates: this
section is the distribution (who), never the aggregate again.

- `D.leverage` (DFA): liabilities ÷ assets, consumer credit ÷ (deposits + money market funds), mortgages ÷ real estate,
  by income, wealth and age group, every quarter since 1989. FNAM calculations on the Fed's levels.
- `D.burden` (SCF historical tables, workbook `scf<year>_tables_public_real_historical.xlsx`): table 18 has three
  blocks side by side (aggregate ratio, median ratio, share above 40%, share 60 days late); the reader keeps 60
  columns (`tables.v = 2`); 40 cut the last block off.
- `D.cards` (Philadelphia Fed, FRED ids `RCCCB…`): the three payment shares (minimum, between, full) do not add to
  100% (accounts with no balance or no payment are outside them); the caption says so.
- `D.expect` (New York Fed): the delinquency probability is monthly and by income / age / education; the Credit Access
  Survey runs every four months (February, June, October) and gives applications, rejections and "discouraged" by
  credit score. Small cells: the score-under-680 rejection rate moves 15 points between waves; the chart shows it,
  the text quotes the latest wave with its date.
- `D.bnpl`, `D.buffers` (Federal Reserve survey): `fedBlocks()` reads every `<table>` of the report's chapter pages and
  of its accessible version, titled by its `<caption>` or the last "Table N." / "Figure N." before it. The builder
  finds each table by its title, never by its number (numbers change every edition). The Board's note on buy now, pay
  later is listed in `SHED_NOTES` (fetch.mjs): add the next one there.
- `D.bnplStudy` (CFPB): figures taken from the newsroom page of the January 2025 study by regular expressions; the
  study covers 2021–2022 and will not update. The page says these loans are mostly absent from credit bureau files.
- `D.studentLoans` (Federal Student Aid): portfolio by loan status and Direct Loans by days delinquent, quarterly since
  2013. "In default" = more than 360 days late. The files are legacy `.xls`.
- `D.bankruptcy` and `states[].bankruptcy` (U.S. Courts Table F-2, 12 months to the latest quarter end and the same
  table a year earlier): districts are added up by state by the first two letters of the label ("AL,N" → AL); a label
  can carry a footnote mark ("AR ²") and the territories are spelled out. The districts must add up to the table's
  total or the source fails. Per 1,000 households of the ACS year of the map. The map's U.S. figure is the 50 states
  and D.C.; the table's total includes the territories and the caption gives both.
- K-shaped section, added with this round: `K.byIncome` (BEA and BLS joint distribution of disposable income, consumption
  and saving by income decile; the official "top 10% by income" share of national-accounts consumption, a bar of the
  measurement chart, and the saving-rate chart) and `K.prices` (BLS price indexes by spending decile; the chart shows
  average yearly rates for 2000–2019 and 2019 to the latest year, an FNAM calculation on the published indexes).
- Companies: groups `bnpl` (Affirm, Klarna, Block, PayPal, Sezzle) and `stress` (Ally, CarMax, Credit Acceptance,
  OneMain, FirstCash, EZCORP). A figure lists `us` (what the company reports for the United States) or `world`.
  Units `usdK` and `K` are for tables in thousands (the value in the record is the number as printed). Affirm's
  quarterly shareholder letter is not readable as text, so its record is the fiscal year from the 10-K (pattern
  `annual` in `companies.json`); PayPal reports no buy now, pay later volume: its record is the 10-Q's statement that
  the U.S. interest-free installment loans are held for sale since Q3 2025, and the loan balance. A change FNAM
  computed from two reported levels prints with "†".

## PDF presentation

The pill at the top right (ES · EN · 📄 Presentación (PDF), the same pill, place and behavior as the company models, GAP
first; added 13-Oct-2026 at the owner's request) and the address `/consumidor/?present=1&lang=es|en` (linked from the
landing page's "Board presentations" row) build a Letter deck in the reader's browser, in the language on screen: cover,
executive summary (the nine points of "At a Glance" under the six header figures), a contents page whose rows link to
their pages, one or more pages per section (income, debt and rent / bankruptcies also by state: the map or maps and the
50 states and the District of Columbia in two ranked columns; the spending-by-decile heat table with the page's colors;
the company tables read from the page, one line per reported figure, and every quote on a page of its own), sources and
methodology. About 32 pages, 4.5 MB.

- Builder `site/consumidor/present.js` on the shared engine `site/assets/present-core.js` (do not change the engine for this
  page: the builder subclasses it, and overrides `table()` only to split a cell's lines, joined with ¶, and to color the
  heat table's cells). It follows the Mexican Consumer deck; the list `PAGES` at its top is the deck: which charts go on
  which page, in which columns; two ids in brackets are the two charts of one card, printed side by side under the card's
  heading.
- Nothing is typed or computed in the builder. Figures come from `window.CONS_MODEL` (set at the end of `app.js`, with the
  state maps' metrics and notes in `maps`); sentences, tile labels, chart titles, captions, legends and the company tables
  are read from the page's own elements in the language on screen; every chart is drawn again off-screen from the options
  the page drew it with (`CONS_UI.specs` → `CONS_UI.printConfig`, which measures label lines in the chart's own font and
  shortens them when the paper cell is narrower than the screen). A chart the page hides leaves the deck; a page left
  empty is not printed. A log axis is an option of `UI.line` (`log: { min, max, ticks }`), so the deck draws it too.
- Charts are drawn in the light theme (the builder switches a dark page to light while it builds and back after). An axis
  title longer than the paper chart is tall is set smaller, and left out when it still does not fit (the legend names the
  axis of every series).
- `node scripts/consumidor/deck-check.mjs --shots <dir>` builds both decks and the deep link, reads them with PyMuPDF
  (`pip install pymupdf`; placeholders, the other language, repository paths, the header figures, the contents links,
  text past the margin or the footer) and rasterises every page: look at all of them in both languages before pushing a
  change to the builder, to `lib.js` or to a section's charts.

## Method notes

- Sources-and-uses diagram: both sides total personal income plus contributions for government social insurance
  (the national accounts subtract contributions from income; here they are drawn as a use). Labeled FNAM calculation.
- CE "gasoline and motor oil" = transportation minus vehicle purchases, other vehicle expenses and public
  transportation (the API does not carry the line for the decile tables). Labeled on the heat table.
- "Basics" = food at home, shelter, utilities, healthcare, gasoline and other vehicle expenses.
- Deciles are of consumer units ranked by income before taxes; spending above reported income in the low deciles is a
  known feature of the survey (retirees, students, under-reported income) and the page says so.
- State maps: seven classes with (nearly) equal numbers of states, one blue ramp; small states get a chip each.
  Cost-of-living adjustment = per-capita personal income ÷ regional price parity (all items) × 100.
- DFA wealth groups by net worth, income, age, generation, education and race; the SCF supplies medians (the DFA has
  none). DFA units are $ millions in the file, shown in $ trillions / billions.
- Text: every sentence of "At a glance", the callouts and the company summary is composed from the data at render
  time, in both languages. Nothing is typed.

## Before pushing a page change

```
python3 -m http.server 8123 --directory site        # detached
node --check site/consumidor/app.js site/consumidor/lib.js
node scripts/consumidor/build.mjs --check            # tie-outs against the committed raw files
node scripts/consumidor/build-companies.mjs --check
node scripts/consumidor/render-check.mjs --shots /tmp/shots   # 12 configurations; look at the crops
node scripts/consumidor/deck-check.mjs --shots /tmp/deck    # both decks; look at every page
node tools/audit-public-copy.mjs
```

`render-check.mjs` loads ES/EN × 1280/390/360 px × light/dark and fails on a script error, `undefined`/`NaN` in the
text, an empty chart or table twin, horizontal overflow, text under 11 px or a map without 51 states; two
configurations also press every selector, switch language and back, and load the page with each data block removed
and with no data at all. Every configuration also checks the language and PDF pill: on screen with its PDF button, never
covering a link of the site bar or of the navigation, and inside the navigation's band once the page scrolls (desktop).
