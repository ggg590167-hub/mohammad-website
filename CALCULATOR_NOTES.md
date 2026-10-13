# حاسبة الطاقة الشمسية — v3

## الحالة
- الإصدار النشط: v3 (51 KB، 1740 سطر)
- v1 + v2: مؤرشفة في backups/archive-v1-v2-*/
- المشروع: موقع م/ محمد الأسد — إب، اليمن

## المعمارية (6 طبقات)

src/
- physics.js      → 20 معادلة فيزيائية نقية
- standards.js    → جداول IEC
- components.js   → دالة موحّدة (كابل + قاطع)
- system.js       → LV/HV + 1φ/3φ + كامل النظام
- validation.js   → فحص القيود + تحذيرات
- ui-core.js      → منطق عرض نقي
- ui-dom.js       → ربط المتصفح

## الاختبارات (165/165 نجاح)

| الملف | العدد |
|-------|:-----:|
| physics.test.js | 15 |
| standards.test.js | 26 |
| components.test.js | 22 |
| system.test.js | 41 |
| system-phases.test.js | 10 |
| validation.test.js | 25 |
| ui-core.test.js | 26 |

## المعادلات الأساسية (IEC 60364)

1. P = V × I × PF                (القدرة)
2. V_drop = 2 × L × I × ρ / A    (هبوط الجهد)
3. A = I / J_max                  (المقطع الحراري)
4. A = max(A_VD, A_thermal, minA) (القرار)
5. I_load <= Breaker <= Cable_Amp (التنسيق)
6. Voc(T) = Voc(STC) × [1 + β×ΔT] (حرارة)

## القواعد الحرجة

### الأطوار
- auto: تلقائي وفق القدرة (عتبة 5 kW)
- 1φ: يدوي - أحادي 230V
- 3φ: يدوي - ثلاثي 400V
- HV → 3φ إلزاميًا

### LV / HV
- auto: LV إذا إنفرتر < 30 kW AND يومي < 40 kWh
- lv: 48V LiFePO4
- hv: 400V Pylontech Force H3

### الكابلات والقواطع
- CABLE_SIZES: 1.5 → 240 mm² (IEC 60228)
- CABLE_AMPACITY: 22 → 514 A (IEC 60364-5-52)
- BREAKER_RATINGS: 6 → 2500 A (IEC 60898-1)
- القاطع يقود الكابل

## البناء والتحديث

cd ~/mohammad-website/solar-v3
node build-bundle.js        # إعادة توليد Bundle
node tests/*.test.js        # تشغيل الاختبارات

## المرجعيات الدولية
- IEC 60228 - مقاطع النحاس
- IEC 60364-4-43 - تنسيق القواطع
- IEC 60364-5-52 - تحمل الكابلات
- IEC 60898-1 - القواطع المنزلية
- IEC 61215 - معامل حرارة Voc

## السجل
- 2026-10-12: بناء v3 (6 طبقات، 165 اختبار)
- 2026-10-12: أرشفة v1 + v2
