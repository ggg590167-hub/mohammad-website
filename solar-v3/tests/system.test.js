'use strict';

const Sys = require('../src/system');

let passed = 0, failed = 0;

function check(label, condition, details) {
  if (condition) { passed++; console.log(`✅ ${label}`); }
  else { failed++; console.log(`❌ ${label}`); if (details) console.log(`   ${details}`); }
}

function near(actual, expected, tol, label) {
  tol = tol || 0.01;
  const ok = Math.abs(actual - expected) <= tol;
  check(label, ok, ok ? '' : `متوقع ${expected}، فعلي ${actual}`);
}

console.log('═══════════════════════════════════════════════');
console.log('  اختبار الطبقة 4: system.js');
console.log('═══════════════════════════════════════════════\n');

/* ═══════════════════════════════════════════
   اختبار 1: تحليل الحمل — Clamp
   ═══════════════════════════════════════════ */
console.log('─── 1. تحليل الحمل: Clamp (20A، 40%، 10h) ───');
let load = Sys.analyzeLoad({
  method: 'clamp',
  clampAmps: 20, clampAvgPct: 40, clampHours: 10
});
near(load.peakW, 20 * 230 * 0.9, 0.1, 'peakW = 20A × 230V × 0.9 = 4140W');
near(load.avgW, 4140 * 0.4, 0.1, 'avgW = 4140 × 0.4 = 1656W');
near(load.dailyWh, 1656 * 10, 0.5, 'dailyWh = 1656 × 10 = 16560Wh');
near(load.dailyKWh, 16.56, 0.01, 'dailyKWh = 16.56');

/* ═══════════════════════════════════════════
   اختبار 2: تحليل الحمل — Daily
   ═══════════════════════════════════════════ */
console.log('\n─── 2. تحليل الحمل: Daily (15 kWh) ───');
load = Sys.analyzeLoad({ method: 'daily', dailyKWh: 15, peakFactor: 3.5 });
near(load.dailyWh, 15000, 0.1, 'dailyWh = 15000');
near(load.avgW, 15000 / 24, 0.1, 'avgW = 625W');
near(load.peakW, (15000 / 24) * 3.5, 0.1, 'peakW = 2187.5W');

/* ═══════════════════════════════════════════
   اختبار 3: تحليل الحمل — Table
   ═══════════════════════════════════════════ */
console.log('\n─── 3. تحليل الحمل: Table (3 أجهزة) ───');
load = Sys.analyzeLoad({
  method: 'table',
  devices: [
    { watts: 12, count: 10, hours: 6, surge: 1, inPeak: true },
    { watts: 200, count: 1, hours: 24, surge: 2.5, inPeak: true },
    { watts: 1500, count: 1, hours: 8, surge: 3, inPeak: true }
  ]
});
near(load.dailyWh, 12*10*6 + 200*24 + 1500*8, 0.5, 'dailyWh = 17880Wh');
near(load.peakW, 120 + 500 + 4500, 0.5, 'peakW = 5120W');

/* ═══════════════════════════════════════════
   اختبار 4: كشف الوضع
   ═══════════════════════════════════════════ */
console.log('\n─── 4. كشف الوضع (LV/HV) ───');
check('حمل صغير → LV', Sys.detectSystemMode(10000, 5000, 'auto') === 'LV');
check('حمل كبير → HV', Sys.detectSystemMode(50000, 20000, 'auto') === 'HV');
check('يومي > 40 kWh → HV', Sys.detectSystemMode(45000, 10000, 'auto') === 'HV');
check('يدوي LV', Sys.detectSystemMode(100000, 50000, 'lv') === 'LV');
check('يدوي HV', Sys.detectSystemMode(5000, 2000, 'hv') === 'HV');

/* ═══════════════════════════════════════════
   اختبار 5: كشف الأطوار
   ═══════════════════════════════════════════ */
console.log('\n─── 5. كشف الأطوار ───');
check('HV → 3φ دائمًا', Sys.detectPhases('HV', 1000) === 3);
check('LV صغير → 1φ', Sys.detectPhases('LV', 3000) === 1);
check('LV كبير → 3φ', Sys.detectPhases('LV', 8000) === 3);

/* ═══════════════════════════════════════════
   اختبار 6: مصفوفة الألواح
   ═══════════════════════════════════════════ */
console.log('\n─── 6. مصفوفة الألواح (15 kWh, HSP=5.5) ───');
const pv = Sys.sizePVArray(15000, 5.5, 0.92, 550);
console.log(`   PR: ${pv.pr.toFixed(3)}`);
console.log(`   القدرة المطلوبة: ${pv.requiredW.toFixed(0)}W`);
console.log(`   عدد الألواح: ${pv.nPanels} × ${pv.panelW}W = ${pv.actualW}W`);
check('PR > 0.7', pv.pr > 0.7);
check('القدرة الفعلية ≥ المطلوبة', pv.actualW >= pv.requiredW);
check('عدد الألواح موجب', pv.nPanels > 0);

/* ═══════════════════════════════════════════
   اختبار 7: البطاريات LV
   ═══════════════════════════════════════════ */
console.log('\n─── 7. البطاريات LV (15 kWh/day) ───');
const batLV = Sys.sizeBattery(15000, 'LV', 1, 0.8);
console.log(`   الطاقة المطلوبة: ${batLV.requiredWh.toFixed(0)}Wh`);
console.log(`   السعة: ${batLV.requiredAh.toFixed(1)}Ah`);
console.log(`   عدد الوحدات: ${batLV.units} × ${batLV.unitAh}Ah`);
check('جهد LV = 48V', batLV.voltage === 48);
check('عدد وحدات موجب', batLV.units > 0);

/* ═══════════════════════════════════════════
   اختبار 8: البطاريات HV
   ═══════════════════════════════════════════ */
console.log('\n─── 8. البطاريات HV (60 kWh/day) ───');
const batHV = Sys.sizeBattery(60000, 'HV', 1, 0.8);
console.log(`   الطاقة المطلوبة: ${batHV.requiredKWh.toFixed(1)}kWh`);
console.log(`   عدد الأبراج: ${batHV.towers} × ${batHV.unitKWh}kWh = ${batHV.actualKWh}kWh`);
check('جهد HV = 400V', batHV.voltage === 400);
check('عدد أبراج موجب', batHV.towers > 0);

/* ═══════════════════════════════════════════
   اختبار 9: الإنفرتر LV
   ═══════════════════════════════════════════ */
console.log('\n─── 9. الإنفرتر LV (peak=4140W) ───');
const invLV = Sys.sizeInverter(4140, 15000, 'LV', 1);
console.log(`   القدرة المستمرة: ${invLV.contW.toFixed(0)}W`);
console.log(`   القياسي: ${invLV.stdW}W`);
console.log(`   عدد الإنفرترات: ${invLV.nInverters}`);
check('القدرة ≥ peak × 1.25', invLV.stdW >= 4140 * 1.25);
check('عدد إنفرترات ≥ 1', invLV.nInverters >= 1);

/* ═══════════════════════════════════════════
   اختبار 10: الإنفرتر HV
   ═══════════════════════════════════════════ */
console.log('\n─── 10. الإنفرتر HV (peak=50000W) ───');
const invHV = Sys.sizeInverter(50000, 100000, 'HV', 3);
console.log(`   القدرة المستمرة: ${invHV.contW.toFixed(0)}W`);
console.log(`   عدد الإنفرترات: ${invHV.nInverters} × ${invHV.ratedW}W = ${invHV.stdW}W`);
check('عدد إنفرترات ≥ 1', invHV.nInverters >= 1);
check('القدرة الفعلية ≥ contW', invHV.stdW >= invHV.contW);

/* ═══════════════════════════════════════════
   اختبار 11: التحليل الكامل — بيت متوسط
   ═══════════════════════════════════════════ */
console.log('\n─── 11. التحليل الكامل — بيت متوسط ───');
const result1 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 20,
  clampAvgPct: 40,
  clampHours: 10,
  hsp: 5.5,
  autonomyDays: 1
});
console.log(`   الوضع: ${result1.mode}`);
console.log(`   الأطوار: ${result1.phases}φ`);
console.log(`   الإنفرتر: ${result1.inverter.stdW}W (${result1.inverter.nInverters} × ${result1.inverter.ratedW}W)`);
console.log(`   الألواح: ${result1.pv.nPanels} × ${result1.pv.panelW}W = ${result1.pv.actualW}W`);
console.log(`   البطاريات: ${result1.battery.units || result1.battery.towers} وحدة`);
console.log(`   كابل البطارية: ${result1.batteryCable.cableSize}mm² × ${result1.batteryCable.paths} | قاطع ${result1.batteryCable.breaker}A`);
console.log(`   كابل AC: ${result1.acCable.cableSize}mm² × ${result1.acCable.paths} | قاطع ${result1.acCable.breaker}A`);
check('النتيجة كاملة', !!result1.load && !!result1.inverter && !!result1.pv);
check('كابل البطارية صحيح', result1.batteryCable.valid);
check('كابل AC صحيح', result1.acCable.valid);

/* ═══════════════════════════════════════════
   اختبار 12: التحليل الكامل — مشروع HV
   ═══════════════════════════════════════════ */
console.log('\n─── 12. التحليل الكامل — مشروع HV ───');
const result2 = Sys.analyzeSystem({
  method: 'daily',
  dailyKWh: 100,
  peakFactor: 4,
  hsp: 5.5,
  autonomyDays: 1
});
console.log(`   الوضع: ${result2.mode}`);
console.log(`   الأطوار: ${result2.phases}φ`);
console.log(`   الإنفرتر: ${result2.inverter.stdW}W (${result2.inverter.nInverters} × ${result2.inverter.ratedW}W)`);
console.log(`   الألواح: ${result2.pv.nPanels} × ${result2.pv.panelW}W = ${result2.pv.actualW}W`);
console.log(`   الأبراج: ${result2.battery.towers} × ${result2.battery.unitKWh}kWh`);
console.log(`   تيار البطارية: ${result2.iBat.toFixed(1)}A`);
console.log(`   كابل البطارية: ${result2.batteryCable.cableSize}mm² × ${result2.batteryCable.paths} | قاطع ${result2.batteryCable.breaker}A`);
console.log(`   تيار AC: ${result2.iAc.toFixed(1)}A`);
console.log(`   كابل AC: ${result2.acCable.cableSize}mm² × ${result2.acCable.paths} | قاطع ${result2.acCable.breaker}A`);
check('الوضع HV', result2.mode === 'HV');
check('الأطوار 3φ', result2.phases === 3);
check('كابل البطارية صحيح', result2.batteryCable.valid);
check('كابل AC صحيح', result2.acCable.valid);

/* ═══════════════════════════════════════════
   اختبار 13: التحليل الكامل — Clamp 200A (HV)
   ═══════════════════════════════════════════ */
console.log('\n─── 13. التحليل الكامل — Clamp 200A ───');
const result3 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 200,
  clampAvgPct: 40,
  clampHours: 10,
  hsp: 5.5,
  autonomyDays: 1
});
console.log(`   الوضع: ${result3.mode}`);
console.log(`   الإنفرتر: ${result3.inverter.stdW}W (${result3.inverter.nInverters})`);
console.log(`   تيار البطارية: ${result3.iBat.toFixed(1)}A`);
console.log(`   كابل البطارية: ${result3.batteryCable.cableSize}mm² × ${result3.batteryCable.paths}`);
console.log(`   تيار AC: ${result3.iAc.toFixed(1)}A`);
console.log(`   كابل AC: ${result3.acCable.cableSize}mm² × ${result3.acCable.paths}`);
check('الوضع HV', result3.mode === 'HV');
check('كابل البطارية صحيح', result3.batteryCable.valid);
check('كابل AC صحيح', result3.acCable.valid);

/* ═══════════════════════════════════════════
   اختبار 14: التحليل الكامل — Clamp 500A
   ═══════════════════════════════════════════ */
console.log('\n─── 14. التحليل الكامل — Clamp 500A (مشروع ضخم) ───');
const result4 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 500,
  clampAvgPct: 40,
  clampHours: 10,
  hsp: 5.5,
  autonomyDays: 1
});
console.log(`   الوضع: ${result4.mode}`);
console.log(`   الإنفرتر: ${result4.inverter.stdW}W (${result4.inverter.nInverters} × ${result4.inverter.ratedW}W)`);
console.log(`   تيار البطارية: ${result4.iBat.toFixed(1)}A`);
console.log(`   كابل البطارية: ${result4.batteryCable.cableSize}mm² × ${result4.batteryCable.paths} | قاطع ${result4.batteryCable.breaker}A`);
console.log(`   تيار AC (3φ): ${result4.iAc.toFixed(1)}A لكل طور`);
console.log(`   كابل AC: ${result4.acCable.cableSize}mm² × ${result4.acCable.paths} | قاطع ${result4.acCable.breaker}A`);
check('الوضع HV', result4.mode === 'HV');
check('كابل البطارية صحيح', result4.batteryCable.valid);
check('كابل AC صحيح', result4.acCable.valid);

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
