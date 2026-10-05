// ============================================================
//  config.js — константы, холст, общее состояние
// ============================================================

// --- Размеры ---
const TILE_SIZE    = 8;
const RENDER_SCALE = 4;

// --- Физика (мировые пиксели) ---
const GRAVITY    = 0.125;
const MOVE_SPEED = 1;
const JUMP_VEL   = -2.5;
const MAX_FALL   = 3.75;

// --- Время ---
const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;
const MAX_ACCUMULATOR = 200;

// --- Мир ---
const CHUNK_W = 20;
const CHUNK_H = 40;
const SURFACE_ROW = 20;

// --- Взаимодействие ---
const INTERACTION_RANGE_TILES = 5;
const INTERACTION_RANGE = INTERACTION_RANGE_TILES * TILE_SIZE;
const BREAK_TIME = 1.0;
const BREAK_PROGRESS_PER_TICK = 1 / (TICK_RATE * BREAK_TIME);

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
const SAVE_VERSION = "0.2";
const SAVE_KEY = "digpick_save";
const SETTINGS_KEY = "digpick_settings";

// --- Автосейв ---
const AUTOSAVE_OPTIONS = [
  { label: 'Выкл',   value: 0      },
  { label: '30 сек', value: 30000  },
  { label: '1 мин',  value: 60000  },
  { label: '5 мин',  value: 300000 },
];
const AUTOSAVE_ICON_DURATION = 1500;

// --- Шрифт ---
const FONT_FAMILY = 'DigPickFont';

// --- Кирка в главном меню ---
const PICKAXE_SIZE = 104;                // совпадает с CSS font-size: 104px
const PICKAXE_Y    = 30;                 // отступ сверху
const PICKAXE_ANIM_DURATION = 700;       // мс

// --- Заголовок под киркой ---
const TITLE_FONT_SIZE = 42;
const TITLE_Y_OFFSET  = 30;              // отступ от нижнего края кирки

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

// --- Кирка: анимация и искры ---
let pickaxeAnimStart = 0;
let pickaxeSparks = [];
let pickaxeSparkLastFrame = 0;