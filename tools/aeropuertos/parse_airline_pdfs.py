"""Parse airline monthly traffic-report PDFs (Viva Aerobus, Aeromexico) into one JSON file.

Usage:  python parse_airline_pdfs.py <dir> <out.json>
  <dir> holds PDFs named  viv-YYYY-MM.pdf  (Viva, https://ri.vivaaerobus.com) and  am-YYYY-MM.pdf  (Aeromexico,
  https://ir.aeromexico.com). Requires: pip install pypdf

Output: {"viv": {"2026-08": {"pax": {"dom":..,"intl":..,"total":..}, "lf": {...}, "rpm": {...}, "asm": {...}}, ...}, "am": {...}}
Units in the output: passengers in thousands, RPMs/ASMs in millions of miles, load factor in percent. The first number
on each row is the reported month and the second the same month a year earlier; only the reported month is kept.
Layout quirks handled: table headers split over several lines ("Load" / "Factor" / "(RPM/ASM)" / "89.5% ..."),
raw passenger counts instead of thousands (older Viva reports), and kilometre-based RPKs/ASKs (converted to miles).
Set IR_TEXT_DIR to also write the extracted text of every PDF there (for debugging layouts).
"""
import glob, json, os, re, sys
import pypdf

NUM = r'\(?-?\d[\d,]*(?:\.\d+)?\)?%?'
num_re = re.compile(NUM)


def numbers(s):
    out = []
    for tok in num_re.findall(s):
        t = tok.replace(',', '').replace('%', '').replace('(', '-').replace(')', '')
        try:
            out.append(float(t))
        except ValueError:
            pass
    return out


def text_of(path):
    r = pypdf.PdfReader(path)
    return '\n'.join((p.extract_text() or '') for p in r.pages)


def fix_spaced_digits(s):
    # pdf text sometimes splits numbers: "1 0.6%" -> "10.6%", "2. 6 million" -> "2.6 million"
    s = re.sub(r'(\d)\s+(\d{1,3}(?:[.,]\d+)?%)', r'\1\2', s)
    return re.sub(r'(\d)\s+([.,]\d)', r'\1\2', s)


SECTION = [
    ('pax', re.compile(r'^\s*passengers?\b', re.I)),
    ('lf', re.compile(r'^\s*load\s*factor', re.I)),
    ('rpm', re.compile(r'^\s*rpm', re.I)),
    ('asm', re.compile(r'^\s*asm', re.I)),
    ('rpk', re.compile(r'^\s*rpk', re.I)),
    ('ask', re.compile(r'^\s*ask', re.I)),
]
ROW = re.compile(r'^\s*(domestic|international|total|\(rpm/asm\)|\(rpk/ask\)|\(scheduled)', re.I)
KM_TO_MI = 0.621371
# a line that is only a piece of a table header (the numbers follow on a later line)
HEADER_FRAG = re.compile(r"^\s*(passengers?|pasajeros|load|factor|load\s*factor\*?|rpm'?s?|asm'?s?|rpk'?s?|ask'?s?|"
                         r"\(\s*(thousands?|millions?|rpm\s*/\s*asm|rpk\s*/\s*ask|miles|km)\s*\)|\(?\s*(thousands?|millions?)\s*\)?)\s*$", re.I)
UNIT_LINE = re.compile(r'^\(\s*(thousands?|millions?|rpm\s*/\s*asm|rpk\s*/\s*ask)', re.I)


def join_headers(txt):
    """Re-joins table headers that pdf text extraction split over several lines, so that
    "Load / Factor / (RPM/ASM) / 89.5% 88.0% ..." on four lines becomes one line the section scanner understands."""
    out, buf = [], []
    for raw in txt.split('\n'):
        line = raw.strip()
        if HEADER_FRAG.match(line):
            buf.append(line)
            continue
        if buf:
            if re.match(r'^\(?-?\d', line) or UNIT_LINE.match(line):
                out.append(' '.join(buf + [line]))
                buf = []
                continue
            out.append(' '.join(buf))
            buf = []
        out.append(line)
    if buf:
        out.append(' '.join(buf))
    return '\n'.join(out)


def parse_generic(txt):
    """Section-and-row scanner shared by both formats. Returns {measure: {dom, intl, total}}."""
    out = {}
    section = None
    for raw in join_headers(txt).split('\n'):
        line = fix_spaced_digits(raw.strip())
        if not line:
            continue
        low = line.lower()
        sec = next((k for k, rx in SECTION if rx.search(line)), None)
        if sec:
            section = sec
            # Aeromexico puts the first row on the same line: "Passengers Domestic 1,378 1,394 ..."
            m = re.match(r'^\s*(?:passengers?|load\s*factor|rpms?|asms?|rpks?|asks?)\s*(?:\([^)]*\))?\s*(domestic|international|total)\b(.*)$', line, re.I)
            if m:
                key = {'domestic': 'dom', 'international': 'intl', 'total': 'total'}[m.group(1).lower()]
                nums = numbers(m.group(2))
                if nums:
                    out.setdefault(section, {})[key] = nums[0]
                continue
            # Viva puts the total on the header line when numbers follow the label directly:
            # "PASSENGERS (THOUSAND) 1,678 1,158 44.9% ..." (but not the headline "Passengers increased 16.6%").
            m = re.match(r'^\s*(?:passengers?|load\s*factor\*?|rpm\S*|asm\S*|rpk\S*|ask\S*)\s*(?:\([^)]*\))?\s*(\(?-?\d.*)$', line, re.I)
            if m:
                nums = numbers(m.group(1))
                if len(nums) >= 2:
                    out.setdefault(section, {})['total'] = nums[0]
            continue
        if section and ROW.search(line):
            rest = re.sub(r'^\s*(domestic|international|total|\(rpm/asm\)|\(rpk/ask\)|\([^)]*\))\s*', '', line, flags=re.I)
            if not re.match(r'^\(?-?\d', rest):
                continue  # prose such as "Domestically, Viva grew ..." rather than a table row
            nums = numbers(rest)
            if not nums:
                continue
            if low.startswith('domestic'):
                out.setdefault(section, {})['dom'] = nums[0]
            elif low.startswith('international'):
                out.setdefault(section, {})['intl'] = nums[0]
            else:
                out.setdefault(section, {})['total'] = nums[0]
    # kilometre-based reports -> miles, so every month is comparable
    for km, mi in (('rpk', 'rpm'), ('ask', 'asm')):
        if km in out:
            conv = {kk: round(vv * KM_TO_MI, 1) for kk, vv in out.pop(km).items()}
            out.setdefault(mi, conv)
    # raw passenger counts (older reports) -> thousands
    p = out.get('pax')
    if p and max(p.values()) > 50000:
        for kk in list(p):
            p[kk] = round(p[kk] / 1000.0, 1)
    # derive totals where the report gives only the split (or an implausible header number)
    for k, v in out.items():
        if 'dom' in v and 'intl' in v and k != 'lf':
            s = round(v['dom'] + v['intl'], 3)
            if 'total' not in v or not (0.97 * s <= v['total'] <= 1.03 * s):
                v['total'] = s
    return out


def plausible(d):
    p = d.get('pax', {})
    return 100 <= p.get('total', 0) <= 20000 and 0 < d.get('lf', {}).get('total', 50) <= 100


def main(src, dest):
    result = {'viv': {}, 'am': {}, 'voi': {}}
    problems = []
    text_dir = os.environ.get('IR_TEXT_DIR')
    if text_dir:
        os.makedirs(text_dir, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '*.pdf'))):
        m = re.match(r'(viv|am|voi)-(\d{4}-\d{2})\.pdf$', os.path.basename(f))
        if not m:
            continue
        who, ym = m.group(1), m.group(2)
        try:
            txt = text_of(f)
            if text_dir:
                with open(os.path.join(text_dir, '%s-%s.txt' % (who, ym)), 'w', encoding='utf-8') as fh:
                    fh.write(txt[:30000])
            d = parse_generic(txt)
        except Exception as e:  # noqa: BLE001
            problems.append(f'{os.path.basename(f)}: {e}')
            continue
        if not plausible(d):
            problems.append(f'{os.path.basename(f)}: implausible {json.dumps(d)[:160]}')
            continue
        result[who][ym] = d
    json.dump(result, open(dest, 'w', encoding='utf-8'), ensure_ascii=False)
    for who in result:
        ks = sorted(result[who])
        print(who, len(ks), 'months', (ks[0] + '..' + ks[-1]) if ks else '')
    for p in problems:
        print('SKIP', p)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
