# Quálitas model — runbook

Live page: https://fnam.mx/qualitas/ (site/qualitas). Structure mirrors the GAP model (site/gap): a bilingual
single page (`index.html` + `app.js`) that reads eight data files and computes everything at render time.

## Data files (site/qualitas/data)

| File | Global | Refresh | Contents |
|---|---|---|---|
| `financials.js` | `Q_FIN` | workflow, after each report | `layout` (bilingual row definitions for `is`, `bs`, `cf`, `kpi`), `quarters[]`, `ytd[]`, `years[]`. Statements in **thousands of pesos** under CNSF criteria; `kpi` holds computed ratios (`acqRatio`, `lossRatio`, `opRatio`, `combined`, `combinedAdj`, margins, `taxRate`, `eps`), reported figures (`rsi`, `roe12`, `roePeriod`, `float`, `invTotal`, `rcs`, `solvMargin`, `solvIndex`, `fiPct`, `duration`) and `units` (thousands). `shares.current` = shares per the IR workbook (400 M issued). `sources` links every statement to the report/filing it came from. |
| `operations.js` | `Q_OPS` | workflow, after each report | per quarter: insured `units` by country/segment (thousands; `unitsPrevQ`, `unitsPrevY`), written `premiums` by line (`trad`, `ind`, `fleet`, `fin`, `intl`, `total`; thousands of pesos; `premiumsYtd`, prior-year columns), `subsidiaries` sales (`es`, `cr`, `ic`, `pe`, `co`, `verticals`, `total`), `solvency` (`rcs`, `margin`, `index`; Ps. M), `portfolio` (`fiPct`, `duration`), `reported` ratios. Quarters flagged `comparative` come from the following year's report. |
| `market.js` | `Q_MARKET` | workflow, daily | daily closes for Q.MX, ^MXX, PGR, ALL, PSSA3.SA, MAP.MC; Q.MX cash dividends; USD/MXN (FRED DEXMXUS); MX and US 10-year yields. |
| `reference.js` | `Q_REF` | reviewed commit | company facts, shares (issued, treasury), subsidiaries, ratings, analysts, dividends approved at each AGM, VAT matter (`vat.adjust` drives the "exclude the 4Q25 VAT charge" switch), international timeline, valuation defaults, sources. |
| `guidance.js` | `Q_GUIDANCE` | reviewed commit, each quarter | management expectations as vintages (`fy`, `kind`, `date`, `quarter`, `items{written,earned,lossRatio,combined,rif,roe}` with `lo`/`hi`/`text`, `notes`, `source`). |
| `comments.js` | `Q_COMMENTS` | reviewed commit, each quarter | one-line y/y explanations keyed by period (`2026Q2`, `2026M6`, `FY2025`): `lines` (income statement + ratio rows), `bs`, `cf`, `ops`, `call`. |
| `summary.js` | `Q_SUMMARY` | reviewed commit, each quarter | executive summary: `basis` + four sections (operations, expectations, capital, what to watch), ES and EN. |
| `peers.js` | `Q_PEERS` | pending (FactSet) | peer multiples schema; all null until the connector is authorised. |

## After each quarterly report (≈ 3rd/4th week of Jan, Apr, Jul, Oct)

1. The 14:35 UTC weekday workflow harvests the new `Informe de resultados` PDF (and, days later, the SIFIC
   filing), rebuilds `financials.js`/`operations.js` and validates. Check the Actions log: a red run means a
   tie-out failed (usually a layout change in the PDF) — fix the template in `scripts/qualitas/build_data.py`
   (`IS_TPL`, `BS_*_TPL`, `parse_report`) and re-run `workflow_dispatch` with mode `filings`.
2. Read the report and the earnings-call transcript. Then edit by reviewed commit:
   - `comments.js`: add the quarter (`YYYYQn`) and the YTD period (`YYYYMm`); for a 4Q add `FYyyyy`.
   - `guidance.js`: add a vintage (`initial` in January, `reaffirmed`/`revised` otherwise) with the wording.
   - `summary.js`: rewrite the four sections; update `basis`.
   - `reference.js`: AGM dividend (April), ratings, treasury shares, timeline events, `updatedAt`.
3. Open https://fnam.mx/qualitas/ in ES and EN and check the header strip, the 01 comparison (y/y with
   comments), the expectations table and the print view.

## Known limitations

- SIFIC filings for 1Q25 and 1Q26 are image-only PDFs and the 3Q23 link is broken: no quarterly cash flow
  for 1Q25/2Q25/1Q26/2Q26 (the 6M statements exist). Re-run `harvest.py --full --years 2025 2026` when
  Quálitas re-uploads text PDFs.
- Quarters before 2019 carry only the main lines (IR workbook); 2020–2022 quarters without an own report use
  differences of SIFIC year-to-date statements.
- Peer multiples wait for the FactSet connector.

## Local run

```
pip install pypdf openpyxl
python scripts/qualitas/harvest.py --years 2025 2026
python scripts/qualitas/build_data.py && python scripts/qualitas/validate_data.py
node scripts/qualitas/fetch-market.mjs
python -m http.server 8765   # then open http://localhost:8765/site/qualitas/
```
