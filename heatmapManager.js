/**
 * heatmapManager.js
 * Activity heatmap visualization for task completion over time.
 * 
 * Provides data for a GitHub-style contribution heatmap showing
 * task completion activity across days.
 */

import { TaskManager } from './taskManager.js';
import { StorageManager, todayStr } from './storageManager.js';

const listeners = new Set();

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(getHeatmapData()));
}

/**
 * Calculate heatmap data for the past N days
 * @param {number} days - Number of days to include (default 365)
 * @returns {Object} Heatmap data grouped by date
 */
function getHeatmapData(days = 365) {
  const allTasks = TaskManager.getAllTasks();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const heatmap = {};
  
  // Initialize all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    heatmap[dateStr] = {
      date: dateStr,
      total: 0,
      completed: 0,
      level: 0
    };
  }

  // Aggregate task data
  allTasks.forEach(task => {
    if (task.date && heatmap[task.date]) {
      heatmap[task.date].total++;
      if (task.completed) {
        heatmap[task.date].completed++;
      }
    }
  });

  // Calculate intensity levels (0-4)
  Object.values(heatmap).forEach(day => {
    day.level = calculateLevel(day.completed);
  });

  return heatmap;
}

/**
 * Calculate heatmap intensity level based on completed tasks
 * @param {number} completed - Number of completed tasks
 * @returns {number} Level 0-4
 */
function calculateLevel(completed) {
  if (completed === 0) return 0;
  if (completed <= 2) return 1;
  if (completed <= 4) return 2;
  if (completed <= 6) return 3;
  return 4;
}

/**
 * Get heatmap data for the current week
 * @returns {Object} Weekly heatmap data
 */
function getWeeklyData() {
  return getHeatmapData(7);
}

/**
 * Get heatmap data for the current month
 * @returns {Object} Monthly heatmap data
 */
function getMonthlyData() {
  return getHeatmapData(30);
}

/**
 * Get heatmap data for the current year
 * @returns {Object} Yearly heatmap data (default)
 */
function getYearlyData() {
  return getHeatmapData(365);
}

/**
 * Get activity stats for a specific date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Stats for the date range
 */
function getRangeStats(startDate, endDate) {
  const heatmap = getHeatmapData(365);
  let totalTasks = 0;
  let completedTasks = 0;
  let activeDays = 0;

  Object.values(heatmap).forEach(day => {
    if (day.date >= startDate && day.date <= endDate) {
      totalTasks += day.total;
      completedTasks += day.completed;
      if (day.completed > 0) activeDays++;
    }
  });

  return {
    startDate,
    endDate,
    totalTasks,
    completedTasks,
    activeDays,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  };
}

/**
 * Get the most productive days (top 5)
 * @returns {Array} Top 5 most productive days
 */
function getTopProductiveDays() {
  const heatmap = getHeatmapData(365);
  return Object.values(heatmap)
    .filter(day => day.completed > 0)
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5);
}

/**
 * Get current streak of consecutive days with completed tasks
 * @returns {number} Current streak count
 */
function getActivityStreak() {
  const heatmap = getHeatmapData(365);
  const today = todayStr();
  let streak = 0;
  let currentDate = new Date();

  // Check from today backwards
  while (true) {
    const dateStr = currentDate.toISOString().slice(0, 10);
    if (heatmap[dateStr] && heatmap[dateStr].completed > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (dateStr !== today) {
      // If today hasn't had any activity yet, don't break the streak
      break;
    } else {
      // Today has no activity yet, check yesterday
      currentDate.setDate(currentDate.getDate() - 1);
      const yesterdayStr = currentDate.toISOString().slice(0, 10);
      if (heatmap[yesterdayStr] && heatmap[yesterdayStr].completed > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Safety limit
    if (streak > 365) break;
  }

  return streak;
}

/**
 * Refresh heatmap data and notify subscribers
 */
async function refresh() {
  await TaskManager.load();
  notify();
}

export const HeatmapManager = {
  subscribe,
  refresh,
  getHeatmapData,
  getWeeklyData,
  getMonthlyData,
  getYearlyData,
  getRangeStats,
  getTopProductiveDays,
  getActivityStreak,
  calculateLevel
};
