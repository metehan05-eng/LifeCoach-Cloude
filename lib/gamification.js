const XP_PER_LEVEL = 100;

const LOOT_BOX_POOL = [
  // Common (50%)
  { id: 'coin_50',   itemType: 'coin',   name: '50 HAN Coin',       rarity: 'common',   icon: '🪙', minQty: 50,  maxQty: 50,  weight: 30 },
  { id: 'coin_100',  itemType: 'coin',   name: '100 HAN Coin',      rarity: 'common',   icon: '🪙', minQty: 100, maxQty: 100, weight: 20 },
  // Rare (30%)
  { id: 'coin_250',  itemType: 'coin',   name: '250 HAN Coin',      rarity: 'rare',     icon: '💰', minQty: 250, maxQty: 250, weight: 12 },
  { id: 'xp_boost',  itemType: 'boost',  name: 'XP Boost (+%50)',   rarity: 'rare',     icon: '⚡', minQty: 1,   maxQty: 1,   weight: 10 },
  { id: 'theme_dark',itemType: 'theme',  name: 'Karanlık Tema',     rarity: 'rare',     icon: '🌙', minQty: 1,   maxQty: 1,   weight: 8 },
  // Epic (15%)
  { id: 'coin_500',  itemType: 'coin',   name: '500 HAN Coin',      rarity: 'epic',     icon: '💎', minQty: 500, maxQty: 500, weight: 7 },
  { id: 'title_elite',itemType: 'title', name: 'Elite Koç Ünvanı',  rarity: 'epic',     icon: '👑', minQty: 1,   maxQty: 1,   weight: 5 },
  { id: 'theme_neon',itemType: 'theme',  name: 'Neon Arayüz',       rarity: 'epic',     icon: '🌈', minQty: 1,   maxQty: 1,   weight: 3 },
  // Legendary (5%)
  { id: 'coin_2000', itemType: 'coin',   name: '2000 HAN Coin',     rarity: 'legendary',icon: '💫', minQty: 2000, maxQty: 2000, weight: 2 },
  { id: 'title_legend',itemType: 'title',name: 'Efsanevi Koç',      rarity: 'legendary', icon: '🏆', minQty: 1,   maxQty: 1,   weight: 2 },
  { id: 'theme_golden',itemType: 'theme',name: 'Altın Premium Tema',rarity: 'legendary', icon: '✨', minQty: 1,   maxQty: 1,   weight: 1 },
];

const RARITY_COLORS = {
  common:    { bg: 'rgba(160,160,192,0.15)', border: 'rgba(160,160,192,0.3)',   text: '#a0a0c0', glow: 'rgba(160,160,192,0.2)' },
  rare:      { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',    text: '#60a5fa', glow: 'rgba(59,130,246,0.3)' },
  epic:      { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.3)',    text: '#a78bfa', glow: 'rgba(168,85,247,0.4)' },
  legendary: { bg: 'rgba(250,204,21,0.15)',  border: 'rgba(250,204,21,0.3)',    text: '#facc15', glow: 'rgba(250,204,21,0.5)' },
};

function calcLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpForNextLevel(level) {
  return level * XP_PER_LEVEL;
}

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rollLootBox(isPremium = false) {
  const pool = isPremium
    ? LOOT_BOX_POOL.map(i => ({ ...i, weight: i.rarity === 'common' ? i.weight * 0.5 : i.weight * 2 }))
    : [...LOOT_BOX_POOL];

  const item = weightedRandom(pool);
  const qty = item.minQty || 1;
  return {
    ...item,
    quantity: qty,
    colors: RARITY_COLORS[item.rarity] || RARITY_COLORS.common,
  };
}

function rewardForAction(action, isPremium = false) {
  const base = {
    message_sent:     { xp: 5,  coins: 2 },
    goal_completed:   { xp: 50, coins: 25 },
    habit_done:       { xp: 15, coins: 5 },
    streak_day:       { xp: 30, coins: 10 },
    challenge_won:    { xp: 100, coins: 50 },
    project_milestone:{ xp: 40, coins: 20 },
    login_streak:     { xp: 10, coins: 5 },
  }[action] || { xp: 2, coins: 1 };

  const mult = isPremium ? 2 : 1;
  return {
    xp: base.xp * mult,
    coins: base.coins * mult,
    action,
  };
}

function applyXpAndLevel(user, xpGained) {
  const oldLevel = user.level;
  const newTotalXp = (user.totalXp || 0) + xpGained;
  const newLevel = calcLevel(newTotalXp);
  const leveledUp = newLevel > oldLevel;
  return {
    newTotalXp,
    newLevel: leveledUp ? newLevel : oldLevel,
    leveledUp,
    oldLevel,
  };
}

module.exports = {
  XP_PER_LEVEL,
  LOOT_BOX_POOL,
  RARITY_COLORS,
  calcLevel,
  xpForNextLevel,
  weightedRandom,
  rollLootBox,
  rewardForAction,
  applyXpAndLevel,
};
