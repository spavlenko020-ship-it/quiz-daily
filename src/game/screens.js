import { t, getLanguage } from '../i18n/i18n.js';
import { formatStreakDays } from '../i18n/plural.js';
import { playClick, playCorrect, playWrong, playTick, playFanfare, playStreakMilestone, playNewBest, playWhoosh } from '../ui/sounds.js';
import { theme } from '../ui/theme.js';

function showLevelUpOverlay(newLevel) {
  const existing = document.getElementById('qd-levelup-overlay');
  if (existing) existing.remove();

  if (!document.getElementById('qd-levelup-keyframes')) {
    const s = document.createElement('style');
    s.id = 'qd-levelup-keyframes';
    s.textContent = `
      @keyframes qdLevelUpIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
      @keyframes qdConfettiFall { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--qd-cx), 100vh) rotate(var(--qd-crot)); opacity: 0; } }
    `;
    document.head.appendChild(s);
  }

  const overlay = document.createElement('div');
  overlay.id = 'qd-levelup-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10001;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; cursor: pointer;
    padding-top: env(safe-area-inset-top, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    box-sizing: border-box;
    animation: qdLevelUpIn 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.4);
  `;
  const title = document.createElement('div');
  title.style.cssText = 'font-family:"Space Grotesk",sans-serif; font-weight:800; font-size:2.5rem; letter-spacing:0.06em; color:#f5b342; text-shadow:0 0 24px rgba(245,180,60,0.5);';
  title.textContent = t('levelUpTitle');
  const sub = document.createElement('div');
  sub.style.cssText = 'font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:2rem; color:#ffd36b; letter-spacing:0.02em;';
  sub.textContent = `${t('levelLabel')} ${newLevel}`;
  overlay.appendChild(title);
  overlay.appendChild(sub);

  const colors = ['#f5b342', '#ffd36b', '#ffab3d', '#ffe49a', '#e89a1e'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    const size = 6 + Math.random() * 6;
    const cx = (Math.random() - 0.5) * 800;
    const rot = (Math.random() * 720 - 360) + 'deg';
    const delay = Math.random() * 0.3;
    p.style.cssText = `
      position: absolute; top: 40%; left: 50%;
      width: ${size}px; height: ${size}px;
      background: ${colors[i % colors.length]};
      border-radius: 2px;
      --qd-cx: ${cx}px;
      --qd-crot: ${rot};
      animation: qdConfettiFall 1.5s ${delay}s ease-in forwards;
    `;
    overlay.appendChild(p);
  }

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 250);
  }
  overlay.addEventListener('click', dismiss);
  setTimeout(dismiss, 2500);

  document.body.appendChild(overlay);
  try { playFanfare(); } catch (e) {}
}

const STYLE_ID = 'quiz-daily-styles';
const LETTERS = ['A', 'B', 'C', 'D'];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const s = theme.shadows;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-root {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      min-height: 100vh;
      min-height: 100dvh;
      padding-top: max(16px, env(safe-area-inset-top, 0px));
      padding-left: max(16px, env(safe-area-inset-left, 0px));
      padding-right: max(16px, env(safe-area-inset-right, 0px));
      padding-bottom: max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px));
      gap: 16px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .qd-pill {
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 7px 14px;
      border-radius: ${r.pill};
      border: 1px solid ${c.stroke};
      font-family: ${theme.fonts.display};
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: ${c.textDim};
    }
    .qd-score {
      color: ${c.accent};
      font-weight: 700;
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0;
      padding: 6px 14px;
      line-height: 1;
    }
    .qd-score .qd-score-label {
      font-size: 0.58rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: ${c.textMuted};
      text-transform: uppercase;
      line-height: 1;
    }
    .qd-score .qd-score-num {
      font-family: ${theme.fonts.display};
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.05;
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
      transition: color 0.22s ease-out;
      display: inline-block;
      transform-origin: center;
    }
    .qd-score .qd-score-num.qd-score-pop {
      animation: qdScorePopAnim 300ms ease-out;
    }
    @keyframes qdScorePopAnim {
      0%   { transform: scale(1);   color: #ffffff; }
      30%  { transform: scale(1.2); color: #FFD700; }
      70%  { transform: scale(1.1); color: #FFD700; }
      100% { transform: scale(1);   color: #ffffff; }
    }

    .qd-timer-track {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .qd-timer-bar {
      height: 100%;
      width: 100%;
      background: ${c.accent};
      border-radius: 3px;
      transform-origin: left center;
      transition: none;
    }
    .qd-timer-bar.qd-pulse {
      animation: qd-timer-pulse 0.5s ease-in-out infinite;
      box-shadow: ${s.accentGlow};
    }
    @keyframes qd-timer-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }

    .qd-mid {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 16px;
      min-height: 0;
    }

    .qd-difficulty-badge {
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: ${theme.fonts.display};
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.85;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .qd-difficulty-badge .qd-diff-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .qd-difficulty-badge.qd-diff-easy { color: #4ade80; }
    .qd-difficulty-badge.qd-diff-easy .qd-diff-dot { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6); }
    .qd-difficulty-badge.qd-diff-medium { color: #fbbf24; }
    .qd-difficulty-badge.qd-diff-medium .qd-diff-dot { background: #fbbf24; box-shadow: 0 0 6px rgba(251,191,36,0.6); }
    .qd-difficulty-badge.qd-diff-hard { color: #f87171; }
    .qd-difficulty-badge.qd-diff-hard .qd-diff-dot { background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.7); }
    .qd-difficulty-badge.qd-diff-pulse {
      animation: qdDiffPulse 0.6s ease-out;
    }
    @keyframes qdDiffPulse {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.15); }
      100% { transform: scale(1); }
    }

    .qd-question-area {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 8px;
      text-align: center;
      min-height: 90px;
      max-height: 180px;
      overflow: hidden;
    }
    .qd-question {
      font-family: ${theme.fonts.display};
      font-size: clamp(1rem, 3.5vw, 1.4rem);
      font-weight: 600;
      line-height: 1.35;
      color: ${c.text};
      max-width: 720px;
      word-wrap: break-word;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 5;
      line-clamp: 5;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .qd-answers {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .qd-answer {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 52px;
      max-height: 72px;
      padding: 8px 14px;
      background: ${c.answerBg};
      color: ${c.text};
      border: 1.5px solid ${c.answerBorder};
      border-radius: ${r.lg};
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      font-family: ${theme.fonts.body};
      font-size: clamp(0.9rem, 2.8vw, 1.05rem);
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden;
    }
    .qd-answer:hover:not(:disabled) {
      background: ${c.answerBgHover};
      border-color: ${c.answerBorderHover};
    }
    .qd-answer:not(:disabled):active {
      transform: translateY(2px);
    }
    .qd-answer:disabled { cursor: default; }

    .qd-answer-letter {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: ${c.letterBadgeBg};
      border: 1px solid ${c.letterBadgeBorder};
      color: ${c.letterBadgeText};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.95rem;
    }
    .qd-answer-text {
      flex: 1;
      min-width: 0;
      text-align: left;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }

    .qd-answer.qd-correct {
      background: ${c.correctBg} !important;
      border-color: ${c.correctBorder} !important;
    }
    .qd-answer.qd-wrong {
      background: ${c.wrongBg} !important;
      border-color: ${c.wrongBorder} !important;
      animation: qd-shake 0.4s ease-in-out;
    }
    @keyframes qd-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-6px); }
      75% { transform: translateX(6px); }
    }

    .qd-float {
      position: absolute;
      left: 50%;
      top: -4px;
      transform: translate(-50%, 0);
      font-family: ${theme.fonts.display};
      font-size: 1.5rem;
      font-weight: 700;
      color: ${c.accent};
      pointer-events: none;
      animation: qd-float 0.9s ease-out forwards;
      white-space: nowrap;
      z-index: 5;
    }
    .qd-float.qd-float-neutral { color: ${c.textDim}; }
    .qd-float.qd-float-zero { color: ${c.textMuted}; }
    .qd-float .qd-float-mult {
      font-size: 11px;
      font-weight: 600;
      color: rgba(245,180,60,0.75);
      margin-left: 4px;
      letter-spacing: 0.05em;
    }
    @keyframes qd-float {
      0%   { opacity: 0; transform: translate(-50%, 0) scale(0.85); }
      20%  { opacity: 1; transform: translate(-50%, -10px) scale(1.05); }
      100% { opacity: 0; transform: translate(-50%, -56px) scale(1); }
    }

    /* ===== Finish screen ===== */
    .qd-finish {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: 100vh;
      min-height: 100dvh;
      padding-top: max(24px, calc(env(safe-area-inset-top, 0px) + 12px));
      padding-left: max(16px, env(safe-area-inset-left, 0px));
      padding-right: max(16px, env(safe-area-inset-right, 0px));
      padding-bottom: max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px));
      gap: 6px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      text-align: center;
      box-sizing: border-box;
    }
    .qd-finish-navback {
      position: absolute;
      top: max(12px, env(safe-area-inset-top, 0px));
      left: max(12px, env(safe-area-inset-left, 0px));
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      z-index: 10;
    }
    .qd-finish-navback::before {
      content: '';
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(30, 20, 15, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition: border-color 180ms ease;
    }
    .qd-finish-navback > * { position: relative; z-index: 1; }
    .qd-finish-navback {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1;
      transition: color 180ms ease, transform 120ms ease;
    }
    .qd-finish-navback:hover { color: #fff; }
    .qd-finish-navback:hover::before { border-color: rgba(255, 255, 255, 0.25); }
    .qd-finish-navback:active { transform: scale(0.95); }
    .qd-finish-top-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: ${c.textMuted};
    }
    .qd-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 8px;
      margin-bottom: 4px;
      min-height: 0;
    }
    .qd-badge {
      padding: 6px 12px;
      border-radius: 999px;
      font-family: ${theme.fonts.display};
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      opacity: 0;
      transform: scale(0.7);
    }
    .qd-badge.qd-badge-show {
      animation: badgePop 0.4s ease-out forwards;
    }
    .qd-badge-best {
      background: linear-gradient(135deg, rgba(245,180,60,0.2) 0%, rgba(245,180,60,0.08) 100%);
      border: 1px solid rgba(245,180,60,0.4);
      color: ${c.accent};
      letter-spacing: 1.5px;
    }
    .qd-badge-streak {
      background: linear-gradient(135deg, rgba(255,140,40,0.22) 0%, rgba(255,90,40,0.12) 100%);
      border: 1px solid rgba(255,140,40,0.45);
      color: #ffb366;
    }
    @keyframes badgePop {
      0%   { opacity: 0; transform: scale(0.7); }
      60%  { opacity: 1; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    .qd-finish-score-big {
      font-family: ${theme.fonts.display};
      font-size: 4rem;
      font-weight: 700;
      color: ${c.accent};
      line-height: 1;
      margin: 4px 0 0 0;
      text-shadow: 0 0 32px rgba(245,180,60,0.22);
    }
    @media (min-width: 481px) {
      .qd-finish-score-big { font-size: 4.5rem; }
    }
    .qd-finish-score-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: ${c.textMuted};
      margin-top: 2px;
    }

    .qd-stats-row {
      display: flex;
      justify-content: center;
      gap: 6px;
      width: 100%;
      max-width: 480px;
      margin-top: 6px;
    }
    .qd-stat {
      flex: 1;
      padding: 6px 6px;
      background: rgba(255,255,255,0.03);
      border: 1px solid ${c.stroke};
      border-radius: ${r.md};
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .qd-stat-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      margin-bottom: 2px;
    }
    .qd-stat-correct .qd-stat-dot { background: ${c.correct}; }
    .qd-stat-wrong .qd-stat-dot { background: ${c.wrong}; }
    .qd-stat-accuracy .qd-stat-dot { background: ${c.accent}; }
    .qd-stat-value {
      font-family: ${theme.fonts.display};
      font-size: 1.15rem;
      font-weight: 700;
      color: ${c.text};
      line-height: 1;
    }
    .qd-stat-accuracy .qd-stat-value { color: ${c.accent}; }
    .qd-stat-label {
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${c.textMuted};
      margin-top: 2px;
    }

    .qd-toggle-answers {
      margin-top: 2px;
      background: transparent;
      border: 1px solid ${c.stroke};
      border-radius: ${r.pill};
      padding: 10px 18px;
      font-family: ${theme.fonts.body};
      font-size: 0.8rem;
      font-weight: 500;
      color: ${c.textDim};
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s;
    }
    .qd-toggle-answers:hover { border-color: ${c.strokeStrong}; }

    .qd-answers-list {
      width: 100%;
      max-width: 520px;
      display: none;
      flex-direction: column;
      gap: 6px;
      max-height: 30vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-right: 4px;
    }
    .qd-answers-list.qd-open { display: flex; }
    .qd-answer-card {
      position: relative;
      padding: 10px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid ${c.stroke};
      border-left: 3px solid ${c.stroke};
      border-radius: ${r.md};
      text-align: left;
    }
    .qd-answer-card.qd-ac-correct { border-left-color: ${c.correctBorder}; }
    .qd-answer-card.qd-ac-wrong { border-left-color: ${c.wrongBorder}; }
    .qd-answer-card .qd-ac-q {
      font-size: 0.85rem;
      font-weight: 600;
      color: ${c.text};
      margin-bottom: 4px;
      padding-right: 58px;
    }
    .qd-answer-card .qd-ac-your,
    .qd-answer-card .qd-ac-corr {
      font-size: 0.75rem;
      color: ${c.textDim};
      margin-top: 2px;
    }
    .qd-answer-card .qd-ac-your b { font-weight: 600; color: ${c.text}; }
    .qd-answer-card .qd-ac-corr b { font-weight: 600; color: ${c.correct}; }
    .qd-answer-card .qd-ac-points {
      position: absolute;
      top: 10px;
      right: 10px;
      font-family: ${theme.fonts.display};
      color: ${c.accent};
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .qd-finish-buttons {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    /* ===== Shared CTA button system =====
       .qd-btn-primary-hero  — the ONE bright primary (amber gradient). Use once per screen.
       .qd-btn-secondary     — dark glass with muted gold border. Use for supporting actions. */
    .qd-btn-primary-hero {
      position: relative;
      overflow: hidden;
      width: 100%;
      padding: 1.1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(145deg, #FFB547 0%, #FF8C1A 45%, #E56F00 100%);
      color: #3A1A00;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-shadow: 0 1px 0 rgba(255, 220, 180, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-top: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 18px;
      cursor: pointer;
      box-shadow:
        0 4px 0 rgba(180, 85, 0, 0.6),
        0 8px 24px rgba(255, 140, 26, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        inset 0 -2px 8px rgba(180, 85, 0, 0.25);
      transition: transform 180ms ease-out, box-shadow 180ms ease-out, opacity 0.35s ease;
    }
    .qd-btn-primary-hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: -60%;
      width: 50%;
      height: 100%;
      background: linear-gradient(100deg, transparent 0%, rgba(255, 255, 255, 0.18) 50%, transparent 100%);
      transform: skewX(-20deg);
      animation: playAgainShine 6s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes playAgainShine {
      0%   { left: -60%; }
      25%  { left: 140%; }
      100% { left: 140%; }
    }
    .qd-btn-primary-hero:hover {
      transform: translateY(-2px);
      box-shadow:
        0 2px 0 rgba(180, 85, 0, 0.6),
        0 12px 32px rgba(255, 140, 26, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        inset 0 -2px 8px rgba(180, 85, 0, 0.25);
    }
    .qd-btn-primary-hero:active {
      transform: translateY(2px);
      box-shadow:
        0 0 0 rgba(180, 85, 0, 0.6),
        0 4px 12px rgba(255, 140, 26, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 8px rgba(180, 85, 0, 0.25);
    }
    @media (prefers-reduced-motion: reduce) {
      .qd-btn-primary-hero::before { animation: none; display: none; }
    }

    .qd-btn-secondary {
      width: 100%;
      min-height: 48px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(255,255,255,0.05);
      border: 1.5px solid rgba(255,255,255,0.12);
      color: #f5f2eb;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 0.95rem;
      border-radius: 16px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: transform 0.12s ease, background 0.15s, border-color 0.15s;
    }
    .qd-btn-secondary:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(245,179,66,0.5);
      transform: translateY(-1px);
    }
    .qd-btn-secondary:active { transform: translateY(1px); }

    /* .qd-btn-viral-primary — viral K-factor CTA (Challenge Friend). #1 on Result screen:
       flat bright red-orange, largest, white text, pulse on shadow (not transform) to avoid
       layout jitter. Home incoming banner stays gold — direction-of-challenge color-coded. */
    .qd-btn-viral-primary {
      width: 100%;
      padding: 1.6rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: #FF5930;
      color: #FFFFFF;
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      font-size: 1.25rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-top: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 16px;
      cursor: pointer;
      box-shadow:
        0 4px 0 #B83A1A,
        0 8px 28px rgba(255, 89, 48, 0.55),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -2px 8px rgba(180, 40, 10, 0.25);
      transition: transform 180ms ease-out, filter 180ms ease;
      animation: challengeFlatPulse 2.2s ease-in-out infinite;
    }
    .qd-btn-viral-primary .qd-btn-viral-icon {
      font-size: 1.5rem;
      line-height: 1;
      margin-right: 0.75rem;
    }
    .qd-btn-viral-primary:hover {
      transform: translateY(-2px);
      filter: brightness(1.06);
    }
    .qd-btn-viral-primary:active {
      transform: translateY(2px);
      box-shadow:
        0 0 0 #B83A1A,
        0 4px 14px rgba(255, 89, 48, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        inset 0 -2px 8px rgba(180, 40, 10, 0.25);
      animation-play-state: paused;
    }
    @keyframes challengeFlatPulse {
      0%, 100% {
        box-shadow:
          0 4px 0 #B83A1A,
          0 8px 28px rgba(255, 89, 48, 0.55),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 -2px 8px rgba(180, 40, 10, 0.25);
      }
      50% {
        box-shadow:
          0 4px 0 #B83A1A,
          0 14px 48px rgba(255, 89, 48, 0.9),
          0 0 28px rgba(255, 89, 48, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          inset 0 -2px 8px rgba(180, 40, 10, 0.25);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .qd-btn-viral-primary { animation: none; }
    }
    .qd-btn {
      font-family: ${theme.fonts.body};
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      border: none;
      transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease, border-color 0.15s ease;
    }
    .qd-btn-primary {
      min-height: 52px;
      padding: 12px 20px;
      background: ${c.accent};
      color: #0b0a12;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      border-radius: ${r.lg};
      box-shadow: ${s.button};
    }
    .qd-btn-primary:hover { background: ${c.accentHover}; }
    .qd-btn-primary:active {
      transform: translateY(2px);
      box-shadow: ${s.buttonPressed};
    }
    .qd-btn-glass {
      min-height: 46px;
      padding: 10px 18px;
      background: rgba(255,255,255,0.04);
      border: 1px solid ${c.stroke};
      color: ${c.text};
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: ${r.lg};
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .qd-btn-glass:hover { border-color: ${c.strokeStrong}; background: rgba(255,255,255,0.06); }
  `;
  document.head.appendChild(style);
}

function animateScore(el, from, to, duration = 400) {
  const numEl = el.querySelector('.qd-score-num');
  const changed = to !== from;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - p, 3);
    const value = Math.round(from + (to - from) * ease);
    if (numEl) numEl.textContent = String(value);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  if (changed && numEl) {
    numEl.classList.remove('qd-score-pop');
    // force reflow so the animation restarts if triggered back-to-back
    void numEl.offsetWidth;
    numEl.classList.add('qd-score-pop');
    setTimeout(() => numEl.classList.remove('qd-score-pop'), 320);
  }
}

function animateBigNumber(el, from, to, duration = 1400) {
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - p, 3);
    const value = Math.round(from + (to - from) * ease);
    el.textContent = String(value);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function renderQuizScreen(container, quiz, onFinish) {
  injectStyles();
  container.style.background = 'transparent';

  const question = quiz.currentQuestion;
  if (!question) {
    onFinish();
    return;
  }

  const prevScore = quiz.score;

  const root = document.createElement('div');
  root.className = 'qd-root';

  const topbar = document.createElement('div');
  topbar.className = 'qd-topbar';
  const progress = document.createElement('div');
  progress.className = 'qd-pill qd-progress';
  progress.textContent = `${quiz.questionIndex + 1}/${quiz.totalQuestions}`;
  const scoreEl = document.createElement('div');
  scoreEl.className = 'qd-pill qd-score';
  scoreEl.innerHTML = `<span class="qd-score-label">${t('scoreLabel')}</span><span class="qd-score-num">${prevScore}</span>`;
  topbar.appendChild(progress);
  topbar.appendChild(scoreEl);

  const timerTrack = document.createElement('div');
  timerTrack.className = 'qd-timer-track';
  const timerBar = document.createElement('div');
  timerBar.className = 'qd-timer-bar';
  timerTrack.appendChild(timerBar);

  const segDiff = question.segmentDifficulty || question.difficulty || 'easy';
  const diffBadge = document.createElement('div');
  diffBadge.className = `qd-difficulty-badge qd-diff-${segDiff}`;
  const diffLabelKey = `difficulty_${segDiff}`;
  diffBadge.innerHTML = `<span class="qd-diff-dot"></span><span>${t(diffLabelKey)}</span>`;

  // Pulse on tier transition (Q5 entering medium, Q9 entering hard)
  const qIdx = quiz.questionIndex;
  if (qIdx === 4 || qIdx === 8) {
    diffBadge.classList.add('qd-diff-pulse');
  }

  const qArea = document.createElement('div');
  qArea.className = 'qd-question-area';
  const qText = document.createElement('div');
  qText.className = 'qd-question';
  qText.textContent = question.q;
  qArea.appendChild(qText);

  const answers = document.createElement('div');
  answers.className = 'qd-answers';

  const buttons = question.a.map((text, idx) => {
    const btn = document.createElement('button');
    btn.className = 'qd-answer';
    btn.type = 'button';
    btn.dataset.idx = String(idx);

    const letter = document.createElement('div');
    letter.className = 'qd-answer-letter';
    letter.textContent = LETTERS[idx];

    const textEl = document.createElement('div');
    textEl.className = 'qd-answer-text';
    textEl.textContent = text;

    btn.appendChild(letter);
    btn.appendChild(textEl);
    answers.appendChild(btn);
    return btn;
  });

  const mid = document.createElement('div');
  mid.className = 'qd-mid';
  mid.appendChild(diffBadge);
  mid.appendChild(qArea);
  mid.appendChild(answers);

  root.appendChild(topbar);
  root.appendChild(timerTrack);
  root.appendChild(mid);
  container.appendChild(root);

  const DURATION = 10;
  let startTime = performance.now();
  let secondsRemaining = DURATION;
  let answered = false;
  let rafId = null;
  let pulsing = false;
  let lastTickSec = Math.ceil(DURATION);

  function tick(now) {
    const elapsed = (now - startTime) / 1000;
    secondsRemaining = Math.max(0, DURATION - elapsed);
    const pct = (secondsRemaining / DURATION) * 100;
    timerBar.style.width = pct + '%';

    if (!pulsing && secondsRemaining < 3) {
      timerBar.classList.add('qd-pulse');
      pulsing = true;
    }

    if (secondsRemaining <= 3) {
      const currentSec = Math.ceil(secondsRemaining);
      if (currentSec < lastTickSec && currentSec > 0) {
        playTick();
        lastTickSec = currentSec;
      }
    }

    if (secondsRemaining <= 0) {
      handleTimeout();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  function stopTimer() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function disableAll() {
    buttons.forEach(b => { b.disabled = true; });
  }

  function showFloat(btn, text, variant, multiplier) {
    const f = document.createElement('div');
    f.className = 'qd-float' + (variant ? ' qd-float-' + variant : '');
    if (multiplier && multiplier > 1) {
      const suffix = multiplier === 1.5 ? ` ×${multiplier}  🔥` : `  ×${multiplier}`;
      f.innerHTML = `<span>${text}</span><span class="qd-float-mult">${suffix}</span>`;
    } else {
      f.textContent = text;
    }
    btn.appendChild(f);
  }

  function advance() {
    container.innerHTML = '';
    if (quiz.isDone) {
      onFinish();
    } else {
      setTimeout(() => playWhoosh(), 100);
      renderQuizScreen(container, quiz, onFinish);
    }
  }

  function handleChoice(choiceIndex) {
    if (answered) return;
    answered = true;
    playClick();
    stopTimer();
    disableAll();

    const result = quiz.answer(choiceIndex, secondsRemaining);
    animateScore(scoreEl, prevScore, quiz.score);

    const clickedBtn = buttons[choiceIndex];
    const correctBtn = buttons[result.correctIndex];

    if (result.isCorrect) {
      playCorrect((result.currentCorrectStreak || 1) - 1);
      clickedBtn.classList.add('qd-correct');
      showFloat(clickedBtn, t('pointsPlus', { points: result.pointsEarned }), null, result.multiplier);
      setTimeout(advance, 700);
    } else {
      playWrong();
      clickedBtn.classList.add('qd-wrong');
      correctBtn.classList.add('qd-correct');
      showFloat(clickedBtn, t('pointsPlus', { points: 0 }), 'zero');
      setTimeout(advance, 1200);
    }
  }

  function handleTimeout() {
    if (answered) return;
    answered = true;
    stopTimer();
    disableAll();
    secondsRemaining = 0;
    timerBar.style.width = '0%';

    const result = quiz.answer(-1, 0);
    playWrong();
    const correctBtn = buttons[result.correctIndex];
    correctBtn.classList.add('qd-correct');
    showFloat(correctBtn, t('timesUp'), 'neutral');
    setTimeout(advance, 1200);
  }

  buttons.forEach((btn, idx) => {
    btn.addEventListener('click', () => handleChoice(idx));
  });
}

export function renderFinishScreen(container, quiz, callbacks = {}) {
  injectStyles();
  container.style.background = 'transparent';

  const { onPlayAgain, onShare, onChallenge, onKeepPlaying, bestResult, streakResult, xpEarned, coinsEarned, leveledUp, prevLevel, newLevel, prevXpPercent, newXpPercent, challengeTarget } = callbacks;

  const total = quiz.totalQuestions;
  const correctCount = quiz.correctCount;
  const wrongCount = total - correctCount;
  const accuracy = Math.round((correctCount / total) * 100);

  const root = document.createElement('div');
  root.className = 'qd-finish';
  root.style.position = 'relative';

  // Top-left ← home button (absolute, doesn't push layout)
  const navBack = document.createElement('button');
  navBack.type = 'button';
  navBack.className = 'qd-finish-navback';
  navBack.setAttribute('aria-label', t('navBackHome'));
  navBack.textContent = '←';
  navBack.addEventListener('click', () => {
    playClick();
    if (onPlayAgain) onPlayAgain();
  });
  root.appendChild(navBack);

  const topLabel = document.createElement('div');
  topLabel.className = 'qd-finish-top-label';
  topLabel.textContent = t('dailyChallengeComplete');

  const badgeRow = document.createElement('div');
  badgeRow.className = 'qd-badge-row';
  const badges = [];

  if (bestResult && bestResult.improved) {
    const b = document.createElement('div');
    b.className = 'qd-badge qd-badge-best';
    b.textContent = '⭐ ' + t('newBest');
    badgeRow.appendChild(b);
    badges.push(b);
  }

  if (streakResult && streakResult.streakIncreased) {
    const b = document.createElement('div');
    b.className = 'qd-badge qd-badge-streak';
    const lang = getLanguage();
    let txt;
    if (streakResult.milestone) {
      txt = t('streakMilestone', {
        n: streakResult.milestone,
        days: formatStreakDays(streakResult.milestone, lang)
      });
    } else if (streakResult.streak === 1) {
      txt = t('streakBadgeOne', {
        n: 1,
        days: formatStreakDays(1, lang)
      });
    } else {
      txt = t('streakBadge', {
        n: streakResult.streak,
        days: formatStreakDays(streakResult.streak, lang)
      });
    }
    b.textContent = txt;
    badgeRow.appendChild(b);
    badges.push(b);
  }

  const bigScore = document.createElement('div');
  bigScore.className = 'qd-finish-score-big';
  bigScore.textContent = '0';

  const scoreLabel = document.createElement('div');
  scoreLabel.className = 'qd-finish-score-label';
  scoreLabel.textContent = t('score');

  const statsRow = document.createElement('div');
  statsRow.className = 'qd-stats-row';

  function makeStat(value, labelText, modClass) {
    const wrap = document.createElement('div');
    wrap.className = 'qd-stat ' + modClass;
    const dot = document.createElement('div');
    dot.className = 'qd-stat-dot';
    const v = document.createElement('div');
    v.className = 'qd-stat-value';
    v.textContent = value;
    const l = document.createElement('div');
    l.className = 'qd-stat-label';
    l.textContent = labelText;
    wrap.appendChild(dot);
    wrap.appendChild(v);
    wrap.appendChild(l);
    return wrap;
  }

  statsRow.appendChild(makeStat(String(correctCount), t('correct'), 'qd-stat-correct'));
  statsRow.appendChild(makeStat(String(wrongCount), t('wrong'), 'qd-stat-wrong'));
  statsRow.appendChild(makeStat(accuracy + '%', t('accuracy'), 'qd-stat-accuracy'));

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'qd-toggle-answers';
  toggleBtn.textContent = t('showAnswers');

  const answersList = document.createElement('div');
  answersList.className = 'qd-answers-list';

  quiz.answerHistory.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'qd-answer-card';
    const timedOut = entry.chosen === -1;
    if (entry.isCorrect) card.classList.add('qd-ac-correct');
    else card.classList.add('qd-ac-wrong');

    const qEl = document.createElement('div');
    qEl.className = 'qd-ac-q';
    qEl.textContent = entry.q;

    const yourEl = document.createElement('div');
    yourEl.className = 'qd-ac-your';
    const yourVal = timedOut ? t('timesUp') : entry.a[entry.chosen];
    yourEl.innerHTML = `${t('yourAnswer')}: <b></b>`;
    yourEl.querySelector('b').textContent = yourVal;

    card.appendChild(qEl);
    card.appendChild(yourEl);

    if (!entry.isCorrect) {
      const corrEl = document.createElement('div');
      corrEl.className = 'qd-ac-corr';
      corrEl.innerHTML = `${t('correctAnswer')}: <b></b>`;
      corrEl.querySelector('b').textContent = entry.a[entry.correct];
      card.appendChild(corrEl);
    }

    const points = document.createElement('div');
    points.className = 'qd-ac-points';
    points.textContent = `+${entry.points}`;
    card.appendChild(points);

    answersList.appendChild(card);
  });

  toggleBtn.addEventListener('click', () => {
    const open = answersList.classList.toggle('qd-open');
    toggleBtn.textContent = open ? t('hideAnswers') : t('showAnswers');
  });

  const buttonsWrap = document.createElement('div');
  buttonsWrap.className = 'qd-finish-buttons';

  const historyArr = quiz.answerHistory || [];

  const gridPreview = document.createElement('div');
  const gridEmojis = historyArr.map(h => h.isCorrect ? '🟩' : '🟥').join('');
  gridPreview.style.cssText = `
    margin-top: 10px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    text-align: center;
    font-size: 1.1rem;
    letter-spacing: 2px;
    line-height: 1;
    width: 100%;
    max-width: 480px;
  `;
  gridPreview.textContent = gridEmojis;

  const shareHero = document.createElement('button');
  shareHero.type = 'button';
  shareHero.className = 'qd-btn-secondary';
  shareHero.innerHTML = `<span>📤</span><span>${t('shareYourResult')}</span>`;
  shareHero.addEventListener('click', async () => {
    playClick();
    const { openShareModal } = await import('../ui/shareModal.js');
    openShareModal({
      score: quiz.score,
      correct: correctCount,
      total: quiz.totalQuestions || 12,
      history: historyArr
    });
  });

  const secondaryRow = document.createElement('div');
  secondaryRow.style.cssText = 'display:flex; flex-direction:column; align-items:stretch; gap:6px; margin-top:0;';

  const challengeBtn = document.createElement('button');
  challengeBtn.type = 'button';
  challengeBtn.className = 'qd-btn-viral-primary';
  challengeBtn.innerHTML = `<span class="qd-btn-viral-icon">⚔️</span><span>${t('challengeFriend')}</span>`;
  challengeBtn.addEventListener('click', () => {
    playClick();
    if (onChallenge) onChallenge(quiz.score);
  });
  secondaryRow.appendChild(challengeBtn);

  // === KEEP PLAYING — plain manual button, fades in after fanfare settles ===
  const keepBtn = document.createElement('button');
  keepBtn.type = 'button';
  keepBtn.className = 'qd-btn-primary-hero';
  keepBtn.style.opacity = '0'; // faded in after fanfare settles
  keepBtn.textContent = t('keepPlaying');

  keepBtn.addEventListener('click', () => {
    playClick();
    if (onKeepPlaying) onKeepPlaying();
  });

  // New hierarchy: Виклик другу = #1 (viral K-factor), ГРАТИ ЩЕ = #2 (retention),
  // Поділитись = #3 (quiet tertiary). Order top → bottom reflects that priority.
  buttonsWrap.appendChild(secondaryRow);
  if (onKeepPlaying && !callbacks.isReview) {
    buttonsWrap.appendChild(keepBtn);
  }
  buttonsWrap.appendChild(shareHero);

  // === REWARDS ROW + XP BAR ===
  let rewardsWrap = null;
  let xpFill = null;
  if (xpEarned !== undefined && coinsEarned !== undefined) {
    rewardsWrap = document.createElement('div');
    rewardsWrap.style.cssText = 'display:flex; flex-direction:column; gap:4px; margin-top:6px; align-items:center; width:100%; max-width:480px;';

    const pills = document.createElement('div');
    pills.style.cssText = 'display:flex; justify-content:space-around; gap:6px; width:100%; max-width:300px;';
    const xpPill = document.createElement('div');
    xpPill.style.cssText = `padding:5px 12px; border-radius:999px; background:rgba(245,180,60,0.14); border:1px solid rgba(245,180,60,0.4); color:#f5b342; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:0.82rem; display:flex; align-items:center; gap:5px; line-height:1.1;`;
    xpPill.innerHTML = `<span>⭐</span><span>+${xpEarned} XP</span>`;
    const coinPill = document.createElement('div');
    coinPill.style.cssText = `padding:5px 12px; border-radius:999px; background:rgba(255,211,107,0.12); border:1px solid rgba(255,211,107,0.4); color:#ffd36b; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:0.82rem; display:flex; align-items:center; gap:5px; line-height:1.1;`;
    coinPill.innerHTML = `<span>+${coinsEarned}</span><span>🪙</span>`;
    pills.appendChild(xpPill);
    pills.appendChild(coinPill);
    rewardsWrap.appendChild(pills);

    const xpTrack = document.createElement('div');
    xpTrack.style.cssText = 'height:6px; width:100%; max-width:320px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;';
    xpFill = document.createElement('div');
    xpFill.style.cssText = `height:100%; width:${prevXpPercent || 0}%; background:linear-gradient(90deg,#f5b342 0%,#ffd36b 100%); border-radius:999px; box-shadow:0 0 10px rgba(245,180,60,0.55); transition:width 1.2s ease-out;`;
    xpTrack.appendChild(xpFill);
    rewardsWrap.appendChild(xpTrack);
  }

  // Compress: the top status label is redundant with the challenge banner on challenge-mode plays
  // and with the big score itself on regular plays. Only render when there are no badges AND no
  // challenge result (to reserve space above the fold for the score + stats + CTAs at 900×600).
  const suppressTopLabel = (badges.length > 0) || (typeof challengeTarget === 'number' && challengeTarget > 0);
  if (!suppressTopLabel) root.appendChild(topLabel);
  if (badges.length > 0) root.appendChild(badgeRow);

  if (typeof challengeTarget === 'number' && challengeTarget > 0) {
    const challengeResult = document.createElement('div');
    const won = quiz.score > challengeTarget;
    challengeResult.style.cssText = `
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: ${won ? '0.95rem' : '0.85rem'};
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${won ? '#f5b342' : 'rgba(255,255,255,0.5)'};
      ${won ? 'text-shadow: 0 0 14px rgba(245,179,66,0.4);' : ''}
      margin: 0;
      padding: 2px 0;
      line-height: 1.25;
    `;
    challengeResult.textContent = won
      ? '🏆 ' + t('challengeWon')
      : t('challengeMissed', { score: challengeTarget });
    root.appendChild(challengeResult);
  }

  root.appendChild(bigScore);
  root.appendChild(scoreLabel);
  root.appendChild(statsRow);
  if (rewardsWrap) root.appendChild(rewardsWrap);
  // Primary CTAs first — must be above the fold on 900×600
  root.appendChild(buttonsWrap);
  // Answer review moves BELOW primary CTAs (below-fold is acceptable — it's secondary)
  const reviewWrap = document.createElement('div');
  reviewWrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; max-width:480px; margin-top:10px;';
  reviewWrap.appendChild(gridPreview);
  reviewWrap.appendChild(toggleBtn);
  reviewWrap.appendChild(answersList);
  root.appendChild(reviewWrap);
  container.appendChild(root);

  animateBigNumber(bigScore, 0, quiz.score, 1400);
  setTimeout(() => playFanfare(), 300);
  setTimeout(() => {
    badges.forEach(b => b.classList.add('qd-badge-show'));
  }, 300);
  if (bestResult && bestResult.improved) {
    setTimeout(() => playNewBest(), 1400);
  }
  if (onKeepPlaying && !callbacks.isReview) {
    setTimeout(() => { keepBtn.style.opacity = '1'; }, 1800);
  }
  if (xpFill && typeof newXpPercent === 'number') {
    setTimeout(() => { xpFill.style.width = newXpPercent + '%'; }, 1500);
  }
  if (leveledUp) {
    setTimeout(() => showLevelUpOverlay(newLevel), 2800);
  }
  if (streakResult && streakResult.milestone) {
    setTimeout(() => playStreakMilestone(), 2200);
  }
}
