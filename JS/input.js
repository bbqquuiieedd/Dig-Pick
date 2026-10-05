// ============================================================
//  input.js — клавиатура, мышь, свой курсор
// ============================================================

// ------------------------------------------------------------
// КЛАВИАТУРА
// ------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  // Жёстко предотвращаем браузерные действия для игровых клавиш.
  // Это фиксит баг с Tab: без preventDefault браузер уводит фокус,
  // и следующие нажатия (в т.ч. Esc) до нас не доходят.
  // Перехватываем все клавиши, которые браузер может использовать по умолчанию.
  // F11 и F12 не перехватываются — это ограничение браузера.
  const PREVENT_DEFAULT_CODES = [
    'Tab', 'Escape',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
    'Backspace', '/', "'",
  ];
  if (PREVENT_DEFAULT_CODES.includes(e.code)) {
    e.preventDefault();
  }

  const wasPressed = keys[e.code] === true;
  keys[e.code] = true;
  if (!wasPressed) justPressedKeys.add(e.code);

  // Если ждём клавишу для переназначения
  if (waitingForKey) {
    e.preventDefault();
    if (e.code === 'Escape') { waitingForKey = null; return; }
    bindKey(waitingForKey.context, waitingForKey.actionId, e.code);
    waitingForKey = null;
    return;
  }

  // Глобальные хоткеи: F1, F2, F3
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

  // Приоритет последней нажатой клавиши направления.
  // Только в игре, без открытого инвентаря/модалки.
  if (gameState === 'playing' && !inventoryOpen && !confirmDialog) {
    if (!wasPressed) {
      const actionId = getActionForKey('game', e.code);
      if (actionId === 'left')  lastDirectionAction = 'left';
      if (actionId === 'right') lastDirectionAction = 'right';
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;

  // Если отпустили "главное" направление — переключаемся на то,
  // которое ещё зажато (если есть). Иначе сбрасываем в null.
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
// ------------------------------------------------------------
function updateMouseFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.wx = mouse.x / RENDER_SCALE;
  mouse.wy = mouse.y / RENDER_SCALE;
}

canvas.addEventListener('mousemove', updateMouseFromEvent);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  updateMouseFromEvent(e);

  // Приоритет состояний
  if (confirmDialog) {
    handleConfirmDialogClick(e.button);
    e.preventDefault();
    return;
  }
  if (gameState === 'settings') {
    handleSettingsClick(e.button);
    e.preventDefault();
    return;
  }
  if (gameState === 'main_menu') {
    handleMainMenuClick(e.button);
    e.preventDefault();
    return;
  }
  if (gameState === 'paused') {
    handlePauseMenuClick(e.button);
    e.preventDefault();
    return;
  }

  // Игра
  if (gameState === 'playing') {
    if (inventoryOpen) {
      const slot = getSlotAt(mouse.x, mouse.y);
      if (slot >= 0) handleSlotClick(slot, e.button);
      e.preventDefault();
      return;
    }
    const hotbarSlot = getSlotAt(mouse.x, mouse.y);
    if (hotbarSlot >= 0 && hotbarSlot < HOTBAR_SLOTS) {
      if (e.button === 0) activeSlot = hotbarSlot;
      e.preventDefault();
      return;
    }
    if (e.button === 0) mouse.leftHeld = true;
    else if (e.button === 2) tryPlaceBlock();
    e.preventDefault();
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.leftHeld = false;
});

// Колесо мыши — переключение активного слота хотбара
canvas.addEventListener('wheel', (e) => {
  if (gameState !== 'playing' || inventoryOpen) return;
  const delta = e.deltaY > 0 ? 1 : -1;
  activeSlot = (activeSlot + delta + HOTBAR_SLOTS) % HOTBAR_SLOTS;
  e.preventDefault();
}, { passive: false });

// ------------------------------------------------------------
// СВОЙ КУРСОР (двигается за мышью через <img>)
// ------------------------------------------------------------
// Двигаем курсор и всегда показываем его при движении мыши
window.addEventListener('mousemove', (e) => {
  if (cursorEl.style.opacity !== '1') cursorEl.style.opacity = '1';
  cursorEl.style.left = (e.clientX - 2) + 'px';
  cursorEl.style.top  = (e.clientY - 2) + 'px';
});

// Прячем курсор, когда мышь уходит за пределы страницы
document.addEventListener('mouseleave', () => { cursorEl.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { cursorEl.style.opacity = '1'; });

// Прячем при потере фокуса окном
window.addEventListener('blur',  () => { cursorEl.style.opacity = '0'; });