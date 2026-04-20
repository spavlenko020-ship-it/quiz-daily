import { t } from '../i18n/i18n.js';
import { playWhoosh } from './sounds.js';
import { juiceLevel } from './deviceCapability.js';

// Central VFX module (Stage 7.2 rework). Premium effects powered by vendored
// canvas-confetti 1.9.3 (public/vendor/confetti.browser.min.js, referenced
// from index.html — NO CDN at runtime, NO npm dependency). All exports are
// idempotent and respect `prefers-reduced-motion` through both JS guards and
// a CSS @media kill-switch on our class prefixes. Public API is unchanged
// from the initial Stage 7.2 implementation so every caller keeps working.

const STYLE_ID = 'qd-juice-effects-styles';

// Stage 7.5: adaptive scaling driven by deviceCapability.detectJuiceLevel().
// `full` keeps the premium-grade 100-200-particle bursts; `lite` drops to
// ~30% for mid-tier mobile GPUs; `off` disables particle work entirely
// (confetti becomes a no-op). Ticks scale 50% on `lite`, 0 on `off`.
function scaleCount(n) {
  if (juiceLevel === 'off') return 0;
  if (juiceLevel === 'lite') return Math.max(8, Math.ceil(n * 0.3));
  return n;
}
function scaleTicks(n) {
  if (juiceLevel === 'off') return 0;
  if (juiceLevel === 'lite') return Math.ceil(n * 0.5);
  return n;
}

// DEBUG flag is statically replaced by Vite so the body of `if (DEBUG)`
// branches is dead-code-eliminated in production — no console.log noise ships.
const DEBUG = import.meta.env.DEV;
function debugLog(...args) { if (DEBUG) console.log('[juice]', ...args); }

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// Grabbed at module load. The vendored script runs earlier in <head>, so by
// the time this module is imported the global is already populated.
const confettiFn = (typeof window !== 'undefined' && typeof window.confetti === 'function')
  ? window.confetti : null;

debugLog('canvas-confetti status:', confettiFn ? 'LOADED' : 'MISSING — vendored script failed');

function safeConfetti(opts) {
  if (!confettiFn) return;
  if (prefersReducedMotion()) return;
  try { confettiFn(opts); } catch (e) { /* silent by design */ }
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ======================================================================
       ON FIRE — glass-morphism badge, fixed top-center, never covers question
       ====================================================================== */
    .qd-on-fire {
      position: fixed;
      top: 12vh;
      left: 50%;
      transform: translateX(-50%) scale(0.6);
      z-index: 9998;
      pointer-events: none;
      padding: 12px 24px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1.5px solid rgba(255,193,7,0.85);
      box-shadow: 0 0 40px rgba(255,193,7,0.5), inset 0 0 20px rgba(255,255,255,0.04);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-weight: 800;
      font-size: 1.35rem;
      letter-spacing: 0.06em;
      white-space: nowrap;
      opacity: 0;
      text-shadow: 0 2px 0 rgba(0,0,0,0.3), 0 0 12px currentColor;
      animation: qdOnFireEnter 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                 qdOnFireExit 400ms ease-out 2300ms forwards;
    }
    .qd-on-fire-3 { color: #F59E0B; }
    .qd-on-fire-5 { color: #06B6D4; }
    .qd-on-fire-7 { color: #FFD700; }
    @keyframes qdOnFireEnter {
      0%   { opacity: 0; transform: translateX(-50%) scale(0.6); }
      60%  { opacity: 1; transform: translateX(-50%) scale(1.12); }
      100% { opacity: 1; transform: translateX(-50%) scale(1); }
    }
    @keyframes qdOnFireExit {
      0%   { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) scale(1) translateY(-20px); }
    }

    /* ======================================================================
       Screen shake — three strengths, transform-origin center
       ====================================================================== */
    .qd-shake-weak   { animation: qdShakeWeak   500ms ease-out; transform-origin: center; }
    .qd-shake-medium { animation: qdShakeMed    500ms ease-out; transform-origin: center; }
    .qd-shake-heavy  { animation: qdShakeHeavy  500ms ease-out; transform-origin: center; }
    @keyframes qdShakeWeak {
      0%,100% { transform: translate(0,0) rotate(0); }
      10% { transform: translate(-3px, 1px) rotate(-0.5deg); }
      20% { transform: translate(3px, -1px) rotate(0.5deg); }
      30% { transform: translate(-2px, 2px) rotate(-0.4deg); }
      40% { transform: translate(2px, -2px) rotate(0.4deg); }
      50% { transform: translate(-2px, 1px) rotate(-0.3deg); }
      60% { transform: translate(2px, -1px) rotate(0.3deg); }
      70% { transform: translate(-1px, 1px) rotate(-0.2deg); }
      80% { transform: translate(1px, -1px) rotate(0.2deg); }
      90% { transform: translate(-1px, 0) rotate(0); }
    }
    @keyframes qdShakeMed {
      0%,100% { transform: translate(0,0) rotate(0); }
      10% { transform: translate(-6px, 2px) rotate(-1deg); }
      20% { transform: translate(6px, -2px) rotate(1deg); }
      30% { transform: translate(-5px, 3px) rotate(-0.8deg); }
      40% { transform: translate(5px, -3px) rotate(0.8deg); }
      50% { transform: translate(-4px, 2px) rotate(-0.6deg); }
      60% { transform: translate(4px, -2px) rotate(0.6deg); }
      70% { transform: translate(-3px, 1px) rotate(-0.4deg); }
      80% { transform: translate(3px, -1px) rotate(0.4deg); }
      90% { transform: translate(-1px, 0) rotate(0); }
    }
    @keyframes qdShakeHeavy {
      0%,100% { transform: translate(0,0) rotate(0); }
      10% { transform: translate(-12px, 4px) rotate(-2deg); }
      20% { transform: translate(12px, -4px) rotate(2deg); }
      30% { transform: translate(-10px, 5px) rotate(-1.6deg); }
      40% { transform: translate(10px, -5px) rotate(1.6deg); }
      50% { transform: translate(-8px, 3px) rotate(-1.2deg); }
      60% { transform: translate(8px, -3px) rotate(1.2deg); }
      70% { transform: translate(-5px, 2px) rotate(-0.8deg); }
      80% { transform: translate(5px, -2px) rotate(0.8deg); }
      90% { transform: translate(-2px, 0) rotate(0); }
    }

    /* ======================================================================
       Golden pulse — multi-layer glow + subtle breath + ::before radial aura
       ====================================================================== */
    .qd-golden-pulse {
      position: relative;
      animation: qdGoldenPulse 2400ms ease-in-out infinite;
    }
    .qd-golden-pulse::before {
      content: '';
      position: absolute;
      inset: -20%;
      background: radial-gradient(circle, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0) 65%);
      filter: blur(12px);
      z-index: -1;
      pointer-events: none;
      animation: qdGoldenBreath 2400ms ease-in-out infinite;
    }
    @keyframes qdGoldenPulse {
      0%,100% {
        color: #FFD700;
        text-shadow: 0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.4);
        transform: scale(1);
      }
      50% {
        color: #FFF4B8;
        text-shadow: 0 0 28px rgba(255,244,184,0.95), 0 0 56px rgba(245,158,11,0.7), 0 2px 4px rgba(0,0,0,0.4);
        transform: scale(1.015);
      }
    }
    @keyframes qdGoldenBreath {
      0%,100% { opacity: 0.6; }
      50%     { opacity: 1; }
    }

    /* ======================================================================
       Streak flame — double drop-shadow, subtle heat hue-rotate
       ====================================================================== */
    .qd-streak-pulse {
      display: inline-block;
      transform-origin: 50% 60%;
      animation: qdStreakPulse 2400ms ease-in-out infinite;
      will-change: transform, filter;
    }
    @keyframes qdStreakPulse {
      0%,100% {
        transform: scale(1);
        filter: drop-shadow(0 0 8px #FF6B35) drop-shadow(0 0 16px #FFA500) hue-rotate(0deg);
      }
      50% {
        transform: scale(1.15);
        filter: drop-shadow(0 0 12px #FF6B35) drop-shadow(0 0 22px #FFA500) hue-rotate(12deg);
      }
    }

    /* ======================================================================
       Perfect-game backdrop — conic HSL (Safari-safe) + radial mesh depth
       ====================================================================== */
    .qd-perfect-backdrop {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
    }
    .qd-perfect-backdrop .qd-perfect-conic {
      position: absolute;
      inset: -40%;
      background: conic-gradient(
        from 0deg,
        hsl(0, 85%, 60%),
        hsl(60, 85%, 60%),
        hsl(120, 85%, 60%),
        hsl(180, 85%, 60%),
        hsl(240, 85%, 60%),
        hsl(300, 85%, 60%),
        hsl(360, 85%, 60%)
      );
      filter: blur(60px);
      opacity: 0.35;
      animation: qdConicRotate 12s linear infinite;
    }
    .qd-perfect-backdrop .qd-perfect-mesh {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 25% 25%, rgba(255,215,0,0.35), transparent 45%),
        radial-gradient(circle at 75% 20%, rgba(16,185,129,0.3), transparent 45%),
        radial-gradient(circle at 80% 80%, rgba(139,92,246,0.3), transparent 45%),
        radial-gradient(circle at 20% 80%, rgba(59,130,246,0.3), transparent 45%);
      opacity: 0.2;
    }
    @keyframes qdConicRotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ======================================================================
       Match-win aura — inner glow + ring pulse ::before/::after + shockwave
       ====================================================================== */
    .qd-match-aura {
      position: relative;
      box-shadow: inset 0 0 40px rgba(255,215,0,0.4), 0 0 30px rgba(255,215,0,0.5);
    }
    .qd-match-aura::before,
    .qd-match-aura::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      border: 2px solid rgba(255,215,0,0.65);
      pointer-events: none;
      animation: qdAuraRing 2000ms ease-out infinite;
      opacity: 0;
    }
    .qd-match-aura::after { animation-delay: 1000ms; }
    @keyframes qdAuraRing {
      0%   { transform: scale(0.98); opacity: 0.85; }
      80%  { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    .qd-match-shockwave {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(circle, rgba(255,215,0,0.7) 0%, rgba(255,215,0,0.3) 30%, rgba(255,215,0,0) 70%);
      pointer-events: none;
      transform: scale(0);
      opacity: 0.7;
      animation: qdShockwave 700ms ease-out forwards;
    }
    @keyframes qdShockwave {
      0%   { transform: scale(0); opacity: 0.7; }
      100% { transform: scale(3); opacity: 0; }
    }

    /* ======================================================================
       Unlock overlay juice — fullscreen flash + icon spring bounce
       ====================================================================== */
    .qd-unlock-flash {
      position: fixed;
      inset: 0;
      z-index: 9997;
      pointer-events: none;
      background: radial-gradient(circle at center,
        rgba(255,215,0,0.8) 0%,
        rgba(255,193,7,0.3) 40%,
        transparent 70%);
      opacity: 0;
      animation: qdUnlockFlash 700ms ease-out forwards;
    }
    @keyframes qdUnlockFlash {
      0%   { opacity: 0; }
      28%  { opacity: 0.7; }
      100% { opacity: 0; }
    }
    .qd-unlock-bounce {
      display: inline-block;
      animation: qdUnlockBounce 700ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      will-change: transform;
    }
    @keyframes qdUnlockBounce {
      0%   { transform: scale(0) rotate(0deg); }
      30%  { transform: scale(1.3) rotate(-5deg); }
      55%  { transform: scale(0.95) rotate(5deg); }
      80%  { transform: scale(1.05) rotate(-2deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    /* ======================================================================
       Reduced-motion CSS kill-switch — belt-and-suspenders to the JS guards
       ====================================================================== */
    @media (prefers-reduced-motion: reduce) {
      .qd-on-fire,
      .qd-on-fire::before,
      .qd-shake-weak, .qd-shake-medium, .qd-shake-heavy,
      .qd-golden-pulse, .qd-golden-pulse::before,
      .qd-streak-pulse,
      .qd-perfect-backdrop .qd-perfect-conic,
      .qd-match-aura::before, .qd-match-aura::after,
      .qd-match-shockwave,
      .qd-unlock-flash,
      .qd-unlock-bounce {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
      /* Preserve the END state so users still see the reward-signal visuals. */
      .qd-on-fire { opacity: 1; transform: translateX(-50%) scale(1); }
      .qd-golden-pulse {
        color: #FFD700;
        text-shadow: 0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.4);
      }
      .qd-streak-pulse { filter: drop-shadow(0 0 8px #FF6B35) drop-shadow(0 0 16px #FFA500); }
      .qd-unlock-bounce { transform: scale(1) rotate(0deg); }
    }
  `;
  document.head.appendChild(style);
}

// =====================================================================
// Effect 1 — ON FIRE glass badge (streak 3 / 5 / 7)
// =====================================================================
// `root` arg kept for backward-compat with the existing quizHooks call site;
// the badge itself uses fixed positioning so it always lands top-center
// regardless of what `root` is.
export function showOnFire(root, streakCount) {
  injectStyles();
  let key = null, colorCls = '';
  if (streakCount === 3)      { key = 'onFire';       colorCls = 'qd-on-fire-3'; }
  else if (streakCount === 5) { key = 'unstoppable';  colorCls = 'qd-on-fire-5'; }
  else if (streakCount === 7) { key = 'legendary';    colorCls = 'qd-on-fire-7'; }
  if (!key) return;

  debugLog('ON FIRE triggered at streak', streakCount);

  const el = document.createElement('div');
  el.className = `qd-on-fire ${colorCls}`;
  el.textContent = t(key) || key;
  document.body.appendChild(el);
  try { playWhoosh(); } catch (e) { /* ignore */ }

  const totalLifetime = prefersReducedMotion() ? 2500 : 2800;
  setTimeout(() => { try { el.remove(); } catch (e) {} }, totalLifetime);
}

// =====================================================================
// Effect 2 — Confetti (win / record / perfect)
// =====================================================================
// `container` arg is intentionally ignored; canvas-confetti draws on a
// fixed-position, viewport-sized canvas appended to document.body, so parent
// clipping can never hide it.
export function triggerConfetti(container, variant = 'win') {
  injectStyles();
  if (!confettiFn) { debugLog('confetti unavailable — skipping'); return; }
  if (prefersReducedMotion()) { debugLog('confetti skipped (reduced motion)'); return; }
  if (juiceLevel === 'off') { debugLog('confetti skipped (juiceLevel=off)'); return; }
  debugLog('confetti variant', variant);

  if (variant === 'complete') {
    safeConfetti({
      particleCount: scaleCount(60), spread: 75, origin: { y: 0.65 },
      colors: ['#10B981','#FFD700','#FFFFFF'], ticks: scaleTicks(200), startVelocity: 35
    });
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(30), spread: 60, origin: { x: 0.3, y: 0.7 },
      angle: 75, colors: ['#10B981','#FFD700'], startVelocity: 35
    }), 250);
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(30), spread: 60, origin: { x: 0.7, y: 0.7 },
      angle: 105, colors: ['#10B981','#FFD700'], startVelocity: 35
    }), 500);
    return;
  }

  if (variant === 'win') {
    safeConfetti({
      particleCount: scaleCount(80), spread: 70, origin: { y: 0.6 },
      colors: ['#FFD700','#10B981','#FFFFFF'], ticks: scaleTicks(250)
    });
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(50), spread: 100, origin: { x: 0, y: 0.7 },
      angle: 60, colors: ['#FFD700','#F59E0B'], startVelocity: 45
    }), 200);
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(50), spread: 100, origin: { x: 1, y: 0.7 },
      angle: 120, colors: ['#FFD700','#F59E0B'], startVelocity: 45
    }), 400);
    return;
  }

  if (variant === 'record') {
    safeConfetti({
      particleCount: scaleCount(150), spread: 160, origin: { y: 0.3 },
      colors: ['#FFD700','#F59E0B','#FBBF24','#FFFFFF'],
      gravity: 0.65, startVelocity: 40, ticks: scaleTicks(300)
    });
    return;
  }

  if (variant === 'perfect') {
    safeConfetti({
      particleCount: scaleCount(200), spread: 360, origin: { x: 0.5, y: 0.5 },
      colors: ['#FF006E','#FB5607','#FFBE0B','#8338EC','#3A86FF','#06FFA5'],
      startVelocity: 35, ticks: scaleTicks(250)
    });
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(80), spread: 90, origin: { x: 0, y: 0.6 },
      angle: 60, colors: ['#FFBE0B','#FB5607']
    }), 400);
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(80), spread: 90, origin: { x: 1, y: 0.6 },
      angle: 120, colors: ['#8338EC','#3A86FF']
    }), 800);
    setTimeout(() => safeConfetti({
      particleCount: scaleCount(100), spread: 180, origin: { y: 0.3 },
      shapes: ['star'], colors: ['#FFD700','#FFFFFF'], scalar: 1.2
    }), 1200);
    return;
  }
}

// =====================================================================
// Effect 3 — Screen shake (weak / medium / heavy)
// =====================================================================
export function screenShake(el, strength = 'medium') {
  if (!el) return;
  injectStyles();
  if (prefersReducedMotion()) return;
  const cls = strength === 'weak'  ? 'qd-shake-weak'
           : strength === 'heavy' ? 'qd-shake-heavy'
           : 'qd-shake-medium';
  // Remove any in-flight shake class first so we restart cleanly.
  el.classList.remove('qd-shake-weak', 'qd-shake-medium', 'qd-shake-heavy');
  // Force reflow so the removed-then-added animation restarts.
  // eslint-disable-next-line no-unused-expressions
  el.offsetWidth;
  el.classList.add(cls);
  const onEnd = () => { el.classList.remove(cls); el.removeEventListener('animationend', onEnd); };
  el.addEventListener('animationend', onEnd);
  // Safety fallback in case animationend doesn't fire.
  setTimeout(onEnd, 600);
}

// =====================================================================
// Effect 4 — Golden pulse (infinite on target)
// =====================================================================
export function goldenPulse(el) {
  if (!el) return;
  injectStyles();
  if (el.dataset.qdGolden === '1') return;
  el.dataset.qdGolden = '1';
  el.classList.add('qd-golden-pulse');
}

// =====================================================================
// Effect 5 — Streak flame pulse (infinite on flame element)
// =====================================================================
export function pulseStreakFlame(flameEl) {
  if (!flameEl) return;
  injectStyles();
  if (flameEl.dataset.qdFlame === '1') return;
  flameEl.dataset.qdFlame = '1';
  flameEl.classList.add('qd-streak-pulse');
}

// =====================================================================
// Effect 6 — Perfect-game backdrop (conic HSL + radial mesh)
// =====================================================================
export function perfectGameBackdrop(root) {
  if (!root) return;
  injectStyles();
  if (root.dataset.qdPerfect === '1') return;
  root.dataset.qdPerfect = '1';
  // Ensure positioning context without clobbering existing relative.
  try {
    const pos = getComputedStyle(root).position;
    if (pos === 'static' || !pos) root.style.position = 'relative';
  } catch (e) { /* ignore */ }

  const backdrop = document.createElement('div');
  backdrop.className = 'qd-perfect-backdrop';
  const conic = document.createElement('div');
  conic.className = 'qd-perfect-conic';
  const mesh = document.createElement('div');
  mesh.className = 'qd-perfect-mesh';
  backdrop.appendChild(conic);
  backdrop.appendChild(mesh);
  // Insert as first child so it sits behind everything else.
  if (root.firstChild) root.insertBefore(backdrop, root.firstChild);
  else root.appendChild(backdrop);
}

// =====================================================================
// Effect 7 — Match-win aura (inner glow + ring pulse + one-shot shockwave)
// =====================================================================
export function matchWinAura(el) {
  if (!el) return;
  injectStyles();
  if (el.dataset.qdAura === '1') return;
  el.dataset.qdAura = '1';
  try {
    const pos = getComputedStyle(el).position;
    if (pos === 'static' || !pos) el.style.position = 'relative';
  } catch (e) { /* ignore */ }
  el.classList.add('qd-match-aura');

  if (prefersReducedMotion()) return; // static glow only

  const shock = document.createElement('div');
  shock.className = 'qd-match-shockwave';
  el.appendChild(shock);
  setTimeout(() => { try { shock.remove(); } catch (e) {} }, 720);
}

// =====================================================================
// Unlock overlay helpers (called from unlockOverlay.js)
// =====================================================================
export function unlockGoldenFlash() {
  injectStyles();
  if (prefersReducedMotion()) return;
  const flash = document.createElement('div');
  flash.className = 'qd-unlock-flash';
  document.body.appendChild(flash);
  setTimeout(() => { try { flash.remove(); } catch (e) {} }, 750);
}

export function unlockParticleBurst() {
  injectStyles();
  if (juiceLevel === 'off') return;
  safeConfetti({
    particleCount: scaleCount(100),
    spread: 360,
    origin: { x: 0.5, y: 0.5 },
    startVelocity: 30,
    gravity: 0.3,
    ticks: scaleTicks(200),
    colors: ['#FFD700','#FFA500','#FF6B35','#F59E0B','#FFFFFF'],
    shapes: ['circle','star']
  });
}

export function unlockLevelBounce(el) {
  if (!el) return;
  injectStyles();
  if (prefersReducedMotion()) return;
  el.classList.add('qd-unlock-bounce');
}
