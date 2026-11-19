/*
 * toolbar.js
 * The formatting buttons in the top bar, their pop-up menus, and keyboard shortcuts.
 *
 * Buttons live in index.html with a data-action="..." attribute.
 * ACTIONS below says what each action does, and SHORTCUTS lists the keys.
 */

import { runCommand, getActiveContent, closestAtCursor } from './editing.js';
import { COLOR_NAMES, applyColor } from './colors.js';
import { toggleBulletList, toggleNumberedList, toggleChecklist } from './lists.js';
import { setupTextSize, changeTextSize, refreshTextSize, isEditingTextSize } from './textsize.js';
import {
  insertTable, addRow, addColumn, deleteRow, deleteColumn, deleteTable,
  MAX_TABLE_ROWS, MAX_TABLE_COLUMNS,
} from './tables.js';

const ACTIONS = {
  bold: () => runCommand('bold'),
  italic: () => runCommand('italic'),
  underline: () => runCommand('underline'),
  strikethrough: () => runCommand('strikeThrough'),
  heading1: () => toggleHeading('h1'),
  heading2: () => toggleHeading('h2'),
  normal: () => runCommand('formatBlock', 'div'),
  textSmaller: () => changeTextSize(-1),
  textBigger: () => changeTextSize(+1),
  bulletList: toggleBulletList,
  numberedList: toggleNumberedList,
  checklist: toggleChecklist,
  addRow,
  addColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
};

// Shortcuts use Cmd on a Mac (Ctrl elsewhere). Cmd+B, Cmd+I and Cmd+U are
// built into the browser, so they aren't listed. `code` is the physical key,
// which still works when Option changes the typed character on a Mac.
const SHORTCUTS = [
  { code: 'KeyX', shift: true, action: 'strikethrough' },
  { code: 'Digit1', alt: true, action: 'heading1' },
  { code: 'Digit2', alt: true, action: 'heading2' },
  { code: 'Digit0', alt: true, action: 'normal' },
  { code: 'Comma', shift: true, action: 'textSmaller' },
  { code: 'Period', shift: true, action: 'textBigger' },
  { code: 'Digit8', shift: true, action: 'bulletList' },
  { code: 'Digit7', shift: true, action: 'numberedList' },
  { code: 'Digit9', shift: true, action: 'checklist' },
];

/** Clicking H1 on a line that's already H1 turns it back into normal text. */
function toggleHeading(tag) {
  const current = String(document.queryCommandValue('formatBlock')).toLowerCase();
  runCommand('formatBlock', current === tag ? 'div' : tag);
}

/** Whether a button should look "on" for the text where the cursor is. */
function isActive(action) {
  const block = String(document.queryCommandValue('formatBlock')).toLowerCase();
  const list = closestAtCursor('ul, ol');
  switch (action) {
    case 'bold': return document.queryCommandState('bold');
    case 'italic': return document.queryCommandState('italic');
    case 'underline': return document.queryCommandState('underline');
    case 'strikethrough': return document.queryCommandState('strikeThrough');
    case 'heading1': return block === 'h1';
    case 'heading2': return block === 'h2';
    case 'bulletList': return list?.tagName === 'UL' && !list.closest('.checklist');
    case 'numberedList': return list?.tagName === 'OL';
    case 'checklist': return !!closestAtCursor('.checklist');
    default: return false;
  }
}

export function setupToolbar({ toolbar }) {
  const formatTools = toolbar.querySelector('#format-tools');
  const tableTools = toolbar.querySelector('#table-tools');
  const actionButtons = [...toolbar.querySelectorAll('[data-action]')];

  // Clicking anything in the toolbar shouldn't take the text cursor out of the
  // box you're typing in. The text size box is the exception: you need to type in it.
  toolbar.addEventListener('mousedown', (event) => {
    if (!event.target.closest('input')) event.preventDefault();
  });

  setupTextSize({ sizeInput: toolbar.querySelector('#text-size'), onDone: () => updateButtons() });

  // ---------- Buttons ----------

  for (const button of actionButtons) {
    button.addEventListener('click', () => {
      ACTIONS[button.dataset.action]?.();
      updateButtons();
    });
  }

  // ---------- Pop-up menus ----------

  const popoverButtons = [...toolbar.querySelectorAll('[data-popover]')];

  function closePopovers() {
    toolbar.querySelectorAll('.popover').forEach((popover) => { popover.hidden = true; });
  }

  for (const button of popoverButtons) {
    const popover = toolbar.querySelector(`#${button.dataset.popover}`);
    button.addEventListener('click', () => {
      const wasOpen = !popover.hidden;
      closePopovers();
      popover.hidden = wasOpen;
    });
  }

  // Close menus when clicking elsewhere or pressing Escape
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.popover-anchor')) closePopovers();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopovers();
  });

  buildColorMenu(toolbar.querySelector('#text-color-menu'), 'text', closePopovers);
  buildColorMenu(toolbar.querySelector('#highlight-menu'), 'highlight', closePopovers);
  buildTablePicker(toolbar.querySelector('#table-menu'), closePopovers);

  // ---------- Keyboard shortcuts ----------

  document.addEventListener('keydown', (event) => {
    if (!getActiveContent() || !(event.metaKey || event.ctrlKey)) return;
    const shortcut = SHORTCUTS.find((s) =>
      s.code === event.code && !!s.shift === event.shiftKey && !!s.alt === event.altKey);
    if (!shortcut) return;
    event.preventDefault();
    ACTIONS[shortcut.action]();
    updateButtons();
  });

  // ---------- Showing which formatting is on ----------

  function updateButtons() {
    // While you type a number into the size box, the text box isn't focused.
    // Leave the toolbar as it was until you're done.
    if (isEditingTextSize()) return;

    const typing = !!getActiveContent();
    formatTools.classList.toggle('disabled', !typing);
    tableTools.hidden = !closestAtCursor('td, th');
    for (const button of actionButtons) {
      button.classList.toggle('active', typing && isActive(button.dataset.action));
    }
    refreshTextSize();
    if (!typing) closePopovers();
  }

  document.addEventListener('selectionchange', updateButtons);
  document.addEventListener('keyup', updateButtons); // e.g. Cmd+B doesn't move the cursor
  updateButtons();
}

/** Fills a color menu with one round button per color, plus a "no color" button. */
function buildColorMenu(popover, kind, close) {
  const swatches = document.createElement('div');
  swatches.className = 'swatches';

  for (const name of ['none', ...COLOR_NAMES]) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    if (name === 'none') {
      swatch.classList.add('swatch-none');
      swatch.title = kind === 'text' ? 'Default color' : 'No highlight';
    } else {
      swatch.style.background = `var(--${kind}-${name})`;
      swatch.title = name[0].toUpperCase() + name.slice(1);
    }
    swatch.addEventListener('click', () => {
      applyColor(kind, name);
      close();
    });
    swatches.append(swatch);
  }

  const hint = document.createElement('div');
  hint.className = 'popover-hint';
  hint.textContent = 'Select some text first';
  popover.append(swatches, hint);
}

/** Fills the "Insert table" menu with a grid: hover to pick the size, click to insert. */
function buildTablePicker(popover, close) {
  const grid = document.createElement('div');
  grid.className = 'table-picker';
  grid.style.gridTemplateColumns = `repeat(${MAX_TABLE_COLUMNS}, 18px)`;

  const label = document.createElement('div');
  label.className = 'popover-hint';
  label.textContent = 'Pick a size';

  const cells = [];
  for (let row = 1; row <= MAX_TABLE_ROWS; row++) {
    for (let column = 1; column <= MAX_TABLE_COLUMNS; column++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'table-picker-cell';
      cell.addEventListener('mouseenter', () => {
        cells.forEach((c) => c.el.classList.toggle('lit', c.row <= row && c.column <= column));
        label.textContent = `${row} × ${column}`;
      });
      cell.addEventListener('click', () => {
        insertTable(row, column);
        close();
      });
      cells.push({ el: cell, row, column });
      grid.append(cell);
    }
  }

  popover.append(grid, label);
}
