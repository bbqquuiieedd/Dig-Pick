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

// Старая функция для блоков (совместимость)
function tryAddToInventory(tileId) {
  return tryAddItemToInventory(tileId, 1);
}

// Универсальная функция — принимает любой id (блок или предмет)
function tryAddItemToInventory(itemId, count) {
  count = count || 1;
  for (let n = 0; n < count; n++) {
    let placed = false;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.tileId === itemId && s.count < MAX_STACK) {
        s.count++; placed = true; break;
      }
    }
    if (placed) continue;
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i]) {
        slots[i] = { tileId: itemId, count: 1 };
        placed = true;
        break;
      }
    }
    if (!placed) return false;
  }
  hasUnsavedChanges = true;
  return true;
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
  const x = (UI_W - width) / 2;
  const y = UI_H - height - 20;
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

// Получить определение для отрисовки — блок или предмет
function getItemDef(itemId) {
  if (itemId < 0) return ITEM_DEFS[itemId];
  return TILE_DEFS[itemId];
}

function drawItemIcon(itemId, x, y, size) {
  const def = getItemDef(itemId);
  if (!def) return;
  if (itemId === TILE_GRASS) {
    drawTexture('dirt', x, y, size, size);
    drawTexture('grass', x, y, size, size);
  } else if (def.texture) {
    drawTexture(def.texture, x, y, size, size);
  }
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
    drawItemIcon(item.tileId, r.x + 5, r.y + 5, SLOT_SIZE - 10);
    if (item.count > 1) {
      ctx.font = '12px ' + FONT_FAMILY;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000';
      ctx.fillText(item.count.toString(), r.x + r.w - 3, r.y + r.h - 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(item.count.toString(), r.x + r.w - 4, r.y + r.h - 2);
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
  const iconSize = SLOT_SIZE - 10;
  const ix = mouse.ux - iconSize / 2;
  const iy = mouse.uy - iconSize / 2;
  drawItemIcon(dragging.tileId, ix, iy, iconSize);

  if (dragging.count > 1) {
    ctx.font = '12px ' + FONT_FAMILY;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#000';
    ctx.fillText(dragging.count.toString(), mouse.ux + iconSize/2, mouse.uy + iconSize/2);
    ctx.fillStyle = '#fff';
    ctx.fillText(dragging.count.toString(), mouse.ux + iconSize/2 - 1, mouse.uy + iconSize/2 - 1);
  }
}