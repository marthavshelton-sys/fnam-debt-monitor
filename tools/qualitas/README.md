# Quálitas financial model — runbook

The interactive model lives at `site/qualitas/` (`index.html` + `app.js`, plus the hidden `quality.html`) and
is served at **https://fnam.mx/qualitas/** (optionally behind a password, see *Access*). Every figure on the
page comes from a data file in `site/qualitas/data/`; nothing is hard-coded in the page. Public information
only: Quálitas' quarterly results reports and SIFIC filings (IR site / BMV), material-event releases, the
company's historical workbook, official market data (Yahoo Finance, FRED) and earnings-call transcripts
supplied by the owner. The design mirrors the GAP model (`tools/gap/README.md`); Quálitas differences are
called out below.

## Data contracts

| File (`window.*`) | What it holds | Refresh |
| --- | --- | --- |
| `financials.js` (`Q_FIN`) | CNSF-format income statement, balance sheet, cash-flow statement, reported ratios and per-quarter KPIs for every quarter since 1Q13, the year-to-date columns Quálitas prints (3M/6M/9M/12M) and fiscal years FY2013→. Thousands of pesos; `layout` drives the rows; `sources.{is,bs,cf}` per period (URL, date, kind, comparative/derived flags) feed the provenance tooltips | **Automatic.** `qualitas-refresh.yml` → `harvest.py` → `build_data.py` → `validate_data.py` |
| `operations.js` (`Q_OPS`) | Insured units by country/type (period-end), written premiums by line of business (quarter and YTD), subsidiaries and verticals, solvency (RCS, margin, index), portfolio facts, per quarter since 3Q20 | **Automatic** (same pipeline) |
| `quality.js` (`Q_QUALITY`) | Every tie-out evaluated (ok / warn / fail), stale-series checks, curated-file freshness, parse warnings from `tools/qualitas/raw/build-log.json` | **Automatic.** Written by `validate_data.py`; rendered by `quality.html` |
| `market.js` (`Q_MARKET`) | Daily closes Q.MX, ^MXX, PGR, ALL, PSSA3.SA, MAP.MC; Q.MX cash dividends; USD/MXN; MX and US 10-year yields | **Automatic, daily** (`fetch-market.mjs`, weekdays 22:45 UTC) |
| `guidance.js` (`Q_GUIDANCE`) | Management expectations by vintage (`fy, kind, date, quarter, source, items{written, earned, lossRatio, combined, rif, roe}, notes`) plus the long-term references (loss ratio 62–65 %, combined 92–94 %, ROE 20–25 %, payout 40–90 %). Quálitas gives no formal guidance table: the ranges are the model's numeric reading of the words, kept in `text` | **Reviewing routine** after each 4Q report/call (initial) and each quarterly call (reaffirmed/revised) |
| `comments.js` (`Q_COMMENTS`) | One-line explanations per statement line, ratio, balance-sheet, cash-flow and operating key for year-over-year pairs (`2026Q2`, `2026M6`, `FY2025`), ES/EN, from the report and the call; `quotes` = verbatim management quotes per key (speaker, role, ES translation) from the transcripts | **Reviewing routine** (report) + hand-supplied transcripts |
| `summary.js` (`Q_SUMMARY`) | Executive summary: four cards × three bullets (operations; expectations and why they changed; capital and shareholder returns; what to watch) and the `basis` periods | **Reviewing routine** with each report |
| `reference.js` (`Q_REF`) | Company facts, shares (400 M issued, treasury), subsidiaries, ratings, analysts, dividends approved per AGM, debt instruments (none), the VAT matter (one-off 4Q25 adjustment used by the toggle, facts, timeline), international timeline, valuation defaults, peer list, sources | **Reviewing routine** on events |
| `glossary.js` (`Q_GLOSSARY`) | Bilingual one-sentence definitions keyed by data key; tooltips on row labels and the list in section 11 | Reviewed commit |
| `alerts.js` (`Q_ALERTS`) | Owner thresholds (share move, combined/loss ratio, solvency, ROE, expectation tracking, 10-year yield) for the page banner and the routine's email | Reviewed commit (readers can override per browser) |
| `consensus.js` (`Q_CONSENSUS`) | Sell-side consensus contract (written premiums, net income, EPS, ratios, ROE, DPS, target price, ratings) | **Placeholder** until a connector is authorised |
| `peers.js` (`Q_PEERS`) | Peer multiples (Progressive, Allstate, Porto Seguro, Mapfre, Admiral) | **Placeholder** until the FactSet connector is authorised |

Quálitas-specific choices: consolidated perimeter (holding company, CNSF criteria, not IFRS); revenue drivers
are insured units and written premiums by line (no monthly volumes are published); ratios follow the
company's definitions (acquisition ÷ retained, loss ÷ earned, operating ÷ written, combined = sum; adjusted
combined = all costs ÷ earned); the distorting item is the 4Q25 VAT charge (`reference.js → vat.adjust`),
stripped by the "Exclude 4Q25 VAT charge" switch from any period that covers 4Q25; there is no financial
debt, so section 07 shows capital, solvency (RCS) and the investment portfolio instead of leverage; valuation
is residual income (P/BV–ROE) rather than a DCF, with CAPM Ke (live 10-year M bond + beta from two years of
weekly returns vs the IPC, clipped 0.5–1.2), Gordon or exit-multiple terminal value and a market-implied Ke.

## Pipeline (`.github/workflows/qualitas-refresh.yml`)

```
scripts/qualitas/fetch-market.mjs   Yahoo Finance + FRED     -> site/qualitas/data/market.js
scripts/qualitas/harvest.py         IR site (informes, SIFIC) -> tools/qualitas/raw/text/{reports,sific}/*.txt + manifest.json
scripts/qualitas/test_parsers.py    parser unit tests on archived releases; a failure stops the build
scripts/qualitas/build_data.py      raw text + workbook       -> financials.js, operations.js, raw/build-log.json
scripts/qualitas/validate_data.py   tie-outs (exit 1 blocks the commit) + quality.js
git commit "[skip actions]" + push  Cloudflare Pages deploys; the marker keeps GitHub Actions from re-running
```

* Schedules: weekdays 22:45 UTC (market only) and 14:35 UTC (filings + market). Quálitas publishes results
  in the 3rd/4th week of January, April, July and October and the SIFIC filing a few days later.
  `workflow_dispatch` inputs: `mode` = market | filings | all, `full` = re-download everything, `years` =
  years to scan on the IR site (default 2023 → current; pass `2020 2021 2022` to backfill).
* Source precedence per statement (never mixed line by line): the period's own report → its own SIFIC filing
  (or the difference of two own YTD filings) → the comparative column of the following year's report → the
  comparative column of a SIFIC filing → the IR workbook (rounded millions; only where nothing else exists).
* Cash flow: only the SIFIC filings carry it (cumulative). The CNSF "flujos netos de operación" subtotal
  excludes net income and non-cash adjustments; the model shows it as *changes in operating items* and
  presents CFO = net income + adjustments + changes so CFO + CFI + CFF = change in cash. Quarterly CF =
  difference of two cumulative filings; quarters whose filing is image-only have none (see `quality.html`).
* Validation (`validate_data.py`): written − ceded = retained; retained − reserve increase = earned; earned −
  acquisition − claims = technical result; gross profit − opex = operating result; operating + RIF (+
  associates) = EBT; EBT − tax = net income; liabilities + equity = assets; reserve components = technical
  reserves; CF sections = change in cash; CF cash end = BS cash; YTD and FY = sum of quarters (warning when a
  quarter comes from the workbook); lines of business = total premiums (±2 %); Mexico + subsidiaries = total
  units; solvency index = (RCS + margin) ÷ RCS; 12-quarter window complete. Tolerance Ps. 5 thousand on
  parsed statements (Ps. 1.5 M on workbook figures); as-reported gaps up to Ps. 500 thousand are warnings.
* `quality.html` (hidden, linked from section 11) renders `quality.js`: every identity with its status, stale
  series (prices, FX, yields, latest quarter vs the results calendar), curated-file freshness and the parse log.

### When a release changes format

`build_data.py` matches printed labels against `IS_TPL`, `BS_A_TPL`, `BS_L_TPL` (reports) and the CNSF codes
(SIFIC). A changed layout makes `test_parsers.py` fail (expected values from 2023Q1, 2024Q3, 2025Q4 and
2026Q2) or the validator fail, and nothing is committed. Fix = add the label variant / code, run
`python scripts/qualitas/test_parsers.py && python scripts/qualitas/build_data.py &&
python scripts/qualitas/validate_data.py` locally, add a test case for the new layout, commit.

## Adding a quarter by hand

1. Drop the report PDF (and the SIFIC PDF) in `tools/qualitas/raw/pdf/` or run
   `python scripts/qualitas/harvest.py --years 2026` from a workstation; text lands in
   `tools/qualitas/raw/text/reports/2026Q3.txt` (`sific/2026Q3.txt`) with the source URL in the header.
2. `python scripts/qualitas/test_parsers.py && python scripts/qualitas/build_data.py &&
   python scripts/qualitas/validate_data.py` — zero failures required.
3. Curated files (or let the reviewing routine do it, `ROUTINE.md`): `comments.js` (new `2026Q3`, `2026M9`
   keys; `quotes` once the transcript arrives), `guidance.js` (a `reaffirmed`/`revised` vintage tied to
   `quarter: "2026Q3"`), `summary.js` (four cards, `basis`), `reference.js` (shares/treasury, events).
4. Commit `site/qualitas/data`, `tools/qualitas/raw` and `tools/qualitas/notify-state.json`; Cloudflare
   deploys on push.

## Reviewing routine and alerts

`tools/qualitas/ROUTINE.md` is the prompt for the weekday routine (Claude Code scheduled task with repository
access): it compares the live data with `tools/qualitas/notify-state.json`, updates the curated files when a
quarter, expectation or event lands, evaluates `data/alerts.js`, and ends with a concise note (headline
figure, what changed with links, why it matters, what to watch, link to the model) that the platform emails
to the owner on material days only. Hand-supplied transcripts and old PDFs are requested in that note.

## Page features (for the owner)

* **Scenario links**: periods, toggles, driver chips, share window, expectation metric and every valuation
  assumption live in the URL hash (`#stmt=…&v=roe:22|payout:75`); "Copy link" shares it, three browser slots
  save it, "Reset all" clears it.
* **Provenance on hover** (dotted underline): source document, date, comparative/derived flags and the figure
  as printed in thousands of pesos before conversion; keyboard-focusable. **Glossary** tooltips on row labels.
* **Management quotes** (💬 buttons) in the Comments column, the expectations table, dividends and solvency.
* **"What changed since your last visit"** compares the data stamps with the previous visit (browser only).
* **Alert thresholds** (section 11) mirror `data/alerts.js`; the banner in the header lists crossed ones.
* **Accessibility**: WCAG AA text contrast in both themes, visible focus states, keyboard-operable collapsible
  groups and toggles (`aria-pressed`), reduced-motion support (no chart animation), 400 px layout without
  horizontal page scroll (tables scroll inside, first column sticky).

## Access (password)

`functions/qualitas/_middleware.js` (Cloudflare Pages Function) guards `/qualitas/*` exactly like the GAP
gate. It is dormant until `QUALITAS_PASSWORD` exists in the Pages project's variables (Production and
Preview); optional `QUALITAS_SESSION_SECRET`, `QUALITAS_SESSION_DAYS`; `?logout` ends a session. While the
password is unset the page is served openly with `noindex` / `no-store` headers.

## Print as presentation

The 🖨 button (or Ctrl/Cmd+P) switches to print mode: Letter landscape, white background, black text, charts
keep their colours (fixed size), body 14 pt and titles 28 pt, tables trimmed to the last 8 quarters, a cover
with the basis dates and a confidentiality line, a closing slide with the sources, page numbers via CSS
page-margin boxes; cards never split and headings stay with their first card.

## Local preview

```
python -m http.server 8080 --directory site      # then open http://localhost:8080/qualitas/
```

## Known limitations / pending on the owner

* SIFIC filings for 1Q25 and 1Q26 are image-only PDFs: no quarterly cash flow for 1Q25, 2Q25, 1Q26, 2Q26
  (YTD statements and fiscal years are complete). A text-layer copy or the CNSF/BMV XBRL would fill them.
* Pre-2019 quarters come from the IR workbook (main lines only, rounded to millions).
* Consensus and peer tables wait for a market-data connector; the transcript for each new quarter is hand-
  supplied; password protection is off until `QUALITAS_PASSWORD` is set; the reviewing routine needs to be
  created as a scheduled task by the owner (the prompt is `ROUTINE.md`).
