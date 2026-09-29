// ============================================================
//  Dig-Pick — платформер в стиле Terraria
// ============================================================

// ------------------------------------------------------------
// 1. КОНСТАНТЫ
// ------------------------------------------------------------
const TILE_SIZE    = 8;
const RENDER_SCALE = 4;

const GRAVITY    = 0.125;
const MOVE_SPEED = 1;
const JUMP_VEL   = -2.5;
const MAX_FALL   = 3.75;

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

const PLAYER_WIDTH  = TILE_SIZE * 1.5;
const PLAYER_HEIGHT = TILE_SIZE * 2.5;

const SAVE_VERSION = "0.4";
const SAVE_KEY = "digpick_save";
const SETTINGS_KEY = "digpick_settings";

const AUTOSAVE_OPTIONS = [
  { label: 'Выкл',   value: 0      },
  { label: '30 сек', value: 30000  },
  { label: '1 мин',  value: 60000  },
  { label: '5 мин',  value: 300000 },
];
const AUTOSAVE_ICON_DURATION = 1500;

let VIEW_WIDTH  = 0;
let VIEW_HEIGHT = 0;
let VIEW_WORLD_WIDTH  = 0;
let VIEW_WORLD_HEIGHT = 0;

// ------------------------------------------------------------
// 2. СОСТОЯНИЕ
// ------------------------------------------------------------
let gameState = 'playing'; // 'playing' | 'paused' | 'settings'
let settingsReturnTo = 'paused';
let inventoryOpen = false;
let hasUnsavedChanges = false;
let confirmDialog = null;
let activeSlot = 0;
let dragging = null;
let draggingStartSlot = -1;
let breakingBlock = null;
let breakingProgress = 0;
let debugOverlay = false;
let lastDirectionAction = null;
let waitingForKey = null;

const slots = new Array(INVENTORY_SLOTS).fill(null);
let accumulator = 0;
let lastTime = 0;
let lastAutosaveTime = 0;
let autosaveIconUntil = 0;
let fpsHistory = [];
let lastFpsUpdate = 0;
let currentFps = 0;
let uiElements = [];
let hoveredButton = null;
let activeMenuButtonIndex = 0;

const keys = {};
const justPressedKeys = new Set();
const mouse = { x: 0, y: 0, wx: 0, wy: 0, leftHeld: false, inWindow: false  };

// ------------------------------------------------------------
// 3. ХОЛСТ
// ------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  VIEW_WIDTH  = window.innerWidth;
  VIEW_HEIGHT = window.innerHeight;
  VIEW_WORLD_WIDTH  = VIEW_WIDTH  / RENDER_SCALE;
  VIEW_WORLD_HEIGHT = VIEW_HEIGHT / RENDER_SCALE;
  canvas.width  = Math.floor(VIEW_WIDTH  * dpr);
  canvas.height = Math.floor(VIEW_HEIGHT * dpr);
  canvas.style.width  = VIEW_WIDTH  + 'px';
  canvas.style.height = VIEW_HEIGHT + 'px';
  canvas.style.cursor = 'none'; // скрываем нативный курсор
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ------------------------------------------------------------
// 4. ТЕКСТУРЫ
// ------------------------------------------------------------
const TEXTURE_PATHS = {
  missing:     'Textures/PNG/missing.png',
  dirt:        'Textures/PNG/dirt.png',
  stone:       'Textures/PNG/stone.png',
  bedrock:     'Textures/PNG/bedrock.png',
  grass:       'Textures/PNG/grass.png',   // полноценный тайл поверхности

  frame:       'Textures/PNG/frame.png',
  cracks:      'Textures/PNG/cracks.png',
  cursor:      'Textures/PNG/cursor.png',

  playerStand: 'Textures/PNG/player_stand.png',
  playerWalk:  'Textures/PNG/player_walk.png',
  playerJump:  'Textures/PNG/player_jump.png',

  autosaveIcon: 'Textures/PNG/save.png',
};

const textures = {};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload  = () => resolve(img);
    img.onerror = () => { console.warn(`Не загружено: ${src}`); resolve(null); };
  });
}

async function loadAllTextures() {
  textures.missing = await loadImage(TEXTURE_PATHS.missing);
  const keysArr = Object.keys(TEXTURE_PATHS).filter(k => k !== 'missing');
  const images = await Promise.all(keysArr.map(k => loadImage(TEXTURE_PATHS[k])));
  keysArr.forEach((key, i) => { textures[key] = images[i] || textures.missing; });
  console.log('Текстуры загружены');
}

function drawTexture(name, x, y, w, h) {
  const tex = textures[name];
  if (tex && tex.complete && tex.naturalWidth > 0) ctx.drawImage(tex, x, y, w, h);
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
// 5. ТАЙЛЫ
// ------------------------------------------------------------
// TILE_GRASS отсутствует: земля сама рендерится как трава,
// если над ней воздух. В инвентаре трава = земля.
const TILE_AIR     = 0;
const TILE_DIRT    = 1;
const TILE_STONE   = 2;
const TILE_BEDROCK = 3;

const TILE_DEFS = {
  [TILE_AIR]:     { solid: false, breakable: false, texture: null,      name: 'Воздух' },
  [TILE_DIRT]:    { solid: true,  breakable: true,  texture: 'dirt',    name: 'Земля' },
  [TILE_STONE]:   { solid: true,  breakable: true,  texture: 'stone',   name: 'Камень' },
  [TILE_BEDROCK]: { solid: true,  breakable: false, texture: 'bedrock', name: 'Бедрок' },
};

// Что рисовать на тайле (bx, by) — обычная текстура или трава сверху
function getTileTexture(tile, bx, by) {
  if (tile === TILE_DIRT && getTile(bx, by - 1) === TILE_AIR) return 'grass';
  const def = TILE_DEFS[tile];
  return def ? def.texture : null;
}

// ------------------------------------------------------------
// 6. МИР
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
        if (wy >= 20 && wy <= 24)         tile = TILE_DIRT;
        else if (wy >= 25 && wy <= 38)    tile = TILE_STONE;
        else if (wy === 39)               tile = TILE_BEDROCK;
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

function clearWorld() { chunks.clear(); }

// ------------------------------------------------------------
// 7. ИГРОК
// ------------------------------------------------------------
const player = {
  x: 0, y: 20 * TILE_SIZE - PLAYER_HEIGHT,
  width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
  vx: 0, vy: 0,
  onGround: false, facing: 'right',
};

const spawnPoint = { x: 0, y: 20 * TILE_SIZE - PLAYER_HEIGHT };
const camera = { x: 0, y: 0 };

function resetPlayer() {
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.facing = 'right';
  lastDirectionAction = null;
}

function snapCamera() {
  camera.x = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  camera.y = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
}

// ------------------------------------------------------------
// 8. НАСТРОЙКИ
// ------------------------------------------------------------
const GAME_ACTIONS = [
  { id: 'left', label: 'Влево' },
  { id: 'right', label: 'Вправо' },
  { id: 'jump', label: 'Прыжок' },
  { id: 'inventory', label: 'Инвентарь' },
  { id: 'pause', label: 'Пауза' },
  { id: 'save', label: 'Сохранить' },
  { id: 'hints', label: 'Подсказки (F1)' },
  { id: 'fps', label: 'FPS (F2)' },
];

const MENU_ACTIONS = [
  { id: 'menu_up', label: 'Вверх' },
  { id: 'menu_down', label: 'Вниз' },
  { id: 'confirm', label: 'Подтвердить' },
];

function defaultSettings() {
  return {
    autosaveInterval: 60000,
    showFPS: false, showHints: false,
    bindings: {
      game: {
        left: ['KeyA'], right: ['KeyD'],
        jump: ['Space', 'KeyW'],
        inventory: ['KeyE', 'Tab', 'KeyI'],
        pause: ['Escape'], save: ['F5'],
        hints: ['F1'], fps: ['F2'],
      },
      menu: {
        menu_up: ['ArrowUp'], menu_down: ['ArrowDown'], confirm: ['Enter'],
      },
    },
  };
}

let settings = defaultSettings();

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const def = defaultSettings();
    settings.autosaveInterval = (typeof parsed.autosaveInterval === 'number') ? parsed.autosaveInterval : def.autosaveInterval;
    settings.showFPS = !!parsed.showFPS;
    settings.showHints = !!parsed.showHints;
    if (parsed.bindings) {
      if (parsed.bindings.game) for (const a of GAME_ACTIONS) {
        if (Array.isArray(parsed.bindings.game[a.id])) settings.bindings.game[a.id] = parsed.bindings.game[a.id].slice();
      }
      if (parsed.bindings.menu) for (const a of MENU_ACTIONS) {
        if (Array.isArray(parsed.bindings.menu[a.id])) settings.bindings.menu[a.id] = parsed.bindings.menu[a.id].slice();
      }
    }
  } catch (e) {}
}

function bindKey(context, actionId, keyCode) {
  const table = settings.bindings[context];
  for (const other in table) {
    if (other === actionId) continue;
    const idx = table[other].indexOf(keyCode);
    if (idx >= 0) table[other].splice(idx, 1);
  }
  if (!table[actionId].includes(keyCode)) table[actionId].push(keyCode);
  saveSettings();
}

function unbindKey(context, actionId, keyCode) {
  const table = settings.bindings[context];
  const idx = table[actionId].indexOf(keyCode);
  if (idx >= 0) table[actionId].splice(idx, 1);
  saveSettings();
}

function isActionPressed(context, actionId) {
  const arr = settings.bindings[context][actionId];
  if (!arr) return false;
  for (const code of arr) if (keys[code]) return true;
  return false;
}

function wasActionJustPressed(context, actionId) {
  const arr = settings.bindings[context][actionId];
  if (!arr) return false;
  for (const code of arr) if (justPressedKeys.has(code)) return true;
  return false;
}

function getActionForKey(context, code) {
  const table = settings.bindings[context];
  for (const id in table) if (table[id].includes(code)) return id;
  return null;
}

// ------------------------------------------------------------
// 9. ВВОД
// ------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  const wasPressed = keys[e.code] === true;
  keys[e.code] = true;
  if (!wasPressed) justPressedKeys.add(e.code);

  if (waitingForKey) {
    e.preventDefault();
    if (e.code === 'Escape') { waitingForKey = null; return; }
    bindKey(waitingForKey.context, waitingForKey.actionId, e.code);
    waitingForKey = null;
    return;
  }

  if (!wasPressed) {
    if (settings.bindings.game.hints.includes(e.code)) { settings.showHints = !settings.showHints; saveSettings(); e.preventDefault(); return; }
    if (settings.bindings.game.fps.includes(e.code))   { settings.showFPS = !settings.showFPS; saveSettings(); e.preventDefault(); return; }
    if (e.code === 'F3') { debugOverlay = !debugOverlay; e.preventDefault(); return; }
  }

  if (gameState === 'playing' && !inventoryOpen && !confirmDialog) {
    if (!wasPressed) {
      const actionId = getActionForKey('game', e.code);
      if (actionId === 'left')  lastDirectionAction = 'left';
      if (actionId === 'right') lastDirectionAction = 'right';
    }
  }

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (gameState === 'playing' && !inventoryOpen && !confirmDialog) {
    const actionId = getActionForKey('game', e.code);
    if (actionId === 'left' && lastDirectionAction === 'left') {
      if (isActionPressed('game', 'right')) lastDirectionAction = 'right';
      else lastDirectionAction = null;
    }
    if (actionId === 'right' && lastDirectionAction === 'right') {
      if (isActionPressed('game', 'left')) lastDirectionAction = 'left';
      else lastDirectionAction = null;
    }
  }
});

function updateMouseFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.wx = mouse.x / RENDER_SCALE;
  mouse.wy = mouse.y / RENDER_SCALE;
  mouse.inWindow = true; // ← добавить
}

document.addEventListener('mouseleave', () => { mouse.inWindow = false; });
canvas.addEventListener('mousemove', updateMouseFromEvent);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  updateMouseFromEvent(e);
  if (confirmDialog) { handleConfirmDialogClick(e.button); e.preventDefault(); return; }
  if (gameState === 'settings')  { handleSettingsClick(e.button); e.preventDefault(); return; }
  if (gameState === 'paused')    { handlePauseMenuClick(e.button); e.preventDefault(); return; }

  if (gameState === 'playing') {
    if (inventoryOpen) {
      const slot = getSlotAt(mouse.x, mouse.y);
      if (slot >= 0) handleSlotClick(slot, e.button);
      e.preventDefault(); return;
    }
    const hotbarSlot = getSlotAt(mouse.x, mouse.y);
    if (hotbarSlot >= 0 && hotbarSlot < HOTBAR_SLOTS) {
      if (e.button === 0) activeSlot = hotbarSlot;
      e.preventDefault(); return;
    }
    if (e.button === 0) mouse.leftHeld = true;
    else if (e.button === 2) tryPlaceBlock();
    e.preventDefault();
  }
});

window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.leftHeld = false; });

canvas.addEventListener('wheel', (e) => {
  if (gameState !== 'playing' || inventoryOpen) return;
  const delta = e.deltaY > 0 ? 1 : -1;
  activeSlot = (activeSlot + delta + HOTBAR_SLOTS) % HOTBAR_SLOTS;
  e.preventDefault();
}, { passive: false });

// ------------------------------------------------------------
// 10. СОХРАНЕНИЕ
// ------------------------------------------------------------
function serializeChunks() {
  const out = {};
  for (const [key, data] of chunks.entries()) out[key] = data;
  return out;
}

function deserializeChunks(obj) {
  chunks.clear();
  for (const key in obj) chunks.set(key, obj[key]);
}

function formatSavedAt(ts) {
  const d = new Date(ts);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function saveGame() {
  const ts = Date.now();
  const data = {
    version: SAVE_VERSION, savedAt: ts, savedAtDisplay: formatSavedAt(ts),
    player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy, onGround: player.onGround, facing: player.facing },
    spawn: { x: spawnPoint.x, y: spawnPoint.y },
    slots: slots.map(s => s ? { tileId: s.tileId, count: s.count } : null),
    activeSlot, chunks: serializeChunks(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    hasUnsavedChanges = false;
    autosaveIconUntil = performance.now() + AUTOSAVE_ICON_DURATION;
    return true;
  } catch (e) { return false; }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) return false;
    deserializeChunks(data.chunks || {});
    resetPlayer();
    if (data.player) {
      player.x = data.player.x; player.y = data.player.y;
      player.vx = data.player.vx || 0; player.vy = data.player.vy || 0;
      player.onGround = !!data.player.onGround;
      player.facing = data.player.facing || 'right';
    }
    if (data.spawn) { spawnPoint.x = data.spawn.x; spawnPoint.y = data.spawn.y; }
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const s = (data.slots || [])[i];
      slots[i] = s ? { tileId: s.tileId, count: s.count } : null;
    }
    activeSlot = data.activeSlot || 0;
    hasUnsavedChanges = false;
    return true;
  } catch (e) { return false; }
}

function deleteSave() { localStorage.removeItem(SAVE_KEY); }

function startNewGame() {
  deleteSave(); clearWorld(); resetPlayer();
  for (let i = 0; i < INVENTORY_SLOTS; i++) slots[i] = null;
  activeSlot = 0;
  breakingBlock = null; breakingProgress = 0;
  hasUnsavedChanges = false; inventoryOpen = false;
  snapCamera(); saveGame();
  gameState = 'playing';
  lastTime = 0; accumulator = 0;
  lastAutosaveTime = performance.now();
  activeMenuButtonIndex = 0;
}

function continueGame() {
  if (!loadGame()) { startNewGame(); return; }
  breakingBlock = null; breakingProgress = 0;
  inventoryOpen = false; snapCamera();
  gameState = 'playing';
  lastTime = 0; accumulator = 0;
  lastAutosaveTime = performance.now();
  activeMenuButtonIndex = 0;
}

// ------------------------------------------------------------
// 11. ИНВЕНТАРЬ
// ------------------------------------------------------------
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
    if (s && s.tileId === tileId && s.count < MAX_STACK) { s.count++; hasUnsavedChanges = true; return true; }
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

// ------------------------------------------------------------
// 12. UI ИНВЕНТАРЯ
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
  return { x: panel.x + col * SLOT_STEP, y: panel.y + visualRowFromTop * SLOT_STEP, w: SLOT_SIZE, h: SLOT_SIZE };
}

function getSlotAt(mx, my) {
  if (gameState !== 'playing') return -1;
  const panel = getInventoryPanelRect();
  if (mx < panel.x || mx >= panel.x + panel.width) return -1;
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
  ctx.lineWidth   = isActive ? 2 : 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  const item = slots[slotIndex];
  if (item) {
    const def = TILE_DEFS[item.tileId];
    if (def && def.texture) {
      drawTexture(def.texture, r.x + 5, r.y + 5, SLOT_SIZE - 10, SLOT_SIZE - 10);
    }
    if (item.count > 1) {
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000'; ctx.fillText(item.count.toString(), r.x + r.w - 3, r.y + r.h - 1);
      ctx.fillStyle = '#fff'; ctx.fillText(item.count.toString(), r.x + r.w - 4, r.y + r.h - 2);
    }
  }
}

function drawInventoryUI() {
  if (gameState !== 'playing') return;
  if (inventoryOpen) for (let i = 0; i < INVENTORY_SLOTS; i++) drawSlot(i, i === activeSlot);
  else for (let i = 0; i < HOTBAR_SLOTS; i++) drawSlot(i, i === activeSlot);
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
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#000'; ctx.fillText(dragging.count.toString(), mouse.x + iconSize/2, mouse.y + iconSize/2);
    ctx.fillStyle = '#fff'; ctx.fillText(dragging.count.toString(), mouse.x + iconSize/2 - 1, mouse.y + iconSize/2 - 1);
  }
}

// ------------------------------------------------------------
// 13. ВЗАИМОДЕЙСТВИЕ С МИРОМ
// ------------------------------------------------------------
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
  breakingProgress += BREAK_PROGRESS_PER_TICK;
  if (breakingProgress >= 1) {
    if (tryAddToInventory(tile)) setTile(breakingBlock.bx, breakingBlock.by, TILE_AIR);
    breakingBlock = null; breakingProgress = 0;
  }
}

// ------------------------------------------------------------
// 14. КОЛЛИЗИИ
// ------------------------------------------------------------
function resolveX() {
  const top    = Math.floor((player.y + 1) / TILE_SIZE);
  const bottom = Math.floor((player.y + player.height - 1) / TILE_SIZE);
  if (player.vx > 0) {
    const right = Math.floor((player.x + player.width) / TILE_SIZE);
    for (let by = top; by <= bottom; by++) if (isSolid(right, by)) {
      player.x = right * TILE_SIZE - player.width - 0.001; player.vx = 0; return;
    }
  } else if (player.vx < 0) {
    const left = Math.floor(player.x / TILE_SIZE);
    for (let by = top; by <= bottom; by++) if (isSolid(left, by)) {
      player.x = (left + 1) * TILE_SIZE + 0.001; player.vx = 0; return;
    }
  }
}

function resolveY() {
  const left  = Math.floor((player.x + 1) / TILE_SIZE);
  const right = Math.floor((player.x + player.width - 1) / TILE_SIZE);
  player.onGround = false;
  if (player.vy > 0) {
    const bottom = Math.floor((player.y + player.height) / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) if (isSolid(bx, bottom)) {
      player.y = bottom * TILE_SIZE - player.height; player.vy = 0; player.onGround = true; return;
    }
  } else if (player.vy < 0) {
    const top = Math.floor(player.y / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) if (isSolid(bx, top)) {
      player.y = (top + 1) * TILE_SIZE; player.vy = 0; return;
    }
  }
}

// ------------------------------------------------------------
// 15. ОБНОВЛЕНИЕ ИГРОКА
// ------------------------------------------------------------
function updatePlayer() {
  player.vx = 0;
  if (lastDirectionAction === 'left')  player.vx = -MOVE_SPEED;
  if (lastDirectionAction === 'right') player.vx =  MOVE_SPEED;
  if (player.vx > 0) player.facing = 'right'; else if (player.vx < 0) player.facing = 'left';
  if (isActionPressed('game', 'jump') && player.onGround) {
    player.vy = JUMP_VEL; player.onGround = false;
  }
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  player.x += player.vx; resolveX();
  player.y += player.vy; resolveY();
  if (player.vx !== 0 || player.vy !== 0) hasUnsavedChanges = true;
}

function updateCamera() {
  const tx = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  const ty = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
  camera.x += (tx - camera.x) * 0.1;
  camera.y += (ty - camera.y) * 0.1;
}

// ------------------------------------------------------------
// 16. ПЕРЕХОДЫ СОСТОЯНИЙ
// ------------------------------------------------------------
function openSettings(from) { settingsReturnTo = from; gameState = 'settings'; waitingForKey = null; activeMenuButtonIndex = 0; }
function closeSettings() { gameState = settingsReturnTo; waitingForKey = null; activeMenuButtonIndex = 0; }
function startPause() { gameState = 'paused'; inventoryOpen = false; activeMenuButtonIndex = 0; }
function resumeGame() { gameState = 'playing'; lastTime = 0; accumulator = 0; activeMenuButtonIndex = 0; }

// ------------------------------------------------------------
// 17. UI-ЭЛЕМЕНТЫ
// ------------------------------------------------------------
function clearUI() { uiElements = []; }
function addButton(x, y, w, h, label, action, opts) {
  opts = opts || {};
  const el = { kind: 'button', x, y, w, h, label, action, enabled: opts.enabled !== false };
  uiElements.push(el); return el;
}
function addKeyBadge(x, y, w, h, label, action) { const el = { kind: 'keyBadge', x, y, w, h, label, action }; uiElements.push(el); return el; }
function addToggle(x, y, w, h, label, value, action) { const el = { kind: 'toggle', x, y, w, h, label, value, action }; uiElements.push(el); return el; }
function addCycle(x, y, w, h, label, value, action) { const el = { kind: 'cycle', x, y, w, h, label, value, action }; uiElements.push(el); return el; }

function findUIAt(mx, my) {
  for (let i = uiElements.length - 1; i >= 0; i--) {
    const e = uiElements[i];
    if (mx >= e.x && mx < e.x + e.w && my >= e.y && my < e.y + e.h) return e;
  }
  return null;
}

function getNavigableButtons() {
  return uiElements.filter(e => e.kind === 'button' || e.kind === 'toggle' || e.kind === 'cycle');
}

function drawButton(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);
  const disabled = !el.enabled;
  let bg = 'rgba(40, 40, 50, 0.9)';
  if (disabled) bg = 'rgba(30, 30, 35, 0.6)';
  else if (isActive || hovered) bg = 'rgba(70, 70, 90, 0.95)';
  ctx.fillStyle = bg; ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.lineWidth = 2;
  if (isActive) ctx.strokeStyle = '#ffd54a';
  else if (disabled) ctx.strokeStyle = '#333';
  else if (hovered) ctx.strokeStyle = '#aaa';
  else ctx.strokeStyle = '#666';
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);
  ctx.fillStyle = disabled ? '#666' : '#fff';
  ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(el.label, el.x + el.w / 2, el.y + el.h / 2);
}

function drawKeyBadge(el) {
  const hovered = (hoveredButton === el);
  ctx.fillStyle = hovered ? 'rgba(90, 90, 110, 0.95)' : 'rgba(50, 50, 60, 0.9)';
  ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.strokeStyle = hovered ? '#ffd54a' : '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(el.x + 0.5, el.y + 0.5, el.w - 1, el.h - 1);
  ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(el.label, el.x + el.w / 2, el.y + el.h / 2);
}

function drawToggle(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);
  ctx.fillStyle = (isActive || hovered) ? 'rgba(70, 70, 90, 0.95)' : 'rgba(40, 40, 50, 0.9)';
  ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.strokeStyle = isActive ? '#ffd54a' : (hovered ? '#aaa' : '#666');
  ctx.lineWidth = 2;
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);
  ctx.fillStyle = '#fff'; ctx.font = '16px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText((el.value ? '[X]  ' : '[ ]  ') + el.label, el.x + 12, el.y + el.h / 2);
}

function drawCycle(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);
  ctx.fillStyle = (isActive || hovered) ? 'rgba(70, 70, 90, 0.95)' : 'rgba(40, 40, 50, 0.9)';
  ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.strokeStyle = isActive ? '#ffd54a' : (hovered ? '#aaa' : '#666');
  ctx.lineWidth = 2;
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);
  ctx.fillStyle = '#fff'; ctx.font = '16px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(el.label, el.x + 12, el.y + el.h / 2);
  ctx.textAlign = 'right';
  ctx.fillText('◄ ' + el.value + ' ►', el.x + el.w - 12, el.y + el.h / 2);
}

function drawUI() {
  for (const el of uiElements) {
    if (el.kind === 'button') drawButton(el);
    else if (el.kind === 'keyBadge') drawKeyBadge(el);
    else if (el.kind === 'toggle') drawToggle(el);
    else if (el.kind === 'cycle') drawCycle(el);
  }
}

// ------------------------------------------------------------
// 18. НАСТРОЙКИ
// ------------------------------------------------------------
function keyCodeToLabel(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (code === 'Enter') return 'Enter';
  if (code === 'Escape') return 'Esc';
  if (code === 'Tab') return 'Tab';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ShiftLeft') return 'LShift';
  if (code === 'ShiftRight') return 'RShift';
  if (code === 'ControlLeft') return 'LCtrl';
  if (code === 'ControlRight') return 'RCtrl';
  if (code === 'AltLeft') return 'LAlt';
  if (code === 'AltRight') return 'RAlt';
  if (code === 'Backspace') return 'BkSp';
  if (code === 'CapsLock') return 'Caps';
  if (code.startsWith('F') && code.length <= 3) return code;
  return code;
}

function drawBindList(x, y, w, lineH, context, actions) {
  ctx.textBaseline = 'middle';
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const rowY = y + i * lineH;
    ctx.fillStyle = '#ccc'; ctx.font = '14px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(a.label + ':', x, rowY + lineH / 2);
    const codes = settings.bindings[context][a.id] || [];
    let bx = x + 170;
    const badgeH = 20;
    const badgeY = rowY + (lineH - badgeH) / 2;
    for (let k = 0; k < codes.length; k++) {
      const code = codes[k];
      const label = keyCodeToLabel(code);
      const badgeW = Math.max(28, label.length * 8 + 12);
      const isWaiting = waitingForKey && waitingForKey.context === context && waitingForKey.actionId === a.id && waitingForKey.slot === k;
      if (isWaiting) {
        ctx.fillStyle = '#5a3a00'; ctx.fillRect(bx, badgeY, badgeW, badgeH);
        ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2;
        ctx.strokeRect(bx + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1);
        ctx.fillStyle = '#ffd54a'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        ctx.fillText('...', bx + badgeW / 2, badgeY + badgeH / 2);
      } else {
        addKeyBadge(bx, badgeY, badgeW, badgeH, label, () => unbindKey(context, a.id, code));
      }
      bx += badgeW + 4;
    }
    const addW = 24;
    const isWaitingAdd = waitingForKey && waitingForKey.context === context && waitingForKey.actionId === a.id && waitingForKey.slot === -1;
    if (isWaitingAdd) {
      ctx.fillStyle = '#5a3a00'; ctx.fillRect(bx, badgeY, addW, badgeH);
      ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2;
      ctx.strokeRect(bx + 0.5, badgeY + 0.5, addW - 1, badgeH - 1);
      ctx.fillStyle = '#ffd54a'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('...', bx + addW / 2, badgeY + badgeH / 2);
    } else {
      addKeyBadge(bx, badgeY, addW, badgeH, '+', () => { waitingForKey = { context, actionId: a.id, slot: -1 }; });
    }
  }
}

function buildSettingsUI() {
  clearUI();
  const panelW = Math.min(900, VIEW_WIDTH - 60);
  const panelH = Math.min(600, VIEW_HEIGHT - 60);
  const panelX = (VIEW_WIDTH - panelW) / 2;
  const panelY = (VIEW_HEIGHT - panelH) / 2;
  ctx.fillStyle = 'rgba(10, 10, 15, 0.92)'; ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('НАСТРОЙКИ', VIEW_WIDTH / 2, panelY + 16);
  const topY = panelY + 70;
  const rowH = 36;
  const colX = panelX + 30;
  const autosaveLabel = AUTOSAVE_OPTIONS.find(o => o.value === settings.autosaveInterval);
  addCycle(colX, topY, 320, rowH, 'Автосейв:', autosaveLabel ? autosaveLabel.label : 'Выкл', () => {
    const idx = AUTOSAVE_OPTIONS.findIndex(o => o.value === settings.autosaveInterval);
    settings.autosaveInterval = AUTOSAVE_OPTIONS[(idx + 1) % AUTOSAVE_OPTIONS.length].value;
    saveSettings();
  });
  addToggle(colX + 340, topY, 320, rowH, 'Показывать FPS', settings.showFPS, () => { settings.showFPS = !settings.showFPS; saveSettings(); });
  addToggle(colX, topY + rowH + 8, 320, rowH, 'Подсказки управления', settings.showHints, () => { settings.showHints = !settings.showHints; saveSettings(); });
  const bindY0 = topY + (rowH + 8) * 2 + 20;
  ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const colLeftX  = panelX + 30;
  const colRightX = panelX + panelW / 2 + 10;
  const colW = panelW / 2 - 40;
  ctx.fillText('УПРАВЛЕНИЕ (игра)', colLeftX, bindY0);
  ctx.fillText('УПРАВЛЕНИЕ (меню)', colRightX, bindY0);
  const listY0 = bindY0 + 26;
  const lineH = 28;
  drawBindList(colLeftX, listY0, colW, lineH, 'game', GAME_ACTIONS);
  drawBindList(colRightX, listY0, colW, lineH, 'menu', MENU_ACTIONS);
  const bottomY = panelY + panelH - 60;
  const btnW = 220, btnH = 40;
  addButton(panelX + 30, bottomY, btnW, btnH, 'Сбросить управление', () => {
    confirmDialog = {
      text: 'Сбросить управление?',
      onYes: () => { settings.bindings = defaultSettings().bindings; saveSettings(); confirmDialog = null; activeMenuButtonIndex = 0; },
      onNo:  () => { confirmDialog = null; activeMenuButtonIndex = 0; },
    };
  });
  addButton(panelX + panelW - 30 - btnW, bottomY, btnW, btnH, 'Назад', () => closeSettings());
}

function drawSettings() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  buildSettingsUI(); drawUI();
  if (waitingForKey) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Нажмите клавишу...', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 20);
    ctx.font = '16px monospace'; ctx.fillStyle = '#aaa';
    ctx.fillText('Esc — отмена', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 20);
  }
}

// ------------------------------------------------------------
// 19. ПАУЗА
// ------------------------------------------------------------
let pauseSaveLabelUntil = 0;

function buildPauseMenuUI() {
  clearUI();
  const panelW = 360, panelH = 320;
  const panelX = (VIEW_WIDTH - panelW) / 2;
  const panelY = (VIEW_HEIGHT - panelH) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('ПАУЗА', VIEW_WIDTH / 2, panelY + 16);
  const btnW = panelW - 40, btnH = 42;
  const bx = panelX + 20;
  let by = panelY + 60;
  addButton(bx, by, btnW, btnH, 'Продолжить', () => resumeGame()); by += btnH + 8;
  const now = performance.now();
  const saveLabel = (now < pauseSaveLabelUntil) ? 'Сохранено' : 'Сохранить';
  addButton(bx, by, btnW, btnH, saveLabel, () => { if (saveGame()) pauseSaveLabelUntil = performance.now() + 900; }); by += btnH + 8;
  addButton(bx, by, btnW, btnH, 'Настройки', () => openSettings('paused')); by += btnH + 8;
  addButton(bx, by, btnW, btnH, 'Новый мир', () => {
    confirmDialog = {
      text: 'Создать новый мир?',
      onYes: () => { confirmDialog = null; startNewGame(); },
      onNo:  () => { confirmDialog = null; activeMenuButtonIndex = 0; },
    };
  });
}

function drawPause() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  buildPauseMenuUI(); drawUI();
}

// ------------------------------------------------------------
// 20. МОДАЛКА
// ------------------------------------------------------------
function buildConfirmDialog() {
  clearUI();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  const w = 380, h = 160;
  const x = (VIEW_WIDTH - w) / 2;
  const y = (VIEW_HEIGHT - h) / 2;
  ctx.fillStyle = 'rgba(15, 15, 20, 0.98)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#fff'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(confirmDialog.text, VIEW_WIDTH / 2, y + 30);
  const btnW = 130, btnH = 40;
  const by = y + h - 60;
  addButton(x + 30, by, btnW, btnH, 'Да', () => confirmDialog.onYes());
  addButton(x + w - 30 - btnW, by, btnW, btnH, 'Нет', () => confirmDialog.onNo());
}

function drawConfirmDialog() { buildConfirmDialog(); drawUI(); }

// ------------------------------------------------------------
// 21. ОБРАБОТЧИКИ КЛИКОВ
// ------------------------------------------------------------
function handlePauseMenuClick(button) {
  if (button !== 0) return;
  const el = findUIAt(mouse.x, mouse.y);
  if (el && el.enabled !== false && el.kind === 'button') el.action();
}
function handleSettingsClick(button) {
  if (button !== 0) return;
  if (waitingForKey) return;
  const el = findUIAt(mouse.x, mouse.y);
  if (!el) return;
  if (el.kind === 'button' || el.kind === 'toggle' || el.kind === 'cycle' || el.kind === 'keyBadge') el.action();
}
function handleConfirmDialogClick(button) {
  if (button !== 0) return;
  const el = findUIAt(mouse.x, mouse.y);
  if (el && el.kind === 'button') el.action();
}

// ------------------------------------------------------------
// 22. НАВИГАЦИЯ
// ------------------------------------------------------------
function handleMenuNavigation() {
  if (waitingForKey) return;
  const nav = getNavigableButtons();
  if (nav.length === 0) return;
  if (activeMenuButtonIndex >= nav.length) activeMenuButtonIndex = 0;
  if (wasActionJustPressed('menu', 'menu_down')) activeMenuButtonIndex = (activeMenuButtonIndex + 1) % nav.length;
  if (wasActionJustPressed('menu', 'menu_up'))   activeMenuButtonIndex = (activeMenuButtonIndex - 1 + nav.length) % nav.length;
  if (wasActionJustPressed('menu', 'confirm')) {
    const b = nav[activeMenuButtonIndex];
    if (b && b.enabled !== false) b.action();
  }
}

// ------------------------------------------------------------
// 23. ESC
// ------------------------------------------------------------
function handleEscape() {
  const pauseCodes = settings.bindings.game.pause || ['Escape'];
  let escPressed = false;
  for (const code of pauseCodes) if (justPressedKeys.has(code)) { escPressed = true; break; }
  if (!escPressed) return;
  if (waitingForKey) { waitingForKey = null; return; }
  if (confirmDialog) { confirmDialog.onNo(); return; }
  if (gameState === 'settings')   { closeSettings(); return; }
  if (gameState === 'paused')     { resumeGame(); return; }
  if (gameState === 'playing') {
    if (inventoryOpen) toggleInventory();
    else startPause();
    return;
  }
}

// ------------------------------------------------------------
// 24. ОТРИСОВКА МИРА
// ------------------------------------------------------------
function getPlayerTexture() {
  if (!player.onGround) return 'playerJump';
  if (player.vx !== 0)  return 'playerWalk';
  return 'playerStand';
}

function drawWorld() {
  ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.save();
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.translate(-camera.x, -camera.y);

  const startX = Math.floor(camera.x / TILE_SIZE);
  const endX   = Math.ceil((camera.x + VIEW_WORLD_WIDTH)  / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endY   = Math.ceil((camera.y + VIEW_WORLD_HEIGHT) / TILE_SIZE);

  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile === TILE_AIR) continue;
      const texName = getTileTexture(tile, bx, by);
      if (!texName) continue;
      drawTexture(texName, bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  if (breakingBlock && breakingProgress > 0) {
    drawTextureAlpha('cracks',
      breakingBlock.bx * TILE_SIZE, breakingBlock.by * TILE_SIZE,
      TILE_SIZE, TILE_SIZE, Math.min(1, breakingProgress));
  }

  const texName = getPlayerTexture();
  drawTextureFlipped(texName, player.x, player.y, player.width, player.height, player.facing === 'left');

  if (gameState === 'playing' && !inventoryOpen) drawFrames();
  ctx.restore();

  if (debugOverlay) drawDebug();
}

function drawFrames() {
  const target = getTargetTile();
  if (!target) return;
  drawTexture('frame', target.bx * TILE_SIZE, target.by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

// ------------------------------------------------------------
// 24b. ОТЛАДКА
// ------------------------------------------------------------
function drawDebug() {
  const startX = Math.floor(camera.x / TILE_SIZE);
  const endX   = Math.ceil((camera.x + VIEW_WORLD_WIDTH)  / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endY   = Math.ceil((camera.y + VIEW_WORLD_HEIGHT) / TILE_SIZE);
  ctx.save();
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.translate(-camera.x, -camera.y);
  ctx.font = '4px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      if (getTile(bx, by) !== TILE_DIRT) continue;
      const isGrass = getTile(bx, by - 1) === TILE_AIR;
      ctx.fillStyle = isGrass ? '#ff0000' : '#666';
      ctx.fillText(isGrass ? 'G' : '.', bx * TILE_SIZE + TILE_SIZE / 2, by * TILE_SIZE + TILE_SIZE / 2);
    }
  }
  ctx.restore();

  const ct = getCursorTile();
  const tile = getTile(ct.bx, ct.by);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(10, VIEW_HEIGHT - 60, 320, 50);
  ctx.fillStyle = '#0ff'; ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`Курсор: (${ct.bx}, ${ct.by}) — ${TILE_DEFS[tile] ? TILE_DEFS[tile].name : '?'}`, 16, VIEW_HEIGHT - 54);
  if (tile === TILE_DIRT) {
    const isGrass = getTile(ct.bx, ct.by - 1) === TILE_AIR;
    ctx.fillText(`  вид: ${isGrass ? 'трава' : 'земля'}`, 16, VIEW_HEIGHT - 38);
  }
}

// ------------------------------------------------------------
// 25. ОВЕРЛЕИ
// ------------------------------------------------------------
function updateFpsCounter(now) {
  fpsHistory.push(now);
  if (now - lastFpsUpdate > 250) {
    const deltas = [];
    for (let i = 1; i < fpsHistory.length; i++) deltas.push(fpsHistory[i] - fpsHistory[i-1]);
    if (deltas.length > 0) {
      const avg = deltas.reduce((a,b) => a+b, 0) / deltas.length;
      currentFps = Math.round(1000 / avg);
    }
    fpsHistory = []; lastFpsUpdate = now;
  }
}

function drawFpsOverlay() {
  if (!settings.showFPS) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fillRect(VIEW_WIDTH - 110, 8, 100, 24);
  ctx.fillStyle = '#0f0'; ctx.font = '14px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`FPS: ${currentFps}`, VIEW_WIDTH - 16, 20);
}

function drawHintsOverlay() {
  if (!settings.showHints) return;
  const getLbl = (context, id) => {
    const arr = settings.bindings[context][id] || [];
    return arr.map(keyCodeToLabel).join('/');
  };
  const lines = [
    `${getLbl('game','left')}/${getLbl('game','right')} — ходьба`,
    `${getLbl('game','jump')} — прыжок`,
    `ЛКМ — копать, ПКМ — ставить`,
    `${getLbl('game','inventory')} — инвентарь`,
    `${getLbl('game','pause')} — пауза`,
    `${getLbl('game','save')} — сохранить`,
    `F3 — отладка`,
  ];
  const padX = 10, padY = 8, lineH = 18;
  const boxW = 230, boxH = lines.length * lineH + padY * 2;
  const boxX = 10, boxY = VIEW_HEIGHT - boxH - 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'; ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = '#ddd'; ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], boxX + padX, boxY + padY + i * lineH);
}

function drawSaveIcon(now) {
  if (now >= autosaveIconUntil) return;
  const tex = textures.autosaveIcon;
  if (!tex || !tex.complete || tex.naturalWidth === 0) return;
  ctx.save(); ctx.globalAlpha = 0.9;
  ctx.drawImage(tex, VIEW_WIDTH - 60, 40, 48, 48); ctx.restore();
}

function drawCursor() {
  if (!mouse.inWindow) return;           // ← добавить
  const tex = textures.cursor;
  if (!tex || !tex.complete || tex.naturalWidth === 0) return;
  const size = 16;
  ctx.drawImage(tex, mouse.x, mouse.y, size, size);
}

// ------------------------------------------------------------
// 26. ТИК
// ------------------------------------------------------------
function updateTick() {
  if (gameState !== 'playing') return;
  if (inventoryOpen) return;
  if (wasActionJustPressed('game', 'inventory')) { toggleInventory(); return; }
  if (wasActionJustPressed('game', 'save')) saveGame();
  updatePlayer(); updateCamera(); updateBreaking();
  if (settings.autosaveInterval > 0) {
    const now = performance.now();
    if (now - lastAutosaveTime >= settings.autosaveInterval) { saveGame(); lastAutosaveTime = now; }
  }
}

// ------------------------------------------------------------
// 27. DRAW
// ------------------------------------------------------------
function draw(now) {
  hoveredButton = null;
  if (gameState === 'playing') {
    drawWorld(); drawInventoryUI(); drawDraggingItem();
    drawFpsOverlay(); drawHintsOverlay(); drawSaveIcon(now);
  } else if (gameState === 'paused') {
    drawWorld(); drawPause();
    drawFpsOverlay(); drawHintsOverlay(); drawSaveIcon(now);
  } else if (gameState === 'settings') {
    drawWorld();
    drawSettings();
  }
  if (confirmDialog) drawConfirmDialog();
  drawCursor();
}

// ------------------------------------------------------------
// 28. ЦИКЛ
// ------------------------------------------------------------
function gameLoop(now) {
  handleEscape();
  if (lastTime === 0) lastTime = now;
  let delta = now - lastTime; lastTime = now;
  if (delta > MAX_ACCUMULATOR) delta = MAX_ACCUMULATOR;
  accumulator += delta;
  while (accumulator >= TICK_DURATION) { updateTick(); accumulator -= TICK_DURATION; }
  draw(now);
  if (confirmDialog || gameState === 'paused' || gameState === 'settings') handleMenuNavigation();
  if (gameState !== 'playing' || inventoryOpen) {
    const el = findUIAt(mouse.x, mouse.y);
    if (el) hoveredButton = el;
  }
  updateFpsCounter(now);
  justPressedKeys.clear();
  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// 29. СТАРТ
// ------------------------------------------------------------
async function startGame() {
  loadSettings();
  await loadAllTextures();
  continueGame(); // если сейв есть — загрузит, иначе создаст новый мир
  requestAnimationFrame(gameLoop);
}

startGame();