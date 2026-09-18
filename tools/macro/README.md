# Macro Monitor — fnam.mx/macro

Bilingual (EN / es-MX) US macro dashboard: CPI, PCE, PPI, labor, GDP, income,
retail, consumer sentiment, financial conditions, supply chain, fiscal deficit,
the Strategic Petroleum Reserve and the Shiller CAPE ratio.
One page, two languages; the page is served at `site/macro/index.html`.

## How it stays current

`.github/workflows/macro-refresh.yml` runs at 12:50, 14:05 and 20:05 UTC on
weekdays (and on demand from the Actions tab). It:

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

## What is automatic

Everything on the page except the four items below, including: all series
from BLS, BEA, FRED, Census, Treasury, Michigan and the NY Fed; every "next
release" date (pulled from FRED's mirror of each agency's official calendar,
so no date tables live in the code); the first-print payroll figures behind
the revisions chart (recorded on the first run after each jobs report); and
state nonfarm employment behind the job-cut maps.

## What arrives as a pull request

Three inputs have no API. Scheduled browser tasks in Marcie's Claude desktop
app read them from the publisher's page, rewrite the data file and open a pull
request against this repo; nothing is live until the PR is merged, and the
workflow rebuilds the page on the merge. The workflow also prints a warning
annotation (and `data/health.json` records it, which the release-alert task
emails) when any of these falls behind.

| File | Cadence | Task | Source |
|---|---|---|---|
| `data/labor_static.json` -> `challenger` block | Monthly, first days of the month | `challenger-monthly` | Challenger, Gray & Christmas monthly report PDF (Tables 1, 2, 3, 6), read with pdf.js in the browser |
| `data/bls_weights.json` | Yearly, February/March | `cpi-weights-yearly` | BLS CPI relative-importance Table 1 (BLS blocks scripted page fetches) |
| `data/ppi-fdgrouprel.xlsx` | Yearly, June/July | `ppi-weights-yearly` | BLS PPI final-demand relative-importance workbook |

The `challenger` block is a growing history, not a snapshot: `monthly[]` is the
national series, `industry[]` is keyed by Challenger's own labels, and
`stateCuts.<code>` holds `m` (the month's cuts), `ytd` and `priorYtd` keyed by
month, with `stateYearTotals.<year>` for completed years. The page derives its
1/3/6/12-month state maps from that history and states the span each map
covers, so a month is simply appended - nothing is re-keyed.

`data/health.json` is written by every run: which processors failed, how many
consecutive times, and the staleness warnings. The `macro-release-alerts`
task reads it and emails when the pipeline needs attention.

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
- `process_calendar.ps1` - release dates for every section, from FRED
- `process_umich.ps1`, `process_ppi.ps1`, `process_retail.ps1`,
  `process_fincond.ps1`, `process_supply.ps1`, `process_fiscal.ps1` — one per section
- `process_spr.ps1` — EIA weekly/monthly SPR stocks (keyless history workbooks),
  DOE capacity per site (scraped from the storage-sites page) and DOE's daily
  inventory report, which exists only as an image and is saved as
  `data/spr-inventory.jpg` then copied beside the page
- `process_cape.ps1` — Shiller's ie_data.xls from shillerdata.com (the link
  carries a version token, so the page is read first); CAPE since 1881 plus
  Shiller's excess CAPE yield and ten-year subsequent real returns
- `xlsx_to_rows.ps1` — reads the PPI weights workbook without Excel
- `gscpi_xls_to_csv.py`, `xls_to_csv.py` — convert legacy .xls workbooks on the
  runner (no Excel there); locally `common.ps1` uses Excel COM first
- `build.ps1` — template + data → page, with the locale guards
- `refresh_all.ps1` — runs everything in order; what the workflow calls
