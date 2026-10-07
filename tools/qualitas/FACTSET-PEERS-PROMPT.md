# FactSet peers refresh for the financial models (Quálitas, Gentera) — routine prompt

Run from a Claude session (or a cloud routine created on the claude.ai Routines page) with the **FactSet AI-Ready Data
connector** and the repository `marthavshelton-sys/fnam-debt-monitor` attached. It pulls the connector for Quálitas,
Gentera and their nine peers, writes `tools/qualitas/raw/factset/latest.json` and `tools/gentera/raw/factset/latest.json`,
rebuilds `site/qualitas/data/peers.js`, `site/qualitas/data/consensus.js` and `site/gentera/data/peers.js`, and pushes to
`main`. It edits nothing else. First filled by hand on 2026-10-07; no routine exists yet (if one is created, give it the
airports' cadence, 19:52 New York time, and this block as its prompt). The calls, file names and definitions are documented
at the top of `scripts/lib/factset-peers-fin.mjs`.

---

This is a fully autonomous task for the financial models at https://fnam.mx/qualitas and /gentera (repository marthavshelton-sys/fnam-debt-monitor, checked out in your working directory as a configured source, so pushes to main are authorised). It refreshes the peers tables and the consensus blocks. No user is present; do not ask questions. Your final message must be one line. Use only the FactSet connector tools, the repository's scripts and git; never type a number into a data file yourself.

STEP 1 — Sync: if the working directory holds no checkout of the repository, clone it first (`git clone https://github.com/marthavshelton-sys/fnam-debt-monitor.git && cd fnam-debt-monitor`); if the clone, the fetch or a later push is refused with 403, call the add_repo tool once (owner marthavshelton-sys, repo fnam-debt-monitor, access push) and retry; then `git fetch origin main && git checkout -b finpeers-$(date +%Y%m%d%H%M) origin/main`. `git config user.name "Peers routine" && git config user.email "peers-routine@users.noreply.github.com"`. Set RUN=$(TZ=America/New_York date +%F), FIVE=$(date -d "$RUN -5 years -6 weeks" +%F), BSFROM=$(date -d "$RUN -5 years -6 months" +%F), THREE=$(date -d "$RUN -3 months -3 days" +%F), WEEK=$(date -d "$RUN -8 days" +%F). Empty the pull directory: `rm -rf tools/qualitas/raw/factset/pull && mkdir -p tools/qualitas/raw/factset/pull` (it is gitignored).

STEP 2 — FactSet calls. Generate one request_id uuid and reuse it. IDS = ["Q-MX","PGR-US","ALL-US","PSSA3-BR","MAP-ES","ADM-GB","GENTERA-MX","GFNORTEO-MX","RA-MX","BBAJIOO-MX","BAP-US"]. Every result must end up as a file in tools/qualitas/raw/factset/pull/ with exactly the name given: when the tool returns the JSON inline, write it to that file verbatim with the Write tool (the whole `{"data": [...]}` object); when the tool says the result was saved to a file, copy that file there. Never retype or summarise a result. If a call fails as too large, split its ids in halves and merge the `data` arrays into the one file; if it fails with a rate limit, wait a minute and repeat it once.
a) FactSet_GlobalPrices prices, ids IDS, startDate WEEK, endDate RUN, frequency D, currency LOCAL, fields ["price","volume"] → prices-recent-local.json
b) FactSet_GlobalPrices prices, ids IDS, startDate THREE, endDate RUN, frequency D, currency USD, fields ["price","volume","vwap","turnover"] → prices-usd-3m.json
c) FactSet_GlobalPrices market_value, ids IDS → market-value.json
d) FactSet_GlobalPrices annualized_dividends, ids IDS, currency LOCAL → dividends.json
e) FactSet_EstimatesConsensus consensus_rolling, ids IDS, metrics ["EPS"], periodicity NTMA, relativeFiscalStart 1, relativeFiscalEnd 1, currency ESTIMATE, no dates → ntm-eps.json
f) The same with startDate FIVE, endDate RUN, frequency W, in batches of at most four ids (the connector refuses the eleven at once), merged → eps-ntm-weekly.json
g) Steps e, f and l again for ids ["BAP-US"] only with currency USD → ntm-eps-usd.json, eps-ntm-weekly-usd.json, price-targets-usd.json (Credicorp's brokers estimate in soles; the ADR trades in dollars)
h) FactSet_GlobalPrices prices, ids IDS, startDate FIVE, endDate RUN, frequency W, currency LOCAL, fields ["price"] → prices-weekly.json
i) FactSet_GlobalPrices shares_outstanding, ids IDS, startDate FIVE, endDate RUN, frequency AM → shares-monthly.json
j) FactSet_Fundamentals fundamentals, metrics ["FF_BPS"], currency LOCAL, audit AUDIT_CARD, fiscalPeriodStart BSFROM, fiscalPeriodEnd RUN: ids IDS without ADM-GB, periodicity QTR → bs-qtr.json; ids ["ADM-GB"] periodicity SEMI → bs-semi.json
k) FactSet_Fundamentals fundamentals, ids ["MAP-ES"], metrics ["FF_BPS","FF_ROE","FF_LOSS_EXP_RATIO","FF_EPS","FF_NET_INC","FF_PE"], currency LOCAL, audit AUDIT_CARD, fiscalPeriodStart BSFROM, fiscalPeriodEnd RUN: periodicity SEMI → map-semi.json; periodicity ANN → map-ann.json (FactSet carries Mapfre's interim statements only from 2024)
l) FactSet_EstimatesConsensus consensus_rolling, ids IDS, metrics ["PRICE_TGT"], relativeFiscalStart 0, relativeFiscalEnd 0, currency ESTIMATE → price-targets.json
m) FactSet_EstimatesConsensus ratings, ids IDS, currency ESTIMATE → ratings.json
n) FactSet_Fundamentals fundamentals, metrics ["FF_EPS","FF_PE","FF_LOSS_EXP_RATIO","FF_NET_INC"], currency LOCAL, audit AUDIT_CARD, no dates: ids IDS without ADM-GB, periodicity LTM, plus ids ["ADM-GB"] periodicity LTM_SEMI, merged → ltm.json
o) FactSet_Fundamentals fundamentals, metrics ["FF_ROE","FF_NONPERF_LOAN_PCT","FF_LOSS_EXP_RATIO","FF_EPS","FF_NET_INC"], currency LOCAL, audit AUDIT_CARD, no dates: ids IDS without ADM-GB, periodicity QTR, plus ids ["ADM-GB"] periodicity SEMI, merged → ratios-qtr.json
p) FactSet_EstimatesConsensus consensus_fixed, ids ["Q-MX","GENTERA-MX"], periodicity ANN, fiscalPeriodStart = the current calendar year, fiscalPeriodEnd = that year + 1, currency ESTIMATE, one call per metric EPS, BPS, DPS, NET_INC, merged → fy-consensus.json

STEP 3 — Build: `node scripts/lib/factset-peers-fin.mjs ingest --date $RUN` (it fails loudly if a pull file is missing or a company has no close, consensus or book value — then fix the pull, never the script) and `node scripts/lib/factset-peers-fin.mjs build`. Then `python3 scripts/qualitas/validate_data.py` and `python3 scripts/gentera/validate_data.py` (or the validators named in each runbook) must report 0 failures.

STEP 4 — Commit and push: `git add tools/qualitas/raw/factset/latest.json tools/gentera/raw/factset/latest.json site/qualitas/data/peers.js site/qualitas/data/consensus.js site/gentera/data/peers.js` (only those files), commit with the message "peers: FactSet refresh <RUN> (Quálitas, Gentera) [skip actions]" ending in "Co-Authored-By: Claude <noreply@anthropic.com>", then `git push origin HEAD:main`. If the push is rejected because main moved, `git fetch origin main && git checkout -B finpeers-$(date +%Y%m%d%H%M%S) origin/main`, re-run STEP 3 on the same pull files, commit again and push; up to 3 times. If ingest, build or a validator fails, do not push: write the error into tools/qualitas/notify-state.json → lastPeersFailure (date and one line) on the branch, push that branch as finpeers-failed-<RUN> and stop.

STEP 5 — Final message, one line: "FactSet peers <RUN>: closes <priceDate>, consensus <estimateDate>; Quálitas P/E NTM <x> (3y <y>), P/BV <z>; Gentera P/E NTM <x> (3y <y>), P/BV <z>; pushed <sha>" or the reason nothing was pushed.
