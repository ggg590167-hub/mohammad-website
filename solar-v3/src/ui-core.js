'use strict';

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
    const D = require('./diagram');
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

  /* ═══ بطاقة 4.b: متطلبات الإنفرتر ═══ */
  if (s.inverterRequirements) {
    const r = s.inverterRequirements;
    const c4b = [];
    c4b.push(row('قدرة الإنفرتر القياسية', fmtInt(r.recommendedPowerW) + ' W'));
    c4b.push(row('الأطوار', r.phases === 3 ? '3φ (400V)' : '1φ (230V)'));
    c4b.push(row('عدد مداخل MPPT', '≥ ' + r.minMPPTInputs));
    var minTC = (s.config && s.config.MIN_TEMP_C != null) ? s.config.MIN_TEMP_C : 0;
    var betaVoc = (s.config && s.config.BETA_VOC != null) ? s.config.BETA_VOC : -0.003;
    c4b.push(row('أقصى Voc بارد (' + minTC + '°C)', fmt(r.maxVocCold, 0) + ' V'));
    c4b.push('<div class="sc-note">Voc(' + minTC + '°C) = Voc_STC × [1 + ' + betaVoc + ' × (' + minTC + ' - 25)] · معامل افتراضي — راجع ورقة بيانات اللوح</div>');
    c4b.push(row('جهد السلسلة (Vmp)', fmt(r.maxStringVoltage, 0) + ' V'));
    c4b.push(row('تيار السلسلة', fmt(r.stringCurrents[0], 1) + ' A'));
    c4b.push(row('إجمالي التيار', fmt(r.totalCurrent, 1) + ' A'));
    if (r.note) c4b.push('<div class="sc-note">' + r.note + '</div>');
    cards.push(card('⚡ 4.b متطلبات الإنفرتر', c4b));
  }

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
    var iPerStringCalc = (s.iPerString != null)
      ? s.iPerString
      : (s.pv.nStrings > 0 ? s.iPv / s.pv.nStrings : 0);
    c6b.push(row('تيار المصفوفة (إجمالي)', fmt(s.iPv, 1) + ' A'));
    if (s.pv.nStrings > 1) {
      c6b.push(row('تيار السلسلة الواحدة', fmt(iPerStringCalc, 1) + ' A'));
    }
    c6b.push(row('جهد السلسلة (مرجعي)', fmt(s.pvStringV || 0, 0) + ' V'));
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
    c8.push('<div class="sc-ok"><strong>✅ اجتاز 7/7 فحوصات منفذة</strong>' +
      '<br>الأخطاء: 0 | التحذيرات: ' + v.counts.warnings +
      '<br><small style="color:#a8a9a7;font-weight:400">⚠️ لم تُفحص: هبوط الجهد · تنسيق كابل الألواح · التخفيض الحراري (k_temp/k_group) · Isc · RCD · تأريض · Inrush · BMS</small></div>');
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
module.exports = {
  fmt,
  fmtInt,
  row,
  card,
  buildReport,
  methodLabel
};
