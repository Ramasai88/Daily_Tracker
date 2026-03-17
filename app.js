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

// Initialize app with auth check wrapped in async IIFE for browser compatibility
(async function initApp() {
  try {
    // 1. Early auth check
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    
    console.log("Early Auth Check:", user);
    
    if (!user) {
      console.warn('No user logged in. Redirecting to login...');
      window.location.replace('/login.html');
      return; // Stop initialization
    }
    
    // 2. Listen for auth state changes (session expiry, logout, etc.)
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        console.warn('Session expired or user signed out');
        window.location.replace('/login.html');
      }
    });
    
    currentUser = user;
    setCurrentUser(user);
    console.log('Logged in as:', user.id);
    
    // 3. Apply stored settings (theme/accent) immediately
    SettingsManager.init();
    
    // 4. Load tasks (async now because of Supabase)
    await TaskManager.load();
    
    // 5. Render everything
    renderAll();
    renderMotivation();
    renderHeatmap();
    renderHistory();
    renderHeatmapTaskPanel();
    
    // 6. Wire up forms and settings panel
    initTaskForm();
    initSettingsPanel();
    initHistoryFilters();
    
    // 7. Set today's date display
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
      const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
      dateEl.textContent = new Date().toLocaleDateString(undefined, opts);
    }
    
    // 8. Set up logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.replace("/login.html");
    });
    
    // 9. Restore pending reminders from stored tasks
    TaskManager.getTodayTasks().forEach(t => {
      if (t.reminderEnabled && t.reminderTime) {
        scheduleReminder(t.title, t.reminderTime);
      }
    });
    
    // 10. Subscribe to task changes and re-render
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
    
    // 11. Schedule midnight refresh for recurring tasks
    scheduleMidnightRefresh();
    
  } catch (error) {
    console.error('App initialization failed:', error);
    document.body.innerHTML = '<div style="padding:40px;text-align:center;"><h1>Error</h1><p>Failed to initialize app. Please refresh the page.</p></div>';
  }
})();

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
