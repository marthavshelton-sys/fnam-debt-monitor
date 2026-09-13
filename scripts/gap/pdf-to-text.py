#!/usr/bin/env python3
"""Convert GAP quarterly-report PDFs (tools/gap/raw/pdf/*.pdf) into the pipe-delimited text format that
scripts/gap/build-data.mjs parses, writing tools/gap/raw/6k/<date>_pdf<tag>_en.txt.

Used once for the pre-2019 reports (4Q15, 4Q16, 4Q17) that GlobeNewswire does not carry. Needs
pdfplumber:  python3 -m venv .venv && .venv/bin/pip install pdfplumber && .venv/bin/python scripts/gap/pdf-to-text.py
File names must be <YYYY-MM>_<nQyy>_...pdf (e.g. 2018-02_4Q17_GAP_ENG.pdf)."""
import glob, os, re, sys
import pdfplumber

RAW = os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'gap', 'raw')
# a numeric cell: 1,234 / (1,234) / 12.5% / (12.5%) / - ; parentheses must be balanced so "(IFRIC 12)" is not split
NUM = re.compile(r'^\(-?\d[\d,]*(\.\d+)?%?\)$|^-?\d[\d,]*(\.\d+)?%?$|^-$|^n/a$', re.I)
PERIOD = re.compile(r'^(\dQ\d\d|\d{1,2}M\d\d|20\d\d|change|%|var\.?|%\s*var\.?)$', re.I)
QUARTER_WORDS = {'1': 'First', '2': 'Second', '3': 'Third', '4': 'Fourth'}

def page_lines(page):
    # use_text_flow merges the letter-spaced glyphs some pages use (e.g. the 4Q16/4Q17 cash-flow exhibit);
    # rows are then rebuilt from the words' vertical position and ordered left to right.
    words = page.extract_words(x_tolerance=2, y_tolerance=3, keep_blank_chars=False, use_text_flow=True)
    rows = {}
    for w in words:
        key = round(w['top'] / 3)
        rows.setdefault(key, []).append(w)
    out = []
    for key in sorted(rows):
        ws = sorted(rows[key], key=lambda w: w['x0'])
        out.append(' '.join(w['text'] for w in ws))
    return out

def fix_digits(s):
    # "1 1,107,561" / "6 07,544" / "7 .3757" -> joined (layout artifact: first digit rendered apart)
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

def convert(pdf_path):
    base = os.path.basename(pdf_path)
    m = re.match(r'(\d{4}-\d{2})_(\d)Q(\d\d)', base)
    if not m:
        print('skip (name)', base); return
    ym, q, yy = m.group(1), m.group(2), m.group(3)
    fy = 2000 + int(yy)
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for p in pdf.pages:
            lines.extend(page_lines(p))
    # drop pro-forma tables (DCA / Montego Bay acquisition presentation) so the reported figures win
    out, skipping = [], False
    for ln in lines:
        if re.search(r'pro forma', ln, re.I):
            skipping = True
        elif skipping and re.match(r'\s*Consolidated Results for the', ln):
            skipping = False
        if skipping:
            continue
        if re.search(r'Earnings Report\s+Page \d+ of \d+', ln):
            continue
        out.append(to_pipes(ln))
    title = f'Grupo Aeroportuario del Pacifico Announces Results for the {QUARTER_WORDS[q]} Quarter of {fy}'
    header = f'# source: tools/gap/raw/pdf/{base}\n# title: {title}\n# date: {ym}-01\n# lang: en\n# class: results\n\nSummary of Results {q}Q{yy}\n\n'
    dest = os.path.join(RAW, '6k', f'{ym}-01_pdf{q}Q{yy}_en.txt')
    with open(dest, 'w') as f:
        f.write(header + '\n'.join(out) + '\n')
    print(base, '->', os.path.relpath(dest), len(out), 'lines')

for f in sorted(glob.glob(os.path.join(RAW, 'pdf', '*.pdf'))):
    convert(f)
