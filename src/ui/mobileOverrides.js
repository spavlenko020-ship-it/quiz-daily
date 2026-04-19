// Stage 7.4c — mobile-only CSS overrides bumping font sizes + tap-target
// height on real mobile user-agents. Imported synchronously at the top of
// main.js so the stylesheet is in the cascade before any screen renders —
// no flash-of-small-text. Desktop path is a silent no-op (the only work is
// a UA regex check that matches `false`).
//
// Selectors are the REAL class names from src/game/screens.js:
//   .qd-question            — question text element
//   .qd-answer              — answer button (min-height matters for thumbs)
//   .qd-answer-text         — label span inside the button
//   .qd-finish-score-big    — big score number on Result

const STYLE_ID = 'qd-mobile-overrides';

const isMobile = typeof navigator !== 'undefined'
  && /Android|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent);

export function injectMobileOverrides() {
  if (!isMobile) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-question { font-size: 1.22rem !important; line-height: 1.38 !important; }
    .qd-answer {
      min-height: 56px !important;
      padding: 14px 16px !important;
    }
    .qd-answer-text { font-size: 1.06rem !important; line-height: 1.3 !important; }
    .qd-finish-score-big { font-size: 5rem !important; }
  `;
  document.head.appendChild(style);
}
