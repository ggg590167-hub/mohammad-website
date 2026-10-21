#!/data/data/com.termux/files/usr/bin/bash
# build.sh — بناء الحزمة + اختبار + تشويش
# الاستخدام: ./build.sh

set -euo pipefail
cd "$(dirname "$0")"

echo "════════ 1) فحص المصادر ════════"
for f in solar-v3/src/*.js; do
  node --check "$f" || { echo "🛑 خطأ نحوي: $f"; exit 1; }
done
echo "  ✅ كل المصادر سليمة"

echo
echo "════════ 2) اختبارات المصادر ════════"
PASS=0; FAIL=0
for f in solar-v3/tests/*.test.js; do
  if node "$f" > /dev/null 2>&1; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
    echo "  ❌ $(basename $f)"
  fi
done
echo "  ✅ $PASS نجحت · $FAIL فشلت"
[ "$FAIL" = "0" ] || { echo "🛑 اختبارات فاشلة — توقف"; exit 1; }

echo
echo "════════ 3) بناء الحزمة المقروءة ════════"
node solar-v3/build-bundle.js
mv solar-v3.js solar-v3.readable.js
SIZE_R=$(wc -c < solar-v3.readable.js)
echo "  ✅ مقروء: $SIZE_R bytes"

echo
echo "════════ 4) التشويش ════════"
javascript-obfuscator solar-v3.readable.js \
  --output solar-v3.js \
  --compact true \
  --control-flow-flattening true \
  --dead-code-injection true \
  --string-array true \
  --string-array-rotate true \
  --string-array-shuffle true \
  --identifier-names-generator hexadecimal \
  --self-defending true > /dev/null

SIZE_O=$(wc -c < solar-v3.js)
echo "  ✅ مشوّش: $SIZE_O bytes"

echo
echo "════════ 5) فحص نهائي ════════"
node --check solar-v3.js
echo "  ✅ الحزمة سليمة نحوياً"

rm -f solar-v3.readable.js

echo
echo "════════ ✅ اكتمل البناء ════════"
echo "  📦 solar-v3.js: $SIZE_O bytes"
echo "  ⏭️  الخطوة التالية: git add solar-v3.js && git commit -m 'build: ...'"
