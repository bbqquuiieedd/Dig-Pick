// ============================================================
//  fish.js — рыба
//  Y-ВВЕРХ: fish.y — НИЖНИЙ край спрайта. vy < 0 = падение.
// ============================================================

function spawnFishAt(x, y) {
  fish.push({
    x: x, y: y,
    vx: 0, vy: 0,
    w: 8, h: 8,
    facing: 1,
    life: 30,
  });
}

function updateFish() {
  // Спавн — ищем воду рядом с игроком
  if (fish.length < FISH_SPAWN_LIMIT && Math.random() < 0.005) {
    const pBx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const pBy = Math.floor((player.y + player.height / 2) / TILE_SIZE);
    for (let tries = 0; tries < 6; tries++) {
      const bx = pBx + Math.floor((Math.random() - 0.5) * 40);
      const by = pBy + Math.floor((Math.random() - 0.5) * 20);
      // Спавн только в клетке и над ней достаточно воды
      if (getWater(bx, by) >= 4 && getWater(bx, by + 1) >= 4) {
        spawnFishAt(bx * TILE_SIZE, by * TILE_SIZE);
        break;
      }
    }
  }

  for (let i = fish.length - 1; i >= 0; i--) {
    const f = fish[i];
    f.life -= 1 / TICK_RATE;
    if (f.life <= 0) { fish.splice(i, 1); continue; }

    const bx = Math.floor((f.x + f.w / 2) / TILE_SIZE);
    const by = Math.floor((f.y + f.h / 2) / TILE_SIZE);
    const waterHere = getWater(bx, by);

    if (waterHere < 2) {
      // Вне воды: падает
      f.vy = (f.vy || 0) - 0.15;     // вниз = уменьшаем Y
      if (f.vy < -2) f.vy = -2;
      f.y += f.vy;
      f.x += (f.vx || 0) * 0.3;

      f.outOfWater = (f.outOfWater || 0) + 1 / TICK_RATE;
      if (f.outOfWater > 2) { fish.splice(i, 1); continue; }
      if (f.y < -500 * TILE_SIZE) { fish.splice(i, 1); continue; }
    } else {
      // В воде
      f.outOfWater = 0;
      if (Math.random() < 0.02) f.facing = -f.facing;
      f.vx = f.facing * 0.3;
      f.vy = 0;

      const nextX = f.x + f.vx;
      const nextBx = Math.floor((nextX + f.w / 2) / TILE_SIZE);
      const nextBy = Math.floor((f.y + f.h / 2) / TILE_SIZE);

      if (getWater(nextBx, nextBy) >= 2) {
        f.x = nextX;
      } else {
        f.facing = -f.facing;
      }
    }
  }
}

function tryCatchFish() {
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;
  const rangePx = FISH_PICKUP_RANGE * TILE_SIZE;

  for (let i = fish.length - 1; i >= 0; i--) {
    const f = fish[i];
    const fx = f.x + f.w / 2;
    const fy = f.y + f.h / 2;
    const dx = fx - pcx, dy = fy - pcy;
    if (dx * dx + dy * dy <= rangePx * rangePx) {
      tryAddItemToInventory(ITEM_RAW_SALMON, 1);
      fish.splice(i, 1);
      logConsole('Пойман лосось', '#88ff88');
      return true;
    }
  }
  return false;
}

function clearFish() { fish = []; }