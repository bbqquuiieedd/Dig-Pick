// ============================================================
//  water.js — симуляция воды
//  Y-ВВЕРХ: вниз = y - 1, вверх = y + 1.
// ============================================================

const waterMap = new Map();

function waterKey(x, y) { return x + ',' + y; }

function getWater(x, y) {
  return waterMap.get(waterKey(x, y)) || 0;
}

function setWater(x, y, level) {
  if (level <= 0) waterMap.delete(waterKey(x, y));
  else waterMap.set(waterKey(x, y), Math.min(WATER_MAX_LEVEL, level));
}

function addWater(x, y, amount) {
  const cur = getWater(x, y);
  setWater(x, y, cur + amount);
}

function canHoldWater(x, y) {
  const t = getTile(x, y);
  // Вода проходит через природные деревья (не поставленные игроком)
  if (t === TILE_LOG_NATURAL) return true;
  return !isSolid(x, y);
}

// ------------------------------------------------------------
// ОБНОВЛЕНИЕ
//   Вниз — падает при любой разнице (вода не висит в воздухе).
//   В стороны — только если разница ≥ 2 (вода в яме выравнивается).
// ------------------------------------------------------------
function updateWater() {
  const keys = Array.from(waterMap.keys());

  for (const key of keys) {
    const [sx, sy] = key.split(',');
    const x = parseInt(sx, 10);
    const y = parseInt(sy, 10);

    let level = getWater(x, y);
    if (level <= 0) continue;

    // --- 1. Течёт вниз ---
    if (canHoldWater(x, y - 1)) {
      const below = getWater(x, y - 1);
      if (below < WATER_MAX_LEVEL) {
        const space = WATER_MAX_LEVEL - below;
        const transfer = Math.min(level, space);
        if (transfer > 0) {
          setWater(x, y - 1, below + transfer);
          level -= transfer;
          setWater(x, y, level);
          if (level <= 0) continue;
        }
      }
    }

    // --- 2. Течёт в стороны ---
    // Перелив, если: разница ≥ 2, ИЛИ клетка почти полная (≥ 6) и есть перепад.
    if (level > 1) {
      const pour = (diff, isFull) => {
        if (isFull) return 1;                    // «через край» — всегда 1
        if (diff >= 2) return Math.min(Math.floor(diff / 2), WATER_SPREAD_MAX, 1);
        return 0;
      };

      // Левая
      if (canHoldWater(x - 1, y)) {
        const left = getWater(x - 1, y);
        const diff = level - left;
        const transfer = pour(diff, level >= 6 && diff > 0);
        if (transfer > 0) {
          setWater(x - 1, y, left + transfer);
          level -= transfer;
          setWater(x, y, level);
        }
      }
      // Правая
      if (level > 1 && canHoldWater(x + 1, y)) {
        const right = getWater(x + 1, y);
        const diff = level - right;
        const transfer = pour(diff, level >= 6 && diff > 0);
        if (transfer > 0) {
          setWater(x + 1, y, right + transfer);
          level -= transfer;
          setWater(x, y, level);
        }
      }
    }
  }
}

function clearWater() { waterMap.clear(); }

function serializeWater() {
  const out = {};
  for (const [k, v] of waterMap.entries()) out[k] = v;
  return out;
}
function deserializeWater(obj) {
  waterMap.clear();
  for (const k in obj) waterMap.set(k, obj[k]);
}