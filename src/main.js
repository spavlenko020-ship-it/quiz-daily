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
import { attachPowerupBar, applyProBadgeToScore } from './ui/quizHooks.js';
import { hasStreakFreeze, hasProBadge, getStreakFreezeAvailable, consumeStreakFreeze } from './game/powerups.js';
import { getLevelFromXP as _getLevelFromXP } from './game/stats.js';

// Streak-Freeze intercept: if the player is about to lose a streak (gap > 1)
// AND has the unlock AND hasn't used their weekly freeze, backdate the
// lastPlayDate to yesterday so stats.recordPlay() sees a continued streak.
// stats.js is untouched — this wraps via localStorage directly.
const LAST_PLAY_KEY = 'quiz_daily_last_play_date';
function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _daysBetweenStrs(a, b) {
  const [y1,m1,d1] = a.split('-').map(Number);
  const [y2,m2,d2] = b.split('-').map(Number);
  const A = new Date(y1, m1-1, d1);
  const B = new Date(y2, m2-1, d2);
  return Math.round((B - A) / 86400000);
}
function maybeApplyStreakFreeze() {
  try {
    const level = _getLevelFromXP(getXP());
    if (!hasStreakFreeze(level) || !getStreakFreezeAvailable()) return false;
    const last = localStorage.getItem(LAST_PLAY_KEY);
    if (!last) return false;
    const today = _todayStr();
    if (_daysBetweenStrs(last, today) <= 1) return false;
    // Freeze: backdate to yesterday so recordPlay treats this as a +1 day continue.
    localStorage.setItem(LAST_PLAY_KEY, _yesterdayStr());
    consumeStreakFreeze();
    return true;
  } catch (e) { return false; }
}

if (import.meta.env.DEV) {
  import('./game/__diag__/matchDiag.js').then(() => {
    console.log('[diag] matchDiag loaded — call window.__matchDiag(window.__platform) in Console to test');
  });
}

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
  const myId = (platform && typeof platform.getPlayerId === 'function')
    ? (platform.getPlayerId() || 'web-dev-player')
    : 'web-dev-player';
  renderHomeScreen(app, {
    onPlayDaily: () => startGame(true),
    onPlayQuick: () => startGame(false),
    onViewDailyResult: () => showStoredDailyResult(),
    onPlayWithFriend: onPlayWithFriendClick,
    loadMatches: async () => {
      try {
        const { loadAllMatches } = await import('./game/matchStore.js');
        return await loadAllMatches(platform);
      } catch (e) {
        console.error('[main] loadAllMatches failed:', e);
        return [];
      }
    },
    onResumeMatch: (match) => navigateToMatch(match),
    onViewAllMatches: () => startMatchesInbox(),
    currentPlayerId: myId,
    hasChallenge: showBanner,
    incomingChallenge: showBanner ? incomingChallenge : null
  });
}

async function startMatchesInbox() {
  try {
    const [{ loadAllMatches }, { renderMatchesInbox }] = await Promise.all([
      import('./game/matchStore.js'),
      import('./game/matchesInbox.js')
    ]);
    const matches = await loadAllMatches(platform);
    const myId = (platform && typeof platform.getPlayerId === 'function')
      ? (platform.getPlayerId() || 'web-dev-player')
      : 'web-dev-player';
    app.innerHTML = '';
    renderMatchesInbox(app, matches, myId, {
      onBack: () => showHome(true),
      onResumeMatch: (m) => navigateToMatch(m)
    });
  } catch (e) {
    console.error('[main] startMatchesInbox failed:', e);
    showHome(true);
  }
}

function navigateToMatch(match) {
  if (!match) return;
  const myId = (platform && typeof platform.getPlayerId === 'function')
    ? (platform.getPlayerId() || 'web-dev-player')
    : 'web-dev-player';
  const slot = typeof match.getPlayerSlot === 'function' ? match.getPlayerSlot(myId) : null;

  if (match.status === 'complete') {
    // Either fresh result (just completed) or revisit — Result screen handles
    // both idempotently via the rewardsClaimed flag.
    startMatchResult(match);
    return;
  }
  if ((match.status === 'pending_a' && slot === 'a')
   || (match.status === 'pending_b' && slot === 'b')) {
    // It's the viewer's turn — open the Lobby so they can hit Start Your Turn.
    startMatchLobby(match);
    return;
  }
  // Otherwise: viewer has already played and is waiting for opponent.
  startMatchWaiting(match);
}

async function onPlayWithFriendClick() {
  if (!platform || typeof platform.chooseFriend !== 'function') {
    showToast(t('matchCancelled'));
    return false;
  }
  const picked = await platform.chooseFriend();
  if (!picked) {
    showToast(t('matchCancelled'));
    return false;
  }
  try {
    const [{ Match }, { questions }, { saveMatch }] = await Promise.all([
      import('./game/match.js'),
      import('./game/questions.js'),
      import('./game/matchStore.js')
    ]);
    const creatorId = (platform && typeof platform.getPlayerId === 'function')
      ? platform.getPlayerId() : null;
    const match = Match.create(picked, questions, creatorId || 'web-dev-player');
    await saveMatch(match, platform);
    await startMatchLobby(match);
    return true;
  } catch (e) {
    console.error('[match] create/save failed:', e);
    showToast(t('matchCancelled'));
    return false;
  }
}

async function startMatchLobby(match) {
  const { renderMatchLobby } = await import('./game/matchLobby.js');
  app.innerHTML = '';
  renderMatchLobby(app, match, platform,
    () => showHome(true),
    () => startMatchQuiz(match)
  );
}

async function startMatchQuiz(match) {
  const { renderMatchQuizScreen } = await import('./game/matchQuiz.js');
  app.innerHTML = '';
  renderMatchQuizScreen(app, match, platform, {
    onComplete: async (finalScore) => {
      const myId = (platform && typeof platform.getPlayerId === 'function')
        ? platform.getPlayerId() : null;
      const resolvedId = myId || match.playerAId || 'web-dev-player';
      match.recordScore(resolvedId, finalScore);
      const { saveMatch } = await import('./game/matchStore.js');
      await saveMatch(match, platform);
      startMatchWaiting(match);
    },
    onAbort: () => startMatchLobby(match)
  });
}

async function startMatchWaiting(match) {
  const { renderMatchWaiting } = await import('./game/matchWaiting.js');
  app.innerHTML = '';
  const waitingCallbacks = { onBackToHome: () => showHome(true) };
  if (import.meta.env.DEV) {
    waitingCallbacks.onSimulateOpponent = async (oppScore) => {
      const oppId = (match.opponent && match.opponent.id) ? match.opponent.id : 'mock-opp-1';
      match.recordScore(oppId, oppScore);
      const { saveMatch } = await import('./game/matchStore.js');
      await saveMatch(match, platform);
      startMatchResult(match);
    };
  }
  renderMatchWaiting(app, match, platform, waitingCallbacks);
}

async function startMatchResult(match) {
  const { renderMatchResult } = await import('./game/matchResult.js');
  const myId = (platform && typeof platform.getPlayerId === 'function')
    ? platform.getPlayerId() : null;
  const resolvedId = myId || match.playerAId || 'web-dev-player';
  app.innerHTML = '';
  renderMatchResult(app, match, resolvedId, platform, {
    onBackToHome: () => showHome(true),
    onChallengeBack: () => startChallengeBack(match),
    onChallengeDifferent: () => startNewMatchFromResult(),
    onShareWin: () => shareMatchWin(match, resolvedId)
  });
}

async function startChallengeBack(oldMatch) {
  try {
    const [{ Match }, { questions }, { saveMatch }, { flushNow }] = await Promise.all([
      import('./game/match.js'),
      import('./game/questions.js'),
      import('./game/matchStore.js'),
      import('./game/persistQueue.js')
    ]);
    // Flush any pending write for the old match before we create a new one.
    await flushNow(platform);
    const creatorId = (platform && typeof platform.getPlayerId === 'function')
      ? platform.getPlayerId() : null;
    // New contextId so the deterministic question picker produces a fresh set.
    // Reuse the same opponent so the CTA label ("Challenge Alice Back") is truthful.
    const seed = Date.now().toString(36);
    const opponentData = {
      contextId: (oldMatch.contextId ? oldMatch.contextId + '-r' + seed : 'rematch-' + seed),
      opponent: oldMatch.opponent || null
    };
    const newMatch = Match.create(opponentData, questions, creatorId || 'web-dev-player');
    await saveMatch(newMatch, platform);
    await startMatchLobby(newMatch);
  } catch (e) {
    console.error('[match] challengeBack failed:', e);
    showToast(t('matchCancelled'));
    showHome(true);
  }
}

async function startNewMatchFromResult() {
  // Same entry point as the Home "Play with Friend" button.
  const ok = await onPlayWithFriendClick();
  if (!ok) showHome(true);
}

async function shareMatchWin(match, myId) {
  try {
    const { flushNow } = await import('./game/persistQueue.js');
    await flushNow(platform);
    const slot = match.getPlayerSlot(myId);
    const myScore = slot === 'a' ? match.playerAScore : match.playerBScore;
    const oppScore = slot === 'a' ? match.playerBScore : match.playerAScore;
    const oppName = (match.opponent && match.opponent.name) ? match.opponent.name : '—';
    const text = t('shareWinText', {
      oppName,
      myScore: myScore != null ? myScore : 0,
      oppScore: oppScore != null ? oppScore : 0
    });
    const res = await platform.shareResult({ text, data: { matchId: match.contextId } });
    if (res && res.via === 'clipboard') showToast(t('scoreCopied'));
  } catch (e) {
    console.error('[match] shareWin failed:', e);
  }
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
  const powerupHandle = attachPowerupBar(app, quiz, platform);
  renderQuizScreen(app, quiz, () => {
    if (powerupHandle && typeof powerupHandle.detach === 'function') powerupHandle.detach();
    const bestResult = setBestScoreIfHigher(quiz.score);
    if (isDaily) maybeApplyStreakFreeze();
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
    // Pro Badge decoration — post-render decorator is safe because
    // renderFinishScreen is synchronous. No-op if the selector is absent.
    if (hasProBadge(xpResult.newLevel || _getLevelFromXP(xpResult.newTotal))) {
      applyProBadgeToScore(app, 'PRO');
    }

    // Stage 7.2 juice — layered on top of the already-rendered Result.
    // Order matters: perfect-game is the biggest payload, then new-best,
    // then the XP level-up confetti already handled by renderFinishScreen
    // internally. Each helper is idempotent and respects reduced-motion.
    (async () => {
      try {
        const { triggerConfetti, goldenPulse, perfectGameBackdrop } =
          await import('./ui/juiceEffects.js');
        const isPerfect = quiz.correctCount === quiz.totalQuestions;
        const isNewBest = bestResult && bestResult.isNew === true;
        const scoreEl = app.querySelector('.qd-finish-score-big');

        if (isPerfect) {
          perfectGameBackdrop(app);
          triggerConfetti(app, 'perfect');
          if (scoreEl) goldenPulse(scoreEl);
        } else if (isNewBest) {
          triggerConfetti(app, 'record');
          if (scoreEl) goldenPulse(scoreEl);
        }
      } catch (e) { /* juice never breaks the flow */ }
    })();
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
  if (import.meta.env.DEV) { window.__platform = platform; }
  app = document.querySelector('#app');
  initAudio();
  renderLangSwitcher();
  renderSoundToggle();
  // Resume to Match Result if ANY completed+unclaimed match exists (Stage 6.6).
  // Picks the newest one via loadAllMatches sort (createdAt desc) and navigates
  // directly to its Result. One-shot: applyMatchReward flips rewardsClaimed,
  // so subsequent boots fall through to Home.
  try {
    const { loadAllMatches } = await import('./game/matchStore.js');
    const all = await loadAllMatches(platform);
    const unclaimedResult = all.find(
      (m) => m && m.status === 'complete' && !m.rewardsClaimed
    );
    if (unclaimedResult) {
      startMatchResult(unclaimedResult);
      return;
    }
  } catch (e) { /* ignore — fall through to Home */ }
  showHome();
});
