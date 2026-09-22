#!/usr/bin/env python3
"""Parser unit tests on archived releases (tools/qualitas/raw/text). Run before build_data.py in the refresh
workflow: if Quálitas changes the layout of a report or the BMV changes the SIFIC format, these tests fail and
the build stops — the page keeps serving the last good data set instead of a half-parsed one.

Expected values are the figures printed in the archived documents (pesos), confirmed by the tie-outs in
validate_data.py when the archive was first built. Add a case for each new quarter that introduces a layout
change. Usage: python scripts/qualitas/test_parsers.py
"""
import os, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_data as bd  # noqa: E402

TXT = bd.TXT


def read(kind, qid):
    p = os.path.join(TXT, kind, qid + '.txt')
    if not os.path.exists(p):
        raise unittest.SkipTest('%s/%s.txt not in the archive' % (kind, qid))
    with open(p, encoding='utf-8') as f:
        return f.read()


def close(a, b, tol=10.0):
    """pesos; the report and the SIFIC filing of the same quarter can differ by a few pesos of rounding"""
    return a is not None and b is not None and abs(a - b) <= tol


class ReportTests(unittest.TestCase):
    """Quarterly results reports (Informe de resultados): CNSF income statement, balance sheet, operating tables."""

    def test_2026Q2_income_statement_and_balance(self):
        r = bd.parse_report('2026Q2', read('reports', '2026Q2'))
        self.assertEqual(r['date'], '2026-07-21')
        self.assertTrue(close(r['is_q']['written'][0], 17329023601))
        self.assertTrue(close(r['is_q']['earned'][0], 17391926075))
        self.assertTrue(close(r['is_q']['lossCost'][0], 11271894061))
        self.assertTrue(close(r['is_q']['netIncome'][0], 1388602139))
        self.assertTrue(close(r['is_ytd']['written'][0], 39022113441))
        self.assertTrue(close(r['is_ytd']['netIncome'][0], 2943860696))
        self.assertTrue(close(r['bs']['totalAssets'][0], 123701686259))
        self.assertTrue(close(r['bs']['totalEquity'][0], 25053212045))
        self.assertTrue(close(r['bs']['cash'][0], 2205311172))
        # sequential-label matching must not confuse "Otros" inside acquisition cost with "Otros" inside RIF
        self.assertIn('acqOther', r['is_q']); self.assertIn('rifOther', r['is_q'])

    def test_2026Q2_operating_tables(self):
        o = bd.parse_report('2026Q2', read('reports', '2026Q2'))['ops']
        u = o['units']
        self.assertEqual(u['total']['cur'], 6144); self.assertEqual(u['mx']['cur'], 5801); self.assertEqual(u['co']['cur'], 26)
        s = o['segments']
        self.assertEqual(s['total']['q'][0], 17329); self.assertEqual(s['fin']['q'][0], 5924); self.assertEqual(s['ind']['q'][0], 6873)
        self.assertEqual(s['total']['ytd'][0], 39022)
        self.assertEqual(o['subsidiaries']['cr']['q'][0], 371); self.assertEqual(o['subsidiaries']['verticals']['q'][0], 456)
        self.assertEqual(o['solvency'], {'rcs': 6646, 'margin': 15984, 'index': 341})
        self.assertEqual(o['portfolio'], {'fiPct': 85.7, 'duration': 2.6})
        # "Cifras relevantes" page: reported ratios and portfolio size (Ps. million)
        self.assertEqual(o['reported']['roePeriod'], 21.4); self.assertEqual(o['reported']['rsi'], 7.4)
        self.assertEqual(o['reported']['combinedAdj'], 95.3); self.assertEqual(o['reported']['float'], 53430)

    def test_2025Q4_annual_column_and_vat_quarter(self):
        r = bd.parse_report('2025Q4', read('reports', '2025Q4'))
        self.assertTrue(close(r['is_q']['written'][0], 22232611378))
        self.assertTrue(close(r['is_q']['netIncome'][0], -190189935))      # the VAT quarter: a net loss
        self.assertTrue(close(r['is_ytd']['written'][0], 75804112026))     # full-year column
        self.assertTrue(close(r['is_ytd']['netIncome'][0], 5095129484))
        self.assertEqual(r['ops']['solvency'], {'rcs': 6143, 'margin': 16105, 'index': 362})
        self.assertEqual(r['ops']['units']['total']['cur'], 6072)

    def test_2023Q1_older_layout(self):
        r = bd.parse_report('2023Q1', read('reports', '2023Q1'))
        self.assertTrue(close(r['is_q']['written'][0], 12240502328))
        self.assertTrue(close(r['is_q']['netIncome'][0], 896868299))
        self.assertTrue(close(r['bs']['totalAssets'][0], 77701397555))


class SificTests(unittest.TestCase):
    """SIFIC filings (coded CNSF formats): cash flow, balance sheet, cumulative income statement."""

    def test_2026Q2_cash_flow_and_balance(self):
        s = bd.parse_sific('2026Q2', read('sific', '2026Q2'))
        self.assertTrue(close(s['cf_ytd']['cashEnd'][0], 2205311172))
        self.assertTrue(close(s['cf_ytd']['netChangeCash'][0], -825935257))
        self.assertTrue(close(s['cf_ytd']['netIncome'][0], 2943860696))
        self.assertTrue(close(s['bs']['totalAssets'][0], 123701686259))
        self.assertTrue(close(s['is_ytd']['written'][0], 39022113441))
        # the two columns are current period and prior-year comparative
        self.assertEqual(len(s['cf_ytd']['cashEnd']), 2)

    def test_2024Q3_cash_flow(self):
        s = bd.parse_sific('2024Q3', read('sific', '2024Q3'))
        self.assertTrue(close(s['cf_ytd']['cashEnd'][0], 2845990918))
        self.assertTrue(close(s['bs']['totalAssets'][0], 100723251668))

    def test_image_only_filing_is_detected(self):
        # a filing whose text layer is (nearly) empty must be treated as image-only, never parsed as zeros
        s = bd.parse_sific('2000Q1', '=== PAGE 1 ===\n')
        self.assertEqual(s['cf_ytd'], {}); self.assertEqual(s['bs'], {})


class HelperTests(unittest.TestCase):
    def test_tokens_handle_cnsf_negatives_and_dashes(self):
        # "(-)" is the CNSF deduction marker, not a number; parentheses and an attached "-" are negatives
        self.assertEqual([t[0] for t in bd.tokens('(-) Primas cedidas 262,401,123 245,000,000')], [262401123, 245000000])
        self.assertEqual([t[0] for t in bd.tokens('Otros (1,234) -5,000 5.5%')], [-1234, -5000, 5.5])
        self.assertEqual([t[0] for t in bd.tokens('Operaciones discontinuadas - -')], [0, 0])
        self.assertEqual(bd.label_of('(-) Comisiones por Reaseguro Cedido 1,000 2,000'), 'comisiones por reaseguro cedido')

    def test_quarter_ids(self):
        self.assertEqual(bd.qid_parts('2026Q2'), (2026, 2)); self.assertEqual(bd.prev_year_q('2026Q1'), '2025Q1')


if __name__ == '__main__':
    unittest.main(verbosity=1)
