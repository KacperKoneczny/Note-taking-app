/*
 * app.js
 * Starts the app and connects the pieces together:
 *   storage.js    loads and saves pages
 *   pages.js      the pages sidebar and the page name in the toolbar
 *   canvas.js     panning and zooming
 *   textboxes.js  the boxes you type in
 *   toolbar.js    formatting buttons and shortcuts, using:
 *     editing.js    shared helpers
 *     colors.js     text colors and highlights
 *     lists.js      bullet lists, numbered lists, checklists
 *     tables.js     tables
 *     textsize.js   the text size box
 *   theme.js      the dark/light mode switch
 */

import { loadStartupPage, savePage, rememberOpenPage } from './storage.js';
import { setupPages } from './pages.js';
import { setupCanvas } from './canvas.js';
import { setupTextBoxes } from './textboxes.js';
import { setupToolbar } from './toolbar.js';
import { setupColors } from './colors.js';
import { setupLists } from './lists.js';
import { setupTables } from './tables.js';
import { setupTheme } from './theme.js';

const SAVE_DELAY_MS = 500; // wait this long after the last change before saving
const SAVE_ERROR = 'Not saved: browser storage is full or blocked';

const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const toolbar = document.getElementById('toolbar');
const zoomLabel = document.getElementById('zoom-reset');
const saveStatus = document.getElementById('save-status');

let page = loadStartupPage(); // the page on screen. Changes when you open another page.
rememberOpenPage(page.id);

// ---------- Saving ----------

let saveTimer = null;

/** Saves shortly after the last change, so typing doesn't save on every key. */
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
  showStatus('Saving…');
}

/** Saves the open page right away. Returns false if the browser refused. */
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    savePage(page);
    showStatus('Saved');
    return true;
  } catch (err) {
    console.error('Save failed', err);
    showStatus(SAVE_ERROR, true);
    return false;
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

// These listen for clicks, keys and typing inside every text box on the canvas
setupColors({ world });
setupLists({ world });
setupTables({ world });

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

/**
 * Puts a different page on the canvas, with its own pan and zoom.
 * pages.js saves the old page first (or is deleting it), so a save that's
 * still waiting belongs to the old page and is dropped.
 */
function showPage(newPage) {
  clearTimeout(saveTimer);
  saveTimer = null;
  showStatus('');
  page = newPage;
  rememberOpenPage(page.id);
  textBoxes.showPage(page);
  canvas.setView(page.view);
  updateZoomLabel();
}

setupPages({
  toggleButton: document.getElementById('sidebar-toggle'),
  pageList: document.getElementById('page-list'),
  newPageButton: document.getElementById('new-page'),
  nameLabel: document.getElementById('page-name'),
  getOpenPage: () => page,
  saveOpenPage: saveNow,
  showPage,
  onSaveError: () => showStatus(SAVE_ERROR, true),
});

// ---------- Toolbar ----------

setupToolbar({ toolbar });
setupTheme({ button: document.getElementById('theme-toggle') });

document.getElementById('zoom-in').addEventListener('click', () => canvas.zoomIn());
document.getElementById('zoom-out').addEventListener('click', () => canvas.zoomOut());
zoomLabel.addEventListener('click', () => canvas.resetZoom());
