// input.js — клавиатура, мышь, drag-and-drop, выброс

const RU = { 'ц':'w', 'ф':'a', 'ы':'s', 'в':'d' };

let lastLeftClickTime = 0;
let lastLeftClickSlot = null;
const DOUBLE_CLICK_MS = 500;

let pendingAttack = false;
let mousedownTime = 0;
const CLICK_THRESHOLD_MS = 250;

let qPressedTime = 0;
let qIsHeld = false;
const Q_HOLD_THRESHOLD = 400;

// ============================================================
// KEYBIND
// ============================================================
function applyKeybind(code){
  if(!state.keybindWaiting) return;
  const action = state.keybindWaiting;
  for(const a in settings.keybinds){
    if(a !== action && settings.keybinds[a] === code){
      settings.keybinds[a] = settings.keybinds[action];
      break;
    }
  }
  settings.keybinds[action] = code;
  saveSettings();
  state.keybindWaiting = null;
  document.dispatchEvent(new CustomEvent('keybindApplied'));
}

function cancelKeybind(){
  state.keybindWaiting = null;
  document.dispatchEvent(new CustomEvent('keybindCancelled'));
}

function showTooltipForSlot(){
  const slot = state.hotbar[state.selectedHotbarSlot];
  if(!slot) return;
  const def = ITEMS[slot.type];
  if(!def) return;
  state.tooltipName = def.name;
  state.tooltipTimer = state.tooltipMax;
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
function initInput(){
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  const canvas = document.getElementById('game');
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('dblclick', onDoubleClick);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', onWheel, { passive: false });
}

function onKeyDown(e){
  const code = e.code || '';
  const key = (e.key || '').toLowerCase();

  if(document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if(typeof debugIsOpen === 'function' && debugIsOpen()) return;

  if(state.keybindWaiting){
    e.preventDefault();
    if(code === 'Escape'){ cancelKeybind(); return; }
    if(code) applyKeybind(code);
    return;
  }

  if(code) state.keys[code] = true;
  if(key) state.keys[key] = true;
  if(RU[key]) state.keys[RU[key]] = true;
  if(code === 'Space' || key === ' ') e.preventDefault();

  if(code === 'Escape' || key === 'escape'){
    if(state.showRecipes){ state.showRecipes = false; return; }
    if(state.uiMode){ closeUI(); return; }
    const menuSettings = document.getElementById('menu-settings');
    if(menuSettings && !menuSettings.classList.contains('hidden')){
      document.dispatchEvent(new CustomEvent('closeSettings'));
      return;
    }
    if(state.gameState === 'playing') document.dispatchEvent(new CustomEvent('pauseGame'));
    else if(state.gameState === 'paused') document.dispatchEvent(new CustomEvent('resumeGame'));
    return;
  }

  const invCode = settings.keybinds.inventory;
  if(code === invCode || (invCode === 'Tab' && key === 'tab')){
    e.preventDefault();
    if(state.gameState === 'playing' || state.gameState === 'paused-ui'){
      if(state.showRecipes) return;
      if(state.uiMode === 'inventory') closeUI();
      else if(!state.uiMode) openInventory();
    }
    return;
  }

  // Q — выброс
  const dropCode = settings.keybinds.dropItem || 'KeyQ';
  if(code === dropCode && !qIsHeld){
    qIsHeld = true;
    qPressedTime = Date.now();
    return;
  }

  if(state.gameState !== 'playing') return;

  if(code.startsWith('Digit')){
    const n = parseInt(code.slice(5), 10);
    if(n >= 1 && n <= 9){ state.selectedHotbarSlot = n - 1; showTooltipForSlot(); }
    else if(n === 0){ state.selectedHotbarSlot = 9; showTooltipForSlot(); }
  }
  if(e.key >= '1' && e.key <= '9'){ state.selectedHotbarSlot = +e.key - 1; showTooltipForSlot(); }
  if(e.key === '0'){ state.selectedHotbarSlot = 9; showTooltipForSlot(); }
}

function onKeyUp(e){
  const code = e.code || '', key = (e.key || '').toLowerCase();
  if(code) state.keys[code] = false;
  if(key) state.keys[key] = false;
  if(RU[key]) state.keys[RU[key]] = false;

  const dropCode = settings.keybinds.dropItem || 'KeyQ';
  if(code === dropCode && qIsHeld){
    qIsHeld = false;
    const held = Date.now() - qPressedTime;
    if(state.gameState === 'playing' && !state.uiMode && !state.showRecipes){
      if(held < Q_HOLD_THRESHOLD){
        dropSelectedItem(false);
      } else {
        dropSelectedItem(true);
      }
    }
  }
}

function onMouseMove(e){
  const canvas = e.currentTarget;
  const r = canvas.getBoundingClientRect();
  state.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  state.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  if(state.dragging){
    state.dragging.x = state.mouse.x;
    state.dragging.y = state.mouse.y;
  }
}

function onMouseDown(e){
  // ============================================================
  // ЛКМ
  // ============================================================
  if(e.button === 0){
    state.mouse.left = true;
    if(state.uiMode || state.showRecipes){
      handleLeftClick();
      return;
    }
    const { tx, ty } = mouseTile();
    let hitBlock = false;
    if(inBounds(tx, ty) && inReach(tx, ty)){
      if(state.objects[ty][tx] !== null) hitBlock = true;
      else if(state.floors[ty][tx] === F_BEDROCK) hitBlock = true;
      else if(state.floors[ty][tx] === F_GRAVEL) hitBlock = true;
    }
    if(hitBlock){
      pendingAttack = false;
    } else {
      pendingAttack = true;
      mousedownTime = Date.now();
    }
  }

  // ============================================================
  // ПКМ
  // ============================================================
  if(e.button === 2){
    state.mouse.right = true;
    state.placingCooldown = 0;

    if(state.uiMode || state.showRecipes){
      handleRightClick();
      return;
    }

    // 1) Клик по интерактивному блоку — обрабатываем МГНОВЕННО
    if(handleRightClickOnBlock()) return;

    // 2) Клик по сущности — взаимодействие
    if(tryInteract()) return;

    // 3) Иначе — мышь остаётся right=true, updatePlacing сработает для установки
  }
  e.preventDefault();
}

// ============================================================
// ОБРАБОТКА ПКМ ПО ИНТЕРАКТИВНОМУ БЛОКУ
// ============================================================
function handleRightClickOnBlock(){
  const { tx, ty } = mouseTile();
  if(!inBounds(tx, ty) || !inReach(tx, ty)) return false;

  const oid = state.objects[ty][tx];
  if(oid === null) return false;

  const objItem = ITEMS[oid];
  if(!objItem || !objItem.interactive) return false;

  // Замок — только для НЕ-дверей
  const isDoor = (oid === O_DOOR || oid === O_GATE);
  const lockedKey = `${tx},${ty}`;
  if(!isDoor && state.lockedBlocks && state.lockedBlocks[lockedKey]){
    if(typeof showToast === 'function') showToast('Это чужое');
    return true;
  }

  // Клик по костру с кресалом в руке — зажигаем
  const slot = state.hotbar[state.selectedHotbarSlot];
  const item = slot ? ITEMS[slot.type] : null;
  if(item && item.kind === 'tool' && item.tool === 'flintsteel' && oid === O_CAMPFIRE){
    state.objects[ty][tx] = O_CAMPFIRE_LIT;
    state.campfireLitAt[`${tx},${ty}`] = Date.now();
    damageTool();
    return true;
  }

  if(objItem.interactive === 'table'){ openTable(tx, ty); return true; }
  if(objItem.interactive === 'furnace'){ openFurnace(tx, ty); return true; }
  if(objItem.interactive === 'chest'){ openChest(tx, ty); return true; }
  if(objItem.interactive === 'campfire'){ openCampfire(tx, ty); return true; }
  if(objItem.interactive === 'door'){ toggleDoor(tx, ty); return true; }
  if(objItem.interactive === 'gate'){ toggleGate(tx, ty); return true; }
  if(objItem.interactive === 'bed'){ trySleep(tx, ty); return true; }
  if(objItem.interactive === 'cake'){
    const key = `${tx},${ty}`;
    state.cakeBites[key] = (state.cakeBites[key] || 0) + 1;
    state.player.hunger = Math.min(PLAYER_MAX_HUNGER, state.player.hunger + 1);
    state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + 1);
    if(state.cakeBites[key] >= 10){
      state.objects[ty][tx] = null;
      delete state.cakeBites[key];
      updateSolidAt(tx, ty);
    }
    return true;
  }

  return false;
}

function onMouseUp(e){
  if(e.button === 0){
    state.mouse.left = false;
    if(state.uiMode || state.showRecipes){
      handleLeftRelease();
    } else if(pendingAttack){
      const held = Date.now() - mousedownTime;
      if(held < CLICK_THRESHOLD_MS){
        tryAttack();
      }
      pendingAttack = false;
    }
  }
  if(e.button === 2){
    state.mouse.right = false;
    if(state.uiMode || state.showRecipes) handleRightRelease();
  }
}

function onDoubleClick(e){
  if(!state.uiMode) return;
  const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
  if(!slotKey) return;
  if(slotKey === 'result' || slotKey.startsWith('btn_') || slotKey === 'furnace_progress') return;
  if(slotKey === 'furnace_input' || slotKey === 'furnace_fuel' || slotKey === 'furnace_output') return;

  if(state.dragging && state.dragging.from === slotKey){
    setItemAt(slotKey, state.dragging.item);
    state.dragging = null;
  }
  collectStack(slotKey);
  lastLeftClickTime = 0;
  lastLeftClickSlot = null;
}

function onWheel(e){
  if(state.uiMode === 'trade'){
    const totalPages = Math.max(1, Math.ceil(Math.max(TRADE_SELL.length, TRADE_BUY.length) / 6));
    if(e.deltaY > 0) state.tradePage = Math.min(totalPages - 1, state.tradePage + 1);
    else if(e.deltaY < 0) state.tradePage = Math.max(0, state.tradePage - 1);
    e.preventDefault();
    return;
  }
  if(state.gameState === 'playing' && !state.uiMode && !state.showRecipes){
    state.selectedHotbarSlot = (state.selectedHotbarSlot + (e.deltaY > 0 ? 1 : -1) + HOTBAR_SIZE) % HOTBAR_SIZE;
    showTooltipForSlot();
  }
  e.preventDefault();
}

// ============================================================
// ВЫБРОС
// ============================================================
function dropSelectedItem(wholeStack){
  const slot = state.hotbar[state.selectedHotbarSlot];
  if(!slot) return;

  const angle = Math.atan2(state.player.facing.y, state.player.facing.x);
  const dropX = state.player.x + Math.cos(angle) * TILE * 1.2;
  const dropY = state.player.y + Math.sin(angle) * TILE * 1.2;

  if(wholeStack || slot.count === 1){
    spawnFloorItem(dropX, dropY, { type: slot.type, count: slot.count, durability: slot.durability });
    state.hotbar[state.selectedHotbarSlot] = null;
  } else {
    spawnFloorItem(dropX, dropY, { type: slot.type, count: 1, durability: slot.durability });
    slot.count--;
  }
}

// ============================================================
// UI-КЛИКИ
// ============================================================
function handleLeftClick(){
  if(state.showRecipes){
    const r = getRecipesRects();
    if(pointInObj(state.mouse.x, state.mouse.y, r.btnClose) || pointInObj(state.mouse.x, state.mouse.y, r.btnBack)){
      state.showRecipes = false; return;
    }
    if(pointInObj(state.mouse.x, state.mouse.y, r.btnPrev)){ if(state.recipePage > 0) state.recipePage--; return; }
    if(pointInObj(state.mouse.x, state.mouse.y, r.btnNext)){
      const totalPages = Math.max(1, Math.ceil(ALL_RECIPES_VIEW.length / RECIPE_PAGE_SIZE));
      if(state.recipePage < totalPages - 1) state.recipePage++;
      return;
    }
    return;
  }
  if(!state.uiMode) return;
  const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
  if(!slotKey) return;

  if(slotKey === 'btn_close'){ closeUI(); return; }
  if(slotKey === 'btn_recipes'){ openRecipes(); return; }
  if(slotKey === 'btn_craft'){ tryCraft(); return; }

  if(state.uiMode === 'trade'){
    if(slotKey.startsWith('trade_sell_') || slotKey.startsWith('trade_buy_')){
      handleTradeClick(slotKey);
    }
    return;
  }

  if(slotKey === 'result'){
    if(state.uiCraftResult){
      if(addToInventory(state.uiCraftResult.type, state.uiCraftResult.count, state.uiCraftResult.durability)) state.uiCraftResult = null;
    }
    return;
  }

  const now = Date.now();
  const isDouble = slotKey === lastLeftClickSlot && (now - lastLeftClickTime) < DOUBLE_CLICK_MS;

  if(isDouble){
    lastLeftClickTime = 0;
    lastLeftClickSlot = null;
    if(state.dragging && state.dragging.from === slotKey){
      setItemAt(slotKey, state.dragging.item);
      state.dragging = null;
    }
    collectStack(slotKey);
    return;
  }

  lastLeftClickTime = now;
  lastLeftClickSlot = slotKey;

  const item = getItemAt(slotKey);
  if(!item) return;

  state.dragging = {
    item: { ...item },
    from: slotKey,
    x: state.mouse.x,
    y: state.mouse.y,
    rightMode: false
  };
  setItemAt(slotKey, null);
}

function handleLeftRelease(){
  if(state.showRecipes) return;
  if(!state.uiMode || !state.dragging) return;
  if(state.dragging.rightMode) return;

  const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
  const droppedOutside = (!slotKey || slotKey.startsWith('btn_') || slotKey === 'furnace_progress');

  if(droppedOutside){
    if(state.gameState === 'paused-ui'){
      setItemAt(state.dragging.from, state.dragging.item);
    } else {
      const angle = Math.atan2(state.player.facing.y, state.player.facing.x);
      spawnFloorItem(state.player.x + Math.cos(angle) * TILE * 1.2,
                     state.player.y + Math.sin(angle) * TILE * 1.2,
                     state.dragging.item);
    }
    state.dragging = null;
    return;
  }

  if(slotKey === 'result'){
    setItemAt(state.dragging.from, state.dragging.item);
    state.dragging = null;
    return;
  }

  const existing = getItemAt(slotKey);
  const dragging = state.dragging.item;

  if(existing && isStackable(dragging.type) && existing.type === dragging.type){
    const free = 99 - existing.count;
    const take = Math.min(free, dragging.count);
    existing.count += take;
    dragging.count -= take;
    if(dragging.count <= 0){
      if(state.dragging.from === 'result') state.uiCraftResult = null;
      state.dragging = null;
      return;
    }
    if(state.dragging.from === 'result') state.uiCraftResult = dragging;
    else setItemAt(state.dragging.from, dragging);
    state.dragging = null;
    return;
  }

  setItemAt(slotKey, dragging);
  if(existing){
    if(state.dragging.from === 'result') state.uiCraftResult = existing;
    else setItemAt(state.dragging.from, existing);
  }
  state.dragging = null;
}

function handleRightClick(){
  if(state.showRecipes) return;
  if(!state.uiMode) return;
  const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
  if(!slotKey) return;
  if(slotKey.startsWith('btn_') || slotKey === 'result' || slotKey === 'furnace_progress') return;
  if(state.uiMode === 'trade') return;
  const item = getItemAt(slotKey);
  if(!item) return;

  state.dragging = {
    item: { type: item.type, count: 1, durability: item.durability },
    from: slotKey,
    x: state.mouse.x,
    y: state.mouse.y,
    rightMode: true
  };
  item.count--;
  if(item.count <= 0) setItemAt(slotKey, null);
}

function handleRightRelease(){
  if(state.showRecipes) return;
  if(!state.dragging || !state.dragging.rightMode) return;

  const dragging = state.dragging.item;
  const fromKey = state.dragging.from;

  const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
  const isSlot = slotKey && !slotKey.startsWith('btn_') &&
                 slotKey !== 'furnace_progress' &&
                 slotKey !== 'result' &&
                 slotKey !== fromKey;

  if(isSlot){
    const existing = getItemAt(slotKey);
    if(existing && existing.type === dragging.type && existing.count < 99){
      existing.count++;
      dragging.count--;
    } else if(!existing){
      setItemAt(slotKey, { type: dragging.type, count: 1, durability: dragging.durability });
      dragging.count--;
    }
  }

  if(dragging.count > 0){
    const origin = getItemAt(fromKey);
    if(origin && origin.type === dragging.type && origin.count < 99){
      const free = 99 - origin.count;
      const take = Math.min(free, dragging.count);
      origin.count += take;
      dragging.count -= take;
    }
    if(dragging.count > 0 && !origin){
      setItemAt(fromKey, { type: dragging.type, count: dragging.count, durability: dragging.durability });
      dragging.count = 0;
    }
    if(dragging.count > 0) addToInventory(dragging.type, dragging.count, dragging.durability);
  }
  state.dragging = null;
}

// ============================================================
// ТОРГОВЛЯ
// ============================================================
function handleTradeClick(slotKey){
  const isSell = slotKey.startsWith('trade_sell_');
  const idx = parseInt(slotKey.replace('trade_sell_', '').replace('trade_buy_', ''), 10);
  const list = isSell ? TRADE_SELL : TRADE_BUY;
  const entry = list[idx];
  if(!entry) return;

  if(isSell){
    if(!hasItemInInventory(entry.input, entry.count)){
      if(typeof showToast === 'function') showToast('Не хватает ' + ITEMS[entry.input].name);
      return;
    }
    removeItemsFromInventory(entry.input, entry.count);
    addToInventory(I_EMERALD, entry.price);
    if(typeof showToast === 'function') showToast('+' + entry.price + ' изумруд(ов)');
  } else {
    if(!hasItemInInventory(I_EMERALD, entry.price)){
      if(typeof showToast === 'function') showToast('Не хватает изумрудов');
      return;
    }
    removeItemsFromInventory(I_EMERALD, entry.price);
    if(!addToInventory(entry.output, entry.count)){
      if(typeof showToast === 'function') showToast('Инвентарь полон');
      addToInventory(I_EMERALD, entry.price);
      return;
    }
    if(typeof showToast === 'function') showToast('Куплено: ' + ITEMS[entry.output].name);
  }
}

function hasItemInInventory(type, count){
  let total = 0;
  for(const s of state.inventory) if(s && s.type === type) total += s.count;
  for(const s of state.hotbar) if(s && s.type === type) total += s.count;
  return total >= count;
}

function removeItemsFromInventory(type, count){
  for(let i=0;i<state.inventory.length && count > 0;i++){
    const s = state.inventory[i];
    if(s && s.type === type){
      const take = Math.min(s.count, count);
      s.count -= take;
      count -= take;
      if(s.count <= 0) state.inventory[i] = null;
    }
  }
  for(let i=0;i<state.hotbar.length && count > 0;i++){
    const s = state.hotbar[i];
    if(s && s.type === type){
      const take = Math.min(s.count, count);
      s.count -= take;
      count -= take;
      if(s.count <= 0) state.hotbar[i] = null;
    }
  }
}

// ============================================================
// СБОРКА СТАКОВ
// ============================================================
function collectStack(slotKey){
  if(!slotKey) return;
  if(slotKey === 'result' || slotKey.startsWith('btn_') || slotKey === 'furnace_progress') return;
  if(slotKey === 'furnace_input' || slotKey === 'furnace_fuel' || slotKey === 'furnace_output') return;

  const targetItem = getItemAt(slotKey);
  if(!targetItem) return;
  if(!isStackable(targetItem.type)) return;

  const type = targetItem.type;
  let homeArr = null, idx = 0;
  if(slotKey.startsWith('chest_') && state.chestSlots){
    homeArr = state.chestSlots; idx = parseInt(slotKey.slice(6), 10);
  } else if(slotKey.startsWith('inv_')){
    homeArr = state.inventory; idx = parseInt(slotKey.slice(4), 10);
  } else if(slotKey.startsWith('hot_')){
    homeArr = state.hotbar; idx = parseInt(slotKey.slice(4), 10);
  }
  if(!homeArr) return;

  const pools = [];
  if(state.chestSlots) pools.push(state.chestSlots);
  pools.push(state.inventory);
  pools.push(state.hotbar);

  let total = 0;
  for(const arr of pools){
    for(let i=0;i<arr.length;i++){
      const s = arr[i];
      if(s && s.type === type){ total += s.count; arr[i] = null; }
    }
  }
  if(total <= 0) return;

  const orderedPools = [homeArr, ...pools.filter(p => p !== homeArr)];
  if(idx >= 0 && idx < homeArr.length){
    const chunk = Math.min(99, total);
    homeArr[idx] = { type, count: chunk };
    total -= chunk;
  }
  for(const arr of orderedPools){
    for(let i=0;i<arr.length;i++){
      if(total <= 0) break;
      if(arr[i]) continue;
      if(arr === homeArr && i === idx) continue;
      const chunk = Math.min(99, total);
      arr[i] = { type, count: chunk };
      total -= chunk;
    }
    if(total <= 0) break;
  }
  if(total > 0) addToInventory(type, total);
}

function tryRightDragPlace(slotKey){ /* отключено */ }