import { t } from '../i18n/i18n.js';
import { playWhoosh } from './sounds.js';

// Central VFX module for Stage 7.2. Every effect is idempotent and respects
// `prefers-reduced-motion` — when reduce is on we keep the *visual outcome*
// (e.g. a colored border, a label) but skip the motion, so the user still sees
// that "something good happened" without a vestibular trigger.

const STYLE_ID = 'qd-juice-effects-styles';

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch (e) { return false; }
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* --- ON FIRE overlay --- */
    .qd-on-fire-overlay {
      position: absolute;
      top: 56px;
      left: 50%;
      transform: translateX(-50%) translateY(-6px);
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-weight: 800;
      font-size: 1.7rem;
      letter-spacing: 0.06em;
      color: #FFD54F;
      text-shadow: 0 0 14px rgba(255,213,79,0.75), 0 0 28px rgba(255,140,26,0.55);
      pointer-events: none;
      z-index: 50;
      white-space: nowrap;
      opacity: 0;
      animation: qdOnFireFlash 1200ms ease-out forwards;
    }
    @keyframes qdOnFireFlash {
      0%   { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(0.7); }
      18%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.1); }
      42%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.95); }
    }
    .qd-on-fire-overlay.qd-reduced {
      animation: none;
      opacity: 1;
      transition: opacity 1.2s ease-out;
    }

    /* --- Confetti host --- */
    .qd-confetti-host {
      position: absolute; inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 40;
    }
    .qd-confetti-piece {
      position: absolute;
      top: -12px;
      width: 8px; height: 12px;
      border-radius: 2px;
      opacity: 0;
      will-change: transform, opacity;
      animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
      animation-fill-mode: forwards;
    }
    @keyframes qdConfettiFall {
      0%   { opacity: 0; transform: translate3d(0,-20px,0) rotate(0deg); }
      8%   { opacity: 1; }
      100% { opacity: 0; transform: translate3d(var(--qd-dx,0px), var(--qd-dy,100vh), 0) rotate(var(--qd-rot,720deg)); }
    }

    /* --- Screen shake --- */
    .qd-shake-weak   { animation: qdShakeWeak   400ms ease-in-out; }
    .qd-shake-medium { animation: qdShakeMedium 400ms ease-in-out; }
    .qd-shake-heavy  { animation: qdShakeHeavy  400ms ease-in-out; }
    @keyframes qdShakeWeak {
      0%,100% { transform: translateX(0); }
      15% { transform: translateX(-2px); }
      30% { transform: translateX(2px); }
      45% { transform: translateX(-1.5px); }
      60% { transform: translateX(1.5px); }
      75% { transform: translateX(-1px); }
      90% { transform: translateX(1px); }
    }
    @keyframes qdShakeMedium {
      0%,100% { transform: translateX(0); }
      15% { transform: translateX(-5px); }
      30% { transform: translateX(5px); }
      45% { transform: translateX(-4px); }
      60% { transform: translateX(4px); }
      75% { transform: translateX(-2px); }
      90% { transform: translateX(2px); }
    }
    @keyframes qdShakeHeavy {
      0%,100% { transform: translateX(0) translateY(0); }
      10% { transform: translateX(-10px) translateY(-2px); }
      25% { transform: translateX(10px) translateY(2px); }
      40% { transform: translateX(-8px) translateY(-1px); }
      55% { transform: translateX(8px) translateY(1px); }
      70% { transform: translateX(-4px) translateY(0); }
      85% { transform: translateX(4px) translateY(0); }
    }

    /* --- Golden pulse (for big score / new best) --- */
    .qd-golden-pulse {
      animation: qdGoldenPulse 1400ms ease-in-out infinite;
    }
    @keyframes qdGoldenPulse {
      0%,100% { color: #FFFFFF; text-shadow: 0 0 0 rgba(255,213,79,0); }
      50%     { color: #FFD54F; text-shadow: 0 0 20px rgba(255,213,79,0.75), 0 0 40px rgba(245,180,66,0.45); }
    }

    /* --- Streak flame pulse --- */
    .qd-streak-pulse {
      display: inline-block;
      animation: qdStreakPulse 2000ms ease-in-out infinite;
      transform-origin: 50% 60%;
      will-change: transform, filter;
    }
    @keyframes qdStreakPulse {
      0%,100% { transform: scale(1); filter: hue-rotate(0deg) drop-shadow(0 0 2px rgba(255,140,26,0.4)); }
      50%     { transform: scale(1.15); filter: hue-rotate(-12deg) drop-shadow(0 0 10px rgba(255,140,26,0.85)); }
    }

    /* --- Perfect game backdrop (radial rainbow halo) --- */
    .qd-perfect-backdrop::before {
      content: '';
      position: absolute;
      inset: -40%;
      z-index: -1;
      background: conic-gradient(
        from 0deg,
        rgba(255,107,107,0.18),
        rgba(255,193,7,0.18),
        rgba(16,185,129,0.18),
        rgba(79,195,247,0.18),
        rgba(156,39,176,0.18),
        rgba(255,107,107,0.18)
      );
      filter: blur(42px);
      animation: qdPerfectSpin 8s linear infinite;
      pointer-events: none;
    }
    .qd-perfect-backdrop { position: relative; }
    @keyframes qdPerfectSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* --- Match win aura (concentric gold rings around avatar/card) --- */
    .qd-match-aura { position: relative; }
    .qd-match-aura::before,
    .qd-match-aura::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: inherit;
      border: 2px solid rgba(255,213,79,0.6);
      pointer-events: none;
      animation: qdAuraPulse 3000ms ease-out infinite;
      opacity: 0;
    }
    .qd-match-aura::after { animation-delay: 1500ms; }
    @keyframes qdAuraPulse {
      0%   { transform: scale(0.95); opacity: 0.9; }
      80%  { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }

    /* --- Unlock overlay juice (extends unlockOverlay.js in-place) --- */
    .qd-unlock-flash {
      position: fixed; inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(255,213,107,0.55) 0%, rgba(255,213,107,0) 60%);
      z-index: 9997;
      pointer-events: none;
      animation: qdUnlockFlashFade 700ms ease-out forwards;
    }
    @keyframes qdUnlockFlashFade {
      0%   { opacity: 0; }
      30%  { opacity: 1; }
      100% { opacity: 0; }
    }
    .qd-unlock-particles {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }
    .qd-unlock-particle {
      position: absolute;
      left: 50%; top: 50%;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: radial-gradient(circle, #FFF2B8 0%, #F5B342 70%, rgba(245,180,66,0) 100%);
      opacity: 0;
      animation: qdUnlockParticle 1100ms ease-out forwards;
      will-change: transform, opacity;
    }
    @keyframes qdUnlockParticle {
      0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
      15%  { opacity: 1; }
      100% { opacity: 0; transform: translate(calc(-50% + var(--qd-px, 0px)), calc(-50% + var(--qd-py, 0px))) scale(0.8); }
    }
    .qd-unlock-level-bounce {
      animation: qdUnlockLevelBounce 900ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      display: inline-block;
    }
    @keyframes qdUnlockLevelBounce {
      0%   { transform: scale(0.3); opacity: 0; }
      60%  { transform: scale(1.25); opacity: 1; }
      80%  { transform: scale(0.95); }
      100% { transform: scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      .qd-shake-weak, .qd-shake-medium, .qd-shake-heavy,
      .qd-golden-pulse, .qd-streak-pulse,
      .qd-perfect-backdrop::before,
      .qd-match-aura::before, .qd-match-aura::after,
      .qd-unlock-flash, .qd-unlock-particle,
      .qd-unlock-level-bounce,
      .qd-confetti-piece {
        animation: none !important;
      }
      .qd-golden-pulse { color: #FFD54F; text-shadow: 0 0 12px rgba(255,213,79,0.5); }
    }
  `;
  document.head.appendChild(style);
}

// --- Effect 1: ON FIRE overlay at streak 3 / 5 / 7 ---
// `root` is the quiz screen host (we position overlay absolutely inside it).
// Caller passes streakCount *after* the correct answer — 3 => "on fire",
// 5 => "unstoppable", 7 => "legendary". Anything else is a no-op.
export function showOnFire(root, streakCount) {
  if (!root) return;
  injectStyles();
  let key = null;
  if (streakCount === 3) key = 'onFire';
  else if (streakCount === 5) key = 'unstoppable';
  else if (streakCount === 7) key = 'legendary';
  if (!key) return;

  // Ensure the host is a positioning context (safe — value read from computed).
  try {
    const pos = getComputedStyle(root).position;
    if (pos === 'static' || !pos) root.style.position = 'relative';
  } catch (e) { /* ignore */ }

  const overlay = document.createElement('div');
  overlay.className = 'qd-on-fire-overlay' + (prefersReducedMotion() ? ' qd-reduced' : '');
  overlay.textContent = t(key) || key;
  root.appendChild(overlay);

  try { playWhoosh(); } catch (e) { /* ignore */ }

  if (prefersReducedMotion()) {
    // Fade-out only — no bounce.
    overlay.style.opacity = '1';
    setTimeout(() => { overlay.style.opacity = '0'; }, 900);
    setTimeout(() => { overlay.remove(); }, 1400);
  } else {
    setTimeout(() => { overlay.remove(); }, 1250);
  }
}

// --- Effect 2: Confetti burst (win / record / perfect variants) ---
// Injects a positioned-absolute host inside `container` and spawns 60–100
// particles that fall and rotate via CSS custom properties.
const CONFETTI_PALETTES = {
  win:     ['#10B981', '#FFD54F', '#34D399', '#F5B342', '#FFFFFF'],
  record:  ['#F5B342', '#FFD36B', '#FF8C1A', '#FFEAB0', '#FFFFFF'],
  perfect: null // rainbow (hsl rotated) generated per-particle
};
export function triggerConfetti(container, variant = 'win') {
  if (!container) return;
  injectStyles();
  if (prefersReducedMotion()) return; // static fallback = nothing (golden pulse already communicates)

  // Make container a positioning context if it isn't one.
  try {
    const pos = getComputedStyle(container).position;
    if (pos === 'static' || !pos) container.style.position = 'relative';
  } catch (e) { /* ignore */ }

  const host = document.createElement('div');
  host.className = 'qd-confetti-host';
  container.appendChild(host);

  const count = variant === 'perfect' ? 100 : (variant === 'record' ? 80 : 60);
  const palette = CONFETTI_PALETTES[variant] || CONFETTI_PALETTES.win;
  const hostWidth = host.getBoundingClientRect().width || 360;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'qd-confetti-piece';
    let color;
    if (variant === 'perfect') {
      const hue = (i * 360 / count) % 360;
      color = `hsl(${hue}, 85%, 60%)`;
    } else {
      color = palette[i % palette.length];
    }
    p.style.background = color;
    const startX = Math.random() * hostWidth;
    const dx = (Math.random() - 0.5) * hostWidth * 1.2;
    const dy = 400 + Math.random() * 400;
    const rot = (Math.random() * 1440 - 720) + 'deg';
    const dur = 1400 + Math.random() * 1600;
    const delay = Math.random() * 450;
    p.style.left = startX + 'px';
    p.style.setProperty('--qd-dx', dx + 'px');
    p.style.setProperty('--qd-dy', dy + 'px');
    p.style.setProperty('--qd-rot', rot);
    p.style.width = (6 + Math.random() * 6) + 'px';
    p.style.height = (8 + Math.random() * 10) + 'px';
    p.style.animation = `qdConfettiFall ${dur}ms ${delay}ms cubic-bezier(0.2,0.7,0.3,1) forwards`;
    host.appendChild(p);
  }

  // Auto-clean after the longest-lived piece (2000 + 450 delay buffer).
  setTimeout(() => { try { host.remove(); } catch (e) {} }, 3400);
}

// --- Effect 3: Screen shake ---
export function screenShake(el, strength = 'medium') {
  if (!el) return;
  injectStyles();
  if (prefersReducedMotion()) return;
  const cls = strength === 'weak'  ? 'qd-shake-weak'
           : strength === 'heavy' ? 'qd-shake-heavy'
           : 'qd-shake-medium';
  // Idempotent: if already shaking, let current cycle finish.
  if (el.classList.contains(cls)) return;
  el.classList.add(cls);
  setTimeout(() => { el.classList.remove(cls); }, 420);
}

// --- Effect 4: Golden pulse (infinite) on a target element ---
export function goldenPulse(el) {
  if (!el) return;
  injectStyles();
  if (el.dataset.qdGolden === '1') return;
  el.dataset.qdGolden = '1';
  el.classList.add('qd-golden-pulse');
}

// --- Effect 5: Streak flame pulse (infinite) on a flame emoji span ---
export function pulseStreakFlame(flameEl) {
  if (!flameEl) return;
  injectStyles();
  if (flameEl.dataset.qdFlame === '1') return;
  flameEl.dataset.qdFlame = '1';
  flameEl.classList.add('qd-streak-pulse');
}

// --- Effect 6: Perfect-game backdrop (radial rainbow on result root) ---
export function perfectGameBackdrop(resultRoot) {
  if (!resultRoot) return;
  injectStyles();
  if (resultRoot.dataset.qdPerfect === '1') return;
  resultRoot.dataset.qdPerfect = '1';
  resultRoot.classList.add('qd-perfect-backdrop');
}

// --- Effect 7: Match-win aura (double gold rings on YOU card) ---
export function matchWinAura(el) {
  if (!el) return;
  injectStyles();
  if (el.dataset.qdAura === '1') return;
  el.dataset.qdAura = '1';
  el.classList.add('qd-match-aura');
}

// --- Unlock overlay juice helpers (called from unlockOverlay.js) ---
// Flash the screen with a golden radial fade.
export function unlockGoldenFlash() {
  injectStyles();
  if (prefersReducedMotion()) return;
  const flash = document.createElement('div');
  flash.className = 'qd-unlock-flash';
  document.body.appendChild(flash);
  setTimeout(() => { try { flash.remove(); } catch (e) {} }, 750);
}

// 40 particles bursting from screen center.
export function unlockParticleBurst() {
  injectStyles();
  if (prefersReducedMotion()) return;
  const host = document.createElement('div');
  host.className = 'qd-unlock-particles';
  document.body.appendChild(host);
  const count = 40;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'qd-unlock-particle';
    const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
    const dist = 140 + Math.random() * 180;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    p.style.setProperty('--qd-px', px + 'px');
    p.style.setProperty('--qd-py', py + 'px');
    p.style.animationDelay = (Math.random() * 120) + 'ms';
    p.style.width  = (5 + Math.random() * 6) + 'px';
    p.style.height = p.style.width;
    host.appendChild(p);
  }
  setTimeout(() => { try { host.remove(); } catch (e) {} }, 1400);
}

// Scale-bounce a level number / title element.
export function unlockLevelBounce(el) {
  if (!el) return;
  injectStyles();
  if (prefersReducedMotion()) return;
  el.classList.add('qd-unlock-level-bounce');
}
