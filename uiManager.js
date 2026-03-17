/**
 * uiManager.js
 * Orchestrates all dashboard rendering for Page 1.
 * Delegates to sub-render functions per card.
 */

import { TaskManager } from './taskManager.js';
import { ProgressEngine } from './progressEngine.js';
import { StreakEngine } from './streakEngine.js';
import { SettingsManager } from './settingsManager.js';
import { StorageManager, todayStr } from './storageManager.js';
import { HeatmapManager } from './heatmapManager.js';
import { HistoryManager } from './historyManager.js';

// ─── QUOTES ───────────────────────────────────────────────────────────────────
const QUOTES = [
  "Consistency beats intensity.",
  "Small daily improvements lead to stunning results.",
  "Do it now. Sometimes 'later' becomes 'never'.",
  "Progress, not perfection.",
  "One task at a time. One day at a time.",
  "Your future self is watching. Make them proud.",
  "Discipline is choosing between what you want now and what you want most.",
  "The secret of getting ahead is getting started.",
];

// ─── TASK FORM ─────────────────────────────────────────────────────────────────
export function initTaskForm() {
  const btn = document.getElementById('add-task-btn');
  const modal = document.getElementById('task-modal');
  const form = document.getElementById('task-form');
  const cancelBtn = document.getElementById('modal-cancel');
  const closeBtn = document.getElementById('modal-close');

  btn?.addEventListener('click', () => openTaskModal());
  cancelBtn?.addEventListener('click', closeTaskModal);
  closeBtn?.addEventListener('click', closeTaskModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeTaskModal(); });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    submitTaskForm();
  });
}

let editingTaskId = null;

function openTaskModal(task = null) {
  editingTaskId = task ? task.id : null;
  const modal = document.getElementById('task-modal');
  const title = document.getElementById('modal-title');
  title.textContent = task ? 'Edit Task' : 'Add New Task';

  if (task) {
    document.getElementById('tf-title').value = task.title;
    document.getElementById('tf-desc').value = task.description;
    document.getElementById('tf-date').value = task.date;
    document.getElementById('tf-reminder').value = task.reminderTime || '';
    document.getElementById('tf-priority').value = task.priority;
    document.getElementById('tf-estimate').value = task.estimatedMinutes || 0;
    document.getElementById('tf-recurring').checked = task.recurring;
    document.getElementById('tf-reminder-enabled').checked = task.reminderEnabled;
  } else {
    document.getElementById('task-form').reset();
    document.getElementById('tf-date').value = todayStr();
  }
  modal.classList.add('open');
  document.getElementById('tf-title').focus();
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('open');
  editingTaskId = null;
}

function submitTaskForm() {
  const data = {
    title: document.getElementById('tf-title').value.trim(),
    description: document.getElementById('tf-desc').value.trim(),
    date: document.getElementById('tf-date').value,
    reminderTime: document.getElementById('tf-reminder').value || null,
    priority: document.getElementById('tf-priority').value,
    estimatedMinutes: parseInt(document.getElementById('tf-estimate').value) || 0,
    recurring: document.getElementById('tf-recurring').checked,
    reminderEnabled: document.getElementById('tf-reminder-enabled').checked,
    recurringDays: [0,1,2,3,4,5,6], // all days for simplicity; could extend
  };
  if (!data.title) return;

  if (editingTaskId) {
    TaskManager.editTask(editingTaskId, data);
  } else {
    TaskManager.addTask(data);
  }
  closeTaskModal();
  renderAll();

  if (data.reminderEnabled && data.reminderTime) {
    scheduleReminder(data.title, data.reminderTime);
  }
}

// ─── RENDER TASKS ─────────────────────────────────────────────────────────────
export function renderTasks() {
  const list = document.getElementById('task-list');
  if (!list) return;
  const tasks = TaskManager.getTodayTasks();

  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state"><span>✦</span><p>No tasks for today. Add one!</p></div>`;
    return;
  }

  const priorityOrder = { high:0, medium:1, low:2 };
  const sorted = [...tasks].sort((a,b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  list.innerHTML = sorted.map(t => `
    <div class="task-item ${t.completed ? 'completed' : ''} priority-${t.priority}" data-id="${t.id}">
      <button class="task-check" data-action="toggle" data-id="${t.id}">
        ${t.completed ? '✓' : ''}
      </button>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge priority-badge-${t.priority}">${t.priority}</span>
          ${t.estimatedMinutes ? `<span class="badge">${t.estimatedMinutes}min</span>` : ''}
          ${t.reminderTime ? `<span class="badge">⏰ ${t.reminderTime}</span>` : ''}
          ${t.recurring ? `<span class="badge">🔁 Recurring</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-action="edit" data-id="${t.id}" title="Edit">✎</button>
        <button class="icon-btn danger" data-action="delete" data-id="${t.id}" title="Delete">✕</button>
      </div>
    </div>
  `).join('');

  // Use event delegation - only attach once per render cycle
  list.onclick = handleTaskClick;
}

function handleTaskClick(e) {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action || !id) return;
  if (action === 'toggle') { TaskManager.toggleComplete(id); }
  if (action === 'edit')   { openTaskModal(TaskManager.getTaskById(id)); }
  if (action === 'delete') { if (confirm('Delete task?')) { TaskManager.deleteTask(id); } }
}

// ─── RENDER PROGRESS ──────────────────────────────────────────────────────────
export function renderProgress() {
  const p = ProgressEngine.calculate();
  const bar = document.getElementById('progress-bar-fill');
  const pct = document.getElementById('progress-percent');
  const lbl = document.getElementById('progress-label');
  if (bar) bar.style.width = p.percent + '%';
  if (pct) pct.textContent = p.percent + '%';
  if (lbl) lbl.textContent = p.label;
}

// ─── RENDER STREAK ────────────────────────────────────────────────────────────
export function renderStreak() {
  const streak = StreakEngine.evaluate();
  const el = document.getElementById('streak-count');
  const best = document.getElementById('streak-best');
  if (el) el.textContent = streak.currentStreak;
  if (best) best.textContent = streak.bestStreak;
}

// ─── RENDER 1-4-7 PLAN ────────────────────────────────────────────────────────
export function renderPlan147() {
  const plan = StorageManager.getPlan147();
  renderPlanSection('plan-big', [plan.bigTask], 'big');
  renderPlanSection('plan-medium', plan.mediumTasks, 'medium');
  renderPlanSection('plan-small', plan.smallTasks, 'small');
}

function renderPlanSection(containerId, items, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map((item, i) => `
    <div class="plan-item ${item.done ? 'done' : ''}">
      <button class="plan-check" data-type="${type}" data-idx="${i}">${item.done ? '✓' : ''}</button>
      <input class="plan-input" type="text" placeholder="Add task..." value="${esc(item.title)}" data-type="${type}" data-idx="${i}">
    </div>
  `).join('');

  el.querySelectorAll('.plan-check').forEach(btn => {
    btn.addEventListener('click', () => togglePlanItem(btn.dataset.type, parseInt(btn.dataset.idx)));
  });
  el.querySelectorAll('.plan-input').forEach(inp => {
    inp.addEventListener('change', () => updatePlanTitle(inp.dataset.type, parseInt(inp.dataset.idx), inp.value));
  });
}

function togglePlanItem(type, idx) {
  const plan = StorageManager.getPlan147();
  if (type === 'big') plan.bigTask.done = !plan.bigTask.done;
  else if (type === 'medium') plan.mediumTasks[idx].done = !plan.mediumTasks[idx].done;
  else plan.smallTasks[idx].done = !plan.smallTasks[idx].done;
  StorageManager.savePlan147(plan);
  renderPlan147();
}

function updatePlanTitle(type, idx, value) {
  const plan = StorageManager.getPlan147();
  if (type === 'big') plan.bigTask.title = value;
  else if (type === 'medium') plan.mediumTasks[idx].title = value;
  else plan.smallTasks[idx].title = value;
  StorageManager.savePlan147(plan);
}

// ─── RENDER MOTIVATION ────────────────────────────────────────────────────────
export function renderMotivation() {
  const quoteEl = document.getElementById('daily-quote');
  if (quoteEl) {
    const idx = new Date().getDate() % QUOTES.length;
    quoteEl.textContent = `"${QUOTES[idx]}"`;
  }
  const notesEl = document.getElementById('motivation-notes');
  if (notesEl) {
    notesEl.value = StorageManager.getNotes();
    notesEl.addEventListener('input', () => StorageManager.saveNotes(notesEl.value));
  }
}

// ─── RENDER MATRIX ────────────────────────────────────────────────────────────
export function renderMatrix() {
  // Priority matrix — show tasks in quadrants based on priority and estimate
  const tasks = TaskManager.getTodayTasks();
  const quadrants = {
    q1: tasks.filter(t => t.priority === 'high' && t.estimatedMinutes <= 30),
    q2: tasks.filter(t => t.priority === 'high' && t.estimatedMinutes > 30),
    q3: tasks.filter(t => t.priority !== 'high' && t.estimatedMinutes <= 30),
    q4: tasks.filter(t => t.priority !== 'high' && t.estimatedMinutes > 30),
  };

  Object.entries(quadrants).forEach(([q, qTasks]) => {
    const el = document.getElementById(`matrix-${q}`);
    if (!el) return;
    el.innerHTML = qTasks.length
      ? qTasks.map(t => `<div class="matrix-task ${t.completed ? 'done' : ''}">${esc(t.title)}</div>`).join('')
      : `<span class="matrix-empty">Empty</span>`;
  });
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
export function initSettingsPanel() {
  const btn = document.getElementById('settings-btn');
  const panel = document.getElementById('settings-panel');
  const closeBtn = document.getElementById('settings-close');

  btn?.addEventListener('click', () => { panel.classList.toggle('open'); renderSettingsForm(); });
  closeBtn?.addEventListener('click', () => panel.classList.remove('open'));

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const s = SettingsManager.get();
    SettingsManager.update({ theme: s.theme === 'dark' ? 'light' : 'dark' });
    renderAll();
  });
}

function renderSettingsForm() {
  const s = SettingsManager.get();
  const accentEl = document.getElementById('s-accent');
  if (accentEl) { accentEl.value = s.accentColor; accentEl.oninput = () => SettingsManager.update({ accentColor: accentEl.value }); }

  const goalTypeEl = document.getElementById('s-goal-type');
  const goalTargetEl = document.getElementById('s-goal-target');
  if (goalTypeEl) { goalTypeEl.value = s.goalType; goalTypeEl.onchange = () => { SettingsManager.update({ goalType: goalTypeEl.value }); }; }
  if (goalTargetEl) { goalTargetEl.value = s.goalTarget; goalTargetEl.oninput = () => { SettingsManager.update({ goalTarget: parseInt(goalTargetEl.value) || 5 }); }; }

  const streakRuleEl = document.getElementById('s-streak-rule');
  const streakThreshEl = document.getElementById('s-streak-threshold');
  if (streakRuleEl) { streakRuleEl.value = s.streakRule; streakRuleEl.onchange = () => { SettingsManager.update({ streakRule: streakRuleEl.value }); }; }
  if (streakThreshEl) { streakThreshEl.value = s.streakThreshold; streakThreshEl.oninput = () => { SettingsManager.update({ streakThreshold: parseInt(streakThreshEl.value) || 80 }); }; }
}

// ─── REMINDER / NOTIFICATIONS ─────────────────────────────────────────────────
export function scheduleReminder(title, time) {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(perm => {
    if (perm !== 'granted') return;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    setTimeout(() => new Notification(`⏰ FocusFlow Reminder`, { body: title, icon: '/favicon.ico' }), ms);
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── RENDER HEATMAP ───────────────────────────────────────────────────────────
export function renderHeatmap() {
  const container = document.getElementById('heatmap-container');
  if (!container) return;

  const heatmapData = HeatmapManager.getYearlyData();
  const stats = HeatmapManager.getActivityStreak();
  
  // Update stats
  const streakEl = document.getElementById('heatmap-streak');
  if (streakEl) streakEl.textContent = stats;

  // Generate heatmap grid (last 12 weeks = 84 days for a compact view)
  const weeks = 12;
  const daysPerWeek = 7;
  const totalDays = weeks * daysPerWeek;
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalDays + 1);

  let html = '<div class="heatmap-grid">';
  
  // Day labels
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  html += '<div class="heatmap-days">';
  dayLabels.forEach(label => {
    html += `<div class="heatmap-day-label">${label}</div>`;
  });
  html += '</div>';

  // Generate week columns
  for (let w = 0; w < weeks; w++) {
    html += '<div class="heatmap-week">';
    for (let d = 0; d < daysPerWeek; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + w * 7 + d);
      const dateStr = currentDate.toISOString().slice(0, 10);
      const dayData = heatmapData[dateStr] || { level: 0, completed: 0 };
      
      const title = `${dateStr}: ${dayData.completed} tasks completed`;
      html += `<div class="heatmap-cell level-${dayData.level}" title="${title}"></div>`;
    }
    html += '</div>';
  }
  
  html += '</div>';
  
  // Legend
  html += '<div class="heatmap-legend">';
  html += '<span class="heatmap-legend-label">Less</span>';
  for (let i = 0; i <= 4; i++) {
    html += `<div class="heatmap-cell level-${i}"></div>`;
  }
  html += '<span class="heatmap-legend-label">More</span>';
  html += '</div>';
  
  container.innerHTML = html;
}

// ─── RENDER HISTORY ───────────────────────────────────────────────────────────
export function renderHistory() {
  const listContainer = document.getElementById('history-list');
  const statsContainer = document.getElementById('history-stats');
  
  if (!listContainer && !statsContainer) return;

  const historyData = HistoryManager.getHistoryData();
  const stats = HistoryManager.getStats();
  
  // Render stats
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="history-stat">
        <div class="history-stat-value">${stats.completedTasks}</div>
        <div class="history-stat-label">Completed</div>
      </div>
      <div class="history-stat">
        <div class="history-stat-value">${stats.completionRate}%</div>
        <div class="history-stat-label">Rate</div>
      </div>
      <div class="history-stat">
        <div class="history-stat-value">${stats.longestStreak}</div>
        <div class="history-stat-label">Best Streak</div>
      </div>
    `;
  }

  // Render history list (last 20 tasks)
  if (listContainer) {
    const recentTasks = historyData.slice(0, 20);
    
    if (!recentTasks.length) {
      listContainer.innerHTML = '<div class="empty-state"><span>📋</span><p>No task history yet.</p></div>';
      return;
    }

    // Group by date
    const grouped = {};
    recentTasks.forEach(task => {
      if (!grouped[task.date]) {
        grouped[task.date] = [];
      }
      grouped[task.date].push(task);
    });

    let html = '';
    Object.entries(grouped).forEach(([date, tasks]) => {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const completedCount = tasks.filter(t => t.completed).length;
      
      html += `<div class="history-date-group">`;
      html += `<div class="history-date-header">${formattedDate} <span class="history-date-count">${completedCount}/${tasks.length}</span></div>`;
      
      tasks.forEach(task => {
        html += `
          <div class="history-task ${task.completed ? 'completed' : ''}">
            <span class="history-task-check">${task.completed ? '✓' : '○'}</span>
            <span class="history-task-title">${esc(task.title)}</span>
            <span class="badge priority-badge-${task.priority}">${task.priority}</span>
          </div>
        `;
      });
      
      html += '</div>';
    });

    listContainer.innerHTML = html;
  }
}

// ─── HISTORY FILTER ───────────────────────────────────────────────────────────
export function initHistoryFilters() {
  const searchInput = document.getElementById('history-search');
  const filterSelect = document.getElementById('history-filter');
  const dateRangeSelect = document.getElementById('history-range');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      const query = searchInput.value.trim();
      if (query) {
        const results = HistoryManager.searchTasks(query);
        renderFilteredHistory(results);
      } else {
        renderHistory();
      }
    }, 300));
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      const priority = filterSelect.value;
      if (priority === 'all') {
        renderHistory();
      } else {
        const filtered = HistoryManager.filterByPriority(priority);
        renderFilteredHistory(filtered);
      }
    });
  }

  if (dateRangeSelect) {
    dateRangeSelect.addEventListener('change', () => {
      const range = dateRangeSelect.value;
      let filtered;
      switch (range) {
        case '7':
          filtered = HistoryManager.getTasksLastNDays(7);
          break;
        case '30':
          filtered = HistoryManager.getTasksLastNDays(30);
          break;
        case '90':
          filtered = HistoryManager.getTasksLastNDays(90);
          break;
        default:
          filtered = HistoryManager.getHistoryData();
      }
      renderFilteredHistory(filtered);
    });
  }
}

function renderFilteredHistory(tasks) {
  const listContainer = document.getElementById('history-list');
  if (!listContainer) return;

  if (!tasks.length) {
    listContainer.innerHTML = '<div class="empty-state"><span>🔍</span><p>No matching tasks found.</p></div>';
    return;
  }

  // Group by date
  const grouped = {};
  tasks.forEach(task => {
    if (!grouped[task.date]) {
      grouped[task.date] = [];
    }
    grouped[task.date].push(task);
  });

  let html = '';
  Object.entries(grouped).forEach(([date, dateTasks]) => {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const completedCount = dateTasks.filter(t => t.completed).length;
    
    html += `<div class="history-date-group">`;
    html += `<div class="history-date-header">${formattedDate} <span class="history-date-count">${completedCount}/${dateTasks.length}</span></div>`;
    
    dateTasks.forEach(task => {
      html += `
        <div class="history-task ${task.completed ? 'completed' : ''}">
          <span class="history-task-check">${task.completed ? '✓' : '○'}</span>
          <span class="history-task-title">${esc(task.title)}</span>
          <span class="badge priority-badge-${task.priority}">${task.priority}</span>
        </div>
      `;
    });
    
    html += '</div>';
  });

  listContainer.innerHTML = html;
}

function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function renderAll() {
  renderTasks();
  renderProgress();
  renderStreak();
  renderMatrix();
  renderPlan147();
  renderHeatmap();
  renderHistory();
}
