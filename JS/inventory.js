// ============================================================
//  inventory.js — слоты, drag&drop, отрисовка сетки
// ============================================================

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  if (!inventoryOpen && dragging) {
    if (draggingStartSlot >= 0 && !slots[draggingStartSlot]) slots[draggingStartSlot] = dragging;
    else for (let i = 0; i < slots.length; i++) if (!slots[i]) { slots[i] = dragging; break; }
    dragging = null; draggingStartSlot = -1;
  }
}

function tryAddToInventory(tileId) {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s && s.tileId === tileId && s.count < MAX_STACK) {
      s.count++; hasUnsavedChanges = true; return true;
    }
  }
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) { slots[i] = { tileId, count: 1 }; hasUnsavedChanges = true; return true; }
  }
  return false;
}

function handleSlotClick(slot, button) {
  if (button !== 0) return;
  if (!dragging) {
    const item = slots[slot];
    if (item) { dragging = item; draggingStartSlot = slot; slots[slot] = null; }
  } else {
    const target = slots[slot];
    if (!target) { slots[slot] = dragging; dragging = null; draggingStartSlot = -1; }
    else if (target.tileId === dragging.tileId) {
      const space = MAX_STACK - target.count;
      if (space >= dragging.count) { target.count += dragging.count; dragging = null; draggingStartSlot = -1; }
      else { target.count = MAX_STACK; dragging.count -= space; draggingStartSlot = slot; }
    } else { slots[slot] = dragging; dragging = target; draggingStartSlot = slot; }
    hasUnsavedChanges = true;
  }
}

function getInventoryPanelRect() {
  const width  = INVENTORY_COLS * SLOT_STEP - SLOT_GAP;
  const height = INVENTORY_ROWS * SLOT_STEP - SLOT_GAP;
  const x = (VIEW_WIDTH - width) / 2;
  const y = VIEW_HEIGHT - height - 20;
  return { x, y, width, height };
}

function getSlotRect(slotIndex) {
  const col = slotIndex % INVENTORY_COLS;
  const slotRow = Math.floor(slotIndex / INVENTORY_COLS);
  const visualRowFromTop = INVENTORY_ROWS - 1 - slotRow;
  const panel = getInventoryPanelRect();
  return {
    x: panel.x + col * SLOT_STEP,
    y: panel.y + visualRowFromTop * SLOT_STEP,
    w: SLOT_SIZE, h: SLOT_SIZE,
  };
}

function getSlotAt(mx, my) {
  if (gameState !== 'playing') return -1;
  const panel = getInventoryPanelRect();
  if (mx < panel.x || mx >= panel.x + panel.width)  return -1;
  if (my < panel.y || my >= panel.y + panel.height) return -1;
  const dx = mx - panel.x, dy = my - panel.y;
  const col = Math.floor(dx / SLOT_STEP);
  const visualRowFromTop = Math.floor(dy / SLOT_STEP);
  if (col < 0 || col >= INVENTORY_COLS) return -1;
  if (visualRowFromTop < 0 || visualRowFromTop >= INVENTORY_ROWS) return -1;
  if (dx - col * SLOT_STEP >= SLOT_SIZE) return -1;
  if (dy - visualRowFromTop * SLOT_STEP >= SLOT_SIZE) return -1;
  const slotRow = INVENTORY_ROWS - 1 - visualRowFromTop;
  if (!inventoryOpen && slotRow !== 0) return -1;
  return slotRow * INVENTORY_COLS + col;
}

function drawSlot(slotIndex, isActive) {
  const r = getSlotRect(slotIndex);
  ctx.fillStyle = 'rgba(20, 20, 25, 0.78)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = isActive ? '#ffd54a' : '#555';
  ctx.lineWidth = isActive ? 2 : 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  const item = slots[slotIndex];
  if (item) {
    const def = TILE_DEFS[item.tileId];
    if (def) {
      if (item.tileId === TILE_GRASS) {
        drawTexture('dirt', r.x + 5, r.y + 5, SLOT_SIZE - 10, SLOT_SIZE - 10);
        drawTexture('grass', r.x + 5, r.y + 5, SLOT_SIZE - 10, SLOT_SIZE - 10);
      } else if (def.texture) {
        drawTexture(def.texture, r.x + 5, r.y + 5, SLOT_SIZE - 10, SLOT_SIZE - 10);
      }
    }
    if (item.count > 1) {
      ctx.font = '12px ' + FONT_FAMILY;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000'; ctx.fillText(item.count.toString(), r.x + r.w - 3, r.y + r.h - 1);
      ctx.fillStyle = '#fff'; ctx.fillText(item.count.toString(), r.x + r.w - 4, r.y + r.h - 2);
    }
  }
}

function drawInventoryUI() {
  if (gameState !== 'playing') return;
  if (inventoryOpen) for (let i = 0; i < INVENTORY_SLOTS; i++) drawSlot(i, i === activeSlot);
  else                for (let i = 0; i < HOTBAR_SLOTS; i++)     drawSlot(i, i === activeSlot);
}

function drawDraggingItem() {
  if (!dragging) return;
  const def = TILE_DEFS[dragging.tileId];
  if (!def) return;
  const iconSize = SLOT_SIZE - 10;
  const ix = mouse.x - iconSize / 2;
  const iy = mouse.y - iconSize / 2;
  if (dragging.tileId === TILE_GRASS) {
    drawTexture('dirt', ix, iy, iconSize, iconSize);
    drawTexture('grass', ix, iy, iconSize, iconSize);
  } else if (def.texture) drawTexture(def.texture, ix, iy, iconSize, iconSize);

  if (dragging.count > 1) {
    ctx.font = '12px ' + FONT_FAMILY;
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#000'; ctx.fillText(dragging.count.toString(), mouse.x + iconSize/2, mouse.y + iconSize/2);
    ctx.fillStyle = '#fff'; ctx.fillText(dragging.count.toString(), mouse.x + iconSize/2 - 1, mouse.y + iconSize/2 - 1);
  }
}