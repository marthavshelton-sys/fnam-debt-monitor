#!/usr/bin/env python3
"""Tie-out checks for site/gentera/data/financials.js and operations.js, plus the data-health report.

Exit code 1 on any failure so the refresh workflow never commits a data set that does not reconcile.
Tolerance: Ps. 3 million on statement identities (the releases print rounded millions; Ps. 5 M per quarter
summed for year-to-date and fiscal-year columns), 0.3 pp on ratios Gentera also publishes.

Besides printing WARN/FAIL lines, the script rewrites site/gentera/data/quality.js (window.G_QUALITY): the
parse log build_data.py left there (origin of every quarter, warnings) plus every identity evaluated
(ok / warn / fail), the freshness of each series (market, CNBV and SBS monthly, latest quarter vs the results
calendar, reviewing routine), the state of the curated files and the origin table. The hidden owner page
site/gentera/quality.html renders it with the shared renderer site/assets/quality-page.js."""
import json, os, re, sys
from datetime import datetime, timezone, date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'site', 'gentera', 'data')
TODAY = datetime.now(timezone.utc).date()


def load(name):
    t = open(os.path.join(DATA, name), encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


def read_text(name):
    p = os.path.join(DATA, name)
    return open(p, encoding='utf-8').read() if os.path.exists(p) else ''


CHECKS, STALE, CURATED = [], [], []
fails, warns = [], []
TOL = 3.0


def record(tag, check, status, diff=None, tol=None, note=None):
    CHECKS.append({'tag': tag, 'check': check, 'status': status, 'diff': None if diff is None else round(diff, 3), 'tol': tol, 'note': note})
    line = '%s %s%s' % (tag, check, ' (diff %.2f)' % diff if diff is not None else '')
    if status == 'fail': fails.append(line)
    elif status == 'warn': warns.append(line)


def identity(tag, msg, a, b, tol=TOL, soft=False, note=None):
    if a is None or b is None: return
    d = abs(a - b)
    record(tag, msg, 'ok' if d <= tol else ('warn' if soft else 'fail'), d, tol, None if d <= tol else note)


def age_days(iso):
    try: return (TODAY - date.fromisoformat(str(iso)[:10])).days
    except Exception: return None


def stale(series, last_date, limit, note=None):
    a = age_days(last_date) if last_date else None
    STALE.append({'series': series, 'lastDate': last_date, 'ageDays': a, 'limitDays': limit, 'status': 'ok' if limit is None else ('warn' if (a is None or a > limit) else 'ok'), 'note': note})


def curated(name, ok, detail):
    CURATED.append({'file': name, 'status': 'ok' if ok else 'warn', 'detail': detail})


fin = load('financials.js'); ops = load('operations.js')


def check_is(tag, i, n=1):
    """n = number of quarters summed into the period: printed roundings of Ps. ±1 M per line accumulate."""
    g = i.get; tol = TOL if n == 1 else 5.0 * n
    identity(tag, 'IS: interest income − interest expense = financial margin', (g('intInc') or 0) - (g('intExp') or 0), g('finMargin'), tol)
    identity(tag, 'IS: financial margin − provisions = margin after provisions', (g('finMargin') or 0) - (g('prov') or 0), g('finMarginAdj'), tol)
    if all(g(k) is not None for k in ('finMarginAdj', 'feesCh', 'feesPd', 'opex', 'opRes')):
        identity(tag, 'IS: margin after provisions + fees + trading + other − opex = operating result', g('finMarginAdj') + g('feesCh') - g('feesPd') + (g('trading') or 0) + (g('otherInc') or 0) - g('opex'), g('opRes'), tol)
    if g('ibt') is not None and g('tax') is not None:
        identity(tag, 'IS: income before tax − tax + discontinued = net income', g('ibt') - g('tax') + (g('discontinued') or 0), g('netInc'), tol)
    if g('niCtrl') is not None and g('niMin') is not None:
        identity(tag, 'IS: controlling + minority = net income', g('niCtrl') + g('niMin'), g('netInc'), tol)
    if g('fundExp') is not None and g('origExp') is not None:
        identity(tag, 'IS: funding + origination cost = interest expense', g('fundExp') + g('origExp'), g('intExp'), tol, soft=True, note={'es': 'Gentera reparte el costo de fondeo de otra forma en algunos informes', 'en': 'Gentera splits funding cost differently in some releases'})


def check_bs(tag, b):
    g = b.get
    identity(tag, 'BS: liabilities + equity = assets', (g('totLiab') or 0) + (g('totEq') or 0), g('totAssets'))
    identity(tag, 'BS: stage 1 & 2 + stage 3 = gross loans', (g('loans12') or 0) + (g('loans3') or 0), g('loans'))
    if g('loansNet') is not None and g('deferred') is not None:
        identity(tag, 'BS: gross loans + deferred − allowance = net loans', g('loans') + g('deferred') - g('allow'), g('loansNet'))
    if g('eqCtrl') is not None and g('eqMin') is not None:
        identity(tag, 'BS: controlling + minority = total equity', g('eqCtrl') + g('eqMin'), g('totEq'))


def ratio(tag, msg, a, b, tol, note=None):
    if a is None or b is None: return
    d = abs(a - b)
    record(tag, msg, 'ok' if d <= tol else 'warn', d, tol, note if d > tol else None)


for q in fin['quarters']:
    check_is(q['id'], q['is']); check_bs(q['id'], q['bs'])
    k = q['kpi']
    ratio(q['id'], 'KPI: computed cost of risk = disclosed (pp)', k.get('cor'), k.get('corDisc'), 0.3)
    ratio(q['id'], 'KPI: computed EPS = printed EPS (Ps.)', k.get('eps'), k.get('epsDisc'), 0.02)
    ratio(q['id'], 'KPI: stage-3 ratio from balances = reported (pp)', k.get('nplCalc'), k.get('npl'), 0.3, {'es': 'antes de 2022 los informes usan cartera vencida, no etapa 3', 'en': 'releases before 2022 print past-due loans, not stage 3'})
    ratio(q['id'], 'KPI: computed efficiency ratio = reported (pp)', k.get('effCalc'), k.get('effic'), 0.3)
    if q['id'] >= '2025Q4':
        ratio(q['id'], 'KPI: coverage recomputed = printed (pp, same definition from 4Q25)', k.get('coverage'), k.get('coverageRep'), 1.5)
for y in fin['ytd'] + fin['years']:
    check_is(y['id'], y['is'], len(y.get('covers') or [1]))
# YTD/FY = sum of quarters
byid = {q['id']: q for q in fin['quarters']}
for y in fin['ytd'] + fin['years']:
    qs = [byid.get(c) for c in y['covers']]
    if any(x is None for x in qs):
        record(y['id'], 'YTD: every covered quarter present', 'fail', None, None, {'es': 'cubre un trimestre ausente', 'en': 'covers a missing quarter'}); continue
    for key in ('intInc', 'netInc'):
        identity(y['id'], 'YTD: sum of quarters = %s' % key, sum(x['is'].get(key) or 0 for x in qs), y['is'].get(key))
# 12-quarter window continuity
last = fin['quarters'][-1]
for i in range(12):
    fy, qn = last['fy'], last['q'] - i
    while qn <= 0: qn += 4; fy -= 1
    qid = '%dQ%d' % (fy, qn); e = byid.get(qid)
    ok = bool(e and e.get('bs') and e['bs'].get('totAssets') is not None)
    record(qid, 'window: quarter present with a balance sheet', 'ok' if ok else 'fail', None, None, None if ok else {'es': 'trimestre ausente o sin balance', 'en': 'quarter missing or without a balance sheet'})
# operations: subsidiaries vs consolidated loans; stage-3 by subsidiary vs consolidated balance
for e in ops['quarters']:
    if e.get('loans') and all(e.get(k) is not None for k in ('loansMX', 'loansPE', 'loansCC')):
        s = e['loansMX'] + e['loansPE'] + e['loansCC']
        # subsidiaries' own books can exceed the consolidated figure by intercompany eliminations (≈1–3% in 2020–23)
        r = s / e['loans']
        status = 'fail' if r > 1.03 else 'warn' if (r > 1.005 or r < 0.97) else 'ok'
        record(e['id'], 'OPS: subsidiary loans = consolidated loans (±0.5%, eliminations up to 3%)', status, s - e['loans'], round(0.005 * e['loans']), None if status == 'ok' else ({'es': 'eliminaciones intercompañía', 'en': 'intercompany eliminations'} if r > 1 else {'es': 'las subsidiarias suman %.1f%% menos que el consolidado' % (100 * (1 - r)), 'en': 'subsidiaries add up to %.1f%% below consolidated' % (100 * (1 - r))}))
    if e.get('clientsCred') and e.get('clientsTot'):
        record(e['id'], 'OPS: credit clients ≤ people served', 'ok' if e['clientsCred'] <= e['clientsTot'] else 'fail', e['clientsCred'] - e['clientsTot'], 0)
    if e.get('writeoffs') is not None and e.get('woMX') is not None:
        record(e['id'], 'OPS: derived Banco Compartamos write-offs ≥ 0', 'ok' if e['woMX'] >= 0 else 'fail', e['woMX'], 0)
    if e.get('npl') is not None:
        record(e['id'], 'OPS: stage-3 ratio between 0% and 25%', 'ok' if 0 <= e['npl'] < 25 else 'fail', e['npl'], 25)

# ----------------------------------------------------------------------------- data health (never fails the build)
try:
    mk = load('market.js')
    for grp, lim in (('prices', 5), ('fx', 7), ('rates', None), ('dividends', 400)):
        for sid, s in (mk.get(grp) or {}).items():
            pts = s.get('points') or []
            limit = {'MX10Y': 45, 'US10Y': 7}.get(sid, 7) if grp == 'rates' else lim
            label = {'prices': 'price', 'dividends': 'dividends'}.get(grp, grp)
            note = {'es': 'error en la última corrida: %s' % s['error'], 'en': 'error on the last run: %s' % s['error']} if s.get('error') else ({'es': 'último dividendo en efectivo registrado', 'en': 'last recorded cash dividend'} if grp == 'dividends' else None)
            stale('%s %s' % (label, sid), pts[-1][0] if pts else None, limit, note)
    # FactSet closes (the share-price authority since 2026-10-08, nightly cloud routine): every share series (the index stays
    # on Yahoo) must carry them and they must be recent; the oldest FactSet end date is the row's date, a series without them warns
    rows = [(sid, (s.get('provenance') or {}).get('factset'), ((s.get('provenance') or {}).get('fill') or {}).get('after') or []) for sid, s in (mk.get('prices') or {}).items() if sid != '^MXX']
    with_fs = [r for r in rows if r[1]]; without = [r for r in rows if not r[1]]
    oldest = min((r[1]['to'] for r in with_fs), default=None)
    authority = ((mk['prices'][with_fs[0][0]].get('provenance') or {}).get('authority') or 'FactSet') if with_fs else None
    lst = lambda es: ', '.join('%s %s %s%s' % (r[0], 'hasta' if es else 'through', r[1]['to'], (' (+%d %s)' % (len(r[2]), 'sesión(es) de respaldo' if es else 'fallback session(s)')) if r[2] else '') for r in with_fs)
    stale('FactSet closes (market.js)', None if without else oldest, 5, {
        'es': ('%s: %s' % (authority, lst(True)) if with_fs else 'ninguna serie con cierres de FactSet') + ('; SIN FactSet (sólo Yahoo): %s' % ', '.join(r[0] for r in without) if without else ''),
        'en': ('%s: %s' % (authority, lst(False)) if with_fs else 'no series carries FactSet closes') + ('; NO FactSet (Yahoo only): %s' % ', '.join(r[0] for r in without) if without else '')})
except Exception as ex:
    STALE.append({'series': 'market.js', 'lastDate': None, 'ageDays': None, 'limitDays': None, 'status': 'warn', 'note': 'unreadable: %s' % ex})


def month_end(yyyymm):
    y, m = int(yyyymm[:4]), int(yyyymm[4:6])
    return (date(y + (m // 12), m % 12 + 1, 1) - timedelta(days=1)).isoformat()


mo = ops.get('monthly') or {}
for k, name in (('cnbv', 'CNBV monthly (Banco Compartamos)'), ('sbs', 'SBS monthly (Compartamos Financiera)')):
    ser = (mo.get(k) or {}).get('series') or []
    stale(name, month_end(ser[-1]['month']) if ser else None, 60, {'es': 'los reguladores publican unas cinco semanas después del cierre de mes', 'en': 'regulators publish about five weeks after month-end'} if ser else {'es': (mo.get(k) or {}).get('note') or 'sin datos', 'en': (mo.get(k) or {}).get('note') or 'not fetched'})

# latest quarter vs the results calendar: Gentera reports ~3 weeks after quarter-end
def expected_quarter(today):
    qe = [(today.year, 3, 31), (today.year, 6, 30), (today.year, 9, 30), (today.year, 12, 31), (today.year - 1, 12, 31), (today.year - 1, 9, 30), (today.year - 1, 6, 30)]
    for y, m, dd in sorted(qe, reverse=True):
        if (today - date(y, m, dd)).days >= 35:
            return '%dQ%d' % (y, m // 3)
    return None


exp_q = expected_quarter(TODAY)
STALE.append({'series': 'latest quarter (financials.js)', 'lastDate': last['id'], 'ageDays': age_days(((last.get('sources') or {}).get('is') or {}).get('date') or ''), 'limitDays': None,
              'status': 'ok' if last['id'] >= (exp_q or '') else 'warn', 'note': {'es': 'esperado al menos %s por el calendario de resultados' % exp_q, 'en': 'expected at least %s given the results calendar' % exp_q}})
try:
    ns = json.load(open(os.path.join(ROOT, 'tools', 'gentera', 'notify-state.json'), encoding='utf-8'))
    stale('reviewing routine (notify-state.json)', (ns.get('lastCheckedAt') or '')[:10] or None, 3, {'es': 'último aviso %s' % (ns.get('lastNotifiedAt') or '—'), 'en': 'last notification %s' % (ns.get('lastNotifiedAt') or '—')})
except Exception as ex:
    STALE.append({'series': 'reviewing routine (notify-state.json)', 'lastDate': None, 'ageDays': None, 'limitDays': 3, 'status': 'warn', 'note': 'unreadable: %s' % ex})

# BMV eventos relevantes: the shared watcher's fail-safe for filings that never reach the IR site (scripts/lib/bmv-events.mjs)
try:
    _bp = os.path.join(ROOT, 'tools', 'gentera', 'raw', 'bmv-events.json')
    if os.path.exists(_bp):
        bm = json.load(open(_bp, encoding='utf-8'))
        if bm.get('error'):
            _note = {'es': 'error en la última corrida: %s' % bm['error'], 'en': 'error on the last run: %s' % bm['error']}
        else:
            _note = {'es': '%s avisos listados; %s archivados en esta corrida sin documento del sitio de RI' % (bm.get('rows'), bm.get('archived')),
                     'en': '%s notices listed; %s archived on this run with no IR-site document' % (bm.get('rows'), bm.get('archived'))}
        stale('BMV eventos relevantes (bmv-events.json)', (bm.get('checkedAt') or '')[:10] or None, 4, _note)
except Exception as ex:
    STALE.append({'series': 'BMV eventos relevantes (bmv-events.json)', 'lastDate': None, 'ageDays': None, 'limitDays': 4, 'status': 'warn', 'note': 'unreadable: %s' % ex})

# curated files: do they cover the latest quarter?
cm = read_text('comments.js'); gd = read_text('guidance.js'); sm = read_text('summary.js'); rf = read_text('reference.js')
ytd_id = '%dM%d' % (last['fy'], 3 * last['q'])
has_q = ('"%s"' % last['id']) in cm; has_y = ('"%s"' % ytd_id) in cm
curated('comments.js', has_q, {'es': 'comentarios de %s %s' % (last['id'], 'presentes' if has_q else 'AUSENTES'), 'en': 'comments for %s %s' % (last['id'], 'present' if has_q else 'MISSING')})
if last['q'] > 1: curated('comments.js', has_y, {'es': 'comentarios del acumulado %s %s' % (ytd_id, 'presentes' if has_y else 'AUSENTES'), 'en': 'comments for %s %s' % (ytd_id, 'present' if has_y else 'MISSING')})
has_g = ('quarter: "%s"' % last['id']) in gd
curated('guidance.js', has_g, {'es': 'vintage de guía ligado a %s %s' % (last['id'], 'presente' if has_g else 'AUSENTE'), 'en': 'guidance vintage tied to %s %s' % (last['id'], 'present' if has_g else 'MISSING')})
has_s = ('quarter: "%s"' % last['id']) in sm
curated('summary.js', has_s, {'es': 'resumen ejecutivo %s' % ('= último trimestre' if has_s else 'ATRASADO frente al último trimestre'), 'en': 'executive summary basis %s' % ('= latest quarter' if has_s else 'BEHIND the latest quarter')})
m = re.search(r'updatedAt:\s*"(\d{4}-\d{2}-\d{2})"', rf)
ra = age_days(m.group(1)) if m else None
curated('reference.js', ra is not None and ra <= 120, {'es': 'referencia revisada el %s (hace %s días)' % (m.group(1) if m else '?', ra), 'en': 'reference facts last reviewed %s (%s days ago)' % (m.group(1) if m else '?', ra)})
# FactSet peers and consensus (nightly cloud routine): the table's common close date must be recent
try:
    pr = load('peers.js'); pa = age_days(pr.get('pricesAsOf') or '')
    curated('peers.js', pa is not None and pa <= 5, {'es': 'pares y consenso FactSet con cierres al %s (hace %s días); rutina nocturna en la nube' % (pr.get('pricesAsOf') or '?', pa), 'en': 'FactSet peers and consensus with closes as of %s (%s days ago); nightly cloud routine' % (pr.get('pricesAsOf') or '?', pa)})
except Exception as ex:
    curated('peers.js', False, {'es': 'ilegible: %s' % ex, 'en': 'unreadable: %s' % ex})

# origin of every quarter (from the parse log build_data.py wrote to quality.js) and its source
try: LOG = load('quality.js')
except Exception: LOG = {}
ORIGINS = []
for q in fin['quarters']:
    s = (q.get('sources') or {}).get('is') or {}
    parts = ' · '.join(p for p, k in (('IS', 'is'), ('BS', 'bs'), ('OPS', 'ops')) if q.get(k))
    ORIGINS.append({'id': q['id'], 'origin': q.get('origin') or (LOG.get('quarters') or {}).get(q['id']) or 'release', 'title': s.get('title'), 'url': s.get('url'), 'date': s.get('date'), 'page': s.get('page'), 'parts': parts})
PARSE = [{'file': '', 'msg': w} for w in (LOG.get('warnings') or [])]
CARDS = [{'v': len(LOG.get('parsed') or []), 'l': {'es': 'informes parseados', 'en': 'releases parsed'}},
         {'v': len(LOG.get('seed') or []), 'l': {'es': 'trimestres de la semilla', 'en': 'quarters from the seed'}}]

# ----------------------------------------------------------------------------- output
for w in warns: print('WARN ' + w)
for f in fails: print('FAIL ' + f)
counts = {'checks': len(CHECKS), 'ok': sum(1 for c in CHECKS if c['status'] == 'ok'), 'warn': sum(1 for c in CHECKS if c['status'] == 'warn'), 'fail': sum(1 for c in CHECKS if c['status'] == 'fail')}
print('validate_data: %d failures, %d warnings, %d identities checked; %d quarters, %d YTD, %d FY, %d operating quarters' % (len(fails), len(warns), len(CHECKS), len(fin['quarters']), len(fin['ytd']), len(fin['years']), len(ops['quarters'])))
quality = {k: LOG.get(k) for k in ('quarters', 'warnings', 'parsed', 'comparative', 'seed') if k in LOG}
quality.update({'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'ok': not fails, 'counts': counts, 'latestQuarter': last['id'], 'expectedQuarter': exp_q,
                'financialsGeneratedAt': fin.get('generatedAt'), 'buildGeneratedAt': LOG.get('generatedAt'), 'cards': CARDS, 'checks': CHECKS, 'stale': STALE, 'curated': CURATED, 'origins': ORIGINS, 'parse': PARSE,
                'diffUnit': {'es': 'Diferencia (Ps. millones / pp)', 'en': 'Difference (Ps. million / pp)'},
                'tolerances': {'es': 'Tolerancias: Ps. 3 millones en identidades de los estados financieros (los informes imprimen millones redondeados; Ps. 5 millones por trimestre sumado en acumulados y años fiscales), 0.3 pp en los índices que Gentera también publica (costo de riesgo, etapa 3, eficiencia), Ps. 0.02 en la UPA, 1.5 pp en la cobertura desde 4T25, ±0.5% entre la cartera de las subsidiarias y la consolidada (hasta 3% son eliminaciones). Las fallas detienen la publicación; los avisos no.',
                               'en': 'Tolerances: Ps. 3 million on statement identities (the releases print rounded millions; Ps. 5 million per quarter summed for year-to-date and fiscal-year columns), 0.3 pp on the ratios Gentera also publishes (cost of risk, stage 3, efficiency), Ps. 0.02 on EPS, 1.5 pp on coverage from 4Q25, ±0.5% between subsidiary and consolidated loans (up to 3% are eliminations). Failures block publication; warnings do not.'},
                'validation': {'failures': fails, 'warnings': warns, 'checks': len(CHECKS), 'ok': not fails}})
with open(os.path.join(DATA, 'quality.js'), 'w', encoding='utf-8') as f:
    f.write('// AUTO-GENERATED by scripts/gentera/build_data.py (parse log) and scripts/gentera/validate_data.py (tie-outs, freshness) — read by site/gentera/quality.html. Do not hand-edit.\n')
    f.write('// Generated: %s\n' % quality['generatedAt'])
    f.write('window.G_QUALITY = ' + json.dumps(quality, ensure_ascii=False, separators=(',', ':')) + ';\n')
sys.exit(1 if fails else 0)
