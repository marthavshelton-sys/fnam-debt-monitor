#!/usr/bin/env python3
"""Harvest Gentera's quarterly press releases into tools/gentera/raw/.

Source (public, no credentials): the IR page
  https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral
which lists, for every quarter since 1Q12, a "Press release" PDF (Spanish) served from the IBM WCM content
store (…/wps/wcm/connect/…/Press+release+2T26.pdf?MOD=AJPERES). The English versions and the presentation
are ignored: the Spanish release is the primary document and the one the parser templates expect.

Every PDF is converted to text once (pypdf, pypdfium2 as fallback) and stored as
tools/gentera/raw/text/releases/<YYYYQn>.txt with "=== PAGE n ===" markers, a SOURCE: line and a FETCHED: line;
PDFs themselves are cached in tools/gentera/raw/pdf/ (git-ignored). tools/gentera/raw/manifest.json records
url, sha256, size and page count of everything harvested; a file already in the manifest is skipped unless
--full is passed. build_data.py parses the text files.

Usage:  python scripts/gentera/harvest.py [--full] [--since 2019] [--only 2026Q2]
"""
import argparse, hashlib, io, json, os, re, sys, time, unicodedata
from datetime import datetime, timezone
from html import unescape
from urllib.parse import urljoin, quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, 'tools', 'gentera', 'raw')
PDF_DIR = os.path.join(RAW, 'pdf')
TXT_DIR = os.path.join(RAW, 'text', 'releases')
MANIFEST = os.path.join(RAW, 'manifest.json')
BASE = 'https://www.gentera.com.mx'
IR_PAGE = BASE + '/gentera/relacion-inversionistas/informacion_trimestral'
UA = 'Mozilla/5.0 (compatible; fnam-debt-monitor/1.0; +https://github.com/marthavshelton-sys/fnam-debt-monitor)'


def get(url, binary=False, tries=3):
    last = None
    for i in range(tries):
        try:
            req = Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urlopen(req, timeout=120) as r:
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
    parts = []
    try:
        from pypdf import PdfReader
        r = PdfReader(io.BytesIO(pdf_bytes))
        for i, pg in enumerate(r.pages):
            parts.append('=== PAGE %d ===\n%s' % (i + 1, pg.extract_text() or ''))
        n = len(r.pages)
    except Exception:  # noqa: BLE001
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(pdf_bytes)
        n = len(doc)
        for i in range(n):
            parts.append('=== PAGE %d ===\n%s' % (i + 1, doc[i].get_textpage().get_text_range()))
    return '\n'.join(parts), n


def norm(s):
    s = unicodedata.normalize('NFKD', unescape(s))
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()


QID = re.compile(r'([1-4])\s*[tq]\s*(\d{2})(?!\d)')


def quarter_id(text):
    """'Press release 2T26' / 'Reporte 4T2025' / '3Q19' -> '2026Q2' etc."""
    n = norm(text).replace('_', ' ').replace('+', ' ')
    m = re.search(r'([1-4])\s*[tq]\s*(20\d\d)', n)
    if m:
        return '%sQ%s' % (m.group(2), m.group(1))
    m = QID.search(n)
    if m:
        return '20%s' % m.group(2) + 'Q' + m.group(1)
    return None


def quarter_from_text(text):
    t = norm(text[:20000])
    m = re.search(r'al\s+3[01]\s+de\s+(marzo|junio|septiembre|diciembre)\s+de\s+(20\d\d)', t)
    if m:
        return '%sQ%d' % (m.group(2), {'marzo': 1, 'junio': 2, 'septiembre': 3, 'diciembre': 4}[m.group(1)])
    m = re.search(r'(primer|segundo|tercer|cuarto)\s+trimestre\s+(?:de\s+)?(20\d\d)', t)
    if m:
        return '%sQ%d' % (m.group(2), {'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4}[m.group(1)])
    return None


def encode_url(u):
    """WCM URLs carry spaces/plus signs; keep the query (?MOD=AJPERES) intact."""
    p = urlsplit(u)
    return urlunsplit((p.scheme, p.netloc, quote(p.path, safe='/%+'), p.query, ''))


PRESS_ANCHOR = ('press release', 'press-release', 'comunicado', 'reporte trimestral', 'informe trimestral', 'resultados')
NOT_PRESS = ('presentaci', 'ingl', 'english', 'audit', 'anual', 'annual', 'transcri', 'webcast')


def anchor_ok(text):
    """True when the anchor text names the quarterly press release (never a presentation, transcript or the
    English version). The href is deliberately not consulted: a file called ..._compressed.pdf contains
    'press' and was harvested as the 4Q25 release in the first run."""
    tn = norm(text)
    return any(w in tn for w in PRESS_ANCHOR) and not any(w in tn for w in NOT_PRESS)


def release_links(html):
    """PDF anchors (WCM or plain) with their quarter id and anchor text; press-release anchors first so they take
    precedence over other documents of the same quarter. Returns [(qid, url, anchor_text)]."""
    out, seen = [], set()
    for m in re.finditer(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.I | re.S):
        href, text = m.group(1), re.sub(r'<[^>]+>', ' ', m.group(2))
        h = norm(href)
        if not ('.pdf' in h or 'wcm/connect' in h):
            continue
        if not anchor_ok(text):
            continue
        url = unescape(href if href.startswith('http') else urljoin(BASE, href))
        if 'wcm/connect' in url and 'MOD=AJPERES' not in url:
            url += ('&' if '?' in url else '?') + 'MOD=AJPERES'
        qid = quarter_id(text) or quarter_id(href)
        key = (qid, url)
        if key in seen:
            continue
        seen.add(key)
        out.append((qid, url, text.strip()))
    return out


def harvest(full, since, only):
    man = load_manifest()
    items = man['items']
    os.makedirs(PDF_DIR, exist_ok=True); os.makedirs(TXT_DIR, exist_ok=True)
    html = get(IR_PAGE)
    links = release_links(html)
    print('IR page: %d press-release links found' % len(links))
    if not links:
        print('WARN no press-release links recognised on the IR page; the page layout may have changed (see release_links)')
    new = 0
    for qid, url, text in links:
        if qid and int(qid[:4]) < since:
            continue
        if only and qid != only:
            continue
        key = 'release:%s' % qid if qid else 'release:' + hashlib.sha1(url.encode()).hexdigest()[:10]
        if key in items and not full and items[key].get('url') == url:
            continue
        if key in items and not full and items[key].get('url') != url:
            stored = items[key].get('anchor')
            if stored is None and items[key].get('text') and os.path.exists(os.path.join(ROOT, items[key]['text'])):
                with open(os.path.join(ROOT, items[key]['text']), encoding='utf-8') as f:
                    m = re.search(r'^ANCHOR: (.*)$', f.read(2000), re.M)
                stored = m.group(1) if m else 'press release'
            if anchor_ok(stored or 'press release'):
                continue  # a different document for a quarter we already hold as a press release
            print('%s: replacing "%s" with the press release' % (qid, stored))
        try:
            data = get(encode_url(url), binary=True)
        except Exception as e:  # noqa: BLE001
            print('WARN %s: %s' % (url, e)); continue
        if not data.startswith(b'%PDF'):
            print('WARN not a PDF: %s' % url); continue
        txt, pages = pdf_to_text(data)
        if not qid:
            qid = quarter_from_text(txt)
            if not qid:
                print('skip (no quarter id): %s' % url); continue
            key = 'release:%s' % qid
            if key in items and not full:
                continue
        with open(os.path.join(PDF_DIR, '%s.pdf' % qid), 'wb') as f:
            f.write(data)
        txt_path = os.path.join(TXT_DIR, '%s.txt' % qid)
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write('SOURCE: %s\nFETCHED: %s\nANCHOR: %s\n' % (url, datetime.now(timezone.utc).isoformat(timespec='seconds'), text) + txt)
        items[key] = {'url': url, 'anchor': text.strip(), 'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data), 'pages': pages, 'chars': len(txt), 'kind': 'release', 'quarter': qid,
                      'text': os.path.relpath(txt_path, ROOT).replace('\\', '/'), 'fetchedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
        new += 1
        print('%s: %d pages, %d chars%s' % (qid, pages, len(txt), '' if len(txt) > 1000 else '  (image-only PDF, no text)'))
        time.sleep(0.5)
    save_manifest(man)
    print('harvest: %d new files; manifest has %d items' % (new, len(items)))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--full', action='store_true', help='re-download every release')
    ap.add_argument('--since', type=int, default=2012, help='first fiscal year to harvest')
    ap.add_argument('--only', help='a single quarter id, e.g. 2026Q3')
    a = ap.parse_args()
    harvest(a.full, a.since, a.only)
