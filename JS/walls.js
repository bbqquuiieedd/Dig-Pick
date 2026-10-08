// ============================================================
//  walls.js — слой стен (задний фон)
//  Публично Y-ВВЕРХ (как world.js).
// ============================================================

const wallChunks = new Map();
function wallChunkKey(cx, cy) { return cx + ',' + cy; }

// Генерация стены для клетки (в публичном Y-вверх).
function generateWallChunk(cx, cy) {
  const data = [];
  for (let ly = 0; ly < CHUNK_H; ly++) {
    const row = [];
    const wyInternal = cy * CHUNK_H + ly;
    const wyDisplay  = toDisplayY(wyInternal);
    for (let lx = 0; lx < CHUNK_W; lx++) {
      const wx = cx * CHUNK_W + lx;
      let wall = WALL_AIR;
      const surfaceY = getSurfaceHeight(wx);

      if (wyDisplay <= WORLD_BOTTOM_Y) {
        // Бедрок и ниже
        wall = WALL_BEDROCK;
      } else if (wyDisplay <= surfaceY && wyDisplay >= surfaceY - 4) {
        // Земля и трава — земляная стена
        wall = WALL_DIRT;
      } else if (wyDisplay < surfaceY - 4) {
        // Камень — каменная стена
        wall = WALL_STONE;
      }
      // Выше поверхности — WALL_AIR

      row.push(wall);
    }
    data.push(row);
  }
  return data;
}

function getWallChunk(cx, cy) {
  const key = wallChunkKey(cx, cy);
  let c = wallChunks.get(key);
  if (!c) { c = generateWallChunk(cx, cy); wallChunks.set(key, c); }
  return c;
}

function getWall(bx, by) {
  const internalY = toInternalY(by);
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(internalY / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = internalY - cy * CHUNK_H;
  return getWallChunk(cx, cy)[ly][lx];
}

function setWall(bx, by, wall) {
  const internalY = toInternalY(by);
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(internalY / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = internalY - cy * CHUNK_H;
  getWallChunk(cx, cy)[ly][lx] = wall;
  hasUnsavedChanges = true;
}

function clearWalls() { wallChunks.clear(); }