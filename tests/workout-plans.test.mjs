import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, exportJSON, importJSON, normalize } from '../js/store.js';
import { WORKOUT_DAYS } from '../js/plan.js';
import { WORKOUT_TEMPLATES, createWorkoutPlan, workoutForDate, scheduledWorkout, activeWorkoutPlan, scheduledWeek, workoutPlanSummary, sessionOptions } from '../js/workout-plans.js';
import { completeWorkout, strengthStatus, dayBurn, workoutSessions, weeklyStreak } from '../js/calc.js';
import { dailyRecommendation } from '../js/recommendations.js';

function plan(template = 0, effectiveFrom = '2026-11-09', id = 'wp_test') {
  const p = WORKOUT_TEMPLATES[template];
  return createWorkoutPlan({ name: p.name, templateId: p.id, days: structuredClone(p.days), effectiveFrom }, id);
}
test('old state keeps the original split; all templates cover seven valid weekdays', () => {
  const state = defaultState();
  assert.equal(workoutForDate(state, '2026-11-09').id, 'd1');
  assert.deepEqual(normalize({ profile: {}, days: {} }).workoutPlans, []);
  for (let i = 0; i < WORKOUT_TEMPLATES.length; i++) {
    const p = plan(i);
    assert.equal(p.days.length, 7);
    assert.equal(new Set(p.days.map((d) => d.id)).size, 7);
    assert.equal(p.days.filter((d) => d.type === 'strength').length, [2, 3, 4, 5][i]);
    assert.ok(p.days.some((d) => d.type === 'rest'));
  }
});
test('dated revisions apply to the correct week and the latest same-day revision wins', () => {
  const state = defaultState();
  const original = plan(0), later = plan(2, '2026-11-16', 'wp_later');
  state.workoutPlans = [later, original];
  assert.equal(activeWorkoutPlan(state, '2026-11-08'), null);
  assert.equal(scheduledWorkout(state, '2026-11-11').type, 'rest');
  assert.equal(activeWorkoutPlan(state, '2026-11-16').id, later.id);
  const revised = plan(1, '2026-11-09', 'wp_revised');
  state.workoutPlans.push(revised);
  assert.equal(activeWorkoutPlan(state, '2026-11-10').id, revised.id);
  assert.equal(scheduledWeek(state, '2026-11-11').filter((d) => d.type === 'strength').length, 3);
});
test('plan changes preserve logged exercise lists, completion, duration and history after backup import', () => {
  const state = defaultState();
  const old = plan(); state.workoutPlans = [old];
  const monday = old.days.find((d) => d.weekday === 1);
  const workout = completeWorkout(null, monday);
  workout.exercises.squat.sets.push({ kg: 40, reps: 10 });
  state.days['2026-11-09'] = { food: [], supps: {}, workout };
  state.workoutPlans.push(plan(2, '2026-11-09', 'wp_updated'));
  const restored = importJSON(exportJSON(state));
  assert.equal(workoutForDate(restored, '2026-11-09').id, monday.id);
  assert.equal(strengthStatus(restored.days['2026-11-09']).done, 5);
  assert.equal(strengthStatus(restored.days['2026-11-09']).sets, 1);
  assert.equal(dayBurn(restored.days['2026-11-09'], restored.burn, 80).strength, 150);
  assert.equal(workoutSessions(restored)[0].plan.title, 'Full body A');
  assert.ok(sessionOptions(restored, '2026-11-09').some((d) => d.id === monday.id));
  assert.deepEqual(restored.days['2026-11-09'].workout.exercises.squat.sets, [{ kg: 40, reps: 10 }]);
});
test('saved cardio duration flows to All done and weekly nutrition estimates use the actual plan', () => {
  const state = defaultState();
  Object.assign(state.profile, { age: 30, sex: 'male', heightCm: 175, startWeightKg: 80, goalWeightKg: 75 });
  const draft = structuredClone(WORKOUT_TEMPLATES[0]);
  draft.effectiveFrom = '2026-11-09';
  draft.days.find((d) => d.type === 'cardio').minutes = 40;
  state.workoutPlans = [createWorkoutPlan(draft, 'wp_durations')];
  const cardio = scheduledWorkout(state, '2026-11-14');
  assert.equal(completeWorkout(null, cardio).cardio.minutes, 40);
  assert.deepEqual(workoutPlanSummary(state, '2026-11-09'), { strengthDays: 2, cardioMinutes: 40, strengthMinutes: 90 });
  const rec = dailyRecommendation(state, '2026-11-09');
  assert.equal(rec.strengthDays, 2);
  assert.equal(rec.cardioMinutes, 40);
  assert.equal(rec.maintenance, Math.round(2300 + (300 + 320) / 7));
  assert.equal(dayBurn({}, state.burn, 80).total, 2300, 'scheduled sessions are not completed burn');
});
test('invalid or duplicate movements cannot overwrite a valid plan; corrupt imported plans are skipped', () => {
  const valid = plan();
  for (const mutate of [
    (p) => { p.days[0].exercises = []; },
    (p) => { p.days[0].exercises.push(p.days[0].exercises[0]); },
    (p) => { p.days[0].exercises[0].setsMax = 0; },
    (p) => { p.days[0].minutes = 181; },
    (p) => { p.days[0].exercises[0].repsMax = 2; },
    (p) => { p.effectiveFrom = 'not-a-date'; },
  ]) { const invalid = structuredClone(valid); mutate(invalid); assert.throws(() => createWorkoutPlan(invalid)); }
  assert.equal(normalize({ workoutPlans: [valid, { id: 'bad' }, null] }).workoutPlans.length, 1);
});
test('original All done snapshots retain old duration behavior after reload', () => {
  const state = defaultState();
  state.burn.strengthMinutes = 40;
  state.days['2026-11-09'] = { food: [], supps: {}, workout: completeWorkout(null, WORKOUT_DAYS[0]) };
  const restored = importJSON(exportJSON(state));
  assert.ok(Math.abs(dayBurn(restored.days['2026-11-09'], restored.burn, 80).strength - 2.5 * 80 * 40 / 60) < 1e-8);
});
test('weekly streak follows dated plan targets, and a recovery-only plan cannot create an infinite streak', () => {
  const state = defaultState(); state.workoutPlans = [plan(0, '2026-11-02')];
  for (const date of ['2026-11-02', '2026-11-05']) state.days[date] = { food: [], supps: {}, workout: completeWorkout(null, scheduledWorkout(state, date)) };
  assert.equal(weeklyStreak(state, '2026-11-06'), 1);
  const restOnly = plan(0, '2026-11-09', 'wp_rest');
  restOnly.days.forEach((d) => { d.type = 'rest'; d.exercises = []; d.minutes = 0; });
  state.workoutPlans.push(restOnly);
  assert.equal(weeklyStreak(state, '2026-11-10'), 1);
});
