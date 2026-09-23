"""Parse AICM "AICM en Cifras" PDFs into aicm.json (monthly passengers, operations, cargo; national / international).

Usage:  python parse_aicm.py <workdir>
  <workdir> must contain the PDFs downloaded from https://www.aicm.com.mx/categoria/estadisticas, named aicm-*.pdf
  (the latest monthly file plus the December / year-end file of each earlier year; each PDF carries the current and
  the previous year, and later files override earlier ones). Requires: pip install pypdf
"""
import re, glob, os, json, sys
import pypdf

W = sys.argv[1]
MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
num = r'-?[\d,]+(?:\.\d+)?'
row_re = re.compile(r'^\s*(' + '|'.join(MONTHS) + r')\*{0,2}\s+((?:' + num + r'\s+)*' + num + r')\s*$')
dec_re = re.compile(r'^-?\d{1,3}(,\d{3})+\.\d+$')


def tofloat(s):
    return float(s.replace(',', ''))


def year_of(fn):
    return int(re.search(r'(20\d\d)', os.path.basename(fn)).group(1))


out = {'pax': {}, 'ops': {}, 'cargo': {}}
for f in sorted(glob.glob(os.path.join(W, 'aicm-*.pdf')), key=year_of):
    yr = year_of(f); prev = yr - 1
    reader = pypdf.PdfReader(f)
    kinds_seen = []
    for pnum, page in enumerate(reader.pages, 1):
        lines = (page.extract_text() or '').split('\n')
        rows = {}
        for l in lines:
            m = row_re.match(l)
            if not m:
                continue
            mon = MONTHS.index(m.group(1)) + 1
            vals = [tofloat(t) for t in m.group(2).split()]
            n = len(vals)
            if n == 9 or n == 6:
                rows[mon] = (vals[0:3], vals[3:6])          # prev-year nat/intl/total, current-year nat/intl/total (+ % changes)
            elif n == 3:
                rows[mon] = (vals[0:3], None)               # prev year only (month not yet elapsed)
            elif n == 7:
                rows[mon] = (None, [vals[0] + vals[3], vals[1] + vals[4], vals[6]])   # per-terminal table: T1 nat/intl/sub, T2 nat/intl/sub, total
        if len(rows) < 6:
            continue
        jan = rows.get(1) or next(iter(rows.values()))
        ref = (jan[0] or jan[1])[2]
        has_dec = any(dec_re.match(t) for l in lines for t in l.split())
        if ref > 400000:
            kind = 'pax'
        elif has_dec:
            kind = 'cargo'
        elif 5000 < ref < 80000:
            kind = 'ops'
        else:
            continue
        if any(k.startswith(kind) for k in kinds_seen):
            continue      # first table of each kind in a file = the totals table
        kinds_seen.append(kind + '@p' + str(pnum))
        for mon, (pv, cv) in rows.items():
            for y, v in ((prev, pv), (yr, cv)):
                if v is None:
                    continue
                out[kind]['%d-%02d' % (y, mon)] = {'dom': v[0], 'intl': v[1], 'total': v[2], 'src': os.path.basename(f)}
    print(os.path.basename(f), 'tables:', kinds_seen)

json.dump(out, open(os.path.join(W, 'aicm.json'), 'w', encoding='utf-8'), ensure_ascii=False)
for k in out:
    ks = sorted(out[k]); print(k, len(ks), ks[0], '..', ks[-1])
