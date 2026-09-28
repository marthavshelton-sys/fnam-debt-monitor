// Material-change alerts for the Mexico macro dashboard (site/mx/macro).
//
// Runs after the build. For each tracked release it compares the latest period in
// tools/mx-macro/data/series.json with tools/mx-macro/data/alerts_state.json (the last period
// already evaluated). A new period that crosses one of the thresholds below is MATERIAL; all
// material releases found in one run become ONE GitHub issue titled "MATERIAL (MX): ...", whose
// body reuses the page's own "At a glance" lines for the affected views (read out of the built
// page by exec_extract.mjs, so the wording is written once, in the template). Non-material new
// periods only advance the state. The owner does not receive GitHub's notification mail: the
// Claude Routine "FNAM US Macro: email material changes" emails these issues (see
// tools/mx-macro/README.md). A missing state file is seeded from the current data without
// sending anything.
//
//   node scripts/mx-macro/alerts.mjs            -> opens the issue (needs GITHUB_TOKEN, GITHUB_REPOSITORY)
//   node scripts/mx-macro/alerts.mjs --dry-run  -> prints what it would send; state untouched
//   --data <series.json> --state <state.json> --page <index.html> override the paths (tests)
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extractSummaries } from './exec_extract.mjs';

const ROOT = new URL('../../', import.meta.url);
const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const DRY = argv.includes('--dry-run');
const DATA = arg('--data', new URL('tools/mx-macro/data/series.json', ROOT).pathname);
const STATE = arg('--state', new URL('tools/mx-macro/data/alerts_state.json', ROOT).pathname);
const PAGE = arg('--page', new URL('site/mx/macro/index.html', ROOT).pathname);

const data = JSON.parse(await readFile(DATA, 'utf8'));
const S = (k) => (data.series?.[k]?.points || []).filter((p) => p && p[1] !== null && p[1] !== undefined);
const last = (a, back = 0) => (a.length > back ? a[a.length - 1 - back] : null);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mon = (d) => (/^\d{4}-\d{2}$/.test(d) ? `${MON[+d.slice(5) - 1]} ${d.slice(0, 4)}` : d.replace(/^(\d{4})-Q(\d)$/, 'Q$2 $1'));
const sg = (v, d = 1) => (v === null || !Number.isFinite(v) ? 'n/a' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d));
const byDate = (pts) => new Map(pts.map((p) => [p[0], p[1]]));
// Year-over-year % for a monthly series at date d (YYYY-MM), null when the base is missing.
function yoy(pts, d) {
  const m = byDate(pts); const base = `${+d.slice(0, 4) - 1}${d.slice(4)}`;
  return m.has(d) && m.has(base) && m.get(base) ? (m.get(d) / m.get(base) - 1) * 100 : null;
}
const pct = (a, b) => (a !== null && b ? (a / b - 1) * 100 : null);

// ---- per release: current period and, when new, headline + materiality ----
// Thresholds are deliberately few and explicit; tune them here.
const RELEASES = {
  inflation: () => {
    const h = S('inpc'), c = S('inpcCore'); const L = last(h), P = last(h, 1); if (!L || !P) return null;
    const hy = yoy(h, L[0]), hp = yoy(h, P[0]), cy = yoy(c, L[0]), cp = yoy(c, P[0]);
    const band = (v) => (v === null ? null : v > 4 ? 'above' : v < 2 ? 'below' : 'inside');
    const material = (hy !== null && hp !== null && Math.abs(hy - hp) >= 0.2) || (cy !== null && cp !== null && Math.abs(cy - cp) >= 0.2) || band(hy) !== band(hp);
    return { period: L[0], title: 'Consumer prices (INPC)', views: ['inpc'], material,
      headline: `INPC ${mon(L[0])} ${hy?.toFixed(1)}% YoY (${sg(hy - hp, 1)}pp), core ${cy?.toFixed(1)}%` };
  },
  igae: () => {
    const a = S('igae'); const L = last(a), P = last(a, 1); if (!L || !P) return null;
    const mm = pct(L[1], P[1]), y = yoy(a, L[0]), yp = yoy(a, P[0]);
    const material = Math.abs(mm) >= 1.0 || (y !== null && yp !== null && Math.sign(y) !== Math.sign(yp));
    return { period: L[0], title: 'Economic activity (IGAE)', views: ['ac'], material,
      headline: `IGAE ${mon(L[0])} ${sg(mm, 2)}% m/m, ${sg(y, 1)}% YoY` };
  },
  gdp: () => {
    const g = S('gdp'); const L = last(g), P = last(g, 1), P2 = last(g, 2); if (!L || !P || !P2) return null;
    const q = pct(L[1], P[1]), qp = pct(P[1], P2[1]);
    const material = q < 0 || Math.abs(q - qp) >= 1.0;
    return { period: L[0], title: 'Real GDP', views: ['ac'], material,
      headline: `GDP ${mon(L[0])} ${sg(q, 1)}% q/q (${sg(q - qp, 1)}pp vs prior quarter)` };
  },
  unemployment: () => {
    const u = S('unemployment'); const L = last(u), P = last(u, 1); if (!L || !P) return null;
    const du = L[1] - P[1];
    return { period: L[0], title: 'Unemployment', views: ['lb'], material: Math.abs(du) >= 0.3,
      headline: `Unemployment ${mon(L[0])} ${L[1].toFixed(1)}% (${sg(du, 1)}pp)` };
  },
  confidence: () => {
    const c = S('consumerConfidence'); const L = last(c), P = last(c, 1); if (!L || !P) return null;
    const d = L[1] - P[1];
    return { period: L[0], title: 'Consumer confidence', views: ['cc'], material: Math.abs(d) >= 2.0,
      headline: `Consumer confidence ${mon(L[0])} ${L[1].toFixed(1)} (${sg(d, 1)} pts)` };
  },
  remittances: () => {
    const r = S('remittances'); const L = last(r); if (!L) return null;
    const y = yoy(r, L[0]);
    return { period: L[0], title: 'Remittances', views: ['ex'], material: y !== null && Math.abs(y) >= 10,
      headline: `Remittances ${mon(L[0])} US$${Math.round(L[1]).toLocaleString('en-US')}M (${sg(y, 1)}% YoY)` };
  },
  trade: () => {
    const x = S('exports'), m = byDate(S('imports')); const L = last(x), P = last(x, 1); if (!L || !P || !m.has(L[0]) || !m.has(P[0])) return null;
    const bal = (L[1] - m.get(L[0])) / 1e9, balP = (P[1] - m.get(P[0])) / 1e9;
    const y = yoy(x, L[0]), yp = yoy(x, P[0]);
    const material = Math.sign(bal) !== Math.sign(balP) || (y !== null && yp !== null && Math.abs(y - yp) >= 10);
    return { period: L[0], title: 'Merchandise trade', views: ['ex'], material,
      headline: `Trade ${mon(L[0])}: balance US$${sg(bal, 2)}B, exports ${sg(y, 1)}% YoY` };
  },
  // Daily/weekly series: only a material move is reported, never a routine new observation.
  policyRate: (st) => {
    const p = S('policyRate'); const L = last(p); if (!L) return null;
    const prev = st.policyRateValue;
    const changed = typeof prev === 'number' && Math.abs(L[1] - prev) > 1e-9;
    return { period: L[0], title: 'Banxico policy rate', views: ['bx'], material: changed,
      stateExtra: { policyRateValue: L[1] },
      headline: `Banxico policy rate ${L[1].toFixed(2)}% (${changed ? sg((L[1] - prev) * 100, 0) + ' bp' : 'unchanged'})` };
  },
  peso: (st) => {
    const f = S('usdmxn'); const L = last(f), P1 = last(f, 1), P5 = last(f, 5); if (!L || !P1 || !P5) return null;
    const d1 = pct(L[1], P1[1]), d5 = pct(L[1], P5[1]);
    // One alert per episode: not again within 7 days of the previous peso alert.
    const recent = st.pesoAlertedOn && (Date.parse(L[0]) - Date.parse(st.pesoAlertedOn)) < 7 * 86400000;
    const material = !recent && (Math.abs(d1) >= 2 || Math.abs(d5) >= 4);
    return { period: L[0], title: 'Peso (FIX)', views: ['ex'], material,
      stateExtra: material ? { pesoAlertedOn: L[0] } : {},
      headline: `Peso ${d5 >= 0 ? 'weaker' : 'stronger'}: ${L[1].toFixed(2)} per USD on ${L[0]} (USD/MXN ${sg(d1, 1)}% on the day, ${sg(d5, 1)}% in 5 sessions)` };
  },
  bono10: () => {
    const b = S('mbono10'); const L = last(b), P = last(b, 1); if (!L || !P) return null;
    const d = L[1] - P[1];
    return { period: L[0], title: '10-year M bono yield', views: ['bx'], material: Math.abs(d) >= 0.5,
      headline: `10-year M bono ${mon(L[0])} ${L[1].toFixed(2)}% (${sg(d * 100, 0)} bp)` };
  },
  inflExp: () => {
    const e = S('inflExp12m'); const L = last(e), P = last(e, 1); if (!L || !P) return null;
    const d = L[1] - P[1];
    return { period: L[0], title: 'Inflation expectations (12 months, Banxico survey)', views: ['bx'], material: Math.abs(d) >= 0.3,
      headline: `12-month inflation expectations ${mon(L[0])} ${L[1].toFixed(2)}% (${sg(d, 2)}pp)` };
  },
};
const VIEW_PARAM = { inpc: 'inpc', ac: 'activity', lb: 'labor', cc: 'confidence', ex: 'external', bx: 'banxico' };

// ---- compare with state ----
const seeding = !existsSync(STATE);
const state = seeding ? {} : JSON.parse(await readFile(STATE, 'utf8'));
const next = { ...state };
const toSend = [];
for (const [key, fn] of Object.entries(RELEASES)) {
  let r = null;
  try { r = fn(state); } catch (e) { console.log(`alerts: could not evaluate ${key} (${e.message}); skipped this run`); continue; }
  if (!r) continue;
  Object.assign(next, r.stateExtra || {});
  if (state[key] === r.period && !(key === 'policyRate' && r.material)) continue;
  next[key] = r.period;
  if (seeding) continue;
  console.log(`alerts: ${key} ${r.period}${r.material ? ' MATERIAL' : ''} - ${r.headline}`);
  if (r.material) toSend.push(r);
}
if (seeding) {
  if (!DRY) await writeFile(STATE, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log('alerts: no state file - seeded from the current data, nothing sent');
  process.exit(0);
}

if (!toSend.length) {
  if (!DRY) await writeFile(STATE, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log('alerts: nothing material this run');
  process.exit(0);
}

// ---- compose: the page's own summary lines for each affected view ----
let sections = {};
try {
  const ex = extractSummaries(await readFile(PAGE, 'utf8'), 'en');
  sections = ex.sections;
  if (ex.error) console.log(`alerts: summary extraction reported: ${ex.error.split('\n')[0]}`);
} catch (e) { console.log(`alerts: summary extraction failed (${e.message}); the email will carry headline figures only`); }

const today = new Date().toISOString().slice(0, 10);
let title = 'MATERIAL (MX): ' + toSend.map((r) => r.headline).join(' | ');
if (title.length > 240) title = title.slice(0, 237) + '...';
const lines = [`Mexico macro monitor - new data on ${today}. Material by the dashboard's thresholds: ${toSend.map((r) => r.title).join(', ')}.`, ''];
const shown = new Set();
for (const r of toSend) {
  lines.push(`## ${r.title} - ${mon(r.period)}`, `**${r.headline}**`);
  let any = false;
  for (const v of r.views) {
    if (shown.has(v)) { lines.push('- (See the same section above.)'); any = true; continue; }
    const s = sections[v]; if (!s) continue;
    shown.add(v); any = true;
    for (const [label, text] of s) lines.push(`- **${label}:** ${text}`);
  }
  if (!any) lines.push('- Summary text unavailable this run; the section on the dashboard has the full picture.');
  lines.push(`- Section: https://fnam.mx/mx/macro/?lang=en&view=${VIEW_PARAM[r.views[0]]}`, '');
}
lines.push('---', 'Automated alert from the Mexico macro pipeline (scripts/mx-macro/alerts.mjs); thresholds in that file. This issue is the queue for the email - nothing to do with it.');
const body = lines.join('\n');

if (DRY) { console.log(`\n[dry run] would open issue:\n${title}\n\n${body}`); process.exit(0); }
const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
if (!repo || !token) { console.log(`alerts: no GITHUB_TOKEN/GITHUB_REPOSITORY - printing instead (state not advanced)\n${title}\n\n${body}`); process.exit(0); }
let ok = false;
for (let i = 1; i <= 3 && !ok; i++) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'mx-macro-refresh', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  }).catch((e) => ({ ok: false, status: e.message }));
  if (res.ok) { const j = await res.json(); console.log(`alerts: issue #${j.number} opened - ${j.html_url}`); ok = true; }
  else { console.log(`alerts: issue create failed (${res.status}), attempt ${i}`); await new Promise((r) => setTimeout(r, 5000 * i)); }
}
// Advance the state only once the alert is queued, so a failed post is retried next run.
if (ok) await writeFile(STATE, JSON.stringify(next, null, 2) + '\n', 'utf8');
else process.exitCode = 1;
