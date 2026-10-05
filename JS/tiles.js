// ============================================================
//  tiles.js — определения блоков
// ============================================================

const TILE_AIR     = 0;
const TILE_DIRT    = 1;
const TILE_GRASS   = 2;
const TILE_STONE   = 3;
const TILE_BEDROCK = 4;

const TILE_DEFS = {
  [TILE_AIR]:     { solid: false, breakable: false, texture: null,      name: 'Воздух' },
  [TILE_DIRT]:    { solid: true,  breakable: true,  texture: 'dirt',    name: 'Земля' },
  [TILE_GRASS]:   { solid: true,  breakable: true,  texture: 'grass',   name: 'Трава' },
  [TILE_STONE]:   { solid: true,  breakable: true,  texture: 'stone',   name: 'Камень' },
  [TILE_BEDROCK]: { solid: true,  breakable: false, texture: 'bedrock', name: 'Бедрок' },
};

// Раньше здесь была getGrassOverlay(). Теперь траву рисуем по простому правилу:
//   - сверху воздух → dirt + grass
//   - сверху любой блок → только dirt
// Логика вынесена прямо в render.js.