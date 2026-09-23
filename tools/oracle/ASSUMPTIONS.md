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
  FRED (`SP500`), 10-year Treasury from FRED (`DGS10`) with the U.S. Treasury daily par yield curve as fallback.
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

## Buildout data (sections 03 and 09)

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

## Maturity buckets (sections 07 and 11)

- Principal is grouped by calendar year of maturity: 2026 (the July-2026 note, greyed until the 10-Q confirms
  repayment), 2027 to 2031 one by one, 2032–2036, and after 2036. Commercial paper has no fixed maturity and
  sits outside the buckets. Average coupons are principal-weighted over the fixed-rate notes; the second headline
  rate also includes the term loan and commercial paper at their effective rates; floating-rate notes are excluded.

## Debt detail and credit risk (section 11)

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
  protection, not a rating; the page says so and points to the agency ratings in section 07.

## DCF defaults (all editable on the page; the URL encodes any change)

| Input | Default | Basis |
|---|---|---|
| Base revenue | LTM revenue | quarters.json |
| Revenue growth, years 1–5 | 30 / 25 / 20 / 15 / 10 % | Assumption: year 1 consistent with FY2027 guidance of "at least US$ 90 bn" (+34% on FY2026), tapering as the AI buildout matures. Not a forecast. |
| EBIT margin | LTM GAAP operating margin | computed |
| Capex, years 1–5 | US$ 70 / 60 / 50 / 40 / 35 bn | Year 1 = FY2027 guidance of "around US$ 70 bn" net cash capex (reported capex of US$ 90–95 bn includes customer prepayments, 1Q27 call); the taper is a judgement, not guidance |
| D&A % of revenue | LTM D&A / LTM revenue | computed from the cash-flow statements |
| Tax rate | LTM GAAP effective rate | computed |
| Working capital | 0% of Δrevenue | Assumption; Oracle's deferred-revenue model makes working capital a source of cash in growth years |
| Risk-free rate | 10-year Treasury, live | FRED / Treasury |
| Equity risk premium | 4.5% | Assumption (in the range of published mature-market ERP estimates) |
| Beta | Regression of two years of weekly ORCL returns on the S&P 500 | computed from the price CSVs |
| Cost of debt | Coupon of Oracle's most recent ~10-year fixed-rate note (5.70% due Feb 2036) | 10-K debt footnote |
| Target leverage | Current net debt / (net debt + market cap) | computed |
| Terminal | Gordon growth 3.0% (or exit multiple 12× EBITDA) | Assumption |
| Discounting | End-of-year, 5 explicit years | Convention |
| Shares | Diluted shares of the latest quarter | quarters.json |
| Concession annuity method | Not offered | Oracle has no concession or licence end-date |

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
