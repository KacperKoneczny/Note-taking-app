/*
 * storage.js
 * All saving and loading goes through this file. If you ever want to store
 * notes somewhere other than localStorage, this is the only file to change.
 *
 * What's kept in localStorage:
 *   "freeform-notes:pages"      the sidebar's list of pages, in the order you
 *                               arranged them: [{ id, name }, ...]
 *   "freeform-notes:page:<id>"  one page, as JSON (see createEmptyPage below)
 *   "freeform-notes:last-page"  the id of the page that was open last
 */

const PREFIX = 'freeform-notes';
const PAGES_KEY = `${PREFIX}:pages`;
const LAST_PAGE_KEY = `${PREFIX}:last-page`;
const PAGE_KEY_START = `${PREFIX}:page:`;

const DEFAULT_PAGE_NAME = 'Untitled page';

function pageKey(id) {
  return PAGE_KEY_START + id;
}

/** Makes a short random id, like "mi5x0k2a-4f8a2c". The first part is the time it was made. */
export function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** Returns a new, empty page. Every saved page has this shape. */
export function createEmptyPage(name = DEFAULT_PAGE_NAME) {
  return {
    id: makeId(),
    name,
    view: { x: 0, y: 0, zoom: 1 }, // where you were panned and zoomed to
    textBoxes: [],                 // { id, x, y, width, html }
    strokes: [],                   // drawings (added in Phase 4)
  };
}

// ---------- One page ----------

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
}

/** Deletes a page's saved data for good. */
export function deletePage(id) {
  localStorage.removeItem(pageKey(id));
}

// ---------- The list of pages ----------

/**
 * Returns the sidebar's list of pages: [{ id, name }, ...] in your order.
 * If the list is missing (for example, notes saved before the sidebar
 * existed), it's rebuilt from the pages that are saved, oldest first.
 */
export function loadPageList() {
  const raw = localStorage.getItem(PAGES_KEY);
  if (raw) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list
          .filter((entry) => entry && typeof entry.id === 'string')
          .map((entry) => ({
            id: entry.id,
            name: typeof entry.name === 'string' ? entry.name : DEFAULT_PAGE_NAME,
          }));
      }
    } catch (err) {
      console.error('The page list could not be read, so it was rebuilt', err);
    }
  }

  const list = buildPageList();
  try {
    savePageList(list);
  } catch (err) {
    console.error('The rebuilt page list could not be saved', err);
  }
  return list;
}

/** Saves the page list. Throws if the browser refuses, like savePage. */
export function savePageList(list) {
  localStorage.setItem(PAGES_KEY, JSON.stringify(list));
}

/** Makes a page list out of every page that's saved, oldest first. */
function buildPageList() {
  const list = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(PAGE_KEY_START)) continue;
    const id = key.slice(PAGE_KEY_START.length);
    const page = loadPage(id);
    if (page) list.push({ id, name: page.name });
  }
  list.sort((a, b) => createdTime(a.id) - createdTime(b.id));
  return list;
}

/** When a page was made, read from the start of its id (see makeId). */
function createdTime(id) {
  return parseInt(id, 36) || 0;
}

// ---------- Which page is open ----------

/**
 * Returns the page to show when the app starts: the one you had open last,
 * or else the first page in the list. On first run, makes a new empty page.
 */
export function loadStartupPage() {
  const list = loadPageList();
  const inList = (id) => list.some((entry) => entry.id === id);

  const lastId = localStorage.getItem(LAST_PAGE_KEY);
  const candidates = [lastId, ...list.map((entry) => entry.id)].filter(inList);
  for (const id of candidates) {
    const page = loadPage(id);
    if (page) return page;
  }

  const page = createEmptyPage();
  list.push({ id: page.id, name: page.name });
  try {
    savePage(page);
    savePageList(list);
  } catch (err) {
    console.error('The new page could not be saved', err);
  }
  return page;
}

/** Remembers which page is open, so the app reopens it next time. */
export function rememberOpenPage(id) {
  try {
    localStorage.setItem(LAST_PAGE_KEY, id);
  } catch (err) {
    console.error('Could not remember the open page', err);
  }
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
