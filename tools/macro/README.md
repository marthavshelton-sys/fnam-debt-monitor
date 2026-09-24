# Macro Monitor — fnam.mx/macro

Bilingual (EN / es-MX) US macro dashboard: CPI, PCE, PPI, labor, GDP, income,
retail, consumer sentiment, financial conditions, supply chain, fiscal deficit,
the Strategic Petroleum Reserve and the Shiller CAPE ratio.
One page, two languages; the page is served at `site/macro/index.html`.

## How it stays current

`.github/workflows/macro-refresh.yml` runs at 12:50 UTC on weekdays and at
14:05 and 20:05 UTC every day (and on demand from the Actions tab). It:

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

## The Challenger report (no API, handled on the runner)

`process_challenger.ps1` finds the newest post in Challenger's job-cuts
category, downloads the report PDF and hands it to `challenger_pdf.py`
(PyMuPDF), which reads Tables 1, 2, 3 and 6 by position and checks every
figure against the report's own totals (industries sum to the month, states
sum to regions, regions to the headline, 51 states). Only a report that
reconciles is written into the `challenger` block; anything else fails that
step and the page keeps last month's data.

The `challenger` block is a growing history, not a snapshot: `monthly[]` is the
national series, `industry[]` is keyed by Challenger's own labels, and
`stateCuts.<code>` holds `m` (the month's cuts), `ytd` and `priorYtd` keyed by
month, with `stateYearTotals.<year>` for completed years. The page derives its
1/3/6/12-month state maps from that history and states the span each map
covers, so a month is simply appended - nothing is re-keyed.

## The two yearly inputs that still arrive as a pull request

BLS answers scripted requests for its tables with HTTP 403 (`process_weights.ps1`
probes on every run and logs the result; if BLS ever allows it, the update can
move here). Until then two scheduled browser tasks in Marcie's Claude desktop
app read the tables and open a pull request; nothing is live until the PR is
merged, and the workflow rebuilds the page on the merge.

| File | Cadence | Task | Source |
|---|---|---|---|
| `data/bls_weights.json` | Yearly, February/March | `cpi-weights-yearly` | BLS CPI relative-importance Table 1 |
| `data/ppi-fdgrouprel.xlsx` | Yearly, June/July | `ppi-weights-yearly` | BLS PPI final-demand relative-importance workbook |

## Email alerts on new data

`alerts.ps1` runs after every build. It compares the latest period of each
tracked release (CPI, PPI, jobs, PCE, GDP, retail, sentiment preliminary and
final, the Monthly Treasury Statement, Challenger, CAPE, and SPR weekly moves
of 3 M bbl or more) with `data/alerts_state.json`. For anything new it opens
one GitHub issue whose body is the page's own "At a glance" text for the
affected sections - `exec_extract.js` runs the built page under Node with a
stand-in DOM and reads the summaries out, so the wording is written once, in
the template. GitHub emails the repository owner about the issue; that is the
whole delivery mechanism (no mail server, no credentials). The subject starts
with MATERIAL when a threshold in `alerts.ps1` is crossed. The state file is
seeded from the current data on first run and committed with the data.

## When something breaks

Every run writes `data/health.json`: which processors failed, for how many
consecutive runs, the staleness warnings and how long they have persisted.
One failed run is silent (feeds hiccup; the page keeps last-good data). When a
source has failed three runs in a row, or a staleness warning has lasted that
long, `refresh_all.ps1` reports it and the workflow fails its run after
committing, so GitHub sends its standard "run failed" email to the repository
owner. No other monitoring exists or is needed.

## Sharing the repository with other pages

Several other dashboards live in this repository with their own workflows.
This job stays in its lane: it reads only `tools/macro/**`, writes only
`site/macro/index.html`, `site/macro/spr-inventory.jpg` and
`tools/macro/data/**`, and rebases onto whatever the other jobs pushed before
pushing its own commit. Files another job leaves "modified" in the checkout
(line-ending normalisation) are marked skip-worktree for the duration of the
run and are never committed here. Nothing in this folder alters another page.

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
  DOE capacity per site (scraped from the storage-sites page), DOE's inventory
  per site (the "Crude Oil Inventory by Site (as of ...)" table on the SPR
  Quick Facts page; each new as-of date is appended to `bySiteHistory`), and
  DOE's inventory report, which exists only as an image (posted weekly on
  Mondays of late, for the prior Friday) and is saved as
  `data/spr-inventory.jpg` then copied beside the page
- `process_challenger.ps1` + `challenger_pdf.py` — the Challenger job-cut report
  (see above); `process_weights.ps1` — BLS probe for the weights tables
- `process_cape.ps1` — Shiller's ie_data.xls from shillerdata.com (the link
  carries a version token, so the page is read first); CAPE since 1881 plus
  Shiller's excess CAPE yield and ten-year subsequent real returns
- `xlsx_to_rows.ps1` — reads the PPI weights workbook without Excel
- `gscpi_xls_to_csv.py`, `xls_to_csv.py` — convert legacy .xls workbooks on the
  runner (no Excel there); locally `common.ps1` uses Excel COM first
- `alerts.ps1` + `exec_extract.js` — new-release emails via GitHub issues (see above)
- `build.ps1` — template + data → page, with the locale guards
- `refresh_all.ps1` — runs everything in order; what the workflow calls
