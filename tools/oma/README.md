# OMA financial model — runbook

The interactive model lives at `site/oma/` (`index.html` + `config.js`, rendered by the shared engine
`site/assets/airport-model.js`) and is served at **https://fnam.mx/oma/** (password optional, see
*Access*). Every figure on the page comes from one of the data files in `site/oma/data/`; nothing is
hard-coded in the page or the engine.

| File | What it holds | How it is refreshed |
| --- | --- | --- |
| `financials.js` (`window.OMA_FIN`) | Statement of comprehensive income (with the revenue, cost and financing detail tables), statement of financial position, cash flow, operating data (seats, operations, passengers by type, cargo and workload units, commercial occupancy, MDP investments), the quarterly debt table and quarterly traffic by airport, for every quarter since 2Q13 (comparatives) / 4Q15 (own reports), year-to-date columns and fiscal years FY2015→ | **Automatic.** `oma-refresh.yml` → `harvest-releases.mjs` → `build-data.mjs` → `validate-data.mjs` |
| `traffic.js` (`window.OMA_TRAFFIC`) | Monthly terminal passengers by airport (13 airports; domestic / international / total) since Dec-2014. A month whose PDF cannot be read (Nov-2025) is derived from the quarterly table less the other two months; months whose release lacks the airport table take the following year's comparative column | **Automatic.** Same pipeline (monthly traffic release ≈ the 5th of each month) |
| `guidance.js` (`window.OMA_GUIDANCE`) | Empty vintages: OMA publishes no guidance table. The page shows the MDP 2026–2030 commitments and tariffs kept in `reference.js` (`regulation`) instead | **Automatic** (the builder would fill it if a guidance table ever appears) |
| `comments.js` (`window.OMA_COMMENTS`) | One-line explanations per income-statement line (`lines`) and per operating metric (`ops`) for year-over-year comparisons, ES and EN, from the quarterly report; keyed `2026Q2`, `2026M6`, `FY2025` | **Drafted by the alert routine** when a new quarter lands (OMA publishes no transcripts) |
| `summary.js` (`window.OMA_SUMMARY`) | Executive summary: operations, MDP and regulation, debt and dividends, what to watch; four bilingual sections plus the basis periods | **Rewritten by the alert routine** when results, traffic or an event land |
| `market.js` (`window.OMA_MARKET`) | Daily closes OMAB.MX, OMAB, GAPB.MX, ASURB.MX, ^MXX; cash dividends; USD/MXN; MX and US 10-year yields | **Automatic, daily** (`scripts/airports/fetch-market.mjs --company=oma`, weekdays 22:55 UTC) |
| `reference.js` (`window.OMA_REF`) | Slow-moving facts with sources: shares (386.2 M weighted), VINCI Airports' 29.99% stake, concessions, MDP 2026–2030 (Ps. 16,005 M by year and airport, tariff efficiency factor), AGM dividends, the bond-by-bond debt list (including issues after the quarter close), the VINCI timeline, DCF fallbacks | **Alert routine** (dividends, bonds, MDP, VINCI) + hand edits |
| `peers.js` (`window.OMA_PEERS`) | Peer multiples (GAP, ASUR, Aena, Fraport, Zürich, Auckland): last closes, USD market caps and ADTV, NTM EV/EBITDA and NTM P/E with 1-, 3- and 5-year averages, dividend yield, leverage, margin; medians | **Nightly** (19:52 New York time) by the cloud routine "FNAM Airports: FactSet peers refresh" through the FactSet connector, from the shared snapshot `tools/gap/raw/factset/latest.json` (`scripts/lib/factset-peers.mjs build`; runbook and definitions in `tools/gap/README.md` and `tools/gap/FACTSET-PEERS-PROMPT.md`). Every price is a FactSet close on one common date; OMA's own row is FactSet's row computed like the peers (dividend yield from the AGM amount) |

Company specifics the engine handles through `config.js`: the `ebitda` series is OMA's **Adjusted
EBITDA** (EBITDA − construction revenue + construction cost + major-maintenance provision) and its
margin is over aeronautical + non-aeronautical revenue, as OMA reports; reported EBITDA is kept as
`ebitdaReported`. The cost-per-passenger row is cost of services + G&A ÷ passengers ("Subtotal /
Passenger" in the report). The debt table on the page comes from `reference.js`; when that list is
empty the engine falls back to the quarterly report's debt table (`quarters[].debt.instruments`). One
ADS = 8 series B shares.

`tools/oma/raw/releases/` keeps the text of every release the pipeline parsed (header: source URL,
title, date, class `results` | `traffic` | `other`, and `via` = which source served it) and
`tools/oma/raw/manifest.json` lists them. `tools/oma/raw/listings/` holds a seed copy of the
ir.oma.aero release listing. They are the audit trail: any number on the page can be traced to a
line in one of these files.

## Pipeline (`.github/workflows/oma-refresh.yml`)

```
scripts/airports/fetch-market.mjs --company=oma    Yahoo Finance + Banxico SIE (USD/MXN FIX SF43718, bono M 10y auction SF44071; BANXICO_TOKEN; FRED fallbacks) + FRED (US 10y) -> site/oma/data/market.js
scripts/oma/harvest-releases.mjs                   A. ir.oma.aero (WordPress listings: earnings reports, traffic reports, news;
                                                      needs a browser User-Agent and retries on the captcha interstitial)
                                                   B. miranda-newswire.com (?s=OMA; each post links its PDF)
                                                   C. news.oma.aero newsroom (paginated; assets ?dl=1)
                                                   -> tools/oma/raw/releases/*.txt (+ manifest.json); PDFs converted with
                                                   scripts/airports/pdf2text.py (pdfplumber), PDFs themselves are not committed
scripts/oma/build-data.mjs                         raw text -> financials.js, traffic.js, guidance.js
scripts/oma/validate-data.mjs                     tie-outs (scripts/airports/validate.mjs); a failure blocks the commit; also writes
                                                   site/oma/data/quality.js for the hidden data-quality page https://fnam.mx/oma/quality.html
                                                   (identities, series freshness, curated files, origin of every quarter, parse warnings
                                                   from tools/oma/raw/build-log.json; renderer site/assets/quality-page.js)
git commit "[skip actions]" + push                 Cloudflare Pages deploys; the marker keeps Actions from re-running
```

* Schedules: weekdays 22:55 UTC (market only) and 14:45 UTC (releases + market). GitHub only runs
  schedules on the **default branch**; from another branch trigger it from the Actions tab
  (`workflow_dispatch`, inputs `mode` = market | filings | all, `full` = re-download everything).
* The harvester is incremental (files already in the manifest are skipped); `--full` redoes
  everything. Event releases are kept from 2024 onwards; traffic and results from 2016. The three
  sources overlap on purpose: ir.oma.aero sometimes answers with a captcha page to runners, so the
  Miranda mirror and the newsroom fill the gaps. Investor presentations that the listing files under
  "earnings reports" are skipped by name in `build-data.mjs`.
* The report parser reads: the comprehensive-income exhibit (with weighted shares), the detail tables
  (revenues, costs, financing, EBITDA reconciliation), the operating-data table, the MDP investment
  line, the balance sheet (three dated columns), the cash-flow exhibit ("From April 1 to June 30" =
  quarter, "From January 1 …" = YTD; a 3-month YTD is also the first quarter), the indebtedness table
  (bond by bond, with maturity and fixed or floating rate) and the quarterly traffic by airport.
* Validation: as for ASUR (see `tools/asur/README.md`); the 12-quarter window must be complete and no
  traffic month may be missing since 2019. The Nov-2025 derivation is noted in `traffic.js`
  (`source.note`).

### When a release changes format

`build-data.mjs` matches each printed line against the regexes in `IS_ROWS`, `BS_ROWS`, `CF_*`,
`KPI_ROWS`. A new or renamed line prints `IS unmatched: …` / `CF unmatched: …` in the workflow log
and, if a subtotal no longer reconciles, the validator fails and nothing is committed. Fix = add the
label variant to the regex (or a new row to the catalogue), run
`node scripts/oma/build-data.mjs && node scripts/oma/validate-data.mjs`, commit.

## BMV eventos relevantes (fail-safe for filings the wire or IR site never carries; since 3-Oct-2026)

After the harvest, the workflow step "Watch BMV eventos relevantes" runs the shared watcher
`scripts/lib/bmv-events.mjs --company=oma`. It reads OMA's list of eventos relevantes on the BMV
(issuer key OMA-6707), the official disclosure channel in Mexico, and matches each notice from 1-Jan-2026 on against what the
harvest already archived (a document of the same class dated the same day, or within a day for results and traffic). Every other notice is archived from its PDF as
`tools/oma/raw/releases/<date>_bmv<id>_es.txt` (Spanish; header lines `# title`, `# date`, `# source` = the filing PDF, `# class: other`);
when several notices of one kind fall on a day with fewer harvested documents, all of that day's notices are archived
(titles cannot be paired across languages; a duplicate is cheap, a missed filing is not). The alert routine reads them like any other class `other` file whose name sorts after `lastEventFile`.
State: `tools/oma/raw/bmv-events.json` (last read, error, every notice and how it was handled). A BMV outage or
maintenance page (the site redirects to `no_disponible.html`, common on weekends) is recorded there and never fails the
run; the data-quality page shows the line "BMV eventos relevantes" and turns it amber after 4 days without a read.

## Manual updates

**`site/oma/data/reference.js`** — the routine handles the usual events; update by hand when:

* the AGM approves a dividend → `dividends[]` (total Ps. M and the per-share amount the exchange
  records, dates, source);
* a bond is issued or repaid, or a short-term loan drawn → `debt.instruments[]` (name as printed in
  the indebtedness table, principal in Ps. M, `rate` with the word "fixed" for fixed coupons so the
  DCF picks the latest one); a rating → `debt.ratings[]`;
* a new MDP or tariff decision → `regulation.mdp`, `regulation.facts[]`, `explainer.rows[]` and the
  DCF `capexMxnM` profile;
* VINCI Airports milestones → `event.timeline[]`, `event.facts[]`; a change in the share count →
  `shares` + `shares.history[]`.

## Access (password)

`functions/oma/_middleware.js` guards `/oma/*` exactly like the GAP one: dormant until `OMA_PASSWORD`
is set in the Cloudflare Pages project (Settings → Variables and Secrets, Production and Preview);
optional `OMA_SESSION_SECRET`, `OMA_SESSION_DAYS`; `?logout` ends a session.

## Board presentation (PDF) — the "Presentación (PDF)" button

The button builds a Letter-size PDF in the browser in one click. The builder is shared by the airport pages
(`site/assets/airport-present.js`) and extends the generic engine `site/assets/present-core.js` (jsPDF +
jsPDF-AutoTable vendored in `site/assets/vendor/`; off-screen Chart.js charts; cover, footers, fit-to-page tables,
`**bold**` runs, Title Case, next-results rule). It reads `window.OMA_MODEL`, the read-only API that
`airport-model.js` exposes at the end of its IIFE, so every figure is the same calculation the page shows; the prose
of sections 09 and 10 is read from the page itself. Language follows the ES/EN toggle; the file is named
`OMA_<ADS ticker>_presentacion_<date>.pdf` / `..._board_presentation_<date>.pdf`. Ctrl/Cmd+P still prints the page.

Deep link: `/oma/?present=1&lang=es` (or `lang=en`) opens the page, sets the language and builds the PDF on arrival; the landing pages' "Board presentations (PDF)" links use it and pass the reader's current language.

Pages (15): cover · executive summary (`data/summary.js`, two columns auto-fitted; bullets without `**markers**` get
their lead clause emphasised) · tear sheet (price and ADS, market cap in MXN and USD, YTD and 12-month change vs the
IPC, 52-week range, AGM dividend and yield, LTM and quarter EBITDA, net debt/EBITDA, EV/EBITDA, P/E, passengers,
next results) · operating metrics and income statement for the latest quarter, LTM and fiscal year (portrait, ex-IFRIC
12, with the `data/comments.js` comments) · outlook, tariffs and investment commitments (`reference.js` → `regulation`,
`concessions`; the formal guidance layout switches on automatically when `guidance.js` carries vintages) · traffic by
airport (latest month with country subtotals, LTM, next traffic report from the median release day) · OMA vs Mexico
from AFAC (`/aeropuertos/data/traffic.js`, two axes; Mexican airports only for a multi-country group) · 07 leverage,
08 dividends (with the annual cash-flow table), 09 and 10 (facts, timeline, fact sheet, the page's prose and a
company chart) · sources and methodology. Sections 04–06 are excluded on purpose.

Next results date: `reference.js` → `calendar.nextResults` once OMA announces it (shown as *confirmed*); otherwise
assumed from the median lag between quarter-end and release for the same quarter over the previous three years.
To review the output headlessly, open the page with Playwright, click `#btnPrint`, save the download and rasterise it.

## Local preview

```
python3 -m http.server 8123 --directory site    # then open http://localhost:8123/oma/
```

## Change notifications (email)

A Claude Code Routine ("FNAM OMA: email material changes") runs each weekday at 15:45 UTC, one hour
after the release harvest. It compares the newest quarter, the newest traffic month, the newest event
release and the `reference.js` blob against `tools/oma/notify-state.json`; when something material
changed it drafts the comments for a new quarter, updates `reference.js` for events (dividends,
bonds, MDP, VINCI), rewrites the affected sections of `summary.js`, commits to `main`, and its final
message is a concise note delivered by email. If nothing changed the note is the single line "No
material change in OMA data today."


## Conventions and pipeline notes (29-Sep-2026)

- Prices: `fetch-market` keeps only completed sessions, so the 14:30 UTC run publishes the previous close and the 22:40/22:55 UTC run the day's close; the page header prints the close date and the fetch time (CDMX). FactSet is available only inside a Claude session, not in Actions.
- Headings are Title Case in both languages; the English view uses American English and EV / P/E / ND.
- The executive summary writes the next-results date as `{nextResults}`; the page and the deck compute it from the same release-lag rule (comparative-column sources are ignored).
- `?lang=en|es` overrides the stored language; the two statement periods can never be equal.
- Debt instruments are a dated snapshot (`debt.instrumentsAsOf`) with post-quarter issues and repayments in `debt.events[]`; the page prints subtotals against the balance sheet, the deck a maturity profile by year.
- Net debt includes lease liabilities (`debtExtraItems`), the definition OMA reports (Ps. 11,695 M, 1.13× at 30-Jun-2026).
