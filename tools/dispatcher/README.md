# Dispatcher: start the refreshes GitHub drops or holds

GitHub Actions schedules are best effort. In the week of 13-Oct-2026 this repository's schedules started three to seven
hours late (the watchdog's own 03:50 UTC check at 08:31, the search index's 09:37 at 14:39, the airports hub's 17:30 at
21:54) and some never started (U.S. macro 12:50 and 13:50 UTC, Mexican Consumer 12:20 UTC). A `workflow_dispatch` run
starts within a minute, so a clock outside GitHub starts by hand every schedule GitHub has not started 40 minutes after
its due time. The rule lives once, in `scripts/watchdog/dispatch-lib.mjs`, and runs in two places:

1. **The watchdog run** (`.github/workflows/data-watchdog.yml`, last step, `scripts/watchdog/dispatch-missed.mjs`): a
   safety net that needs nothing from the owner, but it runs only when GitHub starts the watchdog itself.
2. **This Cloudflare Worker** (`worker.mjs`, cron every 10 minutes, `wrangler.toml`): the clock that does not depend on
   GitHub. It also starts the watchdog's own 03:50 and 15:50 UTC checks when they are late. Cloudflare's cron triggers
   fire to the minute on the free plan; 144 runs a day cost nothing, and each run makes about twenty GitHub API calls
   (5,000 an hour allowed with a token).

## Deploy (once, by the owner)

1. Create a fine-grained GitHub personal access token (GitHub → Settings → Developer settings → Fine-grained tokens):
   repository access `marthavshelton-sys/fnam-debt-monitor` only; permissions **Actions: Read and write** and
   **Metadata: Read** (the minimum that lets it list runs and dispatch workflows); expiry one year, and note the date.
2. From the repository root, with the Cloudflare account that owns fnam.mx:
   ```
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN --config tools/dispatcher/wrangler.toml   # paste the token
   npx wrangler deploy --config tools/dispatcher/wrangler.toml
   ```
3. Check: Cloudflare dashboard → Workers & Pages → `fnam-dispatcher` → Logs show one line per 10 minutes ("no missed
   schedule" or the dispatches); GitHub → Actions shows the dispatched runs as `workflow_dispatch` runs on main, which
   the watchdog credits to the schedule they replaced (`tools/watchdog/README.md`, "Rules"). The Worker's own URL answers
   `GET /` with the same report as a dry run (nothing dispatched); it is not meant to be linked from the site.

Rotate the token before it expires (`wrangler secret put` again). Removing the Worker (`npx wrangler delete --config
tools/dispatcher/wrangler.toml`) leaves the watchdog's own dispatch step as the only safety net.

## What it never does

- It never dispatches a workflow with a run queued or in progress (the concurrency group would only queue a second one).
- It never dispatches twice for one missed slot: the hand run it started is booked to that slot.
- It never touches a workflow outside `tools/watchdog/dashboards.json` (plus the watchdog itself).
- It sends no inputs: every refresh workflow's `workflow_dispatch` inputs have defaults that mean "the full refresh".
