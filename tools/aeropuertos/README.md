# Aeropuertos — data pipeline for `/aeropuertos/` and `/aeropuertos/trafico/`

Builds `site/aeropuertos/data/{traffic.js, summary.js, map.js}` from public statistics.

| Source | What | How to get it |
|---|---|---|
| AFAC — *Estadística operativa de aeropuertos* (https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404) | passengers, movements and cargo by airport and month since 2006, domestic + international, operator by year | the site blocks non-browser clients: open the page in a browser, paste `extract-afac-browser.js` in the console; it downloads `afac-agg.json` |
| AICM — *AICM en Cifras* PDFs (https://www.aicm.com.mx/categoria/estadisticas) | Mexico City's own monthly passengers, operations and cargo | download the latest monthly PDF plus the year-end PDFs into the work dir as `aicm-*.pdf`, then `python parse_aicm.py <workdir>` (needs `pip install pypdf`) → `aicm.json` |
| AIFA — numeralia on https://www.aifa.aero/ (home-page counters) | cumulative passengers, operations and tons since opening | copy the three counters and the date range into the `aifa` block of `compile.mjs` |

Then, with `afac-agg.json`, `aicm.json`, `airports.json` and `mexico-map.json` in the work dir:

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
