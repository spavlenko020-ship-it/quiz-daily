// Stage 7.5 — mobile-only CSS overrides + the canonical class-name registry
// shared with the rest of the app.
//
// `screens.js` (LOCKED) defines the quiz/finish DOM structure. We mirror its
// class names here once so every non-screens module (mobileOverrides,
// screenTransition MutationObserver, safety-net querySelector) reads from a
// single source of truth — if screens.js ever changes a class, only this
// file needs an update.

export const QUIZ_CLASSES = {
  quizRoot:      'qd-root',               // quiz play-screen root
  question:      'qd-question',           // question text block
  answer:        'qd-answer',              // answer <button>
  answerText:    'qd-answer-text',        // label span inside answer
  finishRoot:    'qd-finish',              // finish-screen root
  finishScore:   'qd-finish-score-big',    // big score number
  finishButton:  'qd-btn-primary-hero',    // Keep Playing (finish primary)
  matchResultRoot: 'qd-matchresult'        // match result root
};

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
    .${QUIZ_CLASSES.question} {
      font-size: 1.45rem !important;
      line-height: 1.4 !important;
      font-weight: 600 !important;
    }
    .${QUIZ_CLASSES.answer} {
      min-height: 62px !important;
      padding: 16px 18px !important;
    }
    .${QUIZ_CLASSES.answerText} {
      font-size: 1.18rem !important;
      line-height: 1.35 !important;
      font-weight: 600 !important;
    }
    .${QUIZ_CLASSES.finishScore} {
      font-size: 3rem !important;
      font-weight: 800 !important;
    }
  `;
  document.head.appendChild(style);
}
