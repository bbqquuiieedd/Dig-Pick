// inventory.js
function resetInventory(){
  for(let i=0;i<state.inventory.length;i++) state.inventory[i] = null;
  for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = null;
  state.selectedHotbarSlot = 0;
}

function isStackable(id){ const it = ITEMS[id]; return !(it && it.kind === 'tool'); }

function tryStack(arr, type, count){
  if(!isStackable(type)) return false;
  for(const s of arr) if(s && s.type === type && s.count < 99){ s.count += count; return true; }
  return false;
}

function tryEmpty(arr, item){
  for(let i=0;i<arr.length;i++){
    if(!arr[i]){ arr[i] = item; return true; }
  }
  return false;
}

// Создаёт новый элемент с полями (durability для инструментов)
function makeItemStack(type, count, durability){
  const def = ITEMS[type];
  const item = { type, count };
  if(def && def.kind === 'tool' && typeof def.maxDurability === 'number'){
    item.durability = (typeof durability === 'number') ? durability : def.maxDurability;
  }
  return item;
}

function addToInventory(type, count = 1, durability = undefined){
  // Стек для обычных
  if(isStackable(type) && tryStack(state.hotbar, type, count)) return true;
  if(isStackable(type) && tryStack(state.inventory, type, count)) return true;
  // Пустой слот
  const item = makeItemStack(type, count, durability);
  if(tryEmpty(state.hotbar, item)) return true;
  if(tryEmpty(state.inventory, item)) return true;
  return false;
}

function getSelectedTool(){
  const s = state.hotbar[state.selectedHotbarSlot];
  if(!s) return null;
  const it = ITEMS[s.type];
  if(it && it.kind === 'tool') return { tool: it.tool, tier: it.tier };
  return null;
}

// Уменьшает прочность инструмента в руке; при 0 — ломает
function damageTool(){
  const slot = state.hotbar[state.selectedHotbarSlot];
  if(!slot) return;
  const it = ITEMS[slot.type];
  if(!it || it.kind !== 'tool') return;
  if(typeof slot.durability !== 'number') slot.durability = it.maxDurability;
  slot.durability--;
  if(slot.durability <= 0){
    state.hotbar[state.selectedHotbarSlot] = null;
    if(typeof showToast === 'function') showToast(`${it.name} сломан`);
  }
}