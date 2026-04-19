import { Match } from './match.js';

export async function saveMatch(match, platform) {
  if (!match || !platform) return false;
  return await platform.setContextData(match.serialize());
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
  return await platform.setContextData(null);
}
