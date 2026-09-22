#!/usr/bin/env python3
"""Generic PDF -> pipe-delimited text converter for the airport-group models (ASUR, OMA).

Usage: pdf2text.py <in.pdf> <out.txt> [header lines...]
Rows are rebuilt from word positions (so letter-spaced glyphs and multi-column tables survive) and a row
whose trailing tokens are numbers becomes "label | n1 | n2 | ...", the format the build-data parsers read.
Requires pdfplumber (pip install pdfplumber)."""
import re, sys
import pdfplumber

NUM = re.compile(r'^\(-?\d[\d,]*(\.\d+)?%?\)$|^-?\d[\d,]*(\.\d+)?%?$|^-$|^n/?a$|^n\.a\.$|^n\.m\.$|^nm$', re.I)
PERIOD = re.compile(r'^(\dQ\d\d|\d{1,2}M\d\d|20\d\d|change|%|var\.?|%\s*var\.?|%\s*chg\.?|chg\.?)$', re.I)

def page_lines(page):
    words = page.extract_words(x_tolerance=2, y_tolerance=3, keep_blank_chars=False, use_text_flow=True)
    rows = {}
    for w in words:
        rows.setdefault(round(w['top'] / 3), []).append(w)
    out = []
    for key in sorted(rows):
        ws = sorted(rows[key], key=lambda w: w['x0'])
        out.append(' '.join(w['text'] for w in ws))
    return out

def fix_digits(s):
    return re.sub(r'(?<![\w,.])(\d) (?=[\d,.]{2,}\b)', r'\1', s)

def to_pipes(line):
    line = fix_digits(line.strip())
    if not line:
        return ''
    words = line.split(' ')
    if len(words) >= 2 and all(PERIOD.match(w) for w in words):
        return ' | '.join(words)
    nums = []
    while words and NUM.match(words[-1]):
        nums.insert(0, words.pop())
    label = ' '.join(words).rstrip('.:').strip()
    if nums and label:
        return label + ' | ' + ' | '.join(nums)
    if nums and not label:
        return ' | '.join(nums)
    return line

def convert(src, dest, header=''):
    lines = []
    with pdfplumber.open(src) as pdf:
        for i, p in enumerate(pdf.pages):
            lines.append(f'<<page {i + 1}>>')
            lines.extend(page_lines(p))
    with open(dest, 'w') as f:
        f.write(header + '\n'.join(to_pipes(l) for l in lines) + '\n')
    return len(lines)

if __name__ == '__main__':
    src, dest = sys.argv[1], sys.argv[2]
    header = ''.join(h + '\n' for h in sys.argv[3:]) + ('\n' if len(sys.argv) > 3 else '')
    n = convert(src, dest, header)
    print(src, '->', dest, n, 'lines')
