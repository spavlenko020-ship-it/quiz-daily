// Stage 7.5 — lightweight 200ms fade-in + translateY on screen roots.
// Two entry points:
//   (a) `markAsScreen(el)` — direct call from editable screen mounts
//       (home.js, matchResult.js, matchQuiz.js, onboarding.js).
//   (b) Scoped MutationObserver watching for root-class additions so
//       LOCKED screens.js (which we can't edit) also gets the effect.
//
// The observer is INTENTIONALLY strict: it only reacts to newly added
// elements whose class matches a known screen root, and it watches
// `#app` with `subtree:false` so tap-fires inside screens (toasts,
// modals, answer buttons) never trigger.

import { QUIZ_CLASSES } from './mobileOverrides.js';

const STYLE_ID = 'qd-screen-transition';

export function injectTransitionStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes qdScreenFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    [data-qd-screen="1"] {
      animation: qdScreenFadeIn 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      [data-qd-screen="1"] { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

export function markAsScreen(el) {
  if (!el || el.nodeType !== 1) return;
  el.setAttribute('data-qd-screen', '1');
  // z-index defense — keeps screen above any residual overlay (old Monetag,
  // toast stragglers). Idempotent — only set if caller hasn't already.
  if (!el.style.position) el.style.position = 'relative';
  if (!el.style.zIndex) el.style.zIndex = '100';
}

let observerStarted = false;
export function startScreenObserver() {
  if (observerStarted) return;
  if (typeof MutationObserver === 'undefined') return;
  const app = document.getElementById('app');
  if (!app) return;
  observerStarted = true;

  // Screens we're interested in — both quiz-play and finish from the locked
  // screens.js, plus match-result as a defensive duplicate (direct
  // markAsScreen call in matchResult.js will short-circuit idempotently).
  const rootClasses = [
    QUIZ_CLASSES.quizRoot,
    QUIZ_CLASSES.finishRoot,
    QUIZ_CLASSES.matchResultRoot
  ];

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (!n.classList) continue;
        for (const cls of rootClasses) {
          if (n.classList.contains(cls)) {
            markAsScreen(n);
            break;
          }
        }
      }
    }
  });
  // subtree:false — only direct children of #app. Prevents observer storms
  // from answer buttons, toasts, powerup bar, etc.
  mo.observe(app, { childList: true, subtree: false });
}
