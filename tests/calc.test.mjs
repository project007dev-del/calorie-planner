import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  scale, per100FromServing, makeEntry, dayIntake, buildExampleEntries, dayBurn, dayBalance,
  projection, progressionHint, foodHistory, summarizeFoodDays, streak, suppTaken, weekSummary,
  exerciseHistory, lastExerciseLog, recentFoods, weightOn, scaleTrend, planAlerts, adherence, suggestBaseKcal,
} from '../js/calc.js';
import { defaultState, normalize, importJSON, exportJSON } from '../js/store.js';
import { findFood, customToFood } from '../js/foods.js';
import { WORKOUT_DAYS, proteinAdvice, profileComplete } from '../js/plan.js';
import { addDays, weekStart } from '../js/util.js';

const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
let n = 0;
const id = () => `e${++n}`;

test('150 g cooked chicken = 247.5 kcal / 46.5 g protein (plan worked example)', () => {
  const chicken = findFood(defaultState(), 'chicken_breast');
  const v = scale(chicken.cooked, 150);
  close(v.kcal, 247.5);
  close(v.protein, 46.5);
});

test('raw and cooked weights give different results', () => {
  const rice = findFood(defaultState(), 'brown_rice');
  close(scale(rice.raw, 100).kcal, 367);
  close(scale(rice.cooked, 100).kcal, 123);
  const chicken = findFood(defaultState(), 'chicken_breast');
  close(scale(chicken.raw, 150).kcal, 180);
});

test('custom food: per-serving label converts to per 100 g', () => {
  const per100 = per100FromServing(35, { kcal: 135, protein: 25, carbs: 4, fat: 2 });
  close(per100.kcal, 385.71);
  close(per100.protein, 71.43);
  assert.throws(() => per100FromServing(0, { kcal: 1 }));
  const food = customToFood({ id: 'c1', name: 'My powder', state: 'raw', per100, category: 'other' });
  assert.equal(food.cooked, null);
  close(scale(food.raw, 35).kcal, 135);
});

test('entries keep a snapshot so editing a food does not change history', () => {
  const s = defaultState();
  s.customFoods.push({ id: 'c2', name: 'Liempo', state: 'cooked', category: 'protein', per100: { kcal: 500, protein: 20, carbs: 0, fat: 45 } });
  const e = makeEntry(findFood(s, 'c2'), 'cooked', 100, 'lunch', id());
  s.customFoods[0].per100.kcal = 999;
  close(e.per100.kcal, 500);
  assert.throws(() => makeEntry(findFood(s, 'c2'), 'raw', 100, 'lunch', id()));
});

test('plan example day ≈ 1,940 kcal and ≈ 175 g protein', () => {
  const s = defaultState();
  const day = { food: buildExampleEntries(s, id), supps: { shake1: true } };
  const t = dayIntake(day, s.supplements).total;
  close(t.kcal, 1940, 2);
  close(t.protein, 175, 1);
  close(t.carbs, 177, 1.5);
  close(t.fat, 63, 1);
});

test('burn rises only when the workout is ticked done', () => {
  const s = defaultState();
  const rest = dayBurn({ food: [] }, s.burn, 80);
  assert.equal(rest.total, 2300);
  const exercises = Object.fromEntries(WORKOUT_DAYS[0].exercises.map((e) => [e.id, { done: true, sets: [] }]));
  const full = dayBurn({ workout: { planDayId: 'd1', exercises } }, s.burn, 80);
  close(full.strength, 200);
  const half = dayBurn({ workout: { planDayId: 'd1', exercises: { bench_press: { done: true } } } }, s.burn, 80);
  close(half.strength, 200 / 5);
  const jog = dayBurn({ workout: { planDayId: 'd6', cardio: { done: true, minutes: 30 } } }, s.burn, 80);
  close(jog.cardio, 240);
});

test('weekly average burn with the full plan (80 kg) lands at 2,450–2,500', () => {
  const s = defaultState();
  let total = 0;
  for (const d of WORKOUT_DAYS) {
    const exercises = Object.fromEntries(d.exercises.map((e) => [e.id, { done: true }]));
    const day = { workout: { planDayId: d.id, exercises, cardio: { done: d.id === 'd6', minutes: 30 } } };
    total += dayBurn(day, s.burn, 80).total;
  }
  const avg = total / 7;
  assert.ok(avg >= 2450 && avg <= 2500, `avg ${avg}`);
});

test('projection: 7 days at 1,900 kcal on rest days → about −0.36 kg/week and a goal date', () => {
  const s = defaultState();
  s.profile.goalWeightKg = 70;
  const today = '2026-11-05';
  for (let i = 0; i < 7; i++) {
    s.days[addDays(today, -i)] = { food: [{ id: id(), meal: 'lunch', foodId: 'x', name: 'x', state: 'raw', grams: 100, per100: { kcal: 1900, protein: 0, carbs: 0, fat: 0 } }], supps: {} };
  }
  s.days[today].weightKg = 80;
  const p = projection(s, today);
  assert.equal(p.status, 'on-track');
  assert.equal(p.daysUsed, 7);
  close(p.avgNet, -400);
  close(p.kgPerWeek, (-400 * 7) / 7700);
  close(p.weeksToGoal, 10 / ((400 * 7) / 7700));
  assert.equal(p.goalDate, addDays(today, Math.ceil(p.weeksToGoal * 7)));
});

test('projection skips days with no food and reports nodata/away', () => {
  const s = defaultState();
  assert.equal(projection(s, '2026-11-05').status, 'nodata');
  Object.assign(s.profile, { startWeightKg: 80, goalWeightKg: 70 });
  s.days['2026-11-05'] = { food: [{ id: id(), meal: 'lunch', foodId: 'x', name: 'x', state: 'raw', grams: 100, per100: { kcal: 3000, protein: 0, carbs: 0, fat: 0 } }], supps: {} };
  const p = projection(s, '2026-11-05');
  assert.equal(p.daysUsed, 1);
  assert.equal(p.status, 'away');
  assert.ok(p.kgPerWeek > 0);
});

test('weightOn falls back to profile start weight before the first weigh-in', () => {
  const s = defaultState();
  s.days['2026-11-03'] = { food: [], supps: {}, weightKg: 72 };
  assert.equal(weightOn(s, '2026-11-01'), 72); // no stats entered yet → first weigh-in
  s.profile.startWeightKg = 80;
  assert.equal(weightOn(s, '2026-11-01'), 80);
  assert.equal(weightOn(s, '2026-11-04'), 72);
});

test('scale trend + fast-loss alert', () => {
  const s = defaultState();
  const today = '2026-11-14';
  for (let i = 0; i < 14; i++) s.days[addDays(today, -i)] = { food: [], supps: {}, weightKg: i < 7 ? 71 : 72 };
  const t = scaleTrend(s, today);
  close(t.kgPerWeek, -1);
  assert.ok(planAlerts(s, today).some((a) => a.text.includes('add 100–200 kcal')));
});

test('progression hint follows double progression', () => {
  const bench = WORKOUT_DAYS[0].exercises[0]; // 3 x 6-12
  assert.equal(progressionHint(bench, { sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 12 }, { kg: 40, reps: 12 }] }).type, 'up');
  assert.equal(progressionHint(bench, { sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 11 }, { kg: 40, reps: 10 }] }).type, 'same');
  assert.equal(progressionHint(bench, { sets: [{ kg: 42, reps: 5 }] }).type, 'hold');
  assert.equal(progressionHint(bench, null), null);
});

test('exercise history and last log', () => {
  const s = defaultState();
  s.days['2026-11-02'] = { food: [], supps: {}, workout: { planDayId: 'd1', exercises: { bench_press: { done: true, sets: [{ kg: '40', reps: '10' }, { kg: '42.5', reps: '8' }, { kg: '', reps: '' }] } } } };
  s.days['2026-11-09'] = { food: [], supps: {}, workout: { planDayId: 'd1', exercises: { bench_press: { done: false, sets: [{ kg: '42.5', reps: '9' }] } } } };
  const h = exerciseHistory(s, 'bench_press');
  assert.equal(h.length, 2);
  assert.equal(h[1].sets.length, 2);
  assert.deepEqual(h[1].best, { kg: 42.5, reps: 8 });
  assert.equal(lastExerciseLog(s, 'bench_press', '2026-11-09').date, '2026-11-02');
});

test('food history, summary and recent foods', () => {
  const s = defaultState();
  const chicken = findFood(s, 'chicken_breast');
  s.days['2026-11-01'] = { food: [makeEntry(chicken, 'cooked', 1150, 'lunch', id())], supps: {} }; // 1,897.5 kcal → on target
  s.days['2026-11-02'] = { food: [makeEntry(chicken, 'raw', 100, 'lunch', id())], supps: {} };    // 120 kcal → under
  s.days['2026-11-03'] = { food: [], supps: {} };
  const rows = foodHistory(s);
  assert.deepEqual(rows.map((r) => r.date), ['2026-11-02', '2026-11-01']);
  assert.equal(rows[0].status, 'under');
  assert.equal(rows[1].status, 'on');
  const sum = summarizeFoodDays(rows, s.targets);
  assert.equal(sum.days, 2);
  assert.equal(sum.onTarget, 1);
  assert.equal(foodHistory(s, { from: '2026-11-02' }).length, 1);
  const recent = recentFoods(s);
  assert.deepEqual(recent.map((r) => r.state), ['raw', 'cooked']);
});

test('supplement streak and adherence', () => {
  const s = defaultState();
  const today = '2026-11-05';
  for (let i = 1; i <= 4; i++) s.days[addDays(today, -i)] = { food: [], supps: { creatine: true } };
  s.days[addDays(today, -6)] = { food: [], supps: { creatine: true } };
  assert.equal(streak(s, today, suppTaken('creatine')), 4);   // today not ticked yet → counts from yesterday
  s.days[today] = { food: [], supps: { creatine: true } };
  assert.equal(streak(s, today, suppTaken('creatine')), 5);
  const a = adherence(s, today, suppTaken('creatine'), 30);
  assert.deepEqual(a, { count: 6, days: 7 });
});

test('week summary counts strength sessions and jogs', () => {
  const s = defaultState();
  const mon = weekStart('2026-11-05');
  s.days[mon] = { food: [], supps: {}, workout: { planDayId: 'd1', exercises: { bench_press: { done: true } } } };
  s.days[addDays(mon, 5)] = { food: [], supps: {}, workout: { planDayId: 'd6', cardio: { done: true, minutes: 25 } } };
  const w = weekSummary(s, '2026-11-05');
  assert.equal(w.strength, 1);
  assert.equal(w.cardio, 1);
});

test('dayBalance uses intake minus burn', () => {
  const s = defaultState();
  s.days['2026-11-05'] = { food: [], supps: { shake1: true } };
  const b = dayBalance(s, '2026-11-05');
  close(b.net, 135 - 2300);
  assert.equal(b.logged, false);
});

test('protein backup rule', () => {
  assert.equal(proteinAdvice(140, 145, false).level, 'ok');
  assert.match(proteinAdvice(125, 145, false).text, /2nd shake/);
  assert.match(proteinAdvice(100, 145, false).text, /food portion/);
});

test('backup export/import round-trip and bad data is cleaned', () => {
  const s = defaultState();
  s.days['2026-11-05'] = { food: [], supps: { creatine: true }, weightKg: 72.4 };
  s.days['not-a-date'] = { food: [] };
  const back = importJSON(exportJSON(s));
  assert.equal(back.days['2026-11-05'].weightKg, 72.4);
  assert.equal(back.days['not-a-date'], undefined);
  assert.throws(() => importJSON('{"hello":1}'));
  assert.equal(normalize(null).targets.kcal, 1900);
});

test('no personal stats are built in; profile setup is detected', () => {
  const s = defaultState();
  assert.equal(s.profile.startWeightKg, null);
  assert.equal(s.profile.goalWeightKg, null);
  assert.equal(profileComplete(s.profile), false);
  Object.assign(s.profile, { sex: 'male', age: 30, heightCm: 180, startWeightKg: 80, goalWeightKg: 75 });
  assert.equal(profileComplete(s.profile), true);
  assert.equal(projection(s, '2026-11-05').status, 'nodata');
});

test('everyday burn suggestion = Mifflin-St Jeor BMR × 1.4', () => {
  // male, 30 y, 180 cm, 80 kg → BMR 1,780 → ×1.4 = 2,492 → 2,490
  assert.equal(suggestBaseKcal({ sex: 'male', age: 30, heightCm: 180 }, 80), 2490);
  // female, 40 y, 160 cm, 60 kg → BMR 1,239 → ×1.4 = 1,734.6 → 1,730
  assert.equal(suggestBaseKcal({ sex: 'female', age: 40, heightCm: 160 }, 60), 1730);
});

// ---------- Supplement schedules, migration, portions ----------
import { isDue, nextDue, scheduleLabel, suppStreak, suppAdherence, allDueTaken } from '../js/calc.js';
import { mealForHour } from '../js/plan.js';
import { portionChips } from '../js/foods.js';

test('supplement schedules: every N days, weekdays, as needed', () => {
  const every2 = { id: 'd', schedule: { type: 'interval', every: 2, start: '2026-11-02' } };
  assert.equal(isDue(every2, '2026-11-02'), true);
  assert.equal(isDue(every2, '2026-11-03'), false);
  assert.equal(isDue(every2, '2026-11-04'), true);
  assert.equal(isDue(every2, '2026-11-01'), false); // before it starts
  assert.equal(nextDue(every2, '2026-11-05'), '2026-11-06');
  const mwf = { id: 'm', schedule: { type: 'weekdays', days: [5, 1, 3] } }; // 2026-11-02 is a Monday
  assert.equal(isDue(mwf, '2026-11-02'), true);
  assert.equal(isDue(mwf, '2026-11-03'), false);
  assert.equal(scheduleLabel(mwf), 'Mon, Wed, Fri');
  assert.equal(scheduleLabel(every2), 'Every 2 days');
  assert.equal(scheduleLabel({ schedule: { type: 'interval', every: 7, start: '2026-11-02' } }), 'Once a week');
  assert.equal(scheduleLabel({ schedule: { type: 'asneeded' } }), 'Only when needed');
  assert.equal(nextDue({ schedule: { type: 'asneeded' } }, '2026-11-05'), null);
  assert.equal(isDue({ name: 'old style', daily: true }, '2026-11-05'), true);
});

test('streak skips days a supplement is not due and waits for today', () => {
  const s = defaultState();
  const sup = { id: 'vitd', name: 'Vitamin D', schedule: { type: 'interval', every: 2, start: '2026-10-27' } };
  s.supplements.push(sup);
  // due on Oct 27, 29, 31, Nov 2, 4, 6 – Oct 27 was missed
  s.days['2026-10-27'] = { food: [], supps: {} };
  for (const d of ['2026-10-29', '2026-10-31', '2026-11-02', '2026-11-04']) s.days[d] = { food: [], supps: { vitd: true } };
  assert.equal(suppStreak(s, sup, '2026-11-06'), 4); // due today but not taken yet: not a break
  s.days['2026-11-06'] = { food: [], supps: { vitd: true } };
  assert.equal(suppStreak(s, sup, '2026-11-06'), 5);
  assert.deepEqual(suppAdherence(s, sup, '2026-11-06', 30), { due: 6, taken: 5, extra: 0, days: 11 });
  // as needed: no streak, only a count
  const backup = s.supplements.find((x) => x.id === 'shake2');
  s.days['2026-11-04'].supps.shake2 = true;
  assert.equal(suppStreak(s, backup, '2026-11-06'), 0);
  assert.equal(suppAdherence(s, backup, '2026-11-06', 30).extra, 1);
});

test('a newly added supplement is not counted as missed before it was added', () => {
  const s = defaultState();
  s.days['2026-10-01'] = { food: [], supps: {} };
  const sup = { id: 'fish', name: 'Fish oil', schedule: { type: 'daily' }, since: '2026-11-05' };
  s.days['2026-11-05'] = { food: [], supps: { fish: true } };
  assert.deepEqual(suppAdherence(s, sup, '2026-11-06', 30), { due: 1, taken: 1, extra: 0, days: 2 });
  assert.equal(suppStreak(s, sup, '2026-11-06'), 1);
});

test('calendar mark needs every supplement due that day', () => {
  const s = defaultState(); // creatine, shake, Centrum daily; 2nd shake as needed
  s.days['2026-11-05'] = { food: [], supps: { creatine: true, shake1: true } };
  assert.equal(allDueTaken(s, '2026-11-05'), false);
  s.days['2026-11-05'].supps.centrum = true;
  assert.equal(allDueTaken(s, '2026-11-05'), true);
});

test('older saved data migrates: daily flags → schedules, unknown meals stay visible', () => {
  const s = normalize({
    supplements: [{ id: 'a', name: 'A', daily: true }, { id: 'b', name: 'B', daily: false }, { name: '' }, null],
    days: { '2026-11-05': { food: [{ id: 'x', meal: 'brunch', grams: 100, per100: { kcal: 100, protein: 0, carbs: 0, fat: 0 } }, null], supps: {} } },
  });
  assert.deepEqual(s.supplements.map((x) => x.schedule.type), ['daily', 'asneeded']);
  assert.equal('daily' in s.supplements[0], false);
  assert.equal(s.days['2026-11-05'].food.length, 1);
  assert.equal(s.days['2026-11-05'].food[0].meal, 'snack');
});

test('meal is suggested from the time of day', () => {
  assert.equal(mealForHour(7), 'breakfast');
  assert.equal(mealForHour(12), 'lunch');
  assert.equal(mealForHour(16), 'snack');
  assert.equal(mealForHour(20), 'dinner');
});

test('portion shortcuts follow raw/cooked and custom serving sizes', () => {
  const st = defaultState();
  const rice = findFood(st, 'white_rice');
  assert.deepEqual(portionChips(rice, 'cooked').slice(0, 2), [{ grams: 158, label: '1 cup' }, { grams: 316, label: '2 cups' }]);
  assert.equal(portionChips(rice, 'raw')[0].grams, 185);
  assert.equal(portionChips(findFood(st, 'egg_whole'), 'cooked')[1].label, '2 eggs');
  assert.equal(portionChips(findFood(st, 'chicken_breast'), 'cooked').length, 0);
  st.customFoods.push({ id: 'c9', name: 'Powder', state: 'raw', per100: { kcal: 380, protein: 70, carbs: 10, fat: 5 }, serving: { grams: 35 } });
  assert.deepEqual(portionChips(findFood(st, 'c9'), 'raw')[1], { grams: 70, label: '2 servings' });
});
