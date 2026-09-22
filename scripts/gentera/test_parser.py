#!/usr/bin/env python3
"""Parser regression test: every archived press-release text in tools/gentera/raw/text/releases must still yield
an income statement and a balance sheet for its own quarter that tie out, and must agree with the seed
transcription (tools/gentera/raw/seed/quarters.json) within Ps. 3 M on the headline lines. A format change in a
new release therefore breaks this test (and the workflow step) rather than the page. Exit 0 with a notice when no
release has been harvested yet."""
import glob, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data as B  # noqa: E402

files = sorted(glob.glob(os.path.join(B.TXT, '*.txt')))
if not files:
    print('test_parser: no archived releases in %s yet; nothing to test' % os.path.relpath(B.TXT, B.ROOT)); sys.exit(0)
seed = {('20%s' % r['q'][2:] + 'Q' + r['q'][0]): r for r in json.load(open(B.SEED, encoding='utf-8'))['quarters']}
HEAD = ['intInc', 'intExp', 'finMargin', 'prov', 'opex', 'opRes', 'netInc']
BS = ['loans', 'totAssets', 'totLiab', 'totEq']
fails = 0
for path in files:
    qid = os.path.basename(path)[:6]
    txt = open(path, encoding='utf-8').read()
    got = B.parse_release(qid, txt, 'test')
    own = got.get(qid)
    if not own or not own['is'] or not own['bs']:
        print('FAIL %s: own-quarter statements not recognised (IS %s, BS %s)' % (qid, bool(own and own['is']), bool(own and own['bs']))); fails += 1; continue
    if not B.is_ties(own['is']): print('FAIL %s: income statement does not tie out: %s' % (qid, own['is'])); fails += 1
    if not B.bs_ties(own['bs']): print('FAIL %s: balance sheet does not tie out: %s' % (qid, own['bs'])); fails += 1
    s = seed.get(qid)
    if s:
        for k in HEAD + BS:
            blk = own['is'] if k in HEAD else own['bs']
            if blk.get(k) is not None and s.get(k) is not None and abs(blk[k] - s[k]) > 3:
                print('FAIL %s: %s parsed %s vs seed %s' % (qid, k, blk[k], s[k])); fails += 1
    print('ok   %s: IS %d lines, BS %d lines, %d comparative quarters' % (qid, len(own['is']), len(own['bs']), len(got) - 1))
print('test_parser: %d files, %d failures' % (len(files), fails))
sys.exit(1 if fails else 0)
