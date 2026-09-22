#!/usr/bin/env python3
"""Convert hand-supplied Gentera earnings-call transcripts and quarterly presentations into text for the model.

Drop the files (PDF, DOCX, PPTX or TXT) into tools/gentera/raw/transcripts/ and run this script. Each file is
converted once to tools/gentera/raw/text/transcripts/<YYYYQn>-<kind>-<original name>.txt (page or slide markers,
SOURCE line) and listed in tools/gentera/raw/transcripts/manifest.json. The quarter is read from the file name
("2T26", "2Q26", "4T25", "Q2 2026") or, failing that, from the first pages of the text; the kind is
"transcript" when the text looks like a call (speaker labels, "operator", "question-and-answer") and
"presentation" otherwise. The reviewing routine (tools/gentera/README.md) reads these texts to write the
Comments column quotes (`call` field of comments.js) and to check guidance; nothing here touches the page.

Usage: python scripts/gentera/ingest-transcripts.py [--full]
"""
import argparse, hashlib, io, json, os, re, sys, unicodedata, zipfile
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IN_DIR = os.path.join(ROOT, 'tools', 'gentera', 'raw', 'transcripts')
OUT_DIR = os.path.join(ROOT, 'tools', 'gentera', 'raw', 'text', 'transcripts')
MANIFEST = os.path.join(IN_DIR, 'manifest.json')


def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()


def pdf_text(data):
    from pypdf import PdfReader
    r = PdfReader(io.BytesIO(data))
    return '\n'.join('=== PAGE %d ===\n%s' % (i + 1, pg.extract_text() or '') for i, pg in enumerate(r.pages))


def xml_text(xml):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', xml)).strip()


def docx_text(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        xml = z.read('word/document.xml').decode('utf-8', 'replace')
    paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)
    return '\n'.join(xml_text(p) for p in paras if xml_text(p))


def pptx_text(data):
    out = []
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        slides = sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)), key=lambda n: int(re.search(r'(\d+)', n).group(1)))
        for i, n in enumerate(slides):
            xml = z.read(n).decode('utf-8', 'replace')
            texts = [xml_text(t) for t in re.findall(r'<a:t>(.*?)</a:t>', xml, re.S)]
            out.append('=== SLIDE %d ===\n%s' % (i + 1, '\n'.join(t for t in texts if t)))
    return '\n'.join(out)


def to_text(name, data):
    ext = name.lower().rsplit('.', 1)[-1]
    if ext == 'pdf': return pdf_text(data)
    if ext == 'docx': return docx_text(data)
    if ext == 'pptx': return pptx_text(data)
    return data.decode('utf-8', 'replace')


def quarter_of(name, text):
    n = norm(name).replace('_', ' ')
    m = re.search(r'([1-4])\s*[tq]\s*(20\d\d|\d\d)(?!\d)', n) or re.search(r'[tq]([1-4])\s*(20\d\d|\d\d)(?!\d)', n)
    if m:
        y = m.group(2); return '%sQ%s' % ('20' + y if len(y) == 2 else y, m.group(1))
    t = norm(text[:6000])
    m = re.search(r'(primer|segundo|tercer|cuarto|first|second|third|fourth)\s+(trimestre|quarter)\s+(?:de\s+|of\s+)?(20\d\d)', t)
    if m:
        q = {'primer': 1, 'first': 1, 'segundo': 2, 'second': 2, 'tercer': 3, 'third': 3, 'cuarto': 4, 'fourth': 4}[m.group(1)]
        return '%sQ%d' % (m.group(3), q)
    m = re.search(r'([1-4])[tq](\d\d)\b', t)
    return '20%sQ%s' % (m.group(2), m.group(1)) if m else None


def kind_of(name, text):
    n, t = norm(name), norm(text[:20000])
    if 'transcri' in n or 'call' in n or 'conferencia' in n: return 'transcript'
    if 'presenta' in n or 'slides' in n or n.endswith('.pptx'): return 'presentation'
    return 'transcript' if len(re.findall(r'\b(operator|operadora?|question-and-answer|preguntas y respuestas|analyst|analista)\b', t)) >= 3 else 'presentation'


def main(full):
    os.makedirs(IN_DIR, exist_ok=True); os.makedirs(OUT_DIR, exist_ok=True)
    man = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {'items': {}}
    files = [f for f in sorted(os.listdir(IN_DIR)) if f.lower().rsplit('.', 1)[-1] in ('pdf', 'docx', 'pptx', 'txt')]
    if not files:
        print('ingest-transcripts: no files in %s' % os.path.relpath(IN_DIR, ROOT)); return
    new = 0
    for f in files:
        data = open(os.path.join(IN_DIR, f), 'rb').read()
        sha = hashlib.sha256(data).hexdigest()
        if not full and man['items'].get(f, {}).get('sha256') == sha:
            continue
        try:
            text = to_text(f, data)
        except Exception as e:  # noqa: BLE001
            print('WARN %s: %s' % (f, e)); continue
        qid, kind = quarter_of(f, text), kind_of(f, text)
        base = re.sub(r'[^A-Za-z0-9._-]+', '_', f.rsplit('.', 1)[0])[:60]
        out = os.path.join(OUT_DIR, '%s-%s-%s.txt' % (qid or 'unknown', kind, base))
        with open(out, 'w', encoding='utf-8') as fh:
            fh.write('SOURCE: hand-supplied file %s\nCONVERTED: %s\nQUARTER: %s\nKIND: %s\n%s' % (f, datetime.now(timezone.utc).isoformat(timespec='seconds'), qid, kind, text))
        man['items'][f] = {'sha256': sha, 'quarter': qid, 'kind': kind, 'text': os.path.relpath(out, ROOT).replace('\\', '/'), 'chars': len(text), 'convertedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
        new += 1
        print('%s -> %s (%s, %s, %d chars)%s' % (f, os.path.basename(out), qid, kind, len(text), '' if len(text) > 500 else '  WARN: little text (scanned PDF?)'))
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print('ingest-transcripts: %d new, %d in manifest' % (new, len(man['items'])))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--full', action='store_true'); main(ap.parse_args().full)
