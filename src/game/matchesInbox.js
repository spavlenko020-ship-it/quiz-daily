import { theme } from '../ui/theme.js';
import { t } from '../i18n/i18n.js';
import { playClick } from '../ui/sounds.js';

const STYLE_ID = 'qd-matches-inbox-styles';

function injectInboxStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-inbox-screen {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px)) max(16px, env(safe-area-inset-left, 0px));
      gap: 12px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-inbox-screen-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .qd-inbox-screen-back {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(30,20,15,0.6);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.85);
      font-size: 1.25rem;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qd-inbox-screen-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.25rem;
      flex: 1;
      min-width: 0;
    }
    .qd-inbox-screen-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `;
  document.head.appendChild(style);
}

function buildInboxCard(match, currentPlayerId, onTap) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'qd-inbox-card';

  const slot = typeof match.getPlayerSlot === 'function' ? match.getPlayerSlot(currentPlayerId) : null;
  const oppName = (match.opponent && match.opponent.name) ? match.opponent.name : '—';
  const oppPhoto = match.opponent && match.opponent.photo ? match.opponent.photo : '';

  let statusText = '';
  let statusClass = '';
  let cardModifier = '';
  if (match.status === 'complete') {
    if (match.rewardsClaimed) {
      statusText = t('finished');
    } else {
      statusText = t('newResult');
      statusClass = 'qd-status-newresult';
      cardModifier = 'is-result';
    }
  } else if ((match.status === 'pending_a' && slot === 'a')
          || (match.status === 'pending_b' && slot === 'b')) {
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
    if (onTap) onTap(match);
  });
  return card;
}

export function renderMatchesInbox(container, matches, currentPlayerId, callbacks = {}) {
  injectInboxStyles();
  const { onBack, onResumeMatch } = callbacks;

  container.innerHTML = '';
  container.style.background = 'transparent';

  const root = document.createElement('div');
  root.className = 'qd-inbox-screen';

  const topBar = document.createElement('div');
  topBar.className = 'qd-inbox-screen-top';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'qd-inbox-screen-back';
  backBtn.setAttribute('aria-label', t('backToHome'));
  backBtn.textContent = '←';
  backBtn.addEventListener('click', () => {
    playClick();
    if (onBack) onBack();
  });
  const titleEl = document.createElement('div');
  titleEl.className = 'qd-inbox-screen-title';
  titleEl.textContent = t('activeMatches') + ' (' + (Array.isArray(matches) ? matches.length : 0) + ')';
  topBar.appendChild(backBtn);
  topBar.appendChild(titleEl);
  root.appendChild(topBar);

  const list = document.createElement('div');
  list.className = 'qd-inbox-screen-list';
  if (Array.isArray(matches)) {
    for (const m of matches) {
      list.appendChild(buildInboxCard(m, currentPlayerId, onResumeMatch));
    }
  }
  root.appendChild(list);

  container.appendChild(root);
}
