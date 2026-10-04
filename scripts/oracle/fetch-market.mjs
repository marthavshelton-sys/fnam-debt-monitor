#!/usr/bin/env node
// Daily market refresh. Writes tools/oracle/data/prices_orcl_daily.csv, tools/oracle/data/prices_spx_daily.csv, tools/oracle/data/treasury_10y.csv
// (all as Date,Open,High,Low,Close,Volume — blank where a source gives close only) and updates the
// price_snapshot / treasury_10y blocks of tools/oracle/data/market_reference.json, leaving ratings and instruments untouched.
// Each series tries public sources in order and records which one succeeded:
//   ORCL:   Nasdaq historical API → Yahoo Finance chart API → Stooq CSV
//   S&P 500: FRED SP500 → Yahoo Finance chart API (^GSPC) → Stooq CSV
//   10-year: FRED DGS10 → U.S. Treasury daily par yield curve CSV
//   ERP:    Aswath Damodaran's implied equity risk premium for the S&P 500 (monthly, first of the month), read from
//           his NYU Stern home page; a failed read keeps the stored value (the page dates it and flags it when old)
// Run: node scripts/oracle/fetch-market.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
import { completedSessions } from "../lib/completed-sessions.mjs";
const today = new Date().toISOString().slice(0, 10);
const UA = "oracle-board-model/1.0 (public market data refresh)";

async function get(url, accept = "text/plain,*/*") {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: accept } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
}
const toCSV = (rows) => "Date,Open,High,Low,Close,Volume\n" + rows.map((r) => [r.date, r.open ?? "", r.high ?? "", r.low ?? "", r.close, r.volume ?? ""].join(",")).join("\n") + "\n";
const num = (s) => { const v = parseFloat(String(s).replace(/[$,]/g, "")); return Number.isNaN(v) ? null : v; };

// ---- source adapters (each returns rows sorted ascending by date, close never null) ----
async function nasdaq(symbol) {
  const from = new Date(); from.setFullYear(from.getFullYear() - 5);
  const url = `https://api.nasdaq.com/api/quote/${symbol}/historical?assetclass=stocks&fromdate=${from.toISOString().slice(0, 10)}&todate=${today}&limit=10000`;
  const j = await (await get(url, "application/json")).json();
  const rows = (j?.data?.tradesTable?.rows || []).map((r) => {
    const [m, d, y] = r.date.split("/");
    return { date: `${y}-${m}-${d}`, open: num(r.open), high: num(r.high), low: num(r.low), close: num(r.close), volume: num(r.volume) };
  }).filter((r) => r.close != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (rows.length < 100) throw new Error("too few rows");
  return { rows, url };
}
async function yahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d`;
  const j = await (await get(url, "application/json")).json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error("no chart result");
  const q = res.indicators.quote[0];
  const rows = res.timestamp.map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] }))
    .filter((r) => r.close != null);
  if (rows.length < 100) throw new Error("too few rows");
  return { rows, url };
}
async function stooq(symbol) {
  const url = `https://stooq.com/q/d/l/?s=${symbol}&i=d`;
  const text = await (await get(url)).text();
  if (!/^Date,Open,High,Low,Close/m.test(text)) throw new Error("not a CSV (bot check?)");
  const rows = text.trim().split(/\r?\n/).slice(1).map((l) => { const c = l.split(","); return { date: c[0], open: num(c[1]), high: num(c[2]), low: num(c[3]), close: num(c[4]), volume: num(c[5]) }; }).filter((r) => r.close != null);
  return { rows, url };
}
async function fred(series, col) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series}`;
  const text = await (await get(url)).text();
  const lines = text.trim().split(/\r?\n/);
  const rows = lines.slice(1).map((l) => { const [date, v] = l.split(","); return { date, close: num(v) }; }).filter((r) => r.close != null && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  if (rows.length < 50) throw new Error("too few rows");
  return { rows, url };
}
async function treasuryCSV() {
  const yr = today.slice(0, 4);
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${yr}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${yr}&page&_format=csv`;
  const text = await (await get(url, "text/csv")).text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const di = header.indexOf("Date"), ci = header.findIndex((h) => /^10 Yr$/i.test(h));
  if (di < 0 || ci < 0) throw new Error("unexpected header");
  const rows = lines.slice(1).map((l) => { const c = l.split(","); const [m, d, y] = c[di].split("/"); return { date: `${y}-${m}-${d}`, close: num(c[ci]) }; }).filter((r) => r.close != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  return { rows, url };
}

// Damodaran posts "Implied ERP on <Month> <d>, <yyyy> = 4.14% (Trailing 12 month, with adjusted payout); ... (with the US
// treasury rate of 4.75% used as the riskfree rate ...)". The first figure (trailing 12 months, adjusted payout) is his
// headline estimate and the DCF default; the treasury rate he used is stored beside it.
export function parseDamodaranErp(html) {
  const t = String(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
  const m = /Implied ERP on ([A-Z][a-z]+ \d{1,2}, \d{4})\s*=\s*(\d+)\s*\.\s*(\d+)\s*%\s*\(([^)]*)\)/.exec(t);
  if (!m) return null;
  const d = new Date(`${m[1]} 12:00 UTC`); if (isNaN(d)) return null;
  const rf = /treasury rate of\s*(\d+(?:\.\d+)?)\s*%/i.exec(t.slice(m.index, m.index + 800));
  return { erp_pct: Number(`${m[2]}.${m[3]}`), as_of: d.toISOString().slice(0, 10), method: m[4].trim(), riskfree_used_pct: rf ? Number(rf[1]) : null };
}
async function damodaranErp() {
  const url = "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/home.htm";
  const e = parseDamodaranErp(await (await get(url, "text/html")).text());
  if (!e || !(e.erp_pct > 1 && e.erp_pct < 12)) throw new Error("implied ERP line not found or out of range");
  return { ...e, source_url: url, source_name: "Aswath Damodaran, NYU Stern: implied ERP for the S&P 500 (monthly)", accessed: today };
}

async function firstThatWorks(label, attempts) {
  const errors = [];
  for (const [i, [name, fn]] of attempts.entries()) {
    try { const out = await fn(); console.log(`OK   ${label} via ${name}: ${out.rows.length} rows`); return { ...out, via: name, fallback: i > 0 }; }
    catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  console.error(`FAIL ${label}: ${errors.join(" | ")}`);
  return null;
}
// A fallback source may cover a shorter window than the stored series (the Treasury's yearly CSV holds one calendar year;
// FRED holds decades). When the primary source failed, keep every stored row and add only the dates the fallback brings,
// so a one-day outage of the primary never truncates the committed history (2026-10-04).
function readCSV(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").trim().split(/\r?\n/).slice(1).map((l) => { const c = l.split(","); return { date: c[0], open: num(c[1]), high: num(c[2]), low: num(c[3]), close: num(c[4]), volume: num(c[5]) }; }).filter((r) => r.close != null && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
}
function mergeFallback(series, path) {
  if (!series || !series.fallback) return series;
  const stored = readCSV(path); if (!stored.length) return series;
  const have = new Set(stored.map((r) => r.date)); const added = series.rows.filter((r) => !have.has(r.date));
  const rows = stored.concat(added).sort((a, b) => (a.date < b.date ? -1 : 1));
  console.log(`     ${series.via} is a fallback: kept ${stored.length} stored rows, added ${added.length} new date(s)`);
  return { ...series, rows };
}

async function main() {
  const orcl = await firstThatWorks("ORCL daily", [["Nasdaq", () => nasdaq("ORCL")], ["Yahoo Finance", () => yahoo("ORCL")], ["Stooq", () => stooq("orcl.us")]]);
  const spx = await firstThatWorks("S&P 500 daily", [["FRED SP500", () => fred("SP500")], ["Yahoo Finance", () => yahoo("^GSPC")], ["Stooq", () => stooq("^spx")]]);
  const tsy = await firstThatWorks("10-year Treasury", [["FRED DGS10", () => fred("DGS10")], ["U.S. Treasury CSV", () => treasuryCSV()]]);

  // closes only: the 13:30 UTC run is at the NYSE open, so a bar dated today is dropped until 16:15 New York time
  for (const x of [orcl, spx]) if (x) x.rows = completedSessions(x.rows, { exchange: "NYSE" });
  const orclM = mergeFallback(orcl, join(DATA, "prices_orcl_daily.csv")), spxM = mergeFallback(spx, join(DATA, "prices_spx_daily.csv")), tsyM = mergeFallback(tsy, join(DATA, "treasury_10y.csv"));
  if (orclM) { orcl.rows = orclM.rows; writeFileSync(join(DATA, "prices_orcl_daily.csv"), toCSV(orcl.rows), "utf8"); }
  if (spxM) { spx.rows = spxM.rows; writeFileSync(join(DATA, "prices_spx_daily.csv"), toCSV(spx.rows), "utf8"); }
  if (tsyM) { tsy.rows = tsyM.rows; writeFileSync(join(DATA, "treasury_10y.csv"), toCSV(tsy.rows), "utf8"); }

  const refPath = join(DATA, "market_reference.json");
  const ref = existsSync(refPath) ? JSON.parse(readFileSync(refPath, "utf8")) : { as_of: today, price_snapshot: {}, treasury_10y: {}, credit_ratings: {}, debt_instruments: [], notes: [] };
  ref.price_snapshot = ref.price_snapshot || {};

  const yearAgoClose = (rows) => { const last = new Date(rows.at(-1).date + "T00:00:00"); const cutoff = new Date(last); cutoff.setFullYear(cutoff.getFullYear() - 1); const r = rows.filter((x) => new Date(x.date + "T00:00:00") <= cutoff).at(-1); return r?.close ?? null; };

  if (orcl) {
    const rows = orcl.rows, last = rows.at(-1), prev = rows.at(-2), last252 = rows.slice(-252);
    const hi = last252.reduce((a, r) => (r.close > a.close ? r : a)), lo = last252.reduce((a, r) => (r.close < a.close ? r : a));
    const ya = yearAgoClose(rows);
    const p = ref.price_snapshot.orcl || {};
    ref.price_snapshot.orcl = { ...p, close: last.close, close_date: last.date, week52_high: hi.close, week52_high_date: hi.date, week52_low: lo.close, week52_low_date: lo.date,
      one_day_change_pct: prev ? Math.round(((last.close - prev.close) / prev.close) * 10000) / 100 : null,
      one_year_change_pct: ya ? Math.round(((last.close - ya) / ya) * 10000) / 100 : null,
      market_cap_millions: p.shares_outstanding_millions ? Math.round(p.shares_outstanding_millions * last.close * 100) / 100 : p.market_cap_millions ?? null,
      source_url: orcl.url, source_name: orcl.via, accessed: today };
  }
  if (spx) {
    const rows = spx.rows, last = rows.at(-1), prev = rows.at(-2), ya = yearAgoClose(rows);
    ref.price_snapshot.sp500 = { close: last.close, close_date: last.date, one_day_change_pct: prev ? Math.round(((last.close - prev.close) / prev.close) * 10000) / 100 : null, one_year_change_pct: ya ? Math.round(((last.close - ya) / ya) * 10000) / 100 : null, source_url: spx.url, source_name: spx.via, accessed: today };
  }
  if (tsy) {
    const last = tsy.rows.at(-1);
    ref.treasury_10y = { yield_pct: last.close, as_of_date: last.date, source_url: tsy.url, source_name: tsy.via, accessed: today };
  }
  try { const e = await damodaranErp(); ref.erp = e; console.log(`OK   implied ERP ${e.erp_pct}% as of ${e.as_of}`); }
  catch (e) { console.error(`WARN implied ERP not refreshed (${e.message}); keeping ${ref.erp ? `${ref.erp.erp_pct}% as of ${ref.erp.as_of}` : "none"}`); }
  ref.as_of = today;
  ref.refreshed_at = new Date().toISOString(); // the page's market stamp shows this time in ET
  writeFileSync(refPath, JSON.stringify(ref, null, 2) + "\n", "utf8");
  console.log(`Updated tools/oracle/data/market_reference.json (as_of ${today}).`);
  if (!orcl || !spx || !tsy) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
