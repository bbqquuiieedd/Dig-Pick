// render_ui.js

function renderHotbar(){
  const ss = 48, gap = 6;
  const totalW = HOTBAR_SIZE*ss + (HOTBAR_SIZE-1)*gap;
  const sx = (canvas.width - totalW)/2;
  const sy = canvas.height - ss - 14;
  for(let i=0;i<HOTBAR_SIZE;i++){
    const x = sx + i*(ss+gap);

    // Только рамка, без фоновой заливки
    ctx.strokeStyle = i === state.selectedHotbarSlot ? '#ffd700' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = i === state.selectedHotbarSlot ? 3 : 1;
    ctx.strokeRect(x+0.5, sy+0.5, ss-1, ss-1);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText(i === 9 ? '0' : String(i+1), x+4, sy+12);

    drawItemIcon(state.hotbar[i], x+8, sy+8, ss-16);
  }
  const sel = state.hotbar[state.selectedHotbarSlot];
  if(sel){
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(sx, sy-28, 200, 22);
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
    ctx.fillText(ITEMS[sel.type].name, sx+8, sy-12);
  }
  if(state.miningBlocked){
    const tip = 'Нужен правильный инструмент';
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(tip).width;
    const tx2 = (canvas.width-tw)/2, ty2 = sy-60;
    ctx.fillStyle = 'rgba(120,20,20,0.75)'; ctx.fillRect(tx2-12, ty2-16, tw+24, 26);
    ctx.strokeStyle = 'rgba(255,100,100,0.85)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(tx2-12+0.5, ty2-16+0.5, tw+24-1, 26-1);
    ctx.fillStyle = '#ffdddd'; ctx.textAlign = 'left'; ctx.fillText(tip, tx2, ty2+2);
  }
}

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
      // Маленький цветной квадрат по центру (без большой подложки)
      const isz = Math.floor(size * 0.55);
      const ix = x + Math.floor((size - isz) / 2);
      const iy = y + Math.floor((size - isz) / 2);
      ctx.fillStyle = def.color;
      ctx.fillRect(ix, iy, isz, isz);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix+0.5, iy+0.5, isz-1, isz-1);
    }
  }

  // Полоска прочности
  if(def.kind === 'tool' && typeof slot.durability === 'number' && typeof def.maxDurability === 'number'){
    const ratio = Math.max(0, slot.durability / def.maxDurability);
    const barW = size - 4, barH = 3;
    const bx = x + 2, by = y + size - barH - 1;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ffb300' : '#e53935';
    ctx.fillRect(bx, by, barW * ratio, barH);
  }

  if(slot.count > 1){
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right';
    ctx.fillText(String(slot.count), x+size+7, y+size+7);
    ctx.textAlign = 'left';
  }
}

function drawToolIcon(tool, tier, x, y, size){
  const handle = '#6b3a1a';
  let head = '#a0522d';
  if(tier === 2) head = '#8a8a8a';
  if(tier === 3) head = '#d0d0e0';
  ctx.save();
  ctx.strokeStyle = handle; ctx.lineWidth = 4; ctx.lineCap = 'round';
  if(tool === 'pickaxe'){
    ctx.beginPath(); ctx.moveTo(x+4, y+size-4); ctx.lineTo(x+size-6, y+6); ctx.stroke();
    ctx.strokeStyle = head; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x+size-8, y+8, 8, Math.PI*0.7, Math.PI*1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x+size-8, y+8, 8, Math.PI*0.75, Math.PI*1.55); ctx.stroke();
  } else if(tool === 'hoe'){
    // Древко
    ctx.beginPath(); ctx.moveTo(x+6, y+size-4); ctx.lineTo(x+size-8, y+8); ctx.stroke();
    // Лезвие сверху, загнутое
    ctx.strokeStyle = head; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x+size-16, y+6);
    ctx.lineTo(x+size-4, y+6);
    ctx.lineTo(x+size-4, y+14);
    ctx.stroke();
    } else if(tool === 'sword'){
    // Рукоять
    ctx.strokeStyle = '#6b3a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + size*0.5, y + size*0.88);
    ctx.lineTo(x + size*0.5, y + size*0.6);
    ctx.stroke();
    // Гарда
    ctx.strokeStyle = head;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + size*0.28, y + size*0.6);
    ctx.lineTo(x + size*0.72, y + size*0.6);
    ctx.stroke();
    // Лезвие
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.moveTo(x + size*0.42, y + size*0.6);
    ctx.lineTo(x + size*0.58, y + size*0.6);
    ctx.lineTo(x + size*0.55, y + size*0.18);
    ctx.lineTo(x + size*0.50, y + size*0.08);
    ctx.lineTo(x + size*0.45, y + size*0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Блик
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + size*0.5, y + size*0.18);
    ctx.lineTo(x + size*0.5, y + size*0.55);
    ctx.stroke();
    } else {
    ctx.beginPath(); ctx.moveTo(x+8, y+size-4); ctx.lineTo(x+size-12, y+6); ctx.stroke();
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.moveTo(x+size-16, y+6); ctx.lineTo(x+size-2, y+10);
    ctx.lineTo(x+size-2, y+22); ctx.lineTo(x+size-16, y+20);
    ctx.quadraticCurveTo(x+size-10, y+13, x+size-16, y+6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x+size-14, y+9); ctx.lineTo(x+size-4, y+12);
    ctx.lineTo(x+size-4, y+15); ctx.lineTo(x+size-14, y+13);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function renderInventoryUI(){
  const { rects, panel } = layoutUI();
  const isTable = state.uiMode === 'table';
  const isFurnace = state.uiMode === 'furnace';
  const isChest = state.uiMode === 'chest';

  ctx.fillStyle = 'rgba(20,20,40,0.94)';
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = 'rgba(255,215,0,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(panel.x+0.5, panel.y+0.5, panel.w-1, panel.h-1);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left';
  const title = isTable ? 'Верстак' : isFurnace ? 'Печь' : isChest ? 'Сундук' : 'Инвентарь';
  ctx.fillText(title, panel.x+16, panel.y+30);

  if(!isChest){
    const [rx,ry,rw,rh] = rects['btn_recipes'];
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(rx,ry,rw,rh);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.strokeRect(rx+0.5, ry+0.5, rw-1, rh-1);
    ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('📖 Рецепты', rx+rw/2, ry+rh/2+5);
    ctx.textAlign = 'left';
  }

  const [bx,by,bw,bh] = rects['btn_close'];
  ctx.fillStyle = 'rgba(200,60,60,0.15)'; ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle = 'rgba(255,100,100,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(bx+0.5, by+0.5, bw-1, bh-1);
  ctx.fillStyle = '#ff9a9a'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
  ctx.fillText('✕', bx+bw/2, by+bh/2+6);
  ctx.textAlign = 'left';

  for(const key in rects){
    if(key.startsWith('btn_') || key === 'furnace_progress') continue;
    const [x,y,w,h] = rects[key];
    const isResult = key === 'result' || key === 'furnace_output';
    ctx.fillStyle = isResult ? 'rgba(255,215,0,0.10)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = isResult ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1; ctx.strokeRect(x+0.5, y+0.5, w-1, h-1);
    const item = getItemAt(key);
    if(item) drawItemIcon(item, x+6, y+6, w-12);
  }

  if(!isFurnace && !isChest){
    const [rX,rY,rW,rH] = rects['result'];
    const c0 = rects['craft_0'];
    ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c0[0]+c0[2]+8, rY+rH/2);
    ctx.lineTo(rX-8, rY+rH/2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
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
      ctx.fillStyle = 'rgba(255,215,0,0.9)';
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('✓', rX + 22, rY + 42);
      ctx.textAlign = 'left';
    }
  }

  if(!isFurnace && !isChest){
    const [bx2,by2,bw2,bh2] = rects['btn_craft'];
    const canCraft = !!getCraftPreview();
    ctx.fillStyle = canCraft ? 'rgba(255,215,0,0.25)' : 'rgba(255,215,0,0.08)';
    ctx.fillRect(bx2,by2,bw2,bh2);
    ctx.strokeStyle = canCraft ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1; ctx.strokeRect(bx2+0.5, by2+0.5, bw2-1, bh2-1);
    ctx.fillStyle = canCraft ? '#ffe066' : 'rgba(255,224,102,0.5)';
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Скрафтить', bx2+bw2/2, by2+bh2/2+5);
    ctx.textAlign = 'left';
  }

  if(isFurnace){
    const [px,py,pw,ph] = rects['furnace_progress'];
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px,py,pw,ph);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
    ctx.fillStyle = state.furnaceBurning ? '#ff8a3a' : '#666';
    ctx.fillRect(px+1, py+1, (pw-2)*state.furnaceProgress, ph-2);
    ctx.fillStyle = '#aaa'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    const [ix,iy] = rects['furnace_input']; ctx.fillText('Руда', ix, iy-6);
    const [fx2,fy2] = rects['furnace_fuel']; ctx.fillText('Топливо', fx2, fy2-6);
    const [ox,oy] = rects['furnace_output']; ctx.fillText('Слиток', ox, oy-6);
  }
}

function renderRecipes(){
  const r = getRecipesRects();
  const { panel, btnClose, btnBack, btnPrev, btnNext } = r;

  ctx.fillStyle = 'rgba(20,20,40,0.97)';
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(panel.x+0.5, panel.y+0.5, panel.w-1, panel.h-1);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
  ctx.fillText('📖 Книга рецептов', panel.x+panel.w/2, panel.y+34);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(200,60,60,0.15)'; ctx.fillRect(btnClose.x,btnClose.y,btnClose.w,btnClose.h);
  ctx.strokeStyle = 'rgba(255,100,100,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(btnClose.x+0.5, btnClose.y+0.5, btnClose.w-1, btnClose.h-1);
  ctx.fillStyle = '#ff9a9a'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
  ctx.fillText('✕', btnClose.x+btnClose.w/2, btnClose.y+btnClose.h/2+6);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(btnBack.x,btnBack.y,btnBack.w,btnBack.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  ctx.strokeRect(btnBack.x+0.5, btnBack.y+0.5, btnBack.w-1, btnBack.h-1);
  ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
  ctx.fillText('← Назад', btnBack.x+btnBack.w/2, btnBack.y+btnBack.h/2+5);
  ctx.textAlign = 'left';

  const gridX = panel.x + 20, gridY = panel.y + 60;
  const gridW = panel.w - 40, gridH = panel.h - 60 - 70;
  const cols = 2, rows = 3;
  const cellW = gridW/cols, cellH = gridH/rows, cardPad = 8;

  const totalPages = Math.max(1, Math.ceil(ALL_RECIPES_VIEW.length / RECIPE_PAGE_SIZE));
  if(state.recipePage >= totalPages) state.recipePage = totalPages - 1;
  if(state.recipePage < 0) state.recipePage = 0;

  const start = state.recipePage * RECIPE_PAGE_SIZE;
  const end = Math.min(start + RECIPE_PAGE_SIZE, ALL_RECIPES_VIEW.length);

  for(let i=start;i<end;i++){
    const rec = ALL_RECIPES_VIEW[i];
    const idx = i - start;
    const col = idx % cols, row = Math.floor(idx / cols);
    const cx = gridX + col*cellW + cardPad;
    const cy = gridY + row*cellH + cardPad;
    const cw = cellW - cardPad*2, ch = cellH - cardPad*2;

    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(cx,cy,cw,ch);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx+0.5, cy+0.5, cw-1, ch-1);

    if(rec.type === 'furnace'){
      renderFurnaceCard(rec, cx, cy, cw, ch);
    } else {
      renderCraftCard(rec, cx, cy, cw, ch);
    }
  }

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${state.recipePage+1} / ${totalPages}`, panel.x+panel.w/2, panel.y+panel.h-30);
  ctx.textAlign = 'left';

  const prevActive = state.recipePage > 0;
  ctx.fillStyle = prevActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)';
  ctx.fillRect(btnPrev.x, btnPrev.y, btnPrev.w, btnPrev.h);
  ctx.strokeStyle = prevActive ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.1)';
  ctx.strokeRect(btnPrev.x+0.5, btnPrev.y+0.5, btnPrev.w-1, btnPrev.h-1);
  ctx.fillStyle = prevActive ? '#ffe066' : 'rgba(255,255,255,0.25)';
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText('◀', btnPrev.x+btnPrev.w/2, btnPrev.y+btnPrev.h/2+6);

  const nextActive = state.recipePage < totalPages - 1;
  ctx.fillStyle = nextActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)';
  ctx.fillRect(btnNext.x, btnNext.y, btnNext.w, btnNext.h);
  ctx.strokeStyle = nextActive ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.1)';
  ctx.strokeRect(btnNext.x+0.5, btnNext.y+0.5, btnNext.w-1, btnNext.h-1);
  ctx.fillStyle = nextActive ? '#ffe066' : 'rgba(255,255,255,0.25)';
  ctx.fillText('▶', btnNext.x+btnNext.w/2, btnNext.y+btnNext.h/2+6);
  ctx.textAlign = 'left';
}

function renderCraftCard(rec, cx, cy, cw, ch){
  const iconSize = 56, iconX = cx+14, iconY = cy + (ch - iconSize)/2;
  drawRecipeIcon(rec.result.id, iconX, iconY, iconSize);

  const textX = iconX + iconSize + 16;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`${ITEMS[rec.result.id].name} ×${rec.result.count}`, textX, cy+22);
  ctx.fillStyle = '#999'; ctx.font = '11px monospace';
  ctx.fillText(rec.table === 'table' ? 'Только на верстаке' : 'В инвентаре', textX, cy+40);

  const sw = 20, gap = 3;
  const pW = rec.pattern[0].length, pH = rec.pattern.length;
  const patX = textX, patY = cy + 50;
  for(let y=0;y<pH;y++) for(let x=0;x<pW;x++){
    const v = rec.pattern[y][x];
    const sx = patX + x*(sw+gap), sy = patY + y*(sw+gap);
    ctx.fillStyle = v === null ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.10)';
    ctx.fillRect(sx, sy, sw, sw);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(sx+0.5, sy+0.5, sw-1, sw-1);
    if(v !== null) drawRecipeIcon(v, sx+2, sy+2, sw-4);
  }
}

function renderFurnaceCard(rec, cx, cy, cw, ch){
  const iconSize = 44;
  const centerY = cy + (ch - iconSize)/2;

  // Подпись "Печь"
  ctx.fillStyle = '#ffb300'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('🔥 ПЕРЕПЛАВКА', cx + 12, cy + 16);

  // Название результата
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
  ctx.fillText(`${ITEMS[rec.output.id].name} ×${rec.output.count}`, cx + 12, cy + 34);

  // Схема: вход → выход
  const startX = cx + 14;
  const inX = startX;
  const inY = centerY + 6;

  // Входной слот
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(inX, inY, iconSize, iconSize);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(inX+0.5, inY+0.5, iconSize-1, iconSize-1);
  drawRecipeIcon(rec.input, inX + 6, inY + 6, iconSize - 12);

  // Стрелка
  const arrowX = inX + iconSize + 8;
  ctx.fillStyle = '#ffb300';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('→', arrowX, inY + iconSize/2 + 8);

  // Выходной слот
  const outX = arrowX + 34;
  ctx.fillStyle = 'rgba(255,215,0,0.10)'; ctx.fillRect(outX, inY, iconSize, iconSize);
  ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(outX+0.5, inY+0.5, iconSize-1, iconSize-1);
  drawRecipeIcon(rec.output.id, outX + 6, inY + 6, iconSize - 12);

  // Подпись "нужна печь"
  ctx.fillStyle = '#999'; ctx.font = '11px monospace';
  ctx.fillText('В печи (руда + топливо)', cx + 12, cy + ch - 8);
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

function renderDragging(){
  if(!state.dragging) return;
  const img = getItemImage(state.dragging.item.type);
  const s = 36;
  const { x, y } = state.mouse;
  if(img) ctx.drawImage(img, x - s/2, y - s/2, s, s);
  else {
    ctx.fillStyle = ITEMS[state.dragging.item.type].color;
    ctx.fillRect(x - s/2, y - s/2, s, s);
  }
  if(state.dragging.item.count > 1){
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right';
    ctx.fillText(String(state.dragging.item.count), x+s/2-2, y+s/2-2);
    ctx.textAlign = 'left';
  }
}

const _fps = [];
function renderFpsCounter(){
  if(!settings.showFps) return;
  const now = performance.now();
  _fps.push(now);
  while(_fps.length > 0 && _fps[0] < now-1000) _fps.shift();
  const f = _fps.length;
  ctx.save();
  ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = f >= 55 ? 'rgba(120,255,120,0.8)' : f >= 30 ? 'rgba(255,220,100,0.85)' : 'rgba(255,100,100,0.9)';
  ctx.fillText(`${f} FPS`, canvas.width-12, 22);
  ctx.restore();
}

function renderTooltip(){
  if(!state.uiMode || state.showRecipes) return;
  if(state.dragging) return;
  const key = getSlotAt(state.mouse.x, state.mouse.y);
  if(!key || key.startsWith('btn_') || key === 'furnace_progress') return;
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

  ctx.save();
  ctx.font = 'bold 14px monospace';
  const tw = ctx.measureText(text).width;
  const padX = 12, bh = 26;
  const bw = tw + padX * 2;
  let bx = state.mouse.x + 16;
  let by = state.mouse.y + 16;
  if(bx + bw > canvas.width - 8) bx = state.mouse.x - bw - 8;
  if(by + bh > canvas.height - 8) by = state.mouse.y - bh - 8;

  ctx.fillStyle = 'rgba(20,20,40,0.95)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(255,215,0,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx+0.5, by+0.5, bw-1, bh-1);
  ctx.fillStyle = '#ffe066';
  ctx.textAlign = 'left';
  ctx.fillText(text, bx + padX, by + 18);
  ctx.restore();
}