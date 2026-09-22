# scripts/qualitas — data pipeline for the Quálitas model (site/qualitas)

| Script | Runs | Writes |
|---|---|---|
| `harvest.py [--years 2023 2024 …] [--full]` | weekdays (workflow) | `tools/qualitas/raw/text/{reports,sific}/<YYYYQn>.txt`, `tools/qualitas/raw/DatosFinancierosHistoricos.xlsx`, `tools/qualitas/raw/manifest.json` (PDFs go to `raw/pdf/`, git-ignored) |
| `build_data.py` | after harvest | `site/qualitas/data/financials.js` (`window.Q_FIN`), `site/qualitas/data/operations.js` (`window.Q_OPS`) |
| `validate_data.py` | after build; exit 1 on any failure | — (tie-outs: statement identities, BS/CF cash, YTD vs quarters, 12-quarter window, lines of business vs total, solvency index) |
| `fetch-market.mjs` | daily (workflow) | `site/qualitas/data/market.js` (`window.Q_MARKET`) |

Requirements: Python 3.12 with `pypdf` and `openpyxl`; Node 22 (no npm packages).

Source precedence in `build_data.py` (per statement, never mixed line by line): the period's own IR
quarterly report → the period's own SIFIC filing (or a difference of two own filings) → the comparative
column of the following year's report → the comparative column of a SIFIC filing → the IR historical
workbook (rounded millions, 2013 onwards).

Hand-curated files in `site/qualitas/data/` (`reference.js`, `guidance.js`, `comments.js`, `summary.js`,
`peers.js`) are edited by reviewed commit; see `tools/qualitas/README.md` for the per-quarter routine.
