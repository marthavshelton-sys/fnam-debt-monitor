// Unknown sections of https://fnam.mx/macro/ answer 404 — a Cloudflare Pages Function middleware.
//
// The US macro dashboard is one static page whose sections are addressed as ?view=<id>. Static
// hosting never sees the query string, so every ?view= used to answer 200, a mistyped or retired
// address included. The page shows its own "Section Not Found" state for such an address, with
// links to every section; this middleware gives that response the matching status, 404, so
// search engines and link checkers treat the address as missing. Every other request under
// /macro/ (the page with a known section or none, its image, status.json) passes through as is.
//
// VIEWS lists the page's sections: the data-view ids of the navigation rail in
// tools/macro/macro_monitor_template.html. tools/macro/build-page.mjs refuses to build the page
// when the two lists differ, so adding or renaming a section means updating this list too.
//
// Cloudflare Pages Functions live in /functions at the project root; the file's path decides the
// route it covers: functions/macro/ → /macro/*.

const VIEWS = ['cpi', 'pce', 'ppi', 'unemployment', 'payrolls', 'cuts', 'gdp', 'productivity', 'income', 'retail', 'profits', 'fiscal', 'confidence', 'hhdebt', 'debt', 'banks', 'nonbank', 'fincond', 'supply', 'cape', 'spr'];

export async function onRequest({ request, next }) {
  const res = await next();
  const url = new URL(request.url);
  const view = url.searchParams.get('view');
  // Only the page itself, only a normal 200 answer, and only a view the page does not have.
  if (!view || VIEWS.includes(view) || res.status !== 200 || !/^\/macro\/(index\.html)?$/.test(url.pathname)) return res;
  return new Response(res.body, { status: 404, statusText: 'Not Found', headers: res.headers });
}
