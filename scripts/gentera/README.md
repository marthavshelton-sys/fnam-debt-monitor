# scripts/gentera — data pipeline for the Gentera model (site/gentera)

| Script | Runs | Writes |
|---|---|---|
| `harvest.py [--full] [--since 2012] [--only 2026Q3]` | weekdays (workflow) | `tools/gentera/raw/text/releases/<YYYYQn>.txt` (Spanish press-release PDFs converted with pypdf/pypdfium2, page markers, SOURCE line), `tools/gentera/raw/manifest.json` (PDFs cached in `raw/pdf/`, git-ignored) |
| `fetch-regulators.py [--months 6]` | weekdays (workflow, best-effort) | `tools/gentera/raw/regulators.json` — monthly CNBV Boletín Estadístico rows for Banco Compartamos and SBS tables for Compartamos Banco Perú |
| `build_data.py` | after harvest | `site/gentera/data/financials.js` (`window.G_FIN`), `operations.js` (`window.G_OPS`), `quality.js` (`window.G_QUALITY`) |
| `test_parser.py` | after build; exit 1 on any failure | — (every archived release must still parse, tie out and match the seed transcription) |
| `validate_data.py` | after build; exit 1 on any failure | appends `validation` to `quality.js` (statement identities, YTD/FY = sum of quarters, 12-quarter window, subsidiary loans vs consolidated, plausibility) |
| `fetch-market.mjs` | daily (workflow) | `site/gentera/data/market.js` (`window.G_MARKET`) |

Requirements: Python 3.12 with `pypdf`, `pypdfium2`, `openpyxl`, `xlrd`; Node 22 (no npm packages). `BANXICO_TOKEN`
(repository secret) enables the daily 10-year M bond from Banxico SIE; without it the FRED/OECD monthly series is used.

Source precedence in `build_data.py`, per quarter: the quarter's own press release (accepted only when the
statement identities tie out) → the comparative column of a later release → the seed transcription in
`tools/gentera/raw/seed/quarters.json` (1Q22–2Q26, hand-transcribed from the same releases). `quality.js`
records which origin every quarter has; `site/gentera/quality.html` shows it.

**How the parser reads a release.** Every page is cut into segments at its column-header lines (two or more
quarter ids, possibly split over several lines in the 2012–2021 layouts); the header gives the column order
with a slot for every "% Var" column and for the annual columns of the 4Q releases; each row's trailing numeric
tokens are aligned to those slots. The entity (GENTERA consolidated, Banco Compartamos, Perú, ConCrédito) comes
from the page title and the segment kind (income statement, balance sheet, indicators, cost of funds) from the
row labels; `IS_TPL` / `BS_TPL` / `IND_TPL` carry every wording used since 2012. A quarter is accepted only
when its statements tie out and, for seed quarters, agree with the seed. `test_parser.py` runs the parser on
every archived text and fails the workflow on the first regression. Status after the first harvest: 57/57
press releases parse; see `tools/gentera/README.md` for the remaining limitations.

Hand-curated files in `site/gentera/data/` (`reference.js`, `guidance.js`, `comments.js`, `summary.js`,
`peers.js`) are edited by reviewed commit; see `tools/gentera/README.md` for the per-quarter routine.
