# American Consumer — memory (decisions, pitfalls, open items)

Read with `README.md` (the runbook) before touching `site/consumidor/` or `scripts/consumidor/`.

## Decisions (owner, 11-Oct-2026)

- The page complements the U.S. Macro Monitor: structure and distribution here (deciles, demographics, states, wealth,
  sources and uses); monthly series stay on the macro page and the summary links to them. Do not duplicate them.
- Company read-through = curated quarterly figures from each company's results release, each cited and dated; updated
  in a session after each earnings season. No company figure is fetched and published unreviewed.
- Coverage is a broad cut of the consumer: mass retail and e-commerce, value and off-price, grocery, home
  improvement, restaurants (quick service to casual dining), card lenders. Add or drop names in `companies.json`.
- Sources: U.S. government publications first (Census, BLS, BEA, Federal Reserve), the New York Fed, and companies'
  own SEC filings. No press, no data vendors, with one exception the owner asked for: the K-shaped section.

- K-shaped economy section (owner, 11-Oct-2026): include Mark Zandi's research among credible sources, with charts.
  Official statistics carry the time-series charts; figures by others (Moody's Analytics, Federal Reserve research)
  are dated, linked, badged by who produced them, and compared in one bar chart, never mixed into an official series.
- Chart axes the owner set (11-Oct-2026): spending-share chart, top 20% on the left from 35%, top-10% series on the
  right from 20%; income-share chart, top 10% and next 40% on the left from 35%, bottom 50% on the right from 20%.
  These two charts are the only two-axis charts of the page; do not "fix" them back to one axis.
- Gig work (owner, 11-Oct-2026): as the companies report it (Uber, Lyft, DoorDash, Instacart), limited to the United
  States where possible. The official U.S. count is Census Nonemployer Statistics; the platforms' worldwide trips and
  orders are shown apart and never summed into a U.S. figure.

- Leverage and financial stress section (owner, 11-Oct-2026, "yes to all of this" to twelve proposed measures): debt
  against assets and cash by group, card payment behavior, credit access and expected delinquency, buy now, pay later
  (Fed survey, CFPB, lenders), cash cushions, rent burden and bankruptcies by state, student loans by status, inflation
  by spending decile, saving by income decile, and auto / installment / pawn lenders. Official or SEC-filed sources
  only; buy now, pay later lenders get the same United States-first treatment as the gig platforms.

- Stat tiles (owner, 11-Oct-2026): when the label under a number starts with "of", it is lower case ("10.2% / of card
  accounts pay only the minimum"); the Spanish view does the same with "de" / "del". Sentences that begin a
  paragraph keep their capital.

- Nothing on the page may go stale, and its upkeep takes nothing from the owner (11-Oct-2026). The workflow keeps
  the sources; the scheduled task "FNAM American Consumer: daily upkeep" keeps the curated parts and the health of the
  refresh (README → "What keeps the page current"). Its note reaches her only on a day with changes or problems.
  Task id `trig_01SvWsQ6xkKnArusWZLwFUpo` (created 11-Oct-2026 from a session; 15:25 and 22:25 UTC; runs without
  asking for approvals; email notification on). It does nothing until the page is on `main`. Its prompt is the text
  between the two rules of `ROUTINE-PROMPT.md`: change both together.
  Typed sample sizes and other figures that are not read from data stay out of the page's text.

## Pitfalls already met

- A workflow that is not on main cannot be started by hand, and a session cannot read run logs: while building the
  page the runner answered through commits on the feature branch (`probe.mjs`).
- Census API: a key is required; variables are checked against their labels because codes move between vintages.
- BLS API: item and column codes of the CE tables were verified by title; a refused request is split to isolate the
  bad id. Taxes and after-tax income by decile were not published for 2024 through the API when the page was built
  (the page uses income before taxes).
- BEA API: 503 on the runner; BEA tables come through FRED (release tables for 2.6 and 2.3.5; state series by id).
- New York Fed workbook: the file name carries the quarter; the fetcher walks back from the current quarter. Sheets
  are matched by title, not position.
- Object keys that look like integers sort first in JavaScript: decile columns are kept as a sorted array ('01'…'11').
- Chart.js: never pass `callback: undefined` in tick options (the category axis then prints indices).
- The Aleutians fall outside the map's frame in the Albers USA shapes; the map SVG clips them.
- BEA's API answers 503 on the runner, but its static files do not: the distribution of personal income comes from the
  summary CSV on `apps.bea.gov`.
- Michigan's sentiment by income tercile is a form post (table 2, CSV) on the survey's data site; there is no FRED mirror.
- EDGAR full-text search (`efts.sec.gov/LATEST/search-index?q="phrase"&ciks=…`) answers from the runner and is the quick
  way to find which filing carries a sentence (used to establish that Uber dropped its driver-earnings line in 2025).
- Synchrony files a monthly statistics 8-K under Item 2.02 too: the harvester pins the filing the curated file cites,
  and "newer report" needs a filing at least 60 days newer.

- BLS answers 403 to a browser user agent and 200 to the identified one (`BOT_UA`) on `www.bls.gov` pages and files
  (the opposite of what one expects); `download.bls.gov` refuses both.
- The BLS "Distribution of Personal Consumption Expenditures" ranks households by their spending, not by income: its
  top decile is not comparable with "top 10% by income" without saying so. Its workbook's name carries the years.
- Uber's, DoorDash's and Lyft's trips, orders and bookings are worldwide; Lyft includes Freenow (Europe) since 2025,
  so its year-over-year growth is not a U.S. growth rate.
- A results release and the 10-Q often share a filing date: a curated figure that cites the 10-Q needs `form: "10-Q"`.
- Moody's top-10% share has two vintages: 49.7% (Q3 2024) and 49.2% (Q2 2025) before a change of method to reflect
  taxes, 45.8% (2025) after. Never plot them as one series.

- U.S. Courts Table F-2: a district label can carry a footnote mark ("AR ²": Arkansas' two districts on one row);
  7,338 cases went missing until trailing non-letters were dropped. The districts-add-up check caught it.
- Federal Reserve report pages put every table cell on its own line: reading them as text gives no rows. Read the
  `<table>` markup (`fedBlocks`).
- SCF historical table 18 is 50+ columns wide; cutting rows at 40 columns lost the "60 days late" block.
- Curated figures from tables in thousands: the number in the record is the printed one (unit `usdK` / `K`); a converted
  number would not be found in its text.

## Open items

- ACS 2025 and CE 2025: not on the publishers' APIs on 11-Oct-2026; the fetcher takes them when they appear. When the
  CE year changes, check that every item title still matches (`raw/status.json → notes`).
- Third-quarter 2026 results: banks from mid-October, retailers in November. The daily task curates them; read its
  first notes to see that the records it writes keep each company's segment and definitions.
- Moody's Analytics publishes its estimates through the press and social media; no primary page exists to link. When a
  newer figure appears, read it in an article that can be opened and add it to `data/kshape.json` with its date.
- Federal Reserve survey of household well-being: the 2026 edition (data for 2026) should appear in May 2027; the reader
  finds the newest report by itself. A new Board note on buy now, pay later has to be added to `SHED_NOTES` by hand.
- Affirm: if a later shareholder letter is filed as readable text, curate the quarter from it instead of the 10-K.
- Credit Access Survey: the October 2026 wave is due in November 2026.
- U.S. Courts Table F-2 for 30 September 2026: due about the end of October 2026.
- No board presentation (PDF) for this page; none was asked for.

- 2026-10-31: ACS 2025 renumbered table B15003 (two grade lines merged; ids from 015 on shifted by two). The education variables are now found by label in each vintage (`ACS_EDU` in fetch.mjs); never add a typed B15003 id to the label table.
- PayPal: the stored 10-Q of 2026-10-27 had no matching passages; the quarterly pattern was widened 2026-10-31. Its three 10-Q figures stay on the Q2 2026 filing until the next harvest stores the new passages.
