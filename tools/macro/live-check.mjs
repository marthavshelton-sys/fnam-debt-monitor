#!/usr/bin/env node
// Checks the published US macro dashboard the way a visitor gets it. The workflow
// .github/workflows/macro-live-check.yml runs it on GitHub's runner after every
// refresh; it only loads public pages and changes nothing.
//
//  1. The deploy arrived: the live page is byte for byte main's site/macro/index.html
//     (Cloudflare publishes each push a minute or two later; --wait gives it time).
//  2. Every section, in both languages, in a real browser with the page's own web
//     fonts: no script errors, no "undefined"/"NaN" or raw markup in the text, the
//     four "At a glance" lines filled, the section's own title, description,
//     canonical and hreflang addresses, every chart labelled for screen readers,
//     every sparkline drawn, every image loaded, chart text inside its panel, every
//     line inside its chart.
//  3. Phones at 390 and 360 px, light and dark: no text below 11 px and nothing wider
//     than the screen. Desktops at 1280 and 1024 px: no sideways scroll.
//  4. An unknown ?view= shows the page's "Section Not Found" state (never another section),
//     marked noindex, and the server answers it with 404; a missing address on the site
//     answers 404 and /favicon.ico is an image. Section links are links, and following
//     one updates the address, the title and the browser history.
//
//   node tools/macro/live-check.mjs [--url URL] [--expect FILE | --expect-ref BRANCH]
//        [--wait MINUTES] [--shots DIR] [--summary FILE] [--report FILE] [--local]
//
// Exit 0: every check passed. 1: problems found (listed in the report). 2: the check
// itself could not run. The report goes to stdout and, on the runner, to the job
// summary; the workflow reads failed/count/headline from $GITHUB_OUTPUT.
//
// --local keeps every request on the page's own host (web fonts included), for trying
// the script in a session against `python3 -m http.server 8123 --directory site`:
//   node tools/macro/live-check.mjs --url http://localhost:8123/macro/ --expect site/macro/index.html --local
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt; };
const pageUrl = opt("--url", "https://fnam.mx/macro/");
const expectFile = opt("--expect");
const expectRef = opt("--expect-ref");
const waitMin = Math.max(0, +opt("--wait", "0") || 0);
const shotsDir = opt("--shots");
const summaryFile = opt("--summary", process.env.GITHUB_STEP_SUMMARY);
const reportFile = opt("--report");
const local = args.includes("--local");
const origin = new URL(pageUrl).origin;
// The site-wide password gate (functions/_middleware.js): when the repository secret SITE_PASSWORD is set, the
// check logs in once (POST /login) and sends the session cookie with every request, browser pages included.
// Without the secret, a gated site answers 401 and the deploy check says what to add.
const sitePassword = process.env.SITE_PASSWORD || "";
let sessionCookie = null; // { name, value } once logged in
let gateBlocked = false;  // the gate refused this run: the browser pass would only repeat the 401
const cookieHeaders = () => (sessionCookie ? { cookie: `${sessionCookie.name}=${sessionCookie.value}` } : {});
async function login() {
  if (!sitePassword) return;
  try {
    const r = await fetch(new URL("/login", pageUrl), { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ password: sitePassword, next: "/" }) });
    const m = /fnam_session=([^;]+)/.exec(r.headers.get("set-cookie") || "");
    if (m) { sessionCookie = { name: "fnam_session", value: m[1] }; notes.push("Password gate: on; logged in with SITE_PASSWORD"); }
    else if (r.status === 401) problem("deploy", "the password gate rejected SITE_PASSWORD: the GitHub secret differs from the Cloudflare variable");
    else notes.push("Password gate: off (no session issued); SITE_PASSWORD not needed");
  } catch (e) { problem("deploy", "could not log in through the password gate (" + e.message.split("\n")[0] + ")"); }
}

const problems = [];       // { where: the page or pass, section, what }
const notes = [];
const problem = (where, what, section = "") => problems.push({ where, section, what });
const sha = buf => createHash("sha256").update(buf).digest("hex");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

// ---------------- 1. the deploy ----------------
// The expected page is re-read on every attempt, so a newer refresh landing on main
// while this waits moves the target with it.
function expectedPage() {
  if (expectRef) {
    // No --depth: in a full clone that would make the repository shallow.
    execFileSync("git", ["fetch", "-q", "origin", expectRef], { stdio: "ignore" });
    return {
      buf: execFileSync("git", ["show", "FETCH_HEAD:site/macro/index.html"], { maxBuffer: 64 << 20 }),
      label: "main's site/macro/index.html at " + execFileSync("git", ["rev-parse", "--short", "FETCH_HEAD"]).toString().trim(),
    };
  }
  if (expectFile) return { buf: readFileSync(expectFile), label: expectFile };
  return null;
}
// Cloudflare adds its Web Analytics beacon to the HTML it serves when the project has analytics on
// (a comment plus one script tag before </body>). It is not part of the page, so the deploy comparison
// removes it before hashing; the report notes that it was there.
const EDGE_BEACON = /(?:<!--\s*Cloudflare (?:Pages|Web) Analytics\s*-->\s*)?<script[^>]*static\.cloudflareinsights\.com\/beacon\.min\.js[^>]*>\s*<\/script>/g;
let edgeNoted = false;
function withoutEdge(buf) {
  const text = buf.toString("utf8"), bare = text.replace(EDGE_BEACON, "");
  if (bare !== text && !edgeNoted) { edgeNoted = true; notes.push("Edge: Cloudflare's Web Analytics beacon is injected into the page; ignored in the deploy comparison"); }
  return bare === text ? buf : Buffer.from(bare, "utf8");
}
async function livePage() {
  const r = await fetch(pageUrl + (pageUrl.includes("?") ? "&" : "?") + "livecheck=" + Date.now(), { headers: { "cache-control": "no-cache", ...cookieHeaders() } });
  return { status: r.status, type: r.headers.get("content-type") || "", buf: Buffer.from(await r.arrayBuffer()) };
}
async function checkDeploy() {
  const deadline = Date.now() + waitMin * 60000;
  for (let attempt = 1; ; attempt++) {
    let live, exp;
    try { live = await livePage(); exp = expectedPage(); }
    catch (e) { live = null; exp = null; if (Date.now() >= deadline) { problem("deploy", "could not fetch the page or main's copy (" + e.message.split("\n")[0] + ")"); return; } }
    if (live && live.status === 200) live.bare = withoutEdge(live.buf);
    if (live && live.status === 200 && (!exp || sha(live.bare) === sha(exp.buf))) {
      notes.push(exp ? `Deploy: the live page is ${exp.label} (sha256 ${sha(live.buf).slice(0, 12)}, ${live.buf.length.toLocaleString("en-US")} bytes)` : `Deploy: not compared (no --expect); live page ${live.buf.length.toLocaleString("en-US")} bytes`);
      return;
    }
    // A 401 never clears by waiting: the password gate is on and this run holds no session (the repository
    // secret is missing, or it differs from the Cloudflare variable). Say so at once instead of spending the wait.
    if (live && live.status === 401) {
      problem("deploy", sitePassword
        ? "the page answered HTTP 401 after the login with SITE_PASSWORD: the GitHub secret differs from the Cloudflare variable"
        : "the page answered HTTP 401: the site is password-protected; add the repository secret SITE_PASSWORD with the same value as the Cloudflare variable");
      gateBlocked = true;
      return;
    }
    if (Date.now() >= deadline) {
      if (live && live.status !== 200) problem("deploy", `the page answered HTTP ${live.status}`);
      else if (live && exp) {
        // Where the two differ, so the report says whether the deploy is stale or the edge rewrote the page.
        const lb = live.bare || live.buf;
        const n = Math.min(lb.length, exp.buf.length); let i = 0; while (i < n && lb[i] === exp.buf[i]) i++;
        const at = (buf) => buf.subarray(Math.max(0, i - 60), Math.min(buf.length, i + 160)).toString("utf8").replace(/\s+/g, " ");
        problem("deploy", `after ${waitMin} min the live page is still not ${exp.label} (live sha256 ${sha(live.buf).slice(0, 12)}, ${live.buf.length.toLocaleString("en-US")} bytes; expected ${sha(exp.buf).slice(0, 12)}, ${exp.buf.length.toLocaleString("en-US")} bytes; first difference at byte ${i.toLocaleString("en-US")}; live: "${at(lb)}"; expected: "${at(exp.buf)}"): Cloudflare has not published the latest commit, or the edge rewrote the page`);
      }
      return;
    }
    await sleep(30000);
  }
}

// ---------------- 2-4. the pages in a browser ----------------
async function loadChromium() {
  for (const spec of ["playwright", process.env.PLAYWRIGHT_MODULE, "/opt/node22/lib/node_modules/playwright/index.mjs"].filter(Boolean)) {
    try { return (await import(spec)).chromium; } catch (e) { /* next */ }
  }
  throw new Error("playwright is not installed");
}

// Runs inside the page: everything wrong with the section on screen, as short lines.
function inspectSection(o) {
  const out = [];
  const view = document.querySelector(".view.active");
  if (!view) return ["no section is showing"];
  const vw = window.innerWidth;
  const visible = el => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const inScroller = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === "auto" || ox === "scroll") return true; } return false; };
  const cls = el => (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || "";
  const name = el => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (String(cls(el)).trim() ? "." + String(cls(el)).trim().split(/\s+/)[0] : "");
  const short = s => s.replace(/\s+/g, " ").trim().slice(0, 70);
  const denyEs = [/excess CAPE yield/i, /Surveys of Consumers/i, /Monthly Treasury Statement/i, /\b\d{2}-(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)-\d{4}\b/];
  // visible text
  const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent; if (!t.trim()) continue;
    const el = n.parentElement; if (!el || el.closest("svg") || !visible(el)) continue;
    if (/\bundefined\b|\bNaN\b|\[object |\bInfinity\b/.test(t)) out.push("broken value in text: " + short(t));
    if (/<\/?[a-z][a-z0-9]*(\s[^>]*)?>|&(amp|lt|gt|nbsp|quot|#\d+);/i.test(t)) out.push("raw markup shown as text: " + short(t));
    if (o.lang === "es") for (const re of denyEs) if (re.test(t)) out.push("English or capitalised month in Spanish copy: " + short(t));
    if (o.phone && !el.closest(".tooltip")) { const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 10.95) out.push(`text at ${fs}px (floor 11px): ` + short(t)); }
  }
  // charts: labelled for screen readers, text readable and inside the chart's panel
  view.querySelectorAll("svg").forEach(svg => {
    if (svg.parentElement.closest("svg") || !visible(svg)) return;
    if (svg.matches("svg.kpi-spark") && !svg.querySelector("path[d], polyline[points], circle, rect, line")) out.push("empty sparkline: svg#" + svg.id);
    // decorative graphics (sparklines, icons) are hidden from screen readers; the rest are charts
    if (svg.closest('[aria-hidden="true"]')) return;
    if (!(svg.getAttribute("role") === "img" && (svg.getAttribute("aria-label") || "").trim())) out.push("chart without a screen-reader label: " + name(svg));
    // every line stays between the chart's gridlines: a point placed outside them is a
    // month the axis does not have (October 2025 CPI drew a stray line across two charts)
    const grid = [...svg.querySelectorAll("line")].filter(l => l.getAttribute("y1") === l.getAttribute("y2") && +l.getAttribute("x2") > +l.getAttribute("x1"));
    if (grid.length) {
      const left = Math.min(...grid.map(l => +l.getAttribute("x1"))), right = Math.max(...grid.map(l => +l.getAttribute("x2")));
      svg.querySelectorAll('path[fill="none"]').forEach(pa => {
        const xs = [...(pa.getAttribute("d") || "").matchAll(/[ML]\s*(-?[\d.]+)[ ,]/g)].map(m => +m[1]);
        if (xs.some(x => x < left - 1.5 || x > right + 1.5)) out.push("a line runs outside its chart: " + name(svg));
      });
    }
  });
  view.querySelectorAll("svg text").forEach(tx => {
    if (!visible(tx)) return;
    if (/\bundefined\b|\bNaN\b/.test(tx.textContent)) out.push("broken value in chart: " + short(tx.textContent));
    const b = tx.getBoundingClientRect(), id = (tx.closest("svg[id]") || {}).id || "?";
    if (o.phone) {
      const m = tx.getScreenCTM();
      if (m) { const px = parseFloat(tx.getAttribute("font-size") || getComputedStyle(tx).fontSize) * Math.hypot(m.a, m.b); if (px < 10.95) out.push(`chart text at ${px.toFixed(1)}px (floor 11px) in #${id}: ` + short(tx.textContent)); }
      if (!inScroller(tx) && (b.left < -0.5 || b.right > vw + 0.5)) out.push(`chart text off screen in #${id}: ` + short(tx.textContent));
    } else {
      const panel = tx.closest(".panel, .cat-card, .kpi-tile");
      if (panel && !inScroller(tx)) { const pb = panel.getBoundingClientRect(); if (b.left < pb.left - 0.5 || b.right > pb.right + 0.5) out.push(`chart text outside its panel in #${id}: ` + short(tx.textContent)); }
    }
  });
  // images, the "At a glance" card
  view.querySelectorAll("img").forEach(img => { if (visible(img) && !(img.complete && img.naturalWidth > 0)) out.push("image did not load: " + img.getAttribute("src")); });
  const exec = view.querySelector(".exec");
  if (exec) {
    const items = [...exec.querySelectorAll(".exec-item")].map(i => i.textContent.length - ((i.querySelector(".exec-k") || {}).textContent || "").length);
    if (items.length !== 4 || items.some(n => n < 15)) out.push(`"At a glance" card incomplete (${items.length} of 4 lines filled)`);
  }
  // nothing wider than the screen
  if (o.phone) view.querySelectorAll("*").forEach(el => {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
    if (!visible(el) || inScroller(el)) return;
    const b = el.getBoundingClientRect();
    if (b.right > vw + 0.5 || b.left < -0.5) out.push(`${name(el)} runs off screen (${Math.round(b.left)}..${Math.round(b.right)} px)`);
  });
  const extra = document.documentElement.scrollWidth - vw;
  if (extra > 0) out.push(`page scrolls sideways by ${extra}px`);
  return [...new Set(out)];
}

async function run() {
  await login();
  await checkDeploy();
  if (gateBlocked) return;
  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const shots = [];
  const shoot = async (page, name) => { if (!shotsDir || shots.length >= 16) return; const f = join(shotsDir, name.replace(/[^\w.-]+/g, "_") + ".png"); await page.screenshot({ path: f }); shots.push(f); };
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });
  let fontsOk = null, views = null;

  async function open(width, height, lang, scheme, query) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
    if (sessionCookie) await ctx.addCookies([{ ...sessionCookie, url: origin }]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push("script error: " + e.message.split("\n")[0]));
    page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console error: " + m.text().slice(0, 140)); });
    page.on("response", r => { if (r.url().startsWith(origin) && r.status() >= 400) errors.push(`HTTP ${r.status()} for ${r.url().replace(origin, "")}`); });
    if (local) await page.route("**/*", r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
    // One retry, so a single dropped connection is not reported as an outage.
    try { await page.goto(pageUrl + query, { waitUntil: "load", timeout: 90000 }); }
    catch (e) { await page.waitForTimeout(20000); await page.goto(pageUrl + query, { waitUntil: "load", timeout: 90000 }); }
    await page.evaluate(() => document.fonts.ready);
    if (fontsOk === null && !local) fontsOk = await page.evaluate(() => document.fonts.check('14px "Public Sans"'));
    if (!views) views = await page.$$eval(".rail-item[data-view]", els => els.map(e => e.getAttribute("data-view")));
    await page.waitForTimeout(150);
    return { ctx, page, errors };
  }
  async function show(page, v, phone) {
    if (phone) await page.selectOption("#mobileNav", "view:" + v);
    else await page.click(`.rail-item[data-view="${v}"]`);
    await page.waitForFunction(id => (document.querySelector(".view.active") || {}).id === "view-" + id, v, { timeout: 10000 });
    await page.waitForTimeout(120);
  }
  const publicUrl = (v, lang) => { const q = []; if (v !== views[0]) q.push("view=" + v); if (lang === "en") q.push("lang=en"); return "https://fnam.mx/macro/" + (q.length ? "?" + q.join("&") : ""); };

  const passes = [
    { w: 1280, h: 900, scheme: "light", phone: false, meta: true },
    { w: 1024, h: 800, scheme: "light", phone: false },
    { w: 390, h: 844, scheme: "light", phone: true }, { w: 390, h: 844, scheme: "dark", phone: true },
    { w: 360, h: 780, scheme: "light", phone: true }, { w: 360, h: 780, scheme: "dark", phone: true },
  ];
  for (const pass of passes) for (const lang of ["es", "en"]) {
    const tag = `${pass.phone ? "phone" : "desktop"} ${pass.w}px ${lang}${pass.scheme === "dark" ? " dark" : ""}`;
    let s;
    try { s = await open(pass.w, pass.h, lang, pass.scheme, "?lang=" + lang); }
    catch (e) { problem(tag, "page did not load (" + e.message.split("\n")[0] + ")"); continue; }
    const titles = new Set();
    for (const v of views) {
      const where = tag;
      try {
        await show(s.page, v, pass.phone);
        const found = await s.page.evaluate(inspectSection, { lang, phone: pass.phone });
        found.slice(0, 5).forEach(f => problem(where, f, v));
        if (found.length > 5) problem(where, `and ${found.length - 5} more`, v);
        if (pass.meta) {
          const m = await s.page.evaluate(() => ({ title: document.title, lang: document.documentElement.lang, desc: (document.querySelector('meta[name="description"]') || {}).content || "", og: (document.querySelector('meta[property="og:title"]') || {}).content || "", canon: (document.querySelector('link[rel="canonical"]') || {}).href || "", es: (document.querySelector('link[hreflang="es-MX"]') || {}).href || "", en: (document.querySelector('link[hreflang="en"]') || {}).href || "", xd: (document.querySelector('link[hreflang="x-default"]') || {}).href || "", search: location.search }));
          if (!m.title.includes("FNAM") || titles.has(m.title)) problem(where, `title "${m.title}" is missing the site name or repeats another section's`, v);
          titles.add(m.title);
          if (!m.lang.startsWith(lang)) problem(where, `page language is "${m.lang}"`, v);
          if (m.desc.length < 40) problem(where, "description missing or too short", v);
          if (m.og !== m.title) problem(where, "og:title differs from the title", v);
          if (m.canon !== publicUrl(v, lang)) problem(where, `canonical is ${m.canon}, expected ${publicUrl(v, lang)}`, v);
          if (m.es !== publicUrl(v, "es") || m.en !== publicUrl(v, "en") || m.xd !== publicUrl(v, "es")) problem(where, "hreflang addresses do not point at this section", v);
          if (new URLSearchParams(m.search).get("view") !== v) problem(where, `address shows ${m.search || "no section"}`, v);
        }
        if (found.length) await shoot(s.page, `${tag}-${v}`);
      } catch (e) { problem(where, "could not check (" + e.message.split("\n")[0] + ")", v); }
    }
    [...new Set(s.errors)].slice(0, 5).forEach(e => problem(tag, e));
    if (pass.meta) {
      // links, address and history
      const links = await s.page.$$eval(".rail-item[data-view]", els => els.filter(e => e.tagName !== "A" || !/[?&]view=/.test(e.getAttribute("href") || "")).length);
      if (links) problem(tag, `${links} section menu items are not links`);
      if (!(await s.page.$('link[rel="icon"]'))) problem(tag, "the page has no icon (link rel=icon)");
      try {
        await show(s.page, views[0], false);
        const before = await s.page.evaluate(() => ({ t: document.title, q: location.search }));
        const target = views[Math.min(8, views.length - 1)];
        await show(s.page, target, false);
        const after = await s.page.evaluate(() => ({ t: document.title, q: location.search }));
        await s.page.goBack(); await s.page.waitForTimeout(200);
        const back = await s.page.evaluate(() => ({ id: (document.querySelector(".view.active") || {}).id, q: location.search }));
        if (!after.q.includes("view=" + target) || after.t === before.t) problem(tag, `opening "${target}" left the address at ${after.q} and the title at "${after.t}"`);
        if (back.id !== "view-" + views[0]) problem(tag, `the browser's Back button did not return to "${views[0]}" (showing ${back.id}, address ${back.q})`);
      } catch (e) { problem(tag, "navigation check failed (" + e.message.split("\n")[0] + ")"); }
      if (lang === "en" && views.includes("payrolls")) { await show(s.page, "payrolls", false); await shoot(s.page, "reference-desktop-en-payrolls"); }
    }
    if (pass.phone && pass.w === 390 && pass.scheme === "light" && lang === "es") { await show(s.page, views[0], true); await shoot(s.page, "reference-phone-es-" + views[0]); }
    await s.ctx.close();
  }
  // an unknown section: the page's own "not found" state, with every section as a link, the
  // address left as typed, noindex; on the live site the server's 404 (functions/macro/_middleware.js)
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    if (sessionCookie) await ctx.addCookies([{ ...sessionCookie, url: origin }]);
    const page = await ctx.newPage();
    if (local) await page.route("**/*", r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
    const resp = await page.goto(pageUrl + "?view=zz-live-check&lang=en", { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ id: (document.querySelector(".view.active") || {}).id, desc: (document.getElementById("nfDesc") || {}).textContent || "",
      links: document.querySelectorAll("#nfList a").length, current: document.querySelectorAll(".rail-item.active").length,
      robots: (document.querySelector('meta[name="robots"]') || {}).content || "", q: location.search }));
    if (r.id !== "view-notfound" || !r.desc.includes("zz-live-check")) problem("unknown ?view=", `showing ${r.id} ("${r.desc.slice(0, 60)}") instead of "Section Not Found"`);
    if (r.links !== views.length || r.current) problem("unknown ?view=", `${r.links} section links (expected ${views.length}); ${r.current} section marked as current`);
    if (!/noindex/.test(r.robots)) problem("unknown ?view=", "the not-found state is not marked noindex");
    if (!r.q.includes("view=zz-live-check")) problem("unknown ?view=", `the address was changed to ${r.q}`);
    if (!local && resp && resp.status() !== 404) problem("unknown ?view=", `the server answered ${resp.status()}, not 404`);
    await ctx.close();
  } catch (e) { problem("unknown ?view=", "could not check (" + e.message.split("\n")[0] + ")"); }
  // the site: a missing address answers 404 (site/404.html), never the home page, and the
  // browser's default icon request gets an image
  if (!local) {
    for (const [path, want] of [["/macro/zz-live-check-missing", 404], ["/favicon.ico", 200]]) {
      try {
        const res = await fetch(new URL(path, pageUrl), { redirect: "manual", headers: cookieHeaders() });
        const type = res.headers.get("content-type") || "";
        if (res.status !== want) problem("site", `${path} answered ${res.status}, expected ${want}`);
        else if (path === "/favicon.ico" && !/^image\//.test(type)) problem("site", `${path} is served as "${type}", not an image`);
      } catch (e) { problem("site", `${path} could not be requested (${e.message})`); }
    }
  }
  await browser.close();

  notes.push(`Coverage: ${views ? views.length : 0} sections × Spanish and English; desktop 1280 and 1024 px; phones 390 and 360 px, light and dark`);
  if (local) notes.push("Web fonts: blocked (--local); layout checked with fallback fonts");
  else notes.push(fontsOk ? "Web fonts: loaded (Public Sans)" : "Web fonts: NOT loaded; layout checked with fallback fonts (Google Fonts unreachable?)");
  if (shots.length) notes.push(`Screenshots: ${shots.length} in ${shotsDir}`);
}

let crashed = null;
try { await run(); } catch (e) { crashed = e; }

const passed = !crashed && problems.length === 0;
// One line per distinct problem (the same defect shows up in every size and scheme).
const groups = new Map();
for (const p of problems) {
  const key = p.section + "\u0001" + p.what;
  if (!groups.has(key)) groups.set(key, { section: p.section, what: p.what, where: [] });
  groups.get(key).where.push(p.where);
}
const distinct = [...groups.values()].map(g => g.section
  ? `${g.section}: ${g.what} (${g.where.length === 1 ? g.where[0] : g.where.length + " checks, first " + g.where[0]})`
  : g.where.length === 1 ? `${g.where[0]}: ${g.what}` : `${g.what} (${g.where.length} checks, first ${g.where[0]})`);
const lines = [
  `## US macro live check: ${crashed ? "COULD NOT RUN" : passed ? "PASSED" : `FAILED (${distinct.length} problem${distinct.length === 1 ? "" : "s"})`}`,
  "",
  `- Page: ${pageUrl} · checked ${stamp()}`,
  ...notes.map(n => "- " + n),
];
if (crashed) lines.push("", "The check stopped: " + String(crashed.stack || crashed).split("\n").slice(0, 3).join(" | "));
if (distinct.length) lines.push("", "### Problems", "", ...distinct.slice(0, 40).map(p => "- " + p), ...(distinct.length > 40 ? [`- … and ${distinct.length - 40} more`] : []));
const report = lines.join("\n") + "\n";
console.log(report);
if (summaryFile) { try { appendFileSync(summaryFile, report); } catch (e) { /* no summary on this host */ } }
if (process.env.GITHUB_OUTPUT) {
  const headline = crashed ? "the check could not run" : distinct.length ? (distinct.length > 1 ? `${distinct.length} problems, first: ` : "") + distinct[0] : "";
  appendFileSync(process.env.GITHUB_OUTPUT, `failed=${passed ? "false" : "true"}\ncount=${distinct.length}\nheadline=${headline.replace(/[\r\n]+/g, " ").slice(0, 140)}\n`);
}
if (reportFile) writeFileSync(reportFile, report);
process.exit(crashed ? 2 : passed ? 0 : 1);
