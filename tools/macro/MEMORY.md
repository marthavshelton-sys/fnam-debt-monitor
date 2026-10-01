# US macro dashboard — memory (decisions, pitfalls, open items)

Read with `README.md` before touching `tools/macro/` or `site/macro/`.

## Decisions

- **Two revision bases, both named.** "Against first estimates" (chart, pipeline's own
  first prints) and "against the previous report" (BLS's release wording, from ALFRED
  vintages in `labor_static.payrollVintages`). Never present one as the other.
- **Financial conditions: charts weekly, tiles and prose from `series.latest`.** The
  weekly point for an unfinished week is dropped in the processor and ignored by the
  page, so no date ahead of the run day is ever shown.
- **English headings Title Case, Spanish sentence case** (owner's instruction of
  29-Sep-2026: "in American English, use title case"; Spanish typography keeps
  sentence case). Spanish month abbreviations lowercase everywhere, including
  `dd-mmm-yyyy` dates and the hard-coded dates inside Spanish strings.
- **Units in Spanish:** "mil" for thousands, "M" for millions of people/jobs,
  "mmd" for miles de millones de dólares, "billones" for 10^12; a units note sits under
  the fiscal tiles.
- **SPR cavern counts** come from DOE's storage-sites page only; the Quick Facts
  table's differing count (West Hackberry 22 vs 21) is footnoted, not displayed.
- **SPR latest reading = the newer of EIA's week and DOE's daily report** (owner, 30-Sep-2026:
  the header said 18-Sep while DOE's report below showed 25-Sep). DOE's figures come from
  OCR of the image (`spr_image_ocr.py`); if they fail the checks the page falls back to EIA only.
- **Sections are links** (`?view=…&lang=…`) with pushState history and per-section
  metadata. An unknown `?view=` gets "Section not found" (owner, 30-Sep-2026: falling
  back to CPI was a defect): the address as typed, every section as a link, `noindex`,
  and a real 404 from `functions/macro/_middleware.js`, whose `VIEWS` list both
  builders check against the navigation. Adding or renaming a section means updating
  that list. Site-wide, `site/404.html` (status 404) replaced Cloudflare's SPA fallback,
  which had answered every unknown address with the home page and 200; the internal
  links were scanned first and none depended on the fallback.
- **Weekly "next" dates are the release after the one shown**, from the publisher's
  calendar: NFCI = FRED release 221 (Wednesdays 8:30 ET; Thursday after a Monday
  holiday, e.g. 15-Oct and 12-Nov-2026), mortgage = FRED release 190 (Freddie Mac PMMS,
  Thursdays 12:00 ET; Wednesday 25-Nov-2026), EIA = its holiday table on
  eia.gov/petroleum/supply/weekly/schedule.php. Never "next Wednesday from today": that
  rule printed 30-Sep as "next" on 30-Sep, after the 30-Sep NFCI was already shown.
- **SPR weekly comes from the WPSR's own Table 1 workbook** (`ir.eia.gov/wpsr/psw01.xls`,
  column WCSSTUS1), posted at the 10:30 ET release; the series-page workbook
  (`dnav/pet/hist_xls/WCSSTUS1w.xls`) carries identical figures (2,296 weeks, 0
  differences on 30-Sep-2026) but is served only in the afternoon: on 30-Sep the runs at
  14:51 and 16:52 UTC still got the 23-Sep file although its Last-Modified said 14:43 UTC
  (built in the morning, published later). It stays as the fallback. Wednesday runs at
  14:45 and 15:45 UTC pick the report up.
- **Each figure carries its own date**: target (same day), effective rate (next business
  day) and mortgage (weekly) are dated separately; one date for all three printed
  "7.03% (30-Sep-2026)" for a 24-Sep reading.
- **BEA's annual update is announced on the page** for 120 days (`revisions` in
  `gdp_processed.json`, written by `Get-HistoryRevision`). The 30-Sep-2026 record was
  computed from the committed data before (9af7c7f) and after (a1705bf) the update.
- **Challenger is automated** (`process_challenger.ps1` reads the PDF); the page
  notice and badge say so. Do not reintroduce "entered by hand".
- **GDP estimate name** = GDP release dates after the quarter's end (FRED calendar,
  `recent`), capped and completed by BEA's own "last revised" date for table 1.1.1
  (`gdp_processed.vintage.gdp`). The date shown is BEA's when available.
- **The live page is checked on GitHub's runner, not from a session**
  (`macro-live-check.yml` after every refresh; failures become one "LIVE CHECK FAILED:"
  issue that the email routine sends). A session's Chromium does not trust the egress
  proxy's certificate, and driving it at fnam.mx is refused by the permission check;
  do not work around either.
- **Revisions are alerted** (`alerts.ps1`, state `values`): a figure already reported
  that moves past its band gets a line in the next release's alert, or an alert of its
  own. First stored 30-Sep-2026 with a backfill (GDP before BEA's annual update that day,
  retail before Census's 28-Sep benchmark) so both revisions went out once.
- **Email routine windows follow the scheduled slot** (14:45 / 20:45 UTC), not the
  hour a run starts: a late run on 29-Sep-2026 re-sent an alert under the old rule.
- **Published page = `build-page.mjs`** (packed data, no comments, ~1.0 MB);
  `build.ps1` builds the unpacked page itself only without Node or on a builder
  failure, which the run flags with a `::warning::`.

## Pitfalls

- Cloud sessions have no access to BLS/FRED/BEA. Build and check with
  `node tools/macro/build-page.mjs`; the runner rebuilds on merge. `pwsh` installs
  from packages.microsoft.com: parse-check every script and run processors against a
  global mock `Invoke-RestMethod` (set `MACRO_DATA_DIR` and `RUNNER_TEMP` to a scratch
  folder). The runner is Windows PowerShell 5.1: keep scripts ASCII (no BOM means
  ANSI there), and remember `Set-Content -Encoding utf8` writes a BOM on 5.1 but not
  on 7. Keep processor edits small, wrap new fetches in try/catch so one failure never
  blocks the run, and watch the first workflow run after merging.
- New data blocks must be read as `unpack(/*__NAME__*/ null)` in the template and
  listed in both `build.ps1` and `build-page.mjs`; the Node builder packs only blocks
  read through `unpack()` and checks each one round-trips.
- `live-check.mjs` compares against main with a plain `git fetch origin main`
  (never `--depth`, which makes a full clone shallow).
- The phone `@media` blocks must stay at the end of the stylesheet (placed first,
  later base rules overrode them and the 11 px floor was dead code).
- `build.ps1`'s guards only see keys written as `    key:` at the start of a line in
  the `es` block; a key added at the end of another line is invisible to them.
- `labor_static.json` is now compact (both processors write `-Compress`); the
  vintages block is rewritten only when a value moves, so it does not commit every run.
- FRED's weekly aggregation of a daily series can date the current week to a future
  Friday (DFEDTARU showed 02-Oct on 29-Sep).
- The Spanish "sólo" appears only as "solo" (RAE); "derbi", "hostelería" and English
  "grey" are gone. `exFiLatest` starts "En ago 2026:" so no month is capitalised.
- FRED's calendar has no state for "scheduled today, not out yet": the past query lists
  only dates with data and the future one was filtered to dates after today, so a run on
  a release morning lost that release (mortgage, 01-Oct-2026 04:00 UTC: next became
  08-Oct). `process_calendar.ps1` keeps today in `upcoming` for the weekly keys until
  FRED lists it as published.
- Two series on one chart must share an axis of both series' months. `renderDualLineChart`
  once took its months from the first series only, so a month only the second one had
  (PCE for October 2025, when BLS published no CPI) was drawn off the chart and back, a
  stray line across the CPI vs. PCE charts (owner, 1-Oct-2026); the hiring chart drew last
  year's Sep-Dec past its edge the same way. Now: the union of months, both lines from the
  later start, a break where one series has no value, and the live check fails any line
  that leaves its chart.
- Signed figures: never `(v >= 0 ? "+" : "") + v.toFixed(d)`, which prints "-0.0" for
  -0.03; use `sgnFix(v, d)` and, for tile arrows, `deltaArrow(v, d)`.
- On pwsh 7, `Headers["Last-Modified"]` is a string array and the date parse fails;
  on the runner (5.1) it is a string. Test processors with that in mind.
- Headings: this page keeps Spanish headings in sentence case (its own convention,
  `titleCaseHeadings` is English-only); site-wide pages such as `site/404.html` follow
  CLAUDE.md's Title Case in both languages.

## Open items

- Verify with DOE which cavern count for West Hackberry is current (storage-sites
  page: 21; Quick Facts table as of 20-Aug-2026: 22); switch the source if the
  table is right.
- Shiller's current-month GS10 is a single daily reading: 4.75% in the Sep-2026 file
  equals the H.15 10-year for 31-Aug (FactSet FRBRIFLGFCY10@US: 31-Aug 4.75, 1-Sep
  4.79). The page says "one daily reading at posting"; confirm the convention from
  Shiller's notes if the wording ever needs to be more specific.
- After the first runner run with the vintages: check that the payrolls card quotes
  the BLS basis ("… revised +55K in total from the previous report") and that the
  ALFRED first prints agree with `payrollInitial`. Also that the log shows "BEA last
  revised: GDP <date>" (if "not reported", BEA's note lacks the date and the page
  falls back to FRED's calendar alone).
- (Resolved 30-Sep-2026) Retail sales level: Census's 28-Sep-2026 benchmark revision,
  pulled by the 14:20 UTC refresh that day, cut Aug-2026 retail and food services from
  $773,947M to $737,763M (-4.7%) and every month since Aug-2024 by 3.4-4.7%. FactSet's
  CENRETAIL&FS@US still showed the pre-revision $773,947M, so the gap was FactSet lagging,
  not the page. The revision alert reported it once.
- After the first runner run with this change: the log of `process_calendar.ps1` shows
  `nfci` and `mortgage` with a next date (if FRED gives none, the page says "expected"),
  `process_spr.ps1` says it used the WPSR workbook and lists EIA's holiday exceptions,
  and the next Wednesday's 14:45 or 15:45 UTC run commits the new SPR week.
- Monthly "next release" lines (CPI, PPI, jobs, retail, PCE, GDP) still use FRED's
  first date after the run day. A run on a release morning before FRED lists the release
  (the 12:50 UTC weekday run is 07:50 ET in winter) skips to the following month until the
  next run; keeping today in their lists would break the Challenger line on jobs day and
  mislabel the FRED-lag window. Proper fix: anchor on the data shown, as the weekly lines
  do (month M is published in M+1, so next = the first date on or after the first day of
  M+2; GDP and income have BEA's own release date in `vintage`).
- Page weight is now ~1.0 MB raw (~290 KB gzip), mostly packed data. The next step
  would be per-section data files loaded on demand, which changes the build,
  `exec_extract.js` and `alerts.ps1` together.
