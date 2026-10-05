// ============================================================
//  config.js — константы, холст, общее состояние
// ============================================================

// --- Размеры ---
const TILE_SIZE    = 8;
const RENDER_SCALE = 4;

// --- Физика (мировые пиксели за тик) ---
const GRAVITY    = 0.125;
const MAX_MOVE_SPEED = 1;
const JUMP_VEL   = -2.5;
const MAX_FALL   = 3.75;

// --- Инерция ---
const PLAYER_ACCEL        = 0.12;
const PLAYER_FRICTION     = 0.20;
const PLAYER_AIR_ACCEL    = 0.06;
const PLAYER_AIR_FRICTION = 0.02;

// --- Прощение прыжка ---
const COYOTE_TIME = 0.10;
const JUMP_BUFFER = 0.10;

// --- Время ---
const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;
const MAX_ACCUMULATOR = 200;

// --- Мир ---
const CHUNK_W = 20;
const CHUNK_H = 40;
const SURFACE_ROW = 20;

// --- Генерация мира ---
const DEFAULT_SEED = Math.floor(Math.random() * 1000000);
const SURFACE_AMPLITUDE = 3;
const CAVE_THRESHOLD    = 0.42;
const COAL_THRESHOLD    = 0.60;
const IRON_THRESHOLD    = 0.68;

// Плотность деревьев: 0.10 = примерно 1 дерево на 10 колонок
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
const CHAR_VERSION  = '1';
const WORLD_VERSION = '1';
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

let VIEW_WIDTH  = 0;
let VIEW_HEIGHT = 0;
let VIEW_WORLD_WIDTH  = 0;
let VIEW_WORLD_HEIGHT = 0;

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

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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
const mouse = { x: 0, y: 0, wx: 0, wy: 0, leftHeld: false };

// Кирка: анимация и искры
let pickaxeAnimStart = 0;
let pickaxeSparks = [];
let pickaxeSparkLastFrame = 0;

// Игрок: таймеры прощения прыжка
let coyoteTimer   = 0;
let jumpBufferTimer = 0;

// Консоль
let consoleOpen = false;
let consoleLog = [];
let consoleInput = '';
let consoleHistory = [];
let consoleHistoryIndex = -1;

// Чат
let chatMessages = [];
let chatOverlayUntil = 0;

// Активные персонаж и мир
let activeCharId  = null;
let activeWorldId = null;
let activeWorldSeed = null;