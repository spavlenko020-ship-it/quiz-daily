// Stage 7.5 — post-gesture additive mobile audio boost.
// sounds.js already sets mobile master to +2 dB (Stage 7.4b) routed through
// a Compressor (Stage 7.4c). This module adds another +5 dB on top via
// Tone.getDestination() — final mobile ceiling ~+7 dB versus desktop.
// Gated by (a) UA check, (b) first-pointerdown (so we stay inside the
// browser's user-gesture window), (c) idempotent boostApplied flag.

const isMobile = typeof navigator !== 'undefined'
  && /Android|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent);

let boostApplied = false;

export async function applyMobileAudioBoost() {
  if (!isMobile || boostApplied) return;
  try {
    const Tone = await import('tone');
    const dest = Tone.getDestination();
    if (!dest || !dest.volume) return;
    // +5 dB additive — destination volume starts at 0 dB on construction,
    // sounds.js attaches its own master Volume node in front so this doesn't
    // fight the per-sample mix.
    dest.volume.value = dest.volume.value + 5;
    boostApplied = true;
    console.log('[audioBoost] +5dB applied on top of sounds.js baseline, final destination volume:',
      dest.volume.value);
  } catch (e) {
    console.warn('[audioBoost] failed:', e);
  }
}
