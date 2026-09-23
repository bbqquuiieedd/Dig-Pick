// ============================================================
// player.js — движение, коллизии, HP, голод, камера, смерть
// ============================================================

function isPlayerInWater(){
  const tx = Math.floor(state.player.x / TILE);
  const ty = Math.floor(state.player.y / TILE);
  if(!inBounds(tx, ty)) return false;
  return state.floors[ty][tx] === F_WATER;
}

function ensurePlayerNotStuck(){
  const p = state.player;
  if(isSolid(Math.floor(p.x/TILE), Math.floor(p.y/TILE))){
    for(let r=0;r<40;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const tx = Math.floor(p.x/TILE) + dx;
      const ty = Math.floor(p.y/TILE) + dy;
      if(!inBounds(tx, ty)) continue;
      if(!isSolid(tx, ty)){
        p.x = tx*TILE + TILE/2;
        p.y = ty*TILE + TILE/2;
        return;
      }
    }
  }
}

function resetPlayer(){
  const p = state.player;
  p.x = Math.floor(WORLD_W/2) * TILE;
  p.y = Math.floor(WORLD_H/2) * TILE;
  p.prevX = p.x; p.prevY = p.y;
  p.renderX = p.x; p.renderY = p.y;
  p.vx = 0; p.vy = 0;
  p.facing = { x: 0, y: 1 };
  p.inWater = false;
  p.hp = PLAYER_MAX_HP;
  p.hunger = PLAYER_MAX_HUNGER;
  p.running = false;
  p.hasSpawn = false;
  p.spawnX = p.x; p.spawnY = p.y;
  p.dead = false;
  ensurePlayerNotStuck();
}

// ============================================================
// ДВИЖЕНИЕ
// ============================================================
function updatePlayer(dt){
  if(state.uiMode || state.showRecipes) return;
  const p = state.player;
  let dx = 0, dy = 0;

  if(isActionDown('moveLeft'))  dx -= 1;
  if(isActionDown('moveRight')) dx += 1;
  if(isActionDown('moveUp'))    dy -= 1;
  if(isActionDown('moveDown'))  dy += 1;

  if(dx !== 0 && dy !== 0){
    const l = Math.sqrt(dx*dx + dy*dy);
    dx /= l; dy /= l;
  }
  if(dx !== 0 || dy !== 0){ p.facing.x = dx; p.facing.y = dy; }

  // Бег — Shift
  p.running = !!state.keys['ShiftLeft'] && !p.inWater && p.hunger > 0 && p.hp > 0;

  const inWater = isPlayerInWater();
  let speed = MOVE_SPEED;
  if(inWater) speed *= SWIM_SPEED_MULT;
  if(p.running) speed *= 1.6;
  if(p.hunger <= 0) speed *= 0.55;

  p.vx = dx*speed; p.vy = dy*speed;
  p.x += dx*speed; resolveAxis('x');
  p.y += dy*speed; resolveAxis('y');
  p.inWater = inWater;
}

function resolveAxis(axis){
  const p = state.player;
  const r = p.r;
  const minTX = Math.floor((p.x-r)/TILE), maxTX = Math.floor((p.x+r)/TILE);
  const minTY = Math.floor((p.y-r)/TILE), maxTY = Math.floor((p.y+r)/TILE);
  const rSq = r*r;
  for(let ty=minTY;ty<=maxTY;ty++) for(let tx=minTX;tx<=maxTX;tx++){
    if(!isSolid(tx, ty)) continue;
    const cx = Math.max(tx*TILE, Math.min(p.x, tx*TILE+TILE));
    const cy = Math.max(ty*TILE, Math.min(p.y, ty*TILE+TILE));
    const ddx = p.x-cx, ddy = p.y-cy, dSq = ddx*ddx + ddy*ddy;
    if(dSq < rSq){
      const dist = Math.sqrt(dSq) || 0.001;
      if(axis === 'x'){
        if(p.vx > 0) p.x = tx*TILE - r;
        else if(p.vx < 0) p.x = tx*TILE + TILE + r;
        else p.x += (ddx/dist) * (r - dist);
        p.vx = 0;
      } else {
        if(p.vy > 0) p.y = ty*TILE - r;
        else if(p.vy < 0) p.y = ty*TILE + TILE + r;
        else p.y += (ddy/dist) * (r - dist);
        p.vy = 0;
      }
    }
  }
}

// ============================================================
// HP / ГОЛОД / РЕГЕН
// ============================================================
function updatePlayerStats(dt){
  const p = state.player;
  if(state.gameState !== 'playing') return;
  if(p.hp <= 0) return;  // уже мертвы

  // Голод
  state.lastHungerTick += dt * 1000;
  let hungerInterval = HUNGER_TICK_MS;
  if(p.running) hungerInterval = Math.floor(HUNGER_TICK_MS / HUNGER_RUN_MULT);

  if(state.lastHungerTick >= hungerInterval){
    state.lastHungerTick -= hungerInterval;
    if(p.hunger > 0) p.hunger--;
  }

  // Голод = 0 → теряем HP
  if(p.hunger <= 0){
    state.lastStarveTick = (state.lastStarveTick || 0) + dt * 1000;
    if(state.lastStarveTick >= 10000){
      state.lastStarveTick -= 10000;
      p.hp = Math.max(0, p.hp - 1);
      if(p.hp <= 0) playerDie();
    }
  } else {
    state.lastStarveTick = 0;
  }

  // Автореген (каждые 10 сек, если голод > 0)
  if(p.hp < PLAYER_MAX_HP && p.hunger > 0){
    state.lastHpRegen += dt * 1000;
    if(state.lastHpRegen >= HP_REGEN_INTERVAL){
      state.lastHpRegen -= HP_REGEN_INTERVAL;
      p.hp++;
      p.hunger--;
    }
  } else {
    state.lastHpRegen = 0;
  }
}

// ============================================================
// СМЕРТЬ
// ============================================================
function playerDie(){
  const p = state.player;
  if(p.dead) return;
  p.dead = true;

  // Дропаем всё из инвентаря и хотбара на месте смерти
  const dropX = p.x;
  const dropY = p.y;

  for(let i=0;i<state.inventory.length;i++){
    const s = state.inventory[i];
    if(s){
      spawnFloorItem(dropX + (Math.random()-0.5)*TILE,
                     dropY + (Math.random()-0.5)*TILE,
                     { type: s.type, count: s.count, durability: s.durability });
      state.inventory[i] = null;
    }
  }
  for(let i=0;i<state.hotbar.length;i++){
    const s = state.hotbar[i];
    if(s){
      spawnFloorItem(dropX + (Math.random()-0.5)*TILE,
                     dropY + (Math.random()-0.5)*TILE,
                     { type: s.type, count: s.count, durability: s.durability });
      state.hotbar[i] = null;
    }
  }

  // Спавн у кровати или на старте
  let respawnX, respawnY;
  if(p.hasSpawn){
    respawnX = p.spawnX;
    respawnY = p.spawnY;
  } else {
    respawnX = Math.floor(WORLD_W/2) * TILE;
    respawnY = Math.floor(WORLD_H/2) * TILE;
  }

  p.x = respawnX; p.y = respawnY;
  p.prevX = p.x; p.prevY = p.y;
  p.renderX = p.x; p.renderY = p.y;
  p.vx = 0; p.vy = 0;
  p.hp = PLAYER_MAX_HP;
  p.hunger = Math.max(1, Math.floor(PLAYER_MAX_HUNGER / 2));
  p.dead = false;
  p.inWater = false;

  // Если спавн в блоке — выталкиваем
  ensurePlayerNotStuck();

  if(typeof showToast === 'function') showToast('💀 Вы погибли. Возрождение...');
}

// ============================================================
// КАМЕРА
// ============================================================
function updateCamera(){
  const wW = WORLD_W*TILE, wH = WORLD_H*TILE;
  const cvsW = document.getElementById('game').width;
  const cvsH = document.getElementById('game').height;
  let cx = state.player.renderX - cvsW/2;
  let cy = state.player.renderY - cvsH/2;
  if(wW <= cvsW) cx = (wW - cvsW)/2;
  else cx = Math.max(0, Math.min(wW - cvsW, cx));
  if(wH <= cvsH) cy = (wH - cvsH)/2;
  else cy = Math.max(0, Math.min(wH - cvsH, cy));
  state.camera.x = cx; state.camera.y = cy;
}

// ============================================================
// МЫШЬ → ТАЙЛ
// ============================================================
function mouseTile(){
  return {
    tx: Math.floor((state.mouse.x + state.camera.x)/TILE),
    ty: Math.floor((state.mouse.y + state.camera.y)/TILE)
  };
}
function inReach(tx,ty){
  const cx = tx*TILE + TILE/2, cy = ty*TILE + TILE/2;
  const dx = cx - state.player.x, dy = cy - state.player.y;
  return dx*dx + dy*dy <= (REACH*TILE)**2;
}