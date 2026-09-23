// ============================================================
// ui.js — интерфейсы (инвентарь, верстак, печь, сундук, костёр, торговля)
// ============================================================

// ============================================================
// TOAST
// ============================================================
function showToast(text, duration = 1600){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  if(state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ============================================================
// ОТКРЫТИЕ ОКОН
// ============================================================
function openInventory(){
  state.uiMode = 'inventory';
  state.uiCraftSize = 2;
  state.uiCraftSlots = new Array(4).fill(null);
  state.uiCraftResult = null;
  state.showRecipes = false;
  state.gameState = 'paused-ui';
}

function openTable(tx, ty){
  state.uiMode = 'table';
  state.uiCraftSize = 3;
  state.uiCraftSlots = new Array(9).fill(null);
  state.uiCraftResult = null;
  state.showRecipes = false;
  state.gameState = 'paused-ui';
}

function openFurnace(tx, ty){
  state.uiMode = 'furnace';
  state.furnaceTarget = { tx, ty };
  state.furnaceInput = null;
  state.furnaceFuel = null;
  state.furnaceOutput = null;
  state.furnaceProgress = 0;
  state.furnaceBurning = false;
  state.showRecipes = false;
  state.gameState = 'paused-ui';
}

function openChest(tx, ty){
  const key = `${tx},${ty}`;
  if(!state.chests[key]) state.chests[key] = new Array(INV_COLS*CHEST_ROWS).fill(null);
  state.uiMode = 'chest';
  state.chestSlots = state.chests[key];
  state.chestTarget = { tx, ty };
  state.showRecipes = false;
  state.gameState = 'paused-ui';
}

function openCampfire(tx, ty){
  state.uiMode = 'campfire';
  state.campfireTarget = { tx, ty };
  if(!state.campfireSlots || state.campfireSlots.length !== 4){
    state.campfireSlots = new Array(4).fill(null);
  }
  state.showRecipes = false;
  state.gameState = 'paused-ui';
}

function openTrade(villagerIndex){
  state.uiMode = 'trade';
  state.tradeTarget = villagerIndex;
  state.tradePage = 0;
  state.showRecipes = false;
  state.gameState = 'paused-ui';
}

function openRecipes(){
  state.showRecipes = true;
  state.recipePage = 0;
}

// ============================================================
// ЗАКРЫТИЕ
// ============================================================
function closeUI(){
  if(state.showRecipes){ state.showRecipes = false; return; }

  // Возврат предметов из крафта
  for(const s of state.uiCraftSlots) if(s) addToInventory(s.type, s.count, s.durability);
  if(state.uiCraftResult) addToInventory(state.uiCraftResult.type, state.uiCraftResult.count, state.uiCraftResult.durability);
  state.uiCraftSlots = [];
  state.uiCraftResult = null;

  // Возврат из печи
  if(state.uiMode === 'furnace'){
    if(state.furnaceInput){ addToInventory(state.furnaceInput.type, state.furnaceInput.count, state.furnaceInput.durability); state.furnaceInput = null; }
    if(state.furnaceFuel){ addToInventory(state.furnaceFuel.type, state.furnaceFuel.count, state.furnaceFuel.durability); state.furnaceFuel = null; }
    if(state.furnaceOutput){ addToInventory(state.furnaceOutput.type, state.furnaceOutput.count, state.furnaceOutput.durability); state.furnaceOutput = null; }
  }

  // Возврат с костра
  if(state.uiMode === 'campfire'){
    if(state.campfireSlots){
      for(const s of state.campfireSlots) if(s) addToInventory(s.type, s.count, s.durability);
      state.campfireSlots = new Array(4).fill(null);
    }
  }

  state.chestSlots = null;
  state.chestTarget = null;
  state.campfireTarget = null;
  state.tradeTarget = null;

  state.uiMode = null;
  if(state.gameState === 'paused-ui') state.gameState = 'playing';
}

// ============================================================
// ПЕЧЬ — обновление
// ============================================================
function updateFurnace(dt){
  if(!state.furnaceTarget) return;
  state.furnaceProgress = Math.min(1, state.furnaceProgress);
  const now = Date.now();
  const hasInput = state.furnaceInput && (state.furnaceInput.type === O_IRON_ORE);
  const canOutput = !state.furnaceOutput || (state.furnaceOutput.type === I_IRON_INGOT && state.furnaceOutput.count < 99);

  if(hasInput && canOutput){
    if(!state.furnaceBurning){
      const f = state.furnaceFuel;
      if(f && (f.type === I_LOG || f.type === I_PLANKS || f.type === I_STICK)){
        let burnTime = SMELT_TIME_MS;
        if(f.type === I_PLANKS) burnTime = SMELT_TIME_MS * 0.5;
        if(f.type === I_STICK)  burnTime = SMELT_TIME_MS * 0.25;
        state.furnaceBurning = true;
        state.furnaceBurnUntil = now + burnTime;
        f.count--;
        if(f.count <= 0) state.furnaceFuel = null;
      }
    }
    if(state.furnaceBurning && now < state.furnaceBurnUntil){
      state.furnaceProgress += (dt*1000) / SMELT_TIME_MS;
      if(state.furnaceProgress >= 1){
        state.furnaceProgress = 0;
        state.furnaceInput.count--;
        if(state.furnaceInput.count <= 0) state.furnaceInput = null;
        if(state.furnaceOutput) state.furnaceOutput.count++;
        else state.furnaceOutput = { type: I_IRON_INGOT, count: 1 };
        state.furnaceBurning = false;
      }
    } else state.furnaceBurning = false;
  } else state.furnaceBurning = false;
}

// ============================================================
// КОСТЁР — обновление
// ============================================================
function updateCampfire(dt){
  if(!state.campfireTarget) return;
  const now = Date.now();
  for(let i=0;i<state.campfireSlots.length;i++){
    const s = state.campfireSlots[i];
    if(!s) continue;
    if(!s.cookStart) s.cookStart = now;
    const rec = CAMPFIRE_RECIPES.find(r => r.input === s.type);
    if(!rec) continue;
    const elapsed = now - s.cookStart;

    // Сгорание
    if(rec.burned !== undefined && rec.burned !== null && elapsed >= rec.cookMs + rec.burnMs){
      state.campfireSlots[i] = null;
      continue;
    }
    if(rec.burned === null && elapsed >= rec.cookMs + rec.burnMs){
      state.campfireSlots[i] = null;
      continue;
    }
    // Готовка
    if(elapsed >= rec.cookMs && s.type === rec.input){
      s.type = rec.output;
      s.cookStart = now;
    }
  }
}

// ============================================================
// ГЕОМЕТРИЯ
// ============================================================
function layoutUI(){
  const S = 44, G = 4, pad = 20;
  const rects = {};
  let panel = null;
  if(!state.uiMode) return { rects, panel, slotSize: S };

  const isTable = state.uiMode === 'table';
  const isFurnace = state.uiMode === 'furnace';
  const isChest = state.uiMode === 'chest';
  const isCampfire = state.uiMode === 'campfire';
  const isTrade = state.uiMode === 'trade';

  const cvsW = document.getElementById('game').width;
  const cvsH = document.getElementById('game').height;

  const invW = INV_COLS*(S+G) - G;
  const invH = INV_ROWS*(S+G) - G;
  const hotW = HOTBAR_SIZE*(S+G) - G;
  const hotH = S;

  const craftSize = isTable ? 3 : 2;
  const craftW = craftSize*(S+G) - G;

  let contentW, contentH;

  if(isChest){
    const chestH = CHEST_ROWS*(S+G) - G;
    contentW = Math.max(invW, hotW);
    contentH = 40 + chestH + 16 + invH + 16 + hotH;
  } else if(isFurnace){
    contentW = Math.max(invW, hotW, S*2 + 140);
    contentH = 40 + S*2 + 16 + 20 + invH + 16 + hotH;
  } else if(isCampfire){
    contentW = Math.max(invW, hotW, S*4 + 40);
    contentH = 40 + S + 16 + invH + 16 + hotH;
  } else if(isTrade){
    contentW = Math.max(invW, hotW, S*2 + 40 + S*6 + 20);
    contentH = 40 + 6*(S+G) + 16 + invH + 16 + hotH;
  } else {
    const craftBlockW = craftW + 40 + S + 20 + 120;
    contentW = Math.max(invW, hotW, craftBlockW);
    const craftBlockH = craftSize*(S+G) - G;
    contentH = 40 + craftBlockH + 20 + invH + 16 + hotH;
  }

  const panelW = contentW + pad*2;
  const panelH = contentH + pad*2;
  const panelX = Math.max(20, (cvsW - panelW)/2);
  const panelY = Math.max(20, Math.min(cvsH - panelH - 20, (cvsH - panelH)/2));

  panel = { x: panelX, y: panelY, w: panelW, h: panelH };
  rects['btn_close'] = [panelX + panelW - 40, panelY + 10, 30, 30];
  if(!isChest && !isTrade){
    rects['btn_recipes'] = [panelX + panelW - 40 - 8 - 130, panelY + 10, 130, 30];
  }

  const startX = panelX + pad;
  let cy = panelY + pad + 40;

  if(isChest){
    for(let r=0;r<CHEST_ROWS;r++) for(let c=0;c<INV_COLS;c++){
      rects[`chest_${r*INV_COLS+c}`] = [startX + c*(S+G), cy + r*(S+G), S, S];
    }
    cy += CHEST_ROWS*(S+G) - G + 16;
  } else if(isFurnace){
    rects['furnace_input'] = [startX, cy, S, S];
    rects['furnace_fuel'] = [startX, cy + S + 8, S, S];
    rects['furnace_progress'] = [startX + S + 20, cy + S/2 - 10, 60, 20];
    rects['furnace_output'] = [startX + S + 100, cy, S, S];
    cy += S*2 + 16 + 20;
  } else if(isCampfire){
    for(let i=0;i<4;i++){
      rects[`campfire_${i}`] = [startX + i*(S+G), cy, S, S];
    }
    cy += S + 16;
  } else if(isTrade){
    // Левая колонка — продажа. Правая — покупка.
    for(let i=0;i<6;i++){
      rects[`trade_sell_${i}`] = [startX, cy + i*(S+G) - 4, S*2, S];
    }
    for(let i=0;i<6;i++){
      rects[`trade_buy_${i}`]  = [startX + S*2 + 60, cy + i*(S+G) - 4, S*2, S];
    }
    cy += 6*(S+G) + 12;
  } else {
    for(let r=0;r<craftSize;r++) for(let c=0;c<craftSize;c++){
      rects[`craft_${r*craftSize+c}`] = [startX + c*(S+G), cy + r*(S+G), S, S];
    }
    const resultX = startX + craftW + 40;
    const resultY = cy + (craftSize*(S+G) - G - S)/2;
    rects['result'] = [resultX, resultY, S, S];
    rects['btn_craft'] = [resultX + S + 20, resultY + (S-30)/2, 120, 30];
    cy += craftSize*(S+G) - G + 20;
  }

  for(let r=0;r<INV_ROWS;r++) for(let c=0;c<INV_COLS;c++){
    rects[`inv_${r*INV_COLS+c}`] = [startX + c*(S+G), cy + r*(S+G), S, S];
  }
  cy += INV_ROWS*(S+G) - G + 16;

  for(let c=0;c<HOTBAR_SIZE;c++){
    rects[`hot_${c}`] = [startX + c*(S+G), cy, S, S];
  }

  return { rects, panel, slotSize: S };
}

function getRecipesRects(){
  const cvsW = document.getElementById('game').width;
  const cvsH = document.getElementById('game').height;
  const panelW = Math.min(900, cvsW - 80);
  const panelH = Math.min(640, cvsH - 80);
  const px = (cvsW - panelW)/2, py = (cvsH - panelH)/2;
  return {
    panel: { x: px, y: py, w: panelW, h: panelH },
    btnClose: { x: px + panelW - 44, y: py + 10, w: 34, h: 34 },
    btnBack:  { x: px + 16, y: py + panelH - 52, w: 120, h: 36 },
    btnPrev:  { x: px + panelW/2 - 110, y: py + panelH - 52, w: 60, h: 36 },
    btnNext:  { x: px + panelW/2 + 50, y: py + panelH - 52, w: 60, h: 36 },
  };
}

// ============================================================
// ХЕЛПЕРЫ
// ============================================================
function pointInRect(x, y, r){ return x >= r[0] && x <= r[0]+r[2] && y >= r[1] && y <= r[1]+r[3]; }
function pointInObj(x, y, r){ return x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h; }

function getSlotAt(x, y){
  const { rects } = layoutUI();
  for(const key in rects){
    if(pointInRect(x, y, rects[key])) return key;
  }
  return null;
}

function getItemAt(slotKey){
  if(!slotKey) return null;
  if(slotKey === 'result') return state.uiCraftResult;
  if(slotKey === 'furnace_input') return state.furnaceInput;
  if(slotKey === 'furnace_fuel') return state.furnaceFuel;
  if(slotKey === 'furnace_output') return state.furnaceOutput;
  if(slotKey.startsWith('campfire_')){
    const i = parseInt(slotKey.slice(9), 10);
    return state.campfireSlots ? state.campfireSlots[i] : null;
  }
  if(slotKey.startsWith('chest_') && state.chestSlots){
    return state.chestSlots[+slotKey.slice(6)];
  }
  if(slotKey.startsWith('inv_')) return state.inventory[+slotKey.slice(4)];
  if(slotKey.startsWith('hot_')) return state.hotbar[+slotKey.slice(4)];
  if(slotKey.startsWith('craft_')) return state.uiCraftSlots[+slotKey.slice(6)];
  return null;
}

function setItemAt(slotKey, item){
  if(!slotKey) return;
  if(slotKey === 'result'){ state.uiCraftResult = item; return; }
  if(slotKey === 'furnace_input'){ state.furnaceInput = item; return; }
  if(slotKey === 'furnace_fuel'){ state.furnaceFuel = item; return; }
  if(slotKey === 'furnace_output'){ state.furnaceOutput = item; return; }
  if(slotKey.startsWith('campfire_')){
    const i = parseInt(slotKey.slice(9), 10);
    if(state.campfireSlots) state.campfireSlots[i] = item;
    return;
  }
  if(slotKey.startsWith('chest_') && state.chestSlots){ state.chestSlots[+slotKey.slice(6)] = item; return; }
  if(slotKey.startsWith('inv_')){ state.inventory[+slotKey.slice(4)] = item; return; }
  if(slotKey.startsWith('hot_')){ state.hotbar[+slotKey.slice(4)] = item; return; }
  if(slotKey.startsWith('craft_')){ state.uiCraftSlots[+slotKey.slice(6)] = item; return; }
}