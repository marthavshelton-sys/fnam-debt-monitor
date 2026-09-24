// Pulls the fast-moving series (debt totals, policy rates, Fed balance sheet, M2) from
// Treasury Fiscal Data (no key required) and FRED's public CSV export (no key required)
// and writes site/data.js as `window.LIVE_DATA = {...}`.
//
// Everything Treasury or FRED publishes in machine-readable form is fetched here, including
// the monthly series (MTS revenue/outlays and cash interest, accrual interest expense, the
// Treasury Bulletin ownership table, the MSPD-derived average maturity) — daily re-checks of
// a monthly source are harmless no-ops until Treasury republishes. Only two things are left
// to the monthly research routine that maintains site/fiscal/monthly-data.js: the CBO
// projection tables (CBO publishes no API and blocks automated fetches) and the CME FedWatch
// snapshot (no free feed). Both are date-stamped on the page.
//
// Runs on GitHub Actions' ubuntu-latest runner, which ships Node 20+ with a global `fetch`.
// No npm install / package.json needed.

const OUT_PATH = new URL('../site/fiscal/data.js', import.meta.url);

// Every upstream call gets a hard timeout. Without one, a single slow or hung source
// (Treasury's MSPD endpoint stalled for well over a minute on 2026-09-18) holds up
// Promise.allSettled and with it the whole daily run -- the job would sit against GitHub's
// 6-hour default limit instead of degrading that one series to null (the page keeps its
// last good value for it) and publishing everything else on time.
const FETCH_TIMEOUT_MS = 45_000;
async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'User-Agent': 'fnam-debt-monitor-bot/1.0' }, signal: ctrl.signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error(`${url} -> timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function fetchCSV(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  return text.trim().split('\n').map((line) => line.split(','));
}

// Last non-empty, non-"." (missing) value in a two-column FRED CSV [DATE, VALUE].
function latestFredPoint(rows) {
  for (let i = rows.length - 1; i >= 1; i--) {
    const [date, val] = rows[i];
    if (val && val.trim() !== '.' && !Number.isNaN(Number(val))) {
      return { date, value: Number(val) };
    }
  }
  return null;
}

async function getDebtToThePenny() {
  const url = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny' +
    '?sort=-record_date&page[size]=1';
  const j = await fetchJSON(url);
  const r = j.data[0];
  return {
    date: r.record_date,
    totalDebtT: Number(r.tot_pub_debt_out_amt) / 1e12,
    heldByPublicT: Number(r.debt_held_public_amt) / 1e12,
    intragovT: Number(r.intragov_hold_amt) / 1e12,
  };
}

async function getAvgInterestRate() {
  const url = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates' +
    '?filter=security_desc:eq:' + encodeURIComponent('Total Marketable') + '&sort=-record_date&page[size]=1';
  const j = await fetchJSON(url);
  const r = j.data[0];
  return { date: r.record_date, avgRatePct: Number(r.avg_interest_rate_amt) };
}

// Debt outstanding by security class, from Treasury's Monthly Statement of the Public
// Debt (MSPD table 1) — a pre-aggregated summary table (no client-side summing needed).
// Updated once a month by Treasury; checking daily is harmless, it just repeats until
// Treasury publishes a new figure.
async function getDebtComposition() {
  const url = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/mspd/mspd_table_1' +
    '?sort=-record_date&page[size]=14';
  const j = await fetchJSON(url);
  const rows = j.data;
  const date = rows[0].record_date;
  // security_class_desc is "_" for the three summary rows (Total Marketable, Total
  // Nonmarketable, Total Public Debt Outstanding) — key those by security_type_desc instead.
  const byClass = {};
  rows.forEach((r) => {
    if (r.record_date !== date) return; // only the latest date's 14 rows
    const key = r.security_class_desc === '_' ? r.security_type_desc : r.security_class_desc;
    byClass[key] = Number(r.total_mil_amt) / 1000; // $M -> $B
  });
  return {
    date,
    notes: byClass['Notes'],
    bills: byClass['Bills'],
    bonds: byClass['Bonds'],
    tips: byClass['Treasury Inflation-Protected Securities'],
    frns: byClass['Floating Rate Notes'],
    nonmarketable: byClass['Total Nonmarketable']
  };
}

// Major Foreign Holders of Treasury Securities (TIC "SLT" Table 5) — a plain tab-delimited
// text file, published monthly (with a ~2-3 month reporting lag), pre-sorted by the latest
// month's holdings descending. Same "check daily, no-op until Treasury republishes" approach
// as getDebtComposition above — this only actually changes once a month.
async function getForeignHolders() {
  const url = 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.txt';
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const headerLine = lines.find((l) => l.startsWith('Country'));
  if (!headerLine) throw new Error('slt_table5.txt: could not find the "Country" header row');
  const headerCells = headerLine.split('\t').map((c) => c.trim()).filter(Boolean);
  const latestMonth = headerCells[1]; // e.g. "2026-06" — the most recent column, per Treasury's own layout

  const headerIdx = lines.indexOf(headerLine);
  const countries = [];
  let grandTotal = null;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i].split('\t').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) break; // blank line -> end of the data block
    const [name, latestValStr] = cells;
    const value = Number(latestValStr);
    if (Number.isNaN(value)) break;
    if (name === 'Grand Total') { grandTotal = value; break; } // stop before the "Of Which:" sub-rows
    if (name === 'All Other') continue; // not an individual country, exclude from the top-10 ranking
    countries.push({ country: name, valueB: value });
  }
  if (grandTotal == null) throw new Error('slt_table5.txt: could not find the "Grand Total" row');

  // Defensive re-sort (the file has always come pre-ranked, but don't depend on that holding forever).
  countries.sort((a, b) => b.valueB - a.valueB);
  return { date: latestMonth, top10: countries.slice(0, 10), grandTotalB: grandTotal };
}

// ---------------------------------------------------------------------------------------------
// Monthly Treasury Statement (MTS), Table 3 — "Summary of Receipts, Outlays, and the Deficit".
// This one table feeds the revenue-by-source and outlay-by-agency sections, the cash-basis
// interest KPI and the fiscal-year labels. Categories map to Treasury's own line items (checked
// to the dollar against the previously hand-entered Jul-2026 YTD and FY2025 figures when wired):
//   revenue  Individual Income Taxes | Social Insurance and Retirement Receipts (sum of children) |
//            Corporation Income Taxes | Customs Duties | Excise Taxes | Estate and Gift Taxes |
//            Miscellaneous Receipts
//   outlays  Social Security Administration | Department of Health and Human Services |
//            Department of Defense--Military Programs | Department of the Treasury (= "Interest
//            on Treasury Debt Securities (Gross)" + its "Other" child) | Department of Veterans
//            Affairs | all other agencies = Total Outlays minus those five
//   cash-basis interest = "Interest on Treasury Debt Securities (Gross)", fiscal year to date
// Published monthly for the prior month; the September record is the completed fiscal year,
// which is where the prior-FY column comes from.
const MTS3 = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_3';
const MTS3_FIELDS = 'record_date,classification_desc,current_fytd_rcpt_outly_amt,prior_fytd_rcpt_outly_amt,parent_id,classification_id,record_fiscal_year';

function mtsExtract(rows) {
  const num = (v) => (v == null || v === 'null') ? null : Number(v);
  const one = (desc) => {
    const m = rows.filter((r) => r.classification_desc === desc);
    if (m.length !== 1) throw new Error(`MTS table 3: expected one "${desc}" row, found ${m.length}`);
    return m[0];
  };
  const childrenOf = (desc) => { const p = one(desc); return rows.filter((r) => r.parent_id === p.classification_id); };
  const treasury = childrenOf('Department of the Treasury:');
  const gross = treasury.find((r) => r.classification_desc === 'Interest on Treasury Debt Securities (Gross)');
  const treasuryOther = treasury.find((r) => r.classification_desc === 'Other');
  if (!gross || !treasuryOther) throw new Error('MTS table 3: Treasury interest/other sub-lines not found');
  const payroll = childrenOf('Social Insurance and Retirement Receipts:');
  const r2 = (x) => Math.round(x * 100) / 100;
  const build = (field) => {
    const v = (r) => {
      const x = num(r[field]);
      if (x == null || Number.isNaN(x)) throw new Error(`MTS table 3: null ${field} for "${r.classification_desc}"`);
      return x / 1e9; // $ -> $B
    };
    const rev = [
      v(one('Individual Income Taxes')),
      payroll.reduce((s, r) => s + v(r), 0),
      v(one('Corporation Income Taxes')),
      v(one('Customs Duties')),
      v(one('Excise Taxes')),
      v(one('Estate and Gift Taxes')),
      v(one('Miscellaneous Receipts')),
    ];
    const five = [
      v(one('Social Security Administration')),
      v(one('Department of Health and Human Services')),
      v(one('Department of Defense--Military Programs')),
      v(gross) + v(treasuryOther),
      v(one('Department of Veterans Affairs')),
    ];
    const totalOutlays = v(one('Total Outlays'));
    return {
      rev: rev.map(r2),
      out: five.concat([totalOutlays - five.reduce((s, x) => s + x, 0)]).map(r2),
      totalReceiptsB: r2(v(one('Total Receipts'))),
      totalOutlaysB: r2(totalOutlays),
      cashInterestB: r2(v(gross)),
    };
  };
  return { cur: build('current_fytd_rcpt_outly_amt'), pri: build('prior_fytd_rcpt_outly_amt') };
}

async function getMtsSummary() {
  const latest = await fetchJSON(`${MTS3}?sort=-record_date&page[size]=1&fields=record_date,record_fiscal_year`);
  const date = latest.data[0].record_date;
  const fyCur = Number(latest.data[0].record_fiscal_year);
  const fyPrev = fyCur - 1;
  const ytd = mtsExtract((await fetchJSON(`${MTS3}?filter=record_date:eq:${date}&page[size]=200&fields=${MTS3_FIELDS}`)).data);
  const full = mtsExtract((await fetchJSON(`${MTS3}?filter=record_date:eq:${fyPrev}-09-30&page[size]=200&fields=${MTS3_FIELDS}`)).data);
  return {
    date, fyCur, fyPrev,
    revYTDcur: ytd.cur.rev, revYTDpri: ytd.pri.rev, outYTDcur: ytd.cur.out, outYTDpri: ytd.pri.out,
    revFYprev: full.cur.rev, outFYprev: full.cur.out,
    totalReceiptsB: ytd.cur.totalReceiptsB, totalOutlaysB: ytd.cur.totalOutlaysB, cashInterestB: ytd.cur.cashInterestB,
  };
}

// Interest Expense on the Debt Outstanding — Treasury's accrual-basis figure. The published FYTD
// total is every line item's fytd_expense_amt for the latest month summed (all expense groups,
// public issues and Government Account Series alike): that reproduces Treasury's own total to
// the dollar ($1,267.8B for Aug-2026, the figure that used to be hand-entered on the page).
const IE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/interest_expense';
async function getAccruedInterest() {
  const latest = await fetchJSON(`${IE}?sort=-record_date&page[size]=1&fields=record_date`);
  const date = latest.data[0].record_date;
  const j = await fetchJSON(`${IE}?filter=record_date:eq:${date}&page[size]=500&fields=fytd_expense_amt`);
  const total = j.data.reduce((s, r) => s + Number(r.fytd_expense_amt || 0), 0);
  if (j.data.length < 20 || !(total > 0)) throw new Error(`interest_expense: implausible result (${j.data.length} rows, total ${total})`);
  return { date, fytdT: Math.round(total / 1e9) / 1000, lineItems: j.data.length };
}

// Treasury Bulletin table OFS-2, "Estimated Ownership of U.S. Treasury Securities" — quarterly,
// ~2-quarter lag. The newest quarter appears with only the totals filled in, so the page uses the
// latest quarter in which every investor class is reported. OFS-2 lumps the Fed together with the
// government trust funds; Debt to the Penny's intragovernmental holdings at that quarter-end split
// them (Fed = combined - intragovernmental), which is exactly how the page's figures were built.
const OFS2 = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/tb/ofs2_estimated_ownership_treasury_securities';
const DTP = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny';
const OFS2_OWNERS = {
  total: 'Total Public Debt', fedAndGovt: 'Federal Reserve And Government Accounts',
  depository: 'Depository Institutions', savings: 'U.S. Savings Bonds', pensionPrivate: 'Pension Funds - Private',
  pensionStateLocal: 'Pension Funds - State And Local Governments', insurance: 'Insurance Companies',
  mutual: 'Mutual Funds', stateLocal: 'State And Local Governments', foreign: 'Foreign And International',
  other: 'Other Investors',
};
async function getHolders() {
  const j = await fetchJSON(`${OFS2}?sort=-end_of_month,-record_date&page[size]=600&fields=record_date,end_of_month,securities_owner,securities_bil_amt`);
  const byMonth = new Map();
  for (const r of j.data) {
    if (!byMonth.has(r.end_of_month)) byMonth.set(r.end_of_month, {});
    const m = byMonth.get(r.end_of_month);
    if (!(r.securities_owner in m)) m[r.securities_owner] = r.securities_bil_amt === 'null' ? null : Number(r.securities_bil_amt); // first seen = latest bulletin revision
  }
  const names = Object.values(OFS2_OWNERS);
  const months = [...byMonth.keys()].sort().reverse();
  const asOf = months.find((mo) => names.every((n) => byMonth.get(mo)[n] != null));
  if (!asOf) throw new Error('OFS-2: no fully reported quarter among the latest rows');
  const o = byMonth.get(asOf);
  const dtp = await fetchJSON(`${DTP}?filter=record_date:lte:${asOf}&sort=-record_date&page[size]=1&fields=record_date,intragov_hold_amt`);
  const intragovB = Number(dtp.data[0].intragov_hold_amt) / 1e9;
  const yearAgo = `${Number(asOf.slice(0, 4)) - 1}${asOf.slice(4)}`;
  const ya = byMonth.get(yearAgo);
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    asOf, intragovAsOfDate: dtp.data[0].record_date, totalPublicDebtB: o[OFS2_OWNERS.total],
    // Same labels and group codes the page has always used (g: 0 intragovernmental, 1 Fed, 2 private domestic, 9 foreign).
    holders: [
      { g: 9, label: 'Foreign & international', value: r1(o[OFS2_OWNERS.foreign]) },
      { g: 2, label: 'Other U.S. investors', value: r1(o[OFS2_OWNERS.other]) },
      { g: 0, label: 'Intragovernmental (trust funds)', value: r1(intragovB) },
      { g: 1, label: 'Federal Reserve (SOMA)', value: r1(o[OFS2_OWNERS.fedAndGovt] - intragovB) },
      { g: 2, label: 'Mutual funds', value: r1(o[OFS2_OWNERS.mutual]) },
      { g: 2, label: 'Depository institutions', value: r1(o[OFS2_OWNERS.depository]) },
      { g: 2, label: 'State & local governments', value: r1(o[OFS2_OWNERS.stateLocal]) },
      { g: 2, label: 'Private pension funds', value: r1(o[OFS2_OWNERS.pensionPrivate]) },
      { g: 2, label: 'Insurance companies', value: r1(o[OFS2_OWNERS.insurance]) },
      { g: 2, label: 'State/local pension funds', value: r1(o[OFS2_OWNERS.pensionStateLocal]) },
      { g: 2, label: 'Savings bonds (individuals)', value: r1(o[OFS2_OWNERS.savings]) },
    ],
    foreignYearAgoB: ya && ya[OFS2_OWNERS.foreign] != null ? r1(ya[OFS2_OWNERS.foreign]) : null,
    yearAgoEndOfMonth: ya ? yearAgo : null,
  };
}

// Weighted-average maturity of marketable Treasury debt, computed from the MSPD's security-level
// table (every outstanding bill, note, bond, TIPS and FRN with its maturity date and amount).
// This is the statistic TBAC reports each quarter ("weighted average maturity of marketable debt
// outstanding"); computed here it reproduced TBAC's ~70 months for Dec-2025 (70.4) and now
// updates every month instead of waiting for the next refunding deck.
const MSPD3 = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/mspd/mspd_table_3_market';
async function getAvgMaturity() {
  const latest = await fetchJSON(`${MSPD3}?sort=-record_date&page[size]=1&fields=record_date`);
  const date = latest.data[0].record_date;
  const j = await fetchJSON(`${MSPD3}?filter=record_date:eq:${date}&page[size]=10000&fields=security_class1_desc,maturity_date,outstanding_amt`);
  const utc = (d) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  const ref = utc(date);
  let w = 0, wy = 0, n = 0;
  for (const r of j.data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.maturity_date || '')) continue;
    if (/total/i.test(r.security_class1_desc || '')) continue;
    const amt = Number(r.outstanding_amt); // $ millions; null on a bill's partial-issue rows -> skipped
    if (!(amt > 0)) continue;
    const yrs = Math.max(0, (utc(r.maturity_date) - ref) / (365.25 * 864e5));
    w += amt; wy += amt * yrs; n += 1;
  }
  if (n < 100 || !(w > 0)) throw new Error(`MSPD table 3: implausible result (${n} securities)`);
  return { date, months: Math.round((wy / w) * 12 * 10) / 10, marketableB: Math.round(w / 1000), securities: n };
}

// FRED series pulled via the public, key-free CSV export.
const FRED_SERIES = {
  walcl: 'WALCL',          // Fed total assets, weekly, $B
  m2: 'M2SL',               // M2 money stock, monthly, $B
  effr: 'EFFR',             // Effective federal funds rate, daily
  iorb: 'IORB',             // Interest on reserve balances, daily
  onrrp: 'RRPONTSYAWARD',   // ON RRP award rate, daily
  discount: 'DPCREDIT',     // Primary credit (discount) rate, daily
  rrpvol: 'RRPONTSYD',      // ON RRP take-up volume, daily, $B
  gdp: 'GDP',               // Nominal GDP, quarterly SAAR, $B -- drives the live Debt ÷ GDP ratio
  debtGdpAnnual: 'GFDGDPA188S', // Gross federal debt as % of GDP, annual -- extends the 1939- chart when a new year posts
};

async function getFred(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  const rows = await fetchCSV(url);
  return latestFredPoint(rows);
}

async function main() {
  const results = {};
  const errors = [];

  // Each fetch is wrapped in its own try/catch BEFORE being handed to allSettled, so a
  // single rejected promise can never surface as an unhandled rejection and crash the
  // whole run (that's what happened here in an earlier version of this script — one
  // failing series took the entire job down instead of just being logged and skipped).
  const jobDefs = [
    ['debt', getDebtToThePenny],
    ['avgRate', getAvgInterestRate],
    ['composition', getDebtComposition],
    ['foreignHolders', getForeignHolders],
    ['mts', getMtsSummary],
    ['accruedInterest', getAccruedInterest],
    ['holders', getHolders],
    ['avgMaturity', getAvgMaturity],
    ...Object.entries(FRED_SERIES).map(([k, id]) => [k, () => getFred(id)]),
  ];

  const settled = await Promise.allSettled(
    jobDefs.map(([, fn]) => fn())
  );

  jobDefs.forEach(([key], i) => {
    const s = settled[i];
    if (s.status === 'fulfilled') {
      results[key] = s.value;
    } else {
      errors.push(`${key}: ${s.reason && s.reason.message ? s.reason.message : s.reason}`);
      results[key] = null;
    }
  });

  if (errors.length) {
    console.warn('Some series failed to fetch (keeping previous value for those):\n' + errors.join('\n'));
  }

  // FRED reports WALCL in millions of dollars but M2SL in billions — normalize both
  // to $B here so downstream consumers (site/index.html) can treat them uniformly.
  const walclB = results.walcl ? { date: results.walcl.date, value: results.walcl.value / 1000 } : null;

  const payload = {
    generatedAt: new Date().toISOString(),
    debt: results.debt,           // {date, totalDebtT, heldByPublicT, intragovT}
    avgRate: results.avgRate,     // {date, avgRatePct}
    fed: {
      walcl: walclB,               // {date, value} — $B (converted from FRED's $M)
      m2: results.m2,             // {date, value} — $B
    },
    debtComposition: results.composition, // {date, notes, bills, bonds, tips, frns, nonmarketable} — all $B
    foreignHolders: results.foreignHolders, // {date: "YYYY-MM", top10: [{country, valueB}], grandTotalB}
    rates: {
      effr: results.effr,
      iorb: results.iorb,
      onrrp: results.onrrp,
      discount: results.discount,
    },
    rrpVolume: results.rrpvol,    // {date, value} — $B, ON RRP take-up
    gdp: results.gdp,             // {date, value} — nominal GDP, $B SAAR; date is the quarter's first day (2026-04-01 = Q2 2026)
    debtGdpAnnual: results.debtGdpAnnual, // {date, value} — gross federal debt, % of GDP, annual (date = Jan 1 of that year)
    mts: results.mts,                     // MTS table 3: {date, fyCur, fyPrev, revYTDcur/pri, outYTDcur/pri, revFYprev, outFYprev, cashInterestB, totalReceiptsB, totalOutlaysB} — $B
    accruedInterest: results.accruedInterest, // {date, fytdT, lineItems} — accrual-basis interest expense, FYTD $T
    holders: results.holders,             // OFS-2 + Debt to the Penny: {asOf, holders[], totalPublicDebtB, foreignYearAgoB, yearAgoEndOfMonth}
    avgMaturity: results.avgMaturity,     // MSPD security-level: {date, months, marketableB, securities}
  };

  const js = `// AUTO-GENERATED by scripts/fetch-data.mjs — do not hand-edit.
// Last refreshed: ${payload.generatedAt}
// If a series failed to fetch on the most recent run, it is null here and
// site/index.html falls back to the last baked-in snapshot value for it.
window.LIVE_DATA = ${JSON.stringify(payload, null, 2)};
`;

  await import('node:fs/promises').then((fs) => fs.writeFile(OUT_PATH, js, 'utf8'));
  console.log('Wrote', OUT_PATH.pathname);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
