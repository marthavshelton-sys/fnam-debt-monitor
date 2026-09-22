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

**Status of the harvester.** The build environment that wrote these scripts could not reach gentera.com.mx,
CNBV, SBS, Yahoo or FRED (egress policy), so `harvest.py`, `fetch-regulators.py` and the release parser in
`build_data.py` have not yet run against real files. The first `workflow_dispatch` on `main` (mode `all`,
`full` = true) does that; expect to adjust the regexes in `IS_TPL` / `BS_TPL` / `IND_TPL` and `release_links()`
after reading the log. Until a release parses, the page runs on the seed dataset, which ties out.

Hand-curated files in `site/gentera/data/` (`reference.js`, `guidance.js`, `comments.js`, `summary.js`,
`peers.js`) are edited by reviewed commit; see `tools/gentera/README.md` for the per-quarter routine.
