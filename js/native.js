// Native integrations are loaded only inside the bundled Android app.
// The hosted PWA continues to run directly from its ES modules.
const STORAGE_KEYS = ['planner.v1', 'planner.theme', 'planner.lightTheme', 'planner.lastBackup'];
export const isNativeRuntime = () => globalThis.Capacitor?.isNativePlatform?.() === true;

/** Ordered native writes prevent a slow earlier save from replacing a later one. */
export class NativePreferenceMirror {
  constructor(preferences, cache) {
    this.preferences = preferences;
    this.cache = cache;
    this.pending = Promise.resolve();
  }
  async hydrate(keys = STORAGE_KEYS) {
    // Finish all reads before changing the working copy. Failed reads must
    // stop startup rather than let an empty state overwrite existing data.
    const values = await Promise.all(keys.map(async (key) => ({ key, ...(await this.preferences.get({ key })) })));
    for (const { key, value } of values) {
      if (value !== null && value !== undefined) this.cache.setItem(key, value);
      else {
        const existing = this.cache.getItem(key);
        if (existing !== null) await this.write(key, existing);
      }
    }
  }
  write(key, value) {
    this.pending = this.pending.catch(() => {}).then(() => value === null
      ? this.preferences.remove({ key }) : this.preferences.set({ key, value }));
    return this.pending;
  }
  flush() { return this.pending; }
}

let mirror = null;
let nativeFiles = null;
let nativeShare = null;
let systemBars = null;
const storageError = () => globalThis.dispatchEvent?.(new Event('planner:native-storage-error'));

export function mirrorNativePreference(key, value) {
  if (mirror) mirror.write(key, value).catch(storageError);
}

export function applyNativeTheme(theme) {
  systemBars?.setStyle({ style: ['dark', 'sand'].includes(theme) ? 'DARK' : 'LIGHT' }).catch(() => {});
}

export async function initializeNative() {
  if (!isNativeRuntime()) return;
  const [{ Preferences }, { App }, files, { Share }, { Browser }, { SystemBars }] = await Promise.all([
    import('@capacitor/preferences'), import('@capacitor/app'), import('@capacitor/filesystem'),
    import('@capacitor/share'), import('@capacitor/browser'), import('@capacitor/core'),
  ]);
  const storage = new NativePreferenceMirror(Preferences, globalThis.localStorage);
  await storage.hydrate();
  const savedPlanner = globalThis.localStorage.getItem('planner.v1');
  if (savedPlanner !== null) {
    const data = JSON.parse(savedPlanner);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid saved planner data');
  }
  mirror = storage;
  nativeFiles = files;
  nativeShare = Share;
  systemBars = SystemBars;
  document.documentElement.dataset.native = 'android';
  await App.addListener('backButton', async ({ canGoBack }) => {
    if (document.querySelector('dialog.sheet[open]') || canGoBack) window.history.back();
    else if (location.hash && location.hash !== '#/today') location.hash = '#/today';
    else {
      try { await mirror.flush(); await App.exitApp(); }
      catch { storageError(); }
    }
  });
  await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) mirror.flush().catch(storageError);
  });
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented) return;
    const url = new URL(anchor.href, location.href);
    if (['https:', 'http:'].includes(url.protocol) && url.origin !== location.origin) {
      event.preventDefault();
      Browser.open({ url: url.href }).catch(() => globalThis.dispatchEvent(new Event('planner:native-link-error')));
    }
  });
}

export async function shareNativeBackup(filename, text) {
  if (!isNativeRuntime()) return null;
  if (!nativeFiles || !nativeShare) throw new Error('Native backup is not ready');
  const { Filesystem, Directory, Encoding } = nativeFiles;
  const { uri } = await Filesystem.writeFile({
    path: `backups/${filename}`, data: text, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true,
  });
  try {
    await nativeShare.share({ title: 'Planner backup', url: uri, dialogTitle: 'Save your planner backup' });
    return 'shared';
  } catch (error) {
    if (/cancel|dismiss/i.test(error?.message || '')) return 'cancelled';
    throw error;
  }
}
