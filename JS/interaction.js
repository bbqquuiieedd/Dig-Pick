// ============================================================
//  interaction.js — копание, установка, ловля рыбы
//  Y-ВВЕРХ во всех координатах.
// ============================================================

function getTargetTile() {
  const pcx = player.x + player.width  / 2;
  const pcy = player.y + player.height / 2;
  const cursorWorldX = mouse.wx;
  const cursorWorldY = mouse.wy;
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
    bx: Math.floor(mouse.wx / TILE_SIZE),
    by: Math.floor(mouse.wy / TILE_SIZE),
  };
}

function blockOverlapsPlayer(bx, by) {
  const bL = bx * TILE_SIZE, bB = by * TILE_SIZE;
  const bR = bL + TILE_SIZE,  bT = bB + TILE_SIZE;
  return !(player.x + player.width <= bL || player.x >= bR ||
           player.y + player.height <= bB || player.y >= bT);
}

function tryPlaceBlock() {
  const item = slots[activeSlot];
  if (!item) return;
  if (item.tileId < 0) return;

  const target = getTargetTile();
  if (!target) return;
  if (getTile(target.bx, target.by) !== TILE_AIR) return;
  if (blockOverlapsPlayer(target.bx, target.by)) return;
  setTile(target.bx, target.by, item.tileId);
  item.count--;
  if (item.count <= 0) slots[activeSlot] = null;
  hasUnsavedChanges = true;
}

function handleEmptyRightClick() {
  if (tryCatchFish()) return true;
  return false;
}

function getToolMultiplier(tileId) {
  const def = TILE_DEFS[tileId];
  if (!def) return HAND_MULTIPLIER;
  const item = slots[activeSlot];
  const heldTool = (item && item.toolType) ? item.toolType : null;
  if (!heldTool) return HAND_MULTIPLIER;
  if (heldTool === def.tool) return 1;
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
  const def = TILE_DEFS[tile];
  const mult = getToolMultiplier(tile);
  const perTick = 1 / (def.hardness * mult * TICK_RATE);
  breakingProgress += perTick;
  if (breakingProgress >= 1) {
    const dropId = def.drop;
    if (dropId !== null && Math.random() < def.dropChance) {
      tryAddItemToInventory(dropId, 1);
    }
    setTile(breakingBlock.bx, breakingBlock.by, TILE_AIR);
    breakingBlock = null;
    breakingProgress = 0;
  }
}