'use strict';

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
module.exports = {
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
