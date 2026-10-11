// Parsers of the publishers' files for the American Consumer pipeline: the Federal Reserve's Distributional Financial
// Accounts and Survey of Consumer Finances CSV packages and the New York Fed's Household Debt and Credit workbook.
// Kept apart from the fetcher so they can be tested on stored files.
import { parseCsv } from './csv.mjs';
import { num } from './common.mjs';

// ---- Distributional Financial Accounts ----
export const DFA_COLS = { 'Net worth': 'nw', Assets: 'assets', 'Real estate': 're', 'Consumer durables': 'durables', 'Corporate equities and mutual fund shares': 'equities', 'DB pension entitlements': 'db', 'DC pension entitlements': 'dc',
  'Unincorporated businesses': 'business', 'Other assets': 'other', Liabilities: 'liab', 'Home mortgages': 'mortgages', 'Consumer credit': 'ccredit', 'Other liabilities': 'otherLiab' };
const DFA_DETAIL = { Deposits: 'deposits', 'Money market fund shares': 'mmf', 'Household count': 'households', 'Minimum Wealth Cutoff': 'minCut', 'Minimum Income Cutoff': 'minCut', 'Maximum Income Cutoff': 'maxCut' };
export const quarterKey = (s) => { const m = /^(\d{4}):Q([1-4])$/.exec(String(s).trim()); return m ? `${m[1]}-Q${m[2]}` : null; };
export function parseDfa(levelsCsv, detailCsv) {
  const out = { quarters: [], categories: [], series: {} };
  const rows = parseCsv(levelsCsv); const head = rows[0].map((h) => h.trim());
  for (const h of Object.keys(DFA_COLS)) if (!head.includes(h)) throw new Error(`DFA levels file: column "${h}" missing (has ${head.join(', ')})`);
  const qset = new Set();
  for (const r of rows.slice(1)) {
    const q = quarterKey(r[0]); const cat = (r[1] || '').trim();
    if (!q || !cat) continue;
    qset.add(q);
    if (!out.categories.includes(cat)) out.categories.push(cat);
    const rec = ((out.series[cat] = out.series[cat] || {})[q] = {});
    head.forEach((h, i) => { if (DFA_COLS[h]) rec[DFA_COLS[h]] = num(r[i]); });
  }
  const drows = parseCsv(detailCsv); const dhead = drows[0].map((h) => h.trim());
  if (!dhead.includes('Household count')) throw new Error('DFA detail file: "Household count" column missing');
  for (const r of drows.slice(1)) {
    const q = quarterKey(r[0]); const cat = (r[1] || '').trim();
    const rec = q && out.series[cat] && out.series[cat][q];
    if (!rec) continue;
    dhead.forEach((h, i) => { if (DFA_DETAIL[h]) { const v = num(r[i]); if (v != null) rec[DFA_DETAIL[h]] = v; } });
  }
  out.quarters = [...qset].sort();
  return out;
}

// ---- Survey of Consumer Finances (chartbook files) ----
export const SCF_COLS = ['Before_Tax_Income', 'Net_Worth', 'Assets', 'Financial_Assets', 'Transaction_Accounts', 'Directly_Held_Stocks', 'Retirement_Accounts', 'Stock_Holdings', 'Nonfinancial_Assets', 'Primary_Residence', 'Owned_Vehicles', 'Business_Equity',
  'Debt', 'Home_Secured_Debt', 'Installment_Loans', 'Credit_Card_Balances', 'Vehicle_Installment_Loans', 'Education_Installment_Loans'];
export function parseScf(csv) {
  const rows = parseCsv(csv); const head = rows[0].map((h) => h.trim());
  if (head[0] !== 'year' || head[1] !== 'Category') throw new Error(`SCF file: unexpected header ${head.slice(0, 3).join(',')}`);
  for (const c of SCF_COLS) if (!head.includes(c)) throw new Error(`SCF file: column ${c} missing`);
  const out = {};
  for (const r of rows.slice(1)) {
    const y = Number(r[0]); const cat = (r[1] || '').trim();
    if (!y || !cat) continue;
    const rec = ((out[cat] = out[cat] || {})[y] = {});
    for (const c of SCF_COLS) rec[c] = num(r[head.indexOf(c)]);
  }
  return out;
}

// ---- New York Fed, Household Debt and Credit workbook ----
export const yq = (s) => { const m = /^(\d\d):Q([1-4])$/.exec(String(s).trim()); if (!m) return null; const y = Number(m[1]); return `${y < 60 ? 2000 + y : 1900 + y}-Q${m[2]}`; };
export function parseHhdcSheet(rows) {
  const firstText = (r) => (r || []).find((c) => typeof c === 'string' && c.trim());
  const title = String(firstText(rows.find((r) => firstText(r)) || []) || '').trim();
  const units = String((rows.slice(1, 3).map(firstText).find((t) => t && /dollars|percent|\$|thousands|millions/i.test(t))) || '').trim();
  const iData = rows.findIndex((r) => r && typeof r[0] === 'string' && yq(r[0]));
  if (iData > 0) {   // a quarterly table: header row = the last row before the data that carries column names
    let hi = iData - 1;
    while (hi > 0 && !(rows[hi] || []).slice(1).some((c) => typeof c === 'string' && c.trim())) hi--;
    const header = (rows[hi] || []).map((c) => (typeof c === 'string' ? c.trim() : c));
    const cols = []; header.forEach((h, i) => { if (i > 0 && typeof h === 'string' && h && !/^(return to|source|note)/i.test(h)) cols.push({ i, name: h }); });
    const data = [];
    for (const r of rows.slice(iData)) { const q = r && typeof r[0] === 'string' ? yq(r[0]) : null; if (!q) continue; data.push([q, ...cols.map((c) => (typeof r[c.i] === 'number' ? r[c.i] : null))]); }
    return { title, units, kind: 'quarterly', columns: cols.map((c) => c.name), rows: data };
  }
  // a matrix (rows = products or states, columns = groups)
  const hi = rows.findIndex((r) => r && (r[0] == null || r[0] === '') && r.slice(1).filter((c) => typeof c === 'string' && c.trim()).length >= 3);
  if (hi < 0) return { title, units, kind: 'unknown', columns: [], rows: [] };
  const cols = []; rows[hi].forEach((h, i) => { if (i > 0 && typeof h === 'string' && h.trim()) cols.push({ i, name: h.trim() }); });
  const data = [];
  for (const r of rows.slice(hi + 1)) { if (!r || typeof r[0] !== 'string' || !r[0].trim() || /^(return to|source|note|\*)/i.test(r[0])) continue; if (!cols.some((c) => typeof r[c.i] === 'number')) continue; data.push([r[0].trim(), ...cols.map((c) => (typeof r[c.i] === 'number' ? r[c.i] : null))]); }
  return { title, units, kind: 'matrix', columns: cols.map((c) => c.name), rows: data };
}
