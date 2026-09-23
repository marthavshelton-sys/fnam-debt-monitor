// Run this in the browser console on https://www.gob.mx/afac/acciones-y-programas/estadisticas-280404
// (the AFAC site sits behind a bot challenge, so the workbook has to be fetched from a real browser session).
// It downloads the "Estadistica Operativa de Aeropuertos 2006-20xx" workbook linked on the page, reads the
// pivot-cache records inside it (the only place the monthly data lives), aggregates them and downloads afac-agg.json.
(async () => {
  const link = [...document.querySelectorAll('a[href]')].find(a => /producto-aeropuerto/.test(a.href));
  if (!link) throw new Error('workbook link not found on this page');
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const buf = await (await fetch(link.href, { credentials: 'include' })).arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', bookFiles: true });
  const dec = new TextDecoder('utf-8');
  const getf = k => { const f = wb.files[k]; const c = f.content; return dec.decode(c instanceof Uint8Array ? c : new Uint8Array(c)); };
  const keys = Object.keys(wb.files);
  const def = getf(keys.find(k => /pivotCacheDefinition1\.xml$/.test(k)));
  const rec = getf(keys.find(k => /pivotCacheRecords1\.xml$/.test(k)));
  const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const fields = []; const fre = /<cacheField name="([^"]*)"[^>]*>([\s\S]*?)<\/cacheField>/g; let m;
  while ((m = fre.exec(def))) { const shared = []; const sre = /<([sn]) v="([^"]*)"/g; let s; while ((s = sre.exec(m[2]))) shared.push(unesc(s[2])); fields.push({ name: unesc(m[1]), shared }); }
  const rows = []; const rre = /<r>([\s\S]*?)<\/r>/g; const cre = /<([xnsmbde])(?: v="([^"]*)")?\/>/g;
  while ((m = rre.exec(rec))) { const cells = []; let c, i = 0; cre.lastIndex = 0; while ((c = cre.exec(m[1]))) { const t = c[1], v = c[2]; if (t === 'x') cells.push(fields[i].shared[+v]); else if (t === 'm') cells.push(''); else cells.push(unesc(v || '')); i++; } rows.push(cells); }
  // columns: OPTIONS, TYPE, YEAR, GROUP, AIRPORT, ENE..DIC, TOTAL, partial
  const META = "CANCUN|CUN|ASUR;COZUMEL|CZM|ASUR;HUATULCO|HUX|ASUR;MERIDA|MID|ASUR;MINATITLAN|MTT|ASUR;OAXACA|OAX|ASUR;TAPACHULA|TAP|ASUR;VERACRUZ|VER|ASUR;VILLAHERMOSA|VSA|ASUR;ACAPULCO|ACA|OMA;CD. JUAREZ|CJS|OMA;CHIHUAHUA|CUU|OMA;CULIACAN|CUL|OMA;DURANGO|DGO|OMA;MAZATLAN|MZT|OMA;MONTERREY|MTY|OMA;REYNOSA|REX|OMA;SAN LUIS POTOSI|SLP|OMA;TAMPICO|TAM|OMA;TORREON|TRC|OMA;ZACATECAS|ZCL|OMA;ZIHUATANEJO|ZIH|OMA;AGUASCALIENTES|AGU|GAP;BAJIO|BJX|GAP;GUADALAJARA|GDL|GAP;HERMOSILLO|HMO|GAP;LA PAZ|LAP|GAP;LOS MOCHIS|LMM|GAP;MANZANILLO|ZLO|GAP;MEXICALI|MXL|GAP;MORELIA|MLM|GAP;PUERTO VALLARTA|PVR|GAP;SAN JOSE DEL CABO|SJD|GAP;TIJUANA|TIJ|GAP;TUXTLA GUTIERREZ (ANGEL ALBINO CORZO)|TGZ|OTROS;CAMPECHE|CPE|OTROS;CD. DEL CARMEN|CME|OTROS;CD. OBREGÓN|CEN|OTROS;CD. VICTORIA|CVM|OTROS;CHETUMAL|CTM|OTROS;COLIMA|CLQ|OTROS;CUERNAVACA|CVJ|OTROS;GUAYMAS|GYM|OTROS;LORETO|LTO|OTROS;MATAMOROS|MAM|OTROS;NOGALES|NOG|OTROS;NUEVO LAREDO|NLD|OTROS;PALENQUE|PQM|OTROS;POZA RICA|PAZ|OTROS;PUERTO ESCONDIDO|PXM|OTROS;SAN CRISTOBAL DE LAS CASAS|SZT|OTROS;TAMUÍN|TSL|OTROS;TEHUACÁN|TCN|OTROS;TEPIC|TPQ|OTROS;TERAN|TGZ|OTROS;TOLUCA|TLC|OTROS;URUAPAN|UPN|OTROS;PUEBLA|PBC|OTROS;QUERÉTARO|QRO|OTROS;CIUDAD DE MÉXICO/MEXICO CITY|MEX|AICM;PUERTO PEÑASCO|PPE|OTROS;IXTEPEC|IZT|OTROS;SANTA LUCÍA|NLU|AIFA;TULÚM|TQO|OTROS;CREEL|CEL|OTROS;CHICHÉN ITZÁ|CZA|OTROS;DEL NORTE|NTR|OTROS;CHICHEN ITZA|CZA|OTROS";
  const meta = new Map(META.split(';').map(s => { const [n, c, g] = s.split('|'); return [n, { code: c, grp: g }]; }));
  const OPT = { 'OPERACIONES/ FLIGHTS': 'ops', 'PASAJEROS/PASSENGERS': 'pax', 'CARGA/ CARGO': 'cargo' };
  const TYPE = { 'NACIONAL/DOMESTIC': 'dom', 'INTERNACIONAL/ INTERNATIONAL': 'intl' };
  const Y0 = 2006; let Y1 = Y0; rows.forEach(r => { Y1 = Math.max(Y1, +r[2] || Y0); });
  const N = (Y1 - Y0 + 1) * 12, idx = (y, mo) => (y - Y0) * 12 + mo - 1;
  const zeros = () => new Array(N).fill(0), mk = () => ({ pax: { dom: zeros(), intl: zeros() }, ops: { dom: zeros(), intl: zeros() }, cargo: { dom: zeros(), intl: zeros() } });
  const data = {}, opBy = {}, unknown = new Set(); let used = 0;
  for (const r of rows) { if (r.length < 17) continue; const mm = meta.get(r[4]); if (!mm) { unknown.add(r[4]); continue; } const k = OPT[r[0]], t = TYPE[r[1]], y = +r[2]; if (!k || !t) continue; const c = mm.code; data[c] ??= mk(); opBy[c] ??= {}; opBy[c][y] = r[3]; for (let mo = 1; mo <= 12; mo++) { data[c][k][t][idx(y, mo)] += parseFloat(r[4 + mo]) || 0; } used++; }
  const natPax = zeros(); for (const c in data) for (let i = 0; i < N; i++) natPax[i] += data[c].pax.dom[i] + data[c].pax.intl[i];
  let last = N - 1; while (last > 0 && natPax[last] === 0) last--;
  const cut = a => a.slice(0, last + 1), rnd = (a, d) => a.map(v => d ? +v.toFixed(d) : Math.round(v));
  const series = (o, d) => ({ dom: rnd(cut(o.dom), d), intl: rnd(cut(o.intl), d) }), measures = o => ({ pax: series(o.pax, 0), ops: series(o.ops, 0), cargo: series(o.cargo, 1) });
  const GROUPS = ['GAP', 'OMA', 'ASUR', 'AICM', 'AIFA', 'OTROS'], gAgg = {}; GROUPS.forEach(g => gAgg[g] = mk()); const national = mk();
  const grpOf = {}; meta.forEach(v => grpOf[v.code] = v.grp);
  for (const c in data) { const g = grpOf[c]; for (const k of ['pax', 'ops', 'cargo']) for (const t of ['dom', 'intl']) for (let i = 0; i < N; i++) { gAgg[g][k][t][i] += data[c][k][t][i]; national[k][t][i] += data[c][k][t][i]; } }
  const A0 = idx(2010, 1);
  const annual = arr => { const o = {}; for (let y = Y0; y <= Y1; y++) { let s = 0, any = false; for (let mo = 1; mo <= 12; mo++) { const i = idx(y, mo); if (i <= last) { s += arr[i]; any = true; } } if (any) o[y] = Math.round(s); } return o; };
  const airports = {};
  for (const c in data) { const d = data[c]; const yrs = Object.keys(opBy[c]).map(Number).sort((a, b) => a - b); const seg = []; for (const y of yrs) { const lab = opBy[c][y]; if (!seg.length || seg[seg.length - 1].label !== lab) seg.push({ from: y, label: lab }); } const tot = k => cut(d[k].dom).map((v, i) => v + d[k].intl[i]); airports[c] = { pax: { dom: rnd(cut(d.pax.dom).slice(A0), 0), intl: rnd(cut(d.pax.intl).slice(A0), 0) }, annual: { pax: annual(tot('pax')), ops: annual(tot('ops')), cargo: annual(tot('cargo')) }, opHistory: seg }; }
  const out = { Y0, lastIndex: last, airportsFrom: '2010-01', national: measures(national), byGroup: Object.fromEntries(GROUPS.map(g => [g, measures(gAgg[g])])), airports, rowsUsed: used, unknown: [...unknown], sourceFile: link.href.split('/').pop() };
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'afac-agg.json'; document.body.appendChild(a); a.click(); a.remove();
  console.log('rows used', used, '| unknown airports (add them to META and airports.json):', [...unknown], '| last month index', last, '=', Y0 + Math.floor(last / 12) + '-' + String(last % 12 + 1).padStart(2, '0'));
})();
