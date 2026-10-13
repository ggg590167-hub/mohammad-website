from pathlib import Path
from datetime import datetime
import re
import shutil

p = Path("solar-calculator.js")
source = p.read_text(encoding="utf-8")
original = source

def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"توقف بأمان: موضع {label} ظهر {count} مرة بدل مرة واحدة.")
    source = source.replace(old, new, 1)

# 1) وضع إدخال الأحمال الإجمالي
replace_once(
    '<div class="sc-field"><label for="sc-override">',
    '''<div class="sc-field"><label for="sc-load-mode">طريقة إدخال الأحمال</label><select id="sc-load-mode"><option value="appliances" selected>جدول الأجهزة</option><option value="aggregate">إجمالي الحمل</option></select></div>
        <div class="sc-field"><label for="sc-total-w">إجمالي الحمل (W)</label><input id="sc-total-w" type="number" min="1" value="2000"></div>
        <div class="sc-field"><label for="sc-total-hours">ساعات الاستخدام يوميًا</label><input id="sc-total-hours" type="number" min="0.1" max="24" step="0.1" value="8"></div>
        <div class="sc-field"><label for="sc-total-surge">معامل بدء التشغيل الإجمالي</label><input id="sc-total-surge" type="number" min="1" max="10" step="0.1" value="1.5"></div>
        <div class="sc-field"><label for="sc-override">''',
    "حقول الحمل الإجمالي"
)

# 2) ثلاثة مسارات مستقلة لتقدير مقطع الكابل
cable_html = '''
    <div class="sc-card">
      <h4>حسابات مستقلة لمقاطع الكابلات النحاسية</h4>
      <p class="sc-muted">أدخل جهد وتيار وطول كل مسار وهبوط الجهد المستهدف. هذه تقديرات لهبوط الجهد فقط وليست اعتمادًا نهائيًا لمقطع الكابل.</p>
      <div class="sc-grid">
        <div class="sc-field"><label for="sc-pv-v">جهد كابل الألواح إلى MPPT (V)</label><input id="sc-pv-v" type="number" min="1" value="100"></div>
        <div class="sc-field"><label for="sc-pv-i">تيار كابل الألواح إلى MPPT (A)</label><input id="sc-pv-i" type="number" min="0.1" value="15"></div>
        <div class="sc-field"><label for="sc-pv-l">طول كابل الألواح باتجاه واحد (m)</label><input id="sc-pv-l" type="number" min="0.1" value="10"></div>
        <div class="sc-field"><label for="sc-pv-drop">هبوط الجهد المستهدف (%)</label><input id="sc-pv-drop" type="number" min="0.1" max="10" value="2"></div>
        <div class="sc-field"><label for="sc-bat-v">جهد كابل البطارية إلى العاكس (V)</label><input id="sc-bat-v" type="number" min="1" value="48"></div>
        <div class="sc-field"><label for="sc-bat-i">تيار كابل البطارية إلى العاكس (A)</label><input id="sc-bat-i" type="number" min="0.1" value="60"></div>
        <div class="sc-field"><label for="sc-bat-l">طول كابل البطارية باتجاه واحد (m)</label><input id="sc-bat-l" type="number" min="0.1" value="2"></div>
        <div class="sc-field"><label for="sc-bat-drop">هبوط الجهد المستهدف (%)</label><input id="sc-bat-drop" type="number" min="0.1" max="10" value="1"></div>
        <div class="sc-field"><label for="sc-ac-v">جهد كابل خرج AC (V)</label><input id="sc-ac-v" type="number" min="1" value="230"></div>
        <div class="sc-field"><label for="sc-ac-i">تيار كابل خرج AC (A)</label><input id="sc-ac-i" type="number" min="0.1" value="15"></div>
        <div class="sc-field"><label for="sc-ac-l">طول كابل AC باتجاه واحد (m)</label><input id="sc-ac-l" type="number" min="0.1" value="10"></div>
        <div class="sc-field"><label for="sc-ac-drop">هبوط الجهد المستهدف (%)</label><input id="sc-ac-drop" type="number" min="0.1" max="10" value="3"></div>
      </div>
    </div>
'''
pattern = r'(?m)^    <div class="sc-controls">\s*<button type="button" class="sc-btn" id="sc-calc">'
matches = list(re.finditer(pattern, source))
if len(matches) != 1:
    raise SystemExit(f"توقف بأمان: موضع إضافة الكابلات ظهر {len(matches)} مرة.")
m = matches[0]
source = source[:m.start()] + cable_html + source[m.start():]

# 3) التبديل بين جدول الأجهزة والحمل الإجمالي
replace_once(
    "    loads.querySelectorAll('.sc-load').forEach(box => {",
    """    if ($('sc-load-mode').value === 'aggregate') {
      const totalW = num('sc-total-w');
      const totalHours = num('sc-total-hours');
      const totalSurge = num('sc-total-surge');
      if (!(totalW > 0 && totalHours > 0 && totalHours <= 24 &&
            totalSurge >= 1 && totalSurge <= 10)) {
        errors.push('راجع إجمالي الحمل وساعات الاستخدام ومعامل بدء التشغيل.');
      } else {
        dailyWh = totalW * totalHours;
        runningW = totalW;
        surgeW = totalW * totalSurge;
        loadCount = 1;
      }
    } else {
    loads.querySelectorAll('.sc-load').forEach(box => {""",
    "منطق الحمل الإجمالي"
)

replace_once(
    "    });\n\n    if (!validBase || errors.length > 0 || loadCount === 0 || dailyWh <= 0) {",
    "    });\n    }\n\n    if (!validBase || errors.length > 0 || loadCount === 0 || dailyWh <= 0) {",
    "إغلاق وضع جدول الأجهزة"
)

# 4) إظهار نتائج مقاطع المسارات الثلاثة
replace_once(
    "    const cv = num('sc-cv'), ci = num('sc-ci'), cl = num('sc-cl'), drop = num('sc-drop') / 100;",
    """    const cableSpecs = [
      {label: 'مقطع كابل الألواح إلى MPPT', v: 'sc-pv-v', i: 'sc-pv-i', l: 'sc-pv-l', d: 'sc-pv-drop'},
      {label: 'مقطع كابل البطارية إلى العاكس', v: 'sc-bat-v', i: 'sc-bat-i', l: 'sc-bat-l', d: 'sc-bat-drop'},
      {label: 'مقطع كابل خرج التيار المتردد AC أحادي الطور', v: 'sc-ac-v', i: 'sc-ac-i', l: 'sc-ac-l', d: 'sc-ac-drop'}
    ];
    cableSpecs.forEach(spec => {
      const v = num(spec.v), i = num(spec.i), l = num(spec.l), d = num(spec.d) / 100;
      const a = v > 0 && i > 0 && l > 0 && d > 0 && d <= 0.1
        ? (2 * l * i * 0.0175) / (v * d) : NaN;
      cable.appendChild(line(spec.label, Number.isFinite(a)
        ? fmt(a, 2) + ' mm² نحاس بحسب هبوط الجهد فقط؛ راجع التحمل الحراري والمقطع القياسي'
        : 'أدخل قيمًا صحيحة لهذا المسار.'));
    });

    const cv = num('sc-cv'), ci = num('sc-ci'), cl = num('sc-cl'), drop = num('sc-drop') / 100;""",
    "حسابات الكابلات المستقلة"
)

if source == original:
    raise SystemExit("لم يحدث أي تغيير؛ أُلغي الحفظ.")

backup = Path("solar-calculator.js.backup-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
shutil.copy2(p, backup)
p.write_text(source, encoding="utf-8")
print("تم حفظ نسخة احتياطية:", backup)
print("تم تطبيق التعديلات؛ يجب اجتياز فحص JavaScript قبل التجربة.")
