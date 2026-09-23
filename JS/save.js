// ============================================================
// save.js — сохранения v5 (мир + сущности + прогресс)
// ============================================================

function slotKey(s){ return SAVE_KEY_PREFIX + s; }
function hasSave(s){ return !!localStorage.getItem(slotKey(s)); }

// ============================================================
// СЕРИАЛИЗАЦИЯ
// ============================================================
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

function serializeAnimal(a){
  return {
    type: a.type, name: a.name,
    x: a.x, y: a.y,
    hp: a.hp, maxHp: a.maxHp,
    sheared: !!a.sheared,
    shearTimer: a.shearTimer || 0,
    milkTimer: a.milkTimer || 0,
    eggTimer: a.eggTimer || 0,
  };
}
function deserializeAnimal(a){
  const def = ANIMAL_DEFS[a.type];
  return {
    type: a.type, name: a.name || def?.name,
    x: a.x, y: a.y,
    dirX: 0, dirY: 0, dirTimer: 0,
    speed: def?.speed || 0.6,
    hp: a.hp, maxHp: a.maxHp,
    hurtTimer: 0,
    sheared: !!a.sheared,
    shearTimer: a.shearTimer || 0,
    milkTimer: a.milkTimer || 0,
    eggTimer: a.eggTimer || 0,
  };
}

function serializeDog(d){
  return {
    x: d.x, y: d.y,
    owner: d.owner,
    hp: d.hp, maxHp: d.maxHp,
    isWolf: !!d.isWolf,
    tameProgress: d.tameProgress || 0,
  };
}
function deserializeDog(d){
  return {
    name: 'Собака',
    x: d.x, y: d.y,
    owner: d.owner || 'wild',
    hp: d.hp, maxHp: d.maxHp,
    dirX: 0, dirY: 0, dirTimer: 0,
    hurtTimer: 0,
    isWolf: !!d.isWolf,
    tameProgress: d.tameProgress || 0,
  };
}

function serializeMob(m){
  return { x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp };
}
function deserializeMob(m){
  return {
    name: 'Тень',
    x: m.x, y: m.y,
    hp: m.hp, maxHp: m.maxHp,
    speed: 1.5,
    hurtTimer: 0,
    attackCooldown: 0,
  };
}

function serializeVillager(v){
  return {
    x: v.x, y: v.y,
    homeX: v.homeX, homeY: v.homeY,
  };
}
function deserializeVillager(v){
  return {
    name: 'Житель',
    x: v.x, y: v.y,
    homeX: v.homeX, homeY: v.homeY,
    dirTimer: 0, dirX: 0, dirY: 0,
    hp: 9999,
  };
}

function serializeFloorItem(f){
  return {
    x: f.x, y: f.y,
    type: f.type, count: f.count,
    durability: f.durability,
    spawnAt: f.spawnAt,
    vy: f.vy || 0,
    lifeTime: f.lifeTime,
  };
}

// ============================================================
// СОХРАНЕНИЕ
// ============================================================
function saveGame(slot){
  try{
    const chestsCopy = {};
    for(const k in state.chests){
      chestsCopy[k] = state.chests[k].map(serializeItem);
    }

    const data = {
      version: SAVE_VERSION,
      timestamp: Date.now(),

      // Мир
      worldSeed: state.worldSeed,
      timeOfDay: state.timeOfDay,
      floors: state.floors.map(r => r.slice()),
      objects: state.objects.map(r => r.slice()),
      saplings: { ...state.saplings },
      chests: chestsCopy,
      lockedBlocks: { ...state.lockedBlocks },
      fireTimers: { ...(state.fireTimers || {}) },
      wateredFarmland: { ...(state.wateredFarmland || {}) },
      campfireLitAt: { ...(state.campfireLitAt || {}) },
      openDoors: { ...(state.openDoors || {}) },
      cakeBites: { ...(state.cakeBites || {}) },

      // Точки спавна
      villagerSpawn: state.villagerSpawn,
      villagerDogSpawn: state.villagerDogSpawn,

      // Игрок
      player: {
        x: state.player.x, y: state.player.y,
        hp: state.player.hp,
        hunger: state.player.hunger,
        spawnX: state.player.spawnX,
        spawnY: state.player.spawnY,
        hasSpawn: state.player.hasSpawn,
        facing: { ...state.player.facing },
      },
      inventory: state.inventory.map(serializeItem),
      hotbar: state.hotbar.map(serializeItem),
      selectedHotbarSlot: state.selectedHotbarSlot,

      // Сущности
      animals: state.animals.map(serializeAnimal),
      dogs: state.dogs.map(serializeDog),
      mobs: state.mobs.map(serializeMob),
      villagers: state.villagers.map(serializeVillager),
      floorItems: state.floorItems.map(serializeFloorItem),
      raccoon: state.raccoon ? {
        x: state.raccoon.x, y: state.raccoon.y,
        state: state.raccoon.state,
        hp: state.raccoon.hp,
        stolenItem: state.raccoon.stolenItem,
      } : null,
    };

    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  }catch(e){
    console.error('Ошибка сохранения:', e);
    return false;
  }
}

// ============================================================
// ЗАГРУЗКА
// ============================================================
function loadGame(slot){
  const raw = localStorage.getItem(slotKey(slot));
  if(!raw) return false;
  try{
    const data = JSON.parse(raw);
    if(data.version !== SAVE_VERSION){
      console.warn('Несовместимая версия сейва:', data.version);
      return false;
    }
    if(!data.floors || data.floors.length !== WORLD_H) return false;

    // ---- Мир ----
    state.floors.length = 0;
    for(let y=0;y<WORLD_H;y++) state.floors[y] = data.floors[y].slice(0, WORLD_W);
    state.objects.length = 0;
    for(let y=0;y<WORLD_H;y++){
      state.objects[y] = (data.objects && data.objects[y]) ? data.objects[y].slice(0, WORLD_W) : [];
      if(state.objects[y].length !== WORLD_W) state.objects[y] = new Array(WORLD_W).fill(null);
    }

    state.worldSeed = data.worldSeed || 12345;
    state.timeOfDay = typeof data.timeOfDay === 'number' ? data.timeOfDay : 0;

    // ---- Саженцы ----
    for(const k in state.saplings) delete state.saplings[k];
    if(data.saplings) for(const k in data.saplings) state.saplings[k] = data.saplings[k];

    // ---- Сундуки ----
    for(const k in state.chests) delete state.chests[k];
    if(data.chests){
      for(const k in data.chests){
        state.chests[k] = data.chests[k].map(deserializeItem);
      }
    }

    // ---- Замки ----
    for(const k in state.lockedBlocks) delete state.lockedBlocks[k];
    if(data.lockedBlocks) for(const k in data.lockedBlocks) state.lockedBlocks[k] = true;

    // ---- Таймеры огня и пр. ----
    state.fireTimers = data.fireTimers ? { ...data.fireTimers } : {};
    state.wateredFarmland = data.wateredFarmland ? { ...data.wateredFarmland } : {};
    state.campfireLitAt = data.campfireLitAt ? { ...data.campfireLitAt } : {};
    state.openDoors = data.openDoors ? { ...data.openDoors } : {};
    state.cakeBites = data.cakeBites ? { ...data.cakeBites } : {};

    // ---- Точки спавна структуры ----
    state.villagerSpawn = data.villagerSpawn || null;
    state.villagerDogSpawn = data.villagerDogSpawn || null;

    // ---- Игрок ----
    if(data.player){
      const p = state.player;
      p.x = data.player.x ?? 12*TILE;
      p.y = data.player.y ?? 12*TILE;
      p.vx = 0; p.vy = 0;
      p.hp = typeof data.player.hp === 'number' ? data.player.hp : PLAYER_MAX_HP;
      p.hunger = typeof data.player.hunger === 'number' ? data.player.hunger : PLAYER_MAX_HUNGER;
      p.spawnX = data.player.spawnX ?? p.x;
      p.spawnY = data.player.spawnY ?? p.y;
      p.hasSpawn = !!data.player.hasSpawn;
      p.facing = data.player.facing ? { ...data.player.facing } : { x: 0, y: 1 };
      p.prevX = p.x; p.prevY = p.y;
      p.renderX = p.x; p.renderY = p.y;
    }

    // ---- Инвентарь ----
    if(Array.isArray(data.inventory)){
      for(let i=0;i<state.inventory.length;i++) state.inventory[i] = deserializeItem(data.inventory[i]);
    }
    if(Array.isArray(data.hotbar)){
      for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = deserializeItem(data.hotbar[i]);
    }
    state.selectedHotbarSlot = data.selectedHotbarSlot ?? 0;

    // ---- Сущности ----
    state.animals = Array.isArray(data.animals) ? data.animals.map(deserializeAnimal) : [];
    state.dogs = Array.isArray(data.dogs) ? data.dogs.map(deserializeDog) : [];
    state.mobs = Array.isArray(data.mobs) ? data.mobs.map(deserializeMob) : [];
    state.villagers = Array.isArray(data.villagers) ? data.villagers.map(deserializeVillager) : [];
    state.floorItems = Array.isArray(data.floorItems)
      ? data.floorItems.map(f => ({
          x: f.x, y: f.y,
          type: f.type, count: f.count,
          durability: f.durability,
          spawnAt: f.spawnAt || Date.now(),
          vy: f.vy || 0,
          lifeTime: f.lifeTime || 5*60*1000,
        }))
      : [];

    // ---- Енот ----
    if(data.raccoon){
      const r = data.raccoon;
      state.raccoon = {
        name: 'Енот',
        x: r.x, y: r.y,
        state: r.state || 'far',
        stealTimer: 5 + Math.random()*5,
        fleeTimer: 0,
        fleeAngle: 0,
        approachTimeout: 0,
        catchCooldown: 0,
        stolenItem: r.stolenItem || null,
        hp: r.hp ?? RACCOON_MAX_HP,
        maxHp: RACCOON_MAX_HP,
        hurtTimer: 0,
        animTime: 0,
      };
    } else {
      state.raccoon = null;
    }

    // Если сущностей нет — например, старый сейв без них — заселим
    if(state.animals.length === 0 && state.villagers.length === 0){
      spawnAllEntities();
    }

    // ---- Сетка ----
    cleanWaterObjects();
    rebuildSolidGrid();
    ensurePlayerNotStuck();
    return true;
  }catch(e){
    console.error('Ошибка загрузки:', e);
    return false;
  }
}

// ============================================================
// СЛУЖЕБНОЕ
// ============================================================
function deleteSave(slot){ localStorage.removeItem(slotKey(slot)); }

function getSaveInfo(slot){
  const raw = localStorage.getItem(slotKey(slot));
  if(!raw) return null;
  try{
    const d = JSON.parse(raw);
    if(!d.timestamp) return null;
    const t = new Date(d.timestamp), p = n => String(n).padStart(2, '0');
    const v = d.version === SAVE_VERSION ? '' : ' (старый)';
    return `${p(t.getDate())}.${p(t.getMonth()+1)}.${t.getFullYear()} ${p(t.getHours())}:${p(t.getMinutes())}${v}`;
  }catch{ return null; }
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