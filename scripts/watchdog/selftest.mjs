// Offline checks of the watchdog's rules (scripts/watchdog/lib.mjs). Run before every check:
//   node scripts/watchdog/selftest.mjs
import assert from 'node:assert/strict';
import { cronMatcher, dueTimes, cronsInWorkflow, refreshLandedBySteps, verdict, cdmx, isSession, sessionBefore, sessionAfter, zonedToUtc, requiredSession, priceVerdict, lastCsvDate, jsonDate } from './lib.mjs';

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

// NYSE sessions: weekends and the exchange's holidays are not sessions; early closes are
assert.equal(isSession('NYSE', '2026-10-05'), true);    // Monday
assert.equal(isSession('NYSE', '2026-10-03'), false);   // Saturday
assert.equal(isSession('NYSE', '2026-11-26'), false);   // Thanksgiving
assert.equal(isSession('NYSE', '2026-11-27'), true);    // the early close after it is a session
assert.equal(isSession('NYSE', '2027-12-24'), false);   // Christmas 2027 falls on Saturday: closed the Friday before
assert.equal(isSession('NYSE', '2027-12-31'), true);    // New Year 2028 falls on Saturday: year-end Friday stays open
assert.equal(sessionBefore('NYSE', '2026-10-05'), '2026-10-02');
assert.equal(sessionBefore('NYSE', '2026-10-05', 2), '2026-10-01');
assert.equal(sessionAfter('NYSE', '2026-11-25'), '2026-11-27');
assert.throws(() => isSession('BMV', '2026-10-05'), /no session calendar/);
// New York clock → UTC (EDT in October, EST in December)
assert.equal(new Date(zonedToUtc('America/New_York', '2026-10-05', '16:00')).toISOString(), '2026-10-05T20:00:00.000Z');
assert.equal(new Date(zonedToUtc('America/New_York', '2026-12-07', '16:00')).toISOString(), '2026-12-07T21:00:00.000Z');
assert.equal(new Date(zonedToUtc('America/New_York', '2026-03-08', '03:00')).toISOString(), '2026-03-08T07:00:00.000Z');  // spring-forward day: 03:00 is EDT
assert.equal(new Date(zonedToUtc('America/New_York', '2026-11-01', '03:00')).toISOString(), '2026-11-01T08:00:00.000Z');  // fall-back day: 03:00 is EST
assert.equal(new Date(zonedToUtc('America/New_York', '2026-03-08', '16:00')).toISOString(), '2026-03-08T20:00:00.000Z');
// required session with 5 h settle (the nightly routine runs at 19:58 New York): Monday's close is required from 21:00 ET
const rq = (iso) => requiredSession({ exchange: 'NYSE', now: t(iso), settleHours: 5 });
assert.equal(rq('2026-10-05T23:50:00Z').session, '2026-10-02');            // Monday 19:50 ET: still Friday's
assert.equal(rq('2026-10-06T01:00:00Z').session, '2026-10-05');            // Monday 21:00 ET: Monday's
assert.equal(rq('2026-10-06T15:50:00Z').session, '2026-10-05');            // Tuesday 11:50 ET: Monday's
assert.equal(rq('2026-10-06T15:50:00Z').next.session, '2026-10-06');
assert.equal(rq('2026-10-06T15:50:00Z').next.requiredFrom, '2026-10-07T01:00:00Z');
assert.equal(rq('2026-10-11T03:50:00Z').session, '2026-10-09');            // Saturday: Friday's
assert.equal(rq('2026-11-27T03:50:00Z').session, '2026-11-25');            // Thanksgiving night: Wednesday's
assert.equal(rq('2026-10-06T15:50:00Z').covered, true);
assert.deepEqual(rq('2029-01-02T15:50:00Z'), { session: null, requiredFrom: null, next: null, covered: false });  // 2029: calendar not maintained that far, no guessed session
assert.equal(rq('2029-01-01T15:50:00Z').covered, false);                   // the first check whose next session is in 2029
assert.equal(rq('2028-12-29T15:50:00Z').covered, true);
assert.equal(rq('2025-12-26T15:00:00Z').covered, false);                   // before the calendar's first year (2025-12-25 would pass as a session)
// price verdict: every feed at the required session → ok; one behind → stale; a lagging publisher gets its sessions
const px = (now, series) => priceVerdict({ exchange: 'NYSE', now: t(now), settleHours: 5, series });
assert.equal(px('2026-10-06T15:50:00Z', [{ name: 'a', date: '2026-10-05' }, { name: 'b', date: '2026-10-05' }]).status, 'ok');
assert.equal(px('2026-10-06T15:50:00Z', [{ name: 'a', date: '2026-10-05' }, { name: 'b', date: '2026-10-02' }]).status, 'stale');
assert.equal(px('2026-10-06T15:50:00Z', [{ name: 'a', date: '2026-10-02', lagSessions: 1 }]).status, 'ok');
assert.equal(px('2026-10-06T15:50:00Z', [{ name: 'a', date: '2026-10-01', lagSessions: 1 }]).status, 'stale');
assert.equal(px('2026-10-06T15:50:00Z', [{ name: 'a', date: null }]).status, 'stale');
assert.equal(px('2026-10-06T15:50:00Z', [{ name: 'a', date: '2026-10-06' }]).status, 'ok');   // ahead is never stale
const un = px('2029-01-02T15:50:00Z', [{ name: 'a', date: '2028-12-29' }]);
assert.equal(un.status, 'unverified'); assert.equal(un.expected, null); assert.equal(un.next, null); assert.deepEqual(un.series[0], { name: 'a', date: '2028-12-29', needed: null, ok: null });
assert.deepEqual(px('2026-10-06T15:50:00Z', [{ name: 'a', date: '2026-10-02' }]).series[0], { name: 'a', date: '2026-10-02', needed: '2026-10-05', ok: false });
// readers
assert.equal(lastCsvDate('Date,Close\n2026-10-02,1\n2026-10-05,2\n'), '2026-10-05');
assert.equal(lastCsvDate('Date,Close\n2026-10-02,1\n2026-10-05,2\n2026-10-\n'), '2026-10-05');  // partial trailing line ignored
assert.equal(lastCsvDate('Date,Close\n'), null);
assert.equal(jsonDate({ price_date: '2026-10-05' }, 'price_date'), '2026-10-05');
assert.equal(jsonDate({ a: { b: '2026-10-05T12:00:00Z' } }, 'a.b'), '2026-10-05');
assert.equal(jsonDate({ a: {} }, 'a.b'), null);

console.log('watchdog selftest: all checks passed');
