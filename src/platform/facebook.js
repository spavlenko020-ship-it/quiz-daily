const LEADERBOARD_NAME = 'daily_quiz_scores';

const platform = {
  name: 'facebook',
  getPlatformName() { return 'facebook'; },

  async init() {
    try {
      await FBInstant.initializeAsync();
      for (let p = 0; p <= 100; p += 10) {
        FBInstant.setLoadingProgress(p);
        await new Promise(r => setTimeout(r, 50));
      }
      await FBInstant.startGameAsync();
    } catch (e) {
      console.error('[FB] init failed:', e);
      throw e;
    }
  },

  async saveScore(score) {
    try {
      const lb = await FBInstant.getLeaderboardAsync(LEADERBOARD_NAME);
      await lb.setScoreAsync(Math.floor(score));
    } catch (e) {
      console.error('[FB] saveScore failed:', e);
    }
  },

  async shareResult(data) {
    try {
      return await FBInstant.shareAsync({
        intent: 'SHARE',
        image: data.image || '',
        text: data.text || 'I scored in Daily Quiz!',
        data: { score: data.score || 0 }
      });
    } catch (e) {
      console.error('[FB] shareResult failed:', e);
      return null;
    }
  },

  async showAd(type) {
    // Stage 6: Audience Network integration post-FB-approval.
    return false;
  },

  async getLeaderboard() {
    try {
      const lb = await FBInstant.getLeaderboardAsync(LEADERBOARD_NAME);
      const entries = await lb.getEntriesAsync(10, 0);
      return entries.map(e => ({
        rank: e.getRank(),
        name: e.getPlayer().getName(),
        score: e.getScore()
      }));
    } catch (e) {
      console.error('[FB] getLeaderboard failed:', e);
      return [];
    }
  },

  getDailyChallengeSeed() {
    const d = new Date();
    return parseInt(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
  },

  async chooseFriend() {
    try {
      await FBInstant.context.chooseAsync({
        filters: ['NEW_CONTEXT_ONLY', 'INCLUDE_EXISTING_CHALLENGES'],
        minSize: 2,
        maxSize: 2
      });
      const contextId = FBInstant.context.getID();
      const contextType = FBInstant.context.getType();
      const players = await FBInstant.context.getPlayersAsync();
      const me = FBInstant.player.getID();
      const opp = players.find(p => p.getID() !== me);
      return {
        contextId,
        contextType,
        opponent: opp ? { id: opp.getID(), name: opp.getName(), photo: opp.getPhoto() } : null
      };
    } catch (e) {
      console.error('[FB] chooseFriend failed:', e);
      return null;
    }
  },

  async createMatchContext() {
    try {
      await FBInstant.context.createAsync();
      return FBInstant.context.getID();
    } catch (e) {
      console.error('[FB] createMatchContext failed:', e);
      return null;
    }
  },

  getMatchContext() {
    try {
      const id = FBInstant.context.getID();
      if (!id) return null;
      return { contextId: id, type: FBInstant.context.getType() };
    } catch (e) {
      return null;
    }
  },

  async sendMatchUpdate(payload) {
    try {
      await FBInstant.updateAsync({
        action: 'CUSTOM',
        cta: payload.cta || 'Your turn!',
        image: payload.image || '',
        text: payload.text || 'It is your turn in Daily Quiz!',
        template: 'QUIZ_UPDATE',
        data: payload.data || {},
        strategy: 'IMMEDIATE',
        notification: 'PUSH'
      });
      return true;
    } catch (e) {
      console.error('[FB] sendMatchUpdate failed:', e);
      return false;
    }
  },

  // NOTE: FB rate-limits player.setDataAsync to ~1 write / 2s.
  // This wrapper does not debounce — callers (matchStore and up) must throttle.
  // Contract (Stage 6.6+): reads/writes the whole `matches` namespace object
  // { [contextId]: serializedMatchJson }. matchStore does the merge/split.
  // The legacy `match` key is also returned if present so matchStore can migrate.
  async getContextData() {
    try {
      const data = await FBInstant.player.getDataAsync(['matches', 'match']);
      return {
        matches: (data && data.matches && typeof data.matches === 'object') ? data.matches : {},
        legacyMatch: data && data.match ? data.match : null
      };
    } catch (e) {
      console.error('[FB] getContextData failed:', e);
      return { matches: {}, legacyMatch: null };
    }
  },

  async setContextData(payload) {
    try {
      const obj = { matches: (payload && payload.matches) ? payload.matches : {} };
      // If migration is requested, also null-out the legacy single-match key.
      if (payload && payload.clearLegacy) obj.match = null;
      await FBInstant.player.setDataAsync(obj);
      return true;
    } catch (e) {
      console.error('[FB] setContextData failed:', e);
      return false;
    }
  },

  getPlayerId() {
    try { return FBInstant.player.getID(); } catch (e) { return null; }
  }
};

export default platform;
