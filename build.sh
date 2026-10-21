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

# فحص التشويش الفعلي (متين — يقبل أنماط obfuscator المختلفة)
O0X_COUNT=$(grep -o '_0x' solar-v3.js 2>/dev/null | wc -l)
SIZE=$(wc -c < solar-v3.js)
FIRST_CHAR=$(head -c 1 solar-v3.js)

echo "  📊 فحص التشويش:"
echo "    الحجم: $SIZE bytes (متوقع > 250000)"
echo "    _0x: $O0X_COUNT (متوقع > 100)"
echo "    الأول: '$FIRST_CHAR' (متوقع ليس /)"

if [ "$SIZE" -lt 250000 ]; then
  echo "  🛑 الحجم صغير — ليست مشوّشة"
  rm -f solar-v3.readable.js
  exit 1
fi

if [ "$O0X_COUNT" -lt 100 ]; then
  echo "  🛑 _0x قليل جداً — ليست مشوّشة"
  rm -f solar-v3.readable.js
  exit 1
fi

if [ "$FIRST_CHAR" = "/" ]; then
  echo "  🛑 يبدأ بـ / (تعليق مقروء) — ليست مشوّشة"
  rm -f solar-v3.readable.js
  exit 1
fi

echo "  ✅ التشويش مؤكَّد"

rm -f solar-v3.readable.js

echo
echo "════════ ✅ اكتمل البناء ════════"
echo "  📦 solar-v3.js: $SIZE_O bytes"
echo "  ⏭️  الخطوة التالية: git add solar-v3.js && git commit -m 'build: ...'"
