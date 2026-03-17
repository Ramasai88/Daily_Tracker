/**
 * historyManager.js
 * Task history management with date-based queries and filtering.
 * 
 * Provides comprehensive history viewing including:
 * - Past task completion history
 * - Date range filtering
 * - Search and filter capabilities
 * - Statistics and analytics
 */

import { TaskManager } from './taskManager.js';
import { StorageManager, todayStr } from './storageManager.js';

const listeners = new Set();

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(getHistoryData()));
}

/**
 * Get all historical tasks (non-recurring, past dates)
 * @returns {Array} Array of historical tasks
 */
function getHistoryData() {
  const allTasks = TaskManager.getAllTasks();
  const today = todayStr();
  
  return allTasks
    .filter(task => !task.recurring && task.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get tasks for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Array} Tasks for that date
 */
function getTasksByDate(date) {
  const allTasks = TaskManager.getAllTasks();
  return allTasks.filter(task => task.date === date);
}

/**
 * Get tasks for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Tasks in the date range
 */
function getTasksByDateRange(startDate, endDate) {
  const allTasks = TaskManager.getAllTasks();
  return allTasks
    .filter(task => task.date >= startDate && task.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get tasks for the past N days
 * @param {number} days - Number of days to look back
 * @returns {Array} Tasks from past N days
 */
function getTasksLastNDays(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return getTasksByDateRange(
    startDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(0, 10)
  );
}

/**
 * Get completed tasks history
 * @returns {Array} Completed tasks sorted by date
 */
function getCompletedHistory() {
  return getHistoryData().filter(task => task.completed);
}

/**
 * Get incomplete tasks history
 * @returns {Array} Incomplete tasks sorted by date
 */
function getIncompleteHistory() {
  return getHistoryData().filter(task => !task.completed);
}

/**
 * Search tasks by title or description
 * @param {string} query - Search query
 * @returns {Array} Matching tasks
 */
function searchTasks(query) {
  const history = getHistoryData();
  const lowerQuery = query.toLowerCase();
  
  return history.filter(task => 
    task.title.toLowerCase().includes(lowerQuery) ||
    task.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter tasks by priority
 * @param {string} priority - 'high', 'medium', or 'low'
 * @returns {Array} Filtered tasks
 */
function filterByPriority(priority) {
  return getHistoryData().filter(task => task.priority === priority);
}

/**
 * Get history grouped by date
 * @param {number} days - Number of days to include (default 30)
 * @returns {Object} Tasks grouped by date
 */
function getGroupedByDate(days = 30) {
  const tasks = getTasksLastNDays(days);
  const grouped = {};
  
  tasks.forEach(task => {
    if (!grouped[task.date]) {
      grouped[task.date] = {
        date: task.date,
        total: 0,
        completed: 0,
        tasks: []
      };
    }
    grouped[task.date].total++;
    if (task.completed) {
      grouped[task.date].completed++;
    }
    grouped[task.date].tasks.push(task);
  });
  
  return grouped;
}

/**
 * Get historical statistics
 * @returns {Object} Historical stats
 */
function getStats() {
  const history = getHistoryData();
  const completed = history.filter(t => t.completed);
  
  // Calculate streaks
  const dates = [...new Set(history.map(t => t.date))].sort().reverse();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = null;
  
  dates.forEach((date, index) => {
    const dayTasks = history.filter(t => t.date === date);
    const dayCompleted = dayTasks.filter(t => t.completed).length;
    
    if (dayCompleted > 0) {
      if (index === 0 || (lastDate && isConsecutiveDate(lastDate, date))) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      currentStreak = tempStreak;
      lastDate = date;
    } else {
      tempStreak = 0;
    }
  });
  
  // Priority breakdown
  const priorityBreakdown = {
    high: completed.filter(t => t.priority === 'high').length,
    medium: completed.filter(t => t.priority === 'medium').length,
    low: completed.filter(t => t.priority === 'low').length
  };
  
  return {
    totalTasks: history.length,
    completedTasks: completed.length,
    completionRate: history.length > 0 
      ? Math.round((completed.length / history.length) * 100) 
      : 0,
    currentStreak,
    longestStreak,
    priorityBreakdown,
    firstRecordedDate: dates[dates.length - 1] || null,
    lastRecordedDate: dates[0] || null
  };
}

/**
 * Check if two dates are consecutive
 */
function isConsecutiveDate(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d1 - d2);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Get calendar view data (tasks by date for a month)
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {Object} Calendar data with task info per day
 */
function getCalendarView(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const tasks = getTasksByDateRange(
    startDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(0, 10)
  );
  
  const calendar = {};
  
  // Initialize all days in month
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    calendar[dateStr] = {
      date: dateStr,
      total: 0,
      completed: 0,
      tasks: []
    };
  }
  
  // Fill in tasks
  tasks.forEach(task => {
    if (calendar[task.date]) {
      calendar[task.date].total++;
      if (task.completed) {
        calendar[task.date].completed++;
      }
      calendar[task.date].tasks.push(task);
    }
  });
  
  return calendar;
}

/**
 * Refresh history data and notify subscribers
 */
async function refresh() {
  await TaskManager.load();
  notify();
}

export const HistoryManager = {
  subscribe,
  refresh,
  getHistoryData,
  getTasksByDate,
  getTasksByDateRange,
  getTasksLastNDays,
  getCompletedHistory,
  getIncompleteHistory,
  searchTasks,
  filterByPriority,
  getGroupedByDate,
  getStats,
  getCalendarView
};
