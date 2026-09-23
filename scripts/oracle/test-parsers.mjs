#!/usr/bin/env node
// Parser tests against the archived releases: re-reads every 8-K exhibit in tools/oracle/raw/8k and checks that
// the printed statement of operations (revenue lines, opex lines, operating income, interest, pretax and net
// income, diluted EPS and share count) and the balance-sheet highlights still match tools/oracle/data/quarters.json.
// If Oracle changes the release format, this fails the build — the page never sees a mis-parsed number.
// Run: node scripts/oracle/test-parsers.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { DATA, RAW } from "./paths.mjs";
const ARCHIVE = join(RAW, "8k");

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(td|th|tr|p|div|br)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#8212;|&mdash;/g, "—").replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, " ").trim();
}

// First "<label> [(n)] [(] [$] 12,345[.67] [)]" after the label: the statement lists the current period first.
// Parentheses mean a negative figure; a bracketed footnote number right after the label is skipped.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function numAfter(text, label) {
  const re = new RegExp(`${esc(label)}\\s*(?:\\(\\d\\)\\s*)?(\\()?\\s*\\$?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*(\\))?`, "i");
  const m = re.exec(text);
  if (!m) return null;
  const v = Number(m[2].replace(/,/g, ""));
  return m[1] && m[3] ? -v : v;
}
// Kept for callers that used the original helper.
export function firstFigureAfter(text, label) { return numAfter(text, label); }

function section(text, startRe, endRe) {
  const s = text.search(startRe); if (s < 0) return "";
  const rest = text.slice(s);
  const e = rest.search(endRe);
  return e > 0 ? rest.slice(0, e) : rest;
}

function main() {
  if (!existsSync(ARCHIVE)) { console.log("No archive at tools/oracle/raw/8k — nothing to test."); return; }
  const quarters = JSON.parse(readFileSync(join(DATA, "quarters.json"), "utf8")).quarters;
  const sources = JSON.parse(readFileSync(join(DATA, "sources.json"), "utf8"));
  const files = readdirSync(ARCHIVE);
  let tested = 0, failed = 0;
  const near = (a, b, tol = 0) => a != null && b != null && Math.abs(a - b) <= tol;
  for (const q of quarters) {
    const acc = sources[q.source]?.accession;
    const file = acc && files.find((f) => f.includes(acc));
    if (!file) { console.log(`SKIP ${q.id}: no archived release for ${acc ?? q.source}`); continue; }
    const text = htmlToText(readFileSync(join(ARCHIVE, file), "utf8"));
    const ops = section(text, /STATEMENTS OF OPERATIONS/i, /RECONCILIATION OF SELECTED GAAP/i);
    const rev = section(ops, /\bREVENUES\b/, /OPERATING EXPENSES/);
    const opx = section(ops, /OPERATING EXPENSES/, /OPERATING INCOME/);
    const below = section(ops, /OPERATING INCOME/, /WEIGHTED AVERAGE/);
    const shares = section(ops, /WEIGHTED AVERAGE/, /\(1\)/);
    const bs = section(text, /CONDENSED CONSOLIDATED BALANCE SHEETS/i, /STATEMENTS OF CASH FLOWS/i);
    const legacy = q.revenue_basis !== "fy2026_lines";
    const g = q.gaap, r = g.revenue, o = g.opex, b = q.balance_sheet || {};
    // Through 3Q26 the release printed "Restructuring" and "Acquisition related and other" as two lines; from 4Q26 one line.
    const restr = numAfter(opx, "Restructuring and other") ?? ((numAfter(opx, "Restructuring") ?? 0) + (numAfter(opx, "Acquisition related and other") ?? 0));
    const checks = [
      ["Revenue: cloud line", numAfter(rev, legacy ? "Cloud services and license support" : "Cloud"), r.cloud],
      ["Revenue: software line", numAfter(rev, legacy ? "Cloud license and on-premise license" : "Software"), r.software],
      ["Revenue: hardware", numAfter(rev, "Hardware"), r.hardware],
      ["Revenue: services", numAfter(rev, "Services"), r.services],
      ["Total revenues", numAfter(rev, "Total revenues"), r.total],
      ["Opex: cloud/software cost", numAfter(opx, legacy ? "Cloud services and license support" : "Cloud and software"), o.cloud_and_software_cost],
      ["Opex: hardware cost", numAfter(opx, "Hardware"), o.hardware_cost],
      ["Opex: services cost", numAfter(opx, "Services"), o.services_cost],
      ["Opex: sales and marketing", numAfter(opx, "Sales and marketing"), o.sales_and_marketing],
      ["Opex: research and development", numAfter(opx, "Research and development"), o.research_and_development],
      ["Opex: general and administrative", numAfter(opx, "General and administrative"), o.general_and_administrative],
      ["Opex: amortization of intangibles", numAfter(opx, "Amortization of intangible assets"), o.amortization_of_intangibles],
      ["Opex: restructuring and other", restr, o.restructuring_and_other],
      ["Total operating expenses", numAfter(opx, "Total operating expenses"), o.total],
      ["Operating income", numAfter(below, "OPERATING INCOME"), g.operating_income],
      ["Interest expense", numAfter(below, "Interest expense"), g.interest_expense],
      ["Income before income taxes", numAfter(below, "INCOME BEFORE INCOME TAXES"), g.pretax_income],
      ["Net income", numAfter(below, "NET INCOME"), g.net_income],
      ["Diluted EPS", numAfter(section(below, /EARNINGS PER SHARE/, /WEIGHTED AVERAGE/) || below, "Diluted"), g.diluted_eps],
      ["Diluted shares", numAfter(shares, "Diluted"), g.diluted_shares],
      ["BS: cash and cash equivalents", numAfter(bs, "Cash and cash equivalents"), b.cash_and_equivalents],
      ["BS: marketable securities", numAfter(bs, "Marketable securities"), b.marketable_securities],
      ["BS: total assets", numAfter(bs, "TOTAL ASSETS"), b.total_assets],
      ["BS: notes payable, current", numAfter(bs, "Notes payable and other borrowings, current"), b.short_term_debt],
      ["BS: notes payable, non-current", numAfter(bs, "Notes payable and other borrowings, non-current"), b.long_term_debt],
      ["BS: deferred revenues (current)", numAfter(section(bs, /Current Liabilities/, /Total Current Liabilities/), "Deferred revenues"), b.current_deferred_revenue],
    ];
    for (const [label, parsed, expected] of checks) {
      if (expected == null) continue; // not captured in quarters.json (older quarters carry fewer balance-sheet lines)
      tested++;
      const tol = /EPS/.test(label) ? 0.005 : 0;
      if (!near(parsed, expected, tol)) { failed++; console.log(`FAIL ${q.id} ${label}: parsed ${parsed} vs quarters.json ${expected} (${file})`); }
      else console.log(`OK   ${q.id} ${label}: ${parsed}`);
    }
  }
  console.log(`\nParser tests: ${tested} checks, ${failed} failed.`);
  if (failed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
