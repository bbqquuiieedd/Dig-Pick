// ============================================================
//  player.js — игрок, физика, коллизии
//  Y-ВВЕРХ: player.y — НИЖНИЙ край хитбокса (ноги).
//  Игрок занимает [player.y, player.y + player.height].
//  vy > 0 — летит вверх, vy < 0 — падает.
// ============================================================

const player = {
  x: 0,
  y: SURFACE_Y * TILE_SIZE,   // ноги на траве
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  vx: 0, vy: 0,
  onGround: false,
  facing: 'right',
};

const spawnPoint = {
  x: 0,
  y: SURFACE_Y * TILE_SIZE,
};

const camera = { x: 0, y: 0 };  // camera.y — НИЖНИЙ край видимой области

function resetPlayer() {
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.facing = 'right';
  lastDirectionAction = null;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  playerHP = HP_MAX;
  playerAir = AIR_MAX;
}

function snapCamera() {
  // camera.y — нижний край = центр игрока минус половина видимой высоты
  camera.x = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  camera.y = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
}

// ------------------------------------------------------------
// КОЛЛИЗИИ
// ------------------------------------------------------------
function resolveX() {
  // Игрок занимает [player.y, player.y + player.height]
  const bottomRow = Math.floor(player.y / TILE_SIZE);
  const topRow    = Math.floor((player.y + player.height - 1) / TILE_SIZE);

  if (player.vx > 0) {
    const right = Math.floor((player.x + player.width) / TILE_SIZE);
    for (let by = bottomRow; by <= topRow; by++) {
      if (isSolid(right, by)) {
        player.x = right * TILE_SIZE - player.width - 0.001;
        player.vx = 0;
        return;
      }
    }
  } else if (player.vx < 0) {
    const left = Math.floor(player.x / TILE_SIZE);
    for (let by = bottomRow; by <= topRow; by++) {
      if (isSolid(left, by)) {
        player.x = (left + 1) * TILE_SIZE + 0.001;
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

  if (player.vy < 0) {
    // Падаем вниз — проверяем блок ПОД ногами
    const cellY = Math.floor(player.y / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) {
      if (isSolid(bx, cellY)) {
        // Ноги встают на ВЕРХНЮЮ границу блока
        player.y = (cellY + 1) * TILE_SIZE;
        player.vy = 0;
        player.onGround = true;
        return;
      }
    }
  } else if (player.vy > 0) {
    // Летим вверх — проверяем блок НАД головой
    const cellY = Math.floor((player.y + player.height) / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) {
      if (isSolid(bx, cellY)) {
        // Голова встаёт на НИЖНЮЮ границу блока
        player.y = cellY * TILE_SIZE - player.height;
        player.vy = 0;
        return;
      }
    }
  }
}

// ------------------------------------------------------------
// ОБНОВЛЕНИЕ
// ------------------------------------------------------------
function updatePlayer() {
  const dt = TICK_DURATION / 1000;
  const onGround = player.onGround;

  const pcx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
  const pcyBottom = Math.floor(player.y / TILE_SIZE);
  const pcyTop    = Math.floor((player.y + player.height - 1) / TILE_SIZE);
  const inWater = getWater(pcx, pcyBottom) > 0 || getWater(pcx, pcyTop) > 0;
  const headInWater = getWater(
    Math.floor((player.x + player.width / 2) / TILE_SIZE),
    Math.floor((player.y + player.height - 1) / TILE_SIZE)
  ) > 0;

  // --- Горизонталь ---
  const wantLeft  = lastDirectionAction === 'left';
  const wantRight = lastDirectionAction === 'right';
  const hasInput  = wantLeft || wantRight;

  if (hasInput) {
    const dir = wantLeft ? -1 : 1;
    let accel;
    if (inWater) accel = PLAYER_AIR_ACCEL * 0.8;
    else accel = onGround ? PLAYER_ACCEL : PLAYER_AIR_ACCEL;
    player.vx += dir * accel;
    const maxSpd = inWater ? SWIM_MAX_VEL : MAX_MOVE_SPEED;
    if (player.vx >  maxSpd) player.vx =  maxSpd;
    if (player.vx < -maxSpd) player.vx = -maxSpd;
  } else {
    let fric = (onGround ? PLAYER_FRICTION : PLAYER_AIR_FRICTION) * (TICK_RATE * dt);
    if (inWater) fric *= 3;
    if (player.vx > 0) player.vx = Math.max(0, player.vx - fric);
    else if (player.vx < 0) player.vx = Math.min(0, player.vx + fric);
  }

  if (player.vx >  0.01) player.facing = 'right';
  else if (player.vx < -0.01) player.facing = 'left';

  // --- Coyote ---
  if (onGround) coyoteTimer = COYOTE_TIME;
  else          coyoteTimer = Math.max(0, coyoteTimer - dt);

  // --- Jump buffer ---
  if (isActionPressed('game', 'jump')) {
    if (jumpBufferTimer <= 0) jumpBufferTimer = JUMP_BUFFER;
  }
  if (jumpBufferTimer > 0) jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);

  // --- Прыжок / плавание ---
  if (inWater) {
    if (isActionPressed('game', 'jump')) {
      player.vy = SWIM_UP_VEL;   // положительная = вверх
    }
  } else if (jumpBufferTimer > 0 && coyoteTimer > 0) {
    player.vy = JUMP_VEL;        // положительная = вверх
    player.onGround = false;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
  }

  // --- Гравитация ---
  if (inWater) {
    player.vy -= SWIM_GRAVITY;
    if (player.vy < -SWIM_MAX_VEL) player.vy = -SWIM_MAX_VEL;
    if (isActionPressed('game', 'jump') && player.vy < SWIM_UP_VEL * 0.5) {
      player.vy = SWIM_UP_VEL * 0.5;
    }
  } else {
    player.vy -= GRAVITY;
    if (player.vy < -MAX_FALL) player.vy = -MAX_FALL;
  }

  // --- Движение ---
  player.x += player.vx; resolveX();
  player.y += player.vy; resolveY();

  // --- Дыхание / HP ---
  if (headInWater) {
    playerAir = Math.max(0, playerAir - AIR_DRAIN_RATE);
    if (playerAir <= 0) playerHP = Math.max(0, playerHP - DROWNING_DAMAGE);
  } else {
    playerAir = Math.min(AIR_MAX, playerAir + AIR_REGEN_RATE);
  }
  if (!inWater && playerAir > 0 && playerHP < HP_MAX) {
    playerHP = Math.min(HP_MAX, playerHP + HP_REGEN_RATE);
  }

  if (player.vx !== 0 || player.vy !== 0) hasUnsavedChanges = true;
}

function updateCamera() {
  // Жёсткое центрирование: камера всегда ровно на игроке.
  // Никакого lerp — при зуме и ресайзе нет «догоняния».
  camera.x = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  camera.y = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
}