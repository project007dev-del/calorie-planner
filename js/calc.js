// All the maths, as pure functions (unit-tested in tests/calc.test.mjs).
import { planDayById, EXAMPLE_DAY } from './plan.js';
import { findFood } from './foods.js';
import { addDays, diffDays, weekStart, num, fmt, parseISO } from './util.js';

const KEYS = ['kcal', 'protein', 'carbs', 'fat'];
export const zero = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

/** Nutrition for `grams` of a food given its per-100 g values: value × grams / 100. */
export function scale(per100, grams) {
  const g = num(grams);
  const out = zero();
  if (!per100) return out;
  for (const k of KEYS) out[k] = (num(per100[k]) * g) / 100;
  return out;
}
export function add(a, b) {
  const out = zero();
  for (const k of KEYS) out[k] = (a?.[k] || 0) + (b?.[k] || 0);
  return out;
}
export const sum = (list) => list.reduce(add, zero());

/** Convert label values for one serving into per-100 g values. */
export function per100FromServing(servingGrams, values) {
  const g = num(servingGrams);
  if (!(g > 0)) throw new Error('Serving size must be more than 0 g');
  const out = zero();
  for (const k of KEYS) out[k] = (num(values?.[k]) * 100) / g;
  return out;
}
/** Calories implied by the macros (4/4/9) – used to sanity-check typed labels. */
export const macroKcal = (v) => num(v.protein) * 4 + num(v.carbs) * 4 + num(v.fat) * 9;

/** A food-log entry. Stores a snapshot of the values so history never changes. */
export function makeEntry(food, state, grams, meal, id) {
  const per100 = food?.[state];
  if (!per100) throw new Error(`${food?.name || 'Food'} has no ${state} values`);
  return { id, meal, foodId: food.id, name: food.name, state, grams: num(grams), per100: { ...per100 } };
}
export const entryNutrients = (e) => scale(e.per100, e.grams);

export function foodTotals(day, meal = null) {
  return sum((day?.food || []).filter((e) => !meal || e.meal === meal).map(entryNutrients));
}
export function suppTotals(day, supplements) {
  return sum((supplements || []).filter((s) => day?.supps?.[s.id]).map((s) => ({
    kcal: num(s.kcal), protein: num(s.protein), carbs: num(s.carbs), fat: num(s.fat),
  })));
}
export function dayIntake(day, supplements) {
  const food = foodTotals(day);
  const supps = suppTotals(day, supplements);
  return { food, supps, total: add(food, supps) };
}
export const hasFood = (day) => (day?.food?.length || 0) > 0;

export function buildExampleEntries(state, makeId) {
  return EXAMPLE_DAY.food.map((x) => makeEntry(findFood(state, x.foodId), x.state, x.grams, x.meal, makeId()));
}

// ---------- Workouts ----------

export function strengthStatus(day) {
  const w = day?.workout;
  const plan = planDayById(w?.planDayId);
  if (!plan || plan.type !== 'strength') return { plan, done: 0, total: 0, frac: 0, sets: 0 };
  const total = plan.exercises.length;
  const done = plan.exercises.filter((e) => w.exercises?.[e.id]?.done).length;
  const sets = plan.exercises.reduce(
    (n, e) => n + (w.exercises?.[e.id]?.sets || []).filter((s) => num(s.reps) > 0).length, 0);
  return { plan, done, total, frac: total ? done / total : 0, sets };
}
export function cardioStatus(day) {
  const c = day?.workout?.cardio;
  return { done: !!c?.done, minutes: c?.done ? num(c.minutes) : 0 };
}
export function hasWorkout(day) {
  const s = strengthStatus(day);
  return s.done > 0 || s.sets > 0 || cardioStatus(day).done;
}

/**
 * Estimated calories burned in a day.
 * base = everyday burn without planned exercise; workouts add the *extra* burn
 * above resting: (MET − 1) × body weight (kg) × hours. Strength burn is scaled
 * by how many of the day's exercises were ticked done.
 */
export function dayBurn(day, burn, weightKg) {
  const s = strengthStatus(day);
  const c = cardioStatus(day);
  const base = num(burn.baseKcal);
  const strength = Math.max(0, num(burn.strengthMet) - 1) * weightKg * (num(burn.strengthMinutes) / 60) * s.frac;
  const cardio = c.done ? Math.max(0, num(burn.jogMet) - 1) * weightKg * (c.minutes / 60) : 0;
  return { base, strength, cardio, total: base + strength + cardio };
}

// ---------- Body weight ----------

function entriesOf(state, field) {
  return Object.entries(state.days)
    .filter(([, d]) => num(d?.[field]) > 0)
    .map(([date, d]) => ({ date, kg: num(d[field]) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
export const weightEntries = (state) => entriesOf(state, 'weightKg');
export const waistEntries = (state) => entriesOf(state, 'waistCm');

/** Latest weigh-in on or before date, else the profile's starting weight. */
export function weightOn(state, date, entries = weightEntries(state)) {
  let w = null;
  for (const e of entries) {
    if (e.date <= date) w = e.kg;
    else break;
  }
  return w ?? (num(state.profile?.startWeightKg) || entries[0]?.kg || 70);
}
/** Average of the entries in the `window` days ending on endDate (null if none). */
export function avgInWindow(entries, endDate, window = 7) {
  const start = addDays(endDate, -(window - 1));
  const xs = entries.filter((e) => e.date >= start && e.date <= endDate);
  return xs.length ? xs.reduce((s, e) => s + e.kg, 0) / xs.length : null;
}
export const rollingAverage = (entries, window = 7) =>
  entries.map((e) => ({ date: e.date, kg: avgInWindow(entries, e.date, window) }));

export function currentWeight(state, today, entries = weightEntries(state)) {
  return avgInWindow(entries, today) ?? weightOn(state, today, entries);
}

// ---------- Energy balance & projection ----------

export function dayBalance(state, date, entries = weightEntries(state)) {
  const day = state.days[date];
  const intake = dayIntake(day, state.supplements);
  const burn = dayBurn(day, state.burn, weightOn(state, date, entries));
  const net = intake.total.kcal - burn.total;
  return { date, logged: hasFood(day), intake, burn, net, kg: net / (num(state.burn.kcalPerKg) || 7700) };
}

/**
 * Expected weight change from the last `windowDays` days that have food logged
 * (days without a food log are skipped, not treated as 0 kcal).
 */
export function projection(state, today, windowDays = 7) {
  const entries = weightEntries(state);
  const kcalPerKg = num(state.burn.kcalPerKg) || 7700;
  const logged = [];
  for (let i = 0; i < windowDays; i++) {
    const b = dayBalance(state, addDays(today, -i), entries);
    if (b.logged) logged.push(b);
  }
  const current = currentWeight(state, today, entries);
  const goal = num(state.profile.goalWeightKg);
  const res = { daysUsed: logged.length, windowDays, currentWeight: current, goalWeight: goal, remaining: current - goal };
  if (!logged.length) return { ...res, status: 'nodata' };

  const avg = (f) => logged.reduce((s, b) => s + f(b), 0) / logged.length;
  res.avgIntake = avg((b) => b.intake.total.kcal);
  res.avgBurn = avg((b) => b.burn.total);
  res.avgNet = res.avgIntake - res.avgBurn;
  res.kgPerDay = res.avgNet / kcalPerKg;
  res.kgPerWeek = res.kgPerDay * 7;

  if (!goal) return { ...res, status: 'nogoal' };
  if (Math.abs(res.remaining) < 0.1) return { ...res, status: 'reached' };
  const needLoss = res.remaining > 0;
  const towards = needLoss ? res.kgPerWeek < -0.005 : res.kgPerWeek > 0.005;
  if (!towards) return { ...res, status: 'away' };
  res.weeksToGoal = Math.abs(res.remaining / res.kgPerWeek);
  res.goalDate = addDays(today, Math.ceil(res.weeksToGoal * 7));
  return { ...res, status: 'on-track' };
}

/** Change in the scale's 7-day average vs the 7 days before (kg/week). */
export function scaleTrend(state, today) {
  const e = weightEntries(state);
  const now = avgInWindow(e, today);
  const prev = avgInWindow(e, addDays(today, -7));
  if (now == null || prev == null) return null;
  return { now, prev, kgPerWeek: now - prev };
}

/** The plan's adjustment rules. */
export function planAlerts(state, today) {
  const out = [];
  const trend = scaleTrend(state, today);
  if (trend && trend.kgPerWeek < -0.7) {
    out.push({ level: 'warn', text: `Your weekly average dropped ${fmt(-trend.kgPerWeek, 2)} kg – faster than 0.5–0.7 kg/week. If performance or recovery is suffering, add 100–200 kcal.` });
  }
  const w = weightEntries(state);
  const now = avgInWindow(w, today);
  const then = avgInWindow(w, addDays(today, -21));
  if (now != null && then != null && Math.abs(now - then) < 0.25) {
    const wa = waistEntries(state);
    const waistNow = avgInWindow(wa, today);
    const waistThen = avgInWindow(wa, addDays(today, -21));
    const waistMoving = waistNow != null && waistThen != null && waistNow < waistThen - 0.5;
    if (!waistMoving) out.push({ level: 'info', text: 'Weekly average weight and waist haven’t moved for 3 weeks. Check portion accuracy and activity first, then reduce by 100–150 kcal.' });
  }
  const p = projection(state, today);
  if (p.status !== 'nodata' && p.kgPerWeek < -0.75) {
    out.push({ level: 'warn', text: `Your logged intake implies losing about ${fmt(-p.kgPerWeek, 2)} kg/week. The plan aims for 0.25–0.5 kg/week so training and recovery stay steady.` });
  }
  if (p.status === 'away' && p.remaining > 0) {
    out.push({ level: 'info', text: 'Your average intake is at or above your estimated burn, so you are not losing weight at this rate.' });
  }
  return out;
}

export function bmrMifflin({ sex, age, heightCm, weightKg }) {
  return 10 * num(weightKg) + 6.25 * num(heightCm) - 5 * num(age) + (sex === 'female' ? -161 : 5);
}

/**
 * Everyday burn without planned workouts ≈ BMR × 1.4 (normal daily movement),
 * rounded to 10 kcal. Workouts are added on top when ticked done.
 */
export function suggestBaseKcal(profile, weightKg) {
  return Math.round((bmrMifflin({ ...profile, weightKg }) * 1.4) / 10) * 10;
}

// ---------- History helpers ----------

export function kcalStatus(kcal, target, tolerance = 0.05) {
  if (!target) return 'on';
  const r = kcal / target;
  return r < 1 - tolerance ? 'under' : r > 1 + tolerance ? 'over' : 'on';
}

export function foodHistory(state, { from = null, to = null } = {}) {
  return Object.keys(state.days)
    .filter((d) => hasFood(state.days[d]) && (!from || d >= from) && (!to || d <= to))
    .sort()
    .reverse()
    .map((date) => {
      const day = state.days[date];
      const intake = dayIntake(day, state.supplements);
      return { date, entries: day.food.length, total: intake.total, status: kcalStatus(intake.total.kcal, state.targets.kcal) };
    });
}

export function summarizeFoodDays(rows, targets) {
  if (!rows.length) return null;
  const avg = (k) => rows.reduce((s, r) => s + r.total[k], 0) / rows.length;
  return {
    days: rows.length,
    kcal: avg('kcal'), protein: avg('protein'), carbs: avg('carbs'), fat: avg('fat'),
    onTarget: rows.filter((r) => r.status === 'on').length,
    proteinHit: rows.filter((r) => r.total.protein >= num(targets.protein) - 10).length,
  };
}

/** Most recently logged distinct food+state combos, newest first. */
export function recentFoods(state, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const date of Object.keys(state.days).sort().reverse()) {
    const list = state.days[date].food || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      const key = `${e.foodId}|${e.state}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...e, date });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function foodUsage(state, foodId) {
  const rows = [];
  for (const date of Object.keys(state.days).sort().reverse()) {
    for (const e of state.days[date].food || []) {
      if (e.foodId === foodId) rows.push({ date, meal: e.meal, grams: e.grams, state: e.state, kcal: entryNutrients(e).kcal });
    }
  }
  return rows;
}

/** Consecutive days (ending today, or yesterday if today isn't done yet) matching predicate. */
export function streak(state, today, predicate) {
  let d = today;
  if (!predicate(state.days[d], d)) d = addDays(d, -1);
  let n = 0;
  while (n < 3660 && predicate(state.days[d], d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
export const suppTaken = (id) => (day) => !!day?.supps?.[id];

/** How many of the last `days` days (not counting days before you started) matched. */
export function adherence(state, today, predicate, days = 30) {
  const dates = Object.keys(state.days).sort();
  if (!dates.length) return { count: 0, days: 0 };
  const span = Math.min(days, Math.max(1, diffDays(dates[0], today) + 1));
  let count = 0;
  for (let i = 0; i < span; i++) {
    const d = addDays(today, -i);
    if (predicate(state.days[d], d)) count++;
  }
  return { count, days: span };
}

// ---------- Supplement schedules ----------
// schedule: { type: 'daily' } | { type: 'interval', every: N, start: ISO }
//         | { type: 'weekdays', days: [0-6] } | { type: 'asneeded' }
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TYPES = ['daily', 'interval', 'weekdays', 'asneeded'];

export function suppSchedule(s) {
  const sc = s?.schedule;
  if (sc && TYPES.includes(sc.type)) return sc;
  return s?.daily === false ? { type: 'asneeded' } : { type: 'daily' };
}
export const isScheduled = (s) => suppSchedule(s).type !== 'asneeded';
const intervalDays = (sc) => Math.max(1, Math.round(num(sc.every)) || 1);

/** Is the supplement due on this date according to its schedule? */
export function isDue(s, date) {
  const sc = suppSchedule(s);
  if (sc.type === 'daily') return true;
  if (sc.type === 'interval') {
    const diff = diffDays(sc.start || date, date);
    return diff >= 0 && diff % intervalDays(sc) === 0;
  }
  if (sc.type === 'weekdays') return (sc.days || []).includes(parseISO(date).getDay());
  return false;
}

/** First due date on or after fromDate (null for "only when needed"). */
export function nextDue(s, fromDate, maxDays = 400) {
  if (!isScheduled(s)) return null;
  for (let i = 0; i <= maxDays; i++) {
    const d = addDays(fromDate, i);
    if (isDue(s, d)) return d;
  }
  return null;
}

export function scheduleLabel(s) {
  const sc = suppSchedule(s);
  if (sc.type === 'daily') return 'Every day';
  if (sc.type === 'interval') {
    const n = intervalDays(sc);
    return n === 1 ? 'Every day' : n === 7 ? 'Once a week' : `Every ${n} days`;
  }
  if (sc.type === 'weekdays') {
    const days = [...new Set(sc.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // Monday first
    if (days.length === 7) return 'Every day';
    return days.length ? days.map((d) => WEEKDAY_SHORT[d]).join(', ') : 'No days chosen';
  }
  return 'Only when needed';
}

/**
 * Scheduled doses in a row, counting back from `today`. Days it isn't due are
 * skipped, and today doesn't break the streak until the day is over.
 */
export function suppStreak(state, s, today) {
  const sc = suppSchedule(s);
  if (!isScheduled(s) || (sc.type === 'weekdays' && !(sc.days || []).length)) return 0;
  const first = Object.keys(state.days).sort()[0];
  if (!first) return 0;
  let n = 0;
  for (let i = 0, d = today; i < 3660; i++, d = addDays(d, -1)) {
    if (d < first || (s.since && d < s.since) || (sc.type === 'interval' && sc.start && d < sc.start)) break;
    if (!isDue(s, d)) continue;
    if (state.days[d]?.supps?.[s.id]) n++;
    else if (d !== today) break;
  }
  return n;
}

/**
 * Over the last `days` days (not before tracking started): doses due, taken on
 * their due day, and extra doses on other days. Today only counts once taken.
 */
export function suppAdherence(state, s, today, days = 30) {
  const first = Object.keys(state.days).sort()[0];
  let start = addDays(today, -(days - 1));
  for (const floor of [first, s.since]) if (floor && floor > start) start = floor;
  if (!first || start > today) return { due: 0, taken: 0, extra: 0, days: 0 };
  const span = diffDays(start, today) + 1;
  let due = 0, taken = 0, extra = 0;
  for (let i = 0; i < span; i++) {
    const d = addDays(start, i);
    const took = !!state.days[d]?.supps?.[s.id];
    if (isDue(s, d)) {
      if (took) { due++; taken++; } else if (d !== today) due++;
    } else if (took) extra++;
  }
  return { due, taken, extra, days: span };
}

export const dueSupplements = (state, date) => state.supplements.filter((s) => isScheduled(s) && isDue(s, date));
/** True when at least one supplement was due on that date and all due ones were ticked. */
export function allDueTaken(state, date) {
  const due = dueSupplements(state, date);
  return due.length > 0 && due.every((s) => state.days[date]?.supps?.[s.id]);
}

export function workoutSessions(state) {
  return Object.keys(state.days)
    .filter((d) => hasWorkout(state.days[d]))
    .sort()
    .reverse()
    .map((date) => {
      const day = state.days[date];
      return { date, ...strengthStatus(day), cardio: cardioStatus(day), notes: day.workout?.notes || '' };
    });
}

export function weekSummary(state, anyDateInWeek) {
  const start = weekStart(anyDateInWeek);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const day = state.days[date];
    const s = strengthStatus(day);
    return { date, strength: s.done > 0, frac: s.frac, plan: s.plan, cardio: cardioStatus(day).done };
  });
  return {
    start,
    days,
    strength: days.filter((d) => d.strength).length,
    cardio: days.filter((d) => d.cardio).length,
  };
}

/** Consecutive weeks with at least `target` strength sessions. */
export function weeklyStreak(state, today, target = 5) {
  let ws = weekStart(today);
  const met = (w) => weekSummary(state, w).strength >= target;
  if (!met(ws)) ws = addDays(ws, -7);
  let n = 0;
  while (n < 520 && met(ws)) {
    n++;
    ws = addDays(ws, -7);
  }
  return n;
}

function bestSet(sets) {
  let best = null;
  for (const s of sets) {
    const kg = num(s.kg), reps = num(s.reps);
    if (!best || kg > best.kg || (kg === best.kg && reps > best.reps)) best = { kg, reps };
  }
  return best;
}

export function exerciseHistory(state, exId) {
  const rows = [];
  for (const date of Object.keys(state.days).sort().reverse()) {
    const log = state.days[date]?.workout?.exercises?.[exId];
    if (!log) continue;
    const sets = (log.sets || []).filter((s) => num(s.reps) > 0).map((s) => ({ kg: num(s.kg), reps: num(s.reps) }));
    if (!sets.length && !log.done) continue;
    const best = bestSet(sets);
    rows.push({ date, done: !!log.done, sets, best, topKg: best ? best.kg : null, volume: sets.reduce((v, s) => v + s.kg * s.reps, 0) });
  }
  return rows;
}

export function lastExerciseLog(state, exId, beforeDate) {
  return exerciseHistory(state, exId).find((r) => r.date < beforeDate && r.sets.length) || null;
}

/** Double progression from the plan. */
export function progressionHint(exercise, last) {
  if (!last || !last.sets?.length) return null;
  const unit = exercise.unit === 's' ? ' s' : ' reps';
  const enough = last.sets.length >= exercise.setsMin;
  const allTop = enough && last.sets.every((s) => num(s.reps) >= exercise.repsMax);
  if (allTop) {
    return {
      type: 'up',
      text: exercise.noWeight
        ? `All sets hit ${exercise.repsMax}${unit} – make it a bit harder (slower tempo or harder variation).`
        : `All sets hit ${exercise.repsMax}${unit} – add a little weight this session.`,
    };
  }
  if (last.sets.some((s) => num(s.reps) < exercise.repsMin)) {
    return { type: 'hold', text: `Some sets were under ${exercise.repsMin}${unit} – keep the weight and build back up.` };
  }
  return { type: 'same', text: `Same weight – aim for more ${exercise.unit === 's' ? 'time' : 'reps'} (top of range ${exercise.repsMax}${unit}).` };
}
