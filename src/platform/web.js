import { showRewardedAd, showRewardedPopup } from './monetag.js';

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

const platform = {
  name: 'web',
  getPlatformName() { return 'web'; },
  async init() { /* no-op on web */ },
  async saveScore(score) { /* no-op stub — real leaderboard comes with backend */ },
  async shareResult(data) {
    const text = data && data.text ? data.text : '';
    if (isMobile() && navigator.share) {
      try {
        await navigator.share({ text });
        return { via: 'native' };
      } catch (e) { /* user canceled or blocked — fall through to clipboard */ }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return { via: 'clipboard' };
      } catch (e) {
        console.error('[platform.web] clipboard failed', e);
      }
    }
    return { via: 'unavailable' };
  },
  async showAd(type) {
    if (type === 'rewarded') return await showRewardedAd();
    if (type === 'popup') return await showRewardedPopup();
    return false;
  },
  async getLeaderboard() { return []; },
  getDailyChallengeSeed() {
    const d = new Date();
    return parseInt(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  },

  async chooseFriend() {
    const mock = {
      contextId: 'mock-ctx-' + Date.now(),
      contextType: 'SOLO',
      opponent: { id: 'mock-opp-1', name: 'Alice (Dev)', photo: '' }
    };
    console.log('[web mock] chooseFriend:', mock);
    return mock;
  },

  async createMatchContext() {
    const id = 'mock-ctx-' + Date.now();
    console.log('[web mock] createMatchContext:', id);
    return id;
  },

  getMatchContext() {
    const ctx = { contextId: 'mock-ctx-local', type: 'SOLO' };
    console.log('[web mock] getMatchContext:', ctx);
    return ctx;
  },

  async sendMatchUpdate(payload) {
    console.log('[web mock] sendMatchUpdate:', payload);
    return true;
  },

  async getContextData() {
    try {
      const rawMatches = localStorage.getItem('mock_matches');
      const rawLegacy = localStorage.getItem('mock_match_ctx');
      const matches = rawMatches ? JSON.parse(rawMatches) : {};
      const legacyMatch = rawLegacy || null;
      console.log('[web mock] getContextData →', {
        matchCount: matches && typeof matches === 'object' ? Object.keys(matches).length : 0,
        legacy: !!legacyMatch
      });
      return { matches: matches && typeof matches === 'object' ? matches : {}, legacyMatch };
    } catch (e) { return { matches: {}, legacyMatch: null }; }
  },

  async setContextData(payload) {
    try {
      const obj = (payload && payload.matches) ? payload.matches : {};
      localStorage.setItem('mock_matches', JSON.stringify(obj));
      if (payload && payload.clearLegacy) localStorage.removeItem('mock_match_ctx');
      console.log('[web mock] setContextData saved', Object.keys(obj).length, 'match(es)');
      return true;
    } catch (e) { return false; }
  },

  getPlayerId() { return 'web-dev-player'; }
};
export default platform;
