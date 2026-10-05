// ============================================================
//  console.js — игровая консоль команд
// ============================================================

const CONSOLE_MAX_LINES = 100;
const CONSOLE_HISTORY_MAX = 50;

// ------------------------------------------------------------
// ЛОГ
// ------------------------------------------------------------
function logConsole(text, color) {
  consoleLog.push({ text: text, color: color || '#ffffff' });
  if (consoleLog.length > CONSOLE_MAX_LINES) {
    consoleLog.splice(0, consoleLog.length - CONSOLE_MAX_LINES);
  }
}

// ------------------------------------------------------------
// ОТКРЫТИЕ / ЗАКРЫТИЕ
// ------------------------------------------------------------
function openConsole() {
  consoleOpen = true;
  consoleInput = '';
  consoleHistoryIndex = -1;
}

function closeConsole() {
  consoleOpen = false;
  consoleInput = '';
  consoleHistoryIndex = -1;
}

// ------------------------------------------------------------
// РЕЕСТР КОМАНД
// Чтобы добавить новую команду — допиши в конец файла:
//   registerCommand('имя', 'описание', (args) => { ... });
// Имя без слэша, args — массив строк после команды.
// ------------------------------------------------------------
const COMMANDS = {};

function registerCommand(name, help, fn) {
  COMMANDS[name] = { name: name, help: help, fn: fn };
}

// ------------------------------------------------------------
// ИСПОЛНЕНИЕ КОМАНДЫ
// ------------------------------------------------------------
function executeConsoleCommand(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return;

  // История (для стрелок ↑ / ↓)
  consoleHistory.push(trimmed);
  if (consoleHistory.length > CONSOLE_HISTORY_MAX) consoleHistory.shift();
  consoleHistoryIndex = -1;

  // Команда — начинается с /
  if (trimmed.startsWith('/')) {
    logConsole('> ' + trimmed, '#88ff88');
    executeCommandLine(trimmed.slice(1));
    return;
  }

  // Иначе — сообщение чата
  const author = getActiveCharacterName();
  addChatMessage(author, trimmed);
  logConsole(author + ': ' + trimmed, '#ffffff');
}

// Разбор и исполнение именно команды (без слэша)
function executeCommandLine(cmdText) {
  const parts = cmdText.trim().split(/\s+/);
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const def = COMMANDS[cmdName];
  if (!def) {
    logConsole('Неизвестная команда: ' + cmdName + '. Введите /help.', '#ff8888');
    return;
  }
  try {
    def.fn(args);
  } catch (e) {
    logConsole('Ошибка: ' + e.message, '#ff8888');
  }
}

// Добавить сообщение в чат
function addChatMessage(author, text) {
  chatMessages.push({ author: author, text: text, time: performance.now() });
  if (chatMessages.length > 20) chatMessages.shift();

  const dur = (settings.chatDuration !== undefined ? settings.chatDuration : 5) * 1000;
  chatOverlayUntil = dur > 0 ? performance.now() + dur : 0;
}

// ------------------------------------------------------------
// УПРАВЛЕНИЕ ВВОДОМ
// ------------------------------------------------------------
function consoleHandleKey(e) {
  if (e.key === 'Enter') {
    executeConsoleCommand(consoleInput);
    consoleInput = '';
    consoleHistoryIndex = -1;
    return;
  }
  if (e.key === 'Escape') { closeConsole(); return; }
  if (e.key === 'Backspace') { consoleInput = consoleInput.slice(0, -1); return; }

  if (e.key === 'ArrowUp') {
    if (consoleHistory.length === 0) return;
    if (consoleHistoryIndex === -1) consoleHistoryIndex = consoleHistory.length - 1;
    else if (consoleHistoryIndex > 0) consoleHistoryIndex--;
    consoleInput = consoleHistory[consoleHistoryIndex];
    return;
  }
  if (e.key === 'ArrowDown') {
    if (consoleHistory.length === 0) return;
    if (consoleHistoryIndex === -1) return;
    if (consoleHistoryIndex < consoleHistory.length - 1) {
      consoleHistoryIndex++;
      consoleInput = consoleHistory[consoleHistoryIndex];
    } else {
      consoleHistoryIndex = -1;
      consoleInput = '';
    }
    return;
  }

  if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    consoleInput += e.key;
  }
}

// ============================================================
// БАЗОВЫЕ КОМАНДЫ
// ============================================================

registerCommand('help', 'Список команд или справка. /help [команда]', (args) => {
  if (args.length > 0) {
    const name = args[0].toLowerCase().replace(/^\//, '');
    const def = COMMANDS[name];
    if (!def) { logConsole('Нет такой команды: ' + name, '#ff8888'); return; }
    logConsole('/' + def.name + ' — ' + def.help, '#ffff00');
    return;
  }

  logConsole('=== КОМАНДЫ ===', '#ffff00');
  const names = Object.keys(COMMANDS).sort();
  for (const n of names) {
    logConsole('  /' + n + ' — ' + COMMANDS[n].help, '#cccccc');
  }

  logConsole('', '#ffffff');
  logConsole('=== БЛОКИ ===', '#ffff00');
  logConsole('  ' + listTileNames().join(', '), '#88ddff');

  logConsole('', '#ffffff');
  logConsole('=== СТЕНЫ ===', '#ffff00');
  logConsole('  ' + listWallNames().join(', '), '#88ddff');
  logConsole('', '#ffffff');
  logConsole('Имена нечувствительны к регистру.', '#888888');
});

registerCommand('give', 'Выдать блок. /give <имя> [кол-во]', (args) => {
  if (args.length < 1) {
    logConsole('Использование: /give <имя> [кол-во]', '#ff8888');
    logConsole('Пример: /give dirt 64', '#888888');
    return;
  }
  const resolved = resolveBlockName(args[0]);
  if (!resolved) {
    logConsole('Нет такого блока: ' + args[0], '#ff8888');
    logConsole('Список: /help', '#888888');
    return;
  }
  if (resolved.type === 'wall') {
    logConsole('Стены пока нельзя положить в инвентарь.', '#ff8888');
    logConsole('Используй /setblock <x> <y> ' + args[0].toLowerCase(), '#888888');
    return;
  }
  if (resolved.id === TILE_AIR) {
    logConsole('Воздух нельзя выдать.', '#ff8888');
    return;
  }

  let count = 1;
  if (args[1] !== undefined) {
    count = parseInt(args[1], 10);
    if (isNaN(count) || count < 1) {
      logConsole('Кол-во должно быть числом ≥ 1', '#ff8888');
      return;
    }
  }

  for (let i = 0; i < count; i++) tryAddToInventory(resolved.id);
  logConsole('Выдано: ' + TILE_DEFS[resolved.id].name + ' x' + count, '#88ff88');
});

registerCommand('tp', 'Телепорт. /tp <x> <y> (в блоках)', (args) => {
  const x = parseInt(args[0], 10);
  const y = parseInt(args[1], 10);
  if (isNaN(x) || isNaN(y)) { logConsole('Использование: /tp <x> <y>', '#ff8888'); return; }
  player.x = x * TILE_SIZE;
  player.y = y * TILE_SIZE;
  player.vx = 0; player.vy = 0;
  snapCamera();
  logConsole('Телепорт в (' + x + ', ' + y + ')', '#88ff88');
});

registerCommand('setblock', 'Поставить блок/стену. /setblock <x> <y> <имя>', (args) => {
  if (args.length < 3) {
    logConsole('Использование: /setblock <x> <y> <имя>', '#ff8888');
    logConsole('Пример: /setblock 5 10 stone', '#888888');
    return;
  }
  const x = parseInt(args[0], 10);
  const y = parseInt(args[1], 10);
  if (isNaN(x) || isNaN(y)) { logConsole('x и y должны быть числами', '#ff8888'); return; }

  const resolved = resolveBlockName(args[2]);
  if (!resolved) {
    logConsole('Нет такого блока: ' + args[2], '#ff8888');
    logConsole('Список: /help', '#888888');
    return;
  }

  if (resolved.type === 'tile') {
    setTile(x, y, resolved.id);
    logConsole('Блок ' + TILE_DEFS[resolved.id].name + ' в (' + x + ', ' + y + ')', '#88ff88');
  } else {
    setWall(x, y, resolved.id);
    logConsole('Стена ' + WALL_DEFS[resolved.id].name + ' в (' + x + ', ' + y + ')', '#88ff88');
  }
});

registerCommand('fill', 'Заполнить область. /fill <x1> <y1> <x2> <y2> <имя>', (args) => {
  if (args.length < 5) {
    logConsole('Использование: /fill <x1> <y1> <x2> <y2> <имя>', '#ff8888');
    logConsole('Пример: /fill 0 20 20 25 stone', '#888888');
    return;
  }
  const x1 = parseInt(args[0], 10);
  const y1 = parseInt(args[1], 10);
  const x2 = parseInt(args[2], 10);
  const y2 = parseInt(args[3], 10);
  if ([x1,y1,x2,y2].some(isNaN)) { logConsole('Координаты должны быть числами', '#ff8888'); return; }

  const resolved = resolveBlockName(args[4]);
  if (!resolved) {
    logConsole('Нет такого блока: ' + args[4], '#ff8888');
    logConsole('Список: /help', '#888888');
    return;
  }

  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  let count = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (resolved.type === 'tile') setTile(x, y, resolved.id);
      else                          setWall(x, y, resolved.id);
      count++;
    }
  }
  logConsole('Заполнено: ' + count, '#88ff88');
});

registerCommand('clear', 'Очистить инвентарь', () => {
  for (let i = 0; i < INVENTORY_SLOTS; i++) slots[i] = null;
  hasUnsavedChanges = true;
  logConsole('Инвентарь очищен', '#88ff88');
});

registerCommand('spawn', 'Телепорт на точку спавна', () => {
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0; player.vy = 0;
  snapCamera();
  logConsole('Телепорт на спавн', '#88ff88');
});

registerCommand('kill', 'Убить игрока (телепорт на спавн)', () => {
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0; player.vy = 0;
  snapCamera();
  logConsole('Игрок убит', '#ff8888');
});

registerCommand('heal', 'Восстановить здоровье (пока не реализовано)', () => {
  logConsole('Система HP пока не реализована', '#ffff00');
});

registerCommand('seed', 'Показать сид мира', () => {
  logConsole('Сид: ' + (activeWorldSeed !== null ? activeWorldSeed : 'не задан'), '#88ff88');
});

registerCommand('save', 'Сохранить игру', () => {
  if (saveGame()) logConsole('Сохранено', '#88ff88');
  else logConsole('Не удалось сохранить', '#ff8888');
});

registerCommand('time', 'Установить время суток (пока не реализовано)', () => {
  logConsole('Система времени пока не реализована', '#ffff00');
});

registerCommand('gamemode', 'Режим игры (пока не реализовано)', () => {
  logConsole('Режимы игры пока не реализованы', '#ffff00');
});

registerCommand('me', 'Отправить сообщение в чат. /me <текст>', (args) => {
  if (args.length === 0) { logConsole('Использование: /me <текст>', '#ff8888'); return; }
  const text = args.join(' ');
  const author = getActiveCharacterName();
  addChatMessage(author, text);
  logConsole(author + ': ' + text, '#ffffff');
});