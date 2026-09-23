#!/usr/bin/env python3
"""Build the Gentera model's data files from the harvested press releases (tools/gentera/raw) and the seed
dataset (tools/gentera/raw/seed/quarters.json):

  site/gentera/data/financials.js   window.G_FIN  — consolidated income statement, balance sheet, reported and
                                                    recomputed ratios per quarter; derived YTD and fiscal years
  site/gentera/data/operations.js   window.G_OPS  — loan book, clients, stage-3, write-offs, funding cost,
                                                    capital and headcount by subsidiary; monthly regulator series
                                                    (CNBV Banco Compartamos, SBS Compartamos Perú) when fetched
  site/gentera/data/quality.js      window.G_QUALITY — parse log: which quarters came from a parsed release,
                                                    which from the seed, every warning (read by quality.html)

How a release is read (parse_release): every page is cut into segments at its column-header lines (a line with
two or more quarter ids such as "2T26 2T25 1T26 % Var 2T25 % Var 1T26 6M26 6M25 % Var 6M25", possibly split
over several lines in the 2012–2021 layouts). The header gives the column order, with a slot for every
"% Var" column; each row's trailing numeric tokens are aligned to those slots. The entity a page belongs to
(GENTERA consolidated, Banco Compartamos, Compartamos Perú, ConCrédito) is read from the page's title text, and
the segment kind (income statement, balance sheet, indicators, cost of funds) from its row labels. Labels are
matched against the templates below, which carry every wording used since 2012 ("Cartera vencida" before the
2022 IFRS 9 stages, "Ingresos totales de la operación" for the operating result before 2020, "ISR causado /
diferido", ...).

Sources, in order of precedence for every quarter:
  1. The quarter's own press release. Figures are accepted only when the statement identities tie out and,
     for quarters that also exist in the seed transcription, when the headline lines agree with it.
  2. The comparative column of a later release (the same quarter printed as "year-ago" or "prior quarter").
  3. The seed dataset (hand-transcribed from the same releases, 1Q22–2Q26).
Amounts in MILLIONS of pesos as Gentera reports them; ratios in %.

Recomputed for every quarter: coverage = allowance / stage-3 loans; cor = annualised provisions / average
gross loans; yieldCalc = annualised interest income / average gross loans; effCalc = opex / (margin after
provisions + net fees + trading + other); effPre = opex / pre-provision income; eps, bvps on controlling
figures. Usage: python scripts/gentera/build_data.py
"""
import glob, json, os, re, sys, unicodedata
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, 'tools', 'gentera', 'raw')
TXT = os.path.join(RAW, 'text', 'releases')
SEED = os.path.join(RAW, 'seed', 'quarters.json')
REG = os.path.join(RAW, 'regulators.json')
MANIFEST = os.path.join(RAW, 'manifest.json')
OUT_DIR = os.path.join(ROOT, 'site', 'gentera', 'data')
IR_PAGE = 'https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral'

MONTHS_ES = {'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12}
LOG = {'quarters': {}, 'warnings': [], 'parsed': [], 'comparative': [], 'seed': [], 'generatedAt': None}


def warn(msg):
    LOG['warnings'].append(msg)
    print('WARN ' + msg)


# ----------------------------------------------------------------------------- text helpers
def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+', ' ', s).strip()


QID_RX = re.compile(r'^([1-4])[TQ](\d{2})$', re.I)
YTD_RX = re.compile(r'^(\d{1,2})M(\d{2})$', re.I)
NUM_RX = re.compile(r'^\(?-?\$?\d[\d,]*(?:\.\d+)?%?\)?$')
HEADER_WORDS = {'%', 'var', 'var.', 'variacion', 'variación', 'anual', 'trimestral', 'vs', 'vs.'}


def qid_of(tok):
    m = QID_RX.match(tok)
    return '20%s' % m.group(2) + 'Q' + m.group(1) if m else None


def qid_parts(qid):
    return int(qid[:4]), int(qid[5])


def prev_q(qid):
    fy, q = qid_parts(qid)
    return '%dQ%d' % (fy - 1, 4) if q == 1 else '%dQ%d' % (fy, q - 1)


def label_q(qid):
    fy, q = qid_parts(qid)
    return '%dT%s' % (q, str(fy)[2:])


def num_value(tok):
    """'(1,234.5)' -> -1234.5, '12.3%' -> 12.3, '-' -> 0, 'N/C' -> None."""
    t = tok.strip()
    if t in ('-', '–', '—'):
        return 0.0
    if not NUM_RX.match(t):
        return None
    neg = t.startswith('(') or t.startswith('-')
    s = re.sub(r'[^\d.]', '', t)
    if not s or s == '.':
        return None
    v = float(s)
    return -v if neg else v


def is_token(w):
    return NUM_RX.match(w) is not None or w in ('-', '–', '—', 'N/C', 'N/A', 'n/c', 'NC', 'n.a.', 'N.A.')


def split_row(line):
    """('label', [tokens]) — tokens are the trailing run of numeric tokens (words like 'pp' are skipped); a
    trailing word fragment of a wrapped label (e.g. '… -8.5% Par') is dropped so the row is not lost."""
    words = re.sub(r'(?<=[^\s\-–])[-–](?=\s|$)', ' -', line).split()  # "21.8%-", "N/C-" -> "… -" (2012–2014 layouts)
    for drop in (0, 1, 2):
        ws = words[:len(words) - drop] if drop else words
        toks = []
        i = len(ws) - 1
        while i >= 0:
            w = ws[i]
            if w.lower() in ('pp', 'p.p.', 'pb', 'bp'):
                i -= 1; continue
            if is_token(w):
                toks.append(w); i -= 1; continue
            break
        toks.reverse()
        if len(toks) >= 2:
            return ' '.join(ws[:i + 1]), toks
    return line.strip(), []


def header_cols(tokens):
    """Header tokens -> column slots: a quarter/YTD id per value column, None per '% Var' column."""
    cols, after_var = [], False
    for w in tokens:
        wl = w.lower().rstrip('.')
        q = qid_of(w); y = YTD_RX.match(w)
        if q or y:
            if after_var:
                cols.append(None); after_var = False
            else:
                cols.append(q or ('%sM%s' % (y.group(1), y.group(2))))
        elif wl in HEADER_WORDS or wl in ('change', 'chg', 'δ') or wl.startswith('%'):
            if wl.startswith('%') and len(wl) > 1:
                wl = 'variacion'  # "%Variación" glued
            if wl in ('anual', 'trimestral'):
                cols.append(None); after_var = False
            else:
                after_var = True
        elif re.match(r'^20\d\d$', w):
            # a bare year is an annual column in the 4Q releases ("4T13 4T12 % Var 4T12 3T13 % Var 3T13 2013 2012 % Var 2012")
            if after_var:
                cols.append(None); after_var = False
            else:
                cols.append('FY' + w)
        # any other word (segment title such as "Principales Indicadores") is ignored
    if after_var:
        cols.append(None)
    return cols


def is_header_word(w):
    wl = w.lower().rstrip('.')
    return bool(qid_of(w) or YTD_RX.match(w) or wl in HEADER_WORDS or wl in ('change', 'chg', 'δ') or wl.startswith('%') or re.match(r'^20\d\d$', w))


def is_header_line(line):
    """A column-header line: two or more quarter ids and at most a short title, or (as a continuation) only
    header words. Prose lines that mention two quarters are excluded by the word limit."""
    words = line.split()
    ids = [w for w in words if qid_of(w) or YTD_RX.match(w)]
    if not ids or len(line) > 130:
        return False
    # a stray row label can precede the header ("Cartera de crédito Etapa 1 y 2 2T22 2T21 1T22 % Var …"):
    # judge the tail from the first quarter id onwards
    first = next(i for i, w in enumerate(words) if qid_of(w) or YTD_RX.match(w))
    head, tail = words[:first], words[first:]
    if any(is_token(w) and not re.match(r'^20\d\d$', w) for w in tail):
        return False  # a data row that happens to mention a quarter (bare years are annual columns)
    if not all(is_header_word(w) for w in tail):
        others = [w for w in words if not is_header_word(w)]
        return len(ids) >= 2 and len(others) <= 4
    return len(ids) >= 2 or not head


def header_only(line):
    return bool(line.split()) and all(is_header_word(w) for w in line.split())


def pages_of(txt):
    parts = re.split(r'=== PAGE (\d+) ===\n', txt)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}


def release_date(txt, qid=None):
    """Publication date: the first date in the opening pages that falls in the release window (1 to 75 days
    after the quarter end); the dateline "Ciudad de México, 22 de julio de 2026" is preferred when present."""
    t = norm(txt[:15000])
    from datetime import date, timedelta
    lo = hi = None
    if qid:
        fy, q = qid_parts(qid)
        end = date(fy, q * 3, 31 if q in (1, 4) else 30)
        lo, hi = end + timedelta(days=1), end + timedelta(days=75)
    cands = []
    # Gentera's dateline usually omits the "de" before the year ("22 de julio 2026"); accept both forms.
    m = re.search(r'(ciudad de mexico|mexico,? d\.?f\.?)\s*,?\s*(?:mexico)?\s*[,–-]?\s*a?\s*(\d{1,2}) de (%s)(?: del?)? (20\d\d)' % '|'.join(MONTHS_ES), t)
    if m:
        cands.append((int(m.group(4)), MONTHS_ES[m.group(3)], int(m.group(2))))
    for m in re.finditer(r'(\d{1,2}) de (%s)(?: del?)? (20\d\d)' % '|'.join(MONTHS_ES), t):
        cands.append((int(m.group(3)), MONTHS_ES[m.group(2)], int(m.group(1))))
    for y, mo, d in cands:
        try:
            dt = date(y, mo, d)
        except ValueError:
            continue
        if lo is None or lo <= dt <= hi:
            return dt.isoformat()
    return None


# ----------------------------------------------------------------------------- templates (normalised labels)
IS_TPL = [
    ('intInc', r'^ingresos por intereses'),
    ('intExp', r'^gastos por intereses'),
    ('fundExp', r'^gastos por financiamiento'),
    ('origExp', r'^gastos de originacion'),
    ('finMarginAdj', r'^margen financiero ajustado|^crediticios$'),
    ('finMargin', r'^margen financiero$'),
    ('prov', r'^estimacion preventiva'),
    ('feesCh', r'^comisiones y tarifas cobradas'),
    ('feesPd', r'^comisiones y tarifas pagadas'),
    ('trading', r'^resultado por intermediacion'),
    ('otherInc', r'^(otros )?ingresos \(egresos\) de la operacion|^otros ingresos'),
    ('opex', r'^gastos de administracion|^gastos operativos'),
    ('opRes', r'^resultado (de )?la operacion|^ingresos totales de la operacion'),
    ('assoc', r'asociadas|^participacion en el resultado (neto )?de otras entidades|^tici'),
    ('ibt', r'^resultado antes de (isr|impuestos|imptos)'),
    ('taxC', r'^isr causado$|^causado$|^impuestos a la utilidad causados'),
    ('taxD', r'^isr diferido$|^diferido$|^impuestos a la utilidad diferidos'),
    ('tax', r'^impuestos a la utilidad$|^isr causado y diferido|^isr$'),
    ('contOps', r'^resultado de operaciones continuas|^resultado antes de operaciones discontinu'),
    ('discontinued', r'^operaciones discontinuadas|^resultado de operaciones discontinuadas'),
    ('netInc', r'^resultado neto( atribuible a:?)?$'),
    ('oci', r'^otros resultados integrales'),
    ('compInc', r'^resultado integral( atribuible a:?)?$'),
    ('niCtrl', r'^participacion controladora'),
    ('niMin', r'^participacion no controladora'),
]
BS_TPL = [
    ('cash', r'^(efectivo|disponibilidades)'),
    ('loans12', r'^cartera (de credito )?(con riesgo de credito )?etapa 1 y 2|^cartera vigente'),
    ('loans3', r'etapa 3|^cartera vencida'),
    ('loans', r'^cartera de credito$|^cartera total|^cartera de credito total'),
    ('deferred', r'^partidas diferidas'),
    ('allow', r'^estimacion preventiva'),
    ('loansNet', r'^cartera de credito \(neto\)|^cartera de credito neta'),
    ('otherRec', r'^otras cuentas por cobrar'),
    ('ppe', r'^propiedades|^activo fijo|^mobiliario'),
    ('rou', r'^activos? por derechos? de uso'),
    ('permInv', r'^inversiones permanentes'),
    ('dta', r'^activos? por impuestos? a la utilidad diferidos|^impuestos diferidos'),
    ('otherAssets', r'^otros activos'),
    ('goodwill', r'^credito mercantil'),
    ('totAssets', r'^total activo$|^total de activo'),
    ('deposits', r'^captacion tradicional|^captacion$'),
    ('depInst', r'^captacion instituciones'),
    ('depTerm', r'^depositos a plazo'),
    ('debtSec', r'^titulos de credito emitidos|^certificados bursatiles'),
    ('bankLoans', r'^prestamos (interbancarios|bancarios)'),
    ('securit', r'bursatilizacion'),
    ('leaseLiab', r'^pasivos? por arrendamiento'),
    ('otherLiab', r'^otros pasivos|^otras cuentas por pagar'),
    ('defCred', r'^creditos diferidos'),
    ('totLiab', r'^total pasivo$'),
    ('capSoc', r'^capital social'),
    ('prima', r'^prima en venta'),
    ('reserves', r'^reservas de capital'),
    ('retained', r'^resultados acumulados|^resultado de ejercicios anteriores'),
    ('ociAcc', r'^otros resultados integrales|^otras cuentas de capital'),
    ('eqCtrl', r'^(total )?participacion controladora'),
    ('eqMin', r'^(total )?participacion no controladora'),
    ('totEq', r'^total capital contable'),
    ('totLiabEq', r'^total (de )?pasivo y capital'),
]
IND_TPL = [
    ('clientsCred', r'^clientes de credito|^clientes$|^clientes activos|^clientes\*'),
    ('clientsTot', r'^personas atendidas|^clientes totales|^total de clientes'),
    ('npl', r'^cartera (etapa 3|vencida) ?/ ?cartera total|^indice de cartera|^imor|^cartera vencida$|^indice de morosidad'),
    ('roa', r'^roa\b'), ('roe', r'^roe\b'),
    ('nimAdj', r'^(nim|min) despues de provisiones'), ('nim', r'^nim\b|^min\b|^margen de interes neto'),
    ('efficOp', r'^indice de eficiencia operativa|^eficiencia operativa'), ('effic', r'^indice de eficiencia'),
    ('coverageRep', r'^indice de cobertura'),
    ('capAssets', r'^capital ?/ ?activos'),
    ('avgBal', r'^saldo promedio'),
    ('employees', r'^colaboradores|^empleados'),
    ('offices', r'^oficinas de servicio|^oficinas'),
    ('branches', r'^sucursales'),
    ('icap', r'^indice de capitalizacion|^icap'),
    ('solvency', r'^indice de solvencia|^ratio de capital'),
    ('writeoffs', r'^castigos'),
    ('empresarias', r'^empresarias|^distribuidoras'),
    ('usersCC', r'^usuarios finales'),
    ('creditienda', r'creditienda'),
    ('cor', r'^costo de riesgo'),
    ('cof', r'^costo de fondeo'),
    ('loansInd', r'^cartera\*?$|^cartera de credito\*?$|^cartera total\*?$'),
    ('niInd', r'^resultado neto\*?$|^utilidad neta\*?$'),
]
ENTITY_WORDS = {'mx': ['banco compartamos'], 'pe': ['peru', 'financiera crear', 'compartamos financiera', 'crear'], 'cc': ['concredito'],
                'skip': ['guatemala', 'yastas', 'aterna', 'intermex', 'fiinlab', 'fundacion'], 'cons': ['consolidado', 'gentera', 's.a.b']}


def detect_entity(lines):
    """Score the page's title text (everything before the first header line, minus the running header).
    Returns (entity, strong): strong = the title says 'consolidado' / 'S.A.B.', which statement pages of the
    group always do; a page attributed to 'cons' only by the word GENTERA may not carry group statements."""
    text = norm(' '.join(l for l in lines if not re.match(r'^\s*(resultados( gentera)? \dt\d\d|\d{1,2})\s*$', norm(l))))
    text = re.split(r'sobre gentera|sobre eventos futuros|este comunicado de prensa|acerca de gentera', text)[0]  # last-page boilerplate
    if 'guatemala' in text:
        return None, False
    scores = {k: sum(text.count(w) for w in ws) for k, ws in ENTITY_WORDS.items()}
    strong = 'consolidado' in text or 's.a.b' in text
    scores['cons'] += 3 if strong else 0
    best = max(scores, key=lambda k: (scores[k], k == 'cons'))
    if scores[best] == 0 or best == 'skip':
        return None, False
    return best, strong


def classify_segment(title, rows):
    labels = ' | '.join(norm(l) for l, _ in rows)
    t = norm(title)
    if 'costo de fondeo' in t:
        return 'cof'
    if 'ingresos por intereses' in labels or 'margen financiero' in labels:
        return 'is'
    if 'total activo' in labels or 'total pasivo' in labels or 'cartera vigente' in labels or 'total capital contable' in labels:
        return 'bs'
    if any(k in labels for k in ('saldo promedio', 'colaboradores', 'indice de cobertura', 'roa', 'castigos', 'clientes', 'indice de eficiencia', 'usuarios finales')):
        return 'ind'
    return None


def align(cols, toks):
    """Map row tokens to the header slots; returns {id: value}. Extra tokens are dropped from the end when they
    are dash placeholders (2014 layout) and otherwise from the front (label digits such as 'etapa 1 y 2')."""
    ids = [c for c in cols if c]
    toks = list(toks)
    while len(toks) > len(cols) and toks[-1] in ('-', '–', '—'):
        toks.pop()
    if len(toks) > len(cols):
        toks = toks[-len(cols):]
    if len(toks) == len(cols):
        pairs = zip(cols, toks)
    elif len(toks) == len(ids):
        pairs = zip(ids, toks)
    else:
        return None
    return {c: num_value(t) for c, t in pairs if c}


def parse_release(qid, txt, url):
    """Returns {qid: {entity: {'is':{}, 'bs':{}, 'ind':{}, 'cof':{}, 'pages':{}}}} for the quarter and every
    comparative quarter the release prints."""
    pages = pages_of(txt)
    res = {}
    date = release_date(txt, qid)
    prev_entity = None
    for pno, page in sorted(pages.items()):
        lines = [l.rstrip() for l in page.split('\n')]
        # cut into segments at header blocks
        segments, pre, cur, hdr, i = [], [], None, [], 0
        while i < len(lines):
            l = lines[i].strip()
            if l and is_header_line(l):
                hdr = l.split()
                i += 1
                # a header split over several lines (2012–2021 layouts): join the following header-only lines
                while i < len(lines) and header_only(lines[i].strip()):
                    hdr += lines[i].split(); i += 1
                first = next(k for k, w in enumerate(hdr) if qid_of(w) or YTD_RX.match(w))
                title = ' '.join(w for w in hdr[:first] if not is_header_word(w))
                hdr = hdr[first:]
                cur = {'cols': header_cols(hdr), 'title': title, 'rows': []}
                segments.append(cur)
                continue
            if cur is None:
                pre.append(l)
            elif l:
                label, toks = split_row(l)
                if toks:
                    cur['rows'].append((label, toks))
                elif not re.search(r'\d', l) and len(l) < 70:
                    cur['rows'].append((l, []))  # label-only line (e.g. "ISR" or a wrapped label)
            i += 1
        if not segments:
            prev_entity = None
            continue
        entity, strong = detect_entity(pre)
        meaningful = [l for l in pre if l.strip() and not re.match(r'^\s*(resultados( gentera)? \dt\d\d|\d{1,2})\s*$', norm(l))]
        if not entity and prev_entity and len(meaningful) <= 1:
            entity, strong = prev_entity  # untitled continuation page (e.g. the 3Q15 balance sheet)
        if not entity:
            prev_entity = None
            continue
        prev_entity = (entity, strong)
        for seg in segments:
            cols = seg['cols']
            if len([c for c in cols if c]) < 2:
                continue
            kind = classify_segment(seg['title'], seg['rows'])
            if not kind:
                continue
            if kind in ('is', 'bs') and entity == 'cons' and not strong:
                continue  # group statements always say "Consolidado"; anything else here is a subsidiary page
            ent = 'cons' if kind == 'cof' else entity
            tpl = {'is': IS_TPL, 'bs': BS_TPL, 'ind': IND_TPL, 'cof': None}[kind]
            seen = set()
            for label, toks in seg['rows']:
                if not toks:
                    continue
                lab = norm(label)
                key = None
                if kind == 'cof':
                    key = 'cofMX' if ('mexico' in lab or 'banco compartamos' in lab) else 'cofPE' if ('peru' in lab or 'financiera' in lab) else 'cofCC' if 'concredito' in lab else None
                else:
                    for k, rx in tpl:
                        if re.search(rx, lab):
                            key = k; break
                if not key:
                    continue
                if kind == 'ind' and ent == 'cons' and key == 'usersCC':
                    key = 'clientsTot'  # "Usuarios finales servicios financieros" = people served, group level
                vals = align(cols, toks)
                if not vals:
                    continue
                if key in seen and kind == 'is' and key in ('niCtrl', 'niMin'):
                    key = 'ciCtrl' if key == 'niCtrl' else 'ciMin'  # second block = comprehensive income attributable
                elif key in seen and key not in ('loans12',):
                    continue  # keep the first occurrence
                seen.add(key)
                for q, v in vals.items():
                    if v is None or not re.match(r'^20\d\dQ[1-4]$', q):
                        continue
                    blk = res.setdefault(q, {}).setdefault(ent, {'is': {}, 'bs': {}, 'ind': {}, 'cof': {}, 'pages': {}})
                    tgt = blk['cof' if kind == 'cof' else kind]
                    if kind in ('is', 'bs') and blk['pages'].get(kind) not in (None, pno):
                        continue  # the first statement page of an entity wins; later pages are other entities' tables
                    if key == 'loans12' and key in tgt:
                        tgt[key] += v  # consumo + comercial lines
                    else:
                        tgt[key] = v
                    blk['pages'][kind] = pno
    for q in res:
        for ent, blk in res[q].items():
            i = blk['is']
            if 'tax' not in i and ('taxC' in i or 'taxD' in i):
                i['tax'] = i.get('taxC', 0) + i.get('taxD', 0)
            if 'netInc' not in i and 'contOps' in i:
                i['netInc'] = i['contOps'] + i.get('discontinued', 0)
            if 'ibt' not in i and 'opRes' in i:
                i['ibt'] = i['opRes'] + i.get('assoc', 0)
            b = blk['bs']
            if 'loans' not in b and 'loans12' in b and 'loans3' in b:
                b['loans'] = b['loans12'] + b['loans3']
            if 'otherAssets' in b and 'rou' in b:
                b['otherAssets'] = b['otherAssets'] + b['rou']  # seed convention: right-of-use assets inside other assets
        res[q]['source'] = {'url': url, 'title': 'Press release %s' % label_q(qid), 'date': date, 'release': qid}
    return res


# ----------------------------------------------------------------------------- tie-outs
TOL = 3.0  # Ps. millions: the releases print rounded millions, so subtotals can be off by a few units


def is_ties(i):
    g = i.get
    ok = True
    if g('intInc') is None or g('finMargin') is None or g('netInc') is None:
        return False
    if g('intExp') is not None:
        ok &= abs(g('intInc') - g('intExp') - g('finMargin')) <= TOL
    if g('prov') is not None and g('finMarginAdj') is not None:
        ok &= abs(g('finMargin') - g('prov') - g('finMarginAdj')) <= TOL
    if all(g(k) is not None for k in ('finMarginAdj', 'feesCh', 'feesPd', 'opex', 'opRes')):
        ok &= abs(g('finMarginAdj') + g('feesCh') - g('feesPd') + (g('trading') or 0) + (g('otherInc') or 0) - g('opex') - g('opRes')) <= TOL
    if g('ibt') is not None and g('tax') is not None:
        gap = g('netInc') - (g('ibt') - g('tax'))
        # discontinued operations: the 3Q20 release prints the sign of the line inconsistently, so compare magnitudes
        ok &= abs(abs(gap) - abs(g('discontinued') or 0)) <= TOL
    if g('niCtrl') is not None and g('niMin') is not None:
        ok &= abs(g('niCtrl') + g('niMin') - g('netInc')) <= TOL
    return bool(ok)


def bs_ties(b):
    g = b.get
    if g('totAssets') is None or g('totLiab') is None or g('totEq') is None:
        return False
    ok = abs(g('totLiab') + g('totEq') - g('totAssets')) <= TOL
    if all(g(k) is not None for k in ('loans12', 'loans3', 'loans')):
        ok &= abs(g('loans12') + g('loans3') - g('loans')) <= TOL
    if g('eqCtrl') is not None and g('eqMin') is not None:
        ok &= abs(g('eqCtrl') + g('eqMin') - g('totEq')) <= TOL
    return bool(ok)


# ----------------------------------------------------------------------------- assemble quarters
IS_KEYS = ['intInc', 'intExp', 'fundExp', 'origExp', 'finMargin', 'prov', 'finMarginAdj', 'feesCh', 'feesPd', 'trading', 'otherInc', 'opex', 'opRes', 'assoc', 'ibt', 'tax', 'discontinued', 'netInc', 'niCtrl', 'niMin', 'oci', 'compInc', 'ciCtrl', 'ciMin', 'niMX', 'niPE', 'niCC', 'fmMX', 'fmPE', 'fmCC', 'iiMX', 'iiPE', 'iiCC', 'writeoffs', 'woMX', 'woPE', 'woCC']
BS_KEYS = ['cash', 'loans12', 'loans3', 'loans', 'deferred', 'allow', 'loansNet', 'otherRec', 'ppe', 'permInv', 'dta', 'otherAssets', 'goodwill', 'totAssets', 'deposits', 'depInst', 'debtSec', 'bankLoans', 'securit', 'leaseLiab', 'otherLiab', 'defCred', 'totLiab', 'capSoc', 'prima', 'reserves', 'retained', 'ociAcc', 'eqCtrl', 'eqMin', 'totEq', 'taMX', 'taPE', 'taCC', 'eqMX', 'eqPE', 'eqCC']
OPS_KEYS = ['clientsCred', 'clientsTot', 'clientsMX', 'clientsPE', 'usersCC', 'empresarias', 'loansMX', 'loansPE', 'loansCC', 'avgBal', 'employees', 'offices', 'branches', 'npl', 'nplMX', 'nplPE', 'nplCC', 's3MX', 's3PE', 's3CC', 'cofMX', 'cofPE', 'icap', 'solvPE', 'yieldDisc', 'nimMX', 'nimPE', 'nimCC', 'creditienda']
REP_KPI = ['nim', 'nimAdj', 'effic', 'efficOp', 'roa', 'roe', 'roeCtrl', 'npl', 'coverageRep', 'capAssets', 'corDisc', 'epsDisc']
SUB = {'mx': 'MX', 'pe': 'PE', 'cc': 'CC'}


def seed_quarter(r):
    q = {'is': {}, 'bs': {}, 'ops': {}, 'kpi': {}}
    for k in IS_KEYS:
        if r.get(k) is not None: q['is'][k] = r[k]
    for k in BS_KEYS:
        if r.get(k) is not None: q['bs'][k] = r[k]
    for k in OPS_KEYS:
        if r.get(k) is not None: q['ops'][k] = r[k]
    for k in REP_KPI:
        src = 'coverage' if k == 'coverageRep' else k
        if r.get(src) is not None: q['kpi'][k] = r[src]
    q['shares'] = r.get('shares')
    return q


def from_parsed(blocks):
    """Turn a parsed {entity: {...}} record into the model's is/bs/ops/kpi blocks."""
    cons = blocks.get('cons', {'is': {}, 'bs': {}, 'ind': {}, 'cof': {}})
    q = {'is': {k: v for k, v in cons['is'].items() if k in IS_KEYS}, 'bs': {k: v for k, v in cons['bs'].items() if k in BS_KEYS}, 'ops': {}, 'kpi': {}}
    ind = cons['ind']
    for k in ('nim', 'nimAdj', 'effic', 'efficOp', 'roa', 'roe', 'npl', 'coverageRep', 'capAssets'):
        if ind.get(k) is not None: q['kpi'][k] = ind[k]
    if ind.get('cor') is not None: q['kpi']['corDisc'] = ind['cor']
    for k in ('clientsCred', 'clientsTot', 'avgBal', 'employees', 'offices'):
        if ind.get(k) is not None: q['ops'][k] = ind[k]
    if ind.get('writeoffs') is not None: q['is']['writeoffs'] = ind['writeoffs']
    for ent, sfx in SUB.items():
        b = blocks.get(ent)
        if not b: continue
        i, s, d = b['is'], b['bs'], b['ind']
        if i.get('intInc') is not None: q['is']['ii' + sfx] = i['intInc']
        if i.get('finMargin') is not None: q['is']['fm' + sfx] = i['finMargin']
        ni = i.get('netInc') if i.get('netInc') is not None else d.get('niInd')
        if ni is not None: q['is']['ni' + sfx] = ni
        if s.get('totAssets') is not None: q['bs']['ta' + sfx] = s['totAssets']
        if s.get('totEq') is not None: q['bs']['eq' + sfx] = s['totEq']
        # the subsidiary's line in Gentera's portfolio table (indicators, "Cartera*") is the consolidated view
        # (after eliminations); the subsidiary's own balance sheet is the fallback
        loans = d.get('loansInd') if d.get('loansInd') is not None else s.get('loans')
        if loans is not None: q['ops']['loans' + sfx] = loans
        if s.get('loans3') is not None: q['ops']['s3' + sfx] = s['loans3']
        if d.get('npl') is not None: q['ops']['npl' + sfx] = d['npl']
        if d.get('nim') is not None: q['ops']['nim' + sfx] = d['nim']
        if d.get('writeoffs') is not None: q['is']['wo' + sfx] = d['writeoffs']
        if ent == 'mx':
            if d.get('icap') is not None: q['ops']['icap'] = d['icap']
            if d.get('branches') is not None: q['ops']['branches'] = d['branches']
            if d.get('clientsCred') is not None: q['ops']['clientsMX'] = d['clientsCred']
        if ent == 'pe':
            if d.get('solvency') is not None: q['ops']['solvPE'] = d['solvency']
            if d.get('clientsCred') is not None: q['ops']['clientsPE'] = d['clientsCred']
        if ent == 'cc':
            if d.get('usersCC') is not None: q['ops']['usersCC'] = d['usersCC']
            if d.get('empresarias') is not None: q['ops']['empresarias'] = d['empresarias']
            if d.get('creditienda') is not None: q['ops']['creditienda'] = d['creditienda']
    for k, v in cons.get('cof', {}).items():
        q['ops'][k] = v
    return q


def derive(q, prev_loans):
    i, b, k = q['is'], q['bs'], q['kpi']
    if i.get('feesCh') is not None: i['netFees'] = i['feesCh'] - (i.get('feesPd') or 0)
    if i.get('otherInc') is not None or i.get('trading') is not None: i['otherTot'] = (i.get('trading') or 0) + (i.get('otherInc') or 0)
    if i.get('finMargin') is not None and i.get('netFees') is not None:
        i['totOpInc'] = i['finMargin'] + i['netFees'] + (i.get('otherTot') or 0)
        i['opIncAfterProv'] = i['totOpInc'] - (i.get('prov') or 0)
    if i.get('netInc') is not None and all(i.get(x) is not None for x in ('niMX', 'niPE', 'niCC')):
        i['niOther'] = i['netInc'] - i['niMX'] - i['niPE'] - i['niCC']
    if i.get('writeoffs') is not None and i.get('woPE') is not None and i.get('woCC') is not None and i.get('woMX') is None:
        i['woMX'] = i['writeoffs'] - i['woPE'] - i['woCC']
    if b.get('loans') is not None and prev_loans:
        avg = (b['loans'] + prev_loans) / 2
        k['avgLoans'] = avg
        if i.get('prov') is not None: k['cor'] = i['prov'] * 4 / avg * 100
        if i.get('intInc') is not None: k['yieldCalc'] = i['intInc'] * 4 / avg * 100
    if b.get('allow') is not None and b.get('loans3'):
        k['coverage'] = b['allow'] / b['loans3'] * 100
    if i.get('opex') is not None and i.get('opIncAfterProv'):
        k['effCalc'] = i['opex'] / i['opIncAfterProv'] * 100
        k['effPre'] = i['opex'] / i['totOpInc'] * 100
    if i.get('tax') is not None and i.get('ibt'):
        k['taxRate'] = i['tax'] / i['ibt'] * 100
        if i.get('netInc') is not None:
            gap = i['netInc'] - (i['ibt'] - i['tax'])
            # discontinued operations = whatever separates net income from (pre-tax − tax); 3Q22 +180, 3Q20 −60
            # (the 3Q20 release prints the sign inconsistently, so the derived value is kept)
            if abs(gap) > 3: i['discontinued'] = round(gap, 1)
            elif i.get('discontinued') is not None and abs(i['discontinued']) > 3: i['discontinued'] = round(gap, 1)
    sh = q.get('shares')
    if sh:
        if i.get('niCtrl') is not None: k['eps'] = i['niCtrl'] / sh
        if b.get('eqCtrl') is not None: k['bvps'] = b['eqCtrl'] / sh
    if b.get('totLiab') is not None and b.get('totEq'): k['leverage'] = b['totLiab'] / b['totEq']
    if b.get('loans') is not None and b.get('deposits'): k['loansToDeposits'] = b['loans'] / b['deposits']
    if b.get('totEq') is not None and b.get('totAssets'): k['eqAssets'] = b['totEq'] / b['totAssets'] * 100
    if b.get('loans3') is not None and b.get('loans'): k['nplCalc'] = b['loans3'] / b['loans'] * 100
    ops = q['ops']
    if b.get('loans') is not None and all(ops.get(x) is not None for x in ('loansMX', 'loansPE', 'loansCC')):
        ops['loansOther'] = b['loans'] - ops['loansMX'] - ops['loansPE'] - ops['loansCC']
    return q


HEAD_CHECK = [('is', 'intInc'), ('is', 'netInc'), ('is', 'opex'), ('bs', 'loans'), ('bs', 'totAssets'), ('bs', 'totEq')]


def merge(base, new):
    """new values override base; base fills gaps (used for seed + parsed and for own release + comparative)."""
    out = {'is': dict(base.get('is', {})), 'bs': dict(base.get('bs', {})), 'ops': dict(base.get('ops', {})), 'kpi': dict(base.get('kpi', {})), 'shares': new.get('shares') or base.get('shares'), 'sources': dict(base.get('sources', {}))}
    for blk in ('is', 'bs', 'ops', 'kpi'):
        out[blk].update({k: v for k, v in new.get(blk, {}).items() if v is not None})
    out['sources'].update(new.get('sources', {}))
    return out


def main():
    LOG['generatedAt'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    seed = json.load(open(SEED, encoding='utf-8'))
    shares_hist = sorted([(('20%s' % r['q'][2:] + 'Q' + r['q'][0]), r.get('shares')) for r in seed['quarters'] if r.get('shares')])
    quarters, seeds = {}, {}
    for r in seed['quarters']:
        qid = '20%s' % r['q'][2:] + 'Q' + r['q'][0]
        s = seed_quarter(r)
        s['sources'] = {'is': {'url': IR_PAGE, 'title': 'Press release %s (seed transcription)' % r['q'], 'date': None, 'page': 8, 'seed': True},
                        'bs': {'url': IR_PAGE, 'title': 'Press release %s (seed transcription)' % r['q'], 'date': None, 'page': 8, 'seed': True}}
        s['origin'] = 'seed'
        quarters[qid] = s; seeds[qid] = s
    # parse every release; collect candidates per quarter (own release first, then comparatives, newest first)
    parsed = {}
    for path in sorted(glob.glob(os.path.join(TXT, '*.txt'))):
        rid = os.path.basename(path)[:6]
        if not re.match(r'20\d\dQ[1-4]$', rid):
            continue
        txt = open(path, encoding='utf-8').read()
        url = (re.search(r'^SOURCE: (\S+)', txt, re.M) or [None, IR_PAGE])[1]
        anchor = (re.search(r'^ANCHOR: (.*)$', txt, re.M) or [None, ''])[1]
        if 'presentaci' in norm(anchor):
            warn('%s: file is a presentation, not the press release (%s); skipped' % (rid, anchor.strip())); continue
        try:
            got = parse_release(rid, txt, url)
        except Exception as e:  # noqa: BLE001
            warn('%s: parser error %s' % (rid, e)); continue
        own = got.get(rid, {})
        if not own.get('cons') or not own['cons']['is'] or not own['cons']['bs']:
            warn('%s: consolidated statements not recognised in %s (entities found: %s)' % (rid, os.path.basename(path), sorted(k for k in own if k != 'source'))); continue
        for q, blocks in got.items():
            parsed.setdefault(q, []).append((q == rid, rid, blocks))
    for q, cands in parsed.items():
        cands.sort(key=lambda c: (not c[0], c[1]), reverse=False)
        cands = sorted(cands, key=lambda c: (0 if c[0] else 1, c[1] if c[0] else ''.join(chr(255 - ord(ch)) for ch in c[1])))
        for own, rid, blocks in cands:
            cons = blocks.get('cons')
            if not cons:
                continue
            ok_is, ok_bs = is_ties(cons['is']), bs_ties(cons['bs'])
            if not (ok_is and ok_bs):
                if own: warn('%s: own release parsed but did not tie out (IS %s, BS %s)' % (q, 'ok' if ok_is else 'fail', 'ok' if ok_bs else 'fail'))
                continue
            new = from_parsed(blocks)
            src = dict(blocks['source'], page=cons['pages'].get('is'), comparative=(not own))
            new['sources'] = {'is': src, 'bs': dict(src, page=cons['pages'].get('bs'))}
            s = seeds.get(q)
            if s:
                bad = [k for blk, k in HEAD_CHECK if s[blk].get(k) is not None and new[blk].get(k) is not None and abs(s[blk][k] - new[blk][k]) > 3]
                if bad:
                    warn('%s: release %s disagrees with the seed transcription on %s; seed kept' % (q, rid, bad)); continue
                merged = merge(s, new); merged['sources'] = new['sources']
            else:
                merged = merge(quarters.get(q, {}), new) if quarters.get(q, {}).get('origin') == 'comparative' and not own else new
                if not merged.get('shares'):
                    # shares outstanding are known from the seed history (1Q22 on); earlier quarters carry none,
                    # so their EPS and book value per share stay null rather than using a wrong count
                    prior = [sh for qq, sh in shares_hist if qq <= q]
                    merged['shares'] = prior[-1] if prior else None
            merged['origin'] = 'release' if own else 'comparative'
            quarters[q] = merged
            (LOG['parsed'] if own else LOG['comparative']).append(q)
            if own:
                break
    for q, e in quarters.items():
        if e.get('origin') == 'seed': LOG['seed'].append(q)
        LOG['quarters'][q] = e.get('origin')
    # derive, order, YTD, FY
    ids = sorted(quarters)
    out_q, prev_loans = [], None
    for qid in ids:
        e = quarters[qid]
        fy, q = qid_parts(qid)
        if qid == '2022Q1' and prev_loans is None:
            prev_loans = seed.get('loans4Q21')
        pq = quarters.get(prev_q(qid))
        if pq and pq['bs'].get('loans') is not None:
            prev_loans = pq['bs']['loans']
        elif quarters.get(prev_q(qid)) is None and qid != '2022Q1':
            prev_loans = None
        e = derive(e, prev_loans)
        out_q.append({'id': qid, 'fy': fy, 'q': q, 'label': label_q(qid), 'is': e['is'], 'bs': e['bs'], 'ops': e['ops'], 'kpi': e['kpi'], 'shares': {'current': e.get('shares')}, 'sources': e['sources'], 'origin': e.get('origin')})
    byid = {x['id']: x for x in out_q}
    flows = ['intInc', 'intExp', 'fundExp', 'origExp', 'finMargin', 'prov', 'finMarginAdj', 'feesCh', 'feesPd', 'netFees', 'trading', 'otherInc', 'otherTot', 'totOpInc', 'opIncAfterProv', 'opex', 'opRes', 'assoc', 'ibt', 'tax', 'discontinued', 'netInc', 'niCtrl', 'niMin', 'oci', 'compInc', 'niMX', 'niPE', 'niCC', 'niOther', 'fmMX', 'fmPE', 'fmCC', 'iiMX', 'iiPE', 'iiCC', 'writeoffs', 'woMX', 'woPE', 'woCC']

    def aggregate(qs, label, months):
        last = qs[-1]
        i = {}
        for k in flows:
            vals = [x['is'].get(k) for x in qs]
            if k in ('assoc', 'discontinued'):
                if any(v is not None for v in vals): i[k] = sum(v or 0 for v in vals)
            elif all(v is not None for v in vals): i[k] = sum(vals)
        n = len(qs); an = 4 / n
        opening = byid.get(prev_q(qs[0]['id']))
        bals = ([opening] if opening else []) + qs
        avg = lambda f: (sum(f(x) for x in bals) / len(bals)) if bals and all(f(x) is not None for x in bals) else None
        avgL = avg(lambda x: x['bs'].get('loans'))
        if avgL is None or (not opening and qs[0]['id'] == '2022Q1' and seed.get('loans4Q21')):
            if qs[0]['id'] == '2022Q1' and seed.get('loans4Q21') and all(x['bs'].get('loans') is not None for x in qs):
                avgL = (seed['loans4Q21'] + sum(x['bs']['loans'] for x in qs)) / (n + 1)
        avgA, avgE, avgEc = avg(lambda x: x['bs'].get('totAssets')), avg(lambda x: x['bs'].get('totEq')), avg(lambda x: x['bs'].get('eqCtrl'))
        k = {}
        if avgL:
            if i.get('prov') is not None: k['cor'] = i['prov'] * an / avgL * 100
            if i.get('intInc') is not None: k['yieldCalc'] = i['intInc'] * an / avgL * 100
            k['avgLoans'] = avgL
        if i.get('opex') is not None and i.get('opIncAfterProv'): k['effCalc'] = i['opex'] / i['opIncAfterProv'] * 100; k['effPre'] = i['opex'] / i['totOpInc'] * 100
        if avgA and i.get('opex') is not None: k['efficOp'] = i['opex'] * an / avgA * 100
        if avgA and i.get('netInc') is not None: k['roa'] = i['netInc'] * an / avgA * 100
        if avgE and i.get('netInc') is not None: k['roe'] = i['netInc'] * an / avgE * 100
        if avgEc and i.get('niCtrl') is not None: k['roeCtrl'] = i['niCtrl'] * an / avgEc * 100
        if i.get('tax') is not None and i.get('ibt'): k['taxRate'] = i['tax'] / i['ibt'] * 100
        nims = [x['kpi'].get('nim') for x in qs]
        if all(v is not None for v in nims): k['nim'] = sum(nims) / n
        nimsA = [x['kpi'].get('nimAdj') for x in qs]
        if all(v is not None for v in nimsA): k['nimAdj'] = sum(nimsA) / n
        sh = last['shares']['current']
        if sh and i.get('niCtrl') is not None: k['eps'] = i['niCtrl'] / sh
        for pk in ('coverage', 'bvps', 'npl', 'nplCalc', 'leverage', 'loansToDeposits', 'eqAssets', 'coverageRep', 'capAssets'):
            if last['kpi'].get(pk) is not None: k[pk] = last['kpi'][pk]
        return {'id': label, 'fy': last['fy'], 'q': last['q'], 'months': months, 'label': label, 'covers': [x['id'] for x in qs], 'is': i, 'bs': last['bs'], 'ops': last['ops'], 'kpi': k, 'shares': last['shares'], 'sources': last['sources'], 'derived': True}

    ytd, years = [], []
    for x in out_q:
        if x['q'] == 1: continue
        qs = [byid.get('%dQ%d' % (x['fy'], i)) for i in range(1, x['q'] + 1)]
        if any(y is None or y['is'].get('netInc') is None for y in qs): continue
        ytd.append(aggregate(qs, '%dM%s' % (x['q'] * 3, str(x['fy'])[2:]), x['q'] * 3))
        if x['q'] == 4:
            y = aggregate(qs, 'FY%d' % x['fy'], 12); y['id'] = 'FY%d' % x['fy']; years.append(y)
    monthly = json.load(open(REG, encoding='utf-8')) if os.path.exists(REG) else {'cnbv': {'series': [], 'note': 'not fetched yet'}, 'sbs': {'series': [], 'note': 'not fetched yet'}}
    monthly.pop('log', None)

    layout = build_layout()
    fin = {'generatedAt': LOG['generatedAt'], 'unit': 'MXN millions', 'layout': layout, 'quarters': out_q, 'ytd': ytd, 'years': years,
           'notes': {'seed': seed['note'], 'coverage': seed['coverageRepNote'], 'loans4Q21': seed.get('loans4Q21')}}
    ops = {'generatedAt': LOG['generatedAt'], 'quarters': [{'id': x['id'], 'fy': x['fy'], 'q': x['q'], 'label': x['label'], **x['ops'], 'loans': x['bs'].get('loans'), 'loans3': x['bs'].get('loans3'), 'allow': x['bs'].get('allow'),
                                                          'writeoffs': x['is'].get('writeoffs'), 'woMX': x['is'].get('woMX'), 'woPE': x['is'].get('woPE'), 'woCC': x['is'].get('woCC'),
                                                          'niMX': x['is'].get('niMX'), 'niPE': x['is'].get('niPE'), 'niCC': x['is'].get('niCC'), 'fmMX': x['is'].get('fmMX'), 'fmPE': x['is'].get('fmPE'), 'fmCC': x['is'].get('fmCC'),
                                                          'iiMX': x['is'].get('iiMX'), 'iiPE': x['is'].get('iiPE'), 'iiCC': x['is'].get('iiCC'), 'taMX': x['bs'].get('taMX'), 'taPE': x['bs'].get('taPE'), 'taCC': x['bs'].get('taCC'),
                                                          'eqMX': x['bs'].get('eqMX'), 'eqPE': x['bs'].get('eqPE'), 'eqCC': x['bs'].get('eqCC'), 'source': x['sources'].get('is')} for x in out_q],
           'monthly': monthly}
    os.makedirs(OUT_DIR, exist_ok=True)
    write_js('financials.js', 'G_FIN', fin, 'consolidated statements, ratios, derived YTD and fiscal years')
    write_js('operations.js', 'G_OPS', ops, 'loan book, clients, asset quality, funding and capital by subsidiary; monthly regulator series')
    write_js('quality.js', 'G_QUALITY', LOG, 'parse log and warnings (read by quality.html)')
    print('build_data: %d quarters (%d parsed, %d comparative, %d seed), %d YTD, %d FY, %d warnings' % (len(out_q), len(LOG['parsed']), len(LOG['comparative']), len(LOG['seed']), len(ytd), len(years), len(LOG['warnings'])))


def write_js(name, glob_name, obj, what):
    path = os.path.join(OUT_DIR, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('// AUTO-GENERATED by scripts/gentera/build_data.py — do not hand-edit. %s.\n// Generated: %s\n' % (what, obj.get('generatedAt')))
        f.write('window.%s = ' % glob_name + json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + ';\n')


def build_layout():
    """Bilingual row definitions rendered by app.js (level 0 = bold total, 1 = line, 2 = detail folded under the
    previous line, kpi = ratio row taken from `kpi`). `page` = where the line sits in a press release."""
    L = lambda k, es, en, **o: dict({'k': k, 'es': es, 'en': en, 'level': 1, 'page': 8}, **o)
    is_rows = [
        L('intInc', 'Ingresos por intereses', 'Interest income', level=0),
        L('iiMX', 'Banco Compartamos (México)', 'Banco Compartamos (Mexico)', level=2, page=14), L('iiPE', 'Compartamos Banco Perú', 'Compartamos Banco Perú', level=2, page=16), L('iiCC', 'ConCrédito', 'ConCrédito', level=2, page=18),
        L('intExp', 'Gastos por intereses', 'Interest expense'),
        L('fundExp', 'de los cuales, gastos por financiamiento', 'of which funding cost', level=2), L('origExp', 'de los cuales, costos de originación y arrendamiento', 'of which loan-origination cost and lease interest', level=2),
        L('finMargin', 'Margen financiero', 'Financial margin (net interest income)', level=0),
        L('nim', 'MIN (Gentera, sobre activos productivos)', 'NIM (Gentera, on productive assets)', kpi=True, pct=True, page=3),
        L('yieldCalc', 'Tasa activa calculada (intereses anualizados ÷ cartera bruta promedio)', 'Portfolio yield, computed (annualised interest ÷ average gross loans)', kpi=True, pct=True, page=None),
        L('prov', 'Estimación preventiva para riesgos crediticios', 'Loan-loss provisions'),
        L('cor', 'Costo de riesgo (provisiones anualizadas ÷ cartera bruta promedio)', 'Cost of risk (annualised provisions ÷ average gross loans)', kpi=True, pct=True, page=4),
        L('finMarginAdj', 'Margen financiero ajustado por riesgos crediticios', 'Financial margin after provisions', level=0),
        L('nimAdj', 'MIN después de provisiones (Gentera)', 'NIM after provisions (Gentera)', kpi=True, pct=True, page=3),
        L('feesCh', 'Comisiones y tarifas cobradas', 'Fees and commissions charged'),
        L('feesPd', 'Comisiones y tarifas pagadas', 'Fees and commissions paid'),
        L('netFees', 'Comisiones netas', 'Net fee income', bold=True),
        L('trading', 'Resultado por intermediación', 'Trading result'),
        L('otherInc', 'Otros ingresos (egresos) de la operación', 'Other operating income (expense)'),
        L('totOpInc', 'Ingresos totales de la operación antes de provisiones (derivado)', 'Total operating income before provisions (derived)', level=0, page=None),
        L('opIncAfterProv', 'Ingresos de la operación después de provisiones (derivado)', 'Operating income after provisions (derived)', level=0, page=None),
        L('opex', 'Gastos de administración y promoción', 'Administrative and promotional expenses'),
        L('effCalc', 'Índice de eficiencia (gastos ÷ ingresos después de provisiones)', 'Efficiency ratio (opex ÷ income after provisions)', kpi=True, pct=True, page=3),
        L('effPre', 'Gastos ÷ ingresos antes de provisiones (calculado)', 'Opex ÷ pre-provision income (computed)', kpi=True, pct=True, page=None),
        L('efficOp', 'Eficiencia operativa (gastos ÷ activos promedio)', 'Operating efficiency (opex ÷ average assets)', kpi=True, pct=True, page=3),
        L('opRes', 'Resultado de la operación', 'Operating result', level=0),
        L('assoc', 'Participación en el resultado de asociadas', 'Share of profit of associates'),
        L('ibt', 'Resultado antes de impuestos', 'Income before taxes', bold=True),
        L('tax', 'Impuestos a la utilidad', 'Income taxes'),
        L('discontinued', 'Resultado de operaciones discontinuadas', 'Result of discontinued operations'),
        L('taxRate', 'Tasa efectiva de impuestos', 'Effective tax rate', kpi=True, pct=True, page=None),
        L('netInc', 'Resultado neto', 'Net income', level=0),
        L('niMX', 'Banco Compartamos (México)', 'Banco Compartamos (Mexico)', level=2, page=14), L('niPE', 'Compartamos Banco Perú', 'Compartamos Banco Perú', level=2, page=16), L('niCC', 'ConCrédito', 'ConCrédito', level=2, page=18), L('niOther', 'Tenedora, Yastás, Aterna y otros (residual)', 'Holding, Yastás, Aterna and other (residual)', level=2, page=None),
        L('roa', 'ROAA', 'ROAA', kpi=True, pct=True, page=3), L('roe', 'ROAE', 'ROAE', kpi=True, pct=True, page=3),
        L('niCtrl', 'Participación controladora', 'Net income, controlling interest', bold=True),
        L('niMin', 'Participación no controladora', 'Net income, non-controlling interest', level=2),
        L('oci', 'Otros resultados integrales', 'Other comprehensive income', level=2),
        L('compInc', 'Resultado integral', 'Comprehensive income', level=2),
        L('roeCtrl', 'ROAE, participación controladora', 'ROAE, controlling', kpi=True, pct=True, page=3),
        L('eps', 'Utilidad por acción, controladora (Ps.)', 'EPS, controlling (Ps.)', kpi=True, perShare=True, page=None),
    ]
    bs_rows = [
        L('cash', 'Efectivo e inversiones en instrumentos financieros', 'Cash and investments in financial instruments'),
        L('loans12', 'Cartera de crédito etapa 1 y 2 (vigente antes de 2022)', 'Gross loans, stage 1 and 2 (performing before 2022)'), L('loans3', 'Cartera de crédito etapa 3 (vencida antes de 2022)', 'Gross loans, stage 3 (non-performing before 2022)'),
        L('loans', 'Cartera de crédito total', 'Gross loan portfolio', level=0),
        L('loansMX', 'Banco Compartamos (México)', 'Banco Compartamos (Mexico)', level=2, page=14, ops=True), L('loansPE', 'Compartamos Banco Perú', 'Compartamos Banco Perú', level=2, page=16, ops=True), L('loansCC', 'ConCrédito', 'ConCrédito', level=2, page=18, ops=True), L('loansOther', 'Otros (Yastás)', 'Other (Yastás)', level=2, page=None, ops=True),
        L('deferred', 'Partidas diferidas de cartera (neto)', 'Deferred loan items (net)'), L('allow', 'Estimación preventiva para riesgos crediticios', 'Loan-loss allowance'),
        L('loansNet', 'Cartera de crédito neta', 'Net loan portfolio', bold=True),
        L('otherRec', 'Otras cuentas por cobrar', 'Other receivables'), L('ppe', 'Propiedades, mobiliario y equipo', 'Property and equipment'), L('permInv', 'Inversiones permanentes', 'Permanent investments'), L('dta', 'Impuestos a la utilidad diferidos', 'Deferred tax assets'), L('otherAssets', 'Otros activos (incl. derechos de uso)', 'Other assets (incl. right-of-use)'), L('goodwill', 'Crédito mercantil', 'Goodwill'),
        L('totAssets', 'Total activo', 'Total assets', level=0),
        L('deposits', 'Captación tradicional', 'Customer deposits'), L('depInst', 'Captación de instituciones', 'Institutional deposits'), L('debtSec', 'Títulos de crédito emitidos (certificados bursátiles)', 'Debt securities issued'), L('bankLoans', 'Préstamos interbancarios y de otros organismos', 'Bank and development-bank loans'), L('securit', 'Obligaciones en operaciones de bursatilización', 'Securitisation obligations'), L('leaseLiab', 'Pasivos por arrendamiento', 'Lease liabilities'), L('otherLiab', 'Otros pasivos', 'Other liabilities'), L('defCred', 'Créditos diferidos', 'Deferred credits'),
        L('totLiab', 'Total pasivo', 'Total liabilities', level=0),
        L('capSoc', 'Capital social', 'Share capital', level=2), L('prima', 'Prima en venta de acciones', 'Share premium', level=2), L('reserves', 'Reservas de capital', 'Capital reserves', level=2), L('retained', 'Resultados acumulados', 'Retained earnings', level=2), L('ociAcc', 'Otros resultados integrales acumulados', 'Accumulated other comprehensive income', level=2),
        L('eqCtrl', 'Capital contable, participación controladora', 'Equity, controlling interest', bold=True), L('eqMin', 'Participación no controladora', 'Non-controlling interest'),
        L('totEq', 'Total capital contable', "Total stockholders' equity", level=0),
        L('eqAssets', 'Capital ÷ activos', 'Equity ÷ assets', kpi=True, pct=True, page=None), L('leverage', 'Pasivo ÷ capital (x)', 'Liabilities ÷ equity (x)', kpi=True, x=True, page=None), L('loansToDeposits', 'Cartera ÷ captación (x)', 'Loans ÷ deposits (x)', kpi=True, x=True, page=None), L('bvps', 'Valor en libros por acción, controladora (Ps.)', 'Book value per share, controlling (Ps.)', kpi=True, perShare=True, page=None),
    ]
    kpi_rows = [
        L('npl', 'Índice de cartera etapa 3 (reportado)', 'Stage-3 ratio (reported)', kpi=True, pct=True, page=3), L('coverage', 'Cobertura: estimación ÷ cartera etapa 3 (recalculada)', 'Coverage: allowance ÷ stage-3 loans (recomputed)', kpi=True, pct=True, page=None),
        L('coverageRep', 'Cobertura como se imprimió en cada informe', 'Coverage as printed in each release', kpi=True, pct=True, page=3), L('capAssets', 'Capital ÷ activos (Gentera)', 'Equity ÷ assets (Gentera)', kpi=True, pct=True, page=3),
    ]
    return {'is': is_rows, 'bs': bs_rows, 'kpi': kpi_rows}


if __name__ == '__main__':
    main()
