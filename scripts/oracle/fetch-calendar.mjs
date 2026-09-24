#!/usr/bin/env node
// Investor calendar for the Oracle model: upcoming and recent investor events (earnings calls, analyst days,
// conferences) from Oracle's investor-relations site, written to tools/oracle/data/calendar.json for the page,
// the board presentation and the reviewing routine.
//
// Sources, in order of authority:
//   1. The IR "Events & Presentations" list (Q4 platform JSON feed behind investor.oracle.com/events-and-presentations):
//      title, start/end in Central Time, webcast link, attached documents.
//   2. Oracle's date-setting press releases ("Oracle Sets the Date for its <n> Quarter Fiscal Year <yyyy> Earnings
//      Announcement"): the release text states the day and the call time; used when the event is not yet on the list.
//   3. Results releases ("Oracle Announces ... Results") to link each past call to its release.
// Estimates: when Oracle has not announced the next results date, a window derived from the same fiscal quarter's
// release dates over the last three fiscal years (tools/oracle/data/quarters.json), always labelled as an estimate.
// Hand-curated entries (an Investor Day named on a call before the IR site lists it) live in `manual_events`,
// which this script preserves untouched; each needs a source (call page and speaker, or release URL).
//
// Run: node scripts/oracle/fetch-calendar.mjs   (the filings workflow runs it every weekday after the harvest)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DATA } from "./paths.mjs";

const UA = process.env.EDGAR_USER_AGENT || "fnam.mx oracle-model (investor calendar; contact via repository)";
const today = new Date().toISOString().slice(0, 10);
const PAST_MONTHS = 6;
const IR = "https://investor.oracle.com";
const EVENTS_PAGE = `${IR}/events-and-presentations/default.aspx`;
const NEWS_PAGE = `${IR}/investor-news/default.aspx`;
const EVENTS_FEED = `${IR}/feed/Event.svc/GetEventList?LanguageId=1&eventDateFilter=All&includeFinancialReports=true&includePresentations=true&includePressReleases=true&pageSize=100&pageNumber=0&tagList=&includeTags=true&excludeSelection=1`;
const NEWS_FEED = (year) => `${IR}/feed/PressRelease.svc/GetPressReleaseList?LanguageId=1&bodyType=0&pressReleaseDateFilter=3&categoryId=1cb807d2-208f-4bc3-9133-6a9ad45ac3b0&pageSize=40&pageNumber=0&tagList=&includeTags=true&year=${year}&excludeSelection=1`;
const TZ = { CT: "America/Chicago", ET: "America/New_York", PT: "America/Los_Angeles", MT: "America/Denver" };
const OUT = join(DATA, "calendar.json");

// investor.oracle.com sits behind a bot filter that answers 403 to plain clients now and then: browser-like UA, three tries.
const UA_WEB = "Mozilla/5.0 (compatible; fnam.mx oracle-model; +https://fnam.mx/oracle) " + UA;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getText(url, accept = "*/*") {
  let last;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { "User-Agent": UA_WEB, Accept: accept, "Accept-Language": "en-US,en;q=0.9" } }); if (r.ok) return r.text(); last = new Error(`HTTP ${r.status} ${url}`); if (r.status < 500 && r.status !== 403 && r.status !== 429) break; }
    catch (e) { last = e; }
    await sleep(1500 * (i + 1));
  }
  throw last;
}
const getJSON = async (url) => JSON.parse(await getText(url, "application/json"));
const readJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));
const absUrl = (u) => (!u ? null : /^https?:/i.test(u) ? u : IR + u);
// Oracle's webcast links come wrapped by a mail security gateway (urldefense v3); unwrap to the real address.
const unwrap = (u) => { if (!u) return null; const m = /urldefense\.com\/v3\/__(.+?)__;/.exec(u); return m ? m[1] : u; };
const addMonths = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };

// "09/10/2026 16:00:00" in a named US zone → ISO with the zone's offset at that instant (DST-aware).
function zonedToIso(local, tz) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/.exec(local || "");
  if (!m) return null;
  const [, mo, d, y, H, M, S] = m.map(Number);
  let utc = Date.UTC(y, mo - 1, d, H, M, S);
  const offsetMin = (ms) => { const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName").value; const g = /GMT([+-])(\d{2}):(\d{2})/.exec(s); return g ? (g[1] === "-" ? -1 : 1) * (Number(g[2]) * 60 + Number(g[3])) : 0; };
  let off = offsetMin(utc); utc -= off * 60000; const off2 = offsetMin(utc); if (off2 !== off) { utc += (off - off2) * 60000; off = off2; }
  const sign = off < 0 ? "-" : "+", a = Math.abs(off);
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}T${pad(H)}:${pad(M)}:${pad(S)}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

const ORD = { first: 1, second: 2, third: 3, fourth: 4 };
function fiscalPeriodFromTitle(title) {
  let m = /Q([1-4])\s*FY\s*(\d{2,4})/i.exec(title); if (m) return `FY${m[2].length === 2 ? "20" + m[2] : m[2]}Q${m[1]}`;
  m = /(first|second|third|fourth) quarter fiscal year (\d{4})/i.exec(title); if (m) return `FY${m[2]}Q${ORD[m[1].toLowerCase()]}`;
  m = /fiscal (?:year )?(\d{4}) (first|second|third|fourth) quarter/i.exec(title); if (m) return `FY${m[1]}Q${ORD[m[2].toLowerCase()]}`;
  m = /Q([1-4]) (?:and (?:full year|FY) )?(?:FY ?)?(\d{4})/i.exec(title); if (m) return `FY${m[2]}Q${m[1]}`;
  return null;
}
const qShort = (fp) => { const m = /^FY(\d{4})Q(\d)$/.exec(fp || ""); return m ? { en: `${m[2]}Q${m[1].slice(2)}`, es: `${m[2]}T${m[1].slice(2)}` } : null; };
function classify(title) {
  if (/earnings|results/i.test(title)) return "earnings_call";
  if (/analyst (meeting|day)|investor day|financial analyst/i.test(title)) return "analyst_day";
  if (/annual meeting|stockholders|shareholders/i.test(title)) return "annual_meeting";
  if (/conference|summit|symposium|forum/i.test(title)) return "conference";
  return "other";
}
function titleEs(type, title, fp) {
  const q = qShort(fp);
  if (type === "earnings_call" && q) return `Resultados ${q.es}: llamada de resultados`;
  if (type === "analyst_day") return /financial analyst meeting/i.test(title) ? "Reunión de analistas financieros de Oracle" : `Día del inversionista: ${title}`;
  if (type === "annual_meeting") return "Asamblea anual de accionistas";
  return title; // conference names are proper names
}

async function main() {
  const prev = existsSync(OUT) ? readJson(OUT) : {};
  const prevById = new Map((prev.events || []).map((e) => [e.id, e]));
  const transcripts = existsSync(join(DATA, "transcripts.json")) ? readJson(join(DATA, "transcripts.json")).calls || {} : {};
  const quarters = readJson(join(DATA, "quarters.json")).quarters || [];
  const events = new Map();

  // 1. IR events list
  let feedOk = false;
  try {
    const j = await getJSON(EVENTS_FEED);
    for (const e of j.GetEventListResult || []) {
      const tz = TZ[e.TimeZone] || TZ.CT;
      const start = zonedToIso(e.StartDate, tz); if (!start) continue;
      const type = classify(e.Title || "");
      const fp = type === "earnings_call" ? fiscalPeriodFromTitle(e.Title || "") : null;
      const id = `ir-event-${e.EventId}`;
      const docs = (e.EventPresentation || []).map((p) => ({ title: p.DocumentTitle || p.Title || "Presentation", url: absUrl(p.DocumentPath || p.LinkToDetailPage) })).filter((d) => d.url);
      events.set(id, {
        id, type, title: e.Title, title_es: titleEs(type, e.Title, fp), fiscal_period: fp,
        start, end: zonedToIso(e.EndDate, tz), timezone: tz, location: (e.Location || "").trim() || null,
        links: { event: absUrl(e.LinkToDetailPage), webcast: unwrap(e.WebCastLink) || null, release: null, announcement: null, documents: docs, transcript_in_model: false },
        source: { title: "Oracle Investor Relations — Events & Presentations", url: EVENTS_PAGE, fetched: today },
        first_seen: (prevById.get(id) || {}).first_seen || today,
      });
    }
    feedOk = true;
  } catch (e) { console.error(`IR events feed failed (${e.message}); keeping the previous events.`); for (const e2 of prev.events || []) if (e2.id.startsWith("ir-event-")) events.set(e2.id, e2); }

  // 2. Date-setting releases and 3. results releases, from the press-release list (this year and last)
  let news = [];
  const feedFile = join(DATA, "ir_feed.json");
  try { const y = new Date().getUTCFullYear(); for (const yr of [y, y - 1]) { const j = await getJSON(NEWS_FEED(yr)); news.push(...(j.GetPressReleaseListResult || [])); } }
  catch (e) { console.error(`IR press-release feed failed (${e.message}); using tools/oracle/data/ir_feed.json.`); if (existsSync(feedFile)) news = readJson(feedFile).items.map((x) => ({ Headline: x.title, LinkToDetailPage: x.link, PressReleaseDate: x.pub })); }
  const pubDate = (x) => { const d = new Date(x.PressReleaseDate); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
  const byFp = () => { const m = new Map(); for (const ev of events.values()) if (ev.fiscal_period) m.set(ev.fiscal_period, ev); return m; };

  for (const x of news) {
    const title = x.Headline || "";
    if (!/sets the date/i.test(title)) continue;
    const fp = fiscalPeriodFromTitle(title); if (!fp) continue;
    const link = absUrl(x.LinkToDetailPage);
    const cached = [...prevById.values()].find((e) => e.links && e.links.announcement === link);
    let ann = cached ? { start: cached.start, tz: cached.timezone, day: cached.start.slice(0, 10) } : null;
    if (!ann) {
      try {
        const html = await getText(link);
        const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
        const dm = /released on (?:\w+day, )?(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})(?:st|nd|rd|th)?(?:, (\d{4}))?/i.exec(text);
        const tm = /(\d{1,2}):(\d{2}) ?([ap])\.?m\.? (Central|Eastern|Pacific|Mountain) Time/i.exec(text);
        if (dm) {
          const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
          const pd = pubDate(x) || today; let year = dm[3] ? Number(dm[3]) : Number(pd.slice(0, 4));
          const mo = months.indexOf(dm[1].toLowerCase()) + 1; const day = Number(dm[2]);
          let dayIso = `${year}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (dayIso < pd) { year += 1; dayIso = `${year}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
          let H = 16, M = 0, tz = TZ.CT;
          if (tm) { H = Number(tm[1]) % 12 + (tm[3].toLowerCase() === "p" ? 12 : 0); M = Number(tm[2]); tz = { central: TZ.CT, eastern: TZ.ET, pacific: TZ.PT, mountain: TZ.MT }[tm[4].toLowerCase()] || TZ.CT; }
          ann = { start: zonedToIso(`${String(mo).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year} ${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}:00`, tz), tz, day: dayIso, timeStated: !!tm };
        }
      } catch (e) { console.error(`Could not read ${link} (${e.message}).`); }
    }
    if (!ann) continue;
    const existing = byFp().get(fp);
    if (existing) { existing.links.announcement = link; if (!existing.start) existing.start = ann.start; continue; }
    const id = `ir-release-${fp}`;
    const q = qShort(fp);
    events.set(id, {
      id, type: "earnings_call", title: `${q.en} Earnings`, title_es: titleEs("earnings_call", "", fp), fiscal_period: fp,
      start: ann.start, end: null, timezone: ann.tz, location: null,
      links: { event: null, webcast: null, release: null, announcement: link, documents: [], transcript_in_model: false },
      source: { title: title, url: link, fetched: today, note: ann.timeStated === false ? "Time not stated in the release; 4:00 p.m. Central assumed from Oracle's practice" : null },
      first_seen: (prevById.get(id) || {}).first_seen || today,
    });
  }
  // results releases → link past calls to the release published the same day
  for (const x of news) {
    const title = x.Headline || ""; if (!/announces .*results/i.test(title)) continue;
    const day = pubDate(x); if (!day) continue;
    for (const ev of events.values()) if (ev.type === "earnings_call" && ev.start && ev.start.slice(0, 10) === day) ev.links.release = absUrl(x.LinkToDetailPage);
  }
  // transcripts held by the model
  for (const ev of events.values()) {
    if (ev.fiscal_period && transcripts[ev.fiscal_period]) ev.links.transcript_in_model = true;
    else if (ev.start) { const d = ev.start.slice(0, 10); ev.links.transcript_in_model = Object.values(transcripts).some((c) => c && c.call_date === d); }
  }

  // window: everything upcoming, the past PAST_MONTHS months
  const floor = addMonths(today, -PAST_MONTHS);
  const list = [...events.values()].filter((e) => e.start && e.start.slice(0, 10) >= floor).sort((a, b) => a.start.localeCompare(b.start));
  for (const e of list) e.status = e.start.slice(0, 10) >= today ? "confirmed" : "past";

  // estimate for the next results date when Oracle has not announced it
  const estimates = [];
  const latest = quarters.slice().sort((a, b) => (a.fiscal_year * 10 + a.fiscal_quarter) - (b.fiscal_year * 10 + b.fiscal_quarter)).pop();
  if (latest) {
    const nq = latest.fiscal_quarter === 4 ? { fy: latest.fiscal_year + 1, q: 1 } : { fy: latest.fiscal_year, q: latest.fiscal_quarter + 1 };
    const fp = `FY${nq.fy}Q${nq.q}`;
    if (!list.some((e) => e.fiscal_period === fp && e.status === "confirmed")) {
      const hist = quarters.filter((x) => x.fiscal_quarter === nq.q && x.release_date && x.fiscal_year >= nq.fy - 3 && x.fiscal_year < nq.fy).map((x) => x.release_date).sort();
      const after = latest.release_date || today;
      const cands = hist.map((d) => { let y = Number(d.slice(0, 4)); let c = d; while (c <= after) { y += 1; c = `${y}${d.slice(4)}`; } return c; }).sort();
      if (cands.length) estimates.push({ fiscal_period: fp, label_en: `${qShort(fp).en} results`, label_es: `Resultados ${qShort(fp).es}`, window_start: cands[0], window_end: cands[cands.length - 1], derived: true, basis_en: `Estimated from Oracle's ${qShort(fp).en.slice(0, 2)} release dates of the last ${hist.length} fiscal years (${hist.join(", ")}); Oracle has not announced the date.`, basis_es: `Estimado a partir de las fechas de publicación del ${qShort(fp).es.slice(0, 2)} en los últimos ${hist.length} años fiscales (${hist.join(", ")}); Oracle no ha anunciado la fecha.`, source: { title: "tools/oracle/data/quarters.json (release dates)", url: NEWS_PAGE } });
    }
  }

  // hand-curated entries: keep them, but mark the ones the IR list has since confirmed (same type, same day)
  const manual = (prev.manual_events || []).map((m) => { const day = String(m.start || "").slice(0, 10); const hit = list.find((e) => e.type === m.type && e.start.slice(0, 10) === day); return { ...m, superseded_by: hit ? hit.id : null }; });

  const out = {
    _comment: "Investor calendar written by scripts/oracle/fetch-calendar.mjs (weekday filings workflow). nextResults: the next earnings date once Oracle announces it (read by the board presentation through reference.js), null until then. events: from Oracle's IR events list and date-setting releases, upcoming plus the last 6 months; estimates: derived windows, never Oracle-announced dates; manual_events: hand-curated entries with a source (a date named on a call before the IR site lists it), preserved by the script. Times carry the zone offset; timezone names the IANA zone.",
    generated: today, feed_ok: feedOk, past_months: PAST_MONTHS,
    sources: [{ id: "ir-events", title: "Oracle Investor Relations — Events & Presentations", url: EVENTS_PAGE }, { id: "ir-news", title: "Oracle Investor Relations — press releases (date-setting and results releases)", url: NEWS_PAGE }],
    // nextResults: the contract the board presentation reads (site/assets/present-core.js via reference.js → calendar.nextResults):
    // the confirmed date of the next earnings release when Oracle has announced it, otherwise null (the presentation then
    // labels its own assumed date). Filled automatically here; never hand-edit.
    nextResults: (() => { const e = list.find((x) => x.type === "earnings_call" && x.status === "confirmed"); return e ? { date: e.start.slice(0, 10), time: e.start.slice(11, 16), timezone: e.timezone, fiscal_period: e.fiscal_period, source: e.links.announcement || e.links.event || EVENTS_PAGE } : null; })(),
    events: list, estimates, manual_events: manual,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`calendar.json: ${list.filter((e) => e.status === "confirmed").length} upcoming, ${list.filter((e) => e.status === "past").length} past (${PAST_MONTHS} months), ${estimates.length} estimate(s), ${out.manual_events.length} manual.`);
  for (const e of list) console.log(`  ${e.status.padEnd(9)} ${e.start}  ${e.title}${e.links.webcast ? " [webcast]" : ""}${e.links.release ? " [release]" : ""}${e.links.transcript_in_model ? " [transcript]" : ""}`);
  for (const s of estimates) console.log(`  estimate  ${s.window_start}..${s.window_end}  ${s.label_en}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
