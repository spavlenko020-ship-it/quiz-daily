// Runtime feature flags. Kept in a dedicated module (imported by both main.js
// and platform adapters) to avoid circular imports. Flag values are read live
// from localStorage on every call so DevTools changes take effect immediately.

export const ADS_ENABLED_KEY = 'ads_enabled';

// Default OFF for launch (Stage 7.5) because Monetag ads redirect to the
// external browser on iOS Telegram, which closes the Mini App and kills
// retention. Enable in DevTools via `localStorage.setItem('ads_enabled','1')`.
export function areAdsEnabled() {
  try {
    return localStorage.getItem(ADS_ENABLED_KEY) === '1';
  } catch (e) {
    return false;
  }
}
