// Defaults taken from "Lean Muscle & Fat-Loss Plan · 1,900 kcal · 5-day split".
// Everything here can be changed in Settings; this file is only the starting point.
import { parseISO } from './util.js';

export const APP_VERSION = '1.7.0';

// Personal stats start blank: the app asks for them on first launch and keeps
// them only on the device (nothing personal is stored in the code).
export const DEFAULT_PROFILE = {
  name: '',
  age: null,
  sex: null,
  heightCm: null,
  startWeightKg: null,
  goalWeightKg: null,        // a checkpoint, not a final number
  startWaistCm: null,
  waistGoalCm: null,         // tip: under half your height
  activity: 'Moderately active',
  activityLevel: 'light', // everyday movement only; planned workouts are added separately
  goalMode: 'auto',
  bulkIntensity: 'light',
  dietStyle: 'auto',
  nutritionContext: 'general',
  strengthDays: 5,
  cardioMinutes: 30,
};

/** True once the stats the calculations need have been entered. */
export function profileComplete(p) {
  return !!p && (p.sex === 'male' || p.sex === 'female') &&
    [p.age, p.heightCm, p.startWeightKg, p.goalWeightKg].every((v) => Number(v) > 0);
}

export const DEFAULT_TARGETS = { kcal: 1900, protein: 145, carbs: 205, fat: 55 };

// Calorie burn model. Base = everyday burn without planned workouts.
// With all 5 strength days + 1 jog done the weekly average is ~2,460 kcal,
// which matches the plan's estimated maintenance of 2,450–2,500 kcal.
export const DEFAULT_BURN = {
  baseKcal: 2300,
  strengthMet: 3.5,       // resistance training, moderate effort
  strengthMinutes: 60,
  jogMet: 7,              // easy jog
  kcalPerKg: 7700,        // ~7,700 kcal ≈ 1 kg of body weight
};

// schedule: { type: 'daily' } | { type: 'interval', every: N, start: 'YYYY-MM-DD' }
//         | { type: 'weekdays', days: [0-6] (0 = Sunday) } | { type: 'asneeded' }
export const DEFAULT_SUPPLEMENTS = [
  { id: 'creatine', name: 'Creatine monohydrate', dose: '3 g daily, including rest days', schedule: { type: 'daily' }, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { id: 'shake1', name: 'Protein shake', dose: '35 g powder (1 serving) ≈ 25 g protein', schedule: { type: 'daily' }, kcal: 135, protein: 25, carbs: 4, fat: 2 },
  { id: 'centrum', name: 'Centrum Advance', dose: 'As per label – don’t exceed', schedule: { type: 'daily' }, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { id: 'shake2', name: '2nd protein shake (backup)', dose: 'Only if short on protein – max 2 shakes/day', schedule: { type: 'asneeded' }, kcal: 135, protein: 25, carbs: 4, fat: 2 },
];

/** Which meal to suggest when adding food at a given hour (0–23). */
export function mealForHour(hour) {
  if (hour < 10.5) return 'breakfast';
  if (hour < 14.5) return 'lunch';
  if (hour < 17.5) return 'snack';
  return 'dinner';
}
export const mealForNow = (d = new Date()) => mealForHour(d.getHours() + d.getMinutes() / 60);

export const MEALS = [
  { id: 'breakfast', name: 'Breakfast', hint: 'Aim for 25–35 g protein' },
  { id: 'lunch', name: 'Lunch', hint: 'Aim for 40–50 g protein' },
  { id: 'snack', name: 'Snack', hint: 'Shake is counted from Supplements' },
  { id: 'dinner', name: 'Dinner', hint: 'Protein + plenty of vegetables' },
];

/** The plan's full example day (≈1,940 kcal / 175 g protein). Shake is ticked as a supplement. */
export const EXAMPLE_DAY = {
  food: [
    { meal: 'breakfast', foodId: 'egg_whole', state: 'cooked', grams: 100 },
    { meal: 'breakfast', foodId: 'tofu_firm', state: 'cooked', grams: 100 },
    { meal: 'breakfast', foodId: 'oats', state: 'raw', grams: 40 },
    { meal: 'breakfast', foodId: 'banana', state: 'raw', grams: 100 },
    { meal: 'lunch', foodId: 'chicken_breast', state: 'cooked', grams: 150 },
    { meal: 'lunch', foodId: 'brown_rice', state: 'cooked', grams: 180 },
    { meal: 'lunch', foodId: 'mixed_veg', state: 'cooked', grams: 150 },
    { meal: 'lunch', foodId: 'oil', state: 'raw', grams: 5 },
    { meal: 'snack', foodId: 'banana', state: 'raw', grams: 100 },
    { meal: 'snack', foodId: 'peanuts', state: 'cooked', grams: 15 },
    { meal: 'dinner', foodId: 'chicken_breast', state: 'cooked', grams: 100 },
    { meal: 'dinner', foodId: 'tofu_firm', state: 'cooked', grams: 100 },
    { meal: 'dinner', foodId: 'mixed_veg', state: 'cooked', grams: 200 },
    { meal: 'dinner', foodId: 'brown_rice', state: 'cooked', grams: 100 },
    { meal: 'dinner', foodId: 'oil', state: 'raw', grams: 5 },
  ],
  supplements: ['shake1'],
};

const EFFORT = 'Stop each set with 1–3 good reps left in the tank. When you hit the top of the rep range on every set with good form, add a little weight next session.';
const WARMUP = 'Warm up 5–10 min (brisk walk, bike or light jog), a few bodyweight reps of the first movement, then 1–3 lighter sets before exercise 1.';

const ex = (id, name, setsMin, setsMax, repsMin, repsMax, rest, extra = {}) =>
  ({ id, name, setsMin, setsMax, repsMin, repsMax, rest, unit: 'reps', ...extra });

export const WORKOUT_DAYS = [
  {
    id: 'd1', weekday: 1, type: 'strength', short: 'Day 1', title: 'Upper body – push',
    focus: 'Chest, shoulders, triceps',
    exercises: [
      ex('bench_press', 'Barbell bench press', 3, 3, 6, 12, '2–3 min', { swap: 'Push-ups (see Day 5)', tip: 'Feet planted, shoulder blades squeezed back and down. Lower the bar to mid-chest with elbows angled in from your body, then press up.' }),
      ex('incline_db_press', 'Incline dumbbell press', 3, 3, 8, 12, '1½–2 min', { tip: 'Low bench incline. Lower the dumbbells to upper-chest level, press up until arms are straight but not locked.' }),
      ex('db_shoulder_press', 'Dumbbell shoulder press', 3, 3, 8, 12, '1½–2 min', { swap: 'Seated version for more stability', tip: 'Brace your abs and squeeze your glutes so your lower back doesn’t arch. Press from shoulder height until biceps are beside your ears.' }),
      ex('lateral_raise', 'Lateral raise', 2, 3, 12, 20, '1 min', { tip: 'Soft bend in the elbows, raise out to the sides to shoulder height. Light weight, no swinging, lower slowly.' }),
      ex('triceps_pushdown', 'Triceps pushdown', 2, 3, 10, 15, '1 min', { swap: 'Overhead extension (see Day 5)', tip: 'Elbows pinned to your sides so only your forearms move. Fully straighten at the bottom, control the way up.' }),
    ],
  },
  {
    id: 'd2', weekday: 2, type: 'strength', short: 'Day 2', title: 'Lower body',
    focus: 'Quads, hamstrings, glutes, calves',
    exercises: [
      ex('squat', 'Squat or goblet squat', 3, 3, 6, 12, '2–3 min', { tip: 'Feet shoulder-width, toes slightly out. Sit your hips down between your heels with knees tracking over toes; drive up through mid-foot.' }),
      ex('rdl', 'Romanian deadlift', 3, 3, 8, 12, '2–3 min', { tip: 'Soft knees. Push your hips back with the bar close to your legs and back flat. Lower to a hamstring stretch (usually mid-shin), squeeze glutes to stand.' }),
      ex('leg_press', 'Leg press', 3, 3, 8, 12, '1½–2 min', { swap: 'Split squat (see Day 4)', tip: 'Feet shoulder-width in the middle of the plate. Lower until knees reach about 90° without your lower back lifting; don’t lock out hard.' }),
      ex('leg_curl', 'Leg curl', 2, 3, 10, 15, '1 min', { tip: 'Hips pressed into the pad. Curl heels toward glutes, pause, lower slowly.' }),
      ex('calf_raise', 'Calf raise', 3, 3, 10, 20, '1 min', { tip: 'Balls of your feet on a step edge, hold support. Full stretch at the bottom, rise as high as you can, pause 1 second.' }),
    ],
  },
  {
    id: 'd3', weekday: 3, type: 'strength', short: 'Day 3', title: 'Upper body – pull',
    focus: 'Back, rear delts, biceps',
    exercises: [
      ex('lat_pulldown', 'Lat pulldown', 3, 3, 8, 12, '2 min', { swap: 'Assisted pull-up', tip: 'Thighs locked under the pad, slight lean back. Pull the bar to your upper chest by driving elbows down; don’t yank with your lower back.' }),
      ex('seated_row', 'Seated cable row', 3, 3, 8, 12, '1½–2 min', { swap: 'One-arm dumbbell row (see Day 5)', tip: 'Sit tall, pull the handle to your stomach squeezing shoulder blades together. Let arms extend fully without rounding your lower back.' }),
      ex('face_pull', 'Face pull', 2, 3, 12, 20, '1 min', { swap: 'Rear-delt fly', tip: 'Rope at upper-chest to face height. Pull toward your face with elbows high, finishing with hands beside your ears.' }),
      ex('biceps_curl', 'Biceps curl', 3, 3, 10, 15, '1 min', { tip: 'Elbows stay at your sides, no swinging. Squeeze at the top and lower slowly.' }),
      ex('back_extension', 'Back extension', 2, 2, 10, 15, '1 min', { tip: 'Pad just below your hip bones. Hinge at the hips and rise to a straight line; don’t over-arch at the top.' }),
    ],
  },
  {
    id: 'd4', weekday: 4, type: 'strength', short: 'Day 4', title: 'Lower body + core',
    focus: 'Glutes, single-leg strength, abs',
    exercises: [
      ex('hip_thrust', 'Hip thrust', 3, 3, 6, 10, '2–3 min', { swap: 'Deadlift variation (RDL on Day 2, or trap-bar)', tip: 'Upper back on the bench edge, feet flat, bar padded over hips. Drive hips up until shoulders-to-knees is straight, chin tucked, squeeze 1 second.' }),
      ex('bulgarian_split_squat', 'Bulgarian split squat', 3, 3, 8, 12, '1½–2 min', { perSide: 'leg', tip: 'Rear foot laces-down on the bench, front foot far enough forward to stay balanced. Lower until the rear knee is near the floor; push through the front heel.' }),
      ex('leg_extension', 'Leg extension', 2, 3, 10, 15, '1 min', { tip: 'Line your knee up with the machine’s pivot. Straighten fully, squeeze quads 1 second, lower slowly.' }),
      ex('plank', 'Plank', 3, 3, 20, 60, '1 min', { unit: 's', noWeight: true, tip: 'Elbows under shoulders, straight line head to heels. Squeeze glutes, brace abs; end the set when hips start to sag.' }),
      ex('dead_bug', 'Dead bug', 2, 3, 10, 15, '1 min', { noWeight: true, swap: 'Reverse crunch', tip: 'Lower back pressed into the floor the whole time. Slowly extend opposite arm and leg while exhaling, return, switch sides.' }),
    ],
  },
  {
    id: 'd5', weekday: 5, type: 'strength', short: 'Day 5', title: 'Full body',
    focus: 'Accessories · lighter volume to finish the week',
    exercises: [
      ex('pushup_chest_press', 'Push-ups or chest press', 2, 3, 8, 12, '1½ min', { tip: 'Hands slightly wider than shoulders, body straight like a plank. Lower chest close to the floor. Hands on a bench makes it easier.' }),
      ex('one_arm_db_row', 'One-arm dumbbell row', 2, 3, 8, 12, '1½ min', { perSide: 'arm', swap: 'Any row variation', tip: 'Hand and knee on the bench, back flat. Pull the dumbbell toward your hip, elbow close to your body.' }),
      ex('lunge_leg_press', 'Lunges or leg press', 2, 3, 10, 12, '1½ min', { swap: 'Leg press (see Day 2)', tip: 'Step forward and lower until both knees are about 90°. Front knee over mid-foot, push back up through the front heel.' }),
      ex('lateral_raise', 'Lateral raise', 2, 2, 12, 20, '1 min', { tip: 'Same technique as Day 1: soft elbows, raise to shoulder height, control the lowering.' }),
      ex('arms_superset', 'Arms superset: curl + triceps', 2, 2, 10, 15, '60–90 s', { perSide: 'each', tip: '1 set of biceps curls, then straight into overhead triceps extensions. Rest after the pair. Keep elbows pointing up and close to your head.' }),
    ],
  },
  {
    id: 'd6', weekday: 6, type: 'cardio', short: 'Sat', title: 'Easy jog / walk',
    focus: 'Easy, conversational pace · 20–40 min',
    exercises: [],
  },
  {
    id: 'd7', weekday: 0, type: 'rest', short: 'Sun', title: 'Rest or easy jog',
    focus: 'Recover · keep at least one day fully restful or very light',
    exercises: [],
  },
];

export const JOG_STAGES = [
  { name: 'Stage 1 · New to jogging', text: 'Alternate 1–2 min jogging with 2–3 min walking for 20–30 minutes total.' },
  { name: 'Stage 2 · Comfortable', text: '20–30 minutes of continuous easy jogging.' },
  { name: 'Stage 3 · Recovering well', text: 'Build gradually toward 30–40 minutes. Only progress if your legs feel fresh for lifting days.' },
];

export const TRAINING_NOTES = { effort: EFFORT, warmup: WARMUP };

export const planDayById = (id) => WORKOUT_DAYS.find((d) => d.id === id) || null;
export const planDayForDate = (iso) => WORKOUT_DAYS.find((d) => d.weekday === parseISO(iso).getDay());

/** Unique exercises across all days (lateral raise appears on Day 1 and Day 5). */
export function allExercises() {
  const seen = new Map();
  for (const day of WORKOUT_DAYS) for (const e of day.exercises) if (!seen.has(e.id)) seen.set(e.id, { ...e, dayIds: [day.id] });
  else seen.get(e.id).dayIds.push(day.id);
  return [...seen.values()];
}

/** The plan's protein backup rule (check your total by early evening). */
export function proteinAdvice(eatenProtein, target, shake2Taken) {
  const short = target - eatenProtein;
  if (short <= 0) return { level: 'ok', text: 'Protein target reached.' };
  if (short <= 10) return { level: 'ok', text: `Short by ${Math.round(short)} g – no action needed, you’re above the 1.6 g/kg minimum.` };
  if (short <= 30) return shake2Taken
    ? { level: 'warn', text: `Still short by ${Math.round(short)} g – add a food portion (e.g. +50 g chicken ≈ 15.5 g).` }
    : { level: 'warn', text: `Short by ${Math.round(short)} g – add the 2nd shake (+25 g) and swap out ~135 kcal elsewhere.` };
  return { level: 'warn', text: `Short by ${Math.round(short)} g – have the 2nd shake and add a food portion (e.g. +50 g chicken or +100 g tofu). Don’t add a 3rd shake.` };
}
