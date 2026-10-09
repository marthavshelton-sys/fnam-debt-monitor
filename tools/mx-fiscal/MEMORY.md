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
- Banxico's quarterly debt block (SG406–SG421: gross and net liquid debt of the sector público económico amplio and of
  the consolidated sector, total/internal/external, plus IPAB, FARAC, UDI and debtor-support lines) stopped at 2025-Q4;
  no quarterly series is left in any public-finance table of SIE sector 9 (checked via the SIE API, 2026-10-07). SG406/SG407
  were replaced on 2026-10-07 (owner's decision) by SHCP's own monthly totals in pesos from deuda_publica.csv: `deudaBrutaSPF`
  (XET30, "Saldo de la deuda bruta del Sector Público Federal en pesos") and `deudaNetaSPF` (XET10, net). Perimeter caveat:
  SHCP's Sector Público Federal is narrower than Banxico's económico amplio (no IPAB, FARAC or debtor programs): at Dec-2025
  SG406 was 26.7 bn MXN against about 19.7 bn for SHCP's gross stock; SHRFSP (18.6 bn) is the closest live measure to SG407
  (19.0 bn). Neither new series is shown on the page yet; label the perimeter when one is.
- Banxico republishes SHCP's monthly debt stocks (SG193 net SPEA debt, SG194/SG195 its domestic and external parts,
  SG199 consolidated net debt; SIE table CG7) about a month after SHCP's own release, which comes 30 days after month
  end: the Jul-2026 point landed on 28-Sep-2026, 59 days after period end and 31 days after SHCP's 28-Aug release, so
  the latest point is about 90 days old by the time the next one lands. Their allowance is 100 days (`bySeries` in
  `freshness.json`, 2026-10-07); the generic 66-day monthly rule opened issue #204 on 6-Oct-2026 while nothing was wrong.
  Watch the observed lag in each run's freshness table and tighten the allowance if Banxico turns out to be faster.
- 6-Oct-2026: every hacienda.gob.mx host was unreachable from the runner for the whole 19:30 UTC run (connect timeouts
  on the three Estadísticas Oportunas CSVs and on the document links; answering again at 10:46 UTC the next day). The 28
  SHCP series were kept from 5-Oct as designed, but each of them retried the dead file (3 tries × 30 s), so the fetch
  step took 44 minutes. Since 2026-10-07 `fetch.mjs` downloads each CSV once per run, success or failure, and every
  series that reads it fails fast with the same reason. A probe from the runner: dispatch the refresh workflow with
  `probe` = "tls www.secciones.hacienda.gob.mx; url <csv url>" (nothing is written).

- 8 and 9-Oct-2026: two scheduled runs failed in the "Mirror official documents" step (apt could not install
  poppler-utils: GitHub's Ubuntu mirror answered 404 for the package the runner image's stale index named) and, because
  the single commit step came after it, the refreshed `data.js` never reached `main` while the freshness test passed on
  the fresh local file. The page showed 7-Oct data (August INPC, FIX 17.98, the 1-Oct Cetes auction) for two days with
  the watchdog saying "up to date" (its old two-miss rule). Since 9-Oct-2026 the workflow commits `data.js` right after
  the fetch (`scripts/mx-fiscal/commit-push.sh`), mirrors the documents afterwards with `continue-on-error`, a 15-minute
  limit and `apt-get update` first, commits the mirrors separately, and the freshness test fails when the fetch failed
  or the commit did not land (`MX_FISCAL_FETCH_OUTCOME`, `MX_FISCAL_COMMIT_OUTCOME`). The watchdog flags one missed
  refresh (`tools/watchdog/README.md`).
- Inflation on both Mexican pages comes from the same INEGI INPC in Banxico's SIE: this page reads INEGI's published
  annual change (SP30578), the macro page computes it from the monthly index (SP1); checked 9-Oct-2026, the two agree in
  all 224 months since 2008, so a disagreement between the pages can only be a stale refresh.
- Page conventions added 9-Oct-2026: the four head scripts are deferred and the page script waits for DOMContentLoaded;
  the language toggle rewrites `?lang=`; every chart canvas and donut carries `role="img"` and the heading of its card as
  `aria-label`; axis ticks use a true minus sign (`mSign`); the peso callout's wording follows the sign of each move
  (year-to-date decides "más débil / más fuerte"); Section 05 dates every FIX it uses and revalues the dollar stock at the
  latest FIX; Section 01's external share (component of the SHRFSP, net) and Section 05's (gross federal public-sector
  debt at the month-end FIX) are explained as different measures; policy decisions show the decision date and the
  effective date (the series moves the business day after Banxico's announcement; the Fed's decision takes effect the
  next U.S. business day: `decisionDateOf`, `nextBusinessDay`); the ratings line is dated by the latest rating action.
- Hacienda links (`finanzaspublicas.hacienda.gob.mx`, `secciones.hacienda.gob.mx`) serve an incomplete certificate
  chain, so the link check lists them as unverifiable; browsers open them. No gob.mx equivalents exist (five
  candidates answered 404 on 9-Oct-2026), so the links stay.

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
  takes that expectation from the SIE series in `data.js`, never from `docs-data.js`: the survey's **mean**
  (`inflExp12mMean`, SIE **SR16773**) drives the ex ante rate because that is Banxico's own definition (below), and the
  **median** (`inflExp12m`, SIE **SR16774**, the figure Banxico headlines in Cuadro 2 of the survey PDF and the
  statistic consensus surveys report) is printed beside it; both are for the 12 months *after* the survey month
  ("mes t+1" in table CR155, footnote of the PDF: "se considera el mes posterior al levantamiento"). The macro
  dashboard (`/mx/macro`) reads the same two series, so both pages print the same figures. **SR14195 is the "mes t" median**
  (12 months counted from the survey month itself); the two differ month by month (Feb-2018 to Sep-2026: −0.29 to
  +0.13 pp; Sep-2026: 4.16 vs 4.08). The macro page used it until 2026-10-05, which is why the two pages disagreed.
  The SIE API carries SR16774 from Feb-2018 only (N/E before). The routine still records the PDF's Cuadro 2
  median as `banxicoSurvey.inflationNext12m`; `check-docs.mjs` fails the run if the SIE series differs from it for
  the same survey month. Both real rates are **differences** (target minus inflation, percentage points), Banxico's
  definition: Informe Trimestral abril–junio 2026, Gráfica 104, nota 1 ("la diferencia entre el objetivo de la tasa de
  interés interbancaria a un día y la media de las expectativas de inflación a 12 meses"). Until 2026-10-05 this page
  compounded ((1+i)/(1+π)−1) and printed 9 bp below the macro page for the same inputs. Mean vs. median (owner's
  decision, 2026-10-05): show both; the mean is Banxico's statistic for this rate (Aug-2026: 6.50 − 4.15 = 2.35%, the
  figure in that report), the median is what consensus surveys (Citi, Bloomberg) and the survey's own narrative report.
  Still open: Banxico's neutral real-rate range is 1.8–3.6% (midpoint 2.7%) since 28-Aug-2024, while the macro page's
  summary sentences still compare with 1.8–3.4%.
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
  The page prints them side by side. The "próximos 12 meses" rows (mean and median) and the ex ante real rate read the
  SIE series `inflExp12mMean` (SR16773) and `inflExp12m` (SR16774), not `banxicoSurvey.inflationNext12m`, which stays
  as the cross-check value (see Real rate).
- Fed funds and the rating agencies stay (owner's decision, 29-Sep-2026), linked to their own sites.
- Rating actions and Pemex quarterly figures are not in any mirror; the routine cites the agencies' and Pemex's own
  releases (Pemex 2T26 report URL is in `pemex.url`).
