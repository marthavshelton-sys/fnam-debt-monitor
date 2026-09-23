#!/usr/bin/env node
// Local convenience: run the three guards in order and regenerate site/oracle/data. A failure in the tie-out
// or the parser tests stops before anything is written. Cloudflare Pages serves site/ directly (no dist step).
// Run: node scripts/oracle/build.mjs

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const run = (script, label) => { const r = spawnSync(process.execPath, [join(here, script)], { stdio: "inherit" }); if (r.status !== 0) { console.error(`Build aborted: ${label} failed.`); process.exit(1); } };
run("validate-data.mjs", "tie-out");
run("test-parsers.mjs", "parser tests (release format changed?)");
run("build-data.mjs", "site data generation");
console.log("site/oracle/data regenerated.");
