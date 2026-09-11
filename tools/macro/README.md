# Macro Monitor — fnam.mx/macro

Bilingual (EN / es-MX) US macro dashboard: CPI, PCE, PPI, labor, GDP, income,
retail, consumer sentiment, financial conditions, supply chain, fiscal deficit.
One page, two languages; the page is served at `site/macro/index.html`.

## How it stays current

`.github/workflows/macro-refresh.yml` runs at 14:05 and 20:05 UTC on weekdays
(and on demand from the Actions tab). It:

1. runs every `process_*.ps1` here, pulling fresh data from BLS, BEA, FRED,
   Census, Treasury FiscalData, the University of Michigan, and the New York
   Fed, into `tools/macro/data/`;
2. runs `build.ps1`, which bakes that data into the page template and writes
   `site/macro/index.html`;
3. commits the page only if the data actually changed. Cloudflare Pages
   deploys the commit like any other.

A source that fails on a given run is logged and that section keeps its last
data; one bad feed never takes the page down.

**Required repository secrets** (Settings → Secrets and variables → Actions):
`BLS_API_KEY`, `BEA_API_KEY`, `FRED_API_KEY`, `CENSUS_API_KEY`. All four are free
registrations. Keys are read from the environment inside the job and never
written to the repo or the page.

## What is not automatic

| File | Cadence | Why |
|---|---|---|
| `data/bls_weights.json` | Yearly (BLS posts CPI relative importance each January/February) | Published as a table, not an API |
| `data/ppi-fdgrouprel.xlsx` | Yearly (BLS posts it around June) | BLS blocks scripted downloads; download in a browser from bls.gov/ppi/tables and replace the file |
| `data/labor_static.json` → `challenger` | Monthly | Challenger job-cut report is a private release with no API; the page labels that section "manually updated" |
| Release-date tables in the template (`RELEASE_SCHEDULE`, `PPI_RELEASE_SCHEDULE`, `RETAIL_RELEASE_SCHEDULE`, `PCE_RELEASE_SCHEDULE`, `JOBS_RELEASE_SCHEDULE`) | Extend a few months at a time | Agencies publish calendars, not APIs; if a table runs out the page shows an estimate instead |

## Editing the page

All content lives in `macro_monitor_template.html`. Every user-visible string is
in the `I18N` block in both languages; the build refuses to run if the two
locales don't have identical keys, or if the code references a string that
doesn't exist. After editing, push — the workflow rebuilds and deploys.

To preview locally on Windows with the keys in `%TEMP%\claude\api_keys.json`:

```powershell
.\refresh_all.ps1                # pulls data, writes macro_monitor.html next to the scripts
```

## Files

- `common.ps1` — shared: data folder, API keys from environment, BLS/BEA helpers
- `process_core.ps1` — CPI, labor, PCE (+weights), GDP/income (BLS + BEA)
- `process_umich.ps1`, `process_ppi.ps1`, `process_retail.ps1`,
  `process_fincond.ps1`, `process_supply.ps1`, `process_fiscal.ps1` — one per section
- `xlsx_to_rows.ps1` — reads the PPI weights workbook without Excel
- `gscpi_xls_to_csv.py` — converts the NY Fed workbook on the runner (no Excel there)
- `build.ps1` — template + data → page, with the locale guards
- `refresh_all.ps1` — runs everything in order; what the workflow calls
