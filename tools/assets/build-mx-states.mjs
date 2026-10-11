// Usage: node tools/assets/build-mx-states.mjs
// Builds site/assets/mx-states.js: one SVG path per federal entity (31 states and Mexico City) for the choropleth maps of
// the Mexican Consumer page. The outlines are the ones the airports hub already draws (tools/aeropuertos/mexico-map.json:
// Natural Earth 10m admin-1, public domain, conic conformal projection, simplified on the shared topology), keyed here by
// INEGI's two-digit entity code. `c` is the label point (centroid of the entity's largest polygon) and `a` that polygon's
// area in viewport units (the page labels only the entities large enough to hold their abbreviation).
import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync(new URL('../aeropuertos/mexico-map.json', import.meta.url), 'utf8'));
// Natural Earth code -> INEGI code, the abbreviation printed on the map, the name in Spanish
const KEY = {
  AG: ['01', 'AGS', 'Aguascalientes'], BC: ['02', 'BC', 'Baja California'], BS: ['03', 'BCS', 'Baja California Sur'], CM: ['04', 'CAMP', 'Campeche'], CO: ['05', 'COAH', 'Coahuila'], CL: ['06', 'COL', 'Colima'],
  CS: ['07', 'CHIS', 'Chiapas'], CH: ['08', 'CHIH', 'Chihuahua'], DF: ['09', 'CDMX', 'Ciudad de México'], DG: ['10', 'DGO', 'Durango'], GJ: ['11', 'GTO', 'Guanajuato'], GR: ['12', 'GRO', 'Guerrero'],
  HG: ['13', 'HGO', 'Hidalgo'], JA: ['14', 'JAL', 'Jalisco'], MX: ['15', 'MEX', 'Estado de México'], MI: ['16', 'MICH', 'Michoacán'], MO: ['17', 'MOR', 'Morelos'], NA: ['18', 'NAY', 'Nayarit'],
  NL: ['19', 'NL', 'Nuevo León'], OA: ['20', 'OAX', 'Oaxaca'], PU: ['21', 'PUE', 'Puebla'], QT: ['22', 'QRO', 'Querétaro'], QR: ['23', 'QROO', 'Quintana Roo'], SL: ['24', 'SLP', 'San Luis Potosí'],
  SI: ['25', 'SIN', 'Sinaloa'], SO: ['26', 'SON', 'Sonora'], TB: ['27', 'TAB', 'Tabasco'], TM: ['28', 'TAMPS', 'Tamaulipas'], TL: ['29', 'TLAX', 'Tlaxcala'], VE: ['30', 'VER', 'Veracruz'], YU: ['31', 'YUC', 'Yucatán'], ZA: ['32', 'ZAC', 'Zacatecas'],
};
const r1 = (v) => Math.round(v * 10) / 10;
// rings of an absolute "M x,y L x,y … Z" path
function rings(d) {
  return d.split(/Z/i).map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^M/i, '').split(/L/i).map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite)));
}
function area(ring) { let a = 0; for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; return a / 2; }
function centroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) { const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f; }
  return a ? [cx / (3 * a), cy / (3 * a)] : ring[0];
}
function pathOf(ring) {   // relative coordinates after the first point keep the file small
  let d = `M${r1(ring[0][0])},${r1(ring[0][1])}`, px = r1(ring[0][0]), py = r1(ring[0][1]);
  for (let i = 1; i < ring.length; i++) { const x = r1(ring[i][0]), y = r1(ring[i][1]); if (x === px && y === py) continue; d += `l${r1(x - px)},${r1(y - py)}`; px = x; py = y; }
  return d + 'z';
}
const MIN_RING = 1.2;   // specks (tiny islands) are dropped unless they are the entity's largest polygon
const states = {};
for (const s of src.states) {
  const k = KEY[s.code]; if (!k) throw new Error(`no INEGI code for ${s.code} ${s.name}`);
  const rs = rings(s.d).filter((r) => r.length >= 3).map((r) => ({ r, a: Math.abs(area(r)) })).sort((x, y) => y.a - x.a);
  const keep = rs.filter((x, i) => i === 0 || x.a >= MIN_RING);
  const c = centroid(rs[0].r);
  states[k[0]] = { n: k[2], ab: k[1], d: keep.map((x) => pathOf(x.r)).join(''), c: [r1(c[0]), r1(c[1])], a: Math.round(rs[0].a) };
}
if (Object.keys(states).length !== 32) throw new Error(`${Object.keys(states).length} entities, expected 32`);
const sorted = Object.fromEntries(Object.keys(states).sort().map((k) => [k, states[k]]));
const out = { source: 'Natural Earth 10m admin-1 (public domain), conic conformal projection, simplified', width: src.viewBox[2], height: src.viewBox[3], states: sorted };
const file = new URL('../../site/assets/mx-states.js', import.meta.url);
fs.writeFileSync(file, '// Mexico by federal entity (31 states and Mexico City): one SVG path per entity, keyed by INEGI code, for choropleth maps.\n// ' + out.source + '. Built by the map tooling from the outlines of the airports hub; do not hand-edit.\nwindow.FNAM_MX_STATES = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(states).length, 'entities,', fs.statSync(file).size, 'bytes');
for (const k of Object.keys(sorted)) console.log(k, sorted[k].ab.padEnd(5), String(sorted[k].a).padStart(6), sorted[k].c.join(','));
