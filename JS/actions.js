// ============================================================
// actions.js — копание, установка, огонь, использование предметов
// ============================================================

// ============================================================
// ТАЙМЕРЫ ОГНЯ — глобальные (для fireTimers, campfireLitAt)
// ============================================================
if(!state.fireTimers) state.fireTimers = {};
if(!state.openDoors) state.openDoors = {};
if(!state.wateredFarmland) state.wateredFarmland = {};
if(!state.campfireLitAt) state.campfireLitAt = {};

// ============================================================
// КОПАНИЕ
// ============================================================
function updateMining(dt){
  if(state.uiMode || state.showRecipes){
    state.miningTarget = null; state.miningProgress = 0;
    return;
  }
  if(!state.mouse.left){
    state.miningTarget = null; state.miningProgress = 0;
    state.miningBlocked = false;
    return;
  }
  const { tx, ty } = mouseTile();
  if(!inBounds(tx,ty) || !inReach(tx,ty)){
    state.miningTarget = null; state.miningProgress = 0;
    return;
  }

  // 1) Объект
  const oid = state.objects[ty][tx];
  if(oid !== null && ITEMS[oid] && ITEMS[oid].hardness){
    const item = ITEMS[oid];
    if(!state.miningTarget || state.miningTarget.tx !== tx || state.miningTarget.ty !== ty){
      state.miningTarget = { tx, ty }; state.miningProgress = 0;
      state.miningBlocked = false;
    }
    const sel = getSelectedTool();
    if(item.requiredTool){
      if(!sel || sel.tool !== item.requiredTool){
        state.miningBlocked = true; state.miningProgress = 0; return;
      }
      if(item.requiredTier && sel.tier < item.requiredTier){
        state.miningBlocked = true; state.miningProgress = 0; return;
      }
    }
    state.miningBlocked = false;
    let speed = 1;
    if(item.speedupTool && sel && sel.tool === item.speedupTool) speed = 3;
    state.miningProgress += (dt*1000*speed)/item.hardness;
    if(state.miningProgress >= 1){
      breakBlock(tx, ty, oid);
      if(item.speedupTool && sel && sel.tool === item.speedupTool) damageTool();
      state.miningTarget = null; state.miningProgress = 0;
    }
    return;
  }

  // 2) Bedrock — только киркой
  if(state.floors[ty][tx] === F_BEDROCK){
    if(!state.miningTarget || state.miningTarget.tx !== tx || state.miningTarget.ty !== ty){
      state.miningTarget = { tx, ty }; state.miningProgress = 0;
      state.miningBlocked = false;
    }
    const sel = getSelectedTool();
    if(!sel || sel.tool !== 'pickaxe'){
      state.miningBlocked = true; state.miningProgress = 0; return;
    }
    state.miningBlocked = false;
    state.miningProgress += (dt*1000*3)/2500;
    if(state.miningProgress >= 1){
      addToInventory(O_STONE, 1);
      damageTool();
      state.miningProgress = 0;
    }
    return;
  }

  // 3) Гравий (пол) — 50% кремень
  if(state.floors[ty][tx] === F_GRAVEL){
    if(!state.miningTarget || state.miningTarget.tx !== tx || state.miningTarget.ty !== ty){
      state.miningTarget = { tx, ty }; state.miningProgress = 0;
      state.miningBlocked = false;
    }
    state.miningProgress += (dt*1000)/1500;
    if(state.miningProgress >= 1){
      if(Math.random() < 0.5){
        spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_FLINT, count: 1 });
      }
      state.floors[ty][tx] = F_DIRT;
      state.miningProgress = 0;
      state.miningTarget = null;
    }
    return;
  }

  state.miningTarget = null; state.miningProgress = 0; state.miningBlocked = false;
}

// ============================================================
// ЛОМАНИЕ БЛОКА — дроп
// ============================================================
function breakBlock(tx, ty, oid){
  if(oid === O_CHEST){
    const key = `${tx},${ty}`;
    if(state.chests[key]){
      for(const s of state.chests[key]) if(s) spawnFloorItem(tx*TILE+16, ty*TILE+16, s);
      delete state.chests[key];
    }
    spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: O_CHEST, count: 1 });
  }
  else if(oid === O_TRUNK){
    spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_LOG, count: 1 });
    if(Math.random() < 0.15){
      spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_APPLE, count: 1 });
    }
    // Саженец если рядом листва
    let hasLeaves = false;
    for(let dy=-3;dy<=1 && !hasLeaves;dy++){
      for(let dx=-2;dx<=2 && !hasLeaves;dx++){
        if(dx === 0 && dy === 0) continue;
        const nx = tx+dx, ny = ty+dy;
        if(!inBounds(nx, ny)) continue;
        if(state.objects[ny][nx] === O_LEAVES) hasLeaves = true;
      }
    }
    if(hasLeaves && Math.random() < 0.5){
      spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: O_SAPLING, count: 1 });
    }
  }
  else if(oid === O_POTATO_PLANT){
    const key = `${tx},${ty}`;
    const plantTime = state.saplings[key];
    const watered = state.wateredFarmland[key];
    const growTime = watered ? 30000 : 60000;
    const ripe = plantTime && (Date.now() - plantTime >= growTime);

    if(ripe){
      spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_POTATO, count: 2 });
    } else {
      spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_POTATO, count: 1 });
    }
    delete state.saplings[key];
    delete state.wateredFarmland[key];
    state.objects[ty][tx] = null;
    updateSolidAt(tx, ty);
    return;
  }
  else if(oid === O_WHEAT){
    spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_WHEAT, count: 2 });
    state.objects[ty][tx] = null;
    updateSolidAt(tx, ty);
    return;
  }
  else if(oid === O_CAMPFIRE || oid === O_CAMPFIRE_LIT){
    spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: O_CAMPFIRE, count: 1 });
    if(state.campfireTarget && state.campfireTarget.tx === tx && state.campfireTarget.ty === ty){
      for(const s of state.campfireSlots) if(s) spawnFloorItem(tx*TILE+16, ty*TILE+16, s);
      state.campfireSlots = new Array(4).fill(null);
    }
    delete state.campfireLitAt[`${tx},${ty}`];
  }
  else if(oid === O_CAKE){
    spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: I_CAKE_ITEM, count: 1 });
    delete state.cakeBites[`${tx},${ty}`];
  }
  else {
    // Обычный дроп
    spawnFloorItem(tx*TILE+16, ty*TILE+16, { type: oid, count: 1 });
  }

  state.objects[ty][tx] = null;
  updateSolidAt(tx, ty);
}

// ============================================================
// УСТАНОВКА / ИСПОЛЬЗОВАНИЕ
// ============================================================
function updatePlacing(dt){
  if(state.placingCooldown > 0){
    state.placingCooldown -= dt;
    if(state.placingCooldown < 0) state.placingCooldown = 0;
  }
  if(state.uiMode || state.showRecipes) return;
  if(!state.mouse.right) return;
  if(state.placingCooldown > 0) return;

  const { tx, ty } = mouseTile();
  if(!inBounds(tx,ty) || !inReach(tx,ty)) return;

  // Замок на чужих блоках
  const lockedKey = `${tx},${ty}`;
  if(state.lockedBlocks && state.lockedBlocks[lockedKey]){
    if(state.objects[ty][tx] !== null){
      if(typeof showToast === 'function') showToast('Это чужое');
      state.placingCooldown = 0.5;
      return;
    }
  }

  const oid = state.objects[ty][tx];
  const objItem = oid !== null ? ITEMS[oid] : null;
  const slot = state.hotbar[state.selectedHotbarSlot];
  const item = slot ? ITEMS[slot.type] : null;

  // ---- Интерактивные объекты ----
  if(objItem && objItem.interactive){
    // Костёр + кресало — зажигаем
    if(item && item.kind === 'tool' && item.tool === 'flintsteel' && oid === O_CAMPFIRE){
      state.objects[ty][tx] = O_CAMPFIRE_LIT;
      state.campfireLitAt[`${tx},${ty}`] = Date.now();
      damageTool();
      state.placingCooldown = 0.3;
      return;
    }
    if(objItem.interactive === 'table'){ openTable(tx, ty); state.placingCooldown = 0.3; return; }
    if(objItem.interactive === 'furnace'){ openFurnace(tx, ty); state.placingCooldown = 0.3; return; }
    if(objItem.interactive === 'chest'){ openChest(tx, ty); state.placingCooldown = 0.3; return; }
    if(objItem.interactive === 'campfire'){ openCampfire(tx, ty); state.placingCooldown = 0.3; return; }
    if(objItem.interactive === 'door'){ toggleDoor(tx, ty); state.placingCooldown = 0.3; return; }
    if(objItem.interactive === 'gate'){ toggleGate(tx, ty); state.placingCooldown = 0.3; return; }
    if(objItem.interactive === 'bed'){ trySleep(tx, ty); state.placingCooldown = 0.3; return; }
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
      state.placingCooldown = 0.4;
      return;
    }
  }

  if(!slot || !item) return;

  // ---- Инструменты ----
  if(item.kind === 'tool'){
    if(item.tool === 'hoe'){
      if((state.floors[ty][tx] === F_GRASS || state.floors[ty][tx] === F_DIRT) && oid === null){
        state.floors[ty][tx] = F_FARMLAND;
        updateSolidAt(tx, ty);
        damageTool();
        state.placingCooldown = 0.3;
      }
      return;
    }
    if(item.tool === 'flintsteel'){
      if(oid === O_TRUNK || oid === O_LEAVES){
        state.floors[ty][tx] = F_FIRE;
        state.fireTimers[`${tx},${ty}`] = Date.now() + FIRE_LIFE_MS;
        updateSolidAt(tx, ty);
        damageTool();
        state.placingCooldown = 0.4;
      }
      return;
    }
    return;
  }

  // ---- Ведро с водой ----
  if(slot.type === I_WATER_BUCKET){
    if(state.floors[ty][tx] === F_FARMLAND){
      state.wateredFarmland[`${tx},${ty}`] = Date.now();
      slot.type = I_BUCKET;
      state.placingCooldown = 0.3;
      return;
    }
    if((state.floors[ty][tx] === F_GRASS || state.floors[ty][tx] === F_DIRT) && oid === null){
      state.floors[ty][tx] = F_WATER;
      slot.type = I_BUCKET;
      updateSolidAt(tx, ty);
      state.placingCooldown = 0.3;
      return;
    }
  }

  // ---- Ведро пустое — набрать воду ----
  if(slot.type === I_BUCKET){
    if(state.floors[ty][tx] === F_WATER){
      slot.type = I_WATER_BUCKET;
      state.placingCooldown = 0.3;
      return;
    }
  }

  // ---- Посадка картофеля ----
  if(slot.type === I_POTATO && state.floors[ty][tx] === F_FARMLAND && oid === null){
    state.objects[ty][tx] = O_POTATO_PLANT;
    state.saplings[`${tx},${ty}`] = Date.now();
    slot.count--;
    if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    updateSolidAt(tx, ty);
    state.placingCooldown = 0.3;
    return;
  }

  // ---- Поедание ----
  if(item.food !== undefined && item.layer !== 'object' && item.layer !== 'floor'){
    if(state.player.hunger < PLAYER_MAX_HUNGER || state.player.hp < PLAYER_MAX_HP){
      state.player.hunger = Math.min(PLAYER_MAX_HUNGER, state.player.hunger + (item.food || 0));
      if(item.hpRestore) state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + item.hpRestore);
      slot.count--;
      if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
      if(typeof showToast === 'function') showToast('Съедено: ' + item.name);
      state.placingCooldown = 0.4;
    }
    return;
  }

  // ---- Установка ----
  const px = tx*TILE + TILE/2, py = ty*TILE + TILE/2;
  const dx = px - state.player.x, dy = py - state.player.y;
  const minD = state.player.r + TILE/2;
  if(dx*dx + dy*dy < minD*minD) return;

  if(item.layer === 'object'){
    if(oid !== null) return;
    if(state.floors[ty][tx] === F_WATER) return;
    state.objects[ty][tx] = slot.type;
    if(slot.type === O_CHEST){
      state.chests[`${tx},${ty}`] = new Array(30).fill(null);
    }
    updateSolidAt(tx, ty);
    slot.count--;
    if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    state.placingCooldown = 0.15;
  }
  else if(item.layer === 'floor'){
    if(state.floors[ty][tx] === F_WATER) return;
    if(state.floors[ty][tx] === slot.type) return;
    state.floors[ty][tx] = slot.type;
    updateSolidAt(tx, ty);
    slot.count--;
    if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    state.placingCooldown = 0.15;
  }
}

// ============================================================
// ДВЕРИ / КАЛИТКИ
// ============================================================
function toggleDoor(tx, ty){
  const key = `${tx},${ty}`;
  state.openDoors[key] = !state.openDoors[key];
  state.solidGrid[ty][tx] = !state.openDoors[key];
}
function toggleGate(tx, ty){
  const key = `${tx},${ty}`;
  state.openDoors[key] = !state.openDoors[key];
  state.solidGrid[ty][tx] = !state.openDoors[key];
}
function isDoorOpen(tx, ty){
  return !!state.openDoors[`${tx},${ty}`];
}

// ============================================================
// СОН
// ============================================================
function trySleep(tx, ty){
  state.player.spawnX = tx * TILE + TILE/2;
  state.player.spawnY = ty * TILE + TILE/2;
  state.player.hasSpawn = true;

  if(isNight()){
    state.timeOfDay = 0;
    if(typeof showToast === 'function') showToast('Вы проспали ночь');
  } else {
    state.timeOfDay = 0;
    if(typeof showToast === 'function') showToast('Вы проспали до утра');
  }
}

// ============================================================
// ОГОНЬ — таймеры + распространение + костры
// ============================================================
function updateFireTimers(dt){
  const now = Date.now();

  // Гаснут таймеры огня на полу
  for(const k in state.fireTimers){
    if(now >= state.fireTimers[k]){
      const [x, y] = k.split(',').map(Number);
      if(inBounds(x, y) && state.floors[y][x] === F_FIRE){
        state.floors[y][x] = F_GRASS;
        updateSolidAt(x, y);
      }
      delete state.fireTimers[k];
    }
  }

  // Распространение огня (шанс раз в кадр)
  if(Math.random() < 0.05){
    const fireKeys = Object.keys(state.fireTimers);
    if(fireKeys.length > 0){
      const k = fireKeys[Math.floor(Math.random() * fireKeys.length)];
      const [x, y] = k.split(',').map(Number);
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
      const nx = x + dx, ny = y + dy;
      if(inBounds(nx, ny)){
        if(state.floors[ny][nx] !== F_FIRE && state.floors[ny][nx] !== F_WATER){
          const oid = state.objects[ny][nx];
          // Поджигаем дерево/листву
          if(oid === O_TRUNK || oid === O_LEAVES || oid === O_FENCE || oid === O_GATE ||
             oid === O_DOOR || oid === O_TABLE || oid === O_CHEST || oid === O_WALL ||
             oid === O_BED){
            state.objects[ny][nx] = null;
            state.floors[ny][nx] = F_FIRE;
            state.fireTimers[`${nx},${ny}`] = now + FIRE_LIFE_MS;
            updateSolidAt(nx, ny);
          }
          // Или траву
          else if(state.floors[ny][nx] === F_GRASS || state.floors[ny][nx] === F_TALLGRASS || state.floors[ny][nx] === F_FLOWERS){
            state.floors[ny][nx] = F_FIRE;
            state.fireTimers[`${nx},${ny}`] = now + FIRE_LIFE_MS;
            updateSolidAt(nx, ny);
          }
        }
      }
    }
  }

  // Костры — 10 минут и потухнут
  for(const k in state.campfireLitAt){
    if(now - state.campfireLitAt[k] > 10 * 60 * 1000){
      const [x, y] = k.split(',').map(Number);
      if(inBounds(x, y) && state.objects[y][x] === O_CAMPFIRE_LIT){
        state.objects[y][x] = O_CAMPFIRE;
      }
      delete state.campfireLitAt[k];
    }
  }

  // Политые грядки — через 2 минуты "высыхают"
  for(const k in state.wateredFarmland){
    if(now - state.wateredFarmland[k] > 120000){
      delete state.wateredFarmland[k];
    }
  }
}

// ============================================================
// ВЗАИМОДЕЙСТВИЕ (ножницы, ведро, поводок)
// ============================================================
function tryInteract(){
  if(state.uiMode || state.showRecipes) return false;
  if(state.attackCooldown > 0) return false;

  // ⚡ ФИКС: не перехватываем клик по блоку в мире
  const { tx, ty } = mouseTile();
  if(inBounds(tx, ty) && inReach(tx, ty)){
    if(state.objects[ty][tx] !== null) return false;
    if(state.floors[ty][tx] === F_BEDROCK) return false;
    if(state.floors[ty][tx] === F_GRAVEL) return false;
  }

  const slot = state.hotbar[state.selectedHotbarSlot];
  const item = slot ? ITEMS[slot.type] : null;

  const px = state.player.x, py = state.player.y;
  const range = 2.5 * TILE;
  const rangeSq = range * range;

  let target = null, best = rangeSq, targetType = null;

  for(const a of state.animals){
    const d = (a.x - px)**2 + (a.y - py)**2;
    if(d < best){ target = a; best = d; targetType = 'animal'; }
  }
  for(const d of state.dogs){
    const dd = (d.x - px)**2 + (d.y - py)**2;
    if(dd < best){ target = d; best = dd; targetType = 'dog'; }
  }
  const v = state.villagers[0];
  if(v){
    const dv = (v.x - px)**2 + (v.y - py)**2;
    if(dv < best){ target = v; best = dv; targetType = 'villager'; }
  }

  if(!target) return false;

  // Ножницы → стрижка
  if(item && item.kind === 'tool' && item.tool === 'shears' && targetType === 'animal'){
    if(target.type === 'sheep' && !target.sheared){
      target.sheared = true;
      target.shearTimer = 60000;
      spawnFloorItem(target.x, target.y, { type: I_WOOL, count: 1 });
      damageTool();
      state.attackCooldown = 0.5;
      if(typeof showToast === 'function') showToast('Овца пострижена');
      return true;
    }
  }

  // Ведро → молоко
  if(slot && slot.type === I_BUCKET && targetType === 'animal' && target.type === 'cow'){
    if(!target.milkTimer || target.milkTimer <= 0){
      target.milkTimer = 60000;
      slot.type = I_MILK_BUCKET;
      if(typeof showToast === 'function') showToast('Молоко надоено');
      state.attackCooldown = 0.5;
    } else {
      if(typeof showToast === 'function') showToast('Корова не готова');
    }
    return true;
  }

  // Мясо → приручение собаки
  if(slot && slot.type === I_MEAT && targetType === 'dog' && target.owner === 'wild'){
    target.tameProgress = (target.tameProgress || 0) + 1;
    slot.count--;
    if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    if(target.tameProgress >= 10){
      target.owner = 'player';
      if(typeof showToast === 'function') showToast('Собака приручена!');
    } else {
      if(typeof showToast === 'function') showToast('Приручение: ' + target.tameProgress + '/10');
    }
    state.attackCooldown = 0.5;
    return true;
  }

  // Житель → торговля
  if(targetType === 'villager'){
    openTrade(0);
    return true;
  }

  return false;
} 