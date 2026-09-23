// menu_bg.js — анимированный фон главного меню
(function(){
  const bgCanvas = document.getElementById('bg-canvas');
  if(!bgCanvas) return;
  const bgCtx = bgCanvas.getContext('2d');
  const TILE = 40;
  const BG_SEED = 1337;

  function makeRng(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const PALETTE = [
    { color: '#9cc97a', accent: '#7ab058', weight: 22 },
    { color: '#c9a06b', accent: '#a07848', weight: 20 },
    { color: '#b8b8b0', accent: '#989890', weight: 22 },
    { color: '#a87a4a', accent: '#7a5028', weight: 10 },
    { color: '#7ab85a', accent: '#5a9840', weight: 10 },
    { color: '#7ab0d8', accent: '#5090c0', weight: 8  },
    { color: '#c08a5a', accent: '#8a4a1a', weight: 3  },
    { color: '#c8c8d0', accent: '#a0a0b0', weight: 2  },
    { color: '#e0c060', accent: '#d0a020', weight: 1  },
  ];

  function drawPattern(){
    const w = bgCanvas.width;
    const h = bgCanvas.height;
    const cols = Math.ceil(w / TILE) + 1;
    const rows = Math.ceil(h / TILE) + 1;
    const rng = makeRng(BG_SEED);
    const weighted = [];
    for(const b of PALETTE) for(let i=0;i<b.weight;i++) weighted.push(b);

    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const px = x * TILE;
        const py = y * TILE;
        const block = weighted[(rng() * weighted.length) | 0];
        bgCtx.fillStyle = block.color;
        bgCtx.fillRect(px, py, TILE, TILE);
        const dotsCount = 3 + ((rng() * 3) | 0);
        for(let i=0;i<dotsCount;i++){
          bgCtx.fillStyle = block.accent;
          bgCtx.globalAlpha = 0.35 + rng() * 0.3;
          bgCtx.fillRect(px + rng()*TILE, py + rng()*TILE, 2 + rng()*4, 2 + rng()*4);
        }
        bgCtx.globalAlpha = 1;
        bgCtx.strokeStyle = 'rgba(80, 60, 30, 0.15)';
        bgCtx.lineWidth = 1;
        bgCtx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function resize(){
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    drawPattern();
  }
  resize();
  window.addEventListener('resize', resize);

  // Кирка — искры
  const logoBtn = document.getElementById('logoBtn');
  const logoWrap = logoBtn ? logoBtn.parentNode : null;
  if(logoBtn && logoWrap){
    const TIP_X = 0.2, TIP_Y = 1;
    logoBtn.addEventListener('click', () => {
      logoBtn.classList.remove('striking');
      void logoBtn.offsetWidth;
      logoBtn.classList.add('striking');
      const btnRect = logoBtn.getBoundingClientRect();
      const wrapRect = logoWrap.getBoundingClientRect();
      const spawnX = (btnRect.left - wrapRect.left) + btnRect.width * TIP_X;
      const spawnY = (btnRect.top - wrapRect.top) + btnRect.height * TIP_Y;
      const count = 7 + Math.floor(Math.random() * 4);
      for(let i=0;i<count;i++){
        const s = document.createElement('span');
        s.className = 'spark';
        s.style.left = spawnX + 'px';
        s.style.top = spawnY + 'px';
        const angle = (-30 + Math.random() * 240) * Math.PI / 180;
        const dist = 30 + Math.random() * 60;
        s.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
        s.style.setProperty('--ty', (Math.sin(angle) * dist) + 'px');
        const size = 4 + Math.random() * 4;
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        logoWrap.appendChild(s);
        requestAnimationFrame(() => s.classList.add('fly'));
        setTimeout(() => s.remove(), 650);
      }
      if(navigator.vibrate) navigator.vibrate(15);
    });
    logoBtn.addEventListener('animationend', (e) => {
      if(e.animationName === 'pickaxeStrike') logoBtn.classList.remove('striking');
    });
  }

  // Кнопка "О проекте"
  const menuPanel = document.getElementById('menuPanel');
  const helpBtn = document.getElementById('helpBtn');
  if(helpBtn && menuPanel){
    helpBtn.addEventListener('click', () => menuPanel.classList.toggle('about-mode'));
  }

  // Язык
  const LANG_KEY = 'digpick_lang';
  const langBtns = document.querySelectorAll('.lang-flag');
  const labelEls = document.querySelectorAll('[data-ru][data-en]');
  let currentLang = 'ru';
  let isFirstLoad = true;

  function detectLanguage(){
    try{
      const saved = localStorage.getItem(LANG_KEY);
      if(saved === 'ru' || saved === 'en') return saved;
    }catch{}
    let sysLang = '';
    try{ sysLang = (navigator.languages && navigator.languages[0]) || navigator.language || ''; }catch{}
    const lower = (sysLang || '').toLowerCase();
    if(lower.startsWith('en')) return 'en';
    return 'ru';
  }

  function applyLang(lang){
    currentLang = lang;
    langBtns.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    document.documentElement.lang = lang;
    labelEls.forEach(el => {
      const newText = el.dataset[lang];
      if(!newText) return;
      if(isFirstLoad){ el.textContent = newText; }
      else {
        if(el.textContent === newText) return;
        if(el._fadeTimeout) clearTimeout(el._fadeTimeout);
        el.classList.add('fade-out');
        el._fadeTimeout = setTimeout(() => {
          el.textContent = newText;
          el.classList.remove('fade-out');
          el._fadeTimeout = null;
        }, 350);
      }
    });
    isFirstLoad = false;
  }

  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if(lang === currentLang) return;
      applyLang(lang);
      try{ localStorage.setItem(LANG_KEY, lang); }catch{}
    });
  });

  applyLang(detectLanguage());
})();