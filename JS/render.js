// ============================================================
//  render.js — отрисовка мира и игрока
//  Мир в Y-ВВЕРХ, экран в Y-ВНИЗ. Преобразование — через worldToScreenX/Y.
//  Никаких ctx.scale/translate — работаем в экранных пикселях.
// ============================================================

function getPlayerTexture() {
  if (!player.onGround) return 'playerJump';
  if (Math.abs(player.vx) > 0.01) return 'playerWalk';
  return 'playerStand';
}

// ------------------------------------------------------------
// ПРЕОБРАЗОВАНИЕ КООРДИНАТ: world (Y-вверх) → screen (Y-вниз)
// camera.y — НИЖНИЙ край видимой области.
// ------------------------------------------------------------
function worldToScreenX(wx) {
  return (wx - camera.x) * RENDER_SCALE;
}
function worldToScreenY(wy) {
  return (camera.y + VIEW_WORLD_HEIGHT - wy) * RENDER_SCALE;
}

function drawWorld() {
  // Небо
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Диапазон видимых клеток (Y-вверх)
  const startX = Math.floor(camera.x / TILE_SIZE);
  const endX   = Math.ceil((camera.x + VIEW_WORLD_WIDTH)  / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endY   = Math.ceil((camera.y + VIEW_WORLD_HEIGHT) / TILE_SIZE);

  const TS_S = TILE_SIZE * RENDER_SCALE;

  // --- 1. Стены (задний фон) ---
  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const wall = getWall(bx, by);
      if (wall === WALL_AIR) continue;
      const def = WALL_DEFS[wall];
      if (!def || !def.texture) continue;
      const sx = worldToScreenX(bx * TILE_SIZE);
      const sy = worldToScreenY((by + 1) * TILE_SIZE);
      drawTexture(def.texture, sx, sy, TS_S, TS_S);
    }
  }

  // --- 2. Природные стволы и листва (под водой) ---
  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile !== TILE_LOG_NATURAL && tile !== TILE_LEAVES) continue;
      const def = TILE_DEFS[tile];
      if (!def || !def.texture) continue;
      const sx = worldToScreenX(bx * TILE_SIZE);
      const sy = worldToScreenY((by + 1) * TILE_SIZE);
      drawTexture(def.texture, sx, sy, TS_S, TS_S);
    }
  }

  // --- 3. Вода ---
  const waterTex = textures.water;
  if (waterTex && waterTex.complete && waterTex.naturalWidth > 0) {
    for (let by = startY; by <= endY; by++) {
      for (let bx = startX; bx <= endX; bx++) {
        const level = getWater(bx, by);
        if (level <= 0) continue;
        const srcY  = TILE_SIZE - level;
        const srcH  = level;
        // верх блока воды = by + level/8 в мировых координатах
        const worldTopY = (by + level / WATER_MAX_LEVEL) * TILE_SIZE;
        const sx = worldToScreenX(bx * TILE_SIZE);
        const sy = worldToScreenY(worldTopY);
        const dw = TS_S;
        const dh = level * RENDER_SCALE;
        ctx.drawImage(waterTex, 0, srcY, TILE_SIZE, srcH, sx, sy, dw, dh);
      }
    }
  }

  // --- 4. Остальные блоки (поверх воды) ---
  for (let by = startY; by <= endY; by++) {
    for (let bx = startX; bx <= endX; bx++) {
      const tile = getTile(bx, by);
      if (tile === TILE_AIR) continue;
      if (tile === TILE_LOG_NATURAL || tile === TILE_LEAVES) continue;
      const def = TILE_DEFS[tile];
      if (!def || !def.texture) continue;
      const sx = worldToScreenX(bx * TILE_SIZE);
      const sy = worldToScreenY((by + 1) * TILE_SIZE);
      drawTexture(def.texture, sx, sy, TS_S, TS_S);
    }
  }

  // --- 5. Трещины ---
  if (breakingBlock && breakingProgress > 0) {
    const sx = worldToScreenX(breakingBlock.bx * TILE_SIZE);
    const sy = worldToScreenY((breakingBlock.by + 1) * TILE_SIZE);
    drawTextureAlpha('cracks', sx, sy, TS_S, TS_S, Math.min(1, breakingProgress));
  }

  // --- 6. Рыба ---
  // fish.y — НИЖНИЙ край спрайта. Верх = fish.y + fish.h.
  for (const f of fish) {
    const sx    = worldToScreenX(f.x);
    const syTop = worldToScreenY(f.y + f.h);
    const dw = f.w * RENDER_SCALE;
    const dh = f.h * RENDER_SCALE;
    if (f.facing > 0) {
      drawTexture('salmon', sx, syTop, dw, dh);
    } else {
      ctx.save();
      ctx.translate(sx + dw, syTop);
      ctx.scale(-1, 1);
      drawTexture('salmon', 0, 0, dw, dh);
      ctx.restore();
    }
  }

  // --- 7. Игрок ---
  const texName = getPlayerTexture();
  const pSx    = worldToScreenX(player.x);
  const pSyTop = worldToScreenY(player.y + player.height);
  const pDw = player.width  * RENDER_SCALE;
  const pDh = player.height * RENDER_SCALE;
  drawTextureFlipped(texName, pSx, pSyTop, pDw, pDh, player.facing === 'left');

  // --- 8. Рамка блока под курсором ---
  if (gameState === 'playing' && !inventoryOpen) drawFrames();
}

function drawFrames() {
  const target = getTargetTile();
  if (!target) return;
  const TS_S = TILE_SIZE * RENDER_SCALE;
  const sx = worldToScreenX(target.bx * TILE_SIZE);
  const sy = worldToScreenY((target.by + 1) * TILE_SIZE);
  drawTexture('frame', sx, sy, TS_S, TS_S);
}

function drawHealthAndAir() {
  const panel = getInventoryPanelRect();
  const hotbarTop = getSlotRect(0).y;
  const barW = Math.floor(panel.width / 2) - 4;
  const barH = 14;
  const padX = 4;
  const bottomY = hotbarTop - barH - 4;

  // HP
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(panel.x, bottomY, barW, barH);
  ctx.fillStyle = '#c83030';
  ctx.fillRect(panel.x + 1, bottomY + 1, (barW - 2) * (playerHP / HP_MAX), barH - 2);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + 0.5, bottomY + 0.5, barW - 1, barH - 1);

  ctx.fillStyle = '#fff';
  ctx.font = '12px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HP ' + Math.round(playerHP), panel.x + padX, bottomY + barH / 2);

  // Воздух (справа)
  if (playerAir < AIR_MAX) {
    const airX = panel.x + barW + 4;
    const airW = Math.floor(panel.width / 2) - 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(airX, bottomY, airW, barH);
    ctx.fillStyle = '#3080d0';
    ctx.fillRect(airX + 1, bottomY + 1, (airW - 2) * (playerAir / AIR_MAX), barH - 2);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(airX + 0.5, bottomY + 0.5, airW - 1, barH - 1);

    ctx.fillStyle = '#fff';
    ctx.fillText('Воздух ' + Math.round(playerAir), airX + padX, bottomY + barH / 2);
  }
}

function drawDebug() {
  const ct = getCursorTile();
  const tile = getTile(ct.bx, ct.by);
  const wall = getWall(ct.bx, ct.by);
  const def = TILE_DEFS[tile];
  const waterLevel = getWater(ct.bx, ct.by);

  withUIScale(() => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, UI_H - 100, 400, 90);
    ctx.fillStyle = '#0ff';
    ctx.font = '13px ' + FONT_FAMILY;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillText(`Сид: ${activeWorldSeed}`, 16, UI_H - 85);
    ctx.fillText(`(${ct.bx}, ${ct.by}) tile: ${def ? def.name : '?'}`, 16, UI_H - 65);
    ctx.fillText(`wall: ${WALL_DEFS[wall] ? WALL_DEFS[wall].name : '?'}`, 16, UI_H - 45);
    ctx.fillText(`water: ${waterLevel}/8`, 16, UI_H - 25);
  });
}