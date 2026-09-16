function ensurePlayerNotStuck(){
  if(isSolid(Math.floor(state.player.x/TILE), Math.floor(state.player.y/TILE))){
    for(let r=0;r<20;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      const tx = Math.floor(state.player.x/TILE)+dx;
      const ty = Math.floor(state.player.y/TILE)+dy;
      if(tx < 5 || tx >= WORLD_W-5 || ty < 5 || ty >= WORLD_H-5) continue;
      if(!isSolid(tx,ty)){
        state.player.x = tx*TILE + TILE/2;
        state.player.y = ty*TILE + TILE/2;
        return;
      }
    }
  }
}

function resetPlayer(){
  const p = state.player;
  p.x = 12*TILE; p.y = 12*TILE;
  p.prevX = p.x; p.prevY = p.y;
  p.renderX = p.x; p.renderY = p.y;
  p.vx = 0; p.vy = 0;
  p.facing = { x: 0, y: 1 };
  ensurePlayerNotStuck();
}

function isPlayerInWater(){
  const tx = Math.floor(state.player.x / TILE);
  const ty = Math.floor(state.player.y / TILE);
  if(tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return false;
  return state.floors[ty][tx] === F_WATER;
}

function updatePlayer(dt){
  if(state.uiMode || state.showRecipes) return;
  let dx = 0, dy = 0;
  if(isActionDown('moveLeft'))  dx -= 1;
  if(isActionDown('moveRight')) dx += 1;
  if(isActionDown('moveUp'))    dy -= 1;
  if(isActionDown('moveDown'))  dy += 1;
  if(dx !== 0 && dy !== 0){ const l = Math.sqrt(dx*dx+dy*dy); dx/=l; dy/=l; }
  if(dx !== 0 || dy !== 0){ state.player.facing.x = dx; state.player.facing.y = dy; }

  const p = state.player;
  const inWater = isPlayerInWater();
  const speed = inWater ? MOVE_SPEED * SWIM_SPEED_MULT : MOVE_SPEED;

  p.vx = dx*speed; p.vy = dy*speed;
  p.x += dx*speed; resolveAxis('x');
  p.y += dy*speed; resolveAxis('y');
  p.inWater = inWater;
}

function resolveAxis(axis){
  const p = state.player;
  const r = p.r;
  const minTX = Math.floor((p.x-r)/TILE), maxTX = Math.floor((p.x+r)/TILE);
  const minTY = Math.floor((p.y-r)/TILE), maxTY = Math.floor((p.y+r)/TILE);
  const rSq = r*r;
  for(let ty=minTY;ty<=maxTY;ty++) for(let tx=minTX;tx<=maxTX;tx++){
    if(!isSolid(tx,ty)) continue;
    const cx = Math.max(tx*TILE, Math.min(p.x, tx*TILE+TILE));
    const cy = Math.max(ty*TILE, Math.min(p.y, ty*TILE+TILE));
    const dx = p.x-cx, dy = p.y-cy, dSq = dx*dx+dy*dy;
    if(dSq < rSq){
      const dist = Math.sqrt(dSq) || 0.001;
      if(axis === 'x'){
        if(p.vx > 0) p.x = tx*TILE - r;
        else if(p.vx < 0) p.x = tx*TILE + TILE + r;
        else p.x += (dx/dist)*(r-dist);
        p.vx = 0;
      } else {
        if(p.vy > 0) p.y = ty*TILE - r;
        else if(p.vy < 0) p.y = ty*TILE + TILE + r;
        else p.y += (dy/dist)*(r-dist);
        p.vy = 0;
      }
    }
  }
}

function updateCamera(){
  const wW = WORLD_W*TILE, wH = WORLD_H*TILE;
  const cvsW = document.getElementById('game').width;
  const cvsH = document.getElementById('game').height;
  let cx = state.player.renderX - cvsW/2;
  let cy = state.player.renderY - cvsH/2;
  if(wW <= cvsW) cx = (wW - cvsW)/2;
  else cx = Math.max(0, Math.min(wW - cvsW, cx));
  if(wH <= cvsH) cy = (wH - cvsH)/2;
  else cy = Math.max(0, Math.min(wH - cvsH, cy));
  state.camera.x = cx; state.camera.y = cy;
}

function mouseTile(){
  return {
    tx: Math.floor((state.mouse.x + state.camera.x)/TILE),
    ty: Math.floor((state.mouse.y + state.camera.y)/TILE)
  };
}
function inReach(tx,ty){
  const cx = tx*TILE + TILE/2, cy = ty*TILE + TILE/2;
  const dx = cx - state.player.x, dy = cy - state.player.y;
  return dx*dx + dy*dy <= (REACH*TILE)**2;
}