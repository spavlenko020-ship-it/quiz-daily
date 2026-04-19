import { renderPowerupBar } from './powerupBar.js';
import { getLevelFromXP, getXP } from '../game/stats.js';

// Observes the quiz host element. Whenever `renderQuizScreen` (or the match
// quiz wrapper) rebuilds the per-question DOM, we detect the freshly inserted
// `.qd-timer-track` and inject the powerup bar right after it. The answer
// buttons are tagged via `data-idx` — when 50/50 fires we read the correct
// index from the Quiz instance and fade out two random wrong buttons.

function hidePairOfWrongButtons(root, correctIdx) {
  const buttons = Array.from(root.querySelectorAll('button.qd-answer'));
  if (!buttons.length) return;
  const wrongs = buttons.filter(b => {
    const idx = parseInt(b.dataset.idx, 10);
    return idx !== correctIdx;
  });
  if (wrongs.length <= 1) return;
  // Shuffle and pick 2 to hide.
  for (let i = wrongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongs[i], wrongs[j]] = [wrongs[j], wrongs[i]];
  }
  const toHide = wrongs.slice(0, 2);
  for (const b of toHide) {
    b.style.transition = 'opacity 250ms ease, transform 250ms ease';
    b.style.opacity = '0';
    b.style.transform = 'scale(0.96)';
    b.style.pointerEvents = 'none';
    b.disabled = true;
    b.setAttribute('aria-hidden', 'true');
    setTimeout(() => { b.style.visibility = 'hidden'; }, 260);
  }
}

export function attachPowerupBar(quizScreenRoot, quizInstance, platformCtx) {
  if (!quizScreenRoot || !quizInstance) return { detach: () => {} };
  const level = getLevelFromXP(getXP());

  function injectBarForCurrentQuestion() {
    // Avoid double-injection if already present.
    const existingBar = quizScreenRoot.querySelector('.qd-pwrbar');
    if (existingBar) return;

    const timerTrack = quizScreenRoot.querySelector('.qd-timer-track');
    if (!timerTrack) return;

    // Host = a new div inserted directly after the timer track.
    const host = document.createElement('div');
    host.className = 'qd-pwrbar-host';
    timerTrack.parentNode.insertBefore(host, timerTrack.nextSibling);

    renderPowerupBar(host, {
      level,
      coins: undefined, // read live inside popup via getCoins()
      platform: platformCtx,
      onUsed: () => {
        // Fade 2 wrong answer buttons based on the Quiz's currentQuestion.
        const q = quizInstance.currentQuestion;
        if (!q) return;
        hidePairOfWrongButtons(quizScreenRoot, q.correct);
      }
    });
  }

  // Initial try — the first question might already be rendered.
  injectBarForCurrentQuestion();

  const mo = new MutationObserver(() => {
    // The screens.js `advance()` wipes `container.innerHTML` and re-renders,
    // so we get a burst of childList mutations each question transition. Debounce
    // via a single microtask: re-check if timer-track exists and no bar yet.
    if (!quizScreenRoot.querySelector('.qd-pwrbar') &&
         quizScreenRoot.querySelector('.qd-timer-track')) {
      injectBarForCurrentQuestion();
    }
  });
  mo.observe(quizScreenRoot, { childList: true, subtree: true });

  return {
    detach: () => { try { mo.disconnect(); } catch (e) {} }
  };
}

// --- Pro Badge decorator for Result screens ---
// Wraps the existing big-score element with a golden-glow border + "PRO" emblem.
// Non-destructive: returns early if target element not found.
export function applyProBadgeToScore(root, tText = 'PRO') {
  if (!root) return false;
  const scoreEl = root.querySelector('.qd-finish-score-big, .qd-matchresult-card-score');
  if (!scoreEl) return false;
  if (scoreEl.dataset.proBadged === '1') return true;
  scoreEl.dataset.proBadged = '1';
  // Non-destructive wrap: add styles + sibling emblem, no DOM restructure.
  scoreEl.style.position = 'relative';
  scoreEl.style.padding = (scoreEl.style.padding || '') + ' 0 0';
  scoreEl.style.background = 'linear-gradient(180deg, rgba(245,180,66,0.08), rgba(245,180,66,0.14))';
  scoreEl.style.borderRadius = '16px';
  scoreEl.style.boxShadow = '0 0 24px rgba(245,180,66,0.45), inset 0 0 0 2px rgba(245,180,66,0.55)';
  const emblem = document.createElement('div');
  emblem.textContent = tText;
  emblem.style.cssText = `
    position: absolute; top: -10px; right: -6px;
    background: linear-gradient(135deg, #F5B342, #FFD36B);
    color: #3A1A00;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 800;
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    padding: 3px 8px;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(245,180,66,0.55);
    pointer-events: none;
  `;
  scoreEl.appendChild(emblem);
  return true;
}
