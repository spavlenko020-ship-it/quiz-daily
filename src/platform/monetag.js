// Monetag ads integration (Stage 7.4b).
// SDK loaded via CDN in index.html:
//   <script src="//libtl.com/sdk.js" data-zone="10898773" data-sdk="show_10898773">
// Protocol-relative URL resolves to HTTPS under Telegram / Vercel (both
// TLS); on http://localhost it may be blocked — callers treat `false`
// return values as "ad not available" and continue gracefully.
//
// The SDK exposes a global `show_<ZONE_ID>` function (one zone serves all
// formats — rewarded / popup / inApp via argument shape).

const ZONE_ID = '10898773';
const AD_FN_NAME = `show_${ZONE_ID}`;

// Vite statically replaces `import.meta.env.DEV` so the body of `if (DEBUG)`
// dead-code-eliminates in production — zero ad-network log noise.
const DEBUG = import.meta.env.DEV;
function debugLog(...args) { if (DEBUG) console.log('[Monetag]', ...args); }

debugLog('SDK status at module load:',
  (typeof window !== 'undefined' && typeof window[AD_FN_NAME] === 'function') ? 'LOADED' : 'MISSING');

function getAdFn() {
  return (typeof window !== 'undefined' && typeof window[AD_FN_NAME] === 'function')
    ? window[AD_FN_NAME] : null;
}

// ---------------------------------------------------------------------------
// Rewarded interstitial — caller awaits and gets true only if the ad played
// through to completion (user earns the reward). Used by the 50/50 popup's
// "Watch for free" path and the Match Result "📺 Watch 15s → 2×" button.
// ---------------------------------------------------------------------------
export async function showRewardedAd() {
  const fn = getAdFn();
  if (!fn) { debugLog('SDK missing, skipping rewarded'); return false; }
  try {
    await fn(); // default call shape = rewarded interstitial
    debugLog('rewarded completed');
    return true;
  } catch (e) {
    debugLog('rewarded failed:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rewarded popup — smaller off-page format. Not currently wired from any
// caller; kept as an API affordance for future growth experiments.
// ---------------------------------------------------------------------------
export async function showRewardedPopup() {
  const fn = getAdFn();
  if (!fn) return false;
  try {
    await fn('pop');
    return true;
  } catch (e) { return false; }
}

// ---------------------------------------------------------------------------
// In-App auto-shown interstitial — fires on SDK-chosen cadence after arm.
// Armed once per page load (idempotent), from Home mount. Settings cap at
// 2 ads per 6-min rolling window (capping: 0.1 hours = 6 minutes), with
// 30-second minimum gap, 5-second delay on first fire.
// ---------------------------------------------------------------------------
let inAppArmed = false;
export function armInAppInterstitial() {
  if (inAppArmed) return;
  const fn = getAdFn();
  if (!fn) { debugLog('SDK missing, skipping inApp arm'); return; }
  try {
    fn({
      type: 'inApp',
      inAppSettings: {
        frequency: 2,
        capping: 0.1,
        interval: 30,
        timeout: 5,
        everyPage: false
      }
    });
    inAppArmed = true;
    debugLog('inApp armed (2 ads / 6min, 30s gap, 5s delay)');
  } catch (e) { debugLog('arm failed:', e); }
}
