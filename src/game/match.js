const QUESTIONS_PER_MATCH = 6;

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed() {
  const d = new Date();
  return parseInt(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
}

function pickDeterministic(pool, rng, count) {
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map(i => pool[i]);
}

export class Match {
  constructor(data = {}) {
    this.contextId = data.contextId || null;
    this.seed = data.seed || 0;
    this.questions = Array.isArray(data.questions) ? data.questions.slice() : [];
    this.playerAScore = data.playerAScore ?? null;
    this.playerBScore = data.playerBScore ?? null;
    this.playerAId = data.playerAId || null;
    this.playerBId = data.playerBId || null;
    this.status = data.status || 'pending_a';
    this.winnerId = data.winnerId || null;
    this.createdAt = data.createdAt || Date.now();
  }

  static create(opponentData, questionPool) {
    const contextId = opponentData && opponentData.contextId ? opponentData.contextId : 'local-' + Date.now();
    const seed = (dateSeed() ^ hashString(contextId)) >>> 0;
    const rng = mulberry32(seed);
    const picked = pickDeterministic(questionPool, rng, QUESTIONS_PER_MATCH);
    const questionIds = picked.map(q => q.id);
    return new Match({
      contextId,
      seed,
      questions: questionIds,
      playerAScore: null,
      playerBScore: null,
      playerAId: 'me',
      playerBId: opponentData && opponentData.opponent ? opponentData.opponent.id : null,
      status: 'pending_a',
      winnerId: null,
      createdAt: Date.now()
    });
  }

  serialize() {
    return JSON.stringify({
      contextId: this.contextId,
      seed: this.seed,
      questions: this.questions,
      playerAScore: this.playerAScore,
      playerBScore: this.playerBScore,
      playerAId: this.playerAId,
      playerBId: this.playerBId,
      status: this.status,
      winnerId: this.winnerId,
      createdAt: this.createdAt
    });
  }

  static deserialize(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return new Match(data);
  }

  recordScore(playerId, score) {
    if (playerId === this.playerAId) {
      this.playerAScore = score;
      this.status = this.playerBScore !== null ? 'complete' : 'pending_b';
    } else if (playerId === this.playerBId) {
      this.playerBScore = score;
      this.status = this.playerAScore !== null ? 'complete' : 'pending_b';
    } else {
      throw new Error(`recordScore: unknown playerId ${playerId}`);
    }
    if (this.status === 'complete') {
      const w = this.getWinner();
      if (w === 'a') this.winnerId = this.playerAId;
      else if (w === 'b') this.winnerId = this.playerBId;
      else this.winnerId = null;
    }
  }

  getWinner() {
    if (this.status !== 'complete') return null;
    if (this.playerAScore > this.playerBScore) return 'a';
    if (this.playerBScore > this.playerAScore) return 'b';
    return 'tie';
  }
}

export const MATCH_QUESTIONS_PER_SESSION = QUESTIONS_PER_MATCH;
