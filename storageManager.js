import { supabase } from "./supabaseClient.js"
/**
 * storageManager.js
 * Centralized LocalStorage interface.
 *
 * SCHEMA:
 * focusflow_tasks       → Array<Task>
 * focusflow_settings    → { theme, accentColor, visibleCards, cardOrder, goalType, goalTarget, streakRule, streakThreshold }
 * focusflow_streak      → { currentStreak, lastStreakDate, bestStreak }
 * focusflow_coding      → Array<CodingPlatform>
 * focusflow_coding_streak → { currentStreak, lastStreakDate, bestStreak }
 * focusflow_147plan     → { bigTask, mediumTasks[4], smallTasks[7] }
 * focusflow_notes       → string (motivation notes)
 * focusflow_matrix      → { q1:[taskIds], q2:[taskIds], q3:[taskIds], q4:[taskIds] }
 */

const KEYS = {
  TASKS:          'focusflow_tasks',
  SETTINGS:       'focusflow_settings',
  STREAK:         'focusflow_streak',
  CODING:         'focusflow_coding',
  CODING_STREAK:  'focusflow_coding_streak',
  PLAN_147:       'focusflow_147plan',
  NOTES:          'focusflow_notes',
  MATRIX:         'focusflow_matrix',
};

const StorageManager = {
  // --- Generic helpers ---
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { localStorage.removeItem(key); },

 async getTasks() {

  const { data, error } = await supabase
    .from("tasks")
    .select("*")

  if (error) {
    console.error('Error loading tasks:', error)
    return []
  }

  // Decode extra data from description JSON
  const parsedData = data.map(t => {
    let extra = {
      text: '',
      priority: 'medium',
      recurring: false,
      reminderEnabled: false,
      reminderTime: null,
      reminderRepeat: 'none',
      recurringDays: [],
      estimatedMinutes: 0,
    };
    
    // Try to parse description as JSON (contains extra data)
    if (t.description) {
      try {
        extra = JSON.parse(t.description);
      } catch (e) {
        // If not JSON, treat as plain text description
        extra.text = t.description;
      }
    }
    
    return {
      id: t.id,
      title: t.title,
      description: extra.text || '',
      date: t.date,
      completed: t.completed || false,
      priority: extra.priority || 'medium',
      recurring: extra.recurring || false,
      reminderEnabled: extra.reminderEnabled || false,
      reminderTime: extra.reminderTime || null,
      reminderRepeat: extra.reminderRepeat || 'none',
      recurringDays: extra.recurringDays || [],
      estimatedMinutes: extra.estimatedMinutes || 0,
    };
  });

  return parsedData
},

async saveTasks(tasks) {

  // Get existing tasks to identify new ones vs updates
  const { data: existingTasks, error: fetchError } = await supabase
    .from("tasks")
    .select("id");

  const existingIds = new Set(existingTasks?.map(t => t.id) || []);

  // Separate new tasks from updates
  const newTasks = tasks.filter(t => !existingIds.has(t.id));
  const updates = tasks.filter(t => existingIds.has(t.id));

  let allSuccess = true;

  // Insert new tasks - encode extra data in description as JSON
  if (newTasks.length > 0) {
    const cleanNewTasks = newTasks.map(t => {
      const extraData = {
        text: t.description || '',
        priority: t.priority || 'medium',
        recurring: t.recurring || false,
        reminderEnabled: t.reminderEnabled || false,
        reminderTime: t.reminderTime || null,
        reminderRepeat: t.reminderRepeat || 'none',
        recurringDays: t.recurringDays || [],
        estimatedMinutes: t.estimatedMinutes || 0,
      };
      return {
        id: t.id,
        title: t.title,
        date: t.date,
        completed: t.completed || false,
        description: JSON.stringify(extraData),
      };
    });

    const { error: insertError } = await supabase
      .from("tasks")
      .insert(cleanNewTasks)
      .select();

    if (insertError) {
      console.error('Error inserting tasks:', insertError.message);
      allSuccess = false;
    }
  }

  // Update existing tasks - encode extra data in description as JSON
  if (updates.length > 0) {
    for (const task of updates) {
      const extraData = {
        text: task.description || '',
        priority: task.priority || 'medium',
        recurring: task.recurring || false,
        reminderEnabled: task.reminderEnabled || false,
        reminderTime: task.reminderTime || null,
        reminderRepeat: task.reminderRepeat || 'none',
        recurringDays: task.recurringDays || [],
        estimatedMinutes: task.estimatedMinutes || 0,
      };
      
      const cleanTask = {
        title: task.title,
        date: task.date,
        completed: task.completed || false,
        description: JSON.stringify(extraData),
      };

      const { error: updateError } = await supabase
        .from("tasks")
        .update(cleanTask)
        .eq('id', task.id);

      if (updateError) {
        console.error(`Error updating task ${task.id}:`, updateError.message);
        allSuccess = false;
      }
    }
  }

  return allSuccess;
},

async deleteTask(id) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error.message);
    return false;
  }
  return true;
},

  // --- Settings ---
  getSettings() {
    return this.get(KEYS.SETTINGS) || {
      theme: 'dark',
      accentColor: '#7c6bff',
      visibleCards: ['tasks','progress','streak','matrix','motivation','plan147'],
      cardOrder: ['tasks','progress','streak','matrix','motivation','plan147'],
      goalType: 'tasks',   // 'tasks' | 'hours' | 'custom'
      goalTarget: 5,
      streakRule: 'percent', // 'any' | 'percent' | 'custom'
      streakThreshold: 80,
    };
  },
  saveSettings(settings) { return this.set(KEYS.SETTINGS, settings); },

  // --- Streak ---
  getStreak() { return this.get(KEYS.STREAK) || { currentStreak:0, lastStreakDate:null, bestStreak:0 }; },
  saveStreak(streak) { return this.set(KEYS.STREAK, streak); },

  // --- Coding platforms ---
  getCoding() {
    return this.get(KEYS.CODING) || [
      { id:'lc', name:'LeetCode', solvedToday:0, totalSolved:0, dailyTarget:5, lastReset: todayStr() },
      { id:'cc', name:'CodeChef', solvedToday:0, totalSolved:0, dailyTarget:3, lastReset: todayStr() },
    ];
  },
  saveCoding(data) { return this.set(KEYS.CODING, data); },

  // --- Coding streak ---
  getCodingStreak() { return this.get(KEYS.CODING_STREAK) || { currentStreak:0, lastStreakDate:null, bestStreak:0 }; },
  saveCodingStreak(s) { return this.set(KEYS.CODING_STREAK, s); },

  // --- 1-4-7 Plan ---
  getPlan147() {
    return this.get(KEYS.PLAN_147) || {
      bigTask: { title:'', done:false },
      mediumTasks: Array(4).fill(null).map(()=>({title:'',done:false})),
      smallTasks:  Array(7).fill(null).map(()=>({title:'',done:false})),
    };
  },
  savePlan147(plan) { return this.set(KEYS.PLAN_147, plan); },

  // --- Notes ---
  getNotes() { return this.get(KEYS.NOTES) || ''; },
  saveNotes(notes) { return this.set(KEYS.NOTES, notes); },

  // --- Priority Matrix ---
  getMatrix() {
    return this.get(KEYS.MATRIX) || { q1:[], q2:[], q3:[], q4:[] };
  },
  saveMatrix(m) { return this.set(KEYS.MATRIX, m); },

  KEYS,
};

function todayStr() {
  return new Date().toISOString().slice(0,10);
}

export { StorageManager, todayStr };
