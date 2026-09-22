// One-off discovery probe (run on a GitHub runner; the development sandbox cannot reach these hosts).
// Fetches candidate listing pages and sample releases for ASUR and OMA and saves text + link inventories
// under tools/airports/probe/ so the harvesters and parsers can be written against real formats.
import { mkdir, writeFile } from 'node:fs/promises';
import { htmlToText } from '../gap/harvest-releases.mjs';

const OUT = new URL('../../tools/airports/probe/', import.meta.url);
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const TARGETS = [
  // ASUR — PR Newswire
  ['asur_prn_list_asur_p1', 'https://www.prnewswire.com/search/news/?keyword=ASUR&pagesize=100&page=1'],
  ['asur_prn_list_asur_p2', 'https://www.prnewswire.com/search/news/?keyword=ASUR&pagesize=100&page=2'],
  ['asur_prn_list_sureste_p1', 'https://www.prnewswire.com/search/news/?keyword=%22Grupo%20Aeroportuario%20del%20Sureste%22&pagesize=100&page=1'],
  ['asur_prn_org', 'https://www.prnewswire.com/news/grupo-aeroportuario-del-sureste%2C-s.a.b.-de-c.v./'],
  ['asur_2q26_results', 'https://www.prnewswire.com/news-releases/asur-announces-2q26-results-302833686.html'],
  ['asur_1q26_results', 'https://www.prnewswire.com/news-releases/asur-announces-1q26-results-302750724.html'],
  ['asur_aug26_traffic', 'https://www.prnewswire.com/news-releases/asur-announces-total-passenger-traffic-for-august-2026-302872657.html'],
  ['asur_ir_home', 'https://www.asur.com.mx/en/investors/'],
  ['asur_ir_reports', 'https://www.asur.com.mx/en/investors/financial-information/quarterly-reports'],
  // OMA — IR site, Miranda newswire, newsroom
  ['oma_ir_news', 'https://ir.oma.aero/en/news-releases/'],
  ['oma_ir_news_p2', 'https://ir.oma.aero/en/news-releases/?page=2'],
  ['oma_ir_earnings', 'https://ir.oma.aero/en/earnings-reports/'],
  ['oma_ir_home', 'https://ir.oma.aero/en/'],
  ['oma_miranda_2q26', 'https://miranda-newswire.com/oma-announces-second-quarter-2026-operating-and-financial-results-2/'],
  ['oma_miranda_jun26', 'https://miranda-newswire.com/oma-reports-a-3-6-increase-in-may-2026-passenger-traffic-2/'],
  ['oma_miranda_search', 'https://miranda-newswire.com/?s=OMA'],
  ['oma_miranda_search_p2', 'https://miranda-newswire.com/page/2/?s=OMA'],
  ['oma_miranda_feed', 'https://miranda-newswire.com/feed/?s=OMA'],
  ['oma_news_traffic', 'https://news.oma.aero/passenger-traffic.html'],
  ['oma_news_home', 'https://news.oma.aero/'],
  ['oma_news_news', 'https://news.oma.aero/news/'],
];

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml,*/*', 'Accept-Language': 'en,es;q=0.8' }, redirect: 'follow' });
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, ct, finalUrl: res.url, buf };
}

await mkdir(OUT, { recursive: true });
const report = [];
for (const [name, url] of TARGETS) {
  try {
    const r = await get(url);
    const isPdf = /pdf/i.test(r.ct) || r.buf.slice(0, 4).toString() === '%PDF';
    let text = '';
    if (!isPdf) {
      const html = r.buf.toString('utf8');
      text = htmlToText(html);
      const links = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => /news|release|report|resultados|traffic|pdf|trafico|tr%c3%a1fico|informe|results|\d{4}/i.test(h)))];
      await writeFile(new URL(`${name}.links.txt`, OUT), links.join('\n') + '\n');
      await writeFile(new URL(`${name}.html`, OUT), html.slice(0, 600_000));
      await writeFile(new URL(`${name}.txt`, OUT), `# ${url}\n# final: ${r.finalUrl}\n# status: ${r.status} ${r.ct}\n\n` + text);
    } else {
      await writeFile(new URL(`${name}.pdf`, OUT), r.buf);
    }
    report.push(`${name}: ${r.status} ${r.ct} ${r.buf.length}B -> ${r.finalUrl}`);
  } catch (e) {
    report.push(`${name}: ERROR ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 600));
}
await writeFile(new URL('REPORT.txt', OUT), report.join('\n') + '\n');
console.log(report.join('\n'));
