'use strict';

const UI = require('../src/ui-core');
const Sys = require('../src/system');
const V = require('../src/validation');

let passed = 0, failed = 0;

function check(label, condition, details) {
  if (condition) { passed++; console.log(`✅ ${label}`); }
  else { failed++; console.log(`❌ ${label}`); if (details) console.log(`   ${details}`); }
}

console.log('═══════════════════════════════════════════════');
console.log('  اختبار الطبقة 6: ui-core.js');
console.log('═══════════════════════════════════════════════\n');

/* ═══ 1. fmt ═══ */
console.log('─── 1. تنسيق الأرقام ───');
check('fmt(123.456, 2) = "123.46"', UI.fmt(123.456, 2) === '123.46');
check('fmt(1000, 0) = "1000"', UI.fmt(1000, 0) === '1000');
check('fmt(NaN) = "—"', UI.fmt(NaN) === '—');
check('fmt(Infinity) = "—"', UI.fmt(Infinity) === '—');

/* ═══ 2. fmtInt ═══ */
console.log('\n─── 2. تنسيق صحيح ───');
check('fmtInt(1234.7) = "1,235"', UI.fmtInt(1234.7) === '1,235');
check('fmtInt(0) = "0"', UI.fmtInt(0) === '0');

/* ═══ 3. row ═══ */
console.log('\n─── 3. بناء صف ───');
const r = UI.row('التيار', '100 A');
check('يحتوي على label', r.includes('التيار'));
check('يحتوي على value', r.includes('100 A'));
check('يحتوي على sc-row', r.includes('sc-row'));

/* ═══ 4. card ═══ */
console.log('\n─── 4. بناء بطاقة ───');
const c = UI.card('العنوان', [UI.row('a', 'b')]);
check('يحتوي على العنوان', c.includes('العنوان'));
check('يحتوي على sc-card', c.includes('sc-card'));

/* ═══ 5. buildReport — بيت متوسط ═══ */
console.log('\n─── 5. بناء التقرير: بيت متوسط ───');
const sys1 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 20, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1
});
const v1 = V.validateSystem(sys1);
const report1 = UI.buildReport(sys1, v1);

check('يحتوي على المعطيات', report1.includes('المعطيات الشاملة'));
check('يحتوي على الألواح', report1.includes('مصفوفة الألواح'));
check('يحتوي على البطاريات', report1.includes('بنك البطاريات'));
check('يحتوي على الإنفرتر', report1.includes('الإنفرتر'));
check('يحتوي على الكابلات', report1.includes('كابل البطارية'));
check('يحتوي على التحقق', report1.includes('التحقق النهائي'));
check('يحتوي على 8 بطاقات', (report1.match(/sc-card/g) || []).length >= 8);

/* ═══ 6. buildReport — مشروع HV ═══ */
console.log('\n─── 6. بناء التقرير: مشروع HV ───');
const sys2 = Sys.analyzeSystem({
  method: 'daily',
  dailyKWh: 100, peakFactor: 4,
  hsp: 5.5, autonomyDays: 1
});
const v2 = V.validateSystem(sys2);
const report2 = UI.buildReport(sys2, v2);

check('يحتوي على "الأبراج"', report2.includes('أبراج'));
check('الطول > 2000 حرف', report2.length > 2000, `الطول: ${report2.length}`);

/* ═══ 7. buildReport — مشروع ضخم ═══ */
console.log('\n─── 7. بناء التقرير: مشروع ضخم ───');
const sys3 = Sys.analyzeSystem({
  method: 'clamp',
  clampAmps: 500, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1
});
const v3 = V.validateSystem(sys3);
const report3 = UI.buildReport(sys3, v3);

check('يحتوي على "3φ"', report3.includes('3φ'));
check('يحتوي على "مسارات"', report3.includes('مسار'));

/* ═══ 8. لا يحتوي على نصوص غير معالجة ═══ */
console.log('\n─── 8. التحقق من النصوص ───');
check('لا يحتوي على "undefined"', !report1.includes('undefined'));
check('لا يحتوي على "NaN"', !report1.includes('NaN'));
check('لا يحتوي على "null"', !report1.includes('null'));
check('لا يحتوي على "[object"', !report1.includes('[object'));

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
