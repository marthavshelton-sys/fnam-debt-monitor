#!/usr/bin/env node
// Excel export check for the Oracle DCF (2026-10-07): downloads the workbook the page builds (Playwright clicks the Excel
// button, both languages), recalculates it with LibreOffice headless (the file carries formulas only, no cached values) and
// compares every projected year's revenue, taxes, prepayments, unwind, free cash flow, tax rate, EPS bridge and present value,
// the terminal year, WACC, the PV totals, EV, equity, the DCF-implied target and the target-implied multiples with the page's
// own model (window.ORCL_MODEL.dcfNow()). Exits non-zero on any difference beyond rounding. Needs the site served
// (python3 -m http.server 8123 --directory site), LibreOffice (soffice) and Python 3 with openpyxl.
//   node scripts/oracle/xlsx-check.mjs [--base http://localhost:8123] [--out <dir>] [--preset bear|base|bull|mgmt]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { ({ chromium } = createRequire("/opt/node22/lib/node_modules/")("playwright")); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8123"), OUT = arg("--out", join(tmpdir(), "oracle-xlsx-check")), PRESET = arg("--preset", null);
mkdirSync(OUT, { recursive: true });
const failures = [];
const browser = await chromium.launch();
for (const lang of ["es", "en"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${BASE}/oracle/?lang=${lang}`, { waitUntil: "load" }); await page.waitForTimeout(900);
  await page.click('#readingPaths button[data-path="full"]'); await page.waitForTimeout(300);
  if (PRESET) { await page.click(`#dcf button.preset[data-preset="${PRESET}"]`); await page.waitForTimeout(300); }
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dcfXlsx")]);
  const file = join(OUT, `oracle-dcf-${lang}.xlsx`); await dl.saveAs(file);
  // the page's figures and the row map the builder uses (the map is never written into the file)
  const st = await page.evaluate(() => { const M = window.ORCL_MODEL; const d = M.dcfNow(); const wb = M.dcfWorkbook(d.s, d.r); return { keys: wb.keys, N: d.s.N, r: { perShare: d.r.perShare, ev: d.r.ev, eq: d.r.eq, pvExplicit: d.r.pvExplicit, pvTv: d.r.pvTv, pvPost: d.r.pvPost, tv: d.r.tv, wacc: 100 * d.r.wacc, impliedMult: d.r.impliedMult, impliedPe: d.r.impliedPe, terminal: d.r.terminal, rows: d.r.rows.map((x) => ({ fy: x.fy, revFull: x.revFull, rev: x.rev, taxes: x.taxes, taxRate: x.taxRate, inflow: x.inflow, unwind: x.unwind, fcf: x.fcf, t: x.t, df: x.df, pv: x.pv, other: x.other, eps: x.eps })) } }; });
  const stateFile = join(OUT, `state-${lang}.json`); writeFileSync(stateFile, JSON.stringify(st));
  if (errs.length) failures.push(`${lang}: page errors ${errs.join(" | ")}`);
  await page.close();
  // recalculate with LibreOffice (its own profile directory, so a read-only HOME never blocks it)
  const recalcDir = join(OUT, `recalc-${lang}`); mkdirSync(recalcDir, { recursive: true });
  const lo = spawnSync("soffice", [`-env:UserInstallation=file://${join(OUT, "lo-profile")}`, "--headless", "--calc", "--convert-to", "xlsx", "--outdir", recalcDir, file], { encoding: "utf8", timeout: 180000 });
  const recalc = join(recalcDir, `oracle-dcf-${lang}.xlsx`);
  if (lo.status !== 0 || !existsSync(recalc)) { failures.push(`${lang}: LibreOffice did not recalculate the workbook (${(lo.stderr || lo.stdout || "").trim().slice(0, 200)})`); continue; }
  // compare with openpyxl (values after recalculation)
  const py = `
import json, sys, openpyxl
st = json.load(open(sys.argv[1])); K = st['keys']; r = st['r']; N = st['N']
wb = openpyxl.load_workbook(sys.argv[2], data_only=True); P, D = wb['Projections'], wb['DCF']
col = lambda i: openpyxl.utils.get_column_letter(3 + i)
bad = []
def chk(name, a, b, tol):
    if a is None or b is None or abs(float(a) - float(b)) > tol: bad.append((name, a, b))
RP, RD = K['P'], K['D']
for i, x in enumerate(r['rows']):
    c = col(i)
    chk(f"revenue {x['fy']}", P[f"{c}{RP['rev']}"].value, x['revFull'], 0.01)
    chk(f"revenue in the period {x['fy']}", P[f"{c}{RP['pRev']}"].value, x['rev'], 0.01)
    chk(f"taxes {x['fy']}", P[f"{c}{RP['pTax']}"].value, x['taxes'], 0.01)
    chk(f"tax rate {x['fy']}", P[f"{c}{RP['tax']}"].value, x['taxRate'], 1e-9)
    chk(f"prepayments received {x['fy']}", P[f"{c}{RP['pIn']}"].value, x['inflow'], 0.01)
    chk(f"unwind {x['fy']}", P[f"{c}{RP['pUn']}"].value, x['unwind'], 0.01)
    chk(f"fcf {x['fy']}", P[f"{c}{RP['fcf']}"].value, x['fcf'], 0.01)
    chk(f"below-EBIT items {x['fy']}", P[f"{c}{RP['other']}"].value, x['other'], 0.01)
    chk(f"eps {x['fy']}", P[f"{c}{RP['eps']}"].value, x['eps'], 1e-6)
    n = RD['d0'] + i
    chk(f"years to mid-point {x['fy']}", D[f"E{n}"].value, x['t'], 1e-9); chk(f"discount factor {x['fy']}", D[f"G{n}"].value, x['df'], 1e-9); chk(f"pv {x['fy']}", D[f"H{n}"].value, x['pv'], 0.01)
tc = col(N)
chk('terminal revenue', P[f"{tc}{RP['rev']}"].value, r['terminal']['rev'], 0.01); chk('terminal fcf', P[f"{tc}{RP['fcf']}"].value, r['terminal']['fcf'], 0.01)
chk('WACC', D[f"B{RD['wacc']}"].value, r['wacc'], 1e-9)
chk('PV explicit flows', D[f"H{RD['sumRow']}"].value, r['pvExplicit'], 0.01)
chk('terminal value', D[f"B{RD['tv']}"].value, r['tv'], 0.05)
chk('PV terminal value', D[f"B{RD['pvTv']}"].value, r['pvTv'], 0.01)
chk('PV post-horizon unwind', D[f"E{RD['pvPost']}"].value, r['pvPost'], 0.01)
chk('EV', D[f"B{RD['ev']}"].value, r['ev'], 0.01); chk('equity', D[f"B{RD['eq']}"].value, r['eq'], 0.01)
chk('DCF-implied target', D[f"B{RD['perShare']}"].value, r['perShare'], 1e-6)
chk('target-implied EV/EBITDA', D[f"B{RD['evEbitda']}"].value, r['impliedMult'], 1e-6); chk('target-implied P/E', D[f"B{RD['pe']}"].value, r['impliedPe'], 1e-6)
print(json.dumps({'checks': 12 * len(r['rows']) + 11, 'bad': bad}))
`;
  const cmp = spawnSync("python3", ["-I", "-c", py, stateFile, recalc], { encoding: "utf8" });
  if (cmp.status !== 0) { failures.push(`${lang}: comparison failed to run (${(cmp.stderr || "").trim().slice(0, 300)})`); continue; }
  const res = JSON.parse(cmp.stdout.trim().split("\n").pop());
  for (const [name, a, b] of res.bad) failures.push(`${lang}: ${name}: workbook ${a} vs page ${b}`);
  console.log(`${res.bad.length ? "FAIL" : "ok  "} ${lang} · ${res.checks} figures compared · target US$ ${st.r.perShare.toFixed(2)} · ${file}`);
}
await browser.close();
if (failures.length) { console.error(`\n${failures.length} failure(s):\n` + failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); }
console.log("Excel export matches the page in both languages.");
