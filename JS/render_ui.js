// ============================================================
// render_ui.js — весь игровой UI
// ============================================================

// ============================================================
// ХОТБАР
// ============================================================
function renderHotbar(){
  const T = getTheme();
  const ss = 48, gap = 6;
  const totalW = HOTBAR_SIZE*ss + (HOTBAR_SIZE-1)*gap;
  const sx = (canvas.width - totalW)/2;
  const sy = canvas.height - ss - 14;

  for(let i=0;i<HOTBAR_SIZE;i++){
    const x = sx + i*(ss+gap);
    const active = i === state.selectedHotbarSlot;
    ctx.fillStyle = active ? T.hotbarSlotActiveBg : T.hotbarSlotBg;
    ctx.fillRect(x, sy, ss, ss);
    ctx.strokeStyle = active ? T.hotbarSlotActiveBorder : T.hotbarSlotBorder;
    ctx.lineWidth = active ? 3 : 1;
    ctx.strokeRect(x+0.5, sy+0.5, ss-1, ss-1);
    ctx.fillStyle = T.hotbarIndexText;
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText(i === 9 ? '0' : String(i+1), x+4, sy+12);
    drawItemIcon(state.hotbar[i], x+8, sy+8, ss-16);
  }

  // Название при смене слота — по центру
  if(state.tooltipTimer > 0 && state.tooltipName){
    const elapsed = state.tooltipMax - state.tooltipTimer;
    let alpha = 1;
    if(elapsed < TOOLTIP_FADE_IN) alpha = elapsed / TOOLTIP_FADE_IN;
    else if(state.tooltipTimer < TOOLTIP_FADE_OUT) alpha = state.tooltipTimer / TOOLTIP_FADE_OUT;
    alpha = Math.max(0, Math.min(1, alpha));
    const slideOffset = (1 - alpha) * 10;
    const baseY = sy - 24 - slideOffset;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(state.tooltipName, canvas.width/2, baseY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.tooltipName, canvas.width/2, baseY);
    ctx.restore();
  }

  // Подсказка «нужен инструмент»
  if(state.miningBlocked){
    const tip = 'Нужен правильный инструмент';
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(tip).width;
    const tx2 = (canvas.width-tw)/2, ty2 = sy - 60;
    ctx.fillStyle = T.hintBg;
    ctx.fillRect(tx2-12, ty2-16, tw+24, 26);
    ctx.strokeStyle = T.closeBtnBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx2-12+0.5, ty2-16+0.5, tw+24-1, 26-1);
    ctx.fillStyle = T.hintText;
    ctx.textAlign = 'left';
    ctx.fillText(tip, tx2, ty2+2);
  }
}

// ============================================================
// HP и ГОЛОД — рядом с хотбаром
// ============================================================
function renderHpAndHunger(){
  const T = getTheme();
  const ss = 48, hotbarGap = 6;
  const totalW = HOTBAR_SIZE*ss + (HOTBAR_SIZE-1)*hotbarGap;
  const hbRight = (canvas.width + totalW)/2;
  const hbBottom = canvas.height - 14 - ss - 10;

  const barW = 160, barH = 14, gap = 6;

  // HP — верхняя полоска
  const hpY = hbBottom - barH*2 - gap;
  const hpRatio = Math.max(0, state.player.hp / PLAYER_MAX_HP);
  const hpX = hbRight - barW;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(hpX, hpY, barW, barH);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(hpX+1, hpY+1, (barW-2) * hpRatio, barH-2);
  ctx.strokeStyle = T.panelBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(hpX+0.5, hpY+0.5, barW-1, barH-1);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('❤ ' + state.player.hp + '/' + PLAYER_MAX_HP, hpX + 8, hpY + 11);

  // Голод — нижняя
  const hungerY = hbBottom - barH;
  const hRatio = Math.max(0, state.player.hunger / PLAYER_MAX_HUNGER);
  const hungerX = hbRight - barW;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(hungerX, hungerY, barW, barH);
  ctx.fillStyle = '#c98040';
  ctx.fillRect(hungerX+1, hungerY+1, (barW-2) * hRatio, barH-2);
  ctx.strokeStyle = T.panelBorder;
  ctx.strokeRect(hungerX+0.5, hungerY+0.5, barW-1, barH-1);
  ctx.fillStyle = '#fff';
  ctx.fillText('🍖 ' + state.player.hunger + '/' + PLAYER_MAX_HUNGER, hungerX + 8, hungerY + 11);
}

// ============================================================
// ИКОНКА ПРЕДМЕТА
// ============================================================
function drawItemIcon(slot, x, y, size){
  if(!slot) return;
  const def = ITEMS[slot.type]; if(!def) return;
  const img = getItemImage(slot.type);

  if(img) ctx.drawImage(img, x, y, size, size);
  else if(def.kind === 'tool') drawToolIcon(def.tool, def.tier, x, y, size);
  else {
    const cache = state.itemCache[slot.type] || state.floorCache[slot.type] || state.objectCache[slot.type];
    if(cache) ctx.drawImage(cache[0], x, y, size, size);
    else {
      const isz = Math.floor(size * 0.65);
      const ix = x + Math.floor((size - isz) / 2);
      const iy = y + Math.floor((size - isz) / 2);
      ctx.fillStyle = def.color;
      ctx.fillRect(ix, iy, isz, isz);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix+0.5, iy+0.5, isz-1, isz-1);
    }
  }

  // Прочность
  if(def.kind === 'tool' && typeof slot.durability === 'number' && typeof def.maxDurability === 'number'){
    const ratio = Math.max(0, slot.durability / def.maxDurability);
    const barW = size - 4, barH = 3;
    const bx = x + 2, by = y + size - barH - 1;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ffb300' : '#e53935';
    ctx.fillRect(bx, by, barW * ratio, barH);
  }

  // Кол-во
  if(slot.count > 1){
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(String(slot.count), x+size+7, y+size+7);
    ctx.fillText(String(slot.count), x+size+7, y+size+7);
    ctx.textAlign = 'left';
  }
}

// ============================================================
// ИКОНКИ ИНСТРУМЕНТОВ
// ============================================================
function drawToolIcon(tool, tier, x, y, size){
  const handle = '#6b3a1a';
  let head = '#a0522d';
  if(tier === 2) head = '#8a8a8a';
  if(tier === 3) head = '#d0d0e0';
  ctx.save();

  if(tool === 'pickaxe'){
    const cx = x + size*0.5;
    const headY = y + size*0.22;
    ctx.strokeStyle = handle;
    ctx.lineWidth = Math.max(3, size * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, y + size*0.92);
    ctx.lineTo(cx, headY);
    ctx.stroke();
    ctx.strokeStyle = head;
    ctx.lineWidth = Math.max(3, size * 0.13);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size*0.08, y + size*0.40);
    ctx.lineTo(x + size*0.14, y + size*0.18);
    ctx.lineTo(x + size*0.86, y + size*0.18);
    ctx.lineTo(x + size*0.92, y + size*0.40);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(x + size*0.2, y + size*0.2);
    ctx.lineTo(x + size*0.8, y + size*0.2);
    ctx.stroke();
  }
  else if(tool === 'axe'){
    ctx.strokeStyle = handle; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x+8, y+size-4); ctx.lineTo(x+size-12, y+6); ctx.stroke();
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.moveTo(x+size-16, y+6); ctx.lineTo(x+size-2, y+10);
    ctx.lineTo(x+size-2, y+22); ctx.lineTo(x+size-16, y+20);
    ctx.quadraticCurveTo(x+size-10, y+13, x+size-16, y+6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 1; ctx.stroke();
  }
  else if(tool === 'hoe'){
    ctx.strokeStyle = handle; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x+6, y+size-4); ctx.lineTo(x+size-8, y+8); ctx.stroke();
    ctx.strokeStyle = head; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x+size-16, y+6);
    ctx.lineTo(x+size-4, y+6);
    ctx.lineTo(x+size-4, y+14);
    ctx.stroke();
  }
  else if(tool === 'sword'){
    ctx.strokeStyle = '#6b3a1a'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + size*0.5, y + size*0.88);
    ctx.lineTo(x + size*0.5, y + size*0.6);
    ctx.stroke();
    ctx.strokeStyle = head; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + size*0.28, y + size*0.6);
    ctx.lineTo(x + size*0.72, y + size*0.6);
    ctx.stroke();
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.moveTo(x + size*0.42, y + size*0.6);
    ctx.lineTo(x + size*0.58, y + size*0.6);
    ctx.lineTo(x + size*0.55, y + size*0.18);
    ctx.lineTo(x + size*0.50, y + size*0.08);
    ctx.lineTo(x + size*0.45, y + size*0.18);
    ctx.closePath();
    ctx.fill();
  }
  else if(tool === 'shears'){
    ctx.strokeStyle = head;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size*0.25, y + size*0.15);
    ctx.lineTo(x + size*0.55, y + size*0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size*0.75, y + size*0.15);
    ctx.lineTo(x + size*0.45, y + size*0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size*0.3, y + size*0.75, size*0.13, 0, Math.PI*2);
    ctx.arc(x + size*0.7, y + size*0.75, size*0.13, 0, Math.PI*2);
    ctx.stroke();
  }
  else if(tool === 'flintsteel'){
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + size*0.2, y + size*0.5, size*0.35, size*0.35);
    ctx.fillStyle = '#a0a0a8';
    ctx.beginPath();
    ctx.moveTo(x + size*0.55, y + size*0.2);
    ctx.lineTo(x + size*0.9, y + size*0.4);
    ctx.lineTo(x + size*0.7, y + size*0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================
// ИНВЕНТАРЬ / ВЕРСТАК / ПЕЧЬ / СУНДУК / КОСТЁР / ТОРГОВЛЯ
// ============================================================
function renderInventoryUI(){
  const T = getTheme();
  const { rects, panel } = layoutUI();
  const isTable = state.uiMode === 'table';
  const isFurnace = state.uiMode === 'furnace';
  const isChest = state.uiMode === 'chest';
  const isCampfire = state.uiMode === 'campfire';
  const isTrade = state.uiMode === 'trade';

  // Панель
  ctx.fillStyle = T.panelBg;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = T.panelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(panel.x+0.5, panel.y+0.5, panel.w-1, panel.h-1);

  // Заголовок
  ctx.fillStyle = T.textAccent;
  ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left';
  const title = isTable ? 'Верстак'
    : isFurnace ? 'Печь'
    : isChest ? 'Сундук'
    : isCampfire ? 'Костёр'
    : isTrade ? 'Торговля'
    : 'Инвентарь';
  ctx.fillText(title, panel.x+16, panel.y+30);

  // Кнопка «Рецепты»
  if(!isChest && !isTrade && rects['btn_recipes']){
    const [rx,ry,rw,rh] = rects['btn_recipes'];
    ctx.fillStyle = T.slotBg;
    ctx.fillRect(rx,ry,rw,rh);
    ctx.strokeStyle = T.slotBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(rx+0.5, ry+0.5, rw-1, rh-1);
    ctx.fillStyle = T.text;
    ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('📖 Рецепты', rx+rw/2, ry+rh/2+5);
    ctx.textAlign = 'left';
  }

  // Кнопка закрытия
  const [bx,by,bw,bh] = rects['btn_close'];
  ctx.fillStyle = T.closeBtnBg;
  ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle = T.closeBtnBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx+0.5, by+0.5, bw-1, bh-1);
  ctx.fillStyle = T.closeBtnText;
  ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
  ctx.fillText('✕', bx+bw/2, by+bh/2+6);
  ctx.textAlign = 'left';

  // Слоты — общий обход
  for(const key in rects){
    if(key.startsWith('btn_') || key === 'furnace_progress') continue;
    if(key.startsWith('trade_')) continue; // торговые слоты рисуем отдельно
    const [x,y,w,h] = rects[key];
    const isResult = key === 'result' || key === 'furnace_output';
    ctx.fillStyle = isResult ? T.resultBg : T.slotBg;
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = isResult ? T.resultBorder : T.slotBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
    const item = getItemAt(key);
    if(item) drawItemIcon(item, x+6, y+6, w-12);
  }

  // Стрелка + превью (для крафта)
  if(!isFurnace && !isChest && !isCampfire && !isTrade && rects['result']){
    const [rX,rY,rW,rH] = rects['result'];
    const c0 = rects['craft_0'];
    ctx.strokeStyle = T.resultBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c0[0]+c0[2]+8, rY+rH/2);
    ctx.lineTo(rX-8, rY+rH/2);
    ctx.stroke();
    ctx.fillStyle = T.resultBorder;
    ctx.beginPath();
    ctx.moveTo(rX-8, rY+rH/2);
    ctx.lineTo(rX-16, rY+rH/2-5);
    ctx.lineTo(rX-16, rY+rH/2+5);
    ctx.closePath(); ctx.fill();

    const preview = getCraftPreview();
    if(preview && !state.uiCraftResult){
      const sz = 44 - 12;
      const px2 = rX + 6, py2 = rY + 6;
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawItemIcon({ type: preview.result.id, count: preview.result.count }, px2, py2, sz);
      ctx.restore();
      ctx.fillStyle = T.textAccent;
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('✓', rX + 22, rY + 42);
      ctx.textAlign = 'left';
    }

    // Кнопка «Скрафтить»
    const [bx2,by2,bw2,bh2] = rects['btn_craft'];
    const canCraft = !!getCraftPreview();
    ctx.fillStyle = canCraft ? T.resultBg : T.slotBg;
    ctx.fillRect(bx2,by2,bw2,bh2);
    ctx.strokeStyle = canCraft ? T.resultBorder : T.slotBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx2+0.5, by2+0.5, bw2-1, bh2-1);
    ctx.fillStyle = canCraft ? T.textAccent : T.textMuted;
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Скрафтить', bx2+bw2/2, by2+bh2/2+5);
    ctx.textAlign = 'left';
  }

  // Прогресс печи
  if(isFurnace && rects['furnace_progress']){
    const [px,py,pw,ph] = rects['furnace_progress'];
    ctx.fillStyle = T.slotBg;
    ctx.fillRect(px,py,pw,ph);
    ctx.strokeStyle = T.slotBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
    ctx.fillStyle = state.furnaceBurning ? '#ff8a3a' : T.textMuted;
    ctx.fillRect(px+1, py+1, (pw-2)*state.furnaceProgress, ph-2);
  }

  // Торговля — рисуем карточки
  if(isTrade){
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = T.textAccent;
    ctx.textAlign = 'left';
    ctx.fillText('Продать', panel.x + 20, panel.y + 60);
    ctx.fillText('Купить',  panel.x + 20 + 44*2 + 60, panel.y + 60);

    const sellStart = state.tradePage * 6;
    const buyStart = state.tradePage * 6;

    for(let i=0;i<6;i++){
      const sellEntry = TRADE_SELL[sellStart + i];
      const buyEntry  = TRADE_BUY[buyStart + i];

      // --- Продажа ---
      if(sellEntry){
        const [x, y, w, h] = rects[`trade_sell_${i}`];
        ctx.fillStyle = T.slotBg;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = T.slotBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
        // Иконка
        drawItemIcon({ type: sellEntry.input, count: sellEntry.count }, x+4, y+4, h-8);
        // Текст
        ctx.fillStyle = T.text;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`×${sellEntry.count}  →  💎${sellEntry.price}`, x + h + 4, y + h/2 + 4);
      }

      // --- Покупка ---
      if(buyEntry){
        const [x, y, w, h] = rects[`trade_buy_${i}`];
        ctx.fillStyle = T.slotBg;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = T.slotBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
        // Текст
        ctx.fillStyle = T.text;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`💎${buyEntry.price}  →  ×${buyEntry.count}`, x + 6, y + h/2 + 4);
        // Иконка
        drawItemIcon({ type: buyEntry.output, count: buyEntry.count }, x + w - h + 4, y + 4, h - 8);
      }
    }

    // Скролл-подсказка
    const totalPages = Math.max(1, Math.ceil(Math.max(TRADE_SELL.length, TRADE_BUY.length) / 6));
    ctx.fillStyle = T.textMuted;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Страница ${state.tradePage + 1} / ${totalPages} (колесо — прокрутка)`,
                 panel.x + panel.w/2, panel.y + panel.h - 100);
    ctx.textAlign = 'left';
  }
}

// ============================================================
// КНИГА РЕЦЕПТОВ
// ============================================================
function renderRecipes(){
  const T = getTheme();
  const r = getRecipesRects();
  const { panel, btnClose, btnBack, btnPrev, btnNext } = r;

  ctx.fillStyle = T.panelBg;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = T.panelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(panel.x+0.5, panel.y+0.5, panel.w-1, panel.h-1);

  ctx.fillStyle = T.textAccent;
  ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
  ctx.fillText('📖 Книга рецептов', panel.x+panel.w/2, panel.y+34);
  ctx.textAlign = 'left';

  // X
  ctx.fillStyle = T.closeBtnBg;
  ctx.fillRect(btnClose.x, btnClose.y, btnClose.w, btnClose.h);
  ctx.strokeStyle = T.closeBtnBorder;
  ctx.strokeRect(btnClose.x+0.5, btnClose.y+0.5, btnClose.w-1, btnClose.h-1);
  ctx.fillStyle = T.closeBtnText;
  ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
  ctx.fillText('✕', btnClose.x+btnClose.w/2, btnClose.y+btnClose.h/2+6);
  ctx.textAlign = 'left';

  // Назад
  ctx.fillStyle = T.slotBg;
  ctx.fillRect(btnBack.x, btnBack.y, btnBack.w, btnBack.h);
  ctx.strokeStyle = T.slotBorder;
  ctx.strokeRect(btnBack.x+0.5, btnBack.y+0.5, btnBack.w-1, btnBack.h-1);
  ctx.fillStyle = T.text;
  ctx.font = '13px monospace'; ctx.textAlign = 'center';
  ctx.fillText('← Назад', btnBack.x+btnBack.w/2, btnBack.y+btnBack.h/2+5);
  ctx.textAlign = 'left';

  // Сетка карточек
  const gridX = panel.x + 20, gridY = panel.y + 60;
  const gridW = panel.w - 40, gridH = panel.h - 60 - 70;
  const cols = 2;
  const cellW = gridW/cols, cellH = gridH/3, cardPad = 8;

  const allRecipes = ALL_RECIPES_VIEW;
  const totalPages = Math.max(1, Math.ceil(allRecipes.length / RECIPE_PAGE_SIZE));
  if(state.recipePage >= totalPages) state.recipePage = totalPages - 1;
  if(state.recipePage < 0) state.recipePage = 0;

  const start = state.recipePage * RECIPE_PAGE_SIZE;
  const end = Math.min(start + RECIPE_PAGE_SIZE, allRecipes.length);

  for(let i=start;i<end;i++){
    const rec = allRecipes[i];
    const idx = i - start;
    const col = idx % cols, row = Math.floor(idx / cols);
    const cx = gridX + col*cellW + cardPad;
    const cy = gridY + row*cellH + cardPad;
    const cw = cellW - cardPad*2, ch = cellH - cardPad*2;

    ctx.fillStyle = T.recipeCard;
    ctx.fillRect(cx,cy,cw,ch);
    ctx.strokeStyle = T.recipeCardBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx+0.5, cy+0.5, cw-1, ch-1);

    if(rec.type === 'furnace') renderFurnaceCard(rec, cx, cy, cw, ch, T);
    else renderCraftCard(rec, cx, cy, cw, ch, T);
  }

  // Номер страницы
  ctx.fillStyle = T.textAccent;
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${state.recipePage+1} / ${totalPages}`, panel.x+panel.w/2, panel.y+panel.h-30);
  ctx.textAlign = 'left';

  // Стрелки
  const prevActive = state.recipePage > 0;
  ctx.fillStyle = prevActive ? T.slotBgHover : T.slotBg;
  ctx.fillRect(btnPrev.x, btnPrev.y, btnPrev.w, btnPrev.h);
  ctx.strokeStyle = prevActive ? T.resultBorder : T.slotBorder;
  ctx.strokeRect(btnPrev.x+0.5, btnPrev.y+0.5, btnPrev.w-1, btnPrev.h-1);
  ctx.fillStyle = prevActive ? T.textAccent : T.textMuted;
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText('◀', btnPrev.x+btnPrev.w/2, btnPrev.y+btnPrev.h/2+6);

  const nextActive = state.recipePage < totalPages - 1;
  ctx.fillStyle = nextActive ? T.slotBgHover : T.slotBg;
  ctx.fillRect(btnNext.x, btnNext.y, btnNext.w, btnNext.h);
  ctx.strokeStyle = nextActive ? T.resultBorder : T.slotBorder;
  ctx.strokeRect(btnNext.x+0.5, btnNext.y+0.5, btnNext.w-1, btnNext.h-1);
  ctx.fillStyle = nextActive ? T.textAccent : T.textMuted;
  ctx.fillText('▶', btnNext.x+btnNext.w/2, btnNext.y+btnNext.h/2+6);
  ctx.textAlign = 'left';
}

function renderCraftCard(rec, cx, cy, cw, ch, T){
  const iconSize = 56, iconX = cx+14, iconY = cy + (ch - iconSize)/2;
  drawRecipeIcon(rec.result.id, iconX, iconY, iconSize);
  const textX = iconX + iconSize + 16;
  ctx.fillStyle = T.text;
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`${ITEMS[rec.result.id].name} ×${rec.result.count}`, textX, cy+22);
  ctx.fillStyle = T.textMuted;
  ctx.font = '11px monospace';
  ctx.fillText(rec.table === 'table' ? 'Только на верстаке' : 'В инвентаре', textX, cy+40);

  const sw = 20, gap = 3;
  const pW = rec.pattern[0].length, pH = rec.pattern.length;
  const patX = textX, patY = cy + 50;
  for(let y=0;y<pH;y++) for(let x=0;x<pW;x++){
    const v = rec.pattern[y][x];
    const sx = patX + x*(sw+gap), sy = patY + y*(sw+gap);
    ctx.fillStyle = v === null ? T.slotBg : T.slotBgHover;
    ctx.fillRect(sx, sy, sw, sw);
    ctx.strokeStyle = T.slotBorder;
    ctx.strokeRect(sx+0.5, sy+0.5, sw-1, sw-1);
    if(v !== null) drawRecipeIcon(v, sx+2, sy+2, sw-4);
  }
}

function renderFurnaceCard(rec, cx, cy, cw, ch, T){
  const iconSize = 44;
  const centerY = cy + (ch - iconSize)/2;
  ctx.fillStyle = '#ffb300';
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('🔥 ПЕРЕПЛАВКА', cx + 12, cy + 16);
  ctx.fillStyle = T.text;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`${ITEMS[rec.output.id].name} ×${rec.output.count}`, cx + 12, cy + 34);

  const inX = cx + 14, inY = centerY + 6;
  ctx.fillStyle = T.slotBg; ctx.fillRect(inX, inY, iconSize, iconSize);
  ctx.strokeStyle = T.slotBorder; ctx.lineWidth = 1;
  ctx.strokeRect(inX+0.5, inY+0.5, iconSize-1, iconSize-1);
  drawRecipeIcon(rec.input, inX + 6, inY + 6, iconSize - 12);

  const arrowX = inX + iconSize + 8;
  ctx.fillStyle = '#ffb300';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('→', arrowX, inY + iconSize/2 + 8);

  const outX = arrowX + 34;
  ctx.fillStyle = T.resultBg; ctx.fillRect(outX, inY, iconSize, iconSize);
  ctx.strokeStyle = T.resultBorder; ctx.lineWidth = 1;
  ctx.strokeRect(outX+0.5, inY+0.5, iconSize-1, iconSize-1);
  drawRecipeIcon(rec.output.id, outX + 6, inY + 6, iconSize - 12);
}

function drawRecipeIcon(id, x, y, size){
  const img = getItemImage(id);
  if(img){ ctx.drawImage(img, x, y, size, size); return; }
  const def = ITEMS[id];
  if(def && def.kind === 'tool'){ drawToolIcon(def.tool, def.tier, x, y, size); return; }
  const cache = state.itemCache[id] || state.floorCache[id] || state.objectCache[id];
  if(cache){ ctx.drawImage(cache[0], x, y, size, size); return; }
  ctx.fillStyle = def ? def.color : '#888';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeRect(x+0.5, y+0.5, size-1, size-1);
}

// ============================================================
// ПЕРЕТАСКИВАНИЕ
// ============================================================
function renderDragging(){
  if(!state.dragging) return;
  const img = getItemImage(state.dragging.item.type);
  const s = 36;
  const { x, y } = state.mouse;
  if(img) ctx.drawImage(img, x - s/2, y - s/2, s, s);
  else {
    const def = ITEMS[state.dragging.item.type];
    ctx.fillStyle = def ? def.color : '#888';
    ctx.fillRect(x - s/2, y - s/2, s, s);
  }
  if(state.dragging.item.count > 1){
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(String(state.dragging.item.count), x+s/2-2, y+s/2-2);
    ctx.fillText(String(state.dragging.item.count), x+s/2-2, y+s/2-2);
    ctx.textAlign = 'left';
  }
}

// ============================================================
// TOOLTIP
// ============================================================
function renderTooltip(){
  if(!state.uiMode || state.showRecipes) return;
  if(state.dragging) return;
  const key = getSlotAt(state.mouse.x, state.mouse.y);
  if(!key || key.startsWith('btn_') || key === 'furnace_progress') return;
  if(key.startsWith('trade_')) return;
  const item = getItemAt(key);
  if(!item) return;
  const def = ITEMS[item.type];
  if(!def) return;

  let text = def.name;
  if(typeof item.durability === 'number' && typeof def.maxDurability === 'number'){
    text += `  (${item.durability}/${def.maxDurability})`;
  } else if(item.count > 1){
    text += `  ×${item.count}`;
  }

  const T = getTheme();
  ctx.save();
  ctx.font = 'bold 14px monospace';
  const tw = ctx.measureText(text).width;
  const padX = 12, bh = 26;
  const bw = tw + padX * 2;
  let bx = state.mouse.x + 16;
  let by = state.mouse.y + 16;
  if(bx + bw > canvas.width - 8) bx = state.mouse.x - bw - 8;
  if(by + bh > canvas.height - 8) by = state.mouse.y - bh - 8;
  ctx.fillStyle = T.panelBg;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = T.panelBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx+0.5, by+0.5, bw-1, bh-1);
  ctx.fillStyle = T.textAccent;
  ctx.textAlign = 'left';
  ctx.fillText(text, bx + padX, by + 18);
  ctx.restore();
}

// ============================================================
// ЧАСЫ / ИКОНКА ДЕНЬ-НОЧЬ
// ============================================================
function renderClockIcon(){
  const size = 52;
  const margin = 16;
  const cx = canvas.width - margin - size/2;
  const cy = margin + size/2 + 24;
  const T = getTheme();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size/2, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fill();
  ctx.strokeStyle = T.panelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  const angle = state.timeOfDay * Math.PI * 2 - Math.PI / 2;
  const r = size/2 - 8;
  const sx = cx + Math.cos(angle) * r;
  const sy = cy + Math.sin(angle) * r;

  const isNightNow = isNight();
  ctx.fillStyle = isNightNow ? '#e8e8f0' : '#ffd700';
  ctx.beginPath();
  ctx.arc(sx, sy, isNightNow ? 6 : 8, 0, Math.PI*2);
  ctx.fill();

  if(isNightNow){
    ctx.fillStyle = 'rgba(20,20,40,0.85)';
    ctx.beginPath();
    ctx.arc(sx - 3, sy - 2, 5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================
// FPS
// ============================================================
const _fps = [];
function renderFpsCounter(){
  if(!settings.showFps) return;
  const now = performance.now();
  _fps.push(now);
  while(_fps.length > 0 && _fps[0] < now-1000) _fps.shift();
  const f = _fps.length;
  ctx.save();
  ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = f >= 55 ? '#2e7d32' : f >= 30 ? '#c08a2a' : '#c0392b';
  ctx.fillText(`${f} FPS`, canvas.width-12, 22);
  ctx.restore();
}