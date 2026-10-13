'use strict';

const Sys = require('../src/system');

let passed = 0, failed = 0;

function check(label, condition, details) {
  if (condition) { passed++; console.log(`✅ ${label}`); }
  else { failed++; console.log(`❌ ${label}`); if (details) console.log(`   ${details}`); }
}

console.log('═══════════════════════════════════════════════');
console.log('  اختبار إضافي: الأطوار (1φ/3φ)');
console.log('═══════════════════════════════════════════════\n');

/* ═══ 1. auto — منزل 8 kW ═══ */
console.log('─── 1. auto: 8 kW → 3φ ───');
let r = Sys.analyzeSystem({
  method: 'clamp', clampAmps: 42, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1
});
console.log(`   الإنفرتر: ${r.inverter.stdW}W`);
console.log(`   الأطوار: ${r.phases}φ`);
console.log(`   الوضع: ${r.phasesChoice}`);
check('8 kW → 3φ', r.phases === 3);

/* ═══ 2. auto — منزل 3 kW ═══ */
console.log('\n─── 2. auto: 3 kW → 1φ ───');
r = Sys.analyzeSystem({
  method: 'daily', dailyKWh: 15, peakFactor: 3, hsp: 5.5, autonomyDays: 1
});
console.log(`   الإنفرتر: ${r.inverter.stdW}W`);
console.log(`   الأطوار: ${r.phases}φ`);
check('3 kW → 1φ', r.phases === 1);

/* ═══ 3. يدوي 1φ — حتى 8 kW ═══ */
console.log('\n─── 3. يدوي 1φ: 8 kW ───');
r = Sys.analyzeSystem({
  method: 'clamp', clampAmps: 42, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1,
  phasesChoice: 1
});
console.log(`   الأطوار: ${r.phases}φ`);
console.log(`   الوضع: ${r.phasesChoice}`);
console.log(`   تحذيرات: ${r.phaseWarnings.length}`);
r.phaseWarnings.forEach(w => console.log(`   [${w.severity}] ${w.message}`));
check('يدوي 1φ = 1φ', r.phases === 1);
check('تحذير عند 1φ بقدرة عالية', r.phaseWarnings.some(w => w.code === 'PHASE_1P_HIGH_POWER'));

/* ═══ 4. يدوي 3φ — حتى 2 kW ═══ */
console.log('\n─── 4. يدوي 3φ: 2 kW (مبالغة) ───');
r = Sys.analyzeSystem({
  method: 'daily', dailyKWh: 10, peakFactor: 3, hsp: 5.5, autonomyDays: 1,
  phasesChoice: 3
});
console.log(`   الأطوار: ${r.phases}φ`);
console.log(`   تحذيرات: ${r.phaseWarnings.length}`);
r.phaseWarnings.forEach(w => console.log(`   [${w.severity}] ${w.message}`));
check('يدوي 3φ = 3φ', r.phases === 3);
check('تحذير عند 3φ بقدرة منخفضة', r.phaseWarnings.some(w => w.code === 'PHASE_3P_LOW_POWER'));

/* ═══ 5. HV — 3φ إلزاميًا (لا اختيار) ═══ */
console.log('\n─── 5. HV → 3φ إلزاميًا ───');
r = Sys.analyzeSystem({
  method: 'daily', dailyKWh: 100, peakFactor: 4, hsp: 5.5, autonomyDays: 1,
  phasesChoice: 1  // نحاول فرض 1φ — يجب أن يُتجاهل
});
console.log(`   الوضع: ${r.mode}`);
console.log(`   الأطوار: ${r.phases}φ (يجب أن يكون 3)`);
check('HV = 3φ دائمًا', r.phases === 3);
check('لا تحذيرات في HV', r.phaseWarnings.length === 0);

/* ═══ 6. مقارنة 1φ vs 3φ — التيار ═══ */
console.log('\n─── 6. مقارنة التيار (1φ vs 3φ) — 8 kW ───');
const base = {
  method: 'clamp', clampAmps: 42, clampAvgPct: 40, clampHours: 10,
  hsp: 5.5, autonomyDays: 1
};
const r1 = Sys.analyzeSystem({ ...base, phasesChoice: 1 });
const r3 = Sys.analyzeSystem({ ...base, phasesChoice: 3 });
console.log(`   1φ: iAc = ${r1.iAc.toFixed(1)} A`);
console.log(`   3φ: iAc = ${r3.iAc.toFixed(1)} A لكل طور`);
console.log(`   النسبة: ${(r1.iAc / r3.iAc).toFixed(3)} (متوقع ≈ 3)`);
check('1φ تيار > 3φ', r1.iAc > r3.iAc);
check('الفرق ≈ 3 (400V = √3 × 230V)', Math.abs(r1.iAc / r3.iAc - 3) < 0.1);

console.log('\n═══════════════════════════════════════════════');
console.log(`  النتيجة: ${passed} نجح / ${failed} فشل`);
console.log('═══════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
