/*
 * tables.js
 * Tables inside text boxes.
 *
 *   Tab / Shift+Tab   move to the next / previous cell
 *                     (Tab in the last cell adds a new row)
 *   Toolbar buttons   add or delete rows and columns, or delete the table
 *                     (shown while the text cursor is in a table)
 */

import { runCommand, closestAtCursor, getActiveContent, notifyChanged, placeCursor } from './editing.js';

// Largest table the "Insert table" picker offers
export const MAX_TABLE_ROWS = 8;
export const MAX_TABLE_COLUMNS = 6;

/** Inserts an empty table where the text cursor is, and puts the cursor in the first cell. */
export function insertTable(rows, columns) {
  const content = getActiveContent();
  if (!content) return;

  const row = `<tr>${'<td><br></td>'.repeat(columns)}</tr>`;
  // The empty line after the table gives you somewhere to keep typing.
  // data-new-table marks the table so we can find it straight after inserting it.
  runCommand('insertHTML',
    `<table data-new-table=""><tbody>${row.repeat(rows)}</tbody></table><div><br></div>`);

  const table = content.querySelector('table[data-new-table]');
  if (!table) return;
  table.removeAttribute('data-new-table');
  placeCursor(table.rows[0].cells[0]);
  notifyChanged(content);
}

/** Adds an empty row below the one the cursor is in. */
export function addRow() {
  const cell = closestAtCursor('td, th');
  if (!cell) return;
  const newRow = insertRowAfter(cell.parentElement);
  placeCursor(newRow.cells[Math.min(cell.cellIndex, newRow.cells.length - 1)]);
  notifyChanged(getActiveContent());
}

/** Adds an empty column to the right of the one the cursor is in. */
export function addColumn() {
  const cell = closestAtCursor('td, th');
  if (!cell) return;
  const index = cell.cellIndex;
  for (const row of cell.closest('table').rows) {
    const newCell = makeEmptyCell();
    const neighbor = row.cells[Math.min(index, row.cells.length - 1)];
    if (neighbor) neighbor.after(newCell);
    else row.append(newCell);
  }
  placeCursor(cell.parentElement.cells[index + 1]);
  notifyChanged(getActiveContent());
}

/** Deletes the row the cursor is in. Deleting the last row deletes the table. */
export function deleteRow() {
  const cell = closestAtCursor('td, th');
  if (!cell) return;
  const table = cell.closest('table');
  if (table.rows.length === 1) return deleteTable();

  const row = cell.parentElement;
  const nextRow = row.nextElementSibling || row.previousElementSibling;
  const index = cell.cellIndex;
  row.remove();
  placeCursor(nextRow.cells[Math.min(index, nextRow.cells.length - 1)]);
  notifyChanged(getActiveContent());
}

/** Deletes the column the cursor is in. Deleting the last column deletes the table. */
export function deleteColumn() {
  const cell = closestAtCursor('td, th');
  if (!cell) return;
  const row = cell.parentElement;
  const table = cell.closest('table');
  if (row.cells.length === 1) return deleteTable();

  const index = cell.cellIndex;
  for (const r of table.rows) r.cells[index]?.remove();
  placeCursor(row.cells[Math.min(index, row.cells.length - 1)]);
  notifyChanged(getActiveContent());
}

/** Deletes the table the cursor is in, and puts the cursor on the line after it. */
export function deleteTable() {
  const content = getActiveContent();
  const table = closestAtCursor('table');
  if (!table) return;

  let lineAfter = table.nextElementSibling;
  if (!lineAfter) {
    lineAfter = document.createElement('div');
    lineAfter.innerHTML = '<br>';
    table.after(lineAfter);
  }
  table.remove();
  placeCursor(lineAfter);
  notifyChanged(content);
}

export function setupTables({ world }) {
  world.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const cell = closestAtCursor('td, th');
    if (!cell) return;
    event.preventDefault(); // otherwise Tab would jump out of the text box

    const cells = [...cell.closest('table').querySelectorAll('td, th')];
    const index = cells.indexOf(cell);

    if (event.shiftKey) {
      if (index > 0) placeCursor(cells[index - 1]);
    } else if (index < cells.length - 1) {
      placeCursor(cells[index + 1]);
    } else {
      // Last cell: add a row and move into it
      const newRow = insertRowAfter(cell.parentElement);
      placeCursor(newRow.cells[0]);
      notifyChanged(getActiveContent());
    }
  });
}

function insertRowAfter(row) {
  const newRow = document.createElement('tr');
  for (let i = 0; i < row.cells.length; i++) newRow.append(makeEmptyCell());
  row.after(newRow);
  return newRow;
}

function makeEmptyCell() {
  const cell = document.createElement('td');
  cell.innerHTML = '<br>'; // an empty cell needs a <br> so you can click into it
  return cell;
}
