import { getKVData, setKVData } from './db.js';
import { getMemories, getMemorySummary } from './life-memory.js';
import { getLatestLifeScore, getLifeScoreTrend } from './life-score.js';
import { getTaskChains } from './task-chain.js';

function getYesterdayCompletion(taskChains) {
  const activeChains = taskChains.filter(c => c.status === 'active');
  if (activeChains.length === 0) return { rate: 0, completed: 0, total: 0 };

  let total = 0;
  let completed = 0;
  for (const chain of activeChains) {
    for (const task of chain.tasks) {
      if (task.status !== 'pending') total++;
      if (task.status === 'completed') completed++;
    }
  }

  return {
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
  };
}

function getPriorityTask(taskChains) {
  const activeChains = taskChains.filter(c => c.status === 'active');
  if (activeChains.length === 0) return null;

  for (const chain of activeChains) {
    const firstPending = chain.tasks.find(t => t.status === 'active' || t.status === 'pending');
    if (firstPending) {
      return {
        chainTitle: chain.goalTitle,
        taskTitle: firstPending.title,
        taskDescription: firstPending.description,
      };
    }
  }
  return null;
}

export async function generateCheckIn(userId) {
  const [memorySummary, lifeScore, trendData, taskChains] = await Promise.all([
    getMemorySummary(userId),
    getLatestLifeScore(userId),
    getLifeScoreTrend(userId),
    getTaskChains(userId, 'active'),
  ]);

  const yesterdayCompletion = getYesterdayCompletion(taskChains);
  const priorityTask = getPriorityTask(taskChains);

  const userName = memorySummary.totalMemories > 0 ? '' : '';
  const greeting = getTimeBasedGreeting();

  let droppedAreasMessage = '';
  if (trendData?.droppingAreas?.length > 0) {
    droppedAreasMessage = trendData.droppingAreas.map(a =>
      `${a.name} puanın son 30 günde düştü (${a.change > 0 ? '+' : ''}${a.change}).`
    ).join('\n');
  }

  const memories = await getMemories(userId, { limit: 3 });
  let memoryReminder = '';
  if (memories.length > 0) {
    const recentMem = memories[0];
    memoryReminder = `Geçmiş konuşmalarımızdan hatırlıyorum: ${recentMem.content.slice(0, 100)}`;
  }

  const checkIn = {
    greeting,
    yesterdayCompletion,
    priorityTask,
    lifeScore: lifeScore ? {
      overall: lifeScore.overall,
      health: lifeScore.health,
      career: lifeScore.career,
      finance: lifeScore.finance,
      education: lifeScore.education,
      social: lifeScore.social,
    } : null,
    trend: trendData ? {
      droppingAreas: trendData.droppingAreas,
      highestArea: trendData.highestArea,
      lowestArea: trendData.lowestArea,
    } : null,
    droppedAreasMessage,
    memoryReminder,
    activeGoals: taskChains.length,
    generatedAt: new Date().toISOString(),
  };

  return checkIn;
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'Tünaydın';
  return 'İyi akşamlar';
}

export async function saveCheckInLog(userId, checkIn) {
  const key = `checkin_logs:${userId}`;
  const stored = await getKVData(key);
  if (!Array.isArray(stored)) stored.data = [];

  stored.data.push({
    ...checkIn,
    id: `ci_${Date.now()}`,
    userId,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  });

  await setKVData(key, stored);
}

export async function getCheckInHistory(userId, days = 7) {
  const key = `checkin_logs:${userId}`;
  const stored = await getKVData(key);
  const logs = stored?.data || [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return logs
    .filter(l => new Date(l.createdAt) >= cutoff)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
