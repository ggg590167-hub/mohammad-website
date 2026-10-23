'use strict';

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

const P = require('./physics');
const S = require('./standards');

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

/* ═══ 7.5 فحص RCD ═══ */
function validateRCD(rcdTripMA, label) {
  const issues = [];
  const RCD_VALUES = S.RCD_RATINGS_mA;

  if (rcdTripMA == null) {
    issues.push(result(true, 'RCD_NOT_SPECIFIED',
      `${label}: لم يُحدَّد — يجب تحديد قاطع تفاضلي`, SEVERITY.WARNING));
  } else if (RCD_VALUES.indexOf(rcdTripMA) < 0) {
    issues.push(result(false, 'RCD_INVALID_RATING',
      `${label}: تصنيف (${rcdTripMA}mA) غير قياسي`, SEVERITY.ERROR,
      { rcdTripMA, allowed: RCD_VALUES.slice() }));
  } else if (rcdTripMA > 30) {
    issues.push(result(true, 'RCD_NOT_FOR_PERSONS',
      `${label}: ${rcdTripMA}mA > 30mA — حماية حريق فقط · لا حماية أشخاص`, SEVERITY.WARNING));
  }
  return issues;
}

/* ═══ 7.6 فحص التأريض ═══ */
function validateEarthing(earthResistanceOhm, label) {
  const issues = [];
  const MAX_OHM = S.EARTH_RESISTANCE_MAX_OHM;

  if (earthResistanceOhm == null) {
    issues.push(result(true, 'EARTH_NOT_MEASURED',
      `${label}: لم تُقَس — قياس ميداني مطلوب (الحد ${MAX_OHM}Ω)`, SEVERITY.WARNING));
  } else if (!Number.isFinite(earthResistanceOhm) || earthResistanceOhm < 0) {
    issues.push(result(false, 'EARTH_INVALID_VALUE',
      `${label}: قيمة غير صالحة (${earthResistanceOhm})`, SEVERITY.ERROR));
  } else if (earthResistanceOhm > MAX_OHM) {
    issues.push(result(false, 'EARTH_RESISTANCE_HIGH',
      `${label}: ${earthResistanceOhm}Ω > الحد ${MAX_OHM}Ω — خطر الصعق`, SEVERITY.ERROR,
      { earthResistanceOhm, maxOhm: MAX_OHM }));
  } else if (earthResistanceOhm > MAX_OHM * 0.5) {
    issues.push(result(true, 'EARTH_NEAR_LIMIT',
      `${label}: ${earthResistanceOhm}Ω قريب من الحد ${MAX_OHM}Ω`, SEVERITY.WARNING));
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
      const autDays = bat.autonomyDays || 1;
      issues.push(...validateBattery(
        batWh,
        systemResult.load.dailyWh,
        autDays,
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

  // ═══ 8.2ب التنسيق — كابل الألواح ═══
  if (systemResult.pvCable && systemResult.pvCable.valid !== undefined) {
    issues.push(...validateCoordination(
      systemResult.iPv,
      systemResult.pvCable.breaker,
      systemResult.pvCable.cableAmpacity,
      'كابل الألواح'
    ));
  }

  // ═══ 8.2ج هبوط الجهد — كابل البطارية ═══
  if (systemResult.batteryCable && systemResult.batteryCable.vDropPercent != null) {
    issues.push(...validateVoltageDrop(
      systemResult.batteryCable.vDropPercent,
      LIMITS.VD_BATTERY,
      'كابل البطارية'
    ));
  }

  // ═══ 8.2د هبوط الجهد — كابل الألواح ═══
  if (systemResult.pvCable && systemResult.pvCable.vDropPercent != null) {
    issues.push(...validateVoltageDrop(
      systemResult.pvCable.vDropPercent,
      LIMITS.VD_PV,
      'كابل الألواح'
    ));
  }

  // ═══ 8.2هـ هبوط الجهد — كابل AC ═══
  if (systemResult.acCable && systemResult.acCable.vDropPercent != null) {
    issues.push(...validateVoltageDrop(
      systemResult.acCable.vDropPercent,
      LIMITS.VD_AC,
      'كابل AC'
    ));
  }

  // ═══ 8.5ب Voc بارد — فحص ضد حد MPPT ═══
  if (systemResult.pv && systemResult.pv.vocCold != null) {
    const mpptMaxV = (systemResult.config && systemResult.config.MPPT_MAX_VOC) || 500;
    issues.push(...validateVoc(
      systemResult.pv.vocCold,
      mpptMaxV,
      'سلسلة الألواح'
    ));
  }

  // ═══ 8.7 RCD ═══
  if (systemResult.config) {
    issues.push(...validateRCD(systemResult.config.RCD_TRIP_mA, 'RCD'));
  }

  // ═══ 8.8 التأريض ═══
  if (systemResult.config) {
    issues.push(...validateEarthing(systemResult.config.EARTH_RESISTANCE_OHM, 'تأريض'));
  }

  // ═══ 8.6 متطلبات الإنفرتر ═══
  // لم يعد هناك فحص بحد ثابت — المهندس يختار الإنفرتر من مواصفاته.
  // نُصدر تحذيراً معلوماتياً عند تعدد السلاسل لتذكير بالتحقق.
  if (systemResult.pv && systemResult.pv.nStrings >= 2 && systemResult.iPv != null) {
    issues.push(result(
      true,
      'MPPT_CHECK_REQUIRED',
      'إجمالي تيار الألواح مرتفع؛ تحقّق من توزيع السلاسل وحدود تيار مداخل MPPT في الإنفرتر المختار',
      SEVERITY.WARNING,
      {
        totalCurrent: systemResult.iPv,
        nStrings: systemResult.pv.nStrings,
        perString: systemResult.iPerString
      }
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
module.exports = {
  SEVERITY,
  LIMITS,
  validateCoordination,
  validateVoltageDrop,
  validateVoc,
  validateInverter,
  validateBattery,
  validatePV,
  validateMPPT,
  validateRCD,
  validateEarthing,
  validateSystem
};
