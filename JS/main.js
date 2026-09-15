// ============================================================
// Dig-Pick v0.2 — полноэкранный, с пляжем, водой и озёрами
// ============================================================

// ------------------------------------------------------------
// КОНСТАНТЫ
// ------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 32;
const WORLD_W = 100;
const WORLD_H = 50;

const MOVE_SPEED = 3.2;
const REACH = 4.5;
const ACTION_COOLDOWN = 8;

const INV_SIZE = 10;

// ------------------------------------------------------------
// КАРТА ТЕКСТУР
// ------------------------------------------------------------
const TEXTURE_PATHS = {
  tiles: {
    0:  'textures/tiles/grass.png',
    1:  'textures/tiles/dirt.png',
    2:  'textures/tiles/stone.png',
    3:  'textures/tiles/wall.png',
    4:  'textures/tiles/tree.png',
    5:  'textures/tiles/boulder.png',
    6:  'textures/tiles/sand.png',
    7:  'textures/tiles/water.png',
    8:  'textures/tiles/flowers.png',
    9:  'textures/tiles/tallgrass.png',
    10: 'textures/tiles/gravel.png',
  },
  player: 'textures/player.png',
};

const images = {};

// ------------------------------------------------------------
// ТИПЫ ТАЙЛОВ
// solid      — блокирует движение
// kind       — слой отрисовки: 'floor' (земля, вода, песок), 'wall' (объекты)
// mineable   — можно ли сломать
// placeable  — можно ли поставить блок
// ------------------------------------------------------------
const TILES = {
  0:  { name: 'Трава',         color: '#5aad4a', solid: false, kind: 'floor', mineable: false, placeable: true  },
  1:  { name: 'Земля',         color: '#8B5A2B', solid: false, kind: 'floor', mineable: false, placeable: true  },
  2:  { name: 'Камень',        color: '#7a7a7a', solid: false, kind: 'floor', mineable: false, placeable: true  },
  3:  { name: 'Стена',         color: '#4a4a4a', solid: true,  kind: 'wall',  mineable: true,  placeable: false },
  4:  { name: 'Дерево',        color: '#a0522d', solid: true,  kind: 'wall',  mineable: true,  placeable: false },
  5:  { name: 'Валун',         color: '#9a9a9a', solid: true,  kind: 'wall',  mineable: true,  placeable: false },
  6:  { name: 'Песок',         color: '#e8d68a', solid: false, kind: 'floor', mineable: false, placeable: true  },
  7:  { name: 'Вода',          color: '#3a7bd5', solid: true,  kind: 'floor', mineable: false, placeable: false },
  8:  { name: 'Цветы',         color: '#7fc95a', solid: false, kind: 'floor', mineable: false, placeable: true  },
  9:  { name: 'Высокая трава', color: '#4a9a3a', solid: false, kind: 'floor', mineable: false, placeable: true  },
  10: { name: 'Гравий',        color: '#8a8a7a', solid: false, kind: 'floor', mineable: false, placeable: true  },
};

// ID для удобства
const T_GRASS    = 0;
const T_DIRT     = 1;
const T_STONE    = 2;
const T_WALL     = 3;
const T_TREE     = 4;
const T_ROCK     = 5;
const T_SAND     = 6;
const T_WATER    = 7;
const T_FLOWERS  = 8;
const T_TALLGRASS = 9;
const T_GRAVEL   = 10;

// ------------------------------------------------------------
// SEEDED RNG (детерминированный мир)
// ------------------------------------------------------------
let _seed = 12345;

function resetSeed(s) {
  _seed = s;
}

function rng() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}

function rngInt(min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// ------------------------------------------------------------
// ЗАГРУЗКА ТЕКСТУР
// ------------------------------------------------------------
function loadTextures() {
  const promises = [];

  for (const [id, path] of Object.entries(TEXTURE_PATHS.tiles)) {
    promises.push(loadImage(`tile_${id}`, path));
  }
  promises.push(loadImage('player', TEXTURE_PATHS.player));

  return Promise.all(promises);
}

function loadImage(key, path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[key] = img;
      resolve();
    };
    img.onerror = () => {
      console.warn(`⚠️ Не удалось загрузить текстуру: ${path} — использую цветной квадрат`);
      resolve();
    };
    img.src = path;
  });
}

function getTileImage(id) {
  const img = images[`tile_${id}`];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

function getPlayerImage() {
  const img = images.player;
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

// ------------------------------------------------------------
// МИР
// ------------------------------------------------------------
const world = [];

function generateWorld() {
  resetSeed(12345);

  // 1) База — трава
  for (let y = 0; y < WORLD_H; y++) {
    world[y] = [];
    for (let x = 0; x < WORLD_W; x++) {
      world[y][x] = T_GRASS;
    }
  }

  // 2) Границы: 2 тайла воды + 2 тайла песка
  const WATER_THICK = 2;
  const SAND_THICK  = 2;

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const distToEdge = Math.min(x, y, WORLD_W - 1 - x, WORLD_H - 1 - y);

      if (distToEdge < WATER_THICK) {
        world[y][x] = T_WATER;
      } else if (distToEdge < WATER_THICK + SAND_THICK) {
        world[y][x] = T_SAND;
      }
    }
  }

  // 3) Пятна земли и камня
  for (let i = 0; i < 45; i++) {
    const cx = rngInt(6, WORLD_W - 7);
    const cy = rngInt(6, WORLD_H - 7);
    const r = rngInt(2, 4);
    const type = rng() < 0.5 ? T_DIRT : T_STONE;
    paintCircle(cx, cy, r, type, [T_GRASS]);
  }

  // 4) Пятна цветов и высокой травы
  for (let i = 0; i < 35; i++) {
    const cx = rngInt(6, WORLD_W - 7);
    const cy = rngInt(6, WORLD_H - 7);
    const r = rngInt(1, 3);
    const type = rng() < 0.5 ? T_FLOWERS : T_TALLGRASS;
    paintCircle(cx, cy, r, type, [T_GRASS]);
  }

  // 5) Пятна гравия
  for (let i = 0; i < 12; i++) {
    const cx = rngInt(8, WORLD_W - 9);
    const cy = rngInt(8, WORLD_H - 9);
    const r = rngInt(1, 2);
    paintCircle(cx, cy, r, T_GRAVEL, [T_GRASS, T_DIRT]);
  }

  // 6) Озёра (песчаный берег + вода)
  const lakes = [
    { x: 22, y: 14, r: 4 },
    { x: 72, y: 12, r: 5 },
    { x: 50, y: 38, r: 4 },
    { x: 82, y: 32, r: 5 },
    { x: 35, y: 22, r: 3 },
  ];

  for (const lake of lakes) {
    // Песчаный берег
    paintCircle(
      lake.x, lake.y, lake.r + 1, T_SAND,
      [T_GRASS, T_DIRT, T_STONE, T_FLOWERS, T_TALLGRASS, T_GRAVEL]
    );
    // Вода
    paintCircle(
      lake.x, lake.y, lake.r, T_WATER,
      [T_SAND, T_GRASS, T_DIRT, T_STONE, T_FLOWERS, T_TALLGRASS, T_GRAVEL]
    );
  }

  // 7) Рощи деревьев
  const treeClusters = [
    { x: 14, y: 8,  count: 6, spread: 3 },
    { x: 62, y: 10, count: 5, spread: 3 },
    { x: 40, y: 30, count: 5, spread: 3 },
    { x: 88, y: 20, count: 5, spread: 3 },
    { x: 20, y: 42, count: 4, spread: 3 },
    { x: 65, y: 42, count: 5, spread: 3 },
  ];

  for (const cluster of treeClusters) {
    for (let i = 0; i < cluster.count; i++) {
      const tx = cluster.x + rngInt(-cluster.spread, cluster.spread);
      const ty = cluster.y + rngInt(-cluster.spread, cluster.spread);
      if (tx < 5 || tx >= WORLD_W - 5 || ty < 5 || ty >= WORLD_H - 5) continue;
      const t = world[ty][tx];
      if (t === T_GRASS || t === T_DIRT || t === T_FLOWERS || t === T_TALLGRASS) {
        world[ty][tx] = T_TREE;
      }
    }
  }

  // 8) Россыпи валунов
  const rockFormations = [
    { x: 30, y: 10, r: 4 },
    { x: 78, y: 40, r: 5 },
    { x: 12, y: 35, r: 4 },
    { x: 55, y: 20, r: 3 },
  ];

  for (const form of rockFormations) {
    for (let y = form.y - form.r; y <= form.y + form.r; y++) {
      for (let x = form.x - form.r; x <= form.x + form.r; x++) {
        if (x < 5 || x >= WORLD_W - 5 || y < 5 || y >= WORLD_H - 5) continue;
        const d = (x - form.x) ** 2 + (y - form.y) ** 2;
        if (d <= form.r ** 2 && rng() < 0.35) {
          const t = world[y][x];
          if (t === T_GRASS || t === T_DIRT || t === T_STONE) {
            world[y][x] = T_ROCK;
          }
        }
      }
    }
  }
}

// Закрашивает круг, не трогая тайлы, которых нет в allowed
function paintCircle(cx, cy, r, type, allowed) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        if (allowed.includes(world[y][x])) {
          world[y][x] = type;
        }
      }
    }
  }
}

function isSolid(tx, ty) {
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return true;
  return TILES[world[ty][tx]].solid;
}

// ------------------------------------------------------------
// ИГРОК
// ------------------------------------------------------------
const player = {
  x: 12 * TILE,
  y: 12 * TILE,
  r: 11,
  vx: 0,
  vy: 0,
  facing: { x: 0, y: 1 },
};

// ------------------------------------------------------------
// ИНВЕНТАРЬ
// ------------------------------------------------------------
const inventory = new Array(INV_SIZE).fill(null);
let selectedSlot = 0;

function addToInventory(type, count = 1) {
  for (const slot of inventory) {
    if (slot && slot.type === type && slot.count < 99) {
      slot.count += count;
      return true;
    }
  }
  for (let i = 0; i < INV_SIZE; i++) {
    if (!inventory[i]) {
      inventory[i] = { type, count };
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------
// ВВОД
// ------------------------------------------------------------
const keys = {};
const mouse = { x: 0, y: 0, left: false, right: false };
let actionCooldown = 0;

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === ' ') e.preventDefault();

  if (e.key >= '1' && e.key <= '9') selectedSlot = +e.key - 1;
  if (e.key === '0') selectedSlot = 9;
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) mouse.left = true;
  if (e.button === 2) mouse.right = true;
  actionCooldown = 0;
  e.preventDefault();
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.left = false;
  if (e.button === 2) mouse.right = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
  selectedSlot = (selectedSlot + (e.deltaY > 0 ? 1 : -1) + INV_SIZE) % INV_SIZE;
  e.preventDefault();
}, { passive: false });

// ------------------------------------------------------------
// РЕСАЙЗ CANVAS
// ------------------------------------------------------------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);

// ------------------------------------------------------------
// КАМЕРА
// ------------------------------------------------------------
const camera = { x: 0, y: 0 };

function updateCamera() {
  const worldPxW = WORLD_W * TILE;
  const worldPxH = WORLD_H * TILE;

  let cx = player.x - canvas.width / 2;
  let cy = player.y - canvas.height / 2;

  if (worldPxW <= canvas.width) {
    cx = (worldPxW - canvas.width) / 2;
  } else {
    cx = Math.max(0, Math.min(worldPxW - canvas.width, cx));
  }

  if (worldPxH <= canvas.height) {
    cy = (worldPxH - canvas.height) / 2;
  } else {
    cy = Math.max(0, Math.min(worldPxH - canvas.height, cy));
  }

  camera.x = cx;
  camera.y = cy;
}

// ------------------------------------------------------------
// ФИЗИКА
// ------------------------------------------------------------
function updatePlayer() {
  let dx = 0, dy = 0;

  if (keys['a'] || keys['arrowleft'])  dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (keys['w'] || keys['arrowup'])    dy -= 1;
  if (keys['s'] || keys['arrowdown'])  dy += 1;

  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  player.vx = dx * MOVE_SPEED;
  player.vy = dy * MOVE_SPEED;

  if (dx !== 0 || dy !== 0) {
    player.facing.x = dx;
    player.facing.y = dy;
  }

  player.x += player.vx;
  resolveAxis('x');

  player.y += player.vy;
  resolveAxis('y');
}

function resolveAxis(axis) {
  const r = player.r;
  const minTX = Math.floor((player.x - r) / TILE);
  const maxTX = Math.floor((player.x + r) / TILE);
  const minTY = Math.floor((player.y - r) / TILE);
  const maxTY = Math.floor((player.y + r) / TILE);

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      if (!isSolid(tx, ty)) continue;

      const closestX = Math.max(tx * TILE, Math.min(player.x, tx * TILE + TILE));
      const closestY = Math.max(ty * TILE, Math.min(player.y, ty * TILE + TILE));

      const dx = player.x - closestX;
      const dy = player.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < r * r) {
        const dist = Math.sqrt(distSq) || 0.001;

        if (axis === 'x') {
          if (player.vx > 0) {
            player.x = tx * TILE - r;
          } else if (player.vx < 0) {
            player.x = tx * TILE + TILE + r;
          } else {
            player.x += (dx / dist) * (r - dist);
          }
          player.vx = 0;
        } else {
          if (player.vy > 0) {
            player.y = ty * TILE - r;
          } else if (player.vy < 0) {
            player.y = ty * TILE + TILE + r;
          } else {
            player.y += (dy / dist) * (r - dist);
          }
          player.vy = 0;
        }
      }
    }
  }
}

// ------------------------------------------------------------
// ВЗАИМОДЕЙСТВИЕ
// ------------------------------------------------------------
function mouseTile() {
  return {
    tx: Math.floor((mouse.x + camera.x) / TILE),
    ty: Math.floor((mouse.y + camera.y) / TILE),
  };
}

function inReach(tx, ty) {
  const tcx = tx * TILE + TILE / 2;
  const tcy = ty * TILE + TILE / 2;
  const dx = tcx - player.x;
  const dy = tcy - player.y;
  return dx * dx + dy * dy <= (REACH * TILE) ** 2;
}

function tryMine() {
  const { tx, ty } = mouseTile();
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return false;
  if (!inReach(tx, ty)) return false;

  const id = world[ty][tx];
  const def = TILES[id];
  if (!def.mineable) return false;

  addToInventory(id, 1);
  world[ty][tx] = T_DIRT;
  return true;
}

function tryPlace() {
  const { tx, ty } = mouseTile();
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return false;
  if (!inReach(tx, ty)) return false;

  const targetDef = TILES[world[ty][tx]];
  if (!targetDef.placeable) return false;

  const slot = inventory[selectedSlot];
  if (!slot) return false;

  const tcx = tx * TILE + TILE / 2;
  const tcy = ty * TILE + TILE / 2;
  const dx = tcx - player.x;
  const dy = tcy - player.y;
  const minDist = player.r + TILE / 2;
  if (dx * dx + dy * dy < minDist * minDist) return false;

  world[ty][tx] = slot.type;
  slot.count--;
  if (slot.count <= 0) inventory[selectedSlot] = null;
  return true;
}

function updateInteraction() {
  if (actionCooldown > 0) {
    actionCooldown--;
    return;
  }
  if (mouse.left) {
    if (tryMine()) actionCooldown = ACTION_COOLDOWN;
  } else if (mouse.right) {
    if (tryPlace()) actionCooldown = ACTION_COOLDOWN;
  }
}

// ------------------------------------------------------------
// РЕНДЕР
// ------------------------------------------------------------
function render() {
  // Фон (для случаев, когда мир меньше окна)
  ctx.fillStyle = '#0e0e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sx = Math.max(0, Math.floor(camera.x / TILE));
  const ex = Math.min(WORLD_W - 1, Math.ceil((camera.x + canvas.width) / TILE));
  const sy = Math.max(0, Math.floor(camera.y / TILE));
  const ey = Math.min(WORLD_H - 1, Math.ceil((camera.y + canvas.height) / TILE));

  // 1) Пол (трава, земля, камень, песок, вода, цветы, трава, гравий)
  for (let ty = sy; ty <= ey; ty++) {
    for (let tx = sx; tx <= ex; tx++) {
      const id = world[ty][tx];
      const def = TILES[id];
      if (def.kind !== 'floor') continue;
      drawFloor(id, tx, ty, def);
    }
  }

  // 2) Сетка поверх пола (только не поверх воды)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  for (let ty = sy; ty <= ey; ty++) {
    for (let tx = sx; tx <= ex; tx++) {
      const id = world[ty][tx];
      if (id === T_WATER) continue;
      ctx.strokeRect(
        tx * TILE - camera.x + 0.5,
        ty * TILE - camera.y + 0.5,
        TILE - 1,
        TILE - 1
      );
    }
  }

  // 3) Стены / объекты (деревья, валуны, стены)
  for (let ty = sy; ty <= ey; ty++) {
    for (let tx = sx; tx <= ex; tx++) {
      const id = world[ty][tx];
      const def = TILES[id];
      if (def.kind !== 'wall') continue;
      drawWall(id, tx, ty, def);
    }
  }

  // 4) Подсветка тайла под курсором
  const { tx, ty } = mouseTile();
  if (inReach(tx, ty) && tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx * TILE - camera.x, ty * TILE - camera.y, TILE, TILE);
  }

  // 5) Игрок
  renderPlayer();

  // 6) Интерфейс
  renderInventory();
}

// --- Отрисовка пола (включая воду с анимацией) ---
function drawFloor(id, tx, ty, def) {
  const px = tx * TILE - camera.x;
  const py = ty * TILE - camera.y;

  // Вода — особая отрисовка
  if (id === T_WATER) {
    drawWater(px, py, tx, ty);
    return;
  }

  const img = getTileImage(id);
  if (img) {
    ctx.drawImage(img, px, py, TILE, TILE);
  } else {
    ctx.fillStyle = def.color;
    ctx.fillRect(px, py, TILE, TILE);

    // Цветы и высокая трава — рисуем маленькие точки как намёк
    if (id === T_FLOWERS) {
      ctx.fillStyle = 'rgba(255, 200, 50, 0.9)';
      ctx.beginPath();
      ctx.arc(px + 10, py + 12, 2.5, 0, Math.PI * 2);
      ctx.arc(px + 22, py + 18, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 100, 150, 0.9)';
      ctx.beginPath();
      ctx.arc(px + 16, py + 24, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === T_TALLGRASS) {
      ctx.strokeStyle = 'rgba(30, 80, 30, 0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const gx = px + 8 + i * 8;
        ctx.beginPath();
        ctx.moveTo(gx, py + TILE - 4);
        ctx.lineTo(gx + 2, py + 10);
        ctx.stroke();
      }
    } else if (id === T_GRAVEL) {
      ctx.fillStyle = 'rgba(60, 60, 60, 0.5)';
      for (let i = 0; i < 5; i++) {
        const gx = px + 4 + (i * 7) % (TILE - 8);
        const gy = py + 4 + ((i * 11) % (TILE - 8));
        ctx.fillRect(gx, gy, 3, 3);
      }
    }
  }
}

// --- Вода с лёгкой анимацией волн ---
function drawWater(px, py, tx, ty) {
  const img = getTileImage(T_WATER);

  // База — синий тайл
  if (img) {
    ctx.drawImage(img, px, py, TILE, TILE);
  } else {
    ctx.fillStyle = '#3a7bd5';
    ctx.fillRect(px, py, TILE, TILE);

    // Тёмная полоска внизу (глубина)
    ctx.fillStyle = 'rgba(0, 0, 60, 0.18)';
    ctx.fillRect(px, py + TILE * 0.65, TILE, TILE * 0.35);
  }

  // Волны — анимация по фазе
  const t = performance.now() / 1000;
  const phase = t * 1.6 + tx * 0.4 + ty * 0.7;
  const offset = Math.sin(phase) * 2.5;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(px + 4 + offset, py + 10, TILE - 12, 2);
  ctx.fillRect(px + 8 - offset, py + 22, TILE - 18, 2);
}

// --- Стены / объекты ---
function drawWall(id, tx, ty, def) {
  const px = tx * TILE - camera.x;
  const py = ty * TILE - camera.y;

  // Тень под объектом
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(px + 3, py + 3, TILE, TILE);

  const img = getTileImage(id);
  if (img) {
    ctx.drawImage(img, px, py, TILE, TILE);
  } else {
    ctx.fillStyle = def.color;
    ctx.fillRect(px, py, TILE, TILE);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px, py, TILE, 4);

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  }
}

// --- Игрок ---
function renderPlayer() {
  const px = player.x - camera.x;
  const py = player.y - camera.y;

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(px, py + 6, player.r + 2, player.r - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const img = getPlayerImage();
  if (img) {
    const size = TILE;
    ctx.drawImage(img, px - size / 2, py - size / 2, size, size);
  } else {
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(px, py, player.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#aa3333';
    ctx.lineWidth = 2;
    ctx.stroke();

    const fx = player.facing.x;
    const fy = player.facing.y;
    const eyeX = px + fx * 5;
    const eyeY = py + fy * 5;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(eyeX + fx * 1.2, eyeY + fy * 1.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Инвентарь ---
function renderInventory() {
  const slotSize = 48;
  const gap = 6;
  const totalW = INV_SIZE * slotSize + (INV_SIZE - 1) * gap;
  const startX = (canvas.width - totalW) / 2;
  const startY = canvas.height - slotSize - 14;

  for (let i = 0; i < INV_SIZE; i++) {
    const x = startX + i * (slotSize + gap);
    const y = startY;

    ctx.fillStyle = i === selectedSlot ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, slotSize, slotSize);

    ctx.strokeStyle = i === selectedSlot ? '#ffd700' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = i === selectedSlot ? 3 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, slotSize - 1, slotSize - 1);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(i === 9 ? '0' : String(i + 1), x + 4, y + 12);

    const slot = inventory[i];
    if (slot) {
      const img = getTileImage(slot.type);
      const innerSize = slotSize - 16;
      const ix = x + 8;
      const iy = y + 8;

      if (img) {
        ctx.drawImage(img, ix, iy, innerSize, innerSize);
      } else {
        ctx.fillStyle = TILES[slot.type].color;
        ctx.fillRect(ix, iy, innerSize, innerSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(ix + 0.5, iy + 0.5, innerSize - 1, innerSize - 1);
      }

      if (slot.count > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(String(slot.count), x + slotSize - 5, y + slotSize - 5);
        ctx.textAlign = 'left';
      }
    }
  }

  const sel = inventory[selectedSlot];
  if (sel) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(startX, startY - 28, 180, 22);

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(TILES[sel.type].name, startX + 8, startY - 12);
  }
}

// ------------------------------------------------------------
// ИГРОВОЙ ЦИКЛ
// ------------------------------------------------------------
function update() {
  updatePlayer();
  updateInteraction();
  updateCamera();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------
// СТАРТ
// ------------------------------------------------------------
async function start() {
  resizeCanvas();
  generateWorld();
  await loadTextures();

  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');

  loop();
}

start();