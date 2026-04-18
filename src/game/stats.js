const STORAGE_KEYS = {
  bestScore: 'quiz_daily_best_score',
  streak: 'quiz_daily_streak',
  lastPlayDate: 'quiz_daily_last_play_date',
  longestStreak: 'quiz_daily_longest_streak',
  totalGames: 'quiz_daily_total_games',
  todayBest: 'quiz_daily_today_best',
  todayBestDate: 'quiz_daily_today_best_date',
  xp: 'qd_xp',
  coins: 'qd_coins'
};

function todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(earlier, later) {
  const [y1, m1, d1] = earlier.split('-').map(Number);
  const [y2, m2, d2] = later.split('-').map(Number);
  const dateA = new Date(y1, m1 - 1, d1);
  const dateB = new Date(y2, m2 - 1, d2);
  const diffMs = dateB - dateA;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function getBestScore() {
  const v = localStorage.getItem(STORAGE_KEYS.bestScore);
  return v ? parseInt(v, 10) : 0;
}

export function getTodayBestScore() {
  const savedDate = localStorage.getItem(STORAGE_KEYS.todayBestDate);
  if (savedDate !== todayString()) return 0;
  const v = localStorage.getItem(STORAGE_KEYS.todayBest);
  return v ? parseInt(v, 10) : 0;
}

export function setTodayBestScoreIfHigher(score) {
  const current = getTodayBestScore();
  if (score > current) {
    localStorage.setItem(STORAGE_KEYS.todayBest, String(score));
    localStorage.setItem(STORAGE_KEYS.todayBestDate, todayString());
    return true;
  }
  return false;
}

export function setBestScoreIfHigher(score) {
  const current = getBestScore();
  setTodayBestScoreIfHigher(score);
  if (score > current) {
    localStorage.setItem(STORAGE_KEYS.bestScore, String(score));
    return { improved: true, previous: current, current: score };
  }
  return { improved: false, previous: current, current };
}

export function getStreak() {
  const v = localStorage.getItem(STORAGE_KEYS.streak);
  return v ? parseInt(v, 10) : 0;
}

export function getLongestStreak() {
  const v = localStorage.getItem(STORAGE_KEYS.longestStreak);
  return v ? parseInt(v, 10) : 0;
}

export function getLastPlayDate() {
  return localStorage.getItem(STORAGE_KEYS.lastPlayDate);
}

export function getTotalGames() {
  const v = localStorage.getItem(STORAGE_KEYS.totalGames);
  return v ? parseInt(v, 10) : 0;
}

export function recordPlay() {
  const today = todayString();
  const lastDate = getLastPlayDate();
  const previousStreak = getStreak();
  const totalGames = getTotalGames();

  localStorage.setItem(STORAGE_KEYS.totalGames, String(totalGames + 1));

  let streak = previousStreak;
  let streakIncreased = false;
  let streakReset = false;
  let isFirstPlayToday = false;

  if (!lastDate) {
    streak = 1;
    streakIncreased = true;
    isFirstPlayToday = true;
  } else {
    const gap = daysBetween(lastDate, today);
    if (gap === 0) {
      isFirstPlayToday = false;
    } else if (gap === 1) {
      streak = previousStreak + 1;
      streakIncreased = true;
      isFirstPlayToday = true;
    } else if (gap > 1) {
      streak = 1;
      streakReset = true;
      streakIncreased = true;
      isFirstPlayToday = true;
    } else {
      isFirstPlayToday = false;
    }
  }

  localStorage.setItem(STORAGE_KEYS.streak, String(streak));
  localStorage.setItem(STORAGE_KEYS.lastPlayDate, today);

  const longest = getLongestStreak();
  if (streak > longest) {
    localStorage.setItem(STORAGE_KEYS.longestStreak, String(streak));
  }

  const MILESTONES = [3, 7, 14, 30, 60, 100];
  const milestone = streakIncreased && MILESTONES.includes(streak) ? streak : null;

  return { streak, previousStreak, streakIncreased, streakReset, isFirstPlayToday, milestone };
}

export function resetAllStats() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  Object.values(DAILY_KEYS).forEach(k => localStorage.removeItem(k));
}

// ============ XP + LEVEL + COINS ============

// Cumulative XP required to START level N is: sum(1..N-1) * 100 = (N-1)*N/2 * 100
// So level 1 starts at 0, level 2 at 100, level 3 at 300, level 4 at 600, level 5 at 1000, level 6 at 1500.
function cumulativeXPForLevel(level) {
  const n = level - 1;
  return (n * (n + 1) / 2) * 100;
}

export function getLevelFromXP(xp) {
  let level = 1;
  while (cumulativeXPForLevel(level + 1) <= xp) level++;
  return level;
}

export function getXPProgressInLevel(xp) {
  const level = getLevelFromXP(xp);
  const floor = cumulativeXPForLevel(level);
  const ceiling = cumulativeXPForLevel(level + 1);
  const current = xp - floor;
  const needed = ceiling - floor;
  const percent = needed > 0 ? Math.max(0, Math.min(100, (current / needed) * 100)) : 0;
  return { current, needed, percent };
}

export function getXP() {
  const v = localStorage.getItem(STORAGE_KEYS.xp);
  return v ? parseInt(v, 10) : 0;
}

export function addXP(amount) {
  const prev = getXP();
  const prevLevel = getLevelFromXP(prev);
  const newTotal = prev + amount;
  const newLevel = getLevelFromXP(newTotal);
  localStorage.setItem(STORAGE_KEYS.xp, String(newTotal));
  return {
    newTotal,
    prevLevel,
    newLevel,
    leveledUp: newLevel > prevLevel
  };
}

export function getCoins() {
  const v = localStorage.getItem(STORAGE_KEYS.coins);
  return v ? parseInt(v, 10) : 0;
}

export function addCoins(amount) {
  const newTotal = getCoins() + amount;
  localStorage.setItem(STORAGE_KEYS.coins, String(newTotal));
  return newTotal;
}

export function computeGameRewards(correctCount, totalQuestions) {
  const perfect = correctCount === totalQuestions;
  const xp = 10 + (correctCount * 5) + (perfect ? 50 : 0);
  const coins = 10 + (correctCount * 5) + (perfect ? 25 : 0);
  return { xp, coins, perfect };
}

const DAILY_KEYS = {
  dailyCompletedDate: 'quiz_daily_completed_date',
  dailyCompletedScore: 'quiz_daily_completed_score',
  dailyCompletedCorrect: 'quiz_daily_completed_correct',
  dailyCompletedHistory: 'quiz_daily_completed_history'
};

function _todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDailyCompletedToday() {
  const saved = localStorage.getItem(DAILY_KEYS.dailyCompletedDate);
  return saved === _todayString();
}

export function getDailyResult() {
  if (!isDailyCompletedToday()) return null;
  const score = parseInt(localStorage.getItem(DAILY_KEYS.dailyCompletedScore) || '0', 10);
  const correct = parseInt(localStorage.getItem(DAILY_KEYS.dailyCompletedCorrect) || '0', 10);
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(DAILY_KEYS.dailyCompletedHistory) || '[]');
  } catch (e) { history = []; }
  return { score, correct, history };
}

export function saveDailyResult(quiz) {
  localStorage.setItem(DAILY_KEYS.dailyCompletedDate, _todayString());
  localStorage.setItem(DAILY_KEYS.dailyCompletedScore, String(quiz.score));
  localStorage.setItem(DAILY_KEYS.dailyCompletedCorrect, String(quiz.correctCount));
  try {
    localStorage.setItem(DAILY_KEYS.dailyCompletedHistory, JSON.stringify(quiz.answerHistory));
  } catch (e) { /* ignore storage errors */ }
}

export function msUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}
