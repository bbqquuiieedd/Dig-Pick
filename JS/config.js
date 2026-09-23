// ============================================================
// config.js — все константы, ITEMS, RECIPES
// ============================================================

const TILE = 32;

// ============================================================
// РАЗМЕРЫ МИРА (200 × 100 = 20 000 тайлов)
// ============================================================
const WORLD_W = 200, WORLD_H = 100;

const MOVE_SPEED = 3.2, REACH = 4.5, INV_COLS = 10, INV_ROWS = 3;
const SWIM_SPEED_MULT = 0.4;   // ⚡ ФИКС ВОДЫ (замедление в воде)
const HOTBAR_SIZE = 10, CHEST_ROWS = 3;

const SAVE_SLOTS = 3;
const SAVE_KEY_PREFIX = 'digpick_save_slot_';
const SAVE_VERSION = 5;

const FIXED_DT = 1/60, MAX_ACCUM = 0.25;
const SAPLING_GROW_MS = 60000;
const SMELT_TIME_MS = 5000;
const TILE_VARIANTS = 4;
const OBJ_PAD = 4;
const RECIPE_PAGE_SIZE = 6;
const SETTINGS_KEY = 'digpick_settings';

// ============================================================
// ВРЕМЯ СУТОК
// ============================================================
const DAY_LENGTH_MS = 12 * 60 * 1000;   // 12 минут
const DAY_DAY_MS    = 8 * 60 * 1000;    // 8 минут день
const DAY_NIGHT_MS  = 4 * 60 * 1000;    // 4 минуты ночь
const NIGHT_START   = DAY_DAY_MS / DAY_LENGTH_MS;  // 0.666...

// ============================================================
// ИГРОК
// ============================================================
const PLAYER_MAX_HP     = 10;
const PLAYER_MAX_HUNGER = 10;
const HUNGER_TICK_MS    = 5 * 60 * 1000;   // 1 голод за 5 минут
const HUNGER_RUN_MULT   = 2;               // бег ускоряет голод
const HP_REGEN_INTERVAL = 10000;           // 10 сек
const HP_REGEN_COST     = 1;               // 1 HP = 1 голод

// ============================================================
// ОГОНЬ
// ============================================================
const FIRE_SPREAD_CHANCE = 0.1;    // шанс в секунду
const FIRE_LIFE_MS       = 10000;  // 10 сек
const FIRE_MAX_RADIUS    = 10;

// ============================================================
// ID ПОЛОВ (floors)
// ============================================================
const F_GRASS=0, F_DIRT=1, F_SAND=2, F_WATER=3, F_FLOWERS=4, F_TALLGRASS=5,
      F_GRAVEL=6, F_BEDROCK=7, F_FARMLAND=8, F_FIRE=9;

// ============================================================
// ID ОБЪЕКТОВ (objects)
// ============================================================
const O_STONE=10, O_IRON_ORE=11, O_TRUNK=12, O_LEAVES=13, O_SAPLING=14,
      O_TABLE=15, O_FURNACE=16, O_CHEST=17, O_DOOR=18, O_GATE=19,
      O_FENCE=20, O_BED=21, O_CAMPFIRE=22, O_TORCH=23, O_CAKE=24,
      O_WHEAT=25, O_POTATO_PLANT=26, O_WALL=27;

const O_CAMPFIRE_LIT=28;

// ============================================================
// ID ПРЕДМЕТОВ
// ============================================================
const I_LOG=30, I_PLANKS=31, I_STICK=32, I_IRON_INGOT=33;
const I_FLINT=34, I_WHEAT=35, I_POTATO=36, I_POTATO_COOKED=37, I_POTATO_BURNT=38;
const I_MEAT=39, I_MEAT_COOKED=40, I_LEATHER=41, I_WOOL=42, I_EGG=43, I_MILK_BUCKET=44;
const I_BUCKET=45, I_WATER_BUCKET=46, I_EMERALD=47, I_APPLE=48, I_CAKE_ITEM=49, I_BREAD=50;

// ============================================================
// ID ИНСТРУМЕНТОВ
// ============================================================
const I_WOOD_PICK=100, I_WOOD_AXE=101, I_STONE_PICK=102, I_STONE_AXE=103, I_IRON_PICK=104, I_IRON_AXE=105;
const I_WOOD_HOE=106, I_STONE_HOE=107, I_IRON_HOE=108;
const I_WOOD_SWORD=109, I_STONE_SWORD=110, I_IRON_SWORD=111;
const I_SHEARS=112, I_LEASH=113, I_FLINT_STEEL=114;

const R = null;

// ============================================================
// ITEMS — справочник
// ============================================================
const ITEMS = {
  // ---------- Полы ----------
  0:{name:'Трава',color:'#5aad4a',layer:'floor',solid:false,placeable:true},
  1:{name:'Земля',color:'#8B5A2B',layer:'floor',solid:false,placeable:true},
  2:{name:'Песок',color:'#e8d68a',layer:'floor',solid:false,placeable:true},
  3:{name:'Вода',color:'#3a7bd5',layer:'floor',solid:false,placeable:false},
  4:{name:'Цветы',color:'#7fc95a',layer:'floor',solid:false,placeable:true},
  5:{name:'Высокая трава',color:'#4a9a3a',layer:'floor',solid:false,placeable:true},
  6:{name:'Гравий',color:'#8a8a7a',layer:'floor',solid:false,placeable:true,dropFlint:true},
  7:{name:'Неразрушаемый камень',color:'#3a3a3a',layer:'floor',solid:false,placeable:false},
  8:{name:'Грядка',color:'#6b4423',layer:'floor',solid:false,placeable:true,isFarmland:true},
  9:{name:'Огонь',color:'#ff8a3a',layer:'floor',solid:false,placeable:false,isFire:true},

  // ---------- Объекты ----------
  10:{name:'Камень',color:'#7a7a7a',layer:'object',solid:true,placeable:true,
      hardness:3000,requiredTool:'pickaxe',speedupTool:'pickaxe'},
  11:{name:'Железная руда',color:'#b0b0c0',layer:'object',solid:true,placeable:false,
      hardness:3500,requiredTool:'pickaxe',requiredTier:2,speedupTool:'pickaxe'},
  12:{name:'Ствол',color:'#a0522d',layer:'object',solid:true,placeable:false,
      hardness:2000,speedupTool:'axe',dropApple:0.15},
  13:{name:'Листва',color:'#3a8a3a',layer:'object',solid:false,placeable:false,
      hardness:400,speedupTool:'axe'},
  14:{name:'Росток',color:'#4a9a3a',layer:'object',solid:false,placeable:true,
      hardness:300,speedupTool:null},
  15:{name:'Верстак',color:'#a0522d',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe',interactive:'table'},
  16:{name:'Печь',color:'#5a5a5a',layer:'object',solid:true,placeable:true,
      hardness:2500,speedupTool:'pickaxe',interactive:'furnace'},
  17:{name:'Сундук',color:'#8a5025',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe',interactive:'chest'},
  18:{name:'Дверь',color:'#8a5025',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe',interactive:'door',toggleSolid:true},
  19:{name:'Калитка',color:'#8a5025',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe',interactive:'gate',toggleSolid:true},
  20:{name:'Забор',color:'#a0522d',layer:'object',solid:true,placeable:true,
      hardness:1000,speedupTool:'axe',isFence:true},
  21:{name:'Кровать',color:'#e53935',layer:'object',solid:true,placeable:true,
      hardness:800,interactive:'bed',setSpawn:true},
  22:{name:'Костёр',color:'#5a5a5a',layer:'object',solid:false,placeable:true,
      hardness:1000,speedupTool:'axe',interactive:'campfire'},
  23:{name:'Факел',color:'#ffcc44',layer:'object',solid:false,placeable:true,
      hardness:100,light:true},
  24:{name:'Торт',color:'#f0c8a8',layer:'object',solid:false,placeable:true,
      hardness:200,interactive:'cake'},
  25:{name:'Пшеница',color:'#e0c060',layer:'object',solid:false,placeable:false,
      hardness:100},
  26:{name:'Картофель (растение)',color:'#4a9a3a',layer:'object',solid:false,placeable:false,
      hardness:100},
  27:{name:'Стена',color:'#6b3a1a',layer:'object',solid:true,placeable:true,
      hardness:2000,speedupTool:'axe'},
  28:{name:'Горящий костёр',color:'#ff6a1a',layer:'object',solid:false,placeable:false,
      hardness:1000,speedupTool:'axe',interactive:'campfire'},

  // ---------- Предметы ----------
  30:{name:'Бревно',color:'#6b3a1a',layer:'object',solid:true,placeable:true,
      hardness:1500,speedupTool:'axe'},
  31:{name:'Доски',color:'#a0522d',layer:'object',solid:true,placeable:true,
      hardness:1200,speedupTool:'axe'},
  32:{name:'Палка',color:'#8a5025',layer:null,placeable:false},
  33:{name:'Железный слиток',color:'#c8c8d4',layer:null,placeable:false},
  34:{name:'Кремень',color:'#5a5a5a',layer:null,placeable:false},
  35:{name:'Пшеница',color:'#e0c060',layer:null,placeable:false,food:2},
  36:{name:'Картофель',color:'#c89a5a',layer:null,placeable:false,food:1,plantOnFarmland:26},
  37:{name:'Жареный картофель',color:'#d4a017',layer:null,placeable:false,food:4,hpRestore:1},
  39:{name:'Мясо',color:'#e05a5a',layer:null,placeable:false,food:2},
  40:{name:'Жареное мясо',color:'#8a3a1a',layer:null,placeable:false,food:5,hpRestore:2},
  42:{name:'Шерсть',color:'#f0f0f0',layer:null,placeable:false},
  43:{name:'Яйцо',color:'#f0e8d8',layer:null,placeable:false,food:1},
  44:{name:'Молоко (ведро)',color:'#f8f8f0',layer:null,placeable:false,food:3,hpRestore:1},
  45:{name:'Ведро',color:'#a0a0a8',layer:null,placeable:false},
  46:{name:'Ведро с водой',color:'#3a7bd5',layer:null,placeable:false},
  47:{name:'Изумруд',color:'#2ecc71',layer:null,placeable:false},
  48:{name:'Яблоко',color:'#e04030',layer:null,placeable:false,food:3},
  49:{name:'Торт (предмет)',color:'#f0c8a8',layer:null,placeable:false,placeAsObject:24},
  50:{name:'Хлеб',color:'#d4a86a',layer:null,placeable:false,food:5,hpRestore:1},

  // ---------- Инструменты ----------
  100:{name:'Дер. кирка',color:'#a0522d',kind:'tool',tool:'pickaxe',tier:1,maxDurability:40},
  101:{name:'Дер. топор',color:'#a0522d',kind:'tool',tool:'axe',tier:1,maxDurability:40},
  102:{name:'Кам. кирка',color:'#7a7a7a',kind:'tool',tool:'pickaxe',tier:2,maxDurability:80},
  103:{name:'Кам. топор',color:'#7a7a7a',kind:'tool',tool:'axe',tier:2,maxDurability:80},
  104:{name:'Жел. кирка',color:'#c8c8d4',kind:'tool',tool:'pickaxe',tier:3,maxDurability:150},
  105:{name:'Жел. топор',color:'#c8c8d4',kind:'tool',tool:'axe',tier:3,maxDurability:150},
  106:{name:'Дер. мотыга',color:'#a0522d',kind:'tool',tool:'hoe',tier:1,maxDurability:40},
  107:{name:'Кам. мотыга',color:'#7a7a7a',kind:'tool',tool:'hoe',tier:2,maxDurability:80},
  108:{name:'Жел. мотыга',color:'#c8c8d4',kind:'tool',tool:'hoe',tier:3,maxDurability:150},
  109:{name:'Дер. меч',color:'#a0522d',kind:'tool',tool:'sword',tier:1,maxDurability:60,damage:1,attackCooldown:0.5},
  110:{name:'Кам. меч',color:'#7a7a7a',kind:'tool',tool:'sword',tier:2,maxDurability:120,damage:1,attackCooldown:0.4},
  111:{name:'Жел. меч',color:'#c8c8d4',kind:'tool',tool:'sword',tier:3,maxDurability:200,damage:2,attackCooldown:0.5},
  112:{name:'Ножницы',color:'#c8c8d4',kind:'tool',tool:'shears',tier:2,maxDurability:100,damage:1,attackCooldown:0.5},
  113:{name:'Поводок',color:'#c9a87a',layer:null,placeable:false,isLeash:true},
  114:{name:'Кремень и кресало',color:'#8a5a2a',kind:'tool',tool:'flintsteel',tier:2,maxDurability:80},
};

// ============================================================
// RECIPES — крафт (2×2 и 3×3)
// ============================================================
const RECIPES = [
  // ---------- Базовые ----------
  { type:'craft', pattern:[[I_LOG,R],[R,R]], result:{id:I_PLANKS,count:4}, table:'any' },
  { type:'craft', pattern:[[I_PLANKS,R],[I_PLANKS,R]], result:{id:I_STICK,count:4}, table:'any' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS],[I_PLANKS,I_PLANKS]], result:{id:O_TABLE,count:1}, table:'any' },
  { type:'craft', pattern:[[O_STONE,O_STONE,O_STONE],[O_STONE,R,O_STONE],[O_STONE,O_STONE,O_STONE]], result:{id:O_FURNACE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[I_PLANKS,R,I_PLANKS],[I_PLANKS,I_PLANKS,I_PLANKS]], result:{id:O_CHEST,count:1}, table:'table' },

  // ---------- Забор, калитка, дверь ----------
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[I_STICK,R,I_STICK],[I_PLANKS,I_PLANKS,I_PLANKS]], result:{id:O_FENCE,count:4}, table:'table' },
  { type:'craft', pattern:[[I_STICK,I_PLANKS,I_STICK],[I_STICK,I_PLANKS,I_STICK],[I_STICK,I_PLANKS,I_STICK]], result:{id:O_GATE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[I_PLANKS,R,I_PLANKS],[I_PLANKS,R,I_PLANKS]], result:{id:O_DOOR,count:1}, table:'table' },

  // ---------- Инструменты: кирки и топоры ----------
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,I_PLANKS],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_PICK,count:1}, table:'table' },
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,R],[I_PLANKS,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_AXE,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,O_STONE,O_STONE],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_PICK,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,O_STONE,R],[O_STONE,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_AXE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,I_IRON_INGOT,I_IRON_INGOT],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_PICK,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,I_IRON_INGOT,R],[I_IRON_INGOT,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_AXE,count:1}, table:'table' },

  // ---------- Мотыги ----------
  { type:'craft', pattern:[[I_PLANKS,I_PLANKS,R],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_WOOD_HOE,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,O_STONE,R],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_STONE_HOE,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,I_IRON_INGOT,R],[R,I_STICK,R],[R,I_STICK,R]], result:{id:I_IRON_HOE,count:1}, table:'table' },

  // ---------- Мечи ----------
  { type:'craft', pattern:[[I_PLANKS,R,R],[I_PLANKS,R,R],[I_STICK,R,R]], result:{id:I_WOOD_SWORD,count:1}, table:'table' },
  { type:'craft', pattern:[[O_STONE,R,R],[O_STONE,R,R],[I_STICK,R,R]], result:{id:I_STONE_SWORD,count:1}, table:'table' },
  { type:'craft', pattern:[[I_IRON_INGOT,R,R],[I_IRON_INGOT,R,R],[I_STICK,R,R]], result:{id:I_IRON_SWORD,count:1}, table:'table' },

  // ---------- Ножницы (диагональ) ----------
  { type:'craft', pattern:[[I_IRON_INGOT,R],[R,I_IRON_INGOT]], result:{id:I_SHEARS,count:1}, table:'any' },

  // ---------- Кремень и кресало (диагональ) ----------
  { type:'craft', pattern:[[I_IRON_INGOT,R],[R,I_FLINT]], result:{id:I_FLINT_STEEL,count:1}, table:'table' },

  // ---------- Ведро ----------
  { type:'craft', pattern:[[I_IRON_INGOT,R,I_IRON_INGOT],[R,I_IRON_INGOT,R]], result:{id:I_BUCKET,count:1}, table:'table' },

  // ---------- Поводок (2 шерсти вертикально) ----------
  { type:'craft', pattern:[[I_WOOL],[I_WOOL]], result:{id:I_LEASH,count:1}, table:'any' },

  // ---------- Кровать (3 шерсти + 3 доски) ----------
  { type:'craft', pattern:[[I_WOOL,I_WOOL,I_WOOL],[I_PLANKS,I_PLANKS,I_PLANKS]], result:{id:O_BED,count:1}, table:'table' },

  // ---------- Торт (1 молоко + 2 яйца + 3 пшеницы) ----------
  { type:'craft', pattern:[[I_MILK_BUCKET,I_EGG,I_EGG],[I_WHEAT,I_WHEAT,I_WHEAT]], result:{id:I_CAKE_ITEM,count:1}, table:'table' },

  // ---------- Хлеб (3 пшеницы) ----------
  { type:'craft', pattern:[[I_WHEAT,I_WHEAT,I_WHEAT]], result:{id:I_BREAD,count:1}, table:'any' },
];

// ============================================================
// Печь — что плавится
// ============================================================
const FURNACE_RECIPES = [
  { type:'furnace', input:O_IRON_ORE, output:{ id:I_IRON_INGOT, count:1 } },
];

// ============================================================
// Костёр — что жарится
// ============================================================
const CAMPFIRE_RECIPES = [
    { type:'campfire', input:I_POTATO, output:I_POTATO_COOKED, burned:null, cookMs:10000, burnMs:30000 },
    { type:'campfire', input:I_MEAT,   output:I_MEAT_COOKED,   burned:null, cookMs:15000, burnMs:45000 },
];

// ============================================================
// ТОРГОВЛЯ
// ============================================================
const TRADE_SELL = [
  { input:I_STICK,     count:32, price:1 },
  { input:I_PLANKS,    count:16, price:1 },
  { input:I_LOG,       count:8,  price:1 },
  { input:O_STONE,     count:16, price:1 },
  { input:O_IRON_ORE,  count:4,  price:1 },
  { input:I_IRON_INGOT,count:2,  price:1 },
  { input:I_POTATO,    count:16, price:1 },
  { input:I_WHEAT,     count:12, price:1 },
  { input:I_WOOL,      count:8,  price:1 },
  { input:I_APPLE,     count:8,  price:1 },
  { input:I_FLINT,     count:8,  price:1 },
  { input:I_MEAT,      count:8,  price:1 },
  { input:I_POTATO_COOKED, count:6, price:1 },
  { input:I_MEAT_COOKED,   count:4, price:1 },
  { input:I_BREAD,     count:3,  price:1 },
];
const TRADE_BUY = [
  { price:2,  output:I_POTATO,  count:8 },
  { price:3,  output:I_BREAD,   count:3 },
  { price:4,  output:I_EGG,     count:3 },
  { price:3,  output:I_MILK_BUCKET, count:1 },
  { price:5,  output:I_IRON_INGOT, count:1 },
  { price:6,  output:I_IRON_PICK,  count:1 },
  { price:6,  output:I_IRON_AXE,   count:1 },
  { price:8,  output:I_SHEARS,     count:1 },
  { price:20, output:I_BUCKET,     count:1 },
  { price:6,  output:I_WHEAT,      count:8 },
  { price:10, output:I_WOOL,       count:8 },
  { price:12, output:I_EMERALD,    count:1 },
];

// ============================================================
// Общий список для книги рецептов
// ============================================================
const ALL_RECIPES_VIEW = [...RECIPES, ...FURNACE_RECIPES];

// ============================================================
// Пути к текстурам
// ============================================================
const TEXTURE_PATHS = {
  items: {
    // Полы
    0:'textures/tiles/grass.png',1:'textures/tiles/dirt.png',2:'textures/tiles/sand.png',
    3:'textures/tiles/water.png',4:'textures/tiles/flowers.png',5:'textures/tiles/tallgrass.png',
    6:'textures/tiles/gravel.png',7:'textures/tiles/bedrock.png',8:'textures/tiles/farmland.png',
    // Объекты
    10:'textures/tiles/stone.png',11:'textures/tiles/iron_ore.png',
    12:'textures/tiles/tree.png',13:'textures/tiles/leaves.png',14:'textures/tiles/sapling.png',
    15:'textures/tiles/workbench.png',16:'textures/tiles/furnace.png',17:'textures/tiles/chest.png',
    18:'textures/tiles/door.png',19:'textures/tiles/gate.png',20:'textures/tiles/fence.png',
    21:'textures/tiles/bed.png',22:'textures/tiles/campfire.png',23:'textures/tiles/torch.png',
    24:'textures/tiles/cake.png',25:'textures/tiles/wheat.png',26:'textures/tiles/potato_plant.png',
    27:'textures/tiles/wall.png',
    // Предметы
    30:'textures/items/log.png',31:'textures/items/planks.png',
    32:'textures/items/stick.png',33:'textures/items/iron_ingot.png',
    34:'textures/items/flint.png',35:'textures/items/wheat_item.png',
    36:'textures/items/potato.png',37:'textures/items/potato_cooked.png',38:'textures/items/potato_burnt.png',
    39:'textures/items/meat.png',40:'textures/items/meat_cooked.png',
    42:'textures/items/wool.png',
    43:'textures/items/egg.png',44:'textures/items/milk_bucket.png',
    45:'textures/items/bucket.png',46:'textures/items/water_bucket.png',
    47:'textures/items/emerald.png',48:'textures/items/apple.png',
    49:'textures/items/cake_item.png',50:'textures/items/bread.png',
    // Инструменты
    100:'textures/tools/wood_pickaxe.png',101:'textures/tools/wood_axe.png',
    102:'textures/tools/stone_pickaxe.png',103:'textures/tools/stone_axe.png',
    104:'textures/tools/iron_pickaxe.png',105:'textures/tools/iron_axe.png',
    106:'textures/tools/wood_hoe.png',107:'textures/tools/stone_hoe.png',108:'textures/tools/iron_hoe.png',
    109:'textures/tools/wood_sword.png',110:'textures/tools/stone_sword.png',111:'textures/tools/iron_sword.png',
    112:'textures/tools/shears.png',113:'textures/items/leash.png',114:'textures/tools/flint_steel.png',
  },
  player: 'textures/player.png',
};

// ============================================================
// Настройки по умолчанию
// ============================================================
const DEFAULT_SETTINGS = {
  theme: 'light',
  autosaveMinutes: 1,
  showFps: true,
  showHelp: true,
  keybinds: {
    moveUp:    'KeyW',
    moveDown:  'KeyS',
    moveLeft:  'KeyA',
    moveRight: 'KeyD',
    inventory: 'Tab',
    dropItem:  'KeyQ',
  }
};

const KEYBIND_LABELS = {
  moveUp:    'Движение вверх',
  moveDown:  'Движение вниз',
  moveLeft:  'Движение влево',
  moveRight: 'Движение вправо',
  inventory: 'Инвентарь',
  dropItem:  'Выбросить предмет',
};