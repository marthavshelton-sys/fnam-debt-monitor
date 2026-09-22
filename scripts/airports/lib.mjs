// Shared helpers for the airport-group models (ASUR, OMA): HTTP fetch with retries, HTML -> pipe-delimited
// text, PDF -> text (via scripts/airports/pdf2text.py), row tokenising and the data-file writer.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const BOT_UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)';
export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastReq = 0;
export async function fetchRaw(url, { ua = BOT_UA, delayMs = 500, tries = 4, accept = 'text/html,application/xhtml+xml,application/pdf,*/*' } = {}) {
  let lastErr = '';
  for (let attempt = 1; attempt <= tries; attempt++) {
    const wait = lastReq + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastReq = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': ua, Accept: accept, 'Accept-Language': 'en,es;q=0.8' }, redirect: 'follow' });
      if (res.ok) return { buf: Buffer.from(await res.arrayBuffer()), ct: res.headers.get('content-type') || '', finalUrl: res.url, status: res.status };
      if (res.status === 404) throw new Error(`${url} -> 404`);
      lastErr = `HTTP ${res.status}`;
    } catch (e) { if (/-> 404$/.test(e.message)) throw e; lastErr = e.message; }
    await sleep(1500 * attempt);
  }
  throw new Error(`${url} -> gave up (${lastErr})`);
}
export async function fetchText(url, opt) { const r = await fetchRaw(url, opt); return r.buf.toString('utf8'); }

// ---------- HTML -> structured text ----------
const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bull: '•', eacute: 'é', iacute: 'í', oacute: 'ó', aacute: 'á', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', trade: '™', reg: '®', copy: '©', sect: '§', middot: '·', hellip: '…', deg: '°', acute: '´' };
export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}
// Table cells become "a | b | c" rows. Raw newlines in the source are not significant in HTML, so they are
// collapsed first (PR Newswire puts each <td> on its own source line); block-level closers add the line breaks.
export function htmlToText(html) {
  let s = html
    .replace(/\r?\n/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|noscript)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/p>\s*(?=<\/t[dh]>)/gi, '').replace(/<br[^>]*>\s*(?=<\/t[dh]>)/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|table|tbody|thead|section|ul|ol|article|header|footer)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = decodeEntities(s).replace(/ /g, ' ');
  const lines = s.split('\n').map((l) => l.replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\|\s*/g, ' | ').replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '').trim());
  const out = [];
  for (const l of lines) { if (l === '' && out.length && out[out.length - 1] === '') continue; out.push(l); }
  return out.join('\n').trim() + '\n';
}

// ---------- dates ----------
const MONTH_IDX = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12', ene: '01', abr: '04', ago: '08', dic: '12' };
export const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function dateFromText(text) { // "July 27, 2026", "Sept. 8, 2026", "Jul 23, 2026"
  const m = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d\d)/i);
  return m ? `${m[3]}-${MONTH_IDX[m[1].toLowerCase().slice(0, 4)] || MONTH_IDX[m[1].toLowerCase().slice(0, 3)]}-${m[2].padStart(2, '0')}` : null;
}
export function addDaysIso(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// ---------- PDF ----------
const PDF2TEXT = fileURLToPath(new URL('pdf2text.py', import.meta.url));
export function pdfToText(pdfPath, txtPath, headerLines = []) {
  execFileSync('python3', [PDF2TEXT, pdfPath, txtPath, ...headerLines], { stdio: ['ignore', 'pipe', 'pipe'] });
}

// ---------- manifest + data writer ----------
export async function loadJson(url, fallback) { if (!existsSync(url)) return fallback; return JSON.parse(await readFile(url, 'utf8')); }
export async function saveJson(url, obj) { await mkdir(new URL('./', url), { recursive: true }); await writeFile(url, JSON.stringify(obj, null, 1), 'utf8'); }
// Write `window.<name> = <json>` only when the content changed; keep the previous generatedAt otherwise so an
// unchanged data set produces no diff (and therefore no bot commit).
export async function writeData(url, name, obj, generator) {
  let prev = null;
  try { const txt = await readFile(url, 'utf8'); prev = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); } catch { /* first run */ }
  const same = prev && JSON.stringify({ ...prev, generatedAt: null }) === JSON.stringify({ ...obj, generatedAt: null });
  const out = same ? { ...obj, generatedAt: prev.generatedAt } : obj;
  await mkdir(new URL('./', url), { recursive: true });
  await writeFile(url, `// AUTO-GENERATED by ${generator} — do not hand-edit.\n// Generated: ${out.generatedAt}\nwindow.${name} = ${JSON.stringify(out)};\n`, 'utf8');
  return !same;
}
export function header(text) { // "# key: value" lines at the top of a raw file
  const h = {};
  for (const line of text.split('\n').slice(0, 10)) { const m = line.match(/^# (\w+): (.*)$/); if (m) h[m[1]] = m[2]; }
  return h;
}

// ---------- rows ----------
export const norm = (s) => s.toLowerCase().replace(/[“”"’'´`]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
export const normLabel = (s) => norm(s).replace(/\((loss|income|used|gain|decrease|increase|expense|reduction|revenues?)\)/g, '').replace(/non-\s+/g, 'non-').replace(/\s+/g, ' ').replace(/\s+:/, ':').replace(/[:*]+$/, '').trim();
// "3.877.418" / "19,8" (Spanish locale in some PDFs) -> "3,877,418" / "19.8"
export const normNumber = (c) => (/^\(?-?\d{1,3}(\.\d{3})+(,\d+)?%?\)?$/.test(c) ? c.replace(/\./g, '').replace(',', '.') : /^\(?-?\d+,\d{1,2}\)?%?$/.test(c) ? c.replace(',', '.') : c);
const NUMTOK = /^\(?-?\d[\d,.]*%?\)?$|^-$|^n\/?a$|^n\.a\.$/i;
// Re-pipe a line whose trailing tokens are numbers but that the PDF converter left unsplit.
export function repipe(line) {
  if (!line.trim()) return line;
  const cells = line.split('|');
  const words = cells[0].trim().split(' ');
  const nums = []; while (words.length > 1 && NUMTOK.test(words[words.length - 1]) && /\d/.test(words[words.length - 1])) nums.unshift(words.pop());
  if (!nums.length || (cells.length === 1 && nums.length < 2)) return line;
  return [words.join(' ').replace(/[.:]$/, ''), ...nums, ...cells.slice(1).map((c) => c.trim())].join(' | ');
}
// "label | 2,655,135 | (733,545) | 29.0 | %" -> {label, toks:[{v, pct, dash}]}; null when a cell is not numeric.
export function tokenizeRow(line) {
  let cells = line.split('|').map((c) => c.trim());
  if (/^\(?-?[\d,]+(\.\d+)?%?\)?$/.test(cells[0]) && cells.length > 1) cells = ['', ...cells];
  const label = cells[0];
  const toks = [];
  for (let i = 1; i < cells.length; i++) {
    let c = normNumber(cells[i]);
    if (c === '' || c === ')' || c === '%' || c === '%)') continue;
    if (/^(-|–|—|n\/?a|n\.a\.|n\.m\.|nm)$/i.test(c)) { toks.push({ v: 0, pct: false, dash: true }); continue; }
    let neg = false;
    if (c.startsWith('(')) { neg = true; c = c.slice(1); }
    if (c.endsWith(')')) { c = c.slice(0, -1); neg = true; }
    let pct = false;
    if (c.endsWith('%')) { pct = true; c = c.slice(0, -1); }
    if (c.endsWith(')')) { c = c.slice(0, -1); neg = true; }
    c = c.replace(/,/g, '').trim();
    if (c.startsWith('-')) { neg = true; c = c.slice(1); }
    if (!/^\d+(\.\d+)?$/.test(c)) return null;
    let v = Number(c);
    if (neg) v = -v;
    const next = cells[i + 1] || '';
    if (next === '%' || next === '%)') pct = true;
    toks.push({ v, pct });
  }
  return { label, toks };
}
export function parsePeriodLabel(s) { // "2Q26" -> {q, fy}; "6M26" / "6M 2026" -> {months, fy}; "2026" -> {fy}
  let m = s.match(/^(\d)[QT](\d\d)$/i); if (m) return { q: +m[1], fy: 2000 + +m[2] };
  m = s.match(/^(\d{1,2})M\s?(\d\d|20\d\d)$/i); if (m) return { months: +m[1], fy: m[2].length === 4 ? +m[2] : 2000 + +m[2] };
  m = s.match(/^(20\d\d)$/); if (m) return { fy: +m[1] };
  return null;
}
export const qid = (fy, q) => `${fy}Q${q}`;

// ---------- table machinery shared by the build-data parsers ----------
// Map numeric tokens onto `groups` period-groups of `per` columns each ([prior, current, change] or
// [prior, current, changeAbs, changePct]); returns [[prior, current], ...] per group, or null.
export function assignValues(toks, groups, per = 3) {
  const attempt = (tk) => {
    const vals = tk.map((t) => t.v);
    if (vals.length === per * groups) return Array.from({ length: groups }, (_, g) => [vals[g * per], vals[g * per + 1]]);
    if (vals.length === 2 * groups) return Array.from({ length: groups }, (_, g) => [vals[g * 2], vals[g * 2 + 1]]);
    const nonPct = tk.filter((t) => !t.pct).map((t) => t.v);
    if (nonPct.length === 2 * groups) return Array.from({ length: groups }, (_, g) => [nonPct[g * 2], nonPct[g * 2 + 1]]);
    if (nonPct.length === groups) return Array.from({ length: groups }, (_, g) => [null, nonPct[g]]);
    if (groups === 1 && nonPct.length >= 2) return [[nonPct[0], nonPct[1]]];
    return null;
  };
  const exact = attempt(toks) || (toks.some((t) => t.dash) ? attempt(toks.filter((t) => !t.dash)) : null);
  if (exact || per !== 3) return exact;
  // Partial rows (a period left blank): walk left to right, a group closes on its change token
  const gs = []; let cur = [];
  for (const t of toks) {
    if (cur.length === 2) { gs.push(cur); cur = []; continue; }
    if (t.dash && cur.length === 1) { gs.push([cur[0], null]); cur = []; continue; }
    if (t.pct) { gs.push(cur.length ? [cur[0], null] : [null, null]); cur = []; continue; }
    cur.push(t.dash ? 0 : t.v);
  }
  if (cur.length) gs.push(cur.length === 2 ? cur : [cur[0], null]);
  if (!gs.length || gs.length > groups) return null;
  while (gs.length < groups) gs.push([null, null]);
  return gs;
}
// Rows of a PDF-extracted table. pdfplumber sometimes emits a numeric row whose label sits on the next
// (or previous) line; such rows are re-joined here. Yields {label, toks, line}.
export function pdfRows(lines, start, end, { footnoteFix = false } = {}) {
  const out = [];
  const isLabelOnly = (l) => l && !/\|/.test(l) && !/^\(?-?[\d,]+(\.\d+)?%?\)?$/.test(l.trim()) && /[A-Za-z]/.test(l) && !/^<<page/.test(l);
  for (let i = start; i < end; i++) {
    const l = lines[i]; if (!l || !/\|/.test(l)) continue;
    const row = tokenizeRow(l); if (!row || !row.toks.length) continue;
    const labels = [];
    if (row.label) labels.push(row.label);
    else {
      const next = (lines[i + 1] || '').trim(), prev = (lines[i - 1] || '').trim();
      if (isLabelOnly(next)) { labels.push(next); if (isLabelOnly(prev)) labels.push(prev + ' ' + next); }
      if (isLabelOnly(prev)) labels.push(prev);
    }
    // A footnote digit glued to the first figure ("3146.8 | 153.6", "13,608,582 | 3,529,798"): drop it when the
    // remainder is within a third of the next figure.
    const t = row.toks;
    if (footnoteFix && t.length >= 2 && !t[0].dash && !t[1].dash && t[0].v > 0 && t[1].v > 0) {
      const a = String(t[0].v), b = String(Math.round(t[1].v));
      if (a.replace(/\..*$/, '').length === b.length + 1 && !/^0/.test(a)) { const r = Number(a.slice(1)); if (r > 0 && Math.abs(r / t[1].v - 1) < 0.35) t[0] = { ...t[0], v: t[0].v < 0 ? -r : r, fixed: true }; }
    }
    out.push({ label: labels[0] || '', labels, toks: t, line: i });
  }
  return out;
}
export function parseRows(rows, catalogue, groups, per = 3) {
  const out = Array.from({ length: groups }, () => ({}));
  const unmatched = [];
  for (const row of rows) {
    let lab = normLabel(row.label || ''), def = null;
    for (const cand of (row.labels && row.labels.length ? row.labels : [row.label || ''])) { const nl = normLabel(cand); const d = catalogue.find((x) => (x.unlabeled ? nl === '' : x.re.test(nl))); if (d) { def = d; lab = nl; break; } }
    if (!def) { if (lab) unmatched.push(lab); continue; }
    const vals = assignValues(row.toks, groups, per);
    if (!vals) { unmatched.push(lab + ' (layout)'); continue; }
    vals.forEach((pair, g) => { if (!(def.k in out[g])) out[g][def.k] = pair; });
  }
  return { out, unmatched };
}
export function mapPair(obj, i) { const o = {}; for (const [k, pair] of Object.entries(obj)) if (pair && pair[i] != null) o[k] = pair[i]; return o; }
