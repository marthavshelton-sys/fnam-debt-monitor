# Oracle model — assumptions

Everything on the page is either (a) a figure taken verbatim from a named public source, (b) a computation
from such figures, or (c) an explicit modelling assumption listed here. Nothing else.

## Data conventions

- Reporting currency USD; figures in USD millions as printed by Oracle; per-share in USD. No currency translation.
- Fiscal year ends 31 May. `FY2027Q1` = June–August 2026; the page labels it `1Q27` (`1T27` in Spanish).
- Capex is stored as a negative outflow; `tax_provision` is positive for a provision; free cash flow = operating
  cash flow + capex (Oracle's own definition in its releases).
- Oracle's Q2–Q4 releases print cash-flow statements cumulatively (6/9/12 months). Discrete quarters are
  derived by subtracting the prior release's cumulative figure; every derivation is noted in the record and the
  four quarters are checked against the full-year total (they tie exactly for FY2025 and FY2026).
- RPO is disclosed as a rounded headline ("$664 billion"); it is stored at that precision (664000).
- **Revenue-line basis change.** From 1Q26 Oracle presents revenue as Cloud / Software / Hardware / Services.
  Earlier quarters were presented as "Cloud services and license support" / "Cloud license and on-premise
  license" / Hardware / Services and are stored on that original basis (`revenue_basis: "legacy_lines"`).
  Totals are identical; only the cloud/software split differs. FY2025 quarters and the FY2025 year also carry
  Oracle's own recast onto the new lines (from the FY2026 releases' prior-year columns), so 1Q26-vs-1Q25 and
  FY2026-vs-FY2025 compare like with like; where no recast exists (FY2024 and earlier) the page blanks the
  Cloud/Software variance and says so, while Hardware, Services and the total still compare.
- The FY2026 annual net income (16,984) is net income available to common shareholders, after US$ 103 M of
  preferred dividends on the mandatory convertible preferred stock issued in February 2026. Preferred
  dividends appear as a line from 3Q26.
- 2Q26 non-operating income includes an ≈US$ 2.7 bn pre-tax gain on the sale of Oracle's Ampere stake;
  Oracle's Non-GAAP figures do **not** exclude it (only SBC, intangibles amortization, restructuring and
  acquisition costs are excluded). 4Q26 Non-GAAP EPS of US$ 2.11 includes one-time investment gains; Oracle
  states US$ 2.03 excluding them.
- Quarterly revenues for FY2026 sum to 67,358 vs. the printed annual 67,357: a US$ 1 M rounding artifact in
  Oracle's own disclosure, tolerated by the tie-out (±US$ 1 M per quarter).
- EBITDA = GAAP operating income + depreciation + amortization of intangibles as printed in the cash-flow
  statement (no IFRIC-12-style adjustment applies; the accounting toggle is Oracle's own Non-GAAP).

## Market data

- Daily prices: Nasdaq historical API → Yahoo Finance chart API → Stooq, first that responds. S&P 500 from
  FRED (`SP500`), 10-year Treasury from the U.S. Treasury daily par yield curve (primary since 2026-10-05, merged into the stored
  history) with FRED `DGS10` (the same series, republished) as fallback; `market_reference.json → treasury_10y.source_name` records
  which one answered and the page prints it beside the value.
- Market cap = latest close × shares outstanding from the latest 10-Q cover page (3,023.736 M at 2026-09-07).
- Net debt = notes payable and other borrowings (current + non-current) − cash & equivalents − marketable
  securities. Preferred stock is **not** treated as debt (it is mandatory convertible).
- Enterprise value = market cap + net debt. LTM = sum of the four most recent quarters.

## Fiscal years FY2017–FY2021 (backfilled from the 10-Ks)

- FY2017–FY2019 come from the FY2019 Form 10-K and FY2020–FY2021 from the FY2021 Form 10-K (three-year
  consolidated statements). They carry GAAP lines only (revenue by type on the pre-FY2026 captions, operating
  expenses, operating income, interest, non-operating income, tax, net income, diluted EPS and share count),
  cash flow from operations, capital expenditures and D&A. A 10-K contains no Non-GAAP figures, so those rows
  are blank before FY2022. FY2022's revenue lines come from the FY2024 10-K (only three FY2022 quarters are loaded).
- The FY2023 quarter sums exceed the 10-K annual revenue lines by US$ 1 M (cloud services and total): rounding
  in Oracle's own quarterly releases, tolerated like the FY2026 artefact.

## Buildout data (Power and Data-Center Sites; AI buildout narrative)

- Megawatts delivered, GPU utilization, renewals and GPU deliveries are the figures management stated on the
  calls (page and speaker cited). Figures marked *derived* are computed from ratios management gave (4Q26 MW
  = 1Q27's 850 MW ÷ "almost three"; Abilene 4Q26 GPUs = 131,000 ÷ 1.9). 1Q26 deliveries were not disclosed.
- "Capacity pending" is not an Oracle figure: it is the "more than 10 GW secured through partners over the
  next three years" (3Q26 call) less the megawatts delivered since that call. It is labelled derived on the page.
- Sites: capacity, customer and financing come from Oracle where disclosed; otherwise from the developer's own
  release (Crusoe, Vantage/DigitalBridge, Related) or a wire report (DCD, CNBC, Construction Dive), each linked
  in the row. "Not disclosed" means Oracle has not said. Press figures for third-party financing are reported,
  not verified.
- The section-09 flow graphic shows the latest quarter's figures from the model's data files (RPO, capex,
  operating cash flow, cloud and total revenue, guidance) and the buildout file (MW, secured capacity,
  funding items); nothing in it is typed into the page.

## Maturity buckets (Financing and Balance Sheet; Off-Balance-Sheet Financing and Leases)

- Principal is grouped by calendar year of maturity: 2026 (the July-2026 note, greyed until the 10-Q confirms
  repayment), 2027 to 2031 one by one, 2032–2036, and after 2036. Commercial paper has no fixed maturity and
  sits outside the buckets. Average coupons are principal-weighted over the fixed-rate notes; the second headline
  rate also includes the term loan and commercial paper at their effective rates; floating-rate notes are excluded.

## Debt detail and credit risk (Financing and Balance Sheet)

- Instruments are the 58 lines of the FY2026 10-K debt footnote (senior notes, floating-rate notes, term loan,
  commercial paper); principal reconciles to the disclosed gross total (US$ 130,105 M; US$ 129,541 M net of
  unamortized discount is the balance-sheet figure). Issuances after 31 May 2026 are added from each 8-K.
- The maturity schedule buckets principal by **fiscal year** of maturity (June–May): a July-2026 note is FY2027.
  Commercial paper has no fixed maturity and is shown as a separate line, outside the schedule.
- Notes past their maturity date are greyed until the next 10-Q confirms repayment; they still count in the
  book total until then (so the total stays reconciled to the last filing).
- Average coupon = principal-weighted coupon of the fixed-rate senior notes only (FRNs, the term loan and
  commercial paper excluded).
- CDS: 5-year senior unsecured mid spread in basis points, from the FactSet connector once authorised
  (`tools/oracle/data/cds.json`). Implied cumulative default probability uses the market convention
  PD = 1 − exp(−spread ÷ (1 − recovery) × tenor) with a 40% recovery assumption. It is a market price of
  protection, not a rating; the page says so and points to the agency ratings in the Financing and Balance Sheet section.

## DCF defaults (all editable on the page; the URL encodes any change; method in METHODOLOGY.md §8)

| Input | Default | Basis |
|---|---|---|
| Projection basis | FactSet consensus | Fiscal-year means (sales, EBITDA, D&A, capex) for the years FactSet covers; "Management targets" uses the FY revenue guide and the in-force FY2030 revenue target |
| Explicit years | 10, starting with the current fiscal year as a stub | Stub = full-year projection less the quarters already reported (their cash is in net debt) |
| Revenue growth | Consensus, then halving each year to the terminal rate | Base = last reported fiscal year |
| EBITDA margin | Consensus adjusted EBITDA / sales, held after the last consensus year | Brokers' basis (excludes SBC) |
| Stock-based compensation | LTM SBC / LTM revenue (6.7% at 1Q27) | Non-GAAP reconciliation; deducted from adjusted EBITDA; 0 on the GAAP basis |
| D&A % of revenue | Consensus D&A (`DEP_AMORT_EXP`) / sales, then held | FactSet; latest-quarter run-rate if missing |
| Gross capex | Consensus; then capex/revenue converges linearly to k × D&A by the last explicit year | FactSet capex is gross (FY2027 mean ≈ the US$90–95 bn guide) |
| Customer-funded share of capex | 1 − net cash cap ÷ gross midpoint of the FY capex guide (24.3% for FY2027), held through the consensus years, fading to 0 | Guidance text parsed automatically |
| Prepayment unwind | 6 years | Oracle's illustrative six-year 1 GW deal (analyst meeting, 16-Oct-2025, p.10) |
| Terminal capex / D&A (k) | 1 + g × L / 2 = 1.09 | L = 6-year server life (10-Q note 3); g = terminal growth |
| Tax rate | Ramp from the LTM effective rate (provision ÷ pretax income, four quarters) to the normalized rate by the last explicit year; modes: hold LTM, ramp (default), normalized from year 1 | `tax.json`: normalized = 21.0% federal statutory + 0.9 pp state net of federal benefit (FY2026 10-K rate reconciliation, cross-checked against XBRL) = 21.9% |
| Uncommenced leases | Operating (default: rent assumed inside the consensus margin, nothing deducted) or finance (the illustrative PV of the US$288 bn is deducted in the bridge) | 1Q27 10-Q leases note (second reading 2026-10-04); PV method as in the off-balance-sheet section |
| Risk-free rate | 10-year Treasury par yield, latest daily value; source and date printed beside it | U.S. Treasury daily par yield curve (FRED DGS10 as fallback) |
| Equity risk premium | Damodaran implied ERP, latest month (4.14% on 1-Sep-2026) | fetched monthly by fetch-market.mjs; 4.5% only if no reading exists |
| Beta | Two years of weekly returns, ORCL on the S&P 500 (raw) | cross-checks shown: five-year monthly, Blume-adjusted (0.67 β + 0.33) of both |
| Cost of debt | Today's 10-year Treasury + the issue spread of the latest ~10-year fixed note (5.70% Feb-2036 note: 1.41 pp); applied to net debt and finance leases | 10-K debt footnote + the 10-year series on the issue date |
| Cost of the preferred | 6.50% dividend rate, no tax shield | 424B5 prospectus (Feb 2026) |
| Weights | (net debt + finance-lease liabilities + preferred) / (that + market cap): the same claims the bridge deducts | computed; owner's rule 2026-10-04 |
| Scenarios | Base = consensus unadjusted; Bull = FY2030 revenue target on consensus economics; Bear = RPO conversion slips one year + Project Jupiter two quarters late (18% of named nameplate × ½ year) + OpenAI volume −25% on S&P's "about half of RPO" (12.5% of incremental revenue) | METHODOLOGY.md §8 |
| Acceptance | "What has to be true": implied WACC/beta, and at the model's WACC, 9% and 8% the uniform margin shift, growth multiplier and terminal g that return the price | computed; replaces the bracketing test (2026-10-04) |
| Terminal | Gordon growth 3.0% (or exit multiple 12× EBITDA) | Assumption |
| Discounting | Mid-period, to the latest close; TV at mid-year after the horizon | Convention |
| Equity bridge | EV − net debt − finance-lease liabilities − mandatory convertible preferred (liquidation preference) [− PV of uncommenced leases under the finance treatment] | 10-Q (XBRL) |
| Shares | 10-Q cover shares + dilutive securities (diluted − basic weighted average, latest quarter) | SEC XBRL (dei, us-gaap) |
| Concession annuity method | Not offered | Oracle has no concession or licence end-date |

## Sources and uses, counterparties, RPO bridge (2026-10-04)

- Sources and uses: consensus rows are FactSet fiscal-year means (free cash flow, capex; operating cash flow = FCF + capex,
  derived); customer prepayments = the DCF's customer-funded share × gross capex (estimate, memo); dividends = latest
  declared DPS × 4 × 10-Q cover shares + the preferred's quarterly dividend × 4 (FNAM calculation); maturities = principal
  of the 10-K debt-footnote instruments maturing in each fiscal year (reported); the company's FY2027 plan (US$40 bn ≈
  US$19.9 bn ATM done + US$20.1 bn to raise) is a company statement. Interest is not a separate use (inside consensus OCF).
- Counterparties: names from the FWP of 1-Feb-2026 (SEC); OpenAI ≈ half of RPO is S&P's estimate (9-Jul-2026); contract
  sizes are press (WSJ, Reuters/CNBC) and never enter a figure; the counterparty-capacity note (OpenAI annualised revenue
  and funding rounds, press) is an FNAM estimate and says so.
- RPO-to-revenue bridge: even monthly recognition inside each 10-Q bucket (Oracle gives no monthly profile); fiscal years
  June–May; consensus revenue from FactSet. Coverage = (already reported + contracted conversion) ÷ consensus.
- Hyperscaler comparison: the hub's definitions (TTM = four consecutive XBRL quarters; capex = cash purchases of PP&E;
  lease-adjusted net debt = debt − cash + recognised operating and finance lease liabilities; EBITDA = operating income +
  D&A); Oracle's leverage in that table is on EBITDA, not EBITDAR, to match the hub.

## Guidance

- Oracle printed a quantified guidance table in its press release only from 3Q26. Earlier vintages come from
  the CFO's prepared remarks in the owner-supplied earnings-call transcripts and are marked
  `fields_from_transcript` with the page number; spoken full-year figures ("$67 billion") are stored in millions.
- "Tracking" compares the USD ranges against reported USD results; constant-currency ranges are kept
  separately. Non-GAAP EPS actuals may include one-time gains Oracle itself footnotes (4Q26).
- Capex guidance is usually spoken as prose and is kept verbatim as a note (`fy_capex_note`), numeric only
  when Oracle gave a number.

## Comments column and executive summary

- Drafted from the results release and the earnings-call transcript; each entry cites its source (release page,
  or call page and speaker). Comments are driver-only: one clause naming the cause of the change the table already
  quantifies, and "no driver given" where management offered none. Percentages quoted are Oracle's. The column
  fills when a quarter is compared with the same quarter a year earlier (13 quarters, 1Q24–1Q27) or a fiscal
  year with the prior one (FY2024–FY2026, written from the 4Q call); YTD and LTM modes carry no comments.

## Peers

- Microsoft, SAP, Salesforce, ServiceNow, IBM, Workday. Multiples to be filled by the FactSet connector
  (`tools/oracle/data/peers.json`); until then the table shows the schema and "pending". Oracle's own row is
  computed live from the latest close, the 10-Q share count and LTM figures.

## Consensus and forward multiples (FactSet, since 2026-09-27)

- Valuation multiples are forward: price or EV over FactSet's NTM consensus (mean). LTM multiples appear only as a labelled reference. Leverage (net debt / EBITDA) stays on reported LTM figures.
- Consensus EPS follows the brokers' majority basis, which for Oracle is non-GAAP; consensus EBITDA is broker-adjusted (not the model's GAAP operating income + D&A). Both are labelled wherever shown.
- Oracle's own multiples use the model's price, shares and reported net debt (notes payable − cash and marketable securities). The peer table uses FactSet's basis for every row, including Oracle: FactSet price and market value, and FactSet net debt (FF_NET_DEBT), which includes lease liabilities. The two Oracle EV figures therefore differ by the lease liabilities; the captions say so.
- FactSet labels Oracle's fiscal year by the calendar year in which it starts (FactSet 2026 = Oracle FY2027, ending 2027-05-31). `factset.json` stores Oracle's label and the fiscal end date; `validate-data.mjs` checks the mapping.
- Historical forward multiples: point-in-time NTM consensus sampled at each Oracle fiscal quarter-end (FactSet consensus_rolling, NTMA, quarterly from 2021-08-31), against the quarter-end close, diluted shares and reported net debt.
- DCF "consensus" basis (since 2026-10-03): revenue, adjusted EBITDA less stock-based compensation, D&A and gross capex from the FactSet fiscal-year means; see the DCF table above and METHODOLOGY.md §8. The implied exit multiple is quoted on NTM consensus EBITDA.
- Price target and ratings are FactSet's sell-side consensus, shown as information with a not-a-recommendation note.
