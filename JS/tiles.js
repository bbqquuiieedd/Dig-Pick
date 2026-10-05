// ============================================================
//  tiles.js — определения блоков и стен
// ============================================================

// ------------------------------------------------------------
// БЛОКИ
// ------------------------------------------------------------
const TILE_AIR          = 0;
const TILE_DIRT         = 1;
const TILE_GRASS        = 2;
const TILE_STONE        = 3;
const TILE_BEDROCK      = 4;
const TILE_LOG          = 5;   // обычное бревно (с коллизией, ставится игроком)
const TILE_LEAVES       = 6;
const TILE_SAPLING      = 7;
const TILE_COAL         = 8;
const TILE_IRON         = 9;
const TILE_LOG_NATURAL  = 10;  // бревно дерева (без коллизии, ставится генератором)

const TILE_DEFS = {
  [TILE_AIR]: {
    solid: false, breakable: false, texture: null, name: 'Воздух',
    hardness: 0, tool: null, drop: null, dropChance: 0,
  },
  [TILE_DIRT]: {
    solid: true, breakable: true, texture: 'dirt', name: 'Земля',
    hardness: 0.30, tool: 'shovel', drop: TILE_DIRT, dropChance: 1,
  },
  [TILE_GRASS]: {
    solid: true, breakable: true, texture: 'grass', name: 'Трава',
    hardness: 0.30, tool: 'shovel', drop: TILE_DIRT, dropChance: 1,
  },
  [TILE_STONE]: {
    solid: true, breakable: true, texture: 'stone', name: 'Камень',
    hardness: 0.90, tool: 'pickaxe', drop: TILE_STONE, dropChance: 1,
  },
  [TILE_BEDROCK]: {
    solid: true, breakable: false, texture: 'bedrock', name: 'Бедрок',
    hardness: Infinity, tool: null, drop: null, dropChance: 0,
  },
  [TILE_LOG]: {
    solid: true, breakable: true, texture: 'log', name: 'Бревно',
    hardness: 0.50, tool: 'axe', drop: TILE_LOG, dropChance: 1,
  },
  [TILE_LEAVES]: {
    solid: false, breakable: true, texture: 'leaves', name: 'Листва',
    hardness: 0.10, tool: null, drop: TILE_SAPLING, dropChance: 0.15,
  },
  [TILE_SAPLING]: {
    solid: false, breakable: true, texture: 'sapling', name: 'Росток',
    hardness: 0.05, tool: null, drop: TILE_SAPLING, dropChance: 1,
  },
  [TILE_COAL]: {
    solid: true, breakable: true, texture: 'coal_ore', name: 'Угольная руда',
    hardness: 1.20, tool: 'pickaxe', drop: TILE_COAL, dropChance: 1,
  },
  [TILE_IRON]: {
    solid: true, breakable: true, texture: 'iron_ore', name: 'Железная руда',
    hardness: 1.60, tool: 'pickaxe', drop: TILE_IRON, dropChance: 1,
  },
  // Природное бревно — то, что генерируется как часть дерева.
  // Без коллизии, но дропает обычное TILE_LOG.
  [TILE_LOG_NATURAL]: {
    solid: false, breakable: true, texture: 'log', name: 'Бревно (природное)',
    hardness: 0.50, tool: 'axe', drop: TILE_LOG, dropChance: 1,
  },
};

// ------------------------------------------------------------
// СТЕНЫ
// ------------------------------------------------------------
const WALL_AIR     = 0;
const WALL_DIRT    = 1;
const WALL_STONE   = 2;
const WALL_BEDROCK = 3;

const WALL_DEFS = {
  [WALL_AIR]:     { texture: null,           name: 'Пусто' },
  [WALL_DIRT]:    { texture: 'dirt_wall',    name: 'Земляная стена' },
  [WALL_STONE]:   { texture: 'stone_wall',   name: 'Каменная стена' },
  [WALL_BEDROCK]: { texture: 'bedrock_wall', name: 'Стена бедрока' },
};

// ------------------------------------------------------------
// МАППИНГ ИМЁН — для консольных команд
// ------------------------------------------------------------
const TILE_NAME_TO_ID = {
  'air':          TILE_AIR,
  'dirt':         TILE_DIRT,
  'grass':        TILE_GRASS,
  'stone':        TILE_STONE,
  'bedrock':      TILE_BEDROCK,
  'log':          TILE_LOG,
  'log_natural':  TILE_LOG_NATURAL,
  'leaves':       TILE_LEAVES,
  'sapling':      TILE_SAPLING,
  'coal':         TILE_COAL,
  'iron':         TILE_IRON,
};

const WALL_NAME_TO_ID = {
  'air_wall':     WALL_AIR,
  'dirt_wall':    WALL_DIRT,
  'stone_wall':   WALL_STONE,
  'bedrock_wall': WALL_BEDROCK,
};

function resolveBlockName(name) {
  if (!name) return null;
  const key = String(name).toLowerCase();
  if (WALL_NAME_TO_ID[key] !== undefined) return { type: 'wall', id: WALL_NAME_TO_ID[key] };
  if (TILE_NAME_TO_ID[key] !== undefined) return { type: 'tile', id: TILE_NAME_TO_ID[key] };
  return null;
}

function listTileNames() { return Object.keys(TILE_NAME_TO_ID); }
function listWallNames() { return Object.keys(WALL_NAME_TO_ID); }