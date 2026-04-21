import { injectMobileOverrides } from './ui/mobileOverrides.js';
import { areAdsEnabled } from './config/flags.js';
import { detectJuiceLevel } from './ui/deviceCapability.js';
import { injectTransitionStyles, startScreenObserver } from './ui/screenTransition.js';
import { injectPremiumButtonStyle } from './ui/premiumButtons.js';
import { hapticHeavy } from './ui/haptics.js';
// Must run before any other UI module injects styles so our !important
// font overrides land in the cascade after the default stylesheets.
injectMobileOverrides();
// Boot-time capability benchmark (async — juiceLevel starts 'full' and may
// downgrade to 'lite'/'off' after ~1 second of rAF sampling).
detectJuiceLevel();
// Screen-transition + premium-button styles are injected globally once.
injectTransitionStyles();
injectPremiumButtonStyle();

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
import { injectPremiumChallengeStyles, startChallengeIconObserver } from './ui/premiumChallenge.js';
import { attachPowerupBar, applyProBadgeToScore } from './ui/quizHooks.js';
import { hasStreakFreeze, hasProBadge, getStreakFreezeAvailable, consumeStreakFreeze } from './game/powerups.js';
import { getLevelFromXP as _getLevelFromXP } from './game/stats.js';

// Stage 7.5 — inter-session ad trigger. Runs at Result→navigate callbacks
// and is a no-op while `areAdsEnabled()` is false (default for launch).
// Counter is persisted so an app reload mid-game doesn't reset the cadence.
const GAMES_BEFORE_AD = 3;
const GAMES_COUNTER_KEY = 'games_since_last_ad';

function maybeShowInterstitial() {
  if (!areAdsEnabled()) return;
  let curr = 0;
  try { curr = parseInt(localStorage.getItem(GAMES_COUNTER_KEY) || '0', 10) || 0; } catch (e) {}
  const next = curr + 1;
  try {
    if (next >= GAMES_BEFORE_AD) {
      localStorage.setItem(GAMES_COUNTER_KEY, '0');
      // 300ms delay so Result unmount + Home mount transition is visible first.
      setTimeout(() => {
        import('./platform/monetag.js')
          .then((m) => m.showInterstitialPopup())
          .catch(() => { /* ignore — SDK may be blocked */ });
      }, 300);
    } else {
      localStorage.setItem(GAMES_COUNTER_KEY, String(next));
    }
  } catch (e) { /* storage blocked — silently skip */ }
}

// DEV-only step-by-step finish logger. import.meta.env.DEV is statically
// replaced by Vite so these calls dead-code-eliminate in production (grep
// dist/assets for '[finish]' → 0 matches).
const FLOG_DEV = import.meta.env.DEV;
function flog(...args) { if (FLOG_DEV) console.log('[finish]', ...args); }

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
  // 150ms grace so the Telegram SDK script can populate window.Telegram.
  await new Promise((r) => setTimeout(r, 150));

  // 1. Telegram Mini App — primary target as of Stage 7.4a.
  if (window.Telegram && window.Telegram.WebApp
      && typeof window.Telegram.WebApp.initData === 'string'
      && window.Telegram.WebApp.initData.length > 0) {
    try {
      const tgAdapter = await import('./platform/telegram.js');
      const result = await tgAdapter.default.initPlatform();
      if (result && result.ok) {
        console.log('[platform] using adapter: telegram');
        return tgAdapter.default;
      }
      console.warn('[platform] TG initPlatform failed:', result && result.reason);
    } catch (e) {
      console.warn('[platform] TG adapter import/init threw:', e && e.message);
    }
  }

  // 2. Facebook Instant Games — kept for backwards compat but no longer the
  // primary target (Business Verification unobtainable for this developer).
  if (typeof FBInstant !== 'undefined') {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('FBInstant init timeout')), 3000)
    );
    try {
      await Promise.race([FBInstant.initializeAsync(), timeout]);
      const m = await import('./platform/facebook.js');
      return m.default;
    } catch (e) {
      console.warn('[platform] FB detection failed, using web fallback:', e && e.message);
    }
  }

  // 3. Web fallback.
  const m = await import('./platform/web.js');
  return m.default;
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
    platformName: (platform && typeof platform.getPlatformName === 'function')
      ? platform.getPlatformName() : (platform && platform.name) || 'web',
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
    onBackToHome: () => { maybeShowInterstitial(); showHome(true); },
    onChallengeBack: () => { maybeShowInterstitial(); startChallengeBack(match); },
    onChallengeDifferent: () => { maybeShowInterstitial(); startNewMatchFromResult(); },
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
    // Stage 7.4c — each post-finish side effect is isolated in its own
    // try/catch so a single mobile-specific failure can't leave the user on
    // a white screen. Step logs are DEV-gated via flog() so production
    // bundles carry no console noise.
    flog('1. onFinish called');
    try { if (powerupHandle && typeof powerupHandle.detach === 'function') powerupHandle.detach(); }
    catch (e) { console.error('[finish] powerup detach FAILED:', e && e.message, e && e.stack); }

    let bestResult = null;
    try { bestResult = setBestScoreIfHigher(quiz.score); flog('2. bestResult:', bestResult); }
    catch (e) { console.error('[finish] setBestScoreIfHigher FAILED:', e && e.message, e && e.stack); }
    // Stage 7.5 haptic — heavy impact on new personal best (celebration).
    try { if (bestResult && bestResult.isNew) hapticHeavy(); } catch (e) {}

    try { if (isDaily) maybeApplyStreakFreeze(); }
    catch (e) { console.error('[finish] maybeApplyStreakFreeze FAILED:', e && e.message, e && e.stack); }

    let streakResult = null;
    try { streakResult = isDaily ? recordPlay() : null; }
    catch (e) { console.error('[finish] recordPlay FAILED:', e && e.message, e && e.stack); }

    try { if (isDaily) saveDailyResult(quiz); }
    catch (e) { console.error('[finish] saveDailyResult FAILED:', e && e.message, e && e.stack); }

    let rewards = { xp: 0, coins: 0 };
    let xpResult = { newTotal: 0, prevLevel: 1, newLevel: 1, leveledUp: false };
    let prevXpPercent = 0, newXpPercent = 0;
    try {
      rewards = computeGameRewards(quiz.correctCount, quiz.totalQuestions);
      flog('3. rewards:', rewards);
      const prevXP = getXP();
      prevXpPercent = getXPProgressInLevel(prevXP).percent;
      xpResult = addXP(rewards.xp);
      newXpPercent = getXPProgressInLevel(xpResult.newTotal).percent;
      addCoins(rewards.coins);
    } catch (e) { console.error('[finish] rewards/XP/coins FAILED:', e && e.message, e && e.stack); }

    // Consume the challenge — one play-through per incoming URL.
    if (activeChallenge) {
      incomingChallenge = null;
    }

    try {
      flog('4. renderFinishScreen starting');
      app.innerHTML = '';
      renderFinishScreen(app, quiz, {
        onPlayAgain: () => { maybeShowInterstitial(); showHome(true); },
        onShare: (score, correct) => shareScore(score, correct, quiz.answerHistory),
        onChallenge: (score) => onChallengeClick(score),
        onKeepPlaying: () => { maybeShowInterstitial(); startGame(false); },
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
      // z-index defense — keep Result above any residual Monetag overlay.
      const finishRoot = app.querySelector('.qd-finish');
      if (finishRoot) {
        if (!finishRoot.style.zIndex) finishRoot.style.zIndex = '100';
        if (!finishRoot.style.position) finishRoot.style.position = 'relative';
      }
      flog('5. renderFinishScreen done, DOM .qd-finish:', !!document.querySelector('.qd-finish'));
    } catch (e) {
      console.error('[finish] renderFinishScreen FAILED:', e && e.message, e && e.stack);
    }

    // Pro Badge decoration — post-render decorator is safe because
    // renderFinishScreen is synchronous. No-op if the selector is absent.
    try {
      if (hasProBadge(xpResult.newLevel || _getLevelFromXP(xpResult.newTotal))) {
        applyProBadgeToScore(app, 'PRO');
      }
    } catch (e) { console.error('[finish] applyProBadgeToScore FAILED:', e && e.message, e && e.stack); }

    // Stage 7.2 juice — perfect-game > new-best > good-game baseline.
    // Each helper is idempotent + honours prefers-reduced-motion.
    (async () => {
      try {
        flog('6. juice import starting');
        const { triggerConfetti, goldenPulse, perfectGameBackdrop } =
          await import('./ui/juiceEffects.js');
        const isPerfect = quiz.correctCount === quiz.totalQuestions;
        const isNewBest = bestResult && bestResult.isNew === true;
        const accuracy = quiz.totalQuestions > 0 ? quiz.correctCount / quiz.totalQuestions : 0;
        const isGoodGame = accuracy >= 0.6;
        const scoreEl = app.querySelector('.qd-finish-score-big');
        flog('7. juice about to fire:', { isPerfect, isNewBest, isGoodGame });
        if (isPerfect) {
          try { perfectGameBackdrop(app); } catch (e) { console.error('[finish] perfectGameBackdrop FAILED:', e); }
          try { triggerConfetti(app, 'perfect'); } catch (e) { console.error('[finish] triggerConfetti(perfect) FAILED:', e); }
          try { if (scoreEl) goldenPulse(scoreEl); } catch (e) { console.error('[finish] goldenPulse FAILED:', e); }
        } else if (isNewBest) {
          try { triggerConfetti(app, 'record'); } catch (e) { console.error('[finish] triggerConfetti(record) FAILED:', e); }
          try { if (scoreEl) goldenPulse(scoreEl); } catch (e) { console.error('[finish] goldenPulse FAILED:', e); }
        } else if (isGoodGame) {
          try { triggerConfetti(app, 'complete'); } catch (e) { console.error('[finish] triggerConfetti(complete) FAILED:', e); }
        }
        flog('8. juice done');
      } catch (e) { console.error('[finish] juiceEffects import FAILED:', e && e.message, e && e.stack); }
    })();

    // 500ms safety net — if neither Result DOM appeared, force Home so the
    // user is never stuck on a blank screen. Covers the edge case where
    // renderFinishScreen or a sync side-effect above threw silently AND no
    // error was caught (shouldn't happen now with the try/catches, but is
    // cheap insurance).
    setTimeout(() => {
      const hasFinish = !!document.querySelector('.qd-finish');
      const hasMatchResult = !!document.querySelector('.qd-matchresult');
      if (!hasFinish && !hasMatchResult) {
        console.error('[finish] Result DOM missing after 500ms — forcing Home as fallback');
        try { showHome(true); } catch (e) { /* last-resort, nothing else to try */ }
      }
    }, 500);
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
    onPlayAgain: () => { maybeShowInterstitial(); showHome(true); },
    onShare: (score, correct) => shareScore(score, correct, stored.history || []),
    onChallenge: (score) => onChallengeClick(score),
    bestResult: null,
    streakResult: null,
    isDaily: true,
    isReview: true
  });
}

// Stage 7.5 — additive mobile audio boost, armed on the first user gesture so
// the browser is already inside a click/touch context when Tone autoplays.
document.addEventListener('pointerdown', () => {
  import('./ui/audioBoost.js').then((m) => m.applyMobileAudioBoost()).catch(() => {});
}, { once: true, passive: true });

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[boot] Telegram WebApp available:',
    !!(window.Telegram && window.Telegram.WebApp),
    'initData length:',
    (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.length) || 0);
  initLanguage();
  parseIncomingChallenge();
  renderBackground();
  injectPremiumChallengeStyles();
  startChallengeIconObserver();
  platform = await detectPlatform();
  await platform.init();
  console.log('[platform] using adapter:', platform.name);
  if (import.meta.env.DEV) { window.__platform = platform; }
  app = document.querySelector('#app');
  // Start the scoped screen observer so locked screens.js (renderQuizScreen /
  // renderFinishScreen) also get the fade-in + z-index defense.
  startScreenObserver();
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

  // Stage 7.3: first-time onboarding. Skipped if the user has already
  // completed it (or an unclaimed-match resume took priority above).
  try {
    if (!localStorage.getItem('quiz_onboarded')) {
      const { renderOnboarding } = await import('./game/onboarding.js');
      app.innerHTML = '';
      renderOnboarding(app, () => showHome(false));
      return;
    }
  } catch (e) { /* storage blocked — fall through to Home */ }

  showHome();
});
