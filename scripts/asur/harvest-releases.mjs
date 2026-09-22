// Harvests Grupo Aeroportuario del Sureste's (ASUR) public releases for the ASUR model.
//
//   PR Newswire  — the wire ASUR distributes every release through: monthly passenger-traffic reports
//                  (tables by country and airport), the quarterly-results summary, shareholder-meeting
//                  resolutions and material events. Listed from the organisation page (100 per page).
//   asur.com.mx  — the full quarterly earnings release (PDF, 28 pages: consolidated statements, traffic
//                  by airport, debt tables) and the earnings-call transcripts, from the "Financial
//                  Information" page. PDFs are converted to pipe-delimited text with pdf2text.py; the PDF
//                  itself is not committed (tools/asur/raw/pdf is ignored), the text is.
//
// Output: tools/asur/raw/releases/<date>_<source><id>_en.txt (+ manifest.json). Incremental: anything already
// in the manifest is skipped; pass --full to redo everything.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchRaw, fetchText, htmlToText, decodeEntities, dateFromText, pdfToText, loadJson, saveJson, BOT_UA } from '../airports/lib.mjs';

const RAW = new URL('../../tools/asur/raw/', import.meta.url);
const REL = new URL('releases/', RAW), PDF = new URL('pdf/', RAW), LIST = new URL('listings/', RAW);
const MANIFEST = new URL('manifest.json', RAW);
const FULL = process.argv.includes('--full');
const SINCE = '2016-01-01';
const OTHER_SINCE = '2024-01-01';
const PRN_ORG = 'https://www.prnewswire.com/news/grupo-aeroportuario-del-sureste%2C-s.a.b.-de-c.v./?pagesize=100&page=';
const ASUR_FIN = 'https://www.asur.com.mx/informacion-financiera-page-0';
const ASUR_BASE = 'https://www.asur.com.mx';

function classify(title) {
  const t = title.toLowerCase();
  if (/\b\d ?q ?\d\d\b.*results|results.*\b\dq\d\d\b|results for the (first|second|third|fourth)|(first|second|third|fourth)[- ]quarter.*results|announces (its )?(\d{4} )?(first|second|third|fourth)[- ]quarter/.test(t)) return 'results';
  if (/passenger traffic/.test(t)) return 'traffic';
  if (/(dividend|shareholder|meeting|acqui|motiva|urw|20-f|bond|notes|credit|loan|financing|rating|tariff|master development|concession|technical assistance|internaliz|bylaw|buyback|repurchase|stock exchange|guidance|capex|investment)/.test(t)) return 'other';
  return 'skip';
}
const tagRe = /(\d)Q(\d\d)/i;
const norm = (s) => s.replace(/\s+/g, ' ').trim();

async function main() {
  await mkdir(REL, { recursive: true }); await mkdir(PDF, { recursive: true }); await mkdir(LIST, { recursive: true });
  const manifest = FULL ? { filings: [] } : await loadJson(MANIFEST, { filings: [] });
  const known = new Set(manifest.filings.map((f) => f.url));
  const filings = [...manifest.filings];
  let fetched = 0;

  // ---- PR Newswire organisation listing
  const links = new Map();
  for (let page = 1; page <= 12; page++) {
    let html;
    try { html = await fetchText(PRN_ORG + page); } catch (e) { console.error(`PRN page ${page}: ${e.message}`); break; }
    if (page <= 3) await writeFile(new URL(`prn_p${page}.html`, LIST), html);
    let found = 0;
    for (const m of html.matchAll(/href="(\/news-releases\/[a-z0-9-]+-(\d{6,})\.html)"/g)) { if (!links.has(m[2])) { links.set(m[2], 'https://www.prnewswire.com' + m[1]); found++; } }
    console.log(`PRN page ${page}: ${found} new links`);
    if (found === 0) break;
  }
  const results = []; // {tag, date}
  for (const [id, url] of [...links.entries()].reverse()) {
    if (known.has(url)) { const f = filings.find((x) => x.url === url); if (f && f.class === 'results') results.push(f); continue; }
    let html;
    try { html = await fetchText(url); } catch (e) { filings.push({ source: 'prn', id, url, error: e.message }); continue; }
    const title = norm(decodeEntities((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1].replace(/<[^>]+>/g, '')));
    const whole = htmlToText(html);
    const date = (whole.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}, 20\d\d, \d{2}:\d{2} ET/) ? dateFromText(whole.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}, 20\d\d, \d{2}:\d{2} ET/)[0]) : null) || dateFromText(whole.slice(0, 20000)) || '0000-00-00';
    const body = (html.match(/<section[^>]+class="[^"]*release-body[^"]*"[^>]*>([\s\S]*?)<\/section>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || [, html])[1];
    const text = htmlToText(body);
    let cls = classify(title);
    if (cls === 'other' && date < OTHER_SINCE) cls = 'skip';
    if (date < SINCE) cls = 'skip';
    const entry = { source: 'prn', id, url, date, title, class: cls };
    if (cls !== 'skip') {
      const file = `${date}_prn${id}_en.txt`;
      await writeFile(new URL(file, REL), `# source: ${url}\n# title: ${title}\n# date: ${date}\n# lang: en\n# class: ${cls}\n\n${text}`);
      entry.path = `tools/asur/raw/releases/${file}`;
      if (cls === 'results') results.push(entry);
    }
    filings.push(entry); fetched++;
    console.log(`${date} prn ${cls.padEnd(7)} ${title.slice(0, 90)}`);
  }

  // ---- asur.com.mx: full earnings releases and transcripts (PDF)
  let finHtml = '';
  try { finHtml = await fetchText(ASUR_FIN); await writeFile(new URL('asur_fin.html', LIST), finHtml); } catch (e) { console.error(`ASUR financial-information page: ${e.message}`); }
  const pdfLinks = [];
  for (const m of finHtml.matchAll(/href="([^"]*\/media\/[^"]*\.pdf)"/gi)) {
    const href = decodeEntities(m[1]);
    const er = href.match(/Earnings-Release-(\dQ\d\d)\.pdf/i), tr = href.match(/Transcript-(\d\dQ\d|\dQ\d\d)\.pdf/i);
    if (er) pdfLinks.push({ kind: 'results-pdf', tag: er[1].toUpperCase(), href });
    else if (tr) { const t = tr[1].toUpperCase(); pdfLinks.push({ kind: 'transcript', tag: /^\d\dQ\d$/.test(t) ? `${t[3]}Q${t.slice(0, 2)}` : t, href }); }
  }
  console.log(`asur.com.mx: ${pdfLinks.length} PDF links (${pdfLinks.filter((p) => p.kind === 'results-pdf').length} earnings releases, ${pdfLinks.filter((p) => p.kind === 'transcript').length} transcripts)`);
  for (const p of pdfLinks) {
    const url = ASUR_BASE + encodeURI(href2path(p.href));
    if (known.has(url)) continue;
    const m = p.tag.match(tagRe); const q = +m[1], fy = 2000 + +m[2];
    const prn = results.find((r) => new RegExp(`\\b${q}Q${String(fy).slice(2)}\\b`, 'i').test(r.title || '') || new RegExp(`(first|second|third|fourth) quarter (of )?${fy}`, 'i').test(r.title || '') && ['first', 'second', 'third', 'fourth'][q - 1] === (r.title.match(/(first|second|third|fourth)/i) || [, ''])[1].toLowerCase());
    let buf;
    try { buf = (await fetchRaw(url, { accept: 'application/pdf,*/*' })).buf; } catch (e) { filings.push({ source: 'ir', id: p.tag, url, error: e.message }); console.error(`${p.tag} ${p.kind}: ${e.message}`); continue; }
    const pdfPath = fileURLToPath(new URL(`${p.kind}_${p.tag}.pdf`, PDF));
    await writeFile(pdfPath, buf);
    const tmp = fileURLToPath(new URL(`${p.kind}_${p.tag}.tmp.txt`, PDF));
    try { pdfToText(pdfPath, tmp); } catch (e) { filings.push({ source: 'ir', id: p.tag, url, error: 'pdf2text: ' + e.message }); console.error(`${p.tag}: pdf2text failed ${e.message}`); continue; }
    const text = (await import('node:fs/promises')).readFile(tmp, 'utf8');
    const body = await text;
    const date = (prn && prn.date) || dateFromText(body.slice(0, 3000)) || `${fy}-${String(Math.min(12, q * 3 + 1)).padStart(2, '0')}-25`;
    const title = p.kind === 'results-pdf' ? `ASUR ${p.tag} earnings release (full report, PDF)` : `ASUR ${p.tag} earnings-call transcript (PDF)`;
    const file = `${date}_ir${p.tag}${p.kind === 'transcript' ? 'tx' : ''}_en.txt`;
    await writeFile(new URL(file, REL), `# source: ${url}\n# title: ${title}\n# date: ${date}\n# lang: en\n# class: ${p.kind}\n# quarter: ${p.tag}\n\n${body}`);
    filings.push({ source: 'ir', id: p.tag, url, date, title, class: p.kind, path: `tools/asur/raw/releases/${file}` });
    fetched++;
    console.log(`${date} ir  ${p.kind.padEnd(11)} ${p.tag}`);
  }

  filings.sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id).localeCompare(String(b.id)));
  const kept = {};
  for (const f of filings) if (f.path) kept[f.class] = (kept[f.class] || 0) + 1;
  await saveJson(MANIFEST, { entity: 'Grupo Aeroportuario del Sureste, S.A.B. de C.V.', since: SINCE, otherSince: OTHER_SINCE, updatedAt: new Date().toISOString(), kept, filings });
  console.log(`Fetched ${fetched} new documents. Kept: ${JSON.stringify(kept)}`);
  if (!filings.length) { console.error('Nothing harvested'); process.exit(1); }
}
function href2path(h) { return h.startsWith('http') ? h.replace(/^https?:\/\/[^/]+/, '') : h; }
main().catch((e) => { console.error(e); process.exit(1); });
