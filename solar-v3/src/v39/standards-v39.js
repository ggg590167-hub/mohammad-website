// ═══════════════════════════════════════════════════════════
// v3.9 — Standards معزولة (لا تعدّل الأصل)
// المصادر: Pylontech · BYD · Pytes · Deye · IEC 62109-1
// ═══════════════════════════════════════════════════════════

const BMS_DATABASE = Object.freeze({
  pylontech_us5000: { name: 'Pylontech US5000', charge_max_a: 37,  discharge_max_a: 37,  voltage: 48,   capacity_ah: 100 },
  pylontech_us3000: { name: 'Pylontech US3000', charge_max_a: 37,  discharge_max_a: 37,  voltage: 48,   capacity_ah: 74  },
  byd_lvs:          { name: 'BYD LVS',          charge_max_a: 50,  discharge_max_a: 50,  voltage: 51.2, capacity_ah: 100 },
  pytes_v5:         { name: 'Pytes V5 (50A)',   charge_max_a: 50,  discharge_max_a: 50,  voltage: 48,   capacity_ah: 100 },
  pytes_v5_100:     { name: 'Pytes V5 (100A)',  charge_max_a: 100, discharge_max_a: 100, voltage: 48,   capacity_ah: 100 },
  deye_se:          { name: 'Deye SE',          charge_max_a: 50,  discharge_max_a: 50,  voltage: 51.2, capacity_ah: 100 },
  custom:           { name: 'مخصص',             charge_max_a: null, discharge_max_a: null }
});

const SURGE_FACTORS = Object.freeze({
  ac_inverter:     { factor: 4.0, label: 'مكيف إنفرتر' },
  ac_conventional: { factor: 5.0, label: 'مكيف عادي' },
  fridge:          { factor: 3.0, label: 'ثلاجة' },
  freezer:         { factor: 3.0, label: 'فريزر' },
  pump:            { factor: 3.0, label: 'مضخة مياه' },
  washing:         { factor: 2.5, label: 'غسالة' },
  computer:        { factor: 1.5, label: 'حاسوب' },
  tv:              { factor: 1.2, label: 'تلفاز' },
  lights:          { factor: 1.0, label: 'إنارة' },
  other:           { factor: 1.0, label: 'أخرى' }
});

const INRUSH_SPEC = Object.freeze({
  inverter_peak_multiplier: 2.0,
  safety_margin: 0.90
});

const BMS_SPEC = Object.freeze({
  charge_safety: 0.90,
  discharge_safety: 0.90,
  temp_cutoff_c: 60
});

module.exports = { BMS_DATABASE, SURGE_FACTORS, INRUSH_SPEC, BMS_SPEC };
