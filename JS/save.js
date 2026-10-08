// ============================================================
//  save.js — раздельные сохранения персонажа и мира
// ============================================================

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { characters: [], worlds: [], activeChar: null, activeWorld: null };
    const m = JSON.parse(raw);
    return {
      characters: m.characters || [],
      worlds: m.worlds || [],
      activeChar: m.activeChar || null,
      activeWorld: m.activeWorld || null,
    };
  } catch (e) {
    return { characters: [], worlds: [], activeChar: null, activeWorld: null };
  }
}

function saveMeta(meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
}

function getCharacterKey(id) { return CHAR_KEY_PREFIX + id; }
function getWorldKey(id)     { return WORLD_KEY_PREFIX + id; }

function listCharacters() {
  return loadMeta().characters.map(c => ({ id: c.id, name: c.name }));
}
function listWorlds() {
  return loadMeta().worlds.map(w => ({ id: w.id, name: w.name, seed: w.seed }));
}

function createCharacter(name) {
  const id = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  const meta = loadMeta();
  meta.characters.push({ id: id, name: name || 'Персонаж', createdAt: Date.now() });
  saveMeta(meta);

  const char = {
    version: CHAR_VERSION,
    id: id,
    name: name || 'Персонаж',
    appearance: { hair: 'default', hairColor: '#000000', eyeColor: '#000000' },
    slots: new Array(INVENTORY_SLOTS).fill(null),
    activeSlot: 0,
    achievements: [],
    tutorialDone: false,
    lastWorldId: null,
    worldPositions: {},
    playerHP: HP_MAX,
    playerAir: AIR_MAX,
  };
  localStorage.setItem(getCharacterKey(id), JSON.stringify(char));
  return id;
}

function createWorld(name, seed) {
  const id = 'w_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  const finalSeed = (seed === undefined || seed === null || seed === '')
    ? Math.floor(Math.random() * 1000000)
    : seed;
  const meta = loadMeta();
  meta.worlds.push({ id: id, name: name || 'Мир', seed: finalSeed, createdAt: Date.now() });
  saveMeta(meta);

  const world = {
    version: WORLD_VERSION,
    id: id,
    name: name || 'Мир',
    seed: finalSeed,
    savedAt: Date.now(),
    savedAtDisplay: formatSavedAt(Date.now()),
    chunks: {},
    wallChunks: {},
    water: {},
    spawn: { x: 0, y: SURFACE_Y * TILE_SIZE },
    time: 0,
  };
  localStorage.setItem(getWorldKey(id), JSON.stringify(world));
  return id;
}

function deleteCharacter(id) {
  const meta = loadMeta();
  meta.characters = meta.characters.filter(c => c.id !== id);
  if (meta.activeChar === id) meta.activeChar = null;
  saveMeta(meta);
  localStorage.removeItem(getCharacterKey(id));
}

function deleteWorld(id) {
  const meta = loadMeta();
  meta.worlds = meta.worlds.filter(w => w.id !== id);
  if (meta.activeWorld === id) meta.activeWorld = null;
  saveMeta(meta);
  localStorage.removeItem(getWorldKey(id));
}

function deleteSave() {
  const meta = loadMeta();
  if (meta.activeChar)  deleteCharacter(meta.activeChar);
  if (meta.activeWorld) deleteWorld(meta.activeWorld);

  const fresh = loadMeta();
  fresh.activeChar = null;
  fresh.activeWorld = null;
  saveMeta(fresh);

  activeCharId = null;
  activeWorldId = null;
  activeWorldSeed = null;
}

function loadCharacter(id) {
  try {
    const raw = localStorage.getItem(getCharacterKey(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function loadWorld(id) {
  try {
    const raw = localStorage.getItem(getWorldKey(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function serializeChunks() {
  const out = {};
  for (const [key, data] of chunks.entries()) out[key] = data;
  return out;
}
function deserializeChunks(obj) {
  chunks.clear();
  for (const key in obj) chunks.set(key, obj[key]);
}

function serializeWallChunks() {
  const out = {};
  for (const [key, data] of wallChunks.entries()) out[key] = data;
  return out;
}
function deserializeWallChunks(obj) {
  wallChunks.clear();
  for (const key in obj) wallChunks.set(key, obj[key]);
}

function formatSavedAt(ts) {
  const d = new Date(ts);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function saveCharacter() {
  if (!activeCharId) return false;
  const char = loadCharacter(activeCharId);
  if (!char) return false;

  char.slots = slots.map(s => s ? { tileId: s.tileId, count: s.count } : null);
  char.activeSlot = activeSlot;
  if (!char.worldPositions) char.worldPositions = {};
  if (activeWorldId) {
    char.worldPositions[activeWorldId] = { x: player.x, y: player.y };
  }
  char.lastWorldId = activeWorldId;
  char.playerHP  = playerHP;
  char.playerAir = playerAir;

  try {
    localStorage.setItem(getCharacterKey(activeCharId), JSON.stringify(char));
    return true;
  } catch (e) { return false; }
}

function saveWorld() {
  if (!activeWorldId) return false;
  const world = loadWorld(activeWorldId);
  if (!world) return false;

  world.chunks     = serializeChunks();
  world.wallChunks = serializeWallChunks();
  world.water      = serializeWater();
  world.spawn      = { x: spawnPoint.x, y: spawnPoint.y };
  world.savedAt    = Date.now();
  world.savedAtDisplay = formatSavedAt(Date.now());

  try {
    localStorage.setItem(getWorldKey(activeWorldId), JSON.stringify(world));
    return true;
  } catch (e) { return false; }
}

function saveGame() {
  const ok1 = saveCharacter();
  const ok2 = saveWorld();
  if (ok1 && ok2) {
    hasUnsavedChanges = false;
    autosaveIconUntil = performance.now() + AUTOSAVE_ICON_DURATION;
    return true;
  }
  return false;
}

function loadGame() {
  if (!activeCharId || !activeWorldId) return false;
  const char  = loadCharacter(activeCharId);
  const world = loadWorld(activeWorldId);
  if (!char || !world) return false;

  // Проверка версии мира — если старая, сбрасываем.
  // Старые миры в другой системе координат, загружать их нельзя.
  if (world.version !== WORLD_VERSION) {
    console.warn('Мир сохранён в несовместимой версии, создаём новый');
    return false;
  }

  activeWorldSeed = seedToNumber(world.seed);

  deserializeChunks(world.chunks || {});
  deserializeWallChunks(world.wallChunks || {});
  deserializeWater(world.water || {});
  if (world.spawn) {
    spawnPoint.x = world.spawn.x;
    spawnPoint.y = world.spawn.y;
  }

  resetPlayer();
  const pos = char.worldPositions && char.worldPositions[activeWorldId];
  if (pos) {
    player.x = pos.x;
    player.y = pos.y;
  } else {
    player.x = spawnPoint.x;
    player.y = spawnPoint.y;
  }

  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const s = (char.slots || [])[i];
    slots[i] = s ? { tileId: s.tileId, count: s.count } : null;
  }
  activeSlot = char.activeSlot || 0;

  playerHP  = typeof char.playerHP === 'number' ? char.playerHP : HP_MAX;
  playerAir = typeof char.playerAir === 'number' ? char.playerAir : AIR_MAX;

  hasUnsavedChanges = false;
  return true;
}

function getSaveInfo() {
  const meta = loadMeta();
  if (!meta.activeChar || !meta.activeWorld) return null;
  const world = loadWorld(meta.activeWorld);
  if (!world) return null;
  return { savedAtDisplay: world.savedAtDisplay };
}

function getActiveCharacterName() {
  if (!activeCharId) return 'Игрок';
  const char = loadCharacter(activeCharId);
  return char && char.name ? char.name : 'Игрок';
}

function startNewGame() {
  const meta = loadMeta();

  let charId = meta.activeChar;
  if (!charId || !loadCharacter(charId)) {
    charId = createCharacter('Игрок');
  }
  let worldId = meta.activeWorld;
  if (!worldId || !loadWorld(worldId)) {
    worldId = createWorld('Мир 1', null);
  }

  meta.activeChar = charId;
  meta.activeWorld = worldId;
  saveMeta(meta);

  activeCharId = charId;
  activeWorldId = worldId;

  const worldData = loadWorld(worldId);
  activeWorldSeed = worldData ? seedToNumber(worldData.seed) : DEFAULT_SEED;

  clearWorld();
  clearWater();
  clearFish();
  resetPlayer();
  for (let i = 0; i < INVENTORY_SLOTS; i++) slots[i] = null;
  activeSlot = 0;
  breakingBlock = null; breakingProgress = 0;
  hasUnsavedChanges = false; inventoryOpen = false;

  snapCamera();
  saveGame();

  gameState = 'playing';
  lastTime = 0; accumulator = 0;
  lastAutosaveTime = performance.now();
}

function continueGame() {
  const meta = loadMeta();
  if (!meta.activeChar || !meta.activeWorld) { startNewGame(); return; }
  activeCharId = meta.activeChar;
  activeWorldId = meta.activeWorld;

  clearFish();
  if (!loadGame()) { startNewGame(); return; }

  breakingBlock = null; breakingProgress = 0;
  inventoryOpen = false;
  snapCamera();
  gameState = 'playing';
  lastTime = 0; accumulator = 0;
  lastAutosaveTime = performance.now();
}