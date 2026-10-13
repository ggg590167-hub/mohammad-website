'use strict';

const S = require('../src/standards');

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

console.log('═══════════════════════════════════════════════');
console.log('  اختبار الطبقة 2: standards.js');
console.log('═══════════════════════════════════════════════\n');

console.log('─── الجداول محمّية (frozen) ───');
eq(Object.isFrozen(S.CABLE_SIZES), true, 'CABLE_SIZES مُجمّد');
eq(Object.isFrozen(S.CABLE_AMPACITY), true, 'CABLE_AMPACITY مُجمّد');
eq(Object.isFrozen(S.BREAKER_RATINGS), true, 'BREAKER_RATINGS مُجمّد');

console.log('\n─── تقريب للأعلى ───');
eq(S.roundUpToStandard(S.CABLE_SIZES, 5), 6, '5 → 6 mm²');
eq(S.roundUpToStandard(S.CABLE_SIZES, 33), 35, '33 → 35 mm²');
eq(S.roundUpToStandard(S.CABLE_SIZES, 240), 240, '240 → 240 mm²');
eq(S.roundUpToStandard(S.CABLE_SIZES, 300), 240, '300 → 240 (الأعلى)');

console.log('\n─── تقريب للأسفل ───');
eq(S.roundDownToStandard(S.CABLE_SIZES, 5), 4, '5 → 4 mm²');
eq(S.roundDownToStandard(S.CABLE_SIZES, 33), 25, '33 → 25 mm²');
eq(S.roundDownToStandard(S.BREAKER_RATINGS, 400), 400, '400 → 400 A');
eq(S.roundDownToStandard(S.BREAKER_RATINGS, 450), 400, '450 → 400 A');

console.log('\n─── تحمل الكابلات ───');
eq(S.getCableAmpacity(10), 70, '10mm² → 70A');
eq(S.getCableAmpacity(50), 180, '50mm² → 180A');
eq(S.getCableAmpacity(240), 514, '240mm² → 514A');
eq(S.getCableAmpacity(999), null, 'مقطع غير موجود → null');

console.log('\n─── أصغر مقطع لتيار ───');
eq(S.smallestCableForCurrent(38), 4, '38A → 4mm² (تحمل 40A)');
eq(S.smallestCableForCurrent(138), 35, '138A → 35mm² (تحمل 148A)');  // التحقق
eq(S.smallestCableForCurrent(500), 240, '500A → 240mm²');
eq(S.smallestCableForCurrent(600), null, '600A → لا يوجد');

console.log('\n─── صلاحية المقاطع ───');
eq(S.isValidCable(10), true, '10 mm² موجود');
eq(S.isValidCable(11), false, '11 mm² غير قياسي');
eq(S.isValidBreaker(125), true, '125 A قياسي');
eq(S.isValidBreaker(130), false, '130 A غير قياسي');

console.log('\n─── الحدود القصوى ───');
eq(S.getMaxCable(), 240, 'أكبر مقطع 240mm²');
eq(S.getMaxBreaker(), 2500, 'أكبر قاطع 2500A');
eq(S.getMaxCableAmpacity(), 514, 'تحمل أكبر مقطع 514A');

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
