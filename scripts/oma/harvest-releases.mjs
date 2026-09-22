// Harvests Grupo Aeroportuario del Centro Norte's (OMA) public releases for the OMA model.
//
// Source: OMA's investor-relations site (ir.oma.aero, WordPress/TablePress tables; it answers 403 to bot
// user agents, so a browser UA is used), three listings:
//   /en/earnings-reports/   quarterly results (PDF, ~16 pages: statements, traffic by airport, debt table)
//   /en/traffic-reports/    monthly passenger-traffic reports (PDF, tables by airport)
//   /en/news-releases/      material events (dividends, debt issuances, MDP, ratings, 20-F, meetings)
// Every PDF is converted with pdf2text.py to tools/oma/raw/releases/<date>_oma<slug>_en.txt (the PDF itself
// is not committed). Incremental via tools/oma/raw/manifest.json; --full redoes everything.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchRaw, fetchText, htmlToText, decodeEntities, dateFromText, pdfToText, loadJson, saveJson, BROWSER_UA } from '../airports/lib.mjs';

const RAW = new URL('../../tools/oma/raw/', import.meta.url);
const REL = new URL('releases/', RAW), PDF = new URL('pdf/', RAW), LIST = new URL('listings/', RAW);
const MANIFEST = new URL('manifest.json', RAW);
const FULL = process.argv.includes('--full');
const SINCE = '2016-01-01';
const OTHER_SINCE = '2024-01-01';
const IR = 'https://ir.oma.aero';
const PAGES = [
  { path: '/en/earnings-reports/', cls: 'results' },
  { path: '/en/traffic-reports/', cls: 'traffic' },
  { path: '/en/news-releases/', cls: 'other' },
];
const opt = { ua: BROWSER_UA, delayMs: 800 };

function cellsOf(tr) {
  return [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => {
    const inner = m[1];
    const hrefs = [...inner.matchAll(/href="([^"]+)"/gi)].map((h) => decodeEntities(h[1]));
    return { text: htmlToText(inner).replace(/\n/g, ' ').replace(/\s+\|\s+/g, ' ').trim(), hrefs };
  });
}
function classifyTitle(title, fallback) {
  const t = title.toLowerCase();
  if (/operating and financial results|quarter.*results|results.*quarter|\b[1-4][qt]\d\d\b/.test(t)) return 'results';
  if (/passenger traffic|traffic report|tr[aá]fico/.test(t)) return 'traffic';
  return fallback;
}
function slugOf(url) { return (url.split('/').pop() || '').replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }

async function main() {
  await mkdir(REL, { recursive: true }); await mkdir(PDF, { recursive: true }); await mkdir(LIST, { recursive: true });
  const manifest = FULL ? { filings: [] } : await loadJson(MANIFEST, { filings: [] });
  const known = new Set(manifest.filings.map((f) => f.url));
  const filings = [...manifest.filings];
  let fetched = 0;
  const seen = new Set();
  for (const pg of PAGES) {
    let html;
    try { html = await fetchText(IR + pg.path, opt); } catch (e) { console.error(`${pg.path}: ${e.message}`); continue; }
    await writeFile(new URL(pg.path.replace(/\W+/g, '_').replace(/^_|_$/g, '') + '.html', LIST), html);
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => cellsOf(m[1])).filter((c) => c.length >= 2);
    let n = 0;
    for (const cells of rows) {
      const pdfs = cells.flatMap((c) => c.hrefs).filter((h) => /\.pdf(\?|$)/i.test(h));
      if (!pdfs.length) continue;
      const dateCell = cells.map((c) => dateFromText(c.text)).find(Boolean);
      const title = (cells.find((c) => c.hrefs.length && c.text.length > 3) || cells[1] || cells[0]).text;
      const yearCell = cells.map((c) => (c.text.match(/^(20\d\d)$/) || [])[1]).find(Boolean);
      const qCell = cells.map((c) => (c.text.match(/^([1-4])[QT]\s?(\d\d|20\d\d)?$|^([1-4])(st|nd|rd|th)? quarter/i))).find(Boolean);
      for (const href of pdfs) {
        const url = href.startsWith('http') ? href : IR + href;
        if (seen.has(url)) continue; seen.add(url);
        if (known.has(url)) continue;
        const cls = classifyTitle(title, pg.cls);
        // English listings only; skip Spanish PDFs when the listing carries both
        if (/_ESP|_es\.pdf|espa[nñ]ol|\/es\//i.test(url) && !/ENG/i.test(url) && pg.cls !== 'other') { /* keep: some English reports carry Spanish names (4T24) */ }
        let buf;
        try { buf = (await fetchRaw(url, { ...opt, accept: 'application/pdf,*/*' })).buf; } catch (e) { filings.push({ source: 'ir', url, title, error: e.message }); console.error(`${title}: ${e.message}`); continue; }
        if (buf.slice(0, 4).toString() !== '%PDF') { filings.push({ source: 'ir', url, title, error: 'not a PDF' }); continue; }
        const slug = slugOf(url);
        const pdfPath = fileURLToPath(new URL(`${slug}.pdf`, PDF));
        await writeFile(pdfPath, buf);
        const tmp = fileURLToPath(new URL(`${slug}.tmp.txt`, PDF));
        try { pdfToText(pdfPath, tmp); } catch (e) { filings.push({ source: 'ir', url, title, error: 'pdf2text: ' + e.message }); console.error(`${slug}: pdf2text failed`); continue; }
        const body = await readFile(tmp, 'utf8');
        const upl = url.match(/uploads\/(20\d\d)\/(\d\d)\//);
        const date = dateCell || dateFromText(body.slice(0, 2500)) || (upl ? `${upl[1]}-${upl[2]}-15` : '0000-00-00');
        let c = cls;
        if (c === 'other' && date < OTHER_SINCE) c = 'skip';
        if (date < SINCE) c = 'skip';
        const entry = { source: 'ir', id: slug, url, date, title, class: c, listing: pg.path, year: yearCell || null, quarter: qCell ? qCell[0] : null };
        if (c !== 'skip') {
          const file = `${date}_oma${slug}_en.txt`;
          await writeFile(new URL(file, REL), `# source: ${url}\n# title: ${title}\n# date: ${date}\n# lang: en\n# class: ${c}\n# listing: ${pg.path}\n\n${body}`);
          entry.path = `tools/oma/raw/releases/${file}`;
        }
        filings.push(entry); fetched++; n++;
        console.log(`${date} ${c.padEnd(7)} ${title.slice(0, 80)} <- ${slug}`);
      }
    }
    console.log(`${pg.path}: ${rows.length} rows, ${n} new documents`);
  }
  filings.sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id).localeCompare(String(b.id)));
  const kept = {};
  for (const f of filings) if (f.path) kept[f.class] = (kept[f.class] || 0) + 1;
  await saveJson(MANIFEST, { entity: 'Grupo Aeroportuario del Centro Norte, S.A.B. de C.V.', since: SINCE, otherSince: OTHER_SINCE, updatedAt: new Date().toISOString(), kept, filings });
  console.log(`Fetched ${fetched} new documents. Kept: ${JSON.stringify(kept)}`);
  if (!filings.length) { console.error('Nothing harvested'); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
