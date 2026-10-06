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

- Only scheduled runs count (`event=schedule`); dispatched diagnostics runs never do.
- A run's refresh **landed** when the run succeeded, or when it failed only after its `Commit …` step (source-link
  checks and alert steps run once the data is already in `main`).
- **Late**: no landed refresh since the second-to-last time the workflow's own cron was due, counting only due times
  at least 3 hours old. In words: two scheduled refreshes in a row failed or never ran. The schedule is read from the
  workflow file, so changing a cron needs no change here.
- **Alert**: on time, but an issue carrying one of the dashboard's `alertLabels` is open (`macro-source-down`,
  `macro-live-check`, `fiscal-health`, `mx-fiscal-health`, `mx-macro-health`).
- **Up to date** (`ok`, shown as "Al día"): on time, no alert open.
- **Prices stale** (`stale`, shown red and pulsing as "Precios desactualizados / Prices out of date"; owner's rule,
  6-Oct-2026: if any price is not updated, the watchdog flashes red): a dashboard with a `prices` block in
  `dashboards.json` has every listed feed read from the files in `main` (last dated CSV row, or a JSON field) and
  compared with the exchange's **last completed session**: the latest session whose close plus `settleHours` has
  passed (NYSE closes 16:00 New York; the nightly FactSet routine runs at 19:58, so Oracle uses 5 h and a day's close
  is required from 21:00 New York). Every feed must carry that session, the S&P 500 included (the runner tops it up
  from Yahoo/Stooq the same evening; `lagSessions` N would let a feed trail by N sessions and no feed uses it). Any
  feed behind → `stale`, which outranks the refresh verdict (`refreshStatus` keeps it). Sessions = weekdays minus the
  exchange's published holidays (`EXCHANGES` in `lib.mjs`, NYSE 2026–2028); outside those years the check reports
  `unverified` (the dashboard too, never "up to date"), names no session the pages could act on, and leaves an open
  alarm open: extend the calendar. Feed names are bilingual (`{ es, en }`); the published status file carries no file
  paths (they go to the console line and the alarm issue). The status row carries `prices.expected`, `prices.next` (the
  next session and the instant it becomes required) and one line per feed, so the pages can judge their own data
  between two checks: `data-status.js` paints the watchdog's verdict first, then (a second pass, 8 s fetch limit) reads
  the page's own latest close (`latestClose` in the first bytes of `market.js`, `OWN_CLOSE`) and turns the dot red on
  its own once `prices.next.requiredFrom` has passed and the page still shows an older close; a page never turns
  itself green. The Oracle phone header (which replaces the eyebrow below 760 px) carries the dot too. Alarm: one
  `SOURCE DOWN: watchdog - <dashboard> prices stale` issue (marker `<id>:prices`), closed at the first check that
  finds every feed current.
- The pages treat a status file whose `checkedAt` is more than 14 hours old as **unverified** for every dashboard
  (the watchdog rewrites it at every check: `heartbeatHours` is 11), so a stopped watchdog can never leave a stale
  "Al día" behind. The owner chose the 12-hour cadence (1-Oct-2026) to keep Cloudflare deploys to about two a day;
  the cost is that the panel and an alarm can trail a refresh by up to 12 hours.

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

Add an entry to `dashboards.json` (id, section, name es/en, url, workflow file names, alert labels). For a company
page, give the eyebrow dot `data-status-dot="<id>"` and load `/assets/data-status.js`. To watch its prices, add a
`prices` block (`exchange`, `settleHours`, `series` of `{ name, file, kind: "csv" | "json", field?, lagSessions? }`),
and, for the page-side check, an `OWN_CLOSE` entry in `data-status.js` plus a `latestClose` stamp in the first bytes of
the file it names. A new exchange needs its holiday calendar in `EXCHANGES` (the BMV has none yet).

### What the landing page shows beside the verdict (6-Oct-2026)

The watchdog's `lastSuccess` lags up to 12 hours, so the landing page's status grid now reads each dashboard's OWN data stamp
from the first bytes of its data file (`STAMPS` in `site/assets/data-status.js`: `generatedAt` of the market or data file,
`runAt` of `/macro/status.json`, `REFRESHED_AT` of the MX macro page) and prints it as "datos del <time>", keeping the
watchdog verdict (up to date / late / alert) beside it. The company pages set `data-status-time` on their header dot, so
the tooltip there shows the same time as the header. A new dashboard needs a `STAMPS` entry too.
