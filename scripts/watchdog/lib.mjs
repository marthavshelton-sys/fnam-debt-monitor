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
