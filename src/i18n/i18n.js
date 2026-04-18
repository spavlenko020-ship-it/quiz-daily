import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './translations.js';

const STORAGE_KEY = 'quiz_daily_lang';
let currentLang = DEFAULT_LANGUAGE;
const listeners = [];

function detectBrowserLanguage() {
  const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (browserLang.startsWith('uk')) return 'uk';
  if (browserLang.startsWith('ru')) return 'uk';
  if (browserLang.startsWith('be')) return 'uk';
  if (browserLang.startsWith('nb') || browserLang.startsWith('nn') || browserLang.startsWith('no')) return 'no';
  if (browserLang.startsWith('en')) return 'en';
  return DEFAULT_LANGUAGE;
}

export function initLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    currentLang = saved;
  } else {
    currentLang = detectBrowserLanguage();
  }
  return currentLang;
}

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(fn => fn(lang));
}

export function onLanguageChange(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function t(key, vars = {}) {
  const dict = translations[currentLang] || translations[DEFAULT_LANGUAGE];
  let str = dict[key] || translations[DEFAULT_LANGUAGE][key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return str;
}

export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}
