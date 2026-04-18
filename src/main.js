import { Quiz } from './game/quiz.js';
import { renderQuizScreen, renderFinishScreen } from './game/screens.js';
import { renderHomeScreen } from './game/home.js';
import { setBestScoreIfHigher, recordPlay, saveDailyResult, getDailyResult, isDailyCompletedToday, addXP, addCoins, computeGameRewards, getXPProgressInLevel, getXP } from './game/stats.js';
import { initLanguage, getLanguage, t } from './i18n/i18n.js';
import { formatStreakDays } from './i18n/plural.js';
import { renderLangSwitcher } from './ui/langSwitcher.js';
import { initAudio } from './ui/sounds.js';
import { renderSoundToggle } from './ui/soundToggle.js';
import { renderBackground } from './ui/background.js';

let app;
let platform;

async function detectPlatform() {
  if (typeof FBInstant === 'undefined') {
    const m = await import('./platform/web.js');
    return m.default;
  }
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('FBInstant init timeout')), 3000)
  );
  try {
    await Promise.race([FBInstant.initializeAsync(), timeout]);
    const m = await import('./platform/facebook.js');
    return m.default;
  } catch (e) {
    console.warn('[platform] FB detection failed, using web fallback:', e && e.message);
    const m = await import('./platform/web.js');
    return m.default;
  }
}

function buildEmojiGrid(history) {
  return history.map(h => h.isCorrect ? '🟩' : '🟥').join('');
}

function buildShareText(score, correct, total, history, streak, lang) {
  const EPOCH = new Date(2026, 0, 1).getTime();
  const today = new Date();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const quizNumber = Math.floor((todayMs - EPOCH) / (1000 * 60 * 60 * 24)) + 1;

  const grid = buildEmojiGrid(history);
  const accuracy = Math.round((correct / total) * 100);
  const url = window.location.href.split('?')[0];

  const texts = {
    en: {
      title: `📚 Daily Quiz #${quizNumber} — ${correct}/${total}`,
      points: `⭐ ${score} points · ${accuracy}% accuracy`,
      streak: streak > 0 ? `🔥 ${streak} day streak` : ''
    },
    uk: {
      title: `📚 Щоденний Квіз #${quizNumber} — ${correct}/${total}`,
      points: `⭐ ${score} очок · ${accuracy}% точність`,
      streak: streak > 0 ? `🔥 Серія ${formatStreakDays(streak, 'uk')}` : ''
    },
    no: {
      title: `📚 Daglig Quiz #${quizNumber} — ${correct}/${total}`,
      points: `⭐ ${score} poeng · ${accuracy}% nøyaktighet`,
      streak: streak > 0 ? `🔥 ${streak} dagers streak` : ''
    }
  };
  const tx = texts[lang] || texts.en;

  const lines = [tx.title, '', grid, '', tx.points];
  if (tx.streak) lines.push(tx.streak);
  lines.push('');
  lines.push(url);

  return lines.join('\n');
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function shareScore(score, correct, history) {
  const total = 12;
  const lang = getLanguage();
  const streakRaw = localStorage.getItem('quiz_daily_streak');
  const streak = streakRaw ? parseInt(streakRaw, 10) : 0;
  const text = buildShareText(score, correct, total, history || [], streak, lang);

  if (isMobile() && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) { /* user canceled, fall through */ }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('scoreCopied'));
    } catch (e) {
      console.error('clipboard failed', e);
    }
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: rgba(123,47,247,0.95); backdrop-filter: blur(12px);
    color: white; padding: 14px 26px; border-radius: 999px;
    font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
    box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 24px rgba(123,47,247,0.4);
    border: 1px solid rgba(255,255,255,0.15);
    z-index: 9999; letter-spacing: 0.3px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Incoming challenge state — URL param only, does NOT persist across reload
let incomingChallenge = null;

function parseIncomingChallenge() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = parseInt(params.get('challenge'), 10);
    incomingChallenge = Number.isFinite(raw) && raw > 0 ? raw : null;
  } catch (e) { incomingChallenge = null; }
}

async function onChallengeClick(score) {
  const base = window.location.origin + window.location.pathname;
  const challengeUrl = `${base}?challenge=${score}`;
  const msg = t('challengeMessage', { score, url: challengeUrl });
  const res = await platform.shareResult({ text: msg });
  if (res && res.via === 'clipboard') showToast(t('toastChallengeCopied'));
}

function showHome(fromGame = false) {
  if (fromGame) sessionStorage.setItem('quiz_returned_home', '1');
  app.innerHTML = '';
  const showBanner = typeof incomingChallenge === 'number' && incomingChallenge > 0;
  renderHomeScreen(app, {
    onPlayDaily: () => startGame(true),
    onPlayQuick: () => startGame(false),
    onViewDailyResult: () => showStoredDailyResult(),
    hasChallenge: showBanner,
    incomingChallenge: showBanner ? incomingChallenge : null
  });
}

function startGame(isDaily) {
  if (isDaily && isDailyCompletedToday()) {
    showStoredDailyResult();
    return;
  }
  // Snapshot challenge target at session start — completing the session clears it
  // so the banner disappears on return to home.
  const activeChallenge = (!isDaily && typeof incomingChallenge === 'number' && incomingChallenge > 0)
    ? incomingChallenge
    : null;
  const seed = isDaily ? platform.getDailyChallengeSeed() : null;
  const quiz = new Quiz(seed, getLanguage());
  app.innerHTML = '';
  renderQuizScreen(app, quiz, () => {
    const bestResult = setBestScoreIfHigher(quiz.score);
    const streakResult = isDaily ? recordPlay() : null;
    if (isDaily) saveDailyResult(quiz);

    const rewards = computeGameRewards(quiz.correctCount, quiz.totalQuestions);
    const prevXP = getXP();
    const prevXpPercent = getXPProgressInLevel(prevXP).percent;
    const xpResult = addXP(rewards.xp);
    const newXpPercent = getXPProgressInLevel(xpResult.newTotal).percent;
    addCoins(rewards.coins);

    // Consume the challenge — one play-through per incoming URL.
    if (activeChallenge) {
      incomingChallenge = null;
    }

    app.innerHTML = '';
    renderFinishScreen(app, quiz, {
      onPlayAgain: () => showHome(true),
      onShare: (score, correct) => shareScore(score, correct, quiz.answerHistory),
      onChallenge: (score) => onChallengeClick(score),
      onKeepPlaying: () => startGame(false),
      bestResult,
      streakResult,
      isDaily,
      challengeTarget: activeChallenge,
      xpEarned: rewards.xp,
      coinsEarned: rewards.coins,
      leveledUp: xpResult.leveledUp,
      prevLevel: xpResult.prevLevel,
      newLevel: xpResult.newLevel,
      prevXpPercent,
      newXpPercent: xpResult.leveledUp ? 100 : newXpPercent
    });
  });
}

function showStoredDailyResult() {
  const stored = getDailyResult();
  if (!stored) {
    showHome();
    return;
  }
  const mockQuiz = {
    score: stored.score,
    correctCount: stored.correct,
    totalQuestions: 12,
    answerHistory: stored.history || []
  };
  app.innerHTML = '';
  renderFinishScreen(app, mockQuiz, {
    onPlayAgain: () => showHome(true),
    onShare: (score, correct) => shareScore(score, correct, stored.history || []),
    onChallenge: (score) => onChallengeClick(score),
    bestResult: null,
    streakResult: null,
    isDaily: true,
    isReview: true
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initLanguage();
  parseIncomingChallenge();
  renderBackground();
  platform = await detectPlatform();
  await platform.init();
  console.log('[platform] using adapter:', platform.name);
  app = document.querySelector('#app');
  initAudio();
  renderLangSwitcher();
  renderSoundToggle();
  showHome();
});
