# fnam-debt-monitor
Live macro and fiscal dashboards for fnam.mx, built directly on official sources.

## Pages

| Path | What | Refresh |
|---|---|---|
| `/` | Landing page (Spanish default, ES/EN toggle) | static |
| `/macro/` | U.S. macro dashboard | `macro-refresh.yml` |
| `/fiscal/` | U.S. fiscal debt monitor (runbook: `tools/fiscal/README.md`) | twice-daily `refresh-data.yml` (Treasury/Fed/FRED → `data.js`, then a per-data-point freshness check that opens a `fiscal-health` issue) + Mon/Wed/Fri research routine committing `monthly-data.js` (CBO, FedWatch) |
| `/mx/macro/` | Mexico macro dashboard | `mx-macro-refresh.yml` (Banxico SIE, FRED, INEGI) |
| `/mx/fiscal/` | Mexico fiscal monitor (SHRFSP, holders, maturities, financial cost, revenue, spending, Pemex, CGPE; Banxico balance sheet, policy rate, instruments) | daily `refresh-mx-data.yml` (Banxico SIE + SHCP open data → `data.js`) + weekly routine PR to `docs-data.js` |
| `/gap/` | GAP interactive financial model | `gap-refresh.yml` |
| `/qualitas/` | Quálitas interactive financial model | `qualitas-refresh.yml` |
| `/gentera/` | Gentera interactive financial model (runbook: `tools/gentera/README.md`; pipeline health: `/gentera/quality.html`) | `gentera-refresh.yml` |
| `/oracle/` | Oracle Corporation (NYSE: ORCL) interactive financial model, the first US-listed company on the site (runbook: `tools/oracle/README.md`; pipeline health: `/oracle/quality.html`) | `oracle-refresh.yml` (market + EDGAR harvest) + weekday reviewing routine (`tools/oracle/ROUTINE.md`) |

## Password protection (site-wide)

`functions/_middleware.js` is a Cloudflare Pages Function that gates every address on fnam.mx behind one shared
password. It is dormant until the password exists, so the site stays public until the owner sets it.

To turn it on:

1. Cloudflare dashboard → Workers & Pages → the fnam.mx Pages project → Settings → Variables and Secrets →
   Add `SITE_PASSWORD` (type Secret) with the chosen password, for both Production and Preview.
2. Add `SITE_SESSION_SECRET` (type Secret): a random string of 32+ characters that signs the session cookies
   (`openssl rand -hex 32` makes one). Without it the secret is derived from the password, so sessions can only be
   revoked by changing the password. Rotating this value ends every session at once.
3. Deployments → latest deployment → Retry deployment (or push anything to `main`).

From then on every page, data file, PDF and quality page needs a session: visitors get one bilingual login form
(HTTP 401; a `#section` deep link survives the login), sessions last 7 days by default, `/logout` ends one,
`robots.txt` answers `Disallow: /` and every response carries `noindex`. The password is accepted only through the
login form (never in a header or a query string). Wrong passwords are throttled per client address (8 in 15 minutes,
then HTTP 429 until the window ends; counters live in the data center's cache, or globally in a KV namespace bound
as `FNAM_RATE`). Remove `SITE_PASSWORD` and redeploy to turn the gate off. Optional variables:
`SITE_SESSION_DAYS` (default 7, maximum 30), `SITE_SESSION_VERSION` (change it to revoke every session without
touching the password or the secret), `SITE_LOGIN_ATTEMPTS` and `SITE_LOGIN_WINDOW_MIN` (the throttle).

Gate on or off, the same middleware redirects `www.fnam.mx` to `fnam.mx` (so nobody logs in twice), sets the
security headers (HSTS, Content-Security-Policy with `frame-ancestors 'none'`, Permissions-Policy, nosniff,
Referrer-Policy; `site/_headers` carries the same set for static assets) and serves a page in the language of its
`?lang=en|es` query in the HTML itself, before any script runs.

Also add the same password as the GitHub repository secret `SITE_PASSWORD` (Settings → Secrets and variables →
Actions): `macro-live-check.yml` reads the live site after every US macro refresh and logs in with it (POST
`/login`, cookie kept); without the secret that check reports the 401 and fails. One password for everything: the
section gates under `functions/<section>/` (GAP, Oracle, OMA, ASUR, Quálitas) stand down automatically while
`SITE_PASSWORD` is set, whatever their own `*_PASSWORD` variables hold; those only matter while the site gate is off.

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
- **`tools/mx-fiscal/docs/` — official documents mirrored as text, daily.** The same workflow runs
  `scripts/mx-fiscal/mirror-docs.mjs` (sources in `tools/mx-fiscal/docs.json`: CGPE and PAF PDFs found on
  SHCP's Paquete Económico page, the Informes and Deuda index pages, SHCP press releases, Banxico's
  announcements and survey pages, Pemex investor relations, LIF and PEF PDFs) so the document routine,
  which runs where gob.mx is unreachable, reads primary text. Failures never fail the job.
- **`docs-data.js` — every weekday, via a Claude routine that commits directly to `main`.** `window.MX_DOCS` holds the
  figures that exist only in documents — CGPE/Paquete Económico estimates and macro assumptions, the
  Plan Anual de Financiamiento (maturities, amortization profile), Ley de Ingresos and PEF totals,
  sovereign ratings, Pemex's reported debt and support, the analysts' survey, Banxico's decision
  calendar — each block with the document's `asOf` date, which the page prints next to the figures.
  The routine reads the mirrors first, cites a mirror or URL for every changed value, and pushes with
  rebase-and-retry; nothing in the pipeline needs a human step.
- The daily job has its own concurrency group, touches only `site/mx/fiscal/data.js` and
  `tools/mx-fiscal/docs/`, and pushes with rebase-and-retry so it never collides with the other pages'
  refresh workflows.
- Ratios to GDP use INEGI's nominal GDP (average of the last four quarters), so they differ by tenths
  of a point from SHCP's own ratios, which use its annual GDP estimate; the page says so.

