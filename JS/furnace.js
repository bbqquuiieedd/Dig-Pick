function updateFurnace(dt){
  if(!state.furnaceTarget) return;
  state.furnaceProgress = Math.min(1, state.furnaceProgress);
  const now = Date.now();
  const hasInput = state.furnaceInput && (state.furnaceInput.type === O_IRON_ORE);
  const canOutput = !state.furnaceOutput || (state.furnaceOutput.type === I_IRON_INGOT && state.furnaceOutput.count < 99);
  if(hasInput && canOutput){
    if(!state.furnaceBurning){
      const f = state.furnaceFuel;
      if(f && (f.type === I_LOG || f.type === I_PLANKS || f.type === I_STICK)){
        let burnTime = SMELT_TIME_MS;
        if(f.type === I_PLANKS) burnTime = SMELT_TIME_MS*0.5;
        if(f.type === I_STICK)  burnTime = SMELT_TIME_MS*0.25;
        state.furnaceBurning = true;
        state.furnaceBurnUntil = now + burnTime;
        f.count--;
        if(f.count <= 0) state.furnaceFuel = null;
      }
    }
    if(state.furnaceBurning && now < state.furnaceBurnUntil){
      state.furnaceProgress += (dt*1000)/SMELT_TIME_MS;
      if(state.furnaceProgress >= 1){
        state.furnaceProgress = 0;
        state.furnaceInput.count--;
        if(state.furnaceInput.count <= 0) state.furnaceInput = null;
        if(state.furnaceOutput) state.furnaceOutput.count++;
        else state.furnaceOutput = { type: I_IRON_INGOT, count: 1 };
        state.furnaceBurning = false;
      }
    } else state.furnaceBurning = false;
  } else state.furnaceBurning = false;
}

function clearFurnaceContents(){
  if(state.furnaceInput){ addToInventory(state.furnaceInput.type, state.furnaceInput.count); state.furnaceInput = null; }
  if(state.furnaceFuel){ addToInventory(state.furnaceFuel.type, state.furnaceFuel.count); state.furnaceFuel = null; }
  if(state.furnaceOutput){ addToInventory(state.furnaceOutput.type, state.furnaceOutput.count); state.furnaceOutput = null; }
}