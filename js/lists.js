/*
 * lists.js
 * Bullet lists, numbered lists and checklists.
 *
 * A checklist is a bullet list with class="checklist". css/formatting.css draws a
 * checkbox in front of each item, and a ticked item has data-checked="true".
 *
 *   Click a checkbox     tick or untick it
 *   Tab / Shift+Tab      indent or outdent a list item
 */

import { runCommand, closestAtCursor, getActiveContent, notifyChanged } from './editing.js';

// Clicking within this many "em" of an item's left edge counts as clicking its checkbox
const CHECKBOX_CLICK_WIDTH = 1.6;

/** Bullet list on/off. Also turns a checklist back into a plain bullet list. */
export function toggleBulletList() {
  const checklist = closestAtCursor('.checklist');
  if (checklist) {
    checklist.classList.remove('checklist');
    if (!checklist.classList.length) checklist.removeAttribute('class');
    checklist.querySelectorAll('[data-checked]').forEach((li) => li.removeAttribute('data-checked'));
    notifyChanged(getActiveContent());
    return;
  }
  runCommand('insertUnorderedList');
}

/** Numbered list on/off. */
export function toggleNumberedList() {
  runCommand('insertOrderedList');
}

/** Checklist on/off. Turns plain text, bullet lists or numbered lists into a checklist. */
export function toggleChecklist() {
  const content = getActiveContent();
  if (!content) return;

  if (closestAtCursor('.checklist')) {
    runCommand('insertUnorderedList'); // already a checklist: turn the list off
    return;
  }
  if (!closestAtCursor('ul')) runCommand('insertUnorderedList'); // make it a bullet list first
  const list = closestAtCursor('ul');
  if (list) {
    list.classList.add('checklist');
    notifyChanged(content);
  }
}

export function setupLists({ world }) {
  // Clicking a checkbox ticks or unticks it
  world.addEventListener('mousedown', (event) => {
    const item = event.target.closest?.('.checklist li');
    const content = item?.closest('.note-content');
    if (!content || !isOnCheckbox(event, item)) return;

    event.preventDefault(); // don't move the text cursor
    if (item.dataset.checked === 'true') item.removeAttribute('data-checked');
    else item.dataset.checked = 'true';
    notifyChanged(content);
  });

  // Pressing Enter after a ticked item copies the tick to the new, empty item. Remove it.
  // Capture phase: runs before textboxes.js saves the HTML.
  world.addEventListener('input', (event) => {
    if (event.inputType !== 'insertParagraph') return;
    const item = closestAtCursor('.checklist li');
    if (item && item.textContent === '') item.removeAttribute('data-checked');
  }, true);

  // Tab / Shift+Tab indents or outdents list items (tables.js handles Tab inside tables)
  world.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || closestAtCursor('td, th') || !closestAtCursor('li')) return;
    event.preventDefault();
    runCommand(event.shiftKey ? 'outdent' : 'indent');
  });
}

/** True if the mouse is over the checkbox at the start of a checklist item. */
function isOnCheckbox(event, item) {
  const rect = item.getBoundingClientRect();
  const scale = rect.width / item.offsetWidth || 1; // the canvas zoom level
  const fontSize = parseFloat(getComputedStyle(item).fontSize);
  return event.clientX - rect.left < CHECKBOX_CLICK_WIDTH * fontSize * scale;
}
