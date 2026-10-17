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

## Deploy

The workflow `.github/workflows/dispatcher-deploy.yml` deploys the Worker from GitHub's runner (by hand from the Actions
page, and on every merge that touches `tools/dispatcher/` or the rule it bundles). It needs two repository secrets, created
once by the owner (GitHub → Settings → Secrets and variables → Actions → New repository secret):

1. `CLOUDFLARE_API_TOKEN`: Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"
   template, account = the one that serves fnam.mx, zone resources not needed; copy the token once.
2. `DISPATCHER_GITHUB_TOKEN`: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens →
   Generate: repository access `marthavshelton-sys/fnam-debt-monitor` only; permissions **Actions: Read and write** and
   **Metadata: Read** (the minimum that lists runs and dispatches workflows); expiry one year, and note the date. The
   workflow uploads it to the Worker as its `GITHUB_TOKEN` secret on every deploy.

Then run the workflow once (Actions → "Deploy the dispatcher Worker" → Run workflow). Its last step says where to look:
Cloudflare dashboard → Workers & Pages → `fnam-dispatcher` → Logs shows one line every ten minutes ("no missed schedule"
or the dispatches); GitHub → Actions shows the runs it starts as "(by hand)" runs on main, which the watchdog credits
to the schedule they replaced (`tools/watchdog/README.md`, "Rules"). The Worker's own URL answers `GET /` with the same
report as a dry run (nothing dispatched); it is not meant to be linked from the site. The account id sits in
`wrangler.toml` (it is the id in the Pages project's dashboard URL, not a secret).

Rotate the GitHub token before it expires: replace the repository secret and run the workflow again. Removing the Worker
(`npx wrangler delete --config tools/dispatcher/wrangler.toml` from a logged-in computer, or the dashboard) leaves the
watchdog's own dispatch step as the only safety net.

## What it never does

- It never dispatches a workflow with a run queued or in progress (the concurrency group would only queue a second one).
- It never dispatches twice for one missed slot: the hand run it started is booked to that slot.
- It never touches a workflow outside `tools/watchdog/dashboards.json` (plus the watchdog itself).
- It sends no inputs: every refresh workflow's `workflow_dispatch` inputs have defaults that mean "the full refresh".
