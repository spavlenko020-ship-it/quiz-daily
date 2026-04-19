import { theme } from '../ui/theme.js';
import { t } from '../i18n/i18n.js';
import { playClick, playWhoosh } from '../ui/sounds.js';

// First-time-only 3-slide intro carousel. Gated by localStorage
// `quiz_onboarded` flag set in main.js on completion. Non-intrusive — it
// owns a fullscreen overlay rendered into `container` and removes itself
// before firing `onComplete()`, so the caller's subsequent `showHome()`
// paints into a clean #app.

const STYLE_ID = 'qd-onb-styles';
const STORAGE_KEY = 'quiz_onboarded';
const TOTAL_SLIDES = 3;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-onb-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.88);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 9995;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(20px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(20px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
      font-family: ${theme.fonts.body};
      color: ${c.text};
      animation: qdOnbFade 260ms ease-out;
    }
    @keyframes qdOnbFade { from { opacity: 0; } to { opacity: 1; } }
    .qd-onb-card {
      width: 320px;
      max-width: 92vw;
      min-height: 460px;
      max-height: 90vh;
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(16,185,129,0.12), rgba(12,8,24,0.96));
      border: 1px solid rgba(255,255,255,0.08);
      border-top: 3px solid #10B981;
      box-shadow: 0 24px 64px rgba(0,0,0,0.65), 0 0 32px rgba(16,185,129,0.2);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      touch-action: pan-y;
    }
    .qd-onb-skip {
      position: absolute;
      top: 10px; right: 12px;
      background: transparent;
      color: rgba(255,255,255,0.55);
      border: none;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 8px 10px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      z-index: 2;
    }
    .qd-onb-skip:hover { color: rgba(255,255,255,0.9); }
    .qd-onb-track {
      flex: 1;
      display: flex;
      flex-direction: row;
      transition: transform 320ms cubic-bezier(0.2, 0.8, 0.3, 1);
      will-change: transform;
    }
    .qd-onb-slide {
      min-width: 100%;
      padding: 48px 26px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
    }
    .qd-onb-emoji {
      font-size: 5rem;
      line-height: 1;
      margin-top: 10px;
    }
    .qd-onb-title {
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: -0.01em;
      color: #FFFFFF;
    }
    .qd-onb-body {
      font-size: 0.95rem;
      line-height: 1.45;
      color: ${c.textDim};
      max-width: 260px;
    }
    .qd-onb-footer {
      padding: 10px 22px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      align-items: center;
    }
    .qd-onb-dots {
      display: flex;
      gap: 8px;
    }
    .qd-onb-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.22);
      transition: background 220ms ease, transform 220ms ease;
    }
    .qd-onb-dot.is-active {
      background: #F5B342;
      transform: scale(1.2);
    }
    .qd-onb-btn {
      width: 100%;
      min-height: 48px;
      padding: 0.85rem 1.1rem;
      background: #10B981;
      color: #FFFFFF;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 4px 0 #047857, 0 6px 18px rgba(16,185,129,0.4);
      transition: all 160ms ease-out;
    }
    .qd-onb-btn:hover { background: #0EA371; transform: translateY(-2px); }
    .qd-onb-btn:active { transform: translateY(2px); box-shadow: 0 0 0 #047857, 0 4px 12px rgba(16,185,129,0.45); }
  `;
  document.head.appendChild(style);
}

export function renderOnboarding(container, onComplete) {
  if (!container) { if (onComplete) onComplete(); return; }
  injectStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'qd-onb-backdrop';

  const card = document.createElement('div');
  card.className = 'qd-onb-card';

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'qd-onb-skip';
  skip.textContent = t('onbSkip') || 'Skip';

  const track = document.createElement('div');
  track.className = 'qd-onb-track';

  const SLIDES = [
    { emoji: '🎯', titleKey: 'onb1Title', bodyKey: 'onb1Body' },
    { emoji: '🔥', titleKey: 'onb2Title', bodyKey: 'onb2Body' },
    { emoji: '⚔️', titleKey: 'onb3Title', bodyKey: 'onb3Body' }
  ];

  SLIDES.forEach((s) => {
    const slide = document.createElement('div');
    slide.className = 'qd-onb-slide';
    const emoji = document.createElement('div');
    emoji.className = 'qd-onb-emoji';
    emoji.textContent = s.emoji;
    const title = document.createElement('div');
    title.className = 'qd-onb-title';
    title.textContent = t(s.titleKey) || s.titleKey;
    const body = document.createElement('div');
    body.className = 'qd-onb-body';
    body.textContent = t(s.bodyKey) || s.bodyKey;
    slide.appendChild(emoji);
    slide.appendChild(title);
    slide.appendChild(body);
    track.appendChild(slide);
  });

  const footer = document.createElement('div');
  footer.className = 'qd-onb-footer';

  const dots = document.createElement('div');
  dots.className = 'qd-onb-dots';
  const dotEls = [];
  for (let i = 0; i < TOTAL_SLIDES; i++) {
    const d = document.createElement('div');
    d.className = 'qd-onb-dot';
    dots.appendChild(d);
    dotEls.push(d);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'qd-onb-btn';

  footer.appendChild(dots);
  footer.appendChild(btn);

  card.appendChild(skip);
  card.appendChild(track);
  card.appendChild(footer);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  let idx = 0;
  let finished = false;

  function renderCurrent() {
    track.style.transform = `translateX(-${idx * 100}%)`;
    dotEls.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    btn.textContent = idx === TOTAL_SLIDES - 1
      ? (t('onbPlay') || 'Play!')
      : (t('onbNext') || 'Next');
  }

  function finish() {
    if (finished) return;
    finished = true;
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
    backdrop.style.transition = 'opacity 220ms ease-out';
    backdrop.style.opacity = '0';
    setTimeout(() => {
      try { backdrop.remove(); } catch (e) {}
      if (onComplete) onComplete();
    }, 240);
  }

  btn.addEventListener('click', () => {
    playClick();
    if (idx < TOTAL_SLIDES - 1) {
      idx += 1;
      try { playWhoosh(); } catch (e) {}
      renderCurrent();
    } else {
      finish();
    }
  });

  skip.addEventListener('click', () => {
    playClick();
    finish();
  });

  // Swipe support — track X delta on touchstart/touchend and advance/retreat
  // if the horizontal drag exceeds a threshold.
  let startX = null;
  let dragging = false;
  card.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    dragging = true;
  }, { passive: true });
  card.addEventListener('touchend', (e) => {
    if (!dragging || startX == null) return;
    dragging = false;
    const endX = (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX) || startX;
    const dx = endX - startX;
    startX = null;
    const THRESHOLD = 50;
    if (dx < -THRESHOLD && idx < TOTAL_SLIDES - 1) {
      idx += 1;
      try { playWhoosh(); } catch (e) {}
      renderCurrent();
    } else if (dx > THRESHOLD && idx > 0) {
      idx -= 1;
      try { playWhoosh(); } catch (e) {}
      renderCurrent();
    }
  }, { passive: true });

  renderCurrent();
}
