// ============================================================
//  interaction.js — копание, установка блоков, рамки
// ============================================================

function getTargetTile() {
  const pcx = player.x + player.width  / 2;
  const pcy = player.y + player.height / 2;
  const cursorWorldX = mouse.wx + camera.x;
  const cursorWorldY = mouse.wy + camera.y;
  const pBx = Math.floor(pcx / TILE_SIZE);
  const pBy = Math.floor(pcy / TILE_SIZE);
  const r = INTERACTION_RANGE_TILES;
  const r2 = INTERACTION_RANGE * INTERACTION_RANGE;
  let best = null, bestDist2 = Infinity;
  for (let bx = pBx - r; bx <= pBx + r; bx++) {
    for (let by = pBy - r; by <= pBy + r; by++) {
      const bcx = bx * TILE_SIZE + TILE_SIZE / 2;
      const bcy = by * TILE_SIZE + TILE_SIZE / 2;
      const dpx = bcx - pcx, dpy = bcy - pcy;
      if (dpx * dpx + dpy * dpy > r2) continue;
      const dcx = bcx - cursorWorldX, dcy = bcy - cursorWorldY;
      const dist2 = dcx * dcx + dcy * dcy;
      if (dist2 < bestDist2) { bestDist2 = dist2; best = { bx, by }; }
    }
  }
  return best;
}

function getCursorTile() {
  return {
    bx: Math.floor((mouse.wx + camera.x) / TILE_SIZE),
    by: Math.floor((mouse.wy + camera.y) / TILE_SIZE),
  };
}

function blockOverlapsPlayer(bx, by) {
  const bL = bx * TILE_SIZE, bT = by * TILE_SIZE;
  const bR = bL + TILE_SIZE,  bB = bT + TILE_SIZE;
  return !(player.x + player.width <= bL || player.x >= bR ||
           player.y + player.height <= bT || player.y >= bB);
}

function tryPlaceBlock() {
  const item = slots[activeSlot];
  if (!item) return;
  const target = getTargetTile();
  if (!target) return;
  if (getTile(target.bx, target.by) !== TILE_AIR) return;
  if (blockOverlapsPlayer(target.bx, target.by)) return;
  setTile(target.bx, target.by, item.tileId);
  item.count--;
  if (item.count <= 0) slots[activeSlot] = null;
  hasUnsavedChanges = true;
}

// ------------------------------------------------------------
// Время копания блока с учётом текущего инструмента.
// Сейчас инструментов нет — всегда работаем «руками»,
// то есть с множителем HAND_MULTIPLIER.
// ------------------------------------------------------------
function getToolMultiplier(tileId) {
  const def = TILE_DEFS[tileId];
  if (!def) return HAND_MULTIPLIER;

  // Ищем инструмент в руке (сейчас всегда null — задел на будущее)
  const item = slots[activeSlot];
  const heldTool = (item && item.toolType) ? item.toolType : null;

  if (!heldTool) return HAND_MULTIPLIER;
  if (heldTool === def.tool) return 1;              // правильный инструмент
  return WRONG_TOOL_MULTIPLIER;
}

function updateBreaking() {
  if (!mouse.leftHeld) { breakingBlock = null; breakingProgress = 0; return; }
  const target = getTargetTile();
  if (!target) { breakingBlock = null; breakingProgress = 0; return; }
  const tile = getTile(target.bx, target.by);
  if (tile === TILE_AIR || !TILE_DEFS[tile] || !TILE_DEFS[tile].breakable) {
    breakingBlock = null; breakingProgress = 0; return;
  }

  if (!breakingBlock || breakingBlock.bx !== target.bx || breakingBlock.by !== target.by) {
    breakingBlock = { bx: target.bx, by: target.by };
    breakingProgress = 0;
  }

  // Скорость копания: 1 / (hardness * множитель * TICK_RATE)
  const def = TILE_DEFS[tile];
  const mult = getToolMultiplier(tile);
  const perTick = 1 / (def.hardness * mult * TICK_RATE);
  breakingProgress += perTick;

  if (breakingProgress >= 1) {
    // Дроп: у травы это земля, у камня — камень
    const dropId = def.drop;
    if (dropId !== null && Math.random() < def.dropChance) {
      tryAddToInventory(dropId);
    }
    setTile(breakingBlock.bx, breakingBlock.by, TILE_AIR);
    breakingBlock = null;
    breakingProgress = 0;
  }
}