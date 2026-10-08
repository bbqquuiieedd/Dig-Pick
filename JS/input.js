// ============================================================
//  input.js — клавиатура, мышь, свой курсор
// ============================================================

window.addEventListener('keydown', (e) => {
  // Консоль открыта — весь ввод идёт туда
  if (consoleOpen) {
    e.preventDefault();
    consoleHandleKey(e);
    return;
  }

  // Открытие консоли / чата
  if (gameState === 'playing' && !inventoryOpen &&
      settings.bindings.game.chat.includes(e.code)) {
    openConsole();
    e.preventDefault();
    return;
  }

  // Перехват служебных клавиш — чтобы браузер их не использовал
  const PREVENT_DEFAULT_CODES = [
    'Tab', 'Escape',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
  ];
  if (PREVENT_DEFAULT_CODES.includes(e.code)) {
    e.preventDefault();
  }

  const wasPressed = keys[e.code] === true;
  keys[e.code] = true;
  if (!wasPressed) justPressedKeys.add(e.code);

  if (waitingForKey) {
    e.preventDefault();
    if (e.code === 'Escape') { waitingForKey = null; return; }
    bindKey(waitingForKey.context, waitingForKey.actionId, e.code);
    waitingForKey = null;
    return;
  }

  if (!wasPressed) {
    if (settings.bindings.game.hints.includes(e.code)) {
      settings.showHints = !settings.showHints;
      saveSettings();
      return;
    }
    if (settings.bindings.game.fps.includes(e.code)) {
      settings.showFPS = !settings.showFPS;
      saveSettings();
      return;
    }
    if (settings.bindings.game.debug.includes(e.code)) {
      debugOverlay = !debugOverlay;
      return;
    }
  }

  if (gameState === 'playing' && !inventoryOpen && !confirmDialog) {
    if (!wasPressed) {
      const actionId = getActionForKey('game', e.code);
      if (actionId === 'left')  lastDirectionAction = 'left';
      if (actionId === 'right') lastDirectionAction = 'right';
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (consoleOpen) return;
  keys[e.code] = false;

  if (gameState === 'playing' && !inventoryOpen && !confirmDialog) {
    const actionId = getActionForKey('game', e.code);
    if (actionId === 'left' && lastDirectionAction === 'left') {
      if (isActionPressed('game', 'right')) lastDirectionAction = 'right';
      else lastDirectionAction = null;
    }
    if (actionId === 'right' && lastDirectionAction === 'right') {
      if (isActionPressed('game', 'left')) lastDirectionAction = 'left';
      else lastDirectionAction = null;
    }
  }
});

// ------------------------------------------------------------
// МЫШЬ
// mouse.x/y  — экранные CSS-пиксели
// mouse.ux/uy — UI-координаты (компенсация зума, для кликов по UI)
// mouse.wx/wy — мировые, Y-ВВЕРХ
// ------------------------------------------------------------
function updateMouseFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  // UI-координаты — умножаем на UI_ZOOM, потому что UI отрисовывается
  // с ctx.scale(1/UI_ZOOM). Тогда клики попадают точно по элементам.
  mouse.ux = mouse.x * UI_ZOOM;
  mouse.uy = mouse.y * UI_ZOOM;

  // Мир
  mouse.wx = camera.x + mouse.x / RENDER_SCALE;
  const cameraTop = camera.y + VIEW_WORLD_HEIGHT;
  mouse.wy = cameraTop - mouse.y / RENDER_SCALE;
}

canvas.addEventListener('mousemove', updateMouseFromEvent);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  if (consoleOpen) return;
  updateMouseFromEvent(e);

  if (confirmDialog) { handleConfirmDialogClick(e.button); e.preventDefault(); return; }
  if (gameState === 'settings')  { handleSettingsClick(e.button); e.preventDefault(); return; }
  if (gameState === 'main_menu') { handleMainMenuClick(e.button); e.preventDefault(); return; }
  if (gameState === 'paused')    { handlePauseMenuClick(e.button); e.preventDefault(); return; }

  if (gameState === 'playing') {
    if (inventoryOpen) {
      const slot = getSlotAt(mouse.ux, mouse.uy);
      if (slot >= 0) handleSlotClick(slot, e.button);
      e.preventDefault();
      return;
    }
    const hotbarSlot = getSlotAt(mouse.ux, mouse.uy);
    if (hotbarSlot >= 0 && hotbarSlot < HOTBAR_SLOTS) {
      if (e.button === 0) activeSlot = hotbarSlot;
      e.preventDefault();
      return;
    }
    if (e.button === 0) {
      mouse.leftHeld = true;
    } else if (e.button === 2) {
      const item = slots[activeSlot];
      if (!item) {
        handleEmptyRightClick();
      } else if (item.tileId < 0) {
        handleEmptyRightClick();
      } else {
        tryPlaceBlock();
      }
    }
    e.preventDefault();
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.leftHeld = false;
});

canvas.addEventListener('wheel', (e) => {
  if (gameState !== 'playing' || inventoryOpen || consoleOpen) return;
  const delta = e.deltaY > 0 ? 1 : -1;
  activeSlot = (activeSlot + delta + HOTBAR_SLOTS) % HOTBAR_SLOTS;
  e.preventDefault();
}, { passive: false });

// ------------------------------------------------------------
// СВОЙ КУРСОР
// Храним ФИЗИЧЕСКУЮ позицию мыши (clientX * dpr).
// При зуме dpr меняется, но физическая позиция — нет.
// Поэтому при resize пересчитываем CSS-позицию из физической.
// ------------------------------------------------------------
const CURSOR_HOTSPOT_NATIVE_X = 2;   // hotspot в нативных пикселях картинки
const CURSOR_HOTSPOT_NATIVE_Y = 2;

// Физическая позиция мыши (в физических пикселях окна)
let cursorPhysX = -1000;
let cursorPhysY = -1000;

function getCursorCssSize() {
  return CURSOR_BASE_SIZE / UI_ZOOM;
}

function applyCursorPosition() {
  if (cursorPhysX < -900) return;   // ещё ни разу не двигали мышь

  const dpr = window.devicePixelRatio || 1;

  // Физическую → CSS
  const clientX = cursorPhysX / dpr;
  const clientY = cursorPhysY / dpr;

  // Hotspot в CSS-пикселях
  const cssSize = getCursorCssSize();
  const natW = cursorEl.naturalWidth  || 8;
  const natH = cursorEl.naturalHeight || 8;
  const offsetX = CURSOR_HOTSPOT_NATIVE_X * (cssSize / natW);
  const offsetY = CURSOR_HOTSPOT_NATIVE_Y * (cssSize / natH);

  cursorEl.style.left = (clientX - offsetX) + 'px';
  cursorEl.style.top  = (clientY - offsetY) + 'px';
}

window.addEventListener('mousemove', (e) => {
  if (cursorEl.style.opacity !== '1') cursorEl.style.opacity = '1';

  const dpr = window.devicePixelRatio || 1;
  cursorPhysX = e.clientX * dpr;
  cursorPhysY = e.clientY * dpr;
  applyCursorPosition();
});

document.addEventListener('mouseleave', () => { cursorEl.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { cursorEl.style.opacity = '1'; });
window.addEventListener('blur',  () => { cursorEl.style.opacity = '0'; });