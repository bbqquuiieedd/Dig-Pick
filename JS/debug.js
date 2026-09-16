// ============================================================
// debug.js — консоль для тестирования (~ для открытия)
// ============================================================

const debugConsoleEl = document.getElementById('debug-console');
const debugOutputEl  = document.getElementById('debug-output');
const debugInputEl   = document.getElementById('debug-input');

const debugState = {
  history: [],
  historyIndex: -1,
};

function debugLog(text, cls = ''){
  if(!debugOutputEl) return;
  const line = document.createElement('div');
  line.className = 'debug-line' + (cls ? ' ' + cls : '');
  line.textContent = text;
  debugOutputEl.appendChild(line);
  debugOutputEl.scrollTop = debugOutputEl.scrollHeight;
}

function debugIsOpen(){
  return debugConsoleEl && !debugConsoleEl.classList.contains('hidden');
}
function debugOpen(){
  if(!debugConsoleEl) return;
  debugConsoleEl.classList.remove('hidden');
  setTimeout(() => debugInputEl.focus(), 0);
  if(debugOutputEl.children.length === 0){
    debugLog('Dig-Pick debug console. Введите /help для списка команд.', 'debug-ok');
  }
}
function debugClose(){
  if(!debugConsoleEl) return;
  debugConsoleEl.classList.add('hidden');
  debugInputEl.blur();
}
function debugToggle(){
  if(debugIsOpen()) debugClose(); else debugOpen();
}

function debugFindItem(query){
  // По ID
  const asNum = parseInt(query, 10);
  if(!isNaN(asNum) && ITEMS[asNum]) return asNum;
  // По имени (без учёта регистра)
  const q = String(query).toLowerCase();
  for(const id in ITEMS){
    if(ITEMS[id].name.toLowerCase() === q) return parseInt(id);
  }
  for(const id in ITEMS){
    if(ITEMS[id].name.toLowerCase().includes(q)) return parseInt(id);
  }
  return null;
}

function debugProcess(cmd){
  debugLog('> ' + cmd, 'debug-cmd');
  const parts = cmd.trim().split(/\s+/);
  const c = (parts[0] || '').toLowerCase();

  if(c === '/help' || c === 'help'){
    debugLog('/help — список команд', 'debug-ok');
    debugLog('/give <id|имя> [кол-во] — выдать предмет', 'debug-ok');
    debugLog('/clear — очистить инвентарь и хотбар', 'debug-ok');
    debugLog('/list — список всех ID предметов', 'debug-ok');
    debugLog('/heal — не реализовано (нет HP)', 'debug-ok');
    return;
  }

  if(c === '/give'){
    if(parts.length < 2){ debugLog('Использование: /give <id|имя> [кол-во]', 'debug-err'); return; }
    const id = debugFindItem(parts[1]);
    if(id === null){ debugLog('Предмет не найден: ' + parts[1], 'debug-err'); return; }
    const count = Math.max(1, parseInt(parts[2], 10) || 1);
    if(addToInventory(id, count)){
      debugLog(`Выдано: ${ITEMS[id].name} ×${count}`, 'debug-ok');
    } else {
      debugLog('Инвентарь полон', 'debug-err');
    }
    return;
  }

  if(c === '/clear'){
    for(let i=0;i<state.inventory.length;i++) state.inventory[i] = null;
    for(let i=0;i<state.hotbar.length;i++) state.hotbar[i] = null;
    state.uiCraftSlots = state.uiCraftSlots.map(() => null);
    state.uiCraftResult = null;
    debugLog('Инвентарь и хотбар очищены', 'debug-ok');
    return;
  }

  if(c === '/list'){
    debugLog('ID предметов:', 'debug-ok');
    const lines = [];
    for(const id in ITEMS){
      lines.push(`${id} = ${ITEMS[id].name}`);
    }
    // Разбиваем по 3 в строку
    for(let i=0;i<lines.length;i+=3){
      debugLog(lines.slice(i, i+3).join('  |  '));
    }
    return;
  }

  debugLog('Неизвестная команда: ' + c + '. Введите /help', 'debug-err');
}

function initDebug(){
  if(!debugConsoleEl || !debugInputEl) return;

  // Документ-уровень: перехват ~ для открытия, Escape — уже работает в input.js
  document.addEventListener('keydown', (e) => {
    // Не мешаем, если игрок печатает в debug-input (ввод сам всё обработает)
    if(document.activeElement === debugInputEl) return;

    const isTilde = e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё';
    if(isTilde){
      e.preventDefault();
      if(state.gameState === 'playing' || debugIsOpen()){
        debugToggle();
      }
      return;
    }
  });

  // Input: Enter для отправки, стрелки для истории, ~ для закрытия
  debugInputEl.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      const cmd = debugInputEl.value.trim();
      if(cmd){
        debugState.history.push(cmd);
        debugState.historyIndex = debugState.history.length;
        debugProcess(cmd);
      }
      debugInputEl.value = '';
      return;
    }
    if(e.key === 'Escape' || e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === 'ё'){
      e.preventDefault();
      debugClose();
      return;
    }
    if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(debugState.history.length === 0) return;
      if(debugState.historyIndex > 0) debugState.historyIndex--;
      debugInputEl.value = debugState.history[debugState.historyIndex] || '';
      return;
    }
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(debugState.history.length === 0) return;
      if(debugState.historyIndex < debugState.history.length - 1){
        debugState.historyIndex++;
        debugInputEl.value = debugState.history[debugState.historyIndex] || '';
      } else {
        debugState.historyIndex = debugState.history.length;
        debugInputEl.value = '';
      }
      return;
    }
    // Не даём game-хоткеям сработать, когда мы в инпуте
    e.stopPropagation();
  });

  // Останавливаем распространение keyup/keypress, чтобы игра не реагировала
  debugInputEl.addEventListener('keyup', e => e.stopPropagation());
  debugInputEl.addEventListener('keypress', e => e.stopPropagation());
}

initDebug()