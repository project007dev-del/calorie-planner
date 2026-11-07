import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeWorkout, strengthStatus, dayBurn } from '../js/calc.js';
import { WORKOUT_DAYS, DEFAULT_BURN } from '../js/plan.js';

test('all done completes planned exercises and preserves actual sets, notes and extra cardio', () => {
  const plan = WORKOUT_DAYS.find((p) => p.type === 'strength');
  const exercise = plan.exercises[0];
  const previous = { planDayId: plan.id, exercises: { [exercise.id]: { done: false, sets: [{ kg: 40, reps: 10 }] } }, notes: 'Felt good', cardio: { done: false, minutes: 18 } };
  const before = structuredClone(previous);
  const workout = completeWorkout(previous, plan);
  const status = strengthStatus({ workout });
  assert.equal(status.done, plan.exercises.length);
  assert.equal(status.frac, 1);
  assert.equal(status.sets, 1, 'completion must not fabricate prescribed sets');
  assert.deepEqual(workout.exercises[exercise.id].sets, [{ kg: 40, reps: 10 }]);
  assert.equal(workout.notes, 'Felt good');
  assert.deepEqual(workout.cardio, previous.cardio);
  assert.deepEqual(previous, before, 'the helper must not mutate the old session');
  assert.ok(dayBurn({ workout }, DEFAULT_BURN, 80).strength > 0);
});

test('a new completed strength session has checkmarks but no invented weight or rep logs', () => {
  const plan = WORKOUT_DAYS.find((p) => p.type === 'strength');
  const workout = completeWorkout(null, plan);
  assert.ok(plan.exercises.every((e) => workout.exercises[e.id].done));
  assert.ok(plan.exercises.every((e) => workout.exercises[e.id].sets.length === 0));
  assert.equal(strengthStatus({ workout }).sets, 0);
});

test('cardio completion uses the saved duration and rest days are unchanged', () => {
  const cardio = WORKOUT_DAYS.find((p) => p.type === 'cardio');
  assert.equal(completeWorkout({ cardio: { done: false, minutes: 47 } }, cardio).cardio.minutes, 47);
  assert.equal(completeWorkout(null, cardio).cardio.done, true);
  assert.equal(completeWorkout(null, cardio).cardio.minutes, 30);
  const rest = WORKOUT_DAYS.find((p) => p.type === 'rest');
  assert.equal(completeWorkout({ notes: 'Resting' }, rest), null);
});
