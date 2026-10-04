# Hyperscaler Hub — runbook

Pages: `site/hiperescaladores/` (summary), `capacidad/` (module 1), `comprometida/` (2), `capex/` (3), `electricidad/`
(4), `sitios/` (5), `fuera-de-balance/` (6), `circular/` (7), `retorno/` (8, payoff and cost of money), `metodologia/`,
`glosario/`, and a data-quality page per module (`<module>/quality.html`). `/hyperscalers/*` redirects here. Phases 2–3 (modules 1, 2, 4, 5, 7) approved by the
owner on 2026-10-03 ("when in doubt, the SEC filings reign supreme").

Coverage (owner's choice, 2026-10-03): MSFT, GOOGL, AMZN, META, ORCL, CRWV (core) and NBIS, IREN, APLD, CORZ
(listed neoclouds), in `companies.json`. Public for now; the owner plans a password in a few weeks — copy
`functions/oma/_middleware.js` to `functions/hiperescaladores/_middleware.js` with its own secret.

## Pipeline

| Step | Script | Output |
|---|---|---|
| EDGAR poll (submissions + XBRL companyfacts) | `scripts/hyperscalers/fetch-edgar.mjs` | `data/xbrl/<T>.json`, `data/filings.json`, `data/state.json` |
| Build | `scripts/hyperscalers/build.mjs` | `site/hiperescaladores/data/{financials,changelog,status}.js`, `site/hiperescaladores/csv/*.csv`, `data/{metrics,changelog,derivations}.json` |
| Build modules 1, 2, 4, 5, 7, 8 | `scripts/hyperscalers/build-modules.mjs` | `site/hiperescaladores/data/{capacity,sites,power,circular,payoff,scope}.js`, module CSVs, `data/modules-log.json` |
| Validate | `scripts/hyperscalers/validate.mjs` | `site/hiperescaladores/<module>/data/quality.js` (eight modules) |
| Base map (one-off, npm packages) | `scripts/hyperscalers/build-map.mjs` | `site/hiperescaladores/assets/map-data.js` |
| Notes harvest (runner only) | `scripts/hyperscalers/harvest-notes.mjs` | `raw/notes/<T>/<accession>.json` |

Schedule: `.github/workflows/hyperscalers-refresh.yml`, daily 13:20 and 22:20 UTC; commits only when a value,
filing or note changed (`[skip actions]`). Dispatch with `mode=notes` (and `force_notes=true`) to re-harvest notes.
Three failed polls in a row open "SOURCE DOWN: Hyperscalers - EDGAR poll failing" (label `hyperscalers-health`).

From this sandbox `data.sec.gov` (submissions, companyfacts) answers; `www.sec.gov/Archives` refuses clients without a
contact in the User-Agent, so filing text is fetched only on the runner (`vars.EDGAR_USER_AGENT`). Never put the
owner's email in a User-Agent.

## Rules the code enforces

- Quarters from 10-Q year-to-date facts by subtraction (same tag); Q4 = FY − 9M. One tag per fiscal year (the
  candidate with most quarters), fallback quarters marked "mixed". Amazon's trailing-twelve-month facts are skipped by
  start date. Latest-filed value wins; earlier values go to the change log as restatements.
- Identity checks: Q1..Q4 = FY (US$2m / 0.2%), 3-month fact = YTD difference (0.5%), XBRL debt = FactSet debt (2%).
  Misses flag the figures "needs review" on the page; only missing extracts or non-USD facts fail the run.
- Outliers: a flow above 5× the median of the prior four quarters and above US$1bn → "needs review" (e.g., Alphabet's
  2026 common-stock proceeds tag, Oracle's equity proceeds).
- "Not tagged" (absent from XBRL) ≠ "Not disclosed" (searched in the text and absent). Never impute.
- Staleness: next period end + SEC deadline for the filer category (40/60 large accelerated, 45/90 others, 120 for the
  20-F) + 7 days, computed in the reader's browser.

## In-session refreshes (FactSet is not available in Actions)

After each 10-Q season (and after each earnings call for guidance):
1. FactSet Debt Capital Structure: `totals` for the ten tickers and `details` per company at its latest period end;
   save as `raw/factset/<YYYY-MM-DD>-debt.json` (same layout as the previous file; tranches issued since 2025-01-01).
   The newest file wins. Deals match a 424B fee exhibit within ±7 days and ±3% or stay "needs review".
2. FactSet guidance (`estimate_type=guidance`, `CAPEX`, ANN, relative 0–1): update `data/guidance.json`. Oracle's
   capex guidance is read from `tools/oracle/data/guidance.json` (the Oracle model's store) — keep them consistent.
3. Run build + validate, look at the quality pages, commit.

## Reader-facing rules added 2026-10-03 (owner's review)

- Summary "What to know" box (`site/hiperescaladores/app.js → whatToKnow()`): composed at page load from the module data;
  only T1 figures that are verified (text items) or quote-matched (flows), under 12 months old. A takeaway whose inputs
  are missing is dropped; never hand-write its text.
- 12-month rule (`HUB.aged/agedCell`): a value dated more than 365 days before today is grayed, dated, flagged and kept out
  of totals and KPIs. Capex guidance not updated for more than two quarters gets an amber age note.
- Cross-company sums use one calendar quarter (`HUB.calTTM`); the offset of May/August closes is printed with the figure.
- Capex / OCF prints "n.s." when OCF ≤ 0 or the ratio is above 500% (`HUB.capexOcf`). RPO is shown by company, never summed.
- Oracle T2 figures from earnings calls have no public URL (licensed transcripts): `build-modules.mjs` marks them `noUrl`
  and attaches the same-day 8-K Ex. 99.1 as `companion` (labeled as not containing the quote).
- Shared UI in `hub.js`: sortable headings, key-column toggle (`data-keycols` on a `.tblwrap`), jargon tooltips (first
  use per page; glossary anchors `g-*`), source cards that stay inside the viewport. Reader-facing text never shows
  repository paths (`HUB.plain`).
- Glossary and methodology carry a "Last reviewed" date: update it when you edit either page.

## Module 6 text items

`data/offbs.json` holds items read from the notes (leases not yet commenced, VIEs, JV debt, SPVs, RVGs, guarantees,
take-or-pay), each with filing accession, section, page and the quoted sentence; `status` stays `needs_review` until
a second reading of the cited page confirms the number (`verified`, `verifiedBy`, `verifiedOn`). Oracle's items are
read from `tools/oracle/data/obligations.json` (verified by the Oracle routine; page citation pending). `searched`
records items looked for and confirmed absent ("Not disclosed"). The look-through total is computed only when JV debt
has been read or confirmed absent; leases not yet commenced (undiscounted) are never added to present-value debt.

## Modules 1, 2, 4, 5, 7 (curated files)

| File | Module | What it holds |
|---|---|---|
| `data/capacity.json` | 1, 2 | Current MW (company definition in `definitions`), pipeline by stage (contracted / under construction / announced), companies with no MW (`notDisclosed`, with what was searched). Oracle's MW come from `tools/oracle/data/buildout.json` (T2). |
| `data/sites.json` | 5 | Sites the company names in a filing (T1); Oracle's from its store (T2). `lat`/`lon` = the locality the filing names, with `precision` (locality, county, state, country); never campus coordinates. A site whose location is withheld has no point. |
| `data/power.json` | 4 | `companyDeals` (T1 filings / T2 company or counterparty releases) and `grid` (T3 EIA, ERCOT, PJM, NERC; T4 LBNL, IEA) with `editionDate` and `nextExpected` (amber in the browser 30 days after it). Never mixed or summed. |
| `data/circular.json` | 7 | `flows` (from → to, type, amount and basis, accounting, citation), `concentration`, and FNAM `inferences` / `breakers`, each listing the flows it rests on (validator fails on an unknown id). |

Every T1 item cites `src.k` = `"<TICKER> <form> <period end>"` (a harvested filing in `raw/notes/`), `page` (use
`seqNN` when the filing has no printed number on that page) and `quote`. `build-modules.mjs` resolves the accession and
URL and checks that the quote appears on that page of the harvested text ("quote matched"; misses are listed on the
module 1 quality page). Items stay `needs_review` until a second reading (`verified`, `verifiedBy`, `verifiedOn`).
MW of different definitions are never summed; contract MW (power) are never added to data center MW.

Review cadence: after each 10-Q/10-K harvest and weekly for the T3/T4 grid sources (EIA STEO monthly, NERC LTRA
yearly, ERCOT/PJM as published). XBRL revenue (`revenue` tag, added 2026-10-03) feeds the revenue shares in module 7.

## Round 3 (owner's second review, 2026-10-04)

- **Summary page.** Opens with a one-sentence thesis (`app.js → thesis()`): three clauses, each linked to its module, each
  number T1 with its as-of date in the line beneath; a clause whose inputs are missing is dropped. "What to know" is five
  headline lines, each a `<details>` that opens to its detail. Line 2 compares leases signed but not commenced with the
  **undiscounted** payments of recognized leases (XBRL `LesseeOperatingLeaseLiabilityPaymentsDue` +
  `FinanceLeaseLiabilityPaymentsDue`) at the same date; a company without both is left out and named. Line 3 pairs operating
  and contracted MW only at the same date (CoreWeave's 10-Q for 30 Jun 2026 updates neither figure: searched). Line 5 is
  labeled "FNAM inference" and says why its flows (cash in a period, multi-year contract value, one year of revenue,
  cumulative commitment) are not netted. Then a reading-path box, the heat map (five signals, value and date in every cell,
  colour cuts in the stamp), "what changed this quarter" in words (technical log folded beneath), the results calendar, and
  separate core-six and neocloud tables.
- **Module 8 (`retorno/`, curated `data/payoff.json`).** Cloud segment revenue and margin (Alphabet/Amazon/Oracle 12 months =
  FY − prior YTD + current YTD, components cited), cloud revenue ÷ company capex, Microsoft's OpenAI revenue as the only
  quantified AI revenue, backlog timing (share within 12/24 months read from the text: the SEC API does not publish the
  dimensioned percentage), D&A ÷ capex and server useful lives with their reported earnings effect, capex per GW added
  (CoreWeave only), ratings and new-issue spreads from SEC-filed term sheets (FWP, read twice, T1) and later agency actions
  from dated press reports (T4 "third party"), implied cost of debt (interest paid ÷ average debt, net of capitalized
  interest), coupons since 2025 (FactSet). Refresh after each 10-Q season: re-read the segment, RPO and useful-life passages
  (the harvester keeps `segment`, `rpo`, `useful_life`, `depreciation`, `estimate_change`, `credit_rating` passages) and look
  for new FWPs (`data.sec.gov` submissions, form FWP).
- **Earnings calendar.** FactSet Calendar Events pulled in session → `raw/factset/<date>-calendar.json` (newest wins). The page
  flags the snapshot after 45 days and any date that passed without a new snapshot; the module 8 quality page warns too.
- **T4 capacity estimates** (`payoff.json → mwEstimates`): ABI Research (US active IT load) and Jefferies via Axios (North
  American controlled power footprint), shown beside "Not disclosed" in module 1 and in their own section; never in a figure.
- **Power bridge** (module 4, `payoff.json → powerBridge`): contracted GW × 8.76 × load factor (80%, range 60–90%), FNAM
  calculation, per company, not summed, apart from the T3/T4 grid cards.
- **Obligation stack** (module 6): debt (carrying), recognized leases at present value and undiscounted, reported total,
  JV look-through, then memo columns (not commenced, guarantees/backstops/RVGs at maximum exposure, VIEs, purchase
  obligations) that are never added. The chart compares the two undiscounted lease figures; debt sits beside them.
- **Scope differences** (`data/scope.json` → `scope.js`): figures that look alike across modules but measure different things
  (Core Scientific 590/395/195/377/152 MW; Oracle Jupiter 2.45 GW generation vs 1 GW campus; IREN Childress 750 MW grid vs
  company-wide operating MW; lease bases). Records carry `"scope": "<id>"`; pages show a "different scope ⓘ" button and the
  methodology page lists them all. Add a note whenever the same company, site or deal shows different MW in two modules.
- **Reader UI** (`hub.js`): one unit per page (US$ bn, GW); compact navigation with module numbers; previous/next links; a
  module title that states its conclusion and a "so what" line, both composed from data (`HUB.title`, `HUB.soWhat`);
  key-column view (about five columns) on every wide table; card layout on phones; one data-quality line per page instead
  of per-cell "needs review"/"Not tagged" badges (the cell is shaded, the reason is on hover and in the ⓘ card).
- **Caching**: `site/_headers` serves the hub's data, CSVs, `hub.js`, `hub.css` and page scripts with `no-store` (the zone's
  4-hour browser TTL overrides a `max-age=0`).

## Open items

- Register `hyperscalers` in `tools/watchdog/dashboards.json` once the first scheduled run has landed (registering
  before that makes the watchdog report "late").
- Text items in `offbs.json`: 24 of 25 verified on 2026-10-03 (second reading of the cited page in the harvested SEC text);
  Applied Digital's SPV amount (US$4.5bn) stays `needs_review` because it comes from FactSet, not the cited 10-K pages.
  Capacity and pipeline records in `capacity.json`: all 20 T1 records verified the same day. New items start as `needs_review`.
- CoreWeave active power: the 10-Q for 2026-06-30 states no active-power figure (searched); keep the 10-K figure until a
  filing updates it (`newerFilingSearched` on the record).
- Module 3 debt deals: 40 FactSet deals carry "needs review" because no 424B matches (144A notes and loans have none).
  Matching them needs an 8-K or offering-memorandum source; they stay FactSet-tier until then.
- Nebius quarterly figures come from 6-K press releases (no XBRL): T1-furnished text, to be added as curated items.
- Nebius's March 2026 agreement with Meta: amount on 20-F pp. 75–76 falls outside the harvested passage (flow `meta-nbis-2` shows "reading pending").
- Item 2 "Properties" of Microsoft and Oracle was not captured (upper-case heading); the harvester regex now matches it and the next `mode=notes force_notes=true` run will bring it in.
- Weekly T3/T4 review is done in-session; a scheduled Claude routine for it needs the owner's go.
- Module 8: Microsoft's S&P rating and CoreWeave's Moody's rating are not shown (no dated source read in session); Microsoft
  has no registered bond since 2017, so no term sheet. Daily market spreads have no public source; only new-issue spreads.
- Amazon reports its AWS backlog only as an amount and a weighted-average life (6.4 years), not a 12-month share.
