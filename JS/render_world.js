function tileHash(tx,ty,s=0){
  let h = ((tx + s*31)*73856093) ^ ((ty + s*17)*19349663);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

function renderWorld(){
  const sx = Math.max(0, Math.floor(state.camera.x / TILE));
  const ex = Math.min(99, Math.ceil((state.camera.x + canvas.width) / TILE));
  const sy = Math.max(0, Math.floor(state.camera.y / TILE));
  const ey = Math.min(49, Math.ceil((state.camera.y + canvas.height) / TILE));

  for(let ty=sy;ty<=ey;ty++) for(let tx=sx;tx<=ex;tx++) drawFloor(state.floors[ty][tx], tx, ty);
  for(let ty=sy;ty<=ey;ty++) for(let tx=sx;tx<=ex;tx++){
    const id = state.objects[ty][tx];
    if(id !== null) drawObject(id, tx, ty);
  }
}

function drawFloor(id, tx, ty){
  const px = tx*TILE - state.camera.x;
  const py = ty*TILE - state.camera.y;
  if(id === F_WATER){ drawWater(px,py,tx,ty); return; }
  const img = getItemImage(id);
  if(img){ ctx.drawImage(img, px, py, TILE, TILE); return; }
  const cache = state.floorCache[id];
  if(cache){
    const v = tileHash(tx,ty,1) % TILE_VARIANTS;
    ctx.drawImage(cache[v], px, py);
    return;
  }
  ctx.fillStyle = ITEMS[id].color; ctx.fillRect(px,py,TILE,TILE);
}

function drawWater(px, py, tx, ty){
  const img = getItemImage(F_WATER);
  if(img) ctx.drawImage(img, px, py, TILE, TILE);
  else {
    ctx.fillStyle = '#3a7bd5'; ctx.fillRect(px,py,TILE,TILE);
    ctx.fillStyle = 'rgba(20,40,90,0.25)'; ctx.fillRect(px,py+TILE*0.6,TILE,TILE*0.4);
  }
  const t = performance.now() * 0.0016;
  const ph = t + tx*0.4 + ty*0.7, off = Math.sin(ph)*2.5;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(px+4+off, py+10, TILE-12, 2);
  ctx.fillRect(px+8-off, py+22, TILE-18, 2);
}

function drawObject(id, tx, ty){
  const px = tx*TILE - state.camera.x;
  const py = ty*TILE - state.camera.y;
  const img = getItemImage(id);
  if(img){
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(px+3, py+3, TILE, TILE);
    ctx.drawImage(img, px, py, TILE, TILE);
    return;
  }
  const cache = state.objectCache[id];
  if(cache){
    const v = tileHash(tx,ty,5) % TILE_VARIANTS;
    ctx.drawImage(cache[v], px - OBJ_PAD, py - OBJ_PAD);
    return;
  }
  ctx.fillStyle = ITEMS[id].color; ctx.fillRect(px,py,TILE,TILE);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
}

function renderCracks(tx, ty, progress){
  const px = tx*TILE - state.camera.x, py = ty*TILE - state.camera.y;
  const lines = [
    [[.15,.15],[.5,.5]], [[.85,.2],[.5,.5]], [[.5,.85],[.5,.5]],
    [[.25,.4],[.45,.55]], [[.75,.75],[.6,.6]]
  ];
  const count = Math.max(1, Math.ceil(progress*lines.length));
  ctx.save();
  ctx.strokeStyle = `rgba(0,0,0,${0.35+progress*0.5})`;
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for(let i=0;i<count;i++){
    const [[x1,y1],[x2,y2]] = lines[i];
    ctx.beginPath();
    ctx.moveTo(px+x1*TILE, py+y1*TILE);
    ctx.lineTo(px+x2*TILE, py+y2*TILE);
    ctx.stroke();
  }
  ctx.restore();
}

function renderHighlight(){
  if(state.uiMode || state.showRecipes) return;
  const { tx, ty } = mouseTile();
  if(!inBounds(tx,ty) || !inReach(tx,ty)) return;
  const oid = state.objects[ty][tx];
  const item = oid ? ITEMS[oid] : null;
  const sel = getSelectedTool();
  let color = 'rgba(255,255,255,0.85)';
  if(item && item.requiredTool){
    if(!sel || sel.tool !== item.requiredTool || (item.requiredTier && sel.tier < item.requiredTier)){
      color = 'rgba(255,90,90,0.9)';
    }
  }
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.strokeRect(tx*TILE - state.camera.x, ty*TILE - state.camera.y, TILE, TILE);
}

function renderPlayer(){
  const inWater = !!state.player.inWater;
  const px = state.player.renderX - state.camera.x;
  const py = state.player.renderY - state.camera.y;

  if(inWater){
    // Рябь под игроком
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    const t = performance.now() * 0.003;
    const rw = state.player.r + 4 + Math.sin(t) * 1.5;
    const rh = (state.player.r - 2) * 0.55;
    ctx.beginPath();
    ctx.ellipse(px, py + 10, rw, rh, 0, 0, Math.PI*2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 10, rw + 4, rh + 1.5, 0, 0, Math.PI*2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py+6, state.player.r+2, state.player.r-2, 0, 0, Math.PI*2);
    ctx.fill();
  }

  const img = getPlayerImage();
  if(img){
    if(inWater) ctx.globalAlpha = 0.78;
    ctx.drawImage(img, px - TILE/2, py - TILE/2, TILE, TILE);
    ctx.globalAlpha = 1;
    return;
  }

  // Fallback — кружок
  if(inWater) ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath(); ctx.arc(px, py, state.player.r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#aa3333'; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = 1;

  const fx = state.player.facing.x, fy = state.player.facing.y;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px+fx*5, py+fy*5, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(px+fx*6.2, py+fy*6.2, 1.6, 0, Math.PI*2); ctx.fill();
}

function renderAnimals(){
  for(const a of state.animals){
    const def = ANIMAL_DEFS[a.type];
    if(!def) continue;
    const px = a.x - state.camera.x;
    const py = a.y - state.camera.y;
    if(px < -40 || px > canvas.width + 40 || py < -40 || py > canvas.height + 40) continue;

    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(px, py + def.size * 0.8, def.size * 1.1, def.size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Тело
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(px, py, def.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Особенности
    if(a.type === 'cow'){
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(px - 4, py - 3, 3, 0, Math.PI * 2);
      ctx.arc(px + 5, py + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if(a.type === 'chicken'){
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(px + def.size * 0.7, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(px, py - def.size * 0.8, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if(a.type === 'sheep'){
      ctx.strokeStyle = 'rgba(180,180,180,0.7)';
      ctx.lineWidth = 2;
      for(let i=0;i<5;i++){
        const ang = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(px + Math.cos(ang) * 6, py + Math.sin(ang) * 6, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

        // Глазки
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - 3, py - 2, 1.3, 0, Math.PI * 2);
    ctx.arc(px + 3, py - 2, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // HP-бар
    renderHpBar(px, py - def.size - 8, 28, a.hp, a.maxHp);
  }
}

function renderHpBar(cx, cy, w, hp, maxHp){
  if(hp >= maxHp) return;
  const h = 4;
  const bx = cx - w/2;
  const by = cy;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(bx, by, w * Math.max(0, hp/maxHp), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx+0.5, by+0.5, w-1, h-1);
}

function renderRaccoon(){
  const r = state.raccoon;
  if(!r) return;
  const px = r.x - state.camera.x;
  const py = r.y - state.camera.y;
  if(px < -50 || px > canvas.width + 50 || py < -50 || py > canvas.height + 50) return;

  const wob = Math.sin(r.animTime * 8) * 1.5;
  const size = 12;

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px, py + size * 0.85, size * 1.0, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Тело
  ctx.fillStyle = '#7a7a7a';
  ctx.beginPath();
  ctx.arc(px, py + wob * 0.3, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Полоса на морде
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(px - size*0.7, py - 2 + wob*0.3, size * 1.4, 4);

  // Глазки белые
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px - 4, py - 1 + wob*0.3, 2, 0, Math.PI * 2);
  ctx.arc(px + 4, py - 1 + wob*0.3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(px - 4, py - 1 + wob*0.3, 1, 0, Math.PI * 2);
  ctx.arc(px + 4, py - 1 + wob*0.3, 1, 0, Math.PI * 2);
  ctx.fill();

  // Хвост полосатый
  ctx.fillStyle = '#5a5a5a';
  ctx.beginPath();
  ctx.arc(px + size * 0.95, py + 3 + wob*0.3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(px + size * 0.95, py + 3 + wob*0.3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Украденный предмет над енотом
    if(r.stolenItem){
    const img = getItemImage(r.stolenItem.type);
    const s = 18;
    const ix = px - s/2;
    const iy = py - size - s - 4;
    if(img) ctx.drawImage(img, ix, iy, s, s);
    else {
      const def = ITEMS[r.stolenItem.type];
      ctx.fillStyle = def ? def.color : '#888';
      ctx.fillRect(ix, iy, s, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(ix+0.5, iy+0.5, s-1, s-1);
    }
  }

  // HP-бар
  renderHpBar(px, py - size - (r.stolenItem ? 28 : 8), 30, r.hp, r.maxHp);
}