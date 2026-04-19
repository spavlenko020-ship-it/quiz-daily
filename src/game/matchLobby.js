import { theme } from '../ui/theme.js';
import { t } from '../i18n/i18n.js';
import { playClick } from '../ui/sounds.js';

const STYLE_ID = 'qd-match-lobby-styles';

function injectLobbyStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-lobby {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      min-height: 100vh;
      min-height: 100dvh;
      padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px)) max(16px, env(safe-area-inset-left, 0px));
      gap: 16px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-lobby-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .qd-lobby-back {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(30,20,15,0.6);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.85);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .qd-lobby-back:hover {
      border-color: rgba(255,255,255,0.25);
      background: rgba(30,20,15,0.75);
    }
    .qd-lobby-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.3rem;
      letter-spacing: -0.01em;
      color: ${c.text};
      flex: 1;
      min-width: 0;
    }

    .qd-lobby-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 20px;
      border-radius: ${r.lg};
      background: rgba(255,255,255,0.04);
      border: 1.5px solid rgba(125,223,125,0.32);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .qd-lobby-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(125,223,125,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      font-size: 2rem;
      line-height: 1;
      color: ${c.textMuted};
    }
    .qd-lobby-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .qd-lobby-opp-caption {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: ${c.textMuted};
      font-weight: 600;
    }
    .qd-lobby-opp-name {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.25rem;
      color: ${c.text};
      text-align: center;
      line-height: 1.2;
    }

    .qd-lobby-info {
      text-align: center;
      padding: 0 8px;
      font-size: 0.95rem;
      color: ${c.textDim};
      font-weight: 500;
      line-height: 1.4;
    }

    .qd-lobby-primary {
      width: 100%;
      min-height: 52px;
      padding: 0.9rem 1.2rem;
      background: #10B981;
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: ${r.xl};
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.05rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      text-shadow: 0 1px 0 rgba(0,0,0,0.2);
      box-shadow:
        0 4px 0 #047857,
        0 8px 24px rgba(16, 185, 129, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition: all 180ms ease-out;
    }
    .qd-lobby-primary:disabled,
    .qd-lobby-primary[aria-disabled="true"] {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: 0 2px 0 #047857, inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .qd-lobby-primary-hint {
      margin-top: 6px;
      font-size: 0.72rem;
      color: ${c.textMuted};
      text-align: center;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    .qd-lobby-secondary {
      margin-top: auto;
      background: transparent;
      border: none;
      font-family: ${theme.fonts.body};
      font-size: 0.85rem;
      font-weight: 600;
      color: ${c.textDim};
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: ${c.stroke};
      text-underline-offset: 3px;
      padding: 12px 10px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      align-self: center;
    }
    .qd-lobby-secondary:hover {
      color: ${c.text};
      text-decoration-color: ${c.strokeStrong};
    }
  `;
  document.head.appendChild(style);
}

export function renderMatchLobby(container, match, platform, onBack) {
  injectLobbyStyles();
  container.innerHTML = '';
  container.style.background = 'transparent';

  const root = document.createElement('div');
  root.className = 'qd-lobby';

  // Top bar
  const topBar = document.createElement('div');
  topBar.className = 'qd-lobby-top';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'qd-lobby-back';
  backBtn.setAttribute('aria-label', t('backToHome'));
  backBtn.textContent = '←';
  backBtn.addEventListener('click', () => {
    playClick();
    if (onBack) onBack();
  });

  const titleEl = document.createElement('div');
  titleEl.className = 'qd-lobby-title';
  titleEl.textContent = t('matchLobbyTitle');

  topBar.appendChild(backBtn);
  topBar.appendChild(titleEl);
  root.appendChild(topBar);

  // Opponent card
  const card = document.createElement('div');
  card.className = 'qd-lobby-card';

  const avatar = document.createElement('div');
  avatar.className = 'qd-lobby-avatar';
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
  card.appendChild(avatar);

  const oppCaption = document.createElement('div');
  oppCaption.className = 'qd-lobby-opp-caption';
  oppCaption.textContent = t('yourOpponent');
  card.appendChild(oppCaption);

  const oppName = document.createElement('div');
  oppName.className = 'qd-lobby-opp-name';
  oppName.textContent = (match && match.opponent && match.opponent.name) ? match.opponent.name : '—';
  card.appendChild(oppName);

  root.appendChild(card);

  // Info line
  const info = document.createElement('div');
  info.className = 'qd-lobby-info';
  info.textContent = t('matchInfo');
  root.appendChild(info);

  // Disabled primary button (Stage 6.4 will wire this)
  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'qd-lobby-primary';
  startBtn.disabled = true;
  startBtn.setAttribute('aria-disabled', 'true');
  startBtn.textContent = t('startYourTurn');
  root.appendChild(startBtn);

  const startHint = document.createElement('div');
  startHint.className = 'qd-lobby-primary-hint';
  startHint.textContent = 'Coming in next update';
  root.appendChild(startHint);

  // Secondary back-to-home
  const secondary = document.createElement('button');
  secondary.type = 'button';
  secondary.className = 'qd-lobby-secondary';
  secondary.textContent = t('backToHome');
  secondary.addEventListener('click', () => {
    playClick();
    if (onBack) onBack();
  });
  root.appendChild(secondary);

  container.appendChild(root);
}
