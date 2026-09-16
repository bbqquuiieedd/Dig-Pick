// state.js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
window.addEventListener('resize', resizeCanvas);

const state = {
  floors: [], objects: [], solidGrid: [],
  saplings: {}, chests: {},

  player: {
  x: 12*TILE, y: 12*TILE,
  prevX: 12*TILE, prevY: 12*TILE,
  renderX: 12*TILE, renderY: 12*TILE,
  r: 11, vx: 0, vy: 0,
  inWater: false,
  facing: { x: 0, y: 1 }
  },

  inventory: new Array(INV_COLS*INV_ROWS).fill(null),
  hotbar: new Array(HOTBAR_SIZE).fill(null),
  selectedHotbarSlot: 0,

  uiMode: null,
  uiCraftSlots: new Array(9).fill(null),
  uiCraftSize: 2,
  uiCraftResult: null,

  furnaceTarget: null,
  furnaceInput: null, furnaceFuel: null, furnaceOutput: null,
  furnaceProgress: 0, furnaceBurning: false, furnaceBurnUntil: 0,

  chestSlots: null, chestTarget: null,

  animals: [],
  raccoon: null,
  raccoonCooldown: 0,
  attackCooldown: 0,
  showRecipes: false, recipePage: 0,

  placingCooldown: 0,
  miningTarget: null, miningProgress: 0, miningBlocked: false,

  gameState: 'loading',
  currentSlot: null,
  savedSinceLastResume: false,
  keybindWaiting: null,

  keys: {},
  mouse: { x: 0, y: 0, left: false, right: false },
  camera: { x: 0, y: 0 },

  images: {}, floorCache: {}, objectCache: {}, itemCache: {},

  autosaveTimer: null, autosaveToastTimer: null,
  toastTimer: null,
  deleteTarget: null, deleteTimer: null, deleteCd: 5,
  settingsBackTo: 'main',

  _seed: 12345,
  accumulator: 0, lastTime: 0,
};

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