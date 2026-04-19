import { theme } from '../ui/theme.js';
import { t } from '../i18n/i18n.js';
import { playClick } from '../ui/sounds.js';
import { calculateMatchReward, applyMatchReward } from './matchRewards.js';
import { saveMatchImmediate } from './matchStore.js';
import { getLevelFromXP, getXP } from './stats.js';
import { hasProBadge } from './powerups.js';
import { applyProBadgeToScore } from '../ui/quizHooks.js';

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
      gap: 14px;
      font-family: ${theme.fonts.body};
      color: ${c.text};
      box-sizing: border-box;
    }
    .qd-matchresult-title {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 1.4rem;
      text-align: center;
      letter-spacing: -0.01em;
      color: ${c.textDim};
    }
    .qd-matchresult-verdict {
      text-align: center;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.9rem;
      letter-spacing: -0.01em;
      margin-top: 4px;
    }
    .qd-matchresult-verdict.qd-verdict-win { color: #10B981; }
    .qd-matchresult-verdict.qd-verdict-loss { color: #F87171; }
    .qd-matchresult-verdict.qd-verdict-tie { color: #FBBF24; }
    .qd-matchresult-scores {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .qd-matchresult-card {
      padding: 12px 10px;
      border-radius: ${r.lg};
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      text-align: center;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .qd-matchresult-card-label {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: ${c.textMuted};
      font-weight: 600;
      line-height: 1;
    }
    .qd-matchresult-card-name {
      font-family: ${theme.fonts.display};
      font-weight: 700;
      font-size: 0.9rem;
      margin-top: 4px;
      color: ${c.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qd-matchresult-card-score {
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1.9rem;
      color: ${c.accent};
      margin-top: 6px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    /* Reward pills — same visual family as solo Result: XP pill emerald/gold,
       coin pill amber. Single row, space-around. */
    .qd-matchresult-rewards {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
    }
    .qd-matchresult-rewards-row {
      display: flex;
      gap: 10px;
      justify-content: center;
      align-items: center;
    }
    .qd-reward-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.02em;
      font-variant-numeric: tabular-nums;
    }
    .qd-reward-pill.qd-reward-xp {
      background: linear-gradient(135deg, rgba(245,180,66,0.18), rgba(255,211,107,0.18));
      border: 1px solid rgba(245,180,66,0.55);
      color: #ffd36b;
      text-shadow: 0 0 10px rgba(245,180,66,0.35);
    }
    .qd-reward-pill.qd-reward-coins {
      background: linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,213,79,0.18));
      border: 1px solid rgba(255,193,7,0.55);
      color: #FFD54F;
      text-shadow: 0 0 10px rgba(255,213,79,0.35);
    }
    .qd-matchresult-rewards-caption {
      font-size: 0.72rem;
      color: ${c.textMuted};
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    /* Rewarded-ad button — dark card with amber border */
    .qd-matchresult-ad {
      width: 100%;
      min-height: 44px;
      padding: 10px 14px;
      background: rgba(30,20,8,0.6);
      border: 1.5px solid rgba(255,193,7,0.6);
      color: #FFD54F;
      border-radius: ${r.lg};
      font-family: ${theme.fonts.body};
      font-weight: 700;
      font-size: 0.92rem;
      letter-spacing: 0.02em;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: background 0.15s, border-color 0.15s, transform 0.12s;
    }
    .qd-matchresult-ad:hover {
      background: rgba(45,30,10,0.7);
      border-color: rgba(255,193,7,0.8);
    }
    .qd-matchresult-ad:active { transform: translateY(1px); }
    .qd-matchresult-ad:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Action buttons — match-result CTAs, clustered at bottom */
    .qd-matchresult-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: auto;
    }
    .qd-matchresult-primary {
      width: 100%;
      min-height: 52px;
      padding: 0.9rem 1.1rem;
      background: #10B981;
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: ${r.xl};
      font-family: ${theme.fonts.display};
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      text-shadow: 0 1px 0 rgba(0,0,0,0.2);
      box-shadow: 0 4px 0 #047857, 0 8px 24px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
      transition: all 180ms ease-out;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qd-matchresult-primary:hover { background: #0EA371; transform: translateY(-2px); }
    .qd-matchresult-primary:active { transform: translateY(2px); }
    .qd-matchresult-secondary {
      width: 100%;
      min-height: 44px;
      padding: 0.65rem 1rem;
      background: rgba(255,255,255,0.05);
      color: ${c.text};
      border: 1.5px solid rgba(125,223,125,0.4);
      border-radius: ${r.lg};
      font-family: ${theme.fonts.body};
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.02em;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, border-color 0.15s;
    }
    .qd-matchresult-secondary:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(125,223,125,0.65);
    }
    .qd-matchresult-share {
      width: 100%;
      min-height: 44px;
      padding: 0.65rem 1rem;
      background: rgba(255,193,7,0.08);
      color: #FFD54F;
      border: 1.5px solid rgba(255,193,7,0.55);
      border-radius: ${r.lg};
      font-family: ${theme.fonts.body};
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, border-color 0.15s;
    }
    .qd-matchresult-share:hover {
      background: rgba(255,193,7,0.14);
      border-color: rgba(255,193,7,0.8);
    }
    .qd-matchresult-backlink {
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
      padding: 10px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      align-self: center;
    }

    .qd-matchresult-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      background: rgba(30,20,10,0.92);
      backdrop-filter: blur(10px);
      color: #fff; padding: 10px 18px;
      border-radius: 999px;
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem; font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(255,193,7,0.3);
      border: 1px solid rgba(255,193,7,0.5);
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);
}

function flashToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'qd-matchresult-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

export function renderMatchResult(container, match, currentPlayerId, platform, callbacks = {}) {
  injectResultStyles();
  const { onBackToHome, onChallengeBack, onChallengeDifferent, onShareWin } = callbacks;

  container.innerHTML = '';
  container.style.background = 'transparent';

  const root = document.createElement('div');
  root.className = 'qd-matchresult';

  // Verdict from current player's perspective.
  const slot = match.getPlayerSlot(currentPlayerId);
  const winner = match.getWinner();
  let verdictKey, verdictCls, isWin = false;
  if (winner === 'tie') { verdictKey = 'itsATie'; verdictCls = 'qd-verdict-tie'; }
  else if (slot && winner === slot) { verdictKey = 'youWon'; verdictCls = 'qd-verdict-win'; isWin = true; }
  else { verdictKey = 'youLost'; verdictCls = 'qd-verdict-loss'; }

  // Title
  const title = document.createElement('div');
  title.className = 'qd-matchresult-title';
  title.textContent = t('matchComplete');
  root.appendChild(title);

  // Verdict
  const verdict = document.createElement('div');
  verdict.className = `qd-matchresult-verdict ${verdictCls}`;
  verdict.textContent = t(verdictKey);
  root.appendChild(verdict);

  // Score cards — YOU always left.
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

  // REWARDS — compute + apply idempotently.
  // Snapshot claimed-state BEFORE applying so we can decide whether this is a
  // "fresh completion" render (show Watch-ad) or a "read-only" revisit from
  // the inbox (hide Watch-ad — rewards already claimed earlier).
  const alreadyClaimedBefore = match.rewardsClaimed === true;
  const reward = calculateMatchReward(match, currentPlayerId);
  const applied = applyMatchReward(match, reward);
  // Persist (flush immediately so refresh or next session sees the flag).
  saveMatchImmediate(match, platform).catch(() => {});

  const rewardsWrap = document.createElement('div');
  rewardsWrap.className = 'qd-matchresult-rewards';
  const rewardsRow = document.createElement('div');
  rewardsRow.className = 'qd-matchresult-rewards-row';
  const xpPill = document.createElement('div');
  xpPill.className = 'qd-reward-pill qd-reward-xp';
  xpPill.textContent = `+${reward.xp} XP`;
  const coinsPill = document.createElement('div');
  coinsPill.className = 'qd-reward-pill qd-reward-coins';
  coinsPill.textContent = `+${reward.coins} 🪙`;
  rewardsRow.appendChild(xpPill);
  rewardsRow.appendChild(coinsPill);
  const rewardsCaption = document.createElement('div');
  rewardsCaption.className = 'qd-matchresult-rewards-caption';
  rewardsCaption.textContent = t('rewardEarned');
  rewardsWrap.appendChild(rewardsRow);
  rewardsWrap.appendChild(rewardsCaption);
  root.appendChild(rewardsWrap);

  // REWARDED AD — show only on the FIRST render after match completion.
  // Hidden when the user revisits an already-claimed match from the inbox
  // (alreadyClaimedBefore=true) OR after they've already doubled.
  if (reward.xp > 0 && !alreadyClaimedBefore && !match.rewardsDoubled) {
    const adBtn = document.createElement('button');
    adBtn.type = 'button';
    adBtn.className = 'qd-matchresult-ad';
    adBtn.textContent = `📺  ${t('watch2xAd')}`;
    let adClicked = false;
    adBtn.addEventListener('click', async () => {
      if (adClicked) return;
      adClicked = true;
      adBtn.disabled = true;
      playClick();
      let ok = false;
      try {
        if (platform && typeof platform.showAd === 'function') {
          ok = await platform.showAd('rewarded');
        }
      } catch (e) {
        console.error('[match] showAd failed:', e);
        ok = false;
      }
      if (ok) {
        const doubleResult = applyMatchReward(match, reward, { doubled: true });
        if (doubleResult.applied) {
          // Update pills to reflect doubled totals.
          xpPill.textContent = `+${reward.xp * 2} XP`;
          coinsPill.textContent = `+${reward.coins * 2} 🪙`;
          saveMatchImmediate(match, platform).catch(() => {});
        }
        flashToast(t('rewardDoubled'));
        adBtn.style.display = 'none';
      } else {
        flashToast(t('adUnavailable'));
      }
    });
    root.appendChild(adBtn);
  }

  // ACTIONS — Challenge Back (primary), Challenge Different (secondary),
  // Share Win (tertiary, only if won), Back to Home (link).
  const actions = document.createElement('div');
  actions.className = 'qd-matchresult-actions';

  const backChallengeBtn = document.createElement('button');
  backChallengeBtn.type = 'button';
  backChallengeBtn.className = 'qd-matchresult-primary';
  backChallengeBtn.textContent = t('challengeBack', { name: oppName });
  backChallengeBtn.addEventListener('click', () => {
    playClick();
    if (onChallengeBack) onChallengeBack();
  });
  actions.appendChild(backChallengeBtn);

  const diffFriendBtn = document.createElement('button');
  diffFriendBtn.type = 'button';
  diffFriendBtn.className = 'qd-matchresult-secondary';
  diffFriendBtn.textContent = t('challengeDifferentFriend');
  diffFriendBtn.addEventListener('click', () => {
    playClick();
    if (onChallengeDifferent) onChallengeDifferent();
  });
  actions.appendChild(diffFriendBtn);

  if (isWin) {
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'qd-matchresult-share';
    shareBtn.textContent = t('shareWin');
    shareBtn.addEventListener('click', () => {
      playClick();
      if (onShareWin) onShareWin();
    });
    actions.appendChild(shareBtn);
  }

  const backLink = document.createElement('button');
  backLink.type = 'button';
  backLink.className = 'qd-matchresult-backlink';
  backLink.textContent = t('backToHome');
  backLink.addEventListener('click', () => {
    playClick();
    if (onBackToHome) onBackToHome();
  });
  actions.appendChild(backLink);

  root.appendChild(actions);

  container.appendChild(root);

  // Pro Badge decoration on the viewer's score card when level ≥ 10.
  if (hasProBadge(getLevelFromXP(getXP()))) {
    const myCardScore = youCard.querySelector('.qd-matchresult-card-score');
    if (myCardScore) {
      applyProBadgeToScore(youCard.parentElement || youCard, 'PRO');
    }
  }

  // Stage 7.2 juice — on win: confetti, screen shake, gold aura around YOU card.
  // On loss: light screen shake only (sharper feedback, no celebration).
  if (isWin) {
    (async () => {
      try {
        const { triggerConfetti, screenShake, matchWinAura, goldenPulse } =
          await import('../ui/juiceEffects.js');
        triggerConfetti(root, 'win');
        screenShake(root, 'medium');
        matchWinAura(youCard);
        goldenPulse(youScoreEl);
      } catch (e) { /* juice never breaks the flow */ }
    })();
  } else if (slot && winner && winner !== 'tie' && winner !== slot) {
    (async () => {
      try {
        const { screenShake } = await import('../ui/juiceEffects.js');
        screenShake(root, 'weak');
      } catch (e) { /* ignore */ }
    })();
  }
}
