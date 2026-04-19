function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

const platform = {
  name: 'web',
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
  async showAd(type) { return false; },
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
      const raw = localStorage.getItem('mock_match_ctx');
      console.log('[web mock] getContextData →', raw ? 'found' : 'null');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  async setContextData(matchJson) {
    try {
      localStorage.setItem('mock_match_ctx', JSON.stringify(matchJson));
      console.log('[web mock] setContextData saved');
      return true;
    } catch (e) { return false; }
  }
};
export default platform;
