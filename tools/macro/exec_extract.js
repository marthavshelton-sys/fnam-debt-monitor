// Runs the built dashboard page's script under Node with a throwaway DOM, so
// the "At a glance" summaries the page computes for every section can be read
// out as text (English) and reused in the alert emails. The page's own code is
// the single source of the wording; nothing here duplicates it.
//
//   node exec_extract.js <site/macro/index.html> [lang]   -> JSON on stdout
//
// The DOM stand-in is one Proxy that answers every property with itself and
// every call with itself: element creation, setAttribute, appendChild and the
// rest become no-ops, numbers coerce to 0 and strings to "", and the render
// functions run through to renderExecSummaries(), which hands each card's four
// lines to __execSummaries.
"use strict";
const fs = require("fs");
const vm = require("vm");

const file = process.argv[2];
const lang = process.argv[3] || "en";
const html = fs.readFileSync(file, "utf8");
const scripts = [];
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html))) scripts.push(m[1]);
if (!scripts.length) { console.error("no inline script found"); process.exit(2); }

const dummy = new Proxy(function () {}, {
  get(t, p) {
    if (p === Symbol.toPrimitive) return () => "";
    if (p === Symbol.iterator) return function* () {};
    if (p === "toString" || p === "valueOf") return () => "";
    if (p === "length") return 0;
    if (p === "then") return undefined;
    return dummy;
  },
  set() { return true; },
  has() { return false; },
  apply() { return dummy; },
  construct() { return dummy; }
});

const summaries = [];
const sandbox = {
  console: { log() {}, warn() {}, error() {}, info() {} },
  __execSummaries: summaries,
  document: dummy,
  history: dummy,
  navigator: { language: lang === "es" ? "es-MX" : "en-US", userAgent: "node" },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} },
  location: { href: "https://fnam.mx/macro/?lang=" + lang, search: "?lang=" + lang, pathname: "/macro/", hash: "", origin: "https://fnam.mx" },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  fetch: () => new Promise(() => {}),
  URL, URLSearchParams, Intl, Date, Math, JSON, Number, String, Array, Object, RegExp, Map, Set, Promise, Symbol, Error, TypeError, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
let failure = null;
try {
  for (const code of scripts) vm.runInContext(code, sandbox, { timeout: 120000 });
} catch (e) {
  failure = (e && e.stack) || String(e);
}
const out = {};
summaries.forEach(s => { out[s.id.replace(/^exec-/, "")] = { latest: s.latest, drivers: s.drivers, why: s.why, watch: s.watch }; });
process.stdout.write(JSON.stringify({ lang, sections: out, error: failure }, null, 1));
process.exit(Object.keys(out).length ? 0 : 3);
