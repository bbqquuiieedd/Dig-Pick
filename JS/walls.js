// ============================================================
//  walls.js — слой стен (задний фон)
// ============================================================

const wallChunks = new Map();

function wallChunkKey(cx, cy) { return cx + ',' + cy; }

// ------------------------------------------------------------
// ГЕНЕРАЦИЯ СТЕН
// Стены идут за землёй/камнем/бедроком. За рудой (когда появится) — тоже камень.
// ------------------------------------------------------------
function generateWallChunk(cx, cy) {
  const data = [];
  for (let ly = 0; ly < CHUNK_H; ly++) {
    const row = [];
    const wy = cy * CHUNK_H + ly;
    for (let lx = 0; lx < CHUNK_W; lx++) {
      let wall = WALL_AIR;
      if (cy === 0) {
        // Трава и земля — земляная стена
        if (wy >= SURFACE_ROW && wy <= SURFACE_ROW + 4) {
          wall = WALL_DIRT;
        }
        // Камень — каменная стена
        else if (wy >= SURFACE_ROW + 5 && wy <= 38) {
          wall = WALL_STONE;
        }
        // Бедрок — стена бедрока
        else if (wy === 39) {
          wall = WALL_BEDROCK;
        }
      } else if (cy > 0) {
        wall = WALL_BEDROCK;
      }
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
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(by / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = by - cy * CHUNK_H;
  return getWallChunk(cx, cy)[ly][lx];
}

function setWall(bx, by, wall) {
  const cx = Math.floor(bx / CHUNK_W);
  const cy = Math.floor(by / CHUNK_H);
  const lx = bx - cx * CHUNK_W;
  const ly = by - cy * CHUNK_H;
  getWallChunk(cx, cy)[ly][lx] = wall;
  hasUnsavedChanges = true;
}

function clearWalls() { wallChunks.clear(); }