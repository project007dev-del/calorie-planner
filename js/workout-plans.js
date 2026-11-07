// Editable weekly routines. Logged sessions retain a snapshot of their plan.
import { WORKOUT_DAYS, allExercises, planDayById, planDayForDate } from './plan.js';
import { parseISO, isValidISO, addDays, weekStart, uid } from './util.js';

export const WEEKDAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];
export const EXERCISES = allExercises();
const clone = (value) => structuredClone(value);
const fullBody = (ids) => ids.map((id) => ({ ...clone(EXERCISES.find((e) => e.id === id)), setsMin: 2, setsMax: 3 }));
const session = (weekday, title, exercises) => ({ weekday, type: 'strength', short: WEEKDAYS.find(([d]) => d === weekday)[1].slice(0, 3), title, focus: 'Train with controlled form and 1–3 good reps in reserve', minutes: 45, exercises });
const rest = (weekday) => ({ weekday, type: 'rest', short: WEEKDAYS.find(([d]) => d === weekday)[1].slice(0, 3), title: 'Rest / gentle movement', focus: 'Recover at an easy pace', minutes: 0, exercises: [] });
const cardio = (weekday) => ({ ...rest(weekday), type: 'cardio', title: 'Easy jog / walk', focus: 'Conversational pace; build gradually', minutes: 30 });
const a = () => fullBody(['squat', 'pushup_chest_press', 'one_arm_db_row', 'rdl', 'plank']);
const b = () => fullBody(['lunge_leg_press', 'db_shoulder_press', 'lat_pulldown', 'hip_thrust', 'dead_bug']);
const week = (sessions) => WEEKDAYS.map(([d]) => clone(sessions.find((s) => s.weekday === d) || rest(d)));

export const WORKOUT_TEMPLATES = [
  { id: 'starter2', name: '2-day full body', tag: 'Start or return', description: 'Two separated full-body sessions, with room for recovery and easy walks.', days: week([session(1, 'Full body A', a()), session(4, 'Full body B', b()), cardio(6)]) },
  { id: 'balanced3', name: '3-day full body', tag: 'Steady routine', description: 'Alternate full-body sessions on Monday, Wednesday and Friday.', days: week([session(1, 'Full body A', a()), session(3, 'Full body B', b()), session(5, 'Full body A', a()), cardio(6)]) },
  { id: 'upperlower4', name: '4-day upper / lower', tag: 'More training days', description: 'Train upper and lower body twice each week, with a midweek recovery day.', days: week([
    session(1, 'Upper body A', fullBody(['bench_press', 'seated_row', 'db_shoulder_press', 'lat_pulldown', 'biceps_curl'])),
    session(2, 'Lower body A', fullBody(['squat', 'rdl', 'leg_curl', 'calf_raise', 'plank'])),
    session(4, 'Upper body B', fullBody(['incline_db_press', 'one_arm_db_row', 'lat_pulldown', 'lateral_raise', 'triceps_pushdown'])),
    session(5, 'Lower body B', fullBody(['hip_thrust', 'bulgarian_split_squat', 'leg_extension', 'calf_raise', 'dead_bug'])), cardio(6),
  ]) },
  { id: 'original5', name: '5-day gym split', tag: 'Existing routine', description: 'The original push, lower, pull, lower/core and full-body split. Choose it when you can recover and train consistently.', days: WORKOUT_DAYS.map((d) => ({ ...clone(d), minutes: d.type === 'strength' ? 60 : d.type === 'cardio' ? 30 : 0 })) },
];

export function recommendedTemplate(state, date) {
  const days = Number((date && workoutPlanSummary(state, date)?.strengthDays) ?? state.profile?.strengthDays ?? 3);
  return WORKOUT_TEMPLATES.find((p) => p.id === (days <= 2 ? 'starter2' : days === 3 ? 'balanced3' : days === 4 ? 'upperlower4' : 'original5'));
}

export function activeWorkoutPlan(state, date) {
  return (state.workoutPlans || []).reduce((best, p) => p.effectiveFrom <= date && (!best || p.effectiveFrom >= best.effectiveFrom) ? p : best, null);
}
export function scheduledWorkout(state, date) {
  return activeWorkoutPlan(state, date)?.days.find((d) => d.weekday === parseISO(date).getDay()) || planDayForDate(date);
}
export function loggedWorkoutPlan(day) {
  return day?.workout?.planSnapshot || planDayById(day?.workout?.planDayId);
}
export function workoutForDate(state, date) {
  return loggedWorkoutPlan(state.days[date]) || scheduledWorkout(state, date);
}
export function sessionOptions(state, date) {
  const days = activeWorkoutPlan(state, date)?.days || WORKOUT_DAYS;
  const logged = loggedWorkoutPlan(state.days[date]);
  return logged && !days.some((d) => d.id === logged.id) ? [logged, ...days] : days;
}
export function scheduledWeek(state, date) {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), ...scheduledWorkout(state, addDays(start, i)) }));
}
export function workoutPlanSummary(state, date) {
  const p = activeWorkoutPlan(state, date);
  if (!p) return null;
  return { strengthDays: p.days.filter((d) => d.type === 'strength').length, cardioMinutes: p.days.filter((d) => d.type === 'cardio').reduce((n, d) => n + d.minutes, 0), strengthMinutes: p.days.filter((d) => d.type === 'strength').reduce((n, d) => n + d.minutes, 0) };
}

/** Validate before changing saved plans; exercise IDs stay stable across routines. */
export function createWorkoutPlan(draft, id = `wp_${uid()}`) {
  const name = String(draft.name || '').trim();
  if (!name || name.length > 80) throw new Error('Give your plan a name (up to 80 characters).');
  if (!isValidISO(draft.effectiveFrom)) throw new Error('Choose a valid start date.');
  if (!Array.isArray(draft.days) || draft.days.length !== 7 || new Set(draft.days.map((d) => d.weekday)).size !== 7) throw new Error('Include each weekday once.');
  const days = WEEKDAYS.map(([weekday, label]) => {
    const d = draft.days.find((s) => s.weekday === weekday);
    if (!d || !['strength', 'cardio', 'rest'].includes(d.type)) throw new Error(`${label}: choose a session type.`);
    const title = String(d.title || '').trim();
    if (!title || title.length > 80) throw new Error(`${label}: give the session a name (up to 80 characters).`);
    const minutes = d.type === 'rest' ? 0 : Number(d.minutes);
    if (d.type !== 'rest' && (!Number.isInteger(minutes) || minutes < 5 || minutes > 180)) throw new Error(`${label}: enter 5–180 minutes.`);
    if (!Array.isArray(d.exercises) || (d.type === 'strength' && (d.exercises.length < 1 || d.exercises.length > 15))) throw new Error(`${label}: choose 1–15 exercises.`);
    const seen = new Set();
    const exercises = d.type === 'strength' ? d.exercises.map((e) => {
      const original = EXERCISES.find((x) => x.id === e.id);
      if (!original || seen.has(e.id)) throw new Error(`${label}: choose each exercise once from the library.`);
      seen.add(e.id);
      const sets = Number(e.setsMax), minSets = Number(e.setsMin ?? sets), lo = Number(e.repsMin), hi = Number(e.repsMax);
      if (![sets, minSets, lo, hi].every(Number.isInteger) || minSets < 1 || minSets > sets || sets > 8 || lo < 1 || hi < lo || hi > (original.unit === 's' ? 300 : 100)) throw new Error(`${label}: use 1–8 sets and a valid ${original.unit === 's' ? 'seconds' : 'rep'} range.`);
      return { ...clone(original), setsMin: minSets, setsMax: sets, repsMin: lo, repsMax: hi };
    }) : [];
    return { id: `${id}_${weekday}`, weekday, type: d.type, short: label.slice(0, 3), title, focus: d.type === 'strength' ? `${exercises.length} exercises · ${minutes} min` : d.type === 'cardio' ? 'Easy, conversational pace' : 'Recovery', minutes, exercises };
  });
  return { id, name, effectiveFrom: draft.effectiveFrom, templateId: String(draft.templateId || 'custom'), days };
}

export function normalizeWorkoutPlans(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    try {
      if (!p || !/^wp_[a-zA-Z0-9_-]{1,80}$/.test(p.id)) return null;
      return createWorkoutPlan(p, p.id);
    } catch { return null; }
  }).filter(Boolean);
}

export function normalizeWorkoutSnapshot(raw, id) {
  if (!raw || raw.id !== id || !WEEKDAYS.some(([d]) => d === raw.weekday)) return null;
  try {
    const minutes = raw.minutes ?? (raw.type === 'strength' ? 60 : raw.type === 'cardio' ? 30 : 0);
    const p = createWorkoutPlan({ name: 'Logged session', effectiveFrom: '2000-01-01', days: week([{ ...raw, minutes }]) }, 'wp_snapshot');
    const result = { ...p.days.find((d) => d.weekday === raw.weekday), id, short: String(raw.short || '').slice(0, 12), focus: String(raw.focus || '').slice(0, 160) };
    if (raw.minutes === undefined) delete result.minutes;
    return result;
  } catch { return null; }
}
