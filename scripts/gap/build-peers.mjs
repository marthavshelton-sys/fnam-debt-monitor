// Builds the peers tables from the FactSet snapshot (site/gap, site/asur and site/oma share one snapshot).
// Thin wrapper over scripts/lib/factset-peers.mjs: `node scripts/gap/build-peers.mjs` = `node scripts/lib/factset-peers.mjs build`.
// The snapshot (tools/gap/raw/factset/latest.json) is written nightly by the cloud routine "FNAM Airports: FactSet peers
// refresh" (prompt in tools/gap/FACTSET-PEERS-PROMPT.md); definitions and pull files are documented in the library.
import { build } from '../lib/factset-peers.mjs';

const { file, rows, written } = build();
console.log(`build: ${file.split('/').pop()} → ${written.length} files`);
for (const p of Object.values(rows)) console.log(`${p.short.padEnd(9)} ${p.priceDate} ${p.currency} ${p.price}  EV/EBITDA NTM ${p.evEbitdaNtm}x (1y ${p.evEbitdaNtmAvg1y}, 3y ${p.evEbitdaNtmAvg3y}, 5y ${p.evEbitdaNtmAvg5y})  P/E NTM ${p.peNtm}x (1y ${p.peNtmAvg1y}, 3y ${p.peNtmAvg3y}, 5y ${p.peNtmAvg5y})  ADTV US$${p.adtvUsdM} M`);
