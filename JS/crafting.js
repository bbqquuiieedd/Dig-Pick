// crafting.js
function normalizePattern(pattern){
  const h = pattern.length, w = pattern[0].length;
  let minY = h, minX = w, maxY = -1, maxX = -1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(pattern[y][x] !== null){
      if(y<minY) minY=y; if(x<minX) minX=x;
      if(y>maxY) maxY=y; if(x>maxX) maxX=x;
    }
  }
  if(maxY < 0) return null;
  const nh = maxY-minY+1, nw = maxX-minX+1;
  const out = [];
  for(let y=0;y<nh;y++){
    const row = [];
    for(let x=0;x<nw;x++) row.push(pattern[minY+y][minX+x]);
    out.push(row);
  }
  return { pattern: out, w: nw, h: nh };
}

function recipeMatches(pattern, slots, size){
  const nb = normalizePattern(pattern);
  if(!nb) return false;
  if(nb.h > size || nb.w > size) return false;
  const { pattern: p, w: pw, h: ph } = nb;
  for(let oy=0;oy<=size-ph;oy++) for(let ox=0;ox<=size-pw;ox++){
    let ok = true;
    for(let y=0;y<size&&ok;y++) for(let x=0;x<size&&ok;x++){
      const slot = slots[y*size+x];
      const slotId = slot ? slot.type : null;
      const pY = y-oy, pX = x-ox;
      let expected = null;
      if(pY>=0 && pY<ph && pX>=0 && pX<pw) expected = p[pY][pX];
      if(expected !== slotId){ ok = false; break; }
    }
    if(ok) return true;
  }
  return false;
}

function findRecipe(slots, size){
  for(const r of RECIPES){
    const ph = r.pattern.length, pw = r.pattern[0].length;
    if(ph > size || pw > size) continue;
    if(r.table === 'table' && size < 3) continue;
    if(recipeMatches(r.pattern, slots, size)) return r;
  }
  return null;
}

function getCraftPreview(){
  const size = state.uiCraftSize;
  const slots = state.uiCraftSlots.slice(0, size*size);
  return findRecipe(slots, size);
}

function tryCraft(){
  const size = state.uiCraftSize;
  const slots = state.uiCraftSlots.slice(0, size*size);
  const r = findRecipe(slots, size);
  if(!r) return false;
  for(let i=0;i<size*size;i++){
    const s = state.uiCraftSlots[i];
    if(s){ s.count--; if(s.count <= 0) state.uiCraftSlots[i] = null; }
  }
  const resultId = r.result.id;
  const resultCount = r.result.count;
  if(!addToInventory(resultId, resultCount)){
    if(state.uiCraftResult){
      // склеиваем только если не инструмент
      if(isStackable(resultId) && state.uiCraftResult.type === resultId){
        state.uiCraftResult.count += resultCount;
      }
    } else {
      state.uiCraftResult = makeItemStack(resultId, resultCount);
    }
  }
  return true;
}