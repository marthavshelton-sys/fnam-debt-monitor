# FactSet peers refresh — routine prompt

Cloud routine **"FNAM Airports: FactSet peers refresh (cloud)"**, every night at 19:52 New York time (owner asked for
8 PM ET; the minute is jittered off the hour as the scheduler recommends). It pulls the FactSet AI-Ready Data
connector for GAP, ASUR, OMA and the four international peers, writes `tools/gap/raw/factset/latest.json`, rebuilds
`site/gap/data/peers.js`, `site/asur/data/peers.js` and `site/oma/data/peers.js`, and (since 2026-10-06, owner: "switch the
header price to FactSet too") pulls the last three months of daily closes of the six airport listings into
`tools/gap/raw/factset/prices.json` and overlays them on the three `data/market.js` files (`scripts/lib/factset-prices.mjs`
`ingest` + `apply`), then pushes to `main`. It edits nothing else. Routine id `trig_011SAh4eYS2gCw8LKP551Wkj` (created 2026-10-06 from a Claude Code session, which can attach neither
connectors nor repositories to a Routine: the FactSet connector was attached on the claude.ai Routines page the same
day, and the repository `marthavshelton-sys/fnam-debt-monitor` has to be added there too; the first manual run
(2026-10-06 11:10 UTC) pulled, built and validated everything but GitHub refused the push with 403 because the
repository was not among the session's sources; with the repository attached, the second run (13:57 UTC) pushed
`55e8aca8` to main in six minutes. STEP 1 carries a clone and an `add_repo` fallback for that case. The 15:13 UTC run of
2026-10-06 was the first with the daily closes (steps n, o, `factset-prices.mjs ingest` + `apply`): it pushed `83ba2758` in
eleven minutes after its first push was rejected because main had moved, rebuilding on the new main as STEP 4 now says). If the routine has
to be recreated, create it on that page with the FactSet connector attached and paste the block below as the prompt. The
calls, file names and definitions are documented at the top of `scripts/lib/factset-peers.mjs`.

---

This is a fully autonomous nightly task for the airport models at https://fnam.mx/gap, /asur and /oma (repository marthavshelton-sys/fnam-debt-monitor, checked out in your working directory as a configured source, so pushes to main are authorised). It refreshes the peers tables and the FactSet daily closes that the pages use as their share-price authority. No user is present; do not ask questions. Your final message must be one line. Use only the FactSet connector tools, the repository's scripts and git; never type a number into a data file yourself.

STEP 1 — Sync: if the working directory holds no checkout of the repository, clone it first (`git clone https://github.com/marthavshelton-sys/fnam-debt-monitor.git && cd fnam-debt-monitor`); if the clone, the fetch or a later push is refused with 403 (the repository is not among this session's sources), call the add_repo tool once (owner marthavshelton-sys, repo fnam-debt-monitor, access push) and retry that command; then `git fetch origin main && git checkout -b peers-$(date +%Y%m%d%H%M) origin/main` (a fresh branch from origin/main; never reset or fast-forward the checkout's own main). `git config user.name "Peers routine" && git config user.email "peers-routine@users.noreply.github.com"`. Set RUN=$(TZ=America/New_York date +%F) and FIVE=$(date -d "$RUN -5 years -6 weeks" +%F), BSFROM=$(date -d "$RUN -5 years -6 months" +%F), THREE=$(date -d "$RUN -3 months -3 days" +%F), WEEK=$(date -d "$RUN -8 days" +%F). Empty the pull directory: `rm -rf tools/gap/raw/factset/pull && mkdir -p tools/gap/raw/factset/pull` (it is gitignored).

STEP 2 — FactSet calls. Generate one request_id uuid and reuse it. IDS = ["GAPB-MX","ASURB-MX","OMAB-MX","AENA-ES","FRA-DE","FHZN-CH","AIA-NZ"]. Every result must end up as a file in tools/gap/raw/factset/pull/ with exactly the name given: when the tool returns the JSON inline, write it to that file verbatim with the Write tool (the whole `{"data": [...]}` object); when the tool says the result was saved to a file, copy that file there with `cp`. Never retype or summarise a result. If a call fails with a rate limit, wait a minute and repeat it once.
a) FactSet_GlobalPrices prices, ids IDS, startDate WEEK, endDate RUN, frequency D, currency LOCAL, fields ["price","volume"] → prices-recent-local.json
b) FactSet_GlobalPrices prices, ids IDS, startDate THREE, endDate RUN, frequency D, currency USD, fields ["price","volume","vwap","turnover"] → prices-usd-3m.json
c) FactSet_GlobalPrices market_value, ids IDS → market-value.json
d) FactSet_GlobalPrices annualized_dividends, ids IDS, currency LOCAL → dividends.json
e) FactSet_EstimatesConsensus consensus_rolling, ids IDS, periodicity NTMA, relativeFiscalStart 1, relativeFiscalEnd 1, currency ESTIMATE, no dates, one call per metric: EBITDA → ntm-ebitda.json, EPS → ntm-eps.json, SALES → ntm-sales.json
f) The same with startDate FIVE, endDate RUN, frequency W: EBITDA → ebitda-ntm-weekly.json, EPS → eps-ntm-weekly.json (large; the tool saves them to files)
g) FactSet_GlobalPrices prices, ids IDS, startDate FIVE, endDate RUN, frequency W, currency LOCAL, fields ["price"] → prices-weekly.json
h) FactSet_GlobalPrices shares_outstanding, ids IDS, startDate FIVE, endDate RUN, frequency AM → shares-monthly.json
i) FactSet_Fundamentals fundamentals, metrics ["FF_NET_DEBT","FF_MIN_INT_ACCUM"], currency LOCAL, audit AUDIT_CARD, fiscalPeriodStart BSFROM (a balance sheet must already be reported at the first week of the five-year history), fiscalPeriodEnd RUN: ids ["GAPB-MX","ASURB-MX","OMAB-MX","AENA-ES","FRA-DE"] periodicity QTR → bs-qtr.json; ids ["FHZN-CH","AIA-NZ"] periodicity SEMI → bs-semi.json
j) FactSet_Fundamentals fundamentals, metrics ["FF_SALES","FF_EBITDA_OPER","FF_NET_INC","FF_EBITDA_OPER_MGN","FF_PE"], currency LOCAL, audit AUDIT_CARD, no dates: ids ["GAPB-MX","ASURB-MX","OMAB-MX","AENA-ES","FRA-DE"] periodicity LTM → ltm-qtr.json; ids ["FHZN-CH"] periodicity LTM_SEMI → ltm-semi.json; ids ["AIA-NZ"] periodicity ANN → ltm-ann.json
k) FactSet_EstimatesConsensus consensus_fixed, ids ["GAPB-MX"], periodicity ANN, fiscalPeriodStart = the current calendar year, fiscalPeriodEnd = that year + 2, currency ESTIMATE, one call per metric: EBITDA → gap-fy-ebitda.json, SALES → gap-fy-sales.json, EPS → gap-fy-eps.json
l) FactSet_EstimatesConsensus consensus_rolling, ids IDS, metrics ["PRICE_TGT"], relativeFiscalStart 0, relativeFiscalEnd 0, currency ESTIMATE → price-targets.json
m) FactSet_EstimatesConsensus ratings, ids IDS, currency ESTIMATE → ratings.json
n) FactSet_GlobalPrices prices, ids ["GAPB-MX","ASURB-MX","OMAB-MX"], startDate THREE, endDate RUN, frequency D, currency LOCAL, fields ["price","volume"] → prices-daily-local.json
o) FactSet_GlobalPrices prices, ids ["PAC-US","ASR-US","OMAB-US"], startDate THREE, endDate RUN, frequency D, currency USD, fields ["price","volume"] → prices-daily-ads.json

STEP 3 — Build: `node scripts/lib/factset-peers.mjs ingest --date $RUN` (writes tools/gap/raw/factset/latest.json; it fails loudly if a pull file is missing or a company has no close, consensus or balance sheet — then fix the pull, never the script) and `node scripts/lib/factset-peers.mjs build` (writes the three peers.js files). Then `node scripts/lib/factset-prices.mjs ingest --date $RUN` (merges the two prices-daily files into tools/gap/raw/factset/prices.json: new sessions added, older history kept; it fails loudly when either file is missing or a listing came back without closes — then repeat steps n and o, never ingest a partial pull — and when the new closes disagree with the stored history on most overlapping dates, a split or restatement: then repeat steps n and o with startDate 2015-01-01 and run `node scripts/lib/factset-prices.mjs ingest --date $RUN --replace`) and `node scripts/lib/factset-prices.mjs apply` (overlays the closes on site/gap, site/asur and site/oma data/market.js). Then `node scripts/gap/validate-data.mjs`, `node scripts/asur/validate-data.mjs` and `node scripts/oma/validate-data.mjs` must each report 0 failures.

STEP 4 — Commit and push: `git add tools/gap/raw/factset/latest.json tools/gap/raw/factset/prices.json site/gap/data/peers.js site/gap/data/market.js site/gap/data/quality.js site/asur/data/peers.js site/asur/data/market.js site/asur/data/quality.js site/oma/data/peers.js site/oma/data/market.js site/oma/data/quality.js` (only those files; `git status` must show nothing else staged), commit with the message "peers: FactSet refresh <RUN> [skip actions]" ending in "Co-Authored-By: Claude <noreply@anthropic.com>", then `git push origin HEAD:main`. If the push is rejected because main moved (a refresh workflow or a merge landed meanwhile), never rebase or merge the generated files: `git fetch origin main && git checkout -B peers-$(date +%Y%m%d%H%M%S) origin/main`, re-run STEP 3 on the same pull files (both ingests, build, apply, the three validators), commit again and push; up to 3 times. If ingest, build or a validator fails, do not push: write the error into tools/gap/notify-state.json → lastPeersFailure (date and one line) on the branch, push that branch as peers-failed-<RUN> and stop.

STEP 5 — Final message, one line: "FactSet peers <RUN>: closes <priceDate>, consensus <estimateDate>; GAP EV/EBITDA NTM <x> (3y <y>), P/E NTM <z>; daily closes through <last date in prices.json>; pushed <sha>" or the reason nothing was pushed.
