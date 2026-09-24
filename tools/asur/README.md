# ASUR financial model — runbook

The interactive model lives at `site/asur/` (`index.html` + `config.js`, rendered by the shared engine
`site/assets/airport-model.js`) and is served at **https://fnam.mx/asur/** (password optional, see
*Access*). Every figure on the page comes from one of the data files in `site/asur/data/`; nothing is
hard-coded in the page or the engine.

| File | What it holds | How it is refreshed |
| --- | --- | --- |
| `financials.js` (`window.ASUR_FIN`) | Income statement, statement of financial position, cash flow, Table 1 KPIs (passengers by country, commercial revenue per passenger, capex, debt) and the country segments (Mexico, Puerto Rico, Colombia, United States) for every quarter since 1Q18, the year-to-date columns and fiscal years FY2018→ | **Automatic.** `asur-refresh.yml` → `harvest-releases.mjs` → `build-data.mjs` → `validate-data.mjs` |
| `traffic.js` (`window.ASUR_TRAFFIC`) | Monthly terminal passengers by airport (16 airports; domestic / international / total) and by country since Dec-2014 | **Automatic.** Same pipeline (monthly traffic release ≈ the 5th–8th of each month, PR Newswire) |
| `guidance.js` (`window.ASUR_GUIDANCE`) | Empty vintages: ASUR publishes no guidance table. The page shows the qualitative targets kept in `reference.js` (`regulation.facts`) instead | **Automatic** (the builder would fill it if a guidance table ever appears) |
| `comments.js` (`window.ASUR_COMMENTS`) | One-line explanations per income-statement line (`lines`) and per operating metric (`ops`) for year-over-year comparisons, ES and EN, from the results report and the call transcript; keyed `2026Q2`, `2026M6`, `FY2025` | **Drafted by the alert routine** when a new quarter lands; transcripts (`tools/asur/raw/releases/*tx_en.txt`) are folded in |
| `summary.js` (`window.ASUR_SUMMARY`) | Executive summary: operations, expansion and capital, debt and dividends, what to watch; four bilingual sections plus the basis periods | **Rewritten by the alert routine** when results, traffic or an event land |
| `market.js` (`window.ASUR_MARKET`) | Daily closes ASURB.MX, ASR, GAPB.MX, OMAB.MX, ^MXX; cash dividends; USD/MXN; MX and US 10-year yields | **Automatic, daily** (`scripts/airports/fetch-market.mjs --company=asur`, weekdays 22:50 UTC) |
| `reference.js` (`window.ASUR_REF`) | Slow-moving facts with sources: shares (300 M; ITA merger ≈307.2 M), concessions, AGM dividends, debt instruments (Table 7), the Motiva / ASUR US event timeline and facts, the Aerostar / Airplan explainer, DCF fallbacks | **Alert routine** (dividends, loans, acquisitions, share count) + hand edits |
| `peers.js` (`window.ASUR_PEERS`) | Peer multiples (GAP, OMA, Aena, Fraport, Zürich, Auckland) | **Placeholder** until a market-data connector is authorised |

Company specifics the engine handles through `config.js`: EBITDA margin "ex-IFRIC 12" = EBITDA ÷
revenues excluding construction services (ASUR's *Adjusted EBITDA margin*, Table 4); Aerostar (San
Juan) is consolidated at 100% with a 40% non-controlling interest, so the page's net income per share
uses *majority net income*; Table 1 debt figures (`kpi.netDebt`, `kpi.totalDebt`) are period-end
balances and are not summed across periods; ASUR US Airports (retail concessions at LAX, ORD and JFK,
consolidated from December 2025) has revenue but no passengers, which lifts non-aeronautical revenue
per passenger; the Motiva/CPC airports (closed 1-Sep-2026) consolidate from 3Q26.

`tools/asur/raw/releases/` keeps the text of every release and report the pipeline parsed (one file per
document, source URL and class in the header: `results-pdf` = quarterly report PDF, `results` = PR
Newswire summary, `transcript`, `traffic`, `other`) and `tools/asur/raw/manifest.json` lists them.
They are the audit trail: any number on the page can be traced to a line in one of these files.

## Pipeline (`.github/workflows/asur-refresh.yml`)

```
scripts/airports/fetch-market.mjs --company=asur   Yahoo Finance + FRED + Banxico -> site/asur/data/market.js
scripts/asur/harvest-releases.mjs                  PR Newswire organisation pages + keyword search (traffic, results, events)
                                                   asur.com.mx "Información financiera" (quarterly report and transcript PDFs;
                                                   URL pattern guessed for quarters the page does not link)
                                                   -> tools/asur/raw/releases/*.txt (+ manifest.json); PDFs converted with
                                                   scripts/airports/pdf2text.py (pdfplumber), PDFs themselves are not committed
scripts/asur/build-data.mjs                        raw text -> financials.js, traffic.js, guidance.js
scripts/asur/validate-data.mjs                     tie-outs (scripts/airports/validate.mjs); a failure blocks the commit
git commit "[skip actions]" + push                 Cloudflare Pages deploys; the marker keeps Actions from re-running
```

* Schedules: weekdays 22:50 UTC (market only) and 14:40 UTC (releases + market). GitHub only runs
  schedules on the **default branch**; from another branch trigger it from the Actions tab
  (`workflow_dispatch`, inputs `mode` = market | filings | all, `full` = re-download everything).
* The harvester is incremental (releases already in the manifest are skipped). `--full` redoes
  everything. Event releases are kept from 2024 onwards; traffic and results from 2016.
* Why PR Newswire and asur.com.mx rather than EDGAR: SEC EDGAR refuses GitHub-hosted runners. The
  PR Newswire release carries only the summary tables; the full statements, Tables 1–7, the country
  reviews and the airport traffic tables come from the quarterly-report PDF on asur.com.mx.
* The report parser (`build-data.mjs`) reads: the income-statement exhibit, Table 1 (highlights and
  KPIs), Table 4 (revenues and costs), Table 5 (financing result), Table 6 (debt), the statement of
  financial position, the cash-flow statement (year-to-date; quarters derived by difference), the
  "Review of <country> Operations" segment tables and the airport traffic tables. Older PDFs printed
  in Spanish number format (1Q24) are handled. `finish()` derives *other revenues* and *income tax*
  from totals when a line is missing.
* Validation: revenue components = total; EBT − tax = net income (0.05% tolerance); assets =
  liabilities + equity; cash begin + net change + fx = cash end; CF cash end = BS cash; YTD = sum of
  quarters for revenue / net income / EBITDA (restatements under 1% are warnings); domestic +
  international = total per airport; airports sum to the group total; no missing quarter in the
  12-quarter window; no missing month since 2019. Older periods only warn (`WARN hist`).
* Known gaps: Table 1 capex is not captured for 2024 (the highlights bullets are interleaved with the
  table in those PDFs); FY2016–FY2017 statements exist only as comparatives.

### When a release changes format

`build-data.mjs` matches each printed line against the regexes in `IS_ROWS`, `BS_ROWS`, `CF_*`,
`KPI_ROWS`, `SEG_ROWS`. A new or renamed line prints `IS unmatched: …` in the workflow log and, if a
subtotal no longer reconciles, the validator fails and nothing is committed. Fix = add the label
variant to the regex (or a new row to the catalogue, which also adds it to the page), run
`node scripts/asur/build-data.mjs && node scripts/asur/validate-data.mjs`, commit.

## Manual updates

**`site/asur/data/reference.js`** — the routine handles the usual events; update by hand when:

* the AGM or an extraordinary meeting approves dividends → `dividends[]` (Ps. per share, dates, source);
* shares outstanding change (ITA merger issuance, buybacks) → `shares` + `shares.history[]`;
* a loan or bond is drawn, issued or repaid → `debt.instruments[]` (Table 7 of the report; USD bonds
  converted at the quarter-end rate and noted); a rating → `debt.ratings[]`;
* Motiva / ASUR US / ITA milestones → `event.timeline[]`, `event.facts[]`; Aerostar / Airplan facts →
  `explainer.rows[]`; qualitative targets from the call → `regulation.facts[]`;
* the DCF fallbacks (`dcf`) when the capex programme or the concession horizon changes.

**`site/asur/data/comments.js`** — add the earnings-call colour once the transcript is archived
(`tools/asur/raw/releases/<date>_ir<nQyy>tx_en.txt`); percentages quoted are ASUR's.

## Access (password)

`functions/asur/_middleware.js` guards `/asur/*` exactly like the GAP one: dormant until
`ASUR_PASSWORD` is set in the Cloudflare Pages project (Settings → Variables and Secrets, Production and
Preview); optional `ASUR_SESSION_SECRET`, `ASUR_SESSION_DAYS`; `?logout` ends a session.

## Board presentation (PDF) — the "Presentación (PDF)" button

The button builds a Letter-size PDF in the browser in one click. The builder is shared by the airport pages
(`site/assets/airport-present.js`) and extends the generic engine `site/assets/present-core.js` (jsPDF +
jsPDF-AutoTable vendored in `site/assets/vendor/`; off-screen Chart.js charts; cover, footers, fit-to-page tables,
`**bold**` runs, Title Case, next-results rule). It reads `window.ASUR_MODEL`, the read-only API that
`airport-model.js` exposes at the end of its IIFE, so every figure is the same calculation the page shows; the prose
of sections 09 and 10 is read from the page itself. Language follows the ES/EN toggle; the file is named
`ASUR_<ADS ticker>_presentacion_<date>.pdf` / `..._board_presentation_<date>.pdf`. Ctrl/Cmd+P still prints the page.

Deep link: `/asur/?present=1&lang=es` (or `lang=en`) opens the page, sets the language and builds the PDF on arrival; the landing pages' "Board presentations (PDF)" links use it and pass the reader's current language.

Pages (15): cover · executive summary (`data/summary.js`, two columns auto-fitted; bullets without `**markers**` get
their lead clause emphasised) · tear sheet (price and ADS, market cap in MXN and USD, YTD and 12-month change vs the
IPC, 52-week range, AGM dividend and yield, LTM and quarter EBITDA, net debt/EBITDA, EV/EBITDA, P/E, passengers,
next results) · operating metrics and income statement for the latest quarter, LTM and fiscal year (portrait, ex-IFRIC
12, with the `data/comments.js` comments) · outlook, tariffs and investment commitments (`reference.js` → `regulation`,
`concessions`; the formal guidance layout switches on automatically when `guidance.js` carries vintages) · traffic by
airport (latest month with country subtotals, LTM, next traffic report from the median release day) · ASUR vs Mexico
from AFAC (`/aeropuertos/data/traffic.js`, two axes; Mexican airports only for a multi-country group) · 07 leverage,
08 dividends (with the annual cash-flow table), 09 and 10 (facts, timeline, fact sheet, the page's prose and a
company chart) · sources and methodology. Sections 04–06 are excluded on purpose.

Next results date: `reference.js` → `calendar.nextResults` once ASUR announces it (shown as *confirmed*); otherwise
assumed from the median lag between quarter-end and release for the same quarter over the previous three years.
To review the output headlessly, open the page with Playwright, click `#btnPrint`, save the download and rasterise it.

## Local preview

```
python3 -m http.server 8123 --directory site    # then open http://localhost:8123/asur/
```

## Change notifications (email)

A Claude Code Routine ("FNAM ASUR: email material changes") runs each weekday at 15:40 UTC, one hour
after the release harvest. It compares the newest quarter, the newest traffic month, the newest event
release and the `reference.js` blob against `tools/asur/notify-state.json`; when something material
changed it drafts the comments for a new quarter, updates `reference.js` for events (dividends, loans,
acquisitions, share count), rewrites the affected sections of `summary.js`, commits to `main`, and its
final message is a concise note delivered by email. If nothing changed the note is the single line "No
material change in ASUR data today."
