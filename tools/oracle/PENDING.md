# Oracle model — pending items

## Needs the owner

| Item | Why | What to do |
|---|---|---|
| Press-sourced facts and failed guards only | Since 2026-09-24 the cloud routine publishes to main when a machine check stands behind the change (results and filings: both guards 0 failed; events: every fact primary-sourced; state: always). The only work it leaves unpublished is a branch `oracle/…` holding an event with a press-only fact or a quarter whose guard failed | Read the material-day email; open a pull request from the branch it names as "awaiting your review", or fix and merge it |
| Earnings-call transcripts | Management quotes, call-page comments, megawatts delivered, promises, quantified guidance before 3Q26 | Supplied for 1Q24–1Q27 plus the Sept-2025 business update and the Oct-2025 analyst meeting (private `oracle-model` repository, `Transcripts/`). After each results call, drop the new PDF into that folder; the routine's next run picks it up |
| FactSet connector | Valuation Context peer multiples and peer rebasing, Financing and Balance Sheet CDS spread, consensus next to guidance | Authorise the connector; data contracts: `tools/oracle/data/peers.json` (fields in `site/oracle/data/peers.js` header), `tools/oracle/data/cds.json` (`points` = [date, 5-year senior CDS mid in bp]), `tools/oracle/data/consensus.json` (revenue, EBITDA, EPS, target price, date) |
| Analyst opinions refresh | Reference R3 is a dated in-session sweep (60-day window; stale 60 days after `as_of`) | Re-run `ANALYSTS-SWEEP-PROMPT.md` in a session with the Dropbox and FactSet connectors after each results cycle, or create a monthly Routine with both connectors and that prompt. Equity notes from Morgan Stanley, JPMorgan, Jefferies, Evercore and Mizuho were not in the library; the deck has no analyst page (`deck: false`, owner's call) |
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
- Debt: the July-2026 notes (US$ 3,000 M) are marked `status: repaid` in `market_reference.json` → `debt_instruments` with the
  1Q27 10-Q evidence (XBRL RepaymentsOfDebt US$ 4,202 M in the quarter; notes payable 129,541 → 125,337); they stay in the
  list because the book reconciles to the 10-K gross total at 31 May 2026. The 10-Q does not itemize this note, so the page
  calls the repayment *inferred* from those two figures and links the filing (round 4, 2026-10-04; a full-text read of the
  10-Q from this sandbox found no sentence naming the note or a US$3.1 bn scheduled repayment). Still to do: add any issuance
  after 31 May 2026 from each 8-K, and re-base the book on the FY2027 10-K when it is filed.
- Ratings (corrected 2026-10-09): Moody's affirmed Baa2 with the outlook still negative on 2026-02-02 (release 458628; the
  negative outlook dates from 2025-07-28) and Fitch affirmed BBB/F2 Stable on 2026-02-02 (the release URL carries the date);
  both now link the agencies' own pages, which are script-rendered (verified on dated copies: Newsquawk, StreetInsider,
  Investing.com). Last check for a new action: 2026-10-09 (`market_reference.json → credit_ratings.checked`, shown in the
  credit section's source line): none since S&P's 9-Jul-2026 downgrade; no Oracle 8-K since 14-Sep-2026.
- Narrative facts drafted from the transcripts (executive summary, Comments, AI-buildout timeline) are
  source-cited but not machine-checked; the 338 parser checks and 329 tie-outs cover the statements only.

- FactSet (connected 2026-09-27): consensus, prices, market values and peers' net debt now flow through `factset.json`
  (cloud routine "FNAM Oracle: FactSet refresh"). **CDS still pending**: the connector exposes Estimates, Global Prices,
  Fundamentals, Debt Capital Structure and Terms & Conditions, but no CDS or bond-price endpoint; ask FactSet whether the
  Bond Prices / CDS content sets can be added to the connector, then fill `cds.json` from the routine. Since 2026-10-05 the
  card shows the BBB index proxy (FRED `BAMLC0A4CBBB`, owner's choice, labeled "proxy, not Oracle") with the latest press
  reading linked from the news file; the CDS chart and implied-PD stats replace it automatically once `points` is filled.
- Peer ratings (Off-Balance-Sheet Financing and Leases, peer leverage table): the peer table shows leverage only; add each agency's rating with its release URL to
  `peer_leverage.json` when the FactSet connector or the agencies' pages are accessible.
- News (round 4, 2026-10-04): the Tencent lease (FT, 30 Sep; US$7 bn, five years, about 100,000 chips, about 30% upfront) is on the
  page as *press-reported, unconfirmed*; it enters no figure (not the RPO, not the counterparty table, not the DCF prepayments)
  until Oracle files or confirms it. The Port Washington grid timing (Aterio via The Register, 2 Oct) is a press item and an
  open issue on the campus; Oracle's 2H 2027 target stands as the company statement.
- News: since 2026-10-03 `news.json` is refreshed daily by the cloud routine "FNAM Oracle: daily news sweep"
  (`NEWS-SWEEP-PROMPT.md`); the weekly press sweep (documented as a desktop task, prompt in `PRESS-SWEEP-PROMPT.md`) was never created in the
  owner's apps (checked 2026-10-05: not among her cloud routines, no desktop task, no commit by it), so there is nothing to
  disable; `press.js` is retired. `press.json` stays in the repository as the archive of the earlier in-session sweeps.
- US$288 bn of uncommenced leases: no XBRL concept carries the amount (SEC company-facts API searched 2026-10-04; only
  `CommitmentsAndContingencies`, without a value), so the figure rests on the two readings of the note and keeps the "text ·
  second reading" badge; re-run the search after each 10-Q in case Oracle adds a custom tag.
- Obligations provenance: `page` is null for every note (Oracle files inline XBRL without fixed pagination); the note
  numbers in `obligations.json → sources.10q_1q27.notes` follow the FY2026 10-K order and need a re-read of the 1Q27 10-Q.
  VIE/SPV: searched 2026-10-09 (EDGAR full-text search of the FY2026 10-K and the 1Q27 10-Q for "variable interest" and
  "special purpose": 0 hits; control phrases hit both filings), so the row now reads "searched · none disclosed (date)";
  re-run after each 10-Q (`obligations.json → vie.search`). Guarantees stay a text reading flagged *text · review*.
- Unit economics (AI buildout): revenue per energized MW and the prepaid / BYOH / Oracle-funded split are marked
  "not derivable" / "not disclosed"; fill them only if Oracle discloses total energized MW or the RPO split by funding type.

## Owner's decision pending (ideas proposed 2026-10-03, not built)

- 2026-10-07 (resolved 2026-10-09): the duplicate "FactSet consensus" button was removed in the institutional review; one
  "Base case (FactSet consensus)" button remains. Still open: if a Base case of FNAM's own is wanted (its own growth, margin
  or capex path kept apart from consensus), it needs a data definition (`reference.js → dcf`) and the Reset button would
  return to it instead.
- **2026-10-09, Bull scenario (owner's decision needed; review finding M3).** The Bull (US$118) and the management target
  (US$117) sit within a dollar because both are capped at the FY2030 target of US$225 bn and the Bull rejoins consensus after
  FY2030; the page now explains this under the scenarios table. Two ways to separate them, neither built because both need a
  judgment call: (A) merge the Bull into the management-target row (three scenarios: Bear / Base / Management target as the
  upside), or (B) let the Bull run above consensus after FY2030 on a sourced basis, for which the only candidate on file is the
  long-range targets Oracle will present at the Investor Day of Oct 28, 2026 (`long_range_targets.json`); a Bull built on the
  current FY2030 target's CAGR (31%) extended past FY2030 would be an FNAM assumption, not a source. Until she decides, the
  four rows stay as built on 2026-10-04.

Interest coverage and cash interest (XBRL, easy); depreciation vs capex with a server useful-life sensitivity (10-K
policy note, medium); Form 4 insider transactions (EDGAR, easy); rating-agency lease-adjusted leverage replicated
(agency methodology, medium); "what changed since your last visit" banner (reuses the change log, easy); short interest
(FINRA, medium); TRACE bond spreads and interconnection queues (not recommended).

## Page features still to build

- Segment / geography statements with the A-vs-B controls (Oracle reports segments in the 10-Q/10-K, not in the release).
- "What changed since your last visit" banner, full accessibility pass, print layout verified in a real print dialog.
  (Glossary tooltips: done 2026-10-04, first-use definitions from `glossary.json`.)
- Peer statements with the same model once the FactSet connector is live.
