#!/usr/bin/env node
// Public-copy audit: renders every page of site/ in Playwright Chromium (both languages, after JavaScript) and lists any
// repository path, workflow name, script name, GitHub link or the owner's email left in the reader-facing markup, plus any
// script error. Run with the site served locally:  python3 -m http.server 8123 --directory site  →  node tools/audit-public-copy.mjs
// Exit 1 when something is flagged. HTML comments, <script> and <style> bodies are ignored (they are not copy); the data files'
// own header comments are not covered either.
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const BASE = process.argv[2] || 'http://localhost:8123';
const pages = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== 'vendor') walk(p); } else if (f.endsWith('.html')) pages.push('/' + relative(ROOT, p).replace(/\\/g, '/')); } })(ROOT);
pages.sort();
const PAT = String.raw`(scripts\/[a-z-]+|\.github\/workflows|(?<![a-z])tools\/[a-z-]+\/|README\.md|[a-z-]+\.yml\b|github\.com\/marthavshelton|marthavshelton|validate[-_]data|build-log\.json|\b[a-z_-]+\.(mjs|ps1)\b|\b[a-z_-]+\.py\b)`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route((u) => !['localhost', '127.0.0.1'].includes(u.hostname), (r) => r.abort());
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message.split('\n')[0]}`));
const findings = {};
for (const p of pages) for (const lang of ['es', 'en']) {
  const url = `${BASE}${p}?lang=${lang}`;
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(700); }
  catch (e) { findings[p + '?lang=' + lang] = ['LOAD ERROR ' + e.message.split('\n')[0]]; continue; }
  const hits = await page.evaluate((src) => {
    const re = new RegExp(src, 'gi');
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,template').forEach((n) => n.remove());
    const html = clone.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
    const out = new Set(); let m;
    while ((m = re.exec(html))) { const i = Math.max(0, m.index - 70); out.add(html.slice(i, m.index + m[0].length + 70).replace(/\s+/g, ' ')); }
    return [...out];
  }, PAT);
  if (hits.length) findings[p + '?lang=' + lang] = hits;
}
await browser.close();
for (const [k, v] of Object.entries(findings)) { console.log('\n## ' + k); for (const h of v) console.log('  - ' + h); }
if (errors.length) { console.log('\n## script errors'); for (const e of errors) console.log('  - ' + e); }
console.log(`\npages: ${pages.length} × 2 languages; flagged: ${Object.keys(findings).length}; script errors: ${errors.length}`);
process.exit(Object.keys(findings).length || errors.length ? 1 : 0);
