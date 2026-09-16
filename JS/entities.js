// entities.js — животные и енот

const ANIM_COW = 'cow';
const ANIM_CHICKEN = 'chicken';
const ANIM_SHEEP = 'sheep';

const ANIMAL_DEFS = {
  cow:     { name:'Корова', color:'#f0e6d2', accent:'#3a2a1a', speed:0.6, size:14, maxHp:4 },
  chicken: { name:'Курица', color:'#f5e6c8', accent:'#ff8a3a', speed:1.3, size:9,  maxHp:2 },
  sheep:   { name:'Овца',   color:'#e8e8e8', accent:'#3a3a3a', speed:0.5, size:13, maxHp:3 },
};

const RACCOON_MAX_HP = 3;
const RACCOON_COOLDOWN_MS = 5 * 60 * 1000; // 5 минут

// ---------- ЖИВОТНЫЕ ----------
function spawnAnimals(){
  state.animals = [];
  const target = 14;
  let attempts = 0;
  while(state.animals.length < target && attempts < 400){
    attempts++;
    const tx = 6 + Math.floor(Math.random() * (WORLD_W - 12));
    const ty = 6 + Math.floor(Math.random() * (WORLD_H - 12));
    if(state.floors[ty][tx] !== F_GRASS) continue;
    if(state.objects[ty][tx] !== null) continue;

    const types = [ANIM_COW, ANIM_CHICKEN, ANIM_SHEEP];
    const type = types[Math.floor(Math.random() * types.length)];
    const def = ANIMAL_DEFS[type];

    state.animals.push({
      type,
      name: def.name,
      x: tx*TILE + TILE/2,
      y: ty*TILE + TILE/2,
      dirX: 0, dirY: 0,
      dirTimer: Math.random() * 2,
      speed: def.speed,
      hp: def.maxHp,
      maxHp: def.maxHp,
      hurtTimer: 0,
    });
  }
}

function updateAnimals(dt){
  for(const a of state.animals){
    if(a.hurtTimer > 0) a.hurtTimer -= dt;

    a.dirTimer -= dt;
    if(a.dirTimer <= 0){
      a.dirTimer = 1.5 + Math.random() * 3;
      if(Math.random() < 0.45){
        a.dirX = 0; a.dirY = 0;
      } else {
        const ang = Math.random() * Math.PI * 2;
        a.dirX = Math.cos(ang);
        a.dirY = Math.sin(ang);
      }
    }

    if(a.dirX === 0 && a.dirY === 0) continue;

    const nx = a.x + a.dirX * a.speed * dt * 60;
    const ny = a.y + a.dirY * a.speed * dt * 60;
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(ny / TILE);

    if(!inBounds(tx, ty) || isSolid(tx, ty) || state.floors[ty][tx] === F_WATER){
      a.dirTimer = 0;
      continue;
    }
    a.x = nx; a.y = ny;
  }
}

// ---------- ЕНОТ ----------
function spawnRaccoon(){
  const angle = Math.random() * Math.PI * 2;
  const dist = 5 * TILE;
  state.raccoon = {
    name: 'Енот',
    x: state.player.x + Math.cos(angle) * dist,
    y: state.player.y + Math.sin(angle) * dist,
    state: 'far',               // far | approach | flee
    stealTimer: 5 + Math.random() * 5,
    fleeTimer: 0,
    fleeAngle: 0,
    approachTimeout: 0,
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

  const px = state.player.x, py = state.player.y;
  const dx = r.x - px, dy = r.y - py; // вектор от игрока к еноту
  const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;

  // Телепорт, если слишком далеко ушёл
  if(dist > 25 * TILE){
    const ang = Math.random() * Math.PI * 2;
    r.x = px + Math.cos(ang) * 5 * TILE;
    r.y = py + Math.sin(ang) * 5 * TILE;
    return;
  }

  // ----- FAR: держит дистанцию, кружит вокруг -----
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
      r.x += (mx/md) * s * dt * 60 * 0.4;
      r.y += (my/md) * s * dt * 60 * 0.4;
    }

    r.stealTimer -= dt;
    if(r.stealTimer <= 0){
      r.state = 'approach';
      r.approachTimeout = 3.5;
    }
  }
  // ----- APPROACH: быстро бежит к игроку -----
  else if(r.state === 'approach'){
    const s = 6.5;
    const nx = r.x - (dx/dist) * s * dt * 60 * 0.5;
    const ny = r.y - (dy/dist) * s * dt * 60 * 0.5;

    const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
    if(inBounds(tx, ty) && !isSolid(tx, ty) && state.floors[ty][tx] !== F_WATER){
      r.x = nx; r.y = ny;
    } else {
      // Пробуем по осям отдельно
      const tx2 = Math.floor(nx / TILE), ty2 = Math.floor(r.y / TILE);
      if(inBounds(tx2, ty2) && !isSolid(tx2, ty2) && state.floors[ty2][tx2] !== F_WATER) r.x = nx;
      const tx3 = Math.floor(r.x / TILE), ty3 = Math.floor(ny / TILE);
      if(inBounds(tx3, ty3) && !isSolid(tx3, ty3) && state.floors[ty3][tx3] !== F_WATER) r.y = ny;
    }

    r.approachTimeout -= dt;

    if(dist < 1.2 * TILE){
      const slot = state.hotbar[state.selectedHotbarSlot];
      if(slot){
        r.stolenItem = { ...slot };
        if(typeof r.stolenItem.durability !== 'number'){
          const def = ITEMS[r.stolenItem.type];
          if(def && def.kind === 'tool' && typeof def.maxDurability === 'number'){
            r.stolenItem.durability = def.maxDurability;
          }
        }
        state.hotbar[state.selectedHotbarSlot] = null;
        if(typeof showToast === 'function') showToast('🦝 Енот украл ' + ITEMS[r.stolenItem.type].name + '!');
      }
      r.state = 'flee';
      r.fleeTimer = 4;
      r.fleeAngle = Math.atan2(dy, dx);
    }
    if(r.approachTimeout <= 0){
      r.state = 'far';
      r.stealTimer = 4 + Math.random() * 4;
    }
  }
  // ----- FLEE: убегает по прямой -----
  else if(r.state === 'flee'){
    const s = 5.5;
    const nx = r.x + Math.cos(r.fleeAngle) * s * dt * 60 * 0.5;
    const ny = r.y + Math.sin(r.fleeAngle) * s * dt * 60 * 0.5;
    const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);

    if(inBounds(tx, ty) && !isSolid(tx, ty) && state.floors[ty][tx] !== F_WATER){
      r.x = nx; r.y = ny;
    } else {
      // Меняем направление при столкновении
      r.fleeAngle += Math.PI / 2;
    }

    r.fleeTimer -= dt;

    // Игрок догнал
    if(dist < 1.5 * TILE && r.stolenItem){
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

// ---------- УДАР МЕЧОМ ----------
function updateAttack(dt){
  if(state.uiMode || state.showRecipes){ state.attackCooldown = 0; return; }
  if(state.attackCooldown > 0){ state.attackCooldown -= dt; return; }

  const sel = getSelectedTool();
  if(!sel || sel.tool !== 'sword') return;
  if(!state.mouse.left) return;

  const slot = state.hotbar[state.selectedHotbarSlot];
  if(!slot) return;
  const def = ITEMS[slot.type];
  if(!def) return;

  // Ищем ближайшую сущность в радиусе удара
  const px = state.player.x, py = state.player.y;
  const range = 1.7 * TILE;
  const rangeSq = range * range;

  let closest = null, closestDist = rangeSq;

  for(const a of state.animals){
    const dx = a.x - px, dy = a.y - py;
    const d2 = dx*dx + dy*dy;
    if(d2 < closestDist){ closest = a; closestDist = d2; }
  }
  if(state.raccoon){
    const r = state.raccoon;
    const dx = r.x - px, dy = r.y - py;
    const d2 = dx*dx + dy*dy;
    if(d2 < closestDist){ closest = r; closestDist = d2; }
  }

  if(!closest) return;

  // Урон
  const dmg = def.damage || 1;
  const cd  = def.attackCooldown || 0.5;
  closest.hp -= dmg;
  closest.hurtTimer = 0.25;
  state.attackCooldown = cd;
  if(typeof damageTool === 'function') damageTool();

  if(closest.hp <= 0){
    // Смерть
    if(closest === state.raccoon){
      state.raccoonCooldown = Date.now() + RACCOON_COOLDOWN_MS;
      state.raccoon = null;
      if(typeof showToast === 'function') showToast('🦝 Енот сбежал на 5 минут');
    } else {
      const idx = state.animals.indexOf(closest);
      if(idx >= 0) state.animals.splice(idx, 1);
      if(typeof showToast === 'function') showToast(closest.name + ' побеждён');
    }
  }
}