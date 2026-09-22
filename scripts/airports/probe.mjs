// One-off discovery probe (run on a GitHub runner; the development sandbox cannot reach these hosts).
// Round 2: ASUR IR site (PDF reports, traffic, releases), PR Newswire org listing depth; OMA Miranda
// WordPress REST API, quarterly-report category, PDFs (converted with scripts/airports/pdf2text.py),
// ir.oma.aero with a browser UA, news.oma.aero pagination.
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { htmlToText } from '../gap/harvest-releases.mjs';

const OUT = new URL('../../tools/airports/probe2/', import.meta.url);
const BOT_UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TARGETS = [
  ['asur_fin', 'https://www.asur.com.mx/informacion-financiera-page-0'],
  ['asur_fin_en', 'https://www.asur.com.mx/RedirectToLocalizedContent?targetCulture=en&contentItemUrl=%2Finformacion-financiera-page-0'],
  ['asur_comunicados', 'https://www.asur.com.mx/comunicados'],
  ['asur_comunicados1', 'https://www.asur.com.mx/comunicados-1'],
  ['asur_trafico', 'https://www.asur.com.mx/trafico-de-pasajeros-2'],
  ['asur_prn_org_p2', 'https://www.prnewswire.com/news/grupo-aeroportuario-del-sureste%2C-s.a.b.-de-c.v./?page=2&pagesize=100'],
  ['asur_prn_org_p3', 'https://www.prnewswire.com/news/grupo-aeroportuario-del-sureste%2C-s.a.b.-de-c.v./?page=3&pagesize=100'],
  ['asur_pdf_1q26', 'https://www.asur.com.mx/media/Informes%20Financieros/2026/1/ASUR-Airport-Cancun-Mexico-Earnings-Release-1Q26.pdf.pdf'],
  ['asur_pdf_1q25', 'https://www.asur.com.mx/media/Informes%20Financieros/2025/1/ASUR-Airport-Cancun-Mexico-Earnings-Release-1Q25.pdf'],
  ['asur_prn_traffic_aug26_fixed', 'https://www.prnewswire.com/news-releases/asur-announces-total-passenger-traffic-for-august-2026-302872657.html', { fixTables: true }],
  ['oma_wp_posts_p1', 'https://miranda-newswire.com/wp-json/wp/v2/posts?search=OMA&per_page=100&page=1&_fields=id,date,link,title,categories,content'],
  ['oma_wp_posts_p2', 'https://miranda-newswire.com/wp-json/wp/v2/posts?search=OMA&per_page=100&page=2&_fields=id,date,link,title,categories,content'],
  ['oma_wp_posts_p3', 'https://miranda-newswire.com/wp-json/wp/v2/posts?search=OMA&per_page=100&page=3&_fields=id,date,link,title,categories,content'],
  ['oma_wp_cats', 'https://miranda-newswire.com/wp-json/wp/v2/categories?per_page=100'],
  ['oma_miranda_qr_p2', 'https://miranda-newswire.com/category/quarterly-reports/page/2/'],
  ['oma_pdf_2q26', 'https://miranda-newswire.com/wp-content/uploads/2026/07/Results_2Q26_vf.pdf'],
  ['oma_pdf_may26_traffic', 'https://miranda-newswire.com/wp-content/uploads/2026/06/OMA_May_2026_Traffic_Report_vf.pdf'],
  ['oma_ir_news_browser', 'https://ir.oma.aero/en/news-releases/', { ua: BROWSER_UA }],
  ['oma_ir_wp', 'https://ir.oma.aero/wp-json/wp/v2/posts?per_page=5', { ua: BROWSER_UA }],
  ['oma_news_p2', 'https://news.oma.aero/news/?page=2'],
  ['oma_news_p31', 'https://news.oma.aero/news/?page=31'],
  ['oma_news_jul26', 'https://news.oma.aero/news/oma-reports-a-3-9-increase-in-july-2026-passenger-traffic-b54f6-f8d04.html'],
  ['oma_site_press', 'https://www.oma.aero/en/oma-group/media/press-releases/'],
];

async function get(url, ua) {
  const res = await fetch(url, { headers: { 'User-Agent': ua, Accept: 'text/html,application/json,application/xhtml+xml,application/xml,application/pdf,*/*', 'Accept-Language': 'en,es;q=0.8' }, redirect: 'follow' });
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, ct, finalUrl: res.url, buf };
}
const PDF2TEXT = fileURLToPath(new URL('pdf2text.py', import.meta.url));

await mkdir(OUT, { recursive: true });
const report = [];
for (const [name, url, opt = {}] of TARGETS) {
  try {
    const r = await get(url, opt.ua || BOT_UA);
    const isPdf = /pdf/i.test(r.ct) || r.buf.slice(0, 4).toString() === '%PDF';
    if (isPdf) {
      const pdfPath = fileURLToPath(new URL(`${name}.pdf`, OUT));
      await writeFile(pdfPath, r.buf);
      try { execFileSync('python3', [PDF2TEXT, pdfPath, fileURLToPath(new URL(`${name}.txt`, OUT)), `# ${url}`], { stdio: 'inherit' }); } catch (e) { report.push(`${name}: pdf2text failed ${e.message}`); }
    } else {
      let html = r.buf.toString('utf8');
      if (opt.fixTables) html = html.replace(/<\/p>\s*(?=<\/t[dh]>)/gi, '').replace(/<br[^>]*>\s*(?=<\/t[dh]>)/gi, '');
      const text = /json/i.test(r.ct) ? html : htmlToText(html);
      const links = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => /news|release|report|resultados|traffic|pdf|trafico|tr%c3%a1fico|informe|results|\d{4}/i.test(h)))];
      await writeFile(new URL(`${name}.links.txt`, OUT), links.join('\n') + '\n');
      await writeFile(new URL(`${name}.html`, OUT), html.slice(0, 900_000));
      await writeFile(new URL(`${name}.txt`, OUT), `# ${url}\n# final: ${r.finalUrl}\n# status: ${r.status} ${r.ct}\n\n` + text);
    }
    report.push(`${name}: ${r.status} ${r.ct} ${r.buf.length}B -> ${r.finalUrl}`);
  } catch (e) {
    report.push(`${name}: ERROR ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 600));
}
await writeFile(new URL('REPORT.txt', OUT), report.join('\n') + '\n');
console.log(report.join('\n'));
