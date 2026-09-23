// ============================================================
// game.js — игровой цикл и запуск
// ============================================================

function updateTime(dt){
  if(state.gameState !== 'playing') return;
  state.timeOfDay += (dt * 1000) / DAY_LENGTH_MS;
  if(state.timeOfDay >= 1) state.timeOfDay -= 1;
}

function update(dt){
  // Таймеры UI
  if(state.tooltipTimer > 0){
    state.tooltipTimer -= dt;
    if(state.tooltipTimer < 0){ state.tooltipTimer = 0; state.tooltipName = ''; }
  }
  if(state.attackAnim > 0) state.attackAnim = Math.max(0, state.attackAnim - dt);
  if(state.attackCooldown > 0) state.attackCooldown = Math.max(0, state.attackCooldown - dt);

  if(state.gameState !== 'playing' && state.gameState !== 'paused-ui') return;

  if(state.gameState === 'paused-ui'){
    if(state.uiMode === 'furnace') updateFurnace(dt);
    if(state.uiMode === 'campfire') updateCampfire(dt);
    return;
  }

  // Физика — фиксированный шаг
  state.accumulator += dt;
  if(state.accumulator > MAX_ACCUM) state.accumulator = MAX_ACCUM;

  while(state.accumulator >= FIXED_DT){
    state.player.prevX = state.player.x;
    state.player.prevY = state.player.y;
    updatePlayer(FIXED_DT);
    updateMining(FIXED_DT);
    state.accumulator -= FIXED_DT;
  }

  const alpha = state.accumulator / FIXED_DT;
  state.player.renderX = state.player.prevX + (state.player.x - state.player.prevX) * alpha;
  state.player.renderY = state.player.prevY + (state.player.y - state.player.prevY) * alpha;

  // Логика
  updatePlacing(dt);
  updateSaplings();
  updatePlayerStats(dt);
  updateTime(dt);

  updateAnimals(dt);
  updateRaccoon(dt);
  trySpawnRaccoon();
  updateDogs(dt);
  updateMobs(dt);
  updateVillagers(dt);
  updateFloorItems(dt);
  updateFireTimers(dt);

  updateCamera();
}

function render(){
  ctx.fillStyle = '#0e0e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(state.gameState === 'menu' || state.gameState === 'loading') return;

  renderWorld();
  renderFloorItems();
  renderAnimals();
  renderDogs();
  renderVillagers();
  renderMobs();
  renderRaccoon();

  if(state.miningTarget && state.miningProgress > 0){
    renderCracks(state.miningTarget.tx, state.miningTarget.ty, state.miningProgress);
  }

  renderHighlight();
  renderPlayer();
  renderAttackAnimation();

  renderDayNightOverlay();

  if(state.uiMode){
    const T = getTheme();
    ctx.fillStyle = T.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    renderInventoryUI();
  } else {
    renderHotbar();
  }

  if(state.showRecipes) renderRecipes();
  renderDragging();
  renderTooltip();
  renderHpAndHunger();
  renderClockIcon();
  renderFpsCounter();
}

function loop(ts){
  if(!state.lastTime) state.lastTime = ts;
  const dt = Math.min((ts - state.lastTime) / 1000, 0.1);
  state.lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

async function start(){
  const hintTimer = setTimeout(() => {
    const lh = document.getElementById('loading-hint');
    const lc = document.getElementById('loading');
    if(lh && lc && !lc.classList.contains('hidden')) lh.classList.remove('hidden');
  }, 5000);

  resizeCanvas();
  generateWorld(12345);
  resetPlayer();

  try {
    await loadAllTextures();
  } catch(e){
    console.error('Ошибка загрузки текстур:', e);
  }
  buildAllCaches();

  setTheme(settings.theme || 'light');

  initInput();
  initMenus();

  clearTimeout(hintTimer);
  document.getElementById('loading').classList.add('hidden');

  showMainMenu();
  requestAnimationFrame(loop);
}

start();