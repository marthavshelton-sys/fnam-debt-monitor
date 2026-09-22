# Quálitas model — weekday reviewing routine

This is the prompt for the reviewing routine that keeps the *curated* half of the Quálitas model current
(the automatic half is `.github/workflows/qualitas-refresh.yml`). It is meant to run as a Claude Code
scheduled task / Routine with access to the repository `marthavshelton-sys/fnam-debt-monitor`, each weekday
at 09:00 Mexico City time (≈ 15:00 UTC, forty minutes after the 14:35 UTC filings refresh), and to end with
a short note that the platform emails to the owner only when something material happened.

## What to check (in this order)

1. Load the live data files (no-cache): `https://fnam.mx/qualitas/data/{financials,operations,market,guidance,
   comments,summary,reference,quality}.js` and the state file `tools/qualitas/notify-state.json` on `main`.
   Also read `site/qualitas/data/alerts.js` (owner thresholds).
2. Decide whether anything material landed since the state file was written:
   * **New quarter**: `Q_FIN.quarters[-1].id` newer than `state.lastQuarter`.
   * **New operating quarter**: latest `Q_OPS` quarter with `units.total` newer than `state.lastOpsQuarter`.
   * **New or revised expectations**: a results report or call newer than `state.lastGuidanceDate` (Quálitas
     gives its expectations for the year in the 4Q report/call and reaffirms or nuances them every quarter).
   * **Corporate events**: new items on the IR "eventos relevantes" page (dividend decree, AGM resolutions,
     buyback fund, rating actions, acquisitions, executive changes, VAT/regulatory news) since
     `state.lastReferenceUpdatedAt`.
   * **Thresholds** (`data/alerts.js`): a daily or five-day move in Q* beyond the limits, the latest quarter's
     combined or loss ratio above the limits, the solvency index or 12M ROE below the limits, any expectation
     metric tracking outside its range on the reported year-to-date, a ±50 bp week in the 10-year M bond.
   * **Pipeline health**: `Q_QUALITY.ok === false`, a stale series (`Q_QUALITY.stale[].status === "warn"`
     for the price/FX series), a workflow run that failed, or `curated[]` items behind the latest quarter.
3. If nothing above is true, finish with the single line `No material change in Quálitas data today.`
   and do not edit anything. (The platform does not email on that line.)

## What to do when a new quarter lands

Work on a branch, then open a pull request against `main` (the owner merges it) unless the owner has
enabled direct commits for this routine.

* **Comments** (`site/qualitas/data/comments.js`): add the quarter (`YYYYQn`), the year-to-date period
  (`YYYYMm`, m = 3n) and, for a 4Q, the fiscal year (`FYYYYY`). One line per income-statement key
  (`written … netIncome`) and per ratio row (`acqRatio, lossRatio, opRatio, combined`), the balance-sheet
  keys that moved (`bs`), the cash-flow keys (`cf`, YTD/FY statements), the operating keys (`ops`), ES and EN.
  Source: the results report (`tools/qualitas/raw/text/reports/YYYYQn.txt`) first; when the owner supplies the
  earnings-call transcript, fold it in and add `quotes` (speaker, role, date, ES/EN) for the lines where
  management gave colour. Quote percentages as Quálitas prints them.
* **Expectations** (`site/qualitas/data/guidance.js`): add a vintage `{fy, kind: initial|reaffirmed|revised,
  date, quarter, source, items{written, lossRatio, combined, rif, roe}, notes}` from the "Expectativas" page
  of the 4Q report and the call. Map words to ranges the same way as the existing vintages (high single
  digits = 7–9, low double digits = 10–12, etc.) and keep the wording in `text`.
* **Executive summary** (`site/qualitas/data/summary.js`): rewrite the four cards (three bullets each) and
  the `basis` block. Figures quoted must tie to `financials.js`/`operations.js`.
* **Reference facts** (`site/qualitas/data/reference.js`): shares/treasury from the report, dividends and
  AGM resolutions, ratings, subsidiaries milestones, VAT timeline, analysts' initiations; bump `updatedAt`.
* Run `python scripts/qualitas/validate_data.py` (it also refreshes `quality.js`) and make sure both
  language versions show the same figures (the page renders one data set; only labels change).
* Update `tools/qualitas/notify-state.json` (`lastQuarter`, `lastOpsQuarter`, `lastGuidanceDate`,
  `lastCommentsUpdatedAt`, `lastSummaryUpdatedAt`, `lastReferenceUpdatedAt`, `lastNotifiedAt`,
  `lastAlertKeys`) in the same pull request.

## The note (only on material days)

Concise, in English (the owner reads both languages), five parts:

1. Headline figure (e.g. "3Q26: written premiums Ps. X M (+y% y/y), combined ratio z%, net income Ps. w M").
2. What changed, each item with the source link (report PDF, SIFIC filing, material-event URL).
3. Why it matters (two or three sentences: versus expectations, versus the long-term ranges, valuation effect).
4. What to watch next (next release date, pending items, thresholds close to their limit).
5. Link to the model `https://fnam.mx/qualitas/` and, after a results release, a request for the call
   transcript and any PDF the archive still lacks (`Q_QUALITY.parse[]`, `tools/qualitas/README.md`).

A pipeline problem (validation failure, stale prices for more than a week, failed workflow run) is reported
as a one-line alert once per distinct failure (`state.lastFailureNote`), not every day.

## Hand-supplied inputs

Earnings-call transcripts (FactSet/CallStreet PDFs) and old report PDFs are never committed. Transcripts
enrich `comments.js` (`quotes`) and `guidance.js` (`notes`); old PDFs go through `scripts/qualitas/harvest.py`
(`--years`) or are dropped in `tools/qualitas/raw/pdf/` and converted with the same script.
