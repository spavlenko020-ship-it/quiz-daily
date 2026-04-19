// Powerup economy: first real coin sink (50/50) + XP-gated entitlements.
// Storage is localStorage; failures are swallowed so the rest of the game
// keeps working in private-mode browsers.

export const POWERUP_COSTS = { fiftyFifty: 50 };

export const LEVEL_UNLOCKS = {
  3:  { freeDaily: { fiftyFifty: 1 } },
  5:  { streakFreeze: true },
  7:  { freeDaily: { fiftyFifty: 2 } },
  10: { proBadge: true }
};

export const UNLOCK_LEVELS = [3, 5, 7, 10];

// ---------- keys ----------
const K_FREE_DAILY = 'powerup_free_daily';        // { date: 'YYYY-MM-DD', used: N }
const K_STREAK_FREEZE = 'streak_freeze_used_week'; // ISO week string "YYYY-Www"
const K_STREAK_FREEZE_TOAST = 'streak_freeze_toast_pending';
const K_UNLOCKS_ANNOUNCED = 'unlocks_announced';   // [3,5,7,...]

// ---------- date helpers ----------
function todayStr(date = new Date()) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

// ---------- free daily fifty-fifty ----------
export function getFreeDailyQuota(level) {
  let best = 0;
  for (const [lvl, cfg] of Object.entries(LEVEL_UNLOCKS)) {
    if (level >= Number(lvl) && cfg.freeDaily && typeof cfg.freeDaily.fiftyFifty === 'number') {
      best = cfg.freeDaily.fiftyFifty;
    }
  }
  return best;
}

export function getTodayFreeUsed() {
  try {
    const raw = localStorage.getItem(K_FREE_DAILY);
    if (!raw) return 0;
    const o = JSON.parse(raw);
    return (o && o.date === todayStr()) ? (o.used || 0) : 0;
  } catch (e) { return 0; }
}

export function setTodayFreeUsed(n) {
  try {
    localStorage.setItem(K_FREE_DAILY, JSON.stringify({ date: todayStr(), used: n }));
  } catch (e) { /* swallow */ }
}

export function canUseFreeFiftyFifty(level) {
  const quota = getFreeDailyQuota(level);
  if (!quota) return false;
  return getTodayFreeUsed() < quota;
}

export function consumeFreeFiftyFifty() {
  setTodayFreeUsed(getTodayFreeUsed() + 1);
}

// ---------- streak freeze ----------
export function hasStreakFreeze(level) { return level >= 5; }
export function hasProBadge(level) { return level >= 10; }

export function getStreakFreezeAvailable() {
  try {
    const raw = localStorage.getItem(K_STREAK_FREEZE);
    if (!raw) return true;
    return raw !== isoWeek();
  } catch (e) { return false; }
}

export function consumeStreakFreeze() {
  try {
    localStorage.setItem(K_STREAK_FREEZE, isoWeek());
    localStorage.setItem(K_STREAK_FREEZE_TOAST, '1');
  } catch (e) { /* swallow */ }
}

export function hasPendingStreakFreezeToast() {
  try { return localStorage.getItem(K_STREAK_FREEZE_TOAST) === '1'; }
  catch (e) { return false; }
}

export function clearPendingStreakFreezeToast() {
  try { localStorage.removeItem(K_STREAK_FREEZE_TOAST); }
  catch (e) { /* swallow */ }
}

// ---------- unlock announcements ----------
export function getAnnouncedUnlocks() {
  try {
    const raw = localStorage.getItem(K_UNLOCKS_ANNOUNCED);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(n => typeof n === 'number') : [];
  } catch (e) { return []; }
}

export function markUnlockAnnounced(level) {
  try {
    const current = getAnnouncedUnlocks();
    if (current.includes(level)) return;
    current.push(level);
    localStorage.setItem(K_UNLOCKS_ANNOUNCED, JSON.stringify(current));
  } catch (e) { /* swallow */ }
}

// Returns the highest unlock level that player qualifies for but has not yet
// seen an announcement for. Returns null if none pending.
export function getPendingUnlock(level) {
  const announced = getAnnouncedUnlocks();
  for (let i = UNLOCK_LEVELS.length - 1; i >= 0; i--) {
    const L = UNLOCK_LEVELS[i];
    if (level >= L && !announced.includes(L)) return L;
  }
  return null;
}
