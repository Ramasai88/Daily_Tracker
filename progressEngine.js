/**
 * progressEngine.js
 * Calculates daily progress based on the current goal type.
 *
 * Goal types:
 *  'tasks'  → count completed tasks / goalTarget
 *  'hours'  → sum estimatedMinutes of completed tasks / (goalTarget * 60)
 *  'custom' → user manually supplies current value vs goalTarget
 *
 * Progress auto-recalculates whenever tasks change or goal settings change.
 */

import { StorageManager } from './storageManager.js';
import { TaskManager } from './taskManager.js';

const listeners = new Set();
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify(data) { listeners.forEach(fn => fn(data)); }

function calculate() {
  const settings = StorageManager.getSettings();
  const todayTasks = TaskManager.getTodayTasks();
  const completed = todayTasks.filter(t => t.completed);
  const total = todayTasks.length;

  let current = 0;
  let target = settings.goalTarget || 5;
  let label = '';

  if (settings.goalType === 'tasks') {
    current = completed.length;
    target = settings.goalTarget || 5;
    label = `${current} / ${target} tasks`;
  } else if (settings.goalType === 'hours') {
    // sum estimated minutes of completed tasks → convert to hours
    current = parseFloat(
      (completed.reduce((s, t) => s + (t.estimatedMinutes || 0), 0) / 60).toFixed(2)
    );
    target = settings.goalTarget || 4;
    label = `${current}h / ${target}h`;
  } else {
    // 'custom' — same as tasks fallback
    current = completed.length;
    target = settings.goalTarget || 5;
    label = `${current} / ${target}`;
  }

  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const result = { current, target, percent, label, completedCount: completed.length, totalTasks: total };
  notify(result);
  return result;
}

// Wire up auto-recalculation when tasks change
TaskManager.subscribe(() => calculate());

export const ProgressEngine = { calculate, subscribe };
