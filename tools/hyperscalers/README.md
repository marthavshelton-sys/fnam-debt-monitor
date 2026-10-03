# Hyperscaler Hub — runbook

Pages: `site/hiperescaladores/` (summary), `capex/` (module 3), `fuera-de-balance/` (module 6), `metodologia/`,
`glosario/`, and the data-quality pages `capex/quality.html`, `fuera-de-balance/quality.html`. `/hyperscalers/*`
redirects here. Modules 1, 2, 5 (phase 2) and 4, 7 (phase 3) are listed as "in preparation" and not built yet.

Coverage (owner's choice, 2026-10-03): MSFT, GOOGL, AMZN, META, ORCL, CRWV (core) and NBIS, IREN, APLD, CORZ
(listed neoclouds), in `companies.json`. Public for now; the owner plans a password in a few weeks — copy
`functions/oma/_middleware.js` to `functions/hiperescaladores/_middleware.js` with its own secret.

## Pipeline

| Step | Script | Output |
|---|---|---|
| EDGAR poll (submissions + XBRL companyfacts) | `scripts/hyperscalers/fetch-edgar.mjs` | `data/xbrl/<T>.json`, `data/filings.json`, `data/state.json` |
| Build | `scripts/hyperscalers/build.mjs` | `site/hiperescaladores/data/{financials,changelog,status}.js`, `site/hiperescaladores/csv/*.csv`, `data/{metrics,changelog,derivations}.json` |
| Validate | `scripts/hyperscalers/validate.mjs` | `site/hiperescaladores/{capex,fuera-de-balance}/data/quality.js` |
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

## Module 6 text items

`data/offbs.json` holds items read from the notes (leases not yet commenced, VIEs, JV debt, SPVs, RVGs, guarantees,
take-or-pay), each with filing accession, section, page and the quoted sentence; `status` stays `needs_review` until
a second reading of the cited page confirms the number (`verified`, `verifiedBy`, `verifiedOn`). Oracle's items are
read from `tools/oracle/data/obligations.json` (verified by the Oracle routine; page citation pending). `searched`
records items looked for and confirmed absent ("Not disclosed"). The look-through total is computed only when JV debt
has been read or confirmed absent; leases not yet commenced (undiscounted) are never added to present-value debt.

## Open items

- Register `hyperscalers` in `tools/watchdog/dashboards.json` once the first scheduled run has landed (registering
  before that makes the watchdog report "late").
- Phase 1b: curate `offbs.json` from the harvested notes for all ten companies (pages cited).
- Nebius quarterly figures come from 6-K press releases (no XBRL): T1-furnished text, to be added as curated items.
- Phase 2 (capacity, committed capacity, sites) and phase 3 (electricity, circular financing) need the owner's go.
