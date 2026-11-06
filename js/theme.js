// Light / dark theme. This is a device preference, kept apart from the planner
// data (localStorage key "planner.theme" = "light" | "dark"; missing = follow the system).
// index.html applies it before the first paint so the page never flashes.
const KEY = 'planner.theme';
const BAR_COLORS = { light: '#f3f4f1', dark: '#0d0d0d' }; // match --bg for the phone status bar
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemeMode() {
  try {
    const m = localStorage.getItem(KEY);
    return m === 'light' || m === 'dark' ? m : 'system';
  } catch {
    return 'system';
  }
}

export const resolvedTheme = (mode = getThemeMode()) => (mode === 'system' ? (media.matches ? 'dark' : 'light') : mode);

export function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLORS[theme]);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }
}

export function setThemeMode(mode) {
  try {
    if (mode === 'light' || mode === 'dark') localStorage.setItem(KEY, mode);
    else localStorage.removeItem(KEY);
  } catch { /* private mode: still apply for this session */ }
  applyTheme();
}

/** Header button: flip between light and dark (an explicit choice). */
export function toggleTheme() {
  setThemeMode(resolvedTheme() === 'dark' ? 'light' : 'dark');
}

const onSystemChange = () => { if (getThemeMode() === 'system') applyTheme(); };
if (media.addEventListener) media.addEventListener('change', onSystemChange);
else media.addListener?.(onSystemChange); // older Safari
