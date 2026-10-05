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
}

function snapCamera() {
  camera.x = player.x + player.width  / 2 - VIEW_WORLD_WIDTH  / 2;
  camera.y = player.y + player.height / 2 - VIEW_WORLD_HEIGHT / 2;
}

function resolveX() {
  const top    = Math.floor((player.y + 1) / TILE_SIZE);
  const bottom = Math.floor((player.y + player.height - 1) / TILE_SIZE);
  if (player.vx > 0) {
    const right = Math.floor((player.x + player.width) / TILE_SIZE);
    for (let by = top; by <= bottom; by++) if (isSolid(right, by)) {
      player.x = right * TILE_SIZE - player.width - 0.001; player.vx = 0; return;
    }
  } else if (player.vx < 0) {
    const left = Math.floor(player.x / TILE_SIZE);
    for (let by = top; by <= bottom; by++) if (isSolid(left, by)) {
      player.x = (left + 1) * TILE_SIZE + 0.001; player.vx = 0; return;
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
      player.vy = 0; player.onGround = true; return;
    }
  } else if (player.vy < 0) {
    const top = Math.floor(player.y / TILE_SIZE);
    for (let bx = left; bx <= right; bx++) if (isSolid(bx, top)) {
      player.y = (top + 1) * TILE_SIZE; player.vy = 0; return;
    }
  }
}

function updatePlayer() {
  player.vx = 0;
  if (lastDirectionAction === 'left')  player.vx = -MOVE_SPEED;
  if (lastDirectionAction === 'right') player.vx =  MOVE_SPEED;
  if (player.vx > 0) player.facing = 'right';
  else if (player.vx < 0) player.facing = 'left';

  if (isActionPressed('game', 'jump') && player.onGround) {
    player.vy = JUMP_VEL; player.onGround = false;
  }

  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

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