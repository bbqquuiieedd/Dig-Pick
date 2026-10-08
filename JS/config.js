// ============================================================
//  config.js — константы, холст, общее состояние
// ============================================================
//  СИСТЕМА КООРДИНАТ: Y растёт ВВЕРХ.
//    Y = 0  — уровень травы
//    Y > 0  — выше земли
//    Y < 0  — под землёй (копаем вниз)
//    Бедрок на Y = -20
// ============================================================

// --- Размеры ---
const TILE_SIZE    = 8;
const RENDER_SCALE = 4;

// --- Физика (мировые пиксели за тик) ---
// Y-вверх: гравитация тянет ВНИЗ = уменьшает vy.
const GRAVITY    = 0.125;
const JUMP_VEL   =  2.5;
const MAX_FALL   =  3.75;
const MAX_MOVE_SPEED = 1;

// --- Инерция ---
const PLAYER_ACCEL        = 0.12;
const PLAYER_FRICTION     = 0.20;
const PLAYER_AIR_ACCEL    = 0.06;
const PLAYER_AIR_FRICTION = 0.02;

// --- Прощение прыжка ---
const COYOTE_TIME = 0.10;
const JUMP_BUFFER = 0.10;

// --- Вода ---
const WATER_MAX_LEVEL   = 8;
const WATER_FLOW_DELAY  = 3;
const WATER_SPREAD_MAX  = 1;
const SWIM_GRAVITY      = 0.02;
const SWIM_UP_VEL       =  1.0;
const SWIM_MAX_VEL      =  1.5;

// --- Дыхание ---
const AIR_MAX          = 100;
const AIR_DRAIN_RATE   = 0.6;
const AIR_REGEN_RATE   = 5;
const DROWNING_DAMAGE  = 0.1;

// --- HP ---
const HP_MAX          = 100;
const HP_REGEN_RATE   = 0.05;

// --- Рыба ---
const FISH_SPAWN_LIMIT  = 6;
const FISH_PICKUP_RANGE = 1.5;

// --- Время ---
const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;
const MAX_ACCUMULATOR = 200;

// --- Мир ---
const SURFACE_Y = 0;
const SURFACE_ROW = 20;
const CHUNK_W = 20;
const CHUNK_H = 40;
const WORLD_BOTTOM_Y = -20;
const WORLD_TOP_Y    = 30;

// --- Генерация мира ---
const DEFAULT_SEED = Math.floor(Math.random() * 1000000);
const SURFACE_AMPLITUDE = 3;
const CAVE_THRESHOLD    = 0.42;
const COAL_THRESHOLD    = 0.60;
const IRON_THRESHOLD    = 0.68;
const TREE_DENSITY      = 0.10;
const TREE_MIN_HEIGHT   = 4;
const TREE_MAX_HEIGHT   = 6;

// --- Взаимодействие ---
const INTERACTION_RANGE_TILES = 5;
const INTERACTION_RANGE = INTERACTION_RANGE_TILES * TILE_SIZE;
const HAND_MULTIPLIER        = 2.0;
const WRONG_TOOL_MULTIPLIER  = 4.0;

// --- Инвентарь ---
const INVENTORY_COLS = 10;
const INVENTORY_ROWS = 4;
const INVENTORY_SLOTS = INVENTORY_COLS * INVENTORY_ROWS;
const HOTBAR_SLOTS = 10;
const MAX_STACK = 999;
const SLOT_SIZE = 48;
const SLOT_GAP = 4;
const SLOT_STEP = SLOT_SIZE + SLOT_GAP;

// --- Игрок ---
const PLAYER_WIDTH  = TILE_SIZE * 1.5;
const PLAYER_HEIGHT = TILE_SIZE * 2.5;

// --- Сохранения ---
const CHAR_VERSION  = '2';
const WORLD_VERSION = '2';
const CHAR_KEY_PREFIX  = 'digpick_char_';
const WORLD_KEY_PREFIX = 'digpick_world_';
const META_KEY         = 'digpick_meta';
const SETTINGS_KEY     = 'digpick_settings';

// --- Автосейв ---
const AUTOSAVE_OPTIONS = [
  { label: 'Выкл',   value: 0      },
  { label: '30 сек', value: 30000  },
  { label: '1 мин',  value: 60000  },
  { label: '5 мин',  value: 300000 },
];
const AUTOSAVE_ICON_DURATION = 1500;

// --- Чат ---
const CHAT_OVERLAY_DURATION = 5000;

// --- Шрифт ---
const FONT_FAMILY = 'DigPickFont';

// --- Кирка в главном меню ---
const PICKAXE_SIZE = 104;
const PICKAXE_Y    = 30;
const PICKAXE_ANIM_DURATION = 700;
const TITLE_FONT_SIZE = 42;
const TITLE_Y_OFFSET  = 30;

// ------------------------------------------------------------
// ХОЛСТ
// ------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const cursorEl = document.getElementById('cursor');

// Базовый ФИЗИЧЕСКИЙ размер курсора в пикселях.
// На любом зуме курсор рендерится в это же количество физических пикселей.
const CURSOR_BASE_SIZE = 32;

// VIEW_* — реальные CSS-пиксели окна. Меняются при Ctrl+±.
// UI_* — «виртуальный» размер UI. НЕ меняется при Ctrl+±,
//        чтобы элементы UI оставались того же физического размера.
let VIEW_WIDTH  = 0;
let VIEW_HEIGHT = 0;
let VIEW_WORLD_WIDTH  = 0;
let VIEW_WORLD_HEIGHT = 0;
let UI_W = 0;
let UI_H = 0;

// Запоминаем значения, чтобы отследить изменение
let _lastInnerW = 0;
let _lastInnerH = 0;
let _lastDpr    = 0;

// REF_DPR всегда 1: физический размер UI не зависит от зума браузера.
const REF_DPR = 1;
let UI_ZOOM = 1;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  UI_ZOOM = dpr / REF_DPR;

  VIEW_WIDTH  = window.innerWidth;
  VIEW_HEIGHT = window.innerHeight;
  VIEW_WORLD_WIDTH  = VIEW_WIDTH  / RENDER_SCALE;
  VIEW_WORLD_HEIGHT = VIEW_HEIGHT / RENDER_SCALE;

  UI_W = VIEW_WIDTH  * UI_ZOOM;
  UI_H = VIEW_HEIGHT * UI_ZOOM;

  // Физический размер округляем вниз. CSS-размер не трогаем —
  // он задан через 100vw/100vh в style.css. Разницу в доли пикселя
  // компенсирует фон body + запасная заливка в draw().
  canvas.width  = Math.floor(VIEW_WIDTH  * dpr);
  canvas.height = Math.floor(VIEW_HEIGHT * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const cursorCss = CURSOR_BASE_SIZE / UI_ZOOM;
  cursorEl.style.width  = cursorCss + 'px';
  cursorEl.style.height = cursorCss + 'px';

  if (typeof applyCursorPosition === 'function') applyCursorPosition();

  // Мгновенно центрируем камеру на игроке после изменения размера,
  // чтобы не было «прыжка» из старого угла.
  if (typeof snapCamera === 'function') snapCamera();

  _lastInnerW = window.innerWidth;
  _lastInnerH = window.innerHeight;
  _lastDpr    = dpr;
}

// Вызывается каждый кадр — ловит Ctrl+± даже если браузер
// не отправил событие resize.
function checkResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  if (w !== _lastInnerW || h !== _lastInnerH || dpr !== _lastDpr) {
    resizeCanvas();
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Оборачивает отрисовку UI так, чтобы она не масштабировалась
// вместе с браузерным зумом. Layout UI использует UI_W / UI_H.
function withUIScale(fn) {
  ctx.save();
  ctx.scale(1 / UI_ZOOM, 1 / UI_ZOOM);
  fn();
  ctx.restore();
}

// ------------------------------------------------------------
// ОБЩЕЕ СОСТОЯНИЕ
// ------------------------------------------------------------
let gameState = 'main_menu';
let settingsReturnTo = 'main_menu';
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

const mouse = { x: 0, y: 0, ux: 0, uy: 0, wx: 0, wy: 0, leftHeld: false };

let pickaxeAnimStart = 0;
let pickaxeSparks = [];
let pickaxeSparkLastFrame = 0;

let coyoteTimer   = 0;
let jumpBufferTimer = 0;

let playerHP   = HP_MAX;
let playerAir  = AIR_MAX;

let waterTickCounter = 0;
let fish = [];

let consoleOpen = false;
let consoleLog = [];
let consoleInput = '';
let consoleHistory = [];
let consoleHistoryIndex = -1;

let chatMessages = [];
let chatOverlayUntil = 0;

let activeCharId  = null;
let activeWorldId = null;
let activeWorldSeed = null;