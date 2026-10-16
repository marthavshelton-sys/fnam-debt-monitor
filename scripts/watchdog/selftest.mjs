// Offline checks of the watchdog's rules (scripts/watchdog/lib.mjs). Run before every check:
//   node scripts/watchdog/selftest.mjs
import assert from 'node:assert/strict';
import { cronFromTitle, normCron, cronMatcher, dueTimes, cronsInWorkflow, refreshLandedBySteps, attemptRecord, verdict, perCronLate, handRunsToCheck, creditHandRun, cdmx, isSession, sessionBefore, sessionAfter, zonedToUtc, requiredSession, priceVerdict, requiredMonth, monthlyVerdict, lastCsvDate, jsonDate, jsonMonth } from './lib.mjs';

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

// the newest scheduled run as one record: a run that committed and then failed is the landed refresh, not a failure beside it
const run = (id, conclusion, at) => ({ id, conclusion, updated_at: at });
assert.deepEqual(attemptRecord(run(2, 'failure', '2026-10-09T15:10:21Z'), { run: run(2, 'failure', '2026-10-09T15:10:21Z'), afterCommitFailure: true }), { at: '2026-10-09T15:10:21Z', result: 'success', afterCommitFailure: true });
assert.deepEqual(attemptRecord(run(3, 'failure', '2026-10-09T23:03:00Z'), { run: run(2, 'success', '2026-10-09T15:10:21Z') }), { at: '2026-10-09T23:03:00Z', result: 'failure' });
assert.deepEqual(attemptRecord(run(2, 'success', '2026-10-09T15:10:21Z'), { run: run(2, 'success', '2026-10-09T15:10:21Z') }), { at: '2026-10-09T15:10:21Z', result: 'success' });
assert.deepEqual(attemptRecord(run(4, 'cancelled', '2026-10-10T15:10:21Z'), null), { at: '2026-10-10T15:10:21Z', result: 'cancelled' });
assert.equal(attemptRecord(null, null), null);

// verdicts: weekdays 19:30 UTC, 3 h grace
const base = { crons: ['30 19 * * 1-5'], graceMs: 3 * H, lookbackMs: 14 * 24 * H, openAlerts: 0 };
// Monday 12:00: the last due time is Friday 19:30; Friday's success covers it
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-10-02T19:35:00Z' }).status, 'ok');
// ...but Thursday's does not: one missed refresh is late (the same-day rule, 9-Oct-2026)
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-10-01T19:36:00Z' }).status, 'late');
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-10-01T19:36:00Z' }).requiredSince, t('2026-10-02T19:30:00Z'));
// the 8-Oct-2026 case: the 19:30 run failed, the 03:50 UTC check the same night (21:50 in Mexico City) flags it
assert.equal(verdict({ ...base, now: t('2026-10-09T03:50:00Z'), lastLandedCreatedAt: '2026-10-07T19:39:25Z' }).status, 'late');
// Monday 21:00: Monday's slot is inside the grace, so Friday's success still covers it
assert.equal(verdict({ ...base, now: t('2026-10-05T21:00:00Z'), lastLandedCreatedAt: '2026-10-02T19:35:00Z' }).status, 'ok');
// Monday 22:31: the grace is over and Monday's refresh has not landed
assert.equal(verdict({ ...base, now: t('2026-10-05T22:31:00Z'), lastLandedCreatedAt: '2026-10-02T19:35:00Z' }).status, 'late');
assert.equal(verdict({ ...base, now: t('2026-10-05T22:31:00Z'), lastLandedCreatedAt: '2026-10-05T19:36:00Z' }).status, 'ok');
// never succeeded
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: null }).status, 'late');
// on time with an open pipeline alert
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-10-02T19:35:00Z', openAlerts: 1 }).status, 'alert');
// late wins over alert
assert.equal(verdict({ ...base, now: t('2026-10-05T12:00:00Z'), lastLandedCreatedAt: '2026-09-29T19:35:00Z', openAlerts: 2 }).status, 'late');

// per-schedule lateness: ASUR 8–9 Oct 2026, filings cron 14:40 failing while the market cron 22:50 keeps landing (one miss is
// enough, the same-day rule); a run belongs to the latest due time of any cron at or before its start
const two = { crons: ['40 14 * * 1-5', '50 22 * * 1-5'], graceMs: 3 * H, lookbackMs: 14 * 24 * H };
const runsA = [{ createdAt: '2026-10-09T14:54:49Z', landed: false }, { createdAt: '2026-10-08T22:59:08Z', landed: true }, { createdAt: '2026-10-08T14:54:11Z', landed: false }, { createdAt: '2026-10-07T22:58:05Z', landed: true }, { createdAt: '2026-10-07T14:51:56Z', landed: true }, { createdAt: '2026-10-06T22:57:20Z', landed: true }];
assert.equal(verdict({ ...two, now: t('2026-10-09T15:50:00Z'), lastLandedCreatedAt: '2026-10-08T22:59:08Z', openAlerts: 0 }).status, 'ok');   // the workflow-level rule is fooled by the market run
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T15:50:00Z'), runs: runsA }).map((x) => x.cron), ['40 14 * * 1-5']);               // 8-Oct 14:40 (the last filings due time past the grace) has no landed run
assert.equal(new Date(perCronLate({ ...two, now: t('2026-10-09T15:50:00Z'), runs: runsA })[0].missedSince).toISOString(), '2026-10-08T14:40:00.000Z');
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: runsA }).map((x) => x.cron), ['40 14 * * 1-5']);               // 9-Oct 14:40 missed too

// ---- the cron named in a run's title (run-name since 16-Oct-2026) decides which slot the run covers ----
assert.equal(cronFromTitle('Refresh Oracle model data (cron 35 20 * * 1-5)'), '35 20 * * 1-5');
assert.equal(cronFromTitle('Refresh macro dashboard (cron  50 12,13 * * 1-5 )'), '50 12,13 * * 1-5');
assert.equal(cronFromTitle('Refresh Oracle model data'), null);
assert.equal(cronFromTitle('Refresh Oracle model data (by hand)'), null);
assert.equal(cronFromTitle(null), null);
assert.equal(normCron(' 35  20 * * 1-5 '), '35 20 * * 1-5');
// Oracle, 15-Oct-2026: the 20:35 schedule started at 23:15 (after the 21:45 due time) and the 21:45 one at 23:52; the 13:30 one at 17:49.
const orc = { crons: ['35 20 * * 1-5', '45 21 * * 1-5', '30 13 * * *'], graceMs: 3 * H, lookbackMs: 14 * 24 * H };
const orcRuns = (named) => [
  { createdAt: '2026-10-15T23:52:33Z', landed: true, cron: named ? '45 21 * * 1-5' : null },
  { createdAt: '2026-10-15T23:14:59Z', landed: true, cron: named ? '35 20 * * 1-5' : null },
  { createdAt: '2026-10-15T17:49:26Z', landed: true, cron: named ? '30 13 * * *' : null },
  { createdAt: '2026-10-15T00:06:44Z', landed: true, cron: named ? '45 21 * * 1-5' : null },
  { createdAt: '2026-10-14T23:24:38Z', landed: true, cron: named ? '35 20 * * 1-5' : null },
  { createdAt: '2026-10-14T18:04:50Z', landed: true, cron: named ? '30 13 * * *' : null },
];
assert.deepEqual(perCronLate({ ...orc, now: t('2026-10-16T08:31:00Z'), runs: orcRuns(false) }).map((x) => x.cron), ['35 20 * * 1-5']);  // by start time: 23:15 is booked as the 21:45 run, 20:35 reads late (the 16-Oct verdict)
assert.deepEqual(perCronLate({ ...orc, now: t('2026-10-16T08:31:00Z'), runs: orcRuns(true) }), []);                                   // by title: each run covers its own cron
// a run naming a cron the workflow no longer has falls back to the start-time rule
assert.deepEqual(perCronLate({ ...orc, now: t('2026-10-16T08:31:00Z'), runs: [{ createdAt: '2026-10-15T23:14:59Z', landed: true, cron: '0 20 * * 1-5' }, ...orcRuns(true).slice(2)] }).map((x) => x.cron), ['35 20 * * 1-5']);
// a named run never covers a slot after its start, and a failed named run covers nothing
assert.deepEqual(perCronLate({ ...orc, now: t('2026-10-16T08:31:00Z'), runs: [{ createdAt: '2026-10-15T23:14:59Z', landed: false, cron: '35 20 * * 1-5' }, orcRuns(true)[0], ...orcRuns(true).slice(2)] }).map((x) => x.cron), ['35 20 * * 1-5']);
assert.deepEqual(perCronLate({ ...orc, now: t('2026-10-16T08:31:00Z'), runs: [{ createdAt: '2026-10-15T20:00:00Z', landed: true, cron: '35 20 * * 1-5' }, orcRuns(true)[0], ...orcRuns(true).slice(2)] }).map((x) => x.cron), ['35 20 * * 1-5']);  // started before its due time: covers the previous day's slot only
// U.S. macro, 15-Oct-2026: the 12:50 schedule started at 17:24 (after 14:05, 14:45 and 15:45 were due) and read late for days by start time
const mac = { crons: ['50 12,13 * * 1-5', '5 14,20 * * *', '45 14,15 * * 3', '20 17 * * 4'], graceMs: 12 * H, lookbackMs: 14 * 24 * H };
const macRuns = [{ createdAt: '2026-10-15T22:58:12Z', landed: true, cron: '5 14,20 * * *' }, { createdAt: '2026-10-15T18:08:09Z', landed: true, cron: '50 12,13 * * 1-5' }, { createdAt: '2026-10-15T17:43:05Z', landed: true, cron: '20 17 * * 4' }, { createdAt: '2026-10-15T17:24:00Z', landed: true, cron: '50 12,13 * * 1-5' }, { createdAt: '2026-10-14T23:04:58Z', landed: true, cron: '5 14,20 * * *' }, { createdAt: '2026-10-14T19:42:09Z', landed: true, cron: '45 14,15 * * 3' }, { createdAt: '2026-10-14T18:25:25Z', landed: true, cron: '45 14,15 * * 3' }, { createdAt: '2026-10-14T17:37:48Z', landed: true, cron: '5 14,20 * * *' }, { createdAt: '2026-10-14T15:12:24Z', landed: true, cron: '50 12,13 * * 1-5' }];
assert.deepEqual(perCronLate({ ...mac, now: t('2026-10-16T08:31:00Z'), runs: macRuns }), []);
assert.deepEqual(perCronLate({ ...mac, now: t('2026-10-16T08:31:00Z'), runs: macRuns.map((r) => ({ ...r, cron: null })) }).map((x) => x.cron), ['50 12,13 * * 1-5']);
// a newer covered slot of the same cron makes an older miss moot (Mexican Consumer, 16-Oct-2026 18:17: the judged slot was
// 15-Oct 12:20, uncovered, while a hand run at 18:08 covered 16-Oct 12:20; a newer slot of ANOTHER cron never does)
const mxc = { crons: ['20 12 * * *', '20 15 * * *', '20 23 * * *', '20 3 * * *'], graceMs: 12 * H, lookbackMs: 14 * 24 * H };
const mxcRuns = [{ createdAt: '2026-10-16T16:43:00Z', landed: true, cron: '20 15 * * *' }, { createdAt: '2026-10-16T08:19:09Z', landed: true, cron: null }, { createdAt: '2026-10-16T01:25:27Z', landed: true, cron: null }, { createdAt: '2026-10-15T19:10:54Z', landed: true, cron: null }, { createdAt: '2026-10-15T17:05:17Z', landed: true, cron: null }, { createdAt: '2026-10-15T08:26:51Z', landed: true, cron: null }];
assert.deepEqual(perCronLate({ ...mxc, now: t('2026-10-16T18:17:00Z'), runs: mxcRuns }).map((x) => x.cron), ['20 12 * * *']);
assert.deepEqual(perCronLate({ ...mxc, now: t('2026-10-16T18:17:00Z'), runs: [{ createdAt: '2026-10-16T18:08:18Z', landed: true, manual: true, crons: mxc.crons }, ...mxcRuns] }), []);
assert.deepEqual(perCronLate({ ...mxc, now: t('2026-10-16T18:17:00Z'), runs: [{ createdAt: '2026-10-16T17:30:00Z', landed: true, cron: '20 12 * * *' }, ...mxcRuns] }), []);         // a titled run of the cron itself, five hours late
assert.deepEqual(perCronLate({ ...mxc, now: t('2026-10-16T18:17:00Z'), runs: [{ createdAt: '2026-10-16T17:30:00Z', landed: true, cron: '20 15 * * *' }, ...mxcRuns] }).map((x) => x.cron), ['20 12 * * *']);  // a newer slot of another cron does not
// the 12 h grace: a schedule GitHub started five hours late is not late, a schedule missing for 13 hours is
assert.deepEqual(perCronLate({ crons: ['50 3,15 * * *'], graceMs: 12 * H, lookbackMs: 14 * 24 * H, now: t('2026-10-16T08:40:00Z'), runs: [{ createdAt: '2026-10-16T08:31:10Z', landed: true, cron: '50 3,15 * * *' }, { createdAt: '2026-10-15T19:27:37Z', landed: true, cron: '50 3,15 * * *' }] }), []);
assert.deepEqual(perCronLate({ crons: ['50 3,15 * * *'], graceMs: 12 * H, lookbackMs: 14 * 24 * H, now: t('2026-10-16T04:51:00Z'), runs: [{ createdAt: '2026-10-15T08:36:44Z', landed: true, cron: '50 3,15 * * *' }] }).map((x) => new Date(x.missedSince).toISOString()), ['2026-10-15T15:50:00.000Z']);
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: [...runsA, { createdAt: '2026-10-09T15:10:00Z', landed: true }] }).map((x) => x.cron), []); // a landed run 30 min late belongs to 14:40
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: [...runsA, { createdAt: '2026-10-09T19:10:00Z', landed: true }] }).map((x) => x.cron), []); // and one 4.5 h late still does (no fixed window)
// a dashboard's first day (American Consumer, merged 11-Oct-2026 18:03 UTC, a hand run right after): the 21:40 schedule of the
// evening before could not have run; with the dashboard's `since` it is not a miss, and a real miss afterwards still is
const cons = { crons: ['10 14 * * *', '40 21 * * *'], graceMs: 3 * H, lookbackMs: 14 * 24 * H }, consHand = [{ createdAt: '2026-10-11T18:03:36Z', landed: true, manual: true }], consSince = t('2026-10-11T18:03:29Z');
const consSched = [{ createdAt: '2026-10-11T18:03:36Z', landed: true }]; // the same instant as a scheduled run: it covers only 14:10
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-11T18:30:00Z'), runs: consSched }).map((x) => x.cron), ['40 21 * * *']);
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-11T18:30:00Z'), runs: consSched, since: consSince }).map((x) => x.cron), []);
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-11T18:30:00Z'), runs: consHand }).map((x) => x.cron), []);              // a hand run stands in for 10-Oct 21:40 too (12-Oct-2026 rule)
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-11T18:30:00Z'), runs: consHand, since: consSince }).map((x) => x.cron), []);
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-12T03:50:00Z'), runs: [...consHand, { createdAt: '2026-10-11T21:52:00Z', landed: true }], since: consSince }).map((x) => x.cron), []);
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-12T03:50:00Z'), runs: consHand, since: consSince }).map((x) => x.cron), ['40 21 * * *']);
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-10T03:00:00Z'), runs: [...runsA, { createdAt: '2026-10-09T23:10:00Z', landed: true }] }).map((x) => x.cron), ['40 14 * * 1-5']); // a run after the market cron's due time belongs to the market cron
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-07T18:00:00Z'), runs: runsA }).map((x) => x.cron), []);                               // 7-Oct: both crons landed
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-05T12:00:00Z'), runs: [] }).map((x) => x.cron), ['40 14 * * 1-5', '50 22 * * 1-5']);    // nothing ever landed
// the MX macro weekend cron (15:25 UTC Sat/Sun): GitHub started the 3–4 Oct 2026 runs four and five hours late; they still count
const wk = { crons: ['25 15 * * 0,6', '40 13 * * 1-5'], graceMs: 3 * H, lookbackMs: 14 * 24 * H };
const wkRuns = [{ createdAt: '2026-10-05T13:45:00Z', landed: true }, { createdAt: '2026-10-04T20:43:54Z', landed: true }, { createdAt: '2026-10-03T19:43:29Z', landed: true }, { createdAt: '2026-10-02T13:46:00Z', landed: true }];
assert.deepEqual(perCronLate({ ...wk, now: t('2026-10-05T22:00:00Z'), runs: wkRuns }).map((x) => x.cron), []);
assert.deepEqual(perCronLate({ ...wk, now: t('2026-10-05T22:00:00Z'), runs: wkRuns.filter((r) => !/10-04/.test(r.createdAt)) }).map((x) => x.cron), ['25 15 * * 0,6']); // Sunday's run missing
// a weekend-only cron whose runs fell off the fetched page is not judged before `since` (the oldest run fetched)
assert.deepEqual(perCronLate({ ...wk, now: t('2026-10-09T22:00:00Z'), runs: [{ createdAt: '2026-10-09T13:45:00Z', landed: true }, { createdAt: '2026-10-08T13:44:00Z', landed: true }], since: t('2026-10-08T13:44:00Z') }).map((x) => x.cron), []);
// a refresh re-run by hand on main: ASUR, Friday 9-Oct-2026. The 14:40 schedule failed (14:54), a hand run at 22:34 landed the
// filings, the 22:50 market schedule landed at 22:58. On Sunday the hand run must still cover the 14:40 due time (until
// 11-Oct-2026 the credit stopped at the first hand run older than the newest scheduled landed run: "late" all weekend)
const hand = { id: 52, created_at: '2026-10-09T22:34:05Z', head_branch: 'main', conclusion: 'success' };
const sched = { id: 53, created_at: '2026-10-09T22:58:53Z', conclusion: 'success' };
const handPage = [{ id: 60, created_at: '2026-10-09T22:40:00Z', head_branch: 'claude/a-branch', conclusion: 'success' }, hand, { id: 40, created_at: '2026-09-20T12:00:00Z', head_branch: 'main', conclusion: 'success' }];
assert.deepEqual(handRunsToCheck(handPage, { now: t('2026-10-11T15:58:00Z'), lookbackMs: 14 * 24 * H }).map((r) => r.id), [52]);  // main only, within the lookback; a newer scheduled run cuts nothing
const fri = [{ createdAt: '2026-10-09T22:58:53Z', landed: true }, ...runsA];
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-11T15:58:00Z'), runs: fri }).map((x) => x.cron), ['40 14 * * 1-5']);        // without the hand run: the weekend's false "late"
const credited = [...fri];
const last = creditHandRun({ landed: { run: sched, afterCommitFailure: false }, recent: credited, run: hand });
assert.equal(last.run.id, 53);                                                                                                    // lastSuccess stays the newer scheduled run
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-11T15:58:00Z'), runs: credited }).map((x) => x.cron), []);                // the hand run covers Friday 14:40
assert.equal(creditHandRun({ landed: { run: { created_at: '2026-10-08T22:59:08Z' } }, recent: [], run: hand }).run.id, 52);       // a hand run newer than every scheduled one is lastSuccess
assert.equal(creditHandRun({ landed: null, recent: [], run: hand, afterCommitFailure: true }).afterCommitFailure, true);
// schedules GitHub never started, 12-Oct-2026 (the runs as GitHub listed them). U.S. macro: no run for 13:50 UTC; later schedules
// landed at 21:52 and 22:01, which belong to 20:05. A hand run afterwards is credited to the latest due time of EACH schedule of
// its workflow before it, so it covers 13:50; a hand run before the missed slot does not.
const usm = { crons: ['50 12,13 * * 1-5', '5 14,20 * * *', '45 14,15 * * 3', '20 17 * * 4'], graceMs: 3 * H, lookbackMs: 14 * 24 * H, since: t('2026-10-11T14:14:42Z') }; // since: the oldest run of the fixture
const usmRuns = ['2026-10-12T22:01:22Z', '2026-10-12T21:52:54Z', '2026-10-12T13:21:38Z', '2026-10-11T20:14:36Z', '2026-10-11T14:14:42Z'].map((c) => ({ createdAt: c, landed: true }));
assert.deepEqual(perCronLate({ ...usm, now: t('2026-10-13T03:50:00Z'), runs: usmRuns }).map((x) => x.cron), ['50 12,13 * * 1-5']);
const usmHand = [];
creditHandRun({ landed: null, recent: usmHand, run: { id: 70, created_at: '2026-10-13T02:20:00Z' }, crons: usm.crons });
assert.deepEqual(usmHand[0].crons, usm.crons);
assert.deepEqual(perCronLate({ ...usm, now: t('2026-10-13T03:50:00Z'), runs: [...usmRuns, ...usmHand] }).map((x) => x.cron), []);
assert.deepEqual(perCronLate({ ...usm, now: t('2026-10-13T03:50:00Z'), runs: [...usmRuns, { createdAt: '2026-10-12T13:40:00Z', landed: true, manual: true }] }).map((x) => x.cron), ['50 12,13 * * 1-5']);
// a hand run of another workflow of the same dashboard never stands in for these schedules
assert.deepEqual(perCronLate({ ...usm, now: t('2026-10-13T03:50:00Z'), runs: [...usmRuns, { createdAt: '2026-10-13T02:20:00Z', landed: true, manual: true, crons: ['0 6 * * *'] }] }).map((x) => x.cron), ['50 12,13 * * 1-5']);
// a hand run that did not land (no commit) covers nothing
assert.deepEqual(perCronLate({ ...usm, now: t('2026-10-13T03:50:00Z'), runs: [...usmRuns, { createdAt: '2026-10-13T02:20:00Z', landed: false, manual: true }] }).map((x) => x.cron), ['50 12,13 * * 1-5']);
// American Consumer: no run for 14:10 UTC; the 21:40 schedule landed at 22:05
const consRuns = [{ createdAt: '2026-10-12T22:05:30Z', landed: true }, { createdAt: '2026-10-12T00:43:12Z', landed: true }, ...consHand];
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-13T03:50:00Z'), runs: consRuns, since: consSince }).map((x) => x.cron), ['10 14 * * *']);
assert.deepEqual(perCronLate({ ...cons, now: t('2026-10-13T03:50:00Z'), runs: [...consRuns, { createdAt: '2026-10-13T02:20:00Z', landed: true, manual: true }], since: consSince }).map((x) => x.cron), []);
// and the ASUR case is unchanged: a failed filings schedule stays late until a run lands for it
assert.deepEqual(perCronLate({ ...two, now: t('2026-10-09T18:00:00Z'), runs: runsA }).map((x) => x.cron), ['40 14 * * 1-5']);

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

// ---- dispatch-lib: which workflows the dispatcher would start, on a fake GitHub ----
{
  const { dispatchMissed } = await import('./dispatch-lib.mjs');
  const files = {
    'tools/watchdog/dashboards.json': JSON.stringify({ dashboards: [{ id: 'a', workflows: ['a.yml'] }, { id: 'b', workflows: ['b.yml'] }, { id: 'c', workflows: ['c.yml'] }] }),
    '.github/workflows/a.yml': 'on:\n  schedule:\n    - cron: "20 12 * * *"\n    - cron: "20 15 * * *"\n',
    '.github/workflows/b.yml': 'on:\n  schedule:\n    - cron: "35 20 * * 1-5"\n',
    '.github/workflows/c.yml': 'on:\n  schedule:\n    - cron: "30 17 * * *"\n',
    '.github/workflows/data-watchdog.yml': 'on:\n  schedule:\n    - cron: "50 3,15 * * *"\n',
  };
  const runsOf = {
    'a.yml': [{ created_at: '2026-10-16T16:43:00Z', event: 'schedule', status: 'completed', conclusion: 'success', display_title: 'A (cron 20 15 * * *)' }],   // 12:20 never started
    'b.yml': [{ created_at: '2026-10-16T20:36:00Z', event: 'schedule', status: 'in_progress', conclusion: null, display_title: 'B (cron 35 20 * * 1-5)' }],   // on time, running
    'c.yml': [{ created_at: '2026-10-16T18:05:00Z', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', display_title: 'C (by hand)' }],   // the hand run covers 17:30
    'data-watchdog.yml': [{ created_at: '2026-10-16T08:31:10Z', event: 'schedule', status: 'completed', conclusion: 'success', display_title: 'Data refresh watchdog (cron 50 3,15 * * *)' }], // 15:50 not started by 20:40
  };
  const calls = [];
  const api = async (path, init) => { calls.push({ path, method: (init && init.method) || 'GET' }); const m = /workflows\/([^/]+)\/(runs|dispatches)/.exec(path); if (m[2] === 'dispatches') return null; return { workflow_runs: runsOf[m[1]] }; };
  const report = await dispatchMissed({ readText: async (p) => files[p], api, now: t('2026-10-16T20:40:00Z'), leadMs: 40 * 6e4, includeSelf: true });
  const byFile = Object.fromEntries(report.map((w) => [w.file, w]));
  assert.deepEqual(byFile['a.yml'].missed.map((m) => m.cron), ['20 12 * * *']); assert.equal(byFile['a.yml'].dispatched, true);
  assert.deepEqual(byFile['b.yml'].missed, []); assert.equal(byFile['b.yml'].dispatched, undefined);  // yesterday's slot missed, but today's run of the same cron is in progress: moot
  assert.deepEqual(byFile['c.yml'].missed, []);
  assert.deepEqual(byFile['data-watchdog.yml'].missed.map((m) => m.due), ['2026-10-16T15:50:00.000Z']); assert.equal(byFile['data-watchdog.yml'].dispatched, true);
  assert.deepEqual(calls.filter((c) => c.method === 'POST').map((c) => c.path), ['/actions/workflows/a.yml/dispatches', '/actions/workflows/data-watchdog.yml/dispatches']);
  // a workflow with a run queued or in progress is never dispatched, even with a missed slot
  runsOf['b.yml'] = [{ created_at: '2026-10-16T20:36:00Z', event: 'schedule', status: 'queued', conclusion: null, display_title: 'B (cron 35 20 * * 1-5)' }, { created_at: '2026-10-15T23:52:00Z', event: 'schedule', status: 'completed', conclusion: 'success', display_title: 'B (cron 35 20 * * 1-5)' }];
  const r2 = await dispatchMissed({ readText: async (p) => files[p], api, now: t('2026-10-20T20:40:00Z'), leadMs: 40 * 6e4, dryRun: true });
  const b2 = r2.find((w) => w.file === 'b.yml'); assert.equal(b2.missed.length, 1); assert.equal(b2.skipped, 'a run is queued or in progress');
  // dry run dispatches nothing
  assert.equal(calls.filter((c) => c.method === 'POST').length, 2);
}
console.log('dispatch-lib ok');
