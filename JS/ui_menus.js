// ============================================================
// ui_menus.js — HTML-меню, настройки, торговля
// ============================================================

const $ = id => document.getElementById(id);

const menuMain     = $('menu-main');
const menuSlots    = $('menu-slots');
const menuPause    = $('menu-pause');
const menuSettings = $('menu-settings');
const menuDelete   = $('menu-delete');
const menuKeybind  = $('keybind-modal');
const menuSeed     = $('menu-seed');

const btnPlay           = $('btn-play');
const btnSettingsMain   = $('btn-settings-main');
const btnSlotsBack      = $('btn-slots-back');
const btnResume         = $('btn-resume');
const btnSave           = $('btn-save');
const btnSettingsPause  = $('btn-settings-pause');
const btnToMain         = $('btn-to-main');
const btnSettingsBack   = $('btn-settings-back');
const btnDeleteConfirm  = $('btn-delete-confirm');
const btnDeleteCancel   = $('btn-delete-cancel');

const slotsList    = $('slots-list');
const deleteInfo   = $('delete-info');
const helpEl       = $('help');

const settingTheme        = $('setting-theme');
const settingAutosave     = $('setting-autosave');
const settingFps          = $('setting-fps');
const settingHelp         = $('setting-help');
const keybindsList        = $('keybinds-list');
const btnKeybindsResetAll = $('btn-keybinds-reset-all');
const keybindModalAction  = $('keybind-modal-action');
const btnKeybindCancel    = $('btn-keybind-cancel');

// ============================================================
// ХЕЛПЕРЫ
// ============================================================
function hideAllMenus(){
  document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
}
function showMenuOnly(m){
  hideAllMenus();
  if(m) m.classList.remove('hidden');
}
function setHelpVisible(v){
  if(helpEl) helpEl.style.display = (v && settings.showHelp) ? '' : 'none';
}

function enterMainMenu(){
  document.body.classList.add('menu-open');
  document.body.classList.remove('game-active');
}
function enterGame(){
  document.body.classList.add('game-active');
  document.body.classList.remove('menu-open');
}

function showMainMenu(){
  state.gameState = 'menu';
  state.currentSlot = null;
  stopAutosave();
  setHelpVisible(false);
  showMenuOnly(menuMain);
  enterMainMenu();
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
function initMenus(){
  setTheme(settings.theme || 'light');
  enterMainMenu();
  renderSlotsList();

  btnPlay.addEventListener('click', showSlotsMenu);
  btnSettingsMain.addEventListener('click', () => openSettings('main'));

  btnSlotsBack.addEventListener('click', showMainMenu);

  btnResume.addEventListener('click', resumeGame);
  btnSave.addEventListener('click', () => {
    if(state.currentSlot === null) return;
    if(saveGame(state.currentSlot)){
      state.savedSinceLastResume = true;
      refreshSaveButton();
      showToast('✓ Игра сохранена');
    } else showToast('✗ Ошибка сохранения');
  });
  btnSettingsPause.addEventListener('click', () => openSettings('pause'));
  btnToMain.addEventListener('click', () => {
    if(state.currentSlot !== null) saveGame(state.currentSlot);
    showMainMenu();
  });
  btnSettingsBack.addEventListener('click', closeSettings);

  btnDeleteConfirm.addEventListener('click', () => {
    if(state.deleteTarget === null || btnDeleteConfirm.disabled) return;
    deleteSave(state.deleteTarget);
    state.deleteTarget = null;
    if(state.deleteTimer){ clearInterval(state.deleteTimer); state.deleteTimer = null; }
    showSlotsMenu();
    showToast('Сохранение удалено');
  });
  btnDeleteCancel.addEventListener('click', closeDeleteConfirm);

  if(settingTheme){
    settingTheme.addEventListener('change', () => {
      settings.theme = settingTheme.value;
      saveSettings();
      setTheme(settings.theme);
    });
  }
  settingAutosave.addEventListener('change', () => {
    settings.autosaveMinutes = parseInt(settingAutosave.value, 10) || 0;
    saveSettings();
    if(state.currentSlot !== null) startAutosave();
  });
  settingFps.addEventListener('change', () => {
    settings.showFps = settingFps.checked;
    saveSettings();
  });
  settingHelp.addEventListener('change', () => {
    settings.showHelp = settingHelp.checked;
    saveSettings();
    if(state.gameState === 'playing' && !state.uiMode && !state.showRecipes) setHelpVisible(true);
  });
  btnKeybindsResetAll.addEventListener('click', () => {
    if(!confirm('Сбросить все клавиши управления?')) return;
    settings.keybinds = { ...DEFAULT_SETTINGS.keybinds };
    saveSettings();
    renderKeybindsList();
  });
  btnKeybindCancel.addEventListener('click', cancelKeybind);

  document.addEventListener('pauseGame', pauseGame);
  document.addEventListener('resumeGame', resumeGame);
  document.addEventListener('closeSettings', closeSettings);
  document.addEventListener('keybindApplied', () => {
    showMenuOnly(menuSettings);
    renderKeybindsList();
  });
  document.addEventListener('keybindCancelled', () => {
    showMenuOnly(menuSettings);
  });

  window.addEventListener('beforeunload', e => {
    if(state.gameState === 'playing' || state.gameState === 'paused' || state.gameState === 'paused-ui'){
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });
}

// ============================================================
// ЗАПУСК ИГРЫ
// ============================================================
function playSlot(slot, seed){
  state.currentSlot = slot;
  if(hasSave(slot)){
    if(!loadGame(slot)){ showToast('Не удалось загрузить сохранение'); return; }
  } else {
    generateWorld(seed);
    resetPlayer();
    resetInventory();
  }
  spawnAllEntities();
  state.savedSinceLastResume = false;
  clearInput();
  updateCamera();
  hideAllMenus();
  setHelpVisible(true);
  state.gameState = 'playing';
  startAutosave();
  enterGame();
}

// ============================================================
// СПИСОК СЛОТОВ
// ============================================================
function showSlotsMenu(){
  renderSlotsList();
  showMenuOnly(menuSlots);
}

function renderSlotsList(){
  slotsList.innerHTML = '';
  for(let s=1;s<=SAVE_SLOTS;s++){
    const card = document.createElement('div');
    const saved = hasSave(s);
    card.className = 'slot-card' + (saved ? '' : ' slot-card-empty');

    const info = document.createElement('div');
    info.className = 'slot-info-block';

    const name = document.createElement('div');
    name.className = 'slot-name';
    name.textContent = `Слот ${s}`;
    info.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'slot-meta' + (saved ? '' : ' slot-meta-empty');
    if(saved){
      const d = getSaveInfo(s);
      meta.textContent = d ? `Сохранено: ${d}` : 'Есть сохранение';
    } else {
      meta.textContent = 'Пусто';
    }
    info.appendChild(meta);
    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'slot-actions';

    if(saved){
      const pb = document.createElement('button');
      pb.className = 'menu-btn-mini menu-btn-mini-primary';
      pb.textContent = 'Играть';
      pb.addEventListener('click', () => playSlot(s));
      actions.appendChild(pb);

      const db = document.createElement('button');
      db.className = 'menu-btn-mini menu-btn-mini-danger';
      db.textContent = 'Удалить';
      db.addEventListener('click', () => openDeleteConfirm(s));
      actions.appendChild(db);
    } else {
      const nb = document.createElement('button');
      nb.className = 'menu-btn-mini menu-btn-mini-primary';
      nb.textContent = 'Создать';
      nb.addEventListener('click', () => {
        const seed = prompt('Введите сид мира (пусто = случайный):', '');
        const parsed = seed && seed.trim() !== '' ? (isNaN(seed) ? hashString(seed) : parseInt(seed, 10)) : Math.floor(Math.random() * 1e9);
        playSlot(s, parsed);
      });
      actions.appendChild(nb);
    }

    card.appendChild(actions);
    slotsList.appendChild(card);
  }
}

// Хэш строки в число (для текстовых сидов)
function hashString(str){
  let h = 0;
  for(let i=0;i<str.length;i++){
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ============================================================
// УДАЛЕНИЕ СЛОТА
// ============================================================
function openDeleteConfirm(s){
  state.deleteTarget = s;
  state.deleteCd = 5;
  const d = getSaveInfo(s);
  deleteInfo.textContent = d
    ? `Слот ${s} · сохранено ${d}. Это действие необратимо.`
    : `Слот ${s}. Это действие необратимо.`;
  btnDeleteConfirm.disabled = true;
  btnDeleteConfirm.textContent = `Удалить (${state.deleteCd})`;
  showMenuOnly(menuDelete);

  if(state.deleteTimer) clearInterval(state.deleteTimer);
  state.deleteTimer = setInterval(() => {
    state.deleteCd--;
    if(state.deleteCd <= 0){
      clearInterval(state.deleteTimer);
      state.deleteTimer = null;
      btnDeleteConfirm.disabled = false;
      btnDeleteConfirm.textContent = 'Удалить';
    } else {
      btnDeleteConfirm.textContent = `Удалить (${state.deleteCd})`;
    }
  }, 1000);
}

function closeDeleteConfirm(){
  if(state.deleteTimer){ clearInterval(state.deleteTimer); state.deleteTimer = null; }
  state.deleteTarget = null;
  showSlotsMenu();
}

// ============================================================
// ПАУЗА
// ============================================================
function pauseGame(){
  state.gameState = 'paused';
  clearInput();
  setHelpVisible(false);
  refreshSaveButton();
  showMenuOnly(menuPause);
}
function resumeGame(){
  state.gameState = 'playing';
  state.savedSinceLastResume = false;
  hideAllMenus();
  setHelpVisible(true);
  clearInput();
  if(state.currentSlot !== null) startAutosave();
}
function refreshSaveButton(){
  if(state.savedSinceLastResume){
    btnSave.textContent = 'Сохранено';
    btnSave.classList.add('menu-btn-pressed');
    btnSave.disabled = true;
  } else {
    btnSave.textContent = 'Сохранение';
    btnSave.classList.remove('menu-btn-pressed');
    btnSave.disabled = false;
  }
}

// ============================================================
// НАСТРОЙКИ
// ============================================================
function openSettings(from){
  state.settingsBackTo = from;
  renderSettingsUI();
  showMenuOnly(menuSettings);
}
function closeSettings(){
  if(state.settingsBackTo === 'pause' && state.gameState === 'paused') showMenuOnly(menuPause);
  else showMainMenu();
}

function renderSettingsUI(){
  if(settingTheme) settingTheme.value = settings.theme || 'light';
  settingAutosave.value = String(settings.autosaveMinutes);
  settingFps.checked = !!settings.showFps;
  settingHelp.checked = !!settings.showHelp;
  renderKeybindsList();
}

function renderKeybindsList(){
  keybindsList.innerHTML = '';
  for(const action in KEYBIND_LABELS){
    const row = document.createElement('div');
    row.className = 'keybind-row';

    const label = document.createElement('div');
    label.className = 'keybind-label';
    label.textContent = KEYBIND_LABELS[action];
    row.appendChild(label);

    const keyEl = document.createElement('div');
    keyEl.className = 'keybind-key';
    keyEl.textContent = codeToDisplay(settings.keybinds[action]);
    row.appendChild(keyEl);

    const changeBtn = document.createElement('button');
    changeBtn.className = 'keybind-btn';
    changeBtn.textContent = 'Изменить';
    changeBtn.addEventListener('click', () => openKeybindModal(action));
    row.appendChild(changeBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'keybind-btn keybind-btn-danger';
    resetBtn.textContent = '↺';
    resetBtn.title = 'Сбросить';
    resetBtn.disabled = settings.keybinds[action] === DEFAULT_SETTINGS.keybinds[action];
    resetBtn.addEventListener('click', () => {
      settings.keybinds[action] = DEFAULT_SETTINGS.keybinds[action];
      saveSettings();
      renderKeybindsList();
    });
    row.appendChild(resetBtn);

    keybindsList.appendChild(row);
  }
}

function openKeybindModal(action){
  state.keybindWaiting = action;
  keybindModalAction.textContent = KEYBIND_LABELS[action];
  showMenuOnly(menuKeybind);
}
function cancelKeybind(){
  state.keybindWaiting = null;
  showMenuOnly(menuSettings);
}