# Oracle financial model — runbook

The interactive model lives at `site/oracle/` (`index.html` + `app.js`, plus the unlinked `quality.html`) and is
served at **https://fnam.mx/oracle/** (password: see *Access*). It is a port of the GAP model — same HTML/CSS,
same `app.js` structure and controls, same family of `data/*.js` contracts (`window.ORCL_*` mirrors
`window.GAP_*`) — so the two read side by side; only the company-specific sections differ (03 RPO & cloud
instead of traffic, 09 AI buildout instead of CBX, 10 RPO explainer instead of FIBRA GAP, 11 debt detail and
CDS). Every figure on the page comes from a data file in `site/oracle/data/`; nothing is hard-coded.

Unlike the Mexican models, the page data is **generated** from a curated layer: `tools/oracle/data/*.json`
is the only place numbers are entered (each with a source key into `sources.json`), `validate-data.mjs`
ties it out, and `build-data.mjs` writes `site/oracle/data/*.js`. Never hand-edit the generated files.

| Page file (`site/oracle/data/`) | Holds | Refreshed by |
| --- | --- | --- |
| `financials.js` (`window.ORCL_FIN`) | Income statement (GAAP and Non-GAAP reconciliation), balance-sheet highlights, cash flow, D&A/EBITDA and KPIs (RPO, cloud revenue, dividend) for 20 quarters 2Q22→1Q27 and ten fiscal years FY2017→FY2026 (FY2017–FY2021 at year level from the 10-Ks: GAAP lines, D&A, cash flow; no Non-GAAP before FY2022); `layout` row definitions; revenue-basis flags and Oracle's FY2025 recast | `build-data.mjs` from `quarters.json`, `fiscal_years.json` |
| `buildout.js` (`window.ORCL_BUILDOUT`) | The AI-infrastructure buildout as disclosed: megawatts delivered per quarter, GPU utilization and renewals, GPUs delivered, capacity secured, the named data-center sites (capacity, customer, developer, financing, status, sources) and the RPO recognition schedule; feeds the section-03 capacity/GPU/site cards and the section-09 flow and tracker | `buildout.json`, updated by hand after each call (the routine adds the new quarter's figures) |
| `market.js` (`window.ORCL_MARKET`) | Daily ORCL and S&P 500 closes, dividends by payment date, 10-year Treasury, shares outstanding | **Automatic, weekdays** (`fetch-market.mjs`, 21:45 UTC) |
| `reference.js` (`window.ORCL_REF`) | Slow-moving facts with sources: company, shares, ratings, 58 debt instruments, dividends declared, AI-buildout narrative and timeline, RPO explainer, glossary, DCF defaults, peer list | `build-data.mjs` from `market_reference.json`, `special_situations.json`, `explainers.json`, `glossary.json`; facts curated by the routine via PR |
| `guidance.js` (`window.ORCL_GUIDANCE`) | Every guidance vintage (quarterly ranges for revenue, cloud, Non-GAAP EPS in USD and constant currency; FY revenue/EPS/capex), with the transcript page where the release printed no table | `guidance.json` (+ `transcripts.json`) |
| `comments.js` (`window.ORCL_COMMENTS`) | Comments column for the income statement, the balance sheet and the cash-flow statement, plus the operating-metrics card, bilingual: 13 quarters 1Q24→1Q27 keyed `2027Q1` (shown for same-quarter-prior-year pairs) and fiscal years FY2024→FY2026 keyed `FY2026` (shown in FY mode for consecutive years); management quotes per period. Driver-only, one clause each, citing the release page or the call page and speaker | `comments.json` ← `_raw_comments_a/b.json` (quarters) and `_raw_comments_y.json` (years); new quarters drafted by the routine as `_raw_comments_c.json` |
| `summary.js` (`window.ORCL_SUMMARY`) | Executive-summary cards (operations, guidance, debt, what to watch) for the latest quarter | `comments.json` → `exec_summary` |
| `peers.js` (`window.ORCL_PEERS`) | Peer multiples (Microsoft, SAP, Salesforce, ServiceNow, IBM, Workday) | **Placeholder** until the FactSet connector is authorised (`peers.json`) |
| `cds.js` (`window.ORCL_CDS`) | 5-year senior CDS spread series, tenor, recovery assumption | **Placeholder** until the FactSet connector is authorised (`cds.json`) |
| `quality.js` (`window.ORCL_QUALITY`) | Last tie-out report + automation state, rendered by `quality.html` | `validate-data.mjs` → `quality_report.json`, `harvest-filings.mjs` → `state.json` |

## Curated source of truth (`tools/oracle/data/`)

| File | What | Key rules |
|---|---|---|
| `sources.json` | Registry of every source: title, form, URL, accession, `accessed` date | Every other file cites sources by key (`"source": "S-8K-FY2027Q1"`; transcripts `S-CALL-<id>`). Add the source here first. |
| `quarters.json` | Quarterly GAAP + Non-GAAP income statement, balance-sheet highlights, cash flow, D&A, RPO, dividend declared, guidance issued | USD millions as printed; per-share in USD; `diluted_shares` in millions. The first record is the schema — copy it exactly. `null` = not disclosed, never 0. `revenue_basis` = `legacy_lines` \| `fy2026_lines`; FY2025 quarters carry `revenue_recast_fy2026_basis`. |
| `fiscal_years.json` | Annual figures per fiscal year: FY2022→FY2026 from the 4Q releases (with Non-GAAP, D&A and the FY2025 recast); FY2017→FY2021 from the FY2019 and FY2021 10-Ks (`gaap.revenue` lines, opex, interest, tax, net income, EPS, shares, cash flow, D&A; `non_gaap: null`); FY2022 revenue lines from the FY2024 10-K | Same conventions; the tie-out sums the four quarters against it where all four exist. |
| `calendar.json` | Investor calendar: upcoming and last-6-months events (earnings calls, analyst days, conferences) with webcast, release and announcement links; `estimates` = derived windows for the next results date, labelled `derived`; `manual_events` = hand-curated entries with a source (a date named on a call before the IR page lists it), preserved by the script | Written every weekday by `scripts/oracle/fetch-calendar.mjs` from the Oracle IR events list and the date-setting releases; emitted as `data/calendar.js` (`window.ORCL_CALENDAR`) for section 12 and the presentation |
| `buildout.json` | Capacity delivered (MW) per quarter and fiscal year, capacity secured, GPU utilization / renewals / deliveries, named sites, RPO recognition schedule, funding items; each with source key or URL, page and speaker; `derived: true` marks figures computed from ratios management gave; each free-text site field (`capacity_text`, `customer`, `developer`, `financing`, `oracle_status`, `contracted`, `first_delivery`) has an `_es` counterpart | Curated after each call from the transcript; partner releases and wire reports only for site details Oracle has not disclosed. |
| `dividends.json` | Each declaration: declared, amount, record, payment, source | Board declares quarterly; no AGM step. |
| `market_reference.json` | Price snapshot, 10-year Treasury, credit ratings, `debt_instruments` (58 lines from the 10-K footnote) | `price_snapshot` is rewritten by `fetch-market.mjs`; ratings and instruments are curated from agency releases and the 10-K/8-K. |
| `prices_orcl_daily.csv`, `prices_spx_daily.csv`, `treasury_10y.csv` | Daily series | Overwritten by `fetch-market.mjs`. |
| `guidance.json` | Every vintage (initial, revised) per metric and period | Non-GAAP EPS and growth as Oracle states them; USD and constant currency kept separate; free-text notes bilingual (`_note`/`_note_es`, `fy_capex_note`/`fy_capex_note_es`, `multi_year_targets.note`/`note_es`). |
| `transcripts.json` | Per call: date, quantified guidance from the CFO's remarks, short attributed quotes | Built by `merge-transcripts.mjs` from the owner-supplied PDFs, which live only in the private `oracle-model` repository (licensed material). Without the raw extractions the merge keeps the existing file. |
| `comments.json` | Comments per quarter (`by_quarter.FY2027Q1.comments.<key>.{en,es,src}`), executive summary, headline | Merged from `_raw_comments_*.json` by `merge-comments.mjs`; reviewed before publishing. |
| `special_situations.json`, `explainers.json`, `glossary.json` | Bilingual narrative for sections 09 and 10 and the glossary | These files narrate; figures quoted must already exist in `quarters.json`. |
| `peers.json`, `cds.json` | FactSet data contracts (schema documented in each file) | Empty until the connector is authorised. |
| `alerts.json` | Owner thresholds for the routine's email (1-day share move, max net debt / LTM EBITDA, guidance tracking) | Read by the reviewing routine. |
| `state.json` | Automation state: accessions seen, filings pending extraction, log | Written by `harvest-filings.mjs`; the routine marks extractions `done`. |
| `quality_report.json` | Last tie-out: checks, failures, warnings, stale series | Written by `validate-data.mjs`. |

`tools/oracle/raw/{8k,10q,10k}/` keeps the full HTML of every earnings exhibit the model uses (one file per
filing, accession in the name). It is the audit trail: on every build `test-parsers.mjs` re-reads each exhibit and
checks 26 printed figures per quarter against `quarters.json` (the four revenue lines and total, the nine
operating-expense lines and total, operating income, interest expense, pretax and net income, diluted EPS and
share count, and the balance-sheet cash, marketable securities, total assets, current and non-current borrowings
and current deferred revenue). 338 checks across the 13 archived quarters; any mismatch fails the build.

Conventions: nominal USD as reported; thousands shown as millions; outflows stored negative
(`capex_quarter: -28499`); ISO dates; one decimal on percentages applied at render time, never in the data.
Assumptions in `ASSUMPTIONS.md`; open items in `PENDING.md`.

## Pipeline (`.github/workflows/oracle-refresh.yml`)

```
scripts/oracle/fetch-market.mjs     Nasdaq/Yahoo/Stooq + FRED   -> tools/oracle/data/*.csv, market_reference.json
scripts/oracle/harvest-filings.mjs  SEC EDGAR (IR feed fallback) -> tools/oracle/raw/*, tools/oracle/data/state.json
scripts/oracle/validate-data.mjs    tie-outs; non-zero exit fails the job; writes quality_report.json
scripts/oracle/test-parsers.mjs     archived exhibits vs quarters.json
scripts/oracle/build-data.mjs       curated JSON -> site/oracle/data/*.js
git commit "[skip actions]" + push  Cloudflare Pages deploys the commit
```

* Schedules: weekdays **21:45 UTC** (market only; NYSE closes 20:00 UTC in summer, 21:00 in winter) and
  **13:30 UTC** (filings + market; Oracle files the results 8-K the evening it reports). GitHub only runs
  schedules on the **default branch**, so the automation starts when the `oracle-model` branch is merged;
  until then trigger it from the Actions tab (`workflow_dispatch`, `mode` = market | filings | all).
* Set the repository variable **`EDGAR_USER_AGENT`** = `Your Name your@email` (the SEC asks for a contact).
* **EDGAR from GitHub runners.** EDGAR has refused GitHub-hosted runners for the other models regardless of
  User-Agent. If it does here, `harvest-filings.mjs` logs the refusal and instead reads Oracle's IR
  press-release feed, recording any new results release as `pending_extraction` (form "IR release") so the
  page's quality view and the routine know a quarter is out. The routine (below) runs the harvester from a
  workstation, where EDGAR answers, and archives the exhibit.
* **Figures are never extracted automatically.** The harvester archives filings and marks them pending; the
  numbers enter `quarters.json` through the reviewing routine or by hand, and only after `validate-data.mjs`
  and `test-parsers.mjs` pass.
* The hand-curated files (quarters, fiscal years, guidance, comments, reference facts, peers, cds) are never
  rewritten by the workflow; it commits only `site/oracle/data`, `tools/oracle/data` (market CSVs, snapshot,
  state, quality report) and `tools/oracle/raw`.

## Reviewing routine (weekdays)

`ROUTINE.md` holds the complete prompt for a Claude scheduled task ("FNAM Oracle: weekday review", weekdays
08:30 Mexico City). It syncs `main`, runs the harvester, extracts a new quarter into `_raw_fy20xx.json` →
`merge-raw.mjs`, drafts the Comments column and executive summary, updates reference facts from events
(issuances, ratings, dividends), runs the build, opens a **pull request** (never pushes to `main`), and emails the
owner only on material days (thresholds in `alerts.json`). State in `notify-state.json`. No API key or mail
provider is needed: the routine's own session reads, drafts and emails through the Gmail connector.

## Adding a quarter by hand

1. On EDGAR (CIK 0001341439) open the 8-K with Item 2.02 for the quarter; the earnings release is exhibit
   `orcl-ex99_1.htm`. Save it as `tools/oracle/raw/8k/<period-end>_8K_<accession>_orcl-ex99_1.htm` (or run
   `node scripts/oracle/harvest-filings.mjs`, which does this and updates `state.json`).
2. Add a `sources.json` entry (`S-8K-FY20xxQn`): title, form, period_end, filing_date, URL, accession, accessed.
3. Write `tools/oracle/data/_raw_fy20xx.json` in the schema of `_raw_fy2026.json` (or copy the first record of
   `quarters.json`) from the release's GAAP statement, Non-GAAP reconciliation, balance-sheet highlights and
   cash-flow table. Q2–Q4 cash flows are cumulative (6-, 9-, 12-month): derive the discrete quarter by
   subtracting the previous cumulative release and note it in `cash_flow.note_en/es`. Record RPO, the dividend
   declared, the guidance ranges issued and D&A.
4. `node scripts/oracle/merge-raw.mjs` — normalises signs, registers sources, derives D&A, merges transcripts
   and comments, rewrites `quarters.json`, `fiscal_years.json`, `guidance.json`, `dividends.json`.
5. `node scripts/oracle/validate-data.mjs`. Fix anything that fails — a failure almost always means a
   transcription slip, not an Oracle error.
6. Draft the Comments column and executive summary for the quarter as `_raw_comments_<x>.json` (shape of
   `_raw_comments_b.json`) and run `node scripts/oracle/merge-comments.mjs`.
7. `node scripts/oracle/build.mjs` (validate → parser tests → data files). Commit `tools/oracle/data`,
   `tools/oracle/raw`, `site/oracle/data`. Mark the filing `done` in `state.json`.

After a 10-K (June): extract the annual statement and D&A into `fiscal_years.json`, the debt footnote into
`market_reference.json` → `debt_instruments` (must reconcile to the disclosed gross total) and the shares on
the cover. After a 10-Q: shares on the cover; retire matured notes.

### When a release changes format

`test-parsers.mjs` re-parses every archived exhibit for "Total revenues" and "Total operating expenses". If
Oracle renames a caption, the test fails and the workflow commits nothing. Fix = extend the label regex in
`test-parsers.mjs` (and, for the statements, the mapping in `merge-raw.mjs`), rebuild, commit.

## Manual updates

**`market_reference.json`** — when a rating changes (`credit_ratings`, with the agency release as source), when a
bond is issued or repaid (`debt_instruments`; principal must still reconcile to the latest filed gross total),
when the share count changes (`price_snapshot.orcl.shares_outstanding_millions`, from the 10-Q cover).

**`special_situations.json`** (section 09, AI buildout) and **`explainers.json`** (section 10, RPO) — when
the story moves; both are bilingual `_en/_es` pairs and must not introduce numbers that are not in `quarters.json`.

**`peers.json`, `cds.json`, `consensus.json`** — populate from FactSet once the connector is authorised
(field contracts in the file headers). The page shows Oracle's own multiples live and each peer's row, the CDS
chart and its implied default probability once values are non-null.

## Access (password)

`functions/oracle/_middleware.js` is a Cloudflare Pages Function that guards every URL under `/oracle/`.
**It is dormant until `ORACLE_PASSWORD` exists**: without the variable the page is served openly (with
`noindex` and `no-store` headers). To turn the password on, in the Cloudflare dashboard → Workers & Pages →
the Pages project → **Settings → Variables and Secrets**, for **Production and Preview**:

| Variable | Required | Meaning |
| --- | --- | --- |
| `ORACLE_PASSWORD` | to enable | The shared password. Unset = no password, page served openly. |
| `ORACLE_SESSION_SECRET` | no | Random string signing the session cookie; defaults to a hash of the password. |
| `ORACLE_SESSION_DAYS` | no | Session length in days (default 30). Append `?logout` to any /oracle URL to end a session. |

## Board presentation (PDF) — the "Presentación (PDF)" button

`site/oracle/present.js` builds a Letter-size PDF in the browser in one click. It extends the shared engine
`site/assets/present-core.js` (jsPDF + jsPDF-AutoTable vendored in `site/assets/vendor/`; charts drawn off-screen with
the page's Chart.js; cover, footers, tables, `**bold**` runs, Title Case, next-results rule) and reads
`window.ORCL_MODEL`, the read-only API that `app.js` exposes at the end of its IIFE, so every figure is the same
calculation the page shows. Language follows the ES/EN toggle; the file is named
`Oracle_ORCL_presentacion_<date>.pdf` / `Oracle_ORCL_board_presentation_<date>.pdf`. The browser print path
(Ctrl/Cmd+P) still works as a fallback.

Pages (16): cover (landscape, unnumbered) · executive summary (`data/summary.js`, two columns auto-fitted to one page;
bullets without `**markers**` get their lead clause emphasised) · tear sheet (ORCL price with fetch timestamp in CDMX
time, market cap, YTD and 12-month change vs the S&P 500, 52-week range, dividend yield, LTM and quarter EBITDA, Non-GAAP
margin, net debt/EBITDA, EV/EBITDA, P/E, cash flows, RPO, cloud revenue, guidance in force, next results; ORCL vs S&P
500 rebased and 3-year price) · operating metrics, income statement of the latest quarter, LTM and latest fiscal year
(portrait, GAAP with the Non-GAAP and EBITDA blocks, revenue lines on the FY2026 basis via Oracle's recast, with the
`data/comments.js` call comments; the LTM page reuses the latest quarter's comments and says so) · guidance in force,
FY targets initial vs latest, track record and vintages (landscape) · RPO, capex and cash flow by quarter (portrait) ·
AI buildout sites and capacity (portrait, `data/buildout.js`) · sections 07 leverage, 08 dividends and cash
generation (ten fiscal years), 09 AI buildout (five-step flow and tracker), 10 RPO explained, 11 debt detail and
credit risk (landscape) · sources and methodology. Sections 04–06 (share price, DCF, relative valuation) are excluded
on purpose. Every page after the cover carries the confidentiality footer and "Page X of Y".

Next results date: `tools/oracle/data/calendar.json` → `nextResults: { date, time, timezone, fiscal_period, source }`,
filled automatically by `scripts/oracle/fetch-calendar.mjs` (weekday workflow) from Oracle IR's events list and the
"Oracle Sets the Date" release, and emitted to `reference.js` → `calendar.nextResults` (shown as *confirmed*); it is
`null` until Oracle announces the date and again after the call has taken place, so the PDF then assumes the median lag
between quarter-end and release for the same fiscal quarter over the previous three years and labels it *assumed*.
Never hand-edit it. The same file feeds section 12 (Investor calendar) with the full event list and its estimates.

Layout rules the engine enforces: tables shrink their font until they fit (`fitTable`), notes are pushed up rather
than over the footer (`noteAbove`), a table that would still spill is logged in the console, and glyphs Helvetica lacks
(−, ≈, →, ≥…) are swapped before drawing. To review the output headlessly, open the page with Playwright, click
`#btnPrint`, save the download and rasterise it (PyMuPDF).

## Data quality page

`https://fnam.mx/oracle/quality.html` (unlinked) lists every tie-out check, warning and stale series from the
last build and the automation state (filings seen, pending extraction, last harvest). Same layout as
`/gentera/quality.html`.

## Local preview

```
npx http-server site -p 8080      # then open http://localhost:8080/oracle/  (no password locally)
```

## Transcripts (private material)

The earnings-call transcripts the owner supplied are licensed PDFs. They and their raw extractions stay in the
private repository `marthavshelton-sys/oracle-model` (`Transcripts/`, `data/_raw_transcripts_*.json`), which
also keeps the model's development history up to the port. Only `transcripts.json` — short attributed quotes
and the quantified guidance ranges — is published here. `.gitignore` keeps `tools/oracle/transcripts/` and
`_raw_transcripts_*.json` out of this repository.

To fold in a new call: extract the PDF into `data/_raw_transcripts_<letter>.json` in the private clone (same
shape as the existing files), then from this repository run
`ORACLE_TRANSCRIPTS_RAW_DIR=<private clone>/data node scripts/oracle/merge-raw.mjs` followed by
`node scripts/oracle/build.mjs`. The merge registers the call as `S-CALL-<id>`, fills any guidance vintage the
release left unquantified, and rewrites `transcripts.json`.
