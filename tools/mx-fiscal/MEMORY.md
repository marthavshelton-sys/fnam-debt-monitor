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
  statements define the ex ante rate with *expected* 12-month inflation from its survey; the page shows ex ante only
  when `survey.inflationNext12m` exists (the Banxico survey mirror is where the routine should take it from).
- PEF states amounts in pesos ("10,193,683,700,000"), the LIF table in millones de pesos.

## Conventions

- English copy: American English; headings in Title Case (h2/h3, nav, JS-set headings). Spanish: Mexican usage.
- Every chart/table source line ends with "datos al <última observación> · descargados el <fecha>"; document blocks
  print their `asOf`. Every block in `docs-data.js` carries a `url` the footer links to.
- Jump nav: desktop wraps (never clips); ≤820 px it is a sticky "Secciones / Sections" button opening a 2-column list.

## Open items

- Surveys (owner's decision, 29-Sep-2026): show BOTH. `survey` = Citi (every two weeks; chart, CGPE analysts
  column); `banxicoSurvey` = Banco de México's monthly survey (mirror `banxico-encuesta.txt`, official PDF link;
  supplies `inflationNext12m` for the ex ante real rate). The page prints them side by side.
- Fed funds and the rating agencies stay (owner's decision, 29-Sep-2026), linked to their own sites.
- Rating actions and Pemex quarterly figures are not in any mirror; the routine cites the agencies' and Pemex's own
  releases (Pemex 2T26 report URL is in `pemex.url`).
