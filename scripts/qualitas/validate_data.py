#!/usr/bin/env python3
"""Tie-out checks for site/qualitas/data/financials.js and operations.js. Exit code 1 on any failure so the
refresh workflow never commits a data set that does not reconcile. Tolerances: Ps. 5 thousand on statement
identities (rounding of the printed figures), 0.3 pp on ratios."""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'site', 'qualitas', 'data')


def load(name):
    t = open(os.path.join(DATA, name), encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


fails, warns = [], []
fail = fails.append; warn = warns.append
near = lambda a, b, tol: a is not None and b is not None and abs(a - b) <= tol
# Quálitas' own printed statements occasionally carry a sub-Ps. 0.5 M inconsistency (e.g. the 4Q24 quarterly
# column books the "operaciones análogas" line in gross profit for the year but not for the quarter); such
# as-reported gaps are warnings, anything larger is a parse failure.
SLACK = 500


def identity(tag, msg, a, b, tol):
    if a is None or b is None: return
    d = abs(a - b)
    if d <= tol: return
    (warn if d <= max(tol, SLACK) else fail)('%s %s (diff %s)' % (tag, msg, round(d)))

fin = load('financials.js'); ops = load('operations.js')


def tol_for(src):
    """Ps. 5 thousand for a statement parsed from a report or filing; Ps. 1.5 million when the only source is
    the IR workbook, whose figures are rounded to millions."""
    return 1500 if (not src or src.get('workbook')) else 5


def check_is(tag, i, src=None):
    g = i.get; tol = tol_for(src)
    if g('written') is not None and g('ceded') is not None: identity(tag, 'IS: written − ceded != retained', g('written') - g('ceded'), g('retained'), tol)
    if g('retained') is not None and g('reserveInc') is not None: identity(tag, 'IS: retained − reserve increase != earned', g('retained') - g('reserveInc'), g('earned'), tol)
    if all(g(k) is not None for k in ('earned', 'acqCost', 'lossCost')): identity(tag, 'IS: earned − acquisition − claims != technical result', g('earned') - g('acqCost') - g('lossCost'), g('techResult'), tol)
    if g('grossProfit') is not None and g('opex') is not None: identity(tag, 'IS: gross profit − opex != operating result', g('grossProfit') - g('opex'), g('opResult'), tol)
    if g('opResult') is not None and g('rif') is not None: identity(tag, 'IS: operating result + RIF != income before tax', g('opResult') + g('rif') + (g('associates') or 0), g('ibt'), tol)
    if g('ibt') is not None and g('tax') is not None: identity(tag, 'IS: EBT − tax != net income', g('ibt') - g('tax') - (g('discontinued') or 0), g('netIncome'), tol)


def check_bs(tag, b, src=None):
    if not b: return
    g = b.get; tol = tol_for(src)
    if g('totalAssets') is not None and g('totalLiab') is not None and g('totalEquity') is not None and not near(g('totalLiab') + g('totalEquity'), g('totalAssets'), tol):
        fail('%s BS: liabilities + equity != assets' % tag)
    if g('totalLiabEquity') is not None and g('totalAssets') is not None and not near(g('totalLiabEquity'), g('totalAssets'), tol):
        fail('%s BS: total liabilities & equity != total assets' % tag)
    # CNSF layout: technical reserves = risks in force + bonds in force + obligations pending settlement
    # (which already contains funds under administration and premiums in deposit) + contingency + specialised + catastrophic
    if g('reserves') is not None and g('upr') is not None and g('claimsReserves') is not None:
        s = g('upr') + g('claimsReserves') + (g('bondsInForce') or 0) + (g('catReserveL') or 0) + (g('contReserveL') or 0) + (g('specReserveL') or 0)
        if not near(s, g('reserves'), 5): warn('%s BS: reserve components %s vs total %s' % (tag, round(s), round(g('reserves'))))


def check_cf(tag, c, bs):
    if not c: return
    g = c.get
    if all(g(k) is not None for k in ('cashBegin', 'netChangeCash', 'cashEnd')) and not near(g('cashBegin') + g('netChangeCash') + (g('fxEffectCash') or 0), g('cashEnd'), 5):
        fail('%s CF: begin + net change + FX != end' % tag)
    if all(g(k) is not None for k in ('cfo', 'cfi', 'cff', 'netChangeCash')) and not near(g('cfo') + g('cfi') + g('cff'), g('netChangeCash'), 5):
        fail('%s CF: CFO + CFI + CFF != net change' % tag)
    if bs and g('cashEnd') is not None and bs.get('cash') is not None and not near(g('cashEnd'), bs['cash'], 5):
        fail('%s: CF cash end %s != BS cash %s' % (tag, round(g('cashEnd')), round(bs['cash'])))


for q in fin['quarters']:
    check_is(q['id'], q['is'], q.get('sources', {}).get('is')); check_bs(q['id'], q.get('bs'), q.get('sources', {}).get('bs')); check_cf(q['id'], q.get('cf'), q.get('bs'))
    k = q.get('kpi', {})
    for rep, own in (('lossRatioRep', 'lossRatio'), ('acqRatioRep', 'acqRatio'), ('opRatioRep', 'opRatio'), ('combinedRep', 'combined')):
        if k.get(rep) is not None and k.get(own) is not None and abs(k[rep] - k[own]) > 0.3:
            warn('%s: computed %s %.2f vs company workbook %.2f' % (q['id'], own, k[own], k[rep]))
for y in fin['years']:
    check_is(y['id'], y['is'], y.get('sources', {}).get('is')); check_bs(y['id'], y.get('bs'), y.get('sources', {}).get('bs')); check_cf(y['id'], y.get('cf'), y.get('bs'))
for y in fin['ytd']:
    if y.get('is'): check_is(y['id'], y['is'], y.get('sources', {}).get('is'))
    if y.get('cf'): check_cf(y['id'], y['cf'], None)
# YTD = sum of quarters (written premiums, net income) when every quarter is present
byid = {q['id']: q for q in fin['quarters']}
for y in fin['ytd']:
    if not y.get('is') or y['months'] == 3: continue
    qs = [byid.get('%dQ%d' % (y['fy'], i + 1)) for i in range(y['months'] // 3)]
    if any(q is None or not q['is'].get('written') for q in qs): continue
    for k in ('written', 'netIncome'):
        s = sum(q['is'].get(k) or 0 for q in qs)
        if y['is'].get(k) is not None and not near(s, y['is'][k], 50):
            warn('%s: sum of quarters %s %s != YTD %s' % (y['id'], k, round(s), round(y['is'][k])))
# recent-window continuity: last 12 quarters need IS and BS
last = fin['quarters'][-1]
for i in range(12):
    fy, q = last['fy'], last['q'] - i
    while q <= 0: q += 4; fy -= 1
    e = byid.get('%dQ%d' % (fy, q))
    if not e: fail('missing quarter %dQ%d in the 12-quarter window' % (fy, q))
    elif not e.get('bs'): fail('%dQ%d: missing balance sheet' % (fy, q))
    elif not e.get('cf'): warn('%dQ%d: no quarterly cash-flow statement (SIFIC filing missing or image-only)' % (fy, q))
# operations: lines of business vs total, insured units vs workbook
for e in ops['quarters']:
    p = e.get('premiums') or {}
    if p.get('total') and all(p.get(k) is not None for k in ('ind', 'fleet', 'fin', 'intl')):
        s = p['ind'] + p['fleet'] + p['fin'] + p['intl']
        if abs(s - p['total']) > 0.02 * p['total']: fail('%s: lines of business %s vs total %s' % (e['id'], s, p['total']))
    u = e.get('units') or {}
    if u.get('total') and u.get('mx') and u['mx'] > u['total']: fail('%s: Mexico units exceed total' % e['id'])
    q = byid.get(e['id'])
    if q and u.get('total') and q['kpi'].get('units') and abs(u['total'] - q['kpi']['units']) > 3:
        warn('%s: report units %s vs workbook %s' % (e['id'], u['total'], q['kpi']['units']))
    sv = e.get('solvency')
    if sv and sv.get('index') and not near(100 * (sv['rcs'] + sv['margin']) / sv['rcs'], sv['index'], 2):
        fail('%s: solvency index %s inconsistent with RCS %s and margin %s' % (e['id'], sv['index'], sv['rcs'], sv['margin']))

for w in warns: print('WARN ' + w)
for f in fails: print('FAIL ' + f)
print('validate_data: %d failures, %d warnings; %d quarters, %d YTD periods, %d years, %d operating quarters' % (len(fails), len(warns), len(fin['quarters']), len(fin['ytd']), len(fin['years']), len(ops['quarters'])))
sys.exit(1 if fails else 0)
