#!/usr/bin/env python3
"""Parser regression test: every archived press-release text in tools/gentera/raw/text/releases must still yield
consolidated statements for its own quarter that tie out, and must agree with the seed transcription
(tools/gentera/raw/seed/quarters.json) within Ps. 3 M on the headline lines. A format change in a new release
therefore breaks this test (and the workflow step) rather than the page. Files whose anchor says they are a
presentation rather than the press release are skipped with a notice. Exit 0 with a notice when no release has
been harvested yet."""
import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data as B  # noqa: E402

files = sorted(glob.glob(os.path.join(B.TXT, '*.txt')))
if not files:
    print('test_parser: no archived releases in %s yet; nothing to test' % os.path.relpath(B.TXT, B.ROOT)); sys.exit(0)
seed = {('20%s' % r['q'][2:] + 'Q' + r['q'][0]): r for r in json.load(open(B.SEED, encoding='utf-8'))['quarters']}
HEAD = ['intInc', 'intExp', 'finMargin', 'prov', 'opex', 'opRes', 'netInc', 'niCtrl']
BS = ['loans', 'loans3', 'allow', 'totAssets', 'totLiab', 'totEq', 'eqCtrl']
fails, skipped = 0, 0
for path in files:
    qid = os.path.basename(path)[:6]
    txt = open(path, encoding='utf-8').read()
    anchor = (re.search(r'^ANCHOR: (.*)$', txt, re.M) or [None, ''])[1]
    if 'presentaci' in B.norm(anchor):
        print('skip %s: %s (not a press release)' % (qid, anchor.strip())); skipped += 1; continue
    got = B.parse_release(qid, txt, 'test')
    own = (got.get(qid) or {}).get('cons')
    if not own or not own['is'] or not own['bs']:
        print('FAIL %s: consolidated statements not recognised (entities: %s)' % (qid, sorted(k for k in got.get(qid, {}) if k != 'source'))); fails += 1; continue
    if not B.is_ties(own['is']): print('FAIL %s: income statement does not tie out: %s' % (qid, {k: own['is'].get(k) for k in HEAD + ['finMarginAdj', 'feesCh', 'feesPd', 'trading', 'otherInc', 'ibt', 'tax', 'niMin']})); fails += 1
    if not B.bs_ties(own['bs']): print('FAIL %s: balance sheet does not tie out: %s' % (qid, {k: own['bs'].get(k) for k in BS + ['loans12', 'eqMin']})); fails += 1
    s = seed.get(qid)
    if s:
        for k in HEAD + BS:
            blk = own['is'] if k in HEAD else own['bs']
            if blk.get(k) is not None and s.get(k) is not None and abs(blk[k] - s[k]) > 3:
                print('FAIL %s: %s parsed %s vs seed %s' % (qid, k, blk[k], s[k])); fails += 1
    subs = sorted(k for k in got[qid] if k in ('mx', 'pe', 'cc'))
    print('ok   %s: IS %d lines, BS %d lines, ind %d, subsidiaries %s, %d comparative quarters' % (qid, len(own['is']), len(own['bs']), len(own['ind']), subs, len(got) - 1))
print('test_parser: %d files, %d skipped, %d failures' % (len(files), skipped, fails))
sys.exit(1 if fails else 0)
