// Site-wide password gate for https://fnam.mx/* — a Cloudflare Pages Function middleware.
//
// Runs before every other Function (functions/<section>/_middleware.js) and before every static asset.
// DORMANT until the password is set: while SITE_PASSWORD is unset every request passes through unchanged
// (the security headers, the www → apex redirect and the ?lang= rewrite below still apply).
//
// To turn the password on — in the Cloudflare dashboard:
//   Workers & Pages → the fnam.mx Pages project → Settings → Variables and Secrets → Add
//   SITE_PASSWORD (type Secret), for BOTH the Production and the Preview environment, then redeploy
//   (Deployments → the latest deployment → Retry deployment; a push to main also does it).
// From then on every address on the site (pages, data files, PDFs, the status file, the quality pages)
// needs a session: a visitor without one gets a bilingual login form (HTTP 401) instead of the content,
// robots.txt answers "Disallow: /", every response carries "noindex".
// Removing the variable and redeploying turns the gate off again.
//
// Variables read here (all optional except the first):
//   SITE_PASSWORD         the shared password. The ONLY way to authenticate is the login form (POST /login);
//                         the password is never accepted in a header or a query string.
//   SITE_SESSION_SECRET   random string (32+ characters) that signs the session cookies. SET IT: without it the
//                         secret is derived from the password (legacy fallback), so sessions can only be revoked
//                         by changing the password. Rotating this value ends every session at once.
//   SITE_SESSION_VERSION  any string, default "1". Change it to revoke every session without touching the
//                         password or the secret.
//   SITE_SESSION_DAYS     session length in days (default 7, maximum 30).
//   SITE_LOGIN_ATTEMPTS   wrong passwords allowed per client address in a window (default 8) before the address is
//                         locked for the window.
//   SITE_LOGIN_WINDOW_MIN the window in minutes (default 15).
//   FNAM_RATE             optional KV namespace binding; when bound, the attempt counters live there (global).
//                         Without it they live in the data center's cache (caches.default): best effort, per
//                         location, and still enough to stop online guessing from one address.
//
// Routes:
//   POST /login  the form (fields: password, next). A wrong password answers 401 after a short delay; too many
//                wrong passwords from one address answer 429 until the window ends.
//   GET  /logout ends the session (clears the cookie) and shows the login form. "?logout" on any address still works.
//
// Automation that must read the live site while the gate is on (the US macro live check on GitHub's runner,
// tools/macro/live-check.mjs) logs in by POSTing the password to /login and keeps the cookie. The GitHub
// repository secret SITE_PASSWORD must therefore hold the same value as the Cloudflare variable.
//
// One password for everything: the section gates (functions/gap, oracle, oma, asur, qualitas) run after this one
// and stand down while SITE_PASSWORD is set, whatever their own *_PASSWORD variables hold; nothing to unset.
//
// Also here, gate on or off:
//   * www.fnam.mx → fnam.mx (301, path and query kept) so a visitor never logs in twice.
//   * Security headers on every response (HSTS, CSP with frame-ancestors 'none', Permissions-Policy, nosniff,
//     Referrer-Policy); site/_headers carries the same set for the static assets.
//   * "?lang=en" / "?lang=es" on a page: the HTML is served in that language (the <html lang> attribute, and on the pages
//     that toggle es / en spans with the hidden attribute, those spans), not only after the page's own script runs.
//
// Sessions are HMAC-signed cookies (nothing is stored server-side), the same design as the section gates.

const COOKIE = 'fnam_session';
const LOGIN_PATH = '/login';
const LOGOUT_PATH = '/logout';
const APEX = 'fnam.mx';
const OPEN_PATHS = new Set(['/favicon.ico']); // the site's "F" mark; the login page's own tab icon
const SESSION_FORMAT = 'v2';

// Content-Security-Policy for the pages: self-hosted scripts and data files, inline scripts and styles (every page
// composes its markup in-page), Google Fonts, data: URIs for the icons, blob: for the PDFs the decks build in the
// browser. Nothing third-party: Cloudflare's Web Analytics beacon was switched off in the Pages project on 2026-10-06.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');
const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy': CSP,
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  'cross-origin-opener-policy': 'same-origin',
};

const enc = new TextEncoder();

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sign(secret, message) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function timingSafeEqual(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) { try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* malformed cookie: ignore */ } }
  }
  return out;
}
function randomToken(bytes = 16) {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- sessions ----
async function sessionSecret(env) {
  // Own secret when the owner set one; otherwise (legacy) derived from the password, so a password change still
  // ends every session. The owner is asked to set SITE_SESSION_SECRET (README, "Password protection").
  return env.SITE_SESSION_SECRET || (await sha256Hex('fnam-session:' + env.SITE_PASSWORD));
}
function sessionVersion(env) { return String(env.SITE_SESSION_VERSION || '1'); }
function sessionDays(env) { const d = Number(env.SITE_SESSION_DAYS); return d > 0 ? Math.min(d, 30) : 7; }
async function makeSession(env) {
  const days = sessionDays(env);
  const iat = Date.now(), exp = iat + days * 86400 * 1000;
  const sig = await sign(await sessionSecret(env), `${SESSION_FORMAT}.${sessionVersion(env)}.${iat}.${exp}`);
  return { value: `${SESSION_FORMAT}.${iat}.${exp}.${sig}`, maxAge: days * 86400 };
}
async function validSession(env, cookieValue) {
  if (!cookieValue) return false;
  const [fmt, iat, exp, sig] = cookieValue.split('.');
  if (fmt !== SESSION_FORMAT || !iat || !exp || !sig || !/^\d+$/.test(iat) || !/^\d+$/.test(exp)) return false;
  const now = Date.now();
  if (Number(exp) < now || Number(iat) > now + 60000) return false;
  const expected = await sign(await sessionSecret(env), `${SESSION_FORMAT}.${sessionVersion(env)}.${iat}.${exp}`);
  return timingSafeEqual(sig, expected);
}
function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// ---- wrong-password throttle (per client address) ----
function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
}
function attemptsPolicy(env) {
  const max = Number(env.SITE_LOGIN_ATTEMPTS), win = Number(env.SITE_LOGIN_WINDOW_MIN);
  return { max: max > 0 ? max : 8, windowSec: (win > 0 ? win : 15) * 60 };
}
async function attemptKey(ip) { return 'login-fail:' + (await sha256Hex(ip)).slice(0, 32); }
async function readAttempts(env, url, ip) {
  const key = await attemptKey(ip);
  try {
    if (env.FNAM_RATE && typeof env.FNAM_RATE.get === 'function') {
      const v = await env.FNAM_RATE.get(key, 'json');
      return v && typeof v.n === 'number' ? v : { n: 0, since: Date.now() };
    }
    const cache = caches.default;
    const hit = await cache.match(new Request(new URL('/__gate/' + key, url.origin).toString()));
    if (!hit) return { n: 0, since: Date.now() };
    const v = await hit.json();
    return v && typeof v.n === 'number' ? v : { n: 0, since: Date.now() };
  } catch { return { n: 0, since: Date.now() }; }
}
async function writeAttempts(env, url, ip, state, ttlSec) {
  const key = await attemptKey(ip);
  try {
    if (env.FNAM_RATE && typeof env.FNAM_RATE.put === 'function') {
      await env.FNAM_RATE.put(key, JSON.stringify(state), { expirationTtl: Math.max(60, ttlSec) });
      return;
    }
    const cache = caches.default;
    const req = new Request(new URL('/__gate/' + key, url.origin).toString());
    if (state.n <= 0) { await cache.delete(req); return; }
    await cache.put(req, new Response(JSON.stringify(state), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${Math.max(60, ttlSec)}` } }));
  } catch { /* throttle storage unavailable: the fixed delay below still applies */ }
}
async function lockedFor(env, url, ip) {
  const { max, windowSec } = attemptsPolicy(env);
  const st = await readAttempts(env, url, ip);
  const ageSec = (Date.now() - (st.since || 0)) / 1000;
  if (ageSec > windowSec) return 0;
  return st.n >= max ? Math.ceil(windowSec - ageSec) : 0;
}
async function recordFailure(env, url, ip) {
  const { windowSec } = attemptsPolicy(env);
  const st = await readAttempts(env, url, ip);
  const fresh = (Date.now() - (st.since || 0)) / 1000 > windowSec;
  const next = fresh ? { n: 1, since: Date.now() } : { n: st.n + 1, since: st.since || Date.now() };
  await writeAttempts(env, url, ip, next, windowSec);
}
async function clearFailures(env, url, ip) { await writeAttempts(env, url, ip, { n: 0, since: Date.now() }, 60); }

// ---- responses ----
function withSecurity(headers, extra = {}) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return headers;
}
function redirect(location, setCookie, status = 303) {
  const headers = withSecurity(new Headers({ location, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' }));
  if (setCookie) headers.set('set-cookie', setCookie);
  return new Response(null, { status, headers });
}
// Where to send the visitor after a successful login: the address they asked for (path, query and #fragment), same
// origin only. The fragment is added by the login form's own script (the browser never sends it to the server).
function safeNext(value) {
  const v = String(value || '');
  if (!/^\/(?!\/)[\x21-\x7e]{0,511}$/.test(v) || v.includes('\\') || v.startsWith(LOGIN_PATH) || v.startsWith(LOGOUT_PATH)) return '/';
  return v.replace(/[?&]logout(=[^&]*)?/g, '').replace(/\?(#|$)/, '$1');
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// A browser navigation gets the login form; a data file, image or script requested without a session gets a bare 401.
function wantsHtml(request, url) {
  if (/\.(html?)$/.test(url.pathname) || url.pathname.endsWith('/') || url.pathname === LOGIN_PATH || url.pathname === LOGOUT_PATH) return true;
  return /text\/html/.test(request.headers.get('accept') || '') && !/\.[a-z0-9]{1,5}$/i.test(url.pathname);
}

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231b4332'/%3E%3Cpath d='M16 46V18h26v6H23v6h16v6H23v10z' fill='%23f9f9f7'/%3E%3C/svg%3E";

function loginPage({ error, next, status = 401, retryAfter = 0, loggedOut = false }) {
  const nonce = randomToken(16);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>FNAM · Acceso</title><link rel="icon" href="${ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,600&display=swap">
<style>
:root{color-scheme:light dark;--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--muted:#52514e;--border:rgba(11,11,11,.12);--accent:#1b4332;--err:#d03b3b}
@media(prefers-color-scheme:dark){:root{--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--muted:#c3c2b7;--border:rgba(255,255,255,.14);--accent:#4f9a76}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--page);color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px}
.card{width:min(420px,100%);background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px 26px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
h1{font-family:"Source Serif 4",Georgia,serif;font-size:24px;margin:8px 0 4px}p{margin:6px 0;color:var(--muted);font-size:13.5px}
label{display:block;font-size:12.5px;font-weight:600;margin:18px 0 6px}
input{width:100%;font:inherit;padding:11px 12px;border:1px solid var(--border);border-radius:9px;background:transparent;color:var(--ink)}
button{margin-top:14px;width:100%;font:inherit;font-weight:700;padding:11px;border:0;border-radius:9px;background:var(--accent);color:#fff;cursor:pointer}
button[disabled]{opacity:.55;cursor:default}
.err{color:var(--err);font-weight:600;font-size:13px;margin-top:10px}.ok{color:var(--accent);font-weight:600;font-size:13px;margin-top:10px}.fine{font-size:11.5px;margin-top:16px}
</style></head><body><main class="card">
<div class="eyebrow">FNAM · Acceso restringido / Restricted access</div>
<h1>fnam.mx</h1>
<p>Este sitio es privado. Introduzca la contraseña para continuar.<br><span lang="en">This site is private. Enter the password to continue.</span></p>
<form method="post" action="${LOGIN_PATH}">
<input type="hidden" name="next" id="next" value="${esc(next)}">
<label for="pw">Contraseña / Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required${retryAfter ? ' disabled' : ''}>
<button type="submit"${retryAfter ? ' disabled' : ''}>Entrar / Sign in</button>
${loggedOut ? '<div class="ok">Sesión cerrada / Signed out</div>' : ''}
${error ? `<div class="err">${error}</div>` : ''}
</form>
<p class="fine">Modelos y tableros construidos con datos públicos (informes de las empresas, SEC, BMV, fuentes oficiales). No contienen información privilegiada.<br><span lang="en">Models and dashboards built from public data (company reports, SEC, BMV, official sources). No privileged information.</span></p>
</main>
<script nonce="${nonce}">
// Keep a #section deep link: the browser keeps the fragment in the address bar but never sends it to the server,
// so the form carries it to the address the visitor lands on after signing in.
(function(){try{var h=location.hash,n=document.getElementById('next');if(h&&h.length>1&&h.length<200&&/^#[A-Za-z0-9_:.-]+$/.test(h)&&n&&n.value.indexOf('#')<0)n.value+=h;}catch(e){}})();
</script></body></html>`;
  const headers = withSecurity(new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' }), {
    'content-security-policy': CSP.replace("script-src 'self' 'unsafe-inline'", `script-src 'nonce-${nonce}'`),
  });
  if (retryAfter) headers.set('retry-after', String(retryAfter));
  return new Response(html, { status, headers });
}

// "?lang=en" / "?lang=es": serve the page in that language in the HTML itself. Every page follows <html lang> (the landing
// page, the hubs and the Mexico fiscal monitor hide the other language with CSS on that attribute); the pages listed in
// HIDDEN_LANG_PREFIXES mark their copy as <span class="es">…</span><span class="en" hidden>…</span> and toggle the hidden
// attribute in script, so for them the attribute is toggled here too. The macro dashboards translate their strings in
// script (their markup is Spanish), so for them only the attribute changes.
const HIDDEN_LANG_PREFIXES = ['/fiscal/', '/gap/', '/oma/', '/asur/', '/qualitas/', '/gentera/', '/oracle/', '/hiperescaladores/'];
function requestedLang(url) {
  const v = (url.searchParams.get('lang') || '').toLowerCase();
  return v === 'en' || v === 'es' ? v : null;
}
function localize(res, url, lang) {
  const type = res.headers.get('content-type') || '';
  if (!/text\/html/.test(type) || typeof HTMLRewriter === 'undefined') return res;
  const other = lang === 'en' ? 'es' : 'en';
  const toggles = HIDDEN_LANG_PREFIXES.some((p) => url.pathname.startsWith(p));
  let rw = new HTMLRewriter().on('html', { element(e) { e.setAttribute('lang', lang === 'es' ? (e.getAttribute('lang') || 'es') : 'en'); } });
  if (toggles) rw = rw
    .on(`.${other}`, { element(e) { e.setAttribute('hidden', ''); } })
    .on(`.${lang}`, { element(e) { e.removeAttribute('hidden'); } });
  return rw.transform(res);
}

// The content, served to a visitor with a session: never indexed, never kept by a shared cache. Data files keep the
// no-store the site's _headers give them; other assets stay revalidatable (ETag) so the browser can reuse them.
async function serve(next, request, url, { gated }) {
  const res = await next();
  const out = new Response(res.body, res);
  if (gated) {
    const cc = out.headers.get('cache-control') || '';
    const type = out.headers.get('content-type') || '';
    if (/no-store/.test(cc) || /text\/html|application\/json|application\/pdf/.test(type) || /\/data\//.test(url.pathname)) out.headers.set('cache-control', 'private, no-store');
    else out.headers.set('cache-control', 'private, max-age=0, must-revalidate');
    out.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  withSecurity(out.headers);
  const lang = requestedLang(url);
  return lang ? localize(out, url, lang) : out;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // www (or any other prefix of the apex) → apex, so a visitor never holds two sessions.
  if (url.hostname !== APEX && url.hostname.endsWith('.' + APEX) && !/\.pages\.dev$/.test(url.hostname)) {
    url.hostname = APEX; url.protocol = 'https:'; url.port = '';
    return redirect(url.toString(), null, 301);
  }

  if (!env.SITE_PASSWORD) {
    // Dormant: the site is public. Only the login addresses need an answer so a stale form never 404s.
    if (url.pathname === LOGIN_PATH || url.pathname === LOGOUT_PATH) return redirect('/');
    return serve(next, request, url, { gated: false });
  }

  const ip = clientIp(request);

  if (url.pathname === LOGOUT_PATH || url.searchParams.has('logout')) {
    if (url.pathname === LOGOUT_PATH) {
      const page = loginPage({ error: '', next: '/', loggedOut: true });
      page.headers.set('set-cookie', cookieHeader('', 0));
      return page;
    }
    return redirect(url.pathname === LOGIN_PATH ? '/' : url.pathname, cookieHeader('', 0));
  }

  if (method === 'POST' && url.pathname === LOGIN_PATH) {
    let password = '', nextPath = '/';
    try { const f = await request.formData(); password = String(f.get('password') || ''); nextPath = safeNext(f.get('next')); } catch { password = ''; }
    const wait = await lockedFor(env, url, ip);
    if (wait > 0) return loginPage({ error: `Demasiados intentos. Vuelva a intentarlo en ${Math.ceil(wait / 60)} min / Too many attempts. Try again in ${Math.ceil(wait / 60)} min`, next: nextPath, status: 429, retryAfter: wait });
    if (password && timingSafeEqual(password, env.SITE_PASSWORD)) {
      await clearFailures(env, url, ip);
      const s = await makeSession(env);
      return redirect(nextPath, cookieHeader(encodeURIComponent(s.value), s.maxAge));
    }
    await recordFailure(env, url, ip);
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return loginPage({ error: 'Contraseña incorrecta / Wrong password', next: nextPath });
  }

  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', { status: 200, headers: withSecurity(new Headers({ 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' })) });
  }
  if (OPEN_PATHS.has(url.pathname)) return serve(next, request, url, { gated: true });

  const cookies = parseCookies(request.headers.get('cookie'));
  const authed = await validSession(env, cookies[COOKIE]);
  if (authed) {
    if (url.pathname === LOGIN_PATH) return redirect('/');
    return serve(next, request, url, { gated: true });
  }
  if (wantsHtml(request, url)) {
    const wait = await lockedFor(env, url, ip);
    return loginPage({ error: wait > 0 ? `Demasiados intentos. Vuelva a intentarlo en ${Math.ceil(wait / 60)} min / Too many attempts. Try again in ${Math.ceil(wait / 60)} min` : '', next: url.pathname === LOGIN_PATH ? '/' : url.pathname + url.search, status: wait > 0 ? 429 : 401, retryAfter: wait });
  }
  return new Response('Unauthorized', { status: 401, headers: withSecurity(new Headers({ 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' })) });
}
