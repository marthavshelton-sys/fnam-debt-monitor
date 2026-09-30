#!/usr/bin/env node
// Diagnostics for the airline dashboard's sources: opens each URL in a real browser on the runner (headed Chrome under xvfb
// first, as the airline sites reject headless ones) and prints what came back: final URL, title, headings, a text sample,
// links matching --links=<regex>, and every JSON/XHR response the page loaded (URL, status, size, top-level keys, a sample).
// Nothing is written or committed. Run by aerolineas-refresh.yml when its `probe` input is set.
//
//   node scripts/aeropuertos/probe-pages.mjs [--links=<regex>] [--grep=<regex>] [--wait=<ms>] [--full=<url-part>] <url> [<url> ...]
//     --grep   print page-text lines and JSON snippets matching the regex
//     --full   print the whole body of responses whose URL contains this string (first 20,000 chars)
//     --forms  list every form control (tag, type, name, id, value, label; selects with their options)
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const urls = args.filter((a) => !a.startsWith('--'));
const linkRe = opt('links') ? new RegExp(opt('links'), 'i') : null;
const grepRe = opt('grep') ? new RegExp(opt('grep'), 'i') : null;
const full = opt('full', '');
const wait = +opt('wait', 9000);
const forms = args.includes('--forms');
if (!urls.length) { console.log('usage: probe-pages.mjs [--links=re] [--grep=re] [--wait=ms] [--full=url-part] <url>...'); process.exit(0); }

const { chromium } = await import('playwright');
async function launch() {
  const variants = [];
  if (process.env.HEADED) variants.push({ channel: 'chrome', headless: false }, { channel: 'chromium', headless: false });
  variants.push({ channel: 'chrome', headless: true }, { channel: 'chromium', headless: true }, { headless: true });
  for (const o of variants) { try { return { browser: await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'], ...o }), label: (o.channel || 'headless-shell') + (o.headless ? '' : ' (headed)') }; } catch (e) { console.log('launch failed', o, e.message.split('\n')[0]); } }
  throw new Error('no browser could be launched');
}
const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
const { browser, label } = await launch();
console.log(`browser: ${label}\n`);
try {
  for (const url of urls) {
    const ctx = await browser.newContext({ locale: 'es-MX', viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    const seen = [];
    page.on('response', async (r) => {
      try {
        const ct = (r.headers()['content-type'] || '').toLowerCase(); const rt = r.request().resourceType();
        if (!/json/.test(ct) && !(rt === 'xhr' || rt === 'fetch')) return;
        const body = await r.text().catch(() => ''); seen.push({ url: r.url(), status: r.status(), ct, rt, body });
      } catch { /* response gone */ }
    });
    console.log('='.repeat(100) + `\n${url}`);
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(wait);
      const info = await page.evaluate(() => ({
        final: location.href, title: document.title,
        h: [...document.querySelectorAll('h1,h2')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 12),
        text: document.body ? document.body.innerText : '',
        links: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, text: a.textContent.trim().replace(/\s+/g, ' ') })),
      }));
      console.log(`status ${resp ? resp.status() : '-'} · final ${info.final}\ntitle: ${info.title}\nheadings: ${info.h.join(' | ')}`);
      console.log(`text (${info.text.length} chars): ${clip(info.text.replace(/\s+/g, ' '), 1200)}`);
      if (grepRe) { const lines = info.text.split('\n').map((l) => l.trim()).filter((l) => l && grepRe.test(l)); console.log(`---- text lines matching ${grepRe} (${lines.length}) ----`); lines.slice(0, 80).forEach((l) => console.log('  ' + clip(l, 220))); }
      if (forms) {
        const ctl = await page.evaluate(() => [...document.querySelectorAll('input,select,textarea,button')].map((e) => {
          const lab = (e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)) || e.closest('label');
          const o = { tag: e.tagName.toLowerCase(), type: e.type || '', name: e.name || '', id: e.id || '', value: (e.value || '').slice(0, 60), checked: !!e.checked, label: lab ? lab.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : '' };
          if (e.tagName === 'SELECT') o.options = [...e.options].map((x) => x.value + '=' + x.textContent.trim()).slice(0, 40).join(' | ');
          return o; }));
        console.log(`---- form controls (${ctl.length}) ----`); ctl.slice(0, 400).forEach((c) => console.log('  ' + JSON.stringify(c)));
      }
      console.log(`links: ${info.links.length}`);
      if (linkRe) { const m = info.links.filter((l) => linkRe.test(l.href) || linkRe.test(l.text)); console.log(`---- links matching ${linkRe} (${m.length}) ----`); m.slice(0, 150).forEach((l) => console.log(`  ${clip(l.text, 80)} -> ${l.href}`)); }
    } catch (e) { console.log('error: ' + e.message.split('\n')[0]); }
    console.log(`---- JSON / XHR responses (${seen.length}) ----`);
    for (const s of seen) {
      let keys = ''; try { const j = JSON.parse(s.body); keys = Array.isArray(j) ? `array[${j.length}]` + (j[0] && typeof j[0] === 'object' ? ' of {' + Object.keys(j[0]).slice(0, 15).join(',') + '}' : '') : '{' + Object.keys(j).slice(0, 20).join(',') + '}'; } catch { keys = '(not JSON)'; }
      console.log(`  [${s.status}] ${s.rt} ${clip(s.url, 200)} · ${s.body.length} B · ${keys}`);
      if (full && s.url.includes(full)) console.log(clip(s.body, 20000));
      else if (grepRe && grepRe.test(s.body)) { const i = s.body.search(grepRe); console.log('      … ' + clip(s.body.slice(Math.max(0, i - 150), i + 350).replace(/\s+/g, ' '), 520)); }
    }
    await ctx.close();
  }
} finally { await browser.close(); }
