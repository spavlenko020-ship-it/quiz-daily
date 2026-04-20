import { questions as allQuestions } from './questions.js';
import { renderQuizScreen } from './screens.js';
import { getLanguage } from '../i18n/i18n.js';
import { playClick } from '../ui/sounds.js';
import { attachPowerupBar } from '../ui/quizHooks.js';
import { markAsScreen } from '../ui/screenTransition.js';

const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.25, hard: 1.5 };
const STYLE_ID = 'qd-match-quiz-styles';

function injectMatchQuizStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-match-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      position: relative;
    }
    .qd-match-topbadge {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px max(16px, env(safe-area-inset-left, 0px)) 8px max(16px, env(safe-area-inset-left, 0px));
      padding-top: calc(max(8px, env(safe-area-inset-top, 0px)) + 4px);
      font-size: 0.82rem;
      color: rgba(255,255,255,0.92);
      background: linear-gradient(135deg, rgba(79,70,229,0.22), rgba(124,58,237,0.22));
      border-bottom: 1px solid rgba(124,58,237,0.4);
      font-weight: 600;
      letter-spacing: 0.02em;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      flex-shrink: 0;
    }
    .qd-match-topbadge .qd-match-back-btn {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.85);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 2px 6px;
      line-height: 1;
      border-radius: 6px;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .qd-match-topbadge .qd-match-back-btn:hover { background: rgba(255,255,255,0.08); }
    .qd-match-topbadge .qd-match-vs { flex: 1; display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
    .qd-match-topbadge .qd-match-vs-swords { font-size: 0.95rem; line-height: 1; }
    .qd-match-topbadge .qd-match-vs-name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
    }
    .qd-match-quiz-host { flex: 1; display: flex; flex-direction: column; }
  `;
  document.head.appendChild(style);
}

class MatchQuizAdapter {
  constructor(match, lang) {
    this._lang = lang;
    const byId = new Map(allQuestions.map(q => [q.id, q]));
    this._raw = (match.questions || []).map(id => byId.get(id)).filter(Boolean);
    this._index = 0;
    this._score = 0;
    this._correctCount = 0;
    this._history = [];
    this._currentCorrectStreak = 0;
  }

  _localized(raw) {
    const lang = this._lang;
    const fallback = 'en';
    const qObj = raw.q || {};
    const aObj = raw.a || {};
    return {
      q: qObj[lang] || qObj[fallback] || '',
      a: (aObj[lang] || aObj[fallback] || []).slice(),
      correct: raw.correct,
      difficulty: raw.difficulty,
      segmentDifficulty: raw.difficulty || 'easy'
    };
  }

  get currentQuestion() {
    if (this.isDone) return null;
    return this._localized(this._raw[this._index]);
  }
  get questionIndex() { return this._index; }
  get totalQuestions() { return this._raw.length; }
  get score() { return this._score; }
  get correctCount() { return this._correctCount; }
  get isDone() { return this._index >= this._raw.length; }
  get answerHistory() { return this._history; }
  get currentCorrectStreak() { return this._currentCorrectStreak; }

  answer(choiceIndex, secondsRemaining) {
    if (this.isDone) throw new Error('Match quiz is already done');
    const raw = this._raw[this._index];
    const q = this._localized(raw);
    const timeLeft = Math.max(0, Math.min(10, secondsRemaining));
    const isCorrect = choiceIndex === q.correct && choiceIndex !== -1;
    const base = 10 + Math.round(timeLeft * 4);
    const multiplier = DIFFICULTY_MULTIPLIER[q.segmentDifficulty] || 1;
    const points = isCorrect ? Math.round(base * multiplier) : 0;

    this._score += points;
    if (isCorrect) {
      this._correctCount += 1;
      this._currentCorrectStreak += 1;
    } else {
      this._currentCorrectStreak = 0;
    }

    this._history.push({
      q: q.q, a: q.a.slice(), correct: q.correct, chosen: choiceIndex,
      isCorrect, timeLeft, points, segmentDifficulty: q.segmentDifficulty
    });

    this._index += 1;

    return {
      isCorrect,
      correctIndex: q.correct,
      pointsEarned: points,
      pointsBase: base,
      multiplier,
      segmentDifficulty: q.segmentDifficulty,
      currentCorrectStreak: this._currentCorrectStreak
    };
  }
}

export function renderMatchQuizScreen(container, match, platform, callbacks = {}) {
  injectMatchQuizStyles();
  const { onComplete, onAbort } = callbacks;

  container.innerHTML = '';
  container.style.background = 'transparent';

  const wrapper = document.createElement('div');
  wrapper.className = 'qd-match-wrapper';
  markAsScreen(wrapper);

  // Match banner — persists across question re-renders because renderQuizScreen
  // only wipes its own host element (not our wrapper).
  const banner = document.createElement('div');
  banner.className = 'qd-match-topbadge';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'qd-match-back-btn';
  backBtn.textContent = '←';
  backBtn.setAttribute('aria-label', 'Back');
  backBtn.addEventListener('click', () => {
    playClick();
    try { platform && platform.tgDisableCloseConfirm && platform.tgDisableCloseConfirm(); } catch (e) {}
    if (onAbort) onAbort();
  });
  banner.appendChild(backBtn);

  const vs = document.createElement('div');
  vs.className = 'qd-match-vs';
  const swords = document.createElement('span');
  swords.className = 'qd-match-vs-swords';
  swords.textContent = '⚔️';
  const name = document.createElement('span');
  name.className = 'qd-match-vs-name';
  const oppName = (match && match.opponent && match.opponent.name) ? match.opponent.name : '—';
  name.textContent = `vs ${oppName}`;
  vs.appendChild(swords);
  vs.appendChild(name);
  banner.appendChild(vs);

  wrapper.appendChild(banner);

  const host = document.createElement('div');
  host.className = 'qd-match-quiz-host';
  wrapper.appendChild(host);

  container.appendChild(wrapper);

  const adapter = new MatchQuizAdapter(match, getLanguage());
  // Hook powerup bar (50/50 + free daily) — same MutationObserver-based
  // helper that the solo flow uses; adapter duck-types the Quiz interface.
  const powerupHandle = attachPowerupBar(host, adapter, platform);

  // Stage 7.4a: Telegram-only close confirmation while in match gameplay.
  // Optional-chain on the method so facebook.js / web.js (which don't define
  // it) are silent no-ops — zero branching required.
  try { platform && platform.tgEnableCloseConfirm && platform.tgEnableCloseConfirm(); } catch (e) {}

  renderQuizScreen(host, adapter, () => {
    if (powerupHandle && typeof powerupHandle.detach === 'function') powerupHandle.detach();
    try { platform && platform.tgDisableCloseConfirm && platform.tgDisableCloseConfirm(); } catch (e) {}
    if (onComplete) onComplete(adapter.score, adapter.correctCount, adapter.answerHistory);
  });
}
