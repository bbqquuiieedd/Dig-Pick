// ============================================================
// ui_menus.js — HTML-меню: старт, пауза, слоты, настройки, кейбинды
// ============================================================

const $ = id => document.getElementById(id);

const menuMain     = $('menu-main');
const menuSlots    = $('menu-slots');
const menuPause    = $('menu-pause');
const menuSettings = $('menu-settings');
const menuDelete   = $('menu-delete');
const menuKeybind  = $('keybind-modal');

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

function showMainMenu(){
  state.gameState = 'menu';
  state.currentSlot = null;
  stopAutosave();
  setHelpVisible(false);
  showMenuOnly(menuMain);
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
function initMenus(){
  renderSlotsList();

  // Главное меню
  btnPlay.addEventListener('click', showSlotsMenu);
  btnSettingsMain.addEventListener('click', () => openSettings('main'));

  // Слоты
  btnSlotsBack.addEventListener('click', showMainMenu);

  // Пауза
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

  // Удаление сохранения
  btnDeleteConfirm.addEventListener('click', () => {
    if(state.deleteTarget === null || btnDeleteConfirm.disabled) return;
    deleteSave(state.deleteTarget);
    state.deleteTarget = null;
    if(state.deleteTimer){ clearInterval(state.deleteTimer); state.deleteTimer = null; }
    showSlotsMenu();
    showToast('Сохранение удалено');
  });
  btnDeleteCancel.addEventListener('click', closeDeleteConfirm);

  // Настройки
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

  // События от input.js
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

  // beforeunload
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
function playSlot(s){
  state.currentSlot = s;
  if(hasSave(s)){
    if(!loadGame(s)){ showToast('Не удалось загрузить сохранение'); return; }
  } else {
    generateWorld();
    resetPlayer();
    resetInventory();
  }
  // Пересоздать сущностей (для нового мира или загрузки)
  spawnAnimals();
  spawnRaccoon();
  state.savedSinceLastResume = false;
  clearInput();
  updateCamera();
  hideAllMenus();
  setHelpVisible(true);
  state.gameState = 'playing';
  startAutosave();
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
      pb.className = 'menu-btn menu-btn-primary';
      pb.textContent = 'Играть';
      pb.addEventListener('click', () => playSlot(s));
      actions.appendChild(pb);

      const db = document.createElement('button');
      db.className = 'menu-btn menu-btn-danger';
      db.textContent = 'Удалить';
      db.addEventListener('click', () => openDeleteConfirm(s));
      actions.appendChild(db);
    } else {
      const nb = document.createElement('button');
      nb.className = 'menu-btn menu-btn-primary';
      nb.textContent = 'Создать';
      nb.addEventListener('click', () => playSlot(s));
      actions.appendChild(nb);
    }

    card.appendChild(actions);
    slotsList.appendChild(card);
  }
}

// ============================================================
// ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ
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
  else showMenuOnly(menuMain);
}

function renderSettingsUI(){
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