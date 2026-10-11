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
| 06 | Consumer credit | Banxico SIE: total financing to households (CF297), commercial banks' performing portfolio by product (CF835), rates on cards, payroll, personal, auto and mortgage loans, cards in force; BIS household credit ÷ GDP through FRED; ENIF microdata (who has which credit); ENIGH (card payments by decile) | quarterly / monthly / every three years |
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
scripts/mx-consumidor/pending.mjs          what is waiting for attention: the worklist of the daily scheduled task
scripts/mx-consumidor/probe.mjs            runner diagnostics (answers committed to a feature branch; never on main)
scripts/mx-consumidor/lib/                 http helpers, series manifest (ids + title patterns), ENIGH and ENIF tabulators, CSV / xlsx / PDF readers
tools/mx-consumidor/data/                  published check figures (ENIGH, ENIF), curated ENFIH figures, curated company figures, publisher checks
```

Workflow `mx-consumidor-refresh.yml`: 15:20 and 23:20 UTC every day (09:20 and 17:20 in Mexico City). A run commits
only when a source published something (`data.js` keeps its `generatedAt` when nothing changed). Order: fetch → build
→ commit → releases → company check → commit → optional steps (SOURCE DOWN issue, link check on the 15:20 run).

- A source that fails keeps its stored file; `raw/status.json` counts consecutive failures and the page labels the
  block "stored value". Three in a row → one issue "SOURCE DOWN: Mexican Consumer - …" (label
  `mx-consumidor-source-down`, which the watchdog reads as this page's alert), closed when every source answers again.
- A tie-out that does not hold stops `build.mjs` (exit 1): the page keeps its last data, the run ends red and the
  watchdog reports it. Soft checks are warnings in `raw/build-log.json`.
- `build-companies.mjs` fails when a curated `find` text or quote is not in the stored release of the cited filing, or
  when the number is not in its own `find` text; that company is left out. The decimals shown for each company figure
  are the ones its release prints (`dp`).
- Watchdog: entry `mx-consumer` in `tools/watchdog/dashboards.json`; status stamp from `data.js → generatedAt`
  (`STAMPS` in `site/assets/data-status.js`).

Secrets used: `BANXICO_TOKEN`, `INEGI_TOKEN`, `FRED_API_KEY` (removed from everything written). A session cannot reach
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
| Every official source and every sentence, label and chart composed from it | the refresh workflow | 15:20 and 23:20 UTC; a newer edition (survey year, quarter, month) is found by itself |
| Company figures, quotes and period labels | the scheduled task "FNAM Mexican Consumer: daily upkeep" (prompt: `ROUTINE-PROMPT.md`) | the day a release is stored (16:25 and 00:25 UTC) |
| Published check figures of a new ENIGH or ENIF edition | the same task | when a new edition appears |
| A source past its publisher's usual date | the same task opens the publisher's page and records the check (`data/publisher-checks.json`) | when due, renewed every 30 days |
| A reader broken by a publisher's new layout, a failed tie-out, a failed run | the same task (repair on a branch, tested on the runner, merged only if every check passes) or its note to the owner | daily |
| A tab left open in a browser | the page itself: on return to the tab it asks whether the data files changed and reloads | on return |

- Allowances: one table (`ALLOW` in `build.mjs`), days after the END of the period a source is stamped with. The
  builder puts `allowDays` and `dueBy` on every source; the page turns a block amber from them in the reader's browser.
  A source past `dueBy` is listed in `raw/build-log.json → stale` unless a check of the publisher's own page, at most
  45 days old and naming the same period, is on file. The ENFIH (one edition, 2019) is dated and never overdue.
- `node scripts/mx-consumidor/pending.mjs --summary` prints what is waiting.
- `routine-state.json` (created by the task, written only when it changes): filings judged not to be results
  (`skipped`), problems still open with their branch (`open`).

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
node tools/audit-public-copy.mjs                        # no repository paths, workflow names or links in reader text
```

The render check loads the page in twelve configurations (ES / EN × 1280, 390 and 360 px × light / dark), checks every
chart, table and map (32 states each), looks for `undefined` / `NaN`, overflow and text under 11 px, and repeats with
each data block removed (a missing block must hide its cards, never break the page).

To ask a publisher something from the runner: write `tools/mx-consumidor/probe.json` (format at the top of
`probe.mjs`), push the branch and dispatch the workflow on it with `probe=true`; answers land in
`tools/mx-consumidor/raw/probe/` on the branch (large files on the branch `claude/mx-consumer-scratch`). Delete both
before merging.
