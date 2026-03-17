/**
 * codingTracker.js
 * Manages coding practice platforms, counters, daily resets, and streak.
 *
 * Platform shape:
 * {
 *   id: string,
 *   name: string,
 *   solvedToday: number,
 *   totalSolved: number,
 *   dailyTarget: number,
 *   lastReset: 'YYYY-MM-DD',
 * }
 *
 * Daily reset logic:
 *   On load, if lastReset !== today → solvedToday resets to 0.
 *
 * Coding streak:
 *   If any platform has solvedToday >= 1, streak continues.
 */

import { StorageManager, todayStr } from './storageManager.js';

const listeners = new Set();
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach(fn => fn(getPlatforms())); }

let platforms = [];
let notes = '';

function load() {
  platforms = StorageManager.getCoding();
  notes = StorageManager.getNotes();
  resetDailyCounts();
}

/**
 * resetDailyCounts:
 * For each platform, if lastReset !== today, reset solvedToday to 0.
 * This handles new-day detection.
 */
function resetDailyCounts() {
  const today = todayStr();
  let changed = false;
  platforms.forEach(p => {
    if (p.lastReset !== today) {
      p.solvedToday = 0;
      p.lastReset = today;
      changed = true;
    }
  });
  if (changed) StorageManager.saveCoding(platforms);
}

function save() { StorageManager.saveCoding(platforms); notify(); evaluateStreak(); }

function getPlatforms() { return [...platforms]; }

function addPlatform(name) {
  const p = {
    id: crypto.randomUUID(),
    name: name || 'New Platform',
    solvedToday: 0,
    totalSolved: 0,
    dailyTarget: 5,
    lastReset: todayStr(),
  };
  platforms.push(p);
  save();
  return p;
}

function renamePlatform(id, newName) {
  const p = platforms.find(x => x.id === id);
  if (p) { p.name = newName; save(); }
}

function deletePlatform(id) {
  platforms = platforms.filter(x => x.id !== id);
  save();
}

function increment(id) {
  const p = platforms.find(x => x.id === id);
  if (p) { p.solvedToday++; p.totalSolved++; save(); }
}

function decrement(id) {
  const p = platforms.find(x => x.id === id);
  if (p && p.solvedToday > 0) { p.solvedToday--; p.totalSolved = Math.max(0, p.totalSolved-1); save(); }
}

function resetDaily(id) {
  const p = platforms.find(x => x.id === id);
  if (p) { p.solvedToday = 0; save(); }
}

function setTarget(id, target) {
  const p = platforms.find(x => x.id === id);
  if (p) { p.dailyTarget = target; save(); }
}

// --- Notes ---
function getNotes() { return notes; }
function saveNotes(text) { notes = text; StorageManager.saveNotes(text); }

// --- Coding Streak ---
function evaluateStreak() {
  const streak = StorageManager.getCodingStreak();
  const today = todayStr();
  const anySolved = platforms.some(p => p.solvedToday >= 1);

  if (streak.lastStreakDate === today) {
    if (!anySolved) {
      streak.currentStreak = Math.max(0, streak.currentStreak - 1);
      streak.lastStreakDate = yesterdayStr();
      StorageManager.saveCodingStreak(streak);
    }
    return streak;
  }

  if (anySolved) {
    const last = streak.lastStreakDate;
    streak.currentStreak = (last === yesterdayStr()) ? streak.currentStreak + 1 : 1;
    streak.lastStreakDate = today;
    streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
    StorageManager.saveCodingStreak(streak);
  }
  return streak;
}

function getCodingStreak() { return StorageManager.getCodingStreak(); }

function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}

export const CodingTracker = { load, getPlatforms, addPlatform, renamePlatform, deletePlatform, increment, decrement, resetDaily, setTarget, getNotes, saveNotes, getCodingStreak, subscribe };
