/*
 * storage.js
 * All saving and loading goes through this file. If you ever want to store
 * notes somewhere other than localStorage, this is the only file to change.
 *
 * What's kept in localStorage:
 *   "freeform-notes:page:<id>"  one page, as JSON (see createEmptyPage below)
 *   "freeform-notes:last-page"  the id of the page that was open last
 */

const PREFIX = 'freeform-notes';
const LAST_PAGE_KEY = `${PREFIX}:last-page`;

function pageKey(id) {
  return `${PREFIX}:page:${id}`;
}

/** Makes a short random id, like "mi5x0k2a-4f8a2c". */
export function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** Returns a new, empty page. Every saved page has this shape. */
export function createEmptyPage(name = 'Untitled page') {
  return {
    id: makeId(),
    name,
    view: { x: 0, y: 0, zoom: 1 }, // where you were panned and zoomed to
    textBoxes: [],                 // { id, x, y, width, html }
    strokes: [],                   // drawings (added in Phase 4)
  };
}

/** Loads one page by id. Returns null if it doesn't exist or can't be read. */
export function loadPage(id) {
  const raw = localStorage.getItem(pageKey(id));
  if (!raw) return null;
  try {
    return withDefaults(JSON.parse(raw));
  } catch (err) {
    console.error(`Page ${id} could not be read`, err);
    return null;
  }
}

/**
 * Saves a page. Throws if the browser refuses (for example when storage is
 * full), so the caller can show an error.
 */
export function savePage(page) {
  localStorage.setItem(pageKey(page.id), JSON.stringify(page));
  localStorage.setItem(LAST_PAGE_KEY, page.id);
}

/** Returns the page you had open last time, or a new empty page on first run. */
export function loadStartupPage() {
  const lastId = localStorage.getItem(LAST_PAGE_KEY);
  return (lastId && loadPage(lastId)) || createEmptyPage();
}

/** Fills in anything missing from a saved page so the rest of the app can rely on it. */
function withDefaults(page) {
  const empty = createEmptyPage();
  return {
    ...empty,
    ...page,
    view: { ...empty.view, ...page.view },
    textBoxes: Array.isArray(page.textBoxes) ? page.textBoxes : [],
    strokes: Array.isArray(page.strokes) ? page.strokes : [],
  };
}
