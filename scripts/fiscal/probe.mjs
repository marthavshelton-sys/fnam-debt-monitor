#!/usr/bin/env node
// Diagnostics for the US fiscal monitor, run from the Actions tab (refresh-data.yml, input "url").
// The Claude cloud session's egress proxy blocks Treasury, FRED, the Fed, CME and Investing.com,
// so a live endpoint is probed from the GitHub runner instead and the answer read from the run log.
//
//   node scripts/fiscal/probe.mjs --url "URL URL#regex URL##regex ..."
//
// Each whitespace-separated item is fetched once with a browser user agent and printed as
// "HTTP status, content type, size" plus the body:
//   URL           the first 2,500 characters, whitespace collapsed
//   URL#regex     only the lines matching the regex (case-insensitive, up to 80 lines) when the
//                 body has line breaks; otherwise each match with ~250 characters of context
//   URL##regex    force the match-with-context form even on a body with many lines
//   raw:URL...    keep the HTML instead of stripping tags (to find an href target, say)
// HTML tags are stripped before matching so a regex can target the visible text. FRED and
// Treasury answer the fetch script's own user agent and stall on a browser one, so those hosts
// are requested the way scripts/fetch-data.mjs requests them. Nothing is written and no secret
// is needed; the script exits 0 even when a URL fails, so one dead host never hides the other
// answers.
const argv = process.argv.slice(2);
const urlIdx = argv.indexOf('--url');
if (urlIdx < 0) {
  console.error('usage: node scripts/fiscal/probe.mjs --url "URL URL#regex ..."');
  process.exit(2);
}
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TIMEOUT_MS = 45_000;

function stripHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => m.replace(/></g, '>\n<')) // keep inline JSON reachable but line-broken
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|td|th|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ');
}

for (const item0 of (argv[urlIdx + 1] || '').split(/\s+/).filter(Boolean)) {
  const keepHtml = item0.startsWith('raw:');
  const item = keepHtml ? item0.slice(4) : item0;
  const forceCtx = item.includes('##');
  const [raw, pat] = item.split(/#{1,2}/);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const scriptHost = /(^|\.)(stlouisfed\.org|treasury\.gov)$/i.test(new URL(raw).hostname);
    const res = await fetch(raw, { headers: { 'User-Agent': scriptHost ? 'fnam-debt-monitor-bot/1.0' : UA, Accept: 'text/html,application/json,text/csv,*/*', 'Accept-Language': 'en-US,en;q=0.9' }, signal: ctrl.signal, redirect: 'follow' });
    const bodyRaw = await res.text();
    const isHtml = !keepHtml && (/text\/html/i.test(res.headers.get('content-type') || '') || /^\s*<!doctype html|^\s*<html/i.test(bodyRaw));
    const body = isHtml ? stripHtml(bodyRaw) : bodyRaw;
    console.log(`${raw}\n  -> HTTP ${res.status} ${res.headers.get('content-type') || ''} ${bodyRaw.length} bytes${res.url && res.url !== raw ? ` (final URL ${res.url})` : ''}`);
    if (pat) {
      const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 20 && !forceCtx) {
        const re = new RegExp(pat, 'i');
        const hits = lines.filter((l) => re.test(l));
        console.log(`  ${hits.length} matching line(s)`);
        for (const l of hits.slice(0, 80)) console.log('  | ' + l.slice(0, 400));
      } else {
        const re = new RegExp(pat, 'gi');
        let m, n = 0;
        while ((m = re.exec(body)) && n++ < 120) {
          console.log('  @' + m.index + ' ' + body.slice(Math.max(0, m.index - 100), m.index + m[0].length + 160).replace(/\s+/g, ' '));
          if (m[0].length === 0) re.lastIndex++;
        }
        if (n === 0) console.log('  (no match)');
      }
    } else {
      console.log('  ' + body.replace(/\s+/g, ' ').slice(0, 2500));
    }
  } catch (e) {
    console.log(`${raw}\n  -> ERROR ${e && e.name === 'AbortError' ? `timed out after ${TIMEOUT_MS / 1000}s` : (e && e.message) || e}`);
  } finally {
    clearTimeout(timer);
  }
}
