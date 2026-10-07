# fnam.mx — working notes for Claude

Read this before touching the repository. It records how the owner works and where things live; it is not a
changelog (see `git log` and the runbooks under `tools/<slug>/README.md` for history and detail).

## The owner

- Martha V. Shelton, CFA, Director, Talipot Research & Analysis. She is female and speaks Mexican Spanish;
  translations and Spanish copy follow Mexican usage.
- Answers: brief, clear, fact- and data-driven. Cite the data source. State every assumption explicitly.
- Never put a model identifier in anything pushed to the repository (code, comments, data, PR text). Commit
  trailers requested by the harness and the default-model setting in `.claude/settings.json` (owner-approved)
  are the only exceptions.
- Her email is identity only; never send it anywhere.

## Workflow she has approved

1. Develop on the designated `claude/…` branch, commit with clear messages, push with `git push -u origin <branch>`.
2. Open a PR against `main` (body ends with the harness attribution), merge it yourself with merge method
   "merge" (the merge call needs the full 40-character head SHA), then reset the branch onto the merged main:
   `git fetch origin main && git checkout -B <branch> origin/main && git push --force-with-lease -u origin <branch>`.
3. The stop hook requires a clean, committed tree. Regenerated data files count.
4. Cloudflare Pages deploys `main` automatically (root is `site/`; `site/_headers` and `site/_redirects` apply).
   Preview deploys post on every PR. Since 30-Sep-2026 the session's network allows plain requests to fnam.mx
   (curl), but a session cannot drive a browser at the live site (its Chromium does not trust the egress proxy's
   certificate, and the permission check refuses it): browser checks of live pages run on GitHub's runner
   (`macro-live-check.yml` for the US macro page). For other pages, give her the exact URLs to click.
5. Never disable TLS verification or unset `HTTPS_PROXY`. Egress 403s are policy; report, do not retry.
6. Site-wide password gate: `functions/_middleware.js` (dormant until the Cloudflare variable `SITE_PASSWORD` is set;
   README → "Password protection"). One password for everything (owner, 2026-10-05): the section gates stand down while it
   is set. Once it is on, every request to fnam.mx needs a session, and the password is accepted ONLY through the login form
   (POST `/login`; the Bearer header was removed 2026-10-06): an in-session check cannot read protected pages, so give her the
   URLs to click; `macro-live-check.yml` logs in with the GitHub secret `SITE_PASSWORD`. Sessions: 7 days, `/logout`,
   `SITE_SESSION_SECRET` (own secret; ask her to set it) and `SITE_SESSION_VERSION` (revokes all); wrong passwords throttled
   per address. The same middleware redirects www → apex, sets the security headers (HSTS, CSP with `frame-ancestors
   'none'`, Permissions-Policy; `site/_headers` carries the same set) and serves `?lang=en|es` in the HTML (`<html lang>`,
   plus the es/en spans on the pages that toggle `hidden`). A new page must load everything from its own origin or Google
   Fonts (the CSP allows nothing else: Cloudflare's Web Analytics was switched off in the Pages project on 2026-10-06 and
   its two cloudflareinsights entries left the CSP, so no third-party script runs). Public copy carries no repository paths, workflow names, GitHub links or the owner's email
   (`tools/audit-public-copy.mjs` renders every page in both languages and lists any leftover); keep new pages that way, and
   keep generated data-file headers free of script paths too (owner, 2026-10-05).

## What the site is

Static, bilingual (ES default, EN via the page toggle), one interactive model per company plus macro and fiscal
dashboards, everything built from public data by GitHub Actions.

- `site/index.html` landing; hubs `site/aeropuertos/` (GAP, OMA, ASUR + `trafico/`) and `site/mauricio/` (Oracle).
- Company models: `site/gap`, `site/oma`, `site/asur` (ASUR/OMA share `site/assets/airport-model.js` driven by
  `config.js`), `site/qualitas`, `site/gentera`, `site/oracle`. Each has `index.html`, `app.js` (or the shared
  model), `data/*.js` exposing `window.<PREFIX>_FIN/_MARKET/_REF/_GUIDANCE/_COMMENTS/_SUMMARY…`, and an
  owner-only `quality.html`. GAP sits behind a Cloudflare Pages password middleware.
- Dashboards: `site/macro` and `site/mx/macro` are generated from `tools/macro/macro_monitor_template.html`
  and `tools/mx-macro/template.html` — edit the template and the page together. `site/fiscal`, `site/mx/fiscal`.
- Harvesters, parsers and validators live in `scripts/<slug>/`; raw files, reference data and runbooks in
  `tools/<slug>/`; schedules in `.github/workflows/<slug>-refresh.yml`.
- Hidden data-quality pages `site/<slug>/quality.html` (GAP, OMA, ASUR, Quálitas, Gentera) share one design:
  `site/assets/quality.css` + `site/assets/quality-page.js` render `data/quality.js`, which each validator writes
  (JS validators through `scripts/lib/quality-report.mjs`; Quálitas and Gentera in Python). The JS builders leave
  parse warnings in `tools/<slug>/raw/build-log.json`. Write new checks in the record/identity form so they show up.
- FactSet is available only as a connector inside a Claude session (no credentials in GitHub Actions).
  Airport peers (GAP, ASUR, OMA share one snapshot, `tools/gap/raw/factset/latest.json`) are refreshed every night at
  19:52 New York time by the cloud routine "FNAM Airports: FactSet peers refresh" (prompt
  `tools/gap/FACTSET-PEERS-PROMPT.md`; `scripts/lib/factset-peers.mjs ingest` + `build`); never hand-edit `peers.js`.
  The tables show NTM EV/EBITDA and NTM P/E with 1-, 3- and 5-year averages plus ADTV in US$ M, prices at the last
  completed close (owner, 2026-10-06); no trailing multiples. The connector cannot run FQL (FE_VALUATION etc.): the
  ratios are assembled from consensus_rolling NTMA, prices, shares_outstanding and FF_NET_DEBT / FF_MIN_INT_ACCUM.
  The same routine pulls the daily closes of GAPB.MX, PAC, ASURB.MX, ASR, OMAB.MX and OMAB (last three months, merged
  into the committed `tools/gap/raw/factset/prices.json`, history from 2015) and overlays them on the three `data/market.js`
  (`scripts/lib/factset-prices.mjs ingest` + `apply`; both market fetchers apply the same overlay on every Actions run):
  since 2026-10-06 FactSet Global Prices is the share-price authority of the airport pages (header, charts, EV, multiples,
  DCF, decks); Yahoo/Stooq fill only the sessions FactSet has not posted yet, the S&P/BMV IPC (the connector rejects
  index ids) and the dividend record. Page and deck source labels are composed from `provenance` in market.js.
- The airports hub `site/aeropuertos/` opens with the three compact company tiles, then the map, then a hand-curated
  "Tariffs and regulation" table (`site/aeropuertos/data/regulation.js`, every cell sourced to a filing with its URL)
  and the traffic tiles; every chart there and on `trafico/` and `aerolineas/` carries a data stamp (see
  `tools/aeropuertos/README.md`). Only official filings go into that table, never press. Each row shows one year for
  all three groups; a figure computed from a filing is listed in the cell's `calc`. To confirm the pages' source links
  and the table's figures, dispatch `aeropuertos-refresh.yml` with `verify_links` (browser check on the runner, no commit).
  Airline route networks come only from lists the airline itself publishes (Volaris, Viva); never Wikipedia. Aeroméxico
  publishes none, so only its US routes are drawn, from the US DOT's T-100 (official, carrier-level). Mexicana: AIFA pairs of
  its own reservation system limited to the destinations its site publishes. See the runbook.
- BMV eventos relevantes watch (`scripts/lib/bmv-events.mjs --company=asur|oma|gap|qualitas|gentera`, a step in each
  refresh workflow): reads the issuer's list on bmv.com.mx and archives every notice the company's own harvest did not
  cover as `<date>_bmv<id>_es.txt` in the folder its alert routine reads (airports and GAP: their release folders;
  Quálitas, Gentera: `tools/<slug>/raw/text/events/`, read via `notify-state.lastBmvFile`). State and errors in
  `tools/<slug>/raw/bmv-events.json`; a BMV outage never fails a run. Added after ASUR's 28-Sep-2026 offering
  disclosure was missed. Press-only facts (e.g. ASUR's 1-Oct-2026 notes) go in `debt.events` labeled as press and enter
  no figure until the company files them.
- ASUR valuation perimeter (owner, 2026-10-05): until ASUR consolidates CPC, the DCF, the multiples table and the header's
  leverage and EV/EBITDA tiles run on the pro-forma perimeter in `site/asur/data/reference.js → proForma` (net debt Ps. 68,989 M
  − Ps. 18,100 M from the 28-Sep-2026 evento relevante; +45 M passengers and R$1,300 M ≈ US$243 M of CPC EBITDA from the
  18-Nov-2025 signing release; CPC revenue = its EBITDA at the group margin, an FNAM calculation), with the caveat printed on both
  blocks and a switch back to the reported figures above the DCF inputs. The overlay turns itself off once the latest balance sheet
  is dated on or after `proForma.consolidatedFrom` (2026-09-30); decide then whether the LTM EBITDA still needs CPC's missing months.
- ASUR traffic perimeter (Motiva / CPC airports, closed 1-Sep-2026; ASUR reports them from September 2026 traffic): facts in
  `site/asur/data/reference.js → perimeter`, status computed from `traffic.js` by the model, the deck, the hub block and the
  validator. Growth across perimeters prints "n.c." with the legacy-perimeter change beside it; never estimate CPC passengers.
  Runbook: `tools/asur/README.md` → "Traffic perimeter change".
- Oracle market data: since 2026-10-06 the ORCL price authority is FactSet Global Prices (`tools/oracle/data/prices_orcl_factset.csv`,
  written by the nightly FactSet routine at 7:58 PM New York time); `build-data.mjs` merges it over the runner's Nasdaq/Yahoo series,
  which only fills dates FactSet has not posted yet (owner: every price as of the last close, from FactSet). The S&P 500 stays on
  FRED (the connector rejects index ids). Nasdaq's historical API posts a session's bar hours after the close, so `fetch-market.mjs`
  tops the runner series up from Yahoo/Stooq when it ends before the latest completed NYSE session (`latestCompletedSession`, `topUp`;
  5-Oct-2026 the page showed the 2-Oct close all evening). Dividends: paid points only in `market.js → dividends.points`; a
  declared-not-yet-paid one sits in `announced`. The compact header and the "More figures" button are phone-only; the third
  `<style>` block must stay closed (an unclosed one let them show on desktop and ran the stamps together, 2026-10-05).
- Oracle page (rebuilt 2026-10-03): sections, figure/table numbers, navigation and cross-references are generated from
  `tools/oracle/data/sections.json` (`ref('id')`, `{{sec:id}}`); never type a section number (the validator fails).
  Timestamps on that page are ET only; the refresh workflow runs daily incl. weekends; news comes from the daily cloud
  routine (`tools/oracle/NEWS-SWEEP-PROMPT.md`). Off-balance-sheet figures carry filing/note/accession and an XBRL
  verdict; uncommenced leases are never added to debt. Read `tools/oracle/MEMORY.md` and `METHODOLOGY.md` first. The DCF is its own
  section (not in the deck; method in METHODOLOGY.md §8: Bear / Base = consensus / Bull presets, tax normalization, lease
  treatment, "what has to be true" instead of a bracketing test). Since 2026-10-04 the page follows the story order
  (Start here → Contracts → … → DCF → Risks → News → Calendar) with a collapsed Reference appendix (R1–R3); every section
  carries a composed lead and is collapsed by default except the Summary. The deck follows the page's story order (owner,
  2026-10-06; `deck_order` is gone), opens with the executive summary (the page's text: "What to watch" left, Operations /
  Guidance / Debt then the verdict right) and a linked contents page, and excludes the DCF (page-only) while keeping the
  multiples and peers.
  Before pushing a page change run `scripts/oracle/build.mjs` and `scripts/oracle/render-check.mjs` (site served on
  :8123) and build the PDF in both languages (`scripts/oracle/deck-check.mjs`, PyMuPDF installed, both languages, 0 failures);
  a change to the DCF engine, its projection table or the Excel writer also runs `scripts/oracle/xlsx-check.mjs` (LibreOffice +
  openpyxl recalculate the download and compare it with the page). Since 2026-10-07 the DCF section opens with the editable
  projection table (scenario buttons, Base case = FactSet consensus by construction), the consensus comparison and the
  DCF-implied target; the Excel export uses the dependency-free writer `site/assets/xlsx-lite.js` (own origin, per the CSP);
  quarter, fiscal-year, filing and target labels are composed from the data, never typed (helpers in `app.js`).
  Headings are Title Cased at render time (`titleCaseHeadings()`, both languages) and the English copy is American English
  (owner, 2026-10-06); the peers table carries 1/3/5-year averages of the forward multiples (weekly observations) and ADTV from
  `factset.json → hist_multiples` / `adtv`, refreshed by the nightly FactSet routine at 7:58 PM New York time (steps g and k of
  `tools/oracle/FACTSET-PROMPT.md`); every FactSet price on the page is the latest completed session's close.
- Hyperscaler Hub `site/hiperescaladores/` (`/hyperscalers/*` redirects): summary, modules 1 `capacidad/`, 2
  `comprometida/`, 3 `capex/`, 4 `electricidad/`, 5 `sitios/`, 6 `fuera-de-balance/`, 7 `circular/`, 8 `retorno/` (payoff and
  cost of money, curated `payoff.json`; ratings from SEC-filed term sheets), `metodologia/`,
  `glosario/`, quality page per module. Modules 1, 2, 4, 5, 7 come from curated files (`tools/hyperscalers/data/
  {capacity,sites,power,circular}.json`) whose quotes `build-modules.mjs` checks against the harvested filing page; MW
  keep each company's definition and are never summed; map dots are named localities, never campus coordinates; grid
  projections (T3/T4) never mix with company deals; FNAM inferences on circular financing are labeled and cite flows.
  Ten companies in `tools/hyperscalers/companies.json`. Every datum carries a
  source tier (T1 SEC, T2 company, T3 regulator, T4 estimate; FactSet = dated snapshot, not T1 until matched) and an ⓘ
  card; "Not tagged" (absent from XBRL) is never written as "Not disclosed"; nothing is imputed; leases not yet commenced
  are never added to present-value debt; signed leases are compared only with undiscounted recognized lease payments. One unit
  per page (US$ bn, GW). Thesis, "What to know", module titles and "so what" lines are composed from data. Figures that differ
  in scope across modules carry a `scope` note (`data/scope.json`). Timestamps in ET on this hub (owner's request). Runbook
  `tools/hyperscalers/README.md` (round 3 section).
- The Oracle "research" page was an experiment and is retired; `/oracle/research/*` redirects to `/oracle/`.
  Do not recreate it or reference it.
- `site/404.html` answers every address the site does not have, with status 404 (since 1-Oct-2026; before, Cloudflare
  Pages' single-page fallback served the home page with 200). Links inside it are absolute. `site/favicon.ico` is the
  site's "F" mark; pages carry the same mark as a data-URI icon.

## Scheduled refreshes — rules that apply to every pipeline

- Bot/data commits use the marker `[skip actions]`, never `[skip ci]`: Cloudflare Pages treats
  `[skip ci]` as its own skip marker, so pages silently stop deploying while commits keep landing
  (this bit fiscal, GAP and both macro dashboards before it was fixed).
- Never write the literal skip-ci string inside a commit message either, even to describe it —
  GitHub Actions skips the push's workflow runs if it appears anywhere in the head commit message.
- Both macro dashboards refresh every day, weekends included (weekend runs usually commit nothing;
  sources publish weekdays). A run commits only when data changed.
- When working on one page, do not touch another page's workflow or scripts.
- `data-watchdog.yml`, every 12 hours at 03:50 and 15:50 UTC (owner's choice, to limit deploys; `scripts/watchdog/`,
  runbook `tools/watchdog/README.md`), judges each dashboard's
  last landed scheduled refresh against that workflow's own cron and writes `site/status/refresh.json`; the
  landing page's "Last successful data refresh" panel and the company pages' header dots
  (`site/assets/data-status.js`) read it. A late dashboard whose pipeline has not alerted gets a
  "SOURCE DOWN: watchdog - ..." issue (emailed). Nothing on the site is called "live": a dashboard shows as
  "Al día / Up to date" only in that panel and dot, and only while the watchdog verifies it.
  A new dashboard or refresh workflow goes into `tools/watchdog/dashboards.json`. Prices (owner, 2026-10-06): a dashboard
  with a `prices` block there (Oracle: the FactSet ORCL file, the FactSet snapshot's price date, the S&P 500 file; GAP,
  ASUR, OMA since 6-Oct-2026: the listing's and the ADS's FactSet close in `tools/gap/raw/factset/prices.json` and the
  page's own `latestClose` in `market.js`, the ADS judged on the NYSE calendar through the series' `exchange`) has each
  feed compared with the exchange's last completed session (NYSE 2026–2028 and BMV 2026 calendars in
  `scripts/watchdog/lib.mjs`; the BMV publishes one year at a time, extend it every December; outside a calendar →
  `unverified`; close + 5 h for the nightly FactSet routines); any feed behind → status `stale`, red and pulsing on the
  dot (the Oracle phone header has one too) and the landing panel, plus a "SOURCE DOWN: watchdog - <name> prices stale"
  issue; between checks `data-status.js` compares the page's own `latestClose` with the next required session and can
  turn red on its own (never green).
- The sandbox's egress proxy blocks the data providers (Banxico, INEGI, FRED, BLS…); fnam.mx answers
  plain requests since 30-Sep-2026. To probe a live endpoint, dispatch the page's workflow with its diagnostics inputs and
  read the run log; verify deploys via Actions history and committed files, not by fetching the site.

## The macro dashboards

- `site/mx/macro` (Node, `scripts/mx-macro/` + `tools/mx-macro/`, ubuntu runner). `series.json` is a
  manifest of candidates per series; every candidate is verified against a title regex before it is
  accepted, so a wrong ID never reaches the page. Secrets: `BANXICO_TOKEN`, `INEGI_TOKEN`,
  `FRED_API_KEY`. INEGI's public developer API answers "No se encontraron resultados" for every BIE
  id — BIE series come from the query-builder service `interna_v1_3/API.svc/ExportacionBancoInformacion`
  (tematica "3", areasGeograficas "null", whole-year dates); details in `tools/mx-macro/README.md`.
  Diagnostics run on the runner via workflow_dispatch inputs (`probe`, `search`, `url`, `post`,
  `xlsx`); nothing is fetched or committed in that mode. After each refresh `health.mjs` flags any
  series no provider has answered for in 7 days and the workflow opens/closes an issue labeled
  `mx-macro-health` (title "SOURCE DOWN: MX macro - ..."). `alerts.mjs` opens one "MATERIAL (MX): ..."
  issue per run when a release crosses its thresholds; the US macro alert routine emails both kinds.
- `site/macro` (US; Windows PowerShell, `tools/macro/`). The two yearly BLS weights tables arrive as
  PRs from scheduled browser tasks because BLS answers scripted requests with 403
  (`process_weights.ps1` probes every run in case that changes). Challenger job cuts are read from
  the report PDF and only published when the figures reconcile against the report's own totals.
  `alerts.ps1` queues each new release as a GitHub issue (title `MATERIAL:` when a threshold is crossed), and
  a revision of a figure already reported (a GDP estimate, a benchmark revision) as its own or inside the next one;
  the owner does not get GitHub notification mail, so the Claude Routine "FNAM US Macro: email material
  changes" (09:20 and 16:45 New York time, read-only; prompt in `tools/macro/email-routine-prompt.md`) emails her the MATERIAL issues of its slot's window (a late run
  keeps its slot's window; see `tools/macro/README.md`). A source down three runs opens one "SOURCE DOWN:" issue
  (closed on recovery), which the same routine emails, and fails the run. After every refresh
  `macro-live-check.yml` loads https://fnam.mx/macro/ in Chromium (the deploy is main's page; every section, ES and
  EN, desktop and phone) and a failure opens one "LIVE CHECK FAILED: US macro - ..." issue, emailed the same way.
  An unknown `?view=` shows "Section not found" and answers 404 through `functions/macro/_middleware.js`, whose
  section list both builders check against the page. Since 7-Oct-2026 the page has six quarterly sections
  (productivity from BLS; corporate profits and labor share from BEA table 1.14 via FRED; private-sector debt
  from the Z.1 via FRED; household debt from the New York Fed workbook plus Z.1/G.19; bank capitalization from
  FDIC API aggregates plus H.8; the nonbank financial system from the Z.1 sector balance sheets via FRED plus the
  OFR hedge fund API, the SEC money fund workbook and the NCUA chart pack), each with a title-checked processor (`Get-FredChecked` in `common.ps1`),
  identity checks and staleness warnings; `tools/macro/README.md` → "The quarterly sections". The workflow's
  `branch` input runs the whole refresh on a feature branch (data and page committed there, no alerts) to test
  processors before merging; a session cannot reach FRED from PowerShell, so seed data comes from the runner. Weekly "next" dates (NFCI, mortgage, EIA's SPR report) come
  from the publishers' calendars and are always the release after the one shown; extra refresh runs on Wednesdays
  (14:45, 15:45 UTC) and Thursdays (17:20 UTC) catch EIA's and Freddie Mac's releases.
- The MX page's yield curve (Banxico view) is Cetes 28d–728d and Bonos M 3–30y from Banxico's primary auctions (SIE
  CF107; latest auction per tenor at its issue date, "colocación") and the 10-year spread vs. FRED DGS10 at the auction
  day's close; no daily secondary yields exist in SIE. Ids and method: `tools/mx-macro/README.md`.
- IMSS formal employment for the MX page has no scriptable official source (INEGI banks, Banxico,
  IMSS's WAF-blocked portal, STPS viewers, Data México all audited 2026-09-29 — details in
  `tools/mx-macro/README.md`); do not re-hunt without a new lead. `data/imss.json` is filled from IMSS's
  monthly comunicados via web search of imss.gob.mx, each figure reconciled against IMSS's own printed
  monthly/YTD/12-month changes; derived months are labeled. Never fetch imss.gob.mx from a script or
  the runner or work around its WAF. Monthly update: Claude Routine, prompt in `tools/mx-macro/imss-task-prompt.md`.
- MX macro: an INPC subindex never runs ahead of the headline: the SIE posts the government-set tariffs subindex (SP74639)
  for a month before INEGI publishes that month's INPC (6-Oct-2026: a September point beside an August headline, so the
  component table printed 7.8% while the August-based figure is 7.7%); `renderInpc` cuts every component at the headline's
  latest month.
- MX macro: Banxico's neutral real-rate range is 1.8–3.6% (text and the threshold in the summary driver, owner 2026-10-05);
  the real-rate caption pairs the ex post month with the SAME month's survey and names the newer survey separately; a monthly
  average of a daily series carries "(promedio al día, mes en curso)" while the month runs (`monthAvg` → `partial`).
- Both templates open every section with an executive-summary card ("En resumen / At a glance":
  latest print, drivers, why it matters, what to watch). Every sentence is composed at render time
  from the same data as the charts — never hand-write summary text, it would go stale by the next run.
- Both builds enforce locale parity (identical I18N keys in es/en) and that every referenced string
  exists; a page builds only when 100% of strings resolve.
- To test a template change: build against the committed data
  (`node scripts/mx-macro/build.mjs --out /tmp/t.html --force`), open it in Playwright Chromium at
  1280px and 390px in both languages, click through every view, and check for `undefined`/`NaN`,
  hidden-section regressions and horizontal overflow. The MX pipeline can also be exercised fully
  offline by preloading a mock `fetch` with `node --import`.

## Board presentations (PDF)

- Shared engine `site/assets/present-core.js` (`window.FNAM_PRESENT`: `Doc`, `run`, `autoRun`, Title Case,
  `**bold**` runs, fit-to-page tables, off-screen Chart.js charts, cover, footers "Page X of Y" + confidentiality,
  next-results rule). Per-company builders extend `Doc`: `site/gap/present.js`, `site/oracle/present.js`,
  `site/assets/airport-present.js` (ASUR, OMA), `site/qualitas/present.js`, `site/gentera/present.js`.
- Each `app.js` exposes a read-only `window.<PREFIX>_MODEL`; builders read only that, never recompute figures.
- Deep link `/<slug>/?present=1&lang=es|en` builds the PDF on arrival; the landing pages link to it.
- Text measurement: jsPDF applies kerning that the written PDF does not, so the engine sums per-glyph widths.
- Chart conventions the owner asked for: y/y and margin lines in front of bars (red, white-filled points);
  two-axis charts say which series is on which axis; bold only a few key words per bullet; sections 04–06 of the
  pages are excluded from decks; 07–10 are one landscape page each; final page is sources and methodology;
  timestamps in CDMX time; market cap in USD only where she asked.
- The Oracle deck will need a builder pass when that dashboard changes structurally; data changes flow through.

## How to verify before pushing

- `node --check` every edited script.
- Serve the site locally: `python3 -m http.server 8123 --directory site` (start it detached with `setsid nohup …`).
- Headless checks use Playwright Chromium from `/opt/node22/lib/node_modules/playwright`; Chart.js is
  self-hosted on every page (`site/assets/vendor/chart.umd.4.4.0.min.js`, `integrity` sha384 on each tag; replace file
  and hash together), so the local server supplies it; stub Google Fonts. Register the "abort all
  non-localhost" route first so the specific routes win.
- PDFs: click `#btnPrint` (or open the deep link), catch the download, rasterise pages with PyMuPDF and look at
  every page in both languages before merging.
- Mobile: audit at 390×844 and 360×780, ES and EN, light and dark. Nothing may overflow the viewport, no text
  below 11 px, statements collapse to line item · latest period · y/y change with the comment beneath the row.
- Aesthetics matter to the owner: cramped charts, overlapping labels and half-empty pages are defects.

## Data facts that trip people up

- Quálitas financials are in thousands of pesos (`fmtM` converts to millions); Gentera is already in millions.
- Quálitas 4Q25 carries a one-off VAT charge (`REF.vat.adjust`); Gentera 4Q25 a ConCrédito deferred-tax
  write-down (`REF.adjust`). Show as reported with "memo" rows excluding them.
- Next results dates: `REF.calendar.nextResults` when the company announced it (confirmed); otherwise the median
  lag of the same quarter over the last three years (assumed). Always say which.
- Guidance basis strings in `data/guidance.js` are English; the pages and decks carry their own Spanish wording.
- USD/MXN in every company model is Banxico's FIX rate (SIE SF43718, `BANXICO_TOKEN`) with FRED DEXMXUS only as
  fallback: the FRED mirror stalled for over a week in September 2026. Shared reader `scripts/lib/banxico-fx.mjs`.
- The 10-year M bono is Banxico's primary-auction yield (SIE SF44071, about every four weeks, published the same
  day; `scripts/lib/banxico-mx10y.mjs`, FRED/OECD monthly IRLTLT01MXM156N as fallback). Banxico's SIE has no daily
  secondary-market 10-year yield (its daily vector CF300 carries prices and coupons only; checked 2026-09-28).
- Expected 12-month inflation (ex ante real rate on `site/mx/macro` and `site/mx/fiscal`): two statistics of the same
  Banxico survey, both for the 12 months *after* the survey month ("mes t+1" in SIE table CR155), on both pages. The
  **mean** (SR16773) drives the ex ante real rate because that is Banxico's own definition (Informe Trimestral, note to
  "Tasa real ex ante de corto plazo": target minus the mean of 12-month expectations; Aug-2026: 6.50 − 4.15 = 2.35%);
  the **median** (SR16774, the figure Banxico headlines in Cuadro 2 of the survey PDF and the statistic consensus surveys
  report) is printed beside it. SR14194/SR14195 are the "mes t" variants (counted from the survey month itself); the
  horizons differ month by month (up to ±0.3 pp); never mix them (the pages disagreed until 2026-10-05 for that
  reason). The API carries the "mes t+1" series from Feb-2018 only. The fiscal page reads both from `data.js`
  (`inflExp12mMean`, `inflExp12m`); `banxicoSurvey.inflationNext12m` in `docs-data.js` is only the PDF cross-check that
  `scripts/mx-fiscal/check-docs.mjs` enforces (both series against their Cuadro 2 rows). Real rates on both pages are
  differences (target minus inflation, Banxico's definition), never the compounded ratio.
- Site-wide conventions (owner's): every heading Title Case in both languages (`tc()` in `site/gap/app.js` and
  `site/assets/airport-model.js`, `titleCase(str, es)` in `present-core.js`); American English in the English view
  (installment, amortization, program, itemized, canceled, gray); English finance abbreviations in English (EV, P/E,
  ND via `evL()/peL()/ndL()`), Spanish keeps VE, P/U, DN.
- Share prices: every market fetcher (GAP, OMA/ASUR, Quálitas, Gentera, Oracle) keeps only completed sessions through
  `scripts/lib/completed-sessions.mjs`: a bar dated today counts only after that exchange's close in its own time zone
  (BMV 15:30 CDMX, NYSE/Nasdaq 16:15 New York, B3 18:15 São Paulo, BME 17:45 Madrid), so a morning run never publishes
  an intraday quote as a "close". The header shows the close date and the fetch time in CDMX. FactSet cannot run in
  GitHub Actions: the airport pages (GAP, ASUR, OMA) and Oracle get FactSet closes from their nightly cloud routines
  (files committed to the repository and overlaid by the fetchers); for Quálitas and Gentera it is only an in-session cross-check.
- Executive summaries write the next-results date as the token `{{nextResults}}`; the page fills it from the
  release-lag rule (`nextResults()` in the model) and the deck engine resolves it in `execSummary()` (`tokens()` in
  `present-core.js`), never a hand-written date.
- One language setting for the whole site (owner, 2026-10-05): every page reads and writes `localStorage["fnam-lang"]`
  (legacy keys such as `gap-lang`, `orcl-lang`, `fiscal-lang`, `macrodash-lang`, `mxmacro-lang`, `hyp-lang` are read once as a
  fallback) and honors `?lang=en|es`, which wins over the stored choice; `document.title` follows the language.
- Model pages: the language pill (ES/EN/PDF) is fixed inside the band the sticky jump-nav occupies (pill ≤ 37 px tall at
  `top:6px`; `nav.jump .wrap::after` is a sticky spacer that keeps the band's right end free), so it never covers the nav,
  charts or DCF inputs once the page scrolls; the PDF button stays on phones. The second "Data last generated" stamp is
  `class="genStamp"` (never a duplicate id). Each model sets `data-status-time` on its status dot (the header's data time), and
  `assets/data-status.js` prints it in the tooltip before the watchdog's verdict; the landing page's status grid reads each
  dashboard's own stamp from the first bytes of its data file (`STAMPS` in that script) and shows the watchdog verdict beside it.
- OMA's net debt includes lease liabilities (`debtExtraItems` in `site/oma/config.js`), matching OMA's own definition.
- GAP page headings are Title Case in both languages (`tc()` in `site/gap/app.js`); the debt instruments table is a
  FactSet Debt Capital Structure snapshot (`REF.debt.instrumentsAsOf`) with series names from the 6-Ks, refreshed
  in-session after each quarterly report; `REF.noGuidance` explains the years without guidance (2020, 2021).
- GAP dividends: the AGM approves one amount per share payable in instalments over the following 12 months
  (`REF.dividends[].payableUntil`); the exchange record in `market.js` shows only what has gone ex. Compare the
  two (page, deck and validator do) before calling the feed stale. The 2026 Ps. 20.80 was unpaid as of Sep-2026.
- Per-model memory files (decisions, pitfalls, open items) live next to the runbooks: `tools/gentera/MEMORY.md`
  (others as they are written). Read the one for the model you are touching.
- Fiscal dashboards (owner's rules, 2026-10-01): every block says "Data through <date>" (never "live"); every figure
  carries a Reported / FNAM calculation / FNAM estimate badge and an ⓘ with its source and date
  (`site/assets/provenance.js`, shared); a data point past its allowance turns amber in the reader's browser and a
  value the last download did not return is labeled as stored, never shown silently; no placeholder ("—", typed-in
  fallback dates) may render; INPC variants (monthly vs. first-half-month, original vs. seasonally adjusted) are
  always named. Rules: `site/fiscal/freshness-rules.js` (Debt to the Penny and the policy rates: amber after 2 U.S. business days) and
  `tools/mx-fiscal/freshness.json`; details in each page's runbook/MEMORY.
- US fiscal monitor: the FedWatch snapshot carries the FULL distribution per meeting (every bucket the outlet quotes; a
  "hike vs hold" reading is never collapsed into one bucket) and the callout lists every bucket priced at 1% or more for the
  last meeting; the Spanish view names its sources in Spanish (`SRC_ES` in `blocks.js`); the rate corridor's "Data through"
  is the effective rate's date (one date for the block); no typed fallback values remain for RRP, composition or balance-sheet
  dates (missing data prints "—"); the Chart.js and data scripts sit just before the page script, not in `<head>`.
- US fiscal monitor (`site/fiscal`): runbook `tools/fiscal/README.md`. Every figure is bound to `data.js`
  (fetched twice a day) or `monthly-data.js` (research routine); `scripts/fiscal/check-freshness.mjs`
  runs after each refresh and opens a `fiscal-health` issue when a data point outlives its publisher's
  cadence or the rates disagree with the FOMC target range. CME FedWatch and Investing.com refuse
  scripts, so the FedWatch odds come from named outlets quoting FedWatch, one to four meetings, and the
  page composes the prose. Probe a blocked source from the runner with the workflow's `url` input.
  Section 06 (CBO) is composed entirely from the research file's CBO keys (years, record year, vintage,
  links); never type a CBO year or figure into the page. The static markup carries the figures of the
  last refresh (Spanish, for no-JS readers and text fetches): `scripts/fiscal/bake-page.mjs` writes them
  and the refresh workflow runs it and commits index.html with data.js, so on a merge conflict in
  index.html keep your side and bake again. Before pushing a page change run the bake, then
  `scripts/fiscal/render-check.mjs` (Playwright, twelve configurations plus language, JavaScript-off and
  missing-data passes) and look at its `--shots` crops of the canvas charts. The page opens in Spanish;
  `?lang=` wins, then the reader's saved choice (`fiscal-lang`); the toggle rewrites `?lang=`.
  Debt-to-GDP appears as three labelled measures (live; FRED quarterly GFDEGDQ188S, which the macro
  dashboard's fiscal view shows; FRED annual GFDGDPA188S) and interest as gross (MTS table 3, accrual
  dataset) or net (MTS table 9, CBO, the macro view); label any new figure the same way on both pages.
