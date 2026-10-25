// Cloudflare Worker: starts the scheduled refreshes GitHub dropped or is holding, every 10 minutes (wrangler.toml → triggers).
// Same rule as scripts/watchdog/dispatch-missed.mjs (scripts/watchdog/dispatch-lib.mjs): a cron whose latest due time is at
// least LEAD_MINUTES old and has no run on main booked to it makes its workflow missed, and a missed workflow is dispatched once
// on main. Reads the dashboards config and the workflow files from main through raw.githubusercontent.com (public repository)
// and asks GitHub's API with the GITHUB_TOKEN secret (a fine-grained token: this repository only, Actions read and write,
// Metadata read). Deploy and secrets: tools/dispatcher/README.md. The watchdog itself (data-watchdog.yml) is included, so its
// 03:50 and 15:50 UTC checks also start on time.
import { dispatchMissed } from '../../scripts/watchdog/dispatch-lib.mjs';

export default {
  async scheduled(event, env, ctx) {
    const repo = env.REPO || 'marthavshelton-sys/fnam-debt-monitor';
    const lead = (Number(env.LEAD_MINUTES) || 40) * 6e4;
    const readText = async (p) => {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/${p}`, { headers: { 'User-Agent': 'fnam-dispatcher' } });
      if (!r.ok) throw new Error(`raw ${p}: HTTP ${r.status}`);
      return r.text();
    };
    const api = async (path, { method = 'GET', body } = {}) => {
      const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fnam-dispatcher', Authorization: `Bearer ${env.GITHUB_TOKEN}` };
      if (body) headers['Content-Type'] = 'application/json';
      const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) throw new Error(`GitHub API ${method} ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      return r.status === 204 ? null : r.json();
    };
    if (!env.GITHUB_TOKEN) { console.error('GITHUB_TOKEN secret not set: nothing dispatched'); return; }
    const report = await dispatchMissed({ readText, api, now: event.scheduledTime || Date.now(), leadMs: lead, includeSelf: true, log: (l) => console.log(l) });
    const touched = report.filter((w) => w.missed.length);
    console.log(touched.length ? JSON.stringify(touched) : 'no missed schedule');
  },
  // POST /bls forwards one BLS API v2 request body (README → "BLS proxy"): from 24-Oct-2026 api.bls.gov answered GitHub's
  // runners with its edge's "website is busy" HTML page for days; scripts/lib/bls.mjs and Invoke-Bls (tools/macro/common.ps1)
  // retry here when the direct calls are refused. Same key header as /fred; the body is passed through as received.
  // GET /fred?u=<FRED url> forwards one FRED request from Cloudflare's network (README → "FRED proxy"): on 21-Oct-2026 FRED
  // answered GitHub's runners with an HTML page through both the CSV export and the keyed API, so the shared readers
  // (scripts/lib/fred.mjs, tools/macro/common.ps1) retry here when the direct call is not data. Only the two FRED hosts are
  // forwarded, only with the X-FNAM-Key header equal to the PROXY_KEY secret, and the answer is passed through as received
  // (the readers validate it exactly as they validate a direct answer). GET / keeps answering the dispatch report.
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.pathname === '/fred') return fredProxy(request, env, u);
    if (u.pathname === '/bls') return blsProxy(request, env, u);
    const repo = env.REPO || 'marthavshelton-sys/fnam-debt-monitor';
    const readText = async (p) => { const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/${p}`, { headers: { 'User-Agent': 'fnam-dispatcher' } }); if (!r.ok) throw new Error(`raw ${p}: HTTP ${r.status}`); return r.text(); };
    const api = async (path) => { const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'fnam-dispatcher' }; if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`; const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers }); if (!r.ok) throw new Error(`GitHub API ${path}: HTTP ${r.status}`); return r.json(); };
    const report = await dispatchMissed({ readText, api, leadMs: (Number(env.LEAD_MINUTES) || 40) * 6e4, includeSelf: true, dryRun: true });
    return new Response(JSON.stringify({ checkedAt: new Date().toISOString(), workflows: report }, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  },
};

const FRED_HOSTS = new Set(['api.stlouisfed.org', 'fred.stlouisfed.org']);
async function fredProxy(request, env, u) {
  if (request.method !== 'GET') return new Response('method not allowed', { status: 405 });
  if (!env.PROXY_KEY) return new Response('proxy not configured (PROXY_KEY secret missing)', { status: 503 });
  if ((request.headers.get('X-FNAM-Key') || '') !== env.PROXY_KEY) return new Response('forbidden', { status: 403 });
  let target;
  try { target = new URL(u.searchParams.get('u') || ''); } catch { return new Response('bad u', { status: 400 }); }
  if (target.protocol !== 'https:' || !FRED_HOSTS.has(target.hostname)) return new Response('host not allowed', { status: 400 });
  const upstream = await fetch(target.toString(), { headers: { 'User-Agent': 'fnam-debt-monitor-bot/1.0', Accept: request.headers.get('Accept') || '*/*' }, redirect: 'follow' });
  const body = await upstream.arrayBuffer();
  console.log(`fred proxy ${target.hostname}${target.pathname} -> HTTP ${upstream.status} ${upstream.headers.get('content-type') || ''} ${body.byteLength} bytes`);
  return new Response(body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Upstream-Status': String(upstream.status) } });
}

// BLS Public Data API v2: POST passes the caller's JSON body through; GET /bls?series=ID,ID&start=YYYY&end=YYYY builds one
// unkeyed request (for a probe from a runner's `url` input; BLS allows 25 unkeyed requests a day per address).
const BLS_API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
async function blsProxy(request, env, u) {
  if (!env.PROXY_KEY) return new Response('proxy not configured (PROXY_KEY secret missing)', { status: 503 });
  if ((request.headers.get('X-FNAM-Key') || '') !== env.PROXY_KEY) return new Response('forbidden', { status: 403 });
  let body;
  if (request.method === 'POST') {
    body = await request.text();
    if (body.length > 20_000) return new Response('body too large', { status: 413 });
    try { const j = JSON.parse(body); if (!j || !Array.isArray(j.seriesid)) throw new Error('no seriesid'); } catch { return new Response('bad body', { status: 400 }); }
  } else if (request.method === 'GET') {
    const series = (u.searchParams.get('series') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
    if (!series.length) return new Response('bad series', { status: 400 });
    const y = new Date().getUTCFullYear();
    body = JSON.stringify({ seriesid: series, startyear: u.searchParams.get('start') || String(y - 1), endyear: u.searchParams.get('end') || String(y) });
  } else return new Response('method not allowed', { status: 405 });
  const upstream = await fetch(BLS_API, { method: 'POST', body, redirect: 'follow',
    headers: { 'User-Agent': 'fnam-debt-monitor-bot/1.0', 'Content-Type': 'application/json', Accept: 'application/json' } });
  const out = await upstream.arrayBuffer();
  console.log(`bls proxy -> HTTP ${upstream.status} ${upstream.headers.get('content-type') || ''} ${out.byteLength} bytes`);
  return new Response(out, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Upstream-Status': String(upstream.status) } });
}
