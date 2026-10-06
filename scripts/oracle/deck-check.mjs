#!/usr/bin/env node
// Deck check for site/oracle (Playwright Chromium): builds the board presentation in Spanish and in English from the page
// served locally, saves both PDFs, and fails when the build throws (present.js refuses to save a deck with an unresolved
// {{token}}), when any drawn string carries "{{", "undefined", "NaN" or a bare "null", when the English deck carries Spanish
// words, when a repository path is drawn, when the deck's price, DCF value and delta (and Bear and Bull while the DCF section
// is in the deck) differ from the page's, when a bullet of the page's executive summary is missing from the deck, or when the
// deck's pages are not in the registry's (the page's) order. With PyMuPDF installed (python3 -c "import fitz") it also reads the
// saved PDF as a second layer: its text, the contents page's internal links (one per deck section at least, every target inside
// the document), and the geometry of every word (none past the right margin or below the footer rule, i.e. no text spilled out
// of its box or page); with --shots <dir> it rasterises every page so the output can be looked at.
// Run with the site served locally:  python3 -m http.server 8123 --directory site   (detached), then
//   node scripts/oracle/deck-check.mjs [--base http://localhost:8123] [--out <dir>] [--shots <dir>]
import { createRequire } from "node:module";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = createRequire("/opt/node22/lib/node_modules/")("playwright")); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8123"), OUT = arg("--out", "/tmp/oracle-deck"), SHOTS = arg("--shots", null);
mkdirSync(OUT, { recursive: true }); if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ES_ONLY = /\b(Fuentes|metodología|según|trimestre|llamada|ingresos|deuda|pendiente|actualizado|vigente|arrendamientos|Valuación|Pesimista|Optimista)\b/;
const PATH_RE = /(tools\/oracle|scripts\/oracle|\.github\/|\b[a-z_-]+\.mjs\b|\bdata\/[a-z_]+\.js\b|\b[a-z_]+\.json\b)/;

const browser = await chromium.launch();
const failures = [];
for (const lang of ["es", "en"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
  let alert = null; page.on("dialog", async (d) => { alert = d.message(); await d.dismiss(); });
  await page.addInitScript(() => { window.ORCL_DECK_CAPTURE = true; });
  await page.goto(`${BASE}/oracle/?lang=${lang}`, { waitUntil: "load" }); await page.waitForTimeout(900);
  // what the page shows, to compare with the deck
  const pageFacts = await page.evaluate(() => { const M = window.ORCL_MODEL; const d = M.dcfNow(); const sr = M.scenarioRange(d.s); const price = M.dcfPrice(); const txt = (e) => e.textContent.replace(/\s+/g, " ").trim(); return { price: M.fmtN(price, 2), base: M.fmtN(d.r.perShare, 0), bear: M.fmtN(sr.bear, 0), bull: M.fmtN(sr.bull, 0), mgmt: M.fmtN(sr.mgmt, 0), delta: M.fmtPct(100 * (d.r.perShare / price - 1), 0, true), hero: document.getElementById("dcfHero").textContent.trim(), chain: [...document.querySelectorAll("#sumChain .box .v")].map((e) => e.textContent.trim()),
    // the executive summary as the page prints it (every bullet of the three cards and of the watch block, with its sub-headings)
    summary: [...document.querySelectorAll("#sumGrid li, #sumWatch h4, #sumWatch li")].map(txt),
    // the verdict paragraph(s), compared whole (the deck reads the same composed HTML, so the text must be identical)
    verdict: [...document.querySelectorAll("#sumVerdict .vt")].map(txt),
    // the deck's sections in registry order and whether the DCF is among them
    deck: M.deckList().map((s) => ({ id: s.id, num: M.secNum(s.id), title: M.secTitle(s.id) })), dcfInDeck: M.deckList().some((s) => s.id === "dcf") }; });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }).catch(() => null), page.click("#btnPrint")]);
  await page.waitForTimeout(800);
  const tag = `deck ${lang}`;
  const f = (m) => failures.push(`${tag}: ${m}`);
  if (alert) f(`build failed: ${alert}`);
  if (errs.length) f(`script errors: ${errs.slice(0, 3).join(" | ")}`);
  if (!download) { f("no PDF was produced"); await page.close(); continue; }
  const file = join(OUT, `oracle-${lang}.pdf`); await download.saveAs(file);
  const drawn = await page.evaluate(() => window.__deckText || []);
  const text = drawn.join("\n");
  if (!drawn.length) f("no drawn text captured (ORCL_DECK_CAPTURE)");
  const bad = drawn.filter((t) => /\{\{[^}]*\}\}|\bundefined\b|\bNaN\b|^null$|\bnull\b/.test(t));
  if (bad.length) f(`placeholders or empty values drawn: ${[...new Set(bad)].slice(0, 4).join(" | ")}`);
  if (lang === "en") { const es = drawn.filter((t) => ES_ONLY.test(t) && !/^["“]/.test(t)); if (es.length) f(`Spanish in the English deck: ${[...new Set(es)].slice(0, 3).join(" | ")}`); }
  const paths = drawn.filter((t) => PATH_RE.test(t)); if (paths.length) f(`repository path drawn: ${paths.slice(0, 2).join(" | ")}`);
  // the deck's key figures are the page's (Bear and Bull only while the DCF page is in the deck; the chain's Valuation box
  // carries the Base value and the delta in any case)
  const must = { price: pageFacts.price, base: pageFacts.base, ...(pageFacts.dcfInDeck ? { bear: pageFacts.bear, bull: pageFacts.bull } : {}) };
  for (const [k, v] of Object.entries(must)) if (!text.includes(v)) f(`deck does not carry the page's ${k} (${v})`);
  if (!text.includes(pageFacts.delta)) f(`deck does not carry the page's DCF delta vs price (${pageFacts.delta})`);
  for (const v of pageFacts.chain.slice(0, 3)) if (!text.replace(/\s+/g, " ").includes(v.replace(/\s+/g, " ").replace(/\s*(Text|texto)[^·]*$/, "").trim().slice(0, 12))) f(`chain value missing from the deck: ${v}`);
  // the executive summary is the page's: every bullet and sub-heading of the page's summary block is drawn (bullets are drawn
  // word by word, so both sides are compared on their letters and digits alone; cross-references resolve differently on the
  // two sides, so the first 50 characters decide)
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, "");
  const deckNorm = norm(drawn.join(" "));
  const missing = pageFacts.summary.map(norm).filter((s) => s.length >= 12 && !deckNorm.includes(s.slice(0, 50)));
  if (missing.length) f(`executive-summary text missing from the deck (${missing.length}): ${missing.slice(0, 2).map((s) => s.slice(0, 40)).join(" | ")}`);
  const vMissing = pageFacts.verdict.map(norm).filter((s) => s && !deckNorm.includes(s));
  if (vMissing.length) f(`the page's verdict is not drawn whole in the deck (${vMissing.map((s) => s.length).join(", ")} chars)`);
  // the deck's pages follow the registry (the page's story order): each section's first page title carries its number, in order
  const titles = drawn.filter((t) => /^(\d\d|R\d) · /.test(t)).map((t) => t.split(" · ")[0]);
  const order = pageFacts.deck.map((s) => s.num).filter((n) => titles.includes(n)), seen = [...new Set(titles)];
  if (seen.join(",") !== order.join(",")) f(`deck page order differs from the registry: deck ${seen.join(",")} vs registry ${order.join(",")}`);
  if (pageFacts.dcfInDeck === false && drawn.some((t) => /^(Valuación por flujos descontados|Valuation: Discounted Cash Flow)/i.test(t))) f("a DCF page was drawn although the registry excludes it from the deck");
  // second layer and pictures: PyMuPDF, when installed
  const py = spawnSync("python3", ["-c", `
import sys, json
try:
    import fitz
except Exception as e:
    print(json.dumps({"skipped": str(e)})); sys.exit(0)
doc = fitz.open(sys.argv[1]); txt = "\\n".join(p.get_text() for p in doc)
out = {"pages": len(doc), "tokens": txt.count("{{"), "undefined": txt.count("undefined"), "nan": len([w for w in txt.split() if w == "NaN"])}
# contents page (page 3): internal links, one per row, every target inside the document
links = doc[2].get_links() if len(doc) > 2 else []
out["tocLinks"] = len([l for l in links if l.get("kind") == fitz.LINK_GOTO and 0 <= l.get("page", -1) < len(doc)])
out["tocBad"] = len(links) - out["tocLinks"]
# geometry: on every page after the cover, no word ends past the right margin (40 pt) or below the footer rule (30 pt above the
# bottom) unless it is the footer itself (drawn in the last 28 pt); a word there means text spilled out of its box or page
spills = []
for i, p in enumerate(doc):
    if i == 0: continue
    W, H = p.rect.width, p.rect.height
    for x0, y0, x1, y1, w, *_ in p.get_text("words"):
        if y0 > H - 28: continue
        if x1 > W - 40 + 2.5 or y1 > H - 30 + 1: spills.append(f"p{i + 1} '{w}' ({x1:.0f},{y1:.0f})")
out["spills"] = spills[:6]; out["spillCount"] = len(spills)
shots = sys.argv[2]
if shots:
    for i, p in enumerate(doc):
        p.get_pixmap(dpi=70).save(f"{shots}/deck-{sys.argv[3]}-{i + 1:02d}.png")
print(json.dumps(out))
`, file, SHOTS || "", lang], { encoding: "utf8" });
  let pdfInfo = null; try { pdfInfo = JSON.parse(py.stdout.trim().split("\n").pop()); } catch (e) { pdfInfo = { skipped: py.stderr.slice(0, 200) }; }
  if (pdfInfo && !pdfInfo.skipped) {
    if (pdfInfo.tokens) f(`${pdfInfo.tokens} "{{" in the saved PDF`); if (pdfInfo.undefined) f(`"undefined" in the saved PDF`); if (pdfInfo.nan) f(`"NaN" in the saved PDF`);
    if (pdfInfo.tocLinks < pageFacts.deck.length) f(`contents page has ${pdfInfo.tocLinks} internal links for ${pageFacts.deck.length} deck sections`);
    if (pdfInfo.tocBad) f(`${pdfInfo.tocBad} contents link(s) point outside the document`);
    if (pdfInfo.spillCount) f(`${pdfInfo.spillCount} word(s) past the right margin or below the footer rule: ${pdfInfo.spills.join("; ")}`);
  }
  console.log(`${failures.some((x) => x.startsWith(tag)) ? "FAIL" : "ok  "} ${tag} · ${drawn.length} strings drawn · ${pdfInfo && pdfInfo.pages ? `${pdfInfo.pages} pages · ${pdfInfo.tocLinks} contents links` : "PDF text not read (no PyMuPDF)"} · ${pageFacts.summary.length} summary lines · page: price ${pageFacts.price}, DCF ${pageFacts.hero}, bear ${pageFacts.bear}, bull ${pageFacts.bull}, delta ${pageFacts.delta}${pageFacts.dcfInDeck ? "" : " (DCF not in the deck)"} · ${file}`);
  await page.close();
}
await browser.close();
if (failures.length) { console.log(`\n${failures.length} failure(s):\n` + failures.join("\n")); process.exit(1); }
console.log("\nDeck check: 2 languages, 0 failures.");
