/*
 * editing.js
 * Small helpers shared by the toolbar, colors, lists and tables.
 */

/** The text box content you're typing in right now, or null if you aren't typing. */
export function getActiveContent() {
  const el = document.activeElement;
  return el?.classList?.contains('note-content') ? el : null;
}

/**
 * Runs one of the browser's built-in editing commands (bold, lists, ...)
 * on the text box you're typing in.
 */
export function runCommand(name, value = null) {
  if (!getActiveContent()) return false;
  return document.execCommand(name, false, value);
}

/** The element where the text cursor is (or where the selection starts). */
export function elementAtCursor() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);

  // The browser sometimes reports the cursor as "inside the box, before child N"
  // instead of inside that child, so step into the child at the cursor.
  let node = range.startContainer;
  if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length) {
    node = node.childNodes[Math.min(range.startOffset, node.childNodes.length - 1)];
  }
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

/**
 * Finds the closest element matching `selector` around the text cursor,
 * as long as it's inside the text box you're typing in.
 */
export function closestAtCursor(selector) {
  const content = getActiveContent();
  const match = content && elementAtCursor()?.closest(selector);
  return match && content.contains(match) ? match : null;
}

/**
 * Tells a text box its content changed so it gets saved. The browser's own
 * commands do this automatically; call it after changing the HTML yourself.
 */
export function notifyChanged(content) {
  content?.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Puts the text cursor at the start (or end) of an element. */
export function placeCursor(el, atEnd = false) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(!atEnd);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
