import { addXP, addCoins } from './stats.js';

const BASE_REWARDS = {
  win:  { xp: 100, coins: 30 },
  loss: { xp:  25, coins: 10 },
  tie:  { xp:  50, coins: 20 }
};

export function calculateMatchReward(match, myPlayerId) {
  const winner = match && typeof match.getWinner === 'function' ? match.getWinner() : null;
  const slot = match && typeof match.getPlayerSlot === 'function' ? match.getPlayerSlot(myPlayerId) : null;

  let outcome;
  if (winner === 'tie') {
    outcome = 'tie';
  } else if (slot && winner === slot) {
    outcome = 'win';
  } else {
    outcome = 'loss';
  }
  const base = BASE_REWARDS[outcome];
  return {
    outcome,
    xp: base.xp,
    coins: base.coins,
    doubled: false
  };
}

// Idempotent, guarded by match.rewardsClaimed / match.rewardsDoubled.
// Returns an object describing what was actually applied, or { applied: false }
// if this call was a no-op (already claimed / doubled).
export function applyMatchReward(match, reward, opts = {}) {
  const doubled = opts.doubled === true;

  if (doubled) {
    if (match.rewardsDoubled) return { applied: false, reason: 'already-doubled' };
    if (!match.rewardsClaimed) return { applied: false, reason: 'base-not-claimed' };
    const xpResult = addXP(reward.xp);
    addCoins(reward.coins);
    match.rewardsDoubled = true;
    return {
      applied: true,
      xp: reward.xp,
      coins: reward.coins,
      newTotalXP: xpResult.newTotal,
      leveledUp: xpResult.leveledUp,
      prevLevel: xpResult.prevLevel,
      newLevel: xpResult.newLevel
    };
  }

  if (match.rewardsClaimed) return { applied: false, reason: 'already-claimed' };
  const xpResult = addXP(reward.xp);
  addCoins(reward.coins);
  match.rewardsClaimed = true;
  return {
    applied: true,
    xp: reward.xp,
    coins: reward.coins,
    newTotalXP: xpResult.newTotal,
    leveledUp: xpResult.leveledUp,
    prevLevel: xpResult.prevLevel,
    newLevel: xpResult.newLevel
  };
}
