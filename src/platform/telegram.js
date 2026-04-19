import { showRewardedAd, showRewardedPopup } from './monetag.js';

// Telegram Mini App platform adapter (Stage 7.4a).
// SDK loaded via official live CDN in index.html (telegram.org/js/telegram-web-app.js) —
// NOT vendored locally because initData signing verification on the Telegram
// backend requires the live URL. Every SDK call is wrapped in `tgCall()`
// because older Desktop Telegram (pre-7.0) throws on unsupported methods
// like setHeaderColor / CloudStorage, and we refuse to crash the adapter on
// older clients.

const SHARE_URL = 'https://quiz-daily-omega.vercel.app';
const CLOUD_KEY_PREFIX = 'match_';
const CLOUD_VALUE_MAX_BYTES = 4096; // Telegram CloudStorage per-value cap.

function tgCall(fn, fallback) {
  try { return fn(); } catch (e) { console.warn('[TG] call failed:', e); return fallback; }
}

function getTg() {
  return (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp)
    ? window.Telegram.WebApp : null;
}

// Wait for window.Telegram.WebApp (poll 10 × 100ms). Resolves regardless —
// caller checks returned boolean.
async function waitForSdk() {
  for (let i = 0; i < 10; i++) {
    if (getTg()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!getTg();
}

// Promise wrapper for Telegram's (err, result) node-style callbacks.
function cloudCall(method, arg) {
  const tg = getTg();
  if (!tg || !tg.CloudStorage || typeof tg.CloudStorage[method] !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      tg.CloudStorage[method](arg, (err, result) => {
        if (err) { console.warn('[TG] CloudStorage.' + method + ' error:', err); resolve(null); }
        else resolve(result);
      });
    } catch (e) { console.warn('[TG] CloudStorage.' + method + ' threw:', e); resolve(null); }
  });
}

// Overload for zero-arg methods (getKeys).
function cloudCallNoArg(method) {
  const tg = getTg();
  if (!tg || !tg.CloudStorage || typeof tg.CloudStorage[method] !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      tg.CloudStorage[method]((err, result) => {
        if (err) { console.warn('[TG] CloudStorage.' + method + ' error:', err); resolve(null); }
        else resolve(result);
      });
    } catch (e) { console.warn('[TG] CloudStorage.' + method + ' threw:', e); resolve(null); }
  });
}

// key+value 2-arg form (setItem / removeItem).
function cloudCall2(method, key, value) {
  const tg = getTg();
  if (!tg || !tg.CloudStorage || typeof tg.CloudStorage[method] !== 'function') {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    try {
      const cb = (err, ok) => { if (err) { console.warn('[TG] CloudStorage.' + method + ' error:', err); resolve(false); } else resolve(ok !== false); };
      if (value === undefined) tg.CloudStorage[method](key, cb);
      else tg.CloudStorage[method](key, value, cb);
    } catch (e) { console.warn('[TG] CloudStorage.' + method + ' threw:', e); resolve(false); }
  });
}

const platform = {
  name: 'telegram',

  getPlatformName() { return 'telegram'; },

  // detectPlatform() calls this directly; init() is a legacy no-op so the
  // existing main.js `await platform.init()` call keeps working regardless of
  // which adapter detection picks.
  async initPlatform() {
    const found = await waitForSdk();
    if (!found) return { ok: false, reason: 'sdk_missing' };
    const tg = getTg();
    tgCall(() => tg.ready(), null);
    tgCall(() => tg.expand(), null);
    tgCall(() => { if (!tg.isExpanded) tg.expand(); }, null);
    tgCall(() => { tg.headerColor = '#05020f'; }, null);
    tgCall(() => { tg.backgroundColor = '#05020f'; }, null);
    // Closing confirmation is intentionally NOT enabled here — it's annoying
    // outside match gameplay. Enable/disable happens from matchQuiz.js via
    // tgEnableCloseConfirm / tgDisableCloseConfirm below.
    return { ok: true };
  },

  async init() { /* no-op — detection already called initPlatform() */ },

  // --- close-confirmation toggles — called from matchQuiz mount/unmount ---
  tgEnableCloseConfirm() {
    const tg = getTg(); if (!tg) return;
    tgCall(() => tg.enableClosingConfirmation(), null);
  },
  tgDisableCloseConfirm() {
    const tg = getTg(); if (!tg) return;
    tgCall(() => tg.disableClosingConfirmation(), null);
  },

  // --- identity ---
  getPlayerId() {
    const user = tgCall(() => {
      const tg = getTg();
      return tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
    }, null);
    return user && user.id ? 'tg-' + user.id : null;
  },

  // --- day seed (shared with other adapters so daily challenge is consistent) ---
  getDailyChallengeSeed() {
    const d = new Date();
    return parseInt(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
  },

  // --- friend picker: deliberately null until Stage 7.5 deep-link handshake ---
  async chooseFriend() {
    console.log('[TG] chooseFriend — returning null (Stage 7.5 deep-link handshake not implemented)');
    return null;
  },

  // --- share: switchInlineQuery → openTelegramLink fallback ---
  async shareResult(data) {
    const tg = getTg();
    if (!tg) return false;
    const text = (data && data.text) ? data.text : '';
    const okInline = tgCall(() => {
      // switchInlineQuery requires the bot to have inline mode enabled in @BotFather.
      // Returns undefined (not a Promise) — any throw goes through tgCall.
      tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
      return true;
    }, false);
    if (okInline) return true;
    const okLink = tgCall(() => {
      const url = `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(url);
      return true;
    }, false);
    return !!okLink;
  },

  // --- stubs for Stage 7.5b+ ---
  async showAd(type) {
    if (type === 'rewarded') return await showRewardedAd();
    if (type === 'popup') return await showRewardedPopup();
    return false;
  },
  async getLeaderboard() { return []; },
  async saveScore(score) { /* stored server-side in Stage 7.6 (Supabase) */ },

  // Match context primitives — TG has no FB-style "context". Match persistence
  // lives in CloudStorage (getContextData / setContextData below); these remain
  // no-ops so the existing main.js flow keeps working without a TG branch.
  async createMatchContext() { return null; },
  getMatchContext() { return null; },
  async sendMatchUpdate(payload) { return false; },

  // --- CloudStorage-backed match persistence ---
  // Per-match keys (match_<contextId>) because TG's 4KB per-value limit would
  // be exceeded if we packed all matches into one object (10 matches × ~500B
  // each = 5KB > 4KB). legacyMatch is always null on TG (no legacy namespace).
  async getContextData() {
    const tg = getTg();
    if (!tg || !tg.CloudStorage) return { matches: {}, legacyMatch: null };
    const keys = await cloudCallNoArg('getKeys');
    const list = Array.isArray(keys) ? keys : [];
    const matchKeys = list.filter((k) => typeof k === 'string' && k.indexOf(CLOUD_KEY_PREFIX) === 0);
    if (matchKeys.length === 0) return { matches: {}, legacyMatch: null };
    const items = await cloudCall('getItems', matchKeys);
    const obj = (items && typeof items === 'object') ? items : {};
    const matches = {};
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] !== 'string' || !obj[key]) continue;
      const cid = key.substring(CLOUD_KEY_PREFIX.length);
      try { matches[cid] = JSON.parse(obj[key]); } catch (e) { /* skip corrupt entry */ }
    }
    return { matches, legacyMatch: null };
  },

  async setContextData(payload) {
    const tg = getTg();
    if (!tg || !tg.CloudStorage) return false;
    // clearLegacy flag is meaningful only on FB/web — TG has no legacy key.
    const incoming = (payload && payload.matches && typeof payload.matches === 'object')
      ? payload.matches : {};

    // Diff against current cloud state so we only write what changed.
    const current = await (async () => {
      const k = await cloudCallNoArg('getKeys');
      const arr = Array.isArray(k) ? k : [];
      return arr.filter((x) => typeof x === 'string' && x.indexOf(CLOUD_KEY_PREFIX) === 0);
    })();
    const currentCids = new Set(current.map((k) => k.substring(CLOUD_KEY_PREFIX.length)));
    const incomingCids = new Set(Object.keys(incoming));

    const writes = [];
    let attempted = 0;
    let succeeded = 0;

    // UPSERTs — only for incoming matches.
    for (const cid of incomingCids) {
      const serialized = (() => {
        try { return JSON.stringify(incoming[cid]); } catch (e) { return null; }
      })();
      if (serialized == null) continue;
      // Byte size in UTF-8 (approximation via Blob if available, else char length).
      let bytes;
      try { bytes = new Blob([serialized]).size; } catch (e) { bytes = serialized.length; }
      if (bytes > CLOUD_VALUE_MAX_BYTES) {
        console.warn('[TG] match ' + cid + ' is ' + bytes + 'B (> 4KB cap) — skipping cloud write');
        continue;
      }
      attempted++;
      writes.push(cloudCall2('setItem', CLOUD_KEY_PREFIX + cid, serialized).then((ok) => { if (ok) succeeded++; }));
    }

    // DELETEs — matches that exist in cloud but are absent from payload.
    for (const cid of currentCids) {
      if (incomingCids.has(cid)) continue;
      attempted++;
      writes.push(cloudCall2('removeItem', CLOUD_KEY_PREFIX + cid, undefined).then((ok) => { if (ok) succeeded++; }));
    }

    await Promise.all(writes);
    if (attempted === 0) return true; // nothing to do — success by default
    const ratio = succeeded / attempted;
    if (ratio < 0.8) {
      console.warn('[TG] setContextData only ' + succeeded + '/' + attempted + ' writes succeeded');
      return false;
    }
    return true;
  }
};

export default platform;
