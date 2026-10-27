// v3.9.6 — نسخ كامل (clone مرئي · صفر وميض · بلا لمس الأصل)
(function () {
  'use strict';
  let retries = 0;

  const FIELD_LABELS = {
    'sc3-method': 'طريقة الإدخال', 'sc3-dailyKWh': 'الاستهلاك اليومي (kWh)',
    'sc3-clampAmps': 'قراءة Clamp (A)', 'sc3-clampAvgPct': 'متوسط التشغيل (%)',
    'sc3-clampHours': 'ساعات التشغيل/يوم', 'sc3-hsp': 'ساعات الشمس (HSP)',
    'sc3-autonomy': 'أيام الاستقلالية', 'sc3-panelW': 'قدرة اللوح (W)',
    'sc3-mode': 'وضع النظام (LV/HV)', 'sc3-phases': 'عدد الأطوار',
    'sc3-peakFactor': 'معامل الذروة', 'sc3-lBat': 'طول كابل البطارية (م)',
    'sc3-lPv': 'طول كابل الألواح (م)', 'sc3-lAc': 'طول كابل AC (م)'
  };

  function isVisible(el) { return el.offsetParent !== null; }
  function displayValue(el) {
    if (el.tagName === 'SELECT') {
      const o = el.options[el.selectedIndex];
      return o ? o.textContent.trim() : el.value;
    }
    return el.value;
  }

  // ✅ clone مرئي (opacity 0.01) + إزالة SVG + قراءة innerText
  function buildReportTextForCopy() {
    const original = document.getElementById('sc3-report');
    if (!original) return null;
    if (!original.innerText || original.innerText.trim().length < 10) return null;

    const clone = original.cloneNode(true);

    // clone مرئي لكن شفاف (opacity لا يمنع innerText · خارج التدفق)
    clone.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'width:' + (original.offsetWidth || 800) + 'px',
      'opacity:0.01',
      'pointer-events:none',
      'z-index:-1',
      'overflow:hidden'
    ].join(';');

    // إزالة SVG فقط (لا الحاوية)
    clone.querySelectorAll('svg').forEach(function (s) { s.remove(); });

    // إدراج + قراءة + إزالة
    document.body.appendChild(clone);
    // إدراج ': ' بين label و value (لعرض الصفوف كسطر واحد مفهوم)
    clone.querySelectorAll('.sc-row').forEach(function (row) {
      var lbl = row.querySelector('.lbl');
      if (lbl) lbl.textContent = lbl.textContent + ': ';
    });
    let text = clone.innerText;
    document.body.removeChild(clone);

    // حذف بقايا عناوين بطاقة المخطط
    const patterns = [
      /📐 مخطط النظام[^\n]*\n?/g,
      /⚡ مخطط منظومة الطاقة الشمسية[^\n]*\n?/g,
      /دليل الرموز\s*\n?/g,
      /قطب موجب \(\+\)\s*\n?/g,
      /قطب سالب \([-−]\)\s*\n?/g,
      /توصيل تسلسلي\s*\n?/g,
      /تدفق الطاقة DC\s*\n?/g,
      /مدخل نشط\s*\n?/g,
      /متاح للتوسعة\s*\n?/g,
      /م\/ محمد الأسد — إب، اليمن[^\n]*\n?/g
    ];
    patterns.forEach(function (r) { text = text.replace(r, ''); });

    text = text.replace(/\n{3,}/g, '\n\n').trim();

    if (!text) return null;
    return '📄 انظر شكل المخطط داخل الPDF\n\n' + text;
  }

  function buildText() {
    const now = (function(){var d=new Date();var p=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())})();
    let t = '═══════════════════════════════════════════════\n';
    t += '   حاسبة الأسد للطاقة الشمسية — تقرير كامل\n';
    t += '   التاريخ: ' + now + '\n';
    t += '   م/ محمد الأسد — Al-Asad Engineering\n';
    t += '═══════════════════════════════════════════════\n\n';

    t += '📥 المدخلات\n───────────────────────────────────────────────\n';
    let c = 0;
    Object.entries(FIELD_LABELS).forEach(function (e) {
      const el = document.getElementById(e[0]);
      if (!el || !isVisible(el)) return;
      const v = displayValue(el);
      if (v !== '' && v != null) { t += '  ' + e[1] + ': ' + v + '\n'; c++; }
    });
    if (c === 0) t += '  (لا مدخلات ظاهرة)\n';

    t += '\n📤 النتائج\n───────────────────────────────────────────────\n';
    const r = buildReportTextForCopy();
    t += r ? r + '\n' : '  (لم تُحسب — اضغط 🧮 احسب أولاً)\n';

    t += '\n═══════════════════════════════════════════════\n';
    t += 'الهاتف: +967774616896\nإب — الجمهورية اليمنية\n';
    return t;
  }

  function flash(btn, m) {
    const o = btn.textContent;
    btn.textContent = m; btn.disabled = true;
    setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 2000);
  }

  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { flash(btn, '✅ تم النسخ'); })
        .catch(function () { fb(text, btn); });
    } else { fb(text, btn); }
  }

  function fb(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    flash(btn, ok ? '✅ تم النسخ' : '❌ فشل');
  }

  function init() {
    const pdf = document.getElementById('sc3-pdf');
    const reset = document.getElementById('sc3-reset');
    if (!pdf || !reset) { if (++retries > 20) return; setTimeout(init, 500); return; }
    if (document.getElementById('sc3-copy')) return;

    const btn = pdf.cloneNode(true);
    btn.id = 'sc3-copy';
    btn.type = 'button';
    btn.textContent = '📋 نسخ';
    btn.title = 'نسخ المدخلات والنتائج (بلا مخطط)';
    btn.removeAttribute('onclick');
    pdf.parentNode.insertBefore(btn, reset);
    btn.addEventListener('click', function () { copyText(buildText(), btn); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
