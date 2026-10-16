# Data-refresh watchdog

Answers two questions every 12 hours: has each dashboard's scheduled refresh landed on time, and does every price
feed a page shows carry the exchange's last completed session? Its verdict is the only basis on which the site shows a
dashboard as up to date ("Al día"); the site calls nothing "live".

## Pieces

| File | Role |
|---|---|
| `.github/workflows/data-watchdog.yml` | Every 12 hours, 03:50 and 15:50 UTC (21:50 and 09:50 in Mexico City), each just after a batch of refreshes; also by hand, with a `dry_run` input. Read-only on every other workflow. |
| `scripts/watchdog/check.mjs` | Reads the Actions run history and open issues through the GitHub API, writes the verdicts, opens/closes alert issues. |
| `scripts/watchdog/lib.mjs`, `selftest.mjs` | Cron matching and the rules; the self-test runs before every check. |
| `tools/watchdog/dashboards.json` | Dashboard → workflow(s) and the alert labels of its own pipeline; its price feeds (`prices`); grace and heartbeat hours. |
| `site/status/refresh.json` | The verdicts, served with `Cache-Control: no-store`. |
| `site/assets/data-status.js` | Reads the verdicts for the landing page panel ("Last successful data refresh") and the status dot in each company page's header. |

## Rules

- Scheduled runs count (`event=schedule`). A run started by hand on `main` (`workflow_dispatch`) counts as a landed refresh
  only when its `Commit …` step succeeded: a probe or dry run ends green without committing, so a green conclusion alone
  never counts, and a run on another branch commits there. Added 9-Oct-2026 so a failed nightly refresh re-run by hand does
  not leave the page "late" until the next schedule; `lastAttempt` still reports the newest scheduled run. Every hand run of
  the last 14 days is credited to the schedule it replaced (`handRunsToCheck`, `creditHandRun` in `lib.mjs`), not only those
  newer than the newest scheduled landed run: on 10/11-Oct-2026 ASUR read "late" all weekend, with every file current,
  because the credit for its Friday hand run (the filings the 14:40 schedule had failed) stopped once the evening market
  schedule landed. Since 12-Oct-2026 a hand run that committed also stands in for the latest due time at or before its start of
  **each** schedule of its own workflow (it does the whole job of every schedule), not only the latest due time overall: on
  12-Oct GitHub never started the 13:50 UTC U.S. macro, 14:10 UTC American Consumer and 19:25 UTC MX macro schedules, later
  schedules landed, and a hand run was credited to a slot already covered, so the three read "late" with every file current.
  A scheduled run still covers only the slot it belongs to; a hand run never covers a slot after its start or another
  workflow's schedule (`creditHandRun` carries its workflow's crons; `perCronLate`; tested in `selftest.mjs`). So when GitHub
  skips a schedule, dispatch that workflow on main and then the watchdog.
- A run's refresh **landed** when the run succeeded, or when it failed only after its `Commit …` step (source-link
  checks and alert steps run once the data is already in `main`).
- **One run, one record** (9-Oct-2026): `lastSuccess` is the newest landed refresh; `lastAttempt` is the newest completed
  scheduled run with its *refresh* outcome: `result: "success"` when its data landed, else the run's own conclusion
  (`failure`, `cancelled`...). A run that committed and then failed a later step (OMA's source-link check found a dead
  link on 8/9-Oct-2026) is that landed refresh, recorded as `success` with `afterCommitFailure: true`, never as a failure
  at the same instant as `lastSuccess` (`attemptRecord` in `lib.mjs`, tested in `selftest.mjs`).
- **Late**: no landed refresh since the last time the workflow's own cron was due, counting only due times at least
  `graceHours` old (`dashboards.json`: 12 hours since 16-Oct-2026, 3 before). In words: the last scheduled refresh failed
  or never ran. Why 12: GitHub started this repository's schedules three to seven hours late in the week of 13-Oct-2026
  (the watchdog's own 03:50 UTC check at 08:31, 09:03 and 11:10; the search index's 09:37 at 14:39; the airports hub's 17:30 at
  21:54, against under 15 minutes until 12-Oct), so with 3 hours every dashboard read "late" with every file current; a
  failed run still shows the same day. The grace is printed in `refresh.json → graceHours` and in its `rule`. Until 9-Oct-2026 two misses in a row were
  needed, which left the MX fiscal page "up to date" for a day after its 8-Oct refresh failed (the owner asked for a
  failed or stale refresh to be flagged the same day). The schedule is read from the workflow file, so changing a cron
  needs no change here. Since 9-Oct-2026 each cron of a workflow is also judged on its own (`perCronLate`): a run belongs
  to the cron its title names (since 16-Oct-2026 every scheduled workflow sets `run-name` to "<workflow name> (cron
  <github.event.schedule>)", so GitHub's own record of which schedule fired reaches the API as `display_title`;
  `cronFromTitle` in `lib.mjs`): the latest due time of THAT cron at or before its start, however late GitHub started it.
  A run whose title names no cron (before that date, a hand run) belongs to the latest due time of any of the workflow's
  crons at or before its start (GitHub starts schedules minutes to hours late). Why the title: on 15-Oct-2026 the Oracle
  20:35 UTC schedule started at 23:15, after the 21:45 due time, was booked as the 21:45 run, and the 20:35 cron read
  "late" with every file current; the U.S. macro 12:50 and Mexican Consumer 12:20 schedules read late for days the same
  way (they start four to five hours late and were booked to the 14:05 / 15:20 crons). A cron whose last due time has
  no landed run of its own makes the dashboard late even when another cron keeps landing. Why: the ASUR workflow's market-only run (22:50 UTC) succeeded on 8-Oct-2026 while
  its filings run (14:40 UTC) failed on the 8th and 9th on an unparsed traffic release, and the dashboard read "ok". A
  refresh re-run by hand on main that committed counts for the schedule it replaced; due times older than the oldest run
  on the page fetched (30 runs) are not judged.
- **Alert**: on time, but an issue carrying one of the dashboard's `alertLabels` is open (`macro-source-down`,
  `macro-live-check`, `fiscal-health`, `mx-fiscal-health`, `mx-macro-health`).
- **Up to date** (`ok`, shown as "Al día"): on time, no alert open.
- **Data stale** (`stale`, the same red pulsing state as prices, shown as "Datos desactualizados / Data out of date"; the
  tooltip names the feed): a dashboard with a `data` block in `dashboards.json` has each monthly feed read from `main`
  (`kind: "js" | "json"`, `field` a dotted path such as `coverage.1`, the latest month of the airport pages' `traffic.js`)
  and compared with the month its publisher's calendar requires (`requiredMonth`, `monthlyVerdict` in `lib.mjs`): month M−1
  once day `dueDay` of month M has ended in Mexico City, month M−2 before that. GAP, OMA and ASUR use `dueDay` 10 (they
  publish traffic around the 5th–8th; the 10th gives a late release its grace), so from 11-Oct 00:00 CDMX the file must carry
  September. Any feed behind → `stale` and one `SOURCE DOWN: watchdog - <dashboard> data stale` issue (marker `<id>:data`),
  closed at the first check that finds the file current. Added 9-Oct-2026: ASUR's traffic file had stopped at August for two
  days while its prices were current and the dashboard read "ok".
- **Prices stale** (`stale`, shown red and pulsing as "Datos desactualizados / Data out of date", the feed named in the tooltip; owner's rule,
  6-Oct-2026: if any price is not updated, the watchdog flashes red): a dashboard with a `prices` block in
  `dashboards.json` has every listed feed read from the files in `main` (last dated CSV row, or a JSON field) and
  compared with the exchange's **last completed session**: the latest session whose close plus `settleHours` has
  passed (NYSE closes 16:00 New York; the nightly FactSet routine runs at 19:58, so Oracle uses 5 h and a day's close
  is required from 21:00 New York). A feed with `lagSessions` N (FRED posts a day late) may trail by N sessions. Any
  feed behind → `stale`, which outranks the refresh verdict (`refreshStatus` keeps it). Sessions = weekdays minus the
  exchange's published holidays (`EXCHANGES` in `lib.mjs`: NYSE 2026–2028 from the NYSE's calendar; BMV 2026 from the BMV's
  "Calendario de días festivos", which the BMV publishes one year at a time, so extend it every December); outside those
  years the check reports `unverified` (the dashboard too, never "up to date"), names no session the pages could act on,
  and leaves an open alarm open: extend the calendar. A series may carry its own `exchange`: the airport pages (GAP, ASUR,
  OMA, added 6-Oct-2026) watch, on the BMV calendar with 5 h settle (close 15:00 Mexico City, the FactSet routine runs at
  19:52 New York), the listing's FactSet close in `tools/gap/raw/factset/prices.json` (`latestClose.<FactSet id>`), the
  ADS's FactSet close on the NYSE calendar, and the close the page prints (`latestClose` in `site/<slug>/data/market.js`,
  `kind: "js"`), so a stopped FactSet pull shows even while Yahoo keeps the page current. The financial pages (Quálitas,
  Gentera, added 8-Oct-2026; their FactSet routine runs at 20:13 New York) watch the same way the listing's FactSet close in
  `tools/<slug>/raw/factset/prices.json`, the FactSet closes of the peers of their rebased chart that trade on the BMV or the
  NYSE (Porto Seguro on the B3 and Mapfre on the BME have no calendar here and are not watched), and the page's close. Feed names may be bilingual
  (`{ es, en }`); the published status file carries no file paths (they go to the console line and the alarm issue). The
  status row carries `prices.expected`, `prices.next` (the next session and the instant it becomes required) and one line
  per feed, so the pages can judge their own data between two checks: `data-status.js` paints the watchdog's verdict
  first, then (a second pass, 8 s fetch limit) reads the page's own latest close (`latestClose` in the first bytes of
  `market.js`, `OWN_CLOSE`) and turns the dot red on its own once `prices.next.requiredFrom` has passed and the page
  still shows an older close; a page never turns itself green. The Oracle phone header (which replaces the eyebrow below
  760 px) carries the dot too. Alarm: one `SOURCE DOWN: watchdog - <dashboard> prices stale` issue (marker `<id>:prices`),
  closed at the first check that finds every feed current.
- The pages treat a status file whose `checkedAt` is more than 14 hours old as **unverified** for every dashboard
  (the watchdog rewrites it at every check: `heartbeatHours` is 11), so a stopped watchdog can never leave a stale
  "Al día" behind. The owner chose the 12-hour cadence (1-Oct-2026) to keep Cloudflare deploys to about two a day;
  the cost is that the panel and an alarm can trail a refresh by up to 12 hours.

## Starting the schedules GitHub drops (16-Oct-2026)

GitHub Actions schedules are best effort; a `workflow_dispatch` run starts within a minute. `scripts/watchdog/dispatch-lib.mjs`
holds one rule: for each refresh workflow of `dashboards.json`, a cron whose latest due time is at least 40 minutes old and has
no run on main booked to it (the per-cron rule above, with a run still queued or in progress counting as started) makes the
workflow missed, and a missed workflow is dispatched once on main (never while a run of it is queued or in progress; the hand
run it starts is booked to the slot, so never twice). It runs in two places: `scripts/watchdog/dispatch-missed.mjs` as the last
step of `data-watchdog.yml` (`actions: write`; `--dry-run` lists without dispatching), and the Cloudflare Worker in
`tools/dispatcher/` every ten minutes, which also starts the watchdog's own checks when they are late and needs a fine-grained
token the owner sets once (its README). A dispatched run is credited to the schedule it replaced (`creditHandRun`).

## Alarm

A dashboard with a stale price feed gets one issue titled `SOURCE DOWN: watchdog - <dashboard> prices stale` (label
`data-watchdog`, one table row per feed with its file, latest date and the session needed), closed by the first check
that finds every feed current. A late dashboard whose own pipeline has no alert open gets one issue titled
`SOURCE DOWN: watchdog - <dashboard> refresh late`, label `data-watchdog`, opened by github-actions[bot]. The
owner's email routine ("FNAM US Macro: email material changes") sends every `SOURCE DOWN: ` issue of its window
(`tools/macro/README.md`). The first on-time check comments and closes the issue.

## By hand

```
node scripts/watchdog/selftest.mjs
node scripts/watchdog/check.mjs --dry-run                         # verdicts and the issues it would open/close
node scripts/watchdog/check.mjs --dry-run --now 2026-10-03T12:00:00Z   # replay the rules at another time
```

In a Claude session the GitHub API answers only through the egress proxy: prefix `NODE_USE_ENV_PROXY=1`.

## Adding a dashboard

Add an entry to `dashboards.json` (id, section, name es/en, url, workflow file names, alert labels) with `since` = the
instant its refresh workflow reaches `main` (ISO, UTC): schedules due before it are not judged, so the dashboard does not
read "late" on its first day for runs that could not have happened (American Consumer, 11-Oct-2026). For a company
page, give the eyebrow dot `data-status-dot="<id>"` and load `/assets/data-status.js`. To watch a monthly data file, add a `data` block (`timeZone`, `dueDay`, `series` of `{ name, file, kind: "js" | "json", field }`). To watch its prices, add a
`prices` block (`exchange`, `settleHours`, `series` of `{ name, file, kind: "csv" | "json" | "js", field?, lagSessions?,
exchange? }`), and, for the page-side check, an `OWN_CLOSE` entry in `data-status.js` plus a `latestClose` stamp in the
first bytes of the file it names. A new exchange needs its holiday calendar in `EXCHANGES` (NYSE and BMV so far).

### What the landing page shows beside the verdict (6-Oct-2026)

The pages treat a `checkedAt` older than 20 hours as unverified (`STALE_HOURS` in `data-status.js`: one 12-hour interval plus
eight hours for GitHub's delays; 14 until 16-Oct-2026, which turned every card "unverified" on the days the check started five
hours late). The watchdog's `lastSuccess` lags up to 12 hours, so the landing page's status grid now reads each dashboard's OWN data stamp
from the first bytes of its data file (`STAMPS` in `site/assets/data-status.js`: `generatedAt` of the market or data file,
`runAt` of `/macro/status.json`, `REFRESHED_AT` of the MX macro page) and prints it as "datos del <time>", keeping the
watchdog verdict (up to date / late / alert) beside it. The company pages set `data-status-time` on their header dot, so
the tooltip there shows the same time as the header. A new dashboard needs a `STAMPS` entry too.
