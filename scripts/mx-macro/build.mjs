// Bakes tools/mx-macro/data/series.json into tools/mx-macro/template.html and writes the page.
//
//   node scripts/mx-macro/build.mjs                       -> site/mx/macro/index.html
//   node scripts/mx-macro/build.mjs --out /tmp/x.html     -> anywhere else (previews)
//   node scripts/mx-macro/build.mjs --data path.json      -> build from another data file (fixtures)
//
// Refuses to build if the es/en dictionaries don't expose the same keys, or if the code
// references a T.<key> that neither defines, so a half-translated page can't ship. Skips the
// write when neither the template nor the data changed, so the scheduled job doesn't commit a
// page just to move the "refreshed" date.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('../../', import.meta.url);
const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const TEMPLATE = new URL('tools/mx-macro/template.html', ROOT);
const DATA = arg('--data', new URL('tools/mx-macro/data/series.json', ROOT).pathname);
const OUT = arg('--out', new URL('site/mx/macro/index.html', ROOT).pathname);
const HASH_FILE = new URL('tools/mx-macro/data/.pagehash', ROOT).pathname;
const force = argv.includes('--force');

let template = (await readFile(TEMPLATE, 'utf8')).replace(/\r\n/g, '\n');
if (!existsSync(DATA)) { console.error(`No data file at ${DATA}. Run scripts/mx-macro/fetch.mjs first.`); process.exit(1); }
const dataJson = await readFile(DATA, 'utf8');
const data = JSON.parse(dataJson);

// ---- locale parity ----
const esBlock = template.match(/\n  es: \{([\s\S]*?)\n  \},\n\n  en: \{/)?.[1];
const enBlock = template.match(/\n  en: \{([\s\S]*?)\n  \}\n\};/)?.[1];
if (!esBlock || !enBlock) throw new Error('Could not locate both locale blocks in the template.');
const topKeys = (block) => [...block.replace(/names: \{[\s\S]*?\n    \}/, '').replace(/origins: \{[^\n]*\}/, 'origins: 0').matchAll(/^    ([A-Za-z][A-Za-z0-9]*)\s*:/gm)].map((m) => m[1]).sort();
const nameKeys = (block) => [...(block.match(/names: \{([\s\S]*?)\n    \}/)?.[1] || '').matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]).sort();
const diff = (a, b) => a.filter((k) => !b.includes(k));
const es = topKeys(esBlock), en = topKeys(enBlock), esN = nameKeys(esBlock), enN = nameKeys(enBlock);
const problems = [];
for (const [label, list] of [['missing in en', diff(es, en)], ['missing in es', diff(en, es)], ['names missing in en', diff(esN, enN)], ['names missing in es', diff(enN, esN)]]) if (list.length) problems.push(`  ${label}: ${list.join(', ')}`);
if (problems.length) { console.error(problems.join('\n')); throw new Error('Locale parity check failed - refusing to build a half-translated page.'); }
console.log(`locale parity  : OK (${es.length} strings + ${esN.length} names, both locales)`);

// ---- every T.<key> the code uses must exist ----
const defined = new Set(es.concat(['names', 'months', 'htmlLang', 'dateLocale', 'origins']));
const code = template.replace(/const I18N = \{[\s\S]*?\n\};/, '');
const used = [...new Set([...code.matchAll(/\bT\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1]))];
const undef = used.filter((k) => !defined.has(k));
if (undef.length) { console.error(undef.map((k) => `  undefined reference : T.${k}`).join('\n')); throw new Error("Unresolved string reference - the page would render 'undefined'."); }
console.log(`string refs    : OK (${used.length} references all resolve)`);

// ---- every data-i18n attribute must point at a string ----
const attrs = [...new Set([...template.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]))];
const badAttr = attrs.filter((k) => !defined.has(k));
if (badAttr.length) throw new Error(`data-i18n keys without a string: ${badAttr.join(', ')}`);

// ---- series coverage report ----
const manifest = JSON.parse(await readFile(new URL('tools/mx-macro/series.json', ROOT), 'utf8'));
const have = Object.keys(data.series || {}).filter((k) => data.series[k]?.points?.length);
const missing = Object.keys(manifest.series).filter((k) => !have.includes(k));
console.log(`series         : ${have.length}/${Object.keys(manifest.series).length} present${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`);

// ---- skip when nothing changed ----
const payload = template + dataJson.replace(/"fetchedAt":"\d{4}-\d{2}-\d{2}"/g, '').replace(/"generatedAt":"[^"]*"/, '');
const hash = createHash('sha256').update(payload).digest('hex');
if (!force && existsSync(HASH_FILE) && existsSync(OUT) && (await readFile(HASH_FILE, 'utf8')).trim() === hash) {
  console.log('site build     : data unchanged since last build; page not rewritten');
  process.exit(0);
}

const refreshedAt = JSON.stringify((data.generatedAt || new Date().toISOString()).slice(0, 10));
let page = template.replace('/*__MX_DATA__*/ null', dataJson.trim()).replace('/*__REFRESHED_AT__*/ null', refreshedAt);
if (/\/\*__[A-Z_]+__\*\//.test(page)) throw new Error('A placeholder was left unsubstituted.');
const cut = page.indexOf('<div class="mobilebar"');
if (cut < 0) throw new Error('could not find the page body to wrap');
page = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<meta name="description" content="Panel macro de México: inflación INPC, PIB e IGAE, empleo, confianza del consumidor, remesas, comercio exterior, tipo de cambio y tasas de Banxico. Mexico macro dashboard, bilingual.">\n' +
  '<link rel="canonical" href="https://fnam.mx/mx/macro/">\n<link rel="alternate" hreflang="es-MX" href="https://fnam.mx/mx/macro/">\n<link rel="alternate" hreflang="en" href="https://fnam.mx/mx/macro/?lang=en">\n' +
  page.slice(0, cut) + '</head>\n<body>\n' + page.slice(cut) + '\n</body>\n</html>\n';
await mkdir(new URL('./', 'file://' + OUT), { recursive: true });
await writeFile(OUT, page, 'utf8');
if (OUT === new URL('site/mx/macro/index.html', ROOT).pathname) await writeFile(HASH_FILE, hash + '\n', 'utf8');
console.log(`site build     : ${page.length.toLocaleString('en-US')} bytes -> ${OUT}`);
