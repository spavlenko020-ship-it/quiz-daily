// Stage 7.5 — adaptive juice via async rAF benchmark.
// `navigator.hardwareConcurrency` is unreliable on iOS (always reports 4/8
// regardless of actual performance). Measured frames-per-second over the
// first second of boot is the only trustworthy signal. We start at `full`
// (optimistic) and downgrade asynchronously once the benchmark completes —
// the first confetti fire will use `full`, subsequent fires benefit from
// the measurement. User preference in localStorage trumps the benchmark.

const STORAGE_KEY = 'juice_level';

export let juiceLevel = 'full';

export function detectJuiceLevel() {
  // Manual user preference always wins.
  try {
    const pref = localStorage.getItem(STORAGE_KEY);
    if (pref === 'full' || pref === 'lite' || pref === 'off') {
      juiceLevel = pref;
      return juiceLevel;
    }
  } catch (e) { /* storage blocked — fall through to benchmark */ }

  // Reduced-motion preference → lite (keep visuals but shrink motion cost).
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      juiceLevel = 'lite';
      return juiceLevel;
    }
  } catch (e) { /* ignore */ }

  juiceLevel = 'full';
  let frames = 0;
  const start = performance.now();
  function tick(now) {
    frames++;
    if (now - start < 1000) {
      requestAnimationFrame(tick);
    } else {
      const fps = frames;
      if (fps < 45) juiceLevel = 'lite';
      if (fps < 25) juiceLevel = 'off';
      console.log(`[capability] boot fps: ${fps}, juiceLevel: ${juiceLevel}`);
    }
  }
  requestAnimationFrame(tick);
  return juiceLevel;
}

export function setJuiceLevel(level) {
  if (level === 'full' || level === 'lite' || level === 'off') {
    juiceLevel = level;
    try { localStorage.setItem(STORAGE_KEY, level); } catch (e) { /* ignore */ }
  }
}
