// Pure helpers for the data-refresh watchdog (scripts/watchdog/check.mjs). No I/O here, so
// scripts/watchdog/selftest.mjs can exercise every rule offline.

// ---- cron (GitHub Actions: five fields, UTC) ----
function field(spec, lo, hi) {
  const out = new Set();
  for (const part of spec.split(',')) {
    const [range, stepText] = part.split('/');
    const step = stepText ? Number(stepText) : 1;
    let a, b;
    if (range === '*') { a = lo; b = hi; }
    else if (range.includes('-')) [a, b] = range.split('-').map(Number);
    else { a = Number(range); b = stepText ? hi : a; }
    if (![a, b, step].every(Number.isInteger) || step < 1 || a < lo || b > hi || a > b) throw new Error(`cron field "${spec}" not understood`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

export function cronMatcher(expr) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`cron "${expr}": expected five fields`);
  const [mi, ho, dom, mo, dow] = f;
  const M = field(mi, 0, 59), H = field(ho, 0, 23), D = field(dom, 1, 31), MO = field(mo, 1, 12), W = field(dow, 0, 7);
  if (W.has(7)) W.add(0);
  // Standard cron: when both day fields are restricted, either one matching is enough.
  const either = dom !== '*' && dow !== '*';
  return (d) => M.has(d.getUTCMinutes()) && H.has(d.getUTCHours()) && MO.has(d.getUTCMonth() + 1) &&
    (either ? D.has(d.getUTCDate()) || W.has(d.getUTCDay()) : D.has(d.getUTCDate()) && W.has(d.getUTCDay()));
}

// Every minute in [from, to] (ms) at which any of the cron expressions fires, ascending.
export function dueTimes(crons, from, to) {
  const matchers = crons.map(cronMatcher), out = [];
  for (let t = Math.ceil(from / 6e4) * 6e4; t <= to; t += 6e4) {
    const d = new Date(t);
    if (matchers.some((m) => m(d))) out.push(t);
  }
  return out;
}

export function cronsInWorkflow(yaml) {
  return [...yaml.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1]);
}

// ---- what counts as a refresh that landed ----
// A run that succeeded did. A failed run did too when its "Commit ..." step succeeded and no step
// before it failed: the steps after the commit are alerts and source-link checks, run once the data
// is already in main.
export function refreshLandedBySteps(jobs) {
  for (const job of jobs || []) {
    const steps = [...(job.steps || [])].sort((a, b) => a.number - b.number);
    const i = steps.findIndex((s) => /^commit\b/i.test(s.name || ''));
    if (i < 0) continue;
    return steps[i].conclusion === 'success' && !steps.slice(0, i).some((s) => s.conclusion === 'failure');
  }
  return false;
}

// ---- the newest scheduled run, as one record ----
// One run, one outcome: `result` is the refresh outcome of the newest completed scheduled run ('success' when its data landed,
// else the run's own conclusion: failure, cancelled, timed_out...). A run that committed its refresh and failed afterwards (a
// source-link check, an alert step) is the landed run, recorded as a success with afterCommitFailure: true, never as a failure
// at the same instant as the last landed refresh (OMA, 9-Oct-2026: the link check after the commit found a dead source link).
export function attemptRecord(attempt, landed) {
  if (!attempt) return null;
  const same = !!(landed && landed.run && landed.run.id === attempt.id);
  const rec = { at: isoSeconds(attempt.updated_at), result: same ? 'success' : attempt.conclusion };
  if (same && attempt.conclusion !== 'success') rec.afterCommitFailure = true;
  return rec;
}

// ---- the verdict ----
// late:  no landed scheduled refresh since the second-to-last time the schedule was due, counting only
//        due times at least `graceMs` old (two scheduled refreshes in a row failed or never ran);
// alert: on time, but an alert issue of the dashboard's own pipeline is open;
// ok:    on time, no alert open.
export function verdict({ crons, now, graceMs, lookbackMs, lastLandedCreatedAt, openAlerts }) {
  const due = dueTimes(crons, now - lookbackMs, now - graceMs);
  const requiredSince = due.length >= 2 ? due[due.length - 2] : due.length ? due[0] : null;
  const landed = lastLandedCreatedAt ? Date.parse(lastLandedCreatedAt) : null;
  const late = requiredSince !== null && (landed === null || landed < requiredSince);
  return { status: late ? 'late' : openAlerts > 0 ? 'alert' : 'ok', requiredSince };
}

export function isoSeconds(t) {
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// "01-Oct-2026 09:12 CDMX": the owner reads every timestamp in Mexico City time.
export function cdmx(t) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; });
  return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute} CDMX`;
}

// ---- price freshness: is every price feed at the last completed session? ----
// The owner's rule (6-Oct-2026): if any price on a page is not updated, the watchdog flashes red. A price feed is
// judged against the exchange's last completed session at check time, not against a workflow schedule, so a
// feed written by a cloud routine (the nightly FactSet refresh) is covered as well.
//
// Exchange calendars: weekdays minus the exchange's published holidays. NYSE: nyse.com/markets/hours-calendars
// (New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Good Friday, Memorial Day, Juneteenth, Independence Day,
// Labor Day, Thanksgiving, Christmas; a Saturday holiday closes the preceding Friday unless that Friday ends a
// month or year, a Sunday holiday closes the following Monday; early closes are still sessions). Extend the list
// before the last year runs out: outside `from`..`through`, the check reports "unverified" instead of guessing,
// and publishes no session the pages could act on.
export const EXCHANGES = {
  NYSE: {
    timeZone: 'America/New_York', close: '16:00', from: 2026, through: 2028,
    holidays: [
      '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
      '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
      '2028-01-17', '2028-02-21', '2028-04-14', '2028-05-29', '2028-06-19', '2028-07-04', '2028-09-04', '2028-11-23', '2028-12-25',
    ],
  },
  // Bolsa Mexicana de Valores: continuous trading ends 15:00 Mexico City (no daylight saving since 2022). Holidays from the
  // BMV's own "Calendario de días festivos" (bmv.com.mx → Grupo BMV), which lists one year at a time: 2026 copied on
  // 6-Oct-2026 and matched against the sessions FactSet carries for GAPB.MX through September; extend it every December
  // when the BMV publishes the next year (until then the price check reports `unverified` past 2026 rather than guess).
  BMV: {
    timeZone: 'America/Mexico_City', close: '15:00', from: 2026, through: 2026,
    holidays: [
      '2026-01-01', '2026-02-02', '2026-03-16', '2026-04-02', '2026-04-03', '2026-05-01', '2026-09-16', '2026-11-02', '2026-11-16', '2026-12-25',
      // 12-Dec-2026 (Día del empleado bancario) is a Saturday
    ],
  },
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayUtc = (date) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);

function exchangeOf(name) {
  const x = EXCHANGES[String(name || '').toUpperCase()];
  if (!x) throw new Error(`exchange "${name}": no session calendar (known: ${Object.keys(EXCHANGES).join(', ')})`);
  return x;
}

// The exchange's local date and hh:mm at instant t.
export function localParts(timeZone, t) {
  const p = {};
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; });
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}

// The UTC instant at which the exchange's clock reads `date` `hm`. Two offset corrections: the first lands on the right
// day, the second uses the offset in force at that instant, so a time on a daylight-saving change day is exact too
// (only a clock time that does not exist or repeats on such a day, 02:00-03:00, stays ambiguous; no close is there).
export function zonedToUtc(timeZone, date, hm) {
  const [h, m] = hm.split(':').map(Number);
  const target = dayUtc(date) + (h * 60 + m) * 6e4;
  let t = target;
  for (let pass = 0; pass < 2; pass++) {
    const local = localParts(timeZone, t);
    const localAsUtc = dayUtc(local.date) + (+local.hm.slice(0, 2) * 60 + +local.hm.slice(3)) * 6e4;
    t -= localAsUtc - target;
  }
  return t;
}

export function isSession(exchange, date) {
  const x = exchangeOf(exchange);
  if (!ISO_DATE.test(date)) throw new Error(`date "${date}" is not YYYY-MM-DD`);
  const dow = new Date(dayUtc(date)).getUTCDay();
  return dow !== 0 && dow !== 6 && !x.holidays.includes(date);
}

export function sessionBefore(exchange, date, n = 1) {
  let t = dayUtc(date), left = n;
  while (left > 0) { t -= 864e5; if (isSession(exchange, isoDay(t))) left--; }
  return isoDay(t);
}

export function sessionAfter(exchange, date) {
  let t = dayUtc(date);
  do { t += 864e5; } while (!isSession(exchange, isoDay(t)));
  return isoDay(t);
}

// The session whose close a price feed must carry at instant `now`: the latest session whose close plus
// `settleHours` (the time the nightly routine needs after the close) has already passed. Also the next session
// and the instant from which it becomes required, so a page can judge its own data between two watchdog
// checks. When the calendar does not cover the year of the required or the next session, `covered` is false and
// no session is returned at all: a guessed session must never reach the status file or the pages.
export function requiredSession({ exchange = 'NYSE', now, settleHours = 0 }) {
  const x = exchangeOf(exchange);
  const requiredAt = (s) => zonedToUtc(x.timeZone, s, x.close) + Math.round(settleHours * 3600) * 1000;
  const local = localParts(x.timeZone, now);
  let session = isSession(exchange, local.date) ? local.date : sessionBefore(exchange, local.date, 1);
  while (requiredAt(session) > now) session = sessionBefore(exchange, session, 1);
  const next = sessionAfter(exchange, session);
  const covered = +session.slice(0, 4) >= (x.from || 0) && +next.slice(0, 4) <= x.through;
  if (!covered) return { session: null, requiredFrom: null, next: null, covered: false };
  return { session, requiredFrom: isoSeconds(requiredAt(session)), next: { session: next, requiredFrom: isoSeconds(requiredAt(next)) }, covered };
}

// One verdict for a dashboard's price feeds. series: [{ name, date | null, lagSessions?, exchange? }]. A feed with
// lagSessions N (a publisher that only ever posts late) may trail the required session by N sessions; no feed uses
// it today. A series may name its own `exchange` (a dashboard that mixes a BMV listing with its NYSE ADS): its required
// session then follows that exchange's calendar and close, with the same settleHours. Outside a calendar: status
// 'unverified', no expected or next session from an uncovered calendar, every uncovered row with needed and ok null.
export function priceVerdict({ exchange = 'NYSE', now, settleHours = 0, series }) {
  const req = requiredSession({ exchange, now, settleHours });
  const reqOf = {};
  const reqFor = (x) => (reqOf[x] || (reqOf[x] = requiredSession({ exchange: x, now, settleHours })));
  let covered = req.covered;
  const rows = series.map((s) => {
    const ex = s.exchange ? String(s.exchange).toUpperCase() : null;
    const r = ex && ex !== String(exchange).toUpperCase() ? reqFor(ex) : req;
    if (!r.covered) { covered = false; return { name: s.name, date: s.date || null, needed: null, ok: null, ...(ex ? { exchange: ex } : {}) }; }
    const needed = s.lagSessions ? sessionBefore(ex || exchange, r.session, s.lagSessions) : r.session;
    const ok = !!(s.date && ISO_DATE.test(s.date) && s.date >= needed);
    return { name: s.name, date: s.date || null, needed, ok, ...(ex ? { exchange: ex } : {}) };
  });
  const status = !covered ? 'unverified' : rows.every((r) => r.ok) ? 'ok' : 'stale';
  return { status, exchange: String(exchange).toUpperCase(), expected: req.session, requiredFrom: req.requiredFrom, next: req.next, series: rows };
}

// The last dated row of a daily CSV (Date first), scanning from the end past blank or partial lines.
export function lastCsvDate(text) {
  const lines = String(text).trim().split(/\r?\n/);
  for (let i = lines.length - 1; i > 0; i--) { const d = lines[i].split(',')[0].trim(); if (ISO_DATE.test(d)) return d; }
  return null;
}

// A date (YYYY-MM-DD, or the first ten characters of an ISO stamp) at a dotted path of a JSON object.
export function jsonDate(obj, path) {
  const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
}
