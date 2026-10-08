// ============================================================
//  textures.js — загрузка PNG и низкоуровневая отрисовка
// ============================================================

const TEX_BASE = 'Materials/PNG Textures/';

const TEXTURE_PATHS = {
  missing: TEX_BASE + 'missing.png',

  // Блоки
  dirt:    TEX_BASE + 'dirt.png',
  stone:   TEX_BASE + 'stone.png',
  bedrock: TEX_BASE + 'bedrock.png',

  // Стены
  dirt_wall:    TEX_BASE + 'dirt_wall.png',
  stone_wall:   TEX_BASE + 'stone_wall.png',
  bedrock_wall: TEX_BASE + 'bedrock_wall.png',

  // Трава
  grass:   TEX_BASE + 'grass.png',

  // Природа
  log:     TEX_BASE + 'log.png',
  leaves:  TEX_BASE + 'leaves.png',
  sapling: TEX_BASE + 'sapling.png',

  // Руды
  coal_ore: TEX_BASE + 'coal_ore.png',
  iron_ore: TEX_BASE + 'iron_ore.png',

  // Персонаж
  playerStand: TEX_BASE + 'player_stand.png',
  playerJump:  TEX_BASE + 'player_jump.png',
  playerWalk:  TEX_BASE + 'player_walk.png',

  // Кирка и искры
  pickaxeIron: TEX_BASE + 'pickaxe_iron.png',
  spark:       TEX_BASE + 'spark.png',

  // Вода
  water:       TEX_BASE + 'water.png',

  // Сущности
  salmon:      TEX_BASE + 'salmon.png',

  // Предметы
  salmon_raw:  TEX_BASE + 'salmon_raw.png',

  // Прочее
  frame:        TEX_BASE + 'frame.png',
  cracks:       TEX_BASE + 'cracks.png',
  logo:         TEX_BASE + 'logo.png',
  menuBg:       TEX_BASE + 'background.png',
  autosaveIcon: TEX_BASE + 'save.png',
};

const textures = {};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload  = () => resolve(img);
    img.onerror = () => { console.warn(`Не загружено: ${src}`); resolve(null); };
  });
}

async function loadAllTextures() {
  textures.missing = await loadImage(TEXTURE_PATHS.missing);

  const keysArr = Object.keys(TEXTURE_PATHS).filter(k => k !== 'missing');
  const images = await Promise.all(keysArr.map(k => loadImage(TEXTURE_PATHS[k])));
  keysArr.forEach((key, i) => {
    textures[key] = images[i] || textures.missing;
  });

  console.log('Текстуры загружены');
}

function drawTexture(name, x, y, w, h) {
  const tex = textures[name];
  if (tex && tex.complete && tex.naturalWidth > 0) ctx.drawImage(tex, x, y, w, h);
}

function drawTextureIfExists(name, x, y, w, h) {
  const tex = textures[name];
  if (!tex || !tex.complete || tex.naturalWidth === 0) return false;
  if (tex === textures.missing) return false;
  ctx.drawImage(tex, x, y, w, h);
  return true;
}

function drawTextureAlpha(name, x, y, w, h, alpha) {
  const tex = textures[name];
  if (!tex || !tex.complete || tex.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(tex, x, y, w, h);
  ctx.restore();
}

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

function drawBackgroundCover(name) {
  const W = UI_W;
  const H = UI_H;

  const tex = textures[name];
  if (!tex || !tex.complete || tex.naturalWidth === 0) {
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const imgW = tex.naturalWidth, imgH = tex.naturalHeight;
  const scale = Math.max(W / imgW, H / imgH);
  const dw = imgW * scale, dh = imgH * scale;
  ctx.drawImage(tex, (W - dw) / 2, (H - dh) / 2, dw, dh);
}