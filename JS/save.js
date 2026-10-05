// ============================================================
//  save.js — сохранение/загрузка
// ============================================================

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
    version: SAVE_VERSION,
    savedAt: ts, savedAtDisplay: formatSavedAt(ts),
    player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy,
              onGround: player.onGround, facing: player.facing },
    spawn: { x: spawnPoint.x, y: spawnPoint.y },
    slots: slots.map(s => s ? { tileId: s.tileId, count: s.count } : null),
    activeSlot,
    chunks: serializeChunks(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    hasUnsavedChanges = false;
    autosaveIconUntil = performance.now() + AUTOSAVE_ICON_DURATION;
    return true;
  } catch (e) { return false; }
}

function getSaveInfo() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) return null;
    return { savedAtDisplay: data.savedAtDisplay };
  } catch (e) { return null; }
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
}

function continueGame() {
  if (!loadGame()) { startNewGame(); return; }
  breakingBlock = null; breakingProgress = 0;
  inventoryOpen = false; snapCamera();
  gameState = 'playing';
  lastTime = 0; accumulator = 0;
  lastAutosaveTime = performance.now();
}