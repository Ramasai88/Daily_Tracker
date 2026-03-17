/**
 * taskManager.js
 * CRUD operations for tasks + recurring logic.
 *
 * Task shape:
 * {
 *   id: string,
 *   title: string,
 *   description: string,
 *   date: 'YYYY-MM-DD',
 *   reminderTime: 'HH:MM' | null,
 *   reminderRepeat: 'none'|'daily'|'weekly'|'custom',
 *   reminderEnabled: boolean,
 *   recurring: boolean,
 *   recurringDays: number[],   // 0=Sun..6=Sat
 *   priority: 'high'|'medium'|'low',
 *   estimatedMinutes: number,
 *   completed: boolean,
 *   createdAt: ISO string,
 * }
 */

import { StorageManager, todayStr } from './storageManager.js';

let tasks = [];
const listeners = new Set();

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(getTodayTasks()));
}

async function load() {
  tasks = await StorageManager.getTasks();
  generateRecurring();
}

async function save() {
  const success = await StorageManager.saveTasks(tasks);
  if (!success) {
    console.warn('Some tasks failed to save');
  }
  notify();
}

/**
 * generateRecurring:
 * For every recurring task template, if today matches its recurringDays
 * and no copy exists for today, create one.
 */
function generateRecurring() {
  const today = todayStr();
  const todayDow = new Date().getDay();

  const templates = tasks.filter(t => t.recurring);

  templates.forEach(tmpl => {

    if (!tmpl.recurringDays.includes(todayDow)) return;

    const exists = tasks.some(
      t => t.date === today && t._recurringFrom === tmpl.id
    );

    if (!exists) {
      tasks.push({
        ...tmpl,
        id: crypto.randomUUID(),
        date: today,
        completed: false,
        _recurringFrom: tmpl.id,
        recurring: false
      });
    }

  });
}

async function addTask(data) {

  const task = {
    id: crypto.randomUUID(),
    title: data.title || 'Untitled Task',
    description: data.description || '',
    date: data.date || todayStr(),
    reminderTime: data.reminderTime || null,
    reminderRepeat: data.reminderRepeat || 'none',
    reminderEnabled: data.reminderEnabled ?? false,
    recurring: data.recurring ?? false,
    recurringDays: data.recurringDays || [],
    priority: data.priority || 'medium',
    estimatedMinutes: data.estimatedMinutes || 0,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.push(task);

  if (task.recurring) generateRecurring();

  await save();

  return task;
}

async function editTask(id, updates) {

  const idx = tasks.findIndex(t => t.id === id);

  if (idx === -1) return null;

  tasks[idx] = { ...tasks[idx], ...updates };

  await save();

  return tasks[idx];
}

async function deleteTask(id) {

  tasks = tasks.filter(t => t.id !== id);
  
  await StorageManager.deleteTask(id);
  
  notify();
}

async function toggleComplete(id) {

  const task = tasks.find(t => t.id === id);

  if (!task) return;

  task.completed = !task.completed;

  await save();
}

async function moveTask(id, newDate) {

  await editTask(id, { date: newDate });
}

function getTodayTasks() {

  return tasks.filter(
    t => t.date === todayStr() && !t.recurring
  );
}

function getAllTasks() {
  return [...tasks];
}

function getTaskById(id) {

  return tasks.find(t => t.id === id) || null;
}

export const TaskManager = {
  load,
  addTask,
  editTask,
  deleteTask,
  toggleComplete,
  moveTask,
  getTodayTasks,
  getAllTasks,
  getTaskById,
  subscribe
};
