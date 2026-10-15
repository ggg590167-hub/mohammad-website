'use strict';

const V = require('../src/validation');
const Sys = require('../src/system');

let passed = 0, failed = 0;

function check(label, condition, details) {
  if (condition) { passed++; console.log(`✅ ${label}`); }
  else { failed++; console.log(`❌ ${label}`); if (details) console.log(`   ${details}`); }
}

/* ═══ مساعد: فحص آمن للعنصر الأول ═══ */
function firstSeverity(issues) {
  return issues && issues.length > 0 ? issues[0].severity : null;
}
function hasCode(issues, code) {
  return issues && issues.some(i => i.code === code);
}

console.log('═══════════════════════════════════════════════');
console.log('  اختبار الطبقة 5: validation.js (v2)');
console.log('═══════════════════════════════════════════════\n');

/* ═══ 1. تنسيق سليم ═══ */
console.log('─── 1. تنسيق سليم (100, 125, 180) ───');
let issues = V.validateCoordination(100, 125, 180, 'كابل');
check('100 ≤ 125 ≤ 180 → لا مشاكل', issues.length === 0, `عدد: ${issues.length}`);

/* ═══ 2. تنسيق خطأ — التيار > القاطع ═══ */
console.log('\n─── 2. التيار (200) > القاطع (125) ───');
issues = V.validateCoordination(200, 125, 300, 'كابل');
issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
check('تم الكشف', issues.length >= 1);
check('الخطورة = error', firstSeverity(issues) === V.SEVERITY.ERROR);
check('الكود صحيح', hasCode(issues, 'COORD_LOAD_EXCEEDS_BREAKER'));

/* ═══ 3. تنسيق خطأ — القاطع > الكابل ═══ */
console.log('\n─── 3. القاطع (250) > الكابل (180) ───');
issues = V.validateCoordination(100, 250, 180, 'كابل');
issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
check('تم الكشف', issues.length >= 1);
check('الخطورة = error', firstSeverity(issues) === V.SEVERITY.ERROR);
check('الكود صحيح', hasCode(issues, 'COORD_BREAKER_EXCEEDS_CABLE'));

/* ═══ 4. هامش ضيق ═══ */
console.log('\n─── 4. هامش التحمل ضيق (100, 105, 108) ───');
issues = V.validateCoordination(100, 105, 108, 'كابل');
console.log(`   المارجن = 108/100 = 1.08`);
issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
check('تم كشف الهامش الضيق', hasCode(issues, 'COORD_MARGIN_LOW'));
check('الخطورة = warning', firstSeverity(issues) === V.SEVERITY.WARNING);

/* ═══ 5. هبوط الجهد — مقبول ═══ */
console.log('\n─── 5. هبوط الجهد: 0.5% < 1% ───');
issues = V.validateVoltageDrop(0.5, 1, 'كابل البطارية');
check('لا مشاكل', issues.length === 0);

/* ═══ 6. هبوط الجهد — قريب ═══ */
console.log('\n─── 6. هبوط الجهد: 0.92% قريب من 1% ───');
issues = V.validateVoltageDrop(0.92, 1, 'كابل البطارية');
issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
check('تحذير', hasCode(issues, 'VDROP_NEAR_LIMIT'));

/* ═══ 7. هبوط الجهد — تجاوز ═══ */
console.log('\n─── 7. هبوط الجهد: 1.5% > 1% ───');
issues = V.validateVoltageDrop(1.5, 1, 'كابل البطارية');
check('خطأ', firstSeverity(issues) === V.SEVERITY.ERROR);

/* ═══ 8. Voc — آمن ═══ */
console.log('\n─── 8. Voc: 400V < 475V ───');
issues = V.validateVoc(400, 500, 'الألواح');
check('لا مشاكل', issues.length === 0);

/* ═══ 9. Voc — قريب ═══ */
console.log('\n─── 9. Voc: 480V > 475V ───');
issues = V.validateVoc(480, 500, 'الألواح');
check('تحذير', hasCode(issues, 'VOC_NEAR_LIMIT'));

/* ═══ 10. Voc — تجاوز ═══ */
console.log('\n─── 10. Voc: 550V > 500V ───');
issues = V.validateVoc(550, 500, 'الألواح');
check('خطأ', firstSeverity(issues) === V.SEVERITY.ERROR);

/* ═══ 11. الإنفرتر — كافٍ ═══ */
console.log('\n─── 11. الإنفرتر: 10000 ≥ 5000×1.25 ───');
issues = V.validateInverter(10000, 5000, 'إنفرتر');
check('لا مشاكل', issues.length === 0);

/* ═══ 12. الإنفرتر — صغير ═══ */
console.log('\n─── 12. الإنفرتر: 4000 < 5000 ───');
issues = V.validateInverter(4000, 5000, 'إنفرتر');
check('خطأ', hasCode(issues, 'INV_TOO_SMALL'));

/* ═══ 13. البطارية — كافية ═══ */
console.log('\n─── 13. البطارية: 20000 ≥ 18750 ───');
issues = V.validateBattery(20000, 15000, 1, 0.8, 'بطاريات');
check('لا مشاكل', issues.length === 0);

/* ═══ 14. البطارية — صغيرة ═══ */
console.log('\n─── 14. البطارية: 10000 < 18750 ───');
issues = V.validateBattery(10000, 15000, 1, 0.8, 'بطاريات');
check('خطأ', issues.length >= 1);

/* ═══ 15. الألواح — كافية ═══ */
console.log('\n─── 15. الألواح: 4400 ≥ 4000×1.05 ───');
issues = V.validatePV(4400, 4000, 'ألواح');
check('لا مشاكل', issues.length === 0);

/* ═══ 16. الألواح — هامش ضيق ═══ */
console.log('\n─── 16. الألواح: 4100 < 4200 ───');
issues = V.validatePV(4100, 4000, 'ألواح');
check('تحذير', hasCode(issues, 'PV_MARGIN_LOW'));

/* ═══ 17. الألواح — غير كافية ═══ */
console.log('\n─── 17. الألواح: 3500 < 4000 ───');
issues = V.validatePV(3500, 4000, 'ألواح');
check('خطأ', firstSeverity(issues) === V.SEVERITY.ERROR);

/* ═══ 18. الفحص الشامل — بيت متوسط ═══ */
console.log('\n─── 18. الفحص الشامل: بيت متوسط (20A) ───');
const sys1 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 20, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1
});
let validation = V.validateSystem(sys1);
console.log(`   صالح؟ ${validation.valid} | أخطاء: ${validation.counts.errors} | تحذيرات: ${validation.counts.warnings}`);
validation.issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
check('النظام صالح', validation.valid === true);

/* ═══ 19. الفحص الشامل — مشروع HV ═══ */
console.log('\n─── 19. الفحص الشامل: مشروع HV (100 kWh) ───');
const sys2 = Sys.analyzeSystem({
  method: 'daily',
  dailyKWh: 100, peakFactor: 4,
  hsp: 5.5, autonomyDays: 1
});
validation = V.validateSystem(sys2);
console.log(`   صالح؟ ${validation.valid} | أخطاء: ${validation.counts.errors} | تحذيرات: ${validation.counts.warnings}`);
validation.issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
check('النظام صالح', validation.valid === true);

/* ═══ 20. الفحص الشامل — مشروع ضخم ═══ */
console.log('\n─── 20. الفحص الشامل: مشروع ضخم (500A) ───');
const sys3 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 500, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1
});
validation = V.validateSystem(sys3);
console.log(`   صالح؟ ${validation.valid} | أخطاء: ${validation.counts.errors} | تحذيرات: ${validation.counts.warnings}`);
validation.issues.forEach(i => console.log(`   [${i.severity}] ${i.code}: ${i.message}`));
// التصميم الجديد: لا فحص MPPT ثابت — الإنفرتر يختاره المهندس
const mpptOverload = validation.issues.some(i => i.code === 'MPPT_OVERLOAD');
check('لا يوجد MPPT_OVERLOAD (تصميم جديد)', mpptOverload === false,
      'لا يُصدر خطأ MPPT بدون مواصفات إنفرتر');

const mpptWarn = validation.issues.some(i => i.code === 'MPPT_CHECK_REQUIRED');
check('يُصدر تحذير MPPT_CHECK_REQUIRED', mpptWarn === true,
      'يجب تنبيه المهندس للتحقق من MPPT');

const hasRequirements = sys3.inverterRequirements != null;
check('inverterRequirements موجود', hasRequirements === true,
      'مخرجات النظام يجب أن تحتوي على متطلبات الإنفرتر');

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
