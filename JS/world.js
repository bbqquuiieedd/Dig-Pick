// world.js — все функции используют глобальные переменные из config.js и state.js

function inBounds(tx,ty){ return tx>=0 && tx<WORLD_W && ty>=0 && ty<WORLD_H; }
function isFloorWater(tx,ty){ return state.floors[ty][tx] === F_WATER; }

function updateSolidAt(tx,ty){
  const o = state.objects[ty][tx];
  if(o !== null && ITEMS[o].solid){ state.solidGrid[ty][tx] = true; return; }
  state.solidGrid[ty][tx] = ITEMS[state.floors[ty][tx]].solid;
}
function rebuildSolidGrid(){
  for(let y=0;y<WORLD_H;y++){ state.solidGrid[y] = []; for(let x=0;x<WORLD_W;x++) updateSolidAt(x,y); }
}
function isSolid(tx,ty){
  if(tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return true;
  return state.solidGrid[ty][tx];
}
function cleanWaterObjects(){
  for(let y=0;y<WORLD_H;y++) for(let x=0;x<WORLD_W;x++){
    if(state.floors[y][x] === F_WATER && state.objects[y][x] !== null) state.objects[y][x] = null;
  }
}

let _seed = 12345;
function resetSeed(s){ _seed = s; }
function rng(){ _seed = (_seed*9301+49297) % 233280; return _seed/233280; }
function rngInt(a,b){ return a + Math.floor(rng()*(b-a+1)); }

function paintFloorCircle(cx,cy,r,type,allowed){
  for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){
    if(x<0||x>=WORLD_W||y<0||y>=WORLD_H) continue;
    const dx=x-cx, dy=y-cy;
    if(dx*dx+dy*dy <= r*r && allowed.includes(state.floors[y][x])) state.floors[y][x] = type;
  }
}

function plantTree(tx,ty){
  for(let i=0;i<3;i++){
    const yy = ty-i;
    if(!inBounds(tx,yy)) return false;
    if(isFloorWater(tx,yy)) return false;
    if(state.objects[yy][tx] !== null && state.objects[yy][tx] !== O_LEAVES) return false;
  }
  const topY = ty-2;
  for(let dy=-2;dy<=0;dy++) for(let dx=-1;dx<=1;dx++){
    if(dy === -2 && dx !== 0) continue;
    const x = tx+dx, y = topY+dy-1;
    if(!inBounds(x,y)) continue;
    if(dx === 0 && dy === 0) continue;
    if(isFloorWater(x,y)) continue;
    if(state.objects[y][x] === null || state.objects[y][x] === O_LEAVES) state.objects[y][x] = O_LEAVES;
  }
  if(inBounds(tx,topY-2) && !isFloorWater(tx,topY-2)){
    if(state.objects[topY-2][tx] === null) state.objects[topY-2][tx] = O_LEAVES;
  }
  for(let i=0;i<3;i++) if(inBounds(tx,ty-i)) state.objects[ty-i][tx] = O_TRUNK;
  return true;
}

function growSapling(tx,ty){
  if(state.objects[ty][tx] !== O_SAPLING) return;
  state.objects[ty][tx] = null; updateSolidAt(tx,ty);
  plantTree(tx,ty);
  for(let y=ty-5;y<=ty+1;y++) for(let x=tx-3;x<=tx+3;x++){
    if(inBounds(x,y)) updateSolidAt(x,y);
  }
}

function updateSaplings(){
  const now = Date.now();
  for(const k in state.saplings){
    if(now - state.saplings[k] >= SAPLING_GROW_MS){
      const [x,y] = k.split(',').map(Number);
      if(inBounds(x,y) && state.objects[y][x] === O_SAPLING) growSapling(x,y);
      delete state.saplings[k];
    }
  }
}

function generateWorld(){
  resetSeed(12345);
  for(let y=0;y<WORLD_H;y++){
    state.floors[y] = []; state.objects[y] = []; state.solidGrid[y] = [];
    for(let x=0;x<WORLD_W;x++){ state.floors[y][x] = F_GRASS; state.objects[y][x] = null; }
  }
  for(const k in state.saplings) delete state.saplings[k];
  for(const k in state.chests) delete state.chests[k];

  const WATER=2, SAND=2;
  for(let y=0;y<WORLD_H;y++) for(let x=0;x<WORLD_W;x++){
    const d = Math.min(x,y,WORLD_W-1-x,WORLD_H-1-y);
    if(d<WATER) state.floors[y][x] = F_WATER;
    else if(d<WATER+SAND) state.floors[y][x] = F_SAND;
  }
  for(let i=0;i<45;i++) paintFloorCircle(rngInt(6,WORLD_W-7),rngInt(6,WORLD_H-7),rngInt(2,4),F_DIRT,[F_GRASS]);
  for(let i=0;i<35;i++) paintFloorCircle(rngInt(6,WORLD_W-7),rngInt(6,WORLD_H-7),rngInt(1,3),rng()<0.5?F_FLOWERS:F_TALLGRASS,[F_GRASS]);
  for(let i=0;i<12;i++) paintFloorCircle(rngInt(8,WORLD_W-9),rngInt(8,WORLD_H-9),rngInt(1,2),F_GRAVEL,[F_GRASS,F_DIRT]);

  const lakes=[{x:22,y:14,r:4},{x:72,y:12,r:5},{x:50,y:38,r:4},{x:82,y:32,r:5},{x:35,y:22,r:3}];
  for(const l of lakes){
    paintFloorCircle(l.x,l.y,l.r+1,F_SAND,[F_GRASS,F_DIRT,F_FLOWERS,F_TALLGRASS,F_GRAVEL]);
    paintFloorCircle(l.x,l.y,l.r,F_WATER,[F_SAND,F_GRASS,F_DIRT,F_FLOWERS,F_TALLGRASS,F_GRAVEL]);
  }
  for(let i=0;i<25;i++){
    const tx = rngInt(6,WORLD_W-7), ty = rngInt(8,WORLD_H-9);
    if(isFloorWater(tx,ty)) continue;
    plantTree(tx,ty);
  }
  const stoneAreas=[{x:30,y:10,r:4},{x:78,y:40,r:5},{x:12,y:35,r:4},{x:55,y:20,r:3}];
  for(const f of stoneAreas){
    for(let y=f.y-f.r;y<=f.y+f.r;y++) for(let x=f.x-f.r;x<=f.x+f.r;x++){
      if(!inBounds(x,y) || isFloorWater(x,y)) continue;
      const d = (x-f.x)**2 + (y-f.y)**2;
      if(d <= f.r**2 && rng() < 0.55 && state.objects[y][x] === null) state.objects[y][x] = O_STONE;
    }
  }
  for(let i=0;i<10;i++){
    const cx = rngInt(10,WORLD_W-10), cy = rngInt(10,WORLD_H-10);
    const r = rngInt(2,3);
    for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++){
      if(!inBounds(x,y) || isFloorWater(x,y)) continue;
      const d = (x-cx)**2 + (y-cy)**2;
      if(d <= r*r && state.objects[y][x] === null) state.floors[y][x] = F_BEDROCK;
    }
  }
  for(let v=0;v<3;v++){
    const cx = rngInt(10,WORLD_W-10), cy = rngInt(10,WORLD_H-10);
    for(let i=0;i<4;i++){
      const tx = cx+rngInt(-2,2), ty = cy+rngInt(-2,2);
      if(!inBounds(tx,ty) || isFloorWater(tx,ty)) continue;
      if(state.objects[ty][tx] === O_STONE) state.objects[ty][tx] = O_IRON_ORE;
    }
  }
  cleanWaterObjects();
  rebuildSolidGrid();
}