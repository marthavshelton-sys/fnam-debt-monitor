# Hyperscaler Hub — runbook

Pages: `site/hiperescaladores/` (summary), `capex/` (module 1), `electricidad/` (2), `fuera-de-balance/` (3), `circular/` (4),
`retorno/` (5, payoff and cost of money), `metodologia/`, `glosario/`, and a data-quality page per module
(`<module>/quality.html`). `/hyperscalers/*` redirects here; the retired `capacidad/`, `comprometida/` and `sitios/` addresses
redirect to the summary (`site/_redirects`). Phases 2–3 approved by the owner on 2026-10-03 ("when in doubt, the SEC filings
reign supreme").

Coverage (owner's choice, 2026-10-08): MSFT, GOOGL, AMZN, META, ORCL, in `companies.json → companies`. Until 2026-10-08 the hub
also covered CoreWeave (CRWV) and the listed neoclouds Nebius (NBIS), IREN, Applied Digital (APLD) and Core Scientific (CORZ);
see "Coverage narrowed (8-Oct-2026)" below. Public for now; the owner plans a password in a few weeks — copy
`functions/oma/_middleware.js` to `functions/hiperescaladores/_middleware.js` with its own secret.

**Module numbers in the dated sections below (rounds 3–5, open items) are the ones in force when they were written (1–8).**
Since 8-Oct-2026 the map is: old 3 → 1 (capex), old 4 → 2 (power), old 6 → 3 (off-balance-sheet), old 7 → 4 (circular),
old 8 → 5 (payoff); old 1, 2 and 5 (capacity, committed capacity, sites) are retired.

## Coverage narrowed (8-Oct-2026)

The owner removed CoreWeave, Nebius, IREN, Applied Digital and Core Scientific from the coverage (comparability: together they
spend about 6% of the five majors' capex, fund it with converts and equity, depend on one or two customers, two are former
bitcoin miners, two are lessors, Nebius has no quarterly XBRL). What changed:

- `companies.json` has `companies` (the five majors; no `group` field any more) and `counterparties` (the five removed
  names with CIK and `kind`). `fetch-edgar.mjs` polls the counterparties' submissions only (no XBRL); `harvest-notes.mjs`
  harvests their 10-K/10-Q/20-F; `build-modules.mjs` and `loadHarvest` load both lists, so Circular's flows keep their T1
  citations (the neoclouds' own filings). `build.mjs` builds financials for the covered companies only and filters the raw
  FactSet debt snapshot (tranches, totals, notes) to them; the previous build's values of a company that left the coverage
  are dropped from the diff base so the change log does not fill with "removed" entries (the curated log explains it).
- Modules 1 (capacity), 2 (committed) and 5 (sites) were retired: 7 of 7 operating-MW records, 13 of 14 committed records and
  29 of 36 sites belonged to the five. `capacity.json`, `sites.json`, `build-map.mjs`, `assets/map-data.js`, the three page
  folders, their quality pages, `data/{capacity,sites}.js` and the capacity/sites CSVs are gone; the Oracle T2 capacity and
  sites that lived there stay on the Oracle page. The power bridge (module 4, `payoff.json → powerBridge`), the T4 capacity
  estimates (`mwEstimates`), capex per GW (`capexPerMW`, CoreWeave only) and `ratingsSearched` left `payoff.json` and the pages.
- Curated files were filtered to the five majors: `power.json` (IREN's two deals and the neoclouds' `searched` rows),
  `offbs.json` (7 items), `not-tagged.json` (60 of 108 records), `outliers.json` (6), `deal-matches.json` (27 of 45),
  `guidance.json` (5), `scope.json` (the Core Scientific, IREN and Oracle Jupiter notes; the lease-basis note stays, module 3).
  `changelog.json` keeps only the covered companies' entries. The raw files (`raw/factset/*`, `raw/notes/<T>/`, `filings.json`,
  `state.json`) keep the five: the snapshot is a raw pull, and the notes are the quote-check base for Circular.
- Circular (module 4) keeps all 27 flows and the concentration rows; the five are nodes with `name` and `counterparty: true`,
  drawn dashed like OpenAI and Anthropic. A flow or concentration row "of" a counterparty is cited from that company's filing
  (T1 = SEC filing; the filer need not be covered). The summary's fourth "What to know" line lists the majors' capacity
  contracts at the counterparties (latest per pair, each on its own basis, never summed).
- Summary page: one thesis grouping (the five majors), four "What to know" lines (capex pace, leases, payoff, circular with
  the counterparty contracts), a three-column heat map (capex growth, capex/OCF, off-balance-sheet/recognized), one company
  table, five module tiles. The wording "core six / seis principales" became "the five majors / las cinco grandes" everywhere.
- The Oracle page's credit section reads the hub's `financials.js`; its caption now states the five-company coverage
  (`site/oracle/app.js → renderHyperscalers`, `tools/oracle/METHODOLOGY.md`).

## Review of 9-Oct-2026 (22 findings: 3 critical, 10 medium, 9 low)

Every fix sits in the generator or the curated files, so it survives the next rebuild. What changed:

- **Derived TTM figures (C1).** A `not-tagged.json` record with `derived: { kind: 'ttm', end, amountUSDm, ... }` is injected
  by `build.mjs` into the quarter's `ttm` when `derived.end` equals the quarter end (`q.ttm._derived` lists the keys; the ⓘ
  card prints the method and inputs). Alphabet's 2026 stock and preferred proceeds and Oracle's lease additions, debt,
  commercial paper, preferred and buybacks (FY to 31-Aug-2026) now enter the thesis and the leverage table on the same
  window as the tagged figures. The thesis adds an "equity" sentence for a company within cash flow that issued ≥ US$5 bn
  of stock in the window (`equityExtras` in `app.js`), and the capex page prints an equity note under the leverage table
  (net cash includes stock issued ≥ US$10 bn TTM).
- **Carried balances (C2).** A record with `carryForward: true` (Meta's finance-lease liability, tagged only in the 10-K)
  is carried into later quarters within 366 days (`q.d._carried`: key, date, accession, form); the lease KPI and the
  lease-adjusted net debt use it and say "finance leases at 31 Dec 2025 (10-K)". Meta recognized leases ≈ 29.8, lease-adj.
  net debt ≈ 23.2 (US$ bn) at 30-Jun-2026.
- **Registered offerings (C3).** `data/offerings.json` classifies each 424B by accession (`atm_program`, `common`,
  `preferred`, `debt`; cover quote, `classifiedOn`). `classify-offerings.mjs` (runner only, workflow step "Classify new
  424B prospectuses") reads the cover of every new 424B and adds entries with `method: 'cover-regex'`; it never changes an
  existing entry. The capex page prints a "Security" column and an ATM program as "up to … program ceiling, not proceeds".
- **Tag aliases (M1).** A `purchase_oblig` tag equal to a `leases_not_commenced` text item at the same date is labeled as
  leases (`out.tagAliases`; off-balance-sheet page). Superseded tags are grayed with the text item that replaces them (M2).
- **Coverage columns (M3).** `jv_equity_method_debt` has no XBRL stand-in; stand-ins print their date and the > 12-month
  flag; Oracle's unconsolidated-VIE search (none in the 10-Q to 31-Aug-2026) is a `searched` record in `offbs.json`.
- **Circular (M4–M6).** Every capacity contract per pair is listed ("plus", never summed); Amazon's second OpenAI tranche
  (US$21.3 bn, subsequent event in the 10-Q to 30-Jun-2026, p.12) is its own flow; `circOut.counts` carries T1/T2 (26 + 1:
  the OpenAI–Oracle flow cites earnings calls, T2); the Oracle/OpenAI concentration row prints RPO ÷ XBRL revenue.
- **Common window (M7).** Group sums keep the calendarized window (2026-Q2) and `offsetNote` states that Oracle's quarter
  to 31-Aug-2026 is used in the per-company figures. Held-up figures: capex TTM 566.37 vs 312.56 (+81%), capex/OCF 81.8%,
  lease KPI 292.6, FactSet deals 276.3.
- **Retired modules (M8).** Intentional (commit f0eae95, 8-Oct-2026, owner's choice; "Coverage narrowed" above). Notice in
  `data/notices.json` (shown in "What changed" for 100 days), methodology §07 `#retirados`, and `site/_redirects` sends the
  three old paths there. Not rebuilt.
- **Wording (M9).** No tool or file names in reader text: "stored filing text", "downloaded", "company-specific tag",
  "the review field"; the methodology's ingestion table names no runner, state file or commit marker. The glossary's static
  nav lists the five modules.
- **Implied cost of debt (M10).** Latest quarter with `ttm.interest_paid` and debt at both ends (Oracle: FY2026 from the
  10-K, 3,896 / avg(92,568; 129,541) ≈ 3.5%); "n.a." with the reason when interest paid is not tagged (Amazon).
- **Low findings.** Alphabet's backlog timing uses the Google Cloud RPO (513.9 of 519.5, 10-Q p.14) (L1); EIA's October
  STEO values and `check-steo.mjs` (workflow step "Check EIA's STEO edition", `data/steo-status.json`) flag a newer edition
  (L2); Alphabet's filing-dated power deals say "signed in …/as of … (10-K/10-Q)" and the PPA backstops sit apart (L3);
  Spanish counterparties, bilingual FactSet notes (`data/debt-notes.json`) and guidance sources (L4); calendar flags = SEC
  deadline, estimate untouched > 6 months, snapshot > 45 days; ratings keep the 12-month rule only (L5); calendar snapshot
  `raw/factset/2026-10-09-calendar.json` (Microsoft confirmed 28-Oct-2026) (L6); Amazon's FWP rating lines verbatim (L7);
  Amazon's 2026 capex guidance ≈ US$220 bn from the Q2 2026 call (licensed transcript, T2; FactSet's dataset still 200 on
  9-Oct-2026) (L8); ET timestamps were already in place (L9).
- The "about 6%" claim is sourced: the last build that included the neoclouds (8-Oct-2026, 13:37 UTC) had their TTM cash
  capex at US$33.8 bn vs US$586.4 bn for the five majors (5.8%; Nebius at 31-Dec-2025, no quarterly XBRL).
- Not changed (unverifiable from the sandbox): Microsoft's and Oracle's T4 rating actions (agency pages unreadable), FactSet
  values, call transcripts beyond Amazon's Q2 2026 call.

## Combined company view and the financing clause (8-Oct-2026, afternoon)

- **Module 1, section 02 (`capex/app.js → company()`).** The company selector's last option, "Las cinco grandes (suma) / Five
  majors (combined)", sums the same eleven lines by calendar quarter (`aggRows`, `aggVal`, `aggCell`): a calendar quarter is
  shown only once all five have reported cash capex for it (Oracle's quarter to August waits in section 03 until the others
  file); Oracle's February/May/August/November closes count in the calendar quarter ending a month later and the offset is
  printed in the ⓘ card. A line is summed over the companies that tag it that quarter, the cell shows "n/5" when fewer than
  five do, and the card names the missing company with its `not-tagged.json` reason (Meta's finance-lease additions are
  annual-only, so that line and "capex incl. finance leases" read 4/5 or 3/5). Derived lines sum each company's own
  derivation (never mixed inputs); capex / OCF is summed capex ÷ summed OCF of the companies with both. Every cell is tier
  "FNAM calc."; nothing is imputed.
- **Summary thesis (`app.js → thesis()`).** After "Amazon and Oracle spent more than their own", a third sentence says how
  the gap was financed, composed from the same calendar window's TTM cash-flow lines (`financing()`): debt issued (gross
  proceeds), common and preferred stock issued; a line the gap file explains as `none` is left out, a line not tagged in the
  window is named. Repayments and the source cards are in "What to know" line 1 (`finDetail`), the method in the thesis'
  source lines under "Sources and Methodology". The companies named above their cash flow are now judged in the same
  calendar window as the group ratio (`overIn(X)`), not each company's latest quarter, so one sentence states one window.
  `ttmSrc` says "full fiscal year from the 10-K" when the figure comes from `_fromFY` (Oracle's preferred stock).
- The summary's coverage paragraph dates its "about 6% of the majors' capex" to 8-Oct-2026: it is a static statement of why
  the neoclouds left, not a refreshed figure.

## Pipeline

| Step | Script | Output |
|---|---|---|
| EDGAR poll (submissions + XBRL companyfacts; submissions only for the counterparties) | `scripts/hyperscalers/fetch-edgar.mjs` | `data/xbrl/<T>.json`, `data/filings.json`, `data/state.json` |
| Build | `scripts/hyperscalers/build.mjs` | `site/hiperescaladores/data/{financials,changelog,status}.js`, `site/hiperescaladores/csv/*.csv`, `data/{metrics,changelog,derivations}.json` |
| Build modules 2, 4, 5 (power, circular, payoff) | `scripts/hyperscalers/build-modules.mjs` | `site/hiperescaladores/data/{power,circular,payoff,scope}.js`, module CSVs, `data/modules-log.json` |
| Validate | `scripts/hyperscalers/validate.mjs` | `site/hiperescaladores/<module>/data/quality.js` (five modules) |
| Notes harvest (runner only; covered companies and Circular counterparties) | `scripts/hyperscalers/harvest-notes.mjs` | `raw/notes/<T>/<accession>.json` |

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
1. FactSet Debt Capital Structure: `totals` for the five tickers and `details` per company at its latest period end;
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
- Glossary and methodology carry a "Last reviewed" date: update it when you edit either page. The date only: no "Changes on…"
  history beside it (owner removed both on 8-Oct-2026: simple and easy to read).

## Module 6 text items

`data/offbs.json` holds items read from the notes (leases not yet commenced, VIEs, JV debt, SPVs, RVGs, guarantees,
take-or-pay), each with filing accession, section, page and the quoted sentence; `status` stays `needs_review` until
a second reading of the cited page confirms the number (`verified`, `verifiedBy`, `verifiedOn`). Oracle's items are
read from `tools/oracle/data/obligations.json` (verified by the Oracle routine; page citation pending). `searched`
records items looked for and confirmed absent ("Not disclosed"). The look-through total is computed only when JV debt
has been read or confirmed absent; leases not yet commenced (undiscounted) are never added to present-value debt.

## Modules 2, 4, 5 (curated files; numbering since 8-Oct-2026)

| File | Module | What it holds |
|---|---|---|
| `data/power.json` | 2 | `companyDeals` (T1 filings / T2 company or counterparty releases) and `grid` (T3 EIA, ERCOT, PJM, NERC; T4 LBNL, IEA) with `editionDate` and `nextExpected` (amber in the browser 30 days after it). Never mixed or summed. |
| `data/circular.json` | 4 | `flows` (from → to, type, amount and basis, accounting, citation), `concentration`, and FNAM `inferences` / `breakers`, each listing the flows it rests on (validator fails on an unknown id). `nodes` carry `name` and `counterparty: true` for the five names outside the coverage. |
| `data/payoff.json` | 5 | Segments, backlog timing, useful lives, ratings and term sheets (see Round 3). |

Every T1 item cites `src.k` = `"<TICKER> <form> <period end>"` (a harvested filing in `raw/notes/`), `page` (use
`seqNN` when the filing has no printed number on that page) and `quote`. `build-modules.mjs` resolves the accession and
URL and checks that the quote appears on that page of the harvested text ("quote matched"; misses are listed on the
Circular quality page). Items stay `needs_review` until a second reading (`verified`, `verifiedBy`, `verifiedOn`).
Contract MW (power) are plant capacity or contract quantity, never data center IT load, and are never summed.

Review cadence: after each 10-Q/10-K harvest and weekly for the T3/T4 grid sources (EIA STEO monthly, NERC LTRA
yearly, ERCOT/PJM as published). XBRL revenue (`revenue` tag, added 2026-10-03) feeds the revenue shares in module 7.

## Round 3 (owner's second review, 2026-10-04)

- **Summary page.** Opens with a short thesis (`app.js → thesis()`): three sentences linked to their modules, each number
  T1; a sentence whose inputs are missing is dropped. Since 2026-10-08 (owner) the thesis carries no ⓘ (its figures open
  their cards in "What to know" and the KPI row) and the header holds only the thesis, the as-of row, "What to know" and the
  KPIs: the thesis' source lines (`#thesisMeta`), the coverage sentence, the sources line that opened the footer and the hub
  data-quality roll-up (`#dqRoll`, `HUB.dqRollup(id, { noLabel: true })`) sit in the page's last section, "Sources and
  Methodology" (`#sources`, `app.js → sources()`, `.srcmeth` in `hub.css`). Do not put them back in the header. "What to know" is five
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

## Round 4 (owner's third review, 2026-10-04)

- **"Verified" means what it says.** Every reader-facing "verified" now reads *automated quote-match plus a second AI read;
  not analyst-reviewed* (`HUB.VERIF`, `F.verification`, both languages). *Matched* stays the mechanical check (quote on the
  cited page, 424B total within 3%, XBRL vs FactSet within 2%). Human sign-off is a separate field: every curated item
  (offbs, capacity, sites, power, circular, payoff, not-tagged, deal-matches, outliers) carries `reviewedBy` (null until a
  person writes name and date) and `reviewedOn`; each page prints "analyst-reviewed: N of M" beside the verified share
  (`HUB.verifSummary`), and the quality pages carry an "analyst-reviewed" card.
- **Data-quality counts come from the data, not the DOM** (`HUB.dqModule`): per module, the figures shown, those that are
  verified or matched, those that need review, those not tagged in XBRL and unexplained, the explained gaps, the T2 statements
  and the T4 secondary sources, each with the list of items (`#dq` → "Item list"). The summary page rolls the eight modules up
  (`HUB.dqRollup`): hub-wide totals, the weakest module named and highlighted, and a table in module order (1 to 8; owner,
  2026-10-06) with every count linked to that module's list.
  The home line can never read 100% while a module carries an unresolved item.
- **Explained XBRL gaps** (`data/not-tagged.json`, 108 records, one per company × metric): `none` (the line does not exist
  for the company), `text` (figure read from the filing, shown from it with its date), `fy_only` / `ytd_only` (tagged only
  annually or year-to-date), `custom_tag` (company extension the SEC API does not serve), `not_disclosed` (searched, absent).
  Every record cites evidence; a quoted sentence is checked against the harvested page by `build.mjs` (`resolveCite`).
  `assumeZero: true` lets a `none` input count as 0 in a derivation (Nebius finance leases), marked `_zero` in the output.
  Cells render through `HUB.ntCell` (reason on hover, ⓘ card with the evidence) and are counted as explained, not as gaps.
- **Debt deals without a 424B** (`data/deal-matches.json`, 45 FactSet deals): matched to the SEC filing the EDGAR full-text
  index returns for the issue window (8-K, FWP, 6-K; `efts.sec.gov/LATEST/search-index`), and, where a harvested 10-K/10-Q
  page names the instrument, to that page with a checked quote. 144A notes, Swiss-franc notes and credit agreements have no
  424B; the 10-Q/10-K debt note is the SEC document that names them. Status `matched` / `needs_review`; the capex page shows
  the filing link and the method in the ⓘ card.
- **Quarterly outliers** (`data/outliers.json`): a flow more than 5× the median of the non-zero quarters among the four before
  it (and above US$1bn) is flagged "needs review" until read in the filing; a line that is starting (first dividend, first
  bond) has no baseline and is not flagged. A `confirmed` record (value within 0.5% of the derived quarter, quote checked on
  the harvested page) clears the flag and the cell shows "matched" with the quote; `reclassified` keeps the flag and explains
  it (Oracle's Q2 FY2026 common-stock proceeds: the FY2027 10-Q restated the comparative quarter to 0 under the tag, so the
  six-month figure lands in one quarter; the year still sums). The harvester keeps a `cash_flow` passage kind (cash-flow
  statement lines, at-the-market programs, note offerings, credit agreements) so these quotes can be checked, and
  `--accn=` harvests older quarters a record cites.
- **One timestamp per build.** `build.mjs` stamps `generated` (ISO) and `refreshedET`; `build-modules.mjs` and
  `validate.mjs` reuse that stamp instead of their own clock, so every page, footer and quality page shows the same ET
  minute. Curated files carry `updatedAt` (ISO) and pages print it through `HUB.curatedDate` (ET date); no UTC date is
  shown anywhere on the hub, and the methodology states the EDGAR poll times in ET.
- **Summary page.** Thesis in two sentences of at most 35 words: the core six (capex as % of operating cash flow, with a
  source card) and the names of the companies that spent more than their cash flow (Amazon, Oracle and the five neoclouds),
  whose gap is financed with debt and equity while a larger stack of signed obligations sits off the balance sheet (leases
  not commenced are future obligations, not a source of funds). Every number in the five "What to know"
  headlines opens its own ⓘ card (form, accession, page, quote; the thesis had them too until 2026-10-08); the detail sits behind the expander. Line 5 names the two
  documented concentration cases (CoreWeave: Microsoft 67% of 2025 revenue per the 10-K, largest customer 36% of Q2 2026
  revenue, unnamed in the 10-Q; Core Scientific: CoreWeave 77% of H1 2026 revenue) and says IREN, Nebius and Applied Digital
  give no per-customer share. Oracle T2 capacity figures stay out of the thesis and "What to know".
- **Module 8.** Segment definitions quoted from each 10-K beside the margins (`payoff.json → segments[].definition_*`,
  `definitionSrc`, quote-checked) with a note that the segments are not like-for-like; margin chart horizontal with value
  labels; ratings known only from press carry T4 with a "secondary source" badge and the agency page that was checked (the
  agency sites answer 403 to the session); capex per GW collapsed to a one-line note (CoreWeave only, with why the others lack
  it); useful-life table prints "Not disclosed" / "No change disclosed" instead of blanks; the implied-cost table carries an
  "as of" line (quarter ends and FactSet snapshot date); the FactSet earnings calendar dates are labeled "estimated by
  FactSet, not confirmed by the company" with the estimate's last-modified and pull dates; jargon (RPO, TTM, OCF, D&A, EBITDA,
  XBRL, bp, n.m.) is expanded on first use per page with a link to the glossary (`HUB.GLOSS`).
- **Phones (390 px).** Module navigation and the in-page jump links fold behind a toggle (`.nav-toggle`, CSS-only); heat-map
  cards separate label from value and give every ⓘ a 44×44 px hit area on coarse pointers; the sites map is hidden under
  600 px and the table cards take over; the home roll-up table stacks one block per module; long tokens wrap. Checked with
  `scratchpad/mobile.mjs` at 390, 360 and 512 px (250% desktop zoom): no horizontal scroll, nothing clipped.
- **Reading EDGAR from a session.** Since 2026-10-04 the session can fetch `www.sec.gov/Archives` primary documents (a
  declared User-Agent is required); `harvest-notes.mjs` runs in-session too. The EDGAR full-text index answers without
  snippets; `forms=8-K/A` breaks it.

## Round 5 (owner's fourth review, 2026-10-04)

- **No tool names in reader-facing text.** `build.mjs` writes `verification = { en, es }` ("automated quote-match plus a
  second automated read; not analyst-reviewed") and every page prints that string; both `js()` writers pass each object
  through `scrubProvenance()` (`lib.mjs`), which drops `verifiedBy`/`readBy` and leaves `verifiedHow: 'automated'`, so the
  curated JSON under `tools/` keeps its provenance and nothing in `site/` names a tool. FactSet rows read
  "FactSet snapshot, pulled <date ET>". `scratchpad/render.mjs` (Playwright, 11 pages × ES/EN × 1280/390/512 px) greps
  the rendered text for the forbidden words and fails on any.
- **Honest "verified".** `quoteCheckAccn(FILINGS, accn, page, quote)` in `lib.mjs` checks every item of `offbs.json`
  (and the `pageCites` overrides) against the harvested page text by accession: fragments split at "…", bracketed
  insertions ignored, page lists ("17–18", "121, 124", "124; 176th page (no printed number)") understood, and a
  spacing-insensitive fallback for words the harvest split ("fiscal 2027 a nd fiscal 2029"). An item keeps `verified` only
  when the quote sits on the cited page; otherwise it is demoted to `needs_review` with a `reviewNote_en/es` and a build
  warning. 28 of 28 pass as of 2026-10-04 (four quotes were made verbatim: CoreWeave's leases and VIE sentences completed,
  IREN's VIE sentence cited on its own page). Capex credit is split into quote-matched / XBRL tag-matched / value present
  (`dqNew`, `dqXbrl`, `dqKinds` in `hub.js`); not-tagged records carry `check` (quote | derived | xbrl_concept |
  quote_unmatched) and tag-checked gaps are counted as "tag-matched", never "verified". Coverage is stated two ways
  (`dqPct` → `pct` of figures with a value, `pctAll` with explained gaps in the denominator) and the home page carries the
  hub roll-up (`dqRollup`, ten columns). Of the 20 fillable gaps, 12 are filled (11 TTM derivations with inputs and
  zero periods under `not-tagged.json → derived`, 1 read from the 10-K text) and 8 carry a specific reason each.
  `reviewedBy` is still empty everywhere: "analyst-reviewed: 0 of N" is the truth until the owner signs an item.
- **Thesis.** One grouping (core six incl. CoreWeave; four listed neoclouds), three sentences of 35 words or fewer
  (shortened 2026-10-08: about 65 words in all, no ⓘ, one "Module 3" link for the two capex sentences),
  84% of the core six's "combined" cash flow (an aggregate) with Amazon, Oracle and CoreWeave named above OCF; `leaseCmp()` prints "about equal" for
  0.95–1.05x (Amazon 1.0x) and `capMult()` prints "more than 10x" when the operating figure is a rounded number in the
  filing (Applied Digital "approximately 100 MW").
- **Backlog.** `payoff.json → revenueBasis` (segment revenue for Google Cloud and AWS, company revenue otherwise) with a
  basis note; Amazon's US$496bn text RPO on the home KPI with the quote extended; Nebius in the lease comparison (8.8x);
  `oldQ()` adds the "> 2 qtrs" badge to any figure whose period end is more than two quarter-ends old.
- **Dates in ET.** `etOf()` in `lib.mjs`; `H.date()` converts ISO instants; `buildRow()` prints "Data rebuilt" (the build
  stamp) and "Last EDGAR poll" apart on every page; SEC deadlines from `filerDays()` (large accelerated 40/60, accelerated
  40/75, non-accelerated 45/90, 20-F 120) rolled by `rollBusinessDay()` over weekends and `SEC_HOLIDAYS`; the calendar
  flags a FactSet projection after the SEC deadline (IREN, Core Scientific) and an estimate untouched for six months;
  every curated file has `updatedAt` and the build warns when a curated file is newer than the stamp.
- **Sources.** Each off-balance item links the main document (`filing.url` from the harvest, `indexUrl` beside it) with
  its filed date; Oracle's prepayment is quoted from the cash-flow line (10-Q p. 5, `pageCites`); Microsoft's OpenAI
  commitment shows committed, funded and remaining; ratings stay T4 "secondary source" because the agency pages are
  unreadable from the session (`agencyChecked`, `alsoReported`, `laterActionsChecked` recorded in `payoff.json`).
- **Changelog.** The reader-facing log of curated edits (`curated-log.json`, `changelog.js → curated`, the list on the
  summary page) was removed on 8-Oct-2026 (owner: not necessary). Do not bring it back or keep an editorial log elsewhere
  on the hub; the technical XBRL change log (new, revised, restated values) stays.
- **Phones.** `data-fold` cards fold behind a button at ≤640 px (`foldM()`), chart legends sit above the canvas, bar charts
  turn horizontal when `H.narrow()`, every `.src-btn` is 44×44 px at ≤640 px, `#mapFallback` replaces the sites map, the
  jump-link bar wraps on desktop (methodology has 13 links) and no text is under 11 px. `render.mjs` reports zero
  flags (forbidden words, overflow, small text, small ⓘ at 390 px, undefined/NaN, console errors) on all 66 renders.

## Open items

- Text items in `offbs.json`: 19 of 19 quote-matched on their cited pages (`quoteCheckAccn`) as of 2026-10-08. New items start
  as `needs_review`.
- Module 1 (capex) debt deals: the FactSet deals without a 424B are matched to an SEC filing (`deal-matches.json`); Alphabet's
  3 Mar 2026 Swiss-franc notes rest on the 10-Q debt note.
- Quarterly derivation across a reclassified comparative (Oracle Q2 FY2026 common-stock proceeds): the build takes the
  latest-filed fact for every period, so a comparative restated under another tag misallocates a quarter without breaking
  the fiscal-year tie-out. A "same vintage" rule (derive a fiscal year's quarters from that year's own filings unless the
  year total is restated too) would fix it; it changes many derived values and needs the owner's go.
- `reviewedBy` is empty everywhere: no item has a human sign-off yet. The owner's initials and the date in that field are
  what turns "verified (automated)" into "analyst-reviewed".
- Circular: Nebius's March 2026 agreement with Meta: amount on 20-F pp. 75–76 falls outside the harvested passage (flow
  `meta-nbis-2` shows "reading pending"). The counterparties' filings keep being harvested for these citations.
- Item 2 "Properties" of Microsoft and Oracle was not captured (upper-case heading); the harvester regex now matches it and the next `mode=notes force_notes=true` run will bring it in.
- Weekly T3/T4 review is done in-session; a scheduled Claude routine for it needs the owner's go.
- Module 5 (payoff): Microsoft's S&P rating is not shown (no dated source read in session); Microsoft has no registered bond
  since 2017, so no term sheet. Daily market spreads have no public source; only new-issue spreads. The two press-sourced
  ratings (MSFT Aaa, ORCL BBB-) stay T4: ratings.moodys.com returns an empty page, spglobal.com 403 and fitchratings.com is
  blocked from the session; no 8-K or term sheet states them.
- `www.sec.gov/Archives` answered 403 to this session on 2026-10-04 (it answered on 2026-10-03), so the page recheck used
  the harvested text (`raw/notes/`) rather than the documents; the quote check is the mechanical substitute.
- Amazon reports its AWS backlog only as an amount and a weighted-average life (6.4 years), not a 12-month share.

### Reviewer notes never reach the page (6-Oct-2026)

The FactSet debt snapshot's per-ticker `notes` are copied into `financials.js → debt.notes`; `build.mjs` drops any sentence
that is a reviewer's instruction to itself ("needs review…", "verify in…", "pending…", `publicNote()`) before publishing,
so the facts stay and the working notes stay in the raw file. Every hub page carries `noindex` and Open Graph tags, and its
scripts load with `defer` (the methodology page keeps two blocking scripts: its inline scope-notes script needs them first).

### Module order on the home page (6-Oct-2026)

The data-quality roll-up table in the header lists the modules 1 to 8 (it opened with the weakest module, so the reader saw
6, 3, 8, 1, 2, 4…; owner's request); the weakest module is still named in the sentence above it and its row stays bold
(`.worst`). The curated change log prints the pages an edit touched in the hub's order with their module numbers
(`modList()` in `app.js`) instead of the raw slugs in the order they were typed. The rest of the page (navigation, the five
"What to know" lines, the reading path, the module tiles) was already sequential; filings and the calendar sort by date.
