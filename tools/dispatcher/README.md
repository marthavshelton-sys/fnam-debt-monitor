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

Live since 22-Oct-2026 at `https://fnam-dispatcher.marthavshelton.workers.dev` (the first by-hand run of the workflow at
11:39 UTC; the cron's hand runs show in Actions as "(by hand)" runs starting at :01, :11, :21… of the hour, and the FRED
proxy self-check passed at 12:41 UTC). The workflow `.github/workflows/dispatcher-deploy.yml` deploys the Worker from GitHub's
runner (by hand from the Actions page, and on every merge that touches `tools/dispatcher/` or the rule it bundles). It needs
three repository secrets, created once by the owner and all set (GitHub → Settings → Secrets and variables → Actions):

1. `CLOUDFLARE_API_TOKEN`: Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"
   template, account = the one that serves fnam.mx, zone resources not needed; copy the token once.
2. `DISPATCHER_GITHUB_TOKEN`: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens →
   Generate: repository access `marthavshelton-sys/fnam-debt-monitor` only; permissions **Actions: Read and write**,
   **Variables: Read and write** (so the deploy can record the Worker's address as `FRED_PROXY_URL`; without it the deploy
   reports and the variable is set by hand) and **Metadata: Read**; expiry one year, and note the date. The
   workflow uploads it to the Worker as its `GITHUB_TOKEN` secret on every deploy.

3. `FRED_PROXY_KEY`: any long random string (for instance the output of `openssl rand -hex 32`). It is the key the FRED
   proxy route below requires; the same value is uploaded to the Worker as its `PROXY_KEY` secret on every deploy.

After rotating a secret, run the workflow by hand (Actions → "Deploy the dispatcher Worker" → Run workflow); a merge that
touches the Worker deploys it on its own. The last step says where to look:
Cloudflare dashboard → Workers & Pages → `fnam-dispatcher` → Logs shows one line every ten minutes ("no missed schedule"
or the dispatches); GitHub → Actions shows the runs it starts as "(by hand)" runs on main, which the watchdog credits
to the schedule they replaced (`tools/watchdog/README.md`, "Rules"). The Worker's own URL answers `GET /` with the same
report as a dry run (nothing dispatched); it is not meant to be linked from the site. The account id sits in
`wrangler.toml` (it is the id in the Pages project's dashboard URL, not a secret).

Rotate the GitHub token before it expires: replace the repository secret and run the workflow again. Removing the Worker
(`npx wrangler delete --config tools/dispatcher/wrangler.toml` from a logged-in computer, or the dashboard) leaves the
watchdog's own dispatch step as the only safety net.

## FRED proxy

On 21-Oct-2026 FRED (the St. Louis Fed's data service) answered GitHub's runners with an HTML page instead of data, through
both the public CSV export and the keyed API, for every pipeline at once (the U.S. macro, U.S. fiscal, Oracle, both consumer
and the Mexican macro refreshes). The shared readers (`scripts/lib/fred.mjs` for the Node fetchers, `Invoke-FredJson` /
`Invoke-FredText` in `tools/macro/common.ps1` for the U.S. macro processors) now refuse anything that is not data, and when
this Worker is reachable they fetch the same URL once more through it: `GET <worker url>/fred?u=<encoded FRED url>` with the
header `X-FNAM-Key: <FRED_PROXY_KEY>`. The Worker forwards only `https://api.stlouisfed.org/…` and
`https://fred.stlouisfed.org/…`, only with the right key, and passes the answer back unchanged (the readers validate it as
they validate a direct answer, so a blocked Cloudflare address fails the same way, visibly).

The deploy workflow writes the Worker's `workers.dev` address into the repository variable `FRED_PROXY_URL` itself (its
last-but-one step; the workflow has `actions: write` for that), so nothing is copied by hand. If that step ever fails, set
the variable yourself: GitHub → Settings → Secrets and variables → Actions → **Variables** → `FRED_PROXY_URL` = the address
under Cloudflare → Workers & Pages → `fnam-dispatcher` → Settings → Domains & Routes, no trailing slash.
Every refresh workflow already passes `FRED_PROXY_URL` and `FRED_PROXY_KEY` to its steps; while either is empty the readers
report the direct refusal and the page keeps its last data. A browser check: `<worker url>/fred?u=https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`
without the header answers `403 forbidden`; with it (from a tool that can set a header), the CSV.

Assumption to confirm when the outage clears: GitHub's address ranges, not the key, are what FRED is refusing. If FRED starts
refusing Cloudflare's too, the readers' reasons name it ("proxy: HTML page instead of data") in the run log.

## BLS proxy

From 24-Oct-2026 the BLS Public Data API (`api.bls.gov/publicAPI/v2/timeseries/data/`) answered GitHub's runners with its
edge's HTML page ("The BLS website is busy", HTTP 503) on every call, for days, while the same API answered other networks;
four U.S. macro processors (core prices, PPI, supply chain, productivity) and the American Consumer page's Consumer
Expenditure block failed run after run and opened SOURCE DOWN issues, although nothing was wrong with the data. Every BLS
request now goes through one reader per language (`scripts/lib/bls.mjs` → `blsRequest` / `blsSeries`; `Invoke-BlsRequest` /
`Invoke-Bls` in `tools/macro/common.ps1`): three direct attempts twenty seconds apart, then once through this Worker,
`POST <worker url>/bls` with the same JSON body and the header `X-FNAM-Key: <FRED_PROXY_KEY>` (one key for both routes). A
body is accepted only when it is the API's JSON (an object with `status`); the Worker passes the answer back unchanged.
`GET <worker url>/bls?series=CUUR0000SA0&start=2025&end=2026` (with the header) sends one unkeyed request, for a probe.
Never call `api.bls.gov` with a bare `fetch` / `Invoke-RestMethod` again. The variables are the FRED proxy's; nothing new to set.
The flat files (`download.bls.gov/pub/time.series/`) answer the runner with 403 (checked 25-Oct-2026) and are not a fallback.

## What it never does

- It never dispatches a workflow with a run queued or in progress (the concurrency group would only queue a second one).
- It never dispatches twice for one missed slot: the hand run it started is booked to that slot.
- It never touches a workflow outside `tools/watchdog/dashboards.json` (plus the watchdog itself).
- It sends no inputs: every refresh workflow's `workflow_dispatch` inputs have defaults that mean "the full refresh".
