// Harvests Grupo Aeroportuario del Centro Norte's (OMA) public releases for the OMA model.
//
// OMA publishes everything as PDFs. Three sources are combined (any PDF is fetched once, keyed by file name):
//   A. ir.oma.aero (investor-relations site; WordPress/TablePress listings /en/earnings-reports/,
//      /en/traffic-reports/, /en/news-releases/). It answers 403 to bot user agents and sometimes serves a
//      JavaScript captcha to data-centre IPs, so a browser UA, retries and *seed listings* are used: any
//      tools/oma/raw/listings/seed_*.html file (a listing saved by hand) is parsed exactly like a live page.
//   B. miranda-newswire.com (OMA's wire since 2024; search pages ?s=OMA, each post links its PDF).
//   C. news.oma.aero (corporate newsroom; monthly traffic reports with a "Download PDF" asset).
// Every PDF is converted with pdf2text.py to tools/oma/raw/releases/<date>_oma<slug>_en.txt (the PDF is not
// committed). Incremental via tools/oma/raw/manifest.json; --full redoes everything.
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchRaw, fetchText, htmlToText, decodeEntities, dateFromText, pdfToText, loadJson, saveJson, sleep, BROWSER_UA, BOT_UA } from '../airports/lib.mjs';

const RAW = new URL('../../tools/oma/raw/', import.meta.url);
const REL = new URL('releases/', RAW), PDF = new URL('pdf/', RAW), LIST = new URL('listings/', RAW);
const MANIFEST = new URL('manifest.json', RAW);
const FULL = process.argv.includes('--full');
const SINCE = '2016-01-01';
const OTHER_SINCE = '2024-01-01';
const IR = 'https://ir.oma.aero';
const IR_PAGES = [{ path: '/en/earnings-reports/', cls: 'results' }, { path: '/en/traffic-reports/', cls: 'traffic' }, { path: '/en/news-releases/', cls: 'other' }];
const MIRANDA = 'https://miranda-newswire.com';
const NEWSROOM = 'https://news.oma.aero';
const irOpt = { ua: BROWSER_UA, delayMs: 1500 };

const isCaptcha = (html) => /sgcaptcha|\/\.well-known\/sgcaptcha|captcha/i.test(html) && html.length < 2000;
async function irFetch(url) { // retries when the site serves its captcha interstitial
  for (let i = 1; i <= 3; i++) {
    const r = await fetchRaw(url, { ...irOpt, accept: 'text/html,application/pdf,*/*' });
    const head = r.buf.slice(0, 600).toString('utf8');
    if (!isCaptcha(head)) return r;
    console.warn(`${url}: captcha interstitial (attempt ${i})`); await sleep(20000 * i);
  }
  throw new Error(`${url}: captcha`);
}
function cellsOf(tr) {
  return [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => {
    const inner = m[1];
    const hrefs = [...inner.matchAll(/href="([^"]+)"/gi)].map((h) => decodeEntities(h[1]));
    return { text: htmlToText(inner).replace(/\n/g, ' ').replace(/\s+\|\s+/g, ' ').trim(), hrefs };
  });
}
function classifyTitle(title, url, fallback) {
  const t = (title + ' ' + (url.split('/').pop() || '')).toLowerCase();
  if (/operating and financial results|quarter.*results|results.*quarter|[1-4][qt]\d\d_?results|results_[1-4]q\d\d/.test(t)) return 'results';
  if (/passenger traffic|traffic[_ ]report|tr[aá]fico/.test(t)) return 'traffic';
  return fallback;
}
const slugOf = (url) => decodeURIComponent(url.split('/').pop() || '').replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const fileKey = (url) => decodeURIComponent(url.split('/').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function rowsFromListing(html, pg) {
  const out = [];
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = cellsOf(m[1]); if (cells.length < 2) continue;
    const pdfs = cells.flatMap((c) => c.hrefs).filter((h) => /\.pdf(\?|$)/i.test(h));
    if (!pdfs.length) continue;
    const date = cells.map((c) => dateFromText(c.text)).find(Boolean) || null;
    const title = (cells.find((c) => c.hrefs.length && c.text.length > 3) || cells[1] || cells[0]).text;
    const year = cells.map((c) => (c.text.match(/^(20\d\d)$/) || [])[1]).find(Boolean) || null;
    const quarter = cells.map((c) => (c.text.match(/^([1-4])[QT]\s?(\d\d|20\d\d)?$|^([1-4])(st|nd|rd|th)? quarter/i) || [])[0]).find(Boolean) || null;
    for (const href of pdfs) out.push({ url: href.startsWith('http') ? href : IR + href, date, title, year, quarter, cls: classifyTitle(title, href, pg.cls), via: pg.path });
  }
  return out;
}

async function main() {
  await mkdir(REL, { recursive: true }); await mkdir(PDF, { recursive: true }); await mkdir(LIST, { recursive: true });
  const manifest = FULL ? { filings: [] } : await loadJson(MANIFEST, { filings: [] });
  const known = new Set(manifest.filings.filter((f) => f.path || f.class === 'skip').map((f) => fileKey(f.url)));
  const filings = [...manifest.filings];
  const candidates = new Map(); // fileKey -> {url, date, title, cls, via}
  const add = (c) => { const k = fileKey(c.url); if (!k || known.has(k)) return; const prev = candidates.get(k); if (!prev || (!prev.date && c.date)) candidates.set(k, { ...(prev || {}), ...c, date: c.date || (prev && prev.date) || null }); };

  // ---- A. ir.oma.aero: seed listings + live pages
  for (const f of (await readdir(LIST)).filter((x) => /^seed_.*\.html$/.test(x))) {
    const html = await readFile(new URL(f, LIST), 'utf8');
    const pg = IR_PAGES.find((p) => f.includes(p.path.replace(/\W+/g, '_').replace(/^_|_$/g, ''))) || { path: f, cls: 'other' };
    const rows = rowsFromListing(html, { ...pg, path: `seed:${f}` }); rows.forEach(add);
    console.log(`seed ${f}: ${rows.length} PDF links`);
  }
  for (const pg of IR_PAGES) {
    try {
      const r = await irFetch(IR + pg.path); const html = r.buf.toString('utf8');
      await writeFile(new URL('live' + pg.path.replace(/\W+/g, '_').replace(/_$/, '') + '.html', LIST), html);
      const rows = rowsFromListing(html, pg); rows.forEach(add);
      console.log(`${pg.path}: ${rows.length} PDF links`);
    } catch (e) { console.warn(`${pg.path}: ${e.message}`); }
  }
  // ---- B. Miranda newswire search (recent releases; each post links its PDF)
  for (let page = 1; page <= 8; page++) {
    let html;
    try { html = await fetchText(`${MIRANDA}/${page > 1 ? `page/${page}/` : ''}?s=OMA`, { delayMs: 800 }); } catch (e) { console.warn(`miranda page ${page}: ${e.message}`); break; }
    const posts = [...new Set([...html.matchAll(/href="(https:\/\/miranda-newswire\.com\/oma[a-z0-9-]*\/)"/gi)].map((m) => m[1]))];
    if (!posts.length) break;
    let n = 0;
    for (const post of posts) {
      let ph; try { ph = await fetchText(post, { delayMs: 800 }); } catch (e) { continue; }
      const pdf = (ph.match(/href="(https:\/\/miranda-newswire\.com\/wp-content\/uploads\/[^"]+\.pdf)"/i) || [])[1];
      if (!pdf) continue;
      const title = decodeEntities((ph.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1].replace(/<[^>]+>/g, '')).trim();
      const date = dateFromText(htmlToText(ph).slice(0, 3000));
      if (!known.has(fileKey(pdf))) n++;
      add({ url: pdf, date, title, cls: classifyTitle(title, pdf, 'other'), via: 'miranda' });
    }
    console.log(`miranda page ${page}: ${posts.length} posts, ${n} new PDFs`);
    if (n === 0 && page >= 2 && !FULL) break;
  }
  // ---- C. news.oma.aero newsroom (monthly traffic PDFs)
  for (let page = 1; page <= 40; page++) {
    let html;
    try { html = await fetchText(`${NEWSROOM}/news/?page=${page}`, { delayMs: 800 }); } catch (e) { console.warn(`newsroom page ${page}: ${e.message}`); break; }
    const items = [...new Set([...html.matchAll(/href="(?:https?:)?\/\/news\.oma\.aero\/(news\/[a-z0-9-]+\.html)"/gi)].map((m) => `${NEWSROOM}/${m[1]}`))].filter((u) => /passenger-traffic|traffic|results|resultados/i.test(u));
    let n = 0;
    for (const u of items) {
      let ph; try { ph = await fetchText(u, { delayMs: 800 }); } catch (e) { continue; }
      const asset = (ph.match(/href="((?:https?:)?\/\/news\.oma\.aero\/assets\/[^"]+\?dl=1)"/i) || [])[1];
      if (!asset) continue;
      const title = decodeEntities((ph.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1].replace(/<[^>]+>/g, '')).trim();
      const date = dateFromText(htmlToText(ph).slice(0, 4000));
      const url = asset.startsWith('http') ? asset : 'https:' + asset;
      const key = url.match(/assets\/([a-z0-9-]+)-pdf/i) ? url.match(/assets\/([a-z0-9-]+)-pdf/i)[1] + '.pdf' : url;
      if (!known.has(fileKey(key))) n++;
      add({ url, keyOverride: key, date, title, cls: classifyTitle(title, key, 'other'), via: 'newsroom' });
    }
    console.log(`newsroom page ${page}: ${items.length} traffic/results items, ${n} new`);
    if (!items.length || (n === 0 && page >= 3 && !FULL)) break;
    if (!/page=${page + 1}/.test(html)) break;
  }

  // ---- download + convert
  let fetched = 0;
  for (const c of [...candidates.values()].sort((a, b) => (a.date || '').localeCompare(b.date || ''))) {
    let buf;
    try { buf = (/ir\.oma\.aero/.test(c.url) ? await irFetch(c.url) : await fetchRaw(c.url, { ua: /news\.oma\.aero/.test(c.url) ? BROWSER_UA : BOT_UA, delayMs: 800, accept: 'application/pdf,*/*' })).buf; }
    catch (e) { filings.push({ source: c.via, url: c.url, title: c.title, error: e.message }); console.error(`${c.title || c.url}: ${e.message}`); continue; }
    if (buf.slice(0, 4).toString() !== '%PDF') { // newsroom asset viewer: follow the download-file link
      const m = buf.toString('utf8').match(/href="(\/download-file\/[a-z0-9]+)"/i);
      if (m) { try { buf = (await fetchRaw(NEWSROOM + m[1], { ua: BROWSER_UA, delayMs: 800, accept: 'application/pdf,*/*' })).buf; } catch (e) { /* fall through */ } }
      if (buf.slice(0, 4).toString() !== '%PDF') { filings.push({ source: c.via, url: c.url, title: c.title, error: 'not a PDF' }); continue; }
    }
    const slug = slugOf(c.keyOverride || c.url);
    const pdfPath = fileURLToPath(new URL(`${slug}.pdf`, PDF));
    await writeFile(pdfPath, buf);
    const tmp = fileURLToPath(new URL(`${slug}.tmp.txt`, PDF));
    try { pdfToText(pdfPath, tmp); } catch (e) { filings.push({ source: c.via, url: c.url, title: c.title, error: 'pdf2text: ' + e.message }); console.error(`${slug}: pdf2text failed`); continue; }
    const body = await readFile(tmp, 'utf8');
    const upl = c.url.match(/uploads\/(20\d\d)\/(\d\d)\//);
    const date = c.date || dateFromText(body.slice(0, 2500)) || (upl ? `${upl[1]}-${upl[2]}-15` : '0000-00-00');
    let cls = c.cls; if (cls === 'other' && date < OTHER_SINCE) cls = 'skip'; if (date < SINCE) cls = 'skip';
    const entry = { source: c.via, id: slug, url: c.url, date, title: c.title, class: cls };
    if (cls !== 'skip') {
      const file = `${date}_oma${slug}_en.txt`;
      await writeFile(new URL(file, REL), `# source: ${c.url}\n# title: ${c.title}\n# date: ${date}\n# lang: en\n# class: ${cls}\n# via: ${c.via}\n\n${body}`);
      entry.path = `tools/oma/raw/releases/${file}`;
    }
    filings.push(entry); fetched++;
    console.log(`${date} ${cls.padEnd(7)} ${(c.title || '').slice(0, 70)} <- ${slug} (${c.via})`);
  }
  filings.sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id).localeCompare(String(b.id)));
  const kept = {};
  for (const f of filings) if (f.path) kept[f.class] = (kept[f.class] || 0) + 1;
  await saveJson(MANIFEST, { entity: 'Grupo Aeroportuario del Centro Norte, S.A.B. de C.V.', since: SINCE, otherSince: OTHER_SINCE, updatedAt: new Date().toISOString(), kept, filings });
  console.log(`Fetched ${fetched} new documents. Kept: ${JSON.stringify(kept)}`);
  if (!filings.some((f) => f.path)) { console.error('Nothing harvested'); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
