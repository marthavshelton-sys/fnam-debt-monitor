// BMV eventos relevantes watch: the fail-safe for filings that never reach a company's wire or IR site.
//
// The BMV's list of an issuer's eventos relevantes is the official disclosure channel in Mexico: every material
// event a listed company files is there, including ones it never sends to PR Newswire / GlobeNewswire or posts
// on its IR site (ASUR's 28-Sep-2026 offering disclosure with the US$1,230 M CPC bridge loan was one). For each
// company this script reads that list, matches every notice against the documents the company's own harvester
// already archived, and archives each other notice (PDF -> text, Spanish) into the directory the company's alert
// routine reads, as `<date>_bmv<id>_es.txt` with class `other`. A results or traffic notice is matched like any
// other and archived too when no document matches it after a day (the wire or IR copy may lag by a few hours), so a
// misread title can delay a notice by a day but never drop it.
//
//   node scripts/lib/bmv-events.mjs --company=asur|oma|gap|qualitas|gentera
//
// State: tools/<slug>/raw/bmv-events.json (when the list was last read, the error if any, every notice seen and
// how it was handled: covered by a harvested document, archived, or a results/traffic notice with no match).
// A network error, a BMV maintenance page or a layout change is recorded in that file and never fails the run;
// the validators show the list's freshness on each data-quality page (stale after 4 days).
// Needs python3 with pdfplumber for the PDF conversion (scripts/airports/pdf2text.py).
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRaw, decodeEntities, pdfToText } from '../airports/lib.mjs';

const ROOT = new URL('../../', import.meta.url);
const BMV = 'https://www.bmv.com.mx';
// since: notices older than this are ignored (ASUR's list was first read back to 2024; the others start with 2026).
export const COMPANIES = {
  asur: { issuer: 'ASUR-6001-CGEN_CAPIT', dir: 'tools/asur/raw/releases', since: '2024-01-01', docs: 'headers' },
  oma: { issuer: 'OMA-6707-CGEN_CAPIT', dir: 'tools/oma/raw/releases', since: '2026-01-01', docs: 'headers' },
  gap: { issuer: 'GAP-6579-CGEN_CAPIT', dir: 'tools/gap/raw/6k', since: '2026-01-01', docs: 'headers' },
  qualitas: { issuer: 'Q-7790-CGEN_CAPIT', dir: 'tools/qualitas/raw/text/events', since: '2026-01-01', docs: { manifest: 'tools/qualitas/raw/manifest.json', prefix: 'reports:' } },
  gentera: { issuer: 'GENTERA-7472-CGEN_CAPIT', dir: 'tools/gentera/raw/text/events', since: '2026-01-01', docs: { manifest: 'tools/gentera/raw/manifest.json', prefix: 'release:' } },
};
export const STALE_DAYS = 4; // weekdays-only schedules: Friday's read is still fresh on Tuesday morning
const MAX_ARCHIVE = 40;       // PDFs fetched per run, newest first; any backlog follows on the next runs
const statePath = (slug) => new URL(`tools/${slug}/raw/bmv-events.json`, ROOT);
export const listingUrl = (c) => `${BMV}/es/emisoras/eventosrelevantes/${c.issuer}`;

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;
export function bmvClass(t) {
  if (/fecha|conferencia|llamada|invitaci|convocatoria/i.test(t)) return 'other'; // results-date and call notices matter
  if (/resultados\s+(del?\s+)?\d\s?t|reenv[ií]o del? (resultados\s+)?\d\s?t|resultados (operativos y financieros )?(del )?(primer|segundo|tercer|cuarto) trimestre|reporte trimestral|earnings results|reports? [1-4]q\d\d results/i.test(t)) return 'results';
  if (/tr[aá]fico|pasajeros/i.test(t)) return 'traffic';
  return 'other';
}
const quarterOf = (t) => { const m = t.match(/\b([1-4])\s?[TQ]\s?(20)?(\d\d)\b/i); return m ? `20${m[3]}Q${m[1]}` : null; }; // 2T26, 2Q26, 4T 2025

// The listing: the "EVENTOS RELEVANTES DE LA EMISORA" table, one row per notice (date, subject, PDF and/or ZIP).
export function parseListing(html) {
  const sec = html.slice(Math.max(0, html.indexOf('EVENTOS RELEVANTES DE LA EMISORA')));
  const end = sec.indexOf('</table>');
  if (end < 0) return [];
  return [...sec.slice(0, end).matchAll(/<tr>\s*<td>(\d\d)-(\d\d)-(\d{4}) (\d\d:\d\d)<\/td>\s*<td>([\s\S]*?)<\/td>([\s\S]*?)<\/tr>/g)].map((m) => {
    const pdf = m[6].match(/href="(\/docs-pub\/eventemi\/eventemi_(\d+)_\d+\.pdf)"/), zip = m[6].match(/eventemi_(\d+)_\d+\.zip/);
    return { date: `${m[3]}-${m[2]}-${m[1]}`, title: norm(decodeEntities(m[5].replace(/<[^>]+>/g, ''))), id: pdf ? pdf[2] : zip ? zip[1] : null, pdf: pdf ? BMV + pdf[1] : null };
  }).filter((r) => r.id);
}

// Documents the company's own harvester archived, as { key, date, kind, quarter }.
async function harvestedDocs(c) {
  if (c.docs === 'headers') { // airport groups and GAP: text files with "# date:" / "# class:" header lines
    const dir = new URL(c.dir + '/', ROOT); if (!existsSync(dir)) return [];
    const out = [];
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.txt') && !/_bmv\d+_/.test(x))) {
      const head = (await readFile(new URL(f, dir), 'utf8')).slice(0, 1200); const h = {};
      for (const line of head.split('\n').slice(0, 10)) { const m = line.match(/^# (\w+): (.*)$/); if (m) h[m[1]] = m[2].trim(); }
      if (h.date) out.push({ key: f, date: h.date, kind: h.class === 'results-pdf' ? 'results' : h.class, quarter: null });
    }
    return out;
  }
  const mf = JSON.parse(await readFile(new URL(c.docs.manifest, ROOT), 'utf8')); // Quálitas, Gentera: quarterly reports by quarter
  return Object.keys(mf.items || {}).filter((k) => k.startsWith(c.docs.prefix)).map((k) => ({ key: k, date: null, kind: 'results', quarter: k.slice(c.docs.prefix.length) }));
}

export async function watch(slug) {
  const c = COMPANIES[slug]; if (!c) throw new Error(`unknown company ${slug}`);
  const url = listingUrl(c);
  const prev = existsSync(statePath(slug)) ? JSON.parse(await readFile(statePath(slug), 'utf8')) : {};
  const state = { issuer: c.issuer, url, since: c.since, checkedAt: prev.checkedAt || null, rows: prev.rows || 0, archived: 0, pending: 0, unmatched: [], error: null, seen: prev.seen || [] };
  const seen = new Map(state.seen.map((s) => [s.id, s]));
  let rows = [];
  try {
    const r = await fetchRaw(url, { tries: 3 });
    if (/no_disponible|mantenimiento/i.test(r.finalUrl || '')) throw new Error('the BMV site answered with its maintenance page');
    rows = parseListing(r.buf.toString('utf8'));
    if (!rows.length) throw new Error('the listing parsed to zero rows (page layout changed?)');
    state.checkedAt = new Date().toISOString(); state.rows = rows.length;
  } catch (e) { state.error = e.message; }

  const docs = await harvestedDocs(c);
  const used = new Set(state.seen.filter((s) => s.coveredBy).map((s) => s.coveredBy));
  const dir = new URL(c.dir + '/', ROOT); const tmp = join(tmpdir(), `bmv-${slug}`);
  const today = new Date().toISOString().slice(0, 10);
  // Matching. Results and traffic: a document of the same kind within a day (Quálitas, Gentera: the quarter's report).
  // Any other notice: a document of class 'other' dated the same day. When a day has more BMV notices of a kind than
  // unused documents, every notice of that day is archived: titles are Spanish on the BMV and English on the wire,
  // so they cannot be paired reliably, and archiving a duplicate is cheap while dropping a filing is not.
  const pending = [];
  for (const r of rows.filter((x) => x.date >= c.since)) {
    if (seen.has(r.id)) continue;
    const entry = { id: r.id, date: r.date, title: r.title, class: bmvClass(r.title), attachment: r.pdf };
    const dup = state.seen.find((s) => s.date === r.date && s.title === r.title) || pending.find((p) => p.entry.date === r.date && p.entry.title === r.title);
    if (dup) { entry.coveredBy = `bmv:${dup.id || dup.entry.id}`; seen.set(r.id, entry); state.seen.push(entry); continue; } // the same notice filed twice
    pending.push({ r, entry });
  }
  const win = (k) => (k === 'other' ? 0 : 1);
  const cover = (entry, d) => { entry.coveredBy = d.key; seen.set(entry.id, entry); state.seen.push(entry); };
  const loose = [];
  const groups = new Map(); // kind|date -> notices; a group is covered only as a whole
  for (const p of pending) {
    const q = c.docs === 'headers' ? null : quarterOf(p.r.title);
    if (q) { const d = docs.find((x) => x.kind === p.entry.class && x.quarter === q); if (d) { cover(p.entry, d); continue; } loose.push(p); continue; }
    const g = `${p.entry.class}|${p.r.date}`; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(p);
  }
  const candsOf = (k, date) => docs.filter((d) => d.kind === k && !used.has(d.key) && d.date && days(d.date, date) <= win(k)).sort((a, b) => days(a.date, date) - days(b.date, date));
  const order = [...groups.entries()].map(([g, ps]) => { const [k, date] = g.split('|'); const cs = candsOf(k, date); return { k, date, ps, best: cs.length ? days(cs[0].date, date) : 9 }; })
    .sort((a, b) => a.best - b.best || a.date.localeCompare(b.date)); // exact-date pairs first, so a neighbour cannot take them
  for (const g of order) {
    const cs = candsOf(g.k, g.date);
    if (cs.length && g.ps.length <= cs.length) { g.ps.forEach((p, i) => { cover(p.entry, cs[i]); used.add(cs[i].key); }); continue; }
    loose.push(...g.ps);
  }
  const toArchive = [];
  for (const { r, entry } of loose) {
    if (entry.class !== 'other') { // parsed from the company's own documents; give that harvest a day, then archive the BMV copy
      if (days(r.date, today) <= 1) continue;
      state.unmatched.push(`${r.date} ${r.title}`); entry.unmatched = true;
    }
    const file = `${r.date}_bmv${r.id}_es.txt`;
    if (existsSync(new URL(file, dir))) { entry.file = `${c.dir}/${file}`; seen.set(r.id, entry); state.seen.push(entry); continue; } // archived before
    toArchive.push({ r, entry, file });
  }
  toArchive.sort((a, b) => b.r.date.localeCompare(a.r.date));
  state.pending = Math.max(0, toArchive.length - MAX_ARCHIVE);
  if (toArchive.length) { await mkdir(dir, { recursive: true }); await mkdir(tmp, { recursive: true }); }
  for (const { r, entry, file } of toArchive.slice(0, MAX_ARCHIVE)) {
    let body = `(The BMV attachment is a ZIP/XBRL package, not a PDF; open the listing: ${url})`;
    if (r.pdf) {
      try {
        const res = await fetchRaw(r.pdf, { accept: 'application/pdf,*/*', tries: 3 });
        if (res.buf.slice(0, 4).toString() !== '%PDF') throw new Error('not a PDF');
        const pdfPath = join(tmp, `${r.id}.pdf`), txtPath = join(tmp, `${r.id}.txt`);
        await writeFile(pdfPath, res.buf); pdfToText(pdfPath, txtPath);
        body = await readFile(txtPath, 'utf8');
      } catch (e) { state.error = `${r.id}: ${e.message}`; console.error(`BMV ${slug} ${r.date} ${r.id}: ${e.message}`); continue; } // retried next run
    }
    await writeFile(new URL(file, dir), `# source: ${r.pdf || url}\n# title: ${r.title}\n# date: ${r.date}\n# lang: es\n# class: other\n# via: BMV eventos relevantes (no wire or IR document matched)\n\n${body}`);
    entry.file = `${c.dir}/${file}`; state.seen.push(entry); state.archived++;
    console.log(`${r.date} bmv ${slug} archived: ${r.title.slice(0, 100)}`);
  }
  await rm(tmp, { recursive: true, force: true });
  state.seen.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  await writeFile(statePath(slug), JSON.stringify(state, null, 1) + '\n', 'utf8');
  console.log(`BMV eventos relevantes ${slug}: ${state.error ? 'ERROR ' + state.error : `${state.rows} notices listed`}; ${state.archived} archived, ${state.pending} pending, ${state.unmatched.length} of them results/traffic notices with no matching document`);
  return state;
}

// For the validators: freshness of the list and a one-line note (es/en). Null when the company has no state yet.
export async function bmvHealth(slug) {
  if (!existsSync(statePath(slug))) return null;
  {
    const s = JSON.parse(await readFile(statePath(slug), 'utf8'));
    const note = s.error ? { es: `error en la última corrida: ${s.error}`, en: `error on the last run: ${s.error}` }
      : { es: `${s.rows} avisos listados; ${s.archived} archivados en esta corrida sin comunicado del cable o del sitio de RI${s.unmatched.length ? `; ${s.unmatched.length} de resultados/tráfico archivados sin documento propio` : ''}`, en: `${s.rows} notices listed; ${s.archived} archived on this run with no wire or IR document${s.unmatched.length ? `; ${s.unmatched.length} results/traffic notices archived with no document of their own` : ''}` };
    return { series: 'BMV eventos relevantes (bmv-events.json)', lastDate: (s.checkedAt || '').slice(0, 10) || null, limit: STALE_DAYS, note };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const slug = (process.argv.find((a) => a.startsWith('--company=')) || '').split('=')[1];
  watch(slug).catch((e) => { console.error(e); process.exit(1); });
}
