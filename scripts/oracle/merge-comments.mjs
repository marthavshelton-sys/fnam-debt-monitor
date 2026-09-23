#!/usr/bin/env node
// Merge drafted comments (data/_raw_comments_*.json, written from the archived releases and transcripts)
// into the canonical tools/oracle/data/comments.json used by scripts/oracle/build-data.mjs. Later files win per quarter.
// Idempotent; called from merge-raw.mjs and runnable alone: node scripts/oracle/merge-comments.mjs

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
const load = (n) => JSON.parse(readFileSync(join(DATA, n), "utf8").replace(/^﻿/, ""));

export function mergeComments() {
  const files = readdirSync(DATA).filter((f) => /^_raw_comments_[a-z]\.json$/.test(f)).sort();
  if (!files.length) return false;
  const out = existsSync(join(DATA, "comments.json")) ? load("comments.json") : { _comment: "", by_quarter: {} };
  out._comment = "Comments-column entries (one line per income-statement line, year-over-year) and executive-summary bullets drafted from the archived releases and the owner-supplied call transcripts; each entry cites its source. Reviewed by the owner before publishing.";
  out.by_quarter = out.by_quarter || {};
  let n = 0;
  for (const f of files) {
    const raw = load(f);
    for (const [qid, entry] of Object.entries(raw.by_quarter || {})) { out.by_quarter[qid] = entry; n++; }
    if (raw._notes) { out.notes = out.notes || {}; out.notes[f] = raw._notes; }
  }
  out.updatedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(join(DATA, "comments.json"), JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`merged comments for ${n} quarter(s) from ${files.length} file(s).`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { if (!mergeComments()) console.log("No _raw_comments_*.json files to merge."); }
