# fnam-debt-monitor
Live macro and fiscal dashboards for fnam.mx, built directly on official sources.

## Pages

| Path | What | Refresh |
|---|---|---|
| `/` | Landing page (Spanish default, ES/EN toggle) | static |
| `/macro/` | U.S. macro dashboard | `macro-refresh.yml` |
| `/fiscal/` | U.S. fiscal debt monitor | daily `refresh-data.yml` (Treasury/FRED) + monthly PR to `monthly-data.js` |
| `/mx/macro/` | Mexico macro dashboard | `mx-macro-refresh.yml` (Banxico SIE, FRED, INEGI) |
| `/mx/fiscal/` | Mexico fiscal monitor (SHRFSP, holders, maturities, financial cost, revenue, spending, Pemex, CGPE 2027; Banxico balance sheet, policy rate, instruments) | daily `refresh-mx-data.yml` (Banxico SIE) + monthly PR to `monthly-data.js` |
| `/gap/` | GAP interactive financial model | `gap-refresh.yml` |

## Mexico fiscal monitor (`site/mx/fiscal/`)

Modeled on the U.S. monitor: one HTML file, one shared set of figures, Spanish by default with an
English toggle (stored under the same `fnam-lang` key the landing page uses; `?lang=en` also works).

- **Daily (automatic):** `scripts/fetch-mx-data.mjs` pulls the policy rate (SF61745), FIX exchange
  rate (SF43718), international reserves (SF43707), 28-day TIIE (SF43783), 28- and 364-day Cetes
  (SF43936/SF43939), the UDI (SP68257) and the monetary base from Banco de México's SIE API and
  writes `site/mx/fiscal/data.js`. It needs the free SIE token as the **`BANXICO_TOKEN`** repository
  secret (get one at https://www.banxico.org.mx/SieAPIRest/service/v1/token). The script checks every
  series' official title against an expected pattern and publishes nothing for a mismatch; all IDs were
  confirmed against the API on 2026-09-13 (monetary base = SF43695, 364-day Cetes = SF43945). They can
  be overridden with `BANXICO_SERIES_BASE_MONETARIA` and `BANXICO_SERIES_CETES_364`.
- **Monthly (reviewed PR):** after SHCP's "Finanzas públicas y deuda pública" release (last business
  day of the following month), update `site/mx/fiscal/monthly-data.js` — SHRFSP, gross debt, holders,
  revenue/spending year-to-date, RFSP path, Pemex debt — and any new narrative in `index.html`.
- **Initial snapshot caveat:** the first version's figures were taken from SHCP/Banxico releases as
  surfaced by web search on 12-Sep-2026 (this build environment could not reach the source sites);
  values marked `~` in the page are approximate or interpolated and should be checked against the
  official tables on the first monthly pass.
