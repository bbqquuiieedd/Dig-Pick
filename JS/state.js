// ============================================================
// state.js — всё изменяемое состояние
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TOOLTIP_FADE_IN  = 0.25;
const TOOLTIP_FADE_OUT = 0.45;

function resizeCanvas(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
window.addEventListener('resize', resizeCanvas);

const state = {
  // ---------- Мир ----------
  floors: [], objects: [], solidGrid: [],
  saplings: {}, chests: {},

  // ---------- Сид мира ----------
  worldSeed: 12345,

  // ---------- Игрок ----------
  player: {
    x: 12*TILE, y: 12*TILE,
    prevX: 12*TILE, prevY: 12*TILE,
    renderX: 12*TILE, renderY: 12*TILE,
    r: 11, vx: 0, vy: 0,
    inWater: false,
    facing: { x: 0, y: 1 },
    hp: PLAYER_MAX_HP,
    hunger: PLAYER_MAX_HUNGER,
    running: false,
    spawnX: 12*TILE,
    spawnY: 12*TILE,
    hasSpawn: false,
  },

  // ---------- Инвентарь ----------
  inventory: new Array(INV_COLS*INV_ROWS).fill(null),
  hotbar: new Array(HOTBAR_SIZE).fill(null),
  selectedHotbarSlot: 0,

  // ---------- UI окна ----------
  uiMode: null,
  uiCraftSlots: new Array(9).fill(null),
  uiCraftSize: 2,
  uiCraftResult: null,

  // ---------- Печь ----------
  furnaceTarget: null,
  furnaceInput: null, furnaceFuel: null, furnaceOutput: null,
  furnaceProgress: 0, furnaceBurning: false, furnaceBurnUntil: 0,

  // ---------- Костёр ----------
  campfireTarget: null,
  campfireSlots: new Array(4).fill(null),

  // ---------- Сундук ----------
  chestSlots: null, chestTarget: null,

  // ---------- Торговля ----------
  tradeTarget: null,
  tradePage: 0,

  // ---------- Перетаскивание / UI ----------
  dragging: null,
  showRecipes: false, recipePage: 0,

  // ---------- Копание ----------
  placingCooldown: 0,
  miningTarget: null, miningProgress: 0, miningBlocked: false,

  // ---------- Атака ----------
  attackCooldown: 0,
  attackAnim: 0,
  attackAnimDirX: 1,
  attackAnimDirY: 0,

  // ---------- Хотбар подпись ----------
  tooltipTimer: 0,
  tooltipMax: 2.2,
  tooltipName: '',

  // ---------- Время ----------
  timeOfDay: 0,
  lastTimeUpdate: 0,

  // ---------- Регенерация ----------
  lastHungerTick: 0,
  lastHpRegen: 0,
  lastStarveTick: 0,

  // ---------- Сущности ----------
  animals: [],
  dogs: [],
  mobs: [],
  villagers: [],
  floorItems: [],

  raccoon: null,
  raccoonCooldown: 0,

  // Точки спавна жителя и собаки (из структуры «дом»)
  villagerSpawn: null,
  villagerDogSpawn: null,

  // Дополнительные таймеры
  fireTimers: {},
  wateredFarmland: {},
  campfireLitAt: {},
  openDoors: {},
  cakeBites: {},

  // ---------- Мир: служебное ----------
  lockedBlocks: {},          // ⚡ "x,y" → true — блоки в чужом доме
  structuresSpawned: false,

  // ---------- Игра ----------
  gameState: 'loading',
  currentSlot: null,
  savedSinceLastResume: false,
  keybindWaiting: null,

  keys: {},
  mouse: { x: 0, y: 0, left: false, right: false },
  camera: { x: 0, y: 0 },

  images: {},
  floorCache: {}, objectCache: {}, itemCache: {},

  autosaveTimer: null, autosaveToastTimer: null,
  toastTimer: null,
  deleteTarget: null, deleteTimer: null, deleteCd: 5,
  settingsBackTo: 'main',

  // ---------- Внутреннее ----------
  _seed: 12345,
  accumulator: 0, lastTime: 0,
};

// ============================================================
// Очистка ввода
// ============================================================
function clearInput(){
  for(const k in state.keys) state.keys[k] = false;
  state.mouse.left = false;
  state.mouse.right = false;
  state.miningTarget = null;
  state.miningProgress = 0;
  state.miningBlocked = false;
  state.dragging = null;
  state.showRecipes = false;
}

// ============================================================
// Время суток
// ============================================================
function isNight(){
  return state.timeOfDay >= NIGHT_START || state.timeOfDay < 0.02;
}
function isDay(){
  return !isNight();
}