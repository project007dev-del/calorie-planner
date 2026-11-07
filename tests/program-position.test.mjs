import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, exportJSON, importJSON } from '../js/store.js';
import { continueWorkoutPlan, programPosition, scheduledWorkout, workoutForDate, createWorkoutPlan, WORKOUT_TEMPLATES } from '../js/workout-plans.js';
import { completeWorkout, dayBurn, workoutSessions } from '../js/calc.js';

const anchor = '2026-11-07';
test('resume at week 3 day 3 without fabricating any past sessions or calorie burn', () => {
  const state = defaultState();
  const before = structuredClone(state);
  const plan = continueWorkoutPlan(state, { date: anchor, week: 3, index: 2 }, 'wp_resumed');
  assert.deepEqual(state, before, 'a position preview must not change saved state');
  state.workoutPlans.push(plan);
  assert.deepEqual(programPosition(state, anchor), { week: 3, index: 2 });
  assert.equal(scheduledWorkout(state, anchor).title, 'Upper body – pull');
  assert.deepEqual(state.days, {});
  assert.equal(workoutSessions(state).length, 0);
  assert.equal(dayBurn(state.days[anchor], state.burn, 80).strength, 0);
});
test('program days advance across recovery days and roll the week on day 7', () => {
  const state = defaultState();
  state.workoutPlans.push(continueWorkoutPlan(state, { date: anchor, week: 3, index: 2 }, 'wp_rollover'));
  assert.equal(scheduledWorkout(state, '2026-11-08').title, 'Lower body + core');
  assert.deepEqual(programPosition(state, '2026-11-11'), { week: 3, index: 6 });
  assert.equal(scheduledWorkout(state, '2026-11-11').type, 'rest');
  assert.deepEqual(programPosition(state, '2026-11-12'), { week: 4, index: 0 });
  assert.equal(programPosition(state, '2026-11-06'), null);
  assert.equal(scheduledWorkout(state, '2026-11-06').id, 'd5');
});
test('program position uses the chosen custom routine and survives backup import', () => {
  const state = defaultState();
  state.workoutPlans.push(createWorkoutPlan({ ...WORKOUT_TEMPLATES[0], effectiveFrom: anchor }, 'wp_two'));
  state.workoutPlans.push(continueWorkoutPlan(state, { date: anchor, week: 7, index: 3 }, 'wp_custom_resume'));
  const restored = importJSON(exportJSON(state));
  assert.deepEqual(programPosition(restored, anchor), { week: 7, index: 3 });
  assert.equal(scheduledWorkout(restored, anchor).title, 'Full body B');
  assert.equal(scheduledWorkout(restored, '2026-11-08').type, 'rest');
  assert.equal(scheduledWorkout(restored, '2026-11-09').type, 'cardio');
});
test('changing position preserves a recorded session on the same date', () => {
  const state = defaultState();
  const first = continueWorkoutPlan(state, { date: anchor, week: 2, index: 0 }, 'wp_first');
  state.workoutPlans.push(first);
  state.days[anchor] = { food: [], supps: {}, workout: completeWorkout(null, scheduledWorkout(state, anchor)) };
  const before = structuredClone(state.days);
  state.workoutPlans.push(continueWorkoutPlan(state, { date: anchor, week: 4, index: 2 }, 'wp_changed'));
  assert.equal(scheduledWorkout(state, anchor).title, 'Upper body – pull');
  assert.equal(workoutForDate(state, anchor).title, 'Upper body – push');
  assert.deepEqual(state.days, before);
});
test('invalid weeks and days cannot create a resumed plan; calendar mode remains available', () => {
  const state = defaultState();
  for (const [week, index] of [[0, 0], [10000, 0], [2.5, 1], ['x', 1], [1, -1], [1, 7], [1, 2.5]]) {
    assert.throws(() => continueWorkoutPlan(state, { date: anchor, week, index }));
  }
  state.workoutPlans.push(continueWorkoutPlan(state, { date: anchor, week: 3, index: 2 }, 'wp_program'));
  const current = state.workoutPlans[0];
  state.workoutPlans.push(createWorkoutPlan({ ...current, position: null }, 'wp_calendar'));
  assert.equal(programPosition(state, anchor), null);
  assert.equal(scheduledWorkout(state, anchor).type, 'cardio');
});
