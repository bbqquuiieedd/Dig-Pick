// ============================================================
//  Dig-Pick — основа платформера с текстурами
// ============================================================

// ------------------------------------------------------------
// 1. НАСТРОЙКИ
// ------------------------------------------------------------
const TILE_SIZE  = 32;
const GRAVITY    = 0.5;
const MOVE_SPEED = 4;
const JUMP_VEL   = -10;
const MAX_FALL   = 15;
const WORLD_WIDTH  = 50;
const WORLD_HEIGHT = 20;

// Частота обновления физики (тиков в секунду).
// Физика всегда идёт с этой частотой, вне зависимости от FPS.
const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;

// Защита от "спирали смерти" после сворачивания вкладки
const MAX_ACCUMULATOR = 200;

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

// ============================================================
// 3. СИСТЕМА ТЕКСТУР
// ============================================================
const TEXTURE_PATHS = {
  missing:       'Textures/PNG/missing.png',
  grass:         'Textures/PNG/grass.png',
  dirt:          'Textures/PNG/dirt.png',
  player:        'Textures/PNG/player.png',
  // Спрайт приседа — 32×32 (1 блок × 1 блок)
  playerCrouch:  'Textures/PNG/player_crouch.png',
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

// ============================================================
// 4. МИР
// ============================================================
const TILE_TEXTURES = {
  1: 'dirt',
  2: 'grass',
};

const SURFACE_ROW = WORLD_HEIGHT - 5;

const world = [];
for (let y = 0; y < WORLD_HEIGHT; y++) {
  world[y] = [];
  for (let x = 0; x < WORLD_WIDTH; x++) {
    if (y === SURFACE_ROW)           world[y][x] = 2;
    else if (y > SURFACE_ROW)        world[y][x] = 1;
    else                              world[y][x] = 0;
  }
}

function getTile(bx, by) {
  if (bx < 0 || bx >= WORLD_WIDTH || by < 0 || by >= WORLD_HEIGHT) return 0;
  return world[by][bx];
}

function isSolid(bx, by) {
  if (bx < 0 || bx >= WORLD_WIDTH || by < 0 || by >= WORLD_HEIGHT) return true;
  return world[by][bx] !== 0;
}

// ============================================================
// 5. ИГРОК
// ============================================================
const PLAYER_STAND_HEIGHT  = TILE_SIZE * 2; // 64
const PLAYER_CROUCH_HEIGHT = TILE_SIZE;     // 32

const player = {
  x: (WORLD_WIDTH * TILE_SIZE) / 2 - TILE_SIZE / 2,
  y: SURFACE_ROW * TILE_SIZE - PLAYER_STAND_HEIGHT,
  width:  TILE_SIZE,
  height: PLAYER_STAND_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: false,
  isCrouching: false,
};

// ============================================================
// 6. УПРАВЛЕНИЕ
// ============================================================
const keys = {};

// Какая сторона была нажата ПОСЛЕДНЕЙ: 'left' | 'right' | null.
// Если зажаты обе — идём в ту, что нажали последней.
let lastDirectionKey = null;

function isLeftKey(code)  { return code === 'KeyA' || code === 'ArrowLeft';  }
function isRightKey(code) { return code === 'KeyD' || code === 'ArrowRight'; }

window.addEventListener('keydown', (e) => {
  // Не обрабатываем автоповтор — иначе lastDirectionKey будет
  // постоянно "обновляться" на ту же клавишу, но это не страшно.
  // Однако с автоповтором могут быть глюки, если зажать A, потом D,
  // потом снова A — все три события придут как keydown. Поэтому
  // отслеживаем только реальные переходы (было не нажато → стало нажато).
  const wasPressed = keys[e.code] === true;
  keys[e.code] = true;

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

  // Если отпустили "главную" клавишу — переключаемся на ту,
  // которая ещё зажата (если есть).
  if (isLeftKey(e.code) && lastDirectionKey === 'left') {
    if (isRightPressed())      lastDirectionKey = 'right';
    else                       lastDirectionKey = null;
  }
  if (isRightKey(e.code) && lastDirectionKey === 'right') {
    if (isLeftPressed())       lastDirectionKey = 'left';
    else                       lastDirectionKey = null;
  }
});

function isLeftPressed() {
  return !!(keys['KeyA'] || keys['ArrowLeft']);
}
function isRightPressed() {
  return !!(keys['KeyD'] || keys['ArrowRight']);
}

// Зажата ли сейчас клавиша приседа (S или Shift)
function wantsToCrouch() {
  return !!(keys['KeyS'] || keys['ShiftLeft'] || keys['ShiftRight'] || keys['ArrowDown']);
}

// ============================================================
// 7. ПРИСЕДАНИЕ
// ============================================================
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

function updateCrouch() {
  const want = wantsToCrouch();

  if (want && !player.isCrouching) {
    const feetY = player.y + player.height;
    player.height = PLAYER_CROUCH_HEIGHT;
    player.y = feetY - player.height;
    player.isCrouching = true;
  } else if (!want && player.isCrouching) {
    if (canStandUp()) {
      const feetY = player.y + player.height;
      player.height = PLAYER_STAND_HEIGHT;
      player.y = feetY - player.height;
      player.isCrouching = false;
    }
  }
}

// ============================================================
// 8. КОЛЛИЗИИ
// ============================================================
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

// ============================================================
// 9. ОБНОВЛЕНИЕ ИГРОКА (один тик)
// ============================================================
function updatePlayer() {
  updateCrouch();

  // Горизонтальный ввод — учитываем последнюю нажатую клавишу.
  // Если зажаты обе — идём в сторону той, что нажали позже.
  player.vx = 0;
  if (lastDirectionKey === 'left')  player.vx = -MOVE_SPEED;
  if (lastDirectionKey === 'right') player.vx =  MOVE_SPEED;

  if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.onGround) {
    player.vy = JUMP_VEL;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  player.x += player.vx;
  resolveX();

  player.y += player.vy;
  resolveY();
}

// ============================================================
// 10. КАМЕРА
// ============================================================
const camera = { x: 0, y: 0 };

function updateCamera() {
  const worldPixelWidth  = WORLD_WIDTH  * TILE_SIZE;
  const worldPixelHeight = WORLD_HEIGHT * TILE_SIZE;

  const targetX = player.x + player.width  / 2 - VIEW_WIDTH  / 2;
  const targetY = player.y + player.height / 2 - VIEW_HEIGHT / 2;

  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;

  if (worldPixelWidth > VIEW_WIDTH) {
    if (camera.x < 0) camera.x = 0;
    if (camera.x > worldPixelWidth - VIEW_WIDTH) camera.x = worldPixelWidth - VIEW_WIDTH;
  } else {
    camera.x = (worldPixelWidth - VIEW_WIDTH) / 2;
  }

  if (worldPixelHeight > VIEW_HEIGHT) {
    if (camera.y < 0) camera.y = 0;
    if (camera.y > worldPixelHeight - VIEW_HEIGHT) camera.y = worldPixelHeight - VIEW_HEIGHT;
  } else {
    camera.y = (worldPixelHeight - VIEW_HEIGHT) / 2;
  }
}

// ============================================================
// 11. ОТРИСОВКА
// ============================================================
function draw() {
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const startX = Math.floor(camera.x / TILE_SIZE);
  const endX   = Math.ceil((camera.x + VIEW_WIDTH)  / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endY   = Math.ceil((camera.y + VIEW_HEIGHT) / TILE_SIZE);

  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile === 0) continue;

      const texName = TILE_TEXTURES[tile];
      const screenX = bx * TILE_SIZE - camera.x;
      const screenY = by * TILE_SIZE - camera.y;

      drawTexture(texName, screenX, screenY, TILE_SIZE, TILE_SIZE);
    }
  }

  // Игрок. Если сидит — рисуем отдельную crouch-текстуру.
  // Если её нет, drawTexture молча ничего не нарисует
  // (а сама текстура уже подменена на missing при загрузке).
  const screenX = player.x - camera.x;
  const screenY = player.y - camera.y;
  const texName = player.isCrouching ? 'playerCrouch' : 'player';
  drawTexture(texName, screenX, screenY, player.width, player.height);
}

// ============================================================
// 12. ИГРОВОЙ ЦИКЛ С ФИКСИРОВАННЫМ ШАГОМ
// ============================================================
let accumulator = 0;
let lastTime = 0;

function gameLoop(now) {
  if (lastTime === 0) lastTime = now;
  let delta = now - lastTime;
  lastTime = now;

  if (delta > MAX_ACCUMULATOR) delta = MAX_ACCUMULATOR;
  accumulator += delta;

  while (accumulator >= TICK_DURATION) {
    updatePlayer();
    updateCamera();
    accumulator -= TICK_DURATION;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ============================================================
// 13. СТАРТ ИГРЫ
// ============================================================
async function startGame() {
  await loadAllTextures();
  requestAnimationFrame(gameLoop);
}

startGame();