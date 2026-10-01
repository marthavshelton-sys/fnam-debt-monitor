// Offline checks of the watchdog's rules (scripts/watchdog/lib.mjs). Run before every check:
//   node scripts/watchdog/selftest.mjs
import assert from 'node:assert/strict';
import { cronMatcher, dueTimes, cronsInWorkflow, refreshLandedBySteps, verdict, cdmx } from './lib.mjs';

const t = (s) => Date.parse(s);
const H = 36e5;

// cron fields
assert.equal(cronMatcher('50 12 * * 1-5')(new Date('2026-10-01T12:50:00Z')), true);   // Thursday
assert.equal(cronMatcher('50 12 * * 1-5')(new Date('2026-10-03T12:50:00Z')), false);  // Saturday
assert.equal(cronMatcher('5 14,20 * * *')(new Date('2026-10-04T20:05:00Z')), true);
assert.equal(cronMatcher('25 15 * * 0,6')(new Date('2026-10-04T15:25:00Z')), true);   // Sunday
assert.equal(cronMatcher('*/15 * * * *')(new Date('2026-10-01T00:45:00Z')), true);
assert.equal(cronMatcher('0 9 1 * 1')(new Date('2026-10-05T09:00:00Z')), true);       // Monday, not the 1st: either day field
assert.throws(() => cronMatcher('61 * * * *'));
assert.deepEqual(cronsInWorkflow('on:\n  schedule:\n    - cron: "30 14 * * 1-5"   # filings\n    - cron: \'40 22 * * 1-5\'\n'), ['30 14 * * 1-5', '40 22 * * 1-5']);
assert.deepEqual(dueTimes(['30 19 * * 1-5'], t('2026-10-02T00:00:00Z'), t('2026-10-06T00:00:00Z')).map((x) => new Date(x).toISOString()),
  ['2026-10-02T19:30:00.000Z', '2026-10-05T19:30:00.000Z']);                            // Friday, then Monday

// a refresh that landed
const steps = (...c) => [{ steps: c.map(([name, conclusion], i) => ({ number: i + 1, name, conclusion })) }];
assert.equal(refreshLandedBySteps(steps(['Fetch', 'success'], ['Commit if anything changed', 'success'], ['Check source links', 'failure'])), true);
assert.equal(refreshLandedBySteps(steps(['Fetch', 'failure'], ['Commit if anything changed', 'success'])), false);
assert.equal(refreshLandedBySteps(steps(['Fetch', 'success'], ['Commit if anything changed', 'failure'])), false);
assert.equal(refreshLandedBySteps(steps(['Fetch', 'success'], ['Check source links', 'failure'])), false);  // no commit step

// verdicts: weekdays 19:30 UTC, 3 h grace
const base = { crons: ['30 19 * * 1-5'], graceMs: 3 * H, lookbackMs: 14 * 24 * H, openAlerts: 0 };
// Monday 12:00: due Thu and Fri 19:30; Thursday's success is enough (one miss is tolerated)
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-10-01T19:36:00Z' }).status, 'ok');
// ...but Wednesday's is not: Thursday and Friday both missed
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-09-30T19:36:00Z' }).status, 'late');
// Monday 21:00: Monday's slot is inside the grace, so Friday's success still covers it
assert.equal(verdict({ ...base, now: t('2026-10-05T21:00:00Z'), lastLandedCreatedAt: '2026-10-02T19:35:00Z' }).status, 'ok');
// never succeeded
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: null }).status, 'late');
// on time with an open pipeline alert
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-10-02T19:35:00Z', openAlerts: 1 }).status, 'alert');
// late wins over alert
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-09-29T19:35:00Z', openAlerts: 2 }).status, 'late');

// Mexico City time (UTC-6, no daylight saving since 2022)
assert.equal(cdmx('2026-10-01T15:12:00Z'), '01-Oct-2026 09:12 CDMX');

console.log('watchdog selftest: all checks passed');
