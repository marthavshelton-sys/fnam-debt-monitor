// Pulls the fast-moving series (debt totals, policy rates, Fed balance sheet, M2) from
// Treasury Fiscal Data (no key required) and FRED's public CSV export (no key required)
// and writes site/data.js as `window.LIVE_DATA = {...}`.
//
// This script intentionally does NOT touch the slow-moving, hand-researched CBO
// projection tables baked into site/index.html (cboGdpRow, cboCategoryTable, cboProjection,
// the "why debt/GDP rose" table) — CBO publishes no API, and those figures are refreshed
// on a separate, monthly cadence by a scheduled research pass, not by this daily job.
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

// FRED series pulled via the public, key-free CSV export.
const FRED_SERIES = {
  walcl: 'WALCL',          // Fed total assets, weekly, $B
  m2: 'M2SL',               // M2 money stock, monthly, $B
  effr: 'EFFR',             // Effective federal funds rate, daily
  iorb: 'IORB',             // Interest on reserve balances, daily
  onrrp: 'RRPONTSYAWARD',   // ON RRP award rate, daily
  discount: 'DPCREDIT',     // Primary credit (discount) rate, daily
  rrpvol: 'RRPONTSYD',      // ON RRP take-up volume, daily, $B
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
