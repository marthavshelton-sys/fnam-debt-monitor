// Freshness allowances for every data point on the U.S. fiscal monitor, read by the page (amber flags in the
// reader's browser, through site/assets/provenance.js) and by scripts/fiscal/check-freshness.mjs (run summary and
// the fiscal-health issue). One table, two readers, so the page and the alarm can never disagree.
// `period` says what the stamped date is: 'obs' = the observation day itself, 'month' / 'quarter' / 'year' = the
// FIRST day of the period (FRED's stamp). `bd` = U.S. business days after the observation (federal holidays
// excluded); `days` = calendar days after the END of the period. Past the allowance, a newer figure exists that
// the fetch has failed to pick up. `file: 'monthly'` = the point lives in monthly-data.js, not data.js.
window.FISCAL_FRESHNESS = {
 "points": [
  {
   "id": "debt",
   "label": "Debt to the Penny (total, public, intragovernmental)",
   "path": "debt.date",
   "period": "obs",
   "bd": 2,
   "source": "Treasury Fiscal Data, daily, business days; amber after 2 business days without a new close (owner's rule, 2026-10-01)"
  },
  {
   "id": "targetRange",
   "label": "FOMC target range (DFEDTARU/DFEDTARL)",
   "path": "targetRange.date",
   "period": "obs",
   "bd": 2,
   "source": "Federal Reserve Board via FRED, daily; amber after 2 business days without a new value (owner's rule, 2026-10-01)"
  },
  {
   "id": "effr",
   "label": "Effective federal funds rate (EFFR)",
   "path": "rates.effr.date",
   "period": "obs",
   "bd": 2,
   "source": "New York Fed via FRED, daily; amber after 2 business days without a new value (owner's rule, 2026-10-01)"
  },
  {
   "id": "iorb",
   "label": "Interest on reserve balances (IORB)",
   "path": "rates.iorb.date",
   "period": "obs",
   "bd": 2,
   "source": "Federal Reserve Board via FRED, daily; amber after 2 business days without a new value (owner's rule, 2026-10-01)"
  },
  {
   "id": "onrrp",
   "label": "ON RRP award rate",
   "path": "rates.onrrp.date",
   "period": "obs",
   "bd": 2,
   "source": "New York Fed via FRED, daily; amber after 2 business days without a new value (owner's rule, 2026-10-01)"
  },
  {
   "id": "discount",
   "label": "Discount rate (primary credit)",
   "path": "rates.discount.date",
   "period": "obs",
   "bd": 2,
   "source": "Federal Reserve Board via FRED, daily; amber after 2 business days without a new value (owner's rule, 2026-10-01)"
  },
  {
   "id": "rrpVolume",
   "label": "ON RRP take-up",
   "path": "rrpVolume.date",
   "period": "obs",
   "days": 6,
   "source": "New York Fed via FRED, daily"
  },
  {
   "id": "tenYear",
   "label": "10-year Treasury yield",
   "path": "macroActuals.tenYear.date",
   "period": "obs",
   "days": 7,
   "source": "Treasury via FRED, daily"
  },
  {
   "id": "walcl",
   "label": "Fed total assets (WALCL)",
   "path": "fed.walcl.date",
   "period": "obs",
   "days": 12,
   "source": "H.4.1 via FRED, weekly (Wednesday)"
  },
  {
   "id": "fedBalanceSheet",
   "label": "Fed balance-sheet lines (H.4.1)",
   "path": "fedBalanceSheet.date",
   "period": "obs",
   "days": 12,
   "source": "H.4.1 via FRED, weekly (Wednesday)"
  },
  {
   "id": "avgRate",
   "label": "Average interest rates on the debt",
   "path": "avgRate.date",
   "period": "obs",
   "days": 45,
   "source": "Treasury Fiscal Data, monthly, about a week after month-end"
  },
  {
   "id": "debtComposition",
   "label": "Debt composition (MSPD table 1)",
   "path": "debtComposition.date",
   "period": "obs",
   "days": 45,
   "source": "Treasury MSPD, monthly, about a week after month-end"
  },
  {
   "id": "avgMaturity",
   "label": "Average maturity and schedule (MSPD table 3)",
   "path": "avgMaturity.date",
   "period": "obs",
   "days": 45,
   "source": "Treasury MSPD, monthly, about a week after month-end"
  },
  {
   "id": "mts",
   "label": "Monthly Treasury Statement (receipts, outlays, interest)",
   "path": "mts.date",
   "period": "obs",
   "days": 55,
   "source": "Treasury MTS, monthly, 8th business day of the next month (later for September)"
  },
  {
   "id": "accruedInterest",
   "label": "Accrued interest expense",
   "path": "accruedInterest.date",
   "period": "obs",
   "days": 55,
   "source": "Treasury Fiscal Data, monthly, with the MTS"
  },
  {
   "id": "m2",
   "label": "M2 money stock",
   "path": "fed.m2.date",
   "period": "month",
   "days": 65,
   "source": "Federal Reserve H.6 via FRED, monthly, fourth week of the next month"
  },
  {
   "id": "cpi",
   "label": "CPI inflation (y/y)",
   "path": "macroActuals.cpiYoY.date",
   "period": "month",
   "days": 55,
   "source": "BLS via FRED, monthly, around the 12th of the next month"
  },
  {
   "id": "unemployment",
   "label": "Unemployment rate",
   "path": "macroActuals.unemployment.date",
   "period": "month",
   "days": 45,
   "source": "BLS via FRED, monthly, first Friday of the next month"
  },
  {
   "id": "foreignHolders",
   "label": "Major foreign holders (TIC table 5)",
   "path": "foreignHolders.date",
   "period": "month",
   "days": 80,
   "source": "Treasury TIC, monthly, about seven weeks after month-end"
  },
  {
   "id": "gdp",
   "label": "Nominal GDP (BEA)",
   "path": "gdp.date",
   "period": "quarter",
   "days": 135,
   "source": "BEA via FRED, quarterly, four weeks after quarter-end"
  },
  {
   "id": "realGdp",
   "label": "Real GDP growth (BEA)",
   "path": "macroActuals.realGdpGrowth.date",
   "period": "quarter",
   "days": 135,
   "source": "BEA via FRED, quarterly, four weeks after quarter-end"
  },
  {
   "id": "holders",
   "label": "Ownership of Treasury securities (OFS-2)",
   "path": "holders.asOf",
   "period": "obs",
   "days": 290,
   "source": "Treasury Bulletin, quarterly, fully reported about two quarters after quarter-end"
  },
  {
   "id": "debtGdpAnnual",
   "label": "Gross federal debt, % of GDP (annual)",
   "path": "debtGdpAnnual.date",
   "period": "year",
   "days": 470,
   "source": "FRED GFDGDPA188S, annual, the next year posts in the first quarter"
  },
  {
   "id": "debtGdpQuarterly",
   "label": "Total public debt, % of GDP (quarterly)",
   "path": "debtGdpQuarterly.date",
   "period": "quarter",
   "days": 200,
   "source": "FRED GFDEGDQ188S, quarterly, once Treasury's quarter-end debt and BEA GDP are out (about three months after quarter-end)"
  },
  {
   "id": "fedWatch",
   "label": "CME FedWatch snapshot",
   "path": "fedWatch.asOf",
   "period": "obs",
   "days": 14,
   "source": "monthly-data.js (research routine), refreshed Mondays, Wednesdays and Fridays",
   "file": "monthly"
  },
  {
   "id": "cbo",
   "label": "CBO baseline (publication date)",
   "path": "cboPublished",
   "period": "obs",
   "days": 420,
   "source": "monthly-data.js (research routine); CBO publishes a new baseline each January or February",
   "file": "monthly"
  }
 ]
};
