// ============================================================
//  textures.js — загрузка PNG и низкоуровневая отрисовка
// ============================================================

const TEX_BASE = 'Materials/PNG Textures/';

const TEXTURE_PATHS = {
  missing: TEX_BASE + 'missing.png',
  dirt:    TEX_BASE + 'dirt.png',
  stone:   TEX_BASE + 'stone.png',
  bedrock: TEX_BASE + 'bedrock.png',

  // Иконка травы (используется как оверлей поверх dirt)
  grass:   TEX_BASE + 'grass.png',

  // Кирка и искры
  pickaxeIron: TEX_BASE + 'pickaxe_iron.png',
  spark:       TEX_BASE + 'spark.png',

  // Прочее
  frame:        TEX_BASE + 'frame.png',
  cracks:       TEX_BASE + 'cracks.png',

  // Персонаж
  playerStand: TEX_BASE + 'player_stand.png',
  playerJump:  TEX_BASE + 'player_jump.png',
  playerWalk:  TEX_BASE + 'player_walk.png',
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
  keysArr.forEach((key, i) => { textures[key] = images[i] || textures.missing; });
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
  const tex = textures[name];
  if (!tex || !tex.complete || tex.naturalWidth === 0) {
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    return;
  }
  const imgW = tex.naturalWidth, imgH = tex.naturalHeight;
  const scale = Math.max(VIEW_WIDTH / imgW, VIEW_HEIGHT / imgH);
  const dw = imgW * scale, dh = imgH * scale;
  ctx.drawImage(tex, (VIEW_WIDTH - dw) / 2, (VIEW_HEIGHT - dh) / 2, dw, dh);
}