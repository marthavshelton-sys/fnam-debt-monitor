# Data-refresh watchdog

Answers one question every hour: has each dashboard's scheduled refresh landed on time? Its verdict is the
only basis on which the site shows a dashboard as up to date ("Al día"); the site calls nothing "live".

## Pieces

| File | Role |
|---|---|
| `.github/workflows/data-watchdog.yml` | Hourly at :12 UTC (and by hand, with a `dry_run` input). Read-only on every other workflow. |
| `scripts/watchdog/check.mjs` | Reads the Actions run history and open issues through the GitHub API, writes the verdicts, opens/closes alert issues. |
| `scripts/watchdog/lib.mjs`, `selftest.mjs` | Cron matching and the rules; the self-test runs before every check. |
| `tools/watchdog/dashboards.json` | Dashboard → workflow(s) and the alert labels of its own pipeline; grace and heartbeat hours. |
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
- The pages treat a status file whose `checkedAt` is more than 8 hours old as **unverified** for every dashboard
  (the watchdog rewrites it at least every 4 hours), so a stopped watchdog can never leave a stale "Al día" behind.

## Alarm

A late dashboard whose own pipeline has no alert open gets one issue titled
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
page, give the eyebrow dot `data-status-dot="<id>"` and load `/assets/data-status.js`.
