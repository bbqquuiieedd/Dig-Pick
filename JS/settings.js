// ============================================================
//  settings.js — настройки и бинды
// ============================================================

const GAME_ACTIONS = [
  { id: 'left',      label: 'Влево' },
  { id: 'right',     label: 'Вправо' },
  { id: 'jump',      label: 'Прыжок' },
  { id: 'inventory', label: 'Инвентарь' },
  { id: 'pause',     label: 'Пауза' },
  { id: 'chat',      label: 'Чат / консоль' },
  { id: 'save',      label: 'Сохранить' },
  { id: 'hints',     label: 'Подсказки (F1)' },
  { id: 'fps',       label: 'FPS (F2)' },
  { id: 'debug',     label: 'Отладка блока (F3)' },
];

const MENU_ACTIONS = [
  { id: 'menu_up',   label: 'Вверх' },
  { id: 'menu_down', label: 'Вниз' },
  { id: 'confirm',   label: 'Подтвердить' },
];

function defaultSettings() {
  return {
    autosaveInterval: 60000,
    showFPS: false,
    showHints: false,
    chatDuration: 5,          // секунды, 0 = не показывать
    bindings: {
      game: {
        left:      ['KeyA'],
        right:     ['KeyD'],
        jump:      ['Space', 'KeyW'],
        inventory: ['KeyE', 'Tab', 'KeyI'],
        pause:     ['Escape'],
        chat:      ['KeyT', 'Enter'],
        save:      ['F4'],
        hints:     ['F1'],
        fps:       ['F2'],
        debug:     ['F3'],
      },
      menu: {
        menu_up:   ['ArrowUp'],
        menu_down: ['ArrowDown'],
        confirm:   ['Enter'],
      },
    },
  };
}

let settings = defaultSettings();

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
}

function loadSettings() {
  try {
    settings.chatDuration = (typeof parsed.chatDuration === 'number')
      ? parsed.chatDuration : def.chatDuration;
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const def = defaultSettings();
    settings.autosaveInterval = (typeof parsed.autosaveInterval === 'number') ? parsed.autosaveInterval : def.autosaveInterval;
    settings.showFPS = !!parsed.showFPS;
    settings.showHints = !!parsed.showHints;
    if (parsed.bindings) {
      if (parsed.bindings.game) for (const a of GAME_ACTIONS)
        if (Array.isArray(parsed.bindings.game[a.id])) settings.bindings.game[a.id] = parsed.bindings.game[a.id].slice();
      if (parsed.bindings.menu) for (const a of MENU_ACTIONS)
        if (Array.isArray(parsed.bindings.menu[a.id])) settings.bindings.menu[a.id] = parsed.bindings.menu[a.id].slice();
    }
  } catch (e) {}
}

function bindKey(context, actionId, keyCode) {
  const table = settings.bindings[context];
  for (const other in table) {
    if (other === actionId) continue;
    const idx = table[other].indexOf(keyCode);
    if (idx >= 0) table[other].splice(idx, 1);
  }
  if (!table[actionId].includes(keyCode)) table[actionId].push(keyCode);
  saveSettings();
}

function unbindKey(context, actionId, keyCode) {
  const table = settings.bindings[context];
  const idx = table[actionId].indexOf(keyCode);
  if (idx >= 0) table[actionId].splice(idx, 1);
  saveSettings();
}

function isActionPressed(context, actionId) {
  const arr = settings.bindings[context][actionId];
  if (!arr) return false;
  for (const code of arr) if (keys[code]) return true;
  return false;
}

function wasActionJustPressed(context, actionId) {
  const arr = settings.bindings[context][actionId];
  if (arr) {
    for (const code of arr) if (justPressedKeys.has(code)) return true;
  }
  // Fallback для меню
  if (context === 'menu') {
    if (actionId === 'menu_up' &&
        (justPressedKeys.has('KeyW') || justPressedKeys.has('ArrowUp')))    return true;
    if (actionId === 'menu_down' &&
        (justPressedKeys.has('KeyS') || justPressedKeys.has('ArrowDown')))  return true;
    if (actionId === 'confirm' &&
        (justPressedKeys.has('Enter') || justPressedKeys.has('Space')))     return true;
  }
  return false;
}

function getActionForKey(context, code) {
  const table = settings.bindings[context];
  for (const id in table) if (table[id].includes(code)) return id;
  return null;
}

function keyCodeToLabel(code) {
  if (code.startsWith('Key'))   return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (code === 'Enter') return 'Enter';
  if (code === 'Escape') return 'Esc';
  if (code === 'Tab') return 'Tab';  
  if (code === 'ArrowUp')    return 'ArrowUp';
  if (code === 'ArrowDown')  return 'ArrowDown';
  if (code === 'ArrowLeft')  return 'ArrowLeft';
  if (code === 'ArrowRight') return 'ArrowRight';
  if (code === 'ShiftLeft') return 'LShift';
  if (code === 'ShiftRight') return 'RShift';
  if (code === 'ControlLeft') return 'LCtrl';
  if (code === 'ControlRight') return 'RCtrl';
  if (code === 'AltLeft') return 'LAlt';
  if (code === 'AltRight') return 'RAlt';
  if (code === 'Backspace') return 'BkSp';
  if (code === 'CapsLock') return 'Caps';
  if (code.startsWith('F') && code.length <= 3) return code;
  return code;
}