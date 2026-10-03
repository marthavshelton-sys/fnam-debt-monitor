# FactSet refresh — routine prompt

Cloud routine **"FNAM Oracle: FactSet refresh (cloud)"**, weekdays 14:20 UTC (08:20 Mexico City), before the weekday
review. It rewrites `tools/oracle/data/factset.json` (consensus, prices, market values, net debt, price target, ratings)
from the FactSet AI-Ready Data connector, rebuilds the page data and pushes to `main`. It edits nothing else. If the
routine has to be recreated, attach the FactSet connector and paste the block below as the prompt.

---

This is a fully autonomous weekday task for the Oracle financial model at https://fnam.mx/oracle (repository marthavshelton-sys/fnam-debt-monitor, checked out in your working directory as a configured source, so pushes to main are authorised). No user is present; do not ask questions. Your final message must be one line. Use only the FactSet connector tools and the repository; never invent a number — if a FactSet call fails or returns nothing for a field, keep the previous value of that field from the existing file and note it in the final line.

STEP 1 — Sync: `git fetch origin main && git checkout -b factset-$(date +%Y%m%d%H%M) origin/main` (a fresh branch from origin/main; never reset or fast-forward the checkout's own main, which may be a stale snapshot); `git config user.name "Oracle routine" && git config user.email "oracle-routine@users.noreply.github.com"`. Read tools/oracle/data/factset.json: keep its exact schema and field names.

STEP 2 — FactSet calls (generate one request_id uuid and reuse it; ids for peers: MSFT-US, SAP-US, CRM-US, NOW-US, IBM-US, WDAY-US, AMZN-US, GOOGL-US; currency USD everywhere):
a) FactSet_EstimatesConsensus consensus_rolling, periodicity NTMA, relativeFiscalStart 1, relativeFiscalEnd 1, ids ORCL-US plus the peers, one call per metric: EPS, EBITDA, SALES; for ORCL-US also FCF. Take mean/median/high/low/standardDeviation for Oracle (oracle.ntm) and the mean for each peer (peers[].ntm).
b) FactSet_EstimatesConsensus consensus_fixed, periodicity ANN, ids ORCL-US, fiscalPeriodStart 2026, fiscalPeriodEnd 2029, one call per metric: SALES, EPS, EBITDA, CAPEX, FCF, DEP_AMORT_EXP (stored as `da`, with `as_of`; the DCF section uses it for D&A as a share of revenue). FactSet's fiscalYear N is Oracle's FY(N+1): record each as { fy: "FY<N+1>", fiscal_end: <fiscalEndDate>, factset_fiscal_year: N } with mean/median/high/low/count/up/down (oracle.fiscal, ascending).
c) FactSet_EstimatesConsensus consensus_rolling, metrics PRICE_TGT, relativeFiscalStart 0, relativeFiscalEnd 0, ids ORCL-US → oracle.price_target (mean, median, high, low, count = estimateCount, up, down).
d) FactSet_EstimatesConsensus ratings, ids ORCL-US → oracle.ratings (buy, overweight, hold, underweight, sell, total = ratingsNestTotal, note = ratingsNote, noteText).
e) FactSet_EstimatesConsensus consensus_rolling, periodicity NTMA, relativeFiscalStart 1, relativeFiscalEnd 1, ids ORCL-US, startDate 2021-08-31, endDate today, frequency AQ, one call per metric EPS, EBITDA, SALES → oracle.ntm_history as [{ date, eps, ebitda, sales }] (means, ascending; replaces the array).
f) FactSet_EstimatesConsensus consensus_rolling, periodicity ANN, relativeFiscalStart 1, relativeFiscalEnd 2, metrics EPS, ids the peers → peers[].fy1 / fy2 { end: fiscalEndDate, eps: mean }.
g) FactSet_GlobalPrices prices, fields ["price"], currency USD, startDate = five days ago, ids ORCL-US plus the peers → latest non-null price per id and its date (price, price_date; set the file's price_date to the latest common date).
h) FactSet_GlobalPrices market_value, ids ORCL-US plus the peers → market_cap_usd_m (currentMarketValue). For SAP-US the value comes back in EUR: instead use FactSet_GlobalPrices shares_outstanding (totalOutstanding, millions) × the USD ADR price, and keep the market_cap_note.
i) FactSet_GlobalPrices annualized_dividends, currency USD, ids ORCL-US plus the peers → iad_usd (iadDefTradingAdj; null where absent).
j) FactSet_Fundamentals data_type fundamentals, periodicity QTR, currency USD, audit AUDIT_CARD, metrics ["FF_NET_DEBT","FF_DEBT","FF_CASH_ST"], ids ORCL-US plus the peers (these codes were validated with FactSet_Metrics; if FactSet rejects them, call FactSet_Metrics for "net debt", "total debt", "cash and short term investments" and use the codes it returns) → net_debt_usd_m, net_debt_date = fiscalEndDate; for Oracle also total_debt_usd_m and cash_st_usd_m.

STEP 3 — Write factset.json: set as_of = the estimateDate FactSet returned, fetched = today, price_date as above; round per-share values to 3 decimals and US$ millions to integers; keep _comment, source, fiscal_year_note, basis_note and peer_groups unchanged.

STEP 4 — Run `node scripts/oracle/build.mjs` (tie-out and parser tests must report 0 failed; the factset checks verify dates, positive NTM values, fiscal-year labels, history order, rating totals and peer coverage). Commit tools/oracle/data/factset.json and site/oracle/data with the message "oracle: FactSet consensus <date> [skip actions]" ending in "Co-Authored-By: Claude <noreply@anthropic.com>", then `git push origin HEAD:main` (on rejection `git pull --rebase origin main` and push again, up to 3 times). If the build fails, do not push; write the error into tools/oracle/notify-state.json → lastFailureNote and stop.

STEP 5 — Final message, one line: "FactSet consensus <as_of>: NTM EPS <x>, NTM EBITDA <y> M, target <z>; <n> peers; pushed <sha>" or the reason nothing was pushed.
