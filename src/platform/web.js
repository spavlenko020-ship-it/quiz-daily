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
  }
};
export default platform;
