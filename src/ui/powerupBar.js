import { theme } from './theme.js';
import { t } from '../i18n/i18n.js';
import { playClick } from './sounds.js';
import {
  POWERUP_COSTS,
  canUseFreeFiftyFifty,
  consumeFreeFiftyFifty,
  getFreeDailyQuota,
  getTodayFreeUsed
} from '../game/powerups.js';
import { getCoins, addCoins } from '../game/stats.js';
import { areAdsEnabled } from '../config/flags.js';

const STYLE_ID = 'qd-powerup-bar-styles';

function injectPowerupStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-pwrbar {
      display: flex;
      justify-content: flex-end;
      padding: 6px 4px 0 4px;
      position: relative;
    }
    .qd-pwr-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(245,180,66,0.2), rgba(255,211,107,0.2));
      border: 1.5px solid rgba(245,180,66,0.6);
      color: #ffd36b;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 0.62rem;
      letter-spacing: 0.04em;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      line-height: 1;
      box-shadow: 0 2px 8px rgba(245,180,66,0.25), inset 0 1px 0 rgba(255,255,255,0.15);
      transition: transform 120ms ease, filter 120ms ease;
      position: relative;
    }
    .qd-pwr-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
    .qd-pwr-btn:active:not(:disabled) { transform: translateY(1px); }
    .qd-pwr-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      filter: grayscale(0.5);
    }
    .qd-pwr-btn-icon { font-size: 1.3rem; line-height: 1; margin-bottom: 1px; }
    .qd-pwr-btn-label { font-size: 0.58rem; letter-spacing: 0.06em; }
    .qd-pwr-free-dot {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #10B981;
      color: #fff;
      font-size: 0.58rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(16,185,129,0.4);
      letter-spacing: 0;
    }

    .qd-pwr-popup-backdrop {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      width: min(260px, 90vw);
      padding: 12px;
      border-radius: ${r.lg};
      background: rgba(20,14,10,0.96);
      border: 1px solid rgba(245,180,66,0.45);
      box-shadow: 0 12px 32px rgba(0,0,0,0.55), 0 0 20px rgba(245,180,66,0.25);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 50;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-family: ${theme.fonts.body};
    }
    .qd-pwr-popup-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.92rem;
      color: ${c.text};
      padding: 0 4px;
    }
    .qd-pwr-popup-btn {
      padding: 10px 12px;
      border-radius: ${r.md};
      font-family: ${theme.fonts.body};
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      border: 1.5px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s, border-color 0.15s;
    }
    .qd-pwr-popup-coins {
      background: rgba(255,193,7,0.14);
      border-color: rgba(255,193,7,0.55);
      color: #FFD54F;
    }
    .qd-pwr-popup-coins:hover { background: rgba(255,193,7,0.22); }
    .qd-pwr-popup-coins:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .qd-pwr-popup-ad {
      background: rgba(16,185,129,0.14);
      border-color: rgba(16,185,129,0.55);
      color: #6EE7B7;
    }
    .qd-pwr-popup-ad:hover { background: rgba(16,185,129,0.22); }
    .qd-pwr-popup-cancel {
      background: transparent;
      border: none;
      color: ${c.textDim};
      font-size: 0.78rem;
      padding: 4px;
      align-self: center;
      cursor: pointer;
    }

    .qd-pwr-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      background: rgba(20,14,10,0.95);
      border: 1px solid rgba(245,180,66,0.55);
      color: #FFD54F;
      padding: 10px 18px;
      border-radius: 999px;
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem; font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.55), 0 0 16px rgba(245,180,66,0.25);
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);
}

function flashToast(msg) {
  const el = document.createElement('div');
  el.className = 'qd-pwr-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }, 1700);
}

export function renderPowerupBar(hostEl, ctx) {
  injectPowerupStyles();
  const { level, platform, onUsed } = ctx;

  const bar = document.createElement('div');
  bar.className = 'qd-pwrbar';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'qd-pwr-btn';
  btn.setAttribute('aria-label', t('useFiftyFifty'));
  const iconEl = document.createElement('span');
  iconEl.className = 'qd-pwr-btn-icon';
  iconEl.textContent = '🎯';
  const labelEl = document.createElement('span');
  labelEl.className = 'qd-pwr-btn-label';
  labelEl.textContent = '50/50';
  btn.appendChild(iconEl);
  btn.appendChild(labelEl);

  // Free-quota green dot indicator if free uses are available today.
  const freeRemaining = Math.max(0, getFreeDailyQuota(level) - getTodayFreeUsed());
  if (freeRemaining > 0) {
    const dot = document.createElement('span');
    dot.className = 'qd-pwr-free-dot';
    dot.textContent = String(freeRemaining);
    btn.appendChild(dot);
  }

  let usedOnce = false;
  let popup = null;

  function closePopup() {
    if (popup) { popup.remove(); popup = null; }
  }

  function fire(source /* 'free' | 'coins' | 'ad' */) {
    if (usedOnce) return;
    usedOnce = true;
    btn.disabled = true;
    closePopup();
    flashToast(t('fiftyFiftyUsed'));
    if (onUsed) onUsed(source);
  }

  btn.addEventListener('click', (e) => {
    if (usedOnce) return;
    e.stopPropagation();
    playClick();

    if (canUseFreeFiftyFifty(level)) {
      consumeFreeFiftyFifty();
      fire('free');
      return;
    }

    // Open popup with Coins / Ad / Cancel.
    if (popup) { closePopup(); return; }
    popup = document.createElement('div');
    popup.className = 'qd-pwr-popup-backdrop';

    const title = document.createElement('div');
    title.className = 'qd-pwr-popup-title';
    title.textContent = t('useFiftyFifty');
    popup.appendChild(title);

    const coinsBtn = document.createElement('button');
    coinsBtn.type = 'button';
    coinsBtn.className = 'qd-pwr-popup-btn qd-pwr-popup-coins';
    const cost = POWERUP_COSTS.fiftyFifty;
    coinsBtn.textContent = `${cost} 🪙`;
    if (getCoins() < cost) coinsBtn.disabled = true;
    coinsBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      playClick();
      if (getCoins() < cost) { flashToast(t('notEnoughCoins')); return; }
      addCoins(-cost);
      fire('coins');
    });
    popup.appendChild(coinsBtn);

    // Stage 7.5 — ad-gated "watch for free" path only surfaces when ads are
    // enabled. Coin-cost path is always available.
    if (areAdsEnabled()) {
      const adBtn = document.createElement('button');
      adBtn.type = 'button';
      adBtn.className = 'qd-pwr-popup-btn qd-pwr-popup-ad';
      adBtn.textContent = `📺 ${t('free')}`;
      adBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        playClick();
        adBtn.disabled = true;
        let ok = false;
        try {
          if (platform && typeof platform.showAd === 'function') {
            ok = await platform.showAd('rewarded');
          }
        } catch (err) { ok = false; }
        if (ok) {
          fire('ad');
        } else {
          flashToast(t('adUnavailable'));
          closePopup();
        }
      });
      popup.appendChild(adBtn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'qd-pwr-popup-cancel';
    cancelBtn.textContent = t('cancel');
    cancelBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      playClick();
      closePopup();
    });
    popup.appendChild(cancelBtn);

    bar.appendChild(popup);
  });

  // Click anywhere outside → dismiss popup.
  document.addEventListener('click', () => closePopup(), true);

  bar.appendChild(btn);
  hostEl.appendChild(bar);

  return { destroy: () => closePopup() };
}
