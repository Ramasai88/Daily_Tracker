/**
 * settingsManager.js
 * Manages theme, accent color, card layout, goal + streak settings.
 *
 * All settings stored in focusflow_settings via StorageManager.
 * Applying theme/accent writes CSS variables to :root immediately.
 */

import { StorageManager } from './storageManager.js';

const listeners = new Set();
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify(s) { listeners.forEach(fn => fn(s)); }

function get() { return StorageManager.getSettings(); }

function update(patch) {
  const current = get();
  const merged = { ...current, ...patch };
  StorageManager.saveSettings(merged);
  apply(merged);
  notify(merged);
  return merged;
}

/**
 * apply: writes CSS variables and theme class based on settings.
 * Called on page load and whenever settings change.
 */
function apply(settings) {
  const root = document.documentElement;

  // Accent color
  root.style.setProperty('--accent', settings.accentColor || '#7c6bff');

  // Derive lighter / darker shades from accent
  root.style.setProperty('--accent-glow', hexToRgba(settings.accentColor || '#7c6bff', 0.25));

  // Theme class
  document.body.classList.toggle('light-theme', settings.theme === 'light');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function init() { apply(get()); }

export const SettingsManager = { get, update, apply, init, subscribe };
