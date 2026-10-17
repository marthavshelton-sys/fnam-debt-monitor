#!/usr/bin/env node
// Deck check for site/gap (Playwright Chromium): builds the board presentation in Spanish and in English from the page served
// locally, saves both PDFs and fails when the build throws or alerts, when a drawn string carries "{{", "undefined" or "NaN",
// when the Spanish deck still prints EBITDA, EPS or LTM (the deck's glossary prints UAFIDA, UPA and UDM), when the English deck
// carries Spanish-only words, when a repository path is drawn, when the two decks differ in page count, or when the deck's
// headline figures (leverage, NTM P/E and NTM EV/EBITDA on FactSet consensus, the latest month's and year-to-date traffic changes, the dividend yield)
// differ from the page's. With PyMuPDF installed (python3 -c "import fitz") it also reads each saved PDF: its text per page and
// the geometry of every word (none past the right margin or below the footer rule); with --shots <dir> it rasterises every page.
// Run with the site served locally:  python3 -m http.server 8123 --directory site   (detached), then
//   node scripts/gap/deck-check.mjs [--base http://localhost:8123] [--out <dir>] [--shots <dir>]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = createRequire("/opt/node22/lib/node_modules/")("playwright")); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8123"), OUT = arg("--out", "/tmp/gap-deck"), SHOTS = arg("--shots", null);
mkdirSync(OUT, { recursive: true }); if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ES_ONLY = /\b(Fuentes|metodología|según|trimestre|ingresos|deuda|vigente|acumulado|asamblea|reporte mensual|razón de pago)\b/;
const PATH_RE = /(tools\/gap|scripts\/gap|\.github\/|\b[a-z_-]+\.mjs\b|\bdata\/[a-z_]+\.js\b|\b[a-z_-]+\.json\b)/;

const browser = await chromium.launch();
const failures = [], pageCounts = {};
for (const lang of ["es", "en"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); if (m.type() === "warning" && /presentation/.test(m.text())) errs.push(m.text()); });
  let alert = null; page.on("dialog", async (d) => { alert = d.message(); await d.dismiss(); });
  await page.goto(`${BASE}/gap/?lang=${lang}`, { waitUntil: "load" }); await page.waitForTimeout(1200);
  // what the page shows, to compare with the deck
  const facts = await page.evaluate(() => {
    const M = window.GAP_MODEL, nd = M.netDebt(M.lastQ), L = M.lastLTM, TL = M.trafficLatest(), tot = TL.rows.TOTAL, agm = (M.REF.dividends || []).slice(-1)[0];
    const nm = M.ntmMultiples(M.lastPx, M.sharesNow, nd, M.lastQ);
    return { lev: M.fmtX(nd.net / L.is.ebitda, 2), pe: nm ? M.fmtX(nm.pe) : M.fmtX(M.lastPx[1] * M.sharesNow / 1000 / L.is.netIncome), evEbitdaNtm: nm && nm.evEbitda != null ? M.fmtX(nm.evEbitda) : null, yoy: M.fmtChgV(tot.yoy), ytd: M.fmtChgV(tot.ytdYoy), yieldPct: M.fmtPct(100 * agm.dps / M.lastPx[1]), ytdTotal: M.fmtN(tot.ytd, 1) };
  });
  // every string the engine draws, captured from jsPDF's text() while the deck builds
  await page.evaluate(() => { window.__drawn = []; });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 240000 }).catch(() => null), page.evaluate(async () => {
    const P = window.FNAM_PRESENT; const orig = P.Doc.prototype.page;
    P.Doc.prototype.page = function (...a) { const r = orig.apply(this, a); if (!this.__hooked) { this.__hooked = true; const t = this.pdf.text.bind(this.pdf); this.pdf.text = (s, ...rest) => { window.__drawn.push(...(Array.isArray(s) ? s : [s]).map(String)); return t(s, ...rest); }; } return r; };
    await window.GAP_PRESENT.build();
  })]);
  const drawn = await page.evaluate(() => window.__drawn || []);
  if (alert) failures.push(`${lang}: build alerted: ${alert}`);
  for (const e of errs) failures.push(`${lang}: ${e}`);
  if (!download) { failures.push(`${lang}: no PDF produced`); await page.close(); continue; }
  const file = join(OUT, `gap-${lang}.pdf`); await download.saveAs(file);
  const bad = drawn.filter((s) => /\{\{|\bundefined\b|\bNaN\b/.test(s)); if (bad.length) failures.push(`${lang}: ${bad.length} string(s) with a placeholder: ${bad.slice(0, 3).join(" | ")}`);
  const paths = drawn.filter((s) => PATH_RE.test(s)); if (paths.length) failures.push(`${lang}: repository path drawn: ${paths.slice(0, 2).join(" | ")}`);
  if (lang === "es") { const t = drawn.filter((s) => /\bEBITDA\b|\bEPS\b|\bLTM\b/.test(s)); if (t.length) failures.push(`es: ${t.length} string(s) still carry EBITDA/EPS/LTM: ${t.slice(0, 3).join(" | ")}`); }
  if (lang === "en") { const t = drawn.filter((s) => ES_ONLY.test(s)); if (t.length) failures.push(`en: ${t.length} Spanish string(s): ${t.slice(0, 3).join(" | ")}`); }
  const all = drawn.join("\n");
  for (const [k, v] of Object.entries(facts)) if (v != null && !all.includes(v)) failures.push(`${lang}: page figure not found in the deck (${k} = ${v})`);
  // PDF layer: text per page, page count, word geometry
  const py = spawnSync("python3", ["-I", "-c", `
import sys, json
try:
    import fitz
except Exception:
    print(json.dumps({"skipped": True})); sys.exit(0)
doc = fitz.open(sys.argv[1]); out = {"pages": len(doc), "spill": []}; txt = []
for i, p in enumerate(doc):
    txt.append(f"===== PAGE {i+1} ({'L' if p.rect.width > p.rect.height else 'P'}) =====\\n" + p.get_text("text"))
    W, H = p.rect.width, p.rect.height
    for w in p.get_text("words"):
        x0, y0, x1, y1 = w[:4]
        if x1 > W - 36 or (y1 > H - 32 and y0 < H - 34 and i > 0): out["spill"].append([i + 1, round(x1), round(y1), w[4]])
    if sys.argv[2]: p.get_pixmap(dpi=110).save(f"{sys.argv[2]}/${lang}-{i+1:02d}.png")
open(sys.argv[1].replace('.pdf', '.txt'), 'w').write("\\n".join(txt))
print(json.dumps(out))
`, file, SHOTS || ""], { encoding: "utf8" });
  try { const r = JSON.parse(py.stdout.trim().split("\n").pop()); if (!r.skipped) { pageCounts[lang] = r.pages; if (r.spill.length) failures.push(`${lang}: ${r.spill.length} word(s) past the margin or footer: ${JSON.stringify(r.spill.slice(0, 4))}`); } } catch (e) { failures.push(`${lang}: PDF layer failed: ${py.stderr.slice(0, 300)}`); }
  console.log(`[${lang}] saved ${file} (${drawn.length} strings drawn)`);
  await page.close();
}
await browser.close();
if (pageCounts.es && pageCounts.en && pageCounts.es !== pageCounts.en) failures.push(`page count differs: es ${pageCounts.es}, en ${pageCounts.en}`);
writeFileSync(join(OUT, "deck-check.json"), JSON.stringify({ failures, pageCounts }, null, 1));
if (failures.length) { console.error(`deck-check: ${failures.length} failure(s)\n - ` + failures.join("\n - ")); process.exit(1); }
console.log(`deck-check: 0 failures (${Object.entries(pageCounts).map(([k, v]) => `${k} ${v} pages`).join(", ")})`);
