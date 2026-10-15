'use strict';
/* ═══════════════════════════════════════════════════════════════
   Diagram Layer v10 — Combined MPPT view (Active + Available)
   ═══════════════════════════════════════════════════════════════ */

function buildDiagram(s) {
  const isHV = s.mode === 'HV';

  const pvW         = s.pv.actualW || 0;
  const pvPanelW    = s.pv.panelW || 0;
  const totalPanels = s.pv.nPanels || 0;

  /* ═══ إعادة حساب توزيع الألواح داخلياً ═══ */
  const MAX_PER_STRING = 8;
  const VMP_PER_PANEL  = 42;

  const nStrings      = Math.max(1, Math.ceil(totalPanels / MAX_PER_STRING));
  const basePerString = Math.floor(totalPanels / nStrings);
  const extraPanels   = totalPanels % nStrings;

  function panelsInString(i) {
    return i < extraPanels ? basePerString + 1 : basePerString;
  }

  const panelsPerString    = Math.ceil(totalPanels / nStrings);
  function voltageInString(i) {
    return panelsInString(i) * VMP_PER_PANEL;
  }
  const stringVoltages = Array.from(
    { length: nStrings }, (_, i) => voltageInString(i)
  );
  const pvStringV          = panelsPerString * VMP_PER_PANEL;      /* مرجعي */
  const iPerString         = pvPanelW > 0 ? pvPanelW / VMP_PER_PANEL : 0;
  const iPv                = iPerString * nStrings;

  const invW       = s.inverter.stdW || 0;
  const invN       = s.inverter.nInverters || 1;
  const invRatedW  = s.inverter.ratedW || 0;
  // عدد مداخل MPPT ديناميكي — يتبع عدد السلاسل الفعلي، لا ثابتاً
  const mpptPerInv = Math.max(1, nStrings);
  const totalMPPT  = invN * mpptPerInv;
  const activeMPPT = Math.min(nStrings, totalMPPT);

  const INLINE_LIMIT = 6;

  let batWh, batV, batAh, batCount, batLabel, batUnitDesc;
  if (isHV) {
    batWh       = (s.battery.actualKWh || 0) * 1000;
    batV        = 400;
    batAh       = batWh / batV;
    batCount    = s.battery.towers || 0;
    batLabel    = 'أبراج Pylontech HV (400V)';
    batUnitDesc = '35.8 kWh/برج';
  } else {
    batWh       = s.battery.actualWh || 0;
    batV        = 48;
    batAh       = s.battery.actualAh || 0;
    batCount    = s.battery.units || 0;
    batLabel    = 'LiFePO₄ Server-Rack 48V';
    batUnitDesc = (s.battery.unitAh || 100) + 'Ah @ 48V';
  }

  const pvCable  = s.pvCable  ? s.pvCable.cableSize  : 4;
  const pvPaths  = s.pvCable  ? s.pvCable.paths      : 1;
  const batCable = s.batteryCable ? s.batteryCable.cableSize : 70;
  const batPaths = s.batteryCable ? s.batteryCable.paths     : 1;
  const acCable  = s.acCable  ? s.acCable.cableSize  : 16;
  const acPaths  = s.acCable  ? s.acCable.paths      : 1;
  const pvBrk    = s.pvCable  ? s.pvCable.breaker    : 20;
  const batBrk   = s.batteryCable ? s.batteryCable.breaker : 200;
  const acBrk    = s.acCable  ? s.acCable.breaker    : 50;

  const iAc         = s.iAc || 0;
  const peakW       = s.load.peakW || 0;
  const phasesLabel = s.phases === 3 ? '3φ 400V' : '1φ 230V';

  function n(x)  { return Math.round(x).toLocaleString('en-US'); }
  function f1(x) { return Number(x || 0).toFixed(1); }

  const W = 1600;

  const stringsToShow = Math.min(nStrings, 6);
  const stringsPerRow = Math.min(stringsToShow, 3);
  const stringBoxW = 460, stringBoxH = 175, stringGapX = 30, stringGapY = 30;
  const stringsRowWidth = stringsPerRow * (stringBoxW + stringGapX) - stringGapX;
  const stringStartX = (W - stringsRowWidth) / 2;
  const pvSecY = 70;
  const stringStartY = pvSecY + 115;
  const rowsNeeded   = Math.max(1, Math.ceil(stringsToShow / stringsPerRow));
  const stringsBottom = stringStartY + rowsNeeded * (stringBoxH + stringGapY) - stringGapY;
  const pvSecH = Math.max(400, stringsBottom - pvSecY + 70);
  const H = 2100 + (pvSecH - 400);

  let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;background:#0e1011;border-radius:12px;font-family:Tahoma,Arial,sans-serif" direction="rtl">';

  svg += '<defs>';
  svg += '<marker id="aRed"   markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#dc2626"/></marker>';
  svg += '<marker id="aBlue"  markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#3b82f6"/></marker>';
  svg += '<marker id="aGold"  markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#c49b40"/></marker>';
  svg += '<marker id="aGreen" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><polygon points="0,0 12,6 0,12" fill="#16a34a"/></marker>';
  svg += '</defs>';

  svg += '<text x="' + (W/2) + '" y="44" text-anchor="middle" fill="#f0d99a" font-size="30" font-weight="bold">⚡ مخطط منظومة الطاقة الشمسية — ' + (isHV ? 'نظام HV (400V)' : 'نظام LV (48V)') + '</text>';

  /* Legend */
  const lgX = W - 260, lgY = 65;
  svg += '<rect x="' + lgX + '" y="' + lgY + '" width="230" height="135" rx="8" fill="#131417" stroke="#c49b40" stroke-width="1" opacity="0.95"/>';
  svg += '<text x="' + (lgX + 115) + '" y="' + (lgY + 18) + '" text-anchor="middle" fill="#f0d99a" font-size="12" font-weight="bold">دليل الرموز</text>';
  svg += '<circle cx="' + (lgX + 15) + '" cy="' + (lgY + 38) + '" r="5" fill="#dc2626"/><text x="' + (lgX + 28) + '" y="' + (lgY + 42) + '" fill="#fca5a5" font-size="11" font-weight="bold">قطب موجب (+)</text>';
  svg += '<circle cx="' + (lgX + 15) + '" cy="' + (lgY + 58) + '" r="5" fill="#1e40af"/><text x="' + (lgX + 28) + '" y="' + (lgY + 62) + '" fill="#93c5fd" font-size="11" font-weight="bold">قطب سالب (−)</text>';
  svg += '<line x1="' + (lgX + 10) + '" y1="' + (lgY + 78) + '" x2="' + (lgX + 20) + '" y2="' + (lgY + 78) + '" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4,3"/><text x="' + (lgX + 28) + '" y="' + (lgY + 82) + '" fill="#fbbf24" font-size="11" font-weight="bold">توصيل تسلسلي</text>';
  svg += '<line x1="' + (lgX + 10) + '" y1="' + (lgY + 98) + '" x2="' + (lgX + 20) + '" y2="' + (lgY + 98) + '" stroke="#c49b40" stroke-width="3"/><text x="' + (lgX + 28) + '" y="' + (lgY + 102) + '" fill="#f0d99a" font-size="11" font-weight="bold">تدفق الطاقة DC</text>';
  svg += '<circle cx="' + (lgX + 15) + '" cy="' + (lgY + 118) + '" r="5" fill="#a3e635"/><text x="' + (lgX + 28) + '" y="' + (lgY + 122) + '" fill="#a3e635" font-size="11" font-weight="bold">مدخل نشط</text>';
  svg += '<circle cx="' + (lgX + 130) + '" cy="' + (lgY + 118) + '" r="5" fill="#4b5563"/><text x="' + (lgX + 143) + '" y="' + (lgY + 122) + '" fill="#9ca3af" font-size="11" font-weight="bold">متاح للتوسعة</text>';

  /* ═══ القسم 1: الألواح ═══ */
  svg += '<rect x="40" y="' + pvSecY + '" width="' + (W-80) + '" height="' + pvSecH + '" rx="16" fill="#0d1b2a" stroke="#4a7ba8" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (pvSecY + 38) + '" text-anchor="middle" fill="#93c5fd" font-size="22" font-weight="bold">☀️ مصفوفة الألواح الشمسية — Series Strings</text>';
  svg += '<text x="' + (W/2) + '" y="' + (pvSecY + 68) + '" text-anchor="middle" fill="#dbeafe" font-size="16" font-weight="bold">الإجمالي: ' + totalPanels + ' لوح × ' + pvPanelW + 'W = ' + n(pvW) + ' Wp  |  جهود السلاسل (V): ' + stringVoltages.map(f1).join(' / ') + ' V  |  تيار المصفوفة: ' + f1(iPv) + ' A</text>';

  let arrangementText;
  if (extraPanels === 0) {
    arrangementText = nStrings + ' سلسلة × ' + basePerString + ' لوح/سلسلة';
  } else {
    const dist = [];
    for (let k = 0; k < nStrings; k++) dist.push(panelsInString(k));
    arrangementText = nStrings + ' سلسلة (' + dist.join(' + ') + ' لوح)';
  }
  svg += '<text x="' + (W/2) + '" y="' + (pvSecY + 96) + '" text-anchor="middle" fill="#60a5fa" font-size="15" font-weight="bold">الترتيب: ' + arrangementText + '  (Series داخلي، Parallel بين السلاسل)</text>';

  for (let i = 0; i < stringsToShow; i++) {
    const col = i % stringsPerRow;
    const row = Math.floor(i / stringsPerRow);
    const sx = stringStartX + col * (stringBoxW + stringGapX);
    const sy = stringStartY + row * (stringBoxH + stringGapY);

    const panelsForThisString = panelsInString(i);
    const stringPowerW = panelsForThisString * pvPanelW;
    const showIndividual = panelsForThisString <= INLINE_LIMIT;

    svg += '<rect x="' + sx + '" y="' + sy + '" width="' + stringBoxW + '" height="' + stringBoxH + '" rx="8" fill="#132a45" stroke="#60a5fa" stroke-width="2.5"/>';

    if (showIndividual) {
      const panelsToDraw = panelsForThisString;
      const miniGap = 14;
      const availW = stringBoxW - 100;
      const maxMiniW = 70;
      const miniW = Math.min(maxMiniW, Math.floor((availW - (panelsToDraw-1)*miniGap) / panelsToDraw));
      const miniH = 60;
      const miniY = sy + 55;
      const miniStartX = sx + (stringBoxW - (panelsToDraw*miniW + (panelsToDraw-1)*miniGap)) / 2;

      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 30) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">S' + (i+1) + '</text>';

      for (let m = 0; m < panelsToDraw; m++) {
        const mx = miniStartX + m * (miniW + miniGap);
        svg += '<rect x="' + mx + '" y="' + miniY + '" width="' + miniW + '" height="' + miniH + '" rx="3" fill="#3b6d9c" stroke="#c7ddf5" stroke-width="1.5"/>';
        svg += '<line x1="' + mx + '" y1="' + (miniY + miniH/3) + '" x2="' + (mx + miniW) + '" y2="' + (miniY + miniH/3) + '" stroke="#1e3a5f" stroke-width="0.8"/>';
        svg += '<line x1="' + mx + '" y1="' + (miniY + 2*miniH/3) + '" x2="' + (mx + miniW) + '" y2="' + (miniY + 2*miniH/3) + '" stroke="#1e3a5f" stroke-width="0.8"/>';
        svg += '<text x="' + (mx + miniW/2) + '" y="' + (miniY + miniH/2 + 5) + '" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">' + pvPanelW + 'W</text>';

        if (m < panelsToDraw - 1) {
          const plusX  = mx + miniW;
          const minusX = mx + miniW + miniGap;
          svg += '<line x1="' + plusX + '" y1="' + (miniY + miniH/2) + '" x2="' + minusX + '" y2="' + (miniY + miniH/2) + '" stroke="#fbbf24" stroke-width="2.5"/>';
          svg += '<circle cx="' + plusX + '" cy="' + (miniY + miniH/2) + '" r="3" fill="#dc2626"/>';
          svg += '<circle cx="' + minusX + '" cy="' + (miniY + miniH/2) + '" r="3" fill="#1e40af"/>';
        }
      }

      svg += '<circle cx="' + (sx + 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#1e40af" stroke="#93c5fd" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#93c5fd" font-size="15" font-weight="bold">−</text>';
      svg += '<circle cx="' + (sx + stringBoxW - 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#dc2626" stroke="#fca5a5" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + stringBoxW - 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#fca5a5" font-size="15" font-weight="bold">+</text>';

      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + stringBoxH - 14) + '" text-anchor="middle" fill="#dbeafe" font-size="14" font-weight="bold">' + panelsForThisString + '×' + pvPanelW + 'W  ·  ' + n(stringPowerW) + 'W  ·  ' + f1(voltageInString(i)) + 'V</text>';
    } else {
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 46) + '" text-anchor="middle" fill="#ffffff" font-size="28" font-weight="bold">S' + (i+1) + '</text>';
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 82) + '" text-anchor="middle" fill="#dbeafe" font-size="18" font-weight="bold">' + panelsForThisString + ' ألواح × ' + pvPanelW + 'W</text>';
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 112) + '" text-anchor="middle" fill="#dbeafe" font-size="17" font-weight="bold">' + f1(voltageInString(i)) + ' V  ·  ' + f1(iPerString) + ' A</text>';
      svg += '<text x="' + (sx + stringBoxW/2) + '" y="' + (sy + 143) + '" text-anchor="middle" fill="#a3e635" font-size="17" font-weight="bold">' + n(stringPowerW) + ' W</text>';

      svg += '<circle cx="' + (sx + 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#1e40af" stroke="#93c5fd" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#93c5fd" font-size="15" font-weight="bold">−</text>';
      svg += '<circle cx="' + (sx + stringBoxW - 20) + '" cy="' + (sy + stringBoxH/2) + '" r="8" fill="#dc2626" stroke="#fca5a5" stroke-width="1.5"/>';
      svg += '<text x="' + (sx + stringBoxW - 20) + '" y="' + (sy + stringBoxH/2 - 12) + '" text-anchor="middle" fill="#fca5a5" font-size="15" font-weight="bold">+</text>';
    }

    const arrStartY = sy + stringBoxH + 4;
    const arrEndY   = sy + stringBoxH + 30;
    const arrX      = sx + stringBoxW / 2;
    svg += '<line x1="' + arrX + '" y1="' + arrStartY + '" x2="' + arrX + '" y2="' + arrEndY + '" stroke="#c49b40" stroke-width="3" marker-end="url(#aGold)"/>';
    svg += '<text x="' + (arrX + 12) + '" y="' + (arrEndY - 4) + '" fill="#f0d99a" font-size="13" font-weight="bold">→ MPPT #' + (i+1) + '</text>';
  }

  if (nStrings > stringsToShow) {
    svg += '<text x="' + (W/2) + '" y="' + (stringStartY + rowsNeeded * (stringBoxH + stringGapY) + 22) + '" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">+ ' + (nStrings - stringsToShow) + ' سلسلة إضافية (لم تُعرض بصريًا)</text>';
  }

  const pvSecBottom = pvSecY + pvSecH;
  svg += '<line x1="' + (W/2) + '" y1="' + (pvSecBottom + 5) + '" x2="' + (W/2) + '" y2="' + (pvSecBottom + 45) + '" stroke="#c49b40" stroke-width="4" marker-end="url(#aGold)"/>';
  svg += '<text x="' + (W/2 + 20) + '" y="' + (pvSecBottom + 30) + '" fill="#f0d99a" font-size="14" font-weight="bold">كابل DC جامع: ' + pvCable + 'mm² × ' + pvPaths + ' مسار · ' + f1(iPv) + 'A (إجمالي) · ' + f1(iPerString) + 'A/سلسلة</text>';

  /* القاطع DC + SPD */
  const pvBrkY = pvSecBottom + 50, pvBrkH = 80;
  svg += '<rect x="' + (W/2 - 300) + '" y="' + pvBrkY + '" width="600" height="' + pvBrkH + '" rx="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (pvBrkY + 32) + '" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold">🛡️ قاطع DC + مانع صواعق (SPD)</text>';
  svg += '<text x="' + (W/2) + '" y="' + (pvBrkY + 62) + '" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold">' + pvBrk + ' A / 600V DC  ·  SPD 40kA</text>';

  svg += '<line x1="' + (W/2) + '" y1="' + (pvBrkY + pvBrkH) + '" x2="' + (W/2) + '" y2="' + (pvBrkY + pvBrkH + 40) + '" stroke="#c49b40" stroke-width="4" marker-end="url(#aGold)"/>';

  /* ═══ الإنفرتر + MPPT (عرض موحد: نشط + متاح) ═══ */
  const invY = pvBrkY + pvBrkH + 50;
  const invH = 420;

  svg += '<rect x="60" y="' + invY + '" width="' + (W-120) + '" height="' + invH + '" rx="18" fill="#8d681e" stroke="#f0d99a" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (invY + 38) + '" text-anchor="middle" fill="#fff8e8" font-size="22" font-weight="bold">🎛️ الإنفرتر — ' + invN + ' وحدة × ' + n(invRatedW) + 'W</text>';

  /* رسم 4 صناديق MPPT (النشط + المتاح) */
  const mpptBoxW = 300, mpptBoxH = 175, mpptGapX = 30;
  const mpptRowWidth = totalMPPT * mpptBoxW + (totalMPPT - 1) * mpptGapX;
  const mpptStartX = (W - mpptRowWidth) / 2;
  const mpptStartY = invY + 75;

  for (let m = 0; m < totalMPPT; m++) {
    const mx = mpptStartX + m * (mpptBoxW + mpptGapX);
    const my = mpptStartY;
    const isActive = m < activeMPPT;

    const boxFill   = isActive ? '#1a1410' : '#0f1012';
    const boxStroke = isActive ? '#f0d99a' : '#4b5563';
    const titleClr  = isActive ? '#f0d99a' : '#9ca3af';
    const bodyClr   = isActive ? '#f0d99a' : '#6b7280';
    const dashStyle = isActive ? '' : ' stroke-dasharray="5,3"';

    svg += '<line x1="' + (mx + mpptBoxW/2) + '" y1="' + (my - 22) + '" x2="' + (mx + mpptBoxW/2) + '" y2="' + (my - 3) + '" stroke="' + (isActive ? '#f0d99a' : '#4b5563') + '" stroke-width="3" marker-end="url(' + (isActive ? '#aGold' : '#aGold') + ')"/>';

    svg += '<rect x="' + mx + '" y="' + my + '" width="' + mpptBoxW + '" height="' + mpptBoxH + '" rx="8" fill="' + boxFill + '" stroke="' + boxStroke + '" stroke-width="2.5"' + dashStyle + '/>';

    svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 32) + '" text-anchor="middle" fill="' + titleClr + '" font-size="17" font-weight="bold">MPPT #' + (m+1) + '</text>';

    if (isActive) {
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 66) + '" text-anchor="middle" fill="' + bodyClr + '" font-size="14" font-weight="bold">Vin: ' + f1(voltageInString(m)) + ' V  ·  Iin: ' + f1(iPerString) + ' A</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 100) + '" text-anchor="middle" fill="#a3e635" font-size="15" font-weight="bold">المصدر: السلسلة S' + (m+1) + '</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 128) + '" text-anchor="middle" fill="#dbeafe" font-size="13" font-weight="bold">' + n(panelsInString(m) * pvPanelW) + ' W</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 152) + '" text-anchor="middle" fill="#a3e635" font-size="12" font-weight="bold">● نشط</text>';

      svg += '<circle cx="' + mx + '" cy="' + (my + mpptBoxH/2) + '" r="5" fill="#dc2626"/>';
      svg += '<circle cx="' + (mx + mpptBoxW) + '" cy="' + (my + mpptBoxH/2) + '" r="5" fill="#1e40af"/>';
    } else {
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 85) + '" text-anchor="middle" fill="' + bodyClr + '" font-size="15" font-weight="bold">متاح للتوسعة</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 120) + '" text-anchor="middle" fill="#4b5563" font-size="13" font-weight="bold">○ غير مستخدم</text>';
      svg += '<text x="' + (mx + mpptBoxW/2) + '" y="' + (my + 152) + '" text-anchor="middle" fill="#6b7280" font-size="12">فارغ</text>';
    }
  }

  /* ملخص أسفل قسم الإنفرتر */
  const summaryInvY = invY + invH - 30;
  svg += '<text x="' + (W/2) + '" y="' + summaryInvY + '" text-anchor="middle" fill="#fff8e8" font-size="16" font-weight="bold">مداخل MPPT المستخدمة: ' + activeMPPT + ' / ' + totalMPPT + '  |  الخرج: ' + phasesLabel + '  |  ' + n(invW) + ' W  |  ' + f1(iAc) + ' A/طور</text>';

  /* تفريع AC / DC */
  const splitY = invY + invH + 30;
  const leftX = 380, rightX = W - 380;

  svg += '<line x1="' + (W/2) + '" y1="' + (invY + invH) + '" x2="' + (W/2) + '" y2="' + splitY + '" stroke="#c49b40" stroke-width="4"/>';
  svg += '<line x1="' + leftX + '" y1="' + splitY + '" x2="' + rightX + '" y2="' + splitY + '" stroke="#c49b40" stroke-width="4"/>';
  svg += '<line x1="' + leftX + '" y1="' + splitY + '" x2="' + leftX + '" y2="' + (splitY + 45) + '" stroke="#3b82f6" stroke-width="4" marker-end="url(#aBlue)"/>';
  svg += '<text x="' + (leftX + 18) + '" y="' + (splitY + 28) + '" fill="#bfdbfe" font-size="14" font-weight="bold">AC: ' + acCable + 'mm² × ' + acPaths + '</text>';
  svg += '<line x1="' + rightX + '" y1="' + splitY + '" x2="' + rightX + '" y2="' + (splitY + 45) + '" stroke="#16a34a" stroke-width="4" marker-end="url(#aGreen)"/>';
  svg += '<text x="' + (rightX + 18) + '" y="' + (splitY + 28) + '" fill="#a7f3d0" font-size="14" font-weight="bold">DC: ' + batCable + 'mm² × ' + batPaths + '</text>';

  /* القواطع */
  const brkY = splitY + 55, brkH = 85, brkW = 460;

  svg += '<rect x="' + (leftX - brkW/2) + '" y="' + brkY + '" width="' + brkW + '" height="' + brkH + '" rx="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="3"/>';
  svg += '<text x="' + leftX + '" y="' + (brkY + 34) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">🛡️ قاطع AC</text>';
  svg += '<text x="' + leftX + '" y="' + (brkY + 65) + '" text-anchor="middle" fill="#ffffff" font-size="19" font-weight="bold">' + acBrk + ' A</text>';

  svg += '<rect x="' + (rightX - brkW/2) + '" y="' + brkY + '" width="' + brkW + '" height="' + brkH + '" rx="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="3"/>';
  svg += '<text x="' + rightX + '" y="' + (brkY + 34) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">🛡️ قاطع DC للبطاريات</text>';
  svg += '<text x="' + rightX + '" y="' + (brkY + 65) + '" text-anchor="middle" fill="#ffffff" font-size="19" font-weight="bold">' + batBrk + ' A / ' + batV + 'V DC</text>';

  svg += '<line x1="' + leftX + '" y1="' + (brkY + brkH) + '" x2="' + leftX + '" y2="' + (brkY + brkH + 45) + '" stroke="#3b82f6" stroke-width="4" marker-end="url(#aBlue)"/>';
  svg += '<line x1="' + rightX + '" y1="' + (brkY + brkH) + '" x2="' + rightX + '" y2="' + (brkY + brkH + 45) + '" stroke="#16a34a" stroke-width="4" marker-end="url(#aGreen)"/>';

  /* الأحمال + Busbar */
  const rowY = brkY + brkH + 55;
  const loadsW = 620, loadsH = 230;
  const loadsX = leftX - loadsW/2;
  const busbarW = 620, busbarH = 105;
  const busbarX = rightX - busbarW/2;

  svg += '<rect x="' + loadsX + '" y="' + rowY + '" width="' + loadsW + '" height="' + loadsH + '" rx="18" fill="#1e3a8a" stroke="#93c5fd" stroke-width="3"/>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 65) + '" text-anchor="middle" fill="#ffffff" font-size="52">🏠</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 118) + '" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="bold">الأحمال المنزلية</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 150) + '" text-anchor="middle" fill="#dbeafe" font-size="16" font-weight="bold">' + phasesLabel + '</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 178) + '" text-anchor="middle" fill="#dbeafe" font-size="15" font-weight="bold">أعلى حمل: ' + n(peakW) + ' W</text>';
  svg += '<text x="' + leftX + '" y="' + (rowY + 204) + '" text-anchor="middle" fill="#dbeafe" font-size="15" font-weight="bold">التيار: ' + f1(iAc) + ' A</text>';

  svg += '<rect x="' + busbarX + '" y="' + rowY + '" width="' + busbarW + '" height="' + busbarH + '" rx="12" fill="#1a1410" stroke="#f0d99a" stroke-width="3"/>';
  svg += '<text x="' + rightX + '" y="' + (rowY + 38) + '" text-anchor="middle" fill="#f0d99a" font-size="20" font-weight="bold">⚡ BUSBAR — ناقل التوزيع ' + batV + 'V</text>';
  svg += '<text x="' + rightX + '" y="' + (rowY + 66) + '" text-anchor="middle" fill="#f0d99a" font-size="14" font-weight="bold">سعة التوزيع: ' + f1(batAh) + ' Ah · ' + batCount + ' وحدة متوازية</text>';

  const busbarTermY = rowY + busbarH;

  /* بنك البطاريات */
  const batSecY = rowY + Math.max(loadsH, busbarH) + 90;
  const batSecH = 380;

  const collectorY = batSecY - 35;
  svg += '<line x1="220" y1="' + collectorY + '" x2="' + (W-220) + '" y2="' + collectorY + '" stroke="#fbbf24" stroke-width="2" stroke-dasharray="6,3" opacity="0.8"/>';
  svg += '<line x1="' + rightX + '" y1="' + (busbarTermY + 5) + '" x2="' + rightX + '" y2="' + collectorY + '" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="6,3"/>';
  svg += '<circle cx="' + rightX + '" cy="' + busbarTermY + '" r="6" fill="#c49b40" stroke="#f0d99a" stroke-width="1.5"/>';

  svg += '<rect x="100" y="' + batSecY + '" width="' + (W-200) + '" height="' + batSecH + '" rx="18" fill="#065f46" stroke="#a7f3d0" stroke-width="3"/>';
  svg += '<text x="' + (W/2) + '" y="' + (batSecY + 42) + '" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="bold">🔋 بنك البطاريات — ' + batLabel + '</text>';
  svg += '<text x="' + (W/2) + '" y="' + (batSecY + 72) + '" text-anchor="middle" fill="#d1fae5" font-size="15" font-weight="bold">' + batCount + ' وحدة × ' + batUnitDesc + '  |  الإجمالي: ' + batV + 'V · ' + f1(batAh) + ' Ah · ' + f1(batWh/1000) + ' kWh</text>';

  const batBoxesToShow = Math.min(batCount, 8);
  const batBoxW = batBoxesToShow <= 6 ? 200 : 165;
  const batBoxH = 140, batGapX = 20;
  const batRowWidth = batBoxesToShow * batBoxW + (batBoxesToShow - 1) * batGapX;
  const batStartX = (W - batRowWidth) / 2;
  const batStartY = batSecY + 100;

  for (let b = 0; b < batBoxesToShow; b++) {
    const bx = batStartX + b * (batBoxW + batGapX);
    const by = batStartY;

    svg += '<rect x="' + bx + '" y="' + by + '" width="' + batBoxW + '" height="' + batBoxH + '" rx="6" fill="#064e3b" stroke="#a7f3d0" stroke-width="2.5"/>';

    svg += '<rect x="' + (bx + batBoxW/2 - 9) + '" y="' + (by - 7) + '" width="18" height="7" fill="#dc2626" rx="1"/>';
    svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by - 14) + '" text-anchor="middle" fill="#fca5a5" font-size="14" font-weight="bold">+</text>';

    svg += '<rect x="' + (bx + batBoxW/2 - 9) + '" y="' + (by + batBoxH) + '" width="18" height="7" fill="#1e40af" rx="1"/>';
    svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + batBoxH + 22) + '" text-anchor="middle" fill="#93c5fd" font-size="14" font-weight="bold">−</text>';

    svg += '<rect x="' + (bx + 15) + '" y="' + (by + batBoxH - 30) + '" width="' + (batBoxW - 30) + '" height="14" fill="#16a34a" rx="2"/>';

    svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 32) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="bold">' + (isHV ? 'T' + (b+1) : 'B' + (b+1)) + '</text>';

    if (isHV) {
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 58) + '" text-anchor="middle" fill="#d1fae5" font-size="12" font-weight="bold">400V</text>';
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 78) + '" text-anchor="middle" fill="#d1fae5" font-size="11" font-weight="bold">35.8 kWh</text>';
    } else {
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 58) + '" text-anchor="middle" fill="#d1fae5" font-size="12" font-weight="bold">48V · ' + (s.battery.unitAh || 100) + 'Ah</text>';
      svg += '<text x="' + (bx + batBoxW/2) + '" y="' + (by + 78) + '" text-anchor="middle" fill="#d1fae5" font-size="11" font-weight="bold">LiFePO₄</text>';
    }

    const bcX = bx + batBoxW/2;
    svg += '<line x1="' + bcX + '" y1="' + (by - 7) + '" x2="' + bcX + '" y2="' + collectorY + '" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.8"/>';
  }

  if (batCount > batBoxesToShow) {
    svg += '<text x="' + (W/2) + '" y="' + (batStartY + batBoxH + 60) + '" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">+ ' + (batCount - batBoxesToShow) + ' وحدة إضافية (لم تُعرض بصريًا)</text>';
  }

  const summaryY = batSecY + batSecH + 40;
  svg += '<text x="' + (W/2) + '" y="' + summaryY + '" text-anchor="middle" fill="#f0d99a" font-size="17" font-weight="bold">🔋 إجمالي السعة: ' + n(batWh) + ' Wh (' + f1(batWh/1000) + ' kWh)  |  أيام استقلالية: ' + (s.battery.autonomyDays || 1) + '</text>';

  svg += '<line x1="40" y1="' + (H-60) + '" x2="' + (W-40) + '" y2="' + (H-60) + '" stroke="#c49b40" stroke-width="1" opacity="0.4"/>';
  svg += '<text x="' + (W/2) + '" y="' + (H-30) + '" text-anchor="middle" fill="#a3a39e" font-size="15" font-weight="bold">م/ محمد الأسد — إب، اليمن  |  +967 774 616 896</text>';

  svg += '</svg>';
  return svg;
}

module.exports = { buildDiagram };
