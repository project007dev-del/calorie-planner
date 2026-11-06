import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { defaultState, normalize, exportJSON, importJSON } from '../js/store.js';
import { dailyRecommendation } from '../js/recommendations.js';
import { parseSettings } from '../js/settings-model.js';
import { suggestBaseKcal, dayBurn, makeEntry, entryNutrients } from '../js/calc.js';
import { BUILTIN_FOODS, findFood, searchFoods } from '../js/foods.js';

const date = '2026-11-07';
function adult(overrides = {}) {
  const state = defaultState();
  Object.assign(state.profile, { age: 30, sex: 'male', heightCm: 175, startWeightKg: 80, goalWeightKg: 75, dietStyle: 'balanced' }, overrides);
  return state;
}

test('recommendation accounts for planned extra exercise once and matches macro energy', () => {
  const state = adult();
  const before = structuredClone(state);
  const rec = dailyRecommendation(state, date);
  assert.equal(rec.available, true);
  assert.equal(rec.goal, 'lose');
  assert.equal(rec.maintenance, Math.round(2300 + (5 * 200 + 240) / 7));
  assert.deepEqual(rec.targets, { kcal: 2230, protein: 128, carbs: 263, fat: 74 });
  assert.ok(Math.abs(rec.targets.kcal - (4 * rec.targets.protein + 4 * rec.targets.carbs + 9 * rec.targets.fat)) <= 2);
  assert.deepEqual(state, before, 'preview must not change targets or logs');
  assert.equal(dayBurn({}, state.burn, 80).total, 2300, 'planned exercise is not logged exercise');
});

test('goal direction and explicit maintenance override follow current weight', () => {
  const state = adult({ goalWeightKg: 90 });
  assert.equal(dailyRecommendation(state, date).goal, 'gain');
  state.profile.goalMode = 'maintain';
  state.profile.dietStyle = 'auto';
  const rec = dailyRecommendation(state, date);
  assert.equal(rec.style.id, 'balanced');
  assert.equal(rec.automaticStyle, true);
  assert.ok(Math.abs(rec.targets.kcal - rec.maintenance) <= 5);
  state.profile.goalMode = 'auto';
  state.days[date] = { food: [], supps: {}, weightKg: 91 };
  assert.equal(dailyRecommendation(state, date).goal, 'lose');
  assert.equal(dailyRecommendation(state, date).style.id, 'protein');
});

test('current 7-day weight average feeds recommendations; future weigh-ins are excluded', () => {
  const state = adult();
  state.days['2026-11-06'] = { food: [], supps: {}, weightKg: 76 };
  state.days[date] = { food: [], supps: {}, weightKg: 78 };
  state.days['2026-11-08'] = { food: [], supps: {}, weightKg: 100 };
  assert.equal(dailyRecommendation(state, date).weight, 77);
});

test('incomplete, underage, special-context and unsuitable-weight profiles get no auto targets', () => {
  assert.equal(dailyRecommendation(defaultState(), date).available, false);
  for (const profile of [{ age: 17 }, { nutritionContext: 'special' }, { goalWeightKg: 45 }, { startWeightKg: 45 }, { startWeightKg: 140 }]) {
    assert.equal(dailyRecommendation(adult(profile), date).available, false, JSON.stringify(profile));
  }
});

test('diet styles, no-exercise plan, calorie floor and protein cap remain finite', () => {
  const state = adult({ strengthDays: 0, cardioMinutes: 0, dietStyle: 'plant' });
  const rec = dailyRecommendation(state, date);
  assert.equal(rec.maintenance, 2300);
  assert.equal(rec.targets.protein, 80);
  assert.ok(rec.meals.some((line) => line.includes('munggo')));
  state.profile.dietStyle = 'protein';
  assert.equal(dailyRecommendation(state, date).targets.protein, 144);
  state.burn.baseKcal = 500;
  const low = dailyRecommendation(state, date);
  assert.equal(low.targets.kcal, 1500);
  assert.equal(low.floorApplied, true);
  assert.equal(low.proteinCapped, true);
  assert.ok(Object.values(low.targets).every((value) => Number.isFinite(value) && value >= 0));
});

test('everyday movement affects the base suggestion; manual burn remains honored', () => {
  const state = adult({ activityLevel: 'sedentary' });
  assert.equal(suggestBaseKcal(state.profile, 80), 2100);
  state.profile.activityLevel = 'physical';
  assert.equal(suggestBaseKcal(state.profile, 80), 3150);
  assert.equal(dailyRecommendation(state, date).base, 2300);
});

test('implausible burn settings do not generate targets that cannot be applied', () => {
  const state = adult();
  state.burn.baseKcal = 10000;
  assert.equal(dailyRecommendation(state, date).available, false);
  state.burn.baseKcal = 'broken';
  assert.equal(dailyRecommendation(state, date).available, false);
});

test('settings reject malformed or out-of-range values before changing existing state', () => {
  const state = adult();
  const before = structuredClone(state);
  for (const values of [
    { ...state.targets, fat: '' }, { ...state.targets, kcal: '2000junk' },
    { ...state.targets, kcal: 'Infinity' }, { ...state.targets, protein: -10 },
  ]) assert.throws(() => parseSettings('targets', values));
  assert.deepEqual(state, before);
  assert.throws(() => parseSettings('burn', { ...state.burn, kcalPerKg: 0 }));
  assert.throws(() => parseSettings('profile', { ...state.profile, strengthDays: 2.5 }));
  assert.throws(() => parseSettings('profile', { ...state.profile, sex: '' }));
  assert.equal(parseSettings('profile', state.profile).startWaistCm, null);
  assert.equal(parseSettings('targets', { ...state.targets, fat: '55,5' }).fat, 55.5);
});

test('old backup fills new preferences without replacing saved targets, burn or history', () => {
  const old = { profile: { age: 30 }, targets: { kcal: 1800 }, burn: { baseKcal: 2100 }, days: { [date]: { food: [], supps: {}, weightKg: 80 } } };
  const state = normalize(old);
  assert.equal(state.profile.activityLevel, 'light');
  assert.equal(state.profile.dietStyle, 'auto');
  assert.equal(state.targets.kcal, 1800);
  assert.equal(state.burn.baseKcal, 2100);
  assert.deepEqual(state.days, old.days);
  assert.deepEqual(importJSON(exportJSON(state)), state);
});

test('Filipino and English aliases, multiple words and category filters find foods', () => {
  const state = defaultState();
  for (const [query, id] of [['bean sprout', 'togue'], ['toge', 'togue'], ['monggo', 'munggo'], ['kanin', 'white_rice'], ['tokwa', 'tofu_firm'], ['itlog', 'egg_whole'], ['sardinas tomato', 'sardines_tomato']]) {
    assert.ok(searchFoods(state, query).some((food) => food.id === id), query);
  }
  assert.ok(searchFoods(state, '', 'filipino').length >= 14);
  assert.equal(searchFoods(state, 'togue', 'protein').length, 0);
  assert.ok(searchFoods(state, 'togue', 'veg').length > 0);
});

test('new PhilFCT entries have unique IDs, finite nutrients, and a source for every state', () => {
  assert.equal(new Set(BUILTIN_FOODS.map((food) => food.id)).size, BUILTIN_FOODS.length);
  const additions = BUILTIN_FOODS.filter((food) => food.filipino);
  assert.equal(additions.length, 14);
  for (const food of additions) {
    for (const state of ['raw', 'cooked']) if (food[state]) {
      assert.ok(food.sources[state].url.startsWith('https://i.fnri.dost.gov.ph/fct/library/'));
      assert.ok(Object.values(food[state]).every((n) => Number.isFinite(n) && n >= 0));
    }
  }
  const food = findFood(defaultState(), 'togue');
  assert.equal(entryNutrients(makeEntry(food, 'raw', 150, 'lunch', 'raw')).kcal, 96);
  const entry = makeEntry(food, 'cooked', 150, 'lunch', 'cooked');
  assert.equal(entryNutrients(entry).kcal, 81);
  assert.equal(entryNutrients(entry).protein, 7.2);
});

test('offline shell covers every app module and references files that exist', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const paths = [...sw.matchAll(/'\.\/(.*?)'/g)].map((m) => m[1]).filter(Boolean);
  for (const path of paths) await access(new URL(`../${path}`, import.meta.url));
  for (const dir of ['js', 'js/views']) {
    for (const name of await readdir(new URL(`../${dir}/`, import.meta.url))) {
      if (name.endsWith('.js')) assert.ok(paths.includes(`${dir}/${name}`), `${dir}/${name} missing from offline cache`);
    }
  }
});
