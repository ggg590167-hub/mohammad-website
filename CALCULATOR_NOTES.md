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

## jMax vs k_temp / k_group — توضيح مهم

### jMax (كثافة التيار) — قيد تصميمي
- **الوحدة**: A/mm² (أمبير لكل مم²)
- **المكان**: `components.js:areaFromThermal(I, jMax)`
- **الوظيفة**: يمنع الكثافة المفرطة في المقطع
- **المصدر**: قاعدة هندسية شائعة — **ليست من IEC 60364-5-52**
- **الأثر**: يُقلّص `requiredArea = I / jMax`

### k_temp / k_group — تصحيح الأمبيرية
- **الوحدة**: معامل بلا وحدة (0-1)
- **المكان**: `standards.js` (لم يُطبَّق بعد)
- **الوظيفة**: تصحيح أمبيرية الجدول حسب ظروف التركيب
- **المصدر**: **IEC 60364-5-52** (إلزامي)
- **الأثر**: `Iz_derated = Iz_table × k_temp × k_group`

### الفرق الجوهري
| البُعد | jMax | k_temp/k_group |
|--------|:----:|:--------------:|
| يقلّص | المقطع المطلوب | أمبيرية الجدول |
| المصدر | تصميمي | IEC 60364-5-52 |
| يُغني عن الآخر؟ | ❌ | ❌ |

### الحالة الحالية (قبل v3.5)
- **jMax**: مُطبَّق (يُقلّص المقطع)
- **k_temp/k_group**: **غير مُطبَّق** (يُعرض Iz_table بلا تصحيح)
- **الأمبيرية المعروضة** (`cableAmpacity`): قيمة جدولية بلا تصحيح
- **التحقق** (`I ≤ breaker ≤ cableAmpacity`): يستخدم القيمة غير المصححة

### الخطة (v3.5)
1. إضافة `K_TEMP` و `K_GROUP` إلى `standards.js`
2. حساب `Iz_derated` في `components.js`
3. تعديل `validation.js` ليستخدم `Iz_derated`
4. عرض `Iz_derated` + المعاملات في `ui-core.js`

---

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

---

## افتراضات الطاقة والكفاءات (v3.10.4 — توثيقي)

### ⚠️ تنبيه
هذا القسم توثيقي فقط. لا يُعدّل أي معادلة · لا يُغير أي نتيجة · لا يرفع إصداراً.

### 1. المعادلات الحالية (الفعلية في الكود)

**1.1 سعة البطارية المطلوبة**
E_bat_required = E_load / (η_inv × DoD)
- الملف: physics.js — batteryEnergyRequired
- لا تشمل η_discharge.

**1.2 الطاقة المتاحة (DC)**
E_usable = E_nominal × DoD
- الملف: system.js — sizeBattery
- لا تشمل η_discharge.

**1.3 الطاقة المتاحة (AC)**
E_AC = E_usable × η_inv
- الملف: ui-core.js — البطاقة 3 (سطر 103)
- لا تشمل η_discharge.

**1.4 إنتاج PV (DC Bus)**
E_pv_DC = P_pv × HSP × PR
- الملف: physics.js — pvEnergyRequired
- PR يشمل CC_EFF (مرة واحدة).
- PR لا يشمل INV_EFF.

**1.5 إنتاج PV (AC)**
E_pv_AC = E_pv_DC × η_inv
- الملف: ui-core.js

### 2. المعادلات الفيزيائية المستهدفة (غير مطبقة)

**2.1 سعة البطارية (مع η_discharge)**
E_bat_required = E_load / (η_inv × DoD × η_discharge)
- افتراض: E_load على جانب AC · E_bat_nominal على جانب DC.
- شرط: عدم احتساب η_discharge في موضع آخر.

**2.2 الطاقة المتاحة (AC، مع η_discharge)**
E_AC = E_nominal × DoD × η_discharge × η_inv

### 3. الكفاءات — الحالة

| المتغير | القيمة | الاستخدام | المصدر |
|---|---|---|---|
| INV_EFF | 0.92 | مستخدم | افتراضي — راجع ورقة الإنفرتر |
| CC_EFF | 0.97 | مستخدم (داخل PR) | افتراضي |
| SOILING | 0.94 | مستخدم (داخل PR) | NREL PVWatts |
| TEMP_DERATE | 0.85 | مستخدم (داخل PR) | IEC 61215 |
| WIRING_LOSS | 0.96 | مستخدم (داخل PR) | حسابي |
| BAT_EFF | 0.95 | غير مستخدم | غير محدد المعنى |
| η_charge | — | غير مطبقة | يحتاج ورقة بيانات |
| η_discharge | — | غير مطبقة | يحتاج ورقة بيانات |

### 4. Round-trip Efficiency — تنبيه

- η_rt = η_charge × η_discharge (رياضياً صحيح).
- η_charge = η_discharge = √η_rt = تقريب — لا نعتمده بلا مصدر.
- التقسيم الفعلي يحتاج ورقة بيانات البطارية.

### 5. مسار الطاقة (من PV إلى AC)

PV (STC) → ×SOILING ×TEMP ×WIRING ×CC_EFF → DC Bus
DC Bus → ×η_charge → Battery
Battery → ×η_discharge → DC Bus
DC Bus → ×η_inv → AC Loads

ملاحظة: η_charge · η_discharge مفقودتان من الحسابات الحالية.

### 6. ما يحتاج تحققاً قبل التطوير

- BAT_EFF: تاريخ الإضافة · الغرض · ورقة البطارية.
- η_charge · η_discharge: ورقة البطارية.
- INV_EFF: ورقة الإنفرتر.
- DoD: حدود BMS · طريقة الشركة المصنعة.
- SOILING: هل 0.94 من NREL أم افتراضي؟

### 7. الافتراضات غير الموثقة

- INV_EFF = 0.92 — افتراضي، لا مرجع محدد.
- CC_EFF = 0.97 — افتراضي.
- TEMP_DERATE = 0.85 — يستند إلى IEC 61215 (45°C).
- SOILING = 0.94 — يستند إلى NREL PVWatts.
- WIRING_LOSS = 0.96 — حسابي.
- BAT_EFF = 0.95 — غير محدد المعنى.

### 8. ما لم يُنفذ (بعد)

- η_charge · η_discharge في المعادلات.
- BAT_EFF (بلا استخدام).
- v3.10.5 (تحليل نهار/ليل).
- محاكي زمني (15-min steps).

### 9. ملاحظة استراتيجية

- المرحلة الأولى: تثبيت الحاسبة الحالية (توثيق · اختبار حالات مرجعية).
- المرحلة الثانية: محاكي التشغيل اليومي (SOC · منحنيات PV · حمل).
