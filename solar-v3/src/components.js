'use strict';

/* ═══════════════════════════════════════════════════════════════
   الطبقة 3: Components — المكونات الهندسية
   ═══════════════════════════════════════════════════════════════
   
   تستخدم:
   - physics.js (المعادلات)
   - standards.js (الجداول)
   
   تُنتج:
   - قرارات هندسية (مقطع، قاطع، مسارات)
   
   القاعدة الذهبية:
   - القاطع يقود الكابل (IEC 60364-4-43)
   - الكابل يحمي القاطع
   - التحقق: I_load ≤ I_breaker ≤ I_cable
   ═══════════════════════════════════════════════════════════════ */

const P = require('./physics');
const S = require('./standards');

/* ═══ دالة رئيسية: اختيار الكابل + القاطع ═══
   
   @param {object} input
     - current: {number} التيار المستمر (A)
     - legLength: {number} طول المسار باتجاه واحد (m)
     - voltage: {number} جهد النظام (V)
     - dropPercent: {number} هبوط الجهد المسموح (%)
     - minArea: {number} الحد الأدنى للمقطع (mm²)
     - jMax: {number} كثافة التيار (A/mm²)، افتراضي 3
     - safetyFactor: {number} هامش أمان للقاطع، افتراضي 1.1
   
   @returns {object}
     - cableSize: المقطع (mm²)
     - paths: عدد المسارات المتوازية
     - breaker: تصنيف القاطع (A)
     - cableAmpacity: تحمل إجمالي الكابل (A)
     - requiredArea: المساحة المطلوبة قبل التقريب
     - valid: هل النتيجة صحيحة
     - reason: سبب القرار
*/
function selectCableAndBreaker(input) {
  // ═══ استخراج المدخلات ═══
  const I = input.current;
  const L = input.legLength;
  const V = input.voltage;
  const dV = input.dropPercent == null ? 1 : input.dropPercent;
  const minArea = input.minArea || 10;
  const jMax = input.jMax;   // اختياري — يُلغى القيد الحراري إن لم يُمرَّر
  const safety = input.safetyFactor || 1.1;

  // ═══ التحقق من المدخلات ═══
  if (!Number.isFinite(I) || I <= 0) {
    return { valid: false, reason: 'التيار غير صالح' };
  }
  if (!Number.isFinite(L) || L <= 0) {
    return { valid: false, reason: 'الطول غير صالح' };
  }
  if (!Number.isFinite(V) || V <= 0) {
    return { valid: false, reason: 'الجهد غير صالح' };
  }

  // ═══ الخطوة 1: القاطع (يعتمد على التيار فقط) ═══
  const breakerTarget = I * safety;
  const breaker = S.roundUpToStandard(S.BREAKER_RATINGS, breakerTarget);

  // ═══ الخطوة 2: المقطع المطلوب لتحمل القاطع ═══
  const cableForBreaker = S.smallestCableForCurrent(breaker);

  // ═══ الخطوة 3: المقطع المطلوب من هبوط الجهد ═══
  const aVD = P.areaFromVoltageDrop(L, I, V, dV);

  // ═══ الخطوة 4: المقطع المطلوب من الحرارة ═══
  const aThermal = (jMax && jMax > 0) ? P.areaFromThermal(I, jMax) : 0;

  // ═══ الخطوة 5: المقطع المطلوب (الأكبر) ═══
  const requiredArea = Math.max(
    aVD || 0,
    aThermal || 0,
    minArea
  );

  // ═══ الخطوة 6: القرار النهائي ═══
  // إذا لم يوجد مقطع يتحمل القاطع → مسارات متوازية
  if (cableForBreaker === null) {
    const maxCable = S.getMaxCable();
    const maxAmp = S.getMaxCableAmpacity();
    const paths = Math.ceil(breaker / maxAmp);
    const totalAmp = maxAmp * paths;

    return {
      cableSize: maxCable,
      paths: paths,
      breaker: breaker,
      cableAmpacity: totalAmp,
      requiredArea: requiredArea,
      valid: I <= totalAmp,
      reason: `${paths} مسارات × ${maxCable}mm² (التيار ${I.toFixed(1)}A > تحمل 240mm² = ${maxAmp}A)`
    };
  }

  // ═══ الحالة العادية: مقطع واحد ═══
  // المقطع النهائي = الأكبر بين (مقطع القاطع، المقطع من VD/الحرارة)
  const finalSize = Math.max(cableForBreaker, S.roundUpToStandard(S.CABLE_SIZES, requiredArea));
  const ampacity = S.getCableAmpacity(finalSize);

  return {
    cableSize: finalSize,
    paths: 1,
    breaker: breaker,
    cableAmpacity: ampacity,
    requiredArea: requiredArea,
    valid: I <= ampacity && breaker <= ampacity,
    reason: `مقطع ${finalSize}mm² (تحمل ${ampacity}A)، قاطع ${breaker}A — ${I.toFixed(1)}A ≤ ${breaker}A ≤ ${ampacity}A`
  };
}

/* ═══ دالة مساعدة: هبوط الجهد النهائي ═══ */
function finalVoltageDrop(legLength, current, area, paths) {
  paths = paths || 1;
  const effectiveArea = area * paths;
  return P.voltageDrop(legLength, current, effectiveArea);
}

/* ═══ دالة مساعدة: فحص تنسيق القاطع/الكابل ═══ */
function validateCoordination(current, breaker, cableAmpacity) {
  return {
    loadOk: current <= breaker,
    breakerOk: breaker <= cableAmpacity,
    valid: current <= breaker && breaker <= cableAmpacity
  };
}

/* ═══ التصدير ═══ */
module.exports = {
  selectCableAndBreaker,
  finalVoltageDrop,
  validateCoordination
};
