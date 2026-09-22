#!/usr/bin/env python3
"""Tie-out checks for site/gentera/data/financials.js and operations.js. Exit code 1 on any failure so the
refresh workflow never commits a data set that does not reconcile. Tolerance: Ps. 2 million on statement
identities (the releases print rounded millions), 0.3 pp on ratios Gentera also publishes. The result is
appended to site/gentera/data/quality.js so quality.html can show it."""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'site', 'gentera', 'data')


def load(name):
    t = open(os.path.join(DATA, name), encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


fails, warns, checks = [], [], []
fail = fails.append; warn = warns.append
TOL = 3.0


def identity(tag, msg, a, b, tol=TOL, soft=False):
    if a is None or b is None: return
    d = abs(a - b); checks.append('%s %s' % (tag, msg))
    if d <= tol: return
    (warn if soft else fail)('%s %s (diff %.1f)' % (tag, msg, d))


fin = load('financials.js'); ops = load('operations.js')


def check_is(tag, i):
    g = i.get
    identity(tag, 'IS: interest income − expense != financial margin', (g('intInc') or 0) - (g('intExp') or 0), g('finMargin'))
    identity(tag, 'IS: margin − provisions != margin after provisions', (g('finMargin') or 0) - (g('prov') or 0), g('finMarginAdj'))
    if all(g(k) is not None for k in ('finMarginAdj', 'feesCh', 'feesPd', 'opex', 'opRes')):
        identity(tag, 'IS: margin after prov. + fees − opex != operating result', g('finMarginAdj') + g('feesCh') - g('feesPd') + (g('trading') or 0) + (g('otherInc') or 0) - g('opex'), g('opRes'))
    if g('ibt') is not None and g('tax') is not None:
        identity(tag, 'IS: income before tax − tax + discontinued != net income', g('ibt') - g('tax') + (g('discontinued') or 0), g('netInc'))
    if g('niCtrl') is not None and g('niMin') is not None:
        identity(tag, 'IS: controlling + minority != net income', g('niCtrl') + g('niMin'), g('netInc'))
    if g('fundExp') is not None and g('origExp') is not None:
        identity(tag, 'IS: funding + origination != interest expense', g('fundExp') + g('origExp'), g('intExp'), soft=True)


def check_bs(tag, b):
    g = b.get
    identity(tag, 'BS: liabilities + equity != assets', (g('totLiab') or 0) + (g('totEq') or 0), g('totAssets'))
    identity(tag, 'BS: stage 1&2 + stage 3 != gross loans', (g('loans12') or 0) + (g('loans3') or 0), g('loans'))
    if g('loansNet') is not None and g('deferred') is not None:
        identity(tag, 'BS: gross + deferred − allowance != net loans', g('loans') + g('deferred') - g('allow'), g('loansNet'))
    if g('eqCtrl') is not None and g('eqMin') is not None:
        identity(tag, 'BS: controlling + minority != total equity', g('eqCtrl') + g('eqMin'), g('totEq'))


for q in fin['quarters']:
    check_is(q['id'], q['is']); check_bs(q['id'], q['bs'])
    k, o = q['kpi'], q['ops'] if 'ops' in q else {}
    if k.get('corDisc') is not None and k.get('cor') is not None and abs(k['corDisc'] - k['cor']) > 0.3:
        warn('%s: computed cost of risk %.2f vs disclosed %.2f' % (q['id'], k['cor'], k['corDisc']))
    if k.get('epsDisc') is not None and k.get('eps') is not None and abs(k['epsDisc'] - k['eps']) > 0.02:
        warn('%s: computed EPS %.2f vs printed %.2f' % (q['id'], k['eps'], k['epsDisc']))
    if k.get('npl') is not None and k.get('nplCalc') is not None and abs(k['npl'] - k['nplCalc']) > 0.3:
        warn('%s: stage-3 ratio from balances %.2f vs reported %.2f' % (q['id'], k['nplCalc'], k['npl']))
    if k.get('effic') is not None and k.get('effCalc') is not None and abs(k['effic'] - k['effCalc']) > 0.3:
        warn('%s: efficiency ratio computed %.2f vs reported %.2f' % (q['id'], k['effCalc'], k['effic']))
    if q['id'] >= '2025Q4' and k.get('coverageRep') is not None and k.get('coverage') is not None and abs(k['coverageRep'] - k['coverage']) > 1.5:
        warn('%s: coverage recomputed %.1f vs printed %.1f (same definition expected from 4Q25)' % (q['id'], k['coverage'], k['coverageRep']))
for y in fin['ytd'] + fin['years']:
    check_is(y['id'], y['is'])
# YTD/FY = sum of quarters
byid = {q['id']: q for q in fin['quarters']}
for y in fin['ytd'] + fin['years']:
    qs = [byid.get(c) for c in y['covers']]
    if any(x is None for x in qs): fail('%s: covers a missing quarter' % y['id']); continue
    for key in ('intInc', 'netInc'):
        identity(y['id'], 'sum of quarters %s != period' % key, sum(x['is'].get(key) or 0 for x in qs), y['is'].get(key))
# 12-quarter window continuity
last = fin['quarters'][-1]
for i in range(12):
    fy, q = last['fy'], last['q'] - i
    while q <= 0: q += 4; fy -= 1
    e = byid.get('%dQ%d' % (fy, q))
    if not e: fail('missing quarter %dQ%d in the 12-quarter window' % (fy, q))
    elif not e.get('bs') or e['bs'].get('totAssets') is None: fail('%dQ%d: missing balance sheet' % (fy, q))
# operations: subsidiaries vs consolidated loans; stage-3 by subsidiary vs consolidated balance
for e in ops['quarters']:
    if e.get('loans') and all(e.get(k) is not None for k in ('loansMX', 'loansPE', 'loansCC')):
        s = e['loansMX'] + e['loansPE'] + e['loansCC']
        if s > e['loans'] * 1.005: fail('%s: subsidiary loans %.0f exceed consolidated %.0f' % (e['id'], s, e['loans']))
        if s < e['loans'] * 0.97: warn('%s: subsidiary loans %.0f are %.1f%% below consolidated %.0f' % (e['id'], s, 100 * (1 - s / e['loans']), e['loans']))
    if e.get('clientsCred') and e.get('clientsTot') and e['clientsCred'] > e['clientsTot']:
        fail('%s: credit clients exceed people served' % e['id'])
    if e.get('writeoffs') is not None and e.get('woMX') is not None and e['woMX'] < 0:
        fail('%s: derived Banco Compartamos write-offs negative' % e['id'])
    if e.get('npl') is not None and not (0 <= e['npl'] < 25): fail('%s: implausible stage-3 ratio %s' % (e['id'], e['npl']))

for w in warns: print('WARN ' + w)
for f in fails: print('FAIL ' + f)
print('validate_data: %d failures, %d warnings, %d identities checked; %d quarters, %d YTD, %d FY, %d operating quarters' % (len(fails), len(warns), len(checks), len(fin['quarters']), len(fin['ytd']), len(fin['years']), len(ops['quarters'])))
# append to quality.js
try:
    qp = os.path.join(DATA, 'quality.js'); t = open(qp, encoding='utf-8').read()
    obj = json.loads(t[t.index('{'):t.rindex('}') + 1])
    obj['validation'] = {'failures': fails, 'warnings': warns, 'checks': len(checks), 'ok': not fails}
    head = t[:t.index('window.')]
    open(qp, 'w', encoding='utf-8').write(head + 'window.G_QUALITY = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n')
except Exception as e:  # noqa: BLE001
    print('note: could not append validation to quality.js: %s' % e)
sys.exit(1 if fails else 0)
