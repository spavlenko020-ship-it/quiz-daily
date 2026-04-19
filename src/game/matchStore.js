import { Match } from './match.js';
import { queuePersist, flushNow } from './persistQueue.js';

// In-memory cache of the matches namespace, keyed by contextId.
// Populated lazily on first read; kept in sync with every write so callers
// don't need to re-fetch between writes.
let cache = null;
let cacheReady = false;
let migrationRan = false;

async function ensureCacheLoaded(platform) {
  if (cacheReady) return;
  const raw = await platform.getContextData();
  const matches = (raw && raw.matches && typeof raw.matches === 'object') ? raw.matches : {};
  const legacy = raw && raw.legacyMatch ? raw.legacyMatch : null;

  // MIGRATION — run once per page load. If the platform reports a legacy
  // `match` key AND the matches namespace doesn't already hold that same
  // contextId, move it in and flush a write that clears the legacy key.
  if (!migrationRan && legacy) {
    migrationRan = true;
    try {
      const legacyMatch = Match.deserialize(legacy);
      const cid = legacyMatch.contextId || ('legacy-' + Date.now());
      if (!matches[cid]) {
        matches[cid] = legacy;
        console.log('[matchStore] migrated legacy match → matches[' + cid + ']');
        await platform.setContextData({ matches, clearLegacy: true });
      }
    } catch (e) {
      console.error('[matchStore] legacy migration failed:', e);
    }
  } else if (!migrationRan) {
    migrationRan = true;
  }

  cache = matches;
  cacheReady = true;
}

function persistCache(platform, immediate) {
  // Defensive copy so queued writes don't see in-flight cache mutations.
  const snapshot = { matches: { ...cache } };
  if (immediate) {
    queuePersist(platform, snapshot);
    return flushNow(platform);
  }
  queuePersist(platform, snapshot);
  return Promise.resolve();
}

export async function saveMatch(match, platform) {
  if (!match || !platform) return false;
  let cid = match.contextId;
  if (!cid) {
    cid = 'fallback-' + Date.now();
    console.warn('[matchStore] saveMatch: match has no contextId, using fallback:', cid);
    match.contextId = cid;
  }
  await ensureCacheLoaded(platform);
  cache[cid] = match.serialize();
  await persistCache(platform, false);
  return true;
}

export async function saveMatchImmediate(match, platform) {
  if (!match || !platform) return false;
  let cid = match.contextId;
  if (!cid) {
    cid = 'fallback-' + Date.now();
    console.warn('[matchStore] saveMatchImmediate: match has no contextId, using fallback:', cid);
    match.contextId = cid;
  }
  await ensureCacheLoaded(platform);
  cache[cid] = match.serialize();
  await persistCache(platform, true);
  return true;
}

export async function loadMatch(platform, contextId) {
  if (!platform || !contextId) return null;
  await ensureCacheLoaded(platform);
  const raw = cache[contextId];
  if (!raw) return null;
  try {
    return Match.deserialize(raw);
  } catch (e) {
    console.error('[matchStore] deserialize failed for ' + contextId + ':', e);
    return null;
  }
}

export async function loadAllMatches(platform) {
  if (!platform) return [];
  await ensureCacheLoaded(platform);
  const list = [];
  for (const cid of Object.keys(cache)) {
    try {
      list.push(Match.deserialize(cache[cid]));
    } catch (e) {
      console.error('[matchStore] deserialize failed for ' + cid + ':', e);
    }
  }
  // Newest first by createdAt.
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

export async function clearMatch(platform, contextId) {
  if (!platform || !contextId) return false;
  await ensureCacheLoaded(platform);
  if (cache[contextId]) delete cache[contextId];
  await persistCache(platform, true);
  return true;
}
