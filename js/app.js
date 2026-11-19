/*
 * app.js
 * Starts the app and connects the pieces together:
 *   storage.js    loads and saves the page
 *   canvas.js     panning and zooming
 *   textboxes.js  the boxes you type in
 */

import { loadStartupPage, savePage } from './storage.js';
import { setupCanvas } from './canvas.js';
import { setupTextBoxes } from './textboxes.js';

const SAVE_DELAY_MS = 500; // wait this long after the last change before saving

const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const toolbar = document.getElementById('toolbar');
const zoomLabel = document.getElementById('zoom-reset');
const saveStatus = document.getElementById('save-status');

const page = loadStartupPage();

// ---------- Saving ----------

let saveTimer = null;

/** Saves shortly after the last change, so typing doesn't save on every key. */
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
  showStatus('Saving…');
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    savePage(page);
    showStatus('Saved');
  } catch (err) {
    console.error('Save failed', err);
    showStatus('Not saved: browser storage is full or blocked', true);
  }
}

function showStatus(text, isError = false) {
  saveStatus.textContent = text;
  saveStatus.classList.toggle('error', isError);
}

// Save immediately if the tab is closed, hidden, or reloaded.
// Live Preview reloads the page whenever you edit the code.
window.addEventListener('pagehide', () => {
  if (saveTimer) saveNow();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveTimer) saveNow();
});

// ---------- Helpers ----------

/** True while you're typing in a text box, so shortcuts like Space don't steal your keys. */
function isTyping() {
  const el = document.activeElement;
  return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

function updateZoomLabel() {
  zoomLabel.textContent = `${Math.round(page.view.zoom * 100)}%`;
}

// ---------- Connect the pieces ----------

const textBoxes = setupTextBoxes({
  world,
  page,
  getZoom: () => page.view.zoom,
  isTyping,
  onChange: scheduleSave,
});

const canvas = setupCanvas({
  viewport,
  world,
  view: page.view, // canvas.js updates this object in place when you pan or zoom
  isTyping,
  onViewChange: () => {
    updateZoomLabel();
    scheduleSave();
  },
  onEmptyClick: (x, y) => textBoxes.createAt(x, y),
});

updateZoomLabel();

// ---------- Toolbar ----------

document.getElementById('zoom-in').addEventListener('click', () => canvas.zoomIn());
document.getElementById('zoom-out').addEventListener('click', () => canvas.zoomOut());
zoomLabel.addEventListener('click', () => canvas.resetZoom());

// Clicking a toolbar button shouldn't move the text cursor out of the box you're typing in
toolbar.addEventListener('mousedown', (event) => {
  if (event.target.closest('button')) event.preventDefault();
});
