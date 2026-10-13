'use strict';

/* ═══ Bundler بسيط — يجمع الطبقات في ملف واحد ═══ */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const layers = ['physics', 'standards', 'components', 'system', 'validation', 'diagram', 'ui-core', 'ui-dom'];

let output = '/* ═══════════════════════════════════════════════════════\n';
output += '   Solar Calculator v3 — Bundle\n';
output += '   Generated: ' + new Date().toISOString() + '\n';
output += '   Architecture: 6 layers, tested (155/155)\n';
output += '   ═══════════════════════════════════════════════════════ */\n\n';
output += '(function(){\n';
output += "'use strict';\n\n";

/* جمع كل الطبقات */
const modules = {};
layers.forEach(name => {
  const file = path.join(srcDir, name + '.js');
  if (!fs.existsSync(file)) {
    console.warn('⚠️ Missing:', file);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  modules[name] = content;
});

/* تحويل require إلى استدعاء داخلي */
function transform(src, name) {
  return src
    // إزالة use strict المكرر
    .replace(/^'use strict';\s*\n/m, '')
    // تحويل require
    .replace(/const\s+(\w+)\s*=\s*require\(['"]\.\/([\w-]+)['"]\);/g, "const $1 = modules['$2'];")
    // إزالة module.exports
    .replace(/if\s*\(typeof\s+module\s*!==\s*['"]undefined['"]\)\s*{[\s\S]*?}\s*$/m, '')
    .replace(/module\.exports\s*=\s*{[\s\S]*?};\s*$/m, '');
}

/* بنية modules كـ objects */
output += 'const modules = {};\n\n';

layers.forEach(name => {
  if (!modules[name]) return;
  output += '/* ═══ ' + name + '.js ═══ */\n';
  output += '(function(){\n';
  const body = transform(modules[name], name);
  output += body;
  // جمع التصدير
  const exportMatch = modules[name].match(/module\.exports\s*=\s*({[\s\S]*?});/);
  if (exportMatch) {
    output += '\nmodules[\'' + name + '\'] = ' + exportMatch[1].trim() + ';\n';
  }
  output += '})();\n\n';
});

/* نقطة الدخول */
output += '/* ═══ Bootstrap ═══ */\n';
output += 'if (document.readyState === "loading") {\n';
output += '  document.addEventListener("DOMContentLoaded", function(){\n';
output += '    modules["ui-dom"].initUI({\n';
output += '      system: modules.system,\n';
output += '      validation: modules.validation,\n';
output += '      uiCore: modules["ui-core"]\n';
output += '    });\n';
output += '  });\n';
output += '} else {\n';
output += '  modules["ui-dom"].initUI({\n';
output += '    system: modules.system,\n';
output += '    validation: modules.validation,\n';
output += '    uiCore: modules["ui-core"]\n';
output += '  });\n';
output += '}\n\n';

output += '})();\n';

const outPath = path.join(__dirname, '..', 'solar-v3.js');
fs.writeFileSync(outPath, output, 'utf8');
console.log('✅ Bundle created:', outPath);
console.log('📦 Size:', (output.length / 1024).toFixed(1) + ' KB');
