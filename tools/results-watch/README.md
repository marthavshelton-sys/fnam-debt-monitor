# Results watch — runbook

Keeps the six company dashboards current with each company's quarterly results without waiting to be asked (owner,
22-Oct-2026, after GAP's 3Q26 of 19-Oct, Quálitas' of 20-Oct and Gentera's of 21-Oct sat unprocessed for days).

## What runs

| Piece | Where | Cadence |
| --- | --- | --- |
| Results calendar | `site/<slug>/data/reference.js` → `calendar.nextResults` (GAP, OMA, ASUR, Quálitas) and `company.nextResults` (Gentera); `tools/oracle/data/calendar.json` (Oracle) | Edited in-session when a company announces a date (its own notice is the source; an estimate stays marked "≈" / `assumed: true` until then). FactSet's projections sit in `calendar.projected`, printed as estimates only. |
| Results watch | `scripts/lib/results-watch.mjs`, workflow `results-watch.yml` | Every three hours on weekdays, 23 minutes past the hour (UTC). `--dry-run` reports without dispatching. |
| Company refreshes | `<slug>-refresh.yml` (harvest → parse → validate → commit) | Their own schedules, plus the dispatches of the watch |

## Rule (today on the Mexico City calendar)

For each of GAP, OMA, ASUR, Quálitas and Gentera the watch reads the latest quarter in `financials.js` and the expected date of
the next one: the company's confirmed date from the calendar, else the median lag between quarter-end and release of the same
quarter over the last three years (the "≈" rule the pages and decks print).

* **due** — the date has passed and the quarter is not in `financials.js`: dispatch the refresh in `filings` mode (unless a run is
  queued, in progress or started in the last 150 minutes). From the third day, open one issue
  "MAINTENANCE: <company> <quarter> results not found (expected <date>)" with the label `fnam-maintenance` (the owner's email
  routine can read that label like the watchdog's) and keep dispatching.
* **landed** — the quarter is in `financials.js` and its release date is at most three days old: dispatch once a day so a corrected
  or restated release is re-read; close the maintenance issue of that quarter if one is open.
* **waiting** — otherwise; the next date is printed in the step summary.

Limitation: every harvester is incremental by URL (GAP: wire + investor-site PDFs; OMA/ASUR: wire; Quálitas/Gentera: IR site, PDF
sha-256 in the manifest). A release the company replaces at the same URL is re-read only by Quálitas and Gentera (their harvesters
compare the stored hash); GAP, OMA and ASUR re-read a release re-issued under a new URL or a new BMV notice. Oracle is not watched
here: its model has a daily pipeline of its own.

## When a release lands (the session's checklist; the routines do the automatic part)

1. Every quarterly series and its "último trimestre" stamps (`financials.js`, `operations.js`/`traffic.js`, `quality.js`) — automatic.
2. Executive summary, line comments and narrative in ES and EN (`summary.js`, `comments.js`) — in-session or by the company's upkeep
   routine, from the release and the call transcript; figures copied from the release with its URL and date (`sources`).
3. Balance-sheet valuation inputs (net debt, book value, loans) and the multiples built on them — read from `financials.js` by the
   engines; the FactSet debt snapshot (`reference.js → debt.instrumentsAsOf`) is refreshed in-session when FactSet posts the quarter.
4. Peers and consensus — the nightly FactSet routines.
5. Next report date (`calendar` / `company.nextResults`): the company's confirmed date, else "≈".
6. The deck (`?present=1`), the quality page and the hubs follow the data files.
7. Change log: `tools/results-watch/CHANGELOG.md` (company, quarter, old → new, sources) and the Maintenance alert.

Style in the curated files: accented Mexican Spanish, US English spelling; no repository paths, tool names or the owner's email in
public copy.
