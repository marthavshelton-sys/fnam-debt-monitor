# Prompt: build an auto-updating interactive financial model for a listed company

Copy everything below the line into Claude (or another LLM with tool access), fill in the bracketed
fields, and attach any PDFs you already have (old annual reports, earnings-call transcripts). The prompt
is written from the GAP model at fnam.mx/gap; the "Improvements" block at the end adds features that
model does not yet have.

---

You are building an interactive, self-updating financial model web page for **[COMPANY LEGAL NAME]**
(**[SHORT NAME]**, tickers **[LOCAL TICKER]** on **[HOME EXCHANGE]** and **[ADR/GDR TICKER]** on
**[FOREIGN EXCHANGE]**, reporting currency **[CCY]**, fiscal year ending **[MONTH]**). The audience is a
board member: a finance professional who is not a programmer, reads on a laptop and a phone, may be
65+ years old, and needs every figure traceable to a public source. Work in **[LANGUAGE A]** and
**[LANGUAGE B]** (the page has a language toggle; every label, note and comment exists in both).
Ask clarifying questions before you build when a choice would materially change the result; otherwise
make sensible defaults and state them.

## 1. Ground rules

- Public information only: the company's quarterly results releases, annual reports and regulatory
  filings (**[e.g. Form 20-F / 10-K, local exchange filings]**), monthly operating releases if the
  company issues them, official market data (exchange, central bank, FRED or equivalent) and the
  company's own investor-relations material. Never use or request material non-public information.
- Every number on the page must come from a data file that names its source (URL and date). Nothing
  is hard-coded in the page; the page only renders the data files.
- Curate the historical data from the filings yourself, quarter by quarter, and keep the raw text of
  every release in the repository as an audit trail. Where an old period is only available as a PDF,
  ask the user for it and parse it.
- Validate: after every data build run a tie-out script (revenue components sum to total; pre-tax
  income plus tax equals net income; balance sheet balances; cash-flow sections reconcile to the change
  in cash; year-to-date columns equal the sum of quarters; operating volumes sum across segments) and
  fail the build on any mismatch.
- State the accounting basis explicitly wherever it matters (for example concession accounting under
  IFRIC 12, IFRS 16 leases, non-recurring items) and give the user a toggle to view figures with and
  without the distorting item.
- Figures in nominal reporting currency as reported; thousands shown in millions; one decimal on
  percentages; every table has a source line with clickable links to the releases used.

## 2. Coverage

- Quarterly income statement, balance sheet and cash flow for the most recent **[12]** quarters, plus
  year-to-date columns as printed by the company and fiscal years **[FY20XX–FY20XX]** (at least ten).
- Operating drivers at the company's own granularity: **[monthly/quarterly volumes by segment, unit,
  region — e.g. passengers by airport, subscribers, stores, tonnes]**, from **[start date]**, with the
  company's own KPI table (per-unit revenues and costs) reproduced exactly.
- Share price history (both listings), the home index, cash dividends, FX and 10-year government
  yields (home and US) since **[year]**.
- Management guidance: every guidance table the company has published (initial and revised), parsed
  automatically from the releases.
- Slow-moving reference facts with sources: shares outstanding, concession/licence/regulatory terms,
  tariff or pricing frameworks, dividends approved, debt instruments and ratings, corporate actions,
  DCF default assumptions.

## 3. Page organisation (one long page with a sticky jump navigation)

Header: company name, "as of" line (latest quarter and its release date, latest operating month,
market close date, data build date), and a five-tile KPI strip: share price with 1-year change; market
cap in reporting currency and USD; LTM EBITDA with margin; net debt / LTM EBITDA with net debt; EV /
LTM EBITDA with P/E. Then, in this order:

00 **Executive summary**: four cards, three bullets each: operations; guidance and why it changed;
debt and ratios; what to watch in the next releases. A meta line states the basis periods and the date
written. Rewritten automatically when new results, operating data, guidance or events land.

01 **Comparable financial statements**. Controls: statement (income / balance sheet / cash flow);
mode (quarter / year-to-date / last twelve months / fiscal year); period A and period B selectors;
presets year-over-year and quarter-over-quarter; accounting toggle (**[e.g. exclude IFRIC 12]**); USD
toggle (average rate for flows, period-end for the balance sheet). Above the statement, an
**operating-metrics card** sharing the same controls: volumes by segment, the company's unit metrics,
and revenue per unit computed from the statements. The statement table shows A, B, absolute change,
percentage change and a **Comments** column with a one-line explanation of each key line's change
(from the release and, when available, the earnings-call transcript), only for year-over-year pairs.
Long cost groups and the lines between net income and comprehensive income attributable to the
controlling interest collapse by default and expand on click. Below: revenue-mix bar chart, margin
line chart (y-axis floored near the data), and a 12-quarter indicator table whose first column stays
fixed while scrolling on a phone.

02 **Management guidance**: guidance in force for the latest year (initial vs revised columns,
midpoint change, year-to-date actual, a tracking chip in range / above / below); a six-quarter history
matrix (guidance in force after each quarterly report, issued / revised / unchanged since, changed
cells shaded with the prior value struck through); guidance-vs-actual floating-bar chart by year with a
metric selector; track record table for closed years; full list of vintages with links. State the basis
(for example ex-IFRIC 12) and prove it against outcomes.

03 **Operating volumes**: monthly / quarterly / annual toggle, segment toggle (total / by type), chips
to select units or regions, chart, latest-month table with year-over-year and year-to-date, share of
total.

04 **Share-price performance**: both listings, ranges 1y / 3y / 5y / max, rebased comparison against
the home index and closest peers, 52-week high and low, year-to-date and 1-year change.

05 **DCF** with an input panel (operating growth per year, revenue per unit growth, margin, capex per
year, D&A, tax, working capital; risk-free rate pulled live, equity risk premium, beta computed from two
years of weekly returns against the home index, cost of debt from the latest fixed-rate bond, target
leverage; terminal method: annuity to the end of the concession or licence, Gordon perpetuity, exit
multiple), outputs (value per share, upside, WACC, market-implied WACC by bisection), a five-year
projection table and a sensitivity grid. Reset button. Explain in plain language how to read it.

06 **Relative valuation**: EV/EBITDA and P/E on LTM figures with a 12-quarter history of the
company's own multiple; a peer table (**[peers]**) fed by a data connector when available, otherwise a
clearly labelled placeholder.

07 **Leverage and debt**: net debt and leverage history (marking estimated quarters as such),
instruments table (name, type, issued, maturity, principal, rate), maturity profile, ratings, and a
note on anything still to be completed from the latest report.

08 **Dividends**: dividend per share history, payout, yield at the latest close, AGM approvals.

09 **[Special situation]**: a section per material corporate event (**[e.g. an acquisition, a spin-off,
a new financing vehicle]**): what it is, the terms, a timeline, a fact grid, what changes in the model.

10 **[Explainer]**: a plain-language explainer of any structure a board member may not know
(**[e.g. a trust vehicle, a regulatory tariff mechanism]**), with a fact sheet and timeline.

11 **Methodology and refresh**: a table of every data block, its cadence, mechanism and last update;
a sources footer with links and the "public information only" statement.

## 4. Aesthetics and legibility

- Calm editorial look: serif display headings, a clean sans for everything else, generous spacing,
  cards with subtle borders, numbered section badges, a sticky jump nav, and an ES/EN toggle top right.
- Design tokens for light and dark themes (follow the system setting; both must be fully legible).
  Charts use a validated categorical palette that reads in both themes; no black chart backgrounds.
- Tables: tabular figures, right-aligned numbers, positive/negative colouring, sticky first column on
  narrow screens, horizontal scrolling only inside the table, never on the page.
- Phone width (400 px) must work without horizontal overflow; grids collapse to one column.
- A **"Print as presentation"** button: Letter landscape, white background, black text, charts keep
  their colours, body 14 pt and titles 28 pt, headings kept with their first card, paragraphs never
  split, tables trimmed to the last 8 quarters, a cover with the basis dates and a confidentiality line,
  a closing slide with sources, and page numbers via CSS page-margin boxes.
- Every chart and table has a caption saying what it is and a source line saying where it came from.

## 5. Automation (the whole page must update by itself on weekdays)

- A scheduled job (**[GitHub Actions]**) harvests new releases from a source the runner can reach
  (**[newswire, IR site, regulator]**), parses them into the data files, validates, and commits; a
  second daily job refreshes market data after the home-market close. Use a commit marker the hosting
  platform does not treat as "skip build".
- A weekday reviewing routine (an LLM session with repository access) checks for material changes
  (new quarter, new operating month, new or revised guidance, corporate events) and: writes the
  Comments column entries for the new quarter from the release; updates the reference facts (dividends,
  issuances, ratings, share count, milestones); rewrites the affected executive-summary cards; records
  what it did in a state file; and emails the owner a concise note (headline figure, what changed with
  source links, why it matters, what to watch next, link to the model). Nothing is emailed on quiet days.
- Hand-supplied inputs (earnings-call transcripts, old PDFs) enrich the comments when provided; the
  email asks for them after each results release.
- Keep a runbook in the repository: data contracts, how each block refreshes, how to add a quarter by
  hand, how to enable password protection, how printing works.

## 6. Delivery

Publish at **[URL]** (static hosting), keep the repository on **[Git host]** with data-refresh workflows
and the reviewing routine, and hand over: the live link, the runbook, the list of assumptions, and the
list of items still pending on the user (connector authorisations, PDFs to supply, password decision).
Confirm every figure ties out and that both language versions show identical numbers before you
report completion.

## Improvements to include beyond the GAP model

1. **Provenance on hover**: each number shows a tooltip with the release, page or table it came from
   and the original figure before unit conversion.
2. **Scenario links**: encode the DCF inputs, selected periods and toggles in the URL so a scenario
   can be shared or bookmarked; add "save scenario" slots in the browser.
3. **Consensus placeholder**: a data contract for sell-side consensus (revenue, EBITDA, EPS, target
   price) next to management guidance, filled by a connector when authorised.
4. **Segment reporting**: statements by segment or geography as the company reports them, with the
   same A-vs-B controls.
5. **Transcript ingestion**: accept uploaded call transcripts and extract management quotes per line
   item and per guidance metric, shown as expandable quotes with speaker and date.
6. **Alert thresholds**: user-set thresholds (share move, leverage, guidance tracking) that trigger the
   email note in addition to the calendar events.
7. **"What changed since your last visit"** banner listing new data since the reader's previous
   session.
8. **Glossary tooltips** for accounting and industry terms, bilingual, one sentence each.
9. **Parser unit tests** on archived releases so a format change breaks the build, not the page.
10. **Accessibility pass**: WCAG AA contrast in both themes, keyboard navigation for every control,
    visible focus states, reduced-motion support.
11. **Data-quality page**: a hidden page listing every tie-out, parse warning and stale series, so the
    owner can see the pipeline's health without reading logs.
12. **Peer set with the same model**: once the peer connector is live, render the same statement
    comparison for any peer with one click.
