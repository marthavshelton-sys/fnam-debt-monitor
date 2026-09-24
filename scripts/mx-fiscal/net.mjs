// Shared HTTP helper for the Mexico fiscal pipeline.
//
// SHCP's servers (secciones.hacienda.gob.mx) send their leaf certificate without the issuing
// intermediate, so Node's fetch fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. The fix is the one
// browsers apply silently: follow the "CA Issuers" URL (Authority Information Access) of each
// certificate, download the issuer, and repeat until a certificate issued by a trusted root turns
// up. Since late 2025 Let's Encrypt's leaves chain through the new "Generation Y" intermediates
// (YR1…), whose roots are cross-signed by ISRG Root X1, so one hop is usually not enough.
//
// Nothing is disabled. Every downloaded certificate is checked to be the signer of the one below
// it, and the chain is accepted only if its top is signed by a root Node or the OS already trusts
// (Node's bundled Mozilla store plus /etc/ssl/certs). A certificate fetched from the network is
// never itself a trust anchor.

import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const UA = 'fnam-debt-monitor/1.0 (+https://github.com/marthavshelton-sys/fnam-debt-monitor)';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OS_STORES = ['/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt', '/etc/ssl/cert.pem'];
const extraCA = new Map(); // host -> full `ca` list (roots + downloaded intermediates) or null when repair failed
let rootPems = null;
let rootCerts = null;

function loadRoots() {
  if (rootPems) return;
  rootPems = [...tls.rootCertificates];
  for (const f of OS_STORES) {
    try { rootPems.push(...(fs.readFileSync(f, 'utf8').match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [])); } catch { /* store absent */ }
  }
  rootCerts = rootPems.map((p) => { try { return new crypto.X509Certificate(p); } catch { return null; } }).filter(Boolean);
}
// Tests point the trust anchors at their own root; production always uses the real stores.
export function setTrustedRoots(pems) { rootPems = [...pems]; rootCerts = pems.map((p) => new crypto.X509Certificate(p)); }
export function trustedRootCount() { loadRoots(); return rootCerts.length; }

function signedBy(cert, issuer) { try { return cert.checkIssued(issuer) && cert.verify(issuer.publicKey); } catch { return false; } }
function trustedIssuer(cert) { loadRoots(); return rootCerts.find((r) => signedBy(cert, r)) || null; }
export function aiaUrls(cert) { return [...(cert.infoAccess || '').matchAll(/CA Issuers - URI:(\S+)/g)].map((m) => m[1]); }
const cn = (dn) => (String(dn || '').match(/CN=([^\n]+)/) || [])[1] || String(dn || '').replace(/\n/g, ', ');

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

// Inspect the server's certificate chain without trusting it.
export function peerChain(host, port = 443) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 15000 }, () => {
      const chain = [];
      let c = sock.getPeerCertificate(true);
      const seen = new Set();
      while (c && c.fingerprint && !seen.has(c.fingerprint)) {
        seen.add(c.fingerprint);
        chain.push({ subject: c.subject?.CN, issuer: c.issuer?.CN, san: c.subjectaltname || '', infoAccess: c.infoAccess || {}, validTo: c.valid_to, raw: c.raw });
        c = c.issuerCertificate;
      }
      sock.end();
      resolve({ authorized: sock.authorized, authorizationError: sock.authorizationError, chain });
    });
    sock.on('timeout', () => sock.destroy(new Error('tls timeout')));
    sock.on('error', reject);
  });
}

// Build the missing part of a host's chain from AIA urls. Returns a report; `ca` is set only when
// the downloaded certificates form a verified chain up to a trusted root.
export async function repairChain(host, port = 443) {
  const info = await peerChain(host, port);
  const report = { host, served: info.chain.map((c) => `${c.subject} ← ${c.issuer}`), downloaded: [], anchor: null, ca: null, error: null };
  if (!info.chain.length) { report.error = 'no certificate served'; return report; }
  let cert = new crypto.X509Certificate(info.chain[0].raw);
  const served = info.chain.slice(1).map((c) => new crypto.X509Certificate(c.raw));
  const pems = [];
  for (let depth = 0; depth < 6; depth++) {
    const root = trustedIssuer(cert);
    if (root) { report.anchor = cn(root.subject); break; }
    let next = served.find((c) => signedBy(cert, c)) || null; // the server may have sent part of the chain
    if (!next) {
      for (const u of aiaUrls(cert)) {
        try {
          const r = await rawGet(u, { timeout: 15000 });
          if (r.status !== 200 || !r.body.length) continue;
          const x = new crypto.X509Certificate(r.body);
          if (signedBy(cert, x)) { next = x; break; }
          report.downloaded.push(`${cn(x.subject)} from ${u} (does not sign ${cn(cert.subject)})`);
        } catch (e) { report.downloaded.push(`${u}: ${e.message}`); }
      }
    }
    if (!next || signedBy(next, next)) { report.error = `no trusted issuer found for ${cn(cert.subject)} (issuer ${cn(cert.issuer)})`; break; }
    report.downloaded.push(`${cn(next.subject)} ← ${cn(next.issuer)}`);
    pems.push(next.toString());
    cert = next;
  }
  if (report.anchor) { loadRoots(); report.ca = [...rootPems, ...pems]; }
  return report;
}

const CHAIN_ERR = /UNABLE_TO_VERIFY_LEAF_SIGNATURE|unable to get local issuer|unable to verify the first certificate|unable to get issuer certificate/i;

// GET with retries; on an incomplete-chain TLS error the missing issuers are fetched and the request retried.
export async function get(url, { headers = {}, tries = 3, pace = 0 } = {}) {
  const u = new URL(url);
  const host = u.hostname;
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
      if (CHAIN_ERR.test(e.message) && !extraCA.has(host)) {
        const rep = await repairChain(host, Number(u.port) || 443);
        extraCA.set(host, rep.ca);
        if (rep.ca) continue; // retry immediately with the completed chain
        lastErr = new Error(`${e.message}; chain repair failed: ${rep.error || 'unknown'}${rep.downloaded.length ? ` [${rep.downloaded.join('; ')}]` : ''}`);
        break;
      }
      if (i < tries) await sleep(1500 * i);
    }
  }
  throw new Error(`${lastErr?.message || 'request failed'} for ${url}`);
}
export async function getText(url, opts) { const r = await get(url, opts); const b = r.body; const t = b.toString('utf8'); return t.includes('�') ? b.toString('latin1') : t; }
export async function getJSON(url, opts) { return JSON.parse((await get(url, opts)).body.toString('utf8')); }
