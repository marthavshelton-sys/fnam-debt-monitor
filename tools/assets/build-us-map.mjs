// Usage: npm i --no-save us-atlas topojson-client && node tools/assets/build-us-map.mjs
// Builds site/assets/us-map.js: contiguous-US outline and state borders from us-atlas (U.S. Census Bureau cartographic
// boundaries, 1:10m), projected with the standard US Albers equal-area conic (parallels 29.5/45.5, origin 96W 23N),
// Douglas-Peucker simplified. The same projection formula lives in site/oracle/present.js for the site markers.
import fs from 'node:fs';
import * as tj from 'topojson-client';
const topo = JSON.parse(fs.readFileSync(new URL('../../node_modules/us-atlas/states-10m.json', import.meta.url), 'utf8'));
const SKIP = new Set(['02', '15', '72', '60', '66', '69', '78']); // Alaska, Hawaii, Puerto Rico, territories
const states = { ...topo.objects.states, geometries: topo.objects.states.geometries.filter((g) => !SKIP.has(g.id)) };
const D = Math.PI / 180, p1 = 29.5 * D, p2 = 45.5 * D, l0 = -96 * D, f0 = 23 * D;
const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1), r0 = Math.sqrt(C - 2 * n * Math.sin(f0)) / n;
const proj = ([lon, lat]) => { const r = Math.sqrt(C - 2 * n * Math.sin(lat * D)) / n, th = n * (lon * D - l0); return [r * Math.sin(th) * 1000, (r * Math.cos(th) - r0) * 1000]; };
function dp(pts, tol) { if (pts.length < 3) return pts; const [a, b] = [pts[0], pts[pts.length - 1]]; let idx = 0, dmax = 0; for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; idx = i; } } if (dmax > tol) { const l = dp(pts.slice(0, idx + 1), tol), r = dp(pts.slice(idx), tol); return l.slice(0, -1).concat(r); } return [a, b]; }
// Closed rings: split at the point farthest from the start so the segment test is not degenerate.
function dpRing(ring, tol) { const a = ring[0]; let idx = 1, dmax = 0; for (let i = 1; i < ring.length; i++) { const d = Math.hypot(ring[i][0] - a[0], ring[i][1] - a[1]); if (d > dmax) { dmax = d; idx = i; } } const l = dp(ring.slice(0, idx + 1), tol), r = dp(ring.slice(idx), tol); return l.slice(0, -1).concat(r); }
const rnd = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
const TOL = 0.6;
const nation = tj.merge(topo, states.geometries);           // MultiPolygon in lon/lat
const outline = nation.coordinates.flatMap((poly) => poly.map((ring) => dpRing(ring.map(proj), TOL).map(rnd))).filter((r) => r.length > 8);
const mesh = tj.mesh(topo, states, (a, b) => a !== b);        // interior borders only
const borders = mesh.coordinates.map((line) => dp(line.map(proj), TOL).map(rnd)).filter((l) => l.length > 1);
const out = { source: 'U.S. Census Bureau cartographic boundary files via us-atlas (states-10m), Albers equal-area conic (29.5N/45.5N, 96W/23N), simplified', outline, borders };
fs.writeFileSync(new URL('../../site/assets/us-map.js', import.meta.url), '// Contiguous United States: outline rings and state borders, pre-projected (US Albers) for the board presentations.\n// ' + out.source + '. Built by the presentation tooling from the us-atlas package; do not hand-edit.\nwindow.FNAM_US_MAP = ' + JSON.stringify(out) + ';\n');
console.log('outline rings', outline.length, 'points', outline.reduce((a, r) => a + r.length, 0), 'border lines', borders.length, 'points', borders.reduce((a, l) => a + l.length, 0));
