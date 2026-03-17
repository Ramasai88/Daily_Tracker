/**
 * streakEngine.js
 * Dynamic streak calculation.
 *
 * Streak rules (stored in settings.streakRule):
 *   'any'     → at least 1 task completed
 *   'percent' → completion% >= settings.streakThreshold
 *   'custom'  → user defined count >= settings.streakThreshold
 *
 * How it works:
 *  1. On each task change, evaluate today's completion.
 *  2. Compare to lastStreakDate:
 *     - If today already counted, just update current streak display.
 *     - If yesterday was last date AND rule met today → increment streak.
 *     - If gap > 1 day → reset streak.
 *  3. Best streak tracked and persisted.
 */

import { StorageManager, todayStr } from './storageManager.js';
import { ProgressEngine } from './progressEngine.js';
import { TaskManager } from './taskManager.js';

const listeners = new Set();
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify(data) { listeners.forEach(fn => fn(data)); }

function evaluate() {
  const settings = StorageManager.getSettings();
  const progress = ProgressEngine.calculate();
  const streak = StorageManager.getStreak();
  const today = todayStr();

  const ruleMet = checkRule(settings, progress);

  if (streak.lastStreakDate === today) {
    // Already recorded today — just emit current state
    if (!ruleMet) {
      // Rule no longer met today (e.g. task unchecked) — potentially reduce
      streak.currentStreak = Math.max(0, streak.currentStreak - 1);
      streak.lastStreakDate = yesterday();
      StorageManager.saveStreak(streak);
    }
    notify(streak);
    return streak;
  }

  if (ruleMet) {
    const last = streak.lastStreakDate;
    if (last === yesterday()) {
      streak.currentStreak += 1;
    } else if (last !== today) {
      // Gap → restart
      streak.currentStreak = 1;
    }
    streak.lastStreakDate = today;
    streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
    StorageManager.saveStreak(streak);
  }

  notify(streak);
  return streak;
}

/**
 * checkRule: returns true if today's progress satisfies the streak rule.
 */
function checkRule(settings, progress) {
  const rule = settings.streakRule || 'any';
  if (rule === 'any') return progress.completedCount >= 1;
  if (rule === 'percent') return progress.percent >= (settings.streakThreshold || 80);
  if (rule === 'custom') return progress.completedCount >= (settings.streakThreshold || 1);
  return false;
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0,10);
}

// Auto-recalculate on task changes
TaskManager.subscribe(() => evaluate());

export const StreakEngine = { evaluate, subscribe };
