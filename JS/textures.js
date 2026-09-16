// textures.js
function getItemImage(id){
  const img = state.images[`item_${id}`];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}
function getPlayerImage(){
  const img = state.images.player;
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

function loadImage(key, path){
  return new Promise(res=>{
    const img = new Image();
    img.onload = ()=>{ if(img.naturalWidth > 0) state.images[key] = img; res(); };
    img.onerror = ()=>{ console.warn(`⚠️ Нет текстуры: ${path}`); res(); };
    img.src = path;
  });
}

function loadAllTextures(){
  const ps = [];
  for(const [id, path] of Object.entries(TEXTURE_PATHS.items)) ps.push(loadImage(`item_${id}`, path));
  ps.push(loadImage('player', TEXTURE_PATHS.player));
  return Promise.all(ps);
}

function buildAllCaches(){
  for(const idStr in ITEMS){
    const id = parseInt(idStr);
    const item = ITEMS[id];
    if(!item) continue;
    if(item.layer === 'floor'){
      if(id === F_WATER) continue;
      const arr = [];
      for(let v=0;v<TILE_VARIANTS;v++) arr.push(makeFloorCanvas(id,v));
      state.floorCache[id] = arr;
    } else if(item.layer === 'object'){
      const arr = [];
      for(let v=0;v<TILE_VARIANTS;v++) arr.push(makeObjectCanvas(id,v));
      state.objectCache[id] = arr;
    }
  }
  for(const id of [I_LOG, I_PLANKS, I_STICK, I_IRON_INGOT]){
    state.itemCache[id] = [makeItemCanvas(id)];
  }
}

function makeFloorCanvas(id, variant){
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  drawFloorToCtx(c.getContext('2d'), id, (variant*2654435761+id*40503)>>>0);
  return c;
}
function makeObjectCanvas(id, variant){
  const c = document.createElement('canvas');
  c.width = TILE+OBJ_PAD*2; c.height = TILE+OBJ_PAD*2;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillRect(OBJ_PAD+3, OBJ_PAD+3, TILE, TILE);
  drawObjectToCtx(g, id, (variant*2246822519+id*3266489917)>>>0, OBJ_PAD, OBJ_PAD);
  return c;
}
function makeItemCanvas(id){
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  drawItemToCtx(c.getContext('2d'), id, TILE);
  return c;
}

// ... ниже идут drawItemToCtx, drawFloorToCtx, drawObjectToCtx — БЕЗ изменений,
// просто убери слово export перед function (у тебя их и не было, кроме makeXxx).

function drawItemToCtx(g, id, size){
  g.clearRect(0,0,size,size);
  if(id === I_LOG){
    g.fillStyle='#8a4a1a'; g.fillRect(size*0.15,size*0.15,size*0.7,size*0.7);
    g.fillStyle='#4a2508';
    for(let i=0;i<6;i++){
      const x=size*0.15+i*(size*0.7/6)+Math.sin(i*3.7)*1.5;
      g.fillRect(x,size*0.15,1.5+(i%2),size*0.7);
    }
    g.fillStyle='rgba(200,130,70,0.5)';
    for(let i=0;i<3;i++) g.fillRect(size*0.2+i*(size*0.6/3),size*0.18,1,size*0.64);
    const cx=size/2, cy=size/2;
    g.fillStyle='#c98a4a';
    g.beginPath(); g.ellipse(cx,cy,size*0.12,size*0.08,0,0,Math.PI*2); g.fill();
    g.strokeStyle='#6a3a1a'; g.lineWidth=1; g.stroke();
    g.strokeStyle='#8a5025';
    g.beginPath(); g.ellipse(cx,cy,size*0.07,size*0.045,0,0,Math.PI*2); g.stroke();
    g.beginPath(); g.ellipse(cx,cy,size*0.03,size*0.02,0,0,Math.PI*2); g.stroke();
    g.fillStyle='rgba(255,200,140,0.2)'; g.fillRect(size*0.15,size*0.15,size*0.7,2);
    g.strokeStyle='#3a1a08'; g.lineWidth=1.5; g.strokeRect(size*0.15,size*0.15,size*0.7,size*0.7);
  } else if(id === I_PLANKS){
    g.fillStyle='#a0522d'; g.fillRect(size*0.1,size*0.1,size*0.8,size*0.8);
    g.fillStyle='#3a1a08';
    for(let i=1;i<4;i++) g.fillRect(size*0.1,size*0.1+i*(size*0.8/4)-0.5,size*0.8,1.5);
    g.fillStyle='rgba(120,70,30,0.4)';
    for(let i=0;i<4;i++){
      const y=size*0.1+i*(size*0.8/4)+(size*0.8/8);
      g.fillRect(size*0.15,y,size*0.7,0.5);
      g.fillRect(size*0.2,y+2,size*0.5,0.5);
    }
    g.fillStyle='rgba(255,200,140,0.25)';
    for(let i=0;i<4;i++) g.fillRect(size*0.1,size*0.1+i*(size*0.8/4),size*0.8,1.5);
    g.strokeStyle='#3a1a08'; g.lineWidth=1.5; g.strokeRect(size*0.1,size*0.1,size*0.8,size*0.8);
  } else if(id === I_STICK){
    g.save(); g.translate(size/2,size/2); g.rotate(-Math.PI/4);
    g.fillStyle='#6b3a1a'; g.fillRect(-size*0.38,-size*0.05,size*0.76,size*0.1);
    g.fillStyle='#8a5025'; g.fillRect(-size*0.38,-size*0.05,size*0.76,size*0.04);
    g.fillStyle='#3a1a08'; g.fillRect(-size*0.38,size*0.02,size*0.76,size*0.03);
    g.fillStyle='#6b3a1a';
    g.fillRect(-size*0.05,-size*0.18,size*0.04,size*0.14);
    g.fillRect(size*0.1,size*0.05,size*0.04,size*0.16);
    g.fillRect(-size*0.22,-size*0.14,size*0.03,size*0.09);
    g.restore();
  } else if(id === I_IRON_INGOT){
    g.fillStyle='#a8a8b8';
    g.beginPath();
    g.moveTo(size*0.2,size*0.65); g.lineTo(size*0.3,size*0.35);
    g.lineTo(size*0.7,size*0.35); g.lineTo(size*0.8,size*0.65); g.closePath(); g.fill();
    g.fillStyle='#d8d8e8';
    g.beginPath();
    g.moveTo(size*0.3,size*0.35); g.lineTo(size*0.7,size*0.35);
    g.lineTo(size*0.65,size*0.42); g.lineTo(size*0.35,size*0.42); g.closePath(); g.fill();
    g.fillStyle='rgba(255,255,255,0.5)'; g.fillRect(size*0.4,size*0.38,size*0.15,1.5);
    g.fillStyle='#5a5a6a'; g.fillRect(size*0.2,size*0.62,size*0.6,3);
    g.strokeStyle='#3a3a4a'; g.lineWidth=1.5;
    g.beginPath();
    g.moveTo(size*0.2,size*0.65); g.lineTo(size*0.3,size*0.35);
    g.lineTo(size*0.7,size*0.35); g.lineTo(size*0.8,size*0.65); g.closePath(); g.stroke();
  }
}

function drawFloorToCtx(g, id, hash){
  const def = ITEMS[id];
  g.fillStyle = def.color; g.fillRect(0,0,TILE,TILE);
  if(id === 0){
    g.strokeStyle='rgba(30,90,30,0.55)'; g.lineWidth=1.5;
    for(let i=0;i<6;i++){
      const s=(hash+i*7919)>>>0;
      const gx=3+(s%(TILE-6)), gy=6+((s>>8)%(TILE-12));
      const lean=((s>>16)%3)-1;
      g.beginPath(); g.moveTo(gx,gy+5); g.lineTo(gx+lean,gy); g.stroke();
    }
    g.fillStyle='rgba(20,60,20,0.25)';
    for(let i=0;i<3;i++){const s=(hash+i*3571)>>>0;g.fillRect(4+(s%(TILE-8)),4+((s>>8)%(TILE-8)),2,2);}
  } else if(id === 1){
    g.fillStyle='rgba(60,35,15,0.35)';
    for(let i=0;i<5;i++){const s=(hash+i*4241)>>>0;g.fillRect(4+(s%(TILE-8)),4+((s>>8)%(TILE-8)),2,2);}
    g.fillStyle='rgba(160,120,80,0.2)';
    for(let i=0;i<3;i++){const s=(hash+i*9973)>>>0;g.fillRect(6+(s%(TILE-12)),6+((s>>8)%(TILE-12)),2,2);}
  } else if(id === 2){
    g.strokeStyle='rgba(180,160,100,0.4)'; g.lineWidth=1;
    for(let i=0;i<3;i++){
      const yy=8+i*8;
      g.beginPath(); g.moveTo(3,yy); g.quadraticCurveTo(TILE/2,yy-2,TILE-3,yy); g.stroke();
    }
  } else if(id === 4){
    g.strokeStyle='rgba(40,100,40,0.6)'; g.lineWidth=1.5;
    for(let i=0;i<4;i++){const gx=5+i*7;g.beginPath();g.moveTo(gx,TILE-4);g.lineTo(gx+1,12);g.stroke();}
    g.fillStyle='rgba(255,200,50,0.95)';
    g.beginPath();g.arc(10,10,2.5,0,Math.PI*2);g.arc(22,16,2.5,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,100,150,0.95)';
    g.beginPath();g.arc(16,22,2.5,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,240,100,1)';
    g.beginPath();g.arc(10,10,1,0,Math.PI*2);g.arc(22,16,1,0,Math.PI*2);g.arc(16,22,1,0,Math.PI*2);g.fill();
  } else if(id === 5){
    g.strokeStyle='rgba(30,80,30,0.8)'; g.lineWidth=1.8;
    for(let i=0;i<5;i++){
      const gx=4+i*6; const lean=((i%2)?1:-1)*2;
      g.beginPath(); g.moveTo(gx,TILE-3); g.quadraticCurveTo(gx+lean,16,gx+lean*2,8); g.stroke();
    }
  } else if(id === 6){
    for(let i=0;i<6;i++){
      const s=(hash+i*3181)>>>0;
      const gx=4+(s%(TILE-8)), gy=4+((s>>8)%(TILE-8));
      g.fillStyle='rgba(60,60,60,0.5)'; g.fillRect(gx,gy,3,3);
      g.fillStyle='rgba(180,180,170,0.5)'; g.fillRect(gx+1,gy+1,1,1);
    }
  } else if(id === F_FARMLAND){
    g.fillStyle = '#6b4423'; g.fillRect(0, 0, TILE, TILE);
    // Борозды
    for(let i=0;i<3;i++){
      const yy = 6 + i * 8;
      g.fillStyle = 'rgba(120, 70, 40, 0.55)';
      g.fillRect(2, yy, TILE - 4, 2);
      g.fillStyle = 'rgba(0, 0, 0, 0.35)';
      g.fillRect(2, yy + 2, TILE - 4, 1);
    }
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, TILE-1, TILE-1);
  } else if(id === F_BEDROCK){
    g.fillStyle='#3a3a3a'; g.fillRect(0,0,TILE,TILE);
    for(let i=0;i<8;i++){
      const s=(hash+i*7919)>>>0;
      g.fillStyle='rgba(0,0,0,0.55)';
      g.fillRect(3+(s%(TILE-6)),3+((s>>8)%(TILE-6)),3+((s>>16)%4),2+((s>>20)%3));
    }
    for(let i=0;i<4;i++){
      const s=(hash+i*4241)>>>0;
      g.fillStyle='rgba(120,120,120,0.35)';
      g.fillRect(4+(s%(TILE-8)),4+((s>>8)%(TILE-8)),2,2);
    }
    g.strokeStyle='rgba(0,0,0,0.7)'; g.lineWidth=1; g.strokeRect(0.5,0.5,TILE-1,TILE-1);
  }
  if(id !== F_BEDROCK){
    g.strokeStyle='rgba(0,0,0,0.15)'; g.lineWidth=1; g.strokeRect(0.5,0.5,TILE-1,TILE-1);
  }
}

function drawObjectToCtx(g, id, hash, px, py){
  if(id === 10){
    g.fillStyle='#7a7a7a'; g.fillRect(px,py,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.12)'; g.fillRect(px,py,TILE,3);
    for(let i=0;i<3;i++){
      const s=(hash+i*6151)>>>0;
      const cx=px+6+(s%(TILE-12)), cy=py+6+((s>>8)%(TILE-12));
      const r=2+((s>>16)%3);
      g.fillStyle='rgba(0,0,0,0.28)'; g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.fill();
      g.fillStyle='rgba(255,255,255,0.10)'; g.beginPath(); g.arc(cx+0.5,cy+0.8,r*0.6,0,Math.PI*2); g.fill();
    }
    g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=1;
    const sx1=px+4+(hash%(TILE-10)), sy1=py+4+((hash>>4)%(TILE-10));
    g.beginPath(); g.moveTo(sx1,sy1); g.lineTo(sx1+5,sy1+3); g.lineTo(sx1+3,sy1+7); g.stroke();
  } else if(id === 12){
    g.fillStyle='#a0522d'; g.fillRect(px,py,TILE,TILE);
    g.fillStyle='rgba(80,30,10,0.55)';
    for(let i=0;i<4;i++){
      const sx=px+4+(i*(TILE-8))/3;
      const wobble=((hash>>i)&3)-2;
      g.fillRect(sx+wobble,py+2,1.5,TILE-4);
    }
    g.fillStyle='rgba(220,160,100,0.25)';
    for(let i=0;i<3;i++) g.fillRect(px+6+i*8,py+3,1,TILE-6);
    const kx=px+8+(hash%(TILE-16)), ky=py+8+((hash>>4)%(TILE-16));
    g.fillStyle='rgba(60,20,0,0.5)'; g.beginPath(); g.ellipse(kx,ky,3,4,0,0,Math.PI*2); g.fill();
    g.fillStyle='rgba(140,70,30,0.8)'; g.beginPath(); g.ellipse(kx,ky,1.5,2,0,0,Math.PI*2); g.fill();
    g.fillStyle='rgba(255,200,140,0.15)'; g.fillRect(px,py,TILE,2);
  } else if(id === 13){
    g.fillStyle='#3a8a3a'; g.fillRect(px,py,TILE,TILE);
    for(let i=0;i<7;i++){
      const s=(hash+i*3571)>>>0;
      g.fillStyle='rgba(20,60,20,0.5)';
      g.beginPath(); g.arc(px+3+(s%(TILE-6)),py+3+((s>>8)%(TILE-6)),2+((s>>16)%2),0,Math.PI*2); g.fill();
    }
    for(let i=0;i<5;i++){
      const s=(hash+i*7919)>>>0;
      g.fillStyle='rgba(120,200,100,0.4)';
      g.beginPath(); g.arc(px+4+(s%(TILE-8)),py+4+((s>>8)%(TILE-8)),1.5,0,Math.PI*2); g.fill();
    }
    g.strokeStyle='rgba(0,0,0,0.4)'; g.lineWidth=1; g.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
  } else if(id === 14){
    g.fillStyle='rgba(0,0,0,0.15)'; g.fillRect(px,py,TILE,TILE);
    g.fillStyle='rgba(90,60,30,0.5)';
    g.beginPath(); g.ellipse(px+TILE/2,py+TILE-6,8,3,0,0,Math.PI*2); g.fill();
    g.strokeStyle='#6b3a1a'; g.lineWidth=2;
    g.beginPath(); g.moveTo(px+TILE/2,py+TILE-6); g.lineTo(px+TILE/2,py+TILE/2); g.stroke();
    g.fillStyle='#3a8a3a';
    g.beginPath(); g.arc(px+TILE/2-5,py+TILE/2+2,5,0,Math.PI*2); g.fill();
    g.beginPath(); g.arc(px+TILE/2+5,py+TILE/2-2,5,0,Math.PI*2); g.fill();
    g.fillStyle='rgba(120,200,100,0.5)';
    g.beginPath(); g.arc(px+TILE/2-6,py+TILE/2,1.5,0,Math.PI*2); g.fill();
    g.beginPath(); g.arc(px+TILE/2+4,py+TILE/2-3,1.5,0,Math.PI*2); g.fill();
  } else if(id === 11){
    g.fillStyle='#6a6a6a'; g.fillRect(px,py,TILE,TILE);
    for(let i=0;i<2;i++){
      const s=(hash+i*5311)>>>0;
      g.fillStyle='rgba(0,0,0,0.22)';
      g.beginPath(); g.arc(px+6+(s%(TILE-12)),py+6+((s>>8)%(TILE-12)),2,0,Math.PI*2); g.fill();
    }
    g.lineCap='round';
    for(let v=0;v<4;v++){
      const s1=(hash+v*9973)>>>0;
      const x1=px+5+(s1%(TILE-10)), y1=py+5+((s1>>8)%(TILE-10));
      const s2=(s1*7919+31)>>>0;
      const x2=Math.max(px+4,Math.min(px+TILE-4,x1+(s2%9)-4));
      const y2=Math.max(py+4,Math.min(py+TILE-4,y1+((s2>>8)%9)-4));
      g.strokeStyle='rgba(0,0,0,0.5)'; g.lineWidth=4;
      g.beginPath(); g.moveTo(x1+0.5,y1+1); g.lineTo(x2+0.5,y2+1); g.stroke();
      g.strokeStyle='#c8c8d4'; g.lineWidth=2.5;
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
      g.strokeStyle='#e8e8f4'; g.lineWidth=1.2;
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
      g.fillStyle='#ffffff'; g.beginPath(); g.arc(x1,y1,1.3,0,Math.PI*2); g.fill();
    }
    g.fillStyle='rgba(255,255,255,0.10)'; g.fillRect(px,py,TILE,2);
  } else if(id === 15){
    g.fillStyle='#6b3a1a'; g.fillRect(px,py,TILE,TILE);
    g.fillStyle='#a0522d'; g.fillRect(px+2,py+2,TILE-4,TILE-4);
    g.fillStyle='rgba(140,80,40,0.35)';
    for(let i=0;i<4;i++) g.fillRect(px+2,py+4+i*6.5,TILE-4,0.8);
    const gs=6, gsize=TILE-12, cell=gsize/3;
    g.strokeStyle='rgba(60,25,10,0.75)'; g.lineWidth=1.5;
    for(let i=1;i<3;i++){
      g.beginPath(); g.moveTo(px+gs+i*cell,py+gs); g.lineTo(px+gs+i*cell,py+gs+gsize); g.stroke();
      g.beginPath(); g.moveTo(px+gs,py+gs+i*cell); g.lineTo(px+gs+gsize,py+gs+i*cell); g.stroke();
    }
    g.strokeStyle='rgba(60,25,10,0.85)'; g.lineWidth=2;
    g.strokeRect(px+gs,py+gs,gsize,gsize);
    g.fillStyle='rgba(255,200,140,0.2)'; g.fillRect(px,py,TILE,3);
  } else if(id === 16){
    g.fillStyle='#5a5a5a'; g.fillRect(px,py,TILE,TILE);
    g.strokeStyle='rgba(0,0,0,0.3)'; g.lineWidth=1; g.strokeRect(px+2,py+2,TILE-4,TILE-4);
    g.fillStyle='#1a1a1a'; g.fillRect(px+8,py+12,TILE-16,TILE-16);
    g.fillStyle='#ff8a3a';
    g.beginPath(); g.moveTo(px+TILE/2-3,py+TILE-6); g.lineTo(px+TILE/2,py+14); g.lineTo(px+TILE/2+3,py+TILE-6); g.closePath(); g.fill();
    g.fillStyle='#ffd700';
    g.beginPath(); g.moveTo(px+TILE/2-1,py+TILE-8); g.lineTo(px+TILE/2,py+TILE-14); g.lineTo(px+TILE/2+1,py+TILE-8); g.closePath(); g.fill();
    g.fillStyle='rgba(255,255,255,0.15)'; g.fillRect(px,py,TILE,3);
  } else if(id === 17){
    g.fillStyle='#4a2810'; g.fillRect(px,py,TILE,TILE);
    g.fillStyle='#8a5025'; g.fillRect(px+2,py+6,TILE-4,TILE-8);
    g.fillStyle='#a0522d'; g.fillRect(px+2,py+4,TILE-4,8);
    g.fillStyle='#2a1808'; g.fillRect(px+2,py+12,TILE-4,1.5);
    g.fillStyle='#5a5a5a';
    g.fillRect(px+5,py+4,2,TILE-8);
    g.fillRect(px+TILE-7,py+4,2,TILE-8);
    g.fillStyle='#ffd700'; g.fillRect(px+TILE/2-3,py+11,6,5);
    g.fillStyle='#1a1a1a'; g.fillRect(px+TILE/2-1,py+13,2,2);
    g.fillStyle='rgba(255,200,140,0.2)'; g.fillRect(px,py,TILE,2);
  } else {
    g.fillStyle = ITEMS[id]?.color || '#888'; g.fillRect(px,py,TILE,TILE);
  }
  g.strokeStyle='rgba(0,0,0,0.5)'; g.lineWidth=1;
  g.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
}