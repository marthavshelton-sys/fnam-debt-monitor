#!/usr/bin/env node
// Smoke test the separate research page's real data contracts and interactive controls.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { ROOT } from './paths.mjs';

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, innerHTML: '', textContent: '', value: '', hidden: false, checked: false,
    classList: { toggle() {} }, querySelectorAll() { return []; },
    addEventListener(type, callback) { this[`on${type}`] = callback; }
  });
  return elements.get(id);
}
for (const [k,v] of Object.entries({ mw:850,ramp:75,unit:8,margin:35,capex:18,discount:12,terminal:10 })) element(`s_${k}`).value=String(v);
const document = { getElementById: element, querySelectorAll() { return []; }, documentElement: { setAttribute() {} } };
const window = { print() {} };
const localStorage = { getItem() { return null; }, setItem() {} };
const context = { window, document, localStorage, console };
for (const path of ['site/oracle/data/financials.js', 'site/oracle/data/comments.js', 'site/oracle/data/guidance.js', 'site/oracle/research/data/research.js', 'site/oracle/research/app.js']) {
  runInNewContext(readFileSync(join(ROOT,path),'utf8'), context, { filename:path });
}
assert.equal((element('kpis').innerHTML.match(/class="kpi"/g)||[]).length, 5);
assert.match(element('guidanceTable').innerHTML, /30–34%/);
assert.match(element('statementTable').innerHTML, /850 MW/); // latest y/y comments
assert.match(element('statementTable').innerHTML, /2027Q1|1T27/);
assert.match(element('scenarioOutput').innerHTML, /Valor presente incremental/);
element('btnLangEn').onclick();
assert.match(element('statementTable').innerHTML, /850MW/);
element('segMode').onclick({target:{closest:()=>({dataset:{v:'ytd'}})}});
assert.match(element('statementTable').innerHTML, /Year-to-date|Total revenues/);
element('segStmt').onclick({target:{closest:()=>({dataset:{v:'cf'}})}});
assert.match(element('statementTable').innerHTML, /Free cash flow/);
element('chkNg').checked=true;element('chkNg').onchange({target:element('chkNg')});
assert.match(element('statementTable').innerHTML, /Free cash flow/);
assert.doesNotMatch(element('statementTable').innerHTML, /%%/);
console.log('Research dashboard: data, guidance, y/y commentary, language, YTD and cash-flow controls passed.');
