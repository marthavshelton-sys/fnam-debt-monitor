// Mirrors official documents (HTML pages and PDFs listed in tools/mx-fiscal/docs.json) into
// tools/mx-fiscal/docs/<key>.txt as plain text, so that the document routine — which runs in an
// environment that cannot reach gob.mx or banxico.org.mx — reads the primary source instead of
// press coverage. Runs on the GitHub Actions runner after the data refresh. Never fatal: a source
// that fails keeps its previous mirror and is listed in the run summary.
//
//   node scripts/mx-fiscal/mirror-docs.mjs            refresh every mirror
//   node scripts/mx-fiscal/mirror-docs.mjs shcp-cgpe  one key

import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { get } from './net.mjs';

const ROOT = new URL('../../', import.meta.url);
const CONFIG = new URL('tools/mx-fiscal/docs.json', ROOT);
const OUT_DIR = new URL('tools/mx-fiscal/docs/', ROOT);
const only = process.argv.slice(2);

const clean = (t) => t.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
function htmlToText(html) {
  return clean(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => `${txt.replace(/<[^>]+>/g, ' ').trim()} [${href}]`)
    .replace(/<(br|p|div|li|tr|h[1-6]|section|article|table)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&([a-z]+);/gi, (m, e) => ({ aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü' }[e] || m))
    .replace(/[ \t]{2,}/g, ' '));
}
function pdfToText(buf) {
  const tmp = `/tmp/mx-fiscal-doc-${process.pid}.pdf`;
  execFileSync('sh', ['-c', `cat > ${tmp}`], { input: buf });
  try { return clean(execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', tmp, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8')); }
  finally { execFileSync('rm', ['-f', tmp]); }
}
// Newest link on an index page whose href matches `find`: the last four-digit year in the href wins, then document order.
function findLink(html, base, re) {
  const rx = new RegExp(re, 'i'), hits = [];
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) { const href = m[1]; if (rx.test(href)) hits.push(new URL(href, base).href); }
  if (!hits.length) throw new Error(`no link matches /${re}/ on ${base}`);
  const year = (u) => { const ys = u.match(/20\d\d/g); return ys ? +ys[ys.length - 1] : 0; };
  return [...new Set(hits)].sort((a, b) => year(b) - year(a))[0];
}
async function mirror(key, spec) {
  let url = spec.url, res = await get(url, { tries: 2 });
  let body = res.body, ctype = String(res.headers['content-type'] || '');
  if (spec.find) { url = findLink(body.toString('utf8'), spec.url, spec.find); res = await get(url, { tries: 2 }); body = res.body; ctype = String(res.headers['content-type'] || ''); }
  const isPdf = /pdf/i.test(ctype) || body.slice(0, 5).toString() === '%PDF-' || /\.pdf(\?|$)/i.test(url);
  let text = isPdf ? pdfToText(body) : htmlToText(body.toString('utf8').includes('�') ? body.toString('latin1') : body.toString('utf8'));
  if (spec.maxChars && text.length > spec.maxChars) text = text.slice(0, spec.maxChars) + `\n\n[… truncated at ${spec.maxChars} characters]`;
  const sha = createHash('sha256').update(body).digest('hex').slice(0, 16);
  const header = `# Mirror of an official document — read-only, refreshed by scripts/mx-fiscal/mirror-docs.mjs\n# source: ${url}\n# fetched: ${new Date().toISOString().slice(0, 10)}\n# type: ${isPdf ? 'pdf' : 'html'} · bytes: ${body.length} · sha256: ${sha}\n\n`;
  const file = new URL(`${key}.txt`, OUT_DIR);
  let prev = ''; try { prev = await fs.readFile(file, 'utf8'); } catch { /* first mirror */ }
  const prevSha = (prev.match(/sha256: (\w+)/) || [])[1];
  if (prevSha === sha) { await fs.writeFile(file, prev.replace(/# fetched: \d{4}-\d{2}-\d{2}/, `# fetched: ${new Date().toISOString().slice(0, 10)}`)); return { key, url, status: 'unchanged', chars: text.length }; }
  await fs.writeFile(file, header + text + '\n');
  return { key, url, status: prevSha ? 'UPDATED' : 'new', chars: text.length };
}
async function main() {
  const cfg = JSON.parse(await fs.readFile(CONFIG, 'utf8'));
  await fs.mkdir(OUT_DIR, { recursive: true });
  const rows = [];
  for (const [key, spec] of Object.entries(cfg.sources)) {
    if (only.length && !only.includes(key)) continue;
    try { rows.push(await mirror(key, spec)); }
    catch (e) { rows.push({ key, url: spec.url, status: `FAILED: ${e.message.slice(0, 160)}`, chars: 0 }); }
  }
  const table = ['| document | status | chars | url |', '|---|---|---|---|', ...rows.map((r) => `| ${r.key} | ${r.status} | ${r.chars} | ${r.url} |`)].join('\n');
  console.log(table);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Document mirrors\n\n${table}\n`);
}
main().catch((e) => { console.error(e); process.exitCode = 0; });
