# Oracle model — pending items

## Needs the owner

| Item | Why | What to do |
|---|---|---|
| Merge the `oracle-model` pull request | Publishes `/oracle/` on fnam.mx; GitHub only runs schedules on `main`, so the market/filings workflow starts with the merge | Review the PR (the Cloudflare Pages preview deployment of the branch shows the page), merge |
| `EDGAR_USER_AGENT` repository variable | The SEC asks every automated client for a descriptive User-Agent with a contact | GitHub → Settings → Secrets and variables → Actions → Variables → `EDGAR_USER_AGENT` = `Your Name your@email` |
| Create the weekday reviewing routine | Extracts new quarters into the model, drafts the Comments column, updates reference facts, emails on material days — all via pull requests | `tools/oracle/ROUTINE.md` (a Claude scheduled task; no API key or mail provider needed) |
| Password | Internal working model | Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets: `ORACLE_PASSWORD` (Production and Preview). Dormant until set; see runbook §Access |
| FactSet connector | Section 06 peer multiples, section 04 peer rebasing, section 11 CDS spread, consensus next to guidance | Authorise the connector; data contracts: `tools/oracle/data/peers.json` (fields in `site/oracle/data/peers.js` header), `tools/oracle/data/cds.json` (`points` = [date, 5-year senior CDS mid in bp]), `tools/oracle/data/consensus.json` (revenue, EBITDA, EPS, target price, date) |
| Earnings-call transcripts | Quantified guidance before 3Q26; management quotes per line item | Supplied for 1Q24–1Q27 plus the Sept-2025 business update and the Oct-2025 analyst meeting (private `oracle-model` repository, `Transcripts/`). Missing: the 4Q24 (June 2024) and 1Q25 (September 2024) calls. After each results call, give the PDF to the routine's next run or to a Claude session |

## Data backfill (public information, no owner input needed)

- Fiscal years FY2016–FY2021 from the 10-Ks (FY2022–FY2026 and 20 quarters 2Q22–1Q27 are loaded).
- Price history before September 2021 (five years loaded).
- Headcount (10-K, annual) for the operating block.
- Full balance sheets (total liabilities, working-capital lines) and full cash-flow statements from the
  10-Q/10-K, beyond the highlight lines the releases print, so the balance-sheet equation can join the tie-out.
- Non-GAAP reconciling items for the FY2022–FY2024 quarters where the release printed them differently.
- Debt: confirm from the 1Q27 10-Q that the July-2026 notes (US$ 3,000 M) were repaid and drop them from
  `market_reference.json` → `debt_instruments`; add any issuance after 31 May 2026.

## Page features still to build

- Segment / geography statements with the A-vs-B controls (Oracle reports segments in the 10-Q/10-K, not in the release).
- Glossary tooltips (the bilingual glossary is already in `reference.js`), "what changed since your last visit"
  banner, full accessibility pass, print layout verified in a real print dialog.
- Peer statements with the same model once the FactSet connector is live.
