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
// 1. AFAC statistics page (plain + browser) and the workbook link
const AFAC = 'https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404';
await plain('afac-plain', AFAC);
const v = await visit('afac', AFAC, 6000);
if (v) {
  const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href).filter((h) => /producto-aeropuerto|\.xlsx?$/i.test(h)));
  log({ step: 'afac-links', links: links.slice(0, 10) });
  const link = links.find((h) => /producto-aeropuerto/.test(h)) || links[0];
  if (link) {
    // download inside the browser session (cookies from the challenge, if any)
    try { const r = await page.evaluate(async (u) => { const r = await fetch(u, { credentials: 'include' }); const b = await r.arrayBuffer(); return { status: r.status, type: r.headers.get('content-type'), bytes: b.byteLength, head: Array.from(new Uint8Array(b.slice(0, 4))) }; }, link); log({ step: 'afac-xlsx-in-browser', link, ...r }); } catch (e) { log({ step: 'afac-xlsx-in-browser', link, error: String(e).slice(0, 300) }); }
    await plain('afac-xlsx-plain', link, '*/*');
  }
}
// 2. AICM statistics listing and the newest monthly PDF
const AICM = 'https://www.aicm.com.mx/categoria/estadisticas';
await plain('aicm-plain', AICM);
const a = await visit('aicm', AICM);
if (a) {
  const pdfs = await page.$$eval('a[href]', (as) => as.map((x) => ({ href: x.href, text: (x.innerText || '').trim().slice(0, 80) })).filter((x) => /\.pdf/i.test(x.href)));
  log({ step: 'aicm-pdfs', n: pdfs.length, first: pdfs.slice(0, 12) });
  if (pdfs[0]) await plain('aicm-pdf-plain', pdfs[0].href, '*/*');
}
// 3. AIFA home page counters
const AIFA = 'https://www.aifa.aero/';
await plain('aifa-plain', AIFA);
const f = await visit('aifa', AIFA, 6000);
if (f) { const m = f.text.match(/[\s\S]{0,300}(pasajeros|operaciones|toneladas)[\s\S]{0,300}/gi) || []; log({ step: 'aifa-counters', snippets: m.slice(0, 4).map((s) => s.replace(/\s+/g, ' ')) }); }
await browser.close();
fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1));
console.log('done');
