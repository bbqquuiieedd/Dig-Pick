// settings.js
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(!raw) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    const p = JSON.parse(raw);
    return {
      theme: p.theme === 'dark' ? 'dark' : 'light',
      autosaveMinutes: typeof p.autosaveMinutes === 'number' ? p.autosaveMinutes : DEFAULT_SETTINGS.autosaveMinutes,
      showFps:  typeof p.showFps  === 'boolean' ? p.showFps  : DEFAULT_SETTINGS.showFps,
      showHelp: typeof p.showHelp === 'boolean' ? p.showHelp : DEFAULT_SETTINGS.showHelp,
      keybinds: { ...DEFAULT_SETTINGS.keybinds, ...(p.keybinds || {}) },
    };
  }catch{ return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
}

let settings = loadSettings();
// Применяем тему сразу
setTheme(settings.theme);

function saveSettings(){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch(e){ console.error('Ошибка сохранения настроек:', e); }
}

function isActionDown(action){
  const code = settings.keybinds[action];
  if(code && state.keys[code]) return true;
  if(action === 'moveUp'    && state.keys['ArrowUp'])    return true;
  if(action === 'moveDown'  && state.keys['ArrowDown'])  return true;
  if(action === 'moveLeft'  && state.keys['ArrowLeft'])  return true;
  if(action === 'moveRight' && state.keys['ArrowRight']) return true;
  return false;
}

function codeToDisplay(code){
  if(!code) return '—';
  if(code.startsWith('Key')) return code.slice(3);
  if(code.startsWith('Digit')) return code.slice(5);
  if(code.startsWith('Numpad')) return 'Num' + code.slice(6);
  if(code === 'ArrowUp')    return '↑';
  if(code === 'ArrowDown')  return '↓';
  if(code === 'ArrowLeft')  return '←';
  if(code === 'ArrowRight') return '→';
  if(code === 'Escape') return 'Esc';
  if(code === 'Space')  return 'Space';
  if(code === 'Tab')    return 'Tab';
  if(code === 'ShiftLeft')   return 'LShift';
  if(code === 'ShiftRight')  return 'RShift';
  if(code === 'ControlLeft') return 'LCtrl';
  if(code === 'ControlRight')return 'RCtrl';
  if(code === 'AltLeft')     return 'LAlt';
  if(code === 'AltRight')    return 'RAlt';
  return code;
}