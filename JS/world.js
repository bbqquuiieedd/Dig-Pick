// ============================================================
//  world.js — чанки, генерация, чтение/запись тайлов
//  Публичные функции работают с Y-ВВЕРХ.
//  Внутри данные хранятся в «инвертированной» системе (как раньше),
//  через преобразование:  internalY = SURFACE_ROW - displayY
// ============================================================

const chunks = new Map();
function chunkKey(cx, cy) { return cx + ',' + cy; }

// Преобразование Y-вверх ↔ внутренний Y-вниз
function toInternalY(displayY) { return SURFACE_ROW - displayY; }
function toDisplayY(internalY) { return SURFACE_ROW - internalY; }

// ------------------------------------------------------------
// СИД
// ------------------------------------------------------------
function seedToNumber(seed) {
  if (seed === null || seed === undefined || seed === '') return DEFAULT_SEED;
  if (seed === 'flat') return 'flat';
  if (typeof seed === 'number') return seed;
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ------------------------------------------------------------
// РЕЛЬЕФ (Y-вверх)
// ------------------------------------------------------------
function getSurfaceHeight(wx) {
  if (activeWorldSeed === 'flat') return SURFACE_Y;
  const n = fbm1D(wx, activeWorldSeed, 4, 0.025);   // -1..1
  return Math.round(SURFACE_Y + n * SURFACE_AMPLITUDE);
}

// ------------------------------------------------------------
// ПЕЩЕРЫ (Y-вверх)
// ------------------------------------------------------------
function isCave(wx, wy) {
  if (wy > SURFACE_Y - 1) return false;    // не выше поверхности
  if (wy < WORLD_BOTTOM_Y + 1) return false; // не ниже бедрока
  const n = valueNoise2D(wx * 0.12, wy * 0.12, activeWorldSeed + 999);
  return Math.abs(n) < CAVE_THRESHOLD * 0.5;
}

// ------------------------------------------------------------
// РУДЫ (Y-вверх)
// ------------------------------------------------------------
function getOre(wx, wy) {
  const surfaceY = getSurfaceHeight(wx);
  if (wy > surfaceY - 6) return null;   // не выше 6 блоков от поверхности
  if (wy < WORLD_BOTTOM_Y + 1) return null;

  // Уголь
  const c = valueNoise2D(wx * 0.18, wy * 0.18, activeWorldSeed + 111);
  if (c > COAL_THRESHOLD) return TILE_COAL;

  // Железо — глубоко
  if (wy < surfaceY - 12) {
    const i = valueNoise2D(wx * 0.22, wy * 0.22, activeWorldSeed + 222);
    if (i > IRON_THRESHOLD) return TILE_IRON;
  }
  return null;
}

// ------------------------------------------------------------
// ДЕРЕВЬЯ (Y-вверх)
// ------------------------------------------------------------
function getTreeAt(wx) {
  if (activeWorldSeed === 'flat') return null;

  const h = hash1D(wx, activeWorldSeed + 777);
  if (h < 1 - TREE_DENSITY) return null;

  const h1 = hash1D(wx, activeWorldSeed + 1001);
  const height = TREE_MIN_HEIGHT + Math.floor(h1 * (TREE_MAX_HEIGHT - TREE_MIN_HEIGHT + 1));
  const baseY = getSurfaceHeight(wx) + 1;   // первый блок ствола над травой

  return {
    trunkX: wx,
    baseY: baseY,       // нижний блок ствола
    height: height,
    leavesRadius: 2,
  };
}

function getLeavesAt(wx, wy) {
  for (let dx = -3; dx <= 3; dx++) {
    const tree = getTreeAt(wx + dx);
    if (!tree) continue;
    const topBlockY = tree.baseY + tree.height - 1;
    for (let ly = -tree.leavesRadius; ly <= tree.leavesRadius; ly++) {
      for (let lx = -tree.leavesRadius; lx <= tree.leavesRadius; lx++) {
        if (lx === 0 && ly === 0) continue;
        const cy = topBlockY + ly;
        const cx = tree.trunkX + lx;
        if (cx === wx && cy === wy) {
          if (lx * lx + ly * ly <= tree.leavesRadius * tree.leavesRadius + 1) return true;
        }
      }
    }
  }
  return false;
}

// ------------------------------------------------------------
// ГЕНЕРАЦИЯ ЧАНКА
// Внутри чанка ly = 0..CHUNK_H-1 соответствует внутренним строкам
// cy * CHUNK_H + ly, где 0 = верх, 39 = бедрок.
// Публично это нужно только для getChunk.
// ------------------------------------------------------------
function generateChunk(cx, cy) {
  const data = [];

  for (let ly = 0; ly < CHUNK_H; ly++) {
    const row = [];
    const wyInternal = cy * CHUNK_H + ly;    // внутренняя координата (0=верх, растёт вниз)
    const wyDisplay  = toDisplayY(wyInternal); // публичная Y-вверх
    for (let lx = 0; lx < CHUNK_W; lx++) {
      const wx = cx * CHUNK_W + lx;
      let tile = TILE_AIR;
      const surfaceY = getSurfaceHeight(wx);

      if (wyDisplay <= WORLD_BOTTOM_Y) {
        // Y = -20 и ниже — бедрок
        tile = TILE_BEDROCK;
      } else if (wyDisplay === surfaceY) {
        tile = TILE_GRASS;
      } else if (wyDisplay < surfaceY && wyDisplay >= surfaceY - 4) {
        tile = TILE_DIRT;
      } else if (wyDisplay < surfaceY - 4) {
        // Глубже 4 блоков — камень (и руды)
        tile = TILE_STONE;
        const ore = getOre(wx, wyDisplay);
        if (ore) tile = ore;
      } else {
        // Выше поверхности — ствол дерева, листва или воздух
        const tree = getTreeAt(wx);
        if (tree) {
          const trunkTopY = tree.baseY + tree.height - 1;
          if (wyDisplay >= tree.baseY && wyDisplay <= trunkTopY) {
            tile = TILE_LOG_NATURAL;
          } else if (getLeavesAt(wx, wyDisplay)) {
            tile = TILE_LEAVES;
          }
        } else if (getLeavesAt(wx, wyDisplay)) {
          tile = TILE_LEAVES;
        }
      }

      row.push(tile);
    }
    data.push(row);
  }
  return data;
}

function getChunk(cx, cy) {
  const key = chunkKey(cx, cy);
  let c = chunks.get(key);
  if (!c) { c = generateChunk(cx, cy); chunks.set(key, c); }
  return c;
}

// ------------------------------------------------------------
// ДОСТУП К ТАЙЛАМ — публично Y-ВВЕРХ
// ------------------------------------------------------------
function getTile(bx, by) {
  const internalY = toInternalY(by);
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(internalY / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = internalY - cy * CHUNK_H;
  return getChunk(cx, cy)[ly][lx];
}

function setTile(bx, by, tile) {
  const internalY = toInternalY(by);
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(internalY / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = internalY - cy * CHUNK_H;
  getChunk(cx, cy)[ly][lx] = tile;
  hasUnsavedChanges = true;
}

function isSolid(bx, by) {
  const t = getTile(bx, by);
  return TILE_DEFS[t] ? TILE_DEFS[t].solid : false;
}

function clearWorld() {
  chunks.clear();
  clearWalls();
}