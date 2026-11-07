import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import { intakeForCalories } from '../js/recommendations.js';

const date = '2026-11-07';
function adult(overrides = {}) {
  const state = defaultState();
  Object.assign(state.profile, { age: 30, sex: 'male', heightCm: 175, startWeightKg: 80, goalWeightKg: 75, dietStyle: 'protein' }, overrides);
  return state;
}
test('entered calories recalculate macros and calorie-based limits without changing targets', () => {
  const state = adult();
  const before = structuredClone(state);
  const a = intakeForCalories(state, date, '2000');
  const b = intakeForCalories(state, date, '2500');
  assert.equal(a.available, true);
  assert.deepEqual(a.targets, { kcal: 2000, protein: 144, carbs: 205, fat: 67 });
  assert.equal(b.targets.protein, a.targets.protein, 'protein stays tied to body weight when not capped');
  assert.ok(b.targets.carbs > a.targets.carbs && b.targets.fat > a.targets.fat);
  assert.equal(a.guides.freeSugars, 50);
  assert.equal(b.guides.freeSugars, 62.5);
  assert.equal(a.guides.fibre, b.guides.fibre, 'fibre minimum does not scale with calories');
  assert.deepEqual(state, before);
});
test('preview handles decimal input, calorie bounds and macro energy rounding', () => {
  const state = adult();
  for (const kcal of [1500, 1900, 2333.5, 4000, 6000]) {
    const rec = intakeForCalories(state, date, String(kcal).replace('.', ','));
    assert.equal(rec.available, true);
    const t = rec.targets;
    assert.ok(Math.abs(t.kcal - (4 * t.protein + 4 * t.carbs + 9 * t.fat)) <= 2);
    assert.ok(t.protein * 4 <= t.kcal * 0.30);
  }
  for (const kcal of ['', 'NaN', '2000junk', '-2000', 'Infinity', 1499, 6001]) assert.equal(intakeForCalories(state, date, kcal).available, false);
  assert.equal(intakeForCalories(adult({ sex: 'female' }), date, 1200).available, true);
});
test('profile eligibility also applies to user-entered calorie suggestions', () => {
  for (const state of [defaultState(), adult({ age: 16 }), adult({ nutritionContext: 'special' }), adult({ goalWeightKg: 40 })]) {
    assert.equal(intakeForCalories(state, date, 2000).available, false);
  }
});
