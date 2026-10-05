// ============================================================
//  ui.js — все экраны и оверлеи: меню, настройки, пауза, модалка
// ============================================================

// ------------------------------------------------------------
// ПЕРЕХОДЫ МЕЖДУ СОСТОЯНИЯМИ
// ------------------------------------------------------------
function openSettings(from) {
  settingsReturnTo = from;
  gameState = 'settings';
  waitingForKey = null;
  activeMenuButtonIndex = 0;
}

function closeSettings() {
  gameState = settingsReturnTo;
  waitingForKey = null;
  activeMenuButtonIndex = 0;
}

function startPause() {
  gameState = 'paused';
  inventoryOpen = false;
  activeMenuButtonIndex = 0;
}

function resumeGame() {
  gameState = 'playing';
  lastTime = 0;
  accumulator = 0;
  activeMenuButtonIndex = 0;
}

function goToMainMenu() {
  gameState = 'main_menu';
  inventoryOpen = false;
  confirmDialog = null;
  activeMenuButtonIndex = 0;
}

function requestQuitToMainMenu() {
  if (!hasUnsavedChanges) { goToMainMenu(); return; }
  confirmDialog = {
    text: 'Выйти без сохранения?',
    onYes: () => { confirmDialog = null; goToMainMenu(); },
    onNo:  () => { confirmDialog = null; activeMenuButtonIndex = 0; },
  };
}

// ------------------------------------------------------------
// UI-ЭЛЕМЕНТЫ — конструкторы
// ------------------------------------------------------------
function clearUI() { uiElements = []; }

function addButton(x, y, w, h, label, action, opts) {
  opts = opts || {};
  const el = { kind: 'button', x, y, w, h, label, action, enabled: opts.enabled !== false };
  uiElements.push(el);
  return el;
}

function addTextButton(x, y, w, h, label, action, opts) {
  opts = opts || {};
  const el = {
    kind: 'textButton',
    x, y, w, h, label, action,
    enabled: opts.enabled !== false,
    fontSize: opts.fontSize || 26,
  };
  uiElements.push(el);
  return el;
}

function addKeyBadge(x, y, w, h, label, action) {
  const el = { kind: 'keyBadge', x, y, w, h, label, action };
  uiElements.push(el);
  return el;
}

function addToggle(x, y, w, h, label, value, action) {
  const el = { kind: 'toggle', x, y, w, h, label, value, action };
  uiElements.push(el);
  return el;
}

function addCycle(x, y, w, h, label, value, action) {
  const el = { kind: 'cycle', x, y, w, h, label, value, action };
  uiElements.push(el);
  return el;
}

function findUIAt(mx, my) {
  for (let i = uiElements.length - 1; i >= 0; i--) {
    const e = uiElements[i];
    if (mx >= e.x && mx < e.x + e.w && my >= e.y && my < e.y + e.h) return e;
  }
  return null;
}

function getNavigableButtons() {
  return uiElements.filter(e =>
    e.kind === 'button' || e.kind === 'textButton' ||
    e.kind === 'toggle' || e.kind === 'cycle'
  );
}

// ------------------------------------------------------------
// UI-ЭЛЕМЕНТЫ — отрисовка
// ------------------------------------------------------------
function drawButton(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);
  const disabled = !el.enabled;

  let bg = 'rgba(40, 40, 50, 0.9)';
  if (disabled) bg = 'rgba(30, 30, 35, 0.6)';
  else if (isActive || hovered) bg = 'rgba(70, 70, 90, 0.95)';

  ctx.fillStyle = bg;
  ctx.fillRect(el.x, el.y, el.w, el.h);

  ctx.lineWidth = 2;
  if (isActive) ctx.strokeStyle = '#ffd54a';
  else if (disabled) ctx.strokeStyle = '#333';
  else if (hovered) ctx.strokeStyle = '#aaa';
  else ctx.strokeStyle = '#666';
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);

  ctx.fillStyle = disabled ? '#666' : '#fff';
  ctx.font = '18px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.label, el.x + el.w / 2, el.y + el.h / 2);
}

function drawTextButton(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);
  const disabled = !el.enabled;

  let color = '#fff';
  if (disabled) color = '#666';
  else if (isActive || hovered) color = '#ffd54a';

  ctx.font = el.fontSize + 'px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillText(el.label, el.x + el.w / 2 + 2, el.y + el.h / 2 + 2);

  ctx.fillStyle = color;
  ctx.fillText(el.label, el.x + el.w / 2, el.y + el.h / 2);
}

function drawKeyBadge(el) {
  const hovered = (hoveredButton === el);
  ctx.fillStyle = hovered ? 'rgba(90, 90, 110, 0.95)' : 'rgba(50, 50, 60, 0.9)';
  ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.strokeStyle = hovered ? '#ffd54a' : '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(el.x + 0.5, el.y + 0.5, el.w - 1, el.h - 1);
  ctx.fillStyle = '#fff';
  ctx.font = '12px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.label, el.x + el.w / 2, el.y + el.h / 2);
}

function drawToggle(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);

  ctx.fillStyle = (isActive || hovered) ? 'rgba(70, 70, 90, 0.95)' : 'rgba(40, 40, 50, 0.9)';
  ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.strokeStyle = isActive ? '#ffd54a' : (hovered ? '#aaa' : '#666');
  ctx.lineWidth = 2;
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);

  ctx.fillStyle = '#fff';
  ctx.font = '16px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((el.value ? '[X]  ' : '[ ]  ') + el.label, el.x + 12, el.y + el.h / 2);
}

function drawCycle(el) {
  const hovered = (hoveredButton === el);
  const nav = getNavigableButtons();
  const isActive = (nav[activeMenuButtonIndex] === el);

  ctx.fillStyle = (isActive || hovered) ? 'rgba(70, 70, 90, 0.95)' : 'rgba(40, 40, 50, 0.9)';
  ctx.fillRect(el.x, el.y, el.w, el.h);
  ctx.strokeStyle = isActive ? '#ffd54a' : (hovered ? '#aaa' : '#666');
  ctx.lineWidth = 2;
  ctx.strokeRect(el.x + 1, el.y + 1, el.w - 2, el.h - 2);

  ctx.fillStyle = '#fff';
  ctx.font = '16px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.label, el.x + 12, el.y + el.h / 2);
  ctx.textAlign = 'right';
  ctx.fillText('◄ ' + el.value + ' ►', el.x + el.w - 12, el.y + el.h / 2);
}

function drawUI() {
  hoveredButton = findUIAt(mouse.x, mouse.y);

  if (hoveredButton) {
    const nav = getNavigableButtons();
    const idx = nav.indexOf(hoveredButton);
    if (idx >= 0) activeMenuButtonIndex = idx;
  }

  for (const el of uiElements) {
    if (el.kind === 'button')          drawButton(el);
    else if (el.kind === 'textButton') drawTextButton(el);
    else if (el.kind === 'keyBadge')   drawKeyBadge(el);
    else if (el.kind === 'toggle')     drawToggle(el);
    else if (el.kind === 'cycle')      drawCycle(el);
  }
}

// ------------------------------------------------------------
// БИНДЫ (навигация в меню)
// ------------------------------------------------------------
function wasActionJustPressed(context, actionId) {
  const arr = settings.bindings[context][actionId];
  if (arr) {
    for (const code of arr) if (justPressedKeys.has(code)) return true;
  }
  if (context === 'menu') {
    if (actionId === 'menu_up' &&
        (justPressedKeys.has('KeyW') || justPressedKeys.has('ArrowUp')))    return true;
    if (actionId === 'menu_down' &&
        (justPressedKeys.has('KeyS') || justPressedKeys.has('ArrowDown')))  return true;
    if (actionId === 'confirm' &&
        (justPressedKeys.has('Enter') || justPressedKeys.has('Space')))     return true;
  }
  return false;
}

// ------------------------------------------------------------
// КИРКА В ГЛАВНОМ МЕНЮ
// ------------------------------------------------------------

// Easing из CSS: cubic-bezier(0.34, 1.56, 0.64, 1)
function cubicBezierEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x1 = 0.34, y1 = 1.56, x2 = 0.64, y2 = 1.00;
  function sampleX(u) { return 3*(1-u)*(1-u)*u*x1 + 3*(1-u)*u*u*x2 + u*u*u; }
  function sampleY(u) { return 3*(1-u)*(1-u)*u*y1 + 3*(1-u)*u*u*y2 + u*u*u; }
  let lo = 0, hi = 1;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (sampleX(mid) < t) lo = mid; else hi = mid;
  }
  return sampleY((lo + hi) / 2);
}

// Keyframes из CSS:
//   0%   scale: 1    rotate: 0
//   15%  scale: 0.97 rotate: -28
//   45%  scale: 1.07 rotate: 12
//   60%  scale: 1.02 rotate: -3
//   80%  scale: 1.04 rotate: 2
//   100% scale: 1    rotate: 0
const PICKAXE_KEYFRAMES = [
  { t: 0.00, angle: 0,   scale: 1.00 },
  { t: 0.15, angle: -28, scale: 0.97 },
  { t: 0.45, angle: 12,  scale: 1.07 },
  { t: 0.60, angle: -3,  scale: 1.02 },
  { t: 0.80, angle: 2,   scale: 1.04 },
  { t: 1.00, angle: 0,   scale: 1.00 },
];

function getPickaxeTransform(t) {
  if (t <= 0) return { angle: 0, scale: 1 };
  if (t >= 1) return { angle: 0, scale: 1 };
  for (let i = 0; i < PICKAXE_KEYFRAMES.length - 1; i++) {
    const a = PICKAXE_KEYFRAMES[i];
    const b = PICKAXE_KEYFRAMES[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (b.t === a.t) ? 0 : (t - a.t) / (b.t - a.t);
      return {
        angle: a.angle + (b.angle - a.angle) * k,
        scale: a.scale + (b.scale - a.scale) * k,
      };
    }
  }
  return { angle: 0, scale: 1 };
}

function getPickaxeRect() {
  const SIZE = PICKAXE_SIZE;
  return {
    x: (VIEW_WIDTH - SIZE) / 2,
    y: PICKAXE_Y,
    w: SIZE,
    h: SIZE,
  };
}

function getTitleRect() {
  ctx.font = TITLE_FONT_SIZE + 'px ' + FONT_FAMILY;
  const w = ctx.measureText('Dig-Pick').width;
  const titleY = PICKAXE_Y + PICKAXE_SIZE + TITLE_Y_OFFSET;
  return {
    x: (VIEW_WIDTH - w) / 2 - 12,
    y: titleY - 6,
    w: w + 24,
    h: TITLE_FONT_SIZE + 12,
  };
}

function isPickaxeHovered() {
  const r = getPickaxeRect();
  return mouse.x >= r.x && mouse.x < r.x + r.w &&
         mouse.y >= r.y && mouse.y < r.y + r.h;
}

function isTitleHovered() {
  const r = getTitleRect();
  return mouse.x >= r.x && mouse.x < r.x + r.w &&
         mouse.y >= r.y && mouse.y < r.y + r.h;
}

function triggerPickaxeAnim() {
  pickaxeAnimStart = performance.now();
  spawnPickaxeSparks();
}

function spawnPickaxeSparks() {
  const pr = getPickaxeRect();

  // Точка спавна — как ты задавал ранее
  const TIP_OFFSET_X = 0;
  const TIP_OFFSET_Y = 0.3;

  const tipX = pr.x + pr.w * TIP_OFFSET_X;
  const tipY = pr.y + pr.h * TIP_OFFSET_Y;

  const count = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    // Разлёт как в CSS-файле: -30°..+210°
    const angleDeg = -30 + Math.random() * 240;
    const angleRad = angleDeg * Math.PI / 90;
    const dist = 30 + Math.random() * 60;
    const life = 0.3;

    pickaxeSparks.push({
      x: tipX,
      y: tipY,
      vx: Math.cos(angleRad) * dist / life,
      vy: Math.sin(angleRad) * dist / life,
      life, maxLife: life,
      size: 4 + Math.random() * 4,
    });
  }
}

function drawPickaxe(now) {
  const pr = getPickaxeRect();

  let angle = 0;
  let scale = 1;

  if (pickaxeAnimStart > 0) {
    const dt = now - pickaxeAnimStart;
    if (dt < PICKAXE_ANIM_DURATION) {
      const linearT = dt / PICKAXE_ANIM_DURATION;
      const easedT  = cubicBezierEase(linearT);
      const tr = getPickaxeTransform(easedT);
      angle = tr.angle;
      scale = tr.scale;
    } else {
      pickaxeAnimStart = 0;
    }
  }

  // Точка вращения — как в CSS: 50% 70%
  const cx = pr.x + pr.w * 0.5;
  const cy = pr.y + pr.h * 0.7;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle * Math.PI / 180);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawTexture('pickaxeIron', pr.x, pr.y, pr.w, pr.h);
  ctx.restore();
}

function drawPickaxeTitle() {
  const tr = getTitleRect();
  const hovered = isTitleHovered();

  ctx.font = TITLE_FONT_SIZE + 'px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = tr.x + tr.w / 2;
  const cy = tr.y + tr.h / 2;

  // Тень для читаемости
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText('Dig-Pick', cx + 2, cy + 2);

  // Основной текст
  ctx.fillStyle = hovered ? '#ffd54a' : '#fff';
  ctx.fillText('Dig-Pick', cx, cy);
}

function drawSparks(now) {
  if (gameState !== 'main_menu') {
    if (pickaxeSparks.length) pickaxeSparks = [];
    pickaxeSparkLastFrame = 0;
    return;
  }

  if (pickaxeSparks.length === 0) {
    pickaxeSparkLastFrame = 0;
    return;
  }

  const dt = pickaxeSparkLastFrame === 0
    ? 0.016
    : Math.min(0.05, (now - pickaxeSparkLastFrame) / 1000);
  pickaxeSparkLastFrame = now;

  for (let i = pickaxeSparks.length - 1; i >= 0; i--) {
    const s = pickaxeSparks[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    // Плавное замедление к концу жизни (аналог easing в CSS)
    s.vx *= (1 - 1.5 * dt);
    s.vy *= (1 - 1.5 * dt);
    s.life -= dt;

    if (s.life <= 0) { pickaxeSparks.splice(i, 1); continue; }

    const alpha = Math.max(0, s.life / s.maxLife);
    const size  = s.size * (0.4 + alpha * 0.6);
    drawTextureAlpha('spark', s.x - size/2, s.y - size/2, size, size, alpha);
  }
}

// ------------------------------------------------------------
// ЭКРАН: ГЛАВНОЕ МЕНЮ
// ------------------------------------------------------------
function buildMainMenuUI() {
  clearUI();

  // Позиция кнопок — под киркой и заголовком
  const pickaxeBottom = PICKAXE_Y + PICKAXE_SIZE;
  const titleBottom   = pickaxeBottom + TITLE_Y_OFFSET + TITLE_FONT_SIZE;

  const btnW = 380;
  const btnH = 44;
  const bx = (VIEW_WIDTH - btnW) / 2;
  let by = titleBottom + 50;

  const info = getSaveInfo();
  if (info) {
    addTextButton(bx, by, btnW, btnH, 'Играть', () => continueGame());
    by += btnH;

    addTextButton(bx, by, btnW, 22,
      `Удалить сохранение (${info.savedAtDisplay})`,
      () => {
        confirmDialog = {
          text: 'Удалить сохранение?',
          onYes: () => { deleteSave(); confirmDialog = null; activeMenuButtonIndex = 0; },
          onNo:  () => { confirmDialog = null; activeMenuButtonIndex = 0; },
        };
      },
      { fontSize: 13 }
    );
    by += 28;
  } else {
    addTextButton(bx, by, btnW, btnH, 'Играть', () => startNewGame());
    by += btnH + 6;
  }

  addTextButton(bx, by, btnW, btnH, 'Настройки', () => openSettings('main_menu'));
}

function drawMainMenu(now) {
  drawBackgroundCover('menuBg');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Порядок: кирка → заголовок → кнопки → искры поверх всего
  drawPickaxe(now);
  drawPickaxeTitle();
  buildMainMenuUI();
  drawUI();
  drawSparks(now);
}

// ------------------------------------------------------------
// ЭКРАН: НАСТРОЙКИ
// ------------------------------------------------------------
function drawBindList(x, y, w, lineH, context, actions) {
  ctx.textBaseline = 'middle';
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const rowY = y + i * lineH;

    ctx.fillStyle = '#ccc';
    ctx.font = '14px ' + FONT_FAMILY;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.label + ':', x, rowY + lineH / 2);

    const codes = settings.bindings[context][a.id] || [];
    let bx = x + 170;
    const badgeH = 20;
    const badgeY = rowY + (lineH - badgeH) / 2;

    for (let k = 0; k < codes.length; k++) {
      const code = codes[k];
      const label = keyCodeToLabel(code);
      const badgeW = Math.max(28, label.length * 8 + 12);

      const isWaiting = waitingForKey
        && waitingForKey.context === context
        && waitingForKey.actionId === a.id
        && waitingForKey.slot === k;

      if (isWaiting) {
        ctx.fillStyle = '#5a3a00';
        ctx.fillRect(bx, badgeY, badgeW, badgeH);
        ctx.strokeStyle = '#ffd54a';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1);
        ctx.fillStyle = '#ffd54a';
        ctx.font = '11px ' + FONT_FAMILY;
        ctx.textAlign = 'center';
        ctx.fillText('...', bx + badgeW / 2, badgeY + badgeH / 2);
      } else {
        addKeyBadge(bx, badgeY, badgeW, badgeH, label, () => unbindKey(context, a.id, code));
      }
      bx += badgeW + 4;
    }

    const addW = 24;
    const isWaitingAdd = waitingForKey
      && waitingForKey.context === context
      && waitingForKey.actionId === a.id
      && waitingForKey.slot === -1;

    if (isWaitingAdd) {
      ctx.fillStyle = '#5a3a00';
      ctx.fillRect(bx, badgeY, addW, badgeH);
      ctx.strokeStyle = '#ffd54a';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 0.5, badgeY + 0.5, addW - 1, badgeH - 1);
      ctx.fillStyle = '#ffd54a';
      ctx.font = '11px ' + FONT_FAMILY;
      ctx.textAlign = 'center';
      ctx.fillText('...', bx + addW / 2, badgeY + badgeH / 2);
    } else {
      addKeyBadge(bx, badgeY, addW, badgeH, '+', () => {
        waitingForKey = { context, actionId: a.id, slot: -1 };
      });
    }
  }
}

function buildSettingsUI() {
  clearUI();

  const panelW = Math.min(900, VIEW_WIDTH - 60);
  const panelH = Math.min(600, VIEW_HEIGHT - 60);
  const panelX = (VIEW_WIDTH - panelW) / 2;
  const panelY = (VIEW_HEIGHT - panelH) / 2;

  ctx.fillStyle = 'rgba(10, 10, 15, 0.92)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = '#fff';
  ctx.font = '28px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('НАСТРОЙКИ', VIEW_WIDTH / 2, panelY + 16);

  const topY = panelY + 70;
  const rowH = 36;
  const colX = panelX + 30;

  const autosaveLabel = AUTOSAVE_OPTIONS.find(o => o.value === settings.autosaveInterval);
  addCycle(colX, topY, 320, rowH, 'Автосейв:', autosaveLabel ? autosaveLabel.label : 'Выкл',
    () => {
      const idx = AUTOSAVE_OPTIONS.findIndex(o => o.value === settings.autosaveInterval);
      settings.autosaveInterval = AUTOSAVE_OPTIONS[(idx + 1) % AUTOSAVE_OPTIONS.length].value;
      saveSettings();
    });

  addToggle(colX + 340, topY, 320, rowH, 'Показывать FPS', settings.showFPS,
    () => { settings.showFPS = !settings.showFPS; saveSettings(); });

  addToggle(colX, topY + rowH + 8, 320, rowH, 'Подсказки управления', settings.showHints,
    () => { settings.showHints = !settings.showHints; saveSettings(); });

  addCycle(colX, topY + (rowH + 8) * 2, 320, rowH, 'Чат на экране:',
    (settings.chatDuration || 5) + ' сек',
    () => {
      const opts = [0, 3, 5, 10];
      const cur = settings.chatDuration !== undefined ? settings.chatDuration : 5;
      const idx = opts.indexOf(cur);
      settings.chatDuration = opts[(idx + 1) % opts.length];
      saveSettings();
    });

  const bindY0 = topY + (rowH + 8) * 3 + 20;
  ctx.fillStyle = '#ffd54a';
  ctx.font = '18px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const colLeftX  = panelX + 30;
  const colRightX = panelX + panelW / 2 + 10;
  const colW = panelW / 2 - 40;

  ctx.fillText('УПРАВЛЕНИЕ (игра)', colLeftX, bindY0);
  ctx.fillText('УПРАВЛЕНИЕ (меню)', colRightX, bindY0);

  const listY0 = bindY0 + 26;
  const lineH = 28;

  drawBindList(colLeftX, listY0, colW, lineH, 'game', GAME_ACTIONS);
  drawBindList(colRightX, listY0, colW, lineH, 'menu', MENU_ACTIONS);

  const bottomY = panelY + panelH - 60;
  const btnW = 220, btnH = 40;

  addButton(panelX + 30, bottomY, btnW, btnH, 'Сбросить управление', () => {
    confirmDialog = {
      text: 'Сбросить управление?',
      onYes: () => {
        settings.bindings = defaultSettings().bindings;
        saveSettings();
        confirmDialog = null;
        activeMenuButtonIndex = 0;
      },
      onNo: () => { confirmDialog = null; activeMenuButtonIndex = 0; },
    };
  });

  addButton(panelX + panelW - 30 - btnW, bottomY, btnW, btnH, 'Назад', () => closeSettings());
}

function drawSettings() {
  drawBackgroundCover('menuBg');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  buildSettingsUI();
  drawUI();

  if (waitingForKey) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '24px ' + FONT_FAMILY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Нажмите клавишу...', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 20);
    ctx.font = '16px ' + FONT_FAMILY;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Esc — отмена', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 20);
  }
}

// ------------------------------------------------------------
// ЭКРАН: ПАУЗА
// ------------------------------------------------------------
let pauseSaveLabelUntil = 0;

function buildPauseMenuUI() {
  clearUI();

  const panelW = 360, panelH = 320;
  const panelX = (VIEW_WIDTH - panelW) / 2;
  const panelY = (VIEW_HEIGHT - panelH) / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = '#fff';
  ctx.font = '24px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('ПАУЗА', VIEW_WIDTH / 2, panelY + 16);

  const btnW = panelW - 40, btnH = 42;
  const bx = panelX + 20;
  let by = panelY + 60;

  addButton(bx, by, btnW, btnH, 'Продолжить', () => resumeGame());
  by += btnH + 8;

  const now = performance.now();
  const saveLabel = (now < pauseSaveLabelUntil) ? 'Сохранено' : 'Сохранить';
  addButton(bx, by, btnW, btnH, saveLabel, () => {
    if (saveGame()) pauseSaveLabelUntil = performance.now() + 900;
  });
  by += btnH + 8;

  addButton(bx, by, btnW, btnH, 'Настройки', () => openSettings('paused'));
  by += btnH + 8;

  addButton(bx, by, btnW, btnH, 'В главное меню', () => requestQuitToMainMenu());
}

function drawPause() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  buildPauseMenuUI();
  drawUI();
}

// ------------------------------------------------------------
// МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ
// ------------------------------------------------------------
function buildConfirmDialog() {
  clearUI();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const w = 380, h = 160;
  const x = (VIEW_WIDTH - w) / 2;
  const y = (VIEW_HEIGHT - h) / 2;

  ctx.fillStyle = 'rgba(15, 15, 20, 0.98)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  ctx.fillStyle = '#fff';
  ctx.font = '18px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(confirmDialog.text, VIEW_WIDTH / 2, y + 30);

  const btnW = 130, btnH = 40;
  const by = y + h - 60;
  addButton(x + 30, by, btnW, btnH, 'Да', () => confirmDialog.onYes());
  addButton(x + w - 30 - btnW, by, btnW, btnH, 'Нет', () => confirmDialog.onNo());
}

function drawConfirmDialog() {
  buildConfirmDialog();
  drawUI();
}

// ------------------------------------------------------------
// ОБРАБОТЧИКИ КЛИКОВ
// ------------------------------------------------------------
function handleMainMenuClick(button) {
  if (button !== 0) return;

  // Клик по кирке — анимация
  if (isPickaxeHovered()) {
    triggerPickaxeAnim();
    return;
  }

  // Клик по заголовку — ссылка на GitHub
  if (isTitleHovered()) {
    window.open('https://github.com/bbqquuiieedd/Dig-Pick', '_blank');
    return;
  }

  // Обычные элементы UI
  const el = findUIAt(mouse.x, mouse.y);
  if (!el || el.enabled === false) return;
  if (el.kind === 'button' || el.kind === 'textButton') el.action();
}

function handlePauseMenuClick(button) {
  if (button !== 0) return;
  const el = findUIAt(mouse.x, mouse.y);
  if (el && el.enabled !== false && el.kind === 'button') el.action();
}

function handleSettingsClick(button) {
  if (button !== 0) return;
  if (waitingForKey) return;
  const el = findUIAt(mouse.x, mouse.y);
  if (!el) return;
  if (el.kind === 'button' || el.kind === 'toggle' || el.kind === 'cycle' || el.kind === 'keyBadge') {
    el.action();
  }
}

function handleConfirmDialogClick(button) {
  if (button !== 0) return;
  const el = findUIAt(mouse.x, mouse.y);
  if (el && el.kind === 'button') el.action();
}

// ------------------------------------------------------------
// НАВИГАЦИЯ ПО МЕНЮ
// ------------------------------------------------------------
function handleMenuNavigation() {
  if (waitingForKey) return;
  const nav = getNavigableButtons();
  if (nav.length === 0) return;
  if (activeMenuButtonIndex >= nav.length) activeMenuButtonIndex = 0;

  if (wasActionJustPressed('menu', 'menu_down')) {
    activeMenuButtonIndex = (activeMenuButtonIndex + 1) % nav.length;
  }
  if (wasActionJustPressed('menu', 'menu_up')) {
    activeMenuButtonIndex = (activeMenuButtonIndex - 1 + nav.length) % nav.length;
  }
  if (wasActionJustPressed('menu', 'confirm')) {
    const b = nav[activeMenuButtonIndex];
    if (b && b.enabled !== false) b.action();
  }
}

// ------------------------------------------------------------
// ОВЕРЛЕИ
// ------------------------------------------------------------
function updateFpsCounter(now) {
  fpsHistory.push(now);
  if (now - lastFpsUpdate > 250) {
    const deltas = [];
    for (let i = 1; i < fpsHistory.length; i++) deltas.push(fpsHistory[i] - fpsHistory[i-1]);
    if (deltas.length > 0) {
      const avg = deltas.reduce((a,b) => a+b, 0) / deltas.length;
      currentFps = Math.round(1000 / avg);
    }
    fpsHistory = [];
    lastFpsUpdate = now;
  }
}

function drawFpsOverlay() {
  if (!settings.showFPS) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(VIEW_WIDTH - 110, 8, 100, 24);
  ctx.fillStyle = '#0f0';
  ctx.font = '14px ' + FONT_FAMILY;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`FPS: ${currentFps}`, VIEW_WIDTH - 16, 20);
}

function drawHintsOverlay() {
  if (!settings.showHints) return;
  const getLbl = (context, id) => {
    const arr = settings.bindings[context][id] || [];
    return arr.map(keyCodeToLabel).join('/');
  };
  const lines = [
    `${getLbl('game','left')}/${getLbl('game','right')} — ходьба`,
    `${getLbl('game','jump')} — прыжок`,
    `ЛКМ — копать, ПКМ — ставить`,
    `${getLbl('game','inventory')} — инвентарь`,
    `${getLbl('game','chat')} — чат / консоль`,
    `${getLbl('game','pause')} — пауза`,
    `${getLbl('game','save')} — сохранить`,
    `${getLbl('game','hints')} — подсказки`,
    `${getLbl('game','fps')} — FPS`,
    `${getLbl('game','debug')} — отладка`,
  ];
  const padX = 10, padY = 8, lineH = 18;
  const boxW = 280, boxH = lines.length * lineH + padY * 2;
  const boxX = 10, boxY = VIEW_HEIGHT - boxH - 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = '#ddd';
  ctx.font = '13px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], boxX + padX, boxY + padY + i * lineH);
  }
}

function drawSaveIcon(now) {
  if (now >= autosaveIconUntil) return;
  const tex = textures.autosaveIcon;
  if (!tex) return;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(tex, VIEW_WIDTH - 60, 40, 48, 48);
  ctx.restore();
}

// ------------------------------------------------------------
// КОНСОЛЬ — отрисовка
// ------------------------------------------------------------
function drawConsole() {
  if (!consoleOpen) return;

  const lineH = 18;
  const inputH = 26;
  const padding = 8;

  // Верхняя панель — строка ввода
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, VIEW_WIDTH, inputH + padding * 2);

  ctx.font = '16px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#88ff88';
  ctx.fillText('>', padding, inputH / 2 + padding);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(consoleInput, padding + 20, inputH / 2 + padding);

  // Мигающий курсор
  const showCaret = Math.floor(performance.now() / 500) % 2 === 0;
  if (showCaret) {
    const tw = ctx.measureText(consoleInput).width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding + 20 + tw + 1, padding + 4, 2, inputH - 8);
  }

  // Область вывода — под строкой ввода, до низа экрана
  const logTop = inputH + padding * 2;
  const logBottom = VIEW_HEIGHT - padding;
  const maxLines = Math.floor((logBottom - logTop) / lineH);
  const start = Math.max(0, consoleLog.length - maxLines);
  const visible = consoleLog.slice(start);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, logTop, VIEW_WIDTH, logBottom - logTop);

  ctx.textBaseline = 'top';
  ctx.font = '14px ' + FONT_FAMILY;
  for (let i = 0; i < visible.length; i++) {
    ctx.fillStyle = visible[i].color;
    ctx.fillText(visible[i].text, padding, logTop + i * lineH + 2);
  }
}

// ------------------------------------------------------------
// ЧАТ — оверлей поверх игры (после закрытия консоли)
// ------------------------------------------------------------
function drawChatOverlay() {
  if (consoleOpen) return;

  const now = performance.now();
  if (now >= chatOverlayUntil) return;
  if (chatMessages.length === 0) return;

  // Плавное затухание в последнюю секунду
  let alpha = 1;
  const remaining = chatOverlayUntil - now;
  if (remaining < 1000) alpha = remaining / 1000;

  const padX = 10;
  const padY = 8;
  const lineH = 20;
  const recent = chatMessages.slice(-5);
  const boxH = recent.length * lineH + padY * 2;
  const boxW = 420;
  const boxY = VIEW_HEIGHT - boxH - 80;   // над хотбаром

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(padX, boxY, boxW, boxH);

  ctx.font = '14px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < recent.length; i++) {
    const m = recent[i];
    const nameStr = m.author + ': ';
    const nameW = ctx.measureText(nameStr).width;

    ctx.fillStyle = '#ffff88';
    ctx.fillText(nameStr, padX + 8, boxY + padY + i * lineH);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(m.text, padX + 8 + nameW, boxY + padY + i * lineH);
  }

  ctx.restore();
}