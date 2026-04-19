import { theme } from './theme.js';
import { t } from '../i18n/i18n.js';
import { playClick, playFanfare } from './sounds.js';
import { unlockGoldenFlash, unlockParticleBurst, unlockLevelBounce } from './juiceEffects.js';

const STYLE_ID = 'qd-unlock-overlay-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-unlock-overlay {
      position: fixed; inset: 0;
      background: rgba(10,5,20,0.72);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      animation: qdUnlockFadeIn 0.2s ease-out;
    }
    @keyframes qdUnlockFadeIn { from { opacity: 0; } to { opacity: 1; } }
    .qd-unlock-card {
      width: min(320px, 90vw);
      padding: 24px 22px;
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(245,180,66,0.1), rgba(20,14,10,0.95));
      border: 2px solid rgba(245,180,66,0.6);
      text-align: center;
      color: ${c.text};
      font-family: ${theme.fonts.body};
      box-shadow: 0 20px 48px rgba(0,0,0,0.6), 0 0 32px rgba(245,180,66,0.3);
      animation: qdUnlockPop 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.2);
    }
    @keyframes qdUnlockPop {
      0% { transform: scale(0.7); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .qd-unlock-icon { font-size: 3.4rem; line-height: 1; }
    .qd-unlock-title {
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.25rem;
      color: #FFD36B;
      margin-top: 10px;
      letter-spacing: 0.01em;
      line-height: 1.3;
    }
    .qd-unlock-btn {
      margin-top: 18px;
      min-width: 160px;
      padding: 11px 22px;
      background: linear-gradient(135deg, #F5B342, #FFD36B);
      color: #3A1A00;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 4px 14px rgba(245,180,66,0.45);
    }
    .qd-unlock-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
    .qd-unlock-btn:active { transform: translateY(1px); }
  `;
  document.head.appendChild(style);
}

const UNLOCK_CONFIG = {
  3:  { icon: '🎯',    rewardKey: 'rewardFreeFifty1' },
  5:  { icon: '❄️',    rewardKey: 'rewardStreakFreeze' },
  7:  { icon: '🎯🎯',  rewardKey: 'rewardFreeFifty2' },
  10: { icon: '👑',    rewardKey: 'rewardProBadge' }
};

export function showUnlockOverlay(level, onDismiss) {
  injectStyles();
  const cfg = UNLOCK_CONFIG[level];
  if (!cfg) { if (onDismiss) onDismiss(); return; }

  const overlay = document.createElement('div');
  overlay.className = 'qd-unlock-overlay';

  const card = document.createElement('div');
  card.className = 'qd-unlock-card';

  const icon = document.createElement('div');
  icon.className = 'qd-unlock-icon';
  icon.textContent = cfg.icon;
  card.appendChild(icon);

  const titleEl = document.createElement('div');
  titleEl.className = 'qd-unlock-title';
  titleEl.textContent = t('levelUpUnlocked', { N: level, reward: t(cfg.rewardKey) });
  card.appendChild(titleEl);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'qd-unlock-btn';
  btn.textContent = t('claim') || 'Claim';
  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    playClick();
    overlay.style.transition = 'opacity 0.2s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      if (onDismiss) onDismiss();
    }, 220);
  }
  btn.addEventListener('click', dismiss);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });
  card.appendChild(btn);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // --- Stage 7.2 juice: golden flash + particle burst + level-icon bounce +
  // fanfare. All helpers internally respect prefers-reduced-motion (flash +
  // particles short-circuit; bounce keeps the icon at final scale via CSS).
  try { unlockGoldenFlash(); } catch (e) { /* ignore */ }
  try { unlockParticleBurst(); } catch (e) { /* ignore */ }
  try { unlockLevelBounce(icon); } catch (e) { /* ignore */ }
  try { playFanfare(); } catch (e) { /* ignore */ }
}
