'use strict';

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

const P = require('./physics');
const S = require('./standards');
const C = require('./components');

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
  BETA_VOC: -0.003,           // 1/°C — معامل افتراضي (راجع ورقة اللوح)
  MIN_TEMP_C: 0               // °C — أدنى حرارة تصميمية (اليمن — افتراضي)
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

  // ═══ توزيع السلاسل ═══
  const MAX_PER_STRING = 8;
  const nStrings = Math.max(1, Math.ceil(nPanels / MAX_PER_STRING));
  const panelsPerString = Math.ceil(nPanels / nStrings);

  // ═══ Voc عند STC وعند أدنى حرارة ═══
  const panelVoc = SYSTEM_CONFIG.DEFAULT_PANEL_VOC;
  const vocSTC = panelVoc * panelsPerString;
  const vocCold = P.vocAtTemperature(vocSTC, SYSTEM_CONFIG.MIN_TEMP_C);

  return {
    requiredW: pvPowerW,
    actualW: pvActual,
    panelW: panelW,
    nPanels: nPanels,
    pr: pr,
    pvEnergyWh: pvEnergyWh,
    // جديد
    nStrings: nStrings,
    panelsPerString: panelsPerString,
    vocSTC: vocSTC,
    vocCold: vocCold
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
  const VMP = SYSTEM_CONFIG.DEFAULT_PANEL_VMP;
  const pvStringV = panelsPerStringCalc * VMP;
  const iPerString = pv.panelW / VMP;
  const iPv = iPerString * pv.nStrings;
  const pvCable = C.selectCableAndBreaker({
    current: iPv,
    legLength: pvCableLength,
    voltage: pvStringV,
    dropPercent: 2,
    minArea: 4
    // jMax غير مُمرَّر — القيد الحراري مُلغى (IEC 60364-5-52)
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
    minArea: 10,
    jMax: 3   // تحفّظ مقصود لكابل البطارية
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
    minArea: 2.5,
    jMax: 5   // معياري لكابل AC
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
    iPerString,
    pvStringV,
    pvCable,
    iBat,
    batteryCable,
    iAc,
    acCable,
    inverterRequirements: {
      recommendedPowerW: inverter.stdW,
      phases: invPhase,
      minMPPTInputs: pv.nStrings,
      maxVocCold: pv.vocCold,
      maxStringVoltage: pvStringV,
      stringCurrents: Array.from({ length: pv.nStrings }, () => iPerString),
      totalCurrent: iPv,
      note: 'متطلب تصميمي إرشادي — راجع ورقة بيانات الإنفرتر المختار'
    },
    config: SYSTEM_CONFIG
  };
}

/* ═══ التصدير ═══ */
module.exports = {
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
