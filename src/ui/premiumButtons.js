// Stage 7.5 — opt-in `.qd-premium-btn` class for lightweight press feel.
// Intentionally NOT applied globally — the challenge banner, pulsing CTAs,
// and buttons with existing :active states would lose their custom motion
// if this cascaded over them. Callers opt in by adding the class to simple
// buttons (Home PLAY, Quick Play, onboarding Next, matchResult back link).

const STYLE_ID = 'qd-premium-buttons';

export function injectPremiumButtonStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-premium-btn {
      transition: transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1),
                  filter 120ms ease-out;
      will-change: transform;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .qd-premium-btn:active:not(:disabled) {
      transform: translateY(1px) scale(0.985);
      filter: brightness(0.94);
    }
    @media (prefers-reduced-motion: reduce) {
      .qd-premium-btn { transition: none; }
      .qd-premium-btn:active:not(:disabled) { transform: none; filter: brightness(0.9); }
    }
  `;
  document.head.appendChild(style);
}
