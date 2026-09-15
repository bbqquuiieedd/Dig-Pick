// ============================================================
// Dig-Pick v1.4 — Исправлено перетаскивание и стакание
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const TILE = 32, WORLD_W = 100, WORLD_H = 50;
const MOVE_SPEED = 3.2, REACH = 4.5, INV_COLS = 10, INV_ROWS = 3;
const HOTBAR_SIZE = 10, CHEST_ROWS = 3;
const SAVE_SLOTS = 3, SAVE_KEY_PREFIX = 'digpick_save_slot_', SAVE_VERSION = 3;
const AUTOSAVE_INTERVAL = 60000;
const FIXED_DT = 1/60, MAX_ACCUM = 0.25;
const SAPLING_GROW_MS = 60000;
const SMELT_TIME_MS = 5000;
const TILE_VARIANTS = 4;
const OBJ_PAD = 4;
const RECIPE_PAGE_SIZE = 6;

// Пол
const F_GRASS=0, F_DIRT=1, F_SAND=2, F_WATER=3, F_FLOWERS=4, F_TALLGRASS=5, F_GRAVEL=6, F_STONE=7;
// Объекты
const O_STONE=10, O_IRON_ORE=11, O_TRUNK=12, O_LEAVES=13, O_SAPLING=14, O_TABLE=15, O_FURNACE=16, O_CHEST=17;
// Предметы
const I_LOG=20, I_PLANKS=21, I_STICK=22, I_IRON_INGOT=23;
// Инструменты
const I_WOOD_PICK=100, I_WOOD_AXE=101, I_STONE_PICK=102, I_STONE_AXE=103, I_IRON_PICK=104, I_IRON_AXE=105;

const ITEMS = {
  0:{name:'Трава',color:'#5aad4a',layer:'floor',solid:false,placeable:true},
  1:{name:'Земля',color:'#8B5A2B',layer:'floor',solid:false,placeable:true},
  2:{name:'Песок',color:'#e8d68a',layer:'floor',solid:false,placeable:true},
  3:{name:'Вода',color:'#3a7bd5',layer:'floor',solid:true,placeable:false},
  4:{name:'Цветы',color:'#7fc95a',layer:'floor',solid:false,placeable:true},
  5:{name:'Высокая трава',color:'#4a9a3a',layer:'floor',solid:false,placeable:true},
  6:{name:'Гравий',color:'#8a8a7a',layer:'floor',solid:false,placeable:true},
  7:{name:'Каменный пол',color:'#5a5a5a',layer:'floor',solid:false,placeable:true,stoneFloor:true},
  10:{name:'Камень',color:'#7a7a7a',layer:'object',solid:true,placeable:true,
      hardness:3000,speedupTool:'pickaxe'},
  11:{name:'Железная руда',color:'#b0b0c0',layer:'object',solid:true,placeable:false,
      hardness:3500,requiredTool:'pickaxe',requiredTier:2,speedupTool:'pickaxe'},
  12:{name:'Ствол',color:'#a0522d',layer:'object',solid:true,placeable:false,
      hardness:2000,speedupTool:'axe'},
  13:{name:'Листва',color:'#3a8a3a',layer:'object',solid:false,placeable:false,
      hardness:400,speedupTool:'axe'},
  14:{name:'Росток',color:'#4a9a3a',layer:'object',solid:false,placeable:true,
      hardness:300,speedupTool:null},
  15:{name:'Верстак',color:'#a0522d',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe'},
  16:{name:'Печь',color:'#5a5a5a',layer:'object',solid:true,placeable:true,
      hardness:2500,speedupTool:'pickaxe'},
  17:{name:'Сундук',color:'#8a5025',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe'},
  20:{name:'Бревно',color:'#6b3a1a',layer:null,placeable:false},
  21:{name:'Доски',color:'#a0522d',layer:null,placeable:false},
  22:{name:'Палка',color:'#8a5025',layer:null,placeable:false},
  23:{name:'Железный слиток',color:'#c8c8d4',layer:null,placeable:false},
  100:{name:'Дер. кирка',color:'#a0522d',kind:'tool',tool:'pickaxe',tier:1,stackable:false},
  101:{name:'Дер. топор',color:'#a0522d',kind:'tool',tool:'axe',tier:1,stackable:false},
  102:{name:'Кам. кирка',color:'#7a7a7a',kind:'tool',tool:'pickaxe',tier:2,stackable:false},
  103:{name:'Кам. топор',color:'#7a7a7a',kind:'tool',tool:'axe',tier:2,stackable:false},
  104:{name:'Жел. кирка',color:'#c8c8d4',kind:'tool',tool:'pickaxe',tier:3,stackable:false},
  105:{name:'Жел. топор',color:'#c8c8d4',kind:'tool',tool:'axe',tier:3,stackable:false},
};

const R = null;
const RECIPES = [
  { pattern:[[I_LOG,R],[R,R]], result:{id:I_PLANKS,count:4}, table:'any' },
  { pattern:[[I_PLANKS,R],[I_PLANKS,R]], result:{id:I_STICK,count:4}, table:'any' },
  { pattern:[[I_PLANKS,I_PLANKS],[I_PLANKS,I_PLANKS]], result:{id:O_TABLE,count:1}, table:'any' },
  { pattern:[[O_STONE,O_STONE,O_STONE],[O_STONE,R,O_STONE],[O_STONE,O_STONE,O_STONE]], result:{id:O_FURNACE,count:1}, table:'table' },
  { pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[I_PLANKS,R,I_PLANKS],[I_PLANKS,I_PLANKS,I_PLANKS]], result:{id:O_CHEST,count:1}, table:'table' },
  { pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_PICK,count:1}, table:'table' },
  { pattern:[[I_PLANKS,I_PLANKS,R],[I_PLANKS,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_AXE,count:1}, table:'table' },
  { pattern:[[O_STONE,O_STONE,O_STONE],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_PICK,count:1}, table:'table' },
  { pattern:[[O_STONE,O_STONE,R],[O_STONE,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_AXE,count:1}, table:'table' },
  { pattern:[[I_IRON_INGOT,I_IRON_INGOT,I_IRON_INGOT],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_PICK,count:1}, table:'table' },
  { pattern:[[I_IRON_INGOT,I_IRON_INGOT,R],[I_IRON_INGOT,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_AXE,count:1}, table:'table' },
];

const TEXTURE_PATHS = {
  items: {
    0:'textures/tiles/grass.png',1:'textures/tiles/dirt.png',2:'textures/tiles/sand.png',
    3:'textures/tiles/water.png',4:'textures/tiles/flowers.png',5:'textures/tiles/tallgrass.png',
    6:'textures/tiles/gravel.png',7:'textures/tiles/stone_floor.png',
    10:'textures/tiles/stone.png',11:'textures/tiles/iron_ore.png',
    12:'textures/tiles/tree.png',13:'textures/tiles/leaves.png',14:'textures/tiles/sapling.png',
    15:'textures/tiles/workbench.png',16:'textures/tiles/furnace.png',17:'textures/tiles/chest.png',
    20:'textures/items/log.png',21:'textures/items/planks.png',
    22:'textures/items/stick.png',23:'textures/items/iron_ingot.png',
    100:'textures/tools/wood_pickaxe.png',101:'textures/tools/wood_axe.png',
    102:'textures/tools/stone_pickaxe.png',103:'textures/tools/stone_axe.png',
    104:'textures/tools/iron_pickaxe.png',105:'textures/tools/iron_axe.png',
  },
  player: 'textures/player.png',
};

const images = {};
const floorCache = {};
const objectCache = {};

let _seed=12345;
function resetSeed(s){_seed=s;}
function rng(){_seed=(_seed*9301+49297)%233280;return _seed/233280;}
function rngInt(a,b){return a+Math.floor(rng()*(b-a+1));}
function tileHash(tx,ty,s=0){let h=((tx+s*31)*73856093)^((ty+s*17)*19349663);h=(h^(h>>>16))>>>0;return h;}

const floors=[], objects=[], solidGrid=[];
const saplings = {};
const chests = {};

function inBounds(tx,ty){return tx>=0&&tx<WORLD_W&&ty>=0&&ty<WORLD_H;}
function isFloorWater(tx,ty){return floors[ty][tx]===F_WATER;}

function updateSolidAt(tx,ty){
  const o=objects[ty][tx];
  if(o!==null&&ITEMS[o].solid){solidGrid[ty][tx]=true;return;}
  solidGrid[ty][tx]=ITEMS[floors[ty][tx]].solid;
}
function rebuildSolidGrid(){
  for(let y=0;y<WORLD_H;y++){solidGrid[y]=[];for(let x=0;x<WORLD_W;x++)updateSolidAt(x,y);}
}
function isSolid(tx,ty){
  if(tx<0||tx>=WORLD_W||ty<0||ty>=WORLD_H)return true;
  return solidGrid[ty][tx];
}
function paintFloorCircle(cx,cy,r,type,allowed){
  for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
    if(x<0||x>=WORLD_W||y<0||y>=WORLD_H)continue;
    const dx=x-cx,dy=y-cy;
    if(dx*dx+dy*dy<=r*r&&allowed.includes(floors[y][x]))floors[y][x]=type;
  }
}
function plantTree(tx,ty){
  for(let i=0;i<3;i++){
    const yy=ty-i;
    if(!inBounds(tx,yy))return false;
    if(isFloorWater(tx,yy))return false;
  }
  const topY=ty-2;
  for(let dy=-2;dy<=0;dy++)for(let dx=-1;dx<=1;dx++){
    if(dy===-2&&dx!==0)continue;
    const x=tx+dx,y=topY+dy-1;
    if(!inBounds(x,y))continue;
    if(dx===0&&dy===0)continue;
    if(objects[y][x]===null||objects[y][x]===O_LEAVES)objects[y][x]=O_LEAVES;
  }
  if(inBounds(tx,topY-2))if(objects[topY-2][tx]===null)objects[topY-2][tx]=O_LEAVES;
  for(let i=0;i<3;i++)if(inBounds(tx,ty-i))objects[ty-i][tx]=O_TRUNK;
  return true;
}
function growSapling(tx,ty){
  if(objects[ty][tx]!==O_SAPLING)return;
  objects[ty][tx]=null;updateSolidAt(tx,ty);
  plantTree(tx,ty);
  for(let y=ty-5;y<=ty+1;y++)for(let x=tx-3;x<=tx+3;x++)if(inBounds(x,y))updateSolidAt(x,y);
}
function generateWorld(){
  resetSeed(12345);
  for(let y=0;y<WORLD_H;y++){
    floors[y]=[];objects[y]=[];solidGrid[y]=[];
    for(let x=0;x<WORLD_W;x++){floors[y][x]=F_GRASS;objects[y][x]=null;}
  }
  for(const k in saplings)delete saplings[k];
  for(const k in chests)delete chests[k];
  const WATER=2,SAND=2;
  for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){
    const d=Math.min(x,y,WORLD_W-1-x,WORLD_H-1-y);
    if(d<WATER)floors[y][x]=F_WATER;
    else if(d<WATER+SAND)floors[y][x]=F_SAND;
  }
  for(let i=0;i<45;i++)paintFloorCircle(rngInt(6,WORLD_W-7),rngInt(6,WORLD_H-7),rngInt(2,4),F_DIRT,[F_GRASS]);
  for(let i=0;i<35;i++)paintFloorCircle(rngInt(6,WORLD_W-7),rngInt(6,WORLD_H-7),rngInt(1,3),rng()<0.5?F_FLOWERS:F_TALLGRASS,[F_GRASS]);
  for(let i=0;i<12;i++)paintFloorCircle(rngInt(8,WORLD_W-9),rngInt(8,WORLD_H-9),rngInt(1,2),F_GRAVEL,[F_GRASS,F_DIRT]);
  const lakes=[{x:22,y:14,r:4},{x:72,y:12,r:5},{x:50,y:38,r:4},{x:82,y:32,r:5},{x:35,y:22,r:3}];
  for(const l of lakes){
    paintFloorCircle(l.x,l.y,l.r+1,F_SAND,[F_GRASS,F_DIRT,F_FLOWERS,F_TALLGRASS,F_GRAVEL]);
    paintFloorCircle(l.x,l.y,l.r,F_WATER,[F_SAND,F_GRASS,F_DIRT,F_FLOWERS,F_TALLGRASS,F_GRAVEL]);
  }
  for(let i=0;i<25;i++){
    const tx=rngInt(6,WORLD_W-7),ty=rngInt(8,WORLD_H-9);
    if(isFloorWater(tx,ty))continue;
    plantTree(tx,ty);
  }

  const stoneAreas=[{x:30,y:10,r:4},{x:78,y:40,r:5},{x:12,y:35,r:4},{x:55,y:20,r:3}];
  for(const f of stoneAreas){
    for(let y=f.y-f.r;y<=f.y+f.r;y++)for(let x=f.x-f.r;x<=f.x+f.r;x++){
      if(!inBounds(x,y)||isFloorWater(x,y))continue;
      const d=(x-f.x)**2+(y-f.y)**2;
      if(d<=f.r**2&&rng()<0.85)floors[y][x]=F_STONE;
    }
    for(let y=f.y-f.r;y<=f.y+f.r;y++)for(let x=f.x-f.r;x<=f.x+f.r;x++){
      if(!inBounds(x,y)||isFloorWater(x,y))continue;
      const d=(x-f.x)**2+(y-f.y)**2;
      if(d<=f.r**2&&rng()<0.45&&objects[y][x]===null)objects[y][x]=O_STONE;
    }
  }

  for(let i=0;i<6;i++){
    const cx=rngInt(10,WORLD_W-10),cy=rngInt(10,WORLD_H-10);
    const r=rngInt(2,3);
    for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
      if(!inBounds(x,y)||isFloorWater(x,y))continue;
      const d=(x-cx)**2+(y-cy)**2;
      if(d<=r*r&&objects[y][x]===null&&floors[y][x]!==F_WATER)floors[y][x]=F_STONE;
    }
  }

  for(let v=0;v<3;v++){
    const cx=rngInt(10,WORLD_W-10),cy=rngInt(10,WORLD_H-10);
    for(let i=0;i<4;i++){
      const tx=cx+rngInt(-2,2),ty=cy+rngInt(-2,2);
      if(!inBounds(tx,ty)||isFloorWater(tx,ty))continue;
      if(objects[ty][tx]===O_STONE)objects[ty][tx]=O_IRON_ORE;
    }
  }
  rebuildSolidGrid();
}

const player = {
  x:12*TILE,y:12*TILE,prevX:12*TILE,prevY:12*TILE,
  renderX:12*TILE,renderY:12*TILE,
  r:11,vx:0,vy:0,facing:{x:0,y:1}
};
function ensurePlayerNotStuck(){
  if(isSolid(Math.floor(player.x/TILE),Math.floor(player.y/TILE))){
    for(let r=0;r<20;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const tx=Math.floor(player.x/TILE)+dx,ty=Math.floor(player.y/TILE)+dy;
      if(!inBounds(tx,ty))continue;
      if(!isSolid(tx,ty)){player.x=tx*TILE+TILE/2;player.y=ty*TILE+TILE/2;return;}
    }
  }
}
function resetPlayer(){
  player.x=12*TILE;player.y=12*TILE;
  player.prevX=player.x;player.prevY=player.y;
  player.renderX=player.x;player.renderY=player.y;
  player.vx=0;player.vy=0;player.facing={x:0,y:1};
  ensurePlayerNotStuck();
}

const inventory = new Array(INV_COLS*INV_ROWS).fill(null);
const hotbar = new Array(HOTBAR_SIZE).fill(null);
let selectedHotbarSlot = 0;

function resetInventory(){
  for(let i=0;i<inventory.length;i++)inventory[i]=null;
  for(let i=0;i<hotbar.length;i++)hotbar[i]=null;
  selectedHotbarSlot=0;
}
function isStackable(id){const it=ITEMS[id];return !(it&&it.kind==='tool');}
function tryStack(arr,type,count){
  if(!isStackable(type))return false;
  for(const s of arr)if(s&&s.type===type&&s.count<99){s.count+=count;return true;}
  return false;
}
function tryEmpty(arr,type,count){
  for(let i=0;i<arr.length;i++)if(!arr[i]){arr[i]={type,count};return true;}
  return false;
}

function addToInventory(type,count=1){
  if(isStackable(type)&&tryStack(hotbar,type,count))return true;
  if(isStackable(type)&&tryStack(inventory,type,count))return true;
  if(tryEmpty(hotbar,type,count))return true;
  if(tryEmpty(inventory,type,count))return true;
  return false;
}

function getSelectedTool(){
  const s=hotbar[selectedHotbarSlot];
  if(!s)return null;
  const it=ITEMS[s.type];
  if(it&&it.kind==='tool')return {tool:it.tool,tier:it.tier};
  return null;
}

let uiMode = null;
let uiCraftSlots = new Array(9).fill(null);
let uiCraftSize = 2;
let uiCraftResult = null;
let furnaceTarget = null;
let furnaceInput = null, furnaceFuel = null, furnaceOutput = null;
let furnaceProgress = 0, furnaceBurning = false, furnaceBurnUntil = 0;
let chestSlots = null;
let chestTarget = null;
let dragging = null;
let showRecipes = false;
let recipePage = 0;

function slotKey(s){return SAVE_KEY_PREFIX+s;}
function hasSave(s){return !!localStorage.getItem(slotKey(s));}

function saveGame(slot){
  try{
    const chestsCopy = {};
    for(const k in chests)chestsCopy[k]=chests[k].map(s=>s?{...s}:null);
    const data={
      version:SAVE_VERSION,timestamp:Date.now(),
      floors:floors.map(r=>r.slice()),
      objects:objects.map(r=>r.slice()),
      saplings:{...saplings},chests:chestsCopy,
      player:{x:player.x,y:player.y,facing:{...player.facing}},
      inventory:inventory.map(s=>s?{...s}:null),
      hotbar:hotbar.map(s=>s?{...s}:null),
      selectedHotbarSlot,
    };
    localStorage.setItem(slotKey(slot),JSON.stringify(data));
    return true;
  }catch(e){console.error('Ошибка сохранения:',e);return false;}
}
function loadGame(slot){
  const raw=localStorage.getItem(slotKey(slot));
  if(!raw)return false;
  try{
    const data=JSON.parse(raw);
    if(data.version===1){if(!migrateV1(data))return false;}
    else if(data.version===2){if(!migrateV2(data))return false;}
    else if(data.version===SAVE_VERSION){if(!loadCurrent(data))return false;}
    else{console.warn('Неизвестная версия:',data.version);return false;}
    rebuildSolidGrid();ensurePlayerNotStuck();return true;
  }catch(e){console.error('Ошибка загрузки:',e);return false;}
}
function loadCurrent(data){
  if(!data.floors||data.floors.length!==WORLD_H)return false;
  floors.length=0;
  for(let y=0;y<WORLD_H;y++)floors[y]=data.floors[y].slice(0,WORLD_W);
  objects.length=0;
  for(let y=0;y<WORLD_H;y++){
    objects[y]=(data.objects&&data.objects[y])?data.objects[y].slice(0,WORLD_W):[];
    if(objects[y].length!==WORLD_W)objects[y]=new Array(WORLD_W).fill(null);
  }
  for(const k in saplings)delete saplings[k];
  if(data.saplings)for(const k in data.saplings)saplings[k]=data.saplings[k];
  for(const k in chests)delete chests[k];
  if(data.chests)for(const k in data.chests)chests[k]=data.chests[k].map(s=>s?{type:s.type,count:s.count}:null);
  if(data.player){
    player.x=data.player.x??12*TILE;player.y=data.player.y??12*TILE;
    player.vx=0;player.vy=0;
    player.facing=data.player.facing?{...data.player.facing}:{x:0,y:1};
  }
  if(Array.isArray(data.inventory))
    for(let i=0;i<inventory.length;i++){const s=data.inventory[i];inventory[i]=s?{type:s.type,count:s.count}:null;}
  if(Array.isArray(data.hotbar))
    for(let i=0;i<hotbar.length;i++){const s=data.hotbar[i];hotbar[i]=s?{type:s.type,count:s.count}:null;}
  selectedHotbarSlot=data.selectedHotbarSlot??0;
  return true;
}
const V1_MIGRATION = {
  0:{f:F_GRASS,o:null},1:{f:F_DIRT,o:null},2:{f:F_DIRT,o:O_STONE},3:{f:F_DIRT,o:O_STONE},
  4:{f:F_GRASS,o:O_TRUNK},5:{f:F_GRASS,o:O_STONE},6:{f:F_SAND,o:null},7:{f:F_WATER,o:null},
  8:{f:F_FLOWERS,o:null},9:{f:F_TALLGRASS,o:null},10:{f:F_GRAVEL,o:null},
};
const V1_ITEM_MIGRATION = {0:0,1:1,6:2,7:3,8:4,9:5,10:6,2:10,3:10,4:I_LOG,5:10,100:I_WOOD_PICK,101:I_WOOD_AXE};
function migrateV1(data){
  if(!data.world||data.world.length!==WORLD_H)return false;
  floors.length=0;objects.length=0;
  for(let y=0;y<WORLD_H;y++){
    floors[y]=[];objects[y]=[];
    for(let x=0;x<WORLD_W;x++){
      const m=V1_MIGRATION[data.world[y][x]]||{f:F_DIRT,o:null};
      floors[y][x]=m.f;objects[y][x]=m.o;
    }
  }
  if(data.player){
    player.x=data.player.x??12*TILE;player.y=data.player.y??12*TILE;
    player.vx=0;player.vy=0;player.facing={x:0,y:1};
  }
  const oldInv=Array.isArray(data.inventory)?data.inventory:[];
  for(let i=0;i<inventory.length;i++)inventory[i]=null;
  for(let i=0;i<hotbar.length;i++)hotbar[i]=null;
  for(let i=0;i<Math.min(10,oldInv.length);i++){
    const s=oldInv[i];if(!s)continue;
    hotbar[i]={type:V1_ITEM_MIGRATION[s.type]??s.type,count:s.count};
  }
  for(let i=10;i<Math.min(40,oldInv.length);i++){
    const s=oldInv[i];if(!s)continue;
    inventory[i-10]={type:V1_ITEM_MIGRATION[s.type]??s.type,count:s.count};
  }
  selectedHotbarSlot=data.selectedSlot??0;
  return true;
}
const V2_MIGRATION = {10:O_STONE,11:O_STONE,12:O_TRUNK,13:O_STONE,14:O_IRON_ORE,15:O_IRON_ORE,16:O_STONE};
function migrateV2(data){
  if(!data.floors||data.floors.length!==WORLD_H)return false;
  floors.length=0;
  for(let y=0;y<WORLD_H;y++)floors[y]=data.floors[y].slice(0,WORLD_W);
  objects.length=0;
  for(let y=0;y<WORLD_H;y++){
    objects[y]=[];
    for(let x=0;x<WORLD_W;x++){
      const oldObj=data.objects&&data.objects[y]?data.objects[y][x]:null;
      if(oldObj===null||oldObj===undefined){objects[y][x]=null;continue;}
      objects[y][x]=V2_MIGRATION[oldObj]!==undefined?V2_MIGRATION[oldObj]:null;
    }
  }
  if(data.player){
    player.x=data.player.x??12*TILE;player.y=data.player.y??12*TILE;
    player.vx=0;player.vy=0;player.facing={x:0,y:1};
  }
  const oldInv=Array.isArray(data.inventory)?data.inventory:[];
  for(let i=0;i<inventory.length;i++)inventory[i]=null;
  for(let i=0;i<hotbar.length;i++)hotbar[i]=null;
  for(let i=0;i<10&&i<oldInv.length;i++){
    const s=oldInv[i];if(!s)continue;
    hotbar[i]={type:s.type,count:s.count};
  }
  for(let i=10;i<40&&i<oldInv.length;i++){
    const s=oldInv[i];if(!s)continue;
    inventory[i-10]={type:s.type,count:s.count};
  }
  selectedHotbarSlot=data.selectedSlot??0;
  return true;
}
function deleteSave(slot){localStorage.removeItem(slotKey(slot));}
function getSaveInfo(slot){
  const raw=localStorage.getItem(slotKey(slot));
  if(!raw)return null;
  try{
    const d=JSON.parse(raw);
    if(!d.timestamp)return null;
    const t=new Date(d.timestamp),p=n=>String(n).padStart(2,'0');
    const v=d.version===1?' (v1)':d.version===2?' (v2)':'';
    return `${p(t.getDate())}.${p(t.getMonth()+1)}.${t.getFullYear()} ${p(t.getHours())}:${p(t.getMinutes())}${v}`;
  }catch{return null;}
}

let autosaveTimer=null, autosaveToastTimer=null;
function showAutosaveToast(){
  const el=document.getElementById('autosave-toast');if(!el)return;
  el.classList.remove('hidden');
  if(autosaveToastTimer)clearTimeout(autosaveToastTimer);
  autosaveToastTimer=setTimeout(()=>el.classList.add('hidden'),1500);
}
function startAutosave(){
  stopAutosave();
  autosaveTimer=setInterval(()=>{
    if(gameState==='playing'&&currentSlot!==null)if(saveGame(currentSlot))showAutosaveToast();
  },AUTOSAVE_INTERVAL);
}
function stopAutosave(){if(autosaveTimer){clearInterval(autosaveTimer);autosaveTimer=null;}}

function loadTextures(){
  const ps=[];
  for(const [id,path] of Object.entries(TEXTURE_PATHS.items))ps.push(loadImage(`item_${id}`,path));
  ps.push(loadImage('player',TEXTURE_PATHS.player));
  return Promise.all(ps);
}
function loadImage(key,path){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{if(img.naturalWidth>0&&img.naturalHeight>0)images[key]=img;res();};
    img.onerror=()=>{console.warn(`⚠️ Нет текстуры: ${path}`);res();};
    img.src=path;
  });
}
function getItemImage(id){
  const img=images[`item_${id}`];
  return (img&&img.complete&&img.naturalWidth>0)?img:null;
}
function getPlayerImage(){
  const img=images.player;
  return (img&&img.complete&&img.naturalWidth>0)?img:null;
}

function buildTileCaches(){
  for(const idStr in ITEMS){
    const id=parseInt(idStr);
    const item=ITEMS[id];
    if(!item)continue;
    if(item.layer==='floor'){
      if(id===F_WATER)continue;
      const arr=[];
      for(let v=0;v<TILE_VARIANTS;v++)arr.push(makeFloorCanvas(id,v));
      floorCache[id]=arr;
    }else if(item.layer==='object'){
      const arr=[];
      for(let v=0;v<TILE_VARIANTS;v++)arr.push(makeObjectCanvas(id,v));
      objectCache[id]=arr;
    }
  }
}
function makeFloorCanvas(id,variant){
  const c=document.createElement('canvas');
  c.width=TILE;c.height=TILE;
  const g=c.getContext('2d');
  drawFloorToCtx(g,id,(variant*2654435761+id*40503)>>>0);
  return c;
}
function makeObjectCanvas(id,variant){
  const c=document.createElement('canvas');
  c.width=TILE+OBJ_PAD*2;c.height=TILE+OBJ_PAD*2;
  const g=c.getContext('2d');
  g.fillStyle='rgba(0,0,0,0.28)';
  g.fillRect(OBJ_PAD+3,OBJ_PAD+3,TILE,TILE);
  drawObjectToCtx(g,id,(variant*2246822519+id*3266489917)>>>0,OBJ_PAD,OBJ_PAD);
  return c;
}
function drawFloorToCtx(g,id,hash){
  const def=ITEMS[id];
  g.fillStyle=def.color;g.fillRect(0,0,TILE,TILE);
  if(id===F_GRASS){
    g.strokeStyle='rgba(30, 90, 30, 0.55)';g.lineWidth=1.5;
    for(let i=0;i<6;i++){
      const s=(hash+i*7919)>>>0;
      const gx=3+(s%(TILE-6)),gy=6+((s>>8)%(TILE-12));
      const lean=((s>>16)%3)-1;
      g.beginPath();g.moveTo(gx,gy+5);g.lineTo(gx+lean,gy);g.stroke();
    }
    g.fillStyle='rgba(20, 60, 20, 0.25)';
    for(let i=0;i<3;i++){
      const s=(hash+i*3571)>>>0;
      g.fillRect(4+(s%(TILE-8)),4+((s>>8)%(TILE-8)),2,2);
    }
  }else if(id===F_DIRT){
    g.fillStyle='rgba(60, 35, 15, 0.35)';
    for(let i=0;i<5;i++){const s=(hash+i*4241)>>>0;g.fillRect(4+(s%(TILE-8)),4+((s>>8)%(TILE-8)),2,2);}
    g.fillStyle='rgba(160, 120, 80, 0.2)';
    for(let i=0;i<3;i++){const s=(hash+i*9973)>>>0;g.fillRect(6+(s%(TILE-12)),6+((s>>8)%(TILE-12)),2,2);}
  }else if(id===F_SAND){
    g.strokeStyle='rgba(180, 160, 100, 0.4)';g.lineWidth=1;
    for(let i=0;i<3;i++){
      const yy=8+i*8;
      g.beginPath();g.moveTo(3,yy);g.quadraticCurveTo(TILE/2,yy-2,TILE-3,yy);g.stroke();
    }
  }else if(id===F_FLOWERS){
    g.strokeStyle='rgba(40, 100, 40, 0.6)';g.lineWidth=1.5;
    for(let i=0;i<4;i++){const gx=5+i*7;g.beginPath();g.moveTo(gx,TILE-4);g.lineTo(gx+1,12);g.stroke();}
    g.fillStyle='rgba(255, 200, 50, 0.95)';
    g.beginPath();g.arc(10,10,2.5,0,Math.PI*2);g.arc(22,16,2.5,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255, 100, 150, 0.95)';
    g.beginPath();g.arc(16,22,2.5,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255, 240, 100, 1)';
    g.beginPath();g.arc(10,10,1,0,Math.PI*2);g.arc(22,16,1,0,Math.PI*2);g.arc(16,22,1,0,Math.PI*2);g.fill();
  }else if(id===F_TALLGRASS){
    g.strokeStyle='rgba(30, 80, 30, 0.8)';g.lineWidth=1.8;
    for(let i=0;i<5;i++){
      const gx=4+i*6;const lean=((i%2)?1:-1)*2;
      g.beginPath();g.moveTo(gx,TILE-3);g.quadraticCurveTo(gx+lean,16,gx+lean*2,8);g.stroke();
    }
  }else if(id===F_GRAVEL){
    for(let i=0;i<6;i++){
      const s=(hash+i*3181)>>>0;
      const gx=4+(s%(TILE-8)),gy=4+((s>>8)%(TILE-8));
      g.fillStyle='rgba(60, 60, 60, 0.5)';g.fillRect(gx,gy,3,3);
      g.fillStyle='rgba(180, 180, 170, 0.5)';g.fillRect(gx+1,gy+1,1,1);
    }
  }else if(id===F_STONE){
    g.fillStyle='#5a5a5a';g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.08)';g.fillRect(0,0,TILE,3);
    g.strokeStyle='rgba(0,0,0,0.35)';g.lineWidth=1;
    g.beginPath();g.moveTo(0,TILE/2);g.lineTo(TILE,TILE/2);g.stroke();
    g.beginPath();g.moveTo(TILE/2,0);g.lineTo(TILE/2,TILE);g.stroke();
    for(let i=0;i<3;i++){
      const s=(hash+i*6151)>>>0;
      const cx=4+(s%(TILE-8)),cy=4+((s>>8)%(TILE-8));
      g.fillStyle='rgba(0,0,0,0.22)';
      g.beginPath();g.arc(cx,cy,2,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=1;
    for(let i=0;i<2;i++){
      const s=(hash+i*9973)>>>0;
      const x1=4+(s%(TILE-8)),y1=4+((s>>8)%(TILE-8));
      g.beginPath();
      g.moveTo(x1,y1);
      g.lineTo(x1+5,y1+3);
      g.lineTo(x1+3,y1+7);
      g.stroke();
    }
  }
  g.strokeStyle='rgba(0,0,0,0.15)';g.lineWidth=1;
  g.strokeRect(0.5,0.5,TILE-1,TILE-1);
}

function drawObjectToCtx(g,id,hash,px,py){
  if(id===O_STONE){
    g.fillStyle='#7a7a7a';g.fillRect(px,py,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.12)';g.fillRect(px,py,TILE,3);
    for(let i=0;i<3;i++){
      const s=(hash+i*6151)>>>0;
      const cx=px+6+(s%(TILE-12)),cy=py+6+((s>>8)%(TILE-12));
      const r=2+((s>>16)%3);
      g.fillStyle='rgba(0,0,0,0.28)';g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();
      g.fillStyle='rgba(255,255,255,0.10)';g.beginPath();g.arc(cx+0.5,cy+0.8,r*0.6,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='rgba(0,0,0,0.35)';g.lineWidth=1;
    const sx1=px+4+(hash%(TILE-10)),sy1=py+4+((hash>>4)%(TILE-10));
    g.beginPath();g.moveTo(sx1,sy1);g.lineTo(sx1+5,sy1+3);g.lineTo(sx1+3,sy1+7);g.stroke();
  }else if(id===O_TRUNK){
    g.fillStyle='#a0522d'; 
    g.fillRect(px+4, py, TILE-8, TILE); 
    g.fillStyle='#3e2723';
    g.fillRect(px, py, 5, TILE);
    g.fillRect(px+TILE-5, py, 5, TILE);
    g.strokeStyle='rgba(80, 40, 20, 0.4)';
    g.lineWidth=1;
    for(let i=0; i<3; i++){
        let lx = px + 6 + i*6;
        g.beginPath();
        g.moveTo(lx, py);
        g.lineTo(lx, py+TILE);
        g.stroke();
    }
    const kx=px+8+(hash%(TILE-16)),ky=py+8+((hash>>4)%(TILE-16));
    g.fillStyle='rgba(60, 20, 0, 0.5)';g.beginPath();g.ellipse(kx,ky,3,4,0,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(140, 70, 30, 0.8)';g.beginPath();g.ellipse(kx,ky,1.5,2,0,0,Math.PI*2);g.fill();
  }else if(id===O_LEAVES){
    g.fillStyle='#3a8a3a';g.fillRect(px,py,TILE,TILE);
    for(let i=0;i<7;i++){
      const s=(hash+i*3571)>>>0;
      g.fillStyle='rgba(20, 60, 20, 0.5)';
      g.beginPath();g.arc(px+3+(s%(TILE-6)),py+3+((s>>8)%(TILE-6)),2+((s>>16)%2),0,Math.PI*2);g.fill();
    }
    for(let i=0;i<5;i++){
      const s=(hash+i*7919)>>>0;
      g.fillStyle='rgba(120, 200, 100, 0.4)';
      g.beginPath();g.arc(px+4+(s%(TILE-8)),py+4+((s>>8)%(TILE-8)),1.5,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='rgba(0,0,0,0.4)';g.lineWidth=1;
    g.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
  }else if(id===O_SAPLING){
    g.fillStyle='rgba(0,0,0,0.15)';g.fillRect(px,py,TILE,TILE);
    g.fillStyle='rgba(90, 60, 30, 0.5)';
    g.beginPath();g.ellipse(px+TILE/2,py+TILE-6,8,3,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#6b3a1a';g.lineWidth=2;
    g.beginPath();g.moveTo(px+TILE/2,py+TILE-6);g.lineTo(px+TILE/2,py+TILE/2);g.stroke();
    g.fillStyle='#3a8a3a';
    g.beginPath();g.arc(px+TILE/2-5,py+TILE/2+2,5,0,Math.PI*2);g.fill();
    g.beginPath();g.arc(px+TILE/2+5,py+TILE/2-2,5,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(120, 200, 100, 0.5)';
    g.beginPath();g.arc(px+TILE/2-6,py+TILE/2,1.5,0,Math.PI*2);g.fill();
    g.beginPath();g.arc(px+TILE/2+4,py+TILE/2-3,1.5,0,Math.PI*2);g.fill();
  }else if(id===O_IRON_ORE){
    g.fillStyle='#6a6a6a';g.fillRect(px,py,TILE,TILE);
    for(let i=0;i<2;i++){
      const s=(hash+i*5311)>>>0;
      g.fillStyle='rgba(0,0,0,0.22)';
      g.beginPath();g.arc(px+6+(s%(TILE-12)),py+6+((s>>8)%(TILE-12)),2,0,Math.PI*2);g.fill();
    }
    g.lineCap='round';
    for(let v=0;v<4;v++){
      const s1=(hash+v*9973)>>>0;
      const x1=px+5+(s1%(TILE-10)),y1=py+5+((s1>>8)%(TILE-10));
      const s2=(s1*7919+31)>>>0;
      const x2=Math.max(px+4,Math.min(px+TILE-4,x1+(s2%9)-4));
      const y2=Math.max(py+4,Math.min(py+TILE-4,y1+((s2>>8)%9)-4));
      g.strokeStyle='rgba(0,0,0,0.5)';g.lineWidth=4;
      g.beginPath();g.moveTo(x1+0.5,y1+1);g.lineTo(x2+0.5,y2+1);g.stroke();
      g.strokeStyle='#c8c8d4';g.lineWidth=2.5;
      g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
      g.strokeStyle='#e8e8f4';g.lineWidth=1.2;
      g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
      g.fillStyle='#ffffff';g.beginPath();g.arc(x1,y1,1.3,0,Math.PI*2);g.fill();
    }
    g.fillStyle='rgba(255,255,255,0.10)';g.fillRect(px,py,TILE,2);
  }else if(id===O_TABLE){
    g.fillStyle='#6b3a1a';g.fillRect(px,py,TILE,TILE);
    g.fillStyle='#a0522d';g.fillRect(px+2,py+2,TILE-4,TILE-4);
    g.strokeStyle='rgba(50, 20, 10, 0.6)';
    g.lineWidth=1.5;
    for(let i=1; i<3; i++){
        let lineX = px + 2 + (i * (TILE-4)/3);
        g.beginPath();
        g.moveTo(lineX, py+2);
        g.lineTo(lineX, py+TILE-2);
        g.stroke();
    }
    for(let i=1; i<3; i++){
        let lineY = py + 2 + (i * (TILE-4)/3);
        g.beginPath();
        g.moveTo(px+2, lineY);
        g.lineTo(px+TILE-2, lineY);
        g.stroke();
    }
    g.fillStyle='rgba(255,255,255,0.15)';
    g.fillRect(px+4,py+4,2,2);g.fillRect(px+TILE-6,py+4,2,2);
    g.fillRect(px+4,py+TILE-6,2,2);g.fillRect(px+TILE-6,py+TILE-6,2,2);
  }else if(id===O_FURNACE){
    g.fillStyle='#5a5a5a';g.fillRect(px,py,TILE,TILE);
    g.strokeStyle='rgba(0,0,0,0.3)';g.lineWidth=1;
    g.strokeRect(px+2,py+2,TILE-4,TILE-4);
    g.fillStyle='#1a1a1a';g.fillRect(px+8,py+12,TILE-16,TILE-16);
    g.fillStyle='#ff8a3a';
    g.beginPath();g.moveTo(px+TILE/2-3,py+TILE-6);g.lineTo(px+TILE/2,py+14);g.lineTo(px+TILE/2+3,py+TILE-6);g.closePath();g.fill();
    g.fillStyle='#ffd700';
    g.beginPath();g.moveTo(px+TILE/2-1,py+TILE-8);g.lineTo(px+TILE/2,py+TILE-14);g.lineTo(px+TILE/2+1,py+TILE-8);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,0.15)';g.fillRect(px,py,TILE,3);
  }else if(id===O_CHEST){
    g.fillStyle='#4a2810';g.fillRect(px,py,TILE,TILE);
    g.fillStyle='#8a5025';g.fillRect(px+2,py+6,TILE-4,TILE-8);
    g.fillStyle='#a0522d';g.fillRect(px+2,py+4,TILE-4,8);
    g.fillStyle='#2a1808';g.fillRect(px+2,py+12,TILE-4,1.5);
    g.fillStyle='#5a5a5a';
    g.fillRect(px+5,py+4,2,TILE-8);
    g.fillRect(px+TILE-7,py+4,2,TILE-8);
    g.fillStyle='#ffd700';g.fillRect(px+TILE/2-3,py+11,6,5);
    g.fillStyle='#1a1a1a';g.fillRect(px+TILE/2-1,py+13,2,2);
    g.fillStyle='rgba(255,200,140,0.2)';g.fillRect(px,py,TILE,2);
  }else{
    g.fillStyle=ITEMS[id].color;g.fillRect(px,py,TILE,TILE);
  }
  g.strokeStyle='rgba(0,0,0,0.5)';g.lineWidth=1;
  g.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
}

// ВВОД
const keys={};
const mouse={x:0,y:0,left:false,right:false};
const RU={ 'ц':'w','ф':'a','ы':'s','в':'d' };
function isDown(...n){for(const k of n)if(keys[k])return true;return false;}

document.addEventListener('keydown',e=>{
  const code=e.code||'';const key=(e.key||'').toLowerCase();
  if(code)keys[code]=true;if(key)keys[key]=true;if(RU[key])keys[RU[key]]=true;
  if(code==='Space'||key===' ')e.preventDefault();

  if(code==='Escape'||key==='escape'){
    if(showRecipes){showRecipes=false;return;}
    if(uiMode){closeUI();return;}
    if(gameState==='playing')pauseGame();
    else if(gameState==='paused')resumeGame();
    return;
  }
  if(code==='Tab'||key==='tab'){
    e.preventDefault();
    if(gameState==='playing'||gameState==='paused-ui'){
      if(showRecipes)return;
      if(uiMode==='inventory')closeUI();
      else if(!uiMode)openInventory();
    }
    return;
  }
  if(gameState!=='playing')return;
  if(code.startsWith('Digit')){
    const n=parseInt(code.slice(5),10);
    if(n>=1&&n<=9)selectedHotbarSlot=n-1;
    else if(n===0)selectedHotbarSlot=9;
  }
  if(e.key>='1'&&e.key<='9')selectedHotbarSlot=+e.key-1;
  if(e.key==='0')selectedHotbarSlot=9;
});
document.addEventListener('keyup',e=>{
  const code=e.code||'';const key=(e.key||'').toLowerCase();
  if(code)keys[code]=false;if(key)keys[key]=false;if(RU[key])keys[RU[key]]=false;
});

canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  mouse.x=(e.clientX-r.left)*(canvas.width/r.width);
  mouse.y=(e.clientY-r.top)*(canvas.height/r.height);
  
  if(dragging){
      dragging.x=mouse.x;
      dragging.y=mouse.y;
  }
});

canvas.addEventListener('mousedown',e=>{
  if(e.button===0)mouse.left=true;
  if(e.button===2){mouse.right=true;placingCooldown=0;}
  e.preventDefault();
  if(e.button===0)handleLeftClick();
  if(e.button===2)handleRightClick();
});

canvas.addEventListener('mouseup',e=>{
  if(e.button===0){mouse.left=false;handleLeftRelease();}
  if(e.button===2){mouse.right=false;handleRightRelease();}
});

canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{
  if(gameState==='playing'&&!uiMode&&!showRecipes){
    selectedHotbarSlot=(selectedHotbarSlot+(e.deltaY>0?1:-1)+HOTBAR_SIZE)%HOTBAR_SIZE;
  }
  e.preventDefault();
},{passive:false});

function resizeCanvas(){canvas.width=innerWidth;canvas.height=innerHeight;}
window.addEventListener('resize',resizeCanvas);

const camera={x:0,y:0};
function updateCamera(){
  const wW=WORLD_W*TILE,wH=WORLD_H*TILE;
  let cx=player.renderX-canvas.width/2,cy=player.renderY-canvas.height/2;
  if(wW<=canvas.width)cx=(wW-canvas.width)/2;
  else cx=Math.max(0,Math.min(wW-canvas.width,cx));
  if(wH<=canvas.height)cy=(wH-canvas.height)/2;
  else cy=Math.max(0,Math.min(wH-canvas.height,cy));
  camera.x=cx;camera.y=cy;
}

function updatePlayer(dt){
  if(uiMode||showRecipes)return;
  let dx=0,dy=0;
  if(isDown('KeyA','ArrowLeft','a','ф'))dx-=1;
  if(isDown('KeyD','ArrowRight','d','в'))dx+=1;
  if(isDown('KeyW','ArrowUp','w','ц'))dy-=1;
  if(isDown('KeyS','ArrowDown','s','ы'))dy+=1;
  if(dx!==0&&dy!==0){const l=Math.sqrt(dx*dx+dy*dy);dx/=l;dy/=l;}
  if(dx!==0||dy!==0){player.facing.x=dx;player.facing.y=dy;}
  player.vx=dx*MOVE_SPEED;player.vy=dy*MOVE_SPEED;
  player.x+=dx*MOVE_SPEED;resolveAxis('x');
  player.y+=dy*MOVE_SPEED;resolveAxis('y');
}
function resolveAxis(axis){
  const r=player.r;
  const minTX=Math.floor((player.x-r)/TILE),maxTX=Math.floor((player.x+r)/TILE);
  const minTY=Math.floor((player.y-r)/TILE),maxTY=Math.floor((player.y+r)/TILE);
  const rSq=r*r;
  for(let ty=minTY;ty<=maxTY;ty++)for(let tx=minTX;tx<=maxTX;tx++){
    if(!isSolid(tx,ty))continue;
    const cx=Math.max(tx*TILE,Math.min(player.x,tx*TILE+TILE));
    const cy=Math.max(ty*TILE,Math.min(player.y,ty*TILE+TILE));
    const dx=player.x-cx,dy=player.y-cy,dSq=dx*dx+dy*dy;
    if(dSq<rSq){
      const dist=Math.sqrt(dSq)||0.001;
      if(axis==='x'){
        if(player.vx>0)player.x=tx*TILE-r;
        else if(player.vx<0)player.x=tx*TILE+TILE+r;
        else player.x+=(dx/dist)*(r-dist);
        player.vx=0;
      }else{
        if(player.vy>0)player.y=ty*TILE-r;
        else if(player.vy<0)player.y=ty*TILE+TILE+r;
        else player.y+=(dy/dist)*(r-dist);
        player.vy=0;
      }
    }
  }
}

function mouseTile(){return {tx:Math.floor((mouse.x+camera.x)/TILE),ty:Math.floor((mouse.y+camera.y)/TILE)};}
function inReach(tx,ty){
  const cx=tx*TILE+TILE/2,cy=ty*TILE+TILE/2;
  const dx=cx-player.x,dy=cy-player.y;
  return dx*dx+dy*dy<=(REACH*TILE)**2;
}

let miningTarget=null,miningProgress=0,miningBlocked=false;
let placingCooldown=0;

function updateMining(dt){
  if(uiMode||showRecipes){miningTarget=null;miningProgress=0;return;}
  if(!mouse.left){miningTarget=null;miningProgress=0;miningBlocked=false;return;}
  const {tx,ty}=mouseTile();
  if(!inBounds(tx,ty)||!inReach(tx,ty)){miningTarget=null;miningProgress=0;return;}

  const oid=objects[ty][tx];

  if(oid!==null){
    const item=ITEMS[oid];
    if(!item||!item.hardness){miningTarget=null;miningProgress=0;return;}
    if(!miningTarget||miningTarget.tx!==tx||miningTarget.ty!==ty){
      miningTarget={tx,ty};miningProgress=0;miningBlocked=false;
    }
    const sel=getSelectedTool();
    if(item.requiredTool){
      if(!sel||sel.tool!==item.requiredTool){miningBlocked=true;miningProgress=0;return;}
      if(item.requiredTier&&sel.tier<item.requiredTier){miningBlocked=true;miningProgress=0;return;}
    }
    miningBlocked=false;
    let speed=1;
    if(item.speedupTool&&sel&&sel.tool===item.speedupTool)speed=3;
    miningProgress+=(dt*1000*speed)/item.hardness;
    if(miningProgress>=1){
      breakBlock(tx,ty,oid);
      miningTarget=null;miningProgress=0;
    }
    return;
  }

  if(floors[ty][tx]===F_STONE){
    if(!miningTarget||miningTarget.tx!==tx||miningTarget.ty!==ty){
      miningTarget={tx,ty};miningProgress=0;miningBlocked=false;
    }
    const sel=getSelectedTool();
    let speed=1;
    if(sel&&sel.tool==='pickaxe')speed=3;
    miningProgress+=(dt*1000*speed)/2500;
    if(miningProgress>=1){
      addToInventory(O_STONE,1);
      miningProgress=0;
    }
    return;
  }

  miningTarget=null;miningProgress=0;miningBlocked=false;
}

function breakBlock(tx,ty,oid){
  if(oid===O_TRUNK){
    addToInventory(I_LOG,1);

    let hasLeaves=false;
    for(let dy=-3;dy<=1&&!hasLeaves;dy++){
      for(let dx=-2;dx<=2&&!hasLeaves;dx++){
        if(dx===0&&dy===0)continue;
        const nx=tx+dx,ny=ty+dy;
        if(!inBounds(nx,ny))continue;
        if(objects[ny][nx]===O_LEAVES){hasLeaves=true;}
      }
    }

    if(hasLeaves && Math.random()<0.5){
      addToInventory(O_SAPLING,1);
    }
  } else if(oid===O_LEAVES){
  } else if(oid===O_CHEST){
    const key=`${tx},${ty}`;
    const items=chests[key];
    if(items){
      for(const s of items)if(s)addToInventory(s.type,s.count);
      delete chests[key];
    }
    addToInventory(O_CHEST,1);
  } else {
    addToInventory(oid,1);
  }

  objects[ty][tx]=null;
  updateSolidAt(tx,ty);
  if(oid===O_SAPLING){delete saplings[`${tx},${ty}`];}
}

function updatePlacing(dt){
  if(placingCooldown>0){placingCooldown-=dt;if(placingCooldown<0)placingCooldown=0;}
  if(uiMode||showRecipes)return;
  if(!mouse.right)return;
  if(placingCooldown>0)return;
  const {tx,ty}=mouseTile();
  if(!inBounds(tx,ty)||!inReach(tx,ty))return;
  if(objects[ty][tx]===O_TABLE){openTable(tx,ty);placingCooldown=0.3;return;}
  if(objects[ty][tx]===O_FURNACE){openFurnace(tx,ty);placingCooldown=0.3;return;}
  if(objects[ty][tx]===O_CHEST){openChest(tx,ty);placingCooldown=0.3;return;}
  const slot=hotbar[selectedHotbarSlot];
  if(!slot)return;
  const item=ITEMS[slot.type];
  if(!item||item.kind==='tool')return;
  const cx=tx*TILE+TILE/2,cy=ty*TILE+TILE/2;
  const dx=cx-player.x,dy=cy-player.y;
  const minD=player.r+TILE/2;
  if(dx*dx+dy*dy<minD*minD)return;
  if(slot.type===O_SAPLING){
    if(objects[ty][tx]!==null)return;
    const fl=floors[ty][tx];
    if(fl!==F_GRASS&&fl!==F_DIRT)return;
    objects[ty][tx]=O_SAPLING;
    saplings[`${tx},${ty}`]=Date.now();
    updateSolidAt(tx,ty);
    slot.count--;if(slot.count<=0)hotbar[selectedHotbarSlot]=null;
    placingCooldown=0.15;return;
  }
  if(item.layer==='object'){
    if(objects[ty][tx]!==null)return;
    if(isFloorWater(tx,ty))return;
    objects[ty][tx]=slot.type;
    if(slot.type===O_CHEST)chests[`${tx},${ty}`]=new Array(INV_COLS*CHEST_ROWS).fill(null);
    updateSolidAt(tx,ty);
    slot.count--;if(slot.count<=0)hotbar[selectedHotbarSlot]=null;
    placingCooldown=0.15;
  }else if(item.layer==='floor'){
    if(isFloorWater(tx,ty))return;
    if(floors[ty][tx]===slot.type)return;
    floors[ty][tx]=slot.type;updateSolidAt(tx,ty);
    slot.count--;if(slot.count<=0)hotbar[selectedHotbarSlot]=null;
    placingCooldown=0.15;
  }
}
function updateSaplings(){
  const now=Date.now();
  for(const k in saplings){
    if(now-saplings[k]>=SAPLING_GROW_MS){
      const [x,y]=k.split(',').map(Number);
      if(inBounds(x,y)&&objects[y][x]===O_SAPLING)growSapling(x,y);
      delete saplings[k];
    }
  }
}

function normalizePattern(pattern){
  const h=pattern.length,w=pattern[0].length;
  let minY=h,minX=w,maxY=-1,maxX=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(pattern[y][x]!==null){
      if(y<minY)minY=y;if(x<minX)minX=x;
      if(y>maxY)maxY=y;if(x>maxX)maxX=x;
    }
  }
  if(maxY<0)return null;
  const nh=maxY-minY+1,nw=maxX-minX+1;
  const out=[];
  for(let y=0;y<nh;y++){const row=[];for(let x=0;x<nw;x++)row.push(pattern[minY+y][minX+x]);out.push(row);}
  return {pattern:out,w:nw,h:nh};
}
function recipeMatches(pattern,slots,size){
  const nb=normalizePattern(pattern);
  if(!nb)return false;
  if(nb.h>size||nb.w>size)return false;
  const {pattern:p,w:pw,h:ph}=nb;
  for(let oy=0;oy<=size-ph;oy++)for(let ox=0;ox<=size-pw;ox++){
    let ok=true;
    for(let y=0;y<size&&ok;y++)for(let x=0;x<size&&ok;x++){
      const slot=slots[y*size+x];
      const slotId=slot?slot.type:null;
      const pY=y-oy,pX=x-ox;
      let expected=null;
      if(pY>=0&&pY<ph&&pX>=0&&pX<pw)expected=p[pY][pX];
      if(expected!==slotId){ok=false;break;}
    }
    if(ok)return true;
  }
  return false;
}
function findRecipe(slots,size){
  for(const r of RECIPES){
    const ph=r.pattern.length,pw=r.pattern[0].length;
    if(ph>size||pw>size)continue;
    if(r.table==='table'&&size<3)continue;
    if(recipeMatches(r.pattern,slots,size))return r;
  }
  return null;
}
function tryCraft(){
  const size=uiCraftSize;
  const slots=uiCraftSlots.slice(0,size*size);
  const r=findRecipe(slots,size);
  if(!r)return false;
  for(let i=0;i<size*size;i++){
    const s=uiCraftSlots[i];
    if(s){s.count--;if(s.count<=0)uiCraftSlots[i]=null;}
  }
  const resultItem={type:r.result.id,count:r.result.count};
  if(!addToInventory(resultItem.type,resultItem.count)){
    if(uiCraftResult)uiCraftResult.count+=resultItem.count;
    else uiCraftResult={...resultItem};
  }
  return true;
}
function updateFurnace(dt){
  if(!furnaceTarget)return;
  furnaceProgress=Math.min(1,furnaceProgress);
  const now=Date.now();
  const hasInput=furnaceInput&&(furnaceInput.type===O_IRON_ORE);
  const canOutput=!furnaceOutput||(furnaceOutput.type===I_IRON_INGOT&&furnaceOutput.count<99);
  if(hasInput&&canOutput){
    if(!furnaceBurning){
      if(furnaceFuel&&(furnaceFuel.type===I_LOG||furnaceFuel.type===I_PLANKS||furnaceFuel.type===I_STICK)){
        let burnTime=SMELT_TIME_MS;
        if(furnaceFuel.type===I_PLANKS)burnTime=SMELT_TIME_MS*0.5;
        if(furnaceFuel.type===I_STICK)burnTime=SMELT_TIME_MS*0.25;
        furnaceBurning=true;
        furnaceBurnUntil=now+burnTime;
        furnaceFuel.count--;
        if(furnaceFuel.count<=0)furnaceFuel=null;
      }
    }
    if(furnaceBurning&&now<furnaceBurnUntil){
      furnaceProgress+=(dt*1000)/SMELT_TIME_MS;
      if(furnaceProgress>=1){
        furnaceProgress=0;
        furnaceInput.count--;
        if(furnaceInput.count<=0)furnaceInput=null;
        if(furnaceOutput)furnaceOutput.count++;
        else furnaceOutput={type:I_IRON_INGOT,count:1};
        furnaceBurning=false;
      }
    }else furnaceBurning=false;
  }else furnaceBurning=false;
}

function openInventory(){
  uiMode='inventory';uiCraftSize=2;
  uiCraftSlots=new Array(4).fill(null);uiCraftResult=null;
  showRecipes=false;gameState='paused-ui';
}
function openTable(tx,ty){
  uiMode='table';uiCraftSize=3;
  uiCraftSlots=new Array(9).fill(null);uiCraftResult=null;
  showRecipes=false;gameState='paused-ui';
}
function openFurnace(tx,ty){
  uiMode='furnace';furnaceTarget={tx,ty};
  furnaceInput=null;furnaceFuel=null;furnaceOutput=null;furnaceProgress=0;furnaceBurning=false;
  showRecipes=false;gameState='paused-ui';
}
function openChest(tx,ty){
  const key=`${tx},${ty}`;
  if(!chests[key])chests[key]=new Array(INV_COLS*CHEST_ROWS).fill(null);
  uiMode='chest';chestSlots=chests[key];chestTarget={tx,ty};
  showRecipes=false;gameState='paused-ui';
}
function openRecipes(){showRecipes=true;recipePage=0;}

function closeUI(){
  if(showRecipes){showRecipes=false;return;}
  for(const s of uiCraftSlots)if(s)addToInventory(s.type,s.count);
  if(uiCraftResult)addToInventory(uiCraftResult.type,uiCraftResult.count);
  uiCraftSlots=[];uiCraftResult=null;
  if(uiMode==='furnace'){
    if(furnaceInput){addToInventory(furnaceInput.type,furnaceInput.count);furnaceInput=null;}
    if(furnaceFuel){addToInventory(furnaceFuel.type,furnaceFuel.count);furnaceFuel=null;}
    if(furnaceOutput){addToInventory(furnaceOutput.type,furnaceOutput.count);furnaceOutput=null;}
  }
  chestSlots=null;chestTarget=null;
  uiMode=null;
  if(gameState==='paused-ui')gameState='playing';
}

function layoutUI(){
  const S=44, G=4;
  const rects={};
  const pad=20;
  let panel=null;
  if(!uiMode)return {rects,panel,slotSize:S};

  const isTable=uiMode==='table';
  const isFurnace=uiMode==='furnace';
  const isChest=uiMode==='chest';

  const invW=INV_COLS*(S+G)-G;
  const invH=INV_ROWS*(S+G)-G;
  const hotW=HOTBAR_SIZE*(S+G)-G;
  const hotH=S;

  const craftSize=isTable?3:2;
  const craftW=craftSize*(S+G)-G;

  let contentW, contentH;

  if(isChest){
    const chestH=CHEST_ROWS*(S+G)-G;
    contentW=Math.max(invW,hotW);
    contentH=40 + chestH + 16 + invH + 16 + hotH;
  } else if(isFurnace){
    contentW=Math.max(invW, hotW, S*2+140);
    contentH=40 + S*2+16 + 20 + invH + 16 + hotH;
  } else {
    const craftBlockW=craftW+40+S+20+120;
    contentW=Math.max(invW,hotW,craftBlockW);
    const craftBlockH=craftSize*(S+G)-G;
    contentH=40 + craftBlockH + 20 + invH + 16 + hotH;
  }

  const panelW=contentW+pad*2;
  const panelH=contentH+pad*2;
  const panelX=Math.max(20,(canvas.width-panelW)/2);
  const panelY=Math.max(20,Math.min(canvas.height-panelH-20,(canvas.height-panelH)/2));

  panel={x:panelX,y:panelY,w:panelW,h:panelH};

  rects['btn_close']=[panelX+panelW-40,panelY+10,30,30];
  if(!isChest)rects['btn_recipes']=[panelX+panelW-40-8-130,panelY+10,130,30];

  const startX=panelX+pad;
  let cy=panelY+pad+40;

  if(isChest){
    for(let r=0;r<CHEST_ROWS;r++)for(let c=0;c<INV_COLS;c++)
      rects[`chest_${r*INV_COLS+c}`]=[startX+c*(S+G),cy+r*(S+G),S,S];
    cy+=CHEST_ROWS*(S+G)-G+16;
  } else if(isFurnace){
    rects['furnace_input']=[startX,cy,S,S];
    rects['furnace_fuel']=[startX,cy+S+8,S,S];
    rects['furnace_progress']=[startX+S+20,cy+S/2-10,60,20];
    rects['furnace_output']=[startX+S+100,cy,S,S];
    cy+=S*2+16+20;
  } else {
    for(let r=0;r<craftSize;r++)for(let c=0;c<craftSize;c++)
      rects[`craft_${r*craftSize+c}`]=[startX+c*(S+G),cy+r*(S+G),S,S];
    const resultX=startX+craftW+40;
    const resultY=cy+(craftSize*(S+G)-G-S)/2;
    rects['result']=[resultX,resultY,S,S];
    rects['btn_craft']=[resultX+S+20,resultY+(S-30)/2,120,30];
    cy+=craftSize*(S+G)-G+20;
  }

  for(let r=0;r<INV_ROWS;r++)for(let c=0;c<INV_COLS;c++)
    rects[`inv_${r*INV_COLS+c}`]=[startX+c*(S+G),cy+r*(S+G),S,S];
  cy+=INV_ROWS*(S+G)-G+16;

  for(let c=0;c<HOTBAR_SIZE;c++)
    rects[`hot_${c}`]=[startX+c*(S+G),cy,S,S];

  return {rects,panel,slotSize:S};
}

function getRecipesRects(){
  const W=canvas.width,H=canvas.height;
  const panelW=Math.min(900,W-80),panelH=Math.min(640,H-80);
  const px=(W-panelW)/2,py=(H-panelH)/2;
  return {
    panel:{x:px,y:py,w:panelW,h:panelH},
    btnClose:{x:px+panelW-44,y:py+10,w:34,h:34},
    btnBack:{x:px+16,y:py+panelH-52,w:120,h:36},
    btnPrev:{x:px+panelW/2-110,y:py+panelH-52,w:60,h:36},
    btnNext:{x:px+panelW/2+50,y:py+panelH-52,w:60,h:36},
  };
}

function pointInRect(x,y,r){return x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];}
function pointInObj(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}

function getSlotAt(x,y){
  const {rects}=layoutUI();
  for(const key in rects){
    const r=rects[key];
    if(pointInRect(x,y,r))return key;
  }
  return null;
}
function getItemAt(slotKey){
  if(!slotKey)return null;
  if(slotKey==='result')return uiCraftResult;
  if(slotKey==='furnace_input')return furnaceInput;
  if(slotKey==='furnace_fuel')return furnaceFuel;
  if(slotKey==='furnace_output')return furnaceOutput;
  if(slotKey.startsWith('chest_')&&chestSlots)return chestSlots[+slotKey.slice(6)];
  if(slotKey.startsWith('inv_'))return inventory[+slotKey.slice(4)];
  if(slotKey.startsWith('hot_'))return hotbar[+slotKey.slice(4)];
  if(slotKey.startsWith('craft_'))return uiCraftSlots[+slotKey.slice(6)];
  return null;
}
function setItemAt(slotKey,item){
  if(!slotKey)return;
  if(slotKey==='result'){uiCraftResult=item;return;}
  if(slotKey==='furnace_input'){furnaceInput=item;return;}
  if(slotKey==='furnace_fuel'){furnaceFuel=item;return;}
  if(slotKey==='furnace_output'){furnaceOutput=item;return;}
  if(slotKey.startsWith('chest_')&&chestSlots){chestSlots[+slotKey.slice(6)]=item;return;}
  if(slotKey.startsWith('inv_')){inventory[+slotKey.slice(4)]=item;return;}
  if(slotKey.startsWith('hot_')){hotbar[+slotKey.slice(4)]=item;return;}
  if(slotKey.startsWith('craft_')){uiCraftSlots[+slotKey.slice(6)]=item;return;}
}

function handleLeftClick(){
  if(showRecipes){
    const r=getRecipesRects();
    if(pointInObj(mouse.x,mouse.y,r.btnClose)||pointInObj(mouse.x,mouse.y,r.btnBack)){showRecipes=false;return;}
    if(pointInObj(mouse.x,mouse.y,r.btnPrev)){if(recipePage>0)recipePage--;return;}
    if(pointInObj(mouse.x,mouse.y,r.btnNext)){
      const totalPages=Math.max(1,Math.ceil(RECIPES.length/RECIPE_PAGE_SIZE));
      if(recipePage<totalPages-1)recipePage++;
      return;
    }
    return;
  }
  if(!uiMode)return;
  const slotKey=getSlotAt(mouse.x,mouse.y);
  if(!slotKey)return;
  if(slotKey==='btn_close'){closeUI();return;}
  if(slotKey==='btn_recipes'){openRecipes();return;}
  if(slotKey==='btn_craft'){tryCraft();return;}
  if(slotKey==='result'){
    if(uiCraftResult){
      if(addToInventory(uiCraftResult.type,uiCraftResult.count))uiCraftResult=null;
    }
    return;
  }
  const item=getItemAt(slotKey);
  if(!item)return;
  dragging={item:{...item},from:slotKey,x:mouse.x,y:mouse.y};
  setItemAt(slotKey,null);
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Правильное завершение перетаскивания ЛКМ
function handleLeftRelease(){
  if(showRecipes)return;
  if(!uiMode||!dragging)return;
  const slotKey=getSlotAt(mouse.x,mouse.y);
  if(!slotKey||slotKey.startsWith('btn_')||slotKey==='furnace_progress'){
    setItemAt(dragging.from,dragging.item);
    dragging=null;return;
  }
  const existing=getItemAt(slotKey);
  if(slotKey==='result'){
    setItemAt(dragging.from,dragging.item);
    dragging=null;return;
  }
  
  // ИСПРАВЛЕНИЕ: Проверяем возможность стакания
  if(existing && existing.type === dragging.item.type && isStackable(existing.type)){
    // Можно стакать
    const spaceInExisting = 99 - existing.count;
    const toAdd = Math.min(spaceInExisting, dragging.item.count);
    existing.count += toAdd;
    dragging.item.count -= toAdd;
    
    if(dragging.item.count <= 0){
      dragging = null;
    } else {
      // Если что-то осталось, возвращаем обратно
      setItemAt(dragging.from, dragging.item);
      dragging = null;
    }
  } else if(!existing){
    // Пустой слот - просто помещаем
    setItemAt(slotKey, dragging.item);
    dragging = null;
  } else {
    // Нельзя стакать - меняем местами
    setItemAt(slotKey, dragging.item);
    setItemAt(dragging.from, existing);
    dragging = null;
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Правильное взятие ПКМ (половина стака)
function handleRightClick(){
  if(showRecipes)return;
  if(!uiMode)return;
  const slotKey=getSlotAt(mouse.x,mouse.y);
  if(!slotKey)return;
  if(slotKey.startsWith('btn_')||slotKey==='result'||slotKey==='furnace_progress')return;
  
  // Если уже что-то тащим, пытаемся положить 1 штуку
  if(dragging){
    const existing=getItemAt(slotKey);
    if(!existing){
      // Пустой слот - кладём 1 штуку
      setItemAt(slotKey, {type: dragging.item.type, count: 1});
      dragging.item.count--;
      if(dragging.item.count <= 0) dragging = null;
    } else if(existing.type === dragging.item.type && isStackable(existing.type) && existing.count < 99){
      // Можно добавить к существующему
      existing.count++;
      dragging.item.count--;
      if(dragging.item.count <= 0) dragging = null;
    }
    return;
  }
  
  // Берём половину стака
  const item=getItemAt(slotKey);
  if(!item)return;
  
  const half=Math.ceil(item.count/2);
  const rest=item.count-half;
  
  dragging={item:{type:item.type,count:half},from:slotKey,x:mouse.x,y:mouse.y};
  
  if(rest>0){
    item.count=rest;
  }else{
    setItemAt(slotKey,null);
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Завершение перетаскивания ПКМ
function handleRightRelease(){
  if(showRecipes)return;
  if(!uiMode||!dragging)return;
  
  const slotKey=getSlotAt(mouse.x,mouse.y);
  if(!slotKey||slotKey.startsWith('btn_')||slotKey==='furnace_progress'){
    // Отпустили вне слота - возвращаем обратно
    const existing=getItemAt(dragging.from);
    if(existing && existing.type === dragging.item.type && isStackable(existing.type)){
      existing.count += dragging.item.count;
    } else if(!existing){
      setItemAt(dragging.from, dragging.item);
    } else {
      // Некуда деть - пытаемся в инвентарь
      addToInventory(dragging.item.type, dragging.item.count);
    }
    dragging=null;
    return;
  }
  
  const existing=getItemAt(slotKey);
  if(slotKey==='result'){
    // В слот результата нельзя класть
    const existingFrom=getItemAt(dragging.from);
    if(existingFrom && existingFrom.type === dragging.item.type && isStackable(existingFrom.type)){
      existingFrom.count += dragging.item.count;
    } else if(!existingFrom){
      setItemAt(dragging.from, dragging.item);
    } else {
      addToInventory(dragging.item.type, dragging.item.count);
    }
    dragging=null;
    return;
  }
  
  // Пытаемся положить в целевой слот
  if(!existing){
    // Пустой слот
    setItemAt(slotKey, dragging.item);
    dragging=null;
  } else if(existing.type === dragging.item.type && isStackable(existing.type)){
    // Можно стакать
    const spaceInExisting = 99 - existing.count;
    const toAdd = Math.min(spaceInExisting, dragging.item.count);
    existing.count += toAdd;
    dragging.item.count -= toAdd;
    
    if(dragging.item.count <= 0){
      dragging = null;
    } else {
      // Возвращаем остаток обратно
      const existingFrom=getItemAt(dragging.from);
      if(existingFrom && existingFrom.type === dragging.item.type){
        existingFrom.count += dragging.item.count;
      } else if(!existingFrom){
        setItemAt(dragging.from, dragging.item);
      } else {
        addToInventory(dragging.item.type, dragging.item.count);
      }
      dragging = null;
    }
  } else {
    // Нельзя стакать - меняем местами
    setItemAt(slotKey, dragging.item);
    setItemAt(dragging.from, existing);
    dragging=null;
  }
}

function render(){
  ctx.fillStyle='#0e0e1e';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  if(gameState==='menu'||gameState==='loading')return;
  const sx=Math.max(0,Math.floor(camera.x/TILE));
  const ex=Math.min(WORLD_W-1,Math.ceil((camera.x+canvas.width)/TILE));
  const sy=Math.max(0,Math.floor(camera.y/TILE));
  const ey=Math.min(WORLD_H-1,Math.ceil((camera.y+canvas.height)/TILE));
  for(let ty=sy;ty<=ey;ty++)for(let tx=sx;tx<=ex;tx++)drawFloor(floors[ty][tx],tx,ty);
  for(let ty=sy;ty<=ey;ty++)for(let tx=sx;tx<=ex;tx++){
    const id=objects[ty][tx];if(id!==null)drawObject(id,tx,ty);
  }
  if(miningTarget&&miningProgress>0)renderCracks(miningTarget.tx,miningTarget.ty,miningProgress);
  if(!uiMode&&!showRecipes){
    const {tx,ty}=mouseTile();
    if(inBounds(tx,ty)&&inReach(tx,ty)){
      const oid=objects[ty][tx];const item=oid?ITEMS[oid]:null;
      const sel=getSelectedTool();
      let color='rgba(255,255,255,0.85)';
      if(item&&item.requiredTool){
        if(!sel||sel.tool!==item.requiredTool||(item.requiredTier&&sel.tier<item.requiredTier))color='rgba(255,90,90,0.9)';
      } else if(oid===null&&floors[ty][tx]===F_STONE){
      }
      ctx.strokeStyle=color;ctx.lineWidth=2;
      ctx.strokeRect(tx*TILE-camera.x,ty*TILE-camera.y,TILE,TILE);
    }
  }
  renderPlayer();
  if(uiMode){
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    renderInventoryUI();
  }else{
    renderHotbar();
  }
  if(showRecipes)renderRecipes();
  if(dragging){
    const img=getItemImage(dragging.item.type);
    const s=36;
    if(img)ctx.drawImage(img,mouse.x-s/2,mouse.y-s/2,s,s);
    else{ctx.fillStyle=ITEMS[dragging.item.type].color;ctx.fillRect(mouse.x-s/2,mouse.y-s/2,s,s);}
    if(dragging.item.count>1){
      ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.textAlign='right';
      ctx.fillText(String(dragging.item.count),mouse.x+s/2-2,mouse.y+s/2-2);
      ctx.textAlign='left';
    }
  }
  renderFpsCounter();
}

function drawFloor(id,tx,ty){
  const px=tx*TILE-camera.x,py=ty*TILE-camera.y;
  if(id===F_WATER){drawWater(px,py,tx,ty);return;}
  const img=getItemImage(id);
  if(img){ctx.drawImage(img,px,py,TILE,TILE);return;}
  const cache=floorCache[id];
  if(cache){
    const v=tileHash(tx,ty,1)%TILE_VARIANTS;
    ctx.drawImage(cache[v],px,py);return;
  }
  ctx.fillStyle=ITEMS[id].color;ctx.fillRect(px,py,TILE,TILE);
}
function drawWater(px,py,tx,ty){
  const img=getItemImage(F_WATER);
  if(img)ctx.drawImage(img,px,py,TILE,TILE);
  else{
    ctx.fillStyle='#3a7bd5';ctx.fillRect(px,py,TILE,TILE);
    ctx.fillStyle='rgba(20,40,90,0.25)';ctx.fillRect(px,py+TILE*0.6,TILE,TILE*0.4);
  }
  const t=performance.now()*0.0016;
  const ph=t+tx*0.4+ty*0.7,off=Math.sin(ph)*2.5;
  ctx.fillStyle='rgba(255,255,255,0.22)';
  ctx.fillRect(px+4+off,py+10,TILE-12,2);
  ctx.fillRect(px+8-off,py+22,TILE-18,2);
}
function drawObject(id,tx,ty){
  const px=tx*TILE-camera.x,py=ty*TILE-camera.y;
  const img=getItemImage(id);
  if(img){
    ctx.fillStyle='rgba(0,0,0,0.28)';
    ctx.fillRect(px+3,py+3,TILE,TILE);
    ctx.drawImage(img,px,py,TILE,TILE);return;
  }
  const cache=objectCache[id];
  if(cache){
    const v=tileHash(tx,ty,5)%TILE_VARIANTS;
    ctx.drawImage(cache[v],px-OBJ_PAD,py-OBJ_PAD);return;
  }
  ctx.fillStyle=ITEMS[id].color;ctx.fillRect(px,py,TILE,TILE);
  ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
}
function renderCracks(tx,ty,progress){
  const px=tx*TILE-camera.x,py=ty*TILE-camera.y;
  const lines=[[[.15,.15],[.5,.5]],[[.85,.2],[.5,.5]],[[.5,.85],[.5,.5]],[[.25,.4],[.45,.55]],[[.75,.75],[.6,.6]]];
  const count=Math.max(1,Math.ceil(progress*lines.length));
  ctx.save();ctx.strokeStyle=`rgba(0,0,0,${0.35+progress*0.5})`;ctx.lineWidth=2;ctx.lineCap='round';
  for(let i=0;i<count;i++){
    const [[x1,y1],[x2,y2]]=lines[i];
    ctx.beginPath();ctx.moveTo(px+x1*TILE,py+y1*TILE);ctx.lineTo(px+x2*TILE,py+y2*TILE);ctx.stroke();
  }
  ctx.restore();
}
function renderPlayer(){
  const px=player.renderX-camera.x,py=player.renderY-camera.y;
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath();ctx.ellipse(px,py+6,player.r+2,player.r-2,0,0,Math.PI*2);ctx.fill();
  const img=getPlayerImage();
  if(img){ctx.drawImage(img,px-TILE/2,py-TILE/2,TILE,TILE);return;}
  ctx.fillStyle='#FF6B6B';ctx.beginPath();ctx.arc(px,py,player.r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#aa3333';ctx.lineWidth=2;ctx.stroke();
  const fx=player.facing.x,fy=player.facing.y;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px+fx*5,py+fy*5,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(px+fx*6.2,py+fy*6.2,1.6,0,Math.PI*2);ctx.fill();
}

function renderHotbar(){
  const ss=48,gap=6;
  const totalW=HOTBAR_SIZE*ss+(HOTBAR_SIZE-1)*gap;
  const sx=(canvas.width-totalW)/2,sy=canvas.height-ss-14;
  for(let i=0;i<HOTBAR_SIZE;i++){
    const x=sx+i*(ss+gap);
    ctx.fillStyle=i===selectedHotbarSlot?'rgba(255,215,0,0.25)':'rgba(0,0,0,0.55)';
    ctx.fillRect(x,sy,ss,ss);
    ctx.strokeStyle=i===selectedHotbarSlot?'#ffd700':'rgba(255,255,255,0.35)';
    ctx.lineWidth=i===selectedHotbarSlot?3:1;
    ctx.strokeRect(x+0.5,sy+0.5,ss-1,ss-1);
    ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='10px monospace';ctx.textAlign='left';
    ctx.fillText(i===9?'0':String(i+1),x+4,sy+12);
    drawItemIcon(hotbar[i],x+8,sy+8,ss-16);
  }
  const sel=hotbar[selectedHotbarSlot];
  if(sel){
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(sx,sy-28,200,22);
    ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.textAlign='left';
    ctx.fillText(ITEMS[sel.type].name,sx+8,sy-12);
  }
  if(miningBlocked){
    const tip='Нужен правильный инструмент';
    ctx.font='bold 13px monospace';
    const tw=ctx.measureText(tip).width;
    const tx2=(canvas.width-tw)/2,ty2=sy-60;
    ctx.fillStyle='rgba(120,20,20,0.75)';ctx.fillRect(tx2-12,ty2-16,tw+24,26);
    ctx.strokeStyle='rgba(255,100,100,0.85)';ctx.lineWidth=1.5;
    ctx.strokeRect(tx2-12+0.5,ty2-16+0.5,tw+24-1,26-1);
    ctx.fillStyle='#ffdddd';ctx.textAlign='left';ctx.fillText(tip,tx2,ty2+2);
  }
}
function drawItemIcon(slot,x,y,size){
  if(!slot)return;
  const def=ITEMS[slot.type];if(!def)return;
  const img=getItemImage(slot.type);
  if(img){ctx.drawImage(img,x,y,size,size);}
  else if(def.kind==='tool'){drawToolIcon(def.tool,def.tier,x,y,size);}
  else{
    const cache=floorCache[slot.type]||objectCache[slot.type];
    if(cache)ctx.drawImage(cache[0],x,y,size,size);
    else{
      if(slot.type === I_STICK) {
         ctx.save();
         ctx.translate(x + size/2, y + size/2);
         ctx.rotate(-Math.PI/4);
         ctx.fillStyle = '#8a5025';
         ctx.fillRect(-2, -size/2 + 4, 4, size - 8);
         ctx.fillRect(-4, -2, 3, 2);
         ctx.fillRect(2, 4, 3, 2);
         ctx.restore();
      } else if (slot.type === I_PLANKS) {
         ctx.fillStyle = '#a0522d';
         ctx.fillRect(x,y,size,size);
         ctx.fillStyle = 'rgba(0,0,0,0.2)';
         ctx.fillRect(x, y + size/3, size, 2);
         ctx.fillRect(x, y + size*2/3, size, 2);
      } else {
         ctx.fillStyle=def.color;ctx.fillRect(x,y,size,size);
         ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.strokeRect(x+0.5,y+0.5,size-1,size-1);
      }
    }
  }
  if(slot.count>1){
    ctx.fillStyle='#fff';ctx.font='bold 13px monospace';ctx.textAlign='right';
    ctx.fillText(String(slot.count),x+size+7,y+size+7);
    ctx.textAlign='left';
  }
}
function drawToolIcon(tool,tier,x,y,size){
  const handle='#6b3a1a';
  let head='#a0522d';
  if(tier===2)head='#8a8a8a';
  if(tier===3)head='#d0d0e0';
  ctx.save();
  ctx.strokeStyle=handle;ctx.lineWidth=4;ctx.lineCap='round';
  if(tool==='pickaxe'){
    ctx.beginPath();ctx.moveTo(x+4,y+size-4);ctx.lineTo(x+size-6,y+6);ctx.stroke();
    ctx.strokeStyle=head;ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(x+size-8,y+8,8,Math.PI*0.7,Math.PI*1.6);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x+size-8,y+8,8,Math.PI*0.75,Math.PI*1.55);ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(x+8,y+size-4);ctx.lineTo(x+size-12,y+6);ctx.stroke();
    ctx.fillStyle=head;
    ctx.beginPath();
    ctx.moveTo(x+size-16,y+6);ctx.lineTo(x+size-2,y+10);
    ctx.lineTo(x+size-2,y+22);ctx.lineTo(x+size-16,y+20);
    ctx.quadraticCurveTo(x+size-10,y+13,x+size-16,y+6);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='#5a5a5a';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x+size-14,y+9);ctx.lineTo(x+size-4,y+12);
    ctx.lineTo(x+size-4,y+15);ctx.lineTo(x+size-14,y+13);
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

function renderInventoryUI(){
  const {rects,panel}=layoutUI();
  const isTable=uiMode==='table';
  const isFurnace=uiMode==='furnace';
  const isChest=uiMode==='chest';

  ctx.fillStyle='rgba(20,20,40,0.94)';
  ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle='rgba(255,215,0,0.35)';ctx.lineWidth=2;
  ctx.strokeRect(panel.x+0.5,panel.y+0.5,panel.w-1,panel.h-1);

  ctx.fillStyle='#ffd700';ctx.font='bold 18px monospace';ctx.textAlign='left';
  const title=isTable?'Верстак':isFurnace?'Печь':isChest?'Сундук':'Инвентарь';
  ctx.fillText(title,panel.x+16,panel.y+30);

  if(!isChest){
    const [rx,ry,rw,rh]=rects['btn_recipes'];
    ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(rx,ry,rw,rh);
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;
    ctx.strokeRect(rx+0.5,ry+0.5,rw-1,rh-1);
    ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.textAlign='center';
    ctx.fillText('📖 Рецепты',rx+rw/2,ry+rh/2+5);
    ctx.textAlign='left';
  }

  const [bx,by,bw,bh]=rects['btn_close'];
  ctx.fillStyle='rgba(200,60,60,0.15)';ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle='rgba(255,100,100,0.5)';ctx.lineWidth=1;
  ctx.strokeRect(bx+0.5,by+0.5,bw-1,bh-1);
  ctx.fillStyle='#ff9a9a';ctx.font='bold 18px monospace';ctx.textAlign='center';
  ctx.fillText('✕',bx+bw/2,by+bh/2+6);
  ctx.textAlign='left';

  for(const key in rects){
    if(key.startsWith('btn_')||key==='furnace_progress')continue;
    const [x,y,w,h]=rects[key];
    const isResult=key==='result'||key==='furnace_output';
    ctx.fillStyle=isResult?'rgba(255,215,0,0.10)':'rgba(0,0,0,0.5)';
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=isResult?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.3)';
    ctx.lineWidth=1;ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
    const item=getItemAt(key);
    if(item)drawItemIcon(item,x+6,y+6,w-12);
  }

  if(!isFurnace&&!isChest){
      const slots = uiCraftSlots.slice(0, uiCraftSize*uiCraftSize);
      const recipe = findRecipe(slots, uiCraftSize);
      if(recipe){
          const [rX,rY,rW,rH]=rects['result'];
          ctx.globalAlpha = 0.5;
          drawItemIcon({type: recipe.result.id, count: recipe.result.count}, rX+6, rY+6, rW-12);
          ctx.globalAlpha = 1.0;
          
          ctx.strokeStyle='rgba(0,255,0,0.5)';
          ctx.lineWidth=2;
          ctx.strokeRect(rX+0.5,rY+0.5,rW-1,rH-1);
      }
  }

  if(!isFurnace&&!isChest){
    const [rX,rY,rW,rH]=rects['result'];
    const c0=rects['craft_0'];
    ctx.strokeStyle='rgba(255,215,0,0.6)';ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(c0[0]+c0[2]+8,rY+rH/2);
    ctx.lineTo(rX-8,rY+rH/2);
    ctx.stroke();
    ctx.fillStyle='rgba(255,215,0,0.7)';
    ctx.beginPath();
    ctx.moveTo(rX-8,rY+rH/2);
    ctx.lineTo(rX-16,rY+rH/2-5);
    ctx.lineTo(rX-16,rY+rH/2+5);
    ctx.closePath();ctx.fill();
  }

  if(!isFurnace&&!isChest){
    const [bx2,by2,bw2,bh2]=rects['btn_craft'];
    ctx.fillStyle='rgba(255,215,0,0.15)';ctx.fillRect(bx2,by2,bw2,bh2);
    ctx.strokeStyle='rgba(255,215,0,0.55)';ctx.lineWidth=1;
    ctx.strokeRect(bx2+0.5,by2+0.5,bw2-1,bh2-1);
    ctx.fillStyle='#ffe066';ctx.font='bold 13px monospace';ctx.textAlign='center';
    ctx.fillText('Скрафтить',bx2+bw2/2,by2+bh2/2+5);
    ctx.textAlign='left';
  }

  if(isFurnace){
    const [px,py,pw,ph]=rects['furnace_progress'];
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px,py,pw,ph);
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;
    ctx.strokeRect(px+0.5,py+0.5,pw-1,ph-1);
    ctx.fillStyle=furnaceBurning?'#ff8a3a':'#666';
    ctx.fillRect(px+1,py+1,(pw-2)*furnaceProgress,ph-2);
    ctx.fillStyle='#aaa';ctx.font='11px monospace';ctx.textAlign='left';
    const [ix,iy]=rects['furnace_input'];ctx.fillText('Руда',ix,iy-6);
    const [fx2,fy2]=rects['furnace_fuel'];ctx.fillText('Топливо',fx2,fy2-6);
    const [ox,oy]=rects['furnace_output'];ctx.fillText('Слиток',ox,oy-6);
  }
}

function renderRecipes(){
  const r=getRecipesRects();
  const {panel,btnClose,btnBack,btnPrev,btnNext}=r;

  ctx.fillStyle='rgba(20,20,40,0.97)';
  ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle='rgba(255,215,0,0.6)';ctx.lineWidth=2;
  ctx.strokeRect(panel.x+0.5,panel.y+0.5,panel.w-1,panel.h-1);

  ctx.fillStyle='#ffd700';ctx.font='bold 20px monospace';ctx.textAlign='center';
  ctx.fillText('📖 Книга рецептов',panel.x+panel.w/2,panel.y+34);
  ctx.textAlign='left';

  ctx.fillStyle='rgba(200,60,60,0.15)';ctx.fillRect(btnClose.x,btnClose.y,btnClose.w,btnClose.h);
  ctx.strokeStyle='rgba(255,100,100,0.5)';ctx.lineWidth=1;
  ctx.strokeRect(btnClose.x+0.5,btnClose.y+0.5,btnClose.w-1,btnClose.h-1);
  ctx.fillStyle='#ff9a9a';ctx.font='bold 18px monospace';ctx.textAlign='center';
  ctx.fillText('✕',btnClose.x+btnClose.w/2,btnClose.y+btnClose.h/2+6);
  ctx.textAlign='left';

  ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(btnBack.x,btnBack.y,btnBack.w,btnBack.h);
  ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1;
  ctx.strokeRect(btnBack.x+0.5,btnBack.y+0.5,btnBack.w-1,btnBack.h-1);
  ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.textAlign='center';
  ctx.fillText('← Назад',btnBack.x+btnBack.w/2,btnBack.y+btnBack.h/2+5);
  ctx.textAlign='left';

  const gridX=panel.x+20;
  const gridY=panel.y+60;
  const gridW=panel.w-40;
  const gridH=panel.h-60-70;
  const cols=2, rows=3;
  const cellW=gridW/cols;
  const cellH=gridH/rows;
  const cardPad=8;

  const totalPages=Math.max(1,Math.ceil(RECIPES.length/RECIPE_PAGE_SIZE));
  if(recipePage>=totalPages)recipePage=totalPages-1;
  if(recipePage<0)recipePage=0;

  const start=recipePage*RECIPE_PAGE_SIZE;
  const end=Math.min(start+RECIPE_PAGE_SIZE,RECIPES.length);

  for(let i=start;i<end;i++){
    const rec=RECIPES[i];
    const idx=i-start;
    const col=idx%cols;
    const row=Math.floor(idx/cols);
    const cx=gridX+col*cellW+cardPad;
    const cy=gridY+row*cellH+cardPad;
    const cw=cellW-cardPad*2;
    const ch=cellH-cardPad*2;

    ctx.fillStyle='rgba(255,255,255,0.04)';
    ctx.fillRect(cx,cy,cw,ch);
    ctx.strokeStyle='rgba(255,255,255,0.15)';
    ctx.lineWidth=1;
    ctx.strokeRect(cx+0.5,cy+0.5,cw-1,ch-1);

    const iconSize=56;
    const iconX=cx+14;
    const iconY=cy+(ch-iconSize)/2;
    drawRecipeIcon(rec.result.id,iconX,iconY,iconSize);

    const textX=iconX+iconSize+16;
    ctx.fillStyle='#fff';
    ctx.font='bold 14px monospace';
    ctx.textAlign='left';
    ctx.fillText(`${ITEMS[rec.result.id].name} ×${rec.result.count}`,textX,cy+22);

    ctx.fillStyle='#999';
    ctx.font='11px monospace';
    ctx.fillText(rec.table==='table'?'Только на верстаке':'В инвентаре',textX,cy+40);

    const sw=20, gap=3;
    const pW=rec.pattern[0].length;
    const pH=rec.pattern.length;
    const patX=textX;
    const patY=cy+50;
    for(let y=0;y<pH;y++)for(let x=0;x<pW;x++){
      const v=rec.pattern[y][x];
      const sx=patX+x*(sw+gap);
      const sy=patY+y*(sw+gap);

      ctx.fillStyle=v===null?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.10)';
      ctx.fillRect(sx,sy,sw,sw);
      ctx.strokeStyle='rgba(255,255,255,0.12)';
      ctx.strokeRect(sx+0.5,sy+0.5,sw-1,sw-1);

      if(v!==null)drawRecipeIcon(v,sx+2,sy+2,sw-4);
    }
  }

  ctx.fillStyle='#ffd700';
  ctx.font='bold 14px monospace';
  ctx.textAlign='center';
  ctx.fillText(`${recipePage+1} / ${totalPages}`,panel.x+panel.w/2,panel.y+panel.h-30);
  ctx.textAlign='left';

  const prevActive=recipePage>0;
  ctx.fillStyle=prevActive?'rgba(255,215,0,0.15)':'rgba(255,255,255,0.03)';
  ctx.fillRect(btnPrev.x,btnPrev.y,btnPrev.w,btnPrev.h);
  ctx.strokeStyle=prevActive?'rgba(255,215,0,0.55)':'rgba(255,255,255,0.1)';
  ctx.strokeRect(btnPrev.x+0.5,btnPrev.y+0.5,btnPrev.w-1,btnPrev.h-1);
  ctx.fillStyle=prevActive?'#ffe066':'rgba(255,255,255,0.25)';
  ctx.font='bold 16px monospace';
  ctx.textAlign='center';
  ctx.fillText('◀',btnPrev.x+btnPrev.w/2,btnPrev.y+btnPrev.h/2+6);

  const nextActive=recipePage<totalPages-1;
  ctx.fillStyle=nextActive?'rgba(255,215,0,0.15)':'rgba(255,255,255,0.03)';
  ctx.fillRect(btnNext.x,btnNext.y,btnNext.w,btnNext.h);
  ctx.strokeStyle=nextActive?'rgba(255,215,0,0.55)':'rgba(255,255,255,0.1)';
  ctx.strokeRect(btnNext.x+0.5,btnNext.y+0.5,btnNext.w-1,btnNext.h-1);
  ctx.fillStyle=nextActive?'#ffe066':'rgba(255,255,255,0.25)';
  ctx.fillText('▶',btnNext.x+btnNext.w/2,btnNext.y+btnNext.h/2+6);
  ctx.textAlign='left';
}

function drawRecipeIcon(id,x,y,size){
  const img=getItemImage(id);
  if(img){ctx.drawImage(img,x,y,size,size);return;}
  const def=ITEMS[id];
  if(def&&def.kind==='tool'){drawToolIcon(def.tool,def.tier,x,y,size);return;}
  const cache=floorCache[id]||objectCache[id];
  if(cache){ctx.drawImage(cache[0],x,y,size,size);return;}
  ctx.fillStyle=def?def.color:'#888';
  ctx.fillRect(x,y,size,size);
  ctx.strokeStyle='rgba(0,0,0,0.4)';
  ctx.strokeRect(x+0.5,y+0.5,size-1,size-1);
}

const _fps=[];
function renderFpsCounter(){
  const now=performance.now();
  _fps.push(now);
  while(_fps.length>0&&_fps[0]<now-1000)_fps.shift();
  const f=_fps.length;
  ctx.save();ctx.font='bold 13px monospace';ctx.textAlign='right';
  ctx.fillStyle=f>=55?'rgba(120,255,120,0.8)':f>=30?'rgba(255,220,100,0.85)':'rgba(255,100,100,0.9)';
  ctx.fillText(`${f} FPS`,canvas.width-12,22);
  ctx.restore();
}

// UI — МЕНЮ
const $=id=>document.getElementById(id);
const menuMain=$('menu-main'),menuSlots=$('menu-slots'),menuPause=$('menu-pause');
const menuSettings=$('menu-settings'),menuDelete=$('menu-delete');
const btnPlay=$('btn-play'),btnSettingsMain=$('btn-settings-main'),btnSlotsBack=$('btn-slots-back');
const btnResume=$('btn-resume'),btnSave=$('btn-save'),btnSettingsPause=$('btn-settings-pause');
const btnToMain=$('btn-to-main'),btnSettingsBack=$('btn-settings-back');
const btnDeleteConfirm=$('btn-delete-confirm'),btnDeleteCancel=$('btn-delete-cancel');
const slotsList=$('slots-list'),deleteInfo=$('delete-info');
const toastEl=$('toast'),helpEl=$('help'),loadingEl=$('loading');
const loadingHint=$('loading-hint');

let gameState='loading',currentSlot=null,savedSinceLastResume=false;
let toastTimer=null;

function showToast(t,d=1600){
  toastEl.textContent=t;toastEl.classList.remove('hidden');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.add('hidden'),d);
}
function hideAllMenus(){document.querySelectorAll('.menu').forEach(m=>m.classList.add('hidden'));}
function showMenuOnly(m){hideAllMenus();m.classList.remove('hidden');}
function setHelpVisible(v){helpEl.style.display=v?'':'none';}
function clearInput(){
  for(const k in keys)keys[k]=false;
  mouse.left=false;mouse.right=false;
  miningTarget=null;miningProgress=0;miningBlocked=false;
  dragging=null;showRecipes=false;
}
function showMainMenu(){
  gameState='menu';currentSlot=null;
  stopAutosave();setHelpVisible(false);
  showMenuOnly(menuMain);
}
function renderSlotsList(){
  slotsList.innerHTML='';
  for(let s=1;s<=SAVE_SLOTS;s++){
    const card=document.createElement('div');
    const saved=hasSave(s);
    card.className='slot-card'+(saved?'':' slot-card-empty');
    const info=document.createElement('div');info.className='slot-info-block';
    const name=document.createElement('div');name.className='slot-name';name.textContent=`Слот ${s}`;
    info.appendChild(name);
    const meta=document.createElement('div');
    meta.className='slot-meta'+(saved?'':' slot-meta-empty');
    if(saved){const d=getSaveInfo(s);meta.textContent=d?`Сохранено: ${d}`:'Есть сохранение';}
    else meta.textContent='Пусто';
    info.appendChild(meta);card.appendChild(info);
    const actions=document.createElement('div');actions.className='slot-actions';
    if(saved){
      const pb=document.createElement('button');pb.className='menu-btn menu-btn-primary';pb.textContent='Играть';
      pb.addEventListener('click',()=>playSlot(s));actions.appendChild(pb);
      const db=document.createElement('button');db.className='menu-btn menu-btn-danger';db.textContent='Удалить';
      db.addEventListener('click',()=>openDeleteConfirm(s));actions.appendChild(db);
    }else{
      const nb=document.createElement('button');nb.className='menu-btn menu-btn-primary';nb.textContent='Создать';
      nb.addEventListener('click',()=>playSlot(s));actions.appendChild(nb);
    }
    card.appendChild(actions);slotsList.appendChild(card);
  }
}
function showSlotsMenu(){renderSlotsList();showMenuOnly(menuSlots);}
let deleteTarget=null,deleteTimer=null,deleteCd=5;
function openDeleteConfirm(s){
  deleteTarget=s;deleteCd=5;
  const d=getSaveInfo(s);
  deleteInfo.textContent=d?`Слот ${s} · сохранено ${d}. Это действие необратимо.`:`Слот ${s}. Это действие необратимо.`;
  btnDeleteConfirm.disabled=true;btnDeleteConfirm.textContent=`Удалить (${deleteCd})`;
  showMenuOnly(menuDelete);
  if(deleteTimer)clearInterval(deleteTimer);
  deleteTimer=setInterval(()=>{
    deleteCd--;
    if(deleteCd<=0){clearInterval(deleteTimer);deleteTimer=null;btnDeleteConfirm.disabled=false;btnDeleteConfirm.textContent='Удалить';}
    else btnDeleteConfirm.textContent=`Удалить (${deleteCd})`;
  },1000);
}
function closeDeleteConfirm(){if(deleteTimer){clearInterval(deleteTimer);deleteTimer=null;}deleteTarget=null;showSlotsMenu();}
let settingsBackTo='main';
function openSettings(f){settingsBackTo=f;showMenuOnly(menuSettings);}
function closeSettings(){
  if(settingsBackTo==='pause'&&gameState==='paused')showMenuOnly(menuPause);
  else showMenuOnly(menuMain);
}
function pauseGame(){gameState='paused';clearInput();setHelpVisible(false);refreshSaveButton();showMenuOnly(menuPause);}
function resumeGame(){gameState='playing';savedSinceLastResume=false;hideAllMenus();setHelpVisible(true);clearInput();}
function refreshSaveButton(){
  if(savedSinceLastResume){btnSave.textContent='Сохранено';btnSave.classList.add('menu-btn-pressed');btnSave.disabled=true;}
  else{btnSave.textContent='Сохранение';btnSave.classList.remove('menu-btn-pressed');btnSave.disabled=false;}
}
function playSlot(s){
  currentSlot=s;
  if(hasSave(s)){if(!loadGame(s)){showToast('Не удалось загрузить сохранение');return;}}
  else{generateWorld();resetPlayer();resetInventory();}
  savedSinceLastResume=false;clearInput();updateCamera();
  hideAllMenus();setHelpVisible(true);
  gameState='playing';startAutosave();
}
function toMainMenu(){if(currentSlot!==null)saveGame(currentSlot);showMainMenu();}

btnPlay.addEventListener('click',showSlotsMenu);
btnSettingsMain.addEventListener('click',()=>openSettings('main'));
btnSlotsBack.addEventListener('click',()=>showMainMenu());
btnResume.addEventListener('click',resumeGame);
btnSave.addEventListener('click',()=>{
  if(currentSlot===null)return;
  if(saveGame(currentSlot)){savedSinceLastResume=true;refreshSaveButton();showToast('✓ Игра сохранена');}
  else showToast('✗ Ошибка сохранения');
});
btnSettingsPause.addEventListener('click',()=>openSettings('pause'));
btnToMain.addEventListener('click',toMainMenu);
btnSettingsBack.addEventListener('click',closeSettings);
btnDeleteConfirm.addEventListener('click',()=>{
  if(deleteTarget===null||btnDeleteConfirm.disabled)return;
  deleteSave(deleteTarget);deleteTarget=null;
  if(deleteTimer){clearInterval(deleteTimer);deleteTimer=null;}
  showSlotsMenu();showToast('Сохранение удалено');
});
btnDeleteCancel.addEventListener('click',closeDeleteConfirm);

window.addEventListener('beforeunload',e=>{
  if(gameState==='playing'||gameState==='paused'||gameState==='paused-ui'){
    e.preventDefault();e.returnValue='';return '';
  }
});

let accumulator=0,lastTime=0;
function update(dt){
  if(gameState!=='playing'&&gameState!=='paused-ui')return;
  if(gameState==='paused-ui'){
    if(uiMode==='furnace')updateFurnace(dt);
    return;
  }
  accumulator+=dt;
  if(accumulator>MAX_ACCUM)accumulator=MAX_ACCUM;
  while(accumulator>=FIXED_DT){
    player.prevX=player.x;player.prevY=player.y;
    updatePlayer(FIXED_DT);
    updateMining(FIXED_DT);
    accumulator-=FIXED_DT;
  }
  const alpha=accumulator/FIXED_DT;
  player.renderX=player.prevX+(player.x-player.prevX)*alpha;
  player.renderY=player.prevY+(player.y-player.prevY)*alpha;
  updatePlacing(dt);
  updateSaplings();
  updateCamera();
}
function loop(ts){
  if(!lastTime)lastTime=ts;
  const dt=Math.min((ts-lastTime)/1000,0.1);
  lastTime=ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
async function start(){
  const hintTimer=setTimeout(()=>{
    if(loadingHint&&!loadingEl.classList.contains('hidden'))loadingHint.classList.remove('hidden');
  },5000);
  resizeCanvas();
  generateWorld();
  resetPlayer();
  try{await loadTextures();}catch(e){console.error('Ошибка инициализации:',e);}
  buildTileCaches();
  clearTimeout(hintTimer);
  loadingEl.classList.add('hidden');
  showMainMenu();
  requestAnimationFrame(loop);
}
start();