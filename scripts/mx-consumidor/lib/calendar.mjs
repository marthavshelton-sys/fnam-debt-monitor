// Release calendar of the Mexican Consumer page: when each source's next period is published, by whom it is scheduled, and
// when it is late. Used by build.mjs (the page's "next release" lines and the due dates behind "no recent update"),
// build-companies.mjs (the reporting deadline of the next quarter) and pending.mjs (the daily task's worklist).
//
// Bases, in the order the page trusts them:
//   calendar  a date printed in the publisher's own calendar: INEGI's release calendar PDFs (read on every refresh,
//             raw/calendar.json), the dates Banco de México states on a release's page, the BIS's "next release date"
//   rule      a rule the publisher states on the release's page ("el primer día hábil bancario del mes a las 9:00"),
//             applied with the CNBV's banking holidays
//   usual     no published date: the usual lag after the end of the period (build.mjs -> ALLOW)
//   none      a survey whose next edition is not in the publisher's calendar yet, or the only edition
//
// Banking days: the CNBV's standing list of days banks close (DOF, published each December; 2026 list of 10-Dec-2025):
// 1 January, the first Monday of February, the third Monday of March, Holy Thursday and Good Friday, 1 May, 16 September,
// 2 November, the third Monday of November, 12 December and 25 December, plus 1 October in the years a new president takes
// office (2030, 2036).
const iso = (d) => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
function easter(y) {   // Anonymous Gregorian algorithm
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month, day);
}
const nthMonday = (y, m, n) => { const d = utc(y, m, 1); const add = (8 - d.getUTCDay()) % 7; return utc(y, m, 1 + add + 7 * (n - 1)); };
const HOL = new Map();
export function bankHolidays(y) {
  if (HOL.has(y)) return HOL.get(y);
  const e = easter(y), shift = (d, n) => new Date(d.getTime() + n * 864e5);
  const list = [utc(y, 1, 1), nthMonday(y, 2, 1), nthMonday(y, 3, 3), shift(e, -3), shift(e, -2), utc(y, 5, 1), utc(y, 9, 16), utc(y, 11, 2), nthMonday(y, 11, 3), utc(y, 12, 12), utc(y, 12, 25)];
  if ((y - 2030) % 6 === 0 && y >= 2030) list.push(utc(y, 10, 1));
  const set = new Set(list.map(iso)); HOL.set(y, set); return set;
}
export const isBankingDay = (s) => { const d = new Date(s + 'T00:00:00Z'), w = d.getUTCDay(); return w !== 0 && w !== 6 && !bankHolidays(d.getUTCFullYear()).has(s); };
export function addBankingDays(s, n) { let d = new Date(s + 'T00:00:00Z'), k = 0; while (k < n) { d = new Date(d.getTime() + 864e5); if (isBankingDay(iso(d))) k++; } return iso(d); }
export function firstBankingDay(y, m) { let d = utc(y, m, 1); while (!isBankingDay(iso(d))) d = new Date(d.getTime() + 864e5); return iso(d); }
export function lastBankingDay(y, m) { let d = utc(y, m + 1, 0); while (!isBankingDay(iso(d))) d = new Date(d.getTime() - 864e5); return iso(d); }

// periods as the page stamps them: "2026-08" (month), "2026-Q2" (quarter), "2024" (year)
export function nextPeriod(p) {
  let m;
  if ((m = /^(\d{4})-(\d{2})$/.exec(p))) { const y = +m[1], mo = +m[2]; return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; }
  if ((m = /^(\d{4})-Q([1-4])$/.exec(p))) { const y = +m[1], q = +m[2]; return q === 4 ? `${y + 1}-Q1` : `${y}-Q${q + 1}`; }
  if ((m = /^(\d{4})$/.exec(p))) return String(+m[1] + 1);
  return null;
}
const periodEndMonth = (p) => { let m; if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return [+m[1], +m[2]]; if ((m = /^(\d{4})-Q([1-4])$/.exec(p))) return [+m[1], +m[2] * 3]; return null; };
// a month `k` months after the period's last month
const monthAfter = (p, k) => { const e = periodEndMonth(p); if (!e) return null; const t = e[0] * 12 + (e[1] - 1) + k; return [Math.floor(t / 12), (t % 12) + 1]; };
// a period that sorts after another of the same kind ("2026-09" > "2026-08", "2026-Q3" > "2026-Q2")
const after = (a, b) => String(a) > String(b) && String(a).length === String(b).length;

// date a publisher's stated rule gives for a period
export function ruleDate(rule, period) {
  const mm = monthAfter(period, rule.monthsAfter || 1); if (!mm) return null;
  if (rule.rule === 'firstBankingDay') return firstBankingDay(mm[0], mm[1]);
  if (rule.rule === 'lastBankingDay') return lastBankingDay(mm[0], mm[1]);
  return null;
}

// The next release of a source after the period the page shows:
//   { date, period, time, basis, publisher, url, quote?, read? }  or  { basis: 'none', publisher, url, note } or null (usual timing)
// cfg = data/release-calendar.json; parsed = raw/calendar.json -> data (INEGI dates read from its PDFs); extra = { bis }
export function nextRelease(id, asOf, cfg, parsed, extra = {}) {
  if (!cfg || asOf == null) return null;
  const want = nextPeriod(String(asOf));
  const inegi = (cfg.inegi && cfg.inegi.sources) || {};
  if (inegi[id]) {
    const list = ((parsed && parsed.sources) || {})[id] || [];
    const hit = list.filter((x) => x.period && after(x.period, String(asOf))).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    const files = (parsed && parsed.files) || [];
    const url = (files.find((f) => hit && f.year === hit.date.slice(0, 4)) || files[files.length - 1] || {}).url || cfg.inegi.page || null;
    if (hit) return { date: hit.date, period: hit.period, time: (parsed && parsed.time) || cfg.inegi.time || null, basis: 'calendar', publisher: 'INEGI', url, graceDays: inegi[id].graceBankingDays };
    return { basis: 'gap', publisher: 'INEGI', period: want, url, note: 'the calendars on file carry no date for this period' };
  }
  const bx = (cfg.banxico || {})[id];
  if (bx) {
    if (bx.dates) {
      const hit = bx.dates.filter((x) => after(x.period, String(asOf))).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
      if (hit) return { date: hit.date, period: hit.period, time: bx.time || null, basis: 'calendar', publisher: 'Banco de México', url: bx.url, quote: bx.quote, read: bx.read, graceDays: bx.graceBankingDays };
      return { basis: 'gap', publisher: 'Banco de México', period: want, url: bx.url, note: 'the dates on file end before this period' };
    }
    if (bx.rule && want) return { date: ruleDate(bx, want), period: want, time: bx.time || null, basis: 'rule', publisher: 'Banco de México', url: bx.url, quote: bx.quote, read: bx.read, graceDays: bx.graceBankingDays };
  }
  const bisCfg = cfg.bis && cfg.bis.sources && cfg.bis.sources[id];
  if (bisCfg && extra.bis && extra.bis.next && want) return { date: extra.bis.next, period: want, time: null, basis: 'calendar', publisher: 'BIS', url: extra.bis.url || cfg.bis.url, graceDays: bisCfg.graceBankingDays };
  const ed = (cfg.editions || {})[id];
  if (ed) return { basis: 'none', publisher: ed.publisher, url: ed.url || null, period: ed.next || null, note: ed.note || null };
  return null;
}

// Reporting deadline of a company's results for a quarter (cfg.companies): BMV issuers file the first three quarters within the
// month after the quarter (Circular Única de Emisoras, art. 33, as amended in the DOF of 2-Dec-2025; the BMV's list of 2026 dates
// carries 30 April, 31 July and 30 October) and the preliminary fourth quarter by the date the BMV lists (27 February in 2026);
// U.S. domestic filers file the 10-Q within 40 days of the quarter and the 10-K within 60 (large accelerated filers); a foreign
// private issuer that lists only in New York has no quarterly deadline, so its usual lag after the quarter is used.
export function reportingDeadline(company, quarter, cfg, lastLagDays) {
  const c = (cfg && cfg.companies) || {}, m = /^(\d{4})-Q([1-4])$/.exec(quarter); if (!m) return null;
  const y = +m[1], q = +m[2];
  const listed = (c.bmvListed || []).includes(company.ticker) || !!company.bmv;
  if (listed) {
    const fixed = (c.bmvDates || {})[quarter];
    if (fixed) return { date: fixed, basis: 'calendar', who: 'BMV', url: c.bmvUrl };
    if (q < 4) return { date: lastBankingDay(y, q * 3 + 1), basis: 'rule', who: 'BMV', url: c.bmvUrl };
    return { date: lastBankingDay(y + 1, 2), basis: 'rule', who: 'BMV', url: c.bmvUrl };
  }
  const end = new Date(Date.UTC(y, q * 3, 0));
  if ((c.secDomestic || []).includes(company.ticker)) return { date: iso(new Date(end.getTime() + (q < 4 ? 40 : 60) * 864e5)), basis: 'rule', who: 'SEC', url: c.secUrl };
  if (lastLagDays != null) return { date: iso(new Date(end.getTime() + (lastLagDays + (c.usualGraceDays || 7)) * 864e5)), basis: 'usual', who: null, url: null };
  return null;
}
