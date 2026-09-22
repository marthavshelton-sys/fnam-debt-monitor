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
| `peers.js` (`window.OMA_PEERS`) | Peer multiples (GAP, ASUR, Aena, Fraport, Zürich, Auckland) | **Placeholder** until a market-data connector is authorised |

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
scripts/airports/fetch-market.mjs --company=oma    Yahoo Finance + FRED + Banxico -> site/oma/data/market.js
scripts/oma/harvest-releases.mjs                   A. ir.oma.aero (WordPress listings: earnings reports, traffic reports, news;
                                                      needs a browser User-Agent and retries on the captcha interstitial)
                                                   B. miranda-newswire.com (?s=OMA; each post links its PDF)
                                                   C. news.oma.aero newsroom (paginated; assets ?dl=1)
                                                   -> tools/oma/raw/releases/*.txt (+ manifest.json); PDFs converted with
                                                   scripts/airports/pdf2text.py (pdfplumber), PDFs themselves are not committed
scripts/oma/build-data.mjs                         raw text -> financials.js, traffic.js, guidance.js
scripts/oma/validate-data.mjs                      tie-outs (scripts/airports/validate.mjs); a failure blocks the commit
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

## Print as presentation

The 🖨 button next to the language toggle switches the page to print mode (cover with the basis
dates, one section per page, tables trimmed to the last 8 quarters, closing slide with the sources)
and opens the print dialog; choose "Save as PDF", landscape.

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
