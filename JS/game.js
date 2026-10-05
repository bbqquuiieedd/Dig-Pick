// ============================================================
//  game.js — точка входа, игровой цикл, обработка Esc
// ============================================================

// ------------------------------------------------------------
// ОБРАБОТКА ESC
// Логика:
//   - если инвентарь открыт → закрыть инвентарь
//   - иначе если в игре → открыть паузу
//   - в паузе → продолжить
//   - в настройках → назад
//   - в главном меню → ничего
// ------------------------------------------------------------
function handleEscape() {
  // Если открыта консоль — Esc закрывает её (это уже внутри consoleHandleKey),
  // до handleEscape дело не дойдёт. Но на всякий случай:
  if (consoleOpen) return;

  // ... дальше как было
  const pauseCodes = settings.bindings.game.pause || ['Escape'];
  let escPressed = false;
  for (const code of pauseCodes) {
    if (justPressedKeys.has(code)) { escPressed = true; break; }
  }
  if (!escPressed) return;

  if (waitingForKey) { waitingForKey = null; return; }
  if (confirmDialog) { confirmDialog.onNo(); return; }
  if (gameState === 'settings')  { closeSettings(); return; }
  if (gameState === 'main_menu') { return; }
  if (gameState === 'paused')    { resumeGame(); return; }
  if (gameState === 'playing') {
    if (inventoryOpen) toggleInventory();
    else startPause();
    return;
  }
}

// ------------------------------------------------------------
// ХОТКЕИ ИГРЫ — обрабатываются ОДИН раз за кадр,
// а не в тике. Иначе при 2+ тиках за кадр действие сработает дважды.
// ------------------------------------------------------------
function handleGameHotkeys() {
  if (consoleOpen) return;
  // ... дальше как было
  if (gameState !== 'playing') return;

  // Инвентарь — toggle. Работает и на открытие, и на закрытие.
  if (wasActionJustPressed('game', 'inventory')) {
    toggleInventory();
  }

  // Если инвентарь открыт — остальные хоткеи заблокированы
  if (inventoryOpen) return;

  // Ручное сохранение
  if (wasActionJustPressed('game', 'save')) {
    saveGame();
  }
}

// ------------------------------------------------------------
// ТИК ОБНОВЛЕНИЯ (60 раз в секунду)
// ------------------------------------------------------------
function updateTick() {
  if (gameState !== 'playing') return;
  if (consoleOpen) return;
  if (inventoryOpen) return;

  updatePlayer();
  updateCamera();
  updateBreaking();

  // Автосейв — по таймеру, без justPressed
  if (settings.autosaveInterval > 0) {
    const now = performance.now();
    if (now - lastAutosaveTime >= settings.autosaveInterval) {
      saveGame();
      lastAutosaveTime = now;
    }
  }
}

// ------------------------------------------------------------
// ОТРИСОВКА КАДРА
// ------------------------------------------------------------
function draw(now) {

    if (gameState === 'main_menu') {
    drawMainMenu(now);
  } else if (gameState === 'settings') {
    drawSettings();
  } else if (gameState === 'paused') {
    drawWorld();
    drawPause();
  } else if (gameState === 'playing') {
    drawWorld();
    drawInventoryUI();
    drawDraggingItem();
  }

  if (gameState === 'playing' || gameState === 'paused') {
    drawFpsOverlay();
    drawHintsOverlay();
    drawSaveIcon(now);
    drawChatOverlay();
  }

  if (confirmDialog) drawConfirmDialog();
  if (consoleOpen) drawConsole();
}

// ------------------------------------------------------------
// ИГРОВОЙ ЦИКЛ (фиксированный шаг физики)
// ------------------------------------------------------------
function gameLoop(now) {
  // 1) Обрабатываем все "just pressed" события ОДИН раз за кадр.
  //    Здесь же — Esc и хоткеи игры (E, Tab, I, F4).
  handleEscape();
  handleGameHotkeys();

  // 2) Очищаем уже обработанные нажатия. Всё, что придёт после этой строки
  //    (ввод с клавиатуры асинхронный), будет обработано в СЛЕДУЮЩЕМ кадре —
  //    ничего не потеряется.
  justPressedKeys.clear();

  // 3) Физика с фиксированным шагом
  if (lastTime === 0) lastTime = now;
  let delta = now - lastTime;
  lastTime = now;
  if (delta > MAX_ACCUMULATOR) delta = MAX_ACCUMULATOR;
  accumulator += delta;

  while (accumulator >= TICK_DURATION) {
    updateTick();
    accumulator -= TICK_DURATION;
  }

  // 4) Отрисовка
  draw(now);

  // 5) Hover-эффект (для следующего кадра)
  if (gameState !== 'playing' || inventoryOpen) {
    const el = findUIAt(mouse.x, mouse.y);
    if (el) hoveredButton = el;
  }

  updateFpsCounter(now);

  requestAnimationFrame(gameLoop);
}

// ------------------------------------------------------------
// СТАРТ
// ------------------------------------------------------------
async function startGame() {
  loadSettings();
  await loadAllTextures();

  // Явно дожидаемся загрузки шрифта, чтобы canvas сразу рисовал им,
  // а не системным fallback'ом на первом кадре.
  try {
    await document.fonts.load('16px ' + FONT_FAMILY);
    await document.fonts.load('26px ' + FONT_FAMILY);
  } catch (e) {
    console.warn('Шрифт не загружен, используется fallback');
  }

  requestAnimationFrame(gameLoop);
}

startGame();