# GAP financial model — runbook

The interactive model lives at `site/gap/` (`index.html` + `app.js`) and is served at
**https://fnam.mx/gap/** behind a password (see *Access* below). Every figure on the page comes from
one of five data files in `site/gap/data/`; nothing is hard-coded in the page.

| File | What it holds | How it is refreshed |
| --- | --- | --- |
| `financials.js` (`window.GAP_FIN`) | Income statement, balance sheet, cash flow and operating KPIs for every quarter since 3Q18, the year-to-date columns GAP prints (6M/9M/12M) and fiscal years FY2018→ | **Automatic.** `gap-refresh.yml` → `harvest-releases.mjs` → `build-data.mjs` → `validate-data.mjs` |
| `traffic.js` (`window.GAP_TRAFFIC`) | Monthly terminal passengers by airport (domestic / international / total) since 2018, plus CBX users (a month's own release, else the following year's comparative column) | **Automatic.** Same pipeline (monthly traffic release ≈ the 5th of each month) |
| `guidance.js` (`window.GAP_GUIDANCE`) | Management guidance vintages: full-year growth ranges (traffic, aero / non-aero / total revenue, EBITDA, EBITDA margin) and capex, one entry per release that printed a guidance table, with the intro and assumption text GAP wrote | **Automatic.** `build-data.mjs` scans every archived release for the guidance table (January guidance release, 4Q results, mid-year revisions) |
| `comments.js` (`window.GAP_COMMENTS`) | One-line explanations per income-statement line (`lines`) and per operating metric (`ops`) for year-over-year comparisons (quarter, YTD, fiscal year), ES and EN, written from the results release and the earnings-call transcript; keyed `2026Q2`, `2026M6`, `FY2025` | **Drafted by the alert routine** when a new quarter lands (from the release), then reviewed; transcripts are folded in by hand when supplied |
| `summary.js` (`window.GAP_SUMMARY`) | Executive summary at the top of the page: operations, guidance and why it changed, debt ratios, what to watch; four bilingual bullet sections plus the basis periods | **Rewritten by the alert routine** when results, traffic, guidance or an event land |
| `market.js` (`window.GAP_MARKET`) | Daily closes GAPB.MX, PAC, ASURB.MX, OMAB.MX (FactSet Global Prices, the share-price authority since 2026-10-06; Yahoo/Stooq only for the sessions FactSet has not posted yet) and ^MXX (Yahoo); GAPB cash dividends (Yahoo); USD/MXN; MX and US 10-year yields | **Automatic, daily** (`fetch-market.mjs`, weekdays 22:40 UTC, overlays `tools/gap/raw/factset/prices.json`; the nightly FactSet routine re-pulls the closes at 19:52 New York time and applies them with `scripts/lib/factset-prices.mjs apply`) |
| `reference.js` (`window.GAP_REF`) | Slow-moving facts with sources: shares outstanding, concessions, PMD/tariffs, AGM dividends, debt instruments and ratings, CBX timeline and facts, FIBRA GAP fact sheet, DCF fallback assumptions | **Automatic via the alert routine.** Each weekday it reads any new event release (dividends, bond issuances or repayments, credit facilities, ratings, CBX / FIBRA GAP milestones, share-count changes) and edits this file on `main`, describing the change in the alert email. Shares outstanding also come from the latest results release once it is newer. Beta and cost of debt in the DCF are derived at render time (two years of weekly GAPB vs IPC returns; latest fixed-rate bond coupon); the values here are fallbacks. |
| `peers.js` (`window.GAP_PEERS`) | Peer multiples (ASUR, OMA, Aena, Fraport, Zürich, Auckland): last closes, USD market caps and ADTV, EV, NTM EV/EBITDA and NTM P/E with 1-, 3- and 5-year averages, dividend yield, leverage; GAP consensus (NTM, FY2026–28, price targets, ratings) | **Nightly** (19:52 New York time) by the cloud routine "FNAM Airports: FactSet peers refresh" through the FactSet connector: `tools/gap/raw/factset/latest.json` → `scripts/lib/factset-peers.mjs build` (same snapshot feeds ASUR's and OMA's tables). No FactSet credentials in GitHub Actions |

The **operating metrics** card at the top of section 01 (domestic / international / total terminal
passengers, CBX users, aeronautical and non-aeronautical revenue per passenger, CBX revenue per CBX user)
is computed at render time: passengers are the sum of `traffic.js` months in the selected period (they
tie to the quarterly report's total within rounding; before 2018 only the report's total is shown), unit
revenues divide the income-statement lines by those passengers, and CBX revenue (`is.revCbx`, the "CBX
revenues" line inside non-aeronautical revenue, consolidated from `reference.js` `cbx.consolidatedFrom`)
is divided by CBX users in the consolidated months only. Cargo WLUs, total WLUs and the three Exhibit F
ratios (aero + non-aero revenue per passenger, aeronautical revenue per WLU, cost of services per WLU) use
the reported `kpi` volumes; the card also carries a Comments column from `comments.js` (`ops`).

The income statement collapses two groups by default (the cost-of-services detail and the lines between
net income and comprehensive income attributable to the controlling interest); click the row to expand.
Its **Comments** column reads `comments.js` and only fills when period A is compared with the same period
a year earlier. Percentages quoted in a comment are GAP's; where GAP restated the prior-year base in a later
release, the table (as originally reported) can differ slightly, and the comment says so.

`tools/gap/raw/6k/` keeps the text of every release the pipeline parsed (one file per release, source URL
in the header) and `tools/gap/raw/manifest.json` lists them. They are the audit trail: any number on the
page can be traced to a line in one of these files.

## Pipeline (`.github/workflows/gap-refresh.yml`)

```
scripts/gap/fetch-market.mjs      Yahoo Finance (Stooq fallback) overlaid with FactSet closes (tools/gap/raw/factset/prices.json) + Banxico SIE (USD/MXN FIX SF43718, bono M 10y auction SF44071; BANXICO_TOKEN; FRED fallbacks) + FRED (US 10y) -> site/gap/data/market.js
scripts/gap/harvest-releases.mjs  GlobeNewswire listing -> tools/gap/raw/6k/*.txt (+ manifest.json)
scripts/gap/build-data.mjs        raw releases          -> site/gap/data/financials.js, traffic.js, guidance.js
scripts/gap/validate-data.mjs     tie-outs; non-zero exit blocks the commit; also writes site/gap/data/quality.js for the hidden data-quality page
scripts/gap/build-peers.mjs       tools/gap/raw/factset/latest.json (FactSet snapshot, nightly routine) -> site/{gap,asur,oma}/data/peers.js (wrapper over scripts/lib/factset-peers.mjs)
scripts/lib/factset-prices.mjs    tools/gap/raw/factset/pull/prices-daily-*.json (FactSet GlobalPrices, nightly routine) -> tools/gap/raw/factset/prices.json (ingest) -> site/{gap,asur,oma}/data/market.js (apply; the fetchers overlay the same file)
git commit "[skip actions]" + push  Cloudflare Pages deploys the commit; the marker keeps GitHub Actions from re-running
```

* Schedules: weekdays 22:40 UTC (market only) and 14:30 UTC on the 6th, 12th, 18th and 24th (releases +
  market). GitHub only runs schedules on the **default branch**, so merge this branch to `main` for the
  automation to start; until then trigger it from the Actions tab (`workflow_dispatch`, inputs `mode`
  = market | filings | all, `full` = re-download everything).
* The harvester is incremental: releases already in the manifest are skipped. Pass `--full` after
  changing the classifier in `harvest-releases.mjs`.
* Why GlobeNewswire and not EDGAR: SEC EDGAR refuses GitHub-hosted runners ("undeclared automated
  tool") whatever the User-Agent. The same releases are furnished to the SEC as Form 6-K exhibits.
  From a workstation, `node scripts/gap/harvest-releases.mjs --source=sec` (with
  `SEC_USER_AGENT="<name> <email>"`) pulls the 6-Ks and the 20-F XBRL company facts; `build-data.mjs`
  then also fills **FY2015–FY2017** from the XBRL facts (GlobeNewswire only starts in 2019, so those
  years would otherwise be empty — the file it writes, `tools/gap/raw/companyfacts.json`, can simply be
  committed; it is optional now that the PDF reports cover FY2015–FY2017).
* **Pre-2019 reports (FY2015–FY2017)** come from the 4Q15, 4Q16 and 4Q17 quarterly-report PDFs in
  `tools/gap/raw/pdf/`, converted once with `scripts/gap/pdf-to-text.py` (pdfplumber; see the file
  header) into the same pipe-delimited text format under `tools/gap/raw/6k/` (`*_pdfNQyy_en.txt`).
  To add another PDF report, drop it in `tools/gap/raw/pdf/` named `<YYYY-MM>_<nQyy>_….pdf`, run the
  converter, then `build-data.mjs` + `validate-data.mjs`.
* Data-quality page: https://fnam.mx/gap/quality.html (hidden, linked from section 10 of the model) renders
  `site/gap/data/quality.js`, which `validate-data.mjs` writes on every run: every identity evaluated with its
  status, series freshness (prices, FX, yields, latest quarter and traffic month against the calendar), the
  curated files against the latest quarter, the origin of every quarter and the parse warnings
  `build-data.mjs` leaves in `tools/gap/raw/build-log.json`. Same design and renderer as the Quálitas page
  (`site/assets/quality-page.js`, `site/assets/quality.css`).
* Validation (`validate-data.mjs`): revenue components = total; EBT + tax = net income; assets =
  liabilities + equity; cash begin + net change = cash end; CF cash end = BS cash; YTD = sum of
  quarters for revenue / net income / EBITDA; domestic + international = total per airport; airports
  sum to the group total; no missing quarter in the 12-quarter window; no missing month since 2019.

### When a release changes format

`build-data.mjs` matches each printed line item against the regexes in `IS_ROWS`, `BS_ROWS`, `CF_ROWS`,
`KPI_ROWS`. A new or renamed line prints a warning (`IS unmatched: …`) in the workflow log and, if a
subtotal no longer reconciles, the validator fails and nothing is committed. Fix = add the label variant
to the regex (or a new row to the catalogue, which also adds it to the page), run
`node scripts/gap/build-data.mjs && node scripts/gap/validate-data.mjs` locally, commit.

## BMV eventos relevantes (fail-safe for filings the wire never carries; since 3-Oct-2026)

After the harvest, the workflow step "Watch BMV eventos relevantes" runs the shared watcher
`scripts/lib/bmv-events.mjs --company=gap`. It reads GAP's list of eventos relevantes on the BMV
(issuer key GAP-6579), the official disclosure channel in Mexico, and matches each notice from 1-Jan-2026 on against what the
harvest already archived (a release of the same class dated the same day, or within a day for results and traffic). Every other notice is archived from its PDF as
`tools/gap/raw/6k/<date>_bmv<id>_es.txt` (Spanish; header lines `# title`, `# date`, `# source` = the filing PDF, `# class: other`);
when several notices of one kind fall on a day with fewer harvested documents, all of that day's notices are archived
(titles cannot be paired across languages; a duplicate is cheap, a missed filing is not). `build-data.mjs` skips these files; the alert routine reads them like any other event file whose name sorts after `lastEventFile`.
State: `tools/gap/raw/bmv-events.json` (last read, error, every notice and how it was handled). A BMV outage or
maintenance page (the site redirects to `no_disponible.html`, common on weekends) is recorded there and never fails the
run; the data-quality page shows the line "BMV eventos relevantes" and turns it amber after 4 days without a read.

## Manual updates (now rare; the routine handles the usual events)

**`site/gap/data/reference.js`** — update when:

* the AGM approves a dividend → `dividends[]` (Ps. per share, date, source);
* shares outstanding change (buyback cancellation, issuance) → `shares` + `shares.history[]`;
* a bond / loan is issued or repaid, or a rating changes → `debt.instruments[]`, `debt.ratings[]`.
  The instrument list is a dated snapshot: FactSet Debt Capital Structure (`details`, GAPB-MX, quarterly, the
  quarter-end in `debt.instrumentsAsOf`) gives every outstanding bond and loan with amount, coupon and maturity;
  series names come from GAP's issuance and repayment 6-Ks (`source` per row; `inferred: true` marks a name taken
  from the issuance pattern, shown with an asterisk). Refresh it in a Claude session after each quarterly report:
  pull the DCS detail at the new quarter-end, replace the rows, reconcile the principal subtotals against bank loans
  plus bonds on the balance sheet (the page prints both), and log post-quarter issues or repayments in
  `debt.events[]` until the next snapshot absorbs them. Only the page shows the full list; the deck shows the
  maturity profile by year.
  Optional: `debt.history[] = [{ q: "2025Q4", grossDebtMxnM: … }]` extends the net-debt chart to
  quarters whose published balance sheet only shows total liabilities (before 2Q26);
* the AGM sets a repurchase authorisation → `buyback[]` (max amount, 12-month window, item VI of the resolutions);
* `noGuidance[]` lists fiscal years for which GAP published no guidance (2020, 2021: nothing in its GlobeNewswire
  feed, which the harvester keeps in full for "guidance" titles, and no guidance table in the 4Q19 / 4Q20 reports);
  the track-record table prints them as rows so the gap is explained rather than silent;
* CBX or FIBRA GAP milestones → `cbx.timeline[]`, `fibra.timeline[]` (one short bullet per event, newest first,
  `kind` = `filing` / `press` / `check`; the page and the deck print them as a bulleted timeline under a headline
  composed from `placed` / `placedDate` / `statusAsOf`). Quote one revenue basis in the CBX timeline (ex-IFRIC 12,
  as the summary does; total in parentheses). In the FIBRA timeline, anything press-only is tagged `press`; the
  `check` entry and `statusAsOf` carry the date of the last check of GAP's releases and the BMV eventos relevantes
  list, not a claim about EDGAR (blocked from the session). Bump both on every check that finds nothing new; when
  the offering prices or closes, set `placed`, `placedDate` and add the `filing` entry;
* the PMD / maximum-tariff cycle is renewed → `regulation`, and the DCF `capexMxnM` profile.

**`site/gap/data/peers.js`** — never hand-edit. Written every night (19:52 New York time) by the cloud routine
"FNAM Airports: FactSet peers refresh (cloud)" (prompt in `FACTSET-PEERS-PROMPT.md`; owner asked for 8 PM ET,
2026-10-06): the routine calls the FactSet AI-Ready Data connector for GAP, ASUR, OMA, Aena, Fraport, Zürich and
Auckland, saves each raw result under `tools/gap/raw/factset/pull/` (gitignored), runs
`node scripts/lib/factset-peers.mjs ingest` (→ `tools/gap/raw/factset/latest.json`, the committed snapshot) and
`node scripts/lib/factset-peers.mjs build` (→ `site/gap/data/peers.js`, `site/asur/data/peers.js`,
`site/oma/data/peers.js`), validates and pushes to `main` with `[skip actions]`. `scripts/gap/build-peers.mjs` is a
wrapper over `build`. The calls, file names and every definition are listed at the top of the library.

Daily closes (owner, 2026-10-06: "switch the header price to FactSet too"): the same routine pulls FactSet GlobalPrices
`prices` (frequency D, fields price + volume) for GAPB-MX, ASURB-MX, OMAB-MX in local currency and PAC-US, ASR-US, OMAB-US
in USD for the last three months (`prices-daily-local.json`, `prices-daily-ads.json`), and `node scripts/lib/factset-prices.mjs
ingest --date $RUN` merges them into the committed `tools/gap/raw/factset/prices.json` (history since 2015-01-02, pulled once
in-session on 2026-10-06; a session still open comes back null and is skipped; overlapping dates take the newer pull). `node
scripts/lib/factset-prices.mjs apply` overlays the closes on the three `data/market.js` in place, and both market fetchers
(`scripts/gap/fetch-market.mjs`, `scripts/airports/fetch-market.mjs`) import `overlayFactSet()` and do the same on every Actions
run: inside FactSet's date range only FactSet's closes are shown; Yahoo/Stooq fill the history before it and the sessions after
it (the 22:40 UTC run sees a close an hour or two before the routine, 19:52 New York time), and the entry says so in `source` and
`provenance` (`authority`, `latestFrom`, `factset.{from,to,points,pulledAt}`, `fill.{source,fetchedAt,before,after,points}`).
`fetchedAt` is the stamp of the feed that supplied the latest close, so the header's "fetched" time is the routine's pull when
FactSet has the latest session. The S&P/BMV IPC stays on Yahoo (the connector rejects index ids), as does the dividend record.
Pages and decks compose every price-source label from `provenance` (`priceSrcLabel`, `priceSources`, `marketSrcNote` in the
model); the validators warn when any share series (the IPC excepted) carries no FactSet closes or the oldest FactSet end
date is more than five days old, and the
watchdog (`tools/watchdog/dashboards.json` → `prices`, since 6-Oct-2026) turns the page's dot red when `prices.json` or the
page's own `latestClose` (first bytes of `market.js`, written by the fetchers and by `apply`) is behind the BMV's (NYSE's for
the ADS) last completed session plus five hours. Yahoo's BMV closes
differed from FactSet's by more than 0.2% on about a sixth of the dates since 2015 (and the 6-Oct-2026 morning run printed
377.57 for GAPB.MX's 5-Oct close where FactSet, and the previous evening's Yahoo, had 379.01); the ADS series matched within 0.1% on every date. `ingest` refuses a partial pull (a listing with no rows) and a pull whose
closes disagree with the stored history on most overlapping dates (a split or restatement: re-pull from 2015-01-01 and run
`ingest --replace`); the overlay never discards points the page already shows when FactSet's range is narrower than before.

What the table shows (owner, 2026-10-06): every price is a FactSet close on one common date (the latest date on or
before the run with a close for every company, printed in the caption; a company closed that day takes its last close
before it and is named), market cap restated at that close and ADTV in US$ millions, NTM EV/EBITDA and NTM P/E with
their 1-, 3- and 5-year averages, dividend yield, net debt / EBITDA and the EBITDA margin. The company's own row is
FactSet's row computed exactly like the peers (only the dividend yield uses the AGM amount in `reference.js`); the
model's own price and net debt stay in the multiples table on the left. The trailing multiples and the USD return left
the table. The connector cannot run FactSet's FQL items (`FE_VALUATION(PE|FFEV_EBITDA, MEAN, NTM4_ROLL, ...)`,
`P_VOLUME_AVG`, `XP_PRICE_VWAP`; its screener lists `FE_VALUATION_PE_MEAN` but returns no values, checked 2026-10-06),
so the figures are assembled from the series it does expose: price / consensus NTM EPS mean and (market value + net
debt + minorities) / consensus NTM EBITDA mean for the current columns; for the averages, the same ratio each Friday
over the last 52 / 156 / 260 weeks (weekly consensus, weekly close, shares then outstanding scaled to FactSet's
all-class market value — GAP from `reference.js` — and the latest balance sheet already reported); ADTV = mean of the
daily turnover (volume × VWAP, USD) over the last three months, with the product-of-averages variant kept in the
snapshot as `adtv.productUsdM`. If the routine
fails, it pushes a `peers-failed-<date>` branch and writes `notify-state.json → lastPeersFailure`; the quality page
flags `peers.js` once its prices are older than 45 days.

## Access (password)

`functions/gap/_middleware.js` is a Cloudflare Pages Function that guards every URL under `/gap/`.
**It is dormant until `GAP_PASSWORD` exists**: without the variable the page is served openly (with
`noindex` and `no-store` headers). To turn the password on, configure once in the Cloudflare dashboard → Workers & Pages → the Pages project → **Settings →
Variables and Secrets**, for **Production and Preview**:

| Variable | Required | Meaning |
| --- | --- | --- |
| `GAP_PASSWORD` | to enable | The shared password. Unset = no password, page served openly. |
| `GAP_SESSION_SECRET` | no | Random string signing the session cookie; defaults to a hash of the password. |
| `GAP_SESSION_DAYS` | no | Session length in days (default 30). Append `?logout` to any /gap URL to end a session. |

The function directory must sit at the **project root** (next to `site/`). If the Pages project's
"root directory" setting is `site`, move the file to `site/functions/gap/_middleware.js`. Cloudflare
picks it up on the next deploy; no build step is needed. Page and data responses are sent with
`Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.

## Reusing the design for another company

`tools/gap/PROMPT-company-dashboard.md` is a fill-in-the-blanks prompt that specifies this model
(sources, coverage, sections, toggles, aesthetics, automation, delivery) plus a list of improvements,
for building the same dashboard for another listed company with Claude or another LLM.

## Print as presentation

The 🖨 button next to the language toggle switches the page into print mode (light theme, tables trimmed
to the last 8 quarters, fixed-size charts, a cover with the basis dates and a confidentiality line, a
closing slide with the sources) and opens the browser's print dialog; choose "Save as PDF", Letter
landscape. Each section starts on a new page and cards never split. Ctrl/Cmd+P triggers the same mode.

## Local preview

```
npx http-server site -p 8080      # then open http://localhost:8080/gap/  (no password locally)
```

## Change notifications (email)

A Claude Code Routine ("FNAM GAP: email material changes") runs each weekday at 15:30 UTC, one hour
after the release harvest. It compares the newest quarter, the newest traffic month, the newest guidance vintage and the
`reference.js` blob against `tools/gap/notify-state.json`; when something material changed, its final
message is a concise note with analysis, which the platform delivers to the repo owner by email (the
routine's completion notification, the same mechanism as the Mexico Fiscal monitor), and it records
the alert in the state file on `main`. If nothing changed the note is the single line "No material
change in GAP data today." If the data files fail to load or `validate-data.mjs` fails, it reports a
one-line pipeline alert once per distinct failure. Manage or pause it from the Routines list in
claude.ai/code.

**Known failure mode:** the routine's container persists between runs, so its STEP 0 checkout is a
reused clone, not a fresh one. If `main`'s published history is ever rewritten upstream (a force-push,
not something any workflow in this repo does — see the `git pull --rebase` retries in
`.github/workflows/*-refresh.yml`, which only rebase a run's own unpushed commit and never rewrite
published history), the cached local `main` stops being a fast-forward of `origin/main` and a plain
`git pull --ff-only` aborts. STEP 0 must fall back to resetting local `main` onto `origin/main` when
the fast-forward pull fails — the routine never carries uncommitted work between runs, so this is safe:

```
git fetch origin main && git checkout main && (git pull --ff-only origin main || git reset --hard origin/main)
```

Without the fallback, a rewrite silently kills that day's run before it ever compares data — no
failure note, nothing to email. This happened 2026-09-25 (see `notify-state.json` history). If any
other scheduled routine on this repo reuses the plain `git pull --ff-only` STEP 0, it carries the same
exposure and should get the same fallback.


## Board presentation (PDF) — the "Presentación (PDF)" button

`site/gap/present.js` builds a Letter-size PDF in the browser in one click. It extends the shared engine
`site/assets/present-core.js` (jsPDF + jsPDF-AutoTable vendored in `site/assets/vendor/`; charts drawn off-screen with
the page's Chart.js; cover, footers, tables, `**bold**` runs, Title Case, next-results rule — the same engine every
company presentation uses) and reads `window.GAP_MODEL`, the read-only API that `app.js` exposes at the end of its
IIFE, so every figure is the same calculation the page shows. Language follows
the ES/EN toggle; the file is named `GAP_PAC_presentacion_<date>.pdf` / `GAP_PAC_board_presentation_<date>.pdf`.

Deep link: `/gap/?present=1&lang=es` (or `lang=en`) opens the page, sets the language and builds the PDF on arrival; the landing pages' "Board presentations (PDF)" links use it and pass the reader's current language.

Pages: cover (landscape, unnumbered) · executive summary (`data/summary.js`, font auto-fitted to one page) · contents
(one linked row per section with the page's own numbers and titles, read from the page's headings; sub-rows when a section
spans several pages; the note names the sections the deck does not carry, 04 and 05) · tear sheet
(market data with fetch timestamp, LTM and quarter EBITDA, net debt/EBITDA, GAP B vs IPC rebased, 3-year price) ·
operating metrics and income statement of the latest quarter, latest fiscal year and LTM (portrait, with the
`data/comments.js` call comments; the LTM page reuses the latest quarter's comments and says so) · guidance in force,
track record and every vintage (landscape) · traffic by airport (latest month and LTM) · GAP vs Mexico (AFAC, from
`/aeropuertos/data/traffic.js`, two axes) · sections 07 leverage, 08 dividends, 09 CBX, 10 FIBRA GAP (landscape, bullets
and charts) · 06 relative valuation, two landscape pages placed right before the sources page (owner, 2026-10-07): the
FactSet peers table exactly as the page prints it (GAP's row through `GAP_MODEL.peersOwnRow()`, the lead sentence and the
method note read from the page's `#peersLead` / `#peersNote`, the analyst-consensus tiles, 1-, 3- and 5-year averages and
ADTV), then the weekly history of GAP's NTM EV/EBITDA and NTM P/E (`peers.js` → `own.history.series`) beside ASUR's and OMA's
with GAP's 5-year average dashed, one chart above the other (`peersPage` and `multiplesHistoryPage` in the shared engine) ·
sources and methodology. Every page after the cover carries the confidentiality footer and "Page X of Y".

Next results date: `reference.js` → `calendar.nextResults` when GAP has announced it (shown as *confirmed*); otherwise
the PDF assumes the median lag between quarter-end and release for the same quarter over the previous three years and
labels it *assumed*. The authorship line reads "Powered by <name>"; the name defaults to "Claude (Anthropic)" and can be
overridden by defining `window.FNAM_MODEL_NAME` before `present.js` loads.

Conventions the data files feed the PDF with: `summary.js` bullets may wrap their two to four most important words in
`**double asterisks**` (rendered bold on the page and in the PDF) and section titles are written in Title Case in both
languages (the page's `tc()` enforces it on every heading, static and dynamic; the owner's convention site-wide);
`reference.js` → `fibra.placed` (with `placedDate`) flips the FIBRA page title from "(Not Yet Placed)" once the offering
completes; timestamps in the PDF are shown in Mexico City time.

Layout rules the builder enforces: tables shrink their font until they fit the page (`fitTable`), notes are pushed up
rather than over the footer (`noteAbove`), and a table that would still spill is logged in the console. Glyphs that
Helvetica lacks (−, ≈, →, Δ…) are swapped before drawing. To review the output headlessly, open the page with Playwright,
click `#btnPrint`, save the download and rasterise it (PyMuPDF) — see the session notes.


## Conventions and pipeline notes (29-Sep-2026)

- Prices: `fetch-market` keeps only completed sessions, so the 14:30 UTC run publishes the previous close and the 22:40/22:55 UTC run the day's close; the page header prints the close date and the fetch time (CDMX). Since 2026-10-06 FactSet's closes (pulled by the nightly routine, committed in `tools/gap/raw/factset/prices.json`) win on every date they carry; see "Daily closes" above.
- Headings are Title Case in both languages; the English view uses American English and EV / P/E / ND.
- The executive summary writes the next-results date as `{nextResults}`; the page and the deck compute it from the same release-lag rule (comparative-column sources are ignored).
- `?lang=en|es` overrides the stored language; the two statement periods can never be equal.
- Debt instruments are a dated snapshot (`debt.instrumentsAsOf`) with post-quarter issues and repayments in `debt.events[]`; the page prints subtotals against the balance sheet, the deck a maturity profile by year.
