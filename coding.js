/**
 * coding.js — Page 2 entry point.
 * Bootstraps the Coding Practice Tracker page.
 */

import { CodingTracker } from './codingTracker.js';
import { SettingsManager } from './settingsManager.js';

document.addEventListener('DOMContentLoaded', () => {
  SettingsManager.init();
  CodingTracker.load();
  renderPlatforms();
  renderCodingStreak();
  initNotesSection();
  initAddPlatformBtn();
});

// ─── RENDER PLATFORMS ─────────────────────────────────────────────────────────
function renderPlatforms() {
  const container = document.getElementById('platforms-container');
  if (!container) return;
  const platforms = CodingTracker.getPlatforms();

  container.innerHTML = platforms.map(p => {
    const pct = p.dailyTarget > 0 ? Math.min(100, Math.round((p.solvedToday / p.dailyTarget) * 100)) : 0;
    return `
    <div class="platform-card glass-card" data-id="${p.id}">
      <div class="platform-header">
        <span class="platform-name" contenteditable="true" data-id="${p.id}">${p.name}</span>
        <button class="icon-btn danger" data-action="delete-platform" data-id="${p.id}">✕</button>
      </div>

      <div class="stat-row">
        <div class="stat-block">
          <div class="stat-value" id="solved-today-${p.id}">${p.solvedToday}</div>
          <div class="stat-label">Today</div>
        </div>
        <div class="stat-block">
          <div class="stat-value">${p.totalSolved}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-block">
          <div class="stat-value">${p.dailyTarget}</div>
          <div class="stat-label">Target</div>
        </div>
      </div>

      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="progress-pct">${pct}%</span>
      </div>

      <div class="counter-controls">
        <button class="counter-btn decrement" data-action="dec" data-id="${p.id}">−</button>
        <span class="counter-val">${p.solvedToday}</span>
        <button class="counter-btn increment" data-action="inc" data-id="${p.id}">+</button>
      </div>

      <div class="platform-footer">
        <button class="pill-btn" data-action="reset" data-id="${p.id}">Reset Daily</button>
        <label class="target-label">Target:
          <input class="target-input" type="number" min="1" value="${p.dailyTarget}" data-id="${p.id}">
        </label>
      </div>
    </div>`;
  }).join('');

  // Event delegation
  container.onclick = handlePlatformClick;
  container.oninput = handlePlatformInput;

  // Contenteditable rename
  container.querySelectorAll('[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => {
      CodingTracker.renamePlatform(el.dataset.id, el.textContent.trim());
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });
}

function handlePlatformClick(e) {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action || !id) return;
  if (action === 'inc') { CodingTracker.increment(id); renderPlatforms(); renderCodingStreak(); }
  if (action === 'dec') { CodingTracker.decrement(id); renderPlatforms(); renderCodingStreak(); }
  if (action === 'reset') { CodingTracker.resetDaily(id); renderPlatforms(); }
  if (action === 'delete-platform') { if (confirm('Remove platform?')) { CodingTracker.deletePlatform(id); renderPlatforms(); } }
}

function handlePlatformInput(e) {
  if (e.target.classList.contains('target-input')) {
    const id = e.target.dataset.id;
    const val = parseInt(e.target.value) || 1;
    CodingTracker.setTarget(id, val);
    renderPlatforms();
  }
}

// ─── CODING STREAK ────────────────────────────────────────────────────────────
function renderCodingStreak() {
  const streak = CodingTracker.getCodingStreak();
  const el = document.getElementById('coding-streak-count');
  const best = document.getElementById('coding-streak-best');
  if (el) el.textContent = streak.currentStreak;
  if (best) best.textContent = streak.bestStreak;
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function initNotesSection() {
  const notesEl = document.getElementById('coding-notes');
  if (!notesEl) return;
  notesEl.value = CodingTracker.getNotes();
  notesEl.addEventListener('input', () => CodingTracker.saveNotes(notesEl.value));
}

// ─── ADD PLATFORM ─────────────────────────────────────────────────────────────
function initAddPlatformBtn() {
  document.getElementById('add-platform-btn')?.addEventListener('click', () => {
    const name = prompt('Platform name:');
    if (name?.trim()) { CodingTracker.addPlatform(name.trim()); renderPlatforms(); }
  });
}
