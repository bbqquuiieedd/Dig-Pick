// config.js
const TILE = 32, WORLD_W = 100, WORLD_H = 50;
const MOVE_SPEED = 3.2, REACH = 4.5, INV_COLS = 10, INV_ROWS = 3;
const SWIM_SPEED_MULT = 0.4;
const HOTBAR_SIZE = 10, CHEST_ROWS = 3;
const SAVE_SLOTS = 3, SAVE_KEY_PREFIX = 'digpick_save_slot_', SAVE_VERSION = 3;
const FIXED_DT = 1/60, MAX_ACCUM = 0.25;
const SAPLING_GROW_MS = 60000;
const SMELT_TIME_MS = 5000;
const TILE_VARIANTS = 4;
const OBJ_PAD = 4;
const RECIPE_PAGE_SIZE = 6;
const SETTINGS_KEY = 'digpick_settings';

const F_GRASS=0, F_DIRT=1, F_SAND=2, F_WATER=3, F_FLOWERS=4, F_TALLGRASS=5, F_GRAVEL=6, F_BEDROCK=7, F_FARMLAND=8;
const O_STONE=10, O_IRON_ORE=11, O_TRUNK=12, O_LEAVES=13, O_SAPLING=14, O_TABLE=15, O_FURNACE=16, O_CHEST=17;
const I_LOG=20, I_PLANKS=21, I_STICK=22, I_IRON_INGOT=23;
const I_WOOD_PICK=100, I_WOOD_AXE=101, I_STONE_PICK=102, I_STONE_AXE=103, I_IRON_PICK=104, I_IRON_AXE=105;
const I_WOOD_HOE=106, I_STONE_HOE=107, I_IRON_HOE=108;
const I_WOOD_SWORD=109, I_STONE_SWORD=110, I_IRON_SWORD=111;

const R = null;

const ITEMS = {
  0:{name:'Трава',color:'#5aad4a',layer:'floor',solid:false,placeable:true},
  1:{name:'Земля',color:'#8B5A2B',layer:'floor',solid:false,placeable:true},
  2:{name:'Песок',color:'#e8d68a',layer:'floor',solid:false,placeable:true},
  3:{name:'Вода',color:'#3a7bd5',layer:'floor',solid:false,placeable:false},
  4:{name:'Цветы',color:'#7fc95a',layer:'floor',solid:false,placeable:true},
  5:{name:'Высокая трава',color:'#4a9a3a',layer:'floor',solid:false,placeable:true},
  6:{name:'Гравий',color:'#8a8a7a',layer:'floor',solid:false,placeable:true},
  7:{name:'Неразрушаемый камень',color:'#3a3a3a',layer:'floor',solid:false,placeable:false},
  8:{name:'Грядка',color:'#6b4423',layer:'floor',solid:false,placeable:true,isFarmland:true},
  10:{name:'Камень',color:'#7a7a7a',layer:'object',solid:true,placeable:true,hardness:3000,requiredTool:'pickaxe',speedupTool:'pickaxe'},
  11:{name:'Железная руда',color:'#b0b0c0',layer:'object',solid:true,placeable:false,hardness:3500,requiredTool:'pickaxe',requiredTier:2,speedupTool:'pickaxe'},
  12:{name:'Ствол',color:'#a0522d',layer:'object',solid:true,placeable:false,hardness:2000,speedupTool:'axe'},
  13:{name:'Листва',color:'#3a8a3a',layer:'object',solid:false,placeable:false,hardness:400,speedupTool:'axe'},
  14:{name:'Росток',color:'#4a9a3a',layer:'object',solid:false,placeable:true,hardness:300,speedupTool:null},
  15:{name:'Верстак',color:'#a0522d',layer:'object',solid:true,placeable:true,hardness:1500,speedupTool:'axe'},
  16:{name:'Печь',color:'#5a5a5a',layer:'object',solid:true,placeable:true,hardness:2500,speedupTool:'pickaxe'},
  17:{name:'Сундук',color:'#8a5025',layer:'object',solid:true,placeable:true,hardness:1500,speedupTool:'axe'},
  20:{name:'Бревно',color:'#6b3a1a',layer:null,placeable:false},
  21:{name:'Доски',color:'#a0522d',layer:null,placeable:false},
  22:{name:'Палка',color:'#8a5025',layer:null,placeable:false},
  23:{name:'Железный слиток',color:'#c8c8d4',layer:null,placeable:false},

  // Инструменты — с прочностью
  100:{name:'Дер. кирка',color:'#a0522d',kind:'tool',tool:'pickaxe',tier:1,stackable:false,maxDurability:40},
  101:{name:'Дер. топор',color:'#a0522d',kind:'tool',tool:'axe',   tier:1,stackable:false,maxDurability:40},
  102:{name:'Кам. кирка',color:'#7a7a7a',kind:'tool',tool:'pickaxe',tier:2,stackable:false,maxDurability:80},
  103:{name:'Кам. топор',color:'#7a7a7a',kind:'tool',tool:'axe',   tier:2,stackable:false,maxDurability:80},
  104:{name:'Жел. кирка',color:'#c8c8d4',kind:'tool',tool:'pickaxe',tier:3,stackable:false,maxDurability:150},
  105:{name:'Жел. топор',color:'#c8c8d4',kind:'tool',tool:'axe',   tier:3,stackable:false,maxDurability:150},
  106:{name:'Дер. мотыга',color:'#a0522d',kind:'tool',tool:'hoe',tier:1,stackable:false,maxDurability:40},
  107:{name:'Кам. мотыга',color:'#7a7a7a',kind:'tool',tool:'hoe',tier:2,stackable:false,maxDurability:80},
  108:{name:'Жел. мотыга',color:'#c8c8d4',kind:'tool',tool:'hoe',tier:3,stackable:false,maxDurability:150},
  109:{name:'Дер. меч',color:'#a0522d',kind:'tool',tool:'sword',tier:1,stackable:false,maxDurability:60,damage:1,attackCooldown:0.5},
  110:{name:'Кам. меч',color:'#7a7a7a',kind:'tool',tool:'sword',tier:2,stackable:false,maxDurability:120,damage:1,attackCooldown:0.4},
  111:{name:'Жел. меч',color:'#c8c8d4',kind:'tool',tool:'sword',tier:3,stackable:false,maxDurability:200,damage:2,attackCooldown:0.5},
  
};

// Крафт-рецепты
const RECIPES = [
  { type:'craft', pattern:[[I_LOG,R],[R,R]], result:{id:I_PLANKS,count:4}, table:'any' },
  { type:'craft', pattern:[[I_PLANKS,R],[I_PLANKS,R]], result:{id:I_STICK,count:4}, table:'any' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS],[I_PLANKS,I_PLANKS]], result:{id:O_TABLE,count:1}, table:'any' },
  { type:'craft', pattern:[[O_STONE,O_STONE,O_STONE],[O_STONE,R,O_STONE],[O_STONE,O_STONE,O_STONE]], result:{id:O_FURNACE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[I_PLANKS,R,I_PLANKS],[I_PLANKS,I_PLANKS,I_PLANKS]], result:{id:O_CHEST,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_PICK,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,R],[I_PLANKS,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_AXE,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,O_STONE,O_STONE],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_PICK,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,O_STONE,R],[O_STONE,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_AXE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,I_IRON_INGOT,I_IRON_INGOT],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_PICK,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,I_IRON_INGOT,R],[I_IRON_INGOT,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_AXE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,R],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_HOE,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,O_STONE,R],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_HOE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,I_IRON_INGOT,R],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_HOE,count:1}, table:'table' },
    { type:'craft', pattern:[[I_PLANKS,R,R],[I_PLANKS,R,R],[I_STICK,R,R]], result:{id:I_WOOD_SWORD,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,R,R],[O_STONE,R,R],[I_STICK,R,R]], result:{id:I_STONE_SWORD,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,R,R],[I_IRON_INGOT,R,R],[I_STICK,R,R]], result:{id:I_IRON_SWORD,count:1}, table:'table' },
];

// Рецепты печи
const FURNACE_RECIPES = [
  { type:'furnace', input:O_IRON_ORE, output:{ id:I_IRON_INGOT, count:1 } },
];

// Общий список для книги (крафт + печь)
const ALL_RECIPES_VIEW = [...RECIPES, ...FURNACE_RECIPES];

const TEXTURE_PATHS = {
  items: {
    0:'textures/tiles/grass.png',1:'textures/tiles/dirt.png',2:'textures/tiles/sand.png',
    3:'textures/tiles/water.png',4:'textures/tiles/flowers.png',5:'textures/tiles/tallgrass.png',
    6:'textures/tiles/gravel.png',7:'textures/tiles/bedrock.png',
    8:'textures/tiles/farmland.png',
    10:'textures/tiles/stone.png',11:'textures/tiles/iron_ore.png',
    12:'textures/tiles/tree.png',13:'textures/tiles/leaves.png',14:'textures/tiles/sapling.png',
    15:'textures/tiles/workbench.png',16:'textures/tiles/furnace.png',17:'textures/tiles/chest.png',
    20:'textures/items/log.png',21:'textures/items/planks.png',
    22:'textures/items/stick.png',23:'textures/items/iron_ingot.png',
    100:'textures/tools/wood_pickaxe.png',101:'textures/tools/wood_axe.png',
    102:'textures/tools/stone_pickaxe.png',103:'textures/tools/stone_axe.png',
    104:'textures/tools/iron_pickaxe.png',105:'textures/tools/iron_axe.png',
    106:'textures/tools/wood_hoe.png',107:'textures/tools/stone_hoe.png',108:'textures/tools/iron_hoe.png',
    109:'textures/tools/wood_sword.png',110:'textures/tools/stone_sword.png',111:'textures/tools/iron_sword.png',
  },
  player: 'textures/player.png',
};

const DEFAULT_SETTINGS = {
  autosaveMinutes: 1,
  showFps: true,
  showHelp: true,
  keybinds: {
    moveUp:    'KeyW',
    moveDown:  'KeyS',
    moveLeft:  'KeyA',
    moveRight: 'KeyD',
    inventory: 'Tab',
  }
};

const KEYBIND_LABELS = {
  moveUp:    'Движение вверх',
  moveDown:  'Движение вниз',
  moveLeft:  'Движение влево',
  moveRight: 'Движение вправо',
  inventory: 'Инвентарь',
};