// ============================================================
//  Dig-Pick — платформер в стиле Terraria
// ============================================================

// ------------------------------------------------------------
// 1. КОНСТАНТЫ
// ------------------------------------------------------------
const TILE_SIZE  = 32;
const GRAVITY    = 0.5;
const MOVE_SPEED = 4;
const JUMP_VEL   = -10;
const MAX_FALL   = 15;
const CROUCH_SPEED_MULT = 0.5;

const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;
const MAX_ACCUMULATOR = 200;

const CHUNK_W = 20;
const CHUNK_H = 40;

const INTERACTION_RANGE_TILES = 5;
const INTERACTION_RANGE = INTERACTION_RANGE_TILES * TILE_SIZE;

const BREAK_TIME = 1.0;
const BREAK_PROGRESS_PER_TICK = 1 / (TICK_RATE * BREAK_TIME);

const INVENTORY_COLS = 10;
const INVENTORY_ROWS = 4;
const INVENTORY_SLOTS = INVENTORY_COLS * INVENTORY_ROWS;
const HOTBAR_SLOTS = 10;
const MAX_STACK = 999;
const SLOT_SIZE = 48;
const SLOT_GAP = 4;
const SLOT_STEP = SLOT_SIZE + SLOT_GAP;

const PLAYER_STAND_HEIGHT  = TILE_SIZE * 2;
const PLAYER_CROUCH_HEIGHT = TILE_SIZE;

let VIEW_WIDTH  = 0;
let VIEW_HEIGHT = 0;

// ------------------------------------------------------------
// 2. ХОЛСТ
// ------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  VIEW_WIDTH  = window.innerWidth;
  VIEW_HEIGHT = window.innerHeight;

  canvas.width  = Math.floor(VIEW_WIDTH  * dpr);
  canvas.height = Math.floor(VIEW_HEIGHT * dpr);
  canvas.style.width  = VIEW_WIDTH  + 'px';
  canvas.style.height = VIEW_HEIGHT + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ------------------------------------------------------------
// 3. ТЕКСТУРЫ
// ------------------------------------------------------------
const TEXTURE_PATHS = {
  missing:      'Textures/PNG/missing.png',
  grass:        'Textures/PNG/grass.png',
  dirt:         'Textures/PNG/dirt.png',
  stone:        'Textures/PNG/stone.png',
  bedrock:      'Textures/PNG/bedrock.png',
  frameCursor:  'Textures/PNG/frame_cursor.png',  // рамка под курсором (вне радиуса)
  frameBlock:   'Textures/PNG/frame_block.png',   // рамка на целевом блоке
  cracks:       'Textures/PNG/cracks.png',        // трещины при копании
  player:       'Textures/PNG/player.png',
  playerCrouch: 'Textures/PNG/player_crouch.png',
  playerJump:   'Textures/PNG/player_jump.png',
  playerFall:   'Textures/PNG/player_fall.png',
};

const textures = {};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload  = () => resolve(img);
    img.onerror = () => {
      console.warn(`Не удалось загрузить текстуру: ${src}`);
      resolve(null);
    };
  });
}

async function loadAllTextures() {
  textures.missing = await loadImage(TEXTURE_PATHS.missing);

  const keys = Object.keys(TEXTURE_PATHS).filter(k => k !== 'missing');
  const images = await Promise.all(keys.map(k => loadImage(TEXTURE_PATHS[k])));

  keys.forEach((key, i) => {
    textures[key] = images[i] || textures.missing;
  });
  console.log('Текстуры загружены:', textures);
}

function drawTexture(name, x, y, w, h) {
  const tex = textures[name];
  if (tex && tex.complete && tex.naturalWidth > 0) {
    ctx.drawImage(tex, x, y, w, h);
  }
}

function drawTextureAlpha(name, x, y, w, h, alpha) {
  const tex = textures[name];
  if (!tex || !tex.complete || tex.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(tex, x, y, w, h);
  ctx.restore();
}

function drawTextureFlipped(name, x, y, w, h, flip) {
  const tex = textures[name];
  if (!tex || !tex.complete || tex.naturalWidth === 0) return;

  if (flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(tex, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(tex, x, y, w, h);
  }
}

// ------------------------------------------------------------
// 4. ТАЙЛЫ
// ------------------------------------------------------------
const TILE_AIR     = 0;
const TILE_DIRT    = 1;
const TILE_GRASS   = 2;
const TILE_STONE   = 3;
const TILE_BEDROCK = 4;

const TILE_DEFS = {
  [TILE_AIR]:     { solid: false, breakable: false, texture: null,      name: 'Воздух' },
  [TILE_DIRT]:    { solid: true,  breakable: true,  texture: 'dirt',    name: 'Земля' },
  [TILE_GRASS]:   { solid: true,  breakable: true,  texture: 'grass',   name: 'Трава' },
  [TILE_STONE]:   { solid: true,  breakable: true,  texture: 'stone',   name: 'Камень' },
  [TILE_BEDROCK]: { solid: true,  breakable: false, texture: 'bedrock', name: 'Бедрок' },
};

// ------------------------------------------------------------
// 5. МИР (чанки)
// ------------------------------------------------------------
const chunks = new Map();

function chunkKey(cx, cy) { return cx + ',' + cy; }

function generateChunk(cx, cy) {
  const data = [];
  for (let ly = 0; ly < CHUNK_H; ly++) {
    const row = [];
    const wy = cy * CHUNK_H + ly;
    for (let lx = 0; lx < CHUNK_W; lx++) {
      let tile = TILE_AIR;

      if (cy === 0) {
        if (wy === 20)                    tile = TILE_GRASS;
        else if (wy >= 21 && wy <= 24)    tile = TILE_DIRT;
        else if (wy >= 25 && wy <= 38)    tile = TILE_STONE;
        else if (wy === 39)               tile = TILE_BEDROCK;
      } else if (cy > 0) {
        tile = TILE_BEDROCK;
      }
      // cy < 0 — воздух (можно строить вверх)

      row.push(tile);
    }
    data.push(row);
  }
  return data;
}

function getChunk(cx, cy) {
  const key = chunkKey(cx, cy);
  let c = chunks.get(key);
  if (!c) {
    c = generateChunk(cx, cy);
    chunks.set(key, c);
  }
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
}

function isSolid(bx, by) {
  const t = getTile(bx, by);
  return TILE_DEFS[t] ? TILE_DEFS[t].solid : false;
}

// ------------------------------------------------------------
// 6. ИГРОК
// ------------------------------------------------------------
const player = {
  x: 0,
  y: 20 * TILE_SIZE - PLAYER_STAND_HEIGHT,
  width:  TILE_SIZE,
  height: PLAYER_STAND_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: false,
  isCrouching: false,
  facing: 'right',
};

// ------------------------------------------------------------
// 7. ВВОД
// ------------------------------------------------------------
const keys = {};
let lastDirectionKey = null;

const mouse = {
  x: 0,
  y: 0,
  leftHeld: false,
};

const INVENTORY_KEYS = new Set(['KeyE', 'Tab', 'KeyI', 'Escape']);

function isLeftKey(code)  { return code === 'KeyA' || code === 'ArrowLeft';  }
function isRightKey(code) { return code === 'KeyD' || code === 'ArrowRight'; }
function isLeftPressed()  { return !!(keys['KeyA'] || keys['ArrowLeft']);  }
function isRightPressed() { return !!(keys['KeyD'] || keys['ArrowRight']); }

function wantsToCrouch() {
  return !!(keys['KeyS'] || keys['ShiftLeft'] || keys['ShiftRight'] || keys['ArrowDown']);
}
function isJumpPressed() {
  return !!(keys['Space'] || keys['KeyW'] || keys['ArrowUp']);
}

window.addEventListener('keydown', (e) => {
  const wasPressed = keys[e.code] === true;
  keys[e.code] = true;

  if (e.code === 'F3') {
    debugOverlay = !debugOverlay;
    e.preventDefault();
    return;
  }

  if (INVENTORY_KEYS.has(e.code) && !wasPressed) {
    toggleInventory();
    e.preventDefault();
    return;
  }

  // Цифры 1..9, 0 — выбор активного слота хотбара
  if (!wasPressed) {
    if (e.code === 'Digit0') { activeSlot = 9; e.preventDefault(); return; }
    const m = e.code.match(/^Digit([1-9])$/);
    if (m) {
      activeSlot = parseInt(m[1], 10) - 1;
      e.preventDefault();
      return;
    }
  }

  if (!wasPressed) {
    if (isLeftKey(e.code))  lastDirectionKey = 'left';
    if (isRightKey(e.code)) lastDirectionKey = 'right';
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;

  if (isLeftKey(e.code) && lastDirectionKey === 'left') {
    lastDirectionKey = isRightPressed() ? 'right' : null;
  }
  if (isRightKey(e.code) && lastDirectionKey === 'right') {
    lastDirectionKey = isLeftPressed() ? 'left' : null;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  // Инвентарь открыт — работаем только с UI
  if (inventoryOpen) {
    const slot = getSlotAt(mouse.x, mouse.y);
    if (slot >= 0) {
      handleSlotClick(slot, e.button);
    }
    e.preventDefault();
    return;
  }

  // Клик по хотбару
  const hotbarSlot = getSlotAt(mouse.x, mouse.y);
  if (hotbarSlot >= 0 && hotbarSlot < HOTBAR_SLOTS) {
    if (e.button === 0) activeSlot = hotbarSlot;
    e.preventDefault();
    return;
  }

  // Клик по миру
  if (e.button === 0) {
    mouse.leftHeld = true;
  } else if (e.button === 2) {
    tryPlaceBlock();
  }
  e.preventDefault();
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    mouse.leftHeld = false;
  }
});

canvas.addEventListener('wheel', (e) => {
  if (inventoryOpen) return;
  const delta = e.deltaY > 0 ? 1 : -1;
  activeSlot = (activeSlot + delta + HOTBAR_SLOTS) % HOTBAR_SLOTS;
  e.preventDefault();
}, { passive: false });

// ------------------------------------------------------------
// 8. ИНВЕНТАРЬ
// ------------------------------------------------------------
const slots = new Array(INVENTORY_SLOTS).fill(null);
let activeSlot = 0;
let inventoryOpen = false;
let dragging = null;
let draggingStartSlot = -1;

function toggleInventory() {
  inventoryOpen = !inventoryOpen;

  // При закрытии — вернуть перетаскиваемый предмет обратно
  if (!inventoryOpen && dragging) {
    if (draggingStartSlot >= 0 && !slots[draggingStartSlot]) {
      slots[draggingStartSlot] = dragging;
    } else {
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i]) { slots[i] = dragging; break; }
      }
    }
    dragging = null;
    draggingStartSlot = -1;
  }
}

function tryAddToInventory(tileId) {
  // Сначала — в существующий стек
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s && s.tileId === tileId && s.count < MAX_STACK) {
      s.count++;
      return true;
    }
  }
  // Потом — в свободную ячейку
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) {
      slots[i] = { tileId, count: 1 };
      return true;
    }
  }
  return false;
}

function handleSlotClick(slot, button) {
  if (button !== 0) return; // пока только ЛКМ

  if (!dragging) {
    const item = slots[slot];
    if (item) {
      dragging = item;
      draggingStartSlot = slot;
      slots[slot] = null;
    }
  } else {
    const target = slots[slot];
    if (!target) {
      slots[slot] = dragging;
      dragging = null;
      draggingStartSlot = -1;
    } else if (target.tileId === dragging.tileId) {
      const space = MAX_STACK - target.count;
      if (space >= dragging.count) {
        target.count += dragging.count;
        dragging = null;
        draggingStartSlot = -1;
      } else {
        target.count = MAX_STACK;
        dragging.count -= space;
        draggingStartSlot = slot;
      }
    } else {
      slots[slot] = dragging;
      dragging = target;
      draggingStartSlot = slot;
    }
  }
}

// ------------------------------------------------------------
// 9. UI
// ------------------------------------------------------------
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
  const x = panel.x + col * SLOT_STEP;
  const y = panel.y + visualRowFromTop * SLOT_STEP;
  return { x, y, w: SLOT_SIZE, h: SLOT_SIZE };
}

function getSlotAt(mx, my) {
  const panel = getInventoryPanelRect();
  if (mx < panel.x || mx >= panel.x + panel.width)  return -1;
  if (my < panel.y || my >= panel.y + panel.height) return -1;

  const dx = mx - panel.x;
  const dy = my - panel.y;

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

function drawSlot(slotIndex, isActiveHotbar) {
  const r = getSlotRect(slotIndex);

  ctx.fillStyle = 'rgba(20, 20, 25, 0.75)';
  ctx.fillRect(r.x, r.y, r.w, r.h);

  ctx.strokeStyle = isActiveHotbar ? '#ffd54a' : '#555';
  ctx.lineWidth   = isActiveHotbar ? 2 : 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  const item = slots[slotIndex];
  if (item) {
    const def = TILE_DEFS[item.tileId];
    if (def && def.texture) {
      const iconSize = SLOT_SIZE - 10;
      drawTexture(def.texture, r.x + 5, r.y + 5, iconSize, iconSize);
    }

    if (item.count > 1) {
      ctx.font = 'bold 12px monospace';
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
  if (inventoryOpen) {
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      drawSlot(i, i === activeSlot);
    }
  } else {
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      drawSlot(i, i === activeSlot);
    }
  }
}

function drawDraggingItem() {
  if (!dragging) return;
  const def = TILE_DEFS[dragging.tileId];
  if (!def || !def.texture) return;

  const iconSize = SLOT_SIZE - 10;
  const ix = mouse.x - iconSize / 2;
  const iy = mouse.y - iconSize / 2;
  drawTexture(def.texture, ix, iy, iconSize, iconSize);

  if (dragging.count > 1) {
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#000';
    ctx.fillText(dragging.count.toString(), mouse.x + iconSize/2, mouse.y + iconSize/2);
    ctx.fillStyle = '#fff';
    ctx.fillText(dragging.count.toString(), mouse.x + iconSize/2 - 1, mouse.y + iconSize/2 - 1);
  }
}

// ------------------------------------------------------------
// 10. ВЗАИМОДЕЙСТВИЕ С МИРОМ
// ------------------------------------------------------------
let breakingBlock = null;
let breakingProgress = 0;

// Целевой блок — ближайший к курсору внутри радиуса
function getTargetTile() {
  const pcx = player.x + player.width  / 2;
  const pcy = player.y + player.height / 2;

  const cursorWorldX = mouse.x + camera.x;
  const cursorWorldY = mouse.y + camera.y;

  const pBx = Math.floor(pcx / TILE_SIZE);
  const pBy = Math.floor(pcy / TILE_SIZE);

  const r = INTERACTION_RANGE_TILES;
  const r2 = INTERACTION_RANGE * INTERACTION_RANGE;

  let best = null;
  let bestDist2 = Infinity;

  for (let bx = pBx - r; bx <= pBx + r; bx++) {
    for (let by = pBy - r; by <= pBy + r; by++) {
      const bcx = bx * TILE_SIZE + TILE_SIZE / 2;
      const bcy = by * TILE_SIZE + TILE_SIZE / 2;

      const dpx = bcx - pcx;
      const dpy = bcy - pcy;
      if (dpx * dpx + dpy * dpy > r2) continue;

      const dcx = bcx - cursorWorldX;
      const dcy = bcy - cursorWorldY;
      const dist2 = dcx * dcx + dcy * dcy;
      if (dist2 < bestDist2) {
        bestDist2 = dist2;
        best = { bx, by };
      }
    }
  }
  return best;
}

// Блок ровно под курсором (без ограничения радиуса)
function getCursorTile() {
  const wx = mouse.x + camera.x;
  const wy = mouse.y + camera.y;
  return {
    bx: Math.floor(wx / TILE_SIZE),
    by: Math.floor(wy / TILE_SIZE),
  };
}

function blockOverlapsPlayer(bx, by) {
  const bLeft   = bx * TILE_SIZE;
  const bTop    = by * TILE_SIZE;
  const bRight  = bLeft + TILE_SIZE;
  const bBottom = bTop + TILE_SIZE;

  return !(player.x + player.width  <= bLeft ||
           player.x                  >= bRight ||
           player.y + player.height  <= bTop ||
           player.y                  >= bBottom);
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
}

function updateBreaking() {
  if (!mouse.leftHeld) {
    breakingBlock = null;
    breakingProgress = 0;
    return;
  }

  const target = getTargetTile();
  if (!target) {
    breakingBlock = null;
    breakingProgress = 0;
    return;
  }

  const tile = getTile(target.bx, target.by);
  if (tile === TILE_AIR || !TILE_DEFS[tile] || !TILE_DEFS[tile].breakable) {
    breakingBlock = null;
    breakingProgress = 0;
    return;
  }

  if (!breakingBlock || breakingBlock.bx !== target.bx || breakingBlock.by !== target.by) {
    breakingBlock = { bx: target.bx, by: target.by };
    breakingProgress = 0;
  }

  breakingProgress += BREAK_PROGRESS_PER_TICK;

  if (breakingProgress >= 1) {
    if (tryAddToInventory(tile)) {
      setTile(breakingBlock.bx, breakingBlock.by, TILE_AIR);
    }
    breakingBlock = null;
    breakingProgress = 0;
  }
}

// ------------------------------------------------------------
// 11. ПРИСЕД
// ------------------------------------------------------------
function canStandUp() {
  const feetY   = player.y + player.height;
  const newTopY = feetY - PLAYER_STAND_HEIGHT;

  const topTile    = Math.floor(newTopY / TILE_SIZE);
  const bottomTile = Math.floor((player.y - 0.01) / TILE_SIZE);
  const left  = Math.floor((player.x + 1) / TILE_SIZE);
  const right = Math.floor((player.x + player.width - 1) / TILE_SIZE);

  for (let by = topTile; by <= bottomTile; by++) {
    for (let bx = left; bx <= right; bx++) {
      if (isSolid(bx, by)) return false;
    }
  }
  return true;
}

function standUp() {
  const feetY = player.y + player.height;
  player.height = PLAYER_STAND_HEIGHT;
  player.y = feetY - player.height;
  player.isCrouching = false;
}

function crouchDown() {
  const feetY = player.y + player.height;
  player.height = PLAYER_CROUCH_HEIGHT;
  player.y = feetY - player.height;
  player.isCrouching = true;
}

function updateCrouch() {
  if (!player.onGround) {
    if (player.isCrouching) standUp();
    return;
  }
  const want = wantsToCrouch();
  if (want && !player.isCrouching) {
    crouchDown();
  } else if (!want && player.isCrouching) {
    if (canStandUp()) standUp();
  }
}

// ------------------------------------------------------------
// 12. КОЛЛИЗИИ
// ------------------------------------------------------------
function resolveX() {
  const top    = Math.floor((player.y + 1) / TILE_SIZE);
  const bottom = Math.floor((player.y + player.height - 1) / TILE_SIZE);

  if (player.vx > 0) {
    const right = Math.floor((player.x + player.width) / TILE_SIZE);
    for (let by = top; by <= bottom; by++) {
      if (isSolid(right, by)) {
        player.x = right * TILE_SIZE - player.width - 0.01;
        player.vx = 0;
        return;
      }
    }
  } else if (player.vx < 0) {
    const left = Math.floor(player.x / TILE_SIZE);
    for (let by = top; by <= bottom; by++) {
      if (isSolid(left, by)) {
        player.x = (left + 1) * TILE_SIZE + 0.01;
        player.vx = 0;
        return;
      }
    }
  }
}

function resolveY() {
  const left  = Math.floor((player.x + 1) / TILE_SIZE);
  const right = Math.floor((player.x + player.width - 1) / TILE_SIZE);

  player.onGround = false;

  if (player.vy > 0) {
    const bottom = Math.floor((player.y + player.height) / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) {
      if (isSolid(bx, bottom)) {
        player.y = bottom * TILE_SIZE - player.height;
        player.vy = 0;
        player.onGround = true;
        return;
      }
    }
  } else if (player.vy < 0) {
    const top = Math.floor(player.y / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) {
      if (isSolid(bx, top)) {
        player.y = (top + 1) * TILE_SIZE;
        player.vy = 0;
        return;
      }
    }
  }
}

// ------------------------------------------------------------
// 13. ОБНОВЛЕНИЕ ИГРОКА (тик)
// ------------------------------------------------------------
function updatePlayer() {
  const speed = player.isCrouching ? MOVE_SPEED * CROUCH_SPEED_MULT : MOVE_SPEED;

  player.vx = 0;
  if (lastDirectionKey === 'left')  player.vx = -speed;
  if (lastDirectionKey === 'right') player.vx =  speed;

  if (player.vx > 0) player.facing = 'right';
  else if (player.vx < 0) player.facing = 'left';

  if (isJumpPressed() && player.onGround) {
    if (player.isCrouching) standUp();
    player.vy = JUMP_VEL;
    player.onGround = false;
  }

  updateCrouch();

  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  player.x += player.vx;
  resolveX();

  player.y += player.vy;
  resolveY();
}

// ------------------------------------------------------------
// 14. КАМЕРА
// ------------------------------------------------------------
const camera = { x: 0, y: 0 };

function updateCamera() {
  const targetX = player.x + player.width  / 2 - VIEW_WIDTH  / 2;
  const targetY = player.y + player.height / 2 - VIEW_HEIGHT / 2;

  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;
}

function snapCamera() {
  camera.x = player.x + player.width  / 2 - VIEW_WIDTH  / 2;
  camera.y = player.y + player.height / 2 - VIEW_HEIGHT / 2;
}

// ------------------------------------------------------------
// 15. ИГРОВОЙ ТИК
// ------------------------------------------------------------
function updateTick() {
  if (inventoryOpen) return; // пауза при открытом инвентаре

  updatePlayer();
  updateCamera();
  updateBreaking();
}

// ------------------------------------------------------------
// 16. ОТРИСОВКА МИРА
// ------------------------------------------------------------
function getPlayerTexture() {
  if (!player.onGround) {
    return player.vy < 0 ? 'playerJump' : 'playerFall';
  }
  if (player.isCrouching) return 'playerCrouch';
  return 'player';
}

function worldToScreenX(wx) { return wx - camera.x; }
function worldToScreenY(wy) { return wy - camera.y; }

function draw() {
  // Небо
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Блоки
  const startX = Math.floor(camera.x / TILE_SIZE);
  const endX   = Math.ceil((camera.x + VIEW_WIDTH)  / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endY   = Math.ceil((camera.y + VIEW_HEIGHT) / TILE_SIZE);

  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile === TILE_AIR) continue;

      const def = TILE_DEFS[tile];
      if (!def || !def.texture) continue;

      drawTexture(
        def.texture,
        worldToScreenX(bx * TILE_SIZE),
        worldToScreenY(by * TILE_SIZE),
        TILE_SIZE, TILE_SIZE
      );
    }
  }

  // Трещины поверх ломаемого блока
  if (breakingBlock && breakingProgress > 0) {
    drawTextureAlpha(
      'cracks',
      worldToScreenX(breakingBlock.bx * TILE_SIZE),
      worldToScreenY(breakingBlock.by * TILE_SIZE),
      TILE_SIZE, TILE_SIZE,
      breakingProgress
    );
  }

  // Игрок
  const texName = getPlayerTexture();
  const screenX = worldToScreenX(player.x);
  const screenY = worldToScreenY(player.y);
  drawTextureFlipped(texName, screenX, screenY, player.width, player.height, player.facing === 'left');

  // ---- Рамки ----
  if (!inventoryOpen) drawFrames();

  // ---- UI ----
  drawInventoryUI();
  drawDraggingItem();

  if (debugOverlay) drawDebug();
}

function drawFrames() {
  const cursorTile = getCursorTile();
  const target = getTargetTile();

  // frame_cursor — всегда под курсором (если это не тот же блок, что target)
  if (!target || target.bx !== cursorTile.bx || target.by !== cursorTile.by) {
    drawTexture(
      'frameCursor',
      worldToScreenX(cursorTile.bx * TILE_SIZE),
      worldToScreenY(cursorTile.by * TILE_SIZE),
      TILE_SIZE, TILE_SIZE
    );
  }

  // frame_block — на целевом блоке
  if (target) {
    drawTexture(
      'frameBlock',
      worldToScreenX(target.bx * TILE_SIZE),
      worldToScreenY(target.by * TILE_SIZE),
      TILE_SIZE, TILE_SIZE
    );
  }
}

// ------------------------------------------------------------
// 17. ОТЛАДКА (F3)
// ------------------------------------------------------------
let debugOverlay = false;

const TRACKED_KEYS = [
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'ShiftLeft', 'ShiftRight'
];

function drawDebug() {
  const padX = 10;
  const padY = 10;
  const lineHeight = 18;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(padX, padY, 340, 380);

  ctx.font = '14px monospace';
  ctx.textBaseline = 'top';

  let line = 0;
  const print = (text, color) => {
    ctx.fillStyle = color || '#0f0';
    ctx.fillText(text, padX + 8, padY + 8 + line * lineHeight);
    line++;
  };

  print('=== DEBUG (F3) ===', '#ff0');
  print('');
  print('Клавиши:', '#fff');
  for (const code of TRACKED_KEYS) {
    const pressed = !!keys[code];
    print(`  ${pressed ? '[X]' : '[ ]'} ${code}`, pressed ? '#0f0' : '#444');
  }

  print('');
  print('Игрок:', '#fff');
  print(`  x=${player.x.toFixed(1)} y=${player.y.toFixed(1)}`);
  print(`  vx=${player.vx.toFixed(2)} vy=${player.vy.toFixed(2)}`);
  print(`  onGround=${player.onGround}`, player.onGround ? '#0f0' : '#f80');
  print(`  crouch=${player.isCrouching}`, player.isCrouching ? '#0f0' : '#888');
  print(`  facing=${player.facing}`, '#fff');
  print(`  tex=${getPlayerTexture()}`, '#0ff');

  print('');
  print('Курсор и цель:', '#fff');
  const ct = getCursorTile();
  const tt = getTargetTile();
  print(`  cursor=(${ct.bx},${ct.by})`, '#fff');
  print(`  target=${tt ? `(${tt.bx},${tt.by})` : 'нет'}`, tt ? '#0ff' : '#888');
  print(`  инвентарь=${inventoryOpen ? 'открыт' : 'закрыт'}`, inventoryOpen ? '#ff0' : '#888');
  print(`  слот=${activeSlot}`, '#fff');
  if (breakingBlock) {
    print(`  копаю (${breakingBlock.bx},${breakingBlock.by}) ${(breakingProgress*100).toFixed(0)}%`, '#f80');
  }
}

// ------------------------------------------------------------
// 18. ИГРОВОЙ ЦИКЛ
// ------------------------------------------------------------
let accumulator = 0;
let lastTime = 0;

function gameLoop(now) {
  if (lastTime === 0) lastTime = now;
  let delta = now - lastTime;
  lastTime = now;

  if (delta > MAX_ACCUMULATOR) delta = MAX_ACCUMULATOR;
  accumulator += delta;

  while (accumulator >= TICK_DURATION) {
    updateTick();
    accumulator -= TICK_DURATION;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// 19. СТАРТ
// ------------------------------------------------------------
async function startGame() {
  await loadAllTextures();
  snapCamera();
  requestAnimationFrame(gameLoop);
}

startGame();