# Mexico fiscal monitor — decisions, pitfalls, open items

Read before touching `site/mx/fiscal/`, `scripts/mx-fiscal/` or the two routines. Facts here were checked
against the mirrored documents in `tools/mx-fiscal/docs/` (each file starts with `# source:` and `# fetched:`).

## Pipelines (nothing needs the owner)

- `data.js` (118 series): `.github/workflows/refresh-mx-data.yml`, weekdays 19:30 UTC, `scripts/mx-fiscal/fetch.mjs`.
  Title-regex and plausibility guards; a failing series is kept stale, never dropped.
- Document mirrors: same workflow, `scripts/mx-fiscal/mirror-docs.mjs` from `tools/mx-fiscal/docs.json`. `find`
  entries follow the newest matching link on an index page (`banxico-encuesta` = latest Banxico expectations survey PDF).
- `docs-data.js`: the routine "FNAM Mexico fiscal: daily document check" (weekdays 15:00 UTC) reads the mirrors and
  commits straight to `main` with `[skip actions]`. It must run `node scripts/mx-fiscal/check-docs.mjs` before committing.
- `scripts/mx-fiscal/check-docs.mjs`: cross-checks `docs-data.js` against the LIF, PEF, CGPE and PAF mirrors; runs as
  the last workflow step (after the data commit, so a drift never blocks the series) and fails the job on a mismatch,
  which e-mails the owner.
- Alerts: routine "FNAM MX Fiscal: email material changes" (weekdays 23:30 UTC) appends to `alert-log.md`.

- Freshness: allowances in `tools/mx-fiscal/freshness.json` (Mexican business days for daily series, days after
  period end for the rest), embedded in `data.js` by `fetch.mjs` (`--annotate` re-embeds without fetching).
  `scripts/mx-fiscal/check-freshness.mjs` fails the run and keeps one `mx-fiscal-health` issue open; the page shows
  the same verdict in amber in the reader's browser (`?asof=YYYY-MM-DD` to test).
- Until 2026-10-01 `fetch.mjs` could not read the previous `data.js` (it parsed from the first `{`, which is in the
  header comment) and swallowed the error, so a failed series was dropped instead of kept as stale. Fixed; an
  unreadable `data.js` now fails the run.
- Banxico SG406/SG407 (gross and net liquid SPEA debt, quarterly) stopped at 2025-Q4; not shown on the page, listed
  by the freshness test.

## Facts that were wrong once (and where the truth is)

- **LIF 2026 art. 2** (DOF 07-Nov-2025): net domestic borrowing up to **$1 billón 780 mil millones**; net external up
  to **US$15,500 million** (includes IFIs). There is no "total" ceiling — the two are in different currencies.
  **$1,700.0 mmp / US$13.5 mmd is the ILIF 2027 *proposal*** (CGPE 2027, "La ILIF 2027 plantea…"), shown apart and
  labeled as pending. `lif.asOf` is the DOF date, not the end of the month.
- **PAF 2026, 15.8 %** is an *estimate* of net external debt as a share of total net debt at end-2026 ("se estima…
  ubicándose en 15.8 % de la deuda total"; 16.0 % in 2025, 13.1 % in 2031). It is not a cap; key `externalShareEstPct`.
- **CGPE 2027 table**: Cetes 28d 2027 *fin de periodo* 6.0 %, *promedio* 6.1 % (2026: 6.5 / 6.5); nominal GDP 2026
  37,160.7 and 2027 **39,419.4** mmdp; FX end-2026 17.8, end-2027 18.0; MME 78.4 (2026) and 61.8 (2027) US$/bbl.
- **Real rate**: deflating the target with *observed* annual inflation is the **ex post** rate. Banxico's policy
  statements define the ex ante rate with *expected* 12-month inflation from its survey. Since 2026-10-05 the page
  takes that expectation from the SIE series `inflExp12m` in `data.js` (Banxico SIE **SR16774**: the survey's median
  for the 12 months *after* the survey month, "mes t+1" in table CR155), never from `docs-data.js`. It is the figure
  Banxico headlines in Cuadro 2 of the survey PDF (footnote: "se considera el mes posterior al levantamiento") and the
  series the macro dashboard (`/mx/macro`) reads, so both pages print one number. **SR14195 is the "mes t" median**
  (12 months counted from the survey month itself) and runs about 0.1 pp higher (Sep-2026: 4.16 vs 4.08); the macro
  page used it until 2026-10-05, which is why the two pages disagreed. The routine still records the PDF's Cuadro 2
  median as `banxicoSurvey.inflationNext12m`; `check-docs.mjs` fails the run if the SIE series differs from it for
  the same survey month. Residual: this page compounds the real rate ((1+i)/(1+π)−1) while the macro page subtracts
  (i−π), so the two ex ante rates still differ by a few basis points (2.33% vs 2.42% in Oct-2026).
- PEF states amounts in pesos ("10,193,683,700,000"), the LIF table in millones de pesos.

## Conventions

- Every block says "Datos al <fecha de su serie principal>" (FNAM_PROV.through); auxiliary series (FIX for a
  conversion, GDP for a ratio, INPC as deflator) don't move that date but do trigger the amber flag.
- Three kinds of figure, one badge each (site/assets/provenance.js): Reportado / Cálculo FNAM / Estimación FNAM.
  Classification lives in the BLOCKS() registry and in each stats() item's third element; the ⓘ carries the
  series id, its date and its link; chart tooltips carry the same in their footer.
- INPC: only the MONTHLY index (SP1) and its annual change (SP30578), original series; the page says so wherever
  a real change or a real rate appears. Never the first-half-month INPC or a seasonally adjusted series without
  labeling it.
- SHRFSP is described as the net stock of liabilities of the broader PSBR framework, never as a sum of each
  entity's debt. A table cell with no figure says "n. p." (not published) or "n. a." (not applicable).

- English copy: American English; headings in Title Case (h2/h3, nav, JS-set headings). Spanish: Mexican usage.
- Every chart/table source line ends with "datos al <última observación> · descargados el <fecha>"; document blocks
  print their `asOf`. Every block in `docs-data.js` carries a `url` the footer links to.
- Jump nav: desktop wraps (never clips); ≤820 px it is a sticky "Secciones / Sections" button opening a 2-column list.

## Open items

- Surveys (owner's decision, 29-Sep-2026): show BOTH. `survey` = Citi (every two weeks; chart, CGPE analysts
  column); `banxicoSurvey` = Banco de México's monthly survey (mirror `banxico-encuesta.txt`, official PDF link).
  The page prints them side by side. The "próximos 12 meses" row and the ex ante real rate read the SIE series
  `inflExp12m` (SR16774), not `banxicoSurvey.inflationNext12m`, which stays as the cross-check value (see Real rate).
- Fed funds and the rating agencies stay (owner's decision, 29-Sep-2026), linked to their own sites.
- Rating actions and Pemex quarterly figures are not in any mirror; the routine cites the agencies' and Pemex's own
  releases (Pemex 2T26 report URL is in `pemex.url`).
