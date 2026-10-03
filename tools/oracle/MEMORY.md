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

## Open items

- Page numbers for 10-Q/10-K notes are null (inline XBRL); if the owner wants PDF page numbers, read the filing PDF
  in a workstation session and fill `obligations.json → provenance[].page`.
- Note numbers in `obligations.json → sources.10q_1q27.notes` follow the FY2026 10-K order and need a re-read of the
  1Q27 10-Q (flagged needs review).
- VIE / guarantees: text readings; the routine should grep the archived 10-K/10-Q for "variable interest" and
  "special purpose" once `HARVEST_FULL_REPORTS` archives them.
