#!/usr/bin/env node
// Render check for site/oracle (Playwright Chromium): every configuration must load without a script error, show no
// "undefined"/"NaN", keep the page within the viewport, keep visible text at 11 px or more on phones, show the reader's
// language only (tab title included), number every section, and produce a finite DCF with its acceptance statement.
// Run with the site served locally:  python3 -m http.server 8123 --directory site   (detached), then
//   node scripts/oracle/render-check.mjs [--base http://localhost:8123] [--shots <dir>]
// Exits non-zero on any failure. Playwright is resolved from the global install (/opt/node22/lib/node_modules).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = createRequire("/opt/node22/lib/node_modules/")("playwright")); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8123"), SHOTS = arg("--shots", null);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// Words that only appear in the other language's copy (whole words, visible text only).
const ES_ONLY = /\b(Fuentes|metodología|según|trimestre|llamada|ingresos|deuda|pendiente|actualizado|vigente|Ocultar|Mostrar|Incidencias|arrendamientos|Valuación)\b/;
const EN_ONLY = /\b(Sources and Methodology|Hide|Show|Issues|Revenue growth|Enterprise value|Leases signed|What to watch)\b/;
const configs = [];
for (const lang of ["es", "en"]) for (const vp of [[1280, 900], [390, 844], [360, 780]]) for (const theme of ["light", "dark"]) configs.push({ lang, vp, theme });

const browser = await chromium.launch();
const failures = [];
for (const c of configs) {
  const tag = `${c.lang} ${c.vp[0]}x${c.vp[1]} ${c.theme}`;
  const page = await browser.newPage({ viewport: { width: c.vp[0], height: c.vp[1] }, colorScheme: c.theme });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
  await page.goto(`${BASE}/oracle/?lang=${c.lang}`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  const r = await page.evaluate(({ lang, esRe, enRe }) => {
    const ES = new RegExp(esRe), EN = new RegExp(enRe);
    const visible = (e) => { if (!e) return false; const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false; const rc = e.getClientRects(); return rc.length > 0 && rc[0].width > 0; };
    const out = { bad: [], wrongLang: [], small: [], overflow: document.documentElement.scrollWidth - window.innerWidth };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode, t = n.textContent.trim(); if (!t) continue; const p = n.parentElement; if (!p || !visible(p) || p.closest("script,style,noscript")) continue;
      if (/\bundefined\b|\bNaN\b/.test(t)) out.bad.push(t.slice(0, 120));
      if (lang === "en" && ES.test(t) && !p.closest("[lang]:not(html)") && !/^“|^"/.test(t)) out.wrongLang.push(t.slice(0, 120));
      if (lang === "es" && EN.test(t) && !p.closest(".quote, .guide-quote, i, .small.muted") && !/^“|^"|'/.test(t)) out.wrongLang.push(t.slice(0, 120));
      if (window.innerWidth <= 400 && parseFloat(getComputedStyle(p).fontSize) < 11 && !p.closest("canvas, .fignum")) out.small.push(`${parseFloat(getComputedStyle(p).fontSize)}px: ${t.slice(0, 60)}`);
    }
    const secs = [...document.querySelectorAll("section.block[data-sec]")];
    out.unnumbered = secs.filter((s) => s.dataset.sec !== "summary" && !s.querySelector(".sec-num").textContent.trim()).map((s) => s.dataset.sec);
    out.title = document.title;
    out.dcf = { hero: (document.getElementById("dcfHero") || {}).textContent, check: (document.getElementById("dcfCheck") || {}).textContent || "", bridge: !!document.querySelector("#dcfBridge table"), beta: document.querySelectorAll("#dcfBeta tbody tr").length };
    out.issues = document.querySelectorAll("#sitesTable td.issues").length;
    out.toggles = document.querySelectorAll(".sec-toggle").length;
    return out;
  }, { lang: c.lang, esRe: ES_ONLY.source, enRe: EN_ONLY.source });
  const f = (m) => failures.push(`${tag}: ${m}`);
  if (errs.length) f(`script errors: ${errs.slice(0, 3).join(" | ")}`);
  if (r.bad.length) f(`undefined/NaN shown: ${r.bad.slice(0, 3).join(" | ")}`);
  if (r.overflow > 1) f(`horizontal overflow ${r.overflow}px`);
  if (r.wrongLang.length) f(`other-language text: ${r.wrongLang.slice(0, 3).join(" | ")}`);
  if (r.small.length) f(`text under 11px: ${r.small.slice(0, 3).join(" | ")}`);
  if (r.unnumbered.length) f(`sections without a number: ${r.unnumbered.join(", ")}`);
  if (c.lang === "en" ? !/Interactive financial model/.test(r.title) : !/Modelo financiero interactivo/.test(r.title)) f(`tab title not in ${c.lang}: ${r.title}`);
  if (!/US\$\s*\d/.test(r.dcf.hero || "")) f(`DCF value not finite: ${r.dcf.hero}`);
  if (!/bracketed|dentro|fuera|not bracketed/i.test(r.dcf.check)) f("DCF acceptance statement missing");
  if (!r.dcf.bridge || r.dcf.beta < 2) f("DCF bridge or beta cross-check missing");
  if (r.issues !== 5) f(`sites Issues column: ${r.issues} cells (expected 5)`);
  if (r.toggles < 10) f(`section toggles: ${r.toggles}`);
  // collapse works and survives a re-render; then expand everything again
  if (c.vp[0] === 1280 && c.theme === "light") {
    await page.click('#dcf .sec-toggle'); await page.waitForTimeout(150);
    const hidden = await page.evaluate(() => getComputedStyle(document.querySelector("#dcf .dcf-grid")).display === "none");
    if (!hidden) f("collapse toggle did not hide the section");
    await page.click('#dcf .sec-toggle');
    await page.evaluate(() => window.scrollTo(0, 4000)); await page.waitForTimeout(250);
    if (!(await page.evaluate(() => document.getElementById("toTop").classList.contains("show")))) f("back-to-top control not shown after scrolling");
  }
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `oracle-${c.lang}-${c.vp[0]}-${c.theme}.png`), fullPage: false });
  console.log(`${failures.some((x) => x.startsWith(tag)) ? "FAIL" : "ok  "} ${tag} · DCF ${r.dcf.hero} · overflow ${r.overflow}`);
  await page.close();
}
// print emulation in English: the closing heading and every section expanded, no Spanish
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await page.goto(`${BASE}/oracle/?lang=en`, { waitUntil: "load" }); await page.waitForTimeout(700);
  await page.emulateMedia({ media: "print" }); await page.evaluate(() => window.dispatchEvent(new Event("beforeprint"))); await page.waitForTimeout(600);
  const h = await page.evaluate(() => document.querySelector("#printClose h2").innerText);
  if (h !== "Sources and Methodology") failures.push(`print (en): closing heading "${h}"`);
  console.log(`${h === "Sources and Methodology" ? "ok  " : "FAIL"} print en · closing heading "${h}"`);
  await page.close();
}
await browser.close();
if (failures.length) { console.log(`\n${failures.length} failure(s):\n` + failures.join("\n")); process.exit(1); }
console.log(`\nRender check: ${configs.length + 1} configurations, 0 failures.`);
