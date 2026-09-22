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
| `reference.js` | `G_REF` | reviewed commit | company facts, shares, subsidiaries, dividends approved at each AGM, `adjust` (the 4Q25 Ps. 328 M ConCrédito deferred-tax write-down that drives the accounting switch), ConCrédito and Perú sections, group-lending facts, glossary, valuation defaults, sources. Ratings and analysts are empty until transcribed. |
| `guidance.js` | `G_GUIDANCE` | reviewed commit, each quarter | guidance vintages (`fy`, `kind`, `date`, `quarter`, `items{eps, loanGrowth, opexGrowth, npl}` with `lo`/`hi`/`text`, `notes`, `source`). Dates flagged `dateApprox` are to be replaced with the release date once harvested. |
| `comments.js` | `G_COMMENTS` | reviewed commit, each quarter | one-line y/y explanations keyed by period (`2026Q2`, `2026M6`, `FY2025`): `lines` (income-statement rows), `bs`, `ops`, `call` (Gentera publishes no transcripts; the field holds that note or, if a transcript is supplied by hand, its quotes). |
| `summary.js` | `G_SUMMARY` | reviewed commit, each quarter | executive summary: `basis` + four sections (operations, guidance, asset quality/funding/capital, what to watch), ES and EN. |
| `peers.js` | `G_PEERS` | pending (FactSet) | peer multiples schema (GFNORTEO, RA, BBAJIOO, BAP as placeholders) and the consensus contract; all null until the connector is authorised. |

## After each quarterly report (≈ 3rd/4th week of Jan–Feb, Apr, Jul, Oct; 3Q26 = 21 Oct 2026)

1. The 14:35 UTC weekday workflow harvests the new press release from the IR page, rebuilds
   `financials.js`/`operations.js`/`quality.js` and validates. Check the Actions log: a red run means the
   parser did not recognise a table or a tie-out failed — fix the templates in `scripts/gentera/build_data.py`
   (`IS_TPL`, `BS_TPL`, `IND_TPL`, `parse_release`) and re-run `workflow_dispatch` with mode `filings`.
   While a quarter is not parsed the page keeps showing the seed / previous values and `quality.html` says so.
2. Read the release. Then edit by reviewed commit:
   - `comments.js`: add the quarter (`YYYYQn`) and the YTD period (`YYYYMm`); for a 4Q add `FYyyyy`.
   - `guidance.js`: add a vintage (`initial` in February, `reaffirmed`/`revised` otherwise) with the wording.
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
from the Routines list in claude.ai/code.

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
- Guidance vintage dates are approximate (`dateApprox`) until transcribed from the releases.
- Gentera does not post call transcripts on the IR page; hand-supplied transcripts and presentations go in
  `tools/gentera/raw/transcripts/` (see its README) and are converted by `scripts/gentera/ingest-transcripts.py`
  for the reviewing routine to quote in `comments.js`.
- Peer multiples and consensus wait for the FactSet connector. Ratings and analyst targets are not transcribed.

## Local run

```
pip install pypdf pypdfium2 openpyxl xlrd
python scripts/gentera/harvest.py --since 2019
python scripts/gentera/fetch-regulators.py --months 6
python scripts/gentera/build_data.py && python scripts/gentera/test_parser.py && python scripts/gentera/validate_data.py
node scripts/gentera/fetch-market.mjs
python -m http.server 8765   # then open http://localhost:8765/site/gentera/
```

## Print as presentation

The 🖨 button next to the language toggle switches the page into print mode (light theme, tables trimmed to
the last 8 quarters, fixed-size charts, a cover with the basis dates and a confidentiality line, a closing
slide with the sources) and opens the browser's print dialog; choose "Save as PDF", Letter landscape.
