#!/usr/bin/env python3
"""Reads INEGI's release calendar ("Calendario de difusión de información estadística y geográfica y de Interés Nacional",
one PDF per year or half-year) into JSON: every product with its publication dates and reference periods.

    python3 inegi_calendar.py <calendar.pdf> <out.json>

Layout of the PDF (checked on the 2026 and first-half-2027 editions): a table without cell borders; a thin horizontal
rule separates products (rules starting at the product column) and programs (rules starting at the left margin); the
program's name sits alone in its band at the left margin; each product's name is in the second column, its "IIN",
"Tipo de cifras" and "Periodicidad" in the next three, then one line per release: "dd/mes" under "Fecha de publicación"
and the period under "Periodo de referencia" ("Septiembre", "Diciembre/2025", "3.er trimestre 2026", "2025"). The
columns are found from the header words on each page, so a shifted layout still reads. A period without a year belongs
to the calendar's year, as the PDF prints it. Exits non-zero when the file is not a calendar or nothing could be read.
"""
import json
import re
import sys
import unicodedata

import pdfplumber

MONTHS = {m: i + 1 for i, m in enumerate(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                                           'septiembre', 'octubre', 'noviembre', 'diciembre'])}
DATE = re.compile(r'^(\d{1,2})/([a-záéíóúñ]+)$', re.I)


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()


def period_of(text, year):
    t = ' '.join(text.split())
    m = re.match(r'^(\d)\.\s*(?:er|o|do|to)\s+trimestre\s+(\d{4})$', t, re.I)
    if m:
        return '%s-Q%s' % (m.group(2), m.group(1))
    m = re.match(r'^([A-Za-zÁÉÍÓÚáéíóúñ]+)(?:/(\d{4}))?$', t)
    if m and fold(m.group(1)) in MONTHS:
        return '%s-%02d' % (m.group(2) or year, MONTHS[fold(m.group(1))])
    m = re.match(r'^(\d{4})$', t)
    if m:
        return m.group(1)
    m = re.match(r'^([A-Za-zÁÉÍÓÚáéíóúñ]+)-([A-Za-zÁÉÍÓÚáéíóúñ]+)/(\d{4})$', t)
    if m and fold(m.group(1)) in MONTHS and fold(m.group(2)) in MONTHS:
        return '%s-%02d..%s-%02d' % (m.group(3), MONTHS[fold(m.group(1))], m.group(3), MONTHS[fold(m.group(2))])
    return None


def main(path, out):
    with pdfplumber.open(path) as pdf:
        first = pdf.pages[0].extract_text() or ''
        if 'Calendario de difusi' not in first:
            sys.exit('not an INEGI release calendar')
        head = ' '.join(first.split('\n')[:3])
        ym = re.search(r'(?:semestre de|INEGI,?)\s+(\d{4})', head) or re.search(r'(20\d{2})', head)
        year = ym.group(1)
        title = ' '.join(first.split('\n')[0:2]).split('(la informaci')[0].strip()
        hour = re.search(r'se difunde a las (\d{1,2}:\d{2})', first)
        products, program, cols = [], None, None
        for pi, page in enumerate(pdf.pages):
            words = page.extract_words()
            fecha = next((w for w in words if w['text'] == 'Fecha' and w['top'] < 130), None)
            periodo = next((w for w in words if w['text'] == 'Periodo' and w['top'] < 130), None)
            if fecha and periodo:
                cols = (fecha['x0'] - 25, periodo['x0'] - 20)
            if not cols:
                continue
            header_bottom = max([w['bottom'] for w in words if w['text'] in ('publicación', 'referencia') and w['top'] < 130] + [0])
            foot = min([w['top'] for w in words if w['text'] in ('Continúa', 'Página') or re.match(r'^\d+ de \d+$', w['text'])] + [page.height - 30])
            rules = sorted(set(round(r['top'], 1) for r in page.rects if r['bottom'] - r['top'] < 2.5 and r['x1'] > page.width * 0.85))
            bounds = [header_bottom + 1] + [r for r in rules if r > header_bottom + 1] + [foot - 1]
            for a, b in zip(bounds, bounds[1:]):
                band = [w for w in words if a <= w['top'] < b]
                if not band:
                    continue
                band.sort(key=lambda w: (round(w['top']), w['x0']))
                if any(w['x0'] < 95 for w in band) and not any(DATE.match(w['text']) for w in band):
                    program = ' '.join(w['text'] for w in band)
                    continue
                name = ' '.join(w['text'] for w in band if 95 <= w['x0'] < 425)
                meta = [w['text'] for w in band if 425 <= w['x0'] < cols[0]]
                dates = [w for w in band if cols[0] <= w['x0'] < cols[1] and DATE.match(w['text'])]
                rest = [w for w in band if w['x0'] >= cols[0] and not DATE.match(w['text'])]
                rel = []
                for d in sorted(dates, key=lambda w: w['top']):
                    m = DATE.match(d['text'])
                    mon = MONTHS.get(fold(m.group(2)))
                    if not mon:
                        continue
                    ptxt = ' '.join(w['text'] for w in sorted(rest, key=lambda w: w['x0']) if abs(w['top'] - d['top']) <= 4)
                    rel.append({'date': '%s-%02d-%02d' % (year, mon, int(m.group(1))), 'period': period_of(ptxt, year), 'raw': ('%s %s' % (d['text'], ptxt)).strip()})
                if not name and not rel:
                    continue
                per = next((x for x in meta if x in ('Mensual', 'Trimestral', 'Anual', 'Semestral', 'Quincenal', 'Semanal', 'Bienal', 'Trienal', 'Quinquenal', 'Decenal', 'Única', 'Unica', 'Eventual', 'Diaria')), None)
                products.append({'page': pi + 1, 'program': program, 'product': name, 'periodicity': per, 'type': ' '.join(x for x in meta if x not in ('Sí', 'No', per)), 'releases': rel})
        if not products or sum(len(p['releases']) for p in products) < 50:
            sys.exit('read %d products and %d release dates: not a calendar layout this reader knows' % (len(products), sum(len(p['releases']) for p in products)))
        json.dump({'title': title, 'year': year, 'time': hour.group(1) if hour else None, 'products': products}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
