// ═══════════════════════════════════════════════════════════
// v3.9 — Validation معزولة (الفحوصات 15، 16، 17)
// ═══════════════════════════════════════════════════════════

const { INRUSH_SPEC, BMS_SPEC } = require('./standards-v39.js');
const P = require('./physics-v39.js');

function validateInrush(inverterStdW, loads) {
  const total = P.calculateTotalInrush(loads);
  const peak  = P.inverterPeakCapacity(inverterStdW);
  const limit = peak * INRUSH_SPEC.safety_margin;
  const pass  = total <= limit;
  let rec = null;
  if (!pass) {
    const needed = Math.ceil(total / INRUSH_SPEC.safety_margin / 2 / 100) * 100;
    rec = `ارفع الإنفرتر إلى ${needed}W على الأقل، أو أزل أكبر حمل بدءاً`;
  }
  return {
    id: 15, name: 'Inrush (تيار البدء)',
    status: pass ? 'PASS' : 'ERROR',
    severity: pass ? 'INFO' : 'CRITICAL',
    value: Number(total.toFixed(0)),
    limit: Number(limit.toFixed(0)),
    peakCapacity: Number(peak.toFixed(0)),
    message: pass
      ? `✅ Inrush ${total.toFixed(0)}W ≤ ${limit.toFixed(0)}W`
      : `🚨 Inrush ${total.toFixed(0)}W > ${limit.toFixed(0)}W`,
    recommendation: rec
  };
}

function validateBMSDischarge(inverterStdW, vBat, bmsDischargeA, nUnits) {
  const i     = P.calculateDischargeCurrent(inverterStdW, vBat);
  const total = P.bmsTotalDischarge(bmsDischargeA, nUnits);
  const limit = total * BMS_SPEC.discharge_safety;
  const pass  = i <= limit;
  let rec = null;
  if (!pass) {
    const needed = Math.ceil(i / (bmsDischargeA * BMS_SPEC.discharge_safety));
    rec = `زد الوحدات إلى ${needed} على الأقل`;
  }
  return {
    id: 16, name: 'BMS تفريغ',
    status: pass ? 'PASS' : 'ERROR',
    severity: pass ? 'INFO' : 'CRITICAL',
    value: Number(i.toFixed(1)),
    limit: Number(limit.toFixed(1)),
    bmsTotal: Number(total.toFixed(1)),
    message: pass
      ? `✅ تفريغ ${i.toFixed(1)}A ≤ ${limit.toFixed(1)}A`
      : `🚨 تفريغ ${i.toFixed(1)}A > ${limit.toFixed(1)}A`,
    recommendation: rec
  };
}

function validateBMSCharge(pvActualW, vBat, bmsChargeA, nUnits) {
  const i     = P.calculateChargeCurrent(pvActualW, vBat);
  const total = P.bmsTotalCharge(bmsChargeA, nUnits);
  const limit = total * BMS_SPEC.charge_safety;
  const pass  = i <= limit;
  return {
    id: 17, name: 'BMS شحن',
    status: pass ? 'PASS' : 'WARNING',
    severity: pass ? 'INFO' : 'WARNING',
    value: Number(i.toFixed(1)),
    limit: Number(limit.toFixed(1)),
    bmsTotal: Number(total.toFixed(1)),
    message: pass
      ? `✅ شحن ${i.toFixed(1)}A ≤ ${limit.toFixed(1)}A`
      : `⚠️ شحن ${i.toFixed(1)}A > ${limit.toFixed(1)}A — MPPT سيحدّ`,
    recommendation: pass ? null : `اضبط MPPT على ${limit.toFixed(0)}A`
  };
}

module.exports = { validateInrush, validateBMSDischarge, validateBMSCharge };
