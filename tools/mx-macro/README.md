# Monitor Macro México — fnam.mx/mx/macro

Bilingual (es-MX default / EN) Mexico macro dashboard: INPC inflation and its
components, real GDP and IGAE, unemployment and IMSS formal jobs, consumer
confidence, remittances, merchandise trade, the peso, Banxico's policy rate,
market rates and international reserves. One page, two languages, served at
`site/mx/macro/index.html` (`/mx/macro/en/` redirects to the English view).
Same visual system as the U.S. page at `/macro/`.

## How it stays current

`.github/workflows/mx-macro-refresh.yml` runs at 12:25, 18:25 and 19:25 UTC on
weekdays (INEGI releases at 06:00 Mexico City = 12:00 UTC; Banxico's FIX and
policy decisions land in the afternoon) and on demand from the Actions tab. It:

1. runs `scripts/mx-macro/fetch.mjs`, which pulls every series in
   `series.json` into `data/series.json`;
2. runs `scripts/mx-macro/build.mjs`, which bakes that data into
   `template.html` and writes the page;
3. commits only if the data actually changed. Cloudflare Pages deploys the
   commit like any other.

A series that fails on a run keeps its last committed points (the page marks
that source "sin actualizar desde …"); a series that has never been obtained
is simply absent and the page hides the panels that depend on it, showing a
notice that lists what is pending. One bad feed never takes the page down.

**Required repository secret:** `BANXICO_TOKEN` — free and instant at
<https://www.banxico.org.mx/SieAPIRest/service/v1/token>. Without it only the
FRED fallbacks load (GDP, unemployment, trade, the exchange rate, reserves,
an interbank-rate proxy and the 10-year yield); the INPC and its components,
remittances, the target rate, TIIE and Cetes come only from Banxico.

**Also required for IGAE and consumer confidence:** `INEGI_TOKEN` — free
registration at
<https://www.inegi.org.mx/app/desarrolladores/generatoken/Usuarios/token_Verify>.

**Optional:** `FRED_API_KEY` (already set for the U.S. page) lets the fetcher
verify each FRED series' title.

## Series manifest and the title check

`series.json` lists one logical series per key with an ordered list of
candidates (`provider`, `id`, `title`). The fetcher keeps the first candidate
that answers **and** whose title, as reported by the provider, matches the
`title` regex. A candidate that answers with a different title is dropped and
reported as a warning in the Actions run (and in the run summary table, which
shows every series' source, reported title, last date and value). That is the
guard against a mistyped ID putting a wrongly labelled series on the page.

Banxico IDs confirmed against the titles the API reported on the first run
with a token: `SP1` (INPC general), `SP74625`–`SP74631` (subyacente,
mercancías, mercancías no alimenticias, servicios, otros servicios, no
subyacente, energéticos y tarifas), `SF43718` (FIX), `SF61745` (tasa
objetivo), `SF43783` (TIIE 28), `SF43936` (Cetes 28), `SE27803` (remesas)
`SF43707` (reservas) and `SP74639` (tarifas autorizadas). `SP2`–`SP8` turned
out to be producer-price and construction-cost indices, not the INPC
spending-purpose groups; those groups (alimentos, vivienda, educación, …)
still need their SIE IDs looked up in the catalog.

INEGI ids, confirmed with the BIE search on 2026-09-13 (each candidate carries
the `search` query that reproduces the confirmation): IGAE total `737219`
(seasonally adjusted, base 2018; `737217` original series as fallback), IGAE
by activity group `737226` / `737233` / `737268` (primary, secondary,
tertiary, seasonally adjusted), consumer confidence `454186` (seasonally
adjusted balance; `454168` original). `SR14195` (Banxico survey, median
expected inflation 12 months ahead) feeds the ex ante real rate.

Not yet sourced: IMSS jobs, industrial production and the INPC
spending-purpose groups.

Finding an id without leaving GitHub: run the workflow by hand (Actions →
Refresh Mexico macro dashboard → Run workflow) with one of the diagnostic
inputs filled in; nothing is fetched or committed and the result is in the
run's log and summary:

- **search** — BIE full-text search, e.g. `confianza del consumidor`; prints
  indicator ids with their full topic path. This is the reliable way to find
  INEGI ids (the public catalog endpoint only answers per id).
- **probe** — `inegi:737219,banxico:SP1` describes specific ids: title,
  point count, first and last observation.
- **url** — fetch arbitrary URLs (`{INEGI_TOKEN}` etc. substituted),
  `URL#regex` to filter lines, `URL##regex` for match-with-context.
- **xlsx** — `URL#regex` prints matching rows of a workbook.
- **catalog** — reserved; INEGI exposes no whole-catalog endpoint.

Locally the same flags work on `scripts/mx-macro/fetch.mjs` (`--search`,
`--probe`, `--url`, `--xlsx`).

INEGI's data endpoint returns no series name. For an INEGI candidate the
fetcher runs the BIE search with the candidate's `search` query, takes the
row whose id matches and checks the regex against that row's full topic path
(the per-id `CL_INDICATOR` catalog description is the fallback).

## Editing the page

All content lives in `template.html`. Every user-visible string is in the
`I18N` block in both languages; the build refuses to run if the two locales
don't have identical keys, if the code references a string that doesn't
exist, or if a `data-i18n` attribute points at a missing key. After editing,
push — the workflow rebuilds and deploys.

Preview locally against the committed data (or any data file):

```bash
node scripts/mx-macro/build.mjs --out /tmp/mx.html --force
node scripts/mx-macro/build.mjs --data path/to/other.json --out /tmp/mx.html --force
```

## Data shape

`data/series.json` is `{generatedAt, series: {key: {provider, providerLabel,
id, title, url, freq, unit, fetchedAt, points: [[d, v], ...]}}}` with `d` =
`YYYY-MM` (monthly), `YYYY-Qn` (quarterly) or `YYYY-MM-DD` (daily/weekly).
Year-over-year and month-over-month changes are computed in the page from the
published indices, so nothing derived is stored.

## Files

- `series.json` — the manifest (what to fetch, from where, with which title check)
- `template.html` — page: styles (shared with the U.S. page), markup, strings, rendering
- `data/series.json` — last-good data, committed by the workflow
- `../../scripts/mx-macro/fetch.mjs` — fetcher (Banxico SIE, FRED, INEGI)
- `../../scripts/mx-macro/build.mjs` — template + data → page, with the locale guards
