/*
 * pages.js
 * The pages sidebar on the left, and the page name in the toolbar.
 *
 *   Click a page            open it
 *   Double-click a name     rename it (the name in the toolbar works too).
 *                           Enter or clicking away saves, Escape cancels.
 *   Drag a page             move it up or down the list
 *   ✕ (shown on hover)      delete the page, after asking first
 *   + New page              adds an empty page at the bottom and opens it
 *   ☰ in the toolbar        hides or shows the sidebar. It always starts open.
 *
 * Pages are listed in the order you made them, until you drag them around.
 * storage.js saves the list as [{ id, name }, ...].
 *
 * app.js owns the page that's on screen. This file asks it for the open page
 * (getOpenPage), to save it (saveOpenPage) and to show another one (showPage).
 */

import {
  createEmptyPage, loadPage, savePage, deletePage as deletePageData,
  loadPageList, savePageList,
} from './storage.js';

const MAX_NAME_LENGTH = 100; // longest page name, in characters
const DRAG_TOLERANCE = 4;    // pixels the mouse can move before a click counts as a drag

export function setupPages({
  toggleButton, pageList, newPageButton, nameLabel,
  getOpenPage, saveOpenPage, showPage, onSaveError,
}) {
  const pages = loadPageList(); // [{ id, name }] in sidebar order
  let ignoreClick = false;      // true for a moment after a drag, so letting go doesn't also open the page

  // The open page must always be in the list
  const firstPage = getOpenPage();
  if (!findEntry(firstPage.id)) {
    pages.push({ id: firstPage.id, name: firstPage.name });
    saveList();
  }

  render();
  setSidebarOpen(true);

  toggleButton.addEventListener('click', () => {
    setSidebarOpen(document.body.classList.contains('sidebar-closed'));
  });
  newPageButton.addEventListener('click', addPage);
  nameLabel.addEventListener('dblclick', () => editName(nameLabel, getOpenPage().id));

  // ---------- Showing the list ----------

  /** Shows or hides the sidebar. Not saved: the app always opens with it showing. */
  function setSidebarOpen(open) {
    document.body.classList.toggle('sidebar-closed', !open);
    toggleButton.title = open ? 'Hide pages' : 'Show pages';
    toggleButton.setAttribute('aria-expanded', String(open));
  }

  /** Rebuilds the list in the sidebar from `pages`. */
  function render() {
    pageList.replaceChildren(...pages.map(buildItem));
    highlightOpenPage();
  }

  /** Builds one row of the list: the page name, and a delete button. */
  function buildItem(entry) {
    const item = document.createElement('li');
    item.className = 'page-item';
    item.dataset.id = entry.id;

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'page-item-name';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'page-item-delete';
    remove.textContent = '✕';
    remove.title = 'Delete page';

    item.append(name, remove);
    showName(item, entry.name);

    name.addEventListener('click', () => openPage(entry.id));
    name.addEventListener('dblclick', () => editName(name, entry.id));
    remove.addEventListener('click', () => removePage(entry.id));
    item.addEventListener('pointerdown', (event) => startReorder(event, item));
    return item;
  }

  /** Writes a page's name into its row in the list. */
  function showName(item, name) {
    const button = item.querySelector('.page-item-name');
    button.textContent = name;
    button.title = `${name}\nClick to open, double-click to rename, drag to move`;
  }

  /** Marks the open page in the list, and shows its name in the toolbar. */
  function highlightOpenPage() {
    const openId = getOpenPage().id;
    for (const item of pageList.children) {
      const isOpen = item.dataset.id === openId;
      item.classList.toggle('current', isOpen);
      if (isOpen) item.scrollIntoView({ block: 'nearest' });
    }
    const name = findEntry(openId)?.name ?? getOpenPage().name;
    nameLabel.textContent = name;
    nameLabel.title = `${name} (double-click to rename)`;
  }

  // ---------- Opening, adding and deleting ----------

  /** Saves the open page, then shows page `id` instead. */
  function openPage(id) {
    if (ignoreClick || id === getOpenPage().id) return;
    stopTyping();
    // If saving fails, stay on this page so the changes that weren't saved aren't lost
    if (!saveOpenPage()) return;

    const page = loadPage(id);
    if (!page) {
      alert('This page could not be opened. Its saved data is missing or damaged.');
      return;
    }
    showPage(page);
    highlightOpenPage();
  }

  /** Adds an empty page at the bottom of the list and opens it. */
  function addPage() {
    stopTyping();
    if (!saveOpenPage()) return;
    showPage(makeNewPage());
    saveList();
    render();
  }

  /** Makes an empty page, adds it to the list and saves it. */
  function makeNewPage() {
    const page = createEmptyPage();
    pages.push({ id: page.id, name: page.name });
    try {
      savePage(page);
    } catch (err) {
      console.error('The new page could not be saved', err);
      onSaveError();
    }
    return page;
  }

  /** Deletes page `id` after asking. If it was open, opens a neighbor (or a new empty page). */
  function removePage(id) {
    const entry = findEntry(id);
    if (!entry || !confirm(`Delete "${entry.name}"? This can't be undone.`)) return;

    const index = pages.indexOf(entry);
    const wasOpen = id === getOpenPage().id;
    if (wasOpen) stopTyping();
    pages.splice(index, 1);
    deletePageData(id);

    if (wasOpen) {
      // Open the page that was below it, or above it if it was at the bottom.
      // showPage drops any save still waiting for the deleted page.
      const next = pages[index] ?? pages[index - 1];
      showPage((next && loadPage(next.id)) || makeNewPage());
    }
    saveList();
    render();
  }

  // ---------- Renaming ----------

  /**
   * Swaps a page name (in the list or the toolbar) for a text field so you can
   * type a new one. Enter or clicking away saves it, Escape cancels.
   */
  function editName(label, id) {
    const entry = findEntry(id);
    if (!entry) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = entry.name;
    input.maxLength = MAX_NAME_LENGTH;
    input.setAttribute('aria-label', 'Page name');

    let finished = false;
    function finish(save) {
      if (finished) return; // Enter removes the field, which can also count as clicking away
      finished = true;
      const typed = input.value;
      input.remove();
      label.hidden = false;
      if (save) renamePage(id, typed);
    }

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));

    label.hidden = true;
    label.after(input);
    input.focus();
    input.select();
  }

  /** Renames a page. An empty name keeps the old one. */
  function renamePage(id, typedName) {
    const entry = findEntry(id);
    const name = typedName.trim().slice(0, MAX_NAME_LENGTH);
    if (!entry || !name || name === entry.name) return;

    entry.name = name;
    const openPage = getOpenPage();
    if (id === openPage.id) {
      openPage.name = name;
      saveOpenPage();
    } else {
      // The name is also kept inside the page itself, so update it there too
      const page = loadPage(id);
      if (page) {
        page.name = name;
        try {
          savePage(page);
        } catch (err) {
          console.error('The renamed page could not be saved', err);
          onSaveError();
        }
      }
    }
    saveList();

    const item = [...pageList.children].find((li) => li.dataset.id === id);
    if (item) showName(item, name);
    highlightOpenPage();
  }

  // ---------- Dragging to reorder ----------

  /** Starts watching the mouse after pressing on a page. Moving far enough starts a drag. */
  function startReorder(event, item) {
    if (event.button !== 0 || event.target.closest('.page-item-delete, input')) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;

    function onMove(moveEvent) {
      if (moveEvent.pointerId !== event.pointerId) return;
      if (!dragging) {
        if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < DRAG_TOLERANCE) return;
        dragging = true;
        item.classList.add('dragging');
        document.body.classList.add('reordering');
      }

      // Put the page in front of the first page whose middle is below the mouse
      const others = [...pageList.children].filter((li) => li !== item);
      const below = others.find((li) => {
        const rect = li.getBoundingClientRect();
        return moveEvent.clientY < rect.top + rect.height / 2;
      });
      if (below) {
        if (item.nextElementSibling !== below) pageList.insertBefore(item, below);
      } else if (pageList.lastElementChild !== item) {
        pageList.append(item);
      }
    }

    function onEnd(endEvent) {
      if (endEvent.pointerId !== event.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      if (!dragging) return; // it was a click, so the page opens as usual

      item.classList.remove('dragging');
      document.body.classList.remove('reordering');
      ignoreClick = true;
      setTimeout(() => { ignoreClick = false; });

      if (endEvent.type === 'pointercancel') {
        render(); // put everything back where it was
        return;
      }
      const order = [...pageList.children].map((li) => li.dataset.id);
      pages.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      saveList();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  // ---------- Helpers ----------

  function findEntry(id) {
    return pages.find((entry) => entry.id === id);
  }

  function saveList() {
    try {
      savePageList(pages);
    } catch (err) {
      console.error('The page list could not be saved', err);
      onSaveError();
    }
  }
}

/** Stops typing (in a text box or a name field), so its changes are finished before switching pages. */
function stopTyping() {
  document.activeElement?.blur();
}
