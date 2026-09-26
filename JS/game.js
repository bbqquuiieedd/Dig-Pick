// ============================================================
//  Dig-Pick — платформер в стиле Terraria
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

// Множитель скорости в приседе (0.5 = вдвое медленнее)
const CROUCH_SPEED_MULT = 0.5;

const TICK_RATE = 60;
const TICK_DURATION = 1000 / TICK_RATE;
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

// ------------------------------------------------------------
// 3. СИСТЕМА ТЕКСТУР
// ------------------------------------------------------------
const TEXTURE_PATHS = {
  missing:      'Textures/PNG/missing.png',
  grass:        'Textures/PNG/grass.png',
  dirt:         'Textures/PNG/dirt.png',
  player:       'Textures/PNG/player.png',        // 32×64, смотрит вправо
  playerCrouch: 'Textures/PNG/player_crouch.png', // 32×32
  playerJump:   'Textures/PNG/player_jump.png',   // 32×64 — летит вверх
  playerFall:   'Textures/PNG/player_fall.png',   // 32×64 — падает
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

// Обычная отрисовка текстуры
function drawTexture(name, x, y, w, h) {
  const tex = textures[name];
  if (tex && tex.complete && tex.naturalWidth > 0) {
    ctx.drawImage(tex, x, y, w, h);
  }
}

// Отрисовка с горизонтальным отражением.
// flip = true — отражаем по X (персонаж смотрит влево).
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
// 4. МИР
// ------------------------------------------------------------
const TILE_TEXTURES = { 1: 'dirt', 2: 'grass' };
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

// ------------------------------------------------------------
// 5. ИГРОК
// ------------------------------------------------------------
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
  facing: 'right',
};

// ------------------------------------------------------------
// 6. УПРАВЛЕНИЕ
// ------------------------------------------------------------
const keys = {};
let lastDirectionKey = null;

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
  }

  if (!wasPressed) {
    if (isLeftKey(e.code))  lastDirectionKey = 'left';
    if (isRightKey(e.code)) lastDirectionKey = 'right';
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F3'].includes(e.code)) {
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

// ------------------------------------------------------------
// 7. ПРИСЕД
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
  // В воздухе не приседаем — там прыжковый/падающий спрайт и полный рост.
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
// 8. КОЛЛИЗИИ
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
// 9. ОБНОВЛЕНИЕ ИГРОКА (один тик)
// ------------------------------------------------------------
function updatePlayer() {
  // 1. Горизонтальный ввод. Скорость зависит от приседа.
  const speed = player.isCrouching ? MOVE_SPEED * CROUCH_SPEED_MULT : MOVE_SPEED;

  player.vx = 0;
  if (lastDirectionKey === 'left')  player.vx = -speed;
  if (lastDirectionKey === 'right') player.vx =  speed;

  // Запоминаем направление для отрисовки.
  if (player.vx > 0) player.facing = 'right';
  else if (player.vx < 0) player.facing = 'left';

  // 2. Прыжок. Если сидим — принудительно встаём.
  if (isJumpPressed() && player.onGround) {
    if (player.isCrouching) standUp();
    player.vy = JUMP_VEL;
    player.onGround = false;
  }

  // 3. Присед
  updateCrouch();

  // 4. Гравитация
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  // 5. Движение и коллизии
  player.x += player.vx;
  resolveX();

  player.y += player.vy;
  resolveY();
}

// ------------------------------------------------------------
// 10. КАМЕРА
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// 11. ОТРИСОВКА
// ------------------------------------------------------------
// Возвращает имя текстуры игрока в зависимости от состояния.
function getPlayerTexture() {
  if (!player.onGround) {
    // В воздухе: летит вверх или падает.
    // vy === 0 (пик прыжка) считаем падением — так реже мелькает не тот спрайт.
    return player.vy < 0 ? 'playerJump' : 'playerFall';
  }
  if (player.isCrouching) return 'playerCrouch';
  return 'player';
}

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

      drawTexture(
        TILE_TEXTURES[tile],
        bx * TILE_SIZE - camera.x,
        by * TILE_SIZE - camera.y,
        TILE_SIZE, TILE_SIZE
      );
    }
  }

  // Игрок
  const texName = getPlayerTexture();
  const screenX = player.x - camera.x;
  const screenY = player.y - camera.y;
  const flip    = (player.facing === 'left');

  drawTextureFlipped(texName, screenX, screenY, player.width, player.height, flip);

  if (debugOverlay) drawDebug();
}

// ------------------------------------------------------------
// 12. ОТЛАДОЧНЫЙ ОВЕРЛЕЙ (F3)
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
  ctx.fillRect(padX, padY, 320, 300);

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
  print('Нажатые клавиши:', '#fff');

  for (const code of TRACKED_KEYS) {
    const pressed = !!keys[code];
    const color = pressed ? '#0f0' : '#444';
    const mark = pressed ? '[X]' : '[ ]';
    print(`  ${mark} ${code}`, color);
  }

  print('');
  print('Игрок:', '#fff');
  print(`  x=${player.x.toFixed(1)} y=${player.y.toFixed(1)}`);
  print(`  vx=${player.vx.toFixed(2)} vy=${player.vy.toFixed(2)}`);
  print(`  onGround=${player.onGround}`, player.onGround ? '#0f0' : '#f80');
  print(`  crouch=${player.isCrouching}`, player.isCrouching ? '#0f0' : '#888');
  print(`  facing=${player.facing}`, '#fff');
  print(`  tex=${getPlayerTexture()}`, '#0ff');
  print(`  jumpPressed=${isJumpPressed()}`, isJumpPressed() ? '#0f0' : '#888');
}

// ------------------------------------------------------------
// 13. ИГРОВОЙ ЦИКЛ С ФИКСИРОВАННЫМ ШАГОМ
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
    updatePlayer();
    updateCamera();
    accumulator -= TICK_DURATION;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// 14. СТАРТ ИГРЫ
// ------------------------------------------------------------
async function startGame() {
  await loadAllTextures();
  requestAnimationFrame(gameLoop);
}

startGame();