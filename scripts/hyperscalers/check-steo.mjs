// Hyperscaler Hub: live edition check of EIA's Short-Term Energy Outlook (module 2, grid card "eia-steo-sales"). Reads the
// release date, the forecast-completed date and the next release date printed on eia.gov/outlooks/steo and writes them to
// tools/hyperscalers/data/steo-status.json only when they changed (so a run without news commits nothing). build-modules.mjs
// moves the card's "next edition expected" to the live date and flags the card when EIA has published a newer edition than
// the curated one; the figures themselves stay curated (T3, read from the published table by a person).
// Usage: node scripts/hyperscalers/check-steo.mjs
import { readJson, writeJson, TOOLS } from './lib.mjs';

const URL = 'https://www.eia.gov/outlooks/steo/';
const MON = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const iso = (s) => { const m = /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/.exec(s || ''); if (!m || !MON[m[1].toLowerCase()]) return null; return `${m[3]}-${String(MON[m[1].toLowerCase()]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`; };
const prev = await readJson(TOOLS + 'data/steo-status.json', {});
try {
  const r = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fnam.mx hyperscaler-hub)' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const t = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const rel = iso((/Release Date:\s*([A-Za-z]+ \d{1,2}, \d{4})/.exec(t) || [])[1]);
  const done = iso((/Forecast Completed:\s*([A-Za-z]+ \d{1,2}, \d{4})/.exec(t) || [])[1]);
  const next = iso((/Next Release Date:\s*([A-Za-z]+ \d{1,2}, \d{4})/.exec(t) || [])[1]);
  if (!rel) throw new Error('release date not found on the page');
  if (prev.releaseDate === rel && prev.nextReleaseDate === next && prev.forecastCompleted === done && prev.ok) { console.log(`check-steo: unchanged (release ${rel}, next ${next})`); process.exit(0); }
  await writeJson(TOOLS + 'data/steo-status.json', { _comment: prev._comment || 'Live edition check of EIA\'s Short-Term Energy Outlook (scripts/hyperscalers/check-steo.mjs).', checkedAt: new Date().toISOString().slice(0, 19) + 'Z', releaseDate: rel, forecastCompleted: done, nextReleaseDate: next, url: URL, ok: true });
  console.log(`check-steo: release ${rel}, forecast completed ${done}, next ${next}`);
} catch (e) { console.log(`check-steo: ERROR ${e.message} (previous status kept)`); }
