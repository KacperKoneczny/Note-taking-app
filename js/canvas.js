/*
 * canvas.js
 * Panning and zooming the infinite canvas.
 *
 * How it works: #world holds every note. Instead of scrolling, we move and
 * scale #world with a CSS transform. The `view` object stores that transform:
 *   view.x, view.y   how far #world is shifted, in screen pixels
 *   view.zoom        1 = 100%, 2 = 200%, 0.5 = 50%
 *
 * Controls:
 *   Mouse wheel           pan up and down (hold Shift to pan sideways)
 *   Cmd/Ctrl + wheel      zoom in and out around the mouse pointer
 *   Drag empty space      pan
 *   Space + drag          pan from anywhere, even over a text box
 *   Middle-button drag    pan from anywhere
 *   Click empty space     calls onEmptyClick, which creates a text box
 */

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;          // how much the + and − buttons zoom by
const WHEEL_ZOOM_SPEED = 0.01;  // higher = faster Cmd+wheel zooming
const CLICK_TOLERANCE = 4;      // pixels the mouse can move before a click counts as a drag

export function setupCanvas({ viewport, world, view, isTyping, onViewChange, onEmptyClick }) {
  let spaceHeld = false;
  let pan = null; // details of the drag in progress, or null when not dragging

  render();

  // ---------- Positions and transform ----------

  /** Turns a mouse position on the screen into a position on the canvas. */
  function screenToWorld(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom,
    };
  }

  /** Applies `view` to #world. */
  function render() {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  }

  /** Call after changing `view`: redraws and tells the app so it can save. */
  function update() {
    render();
    onViewChange(view);
  }

  // ---------- Zooming ----------

  /** Zooms to newZoom while keeping the point under (clientX, clientY) still. */
  function zoomAt(clientX, clientY, newZoom) {
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    newZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const ratio = newZoom / view.zoom;
    view.x = px - (px - view.x) * ratio;
    view.y = py - (py - view.y) * ratio;
    view.zoom = newZoom;
    update();
  }

  /** Zooms around the middle of the screen (used by the toolbar buttons). */
  function zoomAroundCenter(newZoom) {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, newZoom);
  }

  // ---------- Mouse wheel ----------

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault(); // stop the browser from scrolling or zooming the whole page

    let { deltaX, deltaY } = event;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      // Some browsers report wheel movement in lines instead of pixels
      deltaX *= 16;
      deltaY *= 16;
    }

    if (event.ctrlKey || event.metaKey) {
      const amount = clamp(deltaY, -25, 25);
      zoomAt(event.clientX, event.clientY, view.zoom * Math.exp(-amount * WHEEL_ZOOM_SPEED));
      return;
    }

    if (event.shiftKey && deltaX === 0) {
      deltaX = deltaY;
      deltaY = 0;
    }
    view.x -= deltaX;
    view.y -= deltaY;
    update();
  }, { passive: false });

  // ---------- Dragging to pan ----------

  // These listeners use the capture phase, so they run before the text boxes
  // see the event. That lets Space+drag and middle-drag pan even over a box.
  viewport.addEventListener('pointerdown', (event) => {
    if (wantsPanAnywhere(event)) {
      event.preventDefault();
      event.stopPropagation();
      startPan(event, false);
      return;
    }
    const onEmptySpace = !event.target.closest('.note');
    if (event.button === 0 && onEmptySpace) {
      startPan(event, true);
    }
  }, { capture: true });

  // Stops the browser from focusing a text box or starting autoscroll
  // when you Space+drag or middle-drag.
  viewport.addEventListener('mousedown', (event) => {
    if (wantsPanAnywhere(event)) event.preventDefault();
  }, { capture: true });

  viewport.addEventListener('pointermove', (event) => {
    if (!pan || event.pointerId !== pan.pointerId) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) < CLICK_TOLERANCE) return;

    pan.moved = true;
    viewport.classList.add('panning');
    view.x = pan.viewX + dx;
    view.y = pan.viewY + dy;
    update();
  });

  viewport.addEventListener('pointerup', (event) => {
    if (!pan || event.pointerId !== pan.pointerId) return;
    const wasClick = pan.couldBeClick && !pan.moved;
    endPan();
    if (wasClick) {
      const point = screenToWorld(event.clientX, event.clientY);
      onEmptyClick(point.x, point.y);
    }
  });

  viewport.addEventListener('pointercancel', endPan);

  function wantsPanAnywhere(event) {
    return event.button === 1 || (event.button === 0 && spaceHeld);
  }

  /** couldBeClick: if the mouse is released without moving, treat it as a click. */
  function startPan(event, couldBeClick) {
    pan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewX: view.x,
      viewY: view.y,
      couldBeClick,
      moved: false,
    };
    viewport.setPointerCapture(event.pointerId);
  }

  function endPan() {
    pan = null;
    viewport.classList.remove('panning');
  }

  // ---------- Space key ----------

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || isTyping()) return;
    event.preventDefault(); // stops a focused button from being "pressed" by Space
    if (!spaceHeld) {
      spaceHeld = true;
      viewport.classList.add('space-held');
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') releaseSpace();
  });

  // If you switch apps while holding Space, we never see the keyup
  window.addEventListener('blur', releaseSpace);

  function releaseSpace() {
    spaceHeld = false;
    viewport.classList.remove('space-held');
  }

  // ---------- What other files can use ----------

  return {
    screenToWorld,
    getZoom: () => view.zoom,
    zoomIn: () => zoomAroundCenter(view.zoom * ZOOM_STEP),
    zoomOut: () => zoomAroundCenter(view.zoom / ZOOM_STEP),
    resetZoom: () => zoomAroundCenter(1),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
