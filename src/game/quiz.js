import { questions } from './questions.js';

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

function shuffleWith(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const QUESTIONS_PER_SESSION = 12;
const TOTAL = QUESTIONS_PER_SESSION;

export const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.25, hard: 1.5 };

/**
 * Hyper-casual retention-floor mix: 6 easy + 4 medium + 2 hard per 12-question session.
 * Progressive order (Q1-Q12): E E E E M E M E M M H H.
 * Falls back to any tier when the primary tier is exhausted.
 * Tags each question with `_segmentDifficulty` based on its slot in the session,
 * not the original question's difficulty — this is what gets used for badge + scoring.
 */
const SESSION_ORDER = ['easy','easy','easy','easy','medium','easy','medium','easy','medium','medium','hard','hard'];

function pickProgressiveQuestions(pool, rng) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const tierPools = {
    easy: shuffle(pool.filter(q => q.difficulty === 'easy')),
    medium: shuffle(pool.filter(q => q.difficulty === 'medium')),
    hard: shuffle(pool.filter(q => q.difficulty === 'hard'))
  };
  const fallbackOrder = { easy: ['medium','hard'], medium: ['hard','easy'], hard: ['medium','easy'] };

  const used = new Set();
  const result = [];

  for (const tier of SESSION_ORDER) {
    let picked = null;
    for (const q of tierPools[tier]) {
      if (!used.has(q)) { picked = q; break; }
    }
    if (!picked) {
      for (const fbTier of fallbackOrder[tier]) {
        for (const q of tierPools[fbTier]) {
          if (!used.has(q)) { picked = q; break; }
        }
        if (picked) break;
      }
    }
    if (picked) {
      used.add(picked);
      result.push({ ...picked, _segmentDifficulty: tier });
    }
  }

  return result;
}

export class Quiz {
  constructor(seed = null, lang = 'en') {
    this._lang = lang;
    const rng = seed !== null ? mulberry32(seed) : Math.random;

    const RECENT_KEY = 'quiz_daily_recent_questions';
    let recentQuestionIds = [];
    if (seed === null) {
      try {
        recentQuestionIds = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      } catch (e) { recentQuestionIds = []; }
    }
    const fingerprint = (q) => q.q.en;
    const notRecent = (q) => !recentQuestionIds.includes(fingerprint(q));

    const filtered = questions.filter(notRecent);
    const needEasy = 6, needMed = 4, needHard = 2;
    const filteredEasy = filtered.filter(q => q.difficulty === 'easy').length;
    const filteredMed = filtered.filter(q => q.difficulty === 'medium').length;
    const filteredHard = filtered.filter(q => q.difficulty === 'hard').length;
    const enoughInFiltered =
      filteredEasy >= needEasy && filteredMed >= needMed && filteredHard >= needHard;
    const pool = enoughInFiltered ? filtered : questions;

    this._raw = pickProgressiveQuestions(pool, rng);

    if (this._raw.length < TOTAL) {
      let idx = 0;
      while (this._raw.length < TOTAL && idx < questions.length * 3) {
        const candidate = questions[Math.floor(rng() * questions.length)];
        if (!this._raw.some(r => fingerprint(r) === fingerprint(candidate))) {
          const segDiff = SESSION_ORDER[this._raw.length] || 'hard';
          this._raw.push({ ...candidate, _segmentDifficulty: segDiff });
        }
        idx++;
      }
    }
    this._raw = this._raw.slice(0, TOTAL);

    if (seed === null) {
      const newRecent = [...recentQuestionIds, ...this._raw.map(fingerprint)].slice(-60);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent)); } catch (e) {}
    }

    try {
      const label = (q) => `${q.id || '?'}(${((q._segmentDifficulty || q.difficulty || '')[0] || '?').toUpperCase()})`;
      console.log('[quiz] session ids:', this._raw.map(label).join(' '));
    } catch (e) {}

    this._index = 0;
    this._score = 0;
    this._correctCount = 0;
    this._history = [];
    this._currentCorrectStreak = 0;
  }

  _localized(raw) {
    const lang = this._lang;
    const fallback = 'en';
    const qObj = raw.q || {};
    const aObj = raw.a || {};
    return {
      q: qObj[lang] || qObj[fallback] || '',
      a: (aObj[lang] || aObj[fallback] || []).slice(),
      correct: raw.correct,
      difficulty: raw.difficulty,
      segmentDifficulty: raw._segmentDifficulty || raw.difficulty || 'easy'
    };
  }

  get currentQuestion() {
    if (this.isDone) return null;
    return this._localized(this._raw[this._index]);
  }

  get currentCorrectStreak() { return this._currentCorrectStreak; }
  get questionIndex() { return this._index; }
  get totalQuestions() { return TOTAL; }
  get score() { return this._score; }
  get correctCount() { return this._correctCount; }
  get isDone() { return this._index >= TOTAL; }
  get answerHistory() { return this._history; }

  answer(choiceIndex, secondsRemaining) {
    if (this.isDone) {
      throw new Error('Quiz is already done');
    }
    const raw = this._raw[this._index];
    const q = this._localized(raw);
    const timeLeft = Math.max(0, Math.min(10, secondsRemaining));
    const isCorrect = choiceIndex === q.correct && choiceIndex !== -1;
    const base = 10 + Math.round(timeLeft * 4);
    const multiplier = DIFFICULTY_MULTIPLIER[q.segmentDifficulty] || 1;
    const points = isCorrect ? Math.round(base * multiplier) : 0;

    this._score += points;
    if (isCorrect) {
      this._correctCount += 1;
      this._currentCorrectStreak += 1;
    } else {
      this._currentCorrectStreak = 0;
    }

    this._history.push({
      q: q.q,
      a: q.a.slice(),
      correct: q.correct,
      chosen: choiceIndex,
      isCorrect,
      timeLeft,
      points,
      segmentDifficulty: q.segmentDifficulty
    });

    this._index += 1;

    return {
      isCorrect,
      correctIndex: q.correct,
      pointsEarned: points,
      pointsBase: base,
      multiplier,
      segmentDifficulty: q.segmentDifficulty,
      currentCorrectStreak: this._currentCorrectStreak
    };
  }
}
