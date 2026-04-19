const platform = {
  name: 'telegram',
  async init() { console.log('TG platform: stub'); },
  async saveScore(score) { console.log('TG saveScore:', score); },
  async shareResult(data) { console.log('TG shareResult:', data); },
  async showAd(type) { console.log('TG showAd:', type); return false; },
  async getLeaderboard() { console.log('TG getLeaderboard'); return []; },
  getDailyChallengeSeed() {
    const d = new Date();
    return parseInt(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  },

  async chooseFriend() { console.log('[TG stub] chooseFriend not implemented yet'); return null; },
  async createMatchContext() { console.log('[TG stub] createMatchContext not implemented yet'); return null; },
  getMatchContext() { console.log('[TG stub] getMatchContext not implemented yet'); return null; },
  async sendMatchUpdate(payload) { console.log('[TG stub] sendMatchUpdate not implemented yet'); return false; },
  async getContextData() { console.log('[TG stub] getContextData not implemented yet'); return null; },
  async setContextData(matchJson) { console.log('[TG stub] setContextData not implemented yet'); return false; },
  getPlayerId() { console.log('[TG stub] getPlayerId not implemented yet'); return null; }
};
export default platform;
