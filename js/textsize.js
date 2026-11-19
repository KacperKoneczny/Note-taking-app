/*
 * textsize.js
 * The text size box in the toolbar:  − [ 16 ] +
 *
 *   Select some text, then type any size and press Enter (Escape cancels),
 *   or click − / + (Cmd+Shift+, and Cmd+Shift+.) to go down or up by 1.
 *   The box shows the size of the text where the cursor is.
 *
 * Sizes are in pixels and saved as <span style="font-size: 24px">.
 * Normal text is 16px (--note-font-size in styles.css).
 */

import { getActiveContent, elementAtCursor, notifyChanged } from './editing.js';

export const MIN_TEXT_SIZE = 4;
export const MAX_TEXT_SIZE = 400;

// The browser's size command only offers sizes 1 to 7. Like colors.js, we
// apply size 7 as a marker and then swap it for the size you asked for. That
// way the browser still handles selections across lines, bold text, etc.
const MARKER_SIZE = 'xxx-large';

let input = null;  // the <input> in the toolbar
let saved = null;  // { content, range }: the selection to resize while you type in the box

/** Sets the selected text to `size` pixels. Does nothing if no text is selected. */
export function applyTextSize(size) {
  const content = getActiveContent();
  if (!content || window.getSelection().isCollapsed || !Number.isFinite(size)) return;
  const px = `${clamp(Math.round(size), MIN_TEXT_SIZE, MAX_TEXT_SIZE)}px`;

  document.execCommand('styleWithCSS', false, true); // use style="..." rather than <font> tags
  document.execCommand('fontSize', false, '7');
  document.execCommand('styleWithCSS', false, false);

  for (const el of content.querySelectorAll('[style]')) {
    if (el.style.fontSize === MARKER_SIZE) el.style.fontSize = px;
  }
  notifyChanged(content);
}

/** Makes the selected text `delta` pixels bigger (or smaller, if delta is negative). */
export function changeTextSize(delta) {
  const current = sizeAtCursor();
  if (current) applyTextSize(current + delta);
}

/** The size of the text where the cursor is, in whole pixels, or null if you aren't typing. */
export function sizeAtCursor() {
  const el = getActiveContent() && elementAtCursor();
  return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : null;
}

/** True while you're typing a number into the size box. */
export function isEditingTextSize() {
  return !!input && document.activeElement === input;
}

/** Shows the size at the cursor in the box. Leaves it alone while you're typing in it. */
export function refreshTextSize() {
  if (input && !isEditingTextSize()) input.value = sizeAtCursor() ?? '';
}

/** onDone is called after a size is applied or cancelled, so the toolbar can update. */
export function setupTextSize({ sizeInput, onDone }) {
  input = sizeInput;
  input.min = MIN_TEXT_SIZE;
  input.max = MAX_TEXT_SIZE;
  input.step = 1;

  // Clicking the box moves the text cursor into it, which loses your
  // selection in the text box. So remember the selection first.
  input.addEventListener('mousedown', () => {
    if (isEditingTextSize()) return; // already typing in the box
    const content = getActiveContent();
    const selection = window.getSelection();
    saved = content && selection.rangeCount
      ? { content, range: selection.getRangeAt(0).cloneRange() }
      : null;
  });

  input.addEventListener('focus', () => input.select());

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const size = parseFloat(input.value);
      restoreSelection();
      applyTextSize(size);
      onDone();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      restoreSelection();
      onDone();
    }
  });

  // Clicking somewhere else cancels
  input.addEventListener('blur', () => {
    saved = null;
    refreshTextSize();
  });
}

/** Puts the text cursor and selection back where they were before you clicked the size box. */
function restoreSelection() {
  const { content, range } = saved ?? {};
  saved = null;
  if (!content?.isConnected) return;
  content.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
