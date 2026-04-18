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
  }
};
export default platform;
