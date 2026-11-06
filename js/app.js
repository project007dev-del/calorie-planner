// App shell: hash router, shared date selector, persistence.
import { loadState, saveState } from './store.js';
import { todayISO, addDays, fmtDate, isValidISO } from './util.js';
import { toast, historySettled } from './ui.js';
import { applyTheme, toggleTheme } from './theme.js';
import * as today from './views/today.js';
import * as food from './views/food.js';
import * as workout from './views/workout.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

const views = { today, food, workout, progress, settings };
const TITLES = { today: 'Today', food: 'Food', workout: 'Workout', progress: 'Progress', settings: 'Settings' };

const main = document.getElementById('view');
const datebar = document.getElementById('datebar');
const dateLabel = document.getElementById('dateLabel');
const dateInput = document.getElementById('dateInput');

let askedPersist = false;
const ctx = {
  state: loadState(),
  ui: { date: todayISO() },
  installPrompt: null, // set by "beforeinstallprompt" (Chrome / Android)
  save() {
    if (!saveState(ctx.state)) { toast('Could not save – storage may be full'); return; }
    // Ask the browser not to clear the planner's storage when space runs low.
    if (!askedPersist && navigator.storage?.persist) {
      askedPersist = true;
      navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {});
    }
  },
  go(hash) {
    // If a sheet just closed, let its Back step finish first or it would undo this navigation.
    historySettled().then(() => {
      if (location.hash === hash) render();
      else location.hash = hash;
    });
  },
  setDate(iso) {
    if (isValidISO(iso)) ctx.ui.date = iso;
  },
  render: () => render(),
};

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const name = views[parts[0]] ? parts[0] : 'today';
  return { name, params: parts.slice(1) };
}

/** Views that work on "the selected day" show the date switcher. */
function usesDate(name, params) {
  if (name === 'today') return true;
  if (name === 'food') return !params[0] || params[0] === 'log';
  if (name === 'workout') return !params[0] || params[0] === 'today';
  return false;
}

function renderDatebar() {
  const t = todayISO();
  const d = ctx.ui.date;
  dateLabel.textContent = d === t ? `Today · ${fmtDate(d)}` : d === addDays(t, -1) ? `Yesterday · ${fmtDate(d)}` : fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  dateInput.value = d;
  dateInput.max = addDays(t, 1);
  document.getElementById('dateNext').disabled = d >= addDays(t, 1);
}

function render() {
  const { name, params } = parseHash();
  document.getElementById('pageTitle').textContent = TITLES[name];
  document.title = `${TITLES[name]} · Planner`;
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
  document.querySelectorAll('.tabbar a').forEach((a) => (a.dataset.tab === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const showDate = usesDate(name, params);
  datebar.hidden = !showDate;
  if (showDate) renderDatebar();

  const root = document.createElement('div');
  root.className = 'stack';
  main.replaceChildren(root);
  try {
    views[name].render(root, ctx, params);
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="card"><h2>Something went wrong</h2><p class="muted small">${String(e.message || e)}</p></div>`;
  }
}

document.getElementById('datePrev').addEventListener('click', () => { ctx.ui.date = addDays(ctx.ui.date, -1); render(); });
document.getElementById('dateNext').addEventListener('click', () => { ctx.ui.date = addDays(ctx.ui.date, 1); render(); });
document.getElementById('dateToday').addEventListener('click', () => { ctx.ui.date = todayISO(); render(); });
dateInput.addEventListener('change', () => { if (isValidISO(dateInput.value)) { ctx.ui.date = dateInput.value; render(); } });
// On computers a click on the (invisible) date field doesn't open the calendar by itself.
dateInput.addEventListener('click', () => {
  if (!matchMedia('(pointer: fine)').matches) return; // phones open their own picker
  try { dateInput.showPicker?.(); } catch { /* not allowed here */ }
});

applyTheme();
document.getElementById('themeToggle').addEventListener('click', () => {
  toggleTheme();
  if (parseHash().name === 'settings') render(); // keep the Appearance choice in sync
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  ctx.installPrompt = e;
  if (parseHash().name === 'settings') render();
});
window.addEventListener('appinstalled', () => { ctx.installPrompt = null; toast('App installed'); });

// Keep "today" correct if the app stays open past midnight.
let lastToday = todayISO();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = todayISO();
  if (t !== lastToday) {
    if (ctx.ui.date === lastToday) ctx.ui.date = t;
    lastToday = t;
    render();
  }
});

// Data changed in another tab → reload it.
window.addEventListener('storage', (e) => {
  if (e.key === 'planner.v1') { ctx.state = loadState(); render(); }
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
if (!location.hash) history.replaceState(null, '', '#/today');
render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker not registered', e));
}

// Handy for debugging in the console.
window.__planner = ctx;
