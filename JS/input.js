// input.js
const RU = { 'ц':'w', 'ф':'a', 'ы':'s', 'в':'d' };

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

function initInput(){
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  const canvas = document.getElementById('game');
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', onWheel, { passive: false });
}

function onKeyDown(e){
  // Игнорируем, если пользователь печатает в input
  if(document.activeElement && document.activeElement.tagName === 'INPUT'){
    return;
  }
  const code = e.code || '';
  const key = (e.key || '').toLowerCase();

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

  if(state.gameState !== 'playing') return;
  if(code.startsWith('Digit')){
    const n = parseInt(code.slice(5), 10);
    if(n >= 1 && n <= 9) state.selectedHotbarSlot = n - 1;
    else if(n === 0) state.selectedHotbarSlot = 9;
  }
  if(e.key >= '1' && e.key <= '9') state.selectedHotbarSlot = +e.key - 1;
  if(e.key === '0') state.selectedHotbarSlot = 9;
}

// onKeyUp, onMouseMove, onMouseDown, onMouseUp, onWheel — как было.

// handleLeftClick, handleLeftRelease, handleRightClick, handleRightRelease,
// tryRightDragPlace — как было, но БЕЗ export.

function onKeyUp(e){
  const code = e.code || '', key = (e.key || '').toLowerCase();
  if(code) state.keys[code] = false;
  if(key) state.keys[key] = false;
  if(RU[key]) state.keys[RU[key]] = false;
}

function onMouseMove(e){
  const canvas = e.currentTarget;
  const r = canvas.getBoundingClientRect();
  state.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  state.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  if(state.dragging){
    state.dragging.x = state.mouse.x;
    state.dragging.y = state.mouse.y;
    if(state.dragging.rightMode){
      const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
      if(slotKey && slotKey !== state.dragging.lastHoveredSlot){
        state.dragging.lastHoveredSlot = slotKey;
        tryRightDragPlace(slotKey);
      }
    }
  }
}

function onMouseDown(e){
  if(e.button === 0) state.mouse.left = true;
  if(e.button === 2){ state.mouse.right = true; state.placingCooldown = 0; }
  e.preventDefault();
  if(e.button === 0) handleLeftClick();
  if(e.button === 2) handleRightClick();
}

function onMouseUp(e){
  if(e.button === 0){ state.mouse.left = false; handleLeftRelease(); }
  if(e.button === 2){ state.mouse.right = false; handleRightRelease(); }
}

function onWheel(e){
  if(state.gameState === 'playing' && !state.uiMode && !state.showRecipes){
    state.selectedHotbarSlot = (state.selectedHotbarSlot + (e.deltaY > 0 ? 1 : -1) + HOTBAR_SIZE) % HOTBAR_SIZE;
  }
  e.preventDefault();
}

// ============================================================
// Клики
// ============================================================
function handleLeftClick(){
  if(state.showRecipes){
    const r = getRecipesRects();
    if(pointInObj(state.mouse.x, state.mouse.y, r.btnClose) || pointInObj(state.mouse.x, state.mouse.y, r.btnBack)){
      state.showRecipes = false; return;
    }
    if(pointInObj(state.mouse.x, state.mouse.y, r.btnPrev)){ if(state.recipePage > 0) state.recipePage--; return; }
    if(pointInObj(state.mouse.x, state.mouse.y, r.btnNext)){
      const totalPages = Math.max(1, Math.ceil(RECIPES.length / RECIPE_PAGE_SIZE));
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
  if(slotKey === 'result'){
    if(state.uiCraftResult){
      if(addToInventory(state.uiCraftResult.type, state.uiCraftResult.count)) state.uiCraftResult = null;
    }
    return;
  }
  const item = getItemAt(slotKey);
  if(!item) return;
  state.dragging = { item: { ...item }, from: slotKey, x: state.mouse.x, y: state.mouse.y, rightMode: false };
  setItemAt(slotKey, null);
}

function handleLeftRelease(){
  if(state.showRecipes) return;
  if(!state.uiMode || !state.dragging) return;
  if(state.dragging.rightMode) return;
  const slotKey = getSlotAt(state.mouse.x, state.mouse.y);
  if(!slotKey || slotKey.startsWith('btn_') || slotKey === 'furnace_progress'){
    setItemAt(state.dragging.from, state.dragging.item);
    state.dragging = null; return;
  }
  const existing = getItemAt(slotKey);
  if(slotKey === 'result'){
    setItemAt(state.dragging.from, state.dragging.item);
    state.dragging = null; return;
  }
  setItemAt(slotKey, state.dragging.item);
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
  const item = getItemAt(slotKey);
  if(!item) return;
  const take = Math.max(1, Math.floor(item.count / 2));
  if(item.count > take){
    item.count -= take;
    state.dragging = {
      item: { type: item.type, count: take },
      from: slotKey,
      x: state.mouse.x, y: state.mouse.y,
      rightMode: true, lastHoveredSlot: slotKey
    };
  } else {
    state.dragging = {
      item: { type: item.type, count: take },
      from: slotKey,
      x: state.mouse.x, y: state.mouse.y,
      rightMode: true, lastHoveredSlot: slotKey
    };
    setItemAt(slotKey, null);
  }
}

function handleRightRelease(){
  if(state.showRecipes) return;
  if(!state.dragging || !state.dragging.rightMode) return;
  if(state.dragging.item.count > 0){
    const existing = getItemAt(state.dragging.from);
    if(existing && existing.type === state.dragging.item.type && existing.count < 99){
      existing.count += state.dragging.item.count;
    } else if(!existing){
      setItemAt(state.dragging.from, state.dragging.item);
    } else {
      addToInventory(state.dragging.item.type, state.dragging.item.count);
    }
  }
  state.dragging = null;
}

function tryRightDragPlace(slotKey){
  if(!state.dragging || !state.dragging.rightMode) return;
  if(state.dragging.item.count <= 0) return;
  if(slotKey.startsWith('btn_') || slotKey === 'result' || slotKey === 'furnace_progress') return;
  if(slotKey === state.dragging.from) return;
  const existing = getItemAt(slotKey);
  if(!existing){
    setItemAt(slotKey, { type: state.dragging.item.type, count: 1 });
    state.dragging.item.count--;
  } else if(existing.type === state.dragging.item.type && existing.count < 99){
    existing.count++;
    state.dragging.item.count--;
  }
}