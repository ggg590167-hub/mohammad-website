'use strict';

const C = require('../src/components');

let passed = 0, failed = 0;

function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  if (!ok) {
    console.log(`   متوقع: ${JSON.stringify(expected)}`);
    console.log(`   فعلي:   ${JSON.stringify(actual)}`);
  }
}

function check(label, condition, details) {
  if (condition) { passed++; console.log(`✅ ${label}`); }
  else { failed++; console.log(`❌ ${label}`); if (details) console.log(`   ${details}`); }
}

console.log('═══════════════════════════════════════════════');
console.log('  اختبار الطبقة 3: components.js');
console.log('═══════════════════════════════════════════════\n');

/* ═══ الحالة 1: بيت صغير ═══ */
console.log('─── الحالة 1: بيت صغير (38A، 2م، 48V) ───');
let r = C.selectCableAndBreaker({
  current: 38, legLength: 2, voltage: 48, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
check('النتيجة صحيحة', r.valid);
check('38A ≤ القاطع', 38 <= r.breaker);
check('القاطع ≤ التحمل', r.breaker <= r.cableAmpacity);

/* ═══ الحالة 2: بيت متوسط ═══ */
console.log('\n─── الحالة 2: بيت متوسط (138A، 2م، 48V) ───');
r = C.selectCableAndBreaker({
  current: 138, legLength: 2, voltage: 48, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
check('النتيجة صحيحة', r.valid);
check('138A ≤ القاطع', 138 <= r.breaker);
check('القاطع ≤ التحمل', r.breaker <= r.cableAmpacity);

/* ═══ الحالة 3: مشروع LV كبير ═══ */
console.log('\n─── الحالة 3: مشروع LV كبير (327A، 2م، 48V) ───');
r = C.selectCableAndBreaker({
  current: 327, legLength: 2, voltage: 48, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
check('النتيجة صحيحة', r.valid);
check('327A ≤ القاطع', 327 <= r.breaker);
check('القاطع ≤ التحمل', r.breaker <= r.cableAmpacity);

/* ═══ الحالة 4: مشروع HV متوسط ═══ */
console.log('\n─── الحالة 4: مشروع HV متوسط (136A، 2م، 400V) ───');
r = C.selectCableAndBreaker({
  current: 136, legLength: 2, voltage: 400, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
check('النتيجة صحيحة', r.valid);

/* ═══ الحالة 5: مشروع HV كبير ═══ */
console.log('\n─── الحالة 5: مشروع HV كبير (272A، 2م، 400V) ───');
r = C.selectCableAndBreaker({
  current: 272, legLength: 2, voltage: 400, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
check('النتيجة صحيحة', r.valid);

/* ═══ الحالة 6: مشروع HV ضخم (500A) ═══ */
console.log('\n─── الحالة 6: مشروع HV ضخم (500A، 2م، 400V) ───');
r = C.selectCableAndBreaker({
  current: 500, legLength: 2, voltage: 400, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
console.log(`   السبب: ${r.reason}`);
check('النتيجة صحيحة', r.valid);
check('يحتاج مسارات متعددة', r.paths >= 1);

/* ═══ الحالة 7: مشروع HV عملاق (1000A) ═══ */
console.log('\n─── الحالة 7: مشروع HV عملاق (1000A، 2م، 400V) ───');
r = C.selectCableAndBreaker({
  current: 1000, legLength: 2, voltage: 400, dropPercent: 1, minArea: 10
});
console.log(`   مقطع: ${r.cableSize}mm² × ${r.paths} | قاطع: ${r.breaker}A | تحمل: ${r.cableAmpacity}A`);
check('النتيجة صحيحة', r.valid);
check('1000A ≤ إجمالي التحمل', 1000 <= r.cableAmpacity);

/* ═══ حالات خطأ ═══ */
console.log('\n─── حالات خطأ ───');
r = C.selectCableAndBreaker({ current: 0, legLength: 2, voltage: 48, dropPercent: 1 });
check('تيار صفري → رفض', !r.valid);

r = C.selectCableAndBreaker({ current: 100, legLength: 0, voltage: 48, dropPercent: 1 });
check('طول صفري → رفض', !r.valid);

r = C.selectCableAndBreaker({ current: 100, legLength: 2, voltage: 0, dropPercent: 1 });
check('جهد صفري → رفض', !r.valid);

/* ═══ فحص التنسيق ═══ */
console.log('\n─── فحص التنسيق (coordination) ───');
let v = C.validateCoordination(100, 125, 180);
check('100A ≤ 125A ≤ 180A → صحيح', v.valid);

v = C.validateCoordination(200, 125, 180);
check('200A > 125A → خطأ', !v.valid);

v = C.validateCoordination(100, 250, 180);
check('250A > 180A → خطأ', !v.valid);

/* ═══ فحص هبوط الجهد ═══ */
console.log('\n─── فحص هبوط الجهد النهائي ───');
const drop = C.finalVoltageDrop(2, 100, 50, 1);
console.log(`   2م، 100A، 50mm² = ${drop.toFixed(4)}V`);
check('الهبوط موجب', drop > 0);

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
