# Mexico macro dashboard — memory (decisions, pitfalls, open items)

Read with `README.md`. Newest first.

## 2026-10-08 — Comercio exterior and Inversión extranjera y PII views

- Banxico SIE API titles are the table path plus the row path ("Balanza comercial de mercancías de México
  Exportaciones totales Petroleras"), with non-breaking spaces (U+00A0) inside some labels ("Cuenta
  corriente (I - II)", "Pasivos netos incurridos"). Manifest regexes for these series use `\s+` between
  words. The CE197 series (trade with the United States) come back with an EMPTY title: `allowEmptyTitle`
  in the manifest, verified by two identities instead.
- The SIE has no search endpoint. `node scripts/mx-macro/fetch.mjs --cuadro CE125,CE170` (workflow input
  `cuadro`) lists a public table page's series with labels; the sector directory is
  `consultarDirectorioInternetAction.do?accion=consultarDirectorioCuadros&sector=1&locale=es`. Pages are
  ISO-8859-1 and answer 429 to bursts (the diagnostic paces requests 2.5 s apart).
- INEGI's quarterly GDP at current prices (BIE 734407, like the real series 736181) is an ANNUALIZED
  level (≈ 37.5 tn pesos per quarter in 2026): the year's GDP is the mean of four quarters, not their
  sum. `gdpUsd4()` converts each quarter at its average FIX and averages them.
- The sandbox's egress reached banxico.org.mx, inegi.org.mx and FRED on 2026-10-08 (tokens are not
  available in a session, so the SIE API itself cannot be read locally; INEGI's search and export work
  with the public token; FRED's CSV export works). Earlier notes saying these hosts are blocked may be
  stale; probe before assuming.
- Identity checks live in `fetch.mjs` (`IDENTITIES`, `checkIdentities()`); all passed on the first
  runner fetch (BoP accounting identity fa = ca + ka + eo holds exactly with Banxico's signs).
- The external view now carries remittances and the peso only; the trade alert links to `?view=trade`
  (and its balance is scaled by the series' unit — before, INEGI's millions were divided by 1e9).
- Open: FDI by country of origin (Secretaría de Economía) has no API; CE197 lags the total by one
  month; Banxico's CE187 indices have no base year in their metadata ("Sin Unidad"), so the page shows
  levels without a base label.
