# Oracle page — methodology and sources note

Companion to the page at https://fnam.mx/oracle/ (rebuilt 2026-10-03; round 2 on 2026-10-04: valuation integrity, missing analyses, reader flow). The page's methodology section is the short
version of this note; the data-quality page (`/oracle/quality.html`, unlinked) shows every check the pipeline ran.

## 1. Sources, in order of precedence

1. **SEC EDGAR, Oracle Corporation (CIK 1341439).** Forms 10-K and 10-Q (statements, notes on leases, commitments,
   debt, revenue/RPO), 8-K Item 2.02 with Exhibit 99.1 (earnings releases), 8-K Item 8.01 (other events), DEF 14A,
   424B prospectuses. Every figure cites the form, the period, the note or section name, the page (null for inline-XBRL
   filings, which have no fixed pagination; the note name is the anchor) and the accession number, with a link.
2. **SEC XBRL company-facts API** for the same filings in machine-readable form (`scripts/oracle/fetch-xbrl-facts.mjs`).
   Used for the capex and lease series and to machine-check the figures transcribed from the notes.
3. **Oracle investor materials:** earnings webcasts and the owner-supplied call transcripts (not republished; short
   attributed quotes with speaker and page), press releases on oracle.com. Anything management says is labeled
   *company statement, not audited*; guidance is labeled as guidance.
4. **Rating agencies' own releases** (S&P Global Ratings; Moody's and Fitch actions still cited to press until the
   agency release is reachable, see PENDING.md).
5. **Major wires and financial press** (Reuters, Bloomberg, Financial Times, Wall Street Journal; trade press only for
   site-level detail). A fact that rests only on press is labeled *press* and never enters a figure.

A source without a public URL (an owner-supplied call transcript) is cited as text, never as a link (`extLink()` guards
it; the validator and the render check fail on any empty, `undefined` or `null` href). Repository and tool paths never
appear in reader-facing text (validator and render check); the technical detail of the pipeline lives on the hidden
data-quality page.

Nothing is interpolated or estimated silently. Outside the DCF (§8, an editable model whose every input is shown), the
only estimate on the page (the present value of the uncommenced leases) is labeled *FNAM estimate, illustrative only*,
states every assumption and is never added to debt or a ratio.
"Not disclosed" is written where Oracle discloses nothing.

## 2. Organization, numbering and reader flow

`tools/oracle/data/sections.json` is the single registry of sections: order, bilingual titles, the data modules behind
each section, whether the board deck builds a page for it (`deck`; the deck follows this list's order since 2026-10-06) and, since 2026-10-04, the
`group` (`reference` = the collapsed Reference appendix), an optional `label` instead of a number (the Summary is
"Start here") and the reading `path`s that open the section (5 = five minutes, 20 = twenty minutes; the full path
opens everything). The page follows the story order — Start here, Contracts, Capacity, Capex, Funding,
Off-balance-sheet, Credit, Circularity, Multiples, DCF, Risks, News, Calendar — then the appendix (Statements,
Guidance, Analyst opinions, Methodology / provenance / glossary / change log, numbered R1–R4). `app.js` numbers sections, figures
(cards with a chart) and tables (cards with a table) from the DOM order at render time, builds the navigation and
the phone menu, and resolves every cross-reference (`ref('id')` in code, `{{sec:id}}` in the JSON narrative) to
"§NN Title". `present.js` titles its pages from the same registry, in the registry's order (the page's story order; the DCF
is page-only), choosing pages by section id, never by number, and opens with a contents page whose rows link to each section. The validator fails the build when a reference does not resolve, when
the DOM order differs from the registry, or when a hand-typed "section NN" remains.

Every section opens with a **lead**: a headline that states the takeaway and one line on what it means for
valuation, both composed at render time from the same figures as the charts (`sectionLeads()` in `app.js`), never
hand-written. Sections are **collapsed by default** except the Summary; the set of open sections is remembered in the
reader's browser, a deep link or a cross-reference opens its target, and a collapsed section still shows its lead.

## 3. Accounting hygiene

* **Fiscal year.** Oracle's fiscal year ends 31 May. 1Q27 = June–August 2026; FY2027 = June 2026–May 2027. Labels
  follow this everywhere (page, deck, data files).
* **Quarters from year-to-date.** Oracle prints the cash-flow statement cumulatively (3, 6, 9, 12 months). Discrete
  quarters are derived by subtracting the prior cumulative report, checked against the annual total, and checked a
  second time against the XBRL year-to-date facts derived by the same subtraction (`validate-data.mjs`).
* **Capex and finance leases.** Cash capex is `PaymentsToAcquirePropertyPlantAndEquipment`. Finance-lease additions are
  `RightOfUseAssetObtainedInExchangeForFinanceLeaseLiability` (supplemental cash-flow disclosure). Oracle does not tag
  the latter every quarter; missing quarters are shown as "not tagged", never interpolated. "Capital deployed" = cash
  capex + finance-lease additions, labeled derived. Operating-lease additions are shown but never added (not capex).
* **EBITDA** = GAAP operating income + cash-flow D&A. **Net debt** = notes payable and other borrowings − cash,
  equivalents and marketable securities. **EBITDAR** = EBITDA + operating lease cost.
* **RPO** is demand (contracted revenue not yet recognised). It is shown apart from cash (deferred revenue / customer
  prepayments, balance sheet) and from capacity (megawatts, sites section).
* **Amended filings.** The XBRL fetcher keeps the latest-filed value per period and records the superseded accession;
  the harvester tracks every accession it has seen; amendments (10-Q/A, 10-K/A) are listed on the quality page.

## 4. Off-balance-sheet financing and leases: the three views

* **Reported (US GAAP).** Net debt and net debt / LTM EBITDA from the balance sheet and income statement.
* **Lease-adjusted (ASC 842).** Adds the operating and finance lease liabilities already recognised (present value of
  the payments at Oracle's incremental borrowing rate, 5.7% weighted average at FY2026) to net debt, and the LTM
  operating lease cost back to EBITDA. Close to the rating agencies' adjusted leverage.
* **Look-through (ASC 810 and commitments).** Asks what Oracle is committed to beyond the balance sheet; nothing in
  this view is added as a liability. No consolidated variable-interest entity has been identified in the FY2026 10-K or
  the 1Q27 10-Q (a text reading, flagged *needs review* until a second reading). The FY2026 10-K (leases note, p. 90)
  discloses a guarantee of up to US$3.3 bn of a lessor's borrowing maturing September 2026: it is shown as a maximum
  exposure, never as a liability, and once its scheduled maturity passes the page says so until a filing reports its
  release. Leases signed but not yet commenced and purchase obligations are shown separately at nominal value. The
  developers' project debt (press-reported) is the developers', listed per site for reference only. The page composes
  these sentences from `obligations.json` (`vie`, `guarantees`), so the text cannot contradict the data.

Every figure in this section carries filing, note, page, accession and the verdict of a machine check
(`quality_report.obligationsVerification`): *verified (XBRL)* when the SEC's XBRL value for the same period matches within
US$1 M (a total may be checked as the sum of its tagged parts; a key may pool a concept Oracle re-tagged, e.g.
`LongTermNotesPayable` → `LongTermNotesAndLoans` in FY2027); *verified (release)* when the figure carries a custom tag and
is re-read from the archived 8-K earnings release instead (customer prepayments); *verified (tie-out)* for prospectus
terms recomputed from the document's own terms (preferred dividend, conversion rates); *text reading · review* only where
no XBRL concept exists for the disclosure (uncommenced leases, the lessor guarantee, VIEs); *mismatch* stops publication.

## 5. Timestamps, refresh and staleness

* Every section head shows **as of** (the period end or close date of the section's primary module), **refreshed** (the
  generation time of the module's data file, in Eastern Time; a file that records only a date shows the date, never an
  invented time) and a **STALE** flag when any module behind the section is stale. Since 2026-10-03 (owner's request to
  cut repeated captions) the stamp is written once per section; card footers repeat it only when the section is stale,
  so the flag still sits under every figure it affects. An optional module with no data yet (the CDS) is *pending*,
  never *current*.
* **Rules** (`tools/oracle/freshness.json`): a filing-driven module is stale once today is past the next expected
  filing date (Oracle's confirmed date, else the end of the window derived from the median release lag of the same
  quarter over three years, labeled *assumed*) plus 7 days; a daily module when its last refresh is older than its
  maximum age (market 5 days, news 3 days, FactSet 7 days, calendar and peer leverage 10 days). Evaluated on the
  server (`validate-data.mjs` → `quality_report.modules`) and again in the browser, so a halted pipeline never shows
  old data as current. Text-derived modules (leases note, buildout from the calls) carry the *text* badge.
* **Refresh cadence.** `oracle-refresh.yml` runs every day at 13:30 UTC (EDGAR submissions and XBRL facts, calendar,
  peer leverage, market) and weekdays at 21:45 UTC (market only); it commits only when data changed. A new 8-K,
  10-Q or 10-K is archived and marked pending; the weekday cloud routine extracts it, and nothing is published until the
  tie-outs and parser tests pass. News is swept daily by the cloud routine "FNAM Oracle: daily news sweep"
  (`NEWS-SWEEP-PROMPT.md`).
* **Change log.** `build-data.mjs` diffs every emitted data file against the one it replaces (generation stamps
  excluded) and appends each changed leaf to `tools/oracle/data/changelog.json`; the methodology section shows the last
  60 entries and the quality page the last 250.

## 6. News and recent events

`tools/oracle/data/news.json`: each item has a date, theme (financing, OCI contracts, power and sites, customers,
accounting and filings, leadership and governance), a one-line factual summary, why it matters for Oracle's financials,
and sources ordered primary first (SEC → company → agency → wire → press → trade). The validator checks the ordering,
that SEC-based items carry an accession number, that every source is https, and that no item is dated after the sweep.
No rumors or unattributed claims; the sweep prompt forbids them. When the latest item is older than the sweep date the
page says so in one sentence ("the sweep of <date> found no event between <day after the latest item> and <date> that met
the rules"); a manual in-session sweep records its scope in `news.json → sweep_note_en/es`, shown beside it.

## 7. Validation (every build)

Tie-outs of the statements (revenue and opex sums, operating/pretax/net income identities, EPS, debt and cash sums,
FCF, D&A, recasts, four quarters to the fiscal year), parser re-reads of 26 printed figures per archived release,
obligations identities, XBRL cross-checks (obligations, capex, operating cash flow, four quarters to the year),
news and sections checks, module staleness. 0 failures required to publish; warnings mean insufficient data to check.
Results: `tools/oracle/data/quality_report.json` → `/oracle/quality.html`.

## 8. DCF (its own section since 2026-10-03; round 2 on 2026-10-04; not in the board deck)

* **Frame.** Oracle fiscal years (June–May). The current fiscal year is a **stub**: the full-year projection less the
  quarters already reported (revenue, EBITDA, D&A, capex, prepayments), because their cash is already in the
  balance-sheet net debt. Ten explicit years by default (5, 7 or 10 selectable). Flows are discounted at **mid-period**
  to the latest close; the Gordon terminal value at the middle of the year after the horizon (an exit multiple at its end).
* **Basis.** *Consensus* (default): revenue, EBITDA, D&A (`DEP_AMORT_EXP`) and capex are FactSet fiscal-year means.
  Consensus EBITDA is the brokers' adjusted figure, which excludes **stock-based compensation**, so SBC (LTM share of
  revenue, from the Non-GAAP reconciliation) is deducted. *Management targets*: the fiscal-year revenue guide and the
  in-force FY2030 revenue target (`long_range_targets.json`) with a GAAP EBITDA margin (already net of SBC) and the
  consensus cost and capex ratios. After the years the basis covers, growth halves each year down to the terminal rate,
  margin and D&A hold, and capex/revenue converges linearly to the terminal ratio.
* **Scenarios (owner's, 2026-10-04; Bull rebuilt in round 3 and again in round 4 the same day).** *Base (consensus) = FactSet
  consensus as it stands*, and the page says so plainly with the figures it implies (at 2026-10-04: FY2028 revenue growth +45%,
  a 54% EBITDA margin after SBC from FY2030 held through the terminal year); it is the anchor the other rows are measured
  against. *Bear* = three documented adjustments to the consensus revenue path, in order: (1) RPO conversion slips one year
  (from the second explicit year revenue takes the prior year's consensus level; margin and D&A lag with it; the current year's
  capex stands because it is contracted); (2) Project Jupiter is two quarters late (its share of the named nameplate capacity ×
  half of the first incremental year after the slip moves to the following year); (3) OpenAI volume −25% (S&P estimates about
  half of RPO is OpenAI, so 12.5% of the incremental revenue above the last reported fiscal year is removed every year). *Bull*
  (round 4) = the same three levers set to the plan, in the same order, on a path that never exceeds management's in-force
  FY2030 revenue target: (1) RPO conversion runs one year ahead of the 10-Q schedule — from the second explicit year revenue
  takes the following year's consensus level; it is the same contracted volume arriving sooner, not more of it (RPO is the
  ceiling), so the target year is capped at the FY2030 target and from the year after the last consensus year the path rejoins
  the consensus level; margin and D&A lead with the revenue level (the mirror of the Bear's lag); (2) Project Jupiter on time
  (the consensus timing: the Bear's slip is not applied); (3) OpenAI volume at plan (the contracted volume in full: the Bear's
  haircut is not applied; nothing above plan is assumed). **Capex in both cases (round 4)** follows one rule: the contracted
  build plan (each year's consensus capex) stands and capex moves with the scenario's revenue difference against consensus at
  the model's terminal capex intensity (k × D&A ÷ revenue, about 15%, the intensity once the buildout is complete), so capex
  rises with revenue in every scenario while the current year's capex stays as guided. Holding each year's consensus
  capex/revenue ratio instead would charge the front-loaded buildout intensity (about 70% of revenue in FY2028) on revenue the
  plan's capacity already produces and would value the Bull below the Base (US$107 against US$112 at 2026-10-04); the page's
  recipe text says so, so the choice stays visible. The *management target* (the in-force FY2030 revenue target on the
  consensus cost structure: the target year's revenue is lifted to the target, later years keep the consensus growth ratios;
  margins, D&A and capex/revenue as consensus) is kept as a separate, fourth row. At 2026-10-04 (US$142.30 close): Bear US$77,
  Base US$112, Bull US$118, management target US$117 (round 3, at US$138.07 and the earlier capex rules: US$70 / 114 / 141 /
  120). The scenarios table shows value per share, the terminal-value share of EV, the WACC the price implies and the implied
  terminal growth for each, on the same cost of capital, taxes and lease treatment. Any manual change of the operating inputs
  makes the scenario *Custom* (the Base button is no longer highlighted and a Custom badge appears).
* **Customer prepayments.** The capex guide states gross capex and a cap on net cash capex; the gap is the share of
  gross capex customers fund in advance (24% for FY2027). Prepayments are received with the capex they fund and
  recognised as revenue **without new cash** over the contract term (6 years: Oracle's illustrative six-year 1 GW deal,
  analyst meeting 16-Oct-2025, p.10), including the prepayments already received (FY2026 and the current year to date,
  from the release cash-flow line). The share holds through the consensus years and fades to zero by the last explicit
  year; unwinds that fall after the horizon are discounted explicitly.
* **Taxes (2026-10-04).** The LTM effective rate (about 13%) is not a steady-state rate: the FY2026 10-K reconciliation
  (`tools/oracle/data/tax.json`, every line cross-checked against the SEC XBRL rate-reconciliation facts) puts it
  8.4 pp below the 21% statutory rate because of the excess tax benefit on stock-based compensation (−10.6 pp, which
  depends on the share price) and credits (−8.1 pp), partly offset by one-time items (enacted law +4.8 pp, unrecognized
  benefits +4.3 pp). The **normalized rate** is the federal statutory rate plus state taxes net of federal benefit
  (0.9 pp, the FY2025 line, the latest year the 10-K shows it separately) = 21.9%. Three modes: hold the LTM rate;
  **ramp** linearly from the LTM rate to the normalized rate by the last explicit year (default); normalized from year 1.
  The terminal year and the tax shield in the WACC use the terminal rate of the chosen mode. The tax note shows the
  value per share under all three.
* **Terminal year.** Capex is normalised to **k × D&A** with k = 1 + g × L / 2 (replacement plus growth for an asset life
  L = 6 years, Oracle's server life, 10-Q note 3): 1.09 at g = 3%. No customer funding in the steady state. The outputs
  show the cross-check between the two terminal methods: under the perpetuity, the terminal EV/EBITDA it implies (on
  the terminal-year EBITDA and on the last explicit year's); under an exit multiple, the perpetual growth it implies
  (g* = WACC − FCF(N+1) ÷ TV, holding the normalised terminal-year FCF).
* **Discount rate.** Rf = 10-year Treasury par yield, latest daily value (U.S. Treasury daily par yield curve, the series FRED republishes as DGS10; FRED is the fallback). The page, the deck and the validator print the value, its source and its date beside the figure (`ORCL_MARKET.rates.US10Y.source/asOf`, owner's rule 2026-10-05). ERP = Aswath Damodaran's implied ERP for the S&P 500
  (trailing 12 months, adjusted payout; posted on the first of each month and read by `fetch-market.mjs`; flagged when
  older than 45 days). β = OLS slope of weekly log returns of ORCL on the S&P 500 over two years (default), with
  cross-checks shown beside it: five-year monthly and the Blume-adjusted versions of both (0.67 β + 0.33); the table shows
  the WACC and value per share at each. Kd = today's Treasury + the issue spread of Oracle's most recent ~10-year fixed
  note over the Treasury on its issue date, applied to net debt and to the finance leases. The mandatory convertible
  preferred costs its 6.50% dividend rate with no tax shield. **Weights (2026-10-04)** use exactly the claims the bridge
  deducts: D = net debt + finance-lease liabilities + preferred at liquidation preference; E = market cap; the inputs
  card prints the components so the two definitions cannot drift apart.
* **Leases in the DCF (2026-10-04).** The bridge deducts the finance-lease liabilities already recognised (their cost
  sits below EBITDA) and not the operating-lease liabilities (their rent is in opex, inside EBITDA). FactSet publishes
  the EBITDA and capex the brokers submit on Oracle's reported statements; consensus capex is cash capex (≈ the gross
  guide) and excludes lease payments and finance-lease additions; FactSet does not state whether each broker's margin
  path carries the rent of the US$288 bn of leases signed but not yet commenced. The DCF therefore offers two
  treatments: *operating* (default: the rent is assumed inside the consensus margin, nothing deducted), *mixed* (round 3,
  2026-10-04: the finance share of the lease liabilities Oracle has recognized at the 10-Q date — finance ÷ (operating +
  finance), 21% at 31-Aug-2026 — applied to the illustrative present value; the only operating/finance mix Oracle
  discloses, used as the stated basis of a middle case) and *finance* (the full illustrative present value of the
  uncommenced leases, the same estimate as the off-balance-sheet section, is deducted in the bridge; if the consensus
  margin already carries that rent this counts the cost twice, so it is a floor, not a value). The "Leases in the DCF"
  note shows the three values per share, says which treatment the Summary verdict uses (the one on screen; operating by
  default) and ranks the lease swing against the other single switches on the page (Bear vs Base, one point of WACC, the
  tax mode), composed at render time; at 2026-10-04 the lease treatment moves the value more than any other single
  assumption (US$114 → US$59; US$102 on the mixed case). The Summary's verdict states the range (Bear to Bull, the
  management-target variant and the lease sensitivity), not only the Base number.
* **Equity bridge.** EV − reported net debt − finance-lease liabilities − the mandatory convertible preferred at its
  liquidation preference (until its conversion date) [− PV of the uncommenced leases under the finance treatment] =
  common equity, divided by **diluted shares**: the 10-Q cover count plus the dilutive securities of the latest quarter
  (diluted − basic weighted average, XBRL).
* **What has to be true (replaces the "bracketed" test, 2026-10-04).** A wide grid always brackets the price, so the
  section no longer reports that. It states what has to be true to justify the price: the WACC (and equivalent beta)
  the price implies holding the scenario's flows, and, at the model's WACC and at 9% and 8%, the uniform terminal
  margin shift, the multiplier on every explicit growth rate after the current year, and the terminal growth that each
  return the price (one assumption moved at a time, everything else held). The sensitivity grid stays as a reference.
  Since round 3 the Summary verdict and this box read the same helper (`priceNeeds()`): "the price needs a WACC of about
  X% (beta b)" plus the beta estimates on file whose value reaches about the price (within 3%: at 2026-10-04 the two
  Blume-adjusted betas, US$137 and US$141), never "justified only with".

## 9. Summary, sites and targets

* The summary ("Start here") opens with the **reading paths**, the **verdict** (one paragraph that says what the numbers
  add up to, composed at render time, closing with the scenario range and the lease sensitivity) and the **chain**: six numbers from contracts to valuation, each linking to its
  section (RPO and the 12-month share; MW energized of the GW named; the gross and net capex guide; the funding gap the
  company stated and the uncommenced leases, with the verification badge of the lease figure; the S&P rating and
  lease-adjusted leverage; the DCF value of the scenario on screen against the price). The drafted bullets follow, and
  *What to watch* is short lines grouped under headings. The summary carries its own date (`exec_summary.updated`); the
  date its events run through is derived by the builder from the latest news item (round 3; the drafted
  `events_through` is kept beside it as `draftedEventsThrough`), the validator fails the build when a cited source is
  dated after the summary, and the page counts the news items dated after the summary's own date.
* **Facts quoted in more than one place** (round 3) have one source of truth in `app.js`: `openaiTenants()` counts the
  campuses whose `tenant_openai` / `tenant_basis` fields in `buildout.json` say OpenAI is the tenant, split into *named by
  Oracle or the developer's own release* (4 of 5 at 2026-10-04) and *press only* (Project Jupiter: Oracle has not named
  the customer); the circularity table, its stat tile, the deck and the risk register (through the `{{fact:openai_campuses}}`
  token the narrative resolves at render time) all print that one value. `guaranteeStatus()` composes the lessor
  guarantee's status (past tense once the scheduled maturity has passed, until a filing reports its release);
  `maturedNote()` composes the status of instruments matured since the 10-K (repaid with the 10-Q evidence recorded in
  `market_reference.json → debt_instruments[].repaid_evidence`, or awaiting the next 10-Q). The next-results estimate shows
  the **median** of the prior three years' release dates (`calendar.json → estimates[].median`, with the dates); the end of
  the window only sets the staleness deadline. The hyperscaler comparison keeps the hub's definitions for Oracle's row and
  prints the model's figures beside them with the reason they differ (XBRL-tagged D&A vs the release cash-flow D&A; EBITDA
  vs EBITDAR), same date.
* **Dates are Eastern Time throughout** (round 3): a timestamp prints its ET date (`fmtDate`), "today" for countdowns,
  maturities and staleness is the ET calendar date (`todayET()`), and the builder dates its date-only stamps in ET, so a
  build at 01:09 UTC on the 4th never shows "Oct 4" next to an "Oct 3, 9:09 PM ET" refresh stamp.
* Each campus has an **Issues** list (`buildout.json → sites[].issues`): dated, typed, with basis (company, government,
  wire, press) and source; a named decision or delivery date is counted down and flagged once passed without an update.
  The **megawatt timeline** (contracted date, nameplate, energized and as-of quarter, expected first deliveries or
  revenue, sources) is drawn from the same records.
* Long-range targets (`long_range_targets.json`) are shown beside the reported actuals (the IaaS revenue headline of
  each release, re-read by the parser tests); superseded vintages are marked with the date and source that superseded
  them, never deleted.
* Ratings older than 12 months (`freshness.json → rating_action_max_age_days`) are flagged as aging on the page and in
  the deck.

## 10. Analyses added on 2026-10-04 (owner's round-2 list)

* **Sources and uses, FY2027–FY2030** (Funding section). Sources: operating cash flow (consensus free cash flow plus
  consensus capex, labeled derived) with the customer prepayments the DCF assumes as a memo line, the ATM equity
  completed in 1Q27, the remainder of the FY2027 plan Oracle stated, and the latest fiscal year's finance-lease
  additions as a non-cash memo. Uses: consensus gross capex, dividends (latest declared × 4 × cover shares, plus the
  preferred), and the principal maturing in each fiscal year from the 10-K debt footnote; interest sits inside
  operating cash flow. The funding need (−free cash flow + dividends + maturities) is reconciled with the company's
  US$20.1 bn gap and the three assumptions that explain the difference are stated (cash on hand, prepayments inside
  consensus operating cash flow, the company's figure being debt and equity rather than cash). Every row carries a
  consensus / reported / company / FNAM-calculation / estimate badge.
* **Counterparties** (Circularity section). Oracle names six OCI customers (AMD, Meta, NVIDIA, OpenAI, TikTok, xAI) in
  the free writing prospectus of 1-Feb-2026 (SEC) but no amounts; S&P's "about half of RPO" (rating action 9-Jul-2026)
  is the only public split and is the only one charted; contract sizes exist only in press reports (WSJ US$300 bn /
  4.5 GW for OpenAI; Reuters/CNBC about US$20 bn for Meta) and are shown as press, never as figures. The
  counterparty-capacity note (press figures on OpenAI's annualised revenue and funding rounds against the annual payments
  the press-reported contract implies) is labeled an FNAM estimate.
* **RPO-to-revenue bridge** (Contracts section). The 10-Q recognition schedule (12 months; months 13–36; months 37–60) is
  laid month by month onto Oracle's fiscal years with even recognition inside each bucket (stated assumption) and set
  against consensus revenue: already reported, contracted conversion, remainder to be contracted, coverage.
* **Oracle against the hyperscalers** (Credit section). Read from the Hyperscaler Hub's own data file
  (`site/hiperescaladores/data/financials.js`, SEC XBRL, T1) with the hub's definitions: TTM capex / revenue, capex /
  operating cash flow, RPO as tagged and RPO / TTM revenue, net debt / EBITDA and lease-adjusted net debt / EBITDA
  (leases already recognised, never the uncommenced ones). Oracle's row uses the same XBRL facts; its EBITDAR-based
  3.5× sits beside it with a cross-reference. The chart shows the core six; the neoclouds appear in the table only.
* **Glossary.** `tools/oracle/data/glossary.json` (bilingual definitions with first-use match patterns) feeds the
  table in the Reference appendix and `glossify()`, which wraps the first visible occurrence of each term in the main
  content in a definition tooltip (hover; tap on a phone).

## 11. Analyst opinions (Reference appendix, 2026-10-05)

* **What it is.** The sell side's view of Oracle by research house, kept apart from the model's own view (the DCF). Three
  layers, each labelled: (1) the research reports dated inside a 60-day window in the owner's research library (Dropbox:
  the `Current` folder holds the current month, earlier months sit under `Archives`), read in full in a Claude session and
  summarised in `tools/oracle/data/analysts.json` — thesis, valuation method, price target, rating, analysts, date, title;
  (2) the houses that FactSet StreetAccount's analyst summaries reported (rating, target and the basis the summary gave),
  shown as press tier with a "StreetAccount summary" badge; (3) FactSet's consensus — the current target statistics and
  rating counts from the daily FactSet file, and a dated weekly snapshot of the same series for the history chart.
* **Sourcing rules.** The reports are licensed material: the page carries FNAM's summaries and the houses' figures, never a
  republished page, and no report is stored in the repository; each entry names the house, the report and its date as text
  (no link). A target is `null` only when the report states none (a sector report that rates without a target, a credit note);
  credit research (Barclays, Morgan Stanley) is shown as credit, never as an equity target. Each house keeps its own rating
  wording; `rating_class` (buy = Buy, Outperform, Overweight; hold = Neutral, Sector Perform, Market Perform; sell; credit)
  only colours the chart. StreetAccount items never replace a report on file. "vs price" compares every target with the
  model's latest close; the price the house saw on its report date is printed beside it.
* **Validation.** Every date inside the window, bilingual text for every summary, known rating classes, positive targets,
  unique ids, the consensus history dated, ascending and with rating counts that add up (`validate-data.mjs`, tag
  `analysts`). The module `analysts` turns the section stale `window_days` after the sweep date (`freshness.json`).
* **Reading it.** The lead counts how many targets sit above the model's DCF base and sends the reader to the DCF's "what
  has to be true" box: the houses capitalise FY2028–FY2030 earnings on P/E multiples (or, at Goldman, 2030 net income
  discounted back), while the DCF discounts the cash the buildout consumes first. The page endorses no house.

## 12. Historical averages of the forward multiples, flow map and page conventions (2026-10-06, owner's review)

* **Peers table (Multiples section).** EV and EV/Sales were dropped. Beside each spot forward multiple (NTM EV/EBITDA, NTM P/E)
  the table prints its trailing **1-, 3- and 5-year averages** for Oracle and every peer, plus **ADTV**. The owner's reference
  is her Excel: `FE_VALUATION(PE | FFEV_EBITDA, MEAN, NTM4_ROLL, , -1AY|-3AY|-5AY, NOW)` averaged, and
  `P_VOLUME_AVG(-3AM,0) × AVERAGE(XP_PRICE_VWAP(0,-3AM,,,,USD))` for ADTV. The connector exposes neither FDS formula, so the
  model rebuilds them (`factset.json → hist_multiples_note`, `adtv_note`; routine steps g and k in `FACTSET-PROMPT.md`):
  weekly observations over the last five years (last trading day of each week); for each week, NTM P/E = FactSet close ÷ the
  NTM EPS consensus mean in force that week (FactSet Estimates, NTMA rolling, weekly frequency); NTM EV/EBITDA = (close ×
  FactSet shares outstanding + FactSet Fundamentals `FF_NET_DEBT` of the latest fiscal quarter ended on or before that week) ÷
  the NTM EBITDA consensus mean. Averages are simple means of the last 52 / 156 / 260 weeks (`y1/y3/y5`, weeks counted in
  `n1/n3/n5`); a week is skipped when an input is missing or the denominator is not positive. Same basis as the spot columns
  (broker-majority EPS, broker-adjusted EBITDA, lease-inclusive net debt). Stated differences from the Excel formulas: weekly
  instead of daily sampling, EV from FactSet net debt rather than FactSet's own enterprise-value series, and no point-in-time
  restatement (shares and net debt as later reported). ADTV = the mean of FactSet's daily turnover (volume × VWAP, USD) over
  the trading days of the last three months, in US$ million; the file also stores the owner's product-of-averages figure as a
  cross-check (they differ by under 1% for every peer on 2026-10-05). Spot prices are the latest completed session's close
  (the validator requires price_date within four days of the consensus date). The validator requires both blocks for Oracle
  and every peer (at least 48 / 140 / 230 weeks per window; at least 55 trading days for ADTV).
* **Nightly refresh.** The Claude Routine "FNAM Oracle: FactSet nightly refresh" runs every night at 7:58 PM New York time
  (owner, 2026-10-06), after the NYSE close, so the page shows that day's close and the consensus of the run date; a run
  that finds nothing changed (weekend, holiday) commits nothing.
* **Header.** Under the reported net debt / LTM EBITDA tile: the lease-adjusted net debt / EBITDAR (recognized operating and
  finance lease liabilities, EBITDA plus operating lease cost: `obligStats().leaseAdj`) linked to the off-balance-sheet
  section, and the commitment-inclusive ratio with the signed-but-uncommenced leases (`commit`), labeled exposure.
* **Circularity flow map.** An SVG map in the Hyperscaler Hub's module-7 reading, centered on Oracle (`circularFlows()` /
  `renderCircularMap()`): customers named in the FWP (no amount per customer; press sizes dashed and labeled press), the
  aggregate prepayments and deferred revenue (10-Q, XBRL), the executed funding plan (bonds, preferred, ATM equity), the
  purchase obligations (10-K), the signed leases to the named developers (10-Q total, nothing per site) and their project
  financing (press), plus the hub's filing-cited flows between Oracle's counterparties and their funders (Microsoft and
  Amazon with OpenAI). Width = the largest single amount on an arrow on a log scale, never a sum. The hub's data file
  (`/hiperescaladores/data/circular.js`) is loaded by the page; the map degrades to Oracle's own flows if it is missing.
* **Conventions.** Every heading is Title Case in both languages, applied at render time by `titleCaseHeadings()` (headings
  stay sentence case in the markup and render functions; a MutationObserver re-applies it when a heading is rewritten).
  English copy is American English (recognize, labeled, canceled, normalized, gray; dates as "May 31, 2026"); verbatim
  external headlines keep their original spelling.
