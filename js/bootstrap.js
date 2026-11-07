import { initializeNative } from './native.js';

try {
  // Android Preferences must be ready before the app reads saved state/theme.
  await initializeNative();
  await import('./app.js');
} catch (error) {
  console.error('Planner startup failed', error);
  const root = document.getElementById('view');
  root.innerHTML = '<section class="card"><h2>Could not start the planner</h2><p>Close and reopen the app. Your saved data has not been cleared.</p><button class="btn" type="button" data-retry>Try again</button></section>';
  root.querySelector('[data-retry]').addEventListener('click', () => location.reload());
}
