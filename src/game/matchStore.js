import { Match } from './match.js';
import { queuePersist, flushNow } from './persistQueue.js';

// Debounced save — coalesces within ~2s window to respect FB's setDataAsync
// rate limit. Returns true synchronously once queued (write happens async).
export async function saveMatch(match, platform) {
  if (!match || !platform) return false;
  queuePersist(platform, match.serialize());
  return true;
}

// Force-flush path. Use before navigations that must persist state first
// (opening FB share, leaving for FB's friend picker, etc.).
export async function saveMatchImmediate(match, platform) {
  if (!match || !platform) return false;
  queuePersist(platform, match.serialize());
  await flushNow(platform);
  return true;
}

export async function loadMatch(platform) {
  if (!platform) return null;
  const raw = await platform.getContextData();
  if (!raw) return null;
  try {
    return Match.deserialize(raw);
  } catch (e) {
    console.error('[matchStore] deserialize failed:', e);
    return null;
  }
}

export async function clearMatch(platform) {
  if (!platform) return false;
  queuePersist(platform, null);
  await flushNow(platform);
  return true;
}
