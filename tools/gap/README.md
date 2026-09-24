# GAP financial model — runbook

The interactive model lives at `site/gap/` (`index.html` + `app.js`) and is served at
**https://fnam.mx/gap/** behind a password (see *Access* below). Every figure on the page comes from
one of five data files in `site/gap/data/`; nothing is hard-coded in the page.

| File | What it holds | How it is refreshed |
| --- | --- | --- |
| `financials.js` (`window.GAP_FIN`) | Income statement, balance sheet, cash flow and operating KPIs for every quarter since 3Q18, the year-to-date columns GAP prints (6M/9M/12M) and fiscal years FY2018→ | **Automatic.** `gap-refresh.yml` → `harvest-releases.mjs` → `build-data.mjs` → `validate-data.mjs` |
| `traffic.js` (`window.GAP_TRAFFIC`) | Monthly terminal passengers by airport (domestic / international / total) since 2018, plus CBX users (a month's own release, else the following year's comparative column) | **Automatic.** Same pipeline (monthly traffic release ≈ the 5th of each month) |
| `guidance.js` (`window.GAP_GUIDANCE`) | Management guidance vintages: full-year growth ranges (traffic, aero / non-aero / total revenue, EBITDA, EBITDA margin) and capex, one entry per release that printed a guidance table, with the intro and assumption text GAP wrote | **Automatic.** `build-data.mjs` scans every archived release for the guidance table (January guidance release, 4Q results, mid-year revisions) |
| `comments.js` (`window.GAP_COMMENTS`) | One-line explanations per income-statement line (`lines`) and per operating metric (`ops`) for year-over-year comparisons (quarter, YTD, fiscal year), ES and EN, written from the results release and the earnings-call transcript; keyed `2026Q2`, `2026M6`, `FY2025` | **Drafted by the alert routine** when a new quarter lands (from the release), then reviewed; transcripts are folded in by hand when supplied |
| `summary.js` (`window.GAP_SUMMARY`) | Executive summary at the top of the page: operations, guidance and why it changed, debt ratios, what to watch; four bilingual bullet sections plus the basis periods | **Rewritten by the alert routine** when results, traffic, guidance or an event land |
| `market.js` (`window.GAP_MARKET`) | Daily closes GAPB.MX, PAC, ASURB.MX, OMAB.MX, ^MXX; GAPB cash dividends; USD/MXN; MX and US 10-year yields | **Automatic, daily** (`fetch-market.mjs`, weekdays 22:40 UTC) |
| `reference.js` (`window.GAP_REF`) | Slow-moving facts with sources: shares outstanding, concessions, PMD/tariffs, AGM dividends, debt instruments and ratings, CBX timeline and facts, FIBRA GAP fact sheet, DCF fallback assumptions | **Automatic via the alert routine.** Each weekday it reads any new event release (dividends, bond issuances or repayments, credit facilities, ratings, CBX / FIBRA GAP milestones, share-count changes) and edits this file on `main`, describing the change in the alert email. Shares outstanding also come from the latest results release once it is newer. Beta and cost of debt in the DCF are derived at render time (two years of weekly GAPB vs IPC returns; latest fixed-rate bond coupon); the values here are fallbacks. |
| `peers.js` (`window.GAP_PEERS`) | Peer multiples (ASUR, OMA, Aena, Fraport, Zürich, Auckland) | **Placeholder** until the FactSet connector is authorised; the page renders the schema with "pending" |

The **operating metrics** card at the top of section 01 (domestic / international / total terminal
passengers, CBX users, aeronautical and non-aeronautical revenue per passenger, CBX revenue per CBX user)
is computed at render time: passengers are the sum of `traffic.js` months in the selected period (they
tie to the quarterly report's total within rounding; before 2018 only the report's total is shown), unit
revenues divide the income-statement lines by those passengers, and CBX revenue (`is.revCbx`, the "CBX
revenues" line inside non-aeronautical revenue, consolidated from `reference.js` `cbx.consolidatedFrom`)
is divided by CBX users in the consolidated months only. Cargo WLUs, total WLUs and the three Exhibit F
ratios (aero + non-aero revenue per passenger, aeronautical revenue per WLU, cost of services per WLU) use
the reported `kpi` volumes; the card also carries a Comments column from `comments.js` (`ops`).

The income statement collapses two groups by default (the cost-of-services detail and the lines between
net income and comprehensive income attributable to the controlling interest); click the row to expand.
Its **Comments** column reads `comments.js` and only fills when period A is compared with the same period
a year earlier. Percentages quoted in a comment are GAP's; where GAP restated the prior-year base in a later
release, the table (as originally reported) can differ slightly, and the comment says so.

`tools/gap/raw/6k/` keeps the text of every release the pipeline parsed (one file per release, source URL
in the header) and `tools/gap/raw/manifest.json` lists them. They are the audit trail: any number on the
page can be traced to a line in one of these files.

## Pipeline (`.github/workflows/gap-refresh.yml`)

```
scripts/gap/fetch-market.mjs      Yahoo Finance + FRED  -> site/gap/data/market.js
scripts/gap/harvest-releases.mjs  GlobeNewswire listing -> tools/gap/raw/6k/*.txt (+ manifest.json)
scripts/gap/build-data.mjs        raw releases          -> site/gap/data/financials.js, traffic.js, guidance.js
scripts/gap/validate-data.mjs     tie-outs; non-zero exit blocks the commit
git commit "[skip actions]" + push  Cloudflare Pages deploys the commit; the marker keeps GitHub Actions from re-running
```

* Schedules: weekdays 22:40 UTC (market only) and 14:30 UTC on the 6th, 12th, 18th and 24th (releases +
  market). GitHub only runs schedules on the **default branch**, so merge this branch to `main` for the
  automation to start; until then trigger it from the Actions tab (`workflow_dispatch`, inputs `mode`
  = market | filings | all, `full` = re-download everything).
* The harvester is incremental: releases already in the manifest are skipped. Pass `--full` after
  changing the classifier in `harvest-releases.mjs`.
* Why GlobeNewswire and not EDGAR: SEC EDGAR refuses GitHub-hosted runners ("undeclared automated
  tool") whatever the User-Agent. The same releases are furnished to the SEC as Form 6-K exhibits.
  From a workstation, `node scripts/gap/harvest-releases.mjs --source=sec` (with
  `SEC_USER_AGENT="<name> <email>"`) pulls the 6-Ks and the 20-F XBRL company facts; `build-data.mjs`
  then also fills **FY2015–FY2017** from the XBRL facts (GlobeNewswire only starts in 2019, so those
  years would otherwise be empty — the file it writes, `tools/gap/raw/companyfacts.json`, can simply be
  committed; it is optional now that the PDF reports cover FY2015–FY2017).
* **Pre-2019 reports (FY2015–FY2017)** come from the 4Q15, 4Q16 and 4Q17 quarterly-report PDFs in
  `tools/gap/raw/pdf/`, converted once with `scripts/gap/pdf-to-text.py` (pdfplumber; see the file
  header) into the same pipe-delimited text format under `tools/gap/raw/6k/` (`*_pdfNQyy_en.txt`).
  To add another PDF report, drop it in `tools/gap/raw/pdf/` named `<YYYY-MM>_<nQyy>_….pdf`, run the
  converter, then `build-data.mjs` + `validate-data.mjs`.
* Validation (`validate-data.mjs`): revenue components = total; EBT + tax = net income; assets =
  liabilities + equity; cash begin + net change = cash end; CF cash end = BS cash; YTD = sum of
  quarters for revenue / net income / EBITDA; domestic + international = total per airport; airports
  sum to the group total; no missing quarter in the 12-quarter window; no missing month since 2019.

### When a release changes format

`build-data.mjs` matches each printed line item against the regexes in `IS_ROWS`, `BS_ROWS`, `CF_ROWS`,
`KPI_ROWS`. A new or renamed line prints a warning (`IS unmatched: …`) in the workflow log and, if a
subtotal no longer reconciles, the validator fails and nothing is committed. Fix = add the label variant
to the regex (or a new row to the catalogue, which also adds it to the page), run
`node scripts/gap/build-data.mjs && node scripts/gap/validate-data.mjs` locally, commit.

## Manual updates (now rare; the routine handles the usual events)

**`site/gap/data/reference.js`** — update when:

* the AGM approves a dividend → `dividends[]` (Ps. per share, date, source);
* shares outstanding change (buyback cancellation, issuance) → `shares` + `shares.history[]`;
* a bond / loan is issued or repaid, or a rating changes → `debt.instruments[]`, `debt.ratings[]`.
  Optional: `debt.history[] = [{ q: "2025Q4", grossDebtMxnM: … }]` extends the net-debt chart to
  quarters whose published balance sheet only shows total liabilities (before 2Q26);
* CBX or FIBRA GAP milestones → `cbx.timeline[]`, `fibra.status_es/en`;
* the PMD / maximum-tariff cycle is renewed → `regulation`, and the DCF `capexMxnM` profile.

**`site/gap/data/peers.js`** — populate from FactSet (field contract in the file header). The page
shows GAP's own multiples computed live and each peer's row once values are non-null.

## Access (password)

`functions/gap/_middleware.js` is a Cloudflare Pages Function that guards every URL under `/gap/`.
**It is dormant until `GAP_PASSWORD` exists**: without the variable the page is served openly (with
`noindex` and `no-store` headers). To turn the password on, configure once in the Cloudflare dashboard → Workers & Pages → the Pages project → **Settings →
Variables and Secrets**, for **Production and Preview**:

| Variable | Required | Meaning |
| --- | --- | --- |
| `GAP_PASSWORD` | to enable | The shared password. Unset = no password, page served openly. |
| `GAP_SESSION_SECRET` | no | Random string signing the session cookie; defaults to a hash of the password. |
| `GAP_SESSION_DAYS` | no | Session length in days (default 30). Append `?logout` to any /gap URL to end a session. |

The function directory must sit at the **project root** (next to `site/`). If the Pages project's
"root directory" setting is `site`, move the file to `site/functions/gap/_middleware.js`. Cloudflare
picks it up on the next deploy; no build step is needed. Page and data responses are sent with
`Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.

## Reusing the design for another company

`tools/gap/PROMPT-company-dashboard.md` is a fill-in-the-blanks prompt that specifies this model
(sources, coverage, sections, toggles, aesthetics, automation, delivery) plus a list of improvements,
for building the same dashboard for another listed company with Claude or another LLM.

## Print as presentation

The 🖨 button next to the language toggle switches the page into print mode (light theme, tables trimmed
to the last 8 quarters, fixed-size charts, a cover with the basis dates and a confidentiality line, a
closing slide with the sources) and opens the browser's print dialog; choose "Save as PDF", Letter
landscape. Each section starts on a new page and cards never split. Ctrl/Cmd+P triggers the same mode.

## Local preview

```
npx http-server site -p 8080      # then open http://localhost:8080/gap/  (no password locally)
```

## Change notifications (email)

A Claude Code Routine ("FNAM GAP: email material changes") runs each weekday at 15:30 UTC, one hour
after the release harvest. It compares the newest quarter, the newest traffic month, the newest guidance vintage and the
`reference.js` blob against `tools/gap/notify-state.json`; when something material changed, its final
message is a concise note with analysis, which the platform delivers to the repo owner by email (the
routine's completion notification, the same mechanism as the Mexico Fiscal monitor), and it records
the alert in the state file on `main`. If nothing changed the note is the single line "No material
change in GAP data today." If the data files fail to load or `validate-data.mjs` fails, it reports a
one-line pipeline alert once per distinct failure. Manage or pause it from the Routines list in
claude.ai/code.


## Board presentation (PDF) — the "Presentación (PDF)" button

`site/gap/present.js` builds a Letter-size PDF in the browser in one click (jsPDF + jsPDF-AutoTable, vendored in
`site/assets/vendor/`; charts drawn off-screen with the page's Chart.js). It reads `window.GAP_MODEL`, the read-only API
that `app.js` exposes at the end of its IIFE, so every figure is the same calculation the page shows. Language follows
the ES/EN toggle; the file is named `GAP_PAC_presentacion_<date>.pdf` / `GAP_PAC_board_presentation_<date>.pdf`.

Pages: cover (landscape, unnumbered) · executive summary (`data/summary.js`, font auto-fitted to one page) · tear sheet
(market data with fetch timestamp, LTM and quarter EBITDA, net debt/EBITDA, GAP B vs IPC rebased, 3-year price) ·
operating metrics and income statement of the latest quarter, latest fiscal year and LTM (portrait, with the
`data/comments.js` call comments; the LTM page reuses the latest quarter's comments and says so) · guidance in force,
track record and every vintage (landscape) · traffic by airport (latest month and LTM) · GAP vs Mexico (AFAC, from
`/aeropuertos/data/traffic.js`, two axes) · sections 07 leverage, 08 dividends, 09 CBX, 10 FIBRA GAP (landscape, bullets
and charts) · sources and methodology. Every page after the cover carries the confidentiality footer and "Page X of Y".

Next results date: `reference.js` → `calendar.nextResults` when GAP has announced it (shown as *confirmed*); otherwise
the PDF assumes the median lag between quarter-end and release for the same quarter over the previous three years and
labels it *assumed*. The authorship line reads "Powered by <name>"; the name defaults to "Claude (Anthropic)" and can be
overridden by defining `window.FNAM_MODEL_NAME` before `present.js` loads.

Conventions the data files feed the PDF with: `summary.js` bullets may wrap their two to four most important words in
`**double asterisks**` (rendered bold on the page and in the PDF) and English section titles are written in Title Case;
`reference.js` → `fibra.placed` (with `placedDate`) flips the FIBRA page title from "(Not Yet Placed)" once the offering
completes; timestamps in the PDF are shown in Mexico City time.

Layout rules the builder enforces: tables shrink their font until they fit the page (`fitTable`), notes are pushed up
rather than over the footer (`noteAbove`), and a table that would still spill is logged in the console. Glyphs that
Helvetica lacks (−, ≈, →, Δ…) are swapped before drawing. To review the output headlessly, open the page with Playwright,
click `#btnPrint`, save the download and rasterise it (PyMuPDF) — see the session notes.
