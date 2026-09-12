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
FRED fallbacks load (GDP, industrial production, unemployment, consumer
confidence, trade, the 10-year yield, plus the OECD copies of headline/core
CPI, the exchange rate and reserves); the INPC components, remittances, IMSS
jobs, the policy rate, TIIE and Cetes come only from Banxico.

**Optional:** `FRED_API_KEY` (already set for the U.S. page) lets the fetcher
verify each FRED series' title; `INEGI_TOKEN` is only read once INEGI
candidates are added to the manifest.

## Series manifest and the title check

`series.json` lists one logical series per key with an ordered list of
candidates (`provider`, `id`, `title`). The fetcher keeps the first candidate
that answers **and** whose title, as reported by the provider, matches the
`title` regex. A candidate that answers with a different title is dropped and
reported as a warning in the Actions run (and in the run summary table, which
shows every series' source, reported title, last date and value). That is the
guard against a mistyped ID putting a wrongly labelled series on the page.

The Banxico IDs for the INPC family (`SP1`, `SP74625`–`SP74639`), the FIX
(`SF43718`), the target rate (`SF61745`), TIIE 28 (`SF43783`), Cetes 28
(`SF43936`), remittances (`SE27803`) and reserves (`SF43707`) are the
customary SIE identifiers; `SR16734` (IGAE) and `SL11295` (IMSS jobs) are best
guesses that the title check will confirm or reject on the first run. To look
an ID up without a full run:

```bash
BANXICO_TOKEN=... node scripts/mx-macro/fetch.mjs --probe banxico:SR16734,banxico:SL11295,fred:LRUNTTTTMXM156S
```

which prints the title, point count and last value each provider reports.
If a guess is rejected, find the right ID in the SIE catalog
(<https://www.banxico.org.mx/SieAPIRest/service/v1/doc/catalogoSeries>) and
edit `series.json`; the next run picks it up.

INEGI's Indicadores API returns no series name, so INEGI candidates should be
added only with IDs confirmed in the INEGI catalog (`"title": null` disables
the check for that candidate).

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
