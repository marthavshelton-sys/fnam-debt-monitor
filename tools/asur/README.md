# ASUR financial model — runbook

The interactive model lives at `site/asur/` (`index.html` + `config.js`, rendered by the shared engine
`site/assets/airport-model.js`) and is served at **https://fnam.mx/asur/** (password optional, see
*Access*). Every figure on the page comes from one of the data files in `site/asur/data/`; nothing is
hard-coded in the page or the engine.

| File | What it holds | How it is refreshed |
| --- | --- | --- |
| `financials.js` (`window.ASUR_FIN`) | Income statement, statement of financial position, cash flow, Table 1 KPIs (passengers by country, commercial revenue per passenger, capex, debt) and the country segments (Mexico, Puerto Rico, Colombia, United States) for every quarter since 1Q18, the year-to-date columns and fiscal years FY2018→ | **Automatic.** `asur-refresh.yml` → `harvest-releases.mjs` → `build-data.mjs` → `validate-data.mjs` |
| `traffic.js` (`window.ASUR_TRAFFIC`) | Monthly terminal passengers by airport (16 airports; domestic / international / total) and by country since Dec-2014 | **Automatic.** Same pipeline (monthly traffic release ≈ the 5th–8th of each month, PR Newswire) |
| `guidance.js` (`window.ASUR_GUIDANCE`) | Empty vintages: ASUR publishes no guidance table. The page shows the qualitative targets kept in `reference.js` (`regulation.facts`) instead | **Automatic** (the builder would fill it if a guidance table ever appears) |
| `comments.js` (`window.ASUR_COMMENTS`) | One-line explanations per income-statement line (`lines`) and per operating metric (`ops`) for year-over-year comparisons, ES and EN, from the results report and the call transcript; keyed `2026Q2`, `2026M6`, `FY2025` | **Drafted by the alert routine** when a new quarter lands; transcripts (`tools/asur/raw/releases/*tx_en.txt`) are folded in |
| `summary.js` (`window.ASUR_SUMMARY`) | Executive summary: operations, expansion and capital, debt and dividends, what to watch; four bilingual sections plus the basis periods | **Rewritten by the alert routine** when results, traffic or an event land |
| `market.js` (`window.ASUR_MARKET`) | Daily closes ASURB.MX, ASR, GAPB.MX, OMAB.MX (FactSet Global Prices, the share-price authority since 2026-10-06; Yahoo/Stooq only for the sessions FactSet has not posted yet) and ^MXX (Yahoo); cash dividends (Yahoo); USD/MXN; MX and US 10-year yields | **Automatic, daily** (`scripts/airports/fetch-market.mjs --company=asur`, weekdays 22:50 UTC, overlays `tools/gap/raw/factset/prices.json`; the nightly FactSet routine re-pulls the closes at 19:52 New York time and applies them with `scripts/lib/factset-prices.mjs apply`; method in `tools/gap/README.md` → "Daily closes") |
| `reference.js` (`window.ASUR_REF`) | Slow-moving facts with sources: shares (300 M; ITA merger ≈307.2 M), concessions, AGM dividends, debt instruments (Table 7), the Motiva / ASUR US event timeline and facts, the Aerostar / Airplan explainer, DCF fallbacks | **Alert routine** (dividends, loans, acquisitions, share count) + hand edits |
| `peers.js` (`window.ASUR_PEERS`) | Peer multiples (GAP, OMA, Aena, Fraport, Zürich, Auckland): last closes, USD market caps and ADTV, NTM EV/EBITDA and NTM P/E with 1-, 3- and 5-year averages, dividend yield, leverage, margin; medians | **Nightly** (19:52 New York time) by the cloud routine "FNAM Airports: FactSet peers refresh" through the FactSet connector, from the shared snapshot `tools/gap/raw/factset/latest.json` (`scripts/lib/factset-peers.mjs build`; runbook and definitions in `tools/gap/README.md` and `tools/gap/FACTSET-PEERS-PROMPT.md`). Every price is a FactSet close on one common date; ASUR's own row is FactSet's row computed like the peers (dividend yield from the AGM amount) |

Company specifics the engine handles through `config.js`: EBITDA margin "ex-IFRIC 12" = EBITDA ÷
revenues excluding construction services (ASUR's *Adjusted EBITDA margin*, Table 4); Aerostar (San
Juan) is consolidated at 100% with a 40% non-controlling interest, so the page's net income per share
uses *majority net income*; Table 1 debt figures (`kpi.netDebt`, `kpi.totalDebt`) are period-end
balances and are not summed across periods; ASUR US Airports (retail concessions at LAX, ORD and JFK,
consolidated from December 2025) has revenue but no passengers, which lifts non-aeronautical revenue
per passenger; the Motiva/CPC airports (closed 1-Sep-2026) consolidate from 3Q26.

`tools/asur/raw/releases/` keeps the text of every release and report the pipeline parsed (one file per
document, source URL and class in the header: `results-pdf` = quarterly report PDF, `results` = PR
Newswire summary, `transcript`, `traffic`, `other`) and `tools/asur/raw/manifest.json` lists them.
They are the audit trail: any number on the page can be traced to a line in one of these files.

## Pipeline (`.github/workflows/asur-refresh.yml`)

```
scripts/airports/fetch-market.mjs --company=asur   Yahoo Finance + Banxico SIE (USD/MXN FIX SF43718, bono M 10y auction SF44071; BANXICO_TOKEN; FRED fallbacks) + FRED (US 10y) -> site/asur/data/market.js
scripts/asur/harvest-releases.mjs                  PR Newswire organisation pages + keyword search (traffic, results, events)
                                                   asur.com.mx "Información financiera" (quarterly report and transcript PDFs;
                                                   URL pattern guessed for quarters the page does not link)
                                                   -> tools/asur/raw/releases/*.txt (+ manifest.json); PDFs converted with
                                                   scripts/airports/pdf2text.py (pdfplumber), PDFs themselves are not committed
scripts/lib/bmv-events.mjs --company=asur         BMV eventos relevantes (shared watcher, all five BMV models): a notice no wire /
                                                   IR document covers is archived as class "other" (Spanish, *_bmv<id>_es.txt);
                                                   state tools/asur/raw/bmv-events.json
scripts/asur/build-data.mjs                        raw text -> financials.js, traffic.js, guidance.js
scripts/asur/validate-data.mjs                     tie-outs (scripts/airports/validate.mjs); a failure blocks the commit; also writes
                                                   site/asur/data/quality.js for the hidden data-quality page https://fnam.mx/asur/quality.html
                                                   (identities, series freshness, curated files, origin of every quarter, parse warnings
                                                   from tools/asur/raw/build-log.json; renderer site/assets/quality-page.js)
git commit "[skip actions]" + push                 Cloudflare Pages deploys; the marker keeps Actions from re-running
```

* Schedules: weekdays 22:50 UTC (market only) and 14:40 UTC (releases + market). GitHub only runs
  schedules on the **default branch**; from another branch trigger it from the Actions tab
  (`workflow_dispatch`, inputs `mode` = market | filings | all, `full` = re-download everything).
* The harvester is incremental (releases already in the manifest are skipped). `--full` redoes
  everything. Event releases are kept from 2024 onwards; traffic and results from 2016.
* Why the BMV list (added 3-Oct-2026): ASUR's evento relevante of 28-Sep-2026 (offering disclosure: CPC Bridge
  Facility US$1,299 M, US$1,230 M drawn; pro forma balance sheet) went to the BMV and the SEC but not to PR Newswire,
  so the harvest missed it. Since the same day the shared watcher `scripts/lib/bmv-events.mjs` does this for GAP, OMA,
  Quálitas and Gentera too (it began inside this harvester; `tools/asur/raw/bmv-events.json` now holds the state and the
  rules: same-day match for events, a day's grace for results and traffic, ambiguous days archived whole). The quality
  page shows it as "BMV eventos relevantes" (stale after 4 days). A bond priced abroad (144A/Reg S) may reach no filing at
  all for days: the 1-Oct-2026 notes appeared only in the press (IFR, LatinFinance), so they sit in
  `reference.js → debt.events` labeled as press and enter no figure until ASUR files them.
* Why PR Newswire and asur.com.mx rather than EDGAR: SEC EDGAR refuses GitHub-hosted runners. The
  PR Newswire release carries only the summary tables; the full statements, Tables 1–7, the country
  reviews and the airport traffic tables come from the quarterly-report PDF on asur.com.mx.
* The report parser (`build-data.mjs`) reads: the income-statement exhibit, Table 1 (highlights and
  KPIs), Table 4 (revenues and costs), Table 5 (financing result), Table 6 (debt), the statement of
  financial position, the cash-flow statement (year-to-date; quarters derived by difference), the
  "Review of <country> Operations" segment tables and the airport traffic tables. Older PDFs printed
  in Spanish number format (1Q24) are handled. `finish()` derives *other revenues* and *income tax*
  from totals when a line is missing.
* Validation: revenue components = total; EBT − tax = net income (0.05% tolerance); assets =
  liabilities + equity; cash begin + net change + fx = cash end; CF cash end = BS cash; YTD = sum of
  quarters for revenue / net income / EBITDA (restatements under 1% are warnings); domestic +
  international = total per airport; airports sum to the group total; no missing quarter in the
  12-quarter window; no missing month since 2019. Older periods only warn (`WARN hist`).
* Known gaps: Table 1 capex is not captured for 2024 (the highlights bullets are interleaved with the
  table in those PDFs); FY2016–FY2017 statements exist only as comparatives.

### Traffic perimeter change: the Motiva / CPC airports (3-Oct-2026)

ASUR closed the CPC purchase on 1-Sep-2026 (20 airports: 17 in Brazil, Quito, San José, Curaçao) and said in its August
2026 traffic release (8-Sep-2026) that its monthly report includes them from September 2026 traffic on. Until the first
such release lands, and for the twelve months after it, a group total compared year over year would mix perimeters
(ASUR's 28-Sep-2026 evento relevante: CPC ≈24 M passengers in 6M26 against 36.2 M at the 16 legacy airports, so an
unadjusted comparison would show ≈+66% with no real growth; FNAM calculation).

* **Facts** live in `reference.js → perimeter` (closing date, `firstMonth`, legacy countries, the four new countries with
  airport counts, ASUR's announcement, the passengers ASUR filed, sources). No passenger figure ASUR has not published
  goes there, and none of the filed ones enters a chart or a total.
* **Status is computed, never typed**: the first month at or after `firstMonth` whose traffic carries BR/EC/CR/CW (or an
  airport located there). States: *awaiting* (latest month before `firstMonth`), *missing* (a release for `firstMonth` or
  later without them: amber/red), *reported*. The page engine (`PERIM` in `site/assets/airport-model.js`), the deck and the
  hub (`/aeropuertos/`, reads `/asur/data/reference.js` and `traffic.js` at runtime) apply the same rule; the validator
  writes it to the quality page as "traffic perimeter".
* **Page** (section 03): status card above the controls; a *Perimeter* switch, *Legacy perimeter* (default, 16 airports,
  every change like for like) or *Consolidated* (enabled only once a release carries the new airports). Any change between
  periods with different perimeters prints **n.c.** (traffic table, operating-metrics table, quarterly KPI table) with the
  legacy-perimeter change beside it. The card stays until the consolidated total is comparable month on month again
  (first month + 12). Group totals are computed as legacy countries + new countries, so they do not depend on whether ASUR's
  printed "Total Traffic" is consolidated.
* **Deck**: tear-sheet and traffic-table growth on the legacy perimeter; consolidated rows print n.c.; the quarterly
  passenger chart stays on the legacy perimeter.
* **Parser** (`build-data.mjs`): knows the four country labels in the summary table and "<Country> Passenger Traffic"
  tables; airports printed in those tables are listed with the release's own names (`group: 'cpc'`), countries join
  `traffic.js` only once printed. In the summary table an unrecognised labelled row with figures closes the current
  country (logged as "summary row not recognised"), so its domestic / international rows can never overwrite the previous
  country's, and three-letter codes are read as airports only inside country tables. Checked against two synthetic
  September releases: the expected layout publishes; an unknown block ("CPC Aeroportos") leaves Colombia intact and fails
  validation.
* **Validator**: per-country domestic + international = total, and countries sum = group total (both strict from 2019),
  on top of airports sum = group total. A first CPC release the parser cannot place therefore **fails the filings run and
  commits nothing** (market-only runs keep committing prices from the last valid data); fix the label in `build-data.mjs`.
* **First print checklist** (September 2026 traffic, expected about 6–8 Oct-2026): the quality page's "traffic perimeter"
  row turns to "since 2026-09"; the card shows "In traffic since Sep 26"; check the itemized count against 20 and whether
  ASUR prints prior-year comparatives for CPC (not used yet; consolidated growth stays n.c.). Open items for 3Q26 results
  (≈22-Oct): the DCF base passengers (`dcfDefaults`) are consolidated once traffic includes CPC, while the DCF note says
  Motiva is not in the base; revisit when the first consolidated quarter lands.

### When a release changes format

`build-data.mjs` matches each printed line against the regexes in `IS_ROWS`, `BS_ROWS`, `CF_*`,
`KPI_ROWS`, `SEG_ROWS`. A new or renamed line prints `IS unmatched: …` in the workflow log and, if a
subtotal no longer reconciles, the validator fails and nothing is committed. Fix = add the label
variant to the regex (or a new row to the catalogue, which also adds it to the page), run
`node scripts/asur/build-data.mjs && node scripts/asur/validate-data.mjs`, commit.

## Manual updates

**`site/asur/data/reference.js`** — the routine handles the usual events; update by hand when:

* the AGM or an extraordinary meeting approves dividends → `dividends[]` (Ps. per share, dates, source);
* shares outstanding change (ITA merger issuance, buybacks) → `shares` + `shares.history[]`;
* a loan or bond is drawn, issued or repaid → `debt.instruments[]` (Table 7 of the report; USD bonds
  converted at the quarter-end rate and noted); a rating → `debt.ratings[]`;
* Motiva / ASUR US / ITA milestones → `event.timeline[]`, `event.facts[]`; Aerostar / Airplan facts →
  `explainer.rows[]`; qualitative targets from the call → `regulation.facts[]`;
* the DCF fallbacks (`dcf`) when the capex programme or the concession horizon changes.

**`site/asur/data/comments.js`** — add the earnings-call colour once the transcript is archived
(`tools/asur/raw/releases/<date>_ir<nQyy>tx_en.txt`); percentages quoted are ASUR's.

## Access (password)

`functions/asur/_middleware.js` guards `/asur/*` exactly like the GAP one: dormant until
`ASUR_PASSWORD` is set in the Cloudflare Pages project (Settings → Variables and Secrets, Production and
Preview); optional `ASUR_SESSION_SECRET`, `ASUR_SESSION_DAYS`; `?logout` ends a session.

## Board presentation (PDF) — the "Presentación (PDF)" button

The button builds a Letter-size PDF in the browser in one click. The builder is shared by the airport pages
(`site/assets/airport-present.js`) and extends the generic engine `site/assets/present-core.js` (jsPDF +
jsPDF-AutoTable vendored in `site/assets/vendor/`; off-screen Chart.js charts; cover, footers, fit-to-page tables,
`**bold**` runs, Title Case, next-results rule). It reads `window.ASUR_MODEL`, the read-only API that
`airport-model.js` exposes at the end of its IIFE, so every figure is the same calculation the page shows; the prose
of sections 09 and 10 is read from the page itself. Language follows the ES/EN toggle; the file is named
`ASUR_<ADS ticker>_presentacion_<date>.pdf` / `..._board_presentation_<date>.pdf`. Ctrl/Cmd+P still prints the page.

Deep link: `/asur/?present=1&lang=es` (or `lang=en`) opens the page, sets the language and builds the PDF on arrival; the landing pages' "Board presentations (PDF)" links use it and pass the reader's current language.

Pages (15): cover · executive summary (`data/summary.js`, two columns auto-fitted; bullets without `**markers**` get
their lead clause emphasised) · tear sheet (price and ADS, market cap in MXN and USD, YTD and 12-month change vs the
IPC, 52-week range, AGM dividend and yield, LTM and quarter EBITDA, net debt/EBITDA, EV/EBITDA, P/E, passengers,
next results) · operating metrics and income statement for the latest quarter, LTM and fiscal year (portrait, ex-IFRIC
12, with the `data/comments.js` comments) · outlook, tariffs and investment commitments (`reference.js` → `regulation`,
`concessions`; the formal guidance layout switches on automatically when `guidance.js` carries vintages) · traffic by
airport (latest month with country subtotals, LTM, next traffic report from the median release day) · ASUR vs Mexico
from AFAC (`/aeropuertos/data/traffic.js`, two axes; Mexican airports only for a multi-country group) · 07 leverage,
08 dividends (with the annual cash-flow table), 09 and 10 (facts, timeline, fact sheet, the page's prose and a
company chart) · sources and methodology. Sections 04–06 are excluded on purpose.

Next results date: `reference.js` → `calendar.nextResults` once ASUR announces it (shown as *confirmed*); otherwise
assumed from the median lag between quarter-end and release for the same quarter over the previous three years.
To review the output headlessly, open the page with Playwright, click `#btnPrint`, save the download and rasterise it.

## Local preview

```
python3 -m http.server 8123 --directory site    # then open http://localhost:8123/asur/
```

## Change notifications (email)

A Claude Code Routine ("FNAM ASUR: email material changes") runs each weekday at 15:40 UTC, one hour
after the release harvest. It compares the newest quarter, the newest traffic month, the newest event
release and the `reference.js` blob against `tools/asur/notify-state.json`; when something material
changed it drafts the comments for a new quarter, updates `reference.js` for events (dividends, loans,
acquisitions, share count), rewrites the affected sections of `summary.js`, commits to `main`, and its
final message is a concise note delivered by email. If nothing changed the note is the single line "No
material change in ASUR data today."


## Conventions and pipeline notes (29-Sep-2026)

- Prices: `fetch-market` keeps only completed sessions, so the 14:30 UTC run publishes the previous close and the 22:40/22:55 UTC run the day's close; the page header prints the close date and the fetch time (CDMX). FactSet is available only inside a Claude session, not in Actions. Since 2026-10-06 FactSet's closes (nightly routine, `tools/gap/raw/factset/prices.json`) win on every date they carry; see `tools/gap/README.md` → "Daily closes".
- Headings are Title Case in both languages; the English view uses American English and EV / P/E / ND.
- The executive summary writes the next-results date as `{nextResults}`; the page and the deck compute it from the same release-lag rule (comparative-column sources are ignored).
- `?lang=en|es` overrides the stored language; the two statement periods can never be equal.
- Debt instruments are a dated snapshot (`debt.instrumentsAsOf`) with post-quarter issues and repayments in `debt.events[]`; the page prints subtotals against the balance sheet, the deck a maturity profile by year.
- Leverage: the page's 0.8× (shown to one decimal, as every leverage ratio on the page and in the deck) divides net debt by consolidated LTM EBITDA; ASUR's Table 6 prints 0.9× on the same net debt with a denominator it does not itemize, and its evento relevante of 28-Sep-2026 prints 0.8× on adjusted LTM EBITDA of Ps. 19,449 M; all are noted. The country-review passenger figures include transit and general aviation (the report's own note), the traffic tables do not; the page footnotes both bases. Motiva: only ASUR's filings feed the page (R$5.1 bn price; CPC Bridge Facility US$1,299 M signed 14-Aug-2026, US$1,230 M drawn at closing, per the 28-Sep-2026 evento relevante; the US$936.0 M JPMorgan figure of the 2Q26 report was the facility arranged with the offer); press-only figures are named in the status text and not used.

### Valuation perimeter: pro forma with Motiva / CPC (5-Oct-2026)

Owner's request after the 5-Oct-2026 review: the DCF, the multiples table (section 06) and the header's leverage and
EV/EBITDA tiles use `reference.js → proForma` while ASUR has not consolidated CPC: net debt = total debt Ps. 68,989 M − cash
Ps. 18,100 M (ASUR's pro-forma balance sheet at 30-Jun-2026 with CPC and the bridge, evento relevante 28-Sep-2026; FNAM sum
of the lines); base passengers +45 M a year and EBITDA +R$1,300 M ≈ US$243 M (proportionate LTM Sep-2025, signing release
18-Nov-2025) converted at the FIX of the balance-sheet date; CPC revenue = that EBITDA at the group's margin (FNAM
calculation, labeled). Minorities stay as reported. The page prints the caveat on both blocks (`pfCaveat()` in
`site/assets/airport-model.js`), the multiples table shows the reported figure beside each pro-forma one, the peers table
carries both ASUR rows, and the deck's tear sheet prints the pro-forma leverage beside the reported one. A "Perimeter"
select above the DCF inputs switches back to the reported figures (header tiles and multiples follow). The overlay switches
itself off once the latest balance sheet is dated on or after `proForma.consolidatedFrom` (2026-09-30, the 3Q26 balance
sheet): when 3Q26 lands, decide whether the LTM EBITDA still needs CPC's missing months (one month of CPC in 3Q26) and
either keep an EBITDA-only overlay or retire the block.
