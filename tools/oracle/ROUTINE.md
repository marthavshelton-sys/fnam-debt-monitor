# Oracle weekday reviewing routine

The GitHub workflow (`oracle-refresh.yml`) keeps prices and the filing archive current, but it never
writes a figure into `quarters.json`: numbers enter the model only through a reviewed step. That step is a
**Claude routine** (a scheduled Claude Code task with repository, browser and Gmail access), the same
mechanism the GAP model and the U.S. fiscal monitor use. It needs no API key and no mail provider: the
routine's own session does the reading, drafting and emailing.

Suggested schedule: **weekdays at 08:30 Mexico City (14:30 UTC)**, one hour after the 13:30 UTC harvest.
Oracle reports after the close around the 10th–12th of September, December, March and June and files the
8-K the same evening, so the routine sees a new quarter the next morning.

State lives in `tools/oracle/notify-state.json` (last quarter, last filing, last guidance vintage, last
alert). Thresholds live in `tools/oracle/data/alerts.json`.

## Prompt (paste as the routine's task; it is self-contained)

> This is a fully autonomous weekday check for the Oracle financial model at https://fnam.mx/oracle
> (repository marthavshelton-sys/fnam-debt-monitor, folder `site/oracle` + `tools/oracle` + `scripts/oracle`).
> No user is present — do not ask questions; make reasonable judgment calls and proceed. Never push straight to
> `main`: every change goes through a pull request, which the routine merges itself when the merge condition of
> the step is met (self-merge policy approved by the owner on 2026-09-24; see "Merge policy" below). Use public
> information only (SEC filings, Oracle's investor site, official market data); never seek or use non-public
> information.
>
> STEP 1 — Sync. Work only in the routine's own clone `C:\Users\MARTH\OneDrive\Desktop\Talipot\fnam-oracle-routine`
> (never in the shared `fnam-debt-monitor` clone or the `fnam-oracle-wt` worktree, which other sessions and the
> other pages' work use). Run `git fetch --prune origin` and `git checkout main && git pull --ff-only`. Read
> `tools/oracle/notify-state.json`.
>
> STEP 2 — Harvest. Run `node scripts/oracle/harvest-filings.mjs` (EDGAR is reachable from this machine even
> when it refuses GitHub's runners). Then read `tools/oracle/data/state.json`. If `pending_extraction` has an
> 8-K with status "pending", a new quarter has landed → STEP 3. If it has a new 10-Q or 10-K → STEP 4.
> Otherwise → STEP 5.
>
> STEP 3 — New quarter. Open the archived exhibit named in `pending_extraction[].archived`. Following
> `tools/oracle/README.md` §"Adding a quarter" and the schema of the latest record in
> `tools/oracle/data/quarters.json`, write a `tools/oracle/data/_raw_fy20xx.json` in the shape of the existing
> `_raw_fy2026.json` (GAAP statement, Non-GAAP reconciliation, balance-sheet highlights, cash flow — Q2–Q4
> cash flows are cumulative in Oracle's release and must be made discrete by subtracting the previous
> cumulative release — RPO, dividend declared, guidance issued, D&A), then run `node scripts/oracle/merge-raw.mjs`.
> Draft the Comments column and the executive-summary bullets for the quarter (bilingual, driver-only, one clause
> per line of the income statement, balance sheet, cash-flow statement and operating-metrics card, sourced to
> the release page or the call page and speaker) into `tools/oracle/data/_raw_comments_c.json` in the shape of
> `_raw_comments_b.json`, then run `node scripts/oracle/merge-comments.mjs`. Every free-text field the page shows must be
> bilingual: guidance vintages carry `_note`/`_note_es`, `fy_capex_note`/`fy_capex_note_es` and
> `multi_year_targets.note`/`note_es`; buildout sites carry `capacity_text`, `customer`, `developer`, `financing`,
> `oracle_status`, `contracted`, `first_delivery` each with an `_es` counterpart. When the call transcript is available,
> also add the quarter's buildout disclosures (megawatts delivered, GPU utilization, renewals, GPUs delivered, new
> or updated sites) to `tools/oracle/data/buildout.json` with page and speaker, marking any computed figure `derived`,
> and refresh `promises` (what management said it will deliver: capacity, sites, timing, capex) — newest call first,
> set `promises.as_of` to the quarter, and add an `outcome_en/es` to any earlier promise the new call resolved. The
> page shows the block as stale whenever `as_of` is older than the latest quarter. Mark the filing `done` in
> `state.json`. Run `node scripts/oracle/build.mjs`; it must print "0 failed" for both the tie-out and the
> parser tests — if not, fix the transcription (a failure is almost always a typo, not an Oracle error) and
> re-run. Open a pull request from a branch named `oracle/<fy>q<n>-results` with title
> "oracle: <nQyy> results" and a body listing the headline figures with the exhibit URL. Merge condition: both
> guards reported 0 failed → merge it yourself (`gh pr merge <n> --squash --delete-branch`); otherwise leave it
> open and say so in the email.
>
> STEP 4 — New 10-Q / 10-K. Read the filing on EDGAR. From a 10-K, update `fiscal_years.json` (annual
> statement, D&A) and the debt footnote into `market_reference.json` → `debt_instruments` (every note,
> principal, coupon, maturity; must reconcile to the disclosed gross total) and the shares outstanding on
> the cover; from a 10-Q, update the shares outstanding on the cover and any new or retired debt. Run the
> build and open a PR as in STEP 3 (branch `oracle/<form>-<period>`).
>
> STEP 5 — Events. Fetch Oracle's press-release list from the Q4 JSON endpoint with the full parameter set
> `investor.oracle.com/feed/PressRelease.svc/GetPressReleaseList?LanguageId=1&bodyType=0&pressReleaseDateFilter=3&categoryId=1cb807d2-208f-4bc3-9133-6a9ad45ac3b0&pageSize=20&pageNumber=0&tagList=&includeTags=true&year=<year>&excludeSelection=1`
> (the short query without `categoryId` returns an empty list since 2026-09-24; the RSS view answers HTTP 403 to
> scripts) and list Oracle's EDGAR submissions (`data.sec.gov/submissions/CIK0001341439.json`) for items newer than
> `notify-state.lastEventDate`: debt issuances or redemptions, dividend changes, rating actions (also check
> the three agencies' Oracle pages), buybacks, major contracts, capex or data-center announcements. Record facts with
> their source in `market_reference.json` (ratings, instruments), `buildout.json` (sites) or `special_situations.json`
> (AI buildout timeline) and open a PR if anything changed.
>
> STEP 6 — Materiality. Read `tools/oracle/data/alerts.json`. A day is material if any of: a new quarter or
> 10-Q/10-K was filed; a guidance range changed (compare `guidance.json` vintages with
> `notify-state.lastGuidanceIssuedIn`); a rating action; a debt issuance or redemption; the ORCL close in
> `prices_orcl_daily.csv` moved more than `share_move_pct_1d` in one day; net debt / LTM EBITDA in
> `site/oracle/data/financials.js` exceeds `net_debt_to_ltm_ebitda_max`; or a PR opened today by this routine.
>
> STEP 7 — Email only on a material day, using the Gmail connector (`send_message`) to
> marthavshelton@gmail.com. Subject: "Oracle model: " + a headline under eight words (e.g. "1Q27 results:
> revenue +30%, RPO $664bn"). Body in plain text, under 150 words: one line per material item with old →
> new values and dates and the source link; two or three sentences of analysis (why it matters against the
> guidance and the leverage trend already on the page; what to watch next); the PR link if one was opened;
> a request for the earnings-call transcript PDF if a new quarter landed (it enriches the Comments column
> and guidance); and the line "Full detail: https://fnam.mx/oracle". End with
> "Sent automatically by the Oracle model routine. Co-Authored-By: Claude <noreply@anthropic.com>".
> Quiet days: send nothing.
>
> STEP 8 — Always: update `tools/oracle/notify-state.json` (lastQuarter, lastFilingSeen,
> lastGuidanceIssuedIn, lastEventDate, lastMarketClose, lastNotifiedAt, lastFailureNote) — inside the PR
> when one was opened, otherwise as a small PR of its own only if a value changed. If the harvest, the build
> or the fetch fails, do not email about it; set lastFailureNote and stop so the next run retries.

## Merge policy (approved by the owner on 2026-09-24)

The routine merges its own pull requests when a machine check stands behind the change, so the page updates
with no action by the owner:

* **Results and 10-Q/10-K PRs** are merged when `node scripts/oracle/build.mjs` reports 0 failed for both the
  tie-out (329 accounting identities) and the parser tests (26 printed figures per quarter re-read from the
  archived exhibit). A failure leaves the PR open and is reported in the email.
* **Event PRs** are merged when every new fact carries a primary source (SEC filing, Oracle IR release, the
  agency's own rating release, the developer's or partner's own release). A fact that rests only on press
  reports leaves the PR open for the owner and is flagged in the email and in `PENDING.md`.
* **notify-state PRs** are merged immediately; they only record the routine's state.

The material-day email lists every merged PR with its link, so the owner can revert any commit after the fact.

## What updates by itself, and what does not

| Element | Mechanism | Cadence | Needs the owner? |
|---|---|---|---|
| Share price, S&P 500, 10-year Treasury, market cap, multiples, DCF price inputs | GitHub Actions `oracle-refresh.yml` → Cloudflare Pages deploy | weekdays 13:30 and 21:45 UTC | No |
| Filing archive (8-K, 10-Q, 10-K) and `state.json` | same workflow (EDGAR, IR JSON feed fallback) | weekdays 13:30 UTC | No |
| Statements, guidance, Comments, summary, buildout, debt, ratings, events | this routine, via a pull request it merges itself (merge policy above) | weekdays 08:30 local | Only for press-sourced facts or a failed guard (the email says which) |
| Transcript-based blocks (call quotes, MW delivered, promises, call-page comments) | this routine once the PDF is in the private `oracle-model` repo | after each call | Yes: supply the transcript PDF |
| Peers, CDS, consensus | FactSet connector | daily once connected | Yes: authorise the connector |

The page shows an "automatic update pending" notice (`dataNotice`, from `data/quality.js` and the page's own
data) whenever the share price is older than five days, the latest quarter is older than 100 days, an archived
filing awaits extraction, a tie-out failed or the data pipeline has not run for four days, so a stale element is
never silent.

## Creating it

From Claude Code (desktop app or claude.ai/code → Routines): "create a scheduled task named
*FNAM Oracle: weekday review*, weekdays at 08:30, with the prompt in tools/oracle/ROUTINE.md". The desktop
task runs while the app is open (and on next launch if it was closed); a claude.ai/code routine runs in the
cloud. Either way the email is sent by the routine's own Gmail connector, and every repository change is a
pull request the routine merges under the policy above. The routine needs its own clone (`Talipot\fnam-oracle-routine`) listed in
the project's `.claude/settings.local.json` under `additionalDirectories` and in an `Edit(...)` allow rule, so it
never prompts and never touches the working copies other sessions use.
