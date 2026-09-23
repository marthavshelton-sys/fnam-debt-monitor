# scripts/oracle — data pipeline for the Oracle financial model (site/oracle)

| Script | Cadence | Reads | Writes |
| --- | --- | --- | --- |
| `fetch-market.mjs` | weekdays after the NYSE close (workflow `oracle-refresh.yml`) | Nasdaq historical API → Yahoo Finance → Stooq (first that answers) for ORCL; FRED `SP500` and `DGS10` | `tools/oracle/data/prices_orcl_daily.csv`, `prices_spx_daily.csv`, `treasury_10y.csv`, `market_reference.json` (price snapshot) |
| `harvest-filings.mjs` | weekday mornings (same workflow) and by the reviewing routine | SEC EDGAR submissions feed for CIK 0001341439 (8-K Item 2.02, 10-Q, 10-K); Oracle IR press-release RSS as fallback when EDGAR refuses the runner | `tools/oracle/raw/{8k,10q,10k}/` (earnings exhibits in full), `tools/oracle/data/state.json` (`pending_extraction`) |
| `validate-data.mjs` | after every change to the curated data | `tools/oracle/data/*.json` | exits non-zero on any tie-out failure; `tools/oracle/data/quality_report.json` |
| `test-parsers.mjs` | after every build | every archived 8-K exhibit in `tools/oracle/raw/8k/` | fails when any of 26 printed figures per quarter (statement of operations lines, EPS, share count, balance-sheet highlights) no longer matches `quarters.json` (transcription slip or release format change) |
| `build-data.mjs` | after validation | curated JSON + CSVs | `site/oracle/data/*.js` (`window.ORCL_FIN`, `ORCL_MARKET`, `ORCL_REF`, `ORCL_GUIDANCE`, `ORCL_COMMENTS`, `ORCL_SUMMARY`, `ORCL_PEERS`, `ORCL_CDS`, `ORCL_QUALITY`) |
| `build.mjs` | local convenience | — | runs validate → test-parsers → build-data in order |
| `merge-raw.mjs` (+ `merge-transcripts.mjs`, `merge-comments.mjs`) | bulk curation (backfills, new quarter drafted as `_raw_fy20xx.json`) | `tools/oracle/data/_raw_*.json` | `quarters.json`, `fiscal_years.json`, `guidance.json`, `dividends.json`, `sources.json`, `transcripts.json`, `comments.json` |
| `paths.mjs` | — | — | shared locations (`DATA`, `RAW`, `OUT`) so every script agrees on the layout |

No npm dependencies: everything uses Node 22 built-ins (`fetch`, `fs`). Run locally with
`node scripts/oracle/<script>.mjs` from the repository root. See `tools/oracle/README.md` for the runbook.
