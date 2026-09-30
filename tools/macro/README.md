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
so no date tables live in the code, plus the last six dates that published,
which name the GDP estimate on the page); the first-print payroll figures behind
the revisions chart (recorded on the first run after each jobs report) and every
published value of the last two years of payrolls (ALFRED vintages, see below);
and state nonfarm employment behind the job-cut maps.

## Conventions the page derives from the data

- **Payroll revisions have two bases, and the page names the one it uses.** The
  chart "How the first estimate held up" is today's change for each month minus
  what that month's own jobs report first said. BLS's release text ("June and
  July were revised +55K in total") compares each month with the *previous*
  report instead, and the two figures differ. `process_core.ps1` therefore rebuilds
  the change for each month as it stood at every release from ALFRED (the St.
  Louis Fed's archive of FRED vintages: `series/vintagedates` and
  `series/observations` with `realtime_start`/`realtime_end` for PAYEMS) into
  `labor_static.json` as `payrollVintages` `{ "2026-06": [[release, change], ...] }`
  (latest 24 months; `ConvertTo-PayrollVintages` in `common.ps1` keeps a pair only
  when the value moved). The "At a glance" card quotes BLS's basis when that block
  is current and says "against their first estimates" otherwise; the chart's
  first prints come from the vintages when present, else from `payrollInitial`.
- **Financial conditions quote the freshest print with its real date.** The
  charts stay weekly (FRED's end-of-week aggregation), but each daily series
  (spreads, rates, dollar, VIX, S&P 500) also carries `latest`, its newest native
  observation dated no later than the run day, so a Monday high-yield spread no
  longer waits for Friday. FRED dates an unfinished week to its Friday, which can
  lie in the future; the processor drops that point and the page ignores any
  point dated after today. The FRED calls are paced (FRED allows 120 a minute
  per key).
- **GDP estimate names.** BEA publishes each quarter three times; the page
  counts the release dates after the quarter's end (`calendar.json` `recent`, an
  explicit 13-month look-back) to label the figure "advance / second / third
  estimate (BEA, date)" and to say which estimate the next release brings. BEA's
  own "last revised" date for table 1.1.1 (`gdp_processed.json` `vintage.gdp`,
  from the API's table note) caps and completes that list, so a run between BEA's
  release and FRED's calendar update still names the estimate the figures come
  from. With only `last` available it infers the same from the month gap.
- **Shiller's 10-year rate.** For finished months it is the monthly average;
  for the current (partial) month Shiller's file carries a single daily reading
  from when the file was posted (September 2026: 4.75%, the 31-Aug H.15 value).
  The CAPE view labels it "one daily reading at posting, not a month average"
  and shows FRED's latest daily yield beside it.
- **SPR cavern counts** follow DOE's storage-sites page (the capacity source).
  DOE's SPR Quick Facts table carries its own cavern column and, for West
  Hackberry, a different count (22 vs 21); the page keeps one source and
  prints a note whenever the two disagree, rather than showing both numbers.
- **Language.** English headings are Title Case (applied to the rendered text,
  so dynamic headings follow); Spanish headings keep sentence case, month
  abbreviations are lowercase (`28-sep-2026`), thousands read "mil" and
  millions "M", dollar amounts "mmd" (miles de millones de dólares) with a units
  note under the fiscal tiles. Words with a Spain-only flavour (hostelería,
  derbi) are avoided, and Spanish copy carries no English glosses; only proper
  names stay in English (DOE's "SPR Quick Facts" page, Shiller's “Irrational
  Exuberance” data set). A term whose sign is in the verb ("restó", "subtracted")
  takes the absolute value.
- **Addresses and metadata.** Every section is a real link (`?view=`,
  `&lang=`), the browser history follows it, and the document title,
  description, canonical, hreflang and Open Graph tags are rewritten per
  section and language. An unknown `?view=` opens the first section and says so.
- `labor_static.json` is written compact (it is baked into the page; the
  pretty-printed form was 65 KB of whitespace).
- **Phones.** No text below 11 px: chart SVGs narrower than their drawing are
  refitted (`fitChartViewBoxes` shrinks the viewBox so the smallest chart text
  renders at 11 px) and axis margins, tick spacing and annotation labels adapt to
  the width. The phone `@media` blocks sit at the end of the stylesheet; placed
  earlier, later base rules silently override them.

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
the template. The subject starts with MATERIAL when a threshold in `alerts.ps1`
is crossed. The state file is seeded from the current data on first run and
committed with the data.

The issue is only a queue: the owner does not receive GitHub's own notification
emails (she turned them off to avoid the noise). Delivery is the Claude Routine
"FNAM US Macro: email material changes" (cloud, daily at 14:45 and 20:45 UTC,
right after the two refresh runs). It is read-only: it reads the issues
opened by github-actions[bot] through the public GitHub API and emails the
owner the body of every "MATERIAL: " and "SOURCE DOWN: " issue created since the previous scheduled
run (14:45 run: since 20:45 the day before; 20:45 run: since 14:45), in one
message sent with the Gmail connector from the owner's fnam.mx account to her
gmail.com address, the same path the US fiscal alerts use. The routine must
have both the Gmail connector and the repository marthavshelton-sys/fnam-debt-monitor
attached (claude.ai, Routines): the cloud environment refuses GitHub API calls
for repositories not attached to the session, and without Gmail nothing is sent.
Either gap makes the run end with a one-line reason and no email. Verified
end to end on 28-Sep-2026 (issue #63 delivered). A manual run outside those hours
covers the last 7 days. "Macro update: " issues are never emailed. The routine
does not close issues, so they accumulate harmlessly; close them by hand when
convenient. A missing alert usually means the routine did not run at its time;
check the Routines page before touching `alerts.ps1`. The same routine also
emails the Mexico macro dashboard's "MATERIAL (MX): " and "SOURCE DOWN: MX macro"
issues (tools/mx-macro/README.md).

## Freshness lines for file-based sources

Sections fed by a downloaded file rather than an API show "<file> dated D ·
checked C". D is the source's own Last-Modified date, recorded by the
processor (`Get-RemoteFileDate` in `common.ps1`) for the files that change
only when the data does: Shiller's `ie_data.xls`, EIA's SPR workbooks, the
Challenger PDF. Michigan and Census regenerate their CSVs on a schedule (the
stamp is the generation time) and the NY Fed sends no date, so those sections
show "checked C" only. C comes from `site/macro/status.json`, which
`refresh_all.ps1` writes on every run (run time plus the processors that fell
back to last-good data) - the page reads it at load, so C moves every run even
though the page itself is only rewritten when data changes. A source that
failed on the last run shows its last successful download date instead.

## When something breaks

Every run writes `data/health.json`: which processors failed, for how many
consecutive runs, the staleness warnings and how long they have persisted.
One failed run is silent (feeds hiccup; the page keeps last-good data). When a
source has failed three runs in a row, or a staleness warning has lasted that
long, `refresh_all.ps1` reports it (`stuck` output) and the workflow opens one
issue titled "SOURCE DOWN: US macro - <what>" labeled `macro-source-down`
(never a second while one is open), then fails the run so the outage shows in
the Actions history. The alert routine below emails the SOURCE DOWN issue in
the same way as a MATERIAL one. The first healthy run comments and closes the
issue; the recovery itself is not emailed.

## Sharing the repository with other pages

Several other dashboards live in this repository with their own workflows.
This job stays in its lane: it reads only `tools/macro/**`, writes only
`site/macro/index.html`, `site/macro/spr-inventory.jpg`,
`site/macro/status.json` and `tools/macro/data/**`, and rebases onto whatever
the other jobs pushed before pushing its own commit. Files another job leaves "modified" in the checkout
(line-ending normalisation) are marked skip-worktree for the duration of the
run and are never committed here. Nothing in this folder alters another page.

## Editing the page

All content lives in `macro_monitor_template.html`. Every user-visible string is
in the `I18N` block in both languages; the build refuses to run if the two
locales don't have identical keys, or if the code references a string that
doesn't exist. After editing, push — the workflow rebuilds and deploys.

The published page is written by `build-page.mjs`, which `build.ps1` runs whenever
Node is available (the runner has it): the same substitution, wrap and guards,
plus two things that take the page from about 1.8 MB to about 1.0 MB without
changing what it shows:

- every data block is packed losslessly (arrays of identical rows as columns,
  regular date sequences as ranges, irregular ones as steps); the page's
  `unpack()`, between the `// @unpack-begin` and `// @unpack-end` markers, restores
  them, and a block is packed only if that same function gives back exactly the
  original and the template reads the placeholder through `unpack()`;
- developer comments are left out of the published copy, only if the stripped
  script still parses and keeps every code character.

If Node is missing or the script fails, `build.ps1` builds the page itself, unpacked
and with comments (identical in rendering), and the run logs a warning.
`node tools/macro/build-page.mjs --plain` reproduces that output byte for byte.

In a Linux session, `node tools/macro/build-page.mjs` builds `site/macro/index.html`
from the committed data, so a template change can be opened in a browser (serve
`site/` locally) and committed with the template; the workflow rebuilds the page on
merge either way. `node tools/macro/exec_extract.js site/macro/index.html en`
checks that the alert extractor still reads every section. PowerShell 7 (`pwsh`)
can be installed in a session to parse-check the scripts and run them against a
mocked `Invoke-RestMethod`; the data providers themselves are not reachable from
there.

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
  `data/spr-inventory.jpg` then copied beside the page; `spr_image_ocr.py` (RapidOCR) reads
  the report's "as of" date and sweet/sour/total volumes into `image.reading`
  (kept only if sweet + sour = total, the date is on or before DOE's posting
  and within 14 days, and the total is within 3% of EIA's latest week). When
  that reading is newer than EIA's latest week the page uses it as the latest
  point everywhere (header, summary, KPIs, weekly chart) and names DOE as the
  source; EIA's Wednesday release then takes over. The 1977 history chart uses EIA's
  monthly series (MCSSTUS1, about two months late) and fills the months after
  it with each month's last weekly reading, so every SPR chart ends at the
  same latest point
- `process_challenger.ps1` + `challenger_pdf.py` — the Challenger job-cut report
  (see above); `process_weights.ps1` — BLS probe for the weights tables
- `process_cape.ps1` — Shiller's ie_data.xls from shillerdata.com (the link
  carries a version token, so the page is read first); CAPE since 1881 plus
  Shiller's excess CAPE yield and ten-year subsequent real returns
- `xlsx_to_rows.ps1` — reads the PPI weights workbook without Excel
- `gscpi_xls_to_csv.py`, `xls_to_csv.py` — convert legacy .xls workbooks on the
  runner (no Excel there); locally `common.ps1` uses Excel COM first
- `alerts.ps1` + `exec_extract.js` — new-release emails via GitHub issues (see above)
- `build.ps1` — template + data → page, with the locale guards; `build-page.mjs` —
  writes the published page (packed data, no comments) when Node is available
- `refresh_all.ps1` — runs everything in order; what the workflow calls
