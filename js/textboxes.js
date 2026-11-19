/*
 * textboxes.js
 * The text boxes you write in.
 *
 * Each box in page.textBoxes looks like:
 *   { id, x, y, width, html }
 * x, y and width are canvas positions (not screen pixels), so they stay
 * correct at any zoom level. html is what you typed.
 *
 * On screen, each box is built like this:
 *   <div class="note">
 *     <div class="note-handle">    drag to move, click to select
 *     <div class="note-content">   the text you type (contenteditable)
 *     <div class="note-resize">    drag to change the width
 *   </div>
 *
 * Behavior:
 *   - Clicking empty space creates a box (canvas.js detects the click).
 *   - A box with no text deletes itself when you click away.
 *   - Escape stops typing.
 *   - Click a box's handle to select it, then press Delete or Backspace to remove it.
 */

import { makeId } from './storage.js';

const DEFAULT_WIDTH = 260; // width of a new box
const MIN_WIDTH = 60;      // narrowest a box can be resized to
const DRAG_TOLERANCE = 3;  // pixels the mouse can move before a click counts as a drag

// A new box is shifted by this much so the text cursor lands where you clicked
const CLICK_OFFSET_X = 4;
const CLICK_OFFSET_Y = 14;

export function setupTextBoxes({ world, page, getZoom, isTyping, onChange }) {
  const elements = new Map(); // box id -> its .note element
  let selectedId = null;

  // Draw the saved boxes, then clean up any empty ones left over from last time
  for (const box of page.textBoxes) addToScreen(box);
  for (const box of [...page.textBoxes]) {
    if (isEmpty(elements.get(box.id))) removeBox(box.id);
  }

  // ---------- Creating and removing ----------

  /** Creates a new, empty box at a canvas position and puts the text cursor in it. */
  function createAt(x, y) {
    const box = {
      id: makeId(),
      x: Math.round(x - CLICK_OFFSET_X),
      y: Math.round(y - CLICK_OFFSET_Y),
      width: DEFAULT_WIDTH,
      html: '',
    };
    page.textBoxes.push(box);
    const note = addToScreen(box);
    note.querySelector('.note-content').focus();
    // No save yet. The box gets saved once you type something.
  }

  /** Builds the HTML for a box, adds it to the canvas, and hooks up its events. */
  function addToScreen(box) {
    const note = document.createElement('div');
    note.className = 'note';
    note.dataset.id = box.id;

    const handle = document.createElement('div');
    handle.className = 'note-handle';
    handle.title = 'Drag to move. Click to select, then press Delete to remove.';

    const content = document.createElement('div');
    content.className = 'note-content';
    content.contentEditable = 'true';
    content.innerHTML = box.html;

    const resizer = document.createElement('div');
    resizer.className = 'note-resize';
    resizer.title = 'Drag to change the width';

    note.append(handle, content, resizer);
    world.append(note);
    elements.set(box.id, note);
    placeOnScreen(note, box);

    // Typing
    content.addEventListener('input', () => {
      box.html = content.innerHTML;
      onChange();
    });

    content.addEventListener('focus', () => select(null));

    content.addEventListener('blur', () => {
      // If you switched to another app, keep the box for when you come back
      if (!document.hasFocus()) return;
      if (isEmpty(note)) {
        removeBox(box.id);
        onChange();
      }
    });

    content.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') content.blur();
    });

    // Paste as plain text, so text copied from websites doesn't bring its own fonts and colors
    content.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    // Moving and resizing. Blocking mousedown keeps the text cursor where it is.
    handle.addEventListener('mousedown', (event) => event.preventDefault());
    resizer.addEventListener('mousedown', (event) => event.preventDefault());
    handle.addEventListener('pointerdown', (event) => startDrag(event, box, note, 'move'));
    resizer.addEventListener('pointerdown', (event) => startDrag(event, box, note, 'resize'));

    return note;
  }

  function removeBox(id) {
    elements.get(id)?.remove();
    elements.delete(id);
    page.textBoxes = page.textBoxes.filter((box) => box.id !== id);
    if (selectedId === id) selectedId = null;
  }

  // ---------- Moving and resizing ----------

  /** mode is 'move' (dragging the handle) or 'resize' (dragging the right edge). */
  function startDrag(event, box, note, mode) {
    if (event.button !== 0) return;
    event.stopPropagation();

    const grip = event.currentTarget;
    grip.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: box.x, y: box.y, width: box.width };
    let moved = false;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_TOLERANCE) return;
      moved = true;

      // Mouse movement is in screen pixels, so divide by zoom to get canvas pixels
      const zoom = getZoom();
      if (mode === 'move') {
        box.x = Math.round(start.x + dx / zoom);
        box.y = Math.round(start.y + dy / zoom);
      } else {
        box.width = Math.max(MIN_WIDTH, Math.round(start.width + dx / zoom));
      }
      placeOnScreen(note, box);
    }

    function onEnd() {
      grip.removeEventListener('pointermove', onMove);
      grip.removeEventListener('pointerup', onEnd);
      grip.removeEventListener('pointercancel', onEnd);
      if (moved) onChange();
      else if (mode === 'move') select(box.id); // a click on the handle selects the box
    }

    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', onEnd);
    grip.addEventListener('pointercancel', onEnd);
  }

  // ---------- Selecting ----------

  /** Highlights one box, or clears the highlight when id is null. */
  function select(id) {
    elements.get(selectedId)?.classList.remove('selected');
    selectedId = null;
    if (!id) return;

    // Stop typing first. This deletes the box you were typing in if it's empty.
    if (document.activeElement?.isContentEditable) document.activeElement.blur();

    const note = elements.get(id);
    if (!note) return;
    note.classList.add('selected');
    selectedId = id;
  }

  // Delete or Backspace removes the selected box. Escape deselects it.
  document.addEventListener('keydown', (event) => {
    if (!selectedId || isTyping()) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeBox(selectedId);
      onChange();
    } else if (event.key === 'Escape') {
      select(null);
    }
  });

  // Clicking anywhere outside a box deselects it
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.note')) select(null);
  });

  // ---------- What other files can use ----------

  return { createAt };
}

function placeOnScreen(note, box) {
  note.style.left = `${box.x}px`;
  note.style.top = `${box.y}px`;
  note.style.width = `${box.width}px`;
}

function isEmpty(note) {
  return note.querySelector('.note-content').textContent.trim() === '';
}
