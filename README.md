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
| Dark / light mode | The ☀ / ☾ button at the top right. The app always opens in dark mode. |

Pasted text is pasted as plain text, so it matches your other notes.

### Formatting

The formatting buttons work on the text box you're typing in, and are greyed out otherwise. A button lights up when its formatting is on where the cursor is.

| Format | Button | Shortcut |
|---|---|---|
| Bold, italic, underline | **B**, *I*, U | Cmd+B, Cmd+I, Cmd+U |
| Strikethrough | S | Cmd+Shift+X |
| Big heading, small heading | H1, H2 (click again to undo) | Cmd+Option+1, Cmd+Option+2 |
| Normal text | ¶ | Cmd+Option+0 |
| Text size | − [16] +. Select text, type any size from 4 to 400 and press Enter (Escape cancels), or click − / + | Cmd+Shift+, (smaller), Cmd+Shift+. (bigger) |
| Bullet list | • | Cmd+Shift+8 |
| Numbered list | 1. | Cmd+Shift+7 |
| Checklist | ☑ (click a checkbox to tick it) | Cmd+Shift+9 |
| Text color, highlight | A, ab (select text first) | |

The size box always shows the size of the text where the cursor is. Normal text is 16 and H1 is about 26.
| Table | ⊞ Table, then pick a size | |

- **Lists:** Tab and Shift+Tab indent and outdent list items.
- **Tables:** Tab and Shift+Tab move between cells, and Tab in the last cell adds a row. While the cursor is in a table, the toolbar shows buttons to add or delete rows and columns, or delete the table.
- **Colors** are saved by name (like "red"), and each mode has its own shade, so colored text stays readable in dark and light mode.
- **Undo:** Cmd+Z doesn't undo ticking a checkbox or adding/deleting table rows and columns.

## Files

| File | What it does |
|---|---|
| `index.html` | Page layout: toolbar buttons and canvas |
| `styles.css` | Colors, fonts and layout. Dark and light mode colors are variables at the top. |
| `js/app.js` | Starts the app, connects the other files, handles autosave |
| `js/canvas.js` | Panning, zooming, and detecting clicks on empty space |
| `js/textboxes.js` | Creating, editing, moving, resizing and deleting text boxes |
| `js/storage.js` | All saving and loading |
| `js/toolbar.js` | Formatting buttons, pop-up menus and keyboard shortcuts |
| `js/editing.js` | Small helpers shared by the formatting files |
| `js/colors.js` | Text colors and highlights |
| `js/lists.js` | Bullet lists, numbered lists and checklists |
| `js/tables.js` | Inserting and editing tables |
| `js/textsize.js` | The text size box |
| `js/theme.js` | The dark/light mode switch |

## Common changes

- **Colors and fonts:** the variables at the top of `styles.css`. Dark mode is `:root`, light mode is `:root[data-theme="light"]`.
- **Add a text/highlight color:** add its name to `COLOR_NAMES` in `js/colors.js`, then add `--text-<name>` and `--highlight-<name>` to both modes in `styles.css`.
- **Keyboard shortcuts:** `SHORTCUTS` in `js/toolbar.js`.
- **Largest table in the picker:** `MAX_TABLE_ROWS` and `MAX_TABLE_COLUMNS` in `js/tables.js`.
- **Smallest and largest text size:** `MIN_TEXT_SIZE` and `MAX_TEXT_SIZE` in `js/textsize.js`.
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
2. ✅ Dark/light mode switch and formatting toolbar: bold, italic, underline, strikethrough, headings, lists, checklists, text color, highlight, tables
3. Pages sidebar: multiple note pages you can create, rename, delete and switch between
4. Drawing: pen with color and size, eraser
5. Export and polish: PDF export, JSON export/import, undo/redo, "jump back to my notes" button
