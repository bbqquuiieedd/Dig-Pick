// game.js
function update(dt){
  if(state.gameState !== 'playing' && state.gameState !== 'paused-ui') return;
  if(state.gameState === 'paused-ui'){
    if(state.uiMode === 'furnace') updateFurnace(dt);
    return;
  }
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
  state.player.renderX = state.player.prevX + (state.player.x - state.player.prevX)*alpha;
  state.player.renderY = state.player.prevY + (state.player.y - state.player.prevY)*alpha;
  updatePlacing(dt);
  updateSaplings();
  updateAnimals(dt);
  updateRaccoon(dt);
  updateAttack(dt);
  trySpawnRaccoon();
  updateCamera();
}

function render(){
  ctx.fillStyle = '#0e0e1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if(state.gameState === 'menu' || state.gameState === 'loading') return;

  renderWorld();
  renderAnimals();
  renderRaccoon();
  if(state.miningTarget && state.miningProgress > 0)
    renderCracks(state.miningTarget.tx, state.miningTarget.ty, state.miningProgress);
  renderHighlight();
  renderPlayer();

  if(state.uiMode){
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    renderInventoryUI();
  } else {
    renderHotbar();
  }

  if(state.showRecipes) renderRecipes();
  renderDragging();
  renderTooltip();
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
    if(lh && !document.getElementById('loading').classList.contains('hidden')){
      lh.classList.remove('hidden');
    }
  }, 5000);

  resizeCanvas();
  generateWorld();
  resetPlayer();
  spawnAnimals();
  spawnRaccoon();

  try{ await loadAllTextures(); }catch(e){ console.error('Ошибка загрузки текстур:', e); }
  buildAllCaches();

  initInput();
  initMenus();

  clearTimeout(hintTimer);
  document.getElementById('loading').classList.add('hidden');
  showMainMenu();
  requestAnimationFrame(loop);
}

start();