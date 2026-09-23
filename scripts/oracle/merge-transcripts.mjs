#!/usr/bin/env node
// Merge owner-supplied earnings-call transcript extractions (data/_raw_transcripts_*.json) into:
//   tools/oracle/data/transcripts.json  — canonical quotes + call-level guidance, one entry per call
//   tools/oracle/data/sources.json      — one "S-CALL-<id>" entry per transcript (local PDF, not an SEC filing)
//   tools/oracle/data/guidance.json     — vintages whose numeric fields the press release left null are filled from the
//                            CFO's prepared remarks and marked fields_from_transcript; calls with no quarter
//                            record (e.g. FY2024) become transcript-only vintages.
// Idempotent; called at the end of merge-raw.mjs and runnable alone: node scripts/oracle/merge-transcripts.mjs

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ROOT, DATA, RAW } from "./paths.mjs";
const load = (n) => JSON.parse(readFileSync(join(DATA, n), "utf8").replace(/^﻿/, ""));
const save = (n, obj) => writeFileSync(join(DATA, n), JSON.stringify(obj, null, 2) + "\n", "utf8");
const today = new Date().toISOString().slice(0, 10);
const NUMERIC = ["total_revenue_growth_pct", "cloud_revenue_growth_pct_cc", "cloud_revenue_growth_pct_usd", "non_gaap_eps_usd_cc", "non_gaap_eps_usd_reported", "fy_total_revenue_at_least", "fy_non_gaap_eps"];

export function mergeTranscripts() {
  // The raw extractions may live outside this repository (the private oracle-model clone): point
  // ORACLE_TRANSCRIPTS_RAW_DIR at that folder to merge new calls from here.
  const RAW_DIR = process.env.ORACLE_TRANSCRIPTS_RAW_DIR || DATA;
  const rawFiles = existsSync(RAW_DIR) ? readdirSync(RAW_DIR).filter((f) => /^_raw_transcripts_[a-z]\.json$/.test(f)).sort() : [];
  // The raw extractions live only in the private oracle-model repository (licensed PDFs). Without them, fall back to
  // the already-merged transcripts.json so re-running the merge keeps the transcript-sourced guidance vintages.
  const existing = existsSync(join(DATA, "transcripts.json")) ? load("transcripts.json") : null;
  if (!rawFiles.length && !existing) return false;
  const sources = load("sources.json");
  const guidance = existsSync(join(DATA, "guidance.json")) ? load("guidance.json") : { meta: {}, vintages: [] };
  const out = {
    meta: {
      note_en: "Earnings-call transcripts supplied by the owner as PDFs (not SEC filings; not republished). Quotes are short verbatim excerpts with speaker, date and page. Where the press release printed no quantified guidance, the ranges stated in the CFO's prepared remarks are used and marked 'transcript'.",
      note_es: "Transcripciones de llamadas de resultados proporcionadas por el responsable en PDF (no son reportes ante la SEC; no se republican). Las citas son extractos textuales breves con orador, fecha y página. Donde el comunicado no imprimió guía cuantificada, se usan los rangos expresados en los comentarios preparados del CFO y se marcan como 'transcripción'.",
      merged: today,
    },
    calls: {},
  };
  if (!rawFiles.length) { out.calls = existing.calls || {}; if (existing.meta?.merged) out.meta.merged = existing.meta.merged; }
  for (const f of rawFiles) {
    const raw = JSON.parse(readFileSync(join(RAW_DIR, f), "utf8").replace(/^﻿/, ""));
    for (const [id, c] of Object.entries(raw.transcripts || {})) {
      const key = `S-CALL-${id}`;
      sources[key] = {
        title: `${c.event || id} — earnings-call transcript (owner-supplied PDF, ${c.call_date || "date n/a"})`,
        form: "earnings-call transcript",
        filing_date: c.call_date || null,
        url: null,
        local_file: c.file || null,
        accessed: today,
        note: "Hand-supplied by the owner; not an SEC filing and not republished on the page.",
      };
      out.calls[id] = { ...c, source: key };
    }
  }

  // Fill guidance vintages from the calls.
  const byIssued = Object.fromEntries(guidance.vintages.map((v) => [v.issued_in, v]));
  for (const [id, c] of Object.entries(out.calls)) {
    const g = c.guidance_issued;
    if (!g || !/^FY\d{4}Q\d$/.test(id)) continue;
    // Spoken full-year figures are in billions ("$67 billion"); the canonical unit is millions.
    const toMillions = (x) => (typeof x === "number" && x < 1000 ? x * 1000 : x);
    const fromCall = {
      total_revenue_growth_pct: g.total_revenue_growth_pct_usd ?? g.total_revenue_growth_pct_cc ?? null,
      cloud_revenue_growth_pct_cc: g.cloud_revenue_growth_pct_cc ?? null,
      cloud_revenue_growth_pct_usd: g.cloud_revenue_growth_pct_usd ?? null,
      non_gaap_eps_usd_cc: g.non_gaap_eps_usd_cc ?? null,
      non_gaap_eps_usd_reported: g.non_gaap_eps_usd_reported ?? null,
      fy_total_revenue_at_least: toMillions(g.fy_total_revenue_at_least ?? null),
      fy_non_gaap_eps: g.fy_non_gaap_eps ?? null,
    };
    let v = byIssued[id];
    if (!v) {
      v = { issued_in: id, issued_on: c.call_date, source: c.source, for_period: g.for_period, _note: g._note || null };
      for (const k of NUMERIC) v[k] = null;
      v.fy_capex = null;
      guidance.vintages.push(v);
      byIssued[id] = v;
    }
    const filled = [];
    for (const k of NUMERIC) if (v[k] == null && fromCall[k] != null) { v[k] = fromCall[k]; filled.push(k); }
    if (g.total_revenue_growth_pct_cc && !v.total_revenue_growth_pct_cc) v.total_revenue_growth_pct_cc = g.total_revenue_growth_pct_cc;
    // Capex guidance is usually spoken as prose ("around $35 billion"); keep it verbatim as a note, numeric only when numeric.
    if (typeof g.fy_capex === "number" && v.fy_capex == null) { v.fy_capex = toMillions(g.fy_capex); filled.push("fy_capex"); }
    else if (typeof g.fy_capex === "string" && !v.fy_capex_note) { v.fy_capex_note = g.fy_capex; filled.push("fy_capex_note"); }
    if (g.multi_year_targets && !v.multi_year_targets) { v.multi_year_targets = g.multi_year_targets; filled.push("multi_year_targets"); }
    if (filled.length) {
      v.fields_from_transcript = filled;
      v.transcript_source = c.source;
      v.transcript_page = g.page ?? null;
      v.total_revenue_growth_basis = filled.includes("total_revenue_growth_pct") ? (g.total_revenue_growth_pct_usd ? "usd" : "cc") : (v.total_revenue_growth_basis || "usd");
    }
    if (!v.for_period && g.for_period) v.for_period = g.for_period;
  }
  guidance.vintages.sort((a, b) => (a.issued_on < b.issued_on ? 1 : -1));
  guidance.meta.transcripts_note_en = "Vintages marked fields_from_transcript take their ranges from the owner-supplied earnings-call transcript (CFO prepared remarks) because the press release printed no quantified table.";
  guidance.meta.transcripts_note_es = "Las versiones marcadas fields_from_transcript toman sus rangos de la transcripción de la llamada de resultados proporcionada por el responsable (comentarios preparados del CFO) porque el comunicado no imprimió una tabla cuantificada.";

  save("transcripts.json", out);
  save("sources.json", sources);
  save("guidance.json", guidance);
  console.log(`merged ${Object.keys(out.calls).length} transcript(s); guidance vintages now ${guidance.vintages.length}, ${guidance.vintages.filter((v) => v.fields_from_transcript).length} with transcript-sourced fields.`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!mergeTranscripts()) console.log("No _raw_transcripts_*.json files to merge.");
}
