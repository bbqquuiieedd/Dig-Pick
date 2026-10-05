// ============================================================
//  noise.js — генератор псевдослучайного шума (Perlin-like 1D/2D)
//  Пока используется только под будущую генерацию мира.
// ============================================================

// Простой PRNG (Mulberry32). Принимает seed → возвращает функцию,
// которая даёт случайные числа [0, 1) в стабильном порядке.
function makeRng(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1D value-noise: плавные колебания [-1, 1].
// x — координата, seed — число, scale — «частота» (больше → мельче).
function valueNoise1D(x, seed, scale) {
  scale = scale || 1;
  const fx = x * scale;
  const x0 = Math.floor(fx);
  const x1 = x0 + 1;
  const t = fx - x0;
  const rng = makeRng(seed);
  // Хешируем x0/x1 в псевдослучайные значения
  const h0 = hash1D(x0, seed);
  const h1 = hash1D(x1, seed);
  // Плавная интерполяция (smoothstep)
  const s = t * t * (3 - 2 * t);
  return (h0 * (1 - s) + h1 * s) * 2 - 1;
}

function hash1D(x, seed) {
  let h = (x * 374761393 + seed * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

// 2D value-noise (для пещер). Диапазон [-1, 1].
function valueNoise2D(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = x0 + 1,        y1 = y0 + 1;
  const tx = x - x0,        ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return (nx0 * (1 - sy) + nx1 * sy) * 2 - 1;
}

function hash2D(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695040) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

// Многослойный (fractal) 1D шум — сумма октав.
function fbm1D(x, seed, octaves, scale) {
  octaves = octaves || 4;
  scale = scale || 1;
  let total = 0, amp = 1, freq = scale, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise1D(x, seed + i * 7919, freq) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / maxAmp;
}