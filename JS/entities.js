// entities.js — животные, енот, собаки, мобы, жители, floorItems

// ============================================================
// ОБЩЕЕ
// ============================================================
function isAreaFree(x, y, r){
  const minTX = Math.floor((x - r) / TILE);
  const maxTX = Math.floor((x + r) / TILE);
  const minTY = Math.floor((y - r) / TILE);
  const maxTY = Math.floor((y + r) / TILE);
  for(let ty = minTY; ty <= maxTY; ty++){
    for(let tx = minTX; tx <= maxTX; tx++){
      if(!inBounds(tx, ty)) return false;
      if(isSolid(tx, ty)) return false;
      if(state.floors[ty][tx] === F_WATER) return false;
    }
  }
  return true;
}

function randInt(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }

// ============================================================
// ЖИВОТНЫЕ
// ============================================================
const ANIMAL_DEFS = {
  cow:     { name:'Корова', color:'#f0e6d2', accent:'#3a2a1a', speed:0.6, size:14, maxHp:4, milk:true },
  chicken: { name:'Курица', color:'#f5e6c8', accent:'#ff8a3a', speed:1.3, size:9,  maxHp:2, egg:true },
  sheep:   { name:'Овца',   color:'#e8e8e8', accent:'#3a3a3a', speed:0.5, size:13, maxHp:3, shear:true },
};

const ANIMALS_MIN = 12;
const ANIMALS_MAX = 25;

function spawnAnimals(){
  state.animals = [];
  const target = 18;
  let attempts = 0;
  while(state.animals.length < target && attempts < 800){
    attempts++;
    const tx = 8 + Math.floor(Math.random() * (WORLD_W - 16));
    const ty = 8 + Math.floor(Math.random() * (WORLD_H - 16));
    if(state.floors[ty][tx] !== F_GRASS) continue;
    if(state.objects[ty][tx] !== null) continue;

    const types = ['cow', 'chicken', 'sheep'];
    const type = types[randInt(0, 2)];
    const def = ANIMAL_DEFS[type];
    const px = tx*TILE + TILE/2, py = ty*TILE + TILE/2;
    if(!isAreaFree(px, py, def.size + 2)) continue;

    state.animals.push({
      type, name: def.name,
      x: px, y: py,
      dirX: 0, dirY: 0,
      dirTimer: Math.random() * 2,
      speed: def.speed,
      hp: def.maxHp, maxHp: def.maxHp,
      hurtTimer: 0,
      shearTimer: 0,
      milkTimer: 0,
      eggTimer: 0,
      sheared: false,
    });
  }
}

function updateAnimals(dt){
  // Ограничение минимума
  const minNeeded = ANIMALS_MIN - state.animals.length;
  if(minNeeded > 0 && Math.random() < 0.02){
    spawnOneAnimal();
  }

  for(const a of state.animals){
    if(a.hurtTimer > 0) a.hurtTimer -= dt;
    if(a.shearTimer > 0) a.shearTimer -= dt;
    if(a.milkTimer > 0) a.milkTimer -= dt;
    if(a.eggTimer > 0) a.eggTimer -= dt;

    // Шерсть отрастает
    if(a.sheared && a.shearTimer <= 0) a.sheared = false;

    a.dirTimer -= dt;
    if(a.dirTimer <= 0){
      a.dirTimer = 1.5 + Math.random() * 3;
      if(Math.random() < 0.45){ a.dirX = 0; a.dirY = 0; }
      else {
        const ang = Math.random() * Math.PI * 2;
        a.dirX = Math.cos(ang);
        a.dirY = Math.sin(ang);
      }
    }
    if(a.dirX === 0 && a.dirY === 0) continue;

    const def = ANIMAL_DEFS[a.type];
    const r = def.size + 2;
    const dx = a.dirX * a.speed * dt * 60;
    const dy = a.dirY * a.speed * dt * 60;
    if(isAreaFree(a.x + dx, a.y, r)) a.x += dx; else a.dirTimer = 0;
    if(isAreaFree(a.x, a.y + dy, r)) a.y += dy; else a.dirTimer = 0;
  }
}

function spawnOneAnimal(){
  for(let tries = 0; tries < 40; tries++){
    const tx = 8 + Math.floor(Math.random() * (WORLD_W - 16));
    const ty = 8 + Math.floor(Math.random() * (WORLD_H - 16));
    if(state.floors[ty][tx] !== F_GRASS) continue;
    if(state.objects[ty][tx] !== null) continue;
    const types = ['cow', 'chicken', 'sheep'];
    const type = types[randInt(0, 2)];
    const def = ANIMAL_DEFS[type];
    const px = tx*TILE + TILE/2, py = ty*TILE + TILE/2;
    if(!isAreaFree(px, py, def.size + 2)) continue;
    state.animals.push({
      type, name: def.name,
      x: px, y: py,
      dirX: 0, dirY: 0,
      dirTimer: Math.random() * 2,
      speed: def.speed,
      hp: def.maxHp, maxHp: def.maxHp,
      hurtTimer: 0, shearTimer: 0, milkTimer: 0, eggTimer: 0,
      sheared: false,
    });
    return;
  }
}

// ============================================================
// СОБАКИ
// ============================================================
const DOG_MAX_HP = 5;
const DOG_COOLDOWN = 5 * 60 * 1000;

function spawnDog(x, y, owner){
  state.dogs.push({
    name: 'Собака',
    x, y,
    owner: owner || 'wild',   // 'wild' | 'player' | 'villager'
    hp: DOG_MAX_HP, maxHp: DOG_MAX_HP,
    dirX: 0, dirY: 0,
    dirTimer: 0,
    hurtTimer: 0,
    target: null,
  });
}

function updateDogs(dt){
  // Спавн диких собак днём
  if(isDay() && state.dogs.filter(d => d.owner === 'wild').length < 3 && Math.random() < 0.005){
    for(let tries = 0; tries < 20; tries++){
      const tx = randInt(8, WORLD_W-8), ty = randInt(8, WORLD_H-8);
      if(state.floors[ty][tx] !== F_GRASS) continue;
      if(state.objects[ty][tx] !== null) continue;
      if(!isAreaFree(tx*TILE+TILE/2, ty*TILE+TILE/2, 12)) continue;
      spawnDog(tx*TILE+TILE/2, ty*TILE+TILE/2, 'wild');
      break;
    }
  }
  // Ночью дикие собаки становятся волками — конвертируем
  if(isNight()){
    for(const d of state.dogs){
      if(d.owner === 'wild') d.isWolf = true;
    }
  } else {
    for(const d of state.dogs){
      if(d.owner === 'wild') d.isWolf = false;
    }
  }

  const p = state.player;
  for(const d of state.dogs){
    if(d.hurtTimer > 0) d.hurtTimer -= dt;

    if(d.owner === 'player'){
      // Ходит за игроком
      const dx = p.x - d.x, dy = p.y - d.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
      if(dist > 2.5 * TILE){
        const s = 3.0;
        const nx = d.x + (dx/dist) * s * dt * 60 * 0.4;
        const ny = d.y + (dy/dist) * s * dt * 60 * 0.4;
        if(isAreaFree(nx, d.y, 12)) d.x = nx;
        if(isAreaFree(d.x, ny, 12)) d.y = ny;
      }
    } else if(d.owner === 'villager'){
      // Идёт за жителем
      const v = state.villagers[0];
      if(v){
        const dx = v.x - d.x, dy = v.y - d.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
        if(dist > 2 * TILE){
          const s = 2.5;
          const nx = d.x + (dx/dist) * s * dt * 60 * 0.4;
          const ny = d.y + (dy/dist) * s * dt * 60 * 0.4;
          if(isAreaFree(nx, d.y, 12)) d.x = nx;
          if(isAreaFree(d.x, ny, 12)) d.y = ny;
        }
      }
    } else {
      // Дикая собака / волк — бродит
      d.dirTimer -= dt;
      if(d.dirTimer <= 0){
        d.dirTimer = 2 + Math.random() * 3;
        if(Math.random() < 0.5){ d.dirX = 0; d.dirY = 0; }
        else {
          const ang = Math.random() * Math.PI * 2;
          d.dirX = Math.cos(ang);
          d.dirY = Math.sin(ang);
        }
      }
      if(d.dirX === 0 && d.dirY === 0) continue;
      const s = d.isWolf ? 2.0 : 1.5;
      const nx = d.x + d.dirX * s * dt * 60 * 0.4;
      const ny = d.y + d.dirY * s * dt * 60 * 0.4;
      if(isAreaFree(nx, d.y, 12)) d.x = nx; else d.dirTimer = 0;
      if(isAreaFree(d.x, ny, 12)) d.y = ny; else d.dirTimer = 0;
    }
  }
}

// ============================================================
// ЕНОТ
// ============================================================
const RACCOON_MAX_HP = 3;
const RACCOON_COOLDOWN_MS = 5 * 60 * 1000;

function spawnRaccoon(){
  let x, y, tries = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 * TILE;
    x = state.player.x + Math.cos(angle) * dist;
    y = state.player.y + Math.sin(angle) * dist;
    tries++;
  } while(!isAreaFree(x, y, 12) && tries < 30);

  state.raccoon = {
    name: 'Енот',
    x, y,
    state: 'far',
    stealTimer: 5 + Math.random() * 5,
    fleeTimer: 0,
    fleeAngle: 0,
    approachTimeout: 0,
    catchCooldown: 0,
    stolenItem: null,
    hp: RACCOON_MAX_HP,
    maxHp: RACCOON_MAX_HP,
    hurtTimer: 0,
    animTime: 0,
  };
}

function trySpawnRaccoon(){
  if(state.raccoon) return;
  if(Date.now() < state.raccoonCooldown) return;
  spawnRaccoon();
}

function updateRaccoon(dt){
  const r = state.raccoon;
  if(!r) return;
  r.animTime += dt;
  if(r.hurtTimer > 0) r.hurtTimer -= dt;
  if(r.catchCooldown > 0) r.catchCooldown -= dt;

  const px = state.player.x, py = state.player.y;
  const dx = r.x - px, dy = r.y - py;
  const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;

  if(dist > 30 * TILE && r.state !== 'flee'){
    const ang = Math.random() * Math.PI * 2;
    r.x = px + Math.cos(ang) * 5 * TILE;
    r.y = py + Math.sin(ang) * 5 * TILE;
    return;
  }

  const rRadius = 12;

  if(r.state === 'far'){
    const targetDist = 5 * TILE;
    const baseAng = Math.atan2(dy, dx);
    const orbitAng = baseAng + 0.35 * dt * 60 * 0.02;
    const tx = px + Math.cos(orbitAng) * targetDist;
    const ty = py + Math.sin(orbitAng) * targetDist;
    const mx = tx - r.x, my = ty - r.y;
    const md = Math.sqrt(mx*mx + my*my) || 1;
    if(md > 4){
      const s = 1.4;
      const stepX = (mx/md) * s * dt * 60 * 0.4;
      const stepY = (my/md) * s * dt * 60 * 0.4;
      if(isAreaFree(r.x + stepX, r.y, rRadius)) r.x += stepX;
      if(isAreaFree(r.x, r.y + stepY, rRadius)) r.y += stepY;
    }
    r.stealTimer -= dt;
    if(r.stealTimer <= 0){
      const slot = state.hotbar[state.selectedHotbarSlot];
      if(slot){
        r.state = 'approach';
        r.approachTimeout = 4.5;
      } else {
        r.stealTimer = 2 + Math.random() * 2;
      }
    }
  } else if(r.state === 'approach'){
    const s = 3.8;
    const stepX = -(dx/dist) * s * dt * 60 * 0.5;
    const stepY = -(dy/dist) * s * dt * 60 * 0.5;
    if(isAreaFree(r.x + stepX, r.y, rRadius)) r.x += stepX;
    if(isAreaFree(r.x, r.y + stepY, rRadius)) r.y += stepY;

    r.approachTimeout -= dt;
    const slot = state.hotbar[state.selectedHotbarSlot];

    if(dist < 1.2 * TILE && slot){
      r.stolenItem = { ...slot };
      if(typeof r.stolenItem.durability !== 'number'){
        const def = ITEMS[r.stolenItem.type];
        if(def && def.kind === 'tool' && typeof def.maxDurability === 'number'){
          r.stolenItem.durability = def.maxDurability;
        }
      }
      state.hotbar[state.selectedHotbarSlot] = null;
      if(typeof showToast === 'function') showToast('🦝 Енот украл ' + ITEMS[r.stolenItem.type].name + '!');
      r.state = 'flee';
      r.fleeTimer = 8;
      r.catchCooldown = 2.5;
      r.fleeAngle = Math.atan2(dy, dx);
      const jumpX = Math.cos(r.fleeAngle) * TILE * 0.9;
      const jumpY = Math.sin(r.fleeAngle) * TILE * 0.9;
      if(isAreaFree(r.x + jumpX, r.y, rRadius)) r.x += jumpX;
      if(isAreaFree(r.x, r.y + jumpY, rRadius)) r.y += jumpY;
    }
    if(r.approachTimeout <= 0 || !slot){
      r.state = 'far';
      r.stealTimer = 4 + Math.random() * 4;
    }
  } else if(r.state === 'flee'){
    const baseSpeed = (r.fleeTimer > 6.5) ? 4.5 : 2.6;
    const stepX = Math.cos(r.fleeAngle) * baseSpeed * dt * 60 * 0.5;
    const stepY = Math.sin(r.fleeAngle) * baseSpeed * dt * 60 * 0.5;
    if(isAreaFree(r.x + stepX, r.y, rRadius)) r.x += stepX;
    else r.fleeAngle += Math.PI / 2;
    if(isAreaFree(r.x, r.y + stepY, rRadius)) r.y += stepY;
    else r.fleeAngle += Math.PI / 2;
    r.fleeTimer -= dt;

    if(dist < 1.5 * TILE && r.stolenItem && r.catchCooldown <= 0){
      if(typeof addToInventory === 'function'){
        addToInventory(r.stolenItem.type, r.stolenItem.count, r.stolenItem.durability);
      }
      if(typeof showToast === 'function') showToast('Енот уронил ' + ITEMS[r.stolenItem.type].name);
      r.stolenItem = null;
      r.state = 'far';
      r.stealTimer = 8 + Math.random() * 6;
    }
    if(r.fleeTimer <= 0){
      r.state = 'far';
      r.stealTimer = 4 + Math.random() * 4;
    }
  }
}

// ============================================================
// НОЧНЫЕ МОБЫ (простые «волки»)
// ============================================================
const MOB_MAX_HP = 3;
const MOB_MAX_COUNT = 5;

function updateMobs(dt){
  if(isDay()){
    // Утром мобы исчезают
    if(state.mobs.length > 0) state.mobs = [];
    return;
  }

  // Ночью спавнятся до 5
  if(state.mobs.length < MOB_MAX_COUNT && Math.random() < 0.005){
    for(let tries = 0; tries < 30; tries++){
      const tx = randInt(8, WORLD_W-8), ty = randInt(8, WORLD_H-8);
      if(state.floors[ty][tx] === F_WATER) continue;
      if(state.objects[ty][tx] !== null) continue;
      const px = tx*TILE+TILE/2, py = ty*TILE+TILE/2;
      const pdx = px - state.player.x, pdy = py - state.player.y;
      const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
      if(pdist < 6 * TILE) continue; // не спавним рядом
      if(!isAreaFree(px, py, 12)) continue;
      state.mobs.push({
        name: 'Тень',
        x: px, y: py,
        hp: MOB_MAX_HP, maxHp: MOB_MAX_HP,
        speed: 1.5,
        hurtTimer: 0,
        attackCooldown: 0,
      });
      break;
    }
  }

  for(const m of state.mobs){
    if(m.hurtTimer > 0) m.hurtTimer -= dt;
    if(m.attackCooldown > 0) m.attackCooldown -= dt;

    const dx = state.player.x - m.x;
    const dy = state.player.y - m.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;

    if(dist < 12 * TILE){
      const s = m.speed;
      const nx = m.x + (dx/dist) * s * dt * 60 * 0.4;
      const ny = m.y + (dy/dist) * s * dt * 60 * 0.4;
      if(isAreaFree(nx, m.y, 12)) m.x = nx;
      if(isAreaFree(m.x, ny, 12)) m.y = ny;

      // Укус
      if(dist < 1.0 * TILE && m.attackCooldown <= 0){
        state.player.hp -= 1;
        m.attackCooldown = 1.5;
        if(state.player.hp <= 0 && typeof playerDie === 'function') playerDie();
      }
    }
  }
}

// ============================================================
// ЖИТЕЛИ
// ============================================================
function spawnVillager(){
  if(!state.villagerSpawn) return;
  const vx = state.villagerSpawn.x * TILE + TILE/2;
  const vy = state.villagerSpawn.y * TILE + TILE/2;
  state.villagers = [{
    name: 'Житель',
    x: vx, y: vy,
    homeX: vx, homeY: vy,
    dirTimer: 0,
    dirX: 0, dirY: 0,
    hp: 9999,
  }];
  // Собака жителя
  if(state.villagerDogSpawn){
    spawnDog(state.villagerDogSpawn.x * TILE + TILE/2, state.villagerDogSpawn.y * TILE + TILE/2, 'villager');
  }
}

function updateVillagers(dt){
  for(const v of state.villagers){
    v.dirTimer -= dt;
    if(v.dirTimer <= 0){
      v.dirTimer = 2 + Math.random() * 3;
      if(isNight()){
        // Ночью стоит дома
        v.dirX = 0; v.dirY = 0;
      } else if(Math.random() < 0.5){
        v.dirX = 0; v.dirY = 0;
      } else {
        const ang = Math.random() * Math.PI * 2;
        v.dirX = Math.cos(ang);
        v.dirY = Math.sin(ang);
      }
    }
    if(v.dirX === 0 && v.dirY === 0) continue;
    const s = 0.8;
    const nx = v.x + v.dirX * s * dt * 60 * 0.4;
    const ny = v.y + v.dirY * s * dt * 60 * 0.4;
    const maxDist = 4 * TILE;
    const ddx = nx - v.homeX, ddy = ny - v.homeY;
    if(Math.sqrt(ddx*ddx + ddy*ddy) <= maxDist){
      if(isAreaFree(nx, v.y, 12)) v.x = nx;
      if(isAreaFree(v.x, ny, 12)) v.y = ny;
    } else v.dirTimer = 0;
  }
}

// ============================================================
// ПРЕДМЕТЫ НА ПОЛУ
// ============================================================
function spawnFloorItem(x, y, item){
  state.floorItems.push({
    x, y,
    type: item.type,
    count: item.count || 1,
    durability: item.durability,
    spawnAt: Date.now(),
    vy: -1.5,
    lifeTime: 5 * 60 * 1000, // 5 минут
  });
}

function updateFloorItems(dt){
  const now = Date.now();
  const p = state.player;
  const pickR = TILE * 1.2;

  for(let i = state.floorItems.length - 1; i >= 0; i--){
    const it = state.floorItems[i];
    // Подбор
    const dx = p.x - it.x, dy = p.y - it.y;
    if(dx*dx + dy*dy < pickR * pickR && now - it.spawnAt > 1000){
      if(addToInventory(it.type, it.count, it.durability)){
        state.floorItems.splice(i, 1);
        continue;
      }
    }
    // Исчезновение
    if(now - it.spawnAt > it.lifeTime) state.floorItems.splice(i, 1);
  }
}

// ============================================================
// ОГОНЬ
// ============================================================
function updateFire(dt){
  // Простая реализация: огонь на floors[F_FIRE] гаснет через 10 сек
  const now = performance.now();
  for(let y=0;y<WORLD_H;y++){
    for(let x=0;x<WORLD_W;x++){
      if(state.floors[y][x] === F_FIRE){
        const key = `${x},${y}`;
        state._fireTimers = state._fireTimers || {};
        if(!state._fireTimers[key]) state._fireTimers[key] = now + FIRE_LIFE_MS;
        if(now > state._fireTimers[key]){
          state.floors[y][x] = F_GRASS;
          delete state._fireTimers[key];
        }
      }
    }
  }
}

// ============================================================
// АТАКА
// ============================================================
function tryAttack(){
  if(state.uiMode || state.showRecipes) return;
  if(state.attackCooldown > 0) return;

  const slot = state.hotbar[state.selectedHotbarSlot];
  let damage = 1;
  let cooldown = 0.4;
  let toolDef = null;

  if(slot){
    const def = ITEMS[slot.type];
    if(def && def.kind === 'tool'){
      toolDef = def;
      damage = def.damage || 1;
      cooldown = def.attackCooldown || 0.5;
    }
  }

  // Направление удара в сторону курсора
  const dx = state.mouse.x + state.camera.x - state.player.x;
  const dy = state.mouse.y + state.camera.y - state.player.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  state.attackAnimDirX = dx / len;
  state.attackAnimDirY = dy / len;

  // Анимация всегда
  state.attackAnim = 0.2;
  state.attackCooldown = cooldown;

  // Ищем цель в радиусе 1.7 тайла
  const px = state.player.x, py = state.player.y;
  const range = 1.7 * TILE;
  const rangeSq = range * range;

  let closest = null, closestDist = rangeSq;

  for(const a of state.animals){
    const ddx = a.x - px, ddy = a.y - py;
    const d2 = ddx*ddx + ddy*ddy;
    if(d2 < closestDist){ closest = a; closestDist = d2; }
  }
  for(const d of state.dogs){
    const ddx = d.x - px, ddy = d.y - py;
    const d2 = ddx*ddx + ddy*ddy;
    if(d2 < closestDist){ closest = d; closestDist = d2; }
  }
  for(const m of state.mobs){
    const ddx = m.x - px, ddy = m.y - py;
    const d2 = ddx*ddx + ddy*ddy;
    if(d2 < closestDist){ closest = m; closestDist = d2; }
  }
  if(state.raccoon){
    const r = state.raccoon;
    const ddx = r.x - px, ddy = r.y - py;
    const d2 = ddx*ddx + ddy*ddy;
    if(d2 < closestDist){ closest = r; closestDist = d2; }
  }

  if(!closest) return;

  // Урон
  closest.hp -= damage;
  closest.hurtTimer = 0.25;

  // Тратим прочность инструмента только если попали и это не рука
  if(toolDef && typeof damageTool === 'function') damageTool();

  // Смерть
  if(closest.hp <= 0){
    if(closest === state.raccoon){
      state.raccoonCooldown = Date.now() + RACCOON_COOLDOWN_MS;
      state.raccoon = null;
      if(typeof showToast === 'function') showToast('🦝 Енот сбежал на 5 минут');
    } else if(state.animals.includes(closest)){
      // Животное — дропаем мясо
      const idx = state.animals.indexOf(closest);
      if(idx >= 0) state.animals.splice(idx, 1);
      spawnFloorItem(closest.x, closest.y, { type: I_MEAT, count: 1 + randInt(0, 2) });
      if(typeof showToast === 'function') showToast(closest.name + ' побеждён');
    } else if(state.dogs.includes(closest)){
      const idx = state.dogs.indexOf(closest);
      if(idx >= 0) state.dogs.splice(idx, 1);
      if(typeof showToast === 'function') showToast('Собака побеждена');
    } else if(state.mobs.includes(closest)){
      const idx = state.mobs.indexOf(closest);
      if(idx >= 0) state.mobs.splice(idx, 1);
      if(typeof showToast === 'function') showToast(closest.name + ' побеждён');
    }
  }
}

// Пересобираем сущности с новыми функциями
function spawnAllEntities(){
  spawnAnimals();
  spawnRaccoon();
  if(state.villagerSpawn) spawnVillager();
  for(let i=0;i<2;i++){
    for(let tries = 0; tries < 20; tries++){
      const tx = randInt(8, WORLD_W-8), ty = randInt(8, WORLD_H-8);
      if(state.floors[ty][tx] !== F_GRASS) continue;
      if(state.objects[ty][tx] !== null) continue;
      if(!isAreaFree(tx*TILE+TILE/2, ty*TILE+TILE/2, 12)) continue;
      spawnDog(tx*TILE+TILE/2, ty*TILE+TILE/2, 'wild');
      break;
    }
  }
}