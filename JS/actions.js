// actions.js
function updateMining(dt){
  // Меч не копает — только атакует
  const sel0 = getSelectedTool();
  if(sel0 && sel0.tool === 'sword'){
    state.miningTarget = null; state.miningProgress = 0;
    return;
  }
  if(state.uiMode || state.showRecipes){ state.miningTarget = null; state.miningProgress = 0; return; }
  if(!state.mouse.left){ state.miningTarget = null; state.miningProgress = 0; state.miningBlocked = false; return; }
  const { tx, ty } = mouseTile();
  if(!inBounds(tx,ty) || !inReach(tx,ty)){ state.miningTarget = null; state.miningProgress = 0; return; }

  const oid = state.objects[ty][tx];
  if(oid !== null){
    const item = ITEMS[oid];
    if(!item || !item.hardness){ state.miningTarget = null; state.miningProgress = 0; return; }
    if(!state.miningTarget || state.miningTarget.tx !== tx || state.miningTarget.ty !== ty){
      state.miningTarget = { tx, ty }; state.miningProgress = 0; state.miningBlocked = false;
    }
    const sel = getSelectedTool();
    if(item.requiredTool){
      if(!sel || sel.tool !== item.requiredTool){ state.miningBlocked = true; state.miningProgress = 0; return; }
      if(item.requiredTier && sel.tier < item.requiredTier){ state.miningBlocked = true; state.miningProgress = 0; return; }
    }
    state.miningBlocked = false;
    let speed = 1;
    const toolUsed = item.speedupTool && sel && sel.tool === item.speedupTool;
    if(toolUsed) speed = 3;
    state.miningProgress += (dt*1000*speed)/item.hardness;
    if(state.miningProgress >= 1){
      breakBlock(tx,ty,oid);
      if(toolUsed) damageTool();
      state.miningTarget = null; state.miningProgress = 0;
    }
    return;
  }

  // Bedrock — только киркой
  if(state.floors[ty][tx] === F_BEDROCK){
    if(!state.miningTarget || state.miningTarget.tx !== tx || state.miningTarget.ty !== ty){
      state.miningTarget = { tx, ty }; state.miningProgress = 0; state.miningBlocked = false;
    }
    const sel = getSelectedTool();
    if(!sel || sel.tool !== 'pickaxe'){
      state.miningBlocked = true;
      state.miningProgress = 0;
      return;
    }
    state.miningBlocked = false;
    state.miningProgress += (dt*1000*3)/2500;
    if(state.miningProgress >= 1){
      addToInventory(O_STONE, 1);
      damageTool();
      state.miningProgress = 0;
    }
    return;
  }

  state.miningTarget = null; state.miningProgress = 0; state.miningBlocked = false;
}

function breakBlock(tx,ty,oid){
  if(oid === O_TRUNK){
    addToInventory(I_LOG, 1);
    let hasLeaves = false;
    for(let dy=-3;dy<=1 && !hasLeaves;dy++){
      for(let dx=-2;dx<=2 && !hasLeaves;dx++){
        if(dx === 0 && dy === 0) continue;
        const nx = tx+dx, ny = ty+dy;
        if(!inBounds(nx,ny)) continue;
        if(state.objects[ny][nx] === O_LEAVES) hasLeaves = true;
      }
    }
    if(hasLeaves && Math.random() < 0.5) addToInventory(O_SAPLING, 1);
  } else if(oid === O_LEAVES){
    // пусто
  } else if(oid === O_CHEST){
    dropChestContents(tx,ty);
    addToInventory(O_CHEST, 1);
  } else {
    addToInventory(oid, 1);
  }
  state.objects[ty][tx] = null;
  updateSolidAt(tx,ty);
  if(oid === O_SAPLING) delete state.saplings[`${tx},${ty}`];
}

function updatePlacing(dt){
  if(state.placingCooldown > 0){ state.placingCooldown -= dt; if(state.placingCooldown < 0) state.placingCooldown = 0; }
  if(state.uiMode || state.showRecipes) return;
  if(!state.mouse.right) return;
  if(state.placingCooldown > 0) return;
  const { tx, ty } = mouseTile();
  if(!inBounds(tx,ty) || !inReach(tx,ty)) return;

  if(state.objects[ty][tx] === O_TABLE){ openTable(tx,ty); state.placingCooldown = 0.3; return; }
  if(state.objects[ty][tx] === O_FURNACE){ openFurnace(tx,ty); state.placingCooldown = 0.3; return; }
  if(state.objects[ty][tx] === O_CHEST){ openChest(tx,ty); state.placingCooldown = 0.3; return; }
  if(isFloorWater(tx,ty)) return;

  const slot = state.hotbar[state.selectedHotbarSlot];
  if(!slot) return;
  const item = ITEMS[slot.type];
  if(!item) return;

  // Мотыга — пахота
  if(item.kind === 'tool' && item.tool === 'hoe'){
    const fl = state.floors[ty][tx];
    if((fl === F_GRASS || fl === F_DIRT) && state.objects[ty][tx] === null){
      state.floors[ty][tx] = F_FARMLAND;
      updateSolidAt(tx, ty);
      if(typeof damageTool === 'function') damageTool();
      state.placingCooldown = 0.3;
    }
    return;
  }

  if(item.kind === 'tool') return;
  const cx = tx*TILE + TILE/2, cy = ty*TILE + TILE/2;
  const dx = cx - state.player.x, dy = cy - state.player.y;
  const minD = state.player.r + TILE/2;
  if(dx*dx + dy*dy < minD*minD) return;

  if(slot.type === O_SAPLING){
    if(state.objects[ty][tx] !== null) return;
    const fl = state.floors[ty][tx];
    if(fl !== F_GRASS && fl !== F_DIRT) return;
    state.objects[ty][tx] = O_SAPLING;
    state.saplings[`${tx},${ty}`] = Date.now();
    updateSolidAt(tx,ty);
    slot.count--; if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    state.placingCooldown = 0.15; return;
  }
  if(item.layer === 'object'){
    if(state.objects[ty][tx] !== null) return;
    state.objects[ty][tx] = slot.type;
    if(slot.type === O_CHEST) ensureChest(tx,ty);
    updateSolidAt(tx,ty);
    slot.count--; if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    state.placingCooldown = 0.15;
  } else if(item.layer === 'floor'){
    if(state.floors[ty][tx] === slot.type) return;
    state.floors[ty][tx] = slot.type;
    updateSolidAt(tx,ty);
    slot.count--; if(slot.count <= 0) state.hotbar[state.selectedHotbarSlot] = null;
    state.placingCooldown = 0.15;
  }
}