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
# Boletín Estadístico Banca Múltiple: one sheet per indicator, one row per bank, and for every indicator a
# triplet of columns [same month a year earlier, previous month, current month]. Sheet name -> (key, triplet
# index): the triplet index counts triplets from the first numeric cell of the bank's row.
CNBV_SHEETS = {
    'CCT': [('loans', 0), ('imor', 1), ('coverage', 2)],          # Cartera de crédito total: saldo, IMOR, cobertura
    'CCCMicro': [('loansMicro', 0), ('imorMicro', 1)],            # microcrédito
    'CaptRec': [('captacion', 0)],                                # captación total (depósitos + préstamos + títulos)
    'Pm2': [('totalAssets', 0)],                                  # principales rubros: activo total (value, share pairs)
    'Indicadores': [('roa', 0), ('roe', 1)],                      # indicadores financieros: ROA, ROE
}


def _triplets(row):
    """Numeric cells of a bank's row grouped in threes (year-ago, previous month, current month); 'n.c.' -> None.
    The Pm2 sheet interleaves value/share pairs, handled by the caller."""
    vals = []
    for c in row[2:]:
        if isinstance(c, (int, float)):
            vals.append(float(c))
        elif isinstance(c, str) and c.strip().lower() in ('n.c.', 'n.a.', 'n.d.', 'n.a', 'n.c'):
            vals.append(None)
        elif isinstance(c, str) and re.match(r'^-?\d+(\.\d+)?$', c.strip()):
            vals.append(float(c))
    return [vals[i:i + 3] for i in range(0, len(vals) - 2, 3)]


def cnbv_month(ym, data, log, dump_path=None):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    rec = {'month': ym, 'source': None}
    dump = {'sheets': []}
    names = {ws.title.strip(): ws for ws in wb.worksheets}
    for sheet, keys in CNBV_SHEETS.items():
        ws = names.get(sheet)
        if ws is None:
            log.append('CNBV %s: sheet %s missing' % (ym, sheet)); continue
        hit = None
        for row in ws.iter_rows(values_only=True):
            if row and any(isinstance(c, str) and norm(c).strip() == 'compartamos' for c in row):
                hit = list(row); break
        dump['sheets'].append({'name': sheet, 'compartamos_row': [str(c)[:40] if c is not None else None for c in hit[:16]] if hit else None})
        if not hit:
            log.append('CNBV %s: Compartamos row missing in %s' % (ym, sheet)); continue
        if sheet == 'Pm2':
            nums = [float(c) for c in hit[2:] if isinstance(c, (int, float))]
            vals = nums[0::2][:3]  # value, share, value, share, value, share
            if len(vals) == 3: rec['totalAssets'] = round(vals[2], 2)
            continue
        trips = _triplets(hit)
        for key, idx in keys:
            if idx < len(trips) and trips[idx][2] is not None:
                rec[key] = round(trips[idx][2], 2)
    if dump_path:
        with open(dump_path, 'w', encoding='utf-8') as f:
            json.dump(dump, f, ensure_ascii=False, indent=1)
    if len(rec) <= 2:
        log.append('CNBV %s: no Compartamos rows recognised' % ym); return None
    return rec


def plausible_cnbv(rec):
    ok = True
    if rec.get('loans') is not None: ok &= 10000 <= rec['loans'] <= 300000
    if rec.get('imor') is not None: ok &= 0.5 <= rec['imor'] <= 30
    if rec.get('captacion') is not None: ok &= 1000 <= rec['captacion'] <= 300000
    if rec.get('coverage') is not None: ok &= 50 <= rec['coverage'] <= 2000
    return ok


def fetch_cnbv(reg, months, log):
    have = {s['month'] for s in reg['cnbv']['series']}
    debug_dir = os.path.join(os.path.dirname(OUT), 'debug')
    dumped = False
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
            dump_path = None
            if not dumped:
                os.makedirs(debug_dir, exist_ok=True); dump_path = os.path.join(debug_dir, 'cnbv_%s.json' % ym); dumped = True
            rec = cnbv_month(ym, data, log, dump_path)
        except Exception as e:  # noqa: BLE001
            log.append('CNBV %s: parse error %s' % (ym, e)); continue
        if rec and plausible_cnbv(rec):
            rec['source'] = url; reg['cnbv']['series'].append(rec); print('CNBV %s: %s' % (ym, rec))
        elif rec:
            log.append('CNBV %s: implausible values %s dropped (check raw/debug/cnbv_*.json and CNBV_WANT)' % (ym, {k: v for k, v in rec.items() if k not in ('month', 'source')}))
    reg['cnbv']['series'] = [s for s in reg['cnbv']['series'] if plausible_cnbv(s)]
    reg['cnbv']['series'].sort(key=lambda s: s['month'])


# ------------------------------------------------------------------ SBS
SBS_MONTHS = {'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8, 'setiembre': 9, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12}


def sbs_links(html):
    """Monthly xls links on an SBS results page. The anchor text is only the month name; year and month sit in
    the path: https://intranet2.sbs.gob.pe/estadistica/financiera/2026/Julio/B-2201-jl2026.XLS -> ('202607', url)."""
    out = []
    for m in re.finditer(r'<a\b[^>]*href="([^"]+\.xlsx?)"', html, re.I):
        href = m.group(1)
        mm = re.search(r'/(20\d\d)/(%s)/' % '|'.join(SBS_MONTHS), norm(href))
        if mm:
            out.append(('%s%02d' % (mm.group(1), SBS_MONTHS[mm.group(2)]), urljoin('https://www.sbs.gob.pe/', href)))
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


# Row labels in the SBS sheets (thousands of soles; ratios in %). 'sum' adds several rows, 'first' takes the first
# row whose label starts with one of the alternatives.
SBS_PICK = {'balance': {'loans': ('sum', ['vigentes', 'refinanciados y reestructurados', 'atrasados']), 'loansNet': ('first', ['creditos netos de provisiones']),
                        'netIncome': ('first', ['utilidad neta', 'resultado neto', 'utilidad (perdida) neta']), 'equity': ('first', ['patrimonio'])},
            'delinquency': {'morosidad': ('first', ['total creditos directos'])}, 'writeoffs': {'writeoffs': ('first', ['castig'])}, 'loansByType': {'loansOverdue': ('first', ['atrasad'])}}


def plausible_sbs(rec):
    return rec.get('loans') is None or 500 <= rec['loans'] <= 50000  # Compartamos Banco Perú: a few thousand million soles


def fetch_sbs(reg, months, log):
    """Compartamos Banco appears in the Banca Múltiple tables from January 2025 (before that it was Compartamos
    Financiera under Empresas Financieras, whose table codes differ and are not fetched yet)."""
    have = {s['month'] for s in reg['sbs']['series']}
    want = {d.strftime('%Y%m') for d in months if d >= date(2025, 1, 1)} - have
    if not want:
        return
    debug_dir = os.path.join(os.path.dirname(OUT), 'debug')
    for table, kind in SBS_TABLES.items():
        dumped = False
        try:
            html = get(SBS % (table, ''), log=log).decode('latin-1', 'replace')
        except Exception as e:  # noqa: BLE001
            log.append('SBS %s: %s' % (table, e)); continue
        links = sbs_links(html)
        if not links:
            log.append('SBS %s: no monthly xls links recognised' % table); continue
        for ym, url in links:
            if ym not in want:
                continue
            try:
                data = get(url, log=log)
                vals = sbs_sheet_values(data)
            except Exception as e:  # noqa: BLE001
                log.append('SBS %s %s: %s' % (table, ym, e)); continue
            if not dumped:
                dumped = True
                os.makedirs(debug_dir, exist_ok=True)
                with open(os.path.join(debug_dir, 'sbs_%s.json' % table), 'w', encoding='utf-8') as f:
                    json.dump({'url': url, 'month': ym, 'rows': dict(list(vals.items())[:120])}, f, ensure_ascii=False, indent=1)
            if not vals:
                log.append('SBS %s %s: Compartamos column not found' % (table, ym)); continue
            rec = next((s for s in reg['sbs']['series'] if s['month'] == ym), None)
            if not rec:
                rec = {'month': ym, 'sources': {}}; reg['sbs']['series'].append(rec)
            for key, (mode, labels) in SBS_PICK[kind].items():
                if mode == 'sum':
                    parts = [next((vals[k] for k in vals if k.startswith(l)), None) for l in labels]
                    v = sum(parts) if all(x is not None for x in parts) else None
                else:
                    v = next((vals[k] for l in labels for k in vals if k.startswith(l)), None)
                if v is not None:
                    rec[key] = round(float(v) / 1000, 2) if kind != 'delinquency' else round(float(v), 2)
            rec['sources'][kind] = url
            print('SBS %s %s: %s' % (table, ym, {k: v for k, v in rec.items() if k not in ('sources',)}))
    bad = [s['month'] for s in reg['sbs']['series'] if not plausible_sbs(s)]
    if bad:
        log.append('SBS: implausible values for %s dropped (check raw/debug/sbs_*.json and SBS_PICK)' % bad)
        reg['sbs']['series'] = [s for s in reg['sbs']['series'] if plausible_sbs(s)]
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
