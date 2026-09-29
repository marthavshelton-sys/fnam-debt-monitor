// Cross-checks site/mx/fiscal/docs-data.js against the official documents mirrored as text in
// tools/mx-fiscal/docs/ (LIF art. 2 borrowing ceilings, the CGPE macro table, PAF estimates). It
// exists because those numbers were once transcribed by hand and drifted from the documents (the
// LIF card showed the ILIF 2027 proposal as the ceiling in force). Runs on every workflow run after
// the mirrors are refreshed and exits non-zero on any mismatch, so GitHub e-mails the owner; the
// daily document routine runs it before committing.
//
//   node scripts/mx-fiscal/check-docs.mjs            report and exit 1 on mismatch
//   node scripts/mx-fiscal/check-docs.mjs --json     machine-readable findings

import fs from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const DOCS = new URL('site/mx/fiscal/docs-data.js', ROOT);
const MIRRORS = new URL('tools/mx-fiscal/docs/', ROOT);
const JSON_OUT = process.argv.includes('--json');

const num = (s) => Number(String(s).replace(/,/g, ''));
const near = (a, b, tol = 0.051) => a != null && b != null && Math.abs(Number(a) - Number(b)) <= tol;
async function mirror(key) {
  try { return await fs.readFile(new URL(`${key}.txt`, MIRRORS), 'utf8'); } catch { return null; }
}
function sourceOf(text) { return (text.match(/^# source: (.+)$/m) || [])[1] || ''; }
function docYear(text, re) { const m = text.match(re); return m ? m[1] : null; }

const findings = []; // { block, field, docs, document, source, note }
const ok = [];
function compare(block, field, docsVal, docVal, source, note, tol) {
  if (docVal == null) { findings.push({ block, field, docs: docsVal, document: null, source, note: `${note || ''} (not found in mirror)`.trim(), severity: 'warn' }); return; }
  if (near(docsVal, docVal, tol)) ok.push(`${block}.${field} = ${docsVal}`);
  else findings.push({ block, field, docs: docsVal, document: docVal, source, note, severity: 'error' });
}

async function main() {
  const js = await fs.readFile(DOCS, 'utf8');
  const w = {}; new Function('window', js)(w);
  const D = w.MX_DOCS;

  // ---- LIF: article 2 sets the ceilings in force; the Estimated-revenue table's 0.01.01 row is the same figure in mdp.
  const lif = await mirror('diputados-lif');
  if (lif && D.lif) {
    const src = sourceOf(lif);
    const yr = docYear(lif, /LEY DE INGRESOS DE LA FEDERACI[ÓO]N PARA EL EJERCICIO FISCAL DE (\d{4})/);
    const dom = lif.match(/endeudamiento neto interno hasta por (\d) bill[oó]n (\d{1,3}) mil\s+millones de pesos/i);
    const domBn = dom ? Number(dom[1]) * 1000 + Number(dom[2]) : null; // in miles de millones de pesos
    const ext = lif.match(/endeudamiento neto externo de hasta (\d{1,3}) mil (\d{1,3}) millones de d[oó]lares/i);
    const extBn = ext ? Number(ext[1]) + Number(ext[2]) / 1000 : null;
    compare('lif', 'domesticBn', D.lif.domesticBn, domBn, src, `LIF ${yr} art. 2 (mmdp)`);
    compare('lif', 'externalUsdBn', D.lif.externalUsdBn, extBn, src, `LIF ${yr} art. 2 (USD bn)`);
    const dof = lif.match(/Nueva Ley DOF (\d{2})-(\d{2})-(\d{4})/);
    if (dof) { const iso = `${dof[3]}-${dof[2]}-${dof[1]}`; if (D.lif.asOf !== iso) findings.push({ block: 'lif', field: 'asOf', docs: D.lif.asOf, document: iso, source: src, note: 'DOF publication date', severity: 'error' }); else ok.push(`lif.asOf = ${iso}`); }
    if (yr && !String(D.lif.title).includes(yr)) findings.push({ block: 'lif', field: 'title', docs: D.lif.title, document: yr, source: src, note: 'fiscal year in the mirrored law', severity: 'error' });
  }

  // ---- PEF: DOF date and total.
  const pef = await mirror('diputados-pef');
  if (pef && D.pef) {
    const src = sourceOf(pef);
    const dof = pef.match(/Nuevo Presupuesto DOF (\d{2})-(\d{2})-(\d{4})/);
    if (dof) { const iso = `${dof[3]}-${dof[2]}-${dof[1]}`; if (D.pef.asOf !== iso) findings.push({ block: 'pef', field: 'asOf', docs: D.pef.asOf, document: iso, source: src, note: 'DOF publication date', severity: 'error' }); else ok.push(`pef.asOf = ${iso}`); }
    const tot = pef.match(/GASTO NETO TOTAL\s+([\d,]+)/);
    compare('pef', 'totalBn', D.pef.totalBn, tot ? Math.round(num(tot[1]) / 1e9 * 10) / 10 : null, src, 'gasto neto total (mmdp; the PEF states it in pesos)');
  }

  // ---- CGPE: the "Marco macroeconómico" summary table (three columns: previous estimate, current year, next year)
  // and the debt/RFSP block. Rows are matched by label; the last two numbers are current year and next year.
  const cg = await mirror('shcp-cgpe');
  if (cg && D.cgpe) {
    const src = sourceOf(cg);
    const yr = docYear(src + ' ' + cg, /cgpe_(\d{4})/) || docYear(cg, /Criterios Generales de Pol[ií]tica Econ[oó]mica (\d{4})/);
    const next = yr, curr = String(Number(yr) - 1);
    const row = (label) => { const m = cg.match(new RegExp(`^\\s*${label}[^\\n]*?([-\\d.,]+)\\s+([-\\d.,]+)\\s+([-\\d.,]+)\\s*$`, 'mi')); return m ? [num(m[2]), num(m[3])] : null; };
    const r = {
      shrfsp: row('Deuda p[uú]blica \\(SHRFSP\\)'),
      rfsp: row('Balance p[uú]blico amplio \\(RFSP\\)'),
      gdp: row('Nominal \\(miles de millones de pesos\\)'),
      cetesAvg: row('Nominal promedio'),
      cetesEnd: row('Nominal fin de periodo'),
      fxEnd: row('Fin del periodo'),
      oil: row('Precio del petr[oó]leo \\(promedio en dls\\. / barril\\)'),
      inflEnd: row('Diciembre / diciembre'),
    };
    if (D.cgpe.shrfspPct) { compare('cgpe', `shrfspPct.${curr}`, D.cgpe.shrfspPct[curr], r.shrfsp?.[0], src, 'SHRFSP % PIB'); compare('cgpe', `shrfspPct.${next}`, D.cgpe.shrfspPct[next], r.shrfsp?.[1], src, 'SHRFSP % PIB'); }
    if (D.cgpe.rfspPct) { compare('cgpe', `rfspPct.${curr}`, D.cgpe.rfspPct[curr], r.rfsp ? Math.abs(r.rfsp[0]) : null, src, 'RFSP % PIB'); compare('cgpe', `rfspPct.${next}`, D.cgpe.rfspPct[next], r.rfsp ? Math.abs(r.rfsp[1]) : null, src, 'RFSP % PIB'); }
    if (D.cgpe.gdpNominalBn) { compare('cgpe', `gdpNominalBn.${curr}`, D.cgpe.gdpNominalBn[curr], r.gdp ? Math.round(r.gdp[0] / 100) / 10 : null, src, 'PIB nominal, billones'); compare('cgpe', `gdpNominalBn.${next}`, D.cgpe.gdpNominalBn[next], r.gdp ? Math.round(r.gdp[1] / 100) / 10 : null, src, 'PIB nominal, billones'); }
    const ilif = cg.match(/techo de endeudamiento interno neto de ([\d,]+\.?\d*) mmp\s+y un techo de endeudamiento externo neto[^\d]+([\d.]+) miles de\s+millones de d[oó]lares/i);
    if (D.cgpe.ilif2027) { compare('cgpe', 'ilif2027.domesticBn', D.cgpe.ilif2027.domesticBn, ilif ? num(ilif[1]) : null, src, 'ILIF proposal (mmdp)'); compare('cgpe', 'ilif2027.externalUsdBn', D.cgpe.ilif2027.externalUsdBn, ilif ? num(ilif[2]) : null, src, 'ILIF proposal (USD bn)'); }
    // Macro-assumption rows: the SHCP columns must match the table; percent strings are compared numerically.
    const pct = (s) => { const m = String(s ?? '').match(/-?[\d.]+/); return m ? Number(m[0]) : null; };
    const findRow = (re) => (D.cgpe.rows || []).find((x) => re.test(x.es));
    const checks = [
      [findRow(/^Cetes 28 d[ií]as, promedio/), r.cetesAvg, 'Cetes 28 días, promedio'],
      [findRow(/^Cetes 28 d[ií]as, cierre/), r.cetesEnd, 'Cetes 28 días, fin de periodo'],
      [findRow(/^Tipo de cambio/), r.fxEnd, 'Tipo de cambio, fin de periodo'],
      [findRow(/^Mezcla mexicana/), r.oil, 'Mezcla mexicana, promedio'],
      [findRow(/^Inflaci[oó]n/), r.inflEnd, 'Inflación dic/dic'],
      [findRow(/^RFSP/), r.rfsp ? r.rfsp.map(Math.abs) : null, 'RFSP % PIB'],
    ];
    for (const [rowD, rowDoc, label] of checks) {
      if (!rowD) continue;
      for (const [i, y] of [[0, curr], [1, next]]) {
        const v = rowD[`shcp${y}`]; if (v == null || v === '—') continue;
        compare('cgpe', `rows[${label}].shcp${y}`, pct(v), rowDoc ? rowDoc[i] : null, src, label);
      }
    }
  }

  // ---- Banxico survey: Cuadro 1 medians (last column = current month) and Cuadro 2's next-12-months median.
  // Only checked when the mirror is the same survey the block cites (a newer mirror means the routine is due to update).
  const enc = await mirror('banxico-encuesta');
  if (enc && D.banxicoSurvey) {
    const src = sourceOf(enc), B = D.banxicoSurvey;
    if (B.url && src && decodeURIComponent(B.url) !== decodeURIComponent(src)) {
      findings.push({ block: 'banxicoSurvey', field: 'url', docs: B.url, document: src, note: 'a newer Banxico survey is mirrored; the document routine should update the block', severity: 'warn' });
    } else {
      const block = (label) => { const i = enc.search(new RegExp(label, 'i')); return i < 0 ? '' : enc.slice(i, i + 400); };
      const med = (label, y) => { const m = block(label).match(new RegExp(`Expectativa para ${y}\\s+[\\d.]+\\s+[\\d.]+\\s+[\\d.]+\\s+([\\d.]+)`)); return m ? num(m[1]) : null; };
      for (const y of Object.keys(B.inflationEnd || {})) compare('banxicoSurvey', `inflationEnd.${y}`, B.inflationEnd[y], med('Inflaci[oó]n General \\(dic', y), src, 'Cuadro 1, mediana', 0.005);
      for (const y of Object.keys(B.gdpGrowth || {})) compare('banxicoSurvey', `gdpGrowth.${y}`, B.gdpGrowth[y], med('Crecimiento del PIB', y), src, 'Cuadro 1, mediana', 0.005);
      for (const y of Object.keys(B.fxEnd || {})) compare('banxicoSurvey', `fxEnd.${y}`, B.fxEnd[y], med('Tipo de Cambio Pesos/D[oó]lar', y), src, 'Cuadro 1, mediana', 0.005);
      for (const y of Object.keys(B.rateEnd || {})) compare('banxicoSurvey', `rateEnd.${y}`, B.rateEnd[y], med('Tasa de fondeo interbancario', y), src, 'Cuadro 1, mediana (tasa de fondeo)', 0.005);
      const n12 = enc.match(/Para los pr[oó]ximos 12 meses[\s\S]{0,800}?Mediana\s+[\d.]+\s+([\d.]+)/);
      if (B.inflationNext12m != null) compare('banxicoSurvey', 'inflationNext12m', B.inflationNext12m, n12 ? num(n12[1]) : null, src, 'Cuadro 2, inflación general, próximos 12 meses, mediana', 0.005);
      const inst = enc.match(/(\d+) grupos de an[aá]lisis/);
      if (B.institutions != null) compare('banxicoSurvey', 'institutions', B.institutions, inst ? num(inst[1]) : null, src, 'número de instituciones', 0.5);
    }
  }

  // ---- PAF: estimates quoted in the text (not caps) and the average maturities / fixed-rate share.
  const paf = await mirror('shcp-paf');
  if (paf && D.paf) {
    const src = sourceOf(paf);
    const ext = paf.match(/ubic[aá]ndose\s+en ([\d.]+)% de la deuda total/i) || paf.match(/equivalente al\s+([\d.]+)% del saldo de la deuda neta/i);
    compare('paf', 'externalShareEstPct', D.paf.externalShareEstPct, ext ? num(ext[1]) : null, src, 'deuda externa neta, % del total, estimación (no es tope)');
    if ('externalCapPct' in D.paf) findings.push({ block: 'paf', field: 'externalCapPct', docs: D.paf.externalCapPct, document: null, source: src, note: 'the PAF figure is an estimate; the key must be externalShareEstPct', severity: 'error' });
    const mat = paf.match(/plazo promedio de\s+vencimiento de ([\d.]+) a[ñn]os; y de ([\d.]+) a[ñn]os para la deuda externa/i);
    compare('paf', 'avgMaturityDomesticYears', D.paf.avgMaturityDomesticYears, mat ? num(mat[1]) : null, src, 'plazo promedio interno');
    compare('paf', 'avgMaturityExternalYears', D.paf.avgMaturityExternalYears, mat ? num(mat[2]) : null, src, 'plazo promedio externo');
    const fix = paf.match(/tasa fija y largo plazo, se estima que representen el ([\d.]+)% de la/i) || paf.match(/largo plazo y tasa fija al cierre de\s+\d{4} se estima en ([\d.]+)% del total/i);
    compare('paf', 'fixedRateSharePct', D.paf.fixedRateSharePct, fix ? num(fix[1]) : null, src, 'valores a tasa fija y largo plazo, % del total');
    const lifInPaf = paf.match(/techo de endeudamiento interno neto del Gobierno Federal de (\d)\s+bill[oó]n (\d{1,3}) mmp/i);
    if (lifInPaf && D.lif) compare('lif', 'domesticBn (as restated in the PAF)', D.lif.domesticBn, Number(lifInPaf[1]) * 1000 + Number(lifInPaf[2]), src, 'PAF restates the LIF ceiling');
  }

  const errors = findings.filter((f) => f.severity === 'error'), warns = findings.filter((f) => f.severity !== 'error');
  if (JSON_OUT) { console.log(JSON.stringify({ ok, findings }, null, 2)); }
  else {
    console.log(`docs-data.js vs mirrored documents: ${ok.length} values match, ${errors.length} mismatch, ${warns.length} could not be located.`);
    for (const f of findings) console.log(`${f.severity === 'error' ? '::error::' : '::warning::'}${f.block}.${f.field}: docs-data ${f.docs} vs document ${f.document} — ${f.note} · ${f.source}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      const rows = findings.map((f) => `| ${f.severity} | ${f.block}.${f.field} | ${f.docs} | ${f.document} | ${f.note} |`).join('\n');
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### docs-data.js cross-check\n\n${ok.length} values match.\n\n${findings.length ? '| level | field | docs-data | document | note |\n|---|---|---|---|---|\n' + rows : 'No mismatches.'}\n`);
    }
  }
  process.exit(errors.length ? 1 : 0);
}
main().catch((e) => { console.error('::error::' + e.message); process.exit(2); });
