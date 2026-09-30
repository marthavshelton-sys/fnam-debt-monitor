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
  metadata; an unknown `?view=` shows a notice and the first section.
- **Challenger is automated** (`process_challenger.ps1` reads the PDF); the page
  notice and badge say so. Do not reintroduce "entered by hand".
- **GDP estimate name** = GDP release dates after the quarter's end (FRED calendar,
  `recent`), capped and completed by BEA's own "last revised" date for table 1.1.1
  (`gdp_processed.vintage.gdp`). The date shown is BEA's when available.
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
- Retail sales: the Census API level (Aug-2026 $737.8B) sits 3.4-4.7% below FactSet's
  CENRETAIL&FS@US on every month since Aug-2024; neither source here confirms the
  28-Sep benchmark revision. Reconcile against the Census release tables.
- Page weight is now ~1.0 MB raw (~290 KB gzip), mostly packed data. The next step
  would be per-section data files loaded on demand, which changes the build,
  `exec_extract.js` and `alerts.ps1` together.
