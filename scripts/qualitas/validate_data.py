#!/usr/bin/env python3
"""Tie-out checks for site/qualitas/data/financials.js and operations.js, plus a data-health report.

Exit code 1 on any failure so the refresh workflow never commits a data set that does not reconcile.
Tolerances: Ps. 5 thousand on statement identities parsed from a report or filing (rounding of the printed
figures), Ps. 1.5 million when the only source is the IR workbook (rounded millions), 0.3 pp on ratios.

Besides printing WARN/FAIL lines, the script writes site/qualitas/data/quality.js (window.Q_QUALITY): every
identity evaluated (pass, warn or fail), parse warnings from the last build (tools/qualitas/raw/build-log.json),
stale-series checks (market data, latest quarter vs the results calendar) and the freshness of the curated files
(comments, expectations, summary, reference) relative to the latest quarter. The hidden page
site/qualitas/quality.html renders it so the owner can see the pipeline's health without reading logs.
"""
import json, os, re, sys
from datetime import datetime, timezone, date

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'site', 'qualitas', 'data')
BUILD_LOG = os.path.join(ROOT, 'tools', 'qualitas', 'raw', 'build-log.json')
TODAY = datetime.now(timezone.utc).date()


def load(name):
    t = open(os.path.join(DATA, name), encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


def read_text(name):
    p = os.path.join(DATA, name)
    return open(p, encoding='utf-8').read() if os.path.exists(p) else ''


CHECKS = []           # every identity evaluated: {tag, check, status, diff, tol}
fails, warns = [], []
# Quálitas' own printed statements occasionally carry a sub-Ps. 0.5 M inconsistency (e.g. the 4Q24 quarterly
# column books the "operaciones análogas" line in gross profit for the year but not for the quarter); such
# as-reported gaps are warnings, anything larger is a parse failure.
SLACK = 500


def record(tag, check, status, diff=None, tol=None, note=None):
    CHECKS.append({'tag': tag, 'check': check, 'status': status, 'diff': None if diff is None else round(diff, 1), 'tol': tol, 'note': note})
    if status == 'fail': fails.append('%s %s%s' % (tag, check, ' (diff %s)' % round(diff) if diff is not None else ''))
    elif status == 'warn': warns.append('%s %s%s' % (tag, check, ' (diff %s)' % round(diff) if diff is not None else ''))


def identity(tag, msg, a, b, tol):
    if a is None or b is None: return
    d = abs(a - b)
    record(tag, msg, 'ok' if d <= tol else ('warn' if d <= max(tol, SLACK) else 'fail'), d, tol)


def near(a, b, tol):
    return a is not None and b is not None and abs(a - b) <= tol


fin = load('financials.js'); ops = load('operations.js')


def tol_for(src):
    """Ps. 5 thousand for a statement parsed from a report or filing; Ps. 1.5 million when the only source is
    the IR workbook, whose figures are rounded to millions."""
    return 1500 if (not src or src.get('workbook')) else 5


def check_is(tag, i, src=None):
    g = i.get; tol = tol_for(src)
    if g('written') is not None and g('ceded') is not None: identity(tag, 'IS: written − ceded = retained', g('written') - g('ceded'), g('retained'), tol)
    if g('retained') is not None and g('reserveInc') is not None: identity(tag, 'IS: retained − reserve increase = earned', g('retained') - g('reserveInc'), g('earned'), tol)
    if all(g(k) is not None for k in ('earned', 'acqCost', 'lossCost')): identity(tag, 'IS: earned − acquisition − claims = technical result', g('earned') - g('acqCost') - g('lossCost'), g('techResult'), tol)
    if g('grossProfit') is not None and g('opex') is not None: identity(tag, 'IS: gross profit − opex = operating result', g('grossProfit') - g('opex'), g('opResult'), tol)
    if g('opResult') is not None and g('rif') is not None: identity(tag, 'IS: operating result + RIF (+ associates) = income before tax', g('opResult') + g('rif') + (g('associates') or 0), g('ibt'), tol)
    if g('ibt') is not None and g('tax') is not None: identity(tag, 'IS: EBT − tax (− discontinued) = net income', g('ibt') - g('tax') - (g('discontinued') or 0), g('netIncome'), tol)


def check_bs(tag, b, src=None):
    if not b: return
    g = b.get; tol = tol_for(src)
    if g('totalAssets') is not None and g('totalLiab') is not None and g('totalEquity') is not None:
        identity(tag, 'BS: liabilities + equity = assets', g('totalLiab') + g('totalEquity'), g('totalAssets'), tol)
    if g('totalLiabEquity') is not None and g('totalAssets') is not None:
        identity(tag, 'BS: total liabilities & equity = total assets', g('totalLiabEquity'), g('totalAssets'), tol)
    # CNSF layout: technical reserves = risks in force + bonds in force + obligations pending settlement
    # (which already contains funds under administration and premiums in deposit) + contingency + specialised + catastrophic
    if g('reserves') is not None and g('upr') is not None and g('claimsReserves') is not None:
        s = g('upr') + g('claimsReserves') + (g('bondsInForce') or 0) + (g('catReserveL') or 0) + (g('contReserveL') or 0) + (g('specReserveL') or 0)
        d = abs(s - g('reserves'))
        record(tag, 'BS: reserve components = technical reserves', 'ok' if d <= 5 else 'warn', d, 5)


def check_cf(tag, c, bs):
    if not c: return
    g = c.get
    if all(g(k) is not None for k in ('cashBegin', 'netChangeCash', 'cashEnd')):
        identity(tag, 'CF: cash begin + net change + FX = cash end', g('cashBegin') + g('netChangeCash') + (g('fxEffectCash') or 0), g('cashEnd'), 5)
    if all(g(k) is not None for k in ('cfo', 'cfi', 'cff', 'netChangeCash')):
        identity(tag, 'CF: CFO + CFI + CFF = net change in cash', g('cfo') + g('cfi') + g('cff'), g('netChangeCash'), 5)
    if bs and g('cashEnd') is not None and bs.get('cash') is not None:
        identity(tag, 'CF cash end = BS cash', g('cashEnd'), bs['cash'], 5)


for q in fin['quarters']:
    check_is(q['id'], q['is'], q.get('sources', {}).get('is')); check_bs(q['id'], q.get('bs'), q.get('sources', {}).get('bs')); check_cf(q['id'], q.get('cf'), q.get('bs'))
    k = q.get('kpi', {})
    for rep, own in (('lossRatioRep', 'lossRatio'), ('acqRatioRep', 'acqRatio'), ('opRatioRep', 'opRatio'), ('combinedRep', 'combined')):
        if k.get(rep) is not None and k.get(own) is not None:
            d = abs(k[rep] - k[own])
            record(q['id'], 'KPI: computed %s vs company workbook' % own, 'ok' if d <= 0.3 else 'warn', d, 0.3, '%.2f vs %.2f' % (k[own], k[rep]))
for y in fin['years']:
    check_is(y['id'], y['is'], y.get('sources', {}).get('is')); check_bs(y['id'], y.get('bs'), y.get('sources', {}).get('bs')); check_cf(y['id'], y.get('cf'), y.get('bs'))
for y in fin['ytd']:
    if y.get('is'): check_is(y['id'], y['is'], y.get('sources', {}).get('is'))
    if y.get('cf'): check_cf(y['id'], y['cf'], None)
# YTD = sum of quarters (written premiums, net income) when every quarter is present. When one of the quarters
# comes only from the IR workbook (rounded millions, and occasionally a restated base) the mismatch is a warning;
# when every figure was parsed from a report or filing a gap beyond Ps. 1.5 M is a parse failure.
byid = {q['id']: q for q in fin['quarters']}
from_workbook = lambda q: bool((q.get('sources', {}).get('is') or {}).get('workbook'))
for y in fin['ytd']:
    if not y.get('is') or y['months'] == 3: continue
    qs = [byid.get('%dQ%d' % (y['fy'], i + 1)) for i in range(y['months'] // 3)]
    if any(q is None or not q['is'].get('written') for q in qs): continue
    wb = any(from_workbook(q) for q in qs) or bool((y.get('sources', {}).get('is') or {}).get('workbook'))
    for k in ('written', 'netIncome'):
        s = sum(q['is'].get(k) or 0 for q in qs)
        if y['is'].get(k) is not None:
            d = abs(s - y['is'][k])
            record(y['id'], 'YTD %s = sum of quarters' % k, 'ok' if d <= 50 else ('warn' if (wb or d <= 1500) else 'fail'), d, 50, 'a quarter comes from the IR workbook' if wb else None)
# fiscal year = sum of the four quarters
for y in fin['years']:
    qs = [byid.get('%dQ%d' % (y['fy'], i)) for i in (1, 2, 3, 4)]
    if any(q is None or not q['is'].get('written') for q in qs): continue
    wb = any(from_workbook(q) for q in qs) or bool((y.get('sources', {}).get('is') or {}).get('workbook'))
    for k in ('written', 'netIncome'):
        s = sum(q['is'].get(k) or 0 for q in qs)
        if y['is'].get(k) is not None:
            d = abs(s - y['is'][k])
            record(y['id'], 'FY %s = sum of four quarters' % k, 'ok' if d <= 50 else ('warn' if (wb or d <= 1500) else 'fail'), d, 50, 'a quarter comes from the IR workbook' if wb else None)
# recent-window continuity: last 12 quarters need IS and BS
last = fin['quarters'][-1]
for i in range(12):
    fy, q = last['fy'], last['q'] - i
    while q <= 0: q += 4; fy -= 1
    e = byid.get('%dQ%d' % (fy, q)); tag = '%dQ%d' % (fy, q)
    if not e: record(tag, 'coverage: quarter present in the 12-quarter window', 'fail')
    elif not e.get('bs'): record(tag, 'coverage: balance sheet present', 'fail')
    elif not e.get('cf'): record(tag, 'coverage: quarterly cash-flow statement present', 'warn', note='SIFIC filing missing or image-only')
    else: record(tag, 'coverage: IS, BS and CF present', 'ok')
# operations: lines of business vs total, insured units vs workbook
for e in ops['quarters']:
    p = e.get('premiums') or {}
    if p.get('total') and all(p.get(k) is not None for k in ('ind', 'fleet', 'fin', 'intl')):
        s = p['ind'] + p['fleet'] + p['fin'] + p['intl']
        d = abs(s - p['total'])
        record(e['id'], 'OPS: lines of business = total written premiums (±2%)', 'ok' if d <= 0.02 * p['total'] else 'fail', d, round(0.02 * p['total']))
    u = e.get('units') or {}
    if u.get('total') and u.get('mx'):
        record(e['id'], 'OPS: Mexico units ≤ total units', 'ok' if u['mx'] <= u['total'] else 'fail')
        parts = [u.get(k) for k in ('sv', 'cr', 'us', 'pe', 'co')]
        if all(x is not None for x in parts[:4]):
            s = u['mx'] + sum(x or 0 for x in parts)
            d = abs(s - u['total'])
            record(e['id'], 'OPS: Mexico + subsidiaries = total units (±3k)', 'ok' if d <= 3 else 'warn', d, 3)
    q = byid.get(e['id'])
    if q and u.get('total') and q['kpi'].get('units'):
        d = abs(u['total'] - q['kpi']['units'])
        record(e['id'], 'OPS: report units vs workbook units', 'ok' if d <= 3 else 'warn', d, 3)
    sv = e.get('solvency')
    if sv and sv.get('index'):
        d = abs(100 * (sv['rcs'] + sv['margin']) / sv['rcs'] - sv['index'])
        record(e['id'], 'OPS: solvency index = (RCS + margin) ÷ RCS', 'ok' if d <= 2 else 'fail', d, 2)

# ----------------------------------------------------------------------------- data health (never fails the build)
STALE = []


def age_days(iso):
    try: return (TODAY - date.fromisoformat(iso[:10])).days
    except Exception: return None


def stale(series, last_date, limit, note=None):
    a = age_days(last_date) if last_date else None
    status = 'warn' if (a is None or a > limit) else 'ok'
    STALE.append({'series': series, 'lastDate': last_date, 'ageDays': a, 'limitDays': limit, 'status': status, 'note': note})


try:
    mk = load('market.js')
    for sid, lim in (('Q.MX', 5), ('^MXX', 5), ('PGR', 5), ('ALL', 5), ('PSSA3.SA', 6), ('MAP.MC', 6)):
        s = (mk.get('prices') or {}).get(sid) or {}
        pts = s.get('points') or []
        stale('price ' + sid, pts[-1][0] if pts else None, lim, s.get('error'))
    for grp, sid, lim in (('fx', 'USDMXN', 7), ('rates', 'MX10Y', 45), ('rates', 'US10Y', 7)):
        s = (mk.get(grp) or {}).get(sid) or {}
        pts = s.get('points') or []
        stale('%s %s' % (grp, sid), pts[-1][0] if pts else None, lim, s.get('error'))
    d = (mk.get('dividends') or {}).get('Q.MX') or {}
    pts = d.get('points') or []
    stale('dividends Q.MX', pts[-1][0] if pts else None, 400, 'last recorded cash dividend; Quálitas pays twice a year')
except Exception as ex:
    STALE.append({'series': 'market.js', 'lastDate': None, 'ageDays': None, 'limitDays': None, 'status': 'warn', 'note': 'unreadable: %s' % ex})

# daily reviewing routine: review.js is rewritten at the end of every run (tools/qualitas/ROUTINE.md)
try:
    rv = load('review.js')
    stale('reviewing routine (review.js)', (rv.get('lastRunAt') or '')[:10] or None, 2, 'last result: %s' % rv.get('result'))
except Exception as ex:
    STALE.append({'series': 'reviewing routine (review.js)', 'lastDate': None, 'ageDays': None, 'limitDays': 2, 'status': 'warn', 'note': 'unreadable: %s' % ex})

# latest quarter vs the results calendar: Quálitas reports ~3-4 weeks after quarter-end
def expected_quarter(today):
    qe = [(today.year, 3, 31), (today.year, 6, 30), (today.year, 9, 30), (today.year, 12, 31), (today.year - 1, 12, 31), (today.year - 1, 9, 30), (today.year - 1, 6, 30)]
    for y, m, dd in sorted(qe, reverse=True):
        if (today - date(y, m, dd)).days >= 35:
            return '%dQ%d' % (y, m // 3)
    return None


exp_q = expected_quarter(TODAY)
STALE.append({'series': 'latest quarter (financials.js)', 'lastDate': last['id'], 'ageDays': age_days((last.get('sources', {}).get('is') or {}).get('date') or ''), 'limitDays': None,
              'status': 'ok' if last['id'] >= (exp_q or '') else 'warn', 'note': 'expected at least %s given the results calendar' % exp_q})
ops_last = ([e for e in ops['quarters'] if e.get('units') and e['units'].get('total')] or [{'id': None}])[-1]['id']
STALE.append({'series': 'latest operating quarter (operations.js)', 'lastDate': ops_last, 'ageDays': None, 'limitDays': None, 'status': 'ok' if (ops_last or '') >= (exp_q or '') else 'warn', 'note': 'expected at least %s' % exp_q})

# curated files: do they cover the latest quarter?
CURATED = []
def curated(name, ok, detail):
    CURATED.append({'file': name, 'status': 'ok' if ok else 'warn', 'detail': detail})

cm = read_text('comments.js'); gd = read_text('guidance.js'); sm = read_text('summary.js'); rf = read_text('reference.js')
ytd_id = '%dM%d' % (last['fy'], 3 * last['q'])
curated('comments.js', ('"%s"' % last['id']) in cm, 'comments for %s %s' % (last['id'], 'present' if ('"%s"' % last['id']) in cm else 'MISSING'))
curated('comments.js', last['q'] == 1 or ('"%s"' % ytd_id) in cm, 'comments for %s %s' % (ytd_id, 'present' if ('"%s"' % ytd_id) in cm else 'MISSING'))
curated('guidance.js', ('quarter: "%s"' % last['id']) in gd, 'expectation vintage tied to %s %s' % (last['id'], 'present' if ('quarter: "%s"' % last['id']) in gd else 'MISSING'))
curated('summary.js', ('quarter: "%s"' % last['id']) in sm, 'executive summary basis %s' % ('= latest quarter' if ('quarter: "%s"' % last['id']) in sm else 'BEHIND the latest quarter'))
m = re.search(r'updatedAt:\s*"(\d{4}-\d{2}-\d{2})"', rf)
ra = age_days(m.group(1)) if m else None
curated('reference.js', ra is not None and ra <= 120, 'reference facts last reviewed %s (%s days ago)' % (m.group(1) if m else '?', ra))

# parse warnings from the last build
PARSE = []
if os.path.exists(BUILD_LOG):
    try: PARSE = json.load(open(BUILD_LOG, encoding='utf-8')).get('warnings', [])
    except Exception as ex: PARSE = [{'file': 'build-log.json', 'msg': 'unreadable: %s' % ex}]

# ----------------------------------------------------------------------------- output
for w in warns: print('WARN ' + w)
for f in fails: print('FAIL ' + f)
counts = {'checks': len(CHECKS), 'ok': sum(1 for c in CHECKS if c['status'] == 'ok'), 'warn': sum(1 for c in CHECKS if c['status'] == 'warn'), 'fail': sum(1 for c in CHECKS if c['status'] == 'fail')}
print('validate_data: %d failures, %d warnings; %d quarters, %d YTD periods, %d years, %d operating quarters; %d identities checked' % (len(fails), len(warns), len(fin['quarters']), len(fin['ytd']), len(fin['years']), len(ops['quarters']), len(CHECKS)))
quality = {'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'ok': not fails, 'counts': counts, 'latestQuarter': last['id'], 'expectedQuarter': exp_q,
           'coverage': fin.get('coverage'), 'financialsGeneratedAt': fin.get('generatedAt'), 'checks': CHECKS, 'stale': STALE, 'curated': CURATED, 'parse': PARSE,
           'tolerances': {'statementThousands': 5, 'workbookThousands': 1500, 'slackThousands': SLACK, 'ratioPp': 0.3, 'ytdSumThousands': 50}}
with open(os.path.join(DATA, 'quality.js'), 'w', encoding='utf-8') as f:
    f.write('// AUTO-GENERATED by scripts/qualitas/validate_data.py — data-health report for site/qualitas/quality.html. Do not hand-edit.\n')
    f.write('window.Q_QUALITY = ' + json.dumps(quality, ensure_ascii=False, separators=(',', ':')) + ';\n')
sys.exit(1 if fails else 0)
