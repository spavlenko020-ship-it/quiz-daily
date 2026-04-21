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

// Inline SVG crossed-swords rendered in warm gold to match the royal-purple
// palette. ~1.8× the original ⚔ emoji size (28 px intrinsic vs. ~16 px emoji).
const CROSSED_SWORDS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="#F4E4BC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:0.5em;filter:drop-shadow(0 0 6px rgba(212,175,55,0.55));">
  <path d="M4 4 L20 20" />
  <path d="M28 4 L12 20" />
  <path d="M3 5 L5 3" />
  <path d="M29 5 L27 3" />
  <path d="M18 22 L22 22 L22 26 L18 26 Z" />
  <path d="M10 22 L14 22 L14 26 L10 26 Z" />
  <circle cx="20" cy="28" r="1.2" fill="#D4AF37" />
  <circle cx="12" cy="28" r="1.2" fill="#D4AF37" />
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
