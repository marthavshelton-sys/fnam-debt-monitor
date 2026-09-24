// One-off source probe for the airports traffic hub (AFAC workbook, AICM PDFs, AIFA counters), run on a GitHub runner
// with headless Chromium (Playwright). Writes tools/aeropuertos/probe/result.json plus text snapshots.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'tools/aeropuertos/probe'; fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const res = { at: new Date().toISOString(), steps: [] };
const log = (o) => { console.log(JSON.stringify(o).slice(0, 400)); res.steps.push(o); };
async function plain(name, url, accept = 'text/html') {
  try { const r = await fetch(url, { headers: { 'user-agent': UA, accept, 'accept-language': 'es-MX,es;q=0.9,en;q=0.8' }, redirect: 'follow' }); const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(`${OUT}/${name}.bin`, buf.subarray(0, 300000)); log({ step: 'plain', name, url, status: r.status, type: r.headers.get('content-type'), bytes: buf.length, head: buf.subarray(0, 200).toString('utf8').replace(/\s+/g, ' ') }); return buf; }
  catch (e) { log({ step: 'plain', name, url, error: String(e).slice(0, 200) }); return null; }
}
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ userAgent: UA, locale: 'es-MX', viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
async function visit(name, url, waitMs = 4000) {
  try { const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(waitMs); const html = await page.content(); const text = await page.evaluate(() => document.body ? document.body.innerText : ''); fs.writeFileSync(`${OUT}/${name}.html`, html.slice(0, 400000)); fs.writeFileSync(`${OUT}/${name}.txt`, text.slice(0, 60000)); log({ step: 'visit', name, url, status: r && r.status(), title: await page.title(), textChars: text.length, challenge: /challenge|verif|captcha|Just a moment|Un momento/i.test(html.slice(0, 5000)) }); return { html, text }; }
  catch (e) { log({ step: 'visit', name, url, error: String(e).slice(0, 300) }); return null; }
}
// 1. AFAC statistics page: let the proof-of-work challenge run and reload, then read the workbook link
const AFAC = 'https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404';
await plain('afac-plain', AFAC);
let v = null;
try {
  await page.goto(AFAC, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const t0 = Date.now();
  await page.waitForFunction(() => document.title && !/Challenge Validation/i.test(document.title), null, { timeout: 120000 }).catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);
  const html = await page.content(); const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  fs.writeFileSync(`${OUT}/afac.html`, html.slice(0, 400000)); fs.writeFileSync(`${OUT}/afac.txt`, text.slice(0, 60000));
  v = { html, text }; log({ step: 'visit', name: 'afac', url: AFAC, title: await page.title(), textChars: text.length, challenge: /Challenge Validation/i.test(html.slice(0, 3000)), waitedMs: Date.now() - t0, cookies: (await ctx.cookies()).map((c) => c.name) });
} catch (e) { log({ step: 'visit', name: 'afac', error: String(e).slice(0, 300) }); }
if (v && !/Challenge Validation/i.test(v.html.slice(0, 3000))) {
  const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href).filter((h) => /producto-aeropuerto|\.xlsx?$/i.test(h)));
  log({ step: 'afac-links', links: links.slice(0, 10) });
  const link = links.find((h) => /producto-aeropuerto/.test(h)) || links[0];
  if (link) {
    try { const r = await page.evaluate(async (u) => { const r = await fetch(u, { credentials: 'include' }); const b = await r.arrayBuffer(); return { status: r.status, type: r.headers.get('content-type'), lastModified: r.headers.get('last-modified'), bytes: b.byteLength, head: Array.from(new Uint8Array(b.slice(0, 4))) }; }, link); log({ step: 'afac-xlsx-in-browser', link, ...r }); } catch (e) { log({ step: 'afac-xlsx-in-browser', link, error: String(e).slice(0, 300) }); }
    // same download through the context's request API (shares cookies) - what the refresh script would use
    try { const r = await ctx.request.get(link, { timeout: 120000 }); const b = await r.body(); log({ step: 'afac-xlsx-ctx', status: r.status(), type: r.headers()['content-type'], lastModified: r.headers()['last-modified'], bytes: b.length, head: Array.from(b.subarray(0, 4)) }); } catch (e) { log({ step: 'afac-xlsx-ctx', error: String(e).slice(0, 300) }); }
  }
}
// 1b. datos.gob.mx open-data portal (CKAN API): is the same statistic published there without a challenge?
for (const [name, url] of [['ckan-search', 'https://datos.gob.mx/busca/api/3/action/package_search?q=estadistica+operativa+aeropuertos&rows=5'], ['ckan-afac', 'https://datos.gob.mx/busca/api/3/action/package_search?fq=organization:afac&rows=20']]) await plain(name, url, 'application/json');
// 2. AICM statistics listing and the newest monthly PDF
const AICM = 'https://www.aicm.com.mx/categoria/estadisticas';
await plain('aicm-plain', AICM);
const a = await visit('aicm', AICM);
if (a) {
  const pdfs = await page.$$eval('a[href]', (as) => as.map((x) => ({ href: x.href, text: (x.innerText || '').trim().slice(0, 80) })).filter((x) => /\.pdf/i.test(x.href)));
  log({ step: 'aicm-pdfs', n: pdfs.length, first: pdfs.slice(0, 12) });
  if (pdfs[0]) { const h = await fetch(pdfs[0].href, { method: 'HEAD', headers: { 'user-agent': UA } }).catch(() => null); log({ step: 'aicm-pdf-head', status: h && h.status, lastModified: h && h.headers.get('last-modified'), length: h && h.headers.get('content-length') }); }
}
// 3. AIFA home page counters
const AIFA = 'https://www.aifa.aero/';
const fbuf = await plain('aifa-plain', AIFA);
if (fbuf) { const h = fbuf.toString('utf8'); const i = h.indexOf('counters-white'); fs.writeFileSync(`${OUT}/aifa-counters.html`, h.slice(Math.max(0, i - 500), i + 6000)); log({ step: 'aifa-counters-html', found: i >= 0 }); }
await browser.close();
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1));
console.log('done');
