// ═══════════════════════════════════════════════════════════
// v3.9 — Physics معزولة (6 دوال نقية)
// ═══════════════════════════════════════════════════════════

const { INRUSH_SPEC } = require('./standards-v39.js');

function calculateTotalInrush(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return 0;
  return loads.reduce((s, l) => s + (Number(l.peakW) || 0) * (Number(l.surgeFactor) || 1), 0);
}

function inverterPeakCapacity(inverterStdW) {
  return (Number(inverterStdW) || 0) * INRUSH_SPEC.inverter_peak_multiplier;
}

function calculateChargeCurrent(pvActualW, vBat, etaCharge = 0.95) {
  if (!vBat || vBat <= 0) return 0;
  return (Number(pvActualW) || 0) / vBat * etaCharge;
}

function calculateDischargeCurrent(inverterStdW, vBat, etaInv = 0.92) {
  if (!vBat || vBat <= 0) return 0;
  return (Number(inverterStdW) || 0) / (vBat * etaInv);
}

function bmsTotalDischarge(bmsDischargeA, nUnits) {
  return (Number(bmsDischargeA) || 0) * (Number(nUnits) || 0);
}

function bmsTotalCharge(bmsChargeA, nUnits) {
  return (Number(bmsChargeA) || 0) * (Number(nUnits) || 0);
}

module.exports = {
  calculateTotalInrush, inverterPeakCapacity,
  calculateChargeCurrent, calculateDischargeCurrent,
  bmsTotalDischarge, bmsTotalCharge
};
