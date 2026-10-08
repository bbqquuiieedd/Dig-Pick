// ============================================================
//  game.js — точка входа, игровой цикл, обработка Esc
// ============================================================

function handleEscape() {
  if (consoleOpen) return;

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

function handleGameHotkeys() {
  if (consoleOpen) return;
  if (gameState !== 'playing') return;

  if (wasActionJustPressed('game', 'inventory')) {
    toggleInventory();
  }
  if (inventoryOpen) return;
  if (wasActionJustPressed('game', 'save')) {
    saveGame();
  }
}

function updateTick() {
  if (gameState !== 'playing') return;
  if (consoleOpen) return;
  if (inventoryOpen) return;

  updatePlayer();
  updateCamera();
  updateBreaking();

  waterTickCounter = (waterTickCounter + 1) % WATER_FLOW_DELAY;
  if (waterTickCounter === 0) updateWater();

  updateFish();

  if (settings.autosaveInterval > 0) {
    const now = performance.now();
    if (now - lastAutosaveTime >= settings.autosaveInterval) {
      saveGame();
      lastAutosaveTime = now;
    }
  }
}

function draw(now) {
  // Фон с запасом за края: даже если canvas чуть меньше viewport,
  // цветных полос не будет — они закрашиваются этим прямоугольником.
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(-4, -4, UI_W + 8, UI_H + 8);

  hoveredButton = null;

  if (gameState === 'main_menu') {
    withUIScale(() => drawMainMenu(now));
  } else if (gameState === 'settings') {
    withUIScale(() => drawSettings());
  } else if (gameState === 'paused') {
    drawWorld();
    withUIScale(() => drawPause());
  } else if (gameState === 'playing') {
    drawWorld();
    withUIScale(() => {
      drawInventoryUI();
      drawDraggingItem();
      drawHealthAndAir();
      drawChatOverlay();
    });
  }

  if (gameState === 'playing' || gameState === 'paused') {
    withUIScale(() => {
      drawFpsOverlay();
      drawHintsOverlay();
      drawSaveIcon(now);
    });
  }

  if (debugOverlay) drawDebug();

  if (confirmDialog) withUIScale(() => drawConfirmDialog());
  if (consoleOpen)  withUIScale(() => drawConsole());
}

function gameLoop(now) {
  checkResize();        // ← ДОБАВЬ ЭТУ СТРОКУ — ловит Ctrl+±
  handleEscape();
  handleGameHotkeys();
  justPressedKeys.clear();

  if (lastTime === 0) lastTime = now;
  let delta = now - lastTime;
  lastTime = now;
  if (delta > MAX_ACCUMULATOR) delta = MAX_ACCUMULATOR;
  accumulator += delta;

  while (accumulator >= TICK_DURATION) {
    updateTick();
    accumulator -= TICK_DURATION;
  }

  draw(now);

  if (confirmDialog || gameState === 'main_menu' || gameState === 'paused' || gameState === 'settings') {
    handleMenuNavigation();
  }

  if (gameState !== 'playing' || inventoryOpen) {
    const el = findUIAt(mouse.ux, mouse.uy);
    if (el) hoveredButton = el;
  }

  updateFpsCounter(now);
  requestAnimationFrame(gameLoop);
}

async function startGame() {
  loadSettings();
  await loadAllTextures();

  try {
    await document.fonts.load('16px ' + FONT_FAMILY);
    await document.fonts.load('26px ' + FONT_FAMILY);
  } catch (e) {
    console.warn('Шрифт не загружен, используется fallback');
  }

  requestAnimationFrame(gameLoop);
}

startGame();