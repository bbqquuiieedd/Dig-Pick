// ============================================================
//  player.js — игрок, физика, коллизии
// ============================================================

const player = {
  x: 0,
  y: SURFACE_ROW * TILE_SIZE - PLAYER_HEIGHT,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  vx: 0, vy: 0,
  onGround: false,
  facing: 'right',
};

const spawnPoint = {
  x: 0,
  y: SURFACE_ROW * TILE_SIZE - PLAYER_HEIGHT,
};

const camera = { x: 0, y: 0 };

function resetPlayer() {
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.facing = 'right';
  lastDirectionAction = null;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
}

function snapCamera() {
  camera.x = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  camera.y = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
}

// ------------------------------------------------------------
// КОЛЛИЗИИ
// ------------------------------------------------------------
function resolveX() {
  const top    = Math.floor((player.y + 1) / TILE_SIZE);
  const bottom = Math.floor((player.y + player.height - 1) / TILE_SIZE);
  if (player.vx > 0) {
    const right = Math.floor((player.x + player.width) / TILE_SIZE);
    for (let by = top; by <= bottom; by++) if (isSolid(right, by)) {
      player.x = right * TILE_SIZE - player.width - 0.001;
      player.vx = 0;
      return;
    }
  } else if (player.vx < 0) {
    const left = Math.floor(player.x / TILE_SIZE);
    for (let by = top; by <= bottom; by++) if (isSolid(left, by)) {
      player.x = (left + 1) * TILE_SIZE + 0.001;
      player.vx = 0;
      return;
    }
  }
}

function resolveY() {
  const left  = Math.floor((player.x + 1) / TILE_SIZE);
  const right = Math.floor((player.x + player.width - 1) / TILE_SIZE);
  player.onGround = false;
  if (player.vy > 0) {
    const bottom = Math.floor((player.y + player.height) / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) if (isSolid(bx, bottom)) {
      player.y = bottom * TILE_SIZE - player.height;
      player.vy = 0;
      player.onGround = true;
      return;
    }
  } else if (player.vy < 0) {
    const top = Math.floor(player.y / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) if (isSolid(bx, top)) {
      player.y = (top + 1) * TILE_SIZE;
      player.vy = 0;
      return;
    }
  }
}

// ------------------------------------------------------------
// ОБНОВЛЕНИЕ ИГРОКА
// ------------------------------------------------------------
function updatePlayer() {
  const dt = TICK_DURATION / 1000;   // секунды за один тик
  const onGround = player.onGround;

  // --- Горизонтальное управление ---
  const wantLeft  = lastDirectionAction === 'left';
  const wantRight = lastDirectionAction === 'right';
  const hasInput  = wantLeft || wantRight;

  if (hasInput) {
    // Разгон к целевому направлению
    const dir = wantLeft ? -1 : 1;
    const accel = onGround ? PLAYER_ACCEL : PLAYER_AIR_ACCEL;
    player.vx += dir * accel;
    // Не перескакиваем потолок скорости
    if (player.vx >  MAX_MOVE_SPEED) player.vx =  MAX_MOVE_SPEED;
    if (player.vx < -MAX_MOVE_SPEED) player.vx = -MAX_MOVE_SPEED;
  } else {
    // Трение — постепенно останавливаем
    const fric = (onGround ? PLAYER_FRICTION : PLAYER_AIR_FRICTION) * (TICK_RATE * dt);
    if (player.vx > 0) player.vx = Math.max(0, player.vx - fric);
    else if (player.vx < 0) player.vx = Math.min(0, player.vx + fric);
  }

  if (player.vx >  0.01) player.facing = 'right';
  else if (player.vx < -0.01) player.facing = 'left';

  // --- Coyote time ---
  // Если только что сошли с земли — даём ещё чуть-чуть времени на прыжок.
  if (onGround) coyoteTimer = COYOTE_TIME;
  else          coyoteTimer = Math.max(0, coyoteTimer - dt);

  // --- Jump buffer ---
  // Если игрок нажал прыжок чуть раньше приземления — запомним это.
  if (isActionPressed('game', 'jump')) {
    if (jumpBufferTimer <= 0) jumpBufferTimer = JUMP_BUFFER;
  }
  if (jumpBufferTimer > 0) jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);

  // --- Прыжок ---
  if (jumpBufferTimer > 0 && coyoteTimer > 0) {
    player.vy = JUMP_VEL;
    player.onGround = false;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
  }

  // --- Гравитация ---
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  // --- Движение и коллизии ---
  player.x += player.vx; resolveX();
  player.y += player.vy; resolveY();

  if (player.vx !== 0 || player.vy !== 0) hasUnsavedChanges = true;
}

function updateCamera() {
  const tx = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  const ty = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
  camera.x += (tx - camera.x) * 0.1;
  camera.y += (ty - camera.y) * 0.1;
}