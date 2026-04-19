// Singleton throttle for platform.setContextData. FB rate-limits setDataAsync
// to ~1 write per 2 seconds. Coalescing semantics: latest queued data wins.
// One queue per game session is sufficient — we only ever persist one Match
// at a time.

const THROTTLE_MS = 2000;

let pendingPlatform = null;
let pendingData = null;
let hasPending = false;
let lastWriteAt = 0;
let timer = null;

async function writeNow() {
  timer = null;
  if (!hasPending || !pendingPlatform) return;
  const platform = pendingPlatform;
  const data = pendingData;
  hasPending = false;
  pendingData = null;
  pendingPlatform = null;
  lastWriteAt = Date.now();
  try {
    await platform.setContextData(data);
  } catch (e) {
    console.error('[persistQueue] write failed:', e);
  }
}

function schedule(delayMs) {
  if (timer !== null) return;
  timer = setTimeout(writeNow, Math.max(0, delayMs));
}

export function queuePersist(platform, data) {
  pendingPlatform = platform;
  pendingData = data;
  hasPending = true;

  const now = Date.now();
  const delta = now - lastWriteAt;
  if (delta >= THROTTLE_MS) {
    // Immediate write path — but still defer to a microtask so callers can
    // queue multiple writes in the same frame and only the last one fires.
    if (timer === null) schedule(0);
  } else {
    schedule(THROTTLE_MS - delta);
  }
}

export async function flushNow(platform) {
  // Force-flush any pending write before a navigation (e.g. opening a share
  // sheet or leaving for FB's picker). If there's no pending write, this is
  // a no-op.
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (!hasPending) return;
  const p = platform || pendingPlatform;
  if (!p) { hasPending = false; pendingData = null; pendingPlatform = null; return; }
  const data = pendingData;
  hasPending = false;
  pendingData = null;
  pendingPlatform = null;
  lastWriteAt = Date.now();
  try {
    await p.setContextData(data);
  } catch (e) {
    console.error('[persistQueue] flushNow failed:', e);
  }
}
