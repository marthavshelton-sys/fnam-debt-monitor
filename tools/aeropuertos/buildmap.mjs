import fs from "node:fs";
import * as d3 from "d3-geo";
import * as tc from "topojson-client";
import * as ts from "topojson-server";
import * as tsi from "topojson-simplify";

const W = process.argv[2];
const q = Number(process.argv[3] || 0.35);
const ne = JSON.parse(fs.readFileSync(W + "/ne10-admin1.geojson", "utf8"));
console.log("admin1 features:", ne.features.length, "| props:", Object.keys(ne.features[0].properties).slice(0, 30).join(","));
const mx = ne.features.filter(f => f.properties.name && (f.properties.adm0_a3 === "MEX" || f.properties.admin === "Mexico" || f.properties.iso_a2 === "MX"));
console.log("mx states:", mx.length);
console.log(mx.map(f => (f.properties.name || "?") + "[" + (f.properties.postal || f.properties.iso_3166_2 || "") + "]").join(", "));
console.log("odd:", JSON.stringify(mx.filter(f => !f.properties.name).map(f => ({alt: f.properties.name_alt, loc: f.properties.name_local, type: f.properties.type_en, area: f.properties.area_sqkm, code: f.properties.iso_3166_2, note: f.properties.note}))));

const wa = JSON.parse(fs.readFileSync(W + "/world-atlas-50m.json", "utf8"));
const countries = tc.feature(wa, wa.objects.countries).features;
const keep = { "840": 1, "320": 1, "084": 1, "192": 1, "340": 1, "222": 1 };
const nb = countries.filter(c => keep[c.id]);
const mexico = countries.find(c => c.id === "484");

const Wv = 1000, Hv = Number(process.argv[4] || 620), pad = 14;
const proj = d3.geoConicConformal().parallels([17.5, 29.5]).rotate([102, 0]);
proj.fitExtent([[pad, pad], [Wv - pad, Hv - pad]], mexico);
proj.clipExtent([[0, 0], [Wv, Hv]]);
proj.precision(0);
const path = d3.geoPath(proj);
console.log("mexico bounds after fit:", JSON.stringify(path.bounds(mexico)));
const round = d => (d || "").replace(/(-?\d+\.\d)\d+/g, "$1");

let topo = ts.topology({ states: { type: "FeatureCollection", features: mx } }, 1e5);
topo = tsi.presimplify(topo);
topo = tsi.simplify(topo, tsi.quantile(topo, q));
const states = tc.feature(topo, topo.objects.states).features;
const borders = tc.mesh(topo, topo.objects.states, (a, b) => a !== b);
const outline = tc.mesh(topo, topo.objects.states, (a, b) => a === b);

const out = {
  viewBox: [0, 0, Wv, Hv],
  projection: { type: "conicConformal", parallels: [17.5, 29.5], rotate: [102, 0], scale: proj.scale(), translate: proj.translate() },
  states: states.map(f => ({ name: f.properties.name, code: f.properties.postal || f.properties.iso_3166_2 || "", d: round(path(f)) })),
  borders: round(path(borders)),
  outline: round(path(outline)),
  neighbors: nb.map(c => ({ name: c.properties.name, d: round(path(c)) })).filter(n => n.d),
};
const apPath = W + "/airports.json";
if (fs.existsSync(apPath)) {
  const aps = JSON.parse(fs.readFileSync(apPath, "utf8"));
  out.airports = aps.map(a => { const p = proj([a.lon, a.lat]); return { ...a, x: p ? +p[0].toFixed(1) : null, y: p ? +p[1].toFixed(1) : null }; });
}
fs.writeFileSync(W + "/mexico-map.json", JSON.stringify(out));
const sz = k => JSON.stringify(out[k]).length;
console.log("sizes: states", sz("states"), "borders", sz("borders"), "outline", sz("outline"), "neighbors", sz("neighbors"), "total", JSON.stringify(out).length);
console.log("proj scale/translate:", proj.scale(), proj.translate());
for (const [n, lon, lat] of [["MEX", -99.0721, 19.4363], ["TIJ", -116.9702, 32.5411], ["CUN", -86.8771, 21.0365], ["TAP", -92.37, 14.7943], ["MTY", -100.1069, 25.7785]]) console.log(n, proj([lon, lat]).map(v => v.toFixed(1)).join(","));
