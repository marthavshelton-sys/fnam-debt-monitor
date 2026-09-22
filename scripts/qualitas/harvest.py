#!/usr/bin/env python3
"""Harvest Quálitas Controladora's public filings into tools/qualitas/raw/.

Sources (all public, no credentials):
  * https://qinversionistas.qualitas.com.mx/ES/reportes-trimestrales/<year>  quarterly results reports (PDF)
    and the "Datos Financieros Históricos" workbook (xlsx) linked on the same page
  * https://qinversionistas.qualitas.com.mx/ES/reportes-sific/<year>         SIFIC filings: the CNSF-format
    balance sheet, income statement and cash-flow statement filed with the BMV/CNBV (PDF)

Every PDF is converted to text once (pypdf) and stored as tools/qualitas/raw/text/<kind>/<id>.txt with
"=== PAGE n ===" markers; PDFs themselves are cached in tools/qualitas/raw/pdf/ (git-ignored).
tools/qualitas/raw/manifest.json records url, sha256, size and page count of everything harvested; a
file already in the manifest is skipped unless --full is passed. build_data.py parses the text files.

Usage:  python scripts/qualitas/harvest.py [--full] [--years 2023 2024 ...]
"""
import argparse, hashlib, io, json, os, re, sys, time, unicodedata
from datetime import datetime, timezone
from urllib.parse import urljoin, quote
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, 'tools', 'qualitas', 'raw')
PDF_DIR = os.path.join(RAW, 'pdf')
TXT_DIR = os.path.join(RAW, 'text')
MANIFEST = os.path.join(RAW, 'manifest.json')
BASE = 'https://qinversionistas.qualitas.com.mx'
UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)'


def get(url, binary=False, tries=3):
    last = None
    for i in range(tries):
        try:
            req = Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urlopen(req, timeout=90) as r:
                data = r.read()
            return data if binary else data.decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise last


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding='utf-8') as f:
            return json.load(f)
    return {'items': {}, 'updatedAt': None}


def save_manifest(m):
    m['updatedAt'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    os.makedirs(RAW, exist_ok=True)
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1, sort_keys=True)


def pdf_to_text(pdf_bytes):
    from pypdf import PdfReader
    r = PdfReader(io.BytesIO(pdf_bytes))
    parts = []
    for i, pg in enumerate(r.pages):
        t = pg.extract_text() or ''
        parts.append('=== PAGE %d ===\n%s' % (i + 1, t))
    return '\n'.join(parts), len(r.pages)


def norm(s):
    s = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()


QID = re.compile(r'([1-4])\s*t\s*(\d{2})(?!\d)')  # norm() lower-cases, so match a lower-case t
MONTH_Q = {'marzo': 1, 'junio': 2, 'septiembre': 3, 'diciembre': 4, 'march': 1, 'june': 2, 'september': 3, 'december': 4}


def quarter_id(name, year=None):
    """'Q - Reporte Trimestral 2T26 VFF2.pdf' -> '2026Q2'; 'reporte QC1T24.pdf' -> '2024Q1';
    'reporte_4T_SIFIC.pdf' with year=2022 -> '2022Q4'."""
    n = norm(name).replace('_', ' ')
    m = QID.search(n)
    if m:
        return '20%s' % m.group(2) + 'Q' + m.group(1)
    m2 = re.search(r'([1-4])\s*t\s*(20\d\d)', n)
    if m2:
        return '%sQ%s' % (m2.group(2), m2.group(1))
    if year:
        m3 = re.search(r'(?<![a-z0-9])([1-4])\s*t(?![a-z0-9])', n)
        if m3:
            return '%sQ%s' % (year, m3.group(1))
    return None


def quarter_from_text(text, year=None):
    """Fallback for files with opaque names: read the balance-sheet date ('al 30 de junio de 2020',
    'as of March 31, 2021') from the first pages."""
    t = norm(text[:20000])
    m = re.search(r'al\s+3[01]\s+de\s+(marzo|junio|septiembre|diciembre)\s+de\s+(20\d\d)', t)
    if m:
        return '%sQ%d' % (m.group(2), MONTH_Q[m.group(1)])
    m = re.search(r'(march|june|september|december)\s+3[01],?\s+(20\d\d)', t)
    if m:
        return '%sQ%d' % (m.group(2), MONTH_Q[m.group(1)])
    m = QID.search(t)
    if m and (not year or m.group(2) == str(year)[2:]):
        return '20%s' % m.group(2) + 'Q' + m.group(1)
    return None


def links(html, pattern):
    out = []
    for m in re.finditer(r'href="([^"]+)"', html):
        h = m.group(1)
        if re.search(pattern, h, re.I):
            out.append(h if h.startswith('http') else urljoin(BASE, h))
    seen, uniq = set(), []
    for h in out:
        if h not in seen:
            seen.add(h); uniq.append(h)
    return uniq


def classify_report(url):
    name = norm(os.path.basename(url))
    if 'webcast' in name or 'script' in name or 'transcript' in name or 'presentaci' in name:
        return None
    if 'reporte' in name or 'informe' in name:
        return 'report'
    return None


def harvest(years, full):
    man = load_manifest()
    items = man['items']
    os.makedirs(PDF_DIR, exist_ok=True)
    for kind in ('reports', 'sific'):
        os.makedirs(os.path.join(TXT_DIR, kind), exist_ok=True)
    new = 0
    for y in years:
        pages = [('reports', '%s/ES/reportes-trimestrales/%s' % (BASE, y)), ('sific', '%s/ES/reportes-sific/%s' % (BASE, y))]
        for kind, page in pages:
            try:
                html = get(page)
            except Exception as e:  # noqa: BLE001
                print('WARN cannot load %s: %s' % (page, e)); continue
            cands = links(html, r'\.pdf$')
            if kind == 'reports':
                cands = [u for u in cands if classify_report(u) == 'report']
                # the historical workbook (only one, linked on every year page)
                for x in links(html, r'DatosFinancierosHistoricos[^"]*\.xlsx$'):
                    key = 'xlsx:historicos'
                    if key in items and not full:
                        continue
                    try:
                        data = get(x.replace(' ', '%20'), binary=True)
                    except Exception as e:  # noqa: BLE001
                        print('WARN xlsx %s: %s' % (x, e)); continue
                    with open(os.path.join(RAW, 'DatosFinancierosHistoricos.xlsx'), 'wb') as f:
                        f.write(data)
                    items[key] = {'url': x, 'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data), 'kind': 'xlsx', 'fetchedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
                    new += 1
                    print('xlsx: %s (%d bytes)' % (os.path.basename(x), len(data)))
            known_urls = {v.get('url') for v in items.values()}
            for u in cands:
                if 'aviso-de-privacidad' in norm(u):
                    continue
                qid = quarter_id(os.path.basename(u), y)
                if not qid and u in known_urls and not full:
                    continue
                if qid:
                    key = '%s:%s' % (kind, qid)
                    if key in items and not full:
                        continue
                try:
                    data = get(u.replace(' ', '%20'), binary=True)
                except Exception as e:  # noqa: BLE001
                    print('WARN %s: %s' % (u, e)); continue
                if not data.startswith(b'%PDF'):
                    print('WARN not a PDF: %s' % u); continue
                text, pages = pdf_to_text(data)
                if not qid:
                    qid = quarter_from_text(text, y)
                    if not qid:
                        print('skip (no quarter id): %s' % u); continue
                    key = '%s:%s' % (kind, qid)
                    if key in items and not full:
                        print('skip (already have %s from a named file): %s' % (key, u)); continue
                pdf_path = os.path.join(PDF_DIR, '%s_%s.pdf' % (kind, qid))
                with open(pdf_path, 'wb') as f:
                    f.write(data)
                txt_path = os.path.join(TXT_DIR, kind, '%s.txt' % qid)
                with open(txt_path, 'w', encoding='utf-8') as f:
                    f.write('SOURCE: %s\nFETCHED: %s\n' % (u, datetime.now(timezone.utc).isoformat(timespec='seconds')) + text)
                items[key] = {'url': u, 'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data), 'pages': pages,
                              'chars': len(text), 'kind': kind, 'quarter': qid, 'text': os.path.relpath(txt_path, ROOT).replace('\\', '/'),
                              'fetchedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
                new += 1
                print('%s %s: %d pages, %d chars%s' % (kind, qid, pages, len(text), '' if len(text) > 1000 else '  (image-only PDF, no text)'))
                time.sleep(0.5)
    save_manifest(man)
    print('harvest: %d new files; manifest has %d items' % (new, len(items)))


def import_local(pairs):
    """Offline bootstrap: register already-downloaded PDFs. pairs = [(kind, qid, path, url), ...]"""
    man = load_manifest(); items = man['items']
    os.makedirs(PDF_DIR, exist_ok=True)
    for kind, qid, path, url in pairs:
        with open(path, 'rb') as f:
            data = f.read()
        text, pages = pdf_to_text(data)
        os.makedirs(os.path.join(TXT_DIR, kind), exist_ok=True)
        txt_path = os.path.join(TXT_DIR, kind, '%s.txt' % qid)
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write('SOURCE: %s\nFETCHED: %s\n' % (url, datetime.now(timezone.utc).isoformat(timespec='seconds')) + text)
        items['%s:%s' % (kind, qid)] = {'url': url, 'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data), 'pages': pages, 'chars': len(text), 'kind': kind, 'quarter': qid,
                                        'text': os.path.relpath(txt_path, ROOT).replace('\\', '/'), 'fetchedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
        print('imported %s %s (%d pages, %d chars)' % (kind, qid, pages, len(text)))
    save_manifest(man)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--full', action='store_true')
    ap.add_argument('--years', nargs='*', type=int)
    a = ap.parse_args()
    now = datetime.now().year
    years = a.years or list(range(2023, now + 1))
    harvest(years, a.full)
