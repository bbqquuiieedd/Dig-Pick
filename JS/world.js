// ============================================================
// world.js — генерация мира 200×100, остров, структуры, сиды
// ============================================================

function inBounds(tx,ty){ return tx>=0 && tx<WORLD_W && ty>=0 && ty<WORLD_H; }
function isFloorWater(tx,ty){ return state.floors[ty][tx] === F_WATER; }

// ============================================================
// RNG
// ============================================================
function makeSeededRng(seed){
  let s = (seed >>> 0) || 1;
  return function(){
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ============================================================
// SOLID
// ============================================================
function isSolid(tx, ty){
  if(tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return true;
  return state.solidGrid[ty][tx];
}

function updateSolidAt(tx, ty){
  const o = state.objects[ty][tx];
  if(o !== null && ITEMS[o] && ITEMS[o].solid){
    state.solidGrid[ty][tx] = true;
    return;
  }
  state.solidGrid[ty][tx] = !!ITEMS[state.floors[ty][tx]].solid;
}

function rebuildSolidGrid(){
  for(let y=0;y<WORLD_H;y++){
    if(!state.solidGrid[y]) state.solidGrid[y] = [];
    for(let x=0;x<WORLD_W;x++){
      const o = state.objects[y][x];
      if(o !== null && ITEMS[o] && ITEMS[o].solid){
        state.solidGrid[y][x] = true;
      } else {
        state.solidGrid[y][x] = !!ITEMS[state.floors[y][x]].solid;
      }
    }
  }
}

function cleanWaterObjects(){
  for(let y=0;y<WORLD_H;y++) for(let x=0;x<WORLD_W;x++){
    if(state.floors[y][x] === F_WATER && state.objects[y][x] !== null){
      state.objects[y][x] = null;
    }
  }
}

// ============================================================
// ФОРМА ОСТРОВА
// ============================================================
const ISLAND_MARGIN = 4;

function islandShape(tx, ty){
  const cx = WORLD_W / 2, cy = WORLD_H / 2;
  const nx = (tx - cx) / (WORLD_W / 2 - ISLAND_MARGIN);
  const ny = (ty - cy) / (WORLD_H / 2 - ISLAND_MARGIN);
  const d = Math.sqrt(nx*nx + ny*ny);
  const ang = Math.atan2(ty - cy, tx - cx);
  const noise =
    Math.sin(ang * 3 + 1.2) * 0.10 +
    Math.sin(ang * 5 - 2.3) * 0.07 +
    Math.sin(ang * 7 + 0.8) * 0.05 +
    Math.sin(ang * 11 + 0.3) * 0.03 +
    Math.sin(ang * 17 - 1.5) * 0.02;
  return d + noise;
}

// ============================================================
// ХЕЛПЕРЫ
// ============================================================
function paintFloorCircle(cx, cy, r, type, allowed, rng){
  for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){
    if(!inBounds(x,y)) continue;
    const dx = x-cx, dy = y-cy;
    if(dx*dx + dy*dy <= r*r && allowed.includes(state.floors[y][x])){
      state.floors[y][x] = type;
    }
  }
}

function plantTree(tx, ty, rng){
  for(let i=0;i<3;i++){
    const yy = ty - i;
    if(!inBounds(tx, yy)) return false;
    if(isFloorWater(tx, yy)) return false;
    if(state.objects[yy][tx] !== null && state.objects[yy][tx] !== O_LEAVES) return false;
  }
  const topY = ty - 2;
  for(let dy=-2;dy<=0;dy++) for(let dx=-1;dx<=1;dx++){
    if(dy === -2 && dx !== 0) continue;
    const x = tx + dx, y = topY + dy - 1;
    if(!inBounds(x, y)) continue;
    if(dx === 0 && dy === 0) continue;
    if(isFloorWater(x, y)) continue;
    if(state.objects[y][x] === null || state.objects[y][x] === O_LEAVES){
      state.objects[y][x] = O_LEAVES;
    }
  }
  if(inBounds(tx, topY - 2) && !isFloorWater(tx, topY - 2)){
    if(state.objects[topY-2][tx] === null) state.objects[topY-2][tx] = O_LEAVES;
  }
  for(let i=0;i<3;i++) if(inBounds(tx, ty - i)) state.objects[ty-i][tx] = O_TRUNK;
  return true;
}

function growSapling(tx, ty){
  if(state.objects[ty][tx] !== O_SAPLING) return;
  state.objects[ty][tx] = null;
  updateSolidAt(tx, ty);
  plantTree(tx, ty, Math.random);
  for(let y=ty-5;y<=ty+1;y++) for(let x=tx-3;x<=tx+3;x++){
    if(inBounds(x, y)) updateSolidAt(x, y);
  }
}

function updateSaplings(){
  const now = Date.now();
  for(const k in state.saplings){
    const planted = state.saplings[k];
    // Проверяем, полита ли грядка (тогда 30 сек)
    const watered = state.wateredFarmland && state.wateredFarmland[k];
    const growTime = watered ? 30000 : 60000;

    if(now - planted >= growTime){
      const [x, y] = k.split(',').map(Number);
      if(!inBounds(x, y)){
        delete state.saplings[k];
        continue;
      }
      // Если это росток дерева
      if(state.objects[y][x] === O_SAPLING){
        growSapling(x, y);
        delete state.saplings[k];
      }
      // Если картофель — просто остаётся, растение становится "созревшим" по времени
    }
  }
}

// ============================================================
// СТРУКТУРЫ
// ============================================================
function canPlaceAt(tx, ty){
  if(!inBounds(tx, ty)) return false;
  if(state.floors[ty][tx] !== F_GRASS) return false;
  if(state.objects[ty][tx] !== null) return false;
  // Отступ от воды
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    const nx = tx+dx, ny = ty+dy;
    if(!inBounds(nx, ny)) return false;
    if(state.floors[ny][nx] === F_WATER) return false;
  }
  return true;
}

function makeChestLoot(rng, rngInt){
  const slots = new Array(30).fill(null);
  const count = rngInt(3, 8);
  for(let i=0;i<count;i++){
    const r = rng();
    let item;
    if(r < 0.20) item = { type: I_LOG, count: rngInt(4, 12) };
    else if(r < 0.35) item = { type: I_PLANKS, count: rngInt(6, 16) };
    else if(r < 0.45) item = { type: I_STICK, count: rngInt(3, 8) };
    else if(r < 0.55) item = { type: I_IRON_INGOT, count: rngInt(1, 3) };
    else if(r < 0.65) item = { type: I_FLINT, count: rngInt(1, 3) };
    else if(r < 0.75) item = { type: I_EMERALD, count: rngInt(1, 5) };
    else if(r < 0.82) item = { type: I_POTATO, count: rngInt(2, 5) };
    else if(r < 0.88) item = { type: I_WHEAT, count: rngInt(2, 5) };
    else if(r < 0.92) item = { type: I_APPLE, count: rngInt(1, 3) };
    else if(r < 0.96) item = { type: I_MEAT, count: rngInt(1, 3) };
    else item = { type: I_WOOL, count: rngInt(2, 4) };
    const slot = rngInt(0, 29);
    if(!slots[slot]) slots[slot] = item;
  }
  return slots;
}

function placeStructure(kind, tx, ty, rng, rngInt){
  if(!state.lockedBlocks) state.lockedBlocks = {};

  if(kind === 'chest'){
    if(!canPlaceAt(tx, ty)) return false;
    state.objects[ty][tx] = O_CHEST;
    state.chests[`${tx},${ty}`] = makeChestLoot(rng, rngInt);
    return true;
  }
  if(kind === 'table'){
    if(!canPlaceAt(tx, ty)) return false;
    state.objects[ty][tx] = O_TABLE;
    return true;
  }
  if(kind === 'furnace'){
    if(!canPlaceAt(tx, ty)) return false;
    state.objects[ty][tx] = O_FURNACE;
    return true;
  }
  if(kind === 'campfire'){
    if(!canPlaceAt(tx, ty)) return false;
    state.objects[ty][tx] = O_CAMPFIRE;
    return true;
  }
  if(kind === 'house'){
    // 6×6
    for(let yy = ty; yy < ty + 6; yy++){
      for(let xx = tx; xx < tx + 6; xx++){
        if(!canPlaceAt(xx, yy)) return false;
      }
    }
    // Стены
    for(let xx = tx; xx < tx + 6; xx++){
      state.objects[ty][xx] = O_WALL;
      state.objects[ty + 5][xx] = O_WALL;
    }
    for(let yy = ty; yy < ty + 6; yy++){
      state.objects[yy][tx] = O_WALL;
      state.objects[yy][tx + 5] = O_WALL;
    }
    // Дверь
    state.objects[ty + 5][tx + 2] = O_DOOR;
    state.lockedBlocks[`${tx+2},${ty+5}`] = true;

    // Мебель
    state.objects[ty + 1][tx + 1] = O_TABLE;
    state.objects[ty + 1][tx + 3] = O_BED;
    state.objects[ty + 1][tx + 4] = O_CHEST;
    state.objects[ty + 3][tx + 1] = O_FURNACE;
    state.objects[ty + 3][tx + 4] = O_BED;

    state.lockedBlocks[`${tx+1},${ty+1}`] = true;
    state.lockedBlocks[`${tx+3},${ty+1}`] = true;
    state.lockedBlocks[`${tx+4},${ty+1}`] = true;
    state.lockedBlocks[`${tx+1},${ty+3}`] = true;
    state.lockedBlocks[`${tx+4},${ty+3}`] = true;

    state.chests[`${tx+4},${ty+1}`] = new Array(30).fill(null);

    state.villagerSpawn = { x: tx + 2, y: ty + 2 };
    state.villagerDogSpawn = { x: tx + 2, y: ty + 6 };
    return true;
  }
  return false;
}

// ============================================================
// ГЛАВНАЯ ГЕНЕРАЦИЯ
// ============================================================
function generateWorld(seed){
  if(typeof seed !== 'number' || !isFinite(seed)){
    seed = Math.floor(Math.random() * 1e9);
  }
  state.worldSeed = seed;
  const rng = makeSeededRng(seed);
  const rngInt = (a, b) => a + Math.floor(rng() * (b - a + 1));

  // Пустой мир
  for(let y=0;y<WORLD_H;y++){
    state.floors[y] = [];
    state.objects[y] = [];
    state.solidGrid[y] = [];
    for(let x=0;x<WORLD_W;x++){
      state.floors[y][x] = F_GRASS;
      state.objects[y][x] = null;
    }
  }
  for(const k in state.saplings) delete state.saplings[k];
  for(const k in state.chests) delete state.chests[k];
  for(const k in state.lockedBlocks) delete state.lockedBlocks[k];

  state.villagerSpawn = null;
  state.villagerDogSpawn = null;
  state.fireTimers = {};
  state.wateredFarmland = {};
  state.campfireLitAt = {};
  state.openDoors = {};
  state.cakeBites = {};

  // Форма острова
  for(let y=0;y<WORLD_H;y++){
    for(let x=0;x<WORLD_W;x++){
      const edgeDist = Math.min(x, y, WORLD_W - 1 - x, WORLD_H - 1 - y);
      if(edgeDist < ISLAND_MARGIN){
        state.floors[y][x] = F_WATER;
        continue;
      }
      const shape = islandShape(x, y);
      if(shape > 0.94) state.floors[y][x] = F_WATER;
      else if(shape > 0.84) state.floors[y][x] = F_SAND;
      else state.floors[y][x] = F_GRASS;
    }
  }

  // Пятна земли
  for(let i=0;i<80;i++){
    const cx = rngInt(6, WORLD_W-7), cy = rngInt(6, WORLD_H-7);
    if(state.floors[cy][cx] !== F_GRASS) continue;
    paintFloorCircle(cx, cy, rngInt(2, 5), F_DIRT, [F_GRASS], rng);
  }
  // Гравий
  for(let i=0;i<40;i++){
    const cx = rngInt(6, WORLD_W-7), cy = rngInt(6, WORLD_H-7);
    if(state.floors[cy][cx] !== F_GRASS) continue;
    paintFloorCircle(cx, cy, rngInt(1, 3), F_GRAVEL, [F_GRASS, F_DIRT], rng);
  }
  // Цветы и трава
  for(let i=0;i<80;i++){
    const cx = rngInt(6, WORLD_W-7), cy = rngInt(6, WORLD_H-7);
    if(state.floors[cy][cx] !== F_GRASS) continue;
    const type = rng() < 0.5 ? F_FLOWERS : F_TALLGRASS;
    paintFloorCircle(cx, cy, rngInt(1, 3), type, [F_GRASS], rng);
  }

  // Озёра
  for(let i=0;i<10;i++){
    const cx = rngInt(20, WORLD_W-20), cy = rngInt(20, WORLD_H-20);
    if(state.floors[cy][cx] !== F_GRASS) continue;
    const r = rngInt(3, 6);
    paintFloorCircle(cx, cy, r + 1, F_SAND, [F_GRASS, F_DIRT, F_FLOWERS, F_TALLGRASS], rng);
    paintFloorCircle(cx, cy, r, F_WATER, [F_SAND, F_GRASS, F_DIRT, F_FLOWERS, F_TALLGRASS], rng);
  }

  // Деревья
  for(let i=0;i<140;i++){
    const tx = rngInt(6, WORLD_W-7), ty = rngInt(8, WORLD_H-9);
    if(state.floors[ty][tx] !== F_GRASS) continue;
    plantTree(tx, ty, rng);
  }

  // Камень
  for(let i=0;i<25;i++){
    const cx = rngInt(10, WORLD_W-10), cy = rngInt(10, WORLD_H-10);
    if(state.floors[cy][cx] !== F_GRASS) continue;
    const r = rngInt(3, 6);
    for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){
      if(!inBounds(x, y)) continue;
      if(isFloorWater(x, y)) continue;
      const d = (x-cx)**2 + (y-cy)**2;
      if(d <= r*r && rng() < 0.55 && state.objects[y][x] === null){
        state.objects[y][x] = O_STONE;
      }
    }
  }

  // Bedrock
  for(let i=0;i<50;i++){
    const cx = rngInt(10, WORLD_W-10), cy = rngInt(10, WORLD_H-10);
    if(state.floors[cy][cx] !== F_GRASS && state.floors[cy][cx] !== F_DIRT) continue;
    const r = rngInt(1, 3);
    for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){
      if(!inBounds(x, y)) continue;
      if(isFloorWater(x, y)) continue;
      const d = (x-cx)**2 + (y-cy)**2;
      if(d <= r*r && state.objects[y][x] === null) state.floors[y][x] = F_BEDROCK;
    }
  }

  // Железо
  for(let v=0; v<15; v++){
    const cx = rngInt(10, WORLD_W-10), cy = rngInt(10, WORLD_H-10);
    for(let i=0;i<5;i++){
      const tx = cx + rngInt(-2, 2), ty = cy + rngInt(-2, 2);
      if(!inBounds(tx, ty)) continue;
      if(isFloorWater(tx, ty)) continue;
      if(state.objects[ty][tx] === O_STONE) state.objects[ty][tx] = O_IRON_ORE;
    }
  }

  // Структуры — 10 штук, из них 1 дом
  const structureTypes = ['chest', 'table', 'furnace', 'campfire'];
  let placed = 0, attempts = 0;
  while(placed < 1 && attempts < 300){
    attempts++;
    const tx = rngInt(15, WORLD_W - 20);
    const ty = rngInt(15, WORLD_H - 20);
    if(placeStructure('house', tx, ty, rng, rngInt)) placed++;
  }
  placed = 0; attempts = 0;
  while(placed < 12 && attempts < 600){
    attempts++;
    const kind = structureTypes[rngInt(0, structureTypes.length-1)];
    const tx = rngInt(10, WORLD_W - 10);
    const ty = rngInt(10, WORLD_H - 10);
    if(placeStructure(kind, tx, ty, rng, rngInt)) placed++;
  }

  cleanWaterObjects();
  rebuildSolidGrid();
}