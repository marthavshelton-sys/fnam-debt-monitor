// Minimal, dependency-free reader for legacy .xls workbooks (BIFF8 inside an OLE2 compound file). Federal Student Aid
// publishes its portfolio tables only in this format. Enough for plain data sheets: shared strings (with CONTINUE
// records), numbers, RK and MULRK cells, cached formula results, inline labels. Styles and dates-as-styles are ignored.
//
//   const wb = openXls(buffer);
//   wb.sheets              -> ['Portfolio by Loan Status', ...] in workbook order
//   wb.rows('sheet name')  -> [[cell, cell, ...], ...]  (null for empty cells; numbers as Number)

const SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ENDOFCHAIN = 0xfffffffe;

// ---- OLE2 compound file: returns the bytes of the "Workbook" (or "Book") stream
function workbookStream(buf) {
  for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) throw new Error('not an OLE2 compound file (.xls)');
  const sectorSize = 1 << buf.readUInt16LE(30), miniSize = 1 << buf.readUInt16LE(32);
  const dirStart = buf.readUInt32LE(48), miniCutoff = buf.readUInt32LE(56), miniFatStart = buf.readUInt32LE(60);
  let difatSector = buf.readUInt32LE(68); const difatCount = buf.readUInt32LE(72);
  const sectorAt = (n) => 512 + n * sectorSize;   // the header occupies the first 512 bytes (version 3)
  const fatSectors = [];
  for (let i = 0; i < 109; i++) { const s = buf.readUInt32LE(76 + i * 4); if (s < 0xfffffffa) fatSectors.push(s); }
  for (let n = 0; n < difatCount && difatSector < 0xfffffffa; n++) {
    const off = sectorAt(difatSector);
    for (let i = 0; i < sectorSize / 4 - 1; i++) { const s = buf.readUInt32LE(off + i * 4); if (s < 0xfffffffa) fatSectors.push(s); }
    difatSector = buf.readUInt32LE(off + sectorSize - 4);
  }
  const fat = [];
  for (const s of fatSectors) { const off = sectorAt(s); for (let i = 0; i < sectorSize / 4; i++) fat.push(buf.readUInt32LE(off + i * 4)); }
  const chain = (start) => { const out = []; let s = start, guard = 0; while (s < 0xfffffffa && s !== ENDOFCHAIN && guard++ < 1e6) { out.push(s); s = fat[s]; } return out; };
  const read = (start, size) => { const parts = chain(start).map((s) => buf.subarray(sectorAt(s), sectorAt(s) + sectorSize)); const all = Buffer.concat(parts); return size == null ? all : all.subarray(0, size); };
  const dir = read(dirStart);
  let root = null, book = null;
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = dir.readUInt16LE(off + 64); if (!nameLen) continue;
    const name = dir.subarray(off, off + Math.max(0, nameLen - 2)).toString('utf16le');
    const type = dir[off + 66], start = dir.readUInt32LE(off + 116), size = dir.readUInt32LE(off + 120);
    if (type === 5) root = { start, size };
    else if (type === 2 && /^(Workbook|Book)$/i.test(name) && (!book || /^Workbook$/i.test(name))) book = { start, size };
  }
  if (!book) throw new Error('.xls file: no Workbook stream');
  if (book.size >= miniCutoff) return read(book.start, book.size);
  // small streams live in the mini stream (inside the root entry), chained through the mini FAT
  if (!root) throw new Error('.xls file: no root entry for the mini stream');
  const mini = read(root.start, root.size), miniFatBuf = read(miniFatStart), miniFat = [];
  for (let i = 0; i + 4 <= miniFatBuf.length; i += 4) miniFat.push(miniFatBuf.readUInt32LE(i));
  const parts = []; let s = book.start, guard = 0;
  while (s < 0xfffffffa && s !== ENDOFCHAIN && guard++ < 1e6) { parts.push(mini.subarray(s * miniSize, (s + 1) * miniSize)); s = miniFat[s]; }
  return Buffer.concat(parts).subarray(0, book.size);
}

// ---- BIFF records
function* records(wb, from = 0) {
  let p = from;
  while (p + 4 <= wb.length) {
    const id = wb.readUInt16LE(p), len = wb.readUInt16LE(p + 2);
    yield { id, off: p + 4, len, next: p + 4 + len };
    p += 4 + len;
  }
}
const rk = (v) => { const div = v & 1, isInt = v & 2; let n; if (isInt) n = v >> 2; else { const b = Buffer.alloc(8); b.writeUInt32LE(v & 0xfffffffc, 4); n = b.readDoubleLE(0); } return div ? n / 100 : n; };

// the shared string table; a string may continue in CONTINUE records, where its remaining characters start with a new
// one-byte "compressed or 16-bit" flag
function readSst(wb, rec, recs, idx) {
  const segs = [{ off: rec.off, end: rec.off + rec.len }];
  for (let j = idx + 1; j < recs.length && recs[j].id === 0x003c; j++) segs.push({ off: recs[j].off, end: recs[j].off + recs[j].len });
  let si = 0, p = segs[0].off;
  const need = () => { while (p >= segs[si].end) { si++; if (si >= segs.length) throw new Error('.xls file: shared strings run past their records'); p = segs[si].off; } };
  const u8 = () => { need(); return wb[p++]; };
  const u16 = () => { need(); if (p + 2 > segs[si].end) { const a = u8(), b = u8(); return a | (b << 8); } const v = wb.readUInt16LE(p); p += 2; return v; };
  const u32 = () => { const a = u16(), b = u16(); return (a | (b << 16)) >>> 0; };
  const skip = (n) => { while (n > 0) { need(); const take = Math.min(n, segs[si].end - p); p += take; n -= take; } };
  u32(); const unique = u32();
  const out = [];
  for (let k = 0; k < unique; k++) {
    let cch = u16(); let flags = u8();
    const runs = flags & 0x08 ? u16() : 0, ext = flags & 0x04 ? u32() : 0;
    let s = '';
    while (cch > 0) {
      if (p >= segs[si].end) { need(); flags = (flags & ~1) | (wb[p++] & 1); }   // continuation: a fresh flag byte
      const wide = flags & 1, avail = segs[si].end - p, take = Math.min(cch, wide ? Math.floor(avail / 2) : avail);
      if (take <= 0) { p = segs[si].end; continue; }
      s += wide ? wb.subarray(p, p + take * 2).toString('utf16le') : wb.subarray(p, p + take).toString('latin1');
      p += take * (wide ? 2 : 1); cch -= take;
    }
    skip(runs * 4 + ext);
    out.push(s);
  }
  return out;
}
const shortStr = (wb, off, lenBytes) => {   // BOUNDSHEET / LABEL / STRING: length, flags, characters
  const cch = lenBytes === 1 ? wb[off] : wb.readUInt16LE(off); const flags = wb[off + lenBytes], start = off + lenBytes + 1;
  return flags & 1 ? wb.subarray(start, start + cch * 2).toString('utf16le') : wb.subarray(start, start + cch).toString('latin1');
};

export function openXls(buf) {
  const wb = workbookStream(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
  const recs = [...records(wb)];
  let sst = []; const bounds = [];
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    if (r.id === 0x00fc) sst = readSst(wb, r, recs, i);
    else if (r.id === 0x0085) bounds.push({ off: wb.readUInt32LE(r.off), type: wb[r.off + 5], name: shortStr(wb, r.off + 6, 1) });
    else if (r.id === 0x000a && bounds.length) break;   // end of the workbook globals
  }
  const sheets = bounds.filter((b) => b.type === 0);
  function rows(name) {
    const b = sheets.find((x) => x.name === name);
    if (!b) throw new Error(`.xls file: no sheet named "${name}" (sheets: ${sheets.map((x) => x.name).join(', ')})`);
    const grid = []; const set = (r, c, v) => { (grid[r] = grid[r] || [])[c] = v; };
    let pending = null, depth = 0;
    for (const r of records(wb, b.off)) {
      const o = r.off;
      if (r.id === 0x0809) { depth++; continue; }
      if (r.id === 0x000a) { depth--; if (depth <= 0) break; continue; }
      if (depth !== 1) continue;   // charts embedded in the sheet have their own BOF … EOF
      if (r.id === 0x00fd) set(wb.readUInt16LE(o), wb.readUInt16LE(o + 2), sst[wb.readUInt32LE(o + 6)] ?? null);
      else if (r.id === 0x0203) set(wb.readUInt16LE(o), wb.readUInt16LE(o + 2), wb.readDoubleLE(o + 6));
      else if (r.id === 0x027e) set(wb.readUInt16LE(o), wb.readUInt16LE(o + 2), rk(wb.readInt32LE(o + 6)));
      else if (r.id === 0x00bd) { const row = wb.readUInt16LE(o); let c = wb.readUInt16LE(o + 2); for (let q = o + 4; q + 6 <= o + r.len - 2; q += 6, c++) set(row, c, rk(wb.readInt32LE(q + 2))); }
      else if (r.id === 0x0204) set(wb.readUInt16LE(o), wb.readUInt16LE(o + 2), shortStr(wb, o + 6, 2));
      else if (r.id === 0x0006) {   // formula: the cached result is a number, or a string in the STRING record that follows
        const row = wb.readUInt16LE(o), col = wb.readUInt16LE(o + 2);
        if (wb.readUInt16LE(o + 12) === 0xffff) { if (wb[o + 6] === 0) pending = { row, col }; else if (wb[o + 6] === 1) set(row, col, !!wb[o + 8]); }
        else set(row, col, wb.readDoubleLE(o + 6));
      } else if (r.id === 0x0207 && pending) { set(pending.row, pending.col, shortStr(wb, o, 2)); pending = null; }
    }
    const out = [];
    for (let r = 0; r < grid.length; r++) { const row = grid[r] || []; const a = []; for (let c = 0; c < row.length; c++) a.push(row[c] === undefined ? null : row[c]); out.push(a); }
    return out;
  }
  return { sheets: sheets.map((x) => x.name), rows };
}
