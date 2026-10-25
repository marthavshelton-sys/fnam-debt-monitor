// One reader for every call the pipelines make to the BLS Public Data API v2 (api.bls.gov/publicAPI/v2/timeseries/data/).
//
// Why it exists: from 24-Oct-2026 the API answered GitHub's runners with its edge's HTML page ("The BLS website is busy",
// HTTP 503) on every call, for days, while the same API answered other networks. The American Consumer and U.S. macro
// readers called it once, took the refusal as a failed source and opened SOURCE DOWN issues after three runs, although the
// outage was the runner's address, not the data. Every BLS request now passes through here:
//
//   1. the direct call is tried up to `tries` times with a pause between them (the edge page is often transient);
//   2. when every direct attempt is refused (HTTP error or an HTML body) and the Cloudflare Worker proxy is configured
//      (`FRED_PROXY_URL` and `FRED_PROXY_KEY`: the same Worker and secret the FRED readers use, route `/bls`;
//      tools/dispatcher/README.md → "FRED proxy"), the same request is sent once more through it, from Cloudflare's network;
//   3. a body is accepted only when it is the API's JSON (an object with `status`); an HTML page or anything else is refused,
//      the reader throws, and the caller keeps its previous data (every pipeline already does that for a thrown error).
//
// The reader never changes a figure: it hands back the parsed object exactly as the API sent it, so callers read
// `status`, `message` and `Results.series` as before. BLS's own refusals inside a 200 answer ("REQUEST_NOT_PROCESSED",
// the daily threshold) are returned to the caller, which already knows how to split or stop.

const API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const UA = 'fnam-debt-monitor-bot/1.0';
const TIMEOUT_MS = 90_000;

export function proxyConfig(env = process.env) {
  const url = (env.FRED_PROXY_URL || '').trim().replace(/\/+$/, '');
  const key = (env.FRED_PROXY_KEY || '').trim();
  return url && key ? { url, key } : null;
}

function looksLikeHtml(text) {
  const head = text.slice(0, 600).trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<head') || head.startsWith('<link') || /<html[\s>]/.test(head);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POST one request body ({ seriesid, startyear, endyear, registrationkey?, catalog? }) and return the parsed answer.
// `log` receives one line per refused attempt. The thrown error carries `.upstream = 'busy'` when every attempt was the
// edge's HTML page or an HTTP 5xx, so callers may class the failure as a publisher outage rather than a broken reader.
export async function blsRequest(body, { tries = 3, waitMs = 20_000, log = () => {}, env = process.env } = {}) {
  const payload = JSON.stringify(body);
  const attempts = [];
  for (let i = 1; i <= tries; i++) attempts.push({ via: `direct ${i}/${tries}`, target: API, headers: {} });
  const proxy = proxyConfig(env);
  if (proxy) attempts.push({ via: 'proxy', target: `${proxy.url}/bls`, headers: { 'X-FNAM-Key': proxy.key } });
  const reasons = [];
  let busy = true;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (i > 0 && i < tries) await sleep(waitMs);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let r;
    try {
      const res = await fetch(a.target, { method: 'POST', body: payload, signal: ctrl.signal, redirect: 'follow',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json', ...a.headers } });
      r = { ok: res.ok, status: res.status, type: (res.headers.get('content-type') || '').toLowerCase(), text: await res.text() };
    } catch (e) {
      const why = e && e.name === 'AbortError' ? `timed out after ${TIMEOUT_MS / 1000}s` : e.message;
      reasons.push(`${a.via}: ${why}`); log(`BLS ${a.via}: ${why}`); continue;
    } finally { clearTimeout(timer); }
    if (r.type.includes('text/html') || looksLikeHtml(r.text)) {
      const title = (r.text.match(/<title>([^<]{0,120})<\/title>/i) || [])[1] || '';
      const why = `HTML page instead of data (HTTP ${r.status}${title ? `, "${title.trim()}"` : ''})`;
      reasons.push(`${a.via}: ${why}`); log(`BLS ${a.via}: ${why}`); continue;
    }
    if (!r.ok) {
      if (r.status < 500 && r.status !== 429) busy = false;
      const why = `HTTP ${r.status} ${r.text.slice(0, 120).replace(/\s+/g, ' ')}`;
      reasons.push(`${a.via}: ${why}`); log(`BLS ${a.via}: ${why}`); continue;
    }
    let j;
    try { j = JSON.parse(r.text); } catch (e) {
      busy = false;
      const why = `not JSON (${e.message.slice(0, 60)}; body "${r.text.slice(0, 60).replace(/\s+/g, ' ')}")`;
      reasons.push(`${a.via}: ${why}`); log(`BLS ${a.via}: ${why}`); continue;
    }
    if (!j || typeof j !== 'object' || Array.isArray(j) || typeof j.status !== 'string') {
      busy = false;
      const why = `JSON is not a BLS answer (keys: ${j && typeof j === 'object' ? Object.keys(j).slice(0, 6).join(', ') : typeof j})`;
      reasons.push(`${a.via}: ${why}`); log(`BLS ${a.via}: ${why}`); continue;
    }
    if (a.via === 'proxy') log('BLS: answered through the proxy');
    return j;
  }
  const err = new Error(`BLS API: ${reasons.join('; ')}`);
  err.upstream = busy ? 'busy' : 'refused';
  throw err;
}

// Convenience: the series of one request, throwing on a BLS refusal too.
export async function blsSeries(seriesid, startyear, endyear, { key, catalog = true, ...opts } = {}) {
  const body = { seriesid, startyear: String(startyear), endyear: String(endyear) };
  if (key) { body.registrationkey = key; body.catalog = catalog; }
  const j = await blsRequest(body, opts);
  if (j.status !== 'REQUEST_SUCCEEDED') throw new Error(`BLS: ${j.status} ${(j.message || []).join('; ').slice(0, 200)}`);
  return (j.Results && j.Results.series) || [];
}
