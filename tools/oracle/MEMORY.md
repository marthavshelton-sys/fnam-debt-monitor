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

## Open items

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
