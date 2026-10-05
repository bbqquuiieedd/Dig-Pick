// ============================================================
//  world.js — чанки, генерация, чтение/запись тайлов
// ============================================================

const chunks = new Map();
function chunkKey(cx, cy) { return cx + ',' + cy; }

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
// РЕЛЬЕФ
// ------------------------------------------------------------
function getSurfaceHeight(wx) {
  if (activeWorldSeed === 'flat') return SURFACE_ROW;
  const n = fbm1D(wx, activeWorldSeed, 4, 0.025);
  return Math.round(SURFACE_ROW - n * SURFACE_AMPLITUDE);
}

// ------------------------------------------------------------
// ПЕЩЕРЫ
// ------------------------------------------------------------
function isCave(wx, wy) {
  if (wy < SURFACE_ROW + 1) return false;
  if (wy > 37) return false;
  const n = valueNoise2D(wx * 0.12, wy * 0.12, activeWorldSeed + 999);
  return Math.abs(n) < CAVE_THRESHOLD * 0.5;
}

// ------------------------------------------------------------
// РУДЫ
// ------------------------------------------------------------
function getOre(wx, wy) {
  const surfaceY = getSurfaceHeight(wx);
  if (wy < surfaceY + 6) return null;
  if (wy > 38) return null;

  const c = valueNoise2D(wx * 0.18, wy * 0.18, activeWorldSeed + 111);
  if (c > COAL_THRESHOLD) return TILE_COAL;

  if (wy > surfaceY + 12) {
    const i = valueNoise2D(wx * 0.22, wy * 0.22, activeWorldSeed + 222);
    if (i > IRON_THRESHOLD) return TILE_IRON;
  }
  return null;
}

// ------------------------------------------------------------
// ДЕРЕВЬЯ
// Используем ХЭШ, а не шум. Хэш даёт независимые значения
// для соседних колонок → деревья стоят точечно, без скоплений.
// ------------------------------------------------------------
function getTreeAt(wx) {
  if (activeWorldSeed === 'flat') return null;

  // Хэш от wx — детерминированный, но «случайный».
  // Порог 1 - TREE_DENSITY: около 10% колонок получают дерево.
  const h = hash1D(wx, activeWorldSeed + 777);
  if (h < 1 - TREE_DENSITY) return null;

  // Высота ствола — тоже через хэш
  const h1 = hash1D(wx, activeWorldSeed + 1001);
  const height = TREE_MIN_HEIGHT + Math.floor(h1 * (TREE_MAX_HEIGHT - TREE_MIN_HEIGHT + 1));
  const topY = getSurfaceHeight(wx) - 1;

  return {
    trunkX: wx,
    baseY: topY,
    height: height,
    leavesRadius: 2,
  };
}

// Проверка, является ли клетка частью листвы какого-то дерева
function getLeavesAt(wx, wy) {
  for (let dx = -3; dx <= 3; dx++) {
    const tree = getTreeAt(wx + dx);
    if (!tree) continue;
    const topBlockY = tree.baseY - tree.height + 1;
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
// ------------------------------------------------------------
function generateChunk(cx, cy) {
  const data = [];

  for (let ly = 0; ly < CHUNK_H; ly++) {
    const row = [];
    const wy = cy * CHUNK_H + ly;
    for (let lx = 0; lx < CHUNK_W; lx++) {
      const wx = cx * CHUNK_W + lx;
      let tile = TILE_AIR;

      if (cy === 0) {
        const surfaceY = getSurfaceHeight(wx);

        if (wy === 39) {
          tile = TILE_BEDROCK;
        } else if (wy === surfaceY) {
          tile = TILE_GRASS;
        } else if (wy > surfaceY && wy <= surfaceY + 4) {
          tile = TILE_DIRT;
        } else if (wy > surfaceY + 4 && wy < 39) {
          tile = TILE_STONE;
          const ore = getOre(wx, wy);
          if (ore) tile = ore;
        } else if (wy < surfaceY) {
          // Над поверхностью — ствол или листва
          const tree = getTreeAt(wx);
          if (tree) {
            const trunkTopY = tree.baseY - tree.height + 1;
            if (wy <= tree.baseY && wy >= trunkTopY) {
              tile = TILE_LOG_NATURAL;
            } else if (getLeavesAt(wx, wy)) {
              tile = TILE_LEAVES;
            }
          } else if (getLeavesAt(wx, wy)) {
            tile = TILE_LEAVES;
          }
        }
      } else if (cy > 0) {
        tile = TILE_BEDROCK;
      } else {
        if (getLeavesAt(wx, wy)) tile = TILE_LEAVES;
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

function getTile(bx, by) {
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(by / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = by - cy * CHUNK_H;
  return getChunk(cx, cy)[ly][lx];
}

function setTile(bx, by, tile) {
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(by / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = by - cy * CHUNK_H;
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