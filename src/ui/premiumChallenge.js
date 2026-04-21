// Stage 7.9 — Premium royal-purple restyle for the Виклик другу button on the
// Result screen. screens.js is LOCKED, so we override its inline styles with
// an !important stylesheet. A MutationObserver handles the emoji→SVG icon
// swap on every Result-screen remount.

export function injectPremiumChallengeStyles() {
  if (document.getElementById('premium-challenge-styles')) return;
  const style = document.createElement('style');
  style.id = 'premium-challenge-styles';
  style.textContent = `
    /* Selector list covers the actual screens.js class (.qd-btn-viral-primary)
       plus three generic fallbacks that future refactors may use. */
    .qd-btn-viral-primary,
    .qd-challenge-btn,
    .challenge-friend-btn,
    button[data-qd-challenge="1"] {
      background: linear-gradient(135deg, #2a1a5c 0%, #4a2d8f 50%, #2a1a5c 100%) !important;
      border: 1.5px solid rgba(212, 175, 55, 0.55) !important;
      color: #F4E4BC !important;
      text-shadow: 0 1px 0 rgba(0,0,0,0.35) !important;
      box-shadow:
        0 4px 0 #1a0f3d,
        0 8px 28px rgba(74, 45, 143, 0.45),
        inset 0 1px 0 rgba(244, 228, 188, 0.15) !important;
      animation: qdChallengePulse 2.6s ease-in-out infinite !important;
    }
    @keyframes qdChallengePulse {
      0%, 100% {
        box-shadow:
          0 4px 0 #1a0f3d,
          0 8px 28px rgba(74, 45, 143, 0.45),
          inset 0 1px 0 rgba(244, 228, 188, 0.15);
      }
      50% {
        box-shadow:
          0 4px 0 #1a0f3d,
          0 12px 44px rgba(212, 175, 55, 0.35),
          inset 0 1px 0 rgba(244, 228, 188, 0.25);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .qd-btn-viral-primary,
      .qd-challenge-btn,
      .challenge-friend-btn,
      button[data-qd-challenge="1"] {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// Stage 7.9b — filled laurel-wreath + central sword emblem in gold gradient.
// 40×40 intrinsic, two linearGradients (gold + blade), drop-shadow for depth.
// Replaces the prior outline-only 28×28 wireframe which rendered as a
// "scribble" on OLED mobile.
const CROSSED_SWORDS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:0.6em;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(212,175,55,0.6));">
  <defs>
    <linearGradient id="qdGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE89A"/>
      <stop offset="45%" stop-color="#F4C842"/>
      <stop offset="100%" stop-color="#B8860B"/>
    </linearGradient>
    <linearGradient id="qdBladeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFBE8"/>
      <stop offset="50%" stop-color="#E8D77A"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
  </defs>
  <!-- Laurel wreath left -->
  <path d="M 10 24 Q 6 16, 10 10 Q 14 14, 14 20 Q 14 25, 10 24 Z M 8 30 Q 5 26, 6 20 Q 10 23, 12 27 Q 12 31, 8 30 Z M 9 37 Q 7 33, 8 28 Q 12 31, 13 35 Q 13 39, 9 37 Z" fill="url(#qdGoldGrad)" opacity="0.95"/>
  <!-- Laurel wreath right (mirror) -->
  <path d="M 38 24 Q 42 16, 38 10 Q 34 14, 34 20 Q 34 25, 38 24 Z M 40 30 Q 43 26, 42 20 Q 38 23, 36 27 Q 36 31, 40 30 Z M 39 37 Q 41 33, 40 28 Q 36 31, 35 35 Q 35 39, 39 37 Z" fill="url(#qdGoldGrad)" opacity="0.95"/>
  <!-- Sword blade (vertical, centered) -->
  <path d="M 24 6 L 26 8 L 26 32 L 24 34 L 22 32 L 22 8 Z" fill="url(#qdBladeGrad)"/>
  <!-- Sword cross-guard -->
  <rect x="16" y="32" width="16" height="3" rx="1" fill="url(#qdGoldGrad)"/>
  <!-- Sword handle/grip -->
  <rect x="22.5" y="35" width="3" height="7" rx="0.8" fill="#4a2d8f"/>
  <rect x="22.5" y="35" width="3" height="7" rx="0.8" fill="url(#qdGoldGrad)" opacity="0.3"/>
  <!-- Pommel (ball at bottom of handle) -->
  <circle cx="24" cy="43" r="2.3" fill="url(#qdGoldGrad)"/>
  <!-- Pommel highlight -->
  <circle cx="23.3" cy="42.3" r="0.7" fill="#FFE89A" opacity="0.8"/>
  <!-- Blade highlight (subtle vertical light line) -->
  <rect x="23.6" y="8" width="0.8" height="24" fill="#FFFFFF" opacity="0.55"/>
</svg>
`.trim();

function swapChallengeEmoji() {
  const buttons = document.querySelectorAll(
    '.qd-btn-viral-primary, .qd-challenge-btn, .challenge-friend-btn, button[data-qd-challenge="1"]'
  );
  buttons.forEach((btn) => {
    if (btn.dataset.qdIconSwapped === '1') return;
    const html = btn.innerHTML;
    const swapped = html.replace(/⚔️?/, CROSSED_SWORDS_SVG);
    if (swapped !== html) {
      btn.innerHTML = swapped;
      btn.dataset.qdIconSwapped = '1';
    }
  });
}

export function startChallengeIconObserver() {
  // Run once on load, then observe #app for re-renders (Result screen remounts).
  swapChallengeEmoji();
  const target = document.getElementById('app') || document.body;
  const obs = new MutationObserver(() => swapChallengeEmoji());
  obs.observe(target, { childList: true, subtree: true });
}
