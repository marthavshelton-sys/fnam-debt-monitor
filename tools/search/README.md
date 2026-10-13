# Site search (every page)

Every page carries a search button (also `/` or Ctrl/⌘+K) that opens a dialog suggesting pages, sections, macro
indicators and board presentations as the reader types, in the language on screen. Owner's requests, 13-Oct-2026:
"oracle" or "ORCL" must suggest the Oracle page, and so on for every page (on the landing page); then "add to each page".

## Where the button sits

| Pages | Button |
|---|---|
| Landing page; hubs `/aeropuertos/`, `/aeropuertos/trafico/`, `/aeropuertos/aerolineas/`, `/mauricio/`, `/otras-empresas/` | field in the top bar between the brand and the language switch (`<div class="wrap fs-topbar">`); its own row on phones |
| Models GAP, OMA, ASUR, Quálitas, Gentera, Oracle; American and Mexican Consumer | magnifier, first button of the language pill; the desktop band the sticky section menu leaves for the pill is 340 px (was 300) |
| US and Mexico fiscal monitors; the eight Hyperscaler Hub pages | magnifier, first button of the language pill |
| US and Mexico macro dashboards | field under the language toggle in the rail; on phones a magnifier beside the section picker, on the bar's second row (template and page edited together; both pages' phone bars have two rows) |
| 404 page | field under the address; opens with the words of the missing address (`data-search-prefill="path"`) |

Not on the owner-only `quality.html` pages. A new page gets the search with three things: `<link rel="stylesheet"
href="/assets/search.css">` in `<head>`, `<script src="/assets/search.js" defer></script>` before `</body>`, and a button
with `data-search-open` (`class="fs-icon"` inside a pill, `class="fs-field"` with a `<span class="fs-label" data-es=…
data-en=…>` for a field). The script builds the dialog and names the buttons in the page's language (`<html lang>`, which
every page keeps in step with its toggle; `data-search-lang` on `<html>` overrides it where a page shows both languages).
A result on the page being read is reached in place: an anchor scrolls there (the Oracle model opens a collapsed section
from its anchor), a macro `?view=` is switched by the page's own rail; anything else is a navigation with `?lang=`.

## Files

| File | What it is |
|---|---|
| `site/assets/search.js` | the dialog (built in the page), ranking and display; no data of its own |
| `site/assets/search.css` | the buttons and the dialog, with the site's own light and dark palette (classes `fs-…`) |
| `site/assets/search-index.js` | the index, `window.FNAM_SEARCH_INDEX` (generated; never edit by hand) |
| `scripts/search/build-index.mjs` | builds the index by rendering every page (`extract-page.js` runs inside each page) |
| `scripts/search/check.mjs` | what the search must find, and that every page carries it, shows it well and runs it |
| `tools/search/aliases.json` | the only curated input: identifiers and abbreviations, each checked against its page |
| `.github/workflows/search-index.yml` | rebuilds, checks and commits the index (merges to main, daily 09:37 UTC, by hand) |

## How the index is built

`node scripts/search/build-index.mjs` serves `site/`, opens every `site/**/index.html` in headless Chromium in Spanish and
in English (`?lang=`), and reads what a reader sees after the scripts run:

- **Pages**: the landing page's card title (else the page's own `<title>`, first part; model and module `<h1>`s are composed
  from data and are not used as names), the hub that lists it, the card's description, the footer's short name.
- **Sections**: every visible `h2`, keyed by the anchor that reaches it (a jump-bar target, else the closest `section[id]`,
  else the heading's id). Sections hidden with the `hidden` attribute (the Quálitas and Gentera valuation sections) and
  markup removed from a page (the airport DCFs) are not indexed. Collapsed sections (Oracle) are, and the Oracle page opens
  a section from its anchor.
- **Macro views**: one entry per rail item of the two macro dashboards (`?view=<id>`), with the rail's group label.
- **Board presentations**: the landing page's PDF links (`?present=1`); they rank low unless the query says pdf, deck,
  presentación, consejo or board.
- **Keywords** of each entry: sub-headings, table headers and first-column labels (company names and tickers, airports,
  states, line items), captions and selector choices, stored as one bag of distinct normalized words (Spanish and English
  together). Tokens carrying a digit, month names and stopwords are dropped, so a data refresh that changes a figure in a
  label does not change the index.

Not indexed: the landing page's own card grids (the pages are their entries), redirect stubs (`/macro/en/`), `404.html`,
the owner-only `quality.html` pages, and any page carrying `<meta name="fnam-search" content="exclude">` or listed under
`exclude` in `aliases.json`.

The build fails, and the site keeps its last index, when a page does not render in both languages, a page has no title,
an address in `aliases.json` is not an entry, or a curated term does not appear on its page.

## Curated terms (`tools/search/aliases.json`)

Keyed by address: a page (`/oracle/`), a section (`/mx/fiscal/#pemex`) or a macro view (`/macro/?view=cpi`).

- `ids`: what the entry **is** (company name, tickers, an indicator's abbreviation). Typing one in full puts the entry first.
- `aliases`: what it **covers** (the Hyperscaler Hub covers ORCL). Typing one in full ranks it high, below the entry it is.

Every term must appear in the text of its page (either language); a term the page does not use (e.g. "BNPL", which the
American Consumer page spells out as "buy now, pay later") cannot be added. Add terms only for identifiers and
abbreviations that titles do not carry; everything else is read from the pages.

## Ranking (site/assets/search.js)

Accents, case and punctuation are ignored; both languages match whichever is on screen; every typed word must match
(a prefix counts: "remes" → "remesas"); a word of five letters or more that matches nothing is read as a typo of the
nearest words ("oracel" → "oracle"). Weights per word: identifier 70, title in the language on screen 60 (40 in the other
one), group label 40, parent page's identifier 36, alias 34, description 22, context 18, keyword 11 × rarity. Bonuses: an
identifier typed in full +1000 (alias +420, identifier prefix +220), the title itself +200 / its start +90 / the words in
order inside it +45, the words in order in the description +40, a section of the page the query names with the rest of
the query in its title +150 ("oracle capex", "gap tráfico"), pages +30 and views +8 when matched on what names them.
When no entry has every word, the entries with the most words are shown, with a note.

## Checks

```
node scripts/search/build-index.mjs                 # rebuild (writes only when something changed)
node scripts/search/check.mjs --shots /tmp/search   # queries, every page (ES 1280 light, EN 360 dark), the flows
node scripts/search/check.mjs --pages /gap/,/macro/ # the queries, those pages and the flows
node scripts/search/check.mjs --queries-only        # what the workflow runs before committing
```

Every page: a visible button inside the screen (24 px target at least), nothing wider than the screen, no script error,
the dialog opens with the cursor in the field, "orcl" gives the Oracle model first in the page's language, Esc closes it
and gives the focus back. Flows: `/` and Ctrl+K, arrows, Enter in the reader's language, a landing-page panel, an Oracle
section and a US macro view reached in place without reloading, the 404 prefill, GAP's own language toggle renaming the
button and the dialog. After a change to a page that has its own check (airport models, consumer pages, Oracle, US fiscal
with its bake, US macro's live check with `--local`), run that one too.

`check.mjs` holds the queries whose first result is fixed (`EXPECT`): the owner's example (oracle / ORCL / orcl / a typo /
a prefix → `/oracle/`), every ticker and company name, the curated abbreviations, and three company + topic pairs. When a
page is restructured on purpose and one of those sections changes address, update `EXPECT` (and `aliases.json`) in the
same change. Before pushing a change to a page header, `search.js` or `search.css`, run the full check and look at the screenshots.

## Failure handling

A failed build or check commits nothing and opens one "SEARCH INDEX: build failing" issue (label `search-index`), closed
by the next good run. The search keeps working on the last good index meanwhile; only newer page changes are missing.
The index is not a data dashboard, so it is not on the watchdog's list or the landing page's refresh panel.

Caching: `site/_headers` serves `search.js`, `search.css` and `search-index.js` with `no-store` (the zone's 4-hour
browser cache would otherwise keep an old copy under the same URL). The index is fetched only when the reader reaches for
the search (hover, focus or touch on a button, the shortcuts), except on the landing page, which fetches it once idle
(`data-search-prefetch="idle"`).
