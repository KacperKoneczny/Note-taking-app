# Freeform Notes

A note-taking page with no fixed layout: click anywhere on the canvas and start typing. It runs locally in your browser, and notes are saved in the browser's storage.

## Running it

1. Install Microsoft's **Live Preview** extension in VS Code.
2. Open this folder in VS Code and open `index.html`.
3. Click the preview button in the top-right corner of the editor, or right-click `index.html` and choose **Show Preview**.
4. To use a normal browser (recommended), open the preview's menu and choose to open it in the browser, or change Live Preview's **Open Preview Target** setting to **External Browser**.

Always use the same browser and the same address (usually `http://127.0.0.1:3000`). Notes are stored separately for each browser and each address, so notes saved on `:3000` won't show up on `:3001`.

## Controls

| Action | How |
|---|---|
| Write | Click any empty spot and type |
| Stop typing | Click somewhere else, or press Escape |
| Move a box | Drag the bar that appears above it |
| Change a box's width | Drag its right edge |
| Delete a box | Click the bar above it to select it, then press Delete/Backspace. Empty boxes delete themselves. |
| Pan | Drag empty space, scroll the mouse wheel (Shift+wheel for sideways), Space+drag, or middle-button drag |
| Zoom | Cmd+wheel (Ctrl+wheel on Windows), or the − / 100% / + buttons |

Pasted text is pasted as plain text, so it matches your other notes.

## Files

| File | What it does |
|---|---|
| `index.html` | Page layout: toolbar and canvas |
| `styles.css` | Colors, fonts and layout. Theme colors are variables at the top. |
| `js/app.js` | Starts the app, connects the other files, handles autosave |
| `js/canvas.js` | Panning, zooming, and detecting clicks on empty space |
| `js/textboxes.js` | Creating, editing, moving, resizing and deleting text boxes |
| `js/storage.js` | All saving and loading |

## Common changes

- **Colors and fonts:** the variables at the top of `styles.css`.
- **New box width, smallest box width:** `DEFAULT_WIDTH` and `MIN_WIDTH` at the top of `js/textboxes.js`.
- **Zoom limits and zoom speed:** `MIN_ZOOM`, `MAX_ZOOM`, `ZOOM_STEP` and `WHEEL_ZOOM_SPEED` at the top of `js/canvas.js`.
- **How long to wait before saving:** `SAVE_DELAY_MS` in `js/app.js`.

## Where notes are saved

Notes are saved in the browser's localStorage, about half a second after each change:

- `freeform-notes:page:<id>` holds one page as JSON.
- `freeform-notes:last-page` remembers which page was open.

Clearing your browser's site data deletes your notes. A JSON export/import button for backups is planned (see below).

To look at the saved data, open the browser's developer tools and go to Application → Local Storage (Chrome) or Storage → Local Storage (Firefox).

## Roadmap

1. ✅ Canvas and text boxes: dark background, pan and zoom, create/move/resize/delete boxes, autosave
2. Formatting toolbar: bold, italic, underline, strikethrough, headings, lists, checklists, text color, highlight, tables
3. Pages sidebar: multiple note pages you can create, rename, delete and switch between
4. Drawing: pen with color and size, eraser
5. Export and polish: PDF export, JSON export/import, undo/redo, "jump back to my notes" button
