// Self-test of scripts/lib/fred.mjs: the checks that keep an HTML page or a broken body out of the data files.
// Runs offline (no network); `node scripts/lib/fred-selftest.mjs` exits non-zero on the first failure.
import { checkCsv, checkJson, isFredUrl } from './fred.mjs';

const cases = [
  ['CSV ok (observation_date header)', checkCsv('observation_date,DFEDTARU\n2026-10-01,4.25\n2026-10-02,.\n'), null],
  ['CSV ok (legacy DATE header)', checkCsv('DATE,SP500\n2026-10-01,6700.5\n'), null],
  ['CSV rejects the 21-Oct-2026 HTML answer', checkCsv('<!DOCTYPE html>\n<html><head><link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400"></head></html>'), /not a FRED CSV/],
  ['CSV rejects an undated row', checkCsv('observation_date,X\n2026-10-01,1\nfoo,2\n'), /row 2 is not dated/],
  ['CSV rejects an empty export', checkCsv('observation_date,X\n'), /no observations/],
  ['JSON ok', checkJson('{"observations":[{"date":"2026-10-01","value":"1"}]}'), null],
  ['JSON rejects HTML', checkJson('<!doctype html><html></html>'), /not JSON/],
  ['JSON rejects FRED error', checkJson('{"error_code":400,"error_message":"Bad Request. The series does not exist."}'), /FRED error 400/],
  ['JSON rejects an array', checkJson('[1,2]'), /not an object/],
  ['host check', isFredUrl('https://api.stlouisfed.org/fred/series?series_id=X') && isFredUrl('https://fred.stlouisfed.org/graph/fredgraph.csv?id=X') && !isFredUrl('https://example.com/'), true],
];
let bad = 0;
for (const [name, got, want] of cases) {
  const ok = want === null ? got === null : want === true ? got === true : (typeof got === 'string' && want.test(got));
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` -> ${JSON.stringify(got)}`}`);
  if (!ok) bad++;
}
if (bad) { console.error(`${bad} failure(s)`); process.exit(1); }
console.log('fred.mjs self-test passed');
