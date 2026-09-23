import fs from "node:fs";
const W = process.argv[2], OUT = process.argv[3];
const agg = JSON.parse(fs.readFileSync(W + "/afac-agg.json", "utf8"));
const airportsMeta = JSON.parse(fs.readFileSync(W + "/airports.json", "utf8"));
const mapData = JSON.parse(fs.readFileSync(W + "/mexico-map.json", "utf8"));
const aicm = JSON.parse(fs.readFileSync(W + "/aicm.json", "utf8"));
const xy = new Map(mapData.airports.map(a => [a.code, [a.x, a.y]]));
const Y0 = agg.Y0, last = agg.lastIndex;
const months = []; for (let i = 0; i <= last; i++) months.push((Y0 + Math.floor(i / 12)) + "-" + String(i % 12 + 1).padStart(2, "0"));
const GROUPS = ["GAP", "OMA", "ASUR", "AICM", "AIFA", "OTROS"];
const empty = { pax: { dom: [], intl: [] }, annual: { pax: {}, ops: {}, cargo: {} }, opHistory: [] };
const airports = airportsMeta.filter(a => a.code !== "TGZ0").map(a => {
  const d = agg.airports[a.code] || empty; const p = xy.get(a.code) || [null, null];
  return { code: a.code, es: a.es, en: a.en, st: a.st, grp: a.grp, op: d.opHistory.length ? d.opHistory[d.opHistory.length - 1].label : null, opHistory: d.opHistory, lat: a.lat, lon: a.lon, x: p[0], y: p[1], pax: d.pax, annual: d.annual };
});
const aMonths = Object.keys(aicm.pax).sort();
const aSer = k => ({ dom: aMonths.map(m => aicm[k][m] ? +(+aicm[k][m].dom).toFixed(1) : null), intl: aMonths.map(m => aicm[k][m] ? +(+aicm[k][m].intl).toFixed(1) : null) });
const out = {
  generatedAt: new Date().toISOString(),
  units: { pax: "passengers (persons, arriving + departing, per airport)", ops: "aircraft movements", cargo: "metric tons" },
  months, lastMonth: months[last], airportsFrom: agg.airportsFrom, groups: GROUPS,
  national: agg.national, byGroup: agg.byGroup, airports,
  aicm: { months: aMonths, pax: aSer("pax"), ops: aSer("ops"), cargo: aSer("cargo"), note: "AICM en Cifras (monthly PDFs): commercial passengers, total operations (commercial + general aviation) and cargo in tons, national / international." },
  aifa: { since: "2022-03-21", asOf: "2026-08-31", ops: 224153, pax: 22049814, cargoTons: 1316615.32, source: "https://www.aifa.aero/" },
  sources: {
    afac: { title: "AFAC - Estadistica operativa de aeropuertos 2006-2026 (julio 2026)", url: "https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404", file: "producto-aeropuerto-2006-2026-jul-27082026.xlsx", published: "2026-08-27" },
    aicm: { title: "AICM en Cifras - julio 2026 y cierres anuales 2019-2025", url: "https://www.aicm.com.mx/categoria/estadisticas", updated: "2026-08-18" },
    aifa: { title: "AIFA - numeralia del portal", url: "https://www.aifa.aero/" }
  }
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + "/traffic.js", "// AUTO-GENERATED from AFAC / AICM / AIFA public statistics - do not hand-edit. Generated " + out.generatedAt + "\nwindow.MX_AIRPORTS = " + JSON.stringify(out) + ";\n");
const mapOut = { viewBox: mapData.viewBox, projection: mapData.projection, states: mapData.states, neighbors: mapData.neighbors };
fs.writeFileSync(OUT + "/map.js", "// Mexico base map: Natural Earth 10m admin-1 (public domain), simplified; conic conformal projection. Generated " + out.generatedAt + "\nwindow.MX_MAP = " + JSON.stringify(mapOut) + ";\n");
console.log("traffic.js", fs.statSync(OUT + "/traffic.js").size, "bytes | map.js", fs.statSync(OUT + "/map.js").size, "bytes | months", months.length, months[0], "..", months[last]);
const sumY = (s, y) => { let t = 0; for (let m = 0; m < 12; m++) { const i = (y - Y0) * 12 + m; if (i <= last) t += (s.dom[i] || 0) + (s.intl[i] || 0); } return t; };
const M = v => (v / 1e6).toFixed(2);
console.log("national pax (M): 2019", M(sumY(agg.national.pax, 2019)), "| 2023", M(sumY(agg.national.pax, 2023)), "| 2024", M(sumY(agg.national.pax, 2024)), "| 2025", M(sumY(agg.national.pax, 2025)), "| 2026 YTD", M(sumY(agg.national.pax, 2026)));
for (const g of GROUPS) console.log("  " + g + " 2025 pax (M):", M(sumY(agg.byGroup[g].pax, 2025)), "| 2026 YTD:", M(sumY(agg.byGroup[g].pax, 2026)), "| ops 2025:", sumY(agg.byGroup[g].ops, 2025), "| cargo t 2025:", Math.round(sumY(agg.byGroup[g].cargo, 2025)));
const top = airports.map(a => [a.code, a.annual.pax[2025] || 0]).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log("top airports 2025 (M):", top.map(t => t[0] + " " + M(t[1])).join(", "));
console.log("op labels:", airports.filter(a => a.grp === "OTROS").map(a => a.code + ":" + a.op).join(" "));
// Slim summary for the hub page: same shape, last 36 months only, passengers only.
{
  const K = 36, s0 = Math.max(0, months.length - K), a0 = months.indexOf(agg.airportsFrom);
  const slicePax = s => ({ dom: s.dom.slice(s0), intl: s.intl.slice(s0) });
  const sum = {
    generatedAt: out.generatedAt, months: months.slice(s0), lastMonth: out.lastMonth, airportsFrom: months[s0], groups: GROUPS,
    national: { pax: slicePax(agg.national.pax) },
    byGroup: Object.fromEntries(GROUPS.map(g => [g, { pax: slicePax(agg.byGroup[g].pax) }])),
    airports: airports.map(a => ({ code: a.code, es: a.es, en: a.en, st: a.st, grp: a.grp, op: a.op, x: a.x, y: a.y, pax: { dom: (a.pax.dom || []).slice(s0 - a0), intl: (a.pax.intl || []).slice(s0 - a0) } }))
  };
  fs.writeFileSync(OUT + "/summary.js", "// AUTO-GENERATED slim summary (last 36 months) for /aeropuertos/ - do not hand-edit. Generated " + out.generatedAt + "\nwindow.MX_AIRPORTS = " + JSON.stringify(sum) + ";\n");
  console.log("summary.js", fs.statSync(OUT + "/summary.js").size, "bytes; months", sum.months[0], "..", sum.months[sum.months.length - 1], "; MEX last:", sum.airports.find(a => a.code === "MEX").pax.dom.slice(-1)[0]);
}
