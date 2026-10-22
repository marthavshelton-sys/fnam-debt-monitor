# Results change log

One dated entry per dashboard update after a quarterly release: company, quarter, what changed (old → new) and the sources.

## 2026-10-22 — 3Q26 catch-up (GAP, Gentera, Quálitas); OMA and ASUR dates confirmed

**GAP — 3Q26** (release of 19-Oct-2026; BMV evento relevante 1596277; English report
https://www.aeropuertosgap.com.mx/files/PR_3Q26_ENG_19Oct26_VF_DEF.pdf)
- Latest quarter 2Q26 → 3Q26 in `financials.js` (37 quarters; validator 0 failures). The wire (GlobeNewswire) has answered 403 to
  the runner since October, so the harvester now reads GAP's investor site (PDF → text with pdfplumber).
- Revenue ex-IFRIC 12 Ps. 7,905.5 M → 8,947.1 M (+13.2%); EBITDA 5,085.6 → 6,064.6 M (+19.2%); EBITDA margin ex-IFRIC 12 64.3% →
  67.8%; net income 2,696.0 → 2,914.1 M; comprehensive income 2,457.8 → 3,265.1 M; CBX revenue Ps. 775.5 M (1,034,274 users).
- Net debt (balance sheet): Ps. 45,894 M (30-Jun) → 43,776 M (30-Sep); LTM EBITDA 22.2 → 23.1 bn; leverage 2.1x → 1.9x. Dividends
  payable Ps. 12,513 M unpaid. Capex 9M26 Ps. 8,623 M.
- Summary, comments (2026Q3, 2026M9, LTM2026Q3), reference (filings.results 2026Q3; calendar projected 4Q26 ≈ 24-Feb-2027 per FactSet;
  debt events of the quarter; FIBRA check 22-Oct) rewritten. Next results: "3T26 ≈21 oct, sin anunciar" → "4T26 ≈ fecha supuesta".

**Gentera — 3T26** (release of 21-Oct-2026, https://www.gentera.com.mx/wcm/connect/345663ab-8de4-4abe-aafc-82acd7bff9a7/Gentera+3T26.pdf;
English filing BMV evento relevante 1596866)
- Latest quarter 2T26 → 3T26. The 22-Oct run had rejected the quarter ("stage 1 & 2 + stage 3 = gross loans"): the parser left the
  stage digit among the numbers; fixed. The consolidated indicators table is an image in the Spanish PDF; read from the English
  filing (recorded as `sources.ind`).
- Gross loans Ps. 94,682 M → 95,220 M; stage 3 4.04% → 4.57%; net income Ps. 2,353 M → 2,342 M (+8.6% y/y); controlling ROE
  24.5% → 23.8%; book value per share Ps. 23.27 → 24.82; equity Ps. 37,008 M → 39,539 M; coverage 219.5% → 206.4%.
- Summary, comments (2026Q3), reference (next results "≈23 oct" → 4T26 ≈ 25-Feb-2027 assumed; shares as of 30-Sep-2026) rewritten;
  valuation inputs (loans 94,682 → 95,220, book value) follow `financials.js`.

**Quálitas — 3T26** (report of 20-Oct-2026,
https://qinversionistas.qualitas.com.mx/storage/informes/2026/trimestral/3T/mx/Q-Reporte_Trimestral_3T26.pdf)
- Data had landed on 21-Oct; the curated files had not: summary basis 2T26 → 3T26 (net income Ps. 1,389 M → 1,770 M; written
  premiums 17,329 → 18,663 M; combined ratio 95.7% → 92.7%; solvency 341% → 357%; treasury shares ≈6.2 M → ≈7.7 M, buyback fund
  Ps. 784 M → 551 M; Colombia 20 → 21 offices), comments (2026Q3, 2026M9), review stamp; next results "3T26 ≈21 oct" → 4T26 ≈ 28-Jan-2027.
  The 21-Oct call transcript is pending.

**OMA** — 3T26 results confirmed for 27-Oct-2026 after market, call 29-Oct 11:00 ET (OMA events calendar, invitation of 8-Oct;
FactSet confirmed release). **ASUR** — 3Q26 results confirmed for 22-Oct-2026 after the U.S. close, call 23-Oct 10:00 ET (ASUR's
call notice). Both in `reference.js → calendar`.

**Pipeline** — `results-watch.yml` + `scripts/lib/results-watch.mjs` (every three hours on weekdays): dispatches the refreshes from
each results date, re-reads for three days, alerts Maintenance (`fnam-maintenance`) 48 hours after a missed date.
