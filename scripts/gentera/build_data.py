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

Sources, in order of precedence for every quarter:
  1. The quarter's own press release (Spanish PDF converted to text by harvest.py). Figures are accepted only
     when the statement identities tie out (financial margin = interest income − interest expense; margin
     after provisions; operating result; net income = operating result − taxes ± associates; assets =
     liabilities + equity). A release that parses but does not tie out is logged and ignored.
  2. The comparative column of a later release (the same quarter printed as "year-ago" or "prior quarter").
  3. The seed dataset (hand-transcribed from the same releases, 1Q22–2Q26).
Amounts in MILLIONS of pesos as Gentera reports them; ratios in %.

Recomputed for every quarter (the page shows these next to the reported figures):
  coverage      = allowance / stage-3 loans (Gentera's definition since the 4Q25 release; earlier releases used a
                  different denominator, so the printed figure is kept as coverageRep)
  cor           = annualised provisions / average gross loans (start and end of period)
  yieldCalc     = annualised interest income / average gross loans
  effCalc       = opex / (margin after provisions + net fees + trading + other)  (Gentera's efficiency ratio)
  effPre        = opex / (financial margin + net fees + trading + other)
  eps, bvps     = controlling net income / shares, controlling equity / shares

Usage: python scripts/gentera/build_data.py
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
LOG = {'quarters': {}, 'warnings': [], 'parsed': [], 'seed': [], 'comparative': [], 'generatedAt': None}


def warn(msg):
    LOG['warnings'].append(msg)
    print('WARN ' + msg)


# ----------------------------------------------------------------------------- helpers
def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+', ' ', s).strip()


NUM = re.compile(r'\(?-?\$?\s?\d[\d,]*(?:\.\d+)?%?\)?')


def nums(line):
    """Numeric tokens on a line as (value, is_pct). '(1,234)' and '-1,234' are negative; 'n.a.' is skipped."""
    out = []
    for m in NUM.finditer(line):
        raw = m.group(0)
        pct = raw.rstrip(')').endswith('%')
        neg = raw.startswith('(') or raw.startswith('-') or raw.startswith('(-')
        s = re.sub(r'[^\d.]', '', raw)
        if not s or s == '.':
            continue
        try:
            v = float(s)
        except ValueError:
            continue
        out.append((-v if neg else v, pct))
    return out


QTOK = re.compile(r'\b([1-4])\s*[TQ]\s*(\d{2})\b')


def qid_of(tok):
    m = QTOK.search(tok.upper())
    return '20%s' % m.group(2) + 'Q' + m.group(1) if m else None


def qid_parts(qid):
    return int(qid[:4]), int(qid[5])


def prev_q(qid):
    fy, q = qid_parts(qid)
    return '%dQ%d' % (fy - 1, 4) if q == 1 else '%dQ%d' % (fy, q - 1)


def yoy_q(qid):
    fy, q = qid_parts(qid)
    return '%dQ%d' % (fy - 1, q)


# ----------------------------------------------------------------------------- release parsing
# Each template row: (key, regex on the normalised label). The releases print the current quarter next to the
# year-ago and prior quarter (and % changes); the column order is read from the nearest header line that
# carries quarter ids like "2T26 2T25 1T26" (or "2Q26 …" in the English version).
IS_TPL = [
    ('intInc', r'^ingresos por intereses'),
    ('intExp', r'^gastos por intereses'),
    ('finMargin', r'^margen financiero$'),
    ('prov', r'^estimacion preventiva para riesgos crediticios'),
    ('finMarginAdj', r'^margen financiero ajustado'),
    ('feesCh', r'^comisiones y tarifas cobradas'),
    ('feesPd', r'^comisiones y tarifas pagadas'),
    ('trading', r'^resultado por intermediacion'),
    ('otherInc', r'^otros ingresos \(egresos\) de la operacion'),
    ('opex', r'^gastos de administracion y promocion'),
    ('opRes', r'^resultado de la operacion'),
    ('assoc', r'^participacion en el resultado (neto )?de (otras entidades|asociadas)'),
    ('ibt', r'^resultado antes de impuestos'),
    ('tax', r'^impuestos a la utilidad(?! diferidos| causados)'),
    ('netInc', r'^resultado neto$'),
    ('niCtrl', r'^participacion controladora'),
    ('niMin', r'^participacion no controladora'),
]
BS_TPL = [
    ('cash', r'^(efectivo y equivalentes de efectivo|disponibilidades)'),
    ('loans12', r'^cartera de credito (total )?(con riesgo de credito )?etapa 1 y 2'),
    ('loans3', r'^cartera de credito (total )?(con riesgo de credito )?etapa 3'),
    ('loans', r'^cartera de credito (total|bruta)$'),
    ('allow', r'^estimacion preventiva para riesgos crediticios'),
    ('loansNet', r'^cartera de credito neta'),
    ('goodwill', r'^credito mercantil'),
    ('dta', r'^impuestos a la utilidad diferidos'),
    ('totAssets', r'^total activo'),
    ('deposits', r'^captacion tradicional'),
    ('bankLoans', r'^prestamos interbancarios'),
    ('leaseLiab', r'^pasivos por arrendamiento'),
    ('totLiab', r'^total pasivo'),
    ('eqCtrl', r'^participacion controladora'),
    ('eqMin', r'^participacion no controladora'),
    ('totEq', r'^total capital contable'),
]
IND_TPL = [  # "Indicadores consolidados" page (values in %, counts, or Ps. millions)
    ('clientsCred', r'^clientes (de credito|activos)'),
    ('loans', r'^cartera (de credito )?total'),
    ('netInc', r'^resultado neto'),
    ('npl', r'^(indice de )?cartera (vencida|etapa 3)|^imor'),
    ('roa', r'^roa'),
    ('roe', r'^roe$|^roae$'),
    ('nim', r'^(min|margen de interes neto|nim)( \(?[^)]*\)?)?$'),
    ('nimAdj', r'^(min|nim) (despues de|ajustado por) (provisiones|riesgos)'),
    ('effic', r'^(indice de )?eficiencia$'),
    ('efficOp', r'^eficiencia operativa'),
    ('coverageRep', r'^(indice de )?cobertura'),
    ('capAssets', r'^capital ?/ ?activos'),
    ('avgBal', r'^saldo promedio'),
    ('employees', r'^(colaboradores|empleados)'),
    ('offices', r'^oficinas de servicio'),
    ('cor', r'^costo de riesgo'),
]


def header_columns(line):
    """Quarter ids in the order they appear on a header line, e.g. '2T26 2T25 1T26' -> ['2026Q2','2025Q2','2026Q1']."""
    ids = []
    for m in QTOK.finditer(line.upper()):
        ids.append('20%s' % m.group(2) + 'Q' + m.group(1))
    return ids


def parse_block(lines, tpl, this_q):
    """Walk a page's lines; the latest header with quarter ids fixes the column order. Returns
    {qid: {key: value}} for every quarter column found."""
    cols = None
    out = {}
    for line in lines:
        ids = header_columns(line)
        if len(ids) >= 2 and this_q in ids:
            cols = ids
            continue
        if not cols:
            continue
        label = norm(re.split(r'\s(?=\(?-?\$?\s?\d)', line, maxsplit=1)[0])
        label = re.sub(r'[\d,.()%$-]+$', '', label).strip()
        for key, rx in tpl:
            if re.search(rx, label):
                vals = [v for v, pct in nums(line) if not pct]
                if len(vals) < len(cols):
                    break
                for qid, v in zip(cols, vals[:len(cols)]):
                    out.setdefault(qid, {})[key] = v
                break
    return out


def pages_of(txt):
    parts = re.split(r'=== PAGE (\d+) ===\n', txt)
    pages = {}
    for i in range(1, len(parts), 2):
        pages[int(parts[i])] = parts[i + 1]
    return pages


def release_date(txt):
    """'Ciudad de México, 22 de julio de 2026' style date in the first page -> ISO date."""
    t = norm(txt[:6000])
    m = re.search(r'(\d{1,2}) de (%s) de (20\d\d)' % '|'.join(MONTHS_ES), t)
    if m:
        return '%s-%02d-%02d' % (m.group(3), MONTHS_ES[m.group(2)], int(m.group(1)))
    return None


def parse_release(qid, txt, url):
    """Returns {qid: {'is':{}, 'bs':{}, 'ind':{}}} for the quarter and any comparative quarters the release
    prints. Pages are scanned by content, not by fixed page number, so a layout change moves nothing."""
    pages = pages_of(txt)
    res = {}
    for pno, page in sorted(pages.items()):
        n = norm(page[:400])
        lines = page.split('\n')
        blk = None
        if 'estado de resultados' in n or 'estado consolidado de resultados' in n:
            blk = ('is', IS_TPL)
        elif 'balance general' in n or 'estado de situacion financiera' in n:
            blk = ('bs', BS_TPL)
        elif 'indicadores' in n and pno <= 5:
            blk = ('ind', IND_TPL)
        if not blk:
            continue
        got = parse_block(lines, blk[1], qid)
        for q, vals in got.items():
            res.setdefault(q, {'is': {}, 'bs': {}, 'ind': {}, 'pages': {}})[blk[0]].update(vals)
            res[q]['pages'][blk[0]] = pno
    for q in res:
        res[q]['source'] = {'url': url, 'title': 'Press release %s' % label_q(qid), 'date': release_date(txt), 'release': qid}
    return res


def label_q(qid):
    fy, q = qid_parts(qid)
    return '%dT%s' % (q, str(fy)[2:])


# ----------------------------------------------------------------------------- tie-outs
TOL = 3.0  # Ps. millions: the releases print rounded millions, so subtotals can be off by a few units


def is_ties(i):
    g = i.get
    ok = True
    if g('intInc') is not None and g('intExp') is not None and g('finMargin') is not None:
        ok &= abs(g('intInc') - g('intExp') - g('finMargin')) <= TOL
    if g('finMargin') is not None and g('prov') is not None and g('finMarginAdj') is not None:
        ok &= abs(g('finMargin') - g('prov') - g('finMarginAdj')) <= TOL
    if all(g(k) is not None for k in ('finMarginAdj', 'feesCh', 'feesPd', 'opex', 'opRes')):
        ok &= abs(g('finMarginAdj') + g('feesCh') - g('feesPd') + (g('trading') or 0) + (g('otherInc') or 0) - g('opex') - g('opRes')) <= TOL
    if g('opRes') is not None and g('tax') is not None and g('netInc') is not None:
        ok &= abs(g('opRes') + (g('assoc') or 0) + (g('discontinued') or 0) - g('tax') - g('netInc')) <= TOL
    return bool(ok)


def bs_ties(b):
    g = b.get
    ok = True
    if all(g(k) is not None for k in ('totAssets', 'totLiab', 'totEq')):
        ok &= abs(g('totLiab') + g('totEq') - g('totAssets')) <= TOL
    if all(g(k) is not None for k in ('loans12', 'loans3', 'loans')):
        ok &= abs(g('loans12') + g('loans3') - g('loans')) <= TOL
    return bool(ok)


# ----------------------------------------------------------------------------- assemble quarters
IS_KEYS = ['intInc', 'intExp', 'fundExp', 'origExp', 'finMargin', 'prov', 'finMarginAdj', 'feesCh', 'feesPd', 'trading', 'otherInc', 'opex', 'opRes', 'ibt', 'tax', 'netInc', 'niCtrl', 'niMin', 'oci', 'compInc', 'niMX', 'niPE', 'niCC', 'fmMX', 'fmPE', 'fmCC', 'iiMX', 'iiPE', 'iiCC', 'writeoffs', 'woPE', 'woCC']
BS_KEYS = ['cash', 'loans12', 'loans3', 'loans', 'deferred', 'allow', 'loansNet', 'otherRec', 'ppe', 'permInv', 'dta', 'otherAssets', 'goodwill', 'totAssets', 'deposits', 'debtSec', 'bankLoans', 'securit', 'leaseLiab', 'otherLiab', 'defCred', 'totLiab', 'capSoc', 'prima', 'reserves', 'retained', 'ociAcc', 'eqCtrl', 'eqMin', 'totEq', 'taMX', 'taPE', 'taCC', 'eqMX', 'eqPE', 'eqCC']
OPS_KEYS = ['clientsCred', 'clientsTot', 'clientsMX', 'clientsPE', 'usersCC', 'empresarias', 'loansMX', 'loansPE', 'loansCC', 'avgBal', 'employees', 'offices', 'branches', 'npl', 'nplMX', 'nplPE', 'nplCC', 's3MX', 's3PE', 's3CC', 'cofMX', 'cofPE', 'icap', 'solvPE', 'yieldDisc', 'nimMX', 'nimPE', 'nimCC']
REP_KPI = ['nim', 'nimAdj', 'effic', 'efficOp', 'roa', 'roe', 'roeCtrl', 'npl', 'coverageRep', 'capAssets', 'corDisc', 'epsDisc']


def seed_quarter(r):
    """Split a seed record (flat, old field names) into the model's blocks."""
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


def derive(q, prev_loans):
    i, b, k = q['is'], q['bs'], q['kpi']
    i['netFees'] = (i.get('feesCh') or 0) - (i.get('feesPd') or 0) if i.get('feesCh') is not None else None
    i['otherTot'] = (i.get('trading') or 0) + (i.get('otherInc') or 0) if i.get('otherInc') is not None else None
    if i.get('finMargin') is not None and i.get('netFees') is not None and i.get('otherTot') is not None:
        i['totOpInc'] = i['finMargin'] + i['netFees'] + i['otherTot']
        i['opIncAfterProv'] = i['totOpInc'] - (i.get('prov') or 0)
    if i.get('netInc') is not None and all(i.get(x) is not None for x in ('niMX', 'niPE', 'niCC')):
        i['niOther'] = i['netInc'] - i['niMX'] - i['niPE'] - i['niCC']
    if i.get('writeoffs') is not None and i.get('woPE') is not None and i.get('woCC') is not None:
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
        # Net income above (income before tax − tax) beyond rounding = result of discontinued operations
        # (3Q22: Ps. 180 M gain). Kept as its own line so the identity ties and the page can show it.
        if i.get('netInc') is not None and i.get('discontinued') is None:
            gap = i['netInc'] - (i['ibt'] - i['tax'])
            if abs(gap) > 3: i['discontinued'] = round(gap, 1)
    sh = q.get('shares')
    if sh:
        if i.get('niCtrl') is not None: k['eps'] = i['niCtrl'] / sh
        if b.get('eqCtrl') is not None: k['bvps'] = b['eqCtrl'] / sh
    if b.get('totLiab') is not None and b.get('totEq'):
        k['leverage'] = b['totLiab'] / b['totEq']
    if b.get('loans') is not None and b.get('deposits'):
        k['loansToDeposits'] = b['loans'] / b['deposits']
    if b.get('totEq') is not None and b.get('totAssets'):
        k['eqAssets'] = b['totEq'] / b['totAssets'] * 100
    if b.get('loans3') is not None and b.get('loans'):
        k['nplCalc'] = b['loans3'] / b['loans'] * 100
    ops = q['ops']
    if b.get('loans') is not None and all(ops.get(x) is not None for x in ('loansMX', 'loansPE', 'loansCC')):
        ops['loansOther'] = b['loans'] - ops['loansMX'] - ops['loansPE'] - ops['loansCC']
    return q


def main():
    LOG['generatedAt'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    seed = json.load(open(SEED, encoding='utf-8'))
    manifest = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {'items': {}}
    quarters = {}
    # 1. seed
    for r in seed['quarters']:
        qid = '20%s' % r['q'][2:] + 'Q' + r['q'][0]
        quarters[qid] = seed_quarter(r)
        quarters[qid]['sources'] = {'is': {'url': IR_PAGE, 'title': 'Press release %s (seed transcription)' % r['q'], 'date': None, 'page': 8, 'seed': True},
                                    'bs': {'url': IR_PAGE, 'title': 'Press release %s (seed transcription)' % r['q'], 'date': None, 'page': 8, 'seed': True}}
        quarters[qid]['origin'] = 'seed'
    # 2. parsed releases: own release first, then comparative columns of later releases
    parsed = {}
    for path in sorted(glob.glob(os.path.join(TXT, '*.txt'))):
        qid = os.path.basename(path)[:6]
        if not re.match(r'20\d\dQ[1-4]$', qid):
            continue
        txt = open(path, encoding='utf-8').read()
        url = (re.search(r'^SOURCE: (\S+)', txt, re.M) or [None, IR_PAGE])[1]
        try:
            got = parse_release(qid, txt, url)
        except Exception as e:  # noqa: BLE001
            warn('%s: parser error %s' % (qid, e)); continue
        if not got.get(qid):
            warn('%s: no statement table recognised in %s' % (qid, os.path.basename(path))); continue
        for q, blocks in got.items():
            parsed.setdefault(q, []).append((q == qid, blocks))
    for q, cands in parsed.items():
        cands.sort(key=lambda c: (not c[0], c[1]['source'].get('release') or ''))  # own release first, then oldest comparative
        for own, blocks in cands:
            i, b = blocks['is'], blocks['bs']
            ok_is = bool(i) and is_ties(i); ok_bs = bool(b) and bs_ties(b)
            if not (ok_is or ok_bs):
                warn('%s: release %s parsed but did not tie out (IS %s, BS %s); kept %s' % (q, blocks['source']['release'], 'ok' if ok_is else 'fail', 'ok' if ok_bs else 'fail', quarters.get(q, {}).get('origin', 'nothing')))
                continue
            entry = quarters.setdefault(q, {'is': {}, 'bs': {}, 'ops': {}, 'kpi': {}, 'sources': {}, 'shares': None})
            if ok_is:
                entry['is'].update({k: v for k, v in i.items() if k != 'assoc'})
                if i.get('assoc') is not None: entry['is']['assoc'] = i['assoc']
                entry['sources']['is'] = dict(blocks['source'], page=blocks['pages'].get('is'))
            if ok_bs:
                entry['bs'].update(b); entry['sources']['bs'] = dict(blocks['source'], page=blocks['pages'].get('bs'))
            for k, v in blocks['ind'].items():
                if k in REP_KPI or k == 'cor': entry['kpi']['corDisc' if k == 'cor' else k] = v
                elif k in OPS_KEYS: entry['ops'][k] = v
            entry['origin'] = 'release' if own else 'comparative'
            (LOG['parsed'] if own else LOG['comparative']).append(q)
            break
    for q, e in quarters.items():
        if e.get('origin') == 'seed': LOG['seed'].append(q)
        LOG['quarters'][q] = e.get('origin')
    # 3. derive, order, YTD, FY
    ids = sorted(quarters)
    prev_loans = None
    out_q = []
    for qid in ids:
        e = quarters[qid]
        fy, q = qid_parts(qid)
        if prev_loans is None and qid == ids[0]:
            prev_loans = seed.get('loans4Q21') if qid == '2022Q1' else None
        e = derive(e, prev_loans)
        prev_loans = e['bs'].get('loans') or prev_loans
        out_q.append({'id': qid, 'fy': fy, 'q': q, 'label': label_q(qid), 'is': e['is'], 'bs': e['bs'], 'ops': e['ops'], 'kpi': e['kpi'], 'shares': {'current': e.get('shares')}, 'sources': e['sources'], 'origin': e.get('origin')})
    byid = {x['id']: x for x in out_q}
    flows = ['intInc', 'intExp', 'fundExp', 'origExp', 'finMargin', 'prov', 'finMarginAdj', 'feesCh', 'feesPd', 'netFees', 'trading', 'otherInc', 'otherTot', 'totOpInc', 'opIncAfterProv', 'opex', 'opRes', 'assoc', 'ibt', 'tax', 'discontinued', 'netInc', 'niCtrl', 'niMin', 'oci', 'compInc', 'niMX', 'niPE', 'niCC', 'niOther', 'fmMX', 'fmPE', 'fmCC', 'iiMX', 'iiPE', 'iiCC', 'writeoffs', 'woMX', 'woPE', 'woCC']

    def aggregate(qs, label, months):
        """Sum flows, take the last balance sheet, recompute ratios on averages the way Gentera builds its YTD figures."""
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
        avgL = avg(lambda x: x['bs'].get('loans')) if opening or qs[0]['id'] != '2022Q1' else (sum([seed.get('loans4Q21')] + [x['bs']['loans'] for x in qs]) / (n + 1))
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
        if any(y is None for y in qs): continue
        ytd.append(aggregate(qs, '%dM%s' % (x['q'] * 3, str(x['fy'])[2:]), x['q'] * 3))
        if x['q'] == 4:
            y = aggregate(qs, 'FY%d' % x['fy'], 12); y['id'] = 'FY%d' % x['fy']; years.append(y)
    # regulator monthly series (fetch-regulators.py), optional
    monthly = json.load(open(REG, encoding='utf-8')) if os.path.exists(REG) else {'cnbv': {'series': [], 'note': 'not fetched yet'}, 'sbs': {'series': [], 'note': 'not fetched yet'}}

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
        L('iiMX', 'Banco Compartamos (México)', 'Banco Compartamos (Mexico)', level=2, page=10), L('iiPE', 'Compartamos Banco Perú', 'Compartamos Banco Perú', level=2, page=14), L('iiCC', 'ConCrédito', 'ConCrédito', level=2, page=17),
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
        L('discontinued', 'Resultado de operaciones discontinuadas (derivado)', 'Result of discontinued operations (derived)', page=None),
        L('taxRate', 'Tasa efectiva de impuestos', 'Effective tax rate', kpi=True, pct=True, page=None),
        L('netInc', 'Resultado neto', 'Net income', level=0),
        L('niMX', 'Banco Compartamos (México)', 'Banco Compartamos (Mexico)', level=2, page=10), L('niPE', 'Compartamos Banco Perú', 'Compartamos Banco Perú', level=2, page=14), L('niCC', 'ConCrédito', 'ConCrédito', level=2, page=17), L('niOther', 'Tenedora, Yastás, Aterna y otros (residual)', 'Holding, Yastás, Aterna and other (residual)', level=2, page=None),
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
        L('loans12', 'Cartera de crédito etapa 1 y 2', 'Gross loans, stage 1 and 2'), L('loans3', 'Cartera de crédito etapa 3', 'Gross loans, stage 3'),
        L('loans', 'Cartera de crédito total', 'Gross loan portfolio', level=0),
        L('loansMX', 'Banco Compartamos (México)', 'Banco Compartamos (Mexico)', level=2, page=7, ops=True), L('loansPE', 'Compartamos Banco Perú', 'Compartamos Banco Perú', level=2, page=7, ops=True), L('loansCC', 'ConCrédito', 'ConCrédito', level=2, page=7, ops=True), L('loansOther', 'Otros (Yastás)', 'Other (Yastás)', level=2, page=7, ops=True),
        L('deferred', 'Partidas diferidas de cartera (neto)', 'Deferred loan items (net)'), L('allow', 'Estimación preventiva para riesgos crediticios', 'Loan-loss allowance'),
        L('loansNet', 'Cartera de crédito neta', 'Net loan portfolio', bold=True),
        L('otherRec', 'Otras cuentas por cobrar', 'Other receivables'), L('ppe', 'Propiedades, mobiliario y equipo', 'Property and equipment'), L('permInv', 'Inversiones permanentes', 'Permanent investments'), L('dta', 'Impuestos a la utilidad diferidos', 'Deferred tax assets'), L('otherAssets', 'Otros activos', 'Other assets'), L('goodwill', 'Crédito mercantil', 'Goodwill'),
        L('totAssets', 'Total activo', 'Total assets', level=0),
        L('deposits', 'Captación tradicional', 'Customer deposits'), L('debtSec', 'Títulos de crédito emitidos (certificados bursátiles)', 'Debt securities issued'), L('bankLoans', 'Préstamos interbancarios y de otros organismos', 'Bank and development-bank loans'), L('securit', 'Obligaciones en operaciones de bursatilización', 'Securitisation obligations'), L('leaseLiab', 'Pasivos por arrendamiento', 'Lease liabilities'), L('otherLiab', 'Otros pasivos', 'Other liabilities'), L('defCred', 'Créditos diferidos', 'Deferred credits'),
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
