# FactSet peers refresh — routine prompt

Cloud routine **"FNAM Airports: FactSet peers refresh (cloud)"**, every night at 19:52 New York time (owner asked for
8 PM ET; the minute is jittered off the hour as the scheduler recommends). It pulls the FactSet AI-Ready Data
connector for GAP, ASUR, OMA and the four international peers, writes `tools/gap/raw/factset/latest.json`, rebuilds
`site/gap/data/peers.js`, `site/asur/data/peers.js` and `site/oma/data/peers.js` and pushes to `main`. It edits nothing
else. Routine id `trig_011SAh4eYS2gCw8LKP551Wkj` (created 2026-10-06 from a Claude Code session, which cannot attach
connectors: the FactSet connector has to be attached to the Routine once on the claude.ai Routines page, as the Oracle
FactSet routine has it; until then a run stops at STEP 2 and pushes a `peers-failed-<date>` branch). If the routine has
to be recreated, create it on that page with the FactSet connector attached and paste the block below as the prompt. The
calls, file names and definitions are documented at the top of `scripts/lib/factset-peers.mjs`.

---

This is a fully autonomous nightly task for the airport models at https://fnam.mx/gap, /asur and /oma (repository marthavshelton-sys/fnam-debt-monitor, checked out in your working directory as a configured source, so pushes to main are authorised). No user is present; do not ask questions. Your final message must be one line. Use only the FactSet connector tools, the repository's scripts and git; never type a number into a data file yourself.

STEP 1 — Sync: if the working directory holds no checkout of the repository, clone it first (`git clone https://github.com/marthavshelton-sys/fnam-debt-monitor.git && cd fnam-debt-monitor`); then `git fetch origin main && git checkout -b peers-$(date +%Y%m%d%H%M) origin/main` (a fresh branch from origin/main; never reset or fast-forward the checkout's own main). `git config user.name "Peers routine" && git config user.email "peers-routine@users.noreply.github.com"`. Set RUN=$(TZ=America/New_York date +%F) and FIVE=$(date -d "$RUN -5 years -6 weeks" +%F), THREE=$(date -d "$RUN -3 months -3 days" +%F), WEEK=$(date -d "$RUN -8 days" +%F). Empty the pull directory: `rm -rf tools/gap/raw/factset/pull && mkdir -p tools/gap/raw/factset/pull` (it is gitignored).

STEP 2 — FactSet calls. Generate one request_id uuid and reuse it. IDS = ["GAPB-MX","ASURB-MX","OMAB-MX","AENA-ES","FRA-DE","FHZN-CH","AIA-NZ"]. Every result must end up as a file in tools/gap/raw/factset/pull/ with exactly the name given: when the tool returns the JSON inline, write it to that file verbatim with the Write tool (the whole `{"data": [...]}` object); when the tool says the result was saved to a file, copy that file there with `cp`. Never retype or summarise a result. If a call fails with a rate limit, wait a minute and repeat it once.
a) FactSet_GlobalPrices prices, ids IDS, startDate WEEK, endDate RUN, frequency D, currency LOCAL, fields ["price","volume"] → prices-recent-local.json
b) FactSet_GlobalPrices prices, ids IDS, startDate THREE, endDate RUN, frequency D, currency USD, fields ["price","volume","vwap","turnover"] → prices-usd-3m.json
c) FactSet_GlobalPrices market_value, ids IDS → market-value.json
d) FactSet_GlobalPrices annualized_dividends, ids IDS, currency LOCAL → dividends.json
e) FactSet_EstimatesConsensus consensus_rolling, ids IDS, periodicity NTMA, relativeFiscalStart 1, relativeFiscalEnd 1, currency ESTIMATE, no dates, one call per metric: EBITDA → ntm-ebitda.json, EPS → ntm-eps.json, SALES → ntm-sales.json
f) The same with startDate FIVE, endDate RUN, frequency W: EBITDA → ebitda-ntm-weekly.json, EPS → eps-ntm-weekly.json (large; the tool saves them to files)
g) FactSet_GlobalPrices prices, ids IDS, startDate FIVE, endDate RUN, frequency W, currency LOCAL, fields ["price"] → prices-weekly.json
h) FactSet_GlobalPrices shares_outstanding, ids IDS, startDate FIVE, endDate RUN, frequency AM → shares-monthly.json
i) FactSet_Fundamentals fundamentals, metrics ["FF_NET_DEBT","FF_MIN_INT_ACCUM"], currency LOCAL, audit AUDIT_CARD, fiscalPeriodStart FIVE, fiscalPeriodEnd RUN: ids ["GAPB-MX","ASURB-MX","OMAB-MX","AENA-ES","FRA-DE"] periodicity QTR → bs-qtr.json; ids ["FHZN-CH","AIA-NZ"] periodicity SEMI → bs-semi.json
j) FactSet_Fundamentals fundamentals, metrics ["FF_SALES","FF_EBITDA_OPER","FF_NET_INC","FF_EBITDA_OPER_MGN","FF_PE"], currency LOCAL, audit AUDIT_CARD, no dates: ids ["GAPB-MX","ASURB-MX","OMAB-MX","AENA-ES","FRA-DE"] periodicity LTM → ltm-qtr.json; ids ["FHZN-CH"] periodicity LTM_SEMI → ltm-semi.json; ids ["AIA-NZ"] periodicity ANN → ltm-ann.json
k) FactSet_EstimatesConsensus consensus_fixed, ids ["GAPB-MX"], periodicity ANN, fiscalPeriodStart = the current calendar year, fiscalPeriodEnd = that year + 2, currency ESTIMATE, one call per metric: EBITDA → gap-fy-ebitda.json, SALES → gap-fy-sales.json, EPS → gap-fy-eps.json
l) FactSet_EstimatesConsensus consensus_rolling, ids IDS, metrics ["PRICE_TGT"], relativeFiscalStart 0, relativeFiscalEnd 0, currency ESTIMATE → price-targets.json
m) FactSet_EstimatesConsensus ratings, ids IDS, currency ESTIMATE → ratings.json

STEP 3 — Build: `node scripts/lib/factset-peers.mjs ingest --date $RUN` (writes tools/gap/raw/factset/latest.json; it fails loudly if a pull file is missing or a company has no close, consensus or balance sheet — then fix the pull, never the script) and `node scripts/lib/factset-peers.mjs build` (writes the three peers.js files). Then `node scripts/gap/validate-data.mjs`, `node scripts/asur/validate-data.mjs` and `node scripts/oma/validate-data.mjs` must each report 0 failures.

STEP 4 — Commit and push: `git add tools/gap/raw/factset/latest.json site/gap/data/peers.js site/gap/data/quality.js site/asur/data/peers.js site/asur/data/quality.js site/oma/data/peers.js site/oma/data/quality.js` (only those files; `git status` must show nothing else staged), commit with the message "peers: FactSet refresh <RUN> [skip actions]" ending in "Co-Authored-By: Claude <noreply@anthropic.com>", then `git push origin HEAD:main` (on rejection `git pull --rebase origin main` and push again, up to 3 times). If ingest, build or a validator fails, do not push: write the error into tools/gap/notify-state.json → lastPeersFailure (date and one line) on the branch, push that branch as peers-failed-<RUN> and stop.

STEP 5 — Final message, one line: "FactSet peers <RUN>: closes <priceDate>, consensus <estimateDate>; GAP EV/EBITDA NTM <x> (3y <y>), P/E NTM <z>; pushed <sha>" or the reason nothing was pushed.
