# Monitor Macro México — fnam.mx/mx/macro

Bilingual (es-MX default / EN) Mexico macro dashboard: INPC inflation and its
components, real GDP and IGAE, unemployment and IMSS formal jobs, consumer
confidence, remittances, merchandise trade, the peso, Banxico's policy rate,
market rates and international reserves. One page, two languages, served at
`site/mx/macro/index.html` (`/mx/macro/en/` redirects to the English view).
Same visual system as the U.S. page at `/macro/`.

## How it stays current

`.github/workflows/mx-macro-refresh.yml` runs every day: at 12:25, 18:25 and
19:25 UTC on weekdays (INEGI releases at 06:00 Mexico City = 12:00 UTC;
Banxico's FIX and policy decisions land in the afternoon), at 15:25 UTC on
Saturday and Sunday (the sources publish nothing on weekends; the run catches
corrections and late postings), and on demand from the Actions tab. It:

1. runs `scripts/mx-macro/fetch.mjs`, which pulls every series in
   `series.json` into `data/series.json`;
2. runs `scripts/mx-macro/build.mjs`, which bakes that data into
   `template.html` and writes the page;
3. commits only if the data actually changed. Cloudflare Pages deploys the
   commit like any other.

After each refresh, `scripts/mx-macro/health.mjs` checks that a provider has
answered for every series within the last 7 days (`fetchedAt` only advances on
a successful fetch). If not - or if the run itself failed - the workflow opens
a GitHub issue labeled `mx-macro-health` (or comments on the open one, at most
once every ~20 hours), so a dead token or a changed API cannot make the page go
stale silently. The first healthy run afterwards closes the issue. Its title
starts with "SOURCE DOWN: MX macro", which is what the email routine below
looks for; only the opening of the issue is emailed, not the later comments.

## Material-change email alerts

After the build, `scripts/mx-macro/alerts.mjs` (main only) compares the latest
period of each tracked release with `data/alerts_state.json`. New periods that
cross a threshold become ONE issue per run titled "MATERIAL (MX): ...". Its body
reuses the page's own "At a glance" lines (English) for the affected views:
`scripts/mx-macro/exec_extract.mjs` runs the built page under Node with a
stand-in DOM and reads what `execSummary()` composes, so the wording is written
once, in the template. Non-material new periods only advance the state; a
missing state file is seeded from the data without sending anything.

Thresholds (edit them in `alerts.mjs`):

| Release | Material if… |
|---|---|
| INPC | headline or core y/y moves ≥0.2 pp, or headline crosses the 2–4% band |
| IGAE | m/m ≥1.0% either way, or y/y changes sign |
| GDP (FRED) | q/q negative, or q/q differs from the prior quarter by ≥1.0 pp |
| Unemployment | moves ≥0.3 pp |
| Consumer confidence | moves ≥2.0 points |
| Remittances | y/y ≥10% either way |
| Trade | monthly balance changes sign, or export y/y shifts ≥10 pp |
| Banxico policy rate | any change |
| Peso (FIX) | USD/MXN ≥2% in a day or ≥4% in 5 sessions (one alert per 7 days) |
| 10-year M bono | moves ≥50 bp month on month |
| 12-month inflation expectations | move ≥0.3 pp |

Delivery: the owner does not receive GitHub notification mail. The Claude
Routine "FNAM US Macro: email material changes" (14:45 and 20:45 UTC; Gmail
connector and this repository attached) emails every "MATERIAL (MX): " and
"SOURCE DOWN: MX macro" issue created since its previous run, in the same
message as the U.S. alerts. Test offline:
`node scripts/mx-macro/alerts.mjs --dry-run --state /tmp/s.json` (first run
seeds; edit the data copy passed with `--data` to simulate a release).

### WhatsApp alerts

Once the MATERIAL issue is open, `alerts.mjs` also sends the headline figures
and the Spanish link to the first affected section to WhatsApp through
`scripts/lib/whatsapp.mjs` (Meta WhatsApp Cloud API). It is best effort: without
the secrets nothing is sent, and a failed send is a run warning that never holds
back the state or the issue (the email still goes out). Only MATERIAL alerts are
sent; SOURCE DOWN issues are not.

One-time setup (Meta; https://developers.facebook.com/docs/whatsapp/cloud-api/get-started):

1. Meta Business account and a Meta developer app with the WhatsApp product.
   Register a sending number that is not in use on a personal WhatsApp account.
2. In WhatsApp Manager create a **Utility** template named
   `fnam_alerta_material`, language **Spanish (MEX)** (`es_MX`), body:
   `Alerta FNAM (macro México): {{1}}. Ver el tablero: {{2}} Mensaje automático.`
   Sample values: `Banxico policy rate 6.50% (-25 bp)` and
   `https://fnam.mx/mx/macro/?lang=es&view=banxico`. A body may not start or
   end with a variable. Wait for approval.
3. Create a System User with a permanent token that has
   `whatsapp_business_messaging` (the token shown on the API setup page expires
   in 24 hours).
4. Repository secrets: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (API setup
   page, not the phone number) and `WHATSAPP_TO` (recipient digits with country
   code, e.g. `52` + 10 digits; comma-separate several).
5. Actions > "Test WhatsApp alert" > Run workflow. A failure prints Meta's error
   message in the log.

Optional overrides (secrets or workflow env): `WHATSAPP_TEMPLATE`,
`WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_API_VERSION` (default `v23.0`). The
headline figures are the English ones used in the issue title.

A series that fails on a run keeps its last committed points (the page marks
that source "sin actualizar desde …"); a series that has never been obtained
is simply absent and the page hides the panels that depend on it, showing a
notice that lists what is pending. One bad feed never takes the page down.

**Required repository secret:** `BANXICO_TOKEN` — free and instant at
<https://www.banxico.org.mx/SieAPIRest/service/v1/token>. Without it only the
FRED fallbacks load (GDP, unemployment, trade, the exchange rate, reserves,
an interbank-rate proxy and the 10-year yield); the INPC and its components,
remittances, the target rate, TIIE and Cetes come only from Banxico.

**Recommended for IGAE and consumer confidence:** `INEGI_TOKEN` — free
registration at
<https://www.inegi.org.mx/app/desarrolladores/generatoken/Usuarios/token_Verify>.
INEGI's public developer API answers "No se encontraron resultados" for every
BIE (Banco de Información Económica) id, so the fetcher reads BIE series from
the service INEGI's own query builder (inegi.org.mx/app/indicadores) uses,
`interna_v1_3/API.svc/ExportacionBancoInformacion`. That service accepts the
developer token; without the secret the fetcher falls back to the token INEGI's
own page script carries, which INEGI can rotate at any time.

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

Official-source policy: every series' first candidate is an official Mexican
source (INEGI or Banxico); international mirrors (OECD/IMF via FRED) remain
only as fallbacks. Ids confirmed with the BIE search / Banxico titles on
2026-09-29: unemployment `444884` (ENOE national rate, seasonally adjusted),
GDP `736181` (quarterly real GDP, base 2018, seasonally adjusted levels),
exports `65649` / imports `65651` (merchandise trade FOB, seasonally
adjusted, millions of USD; originals `33860`/`33861` as first fallback),
10-year M bond `SF44071` (Banxico primary auction yield; auction months
only). IMSS formal employment (`imssJobs`) is a curated series kept in
`data/imss.json` — the one series that arrives by PR instead of an API,
because IMSS formal employment has NO scriptable official source. How the
file is filled (2026-09-30): each month's figures are read from IMSS's own
comunicado ("Puestos de trabajo afiliados al Instituto Mexicano del Seguro
Social", imss.gob.mx/prensa/archivo/YYYYMM/NNN) through a web search of
imss.gob.mx, and accepted only when IMSS's own printed changes reconcile to
the unit (level(M) − level(M−1) = the month's reported change; YTD and
12-month changes likewise). A level IMSS did not print directly but that
follows exactly from two printed figures is marked `"how": "derived"` with
the arithmetic in `calc`; every row carries its comunicado in `src`. Basis:
the monthly statistical comunicado, which from July 2025 includes the puestos
of digital-platform workers above the income threshold (not the Jul–Dec 2025
"afiliaciones asociadas a un patrón" headline, not the press-conference
figures that exclude platform puestos — Feb-2026: 22,691,750 vs 22,527,854).
June 2025 (comunicado 202507/329) could not be retrieved and is left blank,
not estimated; the page's monthly-change bars skip a missing month. The
monthly update runs as a Claude Routine with the prompt in
`imss-task-prompt.md`. Do NOT fetch imss.gob.mx from the runner or any
script: its Incapsula WAF answers scripted clients with "This page can't be
displayed" (it let one runner request through on 2026-09-30, then blocked),
and working around a site's bot protection is off limits. Audit of the
scriptable routes on 2026-09-29, all from the runner:
INEGI BIE carries only the series' cyclical component (214301/214302), not
the level; INEGI BISE / Banco de Indicadores searches return empty; Banxico
retired its IMSS cuadro (labor sector 10 lists none; the old SL series
answer 404); datos.imss.gob.mx sits behind an Incapsula WAF that blocks
non-browser clients (and its datasets are per-person microdata CSVs);
STPS publishes only interactive Cognos / Power BI viewers; Data México's
API (Secretaría de Economía) no longer resolves. The only viable path is
the BLS-weights pattern, now built: the `imss` provider in `fetch.mjs`
validates `data/imss.json` (months strictly ascending, values 15–40 million,
month-over-month change ≤ 2 million) and rejects a bad file while the page
keeps its previous data; the page shows the IMSS panels once the file holds
24+ months; `health.mjs` flags the series when its last data month is more
than 75 days old (one missed comunicado), instead of the fetchedAt rule that
would never fire for a local file.

Not yet sourced: industrial production and the INPC spending-purpose groups.

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
- **post** — `URL {json} ;; URL {json}` sends JSON POST requests (token
  placeholders substituted) and prints status and body; how the INEGI
  query-builder service was mapped.
- **catalog** — reserved; INEGI exposes no whole-catalog endpoint.

Locally the same flags work on `scripts/mx-macro/fetch.mjs` (`--search`,
`--probe`, `--url`, `--xlsx`, `--post`).

INEGI's export table carries the id, frequency and unit but no series name.
For an INEGI candidate the fetcher runs the BIE search with the candidate's
`search` query, takes the row whose id matches and checks the regex against
that row's full topic path; the query-builder metadata endpoint
(`MetadatoIndicador`: topic path plus indicator name) is the fallback.

The INEGI query-builder service, as the fetcher calls it (BIE is "tematica"
3 there, takes no geographic area and whole years as the date range):

```
POST https://www.inegi.org.mx/app/api/indicadores/interna_v1_3/API.svc/ExportacionBancoInformacion
{"areasGeograficas":"null","casoExportacion":"indicadorVertical","fechaInicio":"2010","fechaFin":"2027",
 "formato":"json","idioma":"es","indicadores":"737219","mostrarDecimales":"true","mostrarEstadistico":"false",
 "ordenaPeriodo":"ap","orden":"a","tematica":"3","token":"<INEGI_TOKEN>"}
```

The answer is a table: row 0 is the header (a "Periodos" cell, then one cell
per id with its frequency and unit), every other row a period ("2010/01")
followed by one value per id. Unknown ids and outages both come back as
HTTP 202 with `{"ErrorCode":"100","ErrorInfo":"No se encontraron resultados"}`.

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
- `../../scripts/mx-macro/alerts.mjs` — material-change alerts (issue queue for the email routine)
- `../../scripts/lib/whatsapp.mjs` — WhatsApp copy of MATERIAL alerts (Meta Cloud API); `.github/workflows/whatsapp-test.yml` sends a test
- `../../scripts/mx-macro/exec_extract.mjs` — reads the page's "At a glance" lines for the alerts
- `data/alerts_state.json` — last period evaluated per release, committed by the workflow
