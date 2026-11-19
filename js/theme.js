/*
 * theme.js
 * The dark/light mode switch.
 *
 * The app always opens in dark mode (index.html starts with
 * <html data-theme="dark">). The switch changes data-theme, and styles.css
 * swaps the colors. The choice isn't saved, so a reload goes back to dark.
 */

export function setupTheme({ button }) {
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    // The button shows the mode you'd switch to
    button.textContent = theme === 'dark' ? '☀' : '☾';
    button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  apply('dark');
  button.addEventListener('click', () => apply(getTheme() === 'dark' ? 'light' : 'dark'));
}

/** Returns "dark" or "light". */
export function getTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
