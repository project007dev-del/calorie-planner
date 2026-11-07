// Appearance is a device preference, kept apart from the planner data.
// index.html applies it before the first paint so the page never flashes.
const KEY = 'planner.theme';
const LIGHT_KEY = 'planner.lightTheme';
const BAR_COLORS = { light: '#f3f4f1', dark: '#0d0d0d', sand: '#f0ece2' }; // match --bg for the phone status bar
export const THEME_OPTIONS = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark'], ['sand', 'Sand']];
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemeMode() {
  try {
    const m = localStorage.getItem(KEY);
    return Object.hasOwn(BAR_COLORS, m) ? m : 'system';
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
    let lightTheme = 'light';
    try { if (localStorage.getItem(LIGHT_KEY) === 'sand') lightTheme = 'sand'; } catch { /* use the default light theme */ }
    const label = theme === 'dark' ? `Switch to ${lightTheme === 'sand' ? 'Sand theme' : 'light mode'}` : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }
}

export function setThemeMode(mode) {
  try {
    if (Object.hasOwn(BAR_COLORS, mode)) {
      localStorage.setItem(KEY, mode);
      if (mode !== 'dark') localStorage.setItem(LIGHT_KEY, mode);
    }
    else localStorage.removeItem(KEY);
  } catch { /* private mode: still apply for this session */ }
  applyTheme();
}

/** Header button: switch to dark, then return to the last chosen light palette. */
export function toggleTheme() {
  let lightTheme = 'light';
  try { if (localStorage.getItem(LIGHT_KEY) === 'sand') lightTheme = 'sand'; } catch { /* use the default light theme */ }
  setThemeMode(resolvedTheme() === 'dark' ? lightTheme : 'dark');
}

const onSystemChange = () => { if (getThemeMode() === 'system') applyTheme(); };
if (media.addEventListener) media.addEventListener('change', onSystemChange);
else media.addListener?.(onSystemChange); // older Safari
