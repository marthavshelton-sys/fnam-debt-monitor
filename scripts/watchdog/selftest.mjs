// Offline checks of the watchdog's rules (scripts/watchdog/lib.mjs). Run before every check:
//   node scripts/watchdog/selftest.mjs
import assert from 'node:assert/strict';
import { cronMatcher, dueTimes, cronsInWorkflow, refreshLandedBySteps, verdict, perCronLate, cdmx, isSession, sessionBefore, sessionAfter, zonedToUtc, requiredSession, priceVerdict, requiredMonth, monthlyVerdict, lastCsvDate, jsonDate, jsonMonth } from './lib.mjs';

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

// per-schedule lateness: ASUR 8–9 Oct 2026, filings cron 14:40 failing twice while the market cron 22:50 keeps landing
const two = { crons: ['40 14 * * 1-5', '50 22 * * 1-5'], graceMs: 3 * H, lookbackMs: 14 * 24 * H };
const runsA = [{ createdAt: '2026-10-09T14:54:49Z', landed: false }, { createdAt: '2026-10-08T22:59:08Z', landed: true }, { createdAt: '2026-10-08T14:54:11Z', landed: false }, { createdAt: '2026-10-07T22:58:05Z', landed: true }, { createdAt: '2026-10-07T14:51:56Z', landed: true }];
assert.equal(verdict({ ...two, now: t('2026-10-09T15:50:00Z'), lastLandedCreatedAt: '2026-10-08T22:59:08Z', openAlerts: 0 }).status, 'ok');   // the combined rule is fooled
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T15:50:00Z'), runs: runsA }).map((x) => x.cron), []);                               // 9-Oct 14:40 is inside the grace: one miss so far
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: runsA }).map((x) => x.cron), ['40 14 * * 1-5']);               // after the grace: two filings runs in a row failed
assert.equal(new Date(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: runsA })[0].missedSince).toISOString(), '2026-10-08T14:40:00.000Z');
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: [...runsA, { createdAt: '2026-10-09T15:10:00Z', landed: true }] }).map((x) => x.cron), []); // a landed run 30 min late belongs to 14:40
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: [...runsA, { createdAt: '2026-10-09T19:10:00Z', landed: true }] }).map((x) => x.cron), []); // and one 4.5 h late still does (no fixed window)
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-10T03:00:00Z'), runs: [...runsA, { createdAt: '2026-10-09T23:10:00Z', landed: true }] }).map((x) => x.cron), ['40 14 * * 1-5']); // a run after the market cron's due time belongs to the market cron
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-05T12:00:00Z'), runs: [] }).map((x) => x.cron), ['40 14 * * 1-5', '50 22 * * 1-5']);    // nothing ever landed
// the MX macro weekend cron (15:25 UTC Sat/Sun): GitHub started the 3–4 Oct 2026 runs four and five hours late; they still count
const wk = { crons: ['25 15 * * 0,6', '40 13 * * 1-5'], graceMs: 3 * H, lookbackMs: 14 * 24 * H };
const wkRuns = [{ createdAt: '2026-10-05T13:45:00Z', landed: true }, { createdAt: '2026-10-04T20:43:54Z', landed: true }, { createdAt: '2026-10-03T19:43:29Z', landed: true }, { createdAt: '2026-10-02T13:46:00Z', landed: true }];
assert.deepEqual(perCronLate({ ...wk, now: t('2026-10-05T22:00:00Z'), runs: wkRuns }).map((x) => x.cron), []);
assert.deepEqual(perCronLate({ ...wk, now: t('2026-10-05T22:00:00Z'), runs: wkRuns.filter((r) => !/10-0[34]/.test(r.createdAt)) }).map((x) => x.cron), ['25 15 * * 0,6']); // both weekend runs missing
// a weekend-only cron whose runs fell off the fetched page is not judged before `since` (the oldest run fetched)
assert.deepEqual(perCronLate({ ...wk, now: t('2026-10-09T22:00:00Z'), runs: [{ createdAt: '2026-10-09T13:45:00Z', landed: true }, { createdAt: '2026-10-08T13:44:00Z', landed: true }], since: t('2026-10-08T13:44:00Z') }).map((x) => x.cron), []);

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
assert.throws(() => isSession('B3', '2026-10-05'), /no session calendar/);
// BMV sessions (calendar 2026 from the BMV's published holidays)
assert.equal(isSession('BMV', '2026-09-16'), false);    // Independence Day (NYSE open)
assert.equal(isSession('BMV', '2026-11-16'), false);    // Revolution Day observed (third Monday)
assert.equal(isSession('BMV', '2026-11-02'), false);    // Día de muertos
assert.equal(isSession('BMV', '2026-11-26'), true);     // US Thanksgiving: BMV open
assert.equal(isSession('BMV', '2026-12-11'), true);     // 12-Dec-2026 is a Saturday
assert.equal(sessionBefore('BMV', '2026-09-17'), '2026-09-15');
// BMV close 15:00 Mexico City (UTC-6 all year) + 5 h settle: Monday's close is required from 02:00 UTC
const rqB = (iso) => requiredSession({ exchange: 'BMV', now: t(iso), settleHours: 5 });
assert.equal(rqB('2026-10-06T01:00:00Z').session, '2026-10-02');
assert.equal(rqB('2026-10-06T02:00:00Z').session, '2026-10-05');
assert.equal(rqB('2026-10-06T02:00:00Z').next.requiredFrom, '2026-10-07T02:00:00Z');
assert.equal(rqB('2027-01-05T15:00:00Z').covered, false);                  // 2027 calendar not published yet
// New York clock → UTC (EDT in October, EST in December)
assert.equal(new Date(zonedToUtc('America/New_York', '2026-10-05', '16:00')).toISOString(), '2026-10-05T20:00:00.000Z');
assert.equal(new Date(zonedToUtc('America/New_York', '2026-12-07', '16:00')).toISOString(), '2026-12-07T21:00:00.000Z');
// On the daylight-saving change days the instant depends on the host's zone data (GitHub's runner and this sandbox differ by
// an hour at 03:00 on 8-Mar-2026), so those two are checked as round trips: the instant must read back as the clock time asked.
import { localParts } from './lib.mjs';
const roundTrip = (date, hm) => localParts('America/New_York', zonedToUtc('America/New_York', date, hm));
assert.deepEqual(roundTrip('2026-03-08', '03:00'), { date: '2026-03-08', hm: '03:00' });   // spring-forward day
assert.deepEqual(roundTrip('2026-11-01', '03:00'), { date: '2026-11-01', hm: '03:00' });   // fall-back day
assert.deepEqual(roundTrip('2026-03-08', '16:00'), { date: '2026-03-08', hm: '16:00' });
assert.deepEqual(roundTrip('2026-11-01', '16:00'), { date: '2026-11-01', hm: '16:00' });
console.log(`selftest host zone data: ${['2026-03-08T07:30:00Z', '2026-11-01T06:30:00Z'].map((iso) => `${iso} = New York ${localParts('America/New_York', Date.parse(iso)).hm}`).join('; ')} (node ${process.version}, icu ${process.versions.icu}, tz ${process.versions.tz})`);
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
// a BMV dashboard with its NYSE ADS as a second feed: on a Mexican holiday (16-Sep-2026, Wednesday) the ADS still needs
// Wednesday's close while the listing needs Tuesday's; the row records the series' own exchange
const pxB = (now, series) => priceVerdict({ exchange: 'BMV', now: t(now), settleHours: 5, series });
assert.equal(pxB('2026-09-17T15:00:00Z', [{ name: 'home', date: '2026-09-15' }, { name: 'ads', date: '2026-09-16', exchange: 'NYSE' }]).status, 'ok');
assert.equal(pxB('2026-09-17T15:00:00Z', [{ name: 'home', date: '2026-09-15' }, { name: 'ads', date: '2026-09-15', exchange: 'NYSE' }]).status, 'stale');
assert.deepEqual(pxB('2026-09-17T15:00:00Z', [{ name: 'ads', date: '2026-09-15', exchange: 'nyse' }]).series[0], { name: 'ads', date: '2026-09-15', needed: '2026-09-16', ok: false, exchange: 'NYSE' });
// on the US Independence Day holiday (3-Jul-2026 observed, a Friday) the ADS may trail while the BMV listing needs Friday's close
assert.equal(pxB('2026-07-04T15:00:00Z', [{ name: 'home', date: '2026-07-03' }, { name: 'ads', date: '2026-07-02', exchange: 'NYSE' }]).status, 'ok');
assert.equal(pxB('2027-01-05T15:00:00Z', [{ name: 'home', date: '2027-01-04' }, { name: 'ads', date: '2027-01-04', exchange: 'NYSE' }]).status, 'unverified');
assert.equal(jsonDate({ latestClose: { 'GAPB-MX': '2026-10-05' } }, 'latestClose.GAPB-MX'), '2026-10-05');
// monthly data feeds: the traffic file must carry September once 10-Oct has ended in Mexico City, August before that
const rm = (iso, dueDay = 10) => requiredMonth({ now: t(iso), dueDay });
assert.equal(rm('2026-10-09T21:00:00Z').month, '2026-08');                       // 9-Oct 15:00 CDMX: August still enough
assert.equal(rm('2026-10-11T05:59:00Z').month, '2026-08');                       // 10-Oct 23:59 CDMX
assert.equal(rm('2026-10-11T06:00:00Z').month, '2026-09');                       // 11-Oct 00:00 CDMX: September required
assert.equal(rm('2026-10-11T06:00:00Z').requiredFrom, '2026-10-11T06:00:00Z');
assert.deepEqual(rm('2026-10-11T06:00:00Z').next, { month: '2026-10', requiredFrom: '2026-11-11T06:00:00Z' });
assert.deepEqual(rm('2026-10-09T21:00:00Z').next, { month: '2026-09', requiredFrom: '2026-10-11T06:00:00Z' });
assert.equal(rm('2027-01-05T12:00:00Z').month, '2026-11');                       // year boundary
assert.equal(rm('2027-01-12T12:00:00Z').month, '2026-12');
assert.equal(rm('2026-10-06T12:00:00Z', 5).month, '2026-09');                    // a publisher with an earlier due day
assert.throws(() => requiredMonth({ now: t('2026-10-06T12:00:00Z'), dueDay: 31 }), /1–28/);
const mv = (iso, series) => monthlyVerdict({ now: t(iso), series });
assert.equal(mv('2026-10-09T21:00:00Z', [{ name: 'traffic', month: '2026-08' }]).status, 'ok');
assert.equal(mv('2026-10-11T06:00:00Z', [{ name: 'traffic', month: '2026-08' }]).status, 'stale');   // the ASUR case: a Sep release not parsed
assert.equal(mv('2026-10-11T06:00:00Z', [{ name: 'traffic', month: '2026-09' }]).status, 'ok');
assert.equal(mv('2026-10-11T06:00:00Z', [{ name: 'traffic', month: '2026-10' }]).status, 'ok');      // ahead is never stale
assert.equal(mv('2026-10-11T06:00:00Z', [{ name: 'traffic', month: null }]).status, 'stale');
assert.deepEqual(mv('2026-10-11T06:00:00Z', [{ name: 'traffic', month: '2026-08' }]).series[0], { name: 'traffic', month: '2026-08', needed: '2026-09', ok: false, requiredFrom: '2026-10-11T06:00:00Z', next: { month: '2026-10', requiredFrom: '2026-11-11T06:00:00Z' } });
assert.equal(jsonMonth({ coverage: ['2014-12', '2026-09'] }, 'coverage.1'), '2026-09');
assert.equal(jsonMonth({ generatedAt: '2026-10-09T21:45:22.656Z' }, 'generatedAt'), '2026-10');
assert.equal(jsonMonth({ coverage: [] }, 'coverage.1'), null);

// readers
assert.equal(lastCsvDate('Date,Close\n2026-10-02,1\n2026-10-05,2\n'), '2026-10-05');
assert.equal(lastCsvDate('Date,Close\n2026-10-02,1\n2026-10-05,2\n2026-10-\n'), '2026-10-05');  // partial trailing line ignored
assert.equal(lastCsvDate('Date,Close\n'), null);
assert.equal(jsonDate({ price_date: '2026-10-05' }, 'price_date'), '2026-10-05');
assert.equal(jsonDate({ a: { b: '2026-10-05T12:00:00Z' } }, 'a.b'), '2026-10-05');
assert.equal(jsonDate({ a: {} }, 'a.b'), null);

console.log('watchdog selftest: all checks passed');
