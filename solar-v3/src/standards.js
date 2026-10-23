'use strict';

/* ═══════════════════════════════════════════════════════════════
   الطبقة 2: Standards — المعايير الدولية
   ═══════════════════════════════════════════════════════════════
   
   القواعد:
   - جداول ثابتة (immutable)
   - دوال مساعدة نقية
   - لا تعرف الفيزياء أو الحساب
   - المرجعيات: IEC 60228, IEC 60364-5-52, IEC 60898-1
   ═══════════════════════════════════════════════════════════════ */

/* ═══ جداول IEC — مجمّدة (لا يمكن تعديلها) ═══ */

/* IEC 60228 — مقاطع النحاس القياسية (mm²) */
const CABLE_SIZES = Object.freeze([
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240
]);

/* IEC 60364-5-52 — تحمل الكابلات النحاسية (A)
   طريقة E (أنبوب على الحائط)، 45°C، عزل XLPE/PVC */
const CABLE_AMPACITY = Object.freeze({
  1.5: 22,    // تشمل MIN لأغراض صغيرة
  2.5: 30,
  4:   40,
  6:   51,
  10:  70,
  16:  94,
  25:  119,
  35:  148,
  50:  180,
  70:  232,
  95:  282,
  120: 328,
  150: 379,
  185: 434,
  240: 514
});

/* ═══ IEC 60364-5-52 — معاملات التخفيض الحراري ═══ */

/* k_temp: تصحيح درجة حرارة المحيط */
const K_TEMP_XLPE = Object.freeze({
  10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.00,
  35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58
});

const K_TEMP_PVC = Object.freeze({
  10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.00,
  35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.50
});

/* k_group: تصحيح تجميع الكابلات */
const K_GROUP = Object.freeze({
  1: 1.00, 2: 0.80, 3: 0.70, 4: 0.65, 5: 0.60,
  6: 0.57, 7: 0.54, 8: 0.52, 9: 0.50, 12: 0.45, 16: 0.41, 20: 0.38
});

function getKTemp(tempC, insulation) {
  const table = (insulation || 'XLPE').toUpperCase() === 'PVC' ? K_TEMP_PVC : K_TEMP_XLPE;
  const keys = Object.keys(table).map(Number).sort((a,b) => a-b);
  let closest = keys[0];
  let minDiff = Math.abs(tempC - closest);
  for (const k of keys) {
    const diff = Math.abs(tempC - k);
    if (diff < minDiff) { minDiff = diff; closest = k; }
  }
  return table[closest];
}

function getKGroup(count) {
  if (!Number.isFinite(count) || count < 1) return K_GROUP[1];
  const keys = Object.keys(K_GROUP).map(Number).sort((a,b) => a-b);
  let closest = keys[0];
  let minDiff = Math.abs(count - closest);
  for (const k of keys) {
    const diff = Math.abs(count - k);
    if (diff < minDiff) { minDiff = diff; closest = k; }
  }
  return K_GROUP[closest];
}

function derateAmpacity(izTable, kTemp, kGroup) {
  return izTable * kTemp * kGroup;
}

function smallestCableForDeratedCurrent(current, kTemp, kGroup, sizes) {
  sizes = sizes || CABLE_SIZES;
  for (let i = 0; i < sizes.length; i++) {
    const sz = sizes[i];
    const amp = getCableAmpacity(sz);
    if (amp !== null && amp * kTemp * kGroup >= current) return sz;
  }
  return null;
}

/* IEC 60898-1 + IEC 60947-2 — تصنيفات القواطع (A) */
const BREAKER_RATINGS = Object.freeze([
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 300,
  400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500
]);

/* IEC 60364-5-52 — الحد الأدنى للمقاطع في التطبيقات الشمسية */
const MIN_CABLE_BY_ROLE = Object.freeze({
  PV: 4,        // mm² — كابل الألواح
  BATTERY: 10,  // mm² — كابل البطارية
  AC: 2.5       // mm² — كابل التيار المتردد
});

/* ═══ دوال مساعدة نقية ═══ */

/* تقريب للأعلى للقيمة القياسية التالية */
function roundUpToStandard(sizes, value) {
  if (!Array.isArray(sizes) || sizes.length === 0) return NaN;
  for (let i = 0; i < sizes.length; i++) {
    if (sizes[i] >= value) return sizes[i];
  }
  return sizes[sizes.length - 1];  // الأعلى
}

/* تقريب للأسفل للقيمة القياسية السابقة */
function roundDownToStandard(sizes, value) {
  if (!Array.isArray(sizes) || sizes.length === 0) return NaN;
  let best = sizes[0];
  for (let i = 0; i < sizes.length; i++) {
    if (sizes[i] <= value) best = sizes[i];
    else break;
  }
  return best;
}

/* الحصول على تحمل الكابل من الجدول */
function getCableAmpacity(size) {
  const amp = CABLE_AMPACITY[size];
  return amp !== undefined ? amp : null;
}

/* البحث عن أصغر مقطع يتحمل التيار المطلوب */
function smallestCableForCurrent(current, sizes) {
  sizes = sizes || CABLE_SIZES;
  for (let i = 0; i < sizes.length; i++) {
    const sz = sizes[i];
    const amp = getCableAmpacity(sz);
    if (amp !== null && amp >= current) return sz;
  }
  return null;  // لا يوجد مقطع كافٍ
}

/* التحقق من صلاحية مقطع */
function isValidCable(size) {
  return CABLE_SIZES.indexOf(size) >= 0;
}

/* التحقق من صلاحية قاطع */
function isValidBreaker(size) {
  return BREAKER_RATINGS.indexOf(size) >= 0;
}

/* الحصول على أكبر مقطع في الجدول */
function getMaxCable() {
  return CABLE_SIZES[CABLE_SIZES.length - 1];
}

/* الحصول على أكبر قاطع في الجدول */
function getMaxBreaker() {
  return BREAKER_RATINGS[BREAKER_RATINGS.length - 1];
}

/* الحصول على تحمل أكبر مقطع */
function getMaxCableAmpacity() {
  return getCableAmpacity(getMaxCable());
}

/* ═══ التصدير ═══ */
module.exports = {
  CABLE_SIZES,
  CABLE_AMPACITY,
  BREAKER_RATINGS,
  MIN_CABLE_BY_ROLE,
  K_TEMP_XLPE,
  K_TEMP_PVC,
  K_GROUP,
  getKTemp,
  getKGroup,
  derateAmpacity,
  smallestCableForDeratedCurrent,
  roundUpToStandard,
  roundDownToStandard,
  getCableAmpacity,
  smallestCableForCurrent,
  isValidCable,
  isValidBreaker,
  getMaxCable,
  getMaxBreaker,
  getMaxCableAmpacity
};
