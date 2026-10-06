# Oracle financial model — runbook

The interactive model lives at `site/oracle/` (`index.html` + `app.js`, plus the unlinked `quality.html`) and is
served at **https://fnam.mx/oracle/** (password: see *Access*). It is a port of the GAP model — same HTML/CSS,
same `app.js` structure and controls, same family of `data/*.js` contracts (`window.ORCL_*` mirrors
`window.GAP_*`). Rebuilt 2026-10-03 (audit + new architecture, owner-approved) and reordered 2026-10-04 (round 2) to follow the story:
Start here (reading paths, verdict, six-number chain) → Contracts (RPO, RPO-to-revenue bridge) → Capacity (sites,
megawatt timeline) → Capex and FCF → Funding (balance sheet, funding plan, sources and uses) → Off-balance-sheet and
leases → Credit (ratings, maturities, instruments, CDS note, peer and hyperscaler leverage) → Circularity (deferred
revenue, counterparties, RPO concentration) → Multiples → DCF (scenarios, tax and lease notes, what has to be true) →
Risks → News → Calendar, then a collapsed Reference appendix (R1 Statements, R2 Guidance, R3 Analyst opinions, R4 Methodology,
provenance, glossary, change log). Every section has a composed headline and is collapsed by default except the Summary. Section
order, titles and numbering come from `tools/oracle/data/sections.json` (see *Numbering*). Every figure on the page comes from
a data file in `site/oracle/data/`; nothing is hard-coded. Method and sources: `METHODOLOGY.md`; memory: `MEMORY.md`.

Unlike the Mexican models, the page data is **generated** from a curated layer: `tools/oracle/data/*.json`
is the only place numbers are entered (each with a source key into `sources.json`), `validate-data.mjs`
ties it out, and `build-data.mjs` writes `site/oracle/data/*.js`. Never hand-edit the generated files.

| Page file (`site/oracle/data/`) | Holds | Refreshed by |
| --- | --- | --- |
| `financials.js` (`window.ORCL_FIN`) | Income statement (GAAP and Non-GAAP reconciliation), balance-sheet highlights, cash flow, D&A/EBITDA and KPIs (RPO, cloud revenue, dividend) for 20 quarters 2Q22→1Q27 and ten fiscal years FY2017→FY2026 (FY2017–FY2021 at year level from the 10-Ks: GAAP lines, D&A, cash flow; no Non-GAAP before FY2022); `layout` row definitions; revenue-basis flags and Oracle's FY2025 recast | `build-data.mjs` from `quarters.json`, `fiscal_years.json` |
| `buildout.js` (`window.ORCL_BUILDOUT`) | The AI-infrastructure buildout as disclosed: megawatts delivered per quarter, GPU utilization and renewals, GPUs delivered, capacity secured, the named data-center sites (capacity, customer, developer, financing, status, sources) and the RPO recognition schedule; feeds the section-03 capacity/GPU/site cards and the section-09 flow and tracker | `buildout.json`, updated by hand after each call (the routine adds the new quarter's figures) |
| `market.js` (`window.ORCL_MARKET`) | Daily ORCL and S&P 500 closes, dividends by payment date, 10-year Treasury, shares outstanding | **Automatic, weekdays** (`fetch-market.mjs`, 21:45 UTC) |
| `reference.js` (`window.ORCL_REF`) | Slow-moving facts with sources: company, shares, ratings, 58 debt instruments, dividends declared, AI-buildout narrative and timeline, RPO explainer, glossary, DCF defaults, peer list | `build-data.mjs` from `market_reference.json`, `special_situations.json`, `explainers.json`, `glossary.json`; facts curated by the routine via PR |
| `guidance.js` (`window.ORCL_GUIDANCE`) | Every guidance vintage (quarterly ranges for revenue, cloud, Non-GAAP EPS in USD and constant currency; FY revenue/EPS/capex), with the transcript page where the release printed no table | `guidance.json` (+ `transcripts.json`) |
| `comments.js` (`window.ORCL_COMMENTS`) | Comments column for the income statement, the balance sheet and the cash-flow statement, plus the operating-metrics card, bilingual: 13 quarters 1Q24→1Q27 keyed `2027Q1` (shown for same-quarter-prior-year pairs) and fiscal years FY2024→FY2026 keyed `FY2026` (shown in FY mode for consecutive years); management quotes per period. Driver-only, one clause each, citing the release page or the call page and speaker | `comments.json` ← `_raw_comments_a/b.json` (quarters) and `_raw_comments_y.json` (years); new quarters drafted by the routine as `_raw_comments_c.json` |
| `summary.js` (`window.ORCL_SUMMARY`) | Executive-summary cards (operations, guidance, debt, what to watch) for the latest quarter | `comments.json` → `exec_summary` |
| `peers.js` (`window.ORCL_PEERS`) | Peer multiples (Microsoft, SAP, Salesforce, ServiceNow, IBM, Workday) | **Placeholder** until the FactSet connector is authorised (`peers.json`) |
| `cds.js` (`window.ORCL_CDS`) | 5-year senior CDS spread series, tenor, recovery assumption | **Placeholder** until a CDS source exists (`cds.json`). Meanwhile the credit card shows the BBB index proxy from `market.js → spreads.BBB_OAS` (FRED `BAMLC0A4CBBB`, ICE BofA BBB US Corporate Index OAS, `bbb_oas.csv`), labeled "proxy, not Oracle" (owner's choice 2026-10-05) |
| `quality.js` (`window.ORCL_QUALITY`) | Last tie-out report + automation state + module staleness + obligations/XBRL verification + cross-reference check, rendered by `quality.html` | `validate-data.mjs` → `quality_report.json`, `harvest-filings.mjs` → `state.json` |
| `sections.js` (`window.ORCL_SECTIONS`) | Section registry (order, bilingual titles, nav labels, deck flag, modules) + the freshness rules | `sections.json`, `tools/oracle/freshness.json` |
| `xbrl.js` (`window.ORCL_XBRL`) | Oracle's XBRL facts: lease balances, maturities and additions, cash capex, purchase obligations, RPO, deferred revenue, interest; latest-filed value per period, derived quarters flagged, amendments | **Automatic, daily** (`fetch-xbrl-facts.mjs` → `xbrl_facts.json`) |
| `news.js` (`window.ORCL_NEWS`) | News and recent events: dated, themed, one-line summary, why it matters, sources primary first | `news.json`, daily cloud routine (`NEWS-SWEEP-PROMPT.md`) |
| `risks.js` (`window.ORCL_RISKS`) | Risk register with evidence, section references and what to watch | `risks.json`, reviewed with each 10-Q/10-K |
| `analysts.js` (`window.ORCL_ANALYSTS`) | Sell-side opinions by research house (Reference R3): the reports in the owner's research library (Dropbox) dated inside a 60-day window, read in-session and summarised (thesis, valuation method, target, rating, analysts, date; licensed material, never republished), the houses FactSet StreetAccount reported (press tier, labelled) and a dated snapshot of FactSet's weekly consensus target and rating counts; the current consensus comes from `factset.js` | `analysts.json`, in-session sweep (`ANALYSTS-SWEEP-PROMPT.md`); the section turns stale 60 days after `as_of` |
| `changelog.js` (`window.ORCL_CHANGELOG`) | What changed in each build (file, leaf, old → new) | `build-data.mjs` diff → `changelog.json` |

## Curated source of truth (`tools/oracle/data/`)

| File | What | Key rules |
|---|---|---|
| `sources.json` | Registry of every source: title, form, URL, accession, `accessed` date | Every other file cites sources by key (`"source": "S-8K-FY2027Q1"`; transcripts `S-CALL-<id>`). Add the source here first. |
| `quarters.json` | Quarterly GAAP + Non-GAAP income statement, balance-sheet highlights, cash flow, D&A, RPO, dividend declared, guidance issued | USD millions as printed; per-share in USD; `diluted_shares` in millions. The first record is the schema — copy it exactly. `null` = not disclosed, never 0. `revenue_basis` = `legacy_lines` \| `fy2026_lines`; FY2025 quarters carry `revenue_recast_fy2026_basis`. |
| `fiscal_years.json` | Annual figures per fiscal year: FY2022→FY2026 from the 4Q releases (with Non-GAAP, D&A and the FY2025 recast); FY2017→FY2021 from the FY2019 and FY2021 10-Ks (`gaap.revenue` lines, opex, interest, tax, net income, EPS, shares, cash flow, D&A; `non_gaap: null`); FY2022 revenue lines from the FY2024 10-K | Same conventions; the tie-out sums the four quarters against it where all four exist. |
| `calendar.json` | Investor calendar: upcoming and last-6-months events (earnings calls, analyst days, conferences) with webcast, release and announcement links; `estimates` = derived windows for the next results date, labelled `derived`; `manual_events` = hand-curated entries with a source (a date named on a call before the IR page lists it), preserved by the script | Written every weekday by `scripts/oracle/fetch-calendar.mjs` from the Oracle IR events list and the date-setting releases; emitted as `data/calendar.js` (`window.ORCL_CALENDAR`) for the Investor Calendar section and the presentation |
| `buildout.json` | Capacity delivered (MW) per quarter and fiscal year, capacity secured, GPU utilization / renewals / deliveries, named sites, RPO recognition schedule, funding items; each with source key or URL, page and speaker; `derived: true` marks figures computed from ratios management gave; each free-text site field (`capacity_text`, `customer`, `developer`, `financing`, `oracle_status`, `contracted`, `first_delivery`) has an `_es` counterpart | Curated after each call from the transcript; partner releases and wire reports only for site details Oracle has not disclosed. |
| `dividends.json` | Each declaration: declared, amount, record, payment, source | Board declares quarterly; no AGM step. |
| `market_reference.json` | Price snapshot, 10-year Treasury, `erp` (Damodaran's implied equity risk premium, monthly), credit ratings, `debt_instruments` (58 lines from the 10-K footnote) | `price_snapshot`, `treasury_10y`, `erp` and `refreshed_at` are rewritten by `fetch-market.mjs` (a failed ERP read keeps the stored value); ratings and instruments are curated from agency releases and the 10-K/8-K; a rating action older than 12 months is flagged on the page. |
| `prices_orcl_daily.csv`, `prices_spx_daily.csv`, `treasury_10y.csv` | Daily series | Overwritten by `fetch-market.mjs`. |
| `guidance.json` | Every vintage (initial, revised) per metric and period | Non-GAAP EPS and growth as Oracle states them; USD and constant currency kept separate; free-text notes bilingual (`_note`/`_note_es`, `fy_capex_note`/`fy_capex_note_es`, `multi_year_targets.note`/`note_es`). |
| `transcripts.json` | Per call: date, quantified guidance from the CFO's remarks, short attributed quotes | Built by `merge-transcripts.mjs` from the owner-supplied PDFs, which live only in the private `oracle-model` repository (licensed material). Without the raw extractions the merge keeps the existing file. |
| `comments.json` | Comments per quarter (`by_quarter.FY2027Q1.comments.<key>.{en,es,src}`), executive summary, headline | Merged from `_raw_comments_*.json` by `merge-comments.mjs`; reviewed before publishing. |
| `special_situations.json`, `explainers.json`, `glossary.json` | Bilingual narrative for the AI-buildout and RPO explainer blocks and the glossary | These files narrate; figures quoted must already exist in `quarters.json`. |
| `cds.json` | FactSet CDS contract (schema documented in the file) | Still empty: the FactSet connector exposes no CDS or bond-price endpoint (see `PENDING.md`). `peers.json` is no longer curated; `data/peers.js` is generated from `factset.json`. |
| `press.json` | Market concerns as stated in credible press and analyst publications: last 90 days, up to 8 items, four themes, bilingual one-line summaries, links | Archive, not refreshed: the weekly press-sweep task described in `PRESS-SWEEP-PROMPT.md` was never created (checked 2026-10-05); news comes daily from the cloud routine (`NEWS-SWEEP-PROMPT.md`, `news.json`). |
| `obligations.json` | Off-balance-sheet financing (Off-Balance-Sheet Financing and Leases section) and the dividends capital card: notes payable, operating and finance leases, uncommenced lease commitments with their history, purchase obligations by fiscal year, guarantees, prepayments, the 6.50% mandatory convertible preferred, the funding plan | Every figure transcribed from the 10-Q/10-K, the 424B5 or the call named in `source`; updated with each 10-Q/10-K (routine STEP 4); totals tie out in `validate-data.mjs`. Ratios (as reported, lease-adjusted / EBITDAR, commitment-inclusive) are computed on the page and labelled derived. |
| `peer_leverage.json` | Lease-adjusted leverage inputs for the owner's Baa-range peer set (Broadcom, Dell, Intel, IBM, HPE) from SEC XBRL company facts | Written by `fetch-peer-leverage.mjs` on weekdays: latest balance sheet for stocks, latest fiscal year for flows, a tag accepted only when its period matches; each value carries accession and tag. Ratings are not in XBRL and are not shown. |
| `factset.json` | FactSet consensus snapshot: Oracle NTM and fiscal-year estimates (EPS, sales, EBITDA, capex, FCF), point-in-time NTM history, price target and ratings; eight peers with FactSet price, market value, lease-inclusive net debt and NTM consensus | Written on weekdays by the cloud routine "FNAM Oracle: FactSet refresh" through the FactSet AI-Ready Data connector (`FACTSET-PROMPT.md` lists the calls); feeds `data/factset.js` and `data/peers.js`; the page computes every ratio. FactSet labels Oracle's fiscal year by its starting calendar year; records carry Oracle's label. |
| `long_range_targets.json` | Management's long-range targets (FY2030 revenue and EPS; OCI revenue by year), each with call, page, speaker and status (`in_force` / `superseded` with date and source) | Curated after each call or investor day; never rewritten by merge-raw; the page shows each vintage beside the reported IaaS revenue (`quarters.json → iaas_revenue_bn`, re-read from each release headline by the parser tests) and the DCF "management targets" basis reads the in-force FY2030 revenue target. |
| `analysts.json` | Sell-side research sweep: `houses` (reports on file, with `thesis`, `method`, `risks`, `basis_short` in both languages, `target_usd`, `rating`, `rating_class`, `analysts`, `date`, `title`, `source.basis = report`), `reported` (houses known only through FactSet StreetAccount summaries, `source.basis = streetaccount`), `consensus_history` (FactSet weekly target and rating counts, a dated snapshot), `as_of`, `window_days`, `window_start` | Written in-session from the Dropbox library and the FactSet connector (`ANALYSTS-SWEEP-PROMPT.md`); each house keeps its own rating wording, `rating_class` normalises it; `target_usd` is null only when the report states none; the validator checks every date against the window, the bilingual text, the rating classes and that the history's counts add up; no PDF is ever stored in the repository |
| `alerts.json` | Owner thresholds for the routine's email (1-day share move, max net debt / LTM EBITDA, guidance tracking) | Read by the reviewing routine. |
| `tax.json` | FY2026 10-K income-tax rate reconciliation (statutory, each reconciling line, effective), the latest separately disclosed state line and the normalized rate behind the DCF tax input | Transcribed from the 10-K; `validate-data.mjs` checks every line against the XBRL rate-reconciliation facts (`fetch-xbrl-facts.mjs`, kind `rate`); emitted into `reference.js → tax`. |
| `glossary.json` | Bilingual one-sentence definitions with first-use match patterns (`match_en` / `match_es`) | Feeds the Reference glossary and the first-use tooltips (`app.js glossify`). |
| `state.json` | Automation state: accessions seen, filings pending extraction, log | Written by `harvest-filings.mjs`; the routine marks extractions `done`. |
| `quality_report.json` | Last tie-out: checks, failures, warnings, stale series | Written by `validate-data.mjs`. |

`tools/oracle/raw/{8k,10q,10k}/` keeps the full HTML of every earnings exhibit the model uses (one file per
filing, accession in the name). It is the audit trail: on every build `test-parsers.mjs` re-reads each exhibit and
checks 26 printed figures per quarter against `quarters.json` (the four revenue lines and total, the nine
operating-expense lines and total, operating income, interest expense, pretax and net income, diluted EPS and
share count, and the balance-sheet cash, marketable securities, total assets, current and non-current borrowings
and current deferred revenue). 338 checks across the 13 archived quarters; any mismatch fails the build.

## DCF section (2026-10-03; round 2 on 2026-10-04)

The DCF is its own registered section (`dcf`, after the multiples). Since 2026-10-06 it is page-only (`deck: false`, the owner's
decision): the board deck carries the multiples and peer comparison but no DCF page (`dcfPage` in `present.js` stays, unused,
should she flip the flag back; it printed the value per share, WACC, the four scenario rows, the lease sensitivity, the
bridge and the "what has to be true" test, all read from `window.ORCL_MODEL`). Inputs and
method: `ASSUMPTIONS.md` (DCF defaults) and `METHODOLOGY.md` §8. Its defaults read `factset.json` (fiscal-year sales,
EBITDA, `da` = DEP_AMORT_EXP, capex), the capex guidance text, `quarters.json` (stub year, SBC, customer prepayments),
`xbrl_facts.json` (finance-lease liabilities, cover and weighted shares, tax rates), `obligations.json` (preferred,
uncommenced leases and their illustrative PV), `tax.json` (normalized rate) and `market_reference.json` (`erp`). The section offers Bear / Base (consensus) / Bull presets plus the management-target row, three tax modes, three lease
treatments, the implied terminal EV/EBITDA or implied g cross-check, and states what has to be true to justify the price
(implied WACC and beta; the margin, growth pace and terminal g needed at the model's WACC, 9% and 8%) instead of whether a
grid brackets it. Round 4: the Bull is the Bear's three levers at plan, capped at management's FY2030 target, and one capex
rule (contracted plan ± revenue difference × terminal intensity) applies to both cases; the recipes sit in a closed panel
under the scenarios table; a manual edit of an operating input turns the scenario Custom.

## Analyst opinions (Reference R3, 2026-10-05)

The section shows what the sell side publishes on Oracle, by research house: the reports dated inside a 60-day window in
the owner's research library (Dropbox), read in full in a Claude session and summarised in `analysts.json` (thesis,
valuation method, price target, rating, analysts, date, title), the houses that FactSet StreetAccount's summaries reported
(press tier, shown with a "StreetAccount summary" badge and a lighter bar), and FactSet's consensus: the current target
and rating counts from the daily `factset.json`, the weekly history as a dated snapshot in `analysts.json`. Stat tiles,
the by-house table (with the consensus as its first row), a target chart with the price, the consensus mean and the
model's DCF base as reference lines, the weekly consensus chart, and a closed panel with the thesis, method and risks per
house. The lead counts how many targets sit above the DCF base and points to the DCF's "what has to be true" box.

Rules: the reports are licensed material — summaries only, never a republished page, never a PDF in the repository;
every house keeps its own rating wording (`rating_class` normalises it for the chart); a target is `null` only when the
report states none (a sector report, a credit note); StreetAccount items are press tier and never replace a report on
file; the page endorses no house and says so. Refresh in-session with `ANALYSTS-SWEEP-PROMPT.md` (Dropbox + FactSet
connectors): the Dropbox `Current` folder holds only the current month, earlier months live under `Archives/<year>/<month>`;
the Dropbox `fetch` tool extracts text up to 5 MiB — a larger PDF needs `download_link` + `curl` + `pdftotext`. The
module `analysts` (`freshness.json`, `max_age_days` = the window) turns the section stale 60 days after `as_of`. Not in the
board deck (`deck: false`); the owner decides whether the deck gets a page.

## Render check and deck check

With the site served (`python3 -m http.server 8123 --directory site`, detached), `node scripts/oracle/render-check.mjs`
loads the page in Spanish and English at 1280, 390 and 360 px in light and dark mode and in print emulation: no script
error, no `undefined`/`NaN`, no horizontal overflow, nothing under 12 px on phones (round 4; 11 px before), no other-language text, the tab title
in the reader's language, every section numbered (01… and R1…), only the Summary open by default, a finite DCF with its
"what has to be true" statement, the three scenarios and the tax and lease notes, the Bear preset applying, the six-box
chain and the verdict, a lead on every section, the glossary first-use definitions, the round-2 tables (sources and
uses, hyperscalers, counterparties, RPO bridge, megawatts, glossary), the CDS note free of internal paths, the Issues
column for every campus, working collapse toggles (the lead stays visible) and back-to-top. Since round 3 (2026-10-04) it
also fails on any anchor without a real href (empty, `undefined`, `null`), on any repository or tool path in visible text,
on a "Source:" line with no source or a table row with an empty Source cell, on fewer than four scenario rows, and, with
`--max-words <n>` (or `--max-words-en` / `--max-words-es`, one ceiling per language), when the expanded page's visible word
count exceeds the ceiling (the owner's rule: it must not grow by more than 3%; text inside a closed `<details>` panel does not
count, so new material goes into collapsed panels; baselines measured 2026-10-04 before round 4: EN 26,557, ES 29,710). Round 4
added the phone rules: every control at least 44 px tall, DCF inputs at 16 px or more, nothing fixed over the sticky nav, the
verdict and the six-box chain inside the first screen at 390 and 360 px, and a manual edit of an operating input switching the
scenario to Custom. `--shots <dir>` saves screenshots. Run it before pushing a page change.

`node scripts/oracle/deck-check.mjs [--out <dir>] [--shots <dir>]` builds the board presentation in both languages from the
served page (Playwright clicks the PDF button), saves the PDFs and fails when the build throws (the builder refuses to save a
deck with an unresolved `{{token}}`), when any drawn string carries `{{`, `undefined`, `NaN` or `null`, when the English deck
carries Spanish words or a repository path, when the deck's price, DCF value or delta against the price (and Bear and Bull
while the DCF section is in the deck) differ from the page's, when a bullet or sub-heading of the page's executive summary is
missing from the deck, when the page's verdict is not drawn whole, or when the deck's pages are not in the registry's order. With PyMuPDF installed (`pip install pymupdf`)
it also reads the saved PDF as a second layer: its text, the contents page's internal links (at least one per deck section,
every target inside the document) and the box of every word (none past the right margin or below the footer rule, so no text
spilled out of a tile, box or page) and, with `--shots`, rasterises every page. Run it with the render check before pushing a
change to `present.js`, `present-core.js` or the DCF.

## Numbering, cross-references and stamps (2026-10-03)

`sections.json` is the only place a section is defined. `app.js numberSections()` numbers the sections (the summary is
labeled "Start here"; the Reference appendix is R1, R2…), the figures (cards with a chart) and the tables (cards with a
table) in DOM order, builds the navigation (and the phone menu) and labels every card "Figure n / Table n". The deck's pages
follow the registry order, i.e. the page's story order (owner, 2026-10-06; `deck_order` is gone: `deck` alone decides whether a
section gets a page). Cross-references are `ref('id')` in `app.js`/`present.js` and `{{sec:id}}` inside
the JSON narrative (resolved by `html()`); the deck titles its pages with `secHead(id)`. `validate-data.mjs` fails when a
reference does not resolve, when the `<section data-sec>` order differs from the registry, or when a literal "section NN"
remains in the page, deck or data. Each section head gets an as-of / refreshed (ET) / STALE stamp from the section's
modules (`applyStamps()`); card footers repeat it only when the section is stale; rules in `tools/oracle/freshness.json`.
Every section but the Summary has a hide/show toggle and is collapsed by default (the set of open sections is remembered
in the reader's browser; reading paths in the Summary open the 5-minute, 20-minute or full set; a deep link or a
cross-reference opens its target); the navigation has a collapse-all/expand-all control; printing and the PDF always show
everything. A collapsed section keeps its composed lead (headline + "so what for valuation") visible.

Conventions: nominal USD as reported; thousands shown as millions; outflows stored negative
(`capex_quarter: -28499`); ISO dates; one decimal on percentages applied at render time, never in the data.
Assumptions in `ASSUMPTIONS.md`; open items in `PENDING.md`.

## Pipeline (`.github/workflows/oracle-refresh.yml`)

Since 2026-09-24 the filings job also runs `fetch-peer-leverage.mjs` (SEC XBRL company facts for the peer leverage table in the Off-Balance-Sheet Financing and Leases section) right after the investor calendar; the weekly press sweep was never created as a task (`press.json` is an archive; see `NEWS-SWEEP-PROMPT.md` for the daily news routine).

```
scripts/oracle/fetch-market.mjs     Nasdaq/Yahoo/Stooq + FRED (S&P 500, BBB OAS) + U.S. Treasury CSV (10-year) -> tools/oracle/data/*.csv, market_reference.json
scripts/oracle/harvest-filings.mjs  SEC EDGAR (IR feed fallback) -> tools/oracle/raw/*, tools/oracle/data/state.json
scripts/oracle/fetch-xbrl-facts.mjs SEC XBRL company facts       -> tools/oracle/data/xbrl_facts.json (amendments by accession)
scripts/oracle/validate-data.mjs    tie-outs; non-zero exit fails the job; writes quality_report.json
scripts/oracle/test-parsers.mjs     archived exhibits vs quarters.json
scripts/oracle/build-data.mjs       curated JSON -> site/oracle/data/*.js
git commit "[skip actions]" + push  Cloudflare Pages deploys the commit
```

* Schedules: weekdays **21:45 UTC** (market only; NYSE closes 20:00 UTC in summer, 21:00 in winter) and every day
  **13:30 UTC** (filings + XBRL facts + market; Oracle files the results 8-K the evening it reports; daily since
  2026-10-03, owner's choice; a run commits only when data changed). GitHub only runs
  schedules on the **default branch**, so the automation starts when the `oracle-model` branch is merged;
  until then trigger it from the Actions tab (`workflow_dispatch`, `mode` = market | filings | all).
* Set the repository variable **`EDGAR_USER_AGENT`** = `Your Name your@email` (the SEC asks for a contact).
* **EDGAR from GitHub runners.** EDGAR has refused GitHub-hosted runners for the other models regardless of
  User-Agent. If it does here, `harvest-filings.mjs` logs the refusal and instead reads Oracle's IR
  press-release feed, recording any new results release as `pending_extraction` (form "IR release") so the
  page's quality view and the routine know a quarter is out. The routine (below) runs the harvester from a
  workstation, where EDGAR answers, and archives the exhibit.
* **Figures are never extracted automatically.** The harvester archives filings and marks them pending; the
  numbers enter `quarters.json` through the reviewing routine or by hand, and only after `validate-data.mjs`
  and `test-parsers.mjs` pass.
* The hand-curated files (quarters, fiscal years, guidance, comments, reference facts, peers, cds) are never
  rewritten by the workflow; it commits only `site/oracle/data`, `tools/oracle/data` (market CSVs, snapshot,
  state, quality report) and `tools/oracle/raw`.

## Reviewing routine (weekdays)

`ROUTINE.md` holds the complete prompt for a Claude scheduled task ("FNAM Oracle: weekday review", weekdays
08:30 Mexico City). It syncs `main`, runs the harvester, extracts a new quarter into `_raw_fy20xx.json` →
`merge-raw.mjs`, drafts the Comments column and executive summary, updates reference facts from events
(issuances, ratings, dividends), runs the build, opens a **pull request** (never pushes to `main`), and emails the
owner only on material days (thresholds in `alerts.json`). State in `notify-state.json`. No API key or mail
provider is needed: the routine's own session reads, drafts and emails through the Gmail connector.

## Adding a quarter by hand

1. On EDGAR (CIK 0001341439) open the 8-K with Item 2.02 for the quarter; the earnings release is exhibit
   `orcl-ex99_1.htm`. Save it as `tools/oracle/raw/8k/<period-end>_8K_<accession>_orcl-ex99_1.htm` (or run
   `node scripts/oracle/harvest-filings.mjs`, which does this and updates `state.json`).
2. Add a `sources.json` entry (`S-8K-FY20xxQn`): title, form, period_end, filing_date, URL, accession, accessed.
3. Write `tools/oracle/data/_raw_fy20xx.json` in the schema of `_raw_fy2026.json` (or copy the first record of
   `quarters.json`) from the release's GAAP statement, Non-GAAP reconciliation, balance-sheet highlights and
   cash-flow table. Q2–Q4 cash flows are cumulative (6-, 9-, 12-month): derive the discrete quarter by
   subtracting the previous cumulative release and note it in `cash_flow.note_en/es`. Record RPO, the dividend
   declared, the guidance ranges issued and D&A.
4. `node scripts/oracle/merge-raw.mjs` — normalises signs, registers sources, derives D&A, merges transcripts
   and comments, rewrites `quarters.json`, `fiscal_years.json`, `guidance.json`, `dividends.json`.
5. `node scripts/oracle/validate-data.mjs`. Fix anything that fails — a failure almost always means a
   transcription slip, not an Oracle error.
6. Draft the Comments column and executive summary for the quarter as `_raw_comments_<x>.json` (shape of
   `_raw_comments_b.json`) and run `node scripts/oracle/merge-comments.mjs`.
7. `node scripts/oracle/build.mjs` (validate → parser tests → data files). Commit `tools/oracle/data`,
   `tools/oracle/raw`, `site/oracle/data`. Mark the filing `done` in `state.json`.

After a 10-K (June): extract the annual statement and D&A into `fiscal_years.json`, the debt footnote into
`market_reference.json` → `debt_instruments` (must reconcile to the disclosed gross total) and the shares on
the cover. After a 10-Q: shares on the cover; retire matured notes.

### When a release changes format

`test-parsers.mjs` re-parses every archived exhibit for "Total revenues" and "Total operating expenses". If
Oracle renames a caption, the test fails and the workflow commits nothing. Fix = extend the label regex in
`test-parsers.mjs` (and, for the statements, the mapping in `merge-raw.mjs`), rebuild, commit.

## Manual updates

**`market_reference.json`** — when a rating changes (`credit_ratings`, with the agency release as source), when a
bond is issued or repaid (`debt_instruments`; principal must still reconcile to the latest filed gross total),
when the share count changes (`price_snapshot.orcl.shares_outstanding_millions`, from the 10-Q cover).

**`special_situations.json`** (AI-buildout narrative) and **`explainers.json`** (RPO explainer) — when
the story moves; both are bilingual `_en/_es` pairs and must not introduce numbers that are not in `quarters.json`.

**`peers.json`, `cds.json`, `consensus.json`** — populate from FactSet once the connector is authorised
(field contracts in the file headers). The page shows Oracle's own multiples live and each peer's row, the CDS
chart and its implied default probability once values are non-null.

## Access (password)

`functions/oracle/_middleware.js` is a Cloudflare Pages Function that guards every URL under `/oracle/`.
**It is dormant until `ORACLE_PASSWORD` exists**: without the variable the page is served openly (with
`noindex` and `no-store` headers). To turn the password on, in the Cloudflare dashboard → Workers & Pages →
the Pages project → **Settings → Variables and Secrets**, for **Production and Preview**:

| Variable | Required | Meaning |
| --- | --- | --- |
| `ORACLE_PASSWORD` | to enable | The shared password. Unset = no password, page served openly. |
| `ORACLE_SESSION_SECRET` | no | Random string signing the session cookie; defaults to a hash of the password. |
| `ORACLE_SESSION_DAYS` | no | Session length in days (default 30). Append `?logout` to any /oracle URL to end a session. |

## Board presentation (PDF) — the "Presentación (PDF)" button

`site/oracle/present.js` builds a Letter-size PDF in the browser in one click. It extends the shared engine
`site/assets/present-core.js` (jsPDF + jsPDF-AutoTable vendored in `site/assets/vendor/`; charts drawn off-screen with
the page's Chart.js; cover, footers, tables, `**bold**` runs, Title Case, next-results rule) and reads
`window.ORCL_MODEL`, the read-only API that `app.js` exposes at the end of its IIFE, so every figure is the same
calculation the page shows. Language follows the ES/EN toggle; the file is named
`Oracle_ORCL_presentacion_<date>.pdf` / `Oracle_ORCL_board_presentation_<date>.pdf`. The browser print path
(Ctrl/Cmd+P) still works as a fallback.

Deep link: `/oracle/?present=1&lang=es` (or `lang=en`) opens the page, sets the language and builds the PDF on arrival; the landing pages' "Board presentations (PDF)" links use it and pass the reader's current language.

Pages (22 on the 2026-10-06 data), in the page's story order: cover (landscape, unnumbered; since round 4 without the "Powered by" credits and the
confidentiality notice: the footer line reads "Source: public filings, FactSet consensus; not investment advice" and the cover
carries the page's refresh time in ET) · executive summary (`data/summary.js`, the same text as the page's summary block: "What
to watch" on the left with its sub-headed items, Operations, Guidance and why it changed, and Debt and ratios on the right,
then the page's verdict (its two headed blocks, `verdictHtml()` read through the model, `<b>` as bold runs) under them,
auto-fitted to one page under the six-number chain strip (the engine also moves the column split towards the longer column,
50/50 to 62/38, so the text stays as large as the page allows: 8.25 pt in English, 7.5 pt in Spanish on the 2026-10-06 data;
across the full width the verdict pushed everything to 7.5 pt and Spanish overflowed); bullets without `**markers**` get their
lead clause emphasised; owner's layout, 2026-10-06) · contents (one page: every deck section with the website's number or label and its first page,
an indented row per page where a section spans several, each row an internal link; `Doc.contents()` reserves the page right
after the summary and `drawContents()` fills it once every page exists) · tear sheet (ORCL price with the page's refresh time in ET,
market cap, YTD and 12-month change vs the S&P 500, 52-week range, dividend yield, LTM and quarter EBITDA, Non-GAAP
margin, net debt/EBITDA, EV/EBITDA, P/E, cash flows, RPO, cloud revenue, guidance in force, next results; ORCL vs S&P
500 rebased and 3-year price) · RPO explained · sites and capacity (portrait, `data/buildout.js`) and the AI buildout
(five-step flow and tracker) · RPO, capex and cash flow by quarter (portrait) · leverage and debt profile, dividends and cash
generation (ten fiscal years) · off-balance-sheet financing and leases · debt detail and credit risk · circularity ·
multiples and peers · risks · news · then the Reference appendix: operating metrics, income statement of the latest quarter,
LTM and latest fiscal year (portrait, GAAP with the Non-GAAP and EBITDA blocks, revenue lines on the FY2026 basis via Oracle's
recast, with the `data/comments.js` call comments; the LTM page reuses the latest quarter's comments and says so) · guidance in
force, FY targets initial vs latest, track record and vintages (landscape) · sources and methodology. The DCF (page-only since
2026-10-06) and the share-price view are excluded on purpose. Every page after the cover carries the source footer and "Page X of Y".
Narrative cells may carry `{{sec:id}}` and `{{fact:id}}` tokens: `OracleDoc.xref()` resolves them and `finish()` refuses to
save a deck in which any `{{` was drawn. Text fits its box by construction (2026-10-06, after "text · second reading" spilled
out of the Funding tile): `tiles()` shrinks the value and the label and grows the row when a label still needs more room,
`box()` shrinks title and subtitle, `page()` shrinks a title that would run off the page, and paragraphs wrap 4 pt short of
their width (jsPDF measures with kerning the written page does not apply); the deck check reads every word's box with PyMuPDF
and fails on any word past the right margin or below the footer rule. The chain's verification badge ("text · second
reading") is page-only (`chainBoxes()[].badge`); the deck prints the tile label without it.

The estimate written when Oracle has not announced the date (`calendar.json → estimates[]`) carries the window
(`window_start`/`window_end`), the `median` of the prior three years' dates and that `history`; the page shows the median
("median of the prior three years' release dates", with the dates) and uses the window's end only as the staleness deadline.

Next results date: `tools/oracle/data/calendar.json` → `nextResults: { date, time, timezone, fiscal_period, source }`,
filled automatically by `scripts/oracle/fetch-calendar.mjs` (weekday workflow) from Oracle IR's events list and the
"Oracle Sets the Date" release, and emitted to `reference.js` → `calendar.nextResults` (shown as *confirmed*); it is
`null` until Oracle announces the date and again after the call has taken place, so the PDF then assumes the median lag
between quarter-end and release for the same fiscal quarter over the previous three years and labels it *assumed*.
Never hand-edit it. The same file feeds the Investor Calendar section with the full event list and its estimates.

The sites page draws a locator map from `site/assets/us-map.js` (contiguous-US outline and state borders from the U.S.
Census Bureau boundary files in the `us-atlas` package, pre-projected with the US Albers equal-area conic and
simplified; rebuild with `tools/assets/build-us-map.mjs`). Each campus in `tools/oracle/data/buildout.json` carries
approximate `lat`/`lon` (county or township) and a `short` label for the map; the builder projects them with the same
formula, so a new campus only needs its row.

Layout rules the engine enforces: tables shrink their font until they fit (`fitTable`), notes are pushed up rather
than over the footer (`noteAbove`), a table that would still spill is logged in the console, and glyphs Helvetica lacks
(−, ≈, →, ≥…) are swapped before drawing. To review the output headlessly, open the page with Playwright, click
`#btnPrint`, save the download and rasterise it (PyMuPDF).

## Data quality page

`site/oracle/quality.html` (hidden, linked from the Methodology section; https://fnam.mx/oracle/quality.html) renders `data/quality.js`,
which `build-data.mjs` assembles from four files after every build:

* `tools/oracle/data/quality_report.json` (written by `validate-data.mjs`): every tie-out as a structured record
  `{tag, check, status ok|warn|fail, diff, tol, note}`, the freshness of each market series and snapshot (last date,
  age, limit, how it refreshes), whether each curated file covers the latest quarter, tolerances, coverage, and the
  legacy `passed / failures / warnings / stale` lists.
* `tools/oracle/data/parser_report.json` (written by `test-parsers.mjs`): figures re-read from the archived 8-K
  exhibits, per quarter, with any mismatch and the quarters that predate the archive.
* `tools/oracle/data/state.json` (harvest state: pending extraction, references, log) and `tools/oracle/notify-state.json`
  (the weekday routine's last check, last email, last failure).

The page has the same layout as the Qualitas quality page: summary cards, freshness table, curated files, automation
(what runs, when it last ran, what is pending), parser tests and the tie-outs with status and period filters; ES/EN toggle.
Check names and validator notes appear in English as the validator writes them.
## Local preview

```
npx http-server site -p 8080      # then open http://localhost:8080/oracle/  (no password locally)
```

## Transcripts (private material)

The earnings-call transcripts the owner supplied are licensed PDFs. They and their raw extractions stay in the
private repository `marthavshelton-sys/oracle-model` (`Transcripts/`, `data/_raw_transcripts_*.json`), which
also keeps the model's development history up to the port. Only `transcripts.json` — short attributed quotes
and the quantified guidance ranges — is published here. `.gitignore` keeps `tools/oracle/transcripts/` and
`_raw_transcripts_*.json` out of this repository.

To fold in a new call: extract the PDF into `data/_raw_transcripts_<letter>.json` in the private clone (same
shape as the existing files), then from this repository run
`ORACLE_TRANSCRIPTS_RAW_DIR=<private clone>/data node scripts/oracle/merge-raw.mjs` followed by
`node scripts/oracle/build.mjs`. The merge registers the call as `S-CALL-<id>`, fills any guidance vintage the
release left unquantified, and rewrites `transcripts.json`.


## Closing prices only (30-Sep-2026)

`fetch-market` passes every price series through `scripts/lib/completed-sessions.mjs`: a bar dated today is kept only after that exchange's close in its own time zone (BMV 15:30 Mexico City, NYSE/Nasdaq 16:15 New York, B3 18:15 São Paulo, BME 17:45 Madrid). The morning run therefore publishes the previous close; the evening run adds the day's close. The same helper serves GAP, OMA, ASUR, Quálitas, Gentera and Oracle.

Oracle's evening run (21:45 UTC) often finds no new close because Nasdaq's historical endpoint posts the day later in the evening; the next morning's run adds it. This is a one-session lag, never an intraday price.

Since round 4 (2026-10-04) a fallback source (Yahoo for the S&P 500, the Treasury's yearly CSV for the 10-year) is merged into the stored CSV, adding only the dates it brings: a one-day FRED outage can no longer truncate the committed history (FRED answers the runner; it does not answer the sandbox).

The 10-year series (2026-10-05, owner's choice): the U.S. Treasury daily par yield curve CSV is the primary source and FRED `DGS10` (the same series, republished by the St. Louis Fed one day later) the fallback. The Treasury CSV holds one calendar year, so the fetcher always merges it into the stored `treasury_10y.csv` (history from 1962 via FRED). `market_reference.json → treasury_10y` records `source_name`, `source_url`, `series` and `as_of_date`; `build-data.mjs` copies them into `ORCL_MARKET.rates.US10Y` (`source`, `sourceUrl`, `asOf`, `value`) and the page, the deck and the validator print the value, source and date beside the figure (DCF inputs, DCF sources line, cost-of-debt row, refresh table, source grid, deck sources). Never hard-code "FRED DGS10" again.

## Timestamps (round 4)

Every stamp on the page (section heads, the header, the deck cover and tear sheet) prints one refresh time, `REFRESHED_AT` = the `generatedAt` of the build that wrote the data files, in Eastern Time. Per-module fetch times appear only in the methodology section's modules table ("Data fetched") and on quality.html. The investor calendar prints event times in ET only.
