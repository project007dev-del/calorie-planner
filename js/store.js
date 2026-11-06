// Persistence: everything lives in localStorage under one key.
// Shape:
// {
//   version, profile, targets, burn, supplements: [...], customFoods: [...],
//   days: { 'YYYY-MM-DD': { food: [entry], supps: {id: true}, workout: {...}, weightKg, waistCm } }
// }
// A food entry keeps a snapshot of the per-100 g values it was logged with, so
// editing or deleting a food later never changes your history.
import { DEFAULT_PROFILE, DEFAULT_TARGETS, DEFAULT_BURN, DEFAULT_SUPPLEMENTS, MEALS } from './plan.js';
import { isValidISO } from './util.js';

const MEAL_IDS = MEALS.map((m) => m.id);
const LAST_BACKUP_KEY = 'planner.lastBackup';

export const STORAGE_KEY = 'planner.v1';
export const VERSION = 1;

export function defaultState() {
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    profile: { ...DEFAULT_PROFILE },
    targets: { ...DEFAULT_TARGETS },
    burn: { ...DEFAULT_BURN },
    supplements: DEFAULT_SUPPLEMENTS.map((s) => ({ ...s })),
    customFoods: [],
    days: {},
  };
}

/** Fill in anything missing so older/partial data keeps working. */
export function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile || {}) },
    targets: { ...base.targets, ...(raw.targets || {}) },
    burn: { ...base.burn, ...(raw.burn || {}) },
    supplements: Array.isArray(raw.supplements) ? raw.supplements : base.supplements,
    customFoods: Array.isArray(raw.customFoods) ? raw.customFoods : [],
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
  };
  for (const key of Object.keys(s.days)) {
    if (!isValidISO(key) || !s.days[key] || typeof s.days[key] !== 'object') {
      delete s.days[key];
      continue;
    }
    const d = s.days[key];
    if (!Array.isArray(d.food)) d.food = [];
    d.food = d.food.filter((e) => e && typeof e === 'object');
    for (const e of d.food) if (!MEAL_IDS.includes(e.meal)) e.meal = 'snack'; // never hide food under an unknown meal
    if (!d.supps || typeof d.supps !== 'object') d.supps = {};
  }
  // Supplements: older versions had `daily: true/false` instead of a schedule.
  s.supplements = s.supplements
    .filter((x) => x && typeof x === 'object' && String(x.name || '').trim())
    .map((x) => {
      const sup = { ...x, id: x.id || `s_${Math.random().toString(36).slice(2, 10)}` };
      if (!sup.schedule || typeof sup.schedule !== 'object') sup.schedule = x.daily === false ? { type: 'asneeded' } : { type: 'daily' };
      delete sup.daily;
      return sup;
    });
  s.version = VERSION;
  return s;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const txt = storage?.getItem(STORAGE_KEY);
    return normalize(txt ? JSON.parse(txt) : null);
  } catch (e) {
    console.error('Could not read saved data', e);
    return defaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Could not save', e);
    return false;
  }
}

/** Get a day record; creates an empty one when create = true. */
export function getDay(state, date, create = false) {
  let d = state.days[date];
  if (!d && create) d = state.days[date] = { food: [], supps: {} };
  return d || null;
}

/** When this device last exported a backup (ISO date-time) – a device setting, not planner data. */
export function getLastBackup(storage = globalThis.localStorage) {
  try { return storage?.getItem(LAST_BACKUP_KEY) || null; } catch { return null; }
}
export function markBackedUp(storage = globalThis.localStorage) {
  try { storage?.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch { /* ignore */ }
}

export function exportJSON(state) {
  return JSON.stringify({ app: 'calorie-exercise-planner', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !('days' in data || 'profile' in data)) {
    throw new Error('This file does not look like a planner backup.');
  }
  delete data.app;
  delete data.exportedAt;
  return normalize(data);
}
