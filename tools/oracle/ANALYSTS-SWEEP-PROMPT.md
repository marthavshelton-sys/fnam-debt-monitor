# Analyst opinions — sweep prompt (Reference R3 of the Oracle page)

Run in a Claude session with the **Dropbox** and **FactSet AI-Ready Data** connectors attached (an in-session task; a monthly
Routine with both connectors can carry the same prompt). It rewrites `tools/oracle/data/analysts.json`, rebuilds the page data and
opens a pull request. It edits nothing else. The reports are licensed material: summaries only, never a republished page, never a
PDF in the repository.

---

Refresh the analyst-opinions section of the Oracle model (https://fnam.mx/oracle, repository marthavshelton-sys/fnam-debt-monitor).
Work on a branch from origin/main. Read tools/oracle/data/analysts.json first and keep its exact schema (a house entry: id, house,
kind equity|credit, analysts, date, title, rating, rating_class buy|hold|sell|credit|null, target_usd, target_prev_usd,
target_history, price_at_report, price_date, basis_short_en/es, method_en/es, thesis_en/es, risks_en/es, optional estimates and
earlier[], source {basis: "report", title}; a reported entry: id, house, analysts, date, rating, rating_class, target_usd,
target_prev_usd, basis_short_en/es, note_en/es, source {basis: "streetaccount", title}).

STEP 1 — Window: as_of = today in Eastern Time; window_days = 60; window_start = as_of − 60 days.

STEP 2 — Dropbox: the research library root is the `Current` mount (the current month under `Current/<year>/<Month>/<Mon N>/<house>/`)
and the `Archives` mount (earlier months under `Archives/<year>/<Month>/…`). Search both for "Oracle" and "ORCL" (content search,
`last_modified_after` = window_start, up to 500 results) and list the day folders of the window to catch files whose names do not
say Oracle. Keep only sell-side research (equity or credit) that states a view on Oracle: company notes, sector reports that rate
Oracle, credit notes. Sales-desk commentary, strategy dailies and press (Zero Hedge, The Market Ear) are not research: never take a
rating or target from them. Read every kept report in full with `fetch` (text up to 5 MiB); for a larger PDF use `download_link`
(single-use URL), `curl` through the proxy and `pdftotext`. From each report record: house, analysts, date, title, rating in the
house's own words, target (null only when the report states none), the previous target if the report says it changed, the price the
house quotes, the valuation method (the sentence that states the multiple or model and its basis), a thesis summary of six to
ten sentences in English and Mexican Spanish with the house's figures, the risks the house cites, and the house's estimates if
printed. One entry per house; an earlier note by the same house inside the window goes into `earlier[]`.

STEP 3 — FactSet: (a) `FactSet_UnstructuredContent` search, sources ALL_NEWS, ids ORCL-US, the window's dates, queries "Which brokers
changed their rating or price target on Oracle?" and "Oracle price target raised or lowered by analyst", limit 50: from the
StreetAccount "Street Takeaways" stories record every house with a rating and target that has no report on file into `reported`
(house, analyst, date, rating, target, previous target, the basis the summary gives, a two-sentence note in both languages, source
title = "FactSet StreetAccount, <headline>, <date>"). (b) `FactSet_EstimatesConsensus`, ids ORCL-US, `consensus_rolling`, metrics
PRICE_TGT, relativeFiscalStart 1, relativeFiscalEnd 1, startDate = as_of − 95 days, endDate = as_of, frequency W; and
`estimate_type: ratings` with the same dates: write `consensus_history.points` (date, mean, median, high, low, count, up, down, buy,
overweight, hold, underweight, sell, total) and `consensus_history.fetched` = as_of. The current consensus is not written here (the
daily FactSet routine keeps it).

STEP 4 — Write analysts.json (library_note_en/es: where the reports were, how many, anything missing), run
`node scripts/oracle/build.mjs` (0 failed), serve `site` on :8123 and run `node scripts/oracle/render-check.mjs`; open the page in
both languages and read the new section once. Commit `tools/oracle/data/analysts.json` and `site/oracle/data` with the message
"oracle: analyst opinions sweep <as_of>", push the branch and open a pull request against main (never push to main).

STEP 5 — Final message: the houses found with rating and target, the houses only reported by StreetAccount, the consensus mean and
count, and anything that could not be read.
