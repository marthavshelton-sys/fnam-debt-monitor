#!/usr/bin/env node
// Builds the published page (site/macro/index.html) from macro_monitor_template.html
// and the processed data in tools/macro/data.
//
//   node tools/macro/build-page.mjs [--out FILE] [--data DIR] [--date YYYY-MM-DD] [--plain]
//
// build.ps1 runs this whenever Node is available (it is on the GitHub runner) and
// builds the page itself, unpacked, only when it is not. Linux sessions run it
// directly to build and check a template change against the committed data.
//
// Same substitution, page wrap and guards as build.ps1 (the two locales expose the
// same keys, every T.key the code uses exists, the page script parses), plus two
// things for the published copy:
//  - Every data block is packed losslessly: arrays of identical rows are stored as
//    columns, regular date sequences as ranges and irregular ones as steps from the
//    first date; the page's unpack() restores them. A block is packed only if
//    unpacking it gives back exactly the original.
//  - The template's developer comments are left out. The stripped script must parse
//    and keep every code character of the original, or the comments stay.
// --plain skips both; the page then matches build.ps1's own output byte for byte.
//
// All output goes to stdout (Windows PowerShell treats a native command's stderr as
// an error); a failure exits non-zero and build.ps1 falls back to its own build.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const out = opt("--out") || join(here, "..", "..", "site", "macro", "index.html");
const dataDir = opt("--data") || process.env.MACRO_DATA_DIR || join(here, "data");
const today = opt("--date") || new Date().toISOString().slice(0, 10);
const plain = args.includes("--plain");

function fail(msg) { console.log("build-page.mjs: " + msg); process.exit(1); }
const rd = f => readFileSync(f, "utf8").replace(/^﻿/, "");
const template = rd(join(here, "macro_monitor_template.html")).replace(/\r\n/g, "\n");
const scriptOf = html => { const m = /<script>([\s\S]*)<\/script>/.exec(html); if (!m) fail("no page script found"); return m[1]; };

// ---------------- guards (the same rules as build.ps1) ----------------
const esBlock = /\n  es: \{([\s\S]*?)\n  \},\n\n  en: \{/.exec(template)?.[1];
const enBlock = /\n  en: \{([\s\S]*?)\n  \}\n\};/.exec(template)?.[1];
if (!esBlock || !enBlock) fail("could not locate both locale blocks in the template");
const keys = b => [...b.replace(/names: \{[\s\S]*?\n    \}/, "").matchAll(/^    ([A-Za-z][A-Za-z0-9]*)\s*:/gm)].map(m => m[1]);
const nameKeys = b => [...(/names: \{([\s\S]*?)\n    \}/.exec(b)?.[1] || "").matchAll(/"([^"]+)"\s*:/g)].map(m => m[1]);
const es = new Set(keys(esBlock)), en = new Set(keys(enBlock)), esN = new Set(nameKeys(esBlock)), enN = new Set(nameKeys(enBlock));
const missing = (a, b) => [...a].filter(k => !b.has(k));
const gaps = { missingInEn: missing(es, en), missingInEs: missing(en, es), namesMissingInEn: missing(esN, enN), namesMissingInEs: missing(enN, esN) };
if (Object.values(gaps).some(a => a.length)) { console.log(JSON.stringify(gaps)); fail("locale parity check failed - refusing to build a half-translated page"); }
console.log(`locale parity  : OK (${es.size} strings + ${esN.size} names, both locales)`);
const defined = new Set([...es, "names", "months", "htmlLang", "dateLocale"]);
const used = [...new Set([...template.replace(/const I18N = \{[\s\S]*?\n\};/, "").matchAll(/\bT\.([A-Za-z][A-Za-z0-9]*)/g)].map(m => m[1]))];
const undef = used.filter(k => !defined.has(k));
if (undef.length) { console.log(undef.map(k => "  undefined reference : T." + k).join("\n")); fail("unresolved string reference - the page would render 'undefined'"); }
console.log(`string refs    : OK (${used.length} references all resolve)`);
try { new vm.Script(scriptOf(template)); } catch (e) { fail("the page script does not parse: " + e.message); }
console.log("script syntax  : OK");
// The server answers an unknown ?view= with 404 (functions/macro/_middleware.js); its list of
// sections must be the page's own, or a real section would answer 404 and a missing one 200.
{
  const railIds = [...template.matchAll(/<a class="rail-item[^"]*"[^>]*data-view="([a-z0-9-]+)"/g)].map(m => m[1]);
  let mw = ""; try { mw = rd(join(here, "..", "..", "functions", "macro", "_middleware.js")); } catch (e) { fail("functions/macro/_middleware.js is missing"); }
  const listed = (/const VIEWS = \[([^\]]*)\]/.exec(mw)?.[1] || "").match(/[a-z0-9-]+/g) || [];
  if (!railIds.length || [...railIds].sort().join() !== [...listed].sort().join()) fail(`functions/macro/_middleware.js lists the sections [${listed.join(", ")}] but the page has [${railIds.join(", ")}]`);
  console.log(`view list      : OK (${railIds.length} sections, the same in functions/macro/_middleware.js)`);
}

// ---------------- data: lossless packing, checked by the page's own unpack() ----------------
// The unpacker lives in the template (between the @unpack markers) and is evaluated
// here, so the check runs the exact code the page runs.
const unpackSrc = /\/\/ @unpack-begin\n([\s\S]*?)\n\/\/ @unpack-end/.exec(scriptOf(template))?.[1];
if (!unpackSrc) fail("unpack() markers not found in the template");
const sandbox = vm.createContext({});
vm.runInContext(unpackSrc + "\n;globalThis.__unpack = unpack;", sandbox);
const unpack = sandbox.__unpack;

const ym = (y, m) => y + "-" + String(m).padStart(2, "0");
const addMonths = (s, k) => { const t = +s.slice(0, 4) * 12 + (+s.slice(5, 7) - 1) + k; return ym(Math.floor(t / 12), (t % 12) + 1); };
const addQuarters = (s, k) => { const t = +s.slice(0, 4) * 4 + (+s.slice(6, 7) - 1) + k; return Math.floor(t / 4) + "-Q" + ((t % 4) + 1); };
const addDays = (s, k) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + k)).toISOString().slice(0, 10);
function packColumn(vals) {
  if (vals.length >= 3 && vals.every(v => typeof v === "string")) {
    if (vals.every(v => /^\d{4}-\d{2}$/.test(v))) {
      if (vals.every((v, i) => v === addMonths(vals[0], i))) return { $m: vals[0], n: vals.length };
      const t = v => +v.slice(0, 4) * 12 + +v.slice(5, 7);
      return { $mk: vals[0], k: vals.slice(1).map((v, i) => t(v) - t(vals[i])) };
    }
    if (vals.every(v => /^\d{4}-Q[1-4]$/.test(v)) && vals.every((v, i) => v === addQuarters(vals[0], i))) return { $q: vals[0], n: vals.length };
    if (vals.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) {
      const days = vals.map(v => Math.round(Date.parse(v + "T00:00:00Z") / 864e5)), s = days[1] - days[0];
      if (s > 0 && days.every((d, i) => d === days[0] + i * s) && vals.every((v, i) => v === addDays(vals[0], i * s))) return { $d: vals[0], s: s, n: vals.length };
      return { $dk: vals[0], k: days.slice(1).map((d, i) => d - days[i]) };
    }
  }
  return vals;
}
function packRows(arr) {
  if (arr.length < 8 || !arr[0] || typeof arr[0] !== "object" || Array.isArray(arr[0])) return null;
  const cols = Object.keys(arr[0]); if (!cols.length) return null;
  const sig = cols.join("\u0001");
  for (const r of arr) {
    if (!r || typeof r !== "object" || Array.isArray(r) || Object.keys(r).join("\u0001") !== sig) return null;
    for (const k of cols) if (r[k] !== null && typeof r[k] === "object") return null;
  }
  return { $p: cols, $c: cols.map(k => packColumn(arr.map(r => r[k]))) };
}
function pack(x) {
  if (Array.isArray(x)) return packRows(x) || x.map(pack);
  if (x && typeof x === "object") { const o = {}; for (const k of Object.keys(x)) o[k] = pack(x[k]); return o; }
  return x;
}
let rawBytes = 0, packedBytes = 0;
function embed(file, placeholder) {
  const text = rd(join(dataDir, file));
  if (plain) return text;
  // The page restores only blocks it passes through unpack(); any other stays as is.
  if (!template.includes("unpack(" + placeholder + ")")) { console.log("  " + file + ": not read through unpack() in the template; embedded as is"); return text; }
  let parsed; try { parsed = JSON.parse(text); } catch (e) { fail(file + " is not valid JSON: " + e.message); }
  const packedText = JSON.stringify(pack(parsed));
  // Only a block that round-trips exactly (values, key order, row order) is packed.
  if (JSON.stringify(unpack(JSON.parse(packedText))) !== JSON.stringify(parsed)) { console.log("  " + file + ": packing did not round-trip; embedded as is"); return text; }
  rawBytes += Buffer.byteLength(text); packedBytes += Buffer.byteLength(packedText);
  return packedText;
}

// ---------------- comments: left out of the published copy ----------------
// A small JavaScript scanner, enough to tell comments from code, strings, template
// literals (with nested ${...}) and regular-expression literals.
const REGEX_AFTER_WORD = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
function scanJs(src, onComment) {
  const n = src.length, tpl = [];
  let i = 0, depth = 0, prev = "";
  const regexAllowed = () => prev === "" || (prev.startsWith("id:") ? REGEX_AFTER_WORD.has(prev.slice(3)) : !["num", "str", "re", "tpl", ")", "]"].includes(prev));
  // Reads a template literal's text from i; returns true at the closing backtick, false at "${".
  const templateBody = () => {
    while (i < n) {
      const c = src[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { i++; return true; }
      if (c === "$" && src[i + 1] === "{") { i += 2; tpl.push(depth); depth++; return false; }
      i++;
    }
    return true;
  };
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { const s = i; while (i < n && src[i] !== "\n") i++; onComment(s, i); continue; }
    if (c === "/" && src[i + 1] === "*") { const s = i, e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; onComment(s, i); continue; }
    if (c === "'" || c === '"') { i++; while (i < n && src[i] !== c && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1; i++; prev = "str"; continue; }
    if (c === "`") { i++; prev = templateBody() ? "tpl" : "{"; continue; }
    if (c === "/") {
      if (!regexAllowed()) { i++; prev = "/"; continue; }
      i++; let cls = false;
      while (i < n && src[i] !== "\n") {
        const d = src[i];
        if (d === "\\") { i += 2; continue; }
        if (cls) { if (d === "]") cls = false; } else if (d === "[") cls = true; else if (d === "/") break;
        i++;
      }
      i++; while (i < n && /[A-Za-z]/.test(src[i])) i++;
      prev = "re"; continue;
    }
    if (c === "{") { depth++; i++; prev = "{"; continue; }
    if (c === "}") {
      if (tpl.length && depth === tpl[tpl.length - 1] + 1) { tpl.pop(); depth--; i++; prev = templateBody() ? "tpl" : "{"; continue; }
      depth--; i++; prev = "}"; continue;
    }
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (/[A-Za-z_$]/.test(c)) { const s = i; while (i < n && /[\w$]/.test(src[i])) i++; prev = "id:" + src.slice(s, i); continue; }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) { while (i < n && /[\w.]/.test(src[i])) i++; prev = "num"; continue; }
    prev = c; i++;
  }
}
// Removes the comments: a comment alone on its line takes the line with it; a trailing
// one takes the spaces before it; an inline block comment leaves one space.
function stripJsComments(src) {
  // The data placeholders (/*__CPI_DATA__*/ and the rest) are comments too, and stay.
  const ranges = []; scanJs(src, (s, e) => { if (!/^\/\*__[A-Z_]+__\*\/$/.test(src.slice(s, e))) ranges.push([s, e]); });
  let outText = "", pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue;
    const lineStart = src.lastIndexOf("\n", s - 1) + 1;
    let nl = src.indexOf("\n", e); if (nl < 0) nl = src.length;
    if (lineStart >= pos && /^[ \t]*$/.test(src.slice(lineStart, s)) && /^[ \t]*$/.test(src.slice(e, nl))) {
      outText += src.slice(pos, lineStart); pos = Math.min(src.length, nl + 1);
    } else {
      let cut = s; while (cut > pos && (src[cut - 1] === " " || src[cut - 1] === "\t")) cut--;
      outText += src.slice(pos, cut);
      if (!/^[ \t]*$/.test(src.slice(e, nl)) && cut > lineStart) outText += " ";
      pos = e;
    }
  }
  return outText + src.slice(pos);
}
// Every character outside comments and whitespace, in order: stripping may remove
// comments and the blanks around them, nothing else.
function codeChars(src) {
  const ranges = []; scanJs(src, (s, e) => ranges.push([s, e]));
  let t = "", pos = 0;
  for (const [s, e] of ranges) { t += src.slice(pos, s); pos = e; }
  return (t + src.slice(pos)).replace(/\s+/g, "");
}
function stripCssComments(css) {
  return css.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n/gm, "").replace(/[ \t]*\/\*[\s\S]*?\*\//g, "");
}

// ---------------- page ----------------
const files = [
  ["/*__CPI_DATA__*/ null", "bls_cpi_processed3.json"], ["/*__WEIGHTS_DATA__*/ null", "bls_weights.json"],
  ["/*__PCE_DATA__*/ null", "pce_processed.json"], ["/*__LABOR_DATA__*/ null", "labor_processed.json"],
  ["/*__LABOR_STATIC__*/ null", "labor_static.json"], ["/*__GDP_DATA__*/ null", "gdp_processed.json"],
  ["/*__PCE_WEIGHTS__*/ null", "pce_weights.json"], ["/*__UMICH_DATA__*/ null", "umich_processed.json"],
  ["/*__PPI_DATA__*/ null", "ppi_processed.json"], ["/*__PPI_WEIGHTS__*/ null", "ppi_weights.json"],
  ["/*__RETAIL_DATA__*/ null", "retail_processed.json"], ["/*__FINCOND_DATA__*/ null", "fincond_processed.json"],
  ["/*__SUPPLY_DATA__*/ null", "supply_processed.json"], ["/*__FISCAL_DATA__*/ null", "fiscal_processed.json"],
  ["/*__CALENDAR__*/ null", "calendar.json"], ["/*__SPR_DATA__*/ null", "spr_processed.json"],
  ["/*__CAPE_DATA__*/ null", "cape_processed.json"], ["/*__PRODUCTIVITY_DATA__*/ null", "productivity_processed.json"],
  ["/*__PROFITS_DATA__*/ null", "profits_processed.json"], ["/*__DEBT_DATA__*/ null", "debt_processed.json"],
  ["/*__HHDEBT_DATA__*/ null", "hhdebt_processed.json"], ["/*__BANKS_DATA__*/ null", "banks_processed.json"],
  ["/*__NONBANK_DATA__*/ null", "nonbank_processed.json"], ["/*__TRADE_DATA__*/ null", "trade_processed.json"],
  ["/*__IIP_DATA__*/ null", "iip_processed.json"],
];
let page = template;
if (!plain) {
  const js = scriptOf(page), stripped = stripJsComments(js);
  let ok = true;
  try { new vm.Script(stripped); } catch (e) { ok = false; console.log("  comment stripping skipped: the stripped script does not parse (" + e.message + ")"); }
  if (ok && codeChars(stripped) !== codeChars(js)) { ok = false; console.log("  comment stripping skipped: it would change code"); }
  if (ok) page = page.replace(js, () => stripped);
  page = page.replace(/<style>([\s\S]*?)<\/style>/, (m, css) => "<style>" + stripCssComments(css) + "</style>");
}
const stamp = JSON.stringify(today);
const reps = files.map(([k, f]) => [k, embed(f, k)]).concat([
  ["/*__REFRESHED_AT__*/ null", stamp], ["/*__PCE_REFRESHED_AT__*/ null", stamp],
  ["/*__UMICH_REFRESHED_AT__*/ null", stamp], ["/*__LIVE_DATA__*/ false", "false"],
]);
for (const [k, v] of reps) { if (!page.includes(k)) fail("placeholder " + k + " not found"); page = page.split(k).join(v); }
if (/__(CPI_DATA|WEIGHTS_DATA|REFRESHED_AT|PCE_DATA|PCE_WEIGHTS|PCE_REFRESHED_AT|UMICH_DATA|UMICH_REFRESHED_AT|PPI_DATA|PPI_WEIGHTS|RETAIL_DATA|FINCOND_DATA|SUPPLY_DATA|FISCAL_DATA|CALENDAR|LIVE_DATA|LABOR_DATA|LABOR_STATIC|GDP_DATA|SPR_DATA|CAPE_DATA|PRODUCTIVITY_DATA|PROFITS_DATA|DEBT_DATA|HHDEBT_DATA|BANKS_DATA|NONBANK_DATA|TRADE_DATA|IIP_DATA)__/.test(page)) fail("a placeholder was left unsubstituted");
const cut = page.indexOf('<div class="mobilebar"');
if (cut < 0) fail("could not find the page body to wrap");
page = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
       page.substring(0, cut) + "</head>\n<body>\n" + page.substring(cut) + "\n</body>\n</html>\n";
try { new vm.Script(scriptOf(page)); } catch (e) { fail("the built page script does not parse: " + e.message); }
writeFileSync(out, page);
const kb = b => (b / 1024).toFixed(0) + " KB";
if (!plain) console.log(`data packing   : ${kb(rawBytes)} -> ${kb(packedBytes)}`);
console.log(`site build     : ${Buffer.byteLength(page).toLocaleString("en-US")} bytes -> ${out}`);
