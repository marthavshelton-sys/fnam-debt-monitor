// Keep only completed trading sessions in a daily price series.
//
// Yahoo's daily chart (and Stooq's CSV) include the current session as a partial bar while the market is open, so a
// run during trading hours would publish an intraday quote dated today as if it were a close. A bar dated today (in
// the exchange's own time zone) is kept only once the local clock has passed the close plus a settlement buffer.
// Points may be [isoDate, value] pairs or objects with a `date` field.
const CLOSES = {
  BMV: ['America/Mexico_City', '15:30'],   // continuous trading ends 15:00, closing auction a few minutes later
  NYSE: ['America/New_York', '16:15'],
  NASDAQ: ['America/New_York', '16:15'],
  B3: ['America/Sao_Paulo', '18:15'],
  BME: ['Europe/Madrid', '17:45'],
};

export function localNow(timeZone, at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}

export function completedSessions(points, { exchange = 'BMV', at = new Date() } = {}) {
  if (!Array.isArray(points) || !points.length) return points;
  const [tz, close] = CLOSES[String(exchange).toUpperCase()] || CLOSES.BMV;
  const now = localNow(tz, at instanceof Date ? at : new Date(at)), closed = now.hm >= close;
  const dateOf = (p) => (Array.isArray(p) ? p[0] : p.date);
  // earlier sessions are closes; today's counts only after the close; a bar dated after the exchange's today never does
  return points.filter((p) => { const d = dateOf(p); return d < now.date || (d === now.date && closed); });
}
