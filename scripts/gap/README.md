# scripts/gap — data pipeline for the GAP financial model (site/gap)

| Script | Cadence | Writes |
| --- | --- | --- |
| `fetch-market.mjs` | daily (workflow `gap-refresh.yml`) | `site/gap/data/market.js` — prices, dividends, USD/MXN, 10-year yields |
| `harvest-releases.mjs` | 6th/12th/18th/24th of each month | `tools/gap/raw/6k/*.txt`, `tools/gap/raw/manifest.json` (GlobeNewswire; `--source=sec` for EDGAR from a workstation, adds `companyfacts.json`) |
| `build-data.mjs` | after every harvest | `site/gap/data/financials.js`, `traffic.js`, `annual.js` parsed from the raw releases |
| `validate-data.mjs` | after every build | exits non-zero if a tie-out fails (balance sheet, cash flow, traffic sums) |

All scripts run on GitHub-hosted runners (they need outbound network access). Run locally with
`node scripts/gap/<script>.mjs`. See `tools/gap/README.md` for the update runbook.
