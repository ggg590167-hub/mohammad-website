/* ═══════════════════════════════════════════════════════
   Solar Calculator v3 — Bundle
   Generated: 2026-10-13T19:57:50.493Z
   Architecture: 6 layers, tested (155/155)
   ═══════════════════════════════════════════════════════ */

(function(){
'use strict';

const modules = {};

/* ═══ physics.js ═══ */
(function(){
/* ═══════════════════════════════════════════════════════════════
   الطبقة 1: Physics — الفيزياء النقية
   ═══════════════════════════════════════════════════════════════
   
   القواعد الصارمة:
   - دوال نقية فقط: (inputs) → outputs
   - لا side effects
   - لا تعرف شيئًا عن:
     * IEC / الجداول
     * الكابلات / القواطع
     * المستخدم / HTML
     * الحالة (state)
   
   المرجعيات الفيزيائية:
   - قانون أوم: V = I × R
   - القدرة: P = V × I (DC) / P = √3 × V_L × I × PF (3φ)
   - هبوط الجهد: V_drop = 2 × L × I × ρ / A
   - الطاقة: E = P × t
   - Voc حرارة: V(T) = V_25 × [1 + β × (T - 25)]
   ═══════════════════════════════════════════════════════════════ */

/* ═══ الثوابت الفيزيائية — من مراجع دولية ═══ */
const CONSTANTS = Object.freeze({
  RHO_COPPER_20C: 0.0175,      // Ω·mm²/m — IEC 60228
  RHO_COPPER_45C: 0.0196,      // Ω·mm²/m — مُصحّح للحرارة
  BETA_VOC: -0.003,            // 1/°C — IEC 61215 (Voc temp coeff)
  TEMP_REF: 25,                // °C — STC
  V_AC_SINGLE: 230,            // V — اليمن
  V_AC_THREE: 400,             // V — خط (line-to-line)
  PF_NOMINAL: 0.90,            // معامل قدرة نموذجي
  SQRT3: Math.sqrt(3)
});

/* ═══ 1. القدرة — DC ═══
   P = V × I
*/
function powerDC(voltage, current) {
  if (voltage < 0 || current < 0) return NaN;
  return voltage * current;
}

/* ═══ 2. القدرة — أحادي الطور ═══
   P = V × I × PF
*/
function powerAC1Phase(voltage, current, pf) {
  pf = pf == null ? CONSTANTS.PF_NOMINAL : pf;
  if (voltage < 0 || current < 0 || pf < 0 || pf > 1) return NaN;
  return voltage * current * pf;
}

/* ═══ 3. القدرة — ثلاثي الطور ═══
   P = √3 × V_L × I_L × PF
   حيث V_L = line-to-line voltage (400V)
*/
function powerAC3Phase(vLine, currentLine, pf) {
  pf = pf == null ? CONSTANTS.PF_NOMINAL : pf;
  if (vLine < 0 || currentLine < 0 || pf < 0 || pf > 1) return NaN;
  return CONSTANTS.SQRT3 * vLine * currentLine * pf;
}

/* ═══ 4. التيار من القدرة — DC ═══
   I = P / V
*/
function currentDC(power, voltage) {
  if (voltage <= 0) return NaN;
  return power / voltage;
}

/* ═══ 5. التيار من القدرة — أحادي الطور ═══
   I = P / (V × PF)
*/
function currentAC1Phase(power, voltage, pf) {
  pf = pf == null ? CONSTANTS.PF_NOMINAL : pf;
  if (voltage <= 0 || pf <= 0) return NaN;
  return power / (voltage * pf);
}

/* ═══ 6. التيار من القدرة — ثلاثي الطور ═══
   I_L = P / (√3 × V_L × PF)
*/
function currentAC3Phase(power, vLine, pf) {
  pf = pf == null ? CONSTANTS.PF_NOMINAL : pf;
  if (vLine <= 0 || pf <= 0) return NaN;
  return power / (CONSTANTS.SQRT3 * vLine * pf);
}

/* ═══ 7. هبوط الجهد — DC ═══
   V_drop = (2 × L × I × ρ) / A
   حيث:
   - 2 = ذهاب + إياب
   - L = طول المسار (m)
   - I = التيار (A)
   - ρ = مقاومية النحاس (Ω·mm²/m)
   - A = المقطع (mm²)
*/
function voltageDrop(legLength, current, area, rho) {
  rho = rho == null ? CONSTANTS.RHO_COPPER_45C : rho;
  if (area <= 0) return NaN;
  return (2 * legLength * current * rho) / area;
}

/* ═══ 8. المقطع من هبوط الجهد ═══
   A = (2 × L × I × ρ) / (V × ΔV%)
*/
function areaFromVoltageDrop(legLength, current, voltage, dropPercent, rho) {
  rho = rho == null ? CONSTANTS.RHO_COPPER_45C : rho;
  if (voltage <= 0 || dropPercent <= 0) return NaN;
  return (2 * legLength * current * rho) / (voltage * dropPercent / 100);
}

/* ═══ 9. المقطع من الحرارة ═══
   A = I / J_max
*/
function areaFromThermal(current, jMax) {
  if (jMax <= 0) return NaN;
  return current / jMax;
}

/* ═══ 10. Voc عند حرارة مختلفة ═══
   Voc(T) = Voc(STC) × [1 + β × (T - 25)]
*/
function vocAtTemperature(vocSTC, tempC, beta) {
  beta = beta == null ? CONSTANTS.BETA_VOC : beta;
  return vocSTC * (1 + beta * (tempC - CONSTANTS.TEMP_REF));
}

/* ═══ 11. الطاقة اليومية ═══
   E = P × t
*/
function energyDaily(power, hours) {
  if (hours < 0 || hours > 24) return NaN;
  return power * hours;
}

/* ═══ 12. تحويل kWh ↔ Wh ═══ */
function whToKwh(wh) { return wh / 1000; }
function kwhToWh(kwh) { return kwh * 1000; }

/* ═══ 13. الطاقة المطلوبة من البطارية ═══
   E_bat = E_load / (η_inv × DoD)
*/
function batteryEnergyRequired(loadWh, invEff, dod) {
  if (invEff <= 0 || dod <= 0 || dod > 1) return NaN;
  return loadWh / (invEff * dod);
}

/* ═══ 14. طاقة الألواح المطلوبة ═══
   E_pv = E_load / (η_inv × PR)
   PR = Performance Ratio
*/
function pvEnergyRequired(loadWh, invEff, pr) {
  if (invEff <= 0 || pr <= 0) return NaN;
  return loadWh / (invEff * pr);
}

/* ═══ 15. قدرة الألواح المطلوبة ═══
   P_pv = E_pv / HSP
   HSP = Hours of Sun Peak
*/
function pvPowerRequired(ePv, hsp) {
  if (hsp <= 0) return NaN;
  return ePv / hsp;
}

/* ═══ 16. سعة البطارية (Ah) ═══
   C = E_bat / V_bat
*/
function batteryCapacityAh(energyWh, voltage) {
  if (voltage <= 0) return NaN;
  return energyWh / voltage;
}

/* ═══ 17. عدد الألواح المطلوبة ═══
   N = ceil(P_pv_required / P_panel)
*/
function panelsCount(pvPowerRequired, panelPower) {
  if (panelPower <= 0) return NaN;
  return Math.ceil(pvPowerRequired / panelPower);
}

/* ═══ 18. عدد البطاريات المطلوبة ═══
   N = ceil(C_required / C_unit)
*/
function batteriesCount(capacityRequired, unitCapacity) {
  if (unitCapacity <= 0) return NaN;
  return Math.ceil(capacityRequired / unitCapacity);
}

/* ═══ 19. حساب PR (Performance Ratio) ═══
   PR = η_cc × η_soiling × η_temp × η_wiring
*/
function performanceRatio(ccEff, soiling, tempDerate, wiringLoss) {
  return ccEff * soiling * tempDerate * wiringLoss;
}

/* ═══ 20. عدد المسارات المتوازية ═══
   N_paths = ceil(I / I_max_per_cable)
*/
function parallelPaths(current, maxPerCable) {
  if (maxPerCable <= 0) return NaN;
  return Math.max(1, Math.ceil(current / maxPerCable));
}

/* ═══ التصدير ═══ */

modules['physics'] = {
  CONSTANTS,
  powerDC,
  powerAC1Phase,
  powerAC3Phase,
  currentDC,
  currentAC1Phase,
  currentAC3Phase,
  voltageDrop,
  areaFromVoltageDrop,
  areaFromThermal,
  vocAtTemperature,
  energyDaily,
  whToKwh,
  kwhToWh,
  batteryEnergyRequired,
  pvEnergyRequired,
  pvPowerRequired,
  batteryCapacityAh,
  panelsCount,
  batteriesCount,
  performanceRatio,
  parallelPaths
};
})();

/* ═══ standards.js ═══ */
(function(){
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

modules['standards'] = {
  CABLE_SIZES,
  CABLE_AMPACITY,
  BREAKER_RATINGS,
  MIN_CABLE_BY_ROLE,
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
})();

/* ═══ components.js ═══ */
(function(){
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

const P = modules['physics'];
const S = modules['standards'];

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
  const jMax = input.jMax || 3;
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
  const aThermal = P.areaFromThermal(I, jMax);

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

modules['components'] = {
  selectCableAndBreaker,
  finalVoltageDrop,
  validateCoordination
};
})();

/* ═══ system.js ═══ */
(function(){
/* ═══════════════════════════════════════════════════════════════
   الطبقة 4: System — النظام الكامل
   ═══════════════════════════════════════════════════════════════
   
   تُنسّق:
   - physics.js (المعادلات)
   - standards.js (المعايير)
   - components.js (المكونات)
   
   تُنتج:
   - نظام طاقة شمسية كامل
   ═══════════════════════════════════════════════════════════════ */

const P = modules['physics'];
const S = modules['standards'];
const C = modules['components'];

/* ═══ ثوابت النظام ═══ */
const SYSTEM_CONFIG = Object.freeze({
  // عتبات LV/HV
  HV_INVERTER_THRESHOLD: 30000,   // W
  HV_DAILY_THRESHOLD: 40,          // kWh/يوم
  
  // عتبات 1φ/3φ (وفق IEC 60364 + معايير عالمية)
  PHASE_THRESHOLD_1PHASE: 5000,    // W — حد G98 الأسترالي/الألماني
  PHASE_THRESHOLD_3PHASE: 10000,   // W — حدود السوق اليمني
  PHASE_AUTO_WARN_HIGH: 8000,      // W — تحذير عند 1φ فوق هذه القدرة
  PHASE_AUTO_WARN_LOW: 3000,       // W — تحذير عند 3φ تحت هذه القدرة
  
  // جهد النظام
  LV_VOLTAGE: 48,
  HV_VOLTAGE: 400,
  
  // جهد AC
  AC_SINGLE: 230,
  AC_THREE: 400,
  
  // كفاءات نموذجية
  INV_EFF: 0.92,
  BAT_EFF: 0.95,
  CC_EFF: 0.97,
  
  // معاملات الأداء
  SOILING: 0.94,
  TEMP_DERATE: 0.85,
  WIRING_LOSS: 0.96,
  
  // بطاريات
  BAT_UNIT_LV_AH: 100,       // LiFePO4
  BAT_UNIT_HV_KWH: 35.8,     // Pylontech Force H3
  
  // إنفرترات
  INV_LV_RATED: 8000,        // Deye 8kW
  INV_HV_RATED: 50000,       // Deye SUN-50K
  
  // ألواح
  DEFAULT_PANEL_W: 550,
  DEFAULT_PANEL_VMP: 42,
  DEFAULT_PANEL_VOC: 49.7,
  MPPT_MAX_VOC: 500           // للألواح الافتراضية
});

/* ═══ 1. تحليل الأحمال ═══
   من: طريقة الإدخال + البيانات
   إلى: E_daily (Wh), P_peak (W), P_avg (W)
*/
function analyzeLoad(input) {
  const method = input.method || 'clamp';
  let dailyWh, peakW, avgW;

  if (method === 'clamp') {
    // قراءة جهاز Clamp
    const amps = input.clampAmps || 0;
    const avgPct = (input.clampAvgPct || 40) / 100;
    const hours = input.clampHours || 10;
    
    peakW = amps * 230 * 0.9;      // 0.9 = PF
    avgW = peakW * avgPct;
    dailyWh = avgW * hours;
  } else if (method === 'daily') {
    // استهلاك يومي مباشر
    dailyWh = (input.dailyKWh || 0) * 1000;
    const peakFactor = input.peakFactor || 3.5;
    avgW = dailyWh / 24;
    peakW = avgW * peakFactor;
  } else if (method === 'table') {
    // جدول الأجهزة
    const devices = input.devices || [];
    dailyWh = 0;
    peakW = 0;
    devices.forEach(d => {
      const w = d.watts || 0;
      const h = d.hours || 0;
      const c = d.count || 1;
      const surge = d.surge || 1;
      const inPeak = d.inPeak !== false;
      
      dailyWh += w * c * h;
      if (inPeak) peakW += w * c * surge;
    });
    avgW = dailyWh / 24;
  }

  return {
    dailyWh,
    dailyKWh: dailyWh / 1000,
    peakW,
    avgW
  };
}

/* ═══ 1.b. التحقق من صحة المدخلات ═══
   يرفض أي مدخلات غير منطقية فيزيائيًا
   @returns { valid, errors, warnings, counts }
*/
function validateInputs(input) {
  const errors = [];
  const warnings = [];
  const method = input.method || 'clamp';

  /* ═══ الحدود الفيزيائية الواقعية ═══ */
  const LIMITS = {
    panelW:             { min: 250,   max: 1500,  name: 'قدرة اللوح (W)' },
    hsp:                { min: 2,     max: 8,     name: 'ساعات الشمس (HSP)' },
    autonomyDays:       { min: 1,     max: 5,     name: 'أيام الاستقلالية' },
    clampAmps:          { min: 0.1,   max: 2000,  name: 'قراءة Clamp (A)' },
    clampAvgPct:        { min: 5,     max: 100,   name: 'متوسط التشغيل (%)' },
    clampHours:         { min: 1,     max: 24,    name: 'ساعات التشغيل (h)' },
    dailyKWh:           { min: 0.1,   max: 10000, name: 'الاستهلاك اليومي (kWh)' },
    peakFactor:         { min: 1,     max: 10,    name: 'معامل الذروة' },
    pvCableLength:      { min: 1,     max: 100,   name: 'طول كابل الألواح (م)' },
    batteryCableLength: { min: 0.5,   max: 20,    name: 'طول كابل البطارية (م)' },
    acCableLength:      { min: 1,     max: 200,   name: 'طول كابل AC (م)' }
  };

  function check(field, value) {
    const l = LIMITS[field];
    if (!l) return;
    if (!Number.isFinite(value)) {
      errors.push({ field: field, code: 'INVALID_NUMBER',
        message: l.name + ': قيمة غير صالحة (يجب أن تكون رقمًا)' });
      return;
    }
    if (value < l.min) {
      errors.push({ field: field, code: 'TOO_LOW',
        message: l.name + ': ' + value + ' أقل من الحد الأدنى (' + l.min + ')' });
    }
    if (value > l.max) {
      errors.push({ field: field, code: 'TOO_HIGH',
        message: l.name + ': ' + value + ' أعلى من الحد الأقصى (' + l.max + ')' });
    }
  }

  /* ═══ فحص المدخلات حسب الطريقة ═══ */
  if (method === 'clamp') {
    check('clampAmps', input.clampAmps);
    check('clampAvgPct', input.clampAvgPct);
    check('clampHours', input.clampHours);
  } else if (method === 'daily') {
    check('dailyKWh', input.dailyKWh);
    check('peakFactor', input.peakFactor);
  } else if (method === 'table') {
    const devices = input.devices || [];
    if (devices.length === 0) {
      errors.push({ field: 'devices', code: 'EMPTY_TABLE',
        message: 'جدول الأجهزة فارغ — أضف جهازًا واحدًا على الأقل' });
    }
    devices.forEach(function(d, i) {
      if (!(d.watts > 0)) {
        errors.push({ field: 'device_' + i, code: 'INVALID_WATTS',
          message: 'الجهاز رقم ' + (i+1) + ': قدرة غير صالحة' });
      }
    });
  }

  /* ═══ فحص الحقول المشتركة ═══ */
  check('panelW', input.panelW);
  check('hsp', input.hsp);
  check('autonomyDays', input.autonomyDays);
  check('pvCableLength', input.pvCableLength);
  check('batteryCableLength', input.batteryCableLength);
  check('acCableLength', input.acCableLength);

  /* ═══ تحذيرات للقيم الصالحة لكن غير معتادة ═══ */
  if (Number.isFinite(input.panelW)) {
    if (input.panelW >= 250 && input.panelW < 300) {
      warnings.push({ field: 'panelW', code: 'PANEL_SMALL',
        message: 'قدرة اللوح ' + input.panelW + ' واط — صغيرة (المعتاد 400-700 واط)' });
    }
    if (input.panelW > 1000) {
      warnings.push({ field: 'panelW', code: 'PANEL_LARGE',
        message: 'قدرة اللوح ' + input.panelW + ' واط — كبيرة (نادرة في المنازل)' });
    }
  }

  /* ═══ تحذير أيام الاستقلالية ═══ */
  if (Number.isFinite(input.autonomyDays) && input.autonomyDays > 1) {
    var aut = input.autonomyDays;
    var extraMsg = '';
    if (aut === 2) {
      extraMsg = 'سعة البطارية ×2 — مناسب للمناطق الجبلية بغيوم متكررة (صعدة، حجة)';
    } else if (aut === 3) {
      extraMsg = 'سعة البطارية ×3 — تكلفة إضافية كبيرة — للمؤسسات الحيوية فقط (عيادات، اتصالات)';
    } else {
      extraMsg = 'سعة البطارية ×' + aut + ' — مبالغة لمعظم الاستخدامات — راجع الحاجة الفعلية';
    }
    warnings.push({
      field: 'autonomyDays',
      code: 'AUTONOMY_HIGH',
      message: extraMsg
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    counts: { errors: errors.length, warnings: warnings.length }
  };
}

/* ═══ 2. تحديد وضع النظام (LV أو HV) ═══ */
function detectSystemMode(dailyWh, peakW, userChoice) {
  // اختيار يدوي
  if (userChoice === 'lv') return 'LV';
  if (userChoice === 'hv') return 'HV';
  
  // تلقائي
  // احسب قدرة الإنفرتر المتوقعة
  const estimatedInvW = Math.max(peakW * 1.25, (dailyWh / 24) * 3);
  const estimatedInvW_step = Math.ceil(estimatedInvW / 500) * 500;
  
  if (estimatedInvW_step > SYSTEM_CONFIG.HV_INVERTER_THRESHOLD) return 'HV';
  if (dailyWh / 1000 >= SYSTEM_CONFIG.HV_DAILY_THRESHOLD) return 'HV';
  return 'LV';
}

/* ═══ 3. تحديد عدد الأطوار ═══
   وفق IEC 60364 + معايير عالمية:
   - المستخدم يختار صراحة (auto / 1 / 3)
   - auto: يعتمد على العتبات (HV = 3φ إلزاميًا)
   - القرار في النهاية للمستخدم (نوع تغذية الموقع)
*/
function detectPhases(mode, inverterW, userChoice) {
  // HV دائمًا 3φ (لا اختيار)
  if (mode === 'HV') return 3;
  
  // اختيار المستخدم
  if (userChoice === 1 || userChoice === '1') return 1;
  if (userChoice === 3 || userChoice === '3') return 3;
  
  // auto: عتبة G98 (5 kW)
  if (inverterW > SYSTEM_CONFIG.PHASE_THRESHOLD_1PHASE) return 3;
  return 1;
}

/* ═══ 3.b. تحذيرات الأطوار ═══
   @param peakW       — حمل المستخدم الأقصى (W)
   @param inverterW   — قدرة الإنفرتر (W) — للتحقق من حدود الشبكة
*/
function phaseWarnings(mode, peakW, inverterW, phases, userChoice) {
  const warnings = [];
  
  // HV = 3φ تلقائيًا (لا تحذير)
  if (mode === 'HV') return warnings;
  
  // تحذير: 1φ فوق 8 kW (حد شبكة التوزيع)
  if (phases === 1 && inverterW > SYSTEM_CONFIG.PHASE_AUTO_WARN_HIGH) {
    warnings.push({
      severity: 'warning',
      code: 'PHASE_1P_HIGH_POWER',
      message: 'نظام أحادي الطور بقدرة إنفرتر ' + (inverterW/1000).toFixed(1) + ' kW > 8 kW — قد يتجاوز حدود شبكة التوزيع (G98: 3.68 kW)'
    });
  }
  
  // تحذير: 3φ لحمل صغير
  if (phases === 3 && peakW < SYSTEM_CONFIG.PHASE_AUTO_WARN_LOW) {
    warnings.push({
      severity: 'warning',
      code: 'PHASE_3P_LOW_POWER',
      message: 'ثلاثي الطور لحمل أقصى ' + (peakW/1000).toFixed(2) + ' kW (< 3 kW) — مبالغة تقنية وتكلفة أعلى'
    });
  }
  
  return warnings;
}

/* ═══ 4. حساب مصفوفة الألواح ═══ */
function sizePVArray(dailyWh, hsp, invEff, userPanelW) {
  // PR (Performance Ratio)
  const pr = P.performanceRatio(
    SYSTEM_CONFIG.CC_EFF,
    SYSTEM_CONFIG.SOILING,
    SYSTEM_CONFIG.TEMP_DERATE,
    SYSTEM_CONFIG.WIRING_LOSS
  );

  // الطاقة المطلوبة من الألواح
  const pvEnergyWh = P.pvEnergyRequired(dailyWh, invEff, pr);

  // القدرة المطلوبة
  const pvPowerW = P.pvPowerRequired(pvEnergyWh, hsp);

  // عدد الألواح
  const panelW = userPanelW || SYSTEM_CONFIG.DEFAULT_PANEL_W;
  const nPanels = P.panelsCount(pvPowerW, panelW);
  const pvActual = nPanels * panelW;

  return {
    requiredW: pvPowerW,
    actualW: pvActual,
    panelW: panelW,
    nPanels: nPanels,
    pr: pr,
    pvEnergyWh: pvEnergyWh
  };
}

/* ═══ 5. حساب بنك البطاريات ═══ */
function sizeBattery(dailyWh, mode, autDays, dod) {
  autDays = autDays || 1;
  dod = dod || 0.8;   // LiFePO4

  // الطاقة المطلوبة من البطارية
  const eBatRequired = P.batteryEnergyRequired(dailyWh * autDays, SYSTEM_CONFIG.INV_EFF, dod);

  if (mode === 'LV') {
    // 48V LiFePO4
    const voltage = SYSTEM_CONFIG.LV_VOLTAGE;
    const capacityAh = P.batteryCapacityAh(eBatRequired, voltage);
    const unitAh = SYSTEM_CONFIG.BAT_UNIT_LV_AH;
    const nUnits = P.batteriesCount(capacityAh, unitAh);
    const actualAh = nUnits * unitAh;
    const actualWh = actualAh * voltage;

    return {
      mode: 'LV',
      autonomyDays: autDays,
      voltage: voltage,
      requiredWh: eBatRequired,
      requiredAh: capacityAh,
      units: nUnits,
      unitAh: unitAh,
      actualAh: actualAh,
      actualWh: actualWh,
      dod: dod
    };
  } else {
    // HV Pylontech (35.8 kWh/برج)
    const unitKWh = SYSTEM_CONFIG.BAT_UNIT_HV_KWH;
    const requiredKWh = eBatRequired / 1000;
    const towers = Math.ceil(requiredKWh / unitKWh);
    const actualKWh = towers * unitKWh;

    return {
      mode: 'HV',
      autonomyDays: autDays,
      voltage: SYSTEM_CONFIG.HV_VOLTAGE,
      requiredWh: eBatRequired,
      requiredKWh: requiredKWh,
      towers: towers,
      unitKWh: unitKWh,
      actualKWh: actualKWh,
      dod: dod
    };
  }
}

/* ═══ 6. حساب الإنفرتر ═══ */
function sizeInverter(peakW, dailyWh, mode, phases) {
  // القدرة المستمرة
  const contW = Math.max(
    peakW * 1.25,
    (dailyWh / 24) * 3
  );

  // التقريب لحجم قياسي
  const stdW = Math.ceil(contW / 500) * 500;

  // قدرة الإقلاع (Surge)
  const surgeW = stdW * 2;

  if (mode === 'HV') {
    // عدد إنفرترات 50kW المطلوبة
    const rated = SYSTEM_CONFIG.INV_HV_RATED;
    const nInverters = Math.max(1, Math.ceil(contW / rated));
    const actualW = nInverters * rated;
    return {
      contW: contW,
      stdW: actualW,
      surgeW: actualW * 2,
      nInverters: nInverters,
      ratedW: rated,
      phases: phases
    };
  } else {
    // LV: اختيار أصغر حجم قياسي يكفي
    const LV_SIZES = [1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000];
    let single = LV_SIZES[LV_SIZES.length - 1];
    let nInv = Math.max(1, Math.ceil(contW / single));
    let total = nInv * single;
    for (let n = 1; n <= 2; n++) {
      for (let i = 0; i < LV_SIZES.length; i++) {
        const t = LV_SIZES[i] * n;
        if (t >= contW && t < total) {
          single = LV_SIZES[i];
          nInv = n;
          total = t;
        }
      }
    }
    return {
      contW: contW,
      stdW: total,
      surgeW: total * 2,
      nInverters: nInv,
      ratedW: single,
      phases: phases
    };
  }
}

/* ═══ 7. حساب تيار البطارية ═══ */
function batteryCurrent(inverterW, batteryVoltage, inverterEff) {
  return P.currentDC(inverterW, batteryVoltage * inverterEff);
}

/* ═══ 8. حساب تيار AC ═══ */
function acCurrent(inverterW, phases, acVoltage, pf) {
  pf = pf || 0.9;
  if (phases === 3) {
    return P.currentAC3Phase(inverterW, acVoltage, pf);
  }
  return P.currentAC1Phase(inverterW, acVoltage, pf);
}

/* ═══ 9. التحليل الكامل للنظام ═══ */
function analyzeSystem(input) {
  // ═══ المدخلات ═══
  const hsp = input.hsp || 5.5;
  const autDays = input.autonomyDays || 1;
  const dod = input.dod || 0.8;
  const modeChoice = input.modeChoice || 'auto';
  const phasesChoice = input.phasesChoice || 'auto';   // 'auto' | 1 | 3
  const userPanelW = input.panelW;
  const pvCableLength = input.pvCableLength || 15;
  const batteryCableLength = input.batteryCableLength || 2;
  const acCableLength = input.acCableLength || 15;

  // ═══ 1. تحليل الحمل ═══
  const load = analyzeLoad(input);

  // ═══ 2. وضع النظام ═══
  const mode = detectSystemMode(load.dailyWh, load.peakW, modeChoice);

  // ═══ 3. الإنفرتر ═══
  const invPhase = detectPhases(mode, load.peakW, phasesChoice);  // الأطوار من الحمل الفعلي، لا من الإنفرتر
  const inverter = sizeInverter(load.peakW, load.dailyWh, mode, invPhase);

  // ═══ 4. مصفوفة الألواح ═══
  const pv = sizePVArray(load.dailyWh, hsp, SYSTEM_CONFIG.INV_EFF, userPanelW);

  // ═══ 4.b. كابل الألواح ═══
  /* توزيع الألواح على السلاسل بالتساوي (يطابق diagram.js) */
  const MAX_PER_STRING = 8;
  const nStringsCalc = Math.max(1, Math.ceil(pv.nPanels / MAX_PER_STRING));
  const panelsPerStringCalc = Math.ceil(pv.nPanels / nStringsCalc);
  const pvStringV = panelsPerStringCalc * 42;
  const iPv = pv.actualW / pvStringV;
  const pvCable = C.selectCableAndBreaker({
    current: iPv,
    legLength: pvCableLength,
    voltage: pvStringV,
    dropPercent: 2,
    minArea: 4
  });

  // ═══ 5. البطاريات ═══
  const battery = sizeBattery(load.dailyWh, mode, autDays, dod);

  // ═══ 6. تيار البطارية ═══
  const iBat = batteryCurrent(inverter.stdW, battery.voltage, SYSTEM_CONFIG.INV_EFF);

  // ═══ 7. كابل البطارية + القاطع ═══
  const batteryCable = C.selectCableAndBreaker({
    current: iBat,
    legLength: batteryCableLength,
    voltage: battery.voltage,
    dropPercent: 1,
    minArea: 10
  });

  // ═══ 8. تيار AC ═══
  const acV = invPhase === 3 ? SYSTEM_CONFIG.AC_THREE : SYSTEM_CONFIG.AC_SINGLE;
  const iAc = acCurrent(inverter.stdW, invPhase, acV, 0.9);

  // ═══ 9. كابل AC + القاطع ═══
  const acCable = C.selectCableAndBreaker({
    current: iAc,
    legLength: acCableLength,
    voltage: acV,
    dropPercent: 2,
    minArea: 2.5
  });

  // ═══ النتيجة الكاملة ═══
  const phaseWarns = phaseWarnings(mode, load.peakW, inverter.stdW, invPhase, phasesChoice);
  
  return {
    load,
    mode,
    phases: invPhase,
    phasesChoice: phasesChoice,
    phaseWarnings: phaseWarns,
    inverter,
    pv,
    battery,
    iPv,
    pvStringV,
    pvCable,
    iBat,
    batteryCable,
    iAc,
    acCable,
    config: SYSTEM_CONFIG
  };
}

/* ═══ التصدير ═══ */

modules['system'] = {
  SYSTEM_CONFIG,
  analyzeLoad,
  validateInputs,
  detectSystemMode,
  detectPhases,
  phaseWarnings,
  sizePVArray,
  sizeBattery,
  sizeInverter,
  batteryCurrent,
  acCurrent,
  analyzeSystem
};
})();

/* ═══ validation.js ═══ */
(function(){
/* ═══════════════════════════════════════════════════════════════
   الطبقة 5: Validation — التحقق النهائي
   ═══════════════════════════════════════════════════════════════
   
   تتحقق من:
   - التنسيق: I ≤ Breaker ≤ Cable_Ampacity
   - هبوط الجهد ضمن الحدود
   - Voc بارد < MPPT max
   - كفاية الإنفرتر/البطارية
   
   المبدأ:
   - كل فحص يُنتج نتيجة محددة
   - نُصنّف النتائج: error / warning / info
   - لا تحذيرات عامة، بل محددة
   ═══════════════════════════════════════════════════════════════ */

const P = modules['physics'];
const S = modules['standards'];

/* ═══ مستويات الخطورة ═══ */
const SEVERITY = Object.freeze({
  ERROR: 'error',       // خطأ حرج — يجب التوقف
  WARNING: 'warning',   // تحذير — يحتاج مراجعة
  INFO: 'info'          // معلومة — للتوضيح
});

/* ═══ حدود الفحص ═══ */
const LIMITS = Object.freeze({
  VD_BATTERY: 1.0,     // % — كابل البطارية
  VD_PV: 2.0,          // % — كابل الألواح
  VD_AC: 3.0,          // % — كابل AC
  VOC_SAFETY: 0.95,    // Voc(cold) ≤ 95% من MPPT max
  INVERTER_MARGIN: 1.25,
  BATTERY_MARGIN: 1.0,
  MPPT_MARGIN: 0.95
});

/* ═══ دالة إنشاء نتيجة ═══ */
function result(valid, code, message, severity, data) {
  return { valid, code, message, severity, data: data || {} };
}

/* ═══ 1. فحص تنسيق القاطع/الكابل ═══ */
function validateCoordination(current, breaker, cableAmpacity, label) {
  const issues = [];

  // فحص 1: I_load ≤ I_breaker
  if (current > breaker) {
    issues.push(result(
      false,
      'COORD_LOAD_EXCEEDS_BREAKER',
      `${label}: التيار (${current.toFixed(1)}A) > القاطع (${breaker}A) — القاطع سيفصل دائمًا`,
      SEVERITY.ERROR,
      { current, breaker, ratio: current / breaker }
    ));
  }

  // فحص 2: I_breaker ≤ I_cable
  if (breaker > cableAmpacity) {
    issues.push(result(
      false,
      'COORD_BREAKER_EXCEEDS_CABLE',
      `${label}: القاطع (${breaker}A) > تحمل الكابل (${cableAmpacity.toFixed(0)}A) — خطر حريق`,
      SEVERITY.ERROR,
      { breaker, cableAmpacity, ratio: breaker / cableAmpacity }
    ));
  }

  // فحص 3: هامش صغير
  const margin = cableAmpacity / current;
  if (margin < 1.1) {
    issues.push(result(
      true,
      'COORD_MARGIN_LOW',
      `${label}: هامش التحمل ضيق (${((margin - 1) * 100).toFixed(1)}%)`,
      SEVERITY.WARNING,
      { margin }
    ));
  }

  return issues;
}

/* ═══ 2. فحص هبوط الجهد ═══ */
function validateVoltageDrop(dropPercent, maxPercent, label) {
  const issues = [];

  if (dropPercent > maxPercent) {
    issues.push(result(
      false,
      'VDROP_EXCEEDED',
      `${label}: هبوط الجهد (${dropPercent.toFixed(2)}%) > الحد (${maxPercent}%)`,
      SEVERITY.ERROR,
      { dropPercent, maxPercent }
    ));
  } else if (dropPercent > maxPercent * 0.85) {
    issues.push(result(
      true,
      'VDROP_NEAR_LIMIT',
      `${label}: هبوط الجهد (${dropPercent.toFixed(2)}%) قريب من الحد (${maxPercent}%)`,
      SEVERITY.WARNING,
      { dropPercent, maxPercent }
    ));
  }

  return issues;
}

/* ═══ 3. فحص Voc الألواح ═══ */
function validateVoc(vocCold, mpptMaxV, label) {
  const issues = [];
  const safeLimit = mpptMaxV * LIMITS.VOC_SAFETY;

  if (vocCold > mpptMaxV) {
    issues.push(result(
      false,
      'VOC_EXCEEDS_MPPT',
      `${label}: Voc بارد (${vocCold.toFixed(0)}V) > أقصى جهد MPPT (${mpptMaxV}V) — قد يتلف المنظم`,
      SEVERITY.ERROR,
      { vocCold, mpptMaxV }
    ));
  } else if (vocCold > safeLimit) {
    issues.push(result(
      true,
      'VOC_NEAR_LIMIT',
      `${label}: Voc بارد (${vocCold.toFixed(0)}V) قريب من الحد (${mpptMaxV}V)`,
      SEVERITY.WARNING,
      { vocCold, mpptMaxV }
    ));
  }

  return issues;
}

/* ═══ 4. فحص كفاية الإنفرتر ═══ */
function validateInverter(inverterW, peakW, label) {
  const issues = [];
  const required = peakW * LIMITS.INVERTER_MARGIN;

  if (inverterW < peakW) {
    issues.push(result(
      false,
      'INV_TOO_SMALL',
      `${label}: الإنفرتر (${inverterW}W) < الحمل الأقصى (${peakW}W) — سيُفصل عند الذروة`,
      SEVERITY.ERROR,
      { inverterW, peakW }
    ));
  } else if (inverterW < required) {
    issues.push(result(
      true,
      'INV_MARGIN_LOW',
      `${label}: الإنفرتر (${inverterW}W) — هامش ضيق (الحمل الأقصى × 1.25 = ${required.toFixed(0)}W)`,
      SEVERITY.WARNING,
      { inverterW, required }
    ));
  }

  return issues;
}

/* ═══ 5. فحص كفاية البطارية ═══ */
function validateBattery(batteryWh, dailyWh, autDays, dod, label) {
  const issues = [];
  const required = dailyWh * autDays / dod;

  if (batteryWh < required * 0.9) {
    issues.push(result(
      false,
      'BAT_TOO_SMALL',
      `${label}: سعة البطارية (${(batteryWh/1000).toFixed(1)} kWh) < المطلوب (${(required/1000).toFixed(1)} kWh)`,
      SEVERITY.ERROR,
      { batteryWh, required }
    ));
  } else if (batteryWh < required) {
    issues.push(result(
      true,
      'BAT_MARGIN_LOW',
      `${label}: سعة البطارية قريبة من الحد — لا هامش للأيام الغائمة`,
      SEVERITY.WARNING,
      { batteryWh, required }
    ));
  }

  return issues;
}

/* ═══ 6. فحص كفاية الألواح ═══ */
function validatePV(pvActualW, pvRequiredW, label, panelW) {
  const issues = [];
  const margin = pvActualW / pvRequiredW;
  const TARGET_MARGIN = 1.10;  // 10% — الموصى به للمناطق اليمنية
  const DEFAULT_PANEL_W = 550;
  panelW = panelW || DEFAULT_PANEL_W;

  if (pvActualW < pvRequiredW) {
    issues.push(result(
      false,
      'PV_INSUFFICIENT',
      `${label}: الألواح (${pvActualW}W) < المطلوب (${pvRequiredW.toFixed(0)}W)`,
      SEVERITY.ERROR,
      { pvActualW, pvRequiredW }
    ));
  } else if (margin < TARGET_MARGIN) {
    /* حساب الحل الهندسي: كم لوح إضافي يحتاج؟ */
    const targetW = pvRequiredW * TARGET_MARGIN;
    const deficitW = targetW - pvActualW;
    const panelsNeeded = Math.max(1, Math.ceil(deficitW / panelW));
    const currentPct = ((margin - 1) * 100).toFixed(1);
    const targetPct = ((TARGET_MARGIN - 1) * 100).toFixed(0);
    const afterW = pvActualW + panelsNeeded * panelW;
    const afterPct = ((afterW / pvRequiredW - 1) * 100).toFixed(1);

    issues.push(result(
      true,
      'PV_MARGIN_LOW',
      `${label}: هامش الألواح ضيق (${currentPct}%) — الموصى به ≥${targetPct}% | ` +
      `📉 التأثير: في الأيام الغائمة/الحارة/المتربة، قد لا تكفي الألواح ← تفريغ أسرع للبطارية | ` +
      `🔧 الحل: إضافة ${panelsNeeded} لوح × ${panelW}W ← الهامش يصبح ${afterPct}% | ` +
      `💡 ملاحظة: الإضافة لا تتطلب تغيير الكابلات أو القواطع أو MPPT (لوجود هامش كافٍ)`,
      SEVERITY.WARNING,
      { margin, panelsNeeded, afterPct: parseFloat(afterPct) }
    ));
  }

  return issues;
}

/* ═══ 7. فحص MPPT ═══ */
function validateMPPT(requiredA, ratedA, label) {
  const issues = [];
  const safeLimit = ratedA * LIMITS.MPPT_MARGIN;

  if (requiredA > ratedA) {
    issues.push(result(
      false,
      'MPPT_OVERLOAD',
      `${label}: تيار الشحن المطلوب (${requiredA.toFixed(1)}A) > MPPT (${ratedA}A)`,
      SEVERITY.ERROR,
      { requiredA, ratedA }
    ));
  } else if (requiredA > safeLimit) {
    issues.push(result(
      true,
      'MPPT_NEAR_LIMIT',
      `${label}: MPPT (${ratedA}A) — هامش ضيق`,
      SEVERITY.WARNING,
      { requiredA, ratedA }
    ));
  }

  return issues;
}

/* ═══ 8. الفحص الشامل للنظام ═══ */
function validateSystem(systemResult) {
  const issues = [];

  // ═══ 8.1 التنسيق — كابل البطارية ═══
  if (systemResult.batteryCable && systemResult.batteryCable.valid !== undefined) {
    issues.push(...validateCoordination(
      systemResult.iBat,
      systemResult.batteryCable.breaker,
      systemResult.batteryCable.cableAmpacity,
      'كابل البطارية'
    ));
  }

  // ═══ 8.2 التنسيق — كابل AC ═══
  if (systemResult.acCable && systemResult.acCable.valid !== undefined) {
    issues.push(...validateCoordination(
      systemResult.iAc,
      systemResult.acCable.breaker,
      systemResult.acCable.cableAmpacity,
      'كابل AC'
    ));
  }

  // ═══ 8.3 كفاية الإنفرتر ═══
  if (systemResult.inverter && systemResult.load) {
    issues.push(...validateInverter(
      systemResult.inverter.stdW,
      systemResult.load.peakW,
      'الإنفرتر'
    ));
  }

  // ═══ 8.4 كفاية البطارية ═══
  if (systemResult.battery) {
    const bat = systemResult.battery;
    const batWh = bat.actualWh || (bat.actualKWh * 1000) || 0;
    if (batWh > 0) {
      issues.push(...validateBattery(
        batWh,
        systemResult.load.dailyWh,
        1,   // autDays — نفترض يوم واحد افتراضيًا
        bat.dod || 0.8,
        'البطاريات'
      ));
    }
  }

  // ═══ 8.5 كفاية الألواح ═══
  if (systemResult.pv) {
    issues.push(...validatePV(
      systemResult.pv.actualW,
      systemResult.pv.requiredW,
      'الألواح',
      systemResult.pv.panelW
    ));
  }

  // ═══ 8.6 التصنيف ═══
  const errors = issues.filter(i => i.severity === SEVERITY.ERROR);
  const warnings = issues.filter(i => i.severity === SEVERITY.WARNING);
  const info = issues.filter(i => i.severity === SEVERITY.INFO);

  return {
    valid: errors.length === 0,
    issues: issues,
    errors: errors,
    warnings: warnings,
    info: info,
    counts: {
      errors: errors.length,
      warnings: warnings.length,
      info: info.length,
      total: issues.length
    }
  };
}

/* ═══ التصدير ═══ */

modules['validation'] = {
  SEVERITY,
  LIMITS,
  validateCoordination,
  validateVoltageDrop,
  validateVoc,
  validateInverter,
  validateBattery,
  validatePV,
  validateMPPT,
  validateSystem
};
})();

/* ═══ diagram.js ═══ */
(function(){
/* ═══════════════════════════════════════════════════════════════
   Diagram Layer v10 — Combined MPPT view (Active + Available)
   ═══════════════════════════════════════════════════════════════ */

function buildDiagram(s) {
  const isHV = s.mode === 'HV';

  const pvW         = s.pv.actualW || 0;
  const pvPanelW    = s.pv.panelW || 0;
  const totalPanels = s.pv.nPanels || 0;

  /* ═══ إعادة حساب توزيع الألواح داخلياً ═══ */
  const MAX_PER_STRING = 8;
  const VMP_PER_PANEL  = 42;

  const nStrings      = Math.max(1, Math.ceil(totalPanels / MAX_PER_STRING));
  const basePerString = Math.floor(totalPanels / nStrings);
  const extraPanels   = totalPanels % nStrings;

  function panelsInString(i) {
    return i < extraPanels ? basePerString + 1 : basePerString;
  }

  const panelsPerString    = Math.ceil(totalPanels / nStrings);
  const pvStringV          = panelsPerString * VMP_PER_PANEL;
  const iPv                = pvStringV > 0 ? pvW / pvStringV : 0;
  const iPerString         = nStrings > 0 ? iPv / nStrings : 0;

  const invW       = s.inverter.stdW || 0;
  const invN       = s.inverter.nInverters || 1;
  const invRatedW  = s.inverter.ratedW || 0;
  const mpptPerInv = 4;
  const totalMPPT  = invN * mpptPerInv;
  const activeMPPT = Math.min(nStrings, totalMPPT);

  const INLINE_LIMIT = 6;

  let batWh, batV, batAh, batCount, batLabel, batUnitDesc;
  if (isHV) {
    batWh       = (s.battery.actualKWh || 0) * 1000;
    batV        = 400;
    batAh       = batWh / batV;
    batCount    = s.battery.towers || 0;
    batLabel    = 'أبراج Pylontech HV (400V)';
    batUnitDesc = '35.8 kWh/برج';
  } else {
    batWh       = s.battery.actualWh || 0;
    batV        = 48;
    batAh       = s.battery.actualAh || 0;
    batCount    = s.battery.units || 0;
    batLabel    = 'LiFePO₄ Server-Rack 48V';
    batUnitDesc = (s.battery.unitAh || 100) + 'Ah @ 48V';
  }

  const pvCable  = s.pvCable  ? s.pvCable.cableSize  : 4;
  const pvPaths  = s.pvCable  ? s.pvCable.paths      : 1;
  const batCable = s.batteryCable ? s.batteryCable.cableSize : 70;
  const batPaths = s.batteryCable ? s.batteryCable.paths     : 1;
  const acCable  = s.acCable  ? s.acCable.cableSize  : 16;
  const acPaths  = s.acCable  ? s.acCable.paths      : 1;
  const pvBrk    = s.pvCable  ? s.pvCable.breaker    : 20;
  const batBrk   = s.batteryCable ? s.batteryCable.breaker : 200;
  const acBrk    = s.acCable  ? s.acCable.breaker    : 50;

  const iAc         = s.iAc || 0;
  const peakW       = s.load.peakW || 0;
  const phasesLabel = s.phases === 3 ? '3φ 400V' : '1φ 230V';

  function n(x)  { return Math.round(x).toLocaleString('en-US'); }
  function f1(x) { return Number(x || 0).toFixed(1); }

  const W = 1600;

  const stringsToShow = Math.min(nStrings, 6);
  const stringsPerRow = Math.min(stringsToShow, 3);
  const stringBoxW = 460, stringBoxH = 175, stringGapX = 30, stringGapY = 30;
  const stringsRowWidth = stringsPerRow * (stringBoxW + stringGapX) - stringGapX;
  const stringStartX = (W - stringsRowWidth) / 2;
  const pvSecY = 70;
  const stringStartY = pvSecY + 115;
  const rowsNeeded   = Math.max(1, Math.ceil(stringsToShow / stringsPerRow));
  const stringsBottom = stringStartY + rowsNeeded * (stringBoxH + stringGapY) - stringGapY;
  const pvSecH = Math.max(400, stringsBottom - pvSecY + 70);
  const H = 2100 + (pvSecH - 400);

  let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;background:#0e1011;border-radius:12px;font-family:Tahoma,Arial,sans-serif" direction="rtl">';

  svg += '<defs>';
  svg += '<marker id="aRed"   markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#dc2626"/></marker>';
  svg += '<marker id="aBlue"  markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#3b82f6"/></marker>';
  svg += '<marker id="aGold"  markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#c49b40"/></marker>';
  svg += '<marker id="aGreen" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#16a34a"/></marker>';
  svg += '</defs>';

  svg += '<text x="' + (W/2) + '" y="44" text-anchor="middle" fill="#f0d99a" font-size="30" font-weight="bold">⚡ مخطط منظومة الطاقة الشمسية — ' + (isHV ? 'نظام HV (400V)' : 'نظام LV (48V)') + '</text>';

  /* Legend */
  const lgX = W - 260, lgY = 65;
  svg += '<rect x="' + lgX + '" y="' + lgY + '" width="230" height="135" rx="8" fill="#131417" stroke="#c49b40" stroke-width="1" opacity="0.95"/>';
  svg += '<text x="' + (lgX + 115) + '" y="' + (lgY + 18) + '" text-anchor="middle" fill="#f0d99a" font-size="12" font-weight="bold">دليل الرموز</text>';
  svg += '<circle cx="' + (lgX + 15) + '" cy="' + (lgY + 38) + '" r="5" fill="#dc2626"/><text x="' + (lgX + 28) + '" y="' + (lgY + 42) + '" fill="#fca5a5" font-size="11" font-weight="bold">قطب موجب (+)</text>';
  svg += '<circle cx="' + (lgX + 15) + '" cy="' + (lgY + 58) + '" r="5" fill="#1e40af"/><text x="' + (lgX + 28) + '" y="' + (lgY + 62) + '" fill="#93c5fd" font-size="11" font-weight="bold">قطب سالب (−)</text>';
  svg += '<line x1="' + (lgX + 10) + '" y1="' + (lgY + 78) + '" x2="' + (lgX + 20) + '" y2="' + (lgY + 78) + '" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4,3"/><text x="' + (lgX + 28) + '" y="' + (lgY + 82) + '" fill="#fbbf24" font-size="11" font-weight="bold">توصيل تسلسلي</text>';
  svg += '<line x1="' + (lgX + 10) + '" y1="' + (lgY + 98) + '" x2="' + (lgX + 20) + '" y2="' + (lgY + 98) + '" stroke="#c49b40" stroke-width="3"/><text x="' + (lgX + 28) + '" y="' + (lgY + 102) + '" fill="#f0d99a" font-size="11" font-weight="bold">تدفق الطاقة DC</text>';
  svg += '<circle cx="' + (lgX + 15) + '" cy="' + (lgY + 118) + '" r="5" fill="#a3e635"/><text x="' + (lgX + 28) + '" y="' + (lgY + 122) + '" fill="#a3e635" font-size="11" font-weight="bold">مدخل نشط</text>';
  svg += '<circle cx="' + (lgX + 130) + '" cy="' + (lgY + 118) + '" r="5" fill="#4b5563"/><text x="' + (lgX + 143) + '" y="' + (lgY + 122) + '" fill="#9ca3af" font-size="11" font-weight="bold">متاح للتوسعة</text>';

  /* ═══ القسم 1: الألواح ═══ */
  svg += '<rect x="40" y="' + pvSecY + '" width="' + (W-80) + '" height="' + pvSecH + '" rx="16" fill="#0d1b2a" stroke="#4a7ba8" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (pvSecY + 38) + '" text-anchor="middle" fill="#93c5fd" font-size="22" font-weight="bold">☀️ مصفوفة الألواح الشمسية — Series Strings</text>';
  svg += '<text x="' + (W/2) + '" y="' + (pvSecY + 68) + '" text-anchor="middle" fill="#dbeafe" font-size="16" font-weight="bold">الإجمالي: ' + totalPanels + ' لوح × ' + pvPanelW + 'W = ' + n(pvW) + ' Wp  |  جهد السلسلة: ' + f1(pvStringV) + 'V  |  تيار المصفوفة: ' + f1(iPv) + ' A</text>';

  let arrangementText;
  if (extraPanels === 0) {
    arrangementText = nStrings + ' سلسلة × ' + basePerString + ' لوح/سلسلة';
  } else {
    const dist = [];
    for (let k = 0; k < nStrings; k++) dist.push(panelsInString(k));
    arrangementText = nStrings + ' سلسلة (' + dist.join(' + ') + ' لوح)';
  }
  svg += '<text x="' + (W/2) + '" y="' + (pvSecY + 96) + '" text-anchor="middle" fill="#60a5fa" font-size="15" font-weight="bold">الترتيب: ' + arrangementText + '  (Series داخلي، Parallel بين السلاسل)</text>';

  for (let i = 0; i < stringsToShow; i++) {
    const col = i % stringsPerRow;
    const row = Math.floor(i / stringsPerRow);
    const sx = stringStartX + col * (stringBoxW + stringGapX);
    const sy = stringStartY + row * (stringBoxH + stringGapY);

    const panelsForThisString = panelsInString(i);
    const stringPowerW = panelsForThisString * pvPanelW;
    const showIndividual = panelsForThisString <= INLINE_LIMIT;

    svg += '<rect x="' + sx + '" y="' + sy + '" width="' + stringBoxW + '" height="' + stringBoxH + '" rx="8" fill="#132a45" stroke="#60a5fa" stroke-width="2.5"/>';

    if (showIndividual) {
      const panelsToDraw = panelsForThisString;
      const miniGap = 14;
      const availW = stringBoxW - 100;
      const maxMiniW = 70;
      const miniW = Math.min(maxMiniW, Math.floor((availW - (panelsToDraw-1)*miniGap) / panelsToDraw));
      const miniH = 60;
      const miniY = sy + 55;
      const miniStartX = sx + (stringBoxW - (panelsToDraw*miniW + (panelsToDraw-1)*miniGap)) / 2;

      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 30) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">S' + (i+1) + '</text>';

      for (let m = 0; m < panelsToDraw; m++) {
        const mx = miniStartX + m * (miniW + miniGap);
        svg += '<rect x="' + mx + '" y="' + miniY + '" width="' + miniW + '" height="' + miniH + '" rx="3" fill="#3b6d9c" stroke="#c7ddf5" stroke-width="1.5"/>';
        svg += '<line x1="' + mx + '" y1="' + (miniY + miniH/3) + '" x2="' + (mx + miniW) + '" y2="' + (miniY + miniH/3) + '" stroke="#1e3a5f" stroke-width="0.8"/>';
        svg += '<line x1="' + mx + '" y1="' + (miniY + 2*miniH/3) + '" x2="' + (mx + miniW) + '" y2="' + (miniY + 2*miniH/3) + '" stroke="#1e3a5f" stroke-width="0.8"/>';
        svg += '<text x="' + (mx + miniW/2) + '" y="' + (miniY + miniH/2 + 5) + '" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">' + pvPanelW + 'W</text>';

        if (m < panelsToDraw - 1) {
          const plusX  = mx + miniW;
          const minusX = mx + miniW + miniGap;
          svg += '<line x1="' + plusX + '" y1="' + (miniY + miniH/2) + '" x2="' + minusX + '" y2="' + (miniY + miniH/2) + '" stroke="#fbbf24" stroke-width="2.5"/>';
          svg += '<circle cx="' + plusX + '" cy="' + (miniY + miniH/2) + '" r="3" fill="#dc2626"/>';
          svg += '<circle cx="' + minusX + '" cy="' + (miniY + miniH/2) + '" r="3" fill="#1e40af"/>';
        }
      }

      svg += '<circle cx="' + (sx + 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#1e40af" stroke="#93c5fd" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#93c5fd" font-size="15" font-weight="bold">−</text>';
      svg += '<circle cx="' + (sx + stringBoxW - 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#dc2626" stroke="#fca5a5" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + stringBoxW - 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#fca5a5" font-size="15" font-weight="bold">+</text>';

      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + stringBoxH - 14) + '" text-anchor="middle" fill="#dbeafe" font-size="14" font-weight="bold">' + panelsForThisString + '×' + pvPanelW + 'W  ·  ' + n(stringPowerW) + 'W  ·  ' + f1(pvStringV) + 'V</text>';
    } else {
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 46) + '" text-anchor="middle" fill="#ffffff" font-size="28" font-weight="bold">S' + (i+1) + '</text>';
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 82) + '" text-anchor="middle" fill="#dbeafe" font-size="18" font-weight="bold">' + panelsForThisString + ' ألواح × ' + pvPanelW + 'W</text>';
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 112) + '" text-anchor="middle" fill="#dbeafe" font-size="17" font-weight="bold">' + f1(pvStringV) + ' V  ·  ' + f1(iPerString) + ' A</text>';
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 143) + '" text-anchor="middle" fill="#a3e635" font-size="17" font-weight="bold">' + n(stringPowerW) + ' W</text>';

      svg += '<circle cx="' + (sx + 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#1e40af" stroke="#93c5fd" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#93c5fd" font-size="15" font-weight="bold">−</text>';
      svg += '<circle cx="' + (sx + stringBoxW - 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#dc2626" stroke="#fca5a5" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + stringBoxW - 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#fca5a5" font-size="15" font-weight="bold">+</text>';
    }

    const arrStartY = sy + stringBoxH + 4;
    const arrEndY   = sy + stringBoxH + 30;
    const arrX      = sx + stringBoxW / 2;
    svg += '<line x1="' + arrX + '" y1="' + arrStartY + '" x2="' + arrX + '" y2="' + arrEndY + '" stroke="#c49b40" stroke-width="3" marker-end="url(#aGold)"/>';
    svg += '<text x="' + (arrX + 12) + '" y="' + (arrEndY - 4) + '" fill="#f0d99a" font-size="13" font-weight="bold">→ MPPT #' + (i+1) + '</text>';
  }

  if (nStrings > stringsToShow) {
    svg += '<text x="' + (W/2) + '" y="' + (stringStartY + rowsNeeded * (stringBoxH + stringGapY) + 22) + '" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">+ ' + (nStrings - stringsToShow) + ' سلسلة إضافية (لم تُعرض بصريًا)</text>';
  }

  const pvSecBottom = pvSecY + pvSecH;
  svg += '<line x1="' + (W/2) + '" y1="' + (pvSecBottom + 5) + '" x2="' + (W/2) + '" y2="' + (pvSecBottom + 45) + '" stroke="#c49b40" stroke-width="4" marker-end="url(#aGold)"/>';
  svg += '<text x="' + (W/2 + 20) + '" y="' + (pvSecBottom + 30) + '" fill="#f0d99a" font-size="14" font-weight="bold">كابل DC: ' + pvCable + 'mm² × ' + pvPaths + ' مسار/سلسلة · ' + f1(iPerString) + 'A/سلسلة</text>';

  /* القاطع DC + SPD */
  const pvBrkY = pvSecBottom + 50, pvBrkH = 80;
  svg += '<rect x="' + (W/2 - 300) + '" y="' + pvBrkY + '" width="600" height="' + pvBrkH + '" rx="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (pvBrkY + 32) + '" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold">🛡️ قاطع DC + مانع صواعق (SPD)</text>';
  svg += '<text x="' + (W/2) + '" y="' + (pvBrkY + 62) + '" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold">' + pvBrk + ' A / 600V DC  ·  SPD 40kA</text>';

  svg += '<line x1="' + (W/2) + '" y1="' + (pvBrkY + pvBrkH) + '" x2="' + (W/2) + '" y2="' + (pvBrkY + pvBrkH + 40) + '" stroke="#c49b40" stroke-width="4" marker-end="url(#aGold)"/>';

  /* ═══ الإنفرتر + MPPT (عرض موحد: نشط + متاح) ═══ */
  const invY = pvBrkY + pvBrkH + 50;
  const invH = 420;

  svg += '<rect x="60" y="' + invY + '" width="' + (W-120) + '" height="' + invH + '" rx="18" fill="#8d681e" stroke="#f0d99a" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (invY + 38) + '" text-anchor="middle" fill="#fff8e8" font-size="22" font-weight="bold">🎛️ الإنفرتر — ' + invN + ' وحدة × ' + n(invRatedW) + 'W</text>';

  /* رسم 4 صناديق MPPT (النشط + المتاح) */
  const mpptBoxW = 300, mpptBoxH = 175, mpptGapX = 30;
  const mpptRowWidth = totalMPPT * mpptBoxW + (totalMPPT - 1) * mpptGapX;
  const mpptStartX = (W - mpptRowWidth) / 2;
  const mpptStartY = invY + 75;

  for (let m = 0; m < totalMPPT; m++) {
    const mx = mpptStartX + m * (mpptBoxW + mpptGapX);
    const my = mpptStartY;
    const isActive = m < activeMPPT;

    const boxFill   = isActive ? '#1a1410' : '#0f1012';
    const boxStroke = isActive ? '#f0d99a' : '#4b5563';
    const titleClr  = isActive ? '#f0d99a' : '#9ca3af';
    const bodyClr   = isActive ? '#f0d99a' : '#6b7280';
    const dashStyle = isActive ? '' : ' stroke-dasharray="5,3"';

    svg += '<line x1="' + (mx + mpptBoxW/2) + '" y1="' + (my - 22) + '" x2="' + (mx + mpptBoxW/2) + '" y2="' + (my - 3) + '" stroke="' + (isActive ? '#f0d99a' : '#4b5563') + '" stroke-width="3" marker-end="url(' + (isActive ? '#aGold' : '#aGold') + ')"/>';

    svg += '<rect x="' + mx + '" y="' + my + '" width="' + mpptBoxW + '" height="' + mpptBoxH + '" rx="8" fill="' + boxFill + '" stroke="' + boxStroke + '" stroke-width="2.5"' + dashStyle + '/>';

    svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 32) + '" text-anchor="middle" fill="' + titleClr + '" font-size="17" font-weight="bold">MPPT #' + (m+1) + '</text>';

    if (isActive) {
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 66) + '" text-anchor="middle" fill="' + bodyClr + '" font-size="14" font-weight="bold">Vin: ' + f1(pvStringV) + ' V  ·  Iin: ' + f1(iPerString) + ' A</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 100) + '" text-anchor="middle" fill="#a3e635" font-size="15" font-weight="bold">المصدر: السلسلة S' + (m+1) + '</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 128) + '" text-anchor="middle" fill="#dbeafe" font-size="13" font-weight="bold">' + n(panelsInString(m) * pvPanelW) + ' W</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 152) + '" text-anchor="middle" fill="#a3e635" font-size="12" font-weight="bold">● نشط</text>';

      svg += '<circle cx="' + mx + '" cy="' + (my + mpptBoxH/2) + '" r="5" fill="#dc2626"/>';
      svg += '<circle cx="' + (mx + mpptBoxW) + '" cy="' + (my + mpptBoxH/2) + '" r="5" fill="#1e40af"/>';
    } else {
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 85) + '" text-anchor="middle" fill="' + bodyClr + '" font-size="15" font-weight="bold">متاح للتوسعة</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 120) + '" text-anchor="middle" fill="#4b5563" font-size="13" font-weight="bold">○ غير مستخدم</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 152) + '" text-anchor="middle" fill="#6b7280" font-size="12">فارغ</text>';
    }
  }

  /* ملخص أسفل قسم الإنفرتر */
  const summaryInvY = invY + invH - 30;
  svg += '<text x="' + (W/2) + '" y="' + summaryInvY + '" text-anchor="middle" fill="#fff8e8" font-size="16" font-weight="bold">مداخل MPPT المستخدمة: ' + activeMPPT + ' / ' + totalMPPT + '  |  الخرج: ' + phasesLabel + '  |  ' + n(invW) + ' W  |  ' + f1(iAc) + ' A/طور</text>';

  /* تفريع AC / DC */
  const splitY = invY + invH + 30;
  const leftX = 380, rightX = W - 380;

  svg += '<line x1="' + (W/2) + '" y1="' + (invY + invH) + '" x2="' + (W/2) + '" y2="' + splitY + '" stroke="#c49b40" stroke-width="4"/>';
  svg += '<line x1="' + leftX + '" y1="' + splitY + '" x2="' + rightX + '" y2="' + splitY + '" stroke="#c49b40" stroke-width="4"/>';
  svg += '<line x1="' + leftX + '" y1="' + splitY + '" x2="' + leftX + '" y2="' + (splitY + 45) + '" stroke="#3b82f6" stroke-width="4" marker-end="url(#aBlue)"/>';
  svg += '<text x="' + (leftX + 18) + '" y="' + (splitY + 28) + '" fill="#bfdbfe" font-size="14" font-weight="bold">AC: ' + acCable + 'mm² × ' + acPaths + '</text>';
  svg += '<line x1="' + rightX + '" y1="' + splitY + '" x2="' + rightX + '" y2="' + (splitY + 45) + '" stroke="#16a34a" stroke-width="4" marker-end="url(#aGreen)"/>';
  svg += '<text x="' + (rightX + 18) + '" y="' + (splitY + 28) + '" fill="#a7f3d0" font-size="14" font-weight="bold">DC: ' + batCable + 'mm² × ' + batPaths + '</text>';

  /* القواطع */
  const brkY = splitY + 55, brkH = 85, brkW = 460;

  svg += '<rect x="' + (leftX - brkW/2) + '" y="' + brkY + '" width="' + brkW + '" height="' + brkH + '" rx="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="3"/>';
  svg += '<text x="' + leftX + '" y="' + (brkY + 34) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">🛡️ قاطع AC</text>';
  svg += '<text x="' + leftX + '" y="' + (brkY + 65) + '" text-anchor="middle" fill="#ffffff" font-size="19" font-weight="bold">' + acBrk + ' A</text>';

  svg += '<rect x="' + (rightX - brkW/2) + '" y="' + brkY + '" width="' + brkW + '" height="' + brkH + '" rx="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="3"/>';
  svg += '<text x="' + rightX + '" y="' + (brkY + 34) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">🛡️ قاطع DC للبطاريات</text>';
  svg += '<text x="' + rightX + '" y="' + (brkY + 65) + '" text-anchor="middle" fill="#ffffff" font-size="19" font-weight="bold">' + batBrk + ' A / ' + batV + 'V DC</text>';

  svg += '<line x1="' + leftX + '" y1="' + (brkY + brkH) + '" x2="' + leftX + '" y2="' + (brkY + brkH + 45) + '" stroke="#3b82f6" stroke-width="4" marker-end="url(#aBlue)"/>';
  svg += '<line x1="' + rightX + '" y1="' + (brkY + brkH) + '" x2="' + rightX + '" y2="' + (brkY + brkH + 45) + '" stroke="#16a34a" stroke-width="4" marker-end="url(#aGreen)"/>';

  /* الأحمال + Busbar */
  const rowY = brkY + brkH + 55;
  const loadsW = 620, loadsH = 230;
  const loadsX = leftX - loadsW/2;
  const busbarW = 620, busbarH = 105;
  const busbarX = rightX - busbarW/2;

  svg += '<rect x="' + loadsX + '" y="' + rowY + '" width="' + loadsW + '" height="' + loadsH + '" rx="18" fill="#1e3a8a" stroke="#93c5fd" stroke-width="3"/>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 65) + '" text-anchor="middle" fill="#ffffff" font-size="52">🏠</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 118) + '" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="bold">الأحمال المنزلية</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 150) + '" text-anchor="middle" fill="#dbeafe" font-size="16" font-weight="bold">' + phasesLabel + '</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 178) + '" text-anchor="middle" fill="#dbeafe" font-size="15" font-weight="bold">أعلى حمل: ' + n(peakW) + ' W</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 204) + '" text-anchor="middle" fill="#dbeafe" font-size="15" font-weight="bold">التيار: ' + f1(iAc) + ' A</text>';

  svg += '<rect x="' + busbarX + '" y="' + rowY + '" width="' + busbarW + '" height="' + busbarH + '" rx="12" fill="#1a1410" stroke="#f0d99a" stroke-width="3"/>';
  svg += '<text x="' + rightX + '" y="' + (rowY + 38) + '" text-anchor="middle" fill="#f0d99a" font-size="20" font-weight="bold">⚡ BUSBAR — ناقل التوزيع ' + batV + 'V</text>';
  svg += '<text x="' + rightX + '" y="' + (rowY + 66) + '" text-anchor="middle" fill="#f0d99a" font-size="14" font-weight="bold">سعة التوزيع: ' + f1(batAh) + ' Ah · ' + batCount + ' وحدة متوازية</text>';

  const busbarTermY = rowY + busbarH;

  /* بنك البطاريات */
  const batSecY = rowY + Math.max(loadsH, busbarH) + 90;
  const batSecH = 380;

  const collectorY = batSecY - 35;
  svg += '<line x1="220" y1="' + collectorY + '" x2="' + (W-220) + '" y2="' + collectorY + '" stroke="#fbbf24" stroke-width="2" stroke-dasharray="6,3" opacity="0.8"/>';
  svg += '<line x1="' + rightX + '" y1="' + (busbarTermY + 5) + '" x2="' + rightX + '" y2="' + collectorY + '" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="6,3"/>';
  svg += '<circle cx="' + rightX + '" cy="' + busbarTermY + '" r="6" fill="#c49b40" stroke="#f0d99a" stroke-width="1.5"/>';

  svg += '<rect x="100" y="' + batSecY + '" width="' + (W-200) + '" height="' + batSecH + '" rx="18" fill="#065f46" stroke="#a7f3d0" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (batSecY + 42) + '" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="bold">🔋 بنك البطاريات — ' + batLabel + '</text>';
  svg += '<text x="' + (W/2) + '" y="' + (batSecY + 72) + '" text-anchor="middle" fill="#d1fae5" font-size="15" font-weight="bold">' + batCount + ' وحدة × ' + batUnitDesc + '  |  الإجمالي: ' + batV + 'V · ' + f1(batAh) + ' Ah · ' + f1(batWh/1000) + ' kWh</text>';

  const batBoxesToShow = Math.min(batCount, 8);
  const batBoxW = batBoxesToShow <= 6 ? 200 : 165;
  const batBoxH = 140, batGapX = 20;
  const batRowWidth = batBoxesToShow * batBoxW + (batBoxesToShow - 1) * batGapX;
  const batStartX = (W - batRowWidth) / 2;
  const batStartY = batSecY + 100;

  for (let b = 0; b < batBoxesToShow; b++) {
    const bx = batStartX + b * (batBoxW + batGapX);
    const by = batStartY;

    svg += '<rect x="' + bx + '" y="' + by + '" width="' + batBoxW + '" height="' + batBoxH + '" rx="6" fill="#064e3b" stroke="#a7f3d0" stroke-width="2.5"/>';

    svg += '<rect x="' + (bx + batBoxW/2 - 9) + '" y="' + (by - 7) + '" width="18" height="7" fill="#dc2626" rx="1"/>';
    svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by - 14) + '" text-anchor="middle" fill="#fca5a5" font-size="14" font-weight="bold">+</text>';

    svg += '<rect x="' + (bx + batBoxW/2 - 9) + '" y="' + (by + batBoxH) + '" width="18" height="7" fill="#1e40af" rx="1"/>';
    svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + batBoxH + 22) + '" text-anchor="middle" fill="#93c5fd" font-size="14" font-weight="bold">−</text>';

    svg += '<rect x="' + (bx + 15) + '" y="' + (by + batBoxH - 30) + '" width="' + (batBoxW - 30) + '" height="14" fill="#16a34a" rx="2"/>';

    svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 32) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">' + (isHV ? 'T' + (b+1) : 'B' + (b+1)) + '</text>';

    if (isHV) {
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 58) + '" text-anchor="middle" fill="#d1fae5" font-size="12" font-weight="bold">400V</text>';
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 78) + '" text-anchor="middle" fill="#d1fae5" font-size="11" font-weight="bold">35.8 kWh</text>';
    } else {
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 58) + '" text-anchor="middle" fill="#d1fae5" font-size="12" font-weight="bold">48V · ' + (s.battery.unitAh || 100) + 'Ah</text>';
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 78) + '" text-anchor="middle" fill="#d1fae5" font-size="11" font-weight="bold">LiFePO₄</text>';
    }

    const bcX = bx + batBoxW/2;
    svg += '<line x1="' + bcX + '" y1="' + (by - 7) + '" x2="' + bcX + '" y2="' + collectorY + '" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>';
  }

  if (batCount > batBoxesToShow) {
    svg += '<text x="' + (W/2) + '" y="' + (batStartY + batBoxH + 60) + '" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">+ ' + (batCount - batBoxesToShow) + ' وحدة إضافية (لم تُعرض بصريًا)</text>';
  }

  const summaryY = batSecY + batSecH + 40;
  svg += '<text x="' + (W/2) + '" y="' + summaryY + '" text-anchor="middle" fill="#f0d99a" font-size="17" font-weight="bold">🔋 إجمالي السعة: ' + n(batWh) + ' Wh (' + f1(batWh/1000) + ' kWh)  |  أيام استقلالية: ' + (s.battery.autonomyDays || 1) + '</text>';

  svg += '<line x1="40" y1="' + (H-60) + '" x2="' + (W-40) + '" y2="' + (H-60) + '" stroke="#c49b40" stroke-width="1" opacity="0.4"/>';
  svg += '<text x="' + (W/2) + '" y="' + (H-30) + '" text-anchor="middle" fill="#a3a39e" font-size="15" font-weight="bold">م/ محمد الأسد — إب، اليمن  |  +967 774 616 896</text>';

  svg += '</svg>';
  return svg;
}


modules['diagram'] = { buildDiagram };
})();

/* ═══ ui-core.js ═══ */
(function(){
/* ═══════════════════════════════════════════════════════════════
   الطبقة 6 (أ): ui-core — منطق العرض النقي
   ═══════════════════════════════════════════════════════════════
   
   دوال نقية (testable):
   - fmt() — تنسيق أرقام
   - row() — صف HTML
   - card() — بطاقة HTML
   - buildReport() — تقرير كامل
   
   لا DOM هنا. لا side effects.
   ═══════════════════════════════════════════════════════════════ */

/* ═══ تنسيق الأرقام ═══ */
function fmt(n, decimals) {
  if (!Number.isFinite(n)) return '—';
  decimals = decimals == null ? 2 : decimals;
  return Number(n).toFixed(decimals);
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

/* ═══ صف HTML ═══ */
function row(label, value) {
  return '<div class="sc-row"><span class="lbl">' + label + '</span><span class="val">' + value + '</span></div>';
}

/* ═══ بطاقة HTML ═══ */
function card(title, rows) {
  return '<div class="sc-card"><h4>' + title + '</h4>' + rows.join('') + '</div>';
}

/* ═══ بناء التقرير من نتائج النظام + التحقق ═══ */
function buildReport(systemResult, validationResult, meta) {
  const s = systemResult;
  const v = validationResult;
  meta = meta || {};
  const inputMethod = meta.inputMethod || '';
  const cards = [];

  /* ═══ بطاقة 0: المخطط البصري ═══ */
  try {
    const D = modules['diagram'];
    if (D && D.buildDiagram) {
      var svgStr = D.buildDiagram(s);
      cards.push('<div class="sc-card"><h4>📐 مخطط النظام — كيف يُربط</h4>' + svgStr + '</div>');
    }
  } catch (e) {
    console.error('[Diagram] error:', e.message);
  }

  /* ═══ بطاقة 1: المعطيات الشاملة ═══ */
  const c1 = [];
  c1.push(row('طريقة الإدخال', methodLabel(s, inputMethod)));
  c1.push(row('الاستهلاك اليومي', fmtInt(s.load.dailyWh) + ' Wh (' + fmt(s.load.dailyKWh, 2) + ' kWh)'));
  c1.push(row('متوسط الحمل', fmtInt(s.load.avgW) + ' W'));
  c1.push(row('أعلى حمل لحظي', fmtInt(s.load.peakW) + ' W'));
  c1.push(row('وضع النظام', s.mode + ' (' + s.battery.voltage + ' V)'));
  const phaseMode = s.phasesChoice === 'auto' ? 'تلقائي' : 'يدوي';
  c1.push(row('عدد الأطوار', s.phases + 'φ (' + phaseMode + ')'));
  cards.push(card('📊 1. المعطيات الشاملة', c1));

  /* ═══ بطاقة 2: مصفوفة الألواح ═══ */
  const c2 = [];
  c2.push(row('القدرة المطلوبة', fmtInt(s.pv.requiredW) + ' W'));
  c2.push(row('القدرة الفعلية', fmtInt(s.pv.actualW) + ' W'));
  c2.push(row('عدد الألواح', s.pv.nPanels + ' × ' + s.pv.panelW + ' W'));
  c2.push(row('معامل الأداء PR', fmt(s.pv.pr, 3)));
  cards.push(card('🔆 2. مصفوفة الألواح', c2));

  /* ═══ بطاقة 3: البطاريات ═══ */
  const c3 = [];
  if (s.battery.mode === 'LV') {
    c3.push(row('السعة المطلوبة', fmtInt(s.battery.requiredAh) + ' Ah'));
    c3.push(row('عدد الوحدات', s.battery.units + ' × ' + s.battery.unitAh + ' Ah'));
    c3.push(row('السعة الفعلية', fmtInt(s.battery.actualAh) + ' Ah'));
    c3.push(row('الطاقة الفعلية', fmtInt(s.battery.actualWh) + ' Wh (' + fmt(s.battery.actualWh/1000, 2) + ' kWh)'));
  } else {
    c3.push(row('الطاقة المطلوبة', fmt(s.battery.requiredKWh, 1) + ' kWh'));
    c3.push(row('عدد الأبراج', s.battery.towers + ' × ' + s.battery.unitKWh + ' kWh'));
    c3.push(row('الطاقة الفعلية', fmt(s.battery.actualKWh, 1) + ' kWh'));
  }
  c3.push(row('DoD المستخدم', fmt(s.battery.dod * 100, 0) + ' %'));
  cards.push(card('🔋 3. بنك البطاريات', c3));

  /* ═══ بطاقة 3.b: معلومات للتوسع (عند أيام استقلالية > 1) ═══ */
  if (s.battery.autonomyDays && s.battery.autonomyDays > 1) {
    const aut = s.battery.autonomyDays;

    /* ═══ أسعار مرجعية تقديرية (السوق اليمني 2026) ═══ */
    const PRICE = {
      batLV: 900,       // $ لكل 48V/100Ah LiFePO4
      batHV: 3200,      // $ لكل برج Pylontech Force H3
      panelW: 0.30,     // $ لكل واط للوح
      inv8: 1800,       // $ لكل إنفرتر 8kW
      inv50: 6500       // $ لكل إنفرتر 50kW HV
    };

    /* ═══ بطارية ═══ */
    const c3b = [];
    let batCost = 0;
    if (s.battery.mode === 'LV') {
      batCost = (s.battery.units || 0) * PRICE.batLV;
      c3b.push(row('🔋 سعة البطارية الحالية', fmt(s.battery.actualWh/1000, 1) + ' kWh (' + s.battery.units + ' × 100Ah)'));
      c3b.push(row('   التكلفة التقديرية', '≈ $' + fmtInt(batCost)));
    } else {
      batCost = (s.battery.towers || 0) * PRICE.batHV;
      c3b.push(row('🔋 سعة البطارية الحالية', fmt(s.battery.actualKWh, 1) + ' kWh (' + s.battery.towers + ' برج)'));
      c3b.push(row('   التكلفة التقديرية', '≈ $' + fmtInt(batCost)));
    }

    /* ═══ الألواح (لإعادة الشحن في 3 أيام) ═══ */
    const eLoadDc = s.load.dailyWh / 0.92;
    const eBatNominal = (s.battery.actualWh || (s.battery.actualKWh * 1000)) || 0;
    const eRecharge = eBatNominal / 3;
    const pvNeeded = (eLoadDc + eRecharge) / (5.5 * s.pv.pr);
    const panelsNeeded = Math.ceil(pvNeeded / s.pv.panelW);
    const panelsExtra = Math.max(0, panelsNeeded - s.pv.nPanels);
    const panelCost = panelsNeeded * s.pv.panelW * PRICE.panelW;
    const panelExtraCost = panelsExtra * s.pv.panelW * PRICE.panelW;

    c3b.push(row('☀️ الألواح المطلوبة (شحن في 3 أيام)', fmtInt(pvNeeded) + ' W (' + panelsNeeded + ' لوح)'));
    c3b.push(row('   الحالي', fmtInt(s.pv.actualW) + ' W (' + s.pv.nPanels + ' لوح)'));
    if (panelsExtra > 0) {
      c3b.push(row('   ⚠️ إضافي مطلوب', '+ ' + panelsExtra + ' لوح (≈ $' + fmtInt(panelExtraCost) + ')'));
    } else {
      c3b.push(row('   ✅ لا حاجة لإضافة ألواح', 'الشحن يكتمل في 3 أيام'));
    }

    /* ═══ الإنفرتر (لا يتغير) ═══ */
    let invCost = s.mode === 'HV'
      ? (s.inverter.nInverters || 1) * PRICE.inv50
      : (s.inverter.nInverters || 1) * PRICE.inv8;
    c3b.push(row('⚡ الإنفرتر', s.inverter.stdW + ' W (' + s.inverter.nInverters + ' وحدة)'));
    c3b.push(row('   لا يتغير مع زيادة الاستقلالية', '≈ $' + fmtInt(invCost)));

    /* ═══ التكلفة الإجمالية ═══ */
    const totalCost = batCost + panelCost + invCost;
    c3b.push(row('💰 التكلفة الإجمالية التقديرية', '≈ $' + fmtInt(totalCost)));

    /* ═══ النصيحة ═══ */
    let advice = '';
    if (aut === 2) {
      advice = '✅ مناسب للمناطق الجبلية بغيوم متكررة (صعدة، حجة، المحويت)';
    } else if (aut === 3) {
      advice = '🟡 للمؤسسات الحيوية (عيادات، محطات اتصال) — تكلفة مرتفعة';
    } else {
      advice = '🚨 مبالغة كبيرة — معظم البيوت اليمنية تكفيها 1-2 يوم';
    }
    c3b.push(row('📋 النصيحة', advice));

    /* ═══ بديل اقتصادي ═══ */
    const altBatCost = batCost / aut;
    const saving = batCost - altBatCost;
    if (saving > 300) {
      c3b.push(row('💡 بديل اقتصادي', 'يوم واحد فقط — توفير ≈ $' + fmtInt(saving) + ' من البطاريات'));
    }

    /* ═══ تنبيه أمني ═══ */
    if (panelsExtra > 0) {
      c3b.push('<div style="background:#3a0e09;border:1px solid #b45309;border-radius:8px;padding:10px;margin:10px 0;color:#fde68a;font-size:.88rem">');
      c3b.push('<strong>🚨 تنبيه هام:</strong><br>');
      c3b.push('بدون إضافة ' + panelsExtra + ' لوح، لن تُشحن البطارية كاملة خلال 3 أيام. ');
      c3b.push('فكّر بـ: (1) إضافة الألواح، (2) تقليل أيام الاستقلالية، أو (3) تمديد أيام الشحن.');
      c3b.push('</div>');
    }

    cards.push(card('📊 3.b معلومات النظام للتوسع', c3b));
  }

  /* ═══ بطاقة 4: الإنفرتر ═══ */
  const c4 = [];
  c4.push(row('القدرة المستمرة', fmtInt(s.inverter.contW) + ' W'));
  c4.push(row('القدرة القياسية', fmtInt(s.inverter.stdW) + ' W'));
  c4.push(row('قدرة الإقلاع', fmtInt(s.inverter.surgeW) + ' W'));
  c4.push(row('عدد الإنفرترات', s.inverter.nInverters + ' × ' + fmtInt(s.inverter.ratedW) + ' W'));
  cards.push(card('⚡ 4. الإنفرتر', c4));

  /* ═══ بطاقة 5: التيارات ═══ */
  const c5 = [];
  c5.push(row('تيار البطارية (DC)', fmt(s.iBat, 1) + ' A'));
  c5.push(row('تيار AC لكل طور', fmt(s.iAc, 1) + ' A'));
  cards.push(card('🔌 5. التيارات', c5));

  /* ═══ بطاقة 6: كابل البطارية + القاطع ═══ */
  const c6 = [];
  const bc = s.batteryCable;
  c6.push(row('مقطع الكابل', bc.cableSize + ' mm² × ' + bc.paths + ' مسار'));
  c6.push(row('القاطع', bc.breaker + ' A'));
  c6.push(row('تحمل الكابل الكلي', fmtInt(bc.cableAmpacity) + ' A'));
  c6.push(row('التحقق', fmt(s.iBat, 1) + ' ≤ ' + bc.breaker + ' ≤ ' + fmtInt(bc.cableAmpacity) + ' ' + (bc.valid ? '✅' : '🚨')));
  cards.push(card('🔋 6. كابل البطارية', c6));

  /* ═══ بطاقة 6.b: كابل الألواح ═══ */
  if (s.pvCable) {
    const c6b = [];
    const pv = s.pvCable;
    var nStrCalc = Math.max(1, Math.ceil(s.pv.nPanels / 8));
    var iPerStringCalc = s.iPv / nStrCalc;
    var iLabel = nStrCalc > 1
      ? 'تيار المصفوفة (لكل سلسلة: ' + fmt(iPerStringCalc, 1) + ' A)'
      : 'تيار المصفوفة';
    c6b.push(row(iLabel, fmt(s.iPv, 1) + ' A'));
    c6b.push(row('جهد السلسلة', fmt(s.pvStringV || 0, 0) + ' V'));
    c6b.push(row('مقطع الكابل', pv.cableSize + ' mm² × ' + pv.paths + ' مسار'));
    c6b.push(row('القاطع', pv.breaker + ' A'));
    c6b.push(row('تحمل الكابل الكلي', fmtInt(pv.cableAmpacity) + ' A'));
    c6b.push(row('التحقق', fmt(s.iPv, 1) + ' ≤ ' + pv.breaker + ' ≤ ' + fmtInt(pv.cableAmpacity) + ' ' + (pv.valid ? '✅' : '🚨')));
    cards.push(card('☀️ 6.b كابل الألواح', c6b));
  }

  /* ═══ بطاقة 7: كابل AC + القاطع ═══ */
  const c7 = [];
  const ac = s.acCable;
  c7.push(row('مقطع الكابل', ac.cableSize + ' mm² × ' + ac.paths + ' مسار'));
  c7.push(row('القاطع', ac.breaker + ' A'));
  c7.push(row('تحمل الكابل الكلي', fmtInt(ac.cableAmpacity) + ' A'));
  c7.push(row('التحقق', fmt(s.iAc, 1) + ' ≤ ' + ac.breaker + ' ≤ ' + fmtInt(ac.cableAmpacity) + ' ' + (ac.valid ? '✅' : '🚨')));
  cards.push(card('⚡ 7. كابل AC', c7));

  /* ═══ بطاقة 8: التحقق ═══ */
  const c8 = [];
  if (v.valid) {
    c8.push('<div class="sc-ok"><strong>✅ النظام صالح</strong>' +
      '<br>الأخطاء: 0 | التحذيرات: ' + v.counts.warnings + '</div>');
  } else {
    c8.push('<div class="sc-warn"><strong>🚨 أخطاء حرجة</strong></div>');
  }

  // دمج تحذيرات الأطوار
  const allIssues = (v.issues || []).slice();
  if (s.phaseWarnings && s.phaseWarnings.length > 0) {
    s.phaseWarnings.forEach(pw => allIssues.push(pw));
  }
  
  if (allIssues.length > 0) {
    const list = allIssues.map(i => {
      const icon = i.severity === 'error' ? '🚨' : (i.severity === 'warning' ? '⚠️' : 'ℹ️');
      return '<li>' + icon + ' ' + i.message + '</li>';
    });
    c8.push('<ul>' + list.join('') + '</ul>');
  } else {
    c8.push('<p>✅ لا تحذيرات.</p>');
  }
  cards.push(card('🛡️ 8. التحقق النهائي', c8));

  /* ═══ التاريخ ═══ */
  const dateStr = new Date().toLocaleString('ar-EG');
  cards.push('<p class="sc-foot">📅 ' + dateStr + '</p>');

  return cards.join('');
}

/* ═══ تسمية طريقة الإدخال ═══ */
function methodLabel(s, inputMethod) {
  if (inputMethod === 'clamp') return 'قراءة Clamp Meter';
  if (inputMethod === 'daily') return 'استهلاك يومي + نوع البيت';
  if (inputMethod === 'table') return 'جدول الأجهزة';
  return 'غير محدد';
}

/* ═══ التصدير ═══ */

modules['ui-core'] = {
  fmt,
  fmtInt,
  row,
  card,
  buildReport,
  methodLabel
};
})();

/* ═══ ui-dom.js ═══ */
(function(){
/* ═══════════════════════════════════════════════════════════════
   الطبقة 6 (ب): ui-dom — ربط المتصفح
   ═══════════════════════════════════════════════════════════════
   
   القواعد:
   - لا حسابات هنا
   - فقط: قراءة DOM، كتابة DOM
   - يعتمد على الطبقات 1-6a
   - لا يُختبر في Node (يحتاج متصفح)
   ═══════════════════════════════════════════════════════════════ */

function initUI(deps) {
  const Sys = deps.system;
  const Val = deps.validation;
  const UI = deps.uiCore;

  const host = document.getElementById('calculator');
  if (!host) {
    console.error('[SolarCalc v3] #calculator not found');
    return;
  }

  /* ═══ حقن CSS ═══ */
  const style = document.createElement('style');
  style.textContent = getCSS();
  document.head.appendChild(style);

  /* ═══ بناء الواجهة ═══ */
  host.innerHTML = buildHTML();

  /* ═══ ربط الأحداث ═══ */
  const btnCalc = document.getElementById('sc3-calc');
  const btnPdf = document.getElementById('sc3-pdf');
  const btnReset = document.getElementById('sc3-reset');
  const reportEl = document.getElementById('sc3-report');

  /* ═══ تبديل حقول الإدخال حسب الطريقة ═══ */ 
  const methodSelect = document.getElementById("sc3-method"); 
  if (methodSelect) { 
    methodSelect.addEventListener("change", function() { 
      const m = this.value; 
      const blockClamp = document.getElementById("sc3-block-clamp"); 
      const blockDaily = document.getElementById("sc3-block-daily"); 
      const blockTable = document.getElementById("sc3-block-table"); 
      if (blockClamp) blockClamp.style.display = (m === "clamp") ? "" : "none"; 
      if (blockDaily) blockDaily.style.display = (m === "daily") ? "" : "none"; 
      if (blockTable) blockTable.style.display = (m === "table") ? "" : "none"; 
    }); 
    /* تشغيل فوري عند التحميل لضبط العرض الحالي */ 
    methodSelect.dispatchEvent(new Event("change")); 
  } 

  if (btnCalc) btnCalc.addEventListener('click', () => {
    try {
      const inputs = readInputs();

      // ═══ 1. التحقق من صحة المدخلات ═══
      const inputCheck = Sys.validateInputs(inputs);
      if (!inputCheck.valid) {
        let html = '<div class="sc-warn"><strong>🚨 لا يمكن الحساب — مدخلات غير صالحة:</strong><ul>';
        inputCheck.errors.forEach(err => {
          html += '<li>❌ ' + err.message + '</li>';
        });
        html += '</ul>';
        if (inputCheck.warnings.length > 0) {
          html += '<strong>⚠️ تنبيهات:</strong><ul>';
          inputCheck.warnings.forEach(w => {
            html += '<li>⚠️ ' + w.message + '</li>';
          });
          html += '</ul>';
        }
        html += '<p style="margin-top:10px"><strong>الحدود المسموحة:</strong></p>';
        html += '<ul style="font-size:.85rem">';
        html += '<li>قدرة اللوح: 250 — 1500 واط</li>';
        html += '<li>ساعات الشمس: 2 — 8</li>';
        html += '<li>أيام الاستقلالية: 1 — 5</li>';
        html += '<li>قراءة Clamp: 0.1 — 2000 أمبير</li>';
        html += '<li>ساعات التشغيل: 1 — 24</li>';
        html += '<li>الاستهلاك اليومي: 0.1 — 10,000 kWh</li>';
        html += '</ul></div>';
        reportEl.innerHTML = html;
        reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // ═══ 2. الحساب ═══
      const result = Sys.analyzeSystem(inputs);
      const validation = Val.validateSystem(result);

      // ═══ 3. إضافة تحذيرات المدخلات ═══
      if (inputCheck.warnings.length > 0) {
        validation.issues = (validation.issues || []).concat(
          inputCheck.warnings.map(w => ({ severity: 'warning', code: w.code, message: w.message }))
        );
        validation.counts.warnings = validation.issues.filter(i => i.severity === 'warning').length;
      }

      const reportHTML = UI.buildReport(result, validation, {
        inputMethod: inputs.method
      });
      reportEl.innerHTML = reportHTML;
      saveInputs();
    } catch (e) {
      console.error('[SolarCalc v3] Error:', e);
      reportEl.innerHTML = '<div class="sc-warn">🚨 خطأ في الحساب: ' + e.message + '</div>';
    }
  });

  if (btnPdf) btnPdf.addEventListener('click', () => {
    if (!reportEl.innerHTML.trim()) {
      alert('احسب النظام أولًا');
      return;
    }
    exportPDF(reportEl.innerHTML);
  });

  if (btnReset) btnReset.addEventListener('click', () => {
    if (confirm('مسح المحفوظ والعودة للقيم الافتراضية؟')) {
      try { localStorage.removeItem('solarCalc3Inputs'); } catch (e) {}
      location.reload();
    }
  });

  /* ═══ استعادة القيم المحفوظة ═══ */
  restoreInputs();
}

/* ═══ قراءة المدخلات من DOM ═══ */
function readInputs() {
  const v = (id) => {
    const el = document.getElementById(id);
    return el ? (parseFloat(el.value) || 0) : 0;
  };
  const s = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const method = s('sc3-method');

  const inputs = {
    method: method,
    hsp: v('sc3-hsp') || 5.5,
    autonomyDays: v('sc3-autonomy') || 1,
    modeChoice: s('sc3-mode') || 'auto',
    phasesChoice: s('sc3-phases') || 'auto',
    panelW: v('sc3-panelW') || 550,
    pvCableLength: v('sc3-lPv') || 15,
    batteryCableLength: v('sc3-lBat') || 2,
    acCableLength: v('sc3-lAc') || 15
  };

  if (method === 'clamp') {
    inputs.clampAmps = v('sc3-clampAmps') || 0;
    inputs.clampAvgPct = v('sc3-clampAvgPct') || 40;
    inputs.clampHours = v('sc3-clampHours') || 10;
  } else if (method === 'daily') {
    inputs.dailyKWh = v('sc3-dailyKWh') || 0;
    inputs.peakFactor = v('sc3-peakFactor') || 3.5;
  } else if (method === 'table') {
    inputs.devices = [];
    const rows = document.querySelectorAll('.sc3-device-row');
    rows.forEach(row => {
      const d = {
        watts: parseFloat(row.querySelector('.sc3-d-w').value) || 0,
        count: parseInt(row.querySelector('.sc3-d-c').value) || 1,
        hours: parseFloat(row.querySelector('.sc3-d-h').value) || 0,
        surge: parseFloat(row.querySelector('.sc3-d-s').value) || 1,
        inPeak: row.querySelector('.sc3-d-p').checked
      };
      inputs.devices.push(d);
    });
  }

  return inputs;
}

/* ═══ حفظ المدخلات ═══ */
function saveInputs() {
  try {
    const ids = [
      'sc3-method', 'sc3-hsp', 'sc3-autonomy', 'sc3-mode', 'sc3-phases', 'sc3-panelW',
      'sc3-lPv', 'sc3-lBat', 'sc3-lAc',
      'sc3-clampAmps', 'sc3-clampAvgPct', 'sc3-clampHours',
      'sc3-dailyKWh', 'sc3-peakFactor'
    ];
    const data = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    localStorage.setItem('solarCalc3Inputs', JSON.stringify(data));
  } catch (e) {}
}

/* ═══ استعادة المدخلات ═══ */
function restoreInputs() {
  try {
    const raw = localStorage.getItem('solarCalc3Inputs');
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] != null) el.value = data[id];
    });
  } catch (e) {}
}

/* ═══ تصدير PDF ═══ */
function exportPDF(reportHTML) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('الرجاء السماح بالنوافذ المنبثقة');
    return;
  }
  const stamp = new Date().toLocaleString('ar-EG');
  const html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head>'
    + '<meta charset="UTF-8">'
    + '<title>تقرير الحاسبة | م/ محمد الأسد</title>'
    + '<style>' + getPDFCSS() + '</style>'
    + '</head><body>'
    + '<header class="rpt-header">'
    + '<h1>🔆 تقرير حاسبة الطاقة الشمسية</h1>'
    + '<p><strong>م/ محمد الأسد</strong> — الحلول الكهربائية والطاقة الذكية</p>'
    + '<p>واتساب: <span class="rpt-contact">+967 774 616 896</span> | إب، اليمن</p>'
    + '<p class="rpt-date">' + stamp + '</p>'
    + '</header>'
    + '<div class="rpt-body">' + reportHTML + '</div>'
    + '<footer class="rpt-footer">تقرير تقديري — راجع مهندسًا مؤهلًا قبل التنفيذ</footer>'
    + '</body></html>';
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); } catch(e){} w.print(); }, 400);
}

/* ═══ HTML الرئيسي ═══ */
function buildHTML() {
  return ''
    + '<h3>🔆 حاسبة الطاقة الشمسية v3</h3>'
    + '<p class="sc-intro">اختر طريقة الإدخال، ثم اضغط احسب.</p>'

    + '<fieldset>'
    + '<legend>1. طريقة الإدخال</legend>'
    + '<div class="sc-fields">'
    + '<div class="sc-field"><label>الطريقة</label><select id="sc3-method">'
    + '<option value="clamp" selected>قراءة Clamp (أمبير)</option>'
    + '<option value="daily">استهلاك يومي (kWh)</option>'
    + '</select></div>'
    + '</div>'

    /* Clamp */
    + '<div id="sc3-block-clamp" class="sc-fields">'
    + '<div class="sc-field"><label>أعلى قراءة (A)</label><input id="sc3-clampAmps" type="number" value="20"></div>'
    + '<div class="sc-field"><label>متوسط التشغيل (%)</label><input id="sc3-clampAvgPct" type="number" value="40"></div>'
    + '<div class="sc-field"><label>ساعات/يوم</label><input id="sc3-clampHours" type="number" value="10"></div>'
    + '</div>'

    /* Daily */
    + '<div id="sc3-block-daily" class="sc-fields" style="display:none">'
    + '<div class="sc-field"><label>الاستهلاك اليومي (kWh)</label><input id="sc3-dailyKWh" type="number" value="15"></div>'
    + '<div class="sc-field"><label>معامل الذروة</label><input id="sc3-peakFactor" type="number" value="3.5"></div>'
    + '</div>'
    + '</fieldset>'

    + '<fieldset>'
    + '<legend>2. إعدادات النظام</legend>'
    + '<div class="sc-fields">'
    + '<div class="sc-field"><label>ساعات الشمس (HSP)</label><input id="sc3-hsp" type="number" value="5.5"></div>'
    + '<div class="sc-field"><label>أيام الاستقلالية</label><input id="sc3-autonomy" type="number" value="1"></div>'
    + '<div class="sc-field"><label>وضع النظام (LV/HV)</label><select id="sc3-mode">'
    + '<option value="auto" selected>تلقائي</option>'
    + '<option value="lv">LV (48V)</option>'
    + '<option value="hv">HV (400V)</option>'
    + '</select></div>'
    + '<div class="sc-field"><label>عدد الأطوار</label><select id="sc3-phases">'
    + '<option value="auto" selected>تلقائي (وفق القدرة)</option>'
    + '<option value="1">أحادي (1φ — 230V)</option>'
    + '<option value="3">ثلاثي (3φ — 400V)</option>'
    + '</select></div>'
    + '<div class="sc-field"><label>قدرة اللوح (W)</label><input id="sc3-panelW" type="number" value="550"></div>'
    + '</div>'
    + '</fieldset>'

    + '<fieldset>'
    + '<legend>3. أطوال الكابلات (م)</legend>'
    + '<div class="sc-fields">'
    + '<div class="sc-field"><label>ألواح ← إنفرتر (MPPT)</label><input id="sc3-lPv" type="number" value="15"></div>'
    + '<div class="sc-field"><label>بطارية ← إنفرتر</label><input id="sc3-lBat" type="number" value="2"></div>'
    + '<div class="sc-field"><label>إنفرتر ← أحمال</label><input id="sc3-lAc" type="number" value="15"></div>'
    + '</div>'
    + '</fieldset>'

    + '<div class="sc-actions">'
    + '<button type="button" class="sc-btn sc-btn-main" id="sc3-calc">🧮 احسب</button>'
    + '<button type="button" class="sc-btn sc-btn-alt" id="sc3-pdf">📄 PDF</button>'
    + '<button type="button" class="sc-btn sc-btn-alt" id="sc3-reset">🔄 مسح</button>'
    + '</div>'

    + '<div id="sc3-report" class="sc-report"></div>';
}

/* ═══ CSS للواجهة ═══ */
function getCSS() {
  return [
    '#calculator *{box-sizing:border-box}',
    '#calculator h3{margin:0 0 8px;color:#e8d9a8;font-size:1.3rem}',
    '#calculator .sc-intro{color:#b9b8b2;font-size:.9rem;margin:0 0 16px}',
    '#calculator fieldset{background:#0e1011;border:1px solid #d7ad5530;border-radius:14px;padding:16px;margin:14px 0}',
    '#calculator legend{color:#c49b40;font-weight:700;font-size:.9rem;padding:0 8px}',
    '#calculator .sc-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}',
    '#calculator .sc-field{display:flex;flex-direction:column;gap:6px}',
    '#calculator .sc-field label{font-size:.88rem;font-weight:600;color:#e8e6df}',
    '#calculator .sc-field input,#calculator .sc-field select{width:100%;padding:11px 12px;border:1px solid #444;border-radius:9px;background:#0a0b0c;color:#fff;font-size:15px;font-weight:600}',
    '#calculator .sc-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
    '#calculator .sc-btn{padding:12px 24px;border:0;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer}',
    '#calculator .sc-btn-main{background:linear-gradient(135deg,#c49b40,#a67f2a);color:#17120a;flex:1;min-width:180px}',
    '#calculator .sc-btn-alt{background:#1a1c1d;color:#e8e6df;border:1px solid #444}',
    '#calculator .sc-card{background:linear-gradient(145deg,#181a1c,#0f1011);border:1px solid #d7ad5540;border-radius:14px;padding:16px 18px;margin:14px 0}',
    '#calculator .sc-card h4{margin:0 0 12px;color:#c49b40;font-size:1.05rem;border-bottom:1px dashed #d7ad5540;padding-bottom:8px}',
    '#calculator .sc-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dashed #ffffff0a;font-size:.92rem}',
    '#calculator .sc-row .lbl{color:#b9b8b2}',
    '#calculator .sc-row .val{color:#f0d99a;font-weight:700;text-align:left;direction:ltr;unicode-bidi:isolate}',
    '#calculator .sc-warn{background:#3a2409;border:1px solid #b45309;border-radius:12px;padding:14px;margin:14px 0;color:#fde68a}',
    '#calculator .sc-ok{background:#0e2a1c;border:1px solid #0f7a3e;border-radius:12px;padding:14px;margin:14px 0;color:#a7f3d0}',
    '#calculator ul{padding-right:20px;margin:6px 0}',
    '#calculator .sc-foot{color:#8b8a85;font-size:.8rem;text-align:center;margin-top:14px}'
  ].join('\n');
}

/* ═══ CSS للـ PDF ═══ */
function getPDFCSS() {
  return [
    'body{font-family:Tahoma,Arial;direction:rtl;color:#1a1a1a;background:#fff;padding:20px;max-width:900px;margin:auto}',
    '.rpt-header{border-bottom:3px solid #b89545;padding-bottom:14px;margin-bottom:20px;text-align:center}',
    '.rpt-header h1{color:#b89545;margin:0 0 6px}',
    '.rpt-contact{direction:ltr;unicode-bidi:isolate}',
    '.rpt-date{color:#666;font-size:12px;margin-top:6px}',
    '.sc-card{border:1px solid #ddd;border-radius:10px;padding:14px;margin:12px 0;background:#fafafa;break-inside:avoid}',
    '.sc-card h4{color:#8d681e;border-bottom:1px dashed #ddd;padding-bottom:6px}',
    '.sc-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:13px}',
    '.sc-row .val{direction:ltr;unicode-bidi:isolate;font-weight:700}',
    '.sc-warn{background:#fff8e0;border:1px solid #d4a017;padding:12px;border-radius:8px;color:#7a4a00}',
    '.sc-ok{background:#e8f8ee;border:1px solid #1a8f3e;padding:12px;border-radius:8px;color:#0a4a20}',
    '.rpt-footer{margin-top:30px;padding-top:14px;border-top:2px solid #b89545;text-align:center;color:#666;font-size:11px}'
  ].join('\n');
}

/* ═══ التصدير ═══ */

modules['ui-dom'] = { initUI, readInputs, buildHTML, getCSS, getPDFCSS, exportPDF };
})();

/* ═══ Bootstrap ═══ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function(){
    modules["ui-dom"].initUI({
      system: modules.system,
      validation: modules.validation,
      uiCore: modules["ui-core"]
    });
  });
} else {
  modules["ui-dom"].initUI({
    system: modules.system,
    validation: modules.validation,
    uiCore: modules["ui-core"]
  });
}

})();
