import { TaskManager } from './taskManager.js';
import { SettingsManager } from './settingsManager.js';
import { ProgressEngine } from './progressEngine.js';
import { StreakEngine } from './streakEngine.js';
import { StorageManager, todayStr, setCurrentUser } from './storageManager.js';
import { HeatmapManager } from './heatmapManager.js';
import { HistoryManager } from './historyManager.js';
import { supabase } from './supabaseClient.js';





import {
  initTaskForm,
  renderAll,
  renderMotivation,
  initSettingsPanel,
  renderHeatmap,
  renderHistory,
  initHistoryFilters,
  renderHeatmapTaskPanel,
  scheduleReminder
} from './uiManager.js';

// Track if we're already rendering to prevent cascading renders
let isRendering = false;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {

  // 1. Get current user first
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('No user logged in. App will not load tasks.');
    document.body.innerHTML = '<div style="padding:40px;text-align:center;"><h1>Please log in</h1><p>You must be logged in to use this app.</p></div>';
    return;
  }
  
  currentUser = user;
  setCurrentUser(user);
  console.log('Logged in as:', user.id);

  // 2. Apply stored settings (theme/accent) immediately
  SettingsManager.init();

  // 3. Load tasks (async now because of Supabase)
  await TaskManager.load();

  // 3. Render everything
  renderAll();
  renderMotivation();
  renderHeatmap();
  renderHistory();
  renderHeatmapTaskPanel();

  // 4. Wire up forms and settings panel
  initTaskForm();
  initSettingsPanel();
  initHistoryFilters();

  // 5. Set today's date display
  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    dateEl.textContent = new Date().toLocaleDateString(undefined, opts);
  }

  // 6. Restore pending reminders from stored tasks
  TaskManager.getTodayTasks().forEach(t => {
    if (t.reminderEnabled && t.reminderTime) {
      scheduleReminder(t.title, t.reminderTime);
    }
  });

  // 7. Subscribe to task changes and re-render
  TaskManager.subscribe(() => {
    if (!isRendering) {
      isRendering = true;
      renderAll();
      renderHeatmap();
      renderHistory();
      renderHeatmapTaskPanel();
      setTimeout(() => { isRendering = false; }, 100);
    }
  });

    // 8. Schedule midnight refresh for recurring tasks
  scheduleMidnightRefresh();
});

function scheduleMidnightRefresh() {

  const now = new Date();

  const midnight = new Date(now);
  midnight.setHours(24,0,0,0);

  setTimeout(async () => {

    await TaskManager.load();
    renderAll();

    scheduleMidnightRefresh();

  }, midnight - now);
}
