'use strict';

const P = require('../src/physics');

let passed = 0, failed = 0;
const TOL = 0.01;

function assertEqual(actual, expected, label, tol) {
  tol = tol == null ? TOL : tol;
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) {
    console.log(`   متوقع: ${expected}`);
    console.log(`   فعلي:   ${actual}`);
  }
}

console.log('═══════════════════════════════════════════════');
console.log('  اختبار الطبقة 1: physics.js');
console.log('═══════════════════════════════════════════════\n');

console.log('─── القدرة DC ───');
assertEqual(P.powerDC(48, 100), 4800, '48V × 100A = 4800W');
assertEqual(P.powerDC(400, 20), 8000, '400V × 20A = 8000W');

console.log('\n─── التيار DC ───');
assertEqual(P.currentDC(4800, 48), 100, '4800W / 48V = 100A');
assertEqual(P.currentDC(20000, 400), 50, '20000W / 400V = 50A');

console.log('\n─── القدرة 1φ ───');
assertEqual(P.powerAC1Phase(230, 10, 0.9), 2070, '230V × 10A × 0.9 = 2070W');

console.log('\n─── القدرة 3φ ───');
assertEqual(
  P.powerAC3Phase(400, 10, 0.9),
  Math.sqrt(3) * 400 * 10 * 0.9,
  '√3 × 400 × 10 × 0.9 = 6235W'
);

console.log('\n─── التيار 3φ ───');
assertEqual(
  P.currentAC3Phase(50000, 400, 0.9),
  50000 / (Math.sqrt(3) * 400 * 0.9),
  '50kW / (√3 × 400 × 0.9) = 80.2A'
);

console.log('\n─── هبوط الجهد ───');
assertEqual(
  P.voltageDrop(2, 100, 50),
  (2 * 2 * 100 * 0.0196) / 50,
  '2م × 100A على 50mm² = 0.157V'
);

console.log('\n─── المقطع من VD ───');
assertEqual(
  P.areaFromVoltageDrop(2, 100, 48, 1),
  (2 * 2 * 100 * 0.0196) / (48 * 0.01),
  'مسافة 2م، 100A، 48V، 1% → 16.3mm²'
);

console.log('\n─── المقطع من الحرارة ───');
assertEqual(P.areaFromThermal(100, 3), 33.33, '100A / 3A/mm² = 33.33mm²');

console.log('\n─── Voc مع الحرارة ───');
assertEqual(
  P.vocAtTemperature(50, -10),
  50 * (1 + (-0.003) * (-35)),
  'Voc 50V عند -10°C = 55.25V'
);

console.log('\n─── الطاقة اليومية ───');
assertEqual(P.energyDaily(1000, 5), 5000, '1000W × 5h = 5000Wh');

console.log('\n─── طاقة البطارية ───');
assertEqual(
  P.batteryEnergyRequired(10000, 0.92, 0.8),
  10000 / (0.92 * 0.8),
  '10000Wh, η=0.92, DoD=0.8 → 13587Wh'
);

console.log('\n─── PR ───');
assertEqual(
  P.performanceRatio(0.97, 0.94, 0.85, 0.96),
  0.97 * 0.94 * 0.85 * 0.96,
  '0.97 × 0.94 × 0.85 × 0.96 = 0.744'
);

console.log('\n─── مسارات متوازية ───');
assertEqual(P.parallelPaths(500, 370), 2, '500A / 370A → 2 مسار');

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
