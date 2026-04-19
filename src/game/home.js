import { theme } from '../ui/theme.js';
import { t, getLanguage } from '../i18n/i18n.js';
import { formatStreakDays } from '../i18n/plural.js';
import { getBestScore, getStreak, isDailyCompletedToday, msUntilTomorrow, getTodayBestScore, getXP, getCoins, getLevelFromXP, getXPProgressInLevel } from './stats.js';
import { getFreeDailyQuota, getTodayFreeUsed, hasStreakFreeze, getStreakFreezeAvailable, hasPendingStreakFreezeToast, clearPendingStreakFreezeToast, getPendingUnlock, markUnlockAnnounced } from './powerups.js';
import { QUESTIONS_PER_SESSION } from './quiz.js';
import { playClick, playWhoosh } from '../ui/sounds.js';
import { pulseStreakFlame } from '../ui/juiceEffects.js';

const STYLE_ID = 'qd-home-styles';
let lastCallbacks = null;

function injectHomeStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const s = theme.shadows;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-home {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      min-height: 100dvh;
      padding-left: max(24px, env(safe-area-inset-left, 0px));
      padding-right: max(24px, env(safe-area-inset-right, 0px));
      padding-bottom: max(32px, calc(env(safe-area-inset-bottom, 0px) + 16px));
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-home-top {
      padding-top: max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem));
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    .qd-home-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 2rem;
      letter-spacing: -0.02em;
      color: ${c.text};
      margin-top: 8px;
      text-align: center;
      line-height: 1.1;
    }
    .qd-home-tagline {
      font-size: 0.85rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${c.textMuted};
      margin-top: 8px;
      text-align: center;
      font-weight: 500;
    }

    .qd-incoming-challenge {
      display: flex;
      align-items: center;
      padding: 1.75rem 1.25rem;
      margin-top: 20px;
      margin-bottom: 1.25rem;
      border-radius: 16px;
      background: linear-gradient(135deg, #2a1a0a 0%, #3d2817 50%, #2a1a0a 100%);
      border: 2px solid rgba(255, 193, 7, 0.6);
      position: relative;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: transform 200ms ease, filter 200ms ease;
      animation: bannerGlowPulse 2.2s ease-in-out infinite;
    }
    .qd-incoming-challenge:hover {
      transform: translateY(-2px);
      filter: brightness(1.08);
    }
    .qd-incoming-challenge:active { transform: scale(0.98); }
    .qd-incoming-challenge:focus-visible {
      outline: 2px solid #FFC107;
      outline-offset: 2px;
    }
    @keyframes bannerGlowPulse {
      0% {
        box-shadow:
          0 0 20px rgba(255, 193, 7, 0.25),
          0 8px 32px rgba(255, 193, 7, 0.15),
          inset 0 0 30px rgba(255, 193, 7, 0.08);
      }
      50% {
        box-shadow:
          0 0 44px rgba(255, 193, 7, 0.6),
          0 8px 52px rgba(255, 193, 7, 0.4),
          inset 0 0 44px rgba(255, 193, 7, 0.22);
      }
      100% {
        box-shadow:
          0 0 20px rgba(255, 193, 7, 0.25),
          0 8px 32px rgba(255, 193, 7, 0.15),
          inset 0 0 30px rgba(255, 193, 7, 0.08);
      }
    }
    .qd-challenge-icon {
      font-size: 2.5rem;
      flex-shrink: 0;
      margin-right: 1rem;
      line-height: 1;
      filter: drop-shadow(0 2px 8px rgba(255, 193, 7, 0.4));
    }
    .qd-challenge-msg {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      text-align: left;
    }
    .qd-challenge-label {
      font-family: ${theme.fonts.display};
      font-size: 0.85rem;
      font-weight: 700;
      color: #FFC107;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      line-height: 1.1;
      margin-bottom: 0.4rem;
    }
    .qd-challenge-beat {
      font-family: ${theme.fonts.body};
      font-size: 1.1rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.15;
      display: inline-flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .qd-challenge-beat .qd-challenge-score {
      font-family: ${theme.fonts.display};
      font-size: 2.1rem;
      font-weight: 800;
      color: #FFD54F;
      line-height: 1;
      display: inline-block;
      transform-origin: center;
      animation: challengePulse 2s ease-in-out infinite;
      text-shadow: 0 0 8px rgba(255, 213, 79, 0.4);
    }
    @keyframes challengePulse {
      0%   { transform: scale(1);    text-shadow: 0 0 8px rgba(255, 213, 79, 0.4); }
      50%  { transform: scale(1.08); text-shadow: 0 0 16px rgba(255, 213, 79, 0.8); }
      100% { transform: scale(1);    text-shadow: 0 0 8px rgba(255, 213, 79, 0.4); }
    }

    /* Stage 7.3: compact stat chip row — replaces the old 2-column card grid
       to reclaim ~80px of above-fold space on 360×640. */
    .qd-home-chiprow {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .qd-home-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 0.82rem;
      font-weight: 600;
      color: ${c.text};
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      line-height: 1;
    }
    .qd-home-chip.is-dim { opacity: 0.55; }
    .qd-home-chip-ico { font-size: 0.92rem; line-height: 1; display: inline-block; }
    .qd-home-chip-val { font-family: ${theme.fonts.display}; font-weight: 700; color: ${c.accent}; font-variant-numeric: tabular-nums; }
    .qd-home-chip-freeze {
      cursor: pointer;
      background: rgba(79,195,255,0.1);
      border-color: rgba(79,195,255,0.4);
      -webkit-tap-highlight-color: transparent;
    }
    .qd-home-chip-freeze:hover {
      background: rgba(79,195,255,0.18);
      border-color: rgba(79,195,255,0.65);
    }

    /* Inbox-card mood chip (green=you lead, amber=they lead, red=close game) */
    .qd-inbox-mood {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 8px;
      line-height: 1.3;
      vertical-align: middle;
      white-space: nowrap;
    }
    .qd-inbox-mood.is-lead   { background: rgba(16,185,129,0.18); color: #10B981; border: 1px solid rgba(16,185,129,0.45); }
    .qd-inbox-mood.is-behind { background: rgba(245,158,11,0.18); color: #F59E0B; border: 1px solid rgba(245,158,11,0.45); }
    .qd-inbox-mood.is-close  { background: rgba(248,113,113,0.18); color: #F87171; border: 1px solid rgba(248,113,113,0.45); }

    .qd-home-play {
      position: relative;
      width: 220px;
      height: 80px;
      margin: 1rem auto 0.5rem auto;
      background: #10B981;
      color: #FFFFFF;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: ${r.xl};
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      text-shadow: 0 1px 0 rgba(0,0,0,0.2);
      box-shadow:
        0 4px 0 #047857,
        0 8px 24px rgba(16, 185, 129, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition: all 180ms ease-out;
    }
    .qd-home-play:hover {
      background: #0EA371;
      transform: translateY(-2px);
      box-shadow:
        0 2px 0 #047857,
        0 12px 32px rgba(16, 185, 129, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .qd-home-play:active {
      transform: translateY(2px);
      box-shadow:
        0 0 0 #047857,
        0 4px 12px rgba(16, 185, 129, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    .qd-home-streak-note {
      font-size: 0.7rem;
      color: ${c.textMuted};
      margin-top: 8px;
      text-align: center;
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    .qd-home-countdown-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin-top: 14px;
    }
    .qd-home-countdown-label {
      font-size: 0.7rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${c.textMuted};
      font-weight: 600;
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }
    .qd-home-countdown-value {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.6rem;
      color: ${c.accent};
      letter-spacing: 2px;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
    }
    .qd-home-view-result {
      margin-top: 6px;
      background: transparent;
      border: none;
      font-family: ${theme.fonts.body};
      font-size: 0.8rem;
      font-weight: 600;
      color: ${c.textDim};
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: ${c.stroke};
      text-underline-offset: 3px;
      padding: 6px 10px;
      border-radius: ${r.sm};
      transition: color 0.15s, text-decoration-color 0.15s;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .qd-home-view-result:hover {
      color: ${c.text};
      text-decoration-color: ${c.strokeStrong};
    }

    /* Quick Play button — always available (even when Daily is done). Two variants:
         base  = muted dark secondary (when Daily not done — keeps main PLAY as primary)
         --primary = emerald, matches main PLAY (when Daily done — this is the actionable CTA) */
    .qd-home-quickplay-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 1rem;
    }
    .qd-home-quickplay {
      width: 220px;
      min-height: 52px;
      padding: 0.85rem 1.25rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      color: ${c.text};
      font-family: ${theme.fonts.body};
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: background 0.15s, border-color 0.15s, transform 0.12s;
    }
    .qd-home-quickplay:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-1px);
    }
    .qd-home-quickplay:active { transform: translateY(1px); }
    .qd-home-quickplay--primary {
      background: #10B981;
      border: 1px solid rgba(255,255,255,0.12);
      border-top: 1px solid rgba(255,255,255,0.28);
      color: #ffffff;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-shadow: 0 1px 0 rgba(0,0,0,0.2);
      box-shadow:
        0 4px 0 #047857,
        0 8px 24px rgba(16, 185, 129, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition: all 180ms ease-out;
    }
    .qd-home-quickplay--primary:hover {
      background: #0EA371;
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-2px);
      box-shadow:
        0 2px 0 #047857,
        0 12px 32px rgba(16, 185, 129, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .qd-home-quickplay--primary:active {
      transform: translateY(2px);
      box-shadow:
        0 0 0 #047857,
        0 4px 12px rgba(16, 185, 129, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    .qd-home-quickplay-hint {
      margin-top: 0.35rem;
      font-size: 0.75rem;
      color: ${c.textMuted};
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    /* Play with Friend — indigo/purple gradient, visually distinct from
       emerald (Daily primary) and amber (challenge banner). Same geometry
       as the Daily PLAY button (220x80) so layout rhythm is preserved. */
    .qd-home-play-friend {
      position: relative;
      width: 220px;
      min-height: 80px;
      margin: 1rem auto 0.25rem auto;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: #FFFFFF;
      border: 1px solid rgba(255,255,255,0.14);
      border-top: 1px solid rgba(255,255,255,0.28);
      border-radius: ${r.xl};
      font-family: ${theme.fonts.body};
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      text-align: left;
      box-shadow:
        0 4px 0 #3730a3,
        0 8px 24px rgba(124, 58, 237, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.22);
      transition: all 180ms ease-out;
    }
    .qd-home-play-friend:hover {
      filter: brightness(1.08);
      transform: translateY(-2px);
      box-shadow:
        0 2px 0 #3730a3,
        0 12px 32px rgba(124, 58, 237, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }
    .qd-home-play-friend:active {
      transform: translateY(2px);
      box-shadow:
        0 0 0 #3730a3,
        0 4px 12px rgba(124, 58, 237, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    .qd-home-play-friend.is-loading {
      opacity: 0.6;
      cursor: wait;
      pointer-events: none;
    }
    .qd-home-play-friend .qd-friend-icon {
      font-size: 1.8rem;
      line-height: 1;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
    }
    .qd-home-play-friend .qd-friend-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }
    .qd-home-play-friend .qd-friend-label {
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1.1;
      color: #ffffff;
      text-shadow: 0 1px 0 rgba(0,0,0,0.2);
    }
    .qd-home-play-friend .qd-friend-sub {
      font-size: 0.72rem;
      font-weight: 500;
      color: rgba(255,255,255,0.82);
      letter-spacing: 0.01em;
      line-height: 1.2;
    }
    /* Red "your turn" badge anchored top-right of the Play-with-Friend button. */
    .qd-home-play-friend .qd-turn-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: #EF4444;
      color: #ffffff;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 0.75rem;
      line-height: 22px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(239,68,68,0.5), 0 0 0 2px rgba(5,2,15,0.85);
      letter-spacing: 0;
      display: none;
    }
    .qd-home-play-friend .qd-turn-badge.is-visible { display: inline-block; }

    /* Active Matches inbox — sits between Quick Play and the Level card.
       Hidden by default; revealed when callbacks.loadMatches resolves with ≥1 entry. */
    .qd-home-inbox {
      margin-top: 1rem;
      width: 100%;
      display: none;
      flex-direction: column;
      gap: 8px;
    }
    .qd-home-inbox.is-visible { display: flex; }
    .qd-home-inbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 4px;
    }
    .qd-home-inbox-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${c.textMuted};
    }
    .qd-home-inbox-count {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.82rem;
      color: ${c.textMuted};
      font-variant-numeric: tabular-nums;
    }
    .qd-inbox-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: ${r.lg};
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      text-align: left;
      color: ${c.text};
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .qd-inbox-card:hover {
      background: rgba(255,255,255,0.07);
      border-color: rgba(255,255,255,0.14);
    }
    .qd-inbox-card:active { transform: translateY(1px); }
    .qd-inbox-card.is-yourturn { border-color: rgba(16,185,129,0.4); }
    .qd-inbox-card.is-result { border-color: rgba(255,193,7,0.45); }
    .qd-inbox-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 1.5px solid rgba(255,255,255,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      font-size: 1.2rem;
      color: ${c.textMuted};
    }
    .qd-inbox-avatar img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .qd-inbox-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .qd-inbox-name {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.95rem;
      color: ${c.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qd-inbox-status {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: ${c.textMuted};
    }
    .qd-inbox-status.qd-status-yourturn {
      color: #10B981;
      animation: qdInboxPulse 1.8s ease-in-out infinite;
    }
    .qd-inbox-status.qd-status-newresult { color: #FFD54F; }
    @keyframes qdInboxPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    .qd-inbox-chevron {
      color: rgba(255,255,255,0.35);
      font-size: 1.1rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .qd-home-inbox-viewall {
      background: transparent;
      border: none;
      font-family: ${theme.fonts.body};
      font-size: 0.78rem;
      font-weight: 600;
      color: ${c.textDim};
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: ${c.stroke};
      text-underline-offset: 3px;
      padding: 6px 8px;
      align-self: center;
      -webkit-tap-highlight-color: transparent;
    }
    .qd-home-inbox-viewall:hover { color: ${c.text}; }
    .qd-inbox-skeleton {
      height: 56px;
      border-radius: ${r.lg};
      background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      background-size: 200% 100%;
      animation: qdInboxSkel 1.2s ease-in-out infinite;
    }
    @keyframes qdInboxSkel {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    .qd-level-card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      border-radius: ${r.lg};
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease;
      font-family: ${theme.fonts.body};
      color: inherit;
      text-align: left;
    }
    .qd-level-card:hover {
      border-color: rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
    }
    .qd-level-card:active { transform: translateY(1px); }
    .qd-level-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .qd-level-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #f5b342;
      text-shadow: 0 0 10px rgba(245,180,60,0.3);
    }
    .qd-level-coins {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.9rem;
      color: #ffd36b;
      font-variant-numeric: tabular-nums;
    }
    .qd-level-track {
      height: 6px;
      width: 100%;
      background: rgba(255,255,255,0.08);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 2px;
    }
    .qd-level-fill {
      height: 100%;
      background: linear-gradient(90deg, #f5b342 0%, #ffd36b 100%);
      border-radius: 999px;
      box-shadow: 0 0 12px rgba(245,180,60,0.55);
      transition: width 0.5s ease-out;
    }
    .qd-level-xp {
      font-size: 0.72rem;
      color: ${c.textMuted};
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    .qd-level-sub {
      font-size: 0.7rem;
      color: ${c.textDim};
      font-weight: 500;
    }

  `;
  document.head.appendChild(style);
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function clearCountdown() {
  if (window.__homeCountdownInterval) {
    clearInterval(window.__homeCountdownInterval);
    window.__homeCountdownInterval = null;
  }
}

function showHomeToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: rgba(30,20,10,0.92); backdrop-filter: blur(10px);
    color: #fff; padding: 10px 20px; border-radius: 999px;
    font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600;
    box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 14px rgba(79,195,255,0.35);
    border: 1px solid rgba(79,195,255,0.4);
    z-index: 9996;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => { try { toast.remove(); } catch (e) {} }, 320);
  }, 1800);
}

export function renderHomeScreen(container, callbacks = {}) {
  injectHomeStyles();
  clearCountdown();
  container.style.background = 'transparent';
  lastCallbacks = callbacks;

  if (sessionStorage.getItem('quiz_returned_home') === '1') {
    sessionStorage.removeItem('quiz_returned_home');
    setTimeout(() => playWhoosh(), 100);
  }

  const { onPlayDaily, onPlayQuick, onViewDailyResult, onPlayWithFriend, hasChallenge, incomingChallenge, loadMatches, onResumeMatch, onViewAllMatches, currentPlayerId } = callbacks;

  const best = getBestScore();
  const streak = getStreak();
  const dailyDone = isDailyCompletedToday();

  const root = document.createElement('div');
  root.className = 'qd-home';

  const top = document.createElement('div');
  top.className = 'qd-home-top';

  const title = document.createElement('div');
  title.className = 'qd-home-title';
  title.textContent = t('appName');

  const tagline = document.createElement('div');
  tagline.className = 'qd-home-tagline';
  tagline.textContent = t('tagline');

  top.appendChild(title);
  top.appendChild(tagline);

  // Stage 7.3: compact stat-chip row — replaces the 2-column card grid so
  // Play-with-Friend becomes visible above-fold on 360×640. Saves ~80px.
  const chipRow = document.createElement('div');
  chipRow.className = 'qd-home-chiprow';

  const bestChip = document.createElement('div');
  bestChip.className = 'qd-home-chip';
  bestChip.innerHTML = `<span class="qd-home-chip-ico">🏆</span><span class="qd-home-chip-val">${best}</span>`;

  const streakChip = document.createElement('div');
  streakChip.className = 'qd-home-chip' + (streak > 0 ? '' : ' is-dim');
  if (streak > 0) {
    streakChip.innerHTML = `<span class="qd-home-chip-ico qd-home-chip-flame">🔥</span><span class="qd-home-chip-val"></span>`;
    streakChip.querySelector('.qd-home-chip-val').textContent = formatStreakDays(streak, getLanguage());
    if (streak >= 3) {
      try { pulseStreakFlame(streakChip.querySelector('.qd-home-chip-flame')); } catch (e) {}
    }
  } else {
    streakChip.innerHTML = `<span class="qd-home-chip-ico">·</span><span class="qd-home-chip-val">0</span>`;
  }

  chipRow.appendChild(bestChip);
  chipRow.appendChild(streakChip);

  // Persistent ❄️ chip — visible when Streak Freeze is unlocked AND this
  // week's freeze is still available. Tap → small toast.
  const _xpForChip = getXP();
  const _lvlForChip = getLevelFromXP(_xpForChip);
  if (hasStreakFreeze(_lvlForChip) && getStreakFreezeAvailable()) {
    const freezeChip = document.createElement('button');
    freezeChip.type = 'button';
    freezeChip.className = 'qd-home-chip qd-home-chip-freeze';
    freezeChip.innerHTML = `<span class="qd-home-chip-ico">❄️</span>`;
    freezeChip.setAttribute('aria-label', t('streakFreezeReady'));
    freezeChip.addEventListener('click', () => {
      playClick();
      showHomeToast(t('streakFreezeReady'));
    });
    chipRow.appendChild(freezeChip);
  }

  top.appendChild(chipRow);

  root.appendChild(top);

  if (hasChallenge && typeof incomingChallenge === 'number') {
    const banner = document.createElement('div');
    banner.className = 'qd-incoming-challenge';

    const sword = document.createElement('div');
    sword.className = 'qd-challenge-icon';
    sword.textContent = '⚔️';

    const msgCol = document.createElement('div');
    msgCol.className = 'qd-challenge-msg';

    // Top line: small uppercase muted-gold eyebrow label
    const labelEl = document.createElement('div');
    labelEl.className = 'qd-challenge-label';
    labelEl.textContent = t('challengeLabel');

    // Bottom line: "Beat {score}!" with the score in the big pulsing gold number
    const beatEl = document.createElement('div');
    beatEl.className = 'qd-challenge-beat';
    const SCORE_SLOT = '__QD_SCORE__';
    const raw = t('challengeBeat', { score: SCORE_SLOT });
    const [prefixText, suffixText] = raw.split(SCORE_SLOT);
    if (prefixText) {
      const pre = document.createElement('span');
      pre.textContent = prefixText;
      beatEl.appendChild(pre);
    }
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'qd-challenge-score';
    scoreSpan.textContent = String(incomingChallenge);
    beatEl.appendChild(scoreSpan);
    if (suffixText !== undefined) {
      const suf = document.createElement('span');
      suf.textContent = suffixText;
      beatEl.appendChild(suf);
    }

    msgCol.appendChild(labelEl);
    msgCol.appendChild(beatEl);

    banner.appendChild(sword);
    banner.appendChild(msgCol);

    banner.setAttribute('role', 'button');
    banner.setAttribute('tabindex', '0');

    const startChallengeGame = () => {
      playClick();
      // Same pathway the PLAY button uses. main.js snapshots `incomingChallenge` as
      // `activeChallenge` at session start and threads it through to `challengeTarget`
      // on the Result screen, so the comparison banner renders there automatically.
      if (onPlayQuick) onPlayQuick();
    };
    banner.addEventListener('click', startChallengeGame);
    banner.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startChallengeGame();
      }
    });

    root.appendChild(banner);
  }

  if (dailyDone) {
    const completedCard = document.createElement('div');
    completedCard.className = 'qd-home-completed';
    completedCard.style.cssText = `
      width: 260px;
      min-height: 72px;
      margin: 1rem auto 0.5rem auto;
      background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
      border: 1.5px solid rgba(125,223,125,0.35);
      border-radius: 20px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      cursor: default;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
    `;

    const check = document.createElement('div');
    check.textContent = '✓';
    check.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(125,223,125,0.15);
      border: 1px solid rgba(125,223,125,0.4);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
    `;

    const label = document.createElement('div');
    label.textContent = t('completedToday');
    label.style.cssText = `
      color: ${theme.colors.text};
      font-weight: 600;
      font-size: 1rem;
      letter-spacing: 0.3px;
    `;

    completedCard.appendChild(check);
    completedCard.appendChild(label);
    root.appendChild(completedCard);
  } else {
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'qd-home-play';
    playBtn.textContent = t('playButton');
    playBtn.addEventListener('click', () => {
      playClick();
      if (onPlayDaily) onPlayDaily();
    });
    root.appendChild(playBtn);
  }

  if (dailyDone) {
    const cdWrap = document.createElement('div');
    cdWrap.className = 'qd-home-countdown-wrap';

    const cdLabel = document.createElement('div');
    cdLabel.className = 'qd-home-countdown-label';
    cdLabel.textContent = '⏱ ' + t('nextChallengeIn');

    const cdValue = document.createElement('div');
    cdValue.className = 'qd-home-countdown-value';
    cdValue.textContent = formatCountdown(msUntilTomorrow());

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'qd-home-view-result';
    viewBtn.textContent = t('viewResult');
    viewBtn.addEventListener('click', () => {
      playClick();
      if (onViewDailyResult) onViewDailyResult();
    });

    cdWrap.appendChild(cdLabel);
    cdWrap.appendChild(cdValue);
    cdWrap.appendChild(viewBtn);
    root.appendChild(cdWrap);

    window.__homeCountdownInterval = setInterval(() => {
      const remaining = msUntilTomorrow();
      if (remaining <= 0) {
        clearCountdown();
        if (!isDailyCompletedToday()) {
          renderHomeScreen(container, lastCallbacks || {});
        } else {
          cdValue.textContent = formatCountdown(0);
        }
        return;
      }
      cdValue.textContent = formatCountdown(remaining);
    }, 1000);
  } else {
    const streakNote = document.createElement('div');
    streakNote.className = 'qd-home-streak-note';
    streakNote.textContent = '🔥 ' + t('dailyPlayCountsStreak');
    root.appendChild(streakNote);
  }

  // Play with Friend — new viral CTA. Indigo/purple gradient to stand apart from
  // emerald Daily PLAY (above) and muted Quick Play (below). Only rendered when
  // the host wired a callback (keeps Home working on platforms without matchmaking).
  if (onPlayWithFriend) {
    const friendBtn = document.createElement('button');
    friendBtn.type = 'button';
    friendBtn.id = 'btn-play-with-friend';
    friendBtn.className = 'qd-home-play-friend';

    const icon = document.createElement('span');
    icon.className = 'qd-friend-icon';
    icon.textContent = '⚔️';

    const textCol = document.createElement('span');
    textCol.className = 'qd-friend-text';
    const label = document.createElement('span');
    label.className = 'qd-friend-label';
    label.textContent = t('playWithFriend');
    const sub = document.createElement('span');
    sub.className = 'qd-friend-sub';
    sub.textContent = t('playWithFriendSub');
    textCol.appendChild(label);
    textCol.appendChild(sub);

    const turnBadge = document.createElement('span');
    turnBadge.id = 'qd-turn-badge';
    turnBadge.className = 'qd-turn-badge';
    turnBadge.textContent = '0';

    friendBtn.appendChild(icon);
    friendBtn.appendChild(textCol);
    friendBtn.appendChild(turnBadge);

    friendBtn.addEventListener('click', async () => {
      if (friendBtn.classList.contains('is-loading')) return;
      playClick();
      friendBtn.classList.add('is-loading');
      try {
        const ok = await onPlayWithFriend();
        if (!ok) {
          // Host (main.js) already showed a toast on failure. Restore the button.
          friendBtn.classList.remove('is-loading');
        }
        // On success, host navigates away and the DOM is replaced — no cleanup needed.
      } catch (e) {
        friendBtn.classList.remove('is-loading');
      }
    });

    root.appendChild(friendBtn);
  }

  // Quick Play — always available. Emerald primary when Daily done (it IS the actionable
  // play CTA then); muted secondary when Daily not done (so the main PLAY stays the star).
  const quickPlayWrap = document.createElement('div');
  quickPlayWrap.className = 'qd-home-quickplay-wrap';
  const quickPlayBtn = document.createElement('button');
  quickPlayBtn.type = 'button';
  quickPlayBtn.className = dailyDone
    ? 'qd-home-quickplay qd-home-quickplay--primary'
    : 'qd-home-quickplay';
  quickPlayBtn.textContent = t('quickPlay');
  quickPlayBtn.addEventListener('click', () => {
    playClick();
    if (onPlayQuick) onPlayQuick();
  });
  const quickPlayHint = document.createElement('div');
  quickPlayHint.className = 'qd-home-quickplay-hint';
  quickPlayHint.textContent = t('quickPlayNoStreak');
  quickPlayWrap.appendChild(quickPlayBtn);
  quickPlayWrap.appendChild(quickPlayHint);
  root.appendChild(quickPlayWrap);

  // Active Matches inbox — hidden until loadMatches resolves with ≥1 entry.
  const inbox = document.createElement('section');
  inbox.className = 'qd-home-inbox';
  inbox.setAttribute('aria-live', 'polite');
  root.appendChild(inbox);

  if (typeof loadMatches === 'function') {
    // Non-blocking async fetch. Render a single skeleton card during the delay,
    // cleared either on resolve or after 800ms (gives the section a bit of
    // visual stability rather than flickering in/out).
    const skel = document.createElement('div');
    skel.className = 'qd-inbox-skeleton';
    inbox.appendChild(skel);
    inbox.classList.add('is-visible');

    loadMatches().then((list) => {
      const arr = Array.isArray(list) ? list : [];

      // Compute "your-turn" count and update the red badge on the friend button.
      const turnBadgeEl = document.getElementById('qd-turn-badge');
      if (turnBadgeEl) {
        const myId = currentPlayerId || null;
        const turnCount = arr.filter((m) => {
          if (!m || m.status === 'complete') return false;
          const slot = typeof m.getPlayerSlot === 'function' ? m.getPlayerSlot(myId) : null;
          // pending_a = waiting on player A to play; player A has turn.
          // pending_b = waiting on player B to play; player B has turn.
          return (m.status === 'pending_a' && slot === 'a')
              || (m.status === 'pending_b' && slot === 'b');
        }).length;
        if (turnCount > 0) {
          turnBadgeEl.textContent = String(turnCount);
          turnBadgeEl.classList.add('is-visible');
        } else {
          turnBadgeEl.classList.remove('is-visible');
        }
      }

      inbox.innerHTML = '';
      if (arr.length === 0) {
        inbox.classList.remove('is-visible');
        return;
      }
      inbox.classList.add('is-visible');

      const header = document.createElement('div');
      header.className = 'qd-home-inbox-header';
      const titleEl = document.createElement('span');
      titleEl.className = 'qd-home-inbox-title';
      titleEl.textContent = t('activeMatches');
      const countEl = document.createElement('span');
      countEl.className = 'qd-home-inbox-count';
      countEl.textContent = '(' + arr.length + ')';
      header.appendChild(titleEl);
      header.appendChild(countEl);
      inbox.appendChild(header);

      const displayList = arr.slice(0, 5);
      for (const m of displayList) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'qd-inbox-card';

        const myId = currentPlayerId || null;
        const slot = typeof m.getPlayerSlot === 'function' ? m.getPlayerSlot(myId) : null;
        const oppName = (m.opponent && m.opponent.name) ? m.opponent.name : '—';
        const oppPhoto = m.opponent && m.opponent.photo ? m.opponent.photo : '';

        // Determine status label + modifier classes.
        let statusText = '';
        let statusClass = '';
        let cardModifier = '';
        if (m.status === 'complete') {
          if (m.rewardsClaimed) {
            statusText = t('finished');
            statusClass = '';
          } else {
            statusText = t('newResult');
            statusClass = 'qd-status-newresult';
            cardModifier = 'is-result';
          }
        } else if ((m.status === 'pending_a' && slot === 'a')
                || (m.status === 'pending_b' && slot === 'b')) {
          statusText = t('yourTurn');
          statusClass = 'qd-status-yourturn';
          cardModifier = 'is-yourturn';
        } else {
          statusText = t('waitingFor', { name: oppName });
        }
        if (cardModifier) card.classList.add(cardModifier);

        const avatar = document.createElement('span');
        avatar.className = 'qd-inbox-avatar';
        if (oppPhoto) {
          const img = document.createElement('img');
          img.src = oppPhoto;
          img.alt = '';
          img.onerror = () => { avatar.innerHTML = '👤'; };
          avatar.appendChild(img);
        } else {
          avatar.textContent = '👤';
        }

        const textCol = document.createElement('span');
        textCol.className = 'qd-inbox-text';
        const nameEl = document.createElement('span');
        nameEl.className = 'qd-inbox-name';
        nameEl.textContent = oppName;

        // Stage 7.3: opponent mood chip — derived from the match score delta.
        // Only shown on in-progress matches (complete matches get the existing
        // "New result!" / "Finished" status, no mood needed).
        let moodChip = null;
        if (m.status !== 'complete') {
          const myScore = slot === 'a' ? m.playerAScore : m.playerBScore;
          const oppScore = slot === 'a' ? m.playerBScore : m.playerAScore;
          const myPlayed = myScore != null;
          const oppPlayed = oppScore != null;
          if (myPlayed && !oppPlayed) {
            moodChip = { cls: 'is-lead',   text: '🎯 You lead' };
          } else if (!myPlayed && oppPlayed) {
            moodChip = { cls: 'is-behind', text: '🔥 They lead' };
          } else if (myPlayed && oppPlayed && Math.abs(myScore - oppScore) < 50) {
            moodChip = { cls: 'is-close',  text: '😤 Close game' };
          }
        }
        if (moodChip) {
          const chip = document.createElement('span');
          chip.className = 'qd-inbox-mood ' + moodChip.cls;
          chip.textContent = moodChip.text;
          nameEl.appendChild(chip);
        }

        const statusEl = document.createElement('span');
        statusEl.className = 'qd-inbox-status' + (statusClass ? ' ' + statusClass : '');
        statusEl.textContent = statusText;
        textCol.appendChild(nameEl);
        textCol.appendChild(statusEl);

        const chevron = document.createElement('span');
        chevron.className = 'qd-inbox-chevron';
        chevron.textContent = '›';

        card.appendChild(avatar);
        card.appendChild(textCol);
        card.appendChild(chevron);

        card.addEventListener('click', () => {
          playClick();
          if (onResumeMatch) onResumeMatch(m);
        });
        inbox.appendChild(card);
      }

      // "View all (N)" link when list exceeds cap.
      if (arr.length > 5 && typeof onViewAllMatches === 'function') {
        const viewAllBtn = document.createElement('button');
        viewAllBtn.type = 'button';
        viewAllBtn.className = 'qd-home-inbox-viewall';
        viewAllBtn.textContent = t('viewAll', { n: arr.length });
        viewAllBtn.addEventListener('click', () => {
          playClick();
          onViewAllMatches();
        });
        inbox.appendChild(viewAllBtn);
      }
    }).catch((e) => {
      console.error('[home] loadMatches failed:', e);
      inbox.innerHTML = '';
      inbox.classList.remove('is-visible');
    });
  }

  const xp = getXP();
  const coins = getCoins();
  const level = getLevelFromXP(xp);
  const xpProg = getXPProgressInLevel(xp);

  const levelCard = document.createElement('button');
  levelCard.type = 'button';
  levelCard.className = 'qd-level-card';

  const lvlHeader = document.createElement('div');
  lvlHeader.className = 'qd-level-header';
  const lvlTitle = document.createElement('div');
  lvlTitle.className = 'qd-level-title';
  lvlTitle.textContent = `⭐ ${t('levelLabel')} ${level}`;
  const lvlCoins = document.createElement('div');
  lvlCoins.className = 'qd-level-coins';
  lvlCoins.textContent = `${coins} 🪙`;
  lvlHeader.appendChild(lvlTitle);
  lvlHeader.appendChild(lvlCoins);
  levelCard.appendChild(lvlHeader);

  const lvlTrack = document.createElement('div');
  lvlTrack.className = 'qd-level-track';
  const lvlFill = document.createElement('div');
  lvlFill.className = 'qd-level-fill';
  lvlFill.style.width = xpProg.percent + '%';
  lvlTrack.appendChild(lvlFill);
  levelCard.appendChild(lvlTrack);

  const lvlXpText = document.createElement('div');
  lvlXpText.className = 'qd-level-xp';
  lvlXpText.textContent = `${xpProg.current} / ${xpProg.needed} ${t('xpLabel')}`;
  levelCard.appendChild(lvlXpText);

  const lvlSub = document.createElement('div');
  lvlSub.className = 'qd-level-sub';
  lvlSub.textContent = t('levelCardSubtitle');
  levelCard.appendChild(lvlSub);

  levelCard.addEventListener('click', () => {
    playClick();
    if (onPlayQuick) onPlayQuick();
  });

  root.appendChild(levelCard);

  // Unlock indicators row — 50/50 daily quota only. (Streak Freeze moved
  // to the top chip row in Stage 7.3 so it's discoverable above-fold.)
  const curLevel = getLevelFromXP(xp);
  const freeQuota = getFreeDailyQuota(curLevel);
  const freeUsed = getTodayFreeUsed();
  const showFreeDaily = freeQuota > 0;
  if (showFreeDaily) {
    const unlockRow = document.createElement('div');
    unlockRow.className = 'qd-home-unlock-row';
    unlockRow.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 14px;
      margin-top: 8px;
      padding: 0 4px;
      font-size: 0.72rem;
      color: ${theme.colors.textMuted};
      font-weight: 600;
      letter-spacing: 0.02em;
    `;
    const item = document.createElement('div');
    item.style.cssText = 'display:inline-flex; align-items:center; gap:6px;';
    item.innerHTML = `<span>🎯 ${freeUsed} / ${freeQuota}</span><span style="opacity:0.7;">${t('freeFiftyFiftyCaption')}</span>`;
    unlockRow.appendChild(item);
    root.appendChild(unlockRow);
  }

  // Milestone-unlock overlay — shown once per level crossing, deduplicated
  // via localStorage. Defer to next tick so Home is painted first.
  const pendingUnlock = getPendingUnlock(curLevel);
  if (pendingUnlock) {
    markUnlockAnnounced(pendingUnlock);
    setTimeout(() => {
      import('../ui/unlockOverlay.js').then(m => m.showUnlockOverlay(pendingUnlock));
    }, 180);
  }

  // Pending Streak-Freeze toast from a previous play session's freeze.
  if (hasPendingStreakFreezeToast()) {
    clearPendingStreakFreezeToast();
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.textContent = t('streakFreezeUsed');
      toast.style.cssText = `
        position: fixed; bottom: 32px; left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(79,195,255,0.95), rgba(79,129,255,0.95));
        color: #fff; padding: 12px 22px;
        border-radius: 999px;
        font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 700;
        box-shadow: 0 10px 28px rgba(79,129,255,0.45);
        z-index: 9999;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 320);
      }, 2400);
    }, 260);
  }

  const credits = document.createElement('div');
  credits.textContent = 'Sounds: Salamander Piano · CC-BY';
  credits.style.cssText = `
    margin-top: auto;
    padding-top: 8px;
    text-align: center;
    font-size: 0.6rem;
    color: ${theme.colors.textFaint};
    letter-spacing: 0.5px;
    opacity: 0.4;
  `;
  root.appendChild(credits);

  container.appendChild(root);
}
