# Mexican Consumer (`site/mx/consumidor/`) — runbook

Bilingual page of the Mexico section (`/mx/consumidor/`; `/mx/consumer` redirects), built on 11-Oct-2026 as the Mexican
equivalent of the American Consumer page (`site/consumidor/`): who the Mexican consumer is, what households earn, where
the money comes from and where it goes, spending by income decile, consumer credit, leverage and financial stress,
wealth, the K-shaped economy, and what companies that sell and lend to the consumer report. It complements the Mexico
Macro Monitor (monthly series live there; this page is structure and distribution) and links to it.

The owner's rules for the American page apply here unchanged: every sentence is composed from the data in both
languages, official sources first, nothing may go stale and nothing may need her involvement, nothing is called "live".

## Sections and their sources

| # | Section | Source (publisher → how it is read) | Cadence |
|---|---|---|---|
| 02 | Who the consumer is | INEGI, ENIGH microdata of the latest edition (households, people, age, sex, schooling, household types, size of locality, tenure, equipment); ENOE informality rate (BIE) | every two years / monthly |
| 03 | Income | ENIGH microdata, every edition of the new series (2016 on): mean, median, deciles, Gini, by age, sex, schooling and locality of the head, by state (maps); real pesos with the INPC | every two years |
| 04 | Sources and uses of funds | ENIGH (income by source, spending by item, financial and capital flows); INEGI national accounts (private consumption ÷ GDP, quarterly, current prices); INEGI's monthly indicator of private consumption (through Banxico's SIE); Banxico remittances; Banxico card payments by line of business | every two years / quarterly / monthly |
| 05 | Spending by decile | ENIGH microdata (spending, basics, food, sources of income, card payments, deposits, rent burden by decile and by age) | every two years |
| 06 | Consumer credit | Banxico SIE: total financing to households (CF297), commercial banks' performing portfolio by product (CF835), rates on cards, payroll, personal, auto and mortgage loans, cards in force; BIS household credit ÷ GDP from the BIS's statistics API (FRED's mirror as a fallback); ENIF microdata (who has which credit); ENIGH (card payments by decile) | quarterly / monthly / every three years |
| 07 | Leverage and financial stress | Banxico: total and past-due balances by product (CF762, CF766) and the bank lending survey (EnBan); ENIF microdata (late payments, what people did when money ran short, cushions, rejected applications); ENIGH (households that spend more than they earn, rent burden); INEGI multidimensional poverty, national and by state (maps) | monthly / quarterly / every two or three years |
| 08 | Wealth | INEGI and Banxico, ENFIH 2019 (the only household balance-sheet survey; figures curated from the results presentation, each checked against its stored text); Banxico household savings (M2 by holder, housing and retirement funds, CF886 and CF834); ENIF (accounts) | one edition / monthly |
| 09 | K-shaped economy | ENIGH editions by decile in real pesos (income, spending, labor income, programs, pensions, remittances, shares, Gini with and without transfers); Banxico minimum wage (real index) and INEGI real average pay; ENOE employed people by level of income (BIE); INEGI retail sales | every two years / monthly / quarterly |
| 10 | What companies report | Results releases of 18 companies from the channel each files with: BMV eventos relevantes (PDF kept as text), BMV quarterly report (XBRL, management commentary) or SEC EDGAR (6-K / 8-K); figures curated | after each release, by the daily task |

Units: ENIGH amounts are shown as pesos a month (the published quarterly figure ÷ 3) with the quarterly figure beside
the headline numbers; "$" in the Spanish view and "MX$" in the English view are pesos, U.S. dollars are always "US$";
Banxico balances in thousands of millions of pesos; "billones" (ES) = "trillion" (EN) = 10^12.

What Mexico does not publish (so the page does not carry it): consumer credit by state, household sector balance
sheets by group after 2019, and results releases of the listed banks through a scriptable official channel (Banorte,
Inbursa, Regional and BanBajío post no XBRL package and no release in eventos relevantes; BBVA México and Santander
México are not listed). The system-wide bank figures come from Banxico instead.

## Pipeline

```
scripts/mx-consumidor/fetch.mjs            sources → tools/mx-consumidor/raw/<source>.json (+ raw/status.json)
scripts/mx-consumidor/build.mjs            raw → site/mx/consumidor/data/data.js   (tie-outs → raw/build-log.json)
scripts/mx-consumidor/harvest-releases.mjs BMV and SEC EDGAR → tools/mx-consumidor/raw/releases/<TICKER>/*.txt (+ index.json)
scripts/mx-consumidor/build-companies.mjs  data/companies-kpis.json + releases → site/mx/consumidor/data/companies.js
scripts/mx-consumidor/commit.sh            the workflow's commit step (see "Pitfalls" in MEMORY.md)
scripts/mx-consumidor/render-check.mjs     Playwright check of the page (see "Before pushing")
scripts/mx-consumidor/deck-check.mjs       builds the PDF presentation in both languages and checks it (see "PDF presentation")
scripts/mx-consumidor/pending.mjs          what is waiting for attention: the worklist of the daily scheduled task
scripts/mx-consumidor/schedule-check.mjs   did the latest scheduled refresh start? (--dispatch starts a missed one; the daily task runs it)
scripts/mx-consumidor/lib/calendar.mjs     release calendar: next release and due date of each source, banking days, reporting deadlines
scripts/mx-consumidor/lib/inegi_calendar.py  INEGI's release calendar PDF → products with their dates and periods
scripts/mx-consumidor/probe.mjs            runner diagnostics (answers committed to a feature branch; never on main)
scripts/mx-consumidor/lib/                 http helpers, series manifest (ids + title patterns), ENIGH and ENIF tabulators, CSV / xlsx / PDF readers
tools/mx-consumidor/data/                  published check figures (ENIGH, ENIF), curated ENFIH figures, curated company figures, publisher checks,
                                           release-calendar.json (what schedules each source; see "Release calendar")
```

Workflow `mx-consumidor-refresh.yml`: four runs a day, each shortly after the hour publishers release (Mexico City time,
UTC-6 all year): 12:20 UTC (06:20; INEGI publishes at 06:00), 15:20 UTC (09:20; Banco de México at 09:00), 23:20 UTC
(17:20; after the BMV's close and the 14:00 bank lending survey) and 03:20 UTC (21:20; results posted in the evening). A
run commits only when a source published something (`data.js` keeps its `generatedAt` when nothing changed). Order: fetch
→ build → commit → releases → company check → commit → optional steps (SOURCE DOWN issue, stale issue, link check on the
15:20 run). GitHub sometimes starts a scheduled run hours late or drops it (12-Oct-2026: the 15:20 slot started at 22:30
and the 23:20 slot had not started by 02:18); the daily task runs `schedule-check.mjs --dispatch`, which starts the
refresh by hand when no run began after the latest scheduled time.

- A source that fails keeps its stored file; `raw/status.json` counts consecutive failures and the page labels the
  block "stored value". Three in a row → one issue "SOURCE DOWN: Mexican Consumer - …" (label
  `mx-consumidor-source-down`, which the watchdog reads as this page's alert), closed when every source answers again.
- A tie-out that does not hold stops `build.mjs` (exit 1): the page keeps its last data, the run ends red and the
  watchdog reports it. Soft checks are warnings in `raw/build-log.json`.
- `build-companies.mjs` fails when a curated `find` text or quote is not in the stored release of the cited filing, or
  when the number is not in its own `find` text; that company is left out. The decimals shown for each company figure
  are the ones its release prints (`dp`).
- A source past its due date (`raw/build-log.json → stale`: the date its publisher scheduled plus a banking day, or its
  usual timing; see "Release calendar") a day longer (two for usual timing), with no publisher check on file, opens one
  issue "SOURCE DOWN: Mexican Consumer - data past its usual date (…)" (label `mx-consumidor-stale`), closed when the
  list is empty again: a run can land while the data is old.
- Watchdog: entry `mx-consumer` in `tools/watchdog/dashboards.json` (alert labels `mx-consumidor-source-down` and
  `mx-consumidor-stale`), with `since` = when the workflow reached `main`
  (11-Oct-2026, 20:50 UTC, minutes before the merge): schedules due before it are not judged. Status stamp from `data.js → generatedAt`
  (`STAMPS` in `site/assets/data-status.js`).

Secrets used: `BANXICO_TOKEN`, `INEGI_TOKEN`, `FRED_API_KEY` (removed from everything written; the BIS's API needs none). A session cannot reach
INEGI, Banxico, the BMV or the SEC: the runner fetches, the session reads the committed files.

## Tie-outs (what the build proves before the page changes)

- The ENIGH tabulation reproduces the figures INEGI prints in its results presentation (`data/enigh-published.json`):
  households, mean income and spending, deciles, Gini, sources of income, by edition. Same for the ENIF shares
  (`data/enif-published.json`). A new edition is tabulated as soon as its microdata is posted; its published check
  figures must then be added from INEGI's presentation (the build warns and `pending.mjs` lists it until they are).
- Parts add up to totals (income sources, spending items, deciles to the national figure, states to the nation).
- Every Banxico and INEGI series answers under the title its id is supposed to carry (`lib/series.mjs`).
- Every curated ENFIH figure is in the stored text of the presentation, on the page it cites (`data/enfih.json`).
- The consumption share of GDP from the quarterly accounts agrees with the yearly accounts for a benchmarked year.

## What keeps the page current

| What | Kept by | How often |
|---|---|---|
| Every official source and every sentence, label and chart composed from it | the refresh workflow | 12:20, 15:20, 23:20 and 03:20 UTC, after the publishers' release hours; a newer edition (survey year, quarter, month) is found by itself |
| Each source's next release (INEGI's calendar, Banco de México's rules and dates, the BIS's next release date) | the refresh (INEGI's calendar PDFs and the BIS's topic page, every run) and the daily task (a new calendar file, next year's dates) | every run / when a source runs out of dates |
| A scheduled refresh GitHub started late or dropped | the daily task (`schedule-check.mjs --dispatch`) | 16:25 and 04:25 UTC |
| Company figures, quotes and period labels | the scheduled task "FNAM Mexican Consumer: daily upkeep" (prompt: `ROUTINE-PROMPT.md`) | the day a release is stored (16:25 and 04:25 UTC) |
| A company past its reporting deadline with nothing stored | the same task checks whether it published (harvest repair) or is late | daily |
| Published check figures of a new ENIGH or ENIF edition | the same task | when a new edition appears |
| A source past its publisher's usual date | the same task opens the publisher's page and records the check (`data/publisher-checks.json`) | when due, renewed every 30 days |
| A reader broken by a publisher's new layout, a failed tie-out, a failed run | the same task (repair on a branch, tested on the runner, merged only if every check passes) or its note to the owner | daily |
| A tab left open in a browser | the page itself: on return to the tab it asks whether the data files changed and reloads | on return |

- Due dates: a source its publisher schedules is due one banking day after the scheduled date (three for the monthly
  consumption indicator, read through Banco de México's mirror of INEGI's series; two for the BIS); the others fall back
  to one table of allowances (`ALLOW` in `build.mjs`), days after the END of the period a source is stamped with. The
  builder puts `next` (the scheduled release), `dueBy` and `allowDays` on every source; the page turns a block amber from
  `dueBy` in the reader's browser and prints the next release in the source list.
  A source past `dueBy` is listed in `raw/build-log.json → stale` unless a check of the publisher's own page, at most
  45 days old and naming the same period, is on file. The ENFIH (one edition, 2019) is dated and never overdue.
- `node scripts/mx-consumidor/pending.mjs --summary` prints what is waiting.
- `routine-state.json` (created by the task, written only when it changes): filings judged not to be results
  (`skipped`), problems still open with their branch (`open`).

## Release calendar

`tools/mx-consumidor/data/release-calendar.json` says who schedules each source (owner, 13-Oct-2026: everything on the
page updated on time, aligned with scheduled releases); `lib/calendar.mjs` turns it into each source's `next` release and
due date. Bases, in order:

| Source | Scheduled by | Read from |
|---|---|---|
| informality (ENOE monthly), enoe (ENOE quarterly), consumption (IMCP), accounts (Oferta y Utilización Trimestral), wages (IGPERSE) | INEGI's release calendar, 06:00 | the calendar PDFs (`cal_<year>.pdf`, read on every run when the file changes; `lib/inegi_calendar.py` → `raw/calendar.json`) |
| remittances | Banco de México: "se publica el primer día hábil bancario del mes a las 9:00 horas." | rule, with the CNBV's banking holidays |
| savings, bankCredit (monetary aggregates release, Cuadros 2, 3 and 5) | Banco de México: "Se publica el último día hábil bancario de cada mes a las 9:00 horas." | rule |
| lending (EnBan) | Banco de México: "En 2026, los resultados de la EnBan estarán disponibles los días 6 de febrero, 8 de mayo, 7 de agosto y 6 de noviembre a las 14:00 horas." | dates (next year's added by the daily task) |
| bis | the BIS's "Next release date" on its topic page | `raw/bis.json → release` (every run) |
| financing, statesBanxico, cardPayments, rates, cardsInForce | no published date | usual timing (`ALLOW`) |
| enigh, poverty, enif, enfih | next edition not in any calendar yet (enfih: the only edition) | `editions` |
| companies | BMV: within the month after each of the first three quarters (Circular Única de Emisoras, art. 33, DOF 2-Dec-2025; the BMV's 2026 list: 30 Apr, 31 Jul, 30 Oct; Q4 preliminary 27 Feb); SEC: 10-Q in 40 days, 10-K in 60 (MELI, FCFS); NYSE-only foreign issuers (TBBB, NU): their usual lag + 7 days | `companies` |

The page's source list prints "Next release (Sep 2026): 22 Oct 2026, 06:00 (INEGI's calendar)" or the usual timing; the
companies section prints the BMV's deadline for the next quarter and flags a company past its own deadline. Banking
holidays: the CNBV's standing list (DOF each December; 2026 confirmed by the DOF of 10-Dec-2025), computed in
`lib/calendar.mjs`; both Banco de México rules give the six publication dates their pages list for April–September 2026.
A source that runs out of dates (INEGI publishes its calendar a year or a half-year at a time) is listed by `pending.mjs →
calendarGaps` and the daily task adds the new file or dates.

## Company figures

1. The scheduled run stores the two latest results releases of every company under `raw/releases/` and the page shows
   "newer report to review" beside a company whose stored release is at least 60 days newer than the curated one.
2. `companies.json` names each company's channel: `bmv` (issuer key of its page on bmv.com.mx; notices whose title
   reads as a results release), `xbrl: true` (the latest quarterly XBRL package on the issuer's financial-information
   page; the management-commentary text blocks), or `sec` + `form` (6-K with `match` on the exhibit's opening text, or
   8-K Item 2.02).
3. The daily task rewrites a company's record in `data/companies-kpis.json` for the new period: `period`,
   `periodEnd`, `filed`, `segment`, the metrics (`comp`, `sales`, `traffic`, `ticket`; lenders: `npl`, `loans`;
   `extra` with a label and a unit), each with `v` and the exact `find` text from the release, `prev` or `chgBp` where
   the text gives them, and `quote`. Figures are the company's own for Mexico, or for the narrowest segment that
   contains it, named in `segment`; a consolidated figure is never presented as Mexico.
4. `node scripts/mx-consumidor/build-companies.mjs` must end "N of N verified … problems: 0" and the render check must
   be clean before anything is pushed.

## PDF presentation

The PDF button in the pill at the top right (ES · EN · 📄 Presentación (PDF), the same pill, place and behavior as the company
models and the American Consumer page since 13-Oct-2026; it was in the navigation bar before) and the address
`/mx/consumidor/?present=1&lang=es|en` (linked from the landing page's "Board presentations" row) build a Letter deck in the
reader's browser, in the language on screen: cover, executive summary (the ten points of "At a Glance", 1–5 down the left
column and 6–10 down the right, under the six header figures), a contents page whose rows link to their pages, one or
more pages per section (income and poverty also by state, with the map and the table of the 32 states; the company
figures in two tables, with the quotes), sources and methodology. About 19 pages, 4 MB.

- Builder `site/mx/consumidor/present.js` on the site's shared engine `site/assets/present-core.js` (do not change the
  engine for this page: the builder subclasses it). The list `PAGES` at its top is the deck: which charts go on which
  page, in which columns.
- Nothing is typed or computed in the builder. Figures come from `window.MXC_MODEL` (set at the end of `app.js`); the
  sentences, tile labels, chart titles, captions and legends are read from the page's own elements in the language on
  screen; every chart is drawn again off-screen from the options the page drew it with (`MXC_UI.specs` →
  `MXC_UI.printConfig`). A chart the page hides (its data block is missing) leaves the deck; a page left empty is not printed.
- Charts are drawn in the light theme: with the page in its dark theme, the builder puts the light one on, redraws,
  builds and puts the reader's theme back.
- A horizontal bar chart gives every row the height of its tallest label, so one with many rows needs a tall cell:
  give it a column of its own in `PAGES`. The builder draws such a chart on a larger canvas and scales it down (its text
  never prints below 6.8 pt); when that is not enough the labels touch, which only the eye catches.
- `node scripts/mx-consumidor/deck-check.mjs --shots <dir>` builds both decks and the deep link, reads the PDFs with
  PyMuPDF (`pip install pymupdf`) and rasterises every page: look at all of them in both languages before pushing a
  change to the builder, to `lib.js` or to a section's charts.

## Method notes

- ENIGH groups: schooling of the head from `educa_jefe` (none or incomplete primary 01–03, primary 04–05, secondary
  06–07, high school 08–09, college and more 10–11); owners include those still paying; deciles are INEGI's (households
  ranked by current income per household). Real pesos: annual-average INPC of the latest edition's year ÷ that of the
  edition's year.
- ENIF 2024: people aged 18 to 70. "Rejected" = share of those who ever applied whose application was ever rejected
  (question 6.16); formal credit = holds it now; informal credit = borrowed in the past 12 months.
- Bank credit: sizes and growth from CF835 (performing portfolio, continuous series); the past-due ratio is CF766 ÷
  CF762 within those two tables. CF762 changed coverage in February 2026 (the card balance rose from 520.9 to 687.0
  thousand million pesos in one month while CF835 shows no jump), so its levels are never compared across that date.
- Card payments (CF958) are credit and debit cards together.
- Bank lending survey: diffusion indexes; positive = more demand / easier standards.
- Consumption share of GDP: four-quarter average of private consumption ÷ four-quarter average of GDP, both at current
  prices, from the quarterly accounts (the yearly series' two latest years are preliminary and not restated).
- Surveys under-capture the top of the distribution (INEGI says so in every ENIGH); the page says it where it shows
  top shares, and adjusts nothing.

## Before pushing a page change

```
node --check <every edited script>
node scripts/mx-consumidor/build.mjs --check            # 0 fail
node scripts/mx-consumidor/build-companies.mjs --check  # N of N verified, problems: 0
(setsid nohup python3 -m http.server 8123 --directory site >/dev/null 2>&1 &)
node scripts/mx-consumidor/render-check.mjs [--shots <dir>] [--only=es-1280-light]
node scripts/mx-consumidor/deck-check.mjs --shots <dir>   # after a change to present.js, lib.js or a section's charts
node tools/audit-public-copy.mjs                        # no repository paths, workflow names or links in reader text
```

The render check loads the page in twelve configurations (ES / EN × 1280, 390 and 360 px × light / dark), checks every
chart, table and map (32 states each), looks for `undefined` / `NaN`, overflow, text under 11 px, text that runs out
of a header or stat tile, and the reading order of "At a Glance" (down each column), and repeats with each data block
removed (a missing block must hide its cards, never break the page).

To ask a publisher something from the runner: write `tools/mx-consumidor/probe.json` (format at the top of
`probe.mjs`), push the branch and dispatch the workflow on it with `probe=true`; answers land in
`tools/mx-consumidor/raw/probe/` on the branch (large files on the branch `claude/mx-consumer-scratch`). Delete both
before merging.
