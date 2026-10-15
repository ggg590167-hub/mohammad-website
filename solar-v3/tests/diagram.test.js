'use strict';
/* ═══════════════════════════════════════════════════════════════
   diagram.test.js — TDD
   يفحص: جهود السلاسل (336/336/336/294) + التيار الفيزيائي (13.1 A)
   ═══════════════════════════════════════════════════════════════ */

const assert = require('node:assert/strict');
const { buildDiagram } = require('../src/diagram');

let passed = 0, failed = 0;
function ok(label, cond, details) {
  if (cond) { passed++; console.log('✅ ' + label); }
  else { failed++; console.log('❌ ' + label); if (details) console.log('   ' + details); }
}

function mock(panels) {
  return {
    mode: 'HV', phases: 3,
    load: { peakW: 20000 },
    pv: { actualW: panels * 550, panelW: 550, nPanels: panels },
    inverter: { stdW: 50000, ratedW: 50000, nInverters: 1 },
    battery: { actualKWh: 143.2, towers: 4, autonomyDays: 1,
               actualWh: 0, actualAh: 0, units: 0, unitAh: 0 },
    pvCable:      { cableSize: 50, paths: 1, breaker: 160 },
    acCable:      { cableSize: 35, paths: 1, breaker: 100 },
    batteryCable: { cableSize: 50, paths: 1, breaker: 160 },
    iAc: 80, map: {}
  };
}

const CASES = [
  { panels: 31, voltages: [336, 336, 336, 294], label: '31 لوح → 8+8+8+7' },
  { panels: 30, voltages: [336, 336, 294, 294], label: '30 لوح → 8+8+7+7' },
  { panels: 16, voltages: [336, 336],           label: '16 لوح → 8+8' },
  { panels:  8, voltages: [336],                label: '8 لوح → 8' },
  { panels:  7, voltages: [294],                label: '7 لوح → 7' }
];

console.log('═══════════════════════════════════════════════');
console.log('  اختبار diagram.js — TDD');
console.log('═══════════════════════════════════════════════\n');

for (const c of CASES) {
  console.log('─── ' + c.label + ' ───');
  const svg = buildDiagram(mock(c.panels));

  // 1. جهود السلاسل الفعلية
  for (const v of c.voltages) {
    const re = new RegExp('\\b' + v + '\\.0\\s*V\\b');
    ok(`جهد ${v}.0 V`, re.test(svg), `لم يُعثر على "${v}.0 V"`);
  }

  // 2. عدّاد السلاسل
  ok(`${c.voltages.length} سلسلة`, svg.includes(`الترتيب: ${c.voltages.length} سلسلة`));

  // 3. التيار الفيزيائي — 550W / 42V = 13.095 A
  ok('تيار السلسلة 13.1 A', /\b13\.1\s*A/.test(svg),
     'لم يُعثر على "13.1 A"');
  ok('لا يُعرض 12.7 A (القيمة الخاطئة)', !/\b12\.7\s*A/.test(svg),
     'ظهرت القيمة الخاطئة 12.7 A');

  // 4. لا قيم مشوّهة
  for (const bad of ['undefined', 'NaN', 'null', '[object']) {
    ok(`لا "${bad}"`, !svg.includes(bad));
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
