import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import { foodRecommendations } from '../js/food-recommendations.js';
import { findFood } from '../js/foods.js';
import { makeEntry, dayIntake } from '../js/calc.js';

const date = '2026-11-07';
function nearGoal() {
  const state = defaultState();
  state.days[date] = {
    food: [{ id: 'logged', foodId: 'custom-meal', name: 'Logged meals', grams: 100, meal: 'lunch', state: 'cooked', per100: { kcal: 1735, protein: 114, carbs: 205, fat: 51.4 } }],
    supps: {},
  };
  return state;
}

test('a 31 g protein gap suggests 100 g cooked chicken with the correct nutrition', () => {
  const state = nearGoal();
  const before = structuredClone(state);
  const rec = foodRecommendations(state, date);
  assert.equal(rec.status, 'available');
  assert.equal(rec.focus, 'protein');
  const chicken = rec.suggestions.find((food) => food.foodId === 'chicken_breast');
  assert.ok(chicken);
  assert.equal(chicken.grams, 100);
  assert.equal(chicken.state, 'cooked');
  assert.deepEqual(chicken.nutrients, { kcal: 165, protein: 31, carbs: 0, fat: 3.6 });
  assert.equal(chicken.remainingAfter.kcal, 0);
  assert.equal(chicken.remainingAfter.protein, 0);
  assert.deepEqual(state, before, 'reading suggestions must not log food or change targets');
});

test('logging a suggested portion recalculates the remaining intake', () => {
  const state = nearGoal();
  const chicken = foodRecommendations(state, date).suggestions.find((s) => s.foodId === 'chicken_breast');
  state.days[date].food.push(makeEntry(findFood(state, chicken.foodId), chicken.state, chicken.grams, 'dinner', 'chosen'));
  const next = foodRecommendations(state, date);
  assert.equal(next.status, 'reached');
  assert.equal(next.suggestions.length, 0);
  assert.equal(dayIntake(state.days[date], state.supplements).total.protein, 145);
});

test('unplanned custom food and edits change the nutrient focus without changing daily targets', () => {
  const state = defaultState();
  state.targets = { kcal: 2000, protein: 60, carbs: 200, fat: 60 };
  const targets = { ...state.targets };
  state.customFoods.push({ id: 'my-lunch', name: 'My own lunch', category: 'other', state: 'cooked', per100: { kcal: 200, protein: 30, carbs: 5, fat: 6 } });
  const entry = makeEntry(findFood(state, 'my-lunch'), 'cooked', 200, 'lunch', 'lunch-entry');
  state.days[date] = { food: [entry], supps: {} };
  const original = foodRecommendations(state, date);
  assert.equal(original.total.kcal, 400);
  assert.equal(original.remaining.protein, 0);
  assert.equal(original.focus, 'carbs');
  entry.grams = 100;
  const edited = foodRecommendations(state, date);
  assert.equal(edited.total.kcal, 200);
  assert.equal(edited.remaining.protein, 30);
  assert.equal(edited.focus, 'protein');
  assert.notDeepEqual(edited.suggestions.map((s) => s.foodId), original.suggestions.map((s) => s.foodId));
  state.days[date].food = [];
  assert.equal(foodRecommendations(state, date).remaining.kcal, 2000);
  assert.deepEqual(state.targets, targets);
});

test('counted supplements reduce remaining calories and protein', () => {
  const state = nearGoal();
  state.days[date].supps.shake1 = true;
  const rec = foodRecommendations(state, date);
  assert.equal(rec.remaining.kcal, 30);
  assert.equal(rec.remaining.protein, 6);
  assert.ok(rec.suggestions.length > 0);
  for (const suggestion of rec.suggestions) assert.ok(suggestion.nutrients.kcal <= 30);
});

test('ideas follow the selected date and do not read food or shakes from other days', () => {
  const state = nearGoal();
  state.days['2026-11-08'] = { food: [], supps: { shake1: true } };
  const empty = foodRecommendations(state, '2026-11-06');
  assert.equal(empty.remaining.kcal, 1900);
  assert.equal(empty.remaining.protein, 145);
  assert.equal(foodRecommendations(state, date).remaining.kcal, 165);
});

test('plant-forward preferences use plant foods', () => {
  const state = defaultState();
  state.profile.dietStyle = 'plant';
  const rec = foodRecommendations(state, date);
  assert.ok(rec.suggestions.length > 0);
  for (const suggestion of rec.suggestions) assert.ok(['tofu_firm', 'munggo', 'oats', 'peanuts', 'peanut_butter', 'wholewheat_bread', 'white_rice', 'brown_rice', 'kamote', 'banana', 'saba'].includes(suggestion.foodId));
});

test('calorie limits stop extra suggestions even if protein is still below target', () => {
  const state = nearGoal();
  state.days[date].food[0].per100.kcal = 2000;
  const rec = foodRecommendations(state, date);
  assert.equal(rec.status, 'reached');
  assert.equal(rec.remaining.kcal, 0);
  assert.equal(rec.remaining.protein, 31);
  assert.equal(rec.suggestions.length, 0);
});

test('carb and fat gaps produce suitable alternatives, with overages disclosed', () => {
  const state = nearGoal();
  Object.assign(state.days[date].food[0].per100, { kcal: 1600, protein: 145, carbs: 150, fat: 55 });
  const carbs = foodRecommendations(state, date);
  assert.equal(carbs.focus, 'carbs');
  assert.ok(carbs.suggestions.every((s) => s.nutrients.carbs > 0));
  assert.ok(carbs.suggestions.every((s) => s.over.protein > 0));
  Object.assign(state.days[date].food[0].per100, { protein: 145, carbs: 205, fat: 35 });
  const fat = foodRecommendations(state, date);
  assert.equal(fat.focus, 'fat');
  assert.ok(fat.suggestions.every((s) => s.nutrients.fat > 0));
  assert.ok(fat.suggestions.some((s) => s.foodId === 'peanuts'));
});

test('large and small gaps produce finite, bounded portions within the energy budget', () => {
  for (const remaining of [10, 25, 67, 165, 500, 1900, 9000]) {
    const state = defaultState();
    state.targets.kcal = remaining;
    const rec = foodRecommendations(state, date);
    for (const suggestion of rec.suggestions) {
      assert.ok(suggestion.grams >= 5 && suggestion.grams <= 300);
      assert.equal(suggestion.grams % 5, 0);
      assert.ok(suggestion.nutrients.kcal <= remaining + 1e-8);
      assert.ok(Object.values(suggestion.nutrients).every((v) => Number.isFinite(v) && v >= 0));
    }
  }
});

test('invalid targets fail safely and tiny gaps never produce negative portions', () => {
  for (const value of [NaN, Infinity, -1, 'broken']) {
    const state = defaultState();
    state.targets.kcal = value;
    assert.equal(foodRecommendations(state, date).status, 'invalid');
  }
  const state = nearGoal();
  state.days[date].food[0].per100.kcal = 1895;
  assert.equal(foodRecommendations(state, date).status, 'reached');
});
