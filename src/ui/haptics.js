// Stage 7.5 — Telegram HapticFeedback wrappers.
// Only fire on significant events (max ~5 call sites app-wide — no global
// delegation, no on-answer-tap, per Stage 7.5 spec). All helpers are
// silent no-ops outside Telegram, so callers can invoke them unconditionally.

function getHaptic() {
  try {
    return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback)
      ? window.Telegram.WebApp.HapticFeedback : null;
  } catch (e) { return null; }
}

export function hapticLight() {
  try { const h = getHaptic(); if (h) h.impactOccurred('light'); } catch (e) {}
}

export function hapticMedium() {
  try { const h = getHaptic(); if (h) h.impactOccurred('medium'); } catch (e) {}
}

export function hapticHeavy() {
  try { const h = getHaptic(); if (h) h.impactOccurred('heavy'); } catch (e) {}
}

export function hapticSuccess() {
  try { const h = getHaptic(); if (h) h.notificationOccurred('success'); } catch (e) {}
}

export function hapticError() {
  try { const h = getHaptic(); if (h) h.notificationOccurred('error'); } catch (e) {}
}
