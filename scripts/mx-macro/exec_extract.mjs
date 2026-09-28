// Runs the built Mexico macro page's script under Node with a throwaway DOM, so the
// "En resumen / At a glance" lines the page composes for every view can be read out as
// text and reused in the alert emails. The page's own code is the single source of the
// wording; nothing here duplicates it. Same technique as tools/macro/exec_extract.js.
//
//   node scripts/mx-macro/exec_extract.mjs [page.html] [en|es]   -> JSON on stdout
//
// Exported as extractSummaries(html, lang) for scripts/mx-macro/alerts.mjs.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

export function extractSummaries(html, lang = 'en') {
  const scripts = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);
  if (!scripts.length) return { lang, sections: {}, error: 'no inline script found' };
  // One Proxy answers every property with itself and every call with itself: element
  // creation, attributes and appends become no-ops; numbers coerce to 0, strings to "".
  const dummy = new Proxy(function () {}, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => '';
      if (p === Symbol.iterator) return function* () {};
      if (p === 'toString' || p === 'valueOf') return () => '';
      if (p === 'length') return 0;
      if (p === 'then') return undefined;
      return dummy;
    },
    set() { return true; },
    has() { return false; },
    apply() { return dummy; },
    construct() { return dummy; },
  });
  const summaries = [];
  const sandbox = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    __execSummaries: summaries,
    document: dummy, history: dummy,
    navigator: { language: lang === 'es' ? 'es-MX' : 'en-US', userAgent: 'node' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    location: { href: 'https://fnam.mx/mx/macro/?lang=' + lang, search: '?lang=' + lang, pathname: '/mx/macro/', hash: '', origin: 'https://fnam.mx' },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, scrollTo() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    fetch: () => new Promise(() => {}),
    getComputedStyle: () => dummy, ResizeObserver: function () { return dummy; },
    URL, URLSearchParams, Intl, Date, Math, JSON, Number, String, Array, Object, RegExp, Map, Set, Promise, Symbol, Error, TypeError, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  let error = null;
  try { for (const code of scripts) vm.runInContext(code, sandbox, { timeout: 120000 }); } catch (e) { error = (e && e.stack) || String(e); }
  const sections = {};
  for (const s of summaries) if (s.lines.length) sections[s.id] = s.lines; // last render wins
  return { lang, sections, error };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] || new URL('../../site/mx/macro/index.html', import.meta.url).pathname;
  const out = extractSummaries(await readFile(file, 'utf8'), process.argv[3] || 'en');
  process.stdout.write(JSON.stringify(out, null, 1) + '\n');
  process.exit(Object.keys(out.sections).length ? 0 : 3);
}
