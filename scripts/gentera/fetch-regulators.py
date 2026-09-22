#!/usr/bin/env python3
"""Monthly regulator series for Gentera's two banks, written to tools/gentera/raw/regulators.json and folded
into site/gentera/data/operations.js (`monthly`) by build_data.py.

  CNBV — Boletín Estadístico Banca Múltiple (monthly xlsx), rows for "Banco Compartamos":
         https://portafolioinfo.cnbv.gob.mx/PortafolioInformacion/BE_BM_YYYYMM.xlsx     (through Oct-2024)
         https://portafolioinfo.cnbv.gob.mx/PortafolioInformacion/BE BM YYYYMM.xlsx     (from Nov-2024)
         Series kept: cartera de crédito total, IMOR (stage-3 ratio), captación tradicional, resultado neto
         (acumulado en el año). The workbook has one sheet per table; sheets are located by their title text
         and the Compartamos row by name, so a re-ordering of sheets does not break the fetch.
  SBS Perú — monthly statistics per bank (Compartamos Financiera until 2024 under Empresas Financieras, p=2;
         Compartamos Banco from 2025 under Banca Múltiple):
         https://www.sbs.gob.pe/app/stats/EstadisticaSistemaFinancieroResultados.asp?c=B-2201  balance and P&L
         B-2334 loans by type and status · B-2362 delinquency · B-2369 write-offs
         The page lists one xls per month; the newest not yet fetched is downloaded and the Compartamos column
         read (soles thousands → millions).

Both sources are best-effort: a month that cannot be fetched or parsed is logged and skipped, the previous
months are kept, and the exit code is 0 unless nothing at all could be read on a first run. Every point
carries the URL it came from. Usage: python scripts/gentera/fetch-regulators.py [--months 6]
"""
import argparse, io, json, os, re, sys, time, unicodedata
from datetime import date, datetime, timezone
from urllib.parse import urljoin, quote
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'tools', 'gentera', 'raw', 'regulators.json')
UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)'
CNBV = 'https://portafolioinfo.cnbv.gob.mx/PortafolioInformacion/'
SBS = 'https://www.sbs.gob.pe/app/stats/EstadisticaSistemaFinancieroResultados.asp?c=%s%s'
SBS_TABLES = {'B-2201': 'balance', 'B-2334': 'loansByType', 'B-2362': 'delinquency', 'B-2369': 'writeoffs'}


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or ''))
    return re.sub(r'\s+', ' ', ''.join(c for c in s if not unicodedata.combining(c)).lower()).strip()


def _contexts():
    """TLS contexts to try in order: the system store, then certifi's bundle (the CNBV portal's chain is not in
    the runner's default store), then — for these public statistical files only — an unverified context,
    logged as such."""
    import ssl
    out = [('system', ssl.create_default_context())]
    try:
        import certifi
        out.append(('certifi', ssl.create_default_context(cafile=certifi.where())))
    except Exception:  # noqa: BLE001
        pass
    unverified = ssl.create_default_context(); unverified.check_hostname = False; unverified.verify_mode = ssl.CERT_NONE
    out.append(('unverified', unverified))
    return out


CTX = _contexts()


def get(url, tries=2, log=None):
    last = None
    for name, ctx in CTX:
        for i in range(tries):
            try:
                with urlopen(Request(url, headers={'User-Agent': UA, 'Accept': '*/*'}), timeout=180, context=ctx) as r:
                    data = r.read()
                if name == 'unverified' and log is not None:
                    log.append('TLS verification fell back to unverified for %s (public statistics download)' % url.split('?')[0])
                return data
            except Exception as e:  # noqa: BLE001
                last = e
                if 'CERTIFICATE_VERIFY_FAILED' in str(e):
                    break  # try the next context
                time.sleep(3 * (i + 1))
    raise last


def load():
    if os.path.exists(OUT):
        return json.load(open(OUT, encoding='utf-8'))
    return {'cnbv': {'name': 'Banco Compartamos — CNBV Boletín Estadístico Banca Múltiple', 'unit': 'MXN millions; IMOR %', 'series': []},
            'sbs': {'name': 'Compartamos Banco Perú — SBS estadísticas mensuales', 'unit': 'PEN millions; ratios %', 'series': []}, 'log': []}


def months_back(n):
    d = date.today().replace(day=1)
    out = []
    for _ in range(n):
        d = (d.replace(day=1) - __import__('datetime').timedelta(days=1)).replace(day=1)
        out.append(d)
    return out


# ------------------------------------------------------------------ CNBV
CNBV_WANT = {  # sheet-title fragment -> series key
    'cartera de credito total': 'loans', 'cartera total': 'loans',
    'imor': 'imor', 'indice de morosidad': 'imor',
    'captacion tradicional': 'deposits', 'captacion total': 'deposits',
    'resultado neto': 'netIncomeYtd',
}


def cnbv_month(ym, data, log):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    rec = {'month': ym, 'source': None}
    for ws in wb.worksheets:
        title = ' '.join(norm(c.value) for row in ws.iter_rows(min_row=1, max_row=6) for c in row if c.value)
        key = next((v for k, v in CNBV_WANT.items() if k in title), None)
        if not key or key in rec:
            continue
        for row in ws.iter_rows(values_only=True):
            if not row or not any(isinstance(c, str) and 'compartamos' in norm(c) for c in row):
                continue
            vals = [c for c in row if isinstance(c, (int, float))]
            if vals:
                rec[key] = round(float(vals[-1]), 2)  # the last numeric cell is the most recent month's column
                break
    if len(rec) <= 2:
        log.append('CNBV %s: no Compartamos rows recognised' % ym); return None
    return rec


def fetch_cnbv(reg, months, log):
    have = {s['month'] for s in reg['cnbv']['series']}
    for d in months:
        ym = d.strftime('%Y%m')
        if ym in have:
            continue
        name = ('BE_BM_%s.xlsx' if d < date(2024, 11, 1) else 'BE BM %s.xlsx') % ym
        url = CNBV + quote(name)
        try:
            data = get(url, log=log)
        except Exception as e:  # noqa: BLE001
            log.append('CNBV %s: %s' % (ym, e)); continue
        try:
            rec = cnbv_month(ym, data, log)
        except Exception as e:  # noqa: BLE001
            log.append('CNBV %s: parse error %s' % (ym, e)); continue
        if rec:
            rec['source'] = url; reg['cnbv']['series'].append(rec); print('CNBV %s: %s' % (ym, rec))
    reg['cnbv']['series'].sort(key=lambda s: s['month'])


# ------------------------------------------------------------------ SBS
def sbs_links(html):
    """xls links on an SBS results page with their month label ('Diciembre 2025' -> '202512')."""
    M = {'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8, 'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12}
    out = []
    for m in re.finditer(r'<a\b[^>]*href="([^"]+\.xlsx?)"[^>]*>(.*?)</a>', html, re.I | re.S):
        href, text = m.group(1), norm(re.sub(r'<[^>]+>', ' ', m.group(2)))
        mm = re.search(r'(%s)\s+(?:de\s+)?(20\d\d)' % '|'.join(M), text) or re.search(r'(%s)\s*(20\d\d)' % '|'.join(M), norm(href))
        if mm:
            out.append(('%s%02d' % (mm.group(2), M[mm.group(1)]), urljoin('https://www.sbs.gob.pe/', href)))
    return out


def sbs_sheet_values(data):
    """Compartamos column of an SBS table: {row label: value}. Handles .xls (xlrd) and .xlsx (openpyxl)."""
    rows = []
    if data[:4] == b'PK\x03\x04':
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        for ws in wb.worksheets:
            rows.extend(list(r) for r in ws.iter_rows(values_only=True))
    else:
        import xlrd
        wb = xlrd.open_workbook(file_contents=data)
        for sh in wb.sheets():
            rows.extend(sh.row_values(i) for i in range(sh.nrows))
    col = None
    for r in rows:
        for j, c in enumerate(r):
            if isinstance(c, str) and 'compartamos' in norm(c):
                col = j; break
        if col is not None: break
    if col is None:
        return {}
    out = {}
    for r in rows:
        if len(r) > col and isinstance(r[col], (int, float)) and r and isinstance(r[0], str) and r[0].strip():
            out[norm(r[0])] = r[col]
    return out


SBS_PICK = {'balance': {'loans': ('creditos', 'colocaciones'), 'deposits': ('depositos', 'obligaciones con el publico'), 'netIncome': ('utilidad neta', 'resultado neto'), 'equity': ('patrimonio',)},
            'delinquency': {'morosidad': ('morosidad', 'cartera atrasada')}, 'writeoffs': {'writeoffs': ('castig',)}, 'loansByType': {'loansRefinanced': ('refinanciad',), 'loansOverdue': ('atrasad', 'vencid')}}


def fetch_sbs(reg, months, log):
    have = {s['month'] for s in reg['sbs']['series']}
    want = {d.strftime('%Y%m') for d in months} - have
    if not want:
        return
    debug_dir = os.path.join(os.path.dirname(OUT), 'debug')
    for table, kind in SBS_TABLES.items():
        for p in ('', '&p=2'):  # Banca Múltiple, then Empresas Financieras (pre-2025 Compartamos Financiera)
            try:
                html = get(SBS % (table, p), log=log).decode('latin-1', 'replace')
            except Exception as e:  # noqa: BLE001
                log.append('SBS %s%s: %s' % (table, p, e)); continue
            links = sbs_links(html)
            if not links:
                # keep the page so the link pattern can be adjusted from the repository without re-fetching
                os.makedirs(debug_dir, exist_ok=True)
                with open(os.path.join(debug_dir, 'sbs_%s%s.html' % (table, p.replace('&', '_'))), 'w', encoding='utf-8') as f:
                    f.write(html[:300000])
                log.append('SBS %s%s: no monthly xls links recognised (page saved under raw/debug)' % (table, p))
            for ym, url in links:
                if ym not in want:
                    continue
                try:
                    vals = sbs_sheet_values(get(url))
                except Exception as e:  # noqa: BLE001
                    log.append('SBS %s %s: %s' % (table, ym, e)); continue
                if not vals:
                    continue
                rec = next((s for s in reg['sbs']['series'] if s['month'] == ym), None)
                if not rec:
                    rec = {'month': ym, 'sources': {}}; reg['sbs']['series'].append(rec)
                for key, frags in SBS_PICK[kind].items():
                    v = next((vals[k] for k in vals if any(f in k for f in frags)), None)
                    if v is not None:
                        rec[key] = round(float(v) / 1000, 2) if kind != 'delinquency' else round(float(v), 2)
                rec['sources'][kind] = url
                print('SBS %s %s: %s' % (table, ym, {k: v for k, v in rec.items() if k not in ('sources',)}))
    reg['sbs']['series'].sort(key=lambda s: s['month'])


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--months', type=int, default=6); a = ap.parse_args()
    reg = load(); log = []
    months = months_back(a.months)
    fetch_cnbv(reg, months, log)
    fetch_sbs(reg, months, log)
    reg['log'] = log[-50:]; reg['updatedAt'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(reg, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for l in log: print('WARN ' + l)
    print('fetch-regulators: CNBV %d months, SBS %d months, %d warnings' % (len(reg['cnbv']['series']), len(reg['sbs']['series']), len(log)))
    if not reg['cnbv']['series'] and not reg['sbs']['series']:
        sys.exit(1)
