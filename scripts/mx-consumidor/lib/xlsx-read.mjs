// Minimal, dependency-free reader for .xlsx workbooks (INEGI, Banxico and the CNBV publish many tables
// only as Excel). Uses the runner's `unzip` to read the parts and regular expressions for the XML: enough for plain
// data sheets (shared strings, inline strings, numbers, booleans); styles, dates-as-styles and formulas are ignored
// (a formula cell yields its cached value).
//
//   const wb = openXlsx('/path/file.xlsx');
//   wb.sheets            -> ['Page 3 Data', ...] in workbook order
//   wb.rows('Page 3 Data') -> [[cell, cell, ...], ...]  (null for empty cells; numbers as Number)
import { execFileSync } from 'node:child_process';

const MAX = 256 * 1024 * 1024;
function part(file, name) {
  try { return execFileSync('unzip', ['-p', file, name], { maxBuffer: MAX }).toString('utf8'); }
  catch { return null; }
}
function decode(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/_x000D_/g, '');
}
function attr(tag, name) {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag);
  return m ? decode(m[1]) : null;
}
// text of every <t> inside a string item, phonetic runs (<rPh>) dropped
function siText(xml) {
  const clean = xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const m of clean.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) out += decode(m[1] || '');
  return out;
}
function colIndex(ref) {
  let n = 0;
  for (const ch of ref) { const c = ch.charCodeAt(0); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); }
  return n - 1;
}

export function openXlsx(file) {
  const wbXml = part(file, 'xl/workbook.xml');
  if (!wbXml) throw new Error(`${file}: not an xlsx workbook (xl/workbook.xml missing)`);
  const relsXml = part(file, 'xl/_rels/workbook.xml.rels') || '';
  const rels = {};
  for (const m of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1], 'Id'), target = attr(m[1], 'Target');
    if (id && target) rels[id] = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
  }
  const sheetList = [];
  for (const m of wbXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = attr(m[1], 'name'), rid = attr(m[1], 'r:id') || attr(m[1], 'id');
    if (name && rels[rid]) sheetList.push({ name, path: rels[rid] });
  }
  let shared = null;
  function strings() {
    if (shared) return shared;
    const xml = part(file, 'xl/sharedStrings.xml') || '';
    shared = [];
    for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) shared.push(m[1] ? siText(m[1]) : '');
    return shared;
  }
  function rows(name) {
    const s = sheetList.find((x) => x.name === name);
    if (!s) throw new Error(`${file}: no sheet named "${name}" (has: ${sheetList.map((x) => x.name).join(' | ')})`);
    const xml = part(file, s.path);
    if (xml == null) throw new Error(`${file}: sheet part ${s.path} missing`);
    const out = [];
    for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rIdx = Number(attr(rm[1], 'r')) - 1;
      const row = [];
      let next = 0;
      for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(cm[1], 'r');
        const ci = ref ? colIndex(ref) : next;
        next = ci + 1;
        const t = attr(cm[1], 't');
        const body = cm[2] || '';
        const vm = /<v>([\s\S]*?)<\/v>/.exec(body);
        let val = null;
        if (t === 'inlineStr') val = siText(body);
        else if (vm) {
          const raw = decode(vm[1]);
          if (t === 's') val = strings()[Number(raw)] ?? null;
          else if (t === 'str' || t === 'e') val = raw;
          else if (t === 'b') val = raw === '1';
          else { const n = Number(raw); val = Number.isFinite(n) ? n : raw; }
        }
        while (row.length < ci) row.push(null);
        row[ci] = val;
      }
      const at = Number.isFinite(rIdx) && rIdx >= 0 ? rIdx : out.length;
      while (out.length < at) out.push([]);
      out[at] = row;
    }
    return out;
  }
  return { sheets: sheetList.map((s) => s.name), rows };
}

// Excel serial date (1900 system) -> 'YYYY-MM-DD'
export function excelDate(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000));
  return d.toISOString().slice(0, 10);
}
