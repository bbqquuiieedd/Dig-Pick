// ============================================================
//  tiles.js — определения блоков и стен
// ============================================================

// ------------------------------------------------------------
// БЛОКИ (передний план)
// ------------------------------------------------------------
const TILE_AIR     = 0;
const TILE_DIRT    = 1;
const TILE_GRASS   = 2;
const TILE_STONE   = 3;
const TILE_BEDROCK = 4;

// Свойства каждого блока:
//   solid       — есть ли коллизия
//   breakable   — можно ли сломать
//   texture     — имя текстуры для отрисовки
//   name        — человекочитаемое имя
//   hardness    — базовое время копания в секундах (с правильным инструментом)
//   tool        — каким инструментом копается быстро ('pickaxe'|'shovel'|'axe'|'hammer'|null)
//   drop        — какой tileId падает при разрушении (null — ничего)
//   dropChance  — вероятность дропа (0..1)
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
};

// ------------------------------------------------------------
// СТЕНЫ (задний план)
// ------------------------------------------------------------
const WALL_AIR     = 0;
const WALL_DIRT    = 1;
const WALL_STONE   = 2;
const WALL_BEDROCK = 3;

const WALL_DEFS = {
  [WALL_AIR]:     { texture: null,        name: 'Пусто' },
  [WALL_DIRT]:    { texture: 'dirt_wall',  name: 'Земляная стена' },
  [WALL_STONE]:   { texture: 'stone_wall', name: 'Каменная стена' },
  [WALL_BEDROCK]: { texture: 'bedrock_wall', name: 'Стена бедрока' },
};

// ------------------------------------------------------------
// МАППИНГ ИМЁН — для консольных команд
// ------------------------------------------------------------
const TILE_NAME_TO_ID = {
  'air':     TILE_AIR,
  'dirt':    TILE_DIRT,
  'grass':   TILE_GRASS,
  'stone':   TILE_STONE,
  'bedrock': TILE_BEDROCK,
};

const WALL_NAME_TO_ID = {
  'air_wall':     WALL_AIR,
  'dirt_wall':    WALL_DIRT,
  'stone_wall':   WALL_STONE,
  'bedrock_wall': WALL_BEDROCK,
};

// Возвращает { type: 'tile'|'wall', id } или null, если имя не найдено.
// Регистр не важен: 'Stone' == 'stone'.
function resolveBlockName(name) {
  if (!name) return null;
  const key = String(name).toLowerCase();

  // Сначала проверяем стены (у них суффикс '_wall')
  if (WALL_NAME_TO_ID[key] !== undefined) {
    return { type: 'wall', id: WALL_NAME_TO_ID[key] };
  }
  if (TILE_NAME_TO_ID[key] !== undefined) {
    return { type: 'tile', id: TILE_NAME_TO_ID[key] };
  }
  return null;
}

// Список имён для справки /help и автодополнения
function listTileNames()  { return Object.keys(TILE_NAME_TO_ID);  }
function listWallNames()  { return Object.keys(WALL_NAME_TO_ID);  }