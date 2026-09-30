# Aeropuertos — data pipeline for `/aeropuertos/` and `/aeropuertos/trafico/`

Builds `site/aeropuertos/data/{traffic.js, summary.js, map.js}` from public statistics.

| Source | What | How to get it |
|---|---|---|
| AFAC — *Estadística operativa de aeropuertos* (https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404) | passengers, movements and cargo by airport and month since 2006, domestic + international, operator by year | the site blocks non-browser clients: open the page in a browser, paste `extract-afac-browser.js` in the console; it downloads `afac-agg.json` |
| AICM — *AICM en Cifras* PDFs (https://www.aicm.com.mx/categoria/estadisticas) | Mexico City's own monthly passengers, operations and cargo | download the latest monthly PDF plus the year-end PDFs into the work dir as `aicm-*.pdf`, then `python parse_aicm.py <workdir>` (needs `pip install pypdf`) → `aicm.json` |
| AIFA — numeralia on https://www.aifa.aero/ (home-page counters) | cumulative passengers, operations and tons since opening | copy the three counters and the date range into `raw/aifa.json` |

Then, with `afac-agg.json`, `aicm.json`, `aifa.json` and `sources.json` in the work dir (`airports.json` and `mexico-map.json` are read from this directory):

```
node compile.mjs <workdir> ../../site/aeropuertos/data
```

`airports.json` maps AFAC airport names to IATA codes, display names, state, operator group (GAP / OMA / ASUR / AICM / AIFA / OTROS) and coordinates.
If AFAC adds an airport, add it here and to the `META` string in `extract-afac-browser.js`.

`mexico-map.json` (state outlines plus projected airport positions) only needs rebuilding if the projection or the airport list changes:
`npm i d3-geo topojson-client topojson-server topojson-simplify`, download Natural Earth `ne_10m_admin_1_states_provinces.geojson`
(as `ne10-admin1.geojson`) and `world-atlas@2/countries-50m.json` (as `world-atlas-50m.json`) into the work dir, then `node buildmap.mjs <workdir> 0.1 620`.

Notes: AFAC counts passengers at each airport (arrivals + departures), so domestic trips count at both ends and the national total is
not "trips". The dashboard's "Company reports" basis reads `/gap/data/traffic.js`, `/oma/data/traffic.js` and `/asur/data/traffic.js`
at runtime and needs no step here.

## Hub page `/aeropuertos/` — tiles, tariffs table and chart stamps

- The three company tiles sit at the top of the page (compact: name, ticker, one-line footprint, "Open model" and the
  board-PDF link). The full description of what each model contains lives on the model pages, not on the tiles.
- **Tariffs and regulation** (`site/aeropuertos/data/regulation.js`) is hand-curated from the companies' own BMV/SEC
  releases and quarterly reports. Cells are short bullet lists (`es`/`en` arrays) and cite their filings by id
  (`src`); the filings are numbered once in `sources` and printed under the table with the `[n]` marks.
  `regulation.js` and `status.js` are `no-store` in `site/_headers`; still, bump the `?v=` on the hub's
  `<script src="/aeropuertos/data/regulation.js?v=N">` tag whenever the file's shape changes, so a phone that
  cached the old file under the zone's 4-hour browser TTL loads the new one with the new page.
  Figures are quoted exactly as the filings state them, in the constant pesos of each regulatory period (GAP Dec-2023
  tariffs / Dec-2022 investments, OMA Dec-2024, ASUR Dec-2022), so do not compare levels across groups. Update the
  cells when a new MDP is approved (GAP 2030, ASUR 2029, OMA 2031) or a quarterly report changes the "latest reading"
  row, and bump `updatedAt` (shown as "Reviewed <date>" in the section header).
  Every row shows the same year for the three groups (the tariff row says 2026). GAP and OMA publish a cap per year;
  ASUR publishes only its 2024 caps plus a 0.80% annual real efficiency factor, so its 2026 caps are 2024 × 0.992²,
  listed in the cell's `calc` and described in the bullet. Roll the row to 2027 in January. GAP's and OMA's investment
  tables are in thousands of pesos; the cells round them to millions.
- Airport count: the header, the chips, the operator strip and the map all use the airports with passengers in the last
  12 months (65 at Aug-2026). AFAC's workbook lists 66 (San Cristóbal de las Casas, idle since 2010, stays in it with
  zeros); idle airports are left off the map and named in the note under it. `airports.json` also holds the closed Terán
  airport (TGZ0), which only maps old AFAC rows onto Tuxtla (TGZ) and is never published.
- Map pointer: markers overlap (AICM and AIFA, Monterrey and Del Norte), so neither map uses per-marker hit circles.
  The pointer is resolved on the svg: the marker it sits most centrally in wins (distance / radius, small markers counted
  at their minimum reach); outside every marker, the nearest within that reach. Keyboard focus stays on each marker.

## Source links (`scripts/aeropuertos/verify-sources.mjs`)

`scripts/check-links.mjs` runs after every refresh but can only call gob.mx, GlobeNewswire, the airline IR sites and
SiteGround-protected PDFs (ir.oma.aero) "unverifiable", because they refuse plain scripts. To confirm them, dispatch
*Refresh airport traffic hub data* with `verify_links` ticked (nothing is refreshed or committed in that mode). The
script opens every external link of the three pages and of their data files in Chromium (then a headed Chrome under
xvfb), prints status, final URL and title (or the PDF check), and checks that each figure a tariffs-table cell quotes
appears in one of the filings the cell cites, showing the closest figure when it does not. `verify_args` takes `--dump`,
`--grep=[url-part::]regex` (no spaces or brackets) and extra document URLs to print in full. Last run 2026-09-29: all
links resolved; the check caught OMA's 1H26 MDP and strategic investments (Ps. 2,709 M, not 1,554 M).

## Airline page names and notes (`/aerolineas/`)

- Foreign cities and countries arrive from AFAC without accents and half in Spanish; `cities.json` gives each one its
  Mexican Spanish and American English name (`es`/`en`, `_countryNames` by ISO code), published in `routes.js`.
- Foreign carriers are shown by the name they fly under (`airlines.json` → `foreignNames`: regex on AFAC's label → name;
  unmatched labels are cleaned but keep AFAC's accents). Labels that map to one name are merged (MN Airlines is Sun
  Country's legal name); the page shows AFAC's label on hover.
- A Mexican carrier with no AFAC passengers in the latest month is marked (†) wherever it appears, with the month it
  stopped; `airlines.json` → `ceased` adds the reason, a one-line `brief` and the source (Magnicharters: AFAC suspension
  on Apr 14, 2026 and revocation on Jun 29, 2026).
- Every chart on the hub and on `/trafico/` and `/aerolineas/` carries a stamp: data month, when the source published the
  file (`sources.afac.published`, written by `compile.mjs` into `summary.js` and by `airlines-lib.mjs` into
  `airlines-summary.js`), when the data file was generated (`generatedAt`) and the last daily check (`status.js`).
  Dates are shown in CDMX time; ISO dates are parsed at noon UTC so they never shift a day.

## Daily automatic refresh (`.github/workflows/aeropuertos-refresh.yml`)

`scripts/aeropuertos/refresh.mjs` runs every day at 17:30 UTC on GitHub Actions (also on manual dispatch, and on pushes that
change the pipeline). It re-reads the three sources and rebuilds `site/aeropuertos/data/{traffic,summary,map,status}.js`:

| Source | How the script reads it | Raw input kept in `tools/aeropuertos/raw/` |
|---|---|---|
| AFAC workbook | the gob.mx page sits behind a proof-of-work bot challenge; headless Chromium (Playwright) opens it, waits for the challenge to clear (about 25 s), reads the `producto-aeropuerto-*.xlsx` link and downloads it in the same session; the pivot cache is parsed with SheetJS exactly as `extract-afac-browser.js` does | `afac-agg.json` (aggregates + `sourceFile`) |
| AICM PDFs | plain HTTP: the listing page gives the newest monthly PDF and the December editions; `parse_aicm.py` parses them | `aicm.json` (month → values) |
| AIFA counters | plain HTTP: the home page's "Fecha de los datos" range and the three counters | `aifa.json` |

`sources.json` records each source's file name and date (AFAC: the publication date in the file name; AICM: the day the file was
first seen, because the server re-stamps `Last-Modified` on every request; AIFA: the "as of" date of the counters).
`status.json` records the outcome per source (`updated`, `unchanged`, `failed: …`); it is published as `status.js` and the page's
Sources section shows the last check time and names any source that did not respond.

Safeguards: a source that fails keeps its stored raw input (the job stays red in the Actions tab but the page is never blanked);
the AFAC step refuses a workbook that ends earlier than the stored one, the AIFA step refuses counters that go down, and
`scripts/aeropuertos/validate.mjs` rejects non-contiguous months, implausible totals and month regressions against the previous
committed file before the bot commits. The workflow only writes `site/aeropuertos/data` and `tools/aeropuertos/raw`; the GAP /
OMA / ASUR models keep their own workflows.

If a source changes format: AFAC → adjust `parseAfacWorkbook` in `refresh.mjs` (field names in `OPT` / `TYPE`, pivot cache
layout); AICM → `parse_aicm.py` (row regex); AIFA → the label matching in `refreshAifa` ("Operaciones Aéreas", "Pasajeros
Transportados", "Toneladas Transportadas"). The manual route above (browser script + `compile.mjs`) still works as a fallback.

## "Next data release" line (`/aeropuertos/trafico/`)

The line under the national KPIs is computed in the page from the data files, so it moves by itself whenever the data is
refreshed: AFAC = the month after `lastMonth`, expected one month after `sources.afac.published` (the date in the AFAC file
name, set in `compile.mjs`); AICM = the month after the last AICM month, one month after `sources.aicm.updated`; GAP / OMA /
ASUR = the month after each group's latest monthly report, on the group's usual day (median day of its last twelve traffic
releases in `/<group>/data/traffic.js`). When a date has passed the line says "expected since … (pending)". Both dates come
from `tools/aeropuertos/raw/sources.json`, which the daily refresh maintains.


## Sources and page integrity (30-Sep-2026)

- **Airline networks**: route lists the airline itself publishes (Volaris and Viva stations feeds). Wikipedia is not an
  acceptable source, and AFAC's origin-destination file (`sase-*.xlsx`) has no airline column. TAR, Aerus and
  Magnicharters have no network on the map; their passengers and market share still come from AFAC.
- **Mexicana (30-Sep-2026)**: mexicana.gob.mx publishes its destinations (`/destinos`, one `/destino/<slug>` link each;
  slugs mapped to IATA in `MXA_SLUGS` in `airlines-refresh.mjs`, an unknown slug is logged in `status.json`) and loads its
  reservation system's city pairs (TTInteractive `BookingEngine/getCitypairs`: 418 one-way pairs, connections included,
  e.g. Zacatecas to every city). Mexicana flies from one base, AIFA (NLU), so its routes are the NLU pairs of that list whose
  other end is a published destination (`basis: 'hub'`); the page says the airline does not mark flights as nonstop. First
  run: 20 destinations (AIFA + 19), 19 routes, every one present in AFAC's corridor file with scheduled traffic in the
  last 12 months; Zacatecas is sold but not on the destinations page, so it is not drawn.
  `airlines-refresh.mjs` drops anything else from `raw/airlines/networks.json` on load. To add a carrier, find a route list
  on its own site that the runner can read, write a parser next to `parseVolarisStations`, and keep the `kind: 'routes'` /
  "stations feed" source convention.
- **Aeroméxico (30-Sep-2026)**: publishes no route list. Checked on the runner with `aerolineas-refresh.yml` → `probe`:
  `/us/destinations/route-maps` renders empty, the home page answers "Access Denied" to automated browsers, the
  `sitemap/vuelos-de-ciudad-a-ciudad` pages list 2,656 sellable city pairs including connections (Acapulco–Atlanta,
  Bogotá–Berlín) with no nonstop flag, and the route pages' fare feed (EveryMundo/airTRFX) has no stops field. Its Form
  20-F (FY2025) gives only counts (48 domestic, 51 international destinations, 25 of them in the US) and an image map.
  So its **US routes** come from the US DOT's **T-100 International Segment (All Carriers)** (BTS TranStats form
  `DL_SelectFields.aspx?gnoyr_VQ=FJE`, Mexico filter, one download per calendar year): segments carrier AM or 5D flew on
  scheduled service (class F), at least 8 departures in the latest 12 published months (BTS lags about three months).
  Carrier rows are cached in `raw/airlines/t100-am.json`; networks carry `basis: 't100'`, `period` and per-route
  `stats` (departures, passengers). Domestic and non-US routes are not drawn, and the page says so. First run: 45
  routes, 8 Mexican and 26 US airports (25 cities, New York counted once), July 2025–June 2026. The 20-F counts are in
  `airlines.json` (`reported`) and shown on the Grupo Aeroméxico card.
- **Chart.js** is served from `site/assets/vendor/chart.umd.4.4.0.min.js` (npm package, whose registry integrity
  sha512-vQEj6d…Q1hQ== npm verified on install) with an `integrity` attribute on every page that uses it (`/aeropuertos/trafico/`,
  `/aeropuertos/aerolineas/`, GAP, OMA, ASUR, Quálitas, Gentera, Oracle, `/fiscal/`, `/mx/fiscal/`; no page loads it from
  a CDN since 30-Sep-2026). Replace file and hash together in all ten pages when upgrading.
- `.chart-box .msg[hidden]{display:none}`: the message layer is `display:grid`, which overrides `[hidden]`; without this
  rule the hidden layer covered the canvas and blocked tooltips and legend clicks.
- **Operator sources on `/trafico/`**: GAFSACOMM and GATM are cited to their incorporation resolutions on
  diariooficial.gob.mx (13-Apr-2022 and 15-Sep-2022; runner check 30-Sep-2026: valid TLS, text confirmed). The earlier
  Cuenta Pública PDFs on cuentapublica.hacienda.gob.mx send an incomplete certificate chain (Node rejects it; Chromium
  recovers it), and www.dof.gob.mx aborts headless loads, so neither is linked. Per the resolutions, SEDENA put up 99% of
  GAFSACOMM's initial capital and ASA 99% of GATM's (majority shareholder); Mota-Engil is GATM's co-investment contractor
  at Tepic (ASA's contract, assigned to GATM on 15-Aug-2023; GATM 2023-2024 progress report, p. 8), not a shareholder.
- The "Updates" definition on `/trafico/` is composed from `sources.afac.published` (AFAC's file name) and
  `sources.aicm.updated` (the day our check first saw AICM's PDF), never a typed schedule.
