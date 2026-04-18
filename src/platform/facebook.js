const platform = {
  name: 'facebook',
  async init() { console.log('FB platform: stub'); },
  async saveScore(score) { console.log('FB saveScore:', score); },
  async shareResult(data) { console.log('FB shareResult:', data); },
  async showAd(type) { console.log('FB showAd:', type); return false; },
  async getLeaderboard() { console.log('FB getLeaderboard'); return []; },
  getDailyChallengeSeed() {
    const d = new Date();
    return parseInt(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
};
export default platform;
