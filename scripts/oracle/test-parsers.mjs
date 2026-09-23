#!/usr/bin/env node
// Parser tests against the archived releases: re-reads each 8-K exhibit in tools/oracle/raw/8k and checks that
// the printed "Total revenues" and "Total operating expenses" for the quarter still match tools/oracle/data/quarters.json.
// If Oracle changes the release format, this fails the build — the page never sees a mis-parsed number.
// Run: node scripts/oracle/test-parsers.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
const ARCHIVE = join(RAW, "8k");

export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(td|th|tr|p|div|br)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#8212;|&mdash;/g, "—")
    .replace(/\s+/g, " ").trim();
}

// First "<label> $ 12,345" occurrence: the statement of operations lists the current quarter first.
export function firstFigureAfter(text, label) {
  const re = new RegExp(`${label}\\s*\\$?\\s*\\(?([\\d,]{4,})\\)?`, "i");
  const m = re.exec(text);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function main() {
  if (!existsSync(ARCHIVE)) { console.log("No archive at tools/oracle/raw/8k — nothing to test."); return; }
  const quarters = JSON.parse(readFileSync(join(DATA, "quarters.json"), "utf8")).quarters;
  const sources = JSON.parse(readFileSync(join(DATA, "sources.json"), "utf8"));
  const files = readdirSync(ARCHIVE);
  let tested = 0, failed = 0;
  for (const q of quarters) {
    const acc = sources[q.source]?.accession;
    const file = acc && files.find((f) => f.includes(acc));
    if (!file) { console.log(`SKIP ${q.id}: no archived release for ${acc ?? q.source}`); continue; }
    const text = htmlToText(readFileSync(join(ARCHIVE, file), "utf8"));
    const checks = [
      ["Total revenues", firstFigureAfter(text, "Total revenues"), q.gaap.revenue.total],
      ["Total operating expenses", firstFigureAfter(text, "Total operating expenses"), q.gaap.opex.total],
    ];
    for (const [label, parsed, expected] of checks) {
      tested++;
      if (parsed !== expected) { failed++; console.log(`FAIL ${q.id} ${label}: parsed ${parsed} vs quarters.json ${expected} (${file})`); }
      else console.log(`OK   ${q.id} ${label}: ${parsed}`);
    }
  }
  console.log(`\nParser tests: ${tested} checks, ${failed} failed.`);
  if (failed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
