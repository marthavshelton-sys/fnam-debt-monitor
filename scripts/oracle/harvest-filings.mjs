#!/usr/bin/env node
// Harvest new Oracle filings from SEC EDGAR into the audit-trail archive.
// - Reads tools/oracle/data/state.json for the accession numbers already seen.
// - Finds new 8-K (Item 2.02, results of operations), 10-Q and 10-K filings for CIK 0001341439.
// - Downloads the earnings exhibit (EX-99.1) or primary document as raw HTML into tools/oracle/raw/{8k,10q,10k}/.
// - Records each new filing in tools/oracle/data/state.json under "pending_extraction" so the review routine (or a
//   human, per tools/oracle/README.md) extracts the figures into tools/oracle/data/quarters.json.
// Numeric extraction is deliberately NOT automatic here: figures enter quarters.json only through a
// reviewed step, and validate-data.mjs guards the result.
// Run: node scripts/oracle/harvest-filings.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
const CIK = "0001341439";
const CIK_NUM = "1341439";
const UA = process.env.EDGAR_USER_AGENT || "oracle-board-model/1.0 (research; contact via repository)";
const SINCE = process.env.HARVEST_SINCE || "2024-06-01"; // first period in the model is Q1 FY2025 (ended 2024-08-31)
const today = new Date().toISOString().slice(0, 10);

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.text();
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function loadState() {
  const p = join(DATA, "state.json");
  if (!existsSync(p)) return { seen_accessions: [], pending_extraction: [], last_harvest: null, log: [] };
  return JSON.parse(readFileSync(p, "utf8"));
}
function saveState(s) { writeFileSync(join(DATA, "state.json"), JSON.stringify(s, null, 2) + "\n", "utf8"); }

// Fallback when EDGAR refuses the client (it blocks GitHub-hosted runners whatever the User-Agent): Oracle's IR
// press-release feed (Q4 platform) is public and reachable. A new results release is recorded as pending so the
// reviewing routine, which runs from a workstation, harvests the 8-K exhibit itself.
// The RSS view answers 403 to scripted clients; the Q4 JSON endpoint behind the same list answers normally.
// Two parameter sets: the full one the IR page itself sends (the short one started returning an empty list on
// 2026-09-24) and the short one as a second try, in case Q4 changes the category id.
const IR_JSON_FULL = (year) => `https://investor.oracle.com/feed/PressRelease.svc/GetPressReleaseList?LanguageId=1&bodyType=0&pressReleaseDateFilter=3&categoryId=1cb807d2-208f-4bc3-9133-6a9ad45ac3b0&pageSize=25&pageNumber=0&tagList=&includeTags=true&year=${year}&excludeSelection=1`;
const IR_JSON = (year) => `https://investor.oracle.com/feed/PressRelease.svc/GetPressReleaseList?LanguageId=1&pageSize=25&pageNumber=0&year=${year}`;
const IR_FEED = "https://investor.oracle.com/rss/pressrelease.aspx";
async function irItems() {
  for (const mk of [IR_JSON_FULL, IR_JSON]) try {
    const j = await getJSON(mk(new Date().getUTCFullYear()));
    const list = j.GetPressReleaseListResult || j.Items || [];
    if (list.length) return list.map((x) => ({ guid: x.LinkToDetailPage || x.Headline, title: x.Headline || "", link: x.LinkToDetailPage ? (x.LinkToDetailPage.startsWith("http") ? x.LinkToDetailPage : "https://investor.oracle.com" + x.LinkToDetailPage) : "", pub: x.PressReleaseDate || "" }));
    console.error("IR JSON feed returned an empty list; trying the next parameter set.");
  } catch (e) { console.error(`IR JSON feed failed (${e.message}); trying the next source.`); }
  const xml = await getText(IR_FEED);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const pick = (s, tag) => { const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(s); return m ? m[1].trim() : ""; };
  return items.map((it) => ({ guid: pick(it, "guid"), title: pick(it, "title"), link: pick(it, "link"), pub: pick(it, "pubDate") }));
}
async function checkIrFeed(state) {
  const items = await irItems();
  state.ir_feed_seen ??= [];
  const seenGuids = new Set(state.ir_feed_seen);
  let added = 0;
  for (const it of items) {
    const { guid, title, link, pub } = it;
    if (!guid || seenGuids.has(guid)) continue;
    state.ir_feed_seen.push(guid);
    const date = pub && !isNaN(new Date(pub)) ? new Date(pub).toISOString().slice(0, 10) : today;
    // Releases older than the last successful harvest were already picked up from EDGAR.
    if (state.last_harvest && date < state.last_harvest) continue;
    if (/announces .*results|fiscal .*results|Q[1-4] results/i.test(title)) {
      state.pending_extraction.push({ form: "IR release", accession: null, report_date: null, filing_date: date, url: link, archived: null, harvested: today, status: "pending", title });
      state.log.push({ date: today, event: "ir-feed results release", title, url: link });
      console.log(`IR feed: results release "${title}" (${date}) recorded as pending; harvest the 8-K from a workstation.`);
      added++;
    }
  }
  if (!added) console.log("IR feed: no new results release.");
}

// Snapshots for the cloud routine, which cannot reach EDGAR or investor.oracle.com: the recent EDGAR submissions
// (all forms, so non-earnings 8-Ks, FWP and 424B prospectuses are visible) and the IR press-release list.
async function snapshotFeeds(sub) {
  try {
    const r = sub.filings.recent; const out = [];
    for (let i = 0; i < Math.min(r.form.length, 60); i++) out.push({ form: r.form[i], filing_date: r.filingDate[i], report_date: r.reportDate[i] || null, accession: r.accessionNumber[i], items: r.items[i] || "", primary_document: r.primaryDocument[i], url: `https://www.sec.gov/Archives/edgar/data/${CIK_NUM}/${r.accessionNumber[i].replace(/-/g, "")}/${r.primaryDocument[i]}` });
    writeFileSync(join(DATA, "edgar_recent.json"), JSON.stringify({ note: "Most recent EDGAR submissions for Oracle (CIK 1341439), all forms, refreshed by scripts/oracle/harvest-filings.mjs on every filings run so the reviewing routine can read them without network access.", cik: CIK, fetched: today, filings: out }, null, 2) + "\n", "utf8");
  } catch (e) { console.error(`EDGAR snapshot failed (${e.message}).`); }
  try {
    const items = await irItems();
    writeFileSync(join(DATA, "ir_feed.json"), JSON.stringify({ note: "Oracle investor-relations press-release list (Q4 JSON feed, full parameter set), refreshed by scripts/oracle/harvest-filings.mjs on every filings run so the reviewing routine can read it without network access.", fetched: today, items: items.slice(0, 25) }, null, 2) + "\n", "utf8");
  } catch (e) { console.error(`IR feed snapshot failed (${e.message}).`); }
}

async function main() {
  const state = loadState();
  const seen = new Set(state.seen_accessions);
  let sub;
  try {
    sub = await getJSON(`https://data.sec.gov/submissions/CIK${CIK}.json`);
  } catch (e) {
    console.error(`EDGAR unavailable (${e.message}); checking Oracle's IR press-release feed instead.`);
    await checkIrFeed(state);
    state.log.push({ date: today, event: "edgar-unavailable", error: String(e.message).slice(0, 200) });
    saveState(state);
    return;
  }
  await snapshotFeeds(sub);
  const r = sub.filings.recent;
  const candidates = [];
  for (let i = 0; i < r.form.length; i++) {
    const form = r.form[i];
    const items = r.items[i] || "";
    const isEarnings8K = form === "8-K" && items.split(",").map((s) => s.trim()).includes("2.02");
    if (!(isEarnings8K || form === "10-Q" || form === "10-K")) continue;
    const acc = r.accessionNumber[i];
    if (seen.has(acc) || r.reportDate[i] < SINCE) continue;
    candidates.push({ form, acc, filingDate: r.filingDate[i], reportDate: r.reportDate[i], primary: r.primaryDocument[i] });
  }
  if (!candidates.length) { console.log("No new filings since last harvest."); state.last_harvest = today; saveState(state); return; }

  for (const c of candidates.reverse()) {
    const accPath = c.acc.replace(/-/g, "");
    const folder = c.form === "8-K" ? "8k" : c.form === "10-Q" ? "10q" : "10k";
    const outDir = join(RAW, folder);
    mkdirSync(outDir, { recursive: true });

    let docName = c.primary;
    if (c.form === "8-K") {
      // Find the EX-99.1 earnings exhibit from the filing index.
      await sleep(150);
      const idx = await getJSON(`https://www.sec.gov/Archives/edgar/data/${CIK_NUM}/${accPath}/index.json`);
      const ex = idx.directory.item.find((f) => /ex99[_-]?1/i.test(f.name) || /ex-?99/i.test(f.name));
      if (ex) docName = ex.name;
    }
    const url = `https://www.sec.gov/Archives/edgar/data/${CIK_NUM}/${accPath}/${docName}`;
    // The earnings release (8-K exhibit) is archived in full as the audit trail. 10-Q/10-K primary documents
    // are 10–20 MB of inline XBRL each, so they are recorded by URL and fetched on demand instead.
    let archived = null;
    if (c.form === "8-K" || process.env.HARVEST_FULL_REPORTS === "true") {
      await sleep(150);
      const html = await getText(url);
      const outFile = join(outDir, `${c.reportDate}_${c.form.replace("-", "")}_${c.acc}_${docName}`);
      writeFileSync(outFile, html, "utf8");
      archived = relative(ROOT, outFile).replace(/\\/g, "/");
      console.log(`Saved ${c.form} ${c.reportDate} (${c.acc}) → tools/oracle/raw/${folder}/`);
    } else {
      console.log(`Recorded ${c.form} ${c.reportDate} (${c.acc}) by URL`);
    }

    state.seen_accessions.push(c.acc);
    state.pending_extraction.push({ form: c.form, accession: c.acc, report_date: c.reportDate, filing_date: c.filingDate, url, archived, harvested: today, status: "pending" });
    state.log.push({ date: today, event: "harvested", form: c.form, accession: c.acc });
  }
  state.last_harvest = today;
  saveState(state);
  console.log(`${candidates.length} new filing(s) archived; ${state.pending_extraction.filter((p) => p.status === "pending").length} pending extraction.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
