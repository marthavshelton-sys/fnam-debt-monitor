# Gentera model — runbook

Live page: https://fnam.mx/gentera/ (site/gentera). Structure mirrors the Quálitas and GAP models: a bilingual
single page (`index.html` + `app.js`) that reads nine data files and computes everything at render time. A
hidden data-quality page lives at https://fnam.mx/gentera/quality.html.

## Data files (site/gentera/data)

| File | Global | Refresh | Contents |
|---|---|---|---|
| `financials.js` | `G_FIN` | workflow, after each report | `layout` (bilingual row definitions for `is`, `bs`, `kpi`, each with the release page it comes from), `quarters[]`, `ytd[]`, `years[]`. Statements in **Ps. millions** as printed (CNBV criteria, IFRS 9-converged from 2022). Per quarter: `is` (interest income → comprehensive income, subsidiary interest income / margin / net income, write-offs), `bs`, `ops` (loan book, clients, headcount, stage-3 and NIM by subsidiary, cost of funds, ICAP, Perú solvency), `kpi` (reported: `nim`, `nimAdj`, `effic`, `efficOp`, `roa`, `roe`, `roeCtrl`, `npl`, `coverageRep`, `capAssets`; recomputed: `cor`, `yieldCalc`, `coverage`, `effCalc`, `effPre`, `taxRate`, `eps`, `bvps`, `leverage`, `loansToDeposits`), `shares.current` (millions), `sources` (URL, date, page), `origin` (`release` / `comparative` / `seed`). `discontinued` is derived where net income exceeds pre-tax minus tax (3Q22). |
| `operations.js` | `G_OPS` | workflow, after each report | flat per-quarter operating record (same `ops` fields plus loans, stage-3 balance, allowance, write-offs and subsidiary P&L/balance figures) and `monthly` (`cnbv`: Banco Compartamos loans, IMOR, deposits, YTD result; `sbs`: Compartamos Banco Perú balance, delinquency, write-offs) once `fetch-regulators.py` has run. |
| `quality.js` | `G_QUALITY` | workflow | parse log (origin per quarter, warnings) and the validator's result. |
| `market.js` | `G_MARKET` | workflow, daily | daily closes for GENTERA.MX, ^MXX, GFNORTEO.MX, RA.MX, BBAJIOO.MX, BAP; GENTERA cash dividends; USD/MXN (FRED DEXMXUS); MX 10-year (Banxico SIE `SF44071`, Bono M 10-year auction yield; FRED monthly fallback) and US 10-year (DGS10). Placeholder until the first run. |
| `reference.js` | `G_REF` | reviewed commit | company facts, shares, subsidiaries, dividends approved at each AGM, `adjust` (the 4Q25 Ps. 328 M ConCrédito deferred-tax write-down that drives the accounting switch), ConCrédito and Perú sections (timelines now carry the call facts), `management` changes, `ratings` (from the 3Q24 corporate presentation), `coverage` (brokers seen on the calls), group-lending facts, glossary, valuation defaults, sources. `analysts` (targets) stay empty until FactSet. |
| `guidance.js` | `G_GUIDANCE` | reviewed commit, each quarter | guidance vintages (`fy`, `kind`, `date` = release date, `call` = call date, `quarter`, `items{eps, loanGrowth, opexGrowth, cor, npl, roe}` with `lo`/`hi`/`text`, `notes`, `source` incl. the transcript path). 2023Q3–2025Q4 vintages are transcribed from the earnings calls; 2026 vintages from the 4T25/1T26/2T26 releases. `lo = hi` means "around"; a null bound means not given. |
| `comments.js` | `G_COMMENTS` | reviewed commit, each quarter | one-line y/y explanations keyed by period (`2026Q2`, `2026M6`, `FY2025`): `lines` (income-statement rows), `bs`, `ops`, and `call` = the earnings-call block of the quarter that closes the period (`es`/`en` note, `date`, `file`, `quotes{rowKey: {who, en, es}}`; one `CALLS` entry per call, shared by the quarter, YTD and FY periods). Periods that only have a call block (2023Q3–2025Q4) show mechanical comments plus the quotes (💬, expandable; open in print mode). |
| `summary.js` | `G_SUMMARY` | reviewed commit, each quarter | executive summary: `basis` + four sections (operations, guidance, asset quality/funding/capital, what to watch), ES and EN. |
| `peers.js` | `G_PEERS` | pending (FactSet) | peer multiples schema (GFNORTEO, RA, BBAJIOO, BAP as placeholders) and the consensus contract; all null until the connector is authorised. |

## After each quarterly report (≈ 3rd/4th week of Jan–Feb, Apr, Jul, Oct; 3Q26 ≈ 23 Oct 2026, assumed)

1. The 14:35 UTC weekday workflow harvests the new press release from the IR page, rebuilds
   `financials.js`/`operations.js`/`quality.js` and validates. Check the Actions log: a red run means the
   parser did not recognise a table or a tie-out failed — fix the templates in `scripts/gentera/build_data.py`
   (`IS_TPL`, `BS_TPL`, `IND_TPL`, `parse_release`) and re-run `workflow_dispatch` with mode `filings`.
   While a quarter is not parsed the page keeps showing the seed / previous values and `quality.html` says so.
2. Read the release. Drop the call transcript (and the deck, if any) into `tools/gentera/raw/transcripts/` and run
   `python scripts/gentera/ingest-transcripts.py`. Then edit by reviewed commit:
   - `comments.js`: add the quarter (`YYYYQn`) and the YTD period (`YYYYMm`); for a 4Q add `FYyyyy`; add the
     `CALLS` entry with the quotes per row (EN as spoken, ES translated) and point the three periods to it.
   - `guidance.js`: add a vintage (`initial` in February, `reaffirmed`/`revised` otherwise) with the wording,
     the release date and the call date.
   - `summary.js`: rewrite the four sections; update `basis`.
   - `reference.js`: AGM dividend (April), ratings, share count, timeline events, `updatedAt`.
   - `tools/gentera/raw/seed/quarters.json`: optional — append the quarter's transcription so the seed stays
     a complete fallback and `test_parser.py` can check the parser against it.
3. Open https://fnam.mx/gentera/ in ES and EN and check the header strip, the 01 comparison (y/y with
   comments), the guidance table, the valuation defaults and the print view.

## Reviewing routine (email on material days only)

A Claude Code Routine ("FNAM Gentera: review and email material changes") is meant to run each weekday at
15:35 UTC, one hour after the filings job. It compares the newest quarter, the newest CNBV/SBS month, the
newest guidance vintage, the `reference.js` blob and the latest market close against
`tools/gentera/notify-state.json`, and applies the thresholds stored there (share move ≥ 5% in a day,
consolidated stage-3 ratio above 4.5%, any guided metric tracking outside its range). When something material
changed it drafts the Comments column for the new quarter from the release, updates the reference facts,
rewrites the affected executive-summary cards, records what it did in the state file on `main`, and its final
message is a concise note (headline figure, what changed with source links, why it matters, what to watch,
link to the model) that the platform emails to the repository owner. On quiet days the note is the single line
"No material change in Gentera data today" and nothing is emailed. Enabled since 22 Sep 2026; pause or edit it
from the Routines list in claude.ai/code. The routine attaches the repository with push access and always
writes `lastCheckedAt` to the state file, so a day without a state commit means the routine did not run or
could not push (its first run on 24 Sep 2026 finished without pushing; the prompt now requires the push and
reports a refusal).

## What updates by itself, and what does not

| Element | Updates | Depends on |
|---|---|---|
| Statements, ratios, subsidiary tables, quality page | every weekday 14:35 UTC (new quarter parsed the day it appears on the IR page) | Gentera IR site reachable; parser recognising the release layout (test_parser + validate gate the commit) |
| Prices, index, peers' prices, FX, MX and US 10-year | every weekday 22:45 UTC and 14:35 UTC | Yahoo Finance (Stooq fallback), FRED, Banxico SIE (`BANXICO_TOKEN`) |
| CNBV and SBS monthly tables | every weekday, best effort (new month when the regulator publishes it) | CNBV portal and SBS site reachable; values pass the plausibility gates |
| Valuation, multiples, header tiles, charts | at render time from the files above | — |
| Comments, guidance vintage, summary, reference facts (dividend, ratings, next report date) | the reviewing routine, the weekday after a new release or event | routine pushes to `main`; Gentera's release wording |
| Call quotes | only when a transcript is dropped in `tools/gentera/raw/transcripts/` (Gentera publishes none) | hand-supplied file |
| Peer multiples and consensus | not yet: waits for the FactSet connector (shown as "pending") | FactSet |

The page shows a yellow refresh notice when prices are older than 7 days or the statements older than 10 days,
and marks the next-report date as "to be confirmed" once it has passed.

Isolation from the other pages: the workflow has its own concurrency group, its bot commits touch only
`site/gentera/data` and `tools/gentera/raw`, carry `[skip actions]` (so no other workflow is triggered) and are
pushed with pull-rebase retries; the routine is told to stay inside `site/gentera`, `tools/gentera` and
`scripts/gentera`.

## Access (password)

No password yet. Two options, both documented so the decision can be taken later:

1. **Cloudflare Access (recommended for a small audience).** In the Cloudflare dashboard → Zero Trust →
   Access → Applications → *Add an application* → Self-hosted; application domain `fnam.mx`, path `gentera`
   (add a second application for `gentera/quality.html` or use path `gentera*`); policy *Allow* with rule
   *Emails* → the board members' addresses (or *Emails ending in* a domain); identity provider *One-time PIN*
   (no accounts needed: the visitor receives a code by email). Session duration 30 days. Nothing changes in the
   repository; the page and its data files are served only after the PIN.
2. **Shared password (same mechanism as /gap/).** Copy `functions/gap/_middleware.js` to
   `functions/gentera/_middleware.js`, rename the variables to `GENTERA_PASSWORD` / `GENTERA_SESSION_SECRET` /
   `GENTERA_SESSION_DAYS`, and set them in the Pages project → Settings → Variables and Secrets. The function is
   dormant until the password variable exists.

Either way the page already carries `noindex,nofollow` and the data files are served `no-store`.

## Known limitations

- Coverage after the first harvest (22 Sep 2026): 58 press releases 1Q12–2Q26 parsed (consolidated statements,
  indicators, Banco Compartamos / Perú / ConCrédito tables, cost of funds), 62 quarters 1Q11–2Q26 (the 2011
  quarters come from the comparative columns of the 2012 releases), 15 fiscal years. The parser test
  (`test_parser.py`) passes on every file and the 18 seed quarters agree with the parsed values.
- The IR page's first harvest returned the **corporate presentation** under 4Q25 (its file name contains
  "compressed"); the harvester now selects press-release anchors by anchor text and replaced it with the 4T25
  release on the second run (58/58 releases parsed).
- Pre-2022 statements use the pre-IFRS 9 layout: "cartera vigente / vencida" is shown in the stage 1–2 /
  stage 3 rows; the reported stage-3 ratio for 4Q21 (4.46%) is on the new basis while its balances are on the
  old one. Shares outstanding are known only from 1Q22 on, so EPS and book value per share are null before
  that (FY2021 and earlier EPS is not shown).
- The 3Q20 release prints the discontinued-operations line with an inconsistent sign; the model derives the
  line as net income minus (pre-tax minus tax).
- CNBV downloads need a certificate fallback (`certifi`, then unverified for these public files, logged). The
  reader takes the bank's row from the sheets `CCT`, `CCCMicro`, `CaptRec`, `Pm2` and `Indicadores` (triplets
  of year-ago / previous / current month). SBS monthly files are linked by path
  (`…/estadistica/financiera/YYYY/Mes/B-2201-xxYYYY.XLS`); the balance (B-2201) and delinquency (B-2362)
  tables are read for Compartamos Banco (Banca Múltiple, 2025 on): gross direct loans = vigentes +
  refinanciados + atrasados, net loans, year-to-date net income, equity and the delinquency ratio. The
  deposit lines of B-2201 did not read consistently and are not shown; the loans-by-type (B-2334) and
  write-off (B-2369) tables list banks differently and are not mapped yet. A structure summary of each table
  is saved under `tools/gentera/raw/debug/` by every run. Values reach the page only when plausible.
- Gentera does not post call transcripts on the IR page. Ten FactSet CallStreet transcripts (3T23–4T25) and the
  3T24 corporate presentation were supplied by hand (`tools/gentera/raw/transcripts/`, converted by
  `scripts/gentera/ingest-transcripts.py`); their quotes, guidance vintages, ratings and management facts are in
  the data files. The 1T26 and 2T26 calls are not supplied yet, so those periods show release comments only and
  their guidance vintages carry only what the releases print (cost of risk / ROE marked "no change communicated").
- Release dates come from the PDF dateline ("Ciudad de México, 22 de julio 2026"), which is the call day or the day
  before; they stamp the header, the statement sources and the guidance vintages.
- Fiscal-year and year-to-date NIM / NIM after provisions are averages of the quarterly ratios (Gentera prints its
  own annual NIM, e.g. 41.0% for 2025 vs 41.2% here); every other aggregated ratio is recomputed from the sums.
- Audit of 23 September 2026: every figure in comments.js, summary.js and reference.js was recomputed from
  financials.js or looked up in the release texts; three comment figures were corrected. Layout checked at 390,
  768, 1024 and 1360 px in both languages and both themes (no overflow, no overlapping text, muted text at
  ≥ 4.5:1 contrast).
- The initial 2023 guidance (February 2023) is not transcribed; the FY2023 record uses the October 2023 revision.
  The 2025 initial EPS range (Ps. 4.56–4.71) is derived from the guided +20% to +24% on Ps. 3.80.
- Quote translations to Spanish are ours; the English text is the transcript wording, trimmed with [..].
- Peer multiples, consensus and analyst targets wait for the FactSet connector.
- Share prices come from Yahoo Finance's chart API (Stooq as fallback), not from the BMV directly; FX from the
  Federal Reserve (FRED DEXMXUS, published with a few days' lag); the risk-free rate from Banxico's weekly auction.

## Local run

```
pip install pypdf pypdfium2 openpyxl xlrd
python scripts/gentera/harvest.py --since 2019
python scripts/gentera/fetch-regulators.py --months 6
python scripts/gentera/build_data.py && python scripts/gentera/test_parser.py && python scripts/gentera/validate_data.py
node scripts/gentera/fetch-market.mjs
python -m http.server 8765   # then open http://localhost:8765/site/gentera/
```

## Board presentation (PDF) — the "Presentación (PDF)" button

The button builds a Letter-size PDF in the browser in one click. `site/gentera/present.js` (`GenteraDoc`) extends
the generic engine `site/assets/present-core.js` (jsPDF + jsPDF-AutoTable vendored in `site/assets/vendor/`;
off-screen Chart.js charts; cover, footers, fit-to-page tables, `**bold**` runs, Title Case, next-results rule).
It reads `window.G_MODEL`, the read-only API that `app.js` exposes at the end of its IIFE, so every figure is the
same calculation the page shows; the prose of sections 09 and 10 is read from the page itself. Language follows
the ES/EN toggle; the file is named `Gentera_GENTERA_presentacion_<date>.pdf` / `..._board_presentation_<date>.pdf`.
Ctrl/Cmd+P still prints the page (print mode: light theme, tables trimmed to the last 8 quarters, fixed-size charts).

Deep link: `/gentera/?present=1&lang=es` (or `lang=en`) opens the page, sets the language and builds the PDF on arrival; the landing pages' "Board presentations (PDF)" links use it and pass the reader's current language.

Pages (15): cover · executive summary (`data/summary.js`, two columns auto-fitted) · tear sheet (price, market cap
in MXN and USD, YTD and 12-month change vs the IPC, 52-week range, AGM dividend and yield, gross loans, financial
margin LTM and quarter with NIM, cost of risk, stage 3, coverage, efficiency, controlling net income LTM with a memo
without the 4Q25 item, EPS, P/E, P/BV, ROAE, ICAP, clients, guidance in force, next results; 12-month chart vs the
IPC and 3-year price) · operating and segment metrics (loans, clients and network, interest income, margin and net
income by subsidiary, stage 3, NIM, cost of funds and capital, with the `comments.js` ops comments) · income
statement quarter, LTM and fiscal year (levels 0–1 plus the ratio rows, cost ratios coloured inversely, "memo" rows
without the 4Q25 deferred-tax write-down, FY chart; mechanical comments when a pair has none) · management guidance
(table in force with status, notes, EPS and loan-growth range-vs-actual charts, history of vintages, track record of
closed years) · loan book and clients (stacked loans by subsidiary with y/y, latest-quarter tables, CNBV and SBS
monthly tables when the feed has them) · asset quality (stage 3 by subsidiary, write-offs with cost of risk,
8-quarter detail) · 07 funding, capital and ratings (tiles, funding mix with loans/deposits, capital and cost of
funds by subsidiary, 6-quarter table, ratings, reading) · 08 dividends (AGM bullets, DPS approved by AGM, table with
payout on the prior year's controlling income, 10-fiscal-year earnings/returns/dividend table) · 09 ConCrédito and
Perú (facts, page prose, Perú in figures, both timelines) · 10 group lending and stage 3 (facts, page prose,
stage-3 loans and allowance with coverage) · sources and methodology.

Next results: `reference.js → calendar.nextResults` when Gentera has announced the date (marked "confirmed");
otherwise assumed from the median lag between quarter-end and release for the same quarter in the last three years.

Headless check: serve `site/` locally, open `/gentera/`, pick the language and click `#btnPrint`; the download
event yields the PDF (see the GAP runbook for the Playwright snippet).
