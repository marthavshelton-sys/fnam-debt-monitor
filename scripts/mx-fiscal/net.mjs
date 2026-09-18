// Shared HTTP helper for the Mexico fiscal pipeline.
//
// SHCP's servers (secciones.hacienda.gob.mx) send their leaf certificate without the issuing
// intermediate, so Node's fetch fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. The fix is the one
// browsers apply silently: read the leaf's "CA Issuers" URL (Authority Information Access),
// download that intermediate certificate and add it to the trust store for the request. Nothing
// is disabled: the chain is still verified against Node's bundled roots.

import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';

export const UA = 'fnam-debt-monitor/1.0 (+https://github.com/marthavshelton-sys/fnam-debt-monitor)';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extraCA = new Map(); // host -> PEM chain fetched from the AIA url

function derToPem(buf) {
  const b64 = buf.toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
}
function rawGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': UA, ...(opts.headers || {}) }, ca: opts.ca, timeout: opts.timeout || 30000 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && (opts.redirects ?? 0) < 5) {
        res.resume();
        return resolve(rawGet(new URL(res.headers.location, url).href, { ...opts, redirects: (opts.redirects ?? 0) + 1 }));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}
// Inspect the server's certificate chain without trusting it, return the leaf's AIA issuer urls.
export function peerChain(host, port = 443) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 15000 }, () => {
      const chain = [];
      let c = sock.getPeerCertificate(true);
      const seen = new Set();
      while (c && c.fingerprint && !seen.has(c.fingerprint)) {
        seen.add(c.fingerprint);
        chain.push({ subject: c.subject?.CN, issuer: c.issuer?.CN, infoAccess: c.infoAccess || {}, validTo: c.valid_to });
        c = c.issuerCertificate;
      }
      sock.end();
      resolve({ authorized: sock.authorized, authorizationError: sock.authorizationError, chain });
    });
    sock.on('timeout', () => sock.destroy(new Error('tls timeout')));
    sock.on('error', reject);
  });
}
async function repairChain(host) {
  if (extraCA.has(host)) return extraCA.get(host);
  const info = await peerChain(host);
  const pems = [];
  for (const cert of info.chain) {
    const urls = cert.infoAccess['CA Issuers - URI'] || [];
    for (const u of urls) {
      try {
        const r = await rawGet(u);
        if (r.status === 200 && r.body.length) pems.push(r.body.toString('utf8').includes('BEGIN CERTIFICATE') ? r.body.toString('utf8') : derToPem(r.body));
      } catch { /* try the next url */ }
    }
  }
  const ca = pems.length ? [...tls.rootCertificates, ...pems] : null;
  extraCA.set(host, ca);
  return ca;
}

// GET with retries; on an incomplete-chain TLS error the intermediate is fetched and the request retried.
export async function get(url, { headers = {}, tries = 3, pace = 0 } = {}) {
  const host = new URL(url).host;
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      if (pace) await sleep(pace);
      const res = await rawGet(url, { headers, ca: extraCA.get(host) || undefined });
      if (res.status === 429 && i < tries) { await sleep(4000 * i); continue; }
      if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE|unable to get local issuer|unable to verify the first certificate/i.test(e.message) && !extraCA.has(host)) {
        const ca = await repairChain(host);
        if (ca) continue; // retry immediately with the completed chain
      }
      if (i < tries) await sleep(1500 * i);
    }
  }
  throw new Error(`${lastErr?.message || 'request failed'} for ${url}`);
}
export async function getText(url, opts) { const r = await get(url, opts); const b = r.body; const t = b.toString('utf8'); return t.includes('�') ? b.toString('latin1') : t; }
export async function getJSON(url, opts) { return JSON.parse((await get(url, opts)).body.toString('utf8')); }
