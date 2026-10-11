# Mexican Consumer — memory

Decisions, pitfalls and open items of `site/mx/consumidor/`. Runbook: `README.md`. Read both before touching the page.

## Decisions (11-Oct-2026, when the page was built)

- The owner asked for "the Mexican equivalent of the American Consumer dashboard" in the Mexico section. The page
  mirrors its ten sections, its design and its upkeep (refresh workflow, tie-outs, curated company figures checked
  against stored filings, a daily scheduled task, a watchdog entry). Her rules for the American page apply here.
- Address `/mx/consumidor/` (with `/mx/consumer` redirecting) and the name "El Consumidor Mexicano / The Mexican
  Consumer" were chosen in the session, by analogy with `/mx/macro/` and `/mx/fiscal/`; she had not named them.
- ENIGH amounts are shown as pesos a month (published quarterly figure ÷ 3), with the quarterly figure beside the
  headline numbers, because readers think in monthly pesos and INEGI publishes quarterly ones.
- Wealth: the ENFIH 2019 is the only official household balance-sheet survey. Its figures are curated from INEGI's
  results presentation and each is checked against the stored text. Omitted as ambiguous in the text extraction: term
  deposits vs. life-insurance columns, the mortgage split between main home and other property, perception by sex.
- Companies: 18 names in five groups, each read from the official channel it files with. Banks were left out because
  none posts results through a scriptable official channel (see the runbook); Gentera, Nu, Mercado Libre and FirstCash
  carry the credit read-through, and the system-wide bank data comes from Banxico.
- Figures a company gives for Mexico only, or for the narrowest segment that contains Mexico, named in `segment`.
- K-shaped section: official series only (ENIGH by decile, wages, ENOE). It carries no third-party estimates (the
  American page's Moody's / Federal Reserve block has no counterpart here); none was searched for or added.

## Pitfalls already met

- INEGI's file servers answer the same file with `Last-Modified` times a few seconds apart, so a stamp built on the
  full header read as "new file" on every run (the ENIGH was downloaded and rewritten each time). A file is now
  identified by the day of that header plus its size (`mark()` in `fetch.mjs`).
- Two queued runs once worked from the commit that queued them, both rewrote `raw/enigh.json`, and the push retry
  (`git pull --rebase … || true`) left conflict markers that the next commit step pushed. The workflow now checks out
  the branch head, and `commit.sh` never merges line by line: on a refused push it takes the branch as it stands and
  writes this run's files over it whole; it refuses to commit with a rebase in progress or conflict markers staged.
- Banxico's CF762 (total bank portfolio by product) changed coverage in February 2026: the card balance jumped 32% in a
  month with no jump in CF835. Balances and growth come from CF835; the past-due ratio from CF766 ÷ CF762.
- INEGI's yearly private-consumption series (BIE 724119) carries preliminary latest years that are not restated when
  the quarterly accounts are revised (2025: 25.76 vs. 24.84 billones). The consumption share of GDP uses the quarterly
  series (737411 ÷ 734407, four-quarter averages); the yearly one only cross-checks a benchmarked year.
- ENIGH `percep_tot` (financial and capital receipts) includes receipts in kind that the microdata does not itemize:
  the itemized lines are checked to be at most the total and the residual is shown as its own line.
- ENIGH `mantenim` already equals `refaccion` + `combus`; listing the three double-counts transport.
- Number matching in extracted PDF text: thousands separated by spaces sit beside other figures ("285.0 821.8"), so a
  separator is closed only when the group before it is not preceded by a digit or a point.
- BMV eventos relevantes: "periodo de silencio" and "fecha de reporte" notices mention the quarter and are not results;
  several issuers post an English duplicate of each release; most issuers post no release there at all and their
  quarterly report (XBRL package on the financial-information page, management-commentary text blocks) is the channel.
  Financial groups post neither.
- Maps: Mexico City, Tlaxcala, Morelos, Aguascalientes, Colima and Querétaro are too small for a label and get chips.
- A session cannot reach INEGI, Banxico, the BMV or the SEC, and cannot read a run's log: questions go to the runner
  through the probe file and come back as committed files.
- A workflow file that is not on `main` cannot be dispatched by hand: during the first build the workflow ran from a
  temporary push trigger on the feature branch (removed before the merge).

## Open items

- ENIGH 2026 is due in mid-2027 and the next ENIF in 2027: when their microdata appears the page updates by itself,
  and the published check figures of the new edition must be added to `data/enigh-published.json` /
  `data/enif-published.json` from INEGI's presentation (the daily task does it; `pending.mjs` lists it).
- The BMV calendar in the watchdog is unrelated to this page (no prices here).
- If a listed bank starts posting results in eventos relevantes or as an XBRL package, add it to `companies.json`.
