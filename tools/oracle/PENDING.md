# Oracle model — pending items

## Needs the owner

| Item | Why | What to do |
|---|---|---|
| Press-sourced facts and failed guards only | Since 2026-09-24 the cloud routine publishes to main when a machine check stands behind the change (results and filings: both guards 0 failed; events: every fact primary-sourced; state: always). The only work it leaves unpublished is a branch `oracle/…` holding an event with a press-only fact or a quarter whose guard failed | Read the material-day email; open a pull request from the branch it names as "awaiting your review", or fix and merge it |
| Earnings-call transcripts | Management quotes, call-page comments, megawatts delivered, promises, quantified guidance before 3Q26 | Supplied for 1Q24–1Q27 plus the Sept-2025 business update and the Oct-2025 analyst meeting (private `oracle-model` repository, `Transcripts/`). After each results call, drop the new PDF into that folder; the routine's next run picks it up |
| FactSet connector | Section 06 peer multiples, section 04 peer rebasing, section 11 CDS spread, consensus next to guidance | Authorise the connector; data contracts: `tools/oracle/data/peers.json` (fields in `site/oracle/data/peers.js` header), `tools/oracle/data/cds.json` (`points` = [date, 5-year senior CDS mid in bp]), `tools/oracle/data/consensus.json` (revenue, EBITDA, EPS, target price, date) |
| Password (optional) | Internal working model | Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets: `ORACLE_PASSWORD` (Production and Preview). Dormant until set; see runbook §Access |

Done: `/oracle/` published from `main` (PR #32, 2026-09-23); `EDGAR_USER_AGENT` repository variable set; the
market/filings workflow runs twice every weekday and has succeeded on every run; the weekday review runs in the
cloud since 2026-09-24 ("FNAM Oracle: weekday review (cloud)", first run succeeded the same day with both
repositories mounted), so nothing depends on the owner's workstation; the desktop task is disabled as a fallback.

## Data backfill (public information, no owner input needed)

- Quarters before 2Q22 (the 20 quarters 2Q22–1Q27 are loaded; fiscal years now run FY2017–FY2026, the
  FY2017–FY2021 years at year level from the 10-Ks without Non-GAAP figures).
- Buildout: 1Q26 megawatts delivered were never stated; 4Q26 MW and Abilene 4Q26 GPUs are derived from
  management's ratios — replace with stated figures if Oracle publishes them (the IR slide decks from 4Q26 on).
- Price history before September 2021 (five years loaded).
- Headcount (10-K, annual) for the operating block.
- Full balance sheets (total liabilities, working-capital lines) and full cash-flow statements from the
  10-Q/10-K, beyond the highlight lines the releases print, so the balance-sheet equation can join the tie-out.
- Non-GAAP reconciling items for the FY2022–FY2024 quarters where the release printed them differently.
- Debt: confirm from the 1Q27 10-Q that the July-2026 notes (US$ 3,000 M) were repaid and drop them from
  `market_reference.json` → `debt_instruments`; add any issuance after 31 May 2026.
- Ratings: the Moody's (Jul-2025) and Fitch (Feb-2026) actions are cited to press articles (investing.com,
  StreetInsider); replace with the agencies' own rating-action releases when accessible (Moody's requires a login).
- Narrative facts drafted from the transcripts (executive summary, Comments, AI-buildout timeline) are
  source-cited but not machine-checked; the 338 parser checks and 329 tie-outs cover the statements only.

- Peer ratings (section 11): the peer table shows leverage only; add each agency's rating with its release URL to
  `peer_leverage.json` when the FactSet connector or the agencies' pages are accessible.
- Press sweep: `press.json` is refreshed by the desktop task "FNAM Oracle: weekly press sweep" on Mondays while the
  app is open; a cloud version would need the outbound network the cloud sandbox lacks.
- Unit economics (section 09): revenue per energized MW and the prepaid / BYOH / Oracle-funded split are marked
  "not derivable" / "not disclosed"; fill them only if Oracle discloses total energized MW or the RPO split by funding type.

## Page features still to build

- Segment / geography statements with the A-vs-B controls (Oracle reports segments in the 10-Q/10-K, not in the release).
- Glossary tooltips (the bilingual glossary is already in `reference.js`), "what changed since your last visit"
  banner, full accessibility pass, print layout verified in a real print dialog.
- Peer statements with the same model once the FactSet connector is live.
