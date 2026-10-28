'use strict';

/* ═══════════════════════════════════════════════════════════════
   الطبقة 6 (ب): ui-dom — ربط المتصفح
   ═══════════════════════════════════════════════════════════════
   
   القواعد:
   - لا حسابات هنا
   - فقط: قراءة DOM، كتابة DOM
   - يعتمد على الطبقات 1-6a
   - لا يُختبر في Node (يحتاج متصفح)
   ═══════════════════════════════════════════════════════════════ */

function initUI(deps) {
  const Sys = deps.system;
  const Val = deps.validation;
  const UI = deps.uiCore;

  const host = document.getElementById('calculator');
  if (!host) {
    console.error('[SolarCalc v3] #calculator not found');
    return;
  }

  /* ═══ حقن CSS ═══ */
  const style = document.createElement('style');
  style.textContent = getCSS();
  document.head.appendChild(style);

  /* ═══ بناء الواجهة ═══ */
  host.innerHTML = buildHTML();

  /* ═══ ربط الأحداث ═══ */
  const btnCalc = document.getElementById('sc3-calc');
  const btnPdf = document.getElementById('sc3-pdf');
  const btnReset = document.getElementById('sc3-reset');
  const reportEl = document.getElementById('sc3-report');

  /* ═══ تبديل حقول الإدخال حسب الطريقة ═══ */ 
    /* ═══ سعة الوحدة — إظهار/إخفاء المخصص ═══ */
  const batteryUnitSel = document.getElementById('sc3-batteryUnitAh');
  if (batteryUnitSel) {
    batteryUnitSel.addEventListener('change', function() {
      const cf = document.getElementById('sc3-customAh-field');
      if (cf) cf.style.display = this.value === 'custom' ? '' : 'none';
    });
  }

const methodSelect = document.getElementById("sc3-method"); 
  if (methodSelect) { 
    methodSelect.addEventListener("change", function() { 
      const m = this.value; 
      const blockClamp = document.getElementById("sc3-block-clamp"); 
      const blockDaily = document.getElementById("sc3-block-daily"); 
      const blockTable = document.getElementById("sc3-block-table"); 
      if (blockClamp) blockClamp.style.display = (m === "clamp") ? "" : "none"; 
      if (blockDaily) blockDaily.style.display = (m === "daily") ? "" : "none"; 
      if (blockTable) blockTable.style.display = (m === "table") ? "" : "none"; 
    }); 
    /* تشغيل فوري عند التحميل لضبط العرض الحالي */ 
    methodSelect.dispatchEvent(new Event("change")); 
  } 

  if (btnCalc) btnCalc.addEventListener('click', () => {
    try {
      const inputs = readInputs();

      // ═══ 1. التحقق من صحة المدخلات ═══
      const inputCheck = Sys.validateInputs(inputs);
      if (!inputCheck.valid) {
        let html = '<div class="sc-warn"><strong>🚨 لا يمكن الحساب — مدخلات غير صالحة:</strong><ul>';
        inputCheck.errors.forEach(err => {
          html += '<li>❌ ' + err.message + '</li>';
        });
        html += '</ul>';
        if (inputCheck.warnings.length > 0) {
          html += '<strong>⚠️ تنبيهات:</strong><ul>';
          inputCheck.warnings.forEach(w => {
            html += '<li>⚠️ ' + w.message + '</li>';
          });
          html += '</ul>';
        }
        html += '<p style="margin-top:10px"><strong>الحدود المسموحة:</strong></p>';
        html += '<ul style="font-size:.85rem">';
        html += '<li>قدرة اللوح: 250 — 1500 واط</li>';
        html += '<li>ساعات الشمس: 2 — 8</li>';
        html += '<li>أيام الاستقلالية: 1 — 5</li>';
        html += '<li>قراءة Clamp: 0.1 — 2000 أمبير</li>';
        html += '<li>ساعات التشغيل: 1 — 24</li>';
        html += '<li>الاستهلاك اليومي: 0.1 — 10,000 kWh</li>';
        html += '</ul></div>';
        reportEl.innerHTML = html;
        reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // ═══ 2. الحساب ═══
      const result = Sys.analyzeSystem(inputs);
      const validation = Val.validateSystem(result);

      // ═══ 3. إضافة تحذيرات المدخلات ═══
      if (inputCheck.warnings.length > 0) {
        validation.issues = (validation.issues || []).concat(
          inputCheck.warnings.map(w => ({ severity: 'warning', code: w.code, message: w.message }))
        );
        validation.counts.warnings = validation.issues.filter(i => i.severity === 'warning').length;
      }

      const reportHTML = UI.buildReport(result, validation, {
        inputMethod: inputs.method
      });
      reportEl.innerHTML = reportHTML;
      saveInputs();
    } catch (e) {
      console.error('[SolarCalc v3] Error:', e);
      reportEl.innerHTML = '<div class="sc-warn">🚨 خطأ في الحساب: ' + e.message + '</div>';
    }
  });

  if (btnPdf) btnPdf.addEventListener('click', () => {
    if (!reportEl.innerHTML.trim()) {
      alert('احسب النظام أولًا');
      return;
    }
    exportPDF(reportEl.innerHTML);
  });

  if (btnReset) btnReset.addEventListener('click', () => {
    if (confirm('مسح المحفوظ والعودة للقيم الافتراضية؟')) {
      try { localStorage.removeItem('solarCalc3Inputs'); } catch (e) {}
      location.reload();
    }
  });

  /* ═══ استعادة القيم المحفوظة ═══ */
  restoreInputs();
}

/* ═══ قراءة المدخلات من DOM ═══ */
function readInputs() {
  const v = (id) => {
    const el = document.getElementById(id);
    return el ? (parseFloat(el.value) || 0) : 0;
  };
  const s = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const method = s('sc3-method');

  const unitSelect = s('sc3-batteryUnitAh');
  let batteryUnitAh = 100;
  if (unitSelect === 'custom') {
    batteryUnitAh = v('sc3-customBatteryAh') || 100;
  } else if (unitSelect) {
    batteryUnitAh = parseFloat(unitSelect) || 100;
  }

  const inputs = {
    method: method,
    hsp: v('sc3-hsp') || 5.5,
    autonomyDays: v('sc3-autonomy') || 1,
    modeChoice: s('sc3-mode') || 'auto',
    phasesChoice: s('sc3-phases') || 'auto',
    panelW: v('sc3-panelW') || 550,
    batteryUnitAh: batteryUnitAh,
    rModule: v('sc3-rModule') || 8,
    minTemp: v('sc3-minTemp') || 0,
    rcdType: s('sc3-rcdType') || 'AC',
    pvCableLength: v('sc3-lPv') || 15,
    batteryCableLength: v('sc3-lBat') || 2,
    acCableLength: v('sc3-lAc') || 15
  };

  if (method === 'clamp') {
    inputs.clampAmps = v('sc3-clampAmps') || 0;
    inputs.clampAvgPct = v('sc3-clampAvgPct') || 40;
    inputs.clampHours = v('sc3-clampHours') || 10;
  } else if (method === 'daily') {
    inputs.dailyKWh = v('sc3-dailyKWh') || 0;
    inputs.peakFactor = v('sc3-peakFactor') || 3.5;
  } else if (method === 'table') {
    inputs.devices = [];
    const rows = document.querySelectorAll('.sc3-device-row');
    rows.forEach(row => {
      const d = {
        watts: parseFloat(row.querySelector('.sc3-d-w').value) || 0,
        count: parseInt(row.querySelector('.sc3-d-c').value) || 1,
        hours: parseFloat(row.querySelector('.sc3-d-h').value) || 0,
        surge: parseFloat(row.querySelector('.sc3-d-s').value) || 1,
        inPeak: row.querySelector('.sc3-d-p').checked
      };
      inputs.devices.push(d);
    });
  }

  return inputs;
}

/* ═══ حفظ المدخلات ═══ */
function saveInputs() {
  try {
    const ids = [
      'sc3-method', 'sc3-hsp', 'sc3-autonomy', 'sc3-mode', 'sc3-phases', 'sc3-panelW',
      'sc3-lPv', 'sc3-lBat', 'sc3-lAc',
      'sc3-clampAmps', 'sc3-clampAvgPct', 'sc3-clampHours',
      'sc3-dailyKWh', 'sc3-peakFactor',
      'sc3-batteryUnitAh', 'sc3-customBatteryAh',
      'sc3-rModule', 'sc3-minTemp', 'sc3-rcdType'
    ];
    const data = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    localStorage.setItem('solarCalc3Inputs', JSON.stringify(data));
  } catch (e) {}
}

/* ═══ استعادة المدخلات ═══ */
function restoreInputs() {
  try {
    const raw = localStorage.getItem('solarCalc3Inputs');
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.keys(data).forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] != null) el.value = data[id];
    });
  } catch (e) {}
}

/* ═══ تصدير PDF ═══ */
function stripInlineColors(html) {
  // إزالة كل color:... (inline) — يترك getPDFCSS يتحكم بالكامل
  return String(html)
    .replace(/color\s*:\s*[^;"']+/gi, '')
    .replace(/style\s*=\s*"\s*"/g, '');
}

function exportPDF(reportHTML) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('الرجاء السماح بالنوافذ المنبثقة');
    return;
  }
  const stamp = new Date().toLocaleString('ar-EG');
  const html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head>'
    + '<meta charset="UTF-8">'
    + '<title>تقرير الحاسبة | م/ محمد الأسد</title>'
    + '<style>' + getPDFCSS() + '</style>'
    + '</head><body>'
    + '<header class="rpt-header">'
    + '<h1>🔆 تقرير حاسبة الطاقة الشمسية</h1>'
    + '<p><strong>م/ محمد الأسد</strong> — الحلول الكهربائية والطاقة الذكية</p>'
    + '<p>واتساب: <span class="rpt-contact">+967 774 616 896</span> | إب، اليمن</p>'
    + '<p class="rpt-date">' + stamp + '</p>'
    + '</header>'
    + '<div class="rpt-body">' + stripInlineColors(reportHTML) + '</div>'
    + '<footer class="rpt-footer">تقرير تقديري — راجع مهندسًا مؤهلًا قبل التنفيذ</footer>'
    + '</body></html>';
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); } catch(e){} w.print(); }, 400);
}

/* ═══ HTML الرئيسي ═══ */
function buildHTML() {
  return ''
    + '<h3>🔆 حاسبة الطاقة الشمسية v3</h3>'
    + '<p class="sc-intro">اختر طريقة الإدخال، ثم اضغط احسب.</p>'

    + '<fieldset>'
    + '<legend>1. طريقة الإدخال</legend>'
    + '<div class="sc-fields">'
    + '<div class="sc-field"><label>الطريقة</label><select id="sc3-method">'
    + '<option value="clamp" selected>قراءة Clamp (أمبير)</option>'
    + '<option value="daily">استهلاك يومي (kWh)</option>'
    + '</select></div>'
    + '</div>'

    /* Clamp */
    + '<div id="sc3-block-clamp" class="sc-fields">'
    + '<div class="sc-field"><label>أعلى قراءة (A)</label><input id="sc3-clampAmps" type="number" value="20"></div>'
    + '<div class="sc-field"><label>متوسط التشغيل (%)</label><input id="sc3-clampAvgPct" type="number" value="40"></div>'
    + '<div class="sc-field"><label>ساعات/يوم</label><input id="sc3-clampHours" type="number" value="10"></div>'
    + '</div>'

    /* Daily */
    + '<div id="sc3-block-daily" class="sc-fields" style="display:none">'
    + '<div class="sc-field"><label>الاستهلاك اليومي (kWh)</label><input id="sc3-dailyKWh" type="number" value="15"></div>'
    + '<div class="sc-field"><label>معامل الذروة</label><input id="sc3-peakFactor" type="number" value="3.5"></div>'
    + '</div>'
    + '</fieldset>'

    + '<fieldset>'
    + '<legend>2. إعدادات النظام</legend>'
    + '<div class="sc-fields">'
    + '<div class="sc-field"><label>ساعات الشمس (HSP)</label><input id="sc3-hsp" type="number" value="5.5"></div>'
    + '<div class="sc-field"><label>أيام الاستقلالية</label><input id="sc3-autonomy" type="number" value="1"></div>'
    + '<div class="sc-field"><label>وضع النظام (LV/HV)</label><select id="sc3-mode">'
    + '<option value="auto" selected>تلقائي</option>'
    + '<option value="lv">LV (48V)</option>'
    + '<option value="hv">HV (400V)</option>'
    + '</select></div>'
    + '<div class="sc-field"><label>عدد الأطوار</label><select id="sc3-phases">'
    + '<option value="auto" selected>تلقائي (وفق القدرة)</option>'
    + '<option value="1">أحادي (1φ — 230V)</option>'
    + '<option value="3">ثلاثي (3φ — 400V)</option>'
    + '</select></div>'
    + '<div class="sc-field"><label>قدرة اللوح (W)</label><input id="sc3-panelW" type="number" value="550"></div>'
    + '<div class="sc-field"><label>سعة الوحدة (Ah)</label><select id="sc3-batteryUnitAh">'
    + '<option value="74">74 Ah · 3.55 kWh</option>'
    + '<option value="100" selected>100 Ah · 4.8 kWh</option>'
    + '<option value="200">200 Ah · 9.6 kWh</option>'
    + '<option value="280">280 Ah · 13.44 kWh</option>'
    + '<option value="300">300 Ah · 14.4 kWh</option>'
    + '<option value="custom">مخصص...</option>'
    + '</select></div>'
    + '<div class="sc-field" id="sc3-customAh-field" style="display:none"><label>سعة مخصصة (Ah)</label><input id="sc3-customBatteryAh" type="number" value="100" min="50" max="500"></div>'
    + '<div class="sc-field"><label>مقاومة البطارية (mΩ)</label><input id="sc3-rModule" type="number" value="8" min="1" max="30" step="0.5"></div>'
    + '<div class="sc-field"><label>أدنى حرارة (°C)</label><input id="sc3-minTemp" type="number" value="0" min="-20" max="30" step="1"></div>'
    + '<div class="sc-field"><label>نوع RCD</label><select id="sc3-rcdType">'
    + '<option value="AC" selected>AC (قديم)</option>'
    + '<option value="A">A (حديث)</option>'
    + '<option value="B">B (شواحن)</option>'
    + '</select></div>'
    + '</div>'
    + '</fieldset>'

    + '<fieldset>'
    + '<legend>3. أطوال الكابلات (م)</legend>'
    + '<div class="sc-fields">'
    + '<div class="sc-field"><label>ألواح ← إنفرتر (MPPT)</label><input id="sc3-lPv" type="number" value="15"></div>'
    + '<div class="sc-field"><label>بطارية ← إنفرتر</label><input id="sc3-lBat" type="number" value="2"></div>'
    + '<div class="sc-field"><label>إنفرتر ← أحمال</label><input id="sc3-lAc" type="number" value="15"></div>'
    + '</div>'
    + '</fieldset>'

    + '<div class="sc-actions">'
    + '<button type="button" class="sc-btn sc-btn-main" id="sc3-calc">🧮 احسب</button>'
    + '<button type="button" class="sc-btn sc-btn-alt" id="sc3-pdf">📄 PDF</button>'
    + '<button type="button" class="sc-btn sc-btn-alt" id="sc3-reset">🔄 مسح</button>'
    + '</div>'

    + '<div id="sc3-report" class="sc-report"></div>';
}

/* ═══ CSS للواجهة ═══ */
function getCSS() {
  return [
    '#calculator *{box-sizing:border-box}',
    '#calculator h3{margin:0 0 8px;color:#e8d9a8;font-size:1.3rem}',
    '#calculator .sc-intro{color:#b9b8b2;font-size:.9rem;margin:0 0 16px}',
    '#calculator fieldset{background:#0e1011;border:1px solid #d7ad5530;border-radius:14px;padding:16px;margin:14px 0}',
    '#calculator legend{color:#c49b40;font-weight:700;font-size:.9rem;padding:0 8px}',
    '#calculator .sc-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}',
    '#calculator .sc-field{display:flex;flex-direction:column;gap:6px}',
    '#calculator .sc-field label{font-size:.88rem;font-weight:600;color:#e8e6df}',
    '#calculator .sc-field input,#calculator .sc-field select{width:100%;padding:11px 12px;border:1px solid #444;border-radius:9px;background:#0a0b0c;color:#fff;font-size:15px;font-weight:600}',
    '#calculator .sc-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
    '#calculator .sc-btn{padding:12px 24px;border:0;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer}',
    '#calculator .sc-btn-main{background:linear-gradient(135deg,#c49b40,#a67f2a);color:#17120a;flex:1;min-width:180px}',
    '#calculator .sc-btn-alt{background:#1a1c1d;color:#e8e6df;border:1px solid #444}',
    '#calculator .sc-card{background:linear-gradient(145deg,#181a1c,#0f1011);border:1px solid #d7ad5540;border-radius:14px;padding:16px 18px;margin:14px 0}',
    '#calculator .sc-card h4{margin:0 0 12px;color:#c49b40;font-size:1.05rem;border-bottom:1px dashed #d7ad5540;padding-bottom:8px}',
    '#calculator .sc-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dashed #ffffff0a;font-size:.92rem}',
    '#calculator .sc-row .lbl{color:#b9b8b2}',
    '#calculator .sc-row .val{color:#f0d99a;font-weight:700;text-align:left;direction:ltr;unicode-bidi:isolate}',
    '#calculator .sc-warn{background:#3a2409;border:1px solid #b45309;border-radius:12px;padding:14px;margin:14px 0;color:#fde68a}',
    '#calculator .sc-ok{background:#0e2a1c;border:1px solid #0f7a3e;border-radius:12px;padding:14px;margin:14px 0;color:#a7f3d0}',
    '#calculator ul{padding-right:20px;margin:6px 0}',
    '#calculator .sc-foot{color:#8b8a85;font-size:.8rem;text-align:center;margin-top:14px}'
  ].join('\n');
}

/* ═══ CSS للـ PDF ═══ */
function getPDFCSS() {
  return [
    'body{font-family:Tahoma,Arial;direction:rtl;color:#1a1a1a;background:#fff;padding:20px;max-width:900px;margin:auto}',
    '.rpt-header{border-bottom:3px solid #b89545;padding-bottom:14px;margin-bottom:20px;text-align:center}',
    '.rpt-header h1{color:#b89545;margin:0 0 6px}',
    '.rpt-contact{direction:ltr;unicode-bidi:isolate}',
    '.rpt-date{color:#666;font-size:12px;margin-top:6px}',
    '.sc-card{border:1px solid #ddd;border-radius:10px;padding:14px;margin:12px 0;background:#fafafa;break-inside:avoid}',
    '.sc-card h4{color:#8d681e;border-bottom:1px dashed #ddd;padding-bottom:6px}',
    '.sc-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:13px}',
    '.sc-row .val{direction:ltr;unicode-bidi:isolate;font-weight:700}',
    '.sc-warn{background:#fff8e0;border:1px solid #d4a017;padding:12px;border-radius:8px;color:#7a4a00}',
    '.sc-ok{background:#e8f8ee;border:1px solid #1a8f3e;padding:12px;border-radius:8px;color:#0a4a20}',
    '.rpt-footer{margin-top:30px;padding-top:14px;border-top:2px solid #b89545;text-align:center;color:#666;font-size:11px}',
    /* v3.9 — إصلاحات PDF: قوائم · small · strong · inline colors */
    'small, .sc-small{color:#555 !important;font-size:11px !important;display:block;margin:4px 0}',
    'ul, ol{padding-right:22px !important;margin:6px 0 !important;list-style:disc outside !important;display:block}',
    'li{color:#333 !important;font-size:12px !important;line-height:1.6;display:list-item !important;list-style:disc !important}',
    'strong, b{color:#1a1a1a !important;font-weight:700}',
    'em, i{color:#444 !important}',
    'p{color:#333 !important;margin:6px 0}',
    '.sc-row .lbl{color:#666 !important}',
    '.sc-row .val{color:#1a1a1a !important}',
    '.sc-card h4{color:#8d681e !important}',
    'h1,h2,h3,h4,h5{color:#1a1a1a !important}',
    /* إزالة inline color الفاتحة */
    '[style*="color:#b6b8bb"], [style*="color: #b6b8bb"]{color:#555 !important}',
    '[style*="color:#b9b8b2"], [style*="color: #b9b8b2"]{color:#555 !important}',
    '[style*="color:#e8d9a8"], [style*="color: #e8d9a8"]{color:#8d681e !important}',
    '[style*="color:#c49b40"], [style*="color: #c49b40"]{color:#8d681e !important}',
    '[style*="color:#fde68a"], [style*="color: #fde68a"]{color:#7a4a00 !important}',
    '[style*="color:#a7f3d0"], [style*="color: #a7f3d0"]{color:#0a4a20 !important}'
  ].join('\n');
}

/* ═══ التصدير ═══ */
if (typeof module !== 'undefined') {
  module.exports = { initUI, readInputs, buildHTML, getCSS, getPDFCSS, exportPDF };
}
