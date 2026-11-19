/*
 * colors.js
 * Text colors and highlights.
 *
 * Colors are saved by name instead of as an exact shade. Red text is saved as
 *   <span style="color: var(--text-red)">
 * and styles.css gives --text-red one shade in dark mode and another in
 * light mode, so notes stay readable in both.
 *
 * To add a color: add its name to COLOR_NAMES, then add --text-<name> and
 * --highlight-<name> to BOTH themes at the top of styles.css.
 */

import { getActiveContent, notifyChanged } from './editing.js';

export const COLOR_NAMES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

// The browser's color command only accepts real colors, not names. So we
// apply an unusual "marker" color first, then swap it for the named color.
// Letting the browser do the first step means it correctly handles
// selections that cross bold text, several lines, list items and so on.
const NAMES_WITH_NONE = ['none', ...COLOR_NAMES];
const TEXT_MARKERS = new Map(NAMES_WITH_NONE.map((name, i) => [`rgb(1, 2, ${i + 1})`, name]));
const HIGHLIGHT_MARKERS = new Map(NAMES_WITH_NONE.map((name, i) => [`rgb(1, 3, ${i + 1})`, name]));

/**
 * Colors the selected text.
 *   kind: 'text' or 'highlight'
 *   name: one of COLOR_NAMES, or 'none' to remove the color
 * Does nothing if no text is selected.
 */
export function applyColor(kind, name) {
  const content = getActiveContent();
  if (!content || window.getSelection().isCollapsed) return;

  const markers = kind === 'text' ? TEXT_MARKERS : HIGHLIGHT_MARKERS;
  const marker = [...markers].find(([, markerName]) => markerName === name)?.[0];
  if (!marker) return;

  document.execCommand('styleWithCSS', false, true); // use style="..." rather than <font> tags
  document.execCommand(kind === 'text' ? 'foreColor' : 'hiliteColor', false, marker);
  document.execCommand('styleWithCSS', false, false);

  tidyColors(content);
  notifyChanged(content);
}

/**
 * Swaps marker colors for named ones, and removes any other fixed colors the
 * browser adds by itself (for example when two lines get joined). A fixed
 * color wouldn't change when you switch modes, and could become unreadable.
 */
export function tidyColors(content) {
  for (const el of content.querySelectorAll('[style]')) {
    tidyProperty(el, 'color', TEXT_MARKERS, 'text');
    tidyProperty(el, 'backgroundColor', HIGHLIGHT_MARKERS, 'highlight');
    if (!el.getAttribute('style')) el.removeAttribute('style');
  }
}

function tidyProperty(el, property, markers, prefix) {
  const value = el.style[property];
  if (!value || value.startsWith(`var(--${prefix}-`)) return; // nothing set, or already a named color
  const name = markers.get(value);
  el.style[property] = name && name !== 'none' ? `var(--${prefix}-${name})` : '';
}

/** Tidies colors after every change, before the text box saves its HTML. */
export function setupColors({ world }) {
  world.addEventListener('input', (event) => {
    if (event.target.classList?.contains('note-content')) tidyColors(event.target);
  }, true); // capture phase: runs before textboxes.js reads the HTML
}
