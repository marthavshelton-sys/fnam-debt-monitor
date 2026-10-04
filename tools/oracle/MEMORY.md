# Oracle model — memory (decisions, pitfalls, open items)

Read before touching `site/oracle` or `tools/oracle`. Runbook: `README.md`; method: `METHODOLOGY.md`; open items:
`PENDING.md`.

## Decisions (owner's)

- **2026-10-03 rebuild.** Sections are registered in `data/sections.json`; numbers, figure/table numbers, navigation
  and cross-references are generated (`app.js numberSections`, `ref()`, `{{sec:id}}`); the deck picks pages by section
  id. Never type a section number anywhere (the validator fails the build).
- Keep the comparable statements with the line-by-line call comments and the operating-metrics card exactly as they
  were (the owner uses them); RPO/cloud is one section, capex and FCF another, sites and power another.
- Timestamps on the Oracle page are **Eastern Time only** (`fmtET`), unlike the Mexican models (CDMX).
- Refresh is **daily, weekends included** (13:30 UTC); a run commits only when data changed. News daily via the cloud
  routine (`NEWS-SWEEP-PROMPT.md`); the weekly desktop press sweep and `press.js` are retired.
- Off-balance-sheet: three views side by side (reported / ASC 842 lease-adjusted / ASC 810 look-through). Uncommenced
  leases are never added to debt; the PV estimate is illustrative, labeled, and enters no ratio. A guarantee exposure
  is never a liability. Text readings (uncommenced sentence, guarantees, VIE) keep the *needs review* badge until a
  second reading or an XBRL match.
- Owner's ideas list (2026-10-03) not approved yet, so not built: Form 4 insider table, interest coverage block,
  server-life sensitivity, agency-replicated leverage, "what changed since your last visit" banner, short interest.
  XBRL facts were used only where a requirement needed them (finance-lease additions, lease schedules, verification).

- **2026-10-03 audit follow-up (21 items).** DCF rebuilt as its own numbered section `dcf` (not in the board deck): stub
  year, mid-period discounting, consensus margin less SBC, prepayments as a capex offset that unwinds as revenue,
  terminal capex = k × D&A, beta cross-checks, Damodaran ERP, Kd = Treasury + issue spread, bridge net of finance leases
  and the preferred, diluted shares, and an acceptance statement (price bracketed or the implied WACC/g/beta). Summary
  opens with five computed buildout numbers; watch items are short lines; sites carry a structured Issues list; OCI
  targets shown against actuals (superseded vintages marked); ratings older than 12 months flagged; CDS "pending";
  the as-of/refreshed stamp is written once per section (footers only when stale); sections can be collapsed (remembered
  per browser) with a back-to-top control. Default DCF at 2026-10-03: US$126 vs US$138.07 (beta cross-checks US$132–156).

- **2026-10-04 round 2 (owner's 22-item list).** DCF: tax normalization (ramp from the LTM effective rate to 21.9% =
  21% statutory + 0.9 pp state, `tax.json` cross-checked against the XBRL rate-reconciliation facts; the three modes
  shown side by side), the uncommenced leases offered as operating (default) or finance (PV deducted) with a "Leases in
  the DCF" note tying the off-balance-sheet section to the DCF, WACC weights on the same claims the bridge deducts
  (net debt + finance leases + preferred at its 6.50% with no shield), Bear / Base = consensus / Bull presets with the
  recipe spelled out from the data, the implied terminal EV/EBITDA (Gordon) and implied g (exit multiple), and the
  bracketing test replaced by "what has to be true" (implied WACC/beta; margin, growth pace and g needed at the model's
  WACC, 9% and 8%). Default at 2026-10-04: US$114 vs US$138.07 (US$126 was the pre-round value with the LTM tax rate
  held and net debt alone in the weights; the tax note shows all three tax modes). New analyses: sources and uses
  FY2027–FY2030 reconciled to the company's US$20.1 bn gap; counterparties (FWP names six OCI customers; S&P's half;
  press contract sizes as press), RPO concentration chart, counterparty capacity (estimate); RPO-to-revenue bridge;
  megawatt timeline per campus; Oracle against the hyperscalers on the hub's data and definitions; glossary with
  first-use tooltips. Flow: Start here (reading paths, verdict, six-box chain), story order Contracts → Capacity →
  Capex → Funding → Off-balance-sheet → Credit (new section: ratings, maturities, instruments, CDS note, peer and
  hyperscaler leverage) → Circularity → Multiples → DCF → Risks → News → Calendar, Reference appendix R1–R3
  (Statements, Guidance, Methodology + provenance + glossary + change log) collapsed; every section has a composed
  headline + "so what for valuation" and is collapsed by default except the Summary; sticky phone menu; change log
  shows meaningful changes with the raw leaves behind a toggle. Cleanup: CDS card is a one-line note (no internal
  path); US$288 bn confirmed by a second reading of the 10-Q (`verified_text`, badge consistent on the chain, Table 1
  and the three views); news swept in-session for 26-Sep–3-Oct (three items added, sweep note on the page); the header
  EV/EBITDA carries its footnote; `asOf()` helper for source lines. The deck keeps the board order (`deck_order`); its
  executive-summary page does not yet carry the verdict paragraph (owner's call).

- **2026-10-04 round 3 (owner's 18-item list: consistency, source hygiene, scenario range).** Sources: `extLink()` renders a
  source without a URL as text (the call-transcript sources `call_3q26`, `call_4q26`, `S-CALL-*` have none); the validator
  fails on an empty/`undefined`/`null`/`#` href in the markup and on any repository path in the reader-facing markup or the
  narrative data, and the render check fails on both in the rendered DOM plus on "Source:" lines with no source and empty
  Source cells. Repository paths left the page (refresh table, module rules, provenance footer, methodology footer, news sweep
  note); the technical detail is a section of `quality.html`. One source of truth for the facts quoted more than once:
  `openaiTenants()` (from `buildout.json → sites[].tenant_openai / tenant_basis`; 4 of 5 named by Oracle or the developer,
  Jupiter press-only; `{{fact:openai_campuses}}` resolves it inside `risks.json`), `guaranteeStatus()` (past tense once the
  scheduled maturity has passed), `maturedNote()` (the July-2026 notes: repaid, evidence in `market_reference.json →
  debt_instruments[].repaid_evidence` = 1Q27 10-Q XBRL RepaymentsOfDebt US$4,202 M; the 10-Q HTML itself is not archived under
  `tools/oracle/raw`, EDGAR Archives refuse the sandbox), `priceNeeds()` (verdict and acceptance box: "needs a WACC of about X%"
  plus the betas on file that reach the price), `scenarioRange()`. Next results: the median of the prior three years' dates
  (`calendar.json → estimates[].median` + `history`, written by `fetch-calendar.mjs`), not the window's end (Dec 10, not Dec 11);
  the window's end only sets the staleness deadline. Summary "events through" = the latest news item (builder). Dates: `fmtDate`
  prints a timestamp's ET date, `todayET()` drives countdowns/maturities/staleness, the builder dates `updatedAt` in ET. EN
  view: LTM labels composed at render time (`ltmLabel()`), "Max" button; one Source line per card in the maturity schedule.
  DCF: Bull = the Bear's three levers set to the plan (conversion one year ahead of the 10-Q schedule; Jupiter on time; OpenAI at
  plan) = US$141 vs the US$138.07 price; the management target is a fourth preset `mgmt` (US$120); lease treatments operating /
  mixed (finance share of recognized leases, 21%) / finance = US$114 / 102 / 59; the lease note ranks that swing against the
  other single switches and names the treatment the verdict uses; the verdict ends with the range sentence. Capacity: the
  Timeline panel is the megawatt series by campus (`buildout.json → sites[].mw_series`, each point sourced from the site's own
  sources by `short`); the RPO/capex results timeline sits behind a toggle. Change log: the raw table renders only when its
  toggle is opened. US$288 bn: no XBRL concept carries it (SEC company-facts API searched 2026-10-04, recorded in
  `obligations.json → provenance…second_reading.xbrl_search`); the badge's tooltip and the memo rows say what the second reading
  was and when. Hyperscaler table: Oracle's row keeps the hub's basis (2.7x / 4.1x: XBRL-tagged D&A, EBITDA) and prints the
  model's figures (2.60x / 3.54x: release D&A, EBITDAR) with the reason, same date. Word count fell (EN 31.2k → see render
  check), so no new material had to be collapsed.

- **2026-10-04 round 4 (owner's 24-item list: refresh, DCF, sources, deck, phones).** Data: price refreshed to the 2-Oct close
  (US$142.30, +3.06%) by `fetch-market.mjs`; FRED is unreachable from the sandbox (503 through the proxy), so the fetcher now
  merges a fallback source into the stored history (adds missing dates, never truncates: the Treasury's yearly CSV holds one
  year, FRED decades). News: Tencent lease (FT, press-reported, unconfirmed) and Port Washington grid timing (Aterio via The
  Register) added; the Jupiter floods and Point Beach items were already on file; sweep and ratings check dated 2026-10-04
  (`credit_ratings.checked`). Summary "What to watch" carries the four items; `events_through` = the latest news item (builder).
  **DCF:** Bull = the Bear's three levers at plan on a path capped at management's FY2030 target that rejoins consensus after the
  last consensus year; margin and D&A lead with the revenue level; **one capex rule for Bear and Bull** (contracted plan ±
  revenue difference × terminal intensity k × D&A/revenue), so capex rises with revenue in every row (the round-3 Bear let the
  slipped build plan's intensity run on, US$68 → US$77). Values at US$142.30: Bear 77 / Base 112 / Bull 118 / management
  target 117; leases operating / mixed / finance 112 / 100 / 57. Labels: "Base (consensus)", "Custom" (a manual edit re-renders
  the preset bar: Base un-highlighted, Custom badge). **One refresh time** (`REFRESHED_AT` = the build's `generatedAt`) on every
  stamp, the header and the deck cover; per-module fetch times only in the methodology modules table ("Data fetched") and on
  quality.html; the calendar prints ET only (CT and CDMX columns removed). Sources: July-2026 notes marked *inferred* with the
  10-Q linked; Figure 17's 2.7x/4.1x vs 2.60x/3.54x explanation cites the XBRL D&A and the release D&A with links; the five
  Source cells and the RPO-recognition Source line that had no link now link or say why (owner-supplied transcripts, FNAM
  calculation); the change-log caption explains the 600 kept leaves vs the 250 shown; megawatt timeline rows print "MW not
  disclosed" and Abilene's June-2025 row is an actual delivery; Port Washington's expected row carries an "at risk" badge.
  **Deck:** DCF page (`dcfPage`, section `dcf` now `deck: true`, deck_order 12; news/risks/method 13–15), the six-number chain
  strip on the executive summary (`present-core execSummary(sections, subtitle, pre)`), cover without credits or the
  confidentiality notice (`cfg.credits: false`, `cfg.confidential` = the source line, `cfg.coverLines` = the refresh time),
  `{{sec:}}`/`{{fact:}}` resolved in every table cell, a guard that refuses to save a deck with an unresolved token, and
  `scripts/oracle/deck-check.mjs` (builds both languages headlessly, compares price/DCF/Bear/Bull/delta with the page, PyMuPDF
  second layer and page images). **Phones** (≤760 px and landscape ≤500 px tall): compact header (title, price, status line,
  "More figures" toggle), the language/PDF pill inside the header bar, one fixed bottom bar for ☰ Sections and ↑ Top with body
  padding so content never ends under it, verdict clamped to four lines with "Read the full verdict", chain 2×3 with
  two-line details, 44 px controls, 16 px DCF inputs, 12 px type floor, pinned first column on tables wider than the screen
  (`markWideTables`), key rows only on the five longest tables (`limitRows`, `KEY_ROW_TABLES`), chart tooltips in a box below
  the plot (`externalTip`) with at most six x labels. Render check: 12 px floor, 44 px controls, 16 px inputs, nothing fixed
  over the nav, verdict and chain in the first screen, Custom state after an edit, per-language word ceilings
  (`--max-words-en/--max-words-es`; baselines 2026-10-04 before round 4: EN 29,337, ES 32,648 expanded).

## Pitfalls

- EDGAR answers `data.sec.gov` (XBRL, submissions) from the sandbox with a descriptive User-Agent; `www.sec.gov/Archives`
  and `efts` return 403 there. The runner has `EDGAR_USER_AGENT`.
- Oracle tags finance-lease additions only in some 10-Qs (1Q and the 9-month 3Q); 2Q and the derived 3Q are "not tagged".
  Interest expense and operating lease cost are tagged both as discrete 3-month and cumulative: the fetcher keeps the
  discrete value and stores the subtraction as a cross-check.
- Oracle's 10-Q lease schedule buckets map to XBRL as: RemainderOfFiscalYear → rest of the current FY,
  DueNextTwelveMonths → FY+1, YearTwo → FY+2 … YearFive → FY+5, AfterYearFive → thereafter (they sum to PaymentsDue).
- `html()` resolves `{{sec:id}}` tokens; `el('x').textContent = …` does not, and throws if the element was removed:
  keep element ids when moving cards between sections.
- The hand-typed-number check scans CSS comments too ("/* Section 03 … */" failed the build once).
- Chart.js footers (`p.chart-src`) are re-rendered by each render function; `applyStamps()` runs after `renderAll()`
  and strips old stamps first, so never append a stamp inside a render function.
- `fmtET()` of a date-only string printed the previous evening ("Sep 23, 8:00 PM ET" for 2026-09-24): date-only stamps
  are now shown as dates. Write real ISO times (`market_reference.refreshed_at`) where a time exists.
- Never name a local variable `ref` inside a render function: it shadows the cross-reference helper (a `ref is not a
  function` error stopped every later section once).
- Site fields are `<k>_en` / `<k>_es` (power, tenant, energized_text, first_revenue); the reader must try both before the
  untagged field (the English view showed "—" for the power source until 2026-10-03).
- Dark-mode overrides need `@media (prefers-color-scheme: dark)` around `:root:not([data-theme="light"])`; without it
  the dark badge colours showed in light mode.
- `merge-raw.mjs` used to replace whole records (losing Spanish notes and the FY2022 revenue lines); it now keeps keys
  the raw file does not carry (`keepCurated`). Still review its diff before committing: it also re-adds raw-only keys.
- Deck text from the data may carry `{{sec:id}}`: `present.js` resolves it in `text`/`bullets`/`measure*` overrides.
- Before pushing a page change: `node scripts/oracle/build.mjs`, then `node scripts/oracle/render-check.mjs` with the
  site served on :8123 (13 configurations), and build the PDF in both languages.
- Sections are collapsed by default: a Playwright check must click the "full reference" reading path (or open the
  section) before reading a section's content; `render-check.mjs` does. Collapsed sections keep their lead visible.
- The DCF scenario buttons re-run `dcfDefaults()` and carry over the cost-of-capital, tax and lease inputs on screen;
  any manual edit of the operating arrays turns the scenario into "custom" (the URL carries `preset`).
- `glossify()` runs last in `renderAll()` and wraps only the first visible occurrence per term and language; it skips
  links, inputs, headings, code, quotes and the glossary table itself. Add a term with its `match_en` / `match_es`
  regex in `glossary.json`; the validator does not check the patterns, so test both languages.
- The Hyperscaler Hub's data file is loaded by the Oracle page (`/hiperescaladores/data/financials.js`); a schema change
  in `scripts/hyperscalers/build.mjs` (`companies[].quarters[].ttm`, `m.rpo`) breaks the credit section's comparison —
  `renderHyperscalers()` degrades to a one-line note when the global is missing, not when a key is renamed.
- The verdict reads the DCF, so `renderSummary()` runs after `renderDcf()` in `renderAll()`; keep that order.
- `lastLTM` is built once at load, before the language is known: never print `lastLTM.id`; use `ltmLabel()` (the EN view
  showed "LTM 1T27" until round 3).
- A date-only string and a timestamp are different things on this page: `fmtDate` prints a timestamp's ET date, so pass the
  full ISO string, never `.slice(0, 10)` (that re-introduces the UTC date and the "Oct 4 next to Oct 3 ET" mismatch).
- Never emit `href="${x}"` directly from a source object; go through `extLink()`/`link()`, which render text when there is no
  URL. The validator scans `index.html` and the render check scans the DOM for empty, `undefined`, `null` or `#` hrefs.
- Repository paths in reader-facing strings fail the build (`validate-data.mjs` "paths" checks scan `index.html` and the
  narrative JSON; `render-check.mjs` scans visible text). Internal keys (`sources_note`, `files`, `src`, `url`, `key`) are
  excluded; put technical detail on `quality.html`.
- `{{fact:id}}` tokens in the narrative must name a key of `FACTS` in `app.js` (validator check).
- `fetch-market.mjs`: a fallback source (Yahoo, the Treasury's yearly CSV) covers a shorter window than FRED; since round 4 it is
  merged into the stored CSV (missing dates added), never written over it. FRED answers the GitHub runner, not the sandbox.
- The deck's `OracleDoc.text/bullets/measure*` resolve `{{sec:}}` and `{{fact:}}`, but table cells go through `fitTable` /
  `table` directly: pass every narrative cell through `this.xref()` first. `finish()` throws on any `{{` drawn (the guard wraps
  `this.pdf.text`, which jsPDF-AutoTable also calls), so a missed token fails the build instead of printing.
- Phone CSS lives in the last `<style>` block of `index.html` (`@media (max-width:760px)` and the landscape block); the summary
  section is a flex column there with `order` values, so new summary children need an `order` or they land at the end.
- `markWideTables()` runs after every render and after a section opens (`applyCollapse`): a table hidden in a collapsed section
  has no width, so the sticky-column class is only decided once it is visible.
- `.github/workflows/oracle-refresh.yml`: a step `name:` that contains ": " must be quoted. The 3-Oct-2026 edit left one unquoted, so
  GitHub could not parse the file and every run (push-triggered and the 13:30/21:45 schedules) failed at startup with no jobs until
  4 Oct; the stale 2-Oct close the owner noticed in round 4 was that outage. Parse every workflow with `python3 -c "import yaml; ..."`
  before pushing a workflow change.

## Open items

- Deck: the executive-summary page could carry the verdict paragraph and the six-number chain (page-only today); the
  owner decides (one-page auto-fit may need a layout pass).
- Bull case (round 4): built as "levers at plan", capped at management's FY2030 target, with one capex rule shared with the Bear.
  Two choices the owner may want to revisit: capex at the terminal intensity on the revenue difference (holding each year's
  consensus capex/revenue would put the Bull at US$107, below the Base), and the Bear's capex now falling with its revenue
  shortfall (round 3 kept the slipped plan's intensity: US$68 vs US$77). Both are stated in the scenario recipes on the page.
- Counterparty amounts: Oracle's filings name customers (FWP) but give no amounts; if a 10-Q ever discloses a split of
  RPO by customer or by funding type, replace S&P's estimate and the press figures in `buildout.json →
  unit_economics.concentration`.

- Investor Day 28-Oct-2026 (Las Vegas): add the new long-range targets to `long_range_targets.json` and mark the
  September-2025 OCI vintage's successor; the October-2025 figures were only on a slide and are not on file.
- Routine prompts (2026-10-03): the daily news sweep's stored prompt now matches `NEWS-SWEEP-PROMPT.md`. The FactSet
  refresh (trig_01QQ7kxnQVSPQTZnzviJCwUq) and the weekday review (trig_01DyGkmYcX5gxPnEEaX4eHje) were created through
  the API, so an agent cannot edit them: the owner pastes `FACTSET-PROMPT.md` (below the rule) and
  `ROUTINE-CLOUD-PROMPT.txt` at https://claude.ai/code/routines/<id>. Until then: the FactSet prompt already says to
  follow `FACTSET-PROMPT.md`'s call list (which has `DEP_AMORT_EXP`), and from FY2027Q1 the parser tests fail with the
  exact file and key when a release prints the IaaS revenue or prepayment line that the data lacks.

- Page numbers for 10-Q/10-K notes are null (inline XBRL); if the owner wants PDF page numbers, read the filing PDF
  in a workstation session and fill `obligations.json → provenance[].page`.
- Note numbers in `obligations.json → sources.10q_1q27.notes` follow the FY2026 10-K order and need a re-read of the
  1Q27 10-Q (flagged needs review).
- VIE / guarantees: text readings; the routine should grep the archived 10-K/10-Q for "variable interest" and
  "special purpose" once `HARVEST_FULL_REPORTS` archives them.
