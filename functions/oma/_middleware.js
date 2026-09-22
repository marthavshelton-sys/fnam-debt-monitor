// Password gate for https://fnam.mx/oma/* — a Cloudflare Pages Function middleware.
//
// Every request under /oma/ (the page, its data files, everything) passes through here before
// the static asset is served. Without a valid session cookie the visitor sees a login form; the
// static files are never sent. Sessions are HMAC-signed cookies, so nothing is stored server-side.
//
// Configure in the Cloudflare dashboard: Workers & Pages → this Pages project → Settings →
// Variables and Secrets (set them for BOTH Production and Preview):
//   OMA_PASSWORD        the shared password. While it is UNSET the gate is dormant: /oma/ is served
//                       openly (still with noindex / no-store headers). Setting the variable and
//                       redeploying turns the password on; removing it turns it off again.
//   OMA_SESSION_SECRET  optional. Random string used to sign session cookies. Defaults to a
//                       SHA-256 of the password; set it explicitly so changing the password does
//                       not have to invalidate existing sessions, or leave it to get exactly that.
//   OMA_SESSION_DAYS    optional. Session length in days (default 30). "?logout" ends a session.
//
// Cloudflare Pages Functions live in /functions at the project root (the directory that holds
// the `site/` build output); the file's path decides the route it guards: functions/oma/ → /oma/*.

const COOKIE = 'oma_session';
const LOGIN_PATH = '/oma/login';

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
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
async function sessionSecret(env) {
  return env.OMA_SESSION_SECRET || (await sha256Hex('oma-session:' + env.OMA_PASSWORD));
}
async function makeSession(env) {
  const days = Number(env.OMA_SESSION_DAYS) > 0 ? Number(env.OMA_SESSION_DAYS) : 30;
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
  return `${COOKIE}=${value}; Path=/oma; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function page({ title, body, status = 200, headers = {} }) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${title}</title>
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
</style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}

function loginPage(error) {
  return page({
    title: 'OMA · Modelo financiero — acceso',
    status: error ? 401 : 200,
    body: `<div class="eyebrow">FNAM · Acceso restringido / Restricted access</div>
<h1>Modelo financiero OMA</h1>
<p>Esta página está reservada. Introduzca la contraseña para continuar.<br><span lang="en">This page is private. Enter the password to continue.</span></p>
<form method="post" action="${LOGIN_PATH}">
<label for="pw">Contraseña / Password</label>
<input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
<button type="submit">Entrar / Sign in</button>
${error ? `<div class="err">${error}</div>` : ''}
</form>
<p class="fine">Datos públicos (informes trimestrales, 20-F y comunicados de OMA, BMV/SEC). No contiene información privilegiada.</p>`,
  });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!env.OMA_PASSWORD) {
    // Password protection not enabled yet: serve the page, keep it out of search engines and caches.
    if (request.method === 'POST' && url.pathname === LOGIN_PATH) return new Response(null, { status: 303, headers: { location: '/oma/' } });
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set('cache-control', 'private, no-store');
    out.headers.set('x-robots-tag', 'noindex, nofollow');
    return out;
  }
  const cookies = parseCookies(request.headers.get('cookie'));

  if (url.searchParams.has('logout')) {
    return new Response(null, { status: 303, headers: { location: '/oma/', 'set-cookie': cookieHeader('', 0), 'cache-control': 'no-store' } });
  }

  if (request.method === 'POST' && url.pathname === LOGIN_PATH) {
    let password = '';
    try { password = String((await request.formData()).get('password') || ''); } catch { password = ''; }
    if (password && timingSafeEqual(password, env.OMA_PASSWORD)) {
      const s = await makeSession(env);
      return new Response(null, { status: 303, headers: { location: '/oma/', 'set-cookie': cookieHeader(encodeURIComponent(s.value), s.maxAge), 'cache-control': 'no-store' } });
    }
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return loginPage('Contraseña incorrecta / Wrong password');
  }

  if (await validSession(env, cookies[COOKIE])) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set('cache-control', 'private, no-store');
    out.headers.set('x-robots-tag', 'noindex, nofollow');
    return out;
  }
  // Data files and any other asset requested without a session: 401, never the content.
  if (!/\.(html?)?$/.test(url.pathname) && !url.pathname.endsWith('/')) {
    return new Response('Unauthorized', { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  return loginPage();
}
