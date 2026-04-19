import { theme } from '../ui/theme.js';
import { t } from '../i18n/i18n.js';
import { playClick } from '../ui/sounds.js';

const STYLE_ID = 'qd-match-waiting-styles';

function injectWaitingStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-waiting {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      min-height: 100vh;
      min-height: 100dvh;
      padding: max(20px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px)) max(16px, env(safe-area-inset-left, 0px));
      gap: 16px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-waiting-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.6rem;
      text-align: center;
      color: ${c.text};
      margin-top: 12px;
    }
    .qd-waiting-score {
      text-align: center;
      font-size: 1.05rem;
      color: #FFD54F;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .qd-waiting-opp-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 16px;
      border-radius: ${r.lg};
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .qd-waiting-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(124,58,237,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-size: 1.8rem;
      line-height: 1;
      color: ${c.textMuted};
    }
    .qd-waiting-avatar img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .qd-waiting-opp-name {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.1rem;
      color: ${c.text};
    }
    .qd-waiting-hint {
      text-align: center;
      padding: 0 12px;
      font-size: 0.9rem;
      color: ${c.textDim};
      line-height: 1.4;
    }
    .qd-waiting-primary {
      margin-top: auto;
      width: 100%;
      min-height: 52px;
      padding: 0.9rem 1.2rem;
      background: rgba(255,255,255,0.06);
      color: ${c.text};
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: ${r.xl};
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, border-color 0.15s;
    }
    .qd-waiting-primary:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.25);
    }
  `;
  document.head.appendChild(style);
}

// DEV-only: inject the debug-panel CSS separately so the selector text never
// ships to production. Vite eliminates any call site guarded by import.meta.env.DEV.
function injectDevSimPanelStyles() {
  const DEV_STYLE_ID = 'qd-match-waiting-dev-styles';
  if (document.getElementById(DEV_STYLE_ID)) return;
  const r = theme.radii;
  const style = document.createElement('style');
  style.id = DEV_STYLE_ID;
  style.textContent = `
    .qd-ws-devpanel {
      margin-top: 8px;
      padding: 12px;
      border-radius: ${r.md};
      background: rgba(255, 235, 59, 0.08);
      border: 1.5px dashed rgba(255, 235, 59, 0.55);
      color: rgba(255, 235, 59, 0.95);
      font-size: 0.78rem;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .qd-ws-devpanel-label {
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
    .qd-ws-devpanel-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .qd-ws-devpanel-row input {
      flex: 0 0 110px;
      padding: 6px 8px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255, 235, 59, 0.4);
      border-radius: 6px;
      color: #ffffff;
      font-family: inherit;
      font-size: 0.85rem;
    }
    .qd-ws-devpanel-row button {
      flex: 1;
      padding: 8px 12px;
      background: rgba(255, 235, 59, 0.2);
      border: 1px solid rgba(255, 235, 59, 0.55);
      border-radius: 6px;
      color: #ffffff;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .qd-ws-devpanel-row button:hover { background: rgba(255, 235, 59, 0.3); }
  `;
  document.head.appendChild(style);
}

export function renderMatchWaiting(container, match, platform, callbacks = {}) {
  injectWaitingStyles();
  const { onBackToHome } = callbacks;

  container.innerHTML = '';
  container.style.background = 'transparent';

  const root = document.createElement('div');
  root.className = 'qd-waiting';

  const title = document.createElement('div');
  title.className = 'qd-waiting-title';
  title.textContent = t('matchWaitingTitle');
  root.appendChild(title);

  const scoreLine = document.createElement('div');
  scoreLine.className = 'qd-waiting-score';
  scoreLine.textContent = t('yourScore', { score: match.playerAScore != null ? match.playerAScore : 0 });
  root.appendChild(scoreLine);

  // Opponent card
  const card = document.createElement('div');
  card.className = 'qd-waiting-opp-card';
  const avatar = document.createElement('div');
  avatar.className = 'qd-waiting-avatar';
  const photo = match && match.opponent && match.opponent.photo ? match.opponent.photo : '';
  if (photo) {
    const img = document.createElement('img');
    img.src = photo;
    img.alt = '';
    img.onerror = () => { avatar.innerHTML = '👤'; };
    avatar.appendChild(img);
  } else {
    avatar.textContent = '👤';
  }
  const oppName = document.createElement('div');
  oppName.className = 'qd-waiting-opp-name';
  const name = (match && match.opponent && match.opponent.name) ? match.opponent.name : '—';
  oppName.textContent = name;
  card.appendChild(avatar);
  card.appendChild(oppName);
  root.appendChild(card);

  const hint = document.createElement('div');
  hint.className = 'qd-waiting-hint';
  hint.textContent = t('opponentTurnHint', { name });
  root.appendChild(hint);

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'qd-waiting-primary';
  backBtn.textContent = t('backToHome');
  backBtn.addEventListener('click', () => {
    playClick();
    if (onBackToHome) onBackToHome();
  });
  root.appendChild(backBtn);

  // DEV-only simulate-opponent panel — the entire block (CSS injection, DOM,
  // callback destructure, UI strings) lives inside this guard so Vite's
  // `import.meta.env.DEV` replacement eliminates every reference in production.
  if (import.meta.env.DEV) {
    injectDevSimPanelStyles();
    const fn = callbacks && callbacks.onSimulateOpponent;
    const dev = document.createElement('div');
    dev.className = 'qd-ws-devpanel';
    const label = document.createElement('div');
    label.className = 'qd-ws-devpanel-label';
    label.textContent = 'DEV \u2014 simulate opponent';
    dev.appendChild(label);
    const row = document.createElement('div');
    row.className = 'qd-ws-devpanel-row';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '600';
    input.value = '150';
    input.setAttribute('aria-label', 'Opponent score (0-600)');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Simulate opponent playing';
    btn.addEventListener('click', () => {
      const raw = parseInt(input.value, 10);
      const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(600, raw)) : 150;
      if (fn) fn(clamped);
    });
    row.appendChild(input);
    row.appendChild(btn);
    dev.appendChild(row);
    root.appendChild(dev);
  }

  container.appendChild(root);

  // Fire Messenger push on FB only.
  if (platform && platform.name === 'facebook' && typeof platform.sendMatchUpdate === 'function') {
    (async () => {
      try {
        const res = await platform.sendMatchUpdate({
          text: 'It is your turn in Daily Quiz!',
          cta: 'Play',
          data: { matchId: match.contextId }
        });
        console.log('[match] sendMatchUpdate result:', res);
      } catch (e) {
        console.error('[match] sendMatchUpdate threw:', e);
      }
    })();
  }
}
