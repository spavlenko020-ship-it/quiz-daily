import { theme } from '../ui/theme.js';
import { t } from '../i18n/i18n.js';
import { playClick } from '../ui/sounds.js';

const STYLE_ID = 'qd-match-result-styles';

function injectResultStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const c = theme.colors;
  const r = theme.radii;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .qd-matchresult {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      min-height: 100vh;
      min-height: 100dvh;
      padding: max(24px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px)) max(16px, env(safe-area-inset-left, 0px));
      gap: 16px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-matchresult-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.6rem;
      text-align: center;
      letter-spacing: -0.01em;
    }
    .qd-matchresult-verdict {
      text-align: center;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.8rem;
      letter-spacing: -0.01em;
      margin-top: 8px;
    }
    .qd-matchresult-verdict.qd-verdict-win { color: #10B981; }
    .qd-matchresult-verdict.qd-verdict-loss { color: #F87171; }
    .qd-matchresult-verdict.qd-verdict-tie { color: #FBBF24; }
    .qd-matchresult-scores {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .qd-matchresult-card {
      padding: 16px 12px;
      border-radius: ${r.lg};
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      text-align: center;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .qd-matchresult-card-label {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: ${c.textMuted};
      font-weight: 600;
      line-height: 1;
    }
    .qd-matchresult-card-name {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1rem;
      margin-top: 4px;
      color: ${c.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qd-matchresult-card-score {
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 2.2rem;
      color: ${c.accent};
      margin-top: 8px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .qd-matchresult-primary {
      margin-top: auto;
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
      box-shadow: 0 4px 0 #047857, 0 8px 24px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
      transition: all 180ms ease-out;
    }
    .qd-matchresult-primary:hover {
      background: #0EA371;
      transform: translateY(-2px);
    }
    .qd-matchresult-primary:active { transform: translateY(2px); }
  `;
  document.head.appendChild(style);
}

export function renderMatchResult(container, match, currentPlayerId, callbacks = {}) {
  injectResultStyles();
  const { onBackToHome } = callbacks;

  container.innerHTML = '';
  container.style.background = 'transparent';

  const root = document.createElement('div');
  root.className = 'qd-matchresult';

  const title = document.createElement('div');
  title.className = 'qd-matchresult-title';
  title.textContent = t('matchComplete');
  root.appendChild(title);

  // Determine verdict from current player's perspective.
  const slot = match.getPlayerSlot(currentPlayerId);
  const winner = match.getWinner();
  let verdictKey = 'itsATie';
  let verdictCls = 'qd-verdict-tie';
  if (winner === 'tie') {
    verdictKey = 'itsATie';
    verdictCls = 'qd-verdict-tie';
  } else if (slot && winner === slot) {
    verdictKey = 'youWon';
    verdictCls = 'qd-verdict-win';
  } else {
    verdictKey = 'youLost';
    verdictCls = 'qd-verdict-loss';
  }
  const verdict = document.createElement('div');
  verdict.className = `qd-matchresult-verdict ${verdictCls}`;
  verdict.textContent = t(verdictKey);
  root.appendChild(verdict);

  // Score comparison — always render "You" on left.
  const myScore = slot === 'a' ? match.playerAScore : match.playerBScore;
  const oppScore = slot === 'a' ? match.playerBScore : match.playerAScore;
  const oppName = (match && match.opponent && match.opponent.name) ? match.opponent.name : '—';

  const grid = document.createElement('div');
  grid.className = 'qd-matchresult-scores';

  const youCard = document.createElement('div');
  youCard.className = 'qd-matchresult-card';
  const youLabel = document.createElement('div');
  youLabel.className = 'qd-matchresult-card-label';
  youLabel.textContent = 'YOU';
  const youName = document.createElement('div');
  youName.className = 'qd-matchresult-card-name';
  youName.textContent = '—';
  const youScoreEl = document.createElement('div');
  youScoreEl.className = 'qd-matchresult-card-score';
  youScoreEl.textContent = String(myScore != null ? myScore : 0);
  youCard.appendChild(youLabel);
  youCard.appendChild(youScoreEl);

  const oppCard = document.createElement('div');
  oppCard.className = 'qd-matchresult-card';
  const oppLabelEl = document.createElement('div');
  oppLabelEl.className = 'qd-matchresult-card-label';
  oppLabelEl.textContent = 'OPPONENT';
  const oppNameEl = document.createElement('div');
  oppNameEl.className = 'qd-matchresult-card-name';
  oppNameEl.textContent = oppName;
  const oppScoreEl = document.createElement('div');
  oppScoreEl.className = 'qd-matchresult-card-score';
  oppScoreEl.textContent = String(oppScore != null ? oppScore : 0);
  oppCard.appendChild(oppLabelEl);
  oppCard.appendChild(oppNameEl);
  oppCard.appendChild(oppScoreEl);

  grid.appendChild(youCard);
  grid.appendChild(oppCard);
  root.appendChild(grid);

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'qd-matchresult-primary';
  backBtn.textContent = t('backToHome');
  backBtn.addEventListener('click', () => {
    playClick();
    if (onBackToHome) onBackToHome();
  });
  root.appendChild(backBtn);

  container.appendChild(root);
}
