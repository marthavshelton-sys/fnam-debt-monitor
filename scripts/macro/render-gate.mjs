// Render gate for the U.S. macro page (22-Oct-2026): the refresh workflow runs it on the page it just built, before the
// commit step. The page is served from the checkout and opened in headless Chromium in both languages; a script error, a
// section that did not render (window.FNAM_RENDER_ERRORS, written by the page's renderAll) or an "At a glance" card left
// empty fails the gate, the run stops before committing, and the previously committed page stays on the site. The live
// check (tools/macro/live-check.mjs) remains the full audit after the deploy; this is the short one that keeps a broken
// build from reaching main at all (21-Oct-2026: an empty data file made renderFinCond throw and the page shipped).
//
//   node scripts/macro/render-gate.mjs [--page site/macro/index.html] [--port 8123]
// Exit 0: both languages rendered; 1: problems (listed); 2: the gate itself could not run.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt; };
const pageFile = resolve(opt('--page', 'site/macro/index.html'));
const siteRoot = resolve(opt('--root', 'site'));
const port = Number(opt('--port', '8123'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

async function loadPlaywright() {
  for (const spec of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try { return await import(spec); } catch { /* next */ }
  }
  throw new Error('playwright is not installed (npm i playwright && npx playwright install chromium)');
}

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});

const problems = [];
let browser;
try {
  if (!existsSync(pageFile)) throw new Error(`${pageFile} does not exist`);
  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch();
  const rel = pageFile.replace(siteRoot, '').replace(/\\/g, '/').replace(/index\.html$/, '');
  for (const lang of ['es', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`script error: ${String(e.message).split('\n')[0]}`));
    await page.route('**/*', (r) => (r.request().url().startsWith(`http://127.0.0.1:${port}`) ? r.continue() : r.abort()));
    await page.goto(`http://127.0.0.1:${port}${rel}?lang=${lang}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(800);
    const state = await page.evaluate(() => ({
      renderErrors: (window.FNAM_RENDER_ERRORS || []).map((e) => `section "${e.view}" did not render (${e.renderer}: ${e.message})`),
      views: document.querySelectorAll('.view[id^="view-"]').length,
      charts: document.querySelectorAll('svg[role="img"]').length,
      emptyGlance: [...document.querySelectorAll('.view .glance, .view .at-a-glance')].filter((g) => g.textContent.replace(/\s+/g, ' ').trim().length < 60).length,
      broken: [...document.querySelectorAll('.view')].filter((v) => /\bundefined\b|\bNaN\b|\[object /.test(v.textContent)).map((v) => v.id),
    }));
    for (const e of [...new Set([...state.renderErrors, ...errors])]) problems.push(`${lang}: ${e}`);
    if (state.charts < 50) problems.push(`${lang}: only ${state.charts} labelled charts rendered (expected well over 50)`);
    if (state.broken.length) problems.push(`${lang}: "undefined"/"NaN" shown in ${state.broken.join(', ')}`);
    console.log(`${lang}: ${state.views} sections, ${state.charts} charts, ${state.renderErrors.length + errors.length} error(s)`);
    await page.close();
  }
} catch (e) {
  console.error(`render gate could not run: ${e.message}`);
  process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  server.close();
}
if (process.exitCode === 2) process.exit(2);
if (problems.length) {
  console.error(`RENDER GATE FAILED (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('render gate passed');
