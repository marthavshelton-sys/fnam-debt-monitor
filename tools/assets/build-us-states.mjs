// Usage: npm i --no-save us-atlas topojson-client topojson-simplify && node tools/assets/build-us-states.mjs [node_modules dir]
// Builds site/assets/us-states.js: one SVG path per state (50 states and the District of Columbia) for the choropleth
// maps of the American Consumer page. Source: U.S. Census Bureau cartographic boundary files via us-atlas
// (states-albers-10m: Albers USA composite projection, Alaska and Hawaii as insets, 975 × 610 viewport), simplified with
// topojson-simplify so shared borders stay shared. `c` is the label point (centroid of the state's largest polygon) and
// `a` that polygon's area in viewport units (the page labels only the states large enough to hold their code).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const nm = path.resolve(process.argv[2] || new URL('../../node_modules', import.meta.url).pathname);
const require = createRequire(path.join(nm, 'x.js'));
const tj = require('topojson-client');
const ts = require('topojson-simplify');
const topo0 = JSON.parse(fs.readFileSync(path.join(nm, 'us-atlas/states-albers-10m.json'), 'utf8'));

const POSTAL = { '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY' };

// Simplify on the shared topology (Visvalingam), then drop specks (tiny islands) per state.
const MIN_WEIGHT = 0.9;   // viewport units² of triangle area: keeps the coast legible at 975 px
const MIN_RING = 4.5;     // rings smaller than this area are dropped unless they are the state's largest
const topo = ts.simplify(ts.presimplify(topo0), MIN_WEIGHT);

const r1 = (v) => Math.round(v * 10) / 10;
function ringArea(ring) { let a = 0; for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; return a / 2; }
function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) { const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f; }
  return a ? [cx / (3 * a), cy / (3 * a)] : ring[0];
}
function pathOf(ring) {
  // relative coordinates after the first point keep the file small
  let d = `M${r1(ring[0][0])},${r1(ring[0][1])}`, px = r1(ring[0][0]), py = r1(ring[0][1]);
  for (let i = 1; i < ring.length - 1; i++) {
    const x = r1(ring[i][0]), y = r1(ring[i][1]);
    if (x === px && y === py) continue;
    d += `l${r1(x - px)},${r1(y - py)}`; px = x; py = y;
  }
  return d + 'z';
}

const states = {};
for (const g of topo.objects.states.geometries) {
  const code = POSTAL[g.id];
  if (!code) continue;
  const f = tj.feature(topo, g);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const outer = polys.map((p) => ({ rings: p, area: Math.abs(ringArea(p[0])) })).sort((a, b) => b.area - a.area);
  const keep = outer.filter((p, i) => i === 0 || p.area >= MIN_RING);
  const d = keep.map((p) => p.rings.filter((r, i) => i === 0 || Math.abs(ringArea(r)) >= MIN_RING).map(pathOf).join('')).join('');
  const c = ringCentroid(outer[0].rings[0]);
  states[code] = { n: g.properties.name, f: g.id, d, c: [r1(c[0]), r1(c[1])], a: Math.round(outer[0].area) };
}
const out = {
  source: 'U.S. Census Bureau cartographic boundary files via us-atlas (states-albers-10m), Albers USA composite projection, simplified',
  width: 975, height: 610, states,
};
const file = new URL('../../site/assets/us-states.js', import.meta.url);
fs.writeFileSync(file, '// United States by state (50 states and the District of Columbia): one SVG path per state, Albers USA composite projection, for choropleth maps.\n// ' + out.source + '. Built from the us-atlas package by the map tooling; do not hand-edit.\nwindow.FNAM_US_STATES = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(states).length, 'states,', fs.statSync(file).size, 'bytes');
