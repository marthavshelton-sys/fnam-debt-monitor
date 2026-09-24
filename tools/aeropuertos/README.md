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
