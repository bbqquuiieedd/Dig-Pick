// ============================================================
//  world.js — чанки, чтение/запись тайлов и стен
// ============================================================

const chunks = new Map();
function chunkKey(cx, cy) { return cx + ',' + cy; }

// ------------------------------------------------------------
// ГЕНЕРАЦИЯ ЧАНКА БЛОКОВ
// ------------------------------------------------------------
function generateChunk(cx, cy) {
  const data = [];
  for (let ly = 0; ly < CHUNK_H; ly++) {
    const row = [];
    const wy = cy * CHUNK_H + ly;
    for (let lx = 0; lx < CHUNK_W; lx++) {
      let tile = TILE_AIR;
      if (cy === 0) {
        if (wy === SURFACE_ROW)                                  tile = TILE_GRASS;
        else if (wy >= SURFACE_ROW + 1 && wy <= SURFACE_ROW + 4) tile = TILE_DIRT;
        else if (wy >= SURFACE_ROW + 5 && wy <= 38)              tile = TILE_STONE;
        else if (wy === 39)                                      tile = TILE_BEDROCK;
      } else if (cy > 0) {
        tile = TILE_BEDROCK;
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