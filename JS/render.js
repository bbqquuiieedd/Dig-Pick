// ============================================================
//  render.js — отрисовка мира и игрока
// ============================================================

function getPlayerTexture() {
  if (!player.onGround) return 'playerJump';
  if (Math.abs(player.vx) > 0.01) return 'playerWalk';
  return 'playerStand';
}

function drawWorld() {
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.save();
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.translate(-camera.x, -camera.y);

  const startX = Math.floor(camera.x / TILE_SIZE);
  const endX   = Math.ceil((camera.x + VIEW_WORLD_WIDTH)  / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endY   = Math.ceil((camera.y + VIEW_WORLD_HEIGHT) / TILE_SIZE);

  // --- 1. Стены (задний фон) ---
  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const wall = getWall(bx, by);
      if (wall === WALL_AIR) continue;
      const def = WALL_DEFS[wall];
      if (!def || !def.texture) continue;
      drawTexture(def.texture, bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // --- 2. Блоки (передний план) ---
  // Трава рисуется своей текстурой (grass.png), без наложения на dirt.
  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile === TILE_AIR) continue;
      const def = TILE_DEFS[tile];
      if (!def || !def.texture) continue;
      drawTexture(def.texture, bx * TILE_SIZE, by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // --- 3. Трещины ---
  if (breakingBlock && breakingProgress > 0) {
    drawTextureAlpha('cracks',
      breakingBlock.bx * TILE_SIZE, breakingBlock.by * TILE_SIZE,
      TILE_SIZE, TILE_SIZE, Math.min(1, breakingProgress));
  }

  // --- 4. Игрок ---
  const texName = getPlayerTexture();
  drawTextureFlipped(texName, player.x, player.y, player.width, player.height, player.facing === 'left');

  if (gameState === 'playing' && !inventoryOpen) drawFrames();
  ctx.restore();

  if (debugOverlay) drawDebug();
}

function drawFrames() {
  const target = getTargetTile();
  if (!target) return;
  drawTexture('frame', target.bx * TILE_SIZE, target.by * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function drawDebug() {
  const ct = getCursorTile();
  const tile = getTile(ct.bx, ct.by);
  const wall = getWall(ct.bx, ct.by);
  const def = TILE_DEFS[tile];

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, VIEW_HEIGHT - 80, 400, 70);
  ctx.fillStyle = '#0ff';
  ctx.font = '13px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillText(`Сид: ${activeWorldSeed}`, 16, VIEW_HEIGHT - 65);
  ctx.fillText(`(${ct.bx},${ct.by}) tile: ${def ? def.name : '?'}`, 16, VIEW_HEIGHT - 45);
  ctx.fillText(`wall: ${WALL_DEFS[wall] ? WALL_DEFS[wall].name : '?'}`, 16, VIEW_HEIGHT - 25);
}