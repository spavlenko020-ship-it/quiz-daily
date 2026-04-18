import { getLanguage, setLanguage, getSupportedLanguages } from '../i18n/i18n.js';

const LABELS = { en: 'EN', uk: 'UA', no: 'NO' };

export function renderLangSwitcher() {
  const existing = document.getElementById('lang-switcher');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'lang-switcher';
  container.style.cssText = `
    position: fixed; top: 12px; right: 12px; z-index: 1000;
    display: flex; gap: 4px; background: rgba(26,26,46,0.85);
    backdrop-filter: blur(10px); padding: 4px; border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.08);
  `;

  const current = getLanguage();
  for (const lang of getSupportedLanguages()) {
    const btn = document.createElement('button');
    btn.textContent = LABELS[lang];
    btn.style.cssText = `
      background: ${lang === current ? '#f5b43c' : 'transparent'};
      color: ${lang === current ? '#0b0a12' : 'rgba(255,255,255,0.85)'};
      border: none; padding: 8px 14px; border-radius: 20px;
      font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 0.85rem; font-weight: 700;
      cursor: pointer; transition: background 0.2s; letter-spacing: 1px;
      min-width: 44px;
    `;
    btn.addEventListener('click', () => {
      if (lang !== getLanguage()) {
        setLanguage(lang);
        location.reload();
      }
    });
    container.appendChild(btn);
  }
  document.body.appendChild(container);
}
