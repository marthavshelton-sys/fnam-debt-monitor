# Gentera model — memory for future sessions

Read with the repo-level `CLAUDE.md` (how the owner works) and `tools/gentera/README.md` (runbook and data
contracts). This file records what was decided, what is fragile, and what is still open for the Gentera model,
so a new session does not rediscover it. Update it when a decision changes; keep it factual and short.

## Status (25 September 2026)

- Live at https://fnam.mx/gentera/ (hidden data-quality page at `/gentera/quality.html`; board deck via
  `/gentera/?present=1&lang=es|en`). Reached from the landing page through the "Otras Empresas Mexicanas" hub.
- Data: 58 press releases 1T12–2T26 parsed (62 quarters incl. 2011 comparatives, 15 fiscal years), CNBV and
  SBS monthly series to July 2026, prices/FX/yields refreshed every weekday, 10 earnings-call transcripts
  (3T23–4T25) and the 3T24 corporate deck ingested.
- Automation verified: `gentera-refresh.yml` scheduled runs green since 22 Sep (14:35 and 22:45 UTC weekdays);
  bot commits `gentera: refresh … [skip actions]` touch only `site/gentera/data` and `tools/gentera/raw`.
- Reviewing routine `trig_01EndNB4dYX8tWUuGeYh8DdE` ("FNAM Gentera: review and email material changes",
  weekdays 15:35 UTC, email only). Its first run (24 Sep) finished without pushing the state file; the prompt
  was rewritten to attach the repo with push access, write `lastCheckedAt` every run and report a refused push.
  Check `tools/gentera/notify-state.json` on `main`: no `lastCheckedAt` = the routine still cannot push.

## Decisions the owner made (do not re-litigate)

- Mirror the Quálitas model structure exactly (sections 00–11, bilingual single page, nine data files).
- Valuation: excess-return model on book value; Ke = live MX 10-year (Banxico SIE `SF44071`) + 6% ERP × beta
  vs IPC (clipped 0.5–1.4); drivers loan growth, NIM, cost of risk, efficiency, tax rate, payout; Gordon or
  exit P/BV; implied Ke by bisection.
- Header tiles: price with 1-year change; market cap MXN and USD; LTM net income with ROAE; P/E with P/BV;
  stage-3 with coverage and cost of risk.
- Accounting toggle excludes only the 4Q25 ConCrédito deferred-tax write-down (Ps. 328 M, `REF.adjust`).
  The Ps. 500 M tax-contingency charge in 4Q25 opex is shown as reported (management called it a methodology
  change, not a one-off).
- Coverage = allowance ÷ stage-3 recomputed for every quarter (Gentera's own definition since 4Q25).
- Placeholder peers GFNORTEO, RA, BBAJIOO, BAP until FactSet; consensus and analyst targets stay "pending".
- Email only on material days: daily move ≥ 5%, consolidated stage 3 > 4.5%, guided metric outside range, or a
  new quarter / monthly table / guidance vintage / reference event.
- No password yet; Cloudflare Access (one-time PIN) is the recommended option, documented in the runbook.
- Gentera publishes no call transcripts: quotes come only from FactSet CallStreet files the owner drops in
  `tools/gentera/raw/transcripts/`; Spanish translations are ours and the page says so.

## Things that bite

- The IR site, CNBV, SBS, Banxico, FRED and Yahoo are blocked from cloud sessions; only the GitHub runner can
  fetch. Test parsers on the harvested texts in `tools/gentera/raw/text/releases/`.
- Gentera's dateline omits "de" before the year ("22 de julio 2026"); `release_date()` in `build_data.py`
  handles both forms. Release dates are the call day or the day before; guidance vintages use the same date.
- Fiscal-year and year-to-date NIM / NIM after provisions are averages of quarterly ratios (Gentera prints its
  own annual NIM: 41.0% for 2025 vs 41.2% here). Every other aggregated ratio is recomputed from sums.
- Pre-2022 statements use the old "cartera vigente / vencida" layout; shares are known only from 1Q22, so EPS
  and book value per share are null before that. 4Q21 stage-3 warning in the validator is expected.
- The 3Q20 release prints discontinued operations with the wrong sign; derived as net income − (pre-tax − tax).
- The IR page once served the corporate presentation under 4T25; the harvester picks anchors by text.
- `pypdf` panics in this container (cryptography backend); `ingest-transcripts.py` falls back to pypdfium2.
- SBS deposit lines and tables B-2334 / B-2369 are not mapped; the Perú monthly table shows loans, delinquency,
  net loans, YTD income and equity only.
- Chart.js comes from cdnjs; headless checks must route it to a local copy or charts stay blank.
- Two other builders touch this page: `site/gentera/present.js` (board PDF, reads `window.G_MODEL` only) and
  the shared mobile CSS pass (statement tables collapse on phones, 11 px floor). Keep `app.js` changes
  compatible with both: do not rename `G_MODEL` fields or the section ids.

## Data-file contracts in one line each

- `financials.js` `G_FIN`: `layout`, `quarters[]`, `ytd[]`, `years[]`; Ps. millions; workflow-owned.
- `operations.js` `G_OPS`: per-quarter ops + `monthly.cnbv` / `monthly.sbs`; workflow-owned.
- `market.js` `G_MARKET`: prices, dividends, FX, rates; workflow-owned (daily).
- `quality.js` `G_QUALITY`: parse log + validator result; workflow-owned.
- `guidance.js` `G_GUIDANCE`: vintages with `eps, loanGrowth, opexGrowth, cor, npl, roe`; `lo = hi` = "around".
- `comments.js` `G_COMMENTS`: `periods[...]{lines, bs, ops, call}` + `CALLS` (quotes per call, shared by the
  quarter / YTD / FY periods). Generated last time by a scratch script from a quotes dict; edit by hand now.
- `reference.js` `G_REF`: facts, shares, dividends, `adjust`, ConCrédito / Perú timelines, `management`,
  `ratings` (3T24 deck), `coverage`, glossary, valuation defaults, sources.
- `summary.js` `G_SUMMARY`: four executive-summary cards + `basis`.
- `peers.js` `G_PEERS`: schema only until FactSet.

## Audit trail

- 22–23 Sep 2026: full figure audit; three comment figures corrected (2Q26 sequential revenue +3.1%; FY2025
  cost of risk 13.0% vs 12.9%; FY NIM basis note). Every source line carries a date. Layout verified at 390,
  768, 1024 and 1360 px in ES/EN, light/dark; muted text ≥ 4.5:1.
- Guidance track record from the transcripts: FY2023 3/5 items hit (EPS Ps. 2.99 below Ps. 3.04–3.14, Otis),
  FY2024 4/6 (opex +16.4% vs ~14%), FY2025 4/6 (cost of risk 13.0% vs ~12.5%).

## Open items (owner's side)

- FactSet connector (peers, consensus, analyst targets).
- Access decision (Cloudflare Access recommended) — nothing in the repo changes for option 1.
- Transcripts for 1T26 and 2T26 (and 4T22–2T23 for the initial 2023 guidance); decks other than 3T24.
- Confirm the routine's emails arrive and that `lastCheckedAt` appears in the state file after 25 Sep 15:35 UTC.

## Open items (technical)

- 3T26 results expected ≈23 Oct 2026 (assumed from the 2023–2025 release lags; Gentera has not announced it, and
  an earlier "announced 21 Oct" claim had no source). Watch the first run after the release and `quality.html`.
- `reference.company.nextResults` is hand-set with `assumed: true`; the page shows "≈ date (assumed)", flips to
  "to be confirmed" once the date passes, and the routine refreshes it from the IR calendar. A confirmed date
  goes in `reference.calendar.nextResults` too, which is the key the board deck reads.
- Pre-2022 share counts (EPS null before 1Q22) if the owner wants a longer EPS history.
