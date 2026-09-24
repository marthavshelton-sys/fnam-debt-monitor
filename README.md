# fnam-debt-monitor
Live macro and fiscal dashboards for fnam.mx, built directly on official sources.

## Pages

| Path | What | Refresh |
|---|---|---|
| `/` | Landing page (Spanish default, ES/EN toggle) | static |
| `/macro/` | U.S. macro dashboard | `macro-refresh.yml` |
| `/fiscal/` | U.S. fiscal debt monitor | daily `refresh-data.yml` (Treasury/FRED) + monthly PR to `monthly-data.js` |
| `/mx/macro/` | Mexico macro dashboard | `mx-macro-refresh.yml` (Banxico SIE, FRED, INEGI) |
| `/mx/fiscal/` | Mexico fiscal monitor (SHRFSP, holders, maturities, financial cost, revenue, spending, Pemex, CGPE; Banxico balance sheet, policy rate, instruments) | daily `refresh-mx-data.yml` (Banxico SIE + SHCP open data → `data.js`) + weekly routine PR to `docs-data.js` |
| `/gap/` | GAP interactive financial model | `gap-refresh.yml` |
| `/qualitas/` | Quálitas interactive financial model | `qualitas-refresh.yml` |
| `/gentera/` | Gentera interactive financial model (runbook: `tools/gentera/README.md`; pipeline health: `/gentera/quality.html`) | `gentera-refresh.yml` |
| `/oracle/` | Oracle Corporation (NYSE: ORCL) interactive financial model, the first US-listed company on the site (runbook: `tools/oracle/README.md`; pipeline health: `/oracle/quality.html`) | `oracle-refresh.yml` (market + EDGAR harvest) + weekday reviewing routine (`tools/oracle/ROUTINE.md`) |

## Mexico fiscal monitor (`site/mx/fiscal/`)

One HTML file, Spanish by default with an English toggle (shared `fnam-lang` key; `?lang=en` works).
Every chart, table, KPI and sentence is rendered in the browser from two data files; the page has
no hand-typed figures.

- **`data.js` — every business day, automatic.** `.github/workflows/refresh-mx-data.yml` (19:30 UTC,
  weekdays) runs `scripts/mx-fiscal/fetch.mjs`, which pulls every series listed in
  `tools/mx-fiscal/series.json` (117 series) and writes `window.MX_DATA`:
  - Banco de México SIE API (`BANXICO_TOKEN` secret): policy rate, FIX, reserves, TIIE, Cetes, UDI,
    INPC, the weekly balance-sheet lines, holdings of government securities by sector and instrument,
    average maturity, INEGI nominal GDP (SR17645), and SHCP's public-finance cash flows as republished
    in SIE sector 9 (revenue by source, spending by line, balances, Pemex) — those flows are
    **year-to-date** (`ytd: true`); the page differences them for monthly values.
  - SHCP Estadísticas Oportunas open-data CSVs (`shrfsp_deuda_amplia_actual.csv`, `rfsp.csv`,
    `deuda_publica.csv`): SHRFSP and components, RFSP, domestic/external debt stocks. The server sends
    an incomplete TLS chain; `scripts/mx-fiscal/net.mjs` completes it from the certificates' AIA urls
    and accepts the chain only if it verifies up to a root Node or the OS already trusts.
  - Guards: a series is published only if the provider's own title matches the manifest's regex and
    its latest value passes the plausibility range. A rejected or failed series keeps its last good
    points and is flagged `stale`; the page shows "sin actualizar desde …" on the affected sections.
    The job exits non-zero (GitHub e-mails the owner) only when a `required` series has no data at all.
  - Diagnostics from the Actions tab: run the workflow with `dry_run` (fetch, validate, write nothing)
    or with a `probe` string (see `scripts/mx-fiscal/probe.mjs`: `banxico-cuadro`, `banxico-range`,
    `shcp-index`, `shcp-concepts`, `shcp-concept`, `tls`, …).
- **`docs-data.js` — weekly, via a Claude routine that opens a PR.** `window.MX_DOCS` holds the
  figures that exist only in documents — CGPE/Paquete Económico estimates and macro assumptions, the
  Plan Anual de Financiamiento (maturities, amortization profile), Ley de Ingresos and PEF totals,
  sovereign ratings, Pemex's reported debt and support, the analysts' survey, Banxico's decision
  calendar — each block with the document's `asOf` date, which the page prints next to the figures.
- Ratios to GDP use INEGI's nominal GDP (average of the last four quarters), so they differ by tenths
  of a point from SHCP's own ratios, which use its annual GDP estimate; the page says so.

