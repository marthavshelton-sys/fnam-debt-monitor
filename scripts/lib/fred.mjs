// One reader for every FRED call the pipelines make (Federal Reserve Bank of St. Louis: the public CSV export
// fred.stlouisfed.org/graph/fredgraph.csv and the keyed JSON API api.stlouisfed.org).
//
// Why it exists: on 21-Oct-2026 FRED answered GitHub's runners with an HTML page instead of data, through both the CSV
// export and the keyed API. Readers that trusted the body split that HTML on commas and committed it as figures (the
// U.S. fiscal monitor's FOMC range became "<link href=…Open+Sans:300", 400, 400) or wrote empty series (the U.S. macro
// financial-conditions file), which broke the pages. Every FRED body now passes through here and is accepted only when
// it is what the caller asked for:
//
//   fredText(url)  the CSV export: the body must not be HTML, its header must start with a date column
//                  (`observation_date` or `DATE`), and every data row must start with yyyy-mm-dd.
//   fredJson(url)  the JSON API: the body must parse as an object without FRED's `error_message`, and for the
//                  observations, series and release endpoints must carry the array FRED documents for them.
//
// A body that fails is never returned: the reader throws, and the caller keeps its previous data (every pipeline
// already does that for a thrown error). When the direct call is refused or answers HTML and the proxy is configured
// (`FRED_PROXY_URL` and `FRED_PROXY_KEY`, both passed to the runner as secrets/variables; tools/dispatcher/README.md →
// "FRED proxy"), the same URL is fetched once more through the Cloudflare Worker, which forwards it from Cloudflare's
// network instead of GitHub's. Without the proxy the reader simply reports the refusal.
//
// The reader never changes a figure: it hands back the exact text or JSON FRED sent, so callers parse as before.

const UA = 'fnam-debt-monitor-bot/1.0';
const TIMEOUT_MS = 60_000;
const FRED_HOSTS = new Set(['fred.stlouisfed.org', 'api.stlouisfed.org']);

export function isFredUrl(url) {
  try { return FRED_HOSTS.has(new URL(url).hostname); } catch { return false; }
}

// Proxy settings come from the environment; a URL without a key (or the reverse) is treated as not configured.
export function proxyConfig(env = process.env) {
  const url = (env.FRED_PROXY_URL || '').trim().replace(/\/+$/, '');
  const key = (env.FRED_PROXY_KEY || '').trim();
  return url && key ? { url, key } : null;
}

function looksLikeHtml(text) {
  const head = text.slice(0, 600).trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<head') || head.startsWith('<link') || head.startsWith('<?xml') || /<html[\s>]/.test(head);
}

async function fetchRaw(url, { accept, signal }) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, signal, redirect: 'follow' });
  const text = await res.text();
  const type = (res.headers.get('content-type') || '').toLowerCase();
  return { ok: res.ok, status: res.status, type, text };
}

// One attempt directly, one through the proxy when the first answer was not data. Returns the accepted body text.
async function fetchChecked(url, { accept, check }) {
  if (!isFredUrl(url)) throw new Error(`fred reader: ${url} is not a FRED address`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const attempts = [{ via: 'direct', target: url }];
    const proxy = proxyConfig();
    if (proxy) attempts.push({ via: 'proxy', target: `${proxy.url}/fred?u=${encodeURIComponent(url)}`, headers: { 'X-FNAM-Key': proxy.key } });
    const reasons = [];
    for (const a of attempts) {
      let r;
      try {
        const res = await fetch(a.target, { headers: { 'User-Agent': UA, Accept: accept, ...(a.headers || {}) }, signal: ctrl.signal, redirect: 'follow' });
        r = { ok: res.ok, status: res.status, type: (res.headers.get('content-type') || '').toLowerCase(), text: await res.text() };
      } catch (e) {
        if (e && e.name === 'AbortError') throw new Error(`FRED ${url}: timed out after ${TIMEOUT_MS / 1000}s`);
        reasons.push(`${a.via}: ${e.message}`);
        continue;
      }
      if (r.type.includes('text/html') || looksLikeHtml(r.text)) {
        const title = (r.text.match(/<title>([^<]{0,120})<\/title>/i) || [])[1] || '';
        reasons.push(`${a.via}: HTML page instead of data (HTTP ${r.status}${title ? `, "${title.trim()}"` : ''})`);
        continue;
      }
      if (!r.ok) { reasons.push(`${a.via}: HTTP ${r.status} ${r.text.slice(0, 120).replace(/\s+/g, ' ')}`); continue; }
      const problem = check(r.text);
      if (problem) { reasons.push(`${a.via}: ${problem}`); continue; }
      return r.text;
    }
    throw new Error(`FRED ${url.replace(/api_key=[^&]+/, 'api_key=…')}: ${reasons.join('; ')}`);
  } finally {
    clearTimeout(timer);
  }
}

// The CSV export. Accepts the body only when it is a FRED CSV: a header whose first column is the date column and
// every following non-empty row starting with yyyy-mm-dd (FRED writes "." for a missing value; that is still a row).
export function checkCsv(text) {
  const lines = text.split(/\r?\n/);
  const header = (lines[0] || '').trim();
  if (!/^(observation_date|DATE)\s*,/i.test(header)) return `not a FRED CSV (first line "${header.slice(0, 80)}")`;
  let rows = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (!/^\d{4}-\d{2}-\d{2},/.test(l)) return `CSV row ${i} is not dated: "${l.slice(0, 80)}"`;
    rows++;
  }
  if (!rows) return 'CSV has no observations';
  return null;
}

export async function fredText(url) {
  return fetchChecked(url, { accept: 'text/csv,text/plain,*/*', check: checkCsv });
}

// The JSON API. Accepts an object without `error_message`; the documented endpoints must carry their array.
export function checkJson(text) {
  let j;
  try { j = JSON.parse(text); } catch (e) { return `not JSON (${e.message.slice(0, 60)}; body "${text.slice(0, 60).replace(/\s+/g, ' ')}")`; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return 'JSON is not an object';
  if (j.error_message) return `FRED error ${j.error_code || ''}: ${j.error_message}`;
  return null;
}

export async function fredJson(url) {
  const text = await fetchChecked(url, { accept: 'application/json', check: (t) => checkJson(t) || endpointCheck(url, JSON.parse(t)) });
  return JSON.parse(text);
}

function endpointCheck(url, j) {
  const path = new URL(url).pathname;
  const need = /\/series\/observations$/.test(path) ? 'observations'
    : /\/series\/vintagedates$/.test(path) ? 'vintage_dates'
    : /\/series$/.test(path) ? 'seriess'
    : /\/release\/dates$/.test(path) ? 'release_dates'
    : /\/release$/.test(path) ? 'releases'
    : /\/release\/tables$/.test(path) ? 'elements'
    : null;
  if (need && !(need in j)) return `JSON lacks "${need}" (keys: ${Object.keys(j).slice(0, 6).join(', ')})`;
  return null;
}

// Convenience for the CSV export: [{ date, value }] with missing values dropped, oldest first.
export async function fredCsvPoints(id, { from } = {}) {
  const text = await fredText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}${from ? `&cosd=${from}` : ''}`);
  return text.split(/\r?\n/).slice(1).map((l) => l.trim().split(',')).filter((r) => r.length >= 2 && r[1] !== '.' && r[1] !== '' && Number.isFinite(Number(r[1]))).map((r) => ({ date: r[0], value: Number(r[1]) }));
}
