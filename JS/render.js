// ============================================================
//  render.js — отрисовка мира и игрока
// ============================================================

function getPlayerTexture() {
  // В воздухе — прыжковый спрайт (и при полёте вверх, и при падении)
  if (!player.onGround) return 'playerJump';

  // На земле: движется — walk, стоит — stand
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

  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile === TILE_AIR) continue;

      const px = bx * TILE_SIZE;
      const py = by * TILE_SIZE;

      if (tile === TILE_GRASS) {
        const above = getTile(bx, by - 1);
        if (above === TILE_AIR) {
          drawTexture('dirt', px, py, TILE_SIZE, TILE_SIZE);
          drawTexture('grass', px, py, TILE_SIZE, TILE_SIZE);
        } else {
          drawTexture('dirt', px, py, TILE_SIZE, TILE_SIZE);
        }
      } else {
        const def = TILE_DEFS[tile];
        if (def && def.texture) {
          drawTexture(def.texture, px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  if (breakingBlock && breakingProgress > 0) {
    drawTextureAlpha('cracks',
      breakingBlock.bx * TILE_SIZE, breakingBlock.by * TILE_SIZE,
      TILE_SIZE, TILE_SIZE, Math.min(1, breakingProgress));
  }

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
  const def = TILE_DEFS[tile];

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, VIEW_HEIGHT - 40, 340, 30);
  ctx.fillStyle = '#0ff';
  ctx.font = '13px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `Курсор: (${ct.bx}, ${ct.by}) — ${def ? def.name : '?'}`,
    16, VIEW_HEIGHT - 25
  );
}