#!/usr/bin/env node
// Checks that the external links a page carries still resolve. Runs at the end of every
// refresh workflow so a source link cannot rot unnoticed.
//
//   node scripts/check-links.mjs site/macro/index.html [site/other/index.html ...]
//
// For each page it collects every http(s) URL in the page's HTML and in the local script
// files the page loads (data/*.js etc.), requests each distinct URL once and sorts it into:
//   broken       404 / 410, host does not resolve, connection refused - after three attempts
//   unverifiable 401 / 403 / 405 / 429 / 5xx / timeouts: the host refuses scripts or is down
//                right now (Bloomberg, BLS, FRED, GlobeNewswire, CBO ... all do this)
//   ok           anything else that answered
// Broken links are printed as ::error:: annotations and the script exits 1, so GitHub sends
// its "run failed" email; the step runs after the commit step, so the refresh itself still
// lands. Unverifiable links are listed as notices and never fail the run.
//
// Skipped on purpose: the site's own domain, font/CDN hosts, XML namespaces, and any URL
// listed in the optional file tools/link-check-ignore.txt (one prefix per line; use it for
// endpoints that are meant for scripts, not readers).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { lookup } from 'node:dns/promises';

const pages = process.argv.slice(2);
if (!pages.length) { console.error('usage: node scripts/check-links.mjs <page.html> [...]'); process.exit(2); }

const OWN = /(^|\.)fnam\.mx$/i;
const SKIP_HOST = /(^|\.)(googleapis\.com|gstatic\.com|cdnjs\.cloudflare\.com|jsdelivr\.net|unpkg\.com|w3\.org|schema\.org|localhost)$/i;
const UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor link check; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
const ignoreFile = resolve('tools/link-check-ignore.txt');
const ignore = existsSync(ignoreFile)
  ? readFileSync(ignoreFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'))
  : [];

// ---- collect ----
const where = new Map(); // url -> Set(page)
function add(raw, page) {
  const url = raw.replace(/&amp;/g, '&').replace(/[.,;:\s]+$/, '');
  let host;
  try { host = new URL(url).hostname; } catch { return; }
  if (OWN.test(host) || SKIP_HOST.test(host)) return;
  if (ignore.some(p => url.startsWith(p))) return;
  if (!where.has(url)) where.set(url, new Set());
  where.get(url).add(page);
}
function harvest(text, page) {
  // A URL inside a quoted string is taken whole, spaces included (file names such as
  // "Q - Reporte Trimestral 2T26.pdf" are real links); elsewhere a URL ends at whitespace.
  const quoted = new Set();
  for (const m of text.matchAll(/["'](https?:\/\/[^"'<>]+)["']/g)) { quoted.add(m[1]); add(m[1], page); }
  for (const raw of text.match(/https?:\/\/[^\s"'<>\\)\]]+/g) || []) {
    if ([...quoted].some(q => q !== raw && q.startsWith(raw))) continue; // the truncated form of a quoted link
    add(raw, page);
  }
}
for (const page of pages) {
  if (!existsSync(page)) { console.log(`::warning::${page} not found; skipped`); continue; }
  const html = readFileSync(page, 'utf8');
  harvest(html, page);
  const dir = dirname(page);
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const src = m[1];
    if (/^https?:/i.test(src)) continue;
    const file = src.startsWith('/') ? join('site', src) : join(dir, src);
    if (existsSync(file)) harvest(readFileSync(file, 'utf8'), page);
  }
}
const urls = [...where.keys()].sort();
console.log(`${urls.length} distinct external links across ${pages.length} page(s)`);

// ---- check ----
const BROKEN_STATUS = new Set([404, 410]);
async function probe(url, method) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(url.replace(/ /g, '%20'), { method, redirect: 'follow', signal: ctl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.8' } });
    try { await res.body?.cancel(); } catch {}
    return { status: res.status };
  } catch (e) {
    const code = e?.cause?.code || e?.code || e?.name || '';
    return { status: 0, code };
  } finally { clearTimeout(timer); }
}
async function classify(url) {
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 4000 * attempt));
    let r = await probe(url, 'HEAD');
    if (r.status === 405 || r.status === 403 || r.status === 400 || r.status === 0) r = await probe(url, 'GET');
    last = r;
    if (r.status >= 200 && r.status < 400) return { verdict: 'ok', ...r };
    if (r.status === 0 && /ENOTFOUND|ECONNREFUSED|CERT|ERR_TLS/i.test(r.code || '')) {
      // a host that does not resolve at all is broken; confirm with a DNS lookup
      try { await lookup(new URL(url).hostname); } catch { return { verdict: 'broken', ...r }; }
    }
    if (!BROKEN_STATUS.has(r.status) && r.status !== 0) return { verdict: 'unverifiable', ...r };
  }
  if (BROKEN_STATUS.has(last.status)) return { verdict: 'broken', ...last };
  return { verdict: 'unverifiable', ...last };
}

const results = new Map();
let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < urls.length) { const u = urls[i++]; results.set(u, await classify(u)); }
}));

// ---- report ----
const broken = urls.filter(u => results.get(u).verdict === 'broken');
const unver = urls.filter(u => results.get(u).verdict === 'unverifiable');
for (const u of unver) {
  const r = results.get(u);
  console.log(`::notice::unverifiable (${r.status || r.code}) ${u}  [${[...where.get(u)].join(', ')}]`);
}
for (const u of broken) {
  const r = results.get(u);
  console.log(`::error::broken link (${r.status || r.code}) ${u}  [${[...where.get(u)].join(', ')}]`);
}
console.log(`ok ${urls.length - broken.length - unver.length}, unverifiable ${unver.length}, broken ${broken.length}`);
process.exit(broken.length ? 1 : 0);
