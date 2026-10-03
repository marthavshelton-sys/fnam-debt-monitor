# Oracle page — methodology and sources note

Companion to the page at https://fnam.mx/oracle/ (rebuilt 2026-10-03). The page's methodology section is the short
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

Nothing is interpolated or estimated silently. Outside the DCF (§8, an editable model whose every input is shown), the
only estimate on the page (the present value of the uncommenced leases) is labeled *FNAM estimate, illustrative only*,
states every assumption and is never added to debt or a ratio.
"Not disclosed" is written where Oracle discloses nothing.

## 2. Organization and numbering

`tools/oracle/data/sections.json` is the single registry of sections: order, bilingual titles, the data modules behind
each section and whether the board deck builds a page for it. `app.js` numbers sections, figures (cards with a chart)
and tables (cards with a table) from the DOM order at render time, builds the navigation and resolves every
cross-reference (`ref('id')` in code, `{{sec:id}}` in the JSON narrative) to "§NN Title". `present.js` titles its pages
from the same registry and chooses pages by section id, never by number. The validator fails the build when a
reference does not resolve, when the DOM order differs from the registry, or when a hand-typed "section NN" remains.

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
No rumors or unattributed claims; the sweep prompt forbids them.

## 7. Validation (every build)

Tie-outs of the statements (revenue and opex sums, operating/pretax/net income identities, EPS, debt and cash sums,
FCF, D&A, recasts, four quarters to the fiscal year), parser re-reads of 26 printed figures per archived release,
obligations identities, XBRL cross-checks (obligations, capex, operating cash flow, four quarters to the year),
news and sections checks, module staleness. 0 failures required to publish; warnings mean insufficient data to check.
Results: `tools/oracle/data/quality_report.json` → `/oracle/quality.html`.

## 8. DCF (its own section since 2026-10-03; not in the board deck)

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
* **Customer prepayments.** The capex guide states gross capex and a cap on net cash capex; the gap is the share of
  gross capex customers fund in advance (24% for FY2027). Prepayments are received with the capex they fund and
  recognised as revenue **without new cash** over the contract term (6 years: Oracle's illustrative six-year 1 GW deal,
  analyst meeting 16-Oct-2025, p.10), including the prepayments already received (FY2026 and the current year to date,
  from the release cash-flow line). The share holds through the consensus years and fades to zero by the last explicit
  year; unwinds that fall after the horizon are discounted explicitly.
* **Terminal year.** Capex is normalised to **k × D&A** with k = 1 + g × L / 2 (replacement plus growth for an asset life
  L = 6 years, Oracle's server life, 10-Q note 3): 1.09 at g = 3%. No customer funding in the steady state.
* **Discount rate.** Rf = 10-year Treasury (FRED DGS10, latest). ERP = Aswath Damodaran's implied ERP for the S&P 500
  (trailing 12 months, adjusted payout; posted on the first of each month and read by `fetch-market.mjs`; flagged when
  older than 45 days). β = OLS slope of weekly log returns of ORCL on the S&P 500 over two years (default), with
  cross-checks shown beside it: five-year monthly and the Blume-adjusted versions of both (0.67 β + 0.33); the table shows
  the WACC and value per share at each. Kd = today's Treasury + the issue spread of Oracle's most recent ~10-year fixed
  note over the Treasury on its issue date. Weights = net debt / (net debt + market cap).
* **Equity bridge.** EV − reported net debt − finance-lease liabilities (their cost sits below EBITDA; operating leases
  are not deducted because their rent is already in EBITDA) − the mandatory convertible preferred at its liquidation
  preference (until its conversion date) = common equity, divided by **diluted shares**: the 10-Q cover count plus the
  dilutive securities of the latest quarter (diluted − basic weighted average, XBRL).
* **Acceptance check.** The section states whether the sensitivity grid and the beta cross-checks bracket the price; it
  always shows the WACC and the terminal growth the price implies (holding everything else) and the beta equivalent to
  that WACC, so a gap between model and market is explained with figures rather than hidden.

## 9. Summary, sites and targets

* The summary opens with five computed buildout numbers (RPO, MW energized vs contracted, capex gross vs net cash,
  uncommenced leases, funding still to raise); the drafted bullets follow, and *What to watch* is short lines grouped
  under headings. The summary carries its own date (`exec_summary.updated`) and the date its events run through; the
  validator fails the build when a cited source is dated after the summary, and the page counts the news items newer
  than the summary.
* Each campus has an **Issues** list (`buildout.json → sites[].issues`): dated, typed, with basis (company, government,
  wire, press) and source; a named decision or delivery date is counted down and flagged once passed without an update.
* Long-range targets (`long_range_targets.json`) are shown beside the reported actuals (the IaaS revenue headline of
  each release, re-read by the parser tests); superseded vintages are marked with the date and source that superseded
  them, never deleted.
* Ratings older than 12 months (`freshness.json → rating_action_max_age_days`) are flagged as aging on the page and in
  the deck.

