#!/usr/bin/env node
// Idempotent merge of agent-extracted data/_raw_fy*.json files into the canonical data files:
// quarters.json, fiscal_years.json, guidance.json, dividends.json, sources.json.
// Normalizes the raw files' conventions to the canonical schema:
//   - capex stored as a NEGATIVE outflow (raw files store a positive magnitude)
//   - tax_provision stored POSITIVE for a provision (raw files store it negative), so net = pretax − tax
//   - inline source objects become sources.json entries referenced by key "S-8K-<id>"
//   - a revenue_basis flag marks FY2025-and-earlier quarters (legacy revenue captions) vs FY2026+ ("Cloud"/"Software")
// Run: node scripts/oracle/merge-raw.mjs   (then node scripts/oracle/validate-data.mjs)

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mergeTranscripts } from "./merge-transcripts.mjs";
import { mergeComments } from "./merge-comments.mjs";

import { ROOT, DATA, RAW } from "./paths.mjs";
const load = (n) => JSON.parse(readFileSync(join(DATA, n), "utf8"));
const save = (n, obj) => writeFileSync(join(DATA, n), JSON.stringify(obj, null, 2) + "\n", "utf8");
const today = new Date().toISOString().slice(0, 10);

const master = load("quarters.json");
const sources = load("sources.json");

// Canonical key names: guidance fields are fy_* (never fy2027_*), so vintages compare across years.
for (const q of master.quarters) {
  const gi = q.guidance_issued;
  if (!gi) continue;
  for (const k of Object.keys(gi)) {
    const m = /^fy\d{4}_(.+)$/.exec(k);
    if (m) { gi[`fy_${m[1]}`] = gi[k]; delete gi[k]; }
  }
}
const rawFiles = readdirSync(DATA).filter((f) => /^_raw_fy\d{4}\.json$/.test(f)).sort();
if (!rawFiles.length) { console.log("No _raw_fy*.json files to merge."); process.exit(0); }

const LEGACY_NOTE_EN = "Revenue lines on this quarter's original release used Oracle's pre-FY2026 captions: 'cloud' = Cloud services and license support; 'software' = Cloud license and on-premise license. Total revenue is unaffected; only the cloud/software split is on a different basis from FY2026 onward.";
const LEGACY_NOTE_ES = "Los rubros de ingresos del reporte original de este trimestre usan las etiquetas de Oracle previas al AF2026: 'nube' = Servicios de nube y soporte de licencias; 'software' = Licencias de nube y en sitio. El ingreso total no cambia; solo la división nube/software está en una base distinta a partir del AF2026.";

function accessionFromUrl(url) {
  const m = url.match(/\/data\/1341439\/(\d{18})\//);
  if (!m) return null;
  const s = m[1];
  return `${s.slice(0, 10)}-${s.slice(10, 12)}-${s.slice(12)}`;
}

function registerSource(key, src, q) {
  sources[key] = {
    title: src.title,
    form: src.form || "8-K",
    fiscal_period: q ? `Q${q.fiscal_quarter} FY${q.fiscal_year}` : undefined,
    period_end: q?.period_end,
    filing_date: q?.release_date,
    url: src.url,
    accession: accessionFromUrl(src.url),
    accessed: src.accessed || today,
  };
  return key;
}

function normalizeQuarter(q) {
  const g = q.gaap;
  if (g.tax_provision != null) g.tax_provision = -g.tax_provision;
  const cf = q.cash_flow || {};
  if (cf.capex_quarter != null && cf.capex_quarter > 0) cf.capex_quarter = -cf.capex_quarter;
  if (cf.capex_fy != null && cf.capex_fy > 0) cf.capex_fy = -cf.capex_fy;
  if (typeof q.source === "object") q.source = registerSource(`S-8K-${q.id}`, q.source, q);
  if (q.rpo && q.rpo.yoy_change != null) { q.rpo.yoy_pct = q.rpo.yoy_change; delete q.rpo.yoy_change; } // raw files record the stated YoY %
  if (q.da && q.da.total_da == null && q.da.depreciation != null) q.da.total_da = q.da.depreciation + q.da.amortization_of_intangibles;
  q.revenue_basis = q.fiscal_year <= 2025 ? "legacy_lines" : "fy2026_lines";
  if (q.revenue_basis === "legacy_lines") { q.basis_note_en = LEGACY_NOTE_EN; q.basis_note_es = LEGACY_NOTE_ES; }
  delete q._status;
  return q;
}

master.meta.extraction_notes = master.meta.extraction_notes || {};
const fiscalYears = existsSync(join(DATA, "fiscal_years.json")) ? load("fiscal_years.json") : { meta: { currency: "USD", units: "millions, except per-share", fiscal_year_end: "May 31", note_en: "Annual figures from the Q4 release's full-year columns / the 10-K. net_income is net income available to common shareholders where preferred dividends exist.", note_es: "Cifras anuales de las columnas de año completo del reporte del 4T / el 10-K. La utilidad neta es la disponible para accionistas comunes cuando existen dividendos preferentes." }, fiscal_years: {} };

for (const f of rawFiles) {
  const raw = load(f);
  const tag = f.replace("_raw_", "").replace(".json", "");
  if (raw._extraction_notes) master.meta.extraction_notes[tag] = raw._extraction_notes;
  for (const q of raw.quarters) {
    const n = normalizeQuarter(q);
    const i = master.quarters.findIndex((r) => r.id === n.id);
    if (i >= 0) master.quarters[i] = n; else master.quarters.push(n);
    console.log(`merged ${n.id}`);
  }
  for (const [label, annual] of Object.entries(raw.fiscal_year_annual || {})) {
    if (label.startsWith("_")) continue;
    const q4 = master.quarters.find((r) => r.id === `${label}Q4`);
    const key = q4 ? `S-8K-${label}Q4` : registerSource(`S-8K-${label}-ANNUAL`, annual.source, null);
    if (annual.gaap?.capex > 0) annual.gaap.capex = -annual.gaap.capex;
    const prevDa = fiscalYears.fiscal_years[label]?.da;
    fiscalYears.fiscal_years[label] = { source: key, gaap: annual.gaap, non_gaap: annual.non_gaap, ...(annual.da || prevDa ? { da: annual.da || prevDa } : {}) };
    console.log(`merged annual ${label}`);
  }
}

// Supplement: depreciation & amortization (cash-flow statement) and Oracle's recast of FY2025 revenue lines.
const supPath = join(DATA, "_raw_supplement.json");
if (existsSync(supPath)) {
  const sup = JSON.parse(readFileSync(supPath, "utf8").replace(/^﻿/, ""));
  if (sup._extraction_notes) master.meta.extraction_notes.supplement = sup._extraction_notes;
  for (const [id, d] of Object.entries(sup.da_by_quarter || {})) {
    const q = master.quarters.find((r) => r.id === id);
    if (!q || d.depreciation == null) continue;
    q.da = { depreciation: d.depreciation, amortization_of_intangibles: d.amortization_of_intangibles, total_da: d.total_da ?? d.depreciation + d.amortization_of_intangibles, cumulative_as_printed: d.cumulative_as_printed ?? null, note: d._note ?? null };
  }
  for (const [id, r] of Object.entries(sup.revenue_recast_fy2026_basis || {})) {
    const q = master.quarters.find((x) => x.id === id);
    if (!q || r.total == null) continue;
    q.revenue_recast_fy2026_basis = { cloud: r.cloud, software: r.software, hardware: r.hardware, services: r.services, total: r.total, source_url: r.source_url, note: r._note ?? null };
  }
  for (const [label, d] of Object.entries(sup.fiscal_year_da || {})) {
    if (!fiscalYears.fiscal_years[label]) continue;
    fiscalYears.fiscal_years[label].da = { depreciation: d.depreciation, amortization_of_intangibles: d.amortization_of_intangibles, total_da: d.total_da ?? d.depreciation + d.amortization_of_intangibles };
  }
  const annualRecast = sup.revenue_recast_fy2026_basis?.FY2025;
  if (annualRecast && fiscalYears.fiscal_years.FY2025) fiscalYears.fiscal_years.FY2025.revenue_recast_fy2026_basis = { cloud: annualRecast.cloud, software: annualRecast.software, hardware: annualRecast.hardware, services: annualRecast.services, total: annualRecast.total, source_url: annualRecast.source_url };
  console.log("merged supplement (D&A + recast revenue)");
}

master.quarters.sort((a, b) => (a.period_end < b.period_end ? 1 : -1));

// Every quarter carries a presentation-basis flag, including hand-seeded records that never passed through normalizeQuarter.
for (const q of master.quarters) {
  if (!q.revenue_basis) q.revenue_basis = q.fiscal_year <= 2025 ? "legacy_lines" : "fy2026_lines";
  if (q.revenue_basis === "legacy_lines" && !q.basis_note_en) { q.basis_note_en = LEGACY_NOTE_EN; q.basis_note_es = LEGACY_NOTE_ES; }
}

// RPO: a yoy_change above 1000 is a $-million amount (hand-entered seed), not a percentage — rename it and derive the %.
for (const q of master.quarters) {
  if (q.rpo?.yoy_change != null && q.rpo.yoy_change > 1000) {
    q.rpo.yoy_change_musd = q.rpo.yoy_change;
    delete q.rpo.yoy_change;
    const prev = master.quarters.find((r) => r.fiscal_quarter === q.fiscal_quarter && r.fiscal_year === q.fiscal_year - 1);
    if (prev?.rpo?.total && q.rpo.total) q.rpo.yoy_pct = Math.round(((q.rpo.total - prev.rpo.total) / prev.rpo.total) * 1000) / 10;
  }
}

master.meta.normalization_note_en = "The extraction_notes above describe the raw files as written by the extraction pass. scripts/oracle/merge-raw.mjs then normalized them to this file's conventions: capex is a negative outflow, tax_provision is positive for a provision (net income = pretax − tax), sources are keys into sources.json, rpo.yoy_pct is the stated year-over-year percentage.";
master.meta.normalization_note_es = "Las extraction_notes anteriores describen los archivos crudos tal como los escribió la extracción. scripts/oracle/merge-raw.mjs los normalizó después a las convenciones de este archivo: el capex es una salida negativa, tax_provision es positivo cuando es provisión (utilidad neta = antes de impuestos − impuestos), las fuentes son claves de sources.json, rpo.yoy_pct es el porcentaje interanual declarado.";
save("quarters.json", master);
save("fiscal_years.json", fiscalYears);
save("sources.json", sources);

// guidance.json — one vintage per release that issued any guidance (numeric or qualitative)
const vintages = master.quarters
  .filter((q) => q.guidance_issued)
  .map((q) => ({ issued_in: q.id, issued_on: q.release_date, source: q.source, ...q.guidance_issued }))
  .sort((a, b) => (a.issued_on < b.issued_on ? 1 : -1));
save("guidance.json", {
  meta: {
    basis_en: "As stated by Oracle: total-revenue and cloud-revenue growth in constant currency and USD, Non-GAAP diluted EPS. Oracle only began printing a quantified guidance table in its Exhibit 99.1 press release from Q3 FY2026; earlier vintages exist only in the earnings-call remarks and are recorded here as qualitative notes until transcripts are supplied.",
    basis_es: "Tal como lo expresa Oracle: crecimiento de ingresos totales y de nube en moneda constante y USD, UPA diluida No-GAAP. Oracle empezó a imprimir una tabla de guía cuantificada en su comunicado (Anexo 99.1) apenas desde el 3T AF2026; las versiones anteriores existen solo en los comentarios de la llamada de resultados y se registran aquí como notas cualitativas hasta que se proporcionen las transcripciones.",
  },
  vintages,
});

// dividends.json — derived from the quarter records (single source of truth)
const dividends = master.quarters
  .filter((q) => q.dividend_declared_per_share != null)
  .map((q) => ({ declared_date: q.release_date, amount_per_share: q.dividend_declared_per_share, record_date: q.dividend_record_date, payment_date: q.dividend_payment_date, source: q.source }))
  .sort((a, b) => (a.declared_date < b.declared_date ? 1 : -1));
save("dividends.json", { meta: { note_en: "Quarterly cash dividends declared by the board, as announced in each earnings release.", note_es: "Dividendos trimestrales en efectivo declarados por el consejo, según se anuncian en cada reporte de resultados." }, dividends });

console.log(`quarters.json now holds ${master.quarters.length} quarters; ${Object.keys(fiscalYears.fiscal_years).length} fiscal years; ${vintages.length} guidance vintages; ${dividends.length} dividends.`);

// guidance.json was just regenerated from the releases; layer the transcript-sourced fields back on top.
mergeTranscripts();
mergeComments();
