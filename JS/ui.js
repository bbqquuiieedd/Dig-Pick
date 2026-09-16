// ui.js
function showToast(text, duration = 1600){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  if(state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

function openInventory(){
  state.uiMode = 'inventory'; state.uiCraftSize = 2;
  state.uiCraftSlots = new Array(4).fill(null); state.uiCraftResult = null;
  state.showRecipes = false; state.gameState = 'paused-ui';
}
function openTable(tx,ty){
  state.uiMode = 'table'; state.uiCraftSize = 3;
  state.uiCraftSlots = new Array(9).fill(null); state.uiCraftResult = null;
  state.showRecipes = false; state.gameState = 'paused-ui';
}
function openFurnace(tx,ty){
  state.uiMode = 'furnace'; state.furnaceTarget = { tx, ty };
  state.furnaceInput = null; state.furnaceFuel = null; state.furnaceOutput = null;
  state.furnaceProgress = 0; state.furnaceBurning = false;
  state.showRecipes = false; state.gameState = 'paused-ui';
}
function openChest(tx,ty){
  const arr = ensureChest(tx,ty);
  state.uiMode = 'chest'; state.chestSlots = arr; state.chestTarget = { tx, ty };
  state.showRecipes = false; state.gameState = 'paused-ui';
}
function openRecipes(){ state.showRecipes = true; state.recipePage = 0; }

function closeUI(){
  if(state.showRecipes){ state.showRecipes = false; return; }
  // Возврат предметов с сохранением прочности
  for(const s of state.uiCraftSlots) if(s) addToInventory(s.type, s.count, s.durability);
  if(state.uiCraftResult) addToInventory(state.uiCraftResult.type, state.uiCraftResult.count, state.uiCraftResult.durability);
  state.uiCraftSlots = []; state.uiCraftResult = null;
  if(state.uiMode === 'furnace'){
    if(state.furnaceInput){ addToInventory(state.furnaceInput.type, state.furnaceInput.count, state.furnaceInput.durability); state.furnaceInput = null; }
    if(state.furnaceFuel){ addToInventory(state.furnaceFuel.type, state.furnaceFuel.count, state.furnaceFuel.durability); state.furnaceFuel = null; }
    if(state.furnaceOutput){ addToInventory(state.furnaceOutput.type, state.furnaceOutput.count, state.furnaceOutput.durability); state.furnaceOutput = null; }
  }
  state.chestSlots = null; state.chestTarget = null;
  state.uiMode = null;
  if(state.gameState === 'paused-ui') state.gameState = 'playing';
}

function layoutUI(){
  const S = 44, G = 4, pad = 20;
  const rects = {};
  let panel = null;
  if(!state.uiMode) return { rects, panel, slotSize: S };

  const isTable = state.uiMode === 'table';
  const isFurnace = state.uiMode === 'furnace';
  const isChest = state.uiMode === 'chest';
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
  if(!isChest) rects['btn_recipes'] = [panelX + panelW - 40 - 8 - 130, panelY + 10, 130, 30];

  const startX = panelX + pad;
  let cy = panelY + pad + 40;

  if(isChest){
    for(let r=0;r<CHEST_ROWS;r++) for(let c=0;c<INV_COLS;c++)
      rects[`chest_${r*INV_COLS+c}`] = [startX + c*(S+G), cy + r*(S+G), S, S];
    cy += CHEST_ROWS*(S+G) - G + 16;
  } else if(isFurnace){
    rects['furnace_input'] = [startX, cy, S, S];
    rects['furnace_fuel'] = [startX, cy + S + 8, S, S];
    rects['furnace_progress'] = [startX + S + 20, cy + S/2 - 10, 60, 20];
    rects['furnace_output'] = [startX + S + 100, cy, S, S];
    cy += S*2 + 16 + 20;
  } else {
    for(let r=0;r<craftSize;r++) for(let c=0;c<craftSize;c++)
      rects[`craft_${r*craftSize+c}`] = [startX + c*(S+G), cy + r*(S+G), S, S];
    const resultX = startX + craftW + 40;
    const resultY = cy + (craftSize*(S+G) - G - S)/2;
    rects['result'] = [resultX, resultY, S, S];
    rects['btn_craft'] = [resultX + S + 20, resultY + (S-30)/2, 120, 30];
    cy += craftSize*(S+G) - G + 20;
  }

  for(let r=0;r<INV_ROWS;r++) for(let c=0;c<INV_COLS;c++)
    rects[`inv_${r*INV_COLS+c}`] = [startX + c*(S+G), cy + r*(S+G), S, S];
  cy += INV_ROWS*(S+G) - G + 16;

  for(let c=0;c<HOTBAR_SIZE;c++)
    rects[`hot_${c}`] = [startX + c*(S+G), cy, S, S];

  return { rects, panel, slotSize: S };
}

function getRecipesRects(){
  const cvsW = document.getElementById('game').width;
  const cvsH = document.getElementById('game').height;
  const panelW = Math.min(900, cvsW-80);
  const panelH = Math.min(640, cvsH-80);
  const px = (cvsW - panelW)/2, py = (cvsH - panelH)/2;
  return {
    panel: { x: px, y: py, w: panelW, h: panelH },
    btnClose: { x: px + panelW - 44, y: py + 10, w: 34, h: 34 },
    btnBack:  { x: px + 16, y: py + panelH - 52, w: 120, h: 36 },
    btnPrev:  { x: px + panelW/2 - 110, y: py + panelH - 52, w: 60, h: 36 },
    btnNext:  { x: px + panelW/2 + 50, y: py + panelH - 52, w: 60, h: 36 },
  };
}

function pointInRect(x,y,r){ return x >= r[0] && x <= r[0]+r[2] && y >= r[1] && y <= r[1]+r[3]; }
function pointInObj(x,y,r){ return x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h; }

function getSlotAt(x,y){
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
  if(slotKey.startsWith('chest_') && state.chestSlots) return state.chestSlots[+slotKey.slice(6)];
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
  if(slotKey.startsWith('chest_') && state.chestSlots){ state.chestSlots[+slotKey.slice(6)] = item; return; }
  if(slotKey.startsWith('inv_')){ state.inventory[+slotKey.slice(4)] = item; return; }
  if(slotKey.startsWith('hot_')){ state.hotbar[+slotKey.slice(4)] = item; return; }
  if(slotKey.startsWith('craft_')){ state.uiCraftSlots[+slotKey.slice(6)] = item; return; }
}