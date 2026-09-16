// chest.js
function ensureChest(tx,ty){
  const key = `${tx},${ty}`;
  if(!state.chests[key]) state.chests[key] = new Array(INV_COLS*CHEST_ROWS).fill(null);
  return state.chests[key];
}

function dropChestContents(tx,ty){
  const key = `${tx},${ty}`;
  const items = state.chests[key];
  if(items){
    for(const s of items) if(s) addToInventory(s.type, s.count, s.durability);
    delete state.chests[key];
  }
}