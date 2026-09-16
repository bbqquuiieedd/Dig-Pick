// save.js
function slotKey(s){ return SAVE_KEY_PREFIX + s; }
function hasSave(s){ return !!localStorage.getItem(slotKey(s)); }

function serializeItem(s){
  if(!s) return null;
  const out = { type: s.type, count: s.count };
  if(typeof s.durability === 'number') out.durability = s.durability;
  return out;
}
function deserializeItem(s){
  if(!s) return null;
  const item = { type: s.type, count: s.count };
  if(typeof s.durability === 'number') item.durability = s.durability;
  else {
    const def = ITEMS[s.type];
    if(def && def.kind === 'tool' && typeof def.maxDurability === 'number'){
      item.durability = def.maxDurability;
    }
  }
  return item;
}

function saveGame(slot){
  try{
    const chestsCopy = {};
    for(const k in state.chests) chestsCopy[k] = state.chests[k].map(serializeItem);
    const data = {
      version: SAVE_VERSION, timestamp: Date.now(),
      floors: state.floors.map(r => r.slice()),
      objects: state.objects.map(r => r.slice()),
      saplings: { ...state.saplings },
      chests: chestsCopy,
      player: { x: state.player.x, y: state.player.y, facing: { ...state.player.facing } },
      inventory: state.inventory.map(serializeItem),
      hotbar: state.hotbar.map(serializeItem),
      selectedHotbarSlot: state.selectedHotbarSlot,
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch(e){ console.error('Ошибка сохранения:', e); return false; }
}

function loadGame(slot){
  const raw = localStorage.getItem(slotKey(slot));
  if(!raw) return false;
  try{
    const data = JSON.parse(raw);
    if(data.version === 1){ if(!migrateV1(data)) return false; }
    else if(data.version === 2){ if(!migrateV2(data)) return false; }
    else if(data.version === SAVE_VERSION){ if(!loadCurrent(data)) return false; }
    else return false;
    cleanWaterObjects();
    rebuildSolidGrid();
    ensurePlayerNotStuck();
    return true;
  } catch(e){ console.error('Ошибка загрузки:', e); return false; }
}

function loadCurrent(data){
  if(!data.floors || data.floors.length !== WORLD_H) return false;
  state.floors.length = 0;
  for(let y=0;y<WORLD_H;y++) state.floors[y] = data.floors[y].slice(0, WORLD_W);
  state.objects.length = 0;
  for(let y=0;y<WORLD_H;y++){
    state.objects[y] = (data.objects && data.objects[y]) ? data.objects[y].slice(0, WORLD_W) : [];
    if(state.objects[y].length !== WORLD_W) state.objects[y] = new Array(WORLD_W).fill(null);
  }
  for(const k in state.saplings) delete state.saplings[k];
  if(data.saplings) for(const k in data.saplings) state.saplings[k] = data.saplings[k];
  for(const k in state.chests) delete state.chests[k];
  if(data.chests) for(const k in data.chests){
    state.chests[k] = data.chests[k].map(deserializeItem);
  }
  if(data.player){
    state.player.x = data.player.x ?? 12*TILE;
    state.player.y = data.player.y ?? 12*TILE;
    state.player.vx = 0; state.player.vy = 0;
    state.player.facing = data.player.facing ? { ...data.player.facing } : { x: 0, y: 1 };
  }
  if(Array.isArray(data.inventory))
    for(let i=0;i<state.inventory.length;i++) state.inventory[i] = deserializeItem(data.inventory[i]);
  if(Array.isArray(data.hotbar))
    for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = deserializeItem(data.hotbar[i]);
  state.selectedHotbarSlot = data.selectedHotbarSlot ?? 0;
  return true;
}

const V1_MIGRATION = {
  0:{f:F_GRASS,o:null}, 1:{f:F_DIRT,o:null}, 2:{f:F_DIRT,o:O_STONE}, 3:{f:F_DIRT,o:O_STONE},
  4:{f:F_GRASS,o:O_TRUNK}, 5:{f:F_GRASS,o:O_STONE}, 6:{f:F_SAND,o:null}, 7:{f:F_WATER,o:null},
  8:{f:F_FLOWERS,o:null}, 9:{f:F_TALLGRASS,o:null}, 10:{f:F_GRAVEL,o:null},
};
const V1_ITEM_MIGRATION = { 0:0,1:1,6:2,7:3,8:4,9:5,10:6,2:10,3:10,4:I_LOG,5:10,100:I_WOOD_PICK,101:I_WOOD_AXE };

function migrateV1(data){
  if(!data.world || data.world.length !== WORLD_H) return false;
  state.floors.length = 0; state.objects.length = 0;
  for(let y=0;y<WORLD_H;y++){
    state.floors[y] = []; state.objects[y] = [];
    for(let x=0;x<WORLD_W;x++){
      const m = V1_MIGRATION[data.world[y][x]] || { f: F_DIRT, o: null };
      state.floors[y][x] = m.f; state.objects[y][x] = m.o;
    }
  }
  if(data.player){
    state.player.x = data.player.x ?? 12*TILE;
    state.player.y = data.player.y ?? 12*TILE;
    state.player.vx = 0; state.player.vy = 0;
    state.player.facing = { x: 0, y: 1 };
  }
  const oldInv = Array.isArray(data.inventory) ? data.inventory : [];
  for(let i=0;i<state.inventory.length;i++) state.inventory[i] = null;
  for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = null;
  for(let i=0;i<Math.min(10,oldInv.length);i++){
    const s = oldInv[i]; if(!s) continue;
    state.hotbar[i] = makeItemStack(V1_ITEM_MIGRATION[s.type] ?? s.type, s.count);
  }
  for(let i=10;i<Math.min(40,oldInv.length);i++){
    const s = oldInv[i]; if(!s) continue;
    state.inventory[i-10] = makeItemStack(V1_ITEM_MIGRATION[s.type] ?? s.type, s.count);
  }
  state.selectedHotbarSlot = data.selectedSlot ?? 0;
  return true;
}

const V2_MIGRATION = { 10:O_STONE, 11:O_STONE, 12:O_TRUNK, 13:O_STONE, 14:O_IRON_ORE, 15:O_IRON_ORE, 16:O_STONE };

function migrateV2(data){
  if(!data.floors || data.floors.length !== WORLD_H) return false;
  state.floors.length = 0;
  for(let y=0;y<WORLD_H;y++) state.floors[y] = data.floors[y].slice(0, WORLD_W);
  state.objects.length = 0;
  for(let y=0;y<WORLD_H;y++){
    state.objects[y] = [];
    for(let x=0;x<WORLD_W;x++){
      const oldObj = data.objects && data.objects[y] ? data.objects[y][x] : null;
      if(oldObj === null || oldObj === undefined){ state.objects[y][x] = null; continue; }
      state.objects[y][x] = V2_MIGRATION[oldObj] !== undefined ? V2_MIGRATION[oldObj] : null;
    }
  }
  if(data.player){
    state.player.x = data.player.x ?? 12*TILE;
    state.player.y = data.player.y ?? 12*TILE;
    state.player.vx = 0; state.player.vy = 0;
    state.player.facing = { x: 0, y: 1 };
  }
  const oldInv = Array.isArray(data.inventory) ? data.inventory : [];
  for(let i=0;i<state.inventory.length;i++) state.inventory[i] = null;
  for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = null;
  for(let i=0;i<10 && i<oldInv.length;i++){
    const s = oldInv[i]; if(!s) continue;
    state.hotbar[i] = makeItemStack(s.type, s.count);
  }
  for(let i=10;i<40 && i<oldInv.length;i++){
    const s = oldInv[i]; if(!s) continue;
    state.inventory[i-10] = makeItemStack(s.type, s.count);
  }
  state.selectedHotbarSlot = data.selectedSlot ?? 0;
  return true;
}

function deleteSave(slot){ localStorage.removeItem(slotKey(slot)); }

function getSaveInfo(slot){
  const raw = localStorage.getItem(slotKey(slot));
  if(!raw) return null;
  try{
    const d = JSON.parse(raw);
    if(!d.timestamp) return null;
    const t = new Date(d.timestamp), p = n => String(n).padStart(2, '0');
    const v = d.version === 1 ? ' (v1)' : d.version === 2 ? ' (v2)' : '';
    return `${p(t.getDate())}.${p(t.getMonth()+1)}.${t.getFullYear()} ${p(t.getHours())}:${p(t.getMinutes())}${v}`;
  } catch { return null; }
}

function showAutosaveToast(){
  const el = document.getElementById('autosave-toast');
  if(!el) return;
  el.classList.remove('hidden');
  if(state.autosaveToastTimer) clearTimeout(state.autosaveToastTimer);
  state.autosaveToastTimer = setTimeout(() => el.classList.add('hidden'), 1500);
}

function startAutosave(){
  stopAutosave();
  if(!settings.autosaveMinutes) return;
  const interval = settings.autosaveMinutes * 60 * 1000;
  state.autosaveTimer = setInterval(() => {
    if(state.gameState === 'playing' && state.currentSlot !== null){
      if(saveGame(state.currentSlot)) showAutosaveToast();
    }
  }, interval);
}
function stopAutosave(){
  if(state.autosaveTimer){ clearInterval(state.autosaveTimer); state.autosaveTimer = null; }
}