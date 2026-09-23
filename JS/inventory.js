// inventory.js
function resetInventory(){
  for(let i=0;i<state.inventory.length;i++) state.inventory[i] = null;
  for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = null;
  state.selectedHotbarSlot = 0;
}

function isStackable(id){
  const it = ITEMS[id];
  if(!it) return false;
  if(it.kind === 'tool') return false;
  if(typeof it.maxDurability === 'number') return false;
  return true;
}

function tryStack(arr, type, count){
  if(!isStackable(type)) return false;
  for(const s of arr){
    if(s && s.type === type && s.count < 99){
      const free = 99 - s.count;
      const add = Math.min(free, count);
      s.count += add;
      count -= add;
      if(count <= 0) return true;
    }
  }
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

// Возвращает true, если удалось положить всё.
function addToInventory(type, count = 1, durability = undefined){
  // 1) Стакаем в существующие стеки
  if(isStackable(type)){
    if(tryStack(state.hotbar, type, count)) return true;
    if(tryStack(state.inventory, type, count)) return true;
  }

  // 2) Оставшееся — в пустые слоты
  const def = ITEMS[type];
  const isTool = def && def.kind === 'tool';
  while(count > 0){
    const chunk = isTool ? 1 : Math.min(99, count);
    const item = makeItemStack(type, chunk, durability);
    if(tryEmpty(state.hotbar, item)) { count -= chunk; continue; }
    if(tryEmpty(state.inventory, item)) { count -= chunk; continue; }
    return false;
  }
  return true;
}

function getSelectedTool(){
  const s = state.hotbar[state.selectedHotbarSlot];
  if(!s) return null;
  const it = ITEMS[s.type];
  if(it && it.kind === 'tool') return { tool: it.tool, tier: it.tier };
  return null;
}

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