// Hyperscaler Hub: modules 1, 2, 4, 5 and 7 (capacity, committed capacity, electricity, sites, circular financing).
// Runs after build.mjs. Reads the curated files in tools/hyperscalers/data/ (capacity, sites, power, circular), the
// harvested filing passages in raw/notes/ and, for Oracle, the Oracle model's store (tools/oracle/data/buildout.json,
// sources.json). For every filing citation it resolves the key "<TICKER> <form> <period end>" to the accession and URL
// and checks that the quoted sentence appears in the harvested text of the cited page ("quote matched"); that check is
// mechanical and does not replace the second reading that turns "needs review" into "verified".
// Writes site/hiperescaladores/data/{capacity,sites,power,circular}.js, the module CSVs and data/modules-log.json.
import { readdir } from 'node:fs/promises';
import { readJson, writeJson, writeText, TOOLS, SITE, nowET } from './lib.mjs';

const stamp = nowET();
const { companies } = await readJson(TOOLS + 'companies.json');
const CO = Object.fromEntries(companies.map((c) => [c.ticker, c]));
const cap = await readJson(TOOLS + 'data/capacity.json');
const sites = await readJson(TOOLS + 'data/sites.json');
const power = await readJson(TOOLS + 'data/power.json');
const circ = await readJson(TOOLS + 'data/circular.json');
const orcl = await readJson('tools/oracle/data/buildout.json', null);
const orclSrc = await readJson('tools/oracle/data/sources.json', {});
const finSrc = await import('node:fs/promises').then((m) => m.readFile(SITE + 'data/financials.js', 'utf8'));
const FIN = JSON.parse(finSrc.slice(finSrc.indexOf('=') + 1).trim().replace(/;\s*$/, ''));

// ---- harvested filings: key -> { form, accn, url, filed, report, pages: { page: [text…] } }
const FILINGS = {};
for (const c of companies) {
  let files = [];
  try { files = await readdir(`${TOOLS}raw/notes/${c.ticker}`); } catch { continue; }
  for (const f of files) {
    const j = await readJson(`${TOOLS}raw/notes/${c.ticker}/${f}`);
    const pages = {};
    for (const h of j.hits) (pages[h.page] ||= []).push(h.text);
    FILINGS[`${c.ticker} ${j.form} ${j.report}`] = { ticker: c.ticker, form: j.form, accn: j.accn, url: j.url, filed: j.filed, report: j.report, harvested: j.harvested, pages };
  }
}
const norm = (s) => String(s || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[\s ​]+/g, ' ').replace(/\s+([%,.)])/g, '$1').replace(/\$\s+/g, '$').trim().toLowerCase();
const problems = [];
function resolve(src, where) {
  if (!src || !src.k) return null;
  const f = FILINGS[src.k];
  if (!f) { problems.push({ where, k: src.k, issue: 'filing not harvested' }); return { ...src, tier: 'T1', quoteCheck: 'no_harvest' }; }
  const q = norm(src.quote);
  let check = 'not_found', foundOn = null;
  if (q && (f.pages[src.page] || []).some((t) => norm(t).includes(q))) check = 'page';
  else if (q) for (const [p, ts] of Object.entries(f.pages)) if (ts.some((t) => norm(t).includes(q))) { check = 'other_page'; foundOn = p; break; }
  if (check !== 'page') problems.push({ where, k: src.k, page: src.page, issue: check === 'other_page' ? `quote found on harvested page ${foundOn}` : 'quote not found in harvested text' });
  const printed = /^seq/.test(String(src.page)) ? null : src.page;
  return { k: src.k, tier: 'T1', form: f.form, accn: f.accn, url: f.url, filed: f.filed, report: f.report, page: printed, pageSeq: printed ? null : String(src.page).replace('seq', ''), section: src.section, quote: src.quote, quoteCheck: check, foundOn };
}
function resolveAll(obj, where) {
  for (const key of ['src', 'ownershipSrc', 'gpuSrc', 'valueSrc']) if (obj[key] && obj[key].k) obj[key] = resolve(obj[key], `${where}.${key}`);
  // the item's review state travels with each of its citations, so every source card says who verified it and when
  if (obj.status) for (const key of ['src', 'ownershipSrc', 'gpuSrc', 'valueSrc']) if (obj[key]) Object.assign(obj[key], { status: obj.status, verifiedBy: obj.verifiedBy || null, verifiedOn: obj.verifiedOn || null });
  return obj;
}

// ---- Oracle (T2): capacity and sites from the Oracle model's store
function oSrc(key, page) {
  const s = orclSrc[key] || (orclSrc.sources || {})[key];
  if (!s) return { tier: 'T2', title: key, page: page || null, key, noUrl: true };
  const out = { tier: 'T2', title: 'Oracle ' + String(s.title).replace(/\s*—.*$/, ''), date: s.filing_date, url: s.url || null, page: page || null, key };
  // Earnings-call transcripts are licensed copies supplied by the owner: no public URL. The reader gets the call date and
  // the same-day earnings release (8-K Ex. 99.1, public on EDGAR), labeled as not containing the quoted sentence.
  if (!out.url) {
    out.noUrl = true;
    const m = /^S-CALL-(FY\d{4}Q\d)$/.exec(key);
    const rel = m && (orclSrc[`S-8K-${m[1]}`] || (orclSrc.sources || {})[`S-8K-${m[1]}`]);
    if (rel && rel.url) out.companion = { title: rel.title, url: rel.url, accn: rel.accession || null, date: rel.filing_date || null };
  }
  return out;
}
const orclCap = orcl ? {
  updated: orcl.updated,
  fiscalYears: (orcl.capacity.fiscal_years || []).map((y) => ({ id: y.id, mw: y.mw, qualifier: 'over', text: y.text, src: oSrc(y.source, y.page), speaker: y.speaker })),
  quarters: (orcl.capacity.quarters || []).map((q) => ({ id: q.id, mw: q.mw, approx: !!q.approx, derived: !!q.derived, gpus: q.gpus || null, text: q.text, src: oSrc(q.source, q.page), speaker: q.speaker })),
  secured: orcl.capacity.secured ? { gw: orcl.capacity.secured.gw, asOf: orcl.capacity.secured.as_of, text: orcl.capacity.secured.text, src: oSrc(orcl.capacity.secured.source, orcl.capacity.secured.page) } : null,
  utilization: (orcl.gpu && orcl.gpu.utilization || []).map((u) => ({ id: u.id, pct: u.pct, text: u.text, src: oSrc(u.source, u.page) }))
} : null;

// ---- module 1–2
for (const [i, x] of cap.current.entries()) resolveAll(x, `capacity.current[${i}]`);
const pipeline = [];
for (const [i, x] of cap.pipeline.entries()) {
  if (x.fromOracleStore === 'capacity.secured') {
    if (orclCap && orclCap.secured) pipeline.push({ ticker: 'ORCL', stage: 'contracted', metric: 'secured_partners', mw: orclCap.secured.gw * 1000, qualifier: 'over', asOfFq: orclCap.secured.asOf, target_es: 'en los próximos tres años; más de 90% financiado por socios', target_en: 'over the next three years; more than 90% funded through partners', src: { ...orclCap.secured.src, quote: orclCap.secured.text }, tier: 'T2', status: 'company_statement' });
    continue;
  }
  pipeline.push(resolveAll(x, `capacity.pipeline[${i}]`));
}
for (const [i, x] of cap.notDisclosed.entries()) resolveAll(x, `capacity.notDisclosed[${i}]`);
const capacityOut = { generated: stamp.iso, refreshedET: stamp.et, updated: cap.updated, readBy: cap.readBy, definitions: cap.definitions, current: cap.current, pipeline, notDisclosed: cap.notDisclosed, oracle: orclCap };

// ---- module 5
const siteRows = [];
for (const [i, s] of sites.sites.entries()) {
  if (s.fromOracleStore) {
    const o = orcl && orcl.sites.find((x) => x.name === s.fromOracleStore);
    if (!o) { problems.push({ where: `sites[${i}]`, issue: `Oracle store site not found: ${s.fromOracleStore}` }); continue; }
    const srcs = (o.sources || []).map((x) => x.key ? { ...oSrc(x.key), short: x.short || x.title } : { tier: /oracle\.com|sec\.gov/.test(x.url || '') ? 'T2' : 'context', title: x.title, url: x.url, date: x.date });
    siteRows.push({ ...s, name: o.name, mw: o.capacity_mw, mwMetric: 'planned_campus', capacityText: o.capacity_text, customer: o.customer, developer: o.developer, financing: o.financing, oracleStatus: o.oracle_status, online_en: o.first_delivery, contracted: o.contracted, power_en: o.power || null, tier: 'T2', sources: srcs });
    continue;
  }
  siteRows.push({ ...resolveAll({ ...s }, `sites[${i}]`), tier: 'T1' });
}
const sitesOut = { generated: stamp.iso, refreshedET: stamp.et, updated: sites.updated, readBy: sites.readBy, sites: siteRows };

// ---- module 4
for (const [i, d] of power.companyDeals.entries()) if (d.src && d.src.k) d.src = resolve(d.src, `power.companyDeals[${i}]`); else if (d.src) d.src = { ...d.src, tier: d.tier };
for (const [i, s] of power.searched.entries()) if (s.src) s.src = resolve(s.src, `power.searched[${i}]`);
const powerOut = { generated: stamp.iso, refreshedET: stamp.et, updated: power.updated, readBy: power.readBy, companyDeals: power.companyDeals, searched: power.searched, grid: power.grid };

// ---- module 7: revenue shares computed from T1 revenue (fiscal year or trailing four quarters ending at the flow date)
function revenueAt(tk, period, asOf) {
  const c = FIN.companies[tk]; if (!c) return null;
  const q = c.quarters.filter((x) => x.ttm && x.ttm.revenue != null && x.end <= asOf).pop();
  return q ? { v: q.ttm.revenue, id: q.id, end: q.end, tag: (c.quarters.find((x) => x.id === q.id).m.revenue || [])[1] } : null;
}
for (const [i, f] of circ.flows.entries()) {
  if (f.src && f.src.k) f.src = resolve(f.src, `circular.flows[${i}]`);
  if (!f.tier) f.tier = f.src ? 'T1' : 'T2';
  if (f.shareOf && f.shareOf.calc && f.amountUSDm != null) {
    const r = revenueAt(f.shareOf.of, f.period, f.asOf);
    if (r) Object.assign(f.shareOf, { pct: Math.round(f.amountUSDm * 1e6 / r.v * 1000) / 10, revenue: r.v, revenuePeriod: r.id, revenueTag: r.tag, method: `${f.amountUSDm} m / ${(r.v / 1e6).toFixed(0)} m revenue (${r.id}, XBRL)` });
  }
}
for (const [i, c] of circ.concentration.entries()) {
  if (c.src) c.src = resolve(c.src, `circular.concentration[${i}]`);
  if (c.calcRevenue) { const f = circ.flows.find((x) => x.id === c.flow); if (f && f.shareOf && f.shareOf.pct != null) { c.pct = f.shareOf.pct; c.calcMethod = f.shareOf.method; } }
  if (c.calc) { c.pct = Math.round(c.calc.num / c.calc.den * 1000) / 10; c.calcMethod = `${c.calc.num} / ${c.calc.den}`; }
}
const circOut = { generated: stamp.iso, refreshedET: stamp.et, updated: circ.updated, readBy: circ.readBy, nodes: circ.nodes, flows: circ.flows, concentration: circ.concentration, inferences: circ.inferences, breakers: circ.breakers };

// ---- write
async function js(file, name, data, comment) { await writeText(`${SITE}data/${file}.js`, `// ${comment}\n// Generated by scripts/hyperscalers/build-modules.mjs — do not hand-edit.\nwindow.${name} = ${JSON.stringify(data)};\n`); }
await js('capacity', 'HYP_CAP', capacityOut, 'Hyperscaler Hub modules 1–2: current and committed capacity (T1 filings; Oracle T2 from its calls).');
await js('sites', 'HYP_SITES', sitesOut, 'Hyperscaler Hub module 5: sites named by the companies (T1 filings; Oracle T2). Map positions are localities, not campus coordinates.');
await js('power', 'HYP_POWER', powerOut, 'Hyperscaler Hub module 4: company power deals (T1/T2) kept apart from grid projections (T3 regulators, T4 estimates).');
await js('circular', 'HYP_CIRC', circOut, 'Hyperscaler Hub module 7: money flows between clouds, chip makers, AI labs and neoclouds (T1 filings of the covered companies).');

const csv = (rows) => rows.map((r) => r.map((v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n') + '\n';
const cite = (s) => s ? [s.tier || '', s.form || s.title || '', s.accn || '', s.page || (s.pageSeq ? 'seq ' + s.pageSeq : ''), s.url || '', s.quote || ''] : ['', '', '', '', '', ''];
const CH = ['tier', 'filing_or_source', 'accession', 'page', 'url', 'quote'];
await writeText(`${SITE}csv/capacity-current.csv`, csv([['ticker', 'metric', 'mw', 'qualifier', 'as_of', 'data_centers', 'ownership', ...CH, 'status', 'refreshed_et'],
  ...cap.current.map((x) => [x.ticker, x.metric, x.mw, x.qualifier || '', x.asOf, x.dataCenters || '', x.ownership || '', ...cite(x.src), x.status, stamp.et]),
  ...(orclCap ? orclCap.fiscalYears.map((y) => ['ORCL', 'delivered', y.mw, 'over', y.id, '', '', 'T2', y.src.title, '', y.src.page, y.src.url || '', y.text, 'company statement', stamp.et]) : []),
  ...(orclCap ? orclCap.quarters.map((q) => ['ORCL', 'delivered', q.mw, q.derived ? 'derived' : q.approx ? 'approx' : '', q.id, '', '', 'T2', q.src.title, '', q.src.page, q.src.url || '', q.text, q.derived ? 'derived from company ratios' : 'company statement', stamp.et]) : [])]));
await writeText(`${SITE}csv/capacity-committed.csv`, csv([['ticker', 'stage', 'metric', 'mw', 'qualifier', 'as_of', 'counterparty', 'contract_value_usd_bn', 'target', 'after_balance_sheet_date', ...CH, 'status', 'refreshed_et'],
  ...pipeline.map((x) => [x.ticker, x.stage, x.metric, x.mw, x.qualifier || '', x.asOf || x.asOfFq, x.counterparty || x.counterparty_en || '', x.valueUSDbn || '', x.target_en || '', x.subsequent ? 'yes' : 'no', ...cite(x.src), x.status, stamp.et])]));
await writeText(`${SITE}csv/sites.csv`, csv([['ticker', 'site', 'locality', 'region', 'country', 'mw', 'mw_definition', 'status', 'expected_online', 'customer', 'power', 'map_lat', 'map_lon', 'map_precision', ...CH, 'refreshed_et'],
  ...siteRows.map((s) => [s.ticker, s.name || s.name_en, s.locality || '', s.region || s.region_en || '', s.country, s.mw, s.mwMetric || '', s.status, s.online_en || '', s.customer || s.customer_en || '', s.power_en || '', s.lat, s.lon, s.precision ? `${s.precision} (not campus coordinates)` : 'location not disclosed', ...(s.src ? cite(s.src) : ['T2', (s.sources || []).map((x) => x.title || x.short).join(' | '), '', '', (s.sources || []).map((x) => x.url).filter(Boolean).join(' | '), '']), stamp.et])]));
await writeText(`${SITE}csv/power-company-deals.csv`, csv([['ticker', 'counterparty', 'asset', 'source_type', 'mw', 'mw_basis', 'usd_m', 'usd_basis', 'term_years', 'announced', 'is_goal', 'in_filing', ...CH, 'refreshed_et'],
  ...power.companyDeals.map((d) => [d.ticker, d.counterparty || d.counterparty_en, d.asset || d.asset_en, d.source_type, d.mw, d.mwBasis_en || '', d.usdM, d.usdBasis_en || '', d.termYears || '', d.announced, d.isGoal ? 'yes' : 'no', d.inFiling ? 'yes' : 'no', ...cite(d.src), stamp.et])]));
await writeText(`${SITE}csv/power-grid.csv`, csv([['id', 'tier', 'publisher', 'title', 'edition', 'edition_date', 'next_expected', 'label', 'value', 'value_high', 'unit', 'note', 'url', 'page', 'refreshed_et'],
  ...power.grid.flatMap((g) => g.values.map((v) => [g.id, g.tier, g.publisher, g.title_en, g.edition, g.editionDate, g.nextExpected || '', v.label_en, v.v, v.vHigh || '', v.unit, v.note_en || '', g.url, g.page, stamp.et]))]));
await writeText(`${SITE}csv/circular-flows.csv`, csv([['id', 'from', 'to', 'type', 'amount_usd_m', 'basis', 'as_of', 'mw', 'share_of', 'share_pct', 'share_disclosed_or_calc', 'accounting', ...CH, 'refreshed_et'],
  ...circ.flows.map((f) => [f.id, f.from, f.to, f.type, f.amountUSDm, f.basis, f.asOf, f.mw || '', f.shareOf ? f.shareOf.of : '', f.shareOf ? f.shareOf.pct : '', f.shareOf ? (f.shareOf.disclosed ? 'disclosed' : 'FNAM calculation: ' + (f.shareOf.method || '')) : '', f.accounting_en, ...(f.src ? cite(f.src) : ['T2', f.srcT2 ? f.srcT2.title_en : '', '', '', '', '']), stamp.et])]));

await writeJson(TOOLS + 'data/modules-log.json', { problems });
console.log(`build-modules: capacity ${cap.current.length}+${pipeline.length}, sites ${siteRows.length}, power ${power.companyDeals.length} deals / ${power.grid.length} grid sources, circular ${circ.flows.length} flows; ${problems.length} citation issues`);
for (const p of problems) console.log('  ', JSON.stringify(p));
