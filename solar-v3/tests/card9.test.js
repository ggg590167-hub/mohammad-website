// v3.9 — 15 اختباراً معزولاً
const assert = require('assert');
const path = require('path');
const S = require(path.join(__dirname, '../src/v39/standards-v39.js'));
const P = require(path.join(__dirname, '../src/v39/physics-v39.js'));
const V = require(path.join(__dirname, '../src/v39/validation-v39.js'));

let pass = 0, fail = 0;
function T(n, f) {
  try { f(); console.log('✅ ' + n); pass++; }
  catch (e) { console.log('❌ ' + n + ': ' + e.message); fail++; }
}

T('1. Inrush 7600W', () => assert.strictEqual(
  P.calculateTotalInrush([{ peakW: 1750, surgeFactor: 4 }, { peakW: 200, surgeFactor: 3 }]), 7600));
T('2. Peak 6000W', () => assert.strictEqual(P.inverterPeakCapacity(3000), 6000));
T('3. Small PASS', () => assert.strictEqual(
  V.validateInrush(3000, [{ peakW: 500, surgeFactor: 2 }]).status, 'PASS'));
T('4. 2kW×5 ERROR', () => assert.strictEqual(
  V.validateInrush(3000, [{ peakW: 2000, surgeFactor: 5 }]).status, 'ERROR'));
T('5. 5400W=90% PASS', () => assert.strictEqual(
  V.validateInrush(3000, [{ peakW: 1350, surgeFactor: 4 }]).status, 'PASS'));
T('6. Empty=0 PASS', () => {
  const r = V.validateInrush(3000, []);
  assert.strictEqual(r.value, 0);
  assert.strictEqual(r.status, 'PASS');
});
T('7. 600W small', () => assert.strictEqual(
  V.validateInrush(3000, [{ peakW: 100, surgeFactor: 1 }, { peakW: 200, surgeFactor: 1 }, { peakW: 300, surgeFactor: 1 }]).value, 600));
T('8. 4150W PASS', () => {
  const r = V.validateInrush(3000, [{ peakW: 1200, surgeFactor: 3 }, { peakW: 150, surgeFactor: 3 }, { peakW: 100, surgeFactor: 1 }]);
  assert.strictEqual(r.value, 4150);
  assert.strictEqual(r.status, 'PASS');
});
T('9. Charge 65.3A', () => assert(Math.abs(P.calculateChargeCurrent(3300, 48, 0.95) - 65.3) < 0.5));
T('10. Discharge 67.9A', () => assert(Math.abs(P.calculateDischargeCurrent(3000, 48, 0.92) - 67.9) < 0.5));
T('11. BMS 4×37 PASS', () => assert.strictEqual(V.validateBMSDischarge(3000, 48, 37, 4).status, 'PASS'));
T('12. BMS 1×37 ERROR', () => assert.strictEqual(V.validateBMSDischarge(3000, 48, 37, 1).status, 'ERROR'));
T('13. BMS charge 7kW WARNING', () => assert.strictEqual(V.validateBMSCharge(7000, 48, 37, 4).status, 'WARNING'));
T('14. BMS DB', () => {
  assert.strictEqual(S.BMS_DATABASE.pylontech_us5000.charge_max_a, 37);
  assert.strictEqual(S.BMS_DATABASE.byd_lvs.discharge_max_a, 50);
  assert.strictEqual(S.BMS_DATABASE.pytes_v5_100.charge_max_a, 100);
});
T('15. Surge factors', () => {
  assert.strictEqual(S.SURGE_FACTORS.ac_inverter.factor, 4);
  assert.strictEqual(S.SURGE_FACTORS.ac_conventional.factor, 5);
  assert.strictEqual(S.SURGE_FACTORS.lights.factor, 1);
});

console.log(`\n📊 النتيجة: ${pass} نجح · ${fail} فشل`);
if (fail > 0) process.exit(1);
