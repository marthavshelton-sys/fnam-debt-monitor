// Site-wide password gate for https://fnam.mx/* — a Cloudflare Pages Function middleware.
//
// Runs before every other Function (functions/<section>/_middleware.js) and before every static asset.
// DORMANT until the password is set: while SITE_PASSWORD is unset every request passes through unchanged,
// so the site behaves exactly as before this file existed.
//
// To turn the password on — the only step the owner has to take — in the Cloudflare dashboard:
//   Workers & Pages → the fnam.mx Pages project → Settings → Variables and Secrets → Add
//   SITE_PASSWORD (type Secret), for BOTH the Production and the Preview environment, then redeploy
//   (Deployments → the latest deployment → Retry deployment; a push to main also does it).
// From then on every address on the site (pages, data files, PDFs, the status file, the quality pages)
// needs a session: a visitor without one gets a bilingual login form (HTTP 401) instead of the content,
// robots.txt answers "Disallow: /", every response carries "noindex", and the sessions last 30 days.
// Removing the variable and redeploying turns the gate off again.
//
// Variables read here (all optional except the first):
//   SITE_PASSWORD        the shared password.
//   SITE_SESSION_SECRET  random string that signs the session cookies. Default: a SHA-256 of the password,
//                        so changing the password also ends every session; set it to keep sessions across
//                        a password change.
//   SITE_SESSION_DAYS    session length in days (default 30). "?logout" on any address ends a session.
//
// Automation: a job that must read the live site while the gate is on (the US macro live check on GitHub's
// runner, tools/macro/live-check.mjs) logs in by POSTing the password to /login and keeping the cookie, or
// sends "Authorization: Bearer <SITE_PASSWORD>" on each request. The GitHub repository secret SITE_PASSWORD
// must therefore hold the same value as the Cloudflare variable.
//
// One password for everything: the section gates (functions/gap, oracle, oma, asur, qualitas) run after this one
// and stand down while SITE_PASSWORD is set, whatever their own *_PASSWORD variables hold; nothing to unset.
//
// Sessions are HMAC-signed cookies (nothing is stored server-side), the same design as the section gates.

const COOKIE = 'fnam_session';
const LOGIN_PATH = '/login';
const OPEN_PATHS = new Set(['/favicon.ico']); // the site's "F" mark; the login page's own tab icon

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
async function sessionSecret(env) {
  return env.SITE_SESSION_SECRET || (await sha256Hex('fnam-session:' + env.SITE_PASSWORD));
}
async function makeSession(env) {
  const days = Number(env.SITE_SESSION_DAYS) > 0 ? Number(env.SITE_SESSION_DAYS) : 30;
  const exp = Date.now() + days * 86400 * 1000;
  const sig = await sign(await sessionSecret(env), String(exp));
  return { value: `${exp}.${sig}`, maxAge: days * 86400 };
}
async function validSession(env, cookieValue) {
  if (!cookieValue) return false;
  const [exp, sig] = cookieValue.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = await sign(await sessionSecret(env), exp);
  return timingSafeEqual(sig, expected);
}
function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function redirect(location, setCookie) {
  const headers = { location, 'cache-control': 'no-store' };
  if (setCookie) headers['set-cookie'] = setCookie;
  return new Response(null, { status: 303, headers });
}
// Where to send the visitor after a successful login: the address they asked for, same origin only.
function safeNext(value) {
  const v = String(value || '');
  if (!/^\/(?!\/)[\x21-\x7e]{0,511}$/.test(v) || v.includes('\\') || v.startsWith(LOGIN_PATH)) return '/';
  return v.replace(/[?&]logout(=[^&]*)?/g, '').replace(/\?$/, '');
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// A browser navigation gets the login form; a data file, image or script requested without a session gets a bare 401.
function wantsHtml(request, url) {
  if (/\.(html?)$/.test(url.pathname) || url.pathname.endsWith('/') || url.pathname === LOGIN_PATH) return true;
  return /text\/html/.test(request.headers.get('accept') || '') && !/\.[a-z0-9]{1,5}$/i.test(url.pathname);
}

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231b4332'/%3E%3Cpath d='M16 46V18h26v6H23v6h16v6H23v10z' fill='%23f9f9f7'/%3E%3C/svg%3E";

function loginPage({ error, next }) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>FNAM · Acceso</title><link rel="icon" href="${ICON}">
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
.err{color:var(--err);font-weight:600;font-size:13px;margin-top:10px}.fine{font-size:11.5px;margin-top:16px}
</style></head><body><div class="card">
<div class="eyebrow">FNAM · Acceso restringido / Restricted access</div>
<h1>fnam.mx</h1>
<p>Este sitio es privado. Introduzca la contraseña para continuar.<br><span lang="en">This site is private. Enter the password to continue.</span></p>
<form method="post" action="${LOGIN_PATH}">
<input type="hidden" name="next" value="${esc(next)}">
<label for="pw">Contraseña / Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Entrar / Sign in</button>
${error ? `<div class="err">${error}</div>` : ''}
</form>
<p class="fine">Modelos y tableros construidos con datos públicos (informes de las empresas, SEC, BMV, fuentes oficiales). No contienen información privilegiada.<br><span lang="en">Models and dashboards built from public data (company reports, SEC, BMV, official sources). No privileged information.</span></p>
</div></body></html>`;
  return new Response(html, { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}

// The content, served to a visitor with a session: never indexed, never kept by a shared cache. Data files keep the
// no-store the site's _headers give them; other assets stay revalidatable (ETag) so the browser can reuse them.
async function serve(next, request, url) {
  const res = await next();
  const out = new Response(res.body, res);
  const cc = out.headers.get('cache-control') || '';
  const type = out.headers.get('content-type') || '';
  if (/no-store/.test(cc) || /text\/html|application\/json|application\/pdf/.test(type) || /\/data\//.test(url.pathname)) out.headers.set('cache-control', 'private, no-store');
  else out.headers.set('cache-control', 'private, max-age=0, must-revalidate');
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  return out;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (!env.SITE_PASSWORD) {
    // Dormant: the site is public. Only the login address needs an answer so a stale form never 404s.
    if (url.pathname === LOGIN_PATH) return redirect('/');
    return next();
  }
  if (url.searchParams.has('logout')) return redirect(url.pathname === LOGIN_PATH ? '/' : url.pathname, cookieHeader('', 0));

  if (method === 'POST' && url.pathname === LOGIN_PATH) {
    let password = '', nextPath = '/';
    try { const f = await request.formData(); password = String(f.get('password') || ''); nextPath = safeNext(f.get('next')); } catch { password = ''; }
    if (password && timingSafeEqual(password, env.SITE_PASSWORD)) {
      const s = await makeSession(env);
      return redirect(nextPath, cookieHeader(encodeURIComponent(s.value), s.maxAge));
    }
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return loginPage({ error: 'Contraseña incorrecta / Wrong password', next: nextPath });
  }

  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
  }
  if (OPEN_PATHS.has(url.pathname)) return serve(next, request, url);

  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '');
  const cookies = parseCookies(request.headers.get('cookie'));
  const authed = (bearer && timingSafeEqual(bearer[1].trim(), env.SITE_PASSWORD)) || (await validSession(env, cookies[COOKIE]));
  if (authed) {
    if (url.pathname === LOGIN_PATH) return redirect('/');
    return serve(next, request, url);
  }
  if (wantsHtml(request, url)) return loginPage({ error: '', next: url.pathname === LOGIN_PATH ? '/' : url.pathname + url.search });
  return new Response('Unauthorized', { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}
