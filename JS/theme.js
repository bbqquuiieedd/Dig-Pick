// theme.js — обе темы и хелперы для canvas
const THEMES = {
  light: {
    // Панели
    panelBg: 'rgba(250, 245, 232, 0.94)',
    panelBorder: 'rgba(140, 90, 40, 0.55)',
    panelBorderSoft: 'rgba(140, 90, 40, 0.3)',

    // Текст
    text: '#3a2a1a',
    textMuted: 'rgba(60, 40, 20, 0.75)',
    textAccent: '#a0522d',
    textAccentSoft: '#7a3a1a',

    // Слоты
    slotBg: 'rgba(140, 90, 40, 0.08)',
    slotBgHover: 'rgba(140, 90, 40, 0.16)',
    slotBorder: 'rgba(140, 90, 40, 0.3)',
    slotBorderActive: 'rgba(160, 100, 40, 0.85)',
    resultBg: 'rgba(200, 140, 60, 0.2)',
    resultBorder: 'rgba(160, 100, 40, 0.6)',

    // Служебное
    overlay: 'rgba(30, 20, 10, 0.35)',
    closeBtnBg: 'rgba(200, 60, 60, 0.12)',
    closeBtnBorder: 'rgba(200, 60, 60, 0.5)',
    closeBtnText: '#c0392b',
    hintBg: 'rgba(60, 40, 20, 0.75)',
    hintText: '#f5ede0',

    // Хотбар
    hotbarSlotBg: 'rgba(250, 245, 232, 0.55)',
    hotbarSlotActiveBg: 'rgba(200, 140, 60, 0.35)',
    hotbarSlotBorder: 'rgba(140, 90, 40, 0.45)',
    hotbarSlotActiveBorder: '#a0522d',
    hotbarLabelBg: 'rgba(250, 245, 232, 0.85)',
    hotbarLabelText: '#3a2a1a',
    hotbarIndexText: 'rgba(60, 40, 20, 0.7)',

    // Книга рецептов
    recipeCard: 'rgba(140, 90, 40, 0.06)',
    recipeCardBorder: 'rgba(140, 90, 40, 0.2)',
    recipeFurnace: '#c08a2a',

    // HP-бар
    hpBg: 'rgba(60, 20, 20, 0.75)',
    hpFill: '#c0392b',
    hpBorder: 'rgba(60, 20, 20, 0.5)',

    // Прочее
    pageActive: 'rgba(160, 100, 40, 0.85)',
    pageInactive: 'rgba(140, 90, 40, 0.2)',
  },
  dark: {
    panelBg: 'rgba(20, 20, 40, 0.94)',
    panelBorder: 'rgba(255, 215, 0, 0.35)',
    panelBorderSoft: 'rgba(255, 215, 0, 0.2)',

    text: '#fff',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    textAccent: '#ffd700',
    textAccentSoft: '#ffe066',

    slotBg: 'rgba(0, 0, 0, 0.5)',
    slotBgHover: 'rgba(255, 255, 255, 0.08)',
    slotBorder: 'rgba(255, 255, 255, 0.3)',
    slotBorderActive: 'rgba(255, 215, 0, 0.85)',
    resultBg: 'rgba(255, 215, 0, 0.10)',
    resultBorder: 'rgba(255, 215, 0, 0.5)',

    overlay: 'rgba(0, 0, 0, 0.55)',
    closeBtnBg: 'rgba(200, 60, 60, 0.15)',
    closeBtnBorder: 'rgba(255, 100, 100, 0.5)',
    closeBtnText: '#ff9a9a',
    hintBg: 'rgba(120, 20, 20, 0.75)',
    hintText: '#ffdddd',

    hotbarSlotBg: 'rgba(0, 0, 0, 0.55)',
    hotbarSlotActiveBg: 'rgba(255, 215, 0, 0.25)',
    hotbarSlotBorder: 'rgba(255, 255, 255, 0.35)',
    hotbarSlotActiveBorder: '#ffd700',
    hotbarLabelBg: 'rgba(0, 0, 0, 0.55)',
    hotbarLabelText: '#fff',
    hotbarIndexText: 'rgba(255, 255, 255, 0.55)',

    recipeCard: 'rgba(255, 255, 255, 0.04)',
    recipeCardBorder: 'rgba(255, 255, 255, 0.15)',
    recipeFurnace: '#ffb300',

    hpBg: 'rgba(0, 0, 0, 0.75)',
    hpFill: '#e53935',
    hpBorder: 'rgba(255, 255, 255, 0.4)',

    pageActive: 'rgba(255, 215, 0, 0.85)',
    pageInactive: 'rgba(255, 255, 255, 0.2)',
  }
};

let currentThemeName = 'light';

function getTheme(){
  return THEMES[currentThemeName];
}

function setTheme(name){
  currentThemeName = (name === 'dark') ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentThemeName);
}